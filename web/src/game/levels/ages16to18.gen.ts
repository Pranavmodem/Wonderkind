/**
 * Question generators for ages 16–18: every AP Calculus AB and BC topic (the
 * "CALC" codes). Worlds and levels are assembled in ./ages16to18.ts.
 *
 * Keypad answers are exact: whole numbers, or decimals built from whole numbers.
 * Answers like π/3, 2√3 or "3x² + 2x" are text choices whose wrong options are
 * the mistakes students really make: forgetting the chain rule, a sign slip,
 * not adding 1 to the exponent, dropping + C, and so on.
 */
import { fmt, labelChoices, pick, rand, shuffle } from "../questions";
import type { Colour, Question, Token, Visual } from "../types";

/* =================================================================== helpers */

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra">;
type Fn = (x: number) => number;
type Pt = { x: number; y: number; label?: string; open?: boolean };
type Seg = { from: [number, number]; to: [number, number]; colour?: Colour; dashed?: boolean };
/** A polynomial as [coefficient, power] pairs, highest power first. */
export type Poly = [number, number][];

const NONE: Visual = { kind: "none" };

/** Remove floating-point noise. */
export const clean = (x: number) => Math.round(x * 1e6) / 1e6;
/** A number as text with a real minus sign. */
export const ds = (x: number) => fmt(clean(x));
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** A random whole number in [lo, hi] that isn't 0. */
export const nz = (lo: number, hi: number) => {
  let v = 0;
  while (v === 0) v = rand(lo, hi);
  return v;
};
export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
/** Does n/d have a short decimal (at most 4 places)? */
export const terminates = (n: number, d: number) => Number.isInteger(clean((n / d) * 10000));

/** Type the answer. Whole numbers get a "−" key so the sign isn't given away; decimals a "."; negative decimals become choices. */
export function kp(a: number): Answer {
  const v = clean(a);
  if (Number.isInteger(v)) return { answer: v, input: "keypad", keypadExtra: "−" };
  if (v < 0) return nums(v, [-v, v * 2, v + 1, v - 1]);
  return { answer: v, input: "keypad", keypadExtra: "." };
}

/** Type an answer that can't be negative (a count, a length, an area, a volume). */
export function kpos(a: number): Answer {
  const v = clean(a);
  return Number.isInteger(v) ? { answer: v, input: "keypad" } : { answer: v, input: "keypad", keypadExtra: "." };
}

/** Number choices: the answer, the likely mistakes, then neighbours. */
export function nums(answer: number, wrong: number[], step = 1): Answer {
  const a = clean(answer);
  const out = [a];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < 4 && Number.isFinite(v) && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < 4 && k < 50; k++) shuffle([a + k * step, a - k * step]).forEach(add);
  return { answer: a, input: "choices", choices: shuffle(out) };
}

/** Text choices: the likely mistakes first, then `extra` fill-ins if mistakes coincide. */
export function label(correct: string, wrong: string[], extra: string[] = []): Answer {
  const pool = [...new Set([...shuffle(wrong), ...shuffle(extra)])].filter((w) => w !== correct);
  const { choices, labels, answer } = labelChoices(correct, pool);
  return { answer, input: "choices", choices, labels };
}

/** n/d in lowest terms: "3/4", "−5/2", "6". */
export function fr(n: number, d = 1): string {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  return `${a < 0 ? "−" : ""}${Math.abs(a)}${b === 1 ? "" : `/${b}`}`;
}

/** n·π/d as text: "8π", "9π/2", "π/2", "−π". */
export function piFr(n: number, d = 1): string {
  if (n === 0) return "0";
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  const a = n / g;
  const b = d / g;
  const A = Math.abs(a);
  return `${a < 0 ? "−" : ""}${A === 1 ? "" : A}π${b === 1 ? "" : `/${b}`}`;
}

/** A fraction answer: typed when it is a short decimal, otherwise picked from fraction choices. */
export function fracAns(n: number, d: number, wrong: string[], extra: string[] = []): Answer {
  return terminates(n, d) ? kp(n / d) : label(fr(n, d), wrong, extra);
}

const SUPS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "-": "⁻", "−": "⁻", "+": "⁺", x: "ˣ", t: "ᵗ", n: "ⁿ", "(": "⁽", ")": "⁾",
};
const UNSUP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁻": "-", "⁺": "+", ˣ: "x", ᵗ: "t", ⁿ: "n", "⁽": "(", "⁾": ")",
};
const SUBS = "₀₁₂₃₄₅₆₇₈₉";

/** Superscript text: sup(-2) = "⁻²". */
export const sup = (e: number | string) => [...String(e)].map((c) => SUPS[c] ?? c).join("");
/** Subscript text: sub(0) = "₀". */
export const sub = (e: number | string) =>
  [...String(e)].map((c) => (c >= "0" && c <= "9" ? SUBS[+c] : c === "-" || c === "−" ? "₋" : c === "a" ? "ₐ" : c === "x" ? "ₓ" : c)).join("");
const unsup = (s: string) => [...s].map((c) => UNSUP[c] ?? c).join("");
const unsub = (s: string) =>
  [...s].map((c) => (SUBS.includes(c) ? String(SUBS.indexOf(c)) : c === "₋" ? "−" : c === "ₐ" ? "a" : c === "ₓ" ? "x" : c === "ₙ" ? "n" : c)).join("");

/** "x", "x²", "x⁻³"; power 0 gives "". */
export const xp = (p: number, v = "x") => (p === 0 ? "" : p === 1 ? v : `${v}${sup(p)}`);

/** One term without its sign: "3x²", "x", "5". */
function body(c: number, p: number, v: string): string {
  const a = Math.abs(clean(c));
  if (p === 0) return ds(a);
  return `${a === 1 ? "" : ds(a)}${xp(p, v)}`;
}

/** A polynomial as text: "3x² − x + 5". */
export function poly(P: Poly, v = "x"): string {
  let s = "";
  for (const [c, p] of P) {
    if (clean(c) === 0) continue;
    const b = body(c, p, v);
    s += s ? (c < 0 ? ` − ${b}` : ` + ${b}`) : c < 0 ? `−${b}` : b;
  }
  return s || "0";
}

/** Join signed text terms: [[3, "sin x"], [-2, "cos x"]] → "3 sin x − 2 cos x". A coefficient of ±1 is hidden. */
export function terms(ts: [number, string][], space = " "): string {
  let s = "";
  for (const [c, t] of ts) {
    if (c === 0) continue;
    const a = Math.abs(c);
    const b = t ? `${a === 1 ? "" : `${ds(a)}${space}`}${t}` : ds(a);
    s += s ? (c < 0 ? ` − ${b}` : ` + ${b}`) : c < 0 ? `−${b}` : b;
  }
  return s || "0";
}

/** "mx + b" as text. */
export const lin = (m: number, b: number, v = "x") => poly([[m, 1], [b, 0]], v);
/** "(x − 3)" style factor. */
export const fac = (r: number, v = "x") => (r === 0 ? v : `(${lin(1, -r, v)})`);
/** Evaluate a polynomial. */
export const pval = (P: Poly, x: number) => P.reduce((s, [c, p]) => s + c * x ** p, 0);
/** Differentiate a polynomial. */
export const pder = (P: Poly): Poly => P.filter(([, p]) => p !== 0).map(([c, p]) => [c * p, p - 1]);

/** A definite integral as text: "∫₀² 3x² dx", "∫₁^∞ 1/x² dx", "∫₀^(π/2) cos x dx". */
export function integ(lo: number | string, hi: number | string, inner: string, dv = "dx"): string {
  const L = sub(typeof lo === "number" ? lo : lo);
  const H = typeof hi === "number" || /^[0-9xt]+$/.test(hi) ? sup(hi) : hi.length === 1 ? `^${hi}` : `^(${hi})`;
  return `∫${L}${H} ${inner} ${dv}`;
}

/** "lim x→2⁻" */
export const lim = (to: number | string, side = "", v = "x") => `lim ${v}→${typeof to === "number" ? fmt(to) : to}${side}`;

function power(e: string): string {
  if (e === "2") return " squared ";
  if (e === "3") return " cubed ";
  return ` to the ${e.replace(/^-/, "negative ")} `;
}

/** Turn on-screen calculus into words Can can say out loud. */
export function talk(s: string): string {
  return s
    .replace(/d²y\/dx²/g, " the second derivative of y ")
    .replace(/d\/dx/g, " the derivative of ")
    .replace(/d([A-Za-z])\/d([a-zθ])/g, " d $1 d $2 ")
    .replace(/lim ([a-zθn])→(\S+)/g, (_, v: string, to: string) => {
      const side = to.endsWith("⁻") ? " from the left" : to.endsWith("⁺") ? " from the right" : "";
      return ` the limit as ${v} approaches ${side ? to.slice(0, -1) : to}${side} of `;
    })
    .replace(/∫([₀-₉₋ₐₓ]+)(?:\^\(([^)]*)\)|\^(\S+)|([⁰¹²³⁴⁵⁶⁷⁸⁹⁻ˣᵗ]+))/g, (_, lo: string, u1?: string, u2?: string, u3?: string) =>
      ` the integral from ${unsub(lo)} to ${u1 ?? u2 ?? unsup(u3 ?? "")} of `,
    )
    .replace(/∫/g, " the integral of ")
    .replace(/Σ/g, " the sum of ")
    .replace(/√\(/g, " the square root of (")
    .replace(/∛\(/g, " the cube root of (")
    .replace(/√/g, " root ")
    .replace(/∛/g, " cube root ")
    .replace(/‴/g, " triple prime")
    .replace(/″/g, " double prime")
    .replace(/′/g, " prime")
    .replace(/⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾/g, (_, e: string) => ` ${unsup(e)}th derivative `)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ˣᵗⁿ]+/g, (m) => power(unsup(m)))
    .replace(/[₀-₉ₙ]+/g, (m) => ` sub ${unsub(m)} `)
    .replace(/\^\(/g, " to the (")
    .replace(/\^/g, " to the ")
    .replace(/(\d)\s?(cm|ft|mi|m|L|mm)\/(s|min|h)\b/g, "$1 $2 per $3")
    .replace(/\b(cm|ft|mi|m|L|mm)\/(s|min|h)\b/g, "$1 per $2")
    .replace(/\barcsin\b/g, "arc sine")
    .replace(/\barccos\b/g, "arc cosine")
    .replace(/\barctan\b/g, "arc tangent")
    .replace(/\bsin\b/g, "sine")
    .replace(/\bcos\b/g, "cosine")
    .replace(/\btan\b/g, "tangent")
    .replace(/\bsec\b/g, "secant")
    .replace(/\bcsc\b/g, "cosecant")
    .replace(/\bcot\b/g, "cotangent")
    .replace(/\bln\b/g, "natural log")
    .replace(/\|([^|]+)\|/g, " the absolute value of $1 ")
    .replace(/\b([A-Za-df-z])\(/g, "$1 of (")
    .replace(/ prime\(/g, " prime of (")
    .replace(/π/g, " pi ")
    .replace(/θ/g, " theta ")
    .replace(/∞/g, " infinity ")
    .replace(/≈/g, " is about ")
    .replace(/≤/g, " is at most ")
    .replace(/≥/g, " is at least ")
    .replace(/ < /g, " is less than ")
    .replace(/ > /g, " is greater than ")
    .replace(/[·×]/g, " times ")
    .replace(/⟨/g, " the vector ")
    .replace(/→/g, " approaches ")
    .replace(/ − /g, " minus ")
    .replace(/−/g, " negative ")
    .replace(/\+/g, " plus ")
    .replace(/ = \?/g, " equals what")
    .replace(/=/g, " equals ")
    .replace(/\//g, " over ")
    .replace(/[…⟩()[\]{}]/g, " ")
    .replace(/\bd([xtuyr])\b/g, "d $1")
    .replace(/\s+([.,?!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

interface Spec {
  key: string;
  prompt: string;
  /** Math shown large as "math = ?" and read after the prompt. */
  math?: string;
  /** Equation tokens to show instead of `math`. */
  eq?: Token[];
  /** What Can says; defaults to the prompt and math in words. */
  say?: string;
  visual?: Visual;
  needsVisual?: boolean;
  hint: string;
  explain: string;
  unit?: string;
  prefix?: string;
}

/** Build a question from its words and its answer. */
function mk(s: Spec, a: Answer): Question {
  const equation: Token[] | undefined = s.eq ?? (s.math ? [s.math, "=", "?"] : undefined);
  const q: Question = {
    key: s.key,
    prompt: s.prompt,
    speech: s.say ?? talk(s.math ? `${s.prompt} ${s.math} = ?` : s.prompt),
    visual: s.visual ?? NONE,
    ...a,
    hint: s.hint,
    explain: s.explain,
  };
  if (equation) q.equation = equation;
  if (s.needsVisual) q.needsVisual = true;
  if (s.unit) q.unit = s.unit;
  if (s.prefix) q.prefix = s.prefix;
  return q;
}

/** A y-window that fits these values (and the x-axis) with room to spare. */
function fitY(fs: Fn[], x0: number, x1: number, pad = 1): [number, number] {
  const vals: number[] = [0];
  for (const f of fs) {
    for (let i = 0; i <= 60; i++) {
      const v = f(x0 + ((x1 - x0) * i) / 60);
      if (Number.isFinite(v)) vals.push(v);
    }
  }
  return [Math.floor(Math.min(...vals) - pad), Math.ceil(Math.max(...vals) + pad)];
}

/** Straight segments joining (x, y) corners: a piecewise-linear function, undefined outside its ends. */
function polyline(pts: [number, number][]): Fn {
  return (x) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      if (x >= x0 - 1e-9 && x <= x1 + 1e-9) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return NaN;
  };
}

/** Signed area under a piecewise-linear graph from its first corner to x = b. */
function polyArea(pts: [number, number][], b: number): number {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x0 >= b) break;
    const xe = Math.min(x1, b);
    const ye = y0 + ((y1 - y0) * (xe - x0)) / (x1 - x0);
    s += ((y0 + ye) / 2) * (xe - x0);
  }
  return clean(s);
}

/** Total (unsigned) area between a piecewise-linear graph and the axis. */
function polyAbsArea(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (y0 * y1 >= 0) s += (Math.abs(y0 + y1) / 2) * (x1 - x0);
    else {
      const xm = x0 + ((x1 - x0) * y0) / (y0 - y1);
      s += (Math.abs(y0) / 2) * (xm - x0) + (Math.abs(y1) / 2) * (x1 - xm);
    }
  }
  return clean(s);
}

/** Random corners for a piecewise-linear graph on [0, T] with whole-number heights. */
function corners(T: number, lo: number, hi: number): [number, number][] {
  const xs = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7].filter((v) => v < T)).slice(0, 2).sort((a, b) => a - b), T];
  return xs.map((x) => [x, rand(lo, hi)] as [number, number]);
}

const plot = (
  x: [number, number],
  y: [number, number],
  more: { curves?: { fn: Fn; colour?: Colour; label?: string; dashed?: boolean }[]; lines?: Seg[]; points?: Pt[]; shade?: { fn: Fn; fn2?: Fn; from: number; to: number; rects?: number } },
): Visual => ({ kind: "plot", x, y, ...more });

/* ================================================================ 1. Limits */

/** CALC.1.1 — one-sided limits, two-sided limits and function values from a graph with a hole or a jump. */
export function limitFromGraph(): Question {
  const a = rand(-2, 3);
  const jump = Math.random() < 0.5;
  const L1 = rand(-3, 4);
  let L2 = L1;
  while (jump && L2 === L1) L2 = rand(-3, 4);
  const m1 = pick([-1, -0.5, 0.5, 1, 1.5]);
  const shape = pick(["line", "bowl", "hill"] as const);
  const m2 = pick([-1, -0.5, 0.5, 1]);
  let fa: number | null;
  if (jump) fa = pick([L1, L2, L1, L2, null]);
  else fa = Math.random() < 0.35 ? null : pick([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5].filter((v) => v !== L1));
  const left: Fn = (x) => (x < a ? L1 + m1 * (x - a) : NaN);
  const right: Fn = (x) => (x > a ? (shape === "line" ? L2 + m2 * (x - a) : L2 + (shape === "bowl" ? 0.5 : -0.5) * (x - a) ** 2) : NaN);
  const points: Pt[] = [];
  if (fa !== L1) points.push({ x: a, y: L1, open: true });
  if (L2 !== L1 && fa !== L2) points.push({ x: a, y: L2, open: true });
  if (fa !== null) points.push({ x: a, y: fa });
  const ask = pick(["left", "right", "both", ...(fa !== null ? ["value"] : [])]);
  const visual = plot([a - 4, a + 4], [-6, 7], { curves: [{ fn: left, colour: "wave" }, { fn: right, colour: "wave" }], points });
  const shown = ask === "value" ? `f(${fmt(a)})` : `${lim(a, ask === "left" ? "⁻" : ask === "right" ? "⁺" : "")} f(x)`;
  const base = {
    key: `lg-${a}-${L1}-${L2}-${m1}-${shape}-${m2}-${fa}-${ask}`,
    prompt: pick(["Use the graph of f.", "Read it from the graph.", `Look closely near x = ${fmt(a)}.`]),
    math: shown,
    visual,
    needsVisual: true,
  };
  if (ask === "left" || ask === "right") {
    const L = ask === "left" ? L1 : L2;
    return mk(
      {
        ...base,
        hint: `Trace the curve toward x = ${fmt(a)} from the ${ask}. What height is it heading for? The dot at x = ${fmt(a)} itself doesn't matter.`,
        explain: `From the ${ask}, the curve heads to y = ${fmt(L)}, so ${shown} = ${fmt(L)}.`,
      },
      kp(L),
    );
  }
  if (ask === "value") {
    return mk(
      {
        ...base,
        hint: "f(a) is the filled-in dot, not where the curve is heading.",
        explain: `The filled dot is at (${fmt(a)}, ${fmt(fa!)}), so f(${fmt(a)}) = ${fmt(fa!)}.`,
      },
      kp(fa!),
    );
  }
  if (jump) {
    return mk(
      {
        ...base,
        hint: "Find the left-hand and right-hand limits. A limit exists only when they agree.",
        explain: `From the left the curve heads to ${fmt(L1)}; from the right, to ${fmt(L2)}. They differ, so the limit does not exist.`,
      },
      label("does not exist", [fmt(L1), fmt(L2), fa !== null && fa !== L1 && fa !== L2 ? fmt(fa) : ds((L1 + L2) / 2)]),
    );
  }
  return mk(
    {
      ...base,
      hint: "Look where the curve is heading from both sides. A hole or a stray dot doesn't change the limit.",
      explain: `Both sides head to ${fmt(L1)}, so the limit is ${fmt(L1)}${fa === null ? ", even though f is undefined there" : `, even though f(${fmt(a)}) = ${fmt(fa)}`}.`,
    },
    label(fmt(L1), ["does not exist", fa !== null ? fmt(fa) : "undefined", fmt(L1 + 1)], [fmt(L1 - 1), "0"]),
  );
}

/** CALC.1.1 — estimate a limit from a table of values closing in on x = a. */
export function limitFromTable(): Question {
  const a = rand(-3, 5);
  const L = rand(-6, 9);
  const split = Math.random() < 0.35;
  const R = split ? L + nz(-4, 4) : L;
  const c1 = nz(-5, 5);
  const c2 = split ? nz(-5, 5) : c1;
  const mid = pick(["undefined", "error", fmt(split ? pick([L, R]) : L + nz(-3, 3))]);
  const rows: (string | number)[][] = [
    ...[-0.1, -0.01, -0.001].map((h) => [ds(a + h), ds(L + c1 * h)]),
    [fmt(a), mid],
    ...[0.001, 0.01, 0.1].map((h) => [ds(a + h), ds(R + c2 * h)]),
  ];
  const ask = split ? pick(["left", "right", "both"]) : "both";
  const shown = `${lim(a, ask === "left" ? "⁻" : ask === "right" ? "⁺" : "")} f(x)`;
  const base = {
    key: `lt-${a}-${L}-${R}-${c1}-${c2}-${mid}-${ask}`,
    prompt: pick(["Use the table.", "Estimate from the table.", "What do the values close in on?"]),
    math: shown,
    visual: { kind: "table", header: ["x", "f(x)"], rows } as Visual,
    needsVisual: true,
    hint: "Watch f(x) as x gets closer and closer to the middle value. Ignore the middle row itself.",
  };
  if (ask === "left") return mk({ ...base, explain: `From below, f(x) closes in on ${fmt(L)}.` }, kp(L));
  if (ask === "right") return mk({ ...base, explain: `From above, f(x) closes in on ${fmt(R)}.` }, kp(R));
  if (split) {
    return mk(
      { ...base, explain: `From the left f(x) → ${fmt(L)}, from the right f(x) → ${fmt(R)}. They differ, so the limit does not exist.` },
      label("does not exist", [fmt(L), fmt(R), ds((L + R) / 2)]),
    );
  }
  return mk({ ...base, explain: `From both sides f(x) closes in on ${fmt(L)}. The value at x = ${fmt(a)} itself doesn't matter.` }, kp(L));
}

/** CALC.1.2 — limit laws and algebra: substitution, factor and cancel, conjugates, complex fractions. */
export function limitAlgebra(kinds = [0, 1, 2, 3, 4, 5, 6]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(-3, 3);
    const P: Poly = [[nz(-3, 3), 2], [rand(-5, 5), 1], [rand(-6, 6), 0]];
    const v = pval(P, a);
    return mk(
      {
        key: `la-sub-${a}-${P.join("|")}`,
        prompt: pick(["Find the limit.", "Evaluate the limit."]),
        math: `${lim(a)} (${poly(P)})`,
        hint: "Polynomials are continuous everywhere, so you can just plug in.",
        explain: `Plug in x = ${fmt(a)}: ${poly(P)} becomes ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const r = nz(-4, 5);
    let s = rand(-5, 5);
    while (s === r) s = rand(-5, 5);
    const top = poly([[1, 2], [-(r + s), 1], [r * s, 0]]);
    return mk(
      {
        key: `la-fac-${r}-${s}`,
        prompt: "Plugging in gives 0/0. Find the limit.",
        math: `${lim(r)} (${top})/${fac(r)}`,
        hint: `Factor the top. One factor is ${fac(r)}, which cancels.`,
        explain: `${top} = ${fac(r)}${fac(s)}. Cancel ${fac(r)} to get ${lin(1, -s)}, then plug in: ${fmt(r)} − ${s < 0 ? `(${fmt(s)})` : s} = ${fmt(r - s)}.`,
      },
      kp(r - s),
    );
  }
  if (kind === 2) {
    const r = nz(-3, 3);
    return mk(
      {
        key: `la-cube-${r}`,
        prompt: "Factor, cancel, then plug in.",
        math: `${lim(r)} (x³ ${r ** 3 < 0 ? "+" : "−"} ${Math.abs(r ** 3)})/${fac(r)}`,
        hint: "a³ − b³ = (a − b)(a² + ab + b²).",
        explain: `x³ ${r ** 3 < 0 ? "+" : "−"} ${Math.abs(r ** 3)} = ${fac(r)}(${poly([[1, 2], [r, 1], [r * r, 0]])}). Cancel and plug in x = ${fmt(r)}: ${r * r} + ${r * r} + ${r * r} = ${3 * r * r}.`,
      },
      kp(3 * r * r),
    );
  }
  if (kind === 3) {
    const c = rand(-3, 4);
    const A = rand(-6, 6);
    const B = nz(-5, 5);
    const form = rand(0, 2);
    const k = nz(-4, 4);
    const m = nz(-4, 4);
    const expr = form === 0 ? `[${terms([[k, "f(x)"], [m, "g(x)"]], "")}]` : form === 1 ? "f(x)·g(x)" : "[f(x)]² − g(x)";
    const v = form === 0 ? k * A + m * B : form === 1 ? A * B : A * A - B;
    return mk(
      {
        key: `la-law-${c}-${A}-${B}-${form}-${k}-${m}`,
        prompt: `As x → ${fmt(c)}: f(x) → ${fmt(A)} and g(x) → ${fmt(B)}.`,
        math: `${lim(c)} ${expr}`,
        hint: "Limits pass through sums, constant multiples, products and powers. Swap in each limit.",
        explain: `Replace f(x) with ${fmt(A)} and g(x) with ${fmt(B)}: the limit is ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 4) {
    const n = rand(1, 9);
    const atZero = Math.random() < 0.5;
    const math = atZero ? `${lim(0)} (√(x + ${n * n}) − ${n})/x` : `${lim(n * n)} (√x − ${n})/(x − ${n * n})`;
    return mk(
      {
        key: `la-root-${n}-${atZero}`,
        prompt: "It's 0/0. Find the limit.",
        math,
        hint: "Multiply the top and bottom by the conjugate (the root plus, not minus).",
        explain: `After multiplying by the conjugate the zero factor cancels, leaving 1/(√… + ${n}). Plug in: 1/(${n} + ${n}) = ${fr(1, 2 * n)}.`,
      },
      label(fr(1, 2 * n), [fr(1, n), "0", "does not exist"], [fr(2, n), fr(1, 4 * n), "1"]),
    );
  }
  if (kind === 6) {
    const STEP = {
      plug: "just plug in",
      factor: "factor and cancel",
      conj: "multiply by the conjugate",
      combine: "combine the fractions",
    };
    const type = pick(["plug", "factor", "conj", "combine"] as const);
    const n = rand(1, 7);
    const r = nz(-4, 4);
    const math =
      type === "plug"
        ? `${lim(r)} (x² ${n % 2 ? "+" : "−"} ${n})/(x ${r > 0 ? "+" : "−"} ${Math.abs(r) + n})`
        : type === "factor"
          ? `${lim(r)} (x² − ${r * r})/${fac(r)}`
          : type === "conj"
            ? `${lim(0)} (√(x + ${n * n}) − ${n})/x`
            : `${lim(0)} [1/(x + ${n}) − 1/${n}]/x`;
    return mk(
      {
        key: `la-step-${type}-${n}-${r}`,
        prompt: "What's the best first step?",
        eq: [math],
        say: talk(`${math}. What's the best first step?`),
        hint: "Try plugging in first. If you get 0/0, look at the shape: a polynomial factor, a square root, or stacked fractions?",
        explain:
          type === "plug"
            ? "Plugging in doesn't give 0/0 (the bottom isn't 0), so substitution works."
            : type === "factor"
              ? `It's 0/0 and the top is a difference of squares, so factor and cancel ${fac(r)}.`
              : type === "conj"
                ? "It's 0/0 with a square root, so multiply by the conjugate."
                : "It's 0/0 with fractions inside a fraction, so combine them over a common denominator.",
      },
      label(STEP[type], Object.values(STEP).filter((v) => v !== STEP[type])),
    );
  }
  const a = rand(1, 8);
  return mk(
    {
      key: `la-cfrac-${a}`,
      prompt: "Combine the fractions, then find the limit.",
      math: `${lim(0)} [1/(x + ${a}) − 1/${a}]/x`,
      hint: `Use the common denominator ${a}(x + ${a}). The x on top will cancel the x underneath.`,
      explain: `1/(x + ${a}) − 1/${a} = −x/(${a}(x + ${a})). Divide by x: −1/(${a}(x + ${a})) → −1/${a * a} as x → 0.`,
    },
    label(fr(-1, a * a), [fr(1, a * a), fr(-1, a), "0"], ["does not exist", fr(-1, 2 * a)]),
  );
}

/** CALC.1.3 — the special trig limits and the squeeze theorem. */
export function trigLimits(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const k = rand(2, 9);
    const f = pick(["sin", "tan"]);
    return mk(
      {
        key: `tl-k-${f}-${k}`,
        prompt: pick(["Find the limit.", "Use sin(θ)/θ → 1."]),
        math: `${lim(0)} ${f}(${k}x)/x`,
        hint: `Multiply top and bottom by ${k} to make ${f}(${k}x)/(${k}x).`,
        explain: `${f}(${k}x)/x = ${k} · ${f}(${k}x)/(${k}x) → ${k} · 1 = ${k}.`,
      },
      kpos(k),
    );
  }
  if (kind === 1) {
    const a = rand(1, 9);
    let b = rand(2, 9);
    while (b === a) b = rand(2, 9);
    const form = rand(0, 2);
    const ax = a === 1 ? "x" : `${a}x`;
    const math = form === 0 ? `sin(${ax})/(${b}x)` : form === 1 ? `sin(${ax})/sin(${b}x)` : `tan(${ax})/sin(${b}x)`;
    return mk(
      {
        key: `tl-ab-${a}-${b}-${form}`,
        prompt: "Find the limit.",
        math: `${lim(0)} ${math}`,
        hint: "Near 0, sin(kx) and tan(kx) behave like kx.",
        explain: `Near 0, ${form === 2 ? "tan" : "sin"}(${ax}) ≈ ${ax} and ${form === 0 ? `${b}x` : `sin(${b}x) ≈ ${b}x`}. The ratio → ${fr(a, b)}.`,
      },
      label(fr(a, b), [fr(b, a), "1", "0"], ["does not exist", fr(a * a, b)]),
    );
  }
  if (kind === 2) {
    const k = rand(1, 9);
    const form = rand(0, 1);
    const kx = k === 1 ? "x" : `${k}x`;
    return mk(
      {
        key: `tl-cos-${k}-${form}`,
        prompt: "Find the limit.",
        math: form === 0 ? `${lim(0)} (1 − cos ${kx})/x` : `${lim(0)} (cos ${kx} − 1)/(${k === 1 ? "" : k}x)`,
        hint: "Remember the partner of sin x / x → 1: (1 − cos x)/x → 0.",
        explain: `(1 − cos ${kx})/(${kx}) → 0, so this limit is 0.`,
      },
      label("0", ["1", fmt(k), "does not exist"], [fr(1, 2), fmt(-k)]),
    );
  }
  if (kind === 3) {
    const a = rand(-3, 3);
    const L = rand(-3, 4);
    const w = pick([2, 3, 4]);
    const g: Fn = (x) => L - (x - a) ** 2;
    const h: Fn = (x) => L + (x - a) ** 2;
    const f: Fn = (x) => L + (x - a) ** 2 * Math.cos(w * (x - a));
    return mk(
      {
        key: `tl-sq-${a}-${L}-${w}`,
        prompt: "g(x) ≤ f(x) ≤ h(x) near the pinch. Find the limit.",
        math: `${lim(a)} f(x)`,
        visual: plot([a - 3, a + 3], [L - 5, L + 5], {
          curves: [
            { fn: g, colour: "leaf", label: "g" },
            { fn: f, colour: "wave", label: "f" },
            { fn: h, colour: "berry", label: "h" },
          ],
        }),
        needsVisual: true,
        hint: "Where do g and h meet? f is trapped between them.",
        explain: `g and h both approach ${fmt(L)} as x → ${fmt(a)}, and f is squeezed between them, so f(x) → ${fmt(L)} too.`,
      },
      kp(L),
    );
  }
  const n = rand(1, 3);
  const k = rand(1, 5);
  const t = pick(["sin", "cos"]);
  const askWhy = Math.random() < 0.5;
  const math = `${lim(0)} ${xp(n)} ${t}(${k === 1 ? "" : k}/x)`.replace("(/x)", "(1/x)");
  if (askWhy) {
    return mk(
      {
        key: `tl-why-${n}-${k}-${t}`,
        prompt: `Which idea shows this limit is 0?`,
        eq: [math, "=", 0],
        hint: `${t}(…) stays between −1 and 1, so the whole thing is trapped between −${xp(n)} and ${xp(n)}.`,
        explain: `−|${xp(n)}| ≤ ${xp(n)} ${t}(${k}/x) ≤ |${xp(n)}|, and both sides → 0. That's the squeeze theorem.`,
        say: talk(`Which idea shows that ${math} = 0?`),
      },
      label("the squeeze theorem", ["the intermediate value theorem", "direct substitution", "the mean value theorem"]),
    );
  }
  return mk(
    {
      key: `tl-osc-${n}-${k}-${t}`,
      prompt: `${t}(${k}/x) wiggles forever near 0. Find the limit anyway.`,
      math,
      hint: `${t} is always between −1 and 1. What happens to ${xp(n)}?`,
      explain: `−|${xp(n)}| ≤ ${xp(n)} ${t}(${k}/x) ≤ |${xp(n)}|, and both bounds → 0, so the limit is 0 by the squeeze theorem.`,
    },
    label("0", ["does not exist", "1", fmt(k)], ["∞"]),
  );
}

const DISC = {
  removable: "removable (a hole)",
  jump: "jump",
  infinite: "infinite (an asymptote)",
  continuous: "none: f is continuous",
};

/** CALC.1.4 — continuity and the types of discontinuity. */
export function continuity(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(-2, 2);
    const type = pick(["removable", "jump", "infinite", "continuous"] as const);
    const b = rand(-2, 3);
    const m = pick([-1, -0.5, 0.5, 1]);
    const c = pick([0, 0.25, -0.25]);
    const base: Fn = (x) => b + m * (x - a) + c * (x - a) ** 2;
    let curves: { fn: Fn; colour?: Colour }[] = [{ fn: base, colour: "grape" }];
    let points: Pt[] = [];
    let lines: Seg[] = [];
    let extra = 0;
    if (type === "removable") {
      extra = pick([0, 1, 2, -2]);
      points = [{ x: a, y: b, open: true }, ...(extra ? [{ x: a, y: b + extra }] : [])];
    } else if (type === "jump") {
      extra = pick([-3, -2, 2, 3]);
      curves = [
        { fn: (x) => (x <= a ? base(x) : NaN), colour: "grape" },
        { fn: (x) => (x > a ? base(x) + extra : NaN), colour: "grape" },
      ];
      points = [{ x: a, y: b }, { x: a, y: b + extra, open: true }];
    } else if (type === "infinite") {
      extra = pick([1, 2, -1, -2]);
      const sq = Math.random() < 0.5;
      curves = [{ fn: (x) => (Math.abs(x - a) < 0.02 ? NaN : extra / (sq ? (x - a) ** 2 : x - a)), colour: "grape" }];
      lines = [{ from: [a, -8], to: [a, 8], dashed: true, colour: "rose" }];
      extra *= sq ? 10 : 1;
    } else {
      points = [{ x: a, y: b }];
    }
    return mk(
      {
        key: `ct-g-${type}-${a}-${b}-${m}-${c}-${extra}`,
        prompt: `What kind of discontinuity does f have at x = ${fmt(a)}?`,
        visual: plot([a - 4, a + 4], [-6, 6], { curves, points, lines }),
        needsVisual: true,
        hint: "Hole: the curve is fine but one point is missing or moved. Jump: the two sides don't meet. Infinite: it shoots off.",
        explain:
          type === "removable"
            ? `Both sides head to ${fmt(b)}, but f(${fmt(a)}) isn't ${fmt(b)}: a hole you could patch. That's removable.`
            : type === "jump"
              ? "The left and right sides head to different heights: a jump discontinuity."
              : type === "infinite"
                ? "The graph shoots off toward ±∞ beside a vertical asymptote: an infinite discontinuity."
                : `The curve passes right through x = ${fmt(a)} with no break, so f is continuous there.`,
      },
      label(DISC[type], Object.values(DISC).filter((d) => d !== DISC[type])),
    );
  }
  if (kind === 1) {
    const a = nz(-3, 3);
    const k = rand(-4, 4);
    const c = rand(-5, 5);
    const b = a * a + c - k * a;
    return mk(
      {
        key: `ct-k-${a}-${k}-${c}`,
        prompt: `Which k makes f continuous at x = ${fmt(a)}?`,
        eq: ["k", "=", "?"],
        say: talk(`f of x is k x ${b < 0 ? "−" : "+"} ${Math.abs(b)} for x < ${fmt(a)}, and x² ${c < 0 ? "−" : "+"} ${Math.abs(c)} for x ≥ ${fmt(a)}. Which k makes f continuous at x = ${fmt(a)}?`),
        visual: { kind: "table", header: ["f(x)", "when"], rows: [[`kx ${b < 0 ? "−" : "+"} ${Math.abs(b)}`.replace(" + 0", "").replace(" − 0", ""), `x < ${fmt(a)}`], [poly([[1, 2], [c, 0]]), `x ≥ ${fmt(a)}`]] },
        needsVisual: true,
        hint: `The two pieces must meet at x = ${fmt(a)}. Set them equal there and solve for k.`,
        explain: `Right piece at ${fmt(a)}: ${fmt(a * a + c)}. Left piece: ${coef(a)}k ${b < 0 ? "−" : "+"} ${Math.abs(b)}. Solve ${coef(a)}k ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${fmt(a * a + c)}: k = ${fmt(k)}.`,
      },
      kp(k),
    );
  }
  if (kind === 2) {
    const r = nz(-4, 4);
    let s = rand(-5, 5);
    while (s === r) s = rand(-5, 5);
    const top = poly([[1, 2], [-(r + s), 1], [r * s, 0]]);
    return mk(
      {
        key: `ct-patch-${r}-${s}`,
        prompt: `f(x) = (${top})/${fac(r)} for x ≠ ${fmt(r)}. Patch the hole:`,
        math: `f(${fmt(r)})`,
        hint: "The patch value is the limit. Factor and cancel first.",
        explain: `(${top})/${fac(r)} = ${lin(1, -s)} for x ≠ ${fmt(r)}, which → ${fmt(r - s)}. Defining f(${fmt(r)}) = ${fmt(r - s)} removes the hole.`,
      },
      kp(r - s),
    );
  }
  const a = rand(-3, 5);
  const v = rand(-4, 6);
  const type = pick(["ok", "moved", "undef", "split"] as const);
  const L1 = type === "split" ? v + nz(-3, 3) : type === "moved" ? v + nz(-3, 3) : v;
  const L2 = type === "split" ? L1 + nz(-2, 2) : L1;
  const fa = type === "undef" ? "undefined" : fmt(v);
  const right = {
    ok: "Yes",
    moved: `No: the limit isn't f(${fmt(a)})`,
    undef: `No: f(${fmt(a)}) is undefined`,
    split: "No: the limit doesn't exist",
  };
  return mk(
    {
      key: `ct-cond-${a}-${v}-${type}-${L1}-${L2}`,
      prompt: `Is f continuous at x = ${fmt(a)}?`,
      visual: {
        kind: "table",
        header: ["what", "value"],
        rows: [
          [`f(${fmt(a)})`, fa],
          [`${lim(a, "⁻")} f(x)`, fmt(L1)],
          [`${lim(a, "⁺")} f(x)`, fmt(L2)],
        ],
      },
      needsVisual: true,
      hint: "Continuous means three things: f(a) exists, the limit exists, and they're equal.",
      explain:
        type === "ok"
          ? `f(${fmt(a)}) = ${fmt(v)} and both one-sided limits are ${fmt(v)}, so f is continuous there.`
          : type === "moved"
            ? `The limit is ${fmt(L1)} but f(${fmt(a)}) = ${fmt(v)}. They must match, so f isn't continuous.`
            : type === "undef"
              ? "f has no value there, so it can't be continuous."
              : `The one-sided limits (${fmt(L1)} and ${fmt(L2)}) differ, so the limit doesn't exist.`,
    },
    label(right[type], Object.values(right).filter((r) => r !== right[type])),
  );
}

/** CALC.1.5 — limits at infinity, infinite limits, horizontal and vertical asymptotes. */
export function limitsAtInfinity(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const dn = rand(1, 3);
    const dd = rand(1, 3);
    const p = nz(-6, 6);
    const q = pick([1, 2, 3, 4, 5, -2]);
    const toNeg = Math.random() < 0.3;
    const top = poly([[p, dn], [rand(-5, 5), dn - 1]]);
    const bot = poly([[q, dd], [nz(-5, 5), dd - 1]]);
    let correct: string;
    if (dn < dd) correct = "0";
    else if (dn === dd) correct = fr(p, q);
    else {
      const sign = Math.sign(p / q) * (toNeg && (dn - dd) % 2 === 1 ? -1 : 1);
      correct = sign > 0 ? "∞" : "−∞";
    }
    return mk(
      {
        key: `li-rat-${dn}-${dd}-${p}-${q}-${top}-${bot}-${toNeg}`,
        prompt: "Compare the highest powers. Find the limit.",
        math: `${lim(toNeg ? "−∞" : "∞")} (${top})/(${bot})`,
        hint: "Only the leading terms matter far out. Divide every term by the highest power in the denominator.",
        explain:
          dn < dd
            ? "The bottom's power is bigger, so the fraction shrinks to 0."
            : dn === dd
              ? `Same highest power, so the limit is the ratio of leading coefficients: ${fmt(p)}/${fmt(q)} = ${fr(p, q)}.`
              : `The top's power is bigger, so it grows without bound. Check the signs of the leading terms: the limit is ${correct}.`,
      },
      label(correct, ["0", fr(p, q), "∞", "−∞", fr(q, p)], ["does not exist"]),
    );
  }
  if (kind === 1) {
    const q = pick([1, 2, 3, 4]);
    const m = nz(-5, 5);
    const p = q * m;
    const d = rand(1, 3);
    const top = poly([[p, d], [rand(-6, 6), 0]]);
    const bot = poly([[q, d], [nz(-4, 4), d - 1], [rand(-3, 3), 0]]);
    return mk(
      {
        key: `li-ha-${p}-${q}-${d}-${top}-${bot}`,
        prompt: `f(x) = (${top})/(${bot}). Horizontal asymptote:`,
        eq: ["y", "=", "?"],
        hint: "Find the limit as x → ∞. With equal highest powers, it's the ratio of leading coefficients.",
        explain: `As x → ±∞, f(x) → ${fmt(p)}/${fmt(q)} = ${fmt(m)}, so y = ${fmt(m)}.`,
      },
      kp(m),
    );
  }
  if (kind === 2) {
    const r = nz(-4, 4);
    let s = rand(-5, 5);
    while (s === r) s = rand(-5, 5);
    const bot = poly([[1, 2], [-(r + s), 1], [r * s, 0]]);
    return mk(
      {
        key: `li-va-${r}-${s}`,
        prompt: `f(x) = ${fac(r)}/(${bot}). Vertical asymptote:`,
        eq: ["x", "=", "?"],
        hint: "Factor the bottom. A factor that cancels with the top makes a hole, not an asymptote.",
        explain: `${bot} = ${fac(r)}${fac(s)}. The ${fac(r)} cancels (a hole at x = ${fmt(r)}); ${fac(s)} stays, so the asymptote is x = ${fmt(s)}.`,
      },
      kp(s),
    );
  }
  const a = rand(-3, 4);
  const k = pick([1, 2, 3, -1, -2, -3]);
  const n = pick([1, 2]);
  const side = pick(["⁻", "⁺"]);
  const sign = n === 2 ? Math.sign(k) : Math.sign(k) * (side === "⁺" ? 1 : -1);
  const correct = sign > 0 ? "∞" : "−∞";
  const f: Fn = (x) => (Math.abs(x - a) < 0.02 ? NaN : k / (x - a) ** n);
  const den = n === 1 ? fac(a) : `${fac(a)}²`;
  const showGraph = Math.random() < 0.4;
  return mk(
    {
      key: `li-inf-${a}-${k}-${n}-${side}-${showGraph}`,
      prompt: pick(["Find the one-sided limit.", "Which way does it blow up?"]),
      math: `${lim(a, side)} ${fmt(k)}/${den}`,
      visual: showGraph ? plot([a - 4, a + 4], [-6, 6], { curves: [{ fn: f, colour: "berry" }], lines: [{ from: [a, -7], to: [a, 7], dashed: true }] }) : NONE,
      hint: `Try an x just ${side === "⁺" ? "above" : "below"} ${fmt(a)}. Is the bottom a tiny positive or tiny negative number?`,
      explain: `Just ${side === "⁺" ? "right" : "left"} of ${fmt(a)}, the bottom is tiny and ${n === 2 || side === "⁺" ? "positive" : "negative"}, and the top is ${fmt(k)}, so the fraction → ${correct}.`,
    },
    label(correct, [correct === "∞" ? "−∞" : "∞", "0", "does not exist"]),
  );
}

/** CALC.1.6 — the intermediate value theorem. */
export function ivt(): Question {
  const kind = rand(0, 3);
  const x0 = rand(-2, 2);
  const xs = [0, 1, 2, 3, 4].map((i) => x0 + i);
  if (kind === 0) {
    const j = rand(0, 3);
    const s = pick([1, -1]);
    const ys = xs.map((_, i) => (i <= j ? s : -s) * rand(1, 9));
    const iv = (i: number) => `(${fmt(xs[i])}, ${fmt(xs[i + 1])})`;
    return mk(
      {
        key: `ivt-int-${x0}-${ys.join("_")}`,
        prompt: "f is continuous. Which interval must contain a zero of f?",
        visual: { kind: "table", header: ["x", ...xs.map(fmt)], rows: [["f(x)", ...ys.map(fmt)]] },
        needsVisual: true,
        hint: "Look for where f(x) changes sign. A continuous f must cross 0 there.",
        explain: `f(${fmt(xs[j])}) = ${fmt(ys[j])} and f(${fmt(xs[j + 1])}) = ${fmt(ys[j + 1])} have opposite signs, so by the IVT f = 0 somewhere in ${iv(j)}.`,
      },
      label(iv(j), [0, 1, 2, 3].filter((i) => i !== j).map(iv)),
    );
  }
  if (kind === 1) {
    const ys = xs.map(() => nz(-9, 9));
    const changes = ys.slice(1).filter((y, i) => Math.sign(y) !== Math.sign(ys[i])).length;
    return mk(
      {
        key: `ivt-count-${x0}-${ys.join("_")}`,
        prompt: `f is continuous. At least how many zeros must f have on [${fmt(xs[0])}, ${fmt(xs[4])}]?`,
        visual: { kind: "table", header: ["x", ...xs.map(fmt)], rows: [["f(x)", ...ys.map(fmt)]] },
        needsVisual: true,
        hint: "Count the sign changes from one column to the next. Each one forces a zero.",
        explain: `f changes sign ${changes} time${changes === 1 ? "" : "s"}, so the IVT guarantees at least ${changes} zero${changes === 1 ? "" : "s"}.`,
      },
      kpos(changes),
    );
  }
  if (kind === 2) {
    const a = x0;
    const b = a + rand(2, 5);
    const A = rand(-8, 3);
    const B = A + rand(3, 12);
    const flip = Math.random() < 0.5;
    const [FA, FB] = flip ? [B, A] : [A, B];
    const inside = Math.random() < 0.6;
    const k = inside ? rand(A + 1, B - 1) : pick([A - rand(1, 4), B + rand(1, 4)]);
    return mk(
      {
        key: `ivt-k-${a}-${b}-${FA}-${FB}-${k}`,
        prompt: `f is continuous, f(${fmt(a)}) = ${fmt(FA)}, f(${fmt(b)}) = ${fmt(FB)}. Must f(c) = ${fmt(k)} for some c in (${fmt(a)}, ${fmt(b)})?`,
        hint: "The IVT promises every value between f(a) and f(b), and nothing more.",
        explain: inside
          ? `${fmt(k)} is between ${fmt(FA)} and ${fmt(FB)}, so the IVT guarantees it.`
          : `${fmt(k)} isn't between ${fmt(FA)} and ${fmt(FB)}. f might still reach it, but nothing guarantees it.`,
      },
      label(inside ? "Yes, by the IVT" : "Not guaranteed", [inside ? "Not guaranteed" : "Yes, by the IVT", "No, that's impossible", "Yes, by the MVT"]),
    );
  }
  const a = rand(-3, 0);
  const b = a + rand(3, 5);
  const c = rand(a + 1, b - 1);
  const type = pick(["pole", "cubic", "square"] as const);
  const f = type === "pole" ? `1/${fac(c)}` : type === "cubic" ? poly([[1, 3], [-(c ** 3), 0]]) : `x² + ${rand(1, 5)}`;
  const right = {
    pole: "No: f isn't continuous on the interval",
    cubic: "Yes, by the IVT",
    square: "No: f(a) and f(b) have the same sign",
  };
  return mk(
    {
      key: `ivt-hyp-${a}-${b}-${c}-${type}-${f}`,
      prompt: `Does the IVT guarantee f(x) = ${f} has a zero in (${fmt(a)}, ${fmt(b)})?`,
      hint: "Check both things the IVT needs: continuity on [a, b] and f(a), f(b) on opposite sides of 0.",
      explain:
        type === "pole"
          ? `f(${fmt(a)}) < 0 < f(${fmt(b)}), but f blows up at x = ${fmt(c)}, so it isn't continuous and the IVT doesn't apply.`
          : type === "cubic"
            ? `f is a polynomial (continuous), f(${fmt(a)}) < 0 and f(${fmt(b)}) > 0, so the IVT guarantees a zero.`
            : "f(x) is always positive, so f(a) and f(b) have the same sign. No zero is guaranteed (and there isn't one).",
    },
    label(right[type], [...Object.values(right).filter((r) => r !== right[type]), "Yes, by the MVT"]),
  );
}

/* =================================================== 2. What is a derivative? */

const CONTEXT_TABLES = [
  { what: "T", name: "temperature", t: "min", unit: "°C per min", lo: 10, step: [1, 2, 3, -1, -2] },
  { what: "W", name: "water in a tank (L)", t: "h", unit: "L per hour", lo: 40, step: [5, 10, -5, 4, -4] },
  { what: "h", name: "height of a drone (m)", t: "s", unit: "m per s", lo: 20, step: [2, 3, 4, -3, -2] },
];

/** CALC.2.1 — average rate of change from a formula, a graph or a table. */
export function averageRate(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const P: Poly = [[nz(-3, 3), 2], [rand(-5, 5), 1], [rand(-5, 5), 0]];
    const a = rand(-3, 2);
    const b = a + rand(1, 4);
    const fa = pval(P, a);
    const fb = pval(P, b);
    const v = (fb - fa) / (b - a);
    return mk(
      {
        key: `ar-f-${P.join("|")}-${a}-${b}`,
        prompt: `f(x) = ${poly(P)}. Average rate of change on [${fmt(a)}, ${fmt(b)}]?`,
        hint: "Average rate = (f(b) − f(a)) / (b − a): the change in output over the change in input.",
        explain: `f(${fmt(b)}) = ${fmt(fb)}, f(${fmt(a)}) = ${fmt(fa)}. (${fmt(fb)} − ${fa < 0 ? `(${fmt(fa)})` : fa}) / ${b - a} = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const p = pick([1, -1, 0.5, -0.5]);
    const a = rand(-3, 1);
    const b = a + pick([2, 4]);
    const q = rand(-2, 2);
    const r = rand(-2, 3);
    const f: Fn = (x) => p * x * x + q * x + r;
    const fa = clean(f(a));
    const fb = clean(f(b));
    const v = (fb - fa) / (b - a);
    return mk(
      {
        key: `ar-g-${p}-${q}-${r}-${a}-${b}`,
        prompt: "Find the slope of the dashed secant line: the average rate of change.",
        visual: plot([a - 2, b + 2], fitY([f], a - 1, b + 1), {
          curves: [{ fn: f, colour: "wave", label: "f" }],
          lines: [{ from: [a - 1, fa - v], to: [b + 1, fb + v], dashed: true, colour: "berry" }],
          points: [{ x: a, y: fa, label: `(${fmt(a)}, ${ds(fa)})` }, { x: b, y: fb, label: `(${fmt(b)}, ${ds(fb)})` }],
        }),
        needsVisual: true,
        hint: "Rise over run between the two marked points.",
        explain: `(${ds(fb)} − ${fa < 0 ? `(${ds(fa)})` : ds(fa)}) / (${fmt(b)} − ${a < 0 ? `(${fmt(a)})` : a}) = ${ds(v)}.`,
      },
      kp(v),
    );
  }
  const ctx = pick(CONTEXT_TABLES);
  const ts = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3).sort((x, y) => x - y)];
  const rates = ts.slice(1).map(() => pick(ctx.step));
  const ys = [ctx.lo + rand(0, 10)];
  rates.forEach((r, i) => ys.push(ys[i] + r * (ts[i + 1] - ts[i])));
  const i = rand(0, 2);
  const j = rand(i + 1, 3);
  const v = (ys[j] - ys[i]) / (ts[j] - ts[i]);
  return mk(
    {
      key: `ar-t-${ctx.what}-${ts.join("_")}-${ys.join("_")}-${i}-${j}`,
      prompt: `${ctx.what}(t) is the ${ctx.name}. Average rate from t = ${ts[i]} to t = ${ts[j]} ${ctx.t}?`,
      visual: { kind: "table", header: [`t (${ctx.t})`, ...ts.map(String)], rows: [[`${ctx.what}(t)`, ...ys]] },
      needsVisual: true,
      hint: "Change in the quantity divided by change in time.",
      explain: `(${fmt(ys[j])} − ${ys[i] < 0 ? `(${fmt(ys[i])})` : ys[i]}) / (${ts[j]} − ${ts[i]}) = ${ds(v)} ${ctx.unit}.`,
      unit: ctx.unit,
    },
    kp(v),
  );
}

/** CALC.2.1, CALC.2.2 — secant slopes closing in on the tangent slope. */
export function secantToTangent(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const k = pick([1, 2, 3, -1, -2]);
    const a = nz(-4, 5);
    const hs = [1, 0.1, 0.01, 0.001];
    return mk(
      {
        key: `st-tab-${k}-${a}`,
        prompt: `Secant slopes of f(x) = ${poly([[k, 2]])} from x = ${fmt(a)} to x = ${fmt(a)} + h. What do they approach?`,
        visual: { kind: "table", header: ["h", "secant slope"], rows: hs.map((h) => [ds(h), ds(k * (2 * a + h))]) },
        needsVisual: true,
        hint: "As h shrinks to 0, which number are the slopes settling on?",
        explain: `The slopes head to ${fmt(2 * k * a)}. That limit is the tangent slope f′(${fmt(a)}).`,
      },
      kp(2 * k * a),
    );
  }
  if (kind === 1) {
    const t = [rand(0, 3) * 2];
    t.push(t[0] + 2, t[0] + 4);
    const slope = nz(-6, 6);
    const y0 = rand(10, 40);
    const ys = [y0, y0 + slope * 2 + rand(-3, 3), y0 + slope * 4];
    return mk(
      {
        key: `st-sym-${t[0]}-${ys.join("_")}`,
        prompt: `Estimate f′(${t[1]}) from the table.`,
        math: `f′(${t[1]})`,
        eq: [`f′(${t[1]})`, "≈", "?"],
        say: talk(`Estimate f′(${t[1]}) from the table.`),
        visual: { kind: "table", header: ["x", ...t.map(String)], rows: [["f(x)", ...ys]] },
        needsVisual: true,
        hint: `Use the points on either side: (f(${t[2]}) − f(${t[0]})) / (${t[2]} − ${t[0]}).`,
        explain: `(${fmt(ys[2])} − ${ys[0] < 0 ? `(${fmt(ys[0])})` : ys[0]}) / ${t[2] - t[0]} = ${ds(slope)}.`,
      },
      kp(slope),
    );
  }
  const a = rand(-2, 2);
  return mk(
    {
      key: `st-what-${a}-${rand(0, 9)}`,
      prompt: `The instantaneous rate of change of f at x = ${fmt(a)} is…`,
      hint: "Instantaneous means the limit of average rates over shorter and shorter intervals.",
      explain: "Shrinking the interval turns secant slopes into the tangent slope, f′(a).",
    },
    label(`f′(${fmt(a)}): the slope of the tangent line at x = ${fmt(a)}`, [
      `f(${fmt(a)}): the height of the graph at x = ${fmt(a)}`,
      `(f(${fmt(a)}) − f(0))/${fmt(a)}: a secant slope`.replace(/\/0/, "/h"),
      `the area under f up to x = ${fmt(a)}`,
    ]),
  );
}

/** CALC.2.2 — the derivative as a limit of difference quotients. */
export function limitDefinition(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const n = rand(2, 5);
    const a = rand(1, 5);
    const shown = `${lim(0, "", "h")} [(${a} + h)${sup(n)} − ${a ** n}]/h`;
    return mk(
      {
        key: `ld-rec-${n}-${a}`,
        prompt: "This limit is f′(a) for which f and a?",
        eq: [shown],
        say: talk(`${shown}. This limit is f prime of a for which f and a?`),
        hint: "Match it to [f(a + h) − f(a)]/h. What's being done to a + h?",
        explain: `[f(a + h) − f(a)]/h with f(x) = x${sup(n)} and a = ${a}, since ${a}${sup(n)} = ${a ** n}.`,
      },
      label(`f(x) = x${sup(n)}, a = ${a}`, [`f(x) = x${sup(n)}, a = ${a ** n}`, `f(x) = (${a} + x)${sup(n)}, a = 0`, `f(x) = x${sup(n - 1)}, a = ${a}`]),
    );
  }
  if (kind === 1) {
    const f = pick([
      { f: "sin", a: "π/3", v: "1/2" },
      { f: "sin", a: "π/6", v: "√3/2" },
      { f: "cos", a: "π/3", v: "−√3/2" },
      { f: "cos", a: "π/2", v: "−1" },
      { f: "sin", a: "π", v: "−1" },
      { f: "cos", a: "π/6", v: "−1/2" },
    ]);
    const shown = `${lim(0, "", "h")} [${f.f}(${f.a} + h) − ${f.f}(${f.a})]/h`;
    return mk(
      {
        key: `ld-trig-${f.f}-${f.a}`,
        prompt: "Spot the derivative, then find its value.",
        math: shown,
        hint: `This is the derivative of ${f.f} x at x = ${f.a}.`,
        explain: `It's f′(${f.a}) for f(x) = ${f.f} x. f′(x) = ${f.f === "sin" ? "cos x" : "−sin x"}, so the value is ${f.v}.`,
      },
      label(f.v, ["1/2", "√3/2", "−√3/2", "−1/2", "1", "−1", "0"].filter((v) => v !== f.v).slice(0, 4).concat(["does not exist"])),
    );
  }
  const p = nz(-3, 4);
  const q = rand(-5, 5);
  const a = rand(-3, 3);
  const P: Poly = [[p, 2], [q, 1]];
  const c = 2 * p * a + q;
  if (kind === 2) {
    const dq = (cc: number, hh: number) => terms([[cc, ""], [hh, "h"]], "");
    return mk(
      {
        key: `ld-dq-${p}-${q}-${a}`,
        prompt: `f(x) = ${poly(P)}. Simplify [f(${fmt(a)} + h) − f(${fmt(a)})]/h.`,
        hint: "Expand f(a + h), subtract f(a), and every term left has an h to divide out.",
        explain: `f(${fmt(a)} + h) − f(${fmt(a)}) = ${terms([[c, "h"], [p, "h²"]], "")}. Divide by h: ${dq(c, p)}.`,
      },
      label(dq(c, p), [dq(c, 0), dq(c, p * 2), dq(p * a + q, p), dq(c - q, p)], [dq(-c, p), dq(c + 1, p)]),
    );
  }
  return mk(
    {
      key: `ld-val-${p}-${q}-${a}`,
      prompt: `f(x) = ${poly(P)}. Use the limit definition.`,
      math: `f′(${fmt(a)})`,
      hint: `Simplify [f(${fmt(a)} + h) − f(${fmt(a)})]/h, then let h → 0.`,
      explain: `[f(${fmt(a)} + h) − f(${fmt(a)})]/h = ${terms([[c, ""], [p, "h"]], "")}. As h → 0 this → ${fmt(c)}.`,
    },
    kp(c),
  );
}

/** CALC.2.2 — slopes of tangent lines and their equations. */
export function tangentLines(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  const a = rand(-2, 2);
  const A = rand(-2, 3);
  const m = rand(-2, 3);
  if (kind === 0) {
    const c = pick([0.5, -0.5, 1, -1]);
    const f: Fn = (x) => A + m * (x - a) + c * (x - a) ** 2;
    return mk(
      {
        key: `tan-read-${a}-${A}-${m}-${c}`,
        prompt: `The dashed line is tangent at x = ${fmt(a)}. Find f′(${fmt(a)}).`,
        math: `f′(${fmt(a)})`,
        visual: plot([a - 4, a + 4], [-7, 7], {
          curves: [{ fn: f, colour: "wave", label: "f" }],
          lines: [{ from: [a - 3, A - 3 * m], to: [a + 3, A + 3 * m], dashed: true, colour: "berry" }],
          points: [{ x: a, y: A }],
        }),
        needsVisual: true,
        hint: "f′(a) is the slope of the tangent line. Count rise over run along the dashed line.",
        explain: `The tangent rises ${fmt(m)} for every 1 to the right, so f′(${fmt(a)}) = ${fmt(m)}.`,
      },
      kp(m),
    );
  }
  if (kind === 1) {
    const b = A - m * a;
    const eqn = (mm: number, bb: number) => `y = ${lin(mm, bb)}`;
    return mk(
      {
        key: `tan-eq-${a}-${A}-${m}`,
        prompt: `f(${fmt(a)}) = ${fmt(A)} and f′(${fmt(a)}) = ${fmt(m)}. Tangent line at x = ${fmt(a)}?`,
        hint: "Point-slope form: y − f(a) = f′(a)(x − a).",
        explain: `y − ${A < 0 ? `(${fmt(A)})` : A} = ${fmt(m)}(x − ${a < 0 ? `(${fmt(a)})` : a}), which is ${eqn(m, b)}.`,
      },
      label(eqn(m, b), [eqn(A, m - A * a), eqn(m, A + m * a), eqn(m, A)], [eqn(-m, b), eqn(m, b + 1)]),
    );
  }
  const h = rand(-3, 3);
  const k = rand(-4, 2);
  const c = pick([0.5, 1, -0.5, -1]);
  const f: Fn = (x) => k + c * (x - h) ** 2;
  return mk(
    {
      key: `tan-flat-${h}-${k}-${c}`,
      prompt: "Where is the tangent line horizontal (f′(x) = 0)?",
      eq: ["x", "=", "?"],
      visual: plot([-5, 5], fitY([f], -5, 5), { curves: [{ fn: f, colour: "wave", label: "f" }] }),
      needsVisual: true,
      hint: "A horizontal tangent has slope 0. Look for the top or bottom of the curve.",
      explain: `At the ${c > 0 ? "bottom" : "top"} of the curve, x = ${fmt(h)}, the tangent is flat, so f′(${fmt(h)}) = 0.`,
    },
    kp(h),
  );
}

const DIFF = {
  yes: "Yes: it's smooth there",
  corner: "No: a corner or cusp",
  vertical: "No: a vertical tangent",
  broken: "No: f isn't continuous there",
};

/** CALC.2.3 — differentiability and how it relates to continuity. */
export function differentiability(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(-2, 2);
    const b = rand(-2, 2);
    const k = pick([1, -1, 2, 0.5]);
    const type = pick(["yes", "corner", "cusp", "vertical", "broken"] as const);
    const fn: Fn =
      type === "yes"
        ? (x) => b + k * 0.4 * (x - a) ** 2 + 0.5 * (x - a)
        : type === "corner"
          ? (x) => b + k * Math.abs(x - a)
          : type === "cusp"
            ? (x) => b + k * Math.abs(x - a) ** (2 / 3) * 1.5
            : type === "vertical"
              ? (x) => b + k * Math.cbrt(x - a) * 1.5
              : (x) => (x < a ? b + 0.5 * (x - a) : b + 2 + 0.5 * (x - a));
    const key = type === "cusp" ? "corner" : type;
    return mk(
      {
        key: `df-g-${type}-${a}-${b}-${k}`,
        prompt: `Is f differentiable at x = ${fmt(a)}?`,
        visual: plot([a - 4, a + 4], [-6, 6], {
          curves: [{ fn, colour: "grape", label: "f" }],
          points: type === "broken" ? [{ x: a, y: b }, { x: a, y: b + 2, open: true }] : [{ x: a, y: fn(a) }],
        }),
        needsVisual: true,
        hint: "Zoom in at the point. Does it look like one straight, non-vertical line?",
        explain:
          key === "yes"
            ? "The curve is smooth there, so it has a tangent with a real slope."
            : key === "corner"
              ? "The slopes from the left and right don't agree at the sharp point, so f′ doesn't exist there."
              : key === "vertical"
                ? "The tangent there is vertical, and a vertical line has no slope."
                : "A function must be continuous to be differentiable, and this one jumps.",
      },
      label(DIFF[key], Object.values(DIFF).filter((d) => d !== DIFF[key])),
    );
  }
  if (kind === 1) {
    const a = nz(-4, 4);
    const fam = pick([
      { f: `|${lin(1, -a)}|`, ans: "continuous, not differentiable", why: "It has a corner there." },
      { f: `${fac(a)}|${lin(1, -a)}|`, ans: "both", why: "The corner gets flattened: both one-sided slopes are 0." },
      { f: `∛${fac(a)}`, ans: "continuous, not differentiable", why: "It has a vertical tangent there." },
      { f: `(x² − ${a * a})/${fac(a)}`, ans: "neither", why: `It's undefined at x = ${fmt(a)}, so it can't be continuous or differentiable there.` },
      { f: poly([[1, 2], [a, 1]]), ans: "both", why: "Polynomials are smooth everywhere." },
    ]);
    return mk(
      {
        key: `df-f-${fam.f}-${a}`,
        prompt: `f(x) = ${fam.f}. At x = ${fmt(a)}, f is…`,
        hint: "Differentiable always implies continuous. Look for holes, corners and vertical tangents.",
        explain: `${fam.why} So f is ${fam.ans === "both" ? "continuous and differentiable" : fam.ans}.`,
      },
      label(fam.ans, ["both", "continuous, not differentiable", "differentiable, not continuous", "neither"].filter((x) => x !== fam.ans)),
    );
  }
  if (kind === 2) {
    const a = nz(-3, 3);
    const askM = Math.random() < 0.5;
    return mk(
      {
        key: `df-pw-${a}-${askM}`,
        prompt: `Choose m and b so f is differentiable at x = ${fmt(a)}. Find ${askM ? "m" : "b"}.`,
        eq: [askM ? "m" : "b", "=", "?"],
        visual: { kind: "table", header: ["f(x)", "when"], rows: [["x²", `x ≤ ${fmt(a)}`], ["mx + b", `x > ${fmt(a)}`]] },
        needsVisual: true,
        hint: `The slopes must match (2x at x = ${fmt(a)}), and the pieces must meet (continuity).`,
        explain: `Slopes match: m = 2(${fmt(a)}) = ${fmt(2 * a)}. Pieces meet: ${fmt(2 * a)}(${fmt(a)}) + b = ${a * a}, so b = ${fmt(-a * a)}.`,
      },
      kp(askM ? 2 * a : -a * a),
    );
  }
  const a = rand(-5, 5);
  const st = pick([
    { s: "f is differentiable at x = a, so f is continuous at x = a.", t: true },
    { s: "f is continuous at x = a, so f is differentiable at x = a.", t: false },
    { s: "f isn't continuous at x = a, so f isn't differentiable at x = a.", t: true },
    { s: "f isn't differentiable at x = a, so f isn't continuous at x = a.", t: false },
  ]);
  const s = st.s.replace(/a\./g, `${fmt(a)}.`).replace(/a,/g, `${fmt(a)},`);
  return mk(
    {
      key: `df-tf-${st.s.length}-${st.t}-${a}`,
      prompt: s,
      hint: "Differentiable is the stronger condition. |x| is a good test case.",
      explain: st.t
        ? "Always true: differentiability forces continuity (and so a break rules out a derivative)."
        : "Not always: |x| is continuous at 0 but has a corner, so it isn't differentiable there.",
    },
    label(st.t ? "always true" : "not always true", [st.t ? "not always true" : "always true", "never true"]),
  );
}

/* ======================================================== hands-on activities */

type Act = NonNullable<Question["activity"]>;

interface ActSpec {
  key: string;
  prompt: string;
  say?: string;
  /** Only when it shows data the student needs (a graph to read, a table). */
  visual?: Visual;
  hint: string;
  explain: string;
}

/** A "Do it" question: build, draw, place or sort, then Check. */
function doIt(s: ActSpec, activity: Act, answer: number): Question {
  const q: Question = {
    key: s.key,
    prompt: s.prompt,
    speech: s.say ?? talk(s.prompt),
    visual: s.visual ?? NONE,
    answer,
    input: "activity",
    activity,
    hint: s.hint,
    explain: s.explain,
  };
  if (s.visual && s.visual.kind !== "none") q.needsVisual = true;
  return q;
}

/** How many grid points y = mx + b passes through on a −size…size grid. */
function lattice(m: number, b: number, size: number): number {
  let n = 0;
  for (let x = -size; x <= size; x++) {
    const y = m * x + b;
    if (Math.abs(y - Math.round(y)) < 1e-9 && Math.abs(y) <= size) n++;
  }
  return n;
}

/** Pick `n` items from each pool and tag them with the pool's bin. */
function sortItems(pools: string[][], counts: number[]): { label: string; bin: number }[] {
  return shuffle(pools.flatMap((pool, bin) => shuffle(pool).slice(0, counts[bin]).map((label) => ({ label, bin }))));
}

/** Sort a few items from each pool into bins. */
function sortTask(s: Omit<ActSpec, "key"> & { key: string }, bins: string[], pools: string[][], lo = 1, hi = 2): Question {
  let counts = pools.map(() => rand(lo, hi));
  while (counts.reduce((a, b) => a + b, 0) > 10) counts = pools.map(() => rand(lo, hi));
  const items = sortItems(pools, counts);
  return doIt(
    { ...s, key: `${s.key}-${items.map((i) => i.label).sort().join("|")}` },
    { kind: "sort", bins, items },
    items.length,
  );
}

/** CALC.1.1 — drag a marker to the value of a limit read from a graph, a table or algebra. */
export function limitPlace(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const a = rand(-2, 2);
    const jump = Math.random() < 0.5;
    const L1 = rand(-4, 4);
    let L2 = L1;
    while (jump && L2 === L1) L2 = rand(-4, 4);
    const fa = jump ? L2 : pick([L1 + 2, L1 - 2, L1 + 3]);
    const m = pick([-1, -0.5, 0.5, 1]);
    const side = jump ? pick(["⁻", "⁺"]) : pick(["", "⁻", "⁺"]);
    const target = side === "⁺" ? L2 : L1;
    const shown = `${lim(a, side)} f(x)`;
    return doIt(
      {
        key: `lp-g-${a}-${L1}-${L2}-${fa}-${m}-${side}`,
        prompt: `Drag the marker to ${shown}.`,
        visual: plot([a - 4, a + 4], [-6, 7], {
          curves: [
            { fn: (x) => (x < a ? L1 + m * (x - a) : NaN), colour: "wave" },
            { fn: (x) => (x > a ? L2 - m * (x - a) : NaN), colour: "wave" },
          ],
          points: [{ x: a, y: L1, open: fa !== L1 }, ...(L2 !== L1 ? [{ x: a, y: L2, open: fa !== L2 }] : []), ...(fa !== L1 && fa !== L2 ? [{ x: a, y: fa }] : [])],
        }),
        hint: "Follow the curve toward x = a from the side you're asked about. The dot sitting at x = a doesn't count.",
        explain: `The curve heads to y = ${fmt(target)}, so ${shown} = ${fmt(target)}.`,
      },
      { kind: "placeOnLine", min: -6, max: 6, step: 1, labelStep: 2, target },
      target,
    );
  }
  if (kind === 1) {
    const r = nz(-4, 4);
    let s = rand(-5, 5);
    while (s === r) s = rand(-5, 5);
    const top = poly([[1, 2], [-(r + s), 1], [r * s, 0]]);
    const shown = `${lim(r)} (${top})/${fac(r)}`;
    return doIt(
      {
        key: `lp-a-${r}-${s}`,
        prompt: `Show ${shown} on the line.`,
        hint: `Factor the top, cancel ${fac(r)}, then plug in.`,
        explain: `It becomes ${lin(1, -s)}, which → ${fmt(r - s)}.`,
      },
      { kind: "placeOnLine", min: -10, max: 10, step: 1, labelStep: 2, target: r - s },
      r - s,
    );
  }
  if (kind === 2) {
    const q = pick([1, 2]);
    const p = nz(-5 * q, 5 * q);
    const d = rand(1, 3);
    const top = poly([[p, d], [rand(-6, 6), 0]]);
    const bot = poly([[q, d], [nz(-5, 5), Math.max(0, d - 1)]].filter(([, e], i) => i === 0 || e < d) as Poly);
    const t = clean(p / q);
    return doIt(
      {
        key: `lp-i-${p}-${q}-${d}-${top}-${bot}`,
        prompt: `Show ${lim("∞")} (${top})/(${bot}) on the line.`,
        hint: "Same highest power top and bottom: the limit is the ratio of the leading coefficients.",
        explain: `Far out only ${poly([[p, d]])} and ${poly([[q, d]])} matter, so the limit is ${fmt(p)}/${q} = ${ds(t)}.`,
      },
      { kind: "placeOnLine", min: -5, max: 5, step: 0.5, labelStep: 1, target: t },
      t,
    );
  }
  const a = rand(1, 9);
  const b = pick([1, 2]);
  const t = clean(a / b);
  const shown = `${lim(0)} sin(${a === 1 ? "" : a}x)/${b === 1 ? "x" : `(${b}x)`}`;
  return doIt(
    {
      key: `lp-t-${a}-${b}`,
      prompt: `Show ${shown} on the line.`,
      hint: "Near 0, sin(kx) ≈ kx.",
      explain: `Near 0, sin(kx) ≈ kx, so the ratio → ${a}/${b} = ${ds(t)}.`,
    },
    { kind: "placeOnLine", min: 0, max: 10, step: 0.5, labelStep: 1, target: t },
    t,
  );
}

/** CALC.1.4 — sort functions by the kind of discontinuity they have. */
export function discontinuitySort(): Question {
  return sortTask(
    {
      key: "ds",
      prompt: "Sort each function by what happens at the given x.",
      hint: "Hole: factors cancel. Jump: the sides head to different heights. Infinite: the bottom → 0 but the top doesn't.",
      explain: "Canceling factors leave removable holes; |x − a|/(x − a) jumps; a zero in the denominator that doesn't cancel gives an asymptote.",
    },
    ["removable", "jump", "infinite", "continuous"],
    [
      ["(x² − 4)/(x − 2) at x = 2", "(x² − 1)/(x + 1) at x = −1", "sin x / x at x = 0", "(x³ − 8)/(x − 2) at x = 2", "(x² + 3x)/x at x = 0", "(x² − 9)/(x + 3) at x = −3"],
      ["|x|/x at x = 0", "|x − 3|/(x − 3) at x = 3", "⌊x⌋ at x = 2", "|x + 1|/(x + 1) at x = −1", "⌈x⌉ at x = 1"],
      ["1/x at x = 0", "1/(x − 3)² at x = 3", "tan x at x = π/2", "x/(x + 1) at x = −1", "1/(x² − 4) at x = 2"],
      ["x² + 1 at x = 1", "|x| at x = 0", "eˣ at x = 0", "∛x at x = 0", "√(x + 4) at x = 0", "cos x at x = π"],
    ],
  );
}

/** CALC.2.1, CALC.2.2, CALC.4.5 — draw tangent and secant lines on a grid. */
export function drawTangent(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  const size = 6;
  if (kind === 0) {
    let a = 0;
    let m = 0;
    let A = 0;
    let b = 99;
    while (Math.abs(b) > 5 || lattice(m, b, size) < 3) {
      a = rand(-3, 3);
      m = rand(-3, 3);
      A = rand(-4, 4);
      b = A - m * a;
    }
    return doIt(
      {
        key: `dt-v-${a}-${m}-${A}`,
        prompt: `f(${fmt(a)}) = ${fmt(A)} and f′(${fmt(a)}) = ${fmt(m)}. Draw the tangent line at x = ${fmt(a)}.`,
        hint: `Start at the point (${fmt(a)}, ${fmt(A)}). The slope ${fmt(m)} tells you the rise for each step right.`,
        explain: `The tangent goes through (${fmt(a)}, ${fmt(A)}) with slope ${fmt(m)}: y = ${lin(m, b)}.`,
      },
      { kind: "drawLine", m, b, size, quadrants: 4 },
      m,
    );
  }
  if (kind === 1) {
    let c = 1;
    let a = 0;
    let m = 0;
    let b = 0.5;
    while (!Number.isInteger(b) || Math.abs(b) > size || Math.abs(m) > 4 || lattice(m, b, size) < 2) {
      c = pick([1, -1, 0.5, -0.5]);
      a = rand(-3, 3);
      m = 2 * c * a;
      b = -c * a * a;
    }
    const f = poly([[c, 2]]);
    return doIt(
      {
        key: `dt-sq-${c}-${a}`,
        prompt: `Draw the tangent line to f(x) = ${f} at x = ${fmt(a)}.`,
        hint: `Find the point (${fmt(a)}, f(${fmt(a)})) and the slope f′(${fmt(a)}) = ${ds(2 * c)}·${fmt(a)}.`,
        explain: `f(${fmt(a)}) = ${ds(c * a * a)} and f′(${fmt(a)}) = ${ds(m)}, so the tangent is y = ${lin(m, b)}.`,
      },
      { kind: "drawLine", m, b, size, quadrants: 4 },
      m,
    );
  }
  if (kind === 2) {
    let p = 0;
    let q = 0;
    while (p === q || Math.abs(p * q) > 6 || Math.abs(p + q) > 4) {
      p = rand(-3, 3);
      q = rand(-3, 3);
    }
    const [lo, hi] = [Math.min(p, q), Math.max(p, q)];
    return doIt(
      {
        key: `dt-sec-${lo}-${hi}`,
        prompt: `Draw the secant line of f(x) = x² through x = ${fmt(lo)} and x = ${fmt(hi)}.`,
        hint: `Plot (${fmt(lo)}, ${lo * lo}) and (${fmt(hi)}, ${hi * hi}) and join them.`,
        explain: `Slope = (${hi * hi} − ${lo * lo})/(${fmt(hi)} − ${lo < 0 ? `(${fmt(lo)})` : lo}) = ${fmt(p + q)}, so y = ${lin(p + q, -p * q)}.`,
      },
      { kind: "drawLine", m: p + q, b: -p * q, size, quadrants: 4 },
      p + q,
    );
  }
  const t = pick([
    { f: "eˣ", a: "0", m: 1, b: 1 },
    { f: "ln x", a: "1", m: 1, b: -1 },
    { f: "sin x", a: "0", m: 1, b: 0 },
    { f: "cos x", a: "0", m: 0, b: 1 },
    { f: "√x", a: "4", m: 0.25, b: 1 },
    { f: "√x", a: "1", m: 0.5, b: 0.5 },
    { f: "1/x", a: "1", m: -1, b: 2 },
    { f: "1/x", a: "−1", m: -1, b: -2 },
    { f: "x³", a: "1", m: 3, b: -2 },
    { f: "x³", a: "−1", m: 3, b: 2 },
    { f: "x³", a: "0", m: 0, b: 0 },
    { f: "tan x", a: "0", m: 1, b: 0 },
    { f: "x⁴", a: "1", m: 4, b: -3 },
    { f: "2√x", a: "1", m: 1, b: 1 },
    { f: "e²ˣ", a: "0", m: 2, b: 1 },
    { f: "sin(2x)", a: "0", m: 2, b: 0 },
    { f: "x² − 2x", a: "1", m: 0, b: -1 },
    { f: "ln(x + 1)", a: "0", m: 1, b: 0 },
  ]);
  return doIt(
    {
      key: `dt-lin-${t.f}-${t.a}`,
      prompt: `Draw the linearization of f(x) = ${t.f} at x = ${t.a}.`,
      hint: "The linearization is the tangent line: L(x) = f(a) + f′(a)(x − a). Find f(a) and f′(a) first.",
      explain: `f(${t.a}) = ${ds(t.m * Number(t.a.replace("−", "-")) + t.b)} and f′(${t.a}) = ${ds(t.m)}, so L(x) = ${lin(t.m, t.b)}.`,
    },
    { kind: "drawLine", m: t.m, b: t.b, size, quadrants: 4 },
    t.m,
  );
}

/** CALC.2.3 — sort functions by whether they're differentiable at x = 0. */
export function smoothSort(): Question {
  return sortTask(
    {
      key: "ss",
      prompt: "Sort: is each function differentiable at x = 0?",
      hint: "Look for corners (|x|), cusps and vertical tangents (cube roots), and breaks. Squaring away a corner can smooth it.",
      explain: "|x|-type corners, cube-root cusps and vertical tangents, and discontinuities all fail. x|x| and |x³| are smooth at 0: both one-sided slopes are 0.",
    },
    ["differentiable at 0", "not differentiable at 0"],
    [
      ["x²", "x³ − x", "x|x|", "sin x", "eˣ", "|x³|", "cos x", "x² + 3x"],
      ["|x|", "∛x", "∛(x²)", "|sin x|", "|x| + x", "√(x²)", "1/x", "|x|/x"],
    ],
    2,
    4,
  );
}

/* ======================================================== 3. Derivative rules */

/** "(3/2)" when the coefficient isn't whole, "" for 1, "−" for −1. */
function coef(n: number, d = 1): string {
  const s = fr(n, d);
  if (s === "1") return "";
  if (s === "−1") return "−";
  return s.includes("/") ? `(${s})` : s;
}

/** CALC.2.4 — the power rule, with negative and root powers too. */
export function powerRule(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const n = rand(2, 9);
    const c = pick([1, 2, 3, 4, 5, 6, -1, -2, -3]);
    const f = poly([[c, n]]);
    const right = poly([[c * n, n - 1]]);
    return mk(
      {
        key: `pw-sym-${c}-${n}`,
        prompt: pick(["Differentiate.", "Use the power rule."]),
        math: `d/dx (${f})`,
        hint: "Bring the power down as a multiplier, then lower the power by 1.",
        explain: `Multiply by ${n} and lower the power to ${n - 1}: ${right}.`,
      },
      label(right, [poly([[c * n, n]]), poly([[c, n - 1]]), poly([[c * (n - 1), n - 1]])], [poly([[c * n, n + 1]])]),
    );
  }
  if (kind === 1) {
    const n = rand(1, 4);
    const c = pick([1, 2, 3, 4, -1, -2, 5]);
    const over = (k: number, p: number) => `${k < 0 ? "−" : ""}${Math.abs(k)}/${xp(p)}`;
    const f = over(c, n);
    const right = over(-c * n, n + 1);
    return mk(
      {
        key: `pw-neg-${c}-${n}`,
        prompt: `Rewrite as a power of x first: ${f} = ${poly([[c, -n]])}.`,
        math: `d/dx (${f})`,
        hint: "With a negative power, lowering by 1 makes it more negative: −2 becomes −3.",
        explain: `d/dx ${poly([[c, -n]])} = ${poly([[-c * n, -n - 1]])} = ${right}.`,
      },
      label(right, [over(-c * n, n - 1 || 1), over(c * n, n + 1), over(-c, n + 1)], [over(-c * n, n)]),
    );
  }
  if (kind === 2) {
    const c = pick([1, 2, 3, 4, 6, 8, -2, -4]);
    const form = rand(0, 1);
    const sign = c < 0 ? "−" : "";
    const A = Math.abs(c);
    if (form === 0) {
      const g = gcd(A, 2);
      const right = `${sign}${A / g}/${2 / g === 1 ? "√x" : "(2√x)"}`;
      return mk(
        {
          key: `pw-root-${c}`,
          prompt: "√x = x^(1/2). Differentiate.",
          math: `d/dx (${coef(c)}√x)`,
          hint: "½ comes down; ½ − 1 = −½, and x^(−½) = 1/√x.",
          explain: `${coef(c)}·(1/2)x^(−1/2) = ${right}.`,
        },
        label(right, [`${sign}${A}/√x`, `${coef(c, 2)}√x`, `${coef(2 * c, 3)}x√x`], [`${sign}${A}/(2x)`]),
      );
    }
    const right = `${coef(3 * c, 2)}√x`;
    return mk(
      {
        key: `pw-root32-${c}`,
        prompt: "x√x = x^(3/2). Differentiate.",
        math: `d/dx (${coef(c)}x√x)`,
        hint: "3/2 comes down; 3/2 − 1 = 1/2.",
        explain: `${coef(c)}·(3/2)x^(1/2) = ${right}.`,
      },
      label(right, [`${coef(3 * c, 2)}x√x`, `${coef(c)}√x`.replace(/^$/, "√x"), `${coef(c, 2)}√x`], [`${coef(2 * c, 5)}x²√x`]),
    );
  }
  const n = rand(2, 5);
  const c = pick([1, 2, 3, -1, -2, 4]);
  const a = nz(-3, 3);
  const v = c * n * a ** (n - 1);
  return mk(
    {
      key: `pw-val-${c}-${n}-${a}`,
      prompt: `f(x) = ${poly([[c, n]])}. Find the slope at x = ${fmt(a)}.`,
      math: `f′(${fmt(a)})`,
      hint: "Differentiate first, then plug in.",
      explain: `f′(x) = ${poly([[c * n, n - 1]])}, so f′(${fmt(a)}) = ${fmt(v)}.`,
    },
    kp(v),
  );
}

/** CALC.2.5 — constant multiples, sums and differences. */
export function sumRule(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0 || kind === 1) {
    const P: Poly = [[nz(-4, 4), 3], [rand(-6, 6), 2], [rand(-9, 9), 1], [nz(-9, 9), 0]];
    const D = pder(P);
    if (kind === 1) {
      const k = rand(-3, 3);
      const v = pval(D, k);
      return mk(
        {
          key: `sr-val-${P.join("|")}-${k}`,
          prompt: `f(x) = ${poly(P)}`,
          math: `f′(${fmt(k)})`,
          hint: "Differentiate term by term (the constant disappears), then plug in.",
          explain: `f′(x) = ${poly(D)}, so f′(${fmt(k)}) = ${fmt(v)}.`,
        },
        kp(v),
      );
    }
    const flip = D.map(([c, p], i) => [i === 1 || (i === 0 && D[1][0] === 0) ? -c : c, p] as [number, number]);
    return mk(
      {
        key: `sr-sym-${P.join("|")}`,
        prompt: "Differentiate term by term.",
        math: `d/dx (${poly(P)})`,
        hint: "Each term on its own: power rule, constants multiply along, and a lone constant has slope 0.",
        explain: `${poly(P)} → ${poly(D)}. The constant ${fmt(P[3][0])} becomes 0.`,
      },
      label(poly(D), [
        poly([...D, [P[3][0], 0]]),
        poly(P.filter(([, p]) => p > 0).map(([c, p]) => [c, p - 1])),
        poly(P.filter(([, p]) => p > 0).map(([c, p]) => [c * p, p])),
        poly(flip),
      ]),
    );
  }
  if (kind === 2) {
    const a = rand(-3, 3);
    const A = rand(-6, 6);
    const B = rand(-6, 6);
    const k = nz(-4, 4);
    const m = nz(-3, 3);
    const c = rand(0, 3);
    const v = k * A - m * B + 2 * c * a;
    const h = `${terms([[k, "f(x)"], [-m, "g(x)"]], "")}${c ? ` + ${c === 1 ? "" : c}x²` : ""}`;
    return mk(
      {
        key: `sr-fg-${a}-${A}-${B}-${k}-${m}-${c}`,
        prompt: `f′(${fmt(a)}) = ${fmt(A)}, g′(${fmt(a)}) = ${fmt(B)}, h(x) = ${h}.`,
        math: `h′(${fmt(a)})`,
        hint: "The derivative of a sum is the sum of the derivatives; constants ride along.",
        explain: `h′(x) = ${terms([[k, "f′(x)"], [-m, "g′(x)"]], "")}${c ? ` + ${2 * c}x` : ""}. At ${fmt(a)}: ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (Math.random() < 0.5) {
    const a = nz(-4, 4);
    const b = nz(-6, 6);
    const n = rand(3, 6);
    const right = poly([[a * (n - 1), n - 2]]);
    return mk(
      {
        key: `sr-div-${a}-${b}-${n}`,
        prompt: "Simplify first, then differentiate.",
        math: `d/dx [(${poly([[a, n], [b, 1]])})/x]`,
        hint: "Divide each term on top by x. Then use the power rule.",
        explain: `(${poly([[a, n], [b, 1]])})/x = ${poly([[a, n - 1], [b, 0]])}, whose derivative is ${right}.`,
      },
      label(right, [poly([[a * n, n - 1], [b, 0]]), poly([[a * (n - 1), n - 2], [b, 0]]), poly([[a * (n - 1), n - 1]])]),
    );
  }
  const p = nz(-6, 6);
  const right = poly([[2, 1], [2 * p, 0]]);
  return mk(
    {
      key: `sr-sq-${p}`,
      prompt: "Expand first, then differentiate.",
      math: `d/dx ${fac(-p)}²`,
      hint: `${fac(-p)}² = x² ${p < 0 ? "−" : "+"} ${Math.abs(2 * p)}x + ${p * p}. Don't forget the middle term.`,
      explain: `${fac(-p)}² = ${poly([[1, 2], [2 * p, 1], [p * p, 0]])}, so the derivative is ${right}.`,
    },
    label(right, ["2x", poly([[2, 1], [p, 0]]), poly([[2, 1], [2 * p * p, 0]])], [poly([[1, 1], [p, 0]])]),
  );
}

/** CALC.2.6 — derivatives of sin x, cos x, eˣ and ln x. */
export function trigExpLn(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = nz(-5, 5);
    const b = nz(-5, 5);
    const right = terms([[a, "cos x"], [-b, "sin x"]]);
    return mk(
      {
        key: `te-sc-${a}-${b}`,
        prompt: "Differentiate.",
        math: `d/dx (${terms([[a, "sin x"], [b, "cos x"]])})`,
        hint: "sin x → cos x, and cos x → −sin x (watch that minus).",
        explain: `${terms([[a, "sin x"]])} → ${terms([[a, "cos x"]])}; ${terms([[b, "cos x"]])} → ${terms([[-b, "sin x"]])}. Together: ${right}.`,
      },
      label(right, [terms([[a, "cos x"], [b, "sin x"]]), terms([[-a, "cos x"], [-b, "sin x"]]), terms([[-a, "cos x"], [b, "sin x"]])]),
    );
  }
  if (kind === 1) {
    const a = nz(-5, 6);
    const b = nz(-6, 6);
    const B = Math.abs(b);
    const tail = (t: string) => `${b < 0 ? " − " : " + "}${B === 1 && t.startsWith(" ") ? t.trim() : `${B}${t}`}`;
    const ex = terms([[a, "eˣ"]], "");
    const right = `${ex}${tail("/x")}`;
    return mk(
      {
        key: `te-el-${a}-${b}`,
        prompt: "Differentiate.",
        math: `d/dx (${ex}${tail(" ln x")})`,
        hint: "eˣ is its own derivative, and d/dx ln x = 1/x.",
        explain: `${ex} stays ${ex}, and ${terms([[b, "ln x"]])} → ${fmt(b)}/x. So ${right}.`,
      },
      label(right, [`${coef(a)}xeˣ⁻¹${tail("/x")}`, `${ex}${b < 0 ? " − " : " + "}${B === 1 ? "1/x²" : `1/(${B}x)`}`, `${ex}${tail("/x²")}`], [`${ex}${tail(" ln x")}`]),
    );
  }
  if (kind === 2) {
    const form = rand(0, 2);
    if (form === 0) {
      const a = nz(-6, 6);
      const b = nz(-6, 6);
      const at = pick(["0", "π/2", "π", "3π/2"]);
      const v = at === "0" ? a : at === "π/2" ? -b : at === "π" ? -a : b;
      const f = terms([[a, "sin x"], [b, "cos x"]]);
      return mk(
        {
          key: `te-v1-${a}-${b}-${at}`,
          prompt: `f(x) = ${f}`,
          math: `f′(${at})`,
          hint: "f′(x) = a cos x − b sin x. Use the unit circle at that angle.",
          explain: `f′(x) = ${terms([[a, "cos x"], [-b, "sin x"]])}; at x = ${at} that's ${fmt(v)}.`,
        },
        kp(v),
      );
    }
    if (form === 1) {
      const a = nz(-9, 9);
      const b = nz(-5, 5);
      return mk(
        {
          key: `te-v2-${a}-${b}`,
          prompt: `f(x) = ${terms([[a, "eˣ"], [b, "x²"]], "")}`,
          math: "f′(0)",
          hint: "Differentiate, then use e⁰ = 1.",
          explain: `f′(x) = ${terms([[a, "eˣ"], [2 * b, "x"]], "")}, so f′(0) = ${fmt(a)}.`,
        },
        kp(a),
      );
    }
    const k = rand(2, 6);
    const m = nz(-4, 4);
    return mk(
      {
        key: `te-v3-${k}-${m}`,
        prompt: `f(x) = ${k * m} ln x`.replace(" -", " −"),
        math: `f′(${k})`,
        hint: "d/dx ln x = 1/x.",
        explain: `f′(x) = ${fmt(k * m)}/x, so f′(${k}) = ${fmt(k * m)}/${k} = ${fmt(m)}.`,
      },
      kp(m),
    );
  }
  const k = rand(2, 9);
  const c = rand(1, 4);
  const exp = Math.random() < 0.5;
  return mk(
    {
      key: `te-sl-${k}-${c}-${exp}`,
      prompt: exp ? `Slope of y = ${coef(c)}eˣ at x = ln ${k}?` : `Slope of y = ${coef(c)}ln x at x = 1/${k}?`,
      hint: exp ? "The slope of eˣ is eˣ, and e^(ln k) = k." : "The slope of ln x is 1/x, and 1/(1/k) = k.",
      explain: exp ? `y′ = ${coef(c)}eˣ = ${coef(c)}e^(ln ${k}) = ${c * k}.` : `y′ = ${c}/x = ${c}·${k} = ${c * k}.`,
    },
    kp(c * k),
  );
}

const PRODUCT_G = [
  { g: "sin x", s: 1, d: "cos x" },
  { g: "cos x", s: -1, d: "sin x" },
  { g: "eˣ", s: 1, d: "eˣ" },
  { g: "ln x", s: 1, d: "1/x" },
];

/** "3x²" + "sin x" → "3x² sin x"; "2x" + "eˣ" → "2xeˣ". */
const glue = (front: string, g: string) => (front ? `${front}${g.startsWith("e") ? "" : " "}${g}` : g);

/** CALC.2.7 — the product rule. */
export function productRule(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(1, 4);
    const b = a + rand(1, 3);
    const row = (x: number) => [x, nz(-5, 6), nz(-5, 5), nz(-5, 6), nz(-5, 5)];
    const rows = shuffle([row(a), row(b)]);
    const [, f, fp, g, gp] = rows.find((r) => r[0] === a)!;
    const v = fp * g + f * gp;
    return mk(
      {
        key: `pd-tab-${rows.flat().join("_")}`,
        prompt: `h(x) = f(x)·g(x). Use the table.`,
        math: `h′(${a})`,
        visual: { kind: "table", header: ["x", "f(x)", "f′(x)", "g(x)", "g′(x)"], rows },
        needsVisual: true,
        hint: "(fg)′ = f′g + fg′. Read all four values from the row for this x.",
        explain: `h′(${a}) = f′(${a})g(${a}) + f(${a})g′(${a}) = (${fmt(fp)})(${fmt(g)}) + (${fmt(f)})(${fmt(gp)}) = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const n = rand(1, 4);
    const G = pick(PRODUCT_G);
    const ln = G.g === "ln x";
    const t1 = glue(`${n === 1 ? "" : n}${xp(n - 1)}`, G.g);
    const t2 = ln ? xp(n - 1) || "1" : glue(xp(n), G.d);
    const join = (s: number) => (s < 0 ? " − " : " + ");
    const right = `${t1}${join(G.s)}${t2}`;
    const both = ln ? poly([[n, n - 2]]) : `${G.s < 0 ? "−" : ""}${glue(`${n === 1 ? "" : n}${xp(n - 1)}`, G.d)}`;
    return mk(
      {
        key: `pd-sym-${n}-${G.g}`,
        prompt: "Use the product rule.",
        math: `d/dx (${glue(xp(n), G.g)})`,
        hint: "Derivative of the first times the second, plus the first times the derivative of the second.",
        explain: `(${xp(n)})′·${G.g} + ${xp(n)}·(${G.g})′ = ${right}.`,
      },
      label(right, [both, `${t1}${join(-G.s)}${t2}`, `${G.s < 0 ? "−" : ""}${t2}`], [t1]),
    );
  }
  const p = nz(-4, 4);
  const q = nz(-5, 5);
  const c = rand(-3, 3);
  const v = c * c + q + (c + p) * 2 * c;
  return mk(
    {
      key: `pd-val-${p}-${q}-${c}`,
      prompt: "Use the product rule, then plug in.",
      math: `d/dx [(${lin(1, p)})(${poly([[1, 2], [q, 0]])})] at x = ${fmt(c)}`,
      hint: "f′g + fg′ with f = x + p and g = x² + q.",
      explain: `f′g + fg′ = 1·(${c * c} ${q < 0 ? "−" : "+"} ${Math.abs(q)}) + (${fmt(c + p)})·2(${fmt(c)}) = ${fmt(c * c + q)} ${(c + p) * 2 * c < 0 ? "−" : "+"} ${Math.abs((c + p) * 2 * c)} = ${fmt(v)}.`,
    },
    kp(v),
  );
}

const TRIG_D: Record<string, string> = { tan: "sec²x", sec: "sec x tan x", csc: "−csc x cot x", cot: "−csc²x" };

/** k times a derivative form, keeping a leading minus: (3, "−csc²x") → "−3 csc²x". */
function scaled(k: number, s: string): string {
  const neg = s.startsWith("−");
  const c = k * (neg ? -1 : 1);
  const rest = neg ? s.slice(1) : s;
  return `${c === 1 ? "" : c === -1 ? "−" : `${fmt(c)} `}${rest}`;
}

/** CALC.2.8 — the quotient rule and the derivatives of tan, sec, csc and cot. */
export function quotientRule(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(1, 5);
    let f = 0;
    let fp = 0;
    let g = 1;
    let gp = 0;
    do {
      g = pick([1, -1, 2, -2]);
      f = nz(-6, 6);
      fp = nz(-6, 6);
      gp = nz(-5, 5);
    } while ((fp * g - f * gp) % (g * g) !== 0);
    const v = (fp * g - f * gp) / (g * g);
    return mk(
      {
        key: `qr-tab-${a}-${f}-${fp}-${g}-${gp}`,
        prompt: `h(x) = f(x)/g(x). Use the table.`,
        math: `h′(${a})`,
        visual: { kind: "table", header: ["x", "f(x)", "f′(x)", "g(x)", "g′(x)"], rows: [[a, f, fp, g, gp]] },
        needsVisual: true,
        hint: "(f/g)′ = (f′g − fg′)/g². Low d-high minus high d-low, over low squared.",
        explain: `((${fmt(fp)})(${fmt(g)}) − (${fmt(f)})(${fmt(gp)}))/(${fmt(g)})² = ${fmt(fp * g - f * gp)}/${g * g} = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const fn = pick(["tan", "sec", "csc", "cot"]);
    const k = pick([1, 2, 3, 4, 5, -1, -2]);
    const right = scaled(k, TRIG_D[fn]);
    const others = Object.entries(TRIG_D).filter(([n]) => n !== fn).map(([, d]) => scaled(k, d));
    return mk(
      {
        key: `qr-trig-${fn}-${k}`,
        prompt: "Differentiate.",
        math: `d/dx (${k === 1 ? "" : k === -1 ? "−" : `${fmt(k)} `}${fn} x)`,
        hint: "tan → sec², sec → sec tan; the co- functions (cot, csc) get a minus sign.",
        explain: `d/dx ${fn} x = ${TRIG_D[fn]}, so the answer is ${right}.`,
      },
      label(right, [scaled(-k, TRIG_D[fn]), ...shuffle(others).slice(0, 2)], others),
    );
  }
  if (kind === 2) {
    if (Math.random() < 0.15) {
      return mk(
        {
          key: `qr-ex-${rand(0, 1)}`,
          prompt: "Use the quotient rule.",
          math: "d/dx (eˣ/x)",
          hint: "(f′g − fg′)/g² with f = eˣ and g = x.",
          explain: "(eˣ·x − eˣ·1)/x² = eˣ(x − 1)/x².",
        },
        label("eˣ(x − 1)/x²", ["eˣ(1 − x)/x²", "eˣ", "eˣ(x + 1)/x²"]),
      );
    }
    const a = rand(-6, 6);
    let b = nz(-6, 6);
    while (b === a) b = nz(-6, 6);
    const den = `(${lin(1, b)})²`;
    const right = `${fmt(b - a)}/${den}`;
    return mk(
      {
        key: `qr-sym-${a}-${b}`,
        prompt: "Use the quotient rule.",
        math: `d/dx [(${lin(1, a)})/(${lin(1, b)})]`,
        hint: "(f′g − fg′)/g². Here f′ = 1 and g′ = 1, so the x's cancel on top.",
        explain: `(1·(${lin(1, b)}) − (${lin(1, a)})·1)/${den} = ${right}.`,
      },
      label(right, [`${fmt(a - b)}/${den}`, `(${lin(2, a + b)})/${den}`, "1"], [`${fmt(b - a)}/(${lin(1, b)})`]),
    );
  }
  const k = rand(1, 6);
  const t = pick([
    { f: "tan", at: "0", v: 1 },
    { f: "tan", at: "π/4", v: 2 },
    { f: "tan", at: "π/3", v: 4 },
    { f: "cot", at: "π/4", v: -2 },
    { f: "cot", at: "π/2", v: -1 },
  ]);
  return mk(
    {
      key: `qr-val-${k}-${t.f}-${t.at}`,
      prompt: `f(x) = ${k === 1 ? "" : `${k} `}${t.f} x`,
      math: `f′(${t.at})`,
      hint: t.f === "tan" ? "f′ = k sec²x, and sec x = 1/cos x." : "f′ = −k csc²x, and csc x = 1/sin x.",
      explain: `f′(${t.at}) = ${k === 1 ? "" : `${k}·`}${t.f === "tan" ? "sec²" : "(−csc²)"}(${t.at}) = ${fmt(k * t.v)}.`,
    },
    kp(k * t.v),
  );
}

/** CALC.3.1 — the chain rule with formulas. */
export function chainRule(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = pick([2, 3, 4, 5, -2, -3]);
    const b = nz(-5, 5);
    const n = rand(2, 5);
    const inner = `(${lin(a, b)})`;
    const pw = (e: number) => (e === 1 ? "" : sup(e));
    const right = `${fmt(n * a)}${inner}${pw(n - 1)}`;
    return mk(
      {
        key: `cr-lin-${a}-${b}-${n}`,
        prompt: pick(["Use the chain rule.", "Differentiate: outside, then inside."]),
        math: `d/dx ${inner}${sup(n)}`,
        hint: "Power rule on the outside, then multiply by the derivative of the inside.",
        explain: `${n}${inner}${pw(n - 1)} · ${fmt(a)} = ${right}.`,
      },
      label(right, [`${n}${inner}${pw(n - 1)}`, `${fmt(n * a)}${inner}${sup(n)}`, `${fmt(a)}${inner}${pw(n - 1)}`]),
    );
  }
  if (kind === 1) {
    const k = rand(2, 6);
    const kx = `${k}x`;
    const form = pick(["sin", "cos", "exp", "ln"] as const);
    const b = nz(-5, 5);
    const T = {
      sin: { f: `sin(${kx})`, r: `${k} cos(${kx})`, w: [`cos(${kx})`, `−${k} cos(${kx})`, `${k} cos x`] },
      cos: { f: `cos(${kx})`, r: `−${k} sin(${kx})`, w: [`−sin(${kx})`, `${k} sin(${kx})`, `−${k} sin x`] },
      exp: { f: `e${sup(k)}ˣ`, r: `${k}e${sup(k)}ˣ`, w: [`e${sup(k)}ˣ`, `${k}xe${sup(k - 1)}ˣ`, `${k}eˣ`] },
      ln: { f: `ln(${lin(k, b)})`, r: `${k}/(${lin(k, b)})`, w: [`1/(${lin(k, b)})`, `${k}/x`, `1/${k}`] },
    }[form];
    return mk(
      {
        key: `cr-fn-${form}-${k}-${form === "ln" ? b : 0}`,
        prompt: "Use the chain rule.",
        math: `d/dx ${T.f}`,
        hint: "Differentiate the outside function, keep the inside, then multiply by the inside's derivative.",
        explain: `The inside ${form === "ln" ? lin(k, b) : kx} has derivative ${k}, so d/dx ${T.f} = ${T.r}.`,
      },
      label(T.r, T.w),
    );
  }
  if (kind === 2) {
    const c = rand(1, 9);
    const n = rand(2, 5);
    const T = pick([
      { f: "sin(x²)", r: "2x cos(x²)", w: ["cos(x²)", "cos(2x)", "2x sin(x²)"] },
      { f: "e^(x²)", r: "2xe^(x²)", w: ["e^(x²)", "x²e^(x² − 1)", "e^(2x)"] },
      { f: `ln(x² + ${c})`, r: `2x/(x² + ${c})`, w: [`1/(x² + ${c})`, `1/(2x)`, `2x ln(x² + ${c})`] },
      { f: `√(x² + ${c})`, r: `x/√(x² + ${c})`, w: [`1/(2√(x² + ${c}))`, `2x/√(x² + ${c})`, `2x√(x² + ${c})`] },
      { f: "cos³x", r: "−3cos²x sin x", w: ["3cos²x", "3cos²x sin x", "−3sin²x"] },
      { f: `(x² + ${c})${sup(n)}`, r: `${2 * n}x(x² + ${c})${n === 2 ? "" : sup(n - 1)}`, w: [`${n}(x² + ${c})${n === 2 ? "" : sup(n - 1)}`, `${2 * n}x(x² + ${c})${sup(n)}`, `${n}(2x)${sup(n - 1)}`] },
    ]);
    return mk(
      {
        key: `cr-in-${T.f}`,
        prompt: "Find the inside function first.",
        math: `d/dx ${T.f}`,
        hint: "Outside derivative (inside left alone) times the inside's derivative.",
        explain: `d/dx ${T.f} = ${T.r}.`,
      },
      label(T.r, T.w),
    );
  }
  const form = rand(0, 2);
  if (form === 0) {
    const a = pick([1, 2, 3, -1, -2]);
    const b = nz(-4, 4);
    const n = rand(2, 4);
    const c = rand(-2, 2);
    const v = n * a * (a * c + b) ** (n - 1);
    return mk(
      {
        key: `cr-val-${a}-${b}-${n}-${c}`,
        prompt: `f(x) = (${lin(a, b)})${sup(n)}`,
        math: `f′(${fmt(c)})`,
        hint: "Chain rule first, then plug in.",
        explain: `f′(x) = ${fmt(n * a)}(${lin(a, b)})${n === 2 ? "" : sup(n - 1)}; at ${fmt(c)}: ${fmt(n * a)}·(${fmt(a * c + b)})${n === 2 ? "" : sup(n - 1)} = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  const k = nz(-9, 9);
  const exp = form === 1;
  return mk(
    {
      key: `cr-val0-${k}-${exp}`,
      prompt: `f(x) = ${exp ? ex(k) : `sin(${k === 1 ? "" : k === -1 ? "−" : fmt(k)}x)`}`,
      math: "f′(0)",
      hint: "The chain rule brings out the inside's derivative.",
      explain: `The inside's derivative is ${fmt(k)}, so f′(0) = ${fmt(k)}·1 = ${fmt(k)}.`,
    },
    kp(k),
  );
}

/** CALC.3.1 — the chain rule from a table of values. */
export function chainValues(): Question {
  const xs = [1, 2, 3];
  const f = xs.map(() => rand(1, 3));
  const g = xs.map(() => rand(1, 3));
  const fp = xs.map(() => nz(-5, 5));
  const gp = xs.map(() => nz(-5, 5));
  const rows = xs.map((x, i) => [x, f[i], fp[i], g[i], gp[i]]);
  const a = rand(1, 3);
  const i = a - 1;
  const form = pick(["fg", "gf", "pow", "f2x", "fsq"] as const);
  const n = rand(2, 3);
  const at = form === "f2x" || form === "fsq" ? 1 : a;
  let shown = "";
  let v = 0;
  let explain = "";
  if (form === "fg") {
    shown = "f(g(x))";
    v = fp[g[i] - 1] * gp[i];
    explain = `h′(${a}) = f′(g(${a}))·g′(${a}) = f′(${g[i]})·(${fmt(gp[i])}) = (${fmt(fp[g[i] - 1])})(${fmt(gp[i])}) = ${fmt(v)}.`;
  } else if (form === "gf") {
    shown = "g(f(x))";
    v = gp[f[i] - 1] * fp[i];
    explain = `h′(${a}) = g′(f(${a}))·f′(${a}) = g′(${f[i]})·(${fmt(fp[i])}) = (${fmt(gp[f[i] - 1])})(${fmt(fp[i])}) = ${fmt(v)}.`;
  } else if (form === "pow") {
    shown = `[f(x)]${sup(n)}`;
    v = n * f[i] ** (n - 1) * fp[i];
    explain = `h′(${a}) = ${n}[f(${a})]${n === 2 ? "" : sup(n - 1)}·f′(${a}) = ${n}(${f[i]})${n === 2 ? "" : sup(n - 1)}(${fmt(fp[i])}) = ${fmt(v)}.`;
  } else if (form === "f2x") {
    shown = "f(2x)";
    v = 2 * fp[1];
    explain = `h′(1) = f′(2·1)·2 = 2(${fmt(fp[1])}) = ${fmt(v)}.`;
  } else {
    shown = "f(x²)";
    v = 2 * fp[0];
    explain = `h′(1) = f′(1²)·2(1) = 2(${fmt(fp[0])}) = ${fmt(v)}.`;
  }
  return mk(
    {
      key: `cv-${rows.flat().join("_")}-${form}-${at}-${n}`,
      prompt: `h(x) = ${shown}. Use the table.`,
      math: `h′(${at})`,
      visual: { kind: "table", header: ["x", "f(x)", "f′(x)", "g(x)", "g′(x)"], rows },
      needsVisual: true,
      hint: "Outside derivative evaluated at the inside value, times the inside's derivative.",
      explain,
    },
    kp(v),
  );
}

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [1, 2, 0],
  [2, 1, 0],
  [1, 1, 0],
  [2, 3, 0],
];

/** CALC.3.2 — implicit differentiation. */
export function implicit(kinds = [0, 1, 2, 3, 4]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const [p0, q0] = pick(TRIPLES);
    const p = p0 * pick([1, -1]);
    const q = q0 * pick([1, -1]);
    return mk(
      {
        key: `im-c-${p}-${q}`,
        prompt: `x² + y² = ${p * p + q * q}. Find dy/dx at (${fmt(p)}, ${fmt(q)}).`,
        hint: "Differentiate both sides: 2x + 2y·dy/dx = 0. Then solve for dy/dx.",
        explain: `dy/dx = −x/y = −(${fmt(p)})/(${fmt(q)}) = ${fr(-p, q)}.`,
      },
      label(fr(-p, q), [fr(p, q), fr(-q, p), fr(q, p)], ["0", fr(-p * 2, q), "−1"]),
    );
  }
  if (kind === 1) {
    const p = nz(-6, 6);
    const q = nz(-6, 6);
    return mk(
      {
        key: `im-xy-${p}-${q}`,
        prompt: `xy = ${p * q}. Find dy/dx at (${fmt(p)}, ${fmt(q)}).`.replace("= -", "= −"),
        hint: "Product rule on xy: y + x·dy/dx = 0.",
        explain: `dy/dx = −y/x = −(${fmt(q)})/(${fmt(p)}) = ${fr(-q, p)}.`,
      },
      label(fr(-q, p), [fr(q, p), fr(-p, q), fr(p, q)], ["0", "1", "−1", fr(-q, 2 * p)]),
    );
  }
  if (kind === 2) {
    let a = 1;
    let p = 1;
    let q = 1;
    do {
      a = pick([1, 2, -1, 3]);
      p = rand(-3, 3);
      q = nz(-3, 3);
    } while (a * p + 2 * q === 0 || 2 * p + a * q === 0 || a + 2 * q === 0);
    const c = p * p + a * p * q + q * q;
    const ax = a === 1 ? "xy" : a === -1 ? "xy" : `${Math.abs(a)}xy`;
    const eqn = `x² ${a < 0 ? "−" : "+"} ${ax} + y² = ${fmt(c)}`;
    return mk(
      {
        key: `im-mix-${a}-${p}-${q}`,
        prompt: `${eqn}. dy/dx at (${fmt(p)}, ${fmt(q)})?`,
        hint: "Differentiate each term. The xy term needs the product rule: y + x·dy/dx.",
        explain: `2x ${a < 0 ? "−" : "+"} ${Math.abs(a) === 1 ? "" : Math.abs(a)}(y + x·y′) + 2y·y′ = 0, so y′ = −(${terms([[2, "x"], [a, "y"]], "")})/(${terms([[a, "x"], [2, "y"]], "")}) = ${fr(-(2 * p + a * q), a * p + 2 * q)}.`,
      },
      label(fr(-(2 * p + a * q), a * p + 2 * q), [fr(2 * p + a * q, a * p + 2 * q), fr(-(a * p + 2 * q), 2 * p + a * q), fr(-2 * p, a + 2 * q)], ["0", "1"]),
    );
  }
  if (kind === 3) {
    const n = rand(2, 6);
    const c = rand(1, 5);
    const lead = c * n === 1 ? "" : String(c * n);
    const yp = xp(n - 1, "y");
    return mk(
      {
        key: `im-yn-${n}-${c}`,
        prompt: "y is a function of x. Differentiate with respect to x.",
        math: `d/dx (${c === 1 ? "" : c}${xp(n, "y")})`,
        hint: "Power rule as usual, then the chain rule adds a factor of dy/dx.",
        explain: `${lead}${yp} times dy/dx, because y depends on x.`,
      },
      label(`${lead}${yp}·dy/dx`, [`${lead}${yp}`, `${lead}${xp(n - 1)}`, `${c === 1 ? "" : c}${xp(n, "y")}·dy/dx`]),
    );
  }
  const q = nz(-6, 6);
  const divisors = [1, 2, 3, 4, 6, 8, 9, 12, 16, 18, 36].filter((d) => (q * q) % d === 0);
  const p = pick(divisors);
  const k = (q * q) / p;
  return mk(
    {
      key: `im-par-${p}-${q}`,
      prompt: `y² = ${k === 1 ? "" : k}x. Find dy/dx at (${p}, ${fmt(q)}).`,
      hint: "2y·dy/dx = (the derivative of the right side).",
      explain: `2y·y′ = ${k}, so y′ = ${k}/(2y) = ${k}/(${fmt(2 * q)}) = ${fr(k, 2 * q)}.`,
    },
    label(fr(k, 2 * q), [fr(k, q), fr(-k, 2 * q), fr(2 * q, k)], [fr(k, 2 * p), "0"]),
  );
}

/** CALC.3.3 — derivatives of inverse functions. */
export function inverseFn(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const xs = [1, 2, 3, 4];
    let fv: number[] = [];
    do {
      fv = shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4).sort((a, b) => a - b);
    } while (fv[0] > 4);
    const fpv = xs.map(() => rand(2, 7));
    const a = fv[0] <= 4 ? 1 : 2;
    const b = fv[a - 1];
    const right = fr(1, fpv[a - 1]);
    const trap = b <= 4 ? fr(1, fpv[b - 1]) : fr(1, fpv[a - 1] + 1);
    return mk(
      {
        key: `if-tab-${fv.join("_")}-${fpv.join("_")}`,
        prompt: `f is increasing and g = f⁻¹. Find g′(${b}).`,
        math: `g′(${b})`,
        visual: { kind: "table", header: ["x", "f(x)", "f′(x)"], rows: xs.map((x, i) => [x, fv[i], fpv[i]]) },
        needsVisual: true,
        hint: `g′(b) = 1/f′(a), where f(a) = b. Find which x gives f(x) = ${b} first.`,
        explain: `f(${a}) = ${b}, so g′(${b}) = 1/f′(${a}) = 1/${fpv[a - 1]}.`,
      },
      label(right, [trap, fmt(fpv[a - 1]), fr(-1, fpv[a - 1])], [fr(1, b), fmt(-fpv[a - 1])]),
    );
  }
  if (kind === 1) {
    const p = rand(1, 5);
    const q = rand(-5, 5);
    const a = rand(-2, 2);
    const k = a ** 3 + p * a + q;
    const d = 3 * a * a + p;
    return mk(
      {
        key: `if-cub-${p}-${q}-${a}`,
        prompt: `f(x) = ${poly([[1, 3], [p, 1], [q, 0]])} and g = f⁻¹. f(${fmt(a)}) = ${fmt(k)}.`,
        math: `g′(${fmt(k)})`,
        hint: "(f⁻¹)′(b) = 1/f′(a) where f(a) = b. Don't plug b into f′.",
        explain: `f′(x) = 3x² + ${p}, so f′(${fmt(a)}) = ${d} and g′(${fmt(k)}) = 1/${d}.`,
      },
      label(fr(1, d), [fr(1, 3 * k * k + p), fmt(d), fr(-1, d)], [fr(1, a * a + p || 7)]),
    );
  }
  const m = nz(-6, 6);
  const b = rand(-5, 5);
  const t = rand(-5, 9);
  return mk(
    {
      key: `if-lin-${m}-${b}-${t}`,
      prompt: `f(x) = ${lin(m, b)} and g = f⁻¹.`,
      math: `g′(${fmt(t)})`,
      hint: "A line's inverse is a line. Slopes of inverses are reciprocals.",
      explain: `f has slope ${fmt(m)} everywhere, so g has slope 1/${fmt(m)} = ${fr(1, m)} everywhere.`,
    },
    label(fr(1, m), [fmt(m), fr(-1, m), fr(1, t || 2)], [fmt(-m), "1"]),
  );
}

/** CALC.3.4 — derivatives of inverse trig functions. */
export function inverseTrig(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const k = rand(1, 5);
    const fn = pick(["arcsin", "arccos", "arctan"]);
    const kx = k === 1 ? "x" : `${k}x`;
    const k2 = k === 1 ? "x²" : `${k * k}x²`;
    const kk = k === 1 ? "1" : String(k);
    const asin = (s: string, num = kk) => `${s}${num}/√(1 − ${k2})`;
    const atan = (s: string, num = kk) => `${s}${num}/(1 + ${k2})`;
    const right = fn === "arcsin" ? asin("") : fn === "arccos" ? asin("−") : atan("");
    const wrongs =
      fn === "arcsin"
        ? [asin("−"), atan(""), asin("", "1")]
        : fn === "arccos"
          ? [asin(""), atan("−"), asin("−", "1")]
          : [atan("−"), asin(""), atan("", "1")];
    return mk(
      {
        key: `it-sym-${fn}-${k}`,
        prompt: "Differentiate.",
        math: `d/dx ${fn}(${kx})`,
        hint: "arcsin → 1/√(1 − u²), arccos → −1/√(1 − u²), arctan → 1/(1 + u²). Then chain rule: times u′.",
        explain: `With u = ${kx}, u′ = ${k}: d/dx ${fn}(${kx}) = ${right}.`,
      },
      label(right, wrongs, [k === 1 ? atan("", "2") : `${kk}/(1 + ${kx}²)`]),
    );
  }
  if (kind === 1) {
    const a = pick([0, 1, 2, 3, 7, -1, -2, -3]);
    const k = rand(1, 6);
    const v = k / (1 + a * a);
    return mk(
      {
        key: `it-val-${a}-${k}`,
        prompt: `f(x) = ${k === 1 ? "" : `${k} `}arctan x`,
        math: `f′(${fmt(a)})`,
        hint: "d/dx arctan x = 1/(1 + x²).",
        explain: `f′(${fmt(a)}) = ${k}/(1 + ${a * a}) = ${ds(v)}.`,
      },
      kpos(v),
    );
  }
  if (kind === 2) {
    const fn = pick(["arcsin", "arccos"]);
    const at = pick([
      { x: "0", v: "1" },
      { x: "1/2", v: "2/√3" },
      { x: "√2/2", v: "√2" },
      { x: "√3/2", v: "2" },
    ]);
    const neg = fn === "arccos";
    const val = neg ? `−${at.v}` : at.v;
    const pool = ["1", "2/√3", "√2", "2", "1/2", "√3"].flatMap((s) => [s, `−${s}`]).filter((s) => s !== val);
    return mk(
      {
        key: `it-pt-${fn}-${at.x}`,
        prompt: `f(x) = ${fn} x`,
        math: `f′(${at.x})`,
        hint: `f′(x) = ${neg ? "−" : ""}1/√(1 − x²). Square the x-value first.`,
        explain: `1 − (${at.x})² = ${at.x === "0" ? "1" : at.x === "1/2" ? "3/4" : at.x === "√2/2" ? "1/2" : "1/4"}, so f′ = ${val}.`,
      },
      label(val, [neg ? at.v : `−${at.v}`, ...shuffle(pool).slice(0, 3)]),
    );
  }
  const n = rand(2, 3);
  const asin = Math.random() < 0.4;
  const inner = xp(n);
  const d = `${n}${xp(n - 1)}`;
  const right = asin ? `${d}/√(1 − ${xp(2 * n)})` : `${d}/(1 + ${xp(2 * n)})`;
  return mk(
    {
      key: `it-ch-${n}-${asin}`,
      prompt: "Chain rule with an inverse trig function.",
      math: `d/dx ${asin ? "arcsin" : "arctan"}(${inner})`,
      hint: `Use u = ${inner}, so u² = ${xp(2 * n)} and u′ = ${d}.`,
      explain: `${asin ? "1/√(1 − u²)" : "1/(1 + u²)"} times u′: ${right}.`,
    },
    label(right, asin ? [`1/√(1 − ${xp(2 * n)})`, `${d}/√(1 − ${inner})`, `${d}/(1 + ${xp(2 * n)})`] : [`1/(1 + ${xp(2 * n)})`, `${d}/(1 + ${inner})`, `${d}/(1 + ${xp(2 * n)})²`]),
  );
}

/** CALC.3.5 — second and higher derivatives. */
export function higherDerivatives(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const P: Poly = [[nz(-3, 3), 4], [rand(-4, 4), 3], [rand(-6, 6), 2], [rand(-9, 9), 1], [rand(-9, 9), 0]];
    const D2 = pder(pder(P));
    const a = rand(-2, 2);
    const v = pval(D2, a);
    return mk(
      {
        key: `hd-p-${P.join("|")}-${a}`,
        prompt: `f(x) = ${poly(P)}`,
        math: `f″(${fmt(a)})`,
        hint: "Differentiate twice, then plug in.",
        explain: `f′(x) = ${poly(pder(P))}, f″(x) = ${poly(D2)}, so f″(${fmt(a)}) = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const k = pick([2, 3, -2, -3, 2, 3]);
    const n = rand(2, 4);
    const v = k ** n;
    const ord = n === 2 ? "″" : n === 3 ? "‴" : sup("(4)");
    return mk(
      {
        key: `hd-e-${k}-${n}`,
        prompt: `f(x) = e${sup(k)}ˣ`,
        math: `f${ord}(0)`,
        say: talk(`f(x) = e${sup(k)}ˣ. Find derivative number ${n} at 0.`),
        hint: `Each derivative multiplies by another ${fmt(k)}.`,
        explain: `The ${n === 2 ? "2nd" : n === 3 ? "3rd" : "4th"} derivative is (${fmt(k)})${sup(n)}e${sup(k)}ˣ, which at 0 is ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 2) {
    const n = rand(2, 12);
    const start = pick(["sin x", "cos x"]);
    const cycle = start === "sin x" ? ["sin x", "cos x", "−sin x", "−cos x"] : ["cos x", "−sin x", "−cos x", "sin x"];
    const right = cycle[n % 4];
    return mk(
      {
        key: `hd-trig-${start}-${n}`,
        prompt: `f(x) = ${start}. Find derivative number ${n}.`,
        say: talk(`f(x) = ${start}. Find derivative number ${n}.`),
        hint: "The derivatives of sin and cos repeat every 4 steps. Divide by 4 and look at the remainder.",
        explain: `${n} = 4·${Math.floor(n / 4)} + ${n % 4}, so it matches derivative number ${n % 4}: ${right}.`,
      },
      label(right, cycle.filter((c) => c !== right)),
    );
  }
  const n = rand(3, 7);
  const c = pick([1, 2, 3, -1]);
  const right = poly([[c * n * (n - 1), n - 2]]);
  return mk(
    {
      key: `hd-sym-${n}-${c}`,
      prompt: "Find the second derivative.",
      math: `d²y/dx² of y = ${poly([[c, n]])}`,
      hint: "Use the power rule twice.",
      explain: `y′ = ${poly([[c * n, n - 1]])}, y″ = ${right}.`,
    },
    label(right, [poly([[c * n, n - 1]]), poly([[c * n * (n - 1), n - 1]]), poly([[c * n * n, n - 2]])]),
  );
}

/** CALC.2.7, CALC.2.8, CALC.3.1 — sort functions by the rule you need to differentiate them. */
export function whichRuleSort(): Question {
  return sortTask(
    {
      key: "wr",
      prompt: "Sort: which rule do you need for each derivative?",
      hint: "Two factors multiplied: product. One over another: quotient. A function inside a function: chain.",
      explain: "Look at the outermost operation: a product, a quotient, a composition, or just sums of basic functions.",
    },
    ["product rule", "quotient rule", "chain rule", "basic rules only"],
    [
      ["x² sin x", "x eˣ", "x³ ln x", "eˣ cos x", "√x · sin x", "(x + 1)eˣ"],
      ["sin x / x", "eˣ/(x + 1)", "(x² + 1)/(x − 3)", "ln x / x²", "x/(x² + 4)"],
      ["sin(x²)", "e³ˣ", "(2x + 1)⁵", "√(x² + 9)", "ln(cos x)", "cos(5x)"],
      ["x⁵ + 3x", "4eˣ − sin x", "7 ln x", "3/x²", "x⁴ − 2√x"],
    ],
    1,
    2,
  );
}

/* ===================================================== 4. Derivatives at work */

const CTX = [
  { f: "V", what: "the water in a tank", q: "volume", u: "liters", t: "minute" },
  { f: "T", what: "a mug of cocoa's temperature", q: "temperature", u: "degrees", t: "minute" },
  { f: "P", what: "a town's population", q: "population", u: "people", t: "year" },
  { f: "h", what: "a balloon's height", q: "height", u: "meters", t: "second" },
  { f: "D", what: "the depth of snow", q: "depth", u: "inches", t: "hour" },
  { f: "B", what: "a savings balance", q: "balance", u: "dollars", t: "month" },
];

/** CALC.4.1, CALC.4.3 — what a derivative means in context, with units and estimates. */
export function derivativeMeaning(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  const C = pick(CTX);
  const c = rand(1, 12);
  if (kind === 0) {
    const k = nz(-9, 9);
    const dir = (s: number) => (s > 0 ? "increasing" : "decreasing");
    const right = `At t = ${c}, the ${C.q} is ${dir(k)} ${Math.abs(k)} ${C.u} per ${C.t}.`;
    return mk(
      {
        key: `dm-int-${C.f}-${c}-${k}`,
        prompt: `${C.f}(t) is ${C.what} (${C.u}), t in ${C.t}s. ${C.f}′(${c}) = ${fmt(k)} means…`,
        hint: "A derivative is a rate at one instant: units of the output per unit of time. Its sign says up or down.",
        explain: `${C.f}′(${c}) = ${fmt(k)} is a rate at the instant t = ${c}: ${dir(k)} at ${Math.abs(k)} ${C.u} per ${C.t}.`,
      },
      label(right, [
        `At t = ${c}, the ${C.q} is ${Math.abs(k)} ${C.u}.`,
        `In the first ${c} ${C.t}s, the ${C.q} changed by ${Math.abs(k)} ${C.u}.`,
        `At t = ${c}, the ${C.q} is ${dir(-k)} ${Math.abs(k)} ${C.u} per ${C.t}.`,
      ]),
    );
  }
  if (kind === 1) {
    const right = `${C.u} per ${C.t}`;
    return mk(
      {
        key: `dm-unit-${C.f}-${c}`,
        prompt: `${C.f}(t) is ${C.what} in ${C.u}, t in ${C.t}s. Units of ${C.f}′(${c})?`,
        hint: "A derivative divides a change in output by a change in input.",
        explain: `${C.f}′ = (change in ${C.u})/(change in ${C.t}s), so its units are ${right}.`,
      },
      label(right, [C.u, `${C.t}s per ${C.u.replace(/s$/, "")}`, `${C.u} per ${C.t} per ${C.t}`, `${C.t}s`]),
    );
  }
  if (kind === 2) {
    const A = rand(2, 50) * 10;
    const r = nz(-12, 12);
    const h = rand(1, 3);
    const v = A + r * h;
    return mk(
      {
        key: `dm-est-${C.f}-${c}-${A}-${r}-${h}`,
        prompt: `${C.f}(${c}) = ${A} ${C.u} and ${C.f}′(${c}) = ${fmt(r)} ${C.u} per ${C.t}. Estimate ${C.f}(${c + h}).`,
        hint: "New value ≈ old value + rate × time passed.",
        explain: `${A} + (${fmt(r)})(${h}) = ${v} ${C.u}.`,
        unit: C.u,
      },
      kp(v),
    );
  }
  const d = rand(1, 3);
  const rate = nz(-8, 8);
  const y0 = rand(20, 90);
  const ys = [y0, y0 + rate * d + rand(-2, 2), y0 + 2 * rate * d];
  const ts = [c, c + d, c + 2 * d];
  return mk(
    {
      key: `dm-tab-${C.f}-${c}-${d}-${ys.join("_")}`,
      prompt: `Estimate ${C.f}′(${ts[1]}) for ${C.what}.`,
      eq: [`${C.f}′(${ts[1]})`, "≈", "?"],
      visual: { kind: "table", header: [`t (${C.t}s)`, ...ts.map(String)], rows: [[`${C.f}(t)`, ...ys]] },
      needsVisual: true,
      hint: `Use the values on either side of t = ${ts[1]}.`,
      explain: `(${ys[2]} − ${ys[0]})/(${ts[2]} − ${ts[0]}) = ${fmt(rate)} ${C.u} per ${C.t}.`,
      unit: `${C.u} per ${C.t}`,
    },
    kp(rate),
  );
}

/** CALC.4.2 — position, velocity and acceleration. */
export function motion(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 2) {
    const [p, q] = pick([[1, 3], [2, 4], [1, 5], [3, 5], [2, 6], [1, 7], [4, 6], [3, 7]]);
    const P: Poly = [[1, 3], [(-3 * (p + q)) / 2, 2], [3 * p * q, 1], [rand(-5, 5), 0]];
    return mk(
      {
        key: `mo-rest-${p}-${q}-${P[3][0]}`,
        prompt: `s(t) = ${poly(P, "t")}. When is the particle at rest?`,
        hint: "At rest means velocity is 0. Find v(t) = s′(t) and solve v(t) = 0.",
        explain: `v(t) = 3t² − ${3 * (p + q)}t + ${3 * p * q} = 3(t − ${p})(t − ${q}), which is 0 at t = ${p} and t = ${q}.`,
      },
      label(`t = ${p} and t = ${q}`, [`t = ${(p + q) / 2}`, `t = −${p} and t = −${q}`, `t = 0 and t = ${p + q}`]),
    );
  }
  let P: Poly;
  let t0: number;
  let v: number;
  let a: number;
  do {
    P = [[1, 3], [rand(-6, 2), 2], [rand(-9, 9), 1], [rand(-5, 5), 0]];
    t0 = rand(0, 4);
    v = pval(pder(P), t0);
    a = pval(pder(pder(P)), t0);
  } while (kind === 3 && (v === 0 || a === 0));
  const s = poly(P, "t");
  if (kind === 0 || kind === 1) {
    const vel = kind === 0;
    return mk(
      {
        key: `mo-${vel ? "v" : "a"}-${P.join("|")}-${t0}`,
        prompt: `Position s(t) = ${s}.`,
        math: `${vel ? "v" : "a"}(${t0})`,
        hint: vel ? "Velocity is the derivative of position." : "Acceleration is the derivative of velocity: the second derivative of position.",
        explain: vel
          ? `v(t) = ${poly(pder(P), "t")}, so v(${t0}) = ${fmt(v)}.`
          : `v(t) = ${poly(pder(P), "t")}, a(t) = ${poly(pder(pder(P)), "t")}, so a(${t0}) = ${fmt(a)}.`,
      },
      kp(vel ? v : a),
    );
  }
  const st = (vv: number, aa: number) => `moving ${vv > 0 ? "right" : "left"}, ${vv * aa > 0 ? "speeding up" : "slowing down"}`;
  const right = st(v, a);
  return mk(
    {
      key: `mo-dir-${P.join("|")}-${t0}`,
      prompt: `s(t) = ${s}. At t = ${t0}, the particle is…`,
      hint: "The sign of v gives the direction. Speeding up when v and a have the same sign.",
      explain: `v(${t0}) = ${fmt(v)} and a(${t0}) = ${fmt(a)}: ${right}.`,
    },
    label(right, [st(-v, a), st(v, -a), st(-v, -a)]),
  );
}

/** CALC.4.3 — rates of change in applied settings. */
export function appliedRates(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const c = pick([0.5, 1, 2]);
    const b = rand(1, 8) * 5;
    const F = rand(1, 9) * 100;
    const n = rand(2, 10) * 5;
    const v = b + 2 * c * n;
    return mk(
      {
        key: `ap-mc-${c}-${b}-${F}-${n}`,
        prompt: `Making x shirts costs C(x) = ${poly([[c, 2], [b, 1], [F, 0]])} dollars. Find C′(${n}).`,
        hint: "Marginal cost is C′(x): about the cost of one more shirt.",
        explain: `C′(x) = ${poly([[2 * c, 1], [b, 0]])}, so C′(${n}) = $${v} per shirt.`,
        prefix: "$",
        unit: "per shirt",
      },
      kpos(v),
    );
  }
  if (kind === 1) {
    const k = rand(2, 9);
    const shape = pick(["circle", "sphere", "cube", "square"] as const);
    if (shape === "circle" || shape === "sphere") {
      const right = shape === "circle" ? piFr(2 * k) : piFr(4 * k * k);
      return mk(
        {
          key: `ap-geo-${shape}-${k}`,
          prompt: shape === "circle" ? `A = πr². How fast does A change with r when r = ${k}?` : `V = (4/3)πr³. dV/dr when r = ${k}?`,
          visual: shape === "circle" ? { kind: "circle", r: k, show: "radius", unit: "" } : { kind: "solid", solid: "sphere", r: k },
          hint: "Differentiate the formula with respect to r, then plug in.",
          explain: shape === "circle" ? `dA/dr = 2πr = ${right}.` : `dV/dr = 4πr² = ${right}.`,
        },
        label(right, shape === "circle" ? [piFr(k * k), piFr(k), String(2 * k)] : [piFr(4 * k ** 3, 3), piFr(2 * k * k), String(4 * k * k)]),
      );
    }
    const v = shape === "cube" ? 3 * k * k : 2 * k;
    return mk(
      {
        key: `ap-geo-${shape}-${k}`,
        prompt: shape === "cube" ? `V = s³ for a cube. dV/ds when s = ${k}?` : `A = s² for a square. dA/ds when s = ${k}?`,
        hint: "Power rule, then plug in.",
        explain: shape === "cube" ? `dV/ds = 3s² = ${v}.` : `dA/ds = 2s = ${v}.`,
      },
      kpos(v),
    );
  }
  if (kind === 2) {
    const m = rand(1, 5);
    const j = rand(2, 9);
    const S = pick([20, 25, 68, 70, 72]);
    return mk(
      {
        key: `ap-cool-${m}-${j}-${S}`,
        prompt: `T(t) = ${S} + ${10 * j}e^(−0.${m}t) °F. How fast is T changing at t = 0?`,
        hint: "d/dt e^(kt) = k·e^(kt). At t = 0, e⁰ = 1.",
        explain: `T′(t) = ${10 * j}(−0.${m})e^(−0.${m}t), so T′(0) = ${fmt(-m * j)} °F per minute.`,
        unit: "°F per min",
      },
      kp(-m * j),
    );
  }
  const a = rand(4, 10);
  const b = rand(1, 2);
  const t = rand(0, Math.floor((a - 1) / b));
  const v = -2 * b * (a - b * t);
  return mk(
    {
      key: `ap-drain-${a}-${b}-${t}`,
      prompt: `Water depth h(t) = (${a} − ${b === 1 ? "" : b}t)² cm. Find h′(${t}).`,
      hint: "Chain rule: 2(inside)·(inside)′.",
      explain: `h′(t) = 2(${a} − ${b === 1 ? "" : b}t)(−${b}), so h′(${t}) = ${fmt(v)} cm per second.`,
      unit: "cm/s",
    },
    kp(v),
  );
}

/** CALC.4.4 — related rates: 0–2 and 5–6 growing shapes and tanks, 3–4 ladders and cars. */
export function relatedRates(kinds = [0, 1, 2, 3, 4, 5, 6]): Question {
  const kind = pick(kinds);
  if (kind === 5) {
    const R = rand(2, 6);
    const k = rand(1, 5);
    const askLevel = Math.random() < 0.5;
    const rate = piFr(R * R * k);
    const visual: Visual = { kind: "solid", solid: "cylinder", r: R, h: "h", unit: "ft" };
    const hint = "V = πr²h with r fixed, so dV/dt = πr²·dh/dt.";
    if (askLevel) {
      return mk(
        {
          key: `rr-cyl-up-${R}-${k}`,
          prompt: `Water pours at ${rate} ft³/min into a cylinder tank of radius ${R} ft. How fast does the level rise?`,
          say: `Water pours at ${R * R * k} pi cubic feet per minute into a cylinder tank of radius ${R} feet. How fast does the level rise?`,
          visual,
          hint,
          explain: `${rate} = π(${R})²·dh/dt, so dh/dt = ${k} ft/min.`,
          unit: "ft/min",
        },
        kpos(k),
      );
    }
    return mk(
      {
        key: `rr-cyl-v-${R}-${k}`,
        prompt: `A cylinder tank of radius ${R} ft fills so the water rises ${k} ft/min. How fast is the volume growing?`,
        visual,
        hint,
        explain: `dV/dt = π(${R})²(${k}) = ${rate} ft³/min.`,
      },
      label(rate, [piFr(2 * R * k), piFr(R * R), String(R * R * k), piFr(R * k)], [piFr(R * R * k, 3), piFr(2 * R * R * k)]),
    );
  }
  if (kind === 6) {
    const H = rand(2, 8);
    const k = rand(1, 3);
    const right = piFr(H * H * k);
    return mk(
      {
        key: `rr-sand-${H}-${k}`,
        prompt: `Sand piles into a cone with r = h. The height rises ${k} ft/min. How fast is the volume growing when h = ${H} ft?`,
        visual: { kind: "solid", solid: "cone", r: "r", h: "h", unit: "ft" },
        hint: "V = (1/3)πr²h = (1/3)πh³ when r = h. Differentiate: dV/dt = πh²·dh/dt.",
        explain: `dV/dt = π(${H})²(${k}) = ${right} ft³/min.`,
      },
      label(right, [piFr(H * H * k, 3), piFr(H ** 3 * k, 3), piFr(2 * H * k), String(H * H * k)], [piFr(3 * H * H * k), piFr(H * H)]),
    );
  }
  if (kind === 0 || kind === 1) {
    const R = rand(2, 10);
    const k = rand(1, 4);
    const circle = kind === 0;
    const right = circle ? piFr(2 * R * k) : piFr(4 * R * R * k);
    return mk(
      {
        key: `rr-${circle ? "c" : "s"}-${R}-${k}`,
        prompt: circle
          ? `A ripple's radius grows ${k} cm/s. How fast is its area growing when r = ${R} cm?`
          : `A balloon's radius grows ${k} cm/s. How fast is its volume growing when r = ${R} cm?`,
        visual: circle ? { kind: "circle", r: R, show: "radius", unit: "cm" } : { kind: "solid", solid: "sphere", r: R, unit: "cm" },
        hint: circle ? "A = πr², so dA/dt = 2πr·dr/dt." : "V = (4/3)πr³, so dV/dt = 4πr²·dr/dt.",
        explain: circle ? `dA/dt = 2π(${R})(${k}) = ${right} cm²/s.` : `dV/dt = 4π(${R})²(${k}) = ${right} cm³/s.`,
      },
      label(right, circle ? [piFr(R * R * k), piFr(R * k), String(2 * R * k)] : [piFr(4 * R ** 3 * k, 3), piFr(4 * R * R), piFr(2 * R * k)], circle ? [] : [piFr(R * R * k), String(4 * R * R * k)]),
    );
  }
  if (kind === 2) {
    const s = rand(2, 12);
    const k = rand(1, 5);
    const cube = Math.random() < 0.5;
    const v = cube ? 3 * s * s * k : 2 * s * k;
    return mk(
      {
        key: `rr-sq-${s}-${k}-${cube}`,
        prompt: `A ${cube ? "cube" : "square"}'s side grows ${k} cm/s. How fast is its ${cube ? "volume" : "area"} growing when the side is ${s} cm?`,
        hint: cube ? "V = s³, so dV/dt = 3s²·ds/dt." : "A = s², so dA/dt = 2s·ds/dt.",
        explain: cube ? `3(${s})²(${k}) = ${v} cm³/s.` : `2(${s})(${k}) = ${v} cm²/s.`,
        unit: cube ? "cm³/s" : "cm²/s",
      },
      kpos(v),
    );
  }
  const [x, y, L] = pick(TRIPLES.filter((t) => t[2] > 0));
  if (kind === 3) {
    const v = rand(1, 4);
    return mk(
      {
        key: `rr-lad-${x}-${y}-${v}`,
        prompt: `A ${L} ft ladder's foot slides out at ${v} ft/s. How fast does the top slide down when the foot is ${x} ft out?`,
        visual: { kind: "righttri", a: y, b: x, c: L, unit: "ft" },
        hint: "x² + y² = L². Differentiate: 2x·x′ + 2y·y′ = 0, so y′ = −x·x′/y.",
        explain: `The top is ${y} ft up. y′ = −(${x})(${v})/${y} = ${fr(-x * v, y)}, so it slides down at ${fr(x * v, y)} ft/s.`,
      },
      label(fr(x * v, y), [fr(y * v, x), String(v), fr(x * v, L)], [fr(L * v, y)]),
    );
  }
  const p = rand(1, 6);
  const q = rand(1, 6);
  return mk(
    {
      key: `rr-cars-${x}-${y}-${p}-${q}`,
      prompt: `Car A is ${x} mi east, going ${p} mi/min east. Car B is ${y} mi north, going ${q} mi/min north. Rate the distance grows?`,
      visual: { kind: "righttri", a: y, b: x, c: "?", unit: "mi" },
      hint: "z² = x² + y², so z·z′ = x·x′ + y·y′. Find z first.",
      explain: `z = ${L}. z′ = (${x}·${p} + ${y}·${q})/${L} = ${fr(x * p + y * q, L)} mi/min.`,
    },
    label(fr(x * p + y * q, L), [String(p + q), fr(x * q + y * p, L), String(x * p + y * q)], [fr(p * q, L)]),
  );
}

const CONCAVE = [
  { f: "√x", at: [1, 4, 9, 16], up: false },
  { f: "eˣ", at: [0, 1, 2], up: true },
  { f: "x²", at: [-2, -1, 1, 2, 3], up: true },
  { f: "ln x", at: [1, 2, 5], up: false },
  { f: "x³", at: [1, 2], up: true },
  { f: "x³", at: [-1, -2], up: false },
  { f: "1/x", at: [1, 2], up: true },
  { f: "−x²", at: [-1, 1, 2], up: false },
  { f: "∛x", at: [1, 8], up: false },
];

/** CALC.4.5 — local linear approximation. */
export function linearApprox(kinds = [0, 1, 2, 3, 4]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(-3, 5);
    const A = rand(3, 9);
    const m = nz(-5, 5);
    const h = pick([0.1, 0.2, 0.3, -0.1, -0.2, 0.5]);
    const v = A + m * h;
    return mk(
      {
        key: `la-v-${a}-${A}-${m}-${h}`,
        prompt: `f(${fmt(a)}) = ${A}, f′(${fmt(a)}) = ${fmt(m)}. Use the tangent line to estimate f(${ds(a + h)}).`,
        hint: "L(x) = f(a) + f′(a)(x − a).",
        explain: `L(${ds(a + h)}) = ${A} + (${fmt(m)})(${ds(h)}) = ${ds(v)}.`,
      },
      kpos(v),
    );
  }
  if (kind === 1) {
    const n = rand(2, 10);
    const k = pick([-2, -1, 1, 2, 3]);
    const x = clean(n * n + (n * k) / 5);
    return mk(
      {
        key: `la-sq-${n}-${k}`,
        prompt: `Use the tangent line to √x at x = ${n * n} to estimate √${ds(x)}.`,
        hint: `L(x) = ${n} + (1/(2·${n}))(x − ${n * n}).`,
        explain: `√${ds(x)} ≈ ${n} + (${ds(x - n * n)})/${2 * n} = ${ds(n + k / 10)}.`,
      },
      kpos(n + k / 10),
    );
  }
  if (kind === 2) {
    const n = rand(2, 5);
    const k = pick([-2, -1, 1, 2, 3]);
    const x = clean(n ** 3 + (3 * n * n * k) / 10);
    return mk(
      {
        key: `la-cb-${n}-${k}`,
        prompt: `Use the tangent line to ∛x at x = ${n ** 3} to estimate ∛${ds(x)}.`,
        hint: `d/dx ∛x = 1/(3∛(x²)), which is 1/${3 * n * n} at x = ${n ** 3}.`,
        explain: `∛${ds(x)} ≈ ${n} + (${ds(x - n ** 3)})/${3 * n * n} = ${ds(n + k / 10)}.`,
      },
      kpos(n + k / 10),
    );
  }
  if (kind === 3) {
    if (Math.random() < 0.15) {
      const m = nz(-4, 4);
      const b = rand(-5, 5);
      return mk(
        {
          key: `la-ou-lin-${m}-${b}`,
          prompt: `Is the tangent line estimate for f(x) = ${lin(m, b)} near x = 1 over or under?`,
          hint: "How does the tangent line compare with f when f is already a line?",
          explain: "f is a line, so its tangent line is f itself: the estimate is exact.",
        },
        label("exactly right", ["an overestimate", "an underestimate"]),
      );
    }
    const C = pick(CONCAVE);
    const a = pick(C.at);
    return mk(
      {
        key: `la-ou-${C.f}-${a}`,
        prompt: `Tangent line to f(x) = ${C.f} at x = ${fmt(a)}: does it overestimate or underestimate nearby?`,
        hint: "Concave up: the curve bends above its tangent lines. Concave down: below them.",
        explain: `f is concave ${C.up ? "up" : "down"} there, so the tangent line sits ${C.up ? "below" : "above"} the curve: an ${C.up ? "under" : "over"}estimate.`,
      },
      label(C.up ? "an underestimate" : "an overestimate", [C.up ? "an overestimate" : "an underestimate", "exactly right"]),
    );
  }
  const form = rand(0, 2);
  if (form === 0) {
    const n = rand(2, 10);
    const h = pick([0.01, 0.02, 0.03, -0.01, -0.02]);
    return mk(
      {
        key: `la-pw-${n}-${h}`,
        prompt: `Estimate (${ds(1 + h)})${sup(n)} with the tangent line to x${sup(n)} at x = 1.`,
        hint: `L(x) = 1 + ${n}(x − 1).`,
        explain: `1 + ${n}(${ds(h)}) = ${ds(1 + n * h)}.`,
      },
      kpos(1 + n * h),
    );
  }
  const h = pick([0.1, 0.2, 0.05, 0.3, 0.02, 0.04]);
  const ex = form === 1;
  return mk(
    {
      key: `la-el-${ex}-${h}`,
      prompt: ex ? `Estimate e^${ds(h)} with the tangent line to eˣ at x = 0.` : `Estimate ln(${ds(1 + h)}) with the tangent line to ln x at x = 1.`,
      hint: ex ? "The tangent to eˣ at 0 is y = 1 + x." : "The tangent to ln x at 1 is y = x − 1.",
      explain: ex ? `e^${ds(h)} ≈ 1 + ${ds(h)} = ${ds(1 + h)}.` : `ln(${ds(1 + h)}) ≈ ${ds(1 + h)} − 1 = ${ds(h)}.`,
    },
    kpos(ex ? 1 + h : h),
  );
}

const LHOP = {
  yes: "yes: it's 0/0",
  plug: "no: plugging in already works",
  blow: "no: it's (nonzero)/0, so it blows up",
  any: "yes: you can always use it",
};

/** CALC.4.6 — L'Hôpital's rule. */
export function lhopital(kinds = [0, 1, 2, 3, 4]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const form = rand(0, 2);
    const a = nz(-6, 6);
    let b = nz(-6, 6);
    while (b === a) b = nz(-6, 6);
    const e = (k: number) => (k === 1 ? "eˣ" : k === -1 ? "e⁻ˣ" : `e${sup(k)}ˣ`);
    const math = form === 0 ? `(${e(a)} − 1)/x` : form === 1 ? `ln(1 + ${Math.abs(a) === 1 ? "" : Math.abs(a)}x)/x` : `(${e(a)} − ${e(b)})/x`;
    const v = form === 0 ? a : form === 1 ? Math.abs(a) : a - b;
    return mk(
      {
        key: `lh-e-${form}-${a}-${b}`,
        prompt: "It's 0/0. Use L'Hôpital's rule.",
        math: `${lim(0)} ${math}`,
        hint: "Differentiate the top and the bottom separately, then take the limit.",
        explain: `Top′ over bottom′ at x = 0 gives ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const n = rand(2, 4);
    const a = nz(-3, 3);
    const v = n * a ** (n - 1);
    return mk(
      {
        key: `lh-p-${n}-${a}`,
        prompt: "0/0 again. L'Hôpital or factor.",
        math: `${lim(a)} (${poly([[1, n], [-(a ** n), 0]])})/${fac(a)}`,
        hint: "Top′ = n·xⁿ⁻¹ and bottom′ = 1.",
        explain: `${n}x${n === 2 ? "" : sup(n - 1)}/1 at x = ${fmt(a)} is ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 2) {
    const k = rand(1, 6);
    return mk(
      {
        key: `lh-c-${k}`,
        prompt: "Use L'Hôpital's rule twice.",
        math: `${lim(0)} (1 − cos ${k === 1 ? "x" : `${k}x`})/x²`,
        hint: `After one round you get ${k} sin(${k}x)/(2x), still 0/0.`,
        explain: `→ ${k}sin(${k}x)/(2x) → ${k * k}cos(${k}x)/2 → ${ds((k * k) / 2)}.`,
      },
      kpos((k * k) / 2),
    );
  }
  if (kind === 3) {
    const n = rand(1, 5);
    const k = rand(1, 4);
    const ex = k === 1 ? "eˣ" : `e${sup(k)}ˣ`;
    const T = pick([
      { m: `${xp(n)}/${ex}`, r: "0", why: `Differentiate ${n} time${n > 1 ? "s" : ""}: the top becomes a constant, the bottom still grows like ${ex}.` },
      { m: `${ex}/${xp(n)}`, r: "∞", why: "Exponentials beat every power: after enough rounds the bottom is a constant." },
      { m: `ln x/${xp(n)}`, r: "0", why: `One round: (1/x)/(${n === 1 ? "1" : `${n}${xp(n - 1)}`}) → 0.` },
      { m: `${xp(n)}/ln x`, r: "∞", why: `One round: ${n === 1 ? "1" : `${n}${xp(n - 1)}`}/(1/x) grows forever.` },
    ]);
    return mk(
      {
        key: `lh-inf-${T.m}`,
        prompt: "∞/∞: which wins?",
        math: `${lim("∞")} ${T.m}`,
        hint: "Use L'Hôpital's rule until the winner is obvious. Exponentials beat powers, which beat logs.",
        explain: T.why,
      },
      label(T.r, [T.r === "0" ? "∞" : "0", "1", fr(n, k)], [String(k)]),
    );
  }
  const p = rand(1, 5);
  const type = pick(["yes", "plug", "blow"] as const);
  const q = type === "yes" ? pick([p, -p]) : type === "blow" ? pick([1, 2, 3, 4, 5, 6].filter((v) => v !== p)) * pick([1, -1]) : rand(-5, 5);
  const c = type === "plug" ? pick([-3, -2, 0, 2, 3, 4].filter((v) => v !== q)) : q;
  return mk(
    {
      key: `lh-can-${p}-${q}-${c}-${type}`,
      prompt: "Can you use L'Hôpital's rule here?",
      eq: [`${lim(c)} (x² − ${p * p})/${fac(q)}`],
      say: talk(`${lim(c)} (x² − ${p * p})/${fac(q)}. Can you use L'Hôpital's rule here?`),
      hint: "Plug in first. L'Hôpital only works for 0/0 or ∞/∞.",
      explain:
        type === "yes"
          ? "Top and bottom are both 0 at that x: 0/0, so L'Hôpital applies."
          : type === "plug"
            ? "The bottom isn't 0 there, so just plug in. L'Hôpital would give a wrong answer."
            : "The bottom is 0 but the top isn't, so the limit is infinite (or doesn't exist). Not an indeterminate form.",
    },
    label(LHOP[type], Object.values(LHOP).filter((v) => v !== LHOP[type])),
  );
}

const GROWTH = [
  ["ln x", "5 ln x", "ln(x³)"],
  ["√x", "3√x"],
  ["x", "100x"],
  ["x ln x"],
  ["x²", "x² + 100x", "x²/10"],
  ["x³", "x³ − 50x²"],
  ["2ˣ", "10·2ˣ"],
  ["eˣ", "eˣ/1000"],
  ["3ˣ"],
  ["x!"],
  ["xˣ"],
];

/** CALC.4.6 — order functions by how fast they grow (what L'Hôpital's rule compares). */
export function growthOrder(): Question {
  const n = rand(4, 6);
  const tiers = shuffle(GROWTH.map((_, i) => i)).slice(0, n).sort((a, b) => a - b);
  const items = tiers.map((t) => pick(GROWTH[t]));
  return doIt(
    {
      key: `go-${items.join("|")}`,
      prompt: "Order from slowest to fastest growth as x → ∞.",
      hint: "Logs < roots < powers < exponentials < factorials. Constant multiples don't change the order.",
      explain: `${items.join(" < ")}. For any two, the limit of slower/faster is 0 (check with L'Hôpital).`,
    },
    { kind: "order", items, direction: "slowest to fastest" },
    items.length,
  );
}

/* ================================================== 5. Analyzing functions */

/** "k√3/d" style text for k/d · √r. */
function surd(n: number, d: number, r: number): string {
  if (n === 0) return "0";
  const g = gcd(n, d);
  const a = n / g;
  const b = d / g;
  const A = Math.abs(a);
  return `${a < 0 ? "−" : ""}${A === 1 ? "" : A}√${r}${b === 1 ? "" : `/${b}`}`;
}

const MVT_HYP = {
  yes: "Yes, the MVT applies",
  cont: "No: f isn't continuous on [a, b]",
  diff: "No: f isn't differentiable on (a, b)",
};

/** CALC.5.1 — the mean value theorem. */
export function mvt(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const P: Poly = [[nz(-3, 3), 2], [rand(-5, 5), 1], [rand(-5, 5), 0]];
    const a = rand(-4, 2);
    const b = a + rand(1, 5);
    const c = (a + b) / 2;
    const f = poly(P);
    const hint = "Set f′(c) equal to the average rate (f(b) − f(a))/(b − a) and solve for c.";
    const explain = `Average rate = ${fmt(P[0][0] * (a + b) + P[1][0])}. f′(c) = ${poly([[2 * P[0][0], 1], [P[1][0], 0]], "c")} equals that at c = ${ds(c)}.`;
    if (Math.random() < 0.5) {
      return doIt(
        {
          key: `mv-place-${P.join("|")}-${a}-${b}`,
          prompt: `f(x) = ${f} on [${fmt(a)}, ${fmt(b)}]. Drag to the c the MVT promises.`,
          hint,
          explain,
        },
        { kind: "placeOnLine", min: a, max: b, step: 0.5, labelStep: 1, target: c },
        c,
      );
    }
    return mk({ key: `mv-c-${P.join("|")}-${a}-${b}`, prompt: `f(x) = ${f} on [${fmt(a)}, ${fmt(b)}]. Find the c from the MVT.`, eq: ["c", "=", "?"], hint, explain }, kp(c));
  }
  if (kind === 1) {
    const a = rand(-3, 3);
    const w = rand(1, 5);
    const b = a + w;
    const m = rand(-6, 6);
    const A = rand(-9, 9);
    const B = A + m * w;
    return mk(
      {
        key: `mv-t-${a}-${b}-${A}-${m}`,
        prompt: `f is differentiable, f(${fmt(a)}) = ${fmt(A)}, f(${fmt(b)}) = ${fmt(B)}. The MVT guarantees f′(c) = ? for some c in (${fmt(a)}, ${fmt(b)}).`,
        math: "f′(c)",
        hint: "Some tangent slope must equal the slope of the secant from a to b.",
        explain: `(${fmt(B)} − ${A < 0 ? `(${fmt(A)})` : A})/(${fmt(b)} − ${a < 0 ? `(${fmt(a)})` : a}) = ${fmt(m)}${m === 0 ? " (this is Rolle's theorem)" : ""}.`,
      },
      kp(m),
    );
  }
  if (kind === 2) {
    const b = rand(2, 6);
    const right = surd(b, 3, 3);
    return mk(
      {
        key: `mv-cube-${b}`,
        prompt: `f(x) = x³ on [0, ${b}]. Find the c guaranteed by the MVT.`,
        eq: ["c", "=", "?"],
        hint: `Average rate = ${b * b * b}/${b} = ${b * b}. Solve 3c² = ${b * b} with c in (0, ${b}).`,
        explain: `c² = ${fr(b * b, 3)}, so c = ${b}/√3 = ${right}.`,
      },
      label(right, [fr(b, 2), fr(b, 3), surd(b, 2, 2)], [`√${b}`]),
    );
  }
  const a = rand(-3, 0);
  const b = a + rand(3, 6);
  const c = rand(a + 1, b - 1);
  const type = pick(["abs", "pole", "poly", "absOut", "cbrt"] as const);
  const f = type === "abs" ? `|${lin(1, -c)}|` : type === "pole" ? `1/${fac(c)}` : type === "poly" ? poly([[1, 3], [-(Math.abs(c) + 1), 1]]) : type === "absOut" ? `|${lin(1, -(b + 1))}|` : `∛${fac(c)}`;
  const right = type === "pole" ? MVT_HYP.cont : type === "abs" || type === "cbrt" ? MVT_HYP.diff : MVT_HYP.yes;
  return mk(
    {
      key: `mv-hyp-${type}-${a}-${b}-${c}`,
      prompt: `Does the MVT apply to f(x) = ${f} on [${fmt(a)}, ${fmt(b)}]?`,
      hint: "The MVT needs f continuous on [a, b] and differentiable on (a, b). Look for breaks, corners and vertical tangents inside.",
      explain:
        right === MVT_HYP.yes
          ? `f is smooth on the whole interval${type === "absOut" ? ` (its corner at x = ${fmt(b + 1)} is outside)` : ""}, so the MVT applies.`
          : right === MVT_HYP.cont
            ? `f blows up at x = ${fmt(c)}, inside the interval.`
            : `f has a ${type === "abs" ? "corner" : "vertical tangent"} at x = ${fmt(c)}, inside the interval.`,
    },
    label(right, Object.values(MVT_HYP).filter((v) => v !== right)),
  );
}

const EVT = {
  yes: "Yes, by the extreme value theorem",
  no: "Not guaranteed",
};

/** CALC.5.2 — critical points and the extreme value theorem. */
export function criticalPoints(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    let p = 0;
    let q = 0;
    while (p >= q) {
      p = rand(-3, 3);
      q = rand(-3, 4);
    }
    const P: Poly = [[2, 3], [-3 * (p + q), 2], [6 * p * q, 1], [rand(-5, 5), 0]];
    const right = `x = ${fmt(p)} and x = ${fmt(q)}`;
    return mk(
      {
        key: `cp-c-${p}-${q}-${P[3][0]}`,
        prompt: `f(x) = ${poly(P)}. Its critical points are at…`,
        hint: "Critical points: where f′(x) = 0 or f′ is undefined. Factor f′.",
        explain: `f′(x) = ${poly(pder(P))} = 6${fac(p)}${fac(q)}, so ${right}.`,
      },
      label(right, [`x = ${fmt(-p)} and x = ${fmt(-q)}`, `x = ${ds((p + q) / 2)}`, `x = 0 and x = ${fmt(p + q)}`], [`x = ${fmt(p * q)}`]),
    );
  }
  if (kind === 1) {
    const a = rand(-3, 1);
    const b = a + rand(2, 5);
    const c = rand(a + 1, b - 1);
    const type = pick(["closed", "open", "pole", "abs"] as const);
    const f = type === "pole" ? `1/${fac(c)}` : type === "abs" ? `|${lin(1, -c)}|` : poly([[1, 2], [-2 * c, 1]]);
    const iv = type === "open" ? `(${fmt(a)}, ${fmt(b)})` : `[${fmt(a)}, ${fmt(b)}]`;
    const ok = type === "closed" || type === "abs";
    return mk(
      {
        key: `cp-evt-${type}-${a}-${b}-${c}`,
        prompt: `Must f(x) = ${f} have an absolute max on ${iv}?`,
        hint: "The EVT needs two things: f continuous, and a closed interval [a, b].",
        explain: ok
          ? "f is continuous on a closed interval, so the EVT guarantees an absolute max (and min)."
          : type === "open"
            ? "On an open interval the top value can sit at an endpoint that isn't included, so a max isn't guaranteed."
            : `f isn't continuous at x = ${fmt(c)}, so the EVT doesn't apply.`,
      },
      label(ok ? EVT.yes : EVT.no, [ok ? EVT.no : EVT.yes, "Only if f is differentiable", "No, never"]),
    );
  }
  if (kind === 2) {
    const nRoots = rand(1, 3);
    const roots = shuffle([-3, -2, -1, 0, 1, 2, 3]).slice(0, nRoots).sort((a, b) => a - b);
    const double = nRoots < 3 && Math.random() < 0.4 ? pick(roots) : null;
    const k = pick([1, -1]);
    const raw: Fn = (x) => k * roots.reduce((s, r) => s * (x - r) * (r === double ? x - r : 1), 1);
    let M = 0;
    for (let i = 0; i <= 80; i++) M = Math.max(M, Math.abs(raw(-4 + i / 10)));
    const fp: Fn = (x) => (4 * raw(x)) / M;
    return mk(
      {
        key: `cp-g-${roots.join("_")}-${double}-${k}`,
        prompt: "This is the graph of f′ (not f). How many critical points does f have?",
        visual: plot([-4, 4], [-5, 5], { curves: [{ fn: fp, colour: "berry", label: "f′" }] }),
        needsVisual: true,
        hint: "Critical points of f are where f′ = 0: where this graph touches or crosses the x-axis.",
        explain: `f′ = 0 at x = ${roots.map(fmt).join(", ")}, so f has ${roots.length} critical point${roots.length > 1 ? "s" : ""}.`,
      },
      kpos(roots.length),
    );
  }
  const c = nz(-5, 5);
  const k = rand(-3, 3);
  const f = pick([`∛${fac(c)}²`, `|${lin(1, -c)}|`]);
  return mk(
    {
      key: `cp-u-${c}-${k}-${f}`,
      prompt: `f(x) = ${f}${k ? ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : ""}. f′ is never 0. Where is the critical point?`,
      eq: ["x", "=", "?"],
      hint: "A critical point can also be where f′ doesn't exist: a corner or cusp.",
      explain: `f′ is undefined at x = ${fmt(c)} (a ${f.startsWith("|") ? "corner" : "cusp"}), so that's the critical point.`,
    },
    kp(c),
  );
}

/** "(x − 2)" factors as text with an optional coefficient. */
const facProd = (k: number, roots: number[]) => `${k === 1 ? "" : k === -1 ? "−" : fmt(k)}${roots.map((r) => fac(r)).join("")}`;

/** CALC.5.3 — where a function increases or decreases. */
export function incDec(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0 || kind === 2) {
    let p = 0;
    let q = 0;
    while (p >= q) {
      p = rand(-4, 3);
      q = rand(-3, 5);
    }
    let k = pick([1, 2, 3, -1, -2]);
    let shown = `f′(x) = ${facProd(k, [p, q])}`;
    if (kind === 2) {
      const m = rand(1, 3);
      p = -m;
      q = m;
      k = pick([1, -1]);
      shown = `f(x) = ${poly([[k, 3], [-3 * k * m * m, 1]])}`;
    }
    const inc = Math.random() < 0.5;
    const outside = `x < ${fmt(p)} or x > ${fmt(q)}`;
    const between = `${fmt(p)} < x < ${fmt(q)}`;
    const right = (k > 0) === inc ? outside : between;
    return mk(
      {
        key: `id-${kind}-${p}-${q}-${k}-${inc}`,
        prompt: `${shown}. Where is f ${inc ? "increasing" : "decreasing"}?`,
        hint: "Find where f′ = 0, then test the sign of f′ in each interval. f′ > 0 means increasing.",
        explain: `${kind === 2 ? `f′(x) = ${poly([[3 * k, 2], [-3 * k * q * q, 0]])} = ${fmt(3 * k)}${fac(p)}${fac(q)}. ` : ""}f′ is ${k > 0 ? "positive outside" : "negative outside"} the zeros and ${k > 0 ? "negative" : "positive"} between them, so f is ${inc ? "increasing" : "decreasing"} for ${right}.`,
      },
      label(right, [right === outside ? between : outside, `x > ${fmt(p)}`, `x < ${fmt(q)}`]),
    );
  }
  const fromF = Math.random() < 0.5;
  const p = rand(-3, 0);
  const q = p + pick([2, 4]);
  const k = pick([0.5, -0.5, 1, -1]);
  const g: Fn = (x) => k * (x - p) * (x - q);
  let c = p;
  while (c === p || c === q) c = rand(-4, 4);
  if (fromF) {
    const F: Fn = (x) => k * ((x ** 3) / 3 - ((p + q) * x * x) / 2 + p * q * x) / 2;
    const s = Math.sign(g(c));
    return mk(
      {
        key: `id-f-${p}-${q}-${k}-${c}`,
        prompt: `This is the graph of f. Is f′(${fmt(c)}) positive or negative?`,
        visual: plot([-5, 5], fitY([F], -4.5, 4.5), { curves: [{ fn: F, colour: "wave", label: "f" }], points: [{ x: c, y: F(c) }] }),
        needsVisual: true,
        hint: "If the graph is going uphill (left to right) at that point, f′ is positive.",
        explain: `At x = ${fmt(c)} the graph is going ${s > 0 ? "up" : "down"}, so f′(${fmt(c)}) is ${s > 0 ? "positive" : "negative"}.`,
      },
      label(s > 0 ? "positive" : "negative", [s > 0 ? "negative" : "positive", "zero"]),
    );
  }
  const s = Math.sign(g(c));
  return mk(
    {
      key: `id-fp-${p}-${q}-${k}-${c}`,
      prompt: `This is the graph of f′. At x = ${fmt(c)}, is f increasing or decreasing?`,
      visual: plot([-5, 5], fitY([g], -5, 5), { curves: [{ fn: g, colour: "berry", label: "f′" }], points: [{ x: c, y: g(c) }] }),
      needsVisual: true,
      hint: "Don't read the shape: read the sign. Above the x-axis means f′ > 0.",
      explain: `f′(${fmt(c)}) is ${s > 0 ? "above" : "below"} the axis, so f is ${s > 0 ? "increasing" : "decreasing"} there.`,
    },
    label(s > 0 ? "increasing" : "decreasing", [s > 0 ? "decreasing" : "increasing", "you can't tell from f′"]),
  );
}

/** CALC.5.3 — sort x-values by whether f is increasing or decreasing there. */
export function incDecSort(): Question {
  let p = 0;
  let q = 0;
  while (p >= q) {
    p = rand(-4, 2);
    q = rand(-2, 5);
  }
  const k = pick([1, 2, -1, -3]);
  const xs = shuffle([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].filter((x) => x !== p && x !== q)).slice(0, rand(5, 7));
  const items = xs.map((x) => ({ label: `x = ${fmt(x)}`, bin: k * (x - p) * (x - q) > 0 ? 0 : 1 }));
  return doIt(
    {
      key: `ids-${p}-${q}-${k}-${xs.join("_")}`,
      prompt: `f′(x) = ${facProd(k, [p, q])}. Sort each x-value.`,
      hint: `f′ changes sign only at x = ${fmt(p)} and x = ${fmt(q)}. Test the sign in each interval.`,
      explain: `f′ ${k > 0 ? ">" : "<"} 0 outside [${fmt(p)}, ${fmt(q)}] and ${k > 0 ? "<" : ">"} 0 between, so f ${k > 0 ? "rises outside and falls between" : "falls outside and rises between"}.`,
    },
    { kind: "sort", bins: ["f increasing", "f decreasing"], items },
    items.length,
  );
}

const EXT = { min: "a local minimum", max: "a local maximum", none: "neither" };

/** CALC.5.4 — the first derivative test. */
export function firstDerivTest(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0 || kind === 1) {
    let p = 0;
    let q = 0;
    while (p === q) {
      p = rand(-3, 3);
      q = rand(-3, 3);
    }
    const m = rand(1, 2);
    const n = rand(1, 2);
    const k = pick([1, -1, 2]);
    const fp: Fn = (x) => k * (x - p) ** m * (x - q) ** n;
    const at = pick([p, q]);
    const L = Math.sign(fp(at - 0.25));
    const R = Math.sign(fp(at + 0.25));
    const type = L === R ? "none" : L < R ? "min" : "max";
    if (kind === 1) {
      let M = 0;
      for (let i = 0; i <= 80; i++) M = Math.max(M, Math.abs(fp(-4 + i / 10)));
      const g: Fn = (x) => (4 * fp(x)) / M;
      return mk(
        {
          key: `fd-g-${p}-${q}-${m}-${n}-${k}-${at}`,
          prompt: `This is the graph of f′. At x = ${fmt(at)}, f has…`,
          visual: plot([-4, 4], [-5, 5], { curves: [{ fn: g, colour: "berry", label: "f′" }], points: [{ x: at, y: 0 }] }),
          needsVisual: true,
          hint: "Look at the sign of f′ just left and just right of the point.",
          explain: type === "none" ? "f′ has the same sign on both sides (it only touches 0), so no extremum." : `f′ goes from ${L > 0 ? "+" : "−"} to ${R > 0 ? "+" : "−"}: ${EXT[type]}.`,
        },
        label(EXT[type], Object.values(EXT).filter((v) => v !== EXT[type])),
      );
    }
    const shown = `${k === 1 ? "" : k === -1 ? "−" : k}${fac(p)}${m === 2 ? "²" : ""}${fac(q)}${n === 2 ? "²" : ""}`;
    return mk(
      {
        key: `fd-f-${p}-${q}-${m}-${n}-${k}-${at}`,
        prompt: `f′(x) = ${shown}. At x = ${fmt(at)}, f has…`,
        hint: "Test the sign of f′ just to the left and right. A squared factor never changes sign.",
        explain: type === "none" ? "f′ keeps the same sign on both sides, so there's no extremum." : `f′ changes from ${L > 0 ? "+" : "−"} to ${R > 0 ? "+" : "−"}, so f has ${EXT[type]}.`,
      },
      label(EXT[type], Object.values(EXT).filter((v) => v !== EXT[type])),
    );
  }
  if (kind === 2) {
    let p = 0;
    let q = 0;
    while (p >= q) {
      p = rand(-3, 3);
      q = rand(-3, 4);
    }
    const flip = Math.random() < 0.5;
    const s = flip ? -1 : 1;
    const P: Poly = [[2 * s, 3], [-3 * (p + q) * s, 2], [6 * p * q * s, 1]];
    const askMax = Math.random() < 0.5;
    const v = askMax === !flip ? p : q;
    return mk(
      {
        key: `fd-x-${p}-${q}-${flip}-${askMax}`,
        prompt: `f(x) = ${poly(P)}. Where is the local ${askMax ? "max" : "min"}?`,
        eq: ["x", "=", "?"],
        hint: "Find the zeros of f′, then check where f′ changes from + to − (max) or − to + (min).",
        explain: `f′(x) = ${fmt(6 * s)}${fac(p)}${fac(q)}. The sign changes ${askMax ? "+ to −" : "− to +"} at x = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  let p = 0;
  let q = 0;
  while (p >= q) {
    p = rand(-4, 3);
    q = rand(-3, 5);
  }
  const signs = pick([["+", "−", "+"], ["−", "+", "−"], ["+", "−", "−"], ["−", "+", "+"], ["+", "+", "−"], ["−", "−", "+"]]);
  const ext: { x: number; t: string }[] = [];
  if (signs[0] !== signs[1]) ext.push({ x: p, t: signs[0] === "+" ? "max" : "min" });
  if (signs[1] !== signs[2]) ext.push({ x: q, t: signs[1] === "+" ? "max" : "min" });
  const ask = pick(ext);
  return mk(
    {
      key: `fd-chart-${p}-${q}-${signs.join("")}-${ask.t}`,
      prompt: `Use the sign chart of f′. Where does f have a local ${ask.t}?`,
      eq: ["x", "=", "?"],
      visual: { kind: "table", header: ["x", `x < ${fmt(p)}`, `${fmt(p)} < x < ${fmt(q)}`, `x > ${fmt(q)}`], rows: [["f′(x)", ...signs]] },
      needsVisual: true,
      hint: "A max is where f′ switches from + to −; a min, from − to +.",
      explain: `f′ switches ${ask.t === "max" ? "+ to −" : "− to +"} at x = ${fmt(ask.x)}.`,
    },
    kp(ask.x),
  );
}

/** CALC.5.2, CALC.5.4 — plot the local extrema of a function on a grid. */
export function plotExtrema(): Question {
  const fam = rand(0, 4);
  let f = "";
  let pts: { x: number; y: number; label: string }[] = [];
  let why = "";
  if (fam === 0) {
    const s = pick([1, -1]);
    const c = rand(-3, 3);
    f = poly([[s, 3], [-3 * s, 1], [c, 0]]);
    pts = [{ x: -s, y: 2 + c, label: "max" }, { x: s, y: c - 2, label: "min" }];
    why = `f′(x) = ${3 * s}(x² − 1) = 0 at x = ±1.`;
  } else if (fam === 1) {
    const c = rand(-1, 5);
    f = poly([[1, 3], [-3, 2], [c, 0]]);
    pts = [{ x: 0, y: c, label: "max" }, { x: 2, y: c - 4, label: "min" }];
    why = "f′(x) = 3x(x − 2) = 0 at x = 0 and x = 2.";
  } else if (fam === 2) {
    const c = rand(-5, 1);
    f = poly([[1, 3], [3, 2], [c, 0]]);
    pts = [{ x: -2, y: c + 4, label: "max" }, { x: 0, y: c, label: "min" }];
    why = "f′(x) = 3x(x + 2) = 0 at x = −2 and x = 0.";
  } else if (fam === 3) {
    const c = rand(-4, 5);
    f = poly([[1, 4], [-2, 2], [c, 0]]);
    pts = [{ x: 0, y: c, label: "max" }, { x: -1, y: c - 1, label: "left min" }, { x: 1, y: c - 1, label: "right min" }];
    why = "f′(x) = 4x(x² − 1) = 0 at x = 0, ±1.";
  } else {
    const p = rand(-3, 3);
    const s = pick([1, -1]);
    const y0 = rand(-5, 5);
    f = poly([[s, 2], [-2 * p * s, 1], [s * p * p + y0, 0]]);
    pts = [{ x: p, y: y0, label: s > 0 ? "min" : "max" }];
    why = `f′(x) = ${poly([[2 * s, 1], [-2 * p * s, 0]])} = 0 at x = ${fmt(p)}.`;
  }
  const names = pts.map((pt) => pt.label).join(", then ");
  return doIt(
    {
      key: `pe-${f}`,
      prompt: `f(x) = ${f}. Plot the ${names}.`,
      hint: "Solve f′(x) = 0, decide max or min with the first derivative test, then find each y = f(x).",
      explain: `${why} Points: ${pts.map((pt) => `${pt.label} (${fmt(pt.x)}, ${fmt(pt.y)})`).join("; ")}.`,
    },
    { kind: "plotPoints", points: pts, size: 6, quadrants: 4 },
    pts[0].y,
  );
}

/** CALC.5.5 — absolute extrema on a closed interval. */
export function absExtrema(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 3) {
    const lo = rand(-3, 0);
    const hi = lo + rand(3, 6);
    const c = rand(lo + 1, hi - 1);
    let vals: number[] = [];
    do vals = [rand(-9, 9), rand(-9, 9), rand(-9, 9)];
    while (new Set(vals).size < 3);
    const askMax = Math.random() < 0.5;
    const v = askMax ? Math.max(...vals) : Math.min(...vals);
    return mk(
      {
        key: `ae-tab-${lo}-${hi}-${c}-${vals.join("_")}-${askMax}`,
        prompt: `f is continuous on [${fmt(lo)}, ${fmt(hi)}] with one critical point, x = ${fmt(c)}. Absolute ${askMax ? "max" : "min"} value?`,
        visual: { kind: "table", header: ["x", fmt(lo), fmt(c), fmt(hi)], rows: [["f(x)", ...vals]] },
        needsVisual: true,
        hint: "Closed interval test: compare f at the endpoints and at every critical point.",
        explain: `The candidates are ${vals.map(fmt).join(", ")}; the ${askMax ? "largest" : "smallest"} is ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  let P: Poly = [];
  let lo = 0;
  let hi = 0;
  let cands: number[] = [];
  const askMax = Math.random() < 0.5;
  let best = 0;
  let where = 0;
  let ok = false;
  while (!ok) {
    if (Math.random() < 0.5) {
      const k = rand(1, 2);
      P = [[1, 3], [-3 * k * k, 1]];
      lo = rand(-4, 0);
      hi = rand(1, 4);
      cands = [lo, hi, -k, k].filter((x) => x >= lo && x <= hi);
    } else {
      const p = rand(-3, 3);
      P = [[1, 2], [-2 * p, 1], [rand(-5, 5), 0]];
      lo = rand(-5, 1);
      hi = lo + rand(2, 6);
      cands = [lo, hi, p].filter((x) => x >= lo && x <= hi);
    }
    const vals = cands.map((x) => pval(P, x));
    best = askMax ? Math.max(...vals) : Math.min(...vals);
    const at = cands.filter((_, i) => vals[i] === best);
    where = at[0];
    ok = kind !== 2 || new Set(at).size === 1;
  }
  const crit = pder(P);
  const where2 = kind === 2;
  return mk(
    {
      key: `ae-${kind}-${P.join("|")}-${lo}-${hi}-${askMax}`,
      prompt: `f(x) = ${poly(P)} on [${fmt(lo)}, ${fmt(hi)}]. ${where2 ? "Where is" : "Find"} the absolute ${askMax ? "max" : "min"}${where2 ? "" : " value"}?`,
      eq: where2 ? ["x", "=", "?"] : undefined,
      hint: "Check f at both endpoints and at every critical point inside the interval.",
      explain: `f′(x) = ${poly(crit)}. Candidates: ${[...new Set(cands)].sort((a, b) => a - b).map((x) => `f(${fmt(x)}) = ${fmt(pval(P, x))}`).join(", ")}. The ${askMax ? "max" : "min"} is ${fmt(best)} at x = ${fmt(where)}.`,
    },
    kp(where2 ? where : best),
  );
}

const SDT = { min: "a local minimum", max: "a local maximum", fail: "the test can't decide" };

/** CALC.5.6 — concavity, inflection points and the second derivative test. */
export function concavity(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const h = rand(-3, 3);
    const a = pick([1, 2, -1, 3]);
    const P: Poly = [[a, 3], [-3 * a * h, 2], [rand(-6, 6), 1], [rand(-5, 5), 0]];
    return mk(
      {
        key: `cc-ip-${P.join("|")}`,
        prompt: `f(x) = ${poly(P)}. Where is the inflection point?`,
        eq: ["x", "=", "?"],
        hint: "Inflection points are where f″ changes sign. Find f″ and set it to 0.",
        explain: `f″(x) = ${poly(pder(pder(P)))}, which is 0 (and changes sign) at x = ${fmt(h)}.`,
      },
      kp(h),
    );
  }
  if (kind === 1) {
    const c = rand(-4, 5);
    const v = Math.random() < 0.2 ? 0 : nz(-6, 6);
    const type = v > 0 ? "min" : v < 0 ? "max" : "fail";
    return mk(
      {
        key: `cc-sdt-${c}-${v}`,
        prompt: `f′(${fmt(c)}) = 0 and f″(${fmt(c)}) = ${fmt(v)}. At x = ${fmt(c)}, f has…`,
        hint: "f″ > 0: concave up, like a cup, so a min. f″ < 0: a cap, so a max. f″ = 0: no conclusion.",
        explain:
          type === "fail"
            ? "f″ = 0 tells you nothing: x⁴, −x⁴ and x³ all have f′ = f″ = 0 at 0."
            : `Flat tangent and concave ${v > 0 ? "up" : "down"}, so ${SDT[type]}.`,
      },
      label(SDT[type], [...Object.values(SDT).filter((s) => s !== SDT[type]), "an inflection point"]),
    );
  }
  if (kind === 2) {
    let P: Poly = [];
    let c = 0;
    let v = 0;
    do {
      P = [[rand(-1, 1), 4], [nz(-3, 3), 3], [rand(-5, 5), 2], [rand(-5, 5), 1]];
      c = rand(-3, 3);
      v = pval(pder(pder(P)), c);
    } while (v === 0);
    return mk(
      {
        key: `cc-up-${P.join("|")}-${c}`,
        prompt: `f(x) = ${poly(P)}. At x = ${fmt(c)}, f is…`,
        hint: "Find f″(x) and check its sign at that x.",
        explain: `f″(x) = ${poly(pder(pder(P)))}, so f″(${fmt(c)}) = ${fmt(v)}: concave ${v > 0 ? "up" : "down"}.`,
      },
      label(v > 0 ? "concave up" : "concave down", [v > 0 ? "concave down" : "concave up", "neither: it's a line there"]),
    );
  }
  let p = 0;
  let q = 0;
  while (p === q) {
    p = rand(-4, 4);
    q = rand(-4, 4);
  }
  const sq = Math.random() < 0.6;
  const right = sq ? `x = ${fmt(q)} only` : `x = ${fmt(Math.min(p, q))} and x = ${fmt(Math.max(p, q))}`;
  return mk(
    {
      key: `cc-f2-${p}-${q}-${sq}`,
      prompt: `f″(x) = ${fac(p)}${sq ? "²" : ""}${fac(q)}. Where does f have inflection points?`,
      hint: "An inflection point needs f″ to change sign, not just be 0. A squared factor doesn't change sign.",
      explain: sq ? `${fac(p)}² ≥ 0 never changes sign, so only x = ${fmt(q)} is an inflection point.` : "f″ changes sign at both zeros.",
    },
    label(right, [`x = ${fmt(p)} only`, sq ? `x = ${fmt(Math.min(p, q))} and x = ${fmt(Math.max(p, q))}` : `x = ${fmt(q)} only`, "none"]),
  );
}

/** CALC.5.6 — plot inflection points on a grid. */
export function plotInflection(): Question {
  if (Math.random() < 0.3) {
    const c = rand(0, 6);
    const f = poly([[1, 4], [-6, 2], [c, 0]]);
    return doIt(
      {
        key: `pi-q-${c}`,
        prompt: `f(x) = ${f}. Plot both inflection points, left one first.`,
        hint: "Set f″(x) = 12x² − 12 = 0, then find f at those x-values.",
        explain: `x = ±1, and f(±1) = ${c - 5}: (−1, ${fmt(c - 5)}) and (1, ${fmt(c - 5)}).`,
      },
      { kind: "plotPoints", points: [{ x: -1, y: c - 5, label: "left" }, { x: 1, y: c - 5, label: "right" }], size: 6, quadrants: 4 },
      c - 5,
    );
  }
  const h = rand(-2, 2);
  const b = rand(-3, 3);
  const y0 = rand(-5, 5);
  const c = y0 + 2 * h ** 3 - b * h;
  const P: Poly = [[1, 3], [-3 * h, 2], [b, 1], [c, 0]];
  return doIt(
    {
      key: `pi-c-${h}-${b}-${y0}`,
      prompt: `f(x) = ${poly(P)}. Plot its inflection point.`,
      hint: "Solve f″(x) = 0 for x, then find y = f(x).",
      explain: `f″(x) = ${poly(pder(pder(P)))} = 0 at x = ${fmt(h)}, and f(${fmt(h)}) = ${fmt(y0)}.`,
    },
    { kind: "plotPoints", points: [{ x: h, y: y0, label: "inflection" }], size: 6, quadrants: 4 },
    y0,
  );
}

const SIGNS = ["f′ > 0, f″ > 0", "f′ > 0, f″ < 0", "f′ < 0, f″ > 0", "f′ < 0, f″ < 0"];

/** CALC.5.7 — connect the graphs of f, f′ and f″. */
export function graphConnections(kinds = [0, 1, 2, 3, 4]): Question {
  const kind = pick(kinds);
  if (kind === 4) {
    const s = pick([1, -1]);
    const c = pick([-2, -1.5, -0.5, 0.5, 1.5, 2]);
    const sh = rand(-2, 2);
    const f: Fn = (x) => s * ((x ** 3 - 3 * x) / 2) + sh;
    const d1 = s * (3 * c * c - 3);
    const d2 = s * 6 * c;
    const right = SIGNS[(d1 > 0 ? 0 : 2) + (d2 > 0 ? 0 : 1)];
    return mk(
      {
        key: `gc-sig-${s}-${c}-${sh}`,
        prompt: "This is the graph of f. At P, what are the signs of f′ and f″?",
        visual: plot([-3, 3], [-6, 6], { curves: [{ fn: f, colour: "wave", label: "f" }], points: [{ x: c, y: f(c), label: "P" }] }),
        needsVisual: true,
        hint: "Uphill or downhill tells you f′. Cup (bending up) or cap (bending down) tells you f″.",
        explain: `At P the graph is going ${d1 > 0 ? "up" : "down"} and bending ${d2 > 0 ? "up" : "down"}: ${right}.`,
      },
      label(right, SIGNS.filter((x) => x !== right)),
    );
  }
  const m = rand(-2, 2);
  const d = pick([1, 2]);
  const p = m - d;
  const q = m + d;
  const k = pick([1, -1, 0.5, -0.5]);
  const g: Fn = (x) => k * (x - p) * (x - q);
  const visual = plot([-5, 5], fitY([g], -5, 5), { curves: [{ fn: g, colour: "berry", label: "f′" }] });
  const base = { visual, needsVisual: true as const, eq: kind < 3 ? (["x", "=", "?"] as Token[]) : undefined };
  if (kind === 0 || kind === 1) {
    const askMax = kind === 0;
    const v = askMax === k > 0 ? p : q;
    return mk(
      {
        ...base,
        key: `gc-ext-${m}-${d}-${k}-${askMax}`,
        prompt: `This is the graph of f′. Where does f have a local ${askMax ? "max" : "min"}?`,
        hint: `A local ${askMax ? "max" : "min"} of f is where f′ crosses the axis going ${askMax ? "from + to −" : "from − to +"}.`,
        explain: `f′ crosses ${askMax ? "downward" : "upward"} at x = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 2) {
    return mk(
      {
        ...base,
        key: `gc-inf-${m}-${d}-${k}`,
        prompt: "This is the graph of f′. Where does f have an inflection point?",
        hint: "Inflection points of f are where f′ has a max or min (where f″ changes sign).",
        explain: `f′ turns around at x = ${fmt(m)}, so f″ changes sign there.`,
      },
      kp(m),
    );
  }
  const up = k > 0 ? `x > ${fmt(m)}` : `x < ${fmt(m)}`;
  return mk(
    {
      ...base,
      key: `gc-cu-${m}-${d}-${k}`,
      prompt: "This is the graph of f′. Where is f concave up?",
      hint: "f is concave up where f′ is increasing (going uphill), whatever its sign.",
      explain: `f′ is increasing for ${up}, so f″ > 0 and f is concave up there.`,
    },
    label(up, [k > 0 ? `x < ${fmt(m)}` : `x > ${fmt(m)}`, `x < ${fmt(p)} or x > ${fmt(q)}`, `${fmt(p)} < x < ${fmt(q)}`]),
  );
}

/** CALC.5.8 — optimization. */
export function optimization(kinds = [0, 1, 2, 3, 4, 5]): Question {
  const kind = pick(kinds);
  if (kind === 5) {
    const n = rand(1, 5);
    const closed = Math.random() < 0.5;
    const askR = Math.random() < 0.5;
    const V = closed ? 2 * n ** 3 : n ** 3;
    const h = closed ? 2 * n : n;
    const can = closed ? "A closed can" : "An open-top can";
    const ask = askR ? "What radius" : "What height";
    return mk(
      {
        key: `op-can-${closed}-${n}-${askR}`,
        prompt: `${can} must hold ${piFr(V)} in³. ${ask} uses the least metal?`,
        say: `${can} must hold ${V === 1 ? "" : V} pi cubic inches. ${ask} uses the least metal?`,
        visual: { kind: "solid", solid: "cylinder", r: "r", h: "h", unit: "in" },
        hint: `Metal: S = ${closed ? "2πr²" : "πr²"} + 2πrh. Use V = πr²h to write h in terms of r, then set S′(r) = 0.`,
        explain: `h = ${V === 1 ? "" : V}/r², so S = ${closed ? "2πr²" : "πr²"} + ${2 * V}π/r. S′ = ${closed ? "4πr" : "2πr"} − ${2 * V}π/r² = 0 at r = ${n} in, so h = ${h} in.`,
        unit: "in",
      },
      kpos(askR ? n : h),
    );
  }
  if (kind === 0) {
    const L = pick([40, 80, 100, 120, 160, 200, 240, 400, 60, 20]);
    const askArea = Math.random() < 0.5;
    return mk(
      {
        key: `op-river-${L}-${askArea}`,
        prompt: `${L} m of fence makes 3 sides of a rectangle along a river. ${askArea ? "Max area?" : "Length of the side parallel to the river?"}`,
        hint: "Let x be each side touching the river: the parallel side is L − 2x. Maximize A = x(L − 2x).",
        explain: `A′ = ${L} − 4x = 0 at x = ${L / 4}. The parallel side is ${L / 2} m and the area is ${(L * L) / 8} m².`,
        unit: askArea ? "m²" : "m",
      },
      kpos(askArea ? (L * L) / 8 : L / 2),
    );
  }
  if (kind === 1) {
    const S = rand(3, 30) * 2;
    const prod = Math.random() < 0.5;
    if (prod) {
      return mk(
        {
          key: `op-sum-${S}`,
          prompt: `Two positive numbers add to ${S}. What's the biggest possible product?`,
          hint: "Write P = x(S − x), differentiate, and set P′ = 0.",
          explain: `P′ = ${S} − 2x = 0 at x = ${S / 2}, so P = ${S / 2}·${S / 2} = ${(S * S) / 4}.`,
        },
        kpos((S * S) / 4),
      );
    }
    const P = pick([4, 8, 12, 16, 20, 24, 32, 36, 40, 48]) * 4;
    return mk(
      {
        key: `op-per-${P}`,
        prompt: `A rectangle has perimeter ${P} cm. What's its largest possible area?`,
        hint: "Width w and length P/2 − w. Maximize A = w(P/2 − w).",
        explain: `A′ = 0 at w = ${P / 4}: a square, so A = ${(P / 4) ** 2} cm².`,
        unit: "cm²",
      },
      kpos((P / 4) ** 2),
    );
  }
  if (kind === 2) {
    const k = rand(1, 5);
    const s = 6 * k;
    const askV = Math.random() < 0.5;
    return mk(
      {
        key: `op-box-${k}-${askV}`,
        prompt: `Cut equal squares from the corners of a ${s} × ${s} in sheet and fold up a box. ${askV ? "Max volume?" : "Side of the cut squares?"}`,
        hint: `V = x(${s} − 2x)². Set V′ = 0 and keep the x between 0 and ${s / 2}.`,
        explain: `V′ = (${s} − 2x)(${s} − 6x) = 0 at x = ${k} (x = ${s / 2} gives no box). V = ${k}·${4 * k}² = ${16 * k ** 3} in³.`,
        unit: askV ? "in³" : "in",
      },
      kpos(askV ? 16 * k ** 3 : k),
    );
  }
  if (kind === 3) {
    const b = rand(1, 5);
    const m = rand(2, 20);
    const a = 2 * b * m;
    const askR = Math.random() < 0.5;
    return mk(
      {
        key: `op-rev-${a}-${b}-${askR}`,
        prompt: `At price p dollars, ${a} − ${b === 1 ? "" : b}p tickets sell. ${askR ? "Max revenue?" : "Best price?"}`,
        hint: "Revenue R = p × (tickets sold). Set R′(p) = 0.",
        explain: `R = ${a}p − ${b}p², R′ = ${a} − ${2 * b}p = 0 at p = ${m}. R = ${m}·${a - b * m} = $${m * (a - b * m)}.`,
        prefix: "$",
      },
      kpos(askR ? m * (a - b * m) : m),
    );
  }
  const P = pick([4, 9, 16, 25, 36, 49, 64, 81, 100, 144]);
  return mk(
    {
      key: `op-minsum-${P}`,
      prompt: `Two positive numbers multiply to ${P}. What's the smallest possible sum?`,
      hint: `S = x + ${P}/x. Set S′ = 1 − ${P}/x² = 0.`,
      explain: `x = √${P} = ${Math.sqrt(P)}, so S = ${Math.sqrt(P)} + ${Math.sqrt(P)} = ${2 * Math.sqrt(P)}.`,
    },
    kpos(2 * Math.sqrt(P)),
  );
}

/* =========================================================== 6. Integrals */

const RATES = [
  { what: "Water flows into a tank", r: "liters per minute", t: "min", u: "liters" },
  { what: "People enter a fair", r: "hundreds of people per hour", t: "h", u: "hundred people" },
  { what: "Rain falls", r: "mm per hour", t: "h", u: "mm" },
  { what: "A server receives data", r: "GB per minute", t: "min", u: "GB" },
];

const UNITS = [
  { rate: "gallons per hour", t: "hours", total: "gallons" },
  { rate: "meters per second", t: "seconds", total: "meters" },
  { rate: "people per day", t: "days", total: "people" },
  { rate: "dollars per month", t: "months", total: "dollars" },
  { rate: "kilowatts", t: "hours", total: "kilowatt-hours" },
  { rate: "liters per minute", t: "minutes", total: "liters" },
];

/** CALC.6.1 — accumulation: the area under a rate graph is the total change. */
export function accumulation(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0 || kind === 1) {
    const T = rand(4, 8);
    const vel = kind === 1;
    const pts = corners(T, vel ? -3 : 0, vel ? 4 : 6);
    const f = polyline(pts);
    const total = polyArea(pts, T);
    const R = pick(RATES);
    return mk(
      {
        key: `ac-${kind}-${pts.flat().join("_")}`,
        prompt: vel ? `The graph is a velocity v(t) in m/s. Find the displacement from t = 0 to t = ${T}.` : `${R.what} at the rate graphed (${R.r}). How much from t = 0 to t = ${T}?`,
        visual: plot([-1, T + 1], vel ? [-4, 5] : [-1, 7], { curves: [{ fn: f, colour: "wave", label: vel ? "v" : "r" }], shade: { fn: f, from: 0, to: T } }),
        needsVisual: true,
        hint: vel ? "Displacement is the signed area: area above the axis counts plus, below counts minus." : "Total = area under the rate graph. Split it into rectangles and triangles.",
        explain: `Adding the ${vel ? "signed " : ""}areas of the pieces gives ${ds(total)}${vel ? " m" : ` ${R.u}`}.`,
        unit: vel ? "m" : R.u,
      },
      vel ? kp(total) : kpos(total),
    );
  }
  if (kind === 2) {
    const U = pick(UNITS);
    const a = rand(0, 3);
    const b = a + rand(2, 9);
    return mk(
      {
        key: `ac-u-${U.total}-${a}-${b}`,
        prompt: `r(t) is in ${U.rate}, t in ${U.t}. Units of ${integ(a, b, "r(t)", "dt")}?`,
        hint: "An integral multiplies the rate by small bits of time and adds them up.",
        explain: `(${U.rate}) × (${U.t}) = ${U.total}.`,
      },
      label(U.total, [U.rate, U.t, `${U.rate} per ${U.t.replace(/s$/, "")}`]),
    );
  }
  const A0 = rand(2, 20) * 5;
  const b = rand(1, 6);
  const m = rand(0, 3);
  const T = rand(2, 6);
  const v = A0 + b * T + (m * T * T) / 2;
  return mk(
    {
      key: `ac-s-${A0}-${b}-${m}-${T}`,
      prompt: `A tank holds ${A0} L. Water flows in at r(t) = ${poly([[m, 1], [b, 0]], "t")} L/min. How much is in it at t = ${T}?`,
      hint: "Amount now = amount at the start + ∫ of the rate.",
      explain: `${A0} + ${integ(0, T, `(${poly([[m, 1], [b, 0]], "t")})`, "dt")} = ${A0} + ${ds(b * T + (m * T * T) / 2)} = ${ds(v)} L.`,
      unit: "L",
    },
    kpos(v),
  );
}

/** CALC.6.2 — left, right and midpoint Riemann sums. */
export function riemann(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 1) {
    const ts = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort((a, b) => a - b), 10];
    const fs = ts.map(() => rand(0, 20));
    const left = Math.random() < 0.5;
    let s = 0;
    for (let i = 0; i < 4; i++) s += (left ? fs[i] : fs[i + 1]) * (ts[i + 1] - ts[i]);
    return mk(
      {
        key: `rs-tab-${ts.join("_")}-${fs.join("_")}-${left}`,
        prompt: `Use a ${left ? "left" : "right"} Riemann sum with the 4 intervals in the table to estimate ${integ(0, 10, "f(t)", "dt")}.`,
        visual: { kind: "table", header: ["t", ...ts.map(String)], rows: [["f(t)", ...fs]] },
        needsVisual: true,
        hint: `The intervals have different widths! Height × width for each, using the ${left ? "left" : "right"} end's height.`,
        explain: `${[0, 1, 2, 3].map((i) => `${left ? fs[i] : fs[i + 1]}·${ts[i + 1] - ts[i]}`).join(" + ")} = ${s}.`,
      },
      kpos(s),
    );
  }
  const inc = Math.random() < 0.5;
  const c = pick([1, 0.5]);
  const d = rand(0, 3);
  const a = rand(0, 2);
  const w = c === 0.5 ? pick([1, 2]) : pick([1, 2, 0.5]);
  const n = kind === 2 ? rand(2, 6) : rand(2, 4);
  const b = a + n * w;
  const top = c * b * b + d + 1;
  const f: Fn = inc ? (x) => c * x * x + d : (x) => top - c * x * x;
  const fs = inc ? poly([[c, 2], [d, 0]]) : poly([[-c, 2], [top, 0]]);
  const type = kind === 2 ? pick(["left", "right"]) : pick(["left", "right", "midpoint"]);
  const off = type === "left" ? 0 : type === "right" ? w : w / 2;
  const s = clean(Array.from({ length: n }, (_, i) => f(a + i * w + off) * w).reduce((x, y) => x + y, 0));
  const visual = plot([a - 0.5, b + 0.5], fitY([f], a, b), { curves: [{ fn: f, colour: "wave", label: "f" }], shade: { fn: (x) => f(x + off), from: a, to: b, rects: n } });
  if (kind === 2) {
    const under = (type === "left") === inc;
    return mk(
      {
        key: `rs-ou-${inc}-${c}-${d}-${a}-${w}-${n}-${type}`,
        prompt: `f(x) = ${fs} is ${inc ? "increasing" : "decreasing"} on [${ds(a)}, ${ds(b)}]. A ${type} sum is…`,
        visual,
        hint: "Picture each rectangle. On an increasing function, the left edge is the lowest point of each strip.",
        explain: `On a${inc ? "n increasing" : " decreasing"} function, ${type} heights are the ${under ? "lowest" : "highest"} in each strip: an ${under ? "under" : "over"}estimate.`,
      },
      label(under ? "an underestimate" : "an overestimate", [under ? "an overestimate" : "an underestimate", "exact"]),
    );
  }
  return mk(
    {
      key: `rs-f-${inc}-${c}-${d}-${a}-${w}-${n}-${type}`,
      prompt: `Estimate ${integ(a, b, fs.length > 4 ? `(${fs})` : fs)} with a ${type} sum, ${n} equal rectangles.`.replace(/0\.5/g, "0.5"),
      visual,
      hint: `Each width is ${ds(w)}. Use the ${type === "midpoint" ? "middle" : type} of each strip for the height.`,
      explain: `${Array.from({ length: n }, (_, i) => ds(f(a + i * w + off))).join(" + ")} = ${ds(s / w)}, times ${ds(w)} = ${ds(s)}.`,
    },
    kpos(s),
  );
}

/** CALC.6.2 — the trapezoidal rule. */
export function trapezoid(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const ts = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7]).slice(0, 2).sort((a, b) => a - b), 8];
    const fs = ts.map(() => rand(0, 15));
    let s = 0;
    for (let i = 0; i < 3; i++) s += ((fs[i] + fs[i + 1]) / 2) * (ts[i + 1] - ts[i]);
    return mk(
      {
        key: `tz-tab-${ts.join("_")}-${fs.join("_")}`,
        prompt: `Use 3 trapezoids from the table to estimate ${integ(0, 8, "f(t)", "dt")}.`,
        visual: { kind: "table", header: ["t", ...ts.map(String)], rows: [["f(t)", ...fs]] },
        needsVisual: true,
        hint: "Each trapezoid: (left height + right height)/2 × width. Widths differ!",
        explain: `${[0, 1, 2].map((i) => `(${fs[i]} + ${fs[i + 1]})/2·${ts[i + 1] - ts[i]}`).join(" + ")} = ${ds(s)}.`,
      },
      kpos(s),
    );
  }
  const up = Math.random() < 0.5;
  const n = rand(2, 4);
  const w = pick([1, 0.5, 2]);
  const b = n * w;
  const d = rand(0, 3);
  const f: Fn = up ? (x) => x * x + d : (x) => b * b + d - x * x;
  const fs = up ? poly([[1, 2], [d, 0]]) : poly([[-1, 2], [b * b + d, 0]]);
  const xs = Array.from({ length: n + 1 }, (_, i) => i * w);
  const s = clean((w / 2) * xs.reduce((acc, x, i) => acc + (i === 0 || i === n ? 1 : 2) * f(x), 0));
  const lines: Seg[] = xs.slice(0, -1).map((x) => ({ from: [x, f(x)], to: [x + w, f(x + w)], colour: "berry" as Colour }));
  xs.forEach((x) => lines.push({ from: [x, 0], to: [x, f(x)], colour: "berry", dashed: true }));
  const visual = plot([-0.5, b + 0.5], fitY([f], 0, b), { curves: [{ fn: f, colour: "wave", label: "f" }], lines });
  if (kind === 2) {
    return mk(
      {
        key: `tz-ou-${up}-${n}-${w}-${d}`,
        prompt: `f(x) = ${fs} on [0, ${ds(b)}]. The trapezoidal estimate is…`,
        visual,
        hint: "Trapezoid tops are chords. Does the curve bend below its chords (concave up) or above them?",
        explain: up ? "f is concave up, so the chords lie above the curve: an overestimate." : "f is concave down, so the chords lie below the curve: an underestimate.",
      },
      label(up ? "an overestimate" : "an underestimate", [up ? "an underestimate" : "an overestimate", "exact"]),
    );
  }
  return mk(
    {
      key: `tz-f-${up}-${n}-${w}-${d}`,
      prompt: `Estimate ${integ(0, b, `(${fs})`)} with ${n} equal trapezoids.`,
      visual,
      hint: `T = (Δx/2)[f(x₀) + 2f(x₁) + … + 2f(xₙ₋₁) + f(xₙ)] with Δx = ${ds(w)}.`,
      explain: `(${ds(w)}/2)(${xs.map((x, i) => `${i === 0 || i === n ? "" : "2·"}${ds(f(x))}`).join(" + ")}) = ${ds(s)}.`,
    },
    kpos(s),
  );
}

const SUMF = [
  { f: "x²", arg: (s: string) => `(${s})²`, min: 0 },
  { f: "x³", arg: (s: string) => `(${s})³`, min: 0 },
  { f: "√x", arg: (s: string) => `√(${s})`, min: 0 },
  { f: "eˣ", arg: (s: string) => `e^(${s})`, min: 0 },
  { f: "sin x", arg: (s: string) => `sin(${s})`, min: 0 },
  { f: "1/x", arg: (s: string) => `1/(${s})`, min: 1 },
  { f: "ln x", arg: (s: string) => `ln(${s})`, min: 1 },
];

/** CALC.6.3 — definite integral notation, limits of Riemann sums, and integrals from geometry. */
export function integralNotation(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const F = pick(SUMF);
    const a = rand(F.min, 3);
    const w = rand(1, 4);
    const b = a + w;
    const s = `${a ? `${a} + ` : ""}${w === 1 ? "" : w}i/n`;
    const shown = `lim n→∞ Σ ${F.arg(s)}·${w}/n`;
    const I = (lo: number, hi: number, inner = F.f) => `∫${sub(lo)}${sup(hi)} ${inner} dx`;
    return mk(
      {
        key: `in-sum-${F.f}-${a}-${w}`,
        prompt: "Sum from i = 1 to n. Which integral is this?",
        eq: [shown],
        say: talk(`${shown}, summed from i = 1 to n. Which integral is this?`),
        hint: "Δx = (b − a)/n is the factor outside. The x-value inside is a + iΔx.",
        explain: `Δx = ${w}/n, so b − a = ${w}; x = ${s} starts at a = ${a}. That's ${I(a, b)}.`,
      },
      label(I(a, b), [a ? I(0, w) : I(a, b + 1), I(F.min, F.min + 1), I(a, b, `${w}·${F.f}`)], [I(a, b + 1), I(0, b + 1)]),
    );
  }
  if (kind === 1) {
    const a = rand(-3, 3);
    const n = pick([2, 4, 5, 8, 10]);
    const w = rand(1, 6);
    return mk(
      {
        key: `in-dx-${a}-${w}-${n}`,
        prompt: `Split [${fmt(a)}, ${fmt(a + w)}] into ${n} equal pieces. How wide is each?`,
        eq: ["Δx", "=", "?"],
        hint: "Δx = (b − a)/n.",
        explain: `(${fmt(a + w)} − ${a < 0 ? `(${fmt(a)})` : a})/${n} = ${ds(w / n)}.`,
      },
      kpos(w / n),
    );
  }
  if (kind === 2) {
    const m = pick([-1, -0.5, 0.5, 1, 0, 2]);
    const c = rand(-3, 3);
    const a = rand(-3, 1);
    const b = a + pick([2, 4]);
    const f: Fn = (x) => m * x + c;
    const v = clean(((f(a) + f(b)) / 2) * (b - a));
    return mk(
      {
        key: `in-geo-${m}-${c}-${a}-${b}`,
        prompt: `Use geometry: find ${integ(a, b, `(${lin(m, c)})`)}.`,
        visual: plot([a - 1, b + 1], fitY([f], a - 1, b + 1), { curves: [{ fn: f, colour: "wave" }], shade: { fn: f, from: a, to: b } }),
        hint: "The region is made of triangles and trapezoids. Area below the x-axis counts as negative.",
        explain: `Signed area = (f(${fmt(a)}) + f(${fmt(b)}))/2 × ${b - a} = (${ds(f(a))} + ${ds(f(b))})/2 × ${b - a} = ${ds(v)}.`,
      },
      kp(v),
    );
  }
  const r = rand(1, 6);
  const half = Math.random() < 0.5;
  const f: Fn = (x) => (Math.abs(x) <= r ? Math.sqrt(r * r - x * x) : NaN);
  const right = half ? piFr(r * r, 2) : piFr(r * r, 4);
  return mk(
    {
      key: `in-circ-${r}-${half}`,
      prompt: `Use geometry: find ${integ(half ? -r : 0, r, `√(${r * r} − x²)`)}.`,
      visual: plot([-r - 1, r + 1], [-1, r + 1], { curves: [{ fn: f, colour: "wave" }], shade: { fn: f, from: half ? -r : 0, to: r } }),
      hint: `y = √(${r * r} − x²) is the top half of a circle of radius ${r}.`,
      explain: `That's a ${half ? "half" : "quarter"} circle of radius ${r}: ${half ? "½" : "¼"}π(${r})² = ${right}.`,
    },
    label(right, [piFr(r * r), half ? piFr(r * r, 4) : piFr(r * r, 2), piFr(r)], [piFr(2 * r)]),
  );
}

const ACC_F = [
  { f: (u: string) => `cos(${u})` },
  { f: (u: string) => `e^(${u})` },
  { f: (u: string) => `√(1 + ${u})` },
  { f: (u: string) => `ln(${u})` },
  { f: (u: string) => `sin(${u})` },
];
const ACC_U = [
  { u: "x²", d: "2x" },
  { u: "x³", d: "3x²" },
  { u: "2x", d: "2" },
  { u: "sin x", d: "cos x" },
  { u: "5x", d: "5" },
];

/** CALC.6.4 — the fundamental theorem and accumulation functions. */
export function ftcAccumulation(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0 || kind === 3) {
    const a = rand(-2, 3);
    const P: Poly = [[nz(-2, 3), rand(1, 3)], [rand(-6, 6), 0]];
    const k = rand(-3, 3);
    const lower = kind === 3;
    const v = (lower ? -1 : 1) * pval(P, k);
    const I = lower ? integ("x", a, `(${poly(P, "t")})`, "dt") : integ(a, "x", `(${poly(P, "t")})`, "dt");
    return mk(
      {
        key: `fa-${kind}-${a}-${P.join("|")}-${k}`,
        prompt: `g(x) = ${I}.`,
        math: `g′(${fmt(k)})`,
        hint: lower ? "Flip the limits first: ∫ₓᵃ = −∫ₐˣ. Then the derivative is the integrand at x." : "FTC: the derivative of ∫ₐˣ f(t) dt is f(x).",
        explain: `g′(x) = ${lower ? "−" : ""}(${poly(P, "x")}), so g′(${fmt(k)}) = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const F = pick(ACC_F);
    const U = pick(ACC_U);
    const a = rand(0, 2);
    const right = `${U.d}·${F.f(U.u)}`;
    return mk(
      {
        key: `fa-ch-${F.f("t")}-${U.u}-${a}`,
        prompt: "FTC with the chain rule.",
        math: `d/dx ${integ(a, U.u.length === 1 ? U.u : U.u, F.f("t"), "dt")}`,
        hint: "Plug the upper limit into the integrand, then multiply by the upper limit's derivative.",
        explain: `f(${U.u}) times (${U.u})′ = ${right}.`,
      },
      label(right, [F.f(U.u), `${U.d}·${F.f("x")}`, F.f(U.d)], [`${U.d}·${F.f(U.d)}`]),
    );
  }
  const pts = corners(6, -3, 4);
  const f = polyline(pts);
  const c = pick(pts.slice(1).map(([x]) => x));
  const askG = Math.random() < 0.6;
  const v = askG ? polyArea(pts, c) : clean(f(c));
  return mk(
    {
      key: `fa-g-${pts.flat().join("_")}-${c}-${askG}`,
      prompt: `g(x) = ${integ(0, "x", "f(t)", "dt")}, with f graphed.`,
      math: askG ? `g(${c})` : `g′(${c})`,
      visual: plot([-1, 7], [-4, 5], { curves: [{ fn: f, colour: "wave", label: "f" }], ...(askG ? { shade: { fn: f, from: 0, to: c } } : {}) }),
      needsVisual: true,
      hint: askG ? "g(c) is the signed area under f from 0 to c." : "By the FTC, g′(x) = f(x). Read the graph.",
      explain: askG ? `The signed area from 0 to ${c} is ${ds(v)}.` : `g′(${c}) = f(${c}) = ${ds(v)}.`,
    },
    kp(v),
  );
}

/** CALC.6.5 — properties of definite integrals. */
export function integralProps(kinds = [0, 1]): Question {
  const kind = pick(kinds);
  if (kind === 1) {
    const a = rand(1, 6);
    const A = nz(-9, 9);
    const even = Math.random() < 0.5;
    const concrete = Math.random() < 0.4;
    if (concrete) {
      const k = nz(-5, 5);
      const n = pick([1, 3, 5]);
      return mk(
        {
          key: `ip-odd-${a}-${k}-${n}`,
          prompt: "Use symmetry instead of an antiderivative.",
          math: integ(-a, a, `(${poly([[1, n], [k, 0]])})`),
          hint: `x${n === 1 ? "" : sup(n)} is odd, so its part cancels from −${a} to ${a}. What's left?`,
          explain: `The odd part integrates to 0; the constant gives ${fmt(k)}·${2 * a} = ${fmt(2 * a * k)}.`,
        },
        kp(2 * a * k),
      );
    }
    return mk(
      {
        key: `ip-sym-${a}-${A}-${even}`,
        prompt: `f is ${even ? "even" : "odd"} and ${integ(0, a, "f(x)")} = ${fmt(A)}.`,
        math: integ(-a, a, "f(x)"),
        hint: even ? "Even functions are mirror images across the y-axis." : "Odd functions have opposite areas on the two sides.",
        explain: even ? `Both halves match: 2(${fmt(A)}) = ${fmt(2 * A)}.` : "The two halves cancel: 0.",
      },
      kp(even ? 2 * A : 0),
    );
  }
  const a = rand(-2, 1);
  const b = a + rand(1, 4);
  const c = b + rand(1, 4);
  const A = rand(-9, 9);
  const B = rand(-9, 9);
  const C = rand(-9, 9);
  const k = nz(-4, 4);
  const m = nz(-3, 3);
  const form = rand(0, 5);
  const I = (lo: number, hi: number, inner: string) => integ(lo, hi, inner);
  const forms: [string, number, string][] = [
    [I(a, c, "f(x)"), A + B, "Add the pieces: [a, b] then [b, c]."],
    [I(c, b, "f(x)"), -B, "Swapping the limits flips the sign."],
    [I(a, b, `[${terms([[k, "f(x)"], [-m, "g(x)"]], "")}]`), k * A - m * C, "Integrals split over sums and pull out constants."],
    [I(a, b, `(f(x) ${k < 0 ? "−" : "+"} ${Math.abs(k)})`), A + k * (b - a), `∫ of a constant k over an interval is k × its width.`],
    [I(b, b, "f(x)"), 0, "An integral over zero width is 0."],
    [I(b, c, "(f(x) + g(x))"), B, "Careful: you only know g on [a, b]… but wait, read the table again."],
  ];
  const [shown, v, why] = forms[form === 5 ? 0 : form];
  return mk(
    {
      key: `ip-${a}-${b}-${c}-${A}-${B}-${C}-${k}-${m}-${form === 5 ? 0 : form}`,
      prompt: "Use the table of known integrals.",
      math: shown,
      visual: { kind: "table", header: ["integral", "value"], rows: [[I(a, b, "f(x)"), A], [I(b, c, "f(x)"), B], [I(a, b, "g(x)"), C]] },
      needsVisual: true,
      hint: why,
      explain: `${shown} = ${fmt(v)}.`,
    },
    kp(v),
  );
}

/** CALC.6.5 — sort symmetric integrals by what symmetry tells you. */
export function symmetrySort(): Question {
  const a = rand(1, 3);
  const I = (f: string) => `${integ(-a, a, f)}`;
  return sortTask(
    {
      key: `sym-${a}`,
      prompt: "Sort each integral by what symmetry tells you.",
      hint: "f(−x) = −f(x): odd, the areas cancel. f(−x) = f(x): even, double the right half.",
      explain: "Odd integrands (x³, sin x, x cos x…) give 0 on [−a, a]; even ones (x², cos x, |x|…) give 2∫₀ᵃ; others need real work.",
    },
    ["equals 0 (odd)", `equals 2${integ(0, a, "f")} (even)`, "neither"],
    [
      ["x³", "sin x", "(x⁵ − x)", "x cos x", "x·e^(x²)", "x/(x² + 1)"].map(I),
      ["x²", "cos x", "|x|", "x sin x", "(x⁴ + 1)", "e^(x²)"].map(I),
      ["eˣ", "(x + 1)", "(x² + x)", "(x − 1)²", "ln(x + 5)"].map(I),
    ],
    1,
    3,
  );
}

/* ======================================================= 7. Antiderivatives */

/** c·xᵖ/d as text: "3x⁴/4", "x³/3", "2x⁵". */
function monoF(n: number, d: number, p: number): string {
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  if (b === 1) return poly([[a, p]]);
  return `${a < 0 ? "−" : ""}${Math.abs(a) === 1 ? "" : Math.abs(a)}${xp(p)}/${b}`;
}

/** n/(d·xᵖ) as text: "−1/(2x²)", "3/x²". */
function overX(n: number, d: number, p: number): string {
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  return `${a < 0 ? "−" : ""}${Math.abs(a)}/${b === 1 ? xp(p) : `(${b}${xp(p)})`}`;
}

/** CALC.6.6 — antiderivatives and indefinite integrals. */
export function antiderivatives(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const c = pick([1, 2, 3, 4, 5, 6, -2, -3]);
    if (Math.random() < 0.3) {
      const n = rand(2, 4);
      const right = `${overX(-c, n - 1, n - 1)} + C`;
      return mk(
        {
          key: `ad-neg-${c}-${n}`,
          prompt: `Rewrite ${overX(c, 1, n)} as ${poly([[c, -n]])} first.`,
          math: `∫ ${overX(c, 1, n)} dx`,
          hint: "Add 1 to the power (−3 becomes −2), then divide by the new power.",
          explain: `${poly([[c, -n]])} → ${monoF(c, 1, 1 - n)}/(${fmt(1 - n)}) = ${right}.`,
        },
        label(right, [`${overX(c, n - 1, n - 1)} + C`, `${overX(-c * n, 1, n + 1)} + C`, `${c === 1 ? "" : c}ln|x${sup(n)}| + C`], [overX(-c, n - 1, n - 1)]),
      );
    }
    const n = rand(1, 6);
    const right = `${monoF(c, n + 1, n + 1)} + C`;
    return mk(
      {
        key: `ad-pw-${c}-${n}`,
        prompt: pick(["Find the antiderivative.", "Reverse the power rule."]),
        math: `∫ ${poly([[c, n]])} dx`,
        hint: "Add 1 to the power, divide by the new power, and add C.",
        explain: `Power ${n} → ${n + 1}, divide by ${n + 1}: ${right}.`,
      },
      label(right, [monoF(c, n + 1, n + 1), `${poly([[c, n + 1]])} + C`, `${poly([[c * n, n - 1]])} + C`, `${monoF(c, n, n + 1)} + C`]),
    );
  }
  if (kind === 1) {
    const k = pick([1, 2, 3, 4, 5, -2]);
    const K = k === 1 ? "" : k === -1 ? "−" : `${fmt(k)} `;
    const N = -k === 1 ? "" : -k === -1 ? "−" : `${fmt(-k)} `;
    const T = pick([
      { i: `${K}cos x`, r: `${K}sin x`, w: [`${N}sin x`, `${K}cos x`] },
      { i: `${K}sin x`, r: `${N}cos x`, w: [`${K}cos x`, `${N}sin x`] },
      { i: `${K}eˣ`, r: `${K}eˣ`, w: [`${K}eˣ⁺¹/(x + 1)`, `${K}xeˣ`] },
      { i: `${fmt(k)}/x`, r: `${K}ln|x|`, w: [`${overX(-k, 1, 2)}`, `${K}x ln x`] },
      { i: `${K}sec²x`, r: `${K}tan x`, w: [`${K}sec x tan x`, `${K}sec³x/3`] },
      { i: `${K}sec x tan x`, r: `${K}sec x`, w: [`${K}tan x`, `${K}sec²x`] },
    ]);
    return mk(
      {
        key: `ad-b-${T.i}`,
        prompt: "Find the antiderivative.",
        math: `∫ ${T.i} dx`,
        hint: "Ask: what function has this as its derivative? Check by differentiating your answer.",
        explain: `d/dx (${T.r}) = ${T.i}, so the answer is ${T.r} + C.`,
      },
      label(`${T.r} + C`, [...T.w.map((w) => `${w} + C`), T.r]),
    );
  }
  if (kind === 2) {
    const a = rand(1, 3);
    const b = rand(-4, 4);
    const c = rand(-5, 5);
    const d = rand(-6, 6);
    const F: Poly = [[a, 3], [b, 2], [c, 1], [d, 0]];
    const k = rand(-2, 3);
    const at1 = Math.random() < 0.5;
    const x0 = at1 ? 1 : 0;
    return mk(
      {
        key: `ad-iv-${F.join("|")}-${k}-${at1}`,
        prompt: `F′(x) = ${poly(pder(F))} and F(${x0}) = ${fmt(pval(F, x0))}.`,
        math: `F(${fmt(k)})`,
        hint: "Antidifferentiate (with + C), use the given point to find C, then plug in.",
        explain: `F(x) = ${poly(F.slice(0, 3))} + C, and F(${x0}) = ${fmt(pval(F, x0))} gives C = ${fmt(d)}. So F(${fmt(k)}) = ${fmt(pval(F, k))}.`,
      },
      kp(pval(F, k)),
    );
  }
  const p = nz(-3, 3);
  const q = rand(-4, 4);
  const r = nz(-9, 9);
  const I: Poly = [[3 * p, 2], [2 * q, 1], [r, 0]];
  const A: Poly = [[p, 3], [q, 2], [r, 1]];
  return mk(
    {
      key: `ad-poly-${p}-${q}-${r}`,
      prompt: "Antidifferentiate term by term.",
      math: `∫ (${poly(I)}) dx`,
      hint: "Each term: add 1 to the power and divide by it. One C at the end.",
      explain: `${poly(A)} + C. Check: its derivative is ${poly(I)}.`,
    },
    label(`${poly(A)} + C`, [poly(A), `${poly(pder(I))} + C`, `${poly([[3 * p, 3], [2 * q, 2], [r, 1]])} + C`]),
  );
}

const TRIG_INT = [
  { i: "sin x", lo: "0", hi: "π", v: 2 },
  { i: "cos x", lo: "0", hi: "π/2", v: 1 },
  { i: "sin x", lo: "0", hi: "π/2", v: 1 },
  { i: "cos x", lo: "0", hi: "π", v: 0 },
  { i: "sec²x", lo: "0", hi: "π/4", v: 1 },
  { i: "1/x", lo: "1", hi: "e", v: 1 },
  { i: "1/x", lo: "1", hi: "e²", v: 2 },
  { i: "eˣ", lo: "0", hi: "ln 2", v: 1 },
  { i: "eˣ", lo: "0", hi: "ln 5", v: 4 },
  { i: "eˣ", lo: "0", hi: "ln 3", v: 2 },
];

/** CALC.6.4, CALC.6.6 — evaluate definite integrals with the fundamental theorem. */
export function ftcEvaluate(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const F: Poly = [[nz(-2, 2), 3], [rand(-3, 3), 2], [rand(-5, 5), 1]];
    const f = pder(F);
    const a = rand(-2, 2);
    const b = a + rand(1, 3);
    const v = pval(F, b) - pval(F, a);
    return mk(
      {
        key: `fe-p-${F.join("|")}-${a}-${b}`,
        prompt: "Evaluate with the fundamental theorem.",
        math: integ(a, b, `(${poly(f)})`),
        hint: "Find an antiderivative F, then compute F(b) − F(a). No + C needed.",
        explain: `F(x) = ${poly(F)}. F(${fmt(b)}) − F(${fmt(a)}) = ${fmt(pval(F, b))} − ${pval(F, a) < 0 ? `(${fmt(pval(F, a))})` : pval(F, a)} = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const T = pick(TRIG_INT);
    const c = rand(1, 5);
    const inner = c === 1 ? T.i : T.i === "1/x" ? `${c}/x` : `${c} ${T.i}`.replace(`${c} eˣ`, `${c}eˣ`);
    return mk(
      {
        key: `fe-t-${T.i}-${T.hi}-${c}`,
        prompt: "Evaluate exactly.",
        math: integ(T.lo, T.hi, inner),
        hint: "Antiderivatives: sin → −cos, cos → sin, sec² → tan, 1/x → ln|x|, eˣ → eˣ.",
        explain: `Evaluating the antiderivative from ${T.lo} to ${T.hi} gives ${c === 1 ? "" : `${c}·`}${T.v} = ${c * T.v}.`,
      },
      kp(c * T.v),
    );
  }
  if (kind === 2) {
    const a = rand(-2, 3);
    const b = a + rand(1, 5);
    const A = rand(-9, 9);
    const I = rand(-12, 12);
    return mk(
      {
        key: `fe-net-${a}-${b}-${A}-${I}`,
        prompt: `f(${fmt(a)}) = ${fmt(A)} and ${integ(a, b, "f′(x)")} = ${fmt(I)}.`,
        math: `f(${fmt(b)})`,
        hint: "Net change: the integral of a rate is the change in the amount. End = start + change.",
        explain: `f(${fmt(b)}) = ${fmt(A)} + ${I < 0 ? `(${fmt(I)})` : I} = ${fmt(A + I)}.`,
      },
      kp(A + I),
    );
  }
  const a = rand(0, 3);
  const b = a + rand(1, 5);
  const Fa = rand(-9, 9);
  const Fb = rand(-9, 9);
  return mk(
    {
      key: `fe-F-${a}-${b}-${Fa}-${Fb}`,
      prompt: `F′(x) = f(x) for all x. F(${a}) = ${fmt(Fa)} and F(${b}) = ${fmt(Fb)}.`,
      math: integ(a, b, "f(x)"),
      hint: "FTC: ∫ₐᵇ f(x) dx = F(b) − F(a) for any antiderivative F.",
      explain: `${fmt(Fb)} − ${Fa < 0 ? `(${fmt(Fa)})` : Fa} = ${fmt(Fb - Fa)}.`,
    },
    kp(Fb - Fa),
  );
}

/** CALC.6.7 — integration by substitution. */
export function uSub(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  const c = rand(1, 9);
  const n = rand(2, 6);
  if (kind === 0) {
    const T = pick([
      { i: "2x cos(x²)", u: "x²", w: ["cos(x²)", "2x", "x"] },
      { i: `3x²(x³ + ${c})${sup(n)}`, u: `x³ + ${c}`, w: [`(x³ + ${c})${sup(n)}`, "3x²", "x³"] },
      { i: `cos${sup(n)}x · sin x`, u: "cos x", w: ["sin x", `cos${sup(n)}x`, "x"] },
      { i: `eˣ/(eˣ + ${c})`, u: `eˣ + ${c}`, w: ["eˣ", `1/(eˣ + ${c})`, "x"] },
      { i: `(ln x)${sup(n)}/x`, u: "ln x", w: ["1/x", `(ln x)${sup(n)}`, "x"] },
      { i: `x·e^(x² + ${c})`, u: `x² + ${c}`, w: [`e^(x² + ${c})`, "x", "eˣ"] },
      { i: `x/√(x² + ${c})`, u: `x² + ${c}`, w: [`√(x² + ${c})`, "x", `1/√(x² + ${c})`] },
    ]);
    return mk(
      {
        key: `us-u-${T.i}`,
        prompt: "Which substitution works?",
        eq: [`∫ ${T.i} dx`],
        say: talk(`∫ ${T.i} dx. Which substitution works?`),
        hint: "Pick the inside function whose derivative also appears (up to a constant).",
        explain: `With u = ${T.u}, du is already sitting in the integral.`,
      },
      label(`u = ${T.u}`, T.w.map((w) => `u = ${w}`)),
    );
  }
  if (kind === 1) {
    const k = rand(2, 6);
    const b = nz(-5, 5);
    const T = pick([
      { i: `cos(${k}x)`, r: `sin(${k}x)/${k} + C`, w: [`${k} sin(${k}x) + C`, `sin(${k}x) + C`, `−sin(${k}x)/${k} + C`] },
      { i: `sin(${k}x)`, r: `−cos(${k}x)/${k} + C`, w: [`cos(${k}x)/${k} + C`, `−${k} cos(${k}x) + C`, `−cos(${k}x) + C`] },
      { i: `e${sup(k)}ˣ`, r: `e${sup(k)}ˣ/${k} + C`, w: [`${k}e${sup(k)}ˣ + C`, `e${sup(k)}ˣ + C`, `e${sup(k + 1)}ˣ/${k + 1} + C`] },
      { i: `2x(x² + ${c})${sup(n)}`, r: `(x² + ${c})${sup(n + 1)}/${n + 1} + C`, w: [`(x² + ${c})${sup(n + 1)} + C`, `2x(x² + ${c})${sup(n + 1)}/${n + 1} + C`, `${2 * n}x(x² + ${c})${n === 2 ? "" : sup(n - 1)} + C`] },
      { i: `1/(${lin(k, b)})`, r: `ln|${lin(k, b)}|/${k} + C`, w: [`ln|${lin(k, b)}| + C`, `${k} ln|${lin(k, b)}| + C`, `−1/(${lin(k, b)})² + C`] },
    ]);
    return mk(
      {
        key: `us-r-${T.i}`,
        prompt: "Integrate with a substitution.",
        math: `∫ ${T.i} dx`,
        hint: "Let u be the inside. Adjust for du = (constant)·dx by dividing by that constant.",
        explain: `Check by differentiating: d/dx of ${T.r.replace(" + C", "")} gives back ${T.i}.`,
      },
      label(T.r, T.w),
    );
  }
  if (Math.random() < 0.4) {
    const a = rand(0, 2);
    const b = a + rand(1, 2);
    const k = rand(1, 5);
    const right = `u from ${a * a + k} to ${b * b + k}`;
    return mk(
      {
        key: `us-b-${a}-${b}-${k}`,
        prompt: `In ${integ(a, b, `2x·f(x² + ${k})`)}, let u = x² + ${k}. The new limits are…`,
        hint: "Change the limits too: plug each old x-limit into u.",
        explain: `x = ${a} gives u = ${a * a + k}; x = ${b} gives u = ${b * b + k}.`,
      },
      label(right, [`u from ${a} to ${b}`, `u from ${a * a} to ${b * b}`, `u from ${a + k} to ${b + k}`]),
    );
  }
  let b = 1;
  let m = 1;
  let v = 0.1;
  do {
    b = rand(1, 2);
    m = rand(1, 5);
    v = ((b * b + 1) ** (m + 1) - 1) / (m + 1);
  } while (!terminates((b * b + 1) ** (m + 1) - 1, m + 1) || v > 100000);
  return mk(
    {
      key: `us-d-${b}-${m}`,
      prompt: "Substitute, change the limits, and evaluate.",
      math: integ(0, b, `2x(x² + 1)${m === 1 ? "" : sup(m)}`),
      hint: `u = x² + 1 runs from 1 to ${b * b + 1}, and 2x dx = du.`,
      explain: `${integ(1, b * b + 1, `u${m === 1 ? "" : sup(m)}`, "du")} = (${b * b + 1}${sup(m + 1)} − 1)/${m + 1} = ${ds(v)}.`,
    },
    kpos(v),
  );
}

/** CALC.6.8 — integration by parts (BC). */
export function byParts(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  const c = rand(1, 5);
  const C = c === 1 ? "" : String(c);
  if (kind === 0) {
    const T = pick([
      { i: `${C}xeˣ`, r: `${C}xeˣ − ${C}eˣ + C`, w: [`${C}xeˣ + ${C}eˣ + C`, `${C}x²eˣ/2 + C`, `${C}xeˣ − ${C}eˣ`] },
      { i: `${C}x cos x`, r: `${C}x sin x + ${C}cos x + C`, w: [`${C}x sin x − ${C}cos x + C`, `${C}x² sin x/2 + C`, `−${C}x sin x + ${C}cos x + C`] },
      { i: `${C}x sin x`, r: `−${C}x cos x + ${C}sin x + C`, w: [`${C}x cos x + ${C}sin x + C`, `−${C}x cos x − ${C}sin x + C`, `${C}x² cos x/2 + C`] },
      { i: `${C}ln x`, r: `${C}x ln x − ${C}x + C`, w: [`${c}/x + C`, `${C}x ln x + C`, `${C}x ln x + ${C}x + C`] },
    ]);
    return mk(
      {
        key: `bp-r-${T.i}`,
        prompt: "Integrate by parts: ∫u dv = uv − ∫v du.",
        math: `∫ ${T.i} dx`,
        hint: "Let u be the part that gets simpler when differentiated (x, or ln x).",
        explain: `Differentiate ${T.r.replace(" + C", "")} to check: you get ${T.i}.`,
      },
      label(T.r, T.w),
    );
  }
  if (kind === 1) {
    const n = rand(1, 5);
    const g = pick(["eˣ", "sin x", "cos x", "ln x"]);
    const isLn = g === "ln x";
    const right = isLn ? "u = ln x" : `u = ${xp(n)}`;
    return mk(
      {
        key: `bp-u-${n}-${g}`,
        prompt: "Choose u for integration by parts.",
        eq: [`∫ ${xp(n)}${g.startsWith("e") ? "" : " "}${g} dx`],
        say: talk(`∫ ${xp(n)} ${g} dx. Choose u for integration by parts.`),
        hint: "LIATE: Logs, Inverse trig, Algebraic, Trig, Exponential. Pick the earliest one as u.",
        explain: isLn ? "Logs come first: u = ln x (its derivative 1/x is simpler, and xⁿ is easy to integrate)." : `Algebraic beats ${g === "eˣ" ? "exponential" : "trig"}: u = ${xp(n)}, which shrinks each time you differentiate.`,
      },
      label(right, [isLn ? `u = ${xp(n)}` : `u = ${g}`, `u = ${xp(n)}·${g}`, `u = ${xp(n + 1)}`]),
    );
  }
  const T = pick([
    { m: integ(0, 1, `${C}xeˣ`), v: c, pi: false },
    { m: integ(1, "e", `${C}ln x`), v: c, pi: false },
    { m: integ(0, "π", `${C}x sin x`), v: c, pi: true },
  ]);
  return mk(
    {
      key: `bp-d-${T.m}`,
      prompt: "Integrate by parts, then evaluate.",
      math: T.m,
      hint: "Find the antiderivative by parts, then subtract its values at the limits.",
      explain: T.pi ? `[−x cos x + sin x] from 0 to π = π, so the answer is ${piFr(c)}.` : `The antiderivative gives 1 for the basic integral, so the answer is ${c}.`,
    },
    T.pi ? label(piFr(c), [piFr(2 * c), String(c), piFr(c, 2)]) : kp(T.v),
  );
}

/** CALC.6.8 — partial fractions (BC). */
export function partialFractions(kinds = [0, 1]): Question {
  const kind = pick(kinds);
  const A = nz(-4, 4);
  const B = nz(-4, 4);
  let a = 0;
  let b = 0;
  while (a === b) {
    a = rand(-4, 4);
    b = rand(-4, 4);
  }
  const top = lin(A + B, -(A * b + B * a));
  const den = `[${fac(a)}${fac(b)}]`;
  if (kind === 0) {
    const askA = Math.random() < 0.5;
    return mk(
      {
        key: `pf-${A}-${B}-${a}-${b}-${askA}`,
        prompt: `(${top})/${den} = A/${fac(a)} + B/${fac(b)}. Find ${askA ? "A" : "B"}.`,
        eq: [askA ? "A" : "B", "=", "?"],
        hint: `Multiply through: ${top} = A${fac(b)} + B${fac(a)}. Plug in x = ${fmt(askA ? a : b)} to wipe out the other letter.`,
        explain: `At x = ${fmt(a)}: ${fmt((A + B) * a - (A * b + B * a))} = A(${fmt(a - b)}), so A = ${fmt(A)}. At x = ${fmt(b)}: B = ${fmt(B)}.`,
      },
      kp(askA ? A : B),
    );
  }
  const L = (k: number, r: number) => `${k === 1 ? "" : k === -1 ? "−" : fmt(k)}ln|${lin(1, -r)}|`;
  const sum = (k1: number, r1: number, k2: number, r2: number) => `${L(k1, r1)} ${k2 < 0 ? "−" : "+"} ${L(Math.abs(k2), r2)} + C`;
  return mk(
    {
      key: `pf-i-${A}-${B}-${a}-${b}`,
      prompt: `Split into partial fractions, then integrate.`,
      math: `∫ (${top})/${den} dx`,
      hint: "Find A and B with A/(x − a) + B/(x − b), then each piece integrates to a log.",
      explain: `(${top})/${den} = ${fmt(A)}/${fac(a)} ${B < 0 ? "−" : "+"} ${Math.abs(B)}/${fac(b)}, so the integral is ${sum(A, a, B, b)}.`,
    },
    label(sum(A, a, B, b), [sum(B, a, A, b), sum(-A, a, -B, b), `ln|${fac(a)}${fac(b)}| + C`], [sum(A, a, -B, b)]),
  );
}

const PPOW = [
  { s: "x²", n: 2, d: 1 },
  { s: "x³", n: 3, d: 1 },
  { s: "x⁴", n: 4, d: 1 },
  { s: "√x", n: 1, d: 2 },
  { s: "x", n: 1, d: 1 },
  { s: "x√x", n: 3, d: 2 },
  { s: "∛x", n: 1, d: 3 },
];

/** CALC.6.9 — improper integrals (BC). */
export function improper(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  const c = rand(1, 6);
  if (kind === 0 || kind === 2) {
    const P = pick(PPOW);
    const tail = kind === 0;
    const conv = tail ? P.n > P.d : P.n < P.d;
    const right = conv ? fr(c * P.d, tail ? P.n - P.d : P.d - P.n) : "diverges";
    return mk(
      {
        key: `ip-${kind}-${P.s}-${c}`,
        prompt: "Converges or diverges? If it converges, to what?",
        math: tail ? integ(1, "∞", `${c}/${P.s}`) : integ(0, 1, `${c}/${P.s}`),
        hint: tail ? "∫₁^∞ 1/xᵖ dx converges only when p > 1, to 1/(p − 1)." : "∫₀¹ 1/xᵖ dx converges only when p < 1, to 1/(1 − p).",
        explain: conv ? `p = ${fr(P.n, P.d)}, so it converges to ${c}/${fr(Math.abs(P.n - P.d), P.d)} = ${right}.` : `p = ${fr(P.n, P.d)}, so it diverges.`,
      },
      label(right, [conv ? "diverges" : fr(c, 1), "0", fr(c * P.d, P.n + P.d)], [fr(c, 2), "∞"]),
    );
  }
  if (kind === 1) {
    const k = rand(1, 6);
    return mk(
      {
        key: `ip-exp-${c}-${k}`,
        prompt: "Evaluate the improper integral.",
        math: integ(0, "∞", `${c === 1 ? "" : c}e${sup(-k)}ˣ`),
        hint: `Antiderivative: −(${c}/${k})e^(−${k}x). As x → ∞, e^(−${k}x) → 0.`,
        explain: `lim [−(${c}/${k})e^(−${k}b) + ${c}/${k}] = ${fr(c, k)}.`,
      },
      label(fr(c, k), [fr(k, c), "diverges", fr(-c, k)], [String(c * k), "0"]),
    );
  }
  const a = rand(0, 2);
  const b = a + rand(3, 5);
  const p = rand(a + 1, b - 1);
  const inf = Math.random() < 0.4;
  const right = inf ? "an infinite limit of integration" : `the integrand blows up at x = ${p}`;
  return mk(
    {
      key: `ip-why-${a}-${b}-${p}-${inf}`,
      prompt: "Why is this integral improper?",
      eq: [inf ? integ(a, "∞", `1/(x + ${p})²`) : integ(a, b, `1/${fac(p)}²`)],
      say: talk(`${inf ? integ(a, "∞", `1/(x + ${p})²`) : integ(a, b, `1/${fac(p)}²`)}. Why is this integral improper?`),
      hint: "Improper means an infinite interval, or an integrand that's unbounded somewhere in the interval (even inside).",
      explain: inf ? "The upper limit is ∞." : `x = ${p} is inside [${a}, ${b}], and the integrand → ∞ there.`,
    },
    label(right, [inf ? `the integrand blows up at x = ${p}` : "an infinite limit of integration", "it isn't improper", `the integrand is negative`]),
  );
}

/** CALC.6.7, CALC.6.8 — sort integrals by the technique they need. */
export function techniqueSort(): Question {
  return sortTask(
    {
      key: "ts",
      prompt: "Sort: which technique fits each integral best?",
      hint: "Inside function with its derivative nearby: u-sub. A product of different types: parts. A factorable fraction: partial fractions.",
      explain: "Spot the structure first: composition + derivative → substitution; x times eˣ/trig/ln → parts; rational with factored bottom → partial fractions.",
    },
    ["u-substitution", "by parts", "partial fractions", "basic rule"],
    [
      ["∫ 2x cos(x²) dx", "∫ x(x² + 1)⁵ dx", "∫ eˣ/(eˣ + 1) dx", "∫ (ln x)/x dx", "∫ sin x cos³x dx"],
      ["∫ x eˣ dx", "∫ x sin x dx", "∫ ln x dx", "∫ x² cos x dx", "∫ x ln x dx"],
      ["∫ 1/(x² − 1) dx", "∫ 3/((x − 1)(x + 2)) dx", "∫ (x + 5)/(x² + x − 2) dx", "∫ 1/(x(x + 3)) dx"],
      ["∫ (x³ − 4x) dx", "∫ 5 sec²x dx", "∫ 3/x dx", "∫ eˣ dx", "∫ √x dx"],
    ],
    1,
    2,
  );
}

/* ================================================= 8. Differential equations */

const ex = (k: number, v = "x") => (k === 1 ? `e${sup(v)}` : k === -1 ? `e⁻${sup(v)}` : `e${sup(k)}${sup(v)}`);

/** CALC.7.1 — checking solutions of differential equations. */
export function deCheck(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const k = nz(-5, 5);
    return mk(
      {
        key: `dc-exp-${k}`,
        prompt: `Which family solves dy/dx = ${k === 1 ? "" : k === -1 ? "−" : fmt(k)}y?`,
        hint: "Try each one: differentiate and see if you get k times the same function back.",
        explain: `d/dx (C${ex(k)}) = ${fmt(k)}·C${ex(k)} = ${fmt(k)}y. ✓`,
      },
      label(`y = C${ex(k)}`, [`y = ${ex(k)} + C`, `y = ${monoF(k, 2, 2)} + C`, `y = Ce^(x/${fmt(k)})`], [`y = C${ex(-k)}`]),
    );
  }
  if (kind === 1) {
    const k = rand(2, 5);
    const osc = Math.random() < 0.6;
    const t = pick(["sin", "cos"]);
    const right = osc ? `y = ${t}(${k}x)` : `y = ${ex(k)}`;
    return mk(
      {
        key: `dc-2-${k}-${osc}-${t}`,
        prompt: `Which function solves y″ = ${osc ? "−" : ""}${k * k}y?`,
        hint: "Differentiate each candidate twice and compare with the equation.",
        explain: osc ? `y″ = −${k * k}${t}(${k}x) = −${k * k}y. ✓` : `y″ = ${k * k}${ex(k)} = ${k * k}y. ✓`,
      },
      label(right, osc ? [`y = ${ex(k)}`, `y = ${t}(${k * k}x)`, `y = ${k}x²`] : [`y = sin(${k}x)`, `y = ${ex(k * k)}`, `y = ${k}x²`]),
    );
  }
  if (kind === 2) {
    const F = pick([
      { s: "xy", f: (x: number, y: number) => x * y },
      { s: "x + y", f: (x: number, y: number) => x + y },
      { s: "x − y²", f: (x: number, y: number) => x - y * y },
      { s: "2x + 3y", f: (x: number, y: number) => 2 * x + 3 * y },
      { s: "x² − y", f: (x: number, y: number) => x * x - y },
      { s: "y − 2x", f: (x: number, y: number) => y - 2 * x },
    ]);
    const a = rand(-3, 3);
    const b = rand(-3, 3);
    const v = F.f(a, b);
    if (v !== 0 && Math.random() < 0.4) {
      return mk(
        {
          key: `dc-dir-${F.s}-${a}-${b}`,
          prompt: `dy/dx = ${F.s}. Through (${fmt(a)}, ${fmt(b)}), is the solution curve rising or falling?`,
          hint: "Plug the point into the right side. The sign of dy/dx decides.",
          explain: `dy/dx = ${fmt(v)} there, so the curve is ${v > 0 ? "rising" : "falling"}.`,
        },
        label(v > 0 ? "rising" : "falling", [v > 0 ? "falling" : "rising", "flat"]),
      );
    }
    return mk(
      {
        key: `dc-pt-${F.s}-${a}-${b}`,
        prompt: `dy/dx = ${F.s}. Slope of the solution through (${fmt(a)}, ${fmt(b)})?`,
        eq: ["dy/dx", "=", "?"],
        hint: "You don't need to solve it: plug x and y into the right side.",
        explain: `Plug in x = ${fmt(a)}, y = ${fmt(b)}: ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  const form = rand(0, 1);
  const a = nz(-3, 3);
  if (form === 0) {
    const C = rand(-6, 6);
    const b = a * a + C;
    return mk(
      {
        key: `dc-C-sq-${a}-${C}`,
        prompt: `y = x² + C solves dy/dx = 2x. Find C so it passes through (${fmt(a)}, ${fmt(b)}).`,
        eq: ["C", "=", "?"],
        hint: "Plug the point in and solve for C.",
        explain: `${fmt(b)} = ${a * a} + C, so C = ${fmt(C)}.`,
      },
      kp(C),
    );
  }
  const C = nz(-3, 3);
  const b = C * a ** 3;
  return mk(
    {
      key: `dc-C-cu-${a}-${C}`,
      prompt: `y = Cx³ solves x·dy/dx = 3y. Find C so it passes through (${fmt(a)}, ${fmt(b)}).`,
      eq: ["C", "=", "?"],
      hint: "Plug the point in and solve for C.",
      explain: `${fmt(b)} = C(${fmt(a)})³ = ${fmt(a ** 3)}C, so C = ${fmt(C)}.`,
    },
    kp(C),
  );
}

const DES = [
  { s: "x", f: (x: number) => x },
  { s: "y", f: (_: number, y: number) => y },
  { s: "−x", f: (x: number) => -x },
  { s: "−y", f: (_: number, y: number) => -y },
  { s: "x + y", f: (x: number, y: number) => x + y },
  { s: "x − y", f: (x: number, y: number) => x - y },
  { s: "y − x", f: (x: number, y: number) => y - x },
  { s: "xy", f: (x: number, y: number) => x * y },
  { s: "−xy", f: (x: number, y: number) => -x * y },
  { s: "x²", f: (x: number) => x * x },
  { s: "1 − y", f: (_: number, y: number) => 1 - y },
  { s: "y²", f: (_: number, y: number) => y * y },
];

/** Short slope segments at every grid point: a slope field. */
function field(f: (x: number, y: number) => number): Seg[] {
  const out: Seg[] = [];
  for (let x = -3; x <= 3; x++) {
    for (let y = -2; y <= 2; y++) {
      const s = f(x, y);
      const dx = 0.3 / Math.sqrt(1 + s * s);
      out.push({ from: [x - dx, y - s * dx], to: [x + dx, y + s * dx], colour: "wave" });
    }
  }
  return out;
}

/** CALC.7.2 — slope fields. */
export function slopeFields(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const [right, ...wrong] = shuffle(DES).slice(0, 4);
    return mk(
      {
        key: `sf-m-${right.s}-${wrong.map((w) => w.s).sort().join("|")}`,
        prompt: "Which differential equation matches this slope field?",
        visual: plot([-3.5, 3.5], [-2.5, 2.5], { lines: field(right.f) }),
        needsVisual: true,
        hint: "Check where the segments are flat, and whether slopes change as you move left-right (x) or up-down (y).",
        explain: `The slopes match dy/dx = ${right.s}: test a few points, like (1, 1) where the slope is ${fmt(right.f(1, 1))}.`,
      },
      label(`dy/dx = ${right.s}`, wrong.map((w) => `dy/dx = ${w.s}`)),
    );
  }
  if (kind === 1) {
    const F = pick(DES);
    const a = rand(-3, 3);
    const b = rand(-2, 2);
    const v = F.f(a, b);
    return mk(
      {
        key: `sf-pt-${F.s}-${a}-${b}`,
        prompt: `dy/dx = ${F.s}. What's the slope of the segment at P(${fmt(a)}, ${fmt(b)})?`,
        eq: ["dy/dx", "=", "?"],
        visual: plot([-3.5, 3.5], [-2.5, 2.5], { lines: field(F.f), points: [{ x: a, y: b, label: "P" }] }),
        hint: "Plug the point's x and y into the equation.",
        explain: `At (${fmt(a)}, ${fmt(b)}): dy/dx = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  const k = rand(-2, 2);
  const yForm = Math.random() < 0.6;
  const s = yForm ? `y ${k < 0 ? "+" : "−"} ${Math.abs(k)}`.replace(" − 0", "") : `x ${k < 0 ? "+" : "−"} ${Math.abs(k)}`.replace(" − 0", "");
  const f = yForm ? (_: number, y: number) => y - k : (x: number) => x - k;
  return mk(
    {
      key: `sf-flat-${k}-${yForm}`,
      prompt: `dy/dx = ${s}. Along which line are all the segments flat?`,
      eq: [yForm ? "y" : "x", "=", "?"],
      visual: plot([-3.5, 3.5], [-2.5, 2.5], { lines: field(f) }),
      hint: "Flat means slope 0. Set the right side equal to 0.",
      explain: `${s} = 0 when ${yForm ? "y" : "x"} = ${fmt(k)}.`,
    },
    kp(k),
  );
}

/** CALC.7.3 — separation of variables. */
export function separation(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const k = rand(2, 6);
    const T = pick([
      { d: `${k}x²y`, r: `dy/y = ${k}x² dx`, w: [`y dy = ${k}x² dx`, `dy = ${k}x²y dx`, `dy/${k}x² = y dx`] },
      { d: `${k}x/y`, r: `y dy = ${k}x dx`, w: [`dy/y = ${k}x dx`, `y dx = ${k}x dy`, `dy = ${k}x dx`] },
      { d: `${k}y² cos x`, r: `dy/y² = ${k} cos x dx`, w: [`y² dy = ${k} cos x dx`, `dy = ${k}y² cos x dx`, `dy/cos x = ${k}y² dx`] },
      { d: `${k}eˣ/y`, r: `y dy = ${k}eˣ dx`, w: [`dy/y = ${k}eˣ dx`, `eˣ dy = ${k}y dx`, `dy = ${k}eˣ dx`] },
      { d: `(x + ${k})y`, r: `dy/y = (x + ${k}) dx`, w: [`y dy = (x + ${k}) dx`, `dy = (x + ${k})y dx`, `dy/(x + ${k}) = y dx`] },
    ]);
    return mk(
      {
        key: `sv-sep-${T.d}`,
        prompt: `Separate the variables in dy/dx = ${T.d}.`,
        hint: "Get every y (with dy) on one side and every x (with dx) on the other, using multiplication and division only.",
        explain: `Divide or multiply to move the y's left: ${T.r}.`,
      },
      label(T.r, T.w),
    );
  }
  if (kind === 1) {
    const k = nz(-4, 4);
    const A = rand(2, 9);
    return mk(
      {
        key: `sv-exp-${k}-${A}`,
        prompt: `Solve dy/dx = ${k === 1 ? "" : k === -1 ? "−" : fmt(k)}y with y(0) = ${A}.`,
        hint: "dy/y = k dx gives ln|y| = kx + C, so y = Ce^(kx). Use y(0) to find C.",
        explain: `y = C${ex(k)} and y(0) = C = ${A}, so y = ${A}${ex(k)}.`,
      },
      label(`y = ${A}${ex(k)}`, [`y = ${ex(k)} + ${A - 1}`, `y = ${A}e^(x/${fmt(k)})`, `y = ${fmt(A * k)}${ex(k)}`], [`y = ${A}${ex(-k)}`]),
    );
  }
  if (kind === 2) {
    const [p, q, r] = pick(TRIPLES.filter((t) => t[2] > 0));
    const plus = Math.random() < 0.5;
    return mk(
      {
        key: `sv-circ-${p}-${q}-${plus}`,
        prompt: plus ? `dy/dx = x/y and y(0) = ${q}. Find y(${p}).` : `dy/dx = −x/y and y(0) = ${r}. Find y(${p}).`,
        hint: "y dy = ±x dx. Integrate both sides, use the initial condition, then solve for y (take the positive root).",
        explain: plus ? `y² = x² + ${q * q}, so y(${p}) = √(${p * p} + ${q * q}) = ${r}.` : `y² = ${r * r} − x², so y(${p}) = √(${r * r} − ${p * p}) = ${q}.`,
      },
      kpos(plus ? r : q),
    );
  }
  const A = rand(2, 9);
  const T = pick([
    { d: "2xy", r: `y = ${A}e^(x²)`, w: [`y = ${A}e^(2x)`, `y = e^(x²) + ${A - 1}`, `y = ${A}e^(x²/2)`] },
    { d: "y cos x", r: `y = ${A}e^(sin x)`, w: [`y = ${A}e^(cos x)`, `y = ${A} sin x`, `y = e^(sin x) + ${A - 1}`] },
    { d: "3x²y", r: `y = ${A}e^(x³)`, w: [`y = ${A}e^(3x²)`, `y = e^(x³) + ${A - 1}`, `y = ${A}x³`] },
  ]);
  return mk(
    {
      key: `sv-g-${T.d}-${A}`,
      prompt: `Solve dy/dx = ${T.d} with y(0) = ${A}.`,
      hint: "Separate: dy/y = (the x part) dx. Integrate, exponentiate, then use y(0).",
      explain: `ln|y| = ∫(…)dx + C, so ${T.r}.`,
    },
    label(T.r, T.w),
  );
}

/** CALC.7.4 — exponential growth and decay models. */
export function expModels(kinds = [0, 1, 2, 3, 4, 5]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const P0 = rand(1, 10) * 50;
    const T = rand(2, 10);
    const n = rand(1, 5);
    return mk(
      {
        key: `em-dbl-${P0}-${T}-${n}`,
        prompt: `A culture starts at ${P0} cells and doubles every ${T} hours. How many after ${n * T} hours?`,
        hint: `${n * T} hours is ${n} doubling times.`,
        explain: `${P0}·2${sup(n)} = ${P0 * 2 ** n} cells.`,
      },
      kpos(P0 * 2 ** n),
    );
  }
  if (kind === 1) {
    const m = rand(1, 40);
    const n = rand(1, 4);
    const T = rand(2, 30);
    return mk(
      {
        key: `em-half-${m}-${n}-${T}`,
        prompt: `${m * 2 ** n} g of an isotope with half-life ${T} years. How much is left after ${n * T} years?`,
        hint: `That's ${n} half-lives: halve it ${n} time${n > 1 ? "s" : ""}.`,
        explain: `${m * 2 ** n}·(1/2)${sup(n)} = ${m} g.`,
        unit: "g",
      },
      kpos(m),
    );
  }
  if (kind === 2) {
    const A = rand(1, 9) * 10;
    const r = pick([2, 3]);
    const T = rand(2, 6);
    const n = rand(2, 3);
    return mk(
      {
        key: `em-ratio-${A}-${r}-${T}-${n}`,
        prompt: `dy/dt = ky, y(0) = ${A}, y(${T}) = ${A * r}. Find y(${n * T}).`,
        hint: "In exponential models, equal time steps multiply by the same factor.",
        explain: `Each ${T} units multiplies by ${r}, so y(${n * T}) = ${A}·${r}${sup(n)} = ${A * r ** n}.`,
      },
      kpos(A * r ** n),
    );
  }
  if (kind === 3) {
    const j = rand(2, 10) * pick([1, -1]);
    const m = rand(1, 9);
    return mk(
      {
        key: `em-rate-${j}-${m}`,
        prompt: `dP/dt = ${ds(j / 100)}P. How fast is P changing when P = ${m * 100}?`,
        eq: ["dP/dt", "=", "?"],
        hint: "Just plug P into the right side.",
        explain: `${ds(j / 100)} × ${m * 100} = ${fmt(j * m)}.`,
      },
      kp(j * m),
    );
  }
  if (kind === 4) {
    const T = rand(2, 12);
    const grow = Math.random() < 0.5;
    const right = `k = ${grow ? "" : "−"}ln 2/${T}`;
    return mk(
      {
        key: `em-k-${T}-${grow}`,
        prompt: `y = y₀e^(kt) ${grow ? "doubles" : "halves"} every ${T} years. Find k.`,
        hint: `Solve e^(k·${T}) = ${grow ? "2" : "1/2"} by taking ln of both sides.`,
        explain: `k·${T} = ln(${grow ? "2" : "1/2"}) = ${grow ? "" : "−"}ln 2, so ${right}.`,
      },
      label(right, [`k = ${grow ? "−" : ""}ln 2/${T}`, `k = ${grow ? 2 : 0.5}/${T}`, `k = ${T}/ln 2`]),
    );
  }
  const k = pick([0.1, 0.2, 0.5]);
  const S = pick([20, 22, 25, 68, 70]);
  const D = rand(1, 9) * 10 * pick([1, -1]);
  const askLimit = Math.random() < 0.3;
  return mk(
    {
      key: `em-cool-${k}-${S}-${D}-${askLimit}`,
      prompt: askLimit
        ? `Newton's cooling: dT/dt = −${k}(T − ${S}). What temperature does T approach?`
        : `dT/dt = −${k}(T − ${S}). Find dT/dt when T = ${S + D}°.`,
      hint: askLimit ? "The temperature stops changing when dT/dt = 0." : "Plug T in.",
      explain: askLimit ? `dT/dt = 0 when T = ${S}: the room temperature.` : `−${k}(${S + D} − ${S}) = ${ds(-k * D)}° per minute.`,
    },
    kp(askLimit ? S : -k * D),
  );
}

const EULER_DE = [
  { s: "x + y", f: (x: number, y: number) => x + y },
  { s: "x − y", f: (x: number, y: number) => x - y },
  { s: "2x", f: (x: number) => 2 * x },
  { s: "y", f: (_: number, y: number) => y },
  { s: "y − x", f: (x: number, y: number) => y - x },
  { s: "1 + y", f: (_: number, y: number) => 1 + y },
  { s: "x + 2y", f: (x: number, y: number) => x + 2 * y },
  { s: "xy", f: (x: number, y: number) => x * y },
];

/** CALC.7.5 — Euler's method (BC). */
export function euler(): Question {
  const F = pick(EULER_DE);
  const x0 = rand(0, 2);
  const y0 = rand(-2, 3);
  const h = pick([1, 0.5]);
  const n = rand(1, 2);
  let x = x0;
  let y = y0;
  const steps: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = F.f(x, y);
    const ny = clean(y + h * s);
    steps.push(`y(${ds(x + h)}) ≈ ${ds(y)} + ${ds(h)}(${ds(s)}) = ${ds(ny)}`);
    x = clean(x + h);
    y = ny;
  }
  return mk(
    {
      key: `eu-${F.s}-${x0}-${y0}-${h}-${n}`,
      prompt: `dy/dx = ${F.s}, y(${x0}) = ${fmt(y0)}. Euler's method, step ${ds(h)}:`,
      eq: [`y(${ds(x)})`, "≈", "?"],
      say: talk(`dy/dx = ${F.s}, y(${x0}) = ${fmt(y0)}. Use Euler's method with step ${ds(h)} to estimate y at ${ds(x)}.`),
      hint: "New y = old y + step × slope, where the slope comes from plugging the old point into dy/dx.",
      explain: `${steps.join("; ")}.`,
    },
    kp(y),
  );
}

/** CALC.7.5 — plot the points Euler's method produces (BC). */
export function eulerPlot(): Question {
  let F = pick(EULER_DE);
  let x0 = 0;
  let y0 = 0;
  let pts: { x: number; y: number; label: string }[] = [];
  let ok = false;
  while (!ok) {
    F = pick(EULER_DE);
    x0 = rand(-3, 1);
    y0 = rand(-3, 3);
    pts = [];
    let x = x0;
    let y = y0;
    for (let i = 1; i <= 2; i++) {
      y = y + F.f(x, y);
      x = x + 1;
      pts.push({ x, y, label: `step ${i}` });
    }
    ok = pts.every((p) => Math.abs(p.y) <= 6 && Math.abs(p.x) <= 6);
  }
  return doIt(
    {
      key: `ep-${F.s}-${x0}-${y0}`,
      prompt: `dy/dx = ${F.s}, starting at (${fmt(x0)}, ${fmt(y0)}). Plot two Euler steps with h = 1.`,
      hint: "Each step: move 1 right, and change y by the slope at the point you're leaving.",
      explain: `(${fmt(x0)}, ${fmt(y0)}) → ${pts.map((p) => `(${fmt(p.x)}, ${fmt(p.y)})`).join(" → ")}.`,
    },
    { kind: "plotPoints", points: pts, size: 6, quadrants: 4 },
    pts[0].y,
  );
}

const LOGI = {
  up: "increases toward M",
  down: "decreases toward M",
  flat: "stays at M",
  boom: "grows without bound",
};

/** CALC.7.5 — logistic growth (BC). */
export function logistic(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  const M = pick([100, 200, 400, 500, 1000, 300, 600]);
  const k = pick([0.1, 0.2, 0.5, 0.3]);
  const form = rand(0, 2);
  const de =
    form === 0 || !terminates(k, M) ? `${k}P(1 − P/${M})` : form === 1 ? `${ds(k / M)}P(${M} − P)` : `${k}P − ${ds(k / M)}P²`;
  if (kind === 0 || kind === 1) {
    const v = kind === 0 ? M : M / 2;
    return mk(
      {
        key: `lg-${kind}-${M}-${k}-${form}`,
        prompt: `dP/dt = ${de}. ${kind === 0 ? "What's the carrying capacity?" : "At what P is P growing fastest?"}`,
        hint: kind === 0 ? "Factor it as kP(1 − P/M). Growth stops when P = M." : "Logistic growth is fastest at half the carrying capacity.",
        explain: kind === 0 ? `The carrying capacity is M = ${M}.` : `M = ${M}, so the fastest growth is at P = ${M / 2}.`,
      },
      kpos(v),
    );
  }
  if (kind === 2) {
    const type = pick(["up", "down", "flat"] as const);
    const P0 = type === "up" ? rand(1, 9) * M / 10 : type === "down" ? M + rand(1, 5) * 50 : M;
    return mk(
      {
        key: `lg-b-${M}-${k}-${form}-${P0}`,
        prompt: `dP/dt = ${de} and P(0) = ${P0}. Over time, P…`,
        hint: "Find M. Below M the rate is positive; above M it's negative.",
        explain: type === "up" ? `P(0) < ${M}, so dP/dt > 0 and P climbs toward ${M}.` : type === "down" ? `P(0) > ${M}, so dP/dt < 0 and P falls toward ${M}.` : `P(0) = ${M} makes dP/dt = 0: P stays put.`,
      },
      label(LOGI[type], Object.values(LOGI).filter((v) => v !== LOGI[type])),
    );
  }
  const j = rand(1, 12);
  const P = (M * j) / 10;
  const v = clean(k * P * (1 - P / M));
  return mk(
    {
      key: `lg-r-${M}-${k}-${j}`,
      prompt: `dP/dt = ${k}P(1 − P/${M}). How fast is P growing when P = ${ds(P)}?`,
      eq: ["dP/dt", "=", "?"],
      hint: "Plug P into the right side.",
      explain: `${k}·${ds(P)}·(1 − ${ds(P)}/${M}) = ${ds(v)}.`,
    },
    kp(v),
  );
}

/* =============================================== 9. Applications of integration */

/** CALC.8.1 — the average value of a function. */
export function averageValue(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(-3, 3);
    const w = rand(2, 8);
    const m = rand(-6, 9);
    return mk(
      {
        key: `av-i-${a}-${w}-${m}`,
        prompt: `${integ(a, a + w, "f(x)")} = ${fmt(m * w)}. Average value of f on [${fmt(a)}, ${fmt(a + w)}]?`,
        hint: "Average value = (1/(b − a))·∫ₐᵇ f(x) dx.",
        explain: `${fmt(m * w)}/${w} = ${fmt(m)}.`,
      },
      kp(m),
    );
  }
  if (kind === 1) {
    const m = nz(-4, 4);
    const c = rand(-5, 9);
    const p = rand(-3, 3);
    const q = p + rand(1, 6);
    const v = (m * (p + q)) / 2 + c;
    const temp = Math.random() < 0.5 && p >= 0;
    return mk(
      {
        key: `av-l-${m}-${c}-${p}-${q}-${temp}`,
        prompt: temp
          ? `The temperature is T(t) = ${poly([[m, 1], [60 + c, 0]], "t")} °F, t in hours. Average temperature from t = ${p} to t = ${q}?`
          : `Average value of f(x) = ${lin(m, c)} on [${fmt(p)}, ${fmt(q)}]?`,
        hint: "For a straight line, the average value is the value at the midpoint (or use the formula).",
        explain: `(1/${q - p})${integ(p, q, `(${lin(m, temp ? 60 + c : c, temp ? "t" : "x")})`, temp ? "dt" : "dx")} = ${ds(temp ? v + 60 : v)}.`,
        unit: temp ? "°F" : undefined,
      },
      kp(temp ? v + 60 : v),
    );
  }
  if (kind === 2) {
    const k = nz(-3, 3);
    const b = rand(1, 6);
    return mk(
      {
        key: `av-q-${k}-${b}`,
        prompt: `Average value of f(x) = ${poly([[3 * k, 2]])} on [0, ${b}]?`,
        hint: "Integrate, then divide by the length of the interval.",
        explain: `(1/${b})·${fmt(k)}x³ from 0 to ${b} = ${fmt(k * b ** 3)}/${b} = ${fmt(k * b * b)}.`,
      },
      kp(k * b * b),
    );
  }
  const c = rand(1, 6);
  const sin = Math.random() < 0.5;
  const right = `${2 * c}/π`;
  return mk(
    {
      key: `av-t-${c}-${sin}`,
      prompt: `Average value of ${c === 1 ? "" : c}${sin ? "sin x on [0, π]" : "cos x on [0, π/2]"}?`,
      hint: "Integrate exactly, then divide by the interval's length (a multiple of π).",
      explain: sin ? `(1/π)·${c}·2 = ${right}.` : `(2/π)·${c}·1 = ${right}.`,
    },
    label(right, [`${c}/π`, String(2 * c), "0"], [`${c}π/2`]),
  );
}

const MEANS = {
  dist: "total distance traveled",
  disp: "displacement (change in position)",
  dv: "change in velocity",
  pos: "the position at the end",
};

/** CALC.8.2 — motion with integrals: displacement, distance, position and velocity. */
export function motionIntegrals(kinds = [0, 1, 2, 3, 4]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const c = pick([1, 2]);
    const T = rand(3, 8);
    const p = rand(1, T - 1);
    const askDist = Math.random() < 0.5;
    const disp = c * ((T * T) / 2 - p * T);
    const dist = c * ((p * p) / 2 + ((T - p) * (T - p)) / 2);
    const f: Fn = (t) => c * (t - p);
    return mk(
      {
        key: `mi-v-${c}-${T}-${p}-${askDist}`,
        prompt: `v(t) = ${lin(c, -c * p, "t")} m/s for 0 ≤ t ≤ ${T}. Find the ${askDist ? "total distance traveled" : "displacement"}.`,
        visual: plot([-1, T + 1], fitY([f], 0, T), { curves: [{ fn: f, colour: "wave", label: "v" }], shade: { fn: f, from: 0, to: T } }),
        hint: askDist ? "Distance = ∫|v| dt: count the area below the axis as positive." : "Displacement = ∫v dt: area below the axis counts as negative.",
        explain: `The two triangles have areas ${ds((c * p * p) / 2)} (below) and ${ds((c * (T - p) ** 2) / 2)} (above). ${askDist ? `Distance = ${ds(dist)}` : `Displacement = ${ds(disp)}`} m.`,
        unit: "m",
      },
      askDist ? kpos(dist) : kp(disp),
    );
  }
  if (kind === 1 || kind === 3) {
    const vel = kind === 1;
    const x0 = rand(-9, 9);
    const a = nz(-3, 4) * 2;
    const b = rand(-5, 5);
    const T = rand(1, 5);
    const v = x0 + (a * T * T) / 2 + b * T;
    return mk(
      {
        key: `mi-${kind}-${x0}-${a}-${b}-${T}`,
        prompt: vel ? `x(0) = ${fmt(x0)} and v(t) = ${lin(a, b, "t")}. Find x(${T}).` : `v(0) = ${fmt(x0)} and a(t) = ${lin(a, b, "t")}. Find v(${T}).`,
        hint: vel ? "Position = starting position + ∫ velocity." : "Velocity = starting velocity + ∫ acceleration.",
        explain: `${fmt(x0)} + ${integ(0, T, `(${lin(a, b, "t")})`, "dt")} = ${fmt(x0)} + ${fmt((a * T * T) / 2 + b * T)} = ${fmt(v)}.`,
      },
      kp(v),
    );
  }
  if (kind === 2) {
    const T = rand(4, 8);
    const askDist = Math.random() < 0.5;
    let pts = corners(T, -3, 3);
    while (askDist && !Number.isInteger(polyAbsArea(pts) * 4)) pts = corners(T, -3, 3);
    const f = polyline(pts);
    const v = askDist ? polyAbsArea(pts) : polyArea(pts, T);
    return mk(
      {
        key: `mi-g-${pts.flat().join("_")}-${askDist}`,
        prompt: `The graph shows v(t) in ft/s. Find the ${askDist ? "total distance traveled" : "displacement"} from t = 0 to ${T}.`,
        visual: plot([-1, T + 1], [-4, 4], { curves: [{ fn: f, colour: "wave", label: "v" }], shade: { fn: f, from: 0, to: T } }),
        needsVisual: true,
        hint: askDist ? "Add all the areas as positive numbers." : "Add areas above the axis, subtract areas below.",
        explain: `${askDist ? "Total" : "Signed"} area = ${ds(v)} ft.`,
        unit: "ft",
      },
      askDist ? kpos(v) : kp(v),
    );
  }
  const a = rand(0, 3);
  const b = a + rand(2, 8);
  const type = pick(["dist", "disp", "dv"] as const);
  const inner = type === "dist" ? "|v(t)|" : type === "disp" ? "v(t)" : "a(t)";
  return mk(
    {
      key: `mi-m-${a}-${b}-${type}`,
      prompt: `For a moving particle, what does ${integ(a, b, inner, "dt")} give?`,
      hint: "Integrating a rate gives a total change. |v| is speed, so it never subtracts.",
      explain: `${integ(a, b, inner, "dt")} is the ${MEANS[type]}.`,
    },
    label(MEANS[type], Object.values(MEANS).filter((m) => m !== MEANS[type])),
  );
}

/** CALC.8.3 — area between curves. */
export function areaBetween(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    let p = 0;
    let q = 0;
    while (q - p < 1 || q - p > 4) {
      p = rand(-3, 2);
      q = rand(-2, 3);
    }
    const w = q - p;
    const f: Fn = (x) => x * x;
    const g: Fn = (x) => (p + q) * x - p * q;
    const right = fr(w ** 3, 6);
    return mk(
      {
        key: `ab-pl-${p}-${q}`,
        prompt: `Find the area between y = x² and y = ${lin(p + q, -p * q)}.`,
        visual: plot([p - 1.5, q + 1.5], fitY([f], p - 1, q + 1), {
          curves: [{ fn: f, colour: "wave", label: "y = x²" }, { fn: g, colour: "berry" }],
          points: [{ x: p, y: p * p }, { x: q, y: q * q }],
          shade: { fn: g, fn2: f, from: p, to: q },
        }),
        hint: `They meet at x = ${fmt(p)} and x = ${fmt(q)}. Integrate (top − bottom); the line is on top.`,
        explain: `${integ(p, q, `(${lin(p + q, -p * q)} − x²)`)} = ${right}.`,
      },
      label(right, [fr(w ** 3, 3), fr(w ** 3, 2), fr(-(w ** 3), 6)], [fr(w * w, 2)]),
    );
  }
  if (kind === 1) {
    const c = rand(1, 3);
    const right = fr(8 * c ** 3, 3);
    return mk(
      {
        key: `ab-pp-${c}`,
        prompt: `Find the area between y = x² and y = ${2 * c * c} − x².`,
        visual: plot([-c - 1.5, c + 1.5], [-1, 2 * c * c + 1], {
          curves: [{ fn: (x) => x * x, colour: "wave" }, { fn: (x) => 2 * c * c - x * x, colour: "berry" }],
          points: [{ x: -c, y: c * c }, { x: c, y: c * c }],
          shade: { fn: (x) => 2 * c * c - x * x, fn2: (x) => x * x, from: -c, to: c },
        }),
        hint: `They meet where x² = ${2 * c * c} − x², at x = ±${c}.`,
        explain: `${integ(-c, c, `(${2 * c * c} − 2x²)`)} = ${4 * c ** 3} − ${fr(4 * c ** 3, 3)} = ${right}.`,
      },
      label(right, [fr(4 * c ** 3, 3), String(4 * c ** 3), fr(16 * c ** 3, 3)]),
    );
  }
  if (kind === 2) {
    const m = rand(-2, 2);
    const k = pick([4, 1]);
    const r = Math.sqrt(k);
    const a = m - r;
    const b = m + r;
    const fTop = Math.random() < 0.5;
    const top: Fn = (x) => k - (x - m) ** 2;
    const bot: Fn = (x) => (x - m) ** 2 - k;
    const [T, B] = fTop ? ["f", "g"] : ["g", "f"];
    const I = (inner: string, lo = a, hi = b) => integ(lo, hi, inner);
    return mk(
      {
        key: `ab-set-${m}-${k}-${fTop}`,
        prompt: "Which integral gives the area of the region between f and g?",
        visual: plot([m - r - 1.5, m + r + 1.5], [-k - 1, k + 1], {
          curves: [{ fn: top, colour: "wave", label: T }, { fn: bot, colour: "berry", label: B }],
          points: [{ x: a, y: 0 }, { x: b, y: 0 }],
          shade: { fn: top, fn2: bot, from: a, to: b },
        }),
        needsVisual: true,
        hint: "Top minus bottom, from the left meeting point to the right one.",
        explain: `${T} is on top between x = ${fmt(a)} and x = ${fmt(b)}, so use ${I(`(${T}(x) − ${B}(x))`)}.`,
      },
      label(I(`(${T}(x) − ${B}(x))`), [I(`(${B}(x) − ${T}(x))`), I(`(${T}(x) + ${B}(x))`), I(`${T}(x)`)]),
    );
  }
  const c = rand(1, 4);
  const right = fr(4 * c ** 3, 3);
  return mk(
    {
      key: `ab-y-${c}`,
      prompt: `Find the area between x = y² and x = ${c * c}. (Integrate in y.)`,
      visual: plot([-1, c * c + 1.5], [-c - 1, c + 1], {
        curves: [{ fn: (x) => (x >= 0 ? Math.sqrt(x) : NaN), colour: "wave", label: "x = y²" }, { fn: (x) => (x >= 0 ? -Math.sqrt(x) : NaN), colour: "wave" }],
        lines: [{ from: [c * c, -c - 1], to: [c * c, c + 1], colour: "berry" }],
        points: [{ x: c * c, y: c }, { x: c * c, y: -c }],
        shade: { fn: (x) => Math.sqrt(x), fn2: (x) => -Math.sqrt(x), from: 0, to: c * c },
      }),
      hint: `Right curve minus left curve: ∫ (${c * c} − y²) dy from y = −${c} to ${c}.`,
      explain: `${integ(-c, c, `(${c * c} − y²)`, "dy")} = ${2 * c ** 3} − ${fr(2 * c ** 3, 3)} = ${right}.`,
    },
    label(right, [fr(2 * c ** 3, 3), String(2 * c ** 3), fr(8 * c ** 3, 3)]),
  );
}

/** CALC.8.4 — volumes by discs and washers. */
export function volumeDiscs(kinds = [0, 1, 2, 3, 4]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const b = rand(1, 9);
    const f: Fn = (x) => (x >= 0 ? Math.sqrt(x) : NaN);
    const right = piFr(b * b, 2);
    return mk(
      {
        key: `vd-sq-${b}`,
        prompt: `Spin the region under y = √x, 0 ≤ x ≤ ${b}, around the x-axis. Volume?`,
        visual: plot([-1, b + 1], [-1, Math.ceil(Math.sqrt(b)) + 1], { curves: [{ fn: f, colour: "wave" }], shade: { fn: f, from: 0, to: b } }),
        hint: "Disc method: V = π∫ R(x)² dx, with R(x) = √x.",
        explain: `π${integ(0, b, "x")} = π·${fr(b * b, 2)} = ${right}.`,
      },
      label(right, [piFr(b * b), fr(b * b, 2), piFr(b * b, 4)], [piFr(2 * b, 3)]),
    );
  }
  if (kind === 1 || kind === 2) {
    const cone = kind === 1;
    const k = cone ? rand(1, 3) : 1;
    const h = cone ? rand(1, 4) : rand(1, 3);
    const right = cone ? piFr(k * k * h ** 3, 3) : piFr(h ** 5, 5);
    const f: Fn = cone ? (x) => k * x : (x) => x * x;
    return mk(
      {
        key: `vd-${kind}-${k}-${h}`,
        prompt: `Spin the region under y = ${cone ? poly([[k, 1]]) : "x²"}, 0 ≤ x ≤ ${h}, around the x-axis. Volume?`,
        visual: plot([-1, h + 1], fitY([f], 0, h), { curves: [{ fn: f, colour: "wave" }], shade: { fn: f, from: 0, to: h } }),
        hint: "V = π∫ R² dx. Square the radius before integrating.",
        explain: cone ? `π${integ(0, h, `${k * k === 1 ? "" : k * k}x²`)} = ${right}.` : `π${integ(0, h, "x⁴")} = ${right}.`,
      },
      label(right, cone ? [piFr(k * h * h, 2), piFr(k * k * h ** 3), fr(k * k * h ** 3, 3)] : [piFr(h ** 3, 3), piFr(h ** 5), piFr(h ** 4, 4)]),
    );
  }
  if (kind === 3) {
    const c = rand(1, 6);
    const root = Math.random() < 0.4 && c <= 4;
    const right = root ? piFr(c ** 4, 2) : piFr(2 * c ** 3, 3);
    const X = root ? c * c : c;
    const inner: Fn = root ? (x) => (x >= 0 ? Math.sqrt(x) : NaN) : (x) => x;
    return mk(
      {
        key: `vd-w-${c}-${root}`,
        prompt: root
          ? `The region between y = ${c} and y = √x (0 ≤ x ≤ ${c * c}) spins around the x-axis. Volume?`
          : `The region between y = ${c} and y = x (0 ≤ x ≤ ${c}) spins around the x-axis. Volume?`,
        visual: plot([-1, X + 1], [-1, c + 1], {
          curves: [{ fn: () => c, colour: "berry" }, { fn: inner, colour: "wave" }],
          points: [{ x: X, y: c }],
          shade: { fn: () => c, fn2: inner, from: 0, to: X },
        }),
        hint: "Washers: V = π∫ (R² − r²) dx, outer radius squared minus inner radius squared. Not (R − r)².",
        explain: root ? `π${integ(0, c * c, `(${c * c} − x)`)} = ${right}.` : `π${integ(0, c, `(${c * c} − x²)`)} = ${right}.`,
      },
      label(right, root ? [piFr(c ** 4, 6), piFr(c ** 4), fr(c ** 4, 2)] : [piFr(c ** 3, 3), piFr(c ** 3), fr(2 * c ** 3, 3)]),
    );
  }
  const a = rand(0, 2);
  const b = a + rand(1, 4);
  const k = rand(0, 3);
  const sq = (s: string) => (k ? `(${s} + ${k})²` : `${s}²`);
  const right = `π${integ(a, b, `(${sq("f(x)")} − ${sq("g(x)")})`)}`;
  const fTop: Fn = (x) => 3.5 + 0.7 * Math.cos(x);
  const gBot: Fn = (x) => 1 + 0.5 * Math.sin(1.3 * x);
  return mk(
    {
      key: `vd-set-${a}-${b}-${k}`,
      prompt: `f is above g ≥ ${k ? `−${k}` : "0"} on [${a}, ${b}]. Spin the region between them around ${k ? `y = −${k}` : "the x-axis"}. V = ?`,
      visual: plot([a - 1, b + 1], [-k - 1, 5], {
        curves: [{ fn: fTop, colour: "wave", label: "f" }, { fn: gBot, colour: "berry", label: "g" }],
        lines: k ? [{ from: [a - 1, -k], to: [b + 1, -k], colour: "sun", dashed: true }] : [],
        shade: { fn: fTop, fn2: gBot, from: a, to: b },
      }),
      hint: `Radii are measured from the axis${k ? ` y = −${k}, so add ${k} to each height` : ""}. Use π∫(R² − r²).`,
      explain: `Outer radius f(x)${k ? ` + ${k}` : ""}, inner radius g(x)${k ? ` + ${k}` : ""}: ${right}.`,
    },
    label(right, [
      `π${integ(a, b, k ? `(f(x) − g(x) + ${k})²` : "(f(x) − g(x))²")}`,
      integ(a, b, `(${sq("f(x)")} − ${sq("g(x)")})`),
      `π${integ(a, b, `(${k ? "f(x)² − g(x)²" : "g(x)² − f(x)²"})`)}`,
    ]),
  );
}

const SECTIONS = [
  { s: "squares with side s", a: "s²" },
  { s: "semicircles with diameter s", a: "πs²/8" },
  { s: "equilateral triangles with side s", a: "√3s²/4" },
  { s: "isosceles right triangles with leg s", a: "s²/2" },
  { s: "rectangles with base s and height 2s", a: "2s²" },
];

/** The region under y = √x from 0 to b, shaded: the base of a solid. */
function rootBase(b: number): Visual {
  const f: Fn = (x) => (x >= 0 ? Math.sqrt(x) : NaN);
  return plot([-1, b + 1], [-1, Math.ceil(Math.sqrt(b)) + 1], { curves: [{ fn: f, colour: "wave" }], shade: { fn: f, from: 0, to: b } });
}

/** CALC.8.4 — volumes with known cross-sections. */
export function crossSections(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const S = pick(SECTIONS);
    const a = rand(0, 2);
    const b = a + rand(1, 5);
    return mk(
      {
        key: `cs-a-${S.s}-${a}-${b}`,
        prompt: `A solid's slices ⟂ the x-axis on [${a}, ${b}] are ${S.s}. Area of one slice?`,
        hint: "Write the area of one slice using its base s. Then V = ∫ A(x) dx.",
        explain: `The area of each slice is ${S.a}.`,
      },
      label(S.a, ["s²", "πs²/8", "πs²/2", "√3s²/4", "s²/2", "2s²", "πs²/4"].filter((x) => x !== S.a).slice(0, 4).concat(["s"])),
    );
  }
  const b = rand(1, 8);
  const shape = kind === 1 ? pick(["square", "semi"] as const) : "tri";
  if (shape === "semi") {
    return mk(
      {
        key: `cs-semi-${b}`,
        prompt: `Base: under y = √x, 0 ≤ x ≤ ${b}. Slices ⟂ the x-axis are semicircles. Volume?`,
        visual: rootBase(b),
        hint: "Each diameter is s = √x, so A = π(√x)²/8 = πx/8.",
        explain: `${integ(0, b, "πx/8")} = ${piFr(b * b, 16)}.`,
      },
      label(piFr(b * b, 16), [piFr(b * b, 4), piFr(b * b, 2), piFr(b * b, 8)]),
    );
  }
  const v = shape === "square" ? (b * b) / 2 : (b * b) / 4;
  return mk(
    {
      key: `cs-${shape}-${b}`,
      prompt: `Base: under y = √x, 0 ≤ x ≤ ${b}. Slices ⟂ the x-axis are ${shape === "square" ? "squares" : "isosceles right triangles with a leg on the base"}. Volume?`,
      visual: rootBase(b),
      hint: shape === "square" ? "Each side is √x, so A(x) = x." : "Each leg is √x, so A(x) = x/2.",
      explain: `${integ(0, b, shape === "square" ? "x" : "x/2")} = ${ds(v)}.`,
    },
    kpos(v),
  );
}

/** CALC.8.5 — arc length (BC). */
export function arcLength(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const [r, s, h] = pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10]]);
    const k = rand(1, 3);
    const c = rand(-2, 2);
    const a = rand(-2, 1);
    const f: Fn = (x) => (r / s) * x + c;
    return mk(
      {
        key: `al-l-${r}-${s}-${k}-${c}-${a}`,
        prompt: `Arc length of y = (${fr(r, s)})x ${c < 0 ? "−" : "+"} ${Math.abs(c)} from x = ${fmt(a)} to x = ${fmt(a + s * k)}?`.replace(" + 0", ""),
        visual: plot([a - 1, a + s * k + 1], fitY([f], a, a + s * k), { curves: [{ fn: f, colour: "wave" }], points: [{ x: a, y: f(a) }, { x: a + s * k, y: f(a + s * k) }] }),
        hint: "L = ∫√(1 + (y′)²) dx. Here y′ is a constant, so it's just a multiplication.",
        explain: `√(1 + ${fr(r * r, s * s)}) = ${fr(h, s)}, times the width ${s * k} = ${h * k}. (Same as the distance formula.)`,
      },
      kpos(h * k),
    );
  }
  if (kind === 1) {
    const n = rand(2, 4);
    const c = rand(1, 3);
    const b = rand(1, 4);
    const d = c * n;
    const I = (inner: string) => integ(0, b, inner);
    const right = I(`√(1 + ${d * d}x${sup(2 * n - 2)})`.replace("x²)", "x²)"));
    return mk(
      {
        key: `al-set-${n}-${c}-${b}`,
        prompt: `Which integral is the arc length of y = ${poly([[c, n]])} from x = 0 to ${b}?`,
        hint: "L = ∫√(1 + (dy/dx)²) dx. Differentiate first, then square.",
        explain: `dy/dx = ${poly([[d, n - 1]])}, so (dy/dx)² = ${poly([[d * d, 2 * n - 2]])}: ${right}.`,
      },
      label(right, [I(`√(1 + ${c * c === 1 ? "" : c * c}x${sup(2 * n)})`), I(`√(1 + ${poly([[d, n - 1]])})`), I(`(1 + ${poly([[d * d, 2 * n - 2]])})`)]),
    );
  }
  if (kind === 2) {
    const m = rand(2, 5);
    const b = m * m - 1;
    const right = fr(2 * (m ** 3 - 1), 3);
    return mk(
      {
        key: `al-32-${m}`,
        prompt: `Arc length of y = (2/3)x^(3/2) from x = 0 to x = ${b}?`,
        hint: "y′ = √x, so 1 + (y′)² = 1 + x. Integrate √(1 + x).",
        explain: `${integ(0, b, "√(1 + x)")} = (2/3)[(1 + x)^(3/2)] = (2/3)(${m ** 3} − 1) = ${right}.`,
      },
      label(right, [fr(2 * m ** 3, 3), String(m ** 3 - 1), fr(2 * (m * m - 1), 3)]),
    );
  }
  const r = rand(1, 6);
  const half = Math.random() < 0.5;
  const right = half ? piFr(r) : piFr(r, 2);
  return mk(
    {
      key: `al-c-${r}-${half}`,
      prompt: `Arc length of y = √(${r * r} − x²) from x = ${half ? -r : 0} to x = ${r}?`,
      hint: "Recognize the curve before integrating: it's part of a circle.",
      explain: `That's ${half ? "half" : "a quarter"} of a circle of radius ${r}: ${half ? "½" : "¼"}·2π(${r}) = ${right}.`,
    },
    label(right, [piFr(r * r, half ? 2 : 4), piFr(2 * r), half ? piFr(r, 2) : piFr(r)]),
  );
}

/** CALC.8.1, CALC.8.2 — integrals in real-life stories. */
export function integralStories(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(1, 6);
    const b = rand(1, 4) * 2;
    const T = rand(1, 6);
    const v = a * T + (b * T * T) / 2;
    return mk(
      {
        key: `st-rain-${a}-${b}-${T}`,
        prompt: `Rain falls at r(t) = ${poly([[b, 1], [a, 0]], "t")} mm per hour. How much falls in the first ${T} hours?`,
        hint: "Total = ∫ rate dt.",
        explain: `${integ(0, T, `(${poly([[b, 1], [a, 0]], "t")})`, "dt")} = ${a * T} + ${(b * T * T) / 2} = ${v} mm.`,
        unit: "mm",
      },
      kpos(v),
    );
  }
  if (kind === 1) {
    const V0 = rand(10, 40) * 10;
    const c = rand(1, 4) * 2;
    const T = rand(2, 8);
    const v = V0 - (c * T * T) / 2;
    return mk(
      {
        key: `st-leak-${V0}-${c}-${T}`,
        prompt: `A tank holds ${V0} L and leaks at ${c}t L/min. How much is left after ${T} minutes?`,
        hint: "Amount left = start − ∫ leak rate.",
        explain: `${V0} − ${integ(0, T, `${c}t`, "dt")} = ${V0} − ${(c * T * T) / 2} = ${v} L.`,
        unit: "L",
      },
      kp(v),
    );
  }
  const k = rand(1, 4);
  const h = rand(1, 6) * 2;
  const base = rand(5, 15) * 10;
  return mk(
    {
      key: `st-avg-${k}-${h}-${base}`,
      prompt: `Visitors arrive at ${base} + ${k * 2}t people per hour. Average arrival rate over the first ${h} hours?`,
      hint: "Average rate = (total arrivals)/(time).",
      explain: `(1/${h})${integ(0, h, `(${base} + ${2 * k}t)`, "dt")} = ${base} + ${k * h} = ${base + k * h} people per hour.`,
      unit: "per hour",
    },
    kpos(base + k * h),
  );
}

/** CALC.8.1, CALC.8.3, CALC.8.4, CALC.8.5 — sort integrals by what they measure. */
export function formulaSort(): Question {
  return sortTask(
    {
      key: "fs",
      prompt: "Sort: what does each integral calculate?",
      hint: "π and a square: volume. (1/(b − a)) in front: average value. √(1 + (y′)²): arc length. Top − bottom: area.",
      explain: "Each formula has a fingerprint: area ∫(f − g), volume π∫R², average (1/(b − a))∫f, arc length ∫√(1 + (f′)²).",
    },
    ["area", "volume", "average value", "arc length"],
    [
      ["∫₀² (2x − x²) dx", "∫₋₁¹ (1 − x²) dx", "∫₀¹ (√x − x) dx", "∫₀³ (9 − x²) dx"],
      ["π∫₀² x⁴ dx", "π∫₀⁴ x dx", "π∫₀¹ (1 − x⁴) dx", "π∫₁³ (ln x)² dx"],
      ["(1/3)∫₀³ x² dx", "(1/π)∫₀^π sin x dx", "(1/4)∫₁⁵ √x dx", "(1/2)∫₀² eˣ dx"],
      ["∫₀¹ √(1 + 4x²) dx", "∫₀² √(1 + 9x⁴) dx", "∫₁² √(1 + 1/x⁴) dx", "∫₀^π √(1 + cos²x) dx"],
    ],
    1,
    2,
  );
}

/* ================================================= 10. Parametric, polar, vector */

const vec = (a: string | number, b: string | number) => `⟨${typeof a === "number" ? fmt(a) : a}, ${typeof b === "number" ? fmt(b) : b}⟩`;

/** CALC.9.1 — derivatives of parametric curves (BC). */
export function parametricSlope(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    let a = 1;
    let b = 0;
    let c = 1;
    let d = 0;
    let t = 1;
    let dx = 0;
    let dy = 0;
    while (dx === 0 || dy === 0) {
      a = rand(1, 2);
      b = rand(-3, 3);
      c = pick([1, -1]);
      d = rand(-4, 4);
      t = rand(1, 3);
      dx = 2 * a * t + b;
      dy = 3 * c * t * t + d;
    }
    return mk(
      {
        key: `ps-${a}-${b}-${c}-${d}-${t}`,
        prompt: `x = ${poly([[a, 2], [b, 1]], "t")}, y = ${poly([[c, 3], [d, 1]], "t")}. Find dy/dx at t = ${t}.`,
        hint: "dy/dx = (dy/dt)/(dx/dt). Differentiate each with respect to t.",
        explain: `dy/dt = ${fmt(dy)} and dx/dt = ${fmt(dx)} at t = ${t}, so dy/dx = ${fr(dy, dx)}.`,
      },
      label(fr(dy, dx), [fr(dx, dy), fmt(dy), fr(-dy, dx)], [fmt(dx)]),
    );
  }
  if (kind === 1) {
    const k = nz(-4, 4);
    const horiz = Math.random() < 0.5;
    const quad = poly([[1, 2], [-2 * k, 1]], "t");
    return mk(
      {
        key: `ps-tan-${k}-${horiz}`,
        prompt: horiz ? `x = t³ + t, y = ${quad}. At what t is the tangent horizontal?` : `x = ${quad}, y = t³ + t. At what t is the tangent vertical?`,
        eq: ["t", "=", "?"],
        hint: horiz ? "Horizontal: dy/dt = 0 (with dx/dt ≠ 0)." : "Vertical: dx/dt = 0 (with dy/dt ≠ 0).",
        explain: `${horiz ? "dy/dt" : "dx/dt"} = 2t − ${2 * k} = 0 at t = ${fmt(k)}; the other derivative, 3t² + 1, isn't 0.`.replace("− -", "+ "),
      },
      kp(k),
    );
  }
  const a = rand(1, 3);
  const b = nz(-3, 3);
  const t = rand(1, 3);
  const right = fr(3 * b, 4 * a * a * t);
  return mk(
    {
      key: `ps-2-${a}-${b}-${t}`,
      prompt: `x = ${poly([[a, 2]], "t")}, y = ${poly([[b, 3]], "t")}. Find d²y/dx² at t = ${t}.`,
      hint: "d²y/dx² = [d/dt (dy/dx)] ÷ (dx/dt). Don't forget to divide by dx/dt again.",
      explain: `dy/dx = ${coef(3 * b, 2 * a)}t. Its t-derivative is ${fr(3 * b, 2 * a)}; divide by dx/dt = ${2 * a * t}: ${right}.`,
    },
    label(right, [fr(3 * b, 2 * a), fr(3 * b * t, 2 * a), fr(3 * b, 4 * a * t)], [fr(-3 * b, 4 * a * a * t)]),
  );
}

/** CALC.9.1, CALC.9.2 — speed and distance along parametric paths (BC). */
export function paramSpeed(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const [P, Q, R] = pick([[4, 3, 5], [6, 8, 10], [8, 6, 10], [8, 15, 17], [12, 5, 13], [2, 0, 2], [10, 24, 26]]);
    const t = P / 2;
    const c = rand(-5, 5);
    const s = pick([1, -1]);
    return mk(
      {
        key: `sp-${P}-${Q}-${c}-${s}`,
        prompt: `x = t², y = ${lin(s * Q, c, "t")}. Find the speed at t = ${t}.`,
        hint: "Speed = √((dx/dt)² + (dy/dt)²).",
        explain: `dx/dt = ${P}, dy/dt = ${fmt(s * Q)}: √(${P * P} + ${Q * Q}) = ${R}.`,
      },
      kpos(R),
    );
  }
  if (kind === 1) {
    const [P, Q, R] = pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [5, 12, 13], [12, 5, 13]]);
    const T = rand(1, 5);
    const a = rand(-3, 3);
    const b = rand(-3, 3);
    return mk(
      {
        key: `sp-l-${P}-${Q}-${T}-${a}-${b}`,
        prompt: `x = ${lin(P, a, "t")}, y = ${lin(Q, b, "t")}. Distance traveled from t = 0 to t = ${T}?`,
        hint: "Distance = ∫ speed dt. Here the speed is constant.",
        explain: `Speed = √(${P * P} + ${Q * Q}) = ${R}, so distance = ${R}·${T} = ${R * T}.`,
      },
      kpos(R * T),
    );
  }
  const r = rand(1, 6);
  const [n, d, name] = pick([[1, 2, "π/2"], [1, 1, "π"], [2, 1, "2π"], [1, 3, "π/3"], [3, 2, "3π/2"]] as [number, number, string][]);
  const right = piFr(r * n, d);
  return mk(
    {
      key: `sp-c-${r}-${name}`,
      prompt: `x = ${r} cos t, y = ${r} sin t. Distance traveled from t = 0 to t = ${name}?`.replace(/= 1 /g, "= "),
      hint: `Speed = √((−${r} sin t)² + (${r} cos t)²) = ${r}, constant.`,
      explain: `Distance = ${r} × ${name} = ${right}.`,
    },
    label(right, [piFr(r * r * n, d), piFr(n, d), piFr(2 * r * n, d)], [String(r)]),
  );
}

/** CALC.9.2 — vector-valued functions and motion (BC). */
export function vectorMotion(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0 || kind === 1) {
    const a = rand(-4, 4);
    const b = rand(-5, 5);
    const t = rand(-2, 3);
    const pos = vec(t * t + a * t, t ** 3 - b * t);
    const vel = vec(2 * t + a, 3 * t * t - b);
    const acc = vec(2, 6 * t);
    const right = kind === 0 ? vel : acc;
    return mk(
      {
        key: `vm-${kind}-${a}-${b}-${t}`,
        prompt: `r(t) = ${vec(poly([[1, 2], [a, 1]], "t"), poly([[1, 3], [-b, 1]], "t"))}. Find the ${kind === 0 ? "velocity" : "acceleration"} at t = ${t}.`,
        hint: kind === 0 ? "Velocity: differentiate each component." : "Acceleration: differentiate each component twice.",
        explain: `v(t) = ${vec(poly([[2, 1], [a, 0]], "t"), poly([[3, 2], [-b, 0]], "t"))}, a(t) = ⟨2, 6t⟩. At t = ${t}: ${right}.`,
      },
      label(right, [pos, kind === 0 ? acc : vel, kind === 0 ? vec(3 * t * t - b, 2 * t + a) : vec(6 * t, 2)], [vec(2 * t, 3 * t * t)]),
    );
  }
  if (kind === 2) {
    const [P, Q, R] = pick(TRIPLES.filter((x) => x[2] > 0));
    const sP = P * pick([1, -1]);
    const sQ = Q * pick([1, -1]);
    const t = rand(1, 3);
    const m = nz(-3, 3);
    const p = nz(-3, 3);
    return mk(
      {
        key: `vm-sp-${sP}-${sQ}-${t}-${m}-${p}`,
        prompt: `v(t) = ${vec(lin(m, sP - m * t, "t"), lin(p, sQ - p * t, "t"))}. Speed at t = ${t}?`,
        hint: "Speed is the length of the velocity vector: √(vx² + vy²).",
        explain: `v(${t}) = ${vec(sP, sQ)}, so speed = √(${P * P} + ${Q * Q}) = ${R}.`,
      },
      kpos(R),
    );
  }
  const x0 = rand(-5, 5);
  const y0 = rand(-5, 5);
  const T = rand(1, 3);
  const right = vec(x0 + T * T, y0 + T ** 3);
  return mk(
    {
      key: `vm-pos-${x0}-${y0}-${T}`,
      prompt: `v(t) = ⟨2t, 3t²⟩ and r(0) = ${vec(x0, y0)}. Find r(${T}).`,
      hint: "Position = starting position + ∫ velocity, one component at a time.",
      explain: `r(${T}) = ${vec(x0, y0)} + ⟨${T}², ${T}³⟩ = ${right}.`,
    },
    label(right, [vec(T * T, T ** 3), vec(x0 + 2 * T, y0 + 3 * T * T), vec(x0 + T * T, y0 + 3 * T ** 3)]),
  );
}

/** CALC.9.3 — plot polar points on a Cartesian grid (BC). */
export function polarPoints(): Question {
  const one = () => {
    if (Math.random() < 0.5) {
      const r = nz(-5, 5);
      const [th, cx, cy] = pick([["0", 1, 0], ["π/2", 0, 1], ["π", -1, 0], ["3π/2", 0, -1]] as [string, number, number][]);
      return { r: fmt(r), th, x: r * cx, y: r * cy };
    }
    const k = nz(-4, 4);
    const [th, cx, cy] = pick([["π/4", 1, 1], ["3π/4", -1, 1], ["5π/4", -1, -1], ["7π/4", 1, -1]] as [string, number, number][]);
    return { r: `${k < 0 ? "−" : ""}${Math.abs(k) === 1 ? "" : Math.abs(k)}√2`, th, x: k * cx, y: k * cy };
  };
  const P = one();
  let Q = one();
  while (Q.x === P.x && Q.y === P.y) Q = one();
  const two = Math.random() < 0.5;
  const pts = two ? [P, Q] : [P];
  return doIt(
    {
      key: `pp-${pts.map((p) => `${p.r}@${p.th}`).join("|")}`,
      prompt: `Plot the polar point${two ? "s" : ""} ${pts.map((p, i) => `${["P", "Q"][i]}(${p.r}, ${p.th})`).join(" and ")}.`,
      hint: "x = r cos θ, y = r sin θ. A negative r points the opposite way.",
      explain: pts.map((p, i) => `${["P", "Q"][i]}: (${fmt(p.x)}, ${fmt(p.y)})`).join("; ") + ".",
    },
    { kind: "plotPoints", points: pts.map((p, i) => ({ x: p.x, y: p.y, label: ["P", "Q"][i] })), size: 6, quadrants: 4 },
    P.y,
  );
}

/** k·√r text with k an integer: "2√3", "−√3", "4". */
const kr = (k: number, r: string) => (r ? `${k === 1 ? "" : k === -1 ? "−" : fmt(k)}${r}` : fmt(k));

const POLAR_ANG: [string, number, string, number, string][] = [
  ["π/6", 1, "√3", 1, ""],
  ["π/3", 1, "", 1, "√3"],
  ["2π/3", -1, "", 1, "√3"],
  ["5π/6", -1, "√3", 1, ""],
  ["7π/6", -1, "√3", -1, ""],
  ["4π/3", -1, "", -1, "√3"],
  ["5π/3", 1, "", -1, "√3"],
  ["11π/6", 1, "√3", -1, ""],
  ["π/4", 1, "√2", 1, "√2"],
  ["3π/4", -1, "√2", 1, "√2"],
];

const COT: Record<string, string> = { "π/6": "−√3", "π/4": "−1", "π/3": "−√3/3", "2π/3": "√3/3", "3π/4": "1", "5π/6": "√3" };

/** CALC.9.3 — polar coordinates and slopes of polar curves (BC). */
export function polarCurves(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const r = pick([2, 4, 6]);
    const [th, sx, x, sy, y] = pick(POLAR_ANG);
    const h = r / 2;
    const P = (a: number, ra: string, b: number, rb: string) => `(${kr(a, ra)}, ${kr(b, rb)})`;
    const right = P(sx * h, x, sy * h, y);
    return mk(
      {
        key: `pc-c-${r}-${th}`,
        prompt: `Convert the polar point (${r}, ${th}) to (x, y).`,
        hint: "x = r cos θ and y = r sin θ. Use the unit circle.",
        explain: `x = ${r} cos(${th}), y = ${r} sin(${th}): ${right}.`,
      },
      label(right, [P(sy * h, y, sx * h, x), P(-sx * h, x, sy * h, y), P(sx * h, x, -sy * h, y)], [P(sx * r, x, sy * r, y)]),
    );
  }
  if (kind === 1) {
    const k = rand(1, 6);
    const th = pick(Object.keys(COT));
    const right = COT[th];
    return mk(
      {
        key: `pc-s-${k}-${th}`,
        prompt: `Slope dy/dx of the polar curve r = ${k} at θ = ${th}?`,
        hint: "dy/dx = (r′ sin θ + r cos θ)/(r′ cos θ − r sin θ). Here r′ = 0.",
        explain: `With r′ = 0: dy/dx = −cos θ/sin θ = −cot(${th}) = ${right}.`,
      },
      label(right, [...new Set(Object.values(COT))].filter((v) => v !== right).slice(0, 2).concat([right.startsWith("−") ? right.slice(1) : `−${right}`])),
    );
  }
  if (kind === 2) {
    const T = pick([
      { th: "π/2", v: "−2/π" },
      { th: "π", v: "π" },
      { th: "3π/2", v: "−2/(3π)" },
      { th: "2π", v: "2π" },
    ]);
    const k = rand(1, 3);
    return mk(
      {
        key: `pc-th-${T.th}-${k}`,
        prompt: `Slope dy/dx of the spiral r = θ at θ = ${T.th}?`,
        hint: "Use dy/dx = (r′ sin θ + r cos θ)/(r′ cos θ − r sin θ) with r = θ, r′ = 1.",
        explain: `Plugging in θ = ${T.th} gives ${T.v}.`,
      },
      label(T.v, ["−2/π", "π", "−2/(3π)", "2π", "−π", "1"].filter((v) => v !== T.v).slice(0, 3)),
    );
  }
  const a = rand(3, 6);
  const b = nz(-2, 2);
  const [th, c] = pick([["0", 1], ["π/6", 1], ["π/3", 1], ["2π/3", -1], ["5π/6", -1], ["π", -1], ["7π/6", -1], ["4π/3", -1], ["5π/3", 1], ["11π/6", 1]] as [string, number][]);
  const away = b * c > 0;
  return mk(
    {
      key: `pc-dr-${a}-${b}-${th}`,
      prompt: `r = ${a} ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}sin θ. At θ = ${th}, is the curve moving toward or away from the origin?`,
      hint: "r > 0 here, so check the sign of dr/dθ: positive means r is growing.",
      explain: `dr/dθ = ${Math.abs(b) === 1 ? (b < 0 ? "−" : "") : fmt(b)}cos θ is ${away ? "positive" : "negative"} at θ = ${th}, so r is ${away ? "growing: moving away" : "shrinking: moving toward the origin"}.`,
    },
    label(away ? "away from the origin" : "toward the origin", [away ? "toward the origin" : "away from the origin", "neither: r isn't changing"]),
  );
}

/** CALC.9.3 — areas in polar coordinates (BC). */
export function polarArea(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const a = rand(2, 6);
    const b = rand(1, a - 1);
    const t = pick(["cos", "sin"]);
    const r = `(${a} + ${b === 1 ? "" : b}${t} θ)`;
    const I = (lead: string, inner: string, hi = "2π") => `${lead}${integ(0, hi, inner, "dθ")}`;
    return mk(
      {
        key: `pa-set-${a}-${b}-${t}`,
        prompt: `Which integral gives the area inside r = ${r.slice(1, -1)}?`,
        hint: "Polar area = ½∫ r² dθ over one full trip around the curve.",
        explain: `One trip is θ from 0 to 2π, so A = ${I("½", `${r}²`)}.`,
      },
      label(I("½", `${r}²`), [I("", `${r}²`), I("½", r), I("½", `${r}²`, "π")]),
    );
  }
  if (kind === 1) {
    const a = rand(1, 6);
    const shift = Math.random() < 0.6;
    const right = piFr(a * a);
    return mk(
      {
        key: `pa-circ-${a}-${shift}`,
        prompt: shift ? `Area inside r = ${2 * a} cos θ?` : `Area inside r = ${a}?`,
        hint: shift ? `r = ${2 * a} cos θ is a circle of diameter ${2 * a}, traced once for 0 ≤ θ ≤ π.` : "It's a circle centered at the origin.",
        explain: shift ? `A circle of radius ${a}: π(${a})² = ${right}.` : `π(${a})² = ${right}.`,
      },
      label(right, shift ? [piFr(4 * a * a), piFr(2 * a * a), piFr(a * a, 2)] : [piFr(2 * a), piFr(a * a, 2), piFr(2 * a * a)]),
    );
  }
  if (kind === 2) {
    const a = rand(1, 6);
    const right = piFr(3 * a * a, 2);
    return mk(
      {
        key: `pa-card-${a}`,
        prompt: `Area inside the cardioid r = ${a === 1 ? "" : a}(1 + cos θ)?`,
        hint: "½∫₀^(2π) a²(1 + 2cos θ + cos²θ) dθ. The cos θ term integrates to 0 and cos²θ to π.",
        explain: `½·${a * a}(2π + 0 + π) = ${right}.`,
      },
      label(right, [piFr(a * a), piFr(3 * a * a), piFr(a * a, 2)], [piFr(2 * a * a)]),
    );
  }
  const c = rand(1, 6);
  const [n, d, name] = pick([[1, 2, "π/2"], [1, 3, "π/3"], [1, 4, "π/4"], [1, 6, "π/6"], [1, 1, "π"], [2, 3, "2π/3"]] as [number, number, string][]);
  const right = piFr(c * c * n, 2 * d);
  return mk(
    {
      key: `pa-sec-${c}-${name}`,
      prompt: `Area swept by r = ${c} from θ = 0 to θ = ${name}?`,
      hint: "½∫ r² dθ with r constant: ½r²·(angle).",
      explain: `½·${c * c}·${name} = ${right}.`,
    },
    label(right, [piFr(c * c * n, d), piFr(c * n, d), piFr(c * c * n, 4 * d)]),
  );
}

/* =============================================================== 11. Series */

/** CALC.10.1 — limits of sequences. */
export function sequences(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const q = pick([1, 2, 3]);
    const m = nz(-5, 5);
    const lower = Math.random() < 0.25;
    const top = lower ? poly([[q * m, 1], [rand(-5, 5), 0]], "n") : poly([[q * m, 2], [rand(-6, 6), 1]], "n");
    const bot = poly([[q, 2], [nz(1, 9), 0]], "n");
    const v = lower ? 0 : m;
    return mk(
      {
        key: `sq-${top}-${bot}`,
        prompt: `aₙ = (${top})/(${bot}). What does aₙ approach?`,
        math: `${lim("∞", "", "n")} aₙ`,
        hint: "Divide top and bottom by the highest power of n.",
        explain: lower ? "The bottom's power is higher, so aₙ → 0." : `Leading terms: ${poly([[q * m, 2]], "n")}/${q === 1 ? "n²" : `(${q}n²)`} → ${fmt(m)}.`,
      },
      kp(v),
    );
  }
  if (kind === 1) {
    const k = rand(1, 5);
    const T = pick([
      { a: `${k}n/(n + 2)`, r: `converges to ${k}` },
      { a: `(−1)ⁿ`, r: "diverges" },
      { a: `(${k}/${k + 1})ⁿ`, r: "converges to 0" },
      { a: `(1 + ${k === 1 ? "1" : k}/n)ⁿ`, r: `converges to e${k === 1 ? "" : sup(k)}` },
      { a: `${k} sin(n)/n`, r: "converges to 0" },
      { a: `${k === 1 ? "" : `${k} `}ln n`, r: "diverges" },
      { a: `(−1)ⁿ·${k}/n`, r: "converges to 0" },
      { a: `(${k + 1}/${k})ⁿ`, r: "diverges" },
    ]);
    return mk(
      {
        key: `sq-c-${T.a}`,
        prompt: `Does aₙ = ${T.a} converge? If so, to what?`,
        hint: "Find lim aₙ as n → ∞. Oscillating or unbounded sequences diverge.",
        explain: `aₙ ${T.r}.`,
      },
      label(T.r, ["diverges", "converges to 0", `converges to ${k}`, "converges to 1", `converges to e${k === 1 ? "" : sup(k)}`].filter((v) => v !== T.r).slice(0, 3)),
    );
  }
  const N = rand(2, 12);
  return mk(
    {
      key: `sq-tel-${N}`,
      prompt: `Σ (1/n − 1/(n + 1)) telescopes. Find the partial sum S${sub(N)}.`,
      hint: "Write out the first few terms: most of them cancel.",
      explain: `S${sub(N)} = 1 − 1/${N + 1} = ${fr(N, N + 1)}. (As N → ∞, the sum → 1.)`,
    },
    label(fr(N, N + 1), [fr(1, N + 1), "1", fr(N - 1, N)], [fr(N + 1, N + 2)]),
  );
}

const RATIOS: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [-1, 2], [-1, 3], [1, 5]];

/** CALC.10.1 — geometric series. */
export function geometricSeries(kinds = [0, 1, 2, 3]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    let p = 1;
    let q = 2;
    let a = 4;
    let S = 0;
    do {
      [p, q] = pick(RATIOS);
      a = q * q * rand(1, 6);
      S = (a * q) / (q - p);
    } while (!Number.isInteger(S));
    const terms3 = [a, (a * p) / q, (a * p * p) / (q * q)];
    return mk(
      {
        key: `gs-${a}-${p}-${q}`,
        prompt: "Find the sum of the infinite geometric series.",
        math: `${terms3.map(ds).join(" + ").replace(/\+ −/g, "− ")} + …`,
        hint: "S = a/(1 − r) when |r| < 1. Find r by dividing a term by the one before.",
        explain: `a = ${a}, r = ${fr(p, q)}: ${a}/(1 − (${fr(p, q)})) = ${S}.`,
      },
      kp(S),
    );
  }
  if (kind === 1) {
    const a = rand(1, 9);
    const [p, q] = pick([...RATIOS, [3, 2], [5, 4], [-1, 1], [2, 1], [4, 3]] as [number, number][]);
    const conv = Math.abs(p) < q;
    const right = conv ? fr(a * q, q - p) : "diverges";
    return mk(
      {
        key: `gs-cd-${a}-${p}-${q}`,
        prompt: "Converges or diverges? If it converges, give the sum.",
        math: `Σ ${a}(${fr(p, q)})ⁿ, n = 0 to ∞`,
        hint: "A geometric series converges only when |r| < 1, to a/(1 − r).",
        explain: conv ? `|r| = ${fr(Math.abs(p), q)} < 1, so the sum is ${a}/(1 − ${p < 0 ? `(${fr(p, q)})` : fr(p, q)}) = ${right}.` : `|r| = ${fr(Math.abs(p), q)} ≥ 1, so it diverges.`,
      },
      label(right, [conv ? "diverges" : fr(a * q, Math.abs(q - p) || 1), fr(a * q, q + p), fr(a, q)], ["0", String(a)]),
    );
  }
  if (kind === 2) {
    const two = Math.random() < 0.5;
    const d = two ? rand(10, 98) : rand(1, 8);
    const dec = two ? `0.${String(d).padStart(2, "0").repeat(3)}…` : `0.${String(d).repeat(4)}…`;
    const den = two ? 99 : 9;
    return mk(
      {
        key: `gs-rep-${d}-${two}`,
        prompt: `Write ${dec} as a fraction (a geometric series).`,
        hint: two ? `It's ${d}/100 + ${d}/100² + …, with r = 1/100.` : `It's ${d}/10 + ${d}/100 + …, with r = 1/10.`,
        explain: `(${d}/${den + 1})/(1 − 1/${den + 1}) = ${d}/${den}${fr(d, den) === `${d}/${den}` ? "" : ` = ${fr(d, den)}`}.`,
      },
      label(fr(d, den), [fr(d, den + 1), fr(d, two ? 999 : 99), fr(d, two ? 990 : 90)]),
    );
  }
  const a = rand(1, 9);
  const r = pick([2, 3]);
  const n = rand(3, r === 2 ? 8 : 6);
  const S = (a * (r ** n - 1)) / (r - 1);
  return mk(
    {
      key: `gs-ps-${a}-${r}-${n}`,
      prompt: `Add the first ${n} terms: ${a} + ${a * r} + ${a * r * r} + …`,
      hint: "Sₙ = a(rⁿ − 1)/(r − 1).",
      explain: `${a}(${r}${sup(n)} − 1)/(${r} − 1) = ${S}.`,
    },
    kpos(S),
  );
}

const TESTS = {
  pc: "converges: p-series, p > 1",
  pd: "diverges: p-series, p ≤ 1",
  nd: "diverges: nth-term test",
  nc: "converges: nth-term test",
  ic: "converges: integral test",
  id: "diverges: integral test",
};

const NPOW = [
  { s: "n²", p: 2 },
  { s: "n³", p: 3 },
  { s: "√n", p: 0.5 },
  { s: "n", p: 1 },
  { s: "n√n", p: 1.5 },
  { s: "∛n", p: 1 / 3 },
  { s: "n⁴", p: 4 },
];

/** CALC.10.2 — the nth-term test, p-series and the integral test (BC). */
export function seriesTests(): Question {
  const k = rand(1, 9);
  const m = rand(1, 9);
  const type = pick(["p", "p", "n", "i"] as const);
  let s = "";
  let right = "";
  if (type === "p") {
    const P = pick(NPOW);
    s = `Σ ${k}/${P.s}`;
    right = P.p > 1 ? TESTS.pc : TESTS.pd;
  } else if (type === "n") {
    s = pick([`Σ ${k}n/(n + ${m})`, `Σ (${k}n² + 1)/(n² + ${m})`, `Σ (1 + ${k}/n)ⁿ`, `Σ cos(${k}/n)`]);
    right = TESTS.nd;
  } else {
    const T = pick([
      { s: `Σ n/(n² + ${m})`, r: TESTS.id },
      { s: `Σ ${k}/(n ln n), n ≥ 2`, r: TESTS.id },
      { s: `Σ ${k}n·e^(−n²)`, r: TESTS.ic },
      { s: `Σ ${k}/(n(ln n)²), n ≥ 2`, r: TESTS.ic },
    ]);
    s = T.s;
    right = T.r;
  }
  return mk(
    {
      key: `st-${s}`,
      prompt: "Which test settles it, and what does it say?",
      eq: [s],
      say: talk(`${s}. Which test settles it, and what does it say?`),
      hint: "First: do the terms go to 0? If not, it diverges. Then: is it a p-series? If the terms come from a nice f(x), try the integral test.",
      explain:
        right === TESTS.nd
          ? "The terms don't approach 0, so the series diverges by the nth-term test."
          : right === TESTS.pc || right === TESTS.pd
            ? `It's a p-series: it ${right.startsWith("c") ? "converges since p > 1" : "diverges since p ≤ 1"}.`
            : `The matching integral ${right.startsWith("c") ? "is finite" : "grows like a log, without bound"}, so the series ${right.split(":")[0]}.`,
    },
    label(right, Object.values(TESTS).filter((t) => t !== right)),
  );
}

/** CALC.10.2 — sort series into converges / diverges (BC). */
export function convergeSort(): Question {
  return sortTask(
    {
      key: "cs",
      prompt: "Sort each series: converges or diverges?",
      hint: "Terms not → 0: diverges. p-series need p > 1. Geometric needs |r| < 1. Factorials in the bottom win.",
      explain: "Quick checks: nth-term test, p-series, geometric ratio, then compare with a series you know.",
    },
    ["converges", "diverges"],
    [
      ["Σ 1/n²", "Σ 1/n³", "Σ (1/2)ⁿ", "Σ (2/3)ⁿ", "Σ 1/n!", "Σ (−1)ⁿ/n", "Σ 1/(n² + 1)", "Σ n/3ⁿ", "Σ 1/(n√n)", "Σ 5/4ⁿ"],
      ["Σ 1/n", "Σ 1/√n", "Σ (3/2)ⁿ", "Σ n/(n + 1)", "Σ (−1)ⁿ", "Σ 2ⁿ/n", "Σ 1/(2n + 1)", "Σ ln n", "Σ n!/2ⁿ", "Σ 1/∛n"],
    ],
    2,
    4,
  );
}

const COMP = {
  c1: "converges: compare with Σ 1/n²",
  c2: "converges: compare with Σ (1/2)ⁿ",
  d1: "diverges: compare with Σ 1/n",
  d2: "diverges: compare with Σ 1/√n",
};

/** CALC.10.2 — direct and limit comparison tests (BC). */
export function comparisonTest(): Question {
  const k = rand(1, 9);
  const m = rand(2, 5);
  const T = pick([
    { s: `Σ 1/(n² + ${k})`, r: "c1" },
    { s: `Σ ${k}/(n² + n)`, r: "c1" },
    { s: `Σ (${m} + sin n)/n²`, r: "c1" },
    { s: `Σ 1/(2ⁿ + ${k})`, r: "c2" },
    { s: `Σ ${k}/(2ⁿ + n)`, r: "c2" },
    { s: `Σ 1/(n + ${k})`, r: "d1" },
    { s: `Σ ${k}/(${m}n + 1)`, r: "d1" },
    { s: `Σ (n + ${k})/n²`, r: "d1" },
    { s: `Σ 1/(√n + ${k})`, r: "d2" },
    { s: `Σ ${k}/√(n + ${m})`, r: "d2" },
  ] as { s: string; r: keyof typeof COMP }[]);
  return mk(
    {
      key: `cmp-${T.s}`,
      prompt: "Pick the comparison that works.",
      eq: [T.s],
      say: talk(`${T.s}. Pick the comparison that works.`),
      hint: "For large n, which simple series does it behave like? Keep only the biggest terms on top and bottom.",
      explain: `For large n it behaves like the series in "${COMP[T.r]}" (the ratio of terms has a finite, nonzero limit), so it ${COMP[T.r].split(":")[0]}.`,
    },
    label(COMP[T.r], Object.values(COMP).filter((v) => v !== COMP[T.r])),
  );
}

const RATIO_OUT = { c: "converges", d: "diverges", x: "the ratio test can't decide" };

/** CALC.10.2 — the ratio test (BC). */
export function ratioTest(kinds = [0, 1]): Question {
  const kind = pick(kinds);
  const k = rand(2, 6);
  const [p, q] = pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5]]);
  const T = pick([
    { s: `Σ n/${k}ⁿ`, L: fr(1, k), o: "c" },
    { s: `Σ ${k}ⁿ/n!`, L: "0", o: "c" },
    { s: `Σ n!/${k}ⁿ`, L: "∞", o: "d" },
    { s: `Σ n²(${fr(p, q)})ⁿ`, L: fr(p, q), o: "c" },
    { s: `Σ ${k}ⁿ/n²`, L: String(k), o: "d" },
    { s: `Σ ${k}/n²`, L: "1", o: "x" },
    { s: `Σ ${k}/n`, L: "1", o: "x" },
  ] as { s: string; L: string; o: keyof typeof RATIO_OUT }[]);
  if (kind === 0) {
    return mk(
      {
        key: `rt-L-${T.s}`,
        prompt: "Find L = lim |aₙ₊₁/aₙ| for the ratio test.",
        eq: [T.s],
        say: talk(`${T.s}. Find L, the limit of the ratio of consecutive terms.`),
        hint: "Write aₙ₊₁/aₙ, cancel what you can (n!/(n+1)! = 1/(n+1)), then let n → ∞.",
        explain: `The ratio simplifies and approaches L = ${T.L}.`,
      },
      label(T.L, ["0", "1", "∞", fr(1, k), String(k), fr(p, q)].filter((v) => v !== T.L).slice(0, 3)),
    );
  }
  return mk(
    {
      key: `rt-o-${T.s}`,
      prompt: "What does the ratio test say?",
      eq: [T.s],
      say: talk(`${T.s}. What does the ratio test say?`),
      hint: "L < 1: converges. L > 1 (or ∞): diverges. L = 1: no conclusion.",
      explain: `L = ${T.L}, so the ratio test says: ${RATIO_OUT[T.o]}.`,
    },
    label(RATIO_OUT[T.o], Object.values(RATIO_OUT).filter((v) => v !== RATIO_OUT[T.o])),
  );
}

const ALT = { abs: "converges absolutely", cond: "converges conditionally", div: "diverges" };

/** CALC.10.2 — alternating series and their error bounds (BC). */
export function alternating(kinds = [0, 1]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const k = rand(1, 9);
    const m = rand(1, 9);
    const P = pick(NPOW);
    const T = pick([
      { s: `Σ (−1)ⁿ·${k}/${P.s}`, r: P.p > 1 ? "abs" : "cond" },
      { s: `Σ (−1)ⁿ·${k}/${P.s}`, r: P.p > 1 ? "abs" : "cond" },
      { s: `Σ (−1)ⁿ·n/(n + ${m})`, r: "div" },
      { s: `Σ (−1)ⁿ/(${k}n + ${m})`, r: "cond" },
      { s: `Σ (−1)ⁿ(${k}/${k + 1})ⁿ`, r: "abs" },
      { s: `Σ (−1)ⁿ/(n² + ${m})`, r: "abs" },
    ] as { s: string; r: keyof typeof ALT }[]);
    return mk(
      {
        key: `alt-${T.s}`,
        prompt: "Absolutely convergent, conditionally convergent, or divergent?",
        eq: [T.s],
        say: talk(`${T.s}. Absolutely convergent, conditionally convergent, or divergent?`),
        hint: "First test Σ|aₙ|. If that converges: absolute. If not, use the alternating series test (terms shrink to 0?).",
        explain:
          T.r === "abs"
            ? "Even without the signs it converges, so it converges absolutely."
            : T.r === "cond"
              ? "Without the signs it diverges, but the terms decrease to 0, so the alternating version converges: conditionally."
              : "The terms don't approach 0, so it diverges.",
      },
      label(ALT[T.r], Object.values(ALT).filter((v) => v !== ALT[T.r])),
    );
  }
  const p = rand(1, 3);
  const N = rand(2, 6);
  const t = (n: number) => (p === 1 ? `1/${n}` : `1/${n ** p}`);
  const series = `1 − ${t(2)} + ${t(3)} − ${t(4)} + …`;
  return mk(
    {
      key: `alt-err-${p}-${N}`,
      prompt: `Approximate ${series} with its first ${N} terms. The error is at most…`,
      hint: "For an alternating series with shrinking terms, the error is less than the first term you left out.",
      explain: `The first omitted term is term ${N + 1}: ${fr(1, (N + 1) ** p)}.`,
    },
    label(fr(1, (N + 1) ** p), [fr(1, N ** p), fr(1, (N + 2) ** p), fr(1, N + 1 === (N + 1) ** p ? N + 2 : N + 1)]),
  );
}

/** CALC.10.3 — Taylor polynomials and the Lagrange error bound (BC). */
export function taylorPolys(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  const a = rand(0, 3);
  const f0 = rand(-5, 9);
  const f1 = rand(-6, 6);
  const f2 = rand(-8, 8);
  const f3 = nz(-12, 12);
  const visual: Visual = { kind: "table", header: [`f(${a})`, `f′(${a})`, `f″(${a})`, `f‴(${a})`], rows: [[f0, f1, f2, f3]] };
  if (kind === 0) {
    const k = rand(2, 3);
    const fk = k === 2 ? f2 : f3;
    const d = k === 2 ? 2 : 6;
    return mk(
      {
        key: `tp-c-${a}-${f0}-${f1}-${f2}-${f3}-${k}`,
        prompt: `Coefficient of (x − ${a})${sup(k)} in the Taylor polynomial for f about x = ${a}?`.replace(`(x − 0)`, "x"),
        visual,
        needsVisual: true,
        hint: "The coefficient of (x − a)ᵏ is f⁽ᵏ⁾(a)/k!.",
        explain: `${fmt(fk)}/${k}! = ${fr(fk, d)}.`,
      },
      fracAns(fk, d, [fr(fk, k), fmt(fk), fr(fk, d * k)], [fr(-fk, d)]),
    );
  }
  if (kind === 1) {
    const h = pick([0.1, 0.2, 0.5, 1, -1]);
    const v = f0 + f1 * h + (f2 * h * h) / 2;
    return mk(
      {
        key: `tp-v-${a}-${f0}-${f1}-${f2}-${h}`,
        prompt: `Use the degree-2 Taylor polynomial about x = ${a} to estimate f(${ds(a + h)}).`,
        visual,
        needsVisual: true,
        hint: "P₂(x) = f(a) + f′(a)(x − a) + f″(a)(x − a)²/2.",
        explain: `${fmt(f0)} + (${fmt(f1)})(${ds(h)}) + (${fmt(f2)})(${ds(h)})²/2 = ${ds(v)}.`,
      },
      kp(v),
    );
  }
  const n = rand(1, 3);
  const k = rand(1, 9);
  const half = Math.random() < 0.5;
  const h = half ? 0.5 : 0.1;
  const M = fact(n + 1) * k;
  const v = clean(k * h ** (n + 1));
  return mk(
    {
      key: `tp-L-${n}-${k}-${half}`,
      prompt: `|f⁽${n + 1}⁾(x)| ≤ ${M} near x = 0. Bound the error of the degree-${n} Maclaurin polynomial at x = ${h}.`.replace(`⁽${n + 1}⁾`, sup(`(${n + 1})`)),
      hint: "Lagrange: |error| ≤ M·|x − a|ⁿ⁺¹/(n + 1)!.",
      explain: `${M}·(${h})${sup(n + 1)}/${n + 1}! = ${ds(v)}.`,
    },
    kpos(v),
  );
}

const BASES = [
  { n: "exp", num: (_k: number) => 1, den: (k: number) => fact(k), odd: null as null | boolean },
  { n: "sin", num: (k: number) => (((k - 1) / 2) % 2 === 0 ? 1 : -1), den: (k: number) => fact(k), odd: true },
  { n: "cos", num: (k: number) => ((k / 2) % 2 === 0 ? 1 : -1), den: (k: number) => fact(k), odd: false },
  { n: "geo", num: (_k: number) => 1, den: (_k: number) => 1, odd: null },
  { n: "ln", num: (k: number) => (k % 2 === 1 ? 1 : -1), den: (k: number) => k, odd: null },
  { n: "atan", num: (k: number) => (((k - 1) / 2) % 2 === 0 ? 1 : -1), den: (k: number) => k, odd: true },
];
const SUBST = [
  { s: 1, m: 1, u: "x" },
  { s: 2, m: 1, u: "2x" },
  { s: 1, m: 2, u: "x²" },
  { s: -1, m: 1, u: "−x" },
  { s: 3, m: 1, u: "3x" },
];

function fname(b: string, u: string): string {
  const plain = u === "x";
  if (b === "exp") return plain ? "eˣ" : `e^(${u})`;
  if (b === "sin" || b === "cos") return plain ? `${b} x` : `${b}(${u})`;
  if (b === "geo") return u.startsWith("−") ? `1/(1 + ${u.slice(1)})` : `1/(1 − ${u})`;
  if (b === "ln") return u.startsWith("−") ? `ln(1 − ${u.slice(1)})` : `ln(1 + ${u})`;
  return plain ? "arctan x" : `arctan(${u})`;
}

/** First four nonzero terms of base(s·xᵐ) as text. */
function seriesText(bi: number, s: number, m: number): string {
  const B = BASES[bi];
  const out: [number, number, number][] = [];
  for (let k = B.n === "ln" ? 1 : 0; out.length < 4; k++) {
    if (B.odd === true && k % 2 === 0) continue;
    if (B.odd === false && k % 2 === 1) continue;
    out.push([B.num(k) * s ** k, B.den(k), m * k]);
  }
  let str = "";
  for (const [n, d, p] of out) {
    const t = monoF(Math.abs(n), d, p) || "1";
    str += str ? (n < 0 ? ` − ${t}` : ` + ${t}`) : n < 0 ? `−${t}` : t;
  }
  return `${str} + …`;
}

/** CALC.10.3 — Maclaurin series of the standard functions (BC). */
export function maclaurin(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  if (kind === 0) {
    const S = pick(SUBST);
    const ok = BASES.map((_, i) => i).filter((i) => !(BASES[i].n === "cos" && S.s < 0));
    const bi = pick(ok);
    const right = fname(BASES[bi].n, S.u);
    return mk(
      {
        key: `mc-id-${bi}-${S.u}`,
        prompt: "Which function has this Maclaurin series?",
        eq: [seriesText(bi, S.s, S.m)],
        say: talk(`${seriesText(bi, S.s, S.m)}. Which function has this Maclaurin series?`),
        hint: "Recall eˣ, sin x, cos x, 1/(1 − x), ln(1 + x), arctan x, then look for what replaced x.",
        explain: `It's the series for ${fname(BASES[bi].n, "x")} with ${S.u} in place of x: ${right}.`,
      },
      label(right, shuffle(ok.filter((i) => i !== bi)).slice(0, 3).map((i) => fname(BASES[i].n, S.u))),
    );
  }
  if (kind === 1) {
    const s = rand(1, 3);
    const k = rand(2, 5);
    const bi = pick([0, 0, 1, 2]);
    const B = BASES[bi];
    const kk = B.odd === true && k % 2 === 0 ? k + 1 : B.odd === false && k % 2 === 1 ? k + 1 : k;
    const n = B.num(kk) * s ** kk;
    const d = fact(kk);
    const u = s === 1 ? "x" : `${s}x`;
    return mk(
      {
        key: `mc-co-${bi}-${s}-${kk}`,
        prompt: `Coefficient of x${sup(kk)} in the Maclaurin series of ${fname(B.n, u)}?`,
        hint: `Take the ${fname(B.n, "x")} series and replace x with ${u}: (${u})${sup(kk)} = ${s ** kk}x${sup(kk)}.`,
        explain: `${n < 0 ? "−" : ""}${s ** kk}/${kk}! = ${fr(n, d)}.`,
      },
      label(fr(n, d), [fr(n, kk), fr(B.num(kk) * s, d), fr(-n, d)], [fr(n, fact(kk - 1))]),
    );
  }
  const k = rand(1, 4);
  const kx = k === 1 ? "x" : `${k}x`;
  const T = pick([
    { m: `(e${sup(k)}ˣ − 1 − ${kx})/x²`.replace("e¹ˣ", "eˣ"), r: fr(k * k, 2), w: [fr(k, 2), String(k * k), "0"] },
    { m: `(sin(${kx}) − ${kx})/x³`, r: fr(-(k ** 3), 6), w: [fr(k ** 3, 6), fr(-k, 6), "0"] },
    { m: `(1 − cos(${kx}))/x²`, r: fr(k * k, 2), w: [fr(k, 2), String(k * k), "1"] },
  ]);
  return mk(
    {
      key: `mc-lim-${T.m}`,
      prompt: "Use a Maclaurin series to find the limit.",
      math: `${lim(0)} ${T.m}`,
      hint: "Replace the function with its series; the low-order terms cancel and the next term decides.",
      explain: `After the cancellations, the leading term gives ${T.r}.`,
    },
    label(T.r, T.w),
  );
}

/** CALC.10.4 — power series and the radius of convergence (BC). */
export function powerSeries(kinds = [0, 1, 2]): Question {
  const kind = pick(kinds);
  const a = rand(-4, 4);
  const k = rand(2, 6);
  const xa = a === 0 ? "x" : `(${lin(1, -a)})`;
  if (kind === 1) {
    return mk(
      {
        key: `pw-c-${a}-${k}`,
        prompt: `Where is Σ ${xa}ⁿ/${k}ⁿ centered?`,
        eq: ["x", "=", "?"],
        hint: "A power series in (x − a) is centered at x = a.",
        explain: `${xa} = (x − ${a < 0 ? `(${fmt(a)})` : a}), so the center is x = ${fmt(a)}.`,
      },
      kp(a),
    );
  }
  if (kind === 2) {
    const T = pick([
      { s: "Σ n xⁿ⁻¹", r: "1/(1 − x)²", w: ["1/(1 − x)", "−ln(1 − x)", "x/(1 − x)"] },
      { s: "Σ xⁿ⁺¹/(n + 1)", r: "−ln(1 − x)", w: ["1/(1 − x)²", "ln(1 − x)", "eˣ"] },
      { s: "Σ (−1)ⁿx²ⁿ", r: "1/(1 + x²)", w: ["1/(1 − x²)", "arctan x", "cos x"] },
      { s: `Σ xⁿ/${k}ⁿ`, r: `${k}/(${k} − x)`, w: [`1/(${k} − x)`, `1/(1 − ${k}x)`, `${k}/(1 − x)`] },
    ]);
    return mk(
      {
        key: `pw-tt-${T.s}`,
        prompt: `Start from Σ xⁿ = 1/(1 − x). Which function equals ${T.s}?`,
        hint: "Differentiate, integrate or substitute into the geometric series term by term.",
        explain: `${T.s} = ${T.r}.`,
      },
      label(T.r, T.w),
    );
  }
  const T = pick([
    { s: `Σ ${xa}ⁿ/${k}ⁿ`, r: `R = ${k}` },
    { s: `Σ n${xa}ⁿ/${k}ⁿ`, r: `R = ${k}` },
    { s: `Σ ${k}ⁿ${xa}ⁿ`, r: `R = 1/${k}` },
    { s: `Σ ${xa}ⁿ/n!`, r: "R = ∞" },
    { s: `Σ n!${xa}ⁿ`, r: "R = 0" },
  ]);
  return mk(
    {
      key: `pw-R-${T.s}`,
      prompt: "Find the radius of convergence.",
      eq: [T.s],
      say: talk(`${T.s}. Find the radius of convergence.`),
      hint: "Ratio test: lim |aₙ₊₁/aₙ|·|x − a| < 1. Solve for |x − a|.",
      explain: `The ratio test gives ${T.r}.`,
    },
    label(T.r, [`R = ${k}`, `R = 1/${k}`, "R = 0", "R = ∞", "R = 1"].filter((v) => v !== T.r).slice(0, 3)),
  );
}

/** CALC.10.4 — interval of convergence, endpoints included (BC). */
export function intervalOfConvergence(): Question {
  const a = rand(-4, 4);
  const k = rand(1, 5);
  const d = pick(["", "n", "n²"]);
  const alt = d === "n" && Math.random() < 0.4;
  const xa = a === 0 ? "x" : `(${lin(1, -a)})`;
  const L = fmt(a - k);
  const R = fmt(a + k);
  const iv = (l: string, r: string) => `${l}${L}, ${R}${r}`;
  const right = d === "" ? iv("(", ")") : d === "n²" ? iv("[", "]") : alt ? iv("(", "]") : iv("[", ")");
  const kn = k === 1 ? "" : `${k}ⁿ`;
  const den = [d, kn].filter(Boolean).join("·");
  const s = `Σ ${alt ? "(−1)ⁿ" : ""}${xa}ⁿ${den ? `/(${den})` : ""}`.replace("/(n)", "/n").replace("/(n²)", "/n²");
  return mk(
    {
      key: `ioc-${a}-${k}-${d}-${alt}`,
      prompt: "Interval of convergence (check the endpoints)?",
      eq: [s],
      say: talk(`${s}. Find the interval of convergence, checking the endpoints.`),
      hint: `The radius is ${k}, centered at ${fmt(a)}. Plug each endpoint in: you get a geometric, harmonic, alternating harmonic, or p = 2 series.`,
      explain:
        d === ""
          ? "Both endpoints give terms ±1 that don't go to 0: both excluded."
          : d === "n²"
            ? "Both endpoints give p-series with p = 2 (or its alternating version): both included."
            : alt
              ? `At x = ${R}: alternating harmonic, converges. At x = ${L}: harmonic, diverges.`
              : `At x = ${L}: alternating harmonic, converges. At x = ${R}: harmonic, diverges.`,
    },
    label(right, [iv("(", ")"), iv("[", "]"), iv("[", ")"), iv("(", "]")].filter((v) => v !== right)),
  );
}
