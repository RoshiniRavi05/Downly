import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService.js';
import { providerRegistry } from '../providers/ProviderRegistry.js';
import { validateAndSanitizeUrl } from '../middleware/security.js';

export async function createDownloadTokenController(req: Request, res: Response, next: NextFunction) {
  try {
    const { mediaId, formatId, platform, originalUrl } = req.body || {};

    if (!mediaId || !formatId || !originalUrl) {
      const err: any = new Error('Missing required parameters');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      throw err;
    }

    // Validate original URL
    const validation = validateAndSanitizeUrl(originalUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      const err: any = new Error('Invalid URL');
      err.code = 'INVALID_URL';
      err.statusCode = 400;
      throw err;
    }

    const { token, expiresIn } = tokenService.generateToken(
      String(mediaId),
      String(formatId),
      platform || 'youtube',
      validation.normalizedUrl
    );

    res.json({
      success: true,
      token,
      expiresIn,
      streamUrl: `/api/stream/${token}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function streamMediaController(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenStr = req.params.token;
    if (!tokenStr) {
      const err: any = new Error('Token required');
      err.code = 'INVALID_TOKEN';
      err.statusCode = 400;
      throw err;
    }

    // Verify token
    let payload;
    try {
      payload = tokenService.verifyToken(tokenStr);
    } catch (e: any) {
      const err: any = new Error('Invalid or expired download token');
      err.code = e.code || 'INVALID_TOKEN';
      err.statusCode = 403;
      throw err;
    }

    const { mediaId, formatId, originalUrl } = payload;

    // Route to provider
    const provider = providerRegistry.getProviderForUrl(originalUrl);

    // Request stream
    const result = await provider.getDownloadStream(mediaId, formatId, originalUrl);

    // Set streaming headers
    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (result.contentLength) {
      res.setHeader('Content-Length', result.contentLength.toString());
    }

    // Handle client disconnect / abort cleanly
    req.on('close', () => {
      if ('destroy' in result.stream && typeof (result.stream as any).destroy === 'function') {
        (result.stream as any).destroy();
      }
    });

    // Pipe media stream to Express response
    result.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}
