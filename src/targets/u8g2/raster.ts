export type RasterPoint = {
  x: number;
  y: number;
};

export function rasterizeLine(x1: number, y1: number, x2: number, y2: number): RasterPoint[] {
  const points: RasterPoint[] = [];
  let x = x1;
  let y = y1;
  const dx = Math.abs(x2 - x1);
  const sx = x1 < x2 ? 1 : -1;
  const dy = -Math.abs(y2 - y1);
  const sy = y1 < y2 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ x, y });

    if (x === x2 && y === y2) {
      break;
    }

    const doubledError = 2 * error;

    if (doubledError >= dy) {
      error += dy;
      x += sx;
    }

    if (doubledError <= dx) {
      error += dx;
      y += sy;
    }
  }

  return points;
}
