import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { loadGeneratedU8g2Font } from "./loader";
import fs from "fs";
import path from "path";

// Simular fetch global para cargar las fuentes desde el sistema de archivos durante los tests
const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith("/fonts/sources/")) {
      const filename = url.replace("/fonts/sources/", "");
      const filePath = path.resolve(__dirname, "../../../../public/fonts/sources", filename);
      try {
        const content = fs.readFileSync(filePath, "utf8");
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(content)),
        } as Response);
      } catch (error) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response);
      }
    }
    return originalFetch(url);
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe("loadGeneratedU8g2Font", () => {
  it("loads generated 5x7 font", async () => {
    const font = await loadGeneratedU8g2Font("u8g2_font_5x7_tf");

    expect(font?.name).toBe("u8g2_font_5x7_tf");
    expect(font?.glyphs["65"]?.bitmap).toEqual([
      "01100",
      "10010",
      "10010",
      "11110",
      "10010",
      "10010",
      "00000",
    ]);
  });

  it("loads generated 6x10 font", async () => {
    const font = await loadGeneratedU8g2Font("u8g2_font_6x10_tf");

    expect(font?.name).toBe("u8g2_font_6x10_tf");
    expect(font?.lineHeight).toBe(10);
  });

  it("loads generated 7x13 font from all-font extraction", async () => {
    const font = await loadGeneratedU8g2Font("u8g2_font_7x13_tf");

    expect(font?.name).toBe("u8g2_font_7x13_tf");
    expect(font?.glyphs["65"]).toBeDefined();
  });

  it("returns null for unsupported font", async () => {
    await expect(loadGeneratedU8g2Font("u8g2_font_missing_tf")).resolves.toBeNull();
  });
});
