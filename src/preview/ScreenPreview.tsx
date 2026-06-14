import type { DeviceConfig, Screen } from "../core";
import "./ScreenPreview.css";

type ScreenPreviewProps = {
  device: DeviceConfig;
  screen: Screen;
};

export function ScreenPreview({ device, screen }: ScreenPreviewProps) {
  return (
    <div className="screen-preview-frame">
      <svg
        className="screen-preview"
        viewBox={`0 0 ${device.width} ${device.height}`}
        role="img"
        aria-label={`Preview of ${screen.name}`}
      >
        <rect width={device.width} height={device.height} fill="black" />
        {screen.elements.map((element) => {
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
                  stroke={element.filled ? "none" : "white"}
                  strokeWidth={1}
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
                  stroke="white"
                  strokeWidth={1}
                />
              );
          }
        })}
      </svg>
    </div>
  );
}
