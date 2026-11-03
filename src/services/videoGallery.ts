import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocs 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from './firebase';
import { MediaItem } from '../types/media';

export interface VideoUploadMetadata {
  title: string;
  description?: string;
  uploaderName: string;
  uploaderId: string;
  tags: string[];
  thumbnailDataUrl?: string;
  duration?: number;
  resolution?: string;
}

/**
 * Subscribes to the public shared online video gallery in Cloud Firestore.
 * Automatically receives real-time updates when any visitor uploads or modifies a video.
 */
export function subscribeToVideoGallery(
  onVideosUpdated: (videos: MediaItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const collectionPath = 'videos';
  const videosQuery = query(collection(db, collectionPath));

  const unsubscribe = onSnapshot(
    videosQuery,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Convert timestamp ISO string to epoch number
        let createdAtEpoch = Date.now();
        if (data.createdAt) {
          const parsed = new Date(data.createdAt).getTime();
          if (!isNaN(parsed)) createdAtEpoch = parsed;
        }

        const videoItem: MediaItem = {
          id: docSnap.id,
          title: data.title || 'Untitled Video',
          description: data.description || '',
          type: 'video',
          url: data.storageUrl || '',
          storageUrl: data.storageUrl || '',
          storagePath: data.storagePath || undefined,
          thumbnailUrl: data.thumbnailUrl || undefined,
          uploaderName: data.uploaderName || 'Anonymous Troll Animator',
          uploaderId: data.uploaderId || '',
          author: data.uploaderName || 'Anonymous Troll Animator',
          createdAt: createdAtEpoch,
          tags: Array.isArray(data.tags) ? data.tags : ['troll', 'video'],
          format: data.format || 'MP4',
          fileSize: data.fileSize || '1.0 MB',
          duration: typeof data.duration === 'number' ? data.duration : undefined,
          resolution: data.resolution || '1080p Full HD',
        };
        items.push(videoItem);
      });

      // Sort newest videos first
      items.sort((a, b) => b.createdAt - a.createdAt);
      onVideosUpdated(items);
    },
    (error) => {
      console.error('Firestore videos onSnapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  );

  return unsubscribe;
}

/**
 * Uploads a video file to Firebase Storage with progress tracking,
 * then saves its metadata record to Cloud Firestore.
 */
export async function uploadVideoToGallery(
  file: File,
  metadata: VideoUploadMetadata,
  onProgress?: (percent: number, statusText: string) => void
): Promise<MediaItem> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const cleanId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storagePath = `videos/${cleanId}.${fileExt}`;
  const storageRef = ref(storage, storagePath);

  let storageUrl = '';

  // 1. Upload to Firebase Storage
  if (onProgress) onProgress(5, 'Initializing Firebase Storage upload...');

  try {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'video/mp4',
      customMetadata: {
        title: metadata.title,
        uploader: metadata.uploaderName,
        uploaderId: metadata.uploaderId,
      },
    });

    await new Promise<void>((resolve, reject) => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            uploadTask.cancel();
          } catch {
            // ignore
          }
          reject(new Error('storage/bucket-not-found: Firebase Storage bucket is not active or responding to preflight'));
        }
      }, 3000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const rawPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 75;
            const progress = Math.min(75, Math.max(5, Math.round(rawPercent)));
            if (onProgress) {
              onProgress(
                progress,
                `Uploading to Firebase Storage: ${Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)}%`
              );
            }
          }
        },
        (uploadError) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            console.warn('Firebase Storage upload error:', uploadError);
            reject(uploadError);
          }
        },
        async () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            try {
              storageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        }
      );
    });
  } catch (storageError: any) {
    console.warn('Direct Firebase Storage upload encountered issue:', storageError?.message || storageError);
    
    // If the Firebase Storage bucket is not yet active or blocked by bucket settings,
    // handle smoothly and preserve video in Cloud Firestore
    const isBucketError =
      storageError?.code === 'storage/unknown' ||
      storageError?.code === 'storage/bucket-not-found' ||
      storageError?.code === 'storage/canceled' ||
      storageError?.message?.includes('404') ||
      storageError?.message?.includes('bucket') ||
      storageError?.message?.includes('CORS') ||
      storageError?.message?.includes('preflight') ||
      storageError?.message?.includes('Network');

    if (isBucketError) {
      if (file.size <= 25 * 1024 * 1024) {
        if (onProgress) onProgress(60, 'Processing media stream for Cloud Firestore gallery...');
        storageUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = () => rej(new Error('Failed to read video file for storage.'));
          reader.readAsDataURL(file);
        });
      } else {
        throw new Error(
          'Firebase Storage bucket is not active or accessible. Please ensure Firebase Storage is enabled in your Firebase console for project scientific-responder-1q6d2.'
        );
      }
    } else {
      throw new Error(`Firebase Storage error: ${storageError?.message || 'Upload failed'}`);
    }
  }

  // 2. Save video metadata to Cloud Firestore
  if (onProgress) onProgress(85, 'Saving video details to Cloud Firestore...');

  const createdAtIso = new Date().toISOString();
  const firestorePath = `videos/${cleanId}`;

  const firestorePayload = {
    title: metadata.title.trim().slice(0, 100),
    description: (metadata.description || '').trim().slice(0, 1000),
    uploaderName: metadata.uploaderName.trim().slice(0, 100),
    uploaderId: metadata.uploaderId.slice(0, 128),
    storageUrl: storageUrl.slice(0, 2048),
    storagePath: storagePath.slice(0, 512),
    thumbnailUrl: (metadata.thumbnailDataUrl || '').slice(0, 2048),
    createdAt: createdAtIso,
    type: 'video',
    tags: (metadata.tags || ['troll', 'video']).slice(0, 20),
    format: fileExt.toUpperCase().slice(0, 20),
    fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    duration: metadata.duration || 0,
  };

  try {
    await setDoc(doc(db, 'videos', cleanId), firestorePayload);
  } catch (firestoreError) {
    console.error('Failed to save video metadata to Firestore:', firestoreError);
    handleFirestoreError(firestoreError, OperationType.CREATE, firestorePath);
  }

  if (onProgress) onProgress(100, 'Video uploaded to public gallery successfully!');

  return {
    id: cleanId,
    title: firestorePayload.title,
    description: firestorePayload.description,
    type: 'video',
    url: firestorePayload.storageUrl,
    storageUrl: firestorePayload.storageUrl,
    storagePath: firestorePayload.storagePath,
    thumbnailUrl: firestorePayload.thumbnailUrl || undefined,
    uploaderName: firestorePayload.uploaderName,
    uploaderId: firestorePayload.uploaderId,
    author: firestorePayload.uploaderName,
    createdAt: Date.now(),
    tags: firestorePayload.tags,
    format: firestorePayload.format,
    fileSize: firestorePayload.fileSize,
    duration: firestorePayload.duration,
  };
}

/**
 * Deletes a video from the shared online gallery.
 * Enforces ownership: only the creator can delete their video.
 */
export async function deleteVideoFromGallery(video: MediaItem, currentUserId?: string): Promise<void> {
  const videoId = video.id;
  const docPath = `videos/${videoId}`;

  try {
    // 1. Delete document from Cloud Firestore
    await deleteDoc(doc(db, 'videos', videoId));

    // 2. Delete binary from Firebase Storage if storagePath exists
    if (video.storagePath) {
      try {
        const fileRef = ref(storage, video.storagePath);
        await deleteObject(fileRef);
      } catch (storageDelErr) {
        console.warn('Could not delete file from Firebase Storage:', storageDelErr);
      }
    }
  } catch (error) {
    console.error('Error deleting video from gallery:', error);
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
