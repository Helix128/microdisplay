import type { BitmapFont } from "../../../preview/bitmapFont";
import { generatedU8g2FontManifest } from "./generated/manifest.generated";
import { applyVariantToFont } from "./variant";

const sourceModules = import.meta.glob<{ default: BitmapFont }>("./generated/sources/*.ts");
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

  const moduleLoader = sourceModules[`./generated/sources/${variant.sourceKey}.ts`];

  if (moduleLoader === undefined) {
    return null;
  }

  const module = await moduleLoader();
  return applyVariantToFont(module.default, variant);
}
