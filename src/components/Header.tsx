import React, { useState, useEffect } from 'react';
import { Download, Film, User, Wifi, WifiOff, Sparkles, Layers, ArrowDownToLine } from 'lucide-react';
import { UserProfile } from '../types/media';
import { downloadManager } from '../services/downloadManager';

import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  profile: UserProfile;
  isOnline: boolean;
  onOpenProfile: () => void;
  onOpenInstall: () => void;
  onOpenDownloadManager: () => void;
  currentUser?: FirebaseUser | null;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  isOnline,
  onOpenProfile,
  onOpenInstall,
  onOpenDownloadManager,
  currentUser,
  onSignInGoogle,
  onSignOut,
}) => {
  const [imgError, setImgError] = useState(false);
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);

  useEffect(() => {
    return downloadManager.subscribe(() => {
      setActiveDownloadCount(downloadManager.getActiveCount());
    });
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#191512]/95 backdrop-blur-md border-b border-[#382f25] shadow-md shadow-black/40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand: Traditional Troll Animation Studio Marquee */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-rose-700 flex items-center justify-center shadow-md shadow-black/50 border border-amber-500/30 shrink-0">
            <span className="text-base sm:text-xl filter drop-shadow">😈</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-[#fbf7ee] font-serif truncate">
                Troll Animation
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2b221b] text-amber-400 border border-amber-800/60 uppercase tracking-widest shrink-0">
                STUDIO
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#a89b8c] hidden md:block tracking-wide">
              Traditional Cell & Motion Studio · Video, Photo & Custom Stickers
            </p>
          </div>
        </div>

        {/* Center / Right Section: Tightly fitted for mobile screens */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Online / Offline Status: Compact on mobile */}
          <div 
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border border-[#382f25] bg-[#14110e]"
            title={isOnline ? 'Online - Cloud upload & playback active' : 'Offline - Local storage active'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-[11px] font-medium hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-400 text-[11px] font-medium hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Download Manager Button (compact on mobile, labeled on desktop) */}
          <button
            onClick={onOpenDownloadManager}
            type="button"
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-[#241e19] hover:bg-[#2d251f] text-[#ede8df] border border-[#3e3428] text-xs font-semibold transition group shadow-sm active:scale-95 shrink-0"
            title="Open Web App Download Manager"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Downloads</span>
            {activeDownloadCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white animate-pulse">
                {activeDownloadCount}
              </span>
            ) : (
              <span className="text-[10px] text-[#8e8071] hidden sm:inline">Vault</span>
            )}
          </button>

          {/* Google Auth Status / 1-Click Sign-in for Visitors */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#201a14] border border-emerald-600/40 shrink-0">
              <div className="w-6 h-6 rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-emerald-500/60 flex items-center justify-center shrink-0">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || 'Google'} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-emerald-300 hidden md:inline truncate max-w-[100px]">
                {currentUser.displayName?.split(' ')[0] || 'Google User'}
              </span>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-[10px] text-[#9c8e7e] hover:text-rose-400 ml-1 transition"
                  title="Sign out of Google"
                >
                  Exit
                </button>
              )}
            </div>
          ) : (
            onSignInGoogle && (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-[#231b14] hover:bg-[#2e2319] text-amber-300 border border-amber-700/60 text-xs font-semibold transition shrink-0 active:scale-95 shadow-sm"
                title="Sign in with Google to protect your shared videos"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Google Login</span>
                <span className="sm:hidden text-[10px]">Login</span>
              </button>
            )
          )}

          {/* Profile Section (always clearly visible with avatar, name, and handle) */}
          <button
            onClick={onOpenProfile}
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#26201a] hover:bg-[#332a22] border border-amber-500/50 hover:border-amber-400 transition-all text-left group shrink-0 shadow-md shadow-black/40"
            title="Edit Animator profile & avatar"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-[#15120f] relative shrink-0 ring-1.5 ring-amber-500/70 shadow flex items-center justify-center">
              {!imgError && profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex flex-col text-left pr-0.5 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-[#fbf7ee] group-hover:text-amber-300 transition-colors truncate max-w-[95px] sm:max-w-[130px] leading-tight">
                {profile.name}
              </span>
              <span className="text-[10px] text-amber-400 font-mono leading-none truncate max-w-[95px] sm:max-w-[130px]">
                {profile.handle}
              </span>
            </div>
          </button>

          {/* Top Right "Install / Web Release" for PC & Mobile */}
          <button
            onClick={onOpenInstall}
            type="button"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-[#fbf7ee] text-xs font-bold shadow-md shadow-black/40 border border-amber-500/40 transition active:scale-95 shrink-0"
            title="Install Web App on PC or Mobile"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden text-[11px]">Install</span>
          </button>

        </div>
      </div>
    </header>
  );
};
