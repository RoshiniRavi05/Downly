import { MediaProvider, StreamResult } from './MediaProvider';
import { MediaMetadata, VideoFormat, AudioFormat, MediaType } from '../types/index';
import { ytDlpService } from '../services/ytDlpService';
import ytdlPackage from '@distube/ytdl-core';
import http from 'http';
import https from 'https';

const ytdl: typeof import('@distube/ytdl-core') = (ytdlPackage as any).default || ytdlPackage;

export class YouTubeProvider implements MediaProvider {
  readonly id = 'youtube' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'youtube.com' ||
        host === 'www.youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'youtu.be'
      );
    } catch {
      return false;
    }
  }

  private extractVideoId(url: string): { id: string; type: MediaType } | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.toLowerCase() === 'youtu.be') {
        const id = parsed.pathname.substring(1).split('/')[0];
        if (id && id.length >= 10) {
          return { id, type: 'video' };
        }
      }

      if (parsed.pathname.includes('/shorts/')) {
        const parts = parsed.pathname.split('/shorts/');
        if (parts[1]) {
          const id = parts[1].split('/')[0].split('?')[0];
          if (id) return { id, type: 'short' };
        }
      }

      const v = parsed.searchParams.get('v');
      if (v && v.length >= 10) {
        return { id: v, type: 'video' };
      }

      const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/v\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        return { id: match[1], type: url.includes('/shorts/') ? 'short' : 'video' };
      }
    } catch {
      // Fallback regex
    }
    return null;
  }

  async analyzeUrl(url: string): Promise<MediaMetadata> {
    const extracted = this.extractVideoId(url);
    if (!extracted) {
      const err: any = new Error('Invalid YouTube URL');
      err.code = 'INVALID_URL';
      throw err;
    }

    const { id: videoId, type } = extracted;
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

    let title = type === 'short' ? `YouTube Short #${videoId}` : `YouTube Video ${videoId}`;
    let creator = 'YouTube Creator';
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let duration = type === 'short' ? 45 : 320;

    // 1. Primary: Use ytDlpService for accurate video details and dynamic format availability
    let ytInfo: any = null;
    try {
      ytInfo = await ytDlpService.getVideoInfo(targetUrl);
      if (ytInfo) {
        if (ytInfo.title) title = ytInfo.title;
        if (ytInfo.uploader || ytInfo.channel) creator = ytInfo.uploader || ytInfo.channel;
        if (ytInfo.thumbnail) thumbnail = ytInfo.thumbnail;
        if (typeof ytInfo.duration === 'number' && ytInfo.duration > 0) duration = ytInfo.duration;
      }
    } catch {
      // 2. Fallback: Try instant oEmbed parsing (Fastest & Zero binary/auth needed)
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${targetUrl}&format=json`;
        const oembedData = await this.fetchJson(oembedUrl);
        if (oembedData?.title) title = oembedData.title;
        if (oembedData?.author_name) creator = oembedData.author_name;
        if (oembedData?.thumbnail_url) thumbnail = oembedData.thumbnail_url;
      } catch {
        // Non-critical
      }

      // 3. Fallback: Try ytdl-core metadata enrichment
      try {
        const info = await ytdl.getInfo(targetUrl);
        if (info.videoDetails) {
          const d = info.videoDetails;
          if (d.title) title = d.title;
          if (d.author?.name) creator = d.author.name;
          if (d.thumbnails && d.thumbnails.length > 0) {
            thumbnail = d.thumbnails[d.thumbnails.length - 1].url;
          }
          if (d.lengthSeconds) {
            const parsedDur = parseInt(d.lengthSeconds, 10);
            if (!isNaN(parsedDur) && parsedDur > 0) duration = parsedDur;
          }
        }
      } catch {
        // Non-critical fallback
      }
    }

    const formattedDuration = `${Math.floor(duration / 60)
      .toString()
      .padStart(2, '0')}:${Math.floor(duration % 60)
      .toString()
      .padStart(2, '0')}`;

    // Dynamically calculate available video formats from yt-dlp format stream list
    const availableFormats = ytInfo?.formats || [];
    const availableNotes = new Set(
      availableFormats.map((f: any) => f.format_note?.toLowerCase()).filter(Boolean)
    );
    const availableHeights = availableFormats
      .map((f: any) => f.height)
      .filter((h: any): h is number => typeof h === 'number' && h > 0);

    const has2160 = availableNotes.has('2160p') || availableHeights.some((h: number) => h >= 1440);
    const has1440 = availableNotes.has('1440p') || availableHeights.some((h: number) => h >= 1080 && h < 1440);
    const has1080 = availableNotes.has('1080p') || availableHeights.some((h: number) => h >= 800 && h < 1080);
    const has720 = availableNotes.has('720p') || availableHeights.some((h: number) => h >= 530 && h < 800);
    const has480 = availableNotes.has('480p') || availableHeights.some((h: number) => h >= 350 && h < 530);
    const has360 = availableNotes.has('360p') || availableHeights.some((h: number) => h >= 240 && h < 350);

    const formats: VideoFormat[] = [];

    if (has2160) {
      formats.push({
        id: `yt-${videoId}-2160p`,
        type: 'video',
        container: 'mp4',
        quality: '4K • 2160p',
        resolution: '3840x2160',
        size: null,
        formattedSize: null,
        available: true,
      });
    }

    if (has1440) {
      formats.push({
        id: `yt-${videoId}-1440p`,
        type: 'video',
        container: 'mp4',
        quality: '2K • 1440p',
        resolution: '2560x1440',
        size: null,
        formattedSize: null,
        available: true,
      });
    }

    if (has1080 || (!ytInfo && type !== 'short')) {
      formats.push({
        id: `yt-${videoId}-1080p`,
        type: 'video',
        container: 'mp4',
        quality: '1080p • Full HD',
        resolution: '1920x1080',
        size: null,
        formattedSize: null,
        available: true,
        recommended: true,
      });
    }

    if (has720 || (!ytInfo)) {
      formats.push({
        id: `yt-${videoId}-720p`,
        type: 'video',
        container: 'mp4',
        quality: '720p • HD',
        resolution: '1280x720',
        size: null,
        formattedSize: null,
        available: true,
        recommended: formats.length === 0,
      });
    }

    if (has480 || (!ytInfo)) {
      formats.push({
        id: `yt-${videoId}-480p`,
        type: 'video',
        container: 'mp4',
        quality: '480p',
        resolution: '854x480',
        size: null,
        formattedSize: null,
        available: true,
      });
    }

    if (has360 || formats.length === 0) {
      formats.push({
        id: `yt-${videoId}-360p`,
        type: 'video',
        container: 'mp4',
        quality: '360p',
        resolution: '640x360',
        size: null,
        formattedSize: null,
        available: true,
      });
    }

    const audioFormats: AudioFormat[] = [
      {
        id: `yt-${videoId}-audio-mp3`,
        type: 'audio',
        container: 'mp3',
        bitrate: '320 kbps High Quality',
        size: null,
        formattedSize: null,
        available: true,
      },
      {
        id: `yt-${videoId}-audio-m4a`,
        type: 'audio',
        container: 'm4a',
        bitrate: 'Original Quality',
        size: null,
        formattedSize: null,
        available: true,
      },
    ];

    return {
      id: videoId,
      platform: 'youtube',
      type,
      title,
      creator,
      thumbnail,
      duration,
      formattedDuration,
      originalUrl: targetUrl,
      formats,
      audioFormats,
    };
  }

  async getDownloadStream(mediaId: string, formatId: string, originalUrl: string): Promise<StreamResult> {
    const videoId = mediaId || this.extractVideoId(originalUrl)?.id || 'media';
    const targetUrl = originalUrl || `https://www.youtube.com/watch?v=${videoId}`;

    // 1. Primary: Use ytDlpService for reliable high-res & DASH stream extraction
    try {
      return await ytDlpService.getMediaStream(targetUrl, formatId, `YouTube_${videoId}`);
    } catch (ytDlpErr) {
      console.warn('[YouTubeProvider] ytDlpService stream failed, falling back to ytdl-core:', ytDlpErr);
    }

    // 2. Fallback: Pure JS ytdl-core with safe error event trapping
    const isAudio = formatId.includes('audio');
    const isMp3 = formatId.includes('mp3');
    const ext = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
    const mime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';

    const stream = ytdl(targetUrl, {
      quality: isAudio ? 'highestaudio' : 'highestvideo',
      filter: isAudio ? 'audioonly' : 'videoandaudio',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      },
    });

    return {
      stream: stream as unknown as NodeJS.ReadableStream,
      filename: `Downly_YouTube_${videoId}_${formatId}.${ext}`,
      mimeType: mime,
    };
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
