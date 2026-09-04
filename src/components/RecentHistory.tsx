import React from 'react';
import { MediaMetadata } from '../types';
import { History, Trash2, ArrowUpRight, Youtube, Instagram, Clock } from 'lucide-react';

interface RecentHistoryProps {
  history: MediaMetadata[];
  onSelectHistoryItem: (media: MediaMetadata) => void;
  onClearHistory: () => void;
}

export const RecentHistory: React.FC<RecentHistoryProps> = ({
  history,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  if (!history || history.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-6 animate-fade-in">
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 mb-4">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-accent-violet" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
              Recent Analyses ({history.length})
            </h3>
          </div>

          <button
            onClick={onClearHistory}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>

        {/* History Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {history.map((item) => {
            const isYouTube = item.platform === 'youtube';

            return (
              <div
                key={`${item.platform}-${item.id}`}
                onClick={() => onSelectHistoryItem(item)}
                className="group relative p-3 rounded-xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:border-slate-700 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center space-x-3"
              >
                {/* Small Thumbnail */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-1 left-1 p-0.5 rounded bg-black/60 backdrop-blur-xs">
                    {isYouTube ? (
                      <Youtube className="w-2.5 h-2.5 text-red-500" />
                    ) : (
                      <Instagram className="w-2.5 h-2.5 text-pink-500" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white dark:text-white light:text-slate-900 truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.creator}
                  </p>
                  {item.formattedDuration && (
                    <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400 mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.formattedDuration}</span>
                    </div>
                  )}
                </div>

                {/* Select Icon */}
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-accent-violet transition-colors flex-shrink-0" />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
