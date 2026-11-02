import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import apiRouter from './routes/api.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Vercel, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Enterprise HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:', 'http:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows static assets and PDFs
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  })
);

// Restricted CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin server requests)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (
        config.allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        (!config.isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1')))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Access denied for origin ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Secure JSON Body Parsing with reasonable payload boundaries
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global API Rate Limiter (300 requests per minute per IP)
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalApiLimiter);

// Strict Rate Limiting for Authentication (10 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/auth/login', authLimiter);

// Serve static images & assets with caching headers
app.use(
  '/images',
  express.static(path.resolve(__dirname, '../public/images'), {
    maxAge: config.isProduction ? '7d' : '1h',
    etag: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    },
  })
);
app.use(
  '/assets',
  express.static(path.resolve(__dirname, '../assets'), {
    maxAge: config.isProduction ? '7d' : '1h',
    etag: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    },
  })
);

// Health Check Handler (Safe public endpoint for uptime monitors)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ONLINE',
    app: 'MSK Logistic Solution ERP',
    timestamp: new Date().toISOString(),
    gstMode: config.gst.isMock ? 'MOCK_SANDBOX' : 'LIVE_GSP',
    whatsappMode: config.whatsapp.isMock ? 'MOCK_SANDBOX' : 'LIVE_META_CLOUD_API',
    database: process.env.DATABASE_URL ? 'CONFIGURED' : 'NEEDS_DATABASE_URL',
    environment: config.environment,
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// API Routes mounted on both /api and / to handle Vercel rewrites seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Centralized Production Error Handling Middleware (prevents stack trace leaks)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({ error: err.message });
  }
  return res.status(500).json({
    error: config.isProduction ? 'An unexpected server error occurred.' : err.message,
  });
});

export default app;
