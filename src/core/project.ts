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
