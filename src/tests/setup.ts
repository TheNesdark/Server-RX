// Setup file para Vitest
// Aquí puedes agregar configuraciones globales para los tests

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';

// Limpieza automática después de cada test
afterEach(() => {
  cleanup();
});
