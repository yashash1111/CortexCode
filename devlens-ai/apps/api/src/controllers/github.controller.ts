import { Request, Response } from 'express';
import { GitHubClient } from '../services/github/github.client';
import { GitHubService } from '../services/github/github.service';
import { signOAuthState, verifyOAuthState } from '../utils/crypto';

export class GitHubController {
  static async connect(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }
      const state = signOAuthState(userId);
      const url = GitHubClient.getAuthUrl(state);
      return res.json({ success: true, data: { url } });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async callback(req: Request, res: Response) {
    const { code, state } = req.query;
    const appUrl = process.env.CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
      if (typeof code !== 'string' || typeof state !== 'string') {
        throw new Error('Missing OAuth code or state');
      }
      const { userId } = verifyOAuthState(state);
      await GitHubService.processCallback(userId, code);
      res.redirect(`${appUrl}/settings/github?success=true`);
    } catch (error: any) {
      res.redirect(`${appUrl}/settings/github?error=${encodeURIComponent(error.message || 'OAuth failed')}`);
    }
  }

  static async account(req: Request, res: Response) {
    try {
      const account = await GitHubService.getAccount(req.user!.userId);
      res.json({ success: true, data: account });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async disconnect(req: Request, res: Response) {
    try {
      await GitHubService.disconnect(req.user!.userId);
      res.json({ success: true, data: { message: 'Disconnected successfully' } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async repositories(req: Request, res: Response) {
    try {
      const repos = await GitHubService.getRepositories(req.user!.userId);
      res.json({ success: true, data: repos });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }
}
