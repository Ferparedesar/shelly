// Configuration
const API_URL = window.location.origin;
let authToken = localStorage.getItem('authToken');
let powerChart = null;
let sensorChart = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard();
    } else {
        showLogin();
    }

    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
});

// Authentication
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userName', data.user.username);
            showDashboard();
        } else {
            showError(data.error || 'Error al iniciar sesión');
        }
    } catch (error) {
        showError('Error de conexión con el servidor');
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    showLogin();
}

function showLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    loginError.style.display = 'none';
}

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    userName.textContent = localStorage.getItem('userName') || 'Usuario';

    loadDashboardData();
    setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
}

function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

// API Calls
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            handleLogout();
            throw new Error('Sesión expirada');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load summary stats
        const summary = await apiRequest('/api/stats/summary');
        updateSummary(summary);

        // Load devices
        const devices = await apiRequest('/api/devices');
        renderDevices(devices);

        // Load power chart
        const powerData = await apiRequest('/api/stats/power?hours=24');
        renderPowerChart(powerData);

        // Load sensor chart
        const sensorData = await apiRequest('/api/stats/sensors?hours=24');
        renderSensorChart(sensorData);

        // Load events
        const events = await apiRequest('/api/events?limit=10');
        renderEvents(events);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update Summary Cards
function updateSummary(summary) {
    document.getElementById('totalDevices').textContent = summary.totalDevices || 0;
    document.getElementById('activeDevices').textContent = summary.activeDevices || 0;
    document.getElementById('totalPower').textContent = parseFloat(summary.totalPowerWatts || 0).toFixed(1);
    document.getElementById('totalEnergy').textContent = parseFloat(summary.totalEnergyKwh || 0).toFixed(2);
}

// Render Devices
function renderDevices(devices) {
    const devicesList = document.getElementById('devicesList');

    if (devices.length === 0) {
        devicesList.innerHTML = '<p>No hay dispositivos disponibles</p>';
        return;
    }

    devicesList.innerHTML = devices.map(device => `
        <div class="device-card ${device.is_on ? 'active' : ''}">
            <div class="device-header">
                <div class="device-name">${device.device_name}</div>
                <span class="device-status ${device.is_active ? 'online' : 'offline'}">
                    ${device.is_active ? 'Online' : 'Offline'}
                </span>
            </div>
            <div class="device-info">
                <div><strong>Tipo:</strong> ${device.device_type}</div>
                <div><strong>Ubicación:</strong> ${device.location || 'No especificada'}</div>
                <div><strong>IP:</strong> ${device.ip_address || 'N/A'}</div>
                <div><strong>Estado:</strong> ${device.is_on ? '🟢 Encendido' : '⚫ Apagado'}</div>
            </div>
            <div class="device-actions">
                <button class="btn ${device.is_on ? 'btn-danger' : 'btn-success'}"
                        onclick="toggleDevice('${device.device_id}', ${!device.is_on})">
                    ${device.is_on ? 'Apagar' : 'Encender'}
                </button>
            </div>
        </div>
    `).join('');
}

// Toggle Device
async function toggleDevice(deviceId, turnOn) {
    try {
        await apiRequest(`/api/devices/${deviceId}/toggle`, {
            method: 'POST',
            body: JSON.stringify({ is_on: turnOn, brightness: 100 })
        });

        // Reload devices
        const devices = await apiRequest('/api/devices');
        renderDevices(devices);

        // Reload summary
        const summary = await apiRequest('/api/stats/summary');
        updateSummary(summary);

    } catch (error) {
        alert('Error al cambiar el estado del dispositivo');
    }
}

// Render Power Chart
function renderPowerChart(data) {
    const ctx = document.getElementById('powerChart').getContext('2d');

    // Group data by device
    const deviceData = {};
    data.forEach(reading => {
        if (!deviceData[reading.device_id]) {
            deviceData[reading.device_id] = [];
        }
        deviceData[reading.device_id].push(reading);
    });

    // Prepare datasets
    const datasets = Object.keys(deviceData).map((deviceId, index) => {
        const colors = [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(139, 92, 246)'
        ];

        return {
            label: deviceId,
            data: deviceData[deviceId].map(r => ({
                x: new Date(r.timestamp),
                y: r.power_watts
            })),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.4
        };
    });

    if (powerChart) {
        powerChart.destroy();
    }

    powerChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tiempo'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Potencia (W)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Render Sensor Chart
function renderSensorChart(data) {
    const ctx = document.getElementById('sensorChart').getContext('2d');

    const temperatures = data.map(r => ({
        x: new Date(r.timestamp),
        y: r.temperature
    }));

    const humidity = data.map(r => ({
        x: new Date(r.timestamp),
        y: r.humidity
    }));

    if (sensorChart) {
        sensorChart.destroy();
    }

    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: temperatures,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Humedad (%)',
                    data: humidity,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tiempo'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humedad (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

// Render Events
function renderEvents(events) {
    const eventsList = document.getElementById('eventsList');

    if (events.length === 0) {
        eventsList.innerHTML = '<p>No hay eventos recientes</p>';
        return;
    }

    eventsList.innerHTML = events.map(event => {
        const eventIcons = {
            'power_on': '🟢',
            'power_off': '⚫',
            'high_consumption': '⚠️',
            'error': '❌',
            'default': '📌'
        };

        const icon = eventIcons[event.event_type] || eventIcons['default'];
        const time = new Date(event.timestamp).toLocaleString('es-ES');

        return `
            <div class="event-item">
                <div class="event-info">
                    <div class="event-type">${icon} ${event.event_type}</div>
                    <div class="event-description">
                        ${event.device_name || 'Sistema'}: ${event.description || 'Sin descripción'}
                    </div>
                </div>
                <div class="event-time">${time}</div>
            </div>
        `;
    }).join('');
}

// Make toggleDevice available globally
window.toggleDevice = toggleDevice;
