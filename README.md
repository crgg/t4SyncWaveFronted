# T4SyncWave 🎵

Aplicación web para sincronizar reproducción de audio en tiempo real entre múltiples dispositivos.

## 🚀 Características

- ✅ Reproducción sincronizada en tiempo real
- ✅ Control centralizado desde el host
- ✅ Múltiples sesiones simultáneas
- ✅ Reconexión automática
- ✅ Baja latencia (< 200ms)
- ✅ UI moderna y responsive
- ✅ Arquitectura escalable

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- npm o yarn
- Navegador moderno con soporte para WebSocket

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd T4SyncWave
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno (opcional):
```bash
# Crea un archivo .env
VITE_WS_URL=http://localhost:3001
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

5. Abre tu navegador en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
T4SyncWave/
├── src/
│   ├── app/                    # Configuración de Redux
│   ├── features/               # Módulos por funcionalidad
│   │   ├── session/           # Gestión de sesiones
│   │   ├── audio/             # Reproducción de audio
│   │   └── connection/        # Estado de conexión
│   ├── shared/                # Código compartido
│   │   ├── components/        # Componentes reutilizables
│   │   ├── hooks/            # Hooks personalizados
│   │   ├── services/         # Servicios compartidos
│   │   ├── types/            # Tipos TypeScript
│   │   └── utils/            # Utilidades
│   ├── services/              # Servicios principales
│   │   ├── websocket/        # Servicio WebSocket
│   │   └── audio/            # Servicio de audio
│   └── pages/                # Páginas principales
├── ARCHITECTURE.md           # Documentación de arquitectura
├── DEVELOPMENT_PLAN.md        # Plan de desarrollo
└── README.md                 # Este archivo
```

## 🎯 Uso

### Como Host (Creador de Sesión)

1. Ve a la página principal
2. Haz clic en "Crear Sesión"
3. Opcionalmente, ingresa un nombre para la sesión
4. Comparte el ID de sesión con otros usuarios
5. Controla la reproducción (play, pause, volumen, siguiente)

### Como Listener (Invitado)

1. Ve a la página principal
2. Haz clic en "Unirse a Sesión"
3. Ingresa el ID de sesión proporcionado por el host
4. Escucha la reproducción sincronizada

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter
- `npm run format` - Formatea el código con Prettier

## 🏗️ Arquitectura

La aplicación sigue una arquitectura modular basada en features:

- **Features**: Módulos independientes por funcionalidad
- **Shared**: Código compartido entre features
- **Services**: Servicios principales (WebSocket, Audio)
- **Redux**: Estado global con Redux Toolkit

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para más detalles.

## 🔌 Backend

El backend debe implementar un servidor Socket.IO que maneje los eventos definidos en `src/shared/constants/index.ts`.

Ver `backend-example/` para un ejemplo de implementación del servidor.

## 🔒 Seguridad

- Validación de permisos en el servidor
- Session IDs únicos y aleatorios
- Rate limiting recomendado
- Comunicación encriptada (WSS/HTTPS)

## 📈 Escalabilidad

- Múltiples sesiones simultáneas
- Escalado horizontal con Redis
- CDN para assets estáticos
- Load balancing

## 🧪 Testing

```bash
# Próximamente
npm run test
```

## 📝 Convenciones de Código

- **Componentes**: PascalCase (`AudioPlayer.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useWebSocket.ts`)
- **Servicios**: camelCase (`websocketService.ts`)
- **Slices**: camelCase con sufijo `Slice` (`audioSlice.ts`)
- **Tipos**: PascalCase (`AudioState`)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🙏 Agradecimientos

- React
- Redux Toolkit
- Socket.IO
- Tailwind CSS
- Framer Motion

