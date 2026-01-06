import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearActiveButtons, clearAllAnnotations } from '@/utils/viewerUtils';

// Mock de DWV App
const mockApp = {
  getLayerGroupByDivId: vi.fn(),
  setToolFeatures: vi.fn(),
  setTool: vi.fn(),
  addToUndoStack: vi.fn(),
};

const mockLayerGroup = {
  getActiveDrawLayer: vi.fn(),
};

const mockDrawLayer = {
  getDrawController: vi.fn(),
};

const mockDrawController = {
  removeAllAnnotationsWithCommand: vi.fn(),
};

describe('clearActiveButtons', () => {
  beforeEach(() => {
    // Limpiar el DOM antes de cada test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debería limpiar la clase "active" de todos los botones con clase "tool-btn"', () => {
    // Crear botones de prueba
    const button1 = document.createElement('button');
    button1.className = 'tool-btn active';
    const button2 = document.createElement('button');
    button2.className = 'tool-btn active';
    const button3 = document.createElement('button');
    button3.className = 'tool-btn'; // Sin clase active inicialmente
    const button4 = document.createElement('button');
    button4.className = 'other-btn active'; // No es tool-btn

    document.body.appendChild(button1);
    document.body.appendChild(button2);
    document.body.appendChild(button3);
    document.body.appendChild(button4);

    // Ejecutar la función
    clearActiveButtons();

    // Verificar que se quitó "active" de los tool-btn
    expect(button1.className).toBe('tool-btn');
    expect(button2.className).toBe('tool-btn');
    expect(button3.className).toBe('tool-btn'); // Ya no tenía active
    expect(button4.className).toBe('other-btn active'); // No se tocó
  });

  it('debería funcionar cuando no hay botones en el DOM', () => {
    // DOM vacío
    expect(() => clearActiveButtons()).not.toThrow();
  });

  it('debería funcionar cuando no hay botones tool-btn', () => {
    // Crear otros elementos
    const div = document.createElement('div');
    div.className = 'tool-btn active'; // No es button
    document.body.appendChild(div);

    clearActiveButtons();

    // No debería cambiar nada porque no es button
    expect(div.className).toBe('tool-btn active');
  });

  it('debería manejar múltiples llamadas seguidas', () => {
    const button = document.createElement('button');
    button.className = 'tool-btn active';
    document.body.appendChild(button);

    clearActiveButtons();
    expect(button.className).toBe('tool-btn');

    // Llamar de nuevo
    button.className = 'tool-btn active again';
    clearActiveButtons();
    expect(button.className).toBe('tool-btn again');
  });
});

describe('clearAllAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Configurar mocks por defecto
    mockApp.getLayerGroupByDivId.mockReturnValue(mockLayerGroup);
    mockLayerGroup.getActiveDrawLayer.mockReturnValue(mockDrawLayer);
    mockDrawLayer.getDrawController.mockReturnValue(mockDrawController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debería limpiar anotaciones de todos los tipos de forma', () => {
    clearAllAnnotations(mockApp as any);

    // Verificar que se llamó para cada tipo de forma
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Arrow' });
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Ruler' });
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Circle' });
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Ellipse' });
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Rectangle' });
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Protractor' });
    expect(mockApp.setToolFeatures).toHaveBeenCalledWith({ shapeName: 'Roi' });

    // Verificar que removeAllAnnotationsWithCommand fue llamado 7 veces (una por forma)
    expect(mockDrawController.removeAllAnnotationsWithCommand).toHaveBeenCalledTimes(7);
    expect(mockDrawController.removeAllAnnotationsWithCommand).toHaveBeenCalledWith(mockApp.addToUndoStack);
  });

  it('debería cambiar la herramienta a "None" después de limpiar', () => {
    clearAllAnnotations(mockApp as any);

    expect(mockApp.setTool).toHaveBeenCalledWith('None');
    expect(mockApp.setTool).toHaveBeenCalledTimes(1);
  });

  it('debería manejar cuando no hay layer group activa', () => {
    mockApp.getLayerGroupByDivId.mockReturnValue(null);

    expect(() => clearAllAnnotations(mockApp as any)).not.toThrow();

    // No debería llamar a ninguna función de DWV ya que retorna temprano
    expect(mockApp.setToolFeatures).not.toHaveBeenCalled();
    expect(mockDrawController.removeAllAnnotationsWithCommand).not.toHaveBeenCalled();
    expect(mockApp.setTool).not.toHaveBeenCalled();
  });

  it('debería manejar cuando no hay draw layer activa', () => {
    mockLayerGroup.getActiveDrawLayer.mockReturnValue(null);

    expect(() => clearAllAnnotations(mockApp as any)).not.toThrow();

    // No debería llamar a ninguna función de DWV ya que retorna temprano
    expect(mockApp.setToolFeatures).not.toHaveBeenCalled();
    expect(mockDrawController.removeAllAnnotationsWithCommand).not.toHaveBeenCalled();
    expect(mockApp.setTool).not.toHaveBeenCalled();
  });

  it('debería manejar cuando no hay draw controller', () => {
    mockDrawLayer.getDrawController.mockReturnValue(null);

    expect(() => clearAllAnnotations(mockApp as any)).not.toThrow();

    // No debería llamar a ninguna función de DWV ya que retorna temprano
    expect(mockApp.setToolFeatures).not.toHaveBeenCalled();
    expect(mockDrawController.removeAllAnnotationsWithCommand).not.toHaveBeenCalled();
    expect(mockApp.setTool).not.toHaveBeenCalled();
  });

  it('debería continuar procesando otras formas cuando hay errores en removeAllAnnotationsWithCommand', () => {
    let callCount = 0;
    mockDrawController.removeAllAnnotationsWithCommand.mockImplementation(() => {
      callCount++;
      if (callCount === 3) { // Solo falla en la tercera llamada
        throw new Error('DWV error');
      }
    });

    // No debería lanzar error, debería continuar
    expect(() => clearAllAnnotations(mockApp as any)).not.toThrow();

    // Aun así debería intentar todas las formas
    expect(mockApp.setToolFeatures).toHaveBeenCalledTimes(7);
    expect(mockDrawController.removeAllAnnotationsWithCommand).toHaveBeenCalledTimes(7);
    expect(mockApp.setTool).toHaveBeenCalledWith('None');
  });

  it('debería manejar errores en setToolFeatures', () => {
    mockApp.setToolFeatures.mockImplementation(() => {
      throw new Error('Tool features error');
    });

    expect(() => clearAllAnnotations(mockApp as any)).toThrow('Tool features error');
  });

  it('debería fallar si setTool lanza un error', () => {
    mockApp.setTool.mockImplementation(() => {
      throw new Error('Set tool error');
    });

    // Debería lanzar el error de setTool
    expect(() => clearAllAnnotations(mockApp as any)).toThrow('Set tool error');

    // Pero las operaciones anteriores deberían haber sido exitosas
    expect(mockApp.setToolFeatures).toHaveBeenCalledTimes(7);
    expect(mockDrawController.removeAllAnnotationsWithCommand).toHaveBeenCalledTimes(7);
  });
});