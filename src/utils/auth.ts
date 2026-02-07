import { verifyToken } from '@/libs/auth';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config';
import type { AstroCookies } from 'astro';

export async function checkApiAuth(id: string, cookies: AstroCookies, type: 'instance' | 'series' | 'study' = 'instance'): Promise<boolean> {
    // 1. Verificar autenticación de Admin
    const authToken = cookies.get('auth_token')?.value;
    if (authToken) {
        const payload = await verifyToken(authToken);
        if (payload) return true;
    }

    // 2. Verificar autenticación Lite (estudiante/paciente)
    try {
        let parentStudyId = '';
        
        if (type === 'instance') {
            const res = await fetch(`${ORTHANC_URL}/instances/${id}`, { headers: { 'Authorization': ORTHANC_AUTH } });
            if (res.ok) parentStudyId = (await res.json()).ParentStudy;
        } else if (type === 'series') {
            const res = await fetch(`${ORTHANC_URL}/series/${id}`, { headers: { 'Authorization': ORTHANC_AUTH } });
            if (res.ok) parentStudyId = (await res.json()).ParentStudy;
        } else if (type === 'study') {
            parentStudyId = id;
        }

        if (parentStudyId) {
            const liteCookie = cookies.get(`auth_lite_${parentStudyId}`)?.value;
            if (liteCookie) return true;
        }
    } catch (error) {
        console.error(`Error verificando auth lite para ${type} ${id}:`, error);
    }

    return false;
}
