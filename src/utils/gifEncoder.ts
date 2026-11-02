/**
 * Lightweight, high-performance pure TypeScript GIF89a Encoder
 * Encodes canvas frames into standard animated .gif Blobs with loop support and color quantization.
 */

export interface GifFrameOptions {
  delay: number; // in milliseconds (e.g. 100ms = 10 fps)
  transparentColor?: number | null;
}

export class GifEncoder {
  private width: number;
  private height: number;
  private frames: { data: Uint8ClampedArray; delay: number }[] = [];
  private loopCount: number = 0; // 0 = infinite loop

  constructor(width: number, height: number, loopCount: number = 0) {
    this.width = Math.round(width);
    this.height = Math.round(height);
    this.loopCount = loopCount;
  }

  public addFrame(ctx: CanvasRenderingContext2D, delayMs: number = 100) {
    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    this.frames.push({
      data: imgData.data,
      delay: Math.max(20, delayMs),
    });
  }

  public render(onProgress?: (pct: number) => void): Blob {
    const bytes: number[] = [];

    // Header: GIF89a
    this.writeString(bytes, 'GIF89a');

    // Logical Screen Descriptor
    this.writeWord(bytes, this.width);
    this.writeWord(bytes, this.height);
    // Packed: Global Color Table Flag (1), 7 = 8 bits per pixel (256 colors)
    bytes.push(0xf7); // 1 111 0 111
    bytes.push(0);    // background color index
    bytes.push(0);    // pixel aspect ratio

    // Build adaptive 256-color palette from frames
    const palette = this.buildGlobalPalette();
    for (let i = 0; i < 256; i++) {
      const col = palette[i] || [0, 0, 0];
      bytes.push(col[0], col[1], col[2]);
    }

    // Netscape 2.0 Loop Extension for infinite looping
    bytes.push(0x21, 0xff, 0x0b);
    this.writeString(bytes, 'NETSCAPE2.0');
    bytes.push(0x03, 0x01);
    this.writeWord(bytes, this.loopCount);
    bytes.push(0x00); // Block terminator

    const totalFrames = this.frames.length;

    // Encode each frame
    for (let f = 0; f < totalFrames; f++) {
      const frame = this.frames[f];
      const delayUnits = Math.round(frame.delay / 10); // in 1/100ths of second

      // Graphic Control Extension
      bytes.push(0x21, 0xf9, 0x04);
      bytes.push(0x04); // Packed: disposal method 1 (do not dispose)
      this.writeWord(bytes, delayUnits);
      bytes.push(0);    // transparent color index
      bytes.push(0x00); // block terminator

      // Image Descriptor
      bytes.push(0x2c);
      this.writeWord(bytes, 0); // left
      this.writeWord(bytes, 0); // top
      this.writeWord(bytes, this.width);
      this.writeWord(bytes, this.height);
      bytes.push(0x00); // packed: no local color table

      // Map pixels to color indices
      const indexedPixels = this.mapPixelsToPalette(frame.data, palette);

      // LZW Compress
      this.lzwEncode(bytes, 8, indexedPixels);

      if (onProgress) {
        onProgress(Math.round(((f + 1) / totalFrames) * 100));
      }
    }

    // Trailer: 0x3B
    bytes.push(0x3b);

    return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
  }

  private writeWord(bytes: number[], val: number) {
    bytes.push(val & 0xff, (val >> 8) & 0xff);
  }

  private writeString(bytes: number[], str: string) {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  }

  private buildGlobalPalette(): [number, number, number][] {
    // 6x7x6 color cube + essential grays for rich meme reproduction
    const palette: [number, number, number][] = [];

    // Standard 6x7x6 color palette
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 7; g++) {
        for (let b = 0; b < 6; b++) {
          palette.push([
            Math.round((r / 5) * 255),
            Math.round((g / 6) * 255),
            Math.round((b / 5) * 255),
          ]);
        }
      }
    }

    // Fill remaining with grayscale tones (vital for black/white text & troll memes)
    const grayCount = 256 - palette.length;
    for (let i = 0; i < grayCount; i++) {
      const v = Math.round((i / (grayCount - 1 || 1)) * 255);
      palette.push([v, v, v]);
    }

    return palette.slice(0, 256);
  }

  private mapPixelsToPalette(data: Uint8ClampedArray, palette: [number, number, number][]): Uint8Array {
    const len = this.width * this.height;
    const indexed = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];

      // Fast color match in 6x7x6 cube
      const rIdx = Math.min(5, Math.floor((r / 256) * 6));
      const gIdx = Math.min(6, Math.floor((g / 256) * 7));
      const bIdx = Math.min(5, Math.floor((b / 256) * 6));
      const idx = rIdx * 42 + gIdx * 6 + bIdx;

      indexed[i] = idx < 256 ? idx : 0;
    }

    return indexed;
  }

  private lzwEncode(bytes: number[], minCodeSize: number, pixels: Uint8Array) {
    bytes.push(minCodeSize);

    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCode = (1 << 12) - 1;

    const dict = new Map<string, number>();

    const resetDict = () => {
      dict.clear();
      for (let i = 0; i < clearCode; i++) {
        dict.set(String(i), i);
      }
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    };

    resetDict();

    let accum = 0;
    let accumBits = 0;
    const packet: number[] = [];

    const flushPacket = () => {
      if (packet.length > 0) {
        bytes.push(packet.length);
        for (let i = 0; i < packet.length; i++) {
          bytes.push(packet[i]);
        }
        packet.length = 0;
      }
    };

    const writeCode = (code: number) => {
      accum |= code << accumBits;
      accumBits += codeSize;

      while (accumBits >= 8) {
        packet.push(accum & 0xff);
        accum >>= 8;
        accumBits -= 8;
        if (packet.length === 254) {
          flushPacket();
        }
      }
    };

    writeCode(clearCode);

    if (pixels.length === 0) {
      writeCode(eoiCode);
      if (accumBits > 0) packet.push(accum & 0xff);
      flushPacket();
      bytes.push(0x00);
      return;
    }

    let prefix = String(pixels[0]);

    for (let i = 1; i < pixels.length; i++) {
      const c = pixels[i];
      const combined = prefix + ',' + c;

      if (dict.has(combined)) {
        prefix = combined;
      } else {
        writeCode(dict.get(prefix)!);

        if (nextCode <= maxCode) {
          dict.set(combined, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeCode(clearCode);
          resetDict();
        }

        prefix = String(c);
      }
    }

    writeCode(dict.get(prefix)!);
    writeCode(eoiCode);

    if (accumBits > 0) {
      packet.push(accum & 0xff);
    }
    flushPacket();
    bytes.push(0x00); // Block terminator
  }
}
