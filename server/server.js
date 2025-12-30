const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, initDatabase, insertSampleData } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shelly-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize database
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

// Insert sample data on first run
db.get("SELECT COUNT(*) as count FROM devices", (err, row) => {
    if (!err && row.count === 0) {
        insertSampleData();
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

// ==================== DEVICE ROUTES ====================

// Get all devices
app.get('/api/devices', authenticateToken, (req, res) => {
    db.all(`
        SELECT d.*,
               ds.is_on,
               ds.brightness,
               ds.timestamp as last_state_update
        FROM devices d
        LEFT JOIN (
            SELECT device_id, is_on, brightness, timestamp,
                   ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY timestamp DESC) as rn
            FROM device_states
        ) ds ON d.device_id = ds.device_id AND ds.rn = 1
        WHERE d.is_active = 1
        ORDER BY d.device_name
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get device by ID
app.get('/api/devices/:deviceId', authenticateToken, (req, res) => {
    db.get(
        "SELECT * FROM devices WHERE device_id = ?",
        [req.params.deviceId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Device not found' });
            }
            res.json(row);
        }
    );
});

// Toggle device state
app.post('/api/devices/:deviceId/toggle', authenticateToken, (req, res) => {
    const { deviceId } = req.params;

    db.run(
        `INSERT INTO device_states (device_id, is_on, brightness)
         VALUES (?, ?, ?)`,
        [deviceId, req.body.is_on ? 1 : 0, req.body.brightness || 100],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Log event
            db.run(
                `INSERT INTO events (device_id, event_type, description)
                 VALUES (?, ?, ?)`,
                [deviceId, req.body.is_on ? 'power_on' : 'power_off', 'Estado cambiado desde dashboard']
            );

            res.json({ success: true, message: 'Device state updated' });
        }
    );
});

// ==================== STATISTICS ROUTES ====================

// Get power consumption statistics
app.get('/api/stats/power', authenticateToken, (req, res) => {
    const { deviceId, hours = 24 } = req.query;

    let query = `
        SELECT
            device_id,
            power_watts,
            voltage,
            current,
            energy_kwh,
            timestamp
        FROM power_readings
        WHERE datetime(timestamp) >= datetime('now', '-${hours} hours')
    `;

    if (deviceId) {
        query += ` AND device_id = '${deviceId}'`;
    }

    query += ' ORDER BY timestamp DESC';

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get sensor readings
app.get('/api/stats/sensors', authenticateToken, (req, res) => {
    const { deviceId, hours = 24 } = req.query;

    let query = `
        SELECT
            device_id,
            temperature,
            humidity,
            timestamp
        FROM sensor_readings
        WHERE datetime(timestamp) >= datetime('now', '-${hours} hours')
    `;

    if (deviceId) {
        query += ` AND device_id = '${deviceId}'`;
    }

    query += ' ORDER BY timestamp DESC';

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get dashboard summary
app.get('/api/stats/summary', authenticateToken, (req, res) => {
    const stats = {};

    // Total devices
    db.get("SELECT COUNT(*) as count FROM devices WHERE is_active = 1", (err, row) => {
        stats.totalDevices = row ? row.count : 0;

        // Active devices
        db.get(`
            SELECT COUNT(DISTINCT device_id) as count
            FROM device_states
            WHERE is_on = 1
            AND id IN (
                SELECT MAX(id)
                FROM device_states
                GROUP BY device_id
            )
        `, (err, row) => {
            stats.activeDevices = row ? row.count : 0;

            // Total power consumption (current)
            db.get(`
                SELECT SUM(power_watts) as total
                FROM power_readings
                WHERE id IN (
                    SELECT MAX(id)
                    FROM power_readings
                    GROUP BY device_id
                )
            `, (err, row) => {
                stats.totalPowerWatts = row && row.total ? row.total.toFixed(2) : 0;

                // Total energy (last 24h)
                db.get(`
                    SELECT SUM(energy_kwh) as total
                    FROM power_readings
                    WHERE datetime(timestamp) >= datetime('now', '-24 hours')
                `, (err, row) => {
                    stats.totalEnergyKwh = row && row.total ? row.total.toFixed(2) : 0;

                    // Recent events
                    db.all(`
                        SELECT * FROM events
                        ORDER BY timestamp DESC
                        LIMIT 10
                    `, (err, events) => {
                        stats.recentEvents = events || [];
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// Get events
app.get('/api/events', authenticateToken, (req, res) => {
    const { limit = 50 } = req.query;

    db.all(
        `SELECT e.*, d.device_name
         FROM events e
         LEFT JOIN devices d ON e.device_id = d.device_id
         ORDER BY e.timestamp DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
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
});
