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

  if (isDev) console.log('[1] Download request received');

  try {
    const tokenStr = req.params.token;
    if (!tokenStr) {
      console.error('ERROR STAGE: [2] Token validation\nERROR CODE: INVALID_TOKEN\nHTTP STATUS: 400\nPROVIDER: none\nFORMAT: none\nERROR MESSAGE: Download token required');
      const err: any = new Error('Token required');
      err.code = 'INVALID_TOKEN';
      err.statusCode = 400;
      throw err;
    }

    // [2] Token validated
    let payload;
    try {
      payload = tokenService.verifyToken(tokenStr);
      if (isDev) console.log('[2] Token validated');
    } catch (e: any) {
      console.error(`ERROR STAGE: [2] Token validation\nERROR CODE: ${e.code || 'INVALID_TOKEN'}\nHTTP STATUS: 403\nPROVIDER: none\nFORMAT: none\nERROR MESSAGE: ${e.message}`);
      const err: any = new Error('Invalid or expired download token');
      err.code = e.code || 'INVALID_TOKEN';
      err.statusCode = 403;
      throw err;
    }

    const { mediaId, formatId, platform, originalUrl } = payload;

    // [3] Provider identified
    const provider = providerRegistry.getProviderForUrl(originalUrl);
    if (isDev) console.log(`[3] Provider identified: ${provider.id}`);

    // [4] Media ID validated
    if (!mediaId) {
      console.error(`ERROR STAGE: [4] Media ID validation\nERROR CODE: INVALID_MEDIA_ID\nHTTP STATUS: 400\nPROVIDER: ${provider.id}\nFORMAT: ${formatId}\nERROR MESSAGE: Media ID missing`);
      const err: any = new Error('Media ID missing');
      err.code = 'INVALID_MEDIA_ID';
      err.statusCode = 400;
      throw err;
    }
    if (isDev) console.log(`[4] Media ID validated: ${mediaId}`);

    // [5] Format ID validated
    if (!formatId) {
      console.error(`ERROR STAGE: [5] Format ID validation\nERROR CODE: INVALID_FORMAT_ID\nHTTP STATUS: 400\nPROVIDER: ${provider.id}\nFORMAT: none\nERROR MESSAGE: Format ID missing`);
      const err: any = new Error('Format ID missing');
      err.code = 'INVALID_FORMAT_ID';
      err.statusCode = 400;
      throw err;
    }
    if (isDev) console.log(`[5] Format ID validated: ${formatId}`);

    // [6] Provider stream requested
    if (isDev) console.log(`[6] Provider stream requested for platform=${platform}`);
    const result = await provider.getDownloadStream(mediaId, formatId, originalUrl);

    // [7] Provider response received
    if (isDev) console.log('[7] Provider response received');
    providerStream = result.stream;

    if (!providerStream) {
      console.error(`ERROR STAGE: [7] Provider response received\nERROR CODE: PROVIDER_UNAVAILABLE\nHTTP STATUS: 502\nPROVIDER: ${provider.id}\nFORMAT: ${formatId}\nERROR MESSAGE: Provider did not return stream`);
      const err: any = new Error('This content cannot currently be processed by the media provider.');
      err.code = 'PROVIDER_UNAVAILABLE';
      err.statusCode = 502;
      throw err;
    }

    // Determine MIME type & filename
    const isAudio = formatId.includes('audio') || formatId.includes('mp3');
    const isMp3 = formatId.includes('mp3');
    const computedMime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';
    const finalMimeType = result.mimeType && !result.mimeType.includes('octet-stream') ? result.mimeType : computedMime;
    const contentDisposition = buildContentDispositionHeader(result.filename);

    // [8] Provider HTTP status
    if (isDev) console.log('[8] Provider HTTP status: 200 OK');

    // [9] Provider Content-Type
    if (isDev) console.log(`[9] Provider Content-Type: ${finalMimeType}`);

    // [10] Provider Content-Length
    if (isDev) console.log(`[10] Provider Content-Length: ${result.contentLength || 'chunked'}`);

    // [11] Stream initialized
    if (isDev) console.log('[11] Stream initialized');

    // Error handler BEFORE sending headers
    providerStream.on('error', (streamErr: any) => {
      console.error(`ERROR STAGE: [11] Stream initialization\nERROR CODE: PROVIDER_STREAM_FAILED\nHTTP STATUS: 502\nPROVIDER: ${provider.id}\nFORMAT: ${formatId}\nERROR MESSAGE: ${streamErr?.message}`);
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
        // [12] First media bytes received
        if (isDev) console.log(`[12] First media bytes received (${chunk.length} bytes)`);
      }
    });

    providerStream.pipe(res);

    providerStream.on('end', () => {
      // [13] Stream completed
      if (isDev) console.log(`[13] Stream completed successfully (${bytesTransferred} total bytes)`);
    });

  } catch (error: any) {
    if (providerStream && typeof providerStream.destroy === 'function' && !providerStream.destroyed) {
      providerStream.destroy();
    }
    next(error);
  }
}

