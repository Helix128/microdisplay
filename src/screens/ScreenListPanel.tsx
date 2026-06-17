import { ChevronDown, ChevronUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import "./ScreenListPanel.css";
import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Project, Screen } from "../core";
import { ScreenPreview } from "../preview/ScreenPreview";

type ScreenListPanelProps = {
  project: Project;
  editingScreenId: string | null;
  editingScreenName: string;
  onEditingScreenNameChange: (value: string) => void;
  onSelectScreen: (screenId: string) => void;
  onAddScreen: () => void;
  onStartRenameScreen: (screen: Screen) => void;
  onCommitRenameScreen: (screen: Screen) => void;
  onCancelRenameScreen: () => void;
  onDuplicateScreen: (screen: Screen) => void;
  onRemoveScreen: (screen: Screen) => void;
  onMoveScreen: (screenId: string, targetIndex: number) => void;
};

export function ScreenListPanel({
  project,
  editingScreenId,
  editingScreenName,
  onEditingScreenNameChange,
  onSelectScreen,
  onAddScreen,
  onStartRenameScreen,
  onCommitRenameScreen,
  onCancelRenameScreen,
  onDuplicateScreen,
  onRemoveScreen,
  onMoveScreen,
}: ScreenListPanelProps) {
  return (
    <aside className="screen-list-panel" aria-label="Pantallas del proyecto">
      <div className="screen-list-header">
        <h2>Pantallas</h2>
        <button type="button" aria-label="Agregar pantalla" onClick={onAddScreen}>
          <Plus />
        </button>
      </div>
      <div className="screen-list">
        {project.screens.map((screen, index) => (
          <article
            key={screen.id}
            className={`screen-list-item ${screen.id === project.activeScreenId ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelectScreen(screen.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectScreen(screen.id);
              }
            }}
          >
            <div className="screen-list-preview">
              <ScreenPreview
                device={project.device}
                screen={screen}
                selectedElementId={null}
                draftElement={null}
              />
            </div>
            <div className="screen-list-meta">
              {editingScreenId === screen.id ? (
                <input
                  className="screen-name-input"
                  value={editingScreenName}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onChange={(event) => onEditingScreenNameChange(event.currentTarget.value)}
                  onBlur={() => onCommitRenameScreen(screen)}
                  onKeyDown={(event) =>
                    handleScreenNameKeyDown(event, screen, onCommitRenameScreen, onCancelRenameScreen)
                  }
                  autoFocus
                />
              ) : (
                <strong
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onStartRenameScreen(screen);
                  }}
                >
                  {screen.name}
                </strong>
              )}
              <span>
                {screen.elements.length} {screen.elements.length === 1 ? "elemento" : "elementos"}
              </span>
            </div>
            <div className="screen-list-actions">
              <button
                type="button"
                aria-label="Mover arriba"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveScreen(screen.id, index - 1);
                }}
              >
                <ChevronUp />
              </button>
              <button
                type="button"
                aria-label="Mover abajo"
                disabled={index === project.screens.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveScreen(screen.id, index + 1);
                }}
              >
                <ChevronDown />
              </button>
              <button
                type="button"
                aria-label="Renombrar pantalla"
                onClick={(event) => {
                  event.stopPropagation();
                  onStartRenameScreen(screen);
                }}
              >
                <Pencil />
              </button>
              <button
                type="button"
                aria-label="Duplicar pantalla"
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicateScreen(screen);
                }}
              >
                <Copy />
              </button>
              <button
                type="button"
                aria-label="Eliminar pantalla"
                disabled={project.screens.length <= 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveScreen(screen);
                }}
              >
                <Trash2 />
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function handleScreenNameKeyDown(
  event: ReactKeyboardEvent<HTMLInputElement>,
  screen: Screen,
  onCommit: (screen: Screen) => void,
  onCancel: () => void,
) {
  event.stopPropagation();

  if (event.key === "Enter") {
    event.preventDefault();
    onCommit(screen);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    onCancel();
  }
}
