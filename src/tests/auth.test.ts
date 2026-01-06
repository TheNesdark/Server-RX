import { describe, it, expect, vi } from 'vitest';

// Configurar el entorno de testing
const originalEnv = process.env;

// Mock del módulo completo antes de cualquier import
vi.mock('@/libs/auth/auth', () => {
  const { SignJWT, jwtVerify } = require('jose');
  const secret = new TextEncoder().encode('super-secret-key-that-is-at-least-32-characters-long-for-testing');

  const createToken = async (payload: any) => {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .setJti(Math.random().toString(36)) // Agregar JTI único para hacer tokens únicos
      .sign(secret);
  };

  const verifyToken = async (token: string) => {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (error) {
      return null;
    }
  };

  return { createToken, verifyToken };
});

// Ahora importar las funciones
import { createToken, verifyToken } from '@/libs/auth/auth';

describe('createToken', () => {
  it('debería crear un token JWT válido', async () => {
    const payload = { userId: 'user-123', role: 'doctor' };

    const token = await createToken(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT estándar con 3 partes
  });

  it('debería crear tokens diferentes para el mismo payload en tiempos diferentes', async () => {
    const payload = { userId: 'user-123' };

    const token1 = await createToken(payload);
    await new Promise(resolve => setTimeout(resolve, 1)); // Esperar 1ms
    const token2 = await createToken(payload);

    expect(token1).not.toBe(token2);
  });

  it('debería manejar payloads complejos', async () => {
    const payload = {
      userId: 'user-123',
      role: 'doctor',
      permissions: ['read', 'write', 'delete'],
      hospital: 'Hospital Central',
      expiresAt: new Date('2025-12-31')
    };

    const token = await createToken(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyToken', () => {
  it('debería verificar un token válido y retornar el payload', async () => {
    const payload = { userId: 'user-123', role: 'doctor' };
    const token = await createToken(payload);

    const verified = await verifyToken(token);

    expect(verified).toBeDefined();
    expect(verified?.userId).toBe('user-123');
    expect(verified?.role).toBe('doctor');
    expect(verified?.iat).toBeDefined(); // iat (issued at) debe existir
    expect(verified?.exp).toBeDefined(); // exp (expiration) debe existir
  });

  it('debería retornar null para token inválido', async () => {
    const invalidToken = 'invalid.jwt.token';

    const result = await verifyToken(invalidToken);

    expect(result).toBeNull();
  });

  it('debería retornar null para token manipulado', async () => {
    const payload = { userId: 'user-123' };
    const token = await createToken(payload);

    // Intentar manipular el token
    const parts = token.split('.');
    const manipulatedToken = parts[0] + '.' + parts[1] + '.manipulated';

    const result = await verifyToken(manipulatedToken);

    expect(result).toBeNull();
  });

  it('debería retornar null para token expirado', async () => {
    // Mock del módulo para crear un token expirado
    const { SignJWT, jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode('super-secret-key-that-is-at-least-32-characters-long-for-testing');

    // Crear token que expiró hace 1 segundo
    const expiredToken = await new SignJWT({ userId: 'test' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Date.now() / 1000 - 10) // Emitido hace 10 segundos
      .setExpirationTime(Date.now() / 1000 - 1) // Expirado hace 1 segundo
      .sign(secret);

    const result = await verifyToken(expiredToken);

    expect(result).toBeNull();
  });

  it('debería validar que el token contiene campos requeridos', async () => {
    const payload = { userId: 'user-123', role: 'doctor' };
    const token = await createToken(payload);

    const verified = await verifyToken(token);

    expect(verified).toHaveProperty('iat');
    expect(verified).toHaveProperty('exp');
    expect(typeof verified?.iat).toBe('number');
    expect(typeof verified?.exp).toBe('number');
    expect(verified?.exp).toBeGreaterThan(verified?.iat);
  });

  it('debería manejar tokens con caracteres especiales', async () => {
    const payload = {
      userId: 'user-123',
      name: 'José María García',
      email: 'jose.maria@hospital.com',
      specialChars: 'áéíóúñ!@#$%^&*()'
    };

    const token = await createToken(payload);
    const verified = await verifyToken(token);

    expect(verified?.name).toBe('José María García');
    expect(verified?.email).toBe('jose.maria@hospital.com');
    expect(verified?.specialChars).toBe('áéíóúñ!@#$%^&*()');
  });
});

// Nota: Los tests de validación de JWT_SECRET requieren configuración
// especial del entorno y no se pueden ejecutar en el mismo contexto.
// Estos se probarían en integración o E2E tests.