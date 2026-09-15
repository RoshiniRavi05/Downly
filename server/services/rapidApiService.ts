import { CONFIG } from '../config/index';

export interface RapidApiStreamResult {
  url: string;
  mimeType: string;
  quality?: string;
}

export class RapidApiService {
  /**
   * Checks if RapidAPI integration is enabled via environment variables.
   */
  public static isConfigured(): boolean {
    const key = process.env.RAPIDAPI_KEY || CONFIG.RAPIDAPI_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Extracts YouTube stream URL using RapidAPI when deployed to serverless environments.
   */
  public static async resolveStream(
    videoId: string,
    originalUrl: string,
    formatId: string
  ): Promise<RapidApiStreamResult | null> {
    const apiKey = (process.env.RAPIDAPI_KEY || CONFIG.RAPIDAPI_KEY || '').trim();
    if (!apiKey) {
      return null;
    }

    const host = (process.env.RAPIDAPI_HOST || CONFIG.RAPIDAPI_HOST || 'youtube-media-downloader.p.rapidapi.com').trim();
    const isAudio = formatId.includes('audio') || formatId.includes('mp3');
    const isMp3 = formatId.includes('mp3');

    try {
      let endpointUrl: string;

      if (host.includes('youtube-media-downloader')) {
        endpointUrl = `https://${host}/v2/video/details?videoId=${encodeURIComponent(videoId)}`;
      } else if (host.includes('youtube-video-and-shorts')) {
        endpointUrl = `https://${host}/api/video?url=${encodeURIComponent(originalUrl || `https://www.youtube.com/watch?v=${videoId}`)}`;
      } else {
        // Generic fallback endpoint
        endpointUrl = `https://${host}/v2/video/details?videoId=${encodeURIComponent(videoId)}`;
      }

      const res = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': host,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        console.warn(`[RapidApiService] HTTP ${res.status} from ${host}`);
        return null;
      }

      const data: any = await res.json();
      if (!data) return null;

      // Structure A: youtube-media-downloader (data.videos.items / data.audios.items)
      if (data.videos || data.audios) {
        if (isAudio && data.audios?.items?.length > 0) {
          const audio = data.audios.items[0];
          if (audio?.url) {
            return {
              url: audio.url,
              mimeType: isMp3 ? 'audio/mpeg' : 'audio/mp4',
            };
          }
        }

        const videoItems = data.videos?.items || [];
        if (videoItems.length > 0) {
          // Find matching resolution
          let target = videoItems.find((v: any) => {
            if (formatId.includes('1080') && v.quality?.includes('1080')) return true;
            if (formatId.includes('720') && v.quality?.includes('720')) return true;
            if (formatId.includes('480') && v.quality?.includes('480')) return true;
            if (formatId.includes('360') && v.quality?.includes('360')) return true;
            return false;
          });

          // Fallback to highest quality available
          if (!target) {
            target = videoItems[0];
          }

          if (target?.url) {
            return {
              url: target.url,
              mimeType: 'video/mp4',
              quality: target.quality,
            };
          }
        }
      }

      // Structure B: Generic format array (data.formats or data.data)
      const formats = data.formats || data.data?.formats || (Array.isArray(data.data) ? data.data : []);
      if (Array.isArray(formats) && formats.length > 0) {
        if (isAudio) {
          const audio = formats.find((f: any) => f.mimeType?.includes('audio') || f.format?.includes('audio') || f.ext === 'mp3');
          if (audio?.url) {
            return {
              url: audio.url,
              mimeType: isMp3 ? 'audio/mpeg' : 'audio/mp4',
            };
          }
        }

        const video = formats.find((f: any) => f.url && !f.mimeType?.includes('audio'));
        if (video?.url) {
          return {
            url: video.url,
            mimeType: 'video/mp4',
          };
        }
      }

      // Structure C: Direct download url (data.url or data.data?.url)
      const directUrl = data.url || data.downloadUrl || data.data?.url || data.data?.downloadUrl;
      if (typeof directUrl === 'string' && directUrl.startsWith('http')) {
        return {
          url: directUrl,
          mimeType: isAudio ? (isMp3 ? 'audio/mpeg' : 'audio/mp4') : 'video/mp4',
        };
      }

    } catch (err: any) {
      console.warn('[RapidApiService] Stream extraction error:', err?.message || err);
    }

    return null;
  }
}
