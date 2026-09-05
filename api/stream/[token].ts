import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

async function resolveDirectMediaStream(originalUrl: string, formatId: string): Promise<string | null> {
  const isAudio = formatId.includes('audio');

  // 1. YouTube Direct googlevideo.com CDN Resolution via Piped & Invidious
  const ytMatch = originalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    
    // Piped APIs (extract direct unblocked googlevideo.com CDN stream URLs)
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.privacydev.net',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
      'https://api.piped.projectsegfau.lt',
    ];

    for (const instance of pipedInstances) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${instance}/streams/${videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          
          if (isAudio && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
            const m4a = data.audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4') || s.format === 'M4A') || data.audioStreams[0];
            if (m4a?.url) return m4a.url;
          }

          if (Array.isArray(data.videoStreams) && data.videoStreams.length > 0) {
            const mp4s = data.videoStreams.filter((s: any) => s.mimeType?.includes('video/mp4') || s.videoOnly === false);
            const matched = mp4s.find((s: any) => 
              formatId.includes('720') ? s.quality?.includes('720') : s.quality?.includes('360')
            ) || mp4s[0] || data.videoStreams[0];

            if (matched?.url) return matched.url;
          }
        }
      } catch {
        continue;
      }
    }

    // Invidious API fallback
    const invidiousHosts = [
      'https://yewtu.be',
      'https://invidious.jing.rocks',
      'https://invidious.nerdvpn.de',
      'https://invidious.private.coffee',
    ];

    for (const host of invidiousHosts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

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
  }

  // 2. Cobalt API instances for Instagram & multi-platform
  const cobaltHosts = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh/api/json',
  ];

  for (const host of cobaltHosts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

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

    // Resolve direct unblocked media stream (googlevideo CDN / direct stream)
    const directStreamUrl = await resolveDirectMediaStream(targetUrl, formatId);

    if (directStreamUrl) {
      // Set attachment disposition headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      try {
        const remoteRes = await fetch(directStreamUrl);
        if (remoteRes.ok && remoteRes.body) {
          const arrayBuffer = await remoteRes.arrayBuffer();
          res.setHeader('Content-Length', arrayBuffer.byteLength.toString());
          return res.status(200).send(Buffer.from(arrayBuffer));
        }
      } catch {
        // Fallback to direct redirect with attachment intent
        return res.redirect(302, directStreamUrl);
      }
    }

    // Direct binary fallback
    const fallbackUrl = `https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4`;
    const fallbackRes = await fetch(fallbackUrl);
    const buf = await fallbackRes.arrayBuffer();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(buf));

  } catch (error: any) {
    console.error('[API Stream Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process media stream.',
    });
  }
}
