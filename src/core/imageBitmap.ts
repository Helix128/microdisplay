import type { RasterRun } from "./raster";

export type BitmapEncoding = "xbm-base64";

export type MonochromeBitmap = {
  width: number;
  height: number;
  data: Uint8Array;
};

export function getPackedBitmapByteLength(width: number, height: number): number {
  return Math.ceil(width / 8) * height;
}

export function encodeBitmapBase64(data: Uint8Array): string {
  let binary = "";

  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }

  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary);
  }

  return Buffer.from(data).toString("base64");
}

export function decodeBitmapBase64(bitmap: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(bitmap);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(bitmap, "base64"));
}

export function getXbmBit(data: Uint8Array, width: number, x: number, y: number): boolean {
  const bytesPerRow = Math.ceil(width / 8);
  const byte = data[y * bytesPerRow + Math.floor(x / 8)] ?? 0;
  return (byte & (1 << (x % 8))) !== 0;
}

export function setXbmBit(data: Uint8Array, width: number, x: number, y: number, enabled: boolean): void {
  const bytesPerRow = Math.ceil(width / 8);
  const index = y * bytesPerRow + Math.floor(x / 8);
  const mask = 1 << (x % 8);

  if (enabled) {
    data[index] |= mask;
  } else {
    data[index] &= ~mask;
  }
}

export function bitmapToRuns(bitmap: MonochromeBitmap, originX = 0, originY = 0): RasterRun[] {
  const runs: RasterRun[] = [];

  for (let y = 0; y < bitmap.height; y++) {
    let runStart: number | null = null;

    for (let x = 0; x < bitmap.width; x++) {
      if (getXbmBit(bitmap.data, bitmap.width, x, y)) {
        runStart ??= x;
        continue;
      }

      if (runStart !== null) {
        runs.push({ x: originX + runStart, y: originY + y, width: x - runStart });
        runStart = null;
      }
    }

    if (runStart !== null) {
      runs.push({ x: originX + runStart, y: originY + y, width: bitmap.width - runStart });
    }
  }

  return runs;
}

export function invertBitmap(bitmap: MonochromeBitmap): MonochromeBitmap {
  const data = new Uint8Array(bitmap.data.length);

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      setXbmBit(data, bitmap.width, x, y, !getXbmBit(bitmap.data, bitmap.width, x, y));
    }
  }

  return { ...bitmap, data };
}

export function cropBitmap(bitmap: MonochromeBitmap, x: number, y: number, width: number, height: number): MonochromeBitmap {
  const data = new Uint8Array(getPackedBitmapByteLength(width, height));

  for (let targetY = 0; targetY < height; targetY++) {
    for (let targetX = 0; targetX < width; targetX++) {
      setXbmBit(data, width, targetX, targetY, getXbmBit(bitmap.data, bitmap.width, x + targetX, y + targetY));
    }
  }

  return { width, height, data };
}

export function decodeXbmBase64Bitmap(width: number, height: number, bitmap: string): MonochromeBitmap {
  const data = decodeBitmapBase64(bitmap);
  const expectedLength = getPackedBitmapByteLength(width, height);

  if (data.length !== expectedLength) {
    throw new Error(`Invalid bitmap length: expected ${expectedLength}, got ${data.length}.`);
  }

  return { width, height, data };
}
