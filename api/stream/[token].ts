import crypto from 'crypto';
import https from 'https';
import http from 'http';
import ytdlPackage from '@distube/ytdl-core';
import { ytDlpService } from '../../server/services/ytDlpService';
import { resolveDirectMediaStreamUrl } from '../../server/services/directResolver';

const ytdl: typeof import('@distube/ytdl-core') = (ytdlPackage as any).default || ytdlPackage;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'downly_secret_token_key_change_in_production_987654321';
const isDev = process.env.NODE_ENV !== 'production';

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\\/:"*?<>|]/g, '_')
    .trim();
}

function buildContentDispositionHeader(rawFilename: string): string {
  const sanitized = sanitizeFilename(rawFilename);
  const asciiFallback = sanitized.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');
  const rfc5987Encoded = encodeURIComponent(sanitized);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987Encoded}`;
}

async function resolveDirectMediaStream(originalUrl: string, formatId: string, platform: string): Promise<string | null> {
  const isAudio = formatId.includes('audio') || formatId.includes('mp3');
  const isMp3 = formatId.includes('mp3');

  let ytDlpFormatSelector = 'bestvideo[height<=1080]+bestaudio/bestvideo+bestaudio/best/b';
  if (isMp3 || isAudio) {
    ytDlpFormatSelector = 'bestaudio/best';
  } else if (formatId.includes('1080p')) {
    ytDlpFormatSelector = 'bestvideo[height<=1080]+bestaudio/bestvideo+bestaudio/best/b';
  } else if (formatId.includes('720p')) {
    ytDlpFormatSelector = 'bestvideo[height<=720]+bestaudio/bestvideo+bestaudio/best/b';
  } else if (formatId.includes('480p')) {
    ytDlpFormatSelector = 'bestvideo[height<=480]+bestaudio/bestvideo+bestaudio/best/b';
  } else if (formatId.includes('360p')) {
    ytDlpFormatSelector = 'b[height<=360]/bestvideo[height<=360]+bestaudio/best/b';
  }

  // 1. Fast direct extraction via ytDlpService (<1.5s)
  try {
    const streamUrls = await ytDlpService.getDirectUrl(originalUrl, ytDlpFormatSelector);
    if (streamUrls && streamUrls.length > 0 && streamUrls[0].startsWith('http')) {
      return streamUrls[0];
    }
  } catch (err) {
    if (isDev) console.warn('[Downly Stream Log] ytDlpService direct URL notice:', err);
  }

  // 2. YouTube Direct Resolution via @distube/ytdl-core
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

        const combinedFormat = info.formats.find(
          (f) => f.hasVideo && f.hasAudio && f.container === 'mp4' && (formatId.includes('720') ? f.qualityLabel?.includes('720') : true)
        ) || info.formats.find((f) => f.hasVideo && f.hasAudio)
          || info.formats[0];

        if (combinedFormat && combinedFormat.url) {
          return combinedFormat.url;
        }
      }
    } catch (ytdlErr) {
      if (isDev) console.warn('[Downly Stream Log] ytdl-core direct extraction warning:', ytdlErr);
    }
  }

  // 3. Instagram Direct Extraction
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
      if (isDev) console.warn('[Downly Stream Log] Instagram direct extraction warning:', igErr);
    }
  }

  return null;
}

function streamFileToClient(url: string, res: any, filename: string, isAudio: boolean, formatId: string, depth = 0) {
  if (depth > 6) {
    return res.status(502).json({ success: false, code: 'TOO_MANY_REDIRECTS', message: 'Too many stream redirects' });
  }

  const client = url.startsWith('https:') ? https : http;
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Encoding': 'identity',
      Referer: 'https://www.youtube.com/',
    },
  };

  const req = client.get(url, options, (streamRes) => {
    if (streamRes.statusCode && streamRes.statusCode >= 300 && streamRes.statusCode < 400 && streamRes.headers.location) {
      const redirectUrl = new URL(streamRes.headers.location, url).toString();
      return streamFileToClient(redirectUrl, res, filename, isAudio, formatId, depth + 1);
    }

    if (streamRes.statusCode && streamRes.statusCode >= 400) {
      if (isDev) console.warn(`[Downly Stream Log] Upstream returned status ${streamRes.statusCode}`);
      return res.status(502).json({
        success: false,
        code: 'PROVIDER_STREAM_FAILED',
        message: 'Unable to stream media file from upstream host.',
      });
    }

    const upstreamContentType = streamRes.headers['content-type'] || '';

    // Security & Format Guard: Do not send HTML or JSON as media file
    if (upstreamContentType.includes('text/html') || upstreamContentType.includes('application/json')) {
      if (isDev) console.warn(`[Downly Stream Log] Upstream returned non-binary text: ${upstreamContentType}`);
      return res.status(502).json({
        success: false,
        code: 'INVALID_MEDIA_STREAM',
        message: 'The media provider did not return a valid media stream.',
      });
    }

    const isMp3 = formatId.includes('mp3');
    const computedMime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';
    const finalContentType = upstreamContentType && !upstreamContentType.includes('octet-stream') ? upstreamContentType : computedMime;

    const contentDisposition = buildContentDispositionHeader(filename);

    if (isDev) {
      console.log(`[UPSTREAM STATUS] ${streamRes.statusCode || 200}`);
      console.log(`[UPSTREAM CONTENT-TYPE] ${finalContentType}`);
      console.log('[STREAM STARTED]');
    }

    res.status(200);
    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (streamRes.headers['content-length']) {
      const len = parseInt(streamRes.headers['content-length'], 10);
      if (!isNaN(len) && len > 0 && !process.env.VERCEL) {
        res.setHeader('Content-Length', len.toString());
      }
    }

    let bytesTransferred = 0;
    let firstByteLogged = false;

    streamRes.on('data', (chunk: Buffer) => {
      bytesTransferred += chunk.length;
      if (!firstByteLogged) {
        firstByteLogged = true;
        if (isDev) console.log(`[FIRST BYTES RECEIVED] (${chunk.length} bytes)`);
      }
    });

    streamRes.on('end', () => {
      if (isDev) console.log(`[STREAM COMPLETED] (${bytesTransferred} total bytes transferred)`);
    });

    const cleanup = () => {
      try {
        if (typeof streamRes.destroy === 'function' && !streamRes.destroyed) {
          streamRes.destroy();
        }
      } catch {}
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);

    streamRes.pipe(res);
  });

  req.on('error', (err) => {
    if (isDev) console.error(`[STREAM ERROR] ${err?.message}`);
    if (!res.headersSent) {
      return res.status(502).json({
        success: false,
        code: 'STREAM_PIPE_ERROR',
        message: 'Connection failed while piping media stream.',
      });
    } else {
      res.destroy(err);
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

    if (req.method === 'HEAD') {
      const computedMime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';
      res.status(200);
      res.setHeader('Content-Type', computedMime);
      res.setHeader('Content-Disposition', buildContentDispositionHeader(filename));
      return res.end();
    }

    if (isDev) {
      console.log('=== [DOWNLOAD START] ===');
      console.log(`[PROVIDER] ${platform}`);
      console.log(`[FORMAT] ${formatId}`);
      console.log(`[TOKEN VALID] true`);
      console.log(`[MEDIA RESOLUTION] mediaId=${mediaId}, platform=${platform}`);
    }

    // 1. High-Speed Direct JS Stream Resolution (<200ms)
    try {
      const directMedia = await resolveDirectMediaStreamUrl(targetUrl, formatId, platform);
      if (directMedia && directMedia.url) {
        return streamFileToClient(directMedia.url, res, filename, isAudio, formatId);
      }
    } catch (directErr: any) {
      if (isDev) console.warn('[API Stream Log] resolveDirectMediaStreamUrl notice:', directErr?.message);
    }

    // 2. Local ytDlpService Stream Resolution
    try {
      const result = await ytDlpService.getMediaStream(targetUrl, formatId, `${platform}_${mediaId}`);
      if (result && result.stream) {
        const computedMime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';
        const finalMime = result.mimeType || computedMime;
        const contentDisp = buildContentDispositionHeader(result.filename);

        res.status(200);
        res.setHeader('Content-Type', finalMime);
        res.setHeader('Content-Disposition', contentDisp);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        if (result.contentLength && Number.isInteger(result.contentLength) && result.contentLength > 0) {
          res.setHeader('Content-Length', result.contentLength.toString());
        }

        result.stream.on('error', (err: any) => {
          console.error('[API Stream Error] Stream failed:', err);
          if (!res.headersSent) {
            res.status(502).json({ success: false, code: 'PROVIDER_STREAM_FAILED', message: 'Stream failed' });
          } else {
            res.destroy(err);
          }
        });

        return result.stream.pipe(res);
      }
    } catch (ytErr) {
      if (isDev) console.warn('[API Stream Log] ytDlpService stream failed, fallback to direct stream:', ytErr);
    }

    // 3. Resolve exact stream fallback
    const directStreamUrl = await resolveDirectMediaStream(targetUrl, formatId, platform);

    if (directStreamUrl) {
      return streamFileToClient(directStreamUrl, res, filename, isAudio, formatId);
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


