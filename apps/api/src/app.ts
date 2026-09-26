import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env, corsOrigins } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(pinoHttp());

  app.get('/health', (_req, res) =>
    res.json({ data: { status: 'ok', env: env.NODE_ENV, time: new Date().toISOString() } }),
  );

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}