import { type FormEvent, memo, useCallback, useEffect, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { createProject, getFirstScreen, setFirstScreenActive, type Project } from "../core";
import { ScreenPreview } from "../preview/ScreenPreview";
import { projectStorage, type StoredProject } from "../platform/projectStorage";
import { createId } from "../utils/id";

type StartScreenProps = {
  onCreateProject: (project: Project) => void;
};

const PRESETS = [
  { name: "128 × 64", width: 128, height: 64 },
  { name: "128 × 32", width: 128, height: 32 },
  { name: "96 × 16", width: 96, height: 16 },
  { name: "64 × 48", width: 64, height: 48 },
  { name: "64 × 32", width: 64, height: 32 },
];

export function StartScreen({ onCreateProject }: StartScreenProps) {
  const [name, setName] = useState("Untitled");
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(64);
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);

  const [resolutionPreset, setResolutionPreset] = useState<string>(() => {
    const idx = PRESETS.findIndex((p) => p.width === 128 && p.height === 64);
    return idx !== -1 ? String(idx) : "custom";
  });

  useEffect(() => {
    let mounted = true;

    projectStorage
      .listProjects()
      .then((storedProjects) => {
        if (mounted) {
          setProjects(storedProjects);
        }
      })
      .catch((currentError) => {
        if (mounted) {
          setProjects([]);
          setError(
            currentError instanceof Error
              ? currentError.message
              : "No se pudo cargar la lista de proyectos.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingProjects(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function createNewProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError(null);

      const project = createProject({
        name,
        width,
        height,
        screenId: createId("screen"),
      });

      await projectStorage.createProject(project);
      onCreateProject(setFirstScreenActive(project));
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo crear el proyecto.",
      );
    }
  }

  const openStoredProject = useCallback(
    async (projectId: string) => {
      try {
        setError(null);

        const project = await projectStorage.openStoredProject(projectId);

        if (project !== null) {
          onCreateProject(setFirstScreenActive(project));
        }
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : "No se pudo abrir el proyecto.",
        );
      }
    },
    [onCreateProject],
  );

  const toggleMenuProject = useCallback((projectId: string) => {
    setActiveMenuProjectId((current) => (current === projectId ? null : projectId));
  }, []);

  const handleDeleteProject = useCallback(async (projectId: string, projectName: string) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await projectStorage.deleteProject(projectId);
      setProjects((prevProjects) => prevProjects.filter((p) => p.id !== projectId));
      setActiveMenuProjectId(null);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo eliminar el proyecto.",
      );
    }
  }, []);

  const handleRenameProject = useCallback(async (projectId: string, currentName: string) => {
    const newName = window.prompt("Nuevo nombre del proyecto:", currentName);

    if (newName === null) {
      return;
    }

    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentName) {
      return;
    }

    try {
      setError(null);
      const newId = await projectStorage.renameProject(projectId, trimmed);

      setProjects((prevProjects) =>
        prevProjects.map((p) =>
          p.id === projectId
            ? { ...p, id: newId, project: { ...p.project, name: trimmed } }
            : p
        )
      );
      setActiveMenuProjectId(null);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo renombrar el proyecto.",
      );
    }
  }, []);

  async function openProject() {
    try {
      setError(null);

      const project = await projectStorage.openProject();

      if (project !== null) {
        onCreateProject(setFirstScreenActive(project));
      }
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo abrir el proyecto.",
      );
    }
  }

  return (
    <main className="start-shell">
      <aside className="start-sidebar">
        <div className="start-brand">
          <h1>µDisplay Studio</h1>
        </div>

        <section className="start-create-panel">
          <h2>Nuevo proyecto</h2>

          <form className="editor-form" onSubmit={createNewProject}>
            <label>
              Nombre
              <input
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>

            <div className="preset-container">
              <label>
                Resolución
                <select
                  value={resolutionPreset}
                  onChange={(event) => {
                    const val = event.currentTarget.value;
                    setResolutionPreset(val);
                    if (val !== "custom") {
                      const preset = PRESETS[Number(val)];
                      setWidth(preset.width);
                      setHeight(preset.height);
                    }
                  }}
                >
                  {PRESETS.map((preset, index) => (
                    <option key={preset.name} value={String(index)}>
                      {preset.name}
                    </option>
                  ))}
                  <option value="custom">Personalizado</option>
                </select>
              </label>
            </div>

            {resolutionPreset === "custom" && (
              <div className="field-grid">
                <label>
                  Ancho (px)
                  <input
                    type="number"
                    value={width}
                    onChange={(event) => setWidth(event.currentTarget.valueAsNumber || 0)}
                  />
                </label>
                <label>
                  Alto (px)
                  <input
                    type="number"
                    value={height}
                    onChange={(event) => setHeight(event.currentTarget.valueAsNumber || 0)}
                  />
                </label>
              </div>
            )}

            <div className="start-actions">
              <button className="primary-button" type="submit">
                Crear proyecto
              </button>
            </div>
          </form>
        </section>

        <div className="start-sidebar-footer">
          <div className="sidebar-divider"></div>
          <button className="secondary-button open-project-btn" type="button" onClick={openProject}>
            Abrir desde JSON…
          </button>
          {error !== null ? <p className="error-message start-error">{error}</p> : null}
        </div>
      </aside>

      <section className="start-projects-panel">
        <header className="start-projects-header">
          <h2>Proyectos guardados</h2>
          <span className="projects-count">
            {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
          </span>
        </header>

        <div className="start-projects-body">
          {isLoadingProjects ? (
            <p className="start-status">Cargando proyectos…</p>
          ) : null}

          {!isLoadingProjects && projects.length === 0 ? (
            <div className="start-empty-state">
              <p>No hay proyectos guardados localmente.</p>
              <p className="start-status">Crea uno nuevo usando el panel lateral o abre un archivo existente.</p>
            </div>
          ) : null}

          <div className="project-grid">
            {projects.map((storedProject) => (
              <ProjectCard
                key={storedProject.id}
                storedProject={storedProject}
                isMenuOpen={activeMenuProjectId === storedProject.id}
                onOpen={openStoredProject}
                onToggleMenu={toggleMenuProject}
                onDelete={handleDeleteProject}
                onRename={handleRenameProject}
              />
            ))}
          </div>
        </div>
      </section>
      {activeMenuProjectId !== null && (
        <div className="dropdown-backdrop" onClick={() => setActiveMenuProjectId(null)} />
      )}
    </main>
  );
}

const ProjectCard = memo(function ProjectCard({
  storedProject,
  isMenuOpen,
  onOpen,
  onToggleMenu,
  onDelete,
  onRename,
}: {
  storedProject: StoredProject;
  isMenuOpen: boolean;
  onOpen: (projectId: string) => void;
  onToggleMenu: (projectId: string) => void;
  onDelete: (projectId: string, projectName: string) => void;
  onRename: (projectId: string, projectName: string) => void;
}) {
  const firstScreen = getFirstScreen(storedProject.project);

  return (
    <article
      className="project-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(storedProject.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(storedProject.id);
        }
      }}
    >
      <div className="project-card-preview">
        <ScreenPreview
          device={storedProject.project.device}
          screen={firstScreen}
          selectedElementId={null}
          draftElement={null}
        />
      </div>

      <div className="project-card-body">
        <div className="project-card-head">
          <div className="project-card-title-group">
            <strong>{storedProject.project.name}</strong>
          </div>
          <div className="project-card-menu-container">
            <button
              type="button"
              className="project-card-menu-btn"
              aria-label="Opciones de proyecto"
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu(storedProject.id);
              }}
            >
              <MoreVertical size={16} />
            </button>
            {isMenuOpen ? (
              <div className="project-card-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRename(storedProject.id, storedProject.project.name);
                  }}
                >
                  <Pencil size={14} />
                  <span>Renombrar</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item delete-item"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(storedProject.id, storedProject.project.name);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Eliminar</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="project-card-meta">
          <span>
            {storedProject.project.device.width} × {storedProject.project.device.height}
          </span>
          <span>
            {storedProject.project.screens.length} {storedProject.project.screens.length === 1 ? "pantalla" : "pantallas"}
          </span>
        </div>
      </div>
    </article>
  );
});
