import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService';
import { providerRegistry } from '../providers/ProviderRegistry';
import { validateAndSanitizeUrl } from '../middleware/security';

const isDev = process.env.NODE_ENV !== 'production';

function sanitizeFilename(filename: string): string {
  // Remove control characters, quotes, newlines, and illegal header characters
  return filename
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\\/:"*?<>|]/g, '_')
    .trim();
}

function buildContentDispositionHeader(rawFilename: string): string {
  const sanitized = sanitizeFilename(rawFilename);
  const asciiFallback = sanitized.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');
  const rfc5987Encoded = encodeURIComponent(sanitized);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987Encoded}`;
}

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

    if (isDev) {
      console.log(`[Downly Stream Log] Token generated for mediaId=${mediaId}, formatId=${formatId}, platform=${platform}`);
    }

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
  let isHeaderSent = false;
  let providerStream: any = null;

  try {
    const tokenStr = req.params.token;
    if (!tokenStr) {
      const err: any = new Error('Token required');
      err.code = 'INVALID_TOKEN';
      err.statusCode = 400;
      throw err;
    }

    // 1. Validate download token
    let payload;
    try {
      payload = tokenService.verifyToken(tokenStr);
    } catch (e: any) {
      if (isDev) {
        console.warn(`[Downly Stream Log] Token verification failed: ${e.message}`);
      }
      const err: any = new Error('Invalid or expired download token');
      err.code = e.code || 'INVALID_TOKEN';
      err.statusCode = 403;
      throw err;
    }

    const { mediaId, formatId, platform, originalUrl } = payload;

    if (isDev) {
      console.log(`[Downly Stream Log] Token validated. Route to provider for platform=${platform}, mediaId=${mediaId}, formatId=${formatId}`);
    }

    // 2. Select MediaProvider
    const provider = providerRegistry.getProviderForUrl(originalUrl);
    if (isDev) {
      console.log(`[Downly Stream Log] Provider selected: ${provider.id}`);
    }

    // 3. Resolve Media Stream
    const result = await provider.getDownloadStream(mediaId, formatId, originalUrl);
    providerStream = result.stream;

    if (!providerStream) {
      const err: any = new Error('The media provider did not return a valid media stream.');
      err.code = 'PROVIDER_STREAM_FAILED';
      err.statusCode = 502;
      throw err;
    }

    // Determine correct Content-Type matching media payload
    const isAudio = formatId.includes('audio') || formatId.includes('mp3');
    const isMp3 = formatId.includes('mp3');
    const computedMime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';
    const finalMimeType = result.mimeType && !result.mimeType.includes('octet-stream') ? result.mimeType : computedMime;

    // Build RFC 5987 Content-Disposition header
    const contentDisposition = buildContentDispositionHeader(result.filename);

    if (isDev) {
      console.log(`[Downly Stream Log] Stream ready. Mime=${finalMimeType}, Filename="${result.filename}", ContentLength=${result.contentLength || 'chunked'}`);
    }

    // 4. Register Stream Error Handlers BEFORE sending headers
    providerStream.on('error', (streamErr: any) => {
      console.error('[Downly Stream Error] Upstream provider stream error:', streamErr);
      if (!isHeaderSent && !res.headersSent) {
        return res.status(502).json({
          success: false,
          code: 'PROVIDER_STREAM_FAILED',
          message: 'Upstream server stream failed before transmission started.',
        });
      } else {
        // Destroy HTTP response to immediately abort browser download rather than sending zero bytes or corrupted data
        res.destroy(streamErr);
      }
    });

    // Handle Client Disconnect / Abort
    const cleanup = () => {
      if (providerStream && typeof providerStream.destroy === 'function' && !providerStream.destroyed) {
        if (isDev) console.log('[Downly Stream Log] Client disconnected. Aborting upstream stream.');
        providerStream.destroy();
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);

    // 5. Send HTTP Headers
    res.status(200);
    res.setHeader('Content-Type', finalMimeType);
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (result.contentLength && Number.isInteger(result.contentLength) && result.contentLength > 0) {
      res.setHeader('Content-Length', result.contentLength.toString());
    }

    isHeaderSent = true;

    if (isDev) {
      console.log(`[Downly Stream Log] HTTP 200 headers sent. Piping stream to Express response...`);
    }

    // 6. Pipe Media Stream to Response
    providerStream.pipe(res);

    providerStream.on('end', () => {
      if (isDev) console.log('[Downly Stream Log] Stream piping completed successfully.');
    });

  } catch (error) {
    if (providerStream && typeof providerStream.destroy === 'function' && !providerStream.destroyed) {
      providerStream.destroy();
    }
    next(error);
  }
}

