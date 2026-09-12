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

  if (isDev) console.log('=== [DOWNLOAD START] ===');

  try {
    const tokenStr = req.params.token;
    if (!tokenStr) {
      if (isDev) console.error('[STREAM ERROR] Download token required');
      const err: any = new Error('Token required');
      err.code = 'INVALID_TOKEN';
      err.statusCode = 400;
      throw err;
    }

    // Token validation
    let payload;
    try {
      payload = tokenService.verifyToken(tokenStr);
      if (isDev) console.log('[TOKEN VALID] true');
    } catch (e: any) {
      if (isDev) console.error(`[STREAM ERROR] Token validation failed: ${e.message}`);
      const err: any = new Error('Invalid or expired download token');
      err.code = e.code || 'INVALID_TOKEN';
      err.statusCode = 403;
      throw err;
    }

    const { mediaId, formatId, platform, originalUrl } = payload;

    // Provider identification
    const provider = providerRegistry.getProviderForUrl(originalUrl);
    if (isDev) {
      console.log(`[PROVIDER] ${provider.id}`);
      console.log(`[FORMAT] ${formatId}`);
      console.log(`[MEDIA RESOLUTION] mediaId=${mediaId}, platform=${platform}`);
    }

    // Media & Format validation
    if (!mediaId) {
      const err: any = new Error('Media ID missing');
      err.code = 'INVALID_MEDIA_ID';
      err.statusCode = 400;
      throw err;
    }
    if (!formatId) {
      const err: any = new Error('Format ID missing');
      err.code = 'INVALID_FORMAT_ID';
      err.statusCode = 400;
      throw err;
    }

    // Fresh Media Stream Request
    const result = await provider.getDownloadStream(mediaId, formatId, originalUrl);
    providerStream = result.stream;

    if (!providerStream) {
      if (isDev) console.error('[STREAM ERROR] Provider did not return stream');
      const err: any = new Error('This content cannot currently be processed by the media provider.');
      err.code = 'PROVIDER_UNAVAILABLE';
      err.statusCode = 502;
      throw err;
    }

    // Determine MIME type & validate upstream content type
    const isAudio = formatId.includes('audio') || formatId.includes('mp3');
    const isMp3 = formatId.includes('mp3');
    const computedMime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';
    const finalMimeType = result.mimeType && !result.mimeType.includes('octet-stream') ? result.mimeType : computedMime;

    // Validate upstream: Never send HTML or JSON error responses as MP4/media
    if (finalMimeType.includes('text/html') || finalMimeType.includes('application/json')) {
      if (isDev) console.error(`[STREAM ERROR] Upstream returned non-binary text: ${finalMimeType}`);
      const err: any = new Error('The media provider returned an invalid stream response.');
      err.code = 'INVALID_MEDIA_STREAM';
      err.statusCode = 502;
      throw err;
    }

    const contentDisposition = buildContentDispositionHeader(result.filename);

    if (isDev) {
      console.log('[UPSTREAM STATUS] 200 OK');
      console.log(`[UPSTREAM CONTENT-TYPE] ${finalMimeType}`);
      console.log('[STREAM STARTED]');
    }

    // Error handler BEFORE or AFTER sending headers
    providerStream.on('error', (streamErr: any) => {
      if (isDev) console.error(`[STREAM ERROR] Stream pipeline error: ${streamErr?.message}`);
      if (!isHeaderSent && !res.headersSent) {
        res.status(502).json({
          success: false,
          code: 'PROVIDER_STREAM_FAILED',
          message: 'Upstream server stream failed before transmission started.',
        });
      } else {
        res.destroy(streamErr);
      }
    });

    // Client disconnect & cleanup handler
    const cleanup = () => {
      if (providerStream && typeof providerStream.destroy === 'function' && !providerStream.destroyed) {
        providerStream.destroy();
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);

    res.status(200);
    res.setHeader('Content-Type', finalMimeType);
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Only set Content-Length if exact, positive integer is known
    if (result.contentLength && Number.isInteger(result.contentLength) && result.contentLength > 0) {
      res.setHeader('Content-Length', result.contentLength.toString());
    }

    isHeaderSent = true;

    let bytesTransferred = 0;
    let firstByteLogged = false;

    providerStream.on('data', (chunk: Buffer) => {
      bytesTransferred += chunk.length;
      if (!firstByteLogged) {
        firstByteLogged = true;
        if (isDev) console.log(`[FIRST BYTES RECEIVED] (${chunk.length} bytes)`);
      }
    });

    providerStream.pipe(res);

    providerStream.on('end', () => {
      if (isDev) console.log(`[STREAM COMPLETED] (${bytesTransferred} total bytes transferred)`);
    });

  } catch (error: any) {
    if (isDev) console.error(`[STREAM ERROR] ${error?.message}`);
    if (providerStream && typeof providerStream.destroy === 'function' && !providerStream.destroyed) {
      providerStream.destroy();
    }
    next(error);
  }
}

