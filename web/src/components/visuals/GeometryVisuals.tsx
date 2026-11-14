import type { Mark } from "../../game/types";
import { num } from "./NumberVisuals";

const rad = (deg: number) => (deg * Math.PI) / 180;

/** How a diagram label reads: numbers get the unit (or ° for angles), strings show as written. */
function markText(m: Mark | undefined, unit?: string, degrees = false) {
  if (m === null || m === undefined) return "";
  if (typeof m === "string") return m;
  return degrees ? `${num(m)}°` : `${num(m)}${unit ? ` ${unit}` : ""}`;
}

const askCls = (m: Mark | undefined) => (m === "?" ? " ask" : "");

type Pt = { x: number; y: number };

/**
 * An angle marker at `v` between the rays to `p` and `q` (screen coordinates): an arc, or a little square for
 * a right angle, with its label on the bisector.
 */
function AngleMark({ v, p, q, label, unit, r = 24, cls = "arc-1" }: { v: Pt; p: Pt; q: Pt; label: Mark | undefined; unit?: string; r?: number; cls?: string }) {
  const a1 = Math.atan2(p.y - v.y, p.x - v.x);
  const a2 = Math.atan2(q.y - v.y, q.x - v.x);
  let d = a2 - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  const mid = a1 + d / 2;
  const size = Math.abs(d);
  const right = Math.abs(size - Math.PI / 2) < 0.01;
  const text = markText(label, unit, true);
  const dist = Math.min(72, Math.max(r + 20, 16 / Math.sin(size / 2)));
  const pt = (a: number, k: number) => ({ x: v.x + k * Math.cos(a), y: v.y + k * Math.sin(a) });
  const s = pt(a1, r);
  const e = pt(a2, r);
  const sq = 15;
  return (
    <g>
      {right ? (
        <polyline
          points={`${pt(a1, sq).x},${pt(a1, sq).y} ${v.x + sq * (Math.cos(a1) + Math.cos(a2))},${v.y + sq * (Math.sin(a1) + Math.sin(a2))} ${pt(a2, sq).x},${pt(a2, sq).y}`}
          className="right-mark"
        />
      ) : (
        <path d={`M${s.x} ${s.y} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${e.x} ${e.y}`} className={`angle-arc ${cls}`} />
      )}
      {text && (
        <text x={pt(mid, dist).x} y={pt(mid, dist).y + 6} className={`angle-label mid${askCls(label)}`}>
          {text}
        </text>
      )}
    </g>
  );
}

/** A label for the segment p–q, set off to the side away from `away` (usually the shape's middle). */
function SideLabel({ p, q, away, label, unit, gap = 20 }: { p: Pt; q: Pt; away: Pt; label: Mark | undefined; unit?: string; gap?: number }) {
  const text = markText(label, unit);
  if (!text) return null;
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  let n = { x: -(q.y - p.y) / len, y: (q.x - p.x) / len };
  if (n.x * (m.x - away.x) + n.y * (m.y - away.y) < 0) n = { x: -n.x, y: -n.y };
  const x = m.x + n.x * gap;
  const y = m.y + n.y * gap;
  const anchor = Math.abs(n.x) > 0.5 ? (n.x > 0 ? " start" : " end") : "";
  return (
    <text x={x} y={y + 7} className={`side-label${anchor}${askCls(label)}`}>
      {text}
    </text>
  );
}

/* ---------------------------------------------------------------- triangle */

export function Triangle({
  shape,
  sides = [null, null, null],
  angles = [null, null, null],
  names = ["A", "B", "C"],
  unit,
}: {
  shape: [number, number, number];
  sides?: [Mark, Mark, Mark];
  angles?: [Mark, Mark, Mark];
  names?: [string, string, string];
  unit?: string;
}) {
  const [al, be, ga] = shape.map(rad);
  // Law of sines gives the side lengths; A at the origin, B along the base, C above.
  const b = Math.sin(be);
  const c = Math.sin(ga);
  const raw = [
    { x: 0, y: 0 },
    { x: c, y: 0 },
    { x: b * Math.cos(al), y: b * Math.sin(al) },
  ];
  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const maxY = Math.max(...raw.map((p) => p.y));
  const k = Math.min(300 / (maxX - minX), 190 / maxY);
  const m = 70;
  const W = (maxX - minX) * k + 2 * m;
  const H = maxY * k + 2 * m - 10;
  const P = raw.map((p) => ({ x: m + (p.x - minX) * k, y: H - m + 10 - p.y * k }));
  const mid = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3 };
  return (
    <svg className="rect-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Triangle">
      <polygon points={P.map((p) => `${p.x},${p.y}`).join(" ")} className="rect-edge-fill" />
      {P.map((v, i) =>
        angles[i] !== null || Math.abs(shape[i] - 90) < 0.01 ? (
          <AngleMark key={`a${i}`} v={v} p={P[(i + 1) % 3]} q={P[(i + 2) % 3]} label={angles[i]} cls={`arc-${(i % 3) + 1}`} />
        ) : null,
      )}
      {P.map((_, i) => (
        <SideLabel key={`s${i}`} p={P[(i + 1) % 3]} q={P[(i + 2) % 3]} away={mid} label={sides[i]} unit={unit} />
      ))}
      {P.map((v, i) => {
        const dx = v.x - mid.x;
        const dy = v.y - mid.y;
        const len = Math.hypot(dx, dy) || 1;
        return (
          <text key={`n${i}`} x={v.x + (dx / len) * 20} y={v.y + (dy / len) * 20 + 7} className="vertex-name">
            {names[i]}
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------ circle parts */

export function CircleParts({
  points,
  center,
  segments = [],
  tangents = [],
  angles = [],
  arcs = [],
  unit,
}: {
  points: { name: string; at: number; r?: number }[];
  center?: boolean;
  segments?: { from: string; to: string; label?: Mark; extend?: boolean }[];
  tangents?: { at: string; label?: Mark }[];
  angles?: { at: string; from: string; to: string; label: Mark }[];
  arcs?: { from: string; to: string; label: Mark }[];
  unit?: string;
}) {
  const R = 90;
  const reach = Math.max(1, ...points.map((p) => p.r ?? 1));
  const half = R * reach + 60;
  const O = { x: half, y: half };
  const S = 2 * half;
  const at = (deg: number, r = 1) => ({ x: O.x + R * r * Math.cos(rad(deg)), y: O.y - R * r * Math.sin(rad(deg)) });
  const pos: Record<string, Pt> = { O };
  for (const p of points) pos[p.name] = at(p.at, p.r ?? 1);
  const angleOf = (name: string) => points.find((p) => p.name === name)?.at ?? 0;
  const usesO = center || [...segments.flatMap((s) => [s.from, s.to]), ...angles.flatMap((a) => [a.at, a.from, a.to])].includes("O");
  const extended = (p: Pt, q: Pt) => {
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const ux = (q.x - p.x) / len;
    const uy = (q.y - p.y) / len;
    return { x1: p.x - ux * 26, y1: p.y - uy * 26, x2: q.x + ux * 26, y2: q.y + uy * 26 };
  };
  return (
    <svg className="rect-svg circle-parts" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Circle diagram">
      <circle cx={O.x} cy={O.y} r={R} className="cp-circle" />
      {arcs.map((a, i) => {
        const a1 = angleOf(a.from);
        let a2 = angleOf(a.to);
        while (a2 <= a1) a2 += 360;
        const s = at(a1);
        const e = at(a2);
        const m = at((a1 + a2) / 2, 1 + 28 / R);
        return (
          <g key={`arc${i}`}>
            <path d={`M${s.x} ${s.y} A${R} ${R} 0 ${a2 - a1 > 180 ? 1 : 0} 0 ${e.x} ${e.y}`} className="cp-arc" />
            <text x={m.x} y={m.y + 6} className={`angle-label mid${askCls(a.label)}`}>
              {markText(a.label, undefined, true)}
            </text>
          </g>
        );
      })}
      {tangents.map((t, i) => {
        const deg = angleOf(t.at);
        const p = pos[t.at];
        const ux = -Math.sin(rad(deg));
        const uy = -Math.cos(rad(deg));
        return (
          <g key={`t${i}`}>
            <line x1={p.x - ux * 110} y1={p.y - uy * 110} x2={p.x + ux * 110} y2={p.y + uy * 110} className="cp-line cp-tangent" />
            <SideLabel p={p} q={{ x: p.x + ux * 110, y: p.y + uy * 110 }} away={O} label={t.label} unit={unit} />
          </g>
        );
      })}
      {segments.map((s, i) => {
        const p = pos[s.from];
        const q = pos[s.to];
        if (!p || !q) return null;
        const l = s.extend ? extended(p, q) : { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
        return (
          <g key={`s${i}`}>
            <line {...l} className="cp-line" />
            <SideLabel p={p} q={q} away={O} label={s.label} unit={unit} gap={16} />
          </g>
        );
      })}
      {angles.map((a, i) =>
        pos[a.at] && pos[a.from] && pos[a.to] ? <AngleMark key={`g${i}`} v={pos[a.at]} p={pos[a.from]} q={pos[a.to]} label={a.label} r={20} cls={`arc-${(i % 3) + 1}`} /> : null,
      )}
      {usesO &&
        (() => {
          const ends = [...segments.flatMap((s) => (s.from === "O" ? [s.to] : s.to === "O" ? [s.from] : [])), ...angles.filter((a) => a.at === "O").flatMap((a) => [a.from, a.to])]
            .map((n) => pos[n])
            .filter(Boolean);
          const sx = ends.reduce((t, p) => t + (p.x - O.x) / (Math.hypot(p.x - O.x, p.y - O.y) || 1), 0);
          const sy = ends.reduce((t, p) => t + (p.y - O.y) / (Math.hypot(p.x - O.x, p.y - O.y) || 1), 0);
          const len = Math.hypot(sx, sy);
          const dir = len > 0.1 ? { x: -sx / len, y: -sy / len } : { x: -0.6, y: 0.8 };
          return (
            <>
              <circle cx={O.x} cy={O.y} r="5" className="center-dot" />
              <text x={O.x + dir.x * 20} y={O.y + dir.y * 20 + 6} className="vertex-name">
                O
              </text>
            </>
          );
        })()}
      {points.map((p) => {
        const q = pos[p.name];
        const lab = at(p.at, (p.r ?? 1) + 20 / R);
        return (
          <g key={p.name}>
            <circle cx={q.x} cy={q.y} r="5" className="cp-point" />
            <text x={lab.x} y={lab.y + 7} className="vertex-name">
              {p.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ matrix */

export function Matrices({ items }: { items: ({ name?: string; rows: (number | string)[][] } | string)[] }) {
  return (
    <div className="matrices">
      {items.map((it, i) =>
        typeof it === "string" ? (
          <span key={i} className="matrix-op">
            {it}
          </span>
        ) : (
          <span key={i} className="matrix-wrap">
            {it.name && <span className="matrix-name">{it.name} =</span>}
            <span className="matrix" style={{ gridTemplateColumns: `repeat(${Math.max(...it.rows.map((r) => r.length))}, auto)` }} role="table">
              {it.rows.flatMap((row, r) =>
                row.map((v, c) => (
                  <span key={`${r}-${c}`} className={`matrix-cell${v === "?" ? " ask" : ""}`} role="cell">
                    {typeof v === "number" ? num(v) : v}
                  </span>
                )),
              )}
            </span>
          </span>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------- transversal */

export function Transversal({ tilt, labels }: { tilt: number; labels: Mark[] }) {
  const W = 420;
  const H = 300;
  const yTop = 95;
  const yBot = 205;
  const t = rad(Math.min(150, Math.max(30, tilt)));
  const run = (yBot - yTop) / 2 / Math.tan(t);
  const top = { x: W / 2 + run, y: yTop };
  const bot = { x: W / 2 - run, y: yBot };
  const ux = Math.cos(t);
  const uy = -Math.sin(t);
  const ext = Math.min(85 / Math.sin(t), (W / 2 - 12 - Math.abs(run)) / Math.max(0.01, Math.abs(Math.cos(t))));
  // The four angles at a crossing sit between the line's two directions and the transversal's two.
  const bisectors = [(t + Math.PI) / 2, t / 2, Math.PI + t / 2, (3 * Math.PI) / 2 + t / 2];
  const label = (c: Pt, k: number, m: Mark) => {
    const a = bisectors[k];
    const half = k === 1 || k === 2 ? t / 2 : (Math.PI - t) / 2;
    const d = Math.min(58, Math.max(26, 15 / Math.sin(half)));
    return (
      <text key={`${c.y}-${k}`} x={c.x + d * Math.cos(a)} y={c.y - d * Math.sin(a) + 6} className={`angle-label mid${askCls(m)}`}>
        {markText(m, undefined, true)}
      </text>
    );
  };
  const chevron = (x: number, y: number) => <path d={`M${x - 6} ${y - 7} L${x + 4} ${y} L${x - 6} ${y + 7}`} className="tv-chevron" />;
  return (
    <svg className="rect-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two parallel lines cut by a transversal">
      <line x1="20" x2={W - 20} y1={yTop} y2={yTop} className="ray" />
      <line x1="20" x2={W - 20} y1={yBot} y2={yBot} className="ray" />
      {chevron(60, yTop)}
      {chevron(60, yBot)}
      <line x1={top.x + ux * ext} y1={top.y + uy * ext} x2={bot.x - ux * ext} y2={bot.y - uy * ext} className="ray ray-b" />
      <circle cx={top.x} cy={top.y} r="4.5" className="center-dot" />
      <circle cx={bot.x} cy={bot.y} r="4.5" className="center-dot" />
      {[0, 1, 2, 3].map((k) => label(top, k, labels[k] ?? null))}
      {[0, 1, 2, 3].map((k) => label(bot, k, labels[k + 4] ?? null))}
    </svg>
  );
}

/* ----------------------------------------------------------------- solids */

export function Solid({
  solid,
  r,
  h,
  slant,
  diameter,
  unit,
}: {
  solid: "cylinder" | "cone" | "sphere" | "hemisphere";
  r?: Mark;
  h?: Mark;
  slant?: Mark;
  diameter?: boolean;
  unit?: string;
}) {
  const cx = 160;
  const R = 80;
  const e = 22;
  const rText = markText(r, unit);
  const hText = markText(h, unit);
  const sText = markText(slant, unit);
  // The radius (or diameter) drawn across an ellipse centred at (cx, y), labelled just above it.
  const across = (y: number) =>
    rText && (
      <g>
        <line x1={diameter ? cx - R : cx} x2={cx + R} y1={y} y2={y} className="solid-dim" />
        <circle cx={cx} cy={y} r="4" className="center-dot" />
        <text x={diameter ? cx : cx + R / 2} y={y - e - 8} className={`side-label${askCls(r)}`}>
          {rText}
        </text>
      </g>
    );
  if (solid === "cylinder") {
    const y1 = 50;
    const y2 = 210;
    return (
      <svg className="rect-svg solid-svg" viewBox="0 -14 330 264" role="img" aria-label="Cylinder">
        <path d={`M${cx - R} ${y1} L${cx - R} ${y2} A${R} ${e} 0 0 0 ${cx + R} ${y2} L${cx + R} ${y1}`} className="solid-body" />
        <path d={`M${cx - R} ${y2} A${R} ${e} 0 0 1 ${cx + R} ${y2}`} className="solid-hidden" />
        <ellipse cx={cx} cy={y1} rx={R} ry={e} className="solid-top" />
        {across(y1)}
        {hText && (
          <text x={cx + R + 10} y={(y1 + y2) / 2 + 7} className={`side-label start${askCls(h)}`}>
            {hText}
          </text>
        )}
      </svg>
    );
  }
  if (solid === "cone") {
    const apex = { x: cx, y: 30 };
    const yb = 210;
    return (
      <svg className="rect-svg solid-svg" viewBox="0 0 330 266" role="img" aria-label="Cone">
        <path d={`M${cx - R} ${yb} L${apex.x} ${apex.y} L${cx + R} ${yb} A${R} ${e} 0 0 1 ${cx - R} ${yb}`} className="solid-body" />
        <path d={`M${cx - R} ${yb} A${R} ${e} 0 0 1 ${cx + R} ${yb}`} className="solid-hidden" />
        {hText && (
          <>
            <line x1={cx} x2={cx} y1={apex.y} y2={yb} className="solid-dim dashed" />
            <polyline points={`${cx},${yb - 14} ${cx - 14},${yb - 14} ${cx - 14},${yb}`} className="right-mark" />
            <text x={cx - 10} y={(apex.y + yb) / 2 + 7} className={`side-label end${askCls(h)}`}>
              {hText}
            </text>
          </>
        )}
        {sText && (
          <text x={(apex.x + cx + R) / 2 + 12} y={(apex.y + yb) / 2 + 7} className={`side-label start${askCls(slant)}`}>
            {sText}
          </text>
        )}
        {rText && (
          <g>
            <line x1={diameter ? cx - R : cx} x2={cx + R} y1={yb} y2={yb} className="solid-dim" />
            <circle cx={cx} cy={yb} r="4" className="center-dot" />
            <text x={diameter ? cx : cx + R / 2} y={yb + e + 28} className={`side-label${askCls(r)}`}>
              {rText}
            </text>
          </g>
        )}
      </svg>
    );
  }
  const cy = solid === "sphere" ? 125 : 160;
  return (
    <svg className="rect-svg solid-svg" viewBox="0 0 330 250" role="img" aria-label={solid === "sphere" ? "Sphere" : "Hemisphere"}>
      {solid === "sphere" ? (
        <circle cx={cx} cy={cy} r={R + 15} className="solid-body" />
      ) : (
        <path d={`M${cx - R - 15} ${cy} A${R + 15} ${R + 15} 0 0 1 ${cx + R + 15} ${cy} A${R + 15} ${e} 0 0 1 ${cx - R - 15} ${cy}`} className="solid-body" />
      )}
      <path d={`M${cx - R - 15} ${cy} A${R + 15} ${e} 0 0 1 ${cx + R + 15} ${cy}`} className="solid-hidden" />
      {solid === "hemisphere" && <path d={`M${cx - R - 15} ${cy} A${R + 15} ${e} 0 0 0 ${cx + R + 15} ${cy}`} className="solid-edge" />}
      {rText && (
        <g>
          <line x1={diameter ? cx - R - 15 : cx} x2={cx + R + 15} y1={cy} y2={cy} className="solid-dim" />
          <circle cx={cx} cy={cy} r="4" className="center-dot" />
          <text x={diameter ? cx : cx + (R + 15) / 2} y={solid === "hemisphere" ? cy - 30 : cy + 32} className={`side-label${askCls(r)}`}>
            {rText}
          </text>
        </g>
      )}
    </svg>
  );
}
