import React, { useState } from 'react';
import { AppState, MediaMetadata } from '../types';
import { Download, CheckCircle2, Loader2, RefreshCw, Music } from 'lucide-react';

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

  const handleDownloadFile = async (type: 'video' | 'audio' = 'video') => {
    setDownloading(true);
    setDownloadStatus(type === 'video' ? 'Connecting to secure stream...' : 'Extracting MP3 audio stream...');

    const cleanTitle = (media?.title || 'media').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().slice(0, 40) || 'media';
    const ext = type === 'audio' ? 'mp3' : 'mp4';
    const filename = `Downly_${cleanTitle}.${ext}`;

    const originalUrl = media?.originalUrl || (isYouTube ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.instagram.com/p/${videoId}/`);
    const formatId = type === 'audio' ? `${media?.id || 'media'}-audio-mp3` : `${media?.id || 'media'}-720p`;

    try {
      // 1. Obtain a signed download token
      const tokenRes = await fetch('/api/download/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media?.id || 'media',
          formatId,
          platform: media?.platform || 'youtube',
          originalUrl,
        }),
      });

      let finalStreamUrl = downloadUrl;

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.success && tokenData.streamUrl) {
          finalStreamUrl = tokenData.streamUrl;
        }
      }

      if (!finalStreamUrl) {
        throw new Error('Could not generate download stream URL');
      }

      setDownloadStatus('Saving file to your Downloads folder...');

      // 2. Trigger direct device download via anchor click
      const link = document.createElement('a');
      link.href = finalStreamUrl;
      link.setAttribute('download', filename);
      link.target = '_self';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStatus('Download started! Check your downloads.');
      setTimeout(() => {
        setDownloading(false);
        setDownloadStatus(null);
      }, 4000);

    } catch (err: any) {
      console.warn('[Downly] Download stream error:', err);
      setDownloadStatus('Retrying direct download...');
      
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => {
        setDownloading(false);
        setDownloadStatus(null);
      }, 2500);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto my-6 animate-slide-up">
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
                Connecting to high-speed stream for {media?.title ? `"${media.title.slice(0, 45)}..."` : 'your media'}.
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
                Generating secure download stream.
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
                Ready to Save!
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium line-clamp-1">
                {media?.title || 'Your file is ready to download.'}
              </p>
            </div>

            {/* Clean Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleDownloadFile('video')}
                  disabled={downloading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{downloading ? (downloadStatus || 'Downloading...') : 'Download Video (MP4)'}</span>
                </button>

                {isYouTube && (
                  <button
                    onClick={() => handleDownloadFile('audio')}
                    disabled={downloading}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent-violet to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <Music className="w-4 h-4" />
                    <span>Download Audio (MP3)</span>
                  </button>
                )}
              </div>

              {downloadStatus && (
                <p className="text-xs text-emerald-400 font-medium animate-fade-in pt-1">
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
