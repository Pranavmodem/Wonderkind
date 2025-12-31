/** Lab glassware: beaker, conical flask, graduated cylinder, test tube, digital balance, burette. */
import { Fragment, useId, type CSSProperties, type ReactNode, type SVGProps } from "react";
import type { ChemistryVisual, Glass, GlassPanel } from "../../../game/science/chemistryTypes";
import type { Colour } from "../../../game/types";
import { num } from "../../visuals/NumberVisuals";
import { askClass, colourVar, liquidFill, seeded, shownMark } from "./Formula";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

/** A 1, 2 or 5 × 10ⁿ step close to `x`. */
export function niceStep(x: number) {
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export const defaultMax = (glass: Glass, volume: number) => {
  const base = glass === "cylinder" ? 50 : glass === "testtube" ? 20 : 250;
  if (volume <= base) return base;
  return niceStep(volume) * Math.ceil(volume / niceStep(volume) + 0.2);
};

interface Shape {
  /** Outline path. */
  outline: string;
  /** Inside, for clipping the liquid. */
  inner: string;
  /** y of the 0 mark and of the full (max) mark; x span of the liquid; where scale marks go. */
  bottom: number;
  full: number;
  left: number;
  right: number;
  markX: number;
  /** Mouth (for stoppers and things above): centre x, y and half-width. */
  mouth: { x: number; y: number; w: number };
}

const SHAPES: Record<Glass, Shape> = {
  beaker: {
    outline: "M26 28 Q30 32 32 36 L32 214 Q32 224 42 224 L118 224 Q128 224 128 214 L128 32 L132 28",
    inner: "M34 30 L126 30 L126 214 Q126 221 118 221 L42 221 Q34 221 34 214 Z",
    bottom: 221,
    full: 62,
    left: 34,
    right: 126,
    markX: 126,
    mouth: { x: 80, y: 30, w: 50 },
  },
  cylinder: {
    outline: "M56 12 L56 214 M104 12 L104 214 M50 12 L56 12 M104 12 L110 12 M56 214 L34 214 Q30 214 30 218 L30 226 L130 226 L130 218 Q130 214 126 214 L104 214",
    inner: "M58 12 L102 12 L102 213 L58 213 Z",
    bottom: 213,
    full: 36,
    left: 58,
    right: 102,
    markX: 58,
    mouth: { x: 80, y: 12, w: 26 },
  },
  flask: {
    outline: "M66 18 L66 84 L24 208 Q20 222 36 222 L124 222 Q140 222 136 208 L94 84 L94 18 M60 18 L66 18 M94 18 L100 18",
    inner: "M68 18 L92 18 L92 85 L133 208 Q136 219 124 219 L36 219 Q24 219 27 208 L68 85 Z",
    bottom: 219,
    full: 92,
    left: 24,
    right: 136,
    markX: 112,
    mouth: { x: 80, y: 18, w: 18 },
  },
  testtube: {
    outline: "M64 20 L64 196 A16 16 0 0 0 96 196 L96 20 M58 20 L64 20 M96 20 L102 20",
    inner: "M66 20 L94 20 L94 196 A14 14 0 0 1 66 196 Z",
    bottom: 210,
    full: 40,
    left: 66,
    right: 94,
    markX: 66,
    mouth: { x: 80, y: 20, w: 20 },
  },
};

/** Where a glass's liquid runs: y of the 0 mark (`bottom`) and of the max mark (`full`), in the 160 × 240 drawing. */
export const glassLevels = (glass: Glass) => ({ bottom: SHAPES[glass].bottom, full: SHAPES[glass].full, right: SHAPES[glass].right, left: SHAPES[glass].left });

/** Scale marks: majors (numbered) and minors. */
export function scaleMarks(max: number, glass: Glass, minor?: number) {
  const major = niceStep(max / (glass === "cylinder" ? 5 : 5));
  const mn = minor ?? (glass === "cylinder" ? major / 5 : major / 2);
  const marks: { v: number; major: boolean }[] = [];
  for (let k = 1; k * mn <= max + 1e-9; k++) {
    const v = Math.round(k * mn * 1e6) / 1e6;
    marks.push({ v, major: Math.abs(v / major - Math.round(v / major)) < 1e-6 });
  }
  return marks;
}

/**
 * One piece of glassware with its liquid. `level` overrides the liquid height (activities); `children` draws extra
 * things in the same coordinates (handles). The SVG is 160 × 240, plus 50 below for a balance.
 */
export function GlassSvg({
  g,
  solved = false,
  answer = "",
  minor,
  children,
  svgProps,
  className = "",
}: {
  g: GlassPanel;
  solved?: boolean;
  answer?: string;
  minor?: number;
  children?: ReactNode;
  svgProps?: SVGProps<SVGSVGElement>;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const s = SHAPES[g.glass];
  const max = g.max ?? defaultMax(g.glass, g.volume);
  const y = (vol: number) => s.bottom - (Math.min(vol, max) / max) * (s.bottom - s.full);
  const level = y(g.volume);
  const showScale = g.scale ?? (g.glass === "cylinder" || g.glass === "beaker");
  const c = g.colour ?? "clear";
  const rnd = seeded(Math.round(g.volume * 13 + max));
  const bubbles = g.bubbles === true ? 8 : typeof g.bubbles === "number" ? g.bubbles : 0;
  const hasBalance = g.balance !== undefined;
  const H = 240 + (hasBalance ? 52 : 0);
  const top = g.stopper || g.thermometer !== undefined ? -18 : 0;
  const pre = g.precipitate ? (g.precipitate === true ? "white" : g.precipitate) : null;
  const meniscus = g.glass === "cylinder" || g.glass === "testtube" ? 4 : 2;
  return (
    <svg className={`chem-glass ${className}`} viewBox={`0 ${top} 160 ${H - top}`} role="img" aria-hidden="true" {...svgProps}>
      <defs>
        <clipPath id={`in${id}`}>
          <path d={s.inner} />
        </clipPath>
      </defs>
      {g.gas && <rect x={0} y={s.mouth.y} width={160} height={Math.max(0, level - s.mouth.y)} clipPath={`url(#in${id})`} className="chem-gas" style={{ fill: `var(--${g.gas})` }} />}
      {g.gas && (
        <g className="chem-gas-puff" style={{ fill: `var(--${g.gas}-soft)`, stroke: `var(--${g.gas})` }}>
          <circle cx={s.mouth.x - 7} cy={s.mouth.y - 9} r={8} />
          <circle cx={s.mouth.x + 7} cy={s.mouth.y - 17} r={6} />
          <circle cx={s.mouth.x - 2} cy={s.mouth.y - 27} r={4.5} />
        </g>
      )}
      {g.volume > 0 && (
        <g clipPath={`url(#in${id})`}>
          <path
            d={`M0 ${level - meniscus} L${s.left} ${level - meniscus} Q${(s.left + s.right) / 2} ${level + meniscus} ${s.right} ${level - meniscus} L160 ${level - meniscus} L160 260 L0 260 Z`}
            className="chem-liquid"
            style={{ fill: liquidFill(c), stroke: colourVar(c, c === "clear" ? "-deep" : "") } as CSSProperties}
          />
          {Array.from({ length: bubbles }, (_, i) => {
            const bx = s.left + 6 + rnd() * (s.right - s.left - 12);
            const by = level + 8 + rnd() * Math.max(4, s.bottom - level - 16);
            return <circle key={i} cx={bx} cy={by} r={2.5 + rnd() * 3.5} className="chem-bubble" style={{ "--rise": `${Math.max(10, by - level)}px`, "--d": `${(rnd() * 1.6).toFixed(2)}s` } as CSSProperties} />;
          })}
          {pre && (
            <g className="chem-precip" style={{ fill: pre === "white" ? "#f4f4f4" : `var(--${pre})` }}>
              {Array.from({ length: 22 }, (_, i) => (
                <circle key={i} cx={s.left + ((s.right - s.left) * (i + 0.5)) / 22 + (rnd() - 0.5) * 4} cy={s.bottom - 3 - rnd() * 7} r={4 + rnd() * 3} />
              ))}
            </g>
          )}
        </g>
      )}
      <path d={s.outline} className="chem-glass-line" />
      {showScale &&
        scaleMarks(max, g.glass, minor).map((m) => {
          const my = y(m.v);
          const len = m.major ? 16 : 9;
          const right = s.markX === s.right || g.glass === "flask";
          return (
            <g key={m.v}>
              <line x1={right ? s.markX - len : s.markX} x2={right ? s.markX : s.markX + len} y1={my} y2={my} className="chem-mark" />
              {m.major && (
                <text x={right ? s.markX - len - 3 : s.markX + len + 3} y={my + 4.5} className={`chem-mark-num${right ? " end" : ""}`}>
                  {num(m.v)}
                </text>
              )}
            </g>
          );
        })}
      {showScale && (
        <text x={s.mouth.x} y={s.bottom - 6} className="chem-unit">
          mL
        </text>
      )}
      {g.stopper && <path d={`M${s.mouth.x - s.mouth.w - 3} ${s.mouth.y - 14} L${s.mouth.x + s.mouth.w + 3} ${s.mouth.y - 14} L${s.mouth.x + s.mouth.w - 3} ${s.mouth.y + 8} L${s.mouth.x - s.mouth.w + 3} ${s.mouth.y + 8} Z`} className="chem-stopper" />}
      {g.thermometer !== undefined &&
        (() => {
          // Stand it away from the scale: through the neck of narrow glass, else on the left side.
          const tx = g.glass === "beaker" ? s.left + 18 : s.mouth.x + 2;
          const bulb = s.bottom - 14;
          const t = typeof g.thermometer === "number" ? g.thermometer : 40;
          const top = bulb - 10 - ((Math.max(-30, Math.min(120, t)) + 30) / 150) * (bulb - 10 + 10);
          return (
            <g className="chem-thermo">
              <rect x={tx - 4.5} y={-14} width={9} height={bulb + 14} rx="4.5" className="chem-thermo-tube" />
              <rect x={tx - 2.5} y={top} width={5} height={bulb - top} className="chem-thermo-red" />
              <circle cx={tx} cy={bulb} r={8} className="chem-thermo-bulb" />
              <g transform={`translate(${tx + (tx < 80 ? 36 : -36)} -4)`}>
                <rect x={-29} y={-13} width={58} height={26} rx={13} className="chem-thermo-label" />
                <text x={0} y={5} className={`chem-thermo-text${askClass(g.thermometer as never, solved)}`}>
                  {g.thermometer === "?" ? (solved ? answer : "?") : `${num(g.thermometer as number)} °C`}
                </text>
              </g>
            </g>
          );
        })()}
      {hasBalance && (
        <g className="chem-balance">
          <rect x={14} y={228} width={132} height={10} rx={4} className="chem-balance-pan" />
          <path d="M22 238 L138 238 L146 284 L14 284 Z" className="chem-balance-body" />
          <rect x={40} y={250} width={80} height={26} rx={6} className="chem-balance-screen" />
          <text x={80} y={269} className={`chem-balance-text${askClass(g.balance, solved)}`}>
            {shownMark(g.balance, solved, answer, " g")}
          </text>
        </g>
      )}
      {children}
    </svg>
  );
}

export function BeakerVisual({ v, solved, answer }: { v: Of<"chem-beaker">; solved: boolean; answer: string }) {
  const n = v.panels.length;
  return (
    <div className={`chem-panels n${n}`}>
      {v.panels.map((g, i) => (
        <Fragment key={i}>
          {i > 0 && v.joiner !== null && (
            <span className="chem-joiner">
              {v.joinerLabel && <small>{v.joinerLabel}</small>}
              {v.joiner ?? "→"}
            </span>
          )}
          <figure className="chem-panel">
            <GlassSvg g={g} solved={solved} answer={answer} />
            {g.label !== undefined && g.label !== null && <figcaption className={askClass(g.label, solved)}>{shownMark(g.label, solved, answer)}</figcaption>}
          </figure>
        </Fragment>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- burette */

/** A burette over a flask, with a zoomed window on the scale at the reading (0 at the top). */
export function Burette({ v, solved, answer }: { v: Of<"chem-titration"> & { mode: "burette" }; solved: boolean; answer: string }) {
  const id = useId().replace(/:/g, "");
  const top = 14;
  const bottom = 214;
  const yOf = (ml: number) => top + (ml / 50) * (bottom - top);
  const ly = yOf(v.reading);
  // Zoomed window: ±1.5 mL around the reading at 40 px per mL.
  const zy = (ml: number) => 120 + (ml - v.reading) * 40;
  const ticks: number[] = [];
  for (let t = Math.ceil((v.reading - 2.6) * 10) / 10; t <= v.reading + 2.6; t = Math.round((t + 0.1) * 10) / 10) if (t >= 0 && t <= 50) ticks.push(t);
  const flask = (v.flask ?? "clear") as Colour | "clear";
  return (
    <div className="chem-burette">
      <svg viewBox="0 0 300 300" className="chem-burette-svg" role="img" aria-hidden="true">
        <defs>
          <clipPath id={`zoom${id}`}>
            <rect x={170} y={30} width={100} height={180} rx={14} />
          </clipPath>
        </defs>
        {/* stand */}
        <rect x={16} y={6} width={6} height={284} rx={3} className="chem-stand" />
        <rect x={6} y={284} width={130} height={10} rx={4} className="chem-stand" />
        <rect x={18} y={110} width={46} height={6} rx={3} className="chem-stand" />
        {/* burette */}
        <rect x={62} y={top} width={18} height={bottom - top} className="chem-burette-glass" />
        <rect x={63} y={ly} width={16} height={bottom - ly} className="chem-liquid" style={{ fill: colourVar("clear"), stroke: "none" }} />
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={62} x2={70} y1={yOf(i * 5)} y2={yOf(i * 5)} className="chem-mark" />
        ))}
        <path d={`M66 ${bottom} L66 ${bottom + 10} L70 ${bottom + 26} L72 ${bottom + 10} L76 ${bottom} Z`} className="chem-burette-tip" />
        <rect x={58} y={bottom + 6} width={26} height={6} rx={3} className="chem-stopcock" />
        {/* flask */}
        <path d="M58 244 L58 252 L36 288 Q34 294 42 294 L100 294 Q108 294 106 288 L84 252 L84 244" className="chem-glass-line" />
        <path d="M44 280 L98 280 L104 290 Q104 292 100 292 L42 292 Q38 292 40 288 Z" style={{ fill: liquidFill(flask), stroke: "none" }} />
        {/* zoom ring */}
        <circle cx={71} cy={ly} r={14} className="chem-zoom-ring" />
        <line x1={84} y1={ly - 6} x2={170} y2={40} className="chem-zoom-line" />
        <line x1={84} y1={ly + 6} x2={170} y2={200} className="chem-zoom-line" />
        <g clipPath={`url(#zoom${id})`}>
          <rect x={170} y={30} width={100} height={180} className="chem-zoom-bg" />
          <path d={`M170 ${zy(v.reading) - 7} Q220 ${zy(v.reading) + 8} 270 ${zy(v.reading) - 7} L270 220 L170 220 Z`} className="chem-liquid" style={{ fill: colourVar("clear"), stroke: colourVar("clear", "-deep") }} />
          {ticks.map((t) => {
            const major = Math.abs(t - Math.round(t)) < 1e-6;
            const half = !major && Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
            return (
              <g key={t}>
                <line x1={170} x2={170 + (major ? 36 : half ? 26 : 16)} y1={zy(t)} y2={zy(t)} className="chem-mark" />
                {major && (
                  <text x={212} y={zy(t) + 6} className="chem-mark-num big">
                    {t}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <rect x={170} y={30} width={100} height={180} rx={14} className="chem-zoom-frame" />
        <text x={220} y={236} className={`chem-reading${v.ask && !solved ? " ask" : ""}`}>
          {v.ask && !solved ? "? mL" : `${num(v.reading)} mL`}
        </text>
      </svg>
      {v.label !== undefined && v.label !== null && <div className={`chem-caption${askClass(v.label, solved)}`}>{shownMark(v.label, solved, answer)}</div>}
    </div>
  );
}
