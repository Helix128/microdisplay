import { describe, expect, it } from "vitest";
import type { BitmapFont } from "./bitmapFont";
import { measureBitmapText, rasterizeBitmapText } from "./bitmapText";

const fakeFont: BitmapFont = {
  name: "fake",
  lineHeight: 4,
  ascent: 3,
  descent: 1,
  boundingBox: {
    width: 3,
    height: 4,
    xOffset: 0,
    yOffset: -1,
  },
  glyphs: {
    "32": {
      codePoint: 32,
      width: 3,
      height: 4,
      xOffset: 0,
      yOffset: -1,
      xAdvance: 2,
      bitmap: ["000", "000", "000", "000"],
    },
    "63": {
      codePoint: 63,
      width: 3,
      height: 4,
      xOffset: 0,
      yOffset: -1,
      xAdvance: 3,
      bitmap: ["111", "001", "000", "001"],
    },
    "65": {
      codePoint: 65,
      width: 3,
      height: 4,
      xOffset: 0,
      yOffset: -1,
      xAdvance: 4,
      bitmap: ["010", "101", "111", "101"],
    },
  },
};

const offsetFont: BitmapFont = {
  ...fakeFont,
  glyphs: {
    ...fakeFont.glyphs,
    "65": {
      ...fakeFont.glyphs["65"]!,
      xOffset: -1,
    },
  },
};

describe("measureBitmapText", () => {
  it("measures width and baseline bounds", () => {
    expect(measureBitmapText("A A", fakeFont)).toEqual({
      width: 10,
      height: 4,
      top: -3,
      left: 0,
    });
  });

  it("includes negative horizontal glyph offsets in bounds", () => {
    expect(measureBitmapText("A", offsetFont)).toEqual({
      width: 5,
      height: 4,
      top: -3,
      left: -1,
    });
  });
});

describe("rasterizeBitmapText", () => {
  it("rasterizes bitmap glyphs into horizontal runs", () => {
    expect(rasterizeBitmapText("A", fakeFont, 10, 20)).toEqual([
      { x: 11, y: 17, width: 1 },
      { x: 10, y: 18, width: 1 },
      { x: 12, y: 18, width: 1 },
      { x: 10, y: 19, width: 3 },
      { x: 10, y: 20, width: 1 },
      { x: 12, y: 20, width: 1 },
    ]);
  });

  it("places bottom row on the baseline when glyph descends one pixel", () => {
    const runs = rasterizeBitmapText("A", fakeFont, 10, 20);
    const lastRun = runs[runs.length - 1];

    expect(lastRun?.y).toBe(20);
  });

  it("falls back to question mark for unsupported glyphs", () => {
    expect(rasterizeBitmapText("~🙂", fakeFont, 0, 5)).toEqual([
      { x: 0, y: 2, width: 3 },
      { x: 2, y: 3, width: 1 },
      { x: 2, y: 5, width: 1 },
      { x: 3, y: 2, width: 3 },
      { x: 5, y: 3, width: 1 },
      { x: 5, y: 5, width: 1 },
    ]);
  });
});
