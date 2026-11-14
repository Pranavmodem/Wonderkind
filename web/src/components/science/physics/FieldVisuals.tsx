/* Magnets and charges, energy bars and chains, and heat (thermometers, heat flow, gas in a piston). */
import type { ReactNode } from "react";
import type { EnergyStep, PhysicsVisual } from "../../../game/science/physicsTypes";
import type { Colour } from "../../../game/types";
import { SERIES } from "../../visuals/NumberVisuals";
import { Arrow, Bounds, Dimension, Emoji, Label, Note, PhysSvg, clamp, col, markText, range, seeded, tipPlacement, type Ctx } from "./common";

type Of<K extends PhysicsVisual["kind"]> = Extract<PhysicsVisual, { kind: K }>;

/* ----------------------------------------------------------------- magnets */

/** A bar magnet centred at (x, y); `poles` "NS" puts N on the left. */
export function BarMagnet({ x, y, poles, w = 130, h = 44 }: { x: number; y: number; poles: "NS" | "SN"; w?: number; h?: number }) {
  const half = (p: string, left: boolean) => (
    <g>
      <rect x={left ? x - w / 2 : x} y={y - h / 2} width={w / 2} height={h} className={`ph-pole ${p === "N" ? "north" : "south"}`} rx={left ? 0 : 0} />
      <text x={left ? x - w / 4 : x + w / 4} y={y + 9} className="ph-pole-letter" textAnchor="middle">
        {p}
      </text>
    </g>
  );
  return (
    <g className="ph-magnet">
      {half(poles[0], true)}
      {half(poles[1], false)}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="8" className="ph-magnet-outline" />
    </g>
  );
}

type Pole = { x: number; y: number; q: number };

function field(poles: Pole[], x: number, y: number) {
  let bx = 0;
  let by = 0;
  for (const p of poles) {
    const dx = x - p.x;
    const dy = y - p.y;
    const r2 = dx * dx + dy * dy;
    const r3 = r2 * Math.sqrt(r2) || 1e-9;
    bx += (p.q * dx) / r3;
    by += (p.q * dy) / r3;
  }
  return { bx, by };
}

/** Field lines out of the positive poles (or into the negative ones if there are no positive poles). */
function fieldLines(poles: Pole[], box: [number, number, number, number], perUnit = 8, start = 14) {
  const lines: { pts: { x: number; y: number }[]; dir: 1 | -1 }[] = [];
  const [x0, y0, x1, y1] = box;
  // Lines start on + charges; − charges add the lines that don't come from a + charge.
  for (const s of [...poles.filter((p) => p.q > 0), ...poles.filter((p) => p.q < 0)]) {
    const sgn: 1 | -1 = s.q > 0 ? 1 : -1;
    const n = Math.round(perUnit * Math.abs(s.q));
    for (let k = 0; k < n; k++) {
      const a = ((k + 0.5) / n) * 2 * Math.PI;
      let x = s.x + start * Math.cos(a);
      let y = s.y + start * Math.sin(a);
      const pts = [{ x, y }];
      for (let step = 0; step < 900; step++) {
        const { bx, by } = field(poles, x, y);
        const m = Math.hypot(bx, by) || 1e-9;
        x += (sgn * 3 * bx) / m;
        y += (sgn * 3 * by) / m;
        pts.push({ x, y });
        if (x < x0 || x > x1 || y < y0 || y > y1) break;
        const hit = poles.find((p) => p !== s && Math.hypot(x - p.x, y - p.y) < 12);
        if (hit) {
          if (sgn < 0 && hit.q > 0) pts.length = 0;
          break;
        }
      }
      if (pts.length) lines.push({ pts, dir: sgn });
    }
  }
  return lines;
}

function FieldLine({ pts, dir, cls = "ph-field" }: { pts: { x: number; y: number }[]; dir: 1 | -1; cls?: string }) {
  if (pts.length < 4) return null;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const i = Math.floor(pts.length * 0.42);
  const a = pts[i];
  const b = pts[Math.min(pts.length - 1, i + 2)];
  const [p, q] = dir > 0 ? [a, b] : [b, a];
  const ang = Math.atan2(q.y - p.y, q.x - p.x);
  const s = 8;
  return (
    <g>
      <path d={d} className={cls} />
      <polygon
        points={`${p.x + s * Math.cos(ang)},${p.y + s * Math.sin(ang)} ${p.x + s * Math.cos(ang + 2.5)},${p.y + s * Math.sin(ang + 2.5)} ${p.x + s * Math.cos(ang - 2.5)},${p.y + s * Math.sin(ang - 2.5)}`}
        className="ph-field-head"
      />
    </g>
  );
}

function Compass({ x, y, ang }: { x: number; y: number; ang: number }) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return (
    <g>
      <circle cx={x} cy={y} r="15" className="ph-compass" />
      <polygon points={`${x + 12 * c},${y + 12 * s} ${x - 4 * s},${y + 4 * c} ${x + 4 * s},${y - 4 * c}`} className="ph-needle north" />
      <polygon points={`${x - 12 * c},${y - 12 * s} ${x - 4 * s},${y + 4 * c} ${x + 4 * s},${y - 4 * c}`} className="ph-needle south" />
    </g>
  );
}

export function Magnets({ v, ctx }: { v: Of<"phys-magnets">; ctx: Ctx }) {
  switch (v.scene) {
    case "bars": {
      const two = v.magnets.length === 2;
      const xs = two ? [110, 310] : [210];
      const y = 96;
      let arrows: ReactNode = null;
      if (two && v.arrows) {
        const attract = v.magnets[0][1] !== v.magnets[1][0];
        const d = attract ? 1 : -1;
        arrows = (
          <g>
            <Arrow x1={110 - d * 26} y1={40} x2={110 + d * 26} y2={40} colour="berry" />
            <Arrow x1={310 + d * 26} y1={40} x2={310 - d * 26} y2={40} colour="berry" />
            <Note x={210} y={46}>
              {attract ? "attract" : "repel"}
            </Note>
          </g>
        );
      }
      return (
        <PhysSvg box={[0, 14, 420, v.gap !== undefined && v.gap !== null ? 160 : 126]} label={two ? "Two bar magnets" : "A bar magnet"}>
          {arrows}
          {v.magnets.map((m, i) => (
            <BarMagnet key={i} x={xs[i]} y={y} poles={m} />
          ))}
          {two && <Dimension x1={175} y1={y + 40} x2={245} y2={y + 40} m={v.gap} unit="cm" ctx={ctx} side={-1} gap={12} />}
        </PhysSvg>
      );
    }
    case "field": {
      const poles = v.magnet ?? "NS";
      const cx = 210;
      const cy = 150;
      const P: Pole[] = [
        { x: cx - 54, y: cy, q: poles[0] === "N" ? 1 : -1 },
        { x: cx + 54, y: cy, q: poles[1] === "N" ? 1 : -1 },
      ];
      const box: [number, number, number, number] = [10, 10, 410, 290];
      const lines = fieldLines(P, box, 14, 10);
      const spots = [
        [cx, 52],
        [cx, 248],
        [40, cy],
        [380, cy],
        [70, 64],
        [350, 236],
      ];
      return (
        <PhysSvg box={[10, 10, 400, 280]} label="A bar magnet's field lines">
          <g>
            {lines.map((l, i) => (
              <FieldLine key={i} pts={l.pts} dir={l.dir} />
            ))}
          </g>
          <BarMagnet x={cx} y={cy} poles={poles} w={140} />
          {v.compass &&
            spots.map(([x, y], i) => {
              const { bx, by } = field(P, x, y);
              return <Compass key={i} x={x} y={y} ang={Math.atan2(by, bx)} />;
            })}
        </PhysSvg>
      );
    }
    case "wire": {
      const out = v.current === "out";
      if ((v.view ?? "end") === "end") {
        const cx = 200;
        const cy = 150;
        const heads = (r: number) =>
          [90, 210, 330].map((deg) => {
            const a = (deg * Math.PI) / 180;
            const x = cx + r * Math.cos(a);
            const y = cy - r * Math.sin(a);
            const dir = out ? 1 : -1;
            const tx = -Math.sin(a) * dir;
            const ty = -Math.cos(a) * dir;
            return <Arrow key={deg} x1={x - tx * 8} y1={y - ty * 8} x2={x + tx * 6} y2={y + ty * 6} colour="wave" width={0.1} head={14} />;
          });
        return (
          <PhysSvg box={[50, 10, 300, 280]} label={`Wire with current ${out ? "out of" : "into"} the page`}>
            {[46, 82, 118].map((r) => (
              <g key={r}>
                <circle cx={cx} cy={cy} r={r} className="ph-field-ring" />
                {heads(r)}
              </g>
            ))}
            <circle cx={cx} cy={cy} r="17" className="ph-wire-end" />
            {out ? <circle cx={cx} cy={cy} r="5" className="ph-dot-mark" /> : <path d={`M${cx - 8} ${cy - 8}L${cx + 8} ${cy + 8}M${cx + 8} ${cy - 8}L${cx - 8} ${cy + 8}`} className="ph-x-mark" />}
            <Label x={cx + 24} y={cy - 18} m={v.label} unit="A" ctx={ctx} anchor="start" size="sm" />
          </PhysSvg>
        );
      }
      const x = 200;
      const ys = [86, 150, 214];
      const dir = out ? 1 : -1;
      return (
        <PhysSvg box={[90, 10, 220, 280]} label={`Wire with current going ${out ? "up" : "down"}`}>
          {ys.map((y) => (
            <path key={`b${y}`} d={`M${x - 74} ${y} A74 18 0 0 1 ${x + 74} ${y}`} className="ph-field-ring back" />
          ))}
          <line x1={x} y1={22} x2={x} y2={278} className="ph-wire-side" />
          <Arrow x1={x + 22} y1={150 + dir * 34} x2={x + 22} y2={150 - dir * 34} colour="berry" width={4} />
          <Label x={x + 32} y={157} m={v.label ?? "I"} unit="A" ctx={ctx} anchor="start" size="sm" colour="berry" />
          {ys.map((y) => (
            <g key={`f${y}`}>
              <path d={`M${x - 74} ${y} A74 18 0 0 0 ${x + 74} ${y}`} className="ph-field-ring" />
              {[55, 125].map((deg) => {
                const t = (deg * Math.PI) / 180;
                const px = x + 74 * Math.cos(t);
                const py = y + 18 * Math.sin(t);
                const tx = 74 * Math.sin(t) * dir;
                const ty = -18 * Math.cos(t) * dir;
                const L = Math.hypot(tx, ty);
                return <Arrow key={deg} x1={px - (tx / L) * 8} y1={py - (ty / L) * 8} x2={px + (tx / L) * 7} y2={py + (ty / L) * 7} colour="wave" width={0.1} head={14} />;
              })}
            </g>
          ))}
        </PhysSvg>
      );
    }
    case "charges": {
      const S = 46;
      const xs = v.charges.map((c) => c.x);
      const ysU = v.charges.map((c) => c.y);
      const minX = Math.min(...xs) - 2.3;
      const maxX = Math.max(...xs) + 2.3;
      const minY = Math.min(...ysU) - 1.9;
      const maxY = Math.max(...ysU) + 1.9;
      const widen = Math.max(0, 7.6 - (maxX - minX)) / 2;
      const X = (x: number) => (x - minX + widen) * S;
      const Y = (y: number) => (maxY - y) * S;
      const W = (maxX - minX + 2 * widen) * S;
      const H = (maxY - minY) * S;
      const P: Pole[] = v.charges.map((c) => ({ x: X(c.x), y: Y(c.y), q: (c.sign === "+" ? 1 : -1) * (c.q ?? 1) }));
      const lines = v.lines ? fieldLines(P, [0, 0, W, H], 8, 20) : [];
      const B = new Bounds();
      B.add(0, 0);
      B.add(W, H);
      const forces: ReactNode[] = [];
      if (v.forces && P.length > 1) {
        const F = P.map((p, i) => {
          let fx = 0;
          let fy = 0;
          P.forEach((o, j) => {
            if (i === j) return;
            const dx = p.x - o.x;
            const dy = p.y - o.y;
            const r = Math.hypot(dx, dy) / S;
            const k = (p.q * o.q) / (r * r * r * S);
            fx += k * dx;
            fy += k * dy;
          });
          return { fx, fy };
        });
        const maxF = Math.max(...F.map((f) => Math.hypot(f.fx, f.fy))) || 1;
        F.forEach((f, i) => {
          const m = Math.hypot(f.fx, f.fy);
          if (m < 1e-9) return;
          const ux = f.fx / m;
          const uy = f.fy / m;
          const len = Math.max(26, (m / maxF) * 72);
          const p = P[i];
          const tip = { x: p.x + ux * (20 + len), y: p.y + uy * (20 + len) };
          const { anchor, dy } = tipPlacement(ux, uy);
          const lab = v.forceLabels?.[i];
          if (lab !== undefined && lab !== null) B.text(tip.x + ux * 8, tip.y + uy * 8 + dy, markText(lab, "N", ctx), anchor, 16);
          B.add(tip.x, tip.y);
          forces.push(
            <g key={i}>
              <Arrow x1={p.x + ux * 20} y1={p.y + uy * 20} x2={tip.x} y2={tip.y} colour="grape" />
              <Label x={tip.x + ux * 8} y={tip.y + uy * 8 + dy} m={lab} unit="N" ctx={ctx} anchor={anchor} size="sm" colour="grape" />
            </g>,
          );
        });
      }
      let dist: ReactNode = null;
      if (v.distance !== undefined && v.distance !== null && P.length >= 2) {
        const [a, b] = P;
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        let nx = (b.y - a.y) / L;
        let ny = -(b.x - a.x) / L;
        if (ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const off = v.charges.some((c) => c.label) ? 62 : 40;
        B.add(a.x + nx * (off + 30), a.y + ny * (off + 30));
        dist = <Dimension x1={a.x + nx * off} y1={a.y + ny * off} x2={b.x + nx * off} y2={b.y + ny * off} m={v.distance} unit={v.unit ?? "m"} ctx={ctx} side={b.x >= a.x ? -1 : 1} gap={12} />;
      }
      return (
        <PhysSvg box={B.box(4, 0)} label="Electric charges">
          <g>
            {lines.map((l, i) => (
              <FieldLine key={i} pts={l.pts} dir={l.dir} />
            ))}
          </g>
          {dist}
          {forces}
          {v.charges.map((c, i) => (
            <g key={i}>
              <circle cx={P[i].x} cy={P[i].y} r={16 + 2 * ((c.q ?? 1) - 1)} className={`ph-charge ${c.sign === "+" ? "pos" : "neg"}`} />
              <text x={P[i].x} y={P[i].y + 8} className="ph-charge-sign" textAnchor="middle">
                {c.sign === "+" ? "+" : "−"}
              </text>
              {c.label && (
                <text x={P[i].x} y={P[i].y + 42} className="ph-label ph-sm halo" textAnchor="middle">
                  {c.label}
                </text>
              )}
            </g>
          ))}
        </PhysSvg>
      );
    }
  }
}

/* ------------------------------------------------------------------ energy */

function Chain({ steps, y0, B }: { steps: (EnergyStep | EnergyStep[])[]; y0: number; B: Bounds }) {
  const gapX = 112;
  const out: ReactNode[] = [];
  const branch = steps[steps.length - 1];
  const fan = Array.isArray(branch) ? branch.length : 1;
  const cy = y0 + 48 + ((fan - 1) * 96) / 2;
  let prev: { x: number; y: number } | null = null;
  steps.forEach((s, i) => {
    const x = 50 + i * gapX;
    const group = Array.isArray(s) ? s : [s];
    group.forEach((st, j) => {
      const y = Array.isArray(s) ? cy + (j - (group.length - 1) / 2) * 96 : cy;
      B.add(x - 44, y - 40);
      B.add(x + 44, y + 64);
      if (prev) {
        const dx = x - prev.x;
        const dy = y - prev.y;
        const L = Math.hypot(dx, dy);
        const ux = dx / L;
        const uy = dy / L;
        out.push(<Arrow key={`a${i}-${j}`} x1={prev.x + ux * 40} y1={prev.y + uy * 40} x2={x - ux * 40} y2={y - uy * 40} colour="tangerine" width={4} head={12} />);
        if (st.via) {
          const vy = Math.min(prev.y, y) - 44;
          B.add((prev.x + x) / 2, vy - 16);
          out.push(
            <text key={`v${i}-${j}`} x={(prev.x + x) / 2} y={vy} className="ph-tiny" textAnchor="middle">
              {st.via}
            </text>,
          );
        }
      }
      out.push(
        <g key={`s${i}-${j}`}>
          <circle cx={x} cy={y} r="34" className="ph-chain-node" />
          <Emoji x={x} y={y} e={st.emoji} size={38} />
          <text x={x} y={y + 56} className="ph-note" textAnchor="middle">
            {st.label}
          </text>
        </g>,
      );
    });
    if (!Array.isArray(s)) prev = { x, y: cy };
  });
  return { node: <g>{out}</g>, bottom: cy + ((fan - 1) * 96) / 2 + 64 };
}

export function Energy({ v, ctx }: { v: Of<"phys-energy">; ctx: Ctx }) {
  const B = new Bounds();
  const parts: ReactNode[] = [];
  let y = 0;
  if (v.chain) {
    const c = Chain({ steps: v.chain, y0: 0, B });
    parts.push(<g key="chain">{c.node}</g>);
    y = c.bottom + 30;
  }
  if (v.bars) {
    const names = v.names ?? [];
    const max = v.max ?? 1;
    const bw = v.bars.length > 2 ? 34 : 40;
    const gap = 10;
    const chartW = names.length * (bw + gap) + gap;
    const H = 150;
    const top = y + 52;
    const base = top + H;
    let x = 30;
    v.bars.forEach((b, k) => {
      const x0 = x;
      parts.push(
        <g key={`c${k}`}>
          <text x={x0 + chartW / 2} y={top - 32} className="ph-label ph-sm" textAnchor="middle">
            {b.title}
          </text>
          <line x1={x0} y1={top} x2={x0} y2={base} className="ph-axis" />
          <line x1={x0} y1={base} x2={x0 + chartW} y2={base} className="ph-axis" />
          {b.values.map((val, i) => {
            const bx = x0 + gap + i * (bw + gap);
            const c = SERIES[i % SERIES.length] as Colour;
            const num = val === "?" ? (ctx.solved && Number.isFinite(Number.parseFloat(ctx.answer)) ? Number.parseFloat(ctx.answer) : null) : val;
            const h = num === null ? 0 : (clamp(num, 0, max) / max) * H;
            return (
              <g key={i}>
                {val === "?" && <rect x={bx} y={top} width={bw} height={H} rx="5" className="ph-bar-ask" />}
                {num !== null && h > 0 && <rect x={bx} y={base - h} width={bw} height={h} rx="5" style={{ fill: col(c, false), stroke: col(c) }} className="ph-ebar" />}
                <Label x={bx + bw / 2} y={base - h - 8} m={val === "?" ? "?" : val} unit={v.unit} ctx={ctx} size="sm" cls="ph-bar-val" />
                <text x={bx + bw / 2} y={base + 22} className="ph-tiny strong" textAnchor="middle">
                  {names[i]}
                </text>
              </g>
            );
          })}
        </g>,
      );
      x += chartW + 34;
    });
    B.add(0, y);
    B.add(x - 24, base + 30);
  }
  return (
    <PhysSvg box={B.box(10, 0)} label={v.bars ? "Energy bar charts" : "Energy transfer chain"}>
      {parts}
    </PhysSvg>
  );
}

/* ------------------------------------------------------------------ thermo */

export function Thermo({ v, ctx }: { v: Of<"phys-thermo">; ctx: Ctx }) {
  if (v.scene === "thermometer") {
    const unit = v.unit ?? "°C";
    const labelStep = v.labelStep ?? v.step * 5;
    const yT = (t: number) => 266 - ((t - v.min) / (v.max - v.min)) * 222;
    const ticks = Math.round((v.max - v.min) / v.step);
    const B = new Bounds();
    const units = v.thermometers.map((t, k) => {
      const cx = 74 + k * 136;
      B.add(cx - 30, 26);
      B.add(cx + 66, 320);
      const reading = markText(t.reading, unit, ctx);
      if (reading) B.text(cx - 22, yT(t.temp) + 7, reading, "end", 16);
      return (
        <g key={k}>
          <rect x={cx - 12} y={28} width="24" height="262" rx="12" className="ph-tube" />
          <circle cx={cx} cy={292} r="21" className="ph-bulb-t" />
          <rect x={cx - 6} y={yT(t.temp)} width="12" height={292 - yT(t.temp)} rx="3" className="ph-mercury" />
          {range(ticks + 1).map((i) => {
            const val = v.min + i * v.step;
            const major = Math.abs(val / labelStep - Math.round(val / labelStep)) < 1e-6;
            const y = yT(val);
            return (
              <g key={i}>
                <line x1={cx + 14} y1={y} x2={cx + (major ? 26 : 20)} y2={y} className="ph-tick-line" />
                {major && (
                  <text x={cx + 30} y={y + 5} className="ph-tiny" textAnchor="start">
                    {val < 0 ? `−${-val}` : val}
                  </text>
                )}
              </g>
            );
          })}
          {reading && (
            <g>
              <line x1={cx - 18} y1={yT(t.temp)} x2={cx - 8} y2={yT(t.temp)} className="ph-pointer" />
              <Label x={cx - 22} y={yT(t.temp) + 7} m={t.reading} unit={unit} ctx={ctx} anchor="end" size="sm" />
            </g>
          )}
          {t.label && (
            <Note x={cx + 10} y={340}>
              {t.label}
            </Note>
          )}
          {k === 0 && (
            <text x={cx + 30} y={20} className="ph-tiny strong" textAnchor="start">
              {unit}
            </text>
          )}
        </g>
      );
    });
    if (v.thermometers.some((t) => t.label)) B.add(0, 350);
    return (
      <PhysSvg box={B.box(10, 160)} label="Thermometer">
        {units}
      </PhysSvg>
    );
  }
  if (v.scene === "flow") {
    const unit = v.unit ?? "°C";
    const touching = v.touching ?? true;
    const w = 130;
    const xa = 30;
    const xb = xa + w + (touching ? 0 : 50);
    const hotA = v.a.temp > v.b.temp;
    const same = v.a.temp === v.b.temp;
    const box = (o: typeof v.a, x: number, hot: boolean) => (
      <g>
        <rect x={x} y={70} width={w} height={110} rx="14" className={`ph-thermal ${same ? "even" : hot ? "hot" : "cold"}`} />
        <Emoji x={x + w / 2} y={125} e={o.emoji} size={52} />
        <Label x={x + w / 2} y={210} m={o.label ?? o.temp} unit={unit} ctx={ctx} />
      </g>
    );
    const ca = xa + w / 2;
    const cb = xb + w / 2;
    return (
      <PhysSvg box={[10, 0, xb + w + 20, 226]} label="Heat flowing from hot to cold">
        {box(v.a, xa, hotA)}
        {box(v.b, xb, !hotA)}
        {same ? (
          <Note x={(ca + cb) / 2} y={40}>
            same temperature: no heat flows
          </Note>
        ) : (
          <g>
            <Arrow x1={hotA ? ca : cb} y1={46} x2={hotA ? cb : ca} y2={46} colour="tangerine" width={6} head={18} />
            <text x={(ca + cb) / 2} y={30} className="ph-label ph-sm halo" textAnchor="middle" style={{ fill: col("tangerine") }}>
              {v.arrowLabel ?? "heat"}
            </text>
          </g>
        )}
      </PhysSvg>
    );
  }
  const units = { P: "atm", V: "L", T: "K", ...v.units };
  const x0 = 70;
  const w = 170;
  const bottom = 320;
  const top = 70;
  const py = bottom - v.volume * (bottom - top - 30) - 16;
  const rand = seeded(7);
  const n = v.particles ?? 16;
  const dots = range(n).map((i) => {
    const x = x0 + 14 + rand() * (w - 28);
    const y = py + 30 + rand() * (bottom - py - 42);
    const a = rand() * Math.PI * 2;
    const L = v.hot ? 16 : 8;
    return (
      <g key={i}>
        <line x1={x} y1={y} x2={x - L * Math.cos(a)} y2={y - L * Math.sin(a)} className="ph-streak" />
        <circle cx={x} cy={y} r="5.5" className="ph-particle" />
      </g>
    );
  });
  const lab = (name: "P" | "V" | "T", m: (typeof v)["P"], y: number) =>
    m === undefined || m === null ? null : (
      <g key={name}>
        <text x={x0 + w + 26} y={y} className="ph-label ph-md" textAnchor="start">
          {name} ={" "}
        </text>
        <Label x={x0 + w + 66} y={y} m={m} unit={units[name]} ctx={ctx} anchor="start" halo={false} />
      </g>
    );
  return (
    <PhysSvg box={[40, v.weight ? 0 : 20, 380, v.heat ? 360 : 320]} label="Gas in a cylinder with a piston">
      <rect x={x0} y={py + 16} width={w} height={bottom - py - 16} className="ph-gas" />
      {dots}
      <path d={`M${x0} ${top} L${x0} ${bottom} L${x0 + w} ${bottom} L${x0 + w} ${top}`} className="ph-cylinder" />
      <rect x={x0 + 3} y={py} width={w - 6} height="16" rx="3" className="ph-piston" />
      <rect x={x0 + w / 2 - 7} y={py - 46} width="14" height="46" rx="3" className="ph-piston" />
      {v.weight && <Emoji x={x0 + w / 2} y={py - 66} e={v.weight} size={40} />}
      {v.heat && <Emoji x={x0 + w / 2} y={bottom + 24} e={v.heat === "in" ? "🔥" : "🧊"} size={34} />}
      {lab("P", v.P, 150)}
      {lab("V", v.V, 190)}
      {lab("T", v.T, 230)}
    </PhysSvg>
  );
}
