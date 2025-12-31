/* Shared drawing pieces for the physics pictures and activities: labels, arrows, sizing. */
import type { CSSProperties, ReactNode } from "react";
import type { Colour, Mark } from "../../../game/types";
import { num } from "../../visuals/NumberVisuals";

/** What every picture needs to know: is the question over, and what does a "?" turn into then. */
export interface Ctx {
  solved: boolean;
  answer: string;
}

export const rad = (d: number) => (d * Math.PI) / 180;
export const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Colours given to arrows in order when none is set. */
export const ARROW_COLOURS: Colour[] = ["berry", "wave", "leaf", "grape", "tangerine", "teal"];

/** CSS colour for a named colour; `deep` for strokes and text. */
export const col = (c: Colour | undefined, deep = true) => (c ? `var(--${c}${deep ? "-deep" : ""})` : "var(--ink)");

/** How a label reads: numbers get the unit, "?" becomes the answer once solved, strings show as written. */
export function markText(m: Mark | undefined, unit: string | undefined, ctx: Ctx): string {
  if (m === null || m === undefined) return "";
  if (m === "?") return ctx.solved ? ctx.answer : "?";
  if (typeof m === "string") return m;
  if (!unit) return num(m);
  return /^[°%′″]/.test(unit) ? `${num(m)}${unit}` : `${num(m)} ${unit}`;
}

/** Rough text width in viewBox units, for keeping labels inside the picture. */
export const textWidth = (s: string, size = 19) => s.length * size * 0.56;

/** Turns "F_g", "v_0", "R_1" into a main part and a subscript. */
function sub(text: string): ReactNode {
  const m = /^(.*?)_([A-Za-z0-9]+)(.*)$/.exec(text);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <tspan className="ph-sub" dy="5">
        {m[2]}
      </tspan>
      {m[3] && <tspan dy="-5">{m[3]}</tspan>}
    </>
  );
}

export type Anchor = "start" | "middle" | "end";

/** A label in a picture. "?" is highlighted (and shows the answer once solved). */
export function Label({
  x,
  y,
  m,
  unit,
  ctx,
  anchor = "middle",
  size = "md",
  colour,
  cls = "",
  halo = true,
}: {
  x: number;
  y: number;
  m: Mark | undefined;
  unit?: string;
  ctx: Ctx;
  anchor?: Anchor;
  size?: "sm" | "md" | "lg";
  colour?: Colour;
  cls?: string;
  /** A white outline so the label reads over lines. */
  halo?: boolean;
}) {
  const text = markText(m, unit, ctx);
  if (!text) return null;
  const ask = m === "?";
  const style: CSSProperties | undefined = colour && !ask ? { fill: col(colour) } : undefined;
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={`ph-label ph-${size}${ask ? " ask" : ""}${ask && ctx.solved ? " solved" : ""}${halo ? " halo" : ""} ${cls}`}
      style={style}
    >
      {sub(text)}
    </text>
  );
}

/** Plain caption text (names, notes) in the reading font. */
export function Note({ x, y, children, anchor = "middle", cls = "" }: { x: number; y: number; children: ReactNode; anchor?: Anchor; cls?: string }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`ph-note ${cls}`}>
      {children}
    </text>
  );
}

/** An arrow from (x1, y1) to the tip (x2, y2). */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  colour,
  width = 5,
  head = 15,
  dashed,
  cls = "",
  double,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colour?: Colour;
  width?: number;
  head?: number;
  dashed?: boolean;
  cls?: string;
  /** Heads at both ends (dimension arrows). */
  double?: boolean;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const h = Math.min(head, len * 0.6);
  const w = h * 0.62;
  const tri = (tx: number, ty: number, dx: number, dy: number) =>
    `${tx},${ty} ${tx - dx * h - dy * w},${ty - dy * h + dx * w} ${tx - dx * h + dy * w},${ty - dy * h - dx * w}`;
  const c = col(colour);
  const sx = double ? x1 + ux * h * 0.8 : x1;
  const sy = double ? y1 + uy * h * 0.8 : y1;
  return (
    <g className={`ph-arrow ${cls}`}>
      <line
        x1={sx}
        y1={sy}
        x2={x2 - ux * h * 0.8}
        y2={y2 - uy * h * 0.8}
        style={{ stroke: c, strokeWidth: width }}
        strokeLinecap={dashed ? "butt" : "round"}
        strokeDasharray={dashed ? `${width * 1.8} ${width * 1.3}` : undefined}
      />
      <polygon points={tri(x2, y2, ux, uy)} style={{ fill: c }} strokeLinejoin="round" />
      {double && <polygon points={tri(x1, y1, -ux, -uy)} style={{ fill: c }} />}
    </g>
  );
}

/** A dimension line with ends and a label, e.g. a distance under two objects. */
export function Dimension({
  x1,
  y1,
  x2,
  y2,
  m,
  unit,
  ctx,
  side = 1,
  gap = 16,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  m: Mark | undefined;
  unit?: string;
  ctx: Ctx;
  /** Which side of the line the label goes (+1 = left of the direction of travel in screen space, e.g. above a left→right line). */
  side?: 1 | -1;
  gap?: number;
}) {
  if (m === undefined || m === null) return null;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = ((y2 - y1) / len) * side;
  const ny = (-(x2 - x1) / len) * side;
  const mx = (x1 + x2) / 2 + nx * gap;
  const my = (y1 + y2) / 2 + ny * gap;
  const anchor: Anchor = Math.abs(nx) > 0.6 ? (nx > 0 ? "start" : "end") : "middle";
  return (
    <g className="ph-dim">
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="ph-dim-line" />
      {[
        [x1, y1],
        [x2, y2],
      ].map(([x, y], i) => (
        <line key={i} x1={x + nx * 8} y1={y + ny * 8} x2={x - nx * 8} y2={y - ny * 8} className="ph-dim-line" />
      ))}
      <Label x={mx} y={my + (Math.abs(ny) > 0.6 ? (ny > 0 ? 14 : -2) : 7)} m={m} unit={unit} ctx={ctx} anchor={anchor} size="sm" />
    </g>
  );
}

/** An emoji drawn in SVG, centred on (x, y). */
export function Emoji({ x, y, e, size = 40, cls = "", style }: { x: number; y: number; e: string; size?: number; cls?: string; style?: CSSProperties }) {
  return (
    <text x={x} y={y + size * 0.36} className={`ph-emoji ${cls}`} style={{ fontSize: size, ...style }} textAnchor="middle">
      {e}
    </text>
  );
}

/** The picture's SVG: a viewBox, sized so one viewBox unit is about one CSS pixel (never wider than the card). */
export function PhysSvg({
  box,
  label,
  children,
  cls = "",
}: {
  box: [number, number, number, number];
  label: string;
  children: ReactNode;
  cls?: string;
}) {
  const [x, y, w, h] = box;
  return (
    <svg className={`ph-svg ${cls}`} viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label} style={{ width: `min(100%, ${Math.round(w * 1.08)}px)` }}>
      {children}
    </svg>
  );
}

/** Grows a box to hold every point and label added, for pictures whose size depends on the data. */
export class Bounds {
  x0 = Infinity;
  y0 = Infinity;
  x1 = -Infinity;
  y1 = -Infinity;
  add(x: number, y: number) {
    this.x0 = Math.min(this.x0, x);
    this.y0 = Math.min(this.y0, y);
    this.x1 = Math.max(this.x1, x);
    this.y1 = Math.max(this.y1, y);
  }
  /** A text label at (x, y) (baseline), with its anchor and font size. */
  text(x: number, y: number, s: string, anchor: Anchor, size = 19) {
    const w = textWidth(s, size);
    const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    this.add(left, y - size * 0.9);
    this.add(left + w, y + size * 0.3);
  }
  box(pad = 12, minW = 0): [number, number, number, number] {
    let w = this.x1 - this.x0 + 2 * pad;
    let x = this.x0 - pad;
    if (w < minW) {
      x -= (minW - w) / 2;
      w = minW;
    }
    return [x, this.y0 - pad, w, this.y1 - this.y0 + 2 * pad];
  }
}

/** A ground line with hatching under it, from x1 to x2 at height y. */
export function Ground({ x1, x2, y, flip = false }: { x1: number; x2: number; y: number; flip?: boolean }) {
  const n = Math.max(1, Math.floor((x2 - x1) / 16));
  const d = flip ? -1 : 1;
  return (
    <g className="ph-ground">
      <line x1={x1} y1={y} x2={x2} y2={y} className="ph-ground-line" />
      {range(n).map((i) => {
        const x = x1 + 8 + i * 16;
        return <line key={i} x1={x} y1={y + 3 * d} x2={x - 10} y2={y + 13 * d} className="ph-hatch" />;
      })}
    </g>
  );
}

/** Where a ray from the centre of a w×h box turned by `turn` degrees leaves the box, in direction `dir`. */
export function boxEdge(dir: number, hw: number, hh: number, turn = 0) {
  const a = rad(dir - turn);
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const t = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity);
  return t;
}

/** Text anchor and baseline offset for a label just beyond an arrow tip pointing in direction (ux, uy) (screen). */
export function tipPlacement(ux: number, uy: number) {
  const anchor: Anchor = ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle";
  const dy = uy < -0.6 ? -4 : uy > 0.6 ? 18 : 7;
  return { anchor, dy };
}

/** A tiny seeded random generator, so "random" dots look the same on every render. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
