import React, { useState } from 'react';
import { Download, ShieldAlert } from 'lucide-react';
import { PrivacyModal } from './PrivacyModal';

export const Footer: React.FC = () => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 py-12 px-4 sm:px-6 lg:px-8 text-slate-400">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        
        {/* Brand Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent-violet to-accent-blue flex items-center justify-center text-white font-bold">
              <Download className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white dark:text-white light:text-slate-900">
              DOWNLY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
            Production-quality, fast, and secure social media utility. Download supported Instagram and YouTube content in available HD video and audio formats.
          </p>
        </div>

        {/* Quick Links Column */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-4">
            Navigation
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                Home
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                How It Works
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('supported-platforms')}
                className="hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                Supported Platforms
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('faq')}
                className="hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                FAQ
              </button>
            </li>
          </ul>
        </div>

        {/* Legal Column */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-4">
            Legal & Trust
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                Privacy Policy & Terms
              </button>
            </li>
            <li>
              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
              >
                Responsible Use Notice
              </button>
            </li>
          </ul>
        </div>

      </div>

      {/* Copyright & Responsible Use Notice */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-slate-400" />
          <span>Downly only processes publicly accessible content that users are authorized to download.</span>
        </div>

        <div>
          © {new Date().getFullYear()} Downly. All rights reserved.
        </div>
      </div>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </footer>
  );
};
