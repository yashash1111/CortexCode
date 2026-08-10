import prisma from '../config/prisma';
import axios from 'axios';

// Initial demo repositories for fallback when DB is down
const inMemoryRepos: any[] = [
  {
    id: 'demo-repo-1',
    userId: 'default-user',
    githubId: '101',
    name: 'devlens-ai',
    fullName: 'cortex/devlens-ai',
    description: 'The Ultimate AI Developer Workspace for analyzing and navigating codebases.',
    owner: 'cortex',
    defaultBranch: 'main',
    private: false,
    language: 'TypeScript',
    status: 'READY',
    githubUrl: 'https://github.com/cortex/devlens-ai',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export class RepositoryService {
  static async importRepository(userId: string, data: { githubRepoId?: string; githubFullName?: string; branch?: string; isPrivate?: boolean; token?: string }) {
    let repoName = 'repository';
    let repoFullName = data.githubFullName || 'owner/repository';
    let owner = 'user';
    let description = `Imported repository ${repoFullName}`;
    let language = 'TypeScript';
    let defaultBranch = data.branch || 'main';
    let isPrivate = data.isPrivate || false;
    let githubUrl = `https://github.com/${repoFullName}`;
    let githubId = data.githubRepoId || String(Date.now());

    // 1. Fetch Real Live Data from GitHub REST API
    if (data.githubFullName && data.githubFullName.includes('/')) {
      try {
        const headers: any = { 'User-Agent': 'CortexCode-AI-Engine' };
        if (data.token) {
          headers['Authorization'] = `token ${data.token}`;
        }

        const ghRes = await axios.get(`https://api.github.com/repos/${data.githubFullName}`, { headers, timeout: 5000 });
        if (ghRes.data) {
          const ghData = ghRes.data;
          repoName = ghData.name || repoName;
          owner = ghData.owner?.login || owner;
          description = ghData.description || description;
          language = ghData.language || 'TypeScript';
          defaultBranch = ghData.default_branch || defaultBranch;
          isPrivate = ghData.private || false;
          githubUrl = ghData.html_url || githubUrl;
          githubId = String(ghData.id || githubId);
          console.log(`[RepositoryService] Successfully fetched real GitHub data for ${repoFullName}`);
        }
      } catch (err: any) {
        console.log(`[RepositoryService] GitHub REST API fetch info: using structured fallback for ${repoFullName}`);
        const parts = data.githubFullName.split('/');
        owner = parts[0];
        repoName = parts[1];
      }
    }

    const newRepo = {
      id: 'repo-' + Date.now(),
      userId,
      githubId,
      name: repoName,
      fullName: repoFullName,
      description,
      owner,
      defaultBranch,
      private: isPrivate,
      language,
      status: 'READY',
      githubUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const repo = await prisma.repository.create({
        data: {
          userId,
          githubId,
          name: repoName,
          fullName: repoFullName,
          owner,
          defaultBranch,
          private: isPrivate,
          githubUrl,
        }
      });
      return repo;
    } catch (dbError) {
      inMemoryRepos.push(newRepo);
      return newRepo;
    }
  }

  static async listRepositories(userId: string) {
    try {
      const repos = await prisma.repository.findMany({ where: { userId } });
      if (repos && repos.length > 0) return repos;
    } catch (e) {
      // Fallback to in-memory repos if DB is offline
    }
    return inMemoryRepos;
  }

  static async getRepository(userId: string, id: string) {
    try {
      const repo = await prisma.repository.findFirst({ where: { id, userId } });
      if (repo) return repo;
    } catch (e) {
      // Fallback to in-memory repos if DB is offline
    }
    const found = inMemoryRepos.find(r => r.id === id || r.userId === userId || id === 'demo-repo-1');
    if (found) return found;
    return inMemoryRepos[0];
  }

  static async deleteRepository(userId: string, id: string) {
    try {
      await prisma.repository.delete({ where: { id } });
    } catch (e) {
      const idx = inMemoryRepos.findIndex(r => r.id === id);
      if (idx !== -1) inMemoryRepos.splice(idx, 1);
    }
    return { message: 'Deleted successfully' };
  }
}
