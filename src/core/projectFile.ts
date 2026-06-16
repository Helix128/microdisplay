import { decodeBitmapBase64, getPackedBitmapByteLength } from "./imageBitmap";
import { isResizeMode, normalizeDitherMode } from "./imageProcessing";
import type { CircleElement, DesignElement, ImageElement, LineElement, RectElement, Screen, TextElement } from "./design";
import type { Project } from "./project";

export type ProjectParseResult =
  | { ok: true; project: Project }
  | { ok: false; error: string };

export function parseProjectJson(json: string): ProjectParseResult {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: "El archivo no contiene JSON válido." };
  }

  return parseProject(value);
}

export function parseProject(value: unknown): ProjectParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: "El proyecto debe ser un objeto." };
  }

  if (value.schemaVersion !== 1) {
    return { ok: false, error: "Versión de proyecto no soportada." };
  }

  if (typeof value.name !== "string") {
    return { ok: false, error: "El proyecto no tiene nombre válido." };
  }

  if (!isRecord(value.device)) {
    return { ok: false, error: "El proyecto no tiene dispositivo válido." };
  }

  if (!isValidNumber(value.device.width) || !isValidNumber(value.device.height)) {
    return { ok: false, error: "El dispositivo tiene dimensiones inválidas." };
  }

  if (!Array.isArray(value.screens) || value.screens.length === 0) {
    return { ok: false, error: "El proyecto debe tener al menos una pantalla." };
  }

  const screens: Screen[] = [];

  for (const screen of value.screens) {
    const parsedScreen = parseScreen(screen);

    if (parsedScreen === null) {
      return { ok: false, error: "El proyecto contiene una pantalla inválida." };
    }

    screens.push(parsedScreen);
  }

  if (typeof value.activeScreenId !== "string") {
    return { ok: false, error: "El proyecto no tiene pantalla activa válida." };
  }

  if (!screens.some((screen) => screen.id === value.activeScreenId)) {
    return { ok: false, error: "La pantalla activa no existe." };
  }

  return {
    ok: true,
    project: {
      schemaVersion: 1,
      name: value.name,
      device: {
        width: value.device.width,
        height: value.device.height,
      },
      screens,
      activeScreenId: value.activeScreenId,
    },
  };
}

function parseScreen(value: unknown): Screen | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  if (!Array.isArray(value.elements)) {
    return null;
  }

  const elements: DesignElement[] = [];

  for (const element of value.elements) {
    const parsedElement = parseElement(element);

    if (parsedElement === null) {
      return null;
    }

    elements.push(parsedElement);
  }

  return {
    id: value.id,
    name: value.name,
    elements,
  };
}

function parseElement(value: unknown): DesignElement | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.type === "rect") {
    return parseRectElement(value);
  }

  if (value.type === "circle") {
    return parseCircleElement(value);
  }

  if (value.type === "line") {
    return parseLineElement(value);
  }

  if (value.type === "text") {
    return parseTextElement(value);
  }

  if (value.type === "image") {
    return parseImageElement(value);
  }

  return null;
}

function parseRectElement(value: Record<string, unknown>): RectElement | null {
  if (
    typeof value.id !== "string" ||
    !isValidNumber(value.x) ||
    !isValidNumber(value.y) ||
    !isValidNumber(value.width) ||
    !isValidNumber(value.height) ||
    typeof value.filled !== "boolean"
  ) {
    return null;
  }

  return {
    id: value.id,
    type: "rect",
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    filled: value.filled,
  };
}

function parseCircleElement(value: Record<string, unknown>): CircleElement | null {
  if (
    typeof value.id !== "string" ||
    !isValidNumber(value.x) ||
    !isValidNumber(value.y) ||
    !isValidNumber(value.radius) ||
    typeof value.filled !== "boolean"
  ) {
    return null;
  }

  return {
    id: value.id,
    type: "circle",
    x: value.x,
    y: value.y,
    radius: value.radius,
    filled: value.filled,
  };
}

function parseLineElement(value: Record<string, unknown>): LineElement | null {
  if (
    typeof value.id !== "string" ||
    !isValidNumber(value.x1) ||
    !isValidNumber(value.y1) ||
    !isValidNumber(value.x2) ||
    !isValidNumber(value.y2)
  ) {
    return null;
  }

  return {
    id: value.id,
    type: "line",
    x1: value.x1,
    y1: value.y1,
    x2: value.x2,
    y2: value.y2,
  };
}

function parseTextElement(value: Record<string, unknown>): TextElement | null {
  if (
    typeof value.id !== "string" ||
    !isValidNumber(value.x) ||
    !isValidNumber(value.y) ||
    typeof value.text !== "string" ||
    typeof value.font !== "string" ||
    !isValidFontName(value.font)
  ) {
    return null;
  }

  return {
    id: value.id,
    type: "text",
    x: value.x,
    y: value.y,
    text: value.text,
    font: value.font,
  };
}

function parseImageElement(value: Record<string, unknown>): ImageElement | null {
  if (
    typeof value.id !== "string" ||
    !isValidNumber(value.x) ||
    !isValidNumber(value.y) ||
    !isValidPositiveInteger(value.width) ||
    !isValidPositiveInteger(value.height) ||
    typeof value.sourceMimeType !== "string" ||
    typeof value.sourceData !== "string" ||
    !isValidPositiveInteger(value.sourceWidth) ||
    !isValidPositiveInteger(value.sourceHeight) ||
    !isValidByte(value.threshold) ||
    (value.brightness !== undefined && !isValidBrightness(value.brightness)) ||
    typeof value.invert !== "boolean" ||
    typeof value.ditherMode !== "string" ||
    normalizeDitherMode(value.ditherMode) === null ||
    typeof value.resizeMode !== "string" ||
    !isResizeMode(value.resizeMode) ||
    (value.cropToScreen !== undefined && typeof value.cropToScreen !== "boolean") ||
    value.bitmapEncoding !== "xbm-base64" ||
    typeof value.bitmap !== "string"
  ) {
    return null;
  }

  try {
    if (decodeBitmapBase64(value.bitmap).length !== getPackedBitmapByteLength(value.width, value.height)) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    id: value.id,
    type: "image",
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    sourceMimeType: value.sourceMimeType,
    sourceData: value.sourceData,
    sourceWidth: value.sourceWidth,
    sourceHeight: value.sourceHeight,
    threshold: value.threshold,
    brightness: value.brightness ?? 0,
    invert: value.invert,
    ditherMode: normalizeDitherMode(value.ditherMode)!,
    resizeMode: value.resizeMode,
    cropToScreen: value.cropToScreen ?? false,
    bitmapEncoding: "xbm-base64",
    bitmap: value.bitmap,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isValidByte(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 255;
}

function isValidBrightness(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= -128 && value <= 128;
}

function isValidFontName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}
