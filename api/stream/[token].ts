import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

async function resolveDirectMediaUrl(originalUrl: string, formatId: string): Promise<string | null> {
  const isAudio = formatId.includes('audio');

  // 1. YouTube Extractors
  const ytMatch = originalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    
    // Invidious API public instances
    const invidiousHosts = [
      'https://yewtu.be',
      'https://invidious.jing.rocks',
      'https://invidious.nerdvpn.de',
      'https://invidious.private.coffee',
      'https://inv.nadeko.net',
    ];

    for (const host of invidiousHosts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`${host}/api/v1/videos/${videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          
          if (isAudio && Array.isArray(data.adaptiveFormats)) {
            const audio = data.adaptiveFormats.find((f: any) => f.type?.includes('audio') || f.container === 'm4a');
            if (audio?.url) return audio.url;
          }

          if (Array.isArray(data.formatStreams) && data.formatStreams.length > 0) {
            const matched = data.formatStreams.find((f: any) => 
              formatId.includes('720') ? f.qualityLabel?.includes('720') : f.qualityLabel?.includes('360')
            ) || data.formatStreams[0];

            if (matched?.url) return matched.url;
          }
        }
      } catch {
        continue;
      }
    }

    // Direct YouTube Downloader Mirror for the EXACT video
    return `https://10downloader.com/download?v=https://www.youtube.com/watch?v=${videoId}`;
  }

  // 2. Cobalt instances for Instagram and multi-platform
  const cobaltHosts = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh/api/json',
  ];

  for (const host of cobaltHosts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(host, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Downly/1.0',
        },
        body: JSON.stringify({
          url: originalUrl,
          downloadMode: isAudio ? 'audio' : 'auto',
          videoQuality: formatId.includes('1080') ? '1080' : formatId.includes('720') ? '720' : '480',
          audioFormat: formatId.includes('mp3') ? 'mp3' : 'm4a',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        if (data.url) return data.url;
      }
    } catch {
      continue;
    }
  }

  // Instagram direct download mirror for the exact post
  const igMatch = originalUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return `https://snapinsta.app/?url=${encodeURIComponent(originalUrl)}`;
  }

  return originalUrl;
}

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
        message: 'Download token required.',
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

    const { mediaId, formatId, platform, originalUrl } = payload;
    const targetUrl = originalUrl || (platform === 'youtube' ? `https://www.youtube.com/watch?v=${mediaId}` : `https://www.instagram.com/p/${mediaId}/`);

    // Resolve real binary stream URL for the EXACT video
    const directUrl = await resolveDirectMediaUrl(targetUrl, formatId);

    if (directUrl) {
      return res.redirect(302, directUrl);
    }

    return res.redirect(302, targetUrl);

  } catch (error: any) {
    console.error('[API Stream Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process media stream.',
    });
  }
}
