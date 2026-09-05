import { tokenService } from '../../server/services/tokenService';
import { validateAndSanitizeUrl } from '../../server/middleware/security';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method Not Allowed',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { mediaId, formatId, platform, originalUrl } = body || {};

    if (!mediaId || !formatId || !originalUrl) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Missing required parameters.',
      });
    }

    const validation = validateAndSanitizeUrl(originalUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_URL',
        message: 'Invalid original URL.',
      });
    }

    const { token, expiresIn } = tokenService.generateToken(
      String(mediaId),
      String(formatId),
      platform || 'youtube',
      validation.normalizedUrl
    );

    return res.status(200).json({
      success: true,
      token,
      expiresIn,
      streamUrl: `/api/stream/${token}`,
    });
  } catch (error: any) {
    console.error('[API Token Error]:', error);
    return res.status(500).json({
      success: false,
      code: error?.code || 'SERVER_ERROR',
      message: error?.message || 'Failed to generate download token.',
    });
  }
}
