# Visualizador de Estudios DICOM (vdcom-hlm)

Este es un visor de estudios DICOM desarrollado con Astro, Preact y TypeScript. Permite cargar y visualizar imágenes médicas en formato DICOM.

## 🚀 Estructura del Proyecto

Dentro de este proyecto Astro, encontrarás la siguiente estructura de carpetas y archivos:

```text
/
├── public/               # Assets estáticos (imágenes, scripts)
├── dist/                 # Directorio de build de producción
├── src/
│   ├── components/       # Componentes Astro/Preact reutilizables
│   ├── layouts/          # Layouts base de Astro
│   ├── libs/             # Librerías y utilidades (BD, Orthanc)
│   ├── pages/            # Páginas y rutas de la aplicación
│   │   ├── api/          # Endpoints de API
│   │   └── viewer/       # Página del visor
│   ├── stores/           # Manejo de estado con Nanostores
│   └── styles/           # Estilos CSS
├── package.json          # Dependencias y scripts del proyecto
└── studies.db            # Base de datos SQLite para los estudios
```

## 🧞 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto, en una terminal:

| Comando | Acción |
| :------------------------ | :----------------------------------------------- |
| `npm install` | Instala las dependencias del proyecto. |
| `npm run dev` | Inicia el servidor de desarrollo local en `localhost:4321`. |
| `npm run build` | Compila el sitio de producción en el directorio `./dist/`. |
| `npm run preview` | Previsualiza la compilación localmente antes de desplegar. |
| `npm run astro ...` | Ejecuta comandos de la CLI de Astro como `astro add`, `astro check`. |

## 👀 Funcionalidades Principales

*   **Visualización de estudios DICOM:** Carga y muestra imágenes DICOM.
*   **Herramientas de visualización:** Incluye herramientas como Zoom, Pan, y Scroll entre slices.
*   **Lista de estudios:** Permite navegar y buscar entre los estudios disponibles.
*   **Base de datos local:** Utiliza SQLite para almacenar información de los estudios.

## 📚 Librerías Utilizadas

*   **Astro:** Framework de desarrollo web.
*   **Preact:** Librería para construir interfaces de usuario.
*   **DWV (DICOM Web Viewer):** Librería para la visualización y manipulación de imágenes DICOM.
*   **better-sqlite3:** Driver para la base de datos SQLite.
*   **Nanostores:** Para el manejo de estado.
