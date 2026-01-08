import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_ENV = import.meta.env.JWT_SECRET;

// Asegúrarse de que la clave existe y tiene una longitud mínima (ej: 32 bytes para HS256)
if (!JWT_SECRET_ENV || JWT_SECRET_ENV.length < 32) {
    throw new Error('JWT_SECRET debe estar definida y tener una longitud mínima de 32 bytes.');
}

// Tipo para el payload del JWT
export interface JwtPayload {
    username: string;
    exp?: number;
    iat?: number;
    [key: string]: unknown;
}

// Declarar el tipo para globalThis.__SECRET
declare global {
    // eslint-disable-next-line no-var
    var __SECRET: Uint8Array | undefined;
}

const SECRET = globalThis.__SECRET || new TextEncoder().encode(JWT_SECRET_ENV);

export async function createToken(payload: JwtPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as JwtPayload;
  } catch (error) {
    return null;
  }
}
