import type { BitmapFont } from "../../../preview/bitmapFont";
import { generatedU8g2FontManifest } from "./generated/manifest.generated";
import { applyVariantToFont } from "./variant";

const fontCache = new Map<string, Promise<BitmapFont | null>>();
const variantByName = new Map(generatedU8g2FontManifest.map((entry) => [entry.name, entry]));

export function loadGeneratedU8g2Font(name: string): Promise<BitmapFont | null> {
  const cached = fontCache.get(name);

  if (cached !== undefined) {
    return cached;
  }

  const promise = loadFont(name);
  fontCache.set(name, promise);
  return promise;
}

async function loadFont(name: string): Promise<BitmapFont | null> {
  const variant = variantByName.get(name);

  if (variant === undefined) {
    return null;
  }

  try {
    const response = await fetch(`/fonts/sources/${variant.sourceKey}.json`);
    if (!response.ok) {
      console.error(`Error HTTP ${response.status} al cargar la fuente: ${variant.sourceKey}`);
      return null;
    }
    const fontData = (await response.json()) as BitmapFont;
    return applyVariantToFont(fontData, variant);
  } catch (error) {
    console.error(`Error al cargar o parsear la fuente ${variant.sourceKey}:`, error);
    return null;
  }
}
