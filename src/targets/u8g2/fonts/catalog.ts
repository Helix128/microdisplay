import { generatedU8g2FontsCatalog } from "./generated/catalog.generated";

export type U8g2Font = {
  name: string;
  label: string;
  width: number;
  height: number;
  baseline: number;
  recommended: boolean;
  hasBitmapPreview: boolean;
  source: "U8G2";
  license?: string;
};

export const defaultU8g2FontName = "u8g2_font_6x10_tf";

export const u8g2Fonts: U8g2Font[] = generatedU8g2FontsCatalog;

export function getU8g2Font(name: string): U8g2Font {
  return u8g2Fonts.find((font) => font.name === name) ?? u8g2Fonts.find((font) => font.name === defaultU8g2FontName) ?? u8g2Fonts[0]!;
}
