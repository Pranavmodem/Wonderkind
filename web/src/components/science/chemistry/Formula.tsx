/** Drawing formulas (H₂O, SO₄²⁻, ²³⁸₉₂U) in HTML and SVG, plus shared bits: atom balls and "?" marks. */
import type { ReactNode } from "react";
import type { Mark } from "../../../game/types";
import { num } from "../../visuals/NumberVisuals";
import { edgeOf, elementColour, textOn } from "./molecules";

export type Seg = { t: string; k: "n" | "sub" | "sup" };

const SUBS = "₀₁₂₃₄₅₆₇₈₉₋₊";
const SUB_ASCII = "0123456789-+";
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻";
const SUP_ASCII = "0123456789+−";

/** Split a formula into normal text, subscripts and superscripts; a leading nuclide (²³⁸₉₂U) comes out as `pre`. */
export function formulaSegments(f: string): { pre?: { A: string; Z: string }; segs: Seg[] } {
  let s = f;
  let pre: { A: string; Z: string } | undefined;
  const m = /^([⁰¹²³⁴⁵⁶⁷⁸⁹]+)([₀₁₂₃₄₅₆₇₈₉₋₊]+)/.exec(s);
  if (m) {
    pre = {
      A: [...m[1]].map((c) => SUP_ASCII[SUPS.indexOf(c)]).join(""),
      Z: [...m[2]].map((c) => SUB_ASCII[SUBS.indexOf(c)]).join("").replace("-", "−"),
    };
    s = s.slice(m[0].length);
  }
  const segs: Seg[] = [];
  const push = (t: string, k: Seg["k"]) => {
    const last = segs[segs.length - 1];
    if (last && last.k === k) last.t += t;
    else segs.push({ t, k });
  };
  [...s].forEach((c, i, arr) => {
    const si = SUBS.indexOf(c);
    const pi = SUPS.indexOf(c);
    if (si >= 0) push(SUB_ASCII[si], "sub");
    else if (pi >= 0) push(SUP_ASCII[pi], "sup");
    else if (/\d/.test(c) && i > 0 && (/[A-Za-z)\]]/.test(arr[i - 1]) || (/\d/.test(arr[i - 1]) && segs[segs.length - 1]?.k === "sub"))) push(c, "sub");
    else push(c, "n");
  });
  return { pre, segs };
}

/** A formula as HTML with real subscripts and superscripts. "?" is highlighted. */
export function FormulaHtml({ f, className = "" }: { f: string; className?: string }) {
  if (f === "?") return <span className={`chem-ask-box ${className}`}>?</span>;
  const { pre, segs } = formulaSegments(f);
  return (
    <span className={`chem-f ${className}`}>
      {pre && (
        <span className="chem-nuc" aria-hidden="true">
          <span>{pre.A}</span>
          <span>{pre.Z}</span>
        </span>
      )}
      {segs.map((s, i) => (s.k === "sub" ? <sub key={i}>{s.t}</sub> : s.k === "sup" ? <sup key={i}>{s.t}</sup> : <span key={i}>{s.t}</span>))}
    </span>
  );
}

/**
 * A formula as SVG text at (x, y) with font size `size` (px in the viewBox). Subscripts drop and superscripts rise
 * using relative shifts, so `anchor` still centres the whole formula. Nuclide prefixes are written inline small.
 */
export function FormulaSvg({
  f,
  x,
  y,
  size = 20,
  anchor = "middle",
  className = "chem-svg-text",
}: {
  f: string;
  x: number;
  y: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  className?: string;
}) {
  if (f === "?")
    return (
      <text x={x} y={y} className={`${className} ask`} style={{ fontSize: size, textAnchor: anchor }}>
        ?
      </text>
    );
  const { pre, segs } = formulaSegments(f);
  const down = size * 0.28;
  const up = size * 0.42;
  let shift = 0;
  const parts: ReactNode[] = [];
  const add = (t: string, k: Seg["k"], key: string) => {
    const target = k === "sub" ? down : k === "sup" ? -up : 0;
    const dy = target - shift;
    shift = target;
    parts.push(
      <tspan key={key} dy={dy || undefined} style={k === "n" ? undefined : { fontSize: size * 0.66 }}>
        {t}
      </tspan>,
    );
  };
  if (pre) {
    add(pre.A, "sup", "pa");
    add(pre.Z, "sub", "pz");
  }
  segs.forEach((s, i) => add(s.t, s.k, String(i)));
  if (shift) parts.push(<tspan key="end" dy={-shift} />);
  return (
    <text x={x} y={y} className={className} style={{ fontSize: size, textAnchor: anchor }}>
      {parts}
    </text>
  );
}

/** How a Mark reads: numbers get the unit, strings as written; "" for none. */
export function markText(m: Mark | undefined, unit = ""): string {
  if (m === null || m === undefined) return "";
  if (typeof m === "string") return m;
  return `${num(m)}${unit}`;
}

/** A Mark as text, with "?" replaced by `reveal` once solved. */
export function shownMark(m: Mark | undefined, solved: boolean, reveal: string, unit = ""): string {
  if (m === "?" && solved) return reveal;
  return markText(m, unit);
}

/** The CSS class for a mark: "ask" for "?" (highlighted), "ask solved" once revealed. */
export const askClass = (m: Mark | undefined, solved = false) => (m === "?" ? (solved ? " ask revealed" : " ask") : "");

/** An atom as a shaded ball with its symbol, in SVG. */
export function AtomBall({ el, x, y, r, label = true, className = "" }: { el: string; x: number; y: number; r: number; label?: boolean; className?: string }) {
  const fill = elementColour(el);
  return (
    <g className={`chem-ball ${className}`}>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={edgeOf(fill)} strokeWidth={Math.max(1.2, r * 0.09)} />
      <circle cx={x - r * 0.32} cy={y - r * 0.34} r={r * 0.3} className="chem-shine" />
      {label && r >= 8.5 && (
        <text x={x} y={y + r * 0.36} className="chem-ball-text" style={{ fontSize: r * (el.length > 1 ? 0.92 : 1.05), fill: textOn(fill) }}>
          {el}
        </text>
      )}
    </g>
  );
}

/** Deterministic pseudo-random numbers from a seed (stable pictures between renders). */
export function seeded(seed: number) {
  let s = (seed * 2654435761) % 4294967296 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** A fixed hash of a string, for seeding. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** CSS colour for a game colour name, or the pale water colour for "clear". */
export const colourVar = (c: string | undefined, part: "" | "-soft" | "-deep" = "") => (!c || c === "clear" ? (part === "-deep" ? "#8fc3ee" : "#cfe6fb") : `var(--${c}${part})`);

/** Fill for a liquid of a game colour ("clear" = pale water blue), strong enough to show on any world's background. */
export const liquidFill = (c: string | undefined) => (!c || c === "clear" ? "#cfe6fb" : `color-mix(in srgb, var(--${c}) 42%, #fff)`);
