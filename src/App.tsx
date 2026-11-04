import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smile, 
  Video, 
  Image as ImageIcon, 
  Sparkles,
  Inbox,
  RefreshCw,
  Plus,
  UploadCloud,
  ArrowDownToLine,
  Search,
  CheckCircle2,
  User,
  Edit3,
  Globe
} from 'lucide-react';
import { MediaItem, MediaType, UserProfile } from './types/media';
import { 
  getStoredMedia, 
  saveMediaItem, 
  deleteMediaItem, 
  getStoredProfile, 
  saveStoredProfile, 
  DEFAULT_PROFILE 
} from './services/storage';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { HorizontalMediaRow } from './components/HorizontalMediaRow';
import { UploadModal } from './components/UploadModal';
import { MediaViewModal } from './components/MediaViewModal';
import { ProfileModal } from './components/ProfileModal';
import { InstallModal } from './components/InstallModal';
import { DownloadManagerModal } from './components/DownloadManagerModal';
import { EditorStudio } from './components/editor/EditorStudio';
import { MemeGifModal } from './components/MemeGifModal';
import { 
  auth, 
  testConnection, 
  signInWithGoogle, 
  logOut, 
  getVisitorId 
} from './services/firebase';
import { 
  subscribeToVideoGallery, 
  deleteVideoFromGallery 
} from './services/videoGallery';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const isOnline = useOnlineStatus();

  // Authentication & Visitor Identity state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [visitorId, setVisitorId] = useState<string>('');

  // Media state: online shared videos + local photos/emojis
  const [onlineVideos, setOnlineVideos] = useState<MediaItem[]>([]);
  const [localMedia, setLocalMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadDefaultType, setUploadDefaultType] = useState<MediaType | undefined>(undefined);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<MediaItem | null>(null);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [memeGifItem, setMemeGifItem] = useState<MediaItem | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setNotificationToast(message);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Google Sign-In & Sign-Out handlers
  const handleSignInGoogle = async () => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      showToast(`Signed in as ${user.displayName || user.email}!`);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Google Sign-in failed. Please try again.');
      }
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await logOut();
      setCurrentUser(null);
      showToast('Signed out from Google.');
    } catch (err) {
      showToast('Sign out failed.');
    }
  };

  // 1. Initial Connection Validation and Auth Listener
  useEffect(() => {
    testConnection();
    setVisitorId(getVisitorId());

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubAuth();
  }, []);

  // 2. Real-time subscription to shared online video gallery in Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeToVideoGallery(
      (videos) => {
        setOnlineVideos(videos);
        setIsLoading(false);
      },
      (error) => {
        console.warn('Real-time video gallery note:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Load local photos, emojis, and artist profile from storage
  useEffect(() => {
    async function loadLocalData() {
      try {
        const stored = await getStoredMedia();
        // Requirement 11: Do not use IndexedDB as main video storage
        // Only load photos and emojis into local vault
        const nonVideos = stored.filter((i) => i.type !== 'video');
        setLocalMedia(nonVideos);
        setProfile(getStoredProfile());
      } catch (err) {
        console.error('Failed to load local media vault', err);
      }
    }
    loadLocalData();
  }, []);

  const handleSaveProfile = (updated: UserProfile) => {
    setProfile(updated);
    saveStoredProfile(updated);
    showToast('Profile updated successfully!');
  };

  // Upload handler (videos go to Firebase online gallery; photos/emojis to local vault)
  const handleUploadSuccess = async (newItem: MediaItem) => {
    if (newItem.type === 'video') {
      showToast(`Uploaded "${newItem.title}" to shared online gallery!`);
    } else {
      await saveMediaItem(newItem);
      setLocalMedia((prev) => [newItem, ...prev]);
      showToast(`Added "${newItem.title}" to your vault!`);
    }
  };

  // Delete handler with ownership enforcement (Requirement 10)
  const handleDeleteMedia = async (id: string) => {
    const target = mediaItems.find((item) => item.id === id);
    if (!target) return;

    if (target.type === 'video') {
      const canDelete =
        (currentUser && target.uploaderId === currentUser.uid) ||
        (visitorId && target.uploaderId === visitorId);

      if (!canDelete) {
        showToast('Protected: Only the original creator who uploaded this video can delete it.');
        return;
      }

      if (window.confirm(`Delete "${target.title}" from the shared online gallery?`)) {
        try {
          await deleteVideoFromGallery(target, currentUser?.uid);
          showToast(`Deleted "${target.title}" from online gallery.`);
          if (viewingItem?.id === id) setViewingItem(null);
          if (editingItem?.id === id) setEditingItem(null);
        } catch (err: any) {
          console.error('Failed to delete video:', err);
          showToast(err.message || 'Permission denied: Could not delete video.');
        }
      }
    } else {
      if (window.confirm('Delete this item from your Troll Animation vault?')) {
        await deleteMediaItem(id);
        setLocalMedia((prev) => prev.filter((item) => item.id !== id));
        if (viewingItem?.id === id) setViewingItem(null);
        if (editingItem?.id === id) setEditingItem(null);
        showToast('Item deleted.');
      }
    }
  };

  // When someone edits a video/photo/emoji, save as a new copy while keeping original untouched
  const handleSaveEditedItem = async (newEditedCopy: MediaItem) => {
    await saveMediaItem(newEditedCopy);
    setLocalMedia((prev) => [newEditedCopy, ...prev]);
    setEditingItem(null);
    showToast(`Saved as a new copy: "${newEditedCopy.title}" (Original remains untouched!)`);
  };

  // Update media item (e.g. comments)
  const handleUpdateMediaItem = async (updatedItem: MediaItem) => {
    if (updatedItem.type !== 'video') {
      await saveMediaItem(updatedItem);
      setLocalMedia((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    }
    if (viewingItem?.id === updatedItem.id) {
      setViewingItem(updatedItem);
    }
  };

  // Combined media items: online shared videos + local photos and emojis
  const mediaItems = useMemo(() => {
    return [...onlineVideos, ...localMedia];
  }, [onlineVideos, localMedia]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return mediaItems;
    const q = searchQuery.toLowerCase().trim();
    return mediaItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      const tagMatch = item.tags.some((t) => t.toLowerCase().includes(q));
      const authorMatch = (item.uploaderName || item.author).toLowerCase().includes(q);
      const typeMatch = item.type.toLowerCase().includes(q);
      const emojiMatch = item.emojiSymbol ? item.emojiSymbol.includes(q) : false;
      return titleMatch || descMatch || tagMatch || authorMatch || typeMatch || emojiMatch;
    });
  }, [mediaItems, searchQuery]);

  // Group items by category for horizontal shelves
  const videoItems = useMemo(
    () => filteredItems.filter((i) => i.type === 'video'),
    [filteredItems]
  );
  const photoItems = useMemo(
    () => filteredItems.filter((i) => i.type === 'photo'),
    [filteredItems]
  );
  const emojiItems = useMemo(
    () => filteredItems.filter((i) => i.type === 'emoji'),
    [filteredItems]
  );

  const handleOpenUploadWithType = (t?: MediaType) => {
    setUploadDefaultType(t);
    setIsUploadOpen(true);
  };

  return (
    <div className="min-h-screen troll-studio-bg text-[#ede8df] flex flex-col font-sans selection:bg-purple-600/35 selection:text-purple-200 overflow-x-hidden w-full max-w-full">
      
      {/* Top Header */}
      <Header
        profile={profile}
        isOnline={isOnline}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenInstall={() => setIsInstallOpen(true)}
        onOpenDownloadManager={() => setIsDownloadManagerOpen(true)}
        currentUser={currentUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOutGoogle}
      />

      {/* Main Container - strictly bound to viewport width */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-7 sm:space-y-9 overflow-hidden">
        
        {/* Title & Quick Controls - Traditional Marquee with High-Visibility Creator Profile */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#322920] pb-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#27201a] border border-[#3e3428] text-[10px] sm:text-xs text-amber-400 font-serif mb-0.5">
              <span>★</span>
              <span>Traditional Motion & Celluloid Workshop</span>
              <span className="text-[#6d5e4f]">·</span>
              <span className="text-emerald-400 flex items-center gap-1 font-sans">
                <Globe className="w-3 h-3" />
                Live Shared Online Gallery
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#fbf7ee] font-serif tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <span>Troll Animation Studio</span>
              <span className="text-xl sm:text-2xl filter drop-shadow">😈</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#a89b8c] max-w-xl">
              Browse sideways shelves of shared online videos, artwork, and custom stickers. Upload your troll animation to share with all visitors across devices.
            </p>
          </div>

          {/* Top Profile & Action Hub: Always clearly visible */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start lg:justify-end gap-3 shrink-0">
            {/* Prominent Animator Profile Card */}
            <div 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 p-2 sm:px-3 sm:py-2 rounded-2xl bg-[#1c1713] hover:bg-[#251e18] border border-amber-600/40 hover:border-amber-400 transition-all cursor-pointer shadow-lg shadow-black/40 group shrink-0"
              title="Click to view & edit your Animator Profile"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-[#120f0d] relative shrink-0 ring-2 ring-amber-500/80 shadow flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <User className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex flex-col text-left pr-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#fbf7ee] group-hover:text-amber-300 transition-colors truncate max-w-[120px] sm:max-w-[150px]">
                    {profile.name}
                  </span>
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 uppercase">
                    Artist
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-amber-400/90 font-mono leading-tight truncate max-w-[120px] sm:max-w-[150px]">
                  {profile.handle}
                </span>
                <span className="text-[10px] text-[#a89b8c] truncate max-w-[120px] sm:max-w-[160px] hidden sm:block">
                  {profile.bio || 'Troll Animator'}
                </span>
              </div>
              <div className="p-1 rounded-lg bg-[#27201a] text-amber-400/70 group-hover:text-amber-300 group-hover:bg-[#342a22] transition">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Download Vault Button */}
            <button
              onClick={() => setIsDownloadManagerOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#241e19] hover:bg-[#2d251f] text-[#fbf7ee] border border-[#44382c] text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow-md shadow-black/40 shrink-0"
            >
              <ArrowDownToLine className="w-4 h-4 text-amber-400" />
              <span className="font-serif">Download Vault</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Top discovery) */}
        <div className="w-full">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={filteredItems.length}
            totalCount={mediaItems.length}
          />
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-[#a89b8c] font-serif">Connecting to shared video vault in Supabase...</p>
          </div>
        ) : (
          /* THE THREE SIDEWAYS SCROLLING ROWS: VIDEOS, PHOTOS, EMOJIS */
          <div className="space-y-8 sm:space-y-10 w-full max-w-full overflow-hidden">
            
            {/* ROW 1: VIDEOS (Real-time Cloud Firestore Shared Public Gallery) */}
            <HorizontalMediaRow
              title="Shared Troll Videos & Animations"
              type="video"
              items={videoItems}
              onView={(item) => setViewingItem(item)}
              onEdit={(item) => setEditingItem(item)}
              onDelete={handleDeleteMedia}
              onOpenUpload={handleOpenUploadWithType}
              onOpenMemeGif={(item) => setMemeGifItem(item)}
              currentUserId={currentUser?.uid}
              visitorId={visitorId}
            />

            {/* ROW 2: PHOTOS (Scrolled Sideways) */}
            <HorizontalMediaRow
              title="Photos & Creative Artwork"
              type="photo"
              items={photoItems}
              onView={(item) => setViewingItem(item)}
              onEdit={(item) => setEditingItem(item)}
              onDelete={handleDeleteMedia}
              onOpenUpload={handleOpenUploadWithType}
              currentUserId={currentUser?.uid}
              visitorId={visitorId}
            />

            {/* ROW 3: EMOJIS (Scrolled Sideways) */}
            <HorizontalMediaRow
              title="Troll Emojis & Custom Stickers"
              type="emoji"
              items={emojiItems}
              onView={(item) => setViewingItem(item)}
              onEdit={(item) => setEditingItem(item)}
              onDelete={handleDeleteMedia}
              onOpenUpload={handleOpenUploadWithType}
              currentUserId={currentUser?.uid}
              visitorId={visitorId}
            />

          </div>
        )}

        {/* UPLOAD BUTTON AT THE VERY BOTTOM - 2x2 on Mobile so everything fits */}
        <div className="pt-4 pb-2 w-full max-w-full">
          <div className="rounded-2xl sm:rounded-3xl border border-[#44382c] bg-[#1a1613] p-4 sm:p-6 md:p-8 shadow-2xl shadow-black/60 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
            
            <div className="flex items-center gap-3 sm:gap-4 max-w-xl">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-black/50 shrink-0 border border-amber-400/30">
                <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#fbf7ee] font-serif flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <span>Upload to Studio Vault</span>
                  <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                    Online Cloud Gallery Active
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-[#a89b8c] mt-0.5">
                  Import animation clips to the shared online gallery, or add high-res photos and emojis. Accessible across all browsers and devices.
                </p>
              </div>
            </div>

            {/* Responsive Buttons: 2x2 Grid on Mobile, Flex on Tablet/Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 sm:gap-2.5 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleOpenUploadWithType('video')}
                className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-[#251f1a] hover:bg-[#2e2620] text-[#ede8df] border border-[#3e3428] text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
              >
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>+ Video</span>
              </button>

              <button
                onClick={() => handleOpenUploadWithType('photo')}
                className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-[#251f1a] hover:bg-[#2e2620] text-[#ede8df] border border-[#3e3428] text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
                <span>+ Photo</span>
              </button>

              <button
                onClick={() => handleOpenUploadWithType('emoji')}
                className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-[#251f1a] hover:bg-[#2e2620] text-[#ede8df] border border-[#3e3428] text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
              >
                <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
                <span>+ Emoji</span>
              </button>

              <button
                onClick={() => handleOpenUploadWithType()}
                className="px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-black/50 border border-amber-500/40 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Upload Any</span>
              </button>
            </div>

          </div>
        </div>

        {/* Search-friendly introduction for visitors and search engines */}
        <section
          aria-labelledby="about-troll-animation"
          className="mx-auto max-w-4xl rounded-2xl border border-[#44382c] bg-[#1a1613]/90 px-5 py-6 sm:px-7 sm:py-8 text-center"
        >
          <h2 id="about-troll-animation" className="text-lg sm:text-xl font-bold font-serif text-[#fbf7ee]">
            Welcome to Troll Animation by Joven
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#b9aa99]">
            Troll Animation by Joven is a creative online studio for collecting and working with funny videos,
            troll animations, memes, photos and custom stickers. All visitors share the same online video gallery powered by Supabase,
            meaning any animation you upload is instantly visible across all devices.
          </p>
          <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-[#383028] bg-[#211b16] p-3">
              <h3 className="text-sm font-semibold text-amber-300">Shared Online Gallery</h3>
              <p className="mt-1 text-xs leading-5 text-[#a89b8c]">All visitors see the same shared video gallery with real-time updates.</p>
            </div>
            <div className="rounded-xl border border-[#383028] bg-[#211b16] p-3">
              <h3 className="text-sm font-semibold text-amber-300">Protected Video Deletion</h3>
              <p className="mt-1 text-xs leading-5 text-[#a89b8c]">Only the creator who uploaded a video can delete it. Visitors cannot delete other creators&apos; work.</p>
            </div>
            <div className="rounded-xl border border-[#383028] bg-[#211b16] p-3">
              <h3 className="text-sm font-semibold text-amber-300">Creative Editing Tools</h3>
              <p className="mt-1 text-xs leading-5 text-[#a89b8c]">Edit your media and save new versions without replacing your originals.</p>
            </div>
          </div>
        </section>

      </main>

      {/* Traditional Studio Footer */}
      <footer className="mt-auto border-t border-[#30261e] bg-[#16120f]/95 py-5 sm:py-6 text-center text-xs text-[#8e8071]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="font-serif">Troll Animation — Traditional Cell & Media Studio</p>
          <div className="flex items-center gap-3 text-[#796c5e] text-[11px]">
            <span>Supabase Shared Gallery</span>
            <span>·</span>
            <span>Original Media Preserved</span>
          </div>
        </div>
      </footer>

      {/* Interactive Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Upload Modal (opens when upload button is clicked) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        profile={profile}
        isOnline={isOnline}
        currentUser={currentUser}
        visitorId={visitorId}
        onSignInGoogle={handleSignInGoogle}
      />

      {/* Cinema Watcher / Lightbox */}
      {viewingItem && (
        <MediaViewModal
          item={viewingItem}
          profile={profile}
          onClose={() => setViewingItem(null)}
          onOpenEdit={(item) => setEditingItem(item)}
          onOpenDownloadManager={() => setIsDownloadManagerOpen(true)}
          onUpdateItem={handleUpdateMediaItem}
          onOpenMemeGif={(item) => setMemeGifItem(item)}
        />
      )}

      {/* Character Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentProfile={profile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Install PWA Modal */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      {/* Web App Download Manager Modal */}
      <DownloadManagerModal
        isOpen={isDownloadManagerOpen}
        onClose={() => setIsDownloadManagerOpen(false)}
        vaultItems={mediaItems}
      />

      {/* Advanced Creative Suite */}
      {editingItem && (
        <EditorStudio
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedItem}
          onOpenDownloadManager={() => setIsDownloadManagerOpen(true)}
          vaultItems={mediaItems}
        />
      )}

      {/* Meme & Animated GIF Creator */}
      {memeGifItem && (
        <MemeGifModal
          isOpen={!!memeGifItem}
          onClose={() => setMemeGifItem(null)}
          videoItem={memeGifItem}
          onSaveToVault={handleUploadSuccess}
          profile={profile}
        />
      )}

    </div>
  );
}
