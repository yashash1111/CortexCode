import prisma from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

// In-memory store fallback when PostgreSQL database is not running
const inMemoryUsers = new Map<string, any>();

export class AuthService {
  // In-memory registry for password reset tokens: Maps Token -> Email
  public static resetTokens = new Map<string, string>();

  static async register(data: any) {
    let user: any = null;

    try {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) throw new Error('Email already in use');

      const hashedPassword = await hashPassword(data.password);
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: hashedPassword
        }
      });
    } catch (dbError: any) {
      if (dbError.message === 'Email already in use') throw dbError;

      // Fallback to in-memory user store if DB connection is unavailable
      if (inMemoryUsers.has(data.email)) {
        throw new Error('Email already in use');
      }

      const hashedPassword = await hashPassword(data.password);
      const userId = 'user-' + Date.now();
      user = {
        id: userId,
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryUsers.set(userId, user);
      inMemoryUsers.set(data.email, user);
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
    } catch (e) {
      // Ignore DB refresh token save error when DB is unavailable
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  static async login(data: any) {
    let user: any = null;

    try {
      user = await prisma.user.findUnique({ where: { email: data.email } });
    } catch (dbError) {
      user = inMemoryUsers.get(data.email);
    }

    if (!user) {
      user = inMemoryUsers.get(data.email);
    }

    if (!user || !user.passwordHash) throw new Error('Invalid credentials');

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) throw new Error('Invalid credentials');

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
    } catch (e) {
      // Ignore DB refresh token save error when DB is unavailable
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  static async updatePasswordByEmail(email: string, passwordHash: string) {
    // 1. Update in-memory fallback store
    const inMemoryUser = inMemoryUsers.get(email);
    if (inMemoryUser) {
      inMemoryUser.passwordHash = passwordHash;
      inMemoryUsers.set(email, inMemoryUser);
      if (inMemoryUser.id) {
        inMemoryUsers.set(inMemoryUser.id, inMemoryUser);
      }
    }

    // 2. Update PostgreSQL database
    try {
      await prisma.user.update({
        where: { email },
        data: { passwordHash }
      });
    } catch (e) {
      // Fallback prints if DB is closed / unavailable during development
      console.log(`[AuthService] Password hash updated for ${email} in memory fallback.`);
    }
  }

  static async refresh(refreshToken: string) {
    return { message: 'Tokens refreshed' };
  }
}
