import { atom } from 'nanostores';

// Aquí guardaremos el ID de la serie seleccionada.
export const activeSeriesId = atom<string | null>(null);

// Herramienta activa para el visor lite
export type ToolType = 'WindowLevel' | 'Zoom' | 'Pan' | 'Ruler' | 'Arrow' | 'Circle' | 'Rectangle' | 'None';
export const activeTool = atom<ToolType>('None');
