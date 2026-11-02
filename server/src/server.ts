import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { config } from './config/index.js';
import { ensureDefaultAccounts } from './services/accountProvisionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve Client Static Build in Production (Local Node Server)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // In development when client runs via Vite on port 3000
      res.status(200).send('LogiBill ERP Backend API is running on port ' + config.port + '. Frontend runs on port 3000.');
    }
  });
});

// Always export default app for serverless / Vercel deployment
export default app;

if (!process.env.VERCEL) {
  app.listen(config.port, '0.0.0.0', async () => {
    await ensureDefaultAccounts();
    console.log(`🚀 LogiBill ERP Server running on http://localhost:${config.port}`);
    console.log(`📡 GST Integration: ${config.gst.isMock ? 'MOCK SANDBOX' : 'LIVE GSP'}`);
    console.log(`💬 WhatsApp Integration: ${config.whatsapp.isMock ? 'MOCK SANDBOX' : 'LIVE CLOUD API'}`);
  });
}
