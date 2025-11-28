import { atom } from 'nanostores';

// Aquí guardaremos el ID de la serie seleccionada.
// Empieza en null (ninguna seleccionada).
export const serieActivaId = atom<string | null>(null);