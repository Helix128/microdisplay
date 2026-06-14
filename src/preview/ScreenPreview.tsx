import type { PointerEvent } from "react";
import type { DeviceConfig, Screen } from "../core";
import { rasterizeLine } from "../targets/u8g2";
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
  onPointerDown?: (point: Point) => void;
  onPointerMove?: (point: Point) => void;
  onPointerUp?: (point: Point) => void;
  onElementPointerDown?: (elementId: string, point: Point) => void;
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
  function getPoint(event: PointerEvent<any>): Point {
    const svg = event.currentTarget.closest("svg");
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const rect = svg.getBoundingClientRect();
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
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Vista previa de ${screen.name}`}
      onPointerDown={
        onPointerDown === undefined
          ? undefined
          : (event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              onPointerDown(getPoint(event));
            }
      }
      onPointerMove={onPointerMove === undefined ? undefined : (event) => onPointerMove(getPoint(event))}
      onPointerUp={onPointerUp === undefined ? undefined : (event) => onPointerUp(getPoint(event))}
    >
      <rect width={device.width} height={device.height} fill="black" />
      {screen.elements.map((element) => {
        const selected = element.id === selectedElementId;

        switch (element.type) {
          case "rect": {
            const isOnePixelThin = element.width === 1 || element.height === 1;

            if (isOnePixelThin) {
              return (
                <rect
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  fill={selected ? "#00aaff" : "white"}
                  stroke="none"
                  onPointerDown={
                    onElementPointerDown === undefined
                      ? undefined
                      : (event) => {
                          event.stopPropagation();
                          const svg = event.currentTarget.closest("svg");
                          if (svg) {
                            svg.setPointerCapture(event.pointerId);
                          }
                          onElementPointerDown(element.id, getPoint(event));
                        }
                  }
                />
              );
            }

            return (
              <g key={element.id}>
                {element.filled && (
                  <rect
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    fill="white"
                    stroke="none"
                    onPointerDown={
                      onElementPointerDown === undefined
                        ? undefined
                        : (event) => {
                            event.stopPropagation();
                            const svg = event.currentTarget.closest("svg");
                            if (svg) {
                              svg.setPointerCapture(event.pointerId);
                            }
                            onElementPointerDown(element.id, getPoint(event));
                          }
                    }
                  />
                )}
                {(!element.filled || selected) && (
                  <rect
                    x={element.x + 0.5}
                    y={element.y + 0.5}
                    width={element.width - 1}
                    height={element.height - 1}
                    fill="none"
                    stroke={selected ? "#00aaff" : "white"}
                    strokeWidth={1}
                    onPointerDown={
                      onElementPointerDown === undefined
                        ? undefined
                        : (event) => {
                            event.stopPropagation();
                            const svg = event.currentTarget.closest("svg");
                            if (svg) {
                              svg.setPointerCapture(event.pointerId);
                            }
                            onElementPointerDown(element.id, getPoint(event));
                          }
                    }
                  />
                )}
              </g>
            );
          }
          case "line":
            return (
              <g
                key={element.id}
                onPointerDown={
                  onElementPointerDown === undefined
                    ? undefined
                    : (event) => {
                        event.stopPropagation();
                        const svg = event.currentTarget.closest("svg");
                        if (svg) {
                          svg.setPointerCapture(event.pointerId);
                        }
                        onElementPointerDown(element.id, getPoint(event));
                      }
                }
              >
                {rasterizeLine(element.x1, element.y1, element.x2, element.y2).map((point) => (
                  <rect
                    key={`${point.x},${point.y}`}
                    x={point.x}
                    y={point.y}
                    width={1}
                    height={1}
                    fill={selected ? "#00aaff" : "white"}
                  />
                ))}
              </g>
            );
        }
      })}
      {draftElement?.type === "rect" && draftElement.width > 0 && draftElement.height > 0 ? (
        draftElement.width === 1 || draftElement.height === 1 ? (
          <rect
            x={draftElement.x}
            y={draftElement.y}
            width={draftElement.width}
            height={draftElement.height}
            fill="#777"
            stroke="none"
          />
        ) : (
          <rect
            x={draftElement.x + 0.5}
            y={draftElement.y + 0.5}
            width={draftElement.width - 1}
            height={draftElement.height - 1}
            fill="none"
            stroke="#777"
            strokeWidth={1}
          />
        )
      ) : null}
      {draftElement?.type === "line" ? (
        <g>
          {rasterizeLine(draftElement.x1, draftElement.y1, draftElement.x2, draftElement.y2).map((point) => (
            <rect key={`${point.x},${point.y}`} x={point.x} y={point.y} width={1} height={1} fill="#777" />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
