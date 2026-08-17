import prisma from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

// In-memory fallback user registry for development when database is offline
const inMemoryUsers = new Map<string, any>();

export class AuthService {
  public static resetTokens = new Map<string, string>();

  static async register(data: { name: string; email: string; password: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if account already exists
    let existingUser: any = null;
    try {
      existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    } catch {
      existingUser = inMemoryUsers.get(normalizedEmail);
    }

    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    const hashedPassword = await hashPassword(data.password);
    let user: any = null;

    try {
      user = await prisma.user.create({
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          passwordHash: hashedPassword
        }
      });
    } catch (dbError) {
      // Fallback to memory store if DB is unavailable
      const userId = 'usr_' + Date.now();
      user = {
        id: userId,
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryUsers.set(userId, user);
      inMemoryUsers.set(normalizedEmail, user);
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: await hashPassword(refreshToken),
          expiresAt
        }
      });
    } catch { /* ignore db offline */ }

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  static async login(data: { email: string; password: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    let user: any = null;

    try {
      user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    } catch {
      user = inMemoryUsers.get(normalizedEmail);
    }

    if (!user) {
      user = inMemoryUsers.get(normalizedEmail);
    }

    // Generic error to prevent user enumeration
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password.');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: await hashPassword(refreshToken),
          expiresAt
        }
      });
    } catch { /* ignore db offline */ }

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  static async getUserById(id: string) {
    let user: any = null;
    try {
      user = await prisma.user.findUnique({ where: { id } });
    } catch {
      user = inMemoryUsers.get(id);
    }

    if (!user) {
      user = inMemoryUsers.get(id);
    }

    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  static async refreshSession(token: string) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await this.getUserById(payload.userId);
      if (!user) throw new Error('User not found');

      const newAccessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new Error('Invalid or expired refresh token.');
    }
  }

  static async updatePasswordByEmail(email: string, hashedPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const inMemoryUser = inMemoryUsers.get(normalizedEmail);
    if (inMemoryUser) {
      inMemoryUser.passwordHash = hashedPassword;
      inMemoryUsers.set(normalizedEmail, inMemoryUser);
      if (inMemoryUser.id) inMemoryUsers.set(inMemoryUser.id, inMemoryUser);
    }

    try {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { passwordHash: hashedPassword }
      });
    } catch { /* ignore */ }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    let user: any = null;
    try {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } catch {
      user = inMemoryUsers.get(userId);
    }

    if (!user) {
      user = inMemoryUsers.get(userId);
    }

    if (!user || !user.passwordHash) {
      throw new Error('User account not found.');
    }

    const isValidCurrent = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw new Error('Current password is incorrect.');
    }

    const newHashedPassword = await hashPassword(newPassword);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHashedPassword }
      });
    } catch {
      user.passwordHash = newHashedPassword;
      inMemoryUsers.set(userId, user);
      if (user.email) inMemoryUsers.set(user.email, user);
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
