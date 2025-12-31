/** Particle diagrams: boxes of atoms/molecules arranged as solid, liquid or gas, with keys and motion lines. */
import type { CSSProperties } from "react";
import type { Colour } from "../../../game/types";
import type { Arrangement, ParticlePanel, ParticleSpecies } from "../../../game/science/chemistryTypes";
import { SERIES } from "../../visuals/NumberVisuals";
import { AtomBall, hash, seeded } from "./Formula";
import { particleShape } from "./molecules";

const W = 200;
const H = 200;
const PAD = 12;

/** Colour of a plain particle species (no formula). */
export const plainColour = (s: { colour?: Colour }, i: number) => s.colour ?? (SERIES[(i + 2) % SERIES.length] as Colour);

/** Particle diameter (px in the 200-wide box) that fits `n` particles in a panel. */
export function particleDiameter(n: number) {
  return Math.min(52, (W - 2 * PAD) / Math.ceil(Math.sqrt(Math.max(1, n) * 1.25)));
}

/** Columns in a solid: close to square, as wide as fits. */
const solidCols = (n: number, d: number) => Math.max(1, Math.min(n, Math.floor((W - 2 * PAD) / d), Math.ceil(Math.sqrt(n))));

export interface Placed {
  x: number;
  y: number;
  rot: number;
  species: number;
}

/** Where each particle sits. Same inputs give the same picture. */
export function arrange(kinds: number[], arrangement: Arrangement, d: number, seed: number): Placed[] {
  const rnd = seeded(seed);
  const n = kinds.length;
  const inner = W - 2 * PAD;
  if (n === 0) return [];
  if (arrangement === "solid") {
    const cols = solidCols(n, d);
    const rows = Math.ceil(n / cols);
    const startX = W / 2 - ((Math.min(cols, n) - 1) * d) / 2;
    return kinds.map((species, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const rowLen = r === rows - 1 ? n - r * cols : cols;
      const offset = ((cols - rowLen) * d) / 2;
      return { x: startX + c * d + offset, y: H - PAD - d / 2 - r * d, rot: 0, species };
    });
  }
  if (arrangement === "liquid") {
    // A jumbled pile: more slots than particles, filled from the bottom, nudged about. Shrink the spacing until
    // there are enough slots inside the box (liquids are close together anyway).
    const want = Math.ceil(n * 1.15);
    let sp = d;
    let cols = 1;
    let rows = 1;
    for (let tries = 0; tries < 30; tries++) {
      cols = Math.max(1, Math.floor(inner / sp));
      rows = Math.max(1, Math.floor((inner - sp) / (sp * 0.88)) + 1);
      if (cols * rows - Math.floor(rows / 2) >= want) break;
      sp *= 0.95;
    }
    const slots: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const odd = r % 2 === 1;
      const count = cols - (odd ? 1 : 0);
      const x0 = W / 2 - ((count - 1) * sp) / 2;
      for (let c = 0; c < count; c++) slots.push({ x: x0 + c * sp, y: H - PAD - sp / 2 - r * sp * 0.88 });
    }
    const bottom = slots.slice(0, Math.min(slots.length, want));
    // Leave random holes, then take the lowest n of what's left.
    const keep = bottom
      .map((s, i) => ({ s, k: rnd() + (i / bottom.length) * 1.2 }))
      .sort((a, b) => a.k - b.k)
      .slice(0, n)
      .map((o) => o.s);
    const lo = PAD + d / 2;
    const hi = H - PAD - d / 2;
    return kinds.map((species, i) => ({
      x: Math.min(W - lo, Math.max(lo, keep[i].x + (rnd() - 0.5) * sp * 0.2)),
      y: Math.min(hi, Math.max(lo, keep[i].y + (rnd() - 0.5) * sp * 0.2)),
      rot: rnd() * 360,
      species,
    }));
  }
  // Gas: spread out with space between.
  const out: { x: number; y: number }[] = [];
  let gap = d * 1.55;
  for (let tries = 0; out.length < n && tries < 6000; tries++) {
    if (tries % 1000 === 999) gap *= 0.88;
    const p = { x: PAD + d / 2 + rnd() * (inner - d), y: PAD + d / 2 + rnd() * (H - 2 * PAD - d) };
    if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= gap)) out.push(p);
  }
  while (out.length < n) out.push({ x: PAD + d / 2 + rnd() * (inner - d), y: PAD + d / 2 + rnd() * (H - 2 * PAD - d) });
  return kinds.map((species, i) => ({ ...out[i], rot: rnd() * 360, species }));
}

/** The species index of every particle, mixed up (solids with two equal kinds alternate like a salt crystal). */
export function particleKinds(species: { count: number }[], arrangement: Arrangement, seed: number): number[] {
  const list = species.flatMap((s, i) => Array<number>(s.count).fill(i));
  if (species.length === 1) return list;
  if (arrangement === "solid" && species.length === 2 && species[0].count === species[1].count) {
    // Checkerboard rows, like a salt crystal (when the board splits evenly).
    const n = list.length;
    const cols = solidCols(n, particleDiameter(n));
    const board = list.map((_, i) => (Math.floor(i / cols) + (i % cols)) % 2);
    return board.filter((k) => k === 0).length === species[0].count ? board : list.map((_, i) => i % 2);
  }
  const rnd = seeded(seed + 7);
  return list
    .map((k) => ({ k, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.k);
}

/** One particle (molecule or plain ball), centred at 0,0, sized to `radius` px. */
export function ParticleGlyph({ s, index, radius, rot = 0, unit }: { s: { formula?: string; colour?: Colour }; index: number; radius: number; rot?: number; /** px per bond length, to draw every kind at the same scale. */ unit?: number }) {
  if (!s.formula) {
    const c = plainColour(s, index);
    return (
      <g className="chem-plain">
        <circle r={radius * 0.84} style={{ fill: `var(--${c})`, stroke: `var(--${c}-deep)` }} />
        <circle cx={-radius * 0.3} cy={-radius * 0.3} r={radius * 0.28} className="chem-shine" />
      </g>
    );
  }
  const { atoms, charge } = particleShape(s.formula);
  const k = unit ?? radius / formulaExtent(s.formula);
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Draw the back atoms first so the picture reads (centre atom over outer ones for space-filling look).
  const placed = atoms.map((a, i) => ({ ...a, i, px: (a.x * cos - a.y * sin) * k, py: (a.x * sin + a.y * cos) * k }));
  const order = [...placed].sort((a, b) => (a.i === 0 ? 1 : b.i === 0 ? -1 : 0));
  return (
    <g>
      {order.map((a) => (
        <AtomBall key={a.i} el={a.el} x={a.px} y={a.py} r={a.r * k} label={radius >= 13} />
      ))}
      {charge !== 0 && (
        <text x={radius * 0.72} y={-radius * 0.5} className="chem-charge" style={{ fontSize: Math.max(11, radius * 0.75) }}>
          {charge > 0 ? "+" : "−"}
        </text>
      )}
    </g>
  );
}

/** Radius of a formula's drawing in bond lengths. */
export function formulaExtent(formula: string) {
  const { atoms } = particleShape(formula);
  return Math.max(0.5, ...atoms.map((a) => Math.hypot(a.x, a.y) + a.r));
}

/** px per bond length so the biggest kind fills a particle of this radius. */
export const unitFor = (species: { formula?: string }[], radius: number) => radius / Math.max(0.5, ...species.map((s) => (s.formula ? formulaExtent(s.formula) : 0.5)));

/** Speed lines (liquid/gas) or wiggle marks (solid) beside a particle. */
function MotionMarks({ level, r, arrangement, angle }: { level: number; r: number; arrangement: Arrangement; angle: number }) {
  if (!level) return null;
  if (arrangement === "solid") {
    const w = 3 + level * 1.5;
    return (
      <g className="chem-motion">
        {[-1, 1].map((side) => (
          <path key={side} d={`M${side * (r + 3)} ${-w} q${side * (2 + level)} ${w} 0 ${2 * w}`} />
        ))}
      </g>
    );
  }
  const len = 3 + level * 4;
  const a = (angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  return (
    <g className="chem-motion">
      {(level === 1 ? [0] : [-1, 1]).map((o) => {
        const ox = -uy * o * r * 0.32;
        const oy = ux * o * r * 0.32;
        const sx = -ux * (r + 3) + ox;
        const sy = -uy * (r + 3) + oy;
        return <line key={o} x1={sx} y1={sy} x2={sx - ux * len * (o === 0 ? 1 : 0.7)} y2={sy - uy * len * (o === 0 ? 1 : 0.7)} />;
      })}
    </g>
  );
}

/**
 * One box of particles. `diameter` keeps sizes equal across panels. With `smooth`, particles glide to new places
 * when the arrangement changes (used by the states activity).
 */
export function ParticleBox({
  panel,
  diameter,
  seed,
  smooth = false,
  speed,
  unit,
}: {
  panel: ParticlePanel;
  diameter: number;
  seed: number;
  smooth?: boolean;
  /** Shared px per bond length (see unitFor); default fits this panel's kinds. */
  unit?: number;
  /** Jiggle speed multiplier (activities); defaults by arrangement. */
  speed?: number;
}) {
  const arrangement = panel.arrangement ?? "gas";
  const kinds = particleKinds(panel.species, arrangement, seed);
  const spots = arrange(kinds, arrangement, diameter, seed);
  const radius = diameter / 2 - 1;
  const u = unit ?? unitFor(panel.species, radius);
  const rnd = seeded(seed + 3);
  const container = panel.container ?? "box";
  const animate = panel.animate ?? false;
  const amp = arrangement === "solid" ? 1.2 : arrangement === "liquid" ? 3.5 : 7;
  return (
    <svg className={`chem-box${animate ? " chem-animate" : ""}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
      {container === "box" && <rect x="3" y="3" width={W - 6} height={H - 6} rx="18" className="chem-container" />}
      {container === "beaker" && <path d={`M8 6 L14 14 L14 ${H - 16} Q14 ${H - 4} 26 ${H - 4} L${W - 26} ${H - 4} Q${W - 14} ${H - 4} ${W - 14} ${H - 16} L${W - 14} 14 L${W - 8} 6`} className="chem-container open" />}
      {spots.map((p, i) => {
        const s = panel.species[p.species];
        const dir = rnd() * 360;
        const jig = {
          "--dx": `${(rnd() - 0.5) * 2 * amp}px`,
          "--dy": `${(rnd() - 0.5) * 2 * amp}px`,
          "--dx2": `${(rnd() - 0.5) * 2 * amp}px`,
          "--dy2": `${(rnd() - 0.5) * 2 * amp}px`,
          "--dur": `${((arrangement === "gas" ? 1.1 : arrangement === "liquid" ? 1.6 : 0.5) / (speed ?? 1)) * (0.8 + rnd() * 0.5)}s`,
        } as CSSProperties;
        return (
          <g key={i} className={smooth ? "chem-glide" : undefined} style={smooth ? { transform: `translate(${p.x}px, ${p.y}px)` } : undefined} transform={smooth ? undefined : `translate(${p.x} ${p.y})`}>
            <g className="chem-jig" style={jig}>
              <MotionMarks level={panel.motion ?? 0} r={radius} arrangement={arrangement} angle={dir} />
              <ParticleGlyph s={s} index={p.species} radius={radius} rot={arrangement === "solid" ? 0 : p.rot} unit={s.formula ? u : undefined} />
              {s.ring && <circle r={radius + 4} className="chem-ring" />}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/** Seed for a panel, from its contents (so two equal panels look the same). */
export const panelSeed = (panel: ParticlePanel) => hash(JSON.stringify(panel.species.map((s) => [s.formula, s.colour, s.count])));

/** The key: one icon and name for each kind of particle. */
export function ParticleKey({ species }: { species: ParticleSpecies[] }) {
  return (
    <div className="chem-key">
      {species.map((s, i) => (
        <span key={i} className="chem-key-item">
          <svg viewBox="-18 -18 36 36" className="chem-key-icon" aria-hidden="true">
            <ParticleGlyph s={s} index={i} radius={16} />
          </svg>
          {s.name ?? s.formula ?? "particle"}
        </span>
      ))}
    </div>
  );
}

/** Every distinct kind across panels (by formula/colour/name), keeping its first index for colour. */
export function distinctSpecies(panels: ParticlePanel[]): ParticleSpecies[] {
  const seen = new Map<string, ParticleSpecies>();
  for (const p of panels)
    p.species.forEach((s, i) => {
      const key = s.formula ?? (s.colour ? `c:${s.colour}` : `n:${s.name ?? i}`);
      if (!seen.has(key)) seen.set(key, { ...s, colour: s.formula ? s.colour : plainColour(s, i) });
    });
  return [...seen.values()];
}
