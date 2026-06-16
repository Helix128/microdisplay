import { cropBitmap, decodeXbmBase64Bitmap } from "../../core";
import type { DesignElement, DeviceConfig, Project, Screen } from "../../core";

export function generateScreen(screen: Screen): string {
  const context: GenerateContext = { usedBitmapNames: new Set<string>() };
  return screen.elements.map((element) => generateElement(element, context)).join("\n");
}

export function generateProject(project: Project): string {
  const usedNames = new Set<string>();

  return project.screens
    .map((screen) => {
      const functionName = toFunctionName(screen.name, usedNames);
      const context: GenerateContext = { usedBitmapNames: new Set<string>(), device: project.device };
      const body = screen.elements.map((element) => generateElement(element, context)).join("\n");

      if (!body) {
        return `void ${functionName}() {\n}`;
      }

      const indentedBody = body
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");

      return `void ${functionName}() {\n${indentedBody}\n}`;
    })
    .join("\n\n");
}

type GenerateContext = {
  usedBitmapNames: Set<string>;
  device?: DeviceConfig;
};

function generateElement(element: DesignElement, context: GenerateContext): string {
  switch (element.type) {
    case "rect":
      return element.filled
        ? `u8g2.drawBox(${element.x}, ${element.y}, ${element.width}, ${element.height});`
        : `u8g2.drawFrame(${element.x}, ${element.y}, ${element.width}, ${element.height});`;
    case "circle":
      return element.filled
        ? `u8g2.drawDisc(${element.x}, ${element.y}, ${element.radius}, U8G2_DRAW_ALL);`
        : `u8g2.drawCircle(${element.x}, ${element.y}, ${element.radius}, U8G2_DRAW_ALL);`;
    case "line":
      return `u8g2.drawLine(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2});`;
    case "text": {
      const drawFunction = requiresUtf8(element.text) ? "drawUTF8" : "drawStr";

      return [
        `u8g2.setFont(${element.font});`,
        `u8g2.${drawFunction}(${element.x}, ${element.y}, "${escapeCppString(element.text)}");`,
      ].join("\n");
    }
    case "image": {
      const bitmapName = toBitmapName(element.id, context.usedBitmapNames);
      const exportedImage = getExportedImage(element, context.device);

      if (exportedImage === null) {
        return "";
      }

      return [
        `static const unsigned char ${bitmapName}[] PROGMEM = {`,
        `  ${formatBytes(exportedImage.bytes)}`,
        `};`,
        `u8g2.drawXBMP(${exportedImage.x}, ${exportedImage.y}, ${exportedImage.width}, ${exportedImage.height}, ${bitmapName});`,
      ].join("\n");
    }
  }
}

function requiresUtf8(value: string): boolean {
  return [...value].some((character) => character.codePointAt(0)! >= 128);
}

function escapeCppString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function formatBytes(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => `0x${byte.toString(16).padStart(2, "0")}`)
    .join(", ");
}

function getExportedImage(
  element: Extract<DesignElement, { type: "image" }>,
  device: DeviceConfig | undefined,
): { x: number; y: number; width: number; height: number; bytes: Uint8Array } | null {
  if (!element.cropToScreen || device === undefined) {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      bytes: decodeXbmBase64Bitmap(element.width, element.height, element.bitmap).data,
    };
  }

  const visibleX = Math.max(0, element.x);
  const visibleY = Math.max(0, element.y);
  const visibleRight = Math.min(device.width, element.x + element.width);
  const visibleBottom = Math.min(device.height, element.y + element.height);
  const visibleWidth = visibleRight - visibleX;
  const visibleHeight = visibleBottom - visibleY;

  if (visibleWidth <= 0 || visibleHeight <= 0) {
    return null;
  }

  const bitmap = decodeXbmBase64Bitmap(element.width, element.height, element.bitmap);
  const cropped = cropBitmap(bitmap, visibleX - element.x, visibleY - element.y, visibleWidth, visibleHeight);

  return {
    x: visibleX,
    y: visibleY,
    width: visibleWidth,
    height: visibleHeight,
    bytes: cropped.data,
  };
}

function toBitmapName(id: string, usedNames: Set<string>): string {
  const safeId = id.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^([0-9])/, "_$1") || "image";
  const base = `image_${safeId}`;
  let candidate = base;
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix++;
  }

  usedNames.add(candidate);
  return candidate;
}

function toFunctionName(name: string, usedNames: Set<string>): string {
  const base =
    name
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((part) => part[0]!.toUpperCase() + part.slice(1))
      .join("") || "Screen";

  const safeBase = /^[0-9]/.test(base) ? `Screen${base}` : base;

  let candidate = `draw${safeBase}`;
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `draw${safeBase}${suffix}`;
    suffix++;
  }

  usedNames.add(candidate);
  return candidate;
}
