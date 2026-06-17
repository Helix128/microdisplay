export type Screen = {
  id: string;
  name: string;
  elements: DesignElement[];
};

export type DesignElement = RectElement | CircleElement | LineElement | TextElement | ImageElement;

export type RectElement = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
};

export type CircleElement = {
  id: string;
  type: "circle";
  x: number;
  y: number;
  radius: number;
  filled: boolean;
};

export type LineElement = {
  id: string;
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type TextElement = {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  font: string;
};

export type ImageElement = {
  id: string;
  type: "image";
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceMimeType: string;
  sourceData: string;
  sourceWidth: number;
  sourceHeight: number;
  threshold: number;
  brightness: number;
  invert: boolean;
  ditherMode: "threshold" | "ordered" | "floyd-steinberg";
  resizeMode: "free" | "lock-aspect" | "lock-aspect-width" | "lock-aspect-height";
  cropToScreen: boolean;
  bitmapEncoding: "xbm-base64";
  bitmap: string;
};
