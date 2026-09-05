import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import { StreamResult } from '../providers/MediaProvider';
import { ytDlpService } from './ytDlpService';

/**
 * Fetches a readable stream from a remote media URL, following up to 5 HTTP/HTTPS redirects.
 */
export function fetchRemoteStream(
  targetUrl: string,
  maxRedirects = 5
): Promise<{ stream: Readable; contentLength?: number; contentType?: string }> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects'));
    }

    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(
      targetUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      },
      (res) => {
        // Handle HTTP Redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return fetchRemoteStream(redirectUrl, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          const contentLengthStr = res.headers['content-length'];
          const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : undefined;
          const contentType = res.headers['content-type'];
          return resolve({
            stream: res as unknown as Readable,
            contentLength,
            contentType,
          });
        }

        reject(new Error(`Failed to fetch media stream (Status ${res.statusCode})`));
      }
    );

    req.on('error', (err) => reject(err));
  });
}

/**
 * Resolves a high-quality playable media stream for the given format, platform, and identifier.
 */
export async function getPlayableMediaStream(
  platform: 'YouTube' | 'Instagram',
  mediaId: string,
  formatId: string
): Promise<StreamResult> {
  const targetUrl = platform === 'YouTube' 
    ? `https://www.youtube.com/watch?v=${mediaId}` 
    : `https://www.instagram.com/p/${mediaId}/`;
  
  return ytDlpService.getMediaStream(targetUrl, formatId, `${platform}_${mediaId}`);
}

