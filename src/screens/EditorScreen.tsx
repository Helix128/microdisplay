import {
  HardDrive,
  SaveAll,
  Download,
  LogOut,
  MousePointer2,
  Move,
  Slash,
  RectangleHorizontal,
} from "lucide-react";
import { type PointerEvent, type WheelEvent, useEffect, useRef, useState } from "react";
import {
  addElementToScreen,
  getActiveScreen,
  removeElementFromScreen,
  type DesignElement,
  type LineElement,
  type Project,
  type RectElement,
  updateElementInScreen,
} from "../core";
import {
  type DraftElement,
  type Point,
  ScreenPreview,
} from "../preview/ScreenPreview";
import { u8g2 } from "../exporters";
import { projectStorage } from "../platform/projectStorage";
import { createId } from "../utils/id";

type Tool = "select" | "pan" | "rect" | "line";

type CopyStatus = "idle" | "copied";

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
  const artboardRef = useRef<HTMLDivElement>(null);

  const activeScreen = getActiveScreen(project);
  const selectedElement =
    activeScreen.elements.find((element) => element.id === selectedElementId) ?? null;
  const draftElement = getDraftElement(tool, dragStart, dragCurrent);
  const exportCode = u8g2.generateProject(project);

  function handlePreviewPointerDown(point: Point) {
    if (tool === "select") {
      setSelectedElementId(null);
      return;
    }

    if (tool === "rect" || tool === "line") {
      setDragStart(point);
      setDragCurrent(point);
    }
  }

  function handlePreviewPointerMove(point: Point) {
    if (dragStart !== null) {
      setDragCurrent(point);
    }
  }

  function handlePreviewPointerUp(point: Point) {
    if (dragStart === null) {
      return;
    }

    if (tool === "rect") {
      const rect = createRectFromPoints(dragStart, point);

      if (rect.width > 0 && rect.height > 0) {
        const element: RectElement = {
          id: createId("rect"),
          type: "rect",
          filled: false,
          ...rect,
        };

        onProjectChange(addElementToScreen(project, project.activeScreenId, element));
        setSelectedElementId(element.id);
      }
    }

    if (tool === "line" && (dragStart.x !== point.x || dragStart.y !== point.y)) {
      const element: LineElement = {
        id: createId("line"),
        type: "line",
        x1: dragStart.x,
        y1: dragStart.y,
        x2: point.x,
        y2: point.y,
      };

      onProjectChange(addElementToScreen(project, project.activeScreenId, element));
      setSelectedElementId(element.id);
    }

    setDragStart(null);
    setDragCurrent(null);
  }

  function handleElementPointerDown(elementId: string) {
    if (tool === "select") {
      setSelectedElementId(elementId);
    }
  }

  function updateSelectedElement(element: DesignElement) {
    onProjectChange(updateElementInScreen(project, project.activeScreenId, element));
  }

  function removeSelectedElement() {
    if (selectedElementId === null) {
      return;
    }

    onProjectChange(
      removeElementFromScreen(project, project.activeScreenId, selectedElementId),
    );
    setSelectedElementId(null);
  }

  async function saveProject() {
    try {
      await projectStorage.saveProject(project);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo guardar el proyecto.");
    }
  }

  async function saveProjectAs() {
    try {
      await projectStorage.saveProjectAs(project);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo guardar el proyecto.");
    }
  }

  async function copyExportCode() {
    await navigator.clipboard.writeText(exportCode);
    setCopyStatus("copied");
  }

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
  }, [project]);

  function startPan(event: PointerEvent<HTMLDivElement>) {
    const shouldPan = tool === "pan" || event.button === 1;

    if (!shouldPan) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanStart({ x: event.clientX, y: event.clientY });
    setPanOrigin(viewportOffset);
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (panStart === null || panOrigin === null) {
      return;
    }

    setViewportOffset({
      x: panOrigin.x + event.clientX - panStart.x,
      y: panOrigin.y + event.clientY - panStart.y,
    });
  }

  function endPan() {
    setPanStart(null);
    setPanOrigin(null);
  }

  function zoomViewport(event: WheelEvent<HTMLDivElement>) {
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

    const worldPoint = {
      x: (cursor.x - artboardOrigin.x - viewportOffset.x) / zoom,
      y: (cursor.y - artboardOrigin.y - viewportOffset.y) / zoom,
    };

    setViewportOffset({
      x: cursor.x - artboardOrigin.x - worldPoint.x * nextZoom,
      y: cursor.y - artboardOrigin.y - worldPoint.y * nextZoom,
    });
    setZoom(nextZoom);
  }

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
            className={tool === "line" ? "active" : ""}
            type="button"
            aria-label="Línea"
            data-tooltip="Línea"
            onClick={() => setTool("line")}
          >
            <Slash />
          </button>
        </div>
        <div className="toolbar-group toolbar-group-system">
          <button type="button" aria-label="Salir" data-tooltip="Salir" onClick={onExit}>
            <LogOut />
          </button>
          <button
            className="toolbar-primary-action"
            type="button"
            aria-label="Guardar"
            data-tooltip="Guardar"
            onClick={saveProject}
          >
            <HardDrive />
          </button>
          <button
            className="toolbar-secondary-action"
            type="button"
            aria-label="Guardar como"
            data-tooltip="Guardar como"
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
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerUp}
            onElementPointerDown={handleElementPointerDown}
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
          ) : (
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
    </main>
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
    case "line":
      return "Línea";
  }
}

function getDraftElement(
  tool: Tool,
  start: Point | null,
  current: Point | null,
): DraftElement | null {
  if (start === null || current === null) {
    return null;
  }

  if (tool === "rect") {
    return {
      type: "rect",
      filled: false,
      ...createRectFromPoints(start, current),
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

  return null;
}

function createRectFromPoints(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function clampZoom(value: number): number {
  return Math.max(0.25, Math.min(8, value));
}
