import React from 'react';
import { Instagram, Youtube, Film, Video, CheckCircle } from 'lucide-react';

export const SupportedPlatforms: React.FC = () => {
  const platforms = [
    {
      title: 'Instagram Posts',
      category: 'Instagram',
      icon: Instagram,
      color: 'text-pink-500',
      badgeBg: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
      description: 'Download public Instagram feed photo posts, multi-slide carousels, and single video posts in maximum available resolution.',
      tags: ['HD Photos', 'Video Posts', 'Carousels'],
    },
    {
      title: 'Instagram Reels',
      category: 'Instagram',
      icon: Film,
      color: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
      description: 'Extract public short-form Instagram Reels with crystal-clear audio track extraction and 1080p Full HD video streams.',
      tags: ['1080p Full HD', 'Original Audio', 'High Speed'],
    },
    {
      title: 'YouTube Videos',
      category: 'YouTube',
      icon: Youtube,
      color: 'text-red-500',
      badgeBg: 'bg-red-500/10 border-red-500/20 text-red-400',
      description: 'Process standard public YouTube video content with selectable resolutions from 360p up to 4K Ultra HD and audio tracks.',
      tags: ['4K Ultra HD', '1080p', 'Audio M4A/MP3'],
    },
    {
      title: 'YouTube Shorts',
      category: 'YouTube',
      icon: Video,
      color: 'text-red-400',
      badgeBg: 'bg-red-500/10 border-red-500/20 text-red-300',
      description: 'Download full-resolution vertical YouTube Shorts with instant metadata extraction and zero loss in video frame quality.',
      tags: ['Vertical HD', 'Fast Parsing', 'Audio Only'],
    },
  ];

  return (
    <section id="supported-platforms" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs font-bold text-accent-blue uppercase tracking-widest mb-3">
          Supported Ecosystem
        </h2>
        <p className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          Supported Platforms & Formats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="p-8 rounded-2xl glass-card border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300">
                      <Icon className={`w-6 h-6 ${p.color}`} />
                    </div>
                    <div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${p.badgeBg}`}>
                        {p.category}
                      </span>
                      <h3 className="text-xl font-bold text-white dark:text-white light:text-slate-900 mt-1">
                        {p.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed mb-6">
                  {p.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/40 dark:border-slate-800/40 light:border-slate-200">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
