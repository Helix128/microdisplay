import { defaultU8g2FontName, getU8g2Font, u8g2Fonts } from "./catalog";

export type U8g2FontPurpose = "t" | "h" | "m" | "8";
export type U8g2FontCharset = string;

export type U8g2FontVariant = {
  id: string;
  family: string;
  purpose: U8g2FontPurpose;
  charset: U8g2FontCharset;
  hasBitmapPreview: boolean;
};

export type U8g2FontFamily = {
  family: string;
  variants: U8g2FontVariant[];
  purposes: U8g2FontPurpose[];
  charsets: U8g2FontCharset[];
};

const purposeOrder: U8g2FontPurpose[] = ["t", "h", "m", "8"];
const charsetOrder = ["f", "r", "u", "n", "e"];

const variants = u8g2Fonts.flatMap((font) => {
  const variant = parseU8g2FontVariant(font.name);
  return variant === null ? [] : [{ ...variant, hasBitmapPreview: font.hasBitmapPreview }];
});

const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
const families = buildFamilies(variants);
const familiesByName = new Map(families.map((family) => [family.family, family]));

export function parseU8g2FontVariant(id: string): Omit<U8g2FontVariant, "hasBitmapPreview"> | null {
  const match = /^u8g2_font_(.+)_([thm8])(.+)$/.exec(id);

  if (match === null) {
    return null;
  }

  return {
    id,
    family: match[1]!,
    purpose: match[2]! as U8g2FontPurpose,
    charset: match[3]!,
  };
}

export function getU8g2FontVariant(id: string): U8g2FontVariant {
  return variantsById.get(id) ?? variantsById.get(defaultU8g2FontName)!;
}

export function getU8g2FontFamilies(): U8g2FontFamily[] {
  return families;
}

export function getU8g2FontFamily(family: string): U8g2FontFamily | null {
  return familiesByName.get(family) ?? null;
}

export function resolveU8g2FontVariant(options: {
  currentFont: string;
  family?: string;
  purpose?: U8g2FontPurpose;
  charset?: U8g2FontCharset;
}): string {
  const currentVariant = getU8g2FontVariant(options.currentFont);
  const targetFamilyName = options.family ?? currentVariant.family;
  const targetFamily = familiesByName.get(targetFamilyName) ?? familiesByName.get(currentVariant.family);

  if (targetFamily === undefined) {
    return defaultU8g2FontName;
  }

  const targetPurpose = options.purpose ?? currentVariant.purpose;
  const targetCharset = options.charset ?? currentVariant.charset;
  const exact = targetFamily.variants.find(
    (variant) => variant.purpose === targetPurpose && variant.charset === targetCharset,
  );

  if (exact !== undefined) {
    return exact.id;
  }

  return (
    targetFamily.variants.find((variant) => variant.purpose === targetPurpose)?.id ??
    targetFamily.variants.find((variant) => variant.charset === targetCharset)?.id ??
    targetFamily.variants.find((variant) => variant.charset === "f")?.id ??
    targetFamily.variants.find((variant) => variant.charset === "r")?.id ??
    targetFamily.variants[0]?.id ??
    defaultU8g2FontName
  );
}

export function getPurposeLabel(purpose: U8g2FontPurpose): string {
  switch (purpose) {
    case "t":
      return "Predeterminado";
    case "h":
      return "Altura común";
    case "m":
      return "Monospace";
    case "8":
      return "8x8";
  }
}

export function getCharsetLabel(charset: U8g2FontCharset): string {
  switch (charset) {
    case "f":
      return "Full";
    case "r":
      return "ASCII reducido";
    case "u":
      return "Mayúsculas";
    case "n":
      return "Números/fecha/hora";
    case "e":
      return "Extendido";
    default:
      return toTitleCase(charset.replace(/^_/, ""));
  }
}

function buildFamilies(fontVariants: U8g2FontVariant[]): U8g2FontFamily[] {
  const familyMap = new Map<string, U8g2FontVariant[]>();

  for (const variant of fontVariants) {
    familyMap.set(variant.family, [...(familyMap.get(variant.family) ?? []), variant]);
  }

  return [...familyMap.entries()]
    .map(([family, familyVariants]) => ({
      family,
      variants: familyVariants.sort(compareVariants),
      purposes: uniqueOrdered(familyVariants.map((variant) => variant.purpose), purposeOrder),
      charsets: uniqueOrdered(familyVariants.map((variant) => variant.charset), charsetOrder),
    }))
    .sort((left, right) => getFamilySortWeight(left.family) - getFamilySortWeight(right.family) || left.family.localeCompare(right.family));
}

function compareVariants(left: U8g2FontVariant, right: U8g2FontVariant): number {
  return (
    getOrderIndex(purposeOrder, left.purpose) - getOrderIndex(purposeOrder, right.purpose) ||
    getOrderIndex(charsetOrder, left.charset) - getOrderIndex(charsetOrder, right.charset) ||
    left.id.localeCompare(right.id)
  );
}

function uniqueOrdered<T extends string>(values: T[], preferredOrder: readonly string[]): T[] {
  return [...new Set(values)].sort(
    (left, right) => getOrderIndex(preferredOrder, left) - getOrderIndex(preferredOrder, right) || left.localeCompare(right),
  );
}

function getOrderIndex(order: readonly string[], value: string): number {
  const index = order.indexOf(value);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getFamilySortWeight(family: string): number {
  return getU8g2Font(`u8g2_font_${family}_tf`).recommended ? -1 : 0;
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}
