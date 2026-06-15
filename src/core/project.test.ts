import { describe, expect, it } from "vitest";
import {
  addElementToScreen,
  addScreen,
  createProject,
  getActiveScreen,
  removeElementFromScreen,
  setActiveScreen,
  updateElementInScreen,
} from "./project";
import { parseProjectJson } from "./projectFile";

describe("createProject", () => {
  it("creates a default project", () => {
    const project = createProject();

    expect(project).toEqual({
      schemaVersion: 1,
      name: "Untitled",
      device: {
        width: 128,
        height: 64,
      },
      screens: [
        {
          id: "screen-1",
          name: "Screen 1",
          elements: [],
        },
      ],
      activeScreenId: "screen-1",
    });
  });

  it("respects provided options", () => {
    const project = createProject({
      name: "Demo",
      width: 96,
      height: 32,
    });

    expect(project.name).toBe("Demo");
    expect(project.device).toEqual({ width: 96, height: 32 });
    expect(project.screens).toHaveLength(1);
    expect(project.screens[0]).toEqual({
      id: "screen-1",
      name: "Screen 1",
      elements: [],
    });
    expect(project.activeScreenId).toBe("screen-1");
  });

  it("uses a provided screen id", () => {
    const project = createProject({ screenId: "screen-abc" });

    expect(project.screens[0]?.id).toBe("screen-abc");
    expect(project.activeScreenId).toBe("screen-abc");
  });
});

describe("project helpers", () => {
  it("gets the active screen", () => {
    const project = createProject();

    expect(getActiveScreen(project)).toEqual({
      id: "screen-1",
      name: "Screen 1",
      elements: [],
    });
  });

  it("adds a screen without mutating the original project", () => {
    const project = createProject();
    const nextProject = addScreen(project, {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });

    expect(project.screens).toHaveLength(1);
    expect(nextProject.screens).toEqual([
      {
        id: "screen-1",
        name: "Screen 1",
        elements: [],
      },
      {
        id: "screen-2",
        name: "Settings",
        elements: [],
      },
    ]);
    expect(nextProject.activeScreenId).toBe("screen-1");
  });

  it("sets the active screen", () => {
    const project = addScreen(createProject(), {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });
    const nextProject = setActiveScreen(project, "screen-2");

    expect(project.activeScreenId).toBe("screen-1");
    expect(nextProject.activeScreenId).toBe("screen-2");
    expect(getActiveScreen(nextProject).name).toBe("Settings");
  });

  it("adds an element to a specific screen", () => {
    const project = addScreen(createProject(), {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });
    const nextProject = addElementToScreen(project, "screen-2", {
      id: "rect-1",
      type: "rect",
      x: 0,
      y: 0,
      width: 128,
      height: 64,
      filled: false,
    });

    expect(project.screens[1]?.elements).toEqual([]);
    expect(nextProject.screens[0]?.elements).toEqual([]);
    expect(nextProject.screens[1]?.elements).toEqual([
      {
        id: "rect-1",
        type: "rect",
        x: 0,
        y: 0,
        width: 128,
        height: 64,
        filled: false,
      },
    ]);
  });

  it("adds line elements", () => {
    const project = addElementToScreen(createProject(), "screen-1", {
      id: "line-1",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 127,
      y2: 63,
    });

    expect(project.screens[0]?.elements).toEqual([
      {
        id: "line-1",
        type: "line",
        x1: 0,
        y1: 0,
        x2: 127,
        y2: 63,
      },
    ]);
  });

  it("removes an element from a specific screen without mutating the original project", () => {
    const project = addScreen(
      addElementToScreen(
        addElementToScreen(createProject(), "screen-1", {
          id: "rect-1",
          type: "rect",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          filled: false,
        }),
        "screen-1",
        {
          id: "line-1",
          type: "line",
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 10,
        },
      ),
      {
        id: "screen-2",
        name: "Settings",
        elements: [
          {
            id: "rect-2",
            type: "rect",
            x: 1,
            y: 1,
            width: 5,
            height: 5,
            filled: true,
          },
        ],
      },
    );

    const nextProject = removeElementFromScreen(project, "screen-1", "rect-1");

    expect(project.screens[0]?.elements).toHaveLength(2);
    expect(nextProject.screens[0]?.elements).toEqual([
      {
        id: "line-1",
        type: "line",
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
      },
    ]);
    expect(nextProject.screens[1]?.elements).toEqual(project.screens[1]?.elements);
  });

  it("updates an element in a specific screen without mutating the original project", () => {
    const project = addScreen(
      addElementToScreen(createProject(), "screen-1", {
        id: "rect-1",
        type: "rect",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        filled: false,
      }),
      {
        id: "screen-2",
        name: "Settings",
        elements: [
          {
            id: "rect-1",
            type: "rect",
            x: 1,
            y: 1,
            width: 5,
            height: 5,
            filled: true,
          },
        ],
      },
    );

    const nextProject = updateElementInScreen(project, "screen-1", {
      id: "rect-1",
      type: "rect",
      x: 4,
      y: 5,
      width: 20,
      height: 30,
      filled: true,
    });

    expect(project.screens[0]?.elements[0]).toEqual({
      id: "rect-1",
      type: "rect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      filled: false,
    });
    expect(nextProject.screens[0]?.elements[0]).toEqual({
      id: "rect-1",
      type: "rect",
      x: 4,
      y: 5,
      width: 20,
      height: 30,
      filled: true,
    });
    expect(nextProject.screens[1]?.elements).toEqual(project.screens[1]?.elements);
  });
});

describe("parseProjectJson", () => {
  it("loads a valid project", () => {
    const project = addElementToScreen(createProject({ name: "Demo" }), "screen-1", {
      id: "line-1",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 127,
      y2: 63,
    });

    const result = parseProjectJson(JSON.stringify(project));

    expect(result).toEqual({ ok: true, project });
  });

  it("loads text elements", () => {
    const project = addElementToScreen(createProject({ name: "Demo" }), "screen-1", {
      id: "text-1",
      type: "text",
      x: 4,
      y: 12,
      text: "Hello",
      font: "u8g2_font_6x10_tf",
    });

    const result = parseProjectJson(JSON.stringify(project));

    expect(result).toEqual({ ok: true, project });
  });

  it("rejects invalid JSON", () => {
    const result = parseProjectJson("{");

    expect(result.ok).toBe(false);
  });

  it("rejects invalid project shape", () => {
    const result = parseProjectJson(
      JSON.stringify({
        schemaVersion: 1,
        name: "Broken",
        device: { width: 128, height: 64 },
        screens: [],
        activeScreenId: "screen-1",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects invalid elements", () => {
    const project = createProject();

    const result = parseProjectJson(
      JSON.stringify({
        ...project,
        screens: [
          {
            ...project.screens[0],
            elements: [{ id: "text-1", type: "text", text: "Hello" }],
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });
});
