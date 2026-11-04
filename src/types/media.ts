export type MediaType = 'photo' | 'video' | 'emoji';

export type AspectRatioType = 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | 'free';

export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: 'sans' | 'display' | 'serif' | 'mono' | 'meme' | 'neon';
  fontSize: number; // in px
  color: string;
  backgroundColor: string; // e.g. 'rgba(0,0,0,0.85)', '#facc15', 'transparent'
  outlineColor?: string;
  outlineWidth?: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  animation?: 'none' | 'pop' | 'pulse' | 'glow' | 'bounce';
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  imageUrl?: string; // support animated GIF and meme image URLs
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // in px
  rotation: number; // degrees
}

export interface VideoTrim {
  start: number; // in seconds
  end: number; // in seconds
}

export interface MediaFilterSettings {
  filterPreset: string;
  brightness: number; // 50 to 150 (100 = default)
  contrast: number; // 50 to 200 (100 = default)
  saturation: number; // 0 to 250 (100 = default)
  vibrance?: number; // 0 to 100
  temperature: number; // -50 to 50 (0 = default)
  exposure?: number; // -50 to 50
  hueRotate: number; // 0 to 360 (0 = default)
  blur: number; // 0 to 10 (0 = default)
  sepia: number; // 0 to 100 (0 = default)
  vignette: number; // 0 to 100 (0 = default)
  invert?: number; // 0 to 100
}

export interface MediaComment {
  id: string;
  author: string;
  avatarUrl?: string;
  text: string;
  createdAt: number;
  timestamp?: number; // optional video timestamp in seconds (e.g. at 00:04)
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  emojiSymbol?: string;
  createdAt: number;
  duration?: number; // in seconds (for video)
  resolution?: string; // e.g. "1920x1080", "1024x1024"
  fileSize?: string;
  tags: string[];
  author: string;
  format?: string; // e.g. 'MP4', 'WEBM', 'PNG', 'JPG', 'UNICODE'
  blobData?: Blob; // Persistent binary media blob stored in IndexedDB so videos are never lost on reload
  thumbnailBlob?: Blob;
  comments?: MediaComment[];
  isEdited?: boolean;
  description?: string;
  uploaderName?: string;
  uploaderId?: string;
  storageUrl?: string;
  storagePath?: string;
  videoParts?: { url: string; storagePath: string; duration: number; size: number }[];
  savedEdits?: {
    filterSettings?: MediaFilterSettings;
    trim?: VideoTrim;
    aspectRatio?: AspectRatioType;
    zoom?: number;
    panX?: number;
    panY?: number;
    rotation?: number;
    flipH?: boolean;
    flipV?: boolean;
    textOverlays?: TextOverlay[];
    stickers?: StickerOverlay[];
    transition?: string;
    transitionDuration?: number;
    playbackSpeed?: number;
  };
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  handle: string;
  bio: string;
}

export type DownloadFormat = 'MP4' | 'WEBM' | 'GIF' | 'PNG' | 'JPG' | 'WEBP' | 'SVG' | 'UNICODE';

export type DownloadQuality = 'original' | '1080p' | '720p' | 'thumbnail';

export interface DownloadTask {
  id: string;
  mediaId: string;
  title: string;
  type: MediaType;
  format: DownloadFormat;
  quality: DownloadQuality;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0 to 100
  speed?: string; // e.g. "4.2 MB/s"
  fileSize?: string;
  createdAt: number;
  completedAt?: number;
  error?: string;
  downloadUrl?: string;
}
