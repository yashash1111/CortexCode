import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import prisma from './config/prisma';
import { checkRedisHealth } from './config/redis';
import { AIClient } from './modules/ai/services/ai.client';
import { AIGateway } from './modules/ai/services/aiGateway';
import { apiRateLimiter } from './middleware/rateLimit.middleware';

import authRoutes from './modules/auth/routes/auth.routes';
import githubRoutes from './modules/github/routes/github.routes';
import repositoryRoutes from './modules/repositories/routes/repository.routes';
import aiRoutes from './modules/ai/routes/ai.routes';
import webhookRoutes from './modules/github/routes/webhook.routes';
import conversationRoutes from './modules/chat/routes/conversation.routes';
import uploadRoutes from './modules/docs/routes/upload.routes';
import workspaceRoutes from './modules/workspaces/routes/workspace.routes';
import demoRoutes from './modules/chat/routes/demo.routes';
import assessmentRoutes from './modules/assessments/routes/assessment.routes';
import chatRoutes from './modules/chat/routes/chat.routes';
import jobsRoutes from './modules/observability/routes/jobs.routes';
import docsRoutes from './modules/docs/routes/docs.routes';
import githubIntelRoutes from './modules/github/routes/githubIntel.routes';
import adminAiRoutes from './modules/admin/routes/adminAi.routes';
import mockInterviewRoutes from './modules/mock-interviews/routes/mockInterview.routes';
import profileRoutes from './modules/profile/routes/profile.routes';

const app: Application = express();

// Security Middleware
app.use(helmet());
app.use(cookieParser() as any);
app.use(express.json({ limit: '1mb' }));

// Strict CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://cortexcode-web.onrender.com',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server) or explicitly allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Global API rate limiting
app.use('/api', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/repositories/:id/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/github-intel', githubIntelRoutes);
app.use('/api/admin/ai-providers', adminAiRoutes);
app.use('/api/mock-interviews', mockInterviewRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/profile', profileRoutes);

// Real Health Check
app.get('/health', async (req: Request, res: Response) => {
  const [dbOk, redisOk, aiServiceOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    checkRedisHealth(),
    AIClient.health(),
  ]);

  const allHealthy = dbOk && redisOk;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    providers: AIGateway.getConfiguredProviders(),
    services: {
      api: 'healthy',
      database: dbOk ? 'healthy' : 'unhealthy',
      redis: redisOk ? 'healthy' : 'unhealthy',
      aiService: aiServiceOk ? 'healthy' : 'unreachable',
    },
  });
});

// Safe Global Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || (err.message?.startsWith('CORS') ? 403 : 500);
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(status).json({ success: false, error: { message } });
});

export default app;
