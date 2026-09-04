import React from 'react';
import { AppError } from '../types';
import { AlertTriangle, ShieldAlert, Lock, Clock, Server, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  error: AppError;
  onRetry: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onRetry }) => {
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
          title: "Unable to Process Link",
          message: error.message || "We couldn't process this content right now. Please check the URL and try again later.",
          color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        };
    }
  };

  const details = getErrorDetails();
  const Icon = details.icon;

  return (
    <div className="w-full max-w-2xl mx-auto my-6 animate-slide-up">
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
    </div>
  );
};
