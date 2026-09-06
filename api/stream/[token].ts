import crypto from 'crypto';
import https from 'https';
import http from 'http';
import ytdlPackage from '@distube/ytdl-core';

const ytdl: typeof import('@distube/ytdl-core') = (ytdlPackage as any).default || ytdlPackage;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';

async function resolveDirectMediaStream(originalUrl: string, formatId: string, platform: string): Promise<string | null> {
  const isAudio = formatId.includes('audio') || formatId.includes('mp3');

  // 1. YouTube Direct Resolution via @distube/ytdl-core (Pure JS, Fast <1s)
  if (platform === 'youtube' || originalUrl.includes('youtube.com') || originalUrl.includes('youtu.be')) {
    try {
      const info = await ytdl.getInfo(originalUrl, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        },
      });

      if (info && info.formats && info.formats.length > 0) {
        if (isAudio) {
          const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
          if (audioFormat && audioFormat.url) return audioFormat.url;
        }

        // Try format with both audio and video (e.g. 720p/360p mp4)
        const combinedFormat = info.formats.find(
          (f) => f.hasVideo && f.hasAudio && f.container === 'mp4' && (formatId.includes('720') ? f.qualityLabel?.includes('720') : true)
        ) || info.formats.find((f) => f.hasVideo && f.hasAudio)
          || info.formats[0];

        if (combinedFormat && combinedFormat.url) {
          return combinedFormat.url;
        }
      }
    } catch (ytdlErr) {
      console.warn('[Downly] ytdl-core direct extraction warning:', ytdlErr);
    }
  }

  // 2. Instagram Direct Extraction
  if (platform === 'instagram' || originalUrl.includes('instagram.com')) {
    try {
      const igRes = await fetch(originalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (igRes.ok) {
        const html = await igRes.text();
        const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i)
          || html.match(/"video_url":"([^"]+)"/i);
        if (videoMatch && videoMatch[1]) {
          return videoMatch[1].replace(/\\u0026/g, '&');
        }
      }
    } catch (igErr) {
      console.warn('[Downly] Instagram direct extraction warning:', igErr);
    }
  }

  // 3. Fast Parallel Invidious / Piped / Direct Proxy Fallbacks (Max 5s total timeout)
  const ytMatch = originalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const itag = isAudio ? '140' : formatId.includes('720') ? '22' : '18';

    // Direct proxy URLs that stream instantly without API deciphering
    const directProxies = [
      `https://yewtu.be/latest_version?id=${videoId}&itag=${itag}`,
      `https://invidious.nerdvpn.de/latest_version?id=${videoId}&itag=${itag}`,
      `https://inv.tux.pizza/latest_version?id=${videoId}&itag=${itag}`,
    ];

    for (const proxyUrl of directProxies) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const headRes = await fetch(proxyUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        if (headRes.ok || (headRes.status >= 300 && headRes.status < 400)) {
          return proxyUrl;
        }
      } catch {
        // Try next proxy
      }
    }

    const fastEndpoints = [
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      `https://api.piped.privacydev.net/streams/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
      `https://yewtu.be/api/v1/videos/${videoId}`,
    ];

    const fetchPromises = fastEndpoints.map(async (ep) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(ep, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data: any = await res.json();
          if (isAudio && Array.isArray(data.audioStreams) && data.audioStreams[0]?.url) {
            return data.audioStreams[0].url;
          }
          if (Array.isArray(data.videoStreams)) {
            const stream = data.videoStreams.find((s: any) => s.mimeType?.includes('video/mp4')) || data.videoStreams[0];
            if (stream?.url) return stream.url;
          }
          if (Array.isArray(data.formatStreams) && data.formatStreams[0]?.url) {
            return data.formatStreams[0].url;
          }
        }
      } catch {
        // Ignore single endpoint error
      }
      throw new Error('Failed endpoint');
    });

    try {
      const fastestUrl = await Promise.any(fetchPromises);
      if (fastestUrl) return fastestUrl;
    } catch {
      // Parallel fetch failed
    }
  }

  return null;
}

function streamFileToClient(url: string, res: any, filename: string, isAudio: boolean, depth = 0) {
  if (depth > 6) {
    return res.status(502).json({ success: false, message: 'Too many stream redirects' });
  }

  const client = url.startsWith('https:') ? https : http;
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
  };

  const req = client.get(url, options, (streamRes) => {
    // Follow 3xx redirects
    if (streamRes.statusCode && streamRes.statusCode >= 300 && streamRes.statusCode < 400 && streamRes.headers.location) {
      return streamFileToClient(streamRes.headers.location, res, filename, isAudio, depth + 1);
    }

    if (streamRes.statusCode && streamRes.statusCode >= 400) {
      console.warn(`[Downly Stream Warning] Upstream returned status ${streamRes.statusCode}`);
      return res.status(502).json({
        success: false,
        code: 'STREAM_FETCH_FAILED',
        message: 'Unable to stream media file from upstream host. Please try again.',
      });
    }

    const upstreamContentType = streamRes.headers['content-type'] || '';

    // CRITICAL SECURITY & FORMAT PROTECTION: If upstream returns HTML text or JSON error, DO NOT pipe as video!
    if (upstreamContentType.includes('text/html') || upstreamContentType.includes('application/json')) {
      console.warn(`[Downly Stream Warning] Upstream returned text/html or json instead of binary media: ${upstreamContentType}`);
      return res.status(502).json({
        success: false,
        code: 'INVALID_MEDIA_STREAM',
        message: 'Upstream server returned an error response instead of media bytes. Please try again.',
      });
    }

    const contentType = upstreamContentType || (isAudio ? 'audio/mpeg' : 'video/mp4');
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
      return res.status(502).json({
        success: false,
        code: 'STREAM_PIPE_ERROR',
        message: 'Connection failed while piping media stream.',
      });
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

    // Resolve exact stream within 1-2 seconds
    const directStreamUrl = await resolveDirectMediaStream(targetUrl, formatId, platform);

    if (directStreamUrl) {
      return streamFileToClient(directStreamUrl, res, filename, isAudio);
    }

    return res.status(503).json({
      success: false,
      code: 'CONVERSION_TIMEOUT',
      message: 'Stream resolution is processing. Please try clicking download again.',
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


