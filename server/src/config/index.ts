import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const defaultDevSecret = 'msk-dev-fallback-jwt-secret-do-not-use-in-production-2026';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be configured in production!');
  }
  jwtSecret = defaultDevSecret;
} else if (isProduction && jwtSecret === defaultDevSecret) {
  throw new Error('CRITICAL SECURITY ERROR: Default development JWT_SECRET cannot be used in production!');
}

// Allowed CORS origins (can be comma-separated list e.g. "https://msklogisticsolution.com,https://app.msklogisticsolution.com")
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'];

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret,
  environment: process.env.NODE_ENV || 'development',
  isProduction,
  allowedOrigins,
  
  // GST API Configuration
  gst: {
    baseUrl: process.env.GST_API_BASE_URL || 'https://api.mastergst.com',
    apiKey: process.env.GST_API_KEY || '',
    apiSecret: process.env.GST_API_SECRET || '',
    isMock: !process.env.GST_API_KEY,
  },

  // WhatsApp Business API Configuration
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'logibill_webhook_token_2026',
    isMock: !process.env.WHATSAPP_ACCESS_TOKEN,
  },
};
