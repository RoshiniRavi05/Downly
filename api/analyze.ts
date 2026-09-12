export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method Not Allowed',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { url } = body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_URL',
        message: 'Please enter a valid Instagram or YouTube URL.',
      });
    }

    const trimmed = url.trim();

    // 1. YouTube Match
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      const isShort = trimmed.includes('/shorts/');
      
      let title = isShort ? `YouTube Short #${videoId}` : `YouTube Video (${videoId})`;
      let creator = 'YouTube Creator';
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      let duration = isShort ? 45 : 240;

      let availableHeights: number[] = [];

      // 1. Fetch official YouTube oEmbed metadata
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const data: any = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.author_name) creator = data.author_name;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {
        // Fallback to standard defaults
      }

      // 2. Query YouTube Innertube API to dynamically detect available video formats & durations
      try {
        const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/32.0.0.3.16.595166299 SamsungBrowser/4.0 Chrome/124.0.6367.207 Mobile VR Safari/537.36',
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                clientName: 'ANDROID_VR',
                clientVersion: '1.56.20',
                deviceModel: 'Quest 3',
              },
            },
          }),
        });

        if (innertubeRes.ok) {
          const data: any = await innertubeRes.json();
          if (data?.videoDetails) {
            if (data.videoDetails.title) title = data.videoDetails.title;
            if (data.videoDetails.author) creator = data.videoDetails.author;
            if (data.videoDetails.lengthSeconds) {
              const dur = parseInt(data.videoDetails.lengthSeconds, 10);
              if (!isNaN(dur) && dur > 0) duration = dur;
            }
          }
          const allFormats = [
            ...(data?.streamingData?.formats || []),
            ...(data?.streamingData?.adaptiveFormats || []),
          ];
          availableHeights = allFormats
            .map((f: any) => f.height)
            .filter((h: any): h is number => typeof h === 'number' && h > 0);
        }
      } catch {
        // Non-critical
      }

      const formattedDuration = `${Math.floor(duration / 60)
        .toString()
        .padStart(2, '0')}:${Math.floor(duration % 60)
        .toString()
        .padStart(2, '0')}`;

      const has2160 = availableHeights.some((h) => h >= 1440);
      const has1440 = availableHeights.some((h) => h >= 1080 && h < 1440);
      const has1080 = availableHeights.length === 0 || availableHeights.some((h) => h >= 800 && h < 1080);
      const has720 = availableHeights.length === 0 || availableHeights.some((h) => h >= 530 && h < 800);
      const has480 = availableHeights.length === 0 || availableHeights.some((h) => h >= 350 && h < 530);
      const has360 = availableHeights.length === 0 || availableHeights.some((h) => h >= 240 && h < 350);

      const formats: any[] = [];

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
      if (has1080) {
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
      if (has720) {
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
      if (has480) {
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

      const media = {
        id: videoId,
        platform: 'youtube',
        type: isShort ? 'short' : 'video',
        title,
        creator,
        thumbnail,
        duration,
        formattedDuration,
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        formats,
        audioFormats: [
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
        ],
      };

      return res.status(200).json({
        success: true,
        media,
      });
    }

    // 2. Instagram Match
    const igMatch = trimmed.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
    if (igMatch && igMatch[1]) {
      const shortcode = igMatch[1];
      const isReel = trimmed.includes('/reel') || trimmed.includes('/reels');

      let title = isReel ? `Instagram Reel #${shortcode}` : `Instagram Post #${shortcode}`;
      let creator = '@instagram_user';
      let thumbnail = `https://picsum.photos/seed/ig-${shortcode}/600/600`;
      const duration = isReel ? 30 : null;

      try {
        const oembedRes = await fetch(`https://api.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/`);
        if (oembedRes.ok) {
          const data: any = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.author_name) creator = `@${data.author_name.replace(/^@/, '')}`;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {
        // Fallback to standard defaults
      }

      const formattedDuration = duration
        ? `${Math.floor(duration / 60)
            .toString()
            .padStart(2, '0')}:${Math.floor(duration % 60)
            .toString()
            .padStart(2, '0')}`
        : null;

      const media = {
        id: shortcode,
        platform: 'instagram',
        type: isReel ? 'reel' : 'post',
        title,
        creator,
        thumbnail,
        duration,
        formattedDuration,
        originalUrl: `https://www.instagram.com/p/${shortcode}/`,
        formats: [
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
        ],
        audioFormats: [
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
        ],
      };

      return res.status(200).json({
        success: true,
        media,
      });
    }

    return res.status(400).json({
      success: false,
      code: 'UNSUPPORTED_PLATFORM',
      message: 'This platform is not supported yet. Please paste a YouTube or Instagram link.',
    });

  } catch (error: any) {
    console.error('[API Analyze Error]:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to extract media details.',
    });
  }
}
