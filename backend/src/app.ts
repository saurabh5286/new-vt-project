import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import workspaceRoutes from './routes/workspace.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://new-vt-project-2.vercel.app',
  'https://new-vt-project-2.vercel.app/',
].filter(Boolean) as string[];
    
// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use(errorHandler);

export { app };
