import prisma from '../../config/prisma';
import { GitHubClient } from './github.client';
import { encryptToken, decryptToken } from '../../utils/crypto';

export class GitHubService {
  static async processCallback(userId: string, code: string) {
    const token = await GitHubClient.exchangeCodeForToken(code);
    const githubUser = await GitHubClient.getAuthenticatedUser(token);
    const accessTokenEncrypted = encryptToken(token);

    const account = await prisma.gitHubAccount.upsert({
      where: { userId },
      update: {
        githubUserId: githubUser.id.toString(),
        username: githubUser.login,
        accessTokenEncrypted,
        avatarUrl: githubUser.avatar_url,
      },
      create: {
        userId,
        githubUserId: githubUser.id.toString(),
        username: githubUser.login,
        accessTokenEncrypted,
        avatarUrl: githubUser.avatar_url,
      },
      select: {
        id: true,
        userId: true,
        githubUserId: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return account;
  }

  static async getAccount(userId: string) {
    return prisma.gitHubAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        githubUserId: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async disconnect(userId: string) {
    await prisma.gitHubAccount.delete({
      where: { userId },
    });
  }

  static async getRepositories(userId: string) {
    const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
    if (!account) throw new Error('GitHub not connected');

    const token = decryptToken(account.accessTokenEncrypted);
    return GitHubClient.getRepositories(token);
  }
}
