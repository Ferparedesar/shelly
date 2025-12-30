# 🏠 Shelly Dashboard

Aplicación web completa para monitorear y controlar dispositivos Shelly con estadísticas en tiempo real.

## 📋 Características

- ✅ **Sistema de autenticación** con JWT
- 📊 **Dashboard con estadísticas** en tiempo real
- 📈 **Gráficas interactivas** de consumo eléctrico
- 🌡️ **Monitoreo de temperatura y humedad**
- 🎛️ **Control remoto** de dispositivos
- 📱 **Diseño responsive** para móviles
- 📋 **Registro de eventos** y actividad
- ⚡ **API REST** completa

## 🚀 Instalación

### Prerrequisitos

- Node.js 14 o superior
- npm

### Pasos

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd shelly
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar el servidor:
```bash
npm start
```

4. Abrir en el navegador:
```
http://localhost:3000
```

## 🔐 Credenciales por defecto

- **Usuario:** admin
- **Contraseña:** admin123

⚠️ **IMPORTANTE:** Cambia estas credenciales en producción.

## 📁 Estructura del proyecto

```
shelly/
├── server/
│   ├── server.js       # Servidor Express con API REST
│   └── database.js     # Configuración de base de datos
├── public/
│   ├── index.html      # Página principal
│   ├── css/
│   │   └── style.css   # Estilos
│   └── js/
│       └── app.js      # Lógica del frontend
├── shelly_data.db      # Base de datos SQLite (se crea automáticamente)
└── package.json
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Dispositivos
- `GET /api/devices` - Listar todos los dispositivos
- `GET /api/devices/:deviceId` - Obtener un dispositivo
- `POST /api/devices/:deviceId/toggle` - Cambiar estado del dispositivo

### Estadísticas
- `GET /api/stats/summary` - Resumen general
- `GET /api/stats/power?hours=24` - Datos de consumo
- `GET /api/stats/sensors?hours=24` - Datos de sensores

### Eventos
- `GET /api/events?limit=50` - Eventos recientes

## 🔧 Configuración

### Cambiar puerto

Editar `server/server.js`:
```javascript
const PORT = 3000; // Cambiar a tu puerto preferido
```

### Conectar a SQL Server

Si ya tienes una base de datos SQL Server con dispositivos Shelly, puedes modificar `server/database.js` para usar mssql en lugar de sqlite3:

```javascript
// Usar tu connection string
const config = {
    user: 'usuario',
    password: 'contraseña',
    server: 'servidor',
    database: 'base_de_datos',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};
```

## 📊 Base de datos

La aplicación incluye una base de datos SQLite con datos de ejemplo que simula:

- 5 dispositivos Shelly (Shelly 2.5, 1PM, Plug S, H&T, Shelly 1)
- Lecturas de consumo eléctrico de las últimas 24 horas
- Lecturas de temperatura y humedad
- Estados actuales de dispositivos
- Eventos del sistema

### Tablas principales

- `users` - Usuarios del sistema
- `devices` - Dispositivos Shelly registrados
- `power_readings` - Lecturas de consumo eléctrico
- `sensor_readings` - Lecturas de temperatura/humedad
- `device_states` - Estados actuales de dispositivos
- `events` - Registro de eventos

## 🎨 Personalización

### Colores del tema

Editar `public/css/style.css`:
```css
:root {
    --primary-color: #2563eb;  /* Color principal */
    --success-color: #10b981;  /* Color de éxito */
    --danger-color: #ef4444;   /* Color de peligro */
    /* ... más variables */
}
```

## 🔒 Seguridad

- Autenticación con JWT
- Contraseñas hasheadas con bcrypt
- CORS configurado
- Validación de tokens en todas las rutas protegidas

⚠️ Para producción:
1. Cambiar `JWT_SECRET` en `server/server.js`
2. Usar HTTPS
3. Configurar CORS apropiadamente
4. Cambiar credenciales por defecto

## 🐛 Solución de problemas

### El servidor no inicia
- Verificar que el puerto 3000 no esté en uso
- Verificar que las dependencias estén instaladas: `npm install`

### No se muestran datos
- Verificar que la base de datos se haya creado correctamente
- Revisar la consola del navegador para errores
- Verificar que el token de autenticación sea válido

### Error de CORS
- Verificar que el frontend y backend estén en el mismo dominio
- O configurar CORS apropiadamente en `server/server.js`

## 📝 Licencia

ISC

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

## 📧 Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio.
