import { documentDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { parseProjectJson } from "../../core/projectFile";
import { renameProject, type Project } from "../../core";
import type { ProjectStorage, StoredProject } from "../projectStorage";

const lastProjectPathKey = "microdisplay:tauri:last-project-path";
const projectFolderName = "microdisplay";
let currentProjectPath: string | null = localStorage.getItem(lastProjectPathKey);

export const tauriProjectStorage: ProjectStorage = {
  async createProject(project) {
    const path = await getDefaultProjectPath(project);
    await writeProjectFile(path, project);
    rememberProjectPath(path);
  },

  async openProject() {
    const projectFolderPath = await ensureDefaultProjectFolder();
    const path = await open({
      title: "Abrir proyecto",
      defaultPath: projectFolderPath,
      multiple: false,
      filters: [{ name: "Proyecto", extensions: ["json"] }],
      fileAccessMode: "scoped",
    });

    if (path === null || Array.isArray(path)) {
      return null;
    }

    const project = await readProjectFile(path);
    rememberProjectPath(path);
    return project;
  },

  async saveProject(project) {
    return saveProjectToCurrentPath(project);
  },

  async saveProjectAs(project) {
    return saveProjectWithDialog(project);
  },

  async getLastProject() {
    if (currentProjectPath === null) {
      return null;
    }

    try {
      return await readProjectFile(currentProjectPath);
    } catch {
      forgetProjectPath();
      return null;
    }
  },

  async listProjects() {
    const projectFolderPath = await ensureDefaultProjectFolder();
    const entries = await readDir(projectFolderPath);
    const projects: StoredProject[] = [];

    for (const entry of entries) {
      if (!entry.isFile || !entry.name.endsWith(".json")) {
        continue;
      }

      const path = await join(projectFolderPath, entry.name);
      const project = await readProjectFile(path).catch(() => null);

      if (project !== null) {
        projects.push({ id: path, project });
      }
    }

    return projects.sort((left, right) => left.project.name.localeCompare(right.project.name));
  },

  async openStoredProject(id) {
    const project = await readProjectFile(id);
    rememberProjectPath(id);
    return project;
  },

  async deleteProject(id) {
    await remove(id);
    if (currentProjectPath === id) {
      forgetProjectPath();
    }
  },

  async renameProject(id, newName) {
    const project = await readProjectFile(id);
    const updatedProject = renameProject(project, newName);

    const projectFolderPath = await ensureDefaultProjectFolder();
    const newFileName = `${toFileName(newName)}.json`;
    const newPath = await join(projectFolderPath, newFileName);

    if (newPath !== id) {
      const entries = await readDir(projectFolderPath);
      const exists = entries.some(
        (entry) => entry.isFile && entry.name.toLowerCase() === newFileName.toLowerCase()
      );

      if (exists) {
        throw new Error(`Ya existe un proyecto llamado "${newName}" en la carpeta de proyectos.`);
      }

      await writeProjectFile(newPath, updatedProject);
      await remove(id);

      if (currentProjectPath === id) {
        rememberProjectPath(newPath);
      }
      return newPath;
    } else {
      await writeProjectFile(id, updatedProject);
      return id;
    }
  },
};

async function ensureDefaultProjectFolder(): Promise<string> {
  await mkdir(projectFolderName, { baseDir: BaseDirectory.Document, recursive: true });
  return join(await documentDir(), projectFolderName);
}

async function getDefaultProjectPath(project: Project): Promise<string> {
  return join(await ensureDefaultProjectFolder(), `${toFileName(project.name)}.json`);
}

async function readProjectFile(path: string): Promise<Project> {
  const result = parseProjectJson(await readTextFile(path));

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.project;
}

async function saveProjectToCurrentPath(project: Project): Promise<boolean> {
  if (currentProjectPath !== null) {
    try {
      const projectFolderPath = await ensureDefaultProjectFolder();
      const isDefaultFolder = currentProjectPath.startsWith(projectFolderPath);

      if (isDefaultFolder) {
        const expectedFileName = `${toFileName(project.name)}.json`;
        const expectedPath = await join(projectFolderPath, expectedFileName);

        if (expectedPath !== currentProjectPath) {
          const entries = await readDir(projectFolderPath);
          const exists = entries.some(
            (entry) => entry.isFile && entry.name.toLowerCase() === expectedFileName.toLowerCase()
          );

          if (!exists) {
            await writeProjectFile(expectedPath, project);
            await remove(currentProjectPath);
            rememberProjectPath(expectedPath);
            return true;
          }
        }
      }

      await writeProjectFile(currentProjectPath, project);
      return true;
    } catch {
      forgetProjectPath();
    }
  }

  return saveProjectWithDialog(project);
}

async function saveProjectWithDialog(project: Project): Promise<boolean> {
  const path = await save({
    title: "Guardar proyecto",
    defaultPath: await getDefaultProjectPath(project),
    filters: [{ name: "Proyecto", extensions: ["json"] }],
  });

  if (path === null) {
    return false;
  }

  await writeProjectFile(path, project);
  rememberProjectPath(path);
  return true;
}

async function writeProjectFile(path: string, project: Project) {
  await writeTextFile(path, JSON.stringify(project, null, 2));
}

function rememberProjectPath(path: string) {
  currentProjectPath = path;
  localStorage.setItem(lastProjectPathKey, path);
}

function forgetProjectPath() {
  currentProjectPath = null;
  localStorage.removeItem(lastProjectPathKey);
}

function toFileName(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-").replace(/[. ]+$/g, "") || "microdisplay";
}
