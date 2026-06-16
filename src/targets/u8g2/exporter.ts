import type { DesignElement, Project, Screen } from "../../core";

export function generateScreen(screen: Screen): string {
  return screen.elements.map(generateElement).join("\n");
}

export function generateProject(project: Project): string {
  const usedNames = new Set<string>();

  return project.screens
    .map((screen) => {
      const functionName = toFunctionName(screen.name, usedNames);
      const body = generateScreen(screen);

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

function generateElement(element: DesignElement): string {
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
