export type BitmapGlyph = {
  codePoint: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  xAdvance: number;
  bitmap: string[];
};

export type BitmapFont = {
  name: string;
  lineHeight: number;
  ascent: number;
  descent: number;
  boundingBox: {
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
  };
  glyphs: Record<string, BitmapGlyph>;
};

export type BitmapTextRun = {
  x: number;
  y: number;
  width: number;
};

export type BitmapTextMetrics = {
  width: number;
  height: number;
  top: number;
  left: number;
};
