import React, { useRef, useState, useEffect } from 'react';
import { Search, Clipboard, X, ShieldCheck, Sparkles, Youtube, Instagram, Film, Video, Quote } from 'lucide-react';
import { AppState } from '../types';

interface HeroProps {
  url: string;
  setUrl: (url: string) => void;
  appState: AppState;
  onAnalyze: () => void;
  onClear: () => void;
}

const MOTIVATIONAL_QUOTES = [
  "Turn your favorite media into instant downloads ✨",
  "Ready to capture content that inspires you today? 🚀",
  "Unleash your creativity — grab your favorite videos now! 🔥",
  "Great ideas start with great inspiration. What are we saving today? 💡",
  "Your personal media vault is ready for action! ⚡",
  "Stay curious, stay inspired, and download what moves you. 🌟",
  "Make today legendary! 🎯",
  "High-speed media downloads, tailored just for you! 💎",
  "Inspiration is everywhere — save what you love. 🎨",
  "Welcome back! Let's download something awesome today. 🚀",
];

export const Hero: React.FC<HeroProps> = ({
  url,
  setUrl,
  appState,
  onAnalyze,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [quote, setQuote] = useState<string>('');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setQuote(MOTIVATIONAL_QUOTES[randomIndex]);
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        if (inputRef.current) inputRef.current.focus();
      }
    } catch {
      // Clipboard permissions fall back to standard manual paste
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && appState !== 'analyzing') {
      onAnalyze();
    }
  };

  const isAnalyzing = appState === 'analyzing';

  return (
    <section className="relative pt-10 sm:pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      
      {/* Background ambient glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-violet/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Greeting Banner: Hello Shri, with random motivational quote */}
      {quote && (
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 border border-slate-700/60 dark:border-slate-700/60 light:border-slate-300 text-xs sm:text-sm font-medium shadow-lg mb-6 animate-fade-in backdrop-blur-md">
          <span className="font-extrabold text-white dark:text-white light:text-slate-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Hello Shri 👋
          </span>
          <span className="text-slate-400 dark:text-slate-400 light:text-slate-600">•</span>
          <span className="text-slate-300 dark:text-slate-300 light:text-slate-700 font-normal italic">{quote}</span>
        </div>
      )}

      {/* Hero Security Badge */}
      <div className="block mb-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 text-[11px] font-semibold text-accent-violet tracking-wide uppercase shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-violet" />
          <span>FAST • SIMPLE • SECURE</span>
        </div>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white dark:text-white light:text-slate-900 leading-tight sm:leading-none mb-6">
        Download Your Media.{' '}
        <span className="bg-gradient-to-r from-accent-violet via-indigo-400 to-accent-blue bg-clip-text text-transparent">
          Your Way.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 dark:text-slate-400 light:text-slate-600 mb-10 leading-relaxed font-normal">
        Paste a supported video or post link and choose the available quality or audio format you need.
      </p>

      {/* URL Input Box Container */}
      <div className="max-w-3xl mx-auto">
        <div className="relative p-2 rounded-2xl glass-card border border-slate-800/80 dark:border-slate-800/80 light:border-slate-300 shadow-2xl focus-within:ring-2 focus-within:ring-accent-violet/50 transition-all">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            
            {/* Input Wrapper */}
            <div className="relative flex-1 w-full flex items-center">
              
              {/* Search Icon & Clear Option near search icon */}
              <div className="flex items-center ml-3.5 flex-shrink-0">
                <Search className="w-5 h-5 text-slate-500 pointer-events-none" />
                {url && (
                  <button
                    onClick={onClear}
                    type="button"
                    title="Clear input text"
                    className="ml-1.5 p-1 rounded-full text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-800/70 dark:hover:bg-slate-800/70 light:hover:bg-slate-200 transition-all transform active:scale-90"
                    aria-label="Clear input text"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                  </button>
                )}
              </div>
              
              <input
                id="media-url-input"
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste Instagram or YouTube link here..."
                disabled={isAnalyzing}
                aria-label="Paste Instagram or YouTube URL"
                className="w-full pl-3 pr-20 py-3.5 bg-transparent text-sm sm:text-base text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none disabled:opacity-50"
              />

              {/* Action buttons on the right side inside input */}
              <div className="absolute right-2 flex items-center space-x-1">
                {url ? (
                  <button
                    onClick={onClear}
                    type="button"
                    title="Clear input text"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all transform active:scale-95"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePaste}
                    type="button"
                    title="Paste from clipboard"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200 text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                )}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={onAnalyze}
              disabled={!url.trim() || isAnalyzing}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-blue hover:from-accent-violet/90 hover:to-accent-blue/90 text-white font-semibold text-sm sm:text-base shadow-glow-violet disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center space-x-2 flex-shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Supported Platform Chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-slate-400 dark:text-slate-400 light:text-slate-600">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Supported:</span>
          
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
            <Instagram className="w-3.5 h-3.5 text-pink-500" />
            <span>Instagram</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>Reels</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
            <Video className="w-3.5 h-3.5 text-red-400" />
            <span>Shorts</span>
          </div>
        </div>

      </div>
    </section>
  );
};

