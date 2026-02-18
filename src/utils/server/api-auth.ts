import { verifyToken } from '@/libs/auth';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config';
import type { AstroCookies } from 'astro';
import { normalizeIdentity } from '../client/identity';
import { getParentStudyId } from '@/libs/db/studies';

export async function checkApiAuth(id: string, cookies: AstroCookies, type: 'instance' | 'series' | 'study' = 'instance'): Promise<boolean> {
    // 1. Verificar autenticación de Admin
    const authToken = cookies.get('auth_token')?.value;
    if (authToken) {
        const payload = await verifyToken(authToken);
        if (payload) return true;
    }

    // 2. Verificar autenticación Lite (estudiante/paciente)
    try {
        let parentStudyId: string | null = '';

        if (type === 'instance' || type === 'series') {
            // OPTIMIZACIÓN: Buscar en DB local primero
            parentStudyId = getParentStudyId(id, type);

            if (!parentStudyId) {
                const res = await fetch(`${ORTHANC_URL}/${type === 'instance' ? 'instances' : 'series'}/${id}`, {
                    headers: { 'Authorization': ORTHANC_AUTH }
                });
                if (res.ok) parentStudyId = (await res.json()).ParentStudy;
            }
        } else if (type === 'study') {
            parentStudyId = id;
        }

        if (parentStudyId) {
            const liteCookie = cookies.get(`auth_lite_${parentStudyId}`)?.value;
            if (!liteCookie) return false;

            const studyRes = await fetch(`${ORTHANC_URL}/studies/${parentStudyId}`, {
                headers: { 'Authorization': ORTHANC_AUTH }
            });

            if (!studyRes.ok) {
                return false;
            }

            const study = await studyRes.json();
            const studyPatientId = study?.PatientMainDicomTags?.PatientID;

            if (typeof studyPatientId === 'string' && normalizeIdentity(liteCookie) === normalizeIdentity(studyPatientId)) {
                return true;
            }
        }
    } catch (error) {
        console.error(`Error verificando auth lite para ${type} ${id}:`, error);
    }

    return false;
}
