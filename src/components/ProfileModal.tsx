import React, { useState, useRef } from 'react';
import { X, Camera, Check, Sparkles, UserCheck, Trash2 } from 'lucide-react';
import { UserProfile } from '../types/media';
import { DEFAULT_AVATAR_SVG } from '../services/storage';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

// Clean stylistic animator badges (NO PRE-EXISTING REAL PERSON PHOTOS)
const CREATIVE_AVATAR_PRESETS = [
  { 
    label: 'Troll Animator Classic', 
    url: DEFAULT_AVATAR_SVG 
  },
  { 
    label: 'Cyber Skull', 
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="28" fill="#18181b"/>
        <circle cx="50" cy="50" r="32" fill="#09090b" stroke="#38bdf8" stroke-width="3"/>
        <text x="50" y="62" font-size="38" text-anchor="middle" dominant-baseline="middle">💀</text>
      </svg>
    `)}` 
  },
  { 
    label: 'Wild Clown', 
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="28" fill="#18181b"/>
        <circle cx="50" cy="50" r="32" fill="#09090b" stroke="#fbbf24" stroke-width="3"/>
        <text x="50" y="62" font-size="38" text-anchor="middle" dominant-baseline="middle">🤡</text>
      </svg>
    `)}` 
  },
  { 
    label: 'Fire Devil', 
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="28" fill="#18181b"/>
        <circle cx="50" cy="50" r="32" fill="#09090b" stroke="#f43f5e" stroke-width="3"/>
        <text x="50" y="62" font-size="38" text-anchor="middle" dominant-baseline="middle">😈</text>
      </svg>
    `)}` 
  },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentProfile.name);
  const [handle, setHandle] = useState(currentProfile.handle);
  const [bio, setBio] = useState(currentProfile.bio);
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(DEFAULT_AVATAR_SVG);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveProfile({
      name: name.trim(),
      handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim() || 'animator'}`,
      bio: bio.trim(),
      avatarUrl,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#1c1814] border border-[#44382c] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col celluloid-border">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#382f25] bg-[#15120f] shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-[#fbf7ee] font-serif">Animator Profile & Seal</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a89b8c] hover:text-[#fbf7ee] hover:bg-[#251f1a] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          
          {/* Avatar upload / change */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-[#12100e] border-2 border-[#44382c] shadow-xl flex items-center justify-center">
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-2xl text-white transition-opacity"
              >
                <Camera className="w-5 h-5 mb-1 text-amber-400" />
                <span className="text-[10px] font-bold">Change</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomPhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 w-full space-y-1.5 text-center sm:text-left">
              <span className="text-xs font-bold text-[#fbf7ee] font-serif">Custom Animator Emblem</span>
              <p className="text-[11px] text-[#a89b8c]">
                Upload your own custom photo from PC/mobile or choose a studio seal.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-sm transition active:scale-95 border border-amber-500/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#241e19] hover:bg-[#2c241e] text-[#a89b8c] border border-[#3e3428] transition"
                  title="Reset to default icon"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Clean Animator Presets */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Animator Icon Styles
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {CREATIVE_AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset.url)}
                  className={`relative rounded-xl overflow-hidden border-2 aspect-square group transition-all p-1 bg-zinc-950 ${
                    avatarUrl === preset.url
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                  title={preset.label}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-contain"
                  />
                  {avatarUrl === preset.url && (
                    <div className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Handle Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Character / Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Troll Animator"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#15120f] border border-[#382f25] text-[#fbf7ee] text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#ede8df] mb-1.5 font-serif">
                Creator Handle
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@trollanimator"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#15120f] border border-[#382f25] text-[#fbf7ee] text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-[#ede8df] mb-1.5 font-serif">
              Creator Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What kind of troll animations and content do you build?"
              className="w-full px-3.5 py-2 rounded-xl bg-[#15120f] border border-[#382f25] text-[#fbf7ee] text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#382f25]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#a89b8c] hover:text-[#fbf7ee] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-black/40 border border-amber-500/30 transition active:scale-95"
            >
              Save Profile
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
