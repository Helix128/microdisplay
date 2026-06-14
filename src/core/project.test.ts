import { describe, expect, it } from "vitest";
import {
  addElementToScreen,
  addScreen,
  createProject,
  getActiveScreen,
  removeElementFromScreen,
  setActiveScreen,
} from "./project";

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
});
