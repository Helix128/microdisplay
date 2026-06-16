import { describe, expect, it } from "vitest";
import {
  bitmapToRuns,
  cropBitmap,
  decodeBitmapBase64,
  encodeBitmapBase64,
  getPackedBitmapByteLength,
  getXbmBit,
  setXbmBit,
} from "./imageBitmap";

describe("imageBitmap", () => {
  it("packs XBM bits LSB-first", () => {
    const data = new Uint8Array(1);

    setXbmBit(data, 8, 0, 0, true);
    setXbmBit(data, 8, 3, 0, true);
    setXbmBit(data, 8, 7, 0, true);

    expect(data[0]).toBe(0b10001001);
    expect(getXbmBit(data, 8, 0, 0)).toBe(true);
    expect(getXbmBit(data, 8, 1, 0)).toBe(false);
    expect(getXbmBit(data, 8, 3, 0)).toBe(true);
    expect(getXbmBit(data, 8, 7, 0)).toBe(true);
  });

  it("handles widths that are not multiples of 8", () => {
    const data = new Uint8Array(getPackedBitmapByteLength(9, 2));

    setXbmBit(data, 9, 8, 1, true);

    expect(data).toEqual(new Uint8Array([0, 0, 0, 1]));
    expect(getXbmBit(data, 9, 8, 1)).toBe(true);
  });

  it("roundtrips base64 encoded bytes", () => {
    const data = new Uint8Array([0x00, 0x3c, 0xff]);

    expect(decodeBitmapBase64(encodeBitmapBase64(data))).toEqual(data);
  });

  it("crops bitmaps", () => {
    const data = new Uint8Array(getPackedBitmapByteLength(4, 2));
    setXbmBit(data, 4, 1, 0, true);
    setXbmBit(data, 4, 2, 0, true);
    setXbmBit(data, 4, 2, 1, true);

    const cropped = cropBitmap({ width: 4, height: 2, data }, 1, 0, 2, 2);

    expect(getXbmBit(cropped.data, cropped.width, 0, 0)).toBe(true);
    expect(getXbmBit(cropped.data, cropped.width, 1, 0)).toBe(true);
    expect(getXbmBit(cropped.data, cropped.width, 0, 1)).toBe(false);
    expect(getXbmBit(cropped.data, cropped.width, 1, 1)).toBe(true);
  });

  it("converts enabled pixels to horizontal runs", () => {
    const data = new Uint8Array(getPackedBitmapByteLength(8, 2));
    setXbmBit(data, 8, 1, 0, true);
    setXbmBit(data, 8, 2, 0, true);
    setXbmBit(data, 8, 5, 0, true);
    setXbmBit(data, 8, 0, 1, true);

    expect(bitmapToRuns({ width: 8, height: 2, data }, 10, 20)).toEqual([
      { x: 11, y: 20, width: 2 },
      { x: 15, y: 20, width: 1 },
      { x: 10, y: 21, width: 1 },
    ]);
  });
});
