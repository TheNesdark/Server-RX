import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_ENV = import.meta.env.JWT_SECRET;

// Asegúrarse de que la clave existe y tiene una longitud mínima (ej: 32 bytes para HS256)
if (!JWT_SECRET_ENV || JWT_SECRET_ENV.length < 32) {
    throw new Error('JWT_SECRET debe estar definida y tener una longitud mínima de 32 bytes.');
}

const SECRET = new TextEncoder().encode(JWT_SECRET_ENV);

export async function createToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch (error) {
    console.log("Error verificando el token JWT:", error);
    return null;
  }
}
