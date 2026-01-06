import { describe, it, expect } from 'vitest';
import { FormatStudy } from '@/utils';

describe('FormatStudy', () => {
  it('debería formatear un estudio correctamente', () => {
    const study = {
      id: 'study-123',
      patientName: 'Doe^John',
      patientId: 'PAT-001',
      patientSex: 'M',
      institutionName: 'Hospital Central',
      studyDate: '20250120',
      description: 'Chest CT'
    };

    const result = FormatStudy(study);

    expect(result).toEqual({
      id: 'study-123',
      patientName: 'Doe John', // Los caracteres especiales son removidos
      patientId: 'PAT-001',
      patientSex: 'M',
      institution: 'Hospital Central',
      studyDate: '2025/01/20',
      modality: 'Chest CT'
    });
  });

  it('debería manejar valores undefined', () => {
    const study = {
      id: 'study-123',
      patientName: undefined,
      patientId: undefined,
      patientSex: undefined,
      institutionName: undefined,
      studyDate: undefined,
      description: undefined
    };

    const result = FormatStudy(study);

    expect(result).toEqual({
      id: 'study-123',
      patientName: 'Paciente Anónimo',
      patientId: 'ID Desconocido',
      patientSex: 'Sexo Desconocido',
      institution: 'Institución Desconocida',
      studyDate: 'Fecha Desconocida',
      modality: 'Sin descripción'
    });
  });

  it('debería formatear fecha DICOM correctamente', () => {
    const study = {
      id: 'study-123',
      patientName: 'John Doe',
      patientId: 'PAT-001',
      patientSex: 'M',
      institutionName: 'Hospital',
      studyDate: '20250120',
      description: 'CT'
    };

    const result = FormatStudy(study);
    expect(result.studyDate).toBe('2025/01/20');
  });

  it('debería usar fecha desconocida para fechas inválidas', () => {
    const study = {
      id: 'study-123',
      patientName: 'John Doe',
      patientId: 'PAT-001',
      patientSex: 'M',
      institutionName: 'Hospital',
      studyDate: 'invalid-date',
      description: 'CT'
    };

    const result = FormatStudy(study);
    expect(result.studyDate).toBe('Fecha Desconocida');
  });

  it('debería usar fecha desconocida para fechas con mes/día inválido', () => {
    const study = {
      id: 'study-123',
      patientName: 'John Doe',
      patientId: 'PAT-001',
      patientSex: 'M',
      institutionName: 'Hospital',
      studyDate: '20251345', // Mes 13, día 45 inválidos
      description: 'CT'
    };

    const result = FormatStudy(study);
    expect(result.studyDate).toBe('Fecha Desconocida');
  });

  it('debería limpiar caracteres especiales del nombre del paciente', () => {
    const study = {
      id: 'study-123',
      patientName: 'Doe^John@#$%^&*',
      patientId: 'PAT-001',
      patientSex: 'M',
      institutionName: 'Hospital',
      studyDate: '20250120',
      description: 'CT'
    };

    const result = FormatStudy(study);
    expect(result.patientName).toBe('Doe John');
  });

  it('debería manejar nombres de paciente con caracteres Unicode', () => {
    const study = {
      id: 'study-123',
      patientName: 'García@José María',
      patientId: 'PAT-001',
      patientSex: 'M',
      institutionName: 'Hospital',
      studyDate: '20250120',
      description: 'CT'
    };

    const result = FormatStudy(study);
    expect(result.patientName).toBe('García José María'); // Caracteres Unicode se preservan
  });
});
