import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tokenService } from '../../server/services/tokenService';
import { providerRegistry } from '../../server/providers/ProviderRegistry';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const tokenStr = (req.query.token || req.query['[token]']) as string;
    if (!tokenStr) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Download token required.',
      });
    }

    let payload;
    try {
      payload = tokenService.verifyToken(tokenStr);
    } catch (e: any) {
      return res.status(403).json({
        success: false,
        code: e.code || 'INVALID_TOKEN',
        message: 'Invalid or expired download token.',
      });
    }

    const { mediaId, formatId, originalUrl } = payload;
    const provider = providerRegistry.getProviderForUrl(originalUrl);
    const result = await provider.getDownloadStream(mediaId, formatId, originalUrl);

    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (result.contentLength) {
      res.setHeader('Content-Length', result.contentLength.toString());
    }

    if ('pipe' in result.stream) {
      (result.stream as any).pipe(res);
    } else {
      return res.status(500).json({
        success: false,
        code: 'STREAM_ERROR',
        message: 'Stream not readable.',
      });
    }
  } catch (error: any) {
    console.error('[API Stream Error]:', error);
    return res.status(500).json({
      success: false,
      code: error.code || 'SERVER_ERROR',
      message: error.message || 'Media streaming failed.',
    });
  }
}
