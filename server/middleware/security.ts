import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config/index.js';

/**
 * Validates whether a URL string is safe, well-formed, and strictly on our domain allowlist.
 * Protects against SSRF, internal IP addresses, local files, and unsupported protocols.
 */
export function validateAndSanitizeUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; errorReason?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, errorReason: 'INVALID_URL' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, errorReason: 'INVALID_URL' };
  }

  // Reject dangerous schemes or malformed protocols before URL parsing
  if (/^(file|ftp|data|javascript|blob|gopher|mailto):/i.test(trimmed)) {
    return { valid: false, errorReason: 'INVALID_URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, errorReason: 'INVALID_URL' };
  }

  // Enforce HTTP / HTTPS protocol only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, errorReason: 'INVALID_URL' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF Protection: Reject IP addresses (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 0.0.0.0, ::1)
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, errorReason: 'INVALID_URL' };
  }

  // Domain allowlist check
  const isAllowedDomain = CONFIG.ALLOWED_DOMAINS.some((allowed) => {
    return hostname === allowed || hostname.endsWith('.' + allowed);
  });

  if (!isAllowedDomain) {
    return { valid: false, errorReason: 'UNSUPPORTED_PLATFORM' };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
  };
}

/**
 * Express Error Handler Middleware.
 * Prevents stack traces, environment variables, or secret leaks to clients.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] Handler caught:`, err?.message || err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'SERVER_ERROR';
  
  const userMessages: Record<string, string> = {
    INVALID_URL: "That doesn't look like a valid link. Please check the URL and try again.",
    UNSUPPORTED_PLATFORM: "This platform isn't supported yet. Downly currently supports Instagram and YouTube.",
    PRIVATE_CONTENT: "This content appears to be private or restricted. Downly only processes publicly accessible media.",
    CONTENT_UNAVAILABLE: "We couldn't access this media right now. It may have been deleted or removed.",
    PROVIDER_UNAVAILABLE: "Media processing is currently unavailable. Please try again later.",
    RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
    DOWNLOAD_FAILED: "The download could not be completed. Please try selecting another quality format.",
    TIMEOUT: "Processing timed out. Please try again.",
    SERVER_ERROR: "Something went wrong while processing your request. Please try again later.",
  };

  const message = userMessages[errorCode] || userMessages.SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    code: errorCode,
    message,
  });
}
