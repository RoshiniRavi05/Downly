import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  
  TOKEN_SECRET: process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321',
  
  // Rate Limits
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 60000,
  RATE_LIMIT_ANALYZE_MAX: process.env.RATE_LIMIT_ANALYZE_MAX ? parseInt(process.env.RATE_LIMIT_ANALYZE_MAX, 10) : 20,
  RATE_LIMIT_DOWNLOAD_MAX: process.env.RATE_LIMIT_DOWNLOAD_MAX ? parseInt(process.env.RATE_LIMIT_DOWNLOAD_MAX, 10) : 15,
  RATE_LIMIT_STREAM_MAX: process.env.RATE_LIMIT_STREAM_MAX ? parseInt(process.env.RATE_LIMIT_STREAM_MAX, 10) : 40,
  
  // Storage & Limits
  MAX_FILE_SIZE_BYTES: (process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) : 500) * 1024 * 1024,
  TEMP_FILE_TTL_SEC: process.env.TEMP_FILE_TTL_SEC ? parseInt(process.env.TEMP_FILE_TTL_SEC, 10) : 300,
  PROCESSING_TIMEOUT_MS: process.env.PROCESSING_TIMEOUT_MS ? parseInt(process.env.PROCESSING_TIMEOUT_MS, 10) : 30000,

  // Allowed Domains for SSRF Protection
  ALLOWED_DOMAINS: [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'instagram.com',
    'www.instagram.com',
    'instagr.am',
  ],

  // Storage path
  TEMP_DIR: path.join(process.cwd(), 'temp_downloads'),
};
