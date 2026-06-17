import { cropBitmap, decodeXbmBase64Bitmap } from "../../core";
import type { DesignElement, DeviceConfig, Project, Screen } from "../../core";

export type ExportConfig = {
  instanceName: string;
};

export const defaultExportConfig: ExportConfig = {
  instanceName: "u8g2",
};

export function generateScreen(screen: Screen, config: ExportConfig = defaultExportConfig): string {
  const context: GenerateContext = { usedBitmapNames: new Set<string>(), instanceName: config.instanceName };
  return screen.elements.map((element) => generateElement(element, context)).join("\n");
}

export function generateScreenFunction(screen: Screen, project: Project, config: ExportConfig = defaultExportConfig): string {
  const functionName = toFunctionName(screen.name, new Set<string>());
  const context: GenerateContext = { usedBitmapNames: new Set<string>(), device: project.device, instanceName: config.instanceName };
  const body = screen.elements.map((element) => generateElement(element, context)).join("\n");

  if (!body) {
    return `void ${functionName}() {\n}`;
  }

  const indentedBody = body
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

  return `void ${functionName}() {\n${indentedBody}\n}`;
}

export function generateProject(project: Project, config: ExportConfig = defaultExportConfig): string {
  const usedNames = new Set<string>();

  return project.screens
    .map((screen) => {
      const functionName = toFunctionName(screen.name, usedNames);
      const context: GenerateContext = { usedBitmapNames: new Set<string>(), device: project.device, instanceName: config.instanceName };
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
  instanceName: string;
};

function generateElement(element: DesignElement, context: GenerateContext): string {
  const obj = context.instanceName;
  switch (element.type) {
    case "rect":
      return element.filled
        ? `${obj}.drawBox(${element.x}, ${element.y}, ${element.width}, ${element.height});`
        : `${obj}.drawFrame(${element.x}, ${element.y}, ${element.width}, ${element.height});`;
    case "circle":
      return element.filled
        ? `${obj}.drawDisc(${element.x}, ${element.y}, ${element.radius}, U8G2_DRAW_ALL);`
        : `${obj}.drawCircle(${element.x}, ${element.y}, ${element.radius}, U8G2_DRAW_ALL);`;
    case "line":
      return `${obj}.drawLine(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2});`;
    case "text": {
      const drawFunction = requiresUtf8(element.text) ? "drawUTF8" : "drawStr";

      return [
        `${obj}.setFont(${element.font});`,
        `${obj}.${drawFunction}(${element.x}, ${element.y}, "${escapeCppString(element.text)}");`,
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
        `${obj}.drawXBMP(${exportedImage.x}, ${exportedImage.y}, ${exportedImage.width}, ${exportedImage.height}, ${bitmapName});`,
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
