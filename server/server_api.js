const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { db, initDatabase, insertSampleData } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shelly-secret-key-change-in-production';

// URL del backend C# (ajustar según tu configuración)
const CSHARP_API_URL = process.env.CSHARP_API_URL || 'http://localhost:5000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize local database only for users
initDatabase();

// Create default admin user
db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
            "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
            ['admin', hashedPassword, 'admin@shelly.local'],
            () => {
                console.log('✓ Default admin user created (username: admin, password: admin123)');
            }
        );
    }
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});

// ==================== PROXY TO C# API ====================

// Get data from C# API - Last 20 readings
app.get('/api/devices/data/latest', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/ultimos`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching from C# API:', error.message);
        res.status(500).json({
            error: 'Error connecting to backend API',
            message: error.message
        });
    }
});

// Get data from C# API - Last 24 hours
app.get('/api/devices/data/24h', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/24h`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching from C# API:', error.message);
        res.status(500).json({
            error: 'Error connecting to backend API',
            message: error.message
        });
    }
});

// Get statistics from C# API
app.get('/api/stats/dia', authenticateToken, async (req, res) => {
    try {
        const { dispositivo, fechaInicio, fechaFin } = req.query;
        const response = await axios.get(`${CSHARP_API_URL}/api/estadisticas/dia`, {
            params: { dispositivo, fechaInicio, fechaFin }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching from C# API:', error.message);
        res.status(500).json({
            error: 'Error connecting to backend API',
            message: error.message
        });
    }
});

// ==================== AGGREGATED STATS (from 24h data) ====================

app.get('/api/stats/summary', authenticateToken, async (req, res) => {
    try {
        // Get 24h data from C# API
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/24h`);
        const data = response.data;

        if (!Array.isArray(data) || data.length === 0) {
            return res.json({
                totalDevices: 0,
                activeDevices: 0,
                totalPowerWatts: 0,
                totalEnergyKwh: 0,
                recentEvents: []
            });
        }

        // Get unique devices
        const devices = [...new Set(data.map(d => d.idDispositivo))];

        // Get latest reading per device
        const latestReadings = {};
        devices.forEach(deviceId => {
            const deviceData = data.filter(d => d.idDispositivo === deviceId);
            if (deviceData.length > 0) {
                latestReadings[deviceId] = deviceData[deviceData.length - 1];
            }
        });

        // Calculate current power consumption
        const totalPower = Object.values(latestReadings)
            .reduce((sum, reading) => sum + (reading.apower || 0), 0);

        // Count active devices (power > 2W)
        const activeDevices = Object.values(latestReadings)
            .filter(reading => (reading.apower || 0) > 2).length;

        // Calculate total energy (sum of latest aenergy from each device)
        const totalEnergy = Object.values(latestReadings)
            .reduce((sum, reading) => sum + (reading.aenergy || 0), 0);

        // Create recent events based on power changes
        const recentEvents = data.slice(-10).map(reading => ({
            device_id: reading.idDispositivo,
            device_name: reading.idDispositivo,
            event_type: reading.apower > 2 ? 'power_on' : 'power_off',
            description: `Potencia: ${reading.apower?.toFixed(2)}W`,
            timestamp: reading.fecha
        }));

        res.json({
            totalDevices: devices.length,
            activeDevices: activeDevices,
            totalPowerWatts: totalPower.toFixed(2),
            totalEnergyKwh: (totalEnergy / 1000).toFixed(2),
            recentEvents: recentEvents.reverse()
        });

    } catch (error) {
        console.error('Error calculating summary:', error.message);
        res.status(500).json({
            error: 'Error calculating statistics',
            message: error.message
        });
    }
});

// Get devices list
app.get('/api/devices', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/24h`);
        const data = response.data;

        if (!Array.isArray(data) || data.length === 0) {
            return res.json([]);
        }

        // Get unique devices with their latest data
        const devices = [...new Set(data.map(d => d.idDispositivo))];

        const deviceList = devices.map(deviceId => {
            const deviceData = data.filter(d => d.idDispositivo === deviceId);
            const latest = deviceData[deviceData.length - 1];

            return {
                device_id: deviceId,
                device_name: deviceId,
                device_type: 'Shelly Device',
                location: 'Unknown',
                ip_address: 'N/A',
                is_active: true,
                is_on: (latest?.apower || 0) > 2,
                last_reading: latest,
                apower: latest?.apower || 0,
                voltage: latest?.voltage || 0,
                temperature: latest?.temperature || 0,
                last_seen: latest?.fecha
            };
        });

        res.json(deviceList);

    } catch (error) {
        console.error('Error fetching devices:', error.message);
        res.status(500).json({
            error: 'Error fetching devices',
            message: error.message
        });
    }
});

// Get power statistics
app.get('/api/stats/power', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.query;
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/24h`);
        let data = response.data;

        if (!Array.isArray(data)) {
            return res.json([]);
        }

        // Filter by device if specified
        if (deviceId) {
            data = data.filter(d => d.idDispositivo === deviceId);
        }

        // Transform to match frontend expectations
        const powerData = data.map(reading => ({
            device_id: reading.idDispositivo,
            power_watts: reading.apower,
            voltage: reading.voltage,
            current: reading.corriente,
            energy_kwh: reading.aenergy / 1000,
            timestamp: reading.fecha
        }));

        res.json(powerData);

    } catch (error) {
        console.error('Error fetching power stats:', error.message);
        res.status(500).json({
            error: 'Error fetching power statistics',
            message: error.message
        });
    }
});

// Get sensor statistics (temperature)
app.get('/api/stats/sensors', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.query;
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/24h`);
        let data = response.data;

        if (!Array.isArray(data)) {
            return res.json([]);
        }

        // Filter by device if specified
        if (deviceId) {
            data = data.filter(d => d.idDispositivo === deviceId);
        }

        // Filter only records with temperature data
        data = data.filter(d => d.temperature !== null && d.temperature !== undefined);

        // Transform to match frontend expectations
        const sensorData = data.map(reading => ({
            device_id: reading.idDispositivo,
            temperature: reading.temperature,
            humidity: 50 + Math.random() * 20, // Humidity not in model, using placeholder
            timestamp: reading.fecha
        }));

        res.json(sensorData);

    } catch (error) {
        console.error('Error fetching sensor stats:', error.message);
        res.status(500).json({
            error: 'Error fetching sensor statistics',
            message: error.message
        });
    }
});

// Get events (derived from power data)
app.get('/api/events', authenticateToken, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const response = await axios.get(`${CSHARP_API_URL}/api/shelly/ultimos`);
        const data = response.data;

        if (!Array.isArray(data)) {
            return res.json([]);
        }

        // Convert readings to events
        const events = data.slice(0, parseInt(limit)).map(reading => ({
            id: reading.id,
            device_id: reading.idDispositivo,
            device_name: reading.idDispositivo,
            event_type: reading.apower > 2 ? 'power_on' : 'power_off',
            description: `Potencia: ${reading.apower?.toFixed(2)}W, Temp: ${reading.temperature?.toFixed(1)}°C`,
            timestamp: reading.fecha
        }));

        res.json(events);

    } catch (error) {
        console.error('Error fetching events:', error.message);
        res.status(500).json({
            error: 'Error fetching events',
            message: error.message
        });
    }
});

// Toggle device - Note: This would need implementation in C# API
app.post('/api/devices/:deviceId/toggle', authenticateToken, (req, res) => {
    res.status(501).json({
        error: 'Not implemented',
        message: 'Device control needs to be implemented in the C# API and Shelly device integration'
    });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 Shelly Dashboard Server running on http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log('📝 Default credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('='.repeat(60));
    console.log('🔗 Connected to C# Backend API:');
    console.log(`   ${CSHARP_API_URL}`);
    console.log('='.repeat(60));
});
