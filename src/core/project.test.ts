import { describe, expect, it } from "vitest";
import { createProject } from "./project";

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
