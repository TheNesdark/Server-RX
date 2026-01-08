import { base64Encode } from "@/utils/StudyUtils";
// Validar que las variables de entorno estén definidas
const ORTHANC_URL_ENV = import.meta.env.API_BASE_URL;
const ORTHANC_USERNAME_ENV = import.meta.env.ORTHANC_USERNAME;
const ORTHANC_PASSWORD_ENV = import.meta.env.ORTHANC_PASSWORD;

if (!ORTHANC_URL_ENV) {
  throw new Error('API_BASE_URL no está definida en las variables de entorno');
}
if (!ORTHANC_USERNAME_ENV) {
  throw new Error('ORTHANC_USERNAME no está definida en las variables de entorno');
}
if (!ORTHANC_PASSWORD_ENV) {
  throw new Error('ORTHANC_PASSWORD no está definida en las variables de entorno');
}

export const ORTHANC_URL = ORTHANC_URL_ENV;
export const ORTHANC_USERNAME = ORTHANC_USERNAME_ENV;
export const ORTHANC_PASSWORD = ORTHANC_PASSWORD_ENV;



export const ORTHANC_AUTH = `Basic ${base64Encode(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`)}`;