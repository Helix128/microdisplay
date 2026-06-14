import { browserProjectStorage } from "./browser/projectStorage";
import { tauriProjectStorage } from "./tauri/projectStorage";
import type { Project } from "../core";

export type StoredProject = {
  id: string;
  project: Project;
};

export type ProjectStorage = {
  createProject(project: Project): Promise<void>;
  openProject(): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  saveProjectAs(project: Project): Promise<void>;
  getLastProject(): Promise<Project | null>;
  listProjects(): Promise<StoredProject[]>;
  openStoredProject(id: string): Promise<Project | null>;
  deleteProject(id: string): Promise<void>;
};

export const projectStorage: ProjectStorage = isTauriRuntime()
  ? tauriProjectStorage
  : browserProjectStorage;

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
