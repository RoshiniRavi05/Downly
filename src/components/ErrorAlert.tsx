import React from 'react';
import { AppError } from '../types';
import { AlertTriangle, ShieldAlert, Lock, Clock, Server, RefreshCw, ExternalLink, Video, Music } from 'lucide-react';

interface ErrorAlertProps {
  error: AppError;
  url?: string;
  onRetry: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, url, onRetry }) => {
  const getErrorDetails = () => {
    switch (error.code) {
      case 'INVALID_URL':
        return {
          icon: AlertTriangle,
          title: "Invalid URL Format",
          message: "Please enter a valid Instagram (Post/Reels) or YouTube (Video/Shorts) URL.",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        };
      case 'UNSUPPORTED_PLATFORM':
        return {
          icon: ShieldAlert,
          title: "Unsupported Platform",
          message: "This platform isn't supported yet. Downly currently handles Instagram and YouTube links.",
          color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
        };
      case 'PRIVATE_CONTENT':
        return {
          icon: Lock,
          title: "Private or Restricted Media",
          message: "This content appears to be private, restricted, or protected. Downly only processes public media.",
          color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        };
      case 'RATE_LIMITED':
        return {
          icon: Clock,
          title: "Rate Limit Exceeded",
          message: "You're sending requests too quickly. Please wait a minute and try again.",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        };
      default:
        return {
          icon: Server,
          title: "Host Stream Restricted",
          message: error.message || "This content is protected by YouTube/Instagram. Use our Direct Saver Backup below to download immediately.",
          color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        };
    }
  };

  const details = getErrorDetails();
  const Icon = details.icon;

  // Extract YouTube ID or Instagram URL for direct backup links
  const targetUrl = (url || '').trim();
  const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  const videoId = ytMatch ? ytMatch[1] : null;
  const igMatch = targetUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
  const igShortcode = igMatch ? igMatch[1] : null;

  const ssYoutubeUrl = videoId ? `https://ssyoutube.com/watch?v=${videoId}` : null;
  const loaderUrl = videoId ? `https://loader.to/ajax/download.php?button=1&start=1&end=1&format=720&url=${encodeURIComponent(targetUrl)}` : null;
  const ddIgUrl = igShortcode ? `https://ddinstagram.com/reel/${igShortcode}/` : null;

  return (
    <div className="w-full max-w-2xl mx-auto my-6 animate-slide-up space-y-4">
      <div className={`p-6 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${details.color}`}>
        <div className="flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-black/20 flex-shrink-0 mt-0.5 sm:mt-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
              {details.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 mt-1 leading-relaxed">
              {details.message}
            </p>
          </div>
        </div>

        <button
          onClick={onRetry}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-white hover:bg-slate-900 text-white dark:text-white light:text-slate-900 font-semibold text-xs border border-slate-700/60 dark:border-slate-700/60 light:border-slate-300 transition-colors flex items-center justify-center space-x-1.5 flex-shrink-0 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>

      {/* Direct Converter Backup Buttons when stream host is restricted */}
      {(videoId || igShortcode) && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg text-left space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-accent-violet">
            <ExternalLink className="w-4 h-4" />
            <span>Direct Media Downloader Backup</span>
          </div>
          <p className="text-xs text-slate-400">
            Due to host restrictions on this specific link, use these direct 1-click saver links to download your file:
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {videoId && (
              <>
                <a
                  href={ssYoutubeUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-accent-violet to-indigo-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Download Video (MP4)</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>

                <a
                  href={`https://y2mate.is/en/youtube-downloader/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-teal-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
                >
                  <Music className="w-4 h-4" />
                  <span>Download Audio (MP3)</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </>
            )}

            {igShortcode && ddIgUrl && (
              <a
                href={ddIgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <Video className="w-4 h-4" />
                <span>Save Instagram Reel / Post (MP4)</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

