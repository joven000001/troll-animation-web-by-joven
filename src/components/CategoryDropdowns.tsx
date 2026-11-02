import React from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Smile, 
  Video, 
  Image as ImageIcon, 
  UploadCloud, 
  ArrowUpDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { MediaType } from '../types/media';

interface CategoryDropdownsProps {
  counts: {
    all: number;
    video: number;
    photo: number;
    emoji: number;
  };
  expandedSections: {
    video: boolean;
    photo: boolean;
    emoji: boolean;
  };
  onToggleSection: (type: MediaType) => void;
  activeFilter: 'all' | MediaType;
  onSelectFilter: (filter: 'all' | MediaType) => void;
  sortBy: 'newest' | 'oldest' | 'title';
  onSortChange: (sort: 'newest' | 'oldest' | 'title') => void;
  onOpenUpload: () => void;
  isOnline: boolean;
}

export const CategoryDropdowns: React.FC<CategoryDropdownsProps> = ({
  counts,
  expandedSections,
  onToggleSection,
  activeFilter,
  onSelectFilter,
  sortBy,
  onSortChange,
  onOpenUpload,
  isOnline,
}) => {
  return (
    <div className="w-full space-y-4">
      
      {/* 3 Dropdown Arrows Row (Emoji, Video, Photo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* 1. Emoji Dropdown Arrow Box */}
        <div 
          onClick={() => {
            onToggleSection('emoji');
            if (activeFilter !== 'all' && activeFilter !== 'emoji') onSelectFilter('all');
          }}
          className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 select-none ${
            expandedSections.emoji
              ? 'bg-zinc-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">Troll Emoji Vault</h4>
                  <span className="text-[11px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {counts.emoji} items
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Stickers, reactions & unicode</p>
              </div>
            </div>

            {/* Dropdown Arrow */}
            <div className={`p-2 rounded-lg bg-zinc-800 text-zinc-300 transition-transform ${expandedSections.emoji ? 'rotate-180 text-amber-400' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 2. Video Dropdown Arrow Box */}
        <div 
          onClick={() => {
            onToggleSection('video');
            if (activeFilter !== 'all' && activeFilter !== 'video') onSelectFilter('all');
          }}
          className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 select-none ${
            expandedSections.video
              ? 'bg-zinc-900/90 border-rose-500/40 shadow-lg shadow-rose-950/20'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">Troll Video Vault</h4>
                  <span className="text-[11px] font-medium text-rose-400/90 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {counts.video} items
                  </span>
                </div>
                <p className="text-xs text-zinc-400">MP4, WebM, MOV clips</p>
              </div>
            </div>

            {/* Dropdown Arrow */}
            <div className={`p-2 rounded-lg bg-zinc-800 text-zinc-300 transition-transform ${expandedSections.video ? 'rotate-180 text-rose-400' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 3. Photo Dropdown Arrow Box */}
        <div 
          onClick={() => {
            onToggleSection('photo');
            if (activeFilter !== 'all' && activeFilter !== 'photo') onSelectFilter('all');
          }}
          className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 select-none ${
            expandedSections.photo
              ? 'bg-zinc-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">Troll Photo Vault</h4>
                  <span className="text-[11px] font-medium text-cyan-400/90 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {counts.photo} items
                  </span>
                </div>
                <p className="text-xs text-zinc-400">High-res photography & art</p>
              </div>
            </div>

            {/* Dropdown Arrow */}
            <div className={`p-2 rounded-lg bg-zinc-800 text-zinc-300 transition-transform ${expandedSections.photo ? 'rotate-180 text-cyan-400' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

      </div>

      {/* Filter Chips Bar & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => onSelectFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Media ({counts.all})
          </button>
          <button
            onClick={() => onSelectFilter('video')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeFilter === 'video'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Videos ({counts.video})
          </button>
          <button
            onClick={() => onSelectFilter('photo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeFilter === 'photo'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Photos ({counts.photo})
          </button>
          <button
            onClick={() => onSelectFilter('emoji')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeFilter === 'emoji'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            Emojis ({counts.emoji})
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest' | 'title')}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
          >
            <option value="newest">Newest Added</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Prominent Upload Button Right Underneath Dropdowns */}
      <div className="pt-2">
        <button
          onClick={onOpenUpload}
          type="button"
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 p-[1px] shadow-xl shadow-rose-950/30 hover:shadow-rose-950/50 transition-all duration-300 active:scale-[0.99]"
        >
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 rounded-[15px] bg-zinc-950/90 group-hover:bg-zinc-950/70 transition-colors">
            
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-900/40 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Upload to Troll Vault
                  <span className="text-xs font-normal text-rose-300">
                    (Photo, Video or Emoji)
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Fast upload with automatic format support, tags, and cloud vault indexing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl bg-rose-600 group-hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-2 shrink-0">
                <UploadCloud className="w-4 h-4" />
                <span>Upload New Media</span>
              </div>
            </div>

          </div>
        </button>
      </div>

    </div>
  );
};
