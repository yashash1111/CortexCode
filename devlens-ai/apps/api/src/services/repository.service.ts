import prisma from '../config/prisma';
import axios from 'axios';

export class RepositoryService {
  static async importRepository(
    userId: string,
    data: {
      githubRepoId?: string;
      githubFullName?: string;
      branch?: string;
      isPrivate?: boolean;
      token?: string;
      workspaceId?: string;
    }
  ) {
    if (!data.githubFullName || !data.githubFullName.includes('/')) {
      throw new Error('Valid githubFullName (owner/repo) is required');
    }

    if (data.workspaceId) {
      const ws = await prisma.workspace.findFirst({ where: { id: data.workspaceId, userId } });
      if (!ws) throw new Error('Workspace not found or access denied');
    }

    const headers: Record<string, string> = { 'User-Agent': 'CortexCode-AI-Engine' };
    if (data.token) {
      headers['Authorization'] = `token ${data.token}`;
    }

    const ghRes = await axios.get(`https://api.github.com/repos/${data.githubFullName}`, {
      headers,
      timeout: 8000,
    });
    const ghData = ghRes.data;
    if (!ghData || !ghData.id) {
      throw new Error(`Failed to fetch repository metadata from GitHub for ${data.githubFullName}`);
    }

    const githubId = String(ghData.id);
    const existing = await prisma.repository.findUnique({ where: { githubId } });
    if (existing) {
      if (existing.userId !== userId) {
        throw new Error('Repository is already imported by another user');
      }
      return existing;
    }

    return prisma.repository.create({
      data: {
        userId,
        workspaceId: data.workspaceId || null,
        githubId,
        name: ghData.name,
        fullName: ghData.full_name || data.githubFullName,
        description: ghData.description || null,
        owner: ghData.owner?.login || data.githubFullName.split('/')[0],
        defaultBranch: ghData.default_branch || data.branch || 'main',
        private: Boolean(ghData.private ?? data.isPrivate),
        language: ghData.language || null,
        stars: Number(ghData.stargazers_count || 0),
        forks: Number(ghData.forks_count || 0),
        githubUrl: ghData.html_url || `https://github.com/${data.githubFullName}`,
      },
    });
  }

  static async listRepositories(userId: string) {
    return prisma.repository.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async getRepository(userId: string, id: string) {
    const repo = await prisma.repository.findFirst({
      where: { id, userId },
    });
    if (!repo) {
      throw new Error('Repository not found or access denied');
    }
    return repo;
  }

  static async deleteRepository(userId: string, id: string) {
    const repo = await prisma.repository.findFirst({
      where: { id, userId },
    });
    if (!repo) {
      throw new Error('Repository not found or access denied');
    }
    await prisma.repository.delete({ where: { id } });
    return { message: 'Deleted successfully' };
  }
}
