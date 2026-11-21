// Path helpers for the portrait painter.
const f = (n) => Math.round(n * 10) / 10;

/** Closed or open Catmull-Rom spline through points, as SVG path data. */
export function spline(points, closed = true, tension = 0.5) {
  const n = points.length;
  if (n < 2) return '';
  const p = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    const t = tension / 3;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + ' Z' : d;
}

/**
 * Symmetric closed shape about x = cx. `half` lists points on the right side
 * from top to bottom; the left side is mirrored.
 */
export function sym(half, cx = 128, tension = 0.5) {
  const right = half.map(([x, y]) => [cx + x, y]);
  const left = half.slice().reverse().filter((pt) => pt[0] !== 0).map(([x, y]) => [cx - x, y]);
  return spline([...right, ...left], true, tension);
}
export const mirror = (pts, cx = 128) => pts.map(([x, y]) => [2 * cx - x, y]);
export const flipPath = (d, cx = 128) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(2 * cx - Number(x))} ${y}`);
