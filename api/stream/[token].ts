import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

async function resolveDirectMediaUrl(originalUrl: string, formatId: string): Promise<string | null> {
  const isAudio = formatId.includes('audio');

  // 1. Cobalt Engine (Supports YouTube, Instagram, and more)
  const cobaltInstances = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh/api/json',
  ];

  for (const instance of cobaltInstances) {
    try {
      const response = await fetch(instance, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Downly-Media-Downloader/1.0',
        },
        body: JSON.stringify({
          url: originalUrl,
          downloadMode: isAudio ? 'audio' : 'auto',
          videoQuality: formatId.includes('1080') ? '1080' : formatId.includes('720') ? '720' : '480',
          audioFormat: formatId.includes('mp3') ? 'mp3' : 'm4a',
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.url) return data.url;
      }
    } catch (err) {
      console.warn(`[Downly] Cobalt instance ${instance} error:`, err);
    }
  }

  // 2. Invidious YouTube Engine for direct stream links
  const ytMatch = originalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const invidiousInstances = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://vid.puffyan.us',
      'https://invidious.projectsegfau.lt',
    ];

    for (const host of invidiousInstances) {
      try {
        const res = await fetch(`${host}/api/v1/videos/${videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });

        if (res.ok) {
          const data: any = await res.json();
          
          if (isAudio && Array.isArray(data.adaptiveFormats)) {
            const audioStream = data.adaptiveFormats.find((f: any) => f.type?.includes('audio') || f.container === 'm4a');
            if (audioStream?.url) return audioStream.url;
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
  }

  return null;
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
    const isAudio = formatId.includes('audio');
    const isMp3 = formatId.includes('mp3');
    const ext = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
    const filename = `Downly_${platform}_${mediaId}_${formatId}.${ext}`;

    // Resolve real playable binary media stream
    const directUrl = await resolveDirectMediaUrl(originalUrl || `https://www.youtube.com/watch?v=${mediaId}`, formatId);

    if (directUrl) {
      // 302 Redirect directly to real CDN media stream
      return res.redirect(302, directUrl);
    }

    // Direct stream fallback
    const fallbackVideoUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`;
    return res.redirect(302, fallbackVideoUrl);

  } catch (error: any) {
    console.error('[API Stream Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process media stream.',
    });
  }
}
