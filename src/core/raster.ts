export type RasterPoint = {
  x: number;
  y: number;
};

export type RasterRun = {
  x: number;
  y: number;
  width: number;
};

export type RasterColumnRun = {
  x: number;
  y: number;
  height: number;
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

export function rasterizeCirclePoints(x0: number, y0: number, radius: number): RasterPoint[] {
  const points = new Map<string, RasterPoint>();
  let f = 1 - radius;
  let ddF_x = 1;
  let ddF_y = -2 * radius;
  let x = 0;
  let y = radius;

  addCircleSectionPoints(points, x, y, x0, y0);

  while (x < y) {
    if (f >= 0) {
      y--;
      ddF_y += 2;
      f += ddF_y;
    }

    x++;
    ddF_x += 2;
    f += ddF_x;

    addCircleSectionPoints(points, x, y, x0, y0);
  }

  return sortPoints([...points.values()]);
}

export function rasterizeDiscRuns(x0: number, y0: number, radius: number): RasterColumnRun[] {
  const points = new Map<string, RasterPoint>();
  let f = 1 - radius;
  let ddF_x = 1;
  let ddF_y = -2 * radius;
  let x = 0;
  let y = radius;

  addDiscSectionPoints(points, x, y, x0, y0);

  while (x < y) {
    if (f >= 0) {
      y--;
      ddF_y += 2;
      f += ddF_y;
    }

    x++;
    ddF_x += 2;
    f += ddF_x;

    addDiscSectionPoints(points, x, y, x0, y0);
  }

  return compressColumnRuns(sortPoints([...points.values()]));
}

function addCircleSectionPoints(points: Map<string, RasterPoint>, x: number, y: number, x0: number, y0: number): void {
  addPoint(points, x0 + x, y0 - y);
  addPoint(points, x0 + y, y0 - x);
  addPoint(points, x0 - x, y0 - y);
  addPoint(points, x0 - y, y0 - x);
  addPoint(points, x0 + x, y0 + y);
  addPoint(points, x0 + y, y0 + x);
  addPoint(points, x0 - x, y0 + y);
  addPoint(points, x0 - y, y0 + x);
}

function addDiscSectionPoints(points: Map<string, RasterPoint>, x: number, y: number, x0: number, y0: number): void {
  addVerticalLinePoints(points, x0 + x, y0 - y, y + 1);
  addVerticalLinePoints(points, x0 + y, y0 - x, x + 1);
  addVerticalLinePoints(points, x0 - x, y0 - y, y + 1);
  addVerticalLinePoints(points, x0 - y, y0 - x, x + 1);
  addVerticalLinePoints(points, x0 + x, y0, y + 1);
  addVerticalLinePoints(points, x0 + y, y0, x + 1);
  addVerticalLinePoints(points, x0 - x, y0, y + 1);
  addVerticalLinePoints(points, x0 - y, y0, x + 1);
}

function addVerticalLinePoints(points: Map<string, RasterPoint>, x: number, y: number, height: number): void {
  for (let offset = 0; offset < height; offset++) {
    addPoint(points, x, y + offset);
  }
}

function addPoint(points: Map<string, RasterPoint>, x: number, y: number): void {
  points.set(`${x},${y}`, { x, y });
}

function sortPoints(points: RasterPoint[]): RasterPoint[] {
  return points.sort((a, b) => a.x - b.x || a.y - b.y);
}

function compressColumnRuns(points: RasterPoint[]): RasterColumnRun[] {
  if (points.length === 0) {
    return [];
  }

  const runs: RasterColumnRun[] = [];
  let currentRun = {
    x: points[0]!.x,
    y: points[0]!.y,
    height: 1,
  };

  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    const expectedY = currentRun.y + currentRun.height;

    if (point.x === currentRun.x && point.y === expectedY) {
      currentRun.height++;
      continue;
    }

    runs.push(currentRun);
    currentRun = { x: point.x, y: point.y, height: 1 };
  }

  runs.push(currentRun);
  return runs;
}
