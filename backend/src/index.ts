import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import ordersRouter from './routes/orders';
import botRouter from './routes/bot';

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: missing env variable ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '64kb' }));

// Глобальный лимит — защита от флуда на любой эндпоинт
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, подождите минуту' },
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/bot', express.raw({ type: 'application/pdf', limit: '15mb' }), botRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Global error handler — always return JSON, never leak stack traces
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});
