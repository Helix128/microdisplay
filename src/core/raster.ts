export type RasterPoint = {
  x: number;
  y: number;
};

export type RasterRun = {
  x: number;
  y: number;
  width: number;
};

export function rasterizeLine(x1: number, y1: number, x2: number, y2: number): RasterPoint[] {
  const points: RasterPoint[] = [];
  let tmp: number;
  let x: number;
  let y: number;
  let dx: number;
  let dy: number;
  let err: number;
  let ystep: number;
  let swapxy = 0;

  if (x1 > x2) {
    dx = x1 - x2;
  } else {
    dx = x2 - x1;
  }

  if (y1 > y2) {
    dy = y1 - y2;
  } else {
    dy = y2 - y1;
  }

  if (dy > dx) {
    swapxy = 1;
    tmp = dx;
    dx = dy;
    dy = tmp;
    tmp = x1;
    x1 = y1;
    y1 = tmp;
    tmp = x2;
    x2 = y2;
    y2 = tmp;
  }

  if (x1 > x2) {
    tmp = x1;
    x1 = x2;
    x2 = tmp;
    tmp = y1;
    y1 = y2;
    y2 = tmp;
  }

  err = dx >> 1;
  ystep = y2 > y1 ? 1 : -1;
  y = y1;

  if (x2 === 255) {
    x2--;
  }

  for (x = x1; x <= x2; x++) {
    points.push(swapxy === 0 ? { x, y } : { x: y, y: x });
    err -= dy;
    if (err < 0) {
      y += ystep;
      err += dx;
    }
  }

  return points;
}

export function rasterizeLineRuns(x1: number, y1: number, x2: number, y2: number): RasterRun[] {
  const points = rasterizeLine(x1, y1, x2, y2);

  if (points.length === 0) {
    return [];
  }

  const runs: RasterRun[] = [];
  let currentRun = {
    x: points[0]!.x,
    y: points[0]!.y,
    width: 1,
  };

  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    const expectedX = currentRun.x + currentRun.width;

    if (point.y === currentRun.y && point.x === expectedX) {
      currentRun.width++;
      continue;
    }

    runs.push(currentRun);
    currentRun = { x: point.x, y: point.y, width: 1 };
  }

  runs.push(currentRun);
  return runs;
}
