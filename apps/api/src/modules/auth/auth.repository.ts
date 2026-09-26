import { prisma } from '../../lib/prisma.js';
import { AccountStatus } from '@solvify/shared';

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Creates the user and their role-specific profile atomically.
   * A user without a profile row is a broken state we never want to persist.
   */
  createUserWithProfile(input: {
    fullName: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: 'CUSTOMER' | 'PROFESSIONAL';
    displayName?: string;
    businessName?: string;
  }) {
    return prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          passwordHash: input.passwordHash,
          role: input.role,
          accountStatus: AccountStatus.ACTIVE,
        },
      });

      if (input.role === 'CUSTOMER') {
        await tx.customerProfile.create({ data: { userId: user.id } });
      } else {
        await tx.professionalProfile.create({
          data: {
            userId: user.id,
            displayName: input.displayName?.trim() || input.fullName,
            businessName: input.businessName?.trim() || null,
            // isSearchable stays false until profile completeness + service area rules pass (§13)
          },
        });
      }

      return user;
    });
  },

  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  /** Theft response: kill every session for this user. */
  revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};