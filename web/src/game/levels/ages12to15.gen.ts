/**
 * Question generators for ages 12–15: every Common Core Grade 8 standard and the
 * Algebra 1 high-school standards (number system, quantities, algebra, functions,
 * linear and exponential models, data). Worlds and levels live in ./ages12to15.ts.
 *
 * Decimal answers are built from whole numbers and cleaned, so floating point never
 * shows on screen. Graphs use the `plot` visual; a curve's `fn` returns NaN where the
 * function is undefined (outside a square root's domain, at an asymptote).
 */
import { fmt, labelChoices, pick, rand, shuffle } from "../questions";
import type { Mark, Question, Token, Visual } from "../types";

/* =================================================================== helpers */

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra">;
type Plot = Extract<Visual, { kind: "plot" }>;

const NONE: Visual = { kind: "none" };

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Remove floating-point noise. */
export const clean = (x: number) => Math.round(x * 1e6) / 1e6;

/** A number as text with a real minus sign. */
export const ds = (x: number) => fmt(clean(x));

/** A random whole number in [lo, hi] that is not 0 and not in `not`. */
export function nz(lo: number, hi: number, ...not: number[]): number {
  let v = rand(lo, hi);
  while (v === 0 || not.includes(v)) v = rand(lo, hi);
  return v;
}

/** `count` different whole numbers from lo..hi. */
function distinct(count: number, lo: number, hi: number, ...not: number[]): number[] {
  const out = new Set<number>();
  while (out.size < count) {
    const v = rand(lo, hi);
    if (!not.includes(v)) out.add(v);
  }
  return [...out];
}

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** Number choices: the answer, the likely mistakes, then neighbours `step` apart. */
function numChoices(answer: number, wrong: number[], step = 1, min = -Infinity): number[] {
  const out: number[] = [answer];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < 4 && Number.isFinite(v) && v >= min && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < 4 && k < 80; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return shuffle(out);
}

/** Pick from four numbers, with the likely mistakes among them. */
function choose(answer: number, wrong: number[], step = 1, min = -Infinity): Answer {
  const a = clean(answer);
  return { answer: a, input: "choices", choices: numChoices(a, wrong, step, min) };
}

/** Type the answer: negatives get "−", decimals get "."; negative decimals become choices. */
function keypad(answer: number): Answer {
  const a = clean(answer);
  if (a < 0 && !Number.isInteger(a)) return choose(a, [-a, a + 1, a - 1], 0.5);
  if (a < 0) return { answer: a, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(a)) return { answer: a, input: "keypad", keypadExtra: "." };
  return { answer: a, input: "keypad" };
}

/** A whole-number answer typed on a keypad that always has "−", so the sign isn't given away. */
function signed(answer: number): Answer {
  const a = clean(answer);
  if (!Number.isInteger(a)) return keypad(a);
  return { answer: a, input: "keypad", keypadExtra: "−" };
}

/** Text choices. The wrong ones are shuffled; the first three different ones are used. */
function label(correct: string, wrong: string[]): Answer {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong));
  return { answer, input: "choices", choices, labels };
}

/** Text choices kept in the given order (e.g. points A, B, C, D). */
function fixedLabels(labels: string[], correct: number): Answer {
  return { answer: correct, input: "choices", choices: labels.map((_, i) => i), labels };
}

/** A number as text, in brackets when negative: 4 × (−2). */
const pa = (n: number) => (n < 0 ? `(${ds(n)})` : ds(n));

/** Yes / no choice. */
const yesNo = (yes: boolean, y = "yes", n = "no"): Answer => {
  const labels = [y, n];
  return { answer: yes ? 0 : 1, input: "choices", choices: [0, 1], labels };
};

const SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Superscript digits: sup(3) = "³", sup(−2) = "⁻²". */
export const sup = (e: number) => (e < 0 ? "⁻" : "") + [...String(Math.abs(e))].map((c) => SUPD[+c]).join("");

const SUBD = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => [...String(n)].map((c) => SUBD[+c]).join("");

/** Simplest-form fraction as text (improper, no mixed numbers): "3/4", "−7/2", "5". */
export function fracStr(n: number, d: number): string {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  if (b === 1) return fmt(a);
  return `${a < 0 ? "−" : ""}${Math.abs(a)}/${b}`;
}

/** Polynomial as text from coefficients, highest power first: [1, −5, 6] → "x² − 5x + 6". */
export function poly(cs: number[], v = "x"): string {
  const deg = cs.length - 1;
  let out = "";
  cs.forEach((c, i) => {
    const p = deg - i;
    if (clean(c) === 0) return;
    const a = Math.abs(clean(c));
    const body = p === 0 ? ds(a) : `${a === 1 ? "" : ds(a)}${v}${p === 1 ? "" : sup(p)}`;
    out += out ? ` ${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`;
  });
  return out || "0";
}

/** Linear expression as text: "2x + 3", "−x − 4", "6". */
export const lin = (a: number, b: number, v = "x") => poly([a, b], v);

/** Linear expression with a fraction slope p/q: "(2/3)x − 1". */
function linFrac(p: number, q: number, b: number): string {
  const g = gcd(p, q) * (q < 0 ? -1 : 1);
  const [P, Q] = [p / g, q / g];
  if (Q === 1) return lin(P, b);
  const m = `${P < 0 ? "−" : ""}(${Math.abs(P)}/${Q})x`;
  return b === 0 ? m : `${m} ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
}

/** "ax + by" as text: "2x − 3y", "x + y". */
const twoVar = (a: number, b: number) => `${poly([a, 0]).replace(/ .*/, "")} ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y`;

/** The factor (x − r) as text: r = 3 → "(x − 3)", r = −2 → "(x + 2)", r = 0 → "x". */
const fx = (r: number) => (r === 0 ? "x" : `(x ${r > 0 ? "−" : "+"} ${Math.abs(r)})`);

/** Ordered pair as text. */
export const pt = (x: number, y: number) => `(${ds(x)}, ${ds(y)})`;

/** Equation tokens for ax + b. */
function linToks(a: number, b: number): Token[] {
  if (b === 0) return [{ x: a }];
  return [{ x: a }, b < 0 ? "−" : "+", Math.abs(b)];
}

const ordinal = (n: number) => {
  const v = n % 100;
  const s = v >= 11 && v <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${s}`;
};

function sayPower(raw: string): string {
  const neg = raw.startsWith("⁻");
  const n = Number([...raw.replace("⁻", "")].map((c) => SUPD.indexOf(c)).join(""));
  if (!neg && n === 2) return " squared ";
  if (!neg && n === 3) return " cubed ";
  return neg ? ` to the negative ${n} ` : ` to the ${ordinal(n)} `;
}

const subWords = (s: string) => [...s].map((c) => (SUBD.includes(c) ? SUBD.indexOf(c) : c)).join("");

/** Turn on-screen math into words Can can say out loud. */
export function talk(s: string): string {
  return s
    .replace(/log([₀-₉]+)\s?/g, (_, b) => `log base ${subWords(b)} of `)
    .replace(/\bln\s?/g, "natural log of ")
    .replace(/\blog\s/g, "log of ")
    .replace(/([fgA])⁻¹/g, "$1 inverse")
    .replace(/ⁿ⁻¹/g, " to the n minus 1 ")
    .replace(/([a-z])ₙ₋₁/g, "$1 sub n minus 1")
    .replace(/([a-z])ₙ/g, "$1 sub n")
    .replace(/([a-z])([₀-₉]+)/g, (_, v, d) => `${v} sub ${subWords(d)}`)
    .replace(/\)\(/g, ") times (")
    .replace(/\b([fghpqCRPVAhdTSW])\(/g, "$1 of (")
    .replace(/(\d)\(/g, "$1 times the quantity (")
    .replace(/\^\((−?)(\d+)\/(\d+)\)/g, (_, neg, a, b) => ` to the ${neg ? "negative " : ""}${a} over ${b} power `)
    .replace(/\^\(([^)]+)\)/g, " to the $1 ")
    .replace(/ˣ/g, " to the x ")
    .replace(/ᵗ/g, " to the t ")
    .replace(/ⁿ/g, " to the n ")
    .replace(/⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, sayPower)
    .replace(/(\d)√/g, "$1 root ")
    .replace(/√/g, "the square root of ")
    .replace(/∛/g, "the cube root of ")
    .replace(/\|([^|]+)\|/g, "the absolute value of $1")
    .replace(/±/g, " plus or minus ")
    .replace(/∞/g, " infinity ")
    .replace(/π/g, " pi ")
    .replace(/≠/g, " is not equal to ")
    .replace(/≤/g, " is less than or equal to ")
    .replace(/≥/g, " is greater than or equal to ")
    .replace(/ < /g, " is less than ")
    .replace(/ > /g, " is greater than ")
    .replace(/≈/g, " is about ")
    .replace(/→/g, " becomes ")
    .replace(/ \+ /g, " plus ")
    .replace(/ − /g, " minus ")
    .replace(/−/g, "negative ")
    .replace(/[×·]/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/ = \?/g, " equals what")
    .replace(/=/g, " equals ")
    .replace(/(\d\.\d+)…/g, "$1 repeating")
    .replace(/…/g, " and so on")
    .replace(/(\S)\/(\S)/g, "$1 over $2")
    .replace(/%/g, " percent")
    .replace(/°/g, " degrees")
    .replace(/[(){}[\]]/g, " ")
    .replace(/\s+([,.?!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** A plot visual on a square-ish window. */
function graph(x: [number, number], y: [number, number], parts: Partial<Omit<Plot, "kind" | "x" | "y">>): Visual {
  return { kind: "plot", x, y, ...parts };
}

/** A straight line y = mx + b as a plot curve. */
const lineFn = (m: number, b: number) => (x: number) => m * x + b;

/* ============================================================ 1. Exponents & roots */

/** 8.EE.A.1 — product, quotient and power-of-a-power rules. */
export function exponentRules(): Question {
  const kind = rand(0, 4);
  const a = pick([2, 3, 5, 7, 10]);
  const m = rand(2, 8);
  const n = rand(2, 6);
  if (kind <= 2) {
    const big = m + n;
    const text = kind === 0 ? `${a}${sup(m)} × ${a}${sup(n)}` : kind === 1 ? `${a}${sup(big)} ÷ ${a}${sup(n)}` : `(${a}${sup(m)})${sup(n)}`;
    const ans = kind === 0 ? m + n : kind === 1 ? m : m * n;
    const wrong = kind === 0 ? [m * n, m + n + 1, Math.abs(m - n)] : kind === 1 ? [big + n, big * n, m + 1] : [m + n, m * n + 1, m * n - 1];
    const rule = kind === 0 ? "add the exponents" : kind === 1 ? "subtract the exponents" : "multiply the exponents";
    const eq: Token[] = kind === 0
      ? [{ pow: [a, m] }, "×", { pow: [a, n] }, "=", `${a}ⁿ`]
      : kind === 1
        ? [{ pow: [a, big] }, "÷", { pow: [a, n] }, "=", `${a}ⁿ`]
        : [`(${a}${sup(m)})${sup(n)}`, "=", `${a}ⁿ`];
    return {
      key: `er-${kind}-${a}-${m}-${n}`,
      prompt: pick([`Write ${text} as one power of ${a}.`, `${text} = ${a}ⁿ. What is n?`]),
      speech: talk(`Write ${text} as ${a} to the n. What is n?`),
      equation: eq,
      answerLine: ["n", "=", "?"],
      visual: NONE,
      ...choose(ans, wrong, 1, 0),
      hint: `Same base: ${rule}. Think about how many ${a}s are multiplied in all.`,
      explain: `${text} = ${a}${sup(ans)}, so n = ${ans}. With the same base you ${rule}.`,
    };
  }
  if (kind === 3) {
    const b = pick([2, 3, 5, 10]);
    const k = b === 2 ? rand(1, 5) : b === 10 ? rand(1, 3) : rand(1, 3);
    const top = k + rand(2, 5);
    const ans = b ** k;
    return {
      key: `er-val-${b}-${top}-${k}`,
      prompt: pick(["Simplify first, then work out the value.", "Find the value. Use the exponent rules!"]),
      speech: talk(`${b}${sup(top)} divided by ${b}${sup(top - k)}. What is the value?`),
      equation: [{ pow: [b, top] }, "÷", { pow: [b, top - k] }, "=", "?"],
      visual: NONE,
      ...choose(ans, [b * k, ans * b, ans + b], 1, 0),
      hint: "Subtract the exponents to get one small power, then work it out.",
      explain: `${b}${sup(top)} ÷ ${b}${sup(top - k)} = ${b}${sup(k)} = ${ans}.`,
    };
  }
  const c1 = rand(2, 6);
  const c2 = rand(2, 6);
  const correct = `${c1 * c2}x${sup(m + n)}`;
  return {
    key: `er-var-${c1}-${c2}-${m}-${n}`,
    prompt: `Simplify (${c1}x${sup(m)})(${c2}x${sup(n)}).`,
    speech: talk(`Simplify ${c1}x${sup(m)} times ${c2}x${sup(n)}.`),
    visual: NONE,
    ...label(correct, [`${c1 * c2}x${sup(m * n)}`, `${c1 + c2}x${sup(m + n)}`, `${c1 + c2}x${sup(m * n)}`, `${c1 * c2}x${sup(m + n + 1)}`]),
    hint: "Multiply the numbers in front. For the x parts, keep x and add the exponents.",
    explain: `${c1} × ${c2} = ${c1 * c2} and x${sup(m)} · x${sup(n)} = x${sup(m + n)}, so the answer is ${correct}.`,
  };
}

/** 8.EE.A.1 — zero and negative exponents. */
export function zeroNegativeExponents(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const a = rand(2, 99);
    return {
      key: `zn-zero-${a}`,
      prompt: pick([`What is ${a}⁰?`, `Any number (not 0) to the power 0 is…? Try ${a}⁰.`]),
      speech: talk(`What is ${a} to the power zero?`),
      equation: [{ pow: [a, 0] }, "=", "?"],
      visual: NONE,
      ...choose(1, [0, a, -1]),
      hint: `Think of ${a}³ ÷ ${a}³. It's a number divided by itself, and the exponent rule gives ${a}⁰.`,
      explain: `${a}³ ÷ ${a}³ = 1, and the rule says it's ${a}⁰. So ${a}⁰ = 1.`,
    };
  }
  if (kind === 1) {
    const a = pick([2, 3, 4, 5, 10]);
    const n = rand(1, a === 2 ? 5 : 3);
    const val = a ** n;
    return {
      key: `zn-neg-${a}-${n}`,
      prompt: pick([`Write ${a}${sup(-n)} as a fraction.`, `${a}${sup(-n)} = 1/?. Fill the blank.`]),
      speech: talk(`${a}${sup(-n)} equals 1 over what?`),
      equation: [{ pow: [a, -n] }, "=", { n: 1, d: "?" }],
      visual: NONE,
      ...choose(val, [a * n, val * a, a + n], 1, 1),
      hint: "A negative exponent means 'one over' the positive power.",
      explain: `${a}${sup(-n)} = 1/${a}${sup(n)} = 1/${val}.`,
    };
  }
  if (kind === 2) {
    const a = pick([2, 3, 5, 10]);
    const m = rand(2, 6);
    const n = rand(2, 9);
    return {
      key: `zn-mix-${a}-${m}-${n}`,
      prompt: `${a}${sup(m)} × ${a}${sup(-n)} = ${a}ⁿ. What is n?`,
      speech: talk(`${a}${sup(m)} times ${a}${sup(-n)} equals ${a} to the n. What is n?`),
      equation: [{ pow: [a, m] }, "×", { pow: [a, -n] }, "=", `${a}ⁿ`],
      answerLine: ["n", "=", "?"],
      visual: NONE,
      ...choose(m - n, [m + n, n - m, -m * n]),
      hint: "Add the exponents, and watch the negative sign.",
      explain: `${m} + (−${n}) = ${m - n}, so the product is ${a}${sup(m - n)}.`,
    };
  }
  if (kind === 3) {
    const n = rand(2, 9);
    const c = rand(1, 7);
    const correct = c === 1 ? `1/x${sup(n)}` : `${c}/x${sup(n)}`;
    const text = c === 1 ? `x${sup(-n)}` : `${c}x${sup(-n)}`;
    return {
      key: `zn-pos-${c}-${n}`,
      prompt: `Write ${text} with a positive exponent.`,
      speech: talk(`Write ${text} with a positive exponent.`),
      visual: NONE,
      ...label(
        correct,
        c === 1
          ? [`−x${sup(n)}`, `x${sup(n)}`, `−${n}x`]
          : [`1/(${c}x${sup(n)})`, `−${c}x${sup(n)}`, `${c}x${sup(n)}`],
      ),
      hint: "Only the x has the negative exponent. Move just that part under a fraction bar.",
      explain: `x${sup(-n)} = 1/x${sup(n)}, so ${text} = ${correct}.`,
    };
  }
  const a = pick([2, 3, 4, 5]);
  const m = rand(1, 3);
  const k = rand(1, a === 2 ? 4 : 2);
  const n = m + k;
  const ans = a ** k;
  return {
    key: `zn-val-${a}-${m}-${n}`,
    prompt: "Find the value.",
    speech: talk(`${a}${sup(-m)} times ${a}${sup(n)}. What is the value?`),
    equation: [{ pow: [a, -m] }, "×", { pow: [a, n] }, "=", "?"],
    visual: NONE,
    ...choose(ans, [a ** (n + m), a ** n, -ans, a * k], 1),
    hint: "Add the exponents first: one power is easy to work out.",
    explain: `${a}${sup(-m)} × ${a}${sup(n)} = ${a}${sup(k)} = ${ans}.`,
  };
}

/** 8.EE.A.2 — square roots and cube roots; solving x² = p and x³ = p. */
export function squareCubeRoots(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const n = rand(2, 20);
    return {
      key: `rt-sq-${n}`,
      prompt: pick([`What is √${n * n}?`, `Find the square root of ${n * n}.`]),
      speech: `What is the square root of ${n * n}?`,
      equation: [`√${n * n}`, "=", "?"],
      visual: NONE,
      ...choose(n, [(n * n) / 2, n + 1, n - 1, n * n], 1, 0),
      hint: "Which number times itself makes it?",
      explain: `${n} × ${n} = ${n * n}, so √${n * n} = ${n}.`,
    };
  }
  if (kind === 1) {
    const n = nz(-6, 10);
    const c = n ** 3;
    return {
      key: `rt-cube-${n}`,
      prompt: pick([`What is ∛${ds(c)}?`, `Find the cube root of ${ds(c)}.`]),
      speech: talk(`What is the cube root of ${ds(c)}?`),
      equation: [`∛${ds(c)}`, "=", "?"],
      visual: NONE,
      ...choose(n, [-n, c / 3, n + 1, n - 1], 1),
      hint: "Which number times itself times itself makes it? A negative cubed stays negative.",
      explain: `${pa(n)} × ${pa(n)} × ${pa(n)} = ${ds(c)}, so ∛${ds(c)} = ${ds(n)}.`,
    };
  }
  if (kind === 2) {
    const n = rand(2, 15);
    const p = n * n;
    return {
      key: `rt-solve2-${n}`,
      prompt: `Solve x² = ${p}.`,
      speech: `Solve x squared equals ${p}.`,
      visual: NONE,
      ...label(`x = ±${n}`, [`x = ${n} only`, `x = ±${p}`, `x = ${p / 2}`, `x = ±${n + 1}`]),
      hint: "Two different numbers square to the same positive number.",
      explain: `${n}² = ${p} and (−${n})² = ${p}, so x = ${n} or x = −${n}.`,
    };
  }
  if (kind === 3) {
    const n = nz(-5, 6);
    const p = n ** 3;
    return {
      key: `rt-solve3-${n}`,
      prompt: `Solve x³ = ${ds(p)}.`,
      speech: talk(`Solve x cubed equals ${ds(p)}.`),
      equation: ["x³", "=", p],
      answerLine: ["x", "=", "?"],
      visual: NONE,
      ...signed(n),
      hint: "Take the cube root of both sides. Only one number works.",
      explain: `${pa(n)}³ = ${ds(p)}, so x = ∛${ds(p)} = ${ds(n)}.`,
    };
  }
  const s = rand(2, 12);
  const c = rand(1, 5);
  const plus = Math.random() < 0.5;
  const ans = plus ? s + c : s - c;
  const text = `√${s * s} ${plus ? "+" : "−"} ∛${c ** 3}`;
  return {
    key: `rt-mix-${s}-${c}-${plus}`,
    prompt: `What is ${text}?`,
    speech: talk(`What is ${text}?`),
    equation: [text, "=", "?"],
    visual: NONE,
    ...signed(ans),
    hint: "Find each root on its own first, then combine.",
    explain: `√${s * s} = ${s} and ∛${c ** 3} = ${c}, so the answer is ${ds(ans)}.`,
  };
}

const NONSQUARE = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24];

/** 8.NS.A.1 — rational vs irrational; repeating decimals as fractions. */
export function rationalOrIrrational(): Question {
  const kind = rand(0, 3);
  const rationals = () => {
    const k = rand(2, 12);
    const d = pick([3, 7, 9, 11]);
    return shuffle([
      `√${k * k}`,
      `${nz(1, d - 1)}/${d}`,
      `0.${rand(1, 9)}${rand(1, 9)}`,
      `−${rand(2, 30)}`,
      `0.${rand(1, 9)}${rand(1, 9)}${rand(1, 9)}…`.replace(/0\.(\d)(\d)(\d)…/, (_, a) => `0.${a}${a}${a}…`),
      `√(${k * k}/${(k + 1) * (k + 1)})`,
    ]);
  };
  const irrationals = () => shuffle([`√${pick(NONSQUARE)}`, "π", `${rand(2, 9)}π`, `√${pick(NONSQUARE)} + 1`, `${rand(2, 5)}√${pick([2, 3, 5, 7])}`]);
  if (kind <= 1) {
    const wantIrr = kind === 0;
    const odd = wantIrr ? irrationals()[0] : rationals()[0];
    const rest = (wantIrr ? rationals() : irrationals()).filter((s) => s !== odd).slice(0, 3);
    const { choices, labels, answer } = labelChoices(odd, rest);
    return {
      key: `ri-${kind}-${odd}-${sorted(rest.map((s) => s.length)).join(".")}-${rest.join(",")}`,
      prompt: wantIrr ? "Which number is irrational?" : "Which number is rational?",
      speech: wantIrr ? "Which number is irrational?" : "Which number is rational?",
      visual: NONE,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Rational numbers can be written as a fraction of whole numbers. Their decimals end or repeat.",
      explain: wantIrr
        ? `${odd} can't be written as a fraction: its decimal goes on forever without repeating. The others are fractions in disguise.`
        : `${odd} can be written as a fraction of whole numbers, so it's rational. The others have never-ending, non-repeating decimals.`,
    };
  }
  if (kind === 2) {
    const two = Math.random() < 0.6;
    let num: number;
    let den: number;
    let shown: string;
    if (two) {
      let ab = rand(10, 98);
      while (ab % 11 === 0) ab = rand(10, 98);
      num = ab;
      den = 99;
      shown = `0.${ab}${ab}${ab}…`;
    } else {
      num = rand(1, 8);
      den = 9;
      shown = `0.${String(num).repeat(4)}…`;
    }
    const correct = fracStr(num, den);
    const wrong = two
      ? [fracStr(num, 100), fracStr(num, 90), fracStr(Math.floor(num / 10), 9), fracStr(num, 999)]
      : [fracStr(num, 10), fracStr(num, 99), fracStr(1, num + 1), fracStr(num, 100)];
    return {
      key: `ri-rep-${num}-${den}`,
      prompt: `Write ${shown} as a fraction.`,
      speech: talk(`Write ${shown} as a fraction.`),
      visual: NONE,
      ...label(correct, wrong),
      hint: two ? "Two digits repeat: put them over 99, then simplify." : "One digit repeats: put it over 9.",
      explain: two
        ? `Call it x. 100x − x = ${num}, so 99x = ${num} and x = ${num}/99${correct === `${num}/99` ? "" : ` = ${correct}`}.`
        : `Call it x. 10x − x = ${num}, so 9x = ${num} and x = ${correct}.`,
    };
  }
  const d = pick([3, 6, 7, 8, 9, 11, 12, 15, 16, 20, 25, 40]);
  let n = rand(1, d - 1);
  while (gcd(n, d) !== 1) n = rand(1, d - 1);
  let r = d;
  while (r % 2 === 0) r /= 2;
  while (r % 5 === 0) r /= 5;
  const ends = r === 1;
  return {
    key: `ri-term-${n}-${d}`,
    prompt: `As a decimal, does ${n}/${d} end or repeat?`,
    speech: `As a decimal, does ${n} over ${d} end, or repeat forever?`,
    visual: NONE,
    ...yesNo(ends, "it ends", "it repeats forever"),
    hint: "In simplest form, a fraction's decimal ends only when the bottom has no prime factors except 2 and 5.",
    explain: ends
      ? `${d} only has factors of 2 and 5, so ${n}/${d} = ${ds(n / d)} and stops. Either way it's rational.`
      : `${d} has a prime factor other than 2 or 5, so the decimal repeats forever. It's still rational.`,
  };
}

/** 8.NS.A.2 — estimate square roots; compare and order irrational numbers. */
export function estimateRoots(): Question {
  const kind = rand(0, 3);
  let n = rand(3, 150);
  while (Number.isInteger(Math.sqrt(n))) n = rand(3, 150);
  const k = Math.floor(Math.sqrt(n));
  if (kind === 0) {
    return {
      key: `es-between-${n}`,
      prompt: `√${n} is between which two whole numbers?`,
      speech: `The square root of ${n} is between which two whole numbers?`,
      visual: NONE,
      ...label(`${k} and ${k + 1}`, [`${k - 1} and ${k}`, `${k + 1} and ${k + 2}`, `${Math.floor(n / 2)} and ${Math.floor(n / 2) + 1}`]),
      hint: "List perfect squares: 1, 4, 9, 16, 25, 36, 49… Which two sit around the number?",
      explain: `${k}² = ${k * k} and ${k + 1}² = ${(k + 1) ** 2}. ${n} is between them, so √${n} is between ${k} and ${k + 1}.`,
    };
  }
  if (kind === 1) {
    const ans = Math.round(Math.sqrt(n));
    return {
      key: `es-near-${n}`,
      prompt: `√${n} is closest to which whole number?`,
      speech: `The square root of ${n} is closest to which whole number?`,
      visual: NONE,
      ...choose(ans, [k, k + 1, k - 1, k + 2, Math.round(n / 2)], 1, 0),
      hint: "Find the nearest perfect squares. Which one is closer?",
      explain: `${k}² = ${k * k} and ${k + 1}² = ${(k + 1) ** 2}. ${n} is closer to ${ans * ans}, so √${n} ≈ ${ans}.`,
    };
  }
  if (kind === 2) {
    let m = rand(2, 99);
    while (Number.isInteger(Math.sqrt(m))) m = rand(2, 99);
    const j = Math.floor(Math.sqrt(m));
    const ans = clean(Math.round(Math.sqrt(m) * 10) / 10);
    return {
      key: `es-tenth-${m}`,
      prompt: `Estimate √${m} to the nearest tenth.`,
      speech: `Estimate the square root of ${m} to the nearest tenth.`,
      visual: { kind: "numberline", min: j, max: j + 1, step: 0.1, labelStep: 0.5, from: j, to: ans },
      ...choose(ans, [ans + 0.1, ans - 0.1, ans + 0.2, ans - 0.2], 0.1, j),
      hint: `It's a bit more than ${j}. Square a few decimals: ${j}.1², ${j}.2², ${j}.3²… Which lands nearest ${m}?`,
      explain: `${ds(ans)}² = ${ds(ans * ans)}, the closest tenth to ${m}. So √${m} ≈ ${ds(ans)}.`,
    };
  }
  const tenth = rand(1, 9);
  const fn = rand(4, 15);
  const fd = rand(2, 4);
  const items = [
    { t: `√${n}`, v: Math.sqrt(n) },
    { t: "π", v: Math.PI },
    { t: `${k}.${tenth}`, v: k + tenth / 10 },
    { t: `${fn}/${fd}`, v: fn / fd },
  ];
  const vals = items.map((i) => i.v);
  const close = vals.some((v, i) => vals.some((w, j) => i !== j && Math.abs(v - w) < 0.05));
  if (close) return estimateRoots();
  const most = Math.random() < 0.5;
  const best = items.reduce((b, it) => ((most ? it.v > b.v : it.v < b.v) ? it : b));
  const { choices, labels, answer } = labelChoices(best.t, items.filter((i) => i !== best).map((i) => i.t));
  return {
    key: `es-order-${most}-${items.map((i) => i.t).join(",")}`,
    prompt: most ? "Which number is the largest?" : "Which number is the smallest?",
    speech: most ? "Which number is the largest?" : "Which number is the smallest?",
    visual: NONE,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Turn each one into a decimal: π ≈ 3.14, and estimate the square root between two whole numbers.",
    explain: `As decimals: ${items.map((i) => `${i.t} ≈ ${i.v.toFixed(2)}`).join(", ")}. So ${best.t} is the ${most ? "largest" : "smallest"}.`,
  };
}

/** "4.5 × 10⁶" */
const sci = (c: number, e: number) => `${ds(c)} × 10${sup(e)}`;

/** Scientific-notation choices: wrong pairs whose value equals the answer are dropped. */
function sciLabel(c: number, e: number, wrong: [number, number][]): Answer {
  const val = c * 10 ** e;
  const ok = wrong.filter(([wc, we]) => Math.abs(wc * 10 ** we - val) > 1e-9 * Math.abs(val));
  return label(sci(c, e), ok.map(([wc, we]) => sci(wc, we)));
}

/** 8.EE.A.3 — single digit × a power of 10; how many times bigger. */
export function powersOfTen(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const small = Math.random() < 0.35;
    const e = small ? rand(-4, -2) : rand(3, 9);
    const s = rand(110, 949);
    const N = clean(e >= 2 ? s * 10 ** (e - 2) : s / 10 ** (2 - e));
    const d = Math.round(s / 100);
    const digits = String(Math.floor(N)).length;
    return {
      key: `pt-est-${s}-${e}`,
      prompt: pick(["Estimate as one digit times a power of 10. What is n?", `Round to ${d} × 10ⁿ. What is n?`]),
      speech: talk(`${ds(N)} is about ${d} times 10 to the n. What is n?`),
      equation: [small ? ds(N) : N, "≈", d, "×", "10ⁿ"],
      answerLine: ["n", "=", "?"],
      visual: NONE,
      ...choose(e, small ? [e + 1, e - 1, -e] : [e + 1, e - 1, digits === e ? e + 2 : digits]),
      hint: small
        ? `Count how many places the point moves right to get ${d}. Moving right means a negative power.`
        : `Count how many places the point moves left to get ${d}.`,
      explain: `${ds(N)} ≈ ${d} × 10${sup(e)}${small ? `, since ${d} × 10${sup(e)} = ${ds(d * 10 ** e)}` : ""}. So n = ${e}.`,
    };
  }
  if (kind === 1) {
    const [a, b] = pick([[8, 2], [8, 4], [6, 2], [6, 3], [9, 3], [4, 2], [9, 1], [5, 1], [6, 1], [8, 1]] as [number, number][]);
    const q = rand(2, 8);
    const p = q + rand(1, 4);
    const ans = (a / b) * 10 ** (p - q);
    const [big, little, unit] = pick([
      ["A country", "a town", "people"],
      ["A hard drive", "a song file", "bytes"],
      ["A lake", "a pool", "liters"],
      ["A forest", "a park", "trees"],
    ]);
    const generic = Math.random() < 0.4;
    const text = `${big} has about ${sci(a, p)} ${unit}; ${little} has about ${sci(b, q)}.`;
    return {
      key: `pt-times-${a}-${b}-${p}-${q}-${generic ? "g" : big}`,
      prompt: generic ? `How many times bigger is ${sci(a, p)} than ${sci(b, q)}?` : `${big}: ${sci(a, p)} ${unit}. ${cap(little)}: ${sci(b, q)}. How many times more?`,
      speech: talk(generic ? `How many times bigger is ${sci(a, p)} than ${sci(b, q)}?` : `${text} How many times more is that?`),
      equation: [a, "×", { pow: [10, p] }, "÷", "(", b, "×", { pow: [10, q] }, ")", "=", "?"],
      visual: NONE,
      ...choose(ans, [ans * 10, ans / 10, (a - b) * 10 ** (p - q), (a / b) * (p - q)], 1, 0),
      hint: "Divide the front numbers, then subtract the exponents of 10.",
      explain: `${a} ÷ ${b} = ${a / b} and 10${sup(p)} ÷ 10${sup(q)} = 10${sup(p - q)}, so it's ${ans} times bigger.`,
    };
  }
  const q = rand(1, 8);
  const p = q + rand(1, 6);
  const ans = 10 ** (p - q);
  return {
    key: `pt-ten-${p}-${q}`,
    prompt: `10${sup(p)} is how many times 10${sup(q)}?`,
    speech: talk(`10${sup(p)} is how many times 10${sup(q)}?`),
    equation: [{ pow: [10, p] }, "÷", { pow: [10, q] }, "=", "?"],
    visual: NONE,
    ...choose(ans, [ans * 10, ans / 10, p - q, p * q], 1, 1),
    hint: "Subtract the exponents. Each 1 in the exponent is one more zero.",
    explain: `10${sup(p)} ÷ 10${sup(q)} = 10${sup(p - q)} = ${ans}.`,
  };
}

/** 8.EE.A.4 — operations with scientific notation. */
export function scientificNotation(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    const m = rand(2, 9);
    const n = rand(2, 9);
    const p = a * b;
    const [c, e] = p >= 10 ? [p / 10, m + n + 1] : [p, m + n];
    return {
      key: `sn-mul-${a}-${b}-${m}-${n}`,
      prompt: `Multiply: (${sci(a, m)}) × (${sci(b, n)})`,
      speech: talk(`Multiply ${sci(a, m)} by ${sci(b, n)}. Answer in scientific notation.`),
      visual: NONE,
      ...sciLabel(c, e, [[c, m * n], [c, e === m + n ? e + 1 : m + n], [a + b, m + n], [c, e - 1]]),
      hint: "Multiply the front numbers and add the exponents. Then make sure the front number is between 1 and 10.",
      explain: `${a} × ${b} = ${p} and 10${sup(m)} × 10${sup(n)} = 10${sup(m + n)}.${p >= 10 ? ` ${p} × 10${sup(m + n)} = ${sci(c, e)}.` : ""} Answer: ${sci(c, e)}.`,
    };
  }
  if (kind === 1) {
    const b = rand(2, 4);
    const c = pick([1.2, 1.5, 2, 2.5, 3, 4].filter((v) => v * b < 10));
    const a = clean(c * b);
    const m = rand(6, 12);
    const n = rand(2, m - 2);
    return {
      key: `sn-div-${a}-${b}-${m}-${n}`,
      prompt: `Divide: (${sci(a, m)}) ÷ (${sci(b, n)})`,
      speech: talk(`Divide ${sci(a, m)} by ${sci(b, n)}.`),
      visual: NONE,
      ...sciLabel(c, m - n, [[c, m + n], [c, m - n - 1], [clean(a * b), m - n], [c, m * n]]),
      hint: "Divide the front numbers and subtract the exponents.",
      explain: `${ds(a)} ÷ ${b} = ${ds(c)} and 10${sup(m)} ÷ 10${sup(n)} = 10${sup(m - n)}. Answer: ${sci(c, m - n)}.`,
    };
  }
  if (kind === 2) {
    const small = Math.random() < 0.5;
    const s = rand(11, 99);
    const c = s / 10;
    const e = small ? -rand(2, 4) : rand(4, 8);
    const N = clean(c * 10 ** e);
    return {
      key: `sn-write-${s}-${e}`,
      prompt: `Write ${ds(N)} in scientific notation.`,
      speech: talk(`Write ${ds(N)} in scientific notation.`),
      visual: NONE,
      ...sciLabel(c, e, [[c, -e], [c, e + 1], [c, e - 1], [s, e - 2]]),
      hint: small ? "Move the point right until one digit is in front of it. Count the moves: the power is negative." : "Move the point left until one digit is in front of it. Count the moves.",
      explain: `${ds(N)} = ${sci(c, e)}.`,
    };
  }
  if (kind === 3) {
    const A = rand(11, 79);
    const B = rand(11, 79);
    const m = rand(3, 9);
    const S = A + B;
    const [c, e] = S >= 100 ? [S / 100, m + 1] : [S / 10, m];
    return {
      key: `sn-add-${A}-${B}-${m}`,
      prompt: `Add: ${sci(A / 10, m)} + ${sci(B / 10, m)}`,
      speech: talk(`Add ${sci(A / 10, m)} and ${sci(B / 10, m)}.`),
      visual: NONE,
      ...sciLabel(c, e, [[c, 2 * m], [c, e + 1], [c, e - 1], [clean((A * B) / 100), 2 * m]]),
      hint: "The powers of 10 match, so add the front numbers and keep the power. Fix the front number if it passes 10.",
      explain: `${ds(A / 10)} + ${ds(B / 10)} = ${ds(S / 10)}, so the sum is ${S >= 100 ? `${ds(S / 10)} × 10${sup(m)} = ` : ""}${sci(c, e)}.`,
    };
  }
  const v = pick([1.2, 1.5, 2, 2.5]);
  const k = pick([2, 3, 4]);
  const big = clean(v * k);
  const ev = -rand(7, 9);
  const eb = ev + rand(1, 3);
  const ans = k * 10 ** (eb - ev);
  const [small, large] = pick([["a virus", "a cell"], ["a dust grain", "a sand grain"], ["a wire", "a hair"]]);
  return {
    key: `sn-ctx-${v}-${k}-${ev}-${eb}-${small}`,
    prompt: `${large} is ${sci(big, eb)} m; ${small} is ${sci(v, ev)} m. How many times longer?`.replace(/^./, (c) => c.toUpperCase()),
    speech: talk(`${large} is ${sci(big, eb)} meters long. ${small} is ${sci(v, ev)} meters. How many times longer is ${large}?`),
    equation: [big, "×", { pow: [10, eb] }, "÷", "(", v, "×", { pow: [10, ev] }, ")", "=", "?"],
    visual: NONE,
    ...choose(ans, [ans * 10, ans / 10, k * (eb - ev)], 1, 0),
    hint: "Divide the front numbers, then subtract the exponents (careful with the negatives).",
    explain: `${ds(big)} ÷ ${ds(v)} = ${k} and 10${sup(eb)} ÷ 10${sup(ev)} = 10${sup(eb - ev)}, so ${ans} times.`,
  };
}

/** Root table: base = r^n. */
const ROOTS: [number, number][] = [
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => [r, 2] as [number, number]),
  ...[2, 3, 4, 5].map((r) => [r, 3] as [number, number]),
  [2, 4],
  [3, 4],
  [2, 5],
];

/** x to a rational power as text: x^(3/2), x², x. */
function xPow(p: number, q: number): string {
  const g = gcd(p, q);
  const [a, b] = [p / g, q / g];
  if (b === 1) return a === 1 ? "x" : `x${sup(a)}`;
  return `x^(${a}/${b})`;
}

/** HSN-RN.A.1, HSN-RN.A.2 — rational exponents and radicals. */
export function rationalExponents(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const [r, n] = pick(ROOTS);
    const base = r ** n;
    return {
      key: `re-root-${base}-${n}`,
      prompt: `What is ${base}^(1/${n})?`,
      speech: talk(`What is ${base}^(1/${n})?`),
      equation: [`${base}^(1/${n})`, "=", "?"],
      visual: NONE,
      ...choose(r, [base / n, r + 1, r * n], 1, 0),
      hint: `A power of 1/${n} means the ${n === 2 ? "square" : n === 3 ? "cube" : `${ordinal(n)}`} root.`,
      explain: `${r}${sup(n)} = ${base}, so ${base}^(1/${n}) = ${r}.`,
    };
  }
  if (kind === 1) {
    const [r, n, m] = pick([
      ...[2, 3, 4, 5, 6, 7, 8, 9].map((r) => [r, 2, 3]),
      ...[2, 3, 4, 5].map((r) => [r, 3, 2]),
      [2, 4, 3],
      [3, 4, 3],
      [2, 5, 2],
      [2, 5, 3],
    ] as [number, number, number][]);
    const base = r ** n;
    const ans = r ** m;
    return {
      key: `re-mn-${base}-${m}-${n}`,
      prompt: `What is ${base}^(${m}/${n})?`,
      speech: talk(`What is ${base}^(${m}/${n})?`),
      equation: [`${base}^(${m}/${n})`, "=", "?"],
      visual: NONE,
      ...choose(ans, [(base * m) / n, r * m, r ** (m + 1), base ** m > 1e6 ? ans + r : base / m], 1, 0),
      hint: `Take the ${n === 2 ? "square" : n === 3 ? "cube" : `${ordinal(n)}`} root first, then raise it to the power ${m}.`,
      explain: `${base}^(1/${n}) = ${r}, and ${r}${sup(m)} = ${ans}.`,
    };
  }
  if (kind === 2) {
    const [r, n] = pick(ROOTS);
    const base = r ** n;
    return {
      key: `re-neg-${base}-${n}`,
      prompt: `${base}^(−1/${n}) = 1/?. Fill the blank.`,
      speech: talk(`${base}^(−1/${n}) equals 1 over what?`),
      equation: [`${base}^(−1/${n})`, "=", { n: 1, d: "?" }],
      visual: NONE,
      ...choose(r, [base, r * n, r + 1], 1, 1),
      hint: "The negative sign means 'one over'. The 1/n part means a root.",
      explain: `${base}^(−1/${n}) = 1/${base}^(1/${n}) = 1/${r}.`,
    };
  }
  if (kind === 3) {
    const n = pick([2, 3]);
    const m = pick(n === 2 ? [1, 3, 5, 7] : [1, 2, 4, 5]);
    const inside = m === 1 ? "x" : `(x${sup(m)})`;
    const shown = `${n === 2 ? "√" : "∛"}${inside}`;
    return {
      key: `re-rad-${n}-${m}`,
      prompt: `Write ${shown} as a power of x.`,
      speech: talk(`Write ${shown} as a power of x.`),
      visual: NONE,
      ...label(xPow(m, n), [xPow(n, m), xPow(m * n, 1), xPow(m + n, 1), xPow(m, n + 1)]),
      hint: "An nth root is the power 1/n. Then multiply the exponents.",
      explain: `${shown} = (x${m === 1 ? "" : sup(m)})^(1/${n}) = ${xPow(m, n)}.`,
    };
  }
  if (kind === 4) {
    const n = pick([3, 4, 5]);
    const a = rand(1, n - 1);
    const b = rand(1, n - 1);
    const pow = Math.random() < 0.5;
    if (pow) {
      const k = rand(2, 4);
      return {
        key: `re-pp-${a}-${n}-${k}`,
        prompt: `Simplify (${xPow(a, n)})${sup(k)}.`,
        speech: talk(`Simplify ${xPow(a, n)}, all to the power ${k}.`),
        visual: NONE,
        ...label(xPow(a * k, n), [xPow(a + k, n), xPow(a, n * k), xPow(a * k, n * k), xPow(a * k + 1, n)]),
        hint: "A power of a power: multiply the exponents.",
        explain: `(${a}/${n}) × ${k} = ${fracStr(a * k, n)}, so the answer is ${xPow(a * k, n)}.`,
      };
    }
    return {
      key: `re-prod-${a}-${b}-${n}`,
      prompt: `Simplify ${xPow(a, n)} · ${xPow(b, n)}.`,
      speech: talk(`Simplify ${xPow(a, n)} times ${xPow(b, n)}.`),
      visual: NONE,
      ...label(xPow(a + b, n), [xPow(a * b, n * n), xPow(a + b, 2 * n), xPow(a * b, n), xPow(a + b + 1, n)]),
      hint: "Same base, multiplying: add the exponents. The fractions already share a denominator.",
      explain: `${fracStr(a, n)} + ${fracStr(b, n)} = ${fracStr(a + b, n)}, so the product is ${xPow(a + b, n)}.`,
    };
  }
  const n = pick([2, 3]);
  let b = rand(2, 30);
  while (Number.isInteger(Math.round(b ** (1 / n) * 1e9) / 1e9)) b = rand(2, 30);
  const root = n === 2 ? `√${b}` : `∛${b}`;
  return {
    key: `re-mean-${b}-${n}`,
    prompt: `(${b}^(1/${n}))${sup(n)} = ${b}^(1/${n} · ${n}) = ${b}. So ${b}^(1/${n}) is…`,
    speech: talk(`${b}^(1/${n}), raised to the power ${n}, equals ${b}. So what does ${b}^(1/${n}) mean?`),
    visual: NONE,
    ...label(root, [`${b}/${n}`, n === 2 ? `∛${b}` : `√${b}`, `${b}${sup(n)}`, `${b * n}`]),
    hint: `Which number, raised to the power ${n}, gives ${b}?`,
    explain: `The number that gives ${b} when raised to the power ${n} is the ${n === 2 ? "square" : "cube"} root, so ${b}^(1/${n}) = ${root}.`,
  };
}

const SQFREE = [2, 3, 5, 6, 7, 10, 11];

/** HSN-RN.B.3, 8.NS.A.1 — sums and products of rational and irrational numbers. */
export function irrationalSums(): Question {
  const kind = rand(0, 3);
  const p = pick(SQFREE);
  const q = pick(SQFREE.filter((v) => v !== p));
  const a = rand(2, 9);
  const k = rand(2, 4);
  const c = pick([3, 4, 5, 7]);
  const b = rand(1, c - 1);
  const rational = shuffle([
    `${a} + ${b}/${c}`,
    `√${p} · √${p}`,
    `√${p} · √${p * k * k}`,
    `${a}√${p} ÷ √${p}`,
    `(√${p})²`,
    `√${k * k} + ${a}`,
  ]);
  const irrational = shuffle([`${a} + √${p}`, `${a}√${p}`, `√${p} + √${q}`, `${a}π`, `√${p}/${a}`, `${b}/${c} + √${q}`, `π + ${a}`]);
  if (kind <= 1) {
    const wantIrr = kind === 0;
    const odd = wantIrr ? irrational[0] : rational[0];
    const rest = (wantIrr ? rational : irrational).slice(0, 3);
    const { choices, labels, answer } = labelChoices(odd, rest);
    return {
      key: `is-${kind}-${odd}-${rest.join(",")}`,
      prompt: wantIrr ? "Which result is irrational?" : "Which result is rational?",
      speech: wantIrr ? "Which of these results is irrational?" : "Which of these results is rational?",
      visual: NONE,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Rational + irrational is irrational. A nonzero rational times an irrational is irrational. Two roots can multiply to a whole number.",
      explain: wantIrr
        ? `${odd} mixes a rational number with an irrational one, so it's irrational. The others simplify to fractions.`
        : `${odd} simplifies to a fraction (or whole number), so it's rational. The others stay irrational.`,
    };
  }
  if (kind === 2) {
    const isRat = Math.random() < 0.5;
    const expr = isRat ? rational[0] : irrational[0];
    return {
      key: `is-one-${expr}`,
      prompt: `Is ${expr} rational or irrational?`,
      speech: talk(`Is ${expr} rational or irrational?`),
      visual: NONE,
      ...yesNo(isRat, "rational", "irrational"),
      hint: "Can you simplify it to a fraction of whole numbers? If an irrational part survives, it's irrational.",
      explain: isRat ? `${expr} simplifies to a whole number or fraction, so it's rational.` : `${expr} still has an irrational part that can't cancel, so it's irrational.`,
    };
  }
  const ans = p * k;
  return {
    key: `is-prod-${p}-${k}`,
    prompt: `√${p} and √${p * k * k} are irrational. What is √${p} · √${p * k * k}?`,
    speech: talk(`What is √${p} times √${p * k * k}?`),
    equation: [`√${p} · √${p * k * k}`, "=", "?"],
    visual: NONE,
    ...choose(ans, [p + p * k * k, k, p * p * k * k], 1, 0),
    hint: "√a · √b = √(ab). Is the product a perfect square?",
    explain: `√${p} · √${p * k * k} = √${p * p * k * k} = ${ans}. Two irrationals can multiply to a rational number.`,
  };
}

/** Activity: place irrational numbers on a number line, order them, sort rational vs irrational. 8.NS.A.1, 8.NS.A.2. */
export function placeAndOrder(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    let n = rand(2, 99);
    while (Number.isInteger(Math.sqrt(n))) n = rand(2, 99);
    const usePi = kind === 1 && Math.random() < 0.3;
    const value = usePi ? Math.PI * pick([1, 2]) : Math.sqrt(n);
    const name = usePi ? (value > 4 ? "2π" : "π") : `√${n}`;
    const k = Math.floor(value);
    const target = clean(Math.round(value * 10) / 10);
    return {
      key: `po-place-${name}`,
      prompt: `Place ${name} on the number line, to the nearest tenth.`,
      speech: talk(`Drag the marker to show where ${name} goes, to the nearest tenth.`),
      visual: NONE,
      input: "activity",
      activity: { kind: "placeOnLine", min: k, max: k + 1, step: 0.1, labelStep: 0.5, target },
      answer: target,
      hint: usePi ? "π ≈ 3.14." : `${k}² = ${k * k} and ${k + 1}² = ${(k + 1) ** 2}. Is ${n} nearer the low end or the high end?`,
      explain: `${name} ≈ ${value.toFixed(3)}, which rounds to ${ds(target)}.`,
    };
  }
  if (kind === 2) {
    for (;;) {
      const items: { t: string; v: number }[] = [];
      const roots = distinct(2, 2, 60).filter((r) => !Number.isInteger(Math.sqrt(r)));
      roots.forEach((r) => items.push({ t: `√${r}`, v: Math.sqrt(r) }));
      items.push({ t: "π", v: Math.PI });
      const d = rand(10, 75);
      items.push({ t: ds(d / 10), v: d / 10 });
      const fn = rand(3, 25);
      const fd = pick([2, 3, 4]);
      if (gcd(fn, fd) === 1) items.push({ t: `${fn}/${fd}`, v: fn / fd });
      const vs = items.map((i) => i.v);
      const tooClose = vs.some((v, i) => vs.some((w, j) => i !== j && Math.abs(v - w) < 0.15));
      if (items.length < 4 || tooClose) continue;
      const up = Math.random() < 0.5;
      const order = [...items].sort((a, b) => (up ? a.v - b.v : b.v - a.v));
      return {
        key: `po-order-${up}-${order.map((o) => o.t).join(",")}`,
        prompt: `Tap these from ${up ? "smallest to largest" : "largest to smallest"}.`,
        speech: talk(`Put these numbers in order from ${up ? "smallest to largest" : "largest to smallest"}: ${items.map((i) => i.t).join(", ")}.`),
        visual: NONE,
        input: "activity",
        activity: { kind: "order", items: order.map((o) => o.t), direction: up ? "smallest to largest" : "largest to smallest" },
        answer: order.length,
        hint: "Change each one to a decimal: estimate the roots between whole numbers, and π ≈ 3.14.",
        explain: `As decimals: ${order.map((o) => `${o.t} ≈ ${o.v.toFixed(2)}`).join(", ")}.`,
      };
    }
  }
  const p = pick(SQFREE);
  const k = rand(2, 9);
  const pool = shuffle([
    { label: `√${k * k}`, bin: 0 },
    { label: `${rand(1, 8)}/${pick([3, 7, 9])}`, bin: 0 },
    { label: `0.${rand(1, 9)}${rand(1, 9)}`, bin: 0 },
    { label: `−${rand(2, 20)}`, bin: 0 },
    { label: `0.${"3".repeat(3)}…`, bin: 0 },
    { label: `√${p}`, bin: 1 },
    { label: "π", bin: 1 },
    { label: `${k} + √${pick(SQFREE.filter((v) => v !== p))}`, bin: 1 },
    { label: `${rand(2, 5)}π`, bin: 1 },
  ]);
  const items = pool.slice(0, 6);
  if (!items.some((i) => i.bin === 0) || !items.some((i) => i.bin === 1)) return placeAndOrder();
  const irr = items.filter((i) => i.bin === 1).length;
  return {
    key: `po-sort-${items.map((i) => i.label).join(",")}`,
    prompt: "Sort each number: rational or irrational?",
    speech: "Sort each number into rational or irrational.",
    visual: NONE,
    input: "activity",
    activity: { kind: "sort", bins: ["rational", "irrational"], items },
    answer: irr,
    hint: "Can it be written as a fraction of whole numbers? Ending or repeating decimals and perfect-square roots are rational.",
    explain: `Irrational: ${items.filter((i) => i.bin === 1).map((i) => i.label).join(", ")}. The rest are fractions in disguise.`,
  };
}

/* =========================================================== 2. Linear equations */

/** "+ 5" / "− 5" pieces for building equation text. */
const signed$ = (n: number) => `${n < 0 ? "−" : "+"} ${Math.abs(n)}`;

/** 8.EE.C.7b, HSA-REI.B.3 — multi-step linear equations with whole-number solutions. */
export function multiStepEquations(): Question {
  const form = rand(0, 4);
  const x = nz(-9, 9);
  const answerLine: Token[] = ["x", "=", "?"];
  if (form === 0) {
    const a = rand(2, 6);
    const b = nz(-8, 8);
    const c = a * (x + b);
    const text = `${a}(x ${signed$(b)}) = ${ds(c)}`;
    return {
      key: `ms-0-${a}-${b}-${x}`,
      prompt: pick(["Solve for x.", "Find x.", "What value of x makes this true?"]),
      speech: talk(`Solve ${text}.`),
      equation: [a, "(", "x", b < 0 ? "−" : "+", Math.abs(b), ")", "=", c],
      answerLine,
      visual: NONE,
      ...signed(x),
      hint: `Divide both sides by ${a} first, or distribute the ${a}.`,
      explain: `Divide by ${a}: x ${signed$(b)} = ${ds(c / a)}. Then x = ${ds(c / a)} ${b < 0 ? "+" : "−"} ${Math.abs(b)} = ${ds(x)}.`,
    };
  }
  if (form === 1) {
    const a = nz(-9, 9, 1);
    const c = nz(-9, 9, a);
    const b = nz(-12, 12);
    const d = (a - c) * x + b;
    return {
      key: `ms-1-${a}-${b}-${c}-${x}`,
      prompt: pick(["Solve. x is on both sides!", "Find x.", "Get the x terms on one side, then solve."]),
      speech: talk(`Solve ${lin(a, b)} = ${lin(c, d)}.`),
      equation: [...linToks(a, b), "=", ...linToks(c, d)],
      answerLine,
      visual: NONE,
      ...signed(x),
      hint: `${c > 0 ? `Subtract ${lin(c, 0)} from` : `Add ${lin(-c, 0)} to`} both sides so x is only on the left.`,
      explain: `${lin(a, b)} = ${lin(c, d)} → ${lin(a - c, 0)} = ${ds(d - b)} → x = ${ds(x)}.`,
    };
  }
  if (form === 2) {
    const a = rand(2, 5);
    const b = nz(-6, 6);
    const c = nz(-5, 5, -a);
    const d = a * (x + b) + c * x;
    const text = `${a}(x ${signed$(b)}) ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}x = ${ds(d)}`;
    return {
      key: `ms-2-${a}-${b}-${c}-${x}`,
      prompt: pick(["Distribute, combine like terms, then solve.", "Solve for x."]),
      speech: talk(`Solve ${text}.`),
      equation: [a, "(", "x", b < 0 ? "−" : "+", Math.abs(b), ")", c < 0 ? "−" : "+", { x: Math.abs(c) }, "=", d],
      answerLine,
      visual: NONE,
      ...signed(x),
      hint: `Distribute the ${a}, then combine the x terms.`,
      explain: `${lin(a, a * b)} ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}x = ${ds(d)} → ${lin(a + c, a * b)} = ${ds(d)} → x = ${ds(x)}.`,
    };
  }
  if (form === 3) {
    const a = pick([0.5, 1.5, 2.5]);
    const xe = nz(-4, 4) * 2;
    const b = nz(-9, 9);
    const c = clean(a * xe + b);
    return {
      key: `ms-3-${a}-${b}-${xe}`,
      prompt: pick(["Solve. Decimals work the same way!", "Find x."]),
      speech: talk(`Solve ${lin(a, b)} = ${ds(c)}.`),
      equation: [...linToks(a, b), "=", c],
      answerLine,
      visual: NONE,
      ...signed(xe),
      hint: "Undo the adding first, then divide by the decimal (or double both sides to clear it).",
      explain: `${lin(a, 0)} = ${ds(c - b)}, so x = ${ds(c - b)} ÷ ${a} = ${ds(xe)}.`,
    };
  }
  const a = rand(2, 5);
  const b = nz(-6, 6);
  const c = rand(5, 30);
  const d = c - a * (x - b);
  const text = `${c} − ${a}(x ${signed$(-b)}) = ${ds(d)}`;
  return {
    key: `ms-4-${a}-${b}-${c}-${x}`,
    prompt: pick(["Careful with the minus! Solve for x.", "Solve for x."]),
    speech: talk(`Solve ${text}.`),
    equation: [c, "−", a, "(", "x", -b < 0 ? "−" : "+", Math.abs(b), ")", "=", d],
    answerLine,
    visual: NONE,
    ...signed(x),
    hint: `The minus sign multiplies everything in the brackets: −${a} times x and −${a} times ${ds(-b)}.`,
    explain: `${c} ${lin(-a, a * b).replace(/^−/, "− ").replace(/^(\d)/, "+ $1")} = ${ds(d)} → ${lin(-a, c + a * b)} = ${ds(d)} → x = ${ds(x)}.`,
  };
}

/** HSA-REI.A.1 — name the step that turns one equation into the next. */
export function equationSteps(): Question {
  const kind = rand(0, 5);
  const a = rand(2, 9);
  const b = rand(2, 15);
  const x = rand(1, 9);
  let from: string;
  let to: string;
  let correct: string;
  let wrong: string[];
  if (kind === 0) {
    const minus = Math.random() < 0.5;
    const c = minus ? a * x - b : a * x + b;
    from = `${a}x ${minus ? "−" : "+"} ${b} = ${c}`;
    to = `${a}x = ${a * x}`;
    correct = minus ? `Add ${b} to both sides` : `Subtract ${b} from both sides`;
    wrong = [minus ? `Subtract ${b} from both sides` : `Add ${b} to both sides`, `Divide both sides by ${a}`, `Subtract ${b} from one side only`];
  } else if (kind === 1) {
    from = `${a}x = ${a * x}`;
    to = `x = ${x}`;
    correct = `Divide both sides by ${a}`;
    wrong = [`Subtract ${a} from both sides`, `Multiply both sides by ${a}`, "Combine like terms"];
  } else if (kind === 2) {
    from = `${a}(x + ${b}) = ${a * (x + b)}`;
    to = `${a}x + ${a * b} = ${a * (x + b)}`;
    correct = "Use the distributive property";
    wrong = ["Combine like terms", `Subtract ${b} from both sides`, "Use the commutative property"];
  } else if (kind === 3) {
    const c = rand(2, 9);
    from = `${a}x + ${c}x = ${(a + c) * x}`;
    to = `${a + c}x = ${(a + c) * x}`;
    correct = "Combine like terms";
    wrong = ["Use the distributive property", `Add ${c} to both sides`, "Divide both sides by x"];
  } else if (kind === 4) {
    const c = rand(1, a - 1 || 1);
    const d = (a - c) * x + b;
    from = `${a}x + ${b} = ${c === 1 ? "" : c}x + ${d}`;
    to = `${a - c === 1 ? "" : a - c}x + ${b} = ${d}`;
    correct = `Subtract ${c === 1 ? "" : c}x from both sides`;
    wrong = [`Subtract ${a}x from both sides`, `Add ${c === 1 ? "" : c}x to both sides`, `Subtract ${b} from both sides`];
  } else {
    from = `x/${a} = ${x}`;
    to = `x = ${a * x}`;
    correct = `Multiply both sides by ${a}`;
    wrong = [`Divide both sides by ${a}`, `Add ${a} to both sides`, "Use the distributive property"];
  }
  return {
    key: `st-${kind}-${a}-${b}-${x}-${from}`,
    prompt: `${from}  →  ${to}. Which step was used?`,
    speech: talk(`The equation ${from} became ${to}. Which step was used?`),
    visual: NONE,
    ...label(correct, wrong),
    hint: "Compare the two lines. What changed, and was it done to both sides?",
    explain: `${correct}: ${from} becomes ${to}. Doing the same thing to both sides keeps the equation true.`,
  };
}

const SOL_ONE = "one solution";
const SOL_NONE = "no solution";
const SOL_ALL = "infinitely many";

/** 8.EE.C.7a — linear equations with one, no, or infinitely many solutions. */
export function howManySolutions(): Question {
  const kind = rand(0, 4);
  const a = rand(2, 6);
  const p = nz(-6, 6);
  if (kind <= 2) {
    let text: string;
    let correct: string;
    if (kind === 0) {
      const c = nz(-6, 6, a);
      text = `${a}(x ${signed$(p)}) = ${lin(c, rand(-9, 9))}`;
      correct = SOL_ONE;
    } else if (kind === 1) {
      let q = nz(-15, 15);
      while (q === a * p) q = nz(-15, 15);
      text = `${a}(x ${signed$(p)}) = ${lin(a, q)}`;
      correct = SOL_NONE;
    } else {
      text = pick([`${a}(x ${signed$(p)}) = ${lin(a, a * p)}`, `${lin(a, p)} + x = ${lin(a + 1, p)}`]);
      correct = SOL_ALL;
    }
    return {
      key: `hm-${kind}-${text}`,
      prompt: `How many solutions does ${text} have?`,
      speech: talk(`How many solutions does ${text} have?`),
      visual: NONE,
      ...label(correct, [SOL_ONE, SOL_NONE, SOL_ALL].filter((s) => s !== correct)),
      hint: "Simplify both sides. Different x terms: one solution. Same x terms: compare the numbers.",
      explain:
        correct === SOL_ONE
          ? "The x terms are different, so you can solve for exactly one x."
          : correct === SOL_NONE
            ? "Simplified, both sides have the same x term but different numbers, like 3 = 5. That's never true: no solution."
            : "Simplified, both sides are exactly the same. Every x works: infinitely many solutions.",
    };
  }
  if (kind === 3) {
    return {
      key: `hm-fill-inf-${a}-${p}`,
      prompt: "What number makes this true for every x?",
      speech: talk(`${a}(x ${signed$(p)}) equals ${a}x plus what, for every x?`),
      equation: [a, "(", "x", p < 0 ? "−" : "+", Math.abs(p), ")", "=", { x: a }, "+", "?"],
      visual: NONE,
      ...signed(a * p),
      hint: `Distribute the ${a}. The two sides must match exactly.`,
      explain: `${a}(x ${signed$(p)}) = ${lin(a, a * p)}, so the blank is ${ds(a * p)}: infinitely many solutions.`,
    };
  }
  const b = rand(1, 9);
  const d = nz(1, 15, b);
  return {
    key: `hm-fill-none-${a}-${b}-${d}`,
    prompt: "What coefficient gives no solution?",
    speech: talk(`${a}x + ${b} equals what times x, plus ${d}. Which number gives no solution?`),
    equation: [{ x: a }, "+", b, "=", "?", "x", "+", d],
    visual: NONE,
    ...signed(a),
    hint: "No solution happens when the x terms match but the numbers don't.",
    explain: `With ${a}x on both sides, you'd get ${b} = ${d}, which is false. So the blank is ${a}.`,
  };
}

/** HSA-CED.A.1 — write and solve equations from word problems. */
export function writeEquations(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const fee = rand(4, 12) * 5;
    const per = rand(3, 8) * 5;
    const n = rand(2, 12);
    const total = fee + per * n;
    return {
      key: `we-gym-${fee}-${per}-${n}`,
      prompt: `A gym costs $${fee} to join plus $${per} a month. You paid $${total}. Months?`,
      speech: `A gym costs ${fee} dollars to join plus ${per} dollars a month. You've paid ${total} dollars in all. How many months is that?`,
      visual: NONE,
      ...keypad(n),
      hint: `Write it as ${fee} + ${per}m = ${total}, then solve for m.`,
      explain: `${fee} + ${per}m = ${total} → ${per}m = ${total - fee} → m = ${n}.`,
    };
  }
  if (kind === 1) {
    const n = rand(-20, 60);
    const count = pick([3, 4]);
    const S = count * n + (count * (count - 1)) / 2;
    return {
      key: `we-consec-${count}-${n}`,
      prompt: `${count} consecutive integers add to ${ds(S)}. What's the smallest?`,
      speech: talk(`${count} consecutive integers add up to ${ds(S)}. What is the smallest one?`),
      visual: NONE,
      ...signed(n),
      hint: `Call the smallest n. The others are n + 1, n + 2${count === 4 ? ", n + 3" : ""}. Add them up.`,
      explain: `${count}n + ${(count * (count - 1)) / 2} = ${ds(S)} → ${count}n = ${ds(S - (count * (count - 1)) / 2)} → n = ${ds(n)}.`,
    };
  }
  if (kind === 2) {
    const w = rand(3, 20);
    const k = rand(2, 10);
    const P = 2 * (2 * w + k);
    return {
      key: `we-rect-${w}-${k}`,
      prompt: `A rectangle is ${k} cm longer than wide. Perimeter ${P} cm. Width?`,
      speech: `A rectangle's length is ${k} centimeters more than its width. Its perimeter is ${P} centimeters. What is its width?`,
      visual: { kind: "rect", w: w + k, h: w, showW: false, showH: false, grid: false, unit: "cm", inside: `P = ${P} cm` },
      ...keypad(w),
      unit: "cm",
      hint: `Width w, length w + ${k}. Perimeter: 2w + 2(w + ${k}) = ${P}.`,
      explain: `4w + ${2 * k} = ${P} → 4w = ${P - 2 * k} → w = ${w} cm.`,
    };
  }
  if (kind === 3) {
    const g = rand(2, 12);
    const d = rand(2, 6);
    const b = d + rand(2, 6);
    const a = rand(2, 8) * 5;
    const c = a + (b - d) * g;
    return {
      key: `we-plans-${a}-${b}-${c}-${d}`,
      prompt: `Plan A: $${a} + $${b} per GB. Plan B: $${c} + $${d} per GB. Equal at how many GB?`,
      speech: `Plan A costs ${a} dollars plus ${b} dollars per gigabyte. Plan B costs ${c} dollars plus ${d} dollars per gigabyte. At how many gigabytes do they cost the same?`,
      visual: NONE,
      ...keypad(g),
      hint: `Set the costs equal: ${a} + ${b}g = ${c} + ${d}g.`,
      explain: `${a} + ${b}g = ${c} + ${d}g → ${b - d}g = ${c - a} → g = ${g}.`,
    };
  }
  const F = rand(3, 12) * 5;
  const m = rand(3, 9) * 5;
  const h = rand(2, 8);
  const T = F + m * h;
  return {
    key: `we-pick-${F}-${m}-${h}`,
    prompt: `A plumber charges $${F} plus $${m} an hour. The bill is $${T}. Which equation?`,
    speech: `A plumber charges ${F} dollars plus ${m} dollars an hour. The bill is ${T} dollars. Which equation finds the hours, h?`,
    visual: NONE,
    ...label(`${F} + ${m}h = ${T}`, [`${m} + ${F}h = ${T}`, `${F}h + ${m}h = ${T}`, `${F} + ${m} + h = ${T}`, `${m}h − ${F} = ${T}`]),
    hint: "The one-time charge is added once. The hourly charge is multiplied by the hours.",
    explain: `$${F} once plus $${m} for each of h hours: ${F} + ${m}h = ${T}. (It gives h = ${h}.)`,
  };
}

const FORMULAS: { f: string; v: string; ok: string; bad: string[] }[] = [
  { f: "d = rt", v: "t", ok: "t = d/r", bad: ["t = dr", "t = r/d", "t = d − r"] },
  { f: "d = rt", v: "r", ok: "r = d/t", bad: ["r = dt", "r = t/d", "r = d − t"] },
  { f: "A = lw", v: "w", ok: "w = A/l", bad: ["w = Al", "w = l/A", "w = A − l"] },
  { f: "P = 2l + 2w", v: "l", ok: "l = (P − 2w)/2", bad: ["l = P − w", "l = P/2 − 2w", "l = (P + 2w)/2"] },
  { f: "y = mx + b", v: "x", ok: "x = (y − b)/m", bad: ["x = y/m − b", "x = (y + b)/m", "x = m(y − b)"] },
  { f: "y = mx + b", v: "b", ok: "b = y − mx", bad: ["b = y + mx", "b = mx − y", "b = y/(mx)"] },
  { f: "A = bh/2", v: "h", ok: "h = 2A/b", bad: ["h = A/(2b)", "h = 2b/A", "h = A − b/2"] },
  { f: "V = πr²h", v: "h", ok: "h = V/(πr²)", bad: ["h = Vπr²", "h = πr²/V", "h = V − πr²"] },
  { f: "C = 2πr", v: "r", ok: "r = C/(2π)", bad: ["r = 2πC", "r = C − 2π", "r = 2π/C"] },
  { f: "I = Prt", v: "r", ok: "r = I/(Pt)", bad: ["r = IPt", "r = Pt/I", "r = I − Pt"] },
  { f: "F = 9C/5 + 32", v: "C", ok: "C = 5(F − 32)/9", bad: ["C = 5F/9 − 32", "C = 9(F − 32)/5", "C = 5(F + 32)/9"] },
  { f: "ax + by = c", v: "y", ok: "y = (c − ax)/b", bad: ["y = (c + ax)/b", "y = b(c − ax)", "y = c/b − ax"] },
  { f: "E = mc²", v: "m", ok: "m = E/c²", bad: ["m = Ec²", "m = c²/E", "m = E − c²"] },
  { f: "v = u + at", v: "a", ok: "a = (v − u)/t", bad: ["a = (v + u)/t", "a = t(v − u)", "a = v/t − u"] },
];

/** HSA-CED.A.4 — rearrange formulas to highlight a quantity. */
export function rearrangeFormulas(): Question {
  if (Math.random() < 0.6) {
    const F = pick(FORMULAS);
    return {
      key: `rf-${F.f}-${F.v}`,
      prompt: `Solve ${F.f} for ${F.v}.`,
      speech: talk(`Solve ${F.f} for ${F.v}.`),
      visual: NONE,
      ...label(F.ok, F.bad),
      hint: `Undo what's being done to ${F.v}, in reverse order, on both sides.`,
      explain: `Undoing each step around ${F.v} gives ${F.ok}.`,
    };
  }
  const kind = rand(0, 2);
  if (kind === 0) {
    const r = rand(4, 12) * 5;
    const t = rand(2, 9);
    return {
      key: `rf-n-dt-${r}-${t}`,
      prompt: `Use d = rt. A car drives ${r * t} km at ${r} km/h. How many hours?`,
      speech: `Use d equals r t. A car drives ${r * t} kilometers at ${r} kilometers per hour. How many hours does it take?`,
      visual: NONE,
      ...keypad(t),
      unit: "h",
      hint: "Rearrange first: t = d/r.",
      explain: `t = d/r = ${r * t} ÷ ${r} = ${t} hours.`,
    };
  }
  if (kind === 1) {
    const w = rand(2, 15);
    const l = rand(w + 1, 25);
    const P = 2 * l + 2 * w;
    return {
      key: `rf-n-p-${w}-${l}`,
      prompt: `P = 2l + 2w. If P = ${P} and w = ${w}, what is l?`,
      speech: `P equals 2 l plus 2 w. If P is ${P} and w is ${w}, what is l?`,
      visual: NONE,
      ...keypad(l),
      hint: "Rearrange: l = (P − 2w)/2.",
      explain: `l = (${P} − ${2 * w}) ÷ 2 = ${l}.`,
    };
  }
  const b = rand(2, 12) * 2;
  const h = rand(2, 15);
  const A = (b * h) / 2;
  return {
    key: `rf-n-tri-${b}-${h}`,
    prompt: `A = bh/2. A triangle has area ${A} and base ${b}. Height?`,
    speech: `A equals b h over 2. A triangle has area ${A} and base ${b}. What is its height?`,
    visual: { kind: "polygon", shape: "triangle", base: b, height: h, unit: "cm" },
    ...keypad(h),
    hint: "Rearrange: h = 2A/b.",
    explain: `h = 2 × ${A} ÷ ${b} = ${h}.`,
  };
}

const flip: Record<string, string> = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };

/** HSA-REI.B.3, HSA-CED.A.1 — solve and use linear inequalities. */
export function linearInequalities(): Question {
  const kind = rand(0, 3);
  const op = pick(["<", ">", "≤", "≥"]);
  if (kind === 0) {
    const a = nz(-6, 6, 1, -1);
    const k = rand(-8, 8);
    const b = nz(-10, 10);
    const c = a * k + b;
    const res = a < 0 ? flip[op] : op;
    const text = `${lin(a, b)} ${op} ${ds(c)}`;
    return {
      key: `li-solve-${a}-${b}-${k}-${op}`,
      prompt: `Solve ${text}.`,
      speech: talk(`Solve ${text}.`),
      visual: NONE,
      ...label(`x ${res} ${ds(k)}`, [`x ${flip[res]} ${ds(k)}`, `x ${res} ${ds(-k)}`, `x ${flip[res]} ${ds(-k)}`, `x ${res} ${ds(k + 1)}`]),
      hint: a < 0 ? "Solve like an equation, but dividing by a negative number flips the sign." : "Solve like an equation. Dividing by a positive number keeps the sign.",
      explain: `${lin(a, 0)} ${op} ${ds(c - b)}. Divide by ${a}${a < 0 ? " and flip the sign" : ""}: x ${res} ${ds(k)}.`,
    };
  }
  if (kind === 1) {
    const p = rand(3, 12);
    const f = rand(2, 15);
    const n = rand(2, 9);
    const M = f + p * n + rand(0, p - 1);
    return {
      key: `li-tickets-${p}-${f}-${M}`,
      prompt: `You have $${M}. Tickets are $${p} each plus a $${f} fee. Most tickets?`,
      speech: `You have ${M} dollars. Tickets cost ${p} dollars each, plus one ${f} dollar booking fee. What's the greatest number of tickets you can buy?`,
      visual: NONE,
      ...keypad(n),
      hint: `Solve ${p}t + ${f} ≤ ${M}. You can only buy whole tickets.`,
      explain: `${p}t ≤ ${M - f}, so t ≤ ${ds((M - f) / p)}. The most whole tickets is ${n}.`,
    };
  }
  if (kind === 2) {
    const a = nz(-5, 5, 1, -1);
    const k = rand(-6, 6);
    const b = nz(-9, 9);
    const c = a * k + b;
    const res = a < 0 ? flip[op] : op;
    const strict = res === "<" || res === ">";
    const up = res === ">" || res === "≥";
    const good = up ? k + (strict ? rand(1, 3) : rand(0, 2)) : k - (strict ? rand(1, 3) : rand(0, 2));
    const bad = up ? [k - 1, k - 2, k - 3, ...(strict ? [k] : [])] : [k + 1, k + 2, k + 3, ...(strict ? [k] : [])];
    const text = `${lin(a, b)} ${op} ${ds(c)}`;
    return {
      key: `li-which-${a}-${b}-${k}-${op}-${good}`,
      prompt: `Which value of x is a solution of ${text}?`,
      speech: talk(`Which value of x makes ${text} true?`),
      visual: NONE,
      answer: good,
      input: "choices",
      choices: shuffle([good, ...shuffle(bad).slice(0, 3)]),
      hint: "Solve the inequality first, or test each choice in it.",
      explain: `Solving gives x ${res} ${ds(k)}, so x = ${ds(good)} works.`,
    };
  }
  const goal = pick([60, 70, 80, 90, 100]);
  const have = rand(20, goal - 20);
  const q = pick([4, 5, 6, 8]);
  const n = Math.ceil((goal - have) / q);
  return {
    key: `li-least-${goal}-${have}-${q}`,
    prompt: `You need at least ${goal} points. You have ${have}; each task is ${q}. Fewest tasks?`,
    speech: `You need at least ${goal} points. You have ${have}, and each task is worth ${q} points. What's the fewest tasks you must do?`,
    visual: NONE,
    ...keypad(n),
    hint: `Solve ${have} + ${q}t ≥ ${goal}, then round up to a whole task.`,
    explain: `${q}t ≥ ${goal - have}, so t ≥ ${ds((goal - have) / q)}. The fewest whole tasks is ${n}.`,
  };
}

/** HSN-Q.A.1, HSN-Q.A.2, HSN-Q.A.3 — units, choosing quantities, sensible accuracy. */
export function unitsAndAccuracy(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const v = pick([18, 36, 54, 72, 90, 108, 126, 144]);
    return {
      key: `ua-speed-${v}`,
      prompt: `Convert ${v} km/h to meters per second.`,
      speech: `Convert ${v} kilometers per hour to meters per second.`,
      visual: NONE,
      ...keypad(v / 3.6),
      unit: "m/s",
      hint: "1 km = 1000 m and 1 hour = 3600 s. Multiply by 1000, divide by 3600.",
      explain: `${v} km/h × 1000 m/km ÷ 3600 s/h = ${v / 3.6} m/s. The km and h units cancel.`,
    };
  }
  if (kind === 1) {
    const [rate, per, out, wrong] = pick([
      ["L/min", "min", "L", ["L/min", "min/L", "L·min"]],
      ["km/h", "h", "km", ["km/h", "h/km", "km·h"]],
      ["$/kg", "kg", "$", ["$/kg", "kg/$", "$·kg"]],
      ["words/min", "min", "words", ["words/min", "min/word", "words·min"]],
      ["m/s", "s", "m", ["m/s", "s/m", "m·s"]],
    ] as [string, string, string, string[]][]);
    const r = rand(3, 40);
    const t = rand(2, 30);
    return {
      key: `ua-unit-${rate}-${r}-${t}`,
      prompt: `${r} ${rate} × ${t} ${per}. What unit is the answer in?`,
      speech: `You multiply ${r} ${rate.replace("/", " per ")} by ${t} ${per}. What unit is the answer in?`,
      visual: NONE,
      ...label(out, wrong),
      hint: "Treat units like numbers: a unit on the bottom cancels the same unit on top.",
      explain: `(${rate}) × ${per}: the ${per} cancels, leaving ${out}. The answer is ${r * t} ${out}.`,
    };
  }
  if (kind === 2) {
    const price = pick([3, 4, 5]);
    const mpg = pick([20, 25, 40, 50]);
    const cents = (100 * price) / mpg;
    return {
      key: `ua-cost-${price}-${mpg}`,
      prompt: `Gas is $${price} a gallon. A car gets ${mpg} miles per gallon. Cents per mile?`,
      speech: `Gas costs ${price} dollars a gallon, and a car goes ${mpg} miles per gallon. How many cents does each mile cost?`,
      visual: NONE,
      ...keypad(cents),
      unit: "¢",
      hint: "Dollars per gallon ÷ miles per gallon = dollars per mile. Then change dollars to cents.",
      explain: `$${price}/gal ÷ ${mpg} mi/gal = $${ds(price / mpg)} per mile = ${ds(cents)}¢ per mile.`,
    };
  }
  if (kind === 3) {
    const [what, ok, bad] = pick([
      ["how crowded two cities are", "people per km²", ["total people", "area in km²", "number of streets"]],
      ["two cars' fuel use", "miles per gallon", ["gallons in the tank", "top speed", "total miles driven"]],
      ["how fast two runners are", "meters per second", ["meters run", "seconds run", "steps taken"]],
      ["two cereal box deals", "price per ounce", ["box price", "box weight", "number of boxes"]],
      ["two factories' output", "items per hour", ["total items", "hours worked", "number of workers"]],
      ["two phone batteries", "hours per full charge", ["battery weight", "price", "screen size"]],
    ] as [string, string, string[]][]);
    return {
      key: `ua-pick-${what}`,
      prompt: `Which quantity best compares ${what}?`,
      speech: `Which quantity is best for comparing ${what}?`,
      visual: NONE,
      ...label(ok, bad),
      hint: "A fair comparison is usually a rate: one amount per one unit of another.",
      explain: `${cap(ok)} is a rate, so it compares fairly no matter the size.`,
    };
  }
  if (Math.random() < 0.5) {
    const total = pick([100, 50, 200, 10, 20]);
    const people = pick([3, 6, 7]);
    const exact = total / people;
    const ok = `$${exact.toFixed(2)}`;
    return {
      key: `ua-acc-money-${total}-${people}`,
      prompt: `Split $${total} equally among ${people} people. Each share is about…`,
      speech: `You split ${total} dollars equally among ${people} people. What's a sensible amount for each share?`,
      visual: NONE,
      ...label(ok, [`$${exact.toFixed(6)}`, `$${Math.round(exact / 10) * 10 || 1}`, `$${(exact * 10).toFixed(2)}`]),
      hint: "Money only goes down to cents: two decimal places.",
      explain: `${total} ÷ ${people} = ${exact.toFixed(5)}…, and money rounds to cents: ${ok}.`,
    };
  }
  let mm = rand(101, 299);
  while (mm % 10 === 0) mm = rand(101, 299);
  const cm = mm / 10;
  return {
    key: `ua-acc-len-${mm}`,
    prompt: "A ruler is marked in millimeters. Which pencil length makes sense?",
    speech: "A ruler is marked in millimeters. Which measured pencil length is sensible?",
    visual: { kind: "ruler", length: Math.round(cm), unit: "cm", emoji: "✏️" },
    ...label(`${cm} cm`, [`${cm}${rand(1, 9)}${rand(1, 9)}${rand(1, 9)} cm`, `${cm} m`, `${Math.round(cm / 10) * 10 || 10} km`]),
    hint: "You can't read a ruler more precisely than its smallest marks.",
    explain: `Millimeter marks give lengths to the nearest 0.1 cm, so ${cm} cm is sensible.`,
  };
}

/** HSA-REI.A.1, 8.EE.C.7b — find the wrong step in a worked solution. */
export function spotTheMistake(): Question {
  const form = rand(0, 1);
  const bad = rand(1, 4); // 4 = no mistake
  const x0 = nz(-8, 9);
  let start: string;
  let steps: string[];
  let fixes: string[];
  if (form === 0) {
    const a = rand(2, 6);
    const b = nz(-7, 9);
    const c = a * (x0 + b);
    start = `${a}(x ${signed$(b)}) = ${ds(c)}`;
    const good = [`${lin(a, a * b)} = ${ds(c)}`, `${a}x = ${ds(c - a * b)}`, `x = ${ds(x0)}`];
    const wrong = [
      [`${lin(a, b)} = ${ds(c)}`, `${a}x = ${ds(c - b)}`, `x = ${fracStr(c - b, a)}`],
      [good[0], `${a}x = ${ds(c + a * b)}`, `x = ${fracStr(c + a * b, a)}`],
      [good[0], good[1], `x = ${ds(c - a * b - a === x0 ? -x0 : c - a * b - a)}`],
    ];
    steps = bad === 4 ? good : wrong[bad - 1];
    fixes = good;
  } else {
    const a = rand(3, 9);
    const c = rand(1, a - 1);
    const b = nz(-9, 9);
    const d = (a - c) * x0 + b;
    start = `${lin(a, b)} = ${lin(c, d)}`;
    const good = [`${lin(a - c, b)} = ${ds(d)}`, `${lin(a - c, 0)} = ${ds(d - b)}`, `x = ${ds(x0)}`];
    const wrong = [
      [`${lin(a + c, b)} = ${ds(d)}`, `${lin(a + c, 0)} = ${ds(d - b)}`, `x = ${fracStr(d - b, a + c)}`],
      [good[0], `${lin(a - c, 0)} = ${ds(d + b)}`, `x = ${fracStr(d + b, a - c)}`],
      [good[0], good[1], `x = ${ds(d - b - (a - c) === x0 ? -x0 : d - b - (a - c))}`],
    ];
    steps = bad === 4 ? good : wrong[bad - 1];
    fixes = good;
  }
  const correct = bad === 4 ? "No mistake" : `Step ${bad}`;
  return {
    key: `sm-${form}-${start}-${bad}`,
    prompt: `Solve ${start}. Which step has a mistake?`,
    speech: talk(`Here's a solution to ${start}. Which step has a mistake, if any?`),
    visual: { kind: "table", header: ["Step", "Work"], rows: [["start", start], ...steps.map((s, i) => [String(i + 1), s])] },
    needsVisual: true,
    ...label(correct, ["Step 1", "Step 2", "Step 3", "No mistake"].filter((s) => s !== correct)),
    hint: "Check each line against the one above it. Did the same thing happen to both sides?",
    explain:
      bad === 4
        ? `Every step is right: ${fixes.join(", then ")}.`
        : `Step ${bad} is wrong. It should be ${fixes[bad - 1]}${bad < 3 ? `, and the answer is x = ${ds(x0)}` : ""}.`,
  };
}

/** HSA-REI.B.3 — read and use inequalities shown on a number line. */
export function graphedInequalities(): Question {
  const kind = rand(0, 2);
  const k = rand(-6, 6);
  const dir = pick(["left", "right"] as const);
  const open = Math.random() < 0.5;
  const op = dir === "right" ? (open ? ">" : "≥") : open ? "<" : "≤";
  const line: Visual = { kind: "numberline", min: k - 5, max: k + 5, step: 1, labelStep: 1, from: k, to: k, ray: { at: k, dir, open } };
  if (kind === 0) {
    return {
      key: `gi-read-${k}-${dir}-${open}`,
      prompt: "Which inequality does the number line show?",
      speech: "Which inequality does the number line show?",
      visual: line,
      needsVisual: true,
      ...label(`x ${op} ${ds(k)}`, [`x ${flip[op]} ${ds(k)}`, `x ${open ? (op === ">" ? "≥" : "≤") : op === "≥" ? ">" : "<"} ${ds(k)}`, `x ${op} ${ds(-k || k + 1)}`]),
      hint: "An open dot means the number itself is not included. The shading shows which way the solutions go.",
      explain: `The dot at ${ds(k)} is ${open ? "open (not included)" : "closed (included)"} and the shading goes ${dir}, so x ${op} ${ds(k)}.`,
    };
  }
  if (kind === 1) {
    const inside = dir === "right" ? k + rand(open ? 1 : 0, 4) : k - rand(open ? 1 : 0, 4);
    const outside = shuffle(dir === "right" ? [k - 1, k - 2, k - 3, k - 4, ...(open ? [k] : [])] : [k + 1, k + 2, k + 3, k + 4, ...(open ? [k] : [])]).slice(0, 3);
    return {
      key: `gi-in-${k}-${dir}-${open}-${inside}`,
      prompt: "Which number is a solution shown on the graph?",
      speech: "Which number is one of the solutions shown on the number line?",
      visual: { ...line, to: inside } as Visual,
      needsVisual: true,
      answer: inside,
      input: "choices",
      choices: shuffle([inside, ...outside]),
      hint: "Solutions are in the shaded part. Check whether the dot itself counts.",
      explain: `The graph shows x ${op} ${ds(k)}, and ${ds(inside)} is in the shaded part.`,
    };
  }
  const a = nz(-5, 5, 1, -1);
  const b = nz(-9, 9);
  const opIn = a < 0 ? flip[op] : op;
  const text = `${lin(a, b)} ${opIn} ${ds(a * k + b)}`;
  const match = Math.random() < 0.5;
  const shownDir = match ? dir : dir === "left" ? "right" : "left";
  return {
    key: `gi-match-${a}-${b}-${k}-${op}-${match}`,
    prompt: `Does this graph show the solutions of ${text}?`,
    speech: talk(`Does the number line show the solutions of ${text}?`),
    visual: { kind: "numberline", min: k - 5, max: k + 5, step: 1, labelStep: 1, from: k, to: k, ray: { at: k, dir: shownDir, open } },
    needsVisual: true,
    ...yesNo(match),
    hint: "Solve the inequality first. Remember to flip the sign if you divide by a negative.",
    explain: match
      ? `Solving gives x ${op} ${ds(k)}, which matches the graph.`
      : `Solving gives x ${op} ${ds(k)}, but the graph is shaded the other way.`,
  };
}

/* ============================================================== 3. Lines & slope */

const RATE_CTX = [
  { x: "hours", y: "dollars", per: "dollars per hour" },
  { x: "minutes", y: "liters", per: "liters per minute" },
  { x: "gallons", y: "miles", per: "miles per gallon" },
  { x: "days", y: "pages", per: "pages per day" },
  { x: "seconds", y: "meters", per: "meters per second" },
];

/** A proportional graph y = r·x on a first-quadrant window, with one labelled point. */
function rateGraph(r: number, k: number, label?: string): Visual {
  return graph([0, 6], [0, 6 * r], { curves: [{ fn: lineFn(r, 0), colour: "wave" }], points: [{ x: k, y: k * r, label: label ?? pt(k, k * r) }] });
}

/** 8.EE.B.5 — slope as a unit rate; compare proportional relationships. */
export function unitRateSlope(): Question {
  const kind = rand(0, 3);
  const c = pick(RATE_CTX);
  const r = rand(2, 12);
  const k = rand(2, 5);
  if (kind === 0) {
    return {
      key: `ur-graph-${c.x}-${r}-${k}`,
      prompt: `The graph shows ${c.y} vs ${c.x}. How many ${c.per}?`,
      speech: `The graph shows ${c.y} against ${c.x}. What is the unit rate, in ${c.per}?`,
      visual: rateGraph(r, k),
      needsVisual: true,
      ...keypad(r),
      hint: "The slope is the unit rate: how much y goes up when x goes up by 1.",
      explain: `The point ${pt(k, k * r)} means ${k * r} ${c.y} in ${k} ${c.x}: ${k * r} ÷ ${k} = ${r} ${c.per}. That's the slope.`,
    };
  }
  if (kind <= 2) {
    const r2 = nz(2, 12, r);
    const diff = Math.abs(r - r2);
    const ask = kind === 1;
    return {
      key: `ur-cmp-${kind}-${c.x}-${r}-${r2}-${k}`,
      prompt: ask ? `A is the graph. B is y = ${r2}x. Which has the greater rate?` : `A is the graph. B is y = ${r2}x. How much greater is the bigger rate?`,
      speech: `Relationship A is shown on the graph, with ${c.y} against ${c.x}. Relationship B is y equals ${r2} x. ${ask ? "Which has the greater unit rate?" : "By how many " + c.per + " is the bigger rate greater?"}`,
      visual: rateGraph(r, k),
      needsVisual: true,
      ...(ask ? yesNo(r > r2, "A (the graph)", "B (the equation)") : keypad(diff)),
      hint: "Find A's unit rate from the labelled point. B's unit rate is the number in front of x.",
      explain: `A's rate is ${k * r} ÷ ${k} = ${r}; B's is ${r2}. ${r > r2 ? "A" : "B"} is greater, by ${diff} ${c.per}.`,
    };
  }
  const xs = sorted(distinct(3, 2, 9));
  return {
    key: `ur-table-${c.x}-${r}-${xs.join(".")}`,
    prompt: `This table is proportional. How many ${c.per}?`,
    speech: `This table shows a proportional relationship between ${c.x} and ${c.y}. What is the unit rate, in ${c.per}?`,
    visual: { kind: "table", header: [c.x, c.y], rows: xs.map((x) => [x, x * r]) },
    needsVisual: true,
    ...keypad(r),
    hint: `Divide any ${c.y} value by its ${c.x} value.`,
    explain: `${xs[0] * r} ÷ ${xs[0]} = ${r}. Every row gives the same rate: ${r} ${c.per}.`,
  };
}

/** A line with slope p/q and intercept b that hits at least two lattice points in [−6, 6]. Returns two of them. */
function latticeLine(): { p: number; q: number; b: number; pts: [number, number][] } {
  for (;;) {
    const q = rand(1, 4);
    const p = nz(-4, 4);
    if (gcd(p, q) !== 1) continue;
    const b = rand(-4, 4);
    const pts: [number, number][] = [];
    for (let j = -6; j <= 6; j++) {
      const x = j * q;
      const y = b + j * p;
      if (Math.abs(x) <= 5 && Math.abs(y) <= 5) pts.push([x, y]);
    }
    if (pts.length >= 2) {
      const [a, c] = shuffle(pts).slice(0, 2).sort((u, v) => u[0] - v[0]);
      return { p, q, b, pts: [a, c] };
    }
  }
}

/** 8.F.B.4, 8.EE.B.6 — read slope and intercept from a graph. */
export function slopeFromGraph(): Question {
  const { p, q, b, pts } = latticeLine();
  const [[x1, y1], [x2, y2]] = pts;
  const kind = rand(0, 2);
  if (kind <= 1) {
    const m = fracStr(p, q);
    return {
      key: `sg-slope-${p}-${q}-${b}-${x1}-${x2}`,
      prompt: pick(["What is the slope of this line?", "Find the slope: rise over run."]),
      speech: "What is the slope of the line on the graph?",
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(p / q, b), colour: "berry" }], points: [{ x: x1, y: y1, label: pt(x1, y1) }, { x: x2, y: y2, label: pt(x2, y2) }] }),
      needsVisual: true,
      ...label(m, [fracStr(q, p), fracStr(-p, q), fracStr(-q, p), fracStr(p + 1, q), fracStr(p, q + 1)]),
      hint: "From one marked point to the other: how far up or down (rise), and how far right (run)? Slope = rise ÷ run.",
      explain: `Rise ${ds(y2 - y1)}, run ${ds(x2 - x1)}: slope = ${ds(y2 - y1)}/${ds(x2 - x1)}${m === `${ds(y2 - y1)}/${ds(x2 - x1)}` ? "" : ` = ${m}`}. ${p > 0 ? "It goes up to the right." : "It goes down to the right."}`,
    };
  }
  return {
    key: `sg-int-${p}-${q}-${b}`,
    prompt: "Where does this line cross the y-axis? (the y-intercept)",
    speech: "What is the y-intercept of the line on the graph?",
    visual: graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(p / q, b), colour: "berry" }] }),
    needsVisual: true,
    ...choose(b, [-b, p, b + 1, b - 1]),
    hint: "Find where the line crosses the vertical axis, where x = 0.",
    explain: `The line crosses the y-axis at ${pt(0, b)}, so the y-intercept is ${ds(b)}.`,
  };
}

/** 8.F.B.4, 8.EE.B.6 — slope from two points or a table; rate of change and initial value. */
export function slopeFromPoints(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const x1 = rand(-9, 9);
    const x2 = nz(-9, 9, x1);
    const y1 = rand(-9, 9);
    const y2 = rand(-9, 9);
    const dy = y2 - y1;
    const dx = x2 - x1;
    const m = fracStr(dy, dx);
    const wrong = [fracStr(-dy, dx), fracStr(y2 + y1, dx), dy !== 0 ? fracStr(dx, dy) : "1", fracStr(dy + 1, dx)];
    return {
      key: `sp-two-${x1}-${y1}-${x2}-${y2}`,
      prompt: `Find the slope of the line through ${pt(x1, y1)} and ${pt(x2, y2)}.`,
      speech: talk(`Find the slope of the line through ${pt(x1, y1)} and ${pt(x2, y2)}.`),
      visual: NONE,
      ...label(m, wrong),
      hint: "Slope = (change in y) ÷ (change in x). Subtract in the same order on top and bottom.",
      explain: `(${ds(y2)} − ${ds(y1)}) ÷ (${ds(x2)} − ${ds(x1)}) = ${ds(dy)}/${ds(dx)} = ${m}.`,
    };
  }
  const m = nz(-5, 5);
  const b = rand(-9, 9);
  if (kind <= 2) {
    const xs = [1, 2, 3, 4];
    const askRate = kind === 1;
    return {
      key: `sp-table-${kind}-${m}-${b}`,
      prompt: askRate ? "This table is linear. What is the rate of change?" : "This table is linear. What is the initial value (y at x = 0)?",
      speech: askRate ? "The table shows a linear function. What is its rate of change?" : "The table shows a linear function. What is its initial value, the y value when x is 0?",
      visual: { kind: "table", header: ["x", "y"], rows: xs.map((x) => [x, m * x + b]) },
      needsVisual: true,
      ...signed(askRate ? m : b),
      hint: askRate ? "How much does y change each time x goes up by 1?" : "Work backwards one step from x = 1 to x = 0: undo one rate of change.",
      explain: `y changes by ${ds(m)} each step, so the rate is ${ds(m)}. Going back from x = 1: ${ds(m + b)} − (${ds(m)}) = ${ds(b)}, the initial value.`,
    };
  }
  const x1 = rand(-4, 4);
  const y1 = rand(-6, 6);
  const x2 = nz(-6, 8, x1);
  const ans = y1 + m * (x2 - x1);
  return {
    key: `sp-step-${m}-${x1}-${y1}-${x2}`,
    prompt: `A line has slope ${ds(m)} and goes through ${pt(x1, y1)}. Find y when x = ${ds(x2)}.`,
    speech: talk(`A line has slope ${ds(m)} and passes through ${pt(x1, y1)}. What is y when x is ${ds(x2)}?`),
    visual: NONE,
    ...signed(ans),
    hint: "Each step of 1 to the right changes y by the slope. How many steps from the known point?",
    explain: `x moves ${ds(x2 - x1)}, so y changes by ${ds(m)} × ${ds(x2 - x1)} = ${ds(m * (x2 - x1))}: y = ${ds(ans)}.`,
  };
}

/** 8.EE.B.6 — similar slope triangles give the same slope anywhere on a line; y = mx through the origin. */
export function slopeTriangles(): Question {
  const kind = rand(0, 3);
  const r = rand(1, 3);
  const s = rand(1, 3);
  const k = rand(2, 3);
  const b0 = rand(0, 2);
  const m = r / s;
  const big = [s, b0 + r];
  const tri = (x0: number, y0: number, run: number, rise: number) => [
    { from: [x0, y0] as [number, number], to: [x0 + run, y0] as [number, number], colour: "tangerine" as const, dashed: true },
    { from: [x0 + run, y0] as [number, number], to: [x0 + run, y0 + rise] as [number, number], colour: "tangerine" as const, dashed: true },
  ];
  const vis = graph([0, 12], [0, 14], {
    curves: [{ fn: lineFn(m, b0), colour: "wave" }],
    lines: [...tri(0, b0, s, r), ...tri(big[0], big[1], k * s, k * r)],
  });
  if (kind === 0) {
    return {
      key: `tr-rise-${r}-${s}-${k}-${b0}`,
      prompt: `Small triangle: rise ${r}, run ${s}. Big one: run ${k * s}. What is its rise?`,
      speech: `Two slope triangles sit on the same line. The small one has rise ${r} and run ${s}. The big one has run ${k * s}. What is its rise?`,
      visual: vis,
      ...keypad(k * r),
      hint: "The triangles are similar, so rise ÷ run is the same for both.",
      explain: `${r}/${s} = ?/${k * s}. The run is ${k} times bigger, so the rise is ${k} × ${r} = ${k * r}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `tr-run-${r}-${s}-${k}-${b0}`,
      prompt: `Small triangle: rise ${r}, run ${s}. Big one: rise ${k * r}. What is its run?`,
      speech: `Two slope triangles sit on the same line. The small one has rise ${r} and run ${s}. The big one has rise ${k * r}. What is its run?`,
      visual: vis,
      ...keypad(k * s),
      hint: "Rise ÷ run must match the small triangle.",
      explain: `${r}/${s} = ${k * r}/?, so the run is ${k} × ${s} = ${k * s}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `tr-why-${r}-${s}-${k}`,
      prompt: "Why do both slope triangles give the same slope?",
      speech: "Why do any two slope triangles on the same line give the same slope?",
      visual: vis,
      ...label("They are similar triangles", ["They are congruent", "They have the same area", "They both touch the y-axis"]),
      hint: "Compare the angles of the two triangles. One side is horizontal, one vertical, and the third lies on the same line.",
      explain: "Both triangles have the same angles, so they're similar: their sides are in the same ratio, and rise ÷ run is the same.",
    };
  }
  const X = k * s * rand(1, 2);
  return {
    key: `tr-origin-${r}-${s}-${X}`,
    prompt: `A line through the origin goes through ${pt(s, r)}. Find y when x = ${X}.`,
    speech: `A line through the origin passes through ${pt(s, r)}. What is y when x is ${X}?`,
    visual: graph([0, 12], [0, 12], { curves: [{ fn: lineFn(m, 0), colour: "wave" }], points: [{ x: s, y: r, label: pt(s, r) }] }),
    ...keypad((r * X) / s),
    hint: `The line is y = mx with m = ${r}/${s}. Or scale up the triangle from the origin.`,
    explain: `y = (${r}/${s})x, so y = ${r}/${s} × ${X} = ${ds((r * X) / s)}.`,
  };
}

/** Slopes that make lines easy to draw on a grid. */
const NICE_SLOPES: [number, number][] = [[1, 1], [2, 1], [3, 1], [-1, 1], [-2, 1], [-3, 1], [1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [-2, 3], [3, 2], [-3, 2]];

/** 8.EE.B.6, 8.F.B.4, HSF-IF.C.7a, HSA-CED.A.2 — slope-intercept form. */
export function slopeIntercept(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [p, q] = pick(NICE_SLOPES);
    const b = nz(-4, 4);
    const pts: [number, number][] = [];
    for (let j = -6; j <= 6; j++) if (Math.abs(j * q) <= 5 && Math.abs(b + j * p) <= 5) pts.push([j * q, b + j * p]);
    return {
      key: `si-graph-${p}-${q}-${b}`,
      prompt: "Which equation matches the graph?",
      speech: "Which equation matches the line on the graph?",
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(p / q, b), colour: "grape" }], points: pts.slice(0, 3).map(([x, y]) => ({ x, y })) }),
      needsVisual: true,
      ...label(`y = ${linFrac(p, q, b)}`, [`y = ${linFrac(-p, q, b)}`, `y = ${linFrac(p, q, -b)}`, `y = ${linFrac(q, p, b)}`, `y = ${linFrac(p, q, b + 1)}`]),
      hint: "Read b where the line crosses the y-axis. Then count rise over run between two grid points for m.",
      explain: `It crosses the y-axis at ${ds(b)} and has slope ${fracStr(p, q)}, so y = ${linFrac(p, q, b)}.`,
    };
  }
  if (kind === 1) {
    const m = nz(-5, 5);
    const x1 = nz(-5, 5);
    const b = rand(-9, 9);
    const y1 = m * x1 + b;
    return {
      key: `si-b-${m}-${x1}-${b}`,
      prompt: `A line has slope ${ds(m)} and passes through ${pt(x1, y1)}. What is b?`,
      speech: talk(`A line has slope ${ds(m)} and passes through ${pt(x1, y1)}. In y = mx + b, what is b?`),
      equation: [y1, "=", m, "×", "(", x1, ")", "+", "?"],
      visual: NONE,
      ...signed(b),
      hint: "Put the point and the slope into y = mx + b, then solve for b.",
      explain: `${ds(y1)} = ${ds(m)} × ${pa(x1)} + b = ${ds(m * x1)} + b, so b = ${ds(b)}.`,
    };
  }
  if (kind === 2) {
    const m = nz(-4, 4);
    const b = rand(-6, 6);
    const x1 = rand(-3, 1);
    const x2 = x1 + rand(1, 3);
    return {
      key: `si-two-${m}-${b}-${x1}-${x2}`,
      prompt: `Which line passes through ${pt(x1, m * x1 + b)} and ${pt(x2, m * x2 + b)}?`,
      speech: talk(`Which line passes through ${pt(x1, m * x1 + b)} and ${pt(x2, m * x2 + b)}?`),
      visual: NONE,
      ...label(`y = ${lin(m, b)}`, [`y = ${lin(-m, b)}`, `y = ${lin(m, -b)}`, `y = ${lin(m, b + m)}`, `y = ${lin(b || 1, m)}`]),
      hint: "Find the slope from the two points first. Then use one point to find b.",
      explain: `Slope = ${ds(m * (x2 - x1))} ÷ ${x2 - x1} = ${ds(m)}. Then ${ds(m * x1 + b)} = ${ds(m)} × ${pa(x1)} + b gives b = ${ds(b)}: y = ${lin(m, b)}.`,
    };
  }
  if (kind === 3) {
    const m = nz(-5, 5);
    const b = rand(-6, 6);
    const b2 = nz(-9, 9, b);
    return {
      key: `si-par-${m}-${b}-${b2}`,
      prompt: `Which line is parallel to y = ${lin(m, b)}?`,
      speech: talk(`Which line is parallel to y = ${lin(m, b)}?`),
      visual: NONE,
      ...label(`y = ${lin(m, b2)}`, [`y = ${lin(-m, b)}`, `y = ${linFrac(-1, m, b)}`, `y = ${lin(m + 1, b)}`, `y = ${lin(2 * m, b2)}`]),
      hint: "Parallel lines never meet, so they rise at the same rate.",
      explain: `Parallel lines have the same slope, ${ds(m)}. Only y = ${lin(m, b2)} has slope ${ds(m)} (and a different intercept).`,
    };
  }
  const [what, unit] = pick([["a month plus", "per GB"], ["to start plus", "per mile"], ["for the hall plus", "per guest"]]);
  const F = rand(2, 12) * 5;
  const c = rand(2, 9);
  return {
    key: `si-story-${what}-${F}-${c}`,
    prompt: `It costs $${F} ${what} $${c} ${unit}. Which equation gives the cost y for x?`,
    speech: `It costs ${F} dollars ${what} ${c} dollars ${unit}. Which equation gives the total cost y for x of them?`,
    visual: NONE,
    ...label(`y = ${c}x + ${F}`, [`y = ${F}x + ${c}`, `y = ${c + F}x`, `y = ${c}x − ${F}`]),
    hint: "The rate (per one) is the slope m. The fixed amount is the starting value b.",
    explain: `The slope is the rate, $${c}, and the intercept is the fixed $${F}: y = ${c}x + ${F}.`,
  };
}

/** 8.F.A.3, HSF-LE.A.1b — linear functions have straight-line graphs and constant rates. */
export function linearOrNot(): Question {
  const kind = rand(0, 3);
  const a = nz(-6, 6);
  const b = nz(-9, 9);
  const c = rand(2, 9);
  const linear = shuffle([`y = ${lin(a, b)}`, `y = ${b}`, `${twoVar(rand(1, 5), nz(-5, 5))} = ${c}`, `y = x/${c} ${signed$(b)}`, `y = ${lin(-c, 0)}`]);
  const curved = shuffle([`y = x² ${signed$(b)}`, `y = ${c}/x`, `y = ${c}ˣ`, `y = x³ ${signed$(b)}`, `xy = ${c}`, `y = √x ${signed$(b)}`]);
  if (kind <= 1) {
    const notLin = kind === 0;
    const odd = notLin ? curved[0] : linear[0];
    const rest = (notLin ? linear : curved).slice(0, 3);
    const { choices, labels, answer } = labelChoices(odd, rest);
    return {
      key: `lo-${kind}-${odd}-${rest.join(",")}`,
      prompt: notLin ? "Which equation is NOT a linear function?" : "Which equation IS a linear function?",
      speech: notLin ? "Which equation is not a linear function?" : "Which equation is a linear function?",
      visual: NONE,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "A linear function can be written y = mx + b: x appears only to the first power, not squared, under a root, in an exponent or on the bottom.",
      explain: notLin ? `${odd} can't be written as y = mx + b, so its graph curves.` : `${odd} can be written as y = mx + b, so its graph is a straight line.`,
    };
  }
  if (kind === 2) {
    const type = rand(0, 2);
    const k = rand(1, 4);
    const s = rand(-3, 5);
    const f = (x: number) => (type === 0 ? k * x + s : type === 1 ? x * x + s : k * 2 ** x);
    return {
      key: `lo-table-${type}-${k}-${s}`,
      prompt: "Is the function in this table linear?",
      speech: "Look at how y changes in the table. Is the function linear?",
      visual: { kind: "table", header: ["x", "y"], rows: [0, 1, 2, 3, 4].map((x) => [x, f(x)]) },
      needsVisual: true,
      ...yesNo(type === 0, "linear", "not linear"),
      hint: "Find how much y changes each time x goes up by 1. Linear means the change is always the same.",
      explain: type === 0 ? `y goes up by ${k} every step: a constant rate, so it's linear.` : "The change in y isn't the same each step, so it's not linear.",
    };
  }
  const n = rand(2, 9);
  const [text, isLin] = pick([
    [`A candle burns down ${n} mm every hour.`, true],
    [`A colony of cells doubles every ${n} hours.`, false],
    [`The area of a square with side s cm.`, false],
    [`The perimeter of a square with side s cm.`, true],
    [`Apples cost $${n} per pound.`, true],
    [`A $${n * 100} car loses 10% of its value every year.`, false],
    [`A taxi charges $${n} plus $2 per mile.`, true],
    [`A ball's height as it falls from ${n * 10} m.`, false],
  ] as [string, boolean][]);
  return {
    key: `lo-story-${text}`,
    prompt: `${text} Linear or not?`,
    speech: `${text} Is this relationship linear?`,
    visual: NONE,
    ...yesNo(isLin, "linear", "not linear"),
    hint: "Linear means the same amount is added for each step. Multiplying, squaring or speeding up is not linear.",
    explain: isLin ? "The same amount is added each step: a constant rate of change, so it's linear." : "The change isn't constant (it multiplies, squares or speeds up), so it's not linear.",
  };
}

/** HSA-REI.D.10, HSA-CED.A.2 — a graph is the set of all solutions; test points. */
export function pointsOnGraph(): Question {
  const kind = rand(0, 3);
  const m = nz(-4, 4);
  const c = rand(-6, 6);
  const a = rand(-5, 5);
  if (kind === 0) {
    const on = Math.random() < 0.5;
    const b = m * a + c + (on ? 0 : nz(-3, 3));
    return {
      key: `pg-on-${m}-${c}-${a}-${b}`,
      prompt: `Is ${pt(a, b)} on the line y = ${lin(m, c)}?`,
      speech: talk(`Is the point ${pt(a, b)} on the line y = ${lin(m, c)}?`),
      visual: NONE,
      ...yesNo(on),
      hint: "Put the x value into the equation. Do you get the y value?",
      explain: `${ds(m)} × ${pa(a)} ${signed$(c)} = ${ds(m * a + c)}. ${on ? "That matches, so the point is on the line." : `That's not ${ds(b)}, so the point is not on the line.`}`,
    };
  }
  if (kind === 1) {
    return {
      key: `pg-find-${m}-${c}-${a}`,
      prompt: `The point (${ds(a)}, ?) is on y = ${lin(m, c)}. Find the missing y.`,
      speech: talk(`The point with x equal to ${ds(a)} is on the line y = ${lin(m, c)}. What is its y value?`),
      visual: NONE,
      ...signed(m * a + c),
      hint: "Every point on the graph makes the equation true. Substitute x.",
      explain: `y = ${ds(m)} × ${pa(a)} ${signed$(c)} = ${ds(m * a + c)}.`,
    };
  }
  if (kind === 2) {
    const A = rand(1, 5);
    const B = rand(1, 5);
    const x0 = rand(-4, 4);
    const y0 = rand(-4, 4);
    const C = A * x0 + B * y0;
    const cands: [number, number][] = [[x0, y0 + 1], [y0, x0], [x0 + 1, y0], [-x0, y0], [x0, -y0], [x0 - 1, y0 + 1]];
    const wrong = cands.filter(([x, y]) => A * x + B * y !== C).map(([x, y]) => pt(x, y));
    return {
      key: `pg-std-${A}-${B}-${x0}-${y0}`,
      prompt: `Which point is on the graph of ${twoVar(A, B)} = ${ds(C)}?`,
      speech: talk(`Which point is a solution of ${twoVar(A, B)} = ${ds(C)}?`),
      visual: NONE,
      ...label(pt(x0, y0), wrong),
      hint: "Test each point: put in x and y and see if the two sides are equal.",
      explain: `${A}(${ds(x0)}) + ${B}(${ds(y0)}) = ${ds(C)}, so ${pt(x0, y0)} is on the graph.`,
    };
  }
  const k = nz(-5, 5);
  const xa = nz(-4, 4);
  const cands: [number, number][] = [[xa, 2 * xa + k], [xa, -xa * xa + k], [xa, xa * xa - k], [-xa, xa * xa + k + 1]];
  const wrong = cands.filter(([x, y]) => x * x + k !== y).map(([x, y]) => pt(x, y));
  return {
    key: `pg-curve-${k}-${xa}`,
    prompt: `Which point lies on the curve y = x² ${signed$(k)}?`,
    speech: talk(`Which point lies on the curve y = x² ${signed$(k)}?`),
    visual: graph([-6, 6], [-8, 20], { curves: [{ fn: (x) => x * x + k, colour: "teal" }] }),
    ...label(pt(xa, xa * xa + k), wrong),
    hint: "Square the x value first (a negative squared is positive), then add.",
    explain: `(${ds(xa)})² ${signed$(k)} = ${ds(xa * xa + k)}, so ${pt(xa, xa * xa + k)} is on the curve.`,
  };
}

/** HSA-REI.D.12 — solutions of a linear inequality form a half-plane. */
export function inequalityHalfPlanes(): Question {
  const kind = rand(0, 4);
  const [p, q] = pick(NICE_SLOPES);
  const m = p / q;
  const b = rand(-3, 3);
  const op = pick(["<", ">", "≤", "≥"]);
  const strict = op === "<" || op === ">";
  const above = op === ">" || op === "≥";
  const holds = (x: number, y: number) => (op === ">" ? y > m * x + b : op === "≥" ? y >= m * x + b : op === "<" ? y < m * x + b : y <= m * x + b);
  const rhs = linFrac(p, q, b);
  const text = `y ${op} ${rhs}`;
  const region: Plot["regions"] = [{ fn: lineFn(m, b), side: above ? "above" : "below", strict, colour: "berry" }];
  if (kind === 0) {
    const pool: [number, number][] = [];
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (Math.abs(y - (m * x + b)) >= 1) pool.push([x, y]);
    const yes = shuffle(pool.filter(([x, y]) => holds(x, y)));
    const no = shuffle(pool.filter(([x, y]) => !holds(x, y)));
    const chosen = shuffle([yes[0], no[0], no[1], no[2]]);
    const names = ["A", "B", "C", "D"];
    const win = names[chosen.indexOf(yes[0])];
    return {
      key: `hp-pick-${p}-${q}-${b}-${op}-${chosen.map((c) => c.join(",")).join("|")}`,
      prompt: `Which point is a solution of ${text}?`,
      speech: talk(`The solutions are shaded. Which point is a solution of ${text}?`),
      visual: graph([-6, 6], [-6, 6], { regions: region, points: chosen.map(([x, y], i) => ({ x, y, label: names[i] })) }),
      needsVisual: true,
      ...fixedLabels(names, names.indexOf(win)),
      hint: `"y ${op}" means the points ${above ? "above" : "below"} the line: the shaded side. Or test a point in the inequality.`,
      explain: `${win} is at ${pt(yes[0][0], yes[0][1])}, which is ${above ? "above" : "below"} the line, so it makes ${text} true.`,
    };
  }
  if (kind === 1) {
    return {
      key: `hp-line-${p}-${q}-${b}-${op}`,
      prompt: `Graphing ${text}: is the boundary line solid or dashed?`,
      speech: talk(`When you graph ${text}, is the boundary line solid or dashed?`),
      visual: NONE,
      ...yesNo(!strict, "solid", "dashed"),
      hint: "Are points exactly on the line solutions? ≤ and ≥ include them; < and > don't.",
      explain: strict ? `${op} doesn't include the line itself, so it's dashed.` : `${op} includes points on the line, so it's solid.`,
    };
  }
  if (kind === 2) {
    return {
      key: `hp-side-${p}-${q}-${b}-${op}`,
      prompt: `Graphing ${text}: shade above or below the line?`,
      speech: talk(`When you graph ${text}, do you shade above or below the line?`),
      visual: NONE,
      ...yesNo(above, "above the line", "below the line"),
      hint: "With y alone on the left: greater than means above, less than means below.",
      explain: `y ${op} … means y-values ${above ? "bigger" : "smaller"} than the line's, so shade ${above ? "above" : "below"}.`,
    };
  }
  if (kind === 3) {
    const x0 = rand(-4, 4);
    const y0 = rand(-4, 4);
    const yes = holds(x0, y0);
    const r = clean(m * x0 + b);
    return {
      key: `hp-test-${p}-${q}-${b}-${op}-${x0}-${y0}`,
      prompt: `Is ${pt(x0, y0)} a solution of ${text}?`,
      speech: talk(`Is the point ${pt(x0, y0)} a solution of ${text}?`),
      visual: NONE,
      ...yesNo(yes),
      hint: "Substitute the x value into the right side, then compare with the y value.",
      explain: `The right side is ${ds(r)}. Is ${ds(y0)} ${op} ${ds(r)}? ${yes ? "Yes" : "No"}.`,
    };
  }
  // The shaded graph is the question: read the boundary line, its style and the shaded side.
  const wrong = (["<", ">", "≤", "≥"] as const).filter((o) => o !== op).map((o) => `y ${o} ${rhs}`);
  wrong.push(`y ${op} ${linFrac(-p, q, b)}`);
  if (b !== 0) wrong.push(`y ${op} ${linFrac(p, q, -b)}`);
  return {
    key: `hp-read-${p}-${q}-${b}-${op}`,
    prompt: "Which inequality does the graph show?",
    speech: "Which inequality does the shaded graph show?",
    visual: graph([-6, 6], [-6, 6], { regions: region }),
    needsVisual: true,
    ...label(text, wrong),
    hint: "Find the line's slope and y-intercept. Shaded above means y >, below means y <. A solid line adds 'or equal to'.",
    explain: `The line is y = ${rhs}. It's ${strict ? "dashed" : "solid"} and the shading is ${above ? "above" : "below"} it, so ${text}.`,
  };
}

/** Activity: draw a line. 8.EE.B.6, 8.F.A.3, HSA-REI.D.10, HSF-IF.C.7a, HSA-CED.A.2. */
export function drawTheLine(): Question {
  const kind = rand(0, 3);
  const [p, q] = pick([...NICE_SLOPES, [0, 1] as [number, number]]);
  const m = p / q;
  const b = rand(-4, 4);
  const act = (mm: number, bb: number, size = 6, quadrants: 1 | 4 = 4) => ({ input: "activity" as const, activity: { kind: "drawLine" as const, m: mm, b: bb, size, quadrants }, answer: clean(mm) });
  if (kind === 0) {
    return {
      key: `dl-eq-${p}-${q}-${b}`,
      prompt: `Draw the line y = ${linFrac(p, q, b)}.`,
      speech: talk(`Draw the line y = ${linFrac(p, q, b)}. Tap two points on it.`),
      visual: NONE,
      ...act(m, b),
      hint: `Start at ${pt(0, b)} on the y-axis. ${p === 0 ? "The slope is 0, so stay level." : `Then go ${q === 1 ? "1" : q} right and ${Math.abs(p)} ${p > 0 ? "up" : "down"}.`}`,
      explain: `Plot the intercept ${pt(0, b)}, then use the slope ${fracStr(p, q)} to reach ${pt(q, b + p)}. Join them.`,
    };
  }
  if (kind === 1) {
    return {
      key: `dl-mb-${p}-${q}-${b}`,
      prompt: `Draw the line with slope ${fracStr(p, q)} and y-intercept ${ds(b)}.`,
      speech: talk(`Draw the line with slope ${fracStr(p, q)} and y-intercept ${ds(b)}.`),
      visual: NONE,
      ...act(m, b),
      hint: "The y-intercept is where you start on the y-axis; the slope tells you rise over run from there.",
      explain: `Start at ${pt(0, b)}, then move ${q} right and ${Math.abs(p)} ${p < 0 ? "down" : "up"} to ${pt(q, b + p)}.`,
    };
  }
  if (kind === 2) {
    const A = nz(-4, 4);
    const B = pick([1, 2, -1]);
    const C = B * rand(-3, 3);
    const mm = -A / B;
    const bb = C / B;
    return {
      key: `dl-std-${A}-${B}-${C}`,
      prompt: `Draw the graph of ${twoVar(A, B)} = ${ds(C)}.`,
      speech: talk(`Draw the graph of ${twoVar(A, B)} = ${ds(C)}. Every point on it is a solution.`),
      visual: NONE,
      ...act(mm, bb),
      hint: "Find two solutions: try x = 0 and solve for y, then try another x.",
      explain: `Solving for y gives y = ${linFrac(-A * (B < 0 ? -1 : 1), Math.abs(B), bb)}. Every point on that line is a solution.`,
    };
  }
  const [rate, start, thing] = pick([[1, 2, "A plant is 2 cm tall and grows 1 cm a week."], [2, 1, "A tank has 1 L and fills 2 L a minute."], [1, 4, "A ticket app starts at 4 points and adds 1 per trip."], [2, 0, "You earn $2 for every chore."], [3, 1, "A stack starts at 1 cm and grows 3 cm per book."]] as [number, number, string][]);
  return {
    key: `dl-story-${thing}`,
    prompt: `${thing} Draw the graph.`,
    speech: `${thing} Draw the line that shows this, with x across and y up.`,
    visual: NONE,
    ...act(rate, start, 10, 1),
    hint: "The starting amount is the y-intercept. The amount added each step is the slope.",
    explain: `Start at ${pt(0, start)} and go up ${rate} for every 1 across: y = ${lin(rate, start)}.`,
  };
}

/* ================================================ 4. Transformations & Pythagoras */

/** A random rigid motion, described in words. */
function rigidMotion(): string {
  return pick([
    `a rotation of ${pick([90, 180, 270])}°`,
    `a reflection in the ${pick(["x-axis", "y-axis"])}`,
    `a translation ${rand(1, 9)} units ${pick(["left", "right", "up", "down"])}`,
  ]);
}

/** Triangle angles: multiples of 5, each at least 20°. */
function triangleAngles(): [number, number, number] {
  const a = rand(4, 24) * 5;
  const b = rand(4, Math.min(24, 32 - a / 5)) * 5;
  return [a, b, 180 - a - b];
}

/** 8.G.A.1a–c, 8.G.A.2 — rigid motions keep lengths, angles and parallel lines; congruence. */
export function rigidMotions(): Question {
  const kind = rand(0, 4);
  const motion = rigidMotion();
  if (kind === 0) {
    const angles = triangleAngles();
    const big = Math.max(...angles);
    return {
      key: `rm-angle-${angles.join(".")}-${motion}`,
      prompt: `After ${motion}, this triangle's largest angle is…`,
      speech: talk(`A triangle has angles of ${angles.join(", ")} degrees. It's moved by ${motion}. What is its largest angle now?`),
      visual: { kind: "triangle", shape: angles, angles },
      needsVisual: true,
      ...choose(big, [big + 90, 180 - big, big / 2], 5, 5),
      unit: "°",
      hint: "Rotations, reflections and translations move a shape without stretching it.",
      explain: `Rigid motions keep every angle the same, so the largest angle is still ${big}°.`,
    };
  }
  if (kind === 1) {
    const s = rand(3, 40) / (Math.random() < 0.3 ? 2 : 1);
    return {
      key: `rm-len-${s}-${motion}`,
      prompt: `Segment AB is ${ds(s)} cm. After ${motion}, how long is A′B′?`,
      speech: talk(`Segment A B is ${ds(s)} centimeters long. After ${motion}, how long is its image, A prime B prime?`),
      visual: NONE,
      ...choose(s, [2 * s, s + 1, s / 2], 0.5, 0.5),
      unit: "cm",
      hint: "Does moving, turning or flipping a stick change its length?",
      explain: `Rigid motions keep lengths the same, so A′B′ is still ${ds(s)} cm.`,
    };
  }
  if (kind === 2) {
    return {
      key: `rm-par-${motion}`,
      prompt: `Lines p and q are parallel. After ${motion}, their images are…`,
      speech: talk(`Lines p and q are parallel. After ${motion}, what are their images?`),
      visual: { kind: "lines", type: "parallel" },
      ...label("still parallel", ["perpendicular", "crossing at one point", "it depends on the move"]),
      hint: "The whole picture moves together. Does the gap between the lines change?",
      explain: "Rigid motions keep parallel lines parallel: the gap between them doesn't change.",
    };
  }
  if (kind === 3) {
    const k = pick(["2", "3", "1/2"]);
    return {
      key: `rm-not-${k}-${motion}`,
      prompt: "Which move is NOT a rigid motion?",
      speech: "Which of these moves is not a rigid motion?",
      visual: NONE,
      ...label(`a dilation by ${k}`, [motion, rigidMotion(), rigidMotion(), `a rotation of ${rand(1, 3) * 45}°`]),
      hint: "Rigid motions keep size and shape. Which one changes the size?",
      explain: `A dilation by ${k} changes lengths, so it isn't rigid. The others only move, turn or flip.`,
    };
  }
  const second = rigidMotion();
  const dilate = Math.random() < 0.35;
  const two = dilate ? `a dilation by ${pick([2, 3])}` : second;
  return {
    key: `rm-cong-${motion}-${two}`,
    prompt: `Shape A maps onto shape B by ${motion}, then ${two}. A and B are…`,
    speech: talk(`Shape A maps onto shape B by ${motion}, then ${two}. What can you say about A and B?`),
    visual: NONE,
    ...label(dilate ? "similar, but not congruent" : "congruent", [dilate ? "congruent" : "similar, but not congruent", "not related at all", "the same area only"]),
    hint: "Rigid motions keep size and shape. A dilation keeps shape but changes size.",
    explain: dilate
      ? "The dilation changes the size, so B is a scaled copy of A: similar, not congruent."
      : "A sequence of rigid motions keeps every length and angle, so A and B are congruent.",
  };
}

type Move = { name: string; f: (x: number, y: number) => [number, number]; wrong: (x: number, y: number) => [number, number][] };

function pickMove(): Move {
  const h = nz(-4, 4);
  const k = nz(-4, 4);
  const moves: Move[] = [
    {
      name: `Translate ${Math.abs(h)} ${h > 0 ? "right" : "left"} and ${Math.abs(k)} ${k > 0 ? "up" : "down"}`,
      f: (x, y) => [x + h, y + k],
      wrong: (x, y) => [[x + k, y + h], [x - h, y - k], [x + h, y - k]],
    },
    { name: "Reflect in the x-axis", f: (x, y) => [x, -y], wrong: (x, y) => [[-x, y], [-x, -y], [y, x]] },
    { name: "Reflect in the y-axis", f: (x, y) => [-x, y], wrong: (x, y) => [[x, -y], [-x, -y], [y, x]] },
    { name: "Rotate 90° counterclockwise about the origin", f: (x, y) => [-y, x], wrong: (x, y) => [[y, -x], [-x, -y], [y, x]] },
    { name: "Rotate 180° about the origin", f: (x, y) => [-x, -y], wrong: (x, y) => [[-y, x], [x, -y], [y, x]] },
    { name: "Rotate 90° clockwise about the origin", f: (x, y) => [y, -x], wrong: (x, y) => [[-y, x], [-x, -y], [-y, -x]] },
  ];
  return pick(moves);
}

/** 8.G.A.3 — the effect of translations, reflections and rotations on coordinates. */
export function transformCoords(): Question {
  const mv = pickMove();
  let x = nz(-6, 6);
  let y = nz(-6, 6, x, -x);
  while (Math.abs(y) === Math.abs(x)) {
    x = nz(-6, 6);
    y = nz(-6, 6);
  }
  const [X, Y] = mv.f(x, y);
  return {
    key: `tc-${mv.name}-${x}-${y}`,
    prompt: `${mv.name}. Where does A ${pt(x, y)} land?`,
    speech: talk(`${mv.name}. Where does point A at ${pt(x, y)} land?`),
    visual: { kind: "grid", size: 8, quadrants: 4, points: [{ x, y, label: "A" }] },
    ...label(pt(X, Y), mv.wrong(x, y).map(([u, v]) => pt(u, v))),
    hint: mv.name.startsWith("Translate")
      ? "Add the moves: right/left changes x, up/down changes y."
      : mv.name.startsWith("Reflect")
        ? "Reflecting in an axis flips the sign of the other coordinate."
        : "Rotations about the origin swap and/or negate the coordinates. Try sketching the turn.",
    explain: `${pt(x, y)} → ${pt(X, Y)}.${mv.name.includes("90° counter") ? " A 90° turn counterclockwise sends (x, y) to (−y, x)." : mv.name.includes("90° clockwise") ? " A 90° turn clockwise sends (x, y) to (y, −x)." : ""}`,
  };
}

/** Activity: plot the image of a shape after a transformation. 8.G.A.3. */
export function transformActivity(): Question {
  for (;;) {
    const dilate = Math.random() < 0.2;
    const mv = dilate ? { name: "Dilate by 2 about the origin", f: (x: number, y: number) => [2 * x, 2 * y] as [number, number] } : pickMove();
    const lim = dilate ? 3 : 5;
    const n = rand(1, 3);
    const pts = distinct(n * 2, -lim, lim).map((v, i, all) => [v, all[(i + 3) % all.length]] as [number, number]).slice(0, n);
    const names = ["A", "B", "C"].slice(0, n);
    const imgs = pts.map(([x, y]) => mv.f(x, y));
    const keys = new Set(imgs.map(([x, y]) => `${x},${y}`));
    if (keys.size !== n || imgs.some(([x, y]) => Math.abs(x) > 8 || Math.abs(y) > 8)) continue;
    if (pts.some(([x, y], i) => imgs[i][0] === x && imgs[i][1] === y)) continue;
    return {
      key: `ta-${mv.name}-${pts.join("|")}`,
      prompt: `${mv.name}. Plot ${names.map((m) => `${m}′`).join(", ")}.`,
      speech: talk(`${mv.name}. Tap the grid to plot the image of ${n === 1 ? "point A" : `each point, ${names.join(", ")}`}.`),
      visual: { kind: "grid", size: 8, quadrants: 4, points: pts.map(([x, y], i) => ({ x, y, label: names[i] })) },
      input: "activity",
      activity: { kind: "plotPoints", points: imgs.map(([x, y], i) => ({ x, y, label: `${names[i]}′` })), size: 8, quadrants: 4 },
      answer: n,
      hint: dilate ? "Multiply both coordinates by 2." : "Use the coordinate rule for the move on each point, then plot the result.",
      explain: pts.map(([x, y], i) => `${names[i]} ${pt(x, y)} → ${names[i]}′ ${pt(imgs[i][0], imgs[i][1])}`).join("; ") + ".",
    };
  }
}

/** 8.G.A.3, 8.G.A.4 — dilations on coordinates; similar figures and scale factors. */
export function dilations(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const k = pick([2, 3, 0.5]);
    const x = nz(-4, 4) * (k === 0.5 ? 2 : 1);
    const y = nz(-4, 4, x) * (k === 0.5 ? 2 : 1);
    return {
      key: `di-pt-${k}-${x}-${y}`,
      prompt: `Dilate ${pt(x, y)} by a scale factor of ${k === 0.5 ? "1/2" : k}, centered at the origin.`,
      speech: talk(`Dilate the point ${pt(x, y)} by a scale factor of ${k === 0.5 ? "1/2" : k}, centered at the origin.`),
      visual: { kind: "grid", size: 8, quadrants: 4, points: [{ x, y, label: "P" }] },
      ...label(pt(k * x, k * y), [pt(x + k, y + k), pt(k * x, y), pt(x / k, y / k), pt(k * y, k * x)]),
      hint: "A dilation from the origin multiplies both coordinates by the scale factor.",
      explain: `Multiply each coordinate by ${k === 0.5 ? "1/2" : k}: ${pt(x, y)} → ${pt(k * x, k * y)}.`,
    };
  }
  if (kind === 1) {
    const k = pick([1.5, 2, 2.5, 3]);
    const ab = rand(2, 8) * 2;
    const bc = rand(2, 9) * 2;
    return {
      key: `di-sim-${k}-${ab}-${bc}`,
      prompt: `△ABC ~ △DEF. AB = ${ab}, DE = ${ds(ab * k)}, BC = ${bc}. Find EF.`,
      speech: `Triangle A B C is similar to triangle D E F. A B is ${ab}, D E is ${ds(ab * k)}, and B C is ${bc}. How long is E F?`,
      visual: NONE,
      ...choose(bc * k, [bc + ab * k - ab, bc / k, bc * k + 1], 1, 0),
      hint: "Find the scale factor DE ÷ AB, then use it on BC.",
      explain: `The scale factor is ${ds(ab * k)} ÷ ${ab} = ${k}, so EF = ${bc} × ${k} = ${ds(bc * k)}.`,
    };
  }
  if (kind === 2) {
    const a = rand(2, 12);
    const k = pick([0.5, 1.5, 2, 2.5, 3, 4]);
    const b = a * k;
    if (!Number.isInteger(b)) return dilations();
    return {
      key: `di-k-${a}-${k}`,
      prompt: `A ${a} cm side becomes ${b} cm after a dilation. What's the scale factor?`,
      speech: `After a dilation, a side of ${a} centimeters becomes ${b} centimeters. What is the scale factor?`,
      visual: NONE,
      ...choose(k, [a / b, b - a, k + 1], 0.5, 0.5),
      hint: "Scale factor = new length ÷ original length.",
      explain: `${b} ÷ ${a} = ${k}.${k < 1 ? " Less than 1 means the shape shrank." : ""}`,
    };
  }
  if (kind === 3) {
    const a = rand(5, 34) * 5;
    const k = pick([2, 3, 4]);
    return {
      key: `di-ang-${a}-${k}`,
      prompt: `An angle of ${a}° is dilated by a scale factor of ${k}. New angle?`,
      speech: `An angle of ${a} degrees is part of a shape dilated by a scale factor of ${k}. What is the angle now?`,
      visual: NONE,
      ...choose(a, [a * k, a + k, Math.round(a / k)], 5, 1),
      unit: "°",
      hint: "A dilation makes a scaled copy: bigger or smaller, but the same shape.",
      explain: `Dilations keep angles the same, so it's still ${a}°.`,
    };
  }
  const [a, b] = triangleAngles();
  const similar = Math.random() < 0.5;
  const c = 180 - a - b;
  const other = similar ? c : c + pick([-10, -5, 5, 10]);
  return {
    key: `di-aa-${a}-${b}-${other}`,
    prompt: `One triangle has angles ${a}° and ${b}°. Another has ${a}° and ${other}°. Similar?`,
    speech: `One triangle has angles of ${a} and ${b} degrees. Another has angles of ${a} and ${other} degrees. Are the triangles similar?`,
    visual: NONE,
    ...yesNo(similar),
    hint: "Find each triangle's third angle (they add to 180°). Two matching angles are enough for similar triangles.",
    explain: similar
      ? `The first triangle's third angle is ${c}°, so both have ${a}°, ${b}° and ${c}°: similar (angle-angle).`
      : `The first triangle's angles are ${a}°, ${b}°, ${c}°. The second has ${a}°, ${other}° and ${180 - a - other}°: not the same, so not similar.`,
  };
}

/**
 * Angle pairs on the `transversal` visual, by index 0–7 (angles 1–8). At each crossing the top-right and
 * bottom-left angles (indexes 1, 2, 5, 6) equal the tilt; the other two are 180° − tilt.
 */
const TV_PAIRS: { name: string; same: boolean; pairs: [number, number][] }[] = [
  { name: "corresponding angles", same: true, pairs: [[0, 4], [1, 5], [2, 6], [3, 7]] },
  { name: "alternate interior angles", same: true, pairs: [[2, 5], [3, 4]] },
  { name: "alternate exterior angles", same: true, pairs: [[0, 7], [1, 6]] },
  { name: "vertical angles", same: true, pairs: [[0, 3], [1, 2], [4, 7], [5, 6]] },
  { name: "same-side interior angles", same: false, pairs: [[2, 4], [3, 5]] },
  { name: "a linear pair", same: false, pairs: [[0, 1], [2, 3], [0, 2], [1, 3], [4, 5], [6, 7], [4, 6], [5, 7]] },
];

/** The tilt that makes angle `i` measure `deg`, so the drawing matches its label. */
const tiltFor = (i: number, deg: number) => ([1, 2, 5, 6].includes(i) ? deg : 180 - deg);

/** Transversal labels: `marks` puts a label on each listed angle; the rest stay blank. */
function tvVisual(tilt: number, marks: [number, Mark][]): Visual {
  const labels: Mark[] = Array(8).fill(null);
  for (const [i, m] of marks) labels[i] = m;
  return { kind: "transversal", tilt, labels: labels as [Mark, Mark, Mark, Mark, Mark, Mark, Mark, Mark] };
}

/** A random angle pair on the transversal, in random order. */
function tvPair() {
  const rel = pick(TV_PAIRS);
  const [i, j] = shuffle([...pick(rel.pairs)]);
  return { ...rel, i, j };
}

/** Why a transversal pair is equal or adds to 180°. */
const tvWhy = (rel: { name: string; same: boolean }) =>
  rel.same ? `${cap(rel.name)} are equal` : rel.name === "a linear pair" ? "A linear pair makes a straight line: they add to 180°" : `${cap(rel.name)} add to 180°`;

/** 8.G.A.5 — triangle angle sum, exterior angles, parallel lines and transversals. */
export function angleFacts(): Question {
  const kind = rand(0, 7);
  const [A, B, C] = triangleAngles();
  if (kind === 0) {
    return {
      key: `af-tri-${A}-${B}`,
      prompt: "Find the missing angle of the triangle.",
      speech: `Two angles of a triangle are ${A} and ${B} degrees. What is the third angle?`,
      visual: { kind: "triangle", shape: [A, B, C], angles: [A, B, "?"] },
      needsVisual: true,
      ...keypad(C),
      unit: "°",
      hint: "The angles of a triangle add to 180°.",
      explain: `180 − ${A} − ${B} = ${C}°.`,
    };
  }
  if (kind === 1) {
    return {
      key: `af-ext-${A}-${B}`,
      prompt: "Find the exterior angle at corner C.",
      speech: `A triangle has angles of ${A} and ${B} degrees at corners A and B. What is the exterior angle at corner C?`,
      visual: { kind: "triangle", shape: [A, B, C], angles: [A, B, null] },
      needsVisual: true,
      ...choose(A + B, [C, 180 - A, 360 - A - B], 5, 5),
      unit: "°",
      hint: "An exterior angle and its inside angle make a straight line. Or: it equals the two far inside angles added.",
      explain: `The inside angle at C is ${C}°, so the exterior angle is 180 − ${C} = ${A + B}°, the same as ${A} + ${B}.`,
    };
  }
  if (kind === 2) {
    const a = pick([rand(6, 17), rand(19, 30)]) * 5;
    const rel = tvPair();
    const ans = rel.same ? a : 180 - a;
    return {
      key: `af-par-${a}-${rel.i}-${rel.j}`,
      prompt: "The lines are parallel. Find the angle marked ?.",
      speech: `A transversal crosses two parallel lines. One angle is ${a} degrees. What is the angle marked with a question mark?`,
      visual: tvVisual(tiltFor(rel.i, a), [[rel.i, a], [rel.j, "?"]]),
      needsVisual: true,
      ...choose(ans, [180 - ans, 90, 360 - ans], 5, 5),
      unit: "°",
      hint: "Corresponding, alternate and vertical angles are equal. Same-side interior angles and angles on a line add to 180°.",
      explain: rel.same ? `These are ${rel.name}. ${tvWhy(rel)}, so it's ${a}°.` : `These are ${rel.name}. ${tvWhy(rel)}, so it's 180 − ${a} = ${ans}°.`,
    };
  }
  if (kind === 3) {
    const parts = pick([[1, 2, 3], [1, 1, 4], [2, 3, 4], [1, 2, 6], [3, 4, 5], [1, 3, 5], [2, 2, 5], [1, 4, 7]]);
    const total = sum(parts);
    const x = 180 / total;
    const marks = parts.map((p) => (p === 1 ? "x" : `${p}x`)) as [Mark, Mark, Mark];
    return {
      key: `af-alg-${parts.join(".")}`,
      prompt: "Find x.",
      speech: `A triangle's angles are ${parts.map((p) => (p === 1 ? "x" : `${p} x`)).join(", ")} degrees. What is x?`,
      visual: { kind: "triangle", shape: parts.map((p) => p * x) as [number, number, number], angles: marks },
      needsVisual: true,
      ...keypad(x),
      unit: "°",
      hint: "Add the angles and set them equal to 180.",
      explain: `${parts.map((p) => (p === 1 ? "x" : `${p}x`)).join(" + ")} = ${total}x = 180, so x = ${ds(x)}°.`,
    };
  }
  if (kind === 4) {
    return {
      key: `af-make-${A}-${B}`,
      prompt: "Make the triangle's third angle.",
      speech: `A triangle has angles of ${A} and ${B} degrees. Drag the ray to make the third angle.`,
      visual: { kind: "triangle", shape: [A, B, C], angles: [A, B, "?"] },
      needsVisual: true,
      input: "activity",
      activity: { kind: "makeAngle", degrees: C, scale: true },
      answer: C,
      hint: "The three angles add to 180°. Work out the third, then use the protractor.",
      explain: `180 − ${A} − ${B} = ${C}°.`,
    };
  }
  if (kind === 5) {
    const a = rand(4, 32) * 5;
    return {
      key: `af-line-${a}`,
      prompt: `An angle of ${a}° sits on a straight line. Make the angle beside it.`,
      speech: `An angle of ${a} degrees sits on a straight line. Drag the ray to make the angle next to it on the line.`,
      visual: { kind: "angle", mode: "line", angles: [a, 180 - a] },
      input: "activity",
      activity: { kind: "makeAngle", degrees: 180 - a, scale: true },
      answer: 180 - a,
      hint: "Angles on a straight line add to 180°.",
      explain: `180 − ${a} = ${180 - a}°.`,
    };
  }
  if (kind === 6) {
    const rel = tvPair();
    const tilt = pick([rand(8, 16), rand(20, 28)]) * 5;
    return {
      key: `af-name-${rel.i}-${rel.j}-${tilt}`,
      prompt: "The lines are parallel. What are angles a and b?",
      speech: "A transversal crosses two parallel lines. What kind of angle pair are angles a and b?",
      visual: tvVisual(tilt, [[rel.i, "a"], [rel.j, "b"]]),
      needsVisual: true,
      ...label(rel.name, TV_PAIRS.map((r) => r.name).filter((n) => n !== rel.name)),
      hint: "Interior angles are between the parallel lines. Alternate angles are on opposite sides of the transversal; corresponding angles are in the same spot at each crossing.",
      explain: `Angles a and b are ${rel.name}. ${tvWhy(rel)}.`,
    };
  }
  // Algebra on a transversal: an expression in x on one angle, an expression or a number on its partner.
  const rel = tvPair();
  const x = rand(5, 30);
  const a = pick([rand(6, 17), rand(19, 30)]) * 5;
  const other = rel.same ? a : 180 - a;
  const p1 = rand(2, 5);
  const e1 = lin(p1, a - p1 * x);
  const both = Math.random() < 0.6;
  const p2 = nz(1, 5, p1);
  const e2 = both ? lin(p2, other - p2 * x) : other;
  return {
    key: `af-tvx-${rel.i}-${rel.j}-${x}-${a}-${p1}-${both ? p2 : 0}`,
    prompt: "The lines are parallel. Find x.",
    speech: talk(`A transversal crosses two parallel lines. One angle is ${e1} degrees, and the other marked angle is ${e2} degrees. What is x?`),
    visual: tvVisual(tiltFor(rel.i, a), [[rel.i, e1], [rel.j, e2]]),
    needsVisual: true,
    ...keypad(x),
    hint: `${tvWhy(rel)}. Write an equation, then solve for x.`,
    explain: rel.same
      ? `${tvWhy(rel)}: ${e1} = ${e2}, so x = ${x}. Each angle is ${a}°.`
      : `${tvWhy(rel)}: (${e1}) + ${both ? `(${e2})` : e2} = 180, so x = ${x}. The angles are ${a}° and ${other}°.`,
  };
}

const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];

/** A scaled Pythagorean triple with hypotenuse ≤ max. */
function triple(max = 60): [number, number, number] {
  for (;;) {
    const t = pick(TRIPLES);
    const k = rand(1, 5);
    if (t[2] * k <= max) return [t[0] * k, t[1] * k, t[2] * k];
  }
}

/** 8.G.B.6 — the Pythagorean theorem and its converse. */
export function pythagoras(): Question {
  const kind = rand(0, 2);
  const [a, b, c] = triple(50);
  if (kind === 0) {
    const right = Math.random() < 0.5;
    const cc = right ? c : c + pick([-1, 1, 2]);
    const sides = shuffle([a, b, cc]);
    return {
      key: `py-conv-${sides.join(".")}`,
      prompt: `A triangle has sides ${sides.join(", ")}. Is it a right triangle?`,
      speech: `A triangle has sides of ${sides.join(", ")}. Is it a right triangle?`,
      visual: NONE,
      ...yesNo(right, "yes, it's right-angled", "no"),
      hint: "Square the two shorter sides and add. Does that equal the longest side squared?",
      explain: `${a}² + ${b}² = ${a * a + b * b}, and ${cc}² = ${cc * cc}. ${right ? "They match, so it's a right triangle." : "They don't match, so it isn't."}`,
    };
  }
  if (kind === 1) {
    return {
      key: `py-sq-${a}-${b}`,
      prompt: `Squares on the legs have areas ${a * a} and ${b * b}. Area of the square on the hypotenuse?`,
      speech: `In a right triangle, the squares on the two legs have areas ${a * a} and ${b * b}. What's the area of the square on the hypotenuse?`,
      visual: { kind: "righttri", a, b, c: null },
      ...choose(c * c, [a * b, a * a * b * b, (a + b) ** 2], 1, 1),
      hint: "The Pythagorean theorem says the two smaller squares exactly fill the big one.",
      explain: `${a * a} + ${b * b} = ${c * c}. (So the hypotenuse is √${c * c} = ${c}.)`,
    };
  }
  const correct = `${a}² + ${b}² = ${c}²`;
  return {
    key: `py-eq-${a}-${b}`,
    prompt: `A right triangle has sides ${a}, ${b} and ${c}. Which is true?`,
    speech: `A right triangle has sides of ${a}, ${b} and ${c}. Which equation is true?`,
    visual: { kind: "righttri", a, b, c },
    ...label(correct, [`${a}² + ${c}² = ${b}²`, `${a} + ${b} = ${c}`, `${b}² + ${c}² = ${a}²`, `${a}² × ${b}² = ${c}²`]),
    hint: "The hypotenuse is the longest side, opposite the right angle. It goes alone on one side.",
    explain: `${a * a} + ${b * b} = ${c * c}, so ${correct}.`,
  };
}

/** Simplest radical form of √n: 2√2, √13, 5. */
export function rootStr(n: number): string {
  let out = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      out *= f;
    }
  }
  if (inside === 1) return String(out);
  return `${out === 1 ? "" : out}√${inside}`;
}

/** 8.G.B.7 — use the Pythagorean theorem to find missing sides. */
export function pythagSides(): Question {
  const kind = rand(0, 4);
  const [a, b, c] = triple(60);
  if (kind === 0) {
    return {
      key: `ps-hyp-${a}-${b}`,
      prompt: "Find the hypotenuse.",
      speech: `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`,
      visual: { kind: "righttri", a, b, c: "?", unit: "cm" },
      ...keypad(c),
      unit: "cm",
      hint: "c² = a² + b². Square the legs, add, then take the square root.",
      explain: `${a}² + ${b}² = ${a * a + b * b} = ${c}², so c = ${c} cm.`,
    };
  }
  if (kind === 1) {
    return {
      key: `ps-leg-${a}-${b}`,
      prompt: "Find the missing leg.",
      speech: `A right triangle has hypotenuse ${c} and one leg ${b}. How long is the other leg?`,
      visual: { kind: "righttri", a: "?", b, c, unit: "cm" },
      ...keypad(a),
      unit: "cm",
      hint: "Subtract: a² = c² − b².",
      explain: `${c}² − ${b}² = ${c * c - b * b} = ${a}², so the leg is ${a} cm.`,
    };
  }
  if (kind === 2) {
    return {
      key: `ps-ladder-${a}-${b}`,
      prompt: `A ${c} ft ladder's foot is ${b} ft from a wall. How high does it reach?`,
      speech: `A ${c} foot ladder leans on a wall with its foot ${b} feet from the wall. How high up the wall does it reach?`,
      visual: { kind: "righttri", a: "?", b, c, unit: "ft" },
      ...keypad(a),
      unit: "ft",
      hint: "The ladder is the hypotenuse. The wall and ground make the right angle.",
      explain: `√(${c}² − ${b}²) = √${c * c - b * b} = ${a} ft.`,
    };
  }
  if (kind === 3) {
    const [w, h, d] = triple(60);
    return {
      key: `ps-diag-${w}-${h}`,
      prompt: `A rectangle is ${w} by ${h}. How long is its diagonal?`,
      speech: `A rectangle is ${w} by ${h} inches. How long is its diagonal?`,
      visual: { kind: "rect", w, h, showW: true, showH: true, grid: false, unit: "in" },
      ...keypad(d),
      unit: "in",
      hint: "The diagonal splits the rectangle into two right triangles. It's the hypotenuse.",
      explain: `√(${w}² + ${h}²) = √${w * w + h * h} = ${d} in.`,
    };
  }
  let p = rand(1, 7);
  let q = rand(1, 7);
  while (Number.isInteger(Math.sqrt(p * p + q * q))) {
    p = rand(1, 7);
    q = rand(1, 7);
  }
  const s = p * p + q * q;
  return {
    key: `ps-root-${p}-${q}`,
    prompt: "Find the hypotenuse. Leave it as a square root.",
    speech: `A right triangle has legs ${p} and ${q}. What is the exact length of the hypotenuse?`,
    visual: { kind: "righttri", a: p, b: q, c: "?" },
    ...label(rootStr(s), [String(p + q), `√${p + q}`, rootStr(Math.abs(p * p - q * q) || 2), rootStr(s + 2 * p * q)]),
    hint: "Add the squares of the legs. If that isn't a perfect square, the answer stays a square root.",
    explain: `${p}² + ${q}² = ${s}, so c = √${s}${rootStr(s) !== `√${s}` ? ` = ${rootStr(s)}` : ""}.`,
  };
}

/** 8.G.B.8 — distance between two points with the Pythagorean theorem. */
export function distancePoints(): Question {
  const kind = rand(0, 2);
  const [dx0, dy0] = kind === 1 ? [rand(1, 5), rand(1, 5)] : pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5]]);
  if (kind === 1 && Number.isInteger(Math.sqrt(dx0 * dx0 + dy0 * dy0))) return distancePoints();
  const dx = dx0 * pick([1, -1]);
  const dy = dy0 * pick([1, -1]);
  const x1 = rand(Math.max(-8, -8 - dx), Math.min(8, 8 - dx));
  const y1 = rand(Math.max(-8, -8 - dy), Math.min(8, 8 - dy));
  const x2 = x1 + dx;
  const y2 = y1 + dy;
  const visual: Visual = { kind: "grid", size: 8, quadrants: 4, points: [{ x: x1, y: y1, label: "P" }, { x: x2, y: y2, label: "Q" }] };
  const s = dx * dx + dy * dy;
  if (kind === 2) {
    const horiz = Math.random() < 0.5;
    return {
      key: `dp-leg-${x1}-${y1}-${x2}-${y2}-${horiz}`,
      prompt: `Draw a right triangle from P to Q. How long is its ${horiz ? "horizontal" : "vertical"} leg?`,
      speech: `Imagine a right triangle with P Q as its hypotenuse. How long is its ${horiz ? "horizontal" : "vertical"} leg?`,
      visual,
      needsVisual: true,
      ...keypad(horiz ? dx0 : dy0),
      hint: horiz ? "Subtract the x-coordinates." : "Subtract the y-coordinates.",
      explain: `From ${pt(x1, y1)} to ${pt(x2, y2)}, x changes by ${dx0} and y by ${dy0}. The ${horiz ? "horizontal" : "vertical"} leg is ${horiz ? dx0 : dy0}.`,
    };
  }
  const common = {
    visual,
    needsVisual: true,
    hint: "Make a right triangle: the legs are the change in x and the change in y. Then use a² + b² = c².",
    explain: `The legs are ${dx0} and ${dy0}: ${dx0}² + ${dy0}² = ${s}, so PQ = ${kind === 0 ? Math.sqrt(s) : rootStr(s)}.`,
  };
  if (kind === 0) {
    return {
      key: `dp-int-${x1}-${y1}-${x2}-${y2}`,
      prompt: `How far apart are P ${pt(x1, y1)} and Q ${pt(x2, y2)}?`,
      speech: talk(`What is the distance between P at ${pt(x1, y1)} and Q at ${pt(x2, y2)}?`),
      ...common,
      ...choose(Math.sqrt(s), [dx0 + dy0, s, Math.abs(dx0 - dy0)], 1, 1),
    };
  }
  return {
    key: `dp-root-${x1}-${y1}-${x2}-${y2}`,
    prompt: `Find the exact distance from P ${pt(x1, y1)} to Q ${pt(x2, y2)}.`,
    speech: talk(`What is the exact distance from P at ${pt(x1, y1)} to Q at ${pt(x2, y2)}?`),
    ...common,
    ...label(rootStr(s), [String(dx0 + dy0), `√${dx0 + dy0}`, rootStr(s + 2 * dx0 * dy0), rootStr(Math.abs(dx0 * dx0 - dy0 * dy0) || 3)]),
  };
}

/** 8.G.C.9 — volumes of cylinders, cones and spheres. */
export function volumes(): Question {
  const kind = rand(0, 5);
  const piLine: Pick<Question, "answerLine" | "unit"> = { answerLine: ["V", "=", "?"], unit: "π cm³" };
  if (kind === 0) {
    const r = rand(1, 9);
    const h = rand(2, 15);
    return {
      key: `vo-cyl-${r}-${h}`,
      prompt: "Find the cylinder's volume. V = ?π",
      speech: `A cylinder has radius ${r} centimeters and height ${h} centimeters. Its volume is what times pi?`,
      visual: { kind: "solid", solid: "cylinder", r, h, unit: "cm" },
      needsVisual: true,
      ...piLine,
      ...choose(r * r * h, [2 * r * h, r * h, r * r * h * 2, r * r + h], 1, 1),
      hint: "Cylinder: V = πr²h. Square the radius first.",
      explain: `V = π × ${r}² × ${h} = ${r * r * h}π cm³.`,
    };
  }
  if (kind === 1) {
    let r = rand(1, 9);
    let h = rand(2, 15);
    while ((r * r * h) % 3 !== 0) {
      r = rand(1, 9);
      h = rand(2, 15);
    }
    return {
      key: `vo-cone-${r}-${h}`,
      prompt: "Find the cone's volume. V = ?π",
      speech: `A cone has radius ${r} centimeters and height ${h} centimeters. Its volume is what times pi?`,
      visual: { kind: "solid", solid: "cone", r, h, unit: "cm" },
      needsVisual: true,
      ...piLine,
      ...choose((r * r * h) / 3, [r * r * h, r * h, 2 * r * h], 1, 1),
      hint: "Cone: V = (1/3)πr²h, a third of the cylinder with the same base and height.",
      explain: `V = (1/3) × π × ${r}² × ${h} = ${(r * r * h) / 3}π cm³.`,
    };
  }
  if (kind === 2) {
    const r = pick([3, 6, 9, 12]);
    const giveD = Math.random() < 0.5;
    const v = (4 / 3) * r ** 3;
    return {
      key: `vo-sph-${r}-${giveD}`,
      prompt: `Find the sphere's volume${giveD ? " (the diameter is shown)" : ""}. V = ?π`,
      speech: `A sphere has a ${giveD ? `diameter of ${2 * r}` : `radius of ${r}`} centimeters. Its volume is what times pi?`,
      visual: { kind: "solid", solid: "sphere", r: giveD ? 2 * r : r, diameter: giveD, unit: "cm" },
      needsVisual: true,
      ...piLine,
      ...choose(v, [r ** 3, 4 * r * r, (4 / 3) * (2 * r) ** 3], 1, 1),
      hint: `Sphere: V = (4/3)πr³.${giveD ? " Halve the diameter to get the radius." : ""}`,
      explain: `V = (4/3) × π × ${r}³ = (4/3) × ${r ** 3}π = ${v}π cm³.`,
    };
  }
  if (kind === 3) {
    const r = rand(2, 6);
    const h = rand(2, 12);
    const cone = Math.random() < 0.4 && (r * r * h) % 3 === 0;
    const V = cone ? (r * r * h) / 3 : r * r * h;
    return {
      key: `vo-h-${r}-${h}-${cone}`,
      prompt: `This ${cone ? "cone" : "cylinder"} has volume ${V}π cm³. Find its height.`,
      speech: `A ${cone ? "cone" : "cylinder"} has a volume of ${V} pi cubic centimeters and a radius of ${r} centimeters. What is its height?`,
      visual: { kind: "solid", solid: cone ? "cone" : "cylinder", r, h: "?", unit: "cm" },
      needsVisual: true,
      ...keypad(h),
      unit: "cm",
      hint: cone ? "Start from V = (1/3)πr²h and solve for h." : "Start from V = πr²h and solve for h.",
      explain: cone ? `${V}π = (1/3)π × ${r * r} × h, so h = 3 × ${V} ÷ ${r * r} = ${h} cm.` : `${V}π = π × ${r * r} × h, so h = ${V} ÷ ${r * r} = ${h} cm.`,
    };
  }
  if (kind === 4) {
    const V = rand(4, 60) * 3;
    return {
      key: `vo-ratio-${V}`,
      prompt: `A cylinder holds ${V} mL. A cone with the same base and height holds…`,
      speech: `A cylinder holds ${V} milliliters. How much does a cone with the same base and height hold?`,
      visual: { kind: "shapes", shapes: ["cylinder", "cone"] },
      ...choose(V / 3, [V / 2, V * 3, V - 3], 1, 1),
      unit: "mL",
      hint: "It takes three cones of water to fill the matching cylinder.",
      explain: `A cone is 1/3 of the matching cylinder: ${V} ÷ 3 = ${V / 3} mL.`,
    };
  }
  const r = rand(1, 5);
  const h = rand(2, 10);
  const v = clean(3.14 * r * r * h);
  return {
    key: `vo-314-${r}-${h}`,
    prompt: "Use π ≈ 3.14. Find the cylinder's volume.",
    speech: `Use 3.14 for pi. What is the volume of a cylinder with radius ${r} centimeters and height ${h} centimeters?`,
    visual: { kind: "solid", solid: "cylinder", r, h, unit: "cm" },
    needsVisual: true,
    ...keypad(v),
    unit: "cm³",
    hint: "V = πr²h. Work out r²h first, then multiply by 3.14.",
    explain: `${r}² × ${h} = ${r * r * h}, and ${r * r * h} × 3.14 = ${ds(v)} cm³.`,
  };
}

/* ================================================================== 5. Functions */

const setStr = (pairs: [number, number][]) => `{${pairs.map(([x, y]) => pt(x, y)).join(", ")}}`;

/** Random input/output pairs; when `func` is false one input repeats with a new output. */
function relation(func: boolean, n = 4): [number, number][] {
  const xs = distinct(n, -5, 9);
  const pairs: [number, number][] = xs.map((x) => [x, rand(-5, 12)]);
  if (!func) {
    const [x, y] = pick(pairs);
    pairs.push([x, nz(-5, 12, y)]);
  }
  return shuffle(pairs);
}

/** 8.F.A.1, HSF-IF.A.1 — a function gives exactly one output for each input. */
export function isFunction(): Question {
  const kind = rand(0, 4);
  const func = Math.random() < 0.5;
  if (kind === 0) {
    const pairs = relation(func);
    return {
      key: `if-table-${pairs.join("|")}`,
      prompt: "Does this table show y as a function of x?",
      speech: "Does this table show y as a function of x?",
      visual: { kind: "table", header: ["input x", "output y"], rows: pairs },
      needsVisual: true,
      ...yesNo(func, "function", "not a function"),
      hint: "Look for an input that appears twice. Does it go to two different outputs?",
      explain: func ? "Every input has exactly one output, so it's a function." : "One input goes to two different outputs, so it's not a function.",
    };
  }
  if (kind === 1) {
    const pairs = relation(func, 3);
    return {
      key: `if-set-${pairs.join("|")}`,
      prompt: `Is ${setStr(pairs)} a function?`,
      speech: talk(`Is the set of points ${pairs.map(([x, y]) => pt(x, y)).join("; ")} a function?`),
      visual: NONE,
      ...yesNo(func, "function", "not a function"),
      hint: "Check the first numbers (the inputs). A repeated input with a different output breaks the rule.",
      explain: func ? "No input repeats with a different output, so it's a function." : "An input is paired with two outputs, so it's not a function.",
    };
  }
  if (kind === 2) {
    const h = rand(-2, 2);
    const k = rand(-2, 2);
    const r = rand(3, 5);
    const [name, curves, yes] = pick([
      ["parabola", [{ fn: (x: number) => 0.5 * (x - h) ** 2 + k }], true],
      ["V", [{ fn: (x: number) => Math.abs(x - h) + k }], true],
      ["cubic", [{ fn: (x: number) => 0.2 * (x - h) ** 3 + k }], true],
      ["sideways", [{ fn: (x: number) => (x < h ? NaN : k + Math.sqrt(2 * (x - h))) }, { fn: (x: number) => (x < h ? NaN : k - Math.sqrt(2 * (x - h))) }], false],
      ["circle", [{ fn: (x: number) => (Math.abs(x - h) > r ? NaN : k + Math.sqrt(r * r - (x - h) ** 2)) }, { fn: (x: number) => (Math.abs(x - h) > r ? NaN : k - Math.sqrt(r * r - (x - h) ** 2)) }], false],
    ] as [string, { fn: (x: number) => number }[], boolean][]);
    return {
      key: `if-graph-${name}-${h}-${k}-${r}`,
      prompt: "Does this graph show y as a function of x?",
      speech: "Does this graph show y as a function of x? Try the vertical line test.",
      visual: graph([-6, 6], [-6, 6], { curves: curves.map((c) => ({ ...c, colour: "grape" as const })) }),
      needsVisual: true,
      ...yesNo(yes, "function", "not a function"),
      hint: "Vertical line test: imagine sliding a vertical line across. Does it ever hit the graph twice?",
      explain: yes ? "Every vertical line hits the graph at most once, so each x has one y: a function." : "Some vertical lines hit the graph twice, so some x-values have two y-values: not a function.",
    };
  }
  if (kind === 3) {
    const base = relation(true, 3).sort((u, v) => u[0] - v[0]);
    const xs = base.map(([x]) => x);
    let nx = rand(-5, 9);
    while (xs.includes(nx)) nx = rand(-5, 9);
    const ok: [number, number] = [nx, rand(-5, 12)];
    const wrong = base.map(([x, y]) => pt(x, nz(-5, 12, y)));
    return {
      key: `if-add-${base.join("|")}-${ok.join(",")}`,
      prompt: `Which pair can join ${setStr(base)} and keep it a function?`,
      speech: talk(`Which pair can be added to the set ${base.map(([x, y]) => pt(x, y)).join("; ")}, so it is still a function?`),
      visual: NONE,
      ...label(pt(...ok), wrong),
      hint: "A new pair must not reuse an input with a different output.",
      explain: `${pt(...ok)} uses a new input, ${nx}, so every input still has one output.`,
    };
  }
  const pool: { label: string; bin: number }[] = shuffle([
    { label: setStr(relation(true, 3)), bin: 0 },
    { label: setStr(relation(true, 3)), bin: 0 },
    { label: setStr(relation(false, 2)), bin: 1 },
    { label: setStr(relation(false, 2)), bin: 1 },
    { label: `y = ${lin(nz(-5, 5), rand(-9, 9))}`, bin: 0 },
    { label: `y = x² ${signed$(nz(-9, 9))}`, bin: 0 },
    { label: `x = y²`, bin: 1 },
    { label: `x = ${nz(-9, 9)}`, bin: 1 },
    { label: "each person → their birthday", bin: 0 },
    { label: "each birthday → a person born then", bin: 1 },
  ]);
  const items = pool.slice(0, 6);
  if (!items.some((i) => i.bin === 0) || !items.some((i) => i.bin === 1)) return isFunction();
  return {
    key: `if-sort-${items.map((i) => i.label).join("~")}`,
    prompt: "Sort each one: function or not a function?",
    speech: "Sort each relation: is it a function, or not a function?",
    visual: NONE,
    input: "activity",
    activity: { kind: "sort", bins: ["function", "not a function"], items },
    answer: items.filter((i) => i.bin === 0).length,
    hint: "A function sends each input to exactly one output. Look for an input with two outputs.",
    explain: `Functions: ${items.filter((i) => i.bin === 0).map((i) => i.label).join("; ")}. The others give some input two outputs.`,
  };
}

/** HSF-IF.A.2 — evaluate and use function notation. */
export function functionNotation(): Question {
  const kind = rand(0, 4);
  const a = nz(-6, 6);
  const b = rand(-9, 9);
  const k = nz(-6, 6);
  const f = (x: number) => a * x + b;
  if (kind === 0) {
    return {
      key: `fn-eval-${a}-${b}-${k}`,
      prompt: `f(x) = ${lin(a, b)}. Find f(${ds(k)}).`,
      speech: talk(`f(x) = ${lin(a, b)}. What is f(${ds(k)})?`),
      visual: NONE,
      ...signed(f(k)),
      hint: `Replace every x with ${ds(k)}.`,
      explain: `f(${ds(k)}) = ${ds(a)} × ${pa(k)} ${signed$(b)} = ${ds(f(k))}.`,
    };
  }
  if (kind === 1) {
    const p = rand(-5, 5);
    const c = rand(-9, 9);
    const g = (x: number) => x * x + p * x + c;
    return {
      key: `fn-quad-${p}-${c}-${k}`,
      prompt: `g(x) = ${poly([1, p, c])}. Find g(${ds(k)}).`,
      speech: talk(`g(x) = ${poly([1, p, c])}. What is g(${ds(k)})?`),
      visual: NONE,
      ...signed(g(k)),
      hint: `Put ${pa(k)} in for x. Squaring a negative gives a positive.`,
      explain: `g(${ds(k)}) = ${pa(k)}² ${p === 0 ? "" : `${signed$(p)} × ${pa(k)} `}${signed$(c)} = ${k * k} ${p === 0 ? "" : `${signed$(p * k)} `}${signed$(c)} = ${ds(g(k))}.`,
    };
  }
  if (kind === 2) {
    const v = f(k);
    return {
      key: `fn-solve-${a}-${b}-${k}`,
      prompt: `f(x) = ${lin(a, b)}. For which x is f(x) = ${ds(v)}?`,
      speech: talk(`f(x) = ${lin(a, b)}. For what value of x does f(x) equal ${ds(v)}?`),
      visual: NONE,
      ...signed(k),
      hint: `Set ${lin(a, b)} equal to ${ds(v)} and solve.`,
      explain: `${lin(a, b)} = ${ds(v)} → ${lin(a, 0)} = ${ds(v - b)} → x = ${ds(k)}.`,
    };
  }
  if (kind === 3) {
    const xs = sorted(distinct(4, -4, 6));
    const ys = xs.map(() => rand(-9, 12));
    const i = rand(0, 3);
    const back = Math.random() < 0.4 && new Set(ys).size === 4;
    return {
      key: `fn-table-${xs.join(".")}-${ys.join(".")}-${i}-${back}`,
      prompt: back ? `The table shows h. For which x is h(x) = ${ds(ys[i])}?` : `The table shows h. What is h(${ds(xs[i])})?`,
      speech: talk(back ? `The table shows the function h. For which x is h(x) = ${ds(ys[i])}?` : `The table shows the function h. What is h(${ds(xs[i])})?`),
      visual: { kind: "table", header: ["x", "h(x)"], rows: xs.map((x, j) => [x, ys[j]]) },
      needsVisual: true,
      ...(back ? choose(xs[i], xs.filter((_, j) => j !== i).concat([ys[i]])) : choose(ys[i], ys.filter((_, j) => j !== i).concat([xs[i]]))),
      hint: back ? "Find the output in the h(x) column, then read its input." : "Find the input in the x column, then read across.",
      explain: `h(${ds(xs[i])}) = ${ds(ys[i])}.`,
    };
  }
  const m = nz(-5, 5);
  const n = nz(-5, 5, m);
  return {
    key: `fn-diff-${a}-${b}-${m}-${n}`,
    prompt: `f(x) = ${lin(a, b)}. Find f(${ds(m)}) − f(${ds(n)}).`,
    speech: talk(`f(x) = ${lin(a, b)}. What is f(${ds(m)}) minus f(${ds(n)})?`),
    visual: NONE,
    ...signed(f(m) - f(n)),
    hint: "Work out each value separately, then subtract.",
    explain: `f(${ds(m)}) = ${ds(f(m))} and f(${ds(n)}) = ${ds(f(n))}, so the difference is ${ds(f(m) - f(n))}.`,
  };
}

const braces = (xs: number[]) => `{${sorted([...new Set(xs)]).map(ds).join(", ")}}`;

/** HSF-IF.A.1, HSF-IF.B.5 — domain and range; sensible domains in context. */
export function domainRange(): Question {
  const kind = rand(0, 4);
  if (kind <= 1) {
    const pairs = relation(true, 3 + rand(0, 1));
    const xs = pairs.map(([x]) => x);
    const ys = pairs.map(([, y]) => y);
    const dom = kind === 0;
    const correct = braces(dom ? xs : ys);
    const wrong = [braces(dom ? ys : xs), braces([...xs, ...ys]), braces((dom ? xs : ys).slice(1)), braces([...(dom ? xs : ys), dom ? ys[0] + 1 : xs[0] + 1])];
    return {
      key: `dr-set-${kind}-${pairs.join("|")}`,
      prompt: `What is the ${dom ? "domain" : "range"} of ${setStr(pairs)}?`,
      speech: talk(`What is the ${dom ? "domain" : "range"} of the function ${pairs.map(([x, y]) => pt(x, y)).join("; ")}?`),
      visual: NONE,
      ...label(correct, wrong),
      hint: dom ? "The domain is the set of all inputs: the first numbers." : "The range is the set of all outputs: the second numbers.",
      explain: `The ${dom ? "inputs" : "outputs"} are ${correct}.`,
    };
  }
  if (kind === 2) {
    const x1 = rand(-5, 0);
    const x2 = rand(2, 5);
    const y1 = rand(-5, 5);
    const y2 = nz(-5, 5, y1);
    const [lo, hi] = [Math.min(y1, y2), Math.max(y1, y2)];
    const askDom = Math.random() < 0.4;
    const correct = askDom ? `${ds(x1)} ≤ x ≤ ${ds(x2)}` : `${ds(lo)} ≤ y ≤ ${ds(hi)}`;
    return {
      key: `dr-seg-${x1}-${x2}-${y1}-${y2}-${askDom}`,
      prompt: `What is the ${askDom ? "domain" : "range"} of the function graphed?`,
      speech: `The graph is a segment with both endpoints included. What is the ${askDom ? "domain" : "range"} of the function?`,
      visual: graph([-6, 6], [-6, 6], { lines: [{ from: [x1, y1], to: [x2, y2], colour: "grape" }], points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] }),
      needsVisual: true,
      ...label(correct, askDom ? [`${ds(lo)} ≤ x ≤ ${ds(hi)}`, `${ds(x1)} < x < ${ds(x2)}`, `x ≥ ${ds(x1)}`] : [`${ds(x1)} ≤ y ≤ ${ds(x2)}`, `${ds(lo)} < y < ${ds(hi)}`, `y ≥ ${ds(lo)}`]),
      hint: askDom ? "Read the x-values from the left end to the right end." : "Read the y-values from the lowest point to the highest.",
      explain: `The graph covers ${askDom ? `x from ${ds(x1)} to ${ds(x2)}` : `y from ${ds(lo)} to ${ds(hi)}`}, endpoints included: ${correct}.`,
    };
  }
  if (kind === 3) {
    const h = nz(-5, 5);
    const k = nz(-6, 6, h);
    const up = Math.random() < 0.6;
    const text = `f(x) = ${up ? "" : "−"}(x ${signed$(-h)})² ${signed$(k)}`;
    return {
      key: `dr-quad-${h}-${k}-${up}`,
      prompt: `What is the range of ${text}?`,
      speech: talk(`What is the range of ${text}?`),
      visual: NONE,
      ...label(`y ${up ? "≥" : "≤"} ${ds(k)}`, [`y ${up ? "≤" : "≥"} ${ds(k)}`, `y ${up ? "≥" : "≤"} ${ds(h)}`, "all real numbers", `y ${up ? "≥" : "≤"} ${ds(-k)}`]),
      hint: `A square is never negative, so (x ${signed$(-h)})² is at least 0. What does that make f(x)?`,
      explain: `The squared part is ≥ 0, so f(x) is ${up ? "at least" : "at most"} ${ds(k)}: the range is y ${up ? "≥" : "≤"} ${ds(k)}.`,
    };
  }
  const T = rand(2, 8);
  const cap = rand(8, 20);
  const H = rand(20, 40);
  const price = rand(5, 30);
  const [what, ok, bad] = pick([
    [`C(n) = ${price}n is the cost of n concert tickets.`, "whole numbers 0, 1, 2, …", ["all real numbers", "−10 ≤ n ≤ 10", "numbers between 0 and 1"]],
    [`h(t) is a ball's height t seconds after a throw. It lands at ${T} s.`, `0 ≤ t ≤ ${T}`, ["all real numbers", `t ≥ ${T}`, `−${T} ≤ t ≤ ${T}`]],
    [`V(g) is the value of g gallons in a ${cap}-gallon tank.`, `0 ≤ g ≤ ${cap}`, ["all real numbers", `g ≥ ${cap}`, "whole numbers only, up to 100"]],
    [`P(n) is your pay for n hours. You work at most ${H} hours.`, `0 ≤ n ≤ ${H}`, ["all real numbers", `n ≥ ${H}`, `−${H} ≤ n ≤ ${H}`]],
    [`B(n) is the number of wheels on n bikes.`, "whole numbers 0, 1, 2, …", ["all real numbers", "0 ≤ n ≤ 2", "negative numbers"]],
  ] as [string, string, string[]][]);
  return {
    key: `dr-ctx-${what}`,
    prompt: `${what} Sensible domain?`,
    speech: `${what} What domain makes sense?`,
    visual: NONE,
    ...label(ok, bad),
    hint: "Ask what inputs are possible in real life: can they be negative? fractions? Is there a limit?",
    explain: `In this situation the input can only be ${ok}.`,
  };
}

/** 8.F.B.5, HSF-IF.B.4 — describe a graph: increasing, decreasing, constant, maximum, intercept. */
export function describeGraphs(): Question {
  let ys: number[] = [];
  let types: string[] = [];
  do {
    types = shuffle(["up", "up", "down", "flat"]);
    ys = [rand(1, 7)];
    types.forEach((t) => ys.push(ys[ys.length - 1] + (t === "up" ? rand(1, 3) : t === "down" ? -rand(1, 3) : 0)));
  } while (ys.some((y) => y < 0 || y > 8));
  const xs = [0, 2, 4, 6, 8];
  const segs = types.map((t, i) => ({ t, text: `${xs[i]} < x < ${xs[i + 1]}` }));
  const kind = rand(0, 4);
  const story = kind === 4;
  const visual = graph([0, 8], [0, 9], {
    lines: segs.map((_, i) => ({ from: [xs[i], ys[i]] as [number, number], to: [xs[i + 1], ys[i + 1]] as [number, number], colour: "teal" as const })),
    points: xs.map((x, i) => ({ x, y: ys[i] })),
  });
  const key = `dg-${kind}-${ys.join(".")}`;
  if (kind <= 1 || story) {
    const want = kind === 0 ? "down" : "flat";
    const seg = segs.find((s) => s.t === want)!;
    const wrong = segs.filter((s) => s !== seg).map((s) => s.text);
    if (story) {
      const fmtSeg = (s: string) => s.replace(/(\d+) < x < (\d+)/, "from $1 to $2 min");
      return {
        key,
        prompt: "This graph shows Sam's distance from home (km). When did Sam stop?",
        speech: "The graph shows Sam's distance from home, in kilometers, over time in minutes. During which interval was Sam stopped?",
        visual,
        needsVisual: true,
        ...label(fmtSeg(seg.text), wrong.map(fmtSeg)),
        hint: "If the distance isn't changing, the graph is flat.",
        explain: `The graph is flat ${fmtSeg(seg.text)}: the distance stays the same, so Sam was stopped.`,
      };
    }
    return {
      key,
      prompt: `Where is the function ${want === "down" ? "decreasing" : "constant"}?`,
      speech: `On which interval is the function ${want === "down" ? "decreasing" : "constant"}?`,
      visual,
      needsVisual: true,
      ...label(seg.text, wrong),
      hint: want === "down" ? "Reading left to right, where does the graph go downhill?" : "Where is the graph flat?",
      explain: `From x = ${seg.text.split(" ")[0]} to x = ${seg.text.split(" ")[4]} the graph ${want === "down" ? "goes down, so the function is decreasing" : "is flat, so the function is constant"}.`,
    };
  }
  if (kind === 2) {
    const mx = Math.max(...ys);
    return {
      key,
      prompt: "What is the maximum value of this function?",
      speech: "What is the greatest value of the function on the graph?",
      visual,
      needsVisual: true,
      ...choose(mx, [xs[ys.indexOf(mx)], Math.min(...ys), mx - 1], 1, 0),
      hint: "Find the highest point. Its y-value is the maximum.",
      explain: `The highest point is ${pt(xs[ys.indexOf(mx)], mx)}, so the maximum value is ${mx}.`,
    };
  }
  return {
    key,
    prompt: "What is the y-intercept of this graph?",
    speech: "What is the y-intercept of the graph?",
    visual,
    needsVisual: true,
    ...choose(ys[0], [ys[1], 0, ys[4]], 1, 0),
    hint: "The y-intercept is where the graph meets the y-axis, at x = 0.",
    explain: `At x = 0 the graph is at y = ${ys[0]}.`,
  };
}

/** HSF-IF.B.6 — average rate of change over an interval. */
export function rateOfChange(): Question {
  const kind = rand(0, 3);
  const a = rand(-4, 3);
  const b = rand(a + 1, 5);
  if (kind === 0) {
    const c = rand(-6, 4);
    const f = (x: number) => x * x + c;
    return {
      key: `rc-graph-${a}-${b}-${c}`,
      prompt: `Average rate of change of f(x) = x² ${signed$(c)} from x = ${ds(a)} to x = ${ds(b)}?`,
      speech: talk(`What is the average rate of change of f(x) = x² ${signed$(c)} from x = ${ds(a)} to x = ${ds(b)}?`),
      visual: graph([-6, 6], [-8, 32], {
        curves: [{ fn: f, colour: "grape" }],
        lines: [{ from: [a, f(a)], to: [b, f(b)], colour: "tangerine", dashed: true }],
        points: [{ x: a, y: f(a), label: pt(a, f(a)) }, { x: b, y: f(b), label: pt(b, f(b)) }],
      }),
      ...signed(a + b),
      hint: "Average rate of change = (f(b) − f(a)) ÷ (b − a). It's the slope of the dashed line.",
      explain: `(${ds(f(b))} − ${pa(f(a))}) ÷ (${ds(b)} − ${pa(a)}) = ${ds(f(b) - f(a))} ÷ ${b - a} = ${ds(a + b)}.`,
    };
  }
  if (kind === 1) {
    const k = rand(1, 3);
    const c = rand(-5, 5);
    const f = (x: number) => k * x * x + c;
    const [p, q] = sorted(distinct(2, 0, 5));
    return {
      key: `rc-table-${k}-${c}-${p}-${q}`,
      prompt: `Use the table. Average rate of change from x = ${p} to x = ${q}?`,
      speech: `Use the table. What is the average rate of change of f from x equals ${p} to x equals ${q}?`,
      visual: { kind: "table", header: ["x", "f(x)"], rows: [0, 1, 2, 3, 4, 5].map((x) => [x, f(x)]) },
      needsVisual: true,
      ...signed(k * (p + q)),
      hint: "Change in f(x) ÷ change in x, between the two rows.",
      explain: `(${ds(f(q))} − ${pa(f(p))}) ÷ (${q} − ${p}) = ${ds(f(q) - f(p))} ÷ ${q - p} = ${ds(k * (p + q))}.`,
    };
  }
  if (kind === 2) {
    const t1 = rand(0, 4);
    const t2 = rand(t1 + 1, 6);
    return {
      key: `rc-fall-${t1}-${t2}`,
      prompt: `A stone falls d(t) = 5t² meters. Average speed from t = ${t1} to t = ${t2} s?`,
      speech: `A dropped stone falls d of t equals 5 t squared meters in t seconds. What is its average speed from t equals ${t1} to t equals ${t2} seconds?`,
      visual: NONE,
      ...keypad(5 * (t1 + t2)),
      unit: "m/s",
      hint: "Average speed = change in distance ÷ change in time.",
      explain: `d(${t2}) = ${5 * t2 * t2}, d(${t1}) = ${5 * t1 * t1}. (${5 * t2 * t2} − ${5 * t1 * t1}) ÷ ${t2 - t1} = ${5 * (t1 + t2)} m/s.`,
    };
  }
  const m = nz(-6, 6);
  const c = rand(-9, 9);
  return {
    key: `rc-lin-${m}-${c}-${a}-${b}`,
    prompt: `f(x) = ${lin(m, c)}. Average rate of change from x = ${ds(a)} to x = ${ds(b)}?`,
    speech: talk(`f(x) = ${lin(m, c)}. What is its average rate of change from x = ${ds(a)} to x = ${ds(b)}?`),
    visual: NONE,
    ...signed(m),
    hint: "Work it out, or remember what's special about the rate of change of a line.",
    explain: `For a linear function the rate of change is the same everywhere: it's the slope, ${ds(m)}.`,
  };
}

/** 8.F.A.2, HSF-IF.C.9 — compare functions shown in different ways. */
export function compareFunctions(): Question {
  const kind = rand(0, 4);
  const m1 = nz(-6, 6);
  const m2 = nz(-6, 6, m1);
  const b1 = rand(-8, 8);
  const b2 = nz(-8, 8, b1);
  const table: Visual = { kind: "table", header: ["x", "A: y"], rows: [0, 1, 2, 3].map((x) => [x, m1 * x + b1]) };
  const A = "Function A";
  const B = "Function B";
  if (kind === 0 || kind === 4) {
    const diff = Math.abs(m1 - m2);
    return {
      key: `cf-rate-${kind}-${m1}-${b1}-${m2}-${b2}`,
      prompt: kind === 0 ? `A is in the table. B is y = ${lin(m2, b2)}. Which has the greater rate of change?` : `A is in the table. B is y = ${lin(m2, b2)}. Difference between their rates?`,
      speech: talk(`Function A is shown in the table. Function B is y = ${lin(m2, b2)}. ${kind === 0 ? "Which has the greater rate of change?" : "How far apart are their rates of change?"}`),
      visual: table,
      needsVisual: true,
      ...(kind === 0 ? yesNo(m1 > m2, A, B) : keypad(diff)),
      hint: "A's rate: how much y changes per step in the table. B's rate: the number in front of x.",
      explain: `A's rate is ${ds(m1)}; B's is ${ds(m2)}. ${m1 > m2 ? "A" : "B"} is greater, by ${diff}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `cf-int-${m1}-${b1}-${m2}-${b2}`,
      prompt: `A is in the table. B is y = ${lin(m2, b2)}. Which starts higher (at x = 0)?`,
      speech: talk(`Function A is in the table. Function B is y = ${lin(m2, b2)}. Which has the greater initial value, at x = 0?`),
      visual: table,
      needsVisual: true,
      ...yesNo(b1 > b2, A, B),
      hint: "The initial value is y when x = 0: read it from the table, and it's b in y = mx + b.",
      explain: `A starts at ${ds(b1)}, B at ${ds(b2)}, so ${b1 > b2 ? "A" : "B"} starts higher.`,
    };
  }
  if (kind === 2) {
    const [p, q] = pick(NICE_SLOPES);
    const b = rand(-3, 3);
    const mA = p / q;
    const mB = pick([mA + pick([-1, 1]), -mA, mA * 2]);
    return {
      key: `cf-graph-${p}-${q}-${b}-${mB}`,
      prompt: `A is graphed. B is y = ${mB === Math.round(mB) ? lin(mB, 1) : `${ds(mB)}x + 1`}. Which is steeper upward?`.replace("steeper upward", "has the greater slope"),
      speech: talk(`Function A is on the graph. Function B is y = ${ds(mB)}x + 1. Which has the greater slope?`),
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(mA, b), colour: "grape", label: "A" }] }),
      needsVisual: true,
      ...yesNo(mA > mB, A, B),
      hint: "Find A's slope as rise over run on the graph, then compare numbers (negative is less than positive).",
      explain: `A's slope is ${fracStr(p, q)} and B's is ${ds(mB)}, so ${mA > mB ? "A" : "B"} has the greater slope.`,
    };
  }
  const h1 = rand(-3, 3);
  const k1 = rand(-5, 5);
  const h2 = rand(-3, 3);
  const k2 = nz(-5, 5, k1);
  return {
    key: `cf-quad-${h1}-${k1}-${h2}-${k2}`,
    prompt: `f(x) = (x ${signed$(-h1)})² ${signed$(k1)}. g is graphed. Which has the smaller minimum?`.replace("(x + 0)", "x").replace("(x − 0)", "x"),
    speech: talk(`f(x) = (x ${signed$(-h1)})² ${signed$(k1)}. g is on the graph. Which function has the smaller minimum value?`),
    visual: graph([-6, 6], [-6, 10], { curves: [{ fn: (x) => (x - h2) ** 2 + k2, colour: "berry", label: "g" }], points: [{ x: h2, y: k2 }] }),
    needsVisual: true,
    ...yesNo(k1 < k2, "f", "g"),
    hint: "f's minimum is the number added after the square. g's minimum is the lowest point of its graph.",
    explain: `f's minimum is ${ds(k1)}; g's lowest point is ${pt(h2, k2)}, so its minimum is ${ds(k2)}. ${k1 < k2 ? "f" : "g"} is smaller.`,
  };
}

/** HSF-BF.A.1a–c, 8.F.B.4 — build functions from descriptions; combine and compose them. */
export function buildFunctions(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const [thing, unit, v] = pick([["A taxi", "per mile", "m"], ["A bike rental", "per hour", "h"], ["A phone plan", "per GB", "g"], ["A plumber", "per hour", "h"]]);
    const s = rand(2, 9);
    const r = nz(2, 9, s);
    return {
      key: `bf-desc-${thing}-${s}-${r}`,
      prompt: `${thing} costs $${s} plus $${r} ${unit}. Which function gives the cost?`,
      speech: `${thing} costs ${s} dollars plus ${r} dollars ${unit}. Which function gives the total cost?`,
      visual: NONE,
      ...label(`C(${v}) = ${r}${v} + ${s}`, [`C(${v}) = ${s}${v} + ${r}`, `C(${v}) = ${r + s}${v}`, `C(${v}) = ${r}(${v} + ${s})`]),
      hint: "The rate multiplies the input. The fixed charge is added once.",
      explain: `$${r} for each ${unit.replace("per ", "")} plus a one-time $${s}: C(${v}) = ${r}${v} + ${s}.`,
    };
  }
  if (kind === 1) {
    const r = rand(2, 15) * 5;
    const s = rand(1, 10) * 5;
    const x1 = rand(1, 4);
    const x2 = x1 + rand(1, 4);
    const askRate = Math.random() < 0.5;
    return {
      key: `bf-two-${r}-${s}-${x1}-${x2}-${askRate}`,
      prompt: `A job costs $${s + r * x1} for ${x1} h and $${s + r * x2} for ${x2} h. ${askRate ? "Hourly rate?" : "Starting fee?"}`,
      speech: `A repair costs ${s + r * x1} dollars for ${x1} hours and ${s + r * x2} dollars for ${x2} hours. The cost is linear. What is ${askRate ? "the hourly rate" : "the fixed starting fee"}?`,
      visual: NONE,
      ...keypad(askRate ? r : s),
      prefix: "$",
      hint: askRate ? "Rate = change in cost ÷ change in hours." : "Find the hourly rate first, then work back to 0 hours.",
      explain: `Rate = (${s + r * x2} − ${s + r * x1}) ÷ ${x2 - x1} = $${r} per hour. At 0 hours: ${s + r * x1} − ${r} × ${x1} = $${s}.`,
    };
  }
  const a = nz(-4, 5);
  const b = rand(-6, 6);
  const c = nz(-4, 5);
  const d = rand(-6, 6);
  const f = (x: number) => a * x + b;
  const g = (x: number) => c * x + d;
  const k = rand(-3, 4);
  const defs = `f(x) = ${lin(a, b)}, g(x) = ${lin(c, d)}.`;
  if (kind === 2) {
    const [sym, val, word] = pick([["+", f(k) + g(k), "sum"], ["−", f(k) - g(k), "difference"], ["·", f(k) * g(k), "product"]] as [string, number, string][]);
    return {
      key: `bf-ops-${a}-${b}-${c}-${d}-${k}-${sym}`,
      prompt: `${defs} Find (f ${sym} g)(${ds(k)}).`,
      speech: talk(`${defs} What is the ${word}, f ${sym} g, at x = ${ds(k)}?`),
      visual: NONE,
      ...signed(val),
      hint: `Find f(${ds(k)}) and g(${ds(k)}) first, then combine them.`,
      explain: `f(${ds(k)}) = ${ds(f(k))}, g(${ds(k)}) = ${ds(g(k))}, so (f ${sym} g)(${ds(k)}) = ${ds(val)}.`,
    };
  }
  if (kind === 3) {
    return {
      key: `bf-comp-${a}-${b}-${c}-${d}-${k}`,
      prompt: `${defs} Find f(g(${ds(k)})).`,
      speech: talk(`${defs} What is f of g of ${ds(k)}?`),
      visual: NONE,
      ...signed(f(g(k))),
      hint: "Work from the inside out: find g first, then put that answer into f.",
      explain: `g(${ds(k)}) = ${ds(g(k))}, then f(${ds(g(k))}) = ${ds(f(g(k)))}.`,
    };
  }
  if (kind === 4) {
    const p = nz(-6, 6);
    const q = rand(2, 5);
    const fg = Math.random() < 0.5;
    const correct = fg ? lin(q, p) : lin(q, q * p);
    return {
      key: `bf-sym-${p}-${q}-${fg}`,
      prompt: `f(x) = ${lin(1, p)} and g(x) = ${q}x. Which is ${fg ? "f(g(x))" : "g(f(x))"}?`,
      speech: talk(`f(x) = ${lin(1, p)} and g(x) = ${q}x. What is ${fg ? "f of g of x" : "g of f of x"}?`),
      visual: NONE,
      ...label(correct, [fg ? lin(q, q * p) : lin(q, p), poly([q, p * q, 0]), lin(q + 1, p), poly([q, p, 0])]),
      hint: fg ? "Replace the x in f with g(x)." : "Replace the x in g with f(x), then distribute.",
      explain: fg ? `f(g(x)) = (${q}x) ${signed$(p)} = ${correct}.` : `g(f(x)) = ${q}(${lin(1, p)}) = ${correct}.`,
    };
  }
  const price = rand(8, 20);
  const cost = rand(2, price - 3);
  const fixed = rand(4, 20) * 10;
  return {
    key: `bf-profit-${price}-${cost}-${fixed}`,
    prompt: `Revenue R(x) = ${price}x. Cost C(x) = ${cost}x + ${fixed}. Profit P(x) = R(x) − C(x) is…`,
    speech: `A business has revenue R of x equals ${price} x and cost C of x equals ${cost} x plus ${fixed}. What is the profit function, R minus C?`,
    visual: NONE,
    ...label(`P(x) = ${lin(price - cost, -fixed)}`, [`P(x) = ${lin(price - cost, fixed)}`, `P(x) = ${lin(price + cost, -fixed)}`, `P(x) = ${lin(cost - price, fixed)}`]),
    hint: "Subtract the whole cost: the minus sign applies to both parts of C(x).",
    explain: `${price}x − (${cost}x + ${fixed}) = ${lin(price - cost, -fixed)}.`,
  };
}

/** "x − 3", "x + 2", "x". */
const inner = (h: number) => (h === 0 ? "x" : `x ${h > 0 ? "−" : "+"} ${Math.abs(h)}`);
/** " + 4", " − 1", "". */
const tail = (k: number) => (k === 0 ? "" : ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}`);

const FAMILIES: { name: string; text: (h: number, k: number) => string; fn: (h: number, k: number) => (x: number) => number }[] = [
  { name: "abs", text: (h, k) => `y = |${inner(h)}|${tail(k)}`, fn: (h, k) => (x) => Math.abs(x - h) + k },
  { name: "sqrt", text: (h, k) => `y = √(${inner(h)})${tail(k)}`, fn: (h, k) => (x) => (x < h ? NaN : Math.sqrt(x - h) + k) },
  { name: "cbrt", text: (h, k) => `y = ∛(${inner(h)})${tail(k)}`, fn: (h, k) => (x) => Math.cbrt(x - h) + k },
  { name: "square", text: (h, k) => `y = (${inner(h)})²${tail(k)}`, fn: (h, k) => (x) => (x - h) ** 2 + k },
  { name: "recip", text: (h, k) => `y = 1/(${inner(h)})${tail(k)}`, fn: (h, k) => (x) => (Math.abs(x - h) < 0.05 ? NaN : 1 / (x - h) + k) },
];

/** HSF-IF.C.7b, HSF-IF.C.7d — square root, cube root, absolute value, piecewise, step and rational graphs. */
export function functionFamilies(): Question {
  const kind = rand(0, 4);
  const h = nz(-3, 3);
  const k = nz(-3, 3);
  if (kind === 0) {
    const fam = pick(FAMILIES);
    const others = shuffle(FAMILIES.filter((f) => f !== fam));
    return {
      key: `ff-graph-${fam.name}-${h}-${k}`,
      prompt: "Which equation matches the graph?",
      speech: "Which equation matches the graph?",
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: fam.fn(h, k), colour: "grape" }] }),
      needsVisual: true,
      ...label(fam.text(h, k), [fam.text(-h, k), fam.text(h, -k), others[0].text(h, k), others[1].text(h, k)]),
      hint: "First name the shape (V, half-parabola, S-curve, U, or two branches). Then find the shift: x − h moves right h, + k moves up k.",
      explain: `The shape is ${fam.text(0, 0).replace("y = ", "y = ")} moved ${h > 0 ? "right" : "left"} ${Math.abs(h)} and ${k > 0 ? "up" : "down"} ${Math.abs(k)}: ${fam.text(h, k)}.`,
    };
  }
  if (kind === 1) {
    const c = rand(-2, 2);
    const a = rand(-3, 4);
    const b = rand(2, 8);
    const v = rand(-4, 5);
    const val = v < c ? v + a : b - v;
    const text = `f(x) = x${tail(a)} if x < ${ds(c)}; ${b} − x if x ≥ ${ds(c)}`;
    return {
      key: `ff-piece-${c}-${a}-${b}-${v}`,
      prompt: `${text}. Find f(${ds(v)}).`,
      speech: talk(`f of x is x${tail(a)} when x is less than ${ds(c)}, and ${b} − x when x is ${ds(c)} or more. What is f(${ds(v)})?`),
      visual: graph([-6, 6], [-6, 10], {
        lines: [
          { from: [-6, -6 + a], to: [c, c + a], colour: "grape" },
          { from: [c, b - c], to: [6, b - 6], colour: "grape" },
        ],
        points: [{ x: c, y: c + a, open: true }, { x: c, y: b - c }],
      }),
      ...signed(val),
      hint: `First decide which rule applies: is ${ds(v)} less than ${ds(c)}?`,
      explain: `${ds(v)} ${v < c ? "<" : "≥"} ${ds(c)}, so use ${v < c ? `x${tail(a)}` : `${b} − x`}: f(${ds(v)}) = ${ds(val)}.`,
    };
  }
  if (kind === 2) {
    const vert = Math.random() < 0.5;
    const text = FAMILIES[4].text(h, k);
    return {
      key: `ff-asym-${h}-${k}-${vert}`,
      prompt: `Graph of ${text}: where is the ${vert ? "vertical" : "horizontal"} asymptote?`,
      speech: talk(`For the graph of ${text}, where is the ${vert ? "vertical" : "horizontal"} asymptote?`),
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: FAMILIES[4].fn(h, k), colour: "berry" }] }),
      ...label(vert ? `x = ${ds(h)}` : `y = ${ds(k)}`, vert ? [`x = ${ds(-h)}`, `y = ${ds(k)}`, `x = ${ds(k)}`] : [`y = ${ds(-k)}`, `x = ${ds(h)}`, `y = ${ds(h)}`]),
      hint: vert ? "You can't divide by zero. Which x makes the bottom 0?" : "As x gets huge, 1/(…) gets close to 0. What is y close to then?",
      explain: vert ? `The bottom is 0 when x = ${ds(h)}, so the vertical asymptote is x = ${ds(h)}.` : `1/(${inner(h)}) → 0 far away, so y → ${ds(k)}: the horizontal asymptote is y = ${ds(k)}.`,
    };
  }
  if (kind === 3) {
    const a = pick([1, 2, -1, -2]);
    const text = `y = ${a === 1 ? "" : a === -1 ? "−" : a}|${inner(h)}|${tail(k)}`;
    return {
      key: `ff-vertex-${a}-${h}-${k}`,
      prompt: `What is the vertex of ${text}?`,
      speech: talk(`Where is the vertex, the corner point, of ${text}?`),
      visual: NONE,
      ...label(pt(h, k), [pt(-h, k), pt(k, h), pt(h, -k), pt(-h, -k)]),
      hint: "The corner is where the inside of the absolute value is 0.",
      explain: `${inner(h)} = 0 when x = ${ds(h)}, and then y = ${ds(k)}. The vertex is ${pt(h, k)}${a < 0 ? " (it opens down)" : ""}.`,
    };
  }
  const whole = rand(-5, 5);
  const tenth = rand(1, 9);
  const x = whole + (whole < 0 ? -tenth / 10 : tenth / 10);
  const ans = Math.floor(x);
  return {
    key: `ff-floor-${whole}-${tenth}`,
    prompt: `The floor function ⌊x⌋ rounds down to an integer. Find ⌊${ds(x)}⌋.`,
    speech: talk(`The floor function rounds down to the integer at or below x. What is the floor of ${ds(x)}?`),
    visual: graph([-6, 6], [-6, 6], { curves: [{ fn: (t) => (Math.abs(t - Math.round(t)) < 0.03 ? NaN : Math.floor(t)), colour: "teal" }] }),
    ...signed(ans),
    hint: "Round DOWN, toward the left on the number line, even for negatives.",
    explain: `The integer at or just below ${ds(x)} is ${ds(ans)}.${x < 0 ? ` (Down from a negative goes further from 0: not ${ds(ans + 1)}.)` : ""}`,
  };
}

/** HSF-IF.A.3, HSF-BF.A.2 — arithmetic and geometric sequences, recursive and explicit. */
export function sequences(): Question {
  const kind = rand(0, 5);
  const a1 = rand(-5, 12);
  const d = nz(-6, 8);
  if (kind === 0) {
    const nums = [0, 1, 2, 3].map((i) => a1 + i * d);
    return {
      key: `sq-arith-${a1}-${d}`,
      prompt: "What's the next term of this arithmetic sequence?",
      speech: talk(`${nums.join(", ")}. What comes next?`),
      visual: { kind: "sequence", numbers: nums, next: a1 + 4 * d },
      ...signed(a1 + 4 * d),
      hint: "Find the common difference: subtract any term from the next.",
      explain: `The common difference is ${ds(d)}, so the next term is ${ds(nums[3])} ${signed$(d)} = ${ds(a1 + 4 * d)}.`,
    };
  }
  if (kind === 1) {
    const g1 = rand(1, 5);
    const r = pick([2, 3, -2, 4]);
    const nums = [0, 1, 2, 3].map((i) => g1 * r ** i);
    return {
      key: `sq-geo-${g1}-${r}`,
      prompt: "What's the next term of this geometric sequence?",
      speech: talk(`${nums.join(", ")}. What comes next?`),
      visual: { kind: "sequence", numbers: nums, next: g1 * r ** 4 },
      ...signed(g1 * r ** 4),
      hint: "Find the common ratio: divide any term by the one before.",
      explain: `Each term is multiplied by ${ds(r)}: ${ds(nums[3])} × ${pa(r)} = ${ds(g1 * r ** 4)}.`,
    };
  }
  if (kind === 2) {
    const c = a1 - d;
    const nums = [0, 1, 2, 3].map((i) => a1 + i * d);
    return {
      key: `sq-form-${a1}-${d}`,
      prompt: `Which formula gives the nth term of ${nums.join(", ")}, …?`,
      speech: talk(`Which formula gives the n-th term of ${nums.join(", ")}?`),
      visual: NONE,
      ...label(`aₙ = ${lin(d, c, "n")}`, [`aₙ = ${lin(a1, d, "n")}`, `aₙ = ${lin(d, a1, "n")}`, `aₙ = ${lin(-d, c, "n")}`, `aₙ = ${lin(d, c + 1, "n")}`]),
      hint: "aₙ = a₁ + (n − 1)d. The number in front of n is the common difference.",
      explain: `aₙ = ${ds(a1)} + (n − 1)(${ds(d)}) = ${lin(d, c, "n")}. Check: n = 1 gives ${ds(a1)}.`,
    };
  }
  if (kind === 3) {
    const n = rand(10, 50);
    return {
      key: `sq-nth-${a1}-${d}-${n}`,
      prompt: `An arithmetic sequence starts ${ds(a1)}, ${ds(a1 + d)}, ${ds(a1 + 2 * d)}, … Find term ${n}.`,
      speech: talk(`An arithmetic sequence starts ${ds(a1)}, ${ds(a1 + d)}, ${ds(a1 + 2 * d)}. What is term number ${n}?`),
      visual: NONE,
      ...signed(a1 + (n - 1) * d),
      hint: `Term n = first term + (n − 1) × difference. From term 1 to term ${n} is ${n - 1} steps.`,
      explain: `${ds(a1)} + ${n - 1} × ${pa(d)} = ${ds(a1 + (n - 1) * d)}.`,
    };
  }
  if (kind === 4) {
    const geo = Math.random() < 0.5;
    const s = rand(1, 6);
    const r = pick([2, 3]);
    const val = geo ? s * r ** 3 : a1 + 3 * d;
    return {
      key: `sq-rec-${geo}-${s}-${r}-${a1}-${d}`,
      prompt: geo ? `a₁ = ${s}, aₙ = ${r}·aₙ₋₁. Find a₄.` : `a₁ = ${ds(a1)}, aₙ = aₙ₋₁ ${signed$(d)}. Find a₄.`,
      speech: talk(geo ? `a₁ = ${s}, and each term is ${r} times the one before. What is a₄?` : `a₁ = ${ds(a1)}, and each term is the one before ${signed$(d)}. What is a₄?`),
      visual: NONE,
      ...signed(val),
      hint: "A recursive rule builds each term from the one before. Write out a₂, a₃, then a₄.",
      explain: geo ? `${s}, ${s * r}, ${s * r * r}, ${val}: a₄ = ${val}.` : `${[0, 1, 2, 3].map((i) => ds(a1 + i * d)).join(", ")}: a₄ = ${ds(val)}.`,
    };
  }
  const s = rand(2, 9);
  const r = pick([2, 3, 4, 5]);
  return {
    key: `sq-r2e-${s}-${r}`,
    prompt: `a₁ = ${s}, aₙ = ${r}·aₙ₋₁. Which explicit formula matches?`,
    speech: talk(`a₁ = ${s}, and each term is ${r} times the one before. Which explicit formula matches?`),
    visual: NONE,
    ...label(`aₙ = ${s}·${r}ⁿ⁻¹`, [`aₙ = ${r}·${s}ⁿ⁻¹`, `aₙ = ${s}·${r}ⁿ`, `aₙ = ${s} + ${r}(n − 1)`]),
    hint: "Term 1 has no factors of the ratio yet, term 2 has one, term 3 has two… so term n has n − 1.",
    explain: `a₁ = ${s}, then multiply by ${r} each step: aₙ = ${s}·${r}ⁿ⁻¹. Check: a₂ = ${s * r}.`,
  };
}

/* ==================================================================== 6. Systems */

/** Two different whole-number slopes through (x0, y0), with small intercepts. */
function twoLines(): { x0: number; y0: number; m1: number; b1: number; m2: number; b2: number } {
  for (;;) {
    const x0 = rand(-4, 4);
    const y0 = rand(-4, 4);
    const m1 = nz(-3, 3);
    const m2 = nz(-3, 3, m1);
    const b1 = y0 - m1 * x0;
    const b2 = y0 - m2 * x0;
    if (Math.abs(b1) <= 6 && Math.abs(b2) <= 6) return { x0, y0, m1, b1, m2, b2 };
  }
}

/** 8.EE.C.8a, HSA-REI.D.11 — solutions of a system are where the graphs cross. */
export function systemsGraph(): Question {
  const kind = rand(0, 2);
  const { x0, y0, m1, b1, m2, b2 } = twoLines();
  if (kind === 0) {
    return {
      key: `sg-read-${x0}-${y0}-${m1}-${m2}`,
      prompt: `Solve by graphing: y = ${lin(m1, b1)} and y = ${lin(m2, b2)}.`,
      speech: talk(`The graphs of y = ${lin(m1, b1)} and y = ${lin(m2, b2)} are shown. What is the solution of the system?`),
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(m1, b1), colour: "wave" }, { fn: lineFn(m2, b2), colour: "berry" }] }),
      needsVisual: true,
      ...label(pt(x0, y0), [pt(y0, x0), pt(x0, -y0), pt(0, b1), pt(-x0, y0), pt(0, b2), pt(x0 + 1, y0), pt(x0, y0 - 1), pt(x0 - 1, y0 + 1)]),
      hint: "The solution is the point on both lines: where they cross.",
      explain: `The lines cross at ${pt(x0, y0)}. Check: ${ds(m1)} × ${pa(x0)} ${signed$(b1)} = ${ds(y0)} and ${ds(m2)} × ${pa(x0)} ${signed$(b2)} = ${ds(y0)}.`,
    };
  }
  if (kind === 1) {
    const [r1, r2] = sorted(distinct(2, -3, 3));
    const c = rand(-4, 1);
    const m = r1 + r2;
    const d = c - r1 * r2;
    return {
      key: `sg-curve-${r1}-${r2}-${c}`,
      prompt: `f(x) = x² ${signed$(c)} and g(x) = ${lin(m, d)}. For which x is f(x) = g(x)?`.replace(" + 0", ""),
      speech: talk(`f(x) = x² ${signed$(c)} and g(x) = ${lin(m, d)} are graphed. For which x-values does f(x) equal g(x)?`),
      visual: graph([-6, 6], [-6, 14], { curves: [{ fn: (x) => x * x + c, colour: "grape", label: "f" }, { fn: lineFn(m, d), colour: "tangerine", label: "g" }] }),
      needsVisual: true,
      ...label(`x = ${ds(r1)} or x = ${ds(r2)}`, [`x = ${ds(-r2)} or x = ${ds(-r1)}`, `x = ${ds(r1 * r1 + c)} or x = ${ds(r2 * r2 + c)}`, `x = ${ds(r1)} only`, `x = ${ds(r2)} only`]),
      hint: "f(x) = g(x) where the two graphs meet. Read the x-coordinates of the crossing points.",
      explain: `The graphs meet at x = ${ds(r1)} and x = ${ds(r2)}. Check: f(${ds(r1)}) = g(${ds(r1)}) = ${ds(r1 * r1 + c)}.`,
    };
  }
  const onBoth = Math.random() < 0.5;
  const p = onBoth ? [x0, y0] : [x0 + 1, y0 + m1];
  return {
    key: `sg-check-${x0}-${y0}-${m1}-${m2}-${onBoth}`,
    prompt: `Is ${pt(p[0], p[1])} a solution of y = ${lin(m1, b1)} and y = ${lin(m2, b2)}?`,
    speech: talk(`Is ${pt(p[0], p[1])} a solution of the system y = ${lin(m1, b1)} and y = ${lin(m2, b2)}?`),
    visual: NONE,
    ...yesNo(onBoth),
    hint: "A solution must make BOTH equations true. Test the point in each.",
    explain: onBoth
      ? `It works in both equations, so it's the solution.`
      : `It works in the first equation (${ds(m1)} × ${pa(p[0])} ${signed$(b1)} = ${ds(p[1])}) but not the second, so it's not a solution of the system.`,
  };
}

/** 8.EE.C.8b, HSA-REI.C.6 — solve systems by substitution. */
export function substitution(): Question {
  const kind = rand(0, 3);
  const x0 = rand(-5, 6);
  const y0 = rand(-5, 6);
  const askX = Math.random() < 0.5;
  if (kind === 0 || kind === 3) {
    const m = nz(-3, 4);
    const b = y0 - m * x0;
    const a = nz(-4, 5);
    const c = nz(-3, 4);
    if (a + c * m === 0) return substitution();
    const d = a * x0 + c * y0;
    const e1 = `y = ${lin(m, b)}`;
    const e2 = `${twoVar(a, c)} = ${ds(d)}`;
    if (kind === 3) {
      const inner = `(${lin(m, b)})`;
      const correct = `${lin(a, 0)} ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}${inner} = ${ds(d)}`;
      return {
        key: `su-sub-${m}-${b}-${a}-${c}-${d}`,
        prompt: `Substitute ${e1} into ${e2}. What do you get?`,
        speech: talk(`Substitute ${e1} into ${e2}. Which equation do you get?`),
        visual: NONE,
        ...label(correct, [
          `${lin(a, 0)} ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}${lin(m, 0)} = ${ds(d)}`,
          `${lin(m, b)} ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}y = ${ds(d)}`,
          `${lin(a, 0)} ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}${inner} = ${ds(d)}y`,
        ]),
        hint: "Replace y, all of it, with the expression it equals. Keep brackets around it.",
        explain: `y is ${lin(m, b)}, so swap it in for y: ${correct}. Now there's only one variable.`,
      };
    }
    return {
      key: `su-0-${m}-${b}-${a}-${c}-${x0}-${askX}`,
      prompt: `Solve: ${e1} and ${e2}. Find ${askX ? "x" : "y"}.`,
      speech: talk(`Solve the system ${e1} and ${e2}. What is ${askX ? "x" : "y"}?`),
      visual: NONE,
      ...signed(askX ? x0 : y0),
      hint: `Replace y in the second equation with ${lin(m, b)}, solve for x${askX ? "" : ", then find y"}.`,
      explain: `${lin(a, 0)} + ${pa(c)}(${lin(m, b)}) = ${ds(d)} → ${lin(a + c * m, c * b)} = ${ds(d)} → x = ${ds(x0)}. Then y = ${ds(y0)}.`,
    };
  }
  if (kind === 1) {
    const { x0: X, y0: Y, m1, b1, m2, b2 } = twoLines();
    return {
      key: `su-1-${m1}-${b1}-${m2}-${b2}-${askX}`,
      prompt: `Solve: y = ${lin(m1, b1)} and y = ${lin(m2, b2)}. Find ${askX ? "x" : "y"}.`,
      speech: talk(`Solve the system y = ${lin(m1, b1)} and y = ${lin(m2, b2)}. What is ${askX ? "x" : "y"}?`),
      visual: NONE,
      ...signed(askX ? X : Y),
      hint: "Both expressions equal y, so set them equal to each other.",
      explain: `${lin(m1, b1)} = ${lin(m2, b2)} → ${lin(m1 - m2, 0)} = ${ds(b2 - b1)} → x = ${ds(X)}, and y = ${ds(Y)}.`,
    };
  }
  const p = nz(-3, 3);
  const q = x0 - p * y0;
  const a = nz(-3, 4);
  const b = nz(-4, 4, -a * p);
  const c = a * x0 + b * y0;
  return {
    key: `su-2-${p}-${q}-${a}-${b}-${y0}`,
    prompt: `Solve: x = ${lin(p, q, "y")} and ${twoVar(a, b)} = ${ds(c)}. Find y.`,
    speech: talk(`Solve the system x = ${lin(p, q, "y")} and ${twoVar(a, b)} = ${ds(c)}. What is y?`),
    visual: NONE,
    ...signed(y0),
    hint: "Replace x in the second equation with the expression for x.",
    explain: `${a === 1 ? "" : a === -1 ? "−" : ds(a)}(${lin(p, q, "y")}) ${signed$(b)}y = ${ds(c)} → ${lin(a * p + b, a * q, "y")} = ${ds(c)} → y = ${ds(y0)}.`,
  };
}

/** HSA-REI.C.5, HSA-REI.C.6, 8.EE.C.8b — solve systems by elimination; why it works. */
export function elimination(): Question {
  const kind = rand(0, 4);
  const x0 = rand(-5, 6);
  const y0 = rand(-5, 6);
  const a1 = rand(1, 5);
  const a2 = rand(1, 5);
  const b = rand(1, 5);
  const c1 = a1 * x0 + b * y0;
  const c2 = a2 * x0 - b * y0;
  const e1 = `${twoVar(a1, b)} = ${ds(c1)}`;
  const e2 = `${twoVar(a2, -b)} = ${ds(c2)}`;
  if (kind <= 1) {
    const askX = kind === 0;
    return {
      key: `el-${kind}-${a1}-${a2}-${b}-${x0}-${y0}`,
      prompt: `Solve: ${e1} and ${e2}. Find ${askX ? "x" : "y"}.`,
      speech: talk(`Solve the system ${e1} and ${e2}. What is ${askX ? "x" : "y"}?`),
      visual: NONE,
      ...signed(askX ? x0 : y0),
      hint: "The y terms are opposites. Add the equations to eliminate y.",
      explain: `Adding: ${lin(a1 + a2, 0)} = ${ds(c1 + c2)}, so x = ${ds(x0)}. Then ${a1 === 1 ? "" : a1}(${ds(x0)}) + ${b === 1 ? "" : b}y = ${ds(c1)} gives y = ${ds(y0)}.`,
    };
  }
  if (kind === 2) {
    const correct = `${lin(a1 + a2, 0)} = ${ds(c1 + c2)}`;
    return {
      key: `el-add-${a1}-${a2}-${b}-${x0}-${y0}`,
      prompt: `Add the equations ${e1} and ${e2}. What do you get?`,
      speech: talk(`Add the equations ${e1} and ${e2}. What new equation do you get?`),
      visual: NONE,
      ...label(correct, [`${twoVar(a1 + a2, 2 * b)} = ${ds(c1 + c2)}`, `${lin(a1 - a2 || 1, 0)} = ${ds(c1 - c2)}`, `${lin(a1 + a2, 0)} = ${ds(c1 - c2)}`]),
      hint: "Add the left sides together and the right sides together. What happens to +y and −y?",
      explain: `${b}y and −${b}y cancel: (${a1} + ${a2})x = ${ds(c1)} + ${pa(c2)}, so ${correct}.`,
    };
  }
  if (kind === 3) {
    const k = rand(2, 4);
    const A1 = rand(1, 5);
    const A2 = nz(-4, 5);
    const B2 = rand(1, 3);
    const B1 = -k * B2;
    const C1 = A1 * x0 + B1 * y0;
    const C2 = A2 * x0 + B2 * y0;
    return {
      key: `el-mult-${A1}-${A2}-${B2}-${k}-${x0}-${y0}`,
      prompt: `${twoVar(A1, B1)} = ${ds(C1)}; ${twoVar(A2, B2)} = ${ds(C2)}. Multiply eq. 2 by what to cancel y?`,
      speech: talk(`The system is ${twoVar(A1, B1)} = ${ds(C1)} and ${twoVar(A2, B2)} = ${ds(C2)}. What should you multiply the second equation by, so adding cancels y?`),
      visual: NONE,
      ...choose(k, [-k, B2, k * B2, k + 1], 1),
      hint: `You need +${k * B2}y to cancel −${k * B2}y.`,
      explain: `${k} × ${B2 === 1 ? "" : B2}y = ${k * B2}y, which cancels −${k * B2}y when you add.`,
    };
  }
  return {
    key: `el-why-${a1}-${a2}-${b}-${x0}-${y0}`,
    prompt: `Replace ${e1} with its sum with ${e2}. The new system has…`,
    speech: talk(`In the system ${e1} and ${e2}, you replace the first equation with the sum of the two. What does the new system have?`),
    visual: NONE,
    ...label("the same solution", ["a different solution", "no solution", "twice as many solutions"]),
    hint: "Any point that makes both equations true also makes their sum true.",
    explain: `${pt(x0, y0)} works in both equations, so it works in their sum too, and the steps can be undone. The solution doesn't change.`,
  };
}

/** 8.EE.C.8a, 8.EE.C.8b — systems with one, no or infinitely many solutions. */
export function systemCount(): Question {
  const kind = rand(0, 2);
  const m = nz(-4, 4);
  const b = rand(-5, 5);
  const type = pick([SOL_ONE, SOL_NONE, SOL_ALL]);
  const m2 = type === SOL_ONE ? nz(-4, 4, m) : m;
  const b2 = type === SOL_NONE ? nz(-5, 5, b) : type === SOL_ALL ? b : rand(-5, 5);
  if (kind <= 1) {
    const k = rand(2, 3);
    const second = type === SOL_ALL ? `${twoVar(-k * m, k)} = ${ds(k * b)}` : `y = ${lin(m2, b2)}`;
    return {
      key: `sc-${kind}-${m}-${b}-${m2}-${b2}-${type}`,
      prompt: `How many solutions: y = ${lin(m, b)} and ${second}?`,
      speech: talk(`How many solutions does the system y = ${lin(m, b)} and ${second} have?`),
      visual: kind === 1 && type !== SOL_ALL ? graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(m, b), colour: "wave" }, { fn: lineFn(m2, b2), colour: "berry" }] }) : NONE,
      ...label(type, [SOL_ONE, SOL_NONE, SOL_ALL].filter((s) => s !== type)),
      hint: "Compare slopes and intercepts. Different slopes cross once; same slope, different intercept never meet; the same line meets everywhere.",
      explain:
        type === SOL_ONE
          ? "The slopes are different, so the lines cross exactly once."
          : type === SOL_NONE
            ? "Same slope, different intercepts: parallel lines never meet, so there's no solution."
            : `Rearranged, the second equation is y = ${lin(m, b)}: the same line, so every point on it is a solution.`,
    };
  }
  const A = rand(1, 5);
  const B = rand(1, 5);
  const C = rand(-9, 12);
  const k = rand(2, 4);
  return {
    key: `sc-k-${A}-${B}-${C}-${k}`,
    prompt: `${twoVar(A, B)} = ${ds(C)} and ${twoVar(k * A, k * B)} = ?. What gives infinitely many solutions?`,
    speech: talk(`The system is ${twoVar(A, B)} = ${ds(C)} and ${twoVar(k * A, k * B)} = what? Which number gives infinitely many solutions?`),
    visual: NONE,
    ...signed(k * C),
    hint: `The second equation's left side is ${k} times the first. Make it exactly ${k} times the first equation.`,
    explain: `${k} × ${ds(C)} = ${ds(k * C)}. Then both equations are the same line.`,
  };
}

/** Activity: plot the solution of a system from its graph. 8.EE.C.8a, HSA-REI.D.11. */
export function graphToSolve(): Question {
  if (Math.random() < 0.7) {
    const { x0, y0, m1, b1, m2, b2 } = twoLines();
    return {
      key: `gs-lines-${x0}-${y0}-${m1}-${m2}`,
      prompt: `Plot the solution of y = ${lin(m1, b1)} and y = ${lin(m2, b2)}.`,
      speech: talk(`The graphs of y = ${lin(m1, b1)} and y = ${lin(m2, b2)} are shown. Tap the point that solves the system.`),
      visual: graph([-6, 6], [-6, 6], { curves: [{ fn: lineFn(m1, b1), colour: "wave" }, { fn: lineFn(m2, b2), colour: "berry" }] }),
      input: "activity",
      activity: { kind: "plotPoints", points: [{ x: x0, y: y0, label: "S" }], size: 6, quadrants: 4 },
      answer: 1,
      hint: "The solution is the one point on both lines. Check it in both equations.",
      explain: `They cross at ${pt(x0, y0)}: it makes both equations true.`,
    };
  }
  const [r1, r2] = sorted(distinct(2, -2, 2));
  const c = rand(-3, 1);
  const m = r1 + r2;
  const d = c - r1 * r2;
  return {
    key: `gs-curve-${r1}-${r2}-${c}`,
    prompt: `Plot both points where y = x² ${signed$(c)} meets y = ${lin(m, d)}.`.replace(" + 0", ""),
    speech: talk(`Tap both points where y = x² ${signed$(c)} meets the line y = ${lin(m, d)}.`),
    visual: graph([-6, 6], [-6, 6], { curves: [{ fn: (x) => x * x + c, colour: "grape" }, { fn: lineFn(m, d), colour: "tangerine" }] }),
    input: "activity",
    activity: { kind: "plotPoints", points: [{ x: r1, y: r1 * r1 + c, label: "P" }, { x: r2, y: r2 * r2 + c, label: "Q" }], size: 6, quadrants: 4 },
    answer: 2,
    hint: "Look for the two crossing points, then check each in both equations.",
    explain: `They meet at ${pt(r1, r1 * r1 + c)} and ${pt(r2, r2 * r2 + c)}.`,
  };
}

/** 8.EE.C.8c, HSA-CED.A.3 — word problems with two unknowns. */
export function systemStories(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const A = rand(8, 15);
    const C = rand(3, A - 2);
    const x = rand(2, 20);
    const y = rand(2, 20);
    return {
      key: `ss-tix-${A}-${C}-${x}-${y}`,
      prompt: `Adult tickets $${A}, kids $${C}. ${x + y} tickets cost $${A * x + C * y}. How many adult?`,
      speech: `Adult tickets cost ${A} dollars and kids' tickets ${C} dollars. ${x + y} tickets cost ${A * x + C * y} dollars in all. How many adult tickets were sold?`,
      visual: NONE,
      ...keypad(x),
      hint: `Let a = adults, k = kids: a + k = ${x + y} and ${A}a + ${C}k = ${A * x + C * y}. Substitute k = ${x + y} − a.`,
      explain: `${A}a + ${C}(${x + y} − a) = ${A * x + C * y} → ${A - C}a = ${A * x + C * y - C * (x + y)} → a = ${x}.`,
    };
  }
  if (kind === 1) {
    const p = rand(1, 3);
    const nb = rand(4, 7);
    const x = rand(2, 10);
    const y = rand(2, 10);
    return {
      key: `ss-items-${p}-${nb}-${x}-${y}`,
      prompt: `Pens are $${p}, notebooks $${nb}. You buy ${x + y} items for $${p * x + nb * y}. Notebooks?`,
      speech: `Pens cost ${p} dollars and notebooks ${nb} dollars. You buy ${x + y} items for ${p * x + nb * y} dollars. How many notebooks did you buy?`,
      visual: NONE,
      ...keypad(y),
      hint: `If every item were a pen, it would cost $${p * (x + y)}. Each notebook adds $${nb - p} more.`,
      explain: `${p}(${x + y} − n) + ${nb}n = ${p * x + nb * y} → ${nb - p}n = ${(nb - p) * y} → n = ${y}.`,
    };
  }
  if (kind === 2) {
    const big = rand(10, 60);
    const small = rand(1, big - 1);
    return {
      key: `ss-sumdiff-${big}-${small}`,
      prompt: `Two numbers add to ${big + small} and differ by ${big - small}. The larger one?`,
      speech: `Two numbers add up to ${big + small}, and their difference is ${big - small}. What is the larger number?`,
      visual: NONE,
      ...keypad(big),
      hint: "x + y = sum and x − y = difference. Add the equations.",
      explain: `2x = ${big + small} + ${big - small} = ${2 * big}, so x = ${big}.`,
    };
  }
  if (kind === 3) {
    const v = rand(3, 15);
    const d = rand(2, 6);
    const b2 = d + rand(1, 5);
    const a = rand(2, 8) * 5;
    const c = a + (b2 - d) * v;
    return {
      key: `ss-gym-${a}-${b2}-${c}-${d}`,
      prompt: `Gym A: $${a} + $${b2} a visit. Gym B: $${c} + $${d} a visit. Same cost after how many visits?`,
      speech: `Gym A charges ${a} dollars plus ${b2} dollars a visit. Gym B charges ${c} dollars plus ${d} dollars a visit. After how many visits do they cost the same?`,
      visual: NONE,
      ...keypad(v),
      hint: "Write each cost as an equation in v and set them equal.",
      explain: `${a} + ${b2}v = ${c} + ${d}v → ${b2 - d}v = ${c - a} → v = ${v}.`,
    };
  }
  if (kind === 4) {
    const q = rand(2, 15);
    const dm = rand(2, 15);
    return {
      key: `ss-coins-${q}-${dm}`,
      prompt: `${q + dm} coins, all quarters and dimes, make $${((25 * q + 10 * dm) / 100).toFixed(2)}. Quarters?`,
      speech: `You have ${q + dm} coins, all quarters and dimes, worth ${((25 * q + 10 * dm) / 100).toFixed(2)} dollars. How many quarters are there?`,
      visual: NONE,
      ...keypad(q),
      hint: `Work in cents: q + d = ${q + dm} and 25q + 10d = ${25 * q + 10 * dm}.`,
      explain: `25q + 10(${q + dm} − q) = ${25 * q + 10 * dm} → 15q = ${15 * q} → q = ${q}.`,
    };
  }
  const A = rand(6, 15);
  const C = rand(2, A - 1);
  const n = rand(10, 40);
  const ax = rand(1, n - 1);
  const total = A * ax + C * (n - ax);
  return {
    key: `ss-pick-${A}-${C}-${n}-${total}`,
    prompt: `${n} tickets sold: adults $${A}, kids $${C}, $${total} in all. Which system fits?`,
    speech: `${n} tickets were sold. Adult tickets cost ${A} dollars and kids' tickets ${C} dollars. The total was ${total} dollars. Which system models this, with a adults and k kids?`,
    visual: NONE,
    ...label(`a + k = ${n}, ${A}a + ${C}k = ${total}`, [`a + k = ${total}, ${A}a + ${C}k = ${n}`, `${A}a + k = ${n}, a + ${C}k = ${total}`, `a + k = ${n}, ${C}a + ${A}k = ${total}`]),
    hint: "One equation counts tickets; the other counts money.",
    explain: `Tickets: a + k = ${n}. Money: ${A}a + ${C}k = ${total}.`,
  };
}

/** HSA-REI.C.6, 8.EE.C.8b — find the mistake in a worked substitution. */
export function systemMistakes(): Question {
  for (;;) {
    const x0 = nz(-5, 6);
    const y0 = rand(-5, 6);
    const m = nz(-3, 3);
    const b = y0 - m * x0;
    const a = nz(-4, 5);
    const c = pick([2, 3, -2, 4]);
    const A = a + c * m;
    if (Math.abs(A) < 2 || b === 0) continue;
    const d = a * x0 + c * y0;
    const bad = rand(1, 4);
    const good = [`${lin(A, c * b)} = ${ds(d)}`, `${lin(A, 0)} = ${ds(d - c * b)}`, `x = ${ds(x0)}`];
    const wrongs = [
      [`${lin(A, b)} = ${ds(d)}`, `${lin(A, 0)} = ${ds(d - b)}`, `x = ${fracStr(d - b, A)}`],
      [good[0], `${lin(A, 0)} = ${ds(d + c * b)}`, `x = ${fracStr(d + c * b, A)}`],
      [good[0], good[1], `x = ${ds(d - c * b - A)}`],
    ];
    if (bad === 3 && d - c * b - A === x0) continue;
    const steps = bad === 4 ? good : wrongs[bad - 1];
    const correct = bad === 4 ? "No mistake" : `Step ${bad}`;
    const sys = `y = ${lin(m, b)}; ${twoVar(a, c)} = ${ds(d)}`;
    return {
      key: `sx-${m}-${b}-${a}-${c}-${bad}`,
      prompt: `Solving ${sys} by substitution. Which step is wrong?`,
      speech: talk(`Here's a solution of the system y = ${lin(m, b)} and ${twoVar(a, c)} = ${ds(d)} by substitution. Which step has a mistake, if any?`),
      visual: { kind: "table", header: ["Step", "Work"], rows: [["start", `${lin(a, 0)} ${c < 0 ? "−" : "+"} ${Math.abs(c)}(${lin(m, b)}) = ${ds(d)}`], ...steps.map((s, i) => [String(i + 1), s])] },
      needsVisual: true,
      ...label(correct, ["Step 1", "Step 2", "Step 3", "No mistake"].filter((s) => s !== correct)),
      hint: "Check the distributing first: the number outside the brackets multiplies both terms.",
      explain: bad === 4 ? `All correct: x = ${ds(x0)}, and then y = ${ds(y0)}.` : `Step ${bad} should be ${good[bad - 1]}. The solution is ${pt(x0, y0)}.`,
    };
  }
}

/** HSA-CED.A.3, HSA-REI.D.12 — constraints and systems of inequalities. */
export function constraints(): Question {
  const kind = rand(0, 4);
  if (kind <= 1) {
    const s = rand(3, 8) * 5;
    const h = rand(1, 5) * 5;
    const B = rand(8, 20) * 5;
    const minItems = kind === 1 ? rand(3, 5) : 0;
    const combos: [number, number][] = [];
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) combos.push([i, j]);
    const ok = (i: number, j: number) => s * i + h * j <= B && i + j >= Math.max(1, minItems);
    const good = shuffle(combos.filter(([i, j]) => ok(i, j) && i + j >= 2));
    const bad = shuffle(combos.filter(([i, j]) => !ok(i, j) && i + j >= 1 && s * i + h * j <= B + 40));
    if (!good.length || bad.length < 3) return constraints();
    const nm = ([i, j]: [number, number]) => `${i} shirt${i === 1 ? "" : "s"}, ${j} hat${j === 1 ? "" : "s"}`;
    return {
      key: `ct-${kind}-${s}-${h}-${B}-${minItems}-${good[0]}`,
      prompt: `Shirts $${s}, hats $${h}. Spend at most $${B}${minItems ? `, buy at least ${minItems} items` : ""}. Which works?`,
      speech: `Shirts cost ${s} dollars and hats ${h} dollars. You can spend at most ${B} dollars${minItems ? ` and must buy at least ${minItems} items` : ""}. Which choice meets the constraints?`,
      visual: NONE,
      ...label(nm(good[0]), bad.slice(0, 3).map(nm)),
      hint: `Check each: ${s}s + ${h}h ≤ ${B}${minItems ? ` and s + h ≥ ${minItems}` : ""}.`,
      explain: `${nm(good[0])} costs $${s * good[0][0] + h * good[0][1]}, within the budget${minItems ? `, with ${good[0][0] + good[0][1]} items` : ""}.`,
    };
  }
  // A system of two inequalities: y (op1) m1·x + b1 and y (op2) k, a sloped line and a level one.
  const m1 = nz(-2, 2);
  const b1 = rand(-2, 2);
  const op1 = pick(["<", ">", "≤", "≥"]);
  const op2 = pick(["<", ">", "≤", "≥"]);
  const up2 = op2 === ">" || op2 === "≥";
  const k = up2 ? rand(-4, -1) : rand(1, 4);
  const cmp = (l: number, op: string, r: number) => (op === ">" ? l > r : op === "≥" ? l >= r : op === "<" ? l < r : l <= r);
  const holds = (x: number, y: number) => cmp(y, op1, m1 * x + b1) && cmp(y, op2, k);
  const sys = (o1: string, o2: string) => `y ${o1} ${lin(m1, b1)} and y ${o2} ${ds(k)}`;
  const text = sys(op1, op2);
  const side = (op: string) => (op === ">" || op === "≥" ? "above" : "below");
  const strict = (op: string) => op === "<" || op === ">";
  const regions: Plot["regions"] = [
    { fn: lineFn(m1, b1), side: side(op1), strict: strict(op1), colour: "berry" },
    { fn: () => k, side: side(op2), strict: strict(op2), colour: "wave" },
  ];
  if (kind === 2) {
    const pool: [number, number][] = [];
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (y !== m1 * x + b1 && y !== k) pool.push([x, y]);
    const yes = shuffle(pool.filter(([x, y]) => holds(x, y)));
    const no = shuffle(pool.filter(([x, y]) => !holds(x, y)));
    if (!yes.length || no.length < 3) return constraints();
    const chosen = shuffle([yes[0], no[0], no[1], no[2]]);
    const names = ["A", "B", "C", "D"];
    const win = chosen.indexOf(yes[0]);
    return {
      key: `ct-region-${m1}-${b1}-${op1}-${k}-${op2}-${chosen.join("|")}`,
      prompt: `Which point satisfies ${text}?`,
      speech: talk(`Each inequality's solutions are shaded. Which point satisfies both ${text}?`),
      visual: graph([-6, 6], [-6, 6], { regions, points: chosen.map(([x, y], i) => ({ x, y, label: names[i] })) }),
      needsVisual: true,
      ...fixedLabels(names, win),
      hint: "The point must be in both shaded regions, where they overlap.",
      explain: `${names[win]} ${pt(...yes[0])} is ${side(op1)} y = ${lin(m1, b1)} and ${side(op2)} y = ${ds(k)}, so it satisfies both.`,
    };
  }
  if (kind === 3) {
    const x0 = rand(-4, 4);
    const y0 = rand(-4, 6);
    const yes = holds(x0, y0);
    const r = m1 * x0 + b1;
    return {
      key: `ct-test-${m1}-${b1}-${op1}-${k}-${op2}-${x0}-${y0}`,
      prompt: `Is ${pt(x0, y0)} a solution of ${text}?`,
      speech: talk(`Is ${pt(x0, y0)} a solution of the system ${text}?`),
      visual: NONE,
      ...yesNo(yes),
      hint: "It has to make both inequalities true.",
      explain: `y ${op1} ${lin(m1, b1)}: is ${ds(y0)} ${op1} ${ds(r)}? ${cmp(y0, op1, r) ? "Yes" : "No"}. y ${op2} ${ds(k)}: ${cmp(y0, op2, k) ? "yes" : "no"}. ${yes ? "Both true." : "Not both true."}`,
    };
  }
  // The shaded graph is the question: which system has this overlap?
  const toggle: Record<string, string> = { "<": "≤", "≤": "<", ">": "≥", "≥": ">" };
  return {
    key: `ct-read-${m1}-${b1}-${op1}-${k}-${op2}`,
    prompt: "Which system does the graph show?",
    speech: "The graph shades each inequality's solutions. Which system of inequalities does it show?",
    visual: graph([-6, 6], [-6, 6], { regions }),
    needsVisual: true,
    ...label(text, [sys(flip[op1], op2), sys(op1, flip[op2]), sys(toggle[op1], op2), sys(op1, toggle[op2]), sys(flip[op1], flip[op2])]),
    hint: "For each line: shaded above means y >, below means y <. A solid line adds 'or equal to'.",
    explain: `The sloped line y = ${lin(m1, b1)} is ${strict(op1) ? "dashed" : "solid"} with shading ${side(op1)}; the level line y = ${ds(k)} is ${strict(op2) ? "dashed" : "solid"} with shading ${side(op2)}. So ${text}.`,
  };
}

/** HSA-REI.C.8, HSA-REI.C.9 — systems as matrix equations; solving with an inverse. */
export function matrixSystems(): Question {
  const kind = rand(0, 2);
  const x0 = rand(-5, 5);
  const y0 = rand(-5, 5);
  if (kind === 0) {
    const a = nz(-5, 5);
    const b = nz(-5, 5);
    const c = nz(-5, 5);
    const d = nz(-5, 5, b);
    const p = a * x0 + b * y0;
    const q = c * x0 + d * y0;
    const sys = (A: number, B: number, P: number, C: number, D: number, Q: number) => `${twoVar(A, B)} = ${ds(P)}; ${twoVar(C, D)} = ${ds(Q)}`;
    return {
      key: `mx-read-${a}-${b}-${c}-${d}-${p}-${q}`,
      prompt: "Which system does this matrix equation show?",
      speech: "The matrix equation A X equals B holds a system's numbers: the coefficients, the unknowns x and y, then the totals. Which system is it?",
      visual: { kind: "matrix", items: [{ rows: [[a, b], [c, d]] }, { rows: [["x"], ["y"]] }, "=", { rows: [[p], [q]] }] },
      needsVisual: true,
      ...label(sys(a, b, p, c, d, q), [sys(b, a, p, d, c, q), sys(a, c, p, b, d, q), sys(a, b, q, c, d, p)]),
      hint: "Each row is one equation: first column times x, plus second column times y, equals that row of the right side.",
      explain: `Row 1 says ${twoVar(a, b)} = ${ds(p)}; row 2 says ${twoVar(c, d)} = ${ds(q)}.`,
    };
  }
  const [a, b, c, d] = pick([[2, 1, 1, 1], [3, 2, 1, 1], [2, 3, 1, 2], [3, 1, 2, 1], [5, 2, 2, 1], [4, 3, 1, 1], [3, 5, 1, 2], [2, 5, 1, 3]]);
  const p = a * x0 + b * y0;
  const q = c * x0 + d * y0;
  const askX = Math.random() < 0.5;
  if (kind === 1 && Math.random() < 0.5) {
    const [r, col] = [rand(1, 2), rand(1, 2)];
    const val = [[a, b], [c, d]][r - 1][col - 1];
    return {
      key: `mx-entry-${a}-${b}-${c}-${d}-${p}-${q}-${r}-${col}`,
      prompt: `${twoVar(a, b)} = ${ds(p)}; ${twoVar(c, d)} = ${ds(q)}. In AX = B, A's row ${r}, column ${col}?`,
      speech: talk(`Write the system ${twoVar(a, b)} = ${ds(p)} and ${twoVar(c, d)} = ${ds(q)} as A X = B. What number is in row ${r}, column ${col} of A?`),
      visual: NONE,
      ...choose(val, [a, b, c, d, p, q].filter((v) => v !== val), 1),
      hint: "A holds the coefficients: row 1 from the first equation, column 1 for x, column 2 for y.",
      explain: `A = [${a} ${b}; ${c} ${d}], so row ${r}, column ${col} is ${val}. X = [x; y] and B = [${ds(p)}; ${ds(q)}].`,
    };
  }
  return {
    key: `mx-inv-${a}-${b}-${c}-${d}-${x0}-${y0}-${askX}`,
    prompt: `X = A⁻¹B is shown. Multiply to find ${askX ? "x" : "y"}.`,
    speech: talk(`A system is written as A X = B, so X = A inverse times B. A inverse and B are shown. Multiply to find ${askX ? "x" : "y"}.`),
    visual: { kind: "matrix", items: [{ rows: [[askX ? "?" : "x"], [askX ? "y" : "?"]] }, "=", { rows: [[d, -b], [-c, a]] }, "×", { rows: [[p], [q]] }] },
    needsVisual: true,
    ...signed(askX ? x0 : y0),
    hint: `${askX ? "Row 1" : "Row 2"} of A⁻¹ times B: multiply across and add.`,
    explain: askX
      ? `x = ${d} × ${pa(p)} + ${pa(-b)} × ${pa(q)} = ${ds(x0)}.`
      : `y = ${pa(-c)} × ${pa(p)} + ${a} × ${pa(q)} = ${ds(y0)}.`,
  };
}

/* ====================================================== 7. Polynomials & factoring */

/** HSA-SSE.A.1a, HSA-SSE.A.1b — terms, coefficients, degree; reading expressions in context. */
export function expressionParts(): Question {
  const kind = rand(0, 4);
  const a = nz(-9, 9);
  const b = nz(-9, 9, a);
  const c = nz(-9, 9, a, b);
  if (kind === 0) {
    const ask = pick(["coefficient of x", "constant term", "leading coefficient"]);
    const shuffled = Math.random() < 0.5;
    const text = shuffled ? `${ds(c)} ${signed$(b)}x ${signed$(a)}x²`.replace(/ 1x/g, " x") : poly([a, b, c]);
    const ans = ask === "coefficient of x" ? b : ask === "constant term" ? c : a;
    return {
      key: `ep-coef-${a}-${b}-${c}-${ask}-${shuffled}`,
      prompt: `In ${text}, what is the ${ask}?`,
      speech: talk(`In ${text}, what is the ${ask}?`),
      visual: NONE,
      ...choose(ans, [a, b, c, -ans].filter((v) => v !== ans), 1),
      hint: ask === "leading coefficient" ? "The leading term has the highest power of x, wherever it's written." : ask === "constant term" ? "The constant has no x." : "Find the term with x (not x²). Its sign belongs to it.",
      explain: `${ask === "coefficient of x" ? `The x term is ${ds(b)}x` : ask === "constant term" ? `The term without x is ${ds(c)}` : `The highest power is x², with ${ds(a)} in front`}, so the answer is ${ds(ans)}.`,
    };
  }
  if (kind === 1 || kind === 2) {
    const deg = rand(2, 5);
    const powers = [deg, ...distinct(rand(1, Math.min(3, deg)), 0, deg - 1)];
    const terms = shuffle(powers).map((p) => {
      const k = nz(-9, 9);
      const body = p === 0 ? String(Math.abs(k)) : `${Math.abs(k) === 1 ? "" : Math.abs(k)}x${p === 1 ? "" : sup(p)}`;
      return { k, text: body };
    });
    const text = terms.map((t, i) => (i === 0 ? `${t.k < 0 ? "−" : ""}${t.text}` : ` ${t.k < 0 ? "−" : "+"} ${t.text}`)).join("");
    const ans = kind === 1 ? powers.length : deg;
    return {
      key: `ep-${kind}-${text}`,
      prompt: kind === 1 ? `How many terms does ${text} have?` : `What is the degree of ${text}?`,
      speech: talk(kind === 1 ? `How many terms does ${text} have?` : `What is the degree of the polynomial ${text}?`),
      visual: NONE,
      ...choose(ans, kind === 1 ? [ans + 1, ans - 1, deg] : [powers.length, terms[0].k, deg + 1].filter((v) => v !== ans), 1, 0),
      hint: kind === 1 ? "Terms are separated by + and − signs." : "The degree is the highest power of x, wherever it appears.",
      explain: kind === 1 ? `Count the pieces between the signs: ${ans} terms.` : `The highest power of x is ${deg}, so the degree is ${deg}.`,
    };
  }
  if (kind === 3) {
    const r = rand(2, 12);
    const P = rand(2, 20) * 100;
    const fee = rand(2, 9) * 5;
    const each = rand(2, 9);
    const [text, ok, bad] = pick([
      [`Total cost: ${each}n + ${fee}. What does ${fee} mean?`, "a one-time fee", ["the cost of each item", "the number of items", "the total cost"]],
      [`Total cost: ${each}n + ${fee}. What does ${each} mean?`, "the cost of each item", ["a one-time fee", "the number of items", "the total cost"]],
      [`Savings: ${P}(1.0${r < 10 ? r : 9})ᵗ. What does 1.0${r < 10 ? r : 9} tell you?`, `it grows ${r < 10 ? r : 9}% each year`, [`it grows ${r < 10 ? 100 + r : 109}% each year`, `you add $${r < 10 ? r : 9} each year`, "it starts at $1.09"]],
      [`A rectangle's area is (x + ${each})(x − ${r}). What is x + ${each}?`, "one side length", ["the area", "the perimeter", "the number of sides"]],
      [`Profit: ${each}x − ${fee}. What does −${fee} mean?`, `${fee} dollars of costs`, [`${fee} dollars earned per sale`, "the number sold", "the profit per sale"]],
    ] as [string, string, string[]][]);
    return {
      key: `ep-ctx-${text}`,
      prompt: text,
      speech: talk(text),
      visual: NONE,
      ...label(ok, bad),
      hint: "Think about what each part does: is it multiplied by the variable, or added once?",
      explain: `${cap(ok)}.`,
    };
  }
  const pool = shuffle([
    { label: `${nz(2, 9)}x²`, bin: 0 },
    { label: `−x²`, bin: 0 },
    { label: `${nz(2, 9)}x`, bin: 1 },
    { label: `−${rand(2, 9)}x`, bin: 1 },
    { label: "x", bin: 1 },
    { label: String(rand(2, 20)), bin: 2 },
    { label: `−${rand(1, 9)}`, bin: 2 },
    { label: `${rand(2, 9)}x²`, bin: 0 },
  ]);
  const items = pool.slice(0, 7);
  if (new Set(items.map((i) => i.label)).size !== items.length || [0, 1, 2].some((b) => !items.some((i) => i.bin === b))) return expressionParts();
  return {
    key: `ep-sort-${items.map((i) => i.label).join(",")}`,
    prompt: "Sort the terms into like terms.",
    speech: "Sort these terms: x squared terms, x terms, and plain numbers.",
    visual: NONE,
    input: "activity",
    activity: { kind: "sort", bins: ["x² terms", "x terms", "numbers"], items },
    answer: items.length,
    hint: "Like terms have exactly the same variable part: x² goes with x², x with x.",
    explain: `x²: ${items.filter((i) => i.bin === 0).map((i) => i.label).join(", ")}. x: ${items.filter((i) => i.bin === 1).map((i) => i.label).join(", ")}. Numbers: ${items.filter((i) => i.bin === 2).map((i) => i.label).join(", ")}.`,
  };
}

/** HSA-APR.A.1 — add and subtract polynomials. */
export function addPolys(): Question {
  const kind = rand(0, 2);
  const [a1, b1, c1, a2, b2, c2] = [nz(-6, 6), nz(-9, 9), nz(-9, 9), nz(-6, 6), nz(-9, 9), nz(-9, 9)];
  const p = `(${poly([a1, b1, c1])})`;
  const q = `(${poly([a2, b2, c2])})`;
  if (kind === 0) {
    return {
      key: `ap-add-${a1}-${b1}-${c1}-${a2}-${b2}-${c2}`,
      prompt: `Simplify ${p} + ${q}.`,
      speech: talk(`Add ${poly([a1, b1, c1])} and ${poly([a2, b2, c2])}.`),
      visual: NONE,
      ...label(poly([a1 + a2, b1 + b2, c1 + c2]), [poly([a1 + a2, 0, 0, b1 + b2, c1 + c2]), poly([a1 + a2, b1 + b2, c1 - c2]), poly([a1 + a2, b1 - b2, c1 + c2]), poly([a1 + a2 + b1 + b2, c1 + c2])]),
      hint: "Combine like terms: x² with x², x with x, numbers with numbers. The powers don't change.",
      explain: `x²: ${a1} + ${pa(a2)} = ${a1 + a2}; x: ${b1} + ${pa(b2)} = ${b1 + b2}; numbers: ${c1} + ${pa(c2)} = ${c1 + c2}. So ${poly([a1 + a2, b1 + b2, c1 + c2])}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `ap-sub-${a1}-${b1}-${c1}-${a2}-${b2}-${c2}`,
      prompt: `Simplify ${p} − ${q}.`,
      speech: talk(`Subtract ${poly([a2, b2, c2])} from ${poly([a1, b1, c1])}.`),
      visual: NONE,
      ...label(poly([a1 - a2, b1 - b2, c1 - c2]), [poly([a1 - a2, b1 + b2, c1 + c2]), poly([a1 + a2, b1 + b2, c1 + c2]), poly([a1 - a2, b1 - b2, c1 + c2])]),
      hint: "Subtracting a bracket changes the sign of EVERY term inside it. Then combine like terms.",
      explain: `Change all signs in the second bracket and add: ${poly([a1 - a2, b1 - b2, c1 - c2])}.`,
    };
  }
  return {
    key: `ap-coef-${a1}-${b1}-${c1}-${a2}-${b2}-${c2}`,
    prompt: `In ${p} − ${q}, what is the coefficient of x?`,
    speech: talk(`In ${poly([a1, b1, c1])} minus the quantity ${poly([a2, b2, c2])}, what is the coefficient of x?`),
    visual: NONE,
    ...signed(b1 - b2),
    hint: "Only the x terms matter here. Watch the minus in front of the second bracket.",
    explain: `${ds(b1)} − ${pa(b2)} = ${ds(b1 - b2)}.`,
  };
}

/** HSA-APR.A.1 — multiply polynomials. */
export function multiplyPolys(): Question {
  const kind = rand(0, 4);
  const a = nz(-9, 9);
  const b = nz(-9, 9, -a);
  if (kind === 0) {
    return {
      key: `mp-bin-${a}-${b}`,
      prompt: `Multiply ${fx(-a)}${fx(-b)}.`,
      speech: talk(`Multiply ${fx(-a)}${fx(-b)}.`),
      visual: NONE,
      ...label(poly([1, a + b, a * b]), [poly([1, 0, a * b]), poly([1, a * b, a + b]), poly([1, a + b, -a * b]), poly([1, a - b, a * b])]),
      hint: "Multiply each term in the first bracket by each term in the second (FOIL), then combine the x terms.",
      explain: `x·x = x², x·${pa(b)} + ${pa(a)}·x = ${lin(a + b, 0) || "0"}, ${pa(a)}·${pa(b)} = ${ds(a * b)}: ${poly([1, a + b, a * b])}.`,
    };
  }
  if (kind === 1) {
    const p = rand(2, 5);
    const q = rand(1, 5);
    return {
      key: `mp-mid-${p}-${q}-${a}-${b}`,
      prompt: `Expand (${lin(p, a)})(${lin(q, b)}). What is the coefficient of x?`,
      speech: talk(`Expand (${lin(p, a)})(${lin(q, b)}). What is the coefficient of x?`),
      visual: NONE,
      ...signed(p * b + q * a),
      hint: "The x terms come from the outer and inner products. Add them.",
      explain: `Outer: ${p}x · ${pa(b)} = ${lin(p * b, 0)}. Inner: ${pa(a)} · ${q === 1 ? "" : q}x = ${lin(q * a, 0)}. Total: ${ds(p * b + q * a)}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `mp-sq-${a}`,
      prompt: `Expand ${fx(-a)}².`,
      speech: talk(`Expand ${fx(-a)} squared.`),
      visual: NONE,
      ...label(poly([1, 2 * a, a * a]), [poly([1, 0, a * a]), poly([1, a, a * a]), poly([1, 2 * a, 2 * a]), poly([1, 0, -a * a])]),
      hint: `${fx(-a)}² means ${fx(-a)}${fx(-a)}. Don't forget the middle term.`,
      explain: `${fx(-a)}${fx(-a)} = x² ${signed$(a)}x ${signed$(a)}x + ${a * a} = ${poly([1, 2 * a, a * a])}.`,
    };
  }
  if (kind === 3) {
    const k = rand(2, 6);
    const m = nz(-5, 5);
    const n = nz(-9, 9);
    return {
      key: `mp-mono-${k}-${m}-${n}`,
      prompt: `Multiply ${k}x(${lin(m, n)}).`,
      speech: talk(`Multiply ${k}x by ${lin(m, n)}.`),
      visual: NONE,
      ...label(poly([k * m, k * n, 0]), [poly([k * m, n, 0]), lin(k * m, k * n), poly([m, k * n, 0]), poly([k * m, 0, k * n])]),
      hint: `Multiply ${k}x by each term: ${k}x · ${lin(m, 0)} and ${k}x · ${pa(n)}.`,
      explain: `${k}x · ${lin(m, 0)} = ${poly([k * m, 0, 0])} and ${k}x · ${pa(n)} = ${lin(k * n, 0)}, so ${poly([k * m, k * n, 0])}.`,
    };
  }
  const B = nz(-5, 5);
  const C = nz(-9, 9);
  const askX2 = Math.random() < 0.5;
  return {
    key: `mp-tri-${a}-${B}-${C}-${askX2}`,
    prompt: `Expand ${fx(-a)}(${poly([1, B, C])}). ${askX2 ? "Coefficient of x²?" : "Constant term?"}`,
    speech: talk(`Expand ${fx(-a)} times the quantity ${poly([1, B, C])}. What is the ${askX2 ? "coefficient of x squared" : "constant term"}?`),
    visual: NONE,
    ...signed(askX2 ? B + a : a * C),
    hint: askX2 ? "x² terms come from x · Bx and (number) · x². Add them." : "The constant comes only from multiplying the two numbers.",
    explain: askX2 ? `x · ${lin(B, 0)} gives ${poly([B, 0, 0])}; ${pa(a)} · x² gives ${poly([a, 0, 0])}. Total ${ds(a + B)}.` : `${pa(a)} × ${pa(C)} = ${ds(a * C)}.`,
  };
}

/** HSA-SSE.A.2 — factor out the GCF; factor trinomials. */
export function factoring(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const g = rand(2, 6);
    const m = rand(1, 5);
    const n = nz(-9, 9);
    if (gcd(m, n) !== 1) return factoring();
    const correct = `${g}x(${lin(m, n)})`;
    return {
      key: `fa-gcf-${g}-${m}-${n}`,
      prompt: `Factor out the GCF: ${poly([g * m, g * n, 0])}.`,
      speech: talk(`Factor out the greatest common factor of ${poly([g * m, g * n, 0])}.`),
      visual: NONE,
      ...label(correct, [`${g}x(${lin(m, -n)})`, `${g}x(${lin(m, g * n)})`, `x(${lin(g * m, n)})`, `${g}(${poly([m, n, 0])})`.replace(`${g}(${poly([m, n, 0])})`, `${g}x²(${lin(m, n)})`)]),
      hint: "Find the biggest number and the highest power of x that go into both terms.",
      explain: `Both terms share ${g}x: ${poly([g * m, g * n, 0])} = ${correct}. Check by multiplying back.`,
    };
  }
  const p = nz(-9, 9);
  const q = nz(-9, 9, -p);
  const [lo, hi] = sorted([p, q]);
  if (kind === 1) {
    return {
      key: `fa-tri-${lo}-${hi}`,
      prompt: `Factor ${poly([1, p + q, p * q])}.`,
      speech: talk(`Factor ${poly([1, p + q, p * q])}.`),
      visual: NONE,
      ...label(`${fx(-lo)}${fx(-hi)}`, [`${fx(lo)}${fx(hi)}`, `${fx(-lo)}${fx(hi)}`, `${fx(lo)}${fx(-hi)}`]),
      hint: `Find two numbers that multiply to ${ds(p * q)} and add to ${ds(p + q)}.`,
      explain: `${ds(lo)} × ${pa(hi)} = ${ds(p * q)} and ${ds(lo)} + ${pa(hi)} = ${ds(p + q)}, so it's ${fx(-lo)}${fx(-hi)}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `fa-fill-${p}-${q}`,
      prompt: `${poly([1, p + q, p * q])} = ${fx(-p)}(x + ?). Fill the blank.`,
      speech: talk(`${poly([1, p + q, p * q])} equals ${fx(-p)} times x plus what?`),
      visual: NONE,
      ...signed(q),
      hint: `The two numbers multiply to ${ds(p * q)}. One is ${ds(p)}.`,
      explain: `${ds(p)} × ${pa(q)} = ${ds(p * q)} and ${ds(p)} + ${pa(q)} = ${ds(p + q)}, so the blank is ${ds(q)}.`,
    };
  }
  const a = pick([2, 3, 5]);
  const r = nz(-7, 7);
  let s = nz(-7, 7);
  while (s % a === 0 || s === a * r) s = nz(-7, 7);
  const right = `(${lin(a, s)})${fx(-r)}`;
  const swapped = `(${lin(a, r)})${fx(-s)}`;
  return {
    key: `fa-a-${a}-${r}-${s}`,
    prompt: `Factor ${poly([a, a * r + s, r * s])}.`,
    speech: talk(`Factor ${poly([a, a * r + s, r * s])}.`),
    visual: NONE,
    ...label(right, [swapped, `(${lin(a, -s)})${fx(r)}`, `(${lin(a, s)})${fx(r)}`]),
    hint: `Try (${a}x + ?)(x + ?). Check the middle term by multiplying out each option.`,
    explain: `(${lin(a, s)})${fx(-r)} = ${poly([a, a * r + s, r * s])}: outer ${lin(a * r, 0)}, inner ${lin(s, 0)}, together ${lin(a * r + s, 0)}.`,
  };
}

/** HSA-SSE.A.2, HSA-APR.C.4 — difference of squares, perfect squares and identities. */
export function specialProducts(): Question {
  const kind = rand(0, 5);
  const n = rand(2, 12);
  if (kind === 0 || kind === 1) {
    const a = kind === 0 ? 1 : rand(2, 5);
    const ax = a === 1 ? "x" : `${a}x`;
    return {
      key: `sp-dos-${a}-${n}`,
      prompt: `Factor ${a === 1 ? "" : a * a}x² − ${n * n}.`,
      speech: talk(`Factor ${a === 1 ? "" : a * a}x² − ${n * n}.`),
      visual: NONE,
      ...label(`(${ax} + ${n})(${ax} − ${n})`, [`(${ax} − ${n})²`, `(${ax} + ${n})²`, `(${ax} + ${n * n})(${ax} − 1)`, `(${a * a}x + ${n})(x − ${n})`]),
      hint: "It's a difference of two squares: A² − B² = (A + B)(A − B).",
      explain: `${a === 1 ? "" : a * a}x² = (${ax})² and ${n * n} = ${n}², so it's (${ax} + ${n})(${ax} − ${n}).`,
    };
  }
  if (kind === 2) {
    const A = rand(31, 79);
    const B = A - pick([2, 4, 6, 10, 20]);
    return {
      key: `sp-num-${A}-${B}`,
      prompt: `Use A² − B² = (A + B)(A − B) to find ${A}² − ${B}².`,
      speech: `Use A squared minus B squared equals A plus B times A minus B to work out ${A} squared minus ${B} squared.`,
      visual: NONE,
      ...keypad((A + B) * (A - B)),
      hint: `(${A} + ${B}) × (${A} − ${B}) is easier than squaring.`,
      explain: `(${A} + ${B})(${A} − ${B}) = ${A + B} × ${A - B} = ${(A + B) * (A - B)}.`,
    };
  }
  if (kind === 3) {
    const t = rand(2, 9) * 10;
    const u = rand(1, 4);
    const N = t + u;
    return {
      key: `sp-sq-${N}`,
      prompt: `Use (a + b)² = a² + 2ab + b² to find ${N}².`,
      speech: `Use a plus b squared equals a squared plus 2 a b plus b squared to work out ${N} squared.`,
      visual: { kind: "area", tens: t, ones: u, by: N, split: [t, u] },
      ...keypad(N * N),
      hint: `${N} = ${t} + ${u}. Square each part and add twice their product.`,
      explain: `${t}² + 2·${t}·${u} + ${u}² = ${t * t} + ${2 * t * u} + ${u * u} = ${N * N}.`,
    };
  }
  if (kind === 4) {
    const s = nz(-9, 9);
    return {
      key: `sp-pst-${s}`,
      prompt: `Factor ${poly([1, 2 * s, s * s])}.`,
      speech: talk(`Factor ${poly([1, 2 * s, s * s])}.`),
      visual: NONE,
      ...label(`${fx(-s)}²`, [`${fx(s)}²`, `(x + ${Math.abs(s)})(x − ${Math.abs(s)})`, `(x ${s > 0 ? "+" : "−"} ${s * s})²`, `${fx(-2 * s)}²`]),
      hint: `Is the first term a square, the last term a square, and the middle term 2 × (√first) × (√last)?`,
      explain: `x² ${signed$(2 * s)}x + ${s * s} = x² + 2(${ds(s)})x + (${ds(s)})² = ${fx(-s)}².`,
    };
  }
  const m = rand(1, 4);
  const k = m * m;
  return {
    key: `sp-four-${m}`,
    prompt: `x⁴ − ${k * k} = (x² + ${k})(x² − ?). Fill the blank.`,
    speech: `x to the 4th minus ${k * k} equals x squared plus ${k}, times x squared minus what?`,
    visual: NONE,
    ...keypad(k),
    hint: "See x⁴ as (x²)². Then it's a difference of squares.",
    explain: `x⁴ − ${k * k} = (x²)² − ${k}² = (x² + ${k})(x² − ${k}).${m > 1 ? ` (And x² − ${k} factors again: (x + ${m})(x − ${m}).)` : " (And x² − 1 factors again: (x + 1)(x − 1).)"}`,
  };
}

/** HSA-APR.B.3, HSF-IF.C.7c — zeros of factored polynomials and their graphs. */
export function polyZeros(): Question {
  const kind = rand(0, 3);
  const [r1, r2, r3] = sorted(distinct(3, -4, 4));
  const f = (x: number) => (x - r1) * (x - r2) * (x - r3);
  const ftext = `f(x) = ${fx(r1)}${fx(r2)}${fx(r3)}`.replace(/^f\(x\) = x/, "f(x) = x");
  if (kind === 0) {
    const set = (a: number[]) => a.map(ds).join(", ");
    return {
      key: `pz-set-${r1}-${r2}-${r3}`,
      prompt: `What are the zeros of ${ftext}?`,
      speech: talk(`What are the zeros of ${ftext}?`),
      visual: NONE,
      ...label(set([r1, r2, r3]), [set(sorted([-r1, -r2, -r3])), set(sorted([r1, -r2, r3])), set(sorted([-r1, r2, -r3])), set([r1 + 1, r2 + 1, r3 + 1]), set([r1 - 1, r2, r3 + 1])]),
      hint: "A product is 0 when one of its factors is 0. Set each bracket equal to 0.",
      explain: `Each factor is 0 at x = ${ds(r1)}, ${ds(r2)} and ${ds(r3)}.`,
    };
  }
  if (kind === 1) {
    const s = pick([1, -1]);
    let M = 1;
    for (let x = r1 - 0.5; x <= r3 + 0.5; x += 0.25) M = Math.max(M, Math.abs(f(x)));
    const Y = Math.ceil(M * 1.2);
    const body = `${fx(r1)}${fx(r2)}${fx(r3)}`;
    const neg = s < 0 ? "−" : "";
    return {
      key: `pz-graph-${r1}-${r2}-${r3}-${s}`,
      prompt: "Which function is graphed?",
      speech: "Which function matches the graph? Look at where it crosses the x-axis.",
      visual: graph([-5, 5], [-Y, Y], { curves: [{ fn: (x) => s * f(x), colour: "grape" }] }),
      needsVisual: true,
      ...label(`y = ${neg}${body}`, [`y = ${neg}${fx(-r1)}${fx(-r2)}${fx(-r3)}`, `y = ${s < 0 ? "" : "−"}${body}`, `y = ${neg}${fx(r1)}${fx(-r2)}${fx(r3)}`]),
      hint: "Read the x-intercepts: a zero at x = 2 comes from the factor (x − 2). Then check which way the right end goes.",
      explain: `It crosses at x = ${ds(r1)}, ${ds(r2)}, ${ds(r3)} and ends ${s > 0 ? "up" : "down"} on the right, so y = ${neg}${body}.`,
    };
  }
  if (kind === 2) {
    const a = nz(-4, 4);
    const b = nz(-4, 4, a);
    const text = `f(x) = ${fx(a)}²${fx(b)}`;
    return {
      key: `pz-count-${a}-${b}`,
      prompt: `How many different x-intercepts does ${text} have?`,
      speech: talk(`How many different x-intercepts does ${text} have?`),
      visual: NONE,
      ...choose(2, [3, 1, 4], 1, 0),
      hint: "A squared factor gives only one zero (the graph touches and turns there).",
      explain: `The zeros are x = ${ds(a)} (twice) and x = ${ds(b)}: 2 different x-intercepts.`,
    };
  }
  const lead = nz(-5, 5);
  const deg = rand(2, 5);
  const right = Math.random() < 0.5;
  const goesUp = right ? lead > 0 : (deg % 2 === 0) === lead > 0;
  return {
    key: `pz-end-${lead}-${deg}-${right}`,
    prompt: `f(x) = ${poly([lead].concat(Array(deg).fill(0)))} + lower powers. As x → ${right ? "∞" : "−∞"}, f(x) → ?`,
    speech: talk(`f(x) has leading term ${poly([lead].concat(Array(deg).fill(0)))}. As x goes to ${right ? "∞" : "−∞"}, where does f(x) go?`),
    visual: NONE,
    ...yesNo(goesUp, "∞ (up)", "−∞ (down)"),
    hint: "For huge x, the leading term wins. Check its sign and whether the power is even or odd.",
    explain: `${poly([lead].concat(Array(deg).fill(0)))}: ${deg % 2 === 0 ? "an even power is positive for big negative or positive x" : "an odd power keeps the sign of x"}, times ${ds(lead)}, so f(x) → ${goesUp ? "∞" : "−∞"}.`,
  };
}

/** HSA-APR.B.2 — the remainder theorem. */
export function remainderTheorem(): Question {
  const kind = rand(0, 3);
  const a = nz(-3, 3);
  const b = rand(-4, 4);
  const c = rand(-6, 6);
  const d = rand(-9, 9);
  const p = (x: number) => x ** 3 + b * x * x + c * x + d;
  const ptext = poly([1, b, c, d]);
  if (kind === 0) {
    return {
      key: `rt-rem-${a}-${b}-${c}-${d}`,
      prompt: `Find the remainder when p(x) = ${ptext} is divided by ${fx(a)}.`,
      speech: talk(`What is the remainder when p(x) = ${ptext} is divided by ${fx(a)}?`),
      visual: NONE,
      ...signed(p(a)),
      hint: `Remainder theorem: the remainder on dividing by (x − a) is p(a). Here a = ${ds(a)}.`,
      explain: `p(${ds(a)}) = ${ds(p(a))}, so the remainder is ${ds(p(a))}.`,
    };
  }
  if (kind === 1) {
    const isF = Math.random() < 0.5;
    const e = rand(-4, 4);
    const f0 = rand(-5, 5);
    const coeffs = [1, e - a, f0 - a * e, -a * f0 + (isF ? 0 : nz(-4, 4))];
    const q = (x: number) => x ** 3 + coeffs[1] * x * x + coeffs[2] * x + coeffs[3];
    return {
      key: `rt-fac-${a}-${coeffs.join(".")}`,
      prompt: `Is ${fx(a)} a factor of ${poly(coeffs)}?`,
      speech: talk(`Is ${fx(a)} a factor of ${poly(coeffs)}?`),
      visual: NONE,
      ...yesNo(q(a) === 0),
      hint: `Work out p(${ds(a)}). It's a factor exactly when that's 0.`,
      explain: `p(${ds(a)}) = ${ds(q(a))}. ${q(a) === 0 ? "Zero remainder, so it is a factor." : "Not zero, so it isn't a factor."}`,
    };
  }
  if (kind === 2) {
    const r = nz(-9, 9);
    return {
      key: `rt-which-${r}`,
      prompt: `p(${ds(r)}) = 0. Which must be a factor of p(x)?`,
      speech: talk(`For a polynomial p, p(${ds(r)}) = 0. Which must be a factor of p(x)?`),
      visual: NONE,
      ...label(fx(r).replace(/[()]/g, ""), [fx(-r).replace(/[()]/g, ""), `${ds(r)}x`, `x − ${ds(2 * r)}`.replace("− −", "+ ")]),
      hint: "If p(a) = 0, the remainder on dividing by (x − a) is 0.",
      explain: `p(${ds(r)}) = 0 means dividing by ${fx(r)} leaves no remainder, so ${fx(r)} is a factor.`,
    };
  }
  const k = -(a ** 3 + b * a * a + c * a);
  return {
    key: `rt-k-${a}-${b}-${c}`,
    prompt: `${fx(a)} is a factor of ${poly([1, b, c, 0])} + k. Find k.`.replace(" + 0 + k", " + k").replace(/ \+ k$/, " + k"),
    speech: talk(`${fx(a)} is a factor of ${poly([1, b, c, 0])} + k. What is k?`),
    visual: NONE,
    ...signed(k),
    hint: `A factor ${fx(a)} means p(${ds(a)}) = 0. Plug in and solve for k.`,
    explain: `p(${ds(a)}) = ${ds(-k)} + k = 0, so k = ${ds(k)}.`,
  };
}

/** HSA-APR.D.6, HSA-APR.D.7 — simplify, divide and combine rational expressions. */
export function rationalExpressions(): Question {
  const kind = rand(0, 4);
  const a = nz(-8, 8);
  const b = nz(-8, 8, a, -a);
  if (kind === 0) {
    return {
      key: `rx-simp-${a}-${b}`,
      prompt: `Simplify (${poly([1, a + b, a * b])}) ÷ ${fx(-a)}.`,
      speech: talk(`Simplify the quantity ${poly([1, a + b, a * b])}, divided by ${fx(-a)}.`),
      visual: NONE,
      ...label(lin(1, b), [lin(1, -b), lin(1, a), lin(1, a + b), `x² ${signed$(b)}`]),
      hint: "Factor the top first. Then cancel the matching bracket.",
      explain: `${poly([1, a + b, a * b])} = ${fx(-a)}${fx(-b)}, so dividing by ${fx(-a)} leaves ${lin(1, b)} (for x ≠ ${ds(-a)}).`,
    };
  }
  if (kind === 1) {
    const B = rand(-6, 6);
    const C = rand(-9, 9);
    const r = a * a + B * a + C;
    const askRem = Math.random() < 0.5;
    return {
      key: `rx-div-${a}-${B}-${C}-${askRem}`,
      prompt: `Divide ${poly([1, B, C])} by ${fx(a)}. ${askRem ? "What is the remainder?" : "What is the quotient?"}`,
      speech: talk(`Divide ${poly([1, B, C])} by ${fx(a)}. What is the ${askRem ? "remainder" : "quotient"}?`),
      visual: NONE,
      ...(askRem ? signed(r) : label(lin(1, B + a), [lin(1, B - a), lin(1, a), lin(1, B)])),
      hint: askRem ? `The remainder is the value of the polynomial at x = ${ds(a)}.` : `Write it as ${fx(a)}(x + ?) + remainder and match the x terms.`,
      explain: `${poly([1, B, C])} = ${fx(a)}(${lin(1, B + a)}) ${signed$(r)}. Quotient ${lin(1, B + a)}, remainder ${ds(r)}.`,
    };
  }
  if (kind === 2) {
    const p = rand(1, 9);
    const q = rand(1, 9);
    const k = nz(-6, 6);
    const den = lin(1, k);
    return {
      key: `rx-add-${p}-${q}-${k}`,
      prompt: `Add ${p}/(${den}) + ${q}/(${den}).`,
      speech: talk(`Add ${p} over ${den} and ${q} over ${den}.`),
      visual: NONE,
      ...label(`${p + q}/(${den})`, [`${p + q}/(${lin(2, 2 * k)})`, `${p * q}/(${den})`, `${p + q}/(${den})²`]),
      hint: "Same denominator: add the tops, keep the bottom.",
      explain: `The denominators match, so ${p} + ${q} = ${p + q} over ${den}: ${p + q}/(${den}).`,
    };
  }
  if (kind === 3) {
    const p = rand(1, 7);
    const c = rand(2, 5);
    const q = rand(1, 7);
    const top = p * c + q;
    const g = gcd(top, c);
    const correct = g > 1 ? `${top / g}/(${c / g === 1 ? "" : c / g}x)`.replace("/(x)", "/x") : `${top}/(${c}x)`;
    return {
      key: `rx-lcd-${p}-${c}-${q}`,
      prompt: `Add ${p}/x + ${q}/(${c}x). Simplify.`,
      speech: talk(`Add ${p} over x and ${q} over ${c}x. Simplify.`),
      visual: NONE,
      ...label(correct, [`${p + q}/(${c + 1}x)`, `${p + q}/(${c}x)`, `${p * q}/(${c}x²)`]),
      hint: `Use the common denominator ${c}x: rewrite ${p}/x as ${p * c}/(${c}x).`,
      explain: `${p * c}/(${c}x) + ${q}/(${c}x) = ${top}/(${c}x)${correct !== `${top}/(${c}x)` ? ` = ${correct}` : ""}.`,
    };
  }
  const m = rand(2, 6);
  const n = nz(2, 9, m);
  const mul = Math.random() < 0.5;
  const g = gcd(n, m);
  const correct = mul ? (m / g === 1 ? `${n / g}/x` : `${n / g}/(${m / g}x)`) : m === 1 ? `${n}x` : `${(n * 1) / gcd(n, m)}x/${m / gcd(n, m)}`.replace(/\/1$/, "");
  return {
    key: `rx-md-${m}-${n}-${mul}`,
    prompt: mul ? `Simplify (x/${m}) · (${n}/x²).` : `Simplify (${n}/x) ÷ (${m}/x²).`,
    speech: talk(mul ? `Multiply x over ${m} by ${n} over x squared, and simplify.` : `Divide ${n} over x by ${m} over x squared, and simplify.`),
    visual: NONE,
    ...label(correct, mul ? [`${n}x/${m}`, `${n}/(${m}x²)`, `${n * m}/x`] : [`${n}/(${m}x)`, `${n * m}x`, `${m}x/${n}`]),
    hint: mul ? "Multiply tops and bottoms, then cancel common factors of x." : "Dividing by a fraction is multiplying by its flip.",
    explain: mul ? `(x · ${n})/(${m} · x²) = ${n}/(${m}x)${correct !== `${n}/(${m}x)` ? ` = ${correct}` : ""}.` : `(${n}/x) · (x²/${m}) = ${n}x/${m}${correct !== `${n}x/${m}` ? ` = ${correct}` : ""}.`,
  };
}

const choose2 = (n: number, k: number): number => (k === 0 || k === n ? 1 : (choose2(n - 1, k - 1) * n) / k);

/** HSA-APR.C.5 — the binomial theorem and Pascal's triangle. */
export function binomialTheorem(): Question {
  const kind = rand(0, 3);
  const n = rand(4, 9);
  const k = rand(1, n - 1);
  if (kind === 0) {
    const pos = rand(2, n - 1);
    const row = Array.from({ length: pos }, (_, i) => choose2(n, i));
    return {
      key: `bt-pascal-${n}-${pos}`,
      prompt: `Row ${n} of Pascal's triangle starts ${row.join(", ")}, … Next?`,
      speech: `Row ${n} of Pascal's triangle starts ${row.join(", ")}. What number comes next?`,
      visual: { kind: "sequence", numbers: row, next: choose2(n, pos) },
      ...keypad(choose2(n, pos)),
      hint: "Each number is the sum of the two above it. Or: the row is symmetric and starts 1, n, …",
      explain: `The next entry is C(${n}, ${pos}) = ${choose2(n, pos)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `bt-coef1-${n}-${k}`,
      prompt: `What is the coefficient of x${sup(k)} in (x + 1)${sup(n)}?`.replace("x¹", "x"),
      speech: talk(`What is the coefficient of x${sup(k)} in (x + 1)${sup(n)}?`),
      visual: NONE,
      ...keypad(choose2(n, k)),
      hint: `It's the entry of Pascal's row ${n} in position ${k}: C(${n}, ${k}).`,
      explain: `C(${n}, ${k}) = ${choose2(n, k)}.`,
    };
  }
  if (kind === 2) {
    const a = rand(2, 3);
    const nn = rand(3, 6);
    const kk = rand(1, nn - 1);
    const ans = choose2(nn, kk) * a ** (nn - kk);
    return {
      key: `bt-coefa-${a}-${nn}-${kk}`,
      prompt: `What is the coefficient of x${sup(kk)} in (x + ${a})${sup(nn)}?`.replace("x¹ ", "x "),
      speech: talk(`What is the coefficient of x${sup(kk)} in (x + ${a})${sup(nn)}?`),
      visual: NONE,
      ...keypad(ans),
      hint: `The term is C(${nn}, ${kk}) · x${sup(kk)} · ${a}${sup(nn - kk)}. Don't forget the power of ${a}.`,
      explain: `C(${nn}, ${kk}) × ${a}${sup(nn - kk)} = ${choose2(nn, kk)} × ${a ** (nn - kk)} = ${ans}.`,
    };
  }
  return {
    key: `bt-terms-${n}`,
    prompt: `How many terms are in the expansion of (x + y)${sup(n)}?`,
    speech: talk(`How many terms are in the expansion of (x + y)${sup(n)}?`),
    visual: NONE,
    ...choose(n + 1, [n, 2 * n, n + 2], 1, 1),
    hint: "Powers of x go from n down to 0. Count them.",
    explain: `x${sup(n)}, x${sup(n - 1)}y, …, y${sup(n)}: ${n + 1} terms.`,
  };
}

/* ================================================================== 8. Quadratics */

/** "y = −2(x − 3)² + 1" */
function vertexForm(a: number, h: number, k: number): string {
  const lead = a === 1 ? "" : a === -1 ? "−" : ds(a);
  return `y = ${lead}${h === 0 ? "x²" : `(${inner(h)})²`}${tail(k)}`;
}

/** HSF-IF.B.4, HSF-IF.C.7a — read a parabola's vertex, axis, max/min, intercepts. */
export function parabolaFeatures(): Question {
  const kind = rand(0, 4);
  const a = pick([1, -1, 2, -2, 0.5, -0.5]);
  const h = rand(-3, 3) * (Math.abs(a) === 0.5 ? 1 : 1);
  const k = rand(-4, 4);
  const f = (x: number) => a * (x - h) ** 2 + k;
  const visual = graph([-7, 7], [-9, 9], { curves: [{ fn: f, colour: "rose" }], points: [{ x: h, y: k }] });
  const base = { visual, needsVisual: true as const };
  if (kind === 0) {
    return {
      key: `pf-vertex-${a}-${h}-${k}`,
      prompt: "What is the vertex of this parabola?",
      speech: "What is the vertex, the turning point, of this parabola?",
      ...base,
      ...label(pt(h, k), [pt(-h, k), pt(k, h), pt(h, -k), pt(0, f(0)), pt(h + 1, k), pt(h, k - 1)]),
      hint: "The vertex is the highest or lowest point, where the parabola turns.",
      explain: `It turns at ${pt(h, k)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `pf-axis-${a}-${h}-${k}`,
      prompt: "The axis of symmetry is x = ?",
      speech: "The parabola is symmetric about a vertical line. What is its equation, x equals what?",
      ...base,
      answerLine: ["x", "=", "?"],
      ...signed(h),
      hint: "The axis of symmetry is the vertical line through the vertex.",
      explain: `The vertex is at x = ${ds(h)}, so the axis is x = ${ds(h)}.`,
    };
  }
  if (kind === 2) {
    const up = a > 0;
    return {
      key: `pf-ext-${a}-${h}-${k}`,
      prompt: `What is the ${up ? "minimum" : "maximum"} value of this function?`,
      speech: `The parabola opens ${up ? "up" : "down"}. What is the ${up ? "minimum" : "maximum"} value of the function?`,
      ...base,
      ...signed(k),
      hint: "The max or min value is the y-coordinate of the vertex.",
      explain: `The vertex is ${pt(h, k)}, so the ${up ? "minimum" : "maximum"} value is ${ds(k)}.`,
    };
  }
  if (kind === 3) {
    const y0 = f(0);
    if (Math.abs(y0) > 9 || !Number.isInteger(y0)) return parabolaFeatures();
    return {
      key: `pf-yint-${a}-${h}-${k}`,
      prompt: `${vertexForm(a, h, k)}. What is the y-intercept?`,
      speech: talk(`For ${vertexForm(a, h, k)}, what is the y-intercept?`),
      ...base,
      ...signed(y0),
      hint: "The y-intercept is the value at x = 0.",
      explain: `y = ${ds(a)} × (0 ${signed$(-h)})² ${signed$(k)} = ${ds(y0)}.`.replace("(0 + 0)", "0").replace("(0 − 0)", "0"),
    };
  }
  return {
    key: `pf-eq-${a}-${h}-${k}`,
    prompt: "Which equation matches the graph?",
    speech: "Which equation matches the parabola on the graph?",
    ...base,
    ...label(vertexForm(a, h, k), [vertexForm(a, -h, k), vertexForm(-a, h, k), vertexForm(a, h, -k), vertexForm(a, k, h)]),
    hint: "Find the vertex (h, k) for y = a(x − h)² + k, and check whether it opens up (a > 0) or down (a < 0).",
    explain: `Vertex ${pt(h, k)}, opening ${a > 0 ? "up" : "down"}${Math.abs(a) !== 1 ? `, ${Math.abs(a) > 1 ? "narrower" : "wider"} than y = x²` : ""}: ${vertexForm(a, h, k)}.`,
  };
}

/** Activity: plot key points of a parabola. HSF-IF.C.7a, HSF-IF.B.4. */
export function plotParabola(): Question {
  const r1 = rand(-5, 3);
  const r2 = r1 + 2 * rand(1, 4);
  const s = pick([1, -1]);
  const h = (r1 + r2) / 2;
  const k = -s * ((r2 - r1) / 2) ** 2;
  if (r2 > 6 || Math.abs(k) > 6) return plotParabola();
  const text = `y = ${s < 0 ? "−" : ""}${fx(r1)}${fx(r2)}`;
  const vertexOnly = Math.random() < 0.3;
  return {
    key: `pp-${r1}-${r2}-${s}-${vertexOnly}`,
    prompt: vertexOnly ? `Plot the vertex of ${text}.` : `Plot the x-intercepts and the vertex of ${text}.`,
    speech: talk(vertexOnly ? `Tap the vertex of ${text}.` : `Tap the two x-intercepts and the vertex of ${text}.`),
    visual: NONE,
    input: "activity",
    activity: {
      kind: "plotPoints",
      points: vertexOnly ? [{ x: h, y: k, label: "V" }] : [{ x: r1, y: 0, label: "P" }, { x: r2, y: 0, label: "Q" }, { x: h, y: k, label: "V" }],
      size: 6,
      quadrants: 4,
    },
    answer: vertexOnly ? 1 : 3,
    hint: "The zeros come from the factors. The vertex sits halfway between them; put that x into the equation for its y.",
    explain: `Zeros at x = ${ds(r1)} and ${ds(r2)}. Halfway is x = ${ds(h)}, and y there is ${ds(k)}: vertex ${pt(h, k)}.`,
  };
}

/** HSA-SSE.B.3a, HSA-REI.B.4b, HSF-IF.C.8a — solve by factoring; zeros. */
export function factorZeros(): Question {
  const kind = rand(0, 3);
  const p = nz(-9, 9);
  const q = nz(-9, 9, p);
  const [lo, hi] = sorted([p, q]);
  const eq = `${poly([1, -(p + q), p * q])} = 0`;
  const sol = (a: number, b: number) => `x = ${ds(Math.min(a, b))} or x = ${ds(Math.max(a, b))}`;
  if (kind === 0 || kind === 1) {
    const text = kind === 0 ? eq : `${fx(p)}${fx(q)} = 0`;
    return {
      key: `fz-${kind}-${lo}-${hi}`,
      prompt: `Solve ${text}.`,
      speech: talk(`Solve ${text}.`),
      visual: NONE,
      ...label(sol(p, q), [sol(-p, -q), sol(-p, q), sol(p, -q)]),
      hint: kind === 0 ? "Factor into two brackets, then set each bracket to 0." : "A product is 0 only if one factor is 0. Set each bracket to 0.",
      explain: `${fx(p)}${fx(q)} = 0, so x ${signed$(-p)} = 0 or x ${signed$(-q)} = 0: ${sol(p, q)}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `fz-big-${lo}-${hi}`,
      prompt: `What is the larger zero of f(x) = ${poly([1, -(p + q), p * q])}?`,
      speech: talk(`What is the larger zero of f(x) = ${poly([1, -(p + q), p * q])}?`),
      visual: NONE,
      ...signed(hi),
      hint: `Factor: find two numbers that multiply to ${ds(p * q)} and add to ${ds(-(p + q))}. Then flip their signs for the zeros.`,
      explain: `f(x) = ${fx(p)}${fx(q)}, so the zeros are ${ds(lo)} and ${ds(hi)}. The larger is ${ds(hi)}.`,
    };
  }
  const a = rand(2, 6);
  const r = nz(-6, 6);
  return {
    key: `fz-gcf-${a}-${r}`,
    prompt: `Solve ${poly([a, -a * r, 0])} = 0.`,
    speech: talk(`Solve ${poly([a, -a * r, 0])} = 0.`),
    visual: NONE,
    ...label(sol(0, r), [`x = ${ds(r)} only`, sol(0, -r), sol(a, r)]),
    hint: "Don't divide by x — you'd lose a solution. Factor out the common factor instead.",
    explain: `${poly([a, -a * r, 0])} = ${a}x${fx(r)} = 0, so x = 0 or x = ${ds(r)}.`,
  };
}

/** HSA-REI.B.4b — solve quadratics by taking square roots. */
export function squareRootSolve(): Question {
  const kind = rand(0, 3);
  const h = nz(-6, 6);
  const k = rand(1, 9);
  const sol = (a: number, b: number) => `x = ${ds(Math.min(a, b))} or x = ${ds(Math.max(a, b))}`;
  if (kind === 0) {
    return {
      key: `sr-shift-${h}-${k}`,
      prompt: `Solve (${inner(h)})² = ${k * k}.`,
      speech: talk(`Solve (${inner(h)})² = ${k * k}.`),
      visual: NONE,
      ...label(sol(h + k, h - k), [`x = ${ds(h + k)} only`, sol(-h + k, -h - k), sol(h + k * k, h - k * k)]),
      hint: "Take the square root of both sides: remember ±. Then undo the shift.",
      explain: `${inner(h)} = ±${k}, so x = ${ds(h)} ± ${k}: ${sol(h + k, h - k)}.`,
    };
  }
  if (kind === 1) {
    const a = rand(2, 5);
    return {
      key: `sr-a-${a}-${k}`,
      prompt: `Solve ${a}x² = ${a * k * k}.`,
      speech: talk(`Solve ${a}x² = ${a * k * k}.`),
      visual: NONE,
      ...label(`x = ±${k}`, [`x = ${k} only`, `x = ±${k * k}`, `x = ±${a * k}`]),
      hint: `Divide by ${a} first, then take the square root (±).`,
      explain: `x² = ${k * k}, so x = ±${k}.`,
    };
  }
  if (kind === 2) {
    const a = rand(2, 4);
    return {
      key: `sr-big-${a}-${h}-${k}`,
      prompt: `Solve ${a}(${inner(h)})² = ${a * k * k}. What is the larger solution?`,
      speech: talk(`Solve ${a}(${inner(h)})² = ${a * k * k}. What is the larger solution?`),
      visual: NONE,
      ...signed(h + k),
      hint: `Divide by ${a}, take ± the square root, then add ${ds(h)}.`,
      explain: `(${inner(h)})² = ${k * k} → ${inner(h)} = ±${k} → x = ${ds(h - k)} or ${ds(h + k)}. The larger is ${ds(h + k)}.`,
    };
  }
  const c = rand(1, 9);
  const d = c - rand(1, 9);
  const real = Math.random() < 0.5;
  const rhs = real ? c + k * k : d;
  return {
    key: `sr-none-${c}-${rhs}`,
    prompt: `Solve x² + ${c} = ${ds(rhs)}.`,
    speech: talk(`Solve x² + ${c} = ${ds(rhs)}.`),
    visual: NONE,
    ...label(real ? `x = ±${k}` : "no real solutions", real ? ["no real solutions", `x = ±${k * k}`, `x = ${k} only`] : [`x = ±${Math.abs(rhs - c)}`, `x = ${ds(rhs - c)}`, "x = 0"]),
    hint: "Get x² alone. A square can't be negative.",
    explain: real ? `x² = ${k * k}, so x = ±${k}.` : `x² = ${ds(rhs - c)}, but no real number squared is negative: no real solutions.`,
  };
}

/** HSA-SSE.B.3b, HSA-REI.B.4a, HSF-IF.C.8a — complete the square. */
export function completeSquare(): Question {
  const kind = rand(0, 4);
  const p = nz(-7, 7);
  const c = rand(-9, 15);
  const b = 2 * p;
  const q = c - p * p;
  const quad = poly([1, b, c]);
  if (kind === 0) {
    return {
      key: `cs-fill-${p}`,
      prompt: `What number completes the square: x² ${signed$(b)}x + ?`,
      speech: talk(`What number makes x² ${signed$(b)}x + what a perfect square?`),
      visual: NONE,
      ...keypad(p * p),
      hint: "Halve the x coefficient, then square it.",
      explain: `Half of ${ds(b)} is ${ds(p)}, and ${pa(p)}² = ${p * p}: x² ${signed$(b)}x + ${p * p} = ${fx(-p)}².`,
    };
  }
  if (kind === 1) {
    return {
      key: `cs-q-${p}-${c}`,
      prompt: `${quad} = ${fx(-p)}² + ?. Fill the blank.`,
      speech: talk(`${quad} = ${fx(-p)}² + what?`),
      visual: NONE,
      ...signed(q),
      hint: `${fx(-p)}² = x² ${signed$(b)}x + ${p * p}. What do you add to ${p * p} to get ${ds(c)}?`,
      explain: `${ds(c)} − ${p * p} = ${ds(q)}, so ${quad} = ${fx(-p)}² ${signed$(q)}.`,
    };
  }
  if (kind === 2) {
    const askMin = Math.random() < 0.5;
    return {
      key: `cs-vert-${p}-${c}-${askMin}`,
      prompt: askMin ? `What is the minimum value of y = ${quad}?` : `What is the vertex of y = ${quad}?`,
      speech: talk(askMin ? `What is the minimum value of y = ${quad}?` : `What is the vertex of y = ${quad}?`),
      visual: NONE,
      ...(askMin ? signed(q) : label(pt(-p, q), [pt(p, q), pt(-p, c), pt(-p, -q), pt(p, c)])),
      hint: "Complete the square to get y = (x − h)² + k. The vertex is (h, k), and k is the minimum.",
      explain: `y = ${fx(-p)}² ${signed$(q)}, so the vertex is ${pt(-p, q)} and the minimum value is ${ds(q)}.`,
    };
  }
  if (kind === 3) {
    const s = rand(1, 8);
    const cc = p * p - s * s;
    const sol = `x = ${ds(-p - s)} or x = ${ds(-p + s)}`;
    return {
      key: `cs-solve-${p}-${s}`,
      prompt: `Solve ${poly([1, b, cc])} = 0 by completing the square.`,
      speech: talk(`Solve ${poly([1, b, cc])} = 0 by completing the square.`),
      visual: NONE,
      ...label(sol, [`x = ${ds(p - s)} or x = ${ds(p + s)}`, `x = ${ds(-p + s)} only`, `x = ${ds(-p - s * s)} or x = ${ds(-p + s * s)}`]),
      hint: `Move the constant over, then add ${p * p} to both sides to make ${fx(-p)}².`,
      explain: `${fx(-p)}² = ${s * s}, so x ${signed$(p)} = ±${s}: ${sol}.`,
    };
  }
  const m = p * p + c;
  return {
    key: `cs-max-${p}-${c}`,
    prompt: `What is the maximum value of y = ${poly([-1, b, c])}?`,
    speech: talk(`What is the maximum value of y = ${poly([-1, b, c])}?`),
    visual: NONE,
    ...signed(m),
    hint: `Factor out −1 from the x terms: −(x² ${signed$(-b)}x) + ${ds(c)}, then complete the square inside.`,
    explain: `y = −${fx(p)}² + ${ds(m)}, and a negative square is at most 0, so the maximum is ${ds(m)}.`,
  };
}

/** HSA-REI.B.4a, HSA-REI.B.4b — the quadratic formula and the discriminant. */
export function quadraticFormula(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const a = rand(1, 5);
    const b = rand(-9, 9);
    const c = nz(-9, 9);
    return {
      key: `qf-disc-${a}-${b}-${c}`,
      prompt: `Find the discriminant b² − 4ac of ${poly([a, b, c])} = 0.`,
      speech: talk(`What is the discriminant, b² − 4ac, of ${poly([a, b, c])} = 0?`),
      visual: NONE,
      ...signed(b * b - 4 * a * c),
      hint: `a = ${a}, b = ${ds(b)}, c = ${ds(c)}. Square b (it's never negative), then subtract 4ac.`,
      explain: `${pa(b)}² − 4(${a})(${pa(c)}) = ${b * b} ${signed$(-4 * a * c)} = ${ds(b * b - 4 * a * c)}.`,
    };
  }
  if (kind === 1) {
    const type = rand(0, 2);
    const a = rand(1, 3);
    let b: number;
    let c: number;
    if (type === 1) {
      const r = nz(-5, 5);
      b = -2 * a * r;
      c = a * r * r;
    } else {
      b = rand(-8, 8);
      c = type === 0 ? -rand(1, 9) : Math.floor((b * b) / (4 * a)) + rand(1, 6);
    }
    const D = b * b - 4 * a * c;
    const n = D > 0 ? 2 : D === 0 ? 1 : 0;
    return {
      key: `qf-count-${a}-${b}-${c}`,
      prompt: `How many real solutions does ${poly([a, b, c])} = 0 have?`,
      speech: talk(`How many real solutions does ${poly([a, b, c])} = 0 have?`),
      visual: NONE,
      answer: n,
      input: "choices",
      choices: [0, 1, 2],
      hint: "Use the discriminant b² − 4ac: positive → 2, zero → 1, negative → 0.",
      explain: `b² − 4ac = ${ds(D)}, which is ${D > 0 ? "positive: 2 real solutions" : D === 0 ? "zero: 1 real solution" : "negative: no real solutions"}.`,
    };
  }
  if (kind === 2) {
    const p = nz(-5, 5);
    let s = rand(2, 15);
    while (Number.isInteger(Math.sqrt(s))) s = rand(2, 15);
    const c = p * p - s;
    const ans = `x = ${ds(-p)} ± ${rootStr(s)}`;
    return {
      key: `qf-irr-${p}-${s}`,
      prompt: `Solve ${poly([1, 2 * p, c])} = 0 with the quadratic formula.`,
      speech: talk(`Use the quadratic formula to solve ${poly([1, 2 * p, c])} = 0.`),
      visual: NONE,
      ...label(ans, [`x = ${ds(p)} ± ${rootStr(s)}`, `x = ${ds(-2 * p)} ± ${rootStr(4 * s)}`, `x = ${ds(-p)} ± ${rootStr(p * p + Math.abs(c) + 1)}`]),
      hint: "x = (−b ± √(b² − 4ac)) / 2a. Simplify the root and divide every part by 2.",
      explain: `x = (${ds(-2 * p)} ± √${4 * s}) / 2 = (${ds(-2 * p)} ± 2√${s}) / 2 = ${ans}.`,
    };
  }
  const a = pick([2, 3]);
  let m = nz(-5, 5);
  while (gcd(m, a) !== 1) m = nz(-5, 5);
  const n = nz(-5, 5, -m);
  const roots = `x = ${fracStr(-m, a)} or x = ${ds(-n)}`;
  return {
    key: `qf-rat-${a}-${m}-${n}`,
    prompt: `Solve ${poly([a, a * n + m, m * n])} = 0.`,
    speech: talk(`Solve ${poly([a, a * n + m, m * n])} = 0.`),
    visual: NONE,
    ...label(roots, [`x = ${fracStr(m, a)} or x = ${ds(n)}`, `x = ${ds(-m)} or x = ${ds(-n)}`, `x = ${fracStr(-n, a)} or x = ${ds(-m)}`]),
    hint: "Use the formula, or factor as (ax + m)(x + n).",
    explain: `It factors as (${lin(a, m)})${fx(-n)} = 0, so ${roots}.`,
  };
}

/** HSA-CED.A.1, HSA-CED.A.2, HSF-IF.B.4, HSF-IF.B.5 — quadratic models. */
export function quadModels(): Question {
  const kind = rand(0, 4);
  const T = rand(2, 8);
  const v = 5 * T;
  const h = `h(t) = −5t² + ${v}t`;
  if (kind === 0) {
    return {
      key: `qm-land-${T}`,
      prompt: `A ball is kicked up: ${h} meters. When does it land?`,
      speech: talk(`A ball is kicked up from the ground. Its height is ${h} meters after t seconds. When does it land?`),
      visual: graph([0, T + 1], [0, 1.4 * 1.25 * T * T], { curves: [{ fn: (t) => (t > T ? NaN : -5 * t * t + v * t), colour: "rose" }] }),
      ...keypad(T),
      unit: "s",
      hint: "It lands when the height is 0. Factor out −5t.",
      explain: `−5t(t − ${T}) = 0, so t = 0 (the kick) or t = ${T} s (landing).`,
    };
  }
  if (kind === 1) {
    const top = T / 2;
    const askH = Math.random() < 0.5;
    const H = 5 * top * top;
    return {
      key: `qm-top-${T}-${askH}`,
      prompt: `A ball's height is ${h} meters. ${askH ? "What is its greatest height?" : "When is it highest?"}`,
      speech: talk(`A ball's height is ${h} meters after t seconds. ${askH ? "What is its greatest height?" : "At what time is it highest?"}`),
      visual: NONE,
      ...keypad(askH ? H : top),
      unit: askH ? "m" : "s",
      hint: "The highest point is halfway between the two times when h = 0.",
      explain: `h = 0 at t = 0 and t = ${T}, so the top is at t = ${ds(top)} s, where h = −5(${ds(top)})² + ${v}(${ds(top)}) = ${ds(H)} m.`,
    };
  }
  if (kind === 2) {
    const w = rand(3, 15);
    const k = rand(1, 8);
    return {
      key: `qm-area-${w}-${k}`,
      prompt: `A rectangle is ${k} cm longer than wide. Its area is ${w * (w + k)} cm². Width?`,
      speech: `A rectangle's length is ${k} centimeters more than its width. Its area is ${w * (w + k)} square centimeters. What is its width?`,
      visual: { kind: "rect", w: w + k, h: w, showW: false, showH: false, grid: false, unit: "cm", inside: `${w * (w + k)} cm²` },
      ...keypad(w),
      unit: "cm",
      hint: `w(w + ${k}) = ${w * (w + k)}. Rearrange to = 0 and factor; a width can't be negative.`,
      explain: `w² + ${k}w − ${w * (w + k)} = 0 → (w − ${w})(w + ${w + k}) = 0. Width can't be negative, so w = ${w} cm.`,
    };
  }
  if (kind === 3) {
    const c = pick([1, 2, 4, 5]);
    const best = rand(5, 30);
    const N = 2 * c * best;
    return {
      key: `qm-rev-${c}-${N}`,
      prompt: `Revenue R(p) = p(${N} − ${c === 1 ? "" : c}p) dollars at price $p. Best price?`,
      speech: `Revenue is R of p equals p times the quantity ${N} minus ${c} p dollars, at a price of p dollars. What price gives the most revenue?`,
      visual: NONE,
      ...keypad(best),
      prefix: "$",
      hint: `R = 0 at p = 0 and p = ${N / c}. The best price is halfway.`,
      explain: `The zeros are 0 and ${N / c}; halfway is p = $${best}.`,
    };
  }
  return {
    key: `qm-dom-${T}`,
    prompt: `${h} gives a ball's height. Which domain makes sense?`,
    speech: talk(`${h} gives a ball's height in meters after t seconds, from the kick to landing. Which domain makes sense?`),
    visual: NONE,
    ...label(`0 ≤ t ≤ ${T}`, ["all real numbers", "t ≥ 0", `0 ≤ t ≤ ${ds(T / 2)}`, `−${T} ≤ t ≤ ${T}`]),
    hint: "Time starts at the kick, and the model stops making sense after it lands.",
    explain: `It's kicked at t = 0 and lands at t = ${T}, so 0 ≤ t ≤ ${T}.`,
  };
}

/** HSA-REI.A.2 — radical and rational equations; extraneous solutions. */
export function radicalRational(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const b = rand(1, 9);
    const a = rand(-9, 9);
    return {
      key: `rr-simple-${a}-${b}`,
      prompt: `Solve √(${lin(1, a)}) = ${b}.`,
      speech: talk(`Solve √(${lin(1, a)}) = ${b}.`),
      visual: NONE,
      ...signed(b * b - a),
      hint: "Square both sides, then solve. Check your answer in the original.",
      explain: `${lin(1, a)} = ${b * b}, so x = ${ds(b * b - a)}. Check: √${b * b} = ${b}. ✓`,
    };
  }
  if (kind === 1) {
    for (;;) {
      const b = rand(-3, 4);
      const m = rand(2, 5);
      const s = b + m;
      const a = m * m - s;
      const s2 = 2 * b + 1 - s;
      if (s2 === s) continue;
      const askReal = Math.random() < 0.6;
      const text = `√(${lin(1, a)}) = ${lin(1, -b)}`;
      return {
        key: `rr-ext-${b}-${m}-${askReal}`,
        prompt: `${text}. Squaring gives x = ${ds(s)} or x = ${ds(s2)}. ${askReal ? "Which really works?" : "Which is extraneous?"}`,
        speech: talk(`Solving ${text} by squaring gives x = ${ds(s)} or x = ${ds(s2)}. ${askReal ? "Which one is a true solution?" : "Which one is extraneous?"}`),
        visual: NONE,
        ...label(`x = ${ds(askReal ? s : s2)}`, [`x = ${ds(askReal ? s2 : s)}`, "both", "neither"]),
        hint: "Put each one back into the original equation. A square root can't equal a negative number.",
        explain: `x = ${ds(s)}: √${m * m} = ${m} ✓. x = ${ds(s2)}: √${(s2 - b) ** 2} = ${Math.abs(s2 - b)}, but the right side is ${ds(s2 - b)} ✗. So x = ${ds(s2)} is extraneous.`,
      };
    }
  }
  if (kind === 2) {
    const a = nz(-6, 6);
    return {
      key: `rr-rat-${a}`,
      prompt: `Solve x²/${fx(a)} = ${a * a}/${fx(a)}.`,
      speech: talk(`Solve x² over ${fx(a)} = ${a * a} over ${fx(a)}.`),
      visual: NONE,
      ...label(`x = ${ds(-a)} only`, [`x = ${ds(a)} only`, `x = ${ds(a)} or x = ${ds(-a)}`, "no solution"]),
      hint: "Multiply both sides by the denominator, solve, then check: the denominator can't be 0.",
      explain: `x² = ${a * a} gives x = ±${Math.abs(a)}, but x = ${ds(a)} makes ${fx(a)} = 0, so it's extraneous. Only x = ${ds(-a)}.`,
    };
  }
  const bb = rand(1, 6);
  const c = nz(-6, 6);
  const x = nz(-6, 8, -c);
  const a = bb * (x + c);
  return {
    key: `rr-frac-${a}-${bb}-${c}`,
    prompt: `Solve ${ds(a)}/(${lin(1, c)}) = ${bb}.`,
    speech: talk(`Solve ${ds(a)} over the quantity ${lin(1, c)}, equals ${bb}.`),
    visual: NONE,
    ...signed(x),
    hint: `Multiply both sides by (${lin(1, c)}), then solve. Check it doesn't make the bottom 0.`,
    explain: `${ds(a)} = ${bb}(${lin(1, c)}) → ${lin(1, c)} = ${ds(a / bb)} → x = ${ds(x)}.`,
  };
}

/** HSA-REI.C.7, HSA-REI.D.11 — a line meets a parabola. */
export function lineParabola(): Question {
  const kind = rand(0, 3);
  const [r1, r2] = sorted(distinct(2, -3, 3));
  const k = rand(-3, 2);
  const m = r1 + r2;
  const d = k - r1 * r2;
  const P = `y = x² ${signed$(k)}`.replace(" + 0", "");
  const L = `y = ${lin(m, d)}`;
  const vis = graph([-6, 6], [-6, 14], { curves: [{ fn: (x) => x * x + k, colour: "rose" }, { fn: lineFn(m, d), colour: "wave" }] });
  if (kind === 0) {
    const two = (a: [number, number], b: [number, number]) => `${pt(...a)} and ${pt(...b)}`;
    return {
      key: `lp-pts-${r1}-${r2}-${k}`,
      prompt: `Where do ${P} and ${L} meet?`,
      speech: talk(`Where do the parabola ${P} and the line ${L} meet?`),
      visual: vis,
      ...label(two([r1, r1 * r1 + k], [r2, r2 * r2 + k]), [two([-r1, r1 * r1 + k], [-r2, r2 * r2 + k]), two([r1, 0], [r2, 0]), two([r1 * r1 + k, r1], [r2 * r2 + k, r2])]),
      hint: "Set the two expressions for y equal, solve for x, then find each y.",
      explain: `x² ${signed$(k)} = ${lin(m, d)} → ${poly([1, -m, k - d])} = 0 → x = ${ds(r1)} or ${ds(r2)}. So ${two([r1, r1 * r1 + k], [r2, r2 * r2 + k])}.`.replace(" + 0 =", " ="),
    };
  }
  if (kind === 1) {
    const type = rand(0, 2);
    const c = rand(-2, 4);
    const t = rand(-2, 2);
    const line = type === 1 ? `y = ${lin(2 * t, c - t * t)}` : type === 0 ? `y = ${lin(0, c + rand(1, 5))}` : `y = ${lin(0, c - rand(1, 5))}`;
    const n = type === 0 ? 2 : type === 1 ? 1 : 0;
    return {
      key: `lp-count-${type}-${c}-${t}-${line}`,
      prompt: `How many times do y = x² ${signed$(c)} and ${line} meet?`.replace(" + 0 ", " "),
      speech: talk(`How many points do the parabola y = x² ${signed$(c)} and the line ${line} share?`),
      visual: NONE,
      answer: n,
      input: "choices",
      choices: [0, 1, 2],
      hint: "Set them equal and look at the discriminant, or sketch: is the line above, touching, or below the lowest point?",
      explain: n === 2 ? "The line cuts through the parabola: 2 points." : n === 1 ? "The line just touches the parabola (the discriminant is 0): 1 point." : "The line is below the parabola's lowest point: they never meet.",
    };
  }
  if (kind === 2) {
    const n = rand(1, 6);
    return {
      key: `lp-flat-${n}`,
      prompt: `Solve the system y = x² and y = ${n * n}.`,
      speech: `Solve the system y equals x squared and y equals ${n * n}.`,
      visual: graph([-7, 7], [-2, 40], { curves: [{ fn: (x) => x * x, colour: "rose" }, { fn: () => n * n, colour: "wave" }] }),
      ...label(`(${-n}, ${n * n}) and (${n}, ${n * n})`.replace("(-", "(−"), [`(${n}, ${n * n}) only`, `(${n * n}, ${n}) and (${n * n}, −${n})`, `(−${n}, 0) and (${n}, 0)`]),
      hint: "x² = the number. Don't forget the negative square root.",
      explain: `x² = ${n * n} → x = ±${n}, and y = ${n * n} for both.`,
    };
  }
  return {
    key: `lp-sub-${r1}-${r2}-${k}`,
    prompt: `Substitute ${L} into ${P}. Which equation results?`,
    speech: talk(`Substitute ${L} into ${P}. Which equation in x do you get?`),
    visual: NONE,
    ...label(`${poly([1, -m, k - d])} = 0`, [`${poly([1, m, k - d])} = 0`, `${poly([1, -m, k + d])} = 0`, `${poly([1, m, k + d])} = 0`, `${poly([1, -m, k - d + 2])} = 0`, `${poly([1, -m - 1, k - d])} = 0`]),
    hint: "Set x² + k equal to mx + d, then move everything to one side.",
    explain: `x² ${signed$(k)} = ${lin(m, d)} → ${poly([1, -m, k - d])} = 0.`.replace(" + 0 =", " ="),
  };
}

/* ======================================================= 9. Exponential & logs */

/** HSF-LE.A.1a–c — linear grows by equal differences, exponential by equal factors. */
export function linearVsExp(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const type = rand(0, 2);
    const a = rand(1, 6);
    const d = nz(-5, 8);
    const r = pick([2, 3, 0.5]);
    const start = r === 0.5 ? 16 * rand(1, 4) : a;
    const f = (x: number) => (type === 0 ? a + d * x : type === 1 ? start * r ** x : a + x * x);
    const word = ["linear", "exponential", "neither"][type];
    return {
      key: `le-table-${type}-${a}-${d}-${r}-${start}`,
      prompt: "Is this table linear, exponential, or neither?",
      speech: "Look at how y changes in the table. Is the function linear, exponential, or neither?",
      visual: { kind: "table", header: ["x", "y"], rows: [0, 1, 2, 3, 4].map((x) => [x, f(x)]) },
      needsVisual: true,
      ...label(word, ["linear", "exponential", "neither"].filter((w) => w !== word)),
      hint: "Check the differences (subtract) and the ratios (divide) between neighbours. Constant difference: linear. Constant ratio: exponential.",
      explain: type === 0 ? `y changes by ${ds(d)} every step: equal differences, so linear.` : type === 1 ? `y is multiplied by ${ds(r)} every step: equal factors, so exponential.` : "Neither the differences nor the ratios stay the same.",
    };
  }
  if (kind === 1) {
    const n = rand(2, 12);
    const p = pick([3, 5, 8, 10, 15, 20]);
    const [text, isExp] = pick([
      [`A town grows by ${p}% each year.`, true],
      [`A town grows by ${n * 100} people each year.`, false],
      [`A drug's amount halves every ${n} hours.`, true],
      [`A tank loses ${n} liters each hour.`, false],
      [`A video's views triple every ${n} days.`, true],
      [`A car loses ${p}% of its value each year.`, true],
      [`A plant grows ${n} cm each week.`, false],
      [`Savings earn ${p}% interest a year, compounded.`, true],
      [`You save $${n * 5} every week.`, false],
    ] as [string, boolean][]);
    return {
      key: `le-story-${text}`,
      prompt: `${text} Linear or exponential?`,
      speech: `${text} Is this linear or exponential?`,
      visual: NONE,
      ...yesNo(!isExp, "linear", "exponential"),
      hint: "The same AMOUNT each step is linear. The same PERCENT or factor each step is exponential.",
      explain: isExp ? "It changes by the same percent (factor) each step, so it's exponential." : "It changes by the same amount each step, so it's linear.",
    };
  }
  const start = rand(1, 5);
  const r = pick([2, 3, 4, 5]);
  return {
    key: `le-ratio-${start}-${r}`,
    prompt: "This table is exponential. Each step, y is multiplied by…",
    speech: "This table shows an exponential function. Each time x goes up by 1, y is multiplied by what?",
    visual: { kind: "table", header: ["x", "y"], rows: [0, 1, 2, 3].map((x) => [x, start * r ** x]) },
    needsVisual: true,
    ...choose(r, [start * r - start, r + 1, start], 1, 1),
    hint: "Divide any y by the one before it.",
    explain: `${start * r} ÷ ${start} = ${r}, and the same factor works for every step.`,
  };
}

/** HSF-LE.A.2, HSF-LE.B.5 — build linear and exponential models; interpret their parameters. */
export function buildExp(): Question {
  const kind = rand(0, 3);
  const a = rand(2, 9);
  const b = pick([2, 3, 4, 5]);
  if (kind === 0) {
    return {
      key: `be-table-${a}-${b}`,
      prompt: "Which equation fits this table?",
      speech: "Which equation fits the table?",
      visual: { kind: "table", header: ["x", "y"], rows: [0, 1, 2, 3].map((x) => [x, a * b ** x]) },
      needsVisual: true,
      ...label(`y = ${a}·${b}ˣ`, [`y = ${b}·${a}ˣ`, `y = ${a} + ${a * b - a}x`, `y = ${a}·${b + 1}ˣ`, `y = ${a * b}·${b}ˣ`]),
      hint: "At x = 0 you get the starting value a. The factor from row to row is b in y = a·bˣ.",
      explain: `Start ${a} (at x = 0), multiplied by ${b} each step: y = ${a}·${b}ˣ.`,
    };
  }
  if (kind === 1) {
    return {
      key: `be-two-${a}-${b}`,
      prompt: `An exponential function passes through (0, ${a}) and (2, ${a * b * b}). Growth factor?`,
      speech: `An exponential function y equals a times b to the x passes through 0, ${a} and 2, ${a * b * b}. What is the growth factor b?`,
      visual: NONE,
      ...choose(b, [b * b, (a * b * b - a) / 2, a], 1, 1),
      hint: `From x = 0 to x = 2 you multiply by b twice: b² = ${a * b * b} ÷ ${a}.`,
      explain: `b² = ${b * b}, so b = ${b}. The function is y = ${a}·${b}ˣ.`,
    };
  }
  if (kind === 2) {
    const P = rand(2, 40) * 100;
    const pct = pick([5, 8, 10, 12, 15, 20, 25]);
    const grow = Math.random() < 0.5;
    const f = grow ? 1 + pct / 100 : 1 - pct / 100;
    const askP = Math.random() < 0.35;
    if (askP) {
      return {
        key: `be-start-${P}-${f}`,
        prompt: `V = ${P}(${ds(f)})ᵗ models a value after t years. What does ${P} mean?`,
        speech: talk(`V = ${P}(${ds(f)})ᵗ models a value after t years. What does ${P} mean?`),
        visual: NONE,
        ...label("the starting value", ["the value after 1 year", "the yearly change", "the number of years"]),
        hint: "Put t = 0 into the model.",
        explain: `At t = 0, (${ds(f)})⁰ = 1, so V = ${P}: the starting value.`,
      };
    }
    return {
      key: `be-factor-${P}-${f}`,
      prompt: `V = ${P}(${ds(f)})ᵗ models a value after t years. What does ${ds(f)} tell you?`,
      speech: talk(`V = ${P}(${ds(f)})ᵗ. What does ${ds(f)} tell you?`),
      visual: NONE,
      ...label(grow ? `it grows ${pct}% a year` : `it loses ${pct}% a year`, [grow ? `it loses ${pct}% a year` : `it grows ${pct}% a year`, `it changes by $${ds(f)} a year`, grow ? `it grows ${100 + pct}% a year` : `it loses ${100 - pct}% a year`]),
      hint: "The factor 1 + r means growth by r; 1 − r means decay by r.",
      explain: `${ds(f)} = 1 ${grow ? "+" : "−"} ${ds(pct / 100)}, so it ${grow ? "grows" : "loses"} ${pct}% each year.`,
    };
  }
  const m = nz(-5, 6);
  const c = rand(-9, 9);
  const x1 = rand(-3, 1);
  const x2 = x1 + rand(1, 4);
  return {
    key: `be-lin-${m}-${c}-${x1}-${x2}`,
    prompt: `A linear function passes through ${pt(x1, m * x1 + c)} and ${pt(x2, m * x2 + c)}. Which is it?`,
    speech: talk(`A linear function passes through ${pt(x1, m * x1 + c)} and ${pt(x2, m * x2 + c)}. Which equation is it?`),
    visual: NONE,
    ...label(`y = ${lin(m, c)}`, [`y = ${lin(-m, c)}`, `y = ${lin(m, -c)}`, `y = ${lin(m, c + m)}`]),
    hint: "Slope = change in y ÷ change in x, then find b from one point.",
    explain: `Slope ${ds(m)}, and ${ds(m * x1 + c)} = ${ds(m)} × ${pa(x1)} + b gives b = ${ds(c)}.`,
  };
}

/** HSF-IF.C.8b, HSA-SSE.B.3c — growth and decay rates; rewriting exponential expressions. */
export function growthDecay(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const p = pick([2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25]);
    const grow = Math.random() < 0.5;
    const f = grow ? 1 + p / 100 : 1 - p / 100;
    const a = rand(1, 9) * 100;
    if (grow) {
      return {
        key: `gd-rate-${a}-${p}-g`,
        prompt: `y = ${a}(${ds(f)})ᵗ. By what percent does y grow each year?`,
        speech: talk(`y = ${a}(${ds(f)})ᵗ, with t in years. By what percent does y grow each year?`),
        visual: NONE,
        ...keypad(p),
        unit: "%",
        hint: "Write the factor as 1 + r.",
        explain: `${ds(f)} = 1 + ${ds(p / 100)}, so it grows ${p}% a year.`,
      };
    }
    return {
      key: `gd-rate-${a}-${p}-d`,
      prompt: `y = ${a}(${ds(f)})ᵗ. Describe the change each year.`,
      speech: talk(`y = ${a}(${ds(f)})ᵗ, with t in years. How does y change each year?`),
      visual: NONE,
      ...label(`${p}% decay`, [`${100 - p}% decay`, `${p}% growth`, `${ds(f)}% decay`]),
      hint: "A factor below 1 means decay. Write it as 1 − r.",
      explain: `${ds(f)} = 1 − ${ds(p / 100)}: it keeps ${100 - p}%, so it decays ${p}% a year.`,
    };
  }
  if (kind === 1) {
    const a = rand(1, 9) * 10;
    const n = rand(2, 6);
    const half = Math.random() < 0.5;
    const val = half ? a * 2 ** n : a * 2 ** n;
    if (half) {
      const step = pick([2, 4, 6, 8]);
      return {
        key: `gd-half-${val}-${n}-${step}`,
        prompt: `A ${val} mg dose halves every ${step} hours. How much is left after ${n * step} hours?`,
        speech: `A ${val} milligram dose of medicine halves every ${step} hours. How much is left after ${n * step} hours?`,
        visual: NONE,
        ...keypad(a),
        unit: "mg",
        hint: `${n * step} hours is ${n} half-lives. Halve ${n} times.`,
        explain: `${val} × (1/2)${sup(n)} = ${val} ÷ ${2 ** n} = ${a} mg.`,
      };
    }
    return {
      key: `gd-double-${a}-${n}`,
      prompt: `${a} bacteria double every hour. How many after ${n} hours?`,
      speech: `A culture starts with ${a} bacteria and doubles every hour. How many are there after ${n} hours?`,
      visual: NONE,
      ...keypad(val),
      hint: `y = ${a}·2ᵗ. Double ${n} times.`,
      explain: `${a} × 2${sup(n)} = ${a} × ${2 ** n} = ${val}.`,
    };
  }
  if (kind === 2) {
    const P = rand(2, 20) * 20;
    const p = pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const up = Math.random() < 0.5;
    const ans = up ? P * (1 + p / 100) : P * (1 - p / 100);
    return {
      key: `gd-pct-${P}-${p}-${up}`,
      prompt: `A $${P} price ${up ? "rises" : "drops"} ${p}%. What's the new price?`,
      speech: `A price of ${P} dollars ${up ? "goes up" : "goes down"} by ${p} percent. What is the new price?`,
      visual: NONE,
      ...keypad(ans),
      prefix: "$",
      hint: `Multiply by ${ds(up ? 1 + p / 100 : 1 - p / 100)}: that's 100% ${up ? "+" : "−"} ${p}%.`,
      explain: `${P} × ${ds(up ? 1 + p / 100 : 1 - p / 100)} = ${ds(ans)}.`,
    };
  }
  if (kind === 3) {
    const base = pick([2, 3, 5]);
    const k = rand(2, 3);
    return {
      key: `gd-rw-${base}-${k}`,
      prompt: `Rewrite ${base}^(${k}t) as bᵗ. What is b?`,
      speech: talk(`Rewrite ${base}^(${k}t) as b to the t. What is b?`),
      equation: [`${base}^(${k}t)`, "=", "bᵗ"],
      answerLine: ["b", "=", "?"],
      visual: NONE,
      ...choose(base ** k, [base * k, base + k, k ** base], 1, 1),
      hint: `${base}^(${k}t) = (${base}${sup(k)})ᵗ: a power of a power.`,
      explain: `${base}^(${k}t) = (${base}${sup(k)})ᵗ = ${base ** k}ᵗ, so b = ${base ** k}.`,
    };
  }
  const [big, k, b] = pick([[4, 2, 2], [9, 2, 3], [8, 3, 2], [27, 3, 3], [16, 2, 4], [16, 4, 2], [25, 2, 5], [64, 3, 4], [64, 2, 8], [81, 4, 3], [49, 2, 7], [100, 2, 10]]);
  const a = rand(1, 9) * 10;
  return {
    key: `gd-root-${big}-${k}-${a}`,
    prompt: `Rewrite y = ${a}·${big}^(t/${k}) as y = ${a}·bᵗ. What is b?`,
    speech: talk(`Rewrite y = ${a} times ${big}^(t/${k}) as ${a} times b to the t. What is b?`),
    visual: NONE,
    ...choose(b, [big / k, big, b * b], 1, 1),
    hint: `${big}^(t/${k}) = (${big}^(1/${k}))ᵗ. Which number to the power ${k} is ${big}?`,
    explain: `${big}^(1/${k}) = ${b}, so y = ${a}·${b}ᵗ: it grows by a factor of ${b} each unit of t.`,
  };
}

/** HSF-LE.A.3 — exponential growth eventually beats polynomial growth. */
export function expBeatsPoly(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const b = pick([2, 3]);
    const [k, type] = pick([[10, "lin"], [20, "lin"], [50, "lin"], [100, "lin"], [1, "sq"], [5, "sq"], [10, "sq"], [1, "cube"]] as [number, string][]);
    const g = (x: number) => (type === "lin" ? k * x : type === "sq" ? k * x * x : x ** 3);
    const gText = type === "lin" ? `${k}x` : type === "sq" ? `${k === 1 ? "" : k}x²` : "x³";
    let x = 1;
    while (b ** x <= g(x) || x < 2) x++;
    while (!(b ** x > g(x) && Array.from({ length: 20 }, (_, i) => x + i).every((t) => b ** t > g(t)))) x++;
    return {
      key: `eb-pass-${b}-${k}-${type}`,
      prompt: `Smallest whole x after which ${b}ˣ stays bigger than ${gText}?`,
      speech: talk(`What is the smallest whole number x from which ${b}ˣ stays bigger than ${gText}?`),
      visual: { kind: "table", header: ["x", `${b}ˣ`, gText], rows: [x - 2, x - 1, x, x + 1].filter((t) => t >= 0).map((t) => [t, b ** t, g(t)]) },
      ...keypad(x),
      hint: "Compare the columns. Where does the exponential pull ahead for good?",
      explain: `At x = ${x}, ${b}ˣ = ${b ** x} beats ${gText} = ${g(x)}, and the gap only grows after that.`,
    };
  }
  if (kind === 1) {
    const e = pick(["1.1ˣ", "1.05ˣ", "2ˣ", "1.5ˣ"]);
    const others = [`${rand(5, 50) * 100}x`, `${rand(10, 90)}x²`, `x³ + ${rand(100, 999)}`, `${rand(2, 9) * 1000}x + ${rand(1, 9) * 1000}`];
    return {
      key: `eb-pick-${e}-${others.join(",")}`,
      prompt: "Which will be largest when x is very large?",
      speech: talk(`Which of these will be largest when x is very large: ${[e, ...others.slice(0, 3)].join(", ")}?`),
      visual: NONE,
      ...label(e, others),
      hint: "However big the coefficient, a power of x grows slower than an exponential in the long run.",
      explain: `${e} multiplies by the same factor each step, so it eventually beats any polynomial.`,
    };
  }
  if (kind === 2) {
    const m = rand(2, 9) * 10;
    const n = pick([3, 5, 8, 10, 12, 15]);
    const exp = 2 ** n;
    const linv = m * n;
    return {
      key: `eb-at-${m}-${n}`,
      prompt: `f(x) = ${m}x and g(x) = 2ˣ. Which is bigger at x = ${n}?`,
      speech: talk(`f(x) = ${m}x and g(x) = 2ˣ. Which is bigger when x is ${n}?`),
      visual: NONE,
      ...(exp === linv ? yesNo(true, "they're equal", "f") : yesNo(exp > linv, "g(x) = 2ˣ", `f(x) = ${m}x`)),
      hint: `Work out both: ${m} × ${n} and 2${sup(n)}.`,
      explain: `f(${n}) = ${linv} and g(${n}) = ${exp}, so ${exp > linv ? "g" : "f"} is bigger${exp > linv ? "" : " for now — but g will catch up"}.`,
    };
  }
  const items = shuffle([
    { t: `${rand(2, 9) * 10}`, r: 0 },
    { t: `${rand(2, 9)}x`, r: 1 },
    { t: "x²", r: 2 },
    { t: "x³", r: 3 },
    { t: "2ˣ", r: 4 },
    { t: "3ˣ", r: 5 },
  ]).slice(0, rand(4, 5));
  const order = [...items].sort((p, q) => p.r - q.r);
  return {
    key: `eb-order-${order.map((o) => o.t).join(",")}`,
    prompt: "Order from slowest to fastest growth (for large x).",
    speech: talk(`Put these in order from slowest to fastest growth for large x: ${items.map((i) => i.t).join(", ")}.`),
    visual: NONE,
    input: "activity",
    activity: { kind: "order", items: order.map((o) => o.t), direction: "slowest to fastest growth" },
    answer: order.length,
    hint: "Constants don't grow; lines grow steadily; higher powers grow faster; exponentials beat every power.",
    explain: `${order.map((o) => o.t).join(" < ")} in the long run.`,
  };
}

/** HSA-SSE.B.4 — sum of a finite geometric series. */
export function geometricSeries(): Question {
  const kind = rand(0, 3);
  const a = rand(1, 5);
  const r = pick([2, 3]);
  const n = rand(4, r === 2 ? 9 : 6);
  const S = (a * (r ** n - 1)) / (r - 1);
  if (kind === 0) {
    const terms = Array.from({ length: n }, (_, i) => a * r ** i);
    return {
      key: `gs-sum-${a}-${r}-${n}`,
      prompt: `Find the sum: ${terms.length > 6 ? `${terms.slice(0, 3).join(" + ")} + … + ${terms[n - 1]}` : terms.join(" + ")}`,
      speech: `Find the sum of the geometric series ${terms.slice(0, 3).join(", ")}, and so on, up to ${terms[n - 1]}. That's ${n} terms.`,
      visual: NONE,
      ...keypad(S),
      hint: `Use S = a(rⁿ − 1)/(r − 1) with a = ${a}, r = ${r}, n = ${n}.`,
      explain: `S = ${a}(${r}${sup(n)} − 1)/(${r} − 1) = ${a} × ${r ** n - 1} ÷ ${r - 1} = ${S}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `gs-save-${a}-${r}-${n}`,
      prompt: `Save $${a} in week 1, then ${r === 2 ? "double" : "triple"} it each week. Total after ${n} weeks?`,
      speech: `You save ${a} dollars in week 1, and each week you save ${r === 2 ? "twice" : "three times"} as much as the week before. How much have you saved in total after ${n} weeks?`,
      visual: NONE,
      ...keypad(S),
      prefix: "$",
      hint: "That's a geometric series. Add the terms, or use S = a(rⁿ − 1)/(r − 1).",
      explain: `${a}(${r}${sup(n)} − 1)/(${r} − 1) = $${S}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `gs-parts-${a}-${r}-${n}`,
      prompt: `For ${a} + ${a * r} + ${a * r * r} + … (${n} terms), what are a, r and n?`,
      speech: `For the series ${a} plus ${a * r} plus ${a * r * r} and so on, with ${n} terms, what are a, r and n?`,
      visual: NONE,
      ...label(`a = ${a}, r = ${r}, n = ${n}`, [`a = ${r}, r = ${a}, n = ${n}`, `a = ${a}, r = ${a * r - a}, n = ${n}`, `a = ${a}, r = ${r}, n = ${n - 1}`]),
      hint: "a is the first term, r the factor between terms, n the number of terms.",
      explain: `First term ${a}, each term ×${r}, ${n} terms.`,
    };
  }
  const h = pick([81, 162, 243]);
  const drops = rand(3, 5);
  let total = 0;
  for (let i = 0; i < drops; i++) total += h / 3 ** i;
  return {
    key: `gs-ball-${h}-${drops}`,
    prompt: `A ball drops ${h} cm, then each bounce reaches 1/3 the height. Total of the first ${drops} drops?`,
    speech: `A ball drops from ${h} centimeters. Each bounce reaches one third of the height before. What is the total distance of the first ${drops} drops?`,
    visual: NONE,
    ...keypad(total),
    unit: "cm",
    hint: `The drops are ${h}, ${h / 3}, ${h / 9}, … Add ${drops} of them.`,
    explain: `${Array.from({ length: drops }, (_, i) => ds(h / 3 ** i)).join(" + ")} = ${ds(total)} cm.`,
  };
}

/** HSF-BF.B.3 — shifts, stretches and reflections; even and odd functions. */
export function transformations(): Question {
  const kind = rand(0, 4);
  const parents = [
    { name: "x²", fn: (x: number) => x * x },
    { name: "|x|", fn: (x: number) => Math.abs(x) },
  ];
  const P = pick(parents);
  if (kind === 0) {
    const vert = Math.random() < 0.5;
    const k = nz(-4, 4);
    const g = vert ? (x: number) => P.fn(x) + k : (x: number) => P.fn(x + k);
    return {
      key: `tf-graph-${P.name}-${vert}-${k}`,
      prompt: vert ? `f(x) = ${P.name} (solid). g(x) = f(x) + k (dashed). Find k.` : `f(x) = ${P.name} (solid). g(x) = f(x + k) (dashed). Find k.`,
      speech: talk(vert ? `The solid graph is f(x) = ${P.name}. The dashed graph is f(x) + k. What is k?` : `The solid graph is f(x) = ${P.name}. The dashed graph is f(x + k). What is k?`),
      visual: graph([-6, 6], [-5, 8], { curves: [{ fn: P.fn, colour: "wave" }, { fn: g, colour: "berry", dashed: true }] }),
      needsVisual: true,
      ...signed(k),
      hint: vert ? "Adding k outside moves the graph up (k > 0) or down." : "f(x + k) moves the graph LEFT when k is positive — the opposite of what you might guess.",
      explain: vert ? `The dashed graph is ${Math.abs(k)} ${k > 0 ? "up" : "down"}, so k = ${ds(k)}.` : `The dashed graph is ${Math.abs(k)} to the ${k > 0 ? "left" : "right"}, so k = ${ds(k)}.`,
    };
  }
  if (kind === 1) {
    const k = rand(1, 6);
    const [form, move] = pick([
      [`f(x − ${k})`, `right ${k}`],
      [`f(x + ${k})`, `left ${k}`],
      [`f(x) + ${k}`, `up ${k}`],
      [`f(x) − ${k}`, `down ${k}`],
    ]);
    return {
      key: `tf-word-${form}`,
      prompt: `g(x) = ${form}. How does the graph of f move?`,
      speech: talk(`g(x) = ${form}. How does the graph of f move to make g?`),
      visual: NONE,
      ...label(move, [`right ${k}`, `left ${k}`, `up ${k}`, `down ${k}`].filter((m) => m !== move)),
      hint: "Changes outside f move it up or down. Changes inside, with x, move it sideways the opposite way.",
      explain: `${form} shifts the graph ${move}.`,
    };
  }
  if (kind === 2) {
    const a = rand(-5, 5);
    const b = nz(-5, 5);
    const c = pick([2, 3]);
    const [form, img] = pick([
      [`${c}f(x)`, [a, c * b]],
      [`f(x) + ${c}`, [a, b + c]],
      [`f(x − ${c})`, [a + c, b]],
      [`−f(x)`, [a, -b]],
      [`f(−x)`, [-a, b]],
    ] as [string, [number, number]][]);
    if (img[0] === a && img[1] === b) return transformations();
    return {
      key: `tf-pt-${a}-${b}-${form}`,
      prompt: `${pt(a, b)} is on the graph of f. Which point is on g(x) = ${form}?`,
      speech: talk(`The point ${pt(a, b)} is on the graph of f. Which point must be on the graph of g(x) = ${form}?`),
      visual: NONE,
      ...label(pt(...img), [pt(a, b), pt(img[1], img[0]), pt(a + c, b + c), pt(-a, -b), pt(a - c, b)]),
      hint: "Outside changes act on y. Inside changes act on x, in reverse.",
      explain: `g(x) = ${form} sends ${pt(a, b)} to ${pt(...img)}.`,
    };
  }
  if (kind === 3) {
    const type = rand(0, 2);
    const c = () => nz(-5, 5);
    const text =
      type === 0 ? poly([c(), 0, c(), 0, rand(-9, 9)]) : type === 1 ? poly([c(), 0, c(), 0]) : poly([c(), c(), 0, rand(1, 9)]);
    const word = ["even", "odd", "neither"][type];
    return {
      key: `tf-eo-${text}`,
      prompt: `Is f(x) = ${text} even, odd, or neither?`,
      speech: talk(`Is f(x) = ${text} even, odd, or neither?`),
      visual: NONE,
      ...label(word, ["even", "odd", "neither"].filter((w) => w !== word)),
      hint: "Find f(−x). Same as f(x): even. Exactly −f(x): odd. Otherwise neither.",
      explain: type === 0 ? "Only even powers (and a constant), so f(−x) = f(x): even." : type === 1 ? "Only odd powers, so f(−x) = −f(x): odd." : "It mixes even and odd powers, so it's neither.",
    };
  }
  const neg = Math.random() < 0.5;
  return {
    key: `tf-refl-${neg}-${P.name}`,
    prompt: `g(x) = ${neg ? "−f(x)" : "f(−x)"}. The graph of f is reflected in…`,
    speech: talk(`g(x) = ${neg ? "−f(x)" : "f(−x)"}. The graph of f is reflected in which line?`),
    visual: NONE,
    ...label(neg ? "the x-axis" : "the y-axis", [neg ? "the y-axis" : "the x-axis", "the line y = x", "the origin only"]),
    hint: "A minus outside flips the y-values; a minus inside flips the x-values.",
    explain: neg ? "−f(x) negates every y-value: a flip over the x-axis." : "f(−x) swaps left and right: a flip over the y-axis.",
  };
}

/** HSF-BF.B.4a–d — find, check and read inverse functions; restrict a domain. */
export function inverses(): Question {
  const kind = rand(0, 4);
  const a = rand(2, 6);
  const b = nz(-9, 9);
  const f = (x: number) => a * x + b;
  if (kind === 0) {
    const inv = `f⁻¹(x) = (x ${signed$(-b)})/${a}`;
    return {
      key: `iv-find-${a}-${b}`,
      prompt: `Find the inverse of f(x) = ${lin(a, b)}.`,
      speech: talk(`Find the inverse of f(x) = ${lin(a, b)}.`),
      visual: NONE,
      ...label(inv, [`f⁻¹(x) = (x ${signed$(b)})/${a}`, `f⁻¹(x) = x/${a} ${signed$(-b)}`, `f⁻¹(x) = 1/(${lin(a, b)})`, `f⁻¹(x) = ${lin(a, -b)}`]),
      hint: "Write y = …, swap x and y, then solve for y. The inverse undoes the steps in reverse order.",
      explain: `f multiplies by ${a} then adds ${ds(b)}. The inverse subtracts ${ds(b)} then divides by ${a}: ${inv}.`,
    };
  }
  if (kind === 1) {
    const x = rand(-6, 8);
    return {
      key: `iv-val-${a}-${b}-${x}`,
      prompt: `f(x) = ${lin(a, b)}. Find f⁻¹(${ds(f(x))}).`,
      speech: talk(`f(x) = ${lin(a, b)}. What is f inverse of ${ds(f(x))}?`),
      visual: NONE,
      ...signed(x),
      hint: `f⁻¹(${ds(f(x))}) is the input that makes f give ${ds(f(x))}.`,
      explain: `${lin(a, b)} = ${ds(f(x))} → x = ${ds(x)}, so f⁻¹(${ds(f(x))}) = ${ds(x)}.`,
    };
  }
  if (kind === 2) {
    const xs = sorted(distinct(4, -3, 6));
    const ys = distinct(4, -5, 15);
    const i = rand(0, 3);
    return {
      key: `iv-table-${xs.join(".")}-${ys.join(".")}-${i}`,
      prompt: `The table shows f. What is f⁻¹(${ds(ys[i])})?`,
      speech: talk(`The table shows a function f. What is f inverse of ${ds(ys[i])}?`),
      visual: { kind: "table", header: ["x", "f(x)"], rows: xs.map((x, j) => [x, ys[j]]) },
      needsVisual: true,
      ...choose(xs[i], [ys[xs.indexOf(ys[i])] ?? ys[(i + 1) % 4], ...xs.filter((_, j) => j !== i)], 1),
      hint: "The inverse runs the table backwards: find the output, read its input.",
      explain: `f(${ds(xs[i])}) = ${ds(ys[i])}, so f⁻¹(${ds(ys[i])}) = ${ds(xs[i])}.`,
    };
  }
  if (kind === 3) {
    const real = Math.random() < 0.5;
    const g = real ? `(x ${signed$(-b)})/${a}` : `(x ${signed$(b)})/${a}`;
    return {
      key: `iv-comp-${a}-${b}-${real}`,
      prompt: `f(x) = ${lin(a, b)}, g(x) = ${g}. Are f and g inverses?`,
      speech: talk(`f(x) = ${lin(a, b)} and g(x) = ${g}. Are f and g inverses of each other?`),
      visual: NONE,
      ...yesNo(real),
      hint: "Check f(g(x)). Inverses give back exactly x.",
      explain: real ? `f(g(x)) = ${a} · (x ${signed$(-b)})/${a} ${signed$(b)} = x. They undo each other.` : `f(g(x)) = x ${signed$(2 * b)}, not x, so they aren't inverses.`,
    };
  }
  const h = nz(-4, 4);
  const k = nz(-4, 4, h);
  return {
    key: `iv-dom-${h}-${k}`,
    prompt: `f(x) = (${inner(h)})² ${signed$(k)} has no inverse. Which domain fixes that?`,
    speech: talk(`f(x) = (${inner(h)})² ${signed$(k)} fails the horizontal line test. Restricting to which domain gives it an inverse?`),
    visual: graph([-6, 6], [-6, 10], { curves: [{ fn: (x) => (x - h) ** 2 + k, colour: "grape" }] }),
    ...label(`x ≥ ${ds(h)}`, ["all real numbers", `x ≥ ${ds(k)}`, `${ds(h - 2)} ≤ x ≤ ${ds(h + 2)}`, `x ≥ ${ds(-h)}`]),
    hint: "Keep just one side of the vertex, so each output comes from only one input.",
    explain: `The vertex is at x = ${ds(h)}. Keeping x ≥ ${ds(h)} leaves one half of the parabola, which passes the horizontal line test.`,
  };
}

/** HSF-BF.B.5, HSF-LE.A.4 — logarithms undo exponentials; solve exponential equations. */
export function logarithms(): Question {
  const kind = rand(0, 4);
  const b = pick([2, 3, 5, 10]);
  const n = rand(b === 2 ? -3 : -2, b === 2 ? 7 : 4);
  const arg = n >= 0 ? String(b ** n) : `1/${b ** -n}`;
  const lg = b === 10 ? "log " : `log${sub(b)} `;
  if (kind === 0) {
    return {
      key: `lg-eval-${b}-${n}`,
      prompt: `What is ${lg}${n >= 0 ? arg : `(${arg})`}?`,
      speech: talk(`What is ${lg}${arg}?`),
      visual: NONE,
      ...signed(n),
      hint: `${lg}${arg} asks: ${b} to what power is ${arg}?`,
      explain: `${b}${sup(n)} = ${arg}, so ${lg}${arg} = ${ds(n)}.`,
    };
  }
  if (kind === 1) {
    const m = rand(2, 5);
    const B = pick([2, 3, 4, 5]);
    return {
      key: `lg-form-${B}-${m}`,
      prompt: `Write ${B}${sup(m)} = ${B ** m} in log form.`,
      speech: talk(`Write ${B}${sup(m)} = ${B ** m} as a logarithm.`),
      visual: NONE,
      ...label(`log${sub(B)} ${B ** m} = ${m}`, [`log${sub(m)} ${B ** m} = ${B}`, `log${sub(B)} ${m} = ${B ** m}`, `log${sub(B ** m)} ${B} = ${m}`]),
      hint: "logᵦ(answer) = exponent: the log gives back the exponent.",
      explain: `The base is ${B} and the exponent is ${m}: log${sub(B)} ${B ** m} = ${m}.`,
    };
  }
  if (kind === 2) {
    const tens = Math.random() < 0.5;
    const B = pick([2, 3, 5]);
    const v = tens ? rand(2, 99) : rand(2, 15);
    return {
      key: `lg-undo-${v}-${tens}-${tens ? 0 : B}`,
      prompt: tens ? `What is 10^(log ${v})?` : `What is log${sub(B)}(${B}${sup(v)})?`,
      speech: talk(tens ? `What is 10 to the power log ${v}?` : `What is log base ${B} of ${B} to the ${v}?`),
      visual: NONE,
      ...keypad(v),
      hint: "Logs and exponentials with the same base undo each other.",
      explain: tens ? `log ${v} is the power of 10 that gives ${v}, so 10^(log ${v}) = ${v}.` : `log${sub(B)} undoes ${B} to a power, leaving ${v}.`,
    };
  }
  if (kind === 3) {
    const a = rand(2, 9);
    const k = rand(-2, 4);
    const c = clean(a * 10 ** k);
    return {
      key: `lg-solve-${a}-${k}`,
      prompt: `Solve ${a} · 10ˣ = ${ds(c)}.`,
      speech: talk(`Solve ${a} times 10ˣ = ${ds(c)}.`),
      visual: NONE,
      ...signed(k),
      hint: `Divide by ${a} first, then ask: 10 to what power?`,
      explain: `10ˣ = ${ds(c / a)}, so x = log ${ds(c / a)} = ${ds(k)}.`,
    };
  }
  const a = rand(2, 9);
  const q = pick([3, 5, 7, 15, 20, 30, 40]);
  const useE = Math.random() < 0.4;
  if (useE) {
    return {
      key: `lg-e-${a}-${q}`,
      prompt: `Solve ${a}eˣ = ${a * q}.`,
      speech: talk(`Solve ${a} e to the x = ${a * q}.`),
      visual: NONE,
      ...label(`x = ln ${q}`, [`x = ln ${a * q}`, `x = ${q}`, `x = log ${q}`, `x = ln ${a * q - a}`]),
      hint: `Divide by ${a}, then take the natural log (ln), which undoes eˣ.`,
      explain: `eˣ = ${q}, so x = ln ${q} ≈ ${Math.log(q).toFixed(3)}.`,
    };
  }
  return {
    key: `lg-10-${a}-${q}`,
    prompt: `Solve ${a} · 10ˣ = ${a * q}.`,
    speech: talk(`Solve ${a} times 10ˣ = ${a * q}.`),
    visual: NONE,
    ...label(`x = log ${q}`, [`x = log ${a * q}`, `x = ${q}`, `x = log ${a * q - a}`, `x = ln ${q}`]),
    hint: `Divide by ${a} first. Then take log (base 10) of both sides.`,
    explain: `10ˣ = ${q}, so x = log ${q} ≈ ${Math.log10(q).toFixed(3)}.`,
  };
}

/** HSF-IF.C.7e — graphs of exponential and logarithmic functions. */
export function expLogGraphs(): Question {
  const kind = rand(0, 3);
  if (kind === 0 || kind === 2) {
    const a = rand(1, 4);
    const b = pick([2, 3, 0.5]);
    const k = kind === 2 ? nz(-3, 3) : 0;
    const f = (x: number) => a * b ** x + k;
    const vis = graph([-4, 5], [-4, 12], { curves: [{ fn: f, colour: "lime" }] });
    if (kind === 0) {
      const askGrowth = Math.random() < 0.4;
      return {
        key: `xl-exp-${a}-${b}-${askGrowth}`,
        prompt: askGrowth ? "Does this graph show growth or decay?" : "This exponential graph: what is its y-intercept?",
        speech: askGrowth ? "Does the exponential graph show growth or decay?" : "What is the y-intercept of this exponential graph?",
        visual: vis,
        needsVisual: true,
        ...(askGrowth ? yesNo(b > 1, "growth", "decay") : keypad(a)),
        hint: askGrowth ? "Read left to right: does it rise or fall?" : "Where does the curve cross the y-axis?",
        explain: askGrowth ? `It ${b > 1 ? "rises" : "falls"} from left to right: ${b > 1 ? "growth" : "decay"} (y = ${a}·${ds(b)}ˣ).` : `It crosses at ${pt(0, a)}, since ${ds(b)}⁰ = 1: y = ${a}·${ds(b)}ˣ.`,
      };
    }
    return {
      key: `xl-asym-${a}-${b}-${k}`,
      prompt: `y = ${a === 1 ? "" : `${a}·`}${ds(b)}ˣ ${signed$(k)}: where is the horizontal asymptote?`,
      speech: talk(`For y = ${a === 1 ? "" : `${a} times `}${ds(b)}ˣ ${signed$(k)}, where is the horizontal asymptote?`),
      visual: vis,
      ...label(`y = ${ds(k)}`, [`y = 0`, `y = ${ds(-k)}`, `x = ${ds(k)}`, `y = ${ds(a + k)}`]),
      hint: `${ds(b)}ˣ gets close to 0 on one side but never reaches it. What's y then?`,
      explain: `${a === 1 ? "" : `${a}·`}${ds(b)}ˣ → 0, so y → ${ds(k)}: the asymptote is y = ${ds(k)}.`,
    };
  }
  if (kind === 1) {
    const h = rand(-3, 2);
    const askInt = Math.random() < 0.5;
    const f = (x: number) => (x <= h + 0.02 ? NaN : Math.log2(x - h));
    const text = `y = log₂(${inner(h)})`;
    return {
      key: `xl-log-${h}-${askInt}`,
      prompt: askInt ? `${text}: what is the x-intercept?` : `${text}: where is the vertical asymptote?`,
      speech: talk(askInt ? `For ${text}, what is the x-intercept?` : `For ${text}, where is the vertical asymptote?`),
      visual: graph([-5, 7], [-4, 4], { curves: [{ fn: f, colour: "lime" }] }),
      ...(askInt ? signed(h + 1) : label(`x = ${ds(h)}`, [`x = ${ds(-h)}`, `y = ${ds(h)}`, `x = ${ds(h + 1)}`])),
      hint: askInt ? "log₂(1) = 0. When is the inside equal to 1?" : "You can only take the log of a positive number. Where does the inside hit 0?",
      explain: askInt ? `${inner(h)} = 1 when x = ${ds(h + 1)}, and log₂ 1 = 0.` : `The inside ${inner(h)} is 0 at x = ${ds(h)}: the graph hugs x = ${ds(h)} but never touches it.`,
    };
  }
  return {
    key: `xl-mirror-${rand(0, 0)}`,
    prompt: "y = 2ˣ and y = log₂ x are mirror images in which line?",
    speech: "The graphs of y equals 2 to the x, and y equals log base 2 of x, are mirror images in which line?",
    visual: graph([-4, 6], [-4, 6], {
      curves: [{ fn: (x) => 2 ** x, colour: "lime" }, { fn: (x) => (x <= 0.02 ? NaN : Math.log2(x)), colour: "grape" }, { fn: (x) => x, colour: "night", dashed: true }],
    }),
    ...label("y = x", ["the x-axis", "the y-axis", "y = −x"]),
    hint: "Inverse functions swap x and y.",
    explain: "They are inverses, so swapping x and y turns one into the other: a reflection in y = x.",
  };
}

/* ============================================================== 10. Data & models */

/** Scatter data around y = m·x + b with whole-number noise up to ±noise, x = 1…n. */
function scatter(m: number, b: number, noise: number, n = 10): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const x = i + 1;
    return [x, Math.round(m * x + b + (Math.random() * 2 - 1) * noise)] as [number, number];
  });
}

function corr(pts: [number, number][]): number {
  const n = pts.length;
  const mx = sum(pts.map((p) => p[0])) / n;
  const my = sum(pts.map((p) => p[1])) / n;
  const sxy = sum(pts.map(([x, y]) => (x - mx) * (y - my)));
  const sxx = sum(pts.map(([x]) => (x - mx) ** 2));
  const syy = sum(pts.map(([, y]) => (y - my) ** 2));
  return syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

const scatterPlot = (pts: [number, number][], extra: Partial<Omit<Plot, "kind" | "x" | "y">> = {}): Visual => {
  const ys = pts.map((p) => p[1]);
  return graph([0, 11], [Math.min(0, ...ys) - 1, Math.max(...ys) + 2], { points: pts.map(([x, y]) => ({ x, y })), ...extra });
};

/** 8.SP.A.1 — scatter plots: association, outliers, linear or not. */
export function scatterPlots(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const type = rand(0, 2);
    const pts = type === 2 ? Array.from({ length: 10 }, (_, i) => [i + 1, rand(1, 12)] as [number, number]) : scatter(type === 0 ? 1 : -1, type === 0 ? 1 : 12, 1.5);
    const r = corr(pts);
    if (type === 2 && Math.abs(r) > 0.3) return scatterPlots();
    const word = ["positive", "negative", "no association"][type];
    return {
      key: `sc-assoc-${pts.map((p) => p[1]).join(".")}`,
      prompt: "What kind of association does this scatter plot show?",
      speech: "What kind of association does the scatter plot show?",
      visual: scatterPlot(pts),
      needsVisual: true,
      ...label(word, ["positive", "negative", "no association"].filter((w) => w !== word)),
      hint: "As x increases, does y tend to go up, go down, or neither?",
      explain: type === 0 ? "y tends to rise as x rises: positive association." : type === 1 ? "y tends to fall as x rises: negative association." : "No clear trend up or down: no association.",
    };
  }
  if (kind === 1) {
    const pts = scatter(pick([1, -1]), 6, 1);
    const i = rand(2, 7);
    pts[i] = [pts[i][0], pts[i][1] + pick([1, -1]) * rand(7, 9)];
    const others = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((j) => j !== i)).slice(0, 3);
    const marked = shuffle([i, ...others]);
    const names = ["A", "B", "C", "D"];
    const win = marked.indexOf(i);
    return {
      key: `sc-out-${pts.map((p) => p[1]).join(".")}`,
      prompt: "Which labelled point is an outlier?",
      speech: "Which labelled point is an outlier?",
      visual: scatterPlot(pts, { points: pts.map(([x, y], j) => ({ x, y, label: marked.includes(j) ? names[marked.indexOf(j)] : undefined })) }),
      needsVisual: true,
      ...fixedLabels(names, win),
      hint: "An outlier sits far away from the pattern the other points make.",
      explain: `Point ${names[win]} is far from the trend of the rest, so it's an outlier.`,
    };
  }
  const curved = Math.random() < 0.5;
  const pts: [number, number][] = curved
    ? Array.from({ length: 10 }, (_, i) => [i + 1, Math.round(0.25 * (i + 1 - 5.5) ** 2 + rand(0, 1))])
    : scatter(pick([1, 0.5, -1]), 6, 1);
  return {
    key: `sc-shape-${curved}-${pts.map((p) => p[1]).join(".")}`,
    prompt: "Is the association linear or nonlinear?",
    speech: "Does the scatter plot show a linear or a nonlinear association?",
    visual: scatterPlot(pts),
    needsVisual: true,
    ...yesNo(!curved, "linear", "nonlinear"),
    hint: "Could one straight line follow the points, or do they bend?",
    explain: curved ? "The points dip and then rise: a curve, so it's nonlinear." : "The points lie close to a straight line: linear.",
  };
}

/** Activity: build a dot plot or plot scatter points from data. 8.SP.A.1, HSS-ID.A.1. */
export function buildDisplays(): Question {
  if (Math.random() < 0.5) {
    const n = rand(6, 10);
    const lo = rand(0, 3);
    const values = Array.from({ length: n }, () => lo + rand(0, 6));
    return {
      key: `bd-dot-${values.join(".")}`,
      prompt: `Make a dot plot of: ${values.join(", ")}.`,
      speech: `Make a dot plot of these ${n} values: ${values.join(", ")}.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "dotPlot", values, min: lo, max: lo + 6, step: 1, label: "value" },
      answer: n,
      hint: "Put one dot above the number line for each value. Repeated values stack up.",
      explain: `${n} dots in all. The tallest stack is the mode.`,
    };
  }
  const xs = sorted(distinct(4, 1, 8));
  const pts = xs.map((x) => ({ x, y: rand(1, 8) }));
  const names = ["A", "B", "C", "D"];
  return {
    key: `bd-scatter-${pts.map((p) => `${p.x},${p.y}`).join("|")}`,
    prompt: "Make a scatter plot: plot each (hours, score) pair.",
    speech: `Plot each data pair as a point: ${pts.map((p) => pt(p.x, p.y)).join("; ")}.`,
    visual: { kind: "table", header: ["", "hours (x)", "score (y)"], rows: pts.map((p, i) => [names[i], p.x, p.y]) },
    input: "activity",
    activity: { kind: "plotPoints", points: pts.map((p, i) => ({ ...p, label: names[i] })), size: 8, quadrants: 1 },
    answer: 4,
    hint: "Go across to the x value, then up to the y value.",
    explain: pts.map((p, i) => `${names[i]} ${pt(p.x, p.y)}`).join(", ") + ".",
  };
}

/** 8.SP.A.2, HSS-ID.B.6c — fit a straight line to a scatter plot. */
export function fitLine(): Question {
  const kind = rand(0, 1);
  const m = pick([0.5, 1, 1.5, 2, -0.5, -1]);
  const b = m > 0 ? rand(0, 3) : rand(10, 14);
  const pts = scatter(m, b, 1.5);
  if (kind === 0) {
    const eq = (mm: number, bb: number) => `y = ${lin(mm, bb)}`;
    return {
      key: `fl-pick-${m}-${b}-${pts.map((p) => p[1]).join(".")}`,
      prompt: "Which line fits the data best?",
      speech: "Which line is the best fit for the scatter plot?",
      visual: scatterPlot(pts),
      needsVisual: true,
      ...label(eq(m, b), [eq(-m, b), eq(m, b + 5), eq(m * 2 + 1, b), eq(-m, b + 6 * m)]),
      hint: "Estimate where the trend crosses the y-axis, and how much y changes for each step in x.",
      explain: `The points start near y = ${b} and change by about ${ds(m)} per step: ${eq(m, b)}.`,
    };
  }
  const kindLine = rand(0, 3);
  const [lm, lb, ok, why] = [
    [m, b, true, "Yes — it follows the trend"],
    [-m, b + 11 * m, false, "No — it slopes the wrong way"],
    [m, b + (m > 0 ? -5 : 5), false, m > 0 ? "No — almost every point is above it" : "No — almost every point is below it"],
    [m * 3, b - (m * 3 - m) * 5.5, false, "No — it's much too steep"],
  ][kindLine] as [number, number, boolean, string];
  return {
    key: `fl-judge-${m}-${b}-${kindLine}-${pts.map((p) => p[1]).join(".")}`,
    prompt: "Is the drawn line a good line of fit?",
    speech: "A line has been drawn on the scatter plot. Is it a good line of fit?",
    visual: scatterPlot(pts, { lines: [{ from: [0, lb], to: [11, lm * 11 + lb], colour: "tangerine" }] }),
    needsVisual: true,
    ...label(why, ["Yes — it follows the trend", "No — it slopes the wrong way", m > 0 ? "No — almost every point is above it" : "No — almost every point is below it", "No — it's much too steep"].filter((w) => w !== why)),
    hint: "A good line follows the direction of the points and has about as many points above it as below.",
    explain: ok ? "It follows the trend, with points scattered evenly on both sides." : `${why.replace("No — ", "It isn't: ")}.`,
  };
}

const MODELS = [
  { x: "hours studied", y: "test score", m: [3, 4, 5, 6], b: [40, 45, 50, 55], unit: "points", per: "hour" },
  { x: "temperature (°F)", y: "drinks sold", m: [2, 3, 4], b: [5, 10, 15], unit: "drinks", per: "degree" },
  { x: "car age (years)", y: "value ($1000s)", m: [-2, -1.5, -3], b: [25, 30, 35], unit: "thousand dollars", per: "year" },
  { x: "weeks", y: "plant height (cm)", m: [1.5, 2, 2.5], b: [3, 4, 5], unit: "cm", per: "week" },
];

/** 8.SP.A.3, HSS-ID.C.7, HSS-ID.B.6a — use a fitted model: predict, read slope and intercept, choose a model type. */
export function useModel(): Question {
  const kind = rand(0, 3);
  const M = pick(MODELS);
  const m = pick(M.m);
  const b = pick(M.b);
  const model = `y = ${lin(m, b)}`;
  if (kind === 0) {
    const x = rand(2, 9);
    return {
      key: `um-pred-${M.x}-${m}-${b}-${x}`,
      prompt: `Line of fit for ${M.y} vs ${M.x}: ${model}. Predict y when x = ${x}.`,
      speech: talk(`The line of fit for ${M.y} against ${M.x} is ${model}. Predict y when x is ${x}.`),
      visual: NONE,
      ...keypad(m * x + b),
      hint: "Substitute the x value into the model.",
      explain: `y = ${ds(m)} × ${x} + ${b} = ${ds(m * x + b)}.`,
    };
  }
  if (kind === 1) {
    const sign = m > 0 ? "increases" : "decreases";
    return {
      key: `um-slope-${M.x}-${m}-${b}`,
      prompt: `${M.y} vs ${M.x}: ${model}. What does ${ds(m)} mean?`,
      speech: talk(`For ${M.y} against ${M.x}, the model is ${model}. What does the slope, ${ds(m)}, mean?`),
      visual: NONE,
      ...label(`each extra ${M.per}, y ${sign} by about ${ds(Math.abs(m))} ${M.unit}`, [`when x is 0, y is ${ds(m)}`, `each extra 1 in y, x goes up by ${ds(Math.abs(m))}`, `y ${sign} by ${b} each ${M.per}`]),
      hint: "The slope is the change in y for each 1 more of x.",
      explain: `Slope ${ds(m)}: for each 1 more ${M.per}, the model's ${M.y} ${sign} by about ${ds(Math.abs(m))}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `um-int-${M.x}-${m}-${b}`,
      prompt: `${M.y} vs ${M.x}: ${model}. What does ${b} mean?`,
      speech: talk(`For ${M.y} against ${M.x}, the model is ${model}. What does the intercept, ${b}, mean?`),
      visual: NONE,
      ...label(`the predicted ${M.y} when x = 0`, [`the change in ${M.y} per ${M.per}`, `the largest ${M.y}`, `the number of data points`]),
      hint: "The intercept is the value of y when x is 0.",
      explain: `At x = 0 the model gives y = ${b}: the predicted ${M.y} at zero ${M.x.replace(/ \(.*\)/, "")}.`,
    };
  }
  const type = rand(0, 2);
  const a = rand(2, 4);
  const pts: [number, number][] = Array.from({ length: 8 }, (_, i) => {
    const x = i + 1;
    const y = type === 0 ? 2 * x + a : type === 1 ? a * 1.5 ** x : 0.5 * (x - 4.5) ** 2 + a;
    return [x, Math.round(y)];
  });
  const word = ["linear", "exponential", "quadratic"][type];
  return {
    key: `um-type-${type}-${a}`,
    prompt: "Which type of function would fit this data best?",
    speech: "Which type of function would model this data best?",
    visual: scatterPlot(pts),
    needsVisual: true,
    ...label(word, ["linear", "exponential", "quadratic"].filter((w) => w !== word)),
    hint: "Straight: linear. Curving up faster and faster in one direction: exponential. A U shape: quadratic.",
    explain: type === 0 ? "The points rise in a straight line: linear." : type === 1 ? "They rise by bigger and bigger jumps (a constant factor): exponential." : "They fall and then rise in a U: quadratic.",
  };
}

/** HSS-ID.B.6b — residuals: actual minus predicted; residual plots. */
export function residuals(): Question {
  const kind = rand(0, 2);
  const m = nz(-4, 5);
  const b = rand(-5, 10);
  const x = rand(1, 9);
  const r = nz(-6, 6);
  const y = m * x + b + r;
  if (kind === 0) {
    return {
      key: `rs-calc-${m}-${b}-${x}-${r}`,
      prompt: `Model: y = ${lin(m, b)}. Data point ${pt(x, y)}. What is the residual?`,
      speech: talk(`The model is y = ${lin(m, b)}. A data point is ${pt(x, y)}. What is its residual?`),
      visual: NONE,
      ...signed(r),
      hint: "Residual = actual y − predicted y.",
      explain: `Predicted: ${ds(m)} × ${x} ${signed$(b)} = ${ds(m * x + b)}. Residual = ${ds(y)} − ${pa(m * x + b)} = ${ds(r)}.`,
    };
  }
  if (kind === 1) {
    const pts = scatter(m > 0 ? 1 : -1, 6, 1.2);
    const above = r > 0;
    const i = rand(2, 7);
    const lineY = (m > 0 ? 1 : -1) * pts[i][0] + 6;
    pts[i] = [pts[i][0], lineY + (above ? 3 : -3)];
    return {
      key: `rs-sign-${above}-${pts.map((p) => p[1]).join(".")}`,
      prompt: "Point P is marked. Is its residual positive or negative?",
      speech: "The line of fit is drawn and point P is marked. Is P's residual positive or negative?",
      visual: scatterPlot(pts, { lines: [{ from: [0, 6], to: [11, (m > 0 ? 1 : -1) * 11 + 6], colour: "tangerine" }], points: pts.map(([px, py], j) => ({ x: px, y: py, label: j === i ? "P" : undefined })) }),
      needsVisual: true,
      ...label(above ? "positive" : "negative", [above ? "negative" : "positive", "zero"]),
      hint: "Residual = actual − predicted. Is the point above or below the line?",
      explain: above ? "P is above the line: actual > predicted, so the residual is positive." : "P is below the line: actual < predicted, so the residual is negative.",
    };
  }
  const curved = Math.random() < 0.5;
  const pts: [number, number][] = Array.from({ length: 10 }, (_, i) => [i + 1, curved ? Math.round(((i + 1 - 5.5) ** 2) / 3 - 3 + rand(-1, 1) * 0.5) : rand(-3, 3)]);
  return {
    key: `rs-plot-${curved}-${pts.map((p) => p[1]).join(".")}`,
    prompt: "This is a residual plot for a linear model. Is the line a good fit?",
    speech: "This is a residual plot for a linear model. Is a line a good fit for the data?",
    visual: graph([0, 11], [-6, 8], { points: pts.map(([px, py]) => ({ x: px, y: py })), lines: [{ from: [0, 0], to: [11, 0], colour: "night", dashed: true }] }),
    needsVisual: true,
    ...yesNo(!curved, "yes — the residuals look random", "no — the residuals make a curve"),
    hint: "Random scatter around 0 means the line fits. A clear pattern (like a U) means a curve fits better.",
    explain: curved ? "The residuals form a U shape, so a curved model would fit better." : "The residuals bounce randomly around 0, so the linear model fits well.",
  };
}

/** HSS-ID.C.8, HSS-ID.C.9 — the correlation coefficient; correlation isn't causation. */
export function correlation(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const targets = [0.9, 0.5, 0, -0.5, -0.9];
    for (;;) {
      const t = pick(targets);
      const noise = t === 0 ? 0 : Math.abs(t) === 0.9 ? 1.2 : 8;
      const pts: [number, number][] = t === 0 ? Array.from({ length: 12 }, (_, i) => [((i % 10) + 1), rand(1, 12)]) : scatter(t > 0 ? 1 : -1, t > 0 ? 1 : 12, noise, 10);
      const r = corr(pts);
      if (Math.abs(r - t) > 0.12) continue;
      const lbl = (v: number) => `r = ${ds(v)}`;
      return {
        key: `co-r-${t}-${pts.map((p) => p[1]).join(".")}`,
        prompt: "Which correlation coefficient best fits this scatter plot?",
        speech: "Which value of the correlation coefficient, r, best fits this scatter plot?",
        visual: scatterPlot(pts),
        needsVisual: true,
        ...label(lbl(t), targets.filter((v) => v !== t).map(lbl)),
        hint: "The sign of r gives the direction. The closer |r| is to 1, the closer the points hug a line.",
        explain: `The points ${t === 0 ? "show no trend, so r is near 0" : `go ${t > 0 ? "up" : "down"} ${Math.abs(t) === 0.9 ? "and hug a line tightly" : "but loosely"}, so r ≈ ${ds(t)}`}. (Here r = ${r.toFixed(2)}.)`,
      };
    }
  }
  if (kind === 1) {
    const sign = pick([1, -1]);
    const mag = pick([0.92, 0.85, 0.15, 0.08, 0.55]);
    const r = clean(sign * mag);
    const strength = mag >= 0.8 ? "strong" : mag <= 0.2 ? "almost no" : "moderate";
    const dir = sign > 0 ? "positive" : "negative";
    const correct = strength === "almost no" ? "almost no linear association" : `a ${strength} ${dir} linear association`;
    return {
      key: `co-read-${r}`,
      prompt: `r = ${ds(r)}. What does this describe?`,
      speech: talk(`The correlation coefficient is r = ${ds(r)}. What does that describe?`),
      visual: NONE,
      ...label(correct, [`a strong ${sign > 0 ? "negative" : "positive"} linear association`, `a ${strength === "strong" ? "weak" : "strong"} ${dir} linear association`, `${Math.round(mag * 100)}% of the points are on the line`, "almost no linear association"].filter((w) => w !== correct)),
      hint: "Sign = direction. Size: near ±1 strong, near 0 weak or none.",
      explain: `r = ${ds(r)} is ${dir} and ${mag >= 0.8 ? "close to ±1" : mag <= 0.2 ? "close to 0" : "in between"}: ${correct}.`,
    };
  }
  const r = clean(rand(60, 95) / 100);
  const [pair, cause] = pick([
    ["Ice cream sales and sunburns", "hot sunny weather"],
    ["Kids' shoe size and reading level", "age"],
    ["Number of firefighters at a fire and the damage", "the size of the fire"],
    ["A town's number of libraries and its crime count", "population"],
    ["Hot chocolate sales and flu cases", "cold winter weather"],
    ["Umbrella sales and traffic accidents", "rainy weather"],
  ]);
  return {
    key: `co-cause-${pair}-${r}`,
    prompt: `${pair} have r = ${ds(r)}. Does one cause the other?`,
    speech: `${pair} have a correlation of ${ds(r)}. Does one cause the other?`,
    visual: NONE,
    ...label("not necessarily — correlation isn't causation", ["yes, a high r proves it", "yes, because r is above 0.5", "no, they can't be related"]),
    hint: "Could something else be driving both?",
    explain: `A strong correlation doesn't show cause. Here ${cause} likely drives both.`,
  };
}

/** 8.SP.A.4, HSS-ID.B.5 — two-way tables and relative frequencies. */
export function twoWayTables(): Question {
  const kind = rand(0, 3);
  const [rowA, rowB, colY, colN, topic] = pick([
    ["Grade 7", "Grade 8", "Yes", "No", "Do you have a pet?"],
    ["Plays sport", "No sport", "Likes math", "Doesn't", "Likes math?"],
    ["Under 13", "13 and up", "Has a phone", "No phone", "Has a phone?"],
  ]);
  const nA = pick([20, 25, 40, 50]);
  const nB = pick([20, 25, 40, 50]);
  const assoc = Math.random() < 0.5;
  const pA = pick([20, 40, 60, 80]);
  const pB = assoc ? pick([20, 40, 60, 80].filter((v) => Math.abs(v - pA) >= 40)) : pA;
  const a = (nA * pA) / 100;
  const c = (nB * pB) / 100;
  const b = nA - a;
  const d = nB - c;
  const N = nA + nB;
  const visual: Visual = { kind: "table", header: ["", colY, colN, "Total"], rows: [[rowA, a, b, nA], [rowB, c, d, nB], ["Total", a + c, b + d, N]] };
  if (kind === 0) {
    return {
      key: `tw-pct-${topic}-${a}-${b}-${c}-${d}`,
      prompt: `What percent of "${rowB}" said "${colY}"?`,
      speech: `${topic} What percent of the ${rowB} group said ${colY}?`,
      visual,
      needsVisual: true,
      ...keypad(pB),
      unit: "%",
      hint: `Only look at the ${rowB} row: ${colY} ÷ row total.`,
      explain: `${c} ÷ ${nB} = ${ds(c / nB)} = ${pB}%.`,
    };
  }
  if (kind === 1) {
    return {
      key: `tw-total-${topic}-${a}-${b}-${c}-${d}`,
      prompt: `How many people said "${colN}" in all?`,
      speech: `${topic} How many people in the table said ${colN} altogether?`,
      visual: { ...visual, rows: [[rowA, a, b, nA], [rowB, c, d, nB]] } as Visual,
      needsVisual: true,
      ...keypad(b + d),
      hint: "Add down the column.",
      explain: `${b} + ${d} = ${b + d}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `tw-joint-${topic}-${a}-${b}-${c}-${d}`,
      prompt: `What fraction of ALL people are "${rowA}" and "${colY}"?`,
      speech: `${topic} What fraction of everyone in the table is in the ${rowA} group and said ${colY}?`,
      visual,
      needsVisual: true,
      ...label(fracStr(a, N), [fracStr(a, nA), fracStr(a, a + c), fracStr(nA, N)]),
      hint: "Joint relative frequency: that one cell ÷ the grand total.",
      explain: `${a} out of ${N}: ${fracStr(a, N)}.`,
    };
  }
  return {
    key: `tw-assoc-${topic}-${a}-${b}-${c}-${d}`,
    prompt: "Is there an association between the row and the answer?",
    speech: `${topic} Compare the rows. Is there an association between the group and the answer?`,
    visual,
    needsVisual: true,
    ...yesNo(assoc, "yes — the row percents differ a lot", "no — the row percents are about the same"),
    hint: "Find the percent who said yes in each row and compare.",
    explain: `${rowA}: ${pA}% said ${colY}. ${rowB}: ${pB}%. ${assoc ? "Very different, so there is an association." : "The same, so no association."}`,
  };
}

/** HSS-ID.A.1 — read dot plots, histograms and box plots. */
export function dataDisplays(): Question {
  const kind = rand(0, 3);
  if (kind === 0 || kind === 3) {
    const min = rand(0, 20);
    const q1 = min + rand(2, 10);
    const med = q1 + rand(1, 10);
    const q3 = med + rand(1, 10);
    const max = q3 + rand(2, 12);
    const vis: Visual = { kind: "boxplot", min, q1, median: med, q3, max, axis: [Math.floor(min / 10) * 10, Math.ceil(max / 10) * 10], label: "score" };
    if (kind === 3) {
      const [what, ans] = pick([["between Q1 and Q3", 50], ["above the median", 50], ["below Q1", 25], ["above Q3", 25], ["below Q3", 75]] as [string, number][]);
      return {
        key: `dd-pct-${min}-${q1}-${med}-${q3}-${max}-${what}`,
        prompt: `About what percent of the data is ${what}?`,
        speech: `About what percent of the data in the box plot is ${what}?`,
        visual: vis,
        ...choose(ans, [25, 50, 75, 100].filter((v) => v !== ans), 25, 0),
        unit: "%",
        hint: "The box plot splits the data into four quarters of about 25% each.",
        explain: `Each section holds about 25%, so ${what} is about ${ans}%.`,
      };
    }
    const [what, ans] = pick([["median", med], ["interquartile range (IQR)", q3 - q1], ["range", max - min]] as [string, number][]);
    return {
      key: `dd-box-${min}-${q1}-${med}-${q3}-${max}-${what}`,
      prompt: `What is the ${what} of this data?`,
      speech: `Read the box plot. What is the ${what}?`,
      visual: vis,
      needsVisual: true,
      ...keypad(ans),
      hint: "Box plot: min — Q1 — median — Q3 — max. IQR = Q3 − Q1; range = max − min.",
      explain: what === "median" ? `The line inside the box is at ${med}.` : what === "range" ? `${max} − ${min} = ${ans}.` : `${q3} − ${q1} = ${ans}.`,
    };
  }
  if (kind === 1) {
    const values = Array.from({ length: rand(8, 14) }, () => rand(1, 8));
    const counts = [1, 2, 3, 4, 5, 6, 7, 8].map((v) => values.filter((x) => x === v).length);
    const top = Math.max(...counts);
    if (counts.filter((c) => c === top).length > 1) return dataDisplays();
    const mode = counts.indexOf(top) + 1;
    const askN = Math.random() < 0.4;
    return {
      key: `dd-dots-${sorted(values).join(".")}-${askN}`,
      prompt: askN ? "How many values are in this dot plot?" : "What is the mode of this data?",
      speech: askN ? "How many data values does the dot plot show?" : "What is the mode, the most common value, in the dot plot?",
      visual: { kind: "dots", values, min: 1, max: 8, label: "goals" },
      needsVisual: true,
      ...keypad(askN ? values.length : mode),
      hint: askN ? "Count every dot." : "The mode has the tallest stack of dots.",
      explain: askN ? `There are ${values.length} dots.` : `${mode} has the most dots (${top}).`,
    };
  }
  const bins = ["0–9", "10–19", "20–29", "30–39", "40–49"];
  const counts = bins.map(() => rand(1, 9));
  const cut = rand(1, 3);
  const ans = sum(counts.slice(cut));
  return {
    key: `dd-hist-${counts.join(".")}-${cut}`,
    prompt: `Histogram of minutes spent. How many spent ${cut * 10} minutes or more?`,
    speech: `The histogram shows minutes spent on homework. How many students spent ${cut * 10} minutes or more?`,
    visual: { kind: "bars", title: "Minutes (histogram)", items: bins.map((label, i) => ({ label, value: counts[i] })), max: 10, step: 1 },
    needsVisual: true,
    ...keypad(ans),
    hint: `Add the bars from ${bins[cut]} upward.`,
    explain: `${counts.slice(cut).join(" + ")} = ${ans}.`,
  };
}

/** HSS-ID.A.2, HSS-ID.A.3 — compare center and spread; the effect of outliers. */
export function compareData(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const mid = rand(20, 40);
    const mk = (spread: number) => {
      const q1 = mid - spread;
      const q3 = mid + spread + rand(0, 2);
      return { min: q1 - rand(2, 6), q1, median: mid + rand(-2, 2), q3, max: q3 + rand(2, 6) };
    };
    const A = mk(rand(2, 5));
    const B = mk(rand(7, 12));
    const flipAB = Math.random() < 0.5;
    const [first, second] = flipAB ? [B, A] : [A, B];
    const askIQR = Math.random() < 0.6;
    const gA = askIQR ? first.q3 - first.q1 : first.max - first.min;
    const gB = askIQR ? second.q3 - second.q1 : second.max - second.min;
    if (gA === gB) return compareData();
    return {
      key: `cd-box-${JSON.stringify([first, second])}-${askIQR}`,
      prompt: `Which class's scores have the greater ${askIQR ? "IQR" : "range"}?`,
      speech: `The box plots compare two classes' scores. Which class has the greater ${askIQR ? "interquartile range" : "range"}?`,
      visual: { kind: "boxplot", ...first, axis: [Math.floor((Math.min(first.min, second.min) - 2) / 10) * 10, Math.ceil((Math.max(first.max, second.max) + 2) / 10) * 10], label: "Class A", second: { ...second, label: "Class B" } },
      needsVisual: true,
      ...yesNo(gA > gB, "Class A", "Class B"),
      hint: askIQR ? "IQR is the width of the box." : "Range is the distance from end to end.",
      explain: `Class A: ${gA}. Class B: ${gB}. ${gA > gB ? "A" : "B"} is more spread out.`,
    };
  }
  if (kind === 1 || kind === 2) {
    const base = sorted(distinct(5, 2, 12));
    const out = rand(40, 90);
    const mean0 = sum(base) / 5;
    const all = [...base, out];
    const mean1 = sum(all) / 6;
    if (kind === 1) {
      return {
        key: `cd-out-${base.join(".")}-${out}`,
        prompt: `Data: ${base.join(", ")}. Add an outlier, ${out}. Which changes more?`,
        speech: `The data is ${base.join(", ")}. An outlier, ${out}, is added. Which changes more: the mean or the median?`,
        visual: NONE,
        ...label("the mean", ["the median", "they change the same", "neither changes"]),
        hint: "The mean uses every value's size; the median only cares about the middle position.",
        explain: `The mean jumps from ${ds(mean0)} to ${ds(mean1)}. The median only moves from ${base[2]} to ${ds((base[2] + base[3]) / 2)}.`,
      };
    }
    if (!Number.isInteger(mean1 * 10)) return compareData();
    return {
      key: `cd-mean-${base.join(".")}-${out}`,
      prompt: `Data: ${base.join(", ")}, ${out}. What is the mean?`,
      speech: `Find the mean of ${all.join(", ")}.`,
      visual: { kind: "dots", values: all, min: 0, max: Math.ceil(out / 10) * 10, label: "value" },
      ...keypad(mean1),
      hint: "Add all six values and divide by 6. Notice how the outlier pulls the mean.",
      explain: `${sum(all)} ÷ 6 = ${ds(mean1)}, much higher than the median, ${ds((base[2] + base[3]) / 2)}, because of the outlier.`,
    };
  }
  const [what, skew] = pick([
    ["Household incomes in a city", "right"],
    ["House prices in a town", "right"],
    ["Scores on a very easy test", "left"],
    ["Ages of people at a retirement party", "left"],
    ["Times to finish a 5 km race", "right"],
  ]);
  return {
    key: `cd-skew-${what}`,
    prompt: `${what} are skewed ${skew}. Which is probably bigger?`,
    speech: `${what} are skewed to the ${skew}. Which is probably bigger, the mean or the median?`,
    visual: NONE,
    ...label(skew === "right" ? "the mean" : "the median", [skew === "right" ? "the median" : "the mean", "they're equal"]),
    hint: "The mean gets pulled toward the long tail.",
    explain: `A ${skew} skew has a long tail of ${skew === "right" ? "high" : "low"} values, which pulls the mean ${skew === "right" ? "up above" : "down below"} the median.`,
  };
}

/** HSS-ID.A.4 — normal distributions and the 68–95–99.7 rule. */
export function normalDist(): Question {
  const [mu, sigma, unit, what] = pick([
    [160, 8, "cm", "Heights"],
    [100, 15, "", "IQ scores"],
    [70, 5, "points", "Test scores"],
    [500, 100, "points", "Exam scores"],
    [50, 4, "g", "Apple weights"],
    [30, 3, "min", "Commute times"],
  ] as [number, number, string, string][]);
  const kind = rand(0, 2);
  const pdf = (x: number) => Math.exp(-(((x - mu) / sigma) ** 2) / 2) / (sigma * Math.sqrt(2 * Math.PI));
  const lo = mu - 3.5 * sigma;
  const hi = mu + 3.5 * sigma;
  if (kind <= 1) {
    const cases: [number, number, number][] = [
      [-1, 1, 68], [-2, 2, 95], [-3, 3, 99.7], [1, 9, 16], [2, 9, 2.5], [-9, -1, 16], [0, 1, 34], [0, 2, 47.5], [-9, 1, 84], [-2, 9, 97.5], [-1, 2, 81.5], [1, 2, 13.5],
    ];
    const [a, b, pct] = pick(cases);
    const at = (k: number) => mu + k * sigma;
    const desc = a === -9 ? `below ${at(b)}` : b === 9 ? `above ${at(a)}` : `between ${at(a)} and ${at(b)}`;
    const count = kind === 1 && Number.isInteger((pct * 1000) / 100);
    return {
      key: `nd-${kind}-${what}-${a}-${b}`,
      prompt: count
        ? `${what}: mean ${mu}, SD ${sigma}. Of 1000, about how many are ${desc}?`
        : `${what}: mean ${mu}, SD ${sigma}. What percent are ${desc}?`,
      speech: `${what} are normally distributed with mean ${mu} and standard deviation ${sigma}${unit ? ` ${unit}` : ""}. ${count ? `Out of 1000, about how many are ${desc}?` : `About what percent are ${desc}?`}`,
      visual: graph([lo, hi], [0, pdf(mu) * 1.15], {
        curves: [{ fn: pdf, colour: "wave" }],
        shade: { fn: pdf, from: a === -9 ? lo : at(a), to: b === 9 ? hi : at(b) },
      }),
      ...keypad(count ? (pct * 1000) / 100 : pct),
      unit: count ? "" : "%",
      hint: "68% lie within 1 SD of the mean, 95% within 2 SD, 99.7% within 3 SD. Each half is half of that.",
      explain: `${cap(desc)} covers ${a === -9 ? `everything below mean ${b >= 0 ? "+" : "−"} ${Math.abs(b)} SD` : b === 9 ? `everything above mean ${a >= 0 ? "+" : "−"} ${Math.abs(a)} SD` : `mean ${a >= 0 ? "+" : "−"} ${Math.abs(a)} SD to mean ${b >= 0 ? "+" : "−"} ${Math.abs(b)} SD`}: about ${pct}%${count ? `, so about ${(pct * 1000) / 100} of 1000` : ""}.`,
    };
  }
  const k = pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3]);
  const x = mu + k * sigma;
  if (!Number.isInteger(x)) return normalDist();
  return {
    key: `nd-z-${what}-${k}`,
    prompt: `${what}: mean ${mu}, SD ${sigma}. What is the z-score of ${x}?`,
    speech: `${what} have mean ${mu} and standard deviation ${sigma}. What is the z-score of ${x}?`,
    visual: NONE,
    ...keypad(k),
    hint: "z = (value − mean) ÷ SD: how many standard deviations from the mean.",
    explain: `(${x} − ${mu}) ÷ ${sigma} = ${ds(k)}.`,
  };
}
