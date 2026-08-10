import { Request, Response } from 'express';
import { RepositoryService } from '../services/repository.service';

export class RepositoryController {
  static async import(req: Request, res: Response) {
    try {
      const { githubRepoId, githubFullName } = req.body;
      const repo = await RepositoryService.importRepository(req.user!.userId, { githubRepoId, githubFullName });
      res.status(201).json({ success: true, data: repo });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const repos = await RepositoryService.listRepositories(req.user!.userId);
      res.json({ success: true, data: repos });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const repo = await RepositoryService.getRepository(req.user!.userId, req.params.id);
      res.json({ success: true, data: repo });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { message: error.message } });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const result = await RepositoryService.deleteRepository(req.user!.userId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { message: error.message } });
    }
  }
}
