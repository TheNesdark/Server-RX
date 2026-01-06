import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks deben ir ANTES de cualquier import
vi.mock('@/libs/db/db', () => ({
  default: {
    prepare: vi.fn().mockReturnThis(),
    run: vi.fn(),
    transaction: vi.fn((fn) => fn),
    all: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/config/orthanc', () => ({
  ORTHANC_URL: 'http://localhost:8042',
  ORTHANC_AUTH: 'Basic test-auth',
}));

vi.mock('@/utils', () => ({
  sanitizeString: (str: string, max: number = 255) =>
    str ? str.substring(0, max) : ''
}));

// Ahora sí importar las funciones
import { getSeriesByStudyId, getInstancesBySeriesId } from '@/libs/orthanc/Orthanc';

// Mock de fetch global
global.fetch = vi.fn();

describe('getSeriesByStudyId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería obtener series de un estudio correctamente', async () => {
    const mockSeries = [
      'series-001',
      'series-002',
      'series-003',
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Series: mockSeries,
      }),
    });

    const result = await getSeriesByStudyId('study-123');

    expect(result).toEqual(mockSeries);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8042/studies/study-123',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': 'Basic test-auth',
        },
      })
    );
  });

  it('debería propagar error si response no es ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });

    await expect(getSeriesByStudyId('study-123'))
      .rejects
      .toThrow('Unauthorized');
  });

  it('debería manejar array vacío de series', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Series: [],
      }),
    });

    const result = await getSeriesByStudyId('study-123');

    expect(result).toEqual([]);
  });

  it('debería propagar error de red', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network down'));

    await expect(getSeriesByStudyId('study-123'))
      .rejects
      .toThrow('Network down');
  });
});

describe('getInstancesBySeriesId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería obtener instancias de una serie correctamente', async () => {
    const mockInstances = ['instance-001', 'instance-002', 'instance-003'];
    const mockMainTags = {
      Modality: 'CT',
      BodyPartExamined: 'CHEST',
      SeriesNumber: '1',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Instances: mockInstances,
        MainDicomTags: mockMainTags,
      }),
    });

    const result = await getInstancesBySeriesId('series-001');

    expect(result.Instances).toEqual(mockInstances);
    expect(result.mainDicomTags).toEqual(mockMainTags);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8042/series/series-001',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': 'Basic test-auth',
        },
      })
    );
  });

  it('debería manejar series vacías (sin instancias)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Instances: [],
        MainDicomTags: { Modality: 'XA', BodyPartExamined: '' },
      }),
    });

    const result = await getInstancesBySeriesId('series-empty');

    expect(result.Instances).toEqual([]);
    expect(result.mainDicomTags).toEqual({ Modality: 'XA', BodyPartExamined: '' });
  });

  it('debería manejar MainDicomTags con valores faltantes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Instances: ['instance-001'],
        MainDicomTags: {
          Modality: 'MR',
          // BodyPartExamined faltante
        },
      }),
    });

    const result = await getInstancesBySeriesId('series-001');

    expect(result.mainDicomTags.BodyPartExamined).toBeUndefined();
    expect(result.Instances).toEqual(['instance-001']);
  });

  it('debería propagar error si response no es ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(getInstancesBySeriesId('series-invalid'))
      .rejects
      .toThrow('Not Found');
  });
});

describe('Manejo de Errores de Orthanc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería manejar timeout de Orthanc', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Request timeout'));

    await expect(getSeriesByStudyId('study-123'))
      .rejects
      .toThrow('Request timeout');
  });

  it('debería manejar respuesta JSON inválida', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    });

    await expect(getSeriesByStudyId('study-123'))
      .rejects
      .toThrow('Unexpected token < in JSON');
  });

  it('debería manejar Orthanc no disponible (500)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(getSeriesByStudyId('study-123'))
      .rejects
      .toThrow('Internal Server Error');
  });

  it('debería manejar estudio no encontrado (404)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(getSeriesByStudyId('nonexistent-study'))
      .rejects
      .toThrow('Not Found');
  });
});
