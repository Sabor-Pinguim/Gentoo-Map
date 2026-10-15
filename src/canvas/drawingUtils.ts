import type { DrawingStroke, Point } from '../model/types';

/**
 * Converte um conjunto de pontos em um caminho SVG suave utilizando
 * interpolação quadrática por pontos médios (quadratics through midpoints).
 */
export function pointsToSvgPath(points: Point[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Distância ao quadrado entre um ponto e um segmento de reta.
 */
function distToSegmentSquared(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

/**
 * Verifica se um ponto (posição da borracha) toca o traço com uma tolerância.
 */
export function isStrokeHit(stroke: DrawingStroke, point: Point, threshold = 16): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;
  const threshSq = (threshold + stroke.width / 2) ** 2;

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const dSq = (point.x - p.x) ** 2 + (point.y - p.y) ** 2;
    return dSq <= threshSq;
  }

  // Verifica cada segmento do traço
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const dSq = distToSegmentSquared(point, stroke.points[i], stroke.points[i + 1]);
    if (dSq <= threshSq) return true;
  }

  return false;
}

