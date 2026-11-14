import type { Colour } from "../../game/types";
import { num } from "./NumberVisuals";
import { ShapeSvg as ShapeSvgLite } from "./ShapeVisuals";

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/** A tidy step for axis labels across a span (1, 2, 5, 10, …). */
function niceStep(span: number, target = 8) {
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
}

/* --------------------------------------------------------------- plot */

interface PlotProps {
  x: [number, number];
  y: [number, number];
  curves?: { fn: (x: number) => number; colour?: Colour; label?: string; dashed?: boolean }[];
  lines?: { from: [number, number]; to: [number, number]; colour?: Colour; dashed?: boolean }[];
  points?: { x: number; y: number; label?: string; open?: boolean }[];
  shade?: { fn: (x: number) => number; fn2?: (x: number) => number; from: number; to: number; rects?: number };
  regions?: { fn: (x: number) => number; side: "above" | "below"; strict?: boolean; colour?: Colour }[];
  xLabel?: string;
  yLabel?: string;
}

const CURVE_COLOURS: Colour[] = ["wave", "berry", "leaf", "grape", "tangerine"];

export function Plot({ x, y, curves = [], lines = [], points = [], shade, regions = [], xLabel, yLabel }: PlotProps) {
  // Axis titles take a strip below and to the left of the grid.
  const W = 400 + (yLabel ? 22 : 0);
  const H = 300 + (xLabel ? 22 : 0);
  const pad = 30;
  const left = pad + (yLabel ? 22 : 0);
  const bottom = pad + (xLabel ? 22 : 0);
  const X = (v: number) => left + ((v - x[0]) / (x[1] - x[0])) * (W - left - pad);
  const Y = (v: number) => H - bottom - ((v - y[0]) / (y[1] - y[0])) * (H - bottom - pad);
  const sx = niceStep(x[1] - x[0]);
  const sy = niceStep(y[1] - y[0]);
  const ticks = (lo: number, hi: number, s: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(lo / s) * s; v <= hi + 1e-9; v += s) out.push(Number(v.toFixed(6)));
    return out;
  };
  const inside = (v: number) => Number.isFinite(v) && v > y[0] - (y[1] - y[0]) && v < y[1] + (y[1] - y[0]);

  function path(fn: (v: number) => number, from = x[0], to = x[1]) {
    const steps = 240;
    let d = "";
    let pen = false;
    let prev = NaN;
    for (let i = 0; i <= steps; i++) {
      const xv = from + ((to - from) * i) / steps;
      const yv = fn(xv);
      if (!inside(yv)) {
        pen = false;
        continue;
      }
      // Lift the pen across jumps (floor steps, asymptotes) instead of drawing a false vertical line.
      if (pen && Math.abs(yv - prev) > (y[1] - y[0]) / 4) pen = false;
      d += `${pen ? "L" : "M"}${X(xv).toFixed(1)} ${Y(Math.max(y[0] - 1e3, Math.min(y[1] + 1e3, yv))).toFixed(1)} `;
      pen = true;
      prev = yv;
    }
    return d;
  }

  /** A closed outline between two functions over [from, to], sampled finely and held to just past the plot's edges. */
  function between(f: (v: number) => number, g: (v: number) => number, from: number, to: number) {
    const steps = 240;
    const clamp = (v: number) => (Number.isFinite(v) ? Math.max(y[0] - (y[1] - y[0]), Math.min(y[1] + (y[1] - y[0]), v)) : 0);
    const xs = range(steps + 1).map((i) => from + ((to - from) * i) / steps);
    const top = xs.map((xv) => `${X(xv).toFixed(1)} ${Y(clamp(f(xv))).toFixed(1)}`);
    const bottom = [...xs].reverse().map((xv) => `${X(xv).toFixed(1)} ${Y(clamp(g(xv))).toFixed(1)}`);
    return `M${top.join(" L")} L${bottom.join(" L")} Z`;
  }

  const clipId = `plot-clip-${x.join("_")}-${y.join("_")}`.replace(/[^\w-]/g, "");
  return (
    <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph">
      <defs>
        <clipPath id={clipId}>
          <rect x={left} y={pad} width={W - left - pad} height={H - bottom - pad} />
        </clipPath>
      </defs>
      <rect x={left} y={pad} width={W - left - pad} height={H - bottom - pad} className="grid-bg" />
      {ticks(x[0], x[1], sx).map((v) => (
        <line key={`gx${v}`} x1={X(v)} x2={X(v)} y1={pad} y2={H - bottom} className={v === 0 ? "axis" : "gridline"} />
      ))}
      {ticks(y[0], y[1], sy).map((v) => (
        <line key={`gy${v}`} y1={Y(v)} y2={Y(v)} x1={left} x2={W - pad} className={v === 0 ? "axis" : "gridline"} />
      ))}
      {ticks(x[0], x[1], sx)
        .filter((v) => v !== 0)
        .map((v) => (
          <text key={`lx${v}`} x={X(v)} y={Math.min(H - bottom + 16, Math.max(pad + 14, Y(0) + 16))} className="grid-num">
            {num(v)}
          </text>
        ))}
      {ticks(y[0], y[1], sy)
        .filter((v) => v !== 0)
        .map((v) => (
          <text key={`ly${v}`} x={Math.max(left - 4, Math.min(W - pad - 4, X(0) - 6))} y={Y(v) + 4} className="grid-num end">
            {num(v)}
          </text>
        ))}
      <g clipPath={`url(#${clipId})`}>
        {regions.map((r, i) => {
          const edge = r.side === "above" ? y[1] + (y[1] - y[0]) : y[0] - (y[1] - y[0]);
          return (
            <g key={`r${i}`}>
              <path
                d={between(r.fn, () => edge, x[0], x[1])}
                className="plot-region"
                style={{ fill: `color-mix(in srgb, var(--${r.colour ?? CURVE_COLOURS[i % CURVE_COLOURS.length]}) 24%, transparent)` }}
              />
              <path d={path(r.fn)} className={`plot-curve${r.strict ? " dashed" : ""}`} style={{ stroke: `var(--${r.colour ?? CURVE_COLOURS[i % CURVE_COLOURS.length]}-deep)` }} />
            </g>
          );
        })}
        {shade && (
          <>
            {shade.rects
              ? range(shade.rects).map((i) => {
                  const w = (shade.to - shade.from) / shade.rects!;
                  const x0 = shade.from + i * w;
                  const h = shade.fn(x0);
                  return (
                    <rect key={i} x={X(x0)} y={Math.min(Y(h), Y(0))} width={X(x0 + w) - X(x0)} height={Math.abs(Y(0) - Y(h))} className="plot-rect" />
                  );
                })
              : (
                <path d={between(shade.fn, shade.fn2 ?? (() => 0), shade.from, shade.to)} className="plot-shade" />
              )}
          </>
        )}
        {curves.map((c, i) => (
          <path
            key={i}
            d={path(c.fn)}
            className={`plot-curve${c.dashed ? " dashed" : ""}`}
            style={{ stroke: `var(--${c.colour ?? CURVE_COLOURS[i % CURVE_COLOURS.length]})` }}
          />
        ))}
        {lines.map((l, i) => (
          <line
            key={i}
            x1={X(l.from[0])}
            y1={Y(l.from[1])}
            x2={X(l.to[0])}
            y2={Y(l.to[1])}
            className={`plot-line${l.dashed ? " dashed" : ""}`}
            style={{ stroke: `var(--${l.colour ?? "ink"})` }}
          />
        ))}
      </g>
      {curves.map(
        (c, i) =>
          c.label && (
            <text key={`cl${i}`} x={W - pad - 4} y={pad + 16 + i * 18} className="plot-label" style={{ fill: `var(--${c.colour ?? CURVE_COLOURS[i % CURVE_COLOURS.length]}-deep)` }}>
              {c.label}
            </text>
          ),
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.x)} cy={Y(p.y)} r="5.5" className={p.open ? "plot-point open" : "plot-point"} />
          {p.label && (
            <text x={X(p.x) + 8} y={Y(p.y) - 8} className="grid-point-label small">
              {p.label}
            </text>
          )}
        </g>
      ))}
      {xLabel && (
        <text x={(left + W - pad) / 2} y={H - 6} className="plot-axis-title">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={14} y={(pad + H - bottom) / 2} transform={`rotate(-90 14 ${(pad + H - bottom) / 2})`} className="plot-axis-title">
          {yLabel}
        </text>
      )}
    </svg>
  );
}

/* ---------------------------------------------------------- unit circle */

export function UnitCircle({ angle, show = [] }: { angle: number; show?: ("sin" | "cos")[] }) {
  const R = 110;
  const cx = 150;
  const cy = 150;
  const rad = (angle * Math.PI) / 180;
  const px = cx + R * Math.cos(rad);
  const py = cy - R * Math.sin(rad);
  const large = ((angle % 360) + 360) % 360 > 180 ? 1 : 0;
  const sweepEnd = { x: cx + 30 * Math.cos(rad), y: cy - 30 * Math.sin(rad) };
  return (
    <svg className="plot unit-circle" viewBox="0 0 300 300" role="img" aria-label={`Unit circle at ${angle} degrees`}>
      <circle cx={cx} cy={cy} r={R} className="uc-circle" />
      <line x1="20" x2="280" y1={cy} y2={cy} className="axis" />
      <line y1="20" y2="280" x1={cx} x2={cx} className="axis" />
      {[0, 90, 180, 270].map((a) => (
        <text key={a} x={cx + (R + 16) * Math.cos((a * Math.PI) / 180)} y={cy - (R + 16) * Math.sin((a * Math.PI) / 180) + 5} className="grid-num">
          {a}°
        </text>
      ))}
      {angle % 360 !== 0 && <path d={`M${cx + 30} ${cy} A30 30 0 ${large} 0 ${sweepEnd.x} ${sweepEnd.y}`} className="angle-arc arc-0" />}
      <line x1={cx} y1={cy} x2={px} y2={py} className="ray ray-strong" />
      {show.includes("cos") && <line x1={cx} y1={cy} x2={px} y2={cy} className="uc-cos" />}
      {show.includes("sin") && <line x1={px} y1={cy} x2={px} y2={py} className="uc-sin" />}
      {show.includes("cos") && (
        <text x={(cx + px) / 2} y={cy + (py < cy ? 20 : -10)} className="uc-label cos">
          cos
        </text>
      )}
      {show.includes("sin") && (
        <text x={px + (px >= cx ? 8 : -8)} y={(cy + py) / 2 + 5} className={`uc-label sin${px >= cx ? "" : " end"}`}>
          sin
        </text>
      )}
      <circle cx={px} cy={py} r="7" className="plot-point" />
      <text x={cx + 38 * Math.cos(rad / 2)} y={cy - 38 * Math.sin(rad / 2) + 5} className="angle-label small">
        {angle}°
      </text>
    </svg>
  );
}

/* --------------------------------------------------------- right triangle */

export function RightTriangle({
  a,
  b,
  c,
  angle,
  unit = "",
}: {
  a: number | "?" | null;
  b: number | "?" | null;
  c: number | "?" | null;
  angle?: number | "?" | null;
  unit?: string;
}) {
  // Proportions from the numbers we know, kept within a sensible shape.
  const A = typeof a === "number" ? a : null;
  const B = typeof b === "number" ? b : null;
  const C = typeof c === "number" ? c : null;
  let ratio = 0.65;
  if (A && B) ratio = A / B;
  else if (A && C && C > A) ratio = A / Math.sqrt(C * C - A * A);
  else if (B && C && C > B) ratio = Math.sqrt(C * C - B * B) / B;
  else if (typeof angle === "number") ratio = Math.tan((angle * Math.PI) / 180);
  ratio = Math.min(1.6, Math.max(0.35, ratio));
  const w = ratio > 1 ? 220 / ratio : 260;
  const h = w * ratio;
  const x0 = 60;
  const y0 = 40 + h;
  const label = (v: number | "?" | null) => (v === null ? "" : v === "?" ? "?" : `${num(v)}${unit ? ` ${unit}` : ""}`);
  return (
    <svg className="rect-svg" viewBox={`0 0 ${w + 150} ${h + 90}`} role="img" aria-label="Right triangle">
      <polygon points={`${x0},${y0} ${x0 + w},${y0} ${x0 + w},${y0 - h}`} className="rect-body rect-edge-fill" />
      <polyline points={`${x0 + w - 16},${y0} ${x0 + w - 16},${y0 - 16} ${x0 + w},${y0 - 16}`} className="right-mark" />
      <text x={x0 + w / 2} y={y0 + 30} className={`side-label${b === "?" ? " ask" : ""}`}>
        {label(b)}
      </text>
      <text x={x0 + w + 12} y={y0 - h / 2 + 6} className={`side-label start${a === "?" ? " ask" : ""}`}>
        {label(a)}
      </text>
      <text x={x0 + w / 2 - 14} y={y0 - h / 2 - 10} className={`side-label end${c === "?" ? " ask" : ""}`}>
        {label(c)}
      </text>
      {angle !== undefined && angle !== null && (
        <>
          <path d={`M${x0 + 34} ${y0} A34 34 0 0 0 ${x0 + 34 * Math.cos(Math.atan(ratio))} ${y0 - 34 * Math.sin(Math.atan(ratio))}`} className="angle-arc arc-1" />
          <text x={x0 + 50} y={y0 - 10} className={`angle-label small${angle === "?" ? " ask" : ""}`}>
            {angle === "?" ? "θ" : `${num(angle)}°`}
          </text>
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ venn */

export function Venn({
  labels,
  left,
  both,
  right,
  outside,
  solved,
  answer,
}: {
  labels: [string, string];
  left: number | "?";
  both: number | "?";
  right: number | "?";
  outside?: number | "?";
  solved: boolean;
  answer: string;
}) {
  const show = (v: number | "?") => (v === "?" ? (solved ? answer : "?") : num(v));
  const cls = (v: number | "?") => `venn-num${v === "?" ? (solved ? " solved" : " ask") : ""}`;
  return (
    <svg className="rect-svg venn" viewBox="0 0 360 230" role="img" aria-label={`Venn diagram: ${labels[0]} and ${labels[1]}`}>
      <rect x="4" y="4" width="352" height="222" rx="16" className="venn-box" />
      <circle cx="140" cy="120" r="80" className="venn-a" />
      <circle cx="220" cy="120" r="80" className="venn-b" />
      <text x="110" y="32" className="venn-label">
        {labels[0]}
      </text>
      <text x="250" y="32" className="venn-label">
        {labels[1]}
      </text>
      <text x="105" y="128" className={cls(left)}>
        {show(left)}
      </text>
      <text x="180" y="128" className={cls(both)}>
        {show(both)}
      </text>
      <text x="255" y="128" className={cls(right)}>
        {show(right)}
      </text>
      {outside !== undefined && (
        <text x="330" y="212" className={cls(outside)}>
          {show(outside)}
        </text>
      )}
    </svg>
  );
}

/* --------------------------------------------------------------- box plot */

type FiveNumbers = { min: number; q1: number; median: number; q3: number; max: number };

export function BoxPlot({
  min,
  q1,
  median,
  q3,
  max,
  axis,
  label,
  second,
}: FiveNumbers & {
  axis: [number, number];
  label?: string;
  second?: FiveNumbers & { label: string };
}) {
  const W = 520;
  const pad = 30;
  const X = (v: number) => pad + ((v - axis[0]) / (axis[1] - axis[0])) * (W - pad * 2);
  const step = niceStep(axis[1] - axis[0], 10);
  const ticks: number[] = [];
  for (let v = Math.ceil(axis[0] / step) * step; v <= axis[1] + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return (
    <figure className="graph">
      {label && !second && <figcaption>{label}</figcaption>}
      <svg viewBox={`0 0 ${W} ${second ? 250 : 170}`} role="img" aria-label="Box plot">
        {[{ min, q1, median, q3, max, label: second ? (label ?? "") : "" }, ...(second ? [second] : [])].map((b, i) => {
          const cy = 70 + i * 80;
          return (
            <g key={i} className={i ? "box-second" : ""}>
              {b.label && second && (
                <text x={pad} y={cy - 36} className="grid-num start-label">
                  {b.label}
                </text>
              )}
              <line x1={X(b.min)} x2={X(b.q1)} y1={cy} y2={cy} className="box-whisker" />
              <line x1={X(b.q3)} x2={X(b.max)} y1={cy} y2={cy} className="box-whisker" />
              <line x1={X(b.min)} x2={X(b.min)} y1={cy - 18} y2={cy + 18} className="box-whisker" />
              <line x1={X(b.max)} x2={X(b.max)} y1={cy - 18} y2={cy + 18} className="box-whisker" />
              <rect x={X(b.q1)} y={cy - 26} width={X(b.q3) - X(b.q1)} height="52" rx="6" className="box-body" />
              <line x1={X(b.median)} x2={X(b.median)} y1={cy - 26} y2={cy + 26} className="box-median" />
            </g>
          );
        })}
        <line x1={pad - 8} x2={W - pad + 8} y1={second ? 210 : 130} y2={second ? 210 : 130} className="axis" />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={second ? 204 : 124} y2={second ? 216 : 136} className="axis" />
            <text x={X(v)} y={second ? 238 : 158} className="grid-num">
              {num(v)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

/* ---------------------------------------------------------- spinner, tree */

export function Spinner({ sections }: { sections: { colour: Colour; label?: string }[] }) {
  const n = sections.length;
  return (
    <svg className="plot spinner" viewBox="-1.25 -1.35 2.5 2.6" role="img" aria-label={`A spinner with ${n} equal parts`}>
      {sections.map((s, i) => {
        const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
        const mid = (a0 + a1) / 2;
        return (
          <g key={i}>
            <path
              d={n === 1 ? "M-1 0 A1 1 0 1 1 1 0 A1 1 0 1 1 -1 0 Z" : `M0 0 L${Math.cos(a0)} ${Math.sin(a0)} A1 1 0 0 1 ${Math.cos(a1)} ${Math.sin(a1)} Z`}
              style={{ fill: `var(--${s.colour})` }}
              className="spinner-part"
            />
            {s.label && (
              <text x={0.62 * Math.cos(mid)} y={0.62 * Math.sin(mid) + 0.07} className="spinner-label">
                {s.label}
              </text>
            )}
          </g>
        );
      })}
      <path d="M0 -1.3 L0.1 -1.08 L-0.1 -1.08 Z" className="spinner-pointer" />
      <circle r="0.08" className="clock-pin" />
    </svg>
  );
}

export function Tree({ stages, probs }: { stages: string[][]; probs?: string[][] }) {
  const leaves = stages.reduce((n, s) => n * s.length, 1);
  const row = probs ? 38 : 24;
  const H = Math.max(80, leaves * row + 20);
  const colW = probs ? 150 : 110;
  const W = colW * (stages.length + 1) + 90;
  const nodes: { x: number; y: number; label: string; prob?: string; parent?: { x: number; y: number }; path: string[] }[] = [];
  let level: { x: number; y: number; path: string[] }[] = [{ x: 20, y: H / 2, path: [] }];
  stages.forEach((stage, d) => {
    const next: typeof level = [];
    const span = leaves / stages.slice(0, d + 1).reduce((n, s) => n * s.length, 1);
    level.forEach((parent, pi) => {
      stage.forEach((label, k) => {
        const index = pi * stage.length + k;
        const y = 10 + (index * span + span / 2) * row;
        const node = { x: colW * (d + 1), y, path: [...parent.path, label] };
        const p = probs?.[d];
        nodes.push({ ...node, label, parent, prob: p?.length === stage.length ? p[k] : p?.[index] });
        next.push(node);
      });
    });
    level = next;
  });
  return (
    <svg className="tree" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tree diagram">
      {nodes.map((n, i) => (
        <line key={`l${i}`} x1={n.parent!.x + 14} y1={n.parent!.y} x2={n.x - 14} y2={n.y} className="tree-branch" />
      ))}
      {nodes.map(
        (n, i) =>
          n.prob && (
            <text key={`p${i}`} x={(n.parent!.x + n.x) / 2} y={(n.parent!.y + n.y) / 2 - 5} className="tree-prob">
              {n.prob}
            </text>
          ),
      )}
      <circle cx="20" cy={H / 2} r="6" className="center-dot" />
      {nodes.map((n, i) => (
        <text key={i} x={n.x} y={n.y + 5} className="tree-label">
          {n.label}
        </text>
      ))}
      {level.map((n, i) => (
        <text key={`o${i}`} x={n.x + 40} y={n.y + 5} className="tree-outcome">
          {n.path.join("")}
        </text>
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------- nets, slices */

export function Net({ solid, l = 3, w = 2, h = 2, unit }: { solid: "cube" | "prism" | "triangular-prism" | "pyramid"; l?: number; w?: number; h?: number; unit?: string }) {
  const s = 34;
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  const tris: string[] = [];
  let width = 0;
  let height = 0;
  if (solid === "cube" || solid === "prism") {
    const L = (solid === "cube" ? 2 : l) * s;
    const W = (solid === "cube" ? 2 : w) * s;
    const Hh = (solid === "cube" ? 2 : h) * s;
    // A cross: top, middle row of four, bottom.
    rects.push({ x: W, y: 0, w: L, h: W }, { x: 0, y: W, w: W, h: Hh }, { x: W, y: W, w: L, h: Hh }, { x: W + L, y: W, w: W, h: Hh }, { x: 2 * W + L, y: W, w: L, h: Hh }, { x: W, y: W + Hh, w: L, h: W });
    width = 2 * W + 2 * L;
    height = 2 * W + Hh;
  } else if (solid === "triangular-prism") {
    const L = l * s;
    const B = w * s;
    const tri = B * 0.87;
    rects.push({ x: 0, y: tri, w: L, h: B }, { x: 0, y: tri + B, w: L, h: B }, { x: 0, y: tri + 2 * B, w: L, h: B });
    tris.push(`${L},${tri} ${L + tri},${tri + B / 2} ${L},${tri + B}`, `0,${tri} ${-tri},${tri + B / 2} 0,${tri + B}`);
    width = L + 2 * tri;
    height = 3 * B + 2 * tri;
  } else {
    const B = l * s;
    const T = h * s;
    rects.push({ x: T, y: T, w: B, h: B });
    tris.push(`${T},${T} ${T + B},${T} ${T + B / 2},0`, `${T + B},${T} ${T + B},${T + B} ${2 * T + B},${T + B / 2}`, `${T},${T + B} ${T + B},${T + B} ${T + B / 2},${2 * T + B}`, `${T},${T} ${T},${T + B} 0,${T + B / 2}`);
    width = 2 * T + B;
    height = 2 * T + B;
  }
  const offX = solid === "triangular-prism" ? w * s * 0.87 + 20 : 20;
  return (
    <svg className="rect-svg" viewBox={`0 0 ${width + 40} ${height + 40}`} role="img" aria-label={`Net of a ${solid}`}>
      <g transform={`translate(${offX} 20)`}>
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} className="net-face" />
        ))}
        {tris.map((t, i) => (
          <polygon key={i} points={t} className="net-face net-tri" />
        ))}
        {unit && solid === "prism" && (
          <>
            <text x={w * s + (l * s) / 2} y={w * s + (h * s) / 2 + 6} className="side-label small">
              {l} × {h}
            </text>
            <text x={w * s + (l * s) / 2} y={(w * s) / 2 + 6} className="side-label small">
              {l} × {w}
            </text>
            <text x={(w * s) / 2} y={w * s + (h * s) / 2 + 6} className="side-label small">
              {w} × {h}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}

export function Slice({ solid, cut }: { solid: "cube" | "prism" | "cylinder" | "cone" | "pyramid" | "sphere"; cut: "horizontal" | "vertical" | "diagonal" }) {
  const plane =
    cut === "horizontal"
      ? "M2 52 L70 52 L98 40 L30 40 Z"
      : cut === "vertical"
        ? "M50 0 L62 -8 L62 92 L50 100 Z"
        : "M4 70 L66 20 L96 10 L34 60 Z";
  return (
    <span className="slice-wrap">
      <ShapeSvgLite shape={solid} />
      <svg viewBox="0 0 100 100" className="slice-plane" aria-hidden="true">
        <path d={plane} />
      </svg>
    </span>
  );
}
