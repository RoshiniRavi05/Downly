import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config/index';
import { errorHandler } from './middleware/security';
import { analyzeController } from './controllers/analyzeController';
import { createDownloadTokenController, streamMediaController } from './controllers/downloadController';

export const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allowed for frontend asset rendering
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (CONFIG.ALLOWED_ORIGINS.includes(origin) || CONFIG.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive CORS for serverless deployment
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate Limiters
const analyzeLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.RATE_LIMIT_ANALYZE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: "You're analyzing links too quickly. Please wait a moment and try again.",
  },
});

const downloadLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.RATE_LIMIT_DOWNLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: "Download request limit reached. Please wait a minute before downloading more media.",
  },
});

const streamLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.RATE_LIMIT_STREAM_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: "Streaming bandwidth rate limit exceeded. Please wait a moment.",
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Downly Media API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.post('/api/analyze', analyzeLimiter, analyzeController);
app.post('/api/download/token', downloadLimiter, createDownloadTokenController);
app.get('/api/stream/:token', streamLimiter, streamMediaController);

// Global Error Handler
app.use(errorHandler);

export default app;
