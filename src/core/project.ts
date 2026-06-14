import type { DesignElement, Screen } from "./design";

export type Project = {
  schemaVersion: 1;
  name: string;
  device: DeviceConfig;
  screens: Screen[];
  activeScreenId: string;
};

export type DeviceConfig = {
  width: number;
  height: number;
};

export type CreateProjectOptions = {
  name?: string;
  width?: number;
  height?: number;
  screenId?: string;
};

export function createProject(options: CreateProjectOptions = {}): Project {
  const screenId = options.screenId ?? "screen-1";

  return {
    schemaVersion: 1,
    name: options.name ?? "Untitled",
    device: {
      width: options.width ?? 128,
      height: options.height ?? 64,
    },
    screens: [
      {
        id: screenId,
        name: "Screen 1",
        elements: [],
      },
    ],
    activeScreenId: screenId,
  };
}

export function getActiveScreen(project: Project): Screen {
  return project.screens.find((screen) => screen.id === project.activeScreenId)!;
}

export function addScreen(project: Project, screen: Screen): Project {
  return {
    ...project,
    screens: [...project.screens, screen],
  };
}

export function setActiveScreen(project: Project, screenId: string): Project {
  return {
    ...project,
    activeScreenId: screenId,
  };
}

export function addElementToScreen(
  project: Project,
  screenId: string,
  element: DesignElement,
): Project {
  return {
    ...project,
    screens: project.screens.map((screen) =>
      screen.id === screenId
        ? { ...screen, elements: [...screen.elements, element] }
        : screen,
    ),
  };
}

export function removeElementFromScreen(
  project: Project,
  screenId: string,
  elementId: string,
): Project {
  return {
    ...project,
    screens: project.screens.map((screen) =>
      screen.id === screenId
        ? {
            ...screen,
            elements: screen.elements.filter((element) => element.id !== elementId),
          }
        : screen,
    ),
  };
}
