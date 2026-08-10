export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  owner: {
    login: string;
  };
  default_branch: string;
  private: boolean;
  language: string;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
}
