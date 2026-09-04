import React from 'react';
import { MediaMetadata, VideoFormat, AudioFormat } from '../types';
import { Youtube, Instagram, Clock, User, ExternalLink, Video, Music } from 'lucide-react';
import { QualitySelector } from './QualitySelector';
import { AudioSelector } from './AudioSelector';

interface MediaPreviewCardProps {
  media: MediaMetadata;
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string) => void;
  onDownload: () => void;
}

export const MediaPreviewCard: React.FC<MediaPreviewCardProps> = ({
  media,
  selectedFormatId,
  onSelectFormat,
  onDownload,
}) => {
  const isYouTube = media.platform === 'youtube';

  return (
    <div className="w-full max-w-4xl mx-auto my-8 animate-slide-up">
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Top Media Info Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-6 pb-6 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          
          {/* Thumbnail Box */}
          <div className="relative w-full md:w-56 h-48 sm:h-36 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 group">
            <img
              src={media.thumbnail}
              alt={media.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Duration Tag */}
            {media.formattedDuration && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[11px] font-mono font-medium text-white flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-300" />
                <span>{media.formattedDuration}</span>
              </div>
            )}

            {/* Platform Badge overlay */}
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-xs font-semibold text-white flex items-center space-x-1.5">
              {isYouTube ? (
                <Youtube className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
              )}
              <span className="capitalize">{media.platform}</span>
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-xs font-semibold text-accent-violet mb-2 uppercase tracking-wide">
              <span>{media.type}</span>
              <span>•</span>
              <span className="text-slate-400 capitalize">{media.platform}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white dark:text-white light:text-slate-900 truncate max-w-xl mb-3 leading-snug">
              {media.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-400 light:text-slate-600">
              <div className="flex items-center space-x-1.5 bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 px-2.5 py-1 rounded-md">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-300 dark:text-slate-300 light:text-slate-700">{media.creator}</span>
              </div>

              <a
                href={media.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                <span>Original Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* Media Format Options Selection */}
        <div className="mt-8 space-y-8">
          
          {/* Video Options Section */}
          {media.formats && media.formats.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Video className="w-4 h-4 text-accent-violet" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
                  Video Quality Options
                </h3>
              </div>

              <QualitySelector
                formats={media.formats}
                selectedFormatId={selectedFormatId}
                onSelectFormat={onSelectFormat}
              />
            </div>
          )}

          {/* Audio Options Section */}
          {media.audioFormats && media.audioFormats.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Music className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
                  Audio Options
                </h3>
              </div>

              <AudioSelector
                audioFormats={media.audioFormats}
                selectedFormatId={selectedFormatId}
                onSelectFormat={onSelectFormat}
                onDownload={onDownload}
              />
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
