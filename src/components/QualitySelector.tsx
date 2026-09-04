import React from 'react';
import { VideoFormat } from '../types';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface QualitySelectorProps {
  formats: VideoFormat[];
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  formats,
  selectedFormatId,
  onSelectFormat,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {formats.map((format) => {
        const isSelected = selectedFormatId === format.id;

        return (
          <button
            key={format.id}
            onClick={() => onSelectFormat(format.id)}
            disabled={!format.available}
            className={`relative flex flex-col justify-between p-4 rounded-xl text-left border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-violet ${
              isSelected
                ? 'bg-gradient-to-b from-accent-violet/20 to-slate-900 border-accent-violet shadow-glow-violet scale-[1.02]'
                : 'bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:border-slate-700 dark:hover:border-slate-700 light:hover:border-slate-300'
            } ${!format.available ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Recommended Tag */}
            {format.recommended && (
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-accent-violet to-accent-blue text-[10px] font-bold uppercase tracking-wider text-white flex items-center space-x-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Recommended</span>
              </div>
            )}

            {/* Top row: Quality and checkmark */}
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-base font-extrabold text-white dark:text-white light:text-slate-900">
                {format.quality}
              </span>
              
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                isSelected ? 'text-accent-violet' : 'text-slate-600'
              }`}>
                <CheckCircle2 className={`w-5 h-5 ${isSelected ? 'fill-accent-violet text-slate-950' : ''}`} />
              </div>
            </div>

            {/* Bottom details */}
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 mt-2 pt-2 border-t border-slate-800/40 dark:border-slate-800/40 light:border-slate-200">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
                {format.container}
              </span>
              <span className="font-mono">
                {format.formattedSize || format.resolution || 'Standard'}
              </span>
            </div>

          </button>
        );
      })}
    </div>
  );
};
