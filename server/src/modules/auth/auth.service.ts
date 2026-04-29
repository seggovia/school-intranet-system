import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http-error.js';
import { AuthRepository } from './auth.repository.js';
import { EmailService } from './email.service.js';
import type { JwtUser, PublicUser } from './auth.types.js';

const repository = new AuthRepository();
const emailService = new EmailService();
const resetTokenMinutes = 30;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toPublicUser(user: NonNullable<Awaited<ReturnType<AuthRepository['findUserByEmail']>>>): PublicUser {
  const roles = user.roles.map((item) => item.role.name);
  const permissions = [...new Set(user.roles.flatMap((item) => item.role.permissions.map((permission) => permission.permission.key)))];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    department: user.department,
    roles,
    primaryRole: roles[0] ?? 'student',
    permissions
  };
}

function signAccessToken(payload: JwtUser) {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

function signRefreshToken(userId: string) {
  const options: SignOptions = { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, options);
}

export class AuthService {
  async login(email: string, password: string) {
    const user = await repository.findUserByEmail(email);
    if (!user) {
      throw new HttpError(401, 'Correo o contraseña incorrectos');
    }

    if (!user.isActive) {
      throw new HttpError(403, 'Usuario desactivado. Contacte administración.');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      console.warn(`Login fallido para ${email}`);
      throw new HttpError(401, 'Correo o contraseña incorrectos');
    }

    const publicUser = toPublicUser(user);
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      roles: publicUser.roles,
      permissions: publicUser.permissions
    });
    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await repository.createRefreshToken({ tokenHash: hashToken(refreshToken), userId: user.id, expiresAt });
    console.info(`Login exitoso para ${email}`);

    return { user: publicUser, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, 'Refresh token invalido.');
    }

    const stored = await repository.findRefreshToken(hashToken(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new HttpError(401, 'Refresh token expirado o revocado.');
    }

    const user = await repository.findUserById(String(decoded.sub));
    if (!user || !user.isActive) {
      throw new HttpError(401, 'Usuario no disponible.');
    }

    await repository.revokeRefreshToken(hashToken(refreshToken));

    const publicUser = toPublicUser(user);
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      roles: publicUser.roles,
      permissions: publicUser.permissions
    });
    const nextRefreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await repository.createRefreshToken({ tokenHash: hashToken(nextRefreshToken), userId: user.id, expiresAt });

    return { user: publicUser, accessToken, refreshToken: nextRefreshToken };
  }

  async logout(refreshToken: string) {
    await repository.revokeRefreshToken(hashToken(refreshToken));
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const safeResponse: { message: string; resetUrl?: string } = {
      message: 'Si el correo existe, enviaremos instrucciones para restablecer la contraseña.'
    };
    const user = await repository.findUserByEmail(email);
    if (!user || !user.isActive) return safeResponse;

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + resetTokenMinutes * 60 * 1000);
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;

    await repository.createPasswordResetToken({ tokenHash, userId: user.id, expiresAt });
    await emailService.sendPasswordReset({ to: user.email, name: user.name, resetUrl });

    if (env.NODE_ENV !== 'production') return { ...safeResponse, resetUrl };
    return safeResponse;
  }

  async resetPassword(input: { token: string; password: string }) {
    const tokenHash = hashToken(input.token);
    const stored = await repository.findPasswordResetToken(tokenHash);
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new HttpError(400, 'El enlace de restablecimiento es invalido o expiro.');
    }
    if (!stored.user.isActive) throw new HttpError(403, 'Usuario no disponible.');

    await repository.updateUserPassword(stored.userId, await bcrypt.hash(input.password, 12));
    await repository.markPasswordResetTokenUsed(stored.id);
    await repository.revokeRefreshTokensForUser(stored.userId);

    return { ok: true, message: 'Contraseña actualizada correctamente.' };
  }
}
