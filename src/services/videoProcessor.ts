import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegPromise: Promise<FFmpeg> | null = null;
const CORE_VERSION = '0.12.10';
const MAX_PART_BYTES = 44 * 1024 * 1024;

async function getFFmpeg(onProgress?: (percent: number, label: string) => void): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => {
        onProgress?.(Math.max(0, Math.min(100, Math.round(progress * 100))), 'Converting video in your browser...');
      });
      // Vite needs the ESM core build; the UMD build can fail with 'failed to import ffmpeg-core.js'.
      const base = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
      // Serve the FFmpeg wrapper worker as a plain public asset so Vite does not
      // rewrite its dynamic import() of the CDN-hosted core module.
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      ]);
      await ffmpeg.load({
        coreURL,
        wasmURL,
        classWorkerURL: `${window.location.origin}/ffmpeg/worker.js`,
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegPromise = null;
      throw error;
    });
  }
  return ffmpegPromise;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '') || 'video';
}

async function cleanup(ffmpeg: FFmpeg, names: string[]) {
  await Promise.all(names.map(async (name) => {
    try { await ffmpeg.deleteFile(name); } catch { /* temporary file may not exist */ }
  }));
}

/** Compress a video to a single MP4 intended to fit the shared 50 MB object limit. */
export async function convertVideoUnderLimit(
  source: File,
  onProgress?: (percent: number, label: string) => void
): Promise<File> {
  const ffmpeg = await getFFmpeg(onProgress);
  const input = `input_${Date.now()}.${source.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'mp4'}`;
  const output = `converted_${Date.now()}.mp4`;
  try {
    onProgress?.(2, 'Loading video for conversion...');
    await ffmpeg.writeFile(input, await fetchFile(source));
    // A 44 MiB target leaves a safety margin below Supabase's 50 MiB hard limit.
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(source);
    const duration = await new Promise<number>((resolve, reject) => {
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error('Could not read the video duration.'));
      video.src = objectUrl;
    }).finally(() => URL.revokeObjectURL(objectUrl));
    // Lower resolution and bitrate reduce WASM CPU work and make browser conversion much faster.
    const targetBitsPerSecond = Math.max(120_000, Math.min(1_000_000, Math.floor((44 * 1024 * 1024 * 8) / Math.max(duration, 1) - 64_000)));
    const videoK = Math.max(180, Math.floor(targetBitsPerSecond / 1000));
    onProgress?.(5, 'Compressing video to fit under 50 MB...');
    await ffmpeg.exec([
      '-i', input, '-vf', 'scale=-2:480:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-b:v', `${videoK}k`,
      '-maxrate', `${videoK}k`, '-bufsize', `${videoK * 2}k`,
      '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', '-y', output,
    ]);
    const data = await ffmpeg.readFile(output);
    if (!(data instanceof Uint8Array)) throw new Error('Video conversion returned an invalid file.');
    if (data.byteLength > MAX_PART_BYTES) {
      throw new Error('This video is too long or complex to compress below 44 MB. Choose “Trim & Upload” to split it into parts.');
    }
    onProgress?.(95, 'Preparing converted video...');
    return new File([data.slice().buffer as ArrayBuffer], `${safeName(source.name)}-compressed.mp4`, { type: 'video/mp4' });
  } finally {
    await cleanup(ffmpeg, [input, output]);
  }
}

/** Transcode and split into independently playable MP4 parts under 44 MiB each. */
export async function trimVideoIntoParts(
  source: File,
  onProgress?: (percent: number, label: string) => void
): Promise<File[]> {
  const ffmpeg = await getFFmpeg(onProgress);
  const input = `input_${Date.now()}.${source.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'mp4'}`;
  const pattern = 'part_%03d.mp4';
  const outputs: string[] = [];
  try {
    onProgress?.(2, 'Preparing video for splitting...');
    await ffmpeg.writeFile(input, await fetchFile(source));
    // Conservative bitrate and 90-second segments keep each object comfortably below 50 MiB.
    onProgress?.(5, 'Splitting video into upload-sized parts...');
    await ffmpeg.exec([
      '-i', input, '-vf', 'scale=-2:480:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-b:v', '1200k',
      '-maxrate', '1200k', '-bufsize', '2400k', '-force_key_frames', 'expr:gte(t,n_forced*90)',
      '-c:a', 'aac', '-b:a', '64k', '-f', 'segment', '-segment_time', '90',
      '-segment_format', 'mp4', '-reset_timestamps', '1', '-segment_start_number', '0',
      '-y', pattern,
    ]);
    const listing = await ffmpeg.listDir('/');
    const names = listing
      .filter((entry) => entry.type === 'file' && /^part_\d+\.mp4$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    if (!names.length) throw new Error('The trimmer could not create video parts.');
    const files: File[] = [];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const data = await ffmpeg.readFile(name);
      if (!(data instanceof Uint8Array)) throw new Error('A trimmed video part could not be read.');
      if (data.byteLength > MAX_PART_BYTES) {
        throw new Error('A video part is still larger than 44 MB. Please try a lower-resolution source video.');
      }
      files.push(new File([data.slice().buffer], `${safeName(source.name)}-part-${index + 1}.mp4`, { type: 'video/mp4' }));
      outputs.push(name);
      onProgress?.(Math.round(10 + ((index + 1) / names.length) * 85), `Prepared part ${index + 1} of ${names.length}`);
    }
    return files;
  } finally {
    await cleanup(ffmpeg, [input, ...outputs]);
    // Remove any segment files if processing failed before they were added to outputs.
    const listing = await ffmpeg.listDir('/').catch(() => []);
    await cleanup(ffmpeg, listing.filter((entry) => entry.type === 'file' && /^part_\d+\.mp4$/.test(entry.name)).map((entry) => entry.name));
  }
}
