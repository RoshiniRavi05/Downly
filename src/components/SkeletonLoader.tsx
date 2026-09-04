import React from 'react';
import { Loader2 } from 'lucide-react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto my-8 animate-slide-up">
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-2xl space-y-6">
        
        {/* Loading Indicator Header */}
        <div className="flex items-center space-x-3 text-accent-violet">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Analyzing your link...</span>
        </div>

        {/* Top Info Skeleton */}
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 pb-6 border-b border-slate-800/80">
          <div className="w-full md:w-56 h-36 rounded-xl bg-slate-800/60 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-4 w-24 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-6 w-3/4 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>

        {/* Quality Cards Grid Skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-36 bg-slate-800/60 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
