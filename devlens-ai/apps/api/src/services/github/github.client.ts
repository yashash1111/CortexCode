import { GitHubUser, GitHubRepository } from './github.types';

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubPRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export class GitHubClient {
  private static readonly API_BASE_URL = 'https://api.github.com';
  private static readonly OAUTH_BASE_URL = 'https://github.com/login/oauth';

  private static buildHeaders(token?: string, accept = 'application/vnd.github.v3+json') {
    const headers: Record<string, string> = {
      Accept: accept,
      'User-Agent': 'CortexCode-AI-Platform',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private static async handleResponse(response: Response, context: string) {
    if (!response.ok) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const errText = await response.text().catch(() => '');
      if (response.status === 403 && remaining === '0') {
        throw new Error(`GitHub API rate limit exceeded (${context}). Please try again later or connect GitHub OAuth.`);
      }
      throw new Error(`GitHub API error (${response.status}) during ${context}: ${errText.slice(0, 200)}`);
    }
  }

  static getAuthUrl(state: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    return `${this.OAUTH_BASE_URL}/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user&state=${state}`;
  }

  static async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    const response = await fetch(`${this.OAUTH_BASE_URL}/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || 'Failed to exchange code');
    }
    return data.access_token;
  }

  static async getAuthenticatedUser(token: string): Promise<GitHubUser> {
    const response = await fetch(`${this.API_BASE_URL}/user`, {
      headers: this.buildHeaders(token),
    });
    await this.handleResponse(response, 'getAuthenticatedUser');
    return response.json();
  }

  static async getRepositories(token: string): Promise<GitHubRepository[]> {
    const response = await fetch(`${this.API_BASE_URL}/user/repos?per_page=100&sort=updated`, {
      headers: this.buildHeaders(token),
    });
    await this.handleResponse(response, 'getRepositories');
    return response.json();
  }

  static async getRepository(owner: string, repo: string, token?: string): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}`, {
      headers: this.buildHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    await this.handleResponse(response, `getRepository(${owner}/${repo})`);
    return response.json();
  }

  static async listBranches(owner: string, repo: string, token?: string): Promise<Array<{ name: string }>> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/branches?per_page=50`, {
      headers: this.buildHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    await this.handleResponse(response, `listBranches(${owner}/${repo})`);
    return response.json();
  }

  static async getRecursiveTree(owner: string, repo: string, branch: string, token?: string): Promise<GitHubTreeItem[]> {
    const response = await fetch(
      `${this.API_BASE_URL}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      {
        headers: this.buildHeaders(token),
        signal: AbortSignal.timeout(15_000),
      }
    );
    await this.handleResponse(response, `getRecursiveTree(${owner}/${repo}@${branch})`);
    const data = await response.json();
    return Array.isArray(data.tree) ? data.tree : [];
  }

  static async getFileContent(owner: string, repo: string, filePath: string, ref: string, token?: string): Promise<string> {
    const response = await fetch(
      `${this.API_BASE_URL}/repos/${owner}/${repo}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`,
      {
        headers: this.buildHeaders(token),
        signal: AbortSignal.timeout(10_000),
      }
    );
    await this.handleResponse(response, `getFileContent(${filePath})`);
    const data = await response.json();
    if (data.encoding === 'base64' && typeof data.content === 'string') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    throw new Error(`Unsupported encoding for ${filePath}`);
  }

  static async getPullRequest(owner: string, repo: string, prNumber: number, token?: string): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: this.buildHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    await this.handleResponse(response, `getPullRequest(#${prNumber})`);
    return response.json();
  }

  static async getPullRequestFiles(owner: string, repo: string, prNumber: number, token?: string): Promise<GitHubPRFile[]> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`, {
      headers: this.buildHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    await this.handleResponse(response, `getPullRequestFiles(#${prNumber})`);
    return response.json();
  }

  static async getPullRequestDiff(token: string | undefined, owner: string, repo: string, prNumber: number): Promise<string> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: this.buildHeaders(token, 'application/vnd.github.v3.diff'),
      signal: AbortSignal.timeout(15_000),
    });
    await this.handleResponse(response, `getPullRequestDiff(#${prNumber})`);
    return response.text();
  }

  static async postPullRequestComment(
    token: string,
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
      signal: AbortSignal.timeout(10_000),
    });
    await this.handleResponse(response, `postPullRequestComment(#${prNumber})`);
    return response.json();
  }
}
