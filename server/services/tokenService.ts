import crypto from 'crypto';
import { CONFIG } from '../config/index.js';
import { DownloadTokenPayload, PlatformType } from '../types/index.js';

export class TokenService {
  /**
   * Generates a signed, short-lived download token payload.
   */
  public generateToken(
    mediaId: string,
    formatId: string,
    platform: PlatformType,
    originalUrl: string,
    ttlSeconds: number = CONFIG.TEMP_FILE_TTL_SEC
  ): { token: string; expiresIn: number } {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload: DownloadTokenPayload = {
      mediaId,
      formatId,
      platform,
      originalUrl,
      exp,
    };

    const json = JSON.stringify(payload);
    const base64Payload = Buffer.from(json, 'utf8').toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', CONFIG.TOKEN_SECRET)
      .update(base64Payload)
      .digest('base64url');

    const token = `${base64Payload}.${signature}`;

    return {
      token,
      expiresIn: ttlSeconds,
    };
  }

  /**
   * Verifies and decodes a signed download token.
   * Throws an error if expired, tampered, or invalid.
   */
  public verifyToken(token: string): DownloadTokenPayload {
    if (!token || typeof token !== 'string') {
      const err: any = new Error('Missing token');
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      const err: any = new Error('Malformed token');
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    const [base64Payload, signature] = parts;

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.TOKEN_SECRET)
      .update(base64Payload)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const err: any = new Error('Invalid token signature');
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    let payload: DownloadTokenPayload;
    try {
      const json = Buffer.from(base64Payload, 'base64url').toString('utf8');
      payload = JSON.parse(json);
    } catch {
      const err: any = new Error('Corrupt token payload');
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    // Check expiration
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      const err: any = new Error('Download token expired');
      err.code = 'EXPIRED_TOKEN';
      throw err;
    }

    return payload;
  }
}

export const tokenService = new TokenService();
