import type { CSSProperties } from "react";
import { COLOUR_WORD } from "../../game/questions";
import type { Colour, FracBar } from "../../game/types";

export const SERIES = ["sun", "leaf", "berry", "wave", "grape", "teal", "tangerine", "rose"];

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/** 0.30000000000000004 → "0.3", −4 → "−4". */
export function num(v: number): string {
  const s = String(Number.parseFloat(v.toFixed(4)));
  return s.startsWith("-") ? `−${s.slice(1)}` : s;
}

/* -------------------------------------------------------------- number line */

/** 1.333… with denominator 3 → "1 1/3"; whole numbers stay whole. */
export function asFraction(v: number, d: number): string {
  const n = Math.round(v * d);
  const whole = Math.trunc(n / d);
  const rest = Math.abs(n - whole * d);
  if (!rest) return num(whole);
  const sign = n < 0 && whole === 0 ? "−" : "";
  return whole ? `${num(whole)} ${rest}/${d}` : `${sign}${rest}/${d}`;
}

export function NumberLine({
  min,
  max,
  step,
  labelStep,
  from,
  to,
  fractions,
  hideFrom,
  ray,
  solved,
}: {
  min: number;
  max: number;
  step: number;
  labelStep: number;
  from: number;
  to: number;
  fractions?: number;
  hideFrom?: boolean;
  ray?: { at: number; dir: "left" | "right"; open: boolean };
  solved: boolean;
}) {
  const show = (v: number) => (fractions ? asFraction(v, fractions) : num(v));
  const W = 640;
  const pad = 36;
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad);
  const ticks: number[] = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count && i <= 400; i++) ticks.push(min + i * step);
  const isLabel = (v: number) => Math.abs((v - min) / labelStep - Math.round((v - min) / labelStep)) < 1e-6;
  const xf = x(from);
  const xt = x(to);
  const lift = Math.min(64, Math.abs(xt - xf) * 0.45 + 18);
  return (
    <svg className="nl" viewBox={`0 0 ${W} 140`} role="img" aria-label={`Number line from ${num(min)} to ${num(max)}`}>
      <defs>
        <marker id="nl-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="nl-arrowhead" />
        </marker>
      </defs>
      <line x1={pad - 16} x2={W - pad + 16} y1="92" y2="92" className="nl-axis" />
      {ticks.map((v, i) => {
        const big = isLabel(v);
        return (
          <g key={i}>
            <line x1={x(v)} x2={x(v)} y1={big ? 80 : 85} y2={big ? 104 : 99} className="nl-tick" />
            {big && (
              <text x={x(v)} y="128" className="nl-label">
                {show(v)}
              </text>
            )}
          </g>
        );
      })}
      {ray && (
        <g className="nl-ray">
          <line x1={x(ray.at)} x2={ray.dir === "right" ? W - pad + 6 : pad - 6} y1="92" y2="92" />
          <path d={ray.dir === "right" ? `M${W - pad + 22} 92 l-16 -10 v20 z` : `M${pad - 22} 92 l16 -10 v20 z`} className="nl-ray-head" />
          <circle cx={x(ray.at)} cy="92" r="11" className={ray.open ? "nl-open" : "nl-closed"} />
        </g>
      )}
      {solved && from !== to && (
        <path d={`M${xf} 80 Q${(xf + xt) / 2} ${80 - lift} ${xt} 80`} className="nl-jump" markerEnd="url(#nl-arrow)" />
      )}
      <circle cx={xf} cy="92" r="10" className="nl-from" />
      {!(solved && from === to) && (
        <g className="nl-pill">
          <rect x={xf - 32} y="44" width="64" height="26" rx="13" />
          <text x={xf} y="63">
            {hideFrom && !solved ? "?" : show(from)}
          </text>
        </g>
      )}
      {solved && (
        <>
          <circle cx={xt} cy="92" r="10" className="nl-to" />
          <g className="nl-pill nl-pill-to">
            <rect x={xt - 32} y={from === to ? 14 : Math.max(4, 80 - lift - 34)} width="64" height="26" rx="13" />
            <text x={xt} y={(from === to ? 14 : Math.max(4, 80 - lift - 34)) + 19}>
              {show(to)}
            </text>
          </g>
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ place values */

const WHOLE = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten thousands",
  "hundred thousands",
  "millions",
  "ten millions",
  "hundred millions",
];
const PARTS = ["tenths", "hundredths", "thousandths"];

export function Places({ digits, highlight }: { digits: string; highlight: number }) {
  const dot = digits.indexOf(".");
  const wholeDigits = (dot < 0 ? digits : digits.slice(0, dot)).replace(/,/g, "").length;
  let wholeSeen = 0;
  let partSeen = 0;
  return (
    <div className="places">
      {[...digits].map((ch, i) => {
        if (ch === "," || ch === ".") {
          return (
            <span key={i} className={ch === "." ? "place place-point" : "place-comma"} aria-hidden={ch === ","}>
              {ch === "." && (
                <>
                  <span className="place-digit">.</span>
                  <span className="place-name" />
                </>
              )}
            </span>
          );
        }
        const decimal = dot >= 0 && i > dot;
        const name = decimal ? PARTS[partSeen++] : WHOLE[wholeDigits - 1 - wholeSeen++];
        const groupGap = !decimal && (wholeDigits - wholeSeen) % 3 === 2 && wholeSeen > 1 && !digits.includes(",");
        return (
          <span key={i} className={`place${i === highlight ? " on" : ""}${groupGap ? " gap" : ""}`}>
            <span className="place-digit">{ch}</span>
            <span className="place-name">{name}</span>
          </span>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- area model */

export function AreaModel({
  tens,
  ones,
  by,
  split,
  solved,
}: {
  tens: number;
  ones: number;
  by: number;
  split?: [number, number];
  solved: boolean;
}) {
  if (split) {
    const cols = [tens, ones].filter((c) => c > 0);
    return (
      <div className="area-model area-2x2" style={{ "--cols": cols.length } as CSSProperties}>
        <span />
        <div className="area-top">
          {cols.map((c, i) => (
            <span key={i} style={{ flexGrow: i === 0 ? 2.2 : 1 }}>
              {c}
            </span>
          ))}
        </div>
        <div className="area-sides">
          {split.map((r, i) => (
            <span key={i} style={{ flexGrow: i === 0 ? 2 : 1 }}>
              {r}
            </span>
          ))}
        </div>
        <div className="area-grid">
          {split.map((r, ri) => (
            <div className="area-grid-row" key={ri} style={{ flexGrow: ri === 0 ? 2 : 1 }}>
              {cols.map((c, ci) => (
                <span key={ci} className={`area-box area-${ri}${ci}`} style={{ flexGrow: ci === 0 ? 2.2 : 1 }}>
                  {solved ? c * r : `${c} × ${r}`}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="area-model">
      <span />
      <div className="area-top">
        <span style={{ flexGrow: 2.2 }}>{tens}</span>
        {ones > 0 && <span style={{ flexGrow: 1 }}>{ones}</span>}
      </div>
      <span className="area-side">{by}</span>
      <div className="area-boxes">
        <span className="area-box area-tens" style={{ flexGrow: 2.2 }}>
          {solved ? tens * by : `${tens} × ${by}`}
        </span>
        {ones > 0 && (
          <span className="area-box area-ones" style={{ flexGrow: 1 }}>
            {solved ? ones * by : `${ones} × ${by}`}
          </span>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- fractions */

function Pie({ bar, solved }: { bar: FracBar; solved: boolean }) {
  const kinds = partKinds(bar);
  const r = 1;
  if (bar.parts === 1) {
    return (
      <svg viewBox="-1.1 -1.1 2.2 2.2" className="pie">
        <circle r={r} className={`slice slice-${kinds[0]}${solved && kinds[0] === "target" ? " filled" : ""}`} />
      </svg>
    );
  }
  return (
    <svg viewBox="-1.1 -1.1 2.2 2.2" className="pie">
      {kinds.map((kind, i) => {
        const sizes = partSizes(bar);
        const total = sizes.reduce((t, x) => t + x, 0);
        const before = sizes.slice(0, i).reduce((t, x) => t + x, 0);
        const a0 = (before / total) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((before + sizes[i]) / total) * 2 * Math.PI - Math.PI / 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M0 0 L${Math.cos(a0)} ${Math.sin(a0)} A1 1 0 ${large} 1 ${Math.cos(a1)} ${Math.sin(a1)} Z`;
        return <path key={i} d={d} className={`slice slice-${kind}${solved && kind === "target" ? " filled" : ""}`} />;
      })}
    </svg>
  );
}

/** Part sizes: equal, or a fixed lopsided pattern for "are these equal shares?". */
function partSizes(bar: FracBar): number[] {
  const pattern = [1.7, 0.6, 1.2, 0.8, 1.5, 0.5, 1.1, 0.9];
  return range(bar.parts).map((i) => (bar.unequal ? pattern[i % pattern.length] : 1));
}

function partKinds(bar: FracBar): string[] {
  const a = bar.a ?? 0;
  const b = bar.b ?? 0;
  const t = bar.target ?? 0;
  return range(bar.parts).map((i) => (i < a ? "a" : i < a + b ? "b" : i < a + b + t ? "target" : "empty"));
}

export function Fractions({ bars, solved }: { bars: FracBar[]; solved: boolean }) {
  return (
    <div className="fraction-set">
      {bars.map((bar, k) =>
        bar.shape === "pie" ? (
          <div className="fraction-item" key={k}>
            <Pie bar={bar} solved={solved} />
            {bar.label && <span className="fraction-label">{bar.label}</span>}
          </div>
        ) : (
          <div className="fraction-item fraction-row" key={k}>
            <div className="fbar">
              {partKinds(bar).map((kind, i) => (
                <span
                  key={i}
                  className={`fpart fpart-${kind}${solved && kind === "target" ? " filled" : ""}`}
                  style={{ "--i": i, flexGrow: partSizes(bar)[i] } as CSSProperties}
                />
              ))}
            </div>
            {bar.label && <span className="fraction-label">{bar.label}</span>}
          </div>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------ hundred chart */

export function HundredChart({ highlight, ask, solved }: { highlight: number[]; ask: number; solved: boolean }) {
  const on = new Set(highlight);
  return (
    <div className="hundred" role="img" aria-label="Hundred chart">
      {range(100).map((i) => {
        const n = i + 1;
        const isAsk = n === ask;
        return (
          <span key={n} className={`hc${on.has(n) ? " on" : ""}${isAsk ? (solved ? " ask solved" : " ask") : ""}`}>
            {isAsk && !solved ? "?" : n}
          </span>
        );
      })}
    </div>
  );
}

export function HundredGrid({ shaded }: { shaded: number }) {
  return (
    <div className="hgrid" role="img" aria-label={`${shaded} of 100 squares shaded`}>
      {range(100).map((i) => (
        <span key={i} className={i < shaded ? "on" : ""} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- number bond */

export function Bond({
  whole,
  parts,
  solved,
  answer,
}: {
  whole: number | "?";
  parts: [number | "?", number | "?"];
  solved: boolean;
  answer: string;
}) {
  const show = (v: number | "?") => (v === "?" ? (solved ? answer : "?") : num(v));
  const cls = (v: number | "?") => `bond-node${v === "?" ? (solved ? " solved" : " ask") : ""}`;
  return (
    <div className="bond">
      <svg className="bond-lines" viewBox="0 0 200 120" aria-hidden="true">
        <path d="M100 40 L45 95 M100 40 L155 95" />
      </svg>
      <span className={`${cls(whole)} bond-whole`}>{show(whole)}</span>
      <span className={`${cls(parts[0])} bond-left`}>{show(parts[0])}</span>
      <span className={`${cls(parts[1])} bond-right`}>{show(parts[1])}</span>
    </div>
  );
}

/* ---------------------------------------------------------- table and tape */

export function Table({
  header,
  rows,
  solved,
  answer,
}: {
  header: string[];
  rows: (number | string)[][];
  solved: boolean;
  answer: string;
}) {
  const cell = (c: number | string) => (c === "?" ? (solved ? answer : "?") : typeof c === "number" ? num(c) : c);
  return (
    <table className="vtable">
      <thead>
        <tr>
          {header.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((c, i) => (
              <td key={i} className={c === "?" ? (solved ? "ask solved" : "ask") : ""}>
                {cell(c)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Tape({
  rows,
  partValue,
  solved,
  answer,
}: {
  rows: { label: string; parts: number }[];
  partValue?: number | "?";
  solved: boolean;
  answer: string;
}) {
  const most = Math.max(...rows.map((r) => r.parts));
  return (
    <div className="tape">
      {rows.map((row, r) => (
        <div className="tape-row" key={r}>
          <span className="tape-label">{row.label}</span>
          <div className="tape-bar" style={{ "--most": most } as CSSProperties}>
            {range(row.parts).map((i) => (
              <span key={i} className="tape-part" style={{ background: `var(--${SERIES[r % SERIES.length]})` }}>
                {partValue === undefined ? "" : partValue === "?" ? (solved ? answer : "?") : num(partValue)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- pattern, marbles */

export function Pattern({ items, solved, answer }: { items: string[]; solved: boolean; answer: string }) {
  return (
    <div className="pattern">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className={`pattern-item${last ? (solved ? " solved" : " ask") : ""}`} style={{ "--i": i } as CSSProperties}>
            {last ? (solved ? answer : "?") : it}
          </span>
        );
      })}
    </div>
  );
}

export function Marbles({ marbles }: { marbles: { colour: Colour; count: number }[] }) {
  const all = marbles.flatMap((m) => range(m.count).map(() => m.colour));
  // A fixed scatter so the bag looks hand-filled but doesn't jump around.
  const order = all.map((c, i) => ({ c, k: (i * 7919) % 97 })).sort((a, b) => a.k - b.k);
  return (
    <div className="marbles-wrap">
      <div className="bag">
        {order.map((m, i) => (
          <span key={i} className="marble" style={{ background: `var(--${m.c})`, boxShadow: `inset -4px -5px 0 var(--${m.c}-deep)` }} />
        ))}
      </div>
      <div className="marble-key">
        {marbles.map((m) => (
          <span key={m.colour}>
            <i style={{ background: `var(--${m.colour})` }} /> {m.count} {COLOUR_WORD[m.colour]}
          </span>
        ))}
      </div>
    </div>
  );
}
