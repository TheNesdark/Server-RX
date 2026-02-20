import { verifyToken } from '@/libs/auth';
import type { AstroCookies } from 'astro';
import { getParentStudyId } from '@/libs/db/studies';
import { orthancFetch } from '@/libs/orthanc';
import { GetDNIbyStudyID } from '@/libs/orthanc';

export async function checkApiAuth(id: string, cookies: AstroCookies, type: 'instance' | 'series' | 'study' = 'instance'): Promise<boolean> {
    // 1. Verificar autenticación de Admin
    const authCookie = cookies.get('auth_token')?.value;
    if (authCookie) {
        const payload = await verifyToken(authCookie);
        if (payload && payload.type === 'admin_session') return true;
    }

    // 2. Verificar autenticación Lite (estudiante/paciente)
    try {
        let parentStudyId: string | null = null;

        if (type === 'instance' || type === 'series') {
            // Intentar obtener de la DB local
            parentStudyId = getParentStudyId(id, type);

            // Si no está en DB local, preguntar a Orthanc
            if (!parentStudyId) {
                const path = `/${type === 'instance' ? 'instances' : 'series'}/${id}`;
                const res = await orthancFetch(path);
                const data = await res.json();
                parentStudyId = data.ParentStudy;
                }
        } else if (type === 'study') {
            parentStudyId = id;
        }

        if (parentStudyId) {
            const liteCookieToken = cookies.get(`auth_patient_${parentStudyId}`)?.value;
            if (!liteCookieToken) {
                console.log(`No se encontró cookie de auth para estudio ${parentStudyId}`);
                return false;
            }
            const payload = await verifyToken(liteCookieToken);
            
            // Validar que el token sea de tipo lite y pertenezca a este estudio
            if (payload && payload.type === 'lite_access' && payload.studyId === parentStudyId) {
                return true;
            }
        }
    } catch (error) {
        console.error(`Error verificando auth lite para ${type} ${id}:`, error);
    }
    return false;
}

export interface ValidationResult {
    isAuthorized: boolean;
    isAdmin: boolean;
    errorMsg?: string;
}

/**
 * Valida el acceso de un usuario (Admin o Paciente) a un estudio específico.
 */
export async function validateStudyAccess(context: { cookies: AstroCookies, locals: any }, studyId: string): Promise<ValidationResult> {
    const { cookies, locals } = context;

    // 1. Verificar si el usuario es Admin (ya verificado por middleware)
    const isAdmin = !!locals.user;
    if (isAdmin) {
        return { isAuthorized: true, isAdmin: true };
    }

    // 2. Verificar autenticación mediante cookie para pacientes
    const DNI = await GetDNIbyStudyID(studyId);
    const cookieName = `auth_patient_${studyId}`;
    const authCookie = cookies.get(cookieName);

    if (authCookie) {
        const payload = await verifyToken(authCookie.value);
        if (payload && payload.studyId === studyId && String(payload.dni).trim() === String(DNI).trim()) {
            return { isAuthorized: true, isAdmin: false };
        }
    }

    return { isAuthorized: false, isAdmin: false };
}
