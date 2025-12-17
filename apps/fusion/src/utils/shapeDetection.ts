// Shape detection utilities for telestrator

export interface Point {
  x: number;
  y: number;
}

export type ShapeType = 'circle' | 'rectangle' | 'line' | 'x' | 'arrow' | 'freehand';

/**
 * Calculate distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate the total path length
 */
function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Calculate bounding box
 */
function boundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if the path is roughly closed (start and end points are close)
 */
function isClosed(points: Point[], threshold = 0.15): boolean {
  if (points.length < 5) return false;
  
  const start = points[0];
  const end = points[points.length - 1];
  const dist = distance(start, end);
  const totalLength = pathLength(points);
  
  return dist / totalLength < threshold;
}

/**
 * Check if points form a circle
 */
function isCircle(points: Point[]): boolean {
  if (!isClosed(points)) return false;
  
  const bbox = boundingBox(points);
  const aspectRatio = bbox.width / bbox.height;
  
  // Check if aspect ratio is close to 1 (circular)
  if (aspectRatio < 0.7 || aspectRatio > 1.3) return false;
  
  // Calculate center and average radius
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const center = { x: centerX, y: centerY };
  
  const radii = points.map(p => distance(p, center));
  const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
  
  // Check variance in radius
  const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;
  const stdDev = Math.sqrt(variance);
  
  // If standard deviation is less than 15% of average radius, it's a circle
  return stdDev / avgRadius < 0.15;
}

/**
 * Check if points form a rectangle
 */
function isRectangle(points: Point[]): boolean {
  if (!isClosed(points)) return false;
  
  const bbox = boundingBox(points);
  
  // Find corners (points near the bounding box corners)
  const corners = [
    { x: bbox.minX, y: bbox.minY },
    { x: bbox.maxX, y: bbox.minY },
    { x: bbox.maxX, y: bbox.maxY },
    { x: bbox.minX, y: bbox.maxY }
  ];
  
  // Check if points cluster near the corners
  let nearCornerCount = 0;
  const threshold = Math.max(bbox.width, bbox.height) * 0.15;
  
  for (const point of points) {
    for (const corner of corners) {
      if (distance(point, corner) < threshold) {
        nearCornerCount++;
        break;
      }
    }
  }
  
  // At least 60% of points should be near corners/edges
  return nearCornerCount / points.length > 0.6;
}

/**
 * Check if points form a straight line
 */
function isLine(points: Point[]): boolean {
  if (isClosed(points)) return false;
  
  const bbox = boundingBox(points);
  const aspectRatio = Math.max(bbox.width, bbox.height) / Math.min(bbox.width, bbox.height);
  
  // Very elongated shape
  if (aspectRatio < 3) return false;
  
  // Check linearity by calculating distance from each point to the line formed by start and end
  const start = points[0];
  const end = points[points.length - 1];
  
  // Line equation: ax + by + c = 0
  const a = end.y - start.y;
  const b = start.x - end.x;
  const c = end.x * start.y - start.x * end.y;
  const lineMagnitude = Math.sqrt(a * a + b * b);
  
  if (lineMagnitude === 0) return false;
  
  // Calculate average distance from points to line
  let totalDistance = 0;
  for (const point of points) {
    const dist = Math.abs(a * point.x + b * point.y + c) / lineMagnitude;
    totalDistance += dist;
  }
  
  const avgDistance = totalDistance / points.length;
  const maxDimension = Math.max(bbox.width, bbox.height);
  
  // If average distance is less than 5% of the max dimension, it's a line
  return avgDistance / maxDimension < 0.05;
}

/**
 * Check if points form an X shape
 */
function isXShape(points: Point[]): boolean {
  if (isClosed(points)) return false;
  
  const bbox = boundingBox(points);
  const aspectRatio = bbox.width / bbox.height;
  
  // Should be roughly square
  if (aspectRatio < 0.5 || aspectRatio > 2) return false;
  
  // Find the point closest to center
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const center = { x: centerX, y: centerY };
  
  let closestToCenterDist = Infinity;
  let closestIndex = -1;
  
  points.forEach((p, i) => {
    const dist = distance(p, center);
    if (dist < closestToCenterDist) {
      closestToCenterDist = dist;
      closestIndex = i;
    }
  });
  
  // Check if there's a point near the center (within 20% of diagonal)
  const diagonal = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);
  if (closestToCenterDist / diagonal > 0.2) return false;
  
  // Split points into before and after center point
  const beforeCenter = points.slice(0, closestIndex);
  const afterCenter = points.slice(closestIndex + 1);
  
  // Both segments should exist and be reasonably sized
  if (beforeCenter.length < 3 || afterCenter.length < 3) return false;
  
  return true;
}

/**
 * Check if points form an arrow
 */
function isArrow(points: Point[]): boolean {
  if (isClosed(points)) return false;
  if (points.length < 10) return false;
  
  const bbox = boundingBox(points);
  const aspectRatio = Math.max(bbox.width, bbox.height) / Math.min(bbox.width, bbox.height);
  
  // Should be elongated
  if (aspectRatio < 2) return false;
  
  // Check if the start or end has more "density" (arrowhead)
  const totalPoints = points.length;
  const firstQuarter = points.slice(0, Math.floor(totalPoints / 4));
  const lastQuarter = points.slice(Math.floor(totalPoints * 3 / 4));
  
  const firstQuarterBox = boundingBox(firstQuarter);
  const lastQuarterBox = boundingBox(lastQuarter);
  
  const firstQuarterArea = firstQuarterBox.width * firstQuarterBox.height;
  const lastQuarterArea = lastQuarterBox.width * lastQuarterBox.height;
  
  // If one end has significantly more area (potential arrowhead), it might be an arrow
  const areaRatio = Math.max(firstQuarterArea, lastQuarterArea) / Math.min(firstQuarterArea, lastQuarterArea);
  
  return areaRatio > 1.5;
}

/**
 * Main shape detection function
 */
export function detectShape(points: Point[]): ShapeType {
  if (points.length < 5) return 'freehand';
  
  // Test in order of specificity
  if (isCircle(points)) return 'circle';
  if (isRectangle(points)) return 'rectangle';
  if (isXShape(points)) return 'x';
  if (isArrow(points)) return 'arrow';
  if (isLine(points)) return 'line';
  
  return 'freehand';
}

/**
 * Draw a perfect circle from detected points
 */
export function drawPerfectCircle(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  lineWidth: number
): void {
  const bbox = boundingBox(points);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const radius = Math.min(bbox.width, bbox.height) / 2;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
}

/**
 * Draw a perfect rectangle from detected points
 */
export function drawPerfectRectangle(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  lineWidth: number
): void {
  const bbox = boundingBox(points);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(bbox.minX, bbox.minY, bbox.width, bbox.height);
}

/**
 * Draw a perfect line from detected points
 */
export function drawPerfectLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  lineWidth: number
): void {
  const start = points[0];
  const end = points[points.length - 1];
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

/**
 * Draw a perfect X from detected points
 */
export function drawPerfectX(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  lineWidth: number
): void {
  const bbox = boundingBox(points);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  
  // Draw diagonal from top-left to bottom-right
  ctx.beginPath();
  ctx.moveTo(bbox.minX, bbox.minY);
  ctx.lineTo(bbox.maxX, bbox.maxY);
  ctx.stroke();
  
  // Draw diagonal from top-right to bottom-left
  ctx.beginPath();
  ctx.moveTo(bbox.maxX, bbox.minY);
  ctx.lineTo(bbox.minX, bbox.maxY);
  ctx.stroke();
}

/**
 * Draw a perfect arrow from detected points
 */
export function drawPerfectArrow(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  lineWidth: number
): void {
  const start = points[0];
  const end = points[points.length - 1];
  
  // Draw main line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  
  // Calculate arrow head
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = lineWidth * 4;
  
  // Draw arrow head
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}
