import { describe, expect, it } from "vitest";
import { getXbmBit } from "./imageBitmap";
import { fitSizeWithin, processImageToBitmap, rgbaToMonochromeBitmap, sizeFromHeight, sizeFromWidth } from "./imageProcessing";

describe("imageProcessing", () => {
  it("converts RGBA data to thresholded monochrome bitmap", () => {
    const bitmap = rgbaToMonochromeBitmap(
      {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          0, 0, 0, 255,
          255, 255, 255, 255,
        ]),
      },
      { threshold: 127, invert: false },
    );

    expect(getXbmBit(bitmap.data, bitmap.width, 0, 0)).toBe(true);
    expect(getXbmBit(bitmap.data, bitmap.width, 1, 0)).toBe(false);
  });

  it("supports inverted output", () => {
    const bitmap = rgbaToMonochromeBitmap(
      {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          0, 0, 0, 255,
          255, 255, 255, 255,
        ]),
      },
      { threshold: 127, invert: true },
    );

    expect(getXbmBit(bitmap.data, bitmap.width, 0, 0)).toBe(false);
    expect(getXbmBit(bitmap.data, bitmap.width, 1, 0)).toBe(true);
  });

  it("applies ordered dithering", () => {
    const bitmap = processImageToBitmap(
      {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          127, 127, 127, 255,
          127, 127, 127, 255,
        ]),
      },
      { threshold: 127, invert: false, ditherMode: "ordered" },
    );

    expect(getXbmBit(bitmap.data, bitmap.width, 0, 0)).toBe(false);
    expect(getXbmBit(bitmap.data, bitmap.width, 1, 0)).toBe(true);
  });

  it("applies Floyd-Steinberg dithering with brightness", () => {
    const bitmap = processImageToBitmap(
      {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          128, 128, 128, 255,
          128, 128, 128, 255,
        ]),
      },
      { threshold: 0, brightness: 0, invert: false, ditherMode: "floyd-steinberg" },
    );

    expect(getXbmBit(bitmap.data, bitmap.width, 0, 0)).toBe(false);
    expect(getXbmBit(bitmap.data, bitmap.width, 1, 0)).toBe(true);
  });

  it("fits size inside bounds preserving aspect ratio", () => {
    expect(fitSizeWithin({ width: 500, height: 250 }, { width: 64, height: 32 })).toEqual({
      width: 64,
      height: 32,
    });
    expect(fitSizeWithin({ width: 250, height: 500 }, { width: 64, height: 32 })).toEqual({
      width: 16,
      height: 32,
    });
  });

  it("calculates aspect-ratio sizes from one axis", () => {
    expect(sizeFromWidth({ width: 500, height: 250 }, 64)).toEqual({ width: 64, height: 32 });
    expect(sizeFromHeight({ width: 500, height: 250 }, 16)).toEqual({ width: 32, height: 16 });
  });
});
