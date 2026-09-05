import { MediaProvider, StreamResult } from './MediaProvider';
import { MediaMetadata, VideoFormat, AudioFormat, MediaType } from '../types/index';
import { ytDlpService } from '../services/ytDlpService';
import ytdl from '@distube/ytdl-core';
import http from 'http';
import https from 'https';

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

    let metadataFetched = false;

    // 1. Try pure JS @distube/ytdl-core metadata extraction (Fastest & Serverless Native)
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
        metadataFetched = true;
      }
    } catch (ytdlErr) {
      console.warn('[YouTubeProvider] ytdl-core info failed, trying fallback:', ytdlErr);
    }

    // 2. Fallback to yt-dlp metadata extraction
    if (!metadataFetched) {
      try {
        const info = await ytDlpService.getVideoInfo(targetUrl);
        if (info.title) title = info.title;
        if (info.uploader || info.channel) creator = info.uploader || info.channel || creator;
        if (info.thumbnail) thumbnail = info.thumbnail;
        if (typeof info.duration === 'number' && info.duration > 0) duration = info.duration;
        metadataFetched = true;
      } catch (e) {
        // 3. Fallback to oEmbed parsing
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=${targetUrl}&format=json`;
          const oembedData = await this.fetchJson(oembedUrl);
          if (oembedData?.title) title = oembedData.title;
          if (oembedData?.author_name) creator = oembedData.author_name;
          if (oembedData?.thumbnail_url) thumbnail = oembedData.thumbnail_url;
        } catch (oembedErr: any) {
          if (oembedErr.statusCode === 404 || oembedErr.statusCode === 401 || oembedErr.statusCode === 403) {
            const err: any = new Error('Content unavailable or private');
            err.code = oembedErr.statusCode === 404 ? 'CONTENT_UNAVAILABLE' : 'PRIVATE_CONTENT';
            throw err;
          }
        }
      }
    }

    const formattedDuration = `${Math.floor(duration / 60)
      .toString()
      .padStart(2, '0')}:${Math.floor(duration % 60)
      .toString()
      .padStart(2, '0')}`;

    const formats: VideoFormat[] = [
      {
        id: `yt-${videoId}-1080p`,
        type: 'video',
        container: 'mp4',
        quality: '1080p • Full HD',
        resolution: '1920x1080',
        size: null,
        formattedSize: null,
        available: true,
        recommended: true,
      },
      {
        id: `yt-${videoId}-720p`,
        type: 'video',
        container: 'mp4',
        quality: '720p • HD',
        resolution: '1280x720',
        size: null,
        formattedSize: null,
        available: true,
      },
      {
        id: `yt-${videoId}-480p`,
        type: 'video',
        container: 'mp4',
        quality: '480p',
        resolution: '854x480',
        size: null,
        formattedSize: null,
        available: true,
      },
      {
        id: `yt-${videoId}-360p`,
        type: 'video',
        container: 'mp4',
        quality: '360p',
        resolution: '640x360',
        size: null,
        formattedSize: null,
        available: true,
      },
    ];

    const audioFormats: AudioFormat[] = [
      {
        id: `yt-${videoId}-audio-m4a`,
        type: 'audio',
        container: 'm4a',
        bitrate: 'Original Quality',
        size: null,
        formattedSize: null,
        available: true,
      },
      {
        id: `yt-${videoId}-audio-mp3`,
        type: 'audio',
        container: 'mp3',
        bitrate: '320 kbps High Quality',
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

    // Try pure JS ytdl streaming first
    try {
      const isAudio = formatId.includes('audio');
      const isMp3 = formatId.includes('mp3');
      const ext = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
      const mime = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';

      const stream = ytdl(targetUrl, {
        quality: isAudio ? 'highestaudio' : 'highestvideo',
        filter: isAudio ? 'audioonly' : 'videoandaudio',
      });

      return {
        stream: stream as unknown as NodeJS.ReadableStream,
        filename: `Downly_YouTube_${videoId}_${formatId}.${ext}`,
        mimeType: mime,
      };
    } catch (ytdlStreamErr) {
      console.warn('[YouTubeProvider] ytdl stream failed, falling back to ytDlpService:', ytdlStreamErr);
      return ytDlpService.getMediaStream(targetUrl, formatId, `YouTube_${videoId}`);
    }
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
