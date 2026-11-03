import React, { useState, useRef } from 'react';
import { 
  Play, 
  Download, 
  Edit3, 
  Trash2, 
  Video, 
  Image as ImageIcon, 
  Smile, 
  Clock, 
  Check, 
  Sparkles,
  ArrowDownToLine,
  MessageSquare,
  User,
  Lock
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { downloadManager } from '../services/downloadManager';

interface MediaCardProps {
  item: MediaItem;
  onView: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onOpenMemeGif?: (item: MediaItem) => void;
  currentUserId?: string;
  visitorId?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onView,
  onEdit,
  onDelete,
  onOpenMemeGif,
  currentUserId,
  visitorId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await downloadManager.queueDownload(item);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2200);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-[#1c1814] border border-[#3c3227] hover:border-amber-700/60 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/60 flex flex-col font-sans celluloid-border"
    >
      {/* Media Preview Box */}
      <div 
        onClick={() => onView(item)}
        className="relative aspect-video w-full bg-[#12100e] overflow-hidden cursor-pointer select-none flex items-center justify-center border-b border-[#322920]"
      >
        {/* VIDEO TYPE */}
        {item.type === 'video' && (
          <>
            <video
              ref={videoRef}
              src={item.url}
              muted
              playsInline
              loop
              poster={item.thumbnailUrl}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-600 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-black/70 group-hover:scale-110 transition-transform border border-amber-400/30">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 fill-current" />
              </div>
            </div>

            {item.duration && (
              <div className="absolute bottom-2 right-2 px-1.5 sm:px-2 py-0.5 rounded bg-black/85 backdrop-blur-sm text-[10px] sm:text-[11px] font-mono text-amber-200 flex items-center gap-1 border border-amber-900/30">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{formatDuration(item.duration)}</span>
              </div>
            )}
          </>
        )}

        {/* PHOTO TYPE */}
        {item.type === 'photo' && (
          <>
            <img
              src={item.thumbnailUrl || item.url}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}

        {/* EMOJI TYPE */}
        {item.type === 'emoji' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1c1814] via-[#161310] to-[#110e0c] p-4 sm:p-6 text-center">
            <span className="text-5xl sm:text-6xl group-hover:scale-125 transition-transform duration-300 filter drop-shadow-[0_6px_14px_rgba(217,119,6,0.35)]">
              {item.emojiSymbol}
            </span>
          </div>
        )}

        {/* Top Type Indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wider flex items-center gap-1 uppercase backdrop-blur-md shadow-sm ${
            item.type === 'video'
              ? 'bg-[#2d1b18]/90 text-rose-300 border border-rose-900/70'
              : item.type === 'photo'
              ? 'bg-[#1b252b]/90 text-amber-200 border border-amber-900/60'
              : 'bg-[#2a2217]/90 text-amber-300 border border-amber-800/70'
          }`}>
            {item.type === 'video' && <Video className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {item.type === 'photo' && <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {item.type === 'emoji' && <Smile className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {item.type}
          </span>

          {item.isEdited && (
            <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-[#1a281e]/90 text-emerald-300 border border-emerald-800/60 flex items-center gap-0.5 sm:gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Edited
            </span>
          )}

          {item.comments && item.comments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-[#2a1738]/90 text-purple-300 border border-purple-800/60 flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5 text-purple-400" />
              <span>{item.comments.length}</span>
            </span>
          )}
        </div>

        {/* Format */}
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] sm:text-[10px] font-mono text-zinc-300 border border-white/10">
            {item.format || (item.type === 'video' ? 'MP4' : item.type === 'photo' ? 'JPG' : 'UNICODE')}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <h3 
            onClick={() => onView(item)}
            className="text-xs sm:text-sm font-bold text-[#fbf7ee] hover:text-amber-400 transition-colors cursor-pointer line-clamp-1 font-serif"
            title={item.title}
          >
            {item.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {item.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] text-[#9c8e7e] bg-[#241e19] border border-[#3a3026] px-1.5 py-0.5 rounded transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Uploader and Upload Date metadata (Requirement 2 & 10) */}
          <div className="flex items-center justify-between text-[10px] text-[#9c8e7e] mt-1.5 pt-1.5 border-t border-[#2d241c]">
            <span className="truncate max-w-[130px] flex items-center gap-1 text-amber-200/90 font-medium" title={item.uploaderName || item.author}>
              <User className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span className="truncate">{item.uploaderName || item.author || 'Troll Creator'}</span>
            </span>
            <span className="shrink-0 font-mono text-[9px] text-[#8e8071]">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions - tightly fitted for mobile touch */}
        <div className="pt-2 border-t border-[#30271f] flex items-center justify-between gap-1.5">
          
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => onView(item)}
              type="button"
              className="px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold bg-[#26201a] hover:bg-[#2e2620] text-[#ede8df] hover:text-white transition flex items-center gap-1 border border-[#3e3428]"
            >
              {item.type === 'video' ? (
                <>
                  <Play className="w-3 h-3 text-amber-400 fill-current" />
                  <span>Watch</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3 h-3 text-amber-300" />
                  <span>View</span>
                </>
              )}
            </button>

            <button
              onClick={() => onEdit(item)}
              type="button"
              className="px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 transition flex items-center gap-1"
              title="Open in Traditional Creative Suite"
            >
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span>Edit</span>
            </button>

            {item.type === 'video' && onOpenMemeGif && (
              <button
                onClick={() => onOpenMemeGif(item)}
                type="button"
                className="px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold bg-purple-950/60 hover:bg-purple-900/70 text-purple-200 border border-purple-700/60 transition flex items-center gap-1"
                title="Convert into Animated GIF Sticker or Meme"
              >
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span>GIF</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={handleDownload}
              disabled={downloading}
              type="button"
              className={`p-1.5 rounded-md sm:rounded-lg transition ${
                downloadSuccess
                  ? 'bg-emerald-700 text-white'
                  : 'text-[#a89b8c] hover:text-white hover:bg-[#2b241d]'
              }`}
              title="Fast Download to PC / Mobile"
            >
              {downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Deletion protection: Only creator can delete their video (Requirement 10) */}
            {(item.type !== 'video' || (currentUserId && item.uploaderId === currentUserId) || (visitorId && item.uploaderId === visitorId)) ? (
              <button
                onClick={() => onDelete(item.id)}
                type="button"
                className="p-1.5 rounded-md sm:rounded-lg text-[#7c6f60] hover:text-rose-400 hover:bg-[#2b241d] transition"
                title="Delete from Vault"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span
                className="p-1.5 text-[#54483d] cursor-not-allowed"
                title="Protected: Only the original creator can delete this shared video"
              >
                <Lock className="w-3.5 h-3.5 opacity-50" />
              </span>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
