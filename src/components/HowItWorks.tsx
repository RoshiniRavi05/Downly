import React from 'react';
import { Link2, Sliders, Download } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Paste Link',
      description: 'Copy any public Instagram Post, Reel, YouTube Video, or Shorts link and paste it into Downly.',
      icon: Link2,
      color: 'from-accent-violet to-indigo-500',
    },
    {
      number: '02',
      title: 'Choose Quality',
      description: 'Preview details and select your preferred available resolution (1080p, 720p, etc.) or audio format.',
      icon: Sliders,
      color: 'from-accent-blue to-cyan-500',
    },
    {
      number: '03',
      title: 'Download Media',
      description: 'Click download to instantly receive high-speed, direct media streams straight to your device.',
      icon: Download,
      color: 'from-indigo-500 to-accent-violet',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs font-bold text-accent-violet uppercase tracking-widest mb-3">
          Seamless Experience
        </h2>
        <p className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          How Downly Works in 3 Simple Steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="relative p-8 rounded-2xl glass-card border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:border-slate-700 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-3xl font-black text-slate-700 dark:text-slate-700 light:text-slate-300 group-hover:text-accent-violet transition-colors">
                  {step.number}
                </span>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white dark:text-white light:text-slate-900 mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
