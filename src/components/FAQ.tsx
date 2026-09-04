import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: 'How does Downly work?',
      answer: 'Downly accepts publicly accessible video or post URLs from supported platforms. Our secure backend provider validates the link, extracts available metadata and formats, and generates a short-lived download token to stream the requested file directly to your browser.',
    },
    {
      question: 'Which social media platforms are supported?',
      answer: 'Downly currently supports public Instagram Posts, Instagram Reels, YouTube Videos, and YouTube Shorts. Additional platforms are added via our modular provider architecture.',
    },
    {
      question: 'Can I extract and download audio only?',
      answer: 'Yes. When content sources legally and technically permit audio extraction, Downly offers M4A or MP3 audio download options directly in the media preview panel.',
    },
    {
      question: 'What video quality options are available?',
      answer: 'Downly displays ONLY format resolutions that are genuinely returned by the media source (e.g. 4K 2160p, 1080p Full HD, 720p HD, 480p, 360p). We never fabricate fake higher-quality options.',
    },
    {
      question: 'Why can’t some links be processed?',
      answer: 'Downly cannot process content that is deleted, private, geo-restricted, age-gated, protected by DRM, paywalls, or login requirements. Downly strictly adheres to platform Terms of Service and applicable law.',
    },
    {
      question: 'Are private videos or posts supported?',
      answer: 'No. Downly does NOT bypass login credentials, private account permissions, paywalls, DRM, or security mechanisms. Only publicly available content authorized for download is processed.',
    },
    {
      question: 'Are my downloaded files or URLs stored permanently?',
      answer: 'No. Downly minimizes data retention. Temporary streaming buffers automatically expire and are purged from storage within 5 minutes. We do not permanently store downloaded media files or maintain private browsing histories.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-800 text-xs font-semibold text-accent-indigo mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>HELP CENTER</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="rounded-2xl glass-card border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full p-6 text-left flex items-center justify-between space-x-4 focus:outline-none focus:ring-2 focus:ring-accent-violet rounded-2xl"
              >
                <span className="text-base sm:text-lg font-bold text-white dark:text-white light:text-slate-900">
                  {faq.question}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-violet' : ''}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed animate-fade-in border-t border-slate-800/40 dark:border-slate-800/40 light:border-slate-200 pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
