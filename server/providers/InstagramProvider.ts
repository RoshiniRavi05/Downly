import { MediaProvider, StreamResult } from './MediaProvider.js';
import { MediaMetadata, VideoFormat, AudioFormat, MediaType } from '../types/index.js';
import { ytDlpService } from '../services/ytDlpService.js';
import https from 'https';

export class InstagramProvider implements MediaProvider {
  readonly id = 'instagram' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'instagram.com' ||
        host === 'www.instagram.com' ||
        host === 'instagr.am'
      );
    } catch {
      return false;
    }
  }

  private extractShortcode(url: string): { shortcode: string; type: MediaType } | null {
    try {
      const match = url.match(/\/(p|reel|reels)\/([a-zA-Z0-9_-]+)/);
      if (match && match[2]) {
        const rawType = match[1];
        const type: MediaType = (rawType === 'reel' || rawType === 'reels') ? 'reel' : 'post';
        return { shortcode: match[2], type };
      }
    } catch {
      // Fallback regex
    }
    return null;
  }

  async analyzeUrl(url: string): Promise<MediaMetadata> {
    const extracted = this.extractShortcode(url);
    if (!extracted) {
      const err: any = new Error('Invalid Instagram URL pattern');
      err.code = 'INVALID_URL';
      throw err;
    }

    const { shortcode, type } = extracted;
    const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

    let title = type === 'reel' ? `Instagram Reel #${shortcode}` : `Instagram Post #${shortcode}`;
    let creator = 'Instagram User';
    let thumbnail = `https://picsum.photos/seed/ig-${shortcode}/600/600`;
    let duration: number | null = type === 'reel' ? 30 : null;

    // Try yt-dlp metadata extraction
    try {
      const info = await ytDlpService.getVideoInfo(targetUrl);
      if (info.title) title = info.title;
      if (info.uploader || info.channel) creator = info.uploader || info.channel || creator;
      if (info.thumbnail) thumbnail = info.thumbnail;
      if (typeof info.duration === 'number' && info.duration > 0) duration = info.duration;
    } catch (e) {
      // Fallback to oEmbed parsing
      try {
        const oembedUrl = `https://api.instagram.com/oembed/?url=${targetUrl}`;
        const oembedData = await this.fetchJson(oembedUrl);
        if (oembedData?.title) title = oembedData.title;
        if (oembedData?.author_name) creator = oembedData.author_name;
        if (oembedData?.thumbnail_url) thumbnail = oembedData.thumbnail_url;
      } catch (oembedErr: any) {
        if (oembedErr.statusCode === 404 || oembedErr.statusCode === 401 || oembedErr.statusCode === 403) {
          const err: any = new Error('Content is private or unavailable');
          err.code = oembedErr.statusCode === 404 ? 'CONTENT_UNAVAILABLE' : 'PRIVATE_CONTENT';
          throw err;
        }
      }
    }

    const formattedDuration = duration
      ? `${Math.floor(duration / 60)
          .toString()
          .padStart(2, '0')}:${Math.floor(duration % 60)
          .toString()
          .padStart(2, '0')}`
      : null;

    const formats: VideoFormat[] = [
      {
        id: `ig-${shortcode}-hd`,
        type: 'video',
        container: 'mp4',
        quality: '1080p • Full HD',
        resolution: '1080x1920',
        size: null,
        formattedSize: null,
        available: true,
        recommended: true,
      },
      {
        id: `ig-${shortcode}-sd`,
        type: 'video',
        container: 'mp4',
        quality: '720p • HD',
        resolution: '720x1280',
        size: null,
        formattedSize: null,
        available: true,
      },
    ];

    const audioFormats: AudioFormat[] = [
      {
        id: `ig-${shortcode}-audio-m4a`,
        type: 'audio',
        container: 'm4a',
        bitrate: 'Original Audio',
        size: null,
        formattedSize: null,
        available: true,
      },
      {
        id: `ig-${shortcode}-audio-mp3`,
        type: 'audio',
        container: 'mp3',
        bitrate: '320 kbps MP3',
        size: null,
        formattedSize: null,
        available: true,
      },
    ];

    return {
      id: shortcode,
      platform: 'instagram',
      type,
      title,
      creator: `@${creator.replace(/^@/, '')}`,
      thumbnail,
      duration,
      formattedDuration,
      originalUrl: targetUrl,
      formats,
      audioFormats,
    };
  }

  async getDownloadStream(mediaId: string, formatId: string, originalUrl: string): Promise<StreamResult> {
    const shortcode = mediaId || this.extractShortcode(originalUrl)?.shortcode || 'media';
    const targetUrl = originalUrl || `https://www.instagram.com/p/${shortcode}/`;
    return ytDlpService.getMediaStream(targetUrl, formatId, `Instagram_${shortcode}`);
  }

  private fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Downly-Bot/1.0' } }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject({ statusCode: 500, message: 'Invalid JSON' });
            }
          } else {
            reject({ statusCode: res.statusCode || 500 });
          }
        });
      }).on('error', (err) => reject({ statusCode: 500, error: err }));
    });
  }
}
