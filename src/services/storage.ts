import { MediaItem, UserProfile } from '../types/media';

const DB_NAME = 'troll_animation_vault_v3';
const STORE_NAME = 'media_items';
const DB_VERSION = 1;

// Clean Troll Animator Avatar SVG (No pre-existing photos)
export const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="28" fill="#18181b"/>
  <rect x="4" y="4" width="92" height="92" rx="24" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4 4"/>
  <circle cx="50" cy="45" r="26" fill="#27272a" stroke="#f43f5e" stroke-width="3"/>
  <circle cx="41" cy="40" r="4.5" fill="#f43f5e"/>
  <circle cx="59" cy="40" r="4.5" fill="#f43f5e"/>
  <path d="M38 52 Q50 64 62 52" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M34 32 Q50 20 66 32" stroke="#fbbf24" stroke-width="3" fill="none"/>
  <circle cx="50" cy="84" r="14" fill="#f43f5e" opacity="0.2"/>
</svg>
`)}`;

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Troll Animator',
  handle: '@trollanimator',
  avatarUrl: DEFAULT_AVATAR_SVG,
  bio: 'Creator of viral troll animations, memes & visual content',
};

// All pre-existing videos and pre-existing emojis are DELETED as requested.
// Starts completely fresh for the user's uploaded videos, photos, and custom emojis.
export const INITIAL_MEDIA_ITEMS: MediaItem[] = [];

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Clean up old legacy databases if they exist
if (typeof window !== 'undefined' && window.indexedDB) {
  try {
    indexedDB.deleteDatabase('mediavault_db');
    indexedDB.deleteDatabase('troll_animation_vault_v2');
  } catch {
    // ignore
  }
}

export async function getStoredMedia(): Promise<MediaItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const cleanupKey = 'troll_animation_old_videos_cleared_v1';
      let clearOldVideos = false;
      try {
        clearOldVideos = localStorage.getItem(cleanupKey) !== 'done';
      } catch {
        clearOldVideos = false;
      }

      tx.oncomplete = () => {
        if (clearOldVideos) {
          try {
            localStorage.setItem(cleanupKey, 'done');
          } catch {
            // Ignore storage restrictions; cleanup still completed.
          }
        }
      };

      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as MediaItem[];
        if (!items || items.length === 0) {
          resolve([]);
          return;
        }

        const restored = items.map((item) => {
          if (item.blobData && item.blobData instanceof Blob) {
            try {
              item.url = URL.createObjectURL(item.blobData);
            } catch (err) {
              console.warn('Failed to re-create object URL for restored item', item.id, err);
            }
          }
          if (item.thumbnailBlob && item.thumbnailBlob instanceof Blob) {
            try {
              item.thumbnailUrl = URL.createObjectURL(item.thumbnailBlob);
            } catch (err) {
              console.warn('Failed to re-create thumbnail URL for restored item', item.id, err);
            }
          }
          return item;
        });

        // Clear videos that were saved before this one-time cleanup, not future uploads.
        if (clearOldVideos) {
          for (const item of restored) {
            if (item.type === 'video') store.delete(item.id);
          }
        }

        const sanitized = restored.filter(
          (i) =>
            !(clearOldVideos && i.type === 'video') &&
            !i.id.startsWith('vid-') &&
            !i.id.startsWith('emoji-troll-') &&
            !i.id.startsWith('emoji-1') &&
            !i.id.startsWith('emoji-2') &&
            !i.id.startsWith('emoji-3') &&
            !i.id.startsWith('emoji-4') &&
            !i.id.startsWith('emoji-5') &&
            !i.id.startsWith('emoji-6') &&
            !i.title.includes('Big Buck Bunny') &&
            !i.title.includes('Sunset Blaze') &&
            !i.title.includes('Tokyo Drift')
        );
        resolve(sanitized);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('Falling back to empty initial items', e);
    return [];
  }
}
export async function saveMediaItem(item: MediaItem): Promise<void> {
  try {
    // Persist the original file Blob in IndexedDB so video uploads survive refreshes.
    if (!item.blobData && item.url && item.url.startsWith('blob:')) {
      const res = await fetch(item.url);
      item.blobData = await res.blob();
    }

    if (!item.thumbnailBlob && item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
      try {
        const res = await fetch(item.thumbnailUrl);
        item.thumbnailBlob = await res.blob();
      } catch {
        // A thumbnail is optional; the original media remains uploadable.
      }
    }

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not save this media item.'));
      tx.onabort = () => reject(tx.error || new Error('Storage is full or the media file could not be saved.'));
    });
  } catch (e) {
    console.error('Error saving media item', e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Your browser storage is full. Try a smaller MP4 file or free some browser storage.');
    }
    throw e instanceof Error ? e : new Error('Could not save this media item. Please try again.');
  }
}
export async function saveAllMedia(items: MediaItem[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      store.put(item);
    }
  } catch (e) {
    console.error('Error batch saving media', e);
  }
}

export async function deleteMediaItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error deleting media item', e);
  }
}

// User Profile persistence
const PROFILE_KEY = 'troll_animation_user_profile_v3';

export function getStoredProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.avatarUrl?.includes('avatar_alex_rivera')) {
        parsed.avatarUrl = DEFAULT_AVATAR_SVG;
        parsed.name = 'Troll Animator';
        saveStoredProfile(parsed);
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROFILE;
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile', e);
  }
}
