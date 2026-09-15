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

    const host = (process.env.RAPIDAPI_HOST || CONFIG.RAPIDAPI_HOST || 'youtube-video-downloader49.p.rapidapi.com').trim();
    const endpoint = (process.env.RAPIDAPI_ENDPOINT || (CONFIG as any).RAPIDAPI_ENDPOINT || `https://${host}/download.php`).trim();
    const targetUrl = originalUrl || `https://www.youtube.com/watch?v=${videoId}`;

    const isAudio = formatId.includes('audio') || formatId.includes('mp3');
    const isMp3 = formatId.includes('mp3');

    try {
      let res: Response;

      // Strategy 1: POST form-urlencoded (youtube-video-downloader49 / download.php)
      if (endpoint.includes('download.php') || host.includes('youtube-video-downloader49') || host.includes('downloader49')) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': host,
            'Accept': 'application/json',
          },
          body: new URLSearchParams({ url: targetUrl }),
          signal: AbortSignal.timeout(15000),
        });
      } else if (host.includes('youtube-video-and-shorts')) {
        // Strategy 2: GET api/video
        res = await fetch(`https://${host}/api/video?url=${encodeURIComponent(targetUrl)}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': host,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        });
      } else {
        // Strategy 3: GET video details
        res = await fetch(`https://${host}/v2/video/details?videoId=${encodeURIComponent(videoId)}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': host,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        });
      }

      if (!res.ok) {
        console.warn(`[RapidApiService] HTTP ${res.status} from ${host}`);
        return null;
      }

      const data: any = await res.json();
      if (!data) return null;

      // Parser A: data.medias array (youtube-video-downloader49 / publer-media)
      if (Array.isArray(data.medias) && data.medias.length > 0) {
        const medias = data.medias;

        if (isAudio) {
          const audio = medias.find((m: any) => m.type === 'audio' || m.ext === 'mp3' || m.ext === 'm4a')
            || medias.find((m: any) => (m.quality || '').includes('audio'));
          const audioUrl = audio?.url || audio?.download_url;
          if (audioUrl) {
            return {
              url: audioUrl,
              mimeType: isMp3 ? 'audio/mpeg' : 'audio/mp4',
            };
          }
        }

        // Match video resolutions
        let targetMedia: any = null;

        if (formatId.includes('2160') || formatId.includes('4k')) {
          targetMedia = medias.find((m: any) => (m.quality?.includes('2160') || m.quality?.includes('4k')) && m.ext === 'mp4');
        } else if (formatId.includes('1440') || formatId.includes('2k')) {
          targetMedia = medias.find((m: any) => m.quality?.includes('1440') && m.ext === 'mp4');
        } else if (formatId.includes('1080')) {
          targetMedia = medias.find((m: any) => m.quality?.includes('1080') && m.ext === 'mp4')
            || medias.find((m: any) => m.quality?.includes('1080'));
        } else if (formatId.includes('720')) {
          targetMedia = medias.find((m: any) => m.quality?.includes('720') && m.ext === 'mp4')
            || medias.find((m: any) => m.quality?.includes('720'));
        } else if (formatId.includes('480')) {
          targetMedia = medias.find((m: any) => m.quality?.includes('480') && m.ext === 'mp4');
        } else if (formatId.includes('360')) {
          targetMedia = medias.find((m: any) => m.quality?.includes('360') && m.ext === 'mp4');
        }

        // Fallback to highest quality MP4 video
        if (!targetMedia) {
          targetMedia = medias.find((m: any) => m.type === 'video' && m.ext === 'mp4')
            || medias.find((m: any) => m.ext === 'mp4')
            || medias[0];
        }

        const videoUrl = targetMedia?.url || targetMedia?.download_url;
        if (videoUrl) {
          return {
            url: videoUrl,
            mimeType: 'video/mp4',
            quality: targetMedia.quality,
          };
        }
      }

      // Parser B: youtube-media-downloader (data.videos.items / data.audios.items)
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
          let target = videoItems.find((v: any) => {
            if (formatId.includes('1080') && v.quality?.includes('1080')) return true;
            if (formatId.includes('720') && v.quality?.includes('720')) return true;
            if (formatId.includes('480') && v.quality?.includes('480')) return true;
            if (formatId.includes('360') && v.quality?.includes('360')) return true;
            return false;
          });

          if (!target) target = videoItems[0];

          if (target?.url) {
            return {
              url: target.url,
              mimeType: 'video/mp4',
              quality: target.quality,
            };
          }
        }
      }

      // Parser C: Generic format array
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

      // Parser D: Direct download url
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
