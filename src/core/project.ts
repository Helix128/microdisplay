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

export function getFirstScreen(project: Project): Screen {
  return project.screens[0]!;
}

export function setFirstScreenActive(project: Project): Project {
  return {
    ...project,
    activeScreenId: getFirstScreen(project).id,
  };
}

export function getActiveScreen(project: Project): Screen {
  return project.screens.find((screen) => screen.id === project.activeScreenId) ?? getFirstScreen(project);
}

export function addScreen(project: Project, screen: Screen): Project {
  return {
    ...project,
    screens: [...project.screens, screen],
  };
}

export function renameScreen(project: Project, screenId: string, name: string): Project {
  return {
    ...project,
    screens: project.screens.map((screen) =>
      screen.id === screenId ? { ...screen, name } : screen,
    ),
  };
}

export function duplicateScreen(project: Project, sourceScreenId: string, duplicatedScreen: Screen): Project {
  const sourceIndex = project.screens.findIndex((screen) => screen.id === sourceScreenId);

  if (sourceIndex === -1) {
    return project;
  }

  return {
    ...project,
    screens: [
      ...project.screens.slice(0, sourceIndex + 1),
      duplicatedScreen,
      ...project.screens.slice(sourceIndex + 1),
    ],
  };
}

export function removeScreen(project: Project, screenId: string): Project {
  if (project.screens.length <= 1) {
    return project;
  }

  const screenIndex = project.screens.findIndex((screen) => screen.id === screenId);

  if (screenIndex === -1) {
    return project;
  }

  const screens = project.screens.filter((screen) => screen.id !== screenId);

  if (project.activeScreenId !== screenId) {
    return {
      ...project,
      screens,
    };
  }

  const nextIndex = Math.min(screenIndex, screens.length - 1);

  return {
    ...project,
    screens,
    activeScreenId: screens[nextIndex]!.id,
  };
}

export function reorderScreen(project: Project, screenId: string, targetIndex: number): Project {
  const currentIndex = project.screens.findIndex((screen) => screen.id === screenId);

  if (currentIndex === -1) {
    return project;
  }

  const nextIndex = Math.max(0, Math.min(project.screens.length - 1, targetIndex));

  if (currentIndex === nextIndex) {
    return project;
  }

  return {
    ...project,
    screens: moveItem(project.screens, currentIndex, nextIndex),
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item!);
  return nextItems;
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

export function updateElementInScreen(
  project: Project,
  screenId: string,
  element: DesignElement,
): Project {
  return {
    ...project,
    screens: project.screens.map((screen) =>
      screen.id === screenId
        ? {
            ...screen,
            elements: screen.elements.map((currentElement) =>
              currentElement.id === element.id ? element : currentElement,
            ),
          }
        : screen,
    ),
  };
}
