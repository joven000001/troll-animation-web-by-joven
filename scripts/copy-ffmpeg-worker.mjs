import { mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('@ffmpeg/ffmpeg/package.json');
const packageRoot = dirname(packageJsonPath);
const sourceDir = join(packageRoot, 'dist', 'esm');
const targetDir = join(process.cwd(), 'public', 'ffmpeg');

await mkdir(targetDir, { recursive: true });
for (const file of ['worker.js', 'const.js', 'errors.js']) {
  await copyFile(join(sourceDir, file), join(targetDir, file));
}
console.log('Copied FFmpeg worker assets to public/ffmpeg');
