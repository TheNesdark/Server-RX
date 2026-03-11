import { SignJWT, jwtVerify } from 'jose';
import { readConfig } from '@/config';

const getSecret = (): Uint8Array | null => {
  const secret = readConfig().JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
};
export async function createToken(payload: Record<string, unknown>) {
  const secret = getSecret();
  if (!secret) {
    throw new Error('JWT_SECRET inválido o no configurado');
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const secret = getSecret();
    if (!secret) return null;

    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}
