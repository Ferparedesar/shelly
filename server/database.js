const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'shelly_data.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
function initDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Devices table (Shelly devices)
        db.run(`
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT UNIQUE NOT NULL,
                device_type TEXT NOT NULL,
                device_name TEXT NOT NULL,
                location TEXT,
                ip_address TEXT,
                mac_address TEXT,
                firmware_version TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Power consumption readings
        db.run(`
            CREATE TABLE IF NOT EXISTS power_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                power_watts REAL,
                voltage REAL,
                current REAL,
                energy_kwh REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id)
            )
        `);

        // Temperature and humidity readings
        db.run(`
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                temperature REAL,
                humidity REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id)
            )
        `);

        // Device state (on/off, brightness, etc.)
        db.run(`
            CREATE TABLE IF NOT EXISTS device_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                is_on BOOLEAN,
                brightness INTEGER,
                state_data TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id)
            )
        `);

        // Events log
        db.run(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT,
                event_type TEXT NOT NULL,
                event_data TEXT,
                description TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id)
            )
        `);

        console.log('✓ Database schema initialized');
    });
}

// Insert sample data
function insertSampleData() {
    db.serialize(() => {
        // Insert sample devices
        const devices = [
            ['shelly-001', 'Shelly 2.5', 'Sala Principal', 'Sala de estar', '192.168.1.101', 'AA:BB:CC:DD:EE:01', 'v1.12.1'],
            ['shelly-002', 'Shelly 1PM', 'Cocina', 'Cocina', '192.168.1.102', 'AA:BB:CC:DD:EE:02', 'v1.12.1'],
            ['shelly-003', 'Shelly Plug S', 'Dormitorio', 'Dormitorio principal', '192.168.1.103', 'AA:BB:CC:DD:EE:03', 'v1.11.0'],
            ['shelly-004', 'Shelly H&T', 'Sensor Exterior', 'Jardín', '192.168.1.104', 'AA:BB:CC:DD:EE:04', 'v1.10.3'],
            ['shelly-005', 'Shelly 1', 'Luz Baño', 'Baño', '192.168.1.105', 'AA:BB:CC:DD:EE:05', 'v1.12.1']
        ];

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO devices
            (device_id, device_type, device_name, location, ip_address, mac_address, firmware_version)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        devices.forEach(device => stmt.run(device));
        stmt.finalize();

        // Insert sample power readings (last 24 hours)
        const powerStmt = db.prepare(`
            INSERT INTO power_readings (device_id, power_watts, voltage, current, energy_kwh, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const now = Date.now();
        for (let i = 0; i < 24; i++) {
            const timestamp = new Date(now - (23 - i) * 60 * 60 * 1000).toISOString();

            // Shelly 001 - Living room (variable consumption)
            const power1 = 50 + Math.random() * 150;
            powerStmt.run('shelly-001', power1, 230, power1 / 230, 0.1 + i * 0.15, timestamp);

            // Shelly 002 - Kitchen (higher consumption during meal times)
            const power2 = (i >= 7 && i <= 9) || (i >= 19 && i <= 21) ? 800 + Math.random() * 400 : 100 + Math.random() * 100;
            powerStmt.run('shelly-002', power2, 230, power2 / 230, 0.5 + i * 0.4, timestamp);

            // Shelly 003 - Bedroom (nighttime consumption)
            const power3 = (i >= 22 || i <= 6) ? 20 + Math.random() * 30 : 5 + Math.random() * 10;
            powerStmt.run('shelly-003', power3, 230, power3 / 230, 0.02 + i * 0.025, timestamp);
        }
        powerStmt.finalize();

        // Insert sample temperature/humidity readings
        const sensorStmt = db.prepare(`
            INSERT INTO sensor_readings (device_id, temperature, humidity, timestamp)
            VALUES (?, ?, ?, ?)
        `);

        for (let i = 0; i < 24; i++) {
            const timestamp = new Date(now - (23 - i) * 60 * 60 * 1000).toISOString();
            const temp = 18 + Math.random() * 8;
            const humidity = 40 + Math.random() * 30;
            sensorStmt.run('shelly-004', temp, humidity, timestamp);
        }
        sensorStmt.finalize();

        // Insert current device states
        const stateStmt = db.prepare(`
            INSERT INTO device_states (device_id, is_on, brightness)
            VALUES (?, ?, ?)
        `);

        stateStmt.run('shelly-001', 1, 80);
        stateStmt.run('shelly-002', 1, 100);
        stateStmt.run('shelly-003', 0, 0);
        stateStmt.run('shelly-005', 1, 100);
        stateStmt.finalize();

        // Insert some events
        const eventStmt = db.prepare(`
            INSERT INTO events (device_id, event_type, description, timestamp)
            VALUES (?, ?, ?, ?)
        `);

        eventStmt.run('shelly-001', 'power_on', 'Dispositivo encendido', new Date(now - 2 * 60 * 60 * 1000).toISOString());
        eventStmt.run('shelly-002', 'high_consumption', 'Consumo elevado detectado', new Date(now - 1 * 60 * 60 * 1000).toISOString());
        eventStmt.run('shelly-003', 'power_off', 'Dispositivo apagado', new Date(now - 3 * 60 * 60 * 1000).toISOString());
        eventStmt.finalize();

        console.log('✓ Sample data inserted');
    });
}

module.exports = { db, initDatabase, insertSampleData };
