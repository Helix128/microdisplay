import { describe, expect, it } from "vitest";
import type { Project, Screen } from "../../core";
import { generateProject, generateScreen } from "./index";

const emptyScreen: Screen = {
  id: "screen-1",
  name: "Empty",
  elements: [],
};

const screenWithRect: Screen = {
  id: "screen-1",
  name: "Main Screen",
  elements: [
    {
      id: "rect-1",
      type: "rect",
      x: 0,
      y: 1,
      width: 10,
      height: 20,
      filled: false,
    },
  ],
};

const screenWithFilledRect: Screen = {
  id: "screen-1",
  name: "Main Screen",
  elements: [
    {
      id: "rect-1",
      type: "rect",
      x: 2,
      y: 3,
      width: 30,
      height: 40,
      filled: true,
    },
  ],
};

const screenWithLine: Screen = {
  id: "screen-1",
  name: "Main Screen",
  elements: [
    {
      id: "line-1",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 127,
      y2: 63,
    },
  ],
};

const screenWithCircle: Screen = {
  id: "screen-1",
  name: "Main Screen",
  elements: [
    {
      id: "circle-1",
      type: "circle",
      x: 20,
      y: 21,
      radius: 8,
      filled: false,
    },
  ],
};

const screenWithFilledCircle: Screen = {
  id: "screen-1",
  name: "Main Screen",
  elements: [
    {
      id: "circle-1",
      type: "circle",
      x: 40,
      y: 22,
      radius: 9,
      filled: true,
    },
  ],
};

const screenWithText: Screen = {
  id: "screen-1",
  name: "Main Screen",
  elements: [
    {
      id: "text-1",
      type: "text",
      x: 4,
      y: 12,
      text: "Hello",
      font: "u8g2_font_6x10_tf",
    },
  ],
};

describe("generateScreen", () => {
  it("returns empty string for empty screen", () => {
    expect(generateScreen(emptyScreen)).toBe("");
  });

  it("generates drawFrame for unfilled rect", () => {
    expect(generateScreen(screenWithRect)).toBe(
      "u8g2.drawFrame(0, 1, 10, 20);",
    );
  });

  it("generates drawBox for filled rect", () => {
    expect(generateScreen(screenWithFilledRect)).toBe(
      "u8g2.drawBox(2, 3, 30, 40);",
    );
  });

  it("generates drawLine for line", () => {
    expect(generateScreen(screenWithLine)).toBe(
      "u8g2.drawLine(0, 0, 127, 63);",
    );
  });

  it("generates drawCircle for unfilled circle", () => {
    expect(generateScreen(screenWithCircle)).toBe(
      "u8g2.drawCircle(20, 21, 8, U8G2_DRAW_ALL);",
    );
  });

  it("generates drawDisc for filled circle", () => {
    expect(generateScreen(screenWithFilledCircle)).toBe(
      "u8g2.drawDisc(40, 22, 9, U8G2_DRAW_ALL);",
    );
  });

  it("generates setFont and drawStr for text", () => {
    expect(generateScreen(screenWithText)).toBe(
      "u8g2.setFont(u8g2_font_6x10_tf);\nu8g2.drawStr(4, 12, \"Hello\");",
    );
  });

  it("uses drawUTF8 for text with non-ASCII characters (unicode codepoints >= 128)", () => {
    const screen1: Screen = {
      id: "screen-1",
      name: "Main Screen",
      elements: [
        {
          id: "text-1",
          type: "text",
          x: 4,
          y: 12,
          text: "Mañana",
          font: "u8g2_font_6x10_tf",
        },
      ],
    };

    expect(generateScreen(screen1)).toBe(
      "u8g2.setFont(u8g2_font_6x10_tf);\nu8g2.drawUTF8(4, 12, \"Mañana\");",
    );

    const screen2: Screen = {
      id: "screen-2",
      name: "Main Screen 2",
      elements: [
        {
          id: "text-2",
          type: "text",
          x: 4,
          y: 12,
          text: "Ω",
          font: "u8g2_font_10x20_t_greek",
        },
      ],
    };

    expect(generateScreen(screen2)).toBe(
      "u8g2.setFont(u8g2_font_10x20_t_greek);\nu8g2.drawUTF8(4, 12, \"Ω\");",
    );
  });

  it("escapes text for C++ strings", () => {
    const screen: Screen = {
      id: "screen-1",
      name: "Main Screen",
      elements: [
        {
          id: "text-1",
          type: "text",
          x: 4,
          y: 12,
          text: 'A "quote" and \\ path',
          font: "u8g2_font_6x10_tf",
        },
      ],
    };

    expect(generateScreen(screen)).toBe(
      'u8g2.setFont(u8g2_font_6x10_tf);\nu8g2.drawStr(4, 12, "A \\"quote\\" and \\\\ path");',
    );
  });

  it("preserves element order", () => {
    const screen: Screen = {
      id: "screen-1",
      name: "Mixed",
      elements: [
        {
          id: "rect-1",
          type: "rect",
          x: 1,
          y: 2,
          width: 3,
          height: 4,
          filled: false,
        },
        {
          id: "line-1",
          type: "line",
          x1: 5,
          y1: 6,
          x2: 7,
          y2: 8,
        },
        {
          id: "circle-1",
          type: "circle",
          x: 11,
          y: 12,
          radius: 4,
          filled: true,
        },
        {
          id: "text-1",
          type: "text",
          x: 9,
          y: 10,
          text: "OK",
          font: "u8g2_font_5x7_tf",
        },
      ],
    };

    expect(generateScreen(screen)).toBe(
      "u8g2.drawFrame(1, 2, 3, 4);\nu8g2.drawLine(5, 6, 7, 8);\nu8g2.drawDisc(11, 12, 4, U8G2_DRAW_ALL);\nu8g2.setFont(u8g2_font_5x7_tf);\nu8g2.drawStr(9, 10, \"OK\");",
    );
  });
});

describe("generateProject", () => {
  it("generates a function per screen", () => {
    const project: Project = {
      schemaVersion: 1,
      name: "Demo",
      device: { width: 128, height: 64 },
      screens: [
        {
          id: "screen-1",
          name: "Main Screen",
          elements: [
            {
              id: "rect-1",
              type: "rect",
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              filled: false,
            },
          ],
        },
      ],
      activeScreenId: "screen-1",
    };

    expect(generateProject(project)).toBe(
      "void drawMainScreen() {\n  u8g2.drawFrame(0, 0, 10, 10);\n}",
    );
  });

  it("generates multiple functions", () => {
    const project: Project = {
      schemaVersion: 1,
      name: "Demo",
      device: { width: 128, height: 64 },
      screens: [
        {
          id: "screen-1",
          name: "Main Screen",
          elements: [
            {
              id: "rect-1",
              type: "rect",
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              filled: false,
            },
          ],
        },
        {
          id: "screen-2",
          name: "Settings",
          elements: [
            {
              id: "line-1",
              type: "line",
              x1: 1,
              y1: 2,
              x2: 3,
              y2: 4,
            },
          ],
        },
      ],
      activeScreenId: "screen-1",
    };

    expect(generateProject(project)).toBe(
      [
        "void drawMainScreen() {",
        "  u8g2.drawFrame(0, 0, 10, 10);",
        "}",
        "",
        "void drawSettings() {",
        "  u8g2.drawLine(1, 2, 3, 4);",
        "}",
      ].join("\n"),
    );
  });

  it("sanitizes screen names into function names", () => {
    const project: Project = {
      schemaVersion: 1,
      name: "Demo",
      device: { width: 128, height: 64 },
      screens: [
        { id: "screen-1", name: "main screen", elements: [] },
        { id: "screen-2", name: "123", elements: [] },
        { id: "screen-3", name: "!!!", elements: [] },
      ],
      activeScreenId: "screen-1",
    };

    expect(generateProject(project)).toBe(
      [
        "void drawMainScreen() {",
        "}",
        "",
        "void drawScreen123() {",
        "}",
        "",
        "void drawScreen() {",
        "}",
      ].join("\n"),
    );
  });

  it("resolves collisions after sanitization", () => {
    const project: Project = {
      schemaVersion: 1,
      name: "Demo",
      device: { width: 128, height: 64 },
      screens: [
        { id: "screen-1", name: "main", elements: [] },
        { id: "screen-2", name: "main!", elements: [] },
      ],
      activeScreenId: "screen-1",
    };

    expect(generateProject(project)).toBe(
      [
        "void drawMain() {",
        "}",
        "",
        "void drawMain2() {",
        "}",
      ].join("\n"),
    );
  });
});
