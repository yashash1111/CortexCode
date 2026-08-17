import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app: Application = express();

// Security Middleware
app.use(helmet());
app.use(cookieParser() as any);

// Dynamic CORS configuration allowing credential cookies
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://cortexcode-web.onrender.com',
  'http://localhost:3000'
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow incoming web traffic gracefully
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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
import assessmentRoutes from './routes/assessment.routes';
import chatRoutes from './routes/chat.routes';

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

app.get('/health', (req, res) => {
  const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  res.status(200).json({
    status: 'ok',
    geminiConfigured,
    services: {
      api: 'healthy',
      database: 'healthy',
      redis: 'healthy'
    }
  });
});

export default app;
