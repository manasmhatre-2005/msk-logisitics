import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import apiRouter from './routes/api.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Serve static images & assets
app.use('/images', express.static(path.resolve(__dirname, '../public/images')));
app.use('/assets', express.static(path.resolve(__dirname, '../assets')));

// Health Check Handler
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ONLINE',
    app: 'LogiBill ERP',
    timestamp: new Date().toISOString(),
    gstMode: config.gst.isMock ? 'MOCK_SANDBOX' : 'LIVE_GSP',
    whatsappMode: config.whatsapp.isMock ? 'MOCK_SANDBOX' : 'LIVE_META_CLOUD_API',
    database: process.env.DATABASE_URL ? 'CONFIGURED' : 'NEEDS_DATABASE_URL',
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// API Routes mounted on both /api and / to handle Vercel rewrites seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
