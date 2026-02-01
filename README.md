# Visualizador de Estudios DICOM (vdcom-hlm)

Aplicación web moderna para la visualización y gestión de estudios médicos DICOM, integrando un servidor PACS **Orthanc** con una interfaz rápida construida en **Astro** y **Preact**.

## 🚀 Características

*   **Integración con Orthanc:** Sincronización automática de metadatos desde servidor PACS.
*   **Visor DICOM Avanzado:** Basado en `dwv` con herramientas de manipulación (Zoom, Pan, Niveles de ventana).
*   **Modo Lite:** Visor ligero para acceso rápido a imágenes renderizadas (JPEG).
*   **Búsqueda Rápida:** Base de datos local (SQLite) para consultas instantáneas de pacientes y estudios.
*   **Seguridad:** Sistema de autenticación JWT y control de acceso granular por estudio.

## 🛠️ Configuración del Entorno

1.  Copia el archivo de ejemplo:
    ```bash
    cp .env.example .env
    ```

2.  Configura las variables de entorno en `.env`:
    ```ini
    ORTHANC_URL=http://tu-servidor-orthanc:8042
    ORTHANC_USERNAME=usuario
    ORTHANC_PASSWORD=contraseña
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=secreto
    JWT_SECRET=tu_clave_secreta_jwt
    CRON_SECRET=secreto_para_cron_jobs
    ```

## 🧞 Comandos

| Comando | Acción |
| :--- | :--- |
| `npm install` | Instala dependencias. |
| `npm run dev` | Inicia servidor de desarrollo en `localhost:4321`. |
| `npm run build` | Compila la aplicación para producción (Node.js standalone). |
| `npm run preview` | Previsualiza la compilación localmente. |

## 🔄 Sincronización de Datos

La aplicación mantiene una base de datos local (`studies.db`) sincronizada con Orthanc para mejorar el rendimiento.

*   **Endpoint de Sincronización:** `GET /api/tasks/sync`
*   **Automatización:** Configurado para **Vercel Cron** (diario a las 00:00).
*   **Seguridad del Cron:** Protegido mediante header `Authorization: Bearer <CRON_SECRET>`.

## 📂 Estructura del Proyecto

```text
/
├── public/               # Assets estáticos
├── src/
│   ├── components/       # Componentes UI (Modales, Listas, Toolbar)
│   ├── config/           # Configuración (Orthanc, DB)
│   ├── hooks/            # Hooks personalizados (useDicomViewer)
│   ├── libs/             # Lógica de negocio (Auth, Sync, Orthanc Client)
│   ├── pages/            # Rutas (Viewer, API endpoints, Login)
│   │   ├── api/          # Proxy APIs para Orthanc
│   │   └── viewer/       # Rutas del visor principal y lite
│   └── styles/           # CSS Global y Módulos
├── studies.db            # Cache local SQLite
└── astro.config.mjs      # Configuración Astro (Node Adapter)
```

## 📦 Despliegue

El proyecto está configurado para ejecutarse como un servidor **Node.js** independiente (`standalone`).

```bash
npm run build
node ./dist/server/entry.mjs
```

Si usas Vercel, el archivo `vercel.json` configura las tareas programadas (Cron Jobs) y redirecciones de túnel para desarrollo local.
