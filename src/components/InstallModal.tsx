import React from 'react';
import { X, Monitor, Smartphone, Download, CheckCircle2, Apple, Globe } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Download & Install MediaVault</h3>
              <p className="text-xs text-zinc-400">Ready for PC, Mac, Android, and iOS devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Status banner */}
          {isInstalled ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>MediaVault Studio is already installed and running as a standalone app!</span>
            </div>
          ) : isInstallable ? (
            <div className="text-center p-4 rounded-xl bg-gradient-to-b from-zinc-800/60 to-zinc-800/30 border border-zinc-700/80 space-y-3">
              <p className="text-xs text-zinc-300">
                Your browser supports one-click native app installation. Install for instant offline access and dedicated window mode.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                Install Now on this Device
              </button>
            </div>
          ) : null}

          {/* Platform Guides */}
          <div className="space-y-4">
            
            {/* PC & Mac Guide */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Monitor className="w-4 h-4 text-rose-400" />
                <span>On Desktop (PC, Mac, Linux)</span>
              </div>
              <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside pl-1">
                <li>Look for the <strong>Install App icon (⊕ or computer)</strong> on the right side of your browser address bar.</li>
                <li>Or open the browser menu (three dots <strong>⋮</strong>) and click <strong>"Install MediaVault Studio"</strong>.</li>
                <li>Launch anytime from your desktop or Start Menu just like a native app.</li>
              </ol>
            </div>

            {/* Mobile Android & iOS */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>On Mobile (iPhone, iPad & Android)</span>
              </div>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <Apple className="w-3.5 h-3.5 text-zinc-300 mt-0.5 shrink-0" />
                  <p>
                    <strong>iOS Safari:</strong> Tap the <strong>Share</strong> button (box with upward arrow) in the bottom toolbar, scroll down, and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="w-3.5 h-3.5 text-zinc-300 mt-0.5 shrink-0" />
                  <p>
                    <strong>Android Chrome:</strong> Tap the menu (<strong>⋮</strong>) in the top-right corner, then select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80 text-[11px] text-zinc-500 text-center">
            Note: Media playback works seamlessly offline for all stored media. New uploads require an active internet connection.
          </div>

          {/* Footer Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            >
              Close
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
