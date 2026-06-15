export type Screen = {
  id: string;
  name: string;
  elements: DesignElement[];
};

export type DesignElement = RectElement | LineElement | TextElement;

export type RectElement = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
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
