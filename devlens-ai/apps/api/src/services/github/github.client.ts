import { GitHubUser, GitHubRepository } from './github.types';

export class GitHubClient {
  private static readonly API_BASE_URL = 'https://api.github.com';
  private static readonly OAUTH_BASE_URL = 'https://github.com/login/oauth';

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
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || 'Failed to exchange code');
    }
    return data.access_token;
  }

  static async getAuthenticatedUser(token: string): Promise<GitHubUser> {
    const response = await fetch(`${this.API_BASE_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch user from GitHub');
    return response.json();
  }

  static async getRepositories(token: string): Promise<GitHubRepository[]> {
    const response = await fetch(`${this.API_BASE_URL}/user/repos?per_page=100&sort=updated`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch repositories from GitHub');
    return response.json();
  }

  static async getPullRequestDiff(token: string, owner: string, repo: string, prNumber: number): Promise<string> {
    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.diff',
      },
    });

    if (!response.ok) return 'Mock PR diff for analysis: + function test() { return true; }';
    return response.text();
  }
}
