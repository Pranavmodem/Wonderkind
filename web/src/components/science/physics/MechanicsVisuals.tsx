/* Mechanics pictures: forces, ramps, motion diagrams, collisions, springs and pendulums, orbits, fluids. */
import type { CSSProperties, ReactNode } from "react";
import type { ForceArrow, PhysicsVisual } from "../../../game/science/physicsTypes";
import type { Colour, Mark } from "../../../game/types";
import {
  ARROW_COLOURS,
  Arrow,
  Bounds,
  Dimension,
  Emoji,
  Ground,
  Label,
  Note,
  PhysSvg,
  boxEdge,
  clamp,
  col,
  markText,
  rad,
  range,
  tipPlacement,
  type Ctx,
} from "./common";
import { num } from "../../visuals/NumberVisuals";

type Of<K extends PhysicsVisual["kind"]> = Extract<PhysicsVisual, { kind: K }>;

/* ------------------------------------------------------------------ forces */

/**
 * Force arrows around an object centred at (cx, cy). The object is a box `hw`×`hh` (half sizes) turned by
 * `turn` degrees; arrows start just outside its edge. Adds everything to `B`.
 */
function forceArrows(forces: ForceArrow[], cx: number, cy: number, hw: number, hh: number, turn: number, unit: string, ctx: Ctx, B: Bounds, L = 105) {
  const max = Math.max(0, ...forces.map((f) => f.size)) || 1;
  return forces.map((f, i) => {
    if (!(f.size > 0)) return null;
    const ux = Math.cos(rad(f.dir));
    const uy = -Math.sin(rad(f.dir));
    const s = hw || hh ? boxEdge(f.dir, hw, hh, turn) + 3 : 0;
    const len = Math.max(30, (f.size / max) * L);
    const x1 = cx + ux * s;
    const y1 = cy + uy * s;
    const x2 = cx + ux * (s + len);
    const y2 = cy + uy * (s + len);
    const colour = f.colour ?? ARROW_COLOURS[i % ARROW_COLOURS.length];
    const { anchor, dy } = tipPlacement(ux, uy);
    const lx = x2 + ux * 10;
    const ly = y2 + uy * 10 + dy;
    B.add(x1, y1);
    B.add(x2, y2);
    const text = markText(f.label, unit, ctx);
    if (text) B.text(lx, ly, text, anchor);
    return (
      <g key={i}>
        <Arrow x1={x1} y1={y1} x2={x2} y2={y2} colour={colour} dashed={f.dashed} />
        <Label x={lx} y={ly} m={f.label} unit={unit} ctx={ctx} anchor={anchor} colour={colour} />
      </g>
    );
  });
}

/** The object in a force diagram: a crate with an optional label, an emoji, or a dot. */
function Thing({ object, label, unit, ctx, x, y, turn = 0, size = 72 }: { object: string; label?: Mark; unit: string; ctx: Ctx; x: number; y: number; turn?: number; size?: number }) {
  if (object === "dot") return <circle cx={x} cy={y} r="9" className="ph-dot-obj" />;
  const h = size / 2;
  if (object === "box")
    return (
      <g transform={`translate(${x} ${y}) rotate(${-turn})`}>
        <rect x={-h} y={-h} width={size} height={size} rx="8" className="ph-box" />
        {label === undefined || label === null ? (
          <path d={`M${-h + 8} ${-h + 8}L${h - 8} ${h - 8}M${h - 8} ${-h + 8}L${-h + 8} ${h - 8}`} className="ph-box-x" />
        ) : (
          <Label x={0} y={8} m={label} unit={unit} ctx={ctx} size={size < 64 ? "sm" : "md"} halo={false} />
        )}
      </g>
    );
  return (
    <g transform={`translate(${x} ${y}) rotate(${-turn})`}>
      <Emoji x={0} y={0} e={object} size={size * 0.85} />
    </g>
  );
}

export function Forces({ v, ctx }: { v: Of<"phys-forces">; ctx: Ctx }) {
  const B = new Bounds();
  const object = v.object ?? "box";
  const half = object === "dot" ? 0 : 36;
  const turn = v.incline ?? 0;
  const extras: ReactNode[] = [];
  B.add(-half, -half);
  B.add(half, half);
  if (v.incline !== undefined) {
    const t = rad(turn);
    const P = { x: half * Math.sin(t), y: half * Math.cos(t) };
    const d = { x: Math.cos(t), y: -Math.sin(t) };
    const A = { x: P.x - d.x * 150, y: P.y - d.y * 150 };
    const top = { x: P.x + d.x * 110, y: P.y + d.y * 110 };
    const C = { x: top.x, y: A.y };
    [A, top, C].forEach((p) => B.add(p.x, p.y));
    const r = Math.min(Math.max(50, 30 / Math.tan(t)), 150);
    const lab = v.inclineLabel === undefined ? turn : v.inclineLabel;
    const text = markText(lab, "°", ctx);
    if (text) B.text(A.x + r + 8, A.y - r * Math.tan(t / 2) + 7, text, "start");
    extras.push(
      <g key="ramp">
        <polygon points={`${A.x},${A.y} ${top.x},${top.y} ${C.x},${C.y}`} className="ph-ramp" />
        <path d={`M${A.x + r} ${A.y} A${r} ${r} 0 0 0 ${A.x + r * Math.cos(t)} ${A.y - r * Math.sin(t)}`} className="ph-angle-arc" />
        <Label x={A.x + r + 8} y={A.y - r * Math.tan(t / 2) + 7} m={lab} unit="°" ctx={ctx} anchor="start" size="sm" />
      </g>,
    );
  } else if (v.surface === "floor") {
    B.add(-150, half + 16);
    B.add(150, half);
    extras.push(<Ground key="g" x1={-150} x2={150} y={half} />);
  }
  const arrows = forceArrows(v.forces, 0, 0, half, half, turn, v.unit ?? "N", ctx, B);
  if (v.incline === undefined && v.surface === "ceiling") {
    const top = Math.min(-half - 80, B.y0 - 14);
    B.add(-110, top - 16);
    extras.push(
      <g key="c">
        <Ground x1={-110} x2={110} y={top} flip />
        <line x1={0} y1={top} x2={0} y2={-half} className="ph-string" />
      </g>,
    );
  }
  let motion: ReactNode = null;
  if (v.motion) {
    const ux = Math.cos(rad(v.motion.dir));
    const uy = -Math.sin(rad(v.motion.dir));
    const y = B.y0 - 34;
    const len = 34;
    const text = markText(v.motion.label, undefined, ctx);
    B.add(-len, y - len * Math.abs(uy));
    B.add(len, y + len * Math.abs(uy));
    if (text) B.text(Math.abs(uy) > 0.9 ? 16 : len + 12, y + 7, text, "start");
    motion = (
      <g className="ph-motion">
        <Arrow x1={-ux * len} y1={y - uy * len} x2={ux * len} y2={y + uy * len} colour="night" width={4} head={13} />
        <Label x={Math.abs(uy) > 0.9 ? 16 : len + 12} y={y + 7} m={v.motion.label} ctx={ctx} anchor="start" size="sm" />
      </g>
    );
  }
  return (
    <PhysSvg box={B.box(14, 260)} label="Force diagram">
      {extras}
      <Thing object={object} label={v.objectLabel} unit={v.massUnit ?? "kg"} ctx={ctx} x={0} y={0} turn={turn} />
      {arrows}
      {motion}
    </PhysSvg>
  );
}

/* ----------------------------------------------------------------- incline */

export function Incline({ v, ctx }: { v: Of<"phys-incline">; ctx: Ctx }) {
  const B = new Bounds();
  const t = rad(v.angle);
  const L = 330;
  const base = L * Math.cos(t);
  const h = L * Math.sin(t);
  const A = { x: 0, y: 0 };
  const T = { x: base, y: -h };
  const C = { x: base, y: 0 };
  [A, T, C].forEach((p) => B.add(p.x, p.y));
  const size = 58;
  const along = 0.58;
  const n = { x: -Math.sin(t), y: -Math.cos(t) };
  const P = { x: A.x + along * base, y: A.y - along * h };
  const c = { x: P.x + n.x * (size / 2), y: P.y + n.y * (size / 2) };
  B.add(c.x - 40, c.y - 40);
  const unit = v.unit ?? "m";
  const out: ReactNode[] = [];
  // angle
  const r = Math.min(Math.max(52, 28 / Math.tan(t)), base * 0.45);
  const lab = v.angleLabel === undefined ? v.angle : v.angleLabel;
  const ax = A.x + r + 8;
  const ay = A.y - r * Math.tan(t / 2) + 7;
  if (markText(lab, "°", ctx)) B.text(ax, ay, markText(lab, "°", ctx), "start");
  // length along the slope, at a quarter of the way up, outside
  const q = { x: base * 0.24 + n.x * 18, y: -h * 0.24 + n.y * 18 };
  const lt = markText(v.length, unit, ctx);
  if (lt) B.text(q.x, q.y, lt, "end");
  const ht = markText(v.height, unit, ctx);
  if (ht) B.text(base + 12, -h / 2 + 7, ht, "start");
  const bt = markText(v.base, unit, ctx);
  if (bt) B.add(base / 2, 30);
  if (v.friction) B.text(base / 2, bt ? 58 : 34, v.friction, "middle", 16);
  const arrows = v.forces ? forceArrows(v.forces, c.x, c.y, size / 2, size / 2, v.angle, v.forceUnit ?? "N", ctx, B, 95) : null;
  if (v.motion) {
    const dir = v.motion === "up" ? 1 : -1;
    const d = { x: Math.cos(t) * dir, y: -Math.sin(t) * dir };
    const m0 = { x: P.x - n.x * 26 - d.x * 42, y: P.y - n.y * 26 - d.y * 42 };
    const m1 = { x: P.x - n.x * 26 + d.x * 42, y: P.y - n.y * 26 + d.y * 42 };
    const { anchor, dy } = tipPlacement(d.x, d.y);
    const lx = m1.x + d.x * 10;
    const ly = m1.y + d.y * 10 + dy;
    const mt = markText(v.motionLabel, undefined, ctx);
    if (mt) B.text(lx, ly, mt, anchor, 16);
    out.push(
      <g key="motion" className="ph-motion">
        <Arrow x1={m0.x} y1={m0.y} x2={m1.x} y2={m1.y} colour="night" width={4} head={13} />
        <Label x={lx} y={ly} m={v.motionLabel} ctx={ctx} anchor={anchor} size="sm" />
      </g>,
    );
  }
  return (
    <PhysSvg box={B.box(14, 300)} label={`Ramp at ${v.angle} degrees`}>
      <polygon points={`${A.x},${A.y} ${T.x},${T.y} ${C.x},${C.y}`} className="ph-ramp" />
      <polyline points={`${C.x - 14},${C.y} ${C.x - 14},${C.y - 14} ${C.x},${C.y - 14}`} className="ph-right-mark" />
      <path d={`M${A.x + r} ${A.y} A${r} ${r} 0 0 0 ${A.x + r * Math.cos(t)} ${A.y - r * Math.sin(t)}`} className="ph-angle-arc" />
      <Label x={ax} y={ay} m={lab} unit="°" ctx={ctx} anchor="start" size="sm" />
      <Label x={q.x} y={q.y} m={v.length} unit={unit} ctx={ctx} anchor="end" size="sm" />
      <Label x={base + 12} y={-h / 2 + 7} m={v.height} unit={unit} ctx={ctx} anchor="start" size="sm" />
      <Label x={base / 2} y={28} m={v.base} unit={unit} ctx={ctx} size="sm" />
      {v.friction && (
        <Note x={base / 2} y={bt ? 56 : 32}>
          {v.friction}
        </Note>
      )}
      {out}
      <Thing object={v.object ?? "box"} label={v.blockLabel} unit="kg" ctx={ctx} x={c.x} y={c.y} turn={v.angle} size={size} />
      {arrows}
    </PhysSvg>
  );
}

/* ------------------------------------------------------------------ motion */

export function Motion({ v, ctx }: { v: Of<"phys-motion">; ctx: Ctx }) {
  const { min, max, step, unit } = v.track;
  const labelStep = v.track.labelStep ?? step;
  const named = v.rows.some((r) => r.name);
  const x0 = named ? 56 : 24;
  const W = 350;
  const X = (p: number) => x0 + ((p - min) / (max - min)) * W;
  const ghosts = v.look === "ghosts";
  const anyArrows = v.rows.some((r) => r.arrows);
  const rowH = (ghosts ? 60 : 40) + (anyArrows ? 34 : 0) + (v.times ? 20 : 0);
  const top = v.finish !== undefined ? 34 : 6;
  const maxArrow = Math.max(1e-9, ...v.rows.flatMap((r) => (r.arrows ?? []).map(Math.abs)));
  const axisY = top + v.rows.length * rowH + 10;
  const ticks = Math.round((max - min) / step);
  const B = new Bounds();
  B.add(0, 0);
  B.add(x0 + W + 16, axisY + 34);
  const rows = v.rows.map((r, k) => {
    const y = top + (k + 1) * rowH - (v.times ? 26 : 12) - (ghosts ? 14 : 0);
    const colour: Colour = r.colour ?? (["wave", "berry", "leaf"] as Colour[])[k % 3];
    return (
      <g key={k}>
        {r.name && (
          <text x={x0 - 14} y={y + 7} className="ph-label ph-sm" textAnchor="end">
            {r.name}
          </text>
        )}
        <line x1={x0} y1={y + (ghosts ? 22 : 0)} x2={x0 + W} y2={y + (ghosts ? 22 : 0)} className="ph-lane" />
        {r.positions.map((p, i) => {
          const x = X(p);
          const last = i === r.positions.length - 1;
          const fade = r.positions.length > 1 ? 0.28 + (0.5 * i) / (r.positions.length - 1) : 1;
          const a = r.arrows?.[i] ?? 0;
          const len = (Math.abs(a) / maxArrow) * 46;
          return (
            <g key={i}>
              {ghosts ? (
                <Emoji x={x} y={y} e={r.emoji ?? "🚗"} size={36} style={{ opacity: last ? 1 : fade }} cls={r.flip ? "ph-flip" : ""} />
              ) : (
                <circle cx={x} cy={y} r="8" style={{ fill: col(colour, false), stroke: col(colour) }} className="ph-strobe" />
              )}
              {a !== 0 && <Arrow x1={x} y1={y - (ghosts ? 30 : 22)} x2={x + Math.sign(a) * Math.max(14, len)} y2={y - (ghosts ? 30 : 22)} colour={colour} width={3.5} head={11} />}
              {v.times && (
                <text x={x} y={y + (ghosts ? 46 : 26)} className="ph-tiny" textAnchor="middle">
                  {i}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  });
  const span = v.span;
  if (span) B.add(X(span.to), axisY + 80);
  return (
    <PhysSvg box={B.box(8, 0)} label="Motion along a track">
      {v.finish !== undefined && (
        <g>
          <line x1={X(v.finish)} y1={top} x2={X(v.finish)} y2={axisY} className="ph-finish" />
          <Emoji x={X(v.finish) + 12} y={top - 14} e="🏁" size={26} />
        </g>
      )}
      {rows}
      <line x1={x0} y1={axisY} x2={x0 + W} y2={axisY} className="ph-axis" />
      {range(ticks + 1).map((i) => {
        const val = min + i * step;
        const x = X(val);
        const labelled = Math.abs(val / labelStep - Math.round(val / labelStep)) < 1e-6;
        return (
          <g key={i}>
            <line x1={x} y1={axisY} x2={x} y2={axisY + (labelled ? 10 : 6)} className="ph-axis" />
            {labelled && (
              <text x={x} y={axisY + 28} className="ph-tick" textAnchor="middle">
                {num(val)}
              </text>
            )}
          </g>
        );
      })}
      {unit && (
        <text x={x0 + W + 4} y={axisY + 6} className="ph-tick" textAnchor="start">
          {unit}
        </text>
      )}
      {span && <Dimension x1={X(span.from)} y1={axisY + 50} x2={X(span.to)} y2={axisY + 50} m={span.label} unit={unit} ctx={ctx} side={-1} gap={14} />}
    </PhysSvg>
  );
}

/* --------------------------------------------------------------- collision */

function CartShape({ x, y, w, colours, label }: { x: number; y: number; w: number; colours: Colour[]; label: ReactNode }) {
  return (
    <g>
      {colours.map((c, i) => (
        <rect
          key={i}
          x={x - w / 2 + (i * w) / colours.length}
          y={y - 52}
          width={w / colours.length}
          height="40"
          rx="8"
          style={{ fill: col(c, false), stroke: col(c) }}
          className="ph-cart"
        />
      ))}
      <circle cx={x - w / 2 + 16} cy={y - 9} r="8" className="ph-wheel" />
      <circle cx={x + w / 2 - 16} cy={y - 9} r="8" className="ph-wheel" />
      {label}
    </g>
  );
}

export function Collision({ v, ctx }: { v: Of<"phys-collision">; ctx: Ctx }) {
  const mu = v.massUnit ?? "kg";
  const vu = v.vUnit ?? "m/s";
  const all = [...v.before, ...(v.after ?? [])];
  const maxV = Math.max(1e-9, ...all.map((c) => Math.abs(c.vSize)));
  const defaults: Colour[] = ["wave", "berry"];
  const rowH = 150;
  const row = (carts: typeof v.before | [Cart1], y: number, title: string, xs: number[]) => (
    <g>
      <Note x={4} y={y - 112} anchor="start" cls="ph-caption">
        {title}
      </Note>
      <line x1={0} y1={y} x2={420} y2={y} className="ph-track" />
      {carts.map((c, i) => {
        const stuck = carts.length === 1 && v.after?.length === 1;
        const w = stuck ? 140 : 84;
        const x = xs[i];
        const colours = stuck ? [v.before[0].colour ?? defaults[0], v.before[1].colour ?? defaults[1]] : [c.colour ?? defaults[i]];
        const len = 26 + (Math.abs(c.vSize) / maxV) * 50;
        const dir = Math.sign(c.vSize);
        return (
          <g key={i}>
            <CartShape
              x={x}
              y={y}
              w={w}
              colours={colours}
              label={<Label x={x} y={y - 25} m={c.name ?? c.mass} unit={mu} ctx={ctx} size="sm" halo={false} cls="ph-on-dark" />}
            />
            {c.name && <Label x={x} y={y + 22} m={c.mass} unit={mu} ctx={ctx} size="sm" />}
            {dir !== 0 ? (
              <Arrow x1={x - (dir * len) / 2} y1={y - 72} x2={x + (dir * len) / 2} y2={y - 72} colour={colours[0]} width={4.5} />
            ) : null}
            <Label x={x} y={y - 86} m={c.v ?? (dir === 0 ? "at rest" : null)} unit={vu} ctx={ctx} size="sm" />
          </g>
        );
      })}
    </g>
  );
  const after = v.after;
  return (
    <PhysSvg box={[-4, -10, 428, after ? 2 * rowH + 34 : rowH + 34]} label="Two carts colliding">
      {row(v.before, 130, "Before", [110, 300])}
      {after && row(after, 130 + rowH, after.length === 1 ? "After (stuck together)" : "After", after.length === 1 ? [210] : [90, 330])}
    </PhysSvg>
  );
}
type Cart1 = Of<"phys-collision">["before"][0];

/* -------------------------------------------------------------- oscillator */

/** A zig-zag spring from (0, 0) to (len, 0) in its own coordinates. */
function coilPath(len: number, coils = 9, amp = 13) {
  const lead = 12;
  const pts = [`M0 0`, `L${lead} 0`];
  const n = coils * 2;
  for (let i = 1; i <= n; i++) pts.push(`L${lead + ((len - 2 * lead) * (i - 0.5)) / n} ${i % 2 ? -amp : amp}`);
  pts.push(`L${len - lead} 0`, `L${len} 0`);
  return pts.join(" ");
}

export function Oscillator({ v, ctx }: { v: Of<"phys-oscillator">; ctx: Ctx }) {
  if (v.type === "pendulum") return <Pendulum v={v} ctx={ctx} />;
  const unit = v.unit ?? "m";
  const A = 78;
  const d = v.animate ? 0 : v.displacement;
  const vertical = v.orientation === "vertical";
  const anim = v.animate ? " ph-anim" : "";
  if (!vertical) {
    const floor = 190;
    const eq = 236;
    const mw = 64;
    const xc = eq + d * A;
    const cy = floor - 28;
    const springLen = xc - mw / 2 - 26;
    const rest = eq - mw / 2 - 26;
    const style = { "--amp": A, "--s0": (rest - A) / rest, "--s1": (rest + A) / rest } as CSSProperties;
    const fLen = 22 + Math.abs(d) * 60;
    return (
      <PhysSvg box={[0, 10, 420, 210]} label="Mass on a spring" cls={anim}>
        <Ground x1={26} x2={410} y={floor} />
        <g className="ph-ground">
          <line x1={26} y1={70} x2={26} y2={floor} className="ph-ground-line" />
          {range(7).map((i) => (
            <line key={i} x1={23} y1={80 + i * 16} x2={13} y2={90 + i * 16} className="ph-hatch" />
          ))}
        </g>
        <line x1={eq} y1={58} x2={eq} y2={floor + 6} className="ph-eq" />
        <text x={eq} y={floor + 22} className="ph-tiny" textAnchor="middle">
          x = 0
        </text>
        {v.amplitudeLabel !== undefined && v.amplitudeLabel !== null && (
          <g>
            <line x1={eq + A} y1={58} x2={eq + A} y2={floor} className="ph-eq faint" />
            <line x1={eq - A} y1={58} x2={eq - A} y2={floor} className="ph-eq faint" />
            <Dimension x1={eq} y1={52} x2={eq + A} y2={52} m={v.amplitudeLabel} unit={unit} ctx={ctx} />
          </g>
        )}
        <g transform={`translate(26 ${cy})`}>
          {v.animate ? (
            <path d={coilPath(rest)} className="ph-spring ph-osc-coil" style={style} />
          ) : (
            <path d={coilPath(springLen)} className="ph-spring" />
          )}
        </g>
        <Label x={26 + (v.animate ? rest : springLen) / 2} y={cy - 24} m={v.kLabel} unit="N/m" ctx={ctx} size="sm" />
        <g className={v.animate ? "ph-osc-mass" : ""} style={style}>
          <rect x={xc - mw / 2} y={cy - 26} width={mw} height="54" rx="8" className="ph-mass" />
          <Label x={xc} y={cy + 8} m={v.massLabel} unit="kg" ctx={ctx} size="sm" halo={false} cls="ph-on-dark" />
        </g>
        {!v.animate && v.force !== undefined && v.force !== null && d !== 0 && (
          <g>
            <Arrow x1={xc} y1={92} x2={xc - Math.sign(d) * fLen} y2={92} colour="berry" width={4.5} />
            <Label x={xc - Math.sign(d) * (fLen + 10)} y={99} m={v.force} unit="N" ctx={ctx} anchor={d > 0 ? "end" : "start"} size="sm" colour="berry" />
          </g>
        )}
        {!v.animate && v.velocity ? (
          <g>
            <Arrow x1={xc} y1={118} x2={xc + Math.sign(v.velocity) * (22 + Math.min(1, Math.abs(v.velocity)) * 50)} y2={118} colour="wave" width={4.5} />
            <Label
              x={xc + Math.sign(v.velocity) * (32 + Math.min(1, Math.abs(v.velocity)) * 50)}
              y={125}
              m={v.velocityLabel ?? "v"}
              unit="m/s"
              ctx={ctx}
              anchor={v.velocity > 0 ? "start" : "end"}
              size="sm"
              colour="wave"
            />
          </g>
        ) : null}
      </PhysSvg>
    );
  }
  const ceil = 30;
  const eq = 196;
  const mh = 54;
  const yc = eq + d * A;
  const springLen = yc - mh / 2 - ceil;
  const rest = eq - mh / 2 - ceil;
  const style = { "--amp": A, "--s0": (rest - A) / rest, "--s1": (rest + A) / rest } as CSSProperties;
  const fLen = 22 + Math.abs(d) * 60;
  return (
    <PhysSvg box={[40, 10, 360, 330]} label="Mass hanging on a spring" cls={anim}>
      <Ground x1={120} x2={290} y={ceil} flip />
      <line x1={110} y1={eq} x2={300} y2={eq} className="ph-eq" />
      <text x={306} y={eq + 5} className="ph-tiny" textAnchor="start">
        x = 0
      </text>
      {v.amplitudeLabel !== undefined && v.amplitudeLabel !== null && (
        <g>
          <line x1={110} y1={eq + A} x2={300} y2={eq + A} className="ph-eq faint" />
          <line x1={110} y1={eq - A} x2={300} y2={eq - A} className="ph-eq faint" />
          <Dimension x1={118} y1={eq + A} x2={118} y2={eq} m={v.amplitudeLabel} unit={unit} ctx={ctx} />
        </g>
      )}
      <g transform={`translate(200 ${ceil}) rotate(90)`}>
        {v.animate ? <path d={coilPath(rest)} className="ph-spring ph-osc-coil" style={style} /> : <path d={coilPath(springLen)} className="ph-spring" />}
      </g>
      <Label x={178} y={ceil + (v.animate ? rest : springLen) / 2 + 6} m={v.kLabel} unit="N/m" ctx={ctx} size="sm" anchor="end" />
      <g className={v.animate ? "ph-osc-mass vert" : ""} style={style}>
        <rect x={168} y={yc - mh / 2} width={64} height={mh} rx="8" className="ph-mass" />
        <Label x={200} y={yc + 7} m={v.massLabel} unit="kg" ctx={ctx} size="sm" halo={false} cls="ph-on-dark" />
      </g>
      {!v.animate && v.force !== undefined && v.force !== null && d !== 0 && (
        <g>
          <Arrow x1={256} y1={yc} x2={256} y2={yc - Math.sign(d) * fLen} colour="berry" width={4.5} />
          <Label x={264} y={yc - Math.sign(d) * fLen * 0.5 + 6} m={v.force} unit="N" ctx={ctx} anchor="start" size="sm" colour="berry" />
        </g>
      )}
      {!v.animate && v.velocity ? (
        <g>
          <Arrow x1={152} y1={yc} x2={152} y2={yc + Math.sign(v.velocity) * (22 + Math.min(1, Math.abs(v.velocity)) * 50)} colour="wave" width={4.5} />
          <Label x={144} y={yc + Math.sign(v.velocity) * 30 + 6} m={v.velocityLabel ?? "v"} unit="m/s" ctx={ctx} anchor="end" size="sm" colour="wave" />
        </g>
      ) : null}
    </PhysSvg>
  );
}

function Pendulum({ v, ctx }: { v: Extract<Of<"phys-oscillator">, { type: "pendulum" }>; ctx: Ctx }) {
  const px = 210;
  const py = 34;
  const L = 200;
  const th = rad(v.angle);
  const bob = { x: px + L * Math.sin(th), y: py + L * Math.cos(th) };
  const ghost = { x: px - L * Math.sin(th), y: py + L * Math.cos(th) };
  const r = 54;
  const lab = v.angleLabel === undefined ? Math.abs(v.angle) : v.angleLabel;
  const mid = th / 2;
  const side = v.angle >= 0 ? 1 : -1;
  const lenLab = { x: px + (L / 2) * Math.sin(th) + side * 16 * Math.cos(th), y: py + (L / 2) * Math.cos(th) - side * 16 * Math.sin(th) + 7 };
  const swingArc = `M${ghost.x} ${ghost.y} A${L} ${L} 0 0 0 ${bob.x} ${bob.y}`;
  const pend = (x: number, y: number, cls = "") => (
    <g className={cls}>
      <line x1={px} y1={py} x2={x} y2={y} className="ph-string" />
      <circle cx={x} cy={y} r="20" className="ph-bob" />
    </g>
  );
  return (
    <PhysSvg box={[0, 10, 420, 290]} label={`Pendulum pulled ${Math.abs(v.angle)} degrees`} cls={v.animate ? "ph-anim" : ""}>
      <Ground x1={130} x2={290} y={py} flip />
      <line x1={px} y1={py} x2={px} y2={py + L + 28} className="ph-eq" />
      {(v.swing || v.animate) && v.angle !== 0 && (
        <g>
          <path d={v.angle > 0 ? swingArc : `M${bob.x} ${bob.y} A${L} ${L} 0 0 0 ${ghost.x} ${ghost.y}`} className="ph-swing-arc" />
          {pend(ghost.x, ghost.y, "ph-ghost")}
        </g>
      )}
      {v.angle !== 0 && (
        <g>
          <path
            d={`M${px} ${py + r} A${r} ${r} 0 0 ${v.angle > 0 ? 0 : 1} ${px + r * Math.sin(th)} ${py + r * Math.cos(th)}`}
            className="ph-angle-arc"
          />
          <Label x={px + (r + 22) * Math.sin(mid)} y={py + (r + 22) * Math.cos(mid) + 7} m={lab} unit="°" ctx={ctx} size="sm" />
        </g>
      )}
      {v.animate ? (
        <g className="ph-swing" style={{ "--amp": Math.abs(v.angle) || 20 } as CSSProperties}>
          {pend(px, py + L)}
        </g>
      ) : (
        pend(bob.x, bob.y)
      )}
      {!v.animate && <Label x={bob.x} y={bob.y + 46} m={v.massLabel} unit="kg" ctx={ctx} size="sm" />}
      <Label x={lenLab.x} y={lenLab.y} m={v.lengthLabel} unit={v.unit ?? "m"} ctx={ctx} anchor={side > 0 ? "start" : "end"} size="sm" />
      <circle cx={px} cy={py} r="5" className="ph-pivot" />
    </PhysSvg>
  );
}

/* ------------------------------------------------------------------- orbit */

export function Orbit({ v, ctx }: { v: Of<"phys-orbit">; ctx: Ctx }) {
  const unit = v.unit;
  if (v.scene === "pair") {
    const [m1, m2] = v.masses;
    const r1 = 26 * (m1.size ?? 1);
    const r2 = 26 * (m2.size ?? 1);
    const y = 90;
    const x1 = 110;
    const x2 = 320;
    const big = Math.max(r1, r2);
    const len = 54;
    const ball = (m: typeof m1, x: number, r: number, c: Colour) =>
      m.emoji ? <Emoji x={x} y={y} e={m.emoji} size={r * 2} /> : <circle cx={x} cy={y} r={r} style={{ fill: col(c, false), stroke: col(c) }} className="ph-ball" />;
    const [f1, f2] = v.forceLabels ?? [null, null];
    return (
      <PhysSvg box={[0, 20, 430, big + 140]} label="Two masses pulling on each other">
        {ball(m1, x1, r1, m1.colour ?? "grape")}
        {ball(m2, x2, r2, m2.colour ?? "teal")}
        <Arrow x1={x1 + r1 + 4} y1={y} x2={x1 + r1 + 4 + len} y2={y} colour="berry" />
        <Arrow x1={x2 - r2 - 4} y1={y} x2={x2 - r2 - 4 - len} y2={y} colour="berry" />
        <Label x={x1 + r1 + 4 + len / 2} y={y - 14} m={f1} unit="N" ctx={ctx} size="sm" colour="berry" />
        <Label x={x2 - r2 - 4 - len / 2} y={y - 14} m={f2} unit="N" ctx={ctx} size="sm" colour="berry" />
        <Label x={x1} y={y + big + 24} m={m1.label} unit="kg" ctx={ctx} size="sm" />
        <Label x={x2} y={y + big + 24} m={m2.label} unit="kg" ctx={ctx} size="sm" />
        {v.distance !== undefined && v.distance !== null && (
          <g>
            <line x1={x1} y1={y} x2={x1} y2={y + big + 50} className="ph-eq faint" />
            <line x1={x2} y1={y} x2={x2} y2={y + big + 50} className="ph-eq faint" />
            <Dimension x1={x1} y1={y + big + 44} x2={x2} y2={y + big + 44} m={v.distance} unit={unit ?? "m"} ctx={ctx} side={-1} />
          </g>
        )}
      </PhysSvg>
    );
  }
  const e = v.ecc ?? 0;
  const a = 125 / (1 + e * 0.5);
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e;
  const P = { x: 0, y: 0 };
  const nu = rad(v.at ?? 40);
  const rr = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  const S = { x: rr * Math.cos(nu), y: -rr * Math.sin(nu) };
  const dr = (a * (1 - e * e) * e * Math.sin(nu)) / (1 + e * Math.cos(nu)) ** 2;
  let tx = dr * Math.cos(nu) - rr * Math.sin(nu);
  let ty = -(dr * Math.sin(nu) + rr * Math.cos(nu));
  const tl = Math.hypot(tx, ty) || 1;
  tx /= tl;
  ty /= tl;
  const speed = 72 * Math.sqrt(2 / rr - 1 / a) * Math.sqrt(a);
  const pull = clamp(56 * (a / rr) ** 2, 30, 100);
  const gx = (P.x - S.x) / rr;
  const gy = (P.y - S.y) / rr;
  const B = new Bounds();
  B.add(-c - a, -b);
  B.add(-c + a, b);
  const sR = 20;
  const showV = v.speedLabel !== undefined && v.speedLabel !== null;
  const showG = v.gravityLabel !== undefined && v.gravityLabel !== null;
  const vEnd = { x: S.x + tx * (sR + speed), y: S.y + ty * (sR + speed) };
  const vPl = tipPlacement(tx, ty);
  if (showV) {
    B.add(vEnd.x, vEnd.y);
    B.text(vEnd.x + tx * 10, vEnd.y + ty * 10 + vPl.dy, markText(v.speedLabel, "m/s", ctx), vPl.anchor);
  }
  const gStart = { x: S.x + gx * sR, y: S.y + gy * sR };
  const gEnd = { x: gStart.x + gx * pull, y: gStart.y + gy * pull };
  const gn = { x: -gy, y: gx };
  const gLab = { x: (gStart.x + gEnd.x) / 2 + gn.x * 18 * (gn.y < 0 ? 1 : -1), y: (gStart.y + gEnd.y) / 2 + gn.y * 18 * (gn.y < 0 ? 1 : -1) + 6 };
  if (showG) B.text(gLab.x, gLab.y, markText(v.gravityLabel, "N", ctx), "middle");
  const rLab = { x: S.x / 2 - (gn.y < 0 ? 1 : -1) * gn.x * 18, y: S.y / 2 - (gn.y < 0 ? 1 : -1) * gn.y * 18 + 6 };
  return (
    <PhysSvg box={B.box(16, 320)} label="Satellite orbiting a planet">
      <ellipse cx={-c} cy={0} rx={a} ry={b} className="ph-orbit" />
      {v.radiusLabel !== undefined && v.radiusLabel !== null && (
        <g>
          <line x1={0} y1={0} x2={S.x} y2={S.y} className="ph-radius" />
          <Label x={rLab.x} y={rLab.y} m={v.radiusLabel} unit={unit ?? "km"} ctx={ctx} size="sm" />
        </g>
      )}
      <Emoji x={0} y={0} e={v.planet ?? "🌍"} size={76} />
      <Emoji x={S.x} y={S.y} e={v.satellite ?? "🛰️"} size={36} />
      {showV && (
        <g>
          <Arrow x1={S.x + tx * sR} y1={S.y + ty * sR} x2={vEnd.x} y2={vEnd.y} colour="wave" />
          <Label x={vEnd.x + tx * 10} y={vEnd.y + ty * 10 + vPl.dy} m={v.speedLabel} unit="m/s" ctx={ctx} anchor={vPl.anchor} size="sm" colour="wave" />
        </g>
      )}
      {showG && (
        <g>
          <Arrow x1={gStart.x} y1={gStart.y} x2={gEnd.x} y2={gEnd.y} colour="berry" />
          <Label x={gLab.x} y={gLab.y} m={v.gravityLabel} unit="N" ctx={ctx} size="sm" colour="berry" />
        </g>
      )}
    </PhysSvg>
  );
}

/* ------------------------------------------------------------------- fluid */

export function Fluid({ v, ctx }: { v: Of<"phys-fluid">; ctx: Ctx }) {
  if (v.scene === "float") {
    const left = 20;
    const right = 400;
    const surface = 110;
    const bottom = 270;
    const n = v.objects.length;
    const palette: Colour[] = ["cocoa", "sun", "leaf"];
    const blocks = v.objects.map((o, i) => {
      const s = 64 * (o.size ?? 1);
      const w = s * 1.15;
      const x = left + ((i + 0.5) * (right - left)) / n;
      let topY: number;
      if (o.sunk) topY = bottom - s;
      else if (o.submerged >= 1) topY = surface + (bottom - surface - s) / 2;
      else topY = surface - (1 - o.submerged) * s;
      return { o, s, w, x, topY, c: o.colour ?? palette[i % 3] };
    });
    return (
      <PhysSvg box={[8, 30, 404, v.liquid ? 276 : 256]} label="Objects floating and sinking">
        <rect x={left} y={surface} width={right - left} height={bottom - surface} className="ph-liquid-back" />
        {blocks.map(({ o, w, s, x, topY, c }, i) => (
          <g key={i}>
            <rect x={x - w / 2} y={topY} width={w} height={s} rx="8" style={{ fill: col(c, false), stroke: col(c) }} className="ph-block" />
            {o.emoji && <Emoji x={x} y={topY + s / 2 - (o.label ? 8 : 0)} e={o.emoji} size={s * 0.5} />}
          </g>
        ))}
        <rect x={left} y={surface} width={right - left} height={bottom - surface} className="ph-liquid" />
        <line x1={left} y1={surface} x2={right} y2={surface} className="ph-surface" />
        {blocks.map(({ o, s, x, topY }, i) =>
          o.label ? (
            <text key={i} x={x} y={topY + s / 2 + (o.emoji ? 22 : 7)} className="ph-label ph-sm halo" textAnchor="middle">
              {o.label}
            </text>
          ) : null,
        )}
        <path d={`M${left} 50 L${left} ${bottom} L${right} ${bottom} L${right} 50`} className="ph-tank" />
        {v.liquid && (
          <Note x={(left + right) / 2} y={bottom + 24} cls="ph-liquid-name">
            {v.liquid}
          </Note>
        )}
      </PhysSvg>
    );
  }
  if (v.scene === "pressure") {
    const left = 70;
    const right = 250;
    const surface = 70;
    const bottom = 300;
    const unit = v.unit ?? "m";
    const B = new Bounds();
    B.add(left - 10, 30);
    B.add(right + 10, bottom + 10);
    const pts = v.points.map((p, i) => {
      const y = surface + p.depth * (bottom - surface - 6);
      const dx = left - 20 - i * 26;
      if (p.depthLabel !== undefined && p.depthLabel !== null) B.text(dx - 10, (surface + y) / 2 + 7, markText(p.depthLabel, unit, ctx), "end", 16);
      const lt = markText(p.label, "kPa", ctx);
      if (lt) B.text(172, y + 7, lt, "start", 16);
      const R = 50 + 170 * Math.sqrt(p.depth);
      if (v.holes) {
        B.add(right + R, bottom + 20);
      }
      return { p, y, dx, R };
    });
    return (
      <PhysSvg box={B.box(12, 300)} label="Pressure at different depths">
        <rect x={left} y={surface} width={right - left} height={bottom - surface} className="ph-liquid solid" />
        <line x1={left} y1={surface} x2={right} y2={surface} className="ph-surface" />
        {v.holes && <line x1={right} y1={bottom + 20} x2={right + 240} y2={bottom + 20} className="ph-ground-line" />}
        {pts.map(({ p, y, dx, R }, i) => (
          <g key={i}>
            {v.holes && <path d={`M${right} ${y} Q${right + R / 2} ${y} ${right + R} ${bottom + 20}`} className="ph-jet" />}
            <circle cx={160} cy={y} r="6" className="ph-point" />
            <Label x={172} y={y + 7} m={p.label} unit="kPa" ctx={ctx} anchor="start" size="sm" />
            {p.depthLabel !== undefined && p.depthLabel !== null && (
              <g>
                <line x1={dx} y1={y} x2={160} y2={y} className="ph-eq faint" />
                <Arrow x1={dx} y1={surface} x2={dx} y2={y} colour="night" width={2.5} head={10} double />
                <Label x={dx - 8} y={(surface + y) / 2 + 7} m={p.depthLabel} unit={unit} ctx={ctx} anchor="end" size="sm" />
              </g>
            )}
          </g>
        ))}
        <path d={`M${left} 34 L${left} ${bottom} L${right} ${bottom} L${right} 34`} className="ph-tank" />
        {v.liquid && (
          <Note x={(left + right) / 2} y={bottom - 12}>
            {v.liquid}
          </Note>
        )}
      </PhysSvg>
    );
  }
  const maxW = Math.max(...v.widths);
  const w1 = (110 * v.widths[0]) / maxW;
  const w2 = (110 * v.widths[1]) / maxW;
  const cy = 130;
  const x0 = 20;
  const xa = 170;
  const xb = 240;
  const x1 = 410;
  const top = `M${x0} ${cy - w1 / 2} L${xa} ${cy - w1 / 2} C${(xa + xb) / 2} ${cy - w1 / 2} ${(xa + xb) / 2} ${cy - w2 / 2} ${xb} ${cy - w2 / 2} L${x1} ${cy - w2 / 2}`;
  const bot = `M${x0} ${cy + w1 / 2} L${xa} ${cy + w1 / 2} C${(xa + xb) / 2} ${cy + w1 / 2} ${(xa + xb) / 2} ${cy + w2 / 2} ${xb} ${cy + w2 / 2} L${x1} ${cy + w2 / 2}`;
  const fill = `${top} L${x1} ${cy + w2 / 2} L${xb} ${cy + w2 / 2} C${(xa + xb) / 2} ${cy + w2 / 2} ${(xa + xb) / 2} ${cy + w1 / 2} ${xa} ${cy + w1 / 2} L${x0} ${cy + w1 / 2} Z`;
  const rel = (w: number) => (maxW / w) ** 2;
  const minRel = Math.min(rel(v.widths[0]), rel(v.widths[1]));
  const len = (w: number) => clamp((40 * rel(w)) / minRel, 30, 140);
  const l1 = len(v.widths[0]);
  const l2 = len(v.widths[1]);
  const cx1 = (x0 + xa) / 2;
  const cx2 = (xb + x1) / 2;
  const [v1, v2] = v.v ?? [null, null];
  const [a1, a2] = v.area ?? [null, null];
  const [p1, p2] = v.pressure ?? [null, null];
  const lines = (x: number, w: number, a: Mark, p: Mark) => (
    <g>
      <Label x={x} y={cy + w / 2 + 28} m={a === null || a === undefined ? null : a} unit="m²" ctx={ctx} size="sm" />
      <Label x={x} y={cy + w / 2 + (a === null || a === undefined ? 28 : 52)} m={p} unit="kPa" ctx={ctx} size="sm" />
    </g>
  );
  return (
    <PhysSvg box={[10, 30, 410, 230]} label="Water flowing through a narrowing pipe">
      <path d={fill} className="ph-liquid solid" />
      <path d={top} className="ph-pipe" />
      <path d={bot} className="ph-pipe" />
      <Arrow x1={cx1 - l1 / 2} y1={cy} x2={cx1 + l1 / 2} y2={cy} colour="wave" width={5} />
      <Arrow x1={cx2 - l2 / 2} y1={cy} x2={cx2 + l2 / 2} y2={cy} colour="wave" width={5} />
      <Label x={cx1} y={cy - w1 / 2 - 14} m={v1} unit="m/s" ctx={ctx} size="sm" />
      <Label x={cx2} y={cy - w2 / 2 - 14} m={v2} unit="m/s" ctx={ctx} size="sm" />
      {lines(cx1, w1, a1, p1)}
      {lines(cx2, w2, a2, p2)}
    </PhysSvg>
  );
}
