import React from 'react';
import { Zap, Sliders, Music, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';

export const Features: React.FC = () => {
  const features = [
    {
      title: 'Fast Processing',
      description: 'Stream directly from content sources with minimal latency and high-performance server pipelines.',
      icon: Zap,
      color: 'text-amber-400',
    },
    {
      title: 'Quality Selection',
      description: 'Choose from 4K, 1080p Full HD, 720p HD, 480p, or 360p based on actual source formats.',
      icon: Sliders,
      color: 'text-accent-violet',
    },
    {
      title: 'Audio Downloads',
      description: 'Extract standalone audio tracks in MP3 or M4A formats whenever legally permitted by the content.',
      icon: Music,
      color: 'text-accent-blue',
    },
    {
      title: 'Secure & Private',
      description: 'Server-side domain allowlisting, SSRF protection, signed short-lived download tokens, and rate limits.',
      icon: ShieldCheck,
      color: 'text-emerald-400',
    },
    {
      title: 'Mobile Friendly',
      description: 'Fully responsive UI optimized for single-hand mobile touch screens and desktop browsers alike.',
      icon: Smartphone,
      color: 'text-cyan-400',
    },
    {
      title: 'Automatic Temp Cleanup',
      description: 'Temporary streaming files automatically expire and are purged from storage after 5 minutes.',
      icon: Trash2,
      color: 'text-rose-400',
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs font-bold text-accent-violet uppercase tracking-widest mb-3">
          Built for Excellence
        </h2>
        <p className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          Engineered for Speed & Security
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="p-6 rounded-2xl glass-card border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:border-slate-700 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Icon className={`w-6 h-6 ${feat.color}`} />
              </div>
              <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900 mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
