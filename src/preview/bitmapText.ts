import type { BitmapFont, BitmapGlyph, BitmapTextMetrics, BitmapTextRun } from "./bitmapFont";

export function rasterizeBitmapText(text: string, font: BitmapFont, x: number, baselineY: number): BitmapTextRun[] {
  const runs: BitmapTextRun[] = [];
  let cursorX = x;

  for (const character of text) {
    const glyph = getRenderableGlyph(font, character);

    if (glyph === null) {
      continue;
    }

    const layout = getGlyphLayout(cursorX, baselineY, glyph);

    for (let rowIndex = 0; rowIndex < glyph.bitmap.length; rowIndex++) {
      const row = glyph.bitmap[rowIndex]!;
      let runStart = -1;

      for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
        const filled = row[columnIndex] === "1";

        if (filled && runStart === -1) {
          runStart = columnIndex;
        }

        const isRunEnd = runStart !== -1 && (!filled || columnIndex === row.length - 1);

        if (!isRunEnd) {
          continue;
        }

        const runEnd = filled && columnIndex === row.length - 1 ? columnIndex + 1 : columnIndex;
        runs.push({
          x: layout.left + runStart,
          y: layout.top + rowIndex,
          width: runEnd - runStart,
        });
        runStart = -1;
      }
    }

    cursorX += glyph.xAdvance;
  }

  return runs;
}

export function measureBitmapText(text: string, font: BitmapFont): BitmapTextMetrics {
  let cursorX = 0;
  let minLeft = 0;
  let maxRight = 0;
  let minTop = -font.ascent;
  let maxBottom = font.descent;

  for (const character of text) {
    const glyph = getRenderableGlyph(font, character);

    if (glyph === null) {
      continue;
    }

    const layout = getGlyphLayout(cursorX, 0, glyph);
    minLeft = Math.min(minLeft, layout.left);
    minTop = Math.min(minTop, layout.top);
    maxRight = Math.max(maxRight, cursorX + glyph.xAdvance, layout.left + glyph.width);
    maxBottom = Math.max(maxBottom, layout.top + glyph.height);
    cursorX += glyph.xAdvance;
  }

  return {
    width: Math.max(1, maxRight - minLeft),
    height: Math.max(1, maxBottom - minTop),
    top: minTop,
    left: minLeft,
  };
}

function getGlyphLayout(cursorX: number, baselineY: number, glyph: BitmapGlyph) {
  return {
    left: cursorX + glyph.xOffset,
    top: baselineY - glyph.height - glyph.yOffset,
  };
}

function getRenderableGlyph(font: BitmapFont, character: string): BitmapGlyph | null {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return null;
  }

  return font.glyphs[String(codePoint)] ?? font.glyphs[String("?".codePointAt(0)!)] ?? null;
}
