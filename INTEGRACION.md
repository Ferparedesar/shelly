# 🔗 Integración Dashboard con Backend C#

Este documento explica cómo integrar el dashboard Node.js con tu backend ASP.NET Core existente.

## 📋 Resumen de la Arquitectura

Tu sistema actual tiene **dos componentes**:

### 1️⃣ **Backend C# (ASP.NET Core) - ShellyReceiver**
- **Ubicación**: https://github.com/Ferparedesar/shelly
- **Función**: Recibe datos de dispositivos Shelly y los almacena en SQL Server
- **Base de datos**: SQL Server (ShellyDB.mssql.somee.com)

**API Endpoints:**
- `POST /api/shelly/datos` - Recibe datos de dispositivos
- `GET /api/shelly/ultimos` - Obtiene últimas 20 lecturas
- `GET /api/shelly/24h` - Obtiene datos de últimas 24 horas
- `GET /api/estadisticas/dia` - Estadísticas por día

**Modelo de datos (ShellyData):**
```csharp
{
    Id,
    IdDispositivo,
    apower,          // Potencia (W)
    voltage,         // Voltaje (V)
    corriente,       // Corriente (A)
    aenergy,         // Energía acumulada (Wh)
    temperature,     // Temperatura (°C)
    Fecha            // Timestamp UTC
}
```

### 2️⃣ **Dashboard Node.js (Este proyecto)**
- **Función**: Visualización y control de dispositivos
- **Tecnologías**: Express.js, Chart.js, HTML/CSS/JS

## 🚀 Modos de Operación

El dashboard puede funcionar en **DOS MODOS**:

### **Modo 1: SQLite Local (Demo)** ✅ YA CONFIGURADO
```bash
npm start
# Usa: server/server.js
```
- Usa base de datos SQLite local con datos de ejemplo
- Ideal para desarrollo y pruebas
- No requiere conexión al backend C#

### **Modo 2: Integrado con API C#** 🔗 RECOMENDADO PARA PRODUCCIÓN
```bash
npm run start:api
# Usa: server/server_api.js
```
- Se conecta a tu backend ASP.NET Core
- Lee datos reales de SQL Server
- Requiere que el backend C# esté corriendo

## ⚙️ Configuración para Modo API

### Paso 1: Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita `.env` con la URL de tu backend C#:

```env
PORT=3000
JWT_SECRET=tu-secreto-jwt
CSHARP_API_URL=http://localhost:5000
```

**Nota:** Si tu backend C# corre en otro puerto o servidor, ajusta `CSHARP_API_URL`.

### Paso 2: Iniciar el backend C# (ASP.NET Core)

En tu proyecto ShellyReceiver:

```bash
cd /ruta/a/ShellyReceiver
dotnet run
```

Esto debería iniciar el backend en `http://localhost:5000` (o el puerto configurado).

### Paso 3: Actualizar package.json

Agrega el script para modo API:

```json
{
  "scripts": {
    "start": "node server/server.js",
    "start:api": "node server/server_api.js",
    "dev": "node server/server.js"
  }
}
```

### Paso 4: Iniciar el dashboard

```bash
npm run start:api
```

Abre http://localhost:3000 en tu navegador.

## 🔄 Comparación de Endpoints

### Dashboard → Backend C#

| Dashboard Endpoint | Backend C# | Descripción |
|-------------------|------------|-------------|
| `GET /api/stats/power` | `GET /api/shelly/24h` | Datos de consumo 24h |
| `GET /api/stats/sensors` | `GET /api/shelly/24h` | Datos de temperatura |
| `GET /api/stats/summary` | Agregación de `/api/shelly/24h` | Resumen general |
| `GET /api/devices` | Derivado de `/api/shelly/24h` | Lista de dispositivos |
| `GET /api/events` | Derivado de `/api/shelly/ultimos` | Eventos recientes |

## 📊 Mapeo de Datos

El dashboard transforma los datos del backend C# al formato esperado:

**Backend C# (ShellyData):**
```json
{
  "id": 1,
  "idDispositivo": "shelly-001",
  "apower": 150.5,
  "voltage": 230.2,
  "corriente": 0.654,
  "aenergy": 1250,
  "temperature": 22.5,
  "fecha": "2025-12-30T10:30:00Z"
}
```

**Dashboard (power_readings):**
```json
{
  "device_id": "shelly-001",
  "power_watts": 150.5,
  "voltage": 230.2,
  "current": 0.654,
  "energy_kwh": 1.25,
  "timestamp": "2025-12-30T10:30:00Z"
}
```

## 🔧 Troubleshooting

### Error: "Error connecting to backend API"

**Problema:** El dashboard no puede conectarse al backend C#.

**Soluciones:**
1. Verifica que el backend C# esté corriendo:
   ```bash
   curl http://localhost:5000/api/shelly/ultimos
   ```

2. Verifica la URL en `.env`:
   ```env
   CSHARP_API_URL=http://localhost:5000
   ```

3. Verifica CORS en el backend C# (debe permitir solicitudes desde `http://localhost:3000`):
   ```csharp
   // En Program.cs o Startup.cs
   app.UseCors(options =>
       options.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
   ```

### Error: "Cannot find module 'axios'"

```bash
npm install axios
```

### El dashboard muestra 0 dispositivos

**Problema:** No hay datos en la base de datos SQL Server.

**Solución:** Envía datos de prueba al backend C#:
```bash
curl -X POST http://localhost:5000/api/shelly/datos \
  -H "Content-Type: application/json" \
  -d '{
    "idDispositivo": "shelly-001",
    "apower": 150,
    "voltage": 230,
    "corriente": 0.65,
    "aenergy": 1000,
    "temperature": 22
  }'
```

## 🎛️ Control de Dispositivos

⚠️ **Nota importante:** El endpoint `POST /api/devices/:deviceId/toggle` está actualmente **no implementado** en el backend C#.

Para implementar control de dispositivos, necesitas:

1. **Agregar endpoint en ShellyController.cs:**
   ```csharp
   [HttpPost("control/{deviceId}")]
   public async Task<IActionResult> ControlDevice(string deviceId, [FromBody] ControlRequest request)
   {
       // Implementar lógica para enviar comando al dispositivo Shelly
       // Opciones:
       // - HTTP request a la IP del dispositivo
       // - MQTT
       // - Shelly Cloud API
   }
   ```

2. **Configurar comunicación con dispositivos Shelly:**
   - HTTP REST API del dispositivo
   - MQTT broker
   - Shelly Cloud API

## 📈 Próximos Pasos

1. **Agregar control de dispositivos** en el backend C#
2. **Implementar notificaciones en tiempo real** con SignalR
3. **Agregar autenticación compartida** entre frontend y backend
4. **Implementar WebSockets** para actualizaciones en tiempo real
5. **Agregar más estadísticas** usando el endpoint `/api/estadisticas/dia`

## 🔒 Seguridad en Producción

Antes de desplegar en producción:

1. **Cambiar JWT_SECRET** en `.env`
2. **Configurar CORS apropiadamente** (no usar AllowAnyOrigin)
3. **Usar HTTPS** en ambos servicios
4. **Cambiar credenciales de admin** por defecto
5. **Implementar rate limiting**
6. **Validar todas las entradas** en el backend

## 📚 Recursos

- [Documentación Shelly API](https://shelly-api-docs.shelly.cloud/)
- [Express.js](https://expressjs.com/)
- [Chart.js](https://www.chartjs.org/)
- [ASP.NET Core](https://docs.microsoft.com/aspnet/core/)

## 💡 Tips

- Usa `npm run start` para desarrollo con datos de ejemplo
- Usa `npm run start:api` para conectarte al backend C# real
- Monitorea los logs del backend C# para ver las peticiones
- Usa las Chrome DevTools para debuggear las peticiones AJAX
