import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

async function resolveExactMediaDownload(originalUrl: string, formatId: string): Promise<string | null> {
  const isAudio = formatId.includes('audio');
  const format = isAudio ? 'mp3' : formatId.includes('1080') ? '1080' : formatId.includes('720') ? '720' : '480';

  // 1. High-speed REST Conversion Engine for exact video
  try {
    const startUrl = `https://loader.to/ajax/download.php?button=1&start=1&end=1&format=${format}&url=${encodeURIComponent(originalUrl)}`;
    const startRes = await fetch(startUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (startRes.ok) {
      const startData: any = await startRes.json();
      if (startData && startData.id) {
        const taskId = startData.id;
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const progRes = await fetch(`https://loader.to/ajax/progress.php?id=${taskId}`);
          if (progRes.ok) {
            const progData: any = await progRes.json();
            if (progData.success === 1 && progData.download_url) {
              return progData.download_url;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Downly] Loader engine error:', err);
  }

  // 2. Cobalt API Engine
  const cobaltHosts = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh/api/json',
  ];

  for (const host of cobaltHosts) {
    try {
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
          videoQuality: format,
          audioFormat: 'mp3',
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.url) return data.url;
      }
    } catch {
      continue;
    }
  }

  // 3. Piped / Invidious stream extraction
  const ytMatch = originalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.privacydev.net',
      'https://pipedapi.tokhmi.xyz',
    ];

    for (const instance of pipedInstances) {
      try {
        const res = await fetch(`${instance}/streams/${videoId}`);
        if (res.ok) {
          const data: any = await res.json();
          if (isAudio && Array.isArray(data.audioStreams) && data.audioStreams[0]?.url) {
            return data.audioStreams[0].url;
          }
          if (Array.isArray(data.videoStreams) && data.videoStreams.length > 0) {
            const stream = data.videoStreams.find((s: any) => s.mimeType?.includes('video/mp4')) || data.videoStreams[0];
            if (stream?.url) return stream.url;
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
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

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

    const isAudio = formatId.includes('audio');
    const isMp3 = formatId.includes('mp3');
    const ext = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
    const filename = `Downly_${platform}_${mediaId}.${ext}`;

    // Resolve exact media download stream
    const directStreamUrl = await resolveExactMediaDownload(targetUrl, formatId);

    if (directStreamUrl) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      return res.redirect(302, directStreamUrl);
    }

    // Direct conversion fallback
    return res.status(503).json({
      success: false,
      code: 'CONVERSION_TIMEOUT',
      message: 'Conversion is processing, please click Download again.',
    });

  } catch (error: any) {
    console.error('[API Stream Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process media stream.',
    });
  }
}
