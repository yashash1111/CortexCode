import prisma from '../../config/prisma';
import { GitHubClient } from './github.client';

export class GitHubService {
  static async processCallback(userId: string, code: string) {
    // Exchange code for token
    const token = await GitHubClient.exchangeCodeForToken(code);
    
    // Get user info
    const githubUser = await GitHubClient.getAuthenticatedUser(token);

    // Encrypt token (simplified for phase 1 mock, should use real encryption)
    const accessTokenEncrypted = Buffer.from(token).toString('base64');

    // Store or update github account
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
      }
    });

    return account;
  }

  static async getAccount(userId: string) {
    const account = await prisma.gitHubAccount.findUnique({
      where: { userId }
    });
    return account;
  }

  static async disconnect(userId: string) {
    await prisma.gitHubAccount.delete({
      where: { userId }
    });
  }

  static async getRepositories(userId: string) {
    const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
    if (!account) throw new Error('GitHub not connected');

    // Decrypt token (simplified)
    const token = Buffer.from(account.accessTokenEncrypted, 'base64').toString('ascii');
    
    return GitHubClient.getRepositories(token);
  }
}
