import React from 'react';
import { AppState, MediaMetadata } from '../types';
import { Download, CheckCircle2, Loader2, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';

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
  if (appState !== 'preparing' && appState !== 'downloading' && appState !== 'completed') {
    return null;
  }

  const isPreparing = appState === 'preparing';
  const isDownloading = appState === 'downloading';
  const isCompleted = appState === 'completed';

  const isYouTube = media?.platform === 'youtube';
  const videoId = media?.id || '';

  const ssUrl = isYouTube ? `https://www.ssyoutube.com/watch?v=${videoId}` : `https://snapinsta.app/`;
  const y2mateUrl = isYouTube ? `https://y2mate.is/en/youtube/${videoId}` : `https://fastdl.app/`;

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
                Preparing your download...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Resolving media streams for {media?.title ? `"${media.title.slice(0, 40)}..."` : 'your video'}.
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
                Ready to download!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Finalizing media download streams.
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
                Download is Ready!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {media?.title ? `"${media.title.slice(0, 50)}"` : 'Your media is prepared.'}
              </p>
            </div>

            {/* Primary & Mirror Download Action Buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File (Primary)</span>
                  </a>
                )}

                <a
                  href={ssUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent-violet to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mirror 1 (SS Server)</span>
                </a>
              </div>

              {/* Secondary Mirror Option */}
              <div className="pt-2">
                <a
                  href={y2mateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-accent-blue transition-colors"
                >
                  <span>Need an alternate mirror? Click here for Mirror 2</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
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
