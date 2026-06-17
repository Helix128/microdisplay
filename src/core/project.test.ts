import { describe, expect, it } from "vitest";
import {
  addElementToScreen,
  addScreen,
  bringElementForward,
  bringElementToFront,
  createProject,
  duplicateScreen,
  getActiveScreen,
  getFirstScreen,
  removeElementFromScreen,
  removeScreen,
  renameProject,
  renameScreen,
  reorderScreen,
  sendElementBackward,
  sendElementToBack,
  setActiveScreen,
  setFirstScreenActive,
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

  it("gets the first screen", () => {
    const project = addScreen(createProject(), {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });

    expect(getFirstScreen(project)).toEqual({
      id: "screen-1",
      name: "Screen 1",
      elements: [],
    });
  });

  it("sets the first screen as active", () => {
    const project = setActiveScreen(
      addScreen(createProject(), {
        id: "screen-2",
        name: "Settings",
        elements: [],
      }),
      "screen-2",
    );

    expect(setFirstScreenActive(project).activeScreenId).toBe("screen-1");
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

  it("renames a screen without mutating the original project", () => {
    const project = addScreen(createProject(), {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });

    const nextProject = renameScreen(project, "screen-2", "Menu");

    expect(project.screens[1]?.name).toBe("Settings");
    expect(nextProject.screens[1]?.name).toBe("Menu");
  });

  it("duplicates a screen after the source screen", () => {
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
        elements: [],
      },
    );

    const nextProject = duplicateScreen(project, "screen-1", {
      id: "screen-3",
      name: "Screen 1 copia",
      elements: [
        {
          id: "rect-2",
          type: "rect",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          filled: false,
        },
      ],
    });

    expect(nextProject.screens.map((screen) => screen.id)).toEqual([
      "screen-1",
      "screen-3",
      "screen-2",
    ]);
    expect(nextProject.screens[1]?.elements[0]?.id).toBe("rect-2");
  });

  it("removes a non-active screen without mutating the original project", () => {
    const project = addScreen(createProject(), {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });

    const nextProject = removeScreen(project, "screen-2");

    expect(project.screens).toHaveLength(2);
    expect(nextProject.screens).toHaveLength(1);
    expect(nextProject.activeScreenId).toBe("screen-1");
  });

  it("removes active screen and selects nearest remaining screen", () => {
    const project = setActiveScreen(
      addScreen(
        addScreen(createProject(), {
          id: "screen-2",
          name: "Settings",
          elements: [],
        }),
        {
          id: "screen-3",
          name: "About",
          elements: [],
        },
      ),
      "screen-2",
    );

    const nextProject = removeScreen(project, "screen-2");

    expect(nextProject.screens.map((screen) => screen.id)).toEqual([
      "screen-1",
      "screen-3",
    ]);
    expect(nextProject.activeScreenId).toBe("screen-3");
  });

  it("does not remove the only screen", () => {
    const project = createProject();

    expect(removeScreen(project, "screen-1")).toEqual(project);
  });

  it("reorders a screen to a target index", () => {
    const project = addScreen(
      addScreen(createProject(), {
        id: "screen-2",
        name: "Settings",
        elements: [],
      }),
      {
        id: "screen-3",
        name: "About",
        elements: [],
      },
    );

    const nextProject = reorderScreen(project, "screen-3", 0);

    expect(project.screens.map((screen) => screen.id)).toEqual([
      "screen-1",
      "screen-2",
      "screen-3",
    ]);
    expect(nextProject.screens.map((screen) => screen.id)).toEqual([
      "screen-3",
      "screen-1",
      "screen-2",
    ]);
  });

  it("keeps active screen when reordering", () => {
    const project = setActiveScreen(
      addScreen(
        addScreen(createProject(), {
          id: "screen-2",
          name: "Settings",
          elements: [],
        }),
        {
          id: "screen-3",
          name: "About",
          elements: [],
        },
      ),
      "screen-2",
    );

    const nextProject = reorderScreen(project, "screen-2", 2);

    expect(nextProject.activeScreenId).toBe("screen-2");
    expect(nextProject.screens.map((screen) => screen.id)).toEqual([
      "screen-1",
      "screen-3",
      "screen-2",
    ]);
  });

  it("clamps reorder target index", () => {
    const project = addScreen(createProject(), {
      id: "screen-2",
      name: "Settings",
      elements: [],
    });

    const movedToStart = reorderScreen(project, "screen-2", -10);
    const movedToEnd = reorderScreen(project, "screen-1", 99);

    expect(movedToStart.screens.map((screen) => screen.id)).toEqual(["screen-2", "screen-1"]);
    expect(movedToEnd.screens.map((screen) => screen.id)).toEqual(["screen-2", "screen-1"]);
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

  it("adds circle elements", () => {
    const project = addElementToScreen(createProject(), "screen-1", {
      id: "circle-1",
      type: "circle",
      x: 32,
      y: 24,
      radius: 10,
      filled: false,
    });

    expect(project.screens[0]?.elements).toEqual([
      {
        id: "circle-1",
        type: "circle",
        x: 32,
        y: 24,
        radius: 10,
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

  it("updates circle elements", () => {
    const project = addElementToScreen(createProject(), "screen-1", {
      id: "circle-1",
      type: "circle",
      x: 8,
      y: 9,
      radius: 4,
      filled: false,
    });

    const nextProject = updateElementInScreen(project, "screen-1", {
      id: "circle-1",
      type: "circle",
      x: 20,
      y: 21,
      radius: 12,
      filled: true,
    });

    expect(project.screens[0]?.elements[0]).toEqual({
      id: "circle-1",
      type: "circle",
      x: 8,
      y: 9,
      radius: 4,
      filled: false,
    });
    expect(nextProject.screens[0]?.elements[0]).toEqual({
      id: "circle-1",
      type: "circle",
      x: 20,
      y: 21,
      radius: 12,
      filled: true,
    });
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

  it("loads circle elements", () => {
    const project = addElementToScreen(createProject({ name: "Demo" }), "screen-1", {
      id: "circle-1",
      type: "circle",
      x: 16,
      y: 17,
      radius: 6,
      filled: true,
    });

    const result = parseProjectJson(JSON.stringify(project));

    expect(result).toEqual({ ok: true, project });
  });

  it("loads image elements", () => {
    const project = addElementToScreen(createProject({ name: "Demo" }), "screen-1", {
      id: "image-1",
      type: "image",
      x: 2,
      y: 3,
      width: 8,
      height: 1,
      sourceMimeType: "image/png",
      sourceData: "source",
      sourceWidth: 8,
      sourceHeight: 1,
      threshold: 127,
      brightness: 0,
      invert: false,
      ditherMode: "threshold",
      resizeMode: "lock-aspect",
      cropToScreen: false,
      bitmapEncoding: "xbm-base64",
      bitmap: "AQ==",
    });

    const result = parseProjectJson(JSON.stringify(project));

    expect(result).toEqual({ ok: true, project });
  });

  it("rejects image elements with invalid dither mode", () => {
    const project = createProject();

    const result = parseProjectJson(
      JSON.stringify({
        ...project,
        screens: [
          {
            ...project.screens[0],
            elements: [
              {
                id: "image-1",
                type: "image",
                x: 0,
                y: 0,
                width: 8,
                height: 1,
                sourceMimeType: "image/png",
                sourceData: "source",
                sourceWidth: 8,
                sourceHeight: 1,
                threshold: 127,
                brightness: 0,
                invert: false,
                ditherMode: "unknown",
                resizeMode: "lock-aspect",
                cropToScreen: false,
                bitmapEncoding: "xbm-base64",
                bitmap: "AQ==",
              },
            ],
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects image elements with invalid bitmap length", () => {
    const project = createProject();

    const result = parseProjectJson(
      JSON.stringify({
        ...project,
        screens: [
          {
            ...project.screens[0],
            elements: [
              {
                id: "image-1",
                type: "image",
                x: 0,
                y: 0,
                width: 16,
                height: 1,
                sourceMimeType: "image/png",
                sourceData: "source",
                sourceWidth: 16,
                sourceHeight: 1,
                threshold: 127,
                brightness: 0,
                invert: false,
                ditherMode: "threshold",
                resizeMode: "lock-aspect",
                cropToScreen: false,
                bitmapEncoding: "xbm-base64",
                bitmap: "AQ==",
              },
            ],
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
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

describe("renameProject", () => {
  it("renames a project and keeps other properties intact", () => {
    const project = createProject({ name: "Old Name" });
    const updated = renameProject(project, "New Name");

    expect(updated.name).toBe("New Name");
    expect(updated.device).toEqual(project.device);
    expect(updated.screens).toEqual(project.screens);
    expect(updated.activeScreenId).toBe(project.activeScreenId);
  });

  it("does not mutate the original project", () => {
    const project = createProject({ name: "Old Name" });
    renameProject(project, "New Name");

    expect(project.name).toBe("Old Name");
  });
});

describe("element layer ordering", () => {
  const setupProjectWithElements = () => {
    const project = createProject({ screenId: "screen-1" });
    const el1 = { id: "el-1", type: "rect" as const, x: 0, y: 0, width: 10, height: 10, filled: false };
    const el2 = { id: "el-2", type: "circle" as const, x: 5, y: 5, radius: 3, filled: false };
    const el3 = { id: "el-3", type: "line" as const, x1: 0, y1: 0, x2: 10, y2: 10 };
    
    let updated = addElementToScreen(project, "screen-1", el1);
    updated = addElementToScreen(updated, "screen-1", el2);
    updated = addElementToScreen(updated, "screen-1", el3);
    return { project: updated, el1, el2, el3 };
  };

  describe("bringElementToFront", () => {
    it("moves element to the end of the elements array", () => {
      const { project } = setupProjectWithElements();
      const updated = bringElementToFront(project, "screen-1", "el-1");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-2", "el-3", "el-1"]);
    });

    it("does nothing if element is already at the front", () => {
      const { project } = setupProjectWithElements();
      const updated = bringElementToFront(project, "screen-1", "el-3");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });

    it("does nothing if element does not exist", () => {
      const { project } = setupProjectWithElements();
      const updated = bringElementToFront(project, "screen-1", "el-nonexistent");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });

    it("does not mutate the original project", () => {
      const { project } = setupProjectWithElements();
      bringElementToFront(project, "screen-1", "el-1");
      const elements = project.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });
  });

  describe("sendElementToBack", () => {
    it("moves element to the beginning of the elements array", () => {
      const { project } = setupProjectWithElements();
      const updated = sendElementToBack(project, "screen-1", "el-3");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-3", "el-1", "el-2"]);
    });

    it("does nothing if element is already at the back", () => {
      const { project } = setupProjectWithElements();
      const updated = sendElementToBack(project, "screen-1", "el-1");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });

    it("does not mutate the original project", () => {
      const { project } = setupProjectWithElements();
      sendElementToBack(project, "screen-1", "el-3");
      const elements = project.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });
  });

  describe("bringElementForward", () => {
    it("swaps element with the next element", () => {
      const { project } = setupProjectWithElements();
      const updated = bringElementForward(project, "screen-1", "el-1");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-2", "el-1", "el-3"]);
    });

    it("does nothing if element is already at the end", () => {
      const { project } = setupProjectWithElements();
      const updated = bringElementForward(project, "screen-1", "el-3");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });
  });

  describe("sendElementBackward", () => {
    it("swaps element with the previous element", () => {
      const { project } = setupProjectWithElements();
      const updated = sendElementBackward(project, "screen-1", "el-2");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-2", "el-1", "el-3"]);
    });

    it("does nothing if element is already at the beginning", () => {
      const { project } = setupProjectWithElements();
      const updated = sendElementBackward(project, "screen-1", "el-1");
      const elements = updated.screens[0]!.elements;
      
      expect(elements.map(e => e.id)).toEqual(["el-1", "el-2", "el-3"]);
    });
  });
});
