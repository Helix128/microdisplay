import type { DesignElement, Project, Screen } from "../core";

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
    case "line":
      return `u8g2.drawLine(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2});`;
  }
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
