import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { ok } from './utils/apiResponse.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import callRoutes from './routes/callRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        // Strip trailing slashes to prevent browser CORS mismatch (e.g. 'https://domain.com/' vs 'https://domain.com')
        const cleanOrigin = origin.replace(/\/+$/, '');
        return callback(null, cleanOrigin);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  // Global rate limiter
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/', (req, res) => {
    import('mongoose').then(({ default: mongoose }) => {
      const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
      res.json({
        success: true,
        message: 'VartaLaab Realtime Backend Server is online & running!',
        database: dbStatus,
        clientUrl: env.clientUrl,
        apiHealth: `${req.protocol}://${req.get('host')}/api/health`,
      });
    });
  });

  app.get('/api/health', (req, res) => {
    import('mongoose').then(({ default: mongoose }) => {
      const isConnected = mongoose.connection.readyState === 1;
      ok(res, { status: isConnected ? 'ok' : 'db_disconnected', time: new Date().toISOString() });
    });
  });

  // DB Readiness middleware
  app.use(['/api', '/auth', '/users', '/conversations', '/stories', '/calls', '/upload'], (req, res, next) => {
    import('mongoose').then(({ default: mongoose }) => {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Database is currently offline. Please whitelist your IP in MongoDB Atlas (0.0.0.0/0) or start local MongoDB service.',
        });
      }
      next();
    });
  });

  // Feature routes (mounted on /api and non-api fallbacks for safety)
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/users', userRoutes);
  app.use('/users', userRoutes);

  app.use('/api/conversations', conversationRoutes);
  app.use('/conversations', conversationRoutes);

  app.use('/api/stories', storyRoutes);
  app.use('/stories', storyRoutes);

  app.use('/api/calls', callRoutes);
  app.use('/calls', callRoutes);

  app.use('/api/upload', uploadRoutes);
  app.use('/upload', uploadRoutes);

  app.use('/api', messageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
