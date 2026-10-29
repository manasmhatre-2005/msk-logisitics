import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'logibill-super-secret-jwt-key-2026',
  environment: process.env.NODE_ENV || 'development',
  
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
