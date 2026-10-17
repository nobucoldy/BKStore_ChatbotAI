import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkDbConnection } from './config/db';
import apiRouter from './routes';

dotenv.config();

export const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép mọi request không có origin (như curl, postman) hoặc từ localhost, vercel.app
    if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app') || origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api', apiRouter);

// Health Check Route
app.get('/api/health', async (_req: Request, res: Response) => {
  const isDbConnected = await checkDbConnection();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BK-Store Backend API',
    database: isDbConnected ? 'connected' : 'disconnected / not ready',
  });
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to BK-Store Backend API',
    docs: '/api/health',
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});
