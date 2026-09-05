import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const tokenStr = (req.query?.token || req.query?.['[token]']) as string;
    if (!tokenStr) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Token required.',
      });
    }

    const parts = tokenStr.split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ success: false, code: 'INVALID_TOKEN', message: 'Malformed token' });
    }

    const [base64Payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(base64Payload).digest('base64url');

    if (signature !== expectedSignature) {
      return res.status(403).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid token signature' });
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(403).json({ success: false, code: 'EXPIRED_TOKEN', message: 'Download token expired' });
    }

    const { mediaId, formatId, platform } = payload;
    const isAudio = formatId.includes('audio');
    const isMp3 = formatId.includes('mp3');
    const ext = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
    const filename = `Downly_${platform}_${mediaId}_${formatId}.${ext}`;

    // Return instant download attachment stream
    res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Deliver media buffer
    const mockData = Buffer.from(`Downly media payload for ${platform} ${mediaId} (${formatId})`);
    res.setHeader('Content-Length', mockData.length.toString());
    return res.status(200).send(mockData);

  } catch (error: any) {
    console.error('[API Stream Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process media stream.',
    });
  }
}
