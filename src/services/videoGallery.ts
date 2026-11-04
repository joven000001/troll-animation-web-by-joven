import { supabase } from './supabase';
import { MediaItem } from '../types/media';

export interface VideoPart { url: string; storagePath: string; duration: number; size: number; }

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

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const BUCKET = 'videos';

function mapVideo(row: any): MediaItem {
  const createdAt = row.upload_date ? new Date(row.upload_date).getTime() : Date.now();
  const path = row.storage_path || '';
  const extension = path.split('.').pop()?.toUpperCase() || 'VIDEO';

  return {
    id: row.id,
    title: row.title || 'Untitled Video',
    description: row.description || '',
    type: 'video',
    url: row.storage_url || '',
    storageUrl: row.storage_url || '',
    storagePath: path,
    videoParts: Array.isArray(row.video_parts) ? row.video_parts : [],
    uploaderName: row.uploader_name || 'Anonymous',
    uploaderId: row.uploader_id || '',
    author: row.uploader_name || 'Anonymous',
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    tags: ['troll', 'video', extension.toLowerCase()],
    format: extension,
    fileSize: 'Shared video',
  };
}

/** Listen for shared videos from Supabase and receive live updates. */
export function subscribeToVideoGallery(
  onVideosUpdated: (videos: MediaItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;

  const loadVideos = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('id,title,description,uploader_name,uploader_id,storage_path,storage_url,video_parts,upload_date')
      .order('upload_date', { ascending: false });

    if (error) throw error;
    if (active) onVideosUpdated((data || []).map(mapVideo));
  };

  loadVideos().catch((error) => {
    console.error('Supabase gallery load failed:', error);
    if (active) onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  const channel = supabase
    .channel('shared-video-gallery')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
      loadVideos().catch((error) => {
        console.error('Supabase realtime refresh failed:', error);
        if (active) onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Live gallery connection failed. Please refresh the page.'));
      }
    });

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

/** Upload a video to Supabase Storage, then publish its metadata. */
export async function uploadVideoToGallery(
  file: File,
  metadata: VideoUploadMetadata,
  onProgress?: (percent: number, statusText: string) => void
): Promise<MediaItem> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('This video is larger than the 50 MB limit on the Supabase Free plan.');
  }
  if (!metadata.title.trim()) throw new Error('Please enter a video title.');

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'video';
  const fileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `${fileId}.${extension}`;

  onProgress?.(5, 'Preparing upload to shared gallery...');

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message.includes('maximum') || uploadError.message.includes('size')
      ? 'Upload failed: this file may exceed the 50 MB Free-plan limit.'
      : `Storage upload failed: ${uploadError.message}`);
  }

  onProgress?.(75, 'Saving video details to the shared gallery...');

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const storageUrl = publicData.publicUrl;
  const payload = {
    title: metadata.title.trim().slice(0, 120),
    description: (metadata.description || '').trim().slice(0, 2000),
    uploader_name: (metadata.uploaderName || 'Anonymous').trim().slice(0, 60),
    uploader_id: (metadata.uploaderId || '').slice(0, 128),
    storage_path: storagePath,
    storage_url: storageUrl,
    video_parts: [],
    upload_date: new Date().toISOString(),
  };

  const { data, error: insertError } = await supabase
    .from('videos')
    .insert(payload)
    .select('id,title,description,uploader_name,uploader_id,storage_path,storage_url,video_parts,upload_date')
    .single();

  if (insertError) {
    // Avoid leaving an unlisted object behind if metadata publication fails.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Could not publish video details: ${insertError.message}`);
  }

  onProgress?.(100, 'Video published to the shared gallery!');
  return mapVideo(data);
}

/** Public deletion is intentionally unavailable; the database has no public delete policy. */
export async function deleteVideoFromGallery(_video: MediaItem, _currentUserId?: string): Promise<void> {
  throw new Error('Video deletion is currently disabled for public visitors.');
}


/** Uploads a large video as sequential MP4 objects but publishes one gallery entry. */
export async function uploadVideoPartsToGallery(
  parts: File[],
  metadata: VideoUploadMetadata,
  onProgress?: (percent: number, statusText: string) => void
): Promise<MediaItem> {
  if (!parts.length) throw new Error('No trimmed video parts were created.');
  if (parts.some((part) => part.size > MAX_VIDEO_BYTES)) {
    throw new Error('A trimmed part exceeds the 50 MB upload limit.');
  }
  const uploaded: { url: string; storagePath: string; duration: number; size: number }[] = [];
  try {
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const storagePath = `${crypto.randomUUID()}-part-${index + 1}.mp4`;
      onProgress?.(Math.round((index / parts.length) * 90), `Uploading part ${index + 1} of ${parts.length}...`);
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, part, {
        cacheControl: '3600', contentType: 'video/mp4', upsert: false,
      });
      if (error) throw new Error(`Part ${index + 1} upload failed: ${error.message}`);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      uploaded.push({ url: data.publicUrl, storagePath, duration: 90, size: part.size });
    }

    onProgress?.(94, 'Publishing the combined video to the gallery...');
    const payload = {
      title: metadata.title.trim().slice(0, 120),
      description: (metadata.description || '').trim().slice(0, 2000),
      uploader_name: (metadata.uploaderName || 'Anonymous').trim().slice(0, 60),
      uploader_id: (metadata.uploaderId || '').slice(0, 128),
      storage_path: uploaded[0].storagePath,
      storage_url: uploaded[0].url,
      video_parts: uploaded,
      upload_date: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('videos')
      .insert(payload)
      .select('id,title,description,uploader_name,uploader_id,storage_path,storage_url,video_parts,upload_date')
      .single();
    if (error) throw new Error(`Could not publish combined video: ${error.message}`);
    onProgress?.(100, 'All parts uploaded! Video is ready.');
    return mapVideo(data);
  } catch (error) {
    if (uploaded.length) {
      await supabase.storage.from(BUCKET).remove(uploaded.map((part) => part.storagePath));
    }
    throw error;
  }
}
