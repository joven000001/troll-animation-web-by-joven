import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourceDir = join(process.cwd(), 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm');
const targetDir = join(process.cwd(), 'public', 'ffmpeg');

await mkdir(targetDir, { recursive: true });
for (const file of ['worker.js', 'const.js', 'errors.js']) {
  await copyFile(join(sourceDir, file), join(targetDir, file));
}
console.log('Copied FFmpeg worker assets to public/ffmpeg');
