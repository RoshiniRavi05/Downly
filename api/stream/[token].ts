import crypto from 'crypto';
import https from 'https';
import http from 'http';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

async function resolveExactMediaDownload(originalUrl: string, formatId: string): Promise<string | null> {
  const isAudio = formatId.includes('audio');
  const format = isAudio ? 'mp3' : formatId.includes('1080') ? '1080' : formatId.includes('720') ? '720' : '480';

  // 1. Cobalt API Cluster (Multiple instances)
  const cobaltHosts = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh/api/json',
    'https://cobalt-api.kwiatekm.pl',
    'https://api.hyper.lol',
    'https://cobalt.tools/api/json',
  ];

  for (const host of cobaltHosts) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(host, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
        body: JSON.stringify({
          url: originalUrl,
          downloadMode: isAudio ? 'audio' : 'auto',
          videoQuality: format,
          audioFormat: 'mp3',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data: any = await response.json();
        if (data.url) return data.url;
        if (data.stream) return data.stream;
      }
    } catch {
      continue;
    }
  }

  // 2. Piped API Stream cluster
  const ytMatch = originalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.privacydev.net',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.lunar.icu',
    ];

    for (const instance of pipedInstances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${instance}/streams/${videoId}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          if (isAudio && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
            const audio = data.audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || data.audioStreams[0];
            if (audio?.url) return audio.url;
          }
          if (Array.isArray(data.videoStreams) && data.videoStreams.length > 0) {
            // Find mp4 with audio if available or standard video stream
            const stream = data.videoStreams.find((s: any) => s.videoOnly === false && s.mimeType?.includes('video/mp4'))
              || data.videoStreams.find((s: any) => s.mimeType?.includes('video/mp4'))
              || data.videoStreams[0];
            if (stream?.url) return stream.url;
          }
        }
      } catch {
        continue;
      }
    }

    // 3. Invidious stream extraction
    const invidiousInstances = [
      'https://invidious.nerdvpn.de',
      'https://inv.tux.pizza',
      'https://vid.puffyan.us',
    ];

    for (const instance of invidiousInstances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          if (isAudio && Array.isArray(data.formatStreams)) {
            const audio = data.formatStreams.find((s: any) => s.type?.includes('audio')) || data.adaptiveFormats?.find((s: any) => s.type?.includes('audio'));
            if (audio?.url) return audio.url;
          }
          if (Array.isArray(data.formatStreams) && data.formatStreams.length > 0) {
            const stream = data.formatStreams.find((s: any) => s.resolution?.includes('720') || s.quality?.includes('hd720')) || data.formatStreams[0];
            if (stream?.url) return stream.url;
          }
        }
      } catch {
        continue;
      }
    }
  }

  // 4. REST Conversion Engine
  try {
    const startUrl = `https://loader.to/ajax/download.php?button=1&start=1&end=1&format=${format}&url=${encodeURIComponent(originalUrl)}`;
    const startRes = await fetch(startUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (startRes.ok) {
      const startData: any = await startRes.json();
      if (startData && startData.id) {
        const taskId = startData.id;
        for (let i = 0; i < 5; i++) {
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
    console.warn('[Downly] Loader engine warning:', err);
  }

  return null;
}

function streamFileToClient(url: string, res: any, filename: string, isAudio: boolean, depth = 0) {
  if (depth > 6) {
    return res.status(502).json({ success: false, message: 'Too many redirects from stream host' });
  }

  const client = url.startsWith('https:') ? https : http;
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Encoding': 'identity',
    },
  };

  const req = client.get(url, options, (streamRes) => {
    // Handle redirects (301, 302, 303, 307, 308)
    if (streamRes.statusCode && streamRes.statusCode >= 300 && streamRes.statusCode < 400 && streamRes.headers.location) {
      return streamFileToClient(streamRes.headers.location, res, filename, isAudio, depth + 1);
    }

    if (streamRes.statusCode && streamRes.statusCode >= 400) {
      // Fallback redirect if direct pipe is rejected
      return res.redirect(302, url);
    }

    // Set download attachment headers so browser directly downloads the file
    const contentType = streamRes.headers['content-type'] || (isAudio ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (streamRes.headers['content-length']) {
      res.setHeader('Content-Length', streamRes.headers['content-length']);
    }

    streamRes.pipe(res);
  });

  req.on('error', (err) => {
    console.error('[Downly Stream Pipe Error]:', err);
    if (!res.headersSent) {
      // Fallback redirect directly
      return res.redirect(302, url);
    }
  });
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

    const isAudio = formatId.includes('audio') || formatId.includes('mp3');
    const isMp3 = formatId.includes('mp3');
    const ext = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
    const filename = `Downly_${platform}_${mediaId}.${ext}`;

    // Resolve exact media download stream
    const directStreamUrl = await resolveExactMediaDownload(targetUrl, formatId);

    if (directStreamUrl) {
      // Stream directly through Vercel serverless to bypass ISP blocks and trigger direct device download
      return streamFileToClient(directStreamUrl, res, filename, isAudio);
    }

    // Direct conversion fallback if stream resolution took longer
    return res.status(503).json({
      success: false,
      code: 'CONVERSION_TIMEOUT',
      message: 'Conversion is preparing, please click Download again.',
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
