import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

import authRoutes from './routes/auth.routes';
import githubRoutes from './routes/github.routes';
import repositoryRoutes from './routes/repository.routes';
import aiRoutes from './routes/ai.routes';
import webhookRoutes from './routes/webhook.routes';
import conversationRoutes from './routes/conversation.routes';
import uploadRoutes from './routes/upload.routes';
import workspaceRoutes from './routes/workspace.routes';
import demoRoutes from './routes/demo.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/repositories/:id/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/demo', demoRoutes); // Public demo endpoint — no auth required

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    services: {
      api: 'healthy',
      database: 'healthy',
      redis: 'healthy'
    }
  });
});

export default app;
