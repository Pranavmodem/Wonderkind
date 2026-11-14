import { useMemo, useState } from "react";
import { sfx } from "../../game/sound";
import type { Activity } from "../../game/types";
import { symmetryLines } from "../../game/validate";
import { num } from "../visuals/NumberVisuals";
import { range, svgPoint, useReport, type ActivityProps } from "./shared";

type Of<K extends Activity["kind"]> = Extract<Activity, { kind: K }>;
type P = { x: number; y: number };

/** Graph paper sized for `lo..hi` on both axes; tap handler reports the nearest grid point. */
function GridPaper({
  lo,
  hi,
  axes,
  onTap,
  locked,
  children,
}: {
  lo: number;
  hi: number;
  axes: boolean;
  onTap: (p: P) => void;
  locked: boolean;
  children: (X: (x: number) => number, Y: (y: number) => number) => React.ReactNode;
}) {
  const span = hi - lo;
  const W = 340;
  const pad = 30;
  const u = W / span;
  const X = (x: number) => pad + (x - lo) * u;
  const Y = (y: number) => pad + (hi - y) * u;
  const every = span > 12 ? 2 : 1;
  return (
    <svg
      className="grid-svg act-svg"
      viewBox={`0 0 ${W + pad * 2} ${W + pad * 2}`}
      onClick={(e) => {
        if (locked) return;
        const p = svgPoint(e.currentTarget, e);
        const gx = Math.round((p.x - pad) / u + lo);
        const gy = Math.round(hi - (p.y - pad) / u);
        if (gx >= lo && gx <= hi && gy >= lo && gy <= hi) onTap({ x: gx, y: gy });
      }}
      role="group"
      aria-label="Tap a point on the grid"
    >
      <rect x={pad} y={pad} width={W} height={W} rx="6" className="grid-bg" />
      {range(span + 1).map((i) => {
        const v = lo + i;
        return (
          <g key={i}>
            <line x1={X(v)} x2={X(v)} y1={Y(hi)} y2={Y(lo)} className={axes && v === 0 ? "axis" : "gridline"} />
            <line y1={Y(v)} y2={Y(v)} x1={X(lo)} x2={X(hi)} className={axes && v === 0 ? "axis" : "gridline"} />
            {axes && v % every === 0 && v !== 0 && (
              <>
                <text x={X(v)} y={Y(Math.max(lo, 0)) + 18} className="grid-num">
                  {num(v)}
                </text>
                <text x={X(Math.max(lo, 0)) - 8} y={Y(v) + 5} className="grid-num end">
                  {num(v)}
                </text>
              </>
            )}
          </g>
        );
      })}
      {children(X, Y)}
    </svg>
  );
}

/* --------------------------------------------------------------- plotPoints */

export function PlotPoints({ a, solved, locked, onChange }: ActivityProps<Of<"plotPoints">>) {
  const [placed, setPlaced] = useState<P[]>([]);
  const lo = a.quadrants === 4 ? -a.size : 0;
  const shown = solved ? a.points : placed;
  useReport(placed.length === a.points.length && placed.every((p, i) => p.x === a.points[i].x && p.y === a.points[i].y), onChange);
  const next = a.points[placed.length];
  return (
    <div className="act-plot">
      <p className="act-direction">{solved ? "Here they are:" : next ? `Tap where ${next.label} goes` : "All placed! Tap Check."}</p>
      <GridPaper
        lo={lo}
        hi={a.size}
        axes
        locked={locked}
        onTap={(p) => {
          sfx.tap();
          setPlaced((prev) => {
            const at = prev.findIndex((q) => q.x === p.x && q.y === p.y);
            if (at >= 0) return prev.slice(0, at);
            return prev.length < a.points.length ? [...prev, p] : prev;
          });
        }}
      >
        {(X, Y) =>
          shown.map((p, i) => (
            <g key={i}>
              <circle cx={X(p.x)} cy={Y(p.y)} r="9" className="grid-point" style={{ fill: `var(--w)` }} />
              <text x={X(p.x) + 12} y={Y(p.y) - 10} className="grid-point-label">
                {a.points[i].label}
              </text>
            </g>
          ))
        }
      </GridPaper>
    </div>
  );
}

/* ---------------------------------------------------------------- drawShape */

const cross = (a: P, b: P) => a.x * b.y - a.y * b.x;
const dot = (a: P, b: P) => a.x * b.x + a.y * b.y;
const sub = (a: P, b: P) => ({ x: a.x - b.x, y: a.y - b.y });

function segmentsCross(p1: P, p2: P, p3: P, p4: P) {
  const d1 = cross(sub(p4, p3), sub(p1, p3));
  const d2 = cross(sub(p4, p3), sub(p2, p3));
  const d3 = cross(sub(p2, p1), sub(p3, p1));
  const d4 = cross(sub(p2, p1), sub(p4, p1));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** The properties of a closed polygon, or null if it's not a proper polygon. */
export function polygonFacts(v: P[]) {
  const n = v.length;
  if (n < 3) return null;
  const e = v.map((p, i) => sub(v[(i + 1) % n], p));
  if (e.some((d, i) => cross(e[(i + n - 1) % n], d) === 0)) return null; // straight-through corner or doubling back
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (!(i === 0 && j === n - 1) && segmentsCross(v[i], v[i + 1], v[j], v[(j + 1) % n])) return null;
  const twice = v.reduce((s, p, i) => s + cross(p, v[(i + 1) % n]), 0);
  const orient = Math.sign(twice);
  const rightAngles = e.filter((d, i) => dot(e[(i + n - 1) % n], d) === 0 && Math.sign(cross(e[(i + n - 1) % n], d)) === orient).length;
  const lens = e.map((d) => Math.hypot(d.x, d.y));
  let parallelPairs = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (cross(e[i], e[j]) === 0) parallelPairs++;
  return {
    sides: n,
    rightAngles,
    equalSides: lens.every((l) => Math.abs(l - lens[0]) < 1e-9),
    parallelPairs,
    area: Math.abs(twice) / 2,
    perimeter: lens.reduce((s, l) => s + l, 0),
  };
}

function fits(a: Of<"drawShape">, v: P[]) {
  const f = polygonFacts(v);
  if (!f || f.sides !== a.sides) return false;
  if (a.rightAngles !== undefined && f.rightAngles !== a.rightAngles) return false;
  if (a.equalSides !== undefined && f.equalSides !== a.equalSides) return false;
  if (a.parallelPairs !== undefined && f.parallelPairs !== a.parallelPairs) return false;
  if (a.area !== undefined && Math.abs(f.area - a.area) > 1e-9) return false;
  if (a.perimeter !== undefined && Math.abs(f.perimeter - a.perimeter) > 1e-9) return false;
  return true;
}

/** Find a shape that meets the brief, to show after a second miss. */
export function exampleShape(a: Of<"drawShape">): P[] | null {
  const s = a.size;
  const tries: P[][] = [];
  for (let w = 1; w <= s; w++) for (let h = 1; h <= s; h++) tries.push([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }]);
  for (let w = 1; w <= s; w++) for (let h = 1; h <= s; h++) for (let k = 0; k <= w; k++) tries.push([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: k, y: h }]);
  for (let w = 2; w <= s; w++) for (let h = 1; h <= s; h++) for (let o = 1; o < s - w + 1; o++) tries.push([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w + o, y: h }, { x: o, y: h }]);
  for (let w = 2; w <= s; w++) for (let h = 1; h <= s; h++) for (let t = 1; t < w; t++) tries.push([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: t + Math.floor((w - t) / 2), y: h }, { x: Math.floor((w - t) / 2), y: h }]);
  for (let r = 1; r * 2 <= s; r++) for (let q = 1; q * 2 <= s; q++) tries.push([{ x: r, y: 0 }, { x: 2 * r, y: q }, { x: r, y: 2 * q }, { x: 0, y: q }]);
  for (let w = 2; w <= s; w++) for (let h = 2; h <= s; h++) for (let r = 1; r < h && r <= s - h; r++) tries.push([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: Math.floor(w / 2), y: h + r }, { x: 0, y: h }]);
  for (let w = 2; w <= s; w++) for (let h = 2; h <= s; h++) for (let cw = 1; cw < w; cw++) for (let ch = 1; ch < h; ch++) tries.push([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h - ch }, { x: w - cw, y: h - ch }, { x: w - cw, y: h }, { x: 0, y: h }]);
  tries.push([{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 2 }, { x: 3, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 2 }]);
  tries.push([{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 1 }]);
  tries.push([{ x: 0, y: 1 }, { x: 2, y: 0 }, { x: 4, y: 1 }, { x: 3, y: 4 }, { x: 1, y: 4 }]);
  return tries.find((t) => t.every((p) => p.x <= s && p.y <= s) && fits(a, t)) ?? null;
}

export function DrawShape({ a, solved, locked, onChange }: ActivityProps<Of<"drawShape">>) {
  const [pts, setPts] = useState<P[]>([]);
  const [closed, setClosed] = useState(false);
  const example = useMemo(() => exampleShape(a), [a]);
  const shown = solved && example ? example : pts;
  const isClosed = solved ? Boolean(example) : closed;
  useReport(closed && fits(a, pts), onChange);
  const tap = (p: P) => {
    if (closed) return;
    sfx.tap();
    setPts((prev) => {
      if (prev.length >= 3 && p.x === prev[0].x && p.y === prev[0].y) {
        setClosed(true);
        return prev;
      }
      return prev.some((q) => q.x === p.x && q.y === p.y) ? prev : [...prev, p];
    });
  };
  return (
    <div className="act-draw">
      <GridPaper lo={0} hi={a.size} axes={false} locked={locked || (solved && Boolean(example))} onTap={tap}>
        {(X, Y) => (
          <>
            {isClosed && shown.length >= 3 && <polygon points={shown.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} className="act-shape-fill" />}
            <polyline points={shown.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} className="act-shape-line" />
            {isClosed && shown.length >= 3 && <line x1={X(shown[shown.length - 1].x)} y1={Y(shown[shown.length - 1].y)} x2={X(shown[0].x)} y2={Y(shown[0].y)} className="act-shape-line" />}
            {range(a.size + 1).map((x) =>
              range(a.size + 1).map((y) => <circle key={`${x}-${y}`} cx={X(x)} cy={Y(y)} r="3.5" className="act-grid-dot" />),
            )}
            {shown.map((p, i) => (
              <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={i === 0 && !isClosed ? 10 : 7} className={i === 0 && !isClosed ? "act-corner first" : "act-corner"} />
            ))}
          </>
        )}
      </GridPaper>
      <div className="act-row">
        <button type="button" className="btn btn-small btn-quiet" disabled={locked || !pts.length} onClick={() => (closed ? setClosed(false) : setPts(pts.slice(0, -1)))}>
          Undo
        </button>
        <button type="button" className="btn btn-small btn-quiet" disabled={locked || !pts.length} onClick={() => (setPts([]), setClosed(false))}>
          Start over
        </button>
      </div>
      <p className="act-tip-text">{closed ? "Shape closed. Tap Check!" : pts.length >= 3 ? "Tap the first corner again to close the shape." : "Tap dots to make the corners."}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- drawLine */

export function DrawLine({ a, solved, locked, onChange }: ActivityProps<Of<"drawLine">>) {
  const [pts, setPts] = useState<P[]>([]);
  const lo = a.quadrants === 4 ? -a.size : 0;
  const onLine = (p: P) => Math.abs(p.y - (a.m * p.x + a.b)) < 1e-9;
  const truth = useMemo(() => {
    const out: P[] = [];
    for (let x = lo; x <= a.size && out.length < 2; x++) {
      const y = a.m * x + a.b;
      if (Math.abs(y - Math.round(y)) < 1e-9 && y >= lo && y <= a.size) out.push({ x, y: Math.round(y) });
    }
    return out;
  }, [a.m, a.b, a.size, lo]);
  const shown = solved ? truth : pts;
  useReport(pts.length === 2 && pts.every(onLine), onChange);
  return (
    <div className="act-plot">
      <GridPaper
        lo={lo}
        hi={a.size}
        axes
        locked={locked}
        onTap={(p) => {
          sfx.tap();
          setPts((prev) => (prev.length >= 2 ? [p] : prev.some((q) => q.x === p.x && q.y === p.y) ? prev : [...prev, p]));
        }}
      >
        {(X, Y) => {
          let line = null;
          if (shown.length === 2 && shown[0].x !== shown[1].x) {
            const m = (shown[1].y - shown[0].y) / (shown[1].x - shown[0].x);
            const f = (x: number) => shown[0].y + m * (x - shown[0].x);
            line = <line x1={X(lo)} y1={Y(f(lo))} x2={X(a.size)} y2={Y(f(a.size))} className="act-line" />;
          } else if (shown.length === 2) {
            line = <line x1={X(shown[0].x)} y1={Y(lo)} x2={X(shown[0].x)} y2={Y(a.size)} className="act-line" />;
          }
          return (
            <>
              <defs>
                <clipPath id="act-line-clip">
                  <rect x={X(lo)} y={Y(a.size)} width={X(a.size) - X(lo)} height={Y(lo) - Y(a.size)} />
                </clipPath>
              </defs>
              <g clipPath="url(#act-line-clip)">{line}</g>
              {shown.map((p, i) => (
                <circle key={i} cx={X(p.x)} cy={Y(p.y)} r="8" className="grid-point" style={{ fill: "var(--w)" }} />
              ))}
            </>
          );
        }}
      </GridPaper>
      <p className="act-tip-text">{pts.length < 2 ? "Tap two points that are on the line." : "Tap again to start over."}</p>
    </div>
  );
}

/* --------------------------------------------------------------- drawFigure */

type End = "stop" | "arrow";
interface Figure {
  a: P;
  b: P;
  ends: [End, End];
}

export function DrawFigure({ a, solved, locked, onChange }: ActivityProps<Of<"drawFigure">>) {
  const two = a.figure === "parallel" || a.figure === "perpendicular";
  const [figs, setFigs] = useState<Figure[]>([]);
  const [pending, setPending] = useState<P | null>(null);
  const want: [End, End] = a.figure === "segment" ? ["stop", "stop"] : a.figure === "ray" ? ["stop", "arrow"] : ["arrow", "arrow"];
  const dir = (f: Figure) => sub(f.b, f.a);
  const correct = two
    ? figs.length === 2 && (a.figure === "parallel" ? cross(dir(figs[0]), dir(figs[1])) === 0 && cross(dir(figs[0]), sub(figs[1].a, figs[0].a)) !== 0 : dot(dir(figs[0]), dir(figs[1])) === 0)
    : figs.length === 1 && [...figs[0].ends].sort().join() === [...want].sort().join();
  useReport(correct, onChange);
  const example: Figure[] = two
    ? a.figure === "parallel"
      ? [
          { a: { x: 1, y: 1 }, b: { x: 4, y: 3 }, ends: ["arrow", "arrow"] },
          { a: { x: 1, y: 3 }, b: { x: 4, y: 5 }, ends: ["arrow", "arrow"] },
        ]
      : [
          { a: { x: 1, y: 2 }, b: { x: 5, y: 2 }, ends: ["arrow", "arrow"] },
          { a: { x: 3, y: 0 }, b: { x: 3, y: 4 }, ends: ["arrow", "arrow"] },
        ]
    : [{ a: { x: 1, y: 1 }, b: { x: 4, y: 3 }, ends: want }];
  const shown = solved ? example : figs;
  const toggle = (fi: number, end: 0 | 1) => {
    if (locked) return;
    sfx.tap();
    setFigs((prev) => prev.map((f, i) => (i === fi ? { ...f, ends: f.ends.map((e, k) => (k === end ? (e === "stop" ? "arrow" : "stop") : e)) as [End, End] } : f)));
  };
  return (
    <div className="act-draw">
      <GridPaper
        lo={0}
        hi={a.size}
        axes={false}
        locked={locked || solved}
        onTap={(p) => {
          sfx.tap();
          if (!pending) {
            if (figs.length >= (two ? 2 : 1)) setFigs([]);
            setPending(p);
          } else if (p.x !== pending.x || p.y !== pending.y) {
            setFigs((prev) => [...prev, { a: pending, b: p, ends: two ? ["arrow", "arrow"] : ["stop", "stop"] }]);
            setPending(null);
          }
        }}
      >
        {(X, Y) => (
          <>
            {range(a.size + 1).map((x) => range(a.size + 1).map((y) => <circle key={`${x}-${y}`} cx={X(x)} cy={Y(y)} r="3.5" className="act-grid-dot" />))}
            {shown.map((f, i) => {
              const d = dir(f);
              const len = Math.hypot(d.x, d.y);
              const ux = d.x / len;
              const uy = d.y / len;
              const ext = (p: P, s: number, end: End) => (end === "arrow" ? { x: p.x + ux * s * 0.8, y: p.y + uy * s * 0.8 } : p);
              const p0 = ext(f.a, -1, f.ends[0]);
              const p1 = ext(f.b, 1, f.ends[1]);
              const head = (p: P, s: number) => {
                const tip = { x: X(p.x), y: Y(p.y) };
                const bx = -ux * s;
                const by = uy * s;
                return `M${tip.x} ${tip.y} L${tip.x + bx * 14 - by * 8} ${tip.y + by * 14 + bx * 8} L${tip.x + bx * 14 + by * 8} ${tip.y + by * 14 - bx * 8} Z`;
              };
              return (
                <g key={i}>
                  <line x1={X(p0.x)} y1={Y(p0.y)} x2={X(p1.x)} y2={Y(p1.y)} className="act-line" />
                  {f.ends[0] === "arrow" && <path d={head(p0, -1)} className="geo-arrowhead" />}
                  {f.ends[1] === "arrow" && <path d={head(p1, 1)} className="geo-arrowhead" />}
                  <circle cx={X(f.a.x)} cy={Y(f.a.y)} r="7" className="act-corner" />
                  <circle cx={X(f.b.x)} cy={Y(f.b.y)} r="7" className="act-corner" />
                </g>
              );
            })}
            {pending && <circle cx={X(pending.x)} cy={Y(pending.y)} r="10" className="act-corner first" />}
          </>
        )}
      </GridPaper>
      {!two && figs.length === 1 && !solved && (
        <div className="act-row">
          <button type="button" className="btn btn-small btn-quiet" disabled={locked} onClick={() => toggle(0, 0)}>
            First end: {figs[0].ends[0] === "stop" ? "● stop" : "➜ arrow"}
          </button>
          <button type="button" className="btn btn-small btn-quiet" disabled={locked} onClick={() => toggle(0, 1)}>
            Other end: {figs[0].ends[1] === "stop" ? "● stop" : "➜ arrow"}
          </button>
        </div>
      )}
      <p className="act-tip-text">
        {two
          ? figs.length < 2
            ? `Tap two points for line ${figs.length + 1}.`
            : "Tap again to start over."
          : figs.length
            ? "Set each end: a stop, or an arrow that keeps going."
            : "Tap two points."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- symmetryLine */

export function SymmetryLine({ a, solved, locked, onChange }: ActivityProps<Of<"symmetryLine">>) {
  const [pts, setPts] = useState<P[]>([]);
  const lines = useMemo(() => symmetryLines(a.points), [a.points]);
  const matches = (p: P, q: P) =>
    lines.some((l) => {
      const onIt = (r: P) => Math.abs((r.x - l.cx) * l.dy - (r.y - l.cy) * l.dx) < 1e-6;
      return onIt(p) && onIt(q);
    });
  useReport(pts.length === 2 && matches(pts[0], pts[1]), onChange);
  const truth = lines[0];
  const shown: P[] = solved && truth ? [{ x: truth.cx - truth.dx * a.size, y: truth.cy - truth.dy * a.size }, { x: truth.cx + truth.dx * a.size, y: truth.cy + truth.dy * a.size }] : pts;
  const S = a.size;
  const W = 340;
  const pad = 30;
  const u = W / S;
  const X = (x: number) => pad + x * u;
  const Y = (y: number) => pad + (S - y) * u;
  return (
    <div className="act-draw">
      <svg
        className="grid-svg act-svg"
        viewBox={`0 0 ${W + pad * 2} ${W + pad * 2}`}
        onClick={(e) => {
          if (locked || solved) return;
          const p = svgPoint(e.currentTarget, e);
          const gx = Math.round(((p.x - pad) / u) * 2) / 2;
          const gy = Math.round((S - (p.y - pad) / u) * 2) / 2;
          if (gx < 0 || gy < 0 || gx > S || gy > S) return;
          sfx.tap();
          setPts((prev) => (prev.length >= 2 ? [{ x: gx, y: gy }] : [...prev, { x: gx, y: gy }]));
        }}
        role="group"
        aria-label="Tap two points on the fold line"
      >
        <rect x={pad} y={pad} width={W} height={W} rx="6" className="grid-bg" />
        {range(S + 1).map((i) => (
          <g key={i}>
            <line x1={X(i)} x2={X(i)} y1={Y(S)} y2={Y(0)} className="gridline" />
            <line y1={Y(i)} y2={Y(i)} x1={X(0)} x2={X(S)} className="gridline" />
          </g>
        ))}
        <polygon points={a.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} className="act-shape-fill act-shape-line" />
        <defs>
          <clipPath id="sym-clip">
            <rect x={pad} y={pad} width={W} height={W} />
          </clipPath>
        </defs>
        {shown.length === 2 && (
          <g clipPath="url(#sym-clip)">
            {(() => {
              const d = sub(shown[1], shown[0]);
              const k = (S * 3) / Math.max(1e-9, Math.hypot(d.x, d.y));
              return <line x1={X(shown[0].x - d.x * k)} y1={Y(shown[0].y - d.y * k)} x2={X(shown[0].x + d.x * k)} y2={Y(shown[0].y + d.y * k)} className="act-fold" />;
            })()}
          </g>
        )}
        {!solved && pts.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r="8" className="act-corner first" />)}
      </svg>
      <p className="act-tip-text">{pts.length < 2 ? "Tap two points on the fold line. You can tap between grid lines too." : "Tap again to start over."}</p>
    </div>
  );
}
