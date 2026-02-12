import { atom } from 'nanostores';
import type { ToolType } from '@/types';

// Aquí guardaremos el ID de la serie seleccionada.
export const activeSeriesId = atom<string | null>(null);

// Herramienta activa para el visor lite
export const activeTool = atom<ToolType>('None');
