import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type { DesignElement, DeviceConfig, LineElement, RectElement, Screen, TextElement } from "../core";
import { rasterizeLineRuns } from "../core";
import { measureBitmapText, rasterizeBitmapText } from "./bitmapText";
import { getU8g2Font, loadGeneratedU8g2Font } from "../targets/u8g2/fonts/index";
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
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      font: string;
    };

type ScreenPreviewProps = {
  device: DeviceConfig;
  screen: Screen;
  selectedElementId: string | null;
  draftElement: DraftElement | null;
  dragPreviewElement?: DesignElement | null;
  showPixelGrid?: boolean;
  onPointerDown?: (point: Point) => void;
  onPointerMove?: (point: Point) => void;
  onPointerUp?: (point: Point) => void;
  onElementPointerDown?: (elementId: string, point: Point) => void;
};

export const ScreenPreview = memo(function ScreenPreview({
  device,
  screen,
  selectedElementId,
  draftElement,
  dragPreviewElement,
  showPixelGrid = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onElementPointerDown,
}: ScreenPreviewProps) {
  const getPoint = useCallback(
    (event: PointerEvent<any>): Point => {
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
    },
    [device.height, device.width],
  );

  const pixelGrid = useMemo(() => {
    if (!showPixelGrid) {
      return null;
    }

    return (
      <g className="screen-preview-grid" pointerEvents="none">
        {Array.from({ length: device.width + 1 }, (_, x) => (
          <line key={`grid-v-${x}`} x1={x} y1={0} x2={x} y2={device.height} />
        ))}
        {Array.from({ length: device.height + 1 }, (_, y) => (
          <line key={`grid-h-${y}`} x1={0} y1={y} x2={device.width} y2={y} />
        ))}
      </g>
    );
  }, [device.height, device.width, showPixelGrid]);

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
      {pixelGrid}
      {screen.elements.map((element) => {
        const renderElement = dragPreviewElement?.id === element.id ? dragPreviewElement : element;
        const selected = renderElement.id === selectedElementId;

        switch (renderElement.type) {
          case "rect":
            return (
              <RectPreview
                key={renderElement.id}
                element={renderElement}
                selected={selected}
                color={selected ? "#00aaff" : "white"}
                onElementPointerDown={onElementPointerDown}
                getPoint={getPoint}
              />
            );
          case "line":
            return (
              <LinePreview
                key={renderElement.id}
                element={renderElement}
                color={selected ? "#00aaff" : "white"}
                onElementPointerDown={onElementPointerDown}
                getPoint={getPoint}
              />
            );
          case "text":
            return (
              <TextPreview
                key={renderElement.id}
                element={renderElement}
                selected={selected}
                color={selected ? "#00aaff" : "white"}
                onElementPointerDown={onElementPointerDown}
                getPoint={getPoint}
              />
            );
        }
      })}
      {draftElement?.type === "rect" && draftElement.width > 0 && draftElement.height > 0 ? (
        draftElement.filled || draftElement.width === 1 || draftElement.height === 1 ? (
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
        <LinePreview element={draftElement} color="#777" onElementPointerDown={undefined} getPoint={getPoint} interactive={false} />
      ) : null}
      {draftElement?.type === "text" ? (
        <TextPreview
          element={draftElement}
          selected={false}
          color="#777"
          onElementPointerDown={undefined}
          getPoint={getPoint}
          interactive={false}
        />
      ) : null}
    </svg>
  );
});

type RectPreviewProps = {
  element: RectElement;
  selected: boolean;
  color: string;
  getPoint: (event: PointerEvent<any>) => Point;
  onElementPointerDown?: (elementId: string, point: Point) => void;
};

const RectPreview = memo(function RectPreview({
  element,
  selected,
  color,
  getPoint,
  onElementPointerDown,
}: RectPreviewProps) {
  const handlePointerDown =
    onElementPointerDown === undefined
      ? undefined
      : (event: PointerEvent<SVGElement>) => {
          event.stopPropagation();
          const svg = event.currentTarget.closest("svg");
          if (svg) {
            svg.setPointerCapture(event.pointerId);
          }
          onElementPointerDown(element.id, getPoint(event));
        };

  const isOnePixelThin = element.width === 1 || element.height === 1;

  if (isOnePixelThin) {
    return (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={color}
        stroke="none"
        onPointerDown={handlePointerDown}
      />
    );
  }

  return (
    <g onPointerDown={handlePointerDown}>
      {element.filled && (
        <rect x={element.x} y={element.y} width={element.width} height={element.height} fill="white" stroke="none" />
      )}
      {(!element.filled || selected) && (
        <rect
          x={element.x + 0.5}
          y={element.y + 0.5}
          width={element.width - 1}
          height={element.height - 1}
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
      )}
    </g>
  );
});

type TextPreviewProps = {
  element: TextElement | (DraftElement & { type: "text" });
  selected: boolean;
  color: string;
  getPoint: (event: PointerEvent<any>) => Point;
  onElementPointerDown?: (elementId: string, point: Point) => void;
  interactive?: boolean;
};

const TextPreview = memo(function TextPreview({
  element,
  selected,
  color,
  getPoint,
  onElementPointerDown,
  interactive = true,
}: TextPreviewProps) {
  const [generatedFont, setGeneratedFont] = useState<Awaited<ReturnType<typeof loadGeneratedU8g2Font>>>(null);
  const fallbackFont = getU8g2Font(element.font);

  useEffect(() => {
    let cancelled = false;
    setGeneratedFont(null);

    void loadGeneratedU8g2Font(element.font).then((font) => {
      if (!cancelled) {
        setGeneratedFont(font);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [element.font]);

  const bitmapMetrics = generatedFont === null ? null : measureBitmapText(element.text, generatedFont);
  const bitmapRuns =
    generatedFont === null ? null : rasterizeBitmapText(element.text, generatedFont, element.x, element.y);
  const left = bitmapMetrics?.left ?? 0;
  const width = bitmapMetrics?.width ?? Math.max(1, element.text.length * fallbackFont.width);
  const height = bitmapMetrics?.height ?? fallbackFont.height;
  const top = bitmapMetrics === null ? element.y - fallbackFont.baseline : element.y + bitmapMetrics.top;

  const handlePointerDown =
    interactive && onElementPointerDown !== undefined
      ? (event: PointerEvent<SVGElement>) => {
          event.stopPropagation();
          const svg = event.currentTarget.closest("svg");
          if (svg) {
            svg.setPointerCapture(event.pointerId);
          }
          onElementPointerDown((element as TextElement).id, getPoint(event));
        }
      : undefined;

  return (
    <g onPointerDown={handlePointerDown}>
      <rect x={element.x + left} y={top} width={width} height={height} fill="transparent" stroke="none" />
      {selected ? (
        <rect
          x={element.x + left - 0.5}
          y={top - 0.5}
          width={width + 1}
          height={height + 1}
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
      ) : null}
      {bitmapRuns !== null ? (
        bitmapRuns.map((run) => (
          <rect key={`${run.x},${run.y},${run.width}`} x={run.x} y={run.y} width={run.width} height={1} fill={color} />
        ))
      ) : (
        <text
          x={element.x}
          y={element.y}
          fill={color}
          fontFamily="monospace"
          fontSize={fallbackFont.height}
          dominantBaseline="alphabetic"
        >
          {element.text}
        </text>
      )}
    </g>
  );
});

type LinePreviewProps = {
  element: LineElement | (DraftElement & { type: "line" });
  color: string;
  getPoint: (event: PointerEvent<any>) => Point;
  onElementPointerDown?: (elementId: string, point: Point) => void;
  interactive?: boolean;
};

const LinePreview = memo(function LinePreview({
  element,
  color,
  getPoint,
  onElementPointerDown,
  interactive = true,
}: LinePreviewProps) {
  const runs = useMemo(
    () => rasterizeLineRuns(element.x1, element.y1, element.x2, element.y2),
    [element.x1, element.y1, element.x2, element.y2],
  );

  const handlePointerDown =
    interactive && onElementPointerDown !== undefined
      ? (event: PointerEvent<SVGElement>) => {
          event.stopPropagation();
          const svg = event.currentTarget.closest("svg");
          if (svg) {
            svg.setPointerCapture(event.pointerId);
          }
          onElementPointerDown((element as LineElement).id, getPoint(event));
        }
      : undefined;

  return (
    <g onPointerDown={handlePointerDown}>
      {runs.map((run) => (
        <rect key={`${run.x},${run.y},${run.width}`} x={run.x} y={run.y} width={run.width} height={1} fill={color} />
      ))}
    </g>
  );
});
