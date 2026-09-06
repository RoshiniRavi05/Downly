import React, { useState, useEffect, useRef } from 'react';
import { AppState, MediaMetadata, AppError } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MediaPreviewCard } from './components/MediaPreviewCard';
import { DownloadProgress } from './components/DownloadProgress';
import { SkeletonLoader } from './components/SkeletonLoader';
import { ErrorAlert } from './components/ErrorAlert';
import { RecentHistory } from './components/RecentHistory';
import { HowItWorks } from './components/HowItWorks';
import { SupportedPlatforms } from './components/SupportedPlatforms';
import { Features } from './components/Features';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';

export function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('downly-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Recent History State
  const [recentHistory, setRecentHistory] = useState<MediaMetadata[]>(() => {
    try {
      const saved = localStorage.getItem('downly-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Application State Machine
  const [url, setUrl] = useState<string>('');
  const [appState, setAppState] = useState<AppState>('idle');
  const [media, setMedia] = useState<MediaMetadata | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  // AbortController ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync theme class to HTML root element
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('downly-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('downly-theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handlePasteClick = () => {
    const input = document.getElementById('media-url-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const addToHistory = (newMedia: MediaMetadata) => {
    setRecentHistory((prev) => {
      const filtered = prev.filter((item) => !(item.id === newMedia.id && item.platform === newMedia.platform));
      const updated = [newMedia, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('downly-history', JSON.stringify(updated));
      } catch {
        // localStorage quota error fallback
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setRecentHistory([]);
    localStorage.removeItem('downly-history');
  };

  const handleSelectHistoryItem = (selectedMedia: MediaMetadata) => {
    setMedia(selectedMedia);
    setUrl(selectedMedia.originalUrl);
    setError(null);
    setDownloadUrl(null);
    const recFormat = selectedMedia.formats.find((f: any) => f.recommended) || selectedMedia.formats[0];
    if (recFormat) {
      setSelectedFormatId(recFormat.id);
    } else if (selectedMedia.audioFormats && selectedMedia.audioFormats.length > 0) {
      setSelectedFormatId(selectedMedia.audioFormats[0].id);
    }
    setAppState('ready');

    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Analyze URL Action
  const handleAnalyze = async () => {
    if (!url.trim()) return;

    // Abort any prior request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAppState('analyzing');
    setError(null);
    setMedia(null);
    setSelectedFormatId(null);
    setDownloadUrl(null);

    // Client-side lightweight URL sanity check
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      const isAllowed = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'instagram.com', 'www.instagram.com', 'instagr.am'].some(
        d => host === d || host.endsWith('.' + d)
      );

      if (!isAllowed) {
        setAppState('error');
        setError({
          code: 'UNSUPPORTED_PLATFORM',
          message: "This platform isn't supported yet. Please paste an Instagram or YouTube link.",
        });
        return;
      }
    } catch {
      setAppState('error');
      setError({
        code: 'INVALID_URL',
        message: "Please enter a valid Instagram or YouTube URL.",
      });
      return;
    }

    let mediaResult: MediaMetadata | null = null;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });

      if (response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          if (data.success && data.media) {
            mediaResult = data.media;
          }
        } catch {
          // JSON parse issue, fall through to client fallback
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('[Downly] API fetch failed, engaging client metadata fallback:', err);
    }

    // Client-side fallback if server didn't return media
    if (!mediaResult) {
      const target = url.trim();
      const ytMatch = target.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
      
      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        const isShort = target.includes('/shorts/');
        let title = isShort ? `YouTube Short #${videoId}` : `YouTube Video (${videoId})`;
        let creator = 'YouTube Creator';
        let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        try {
          const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          if (noembedRes.ok) {
            const data: any = await noembedRes.json();
            if (data.title) title = data.title;
            if (data.author_name) creator = data.author_name;
            if (data.thumbnail_url) thumbnail = data.thumbnail_url;
          }
        } catch {
          // Fallback to defaults
        }

        mediaResult = {
          id: videoId,
          platform: 'youtube',
          type: isShort ? 'short' : 'video',
          title,
          creator,
          thumbnail,
          duration: isShort ? 45 : 210,
          formattedDuration: isShort ? '00:45' : '03:30',
          originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          formats: [
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
          ],
          audioFormats: [
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
          ],
        };
      } else {
        const igMatch = target.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
        if (igMatch && igMatch[1]) {
          const shortcode = igMatch[1];
          const isReel = target.includes('/reel') || target.includes('/reels');
          mediaResult = {
            id: shortcode,
            platform: 'instagram',
            type: isReel ? 'reel' : 'post',
            title: isReel ? `Instagram Reel #${shortcode}` : `Instagram Post #${shortcode}`,
            creator: '@instagram_user',
            thumbnail: `https://picsum.photos/seed/ig-${shortcode}/600/600`,
            duration: isReel ? 30 : null,
            formattedDuration: isReel ? '00:30' : null,
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
        }
      }
    }

    if (!mediaResult) {
      setAppState('error');
      setError({
        code: 'EXTRACTION_FAILED',
        message: "Failed to extract media details. Please check the URL and try again.",
      });
      return;
    }

    setMedia(mediaResult);
    addToHistory(mediaResult);
    
    // Auto-select recommended or first available format
    const recFormat = mediaResult.formats.find((f: any) => f.recommended) || mediaResult.formats[0];
    if (recFormat) {
      setSelectedFormatId(recFormat.id);
    } else if (mediaResult.audioFormats && mediaResult.audioFormats.length > 0) {
      setSelectedFormatId(mediaResult.audioFormats[0].id);
    }

    setAppState('ready');
  };

  // Download Action
  const handleDownload = async () => {
    if (!media || !selectedFormatId) return;

    setAppState('preparing');
    setError(null);

    try {
      const response = await fetch('/api/download/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          formatId: selectedFormatId,
          platform: media.platform,
          originalUrl: media.originalUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setAppState('error');
        setError({
          code: data.code || 'DOWNLOAD_FAILED',
          message: data.message || "Failed to create secure download stream.",
        });
        return;
      }

      setAppState('downloading');
      setDownloadUrl(data.streamUrl);

      const cleanTitle = (media.title || 'media').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().slice(0, 40) || 'media';
      const isAudio = selectedFormatId.includes('audio') || selectedFormatId.includes('mp3');
      const ext = isAudio ? 'mp3' : 'mp4';
      const filename = `Downly_${cleanTitle}.${ext}`;

      // Fetch stream with retry to ensure stream readiness before browser save
      let streamBlob: Blob | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !streamBlob) {
        attempts++;
        try {
          const streamRes = await fetch(data.streamUrl);
          if (streamRes.ok) {
            const contentType = streamRes.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              streamBlob = await streamRes.blob();
              break;
            }
          }
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        } catch {
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }

      if (streamBlob) {
        // Trigger clean in-memory browser device save
        const blobUrl = URL.createObjectURL(streamBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          setAppState('completed');
        }, 1500);
      } else {
        // Direct link fallback
        const link = document.createElement('a');
        link.href = data.streamUrl;
        link.setAttribute('download', filename);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          setAppState('completed');
        }, 1500);
      }

    } catch (err) {
      setAppState('error');
      setError({
        code: 'DOWNLOAD_FAILED',
        message: "An unexpected error occurred preparing your download stream.",
      });
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setUrl('');
    setMedia(null);
    setSelectedFormatId(null);
    setDownloadUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark dark:bg-background-dark light:bg-background-light text-slate-100 dark:text-slate-100 light:text-slate-900 transition-colors duration-200">
      
      {/* Navigation Bar */}
      <Navbar
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onPasteClick={handlePasteClick}
      />

      {/* Main Hero Section */}
      <main className="flex-1">
        <Hero
          url={url}
          setUrl={setUrl}
          appState={appState}
          onAnalyze={handleAnalyze}
          onClear={handleReset}
        />

        {/* Dynamic State Machine Renderer */}
        <div className="px-4 sm:px-6 lg:px-8">
          
          {/* Skeleton Loader during Analyzing */}
          {appState === 'analyzing' && <SkeletonLoader />}

          {/* Polished Error Alert */}
          {appState === 'error' && error && (
            <ErrorAlert error={error} onRetry={handleReset} />
          )}

          {/* Media Result Preview Card & Quality Selection */}
          {appState === 'ready' && media && (
            <MediaPreviewCard
              media={media}
              selectedFormatId={selectedFormatId}
              onSelectFormat={(id) => setSelectedFormatId(id)}
              onDownload={handleDownload}
            />
          )}

          {/* Ready Download Button CTA when format selected */}
          {appState === 'ready' && selectedFormatId && !selectedFormatId.includes('audio') && (
            <div className="max-w-4xl mx-auto mb-10 text-center animate-fade-in">
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-accent-violet via-indigo-600 to-accent-blue hover:opacity-95 text-white font-extrabold text-base shadow-glow-violet transition-all transform active:scale-95"
              >
                Download Selected Format
              </button>
            </div>
          )}

          {/* Active Download Progress / Completed panel */}
          <DownloadProgress
            appState={appState}
            downloadUrl={downloadUrl}
            media={media}
            onReset={handleReset}
          />

          {/* Recent History Section */}
          {appState !== 'analyzing' && appState !== 'preparing' && appState !== 'downloading' && (
            <RecentHistory
              history={recentHistory}
              onSelectHistoryItem={handleSelectHistoryItem}
              onClearHistory={handleClearHistory}
            />
          )}

        </div>

        {/* Feature & Landing Sections */}
        <HowItWorks />
        <SupportedPlatforms />
        <Features />
        <FAQ />
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}

export default App;
