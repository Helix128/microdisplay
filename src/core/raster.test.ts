import { describe, expect, it } from "vitest";
import { rasterizeCirclePoints, rasterizeDiscRuns, rasterizeLine, rasterizeLineRuns } from "./raster";

describe("rasterizeLine", () => {
  it("rasterizes a single point", () => {
    expect(rasterizeLine(2, 3, 2, 3)).toEqual([{ x: 2, y: 3 }]);
  });

  it("rasterizes a horizontal line", () => {
    expect(rasterizeLine(1, 2, 4, 2)).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]);
  });

  it("rasterizes a vertical line", () => {
    expect(rasterizeLine(3, 1, 3, 4)).toEqual([
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
    ]);
  });

  it("rasterizes a 45 degree diagonal line", () => {
    expect(rasterizeLine(0, 0, 3, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });

  it("rasterizes a shallow line", () => {
    expect(rasterizeLine(0, 0, 2, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ]);
  });

  it("rasterizes a steep line", () => {
    expect(rasterizeLine(0, 0, 1, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ]);
  });

  it("rasterizes with inverted coordinates", () => {
    expect(rasterizeLine(4, 4, 1, 2)).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
  });

  it("normalizes reverse direction", () => {
    expect(rasterizeLine(3, 3, 0, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });
});

describe("rasterizeCirclePoints", () => {
  it("rasterizes radius 0 as the center pixel", () => {
    expect(rasterizeCirclePoints(10, 10, 0)).toEqual([{ x: 10, y: 10 }]);
  });

  it("rasterizes radius 1 with U8G2 cardinal points", () => {
    expect(rasterizeCirclePoints(10, 10, 1)).toEqual([
      { x: 9, y: 10 },
      { x: 10, y: 9 },
      { x: 10, y: 11 },
      { x: 11, y: 10 },
    ]);
  });

  it("rasterizes radius 2 with U8G2 midpoint circle pixels", () => {
    expect(rasterizeCirclePoints(10, 10, 2)).toEqual([
      { x: 8, y: 9 },
      { x: 8, y: 10 },
      { x: 8, y: 11 },
      { x: 9, y: 8 },
      { x: 9, y: 12 },
      { x: 10, y: 8 },
      { x: 10, y: 12 },
      { x: 11, y: 8 },
      { x: 11, y: 12 },
      { x: 12, y: 9 },
      { x: 12, y: 10 },
      { x: 12, y: 11 },
    ]);
  });
});

describe("rasterizeDiscRuns", () => {
  it("rasterizes radius 0 as one center column", () => {
    expect(rasterizeDiscRuns(10, 10, 0)).toEqual([{ x: 10, y: 10, height: 1 }]);
  });

  it("rasterizes radius 1 with U8G2 vertical runs", () => {
    expect(rasterizeDiscRuns(10, 10, 1)).toEqual([
      { x: 9, y: 10, height: 1 },
      { x: 10, y: 9, height: 3 },
      { x: 11, y: 10, height: 1 },
    ]);
  });

  it("rasterizes radius 2 with U8G2 vertical runs", () => {
    expect(rasterizeDiscRuns(10, 10, 2)).toEqual([
      { x: 8, y: 9, height: 3 },
      { x: 9, y: 8, height: 5 },
      { x: 10, y: 8, height: 5 },
      { x: 11, y: 8, height: 5 },
      { x: 12, y: 9, height: 3 },
    ]);
  });
});

describe("rasterizeLineRuns", () => {
  it("compresses horizontal spans", () => {
    expect(rasterizeLineRuns(0, 0, 5, 2)).toEqual([
      { x: 0, y: 0, width: 2 },
      { x: 2, y: 1, width: 2 },
      { x: 4, y: 2, width: 2 },
    ]);
  });

  it("keeps vertical line as separate runs", () => {
    expect(rasterizeLineRuns(3, 1, 3, 4)).toEqual([
      { x: 3, y: 1, width: 1 },
      { x: 3, y: 2, width: 1 },
      { x: 3, y: 3, width: 1 },
      { x: 3, y: 4, width: 1 },
    ]);
  });

  it("compresses u8g2 shallow spans", () => {
    expect(rasterizeLineRuns(0, 0, 2, 1)).toEqual([
      { x: 0, y: 0, width: 2 },
      { x: 2, y: 1, width: 1 },
    ]);
  });
});
