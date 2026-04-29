import { prisma } from '../../config/db.js';

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  }
};

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: userInclude });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: userInclude });
  }

  createRefreshToken(input: { tokenHash: string; userId: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data: input });
  }

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  revokeRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  createPasswordResetToken(input: { tokenHash: string; userId: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data: input });
  }

  findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { include: userInclude } } });
  }

  markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
