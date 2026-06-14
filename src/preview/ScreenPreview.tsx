import type { PointerEvent } from "react";
import type { DeviceConfig, Screen } from "../core";
import "./ScreenPreview.css";

export type Point = {
  x: number;
  y: number;
};

export type DraftElement =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      filled: boolean;
    }
  | {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

type ScreenPreviewProps = {
  device: DeviceConfig;
  screen: Screen;
  selectedElementId: string | null;
  draftElement: DraftElement | null;
  onPointerDown: (point: Point) => void;
  onPointerMove: (point: Point) => void;
  onPointerUp: (point: Point) => void;
  onElementPointerDown: (elementId: string) => void;
};

export function ScreenPreview({
  device,
  screen,
  selectedElementId,
  draftElement,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onElementPointerDown,
}: ScreenPreviewProps) {
  function getPoint(event: PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = Math.floor(((event.clientX - rect.left) * device.width) / rect.width);
    const rawY = Math.floor(((event.clientY - rect.top) * device.height) / rect.height);

    return {
      x: Math.max(0, Math.min(device.width - 1, rawX)),
      y: Math.max(0, Math.min(device.height - 1, rawY)),
    };
  }

  return (
    <svg
      className="screen-preview"
      viewBox={`0 0 ${device.width} ${device.height}`}
      role="img"
      aria-label={`Vista previa de ${screen.name}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointerDown(getPoint(event));
      }}
      onPointerMove={(event) => onPointerMove(getPoint(event))}
      onPointerUp={(event) => onPointerUp(getPoint(event))}
    >
      <rect width={device.width} height={device.height} fill="black" />
      {screen.elements.map((element) => {
        const selected = element.id === selectedElementId;

        switch (element.type) {
          case "rect":
            return (
              <rect
                key={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill={element.filled ? "white" : "none"}
                stroke={selected ? "#999" : element.filled ? "none" : "white"}
                strokeDasharray={selected ? "2 1" : undefined}
                strokeWidth={1}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onElementPointerDown(element.id);
                }}
              />
            );
          case "line":
            return (
              <line
                key={element.id}
                x1={element.x1}
                y1={element.y1}
                x2={element.x2}
                y2={element.y2}
                stroke={selected ? "#999" : "white"}
                strokeDasharray={selected ? "2 1" : undefined}
                strokeWidth={1}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onElementPointerDown(element.id);
                }}
              />
            );
        }
      })}
      {draftElement?.type === "rect" ? (
        <rect
          x={draftElement.x}
          y={draftElement.y}
          width={draftElement.width}
          height={draftElement.height}
          fill="none"
          stroke="#777"
          strokeDasharray="2 1"
          strokeWidth={1}
        />
      ) : null}
      {draftElement?.type === "line" ? (
        <line
          x1={draftElement.x1}
          y1={draftElement.y1}
          x2={draftElement.x2}
          y2={draftElement.y2}
          stroke="#777"
          strokeDasharray="2 1"
          strokeWidth={1}
        />
      ) : null}
    </svg>
  );
}
