import type { DesignElement, LineElement, RectElement, Screen } from "./design";
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

  if (value.type === "line") {
    return parseLineElement(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
