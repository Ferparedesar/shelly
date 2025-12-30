# 🏠 Shelly Dashboard

Dashboard web completo para monitorear y controlar dispositivos Shelly IoT con estadísticas en tiempo real, gráficas interactivas y sistema de autenticación.

## ✨ Características

- 🔐 **Autenticación JWT** con login/logout
- 📊 **Dashboard en tiempo real** con estadísticas de dispositivos
- 📈 **Gráficas interactivas** de consumo eléctrico (Chart.js)
- 🌡️ **Monitoreo de temperatura** y humedad
- 🎛️ **Panel de control** de dispositivos
- 📋 **Registro de eventos** y actividad
- 📱 **Diseño responsive** para móviles
- 🔗 **Dos modos de operación**: SQLite local o integración con API C#

## 🚀 Inicio Rápido

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ferparedesar/shelly.git
cd shelly

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start

# 4. Abrir en el navegador
http://localhost:3000
```

### Credenciales por Defecto

- **Usuario:** `admin`
- **Contraseña:** `admin123`

⚠️ **Cambiar estas credenciales en producción**

## 📖 Documentación

### Modos de Operación

#### 🔵 **Modo 1: SQLite Local (Demo)**
```bash
npm start
```
- Usa base de datos SQLite local
- Incluye datos de ejemplo de 5 dispositivos Shelly
- Ideal para desarrollo y pruebas
- No requiere backend externo

#### 🟢 **Modo 2: Integrado con Backend C# (Producción)**
```bash
npm run start:api
```
- Se conecta a tu backend ASP.NET Core existente
- Lee datos reales de SQL Server
- Requiere configuración adicional

📚 **[Ver guía de integración completa →](INTEGRACION.md)**

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│           Frontend (HTML/CSS/JS)                │
│   - Dashboard con Chart.js                      │
│   - Autenticación JWT                           │
│   - Diseño responsive                           │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│      Backend Node.js (Express)                  │
│   - API REST                                    │
│   - Autenticación                               │
│   - Dos modos:                                  │
│     • SQLite local (demo)                       │
│     • Proxy a backend C# (producción)           │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │                   │
┌───────▼──────┐   ┌────────▼──────────┐
│ SQLite Local │   │ Backend C# + SQL  │
│ (Demo)       │   │ Server (Real)     │
└──────────────┘   └───────────────────┘
```

## 📁 Estructura del Proyecto

```
shelly/
├── server/
│   ├── server.js          # Servidor con SQLite (modo demo)
│   ├── server_api.js      # Servidor con proxy a C# API
│   └── database.js        # Configuración SQLite
├── public/
│   ├── index.html         # Interfaz principal
│   ├── css/
│   │   └── style.css      # Estilos
│   └── js/
│       └── app.js         # Lógica del frontend
├── .env.example           # Variables de entorno (ejemplo)
├── package.json
├── README.md              # Este archivo
├── INTEGRACION.md         # Guía de integración con C# API
└── README_APP.md          # Documentación técnica detallada
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Dispositivos
- `GET /api/devices` - Listar dispositivos
- `GET /api/devices/:id` - Obtener dispositivo
- `POST /api/devices/:id/toggle` - Cambiar estado

### Estadísticas
- `GET /api/stats/summary` - Resumen general
- `GET /api/stats/power` - Datos de consumo eléctrico
- `GET /api/stats/sensors` - Datos de sensores
- `GET /api/events` - Eventos recientes

## 🛠️ Tecnologías

**Backend:**
- Node.js
- Express.js
- SQLite3 / SQL Server
- JWT (jsonwebtoken)
- bcryptjs

**Frontend:**
- HTML5
- CSS3 (diseño moderno)
- Vanilla JavaScript
- Chart.js

## ⚙️ Configuración Avanzada

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
PORT=3000
JWT_SECRET=tu-secreto-jwt-seguro
CSHARP_API_URL=http://localhost:5000
```

### Conectar a Backend C#

Si tienes el backend ASP.NET Core corriendo:

1. Configurar `.env` con la URL del backend
2. Ejecutar `npm run start:api`
3. El dashboard se conectará automáticamente

Ver **[INTEGRACION.md](INTEGRACION.md)** para más detalles.

### Cambiar Puerto

```bash
PORT=8080 npm start
```

## 📊 Funcionalidades del Dashboard

### Tarjetas de Estadísticas
- 📱 Total de dispositivos
- 🟢 Dispositivos activos
- ⚡ Consumo eléctrico actual (W)
- 📊 Energía consumida (kWh)

### Gráficas Interactivas
- 📈 Consumo de energía por dispositivo (24h)
- 🌡️ Temperatura y humedad

### Panel de Dispositivos
- Ver estado de cada dispositivo
- Información detallada (IP, MAC, firmware)
- Control on/off (requiere implementación en backend)

### Registro de Eventos
- Historial de actividad
- Eventos de encendido/apagado
- Alertas de consumo

## 🔒 Seguridad

- ✅ Autenticación JWT
- ✅ Contraseñas hasheadas con bcrypt
- ✅ CORS configurado
- ✅ Validación de tokens

**Para producción:**
1. Cambiar `JWT_SECRET`
2. Usar HTTPS
3. Configurar CORS apropiadamente
4. Cambiar credenciales por defecto
5. Implementar rate limiting

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Verificar que las dependencias estén instaladas
npm install

# Verificar que el puerto no esté en uso
lsof -i :3000
```

### No se muestran datos
- Verificar que estés usando las credenciales correctas
- Revisar la consola del navegador (F12)
- Verificar que el backend esté corriendo (modo API)

### Error de CORS
- Verificar que frontend y backend estén en el mismo origen
- O configurar CORS apropiadamente

## 📚 Documentación Adicional

- **[README_APP.md](README_APP.md)** - Documentación técnica detallada
- **[INTEGRACION.md](INTEGRACION.md)** - Guía de integración con backend C#
- **[.env.example](.env.example)** - Variables de entorno

## 🤝 Contribuir

Las contribuciones son bienvenidas:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## 📧 Soporte

Para reportar bugs o solicitar features:
- Abre un [issue en GitHub](https://github.com/Ferparedesar/shelly/issues)

## 🎯 Roadmap

- [ ] Implementar control de dispositivos real
- [ ] Notificaciones en tiempo real con WebSockets
- [ ] Exportar datos a CSV/Excel
- [ ] Aplicación móvil
- [ ] Soporte para más tipos de dispositivos Shelly
- [ ] Dashboard de administración de usuarios
- [ ] Alertas configurables
- [ ] Integración con asistentes de voz

---

Desarrollado con ❤️ para la comunidad Shelly
