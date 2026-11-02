import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Save, 
  Check, 
  Copy, 
  Sliders, 
  Film, 
  Smile, 
  Type, 
  Clock, 
  Layers, 
  Repeat,
  Zap,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MediaItem, UserProfile } from '../types/media';
import { triggerBlobDownload } from '../utils/download';
import { GifEncoder } from '../utils/gifEncoder';

interface MemeGifModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoItem: MediaItem;
  onSaveToVault: (newItem: MediaItem) => void;
  profile?: UserProfile;
}

type TabMode = 'gif' | 'meme';
type LoopMode = 'normal' | 'boomerang' | 'reverse';
type MemeTemplate = 'impact' | 'modern' | 'news' | 'reaction';

export const MemeGifModal: React.FC<MemeGifModalProps> = ({
  isOpen,
  onClose,
  videoItem,
  onSaveToVault,
  profile,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('gif');

  // Video playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(videoItem.duration || 10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // GIF options
  const [gifStart, setGifStart] = useState<number>(0);
  const [gifEnd, setGifEnd] = useState<number>(Math.min(4, videoItem.duration || 4));
  const [gifFps, setGifFps] = useState<number>(10);
  const [gifSpeed, setGifSpeed] = useState<number>(1);
  const [gifResolution, setGifResolution] = useState<'sticker' | 'standard' | 'hd'>('sticker');
  const [loopMode, setLoopMode] = useState<LoopMode>('normal');
  const [gifCaption, setGifCaption] = useState<string>('');

  // Meme options
  const [memeTemplate, setMemeTemplate] = useState<MemeTemplate>('impact');
  const [topText, setTopText] = useState<string>('WHEN THE TROLL ANIMATION');
  const [bottomText, setBottomText] = useState<string>('ACTUALLY WORKS 💀');
  const [modernCaption, setModernCaption] = useState<string>('Me testing my animation at 3 AM:');
  const [newsTitle, setNewsTitle] = useState<string>('BREAKING: VIRAL TROLL MASTERPIECE RELEASED');
  const [includeReactionFace, setIncludeReactionFace] = useState<boolean>(true);
  const [selectedReaction, setSelectedReaction] = useState<string>('😈');
  const [freezeFrameTime, setFreezeFrameTime] = useState<number>(0);

  // Generation status
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
  const [generatedGifBlob, setGeneratedGifBlob] = useState<Blob | null>(null);
  const [generatedMemeUrl, setGeneratedMemeUrl] = useState<string | null>(null);
  const [generatedMemeBlob, setGeneratedMemeBlob] = useState<Blob | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setGifStart(0);
      setGifEnd(Math.min(4, videoItem.duration || 4));
      setFreezeFrameTime(0);
      setGeneratedGifUrl(null);
      setGeneratedGifBlob(null);
      setGeneratedMemeUrl(null);
      setGeneratedMemeBlob(null);
      setSaveSuccess(false);
    }
  }, [isOpen, videoItem]);

  if (!isOpen) return null;

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (activeTab === 'gif' && (t >= gifEnd || t < gifStart)) {
      videoRef.current.currentTime = gifStart;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || videoItem.duration || 10;
      setDuration(dur);
      setGifEnd(Math.min(gifStart + 4, dur));
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < gifStart || videoRef.current.currentTime >= gifEnd) {
        videoRef.current.currentTime = gifStart;
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // GENERATE ANIMATED GIF / STICKER
  const handleGenerateGif = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Setting up canvas & resolution...');

    try {
      const vid = videoRef.current;
      const start = Math.max(0, gifStart);
      const end = Math.min(duration, Math.max(start + 0.5, gifEnd));
      const clipDuration = end - start;

      let targetW = 320;
      let targetH = 320;
      if (gifResolution === 'standard') {
        targetW = 480;
        targetH = 480;
      } else if (gifResolution === 'hd') {
        targetW = 640;
        targetH = 480;
      }

      // Preserve video aspect ratio
      const vRatio = (vid.videoWidth || 16) / (vid.videoHeight || 9);
      if (vRatio > 1) {
        targetH = Math.round(targetW / vRatio);
      } else {
        targetW = Math.round(targetH * vRatio);
      }

      // Ensure even dimensions
      targetW = targetW % 2 === 0 ? targetW : targetW + 1;
      targetH = targetH % 2 === 0 ? targetH : targetH + 1;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get 2D canvas context');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const encoder = new GifEncoder(targetW, targetH, 0); // 0 = infinite loop
      const frameInterval = 1 / gifFps;
      const totalFramesToCapture = Math.min(75, Math.max(5, Math.round(clipDuration * gifFps)));
      const capturedFrames: CanvasRenderingContext2D[] = [];

      setStatusMessage(`Capturing ${totalFramesToCapture} frames...`);

      const origTime = vid.currentTime;
      const origPaused = vid.paused;
      vid.pause();

      for (let i = 0; i < totalFramesToCapture; i++) {
        const frameTime = start + i * frameInterval;
        if (frameTime > end) break;

        vid.currentTime = frameTime;
        await new Promise<void>((resolve) => {
          const onSeek = () => {
            vid.removeEventListener('seeked', onSeek);
            resolve();
          };
          vid.addEventListener('seeked', onSeek);
        });

        // Draw frame onto canvas
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(vid, 0, 0, targetW, targetH);

        // Optional text caption on GIF
        if (gifCaption.trim()) {
          ctx.save();
          const fontSize = Math.max(16, Math.round(targetW * 0.08));
          ctx.font = `900 ${fontSize}px 'Cinzel', Impact, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.lineWidth = Math.max(2, fontSize * 0.15);
          ctx.strokeStyle = '#000000';
          ctx.strokeText(gifCaption.trim().toUpperCase(), targetW / 2, targetH - 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(gifCaption.trim().toUpperCase(), targetW / 2, targetH - 10);
          ctx.restore();
        }

        encoder.addFrame(ctx, Math.round(1000 / (gifFps * gifSpeed)));
        setProgress(Math.round(((i + 1) / totalFramesToCapture) * 50));
      }

      // Boomerang loop mode: append reversed frames
      if (loopMode === 'boomerang') {
        setStatusMessage('Creating boomerang reverse loop...');
        // In reverse order excluding first & last
        for (let i = totalFramesToCapture - 2; i > 0; i--) {
          const frameTime = start + i * frameInterval;
          vid.currentTime = frameTime;
          await new Promise<void>((res) => {
            const onSeek = () => {
              vid.removeEventListener('seeked', onSeek);
              res();
            };
            vid.addEventListener('seeked', onSeek);
          });
          ctx.drawImage(vid, 0, 0, targetW, targetH);
          if (gifCaption.trim()) {
            ctx.save();
            const fontSize = Math.max(16, Math.round(targetW * 0.08));
            ctx.font = `900 ${fontSize}px 'Cinzel', Impact, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.lineWidth = Math.max(2, fontSize * 0.15);
            ctx.strokeStyle = '#000000';
            ctx.strokeText(gifCaption.trim().toUpperCase(), targetW / 2, targetH - 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(gifCaption.trim().toUpperCase(), targetW / 2, targetH - 10);
            ctx.restore();
          }
          encoder.addFrame(ctx, Math.round(1000 / (gifFps * gifSpeed)));
        }
      }

      setStatusMessage('Encoding GIF89a with color quantization...');
      const gifBlob = encoder.render((pct) => {
        setProgress(50 + Math.round(pct * 0.5));
      });

      const gifUrl = URL.createObjectURL(gifBlob);
      setGeneratedGifBlob(gifBlob);
      setGeneratedGifUrl(gifUrl);

      vid.currentTime = origTime;
      if (!origPaused) vid.play().catch(() => {});

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Failed to generate GIF', err);
      alert('Failed to generate GIF. Try a shorter time range.');
    } finally {
      setIsProcessing(false);
      setProgress(100);
      setStatusMessage('');
    }
  };

  // GENERATE MEME IMAGE
  const handleGenerateMeme = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setProgress(30);
    setStatusMessage('Rendering meme template...');

    try {
      const vid = videoRef.current;
      const targetTime = freezeFrameTime > 0 ? freezeFrameTime : currentTime;
      vid.currentTime = targetTime;

      await new Promise<void>((resolve) => {
        const onSeek = () => {
          vid.removeEventListener('seeked', onSeek);
          resolve();
        };
        vid.addEventListener('seeked', onSeek);
      });

      const origW = vid.videoWidth || 1280;
      const origH = vid.videoHeight || 720;
      const canvas = document.createElement('canvas');

      if (memeTemplate === 'modern') {
        // Modern Twitter/TikTok Meme Header with white card on top
        const headerHeight = Math.round(origH * 0.28);
        canvas.width = origW;
        canvas.height = origH + headerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        // Draw white header
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, origW, headerHeight);

        // Header caption text
        ctx.fillStyle = '#0a0a0c';
        const fontSize = Math.max(24, Math.round(origW * 0.045));
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Word wrap caption
        const padding = Math.round(origW * 0.04);
        const maxTextWidth = origW - padding * 2;
        const words = modernCaption.split(' ');
        let line = '';
        let lineY = padding;

        for (const w of words) {
          const testLine = line + w + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTextWidth && line !== '') {
            ctx.fillText(line, padding, lineY);
            line = w + ' ';
            lineY += fontSize * 1.35;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, padding, lineY);

        // Draw Video frame below header
        ctx.drawImage(vid, 0, headerHeight, origW, origH);
      } else if (memeTemplate === 'news') {
        // Breaking News chyron template
        canvas.width = origW;
        canvas.height = origH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        ctx.drawImage(vid, 0, 0, origW, origH);

        // Breaking News lower-third bar
        const barH = Math.round(origH * 0.22);
        const barY = origH - barH;

        // Red "BREAKING NEWS" badge
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, barY, Math.round(origW * 0.38), barH * 0.45);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(barH * 0.3)}px Impact, sans-serif`;
        ctx.fillText('BREAKING TROLL', 16, barY + barH * 0.32);

        // Yellow/Dark banner
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, barY + barH * 0.45, origW, barH * 0.55);
        ctx.fillStyle = '#facc15';
        ctx.font = `bold ${Math.round(barH * 0.26)}px sans-serif`;
        ctx.fillText(newsTitle.toUpperCase(), 16, barY + barH * 0.85);
      } else {
        // Classic Top & Bottom Impact Text Meme
        canvas.width = origW;
        canvas.height = origH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        ctx.drawImage(vid, 0, 0, origW, origH);

        const fontSize = Math.max(32, Math.round(origH * 0.12));
        ctx.font = `900 ${fontSize}px Impact, 'Cinzel', sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = Math.max(3, fontSize * 0.18);
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#ffffff';

        // Top text
        if (topText.trim()) {
          ctx.strokeText(topText.trim().toUpperCase(), origW / 2, fontSize * 1.1);
          ctx.fillText(topText.trim().toUpperCase(), origW / 2, fontSize * 1.1);
        }

        // Bottom text
        if (bottomText.trim()) {
          ctx.strokeText(bottomText.trim().toUpperCase(), origW / 2, origH - fontSize * 0.3);
          ctx.fillText(bottomText.trim().toUpperCase(), origW / 2, origH - fontSize * 0.3);
        }

        // Optional Troll reaction face stamp in bottom corner
        if (includeReactionFace) {
          ctx.font = `${Math.round(origH * 0.25)}px system-ui, sans-serif`;
          ctx.fillText(selectedReaction, origW - Math.round(origH * 0.15), origH - Math.round(origH * 0.1));
        }
      }

      const memeBlob = await new Promise<Blob | null>((res) => {
        canvas.toBlob((b) => res(b), 'image/jpeg', 0.95);
      });

      if (memeBlob) {
        setGeneratedMemeBlob(memeBlob);
        setGeneratedMemeUrl(URL.createObjectURL(memeBlob));
      }

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Failed to create meme', err);
      alert('Failed to generate meme');
    } finally {
      setIsProcessing(false);
      setProgress(100);
      setStatusMessage('');
    }
  };

  // SAVE TO VAULT AS STICKER OR PHOTO
  const handleSaveToVaultItem = () => {
    if (activeTab === 'gif' && generatedGifBlob) {
      const newGifItem: MediaItem = {
        id: `emoji-gif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `${videoItem.title} (GIF Sticker)`,
        type: 'emoji',
        url: generatedGifUrl || '',
        thumbnailUrl: generatedGifUrl || undefined,
        emojiSymbol: '🎞️',
        createdAt: Date.now(),
        resolution: gifResolution === 'sticker' ? '320x320 Sticker' : '480p GIF Loop',
        fileSize: `${(generatedGifBlob.size / 1024).toFixed(0)} KB`,
        tags: ['GIF', 'AnimatedSticker', 'TrollMeme', ...videoItem.tags],
        author: profile?.name || 'Troll Animator',
        format: 'GIF',
        blobData: generatedGifBlob,
      };

      onSaveToVault(newGifItem);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2400);
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
    } else if (activeTab === 'meme' && generatedMemeBlob) {
      const newMemeItem: MediaItem = {
        id: `photo-meme-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `${videoItem.title} (Meme)`,
        type: 'photo',
        url: generatedMemeUrl || '',
        thumbnailUrl: generatedMemeUrl || undefined,
        createdAt: Date.now(),
        resolution: '1920x1080 High-Res Meme',
        fileSize: `${(generatedMemeBlob.size / (1024 * 1024)).toFixed(1)} MB`,
        tags: ['Meme', 'Viral', 'TrollMeme', ...videoItem.tags],
        author: profile?.name || 'Troll Animator',
        format: 'JPG',
        blobData: generatedMemeBlob,
      };

      onSaveToVault(newMemeItem);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2400);
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
    }
  };

  // DOWNLOAD GENERATED FILE
  const handleDownloadGenerated = () => {
    if (activeTab === 'gif' && generatedGifBlob) {
      triggerBlobDownload(generatedGifBlob, `${videoItem.title.toLowerCase().replace(/\s+/g, '_')}_sticker.gif`);
    } else if (activeTab === 'meme' && generatedMemeBlob) {
      triggerBlobDownload(generatedMemeBlob, `${videoItem.title.toLowerCase().replace(/\s+/g, '_')}_meme.jpg`);
    }
  };

  // COPY GIF TO CLIPBOARD
  const handleCopyClipboard = async () => {
    if (activeTab === 'gif' && generatedGifBlob) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/gif': generatedGifBlob })
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
      } catch {
        // Fallback for browsers that only support png in clipboard
        alert('GIF downloaded to your device!');
        handleDownloadGenerated();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl bg-[#191512] border border-[#3e3428] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col celluloid-border">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#382f25] bg-[#15120f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 via-amber-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-black/50 border border-purple-400/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#fbf7ee] font-serif flex items-center gap-2">
                <span>Meme & Animated GIF Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                  From Video
                </span>
              </h2>
              <p className="text-[11px] text-[#a89b8c] truncate max-w-xs sm:max-w-md">
                Convert "{videoItem.title}" into an animated looping GIF or meme sticker to use anywhere!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#a89b8c] hover:text-[#fbf7ee] hover:bg-[#251f1a] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Mode Selector (Tabs) */}
        <div className="px-4 sm:px-6 py-2 bg-[#120f0d] border-b border-[#2d241c] flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('gif')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'gif'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/60 shadow-sm'
                : 'text-[#8e8071] hover:text-[#ede8df] hover:bg-[#1f1914]'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>🎞️ Animated GIF / Sticker Maker</span>
          </button>

          <button
            onClick={() => setActiveTab('meme')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'meme'
                ? 'bg-amber-600/30 text-amber-200 border border-amber-500/60 shadow-sm'
                : 'text-[#8e8071] hover:text-[#ede8df] hover:bg-[#1f1914]'
            }`}
          >
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>🎭 Meme Generator</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Dual Column Layout: Video Preview on Left, Controls on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left 6 cols: Video Source Player & Live Output */}
            <div className="lg:col-span-6 space-y-3">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#3e3428] shadow-lg flex items-center justify-center group">
                <video
                  ref={videoRef}
                  src={videoItem.url}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />

                {/* Center Play Overlay */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    type="button"
                    className="absolute z-10 w-12 h-12 rounded-full bg-amber-600/90 hover:bg-amber-500 text-white flex items-center justify-center shadow-2xl transition hover:scale-110 active:scale-95"
                  >
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </button>
                )}

                {/* Timeline Range Indicator */}
                <div className="absolute bottom-2 inset-x-2 px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-sm border border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>{currentTime.toFixed(1)}s</span>
                  </span>
                  <span>Clip Range: [{gifStart.toFixed(1)}s - {gifEnd.toFixed(1)}s]</span>
                </div>
              </div>

              {/* Range Scrubber Bar for GIF extraction */}
              {activeTab === 'gif' && (
                <div className="p-3 rounded-xl bg-[#14100d] border border-[#2d241c] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#a89b8c]">
                    <span className="font-semibold text-amber-300 font-serif">Select Video Slice</span>
                    <span className="font-mono text-[11px]">Duration: {(gifEnd - gifStart).toFixed(1)}s</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[#796c5e] block mb-1">Start Time (sec):</label>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, duration - 0.5)}
                        step={0.1}
                        value={gifStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGifStart(val);
                          if (val >= gifEnd) setGifEnd(Math.min(duration, val + 2));
                          if (videoRef.current) videoRef.current.currentTime = val;
                        }}
                        className="w-full h-1.5 bg-[#2d241c] accent-purple-500 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-purple-300">{gifStart.toFixed(1)}s</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#796c5e] block mb-1">End Time (sec):</label>
                      <input
                        type="range"
                        min={gifStart + 0.5}
                        max={duration}
                        step={0.1}
                        value={gifEnd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGifEnd(val);
                          if (videoRef.current) videoRef.current.currentTime = val;
                        }}
                        className="w-full h-1.5 bg-[#2d241c] accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-amber-300">{gifEnd.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scrubber for Freeze-Frame Meme */}
              {activeTab === 'meme' && (
                <div className="p-3 rounded-xl bg-[#14100d] border border-[#2d241c] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#a89b8c]">
                    <span className="font-semibold text-amber-300 font-serif">Pick Video Frame</span>
                    <span className="font-mono text-[11px]">Time: {freezeFrameTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={freezeFrameTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFreezeFrameTime(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full h-1.5 bg-[#2d241c] accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Live Result Preview if Generated */}
              {(generatedGifUrl || generatedMemeUrl) && (
                <div className="p-3.5 rounded-2xl bg-[#14100d] border-2 border-purple-500/60 space-y-2.5 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 font-serif flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>{activeTab === 'gif' ? 'Generated Animated GIF Loop' : 'Generated Meme'}</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">READY TO USE</span>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-56 border border-zinc-800">
                    <img
                      src={activeTab === 'gif' ? generatedGifUrl! : generatedMemeUrl!}
                      alt="Generated"
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Save Directly to Vault */}
                    <button
                      onClick={handleSaveToVaultItem}
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xs font-bold shadow-md shadow-black/50 border border-purple-400/40 flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      {saveSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Saved to Vault!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save to Vault {activeTab === 'gif' ? 'Stickers' : 'Photos'}</span>
                        </>
                      )}
                    </button>

                    {/* Download */}
                    <button
                      onClick={handleDownloadGenerated}
                      className="px-3 py-2 rounded-xl bg-[#26201a] hover:bg-[#322921] text-[#ede8df] text-xs font-semibold border border-[#44382c] flex items-center gap-1.5 transition active:scale-95"
                      title="Download file directly"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Download</span>
                    </button>

                    {/* Copy (for GIF) */}
                    {activeTab === 'gif' && (
                      <button
                        onClick={handleCopyClipboard}
                        className="px-3 py-2 rounded-xl bg-[#26201a] hover:bg-[#322921] text-[#ede8df] text-xs font-semibold border border-[#44382c] flex items-center gap-1.5 transition active:scale-95"
                        title="Copy to clipboard"
                      >
                        {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                        <span>{copiedSuccess ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Right 6 cols: Controls & Customization */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* TAB 1: GIF OPTIONS */}
              {activeTab === 'gif' && (
                <div className="space-y-4">
                  {/* Loop Style */}
                  <div>
                    <label className="block text-xs font-semibold text-[#ede8df] mb-1.5 font-serif">
                      Loop Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setLoopMode('normal')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                          loopMode === 'normal'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20] hover:text-white'
                        }`}
                      >
                        <Repeat className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                        <span>Infinite Loop</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoopMode('boomerang')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                          loopMode === 'boomerang'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20] hover:text-white'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                        <span>Boomerang</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoopMode('reverse')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                          loopMode === 'reverse'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20] hover:text-white'
                        }`}
                      >
                        <Zap className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                        <span>Reverse</span>
                      </button>
                    </div>
                  </div>

                  {/* Resolution / Quality */}
                  <div>
                    <label className="block text-xs font-semibold text-[#ede8df] mb-1.5 font-serif">
                      GIF Size & Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setGifResolution('sticker')}
                        className={`p-2 rounded-xl text-xs font-medium border transition ${
                          gifResolution === 'sticker'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600 font-bold'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20]'
                        }`}
                      >
                        <div>320p Sticker</div>
                        <div className="text-[10px] text-[#796c5e]">Discord / Fast</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGifResolution('standard')}
                        className={`p-2 rounded-xl text-xs font-medium border transition ${
                          gifResolution === 'standard'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600 font-bold'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20]'
                        }`}
                      >
                        <div>480p Standard</div>
                        <div className="text-[10px] text-[#796c5e]">Social Media</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGifResolution('hd')}
                        className={`p-2 rounded-xl text-xs font-medium border transition ${
                          gifResolution === 'hd'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600 font-bold'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20]'
                        }`}
                      >
                        <div>HD Loop</div>
                        <div className="text-[10px] text-[#796c5e]">Crisp Quality</div>
                      </button>
                    </div>
                  </div>

                  {/* Speed & Frame Rate */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#ede8df] mb-1 font-serif">
                        Speed
                      </label>
                      <select
                        value={gifSpeed}
                        onChange={(e) => setGifSpeed(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] focus:outline-none"
                      >
                        <option value={0.5}>0.5x (Slow Motion)</option>
                        <option value={1}>1.0x (Normal)</option>
                        <option value={1.5}>1.5x (Speed Pop)</option>
                        <option value={2}>2.0x (Troll Hyper Speed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#ede8df] mb-1 font-serif">
                        Smoothness (FPS)
                      </label>
                      <select
                        value={gifFps}
                        onChange={(e) => setGifFps(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] focus:outline-none"
                      >
                        <option value={6}>6 FPS (Retro / Tiny size)</option>
                        <option value={10}>10 FPS (Standard balance)</option>
                        <option value={15}>15 FPS (High smoothness)</option>
                      </select>
                    </div>
                  </div>

                  {/* Caption on GIF */}
                  <div>
                    <label className="block text-xs font-semibold text-[#ede8df] mb-1 font-serif">
                      Optional Caption on GIF
                    </label>
                    <input
                      type="text"
                      value={gifCaption}
                      onChange={(e) => setGifCaption(e.target.value)}
                      placeholder="e.g. WHEN YOU FINALLY CATCH THE TROLL..."
                      className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateGif}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-purple-950/50 border border-purple-500/40 flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>{isProcessing ? `Generating (${progress}%)...` : '⚡ Generate Animated GIF'}</span>
                  </button>

                  {isProcessing && (
                    <div className="space-y-1.5 text-center">
                      <div className="w-full bg-[#201914] rounded-full h-2 overflow-hidden border border-[#382f25]">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-amber-500 h-full transition-all duration-150"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#a89b8c] font-mono">{statusMessage}</p>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: MEME GENERATOR */}
              {activeTab === 'meme' && (
                <div className="space-y-4">
                  
                  {/* Template Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-[#ede8df] mb-1.5 font-serif">
                      Meme Layout Template
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMemeTemplate('impact')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                          memeTemplate === 'impact'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20]'
                        }`}
                      >
                        <Type className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                        <span>Classic Impact</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemeTemplate('modern')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                          memeTemplate === 'modern'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20]'
                        }`}
                      >
                        <Layers className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                        <span>Social Banner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemeTemplate('news')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                          memeTemplate === 'news'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                            : 'bg-[#181310] text-[#a89b8c] border-[#342a20]'
                        }`}
                      >
                        <Film className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                        <span>Breaking News</span>
                      </button>
                    </div>
                  </div>

                  {/* Template specific fields */}
                  {memeTemplate === 'impact' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#ede8df] mb-1">Top Text:</label>
                        <input
                          type="text"
                          value={topText}
                          onChange={(e) => setTopText(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] uppercase focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#ede8df] mb-1">Bottom Text:</label>
                        <input
                          type="text"
                          value={bottomText}
                          onChange={(e) => setBottomText(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] uppercase focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Troll Face corner sticker */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs text-[#ede8df] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeReactionFace}
                            onChange={(e) => setIncludeReactionFace(e.target.checked)}
                            className="rounded bg-[#201914] border-[#382f25] text-amber-600 focus:ring-0"
                          />
                          <span>Add Troll Reaction Stamp</span>
                        </label>

                        {includeReactionFace && (
                          <div className="flex items-center gap-1">
                            {['😈', '💀', '🤡', '🔥', '😂'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setSelectedReaction(emoji)}
                                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                                  selectedReaction === emoji ? 'bg-amber-600/40 border border-amber-500' : 'hover:bg-[#251f1a]'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {memeTemplate === 'modern' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#ede8df] mb-1">Meme Caption:</label>
                      <textarea
                        rows={2}
                        value={modernCaption}
                        onChange={(e) => setModernCaption(e.target.value)}
                        placeholder="Nobody: ... Me at 3 AM:"
                        className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {memeTemplate === 'news' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#ede8df] mb-1">Headline Text:</label>
                      <input
                        type="text"
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#14100d] border border-[#382f25] text-xs text-[#fbf7ee] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {/* Generate Meme Button */}
                  <button
                    onClick={handleGenerateMeme}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-amber-950/50 border border-amber-500/40 flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Smile className="w-4 h-4" />
                    <span>{isProcessing ? 'Rendering...' : '🎭 Render High-Res Meme'}</span>
                  </button>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
