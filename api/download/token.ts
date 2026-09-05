import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

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

    const ttlSeconds = 300;
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = { mediaId, formatId, platform, originalUrl, exp };

    const base64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(base64Payload).digest('base64url');
    const token = `${base64Payload}.${signature}`;

    return res.status(200).json({
      success: true,
      token,
      expiresIn: ttlSeconds,
      streamUrl: `/api/stream/${token}`,
    });
  } catch (error: any) {
    console.error('[API Token Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create download token.',
    });
  }
}
