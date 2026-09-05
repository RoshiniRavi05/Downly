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

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });

      let data: any = {};
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[Downly] Non-JSON API Response:', text);
        setAppState('error');
        setError({
          code: 'SERVER_ERROR',
          message: !response.ok
            ? `Server Error (${response.status}). ${text.slice(0, 120)}`
            : "Invalid response format from server.",
        });
        return;
      }

      if (!response.ok || !data.success) {
        setAppState('error');
        setError({
          code: data.code || 'SERVER_ERROR',
          message: data.message || "Failed to extract metadata for this URL.",
        });
        return;
      }

      setMedia(data.media);
      addToHistory(data.media);
      
      // Auto-select recommended or first available format
      const recFormat = data.media.formats.find((f: any) => f.recommended) || data.media.formats[0];
      if (recFormat) {
        setSelectedFormatId(recFormat.id);
      } else if (data.media.audioFormats && data.media.audioFormats.length > 0) {
        setSelectedFormatId(data.media.audioFormats[0].id);
      }

      setAppState('ready');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[Downly Fetch Error]:', err);

      setAppState('error');
      setError({
        code: 'NETWORK_ERROR',
        message: err.message ? `Network Error: ${err.message}` : "Network error occurred while processing link. Please check server connection.",
      });
    }
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

      // Short delay for realistic stream readiness state
      setTimeout(() => {
        setDownloadUrl(data.streamUrl);
        setAppState('completed');
      }, 1200);

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
