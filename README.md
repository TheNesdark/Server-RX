# Visualizador de Estudios DICOM (vdcom-hlm)

Aplicación web moderna para la visualización y gestión de estudios médicos DICOM, integrando un servidor PACS **Orthanc** con una interfaz rápida construida en **Astro** y **Preact**.

## 🚀 Características

*   **Integración con Orthanc:** Conexión directa con servidores PACS Orthanc.
*   **Gestión Dinámica:** Configuración total del sistema desde el panel administrativo sin editar archivos manuales.
*   **Visor DICOM Avanzado:** Basado en `dwv` con herramientas de manipulación (Zoom, Pan, Niveles de ventana).
*   **Modo Lite:** Visor ligero optimizado para acceso rápido a imágenes renderizadas (JPEG) mediante validación de DNI de paciente.
*   **Búsqueda Rápida:** Base de datos local (SQLite) sincronizada para consultas instantáneas de pacientes y estudios.
*   **Seguridad:** Sistema de autenticación JWT para administración y control de acceso por estudio para pacientes.

## 🛠️ Configuración del Sistema

A diferencia de versiones anteriores, el proyecto ya **no depende de variables de entorno (.env)** para su funcionamiento base. Toda la configuración se gestiona a través del archivo `config.json`.

1.  **Primer Inicio:** El sistema creará un archivo `config.json` por defecto si no existe.
2.  **Panel Administrativo:** Accede a la ruta `/configuracion` dentro de la aplicación para editar:
    *   URL y credenciales del Servidor Orthanc.
    *   Credenciales del Usuario Administrador.
    *   JWT Secret para la seguridad de sesiones.
    *   Ruta personalizada de la base de datos SQLite.
    *   Modo Producción (HTTPS/Secure Cookies).

## 🧞 Comandos

| Comando | Acción |
| :--- | :--- |
| `npm install` | Instala las dependencias del proyecto. |
| `npm run dev` | Inicia el servidor de desarrollo en `localhost:4321`. |
| `npm run build` | Compila la aplicación para producción (Node.js standalone). |
| `npm run preview` | Previsualiza la versión compilada localmente. |

## 🔄 Sincronización de Datos

La aplicación mantiene una base de datos local para mejorar el rendimiento de las búsquedas.

*   **Sincronización Manual:** Disponible desde el botón "Sincronizar" en el panel de **Configuración**.
*   **Automatización:** La sincronización descarga los metadatos de todos los estudios disponibles en Orthanc y los indexa en el archivo local definido en la configuración (por defecto `studies.db`).

## 📂 Estructura del Proyecto

```text
/
├── config.json           # CONFIGURACIÓN ACTIVA (No subir a Git)
├── public/               # Assets estáticos
├── src/
│   ├── actions/          # Acciones de servidor (Login, Config, Sync)
│   ├── components/       # Componentes UI (Estudios, Visores, Modales)
│   ├── config/           # Lógica de lectura/escritura de config.json
│   ├── libs/             # Clientes de base de datos y Orthanc
│   ├── pages/            # Rutas de la App y Endpoints de API
│   │   ├── api/          # APIs protegidas de Orthanc y Tareas
│   │   ├── viewer/       # Visor DICOM completo
│   │   └── viewer-lite/  # Visor JPEG rápido para pacientes
│   └── utils/            # Utilidades de seguridad y formato
├── tsconfig.json         # Configuración de TypeScript y Alias (@/*)
└── astro.config.mjs      # Configuración de Astro (Node.js SSR)
```

## 📦 Despliegue

Para desplegar en un entorno de producción con Node.js:

```bash
npm run build
node ./dist/server/entry.mjs
```

Asegúrate de que el puerto configurado esté abierto y que el archivo `config.json` tenga las rutas correctas para el entorno de destino.
