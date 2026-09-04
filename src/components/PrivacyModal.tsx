import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-2 text-accent-violet">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white dark:text-white light:text-slate-900">
              Privacy Policy & Terms of Use
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-6 space-y-4 text-xs sm:text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed">
          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
            1. Authorized Use Only
          </h3>
          <p>
            Downly is designed strictly to allow users to process and download publicly accessible content that they own or are legally authorized to download. Downly strictly respects copyright laws and platform Terms of Service.
          </p>

          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
            2. Restrictions & Security Protections
          </h3>
          <p>
            Downly does NOT bypass DRM, private account protections, login paywalls, CAPTCHAs, or platform security mechanisms. Requests attempting to access unauthorized private content are automatically rejected by our security layer.
          </p>

          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
            3. Zero Data Retention
          </h3>
          <p>
            Downly minimizes data processing. Temporary streaming files expire and are automatically purged from server disk storage within 5 minutes. Downly does not maintain permanent archives of user files or browsing histories.
          </p>

          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
            4. User Responsibilities
          </h3>
          <p>
            Users are solely responsible for verifying rights, licensing, and fair-use guidelines regarding media processed through Downly.
          </p>
        </div>

        {/* Footer CTA */}
        <div className="pt-4 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-accent-violet hover:bg-accent-violet/90 text-white text-xs font-bold transition-colors"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
};
