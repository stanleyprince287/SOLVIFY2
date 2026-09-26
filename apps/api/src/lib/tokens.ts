import { randomBytes, createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import type { Role } from '@solvify/shared';

const secretKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AccessTokenPayload {
  sub: string;   // user id
  role: Role;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('solvify')
    .setAudience('solvify-web')
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MIN}m`)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey, {
    issuer: 'solvify',
    audience: 'solvify-web',
  });
  if (payload.type !== 'access' || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub: payload.sub, role: payload.role as Role };
}

/** Opaque refresh token — random bytes, never a JWT. Only the hash is persisted. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return d;
}