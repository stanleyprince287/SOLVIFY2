import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { ACCESS_COOKIE } from '../lib/cookies.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { Role } from '@solvify/shared';
import { AccountStatus } from '@solvify/shared';

export interface AuthActor {
  id: string;
  role: Role;
  email: string;
  fullName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: AuthActor;
    }
  }
}

function extractToken(header?: string, cookie?: string): string | null {
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return cookie ?? null;
}

async function resolveActor(token: string): Promise<AuthActor> {
  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Your session has expired. Please sign in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, email: true, fullName: true, accountStatus: true },
  });

  if (!user) throw new UnauthorizedError('Your session is no longer valid. Please sign in again.');
  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw new ForbiddenError('Your account is not active. Please contact support.');
  }

  return { id: user.id, role: user.role as Role, email: user.email, fullName: user.fullName };
}

/** Hard gate — 401 if there is no valid session. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req.headers.authorization, req.cookies?.[ACCESS_COOKIE]);
    if (!token) throw new UnauthorizedError();
    req.actor = await resolveActor(token);
    next();
  } catch (err) {
    next(err);
  }
};

/** Soft gate — attaches the actor when present, never rejects. Used on public browse routes. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req.headers.authorization, req.cookies?.[ACCESS_COOKIE]);
    if (token) req.actor = await resolveActor(token);
  } catch {
    // Public routes must not fail because of a stale cookie
  }
  next();
};