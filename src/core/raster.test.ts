import { describe, expect, it } from "vitest";
import { rasterizeLine, rasterizeLineRuns } from "./raster";

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
