import { describe, it, expect } from 'vitest';
import { sanitizeString } from '@/utils';

describe('sanitizeString', () => {
  describe('Validación de Input', () => {
    it('debería retornar string vacío si input es undefined', () => {
      expect(sanitizeString(undefined)).toBe('');
    });

    it('debería retornar string vacío si input es null', () => {
      expect(sanitizeString(null as any)).toBe('');
    });

    it('debería retornar string vacío si input no es un string', () => {
      expect(sanitizeString(123 as any)).toBe('');
      expect(sanitizeString({} as any)).toBe('');
      expect(sanitizeString([] as any)).toBe('');
    });
  });

  describe('Remoción de Caracteres de Control', () => {
    it('debería remover caracteres de control (0x00-0x1F)', () => {
      const input = 'Hello\x00World\x01Test';
      expect(sanitizeString(input)).toBe('HelloWorldTest');
    });

    it('debería remover caracteres de control extendidos (0x7F-0x9F)', () => {
      const input = 'Texto\x7FMás\x80Caracteres\x9A';
      expect(sanitizeString(input)).toBe('TextoMásCaracteres');
    });

    it('debería preservar caracteres normales', () => {
      const input = 'Hola Mundo 123!@#$%^&*()[]{};:\'",.<>?/\\|`~-_=+';
      expect(sanitizeString(input)).toBe(input);
    });

    it('debería preservar caracteres con acentos y Unicode', () => {
      const input = 'áéíóú ÁÉÍÓÚ ñ Ñ 漢字 العربية';
      expect(sanitizeString(input)).toBe(input);
    });

    it('debería preservar emojis', () => {
      const input = '👨‍⚕️🏥💉💊🩺';
      expect(sanitizeString(input)).toBe(input);
    });
  });

  describe('Limitación de Longitud', () => {
    it('debería limitar longitud al valor por defecto (255)', () => {
      const longString = 'a'.repeat(300);
      const result = sanitizeString(longString);
      expect(result.length).toBe(255);
      expect(result).toBe('a'.repeat(255));
    });

    it('debería limitar longitud al valor especificado', () => {
      const longString = 'a'.repeat(100);
      const result = sanitizeString(longString, 50);
      expect(result.length).toBe(50);
      expect(result).toBe('a'.repeat(50));
    });

    it('debería no truncar strings si son más cortos que maxLength', () => {
      const shortString = 'Hola Mundo';
      const result = sanitizeString(shortString, 100);
      expect(result.length).toBe(10);
      expect(result).toBe('Hola Mundo');
    });

    it('debería manejar maxLength de 0', () => {
      const input = 'Test String';
      expect(sanitizeString(input, 0)).toBe('');
    });

    it('debería manejar maxLength negativo', () => {
      const input = 'Test String';
      expect(sanitizeString(input, -10)).toBe('');
    });
  });

  describe('Casos Combinados', () => {
    it('debería remover caracteres de control Y limitar longitud', () => {
      const input = 'a'.repeat(100) + '\x01' + 'b'.repeat(200);
      const result = sanitizeString(input, 150);
      expect(result.length).toBe(150);
      expect(result).toBe('a'.repeat(100) + 'b'.repeat(50));
    });

    it('debería manejar strings con solo caracteres de control', () => {
      const input = '\x00\x01\x02\x7F\x9F';
      expect(sanitizeString(input)).toBe('');
    });

    it('debería manejar strings vacíos', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('debería manejar strings con espacios', () => {
      const input = '  Hola Mundo  ';
      expect(sanitizeString(input)).toBe('  Hola Mundo  ');
    });
  });

  describe('Caso de Uso: SQL Injection Prevention', () => {
    it('debería permitir caracteres SQL normales', () => {
      // Esto es válido en SQL y no debería ser removido por sanitizeString
      // (La protección viene de prepared statements)
      const input = "O'Reilly";
      expect(sanitizeString(input)).toBe("O'Reilly");
    });

    it('debería remover caracteres de control que podrían usarse en ataques', () => {
      const input = 'admin\x00DROP TABLE users--';
      expect(sanitizeString(input)).toBe('adminDROP TABLE users--');
    });
  });
});
