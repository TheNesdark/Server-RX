# DICOM Express Server

Servidor Express mínimo para servir y subir archivos DICOM.

Endpoints:

- `GET /` : pequeña interfaz HTML para listar y subir archivos.
- `GET /list` : devuelve JSON con la lista de archivos.
- `GET /files/:name` : descarga/visualiza el archivo DICOM con `Content-Type: application/dicom`.
- `POST /upload` : sube uno o varios archivos (field name `files`).

Uso:

1. Ir a la carpeta `server`:

```bash
cd server
```

2. Instalar dependencias (si no están instaladas):

```bash
npm install
```

3. Ejecutar el servidor:

```bash
npm start
```

Por defecto sirve archivos desde `server/dicom_files`. Puedes cambiar la carpeta exportando `DICOM_DIR`:

```bash
DICOM_DIR=/ruta/a/mis/dicoms npm start
```
