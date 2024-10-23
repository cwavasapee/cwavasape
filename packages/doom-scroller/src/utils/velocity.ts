import type { Point } from "../types";

export function calculateVelocity(
  points: Point[],
  sampleSize: number = 3
): { x: number; y: number } {
  if (points.length < 2) return { x: 0, y: 0 };

  const recentPoints = points.slice(-sampleSize);
  const firstPoint = recentPoints[0];
  const lastPoint = recentPoints[recentPoints.length - 1];

  if (!firstPoint || !lastPoint) return { x: 0, y: 0 };

  const timeDiff = lastPoint.timestamp - firstPoint.timestamp;

  if (timeDiff === 0) return { x: 0, y: 0 };

  return {
    x: (lastPoint.x - firstPoint.x) / timeDiff,
    y: (lastPoint.y - firstPoint.y) / timeDiff,
  };
}
