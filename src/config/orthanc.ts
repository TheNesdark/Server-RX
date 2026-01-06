export const ORTHANC_URL = import.meta.env.API_BASE_URL;
export const ORTHANC_USERNAME = import.meta.env.ORTHANC_USERNAME;
export const ORTHANC_PASSWORD = import.meta.env.ORTHANC_PASSWORD;
export const ORTHANC_AUTH = `Basic ${Buffer.from(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`).toString('base64')}`;