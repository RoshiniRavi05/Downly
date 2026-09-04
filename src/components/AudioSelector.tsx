import React from 'react';
import { AudioFormat } from '../types';
import { Music, Headphones, Download } from 'lucide-react';

interface AudioSelectorProps {
  audioFormats: AudioFormat[];
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string) => void;
  onDownload: () => void;
}

export const AudioSelector: React.FC<AudioSelectorProps> = ({
  audioFormats,
  selectedFormatId,
  onSelectFormat,
  onDownload,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {audioFormats.map((audio) => {
          const isSelected = selectedFormatId === audio.id;

          return (
            <div
              key={audio.id}
              onClick={() => onSelectFormat(audio.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                isSelected
                  ? 'bg-gradient-to-r from-accent-blue/20 to-slate-900 border-accent-blue shadow-glow-blue scale-[1.01]'
                  : 'bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-accent-blue/20 text-accent-blue' : 'bg-slate-800 text-slate-400'}`}>
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white dark:text-white light:text-slate-900 flex items-center space-x-2">
                    <span className="uppercase">{audio.container}</span>
                    <span className="text-xs text-slate-400 font-normal">• {audio.bitrate}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Audio Only Stream
                  </div>
                </div>
              </div>

              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                isSelected ? 'border-accent-blue bg-accent-blue' : 'border-slate-600'
              }`}>
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Download Audio CTA */}
      {selectedFormatId && selectedFormatId.includes('audio') && (
        <div className="pt-2">
          <button
            onClick={onDownload}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-accent-blue/90 hover:to-accent-indigo/90 text-white font-bold text-sm shadow-glow-blue transition-all transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Audio</span>
          </button>
        </div>
      )}
    </div>
  );
};
