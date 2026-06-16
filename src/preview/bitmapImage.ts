import { decodeXbmBase64Bitmap, getXbmBit } from "../core";

const transparent = [0, 0, 0, 0] as const;
const dataUrlCache = new Map<string, string>();
const maxCacheEntries = 80;

export function bitmapToDataUrl(width: number, height: number, bitmap: string, color: string): string {
  const key = `${width}x${height}:${color}:${bitmap}`;
  const cached = dataUrlCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const decoded = decodeXbmBase64Bitmap(width, height, bitmap);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (context === null) {
    return "";
  }

  const imageData = context.createImageData(width, height);
  const foreground = parseCssHexColor(color);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const pixel = getXbmBit(decoded.data, width, x, y) ? foreground : transparent;
      imageData.data[index] = pixel[0];
      imageData.data[index + 1] = pixel[1];
      imageData.data[index + 2] = pixel[2];
      imageData.data[index + 3] = pixel[3];
    }
  }

  context.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");

  if (dataUrlCache.size >= maxCacheEntries) {
    dataUrlCache.delete(dataUrlCache.keys().next().value!);
  }

  dataUrlCache.set(key, dataUrl);
  return dataUrl;
}

function parseCssHexColor(value: string): readonly [number, number, number, number] {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
      255,
    ];
  }

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return [
      Number.parseInt(value[1]! + value[1]!, 16),
      Number.parseInt(value[2]! + value[2]!, 16),
      Number.parseInt(value[3]! + value[3]!, 16),
      255,
    ];
  }

  return [255, 255, 255, 255];
}
