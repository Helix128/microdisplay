import {
  Circle,
  Download,
  Grid2x2,
  HardDrive,
  LogOut,
  MousePointer2,
  Move,
  PaintBucket,
  RectangleHorizontal,
  SaveAll,
  Slash,
  Type,
} from "lucide-react";
import {
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addElementToScreen,
  addScreen,
  duplicateScreen,
  getActiveScreen,
  removeElementFromScreen,
  removeScreen,
  renameScreen,
  reorderScreen,
  setActiveScreen,
  type CircleElement,
  type DesignElement,
  type LineElement,
  type Project,
  type RectElement,
  type Screen,
  type TextElement,
  updateElementInScreen,
} from "../core";
import {
  type DraftElement,
  type Point,
  ScreenPreview,
} from "../preview/ScreenPreview";
import { u8g2 } from "../exporters";
import {
  defaultU8g2FontName,
  getCharsetLabel,
  getPurposeLabel,
  getU8g2FontFamilies,
  getU8g2FontFamily,
  getU8g2FontVariant,
  resolveU8g2FontVariant,
  type U8g2FontCharset,
  type U8g2FontPurpose,
} from "../targets/u8g2/fonts/index";
import { projectStorage } from "../platform/projectStorage";
import { createId } from "../utils/id";
import { ScreenListPanel } from "./ScreenListPanel";

type Tool = "select" | "pan" | "rect" | "circle" | "line" | "text";

type CopyStatus = "idle" | "copied";
type SaveState = "idle" | "saved" | "dirty" | "saving" | "error";
type SaveMode = "save" | "saveAs";

const autosaveDelayMs = 1000;
const minSavingVisibleMs = 450;
const savedVisibleMs = 1800;
const u8g2FontFamilies = getU8g2FontFamilies();

type EditorScreenProps = {
  project: Project;
  onExit: () => void;
  onProjectChange: (project: Project) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.matches("input, textarea, select") ||
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

export function EditorScreen({ project, onExit, onProjectChange }: EditorScreenProps) {
  const [tool, setTool] = useState<Tool>("select");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [viewportOffset, setViewportOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [panOrigin, setPanOrigin] = useState<Point | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [showPixelGrid, setShowPixelGrid] = useState(true);
  const [rectFilled, setRectFilled] = useState(false);
  const [textContent, setTextContent] = useState("Texto");
  const [textFont, setTextFont] = useState(defaultU8g2FontName);
  const [dragPreviewElement, setDragPreviewElement] = useState<DesignElement | null>(null);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [editingScreenName, setEditingScreenName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedProjectJson, setLastSavedProjectJson] = useState(() => JSON.stringify(project));
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const artboardRef = useRef<HTMLDivElement>(null);
  const dragOriginalElementRef = useRef<DesignElement | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const viewportOffsetRef = useRef(viewportOffset);
  const panFrameRef = useRef<number | null>(null);
  const pendingViewportOffsetRef = useRef<Point | null>(null);
  const latestProjectRef = useRef(project);
  const latestProjectJsonRef = useRef(JSON.stringify(project));
  const lastSavedProjectJsonRef = useRef(lastSavedProjectJson);
  const saveInFlightRef = useRef(false);
  const saveStatusTimeoutRef = useRef<number | null>(null);

  const projectJson = useMemo(() => JSON.stringify(project), [project]);
  const hasUnsavedChanges = projectJson !== lastSavedProjectJson;
  const isSaving = saveState === "saving";
  const statusMessage = getSaveStatusMessage(saveState, hasUnsavedChanges);

  useEffect(() => {
    viewportOffsetRef.current = viewportOffset;
  }, [viewportOffset]);

  useEffect(() => {
    latestProjectRef.current = project;
    latestProjectJsonRef.current = projectJson;
  }, [project, projectJson]);

  useEffect(() => {
    lastSavedProjectJsonRef.current = lastSavedProjectJson;
  }, [lastSavedProjectJson]);

  const activeScreen = useMemo(() => getActiveScreen(project), [project]);
  const selectedElement = useMemo(
    () => activeScreen.elements.find((element) => element.id === selectedElementId) ?? null,
    [activeScreen, selectedElementId],
  );
  const draftElement = useMemo(
    () => getDraftElement(tool, dragStart, dragCurrent, rectFilled, textContent, textFont),
    [tool, dragStart, dragCurrent, rectFilled, textContent, textFont],
  );
  const exportCode = useMemo(
    () => (showExportPanel ? u8g2.generateProject(project) : ""),
    [project, showExportPanel],
  );

  const resetEditorInteractionState = useCallback(() => {
    setSelectedElementId(null);
    setDragStart(null);
    setDragCurrent(null);
    setDragPreviewElement(null);
    dragOriginalElementRef.current = null;
    dragStartRef.current = null;
  }, []);

  const handleSelectScreen = useCallback(
    (screenId: string) => {
      if (screenId === project.activeScreenId) {
        return;
      }

      resetEditorInteractionState();
      setEditingScreenId(null);
      setEditingScreenName("");
      onProjectChange(setActiveScreen(project, screenId));
    },
    [onProjectChange, project, resetEditorInteractionState],
  );

  const handleAddScreen = useCallback(() => {
    const screen: Screen = {
      id: createId("screen"),
      name: getNextScreenName(project),
      elements: [],
    };

    const nextProject = setActiveScreen(addScreen(project, screen), screen.id);
    resetEditorInteractionState();
    setEditingScreenId(screen.id);
    setEditingScreenName(screen.name);
    onProjectChange(nextProject);
  }, [onProjectChange, project, resetEditorInteractionState]);

  const handleStartRenameScreen = useCallback((screen: Screen) => {
    setEditingScreenId(screen.id);
    setEditingScreenName(screen.name);
  }, []);

  const handleCommitRenameScreen = useCallback(
    (screen: Screen) => {
      const name = editingScreenName.trim();
      const nextName = name || screen.name;

      if (nextName !== screen.name) {
        onProjectChange(renameScreen(project, screen.id, nextName));
      }

      setEditingScreenId(null);
      setEditingScreenName("");
    },
    [editingScreenName, onProjectChange, project],
  );

  const handleCancelRenameScreen = useCallback(() => {
    setEditingScreenId(null);
    setEditingScreenName("");
  }, []);

  const handleDuplicateScreen = useCallback(
    (screen: Screen) => {
      const duplicatedScreen: Screen = {
        id: createId("screen"),
        name: getDuplicateScreenName(screen.name, project),
        elements: screen.elements.map(cloneElementWithNewId),
      };

      const nextProject = setActiveScreen(
        duplicateScreen(project, screen.id, duplicatedScreen),
        duplicatedScreen.id,
      );

      resetEditorInteractionState();
      setEditingScreenId(null);
      setEditingScreenName("");
      onProjectChange(nextProject);
    },
    [onProjectChange, project, resetEditorInteractionState],
  );

  const handleRemoveScreen = useCallback(
    (screen: Screen) => {
      if (project.screens.length <= 1) {
        return;
      }

      const confirmed = window.confirm(
        `¿Estás seguro de que deseas eliminar la pantalla "${screen.name}"?`,
      );

      if (!confirmed) {
        return;
      }

      resetEditorInteractionState();
      setEditingScreenId(null);
      setEditingScreenName("");
      onProjectChange(removeScreen(project, screen.id));
    },
    [onProjectChange, project, resetEditorInteractionState],
  );

  const handleMoveScreen = useCallback(
    (screenId: string, targetIndex: number) => {
      setEditingScreenId(null);
      setEditingScreenName("");
      onProjectChange(reorderScreen(project, screenId, targetIndex));
    },
    [onProjectChange, project],
  );

  const handlePreviewPointerDown = useCallback(
    (point: Point) => {
      if (tool === "select") {
        setSelectedElementId(null);
        dragOriginalElementRef.current = null;
        setDragPreviewElement(null);
        return;
      }

      if (tool === "rect" || tool === "circle" || tool === "line" || tool === "text") {
        dragStartRef.current = point;
        setDragStart(point);
        setDragCurrent(point);
      }
    },
    [tool],
  );

  const handlePreviewPointerMove = useCallback(
    (point: Point) => {
      const interactionStart = dragStartRef.current ?? dragStart;

      if (tool === "select" && interactionStart !== null && dragOriginalElementRef.current !== null) {
        const dx = point.x - interactionStart.x;
        const dy = point.y - interactionStart.y;
        const original = dragOriginalElementRef.current;

        switch (original.type) {
          case "rect":
            setDragPreviewElement({
              ...original,
              x: original.x + dx,
              y: original.y + dy,
            });
            break;
          case "circle":
            setDragPreviewElement({
              ...original,
              x: original.x + dx,
              y: original.y + dy,
            });
            break;
          case "line":
            setDragPreviewElement({
              ...original,
              x1: original.x1 + dx,
              y1: original.y1 + dy,
              x2: original.x2 + dx,
              y2: original.y2 + dy,
            });
            break;
          case "text":
            setDragPreviewElement({
              ...original,
              x: original.x + dx,
              y: original.y + dy,
            });
            break;
        }
        return;
      }

      if (dragStartRef.current !== null) {
        setDragCurrent(point);
      }
    },
    [dragStart, tool],
  );

  const handlePreviewPointerUp = useCallback(
    (point: Point) => {
      if (dragOriginalElementRef.current !== null && dragPreviewElement !== null) {
        if (dragPreviewElement !== dragOriginalElementRef.current) {
          onProjectChange(
            updateElementInScreen(project, project.activeScreenId, dragPreviewElement),
          );
        }
        dragOriginalElementRef.current = null;
        dragStartRef.current = null;
        setDragPreviewElement(null);
        setDragStart(null);
        setDragCurrent(null);
        return;
      }

      const interactionStart = dragStartRef.current ?? dragStart;

      if (interactionStart === null) {
        return;
      }

      if (tool === "rect") {
        const rect = createRectFromPoints(interactionStart, point);

        if (rect.width > 0 && rect.height > 0) {
          const element: RectElement = {
            id: createId("rect"),
            type: "rect",
            filled: rectFilled,
            ...rect,
          };

          onProjectChange(addElementToScreen(project, project.activeScreenId, element));
          setSelectedElementId(element.id);
        }
      }

      if (tool === "circle") {
        const circle = createCircleFromPoints(interactionStart, point);

        if (circle.radius > 0) {
          const element: CircleElement = {
            id: createId("circle"),
            type: "circle",
            filled: rectFilled,
            ...circle,
          };

          onProjectChange(addElementToScreen(project, project.activeScreenId, element));
          setSelectedElementId(element.id);
        }
      }

      if (tool === "line" && (interactionStart.x !== point.x || interactionStart.y !== point.y)) {
        const element: LineElement = {
          id: createId("line"),
          type: "line",
          x1: interactionStart.x,
          y1: interactionStart.y,
          x2: point.x,
          y2: point.y,
        };

        onProjectChange(addElementToScreen(project, project.activeScreenId, element));
        setSelectedElementId(element.id);
      }

      if (tool === "text") {
        const element: TextElement = {
          id: createId("text"),
          type: "text",
          x: point.x,
          y: point.y,
          text: textContent,
          font: textFont,
        };

        onProjectChange(addElementToScreen(project, project.activeScreenId, element));
        setSelectedElementId(element.id);
      }

      dragStartRef.current = null;
      setDragStart(null);
      setDragCurrent(null);
    },
    [dragPreviewElement, dragStart, onProjectChange, project, rectFilled, textContent, textFont, tool],
  );

  const handleElementPointerDown = useCallback(
    (elementId: string, point: Point) => {
      if (tool === "select") {
        setSelectedElementId(elementId);
        const element = activeScreen.elements.find((el) => el.id === elementId);
        if (element) {
          dragOriginalElementRef.current = element;
          setDragPreviewElement(element);
          dragStartRef.current = point;
          setDragStart(point);
          setDragCurrent(point);
        }
      }
    },
    [activeScreen.elements, tool],
  );

  const updateSelectedElement = useCallback(
    (element: DesignElement) => {
      onProjectChange(updateElementInScreen(project, project.activeScreenId, element));
    },
    [onProjectChange, project],
  );

  function removeSelectedElement() {
    if (selectedElementId === null) {
      return;
    }

    onProjectChange(
      removeElementFromScreen(project, project.activeScreenId, selectedElementId),
    );
    dragOriginalElementRef.current = null;
    setDragPreviewElement(null);
    setSelectedElementId(null);
  }

  const clearSaveStatusTimeout = useCallback(() => {
    if (saveStatusTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = null;
    }
  }, []);

  const showSavedStatus = useCallback(() => {
    setSaveState("saved");
    clearSaveStatusTimeout();
    saveStatusTimeoutRef.current = window.setTimeout(() => {
      saveStatusTimeoutRef.current = null;

      if (
        !saveInFlightRef.current &&
        latestProjectJsonRef.current === lastSavedProjectJsonRef.current
      ) {
        setSaveState("idle");
      }
    }, savedVisibleMs);
  }, [clearSaveStatusTimeout]);

  useEffect(() => clearSaveStatusTimeout, [clearSaveStatusTimeout]);

  const saveProjectWithStatus = useCallback(async (mode: SaveMode): Promise<boolean> => {
    if (saveInFlightRef.current) {
      return false;
    }

    const projectToSave = latestProjectRef.current;
    const projectToSaveJson = latestProjectJsonRef.current;
    const startedAt = performance.now();

    saveInFlightRef.current = true;
    clearSaveStatusTimeout();
    setSaveState("saving");

    try {
      const saved = mode === "saveAs"
        ? await projectStorage.saveProjectAs(projectToSave)
        : await projectStorage.saveProject(projectToSave);

      await waitRemainingTime(startedAt, minSavingVisibleMs);

      if (!saved) {
        setSaveState(projectToSaveJson === lastSavedProjectJsonRef.current ? "idle" : "dirty");
        return false;
      }

      lastSavedProjectJsonRef.current = projectToSaveJson;
      setLastSavedProjectJson(projectToSaveJson);

      if (latestProjectJsonRef.current === projectToSaveJson) {
        showSavedStatus();
      } else {
        setSaveState("dirty");
      }

      return true;
    } catch (error) {
      await waitRemainingTime(startedAt, minSavingVisibleMs);
      console.error(error);
      setSaveState("error");
      return false;
    } finally {
      saveInFlightRef.current = false;

      if (latestProjectJsonRef.current !== lastSavedProjectJsonRef.current) {
        window.setTimeout(() => {
          if (
            !saveInFlightRef.current &&
            latestProjectJsonRef.current !== lastSavedProjectJsonRef.current
          ) {
            void saveProjectWithStatus("save");
          }
        }, autosaveDelayMs);
      }
    }
  }, [clearSaveStatusTimeout, showSavedStatus]);

  const saveProject = useCallback(() => saveProjectWithStatus("save"), [saveProjectWithStatus]);
  const saveProjectAs = useCallback(() => saveProjectWithStatus("saveAs"), [saveProjectWithStatus]);

  const copyExportCode = useCallback(async () => {
    await navigator.clipboard.writeText(exportCode);
    setCopyStatus("copied");
  }, [exportCode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const shortcutKey = event.key.toLowerCase();
      const modKey = event.ctrlKey || event.metaKey;

      if (!modKey) {
        return;
      }

      if (shortcutKey === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          void saveProjectAs();
          return;
        }

        void saveProject();
        return;
      }

      if (shortcutKey === "e") {
        event.preventDefault();
        setShowExportPanel(true);
        setCopyStatus("idle");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveProject, saveProjectAs]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    setSaveState((currentState) => currentState === "error" ? currentState : "dirty");

    const timeoutId = window.setTimeout(() => {
      void saveProject();
    }, autosaveDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [hasUnsavedChanges, projectJson, saveProject]);

  useEffect(() => {
    if (!hasUnsavedChanges && !isSaving) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isSaving]);

  const requestExit = useCallback(() => {
    if (hasUnsavedChanges || isSaving) {
      setShowExitConfirmation(true);
      return;
    }

    onExit();
  }, [hasUnsavedChanges, isSaving, onExit]);

  const saveAndExit = useCallback(async () => {
    const saved = await saveProject();

    if (saved && latestProjectJsonRef.current === lastSavedProjectJsonRef.current) {
      onExit();
    }
  }, [onExit, saveProject]);

  const exitWithoutSaving = useCallback(() => {
    setShowExitConfirmation(false);
    onExit();
  }, [onExit]);

  const startPan = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const shouldPan = tool === "pan" || event.button === 1;

      if (!shouldPan) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanStart({ x: event.clientX, y: event.clientY });
      setPanOrigin(viewportOffsetRef.current);
    },
    [tool],
  );

  const movePan = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (panStart === null || panOrigin === null) {
      return;
    }

    pendingViewportOffsetRef.current = {
      x: panOrigin.x + event.clientX - panStart.x,
      y: panOrigin.y + event.clientY - panStart.y,
    };

    if (panFrameRef.current !== null) {
      return;
    }

    panFrameRef.current = window.requestAnimationFrame(() => {
      panFrameRef.current = null;
      if (pendingViewportOffsetRef.current !== null) {
        viewportOffsetRef.current = pendingViewportOffsetRef.current;
        setViewportOffset(pendingViewportOffsetRef.current);
      }
    });
  }, [panOrigin, panStart]);

  const endPan = useCallback(() => {
    if (panFrameRef.current !== null) {
      window.cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
    }

    if (pendingViewportOffsetRef.current !== null) {
      viewportOffsetRef.current = pendingViewportOffsetRef.current;
      setViewportOffset(pendingViewportOffsetRef.current);
      pendingViewportOffsetRef.current = null;
    }

    setPanStart(null);
    setPanOrigin(null);
  }, []);

  useEffect(() => {
    return () => {
      if (panFrameRef.current !== null) {
        window.cancelAnimationFrame(panFrameRef.current);
      }
    };
  }, []);

  const zoomViewport = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const artboard = artboardRef.current;

    if (artboard === null) {
      return;
    }

    const viewportRect = event.currentTarget.getBoundingClientRect();
    const cursor = {
      x: event.clientX - viewportRect.left,
      y: event.clientY - viewportRect.top,
    };
    const artboardOrigin = {
      x: artboard.offsetLeft,
      y: artboard.offsetTop,
    };
    const nextZoom = clampZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9));

    if (nextZoom === zoom) {
      return;
    }

    const currentOffset = viewportOffsetRef.current;
    const worldPoint = {
      x: (cursor.x - artboardOrigin.x - currentOffset.x) / zoom,
      y: (cursor.y - artboardOrigin.y - currentOffset.y) / zoom,
    };

    const nextOffset = {
      x: cursor.x - artboardOrigin.x - worldPoint.x * nextZoom,
      y: cursor.y - artboardOrigin.y - worldPoint.y * nextZoom,
    };

    viewportOffsetRef.current = nextOffset;
    setViewportOffset(nextOffset);
    setZoom(nextZoom);
  }, [zoom]);

  return (
    <main
      className="editor-shell"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Delete" && !isEditableTarget(event.target)) {
          removeSelectedElement();
        }
      }}
    >
      <div className="editor-toolbar" aria-label="Herramientas">
        <div className="toolbar-group">
          <button
            className={tool === "select" ? "active" : ""}
            type="button"
            aria-label="Seleccionar"
            data-tooltip="Seleccionar"
            onClick={() => setTool("select")}
          >
            <MousePointer2 />
          </button>
          <button
            className={tool === "pan" ? "active" : ""}
            type="button"
            aria-label="Mover"
            data-tooltip="Mover"
            onClick={() => setTool("pan")}
          >
            <Move />
          </button>
          <button
            className={tool === "rect" ? "active" : ""}
            type="button"
            aria-label="Rectángulo"
            data-tooltip="Rectángulo"
            onClick={() => setTool("rect")}
          >
            <RectangleHorizontal />
          </button>
          <button
            className={tool === "circle" ? "active" : ""}
            type="button"
            aria-label="Círculo"
            data-tooltip="Círculo"
            onClick={() => setTool("circle")}
          >
            <Circle />
          </button>
          <button
            className={tool === "line" ? "active" : ""}
            type="button"
            aria-label="Línea"
            data-tooltip="Línea"
            onClick={() => setTool("line")}
          >
            <Slash />
          </button>
          <button
            className={tool === "text" ? "active" : ""}
            type="button"
            aria-label="Texto"
            data-tooltip="Texto"
            onClick={() => setTool("text")}
          >
            <Type />
          </button>
          <button
            className={showPixelGrid ? "active" : ""}
            type="button"
            aria-label="Grilla de pixeles"
            aria-pressed={showPixelGrid}
            data-tooltip="Grilla"
            onClick={() => setShowPixelGrid((value) => !value)}
          >
            <Grid2x2 />
          </button>
        </div>
        <div className={`toolbar-status toolbar-status-${saveState}`} aria-live="polite">
          {isSaving ? <span className="status-spinner" aria-hidden="true" /> : null}
          <span>{statusMessage}</span>
        </div>
        <div className="toolbar-group toolbar-group-system">
          <button type="button" aria-label="Salir" data-tooltip="Salir" onClick={requestExit}>
            <LogOut />
          </button>
          <button
            className="toolbar-primary-action"
            type="button"
            aria-label={isSaving ? "Guardando" : "Guardar"}
            data-tooltip={isSaving ? "Guardando" : "Guardar"}
            disabled={isSaving}
            onClick={saveProject}
          >
            <HardDrive />
          </button>
          <button
            className="toolbar-secondary-action"
            type="button"
            aria-label={isSaving ? "Guardando" : "Guardar como"}
            data-tooltip={isSaving ? "Guardando" : "Guardar como"}
            disabled={isSaving}
            onClick={saveProjectAs}
          >
            <SaveAll />
          </button>
          <button
            type="button"
            aria-label="Exportar"
            data-tooltip="Exportar"
            onClick={() => {
              setShowExportPanel(true);
              setCopyStatus("idle");
            }}
          >
            <Download />
          </button>
        </div>
      </div>

      <ScreenListPanel
        project={project}
        editingScreenId={editingScreenId}
        editingScreenName={editingScreenName}
        onEditingScreenNameChange={setEditingScreenName}
        onSelectScreen={handleSelectScreen}
        onAddScreen={handleAddScreen}
        onStartRenameScreen={handleStartRenameScreen}
        onCommitRenameScreen={handleCommitRenameScreen}
        onCancelRenameScreen={handleCancelRenameScreen}
        onDuplicateScreen={handleDuplicateScreen}
        onRemoveScreen={handleRemoveScreen}
        onMoveScreen={handleMoveScreen}
      />

      {tool === "rect" || tool === "circle" ? (
        <div
          className="tool-options-panel"
          aria-label={tool === "rect" ? "Opciones de rectángulo" : "Opciones de círculo"}
        >
          <h2>Opciones</h2>
          <button
            className={rectFilled ? "active" : ""}
            type="button"
            aria-label={tool === "rect" ? "Rectángulos rellenos" : "Círculos rellenos"}
            aria-pressed={rectFilled}
            data-tooltip="Relleno"
            onClick={() => setRectFilled((value) => !value)}
          >
            <PaintBucket />
          </button>
        </div>
      ) : null}

      {tool === "text" ? (
        <div className="tool-options-panel tool-options-panel-wide" aria-label="Opciones de texto">
          <h2>Opciones</h2>
          <div className="editor-form">
            <label>
              Contenido
              <input
                type="text"
                value={textContent}
                onChange={(event) => setTextContent(event.currentTarget.value)}
              />
            </label>
            <TextFontFields font={textFont} onChange={setTextFont} />
          </div>
        </div>
      ) : null}

      <div
        className={`editor-viewport ${tool === "pan" || panStart !== null ? "is-panning" : ""}`}
        onPointerDownCapture={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onAuxClick={(event) => event.preventDefault()}
        onWheel={zoomViewport}
      >
        <div
          ref={artboardRef}
          className="editor-artboard"
          style={{
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
          }}
        >
          <ScreenPreview
            device={project.device}
            screen={activeScreen}
            selectedElementId={selectedElementId}
            draftElement={draftElement}
            dragPreviewElement={dragPreviewElement}
            showPixelGrid={showPixelGrid}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerUp}
            onElementPointerDown={tool === "select" ? handleElementPointerDown : undefined}
          />
        </div>
      </div>

      {selectedElement !== null ? (
        <aside className="floating-inspector">
          <h2>{getElementLabel(selectedElement)}</h2>
          {selectedElement.type === "rect" ? (
            <div className="editor-form">
              <div className="field-grid">
                <NumberField
                  label="X"
                  value={selectedElement.x}
                  onChange={(x) => updateSelectedElement({ ...selectedElement, x })}
                />
                <NumberField
                  label="Y"
                  value={selectedElement.y}
                  onChange={(y) => updateSelectedElement({ ...selectedElement, y })}
                />
                <NumberField
                  label="Ancho"
                  value={selectedElement.width}
                  onChange={(width) =>
                    updateSelectedElement({ ...selectedElement, width })
                  }
                />
                <NumberField
                  label="Alto"
                  value={selectedElement.height}
                  onChange={(height) =>
                    updateSelectedElement({ ...selectedElement, height })
                  }
                />
              </div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedElement.filled}
                  onChange={(event) =>
                    updateSelectedElement({
                      ...selectedElement,
                      filled: event.currentTarget.checked,
                    })
                  }
                />
                Relleno
              </label>
            </div>
          ) : selectedElement.type === "circle" ? (
            <div className="editor-form">
              <div className="field-grid">
                <NumberField
                  label="X"
                  value={selectedElement.x}
                  onChange={(x) => updateSelectedElement({ ...selectedElement, x })}
                />
                <NumberField
                  label="Y"
                  value={selectedElement.y}
                  onChange={(y) => updateSelectedElement({ ...selectedElement, y })}
                />
                <NumberField
                  label="Radio"
                  value={selectedElement.radius}
                  onChange={(radius) => updateSelectedElement({ ...selectedElement, radius })}
                />
              </div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedElement.filled}
                  onChange={(event) =>
                    updateSelectedElement({
                      ...selectedElement,
                      filled: event.currentTarget.checked,
                    })
                  }
                />
                Relleno
              </label>
            </div>
          ) : selectedElement.type === "line" ? (
            <div className="field-grid">
              <NumberField
                label="X1"
                value={selectedElement.x1}
                onChange={(x1) => updateSelectedElement({ ...selectedElement, x1 })}
              />
              <NumberField
                label="Y1"
                value={selectedElement.y1}
                onChange={(y1) => updateSelectedElement({ ...selectedElement, y1 })}
              />
              <NumberField
                label="X2"
                value={selectedElement.x2}
                onChange={(x2) => updateSelectedElement({ ...selectedElement, x2 })}
              />
              <NumberField
                label="Y2"
                value={selectedElement.y2}
                onChange={(y2) => updateSelectedElement({ ...selectedElement, y2 })}
              />
            </div>
          ) : (
            <div className="editor-form">
              <div className="field-grid">
                <NumberField
                  label="X"
                  value={selectedElement.x}
                  onChange={(x) => updateSelectedElement({ ...selectedElement, x })}
                />
                <NumberField
                  label="Y"
                  value={selectedElement.y}
                  onChange={(y) => updateSelectedElement({ ...selectedElement, y })}
                />
              </div>
              <label>
                Contenido
                <input
                  type="text"
                  value={selectedElement.text}
                  onChange={(event) =>
                    updateSelectedElement({ ...selectedElement, text: event.currentTarget.value })
                  }
                />
              </label>
              <TextFontFields
                font={selectedElement.font}
                onChange={(font) => updateSelectedElement({ ...selectedElement, font })}
              />
            </div>
          )}
          <button className="danger-button" type="button" onClick={removeSelectedElement}>
            Borrar
          </button>
        </aside>
      ) : null}

      {showExportPanel ? (
        <aside className="export-panel">
          <h2>Código U8G2</h2>
          <textarea readOnly value={exportCode} />
          <div className="export-actions">
            <button type="button" onClick={copyExportCode}>
              {copyStatus === "copied" ? "Copiado" : "Copiar"}
            </button>
            <button type="button" onClick={() => setShowExportPanel(false)}>
              Cerrar
            </button>
          </div>
        </aside>
      ) : null}

      {showExitConfirmation ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirm-exit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-exit-title"
          >
            <h2 id="confirm-exit-title">Hay cambios sin guardar</h2>
            <p>
              {isSaving
                ? "El proyecto todavía se está guardando. Espera a que termine o sal sin guardar."
                : "Guarda el proyecto antes de salir o descarta los cambios."}
            </p>
            <div className="confirm-exit-actions">
              <button type="button" onClick={() => setShowExitConfirmation(false)}>
                Cancelar
              </button>
              <button type="button" onClick={exitWithoutSaving}>
                Salir sin guardar
              </button>
              <button
                className="toolbar-primary-action"
                type="button"
                disabled={isSaving}
                onClick={saveAndExit}
              >
                Guardar y salir
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function getSaveStatusMessage(saveState: SaveState, hasUnsavedChanges: boolean): string {
  if (saveState === "saving") {
    return "Guardando…";
  }

  if (saveState === "saved") {
    return "Guardado";
  }

  if (saveState === "error") {
    return "Error al guardar";
  }

  if (hasUnsavedChanges) {
    return "Cambios sin guardar";
  }

  return "";
}

function waitRemainingTime(startedAt: number, minimumDurationMs: number): Promise<void> {
  const remainingMs = minimumDurationMs - (performance.now() - startedAt);

  if (remainingMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => window.setTimeout(resolve, remainingMs));
}

function TextFontFields({ font, onChange }: { font: string; onChange: (font: string) => void }) {
  const variant = getU8g2FontVariant(font);
  const family = getU8g2FontFamily(variant.family);
  const purposes = family?.purposes ?? [variant.purpose];
  const charsets = family?.charsets ?? [variant.charset];

  return (
    <div className="editor-form">
      <label>
        Familia
        <select
          value={variant.family}
          onChange={(event) => onChange(resolveU8g2FontVariant({ currentFont: font, family: event.currentTarget.value }))}
        >
          {u8g2FontFamilies.map((fontFamily) => (
            <option key={fontFamily.family} value={fontFamily.family}>
              {fontFamily.family}
            </option>
          ))}
        </select>
      </label>

      {purposes.length > 1 ? (
        <label>
          Estilo
          <select
            value={variant.purpose}
            onChange={(event) =>
              onChange(
                resolveU8g2FontVariant({
                  currentFont: font,
                  purpose: event.currentTarget.value as U8g2FontPurpose,
                }),
              )
            }
          >
            {purposes.map((purpose) => (
              <option key={purpose} value={purpose}>
                {getPurposeLabel(purpose)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {charsets.length > 1 ? (
        <label>
          Caracteres
          <select
            value={variant.charset}
            onChange={(event) =>
              onChange(
                resolveU8g2FontVariant({
                  currentFont: font,
                  charset: event.currentTarget.value as U8g2FontCharset,
                }),
              )
            }
          >
            {charsets.map((charset) => (
              <option key={charset} value={charset}>
                {getCharsetLabel(charset)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

function getElementLabel(element: DesignElement): string {
  switch (element.type) {
    case "rect":
      return "Rectángulo";
    case "circle":
      return "Círculo";
    case "line":
      return "Línea";
    case "text":
      return "Texto";
  }
}

function getDraftElement(
  tool: Tool,
  start: Point | null,
  current: Point | null,
  rectFilled: boolean,
  textContent: string,
  textFont: string,
): DraftElement | null {
  if (start === null || current === null) {
    return null;
  }

  if (tool === "rect") {
    return {
      type: "rect",
      filled: rectFilled,
      ...createRectFromPoints(start, current),
    };
  }

  if (tool === "circle") {
    return {
      type: "circle",
      filled: rectFilled,
      ...createCircleFromPoints(start, current),
    };
  }

  if (tool === "line") {
    return {
      type: "line",
      x1: start.x,
      y1: start.y,
      x2: current.x,
      y2: current.y,
    };
  }

  if (tool === "text") {
    return {
      type: "text",
      x: current.x,
      y: current.y,
      text: textContent,
      font: textFont,
    };
  }

  return null;
}

function createRectFromPoints(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x) + 1,
    height: Math.abs(end.y - start.y) + 1,
  };
}

function createCircleFromPoints(start: Point, end: Point) {
  return {
    x: start.x,
    y: start.y,
    radius: Math.round(Math.hypot(end.x - start.x, end.y - start.y)),
  };
}

function getNextScreenName(project: Project): string {
  let index = project.screens.length + 1;

  while (project.screens.some((screen) => screen.name === `Screen ${index}`)) {
    index++;
  }

  return `Screen ${index}`;
}

function getDuplicateScreenName(name: string, project: Project): string {
  let index = 1;
  let candidate = `${name} copia`;

  while (project.screens.some((screen) => screen.name === candidate)) {
    index++;
    candidate = `${name} copia ${index}`;
  }

  return candidate;
}

function cloneElementWithNewId(element: DesignElement): DesignElement {
  switch (element.type) {
    case "rect":
      return {
        ...element,
        id: createId("rect"),
      };
    case "circle":
      return {
        ...element,
        id: createId("circle"),
      };
    case "line":
      return {
        ...element,
        id: createId("line"),
      };
    case "text":
      return {
        ...element,
        id: createId("text"),
      };
  }
}

function clampZoom(value: number): number {
  return Math.max(0.25, Math.min(8, value));
}
