import React, { useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Image as ImageIcon, 
  Smile, 
  Plus, 
  Sparkles,
  UploadCloud
} from 'lucide-react';
import { MediaItem, MediaType } from '../types/media';
import { MediaCard } from './MediaCard';

interface HorizontalMediaRowProps {
  title: string;
  type: MediaType;
  items: MediaItem[];
  onView: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onOpenUpload: (defaultType?: MediaType) => void;
  onOpenMemeGif?: (item: MediaItem) => void;
  currentUserId?: string;
  visitorId?: string;
}

export const HorizontalMediaRow: React.FC<HorizontalMediaRowProps> = ({
  title,
  type,
  items,
  onView,
  onEdit,
  onDelete,
  onOpenUpload,
  onOpenMemeGif,
  currentUserId,
  visitorId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -380 : 380;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const getIcon = () => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />;
      case 'photo':
        return <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />;
      case 'emoji':
        return <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-[#d4af37]" />;
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'video': return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'photo': return 'text-amber-200 bg-[#2d251f] border-amber-900/40';
      case 'emoji': return 'text-[#d4af37] bg-amber-950/30 border-amber-700/40';
    }
  };

  return (
    <section className="space-y-2.5 sm:space-y-3 font-sans w-full max-w-full overflow-hidden">
      
      {/* Row Header with Title, Count & Left/Right Arrows */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 ${getAccentColor()}`}>
            {getIcon()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-[#fbf7ee] font-serif tracking-normal truncate">
                {title}
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[#241e19] text-amber-300 border border-[#3e3428] shrink-0">
                {items.length}
              </span>
              {type === 'video' && (
                <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shrink-0 flex items-center gap-1" title="Connected to Cloud Firestore & Firebase Storage: updates live for all visitors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Shared Online Gallery</span>
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9c8e7e] hidden sm:block">
              {type === 'video' ? 'Real-time shared video vault · Visible to all visitors across devices' : 'Traditional reel gallery · Swipe sideways'}
            </p>
          </div>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#241e19] hover:bg-[#2d251f] border border-[#3e3428] text-[#d4af37] hover:text-white transition active:scale-95 shadow-sm"
            title="Scroll Left"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#241e19] hover:bg-[#2d251f] border border-[#3e3428] text-[#d4af37] hover:text-white transition active:scale-95 shadow-sm"
            title="Scroll Right"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Sideways Scrollable Container - with responsive mobile card widths */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scroll-smooth w-full max-w-full touch-pan-x"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4a3e31 transparent',
        }}
      >
        {items.length === 0 ? (
          /* Empty placeholder card in the row */
          <div 
            onClick={() => onOpenUpload(type)}
            className="min-w-[240px] sm:min-w-[300px] aspect-video rounded-xl sm:rounded-2xl border-2 border-dashed border-[#44382c] hover:border-amber-600/70 bg-[#1c1814]/70 hover:bg-[#221d18] p-4 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group select-none snap-start"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${getAccentColor()}`}>
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-[#fbf7ee] font-serif mb-1">
              Add First {type === 'video' ? 'Video' : type === 'photo' ? 'Photo' : 'Emoji'}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-[#9c8e7e] max-w-[210px]">
              {type === 'video' 
                ? 'Upload your troll animation or video clip to edit and download.' 
                : type === 'photo' 
                ? 'Upload custom photos and artwork.' 
                : 'Upload or create custom troll emojis and stickers.'}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`snap-start shrink-0 ${
                type === 'video'
                  ? 'w-[240px] sm:w-[290px] md:w-[320px]'
                  : type === 'photo'
                  ? 'w-[210px] sm:w-[260px] md:w-[290px]'
                  : 'w-[180px] sm:w-[220px] md:w-[250px]'
              }`}
            >
              <MediaCard
                item={item}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenMemeGif={onOpenMemeGif}
                currentUserId={currentUserId}
                visitorId={visitorId}
              />
            </div>
          ))
        )}

        {/* Add more button at the end of the row if there are items */}
        {items.length > 0 && (
          <div
            onClick={() => onOpenUpload(type)}
            className="min-w-[100px] sm:min-w-[120px] shrink-0 rounded-xl sm:rounded-2xl border border-dashed border-[#44382c] hover:border-amber-600 bg-[#1c1814]/60 hover:bg-[#221d18] flex flex-col items-center justify-center p-3 sm:p-4 cursor-pointer transition text-[#9c8e7e] hover:text-[#fbf7ee] group snap-start"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#27211b] border border-[#3e3428] flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold mt-1.5 font-serif">Add More</span>
          </div>
        )}
      </div>

    </section>
  );
};
