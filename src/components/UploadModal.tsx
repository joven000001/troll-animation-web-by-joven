import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Video, 
  Image as ImageIcon, 
  Smile, 
  Check, 
  AlertCircle,
  FileText,
  Tag,
  Sparkles,
  WifiOff,
  User,
  AlignLeft
} from 'lucide-react';
import { MediaItem, MediaType, UserProfile } from '../types/media';
import { uploadVideoToGallery } from '../services/videoGallery';
import { getVisitorId } from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (item: MediaItem) => Promise<void> | void;
  profile: UserProfile;
  isOnline: boolean;
  currentUser?: FirebaseUser | null;
  visitorId?: string;
  onSignInGoogle?: () => void;
}

const COMMON_EMOJIS = [
  '🔥', '✨', '🚀', '⚡', '❤️‍🔥', '💎', '🎉', '💡',
  '🎨', '🎬', '📸', '🎧', '🌟', '🌊', '🌈', '🔮',
  '👾', '🏆', '🎯', '🪐', '☕', '🕶️', '🌸', '🪄',
  '👑', '🍕', '🦊', '⚡', '🌙', '💫', '💥', '🥇'
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  profile,
  isOnline,
  currentUser,
  visitorId,
  onSignInGoogle,
}) => {
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState('🔥');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [videoResolution, setVideoResolution] = useState<string | undefined>(undefined);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedType(null);
    setTitle('');
    setDescription('');
    setTagsInput('');
    setFile(null);
    setFilePreviewUrl('');
    setSelectedEmoji('🔥');
    setCustomEmojiInput('');
    setIsProcessing(false);
    setProgress(0);
    setStatusText('');
    setVideoDuration(undefined);
    setVideoResolution(undefined);
    setThumbnailDataUrl(undefined);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage('');
    
    // Auto-fill title if empty
    if (!title) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(objectUrl);

    if (selectedType === 'video') {
      // Extract video duration and generate thumbnail via HTML5 video element
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = objectUrl;
      tempVideo.muted = true;
      tempVideo.playsInline = true;

      tempVideo.onloadedmetadata = () => {
        const dur = Math.round(tempVideo.duration);
        const res = `${tempVideo.videoWidth}x${tempVideo.videoHeight}`;
        setVideoDuration(dur);
        setVideoResolution(res);

        // Seek slightly to capture a representative thumbnail
        tempVideo.currentTime = Math.min(1.0, dur > 1 ? 1.0 : dur / 2);
      };

      tempVideo.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(tempVideo.videoWidth || 640, 640);
          canvas.height = Math.min(tempVideo.videoHeight || 360, 360);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            setThumbnailDataUrl(canvas.toDataURL('image/jpeg', 0.8));
          }
        } catch {
          // fallback
        }
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    if (!title.trim()) {
      setErrorMessage('Please provide a name/title for this media item.');
      return;
    }
    if (!isOnline) {
      setErrorMessage('You need to be online to upload media to the vault. Please check your internet connection.');
      return;
    }
    if (selectedType !== 'emoji' && !file) {
      setErrorMessage(`Please select a ${selectedType} file to upload.`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setProgress(5);
    setStatusText('Preparing media...');

    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length === 0) tags.push(selectedType.charAt(0).toUpperCase() + selectedType.slice(1));

      if (selectedType === 'video') {
        if (!file) throw new Error('Video file is required.');
        if (file.size > 50 * 1024 * 1024) throw new Error('This video is larger than the 50 MB limit on the Supabase Free plan.');
        const uploaderName = currentUser?.displayName || profile.name || 'Troll Animator';
        const uploaderId = currentUser?.uid || visitorId || getVisitorId();

        const newVideoItem = await uploadVideoToGallery(
          file,
          {
            title: title.trim(),
            description: description.trim(),
            uploaderName,
            uploaderId,
            tags,
            thumbnailDataUrl,
            duration: videoDuration,
            resolution: videoResolution,
          },
          (pct, txt) => {
            setProgress(pct);
            setStatusText(txt);
          }
        );

        setProgress(100);
        await onUploadSuccess(newVideoItem);
        setIsProcessing(false);
        handleClose();
        return;
      }

      // Photos & Emojis continue using existing local vault handling (Requirement 9)
      let mediaUrl = filePreviewUrl;
      let format = selectedType.toUpperCase();
      let fileSizeStr = '1.0 MB';

      if (file) {
        format = file.name.split('.').pop()?.toUpperCase() || selectedType.toUpperCase();
        fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        if (selectedType === 'photo' && file.size < 8 * 1024 * 1024) {
          mediaUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Could not read the selected photo.'));
            reader.readAsDataURL(file);
          });
        }
      }

      setProgress(60);
      setStatusText('Indexing into media vault...');

      const newItem: MediaItem = {
        id: `${selectedType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        type: selectedType,
        url: selectedType === 'emoji' ? '' : mediaUrl,
        thumbnailUrl: thumbnailDataUrl || (selectedType === 'photo' ? mediaUrl : undefined),
        emojiSymbol: selectedType === 'emoji' ? (customEmojiInput.trim() || selectedEmoji) : undefined,
        createdAt: Date.now(),
        duration: videoDuration,
        resolution: videoResolution || (selectedType === 'photo' ? 'High-Res Photo' : 'Scalable Vector'),
        fileSize: selectedType === 'emoji' ? '1.2 KB' : fileSizeStr,
        tags,
        author: profile.name,
        format: selectedType === 'emoji' ? 'UNICODE' : format,
        blobData: file || undefined,
      };

      setProgress(85);
      await onUploadSuccess(newItem);
      setProgress(100);
      setIsProcessing(false);
      handleClose();
    } catch (error) {
      console.error('Media upload failed:', error);
      setIsProcessing(false);
      setProgress(0);
      setStatusText('');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please check your video file and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#1c1814] border border-[#44382c] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col celluloid-border">
        
        {/* Traditional Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#382f25] bg-[#15120f] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#fbf7ee] font-serif">Upload to Studio Vault</h3>
              <p className="text-[11px] sm:text-xs text-[#a89b8c]">
                {selectedType ? `Step 2: Add details for your ${selectedType}` : 'Step 1: Choose category to upload'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg sm:rounded-xl text-[#a89b8c] hover:text-[#fbf7ee] hover:bg-[#251f1a] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="px-4 sm:px-6 py-2.5 bg-amber-950/80 border-b border-amber-800/80 flex items-center gap-2.5 text-amber-300 text-xs shrink-0">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You are offline. Connect to the internet to upload new media.</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Step 1: Media Type Selection (Photo, Video, or Emoji) - Compact on Mobile */}
          <div>
            <label className="block text-xs font-semibold text-[#ede8df] mb-2 font-serif">
              Select Media Category <span className="text-amber-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              
              {/* Photo Choice */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('photo');
                  setFile(null);
                  setFilePreviewUrl('');
                  setErrorMessage('');
                }}
                className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 sm:gap-2 group ${
                  selectedType === 'photo'
                    ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-black/40'
                    : 'bg-[#15120f] border-[#382f25] hover:border-[#4a3e31] hover:bg-[#1f1a16]'
                }`}
              >
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                  selectedType === 'photo' ? 'bg-amber-600 text-white' : 'bg-[#251f1a] text-amber-300 group-hover:bg-[#2f2721]'
                }`}>
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-[#fbf7ee] block font-serif">Photo</span>
                  <span className="text-[10px] text-[#9c8e7e] hidden sm:block">PNG, JPG, WebP</span>
                </div>
              </button>

              {/* Video Choice */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('video');
                  setFile(null);
                  setFilePreviewUrl('');
                  setErrorMessage('');
                }}
                className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 sm:gap-2 group ${
                  selectedType === 'video'
                    ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-black/40'
                    : 'bg-[#15120f] border-[#382f25] hover:border-[#4a3e31] hover:bg-[#1f1a16]'
                }`}
              >
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                  selectedType === 'video' ? 'bg-amber-600 text-white' : 'bg-[#251f1a] text-amber-400 group-hover:bg-[#2f2721]'
                }`}>
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-[#fbf7ee] block font-serif">Video</span>
                  <span className="text-[10px] text-[#9c8e7e] hidden sm:block">MP4, WebM, MOV</span>
                </div>
              </button>

              {/* Emoji Choice */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('emoji');
                  setFile(null);
                  setFilePreviewUrl('');
                  setErrorMessage('');
                  if (!title) setTitle('Expressive Emoji Sticker');
                }}
                className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 sm:gap-2 group ${
                  selectedType === 'emoji'
                    ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-black/40'
                    : 'bg-[#15120f] border-[#382f25] hover:border-[#4a3e31] hover:bg-[#1f1a16]'
                }`}
              >
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                  selectedType === 'emoji' ? 'bg-amber-600 text-white' : 'bg-[#251f1a] text-[#d4af37] group-hover:bg-[#2f2721]'
                }`}>
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-[#fbf7ee] block font-serif">Emoji</span>
                  <span className="text-[10px] text-[#9c8e7e] hidden sm:block">Stickers & Combos</span>
                </div>
              </button>

            </div>
          </div>

          {/* Step 2 Details Form (Once Type is chosen) */}
          {selectedType && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              
              {/* Media Title / Name (MANDATORY REQUIREMENT) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-200 mb-1.5 flex items-center justify-between">
                  <span>Name / Title of {selectedType} <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-zinc-400">Searchable by this title</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-zinc-500 pointer-events-none">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`e.g. ${
                      selectedType === 'video'
                        ? 'Sunset Beach Cinematic Reel'
                        : selectedType === 'photo'
                        ? 'Mountain Lake Landscape'
                        : 'Cosmic Supernova Flame'
                    }`}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                  />
                </div>
              </div>

              {/* Video Description (Requirement 2: Title, Description, Uploader Name, Upload Date, Storage URL) */}
              {selectedType === 'video' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Video Description</span>
                    </span>
                    <span className="text-[11px] text-zinc-400">Stored in Supabase</span>
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your troll animation or funny joke..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
                  />
                </div>
              )}

              {/* Publisher & Ownership Banner (Requirement 4 & 10) */}
              {selectedType === 'video' && (
                <div className="p-3 rounded-xl bg-[#17130f] border border-[#3e3226] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-900 border border-amber-500/40 flex items-center justify-center shrink-0">
                      {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#fbf7ee] truncate">
                        Publishing as: <span className="text-amber-400 font-bold">{currentUser?.displayName || profile.name}</span>
                      </p>
                      <p className="text-[10px] text-[#9c8e7e]">
                        Anyone can upload without signing in · Public gallery
                      </p>
                    </div>
                  </div>
                  {!currentUser && onSignInGoogle && (
                    <button
                      type="button"
                      onClick={onSignInGoogle}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#27201a] hover:bg-[#322921] text-amber-300 border border-amber-800/60 transition flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Sign in with Google</span>
                    </button>
                  )}
                </div>
              )}

              {/* File Picker / Drag Zone for Photo or Video */}
              {selectedType !== 'emoji' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                    Select {selectedType === 'video' ? 'Video File' : 'Photo File'} <span className="text-rose-500">*</span>
                  </label>
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      file
                        ? 'border-emerald-500/60 bg-emerald-950/10'
                        : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/80'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={selectedType === 'video' ? 'video/*' : 'image/*'}
                      onChange={(e) => {
                        const sel = e.target.files?.[0];
                        if (sel) handleFileSelect(sel);
                      }}
                      className="hidden"
                    />

                    {filePreviewUrl ? (
                      <div className="space-y-3">
                        <div className="max-h-48 rounded-xl overflow-hidden inline-block bg-black border border-zinc-800 shadow-md">
                          {selectedType === 'video' ? (
                            <video
                              src={filePreviewUrl}
                              className="max-h-44 object-contain mx-auto"
                              controls
                            />
                          ) : (
                            <img
                              src={filePreviewUrl}
                              alt="Preview"
                              className="max-h-44 object-contain mx-auto"
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
                          <Check className="w-4 h-4" />
                          <span>{file?.name} ({(file?.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">Click to replace file</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-200">
                          Click to select or drag and drop your {selectedType}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {selectedType === 'video'
                            ? 'Choose a video file · Maximum 50 MB on the free plan'
                            : 'Supports PNG, JPG, WebP, GIF, SVG, BMP up to high-res 4K'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emoji Picker / Mixer for Emoji Type */}
              {selectedType === 'emoji' && (
                <div className="space-y-4 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                      Choose from Curated Emoji Library
                    </label>
                    <div className="grid grid-cols-8 gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 max-h-44 overflow-y-auto">
                      {COMMON_EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            setCustomEmojiInput('');
                          }}
                          className={`text-2xl p-2 rounded-xl transition-transform hover:scale-125 ${
                            selectedEmoji === emoji && !customEmojiInput
                              ? 'bg-amber-500/20 border border-amber-500/50 scale-110'
                              : 'hover:bg-zinc-800'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Or Type / Paste Any Emoji or Combo (e.g. 🔥💧, 🚀✨, 🎭)
                    </label>
                    <input
                      type="text"
                      value={customEmojiInput}
                      onChange={(e) => setCustomEmojiInput(e.target.value)}
                      placeholder="Type custom emoji here..."
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-base focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-zinc-400">Selected Emoji Preview:</span>
                    <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
                      {customEmojiInput || selectedEmoji}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags / Categories */}
              <div>
                <label className="block text-xs font-semibold text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Tags & Keywords (comma separated)</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. Cinematic, Sunset, Nature, Social Media, Reel"
                  className="w-full px-3.5 py-2.5 bg-[#15120f] border border-[#382f25] rounded-xl text-[#fbf7ee] text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Upload Progress Indicator */}
              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-[#a89b8c]">
                    <span className="truncate max-w-[80%]">{statusText || 'Uploading and indexing media into vault...'}</span>
                    <span className="font-mono text-amber-400 font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#27211b] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-rose-600 transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#382f25]">
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="text-xs text-[#a89b8c] hover:text-[#fbf7ee] transition"
                >
                  ← Categories
                </button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3 sm:px-4 py-2 text-xs font-medium text-[#a89b8c] hover:text-[#fbf7ee] transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing || !isOnline}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition active:scale-95 flex items-center gap-1.5 sm:gap-2 ${
                      isProcessing || !isOnline
                        ? 'bg-[#27211b] text-[#7c6f60] cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-black/40 border border-amber-500/40'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isProcessing ? 'Uploading...' : 'Add to Vault'}</span>
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
