import type { Screen } from "./design";

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
