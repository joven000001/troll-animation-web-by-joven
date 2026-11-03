import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw, 
  Download, 
  Edit3, 
  Check, 
  Clock, 
  Tag, 
  User, 
  Calendar, 
  Copy, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw,
  ArrowDownToLine,
  MessageSquare,
  Send,
  Trash2,
  Smile,
  Sparkles
} from 'lucide-react';
import { MediaItem, MediaComment, UserProfile } from '../types/media';
import { downloadManager } from '../services/downloadManager';

const TROLL_EMOJIS = ['🔥', '💀', '😈', '😂', '🚀', '💯', '👏', '⚡'];

interface MediaViewModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onOpenEdit: (item: MediaItem) => void;
  onOpenDownloadManager?: () => void;
  onUpdateItem?: (updatedItem: MediaItem) => void;
  profile?: UserProfile;
  onOpenMemeGif?: (item: MediaItem) => void;
}

export const MediaViewModal: React.FC<MediaViewModalProps> = ({
  item,
  onClose,
  onOpenEdit,
  onOpenDownloadManager,
  onUpdateItem,
  profile,
  onOpenMemeGif,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedEmoji, setCopiedEmoji] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<'comments' | 'details'>(
    item?.type === 'video' ? 'comments' : 'details'
  );
  const [commentText, setCommentText] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const comments = item?.comments || [];

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !commentText.trim()) return;

    const newComment: MediaComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: profile?.name || 'Troll Animator',
      avatarUrl: profile?.avatarUrl,
      text: commentText.trim(),
      createdAt: Date.now(),
      timestamp: item.type === 'video' && includeTimestamp && currentTime > 0 ? Math.round(currentTime) : undefined,
    };

    const updatedComments = [...(item.comments || []), newComment];
    const updatedItem: MediaItem = { ...item, comments: updatedComments };
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    setCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!item) return;
    const updatedComments = (item.comments || []).filter((c) => c.id !== commentId);
    const updatedItem: MediaItem = { ...item, comments: updatedComments };
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  const handleSeekToTimestamp = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (item?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsPlaying(true);
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
    setPhotoZoom(1);
  }, [item]);

  if (!item) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadManager.queueDownload(item);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyEmoji = () => {
    if (item.emojiSymbol) {
      navigator.clipboard.writeText(item.emojiSymbol);
      setCopiedEmoji(true);
      setTimeout(() => setCopiedEmoji(false), 2000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl bg-[#1a1613] border border-[#44382c] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] celluloid-border"
      >
        
        {/* Top Bar inside Viewer - Responsive Mobile Layout */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-[#382f25] bg-[#14110e] shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold uppercase tracking-wider shrink-0 ${
              item.type === 'video'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-900/80'
                : item.type === 'photo'
                ? 'bg-[#1b252b]/90 text-amber-200 border border-amber-900/80'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
            }`}>
              {item.type}
            </span>
            <h2 className="text-xs sm:text-base font-bold text-[#fbf7ee] font-serif truncate max-w-[120px] sm:max-w-md">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              type="button"
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md ${
                downloadSuccess
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#251f1a] hover:bg-[#2e2620] text-[#ede8df] border border-[#3e3428]'
              }`}
              title="Fast Download to PC / Mobile"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  <span className="hidden sm:inline">Downloaded!</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </button>

            {/* Make Meme / GIF from Video */}
            {item.type === 'video' && onOpenMemeGif && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMemeGif(item);
                }}
                type="button"
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950/40 border border-purple-400/40 flex items-center gap-1.5 transition active:scale-95"
                title="Convert this video into an animated looping GIF or meme"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span className="hidden sm:inline">Make Meme / GIF</span>
                <span className="sm:hidden text-[11px]">GIF / Meme</span>
              </button>
            )}

            {/* Edit Option */}
            <button
              onClick={() => {
                onClose();
                onOpenEdit(item);
              }}
              type="button"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-black/40 border border-amber-500/30 flex items-center gap-1.5 transition active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Edit</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-[#a89b8c] hover:text-[#fbf7ee] hover:bg-[#251f1a] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Viewing Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[340px] max-h-[65vh]">
          
          {/* VIDEO PLAYER VIEW */}
          {item.type === 'video' && (
            <div className="relative w-full h-full flex flex-col justify-center items-center group">
              <video
                ref={videoRef}
                src={item.url}
                playsInline
                loop={isLooping}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                className="max-h-[58vh] w-auto max-w-full object-contain cursor-pointer"
              />

              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  type="button"
                  className="absolute z-10 w-16 h-16 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
                >
                  <Play className="w-7 h-7 ml-1 fill-current" />
                </button>
              )}

              {/* Video Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2">
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-zinc-700 accent-rose-500 rounded-lg cursor-pointer"
                  />
                  <div className="text-xs font-mono text-zinc-300 whitespace-nowrap shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration || item.duration || 0)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-lg text-white hover:bg-white/10 transition"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 rounded-lg text-white hover:bg-white/10 transition"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-zinc-700 accent-rose-500 rounded cursor-pointer hidden sm:block"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700 text-[11px] font-medium text-zinc-300">
                      {[0.5, 1, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => handleSpeedChange(spd)}
                          className={`px-2 py-0.5 rounded ${
                            playbackSpeed === spd
                              ? 'bg-rose-600 text-white font-bold'
                              : 'hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`p-2 rounded-lg transition text-xs font-medium flex items-center gap-1 ${
                        isLooping ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Loop playback"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">Loop</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 rounded-lg text-white hover:bg-white/10 transition"
                      title="Toggle Fullscreen"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* PHOTO LIGHTBOX */}
          {item.type === 'photo' && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={item.url}
                alt={item.title}
                style={{ transform: `scale(${photoZoom})` }}
                className="max-h-[58vh] max-w-full object-contain transition-transform duration-200"
              />

              <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-xl p-1.5 text-zinc-300">
                <button
                  onClick={() => setPhotoZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-1">{Math.round(photoZoom * 100)}%</span>
                <button
                  onClick={() => setPhotoZoom((prev) => Math.min(3, prev + 0.25))}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPhotoZoom(1)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition"
                  title="Reset Zoom"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* EMOJI STAGE */}
          {item.type === 'emoji' && (
            <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
              <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-850 to-zinc-950 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-950/30">
                <span className="text-8xl select-all filter drop-shadow-[0_12px_24px_rgba(244,63,94,0.4)] animate-bounce-subtle">
                  {item.emojiSymbol}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyEmoji}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-2 border border-zinc-700 transition"
                >
                  {copiedEmoji ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Emoji!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copy Unicode ({item.emojiSymbol})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Navigation Tabs between Comments and Details */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#171310] border-t border-[#342a20] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('comments')}
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'comments'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#a89b8c] hover:text-[#ede8df] hover:bg-[#231d17]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Comments</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#27201a] text-amber-300 border border-amber-800/60">
                {comments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'details'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#a89b8c] hover:text-[#ede8df] hover:bg-[#231d17]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Details & Tags</span>
            </button>
          </div>

          <div className="text-[11px] text-[#8e8071] hidden sm:block font-serif">
            {item.type === 'video' ? 'Interactive Video Reactions & Timestamps' : 'Media Vault Item'}
          </div>
        </div>

        {/* Tab Content Panel */}
        {activeTab === 'comments' ? (
          <div className="p-3.5 sm:p-5 bg-[#14100d] flex flex-col gap-3.5 max-h-[38vh] overflow-y-auto">
            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex flex-col gap-2 bg-[#1c1713] p-3 rounded-2xl border border-[#3e3328] shadow-inner">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#120f0d] ring-1.5 ring-amber-500/60 shrink-0 flex items-center justify-center">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-300">
                      {profile?.name || 'Troll Animator'}
                    </span>

                    {item.type === 'video' && currentTime > 0 && (
                      <button
                        type="button"
                        onClick={() => setIncludeTimestamp(!includeTimestamp)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 border transition ${
                          includeTimestamp
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                            : 'bg-[#241e18] text-[#8e8071] border-[#382f25]'
                        }`}
                        title="Include current video time"
                      >
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>@{formatTime(currentTime)}</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={item.type === 'video' ? "Add a reaction or comment on this video..." : "Add a comment..."}
                    className="w-full px-3 py-2 rounded-xl bg-[#120f0d] border border-[#3a3025] focus:border-amber-500 text-xs sm:text-sm text-[#fbf7ee] placeholder-[#796c5e] focus:outline-none transition"
                  />

                  {/* Comment options & Emoji picker */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {TROLL_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCommentText((prev) => (prev ? `${prev} ${emoji}` : emoji))}
                          className="px-1.5 py-0.5 rounded-lg bg-[#241e18] hover:bg-[#2f2720] text-sm hover:scale-110 active:scale-95 transition"
                          title={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-black/40 border border-amber-500/30 flex items-center gap-1.5 transition active:scale-95 ml-auto"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-2">
              {comments.length === 0 ? (
                <div className="py-6 text-center text-[#8e8071] flex flex-col items-center justify-center space-y-1.5">
                  <MessageSquare className="w-7 h-7 text-[#57483a] opacity-70" />
                  <p className="text-xs font-serif text-[#b8ab9b]">No comments yet on this video</p>
                  <p className="text-[11px] text-[#796c5e]">Be the first to post a reaction, timestamp, or feedback!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div 
                    key={comment.id}
                    className="p-3 rounded-xl bg-[#1c1713] border border-[#342a20] flex items-start justify-between gap-3 group hover:border-[#483a2d] transition"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#120f0d] ring-1 ring-amber-500/50 shrink-0 flex items-center justify-center">
                        {comment.avatarUrl ? (
                          <img src={comment.avatarUrl} alt={comment.author} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#fbf7ee]">
                            {comment.author}
                          </span>
                          {comment.timestamp !== undefined && (
                            <button
                              type="button"
                              onClick={() => handleSeekToTimestamp(comment.timestamp!)}
                              className="px-1.5 py-0.2 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 font-mono text-[10px] flex items-center gap-1 transition"
                              title="Click to jump video to this exact second"
                            >
                              <Play className="w-2.5 h-2.5 fill-current text-amber-400" />
                              <span>{formatTime(comment.timestamp)}</span>
                            </button>
                          )}
                          <span className="text-[10px] text-[#796c5e]">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[#ede8df] mt-1 break-words leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#292018] text-[#796c5e] hover:text-rose-400 transition"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Details Panel */
          <div className="p-4 sm:p-5 border-t border-[#342a20] bg-[#14100d] flex flex-col gap-3.5 text-xs text-[#a89b8c]">
            {item.description && (
              <div className="p-3 rounded-xl bg-[#1b1612] border border-[#3c3125] text-left">
                <span className="text-[11px] font-bold text-amber-400 block mb-1 font-serif">Description</span>
                <p className="text-xs text-[#ede8df] leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uploader: <strong className="text-[#fbf7ee]">{item.uploaderName || item.author}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uploaded: {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                {item.fileSize && (
                  <div className="px-2 py-0.5 rounded bg-[#221c17] text-zinc-300 font-mono text-[11px] border border-[#3e3328]">
                    {item.fileSize}
                  </div>
                )}

                {item.resolution && (
                  <div className="px-2 py-0.5 rounded bg-[#221c17] text-amber-200 font-mono text-[11px] border border-[#3e3328]">
                    {item.resolution}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#241e19] border border-[#3e3428] text-[#dcd3c5] text-[11px]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
