import {
  encodeBitmapBase64,
  getPackedBitmapByteLength,
  setXbmBit,
  type MonochromeBitmap,
} from "./imageBitmap";

export type RgbaImageData = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

export type DitherMode = "threshold" | "ordered" | "floyd-steinberg";
export type LegacyDitherMode = DitherMode | "bayer-2x2" | "bayer-4x4" | "bayer-8x8";
export type ResizeMode = "free" | "lock-aspect" | "lock-aspect-width" | "lock-aspect-height";

export const ditherModes: DitherMode[] = ["threshold", "ordered", "floyd-steinberg"];
export const resizeModes: ResizeMode[] = ["free", "lock-aspect", "lock-aspect-width", "lock-aspect-height"];

export type ThresholdOptions = {
  threshold: number;
  invert: boolean;
  ditherMode?: DitherMode;
  brightness?: number;
};

export type Size = {
  width: number;
  height: number;
};

const bayer4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function rgbaToMonochromeBitmap(image: RgbaImageData, options: ThresholdOptions): MonochromeBitmap {
  return processImageToBitmap(image, options);
}

export function processImageToBitmap(image: RgbaImageData, options: ThresholdOptions): MonochromeBitmap {
  const ditherMode = options.ditherMode ?? "threshold";

  if (ditherMode === "floyd-steinberg") {
    return processFloydSteinberg(image, options);
  }

  return processThresholdOrOrdered(image, options, ditherMode);
}

export function rgbaToXbmBase64(image: RgbaImageData, options: ThresholdOptions): string {
  return encodeBitmapBase64(processImageToBitmap(image, options).data);
}

export function fitSizeWithin(source: Size, bounds: Size): Size {
  const scale = Math.min(bounds.width / source.width, bounds.height / source.height);

  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

export function sizeFromWidth(source: Size, width: number): Size {
  return {
    width,
    height: Math.max(1, Math.round((width * source.height) / source.width)),
  };
}

export function sizeFromHeight(source: Size, height: number): Size {
  return {
    width: Math.max(1, Math.round((height * source.width) / source.height)),
    height,
  };
}

export function isDitherMode(value: string): value is DitherMode {
  return ditherModes.includes(value as DitherMode);
}

export function normalizeDitherMode(value: string): DitherMode | null {
  if (isDitherMode(value)) {
    return value;
  }

  if (value === "bayer-2x2" || value === "bayer-4x4" || value === "bayer-8x8") {
    return "ordered";
  }

  return null;
}

export function isResizeMode(value: string): value is ResizeMode {
  return resizeModes.includes(value as ResizeMode);
}

function processThresholdOrOrdered(image: RgbaImageData, options: ThresholdOptions, ditherMode: DitherMode): MonochromeBitmap {
  const data = new Uint8Array(getPackedBitmapByteLength(image.width, image.height));
  const threshold = clampByte(options.threshold);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const gray = getGray(image, x, y, 0);
      const localThreshold = ditherMode === "ordered" ? getBayer4Threshold(threshold, x, y) : threshold;
      const enabled = options.invert ? gray > localThreshold : gray <= localThreshold;
      setXbmBit(data, image.width, x, y, enabled);
    }
  }

  return { width: image.width, height: image.height, data };
}

function processFloydSteinberg(image: RgbaImageData, options: ThresholdOptions): MonochromeBitmap {
  const data = new Uint8Array(getPackedBitmapByteLength(image.width, image.height));
  const values = new Float32Array(image.width * image.height);
  const brightness = clampBrightness(options.brightness ?? 0);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      values[y * image.width + x] = getGray(image, x, y, brightness);
    }
  }

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = y * image.width + x;
      const oldValue = values[index]!;
      const black = oldValue <= 127;
      const enabled = options.invert ? !black : black;
      const newValue = black ? 0 : 255;
      const error = oldValue - newValue;

      setXbmBit(data, image.width, x, y, enabled);
      distributeError(values, image.width, image.height, x + 1, y, error * 7 / 16);
      distributeError(values, image.width, image.height, x - 1, y + 1, error * 3 / 16);
      distributeError(values, image.width, image.height, x, y + 1, error * 5 / 16);
      distributeError(values, image.width, image.height, x + 1, y + 1, error * 1 / 16);
    }
  }

  return { width: image.width, height: image.height, data };
}

function distributeError(values: Float32Array, width: number, height: number, x: number, y: number, error: number): void {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }

  const index = y * width + x;
  values[index] = Math.max(0, Math.min(255, values[index]! + error));
}

function getGray(image: RgbaImageData, x: number, y: number, brightness: number): number {
  const index = (y * image.width + x) * 4;
  const alpha = image.data[index + 3] ?? 255;

  if (alpha === 0) {
    return 255;
  }

  const gray = (image.data[index]! * 0.299) + (image.data[index + 1]! * 0.587) + (image.data[index + 2]! * 0.114);
  return Math.max(0, Math.min(255, gray + brightness));
}

function getBayer4Threshold(threshold: number, x: number, y: number): number {
  const size = bayer4.length;
  const value = bayer4[y % size]![x % size]!;
  const normalized = (value + 0.5) / (size * size);

  return clampByte(threshold + (normalized - 0.5) * 255);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampBrightness(value: number): number {
  return Math.max(-128, Math.min(128, Math.round(value)));
}
