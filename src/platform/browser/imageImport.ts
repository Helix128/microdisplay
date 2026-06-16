import type { RgbaImageData, Size } from "../../core";
import { fitSizeWithin } from "../../core";

export type ImportedImageSource = {
  sourceMimeType: string;
  sourceData: string;
  sourceWidth: number;
  sourceHeight: number;
};

const imageBitmapCache = new Map<string, Promise<ImageBitmap>>();

export async function importImageSource(file: File, maxSize: Size): Promise<ImportedImageSource> {
  const image = await createImageBitmap(file);

  try {
    const sourceSize = fitSizeWithin(
      { width: image.width, height: image.height },
      { width: Math.min(maxSize.width, image.width), height: Math.min(maxSize.height, image.height) },
    );
    const canvas = drawImageToCanvas(image, sourceSize.width, sourceSize.height);
    const dataUrl = canvas.toDataURL("image/png");

    return {
      sourceMimeType: "image/png",
      sourceData: dataUrlToBase64(dataUrl),
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
    };
  } finally {
    image.close();
  }
}

export async function renderImageSourceRgba(
  source: Pick<ImportedImageSource, "sourceMimeType" | "sourceData">,
  width: number,
  height: number,
): Promise<RgbaImageData> {
  const image = await getCachedImageBitmap(source);
  const canvas = drawImageToCanvas(image, width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (context === null) {
    throw new Error("No se pudo crear el contexto de imagen.");
  }

  const imageData = context.getImageData(0, 0, width, height);

  return {
    width,
    height,
    data: imageData.data,
  };
}

function getCachedImageBitmap(source: Pick<ImportedImageSource, "sourceMimeType" | "sourceData">): Promise<ImageBitmap> {
  const key = `${source.sourceMimeType}:${source.sourceData}`;
  const cached = imageBitmapCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const promise = fetch(`data:${source.sourceMimeType};base64,${source.sourceData}`)
    .then((response) => response.blob())
    .then((blob) => createImageBitmap(blob))
    .catch((error) => {
      imageBitmapCache.delete(key);
      throw error;
    });

  imageBitmapCache.set(key, promise);
  return promise;
}

function drawImageToCanvas(image: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (context === null) {
    throw new Error("No se pudo crear el contexto de imagen.");
  }

  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas;
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
