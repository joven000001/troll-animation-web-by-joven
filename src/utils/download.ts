import { MediaItem } from '../types/media';

/**
 * Downloads a media item cleanly to PC or mobile device.
 */
export async function downloadMediaItem(item: MediaItem, customFilename?: string): Promise<void> {
  const sanitize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const baseName = customFilename || sanitize(item.title) || 'media_item';

  if (item.type === 'emoji') {
    // Render emoji as high-resolution sticker PNG on canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Crisp emoji rendering
      ctx.clearRect(0, 0, 1024, 1024);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '640px system-ui, -apple-system, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
      ctx.fillText(item.emojiSymbol || '✨', 512, 540);

      canvas.toBlob((blob) => {
        if (!blob) return;
        triggerBlobDownload(blob, `${baseName}_sticker.png`);
      }, 'image/png');
      return;
    }
  }

  // If item URL is data URL or blob URL
  if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    triggerDirectDownload(item.url, `${baseName}.${ext}`);
    return;
  }

  // If item URL is an external or local asset path
  try {
    const response = await fetch(item.url, { mode: 'cors' });
    const blob = await response.blob();
    const mime = blob.type;
    let ext = item.type === 'video' ? 'mp4' : 'jpg';
    if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('webp')) ext = 'webp';

    triggerBlobDownload(blob, `${baseName}.${ext}`);
  } catch (err) {
    console.warn('Direct fetch failed, falling back to direct link download', err);
    triggerDirectDownload(item.url, `${baseName}.${item.type === 'video' ? 'mp4' : 'jpg'}`);
  }
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  triggerDirectDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function triggerDirectDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
