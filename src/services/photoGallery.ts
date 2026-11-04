import { supabase } from './supabase';
import { MediaItem } from '../types/media';

export interface PhotoUploadMetadata {
  title: string;
  uploaderName: string;
  uploaderId: string;
  tags: string[];
}

const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const BUCKET = 'photos';

function mapPhoto(row: any): MediaItem {
  const createdAt = row.upload_date ? new Date(row.upload_date).getTime() : Date.now();
  const path = row.storage_path || '';
  const extension = path.split('.').pop()?.toUpperCase() || 'IMAGE';
  const url = row.storage_url || '';

  return {
    id: row.id,
    title: row.title || 'Untitled Image',
    type: 'photo',
    url,
    thumbnailUrl: url,
    storageUrl: url,
    storagePath: path,
    uploaderName: row.uploader_name || 'Anonymous',
    uploaderId: row.uploader_id || '',
    author: row.uploader_name || 'Anonymous',
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    tags: Array.isArray(row.tags) ? row.tags : ['image'],
    format: extension,
    fileSize: 'Shared image',
    resolution: 'Shared image',
  };
}

/** Listen for shared photos and GIFs from Supabase. */
export function subscribeToPhotoGallery(
  onPhotosUpdated: (photos: MediaItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('id,title,uploader_name,uploader_id,storage_path,storage_url,tags,upload_date')
      .order('upload_date', { ascending: false });

    if (error) throw error;
    if (active) onPhotosUpdated((data || []).map(mapPhoto));
  };

  loadPhotos().catch((error) => {
    console.error('Supabase photo gallery load failed:', error);
    if (active) onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  const channel = supabase
    .channel('shared-photo-gallery')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, () => {
      loadPhotos().catch((error) => {
        console.error('Supabase photo gallery refresh failed:', error);
        if (active) onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Live photo gallery connection failed. Please refresh the page.'));
      }
    });

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

/** Upload a photo or animated GIF and publish it to the shared gallery. */
export async function uploadPhotoToGallery(
  file: File,
  metadata: PhotoUploadMetadata,
  onProgress?: (percent: number, statusText: string) => void
): Promise<MediaItem> {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('This image or GIF is larger than the 50 MB limit on the Supabase Free plan.');
  }
  if (!metadata.title.trim()) throw new Error('Please enter an image title.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image or GIF file.');

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'image';
  const fileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `${fileId}.${extension}`;

  onProgress?.(10, 'Uploading image to shared gallery...');

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  onProgress?.(75, 'Publishing image details...');

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const storageUrl = publicData.publicUrl;
  const payload = {
    title: metadata.title.trim().slice(0, 120),
    uploader_name: (metadata.uploaderName || 'Anonymous').trim().slice(0, 60),
    uploader_id: (metadata.uploaderId || '').slice(0, 128),
    storage_path: storagePath,
    storage_url: storageUrl,
    tags: (metadata.tags || []).slice(0, 30).map((tag) => tag.slice(0, 40)),
    upload_date: new Date().toISOString(),
  };

  const { data, error: insertError } = await supabase
    .from('photos')
    .insert(payload)
    .select('id,title,uploader_name,uploader_id,storage_path,storage_url,tags,upload_date')
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Could not publish image details: ${insertError.message}`);
  }

  onProgress?.(100, 'Image shared with everyone!');
  return mapPhoto(data);
}
