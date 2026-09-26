import type { RegisterInput, LoginInput } from '@solvify/shared';
import { authRepository } from './auth.repository.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from '../../lib/tokens.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { AccountStatus, Role } from '@solvify/shared';

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: Role;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

function toPublicUser(u: {
  id: string; fullName: string; email: string; phone: string;
  role: string; emailVerified: boolean; phoneVerified: boolean;
}) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role as Role,
    emailVerified: u.emailVerified,
    phoneVerified: u.phoneVerified,
  };
}

async function issueSession(user: {
  id: string; fullName: string; email: string; phone: string;
  role: string; emailVerified: boolean; phoneVerified: boolean;
}): Promise<SessionResult> {
  const accessToken = await signAccessToken({ sub: user.id, role: user.role as Role });
  const { token: refreshToken, hash } = generateRefreshToken();
  await authRepository.storeRefreshToken(user.id, hash, refreshExpiryDate());
  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export const authService = {
  async register(input: RegisterInput): Promise<SessionResult> {
    const [byEmail, byPhone] = await Promise.all([
      authRepository.findUserByEmail(input.email),
      authRepository.findUserByPhone(input.phone),
    ]);

    if (byEmail) throw new ConflictError('An account with this email already exists.', { field: 'email' });
    if (byPhone) throw new ConflictError('An account with this phone number already exists.', { field: 'phone' });

    const passwordHash = await hashPassword(input.password);

    const user = await authRepository.createUserWithProfile({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role as 'CUSTOMER' | 'PROFESSIONAL',
      displayName: input.displayName,
      businessName: input.businessName,
    });

    return issueSession(user);
  },

  async login(input: LoginInput): Promise<SessionResult> {
    const user = await authRepository.findUserByEmail(input.email);

    // Constant-ish work whether or not the user exists — no enumeration, no timing oracle.
    const passwordOk = user
      ? await verifyPassword(user.passwordHash, input.password)
      : await verifyPassword(
          '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000',
          input.password,
        );

    if (!user || !passwordOk) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new UnauthorizedError('This account has been suspended. Please contact support.');
    }
    if (user.accountStatus === AccountStatus.DEACTIVATED) {
      throw new UnauthorizedError('This account is no longer active.');
    }

    return issueSession(user);
  },

  async refresh(rawToken: string): Promise<SessionResult> {
    const hash = hashRefreshToken(rawToken);
    const record = await authRepository.findRefreshToken(hash);

    if (!record) throw new UnauthorizedError('Your session has expired. Please sign in again.');

    // Reuse of an already-rotated token means the token leaked. Burn the whole family.
    if (record.revokedAt) {
      await authRepository.revokeAllUserTokens(record.userId);
      throw new UnauthorizedError('Your session is no longer valid. Please sign in again.');
    }

    if (record.expiresAt < new Date()) {
      await authRepository.revokeRefreshToken(record.id);
      throw new UnauthorizedError('Your session has expired. Please sign in again.');
    }

    const user = await authRepository.findUserById(record.userId);
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      await authRepository.revokeRefreshToken(record.id);
      throw new UnauthorizedError('Your session is no longer valid. Please sign in again.');
    }

    await authRepository.revokeRefreshToken(record.id);
    return issueSession(user);
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const record = await authRepository.findRefreshToken(hashRefreshToken(rawToken));
    if (record && !record.revokedAt) {
      await authRepository.revokeRefreshToken(record.id);
    }
  },

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    return toPublicUser(user);
  },
};