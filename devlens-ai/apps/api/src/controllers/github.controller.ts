import { Request, Response } from 'express';
import { GitHubClient } from '../services/github/github.client';
import { GitHubService } from '../services/github/github.service';

export class GitHubController {
  static async connect(req: Request, res: Response) {
    // Generate a secure state token ideally
    const state = Buffer.from(JSON.stringify({ userId: req.user?.userId })).toString('base64');
    const url = GitHubClient.getAuthUrl(state);
    res.json({ success: true, data: { url } });
  }

  static async callback(req: Request, res: Response) {
    const { code, state } = req.query;
    
    try {
      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('ascii'));
      const userId = decodedState.userId;
      
      if (!userId) throw new Error('Invalid state');

      await GitHubService.processCallback(userId, code as string);
      
      // Redirect back to frontend
      res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/github?success=true`);
    } catch (error: any) {
      res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/github?error=${encodeURIComponent(error.message)}`);
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
