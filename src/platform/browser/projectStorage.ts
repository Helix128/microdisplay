import { parseProjectJson } from "../../core/projectFile";
import type { Project } from "../../core";
import { createId } from "../../utils/id";
import type { ProjectStorage } from "../projectStorage";

const projectsIndexKey = "microdisplay:projects:index";
const currentProjectIdKey = "microdisplay:last-project-id";
const projectKeyPrefix = "microdisplay:project:";

export const browserProjectStorage: ProjectStorage = {
  async createProject(project) {
    const id = createId("project");
    rememberProjectId(id);
    saveStoredProject(id, project);
  },

  async openProject() {
    const file = await selectProjectFile();

    if (file === null) {
      return null;
    }

    const result = parseProjectJson(await file.text());

    if (!result.ok) {
      throw new Error(result.error);
    }

    const id = createId("project");
    rememberProjectId(id);
    saveStoredProject(id, result.project);
    return result.project;
  },

  async saveProject(project) {
    const id = getCurrentProjectId() ?? createId("project");
    rememberProjectId(id);
    saveStoredProject(id, project);
    return true;
  },

  async saveProjectAs(project) {
    await this.saveProject(project);
    downloadProject(project);
    return true;
  },

  async getLastProject() {
    const id = getCurrentProjectId();

    if (id === null) {
      return null;
    }

    return readStoredProject(id)?.project ?? null;
  },

  async listProjects() {
    return loadStoredProjects().map(({ id, project }) => ({ id, project }));
  },

  async openStoredProject(id) {
    const storedProject = readStoredProject(id);

    if (storedProject === null) {
      return null;
    }

    rememberProjectId(id);
    return storedProject.project;
  },

  async deleteProject(id) {
    localStorage.removeItem(projectStorageKey(id));
    removeProjectFromIndex(id);
  },
};

function saveStoredProject(id: string, project: Project) {
  localStorage.setItem(
    projectStorageKey(id),
    JSON.stringify({
      project,
      updatedAt: Date.now(),
    }),
  );
  writeProjectsIndex(id);
}

function readStoredProject(id: string): { project: Project; updatedAt: number } | null {
  const json = localStorage.getItem(projectStorageKey(id));

  if (json === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(json);

    if (!isRecord(value) || !isRecord(value.project) || typeof value.updatedAt !== "number") {
      throw new Error();
    }

    const result = parseProjectJson(JSON.stringify(value.project));

    if (!result.ok) {
      throw new Error();
    }

    return {
      project: result.project,
      updatedAt: value.updatedAt,
    };
  } catch {
    localStorage.removeItem(projectStorageKey(id));
    removeProjectFromIndex(id);
    return null;
  }
}

function loadStoredProjects(): Array<{ id: string; project: Project; updatedAt: number }> {
  const ids = readProjectsIndex();
  const projects: Array<{ id: string; project: Project; updatedAt: number }> = [];

  for (const id of ids) {
    const storedProject = readStoredProject(id);

    if (storedProject !== null) {
      projects.push({ id, ...storedProject });
    }
  }

  return projects.sort((left, right) => right.updatedAt - left.updatedAt);
}

function writeProjectsIndex(id: string) {
  const ids = readProjectsIndex().filter((currentId) => currentId !== id);
  ids.unshift(id);
  localStorage.setItem(projectsIndexKey, JSON.stringify(ids));
}

function removeProjectFromIndex(id: string) {
  const ids = readProjectsIndex().filter((currentId) => currentId !== id);
  localStorage.setItem(projectsIndexKey, JSON.stringify(ids));

  if (getCurrentProjectId() === id) {
    localStorage.removeItem(currentProjectIdKey);
  }
}

function readProjectsIndex(): string[] {
  const json = localStorage.getItem(projectsIndexKey);

  if (json === null) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(json);

    if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
      throw new Error();
    }

    return value;
  } catch {
    localStorage.removeItem(projectsIndexKey);
    return [];
  }
}

function getCurrentProjectId(): string | null {
  return localStorage.getItem(currentProjectIdKey);
}

function rememberProjectId(id: string) {
  localStorage.setItem(currentProjectIdKey, id);
}

function projectStorageKey(id: string): string {
  return `${projectKeyPrefix}${id}`;
}

function selectProjectFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    const finish = (file: File | null) => {
      input.remove();
      resolve(file);
    };

    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.onchange = () => finish(input.files?.[0] ?? null);
    input.oncancel = () => finish(null);
    document.body.append(input);
    input.click();
  });
}

function downloadProject(project: Project) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = `${toFileName(project.name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function toFileName(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-").replace(/[. ]+$/g, "") || "microdisplay";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
