import React from 'react';
import { AppState } from '../types';
import { Download, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface DownloadProgressProps {
  appState: AppState;
  downloadUrl: string | null;
  onReset: () => void;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  appState,
  downloadUrl,
  onReset,
}) => {
  if (appState !== 'preparing' && appState !== 'downloading' && appState !== 'completed') {
    return null;
  }

  const isPreparing = appState === 'preparing';
  const isDownloading = appState === 'downloading';
  const isCompleted = appState === 'completed';

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
                Validating security tokens and resolving high-speed stream headers.
              </p>
            </div>
            {/* Indeterminate shimmer progress bar */}
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
                Downloading stream...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Fetching media directly from backend stream pipeline.
              </p>
            </div>
            {/* Indeterminate animated progress bar */}
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
                Your download is ready!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Click below to save the file to your device.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              )}

              <button
                onClick={onReset}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Download Another</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
