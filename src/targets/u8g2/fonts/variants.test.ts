import { describe, expect, it } from "vitest";
import {
  getCharsetLabel,
  getPurposeLabel,
  getU8g2FontFamilies,
  getU8g2FontVariant,
  parseU8g2FontVariant,
  resolveU8g2FontVariant,
} from "./variants";

describe("parseU8g2FontVariant", () => {
  it("parses standard U8G2 font ids", () => {
    expect(parseU8g2FontVariant("u8g2_font_6x10_tf")).toEqual({
      id: "u8g2_font_6x10_tf",
      family: "6x10",
      purpose: "t",
      charset: "f",
    });
  });

  it("parses custom charset suffixes", () => {
    expect(parseU8g2FontVariant("u8g2_font_10x20_t_greek")).toEqual({
      id: "u8g2_font_10x20_t_greek",
      family: "10x20",
      purpose: "t",
      charset: "_greek",
    });
  });
});

describe("font families", () => {
  it("groups variants by family", () => {
    const family = getU8g2FontFamilies().find((family) => family.family === "6x10");

    expect(family?.purposes).toContain("t");
    expect(family?.purposes).toContain("m");
    expect(family?.charsets).toContain("f");
    expect(family?.charsets).toContain("r");
    expect(family?.charsets).toContain("n");
  });

  it("returns default variant for invalid ids", () => {
    expect(getU8g2FontVariant("missing").id).toBe("u8g2_font_6x10_tf");
  });
});

describe("resolveU8g2FontVariant", () => {
  it("switches purpose inside the same family", () => {
    expect(resolveU8g2FontVariant({ currentFont: "u8g2_font_6x10_tf", purpose: "m" })).toBe(
      "u8g2_font_6x10_mf",
    );
  });

  it("switches charset inside the same family", () => {
    expect(resolveU8g2FontVariant({ currentFont: "u8g2_font_6x10_tf", charset: "n" })).toBe(
      "u8g2_font_6x10_tn",
    );
  });

  it("falls back to available variant when exact purpose and charset does not exist", () => {
    expect(resolveU8g2FontVariant({ currentFont: "u8g2_font_m2icon_5_tf", purpose: "m" })).toBe(
      "u8g2_font_m2icon_5_tf",
    );
  });
});

describe("labels", () => {
  it("labels purpose and charset values", () => {
    expect(getPurposeLabel("m")).toBe("Monospace");
    expect(getCharsetLabel("n")).toBe("Números/fecha/hora");
    expect(getCharsetLabel("_japanese1")).toBe("Japanese1");
  });
});
