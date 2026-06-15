import type { BitmapFont, BitmapGlyph } from "../../../preview/bitmapFont";
import type { GeneratedU8g2FontManifestEntry } from "./generated/manifest.generated";

export function applyVariantToFont(sourceFont: BitmapFont, variant: GeneratedU8g2FontManifestEntry): BitmapFont {
  const mappings = parseMapEntries(variant.mapExpression);
  const glyphEntries: BitmapGlyph[] = [];

  for (const mapping of mappings) {
    if (mapping.destination < 0 || mapping.destination > 65535) {
      continue;
    }

    const glyph = sourceFont.glyphs[String(mapping.source)];

    if (glyph === undefined) {
      continue;
    }

    glyphEntries.push({
      ...glyph,
      codePoint: mapping.destination,
      bitmap: [...glyph.bitmap],
    });
  }

  const normalizedGlyphs = normalizeGlyphsForBuildMode(glyphEntries, variant.buildMode);
  const glyphs = Object.fromEntries(normalizedGlyphs.map((glyph) => [String(glyph.codePoint), glyph]));
  const metrics = measureFont(normalizedGlyphs, sourceFont);

  return {
    name: variant.name,
    lineHeight: metrics.lineHeight,
    ascent: metrics.ascent,
    descent: metrics.descent,
    boundingBox: metrics.boundingBox,
    glyphs,
  };
}

function parseMapEntries(expression: string): Array<{ source: number; destination: number }> {
  const mappings: Array<{ source: number; destination: number }> = [];
  const excluded = new Set<number>();
  const tokens = expression
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith("x")) {
      for (const value of expandRangeToken(token.slice(1))) {
        excluded.add(value);
      }
      continue;
    }

    const [sourcePart, destinationPart] = token.split(">", 2);
    const sourceValues = expandRangeToken(sourcePart!);
    const destinationStart = destinationPart === undefined ? null : parseNumber(destinationPart);

    sourceValues.forEach((source, index) => {
      const destination = destinationStart === null ? source : destinationStart + index;
      if (!excluded.has(source)) {
        mappings.push({ source, destination });
      }
    });
  }

  return mappings;
}

function expandRangeToken(token: string): number[] {
  if (!token.includes("-")) {
    return [parseNumber(token)];
  }

  const [startText, endText] = token.split("-", 2);
  const start = parseNumber(startText!);
  const end = parseNumber(endText!);
  const values: number[] = [];

  for (let value = start; value <= end; value++) {
    values.push(value);
  }

  return values;
}

function normalizeGlyphsForBuildMode(glyphs: BitmapGlyph[], buildMode: GeneratedU8g2FontManifestEntry["buildMode"]): BitmapGlyph[] {
  if (glyphs.length === 0 || buildMode === "t") {
    return glyphs;
  }

  const layouts = glyphs.map((glyph) => ({
    glyph,
    top: -glyph.height - glyph.yOffset,
    bottom: -glyph.yOffset,
    widthForAdvance: Math.max(glyph.width, glyph.xAdvance - glyph.xOffset),
  }));
  const commonTop = Math.min(...layouts.map((layout) => layout.top));
  const commonBottom = Math.max(...layouts.map((layout) => layout.bottom));
  const commonHeight = commonBottom - commonTop;
  let commonWidth = buildMode === "h"
    ? undefined
    : Math.max(...layouts.map((layout) => layout.widthForAdvance));

  if (buildMode === "8") {
    commonWidth = roundUp(commonWidth ?? 0, 8);
  }

  const targetHeight = buildMode === "8" ? roundUp(commonHeight, 8) : commonHeight;

  return layouts.map(({ glyph, top, widthForAdvance }) => {
    const targetWidth = commonWidth ?? widthForAdvance;
    const topPadding = top - commonTop;
    const bottomPadding = targetHeight - glyph.height - topPadding;
    const rightPadding = Math.max(0, targetWidth - glyph.width);

    return {
      ...glyph,
      width: targetWidth,
      height: targetHeight,
      yOffset: -commonBottom,
      bitmap: [
        ...Array.from({ length: topPadding }, () => "0".repeat(targetWidth)),
        ...glyph.bitmap.map((row) => row + "0".repeat(rightPadding)),
        ...Array.from({ length: bottomPadding }, () => "0".repeat(targetWidth)),
      ],
    };
  });
}

function measureFont(glyphs: BitmapGlyph[], fallbackFont: BitmapFont) {
  if (glyphs.length === 0) {
    return {
      lineHeight: fallbackFont.lineHeight,
      ascent: fallbackFont.ascent,
      descent: fallbackFont.descent,
      boundingBox: fallbackFont.boundingBox,
    };
  }

  const top = Math.min(...glyphs.map((glyph) => -glyph.height - glyph.yOffset));
  const bottom = Math.max(...glyphs.map((glyph) => -glyph.yOffset));
  const left = Math.min(...glyphs.map((glyph) => glyph.xOffset));
  const right = Math.max(...glyphs.map((glyph) => glyph.xOffset + glyph.width));

  return {
    lineHeight: bottom - top,
    ascent: -top,
    descent: bottom,
    boundingBox: {
      width: right - left,
      height: bottom - top,
      xOffset: left,
      yOffset: -bottom,
    },
  };
}

function parseNumber(value: string): number {
  const normalized = value.trim();
  return normalized.startsWith("$") ? Number.parseInt(normalized.slice(1), 16) : Number.parseInt(normalized, 10);
}

function roundUp(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}
