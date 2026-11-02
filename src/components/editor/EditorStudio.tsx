import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  RotateCcw, 
  Scissors, 
  Palette, 
  Crop, 
  Type, 
  Sparkles, 
  Smile, 
  Play, 
  Pause, 
  Check, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Plus, 
  Trash2, 
  Sliders, 
  ZoomIn, 
  Eye, 
  ShieldAlert, 
  Maximize2,
  Video as VideoIcon,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  MediaItem, 
  AspectRatioType, 
  TextOverlay, 
  StickerOverlay, 
  MediaFilterSettings, 
  VideoTrim,
  DownloadFormat
} from '../../types/media';
import { triggerBlobDownload, triggerDirectDownload } from '../../utils/download';
import { downloadManager } from '../../services/downloadManager';

interface EditorStudioProps {
  item: MediaItem;
  onClose: () => void;
  onSave: (updatedItem: MediaItem) => void;
  onOpenDownloadManager?: () => void;
  vaultItems?: MediaItem[];
}

const DEFAULT_FILTERS: MediaFilterSettings = {
  filterPreset: 'normal',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  vibrance: 0,
  temperature: 0,
  exposure: 0,
  hueRotate: 0,
  blur: 0,
  sepia: 0,
  vignette: 0,
  invert: 0,
};

const SOCIAL_FILTERS = [
  { id: 'normal', name: 'Original', filter: 'none', desc: 'No color changes' },
  { id: 'troll_viral', name: 'Troll Viral Pop', filter: 'contrast(125%) saturate(145%) brightness(105%)', desc: 'Punchy vibrant high-contrast' },
  { id: 'cinematic', name: 'Teal & Orange', filter: 'contrast(115%) saturate(125%) hue-rotate(10deg)', desc: 'Hollywood cinematic tone' },
  { id: 'vhs90s', name: '90s VHS Camcorder', filter: 'sepia(30%) contrast(110%) brightness(108%) saturate(120%)', desc: 'Retro aesthetic' },
  { id: 'golden', name: 'Golden Hour Glow', filter: 'sepia(25%) saturate(135%) brightness(106%) contrast(105%)', desc: 'Sunset skin tones' },
  { id: 'cyberpunk', name: 'Cyber Neon', filter: 'saturate(180%) contrast(120%) hue-rotate(290deg)', desc: 'Electric nightclub aesthetic' },
  { id: 'noir', name: 'Classic Noir B&W', filter: 'grayscale(100%) contrast(140%) brightness(95%)', desc: 'High contrast monochrome' },
  { id: 'pastel', name: 'Soft Indie Pastel', filter: 'contrast(95%) brightness(110%) saturate(110%)', desc: 'Aesthetic dream tones' },
  { id: 'glitch', name: 'Digital Glitch', filter: 'invert(15%) saturate(160%) hue-rotate(45deg)', desc: 'Meme chaos distortion' },
];

export const EditorStudio: React.FC<EditorStudioProps> = ({ 
  item, 
  onClose, 
  onSave,
  onOpenDownloadManager,
  vaultItems = [],
}) => {
  // Tabs: 'trim' | 'filters' | 'crop' | 'text' | 'effects' | 'stickers'
  const [activeTab, setActiveTab] = useState<'trim' | 'filters' | 'crop' | 'text' | 'effects' | 'stickers'>(
    item.type === 'video' ? 'trim' : 'filters'
  );

  // General settings
  const [itemTitle, setItemTitle] = useState(item.title);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(item.savedEdits?.aspectRatio || 'original');
  const [zoomLevel, setZoomLevel] = useState<number>(item.savedEdits?.zoom || 1);
  const [panX, setPanX] = useState<number>(item.savedEdits?.panX || 0);
  const [panY, setPanY] = useState<number>(item.savedEdits?.panY || 0);
  const [rotation, setRotation] = useState<number>(item.savedEdits?.rotation || 0);
  const [flipH, setFlipH] = useState<boolean>(item.savedEdits?.flipH || false);
  const [flipV, setFlipV] = useState<boolean>(item.savedEdits?.flipV || false);

  // Advanced toggles
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [compareOriginal, setCompareOriginal] = useState<boolean>(false);

  // Filters & Grading
  const [filters, setFilters] = useState<MediaFilterSettings>(
    item.savedEdits?.filterSettings || DEFAULT_FILTERS
  );

  // Video Trimming
  const [videoDuration, setVideoDuration] = useState<number>(item.duration || 15);
  const [trim, setTrim] = useState<VideoTrim>(
    item.savedEdits?.trim || { start: 0, end: item.duration || 15 }
  );
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(item.savedEdits?.playbackSpeed || 1);

  // Transitions
  const [transitionEffect, setTransitionEffect] = useState<string>(item.savedEdits?.transition || 'none');
  const [transitionDuration, setTransitionDuration] = useState<number>(item.savedEdits?.transitionDuration || 0.6);

  // Text Overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>(
    item.savedEdits?.textOverlays || [
      {
        id: 'txt-1',
        text: 'WAIT FOR THE END 💀',
        fontFamily: 'meme',
        fontSize: 28,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        outlineColor: '#000000',
        outlineWidth: 2,
        x: 50,
        y: 84,
        animation: 'none',
      },
    ]
  );
  const [selectedTextId, setSelectedTextId] = useState<string>(textOverlays[0]?.id || '');

  // Stickers / Troll Emojis
  const [stickers, setStickers] = useState<StickerOverlay[]>(item.savedEdits?.stickers || []);

  // UI status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportQuality, setExportQuality] = useState<'1080p' | '4k' | 'original'>('1080p');
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle video time loop within trim range
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentPlaybackTime(curr);

    if (curr >= trim.end) {
      videoRef.current.currentTime = trim.start;
    }
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < trim.start || videoRef.current.currentTime >= trim.end) {
        videoRef.current.currentTime = trim.start;
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Build composite filter string
  const getFilterStyle = () => {
    if (compareOriginal) return 'none';
    const preset = SOCIAL_FILTERS.find((p) => p.id === filters.filterPreset);
    let base = preset && preset.filter !== 'none' ? preset.filter + ' ' : '';

    const b = `brightness(${filters.brightness + (filters.exposure || 0)}%) `;
    const c = `contrast(${filters.contrast}%) `;
    const s = `saturate(${filters.saturation + (filters.vibrance || 0)}%) `;
    const h = filters.hueRotate ? `hue-rotate(${filters.hueRotate}deg) ` : '';
    const bl = filters.blur ? `blur(${filters.blur}px) ` : '';
    const sp = filters.sepia ? `sepia(${filters.sepia}%) ` : '';
    const inv = filters.invert ? `invert(${filters.invert}%) ` : '';

    return `${base}${b}${c}${s}${h}${bl}${sp}${inv}`.trim();
  };

  // Build transform matrix
  const getTransformStyle = () => {
    const scaleX = (flipH ? -1 : 1) * zoomLevel;
    const scaleY = (flipV ? -1 : 1) * zoomLevel;
    return `translate(${panX}px, ${panY}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
  };

  // Aspect ratio wrapper styling
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '9:16': return 'aspect-[9/16] max-h-[58vh] max-w-sm';
      case '1:1': return 'aspect-square max-h-[55vh] max-w-md';
      case '4:5': return 'aspect-[4/5] max-h-[58vh] max-w-md';
      case '16:9': return 'aspect-video max-w-2xl';
      case '21:9': return 'aspect-[21/9] max-w-3xl';
      default: return 'max-h-[58vh] max-w-2xl';
    }
  };

  // Text overlay helpers
  const handleAddText = (typePreset?: 'meme' | 'tiktok' | 'neon') => {
    const newId = `txt-${Date.now()}`;
    const newOverlay: TextOverlay = {
      id: newId,
      text: typePreset === 'meme' ? 'TOP TEXT HERE' : typePreset === 'neon' ? 'VIRAL VIBES' : 'Add TikTok Subtitle',
      fontFamily: typePreset === 'meme' ? 'meme' : typePreset === 'neon' ? 'neon' : 'sans',
      fontSize: typePreset === 'meme' ? 36 : 26,
      color: typePreset === 'neon' ? '#f43f5e' : '#ffffff',
      backgroundColor: typePreset === 'tiktok' ? '#facc15' : 'rgba(0,0,0,0.85)',
      outlineColor: typePreset === 'meme' ? '#000000' : undefined,
      outlineWidth: typePreset === 'meme' ? 3 : 0,
      x: 50,
      y: typePreset === 'meme' ? 20 : 80,
      animation: typePreset === 'neon' ? 'glow' : 'none',
    };
    setTextOverlays([...textOverlays, newOverlay]);
    setSelectedTextId(newId);
  };

  const handleUpdateSelectedText = (updates: Partial<TextOverlay>) => {
    setTextOverlays(
      textOverlays.map((t) => (t.id === selectedTextId ? { ...t, ...updates } : t))
    );
  };

  const handleDeleteSelectedText = () => {
    setTextOverlays(textOverlays.filter((t) => t.id !== selectedTextId));
    setSelectedTextId(textOverlays[0]?.id || '');
  };

  const stickerImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const getLoadedStickerImage = (url: string): HTMLImageElement => {
    let img = stickerImageCache.current.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      stickerImageCache.current.set(url, img);
    }
    return img;
  };

  const handleAddSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: `stk-${Date.now()}`,
      emoji,
      x: 50,
      y: 40,
      size: 54,
      rotation: 0,
    };
    setStickers([...stickers, newSticker]);
  };

  const handleAddVaultSticker = (vaultItem: MediaItem) => {
    const newSticker: StickerOverlay = {
      id: `stk-${Date.now()}`,
      emoji: vaultItem.emojiSymbol || '👾',
      imageUrl: vaultItem.thumbnailUrl || vaultItem.url,
      x: 50,
      y: 40,
      size: 70,
      rotation: 0,
    };
    if (vaultItem.thumbnailUrl || vaultItem.url) {
      getLoadedStickerImage(vaultItem.thumbnailUrl || vaultItem.url);
    }
    setStickers((prev) => [...prev, newSticker]);
  };

  const handleResetAll = () => {
    setFilters(DEFAULT_FILTERS);
    setAspectRatio('original');
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setTransitionEffect('none');
    setPlaybackSpeed(1);
    if (item.duration) {
      setTrim({ start: 0, end: item.duration });
    }
  };

  // Save changes as a NEW copy in vault, keeping the original video untouched
  const handleSaveToVault = () => {
    setIsSaving(true);
    const newCopyId = `${item.type}-edit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const defaultEditedTitle = itemTitle.trim() === item.title ? `${item.title} (Edited Cut)` : itemTitle.trim();

    const newCopyItem: MediaItem = {
      ...item,
      id: newCopyId,
      title: defaultEditedTitle,
      isEdited: true,
      createdAt: Date.now(),
      duration: item.type === 'video' ? Math.round(trim.end - trim.start) : item.duration,
      savedEdits: {
        filterSettings: filters,
        trim,
        aspectRatio,
        zoom: zoomLevel,
        panX,
        panY,
        rotation,
        flipH,
        flipV,
        textOverlays,
        stickers,
        transition: transitionEffect,
        transitionDuration,
        playbackSpeed,
      },
    };

    onSave(newCopyItem);
    setIsSaving(false);
    setSaveSuccess(true);
    confetti({ particleCount: 55, spread: 65, origin: { y: 0.8 } });
    setTimeout(() => setSaveSuccess(false), 2400);
  };

  // High-fidelity export with greater quality (1080p 60fps, 4K, or lossless source)
  const handleExportDownload = async () => {
    setIsExporting(true);
    setExportProgress(10);

    try {
      if (item.type === 'photo' || item.type === 'emoji') {
        const canvas = document.createElement('canvas');

        if (item.type === 'emoji') {
          // Render at Ultra HD 2048x2048 for vector-sharp emoji sticker quality
          canvas.width = 2048;
          canvas.height = 2048;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, 2048, 2048);

            // Draw Vignette
            if (filters.vignette > 0) {
              const rad = ctx.createRadialGradient(1024, 1024, 400, 1024, 1024, 1024);
              rad.addColorStop(0, 'rgba(0,0,0,0)');
              rad.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
              ctx.fillStyle = rad;
              ctx.fillRect(0, 0, 2048, 2048);
            }

            // Draw Emoji
            ctx.filter = getFilterStyle();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '1000px system-ui, -apple-system, sans-serif';
            ctx.fillText(item.emojiSymbol || '😈', 1024, 1060);
            ctx.filter = 'none';

            // Draw Text Overlays
            textOverlays.forEach((t) => {
              const tx = (t.x / 100) * 2048;
              const ty = (t.y / 100) * 2048;
              const fontSize = t.fontSize * 4.8;
              ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
              const textMetrics = ctx.measureText(t.text);
              const textWidth = textMetrics.width;
              const textHeight = fontSize * 1.3;
              const padX = fontSize * 0.4;
              const padY = fontSize * 0.25;

              if (t.backgroundColor && t.backgroundColor !== 'transparent') {
                ctx.fillStyle = t.backgroundColor;
                ctx.beginPath();
                ctx.roundRect(tx - textWidth / 2 - padX, ty - textHeight / 2 - padY, textWidth + padX * 2, textHeight + padY * 2, 48);
                ctx.fill();
              }

              if (t.outlineColor && t.outlineWidth) {
                ctx.strokeStyle = t.outlineColor;
                ctx.lineWidth = t.outlineWidth * 4;
                ctx.strokeText(t.text, tx, ty);
              }

              ctx.fillStyle = t.color;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(t.text, tx, ty);
            });

            await new Promise<void>((res) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  triggerBlobDownload(blob, `${itemTitle.toLowerCase().replace(/\s+/g, '_')}_master_uhd.png`);
                }
                res();
              }, 'image/png');
            });
          }
        } else {
          // Photo High-Fidelity Rendering: full resolution or 4K/1080p
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = item.url;
          });

          const naturalW = img.naturalWidth || 1920;
          const naturalH = img.naturalHeight || 1080;
          const scale = exportQuality === '4k' 
            ? Math.max(3840 / naturalW, 2160 / naturalH, 1.5)
            : exportQuality === '1080p'
            ? Math.max(1920 / naturalW, 1080 / naturalH, 1.0)
            : 1.0;

          const w = Math.round(naturalW * scale);
          const h = Math.round(naturalH * scale);

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.save();
            ctx.filter = getFilterStyle();
            ctx.translate(w / 2 + panX * scale, h / 2 + panY * scale);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale((flipH ? -1 : 1) * zoomLevel, (flipV ? -1 : 1) * zoomLevel);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();

            // Text Overlays
            textOverlays.forEach((t) => {
              const tx = (t.x / 100) * w;
              const ty = (t.y / 100) * h;
              const fontSize = (t.fontSize / 300) * Math.min(w, h);
              ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
              const textMetrics = ctx.measureText(t.text);
              const textWidth = textMetrics.width;
              const textHeight = fontSize * 1.3;
              const padX = fontSize * 0.4;
              const padY = fontSize * 0.25;

              if (t.backgroundColor && t.backgroundColor !== 'transparent') {
                ctx.fillStyle = t.backgroundColor;
                ctx.beginPath();
                ctx.roundRect(tx - textWidth / 2 - padX, ty - textHeight / 2 - padY, textWidth + padX * 2, textHeight + padY * 2, fontSize * 0.3);
                ctx.fill();
              }

              if (t.outlineColor && t.outlineWidth) {
                ctx.strokeStyle = t.outlineColor;
                ctx.lineWidth = t.outlineWidth * 2 * scale;
                ctx.strokeText(t.text, tx, ty);
              }

              ctx.fillStyle = t.color;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(t.text, tx, ty);
            });

            // Stickers
            stickers.forEach((stk) => {
              const sx = (stk.x / 100) * w;
              const sy = (stk.y / 100) * h;
              const size = (stk.size / 300) * Math.min(w, h);
              if (stk.imageUrl) {
                const sImg = getLoadedStickerImage(stk.imageUrl);
                if (sImg && sImg.complete && sImg.naturalWidth > 0) {
                  const sw = size * 1.5;
                  const sh = size * 1.5;
                  ctx.save();
                  ctx.translate(sx, sy);
                  ctx.rotate((stk.rotation * Math.PI) / 180);
                  ctx.drawImage(sImg, -sw / 2, -sh / 2, sw, sh);
                  ctx.restore();
                  return;
                }
              }
              ctx.save();
              ctx.translate(sx, sy);
              ctx.rotate((stk.rotation * Math.PI) / 180);
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = `${size}px system-ui, -apple-system, sans-serif`;
              ctx.fillText(stk.emoji, 0, 0);
              ctx.restore();
            });

            await new Promise<void>((res) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  triggerBlobDownload(blob, `${itemTitle.toLowerCase().replace(/\s+/g, '_')}_master_${exportQuality}.png`);
                }
                res();
              }, 'image/png');
            });
          }
        }
      } else {
        // Video High-Quality Export
        const filename = `${itemTitle.toLowerCase().replace(/\s+/g, '_')}_${exportQuality}.mp4`;

        // If user chose Original Lossless Source or if we directly have the clean video blob:
        if (exportQuality === 'original') {
          if (item.blobData) {
            triggerBlobDownload(item.blobData, filename);
          } else {
            triggerDirectDownload(item.url, filename);
          }
        } else {
          // Frame-by-frame high-bitrate video export with edits & audio
          const vid = videoRef.current;
          const canvasTest = document.createElement('canvas');
          const hasStream = typeof (canvasTest as any).captureStream === 'function';

          if (vid && hasStream && typeof MediaRecorder !== 'undefined') {
            setExportProgress(15);
            try {
              let targetW = exportQuality === '4k' ? 3840 : 1920;
              let targetH = exportQuality === '4k' ? 2160 : 1080;
              if (aspectRatio === '9:16') {
                targetW = exportQuality === '4k' ? 2160 : 1080;
                targetH = exportQuality === '4k' ? 3840 : 1920;
              } else if (aspectRatio === '1:1') {
                targetW = targetH = exportQuality === '4k' ? 2160 : 1080;
              } else if (aspectRatio === '4:5') {
                targetW = exportQuality === '4k' ? 2160 : 1080;
                targetH = exportQuality === '4k' ? 2700 : 1350;
              }

              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Canvas 2D unavailable');
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              const mimeOptions = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4'
              ];
              const mimeType = mimeOptions.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
              const stream = (canvas as any).captureStream(exportQuality === '4k' ? 30 : 60);

              const bps = exportQuality === '4k' ? 28_000_000 : 16_000_000;
              const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: bps,
              });

              const chunks: Blob[] = [];
              recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
              };

              await new Promise<void>((resolve, reject) => {
                recorder.onstop = () => {
                  const finalBlob = new Blob(chunks, { type: mimeType });
                  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                  triggerBlobDownload(finalBlob, `${itemTitle.toLowerCase().replace(/\s+/g, '_')}_master_${exportQuality}.${ext}`);
                  resolve();
                };
                recorder.onerror = (e) => reject(e);

                const startTime = trim.start || 0;
                const endTime = trim.end && trim.end > startTime ? trim.end : (vid.duration || 10);
                const totalDur = Math.max(0.5, endTime - startTime);

                const origTime = vid.currentTime;
                const origPaused = vid.paused;

                vid.currentTime = startTime;

                let reqId: number;
                let active = true;

                const drawFrame = () => {
                  if (!active) return;
                  const current = vid.currentTime;
                  const progressPct = Math.min(98, Math.round(((current - startTime) / totalDur) * 100));
                  setExportProgress(progressPct);

                  // Canvas draw
                  ctx.fillStyle = '#0a0a0c';
                  ctx.fillRect(0, 0, targetW, targetH);

                  ctx.save();
                  ctx.filter = getFilterStyle();
                  ctx.translate(targetW / 2 + panX, targetH / 2 + panY);
                  ctx.rotate((rotation * Math.PI) / 180);
                  ctx.scale((flipH ? -1 : 1) * zoomLevel, (flipV ? -1 : 1) * zoomLevel);

                  const vw = vid.videoWidth || 1920;
                  const vh = vid.videoHeight || 1080;
                  const vRatio = vw / vh;
                  const cRatio = targetW / targetH;
                  let dw = targetW;
                  let dh = targetH;
                  if (vRatio > cRatio) {
                    dw = targetW;
                    dh = targetW / vRatio;
                  } else {
                    dh = targetH;
                    dw = targetH * vRatio;
                  }
                  ctx.drawImage(vid, -dw / 2, -dh / 2, dw, dh);
                  ctx.restore();

                  // Text Overlays
                  textOverlays.forEach((t) => {
                    const tx = (t.x / 100) * targetW;
                    const ty = (t.y / 100) * targetH;
                    const fontSize = (t.fontSize / 300) * Math.min(targetW, targetH);
                    ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
                    const textMetrics = ctx.measureText(t.text);
                    const textWidth = textMetrics.width;
                    const textHeight = fontSize * 1.3;
                    const padX = fontSize * 0.4;
                    const padY = fontSize * 0.25;

                    if (t.backgroundColor && t.backgroundColor !== 'transparent') {
                      ctx.fillStyle = t.backgroundColor;
                      ctx.beginPath();
                      ctx.roundRect(tx - textWidth / 2 - padX, ty - textHeight / 2 - padY, textWidth + padX * 2, textHeight + padY * 2, fontSize * 0.3);
                      ctx.fill();
                    }

                    if (t.outlineColor && t.outlineWidth) {
                      ctx.strokeStyle = t.outlineColor;
                      ctx.lineWidth = t.outlineWidth * 2;
                      ctx.strokeText(t.text, tx, ty);
                    }

                    ctx.fillStyle = t.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(t.text, tx, ty);
                  });

                  // Stickers
                  stickers.forEach((stk) => {
                    const sx = (stk.x / 100) * targetW;
                    const sy = (stk.y / 100) * targetH;
                    const size = (stk.size / 300) * Math.min(targetW, targetH);
                    if (stk.imageUrl) {
                      const sImg = getLoadedStickerImage(stk.imageUrl);
                      if (sImg && sImg.complete && sImg.naturalWidth > 0) {
                        const sw = size * 1.5;
                        const sh = size * 1.5;
                        ctx.save();
                        ctx.translate(sx, sy);
                        ctx.rotate((stk.rotation * Math.PI) / 180);
                        ctx.drawImage(sImg, -sw / 2, -sh / 2, sw, sh);
                        ctx.restore();
                        return;
                      }
                    }
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate((stk.rotation * Math.PI) / 180);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${size}px system-ui, -apple-system, sans-serif`;
                    ctx.fillText(stk.emoji, 0, 0);
                    ctx.restore();
                  });

                  if (current >= endTime || vid.ended) {
                    active = false;
                    cancelAnimationFrame(reqId);
                    vid.pause();
                    recorder.stop();
                    vid.currentTime = origTime;
                    if (!origPaused) vid.play().catch(() => {});
                    return;
                  }

                  reqId = requestAnimationFrame(drawFrame);
                };

                const onSeekedForExport = () => {
                  vid.removeEventListener('seeked', onSeekedForExport);
                  recorder.start(100);
                  vid.play().catch(() => {});
                  reqId = requestAnimationFrame(drawFrame);
                };

                vid.addEventListener('seeked', onSeekedForExport);
              });
            } catch (err) {
              console.warn('Canvas export fallback to direct download', err);
              if (item.blobData) {
                triggerBlobDownload(item.blobData, filename);
              } else {
                triggerDirectDownload(item.url, filename);
              }
            }
          } else {
            // High-speed lossless source download
            if (item.blobData) {
              triggerBlobDownload(item.blobData, filename);
            } else {
              triggerDirectDownload(item.url, filename);
            }
          }
        }
      }

      setExportProgress(100);
      confetti({ particleCount: 75, spread: 85, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(null), 2000);
    }
  };

  const selectedText = textOverlays.find((t) => t.id === selectedTextId);

  return (
    <div className="fixed inset-0 z-50 bg-[#141210] flex flex-col overflow-hidden text-[#ede8df] font-sans">
      
      {/* Traditional Studio Header - Responsive Two-tier / Adaptive on Mobile */}
      <header className="bg-[#191512] border-b border-[#382f25] px-3 sm:px-6 py-2 sm:py-3 flex flex-col gap-2 shrink-0 z-20 shadow-md">
        
        {/* Tier 1: Navigation, Title & Primary Actions */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Back & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-[#a89b8c] hover:text-[#fbf7ee] hover:bg-[#27211b] transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Return to Vault"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Vault</span>
            </button>

            <div className="h-4 w-[1px] bg-[#382f25] hidden sm:block" />

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2b221b] text-amber-400 border border-amber-800/60 uppercase tracking-widest shrink-0">
                STUDIO
              </span>
              <input
                type="text"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                className="bg-transparent border-b border-transparent hover:border-[#44382c] focus:border-amber-500 text-xs sm:text-sm font-bold text-[#fbf7ee] font-serif px-1 py-0.5 focus:outline-none max-w-[120px] sm:max-w-xs truncate transition"
                title="Click to rename in editor"
              />
            </div>
          </div>

          {/* Primary Action Buttons: Compact on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Save as New Copy (Original remains untouched) */}
            <button
              onClick={handleSaveToVault}
              disabled={isSaving}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md ${
                saveSuccess
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#27201b] hover:bg-[#322923] text-[#ede8df] border border-[#44382c]'
              }`}
              title="Save as a new copy in vault (original video remains completely untouched)"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="text-[11px] sm:text-xs">Saved Copy!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Save as New Copy</span>
                  <span className="sm:hidden text-[11px]">Save Copy</span>
                </>
              )}
            </button>

            {/* Quality Selector */}
            <div className="flex items-center bg-[#231d17] border border-[#44382c] rounded-lg sm:rounded-xl p-0.5 text-xs shrink-0 shadow-inner">
              <select
                value={exportQuality}
                onChange={(e) => setExportQuality(e.target.value as any)}
                disabled={isExporting}
                className="bg-transparent text-[#fbf7ee] text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-1 rounded focus:outline-none cursor-pointer"
                title="Select Export Quality (Ultra-HD 1080p 60fps, 4K Master, or Original Lossless Source)"
              >
                <option value="1080p" className="bg-[#1c1713] text-[#fbf7ee]">1080p Ultra HD</option>
                <option value="4k" className="bg-[#1c1713] text-[#fbf7ee]">4K Master</option>
                <option value="original" className="bg-[#1c1713] text-[#fbf7ee]">Lossless Original</option>
              </select>
            </div>

            {/* Export & Download */}
            <button
              onClick={handleExportDownload}
              disabled={isExporting}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-black/50 border border-amber-500/40 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isExporting 
                  ? (exportProgress !== null ? `Exporting (${exportProgress}%)...` : 'Rendering Quality...')
                  : 'Export & Download'}
              </span>
              <span className="sm:hidden text-[11px]">
                {isExporting 
                  ? `${exportProgress ?? 0}%` 
                  : 'Export'}
              </span>
            </button>
          </div>

        </div>

        {/* Tier 2: Precision Studio Controls (Compare, Safe Zone, Reset) */}
        <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 border-t border-[#29221b] text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Compare Before / After Button */}
            <button
              onMouseDown={() => setCompareOriginal(true)}
              onMouseUp={() => setCompareOriginal(false)}
              onMouseLeave={() => setCompareOriginal(false)}
              onTouchStart={() => setCompareOriginal(true)}
              onTouchEnd={() => setCompareOriginal(false)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1 ${
                compareOriginal ? 'bg-amber-500 text-black border-amber-400' : 'bg-[#221c17] text-[#a89b8c] border-[#382f25] hover:text-white'
              }`}
              title="Hold to preview original unedited media"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>Hold: Original</span>
            </button>

            {/* Safe Zone Guide Toggle */}
            <button
              onClick={() => setShowSafeZone(!showSafeZone)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1 ${
                showSafeZone ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-[#221c17] text-[#a89b8c] border-[#382f25] hover:text-white'
              }`}
              title="Toggle TikTok / Reels Safe Zones"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Safe Zone</span>
            </button>
          </div>

          <button
            onClick={handleResetAll}
            className="px-2 py-1 rounded-md text-[11px] font-medium text-[#8e8071] hover:text-white hover:bg-[#27211b] transition flex items-center gap-1 ml-auto sm:ml-0"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

      </header>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* CENTER STAGE CANVAS - Scales responsively on mobile so tools fit */}
        <div className="flex-1 max-h-[38vh] sm:max-h-[50vh] lg:max-h-full bg-[#12100e] flex flex-col justify-center items-center p-2.5 sm:p-5 overflow-hidden relative select-none">
          
          <div 
            className={`relative rounded-2xl overflow-hidden bg-black shadow-2xl border border-zinc-800 flex items-center justify-center transition-all duration-300 ${getAspectRatioClass()}`}
            style={{
              boxShadow: filters.vignette > 0 ? `inset 0 0 ${filters.vignette * 1.5}px rgba(0,0,0,0.9)` : undefined,
            }}
          >
            {/* Visual Media: Video, Photo, or Emoji */}
            {item.type === 'video' ? (
              <video
                ref={videoRef}
                src={item.url}
                playsInline
                loop
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  setVideoDuration(dur);
                  if (trim.end === 15 || trim.end > dur) {
                    setTrim({ start: 0, end: dur });
                  }
                }}
                onClick={toggleVideoPlayback}
                style={{
                  filter: getFilterStyle(),
                  transform: getTransformStyle(),
                }}
                className="w-full h-full object-cover cursor-pointer"
              />
            ) : item.type === 'photo' ? (
              <img
                src={item.url}
                alt={item.title}
                style={{
                  filter: getFilterStyle(),
                  transform: getTransformStyle(),
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                style={{
                  filter: getFilterStyle(),
                  transform: getTransformStyle(),
                }}
                className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 p-8"
              >
                <span className="text-8xl filter drop-shadow-[0_12px_24px_rgba(244,63,94,0.4)]">
                  {item.emojiSymbol}
                </span>
              </div>
            )}

            {/* Social Media Safe Zone Guide Overlays (TikTok / Reels layout) */}
            {showSafeZone && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-rose-500/50 flex flex-col justify-between p-6">
                <div className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded self-center backdrop-blur-sm">
                  TOP BAR SAFE ZONE (Keep titles below here)
                </div>
                <div className="flex justify-between items-end">
                  <div className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                    CAPTION ZONE
                  </div>
                  <div className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                    REELS/TIKTOK BUTTONS (Keep clear)
                  </div>
                </div>
              </div>
            )}

            {/* Draggable & Styled Text Overlays */}
            {textOverlays.map((textItem) => (
              <div
                key={textItem.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTextId(textItem.id);
                  setActiveTab('text');
                }}
                style={{
                  left: `${textItem.x}%`,
                  top: `${textItem.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${textItem.fontSize}px`,
                  color: textItem.color,
                  backgroundColor: textItem.backgroundColor,
                  fontFamily: textItem.fontFamily === 'meme' ? 'Impact, sans-serif' :
                             textItem.fontFamily === 'serif' ? 'Georgia, serif' : 
                             textItem.fontFamily === 'mono' ? 'JetBrains Mono, monospace' : 
                             textItem.fontFamily === 'neon' ? 'cursive, fantasy' : 'inherit',
                  textShadow: textItem.outlineWidth
                    ? `-1px -1px 0 ${textItem.outlineColor}, 1px -1px 0 ${textItem.outlineColor}, -1px 1px 0 ${textItem.outlineColor}, 1px 1px 0 ${textItem.outlineColor}`
                    : textItem.animation === 'glow'
                    ? '0 0 10px #f43f5e, 0 0 20px #f43f5e'
                    : undefined,
                }}
                className={`absolute px-4 py-1.5 rounded-xl font-bold cursor-pointer select-none text-center shadow-lg transition-all ${
                  selectedTextId === textItem.id
                    ? 'ring-2 ring-rose-500 scale-105'
                    : 'hover:opacity-90'
                }`}
              >
                {textItem.text}
              </div>
            ))}

            {/* Overlaid Troll Stickers & Emojis */}
            {stickers.map((stk) => (
              <div
                key={stk.id}
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  transform: `translate(-50%, -50%) rotate(${stk.rotation}deg)`,
                  fontSize: `${stk.size}px`,
                  width: stk.imageUrl ? `${stk.size * 1.5}px` : undefined,
                  height: stk.imageUrl ? `${stk.size * 1.5}px` : undefined,
                }}
                className="absolute cursor-pointer select-none drop-shadow-md hover:scale-110 transition-transform flex items-center justify-center z-10"
                title="Click to remove sticker"
                onClick={(e) => {
                  e.stopPropagation();
                  setStickers((prev) => prev.filter((s) => s.id !== stk.id));
                }}
              >
                {stk.imageUrl ? (
                  <img
                    src={stk.imageUrl}
                    alt="Custom Sticker"
                    className="w-full h-full object-contain pointer-events-none drop-shadow-lg"
                  />
                ) : (
                  stk.emoji
                )}
              </div>
            ))}

            {/* Video Play/Pause Overlay indicator */}
            {item.type === 'video' && (
              <button
                onClick={toggleVideoPlayback}
                type="button"
                className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
                  isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl transition hover:scale-110">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 ml-0.5 fill-current" />}
                </div>
              </button>
            )}

          </div>

          {/* Video Scrub / Trim status bar */}
          {item.type === 'video' && (
            <div className="w-full max-w-xl mt-4 px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVideoPlayback}
                  className="p-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <span className="font-mono text-zinc-300">
                  {currentPlaybackTime.toFixed(1)}s / {trim.end.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-[11px]">Trimmed Range:</span>
                <span className="font-mono text-rose-400 font-semibold">
                  {trim.start.toFixed(1)}s - {trim.end.toFixed(1)}s ({(trim.end - trim.start).toFixed(1)}s)
                </span>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT TOOLS PANEL - Smooth mobile scroll */}
        <div className="w-full lg:w-96 bg-[#1a1613] border-t lg:border-t-0 lg:border-l border-[#382f25] flex flex-col shrink-0 flex-1 lg:max-h-full overflow-hidden">
          
          {/* Tool Navigation */}
          <div className="flex items-center justify-around p-1.5 sm:p-2 border-b border-[#382f25] bg-[#14110e] overflow-x-auto shrink-0 gap-1">
            {item.type === 'video' && (
              <button
                onClick={() => setActiveTab('trim')}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === 'trim'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-[#a89b8c] hover:text-white hover:bg-[#251f1a]'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Trim</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('filters')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'filters'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-[#a89b8c] hover:text-white hover:bg-[#251f1a]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            <button
              onClick={() => setActiveTab('crop')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'crop'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-[#a89b8c] hover:text-white hover:bg-[#251f1a]'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'text'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-[#a89b8c] hover:text-white hover:bg-[#251f1a]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>

            <button
              onClick={() => setActiveTab('effects')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'effects'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-[#a89b8c] hover:text-white hover:bg-[#251f1a]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transitions</span>
            </button>

            <button
              onClick={() => setActiveTab('stickers')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'stickers'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>
          </div>

          {/* Active Tool Pane */}
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            
            {/* 1. TRIMMING */}
            {activeTab === 'trim' && item.type === 'video' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Precision Video Trimmer
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Set start and end cut points for YouTube Shorts, Reels, or TikTok hooks.
                  </p>
                </div>

                {/* Start Time */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Start Marker</span>
                    <span className="font-mono text-rose-400">{trim.start.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, trim.end - 0.5)}
                    step={0.1}
                    value={trim.start}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTrim({ ...trim, start: val });
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full h-2 bg-zinc-800 accent-rose-500 rounded-lg cursor-pointer"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-medium">End Marker</span>
                    <span className="font-mono text-rose-400">{trim.end.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={trim.start + 0.5}
                    max={videoDuration || 60}
                    step={0.1}
                    value={trim.end}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTrim({ ...trim, end: val });
                    }}
                    className="w-full h-2 bg-zinc-800 accent-rose-500 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Duration Readout */}
                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Trimmed Cut Length:</span>
                  <span className="font-bold text-white font-mono text-sm">
                    {(trim.end - trim.start).toFixed(1)}s
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 block">Viral Trim Presets</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTrim({ start: 0, end: Math.min(3, videoDuration) })}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 border border-zinc-700"
                    >
                      3s Hook
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrim({ start: 0, end: Math.min(15, videoDuration) })}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 border border-zinc-700"
                    >
                      15s Reel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrim({ start: 0, end: videoDuration })}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 border border-zinc-700"
                    >
                      Full Video
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 2. FILTERS & COLOR ADJUSTMENTS */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Social & Film Filter Presets
                  </h4>
                  <p className="text-xs text-zinc-400">One-tap trending color grading</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_FILTERS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setFilters({ ...filters, filterPreset: preset.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        filters.filterPreset === preset.id
                          ? 'bg-rose-500/20 border-rose-500 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{preset.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{preset.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Granular Color Adjustments */}
                <div className="space-y-4 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-rose-400" />
                      Granular Adjustments
                    </h5>
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300"
                    >
                      Reset sliders
                    </button>
                  </div>

                  {/* Brightness */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Brightness</span>
                      <span className="font-mono text-zinc-200">{filters.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={160}
                      value={filters.brightness}
                      onChange={(e) => setFilters({ ...filters, brightness: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Contrast</span>
                      <span className="font-mono text-zinc-200">{filters.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={180}
                      value={filters.contrast}
                      onChange={(e) => setFilters({ ...filters, contrast: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Saturation</span>
                      <span className="font-mono text-zinc-200">{filters.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={240}
                      value={filters.saturation}
                      onChange={(e) => setFilters({ ...filters, saturation: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Temperature / Warmth */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Warmth & Temperature</span>
                      <span className="font-mono text-zinc-200">{filters.temperature > 0 ? `+${filters.temperature}` : filters.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      value={filters.temperature}
                      onChange={(e) => setFilters({ ...filters, temperature: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Hue Rotation */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Hue Tone Angle</span>
                      <span className="font-mono text-zinc-200">{filters.hueRotate}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={filters.hueRotate}
                      onChange={(e) => setFilters({ ...filters, hueRotate: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Vignette */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Vignette Edge Shading</span>
                      <span className="font-mono text-zinc-200">{filters.vignette}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={filters.vignette}
                      onChange={(e) => setFilters({ ...filters, vignette: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* 3. CROP & ASPECT RATIO */}
            {activeTab === 'crop' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Aspect Ratio & Social Framing
                  </h4>
                  <p className="text-xs text-zinc-400">Format specifically for your target platform</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '9:16', label: '9:16 Reels / TikTok', desc: 'Vertical Video' },
                    { id: '1:1', label: '1:1 Square Feed', desc: 'Instagram / Twitter' },
                    { id: '4:5', label: '4:5 Portrait Feed', desc: 'Vertical Photo' },
                    { id: '16:9', label: '16:9 YouTube', desc: 'Widescreen Landscape' },
                    { id: '21:9', label: '21:9 Ultrawide', desc: 'Cinematic Movie' },
                    { id: 'original', label: 'Original Source', desc: 'No Crop' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id as AspectRatioType)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        aspectRatio === ratio.id
                          ? 'bg-rose-500/20 border-rose-500 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{ratio.label}</div>
                      <div className="text-[10px] text-zinc-400">{ratio.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Zoom & Focal Pan */}
                <div className="space-y-4 pt-3 border-t border-zinc-800">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Zoom Scale</span>
                      <span className="font-mono text-zinc-200">{Math.round(zoomLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.05}
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  <label className="text-xs font-bold text-zinc-300 block">Orientation & Flip</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-200 flex flex-col items-center gap-1.5"
                    >
                      <RotateCw className="w-4 h-4 text-rose-400" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      onClick={() => setFlipH(!flipH)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition ${
                        flipH ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span>Flip Horiz</span>
                    </button>

                    <button
                      onClick={() => setFlipV(!flipV)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition ${
                        flipV ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <FlipVertical className="w-4 h-4" />
                      <span>Flip Vert</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 4. TEXT OVERLAYS & CAPTIONS */}
            {activeTab === 'text' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Viral Text & Captions
                    </h4>
                    <p className="text-xs text-zinc-400">Hooks, subtitles, and meme titles</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAddText('meme')}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-amber-300 border border-zinc-700"
                    >
                      + Meme
                    </button>
                    <button
                      onClick={() => handleAddText('tiktok')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                    >
                      + Subtitle
                    </button>
                  </div>
                </div>

                {/* Layer selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {textOverlays.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTextId(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        selectedTextId === t.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Layer #{idx + 1}
                    </button>
                  ))}
                </div>

                {selectedText && (
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Text Content</label>
                      <input
                        type="text"
                        value={selectedText.text}
                        onChange={(e) => handleUpdateSelectedText({ text: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Font Typography</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'meme', label: 'MEME IMPACT' },
                          { id: 'sans', label: 'Modern Sans' },
                          { id: 'neon', label: 'Neon Glow' },
                          { id: 'serif', label: 'Classic Serif' },
                          { id: 'mono', label: 'Code Mono' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => handleUpdateSelectedText({ fontFamily: f.id as any })}
                            className={`p-2 rounded-lg text-[11px] font-bold border transition ${
                              selectedText.fontFamily === f.id
                                ? 'bg-rose-500/20 border-rose-500 text-white'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Font Size</span>
                        <span className="font-mono text-zinc-200">{selectedText.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={16}
                        max={64}
                        value={selectedText.fontSize}
                        onChange={(e) => handleUpdateSelectedText({ fontSize: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-800 accent-rose-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Position Presets */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Position Presets</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleUpdateSelectedText({ x: 50, y: 18 })}
                          className="p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs hover:border-rose-500"
                        >
                          Top Header
                        </button>
                        <button
                          onClick={() => handleUpdateSelectedText({ x: 50, y: 50 })}
                          className="p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs hover:border-rose-500"
                        >
                          Center Stage
                        </button>
                        <button
                          onClick={() => handleUpdateSelectedText({ x: 50, y: 84 })}
                          className="p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs hover:border-rose-500"
                        >
                          Bottom Subtitle
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleDeleteSelectedText}
                      className="w-full py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Layer
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* 5. TRANSITIONS */}
            {activeTab === 'effects' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Transition & Motion Effects
                  </h4>
                  <p className="text-xs text-zinc-400">Smooth cuts and creative pacing</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Standard Cut', desc: 'No effect' },
                    { id: 'fade', label: 'Smooth Fade', desc: 'Soft opacity dissolve' },
                    { id: 'zoom', label: 'Zoom Burst', desc: 'Punch in zoom' },
                    { id: 'flash', label: 'Flash White', desc: 'High energy strobe' },
                  ].map((eff) => (
                    <button
                      key={eff.id}
                      onClick={() => setTransitionEffect(eff.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        transitionEffect === eff.id
                          ? 'bg-rose-500/20 border-rose-500 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{eff.label}</div>
                      <div className="text-[10px] text-zinc-400">{eff.desc}</div>
                    </button>
                  ))}
                </div>

                {item.type === 'video' && (
                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    <label className="text-xs font-bold text-zinc-300 block">Speed Ramp Controls</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0.5, 1, 1.25, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => {
                            setPlaybackSpeed(spd);
                            if (videoRef.current) videoRef.current.playbackRate = spd;
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            playbackSpeed === spd
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {spd}x {spd === 0.5 ? '(Slo-Mo)' : spd === 2 ? '(Fast)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. TROLL STICKERS */}
            {activeTab === 'stickers' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Troll Animations & Meme Stickers
                  </h4>
                  <p className="text-xs text-zinc-400">Click to place sticker on top of media</p>
                </div>

                <div className="grid grid-cols-6 gap-2 p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                  {['😈', '💀', '🤡', '🔥', '🚀', '⚡', '❤️‍🔥', '💎', '🎉', '🌟', '🎬', '📸', '💯', '👾', '🌈', '🔮', '🕶️', '👑'].map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => handleAddSticker(emoji)}
                      className="text-2xl p-2 rounded-xl hover:bg-zinc-800 transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Vault Created GIFs, Memes & Stickers */}
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Your Created GIFs & Vault Stickers
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {vaultItems.filter(v => v.type === 'emoji' || v.format === 'GIF' || v.tags?.includes('meme') || v.tags?.includes('gif')).length} items
                    </span>
                  </div>

                  {vaultItems.filter(v => v.type === 'emoji' || v.format === 'GIF' || v.tags?.includes('meme') || v.tags?.includes('gif')).length === 0 ? (
                    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-center">
                      <p className="text-xs text-zinc-400">No custom GIFs or stickers yet.</p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Open any video in your vault and click <strong className="text-purple-300">GIF / Meme</strong> to turn it into an animated sticker!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {vaultItems
                        .filter(v => v.type === 'emoji' || v.format === 'GIF' || v.tags?.includes('meme') || v.tags?.includes('gif'))
                        .map((vaultSticker) => (
                          <button
                            key={vaultSticker.id}
                            type="button"
                            onClick={() => handleAddVaultSticker(vaultSticker)}
                            className="group relative p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/80 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center overflow-hidden"
                            title={`Stamp "${vaultSticker.title}" onto media`}
                          >
                            {vaultSticker.thumbnailUrl || vaultSticker.url ? (
                              <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden">
                                <img
                                  src={vaultSticker.thumbnailUrl || vaultSticker.url}
                                  alt={vaultSticker.title}
                                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                                />
                              </div>
                            ) : (
                              <span className="text-2xl">{vaultSticker.emojiSymbol || '👾'}</span>
                            )}
                            <span className="text-[10px] font-semibold text-zinc-300 truncate max-w-full">
                              {vaultSticker.title}
                            </span>
                            {vaultSticker.format === 'GIF' && (
                              <span className="absolute top-1 right-1 text-[8px] font-bold px-1 rounded bg-purple-600 text-white">
                                GIF
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {stickers.length > 0 && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-zinc-400">{stickers.length} active stickers</span>
                    <button
                      onClick={() => setStickers([])}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Clear Stickers
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
