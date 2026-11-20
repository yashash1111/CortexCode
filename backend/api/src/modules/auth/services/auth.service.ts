import crypto from 'crypto';
import prisma from '../../../config/prisma';
import { hashPassword, verifyPassword } from '../../../shared/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../shared/utils/jwt';

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  public static resetTokens = new Map<string, string>();

  static async register(data: { name: string; email: string; password: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  static async login(data: { email: string; password: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password.');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  static async refreshSession(token: string) {
    const payload = verifyRefreshToken(token);
    const user = await this.getUserById(payload.userId);
    if (!user) throw new Error('User not found');

    const tokenHash = hashRefreshToken(token);
    const matched = await prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!matched) {
      throw new Error('Invalid or revoked refresh token.');
    }

    // Rotate refresh token
    await prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(newRefreshToken),
        expiresAt,
      },
    });

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async updatePasswordByEmail(email: string, hashedPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash: hashedPassword },
    });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new Error('User account not found.');
    }

    const isValidCurrent = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw new Error('Current password is incorrect.');
    }

    const newHashedPassword = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHashedPassword },
    });

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }
}
