import React, { useState } from 'react';
import { AppState, MediaMetadata } from '../types';
import { Download, CheckCircle2, Loader2, RefreshCw, Music, Video, Sparkles } from 'lucide-react';

interface DownloadProgressProps {
  appState: AppState;
  downloadUrl: string | null;
  media: MediaMetadata | null;
  onReset: () => void;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  appState,
  downloadUrl,
  media,
  onReset,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  if (appState !== 'preparing' && appState !== 'downloading' && appState !== 'completed') {
    return null;
  }

  const isPreparing = appState === 'preparing';
  const isDownloading = appState === 'downloading';
  const isCompleted = appState === 'completed';

  const isYouTube = media?.platform === 'youtube';
  const videoId = media?.id || '';

  const handleSaveToDevice = async () => {
    if (!downloadUrl) return;
    setDownloading(true);
    setDownloadStatus('Starting download to your device...');

    const cleanTitle = (media?.title || 'video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().slice(0, 35) || 'video';
    const filename = `Downly_${cleanTitle}.mp4`;

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      setDownloadStatus('Saving file...');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
        setDownloading(false);
        setDownloadStatus('Download completed!');
        setTimeout(() => setDownloadStatus(null), 3000);
      }, 1000);

    } catch {
      // Fallback direct link download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
      setDownloadStatus(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-6 animate-slide-up">
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-2xl text-center">
        
        {/* Preparing State */}
        {isPreparing && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-accent-violet/20 text-accent-violet flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900">
                Resolving media streams...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Connecting to high-speed CDN for {media?.title ? `"${media.title.slice(0, 45)}..."` : 'your media'}.
              </p>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-accent-violet via-accent-blue to-accent-violet animate-shimmer" />
            </div>
          </div>
        )}

        {/* Downloading State */}
        {isDownloading && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900">
                Preparing download...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generating secure download tokens.
              </p>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
              <div className="w-full h-full bg-accent-blue animate-pulse" />
            </div>
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="space-y-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white dark:text-white light:text-slate-900">
                Ready to Download!
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {media?.title ? `"${media.title.slice(0, 55)}"` : 'Your media is prepared.'}
              </p>
            </div>

            {/* Direct High-Speed Downloader Widget for YouTube */}
            {isYouTube && videoId && (
              <div className="bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 rounded-2xl p-5 border border-slate-800 dark:border-slate-800 light:border-slate-300 shadow-inner">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Sparkles className="w-4 h-4 text-accent-violet" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
                    Instant File Downloader
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-700/50 dark:border-slate-700/50 light:border-slate-300 bg-black/40 flex items-center justify-center min-h-[65px]">
                  <iframe
                    src={`https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=720&color=8b5cf6`}
                    title="Download Button"
                    className="w-full h-[65px] border-0"
                    scrolling="no"
                  />
                </div>
                
                <p className="text-[11px] text-slate-400 mt-2">
                  Click the button above to choose HD Video (1080p/720p) or MP3 Audio to save directly to your device.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {downloadUrl && (
                  <button
                    onClick={handleSaveToDevice}
                    disabled={downloading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{downloading ? (downloadStatus || 'Downloading...') : 'Save Video to Downloads'}</span>
                  </button>
                )}

                {isYouTube && (
                  <a
                    href={`https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent-violet to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <Music className="w-4 h-4" />
                    <span>Download MP3 Audio</span>
                  </a>
                )}
              </div>

              {downloadStatus && (
                <p className="text-xs text-emerald-400 font-medium animate-fade-in">
                  {downloadStatus}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
              <button
                onClick={onReset}
                className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors inline-flex items-center space-x-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Download Another Link</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
