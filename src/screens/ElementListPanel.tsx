import {
  ChevronDown,
  ChevronUp,
  Circle,
  ImageIcon,
  RectangleHorizontal,
  Slash,
  Trash2,
  Type,
} from "lucide-react";
import type { DesignElement } from "../core";

type ElementListPanelProps = {
  elements: DesignElement[];
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
  onMoveElementForward: (elementId: string) => void;
  onMoveElementBackward: (elementId: string) => void;
  onRemoveElement: (elementId: string) => void;
};

export function ElementListPanel({
  elements,
  selectedElementId,
  onSelectElement,
  onMoveElementForward,
  onMoveElementBackward,
  onRemoveElement,
}: ElementListPanelProps) {
  // Render layers in reverse order so the frontmost element is at the top of the list (Figma Style)
  const reversedElements = [...elements].reverse();

  return (
    <aside className="element-list-panel" aria-label="Elementos de la pantalla">
      <div className="element-list-header">
        <h2>Elementos</h2>
        <span className="element-count">
          {elements.length} {elements.length === 1 ? "elemento" : "elementos"}
        </span>
      </div>
      <div className="element-list">
        {elements.length === 0 ? (
          <div className="element-list-empty">Sin elementos en esta pantalla</div>
        ) : (
          reversedElements.map((element) => {
            const index = elements.findIndex((el) => el.id === element.id);
            const isSelected = element.id === selectedElementId;
            const isFirst = index === 0;
            const isLast = index === elements.length - 1;

            return (
              <article
                key={element.id}
                className={`element-list-item ${isSelected ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectElement(element.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectElement(element.id);
                  }
                }}
              >
                <div className="element-item-icon" aria-hidden="true">
                  {getElementIcon(element.type)}
                </div>
                <div className="element-item-meta">
                  <strong>{getElementLabel(element)}</strong>
                </div>
                <div className="element-item-actions">
                  <button
                    type="button"
                    aria-label="Traer adelante"
                    title="Traer adelante"
                    disabled={isLast}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMoveElementForward(element.id);
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Enviar atrás"
                    title="Enviar atrás"
                    disabled={isFirst}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMoveElementBackward(element.id);
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    aria-label="Eliminar elemento"
                    title="Eliminar"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveElement(element.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function getElementIcon(type: DesignElement["type"]) {
  switch (type) {
    case "rect":
      return <RectangleHorizontal size={14} />;
    case "circle":
      return <Circle size={14} />;
    case "line":
      return <Slash size={14} />;
    case "text":
      return <Type size={14} />;
    case "image":
      return <ImageIcon size={14} />;
  }
}

function getElementLabel(element: DesignElement): string {
  switch (element.type) {
    case "rect":
      return element.filled ? "Rectángulo Relleno" : "Rectángulo";
    case "circle":
      return element.filled ? "Círculo Relleno" : "Círculo";
    case "line":
      return "Línea";
    case "text":
      const trimmedText = element.text.trim();
      return trimmedText ? `Texto: "${trimmedText.slice(0, 12)}${trimmedText.length > 12 ? "..." : ""}"` : "Texto";
    case "image":
      return "Imagen";
  }
}
