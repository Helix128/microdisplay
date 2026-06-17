import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Circle,
  Copy,
  Download,
  Grid2x2,
  HardDrive,
  ImageIcon,
  LogOut,
  MousePointer2,
  Move,
  PaintBucket,
  Pencil,
  Plus,
  RectangleHorizontal,
  SaveAll,
  Sidebar,
  Slash,
  Trash2,
  Type,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
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
  bringElementForward,
  bringElementToFront,
  ditherModes,
  duplicateScreen,
  fitSizeWithin,
  getActiveScreen,
  removeElementFromScreen,
  removeScreen,
  renameProject,
  renameScreen,
  reorderScreen,
  resizeModes,
  rgbaToXbmBase64,
  sendElementBackward,
  sendElementToBack,
  setActiveScreen,
  sizeFromHeight,
  sizeFromWidth,
  type CircleElement,
  type DesignElement,
  type DitherMode,
  type ImageElement,
  type LineElement,
  type Project,
  type RectElement,
  type ResizeMode,
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
import { importImageSource, renderImageSourceRgba } from "../platform/browser/imageImport";
import { projectStorage } from "../platform/projectStorage";
import { createId } from "../utils/id";
import { ElementListPanel } from "./ElementListPanel";

type Tool = "select" | "pan" | "rect" | "circle" | "line" | "text" | "image";

type CopyStatus = "idle" | "copied";
type SaveState = "idle" | "saved" | "dirty" | "saving" | "error";
type SaveMode = "save" | "saveAs";

const autosaveDelayMs = 1000;
const minSavingVisibleMs = 450;
const savedVisibleMs = 1800;
const imageReprocessDelayMs = 120;
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
  const [viewportOffset, setViewportOffset] = useState<Point>(() => {
    // Centrar la primera pantalla en el viewport al montar el editor.
    // El artboard tiene padding: 100px, y la pantalla mide device.width*4 x device.height*4 px.
    const artboardPadding = 100;
    const cardW = project.device.width * 4;
    const cardH = project.device.height * 4 + 32; // +32 por cabecera
    return {
      x: Math.round(window.innerWidth / 2 - artboardPadding - cardW / 2),
      y: Math.round(window.innerHeight / 2 - artboardPadding - cardH / 2),
    };
  });
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [panOrigin, setPanOrigin] = useState<Point | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [showPixelGrid, setShowPixelGrid] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    elementId: string | null;
  }>({ visible: false, x: 0, y: 0, elementId: null });
  const [rectFilled, setRectFilled] = useState(false);
  const [textContent, setTextContent] = useState("Texto");
  const [textFont, setTextFont] = useState(defaultU8g2FontName);
  const [imageImportError, setImageImportError] = useState<string | null>(null);
  const [dragPreviewElement, setDragPreviewElement] = useState<DesignElement | null>(null);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [editingScreenName, setEditingScreenName] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(project.name);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedProjectJson, setLastSavedProjectJson] = useState(() => JSON.stringify(project));
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const artboardRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
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
  const imageReprocessTimeoutRef = useRef<number | null>(null);
  const imageReprocessVersionRef = useRef(0);

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

  useEffect(() => () => {
    if (imageReprocessTimeoutRef.current !== null) {
      window.clearTimeout(imageReprocessTimeoutRef.current);
    }
  }, []);

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

  const handleStartRenameProject = useCallback(() => {
    setEditingProjectName(project.name);
    setIsEditingProjectName(true);
  }, [project.name]);

  const handleCommitRenameProject = useCallback(() => {
    const name = editingProjectName.trim();
    const nextName = name || project.name;

    if (nextName !== project.name) {
      onProjectChange(renameProject(project, nextName));
    }
    setIsEditingProjectName(false);
  }, [editingProjectName, onProjectChange, project]);

  const handleCancelRenameProject = useCallback(() => {
    setIsEditingProjectName(false);
  }, []);

  const handleProjectNameKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleCommitRenameProject();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancelRenameProject();
      }
    },
    [handleCommitRenameProject, handleCancelRenameProject],
  );

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
          case "image":
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

  const updateImageElement = useCallback(
    (element: ImageElement, changes: Partial<Pick<ImageElement, "x" | "y" | "width" | "height" | "threshold" | "brightness" | "invert" | "ditherMode" | "resizeMode" | "cropToScreen">>) => {
      const nextElement = applyImageChanges(element, changes);

      if (
        changes.width === undefined &&
        changes.height === undefined &&
        changes.threshold === undefined &&
        changes.brightness === undefined &&
        changes.invert === undefined &&
        changes.ditherMode === undefined
      ) {
        updateSelectedElement(nextElement);
        return;
      }

      updateSelectedElement(nextElement);

      if (imageReprocessTimeoutRef.current !== null) {
        window.clearTimeout(imageReprocessTimeoutRef.current);
      }

      const version = imageReprocessVersionRef.current + 1;
      imageReprocessVersionRef.current = version;
      imageReprocessTimeoutRef.current = window.setTimeout(() => {
        imageReprocessTimeoutRef.current = null;

        void renderImageSourceRgba(nextElement, nextElement.width, nextElement.height)
          .then((rgba) => {
            if (imageReprocessVersionRef.current !== version) {
              return;
            }

            const latestProject = latestProjectRef.current;
            const latestScreen = getActiveScreen(latestProject);
            const latestElement = latestScreen.elements.find((element) => element.id === nextElement.id);

            if (latestElement?.type !== "image") {
              return;
            }

            onProjectChange(updateElementInScreen(latestProject, latestProject.activeScreenId, {
              ...latestElement,
              bitmap: rgbaToXbmBase64(rgba, {
                threshold: nextElement.threshold,
                brightness: nextElement.brightness,
                invert: nextElement.invert,
                ditherMode: nextElement.ditherMode,
              }),
            }));
          })
          .catch(() => setImageImportError("No se pudo reprocesar la imagen."));
      }, imageReprocessDelayMs);
    },
    [onProjectChange, updateSelectedElement],
  );

  const importImageFile = useCallback(
    (file: File) => {
      setImageImportError(null);

      void importImageSource(file, {
        width: Math.min(project.device.width * 4, 512),
        height: Math.min(project.device.height * 4, 512),
      })
        .then(async (source) => {
          const size = fitSizeWithin(
            { width: source.sourceWidth, height: source.sourceHeight },
            { width: Math.max(1, project.device.width * 0.5), height: Math.max(1, project.device.height * 0.5) },
          );
          const threshold = 127;
          const invert = false;
          const brightness = 0;
          const ditherMode: DitherMode = "threshold";
          const resizeMode: ResizeMode = "lock-aspect";
          const cropToScreen = false;
          const rgba = await renderImageSourceRgba(source, size.width, size.height);
          const element: ImageElement = {
            id: createId("image"),
            type: "image",
            x: Math.floor((project.device.width - size.width) / 2),
            y: Math.floor((project.device.height - size.height) / 2),
            width: size.width,
            height: size.height,
            ...source,
            threshold,
            brightness,
            invert,
            ditherMode,
            resizeMode,
            cropToScreen,
            bitmapEncoding: "xbm-base64",
            bitmap: rgbaToXbmBase64(rgba, { threshold, brightness, invert, ditherMode }),
          };

          onProjectChange(addElementToScreen(project, project.activeScreenId, element));
          setSelectedElementId(element.id);
          setTool("select");
        })
        .catch(() => setImageImportError("No se pudo importar la imagen."));
    },
    [onProjectChange, project],
  );

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";

      if (file !== null) {
        importImageFile(file);
      }
    },
    [importImageFile],
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

  function bringToFront(elementId: string) {
    onProjectChange(
      bringElementToFront(project, project.activeScreenId, elementId)
    );
  }

  function bringForward(elementId: string) {
    onProjectChange(
      bringElementForward(project, project.activeScreenId, elementId)
    );
  }

  function sendBackward(elementId: string) {
    onProjectChange(
      sendElementBackward(project, project.activeScreenId, elementId)
    );
  }

  function sendToBack(elementId: string) {
    onProjectChange(
      sendElementToBack(project, project.activeScreenId, elementId)
    );
  }

  function removeElement(elementId: string) {
    onProjectChange(
      removeElementFromScreen(project, project.activeScreenId, elementId),
    );
    if (selectedElementId === elementId) {
      dragOriginalElementRef.current = null;
      setDragPreviewElement(null);
      setSelectedElementId(null);
    }
  }

  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      elementId: null
    });
  }, []);

  const handleElementContextMenu = useCallback((elementId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementId(elementId);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      elementId
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => prev.visible ? { ...prev, visible: false } : prev);
  }, []);

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
        return;
      }

      if (shortcutKey === "b") {
        event.preventDefault();
        setShowLeftSidebar((show) => !show);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveProject, saveProjectAs]);

  useEffect(() => {
    function handleGlobalClick() {
      closeContextMenu();
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [closeContextMenu]);

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
        <div className="toolbar-group toolbar-group-project">
          {isEditingProjectName ? (
            <input
              className="project-name-input"
              value={editingProjectName}
              onChange={(event) => setEditingProjectName(event.currentTarget.value)}
              onBlur={handleCommitRenameProject}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
            />
          ) : (
            <h1
              className="project-name"
              onDoubleClick={handleStartRenameProject}
              title="Doble clic para renombrar"
            >
              {project.name}
            </h1>
          )}
          {!isEditingProjectName && (
            <button
              type="button"
              className="project-rename-btn"
              aria-label="Renombrar proyecto"
              onClick={handleStartRenameProject}
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
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
            className={tool === "image" ? "active" : ""}
            type="button"
            aria-label="Imagen"
            data-tooltip="Imagen"
            onClick={() => {
              setTool("image");
              imageFileInputRef.current?.click();
            }}
          >
            <ImageIcon />
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
          <button
            className={showLeftSidebar ? "active" : ""}
            type="button"
            aria-label="Barra lateral"
            aria-pressed={showLeftSidebar}
            data-tooltip="Barra lateral (Ctrl+B)"
            onClick={() => setShowLeftSidebar((value) => !value)}
          >
            <Sidebar />
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

      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageFileChange}
      />
      {imageImportError !== null ? <div className="tool-options-panel form-error">{imageImportError}</div> : null}

      {showLeftSidebar && (
        <div className="left-sidebar">
          <ElementListPanel
            elements={activeScreen.elements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onMoveElementForward={bringForward}
            onMoveElementBackward={sendBackward}
            onRemoveElement={removeElement}
          />
        </div>
      )}

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
        onContextMenu={handleCanvasContextMenu}
      >
        <div
          ref={artboardRef}
          className="editor-artboard"
          style={{
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
          }}
        >
          {project.screens.map((screen, index) => {
            const isActive = screen.id === project.activeScreenId;
            const cardW = project.device.width * 4;
            const cardH = project.device.height * 4;
            return (
              <div
                key={screen.id}
                className={`screen-workspace-card${isActive ? " active" : ""}`}
                style={{ width: cardW }}
                onPointerDown={() => {
                  if (!isActive) handleSelectScreen(screen.id);
                }}
              >
                {/* Cabecera */}
                <div className="screen-artboard-header">
                  {editingScreenId === screen.id ? (
                    <input
                      className="screen-name-input screen-artboard-name-input"
                      type="text"
                      value={editingScreenName}
                      autoFocus
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingScreenName(e.currentTarget.value)}
                      onBlur={() => handleCommitRenameScreen(screen)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCommitRenameScreen(screen); }
                        if (e.key === "Escape") { e.preventDefault(); handleCancelRenameScreen(); }
                      }}
                    />
                  ) : (
                    <span
                      className="screen-artboard-name"
                      title="Doble click para renombrar"
                      onPointerDown={(e) => e.stopPropagation()}
                      onDoubleClick={() => handleStartRenameScreen(screen)}
                    >
                      {screen.name}
                    </span>
                  )}
                  <div className="screen-artboard-actions" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Mover izquierda"
                      title="Mover izquierda"
                      disabled={index === 0}
                      onClick={() => handleMoveScreen(screen.id, index - 1)}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover derecha"
                      title="Mover derecha"
                      disabled={index === project.screens.length - 1}
                      onClick={() => handleMoveScreen(screen.id, index + 1)}
                    >
                      <ChevronRight size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Duplicar pantalla"
                      title="Duplicar"
                      onClick={() => handleDuplicateScreen(screen)}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Borrar pantalla"
                      title="Borrar"
                      className="danger-action"
                      disabled={project.screens.length <= 1}
                      onClick={() => handleRemoveScreen(screen)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {/* Preview */}
                <div className="screen-artboard-canvas" style={{ width: cardW, height: cardH }}>
                  <ScreenPreview
                    device={project.device}
                    screen={screen}
                    selectedElementId={isActive ? selectedElementId : null}
                    draftElement={isActive ? draftElement : null}
                    dragPreviewElement={isActive ? dragPreviewElement : null}
                    showPixelGrid={isActive && showPixelGrid}
                    onPointerDown={isActive ? handlePreviewPointerDown : undefined}
                    onPointerMove={isActive ? handlePreviewPointerMove : undefined}
                    onPointerUp={isActive ? handlePreviewPointerUp : undefined}
                    onElementPointerDown={isActive && tool === "select" ? handleElementPointerDown : undefined}
                    onElementContextMenu={isActive ? handleElementContextMenu : undefined}
                  />
                </div>
              </div>
            );
          })}
          {/* Tarjeta para añadir nueva pantalla */}
          <div
            className="screen-add-card"
            style={{
              width: project.device.width * 4,
              height: project.device.height * 4,
            }}
            onClick={handleAddScreen}
            title="Añadir nueva pantalla"
          >
            <div className="add-card-content">
              <Plus size={28} />
              <span>Nueva pantalla</span>
            </div>
          </div>
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
          ) : selectedElement.type === "image" ? (
            <div className="editor-form">
              <div className="field-grid">
                <NumberField
                  label="X"
                  value={selectedElement.x}
                  onChange={(x) => updateImageElement(selectedElement, { x })}
                />
                <NumberField
                  label="Y"
                  value={selectedElement.y}
                  onChange={(y) => updateImageElement(selectedElement, { y })}
                />
                <NumberField
                  label="Ancho"
                  value={selectedElement.width}
                  onChange={(width) => updateImageElement(selectedElement, { width: clampImageSize(width) })}
                />
                <NumberField
                  label="Alto"
                  value={selectedElement.height}
                  onChange={(height) => updateImageElement(selectedElement, { height: clampImageSize(height) })}
                />
              </div>
              {selectedElement.ditherMode === "floyd-steinberg" ? (
                <BrightnessField
                  value={selectedElement.brightness}
                  onChange={(brightness) => updateImageElement(selectedElement, { brightness })}
                />
              ) : (
                <ThresholdField
                  value={selectedElement.threshold}
                  onChange={(threshold) => updateImageElement(selectedElement, { threshold })}
                />
              )}
              <label>
                Dithering
                <select
                  value={selectedElement.ditherMode}
                  onChange={(event) => updateImageElement(selectedElement, { ditherMode: event.currentTarget.value as DitherMode })}
                >
                  {ditherModes.map((mode) => (
                    <option key={mode} value={mode}>{getDitherModeLabel(mode)}</option>
                  ))}
                </select>
              </label>
              <label>
                Proporción
                <select
                  value={selectedElement.resizeMode}
                  onChange={(event) => updateImageElement(selectedElement, { resizeMode: event.currentTarget.value as ResizeMode })}
                >
                  {resizeModes.map((mode) => (
                    <option key={mode} value={mode}>{getResizeModeLabel(mode)}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedElement.invert}
                  onChange={(event) => updateImageElement(selectedElement, { invert: event.currentTarget.checked })}
                />
                Invertir
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedElement.cropToScreen}
                  onChange={(event) => updateImageElement(selectedElement, { cropToScreen: event.currentTarget.checked })}
                />
                Borrar zonas fuera de pantalla al exportar
              </label>
              <div className="tool-options-actions">
                <button type="button" onClick={() => updateImageElement(selectedElement, getCenteredImagePosition(selectedElement, project.device))}>
                  Centrar
                </button>
                <button type="button" onClick={() => updateImageElement(selectedElement, getHalfScreenImageSize(selectedElement, project.device))}>
                  Ajustar 50%
                </button>
              </div>
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

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.elementId ? (
            (() => {
              const elementId = contextMenu.elementId;
              const index = activeScreen.elements.findIndex((el) => el.id === elementId);
              const isFirst = index === 0;
              const isLast = index === activeScreen.elements.length - 1;

              return (
                <>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => {
                      bringToFront(elementId);
                      closeContextMenu();
                    }}
                  >
                    <ChevronsUp size={14} /> Traer al frente
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => {
                      bringForward(elementId);
                      closeContextMenu();
                    }}
                  >
                    <ChevronUp size={14} /> Subir una capa
                  </button>
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => {
                      sendBackward(elementId);
                      closeContextMenu();
                    }}
                  >
                    <ChevronDown size={14} /> Bajar una capa
                  </button>
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => {
                      sendToBack(elementId);
                      closeContextMenu();
                    }}
                  >
                    <ChevronsDown size={14} /> Enviar al fondo
                  </button>
                  <div className="context-menu-divider" />
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => {
                      removeElement(elementId);
                      closeContextMenu();
                    }}
                  >
                    <Trash2 size={14} /> Borrar
                  </button>
                </>
              );
            })()
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedElementId(null);
                closeContextMenu();
              }}
            >
              Deseleccionar todo
            </button>
          )}
        </div>
      )}
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

function ThresholdField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label>
      Umbral
      <div className="threshold-field">
        <input
          type="range"
          min={0}
          max={255}
          value={value}
          onChange={(event) => onChange(clampByte(event.currentTarget.valueAsNumber))}
        />
        <input
          type="number"
          min={0}
          max={255}
          value={value}
          onChange={(event) => onChange(clampByte(event.currentTarget.valueAsNumber))}
        />
      </div>
    </label>
  );
}

function BrightnessField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label>
      Brillo
      <div className="threshold-field">
        <input
          type="range"
          min={-128}
          max={128}
          value={value}
          onChange={(event) => onChange(clampBrightness(event.currentTarget.valueAsNumber))}
        />
        <input
          type="number"
          min={-128}
          max={128}
          value={value}
          onChange={(event) => onChange(clampBrightness(event.currentTarget.valueAsNumber))}
        />
      </div>
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
    case "image":
      return "Imagen";
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

function getDitherModeLabel(mode: DitherMode): string {
  switch (mode) {
    case "threshold":
      return "Desactivado";
    case "ordered":
      return "Ordenado";
    case "floyd-steinberg":
      return "Floyd-Steinberg";
  }
}

function getResizeModeLabel(mode: ResizeMode): string {
  switch (mode) {
    case "free":
      return "Libre";
    case "lock-aspect":
      return "Conservar proporción";
    case "lock-aspect-width":
      return "Alto sigue ancho";
    case "lock-aspect-height":
      return "Ancho sigue alto";
  }
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
    case "image":
      return {
        ...element,
        id: createId("image"),
      };
  }
}

function applyImageChanges(
  element: ImageElement,
  changes: Partial<Pick<ImageElement, "x" | "y" | "width" | "height" | "threshold" | "brightness" | "invert" | "ditherMode" | "resizeMode" | "cropToScreen">>,
): ImageElement {
  const nextElement = { ...element, ...changes };
  const sourceSize = { width: element.sourceWidth, height: element.sourceHeight };

  if (changes.width !== undefined && (nextElement.resizeMode === "lock-aspect" || nextElement.resizeMode === "lock-aspect-width")) {
    const size = sizeFromWidth(sourceSize, clampImageSize(changes.width));
    nextElement.width = clampImageSize(size.width);
    nextElement.height = clampImageSize(size.height);
  }

  if (changes.height !== undefined && (nextElement.resizeMode === "lock-aspect" || nextElement.resizeMode === "lock-aspect-height")) {
    const size = sizeFromHeight(sourceSize, clampImageSize(changes.height));
    nextElement.width = clampImageSize(size.width);
    nextElement.height = clampImageSize(size.height);
  }

  return nextElement;
}

function getCenteredImagePosition(element: ImageElement, device: { width: number; height: number }): Pick<ImageElement, "x" | "y"> {
  return {
    x: Math.floor((device.width - element.width) / 2),
    y: Math.floor((device.height - element.height) / 2),
  };
}

function getHalfScreenImageSize(element: ImageElement, device: { width: number; height: number }): Pick<ImageElement, "x" | "y" | "width" | "height"> {
  const size = fitSizeWithin(
    { width: element.sourceWidth, height: element.sourceHeight },
    { width: Math.max(1, device.width * 0.5), height: Math.max(1, device.height * 0.5) },
  );

  return {
    ...size,
    x: Math.floor((device.width - size.width) / 2),
    y: Math.floor((device.height - size.height) / 2),
  };
}

function clampImageSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.round(value));
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampBrightness(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-128, Math.min(128, Math.round(value)));
}

function clampZoom(value: number): number {
  return Math.max(0.25, Math.min(8, value));
}
