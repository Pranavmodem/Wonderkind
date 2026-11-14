/**
 * Question generators for ages 10–12: every Common Core Grade 5, Grade 6 and
 * Grade 7 standard. Worlds and levels are assembled in ./ages10to12.ts.
 *
 * Decimal answers are always built from whole numbers (e.g. 345 / 100) so
 * floating point never shows up on screen.
 */
import { COLOUR_WORD, fmt, labelChoices, pick, rand, shuffle } from "../questions";
import type { Activity, Colour, Question, ShapeName, Token, Visual } from "../types";

/* =================================================================== helpers */

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** Remove floating-point noise (no answer needs more than 6 decimal places). */
export const clean = (x: number) => Math.round(x * 1e6) / 1e6;

/** n × 10^e, exact for whole n. */
export const sh = (n: number, e: number) => (e >= 0 ? n * 10 ** e : n / 10 ** -e);

/** A number as text, with a real minus sign. */
export const ds = (x: number) => fmt(clean(x));

/** Money as text: $4.50, $12. */
export const money = (x: number) => (Number.isInteger(x) ? `$${x}` : `$${x.toFixed(2)}`);

const NONE: Visual = { kind: "none" };

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra">;

/** Number choices: the answer, the likely mistakes, then neighbours `step` apart. */
export function numChoices(answer: number, wrong: number[], step = 1, n = 4, min = -Infinity): number[] {
  const out: number[] = [answer];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < n && Number.isFinite(v) && v >= min && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < n && k < 60; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return shuffle(out);
}

/** Pick from number choices. */
export function choose(answer: number, wrong: number[], step = 1, min = -Infinity): Answer {
  const a = clean(answer);
  return { answer: a, input: "choices", choices: numChoices(a, wrong, step, 4, min) };
}

/** Type the answer: negatives get "−", decimals get "."; negative decimals become choices. */
export function keypad(answer: number, wrong: number[] = []): Answer {
  const a = clean(answer);
  if (a < 0 && !Number.isInteger(a)) return choose(a, wrong.length ? wrong : [-a, a + 1, a - 1], 0.5);
  if (a < 0) return { answer: a, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(a)) return { answer: a, input: "keypad", keypadExtra: "." };
  return { answer: a, input: "keypad" };
}

/** Whole-number answer on a keypad that always has a "−" key, so the sign isn't given away. */
export function signed(answer: number): Answer {
  return { answer, input: "keypad", keypadExtra: "−" };
}

/** Text choices (fractions, inequalities, words). Wrong ones are shuffled, then the first 3 used. */
export function label(correct: string, wrong: string[], keepOrder = false): Answer {
  const { choices, labels, answer } = labelChoices(correct, keepOrder ? wrong : shuffle(wrong));
  return { answer, input: "choices", choices, labels };
}

/* ---------------------------------------------------------------- fractions */

/** Simplest form, as a mixed number when improper: "3/4", "2 1/3", "5", "−1/2". */
export function fracStr(n: number, d: number): string {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  const sign = a < 0 ? "−" : "";
  const A = Math.abs(a);
  if (b === 1) return `${sign}${A}`;
  if (A > b) return `${sign}${Math.floor(A / b)} ${A % b}/${b}`;
  return `${sign}${A}/${b}`;
}

/** A fraction token in simplest form: a whole number, n/d, or a mixed number. */
export function fracTok(n: number, d: number): Token {
  const g = gcd(n, d);
  const a = n / g;
  const b = d / g;
  if (b === 1) return a;
  if (a > b) return { w: Math.floor(a / b), n: a % b, d: b };
  return { n: a, d: b };
}

/** Near-miss wrong answers for the fraction n/d. */
export function fracWrongs(n: number, d: number): string[] {
  return [fracStr(n + 1, d), fracStr(Math.max(1, n - 1), d), fracStr(n, d + 1), fracStr(d, n || 1), fracStr(n + d, d)];
}

const ORD: Record<number, string> = {
  2: "half", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth",
  10: "tenth", 11: "eleventh", 12: "twelfth", 15: "fifteenth", 16: "sixteenth", 20: "twentieth", 100: "hundredth",
};

/** "3 fourths", "1 half", "5 over 24". */
export function sayFrac(n: number, d: number): string {
  const name = ORD[d];
  if (!name) return `${n} over ${d}`;
  if (n === 1) return `1 ${name}`;
  return `${n} ${d === 2 ? "halves" : `${name}s`}`;
}

/** "twelfths" — the name for pieces of size 1/d. */
export const pieces = (d: number) => (d === 2 ? "halves" : ORD[d] ? `${ORD[d]}s` : `${d}ths`);

/* ------------------------------------------------------------------- speech */

const UNIT_NAMES: Record<string, string> = {
  km: "kilometers", cm: "centimeters", mm: "millimeters", m: "meters", in: "inches", ft: "feet", yd: "yards",
};
const SUPS: Record<string, string> = { "²": "squared", "³": "cubed" };
const UNIT_WORDS: Record<string, string> = {
  km: "kilometers", cm: "centimeters", mm: "millimeters", m: "meters", mL: "milliliters", L: "liters",
  kg: "kilograms", g: "grams", lb: "pounds", oz: "ounces", ft: "feet", yd: "yards",
};

/** Turn on-screen math text into words Can can say out loud. */
export function talk(s: string): string {
  return s
    .replace(/(\d)\s?(km|cm|mm|m|in|ft|yd)([²³])/g, (_, d, u, p) => `${d} ${p === "²" ? "square" : "cubic"} ${UNIT_NAMES[u]}`)
    .replace(/(\d) (km|cm|mm|m|mL|L|kg|g|lb|oz|ft|yd)(?=[\s.,?!)]|$)/g, (_, d, u) => `${d} ${UNIT_WORDS[u]}`)
    .replace(/km\/h/g, "kilometers per hour")
    .replace(/m\/s/g, "meters per second")
    .replace(/\?\/(\d+)/g, (_, d) => `how many ${pieces(+d)}`)
    .replace(/\b1\/(\d+)s\b/g, (_, d) => pieces(+d))
    .replace(/\b(\d+)\/(\d+)s\b/g, (_, n, d) => `groups of ${sayFrac(+n, +d)}`)
    .replace(/(\d+) (\d+)\/(\d+)/g, (_, w, n, d) => `${w} and ${sayFrac(+n, +d)}`)
    .replace(/(\d+)\/(\d+)/g, (_, n, d) => sayFrac(+n, +d))
    .replace(/(\d):(\d)/g, "$1 to $2")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (c) => ` ${SUPS[c] ?? `to the power of ${[...c].map((ch) => SUP.indexOf(ch)).join("")}`}`)
    .replace(/\|([^|]+)\|/g, "the absolute value of $1")
    .replace(/ − /g, " minus ")
    .replace(/−/g, "negative ")
    .replace(/\+/g, " plus ")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/≥/g, " is greater than or equal to ")
    .replace(/≤/g, " is less than or equal to ")
    .replace(/ < /g, " is less than ")
    .replace(/ > /g, " is greater than ")
    .replace(/≈/g, " is about ")
    .replace(/ = \?/g, " equals what")
    .replace(/=/g, " equals ")
    .replace(/%/g, " percent")
    .replace(/°C/g, " degrees Celsius")
    .replace(/°/g, " degrees")
    .replace(/π/g, "pi")
    .replace(/…/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const sup = (e: number) => [...String(e)].map((c) => SUP[+c]).join("");

/** One equation piece as text. */
export function tokStr(t: Token): string {
  if (typeof t === "number") return ds(t);
  if (typeof t === "string") return t;
  if ("pow" in t) return `${t.pow[0] < 0 ? `(${ds(t.pow[0])})` : ds(t.pow[0])}${sup(t.pow[1])}`;
  if ("x" in t) return `${t.x === 1 ? "" : t.x === -1 ? "−" : ds(t.x)}x`;
  return `${t.w !== undefined ? `${t.w} ` : ""}${t.n}/${t.d}`;
}

/** A whole equation as text, e.g. "3 × (4 + 5) = ?". */
export function eqStr(ts: Token[]): string {
  return ts.map(tokStr).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
}

/** Say an equation out loud. */
export const sayEq = (ts: Token[]) => talk(eqStr(ts)).replace(/\?/g, "what");

/** Ordered pair as text: (3, −2). */
export const pt = (x: number, y: number) => `(${fmt(x)}, ${fmt(y)})`;

/** Linear expression as text: "2.5x + 3", "−x − 4", "6". */
export function lin(a: number, b: number, v = "x"): string {
  const A = clean(a);
  const B = clean(b);
  const xs = A === 0 ? "" : A === 1 ? v : A === -1 ? `−${v}` : `${ds(A)}${v}`;
  if (!xs) return ds(B);
  if (B === 0) return xs;
  return `${xs} ${B < 0 ? "−" : "+"} ${ds(Math.abs(B))}`;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Number names up to 999. */
export function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${words(n % 100)}` : ""}`;
}

/** Wrap a negative number in brackets when it follows an operation sign. */
const paren = (n: number): Token[] => (n < 0 ? ["(", n, ")"] : [n]);

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** Distinct random whole numbers. */
function distinct(count: number, lo: number, hi: number): number[] {
  const out = new Set<number>();
  while (out.size < count) out.add(rand(lo, hi));
  return [...out];
}

/* ========================================================== 1. Decimals (G5) */

const PLACE_NAME: Record<number, string> = { [-3]: "thousandths", [-2]: "hundredths", [-1]: "tenths", 0: "ones", 1: "tens", 2: "hundreds" };

/** 5.NBT.A.1, 5.NBT.A.3a — what a digit is worth; ten times / one tenth; names and expanded form. */
export function decimalPlaces(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    let s = "";
    let idx = -1;
    while (idx < 0) {
      s = `${rand(1, 99)}.${String(rand(1, 999)).padStart(3, "0")}`;
      const ok = [...s].map((_, i) => i).filter((i) => s[i] !== "." && s[i] !== "0" && s.split(s[i]).length === 2);
      if (ok.length) idx = pick(ok);
    }
    const digit = +s[idx];
    const dot = s.indexOf(".");
    const e = idx < dot ? dot - 1 - idx : dot - idx;
    const value = sh(digit, e);
    const wrong = [e + 1, e - 1, e + 2, e - 2].filter((k) => k >= -4 && k <= 3).map((k) => sh(digit, k));
    return {
      key: `dp-val-${s}-${idx}`,
      prompt: `In ${s}, what is the ${digit} worth?`,
      speech: `In the number ${s}, what is the ${digit} worth?`,
      visual: { kind: "places", digits: s, highlight: idx },
      ...choose(value, wrong, 1, 0),
      hint: "Name the digit's place: ones, then tenths, hundredths and thousandths after the point.",
      explain: `The ${digit} is in the ${PLACE_NAME[e]} place, so it is worth ${ds(value)}.`,
    };
  }
  if (kind === 1) {
    const d = rand(1, 9);
    const k = rand(0, 2);
    const x = sh(d, -k);
    const sub = rand(0, 2);
    if (sub === 2) {
      const s = `${d}${d}.${d}${d}`;
      const [hi, lo] = pick([[1, 0], [0, -1], [1, -1], [0, -2]] as [number, number][]);
      const times = 10 ** (hi - lo);
      return {
        key: `dp-times-${d}-${hi}-${lo}`,
        prompt: `In ${s}, the ${d} in the ${PLACE_NAME[hi]} is how many times the ${d} in the ${PLACE_NAME[lo]}?`,
        speech: `In ${s}, the ${d} in the ${PLACE_NAME[hi]} place is worth how many times the ${d} in the ${PLACE_NAME[lo]} place?`,
        visual: { kind: "places", digits: s, highlight: hi === 1 ? 0 : 1 },
        ...choose(times, [10, 100, 1000, 1 / 10].filter((v) => v !== times)),
        hint: "Each place is worth 10 times the place to its right.",
        explain: `${PLACE_NAME[hi]} are worth ${times} times ${PLACE_NAME[lo]}, so the answer is ${times}.`,
      };
    }
    const up = sub === 1;
    const value = up ? sh(d, 1 - k) : sh(d, -k - 1);
    const wrong = [sh(d, -k + (up ? -1 : 1)), sh(d, up ? 2 - k : -k - 2), x, sh(d, up ? -k - 1 : 1 - k)];
    return {
      key: `dp-tenth-${d}-${k}-${up}`,
      prompt: up ? `What is 10 times as much as ${ds(x)}?` : `What is 1/10 of ${ds(x)}?`,
      speech: up ? `What is 10 times as much as ${ds(x)}?` : `What is one tenth of ${ds(x)}?`,
      visual: NONE,
      ...choose(value, wrong, 1, 0),
      hint: up ? "10 times as much moves each digit one place to the left." : "One tenth of a number moves each digit one place to the right.",
      explain: `${up ? "10 ×" : "1/10 of"} ${ds(x)} = ${ds(value)}`,
    };
  }
  if (kind === 2) {
    const w = rand(0, 15);
    const k = rand(1, 3);
    const f = rand(1, 10 ** k - 1);
    const unit = ["tenth", "hundredth", "thousandth"][k - 1] + (f === 1 ? "" : "s");
    const name = `${w ? `${words(w)} and ` : ""}${words(f)} ${unit}`;
    const value = sh(w * 10 ** k + f, -k);
    const wrong = [sh(w * 10 ** (k + 1) + f, -(k + 1)), w + f, sh(f * 10 ** k + w, -k)];
    if (k > 1 && f < 10 ** (k - 1)) wrong.push(sh(w * 10 ** (k - 1) + f, -(k - 1)));
    return {
      key: `dp-name-${w}-${f}-${k}`,
      prompt: `As a decimal: ${name}`,
      speech: `Write ${name} as a decimal.`,
      visual: NONE,
      ...choose(value, wrong, 1, 0),
      hint: `"${unit}" tells you the last digit's place. ${k} digit${k > 1 ? "s" : ""} go after the point.`,
      explain: `${name} is ${ds(value)}.`,
    };
  }
  const a = rand(1, 9);
  const b = rand(0, 9);
  const c = rand(1, 9);
  const e = rand(0, 9);
  const value = sh(a * 1000 + b * 100 + c * 10 + e, -3);
  const parts = [
    { v: a, p: 0, dig: a },
    { v: sh(b, -1), p: -1, dig: b },
    { v: sh(c, -2), p: -2, dig: c },
    { v: sh(e, -3), p: -3, dig: e },
  ].filter((t) => t.dig !== 0);
  const s = value.toFixed(3);
  if (rand(0, 1) === 1) {
    const i = rand(1, parts.length - 1);
    const { v: ans, p, dig } = parts[i];
    const eq: Token[] = [...parts.flatMap((t, j) => [j === i ? "?" : t.v, "+"]).slice(0, -1), "=", value];
    return {
      key: `dp-exp-blank-${value}-${i}`,
      prompt: "What's missing in the expanded form?",
      speech: sayEq(eq),
      equation: eq,
      visual: { kind: "places", digits: s, highlight: s.indexOf(".") - p },
      ...choose(ans, [dig, sh(dig, p + 1), sh(dig, p - 1)], 1, 0),
      hint: "Each part of the expanded form is one digit in its place.",
      explain: `${s} = ${parts.map((t) => ds(t.v)).join(" + ")}`,
    };
  }
  const eq: Token[] = [...parts.flatMap((t) => [t.v, "+"]).slice(0, -1), "=", "?"];
  const squash = +`${a}.${parts.slice(1).map((t) => t.dig).join("")}`;
  return {
    key: `dp-exp-${value}`,
    prompt: "Write the number in standard form.",
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...choose(value, [squash, sh(a * 1000 + b * 100 + c * 10 + e, -2), sh(a * 1000 + c * 100 + b * 10 + e, -3)], 1, 0),
    hint: "Put each digit in its place: tenths, hundredths, thousandths. Use 0 for empty places.",
    explain: `${parts.map((t) => ds(t.v)).join(" + ")} = ${ds(value)}`,
  };
}

/** 5.NBT.A.2 — powers of 10; multiply and divide by powers of 10. */
export function powersOfTen(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const n = rand(2, 6);
    const eq: Token[] = [{ pow: [10, n] }, "=", "?"];
    return {
      key: `p10-pow-${n}`,
      prompt: pick(["Write it as a number.", "What is this power of 10?"]),
      speech: `What is 10 to the power of ${n}?`,
      equation: eq,
      visual: NONE,
      ...keypad(10 ** n),
      hint: "The exponent tells how many 10s are multiplied. Each 10 adds a zero.",
      explain: `10${sup(n)} is 1 followed by ${n} zeros: ${10 ** n}.`,
    };
  }
  if (kind === 1) {
    const n = rand(2, 6);
    const zeros = rand(0, 1) === 1;
    const prod = Array(n).fill("10").join(" × ");
    return {
      key: `p10-exp-${n}-${zeros}`,
      prompt: zeros ? `How many zeros does 10${sup(n)} have?` : `${prod} is 10 to what power?`,
      speech: zeros ? `How many zeros are in 10 to the power of ${n}?` : `${n} tens multiplied together is 10 to what power?`,
      visual: NONE,
      ...keypad(n),
      hint: zeros ? "The exponent counts the 10s. Each 10 gives one zero." : "Count the 10s being multiplied.",
      explain: `10${sup(n)} = ${prod} = ${10 ** n}`,
    };
  }
  const p = rand(0, 2);
  let A = rand(2, 999);
  while (A % 10 === 0) A = rand(2, 999);
  const a = sh(A, -p);
  const n = rand(1, 3);
  const asPow = n >= 2 && rand(0, 1) === 1;
  const f: Token = asPow ? { pow: [10, n] } : 10 ** n;
  if (kind === 2) {
    const ans = sh(A, n - p);
    const eq: Token[] = [a, "×", f, "=", "?"];
    return {
      key: `p10-mul-${A}-${p}-${n}-${asPow}`,
      prompt: pick(["Multiply by the power of 10.", "Move the digits! What's the product?"]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(ans),
      hint: `Multiplying by ${10 ** n} moves every digit ${n} place${n > 1 ? "s" : ""} to the left.`,
      explain: `${eqStr(eq.slice(0, -1))} ${ds(ans)}`,
    };
  }
  const q = rand(0, 1);
  const top = sh(A, -q);
  const ans = sh(A, -q - n);
  const eq: Token[] = [top, "÷", f, "=", "?"];
  return {
    key: `p10-div-${A}-${q}-${n}-${asPow}`,
    prompt: pick(["Divide by the power of 10.", "Move the digits! What's the quotient?"]),
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...keypad(ans),
    hint: `Dividing by ${10 ** n} moves every digit ${n} place${n > 1 ? "s" : ""} to the right.`,
    explain: `${eqStr(eq.slice(0, -1))} ${ds(ans)}`,
  };
}

function decimalNear(w: number): number {
  const p = rand(1, 3);
  return sh(w * 10 ** p + rand(1, 10 ** p - 1), -p);
}

/** 5.NBT.A.3b (and 3a) — compare and order decimals to thousandths. */
export function compareDecimals(): Question {
  const kind = rand(0, 2);
  const w = rand(0, 9);
  if (kind === 0) {
    let a = decimalNear(w);
    let b = decimalNear(w);
    while (a === b) b = decimalNear(w);
    if (rand(0, 3) === 0) [a, b] = [b, a];
    const sign = a < b ? "<" : ">";
    return {
      key: `cd-sign-${a}-${b}`,
      prompt: pick(["Which sign goes in the box?", "Is it <, > or =?", "Compare the decimals."]),
      speech: `Compare ${ds(a)} and ${ds(b)}. Is it less than, greater than, or equal?`,
      equation: [a, "?", b],
      visual: NONE,
      ...label(sign, ["<", ">", "="].filter((s) => s !== sign)),
      hint: "Line up the decimal points. Compare tenths first, then hundredths, then thousandths.",
      explain: `Write both with 3 places: ${a.toFixed(3)} and ${b.toFixed(3)}. So ${ds(a)} ${sign} ${ds(b)}.`,
    };
  }
  const vals = new Set<number>();
  while (vals.size < 4) vals.add(decimalNear(w));
  const list = [...vals];
  const most = kind === 1;
  const ans = most ? Math.max(...list) : Math.min(...list);
  return {
    key: `cd-${most ? "max" : "min"}-${sorted(list).join("-")}`,
    prompt: most ? "Which decimal is the greatest?" : "Which decimal is the least?",
    speech: most ? "Which decimal is the greatest?" : "Which decimal is the least?",
    visual: NONE,
    answer: ans,
    input: "choices",
    choices: shuffle(list),
    hint: "More digits doesn't mean bigger! Compare the tenths first.",
    explain: `In order: ${sorted(list).map(ds).join(" < ")}. The ${most ? "greatest" : "least"} is ${ds(ans)}.`,
  };
}

/** 5.NBT.A.4 — round decimals to any place. */
export function roundDecimals(): Question {
  const t = rand(0, 2);
  const p = Math.min(3, t + rand(1, 2));
  const k = p - t;
  let X = rand(10 ** p, 60 * 10 ** p);
  while (X % 10 ** k === 0) X = rand(10 ** p, 60 * 10 ** p);
  const x = sh(X, -p);
  const low = Math.floor(X / 10 ** k);
  const rest = X % 10 ** k;
  const up = rest >= 10 ** k / 2;
  const R = up ? low + 1 : low;
  const ans = sh(R, -t);
  const next = Math.floor(rest / 10 ** (k - 1));
  const place = ["whole number", "tenth", "hundredth"][t];
  const wrong = [sh(up ? low : low + 1, -t), sh(R + (up ? 1 : -1), -t), x];
  if (t < p - 1) wrong.push(sh(Math.round(X / 10 ** (k - 1)), -(t + 1)));
  return {
    key: `rd-${X}-${p}-${t}`,
    prompt: `Round ${ds(x)} to the nearest ${place}.`,
    speech: `Round ${ds(x)} to the nearest ${place}.`,
    visual: { kind: "numberline", min: sh(low, -t), max: sh(low + 1, -t), step: sh(1, -t - 1), labelStep: sh(5, -t - 1), from: x, to: ans },
    ...choose(ans, wrong, sh(1, -t), 0),
    hint: `Look at the digit just right of the ${t === 0 ? "ones" : place + "s"} place. 5 or more rounds up.`,
    explain: `The next digit is ${next}, so ${ds(x)} rounds ${up ? "up" : "down"} to ${ds(ans)}.`,
  };
}

function hundredths(): number {
  let A = 0;
  while (A % 100 === 0) A = rand(0, 1) ? rand(11, 199) * 10 : rand(101, 1999);
  return A;
}

/** 5.NBT.B.7 — add and subtract decimals to hundredths. */
export function addSubDecimals(): Question {
  const kind = rand(0, 3);
  if (kind < 2) {
    let A = hundredths();
    let B = hundredths();
    const add = kind === 0;
    if (!add && A === B) B = A - 15;
    if (!add && A < B) [A, B] = [B, A];
    const ans = sh(add ? A + B : A - B, -2);
    const eq: Token[] = [sh(A, -2), add ? "+" : "−", sh(B, -2), "=", "?"];
    return {
      key: `asd-${A}-${add ? "p" : "m"}-${B}`,
      prompt: pick([add ? "Add the decimals." : "Subtract the decimals.", "Line them up and solve!"]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(ans),
      hint: "Line up the decimal points. Write 0s so both numbers have the same number of places.",
      explain: `${eqStr(eq.slice(0, -1))} ${ds(ans)}`,
    };
  }
  const P = rand(105, 1995);
  if (kind === 2) {
    const Q = rand(55, 995);
    const [thing1, thing2] = shuffle(["a book", "a pen", "a snack", "a comic", "a toy car", "a card"]).slice(0, 2);
    return {
      key: `asd-buy-${P}-${Q}`,
      prompt: `You buy ${thing1} for ${money(P / 100)} and ${thing2} for ${money(Q / 100)}. Total?`,
      speech: `You buy ${thing1} for ${money(P / 100)} and ${thing2} for ${money(Q / 100)}. How much in all?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(P + Q, -2)),
      hint: "Add dollars to dollars and cents to cents. 100 cents make a dollar.",
      explain: `${money(P / 100)} + ${money(Q / 100)} = ${money((P + Q) / 100)}`,
    };
  }
  const bill = P > 995 ? 20 : pick([10, 20]);
  return {
    key: `asd-change-${P}-${bill}`,
    prompt: `You pay $${bill} for a ${money(P / 100)} snack. How much change?`,
    speech: `You pay ${bill} dollars for a snack that costs ${money(P / 100)}. How much change do you get?`,
    visual: NONE,
    prefix: "$",
    ...keypad(sh(bill * 100 - P, -2)),
    hint: `Count up from ${money(P / 100)} to the next dollar, then to $${bill}.`,
    explain: `$${bill} − ${money(P / 100)} = ${money((bill * 100 - P) / 100)}`,
  };
}

/** 5.NBT.B.7 — multiply decimals to hundredths. */
export function multiplyDecimals(): Question {
  const kind = rand(0, 4);
  let A: number, B: number, pa: number, pb: number;
  if (kind === 0) [A, pa, B, pb] = [rand(2, 9), 0, rand(2, 39), 1];
  else if (kind === 1) [A, pa, B, pb] = [rand(1, 9), 1, rand(2, 9), 1];
  else if (kind === 2) [A, pa, B, pb] = [rand(11, 99), 2, rand(2, 9), 0];
  else if (kind === 3) [A, pa, B, pb] = [rand(11, 49), 1, rand(11, 39), 1];
  else {
    const n = rand(2, 6);
    const P = pick([125, 150, 175, 225, 250, 275, 325, 350, 175, 120, 135, 99]);
    const item = pick(["notebooks", "juice boxes", "pencils", "sticker sheets", "apples"]);
    return {
      key: `md-money-${n}-${P}-${item}`,
      prompt: `${n} ${item} cost ${money(P / 100)} each. Total cost?`,
      speech: `${n} ${item} cost ${money(P / 100)} each. What is the total cost?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(n * P, -2)),
      hint: `Multiply ${n} × ${P} cents, then turn cents into dollars.`,
      explain: `${n} × ${money(P / 100)} = ${money((n * P) / 100)}`,
    };
  }
  if (A % 10 === 0 && pa > 0) A += 1;
  if (B % 10 === 0 && pb > 0) B += 1;
  const a = sh(A, -pa);
  const b = sh(B, -pb);
  const ans = sh(A * B, -(pa + pb));
  const [x, y] = rand(0, 1) ? [a, b] : [b, a];
  const eq: Token[] = [x, "×", y, "=", "?"];
  return {
    key: `md-${A}-${pa}-${B}-${pb}-${x === a}`,
    prompt: pick(["Multiply the decimals.", "What's the product?"]),
    speech: sayEq(eq),
    equation: eq,
    visual: kind === 1 ? { kind: "hundredgrid", shaded: A * B } : NONE,
    ...keypad(ans),
    hint: "Multiply as if there were no decimal points. Then count the decimal places in both factors.",
    explain: `${A} × ${B} = ${A * B}. The factors have ${pa + pb} decimal place${pa + pb > 1 ? "s" : ""} in all, so ${eqStr(eq.slice(0, -1))} ${ds(ans)}.`,
  };
}

/** 5.NBT.B.7 — divide decimals to hundredths. */
export function divideDecimals(): Question {
  const kind = rand(0, 3);
  let top: number, by: number, ans: number;
  if (kind === 0) {
    by = rand(2, 9);
    const pq = rand(1, 2);
    let Q = rand(2, pq === 1 ? 99 : 199);
    if (Q % 10 === 0) Q += 1;
    ans = sh(Q, -pq);
    top = sh(Q * by, -pq);
  } else if (kind === 1) {
    const B = rand(2, 9);
    by = sh(B, -1);
    ans = rand(2, 30);
    top = sh(ans * B, -1);
  } else if (kind === 2) {
    const B = rand(2, 25);
    by = sh(B, -2);
    ans = rand(2, 12);
    top = sh(ans * B, -2);
  } else {
    const n = rand(2, 6);
    const P = rand(21, 399) * 5;
    return {
      key: `dd-share-${n}-${P}`,
      prompt: `${n} friends share ${money((n * P) / 100)} equally. Each gets?`,
      speech: `${n} friends share ${money((n * P) / 100)} equally. How much does each friend get?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(P, -2)),
      hint: `Split the dollars first, then share what's left as cents.`,
      explain: `${money((n * P) / 100)} ÷ ${n} = ${money(P / 100)}`,
    };
  }
  const eq: Token[] = [top, "÷", by, "=", "?"];
  return {
    key: `dd-${kind}-${top}-${by}`,
    prompt: pick(["Divide the decimals.", "What's the quotient?"]),
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...keypad(ans),
    hint: Number.isInteger(by)
      ? "Divide like whole numbers and keep the decimal point in the same place."
      : "Multiply both numbers by 10 or 100 so you divide by a whole number.",
    explain: `${eqStr(eq.slice(0, -1))} ${ds(ans)}, because ${ds(ans)} × ${ds(by)} = ${ds(top)}.`,
  };
}

/* ====================================================== 2. Fractions (G5) */

const DENS = [2, 3, 4, 5, 6, 8, 10, 12];

/** A numerator from 1 to d − 1 that makes a fraction in simplest form. */
function top(d: number): number {
  let n = rand(1, d - 1);
  while (gcd(n, d) !== 1) n = rand(1, d - 1);
  return n;
}

function unlikePair(dens = DENS, maxL = 24): [number, number] {
  for (;;) {
    const b = pick(dens);
    const d = pick(dens);
    if (b !== d && lcm(b, d) <= maxL) return [b, d];
  }
}

/** 5.NF.A.1 — add and subtract fractions with unlike denominators. */
export function unlikeFractions(): Question {
  for (;;) {
    let [b, d] = unlikePair();
    let a = top(b);
    let c = top(d);
    const L = lcm(b, d);
    const add = Math.random() < 0.55;
    let A = (a * L) / b;
    let C = (c * L) / d;
    if (!add && A === C) continue;
    if (!add && A < C) [a, b, A, c, d, C] = [c, d, C, a, b, A];
    const N = add ? A + C : A - C;
    const op = add ? "+" : "−";
    const blankTop = rand(0, 1) === 1;
    const f1 = { n: a, d: b };
    const f2 = { n: c, d: d };
    const explain = `${a}/${b} = ${A}/${L} and ${c}/${d} = ${C}/${L}. ${A}/${L} ${op} ${C}/${L} = ${N}/${L}${fracStr(N, L) !== `${N}/${L}` ? ` = ${fracStr(N, L)}` : ""}.`;
    const hint = `Rename both fractions as ${pieces(L)}. What number do ${b} and ${d} both go into?`;
    if (blankTop) {
      const eq: Token[] = [f1, op, f2, "=", { n: "?", d: L }];
      const visual: Visual = add
        ? N <= L ? { kind: "fractions", bars: [{ parts: L, a: A, b: C }] } : NONE
        : { kind: "fractions", bars: [{ parts: L, a: A, label: `${a}/${b}` }, { parts: L, a: C, target: N }] };
      return { key: `uf-top-${a}/${b}${op}${c}/${d}`, prompt: `How many ${pieces(L)}?`, speech: sayEq(eq), equation: eq, visual, ...keypad(N), hint, explain };
    }
    const eq: Token[] = [f1, op, f2, "=", "?"];
    const wrong = add
      ? [fracStr(a + c, b + d), fracStr(a + c, L), fracStr(N + 1, L), fracStr(a * c, b * d)]
      : [fracStr(Math.max(1, a - c), Math.abs(b - d) || L), fracStr(A + C, L), fracStr(N + 1, L), fracStr(N, b * d)];
    return {
      key: `uf-${a}/${b}${op}${c}/${d}`,
      prompt: pick(["Answer in simplest form.", add ? "Add the fractions." : "Subtract the fractions."]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...label(fracStr(N, L), wrong),
      hint,
      explain,
    };
  }
}

/** 5.NF.A.1 — add and subtract mixed numbers with unlike denominators. */
export function mixedNumbers(): Question {
  for (;;) {
    let [b, d] = unlikePair([2, 3, 4, 6, 8], 24);
    const L = lcm(b, d);
    const add = Math.random() < 0.5;
    let w1 = rand(1, 6);
    let a = top(b);
    let w2 = rand(1, 4);
    let c = top(d);
    let A = (a * L) / b;
    let C = (c * L) / d;
    let N1 = w1 * L + A;
    let N2 = w2 * L + C;
    if (!add && N1 === N2) continue;
    if (!add && N1 < N2) [w1, a, b, A, N1, w2, c, d, C, N2] = [w2, c, d, C, N2, w1, a, b, A, N1];
    const N = add ? N1 + N2 : N1 - N2;
    if (N % L === 0) continue;
    const op = add ? "+" : "−";
    const m1 = { w: w1, n: a, d: b };
    const m2 = { w: w2, n: c, d: d };
    const regroup = add ? A + C >= L : A < C;
    const hint = add
      ? "Rename the fractions with a common denominator. Add wholes and fractions; trade an extra whole if the fraction is too big."
      : "Rename the fractions with a common denominator. If the first fraction is too small, borrow 1 whole.";
    const explain = `${w1} ${a}/${b} ${op} ${w2} ${c}/${d} = ${w1} ${A}/${L} ${op} ${w2} ${C}/${L} = ${fracStr(N, L)}${regroup ? (add ? " (trade a whole!)" : " (borrow a whole!)") : ""}.`;
    if (rand(0, 1) === 1) {
      const W = Math.floor(N / L);
      const eq: Token[] = [m1, op, m2, "=", W > 0 ? { w: W, n: "?", d: L } : { n: "?", d: L }];
      return { key: `mn-top-${w1}-${a}/${b}${op}${w2}-${c}/${d}`, prompt: `How many ${pieces(L)}?`, speech: sayEq(eq), equation: eq, visual: NONE, ...keypad(N % L), hint, explain };
    }
    const eq: Token[] = [m1, op, m2, "=", "?"];
    const wrong = [fracStr(N + L, L), fracStr(N + 1, L)];
    if (N > L) wrong.push(fracStr(N - L, L));
    if (!add) wrong.push(fracStr((w1 - w2) * L + Math.abs(A - C), L));
    else wrong.push(fracStr((w1 + w2) * (b + d) + a + c, b + d));
    return {
      key: `mn-${w1}-${a}/${b}${op}${w2}-${c}/${d}`,
      prompt: pick(["Answer as a mixed number.", add ? "Add the mixed numbers." : "Subtract the mixed numbers."]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...label(fracStr(N, L), wrong),
      hint,
      explain,
    };
  }
}

const NEAR: [number, number][] = [[1, 8], [1, 10], [1, 12], [2, 5], [3, 8], [5, 12], [4, 9], [5, 8], [3, 5], [7, 8], [9, 10], [11, 12], [5, 6], [6, 7]];
const HALVES = ["0", "1/2", "1", "1 1/2", "2", "2 1/2"];

/** 5.NF.A.2 — fraction word problems; estimate with benchmark fractions. */
export function fractionStories(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    for (;;) {
      const [b, d] = unlikePair([2, 3, 4, 5, 6, 8, 10, 12], 24);
      const a = top(b);
      const c = top(d);
      const L = lcm(b, d);
      const A = (a * L) / b;
      const C = (c * L) / d;
      const add = rand(0, 1) === 1;
      if (!add && A <= C) continue;
      const N = add ? A + C : A - C;
      const f = `${a}/${b}`;
      const g = `${c}/${d}`;
      const stories = add
        ? [
            { t: `Sam ate ${f} of a pizza. Ana ate ${g}. How much in all?`, max1: true },
            { t: `You walk ${f} mile, then ${g} mile more. How far in all?`, max1: false },
            { t: `A recipe uses ${f} cup of milk and ${g} cup of water. Total?`, max1: false },
            { t: `You paint ${f} of a fence, then ${g} more. How much is done?`, max1: true },
          ]
        : [
            { t: `A jug has ${f} L of juice. You drink ${g} L. How much is left?`, max1: false },
            { t: `A ribbon is ${f} m long. You cut off ${g} m. How much is left?`, max1: false },
            { t: `You had ${f} of a cake and gave away ${g}. What's left?`, max1: false },
          ];
      const ok = stories.filter((s) => !s.max1 || N <= L);
      const i = rand(0, ok.length - 1);
      const wrong = add ? [fracStr(a + c, b + d), fracStr(N + 1, L), fracStr(a + c, L)] : [fracStr(Math.max(1, a - c), Math.abs(b - d)), fracStr(A + C, L), fracStr(N + 1, L)];
      return {
        key: `fs-${add}-${i}-${a}/${b}-${c}/${d}`,
        prompt: ok[i].t,
        speech: talk(ok[i].t),
        equation: [{ n: a, d: b }, add ? "+" : "−", { n: c, d: d }, "=", "?"],
        visual: NONE,
        ...label(fracStr(N, L), wrong),
        hint: `${add ? "Add" : "Subtract"} the fractions. Rename them so they have the same denominator first.`,
        explain: `${f} ${add ? "+" : "−"} ${g} = ${A}/${L} ${add ? "+" : "−"} ${C}/${L} = ${fracStr(N, L)}`,
      };
    }
  }
  for (;;) {
    const [a, b] = pick(NEAR);
    const [c, d] = pick(NEAR);
    const exact = a / b + c / d;
    if (kind === 1) {
      const near = Math.round(exact * 2) / 2;
      if (Math.abs(exact - near) > 0.2 || (a === c && b === d)) continue;
      const i = near * 2;
      const correct = HALVES[i];
      return {
        key: `fs-est-${a}/${b}-${c}/${d}`,
        prompt: `Estimate: ${a}/${b} + ${c}/${d} is closest to…`,
        speech: talk(`Estimate. ${a}/${b} plus ${c}/${d} is closest to which number?`),
        visual: NONE,
        ...label(correct, HALVES.filter((h) => h !== correct).sort((x, y) => Math.abs(HALVES.indexOf(x) - i) - Math.abs(HALVES.indexOf(y) - i)).slice(0, 3)),
        hint: "Is each fraction close to 0, 1/2 or 1? Add those easy numbers.",
        explain: `${a}/${b} is about ${HALVES[Math.round((a / b) * 2)]} and ${c}/${d} is about ${HALVES[Math.round((c / d) * 2)]}, so the sum is about ${correct}.`,
      };
    }
    if (Math.abs(exact - 1) < 0.05) continue;
    const more = exact > 1;
    return {
      key: `fs-one-${a}/${b}-${c}/${d}`,
      prompt: `Is ${a}/${b} + ${c}/${d} more or less than 1?`,
      speech: talk(`Is ${a}/${b} plus ${c}/${d} more or less than 1?`),
      visual: NONE,
      ...label(more ? "More than 1" : "Less than 1", [more ? "Less than 1" : "More than 1", "Exactly 1"]),
      hint: "Compare each fraction to 1/2. Two numbers bigger than 1/2 make more than 1.",
      explain: `${a}/${b} + ${c}/${d} = ${fracStr(a * d + c * b, b * d)}, which is ${more ? "more" : "less"} than 1.`,
    };
  }
}

/** 5.NF.B.3 — a fraction is a division: a/b = a ÷ b. */
export function fractionAsDivision(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    let a = rand(1, 6);
    const b = rand(2, 8);
    if (a === b || a % b === 0) a = a === 1 ? 2 : a - 1;
    if (a === b) a = b + 1;
    const [thing, many] = pick([["pizza", "pizzas"], ["sandwich", "sandwiches"], ["pie", "pies"], ["cake", "cakes"]]);
    const right = fracStr(a, b);
    return {
      key: `fd-share-${a}-${b}-${thing}`,
      prompt: `${a} ${a === 1 ? thing : many} shared equally by ${b} kids. How much each?`,
      speech: `${a} ${a === 1 ? `${thing} is` : `${many} are`} shared equally by ${b} kids. How much does each kid get?`,
      visual: { kind: "fractions", bars: Array.from({ length: a }, () => ({ parts: b, a: 1, shape: "pie" as const })) },
      ...label(right, [fracStr(b, a), fracStr(1, b), fracStr(a, a + b), fracStr(a + 1, b)]),
      hint: `Each ${thing} is cut into ${b} pieces, and each kid gets 1 piece of every ${thing}.`,
      explain: `${a} ÷ ${b} = ${a}/${b}${right !== `${a}/${b}` ? ` = ${right}` : ""} of a ${thing} each.`,
    };
  }
  const b = rand(2, 8);
  let a = rand(b + 1, 5 * b);
  if (a % b === 0) a += 1;
  if (kind === 1) {
    const rev = rand(0, 1) === 1;
    const eq: Token[] = rev ? [{ n: a, d: b }, "=", a, "÷", "?"] : [a, "÷", b, "=", { n: "?", d: b }];
    return {
      key: `fd-write-${a}-${b}-${rev}`,
      prompt: rev ? "Write the fraction as a division." : "Write the division as a fraction.",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(rev ? b : a),
      hint: "The fraction bar means divide: the top number divided by the bottom number.",
      explain: `${a}/${b} = ${a} ÷ ${b}`,
    };
  }
  const q = Math.floor(a / b);
  if (kind === 2) {
    const wrong = [`${q - 1} and ${q}`, `${q + 1} and ${q + 2}`, `${b} and ${b + 1}`].filter((s) => !s.startsWith("-1"));
    return {
      key: `fd-between-${a}-${b}`,
      prompt: `${a}/${b} is between which two whole numbers?`,
      speech: talk(`${a}/${b} is between which two whole numbers?`),
      visual: NONE,
      ...label(`${q} and ${q + 1}`, wrong),
      hint: `${a}/${b} means ${a} ÷ ${b}. How many whole ${b}s fit in ${a}?`,
      explain: `${a} ÷ ${b} = ${fracStr(a, b)}, so it's between ${q} and ${q + 1}.`,
    };
  }
  const eq: Token[] = [a, "÷", b, "=", "?"];
  return {
    key: `fd-mixed-${a}-${b}`,
    prompt: "Answer as a mixed number.",
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...label(fracStr(a, b), [fracStr(b, a), fracStr(a + 1, b), fracStr(a % b, b), `${q + 1} ${a % b}/${b}`]),
    hint: `How many whole ${b}s fit in ${a}? The leftover becomes the fraction.`,
    explain: `${a} ÷ ${b} = ${q} with ${a % b} left over, so ${fracStr(a, b)}.`,
  };
}

/** 5.NF.B.4a — multiply a fraction by a whole number or a fraction. */
export function multiplyFractions(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const n = rand(2, 6);
    const b = pick([3, 4, 5, 6, 8]);
    const a = top(b);
    const eq: Token[] = [n, "×", { n: a, d: b }, "=", { n: "?", d: b }];
    return {
      key: `mf-whole-${n}-${a}/${b}`,
      prompt: `How many ${pieces(b)}?`,
      speech: sayEq(eq),
      equation: eq,
      visual: { kind: "fractions", bars: Array.from({ length: n }, () => ({ parts: b, a })) },
      ...keypad(n * a),
      hint: `${n} groups of ${a} ${pieces(b)}. Count all the coloured pieces.`,
      explain: `${n} × ${a}/${b} = ${n * a}/${b}${fracStr(n * a, b) !== `${n * a}/${b}` ? ` = ${fracStr(n * a, b)}` : ""}`,
    };
  }
  const b = rand(2, 6);
  const d = rand(2, 6);
  const a = top(b);
  const c = top(d);
  if (kind === 1) {
    const eq: Token[] = [{ n: a, d: b }, "×", { n: c, d: d }, "=", { n: "?", d: b * d }];
    return {
      key: `mf-top-${a}/${b}-${c}/${d}`,
      prompt: "Multiply the fractions.",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(a * c),
      hint: "Multiply the tops together and the bottoms together.",
      explain: `${a}/${b} × ${c}/${d} = ${a * c}/${b * d}`,
    };
  }
  if (kind === 2) {
    const eq: Token[] = [{ n: a, d: b }, "×", { n: c, d: d }, "=", "?"];
    return {
      key: `mf-simp-${a}/${b}-${c}/${d}`,
      prompt: "Multiply. Answer in simplest form.",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...label(fracStr(a * c, b * d), [fracStr(a * d, b * c), fracStr(a + c, b + d), fracStr(a * c, b + d), fracStr(a * c + 1, b * d)]),
      hint: "Multiply top × top and bottom × bottom, then simplify.",
      explain: `${a}/${b} × ${c}/${d} = ${a * c}/${b * d}${fracStr(a * c, b * d) !== `${a * c}/${b * d}` ? ` = ${fracStr(a * c, b * d)}` : ""}`,
    };
  }
  const B = rand(2, 8);
  const t = top(B);
  const N = B * rand(2, 12);
  const eq: Token[] = [{ n: t, d: B }, "of", N, "=", "?"];
  return {
    key: `mf-of-${t}/${B}-${N}`,
    prompt: pick(["Find the fraction of the number.", `What is ${t}/${B} of ${N}?`]),
    speech: talk(`What is ${t}/${B} of ${N}?`),
    equation: eq,
    visual: { kind: "tape", rows: [{ label: String(N), parts: B }] },
    ...keypad((t * N) / B),
    hint: `Split ${N} into ${B} equal parts. Then take ${t} of them.`,
    explain: `${N} ÷ ${B} = ${N / B}, and ${t} × ${N / B} = ${(t * N) / B}.`,
  };
}

/** 5.NF.B.4b, 5.NF.B.6 — area with fraction sides; fraction multiplication stories. */
export function fractionAreaStories(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const b = rand(2, 5);
    const d = rand(2, 5);
    const a = top(b);
    const c = top(d);
    const eq: Token[] = [{ n: a, d: b }, "×", { n: c, d: d }, "=", { n: "?", d: b * d }];
    return {
      key: `fa-tiles-${a}/${b}-${c}/${d}`,
      prompt: `A rectangle is ${a}/${b} m by ${c}/${d} m. Area in m²?`,
      speech: talk(`A rectangle is ${a}/${b} meter by ${c}/${d} meter. What is its area in square meters?`),
      equation: eq,
      visual: { kind: "rect", w: c, h: a, showW: false, showH: false, grid: true, unit: "m" },
      ...keypad(a * c),
      hint: `Cut 1 square meter into ${b} rows and ${d} columns of tiles. How many tiles does the rectangle cover?`,
      explain: `${a} × ${c} = ${a * c} tiles, each 1/${b * d} m². Area = ${a * c}/${b * d} m².`,
    };
  }
  if (kind === 1) {
    const b = pick([2, 3, 4]);
    const d = pick([2, 3, 4]);
    const w1 = rand(1, 4);
    const w2 = rand(1, 3);
    const a = top(b);
    const c = top(d);
    const N1 = w1 * b + a;
    const N2 = w2 * d + c;
    const eq: Token[] = [{ w: w1, n: a, d: b }, "×", { w: w2, n: c, d: d }, "=", "?"];
    return {
      key: `fa-mixed-${w1}-${a}/${b}-${w2}-${c}/${d}`,
      prompt: `A garden is ${w1} ${a}/${b} m by ${w2} ${c}/${d} m. Area in m²?`,
      speech: talk(`A garden is ${w1} ${a}/${b} meters by ${w2} ${c}/${d} meters. What is its area in square meters?`),
      equation: eq,
      visual: NONE,
      ...label(fracStr(N1 * N2, b * d), [fracStr(w1 * w2 * b * d + a * c, b * d), fracStr(N1 * N2 + b * d, b * d), fracStr(N1 * N2 - 1, b * d), fracStr(N1 * d, N2 * b)]),
      hint: "Change both mixed numbers to fractions greater than 1, then multiply.",
      explain: `${w1} ${a}/${b} × ${w2} ${c}/${d} = ${N1}/${b} × ${N2}/${d} = ${N1 * N2}/${b * d} = ${fracStr(N1 * N2, b * d)} m²`,
    };
  }
  const s = rand(0, 3);
  const b = rand(2, 6);
  const d = rand(2, 6);
  const a = top(b);
  const c = top(d);
  const f = `${a}/${b}`;
  const g = `${c}/${d}`;
  if (s === 2 || s === 3) {
    const n = rand(2, 6);
    const w = rand(1, 3);
    const N = s === 2 ? n * (w * b + a) : n * a;
    const t = s === 2 ? `One lap is ${w} ${f} km. You run ${n} laps. How far?` : `${n} kids each drink ${f} L of milk. How much in all?`;
    return {
      key: `fa-story-${s}-${n}-${w}-${a}/${b}`,
      prompt: t,
      speech: talk(t),
      visual: NONE,
      ...label(fracStr(N, b), [fracStr(N + b, b), fracStr(N - 1 > 0 ? N - 1 : N + 2, b), fracStr(s === 2 ? n * w + a : n + a, b), fracStr(N, b * n)]),
      hint: "Multiply the whole number by the fraction (or mixed number).",
      explain: `${n} × ${s === 2 ? `${w} ${f}` : f} = ${N}/${b} = ${fracStr(N, b)}`,
    };
  }
  const t = s === 0
    ? `A recipe uses ${f} cup of sugar. You make ${g} of it. How much sugar?`
    : `${f} of a cake is left. You eat ${g} of that. How much cake?`;
  return {
    key: `fa-story-${s}-${a}/${b}-${c}/${d}`,
    prompt: t,
    speech: talk(t),
    visual: NONE,
    ...label(fracStr(a * c, b * d), [fracStr(a * d, b * c), fracStr(a + c, b + d), ...fracWrongs(a * c, b * d)]),
    hint: `"${g} of" something means multiply by ${g}.`,
    explain: `${g} × ${f} = ${a * c}/${b * d}${fracStr(a * c, b * d) !== `${a * c}/${b * d}` ? ` = ${fracStr(a * c, b * d)}` : ""}`,
  };
}

const FR: [number, number][] = [[1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [7, 8], [1, 3], [4, 3], [3, 2], [5, 4], [7, 5], [9, 8], [5, 2], [7, 4]];

/** 5.NF.B.5a, 5.NF.B.5b — multiplying as scaling. */
export function scaling(): Question {
  const kind = rand(0, 3);
  const N = rand(6, 40);
  if (kind === 0) {
    const [n, d] = pick(FR);
    const more = n > d;
    return {
      key: `sc-ml-${n}/${d}-${N}`,
      prompt: `Without multiplying: is ${fracStr(n, d)} × ${N} more or less than ${N}?`,
      speech: talk(`Without multiplying, is ${fracStr(n, d)} times ${N} more or less than ${N}?`),
      visual: NONE,
      ...label(more ? `More than ${N}` : `Less than ${N}`, [more ? `Less than ${N}` : `More than ${N}`, `Equal to ${N}`]),
      hint: "Multiplying by a number less than 1 makes it smaller. More than 1 makes it bigger.",
      explain: `${fracStr(n, d)} is ${more ? "more" : "less"} than 1, so the product is ${more ? "more" : "less"} than ${N}.`,
    };
  }
  if (kind === 1) {
    const four = shuffle(FR).filter((f, i, arr) => arr.findIndex((g) => g[0] / g[1] === f[0] / f[1]) === i).slice(0, 4);
    const most = rand(0, 1) === 1;
    const best = four.reduce((p, f) => ((most ? f[0] / f[1] > p[0] / p[1] : f[0] / f[1] < p[0] / p[1]) ? f : p));
    const lab = (f: [number, number]) => `${N} × ${fracStr(f[0], f[1])}`;
    return {
      key: `sc-which-${most}-${N}-${sorted(four.map((f) => (f[0] * 100) / f[1])).join("-")}`,
      prompt: `Which product is the ${most ? "greatest" : "least"}?`,
      speech: `Without multiplying, which product is the ${most ? "greatest" : "least"}?`,
      visual: NONE,
      ...label(lab(best), four.filter((f) => f !== best).map(lab)),
      hint: "Every product starts with the same number. Look for the biggest (or smallest) fraction.",
      explain: `${fracStr(best[0], best[1])} is the ${most ? "biggest" : "smallest"} factor, so ${lab(best)} is the ${most ? "greatest" : "least"}.`,
    };
  }
  if (kind === 2) {
    const less = rand(0, 1) === 1;
    const fits = shuffle(FR.filter(([n, d]) => (less ? n < d : n > d)))[0];
    const others = shuffle(FR.filter(([n, d]) => (less ? n > d : n < d))).slice(0, 2).map(([n, d]) => fracStr(n, d));
    const k = rand(2, 9);
    return {
      key: `sc-fit-${less}-${N}-${fits.join("/")}`,
      prompt: `${N} × ? is ${less ? "less" : "more"} than ${N}. Which fits?`,
      speech: `${N} times what is ${less ? "less" : "more"} than ${N}? Which fraction fits?`,
      visual: NONE,
      ...label(fracStr(fits[0], fits[1]), [...others, `${k}/${k}`]),
      hint: `To get ${less ? "less" : "more"} than ${N}, multiply by a number ${less ? "less" : "more"} than 1.`,
      explain: `${fracStr(fits[0], fits[1])} is ${less ? "less" : "more"} than 1, so ${N} × ${fracStr(fits[0], fits[1])} is ${less ? "less" : "more"} than ${N}.`,
    };
  }
  const k = rand(2, 9);
  const eq: Token[] = [{ n: k, d: k }, "×", N, "=", "?"];
  return {
    key: `sc-one-${k}-${N}`,
    prompt: "Multiply. Think about what the fraction equals!",
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...keypad(N),
    hint: `What is ${k}/${k} equal to?`,
    explain: `${k}/${k} = 1, and 1 × ${N} = ${N}. Multiplying by 1 keeps the number the same.`,
  };
}

/** 5.NF.B.7a–c — divide unit fractions by whole numbers and whole numbers by unit fractions. */
export function divideUnitFractions(): Question {
  const kind = rand(0, 2);
  const b = rand(2, 8);
  const n = rand(2, 6);
  if (kind === 0) {
    const eq: Token[] = [{ n: 1, d: b }, "÷", n, "=", { n: 1, d: "?" }];
    return {
      key: `du-a-${b}-${n}`,
      prompt: `Split 1/${b} into ${n} equal parts. How big is each?`,
      speech: talk(`Split 1/${b} into ${n} equal parts. What fraction is each part?`),
      equation: eq,
      visual: { kind: "fractions", bars: [{ parts: b, a: 1, label: `1/${b}` }, { parts: b * n, a: 1 }] },
      ...keypad(b * n),
      hint: `Cut every 1/${b} into ${n} pieces. How many pieces make a whole now?`,
      explain: `1/${b} ÷ ${n} = 1/${b * n}, because ${n} × 1/${b * n} = 1/${b}.`,
    };
  }
  if (kind === 1) {
    const eq: Token[] = [n, "÷", { n: 1, d: b }, "=", "?"];
    return {
      key: `du-b-${n}-${b}`,
      prompt: `How many 1/${b}s are in ${n}?`,
      speech: talk(`How many 1/${b}s are in ${n}?`),
      equation: eq,
      visual: { kind: "fractions", bars: Array.from({ length: n }, () => ({ parts: b, a: b })) },
      ...keypad(n * b),
      hint: `Each whole has ${b} pieces of size 1/${b}.`,
      explain: `${n} ÷ 1/${b} = ${n} × ${b} = ${n * b}`,
    };
  }
  const s = rand(0, 3);
  if (s < 2) {
    const t = s === 0
      ? `You have ${n} cups of rice. A serving is 1/${b} cup. How many servings?`
      : `A ${n} km trail has a sign every 1/${b} km. How many sections?`;
    return {
      key: `du-c-${s}-${n}-${b}`,
      prompt: t,
      speech: talk(t),
      equation: [n, "÷", { n: 1, d: b }, "=", "?"],
      visual: NONE,
      ...keypad(n * b),
      hint: `How many 1/${b}s fit in 1? Now how many fit in ${n}?`,
      explain: `${n} ÷ 1/${b} = ${n * b}`,
    };
  }
  const t = s === 2
    ? `${n} friends share 1/${b} lb of fudge equally. How much each?`
    : `Cut a 1/${b} m ribbon into ${n} equal pieces. How long is each?`;
  return {
    key: `du-c-${s}-${n}-${b}`,
    prompt: t,
    speech: talk(t),
    equation: [{ n: 1, d: b }, "÷", n, "=", { n: 1, d: "?" }],
    visual: NONE,
    ...keypad(b * n),
    hint: `Sharing 1/${b} among ${n} makes pieces ${n} times smaller.`,
    explain: `1/${b} ÷ ${n} = 1/${b * n}`,
  };
}

/* ======================================== 3. Volume, graphs & expressions (G5) */

/** 5.NBT.B.5 — multiply multi-digit whole numbers. */
export function bigMultiply(): Question {
  const kind = rand(0, 3);
  const nz = (lo: number, hi: number) => {
    let v = rand(lo, hi);
    while (v % 10 === 0) v = rand(lo, hi);
    return v;
  };
  const b = nz(12, 98);
  const t = b - (b % 10);
  const o = b % 10;
  const steps = (a: number) => `${a} × ${t} = ${a * t} and ${a} × ${o} = ${a * o}. ${a * t} + ${a * o} = ${a * b}.`;
  const hint = (a: number) => `Break ${b} into ${t} + ${o}. Multiply ${a} by each part, then add.`;
  if (kind === 3) {
    const rows = nz(12, 48);
    const seats = rand(15, 60);
    const [r, s] = rand(0, 1) ? [rows, seats] : [seats, rows];
    const story = pick([`A theater has ${r} rows of ${s} seats. How many seats?`, `A box holds ${s} crayons. How many in ${r} boxes?`]);
    return {
      key: `bm-story-${r}-${s}-${story.slice(0, 5)}`,
      prompt: story,
      speech: story,
      visual: NONE,
      ...keypad(r * s),
      hint: `Multiply ${r} × ${s}. Break one number into tens and ones.`,
      explain: `${r} × ${s} = ${r * s}`,
    };
  }
  const a = kind === 0 ? nz(12, 98) : kind === 1 ? rand(101, 999) : rand(1001, 9999);
  const eq: Token[] = [a, "×", b, "=", "?"];
  return {
    key: `bm-${a}-${b}`,
    prompt: pick(["Multiply.", "What's the product?"]),
    speech: sayEq(eq),
    equation: eq,
    visual: kind === 0 ? { kind: "area", tens: a - (a % 10), ones: a % 10, by: b, split: [t, o] } : NONE,
    ...keypad(a * b),
    hint: hint(a),
    explain: steps(a),
  };
}

/** 5.NBT.B.6 — divide up to 4-digit numbers by 2-digit numbers. */
export function divideTwoDigit(): Question {
  const kind = rand(0, 3);
  let d = rand(11, 99);
  let q = rand(11, 99);
  while (d * q > 9999) q = rand(11, 99);
  const est = Math.round(d / 10) * 10;
  const hint = `Estimate: about how many ${est}s fit? Then multiply and check.`;
  if (kind === 0) {
    const eq: Token[] = [d * q, "÷", d, "=", "?"];
    return {
      key: `d2-${d}-${q}`,
      prompt: pick(["Divide.", "What's the quotient?"]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(q),
      hint,
      explain: `${d * q} ÷ ${d} = ${q}, because ${d} × ${q} = ${d * q}.`,
    };
  }
  if (kind === 1) {
    let r = rand(1, d - 1);
    while (d * q + r > 9999) r = rand(1, d - 1), q -= 1;
    const N = d * q + r;
    return {
      key: `d2-rem-${N}-${d}`,
      prompt: `What is the remainder when ${N} is divided by ${d}?`,
      speech: `What is the remainder when ${N} is divided by ${d}?`,
      visual: NONE,
      ...keypad(r),
      hint: `${N} ÷ ${d} is about ${q}. How much is left after ${q} × ${d}?`,
      explain: `${d} × ${q} = ${d * q}, and ${N} − ${d * q} = ${r}. The remainder is ${r}.`,
    };
  }
  if (kind === 2) {
    d = rand(12, 60);
    q = rand(8, 60);
    const r = rand(1, d - 1);
    const N = d * q + r;
    return {
      key: `d2-bus-${N}-${d}`,
      prompt: `${N} kids go on a trip. A bus holds ${d}. Fewest buses?`,
      speech: `${N} kids go on a trip. Each bus holds ${d} kids. What is the fewest number of buses?`,
      visual: NONE,
      ...keypad(q + 1),
      hint: "Divide, then think: what happens to the kids left over?",
      explain: `${N} ÷ ${d} = ${q} R${r}. The ${r} extra kids need one more bus: ${q + 1}.`,
    };
  }
  const item = pick([["eggs", "cartons"], ["pencils", "boxes"], ["cards", "packs"], ["muffins", "trays"]]);
  return {
    key: `d2-pack-${d}-${q}-${item[0]}`,
    prompt: `Pack ${d * q} ${item[0]} into ${item[1]} of ${d}. How many ${item[1]}?`,
    speech: `Pack ${d * q} ${item[0]} into ${item[1]} of ${d}. How many ${item[1]} do you fill?`,
    visual: NONE,
    ...keypad(q),
    hint,
    explain: `${d * q} ÷ ${d} = ${q}`,
  };
}

/** 5.OA.A.1, 5.OA.A.2 — brackets first; write and read expressions. */
export function bracketsExpressions(): Question {
  const kind = rand(0, 4);
  if (kind <= 2) {
    const t = rand(0, 6);
    let eq: Token[];
    let ans: number;
    let explain: string;
    if (t === 0) {
      const [a, b, c] = [rand(2, 12), rand(2, 12), rand(2, 9)];
      eq = ["(", a, "+", b, ")", "×", c];
      ans = (a + b) * c;
      explain = `Brackets first: ${a} + ${b} = ${a + b}. Then ${a + b} × ${c} = ${ans}.`;
    } else if (t === 1) {
      const [a, c, d] = [rand(2, 9), rand(1, 8), rand(1, 20)];
      const b = c + rand(1, 9);
      eq = [a, "×", "(", b, "−", c, ")", "+", d];
      ans = a * (b - c) + d;
      explain = `Brackets first: ${b} − ${c} = ${b - c}. Then ${a} × ${b - c} = ${a * (b - c)}, plus ${d} is ${ans}.`;
    } else if (t === 2) {
      const [b, c, d] = [rand(1, 8), rand(1, 6), rand(1, 6)];
      const a = b + rand(1, 8);
      eq = ["(", a, "−", b, ")", "×", "(", c, "+", d, ")"];
      ans = (a - b) * (c + d);
      explain = `${a} − ${b} = ${a - b} and ${c} + ${d} = ${c + d}. ${a - b} × ${c + d} = ${ans}.`;
    } else if (t === 3) {
      const [a, b, c] = [rand(2, 20), rand(2, 9), rand(2, 9)];
      eq = [a, "+", b, "×", c];
      ans = a + b * c;
      explain = `No brackets, so multiply first: ${b} × ${c} = ${b * c}. Then ${a} + ${b * c} = ${ans}.`;
    } else if (t === 4) {
      const c = rand(2, 9);
      const q = rand(2, 12);
      const a = rand(1, c * q - 1);
      const b = c * q - a;
      eq = ["(", a, "+", b, ")", "÷", c];
      ans = q;
      explain = `Brackets first: ${a} + ${b} = ${c * q}. Then ${c * q} ÷ ${c} = ${q}.`;
    } else if (t === 5) {
      const [a, b, c] = [rand(2, 6), rand(2, 15), rand(2, 15)];
      const d = rand(1, b + c - 1);
      eq = [a, "×", "(", "(", b, "+", c, ")", "−", d, ")"];
      ans = a * (b + c - d);
      explain = `Inside first: ${b} + ${c} = ${b + c}, then ${b + c} − ${d} = ${b + c - d}. ${a} × ${b + c - d} = ${ans}.`;
    } else {
      const d = rand(2, 6);
      const q = rand(2, 9);
      const a = rand(3, 9);
      const b = rand(Math.ceil((d * q + 1) / a), Math.ceil((d * q + 1) / a) + 4);
      const c = a * b - d * q;
      eq = ["(", a, "×", b, "−", c, ")", "÷", d];
      ans = q;
      explain = `Inside first: ${a} × ${b} = ${a * b}, then ${a * b} − ${c} = ${d * q}. ${d * q} ÷ ${d} = ${q}.`;
    }
    const full: Token[] = [...eq, "=", "?"];
    return {
      key: `be-eval-${t}-${eqStr(eq)}`,
      prompt: pick(["Work it out. Brackets first!", "What is the value?", "Solve the expression."]),
      speech: sayEq(full),
      equation: full,
      visual: NONE,
      ...keypad(ans),
      hint: "Do what's inside the brackets first. Then multiply and divide, then add and subtract.",
      explain,
    };
  }
  if (kind === 3) {
    const w = rand(0, 4);
    const [a, b, c] = [rand(5, 20), rand(2, 9), rand(2, 9)];
    const bank: [string, string, string[]][] = [
      [`Add ${a} and ${b}, then multiply by ${c}.`, `(${a} + ${b}) × ${c}`, [`${a} + ${b} × ${c}`, `${a} × ${b} + ${c}`, `${a} + ${b} + ${c}`]],
      [`Multiply ${a} by ${b}, then subtract ${c}.`, `${a} × ${b} − ${c}`, [`${a} × (${b} − ${c})`, `${c} − ${a} × ${b}`, `${a} + ${b} − ${c}`]],
      [`Subtract ${b} from ${a}, then divide by ${c}.`, `(${a} − ${b}) ÷ ${c}`, [`${a} − ${b} ÷ ${c}`, `(${b} − ${a}) ÷ ${c}`, `${c} ÷ (${a} − ${b})`]],
      [`Double the sum of ${a} and ${b}.`, `2 × (${a} + ${b})`, [`2 × ${a} + ${b}`, `${a} + ${b} + 2`, `2 + ${a} + ${b}`]],
      [`Add ${a} to the product of ${b} and ${c}.`, `${b} × ${c} + ${a}`, [`(${a} + ${b}) × ${c}`, `${a} × ${b} + ${c}`, `${a} + ${b} + ${c}`]],
    ];
    const [say, right, wrong] = bank[w];
    return {
      key: `be-write-${w}-${a}-${b}-${c}`,
      prompt: `Which expression says: ${say}`,
      speech: talk(`Which expression says: ${say}`),
      visual: NONE,
      ...label(right, wrong),
      hint: "Whatever happens first goes in brackets.",
      explain: `"${say}" is ${right}.`,
    };
  }
  const c = rand(2, 9);
  const x = rand(1000, 20000);
  const y = rand(100, 999);
  return {
    key: `be-times-${c}-${x}-${y}`,
    prompt: `${c} × (${x} + ${y}) is how many times as big as ${x} + ${y}?`,
    speech: `${c} times the sum of ${x} and ${y} is how many times as big as ${x} plus ${y}?`,
    visual: NONE,
    ...keypad(c),
    hint: "You don't need to add! Look at what multiplies the brackets.",
    explain: `${c} × (${x} + ${y}) is ${c} groups of (${x} + ${y}), so it is ${c} times as big.`,
  };
}

/** 5.OA.B.3 — two patterns from two rules; ordered pairs; relationships. */
export function twoRulePatterns(): Question {
  const kind = rand(0, 2);
  const p = rand(1, 6);
  const k = rand(2, 4);
  const header = ["Step", `A: add ${p}`, `B: add ${k * p}`];
  if (kind === 0) {
    const r = rand(2, 4);
    const col = rand(1, 2);
    const rows: (number | string)[][] = [0, 1, 2, 3, 4].map((i) => [i, i * p, i * k * p]);
    const ans = rows[r][col] as number;
    rows[r][col] = "?";
    return {
      key: `pat-gap-${p}-${k}-${r}-${col}`,
      prompt: "Both patterns start at 0. What's missing?",
      speech: `Pattern A adds ${p} each step. Pattern B adds ${k * p}. Both start at 0. What number is missing?`,
      visual: { kind: "table", header, rows },
      ...keypad(ans),
      hint: `Follow the rule in that column: add ${col === 1 ? p : k * p} each step.`,
      explain: `Step ${r}: ${col === 1 ? `${r} × ${p}` : `${r} × ${k * p}`} = ${ans}.`,
    };
  }
  const rows = [0, 1, 2, 3].map((i) => [i, i * p, i * k * p]);
  if (kind === 1) {
    return {
      key: `pat-times-${p}-${k}`,
      prompt: "Each B number is how many times the A number?",
      speech: `Pattern A adds ${p}. Pattern B adds ${k * p}. Each B number is how many times the A number?`,
      visual: { kind: "table", header, rows },
      ...keypad(k),
      hint: "Compare the numbers side by side in each step.",
      explain: `${k * p} is ${k} times ${p}, so every B number is ${k} times its A number.`,
    };
  }
  const s = rand(5, 8);
  const A = s * p;
  const B = s * k * p;
  return {
    key: `pat-pair-${p}-${k}-${s}`,
    prompt: `Which ordered pair (A, B) comes at step ${s}?`,
    speech: `Pattern A adds ${p}. Pattern B adds ${k * p}. Which ordered pair, A comma B, comes at step ${s}?`,
    visual: { kind: "table", header, rows },
    ...label(`(${A}, ${B})`, [`(${B}, ${A})`, `(${A - p}, ${B - k * p})`, `(${A}, ${A + k * p})`, `(${A + p}, ${B + k * p})`]),
    hint: `At step ${s}, A is ${s} × ${p} and B is ${s} × ${k * p}.`,
    explain: `Step ${s}: A = ${A}, B = ${B}, so the pair is (${A}, ${B}).`,
  };
}

/** 5.G.A.1, 5.G.A.2 — the first-quadrant coordinate grid. */
export function gridPoints(): Question {
  const kind = rand(0, 4);
  const x = rand(0, 10);
  const y = rand(1, 10);
  if (kind === 0) {
    const wrong = [`(${y}, ${x})`, `(${x === 10 ? x - 1 : x + 1}, ${y})`, `(${x}, ${y - 1})`];
    return {
      key: `gp-read-${x}-${y}`,
      prompt: "What are the coordinates of point A?",
      speech: "What are the coordinates of point A? Go across first, then up.",
      visual: { kind: "grid", size: 10, quadrants: 1, points: [{ x, y, label: "A" }] },
      needsVisual: true,
      ...label(`(${x}, ${y})`, wrong),
      hint: "Start at (0, 0). Count across to the point first, then count up.",
      explain: `A is ${x} across and ${y} up: (${x}, ${y}).`,
    };
  }
  if (kind === 1) {
    const spots = new Map<string, { x: number; y: number }>();
    spots.set(`${x},${y}`, { x, y });
    if (x !== y && y <= 10) spots.set(`${y},${x}`, { x: y, y: x });
    while (spots.size < 4) {
      const p = { x: rand(0, 10), y: rand(0, 10) };
      spots.set(`${p.x},${p.y}`, p);
    }
    const names = ["A", "B", "C", "D"];
    const pts = shuffle([...spots.values()]).map((p, i) => ({ ...p, label: names[i] }));
    const right = pts.find((p) => p.x === x && p.y === y)!.label;
    return {
      key: `gp-find-${x}-${y}-${pts.map((p) => `${p.x}.${p.y}`).join("_")}`,
      prompt: `Which point is at (${x}, ${y})?`,
      speech: `Which point is at ${x} comma ${y}?`,
      visual: { kind: "grid", size: 10, quadrants: 1, points: pts },
      needsVisual: true,
      ...label(right, names.filter((n) => n !== right), true),
      hint: `Go ${x} across first, then ${y} up.`,
      explain: `(${x}, ${y}) is ${x} across and ${y} up: point ${right}.`,
    };
  }
  if (kind === 2) {
    const sx = Math.min(x, 8);
    const r = rand(1, 10 - sx);
    const u = rand(1, 3);
    const sy = Math.max(0, y - u - 1);
    const end = `(${sx + r}, ${sy + u})`;
    return {
      key: `gp-move-${sx}-${sy}-${r}-${u}`,
      prompt: `Start at (${sx}, ${sy}). Go ${r} right and ${u} up. Where are you?`,
      speech: `Start at ${sx} comma ${sy}. Go ${r} right and ${u} up. Where are you now?`,
      visual: { kind: "grid", size: 10, quadrants: 1, points: [{ x: sx, y: sy, label: "S" }] },
      ...label(end, [`(${sx + u}, ${sy + r})`, `(${sx + r}, ${sy})`, `(${sx}, ${sy + u + r})`, `(${sx + r + u}, ${sy + u})`]),
      hint: "Moving right changes the first number. Moving up changes the second.",
      explain: `${sx} + ${r} = ${sx + r} across and ${sy} + ${u} = ${sy + u} up: ${end}.`,
    };
  }
  if (kind === 3) {
    const flat = rand(0, 1) === 1;
    let a = rand(0, 10);
    let b = rand(0, 10);
    while (a === b) b = rand(0, 10);
    const pts = flat ? [{ x: a, y, label: "S" }, { x: b, y, label: "P" }] : [{ x, y: a, label: "S" }, { x, y: b, label: "P" }];
    return {
      key: `gp-dist-${flat}-${a}-${b}-${flat ? y : x}`,
      prompt: `School ${pt(pts[0].x, pts[0].y)}, park ${pt(pts[1].x, pts[1].y)}. How many blocks apart?`,
      speech: `The school S is at ${pts[0].x} comma ${pts[0].y}. The park P is at ${pts[1].x} comma ${pts[1].y}. How many blocks apart are they?`,
      visual: { kind: "grid", size: 10, quadrants: 1, points: pts },
      ...keypad(Math.abs(a - b)),
      hint: `Only the ${flat ? "first" : "second"} numbers change. Find the difference.`,
      explain: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)} blocks.`,
    };
  }
  let ax = rand(1, 9);
  let ay = rand(1, 9);
  while (ax === ay) ay = rand(1, 9);
  const across = rand(0, 1) === 1;
  return {
    key: `gp-axis-${ax}-${ay}-${across}`,
    prompt: `In (${ax}, ${ay}), which number tells how far to go ${across ? "across" : "up"}?`,
    speech: `In the ordered pair ${ax} comma ${ay}, which number tells how far to go ${across ? "across" : "up"}?`,
    visual: { kind: "grid", size: 10, quadrants: 1, points: [{ x: ax, y: ay, label: "A" }] },
    ...label(String(across ? ax : ay), [String(across ? ay : ax)]),
    hint: "The first number is the x-coordinate (across). The second is the y-coordinate (up).",
    explain: `The ${across ? "first" : "second"} number, ${across ? ax : ay}, tells how far ${across ? "across" : "up"}.`,
  };
}

const CONV = [
  { big: "km", small: "m", f: 1000, metric: true },
  { big: "m", small: "cm", f: 100, metric: true },
  { big: "cm", small: "mm", f: 10, metric: true },
  { big: "kg", small: "g", f: 1000, metric: true },
  { big: "L", small: "mL", f: 1000, metric: true },
  { big: "ft", small: "in", f: 12, metric: false },
  { big: "yd", small: "ft", f: 3, metric: false },
  { big: "lb", small: "oz", f: 16, metric: false },
  { big: "gal", small: "qt", f: 4, metric: false },
  { big: "h", small: "min", f: 60, metric: false },
  { big: "min", small: "s", f: 60, metric: false },
];

/** 5.MD.A.1 — convert units within one measurement system, including multi-step problems. */
export function unitConversions(): Question {
  const kind = rand(0, 2);
  const c = pick(CONV);
  if (kind === 0) {
    const n = c.metric && rand(0, 1) ? sh(rand(11, 99), -1) : rand(2, 12);
    const ans = clean(n * c.f);
    return {
      key: `uc-down-${c.big}-${n}`,
      prompt: `${ds(n)} ${c.big} = ? ${c.small}`,
      speech: `How many ${c.small} are in ${ds(n)} ${c.big}?`,
      visual: { kind: "table", header: [c.big, c.small], rows: [[1, c.f], [n, "?"]] },
      unit: c.small,
      ...keypad(ans),
      hint: `1 ${c.big} = ${c.f} ${c.small}. Multiply by ${c.f}.`,
      explain: `${ds(n)} × ${c.f} = ${ds(ans)}, so ${ds(n)} ${c.big} = ${ds(ans)} ${c.small}.`,
    };
  }
  if (kind === 1) {
    const big = c.metric && rand(0, 1) ? sh(rand(11, 99), -1) : rand(2, 12);
    const small = clean(big * c.f);
    return {
      key: `uc-up-${c.big}-${small}`,
      prompt: `${ds(small)} ${c.small} = ? ${c.big}`,
      speech: `How many ${c.big} are in ${ds(small)} ${c.small}?`,
      visual: { kind: "table", header: [c.big, c.small], rows: [[1, c.f], ["?", small]] },
      unit: c.big,
      ...keypad(big),
      hint: `${c.f} ${c.small} make 1 ${c.big}. Divide by ${c.f}.`,
      explain: `${ds(small)} ÷ ${c.f} = ${ds(big)}, so ${ds(small)} ${c.small} = ${ds(big)} ${c.big}.`,
    };
  }
  const s = rand(0, 4);
  if (s === 0) {
    const m = rand(2, 9);
    const cut = rand(11, 95);
    return {
      key: `uc-rope-${m}-${cut}`,
      prompt: `A rope is ${m} m long. You cut off ${cut} cm. How many cm are left?`,
      speech: `A rope is ${m} meters long. You cut off ${cut} centimeters. How many centimeters are left?`,
      visual: NONE,
      unit: "cm",
      ...keypad(m * 100 - cut),
      hint: `First change ${m} m to centimeters.`,
      explain: `${m} m = ${m * 100} cm. ${m * 100} − ${cut} = ${m * 100 - cut} cm.`,
    };
  }
  if (s === 1) {
    const k = rand(1, 5);
    const m = rand(50, 950);
    return {
      key: `uc-walk-${k}-${m}`,
      prompt: `You walk ${k} km, then ${m} m more. How many meters in all?`,
      speech: `You walk ${k} kilometers, then ${m} meters more. How many meters is that in all?`,
      visual: NONE,
      unit: "m",
      ...keypad(k * 1000 + m),
      hint: "1 km = 1,000 m. Change the km to meters first.",
      explain: `${k} km = ${k * 1000} m. ${k * 1000} + ${m} = ${k * 1000 + m} m.`,
    };
  }
  if (s === 2) {
    const h = rand(1, 3);
    const m = rand(5, 55);
    return {
      key: `uc-movie-${h}-${m}`,
      prompt: `A movie is ${h} h ${m} min long. How many minutes?`,
      speech: `A movie is ${h} hour${h > 1 ? "s" : ""} and ${m} minutes long. How many minutes is that?`,
      visual: NONE,
      unit: "min",
      ...keypad(h * 60 + m),
      hint: "1 hour = 60 minutes.",
      explain: `${h} × 60 = ${h * 60}, plus ${m} = ${h * 60 + m} minutes.`,
    };
  }
  if (s === 3) {
    const n = rand(2, 9);
    const v = pick([250, 300, 500, 750, 200, 600]);
    return {
      key: `uc-juice-${n}-${v}`,
      prompt: `${n} bottles hold ${v} mL each. How many liters in all?`,
      speech: `${n} bottles each hold ${v} milliliters. How many liters is that in all?`,
      visual: NONE,
      unit: "L",
      ...keypad(sh((n * v) / 100, -1)),
      hint: "Find the total mL, then divide by 1,000 to get liters.",
      explain: `${n} × ${v} = ${n * v} mL = ${ds((n * v) / 1000)} L.`,
    };
  }
  const lb = rand(1, 6);
  const oz = rand(1, 15);
  return {
    key: `uc-bag-${lb}-${oz}`,
    prompt: `A bag weighs ${lb} lb ${oz} oz. How many ounces is that?`,
    speech: `A bag weighs ${lb} pound${lb > 1 ? "s" : ""} and ${oz} ounces. How many ounces is that?`,
    visual: NONE,
    unit: "oz",
    ...keypad(lb * 16 + oz),
    hint: "1 pound = 16 ounces.",
    explain: `${lb} × 16 = ${lb * 16}, plus ${oz} = ${lb * 16 + oz} oz.`,
  };
}

/** 5.MD.C.3a, 5.MD.C.3b, 5.MD.C.4, 5.MD.C.5a, 5.MD.C.5b — volume of boxes. */
export function boxVolume(): Question {
  const kind = rand(0, 5);
  if (kind <= 1) {
    const [l, w, h] = [rand(2, 5), rand(2, 4), rand(1, 4)];
    const layers = kind === 1;
    return {
      key: `bv-cubes-${layers}-${l}-${w}-${h}`,
      prompt: layers ? `Each layer has ${l * w} cubes. ${h} layers. How many cubes?` : "How many unit cubes make this box?",
      speech: layers ? `Each layer has ${l * w} unit cubes. There are ${h} layers. How many cubes in all?` : "How many unit cubes make this box?",
      visual: { kind: "box", l, w, h, unit: "", cubes: true },
      needsVisual: !layers,
      unit: "cubes",
      ...keypad(l * w * h),
      hint: `Count the cubes in one layer: ${l} × ${w}. Then multiply by the number of layers.`,
      explain: `${l} × ${w} = ${l * w} in a layer, × ${h} layers = ${l * w * h} cubes.`,
    };
  }
  const [l, w, h] = [rand(2, 12), rand(2, 10), rand(2, 10)];
  if (kind === 2) {
    const eq: Token[] = [l, "×", w, "×", h, "=", "?"];
    return {
      key: `bv-lwh-${l}-${w}-${h}`,
      prompt: "Find the volume of the box.",
      speech: `A box is ${l} by ${w} by ${h} centimeters. What is its volume?`,
      equation: eq,
      visual: { kind: "box", l, w, h, unit: "cm" },
      unit: "cm³",
      ...keypad(l * w * h),
      hint: "Volume = length × width × height.",
      explain: `${l} × ${w} × ${h} = ${l * w * h} cm³`,
    };
  }
  if (kind === 3) {
    const B = l * w;
    const eq: Token[] = [B, "×", h, "=", "?"];
    return {
      key: `bv-bh-${B}-${h}`,
      prompt: `The base area is ${B} cm². The height is ${h} cm. Volume?`,
      speech: `The base of a box has an area of ${B} square centimeters. The height is ${h} centimeters. What is the volume?`,
      equation: eq,
      visual: NONE,
      unit: "cm³",
      ...keypad(B * h),
      hint: "Volume = base area × height. The base tells how many cubes fit in one layer.",
      explain: `${B} × ${h} = ${B * h} cm³`,
    };
  }
  if (kind === 4) {
    const eq: Token[] = [l, "×", w, "×", "?", "=", l * w * h];
    return {
      key: `bv-miss-${l}-${w}-${h}`,
      prompt: `A box holds ${l * w * h} cm³. It's ${l} cm long, ${w} cm wide. Height?`,
      speech: `A box has a volume of ${l * w * h} cubic centimeters. It is ${l} centimeters long and ${w} wide. How tall is it?`,
      equation: eq,
      visual: NONE,
      unit: "cm",
      ...keypad(h),
      hint: `One layer holds ${l} × ${w} cubes. How many layers make ${l * w * h}?`,
      explain: `${l} × ${w} = ${l * w}, and ${l * w * h} ÷ ${l * w} = ${h} cm.`,
    };
  }
  const n = rand(2, 6);
  return {
    key: `bv-unit-${n}`,
    prompt: `How many 1 cm cubes fill a cube with ${n} cm edges?`,
    speech: `A unit cube is 1 centimeter on each edge. How many unit cubes fill a cube with ${n} centimeter edges?`,
    visual: { kind: "box", l: n, w: n, h: n, unit: "cm", cubes: n <= 5 },
    unit: "cubes",
    ...keypad(n ** 3),
    hint: `Each unit cube is 1 cm³. One layer is ${n} × ${n}.`,
    explain: `${n} × ${n} × ${n} = ${n ** 3} unit cubes, so the volume is ${n ** 3} cm³.`,
  };
}

/** 5.MD.C.5c — volume of shapes made of two boxes. */
export function combinedVolume(): Question {
  const [l1, w1, h1] = [rand(3, 10), rand(2, 6), rand(2, 6)];
  const [l2, w2, h2] = [rand(2, 8), rand(2, 6), rand(1, 5)];
  const v1 = l1 * w1 * h1;
  const v2 = l2 * w2 * h2;
  const eq: Token[] = [l1, "×", w1, "×", h1, "+", l2, "×", w2, "×", h2, "=", "?"];
  const ctx = pick(["A step block", "A toy castle", "A garden bed", "A fish tank stand"]);
  const story = rand(0, 1) === 1;
  return {
    key: `cv-${l1}-${w1}-${h1}-${l2}-${w2}-${h2}-${story ? ctx : "eq"}`,
    prompt: story ? `${ctx} is two boxes: ${l1}×${w1}×${h1} and ${l2}×${w2}×${h2} m. Volume?` : "Two boxes are joined. What's the total volume?",
    speech: `${ctx} is made of two boxes. One is ${l1} by ${w1} by ${h1}. The other is ${l2} by ${w2} by ${h2} meters. What is the total volume?`,
    equation: story ? undefined : eq,
    visual: { kind: "table", header: ["Box", "Length", "Width", "Height"], rows: [["A", l1, w1, h1], ["B", l2, w2, h2]] },
    unit: "m³",
    ...keypad(v1 + v2),
    hint: "Find the volume of each box, then add them.",
    explain: `${l1} × ${w1} × ${h1} = ${v1} and ${l2} × ${w2} × ${h2} = ${v2}. ${v1} + ${v2} = ${v1 + v2} m³.`,
  };
}

/* =================================================== 4. Factors & dividing (G6) */

const factorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f === 0);

function coprimePair(lo: number, hi: number): [number, number] {
  for (;;) {
    const m = rand(lo, hi);
    const n = rand(lo, hi);
    if (m !== n && gcd(m, n) === 1) return [m, n];
  }
}

/** 6.NS.B.4 — greatest common factor of two numbers up to 100. */
export function gcfLevel(): Question {
  let g = 0, m = 0, n = 0;
  do {
    g = rand(2, 15);
    [m, n] = coprimePair(1, 9);
  } while (g * m > 100 || g * n > 100);
  const [a, b] = [g * m, g * n];
  const explain = `Factors of ${a}: ${factorsOf(a).join(", ")}. Factors of ${b}: ${factorsOf(b).join(", ")}. The greatest one they share is ${g}.`;
  if (rand(0, 2) === 0) {
    const [x, y] = pick([["pencils", "erasers"], ["apples", "oranges"], ["red beads", "blue beads"], ["boys", "girls"]]);
    return {
      key: `gcf-story-${a}-${b}-${x}`,
      prompt: `Split ${a} ${x} and ${b} ${y} into equal groups. Most groups?`,
      speech: `${a} ${x} and ${b} ${y} are split into identical groups with none left over. What is the greatest number of groups?`,
      visual: NONE,
      ...keypad(g),
      hint: "The number of groups must divide both numbers. Find the greatest common factor.",
      explain,
    };
  }
  const smaller = factorsOf(g).filter((f) => f < g);
  return {
    key: `gcf-${a}-${b}`,
    prompt: `What is the greatest common factor of ${a} and ${b}?`,
    speech: `What is the greatest common factor of ${a} and ${b}?`,
    visual: NONE,
    ...choose(g, [smaller[smaller.length - 1], g * 2, m * n, Math.min(a, b), 1], 1, 1),
    hint: "List the factors of each number. Find the biggest one on both lists.",
    explain,
  };
}

/** 6.NS.B.4 — least common multiple of two numbers up to 12. */
export function lcmLevel(): Question {
  let a = rand(2, 12);
  let b = rand(2, 12);
  while (a === b || a % b === 0 || b % a === 0) [a, b] = [rand(2, 12), rand(2, 12)];
  const L = lcm(a, b);
  const mult = (k: number) => Array.from({ length: L / k }, (_, i) => k * (i + 1)).join(", ");
  const explain = `Multiples of ${a}: ${mult(a)}. Multiples of ${b}: ${mult(b)}. The first one they share is ${L}.`;
  const s = rand(0, 2);
  if (s === 0) {
    return {
      key: `lcm-${a}-${b}`,
      prompt: `What is the least common multiple of ${a} and ${b}?`,
      speech: `What is the least common multiple of ${a} and ${b}?`,
      visual: NONE,
      ...choose(L, [a * b, L * 2, gcd(a, b), a + b, L + Math.min(a, b)], 1, 1),
      hint: `Count by ${Math.max(a, b)}s until you reach a number that ${Math.min(a, b)} also goes into.`,
      explain,
    };
  }
  const story = s === 1
    ? `Hot dogs come in packs of ${a}, buns in ${b}s. Fewest to match?`
    : `Bus A comes every ${a} min, bus B every ${b} min. Together again in?`;
  return {
    key: `lcm-story-${s}-${a}-${b}`,
    prompt: story,
    speech: s === 1
      ? `Hot dogs come in packs of ${a} and buns come in packs of ${b}. What is the fewest hot dogs you can buy to have the same number of buns?`
      : `Bus A comes every ${a} minutes and bus B every ${b} minutes. They both just left. How many minutes until they leave together again?`,
    visual: NONE,
    ...keypad(L),
    hint: "You need a number that is a multiple of both. Find the smallest one.",
    explain,
  };
}

/** 6.NS.B.4 — use the GCF and the distributive property: 36 + 8 = 4 × (9 + 2). */
export function factorOut(): Question {
  let g = 0, m = 0, n = 0;
  do {
    g = rand(2, 12);
    [m, n] = coprimePair(1, 12);
  } while (g * (m + n) > 100);
  const [a, b] = [g * m, g * n];
  const kind = rand(0, 2);
  const hint = `Find the greatest common factor of ${a} and ${b}. Pull it out in front of the brackets.`;
  const explain = `GCF(${a}, ${b}) = ${g}. ${a} = ${g} × ${m} and ${b} = ${g} × ${n}, so ${a} + ${b} = ${g} × (${m} + ${n}).`;
  if (kind < 2) {
    const eq: Token[] = kind === 0 ? [a, "+", b, "=", "?", "×", "(", m, "+", n, ")"] : [a, "+", b, "=", g, "×", "(", m, "+", "?", ")"];
    return {
      key: `fo-${kind}-${a}-${b}`,
      prompt: kind === 0 ? "Pull out the greatest common factor." : "What's missing?",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(kind === 0 ? g : n),
      hint,
      explain,
    };
  }
  const h = factorsOf(g).filter((f) => f > 1 && f < g);
  const wrong = [`${g} × (${m} + ${n + 1})`, `${g} + (${m} + ${n})`, `${g} × (${m} × ${n})`];
  if (h.length) wrong.unshift(`${h[0]} × (${a / h[0]} + ${b / h[0]})`);
  return {
    key: `fo-pick-${a}-${b}`,
    prompt: `Which shows ${a} + ${b} with the GCF pulled out?`,
    speech: `Which shows ${a} plus ${b} with the greatest common factor pulled out?`,
    visual: NONE,
    ...label(`${g} × (${m} + ${n})`, wrong, true),
    hint,
    explain,
  };
}

/** 6.NS.B.2 — divide multi-digit numbers fluently. */
export function longDivision(): Question {
  const kind = rand(0, 2);
  let d: number, q: number;
  if (kind === 1) [d, q] = [rand(101, 499), rand(12, 99)];
  else {
    d = rand(12, 99);
    q = rand(101, Math.floor(99999 / d));
  }
  const N = d * q;
  if (kind === 2) {
    const item = pick([["eggs", "cartons"], ["bottles", "crates"], ["seeds", "packets"], ["bricks", "pallets"]]);
    return {
      key: `ld-story-${d}-${q}-${item[0]}`,
      prompt: `A farm packs ${N} ${item[0]} into ${item[1]} of ${d}. How many ${item[1]}?`,
      speech: `A farm packs ${N} ${item[0]} into ${item[1]} of ${d}. How many ${item[1]} does it fill?`,
      visual: NONE,
      ...keypad(q),
      hint: "Divide one place at a time: estimate, multiply, subtract, bring down.",
      explain: `${N} ÷ ${d} = ${q}`,
    };
  }
  const eq: Token[] = [N, "÷", d, "=", "?"];
  return {
    key: `ld-${N}-${d}`,
    prompt: pick(["Divide.", "Long division time!", "What's the quotient?"]),
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...keypad(q),
    hint: `Estimate each digit: how many ${d}s fit? Multiply, subtract, bring down the next digit.`,
    explain: `${N} ÷ ${d} = ${q}, because ${d} × ${q} = ${N}.`,
  };
}

/** 6.NS.B.3 — add, subtract, multiply and divide multi-digit decimals. */
export function decimalFluency(): Question {
  const kind = rand(0, 3);
  let eq: Token[];
  let ans: number;
  let hint: string;
  if (kind === 0) {
    let A = rand(1001, 49999);
    if (A % 10 === 0) A += 3;
    let B = rand(11, 999);
    if (B % 10 === 0) B += 1;
    eq = [sh(A, -3), "+", sh(B, -1), "=", "?"];
    ans = sh(A + B * 100, -3);
    hint = "Line up the decimal points and fill empty places with 0s.";
  } else if (kind === 1) {
    const W = rand(10, 60);
    let B = rand(101, W * 100 - 1);
    if (B % 10 === 0) B += 1;
    eq = [W, "−", sh(B, -2), "=", "?"];
    ans = sh(W * 100 - B, -2);
    hint = `Write ${W} as ${W}.00, then subtract. You'll need to regroup.`;
  } else if (kind === 2) {
    let A = rand(101, 999);
    if (A % 10 === 0) A += 1;
    let B = rand(11, 99);
    if (B % 10 === 0) B += 1;
    eq = [sh(A, -2), "×", sh(B, -1), "=", "?"];
    ans = sh(A * B, -3);
    hint = "Multiply as whole numbers, then count all the decimal places in the factors.";
  } else {
    const B = rand(12, 99);
    const tenths = rand(0, 1) === 1;
    const by = tenths ? sh(B, -1) : sh(B, -2);
    const q = rand(12, 99);
    eq = [tenths ? sh(q * B, -1) : sh(q * B, -2), "÷", by, "=", "?"];
    ans = q;
    hint = `Move the decimal point in both numbers so you divide by ${B}.`;
  }
  return {
    key: `df-${kind}-${eqStr(eq)}`,
    prompt: pick(["Solve. Watch the decimal point!", "Work it out.", "Decimal workout!"]),
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...keypad(ans),
    hint,
    explain: `${eqStr(eq.slice(0, -1))} ${ds(ans)}`,
  };
}

/** Pick c/d in simplest form with d ≤ 8. */
function properFrac(maxD = 8): [number, number] {
  for (;;) {
    const d = rand(2, maxD);
    const c = rand(1, d - 1);
    if (gcd(c, d) === 1) return [c, d];
  }
}

/** 6.NS.A.1 — divide fractions by fractions. */
export function divideFractions(): Question {
  const kind = rand(0, 2);
  const [c, d] = properFrac();
  if (kind === 0) {
    const k = rand(2, 8);
    const top = fracTok(k * c, d);
    const eq: Token[] = [top, "÷", { n: c, d: d }, "=", "?"];
    return {
      key: `dfr-whole-${k}-${c}/${d}`,
      prompt: `How many ${c}/${d}s are in ${tokStr(top)}?`,
      speech: talk(`How many ${c}/${d}s are in ${tokStr(top)}?`),
      equation: eq,
      visual: NONE,
      ...keypad(k),
      hint: "Dividing by a fraction is the same as multiplying by its flip.",
      explain: `${tokStr(top)} = ${k * c}/${d}. ${k * c}/${d} ÷ ${c}/${d} = ${k * c} ÷ ${c} = ${k}.`,
    };
  }
  const [a, b] = properFrac(9);
  const flipped = `${a}/${b} × ${d}/${c} = ${a * d}/${b * c}`;
  if (kind === 1) {
    const eq: Token[] = [{ n: a, d: b }, "÷", { n: c, d: d }, "=", { n: "?", d: b * c }];
    return {
      key: `dfr-top-${a}/${b}-${c}/${d}`,
      prompt: "Divide the fractions.",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(a * d),
      hint: `Flip ${c}/${d} to ${d}/${c}, then multiply.`,
      explain: flipped,
    };
  }
  const eq: Token[] = [{ n: a, d: b }, "÷", { n: c, d: d }, "=", "?"];
  return {
    key: `dfr-simp-${a}/${b}-${c}/${d}`,
    prompt: "Divide. Answer in simplest form.",
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...label(fracStr(a * d, b * c), [fracStr(a * c, b * d), fracStr(b * c, a * d), fracStr(a * d + 1, b * c), fracStr(a, b * c)]),
    hint: "Keep the first fraction, change ÷ to ×, flip the second fraction.",
    explain: `${flipped}${fracStr(a * d, b * c) !== `${a * d}/${b * c}` ? ` = ${fracStr(a * d, b * c)}` : ""}`,
  };
}

/** 6.NS.A.1 — word problems dividing fractions by fractions. */
export function fractionDivisionStories(): Question {
  const kind = rand(0, 3);
  const [c, d] = properFrac(6);
  if (kind === 0) {
    const k = rand(2, 9);
    const amount = tokStr(fracTok(k * c, d));
    const food = pick(["yogurt", "rice", "trail mix", "juice"]);
    return {
      key: `fds-serve-${k}-${c}/${d}-${food}`,
      prompt: `How many ${c}/${d}-cup servings are in ${amount} cup${amount === "1" ? "" : "s"} of ${food}?`,
      speech: talk(`How many ${c}/${d} cup servings are in ${amount} cup${amount === "1" ? "" : "s"} of ${food}?`),
      equation: [fracTok(k * c, d), "÷", { n: c, d: d }, "=", "?"],
      visual: NONE,
      ...keypad(k),
      hint: `Divide the total by the size of one serving.`,
      explain: `${amount} ÷ ${c}/${d} = ${k * c}/${d} × ${d}/${c} = ${k}`,
    };
  }
  if (kind === 1) {
    const t = rand(1, 5);
    const N = c * t;
    return {
      key: `fds-bag-${c}/${d}-${N}`,
      prompt: `${c}/${d} of a bag holds ${N} cups of flour. How many cups fill the bag?`,
      speech: talk(`${c}/${d} of a bag holds ${N} cups of flour. How many cups fill the whole bag?`),
      equation: [N, "÷", { n: c, d: d }, "=", "?"],
      visual: { kind: "tape", rows: [{ label: "Bag", parts: d }] },
      ...keypad(d * t),
      hint: `${c} part${c > 1 ? "s hold" : " holds"} ${N} cups. How much is 1 part? The bag has ${d} parts.`,
      explain: `${N} ÷ ${c}/${d} = ${N} × ${d}/${c} = ${d * t} cups.`,
    };
  }
  const [a, b] = properFrac(6);
  const t = kind === 2
    ? `A rectangle has area ${a}/${b} m² and width ${c}/${d} m. How long is it?`
    : `A track is ${c}/${d} mile around. How many laps make ${a}/${b} mile?`;
  return {
    key: `fds-${kind}-${a}/${b}-${c}/${d}`,
    prompt: t,
    speech: talk(t),
    equation: [{ n: a, d: b }, "÷", { n: c, d: d }, "=", "?"],
    visual: NONE,
    ...label(fracStr(a * d, b * c), [fracStr(a * c, b * d), fracStr(b * c, a * d), ...fracWrongs(a * d, b * c)]),
    hint: kind === 2 ? "Area = length × width, so length = area ÷ width." : "Divide the distance by the length of one lap.",
    explain: `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${fracStr(a * d, b * c)}${kind === 2 ? " m" : " laps"}`,
  };
}

/* ===================================================== 5. Ratios & rates (G6–7) */

const MARBLE_COLOURS: Colour[] = ["berry", "wave", "leaf", "sun", "grape", "tangerine"];

/** 6.RP.A.1 — ratios and ratio language. */
export function ratioLanguage(): Question {
  const kind = rand(0, 3);
  const [c1, c2] = shuffle(MARBLE_COLOURS).slice(0, 2);
  const [w1, w2] = [COLOUR_WORD[c1], COLOUR_WORD[c2]];
  if (kind <= 1) {
    const [r, s] = distinct(2, 1, 9);
    const marbles = [{ colour: c1, count: r }, { colour: c2, count: s }];
    const all = kind === 1;
    const right = all ? `${s}:${r + s}` : `${r}:${s}`;
    return {
      key: `rl-${kind}-${c1}-${r}-${c2}-${s}`,
      prompt: all ? `What is the ratio of ${w2} marbles to all marbles?` : `What is the ratio of ${w1} to ${w2} marbles?`,
      speech: all ? `What is the ratio of ${w2} marbles to all the marbles?` : `What is the ratio of ${w1} marbles to ${w2} marbles?`,
      visual: { kind: "marbles", marbles },
      needsVisual: true,
      ...label(right, [`${s}:${r}`, `${r}:${s}`, `${r}:${r + s}`, `${s}:${r + s}`, `${r + s}:${s}`]),
      hint: all ? `Count the ${w2} marbles, then count every marble.` : `Count the ${w1} marbles first, then the ${w2} ones. Order matters!`,
      explain: all ? `${s} ${w2} out of ${r + s} marbles: ${s}:${r + s}.` : `${r} ${w1} to ${s} ${w2}: ${r}:${s}.`,
    };
  }
  const k = rand(2, 5);
  const [m, n] = kind === 2 ? coprimePair(1, 6) : coprimePair(2, 6);
  const [r, s] = [k * m, k * n];
  if (kind === 2) {
    const eq: Token[] = [r, ":", s, "=", m, ":", "?"];
    return {
      key: `rl-simp-${r}-${s}`,
      prompt: "Write the ratio in simplest form.",
      speech: talk(`Write ${r}:${s} in simplest form. ${m} to what?`),
      equation: eq,
      visual: NONE,
      ...keypad(n),
      hint: `Divide both numbers by the same number. What goes into ${r} and ${s}?`,
      explain: `Divide both by ${k}: ${r}:${s} = ${m}:${n}.`,
    };
  }
  const [a, b] = pick([["girls", "boys"], ["cats", "dogs"], ["red cars", "blue cars"], ["apples", "pears"]]);
  return {
    key: `rl-story-${r}-${s}-${a}`,
    prompt: `${r} ${a}, ${s} ${b}. For every ${m} ${a}, how many ${b}?`,
    speech: `There are ${r} ${a} and ${s} ${b}. For every ${m} ${a}, how many ${b} are there?`,
    equation: [r, ":", s, "=", m, ":", "?"],
    visual: NONE,
    ...keypad(n),
    hint: `Split both groups into ${k} equal teams.`,
    explain: `${r}:${s} = ${m}:${n}, so for every ${m} ${a} there are ${n} ${b}.`,
  };
}

const RATIO_ITEMS: [string, string][] = [["Lemons", "Cups of water"], ["Cups of flour", "Eggs"], ["Red paint", "White paint"], ["Laps", "Minutes"], ["Tickets", "Dollars"]];

/** 6.RP.A.3a — ratio tables, tape diagrams and graphs of equivalent ratios. */
export function ratioTables(): Question {
  const kind = rand(0, 3);
  const [a, b] = distinct(2, 1, 9);
  const [h1, h2] = pick(RATIO_ITEMS);
  if (kind === 0) {
    const k = rand(3, 10);
    const col = rand(0, 1);
    const rows: (number | string)[][] = [[a, b], [2 * a, 2 * b], col === 0 ? ["?", k * b] : [k * a, "?"]];
    const ans = col === 0 ? k * a : k * b;
    return {
      key: `rt-table-${a}-${b}-${k}-${col}-${h1}`,
      prompt: "Fill in the ratio table.",
      speech: `${h1.toLowerCase()} and ${h2.toLowerCase()} are in the ratio ${a} to ${b}. What number is missing in the table?`,
      visual: { kind: "table", header: [h1, h2], rows },
      needsVisual: true,
      ...keypad(ans),
      hint: `How many times bigger is the last row than the first? Multiply the other number by the same amount.`,
      explain: `${col === 0 ? k * b : k * a} is ${k} times ${col === 0 ? b : a}, so the missing number is ${k} × ${col === 0 ? a : b} = ${ans}.`,
    };
  }
  if (kind === 1) {
    const u = rand(2, 9);
    const [m, n] = coprimePair(1, 6);
    const [A, B] = pick([["boys", "girls"], ["red beads", "blue beads"], ["cats", "dogs"], ["juice", "water"]]);
    const total = (m + n) * u;
    return {
      key: `rt-tape-${m}-${n}-${u}-${A}`,
      prompt: `${A[0].toUpperCase()}${A.slice(1)} to ${B} is ${m}:${n}. ${total} in all. How many ${A}?`,
      speech: `The ratio of ${A} to ${B} is ${m} to ${n}. There are ${total} in all. How many ${A} are there?`,
      visual: { kind: "tape", rows: [{ label: A, parts: m }, { label: B, parts: n }] },
      ...keypad(m * u),
      hint: `There are ${m + n} equal parts in all. Find the size of one part first.`,
      explain: `${total} ÷ ${m + n} = ${u} in each part. ${A}: ${m} × ${u} = ${m * u}.`,
    };
  }
  if (kind === 2) {
    const r = rand(1, 3);
    const k = rand(4, Math.floor(10 / r) + 2);
    const pts = [1, 2, 3].map((x, i) => ({ x, y: x * r, label: "ABC"[i] }));
    return {
      key: `rt-graph-${r}-${k}`,
      prompt: "These points show one ratio. Which point also fits?",
      speech: `The points show the ratio 1 to ${r}. Which point also fits?`,
      visual: { kind: "grid", size: 10, quadrants: 1, points: pts },
      ...label(`(${k}, ${k * r})`, [`(${k}, ${k * r + 1})`, `(${k * r + 1}, ${k})`, `(${k}, ${k + r + 1})`, `(${k + 1}, ${k * r + 2})`]),
      hint: `In every point, the second number is ${r} times the first.`,
      explain: `${k} × ${r} = ${k * r}, so (${k}, ${k * r}) fits.`,
    };
  }
  const k = rand(2, 6);
  return {
    key: `rt-equiv-${a}-${b}-${k}`,
    prompt: `Which ratio is equivalent to ${a}:${b}?`,
    speech: talk(`Which ratio is equivalent to ${a}:${b}?`),
    visual: NONE,
    ...label(`${k * a}:${k * b}`, [`${a + k}:${b + k}`, `${k * a}:${k * b + 1}`, `${k * b}:${k * a}`, `${a + k}:${k * b}`]),
    hint: "Equivalent ratios multiply both numbers by the same number.",
    explain: `${a} × ${k} = ${k * a} and ${b} × ${k} = ${k * b}, so ${a}:${b} = ${k * a}:${k * b}.`,
  };
}

/** 6.RP.A.2, 6.RP.A.3b — unit rates, unit price and better buys. */
export function unitRates(): Question {
  const kind = rand(0, 4);
  const item = pick(["notebooks", "apples", "pens", "tickets", "muffins"]);
  if (kind === 0) {
    const U = pick([25, 50, 75, 125, 150, 175, 200, 250, 300, 350, 450]);
    const n = rand(2, 8);
    return {
      key: `ur-price-${U}-${n}-${item}`,
      prompt: `${n} ${item} cost ${money((n * U) / 100)}. How much for 1?`,
      speech: `${n} ${item} cost ${money((n * U) / 100)}. How much does 1 cost?`,
      visual: { kind: "table", header: [item, "Cost ($)"], rows: [[n, (n * U) / 100], [1, "?"]] },
      prefix: "$",
      ...keypad(sh(U, -2)),
      hint: `Divide the cost by ${n} to get the price for 1.`,
      explain: `${money((n * U) / 100)} ÷ ${n} = ${money(U / 100)} each.`,
    };
  }
  if (kind === 1) {
    const [what, per] = pick([["words", "minute"], ["pages", "day"], ["heartbeats", "minute"], ["liters", "minute"], ["points", "game"]]);
    const r = rand(4, 80);
    const m = rand(2, 6);
    return {
      key: `ur-rate-${what}-${r}-${m}`,
      prompt: `${r * m} ${what} in ${m} ${per}s. How many ${what} per ${per}?`,
      speech: `${r * m} ${what} in ${m} ${per}s. How many ${what} is that per ${per}?`,
      visual: NONE,
      ...keypad(r),
      hint: `A unit rate is the amount for 1 ${per}. Divide by ${m}.`,
      explain: `${r * m} ÷ ${m} = ${r} ${what} per ${per}.`,
    };
  }
  if (kind === 2) {
    const [u1, u2] = distinct(2, 2, 9);
    const [n1, n2] = [rand(2, 6), rand(2, 6)];
    const o1 = `${n1} for $${n1 * u1}`;
    const o2 = `${n2} for $${n2 * u2}`;
    const best = u1 < u2 ? o1 : o2;
    return {
      key: `ur-buy-${n1}-${u1}-${n2}-${u2}-${item}`,
      prompt: `${item[0].toUpperCase()}${item.slice(1)}: which is the better buy?`,
      speech: `Which is the better buy for ${item}: ${n1} for ${n1 * u1} dollars, or ${n2} for ${n2 * u2} dollars?`,
      visual: NONE,
      ...label(best, [best === o1 ? o2 : o1]),
      hint: "Find the price for 1 in each deal. Lower is better.",
      explain: `${o1} is $${u1} each. ${o2} is $${u2} each. ${best} is the better buy.`,
    };
  }
  if (kind === 3) {
    const u = rand(2, 12);
    const n = rand(2, 6);
    let m = rand(2, 12);
    while (m === n) m = rand(2, 12);
    return {
      key: `ur-use-${u}-${n}-${m}-${item}`,
      prompt: `${n} ${item} cost $${n * u}. How much for ${m}?`,
      speech: `${n} ${item} cost ${n * u} dollars. How much do ${m} cost?`,
      visual: { kind: "table", header: [item, "Cost ($)"], rows: [[n, n * u], [1, u], [m, "?"]] },
      prefix: "$",
      ...keypad(m * u),
      hint: "Find the cost of 1 first, then multiply.",
      explain: `$${n * u} ÷ ${n} = $${u} each. ${m} × $${u} = $${m * u}.`,
    };
  }
  let [a, b] = distinct(2, 1, 9);
  if (a % b === 0) a += 1;
  if (a === b) a += 1;
  return {
    key: `ur-frac-${a}-${b}`,
    prompt: `${a} cups of flour make ${b} cakes. Flour per cake?`,
    speech: `${a} cups of flour make ${b} cakes. How many cups of flour for each cake?`,
    visual: NONE,
    unit: "cups",
    ...label(fracStr(a, b), [fracStr(b, a), fracStr(a + 1, b), fracStr(a, b + 1), fracStr(1, b)]),
    hint: "The unit rate is cups ÷ cakes.",
    explain: `${a} ÷ ${b} = ${fracStr(a, b)} cup per cake.`,
  };
}

/** 6.RP.A.3b — constant speed: distance, rate and time. */
export function speedLevel(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const r = rand(4, 18) * 5;
    const t = rand(2, 6);
    return {
      key: `sp-rate-${r}-${t}`,
      prompt: `A car goes ${r * t} km in ${t} hours. Speed in km/h?`,
      speech: `A car goes ${r * t} kilometers in ${t} hours at a steady speed. What is its speed in kilometers per hour?`,
      visual: NONE,
      unit: "km/h",
      ...keypad(r),
      hint: "Speed = distance ÷ time.",
      explain: `${r * t} ÷ ${t} = ${r} km/h`,
    };
  }
  if (kind === 1) {
    const r = rand(5, 30) * 2;
    const T = rand(2, 9);
    const t = T / 2;
    return {
      key: `sp-dist-${r}-${T}`,
      prompt: `At ${r} km/h, how far do you go in ${ds(t)} hours?`,
      speech: `At ${r} kilometers per hour, how far do you go in ${ds(t)} hours?`,
      visual: { kind: "table", header: ["Hours", "Km"], rows: [[1, r], [0.5, r / 2], [t, "?"]] },
      unit: "km",
      ...keypad((r * T) / 2),
      hint: "Distance = speed × time. Half an hour is half the distance of 1 hour.",
      explain: `${r} × ${ds(t)} = ${(r * T) / 2} km`,
    };
  }
  if (kind === 2) {
    const r = rand(3, 16) * 5;
    const t = rand(2, 8);
    return {
      key: `sp-time-${r}-${t}`,
      prompt: `How many hours to go ${r * t} km at ${r} km/h?`,
      speech: `How many hours does it take to go ${r * t} kilometers at ${r} kilometers per hour?`,
      visual: NONE,
      unit: "h",
      ...keypad(t),
      hint: "Time = distance ÷ speed.",
      explain: `${r * t} ÷ ${r} = ${t} hours`,
    };
  }
  const v = rand(3, 9);
  const s = rand(4, 20);
  return {
    key: `sp-ms-${v}-${s}`,
    prompt: `A runner goes ${v * s} m in ${s} seconds. Meters per second?`,
    speech: `A runner goes ${v * s} meters in ${s} seconds at a steady speed. How many meters per second is that?`,
    visual: NONE,
    unit: "m/s",
    ...keypad(v),
    hint: "Divide the distance by the time.",
    explain: `${v * s} ÷ ${s} = ${v} m/s`,
  };
}

/** 6.RP.A.3d — convert units with ratio reasoning. */
export function ratioConversions(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const c = pick(CONV.filter((x) => x.f <= 100));
    const k = rand(2, 15);
    return {
      key: `rc-table-${c.big}-${k}`,
      prompt: `${k * c.f} ${c.small} is how many ${c.big}?`,
      speech: `${k * c.f} ${c.small} is how many ${c.big}?`,
      visual: { kind: "table", header: [c.big, c.small], rows: [[1, c.f], [2, 2 * c.f], ["?", k * c.f]] },
      unit: c.big,
      ...keypad(k),
      hint: `The ratio is 1 ${c.big} : ${c.f} ${c.small}. How many groups of ${c.f}?`,
      explain: `${k * c.f} ÷ ${c.f} = ${k} ${c.big}`,
    };
  }
  if (kind === 1) {
    const s = rand(0, 2);
    if (s === 0) {
      const k = rand(1, 12);
      return {
        key: `rc-mi-${k}`,
        prompt: `1 mile ≈ 1.6 km. About how many km is ${5 * k} miles?`,
        speech: `One mile is about 1.6 kilometers. About how many kilometers is ${5 * k} miles?`,
        visual: { kind: "table", header: ["Miles", "Km"], rows: [[5, 8], [5 * k, "?"]] },
        unit: "km",
        ...keypad(8 * k),
        hint: "5 miles is about 8 km. How many 5s are in the miles?",
        explain: `${5 * k} miles = ${k} × 5 miles ≈ ${k} × 8 = ${8 * k} km.`,
      };
    }
    const n = rand(2, 15);
    const [from, to, F] = s === 1 ? ["kg", "lb", 22] : ["gal", "L", 38];
    return {
      key: `rc-approx-${from}-${n}`,
      prompt: `1 ${from} ≈ ${ds(F / 10)} ${to}. About how many ${to} is ${n} ${from}?`,
      speech: `One ${from === "kg" ? "kilogram" : "gallon"} is about ${ds(F / 10)} ${to === "lb" ? "pounds" : "liters"}. About how many is ${n}?`,
      visual: NONE,
      unit: to,
      ...keypad(sh(F * n, -1)),
      hint: `Multiply ${n} by ${ds(F / 10)}.`,
      explain: `${n} × ${ds(F / 10)} = ${ds(sh(F * n, -1))} ${to}`,
    };
  }
  const s = rand(0, 3);
  const v = rand(2, 15);
  const bank: [string, number, string, string][] = [
    [`A tap drips ${v} mL a minute. How many mL in an hour?`, 60 * v, "mL", "1 hour = 60 minutes."],
    [`A snail crawls ${v} cm a minute. How many cm an hour?`, 60 * v, "cm", "1 hour = 60 minutes."],
    [`A plant grows ${v} cm a day. How many mm a day?`, 10 * v, "mm", "1 cm = 10 mm."],
    [`A pump moves ${v} L a second. How many L a minute?`, 60 * v, "L", "1 minute = 60 seconds."],
  ];
  const [t, ans, unit, hint] = bank[s];
  return {
    key: `rc-rate-${s}-${v}`,
    prompt: t,
    speech: talk(t),
    visual: NONE,
    unit,
    ...keypad(ans),
    hint,
    explain: `${hint} ${v} × ${ans / v} = ${ans} ${unit}.`,
  };
}

const UNIT_TIMES: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 3], [3, 4], [1, 5]];

/** 7.RP.A.1 — unit rates with fractions. */
export function fractionRates(): Question {
  const kind = rand(0, 3);
  const [c, d] = pick(UNIT_TIMES);
  if (kind === 0 || kind === 3) {
    const k = rand(2, 9);
    const dist = fracTok(k * c, d);
    const [thing, unit, per] = kind === 0 ? ["You walk", "mile", "hour"] : ["A snail crawls", "meter", "minute"];
    const t = `${thing} ${tokStr(dist)} ${unit}${(k * c) / d > 1 ? "s" : ""} in ${c}/${d} ${per}. ${unit[0].toUpperCase()}${unit.slice(1)}s per ${per}?`;
    return {
      key: `fr-${kind}-${k}-${c}/${d}`,
      prompt: t,
      speech: talk(t),
      equation: [dist, "÷", { n: c, d: d }, "=", "?"],
      visual: NONE,
      ...keypad(k),
      hint: `A unit rate is the amount in 1 whole ${per}. Divide by ${c}/${d}.`,
      explain: `${tokStr(dist)} ÷ ${c}/${d} = ${k * c}/${d} × ${d}/${c} = ${k} ${unit}s per ${per}.`,
    };
  }
  const [a, b] = properFrac(5);
  const t = kind === 1
    ? `You paint ${a}/${b} of a wall in ${c}/${d} hour. Walls per hour?`
    : `${a}/${b} cup of sugar makes ${c}/${d} of a batch. Cups per batch?`;
  return {
    key: `fr-${kind}-${a}/${b}-${c}/${d}`,
    prompt: t,
    speech: talk(t),
    equation: [{ n: a, d: b }, "÷", { n: c, d: d }, "=", "?"],
    visual: NONE,
    ...label(fracStr(a * d, b * c), [fracStr(a * c, b * d), fracStr(b * c, a * d), ...fracWrongs(a * d, b * c)]),
    hint: `Divide the amount by the ${kind === 1 ? "time" : "part of a batch"}: ${a}/${b} ÷ ${c}/${d}.`,
    explain: `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${fracStr(a * d, b * c)}`,
  };
}

const PROP_CTX: [string, string, string, string][] = [
  ["Pounds", "Cost ($)", "pound", "dollars"],
  ["Hours", "Pay ($)", "hour", "dollars"],
  ["Gallons", "Miles", "gallon", "miles"],
  ["Tickets", "Cost ($)", "ticket", "dollars"],
];

/** 7.RP.A.2a–d — proportional relationships in tables, equations and graphs. */
export function proportional(): Question {
  const kind = rand(0, 3);
  const xs = sorted(distinct(4, 1, 10));
  const k = rand(2, 9);
  const [hx, hy, unitX, unitY] = pick(PROP_CTX);
  if (kind === 0) {
    const t = rand(0, 2);
    const c = rand(1, 4);
    const ys = xs.map((x) => (t === 0 ? k * x : t === 1 ? k * x + c : x + c + k));
    const yes = t === 0;
    return {
      key: `pr-is-${t}-${k}-${c}-${xs.join(".")}`,
      prompt: "Is this relationship proportional?",
      speech: "Look at the table. Is y proportional to x?",
      visual: { kind: "table", header: ["x", "y"], rows: xs.map((x, i) => [x, ys[i]]) },
      needsVisual: true,
      ...label(yes ? "Yes" : "No", [yes ? "No" : "Yes"]),
      hint: "Divide each y by its x. Proportional means you get the same number every time.",
      explain: yes ? `y ÷ x is always ${k}, so it is proportional.` : `y ÷ x changes (${ds(ys[0] / xs[0])} then ${ds(ys[1] / xs[1])}), so it is not proportional.`,
    };
  }
  const rows = xs.slice(0, 3).map((x) => [x, k * x]);
  if (kind === 1) {
    return {
      key: `pr-k-${k}-${xs.join(".")}-${hx}`,
      prompt: `What is the constant of proportionality (y per x)?`,
      speech: `The table shows ${hx.toLowerCase()} and ${hy.replace(" ($)", "").toLowerCase()}. What is the constant of proportionality?`,
      visual: { kind: "table", header: [hx, hy], rows },
      needsVisual: true,
      ...keypad(k),
      hint: "Divide any y by its x. That's the amount for 1.",
      explain: `${rows[0][1]} ÷ ${rows[0][0]} = ${k}. Every row gives ${k}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `pr-eq-${k}-${xs.join(".")}`,
      prompt: "Which equation fits the table?",
      speech: "Which equation fits the table?",
      visual: { kind: "table", header: ["x", "y"], rows },
      needsVisual: true,
      ...label(`y = ${k}x`, [`y = x + ${k}`, `y = ${k + 1}x`, `x = ${k}y`, `y = ${k}x + 1`]),
      hint: "Find y ÷ x. A proportional equation looks like y = kx.",
      explain: `y ÷ x = ${k} in every row, so y = ${k}x.`,
    };
  }
  const r = rand(2, 5);
  const pts = [{ x: 1, y: r, label: "A" }, { x: 2, y: 2 * r, label: "B" }];
  return {
    key: `pr-pt-${r}-${unitX}`,
    prompt: `x = ${hx.toLowerCase()}, y = ${hy.replace(" ($)", "").toLowerCase()}. What does A mean?`,
    speech: `The graph shows ${hx.toLowerCase()} across and ${hy.replace(" ($)", "").toLowerCase()} up. What does point A at 1 comma ${r} mean?`,
    visual: { kind: "plot", x: [0, 6], y: [0, 6 * r], lines: [{ from: [0, 0], to: [6, 6 * r] }], points: pts },
    needsVisual: true,
    ...label(`1 ${unitX} → ${r} ${unitY}`, [`${r} ${unitX}s → 1 ${unitY.replace(/s$/, "")}`, `1 ${unitX} → ${2 * r} ${unitY}`, `${r} ${unitX}s → ${r} ${unitY}`]),
    hint: "A point (1, r) shows the unit rate: the y-value for 1 x.",
    explain: `A is (1, ${r}): 1 ${unitX} goes with ${r} ${unitY}. That's the unit rate.`,
  };
}

/* ========================================================= 6. Percents (G6–7) */

/** 6.RP.A.3c — percent means "per 100". */
export function percentGrid(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const n = rand(3, 97);
    const not = kind === 1;
    return {
      key: `pg-${not}-${n}`,
      prompt: not ? "What percent is NOT shaded?" : "What percent is shaded?",
      speech: not ? "What percent of the grid is not shaded?" : "What percent of the grid is shaded?",
      visual: { kind: "hundredgrid", shaded: n },
      needsVisual: true,
      unit: "%",
      ...keypad(not ? 100 - n : n),
      hint: not ? "The whole grid is 100%. Take away the shaded part." : "There are 100 squares. Count the shaded ones.",
      explain: not ? `${n} shaded, so ${100 - n} of 100 are not: ${100 - n}%.` : `${n} out of 100 = ${n}%.`,
    };
  }
  const b = pick([2, 4, 5, 10, 20, 25, 50]);
  const a = rand(1, b - 1);
  const pct = (a * 100) / b;
  const eq: Token[] = [a, "÷", b, "=", "?", "%"];
  if (kind === 2) {
    return {
      key: `pg-of-${a}-${b}`,
      prompt: `What percent is ${a} out of ${b}?`,
      speech: `What percent is ${a} out of ${b}?`,
      equation: eq,
      visual: { kind: "hundredgrid", shaded: pct },
      ...keypad(pct),
      hint: `Make it out of 100: multiply top and bottom by ${100 / b}.`,
      explain: `${a}/${b} = ${pct}/100 = ${pct}%`,
    };
  }
  const who = pick(["students walk to school", "seeds sprouted", "shots went in", "tickets were sold"]);
  return {
    key: `pg-story-${a}-${b}-${who}`,
    prompt: `${a} of ${b} ${who}. What percent is that?`,
    speech: `${a} out of ${b} ${who}. What percent is that?`,
    visual: NONE,
    unit: "%",
    ...keypad(pct),
    hint: `Percent means out of 100. ${b} × ${100 / b} = 100.`,
    explain: `${a}/${b} = ${pct}/100 = ${pct}%`,
  };
}

const END_DENS = [2, 4, 5, 8, 10, 20, 25, 40, 50];

/** 6.RP.A.3c, 7.NS.A.2d — fractions, decimals and percents; decimals that end or repeat. */
export function fracDecPct(): Question {
  const kind = rand(0, 5);
  let b = pick(END_DENS);
  let a = rand(1, b - 1);
  const g = gcd(a, b);
  [a, b] = [a / g, b / g];
  if (kind === 0) {
    const eq: Token[] = [{ n: a, d: b }, "=", "?", "%"];
    return {
      key: `fdp-fp-${a}/${b}`,
      prompt: "Write the fraction as a percent.",
      speech: talk(`Write ${a}/${b} as a percent.`),
      equation: eq,
      visual: NONE,
      ...keypad((a * 100) / b),
      hint: "Percent means out of 100. Divide top by bottom, then multiply by 100.",
      explain: `${a} ÷ ${b} = ${ds(a / b)} = ${ds((a * 100) / b)}%`,
    };
  }
  if (kind === 1) {
    const eq: Token[] = [{ n: a, d: b }, "=", "?"];
    return {
      key: `fdp-fd-${a}/${b}`,
      prompt: "Write the fraction as a decimal.",
      speech: talk(`Write ${a}/${b} as a decimal.`),
      equation: eq,
      visual: NONE,
      ...keypad(a / b),
      hint: `A fraction is a division: ${a} ÷ ${b}.`,
      explain: `${a} ÷ ${b} = ${ds(a / b)}`,
    };
  }
  if (kind === 2) {
    const p = pick([rand(1, 99), rand(1, 99), rand(101, 250)]);
    const eq: Token[] = [p, "%", "=", "?"];
    return {
      key: `fdp-pd-${p}`,
      prompt: "Write the percent as a decimal.",
      speech: `Write ${p} percent as a decimal.`,
      equation: eq,
      visual: p <= 100 ? { kind: "hundredgrid", shaded: p } : NONE,
      ...keypad(sh(p, -2)),
      hint: "Percent means hundredths. Divide by 100: move the point 2 places left.",
      explain: `${p}% = ${p}/100 = ${ds(sh(p, -2))}`,
    };
  }
  if (kind === 3) {
    return {
      key: `fdp-df-${a}/${b}`,
      prompt: `Write ${ds(a / b)} as a fraction in simplest form.`,
      speech: `Write ${ds(a / b)} as a fraction in simplest form.`,
      visual: NONE,
      ...label(fracStr(a, b), [fracStr(a + 1, b), fracStr(a, b + 1), fracStr(b - a, b), fracStr(b, a * 10)]),
      hint: "Read the decimal as tenths, hundredths or thousandths. Then simplify.",
      explain: `${ds(a / b)} = ${fracStr(a, b)}`,
    };
  }
  if (kind === 4) {
    const ends = rand(0, 1) === 1;
    let d = pick(ends ? [4, 8, 16, 20, 25, 40] : [3, 6, 7, 9, 11, 12, 15]);
    let n = rand(1, d - 1);
    const h = gcd(n, d);
    [n, d] = [n / h, d / h];
    const term = [2, 5].reduce((x, p) => {
      while (x % p === 0) x /= p;
      return x;
    }, d) === 1;
    return {
      key: `fdp-end-${n}/${d}`,
      prompt: `As a decimal, does ${n}/${d} end or repeat?`,
      speech: talk(`When you write ${n}/${d} as a decimal, does it end or repeat?`),
      visual: NONE,
      ...label(term ? "It ends" : "It repeats", [term ? "It repeats" : "It ends"]),
      hint: "Divide the top by the bottom. Does the remainder ever become 0?",
      explain: term ? `${n} ÷ ${d} = ${ds(n / d)}. It ends.` : `${n} ÷ ${d} = ${String(n / d).slice(0, 7)}… The digits repeat forever.`,
    };
  }
  const d = pick([3, 6, 9, 11]);
  let n = rand(1, d - 1);
  while (gcd(n, d) !== 1) n = rand(1, d - 1);
  let r = n;
  let digits = "";
  for (let i = 0; i < 4; i++) {
    r *= 10;
    digits += Math.floor(r / d);
    r %= d;
  }
  return {
    key: `fdp-rep-${n}/${d}`,
    prompt: `Which decimal equals ${n}/${d}?`,
    speech: talk(`Which decimal equals ${n}/${d}?`),
    visual: NONE,
    ...label(`0.${digits}…`, [`0.${n}${d}`, `0.${digits[0]}`, `0.${d}${n}`, `0.${digits.slice(0, 2)}`]),
    hint: `Divide ${n} by ${d}. Keep going: notice the digits repeat.`,
    explain: `${n} ÷ ${d} = 0.${digits}… and the pattern keeps repeating.`,
  };
}

const PCTS = [10, 20, 25, 50, 75, 5, 15, 30, 40, 60, 80, 90, 1, 2, 12, 35];

function percentPair(maxN = 400): [number, number] {
  const p = pick(PCTS);
  const step = 100 / gcd(p, 100);
  let N = step * rand(1, Math.max(1, Math.floor(maxN / step)));
  if (N < 8) N = step * rand(2, 6);
  return [p, N];
}

/** 6.RP.A.3c — find a percent of a number. */
export function percentOf(): Question {
  const [p, N] = percentPair();
  const ans = (p * N) / 100;
  const hint = `${p}% means ${p} out of every 100. Find 10% or 1% first if that helps.`;
  const explain = `${p}% of ${N} = ${p}/100 × ${N} = ${ans}`;
  if (rand(0, 2) > 0) {
    const eq: Token[] = [p, "%", "of", N, "=", "?"];
    return { key: `po-${p}-${N}`, prompt: pick(["Find the percent of the number.", `What is ${p}% of ${N}?`]), speech: `What is ${p} percent of ${N}?`, equation: eq, visual: NONE, ...keypad(ans), hint, explain };
  }
  const s = rand(0, 2);
  const t = [
    `${p}% of ${N} students walk to school. How many walk?`,
    `A ${N} g snack bar is ${p}% sugar. How many grams of sugar?`,
    `You got ${p}% of ${N} questions right. How many is that?`,
  ][s];
  return { key: `po-story-${s}-${p}-${N}`, prompt: t, speech: talk(t), visual: NONE, ...keypad(ans), hint, explain };
}

/** 6.RP.A.3c — find the whole from a part and a percent. */
export function findWhole(): Question {
  let [p, W] = percentPair(300);
  while (p < 5) [p, W] = percentPair(300);
  const part = (p * W) / 100;
  const kind = rand(0, 2);
  const explain = `${part} is ${p}%, so 1% is ${ds(part / p)} and 100% is ${W}.`;
  const hint = `If ${p}% is ${part}, what is 1%? Or what is 10%? Then build up to 100%.`;
  if (kind === 0) {
    const eq: Token[] = [p, "%", "of", "?", "=", part];
    return { key: `fw-${p}-${W}`, prompt: "Find the whole.", speech: `${part} is ${p} percent of what number?`, equation: eq, visual: NONE, ...keypad(W), hint, explain };
  }
  if (kind === 1) {
    const eq: Token[] = ["?", "%", "of", W, "=", part];
    return {
      key: `fw-pct-${p}-${W}`,
      prompt: `${part} is what percent of ${W}?`,
      speech: `${part} is what percent of ${W}?`,
      equation: eq,
      visual: NONE,
      ...keypad(p),
      hint: `Divide the part by the whole, then multiply by 100.`,
      explain: `${part} ÷ ${W} = ${ds(part / W)} = ${p}%`,
    };
  }
  const s = rand(0, 2);
  const t = [
    `You've read ${part} pages. That's ${p}% of the book. How many pages?`,
    `${part} kids is ${p}% of the class. How many kids in all?`,
    `You saved $${part}. That's ${p}% of the price. What's the price?`,
  ][s];
  return { key: `fw-story-${s}-${p}-${W}`, prompt: t, speech: talk(t), visual: NONE, ...keypad(W), hint, explain };
}

/** 7.RP.A.3 — tax, tips, commission, markup and simple interest. */
export function taxTip(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const m = rand(10, 80);
    const p = pick([10, 15, 18, 20, 25]);
    return {
      key: `tt-tip-${m}-${p}`,
      prompt: `A meal costs $${m}. You tip ${p}%. How much is the tip?`,
      speech: `A meal costs ${m} dollars. You leave a ${p} percent tip. How much is the tip?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(m * p, -2)),
      hint: `Find 10% of $${m} first (move the point one place left).`,
      explain: `${p}% of $${m} = ${p}/100 × ${m} = ${money(sh(m * p, -2))}`,
    };
  }
  if (kind === 1) {
    const m = rand(5, 60);
    const t = pick([5, 6, 8, 10]);
    return {
      key: `tt-tax-${m}-${t}`,
      prompt: `A $${m} game has ${t}% sales tax. Total cost?`,
      speech: `A game costs ${m} dollars, plus ${t} percent sales tax. What is the total cost?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(m * (100 + t), -2)),
      hint: `Find the tax, then add it to $${m}. Or multiply by 1.${String(t).padStart(2, "0")}.`,
      explain: `Tax: ${t}% of $${m} = ${money(sh(m * t, -2))}. Total: ${money(sh(m * (100 + t), -2))}.`,
    };
  }
  if (kind === 2) {
    const m = rand(4, 40) * 25;
    const p = pick([2, 3, 4, 5, 10]);
    return {
      key: `tt-comm-${m}-${p}`,
      prompt: `She sells a $${m} bike and earns ${p}% commission. How much?`,
      speech: `She sells a ${m} dollar bike and earns ${p} percent commission. How much does she earn?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(m * p, -2)),
      hint: `Find 1% of $${m}, then multiply by ${p}.`,
      explain: `${p}% of $${m} = ${money(sh(m * p, -2))}`,
    };
  }
  if (kind === 3) {
    const P = rand(1, 10) * 100;
    const r = rand(2, 6);
    const y = rand(1, 5);
    return {
      key: `tt-int-${P}-${r}-${y}`,
      prompt: `$${P} earns ${r}% simple interest a year. Interest after ${y} years?`,
      speech: `${P} dollars earns ${r} percent simple interest each year. How much interest after ${y} year${y > 1 ? "s" : ""}?`,
      visual: NONE,
      prefix: "$",
      ...keypad((P * r * y) / 100),
      hint: `Find one year's interest (${r}% of $${P}), then multiply by ${y}.`,
      explain: `${r}% of $${P} = $${(P * r) / 100} a year. × ${y} = $${(P * r * y) / 100}.`,
    };
  }
  const c = rand(4, 40);
  const p = pick([20, 25, 40, 50, 75, 100]);
  return {
    key: `tt-mark-${c}-${p}`,
    prompt: `A store buys a hat for $${c} and marks it up ${p}%. Price?`,
    speech: `A store buys a hat for ${c} dollars and marks it up ${p} percent. What is the new price?`,
    visual: NONE,
    prefix: "$",
    ...keypad(sh(c * (100 + p), -2)),
    hint: `Find ${p}% of $${c}, then add it on.`,
    explain: `${p}% of $${c} = ${money(sh(c * p, -2))}. $${c} + ${money(sh(c * p, -2))} = ${money(sh(c * (100 + p), -2))}.`,
  };
}

/** 7.RP.A.3 — discounts and sale prices. */
export function discounts(): Question {
  const kind = rand(0, 3);
  const P = rand(1, 10) * 20 + pick([0, 0, 5, 10]);
  const d = pick([10, 20, 25, 30, 40, 50, 15]);
  const item = pick(["jacket", "bike", "game", "pair of shoes", "backpack"]);
  if (kind <= 1) {
    const save = kind === 1;
    return {
      key: `dc-${save}-${P}-${d}-${item}`,
      prompt: save ? `A $${P} ${item} is ${d}% off. How much do you save?` : `A $${P} ${item} is ${d}% off. What's the sale price?`,
      speech: `A ${P} dollar ${item} is ${d} percent off. ${save ? "How much do you save?" : "What is the sale price?"}`,
      visual: NONE,
      prefix: "$",
      ...keypad(save ? sh(P * d, -2) : sh(P * (100 - d), -2)),
      hint: save ? `Find ${d}% of $${P}.` : `Find ${d}% of $${P} and take it away. Or find ${100 - d}% of $${P}.`,
      explain: `${d}% of $${P} = ${money(sh(P * d, -2))}.${save ? "" : ` $${P} − ${money(sh(P * d, -2))} = ${money(sh(P * (100 - d), -2))}.`}`,
    };
  }
  if (kind === 2) {
    const O = rand(1, 10) * 20;
    const dd = pick([10, 20, 25, 30, 40, 50, 75]);
    const S = (O * (100 - dd)) / 100;
    return {
      key: `dc-orig-${O}-${dd}`,
      prompt: `On sale for $${S} after ${dd}% off. Original price?`,
      speech: `A ${item} is on sale for ${S} dollars after ${dd} percent off. What was the original price?`,
      visual: { kind: "tape", rows: [{ label: "Price", parts: 100 / gcd(dd, 100) }] },
      prefix: "$",
      ...keypad(O),
      hint: `$${S} is ${100 - dd}% of the original price. Find 1% (or 10%) first.`,
      explain: `$${S} is ${100 - dd}%. ${S} ÷ ${(100 - dd) / 100} = $${O}.`,
    };
  }
  let [P1, P2] = [rand(2, 10) * 10, rand(2, 10) * 10];
  let [d1, d2] = [pick([10, 20, 25, 30, 50]), pick([10, 20, 25, 30, 50])];
  while (P1 * (100 - d1) === P2 * (100 - d2) || (P1 === P2 && d1 === d2)) [P1, d1] = [rand(2, 10) * 10, pick([10, 20, 25, 30, 50])];
  const o1 = `$${P1} at ${d1}% off`;
  const o2 = `$${P2} at ${d2}% off`;
  const cheap = P1 * (100 - d1) < P2 * (100 - d2) ? o1 : o2;
  return {
    key: `dc-deal-${P1}-${d1}-${P2}-${d2}`,
    prompt: "Which costs less?",
    speech: `Which costs less: ${P1} dollars at ${d1} percent off, or ${P2} dollars at ${d2} percent off?`,
    visual: NONE,
    ...label(cheap, [cheap === o1 ? o2 : o1]),
    hint: "Work out each sale price, then compare.",
    explain: `${o1} = ${money(sh(P1 * (100 - d1), -2))}. ${o2} = ${money(sh(P2 * (100 - d2), -2))}. ${cheap} costs less.`,
  };
}

/** 7.RP.A.3 — percent increase, decrease and percent error. */
export function percentChange(): Question {
  const kind = rand(0, 3);
  const bases = [20, 25, 40, 50, 60, 80, 100, 120, 200, 150];
  const pcts = [5, 10, 15, 20, 25, 50, 75];
  let a = pick(bases);
  let p = pick(pcts);
  while ((a * p) % 100 !== 0) [a, p] = [pick(bases), pick(pcts)];
  const ch = (a * p) / 100;
  if (kind <= 1) {
    const up = kind === 0;
    const b = up ? a + ch : a - ch;
    return {
      key: `pc-${up}-${a}-${p}`,
      prompt: `A price went from $${a} to $${b}. Percent ${up ? "increase" : "decrease"}?`,
      speech: `A price went from ${a} dollars to ${b} dollars. What is the percent ${up ? "increase" : "decrease"}?`,
      visual: NONE,
      unit: "%",
      ...keypad(p),
      hint: "Percent change = change ÷ original price × 100.",
      explain: `Change: $${ch}. ${ch} ÷ ${a} = ${ds(ch / a)} = ${p}%.`,
    };
  }
  if (kind === 2) {
    const up = rand(0, 1) === 1;
    return {
      key: `pc-apply-${up}-${a}-${p}`,
      prompt: `${up ? "Increase" : "Decrease"} ${a} by ${p}%.`,
      speech: `${up ? "Increase" : "Decrease"} ${a} by ${p} percent. What do you get?`,
      visual: NONE,
      ...keypad(up ? a + ch : a - ch),
      hint: `Find ${p}% of ${a}, then ${up ? "add it" : "take it away"}.`,
      explain: `${p}% of ${a} = ${ch}. ${a} ${up ? "+" : "−"} ${ch} = ${up ? a + ch : a - ch}.`,
    };
  }
  const e = pick([5, 10, 20, 25]);
  let A = pick([20, 40, 60, 80, 100, 200, 120]);
  while ((A * e) % 100 !== 0) A = pick([20, 40, 60, 80, 100, 200, 120]);
  const off = (A * e) / 100;
  const guess = rand(0, 1) ? A + off : A - off;
  return {
    key: `pc-err-${A}-${guess}`,
    prompt: `You guessed ${guess} beans. There were ${A}. Percent error?`,
    speech: `You guessed ${guess} jelly beans. There were really ${A}. What is your percent error?`,
    visual: NONE,
    unit: "%",
    ...keypad(e),
    hint: "Percent error = how far off ÷ the real amount × 100.",
    explain: `You were off by ${off}. ${off} ÷ ${A} = ${ds(off / A)} = ${e}%.`,
  };
}

/* ===================================================== 7. Negative numbers (G6–7) */

/** 6.NS.C.5, 6.NS.C.6c — negative numbers in real life and on a number line. */
export function negativesReal(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const n = rand(2, 60);
    const bank: [string, number][] = [
      [`It's ${n} degrees below zero.`, -n],
      [`A diver is ${n} m below sea level.`, -n],
      [`You owe $${n}.`, -n],
      [`A plane is ${n * 10} m above sea level.`, n * 10],
      [`You put $${n} in the bank.`, n],
      [`A team lost ${n} yards.`, -n],
      [`It's ${n} degrees above zero.`, n],
      [`A submarine is ${n} m below the surface.`, -n],
      [`You gained ${n} points.`, n],
      [`A store lost $${n}.`, -n],
    ];
    const i = rand(0, bank.length - 1);
    const [t, v] = bank[i];
    return {
      key: `nr-ctx-${i}-${n}`,
      prompt: `${t} Write it as a number.`,
      speech: `${t} Write it as a positive or negative number.`,
      visual: NONE,
      ...signed(v),
      hint: "Below zero, owing, losing: negative. Above zero, earning, gaining: positive.",
      explain: `${t} That's ${fmt(v)}.`,
    };
  }
  if (kind === 1) {
    const v = rand(-10, 10);
    return {
      key: `nr-line-${v}`,
      prompt: "What number is marked on the line?",
      speech: "What number is marked on the number line?",
      visual: { kind: "numberline", min: -10, max: 10, step: 1, labelStep: 5, from: v, to: v, hideFrom: true },
      needsVisual: true,
      ...signed(v),
      hint: "Left of 0 means negative. Count the steps from 0.",
      explain: `The mark is ${Math.abs(v)} step${Math.abs(v) === 1 ? "" : "s"} ${v < 0 ? "left" : "right"} of 0: ${fmt(v)}.`,
    };
  }
  let H = rand(-10, 10);
  if (H % 2 === 0) H += 1;
  const v = H / 2;
  return {
    key: `nr-half-${H}`,
    prompt: "What number is marked on the line?",
    speech: "What number is marked on the number line? Each tick is one half.",
    visual: { kind: "numberline", min: -5, max: 5, step: 0.5, labelStep: 1, from: v, to: v, hideFrom: true },
    needsVisual: true,
    ...choose(v, [-v, v - 1, v + 1, v - 0.5, v + 0.5], 0.5),
    hint: "Each small tick is a half. Is the mark left or right of 0?",
    explain: `The mark is halfway between ${fmt(Math.floor(v))} and ${fmt(Math.ceil(v))}: ${ds(v)}.`,
  };
}

/** 6.NS.C.6a, 6.NS.C.7c, 6.NS.C.7d — opposites and absolute value. */
export function opposites(): Question {
  const kind = rand(0, 4);
  const n = rand(1, 50) * (rand(0, 1) ? 1 : -1);
  if (kind === 0) {
    return {
      key: `op-opp-${n}`,
      prompt: `What is the opposite of ${fmt(n)}?`,
      speech: `What is the opposite of ${n < 0 ? `negative ${-n}` : n}?`,
      visual: NONE,
      ...signed(-n),
      hint: "Opposites are the same distance from 0, on different sides.",
      explain: `${fmt(n)} and ${fmt(-n)} are both ${Math.abs(n)} from 0.`,
    };
  }
  if (kind === 1) {
    const m = -Math.abs(n);
    const eq: Token[] = ["−", "(", m, ")", "=", "?"];
    return {
      key: `op-oo-${m}`,
      prompt: "The opposite of a negative number is…?",
      speech: `What is the opposite of negative ${-m}?`,
      equation: eq,
      visual: NONE,
      ...signed(-m),
      hint: "The minus sign in front means 'the opposite of'.",
      explain: `−(${fmt(m)}) is the opposite of ${fmt(m)}, which is ${-m}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `op-abs-${n}`,
      prompt: `What is |${fmt(n)}|?`,
      speech: `What is the absolute value of ${n < 0 ? `negative ${-n}` : n}?`,
      visual: NONE,
      ...keypad(Math.abs(n)),
      hint: "Absolute value is the distance from 0. Distance is never negative.",
      explain: `${fmt(n)} is ${Math.abs(n)} away from 0, so |${fmt(n)}| = ${Math.abs(n)}.`,
    };
  }
  if (kind === 3) {
    const [a, b] = distinct(2, 5, 90);
    const big = Math.max(a, b);
    const q = rand(0, 1) === 1;
    return {
      key: `op-debt-${a}-${b}-${q}`,
      prompt: q ? `Balances: −$${a} and −$${b}. Which is the bigger debt?` : `Balances: −$${a} and −$${b}. Which is less?`,
      speech: `Two account balances: negative ${a} dollars and negative ${b} dollars. ${q ? "Which shows the bigger debt?" : "Which balance is less?"}`,
      visual: NONE,
      ...label(`−$${big}`, [`−$${Math.min(a, b)}`]),
      hint: "A balance of −$30 means you owe $30. The more you owe, the further below 0.",
      explain: `|−${big}| = ${big} is the bigger debt, and −${big} < −${Math.min(a, b)}.`,
    };
  }
  const [a, b] = distinct(2, -20, 20).map((v) => v || 21);
  if (Math.abs(a) === Math.abs(b)) return opposites();
  const far = Math.abs(a) > Math.abs(b) ? a : b;
  return {
    key: `op-far-${a}-${b}`,
    prompt: `Which is farther from 0: ${fmt(a)} or ${fmt(b)}?`,
    speech: talk(`Which is farther from 0: ${fmt(a)} or ${fmt(b)}?`),
    visual: NONE,
    ...label(fmt(far), [fmt(far === a ? b : a)]),
    hint: "Compare absolute values: the distance from 0, ignoring the sign.",
    explain: `|${fmt(a)}| = ${Math.abs(a)} and |${fmt(b)}| = ${Math.abs(b)}, so ${fmt(far)} is farther.`,
  };
}

/** 6.NS.C.7a, 6.NS.C.7b — compare and order signed numbers. */
export function compareOrder(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [a, b] = distinct(2, -20, 15);
    if (a >= 0 && b >= 0) return compareOrder();
    const sign = a < b ? "<" : ">";
    return {
      key: `co-sign-${a}-${b}`,
      prompt: pick(["Which sign goes in the box?", "Is it <, > or =?"]),
      speech: talk(`Compare ${fmt(a)} and ${fmt(b)}. Less than, greater than or equal?`),
      equation: [a, "?", b],
      visual: { kind: "numberline", min: -20, max: 20, step: 1, labelStep: 5, from: a, to: a },
      ...label(sign, ["<", ">", "="].filter((s) => s !== sign)),
      hint: "On a number line, numbers to the left are smaller.",
      explain: `${fmt(a)} is to the ${a < b ? "left" : "right"} of ${fmt(b)}, so ${fmt(a)} ${sign} ${fmt(b)}.`,
    };
  }
  if (kind === 1) {
    const [a, b] = distinct(2, -25, 5);
    const cold = Math.min(a, b);
    return {
      key: `co-cold-${a}-${b}`,
      prompt: `Which is colder: ${fmt(a)} °C or ${fmt(b)} °C?`,
      speech: talk(`Which is colder: ${fmt(a)} degrees or ${fmt(b)} degrees?`),
      visual: NONE,
      ...label(`${fmt(cold)} °C`, [`${fmt(Math.max(a, b))} °C`]),
      hint: "Colder means lower on the thermometer: further left on the number line.",
      explain: `${fmt(cold)} < ${fmt(Math.max(a, b))}, so ${fmt(cold)} °C is colder.`,
    };
  }
  const vals = distinct(4, -12, 12);
  if (vals.filter((v) => v < 0).length < 2) return compareOrder();
  if (kind === 2) {
    const asc = sorted(vals);
    const byAbs = [...vals].sort((x, y) => Math.abs(x) - Math.abs(y) || x - y);
    const negWrong = [...asc.filter((v) => v < 0).reverse(), ...asc.filter((v) => v >= 0)];
    const txt = (xs: number[]) => xs.map(fmt).join(", ");
    return {
      key: `co-order-${asc.join(".")}`,
      prompt: "Which list goes from least to greatest?",
      speech: talk(`Which list puts ${vals.map(fmt).join(", ")} in order from least to greatest?`),
      visual: NONE,
      ...label(txt(asc), [txt(byAbs), txt([...asc].reverse()), txt(negWrong), txt([asc[1], asc[0], ...asc.slice(2)]), txt([asc[0], asc[2], asc[1], asc[3]])]),
      hint: "The negative number farthest from 0 is the least.",
      explain: `On the number line: ${asc.map(fmt).join(" < ")}.`,
    };
  }
  if (kind === 3) {
    const least = Math.min(...vals);
    return {
      key: `co-least-${sorted(vals).join(".")}`,
      prompt: "Which number is the least?",
      speech: "Which number is the least?",
      visual: NONE,
      answer: least,
      input: "choices",
      choices: shuffle(vals),
      hint: "Look for the negative number farthest from 0.",
      explain: `In order: ${sorted(vals).map(fmt).join(" < ")}.`,
    };
  }
  const [a, b] = distinct(2, -30, -1);
  const deep = rand(0, 1) === 1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return {
    key: `co-mean-${a}-${b}-${deep}`,
    prompt: deep ? `${fmt(lo)} m < ${fmt(hi)} m. What does this mean?` : `${fmt(hi)} °C > ${fmt(lo)} °C. What does this mean?`,
    speech: talk(deep ? `${fmt(lo)} meters < ${fmt(hi)} meters below sea level. What does this mean?` : `${fmt(hi)} °C > ${fmt(lo)} °C. What does this mean?`),
    visual: NONE,
    ...(deep
      ? label(`${fmt(lo)} m is deeper`, [`${fmt(hi)} m is deeper`, "They are the same depth"])
      : label(`${fmt(hi)} °C is warmer`, [`${fmt(hi)} °C is colder`, "They are the same"])),
    hint: deep ? "Lower elevation means deeper under the sea." : "Greater temperature means warmer.",
    explain: deep ? `${fmt(lo)} is less than ${fmt(hi)}, so it is further below sea level: deeper.` : `${fmt(hi)} is greater, so it is warmer.`,
  };
}

const QUAD_NAME = (x: number, y: number) => (x > 0 ? (y > 0 ? "I" : "IV") : y > 0 ? "II" : "III");
const nz6 = () => (rand(0, 1) ? 1 : -1) * rand(1, 6);

/** 6.NS.C.6b, 6.NS.C.6c — points in all four quadrants; reflections. */
export function fourQuadrants(): Question {
  const kind = rand(0, 3);
  const x = nz6();
  const y = nz6();
  if (kind === 0) {
    return {
      key: `fq-read-${x}-${y}`,
      prompt: "What are the coordinates of point A?",
      speech: "What are the coordinates of point A? Across first, then up or down.",
      visual: { kind: "grid", size: 6, quadrants: 4, points: [{ x, y, label: "A" }] },
      needsVisual: true,
      ...label(pt(x, y), [pt(y, x), pt(-x, y), pt(x, -y), pt(-x, -y)]),
      hint: "Left of the y-axis is negative x. Below the x-axis is negative y.",
      explain: `A is ${Math.abs(x)} ${x < 0 ? "left" : "right"} and ${Math.abs(y)} ${y < 0 ? "down" : "up"}: ${pt(x, y)}.`,
    };
  }
  if (kind === 1) {
    const q = QUAD_NAME(x, y);
    return {
      key: `fq-quad-${x}-${y}`,
      prompt: `Which quadrant is ${pt(x, y)} in?`,
      speech: talk(`Which quadrant is the point ${fmt(x)} comma ${fmt(y)} in?`),
      visual: NONE,
      ...label(q, ["I", "II", "III", "IV"].filter((s) => s !== q), true),
      hint: "Quadrant I is top right (+, +). Go counterclockwise: II, III, IV.",
      explain: `x is ${x > 0 ? "positive" : "negative"} and y is ${y > 0 ? "positive" : "negative"}, so it's in quadrant ${q}.`,
    };
  }
  if (kind === 2) {
    const overX = rand(0, 1) === 1;
    const right = overX ? pt(x, -y) : pt(-x, y);
    return {
      key: `fq-refl-${x}-${y}-${overX}`,
      prompt: `Reflect ${pt(x, y)} across the ${overX ? "x" : "y"}-axis. Where does it land?`,
      speech: talk(`Reflect the point ${fmt(x)} comma ${fmt(y)} across the ${overX ? "x" : "y"} axis. Where does it land?`),
      visual: { kind: "grid", size: 6, quadrants: 4, points: [{ x, y, label: "A" }] },
      ...label(right, [overX ? pt(-x, y) : pt(x, -y), pt(-x, -y), pt(y, x)]),
      hint: overX ? "Flipping over the x-axis changes the sign of y." : "Flipping over the y-axis changes the sign of x.",
      explain: `Across the ${overX ? "x" : "y"}-axis, ${overX ? "y" : "x"} changes sign: ${right}.`,
    };
  }
  const q = pick(["I", "II", "III", "IV"]);
  const signs: Record<string, string> = { I: "(+, +)", II: "(−, +)", III: "(−, −)", IV: "(+, −)" };
  return {
    key: `fq-signs-${q}`,
    prompt: `A point is in quadrant ${q}. What are the signs?`,
    speech: `A point is in quadrant ${q}. What are the signs of its coordinates?`,
    visual: NONE,
    ...label(signs[q], Object.values(signs).filter((s) => s !== signs[q]), true),
    hint: "Quadrant I is top right (+, +). Go counterclockwise: II, III, IV.",
    explain: `Quadrant ${q} has signs ${signs[q]}.`,
  };
}

/** 6.NS.C.8, 6.G.A.3 — distances on the coordinate plane; polygons from coordinates. */
export function gridDistance(): Question {
  const kind = rand(0, 4);
  const [x1, x2] = sorted(distinct(2, -6, 6));
  const [y1, y2] = sorted(distinct(2, -6, 6));
  if (kind <= 1) {
    const flat = kind === 0;
    const c = rand(-5, 5);
    const P = flat ? { x: x1, y: c } : { x: c, y: y1 };
    const Q = flat ? { x: x2, y: c } : { x: c, y: y2 };
    const dist = flat ? x2 - x1 : y2 - y1;
    const [lo, hi] = flat ? [x1, x2] : [y1, y2];
    return {
      key: `gd-${flat}-${lo}-${hi}-${c}`,
      prompt: `How far is A${pt(P.x, P.y)} from B${pt(Q.x, Q.y)}?`,
      speech: talk(`How far apart are A at ${fmt(P.x)} comma ${fmt(P.y)} and B at ${fmt(Q.x)} comma ${fmt(Q.y)}?`),
      visual: { kind: "grid", size: 6, quadrants: 4, points: [{ ...P, label: "A" }, { ...Q, label: "B" }] },
      unit: "units",
      ...keypad(dist),
      hint: lo < 0 && hi > 0 ? "The points are on opposite sides of an axis: add their distances from the axis." : "Only one coordinate changes. Subtract.",
      explain: lo < 0 && hi > 0 ? `${Math.abs(lo)} + ${hi} = ${dist} units.` : `|${fmt(hi)} − ${lo < 0 ? `(${fmt(lo)})` : lo}| = ${dist} units.`,
    };
  }
  const w = x2 - x1;
  const h = y2 - y1;
  const pts = [
    { x: x1, y: y1, label: "A" },
    { x: x2, y: y1, label: "B" },
    { x: x2, y: y2, label: "C" },
    { x: x1, y: y2, label: "D" },
  ];
  if (kind === 4) {
    return {
      key: `gd-vertex-${x1}-${x2}-${y1}-${y2}`,
      prompt: `Rectangle ABCD: A${pt(x1, y1)}, B${pt(x2, y1)}, C${pt(x2, y2)}. Where is D?`,
      speech: talk(`Rectangle ABCD has A at ${fmt(x1)}, ${fmt(y1)}; B at ${fmt(x2)}, ${fmt(y1)}; C at ${fmt(x2)}, ${fmt(y2)}. Where is D?`),
      visual: { kind: "grid", size: 6, quadrants: 4, points: pts.slice(0, 3) },
      ...label(pt(x1, y2), [pt(x2, y2 + 1 > 6 ? y2 - 1 : y2 + 1), pt(y2, x1), pt(-x1 || 1, y2), pt(x1, y1)]),
      hint: "D lines up with A (same x) and with C (same y).",
      explain: `D has A's x (${fmt(x1)}) and C's y (${fmt(y2)}): ${pt(x1, y2)}.`,
    };
  }
  const area = kind === 3;
  return {
    key: `gd-rect-${area}-${x1}-${x2}-${y1}-${y2}`,
    prompt: `Rectangle with corners A${pt(x1, y1)} and C${pt(x2, y2)}. ${area ? "Area" : "Perimeter"}?`,
    speech: talk(`A rectangle has opposite corners at ${fmt(x1)}, ${fmt(y1)} and ${fmt(x2)}, ${fmt(y2)}. What is its ${area ? "area" : "perimeter"}?`),
    visual: { kind: "grid", size: 6, quadrants: 4, points: pts },
    unit: area ? "square units" : "units",
    ...keypad(area ? w * h : 2 * (w + h)),
    hint: "Find the width from the x-values and the height from the y-values.",
    explain: `Width ${w}, height ${h}. ${area ? `Area = ${w} × ${h} = ${w * h}` : `Perimeter = 2 × (${w} + ${h}) = ${2 * (w + h)}`}.`,
  };
}

/** A number line that fits the start, the answer and 0. */
function signedLine(from: number, to: number): Visual {
  const lo = Math.min(0, from, to);
  const hi = Math.max(0, from, to);
  return { kind: "numberline", min: Math.floor((lo - 1) / 5) * 5, max: Math.ceil((hi + 1) / 5) * 5, step: 1, labelStep: 5, from, to };
}

/** 7.NS.A.1a–c — add and subtract integers. */
export function addSubIntegers(): Question {
  const kind = rand(0, 5);
  const nz = () => (rand(0, 1) ? 1 : -1) * rand(1, 15);
  let a = nz();
  let b = nz();
  if (a > 0 && b > 0) a = -a;
  if (kind === 0) {
    const eq: Token[] = [a, "+", ...paren(b), "=", "?"];
    return {
      key: `asi-add-${a}-${b}`,
      prompt: pick(["Add the integers.", "Use the number line. What's the sum?"]),
      speech: sayEq(eq),
      equation: eq,
      visual: signedLine(a, a + b),
      ...signed(a + b),
      hint: b < 0 ? `Start at ${fmt(a)}. Adding a negative moves left ${-b}.` : `Start at ${fmt(a)}. Move right ${b}.`,
      explain: `${eqStr(eq.slice(0, -1))} ${fmt(a + b)}`,
    };
  }
  if (kind === 1) {
    const eq: Token[] = [a, "−", ...paren(b), "=", "?"];
    return {
      key: `asi-sub-${a}-${b}`,
      prompt: pick(["Subtract the integers.", "What's the difference?"]),
      speech: sayEq(eq),
      equation: eq,
      visual: signedLine(a, a - b),
      ...signed(a - b),
      hint: `Subtracting is adding the opposite: ${fmt(a)} + ${b < 0 ? -b : `(${fmt(-b)})`}.`,
      explain: `${fmt(a)} − ${b < 0 ? `(${fmt(b)})` : b} = ${fmt(a)} + ${-b < 0 ? `(${fmt(-b)})` : -b} = ${fmt(a - b)}`,
    };
  }
  if (kind === 2) {
    const eq: Token[] = [a, "−", ...paren(b), "=", a, "+", "?"];
    return {
      key: `asi-opp-${a}-${b}`,
      prompt: "Subtracting is adding the opposite. What's missing?",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...signed(-b),
      hint: `What is the opposite of ${fmt(b)}?`,
      explain: `${fmt(a)} − ${b < 0 ? `(${fmt(b)})` : b} = ${fmt(a)} + ${-b < 0 ? `(${fmt(-b)})` : -b}`,
    };
  }
  if (kind === 3) {
    const eq: Token[] = [a, "+", "?", "=", 0];
    return {
      key: `asi-zero-${a}`,
      prompt: "What makes zero?",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...signed(-a),
      hint: "Opposites add up to 0.",
      explain: `${fmt(a)} + ${fmt(-a)} = 0`,
    };
  }
  if (kind === 4) {
    const t = rand(-12, 6);
    const ch = rand(3, 15);
    const warm = rand(0, 1) === 1;
    const end = warm ? t + ch : t - ch;
    const story = rand(0, 1) === 1;
    const text = story
      ? `It's ${fmt(t)} °C. It ${warm ? "warms up" : "cools down"} ${ch} degrees. Temperature now?`
      : `A diver at ${fmt(-Math.abs(t) - 2)} m ${warm ? "rises" : "sinks"} ${ch} m. New depth?`;
    const start = story ? t : -Math.abs(t) - 2;
    const ans = story ? end : warm ? start + ch : start - ch;
    return {
      key: `asi-story-${story}-${t}-${ch}-${warm}`,
      prompt: text,
      speech: talk(text),
      visual: signedLine(start, ans),
      unit: story ? "°C" : "m",
      ...signed(ans),
      hint: warm ? "Going up means adding." : "Going down means subtracting.",
      explain: `${fmt(start)} ${warm ? "+" : "−"} ${ch} = ${fmt(ans)}`,
    };
  }
  return {
    key: `asi-dist-${a}-${b}`,
    prompt: `How far apart are ${fmt(a)} and ${fmt(b)} on a number line?`,
    speech: talk(`How far apart are ${fmt(a)} and ${fmt(b)} on a number line?`),
    visual: NONE,
    ...keypad(Math.abs(a - b)),
    hint: "Distance = the absolute value of the difference.",
    explain: `|${fmt(a)} − ${b < 0 ? `(${fmt(b)})` : b}| = |${fmt(a - b)}| = ${Math.abs(a - b)}`,
  };
}

/** 7.NS.A.2a, 7.NS.A.2b — multiply and divide signed numbers. */
export function mulDivIntegers(): Question {
  const kind = rand(0, 3);
  const s = () => (rand(0, 1) ? 1 : -1);
  const a = s() * rand(2, 12);
  const b = s() * rand(2, 12);
  if (kind === 0) {
    const eq: Token[] = [a, "×", ...paren(b), "=", "?"];
    return {
      key: `mdi-mul-${a}-${b}`,
      prompt: pick(["Multiply.", "What's the product?"]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...signed(a * b),
      hint: "Same signs make a positive product. Different signs make a negative one.",
      explain: `${eqStr(eq.slice(0, -1))} ${fmt(a * b)}`,
    };
  }
  if (kind === 1) {
    const eq: Token[] = [a * b, "÷", ...paren(b), "=", "?"];
    return {
      key: `mdi-div-${a}-${b}`,
      prompt: pick(["Divide.", "What's the quotient?"]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...signed(a),
      hint: "Divide the sizes. Same signs: positive. Different signs: negative.",
      explain: `${eqStr(eq.slice(0, -1))} ${fmt(a)}`,
    };
  }
  if (kind === 2) {
    const c = s() * rand(2, 5);
    const neg = [a, b, c].filter((v) => v < 0).length;
    const pos = neg % 2 === 0;
    return {
      key: `mdi-sign-${a}-${b}-${c}`,
      prompt: `Is ${fmt(a)} × ${b < 0 ? `(${fmt(b)})` : b} × ${c < 0 ? `(${fmt(c)})` : c} positive or negative?`,
      speech: talk(`Is ${fmt(a)} × ${fmt(b)} × ${fmt(c)} positive or negative?`),
      visual: NONE,
      ...label(pos ? "Positive" : "Negative", [pos ? "Negative" : "Positive", "Zero"]),
      hint: "Count the negative signs. An even number of them makes a positive product.",
      explain: `There ${neg === 1 ? "is 1 negative" : `are ${neg} negatives`}, so the product is ${pos ? "positive" : "negative"}: ${fmt(a * b * c)}.`,
    };
  }
  const [p, q] = coprimePair(2, 9);
  return {
    key: `mdi-frac-${p}-${q}`,
    prompt: `Which is NOT equal to −${p}/${q}?`,
    speech: talk(`Which one is not equal to negative ${p}/${q}?`),
    visual: NONE,
    ...label(`(−${p})/(−${q})`, [`(−${p})/${q}`, `${p}/(−${q})`, `−(${p}/${q})`]),
    hint: "One negative sign makes the value negative. Two negatives cancel out.",
    explain: `(−${p})/(−${q}) = ${p}/${q}, which is positive. The others are all −${p}/${q}.`,
  };
}

/** 7.NS.A.1d, 7.NS.A.2c, 7.NS.A.3 — add, subtract, multiply and divide rational numbers; word problems. */
export function rationalOps(): Question {
  const kind = rand(0, 4);
  if (kind <= 1) {
    const A = (rand(0, 1) ? 1 : -1) * rand(5, 99) * 5;
    const B = (rand(0, 1) ? 1 : -1) * rand(5, 99) * 5;
    const add = kind === 0;
    const eq: Token[] = [sh(A, -2), add ? "+" : "−", ...paren(sh(B, -2)), "=", "?"];
    const ans = sh(add ? A + B : A - B, -2);
    return {
      key: `ro-${add}-${A}-${B}`,
      prompt: pick(["Work it out. Watch the signs!", add ? "Add the decimals." : "Subtract the decimals."]),
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...keypad(ans, [sh(add ? A - B : A + B, -2), -ans, sh(-A + (add ? B : -B), -2)]),
      hint: add ? "Same signs: add and keep the sign. Different signs: subtract and keep the sign of the bigger one." : "Subtracting is adding the opposite.",
      explain: `${eqStr(eq.slice(0, -1))} ${ds(ans)}`,
    };
  }
  if (kind === 2) {
    const [a, b] = properFrac(6);
    const [c, d] = properFrac(6);
    const sa = rand(0, 1) ? 1 : -1;
    const sb = sa > 0 ? -1 : rand(0, 1) ? 1 : -1;
    const mul = rand(0, 1) === 1;
    const sign = sa * sb;
    const [N, D] = mul ? [a * c, b * d] : [a * d, b * c];
    const f = (s: number, n: number, dd: number): Token[] => (s < 0 ? ["(", "−", { n, d: dd }, ")"] : [{ n, d: dd }]);
    const eq: Token[] = [...f(sa, a, b), mul ? "×" : "÷", ...f(sb, c, d), "=", "?"];
    return {
      key: `ro-frac-${mul}-${sa * a}/${b}-${sb * c}/${d}`,
      prompt: mul ? "Multiply. Watch the signs!" : "Divide. Watch the signs!",
      speech: sayEq(eq),
      equation: eq,
      visual: NONE,
      ...label(fracStr(sign * N, D), [fracStr(-sign * N, D), fracStr(sign * (mul ? a * d : a * c), mul ? b * c : b * d), fracStr(sign * (N + 1), D)]),
      hint: mul ? "Multiply tops and bottoms. Then decide the sign." : "Flip the second fraction and multiply. Then decide the sign.",
      explain: `${eqStr(eq.slice(0, -1))} ${fracStr(sign * N, D)}`,
    };
  }
  if (kind === 3) {
    const s = rand(0, 3);
    if (s === 0) {
      const T = rand(10, 60);
      const F = T + rand(5, 60);
      const t = `It was ${ds(T / 10)} °C. It dropped ${ds(F / 10)} °C. What is it now?`;
      return {
        key: `ro-temp-${T}-${F}`,
        prompt: t,
        speech: talk(t),
        visual: NONE,
        unit: "°C",
        ...keypad(sh(T - F, -1), [sh(F - T, -1), sh(T + F, -1), sh(T - F - 10, -1)]),
        hint: `Start at ${ds(T / 10)} and subtract ${ds(F / 10)}. You'll pass 0.`,
        explain: `${ds(T / 10)} − ${ds(F / 10)} = ${ds((T - F) / 10)} °C`,
      };
    }
    if (s === 1) {
      const D = rand(40, 200) * 5;
      const R = rand(5, D / 5 - 2) * 5;
      const t = `A submarine at ${ds(-D / 10)} m rises ${ds(R / 10)} m. New depth?`;
      return {
        key: `ro-sub-${D}-${R}`,
        prompt: t,
        speech: talk(t),
        visual: NONE,
        unit: "m",
        ...keypad(sh(R - D, -1), [sh(D - R, -1), sh(-D - R, -1), sh(R - D + 10, -1)]),
        hint: "Rising means adding to the depth.",
        explain: `${ds(-D / 10)} + ${ds(R / 10)} = ${ds((R - D) / 10)} m`,
      };
    }
    if (s === 2) {
      const C = rand(1, 12) * 25;
      const n = rand(2, 6);
      const t = `A stock drops ${money(C / 100)} a day for ${n} days. Total change in $?`;
      return {
        key: `ro-stock-${C}-${n}`,
        prompt: t,
        speech: talk(t),
        visual: NONE,
        ...keypad(sh(-C * n, -2), [sh(C * n, -2), sh(-C - n * 100, -2), sh(-C * (n + 1), -2)]),
        hint: `Each day is ${fmt(-C / 100)}. Multiply by ${n}.`,
        explain: `${n} × (${ds(-C / 100)}) = ${ds((-C * n) / 100)}`,
      };
    }
    const n = rand(2, 6);
    const each = rand(3, 25);
    const t = `${n} friends share a $${n * each} debt equally. Each one's change in $?`;
    return {
      key: `ro-debt-${n}-${each}`,
      prompt: t,
      speech: talk(`${n} friends share a debt of ${n * each} dollars equally. What is each person's change in money, in dollars?`),
      visual: NONE,
      ...signed(-each),
      hint: "A debt is negative. Divide it into equal shares.",
      explain: `${fmt(-n * each)} ÷ ${n} = ${fmt(-each)}`,
    };
  }
  const [p, q] = properFrac(9);
  const k = rand(2, 15);
  const shape = rand(0, 1);
  const eq: Token[] = shape === 0
    ? ["−", { n: p, d: q }, "+", k, "+", { n: p, d: q }, "=", "?"]
    : ["(", -q, ")", "×", k, "×", "(", "−", { n: 1, d: q }, ")", "=", "?"];
  return {
    key: `ro-prop-${shape}-${p}/${q}-${k}`,
    prompt: "Find the easy way! Use properties.",
    speech: sayEq(eq),
    equation: eq,
    visual: NONE,
    ...signed(k),
    hint: shape === 0 ? "Opposites add to 0. Group them first." : `Multiply ${fmt(-q)} by −1/${q} first.`,
    explain: shape === 0 ? `−${p}/${q} + ${p}/${q} = 0, so the answer is ${k}.` : `(${fmt(-q)}) × (−1/${q}) = 1, so the answer is ${k}.`,
  };
}

/* ========================================================== 8. Expressions (G6–7) */

/** 6.EE.A.1 — whole-number exponents. */
export function exponents(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    let b = rand(2, 10);
    let e = rand(2, 4);
    while (b ** e > 10000) [b, e] = [rand(2, 10), rand(2, 4)];
    const eq: Token[] = [{ pow: [b, e] }, "=", "?"];
    return {
      key: `ex-${b}-${e}`,
      prompt: pick(["What is the value?", "Work out the power."]),
      speech: `What is ${b} to the power of ${e}?`,
      equation: eq,
      visual: NONE,
      ...keypad(b ** e),
      hint: `Multiply ${b} by itself ${e} times. It's not ${b} × ${e}!`,
      explain: `${b}${sup(e)} = ${Array(e).fill(b).join(" × ")} = ${b ** e}`,
    };
  }
  if (kind === 1) {
    const b = rand(2, 12);
    const e = rand(2, 6);
    return {
      key: `ex-write-${b}-${e}`,
      prompt: `Write ${Array(e).fill(b).join(" × ")} as ${b} to a power. Power?`,
      speech: `${e} ${b}s are multiplied together. Write it as ${b} to a power. What is the power?`,
      visual: NONE,
      ...keypad(e),
      hint: "The exponent counts how many times the base is multiplied.",
      explain: `${Array(e).fill(b).join(" × ")} = ${b}${sup(e)}`,
    };
  }
  if (kind === 2) {
    const [a, b] = pick([[2, 3], [2, 5], [3, 4], [2, 4], [2, 6], [3, 5], [4, 5], [2, 7], [3, 2]] as [number, number][]);
    const x = a ** b;
    const y = b ** a;
    const right = x === y ? "They're equal" : x > y ? `${a}${sup(b)}` : `${b}${sup(a)}`;
    return {
      key: `ex-cmp-${a}-${b}`,
      prompt: `Which is greater: ${a}${sup(b)} or ${b}${sup(a)}?`,
      speech: `Which is greater: ${a} to the power of ${b}, or ${b} to the power of ${a}?`,
      visual: NONE,
      ...label(right, [`${a}${sup(b)}`, `${b}${sup(a)}`, "They're equal"].filter((s) => s !== right), true),
      hint: "Work out each power. Don't just look at the numbers!",
      explain: `${a}${sup(b)} = ${x} and ${b}${sup(a)} = ${y}.`,
    };
  }
  if (rand(0, 1)) {
    const k = rand(1, 9);
    const eq: Token[] = [{ pow: [sh(k, -1), 2] }, "=", "?"];
    return {
      key: `ex-dec-${k}`,
      prompt: "Square the decimal.",
      speech: `What is ${ds(k / 10)} squared?`,
      equation: eq,
      visual: NONE,
      ...keypad(sh(k * k, -2)),
      hint: `${ds(k / 10)} × ${ds(k / 10)}: tenths times tenths make hundredths.`,
      explain: `${ds(k / 10)} × ${ds(k / 10)} = ${ds(sh(k * k, -2))}`,
    };
  }
  const [n, d] = properFrac(6);
  const e = rand(2, 3);
  return {
    key: `ex-frac-${n}/${d}-${e}`,
    prompt: `What is (${n}/${d})${sup(e)}?`,
    speech: talk(`What is ${n}/${d} to the power of ${e}?`),
    visual: NONE,
    ...label(fracStr(n ** e, d ** e), [fracStr(n * e, d * e), fracStr(n, d ** e), fracStr(n ** e, d), fracStr(n * e, d)]),
    hint: "Multiply the fraction by itself: tops times tops, bottoms times bottoms.",
    explain: `(${n}/${d})${sup(e)} = ${n ** e}/${d ** e}`,
  };
}

/** 6.EE.A.1, 6.EE.A.2c — order of operations with exponents. */
export function orderOfOps(): Question {
  const t = rand(0, 4);
  let eq: Token[];
  let ans: number;
  let explain: string;
  if (t === 0) {
    const [a, b, c] = [rand(1, 20), rand(2, 5), rand(2, 6)];
    eq = [a, "+", b, "×", { pow: [c, 2] }];
    ans = a + b * c * c;
    explain = `Exponent first: ${c}² = ${c * c}. Then ${b} × ${c * c} = ${b * c * c}. Then ${a} + ${b * c * c} = ${ans}.`;
  } else if (t === 1) {
    const c = rand(3, 5);
    const a = rand(2, 6);
    const b = rand(2, Math.floor((c ** 3 - 1) / a));
    eq = [{ pow: [c, 3] }, "−", a, "×", b];
    ans = c ** 3 - a * b;
    explain = `${c}³ = ${c ** 3}. ${a} × ${b} = ${a * b}. ${c ** 3} − ${a * b} = ${ans}.`;
  } else if (t === 2) {
    const e = rand(3, 5);
    const b = rand(1, 2 ** e - 1);
    const a = rand(2, 6);
    eq = [a, "×", "(", { pow: [2, e] }, "−", b, ")"];
    ans = a * (2 ** e - b);
    explain = `Brackets: 2${sup(e)} = ${2 ** e}, minus ${b} is ${2 ** e - b}. Then ${a} × ${2 ** e - b} = ${ans}.`;
  } else if (t === 3) {
    const c = rand(2, 12);
    const d = pick(factorsOf(c * c).filter((f) => f > 1 && f < c * c));
    const a = rand(1, 15);
    eq = [{ pow: [c, 2] }, "÷", d, "+", a];
    ans = (c * c) / d + a;
    explain = `${c}² = ${c * c}. ${c * c} ÷ ${d} = ${(c * c) / d}. Plus ${a} is ${ans}.`;
  } else {
    const c = rand(2, 6);
    const q = rand(2, 8);
    const a = rand(1, c * q - 1);
    const b = c * q - a;
    const e = rand(2, 3);
    eq = ["(", a, "+", b, ")", "÷", c, "×", { pow: [2, e] }];
    ans = q * 2 ** e;
    explain = `Brackets: ${a} + ${b} = ${c * q}. Left to right: ${c * q} ÷ ${c} = ${q}, then × 2${sup(e)} (${2 ** e}) = ${ans}.`;
  }
  const full: Token[] = [...eq, "=", "?"];
  return {
    key: `oo-${t}-${eqStr(eq)}`,
    prompt: pick(["Use the order of operations.", "What is the value?", "Brackets, powers, then × ÷, then + −."]),
    speech: sayEq(full),
    equation: full,
    visual: NONE,
    ...keypad(ans),
    hint: "Brackets first, then exponents, then × and ÷ left to right, then + and −.",
    explain,
  };
}

/** 6.EE.A.2a, 6.EE.B.6 — write expressions with letters. */
export function writeExpressions(): Question {
  const v = pick(["n", "x", "y", "m", "t"]);
  const k = rand(2, 12);
  let m = rand(2, 9);
  if (m === k) m += 1;
  const i = rand(0, 10);
  const bank: [string, string, string[]][] = [
    [`${k} less than ${v}`, `${v} − ${k}`, [`${k} − ${v}`, `${v} + ${k}`, `${k}${v}`]],
    [`${k} more than ${v}`, `${v} + ${k}`, [`${k}${v}`, `${v} − ${k}`, `${k} − ${v}`]],
    [`the product of ${k} and ${v}`, `${k}${v}`, [`${k} + ${v}`, `${v} ÷ ${k}`, `${v} − ${k}`]],
    [`${v} divided by ${k}`, `${v} ÷ ${k}`, [`${k} ÷ ${v}`, `${k}${v}`, `${v} − ${k}`]],
    [`${k} times the sum of ${v} and ${m}`, `${k}(${v} + ${m})`, [`${k}${v} + ${m}`, `${k} + ${v} + ${m}`, `${k}(${v} − ${m})`]],
    [`subtract ${v} from ${k}`, `${k} − ${v}`, [`${v} − ${k}`, `${k} + ${v}`, `${v} ÷ ${k}`]],
    [`half of ${v}, plus ${k}`, `${v} ÷ 2 + ${k}`, [`(${v} + ${k}) ÷ 2`, `2${v} + ${k}`, `${v} ÷ ${k} + 2`]],
    [`Tickets cost $${k} each. Cost of ${v} tickets?`, `${k}${v}`, [`${k} + ${v}`, `${v} ÷ ${k}`, `${k}${v} + ${k}`]],
    [`You had ${k} stickers and got ${v} more. How many now?`, `${k} + ${v}`, [`${k}${v}`, `${k} − ${v}`, `${v} − ${k}`]],
    [`${v} cookies shared by ${k} friends. How many each?`, `${v} ÷ ${k}`, [`${k} ÷ ${v}`, `${k}${v}`, `${v} − ${k}`]],
    [`A plan costs $${m * 5} plus $${k} per GB. Cost for ${v} GB?`, `${m * 5} + ${k}${v}`, [`${m * 5}${v} + ${k}`, `${m * 5} + ${k} + ${v}`, `(${m * 5} + ${k})${v}`]],
  ];
  const [say, right, wrong] = bank[i];
  const story = i >= 7;
  return {
    key: `we-${i}-${v}-${k}-${m}`,
    prompt: story ? say : `Write as an expression: ${say}`,
    speech: talk(story ? `${say} Which expression fits?` : `Write as an expression: ${say}.`),
    visual: NONE,
    ...label(right, wrong),
    hint: story ? `Let ${v} stand for the number you don't know. What would you do with it?` : "Watch the order: '5 less than n' starts with n.",
    explain: `${story ? "The expression is" : `"${say}" is`} ${right}.`,
  };
}

/** 6.EE.A.2b — parts of an expression: terms, coefficients, sums and products. */
export function expressionParts(): Question {
  const kind = rand(0, 4);
  const [a, b] = distinct(2, 2, 9);
  const c = rand(1, 20);
  if (kind <= 1) {
    const expr = `${a}x + ${b}y + ${c}`;
    const yCoef = kind === 0;
    return {
      key: `ep-${kind}-${a}-${b}-${c}`,
      prompt: yCoef ? `In ${expr}, what is the coefficient of y?` : `In ${expr}, what is the constant term?`,
      speech: talk(yCoef ? `In ${a}x + ${b}y + ${c}, what is the coefficient of y?` : `In ${a}x + ${b}y + ${c}, what is the constant term?`),
      visual: NONE,
      ...choose(yCoef ? b : c, [a, b, c, 3].filter((v) => v !== (yCoef ? b : c))),
      hint: yCoef ? "The coefficient is the number multiplied by the letter." : "The constant is the term with no letter.",
      explain: yCoef ? `${b}y means ${b} × y, so the coefficient is ${b}.` : `${c} has no letter, so it is the constant.`,
    };
  }
  if (kind === 2) {
    const n = rand(2, 5);
    const pool = shuffle([`${a}x`, `${b}y`, `${c}`, `${rand(2, 9)}z`, `x²`]).slice(0, n);
    const expr = pool.join(" + ");
    return {
      key: `ep-terms-${expr}`,
      prompt: `How many terms are in ${expr}?`,
      speech: talk(`How many terms are in ${expr}?`),
      visual: NONE,
      ...keypad(n),
      hint: "Terms are the parts joined by + or − signs.",
      explain: `${expr} has ${n} terms: ${pool.join(", ")}.`,
    };
  }
  const m = rand(2, 12);
  const which = rand(0, 3);
  const bank: [string, string, string[]][] = [
    [`In ${a}(x + ${m}), what is (x + ${m})?`, "A sum", ["A product", "A quotient", "A difference"]],
    [`What is ${a}(x + ${m}) as a whole?`, "A product", ["A sum", "A quotient", "A difference"]],
    [`What is (x + ${m}) ÷ ${a} as a whole?`, "A quotient", ["A sum", "A product", "A difference"]],
    [`In ${a}x, what is ${a} called?`, "The coefficient", ["The variable", "The constant", "The exponent"]],
  ];
  const [q, right, wrong] = bank[which];
  return {
    key: `ep-name-${which}-${a}-${m}`,
    prompt: q,
    speech: talk(q),
    visual: NONE,
    ...label(right, wrong),
    hint: "Sum: things added. Product: things multiplied. Quotient: one thing divided by another.",
    explain: `${right}.`,
  };
}

/** 6.EE.A.2c — evaluate expressions and formulas. */
export function evaluateExpr(): Question {
  const kind = rand(0, 5);
  const v = rand(2, 10);
  if (kind === 0) {
    const [a, b] = [rand(2, 9), rand(1, 20)];
    return evalQ(`ev-lin-${a}-${b}-${v}`, `Find ${a}x + ${b} when x = ${v}.`, a * v + b, `${a} × ${v} + ${b} = ${a * v + b}`);
  }
  if (kind === 1) {
    const b = rand(1, 20);
    const minus = rand(0, 1) === 1 && b < v * v;
    return evalQ(`ev-sq-${b}-${v}-${minus}`, `Find x² ${minus ? "−" : "+"} ${b} when x = ${v}.`, minus ? v * v - b : v * v + b, `${v}² ${minus ? "−" : "+"} ${b} = ${v * v} ${minus ? "−" : "+"} ${b} = ${minus ? v * v - b : v * v + b}`);
  }
  if (kind === 2) {
    const a = rand(2, 6);
    const b = rand(1, v - 1);
    return evalQ(`ev-dist-${a}-${b}-${v}`, `Find ${a}(x − ${b}) when x = ${v}.`, a * (v - b), `${a} × (${v} − ${b}) = ${a} × ${v - b} = ${a * (v - b)}`);
  }
  if (kind === 3) {
    const s = rand(2, 10);
    const cube = rand(0, 1) === 1;
    return {
      ...evalQ(
        `ev-cube-${cube}-${s}`,
        cube ? `V = s³. Find V when s = ${s} cm.` : `A = 6s². Find A when s = ${s} cm.`,
        cube ? s ** 3 : 6 * s * s,
        cube ? `${s}³ = ${s} × ${s} × ${s} = ${s ** 3} cm³` : `6 × ${s}² = 6 × ${s * s} = ${6 * s * s} cm²`,
      ),
      unit: cube ? "cm³" : "cm²",
    };
  }
  if (kind === 4) {
    const [l, w] = [rand(3, 20), rand(2, 15)];
    const per = rand(0, 1) === 1;
    if (per) return evalQ(`ev-per-${l}-${w}`, `P = 2l + 2w. Find P when l = ${l}, w = ${w}.`, 2 * l + 2 * w, `2 × ${l} + 2 × ${w} = ${2 * l} + ${2 * w} = ${2 * l + 2 * w}`);
    const [r, t] = [rand(3, 15) * 5, rand(2, 6)];
    return evalQ(`ev-drt-${r}-${t}`, `d = rt. Find d when r = ${r} and t = ${t}.`, r * t, `${r} × ${t} = ${r * t}`);
  }
  const [a, b] = [rand(2, 6), rand(2, 6)];
  const y = rand(1, 9);
  return evalQ(`ev-two-${a}-${b}-${v}-${y}`, `Find ${a}x + ${b}y when x = ${v} and y = ${y}.`, a * v + b * y, `${a} × ${v} + ${b} × ${y} = ${a * v} + ${b * y} = ${a * v + b * y}`);
}

function evalQ(key: string, prompt: string, ans: number, explain: string): Question {
  return {
    key,
    prompt,
    speech: talk(prompt),
    visual: NONE,
    ...keypad(ans),
    hint: "Swap each letter for its number. Then use the order of operations.",
    explain,
  };
}

/** 6.EE.A.3, 6.EE.A.4 — write and recognize equivalent expressions. */
export function equivalentExpr(): Question {
  const kind = rand(0, 4);
  const k = rand(2, 9);
  const m = rand(2, 9);
  if (kind === 0) {
    return {
      key: `eqx-dist-${k}-${m}`,
      prompt: `${k}(x + ${m}) = ${k}x + ?`,
      speech: talk(`${k} times the sum of x and ${m} equals ${k}x plus what?`),
      visual: NONE,
      ...keypad(k * m),
      hint: `Multiply ${k} by each part inside the brackets.`,
      explain: `${k}(x + ${m}) = ${k} × x + ${k} × ${m} = ${k}x + ${k * m}`,
    };
  }
  if (kind === 1) {
    return {
      key: `eqx-pick-${k}-${m}`,
      prompt: `Which is equivalent to ${k}(x + ${m})?`,
      speech: talk(`Which expression is equivalent to ${k} times the sum of x and ${m}?`),
      visual: NONE,
      ...label(`${k}x + ${k * m}`, [`${k}x + ${m}`, `x + ${k * m}`, `${k + m}x`, `${k * m}x`]),
      hint: "Use the distributive property: multiply the outside number by both terms inside.",
      explain: `${k}(x + ${m}) = ${k}x + ${k * m}`,
    };
  }
  if (kind === 2) {
    const v = pick(["y", "a", "n", "x"]);
    const n = rand(2, 6);
    return {
      key: `eqx-like-${v}-${n}`,
      prompt: `${Array(n).fill(v).join(" + ")} = ?`,
      speech: `${Array(n).fill(v).join(" plus ")} is the same as what?`,
      visual: NONE,
      ...label(`${n}${v}`, [`${v}${sup(n)}`, `${n} + ${v}`, `${v} + ${n}`]),
      hint: `How many ${v}s are being added?`,
      explain: `${n} lots of ${v} is ${n}${v}.`,
    };
  }
  if (kind === 3) {
    let g = 0, a = 0, b = 0;
    do {
      g = rand(2, 9);
      [a, b] = coprimePair(2, 9);
    } while (g * a > 60 || g * b > 60);
    return {
      key: `eqx-factor-${g}-${a}-${b}`,
      prompt: `${g * a}x + ${g * b}y = ${g}(?x + ${b}y). Missing number?`,
      speech: talk(`${g * a}x + ${g * b}y equals ${g} times the sum of what x and ${b}y?`),
      visual: NONE,
      ...keypad(a),
      hint: `Divide ${g * a} by ${g}.`,
      explain: `${g} × ${a}x = ${g * a}x and ${g} × ${b}y = ${g * b}y, so ${g * a}x + ${g * b}y = ${g}(${a}x + ${b}y).`,
    };
  }
  const p = rand(0, 4);
  const pairs: [string, string, boolean][] = [
    [`${k}(x + ${m})`, `${k}x + ${k * m}`, true],
    [`${k}(x + ${m})`, `${k}x + ${m}`, false],
    [`${k}x + ${m}x`, `${k + m}x`, true],
    [`${k}x + ${m}`, `${k + m}x`, false],
    [`x + x + x`, `3x`, true],
  ];
  const [e1, e2, same] = pairs[p];
  return {
    key: `eqx-same-${p}-${k}-${m}`,
    prompt: `Are ${e1} and ${e2} equivalent?`,
    speech: talk(`Are ${e1} and ${e2} equivalent expressions?`),
    visual: NONE,
    ...label(same ? "Yes" : "No", [same ? "No" : "Yes"]),
    hint: "Try x = 1 and x = 2 in both. Equivalent expressions always match.",
    explain: same ? `Yes. ${e1} = ${e2} for every x.` : `No. With x = 1: ${e1} ≠ ${e2}.`,
  };
}

const HALF_STEPS = [0.5, 1.5, 2, 2.5, 3, 3.5, 4, 1, 4.5, 5];

/** 7.EE.A.1, 7.EE.A.2 — combine, expand and factor linear expressions; rewrite to see a problem differently. */
export function simplifyExpr(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const a = pick(HALF_STEPS);
    const c = pick(HALF_STEPS);
    const [b, d] = [rand(1, 12), rand(1, 12)];
    const prompt = `Simplify ${lin(a, b)} + ${lin(c, -d)}.`;
    return {
      key: `se-comb-${a}-${b}-${c}-${d}`,
      prompt: `Simplify: ${lin(a, b)} + ${lin(c, -d)}`,
      speech: talk(prompt),
      visual: NONE,
      ...label(lin(a + c, b - d), [lin(a + c, b + d), lin(a - c, b - d), `${ds(a + c + b - d)}x`, lin(a + c + 1, b - d)]),
      hint: "Add the x-terms together and the numbers together.",
      explain: `${ds(a)}x + ${ds(c)}x = ${ds(a + c)}x and ${b} − ${d} = ${b - d}. So ${lin(a + c, b - d)}.`,
    };
  }
  if (kind === 1) {
    const k = rand(2, 6);
    const p = rand(2, 6);
    const q = rand(1, 9);
    return {
      key: `se-exp-${k}-${p}-${q}`,
      prompt: `Expand: −${k}(${p}x − ${q})`,
      speech: talk(`Expand negative ${k} times the quantity ${p}x − ${q}.`),
      visual: NONE,
      ...label(lin(-k * p, k * q), [lin(-k * p, -k * q), lin(k * p, -k * q), lin(-k * p, -q), lin(-k * p, q)]),
      hint: `Multiply −${k} by both terms. A negative times a negative is positive.`,
      explain: `−${k} × ${p}x = ${fmt(-k * p)}x and −${k} × (−${q}) = ${k * q}. So ${lin(-k * p, k * q)}.`,
    };
  }
  if (kind === 2) {
    let g = 0, a = 0, b = 0;
    do {
      g = rand(2, 9);
      [a, b] = coprimePair(1, 9);
    } while (g * a > 72 || g * b > 72 || a === 1);
    const h = factorsOf(g).filter((f) => f > 1 && f < g);
    const wrong = [`${g}(${a}x + ${g * b})`, `${g}x(${a} + ${b})`, `${g}(${lin(a, b + 1)})`];
    if (h.length) wrong.unshift(`${h[0]}(${lin((g * a) / h[0], (g * b) / h[0])})`);
    return {
      key: `se-fac-${g}-${a}-${b}`,
      prompt: `Factor out the GCF: ${lin(g * a, g * b)}`,
      speech: talk(`Factor out the greatest common factor: ${lin(g * a, g * b)}.`),
      visual: NONE,
      ...label(`${g}(${lin(a, b)})`, wrong, true),
      hint: `What's the greatest number that divides ${g * a} and ${g * b}?`,
      explain: `GCF is ${g}: ${lin(g * a, g * b)} = ${g}(${lin(a, b)}).`,
    };
  }
  if (kind === 3) {
    const r = pick([5, 10, 15, 20, 25, 30, 40]);
    const up = rand(0, 1) === 1;
    const right = `${ds((up ? 100 + r : 100 - r) / 100)}p`;
    return {
      key: `se-pct-${r}-${up}`,
      prompt: `A price p goes ${up ? "up" : "down"} ${r}%. Which shows the new price?`,
      speech: `A price p goes ${up ? "up" : "down"} by ${r} percent. Which expression shows the new price?`,
      visual: NONE,
      ...label(right, [`p ${up ? "+" : "−"} ${r}`, `${ds(r / 100)}p`, `${r}p`, `${ds((up ? 100 - r : 100 + r) / 100)}p`]),
      hint: `p ${up ? "+" : "−"} ${ds(r / 100)}p: combine them into one term.`,
      explain: `p ${up ? "+" : "−"} ${ds(r / 100)}p = ${right}`,
    };
  }
  if (kind === 4) {
    const r = pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
    return {
      key: `se-coef-${r}`,
      prompt: `a + ${ds(r / 100)}a = ?a. What's the missing number?`,
      speech: `a plus ${ds(r / 100)} a equals what times a?`,
      visual: NONE,
      ...keypad(sh(100 + r, -2)),
      hint: "a is the same as 1a. Add the coefficients.",
      explain: `1a + ${ds(r / 100)}a = ${ds((100 + r) / 100)}a. Adding ${r}% is the same as multiplying by ${ds((100 + r) / 100)}.`,
    };
  }
  const [a, c] = [rand(4, 9), rand(1, 3)];
  const [b, d] = [rand(1, 9), rand(1, 9)];
  return {
    key: `se-sub-${a}-${b}-${c}-${d}`,
    prompt: `Simplify: (${lin(a, b)}) − (${lin(c, -d)})`,
    speech: talk(`Simplify the quantity ${lin(a, b)}, minus the quantity ${lin(c, -d)}.`),
    visual: NONE,
    ...label(lin(a - c, b + d), [lin(a - c, b - d), lin(a + c, b + d), lin(a + c, b - d)]),
    hint: "Subtracting a bracket flips the sign of every term inside it.",
    explain: `(${lin(a, b)}) − (${lin(c, -d)}) = ${lin(a, b)} − ${c === 1 ? "" : c}x + ${d} = ${lin(a - c, b + d)}`,
  };
}

/* =========================================================== 9. Equations (G6–7) */

const X_LINE: Token[] = ["x", "=", "?"];

/** Put a value in for x in equation text: "3x + 4 = 19" → "3 × 5 + 4 = 19". */
function subX(text: string, v: number): string {
  const val = v < 0 ? `(${ds(v)})` : ds(v);
  return text.replace(/(\d)x/g, `$1 × ${val}`).replace(/(?<![a-z])x(?![a-z])/g, val);
}

/** 6.EE.B.5 — solving means finding values that make it true. */
export function solutionCheck(): Question {
  const kind = rand(0, 2);
  const v = rand(1, 12);
  const a = rand(2, 9);
  const b = rand(1, 20);
  const c = a * v + b;
  if (kind === 0) {
    const eq: Token[] = [{ x: a }, "+", b, "=", c];
    return {
      key: `sc-which-${a}-${b}-${v}`,
      prompt: "Which value of x makes it true?",
      speech: talk(`Which value of x makes ${a}x + ${b} = ${c} true?`),
      equation: eq,
      answerLine: X_LINE,
      visual: NONE,
      ...choose(v, [v + 1, v - 1, v + 2, Math.round(c / a)].filter((w) => w > 0 && w !== v), 1, 1),
      hint: "Try each choice in place of x. Which one makes both sides equal?",
      explain: `${a} × ${v} + ${b} = ${c}. ✓`,
    };
  }
  if (kind === 1) {
    const t = v + pick([0, 0, 1, -1, 2]);
    const yes = t === v;
    return {
      key: `sc-yn-${a}-${b}-${v}-${t}`,
      prompt: `Is x = ${t} a solution of ${a}x + ${b} = ${c}?`,
      speech: talk(`Is x = ${t} a solution of ${a}x + ${b} = ${c}?`),
      visual: NONE,
      ...label(yes ? "Yes" : "No", [yes ? "No" : "Yes"]),
      hint: `Put ${t} in for x and work out the left side.`,
      explain: `${a} × ${t} + ${b} = ${a * t + b}, which ${yes ? "equals" : "does not equal"} ${c}.`,
    };
  }
  const more = rand(0, 1) === 1;
  const edge = c - b;
  const ans = more ? edge + rand(1, 5) : edge - rand(1, Math.min(5, edge));
  const wrong = more ? [edge, edge - 1, edge - 3] : [edge, edge + 1, edge + 3];
  return {
    key: `sc-ineq-${more}-${b}-${c}-${ans}`,
    prompt: "Which value of x makes it true?",
    speech: talk(`Which value of x makes x + ${b} ${more ? ">" : "<"} ${c} true?`),
    equation: ["x", "+", b, more ? ">" : "<", c],
    visual: NONE,
    answer: ans,
    input: "choices",
    choices: shuffle([ans, ...wrong.filter((w) => w >= 0)]),
    hint: "Try each choice. Check if the left side really is " + (more ? "greater" : "less") + ".",
    explain: `${ans} + ${b} = ${ans + b}, which is ${more ? "greater" : "less"} than ${c}. ✓`,
  };
}

/** 6.EE.B.7 — solve x + p = q and px = q. */
export function oneStep(): Question {
  const kind = rand(0, 6);
  const x = rand(2, 60);
  const p = rand(2, 30);
  let eq: Token[];
  let ans = x;
  let hint: string;
  let prompt = pick(["Solve for x.", "What is x?", "Find x."]);
  if (kind === 0) {
    eq = ["x", "+", p, "=", x + p];
    hint = `Undo + ${p}: subtract ${p} from both sides.`;
  } else if (kind === 1) {
    eq = ["x", "−", p, "=", x - p > 0 ? x - p : x + p];
    ans = x - p > 0 ? x : x + 2 * p;
    hint = `Undo − ${p}: add ${p} to both sides.`;
  } else if (kind === 2) {
    const k = rand(2, 12);
    const xx = rand(2, 15);
    eq = [{ x: k }, "=", k * xx];
    ans = xx;
    hint = `Undo × ${k}: divide both sides by ${k}.`;
  } else if (kind === 3) {
    const k = rand(2, 9);
    const q = rand(2, 12);
    eq = ["x", "÷", k, "=", q];
    ans = k * q;
    hint = `Undo ÷ ${k}: multiply both sides by ${k}.`;
  } else if (kind === 4) {
    const X = rand(101, 999);
    const P = rand(11, 99);
    eq = ["x", "+", sh(P, -1), "=", sh(X + P * 10, -2)];
    ans = sh(X, -2);
    hint = `Subtract ${ds(P / 10)} from both sides. Line up the decimal points.`;
  } else if (kind === 5) {
    const [a, b] = properFrac(6);
    const t = rand(1, 6);
    eq = [{ n: a, d: b }, "×", "x", "=", a * t];
    ans = b * t;
    hint = `Multiply both sides by ${b}/${a} (the flip of ${a}/${b}).`;
  } else {
    const spent = rand(3, 30);
    const left = rand(2, 40);
    eq = ["x", "−", spent, "=", left];
    ans = spent + left;
    prompt = `After spending $${spent}, you have $${left}. How much at first?`;
    hint = "The equation shows it: undo the spending by adding.";
  }
  return {
    key: `os-${kind}-${eqStr(eq)}`,
    prompt,
    speech: kind === 6 ? talk(`${prompt} Solve x − ${eq[2]} = ${eq[4]}.`) : talk(`Solve ${eqStr(eq)}.`),
    equation: eq,
    answerLine: X_LINE,
    visual: NONE,
    ...keypad(ans),
    hint,
    explain: `x = ${ds(ans)}. Check: ${subX(eqStr(eq), ans)} ✓`,
  };
}

/** 6.EE.B.5, 6.EE.B.8 — inequalities like x > c: write them, test values, describe solutions. */
export function inequalities(): Question {
  const kind = rand(0, 3);
  const n = rand(5, 60);
  if (kind === 0) {
    const i = rand(0, 6);
    const bank: [string, string, string][] = [
      [`You must be at least ${n * 2} cm tall to ride.`, "h", "≥"],
      [`Fewer than ${n} people fit in the bus.`, "p", "<"],
      [`Go no faster than ${n} km/h here.`, "s", "≤"],
      [`You need more than ${n} points to win.`, "p", ">"],
      [`Kids under ${Math.min(n, 12)} get in free.`, "a", "<"],
      [`At most ${Math.min(n, 9)} books per student.`, "b", "≤"],
      [`Over ${n} people signed up.`, "p", ">"],
    ];
    const [t, v, sym] = bank[i];
    const num = +(t.match(/\d+/)?.[0] ?? n);
    return {
      key: `iq-write-${i}-${num}`,
      prompt: t,
      speech: talk(`${t} Which inequality fits?`),
      visual: NONE,
      ...label(`${v} ${sym} ${num}`, ["<", ">", "≤", "≥"].filter((s) => s !== sym).map((s) => `${v} ${s} ${num}`)),
      hint: "'At least' and 'no less than' mean ≥. 'At most' and 'no more than' mean ≤.",
      explain: `The words mean ${v} ${sym} ${num}.`,
    };
  }
  if (kind === 1) {
    const c = rand(2, 30);
    const sym = pick(["<", ">", "≤", "≥"]);
    const ok = (v: number) => (sym === "<" ? v < c : sym === ">" ? v > c : sym === "≤" ? v <= c : v >= c);
    const cands = [c - 3, c - 2, c - 1, c, c + 1, c + 2, c + 3].filter((v) => v >= 0);
    const good = shuffle(cands.filter(ok))[0];
    const bad = shuffle(cands.filter((v) => !ok(v))).slice(0, 3);
    return {
      key: `iq-test-${sym}-${c}-${good}`,
      prompt: `Which number is a solution of x ${sym} ${c}?`,
      speech: talk(`Which number is a solution of x ${sym} ${c}?`),
      visual: NONE,
      answer: good,
      input: "choices",
      choices: shuffle([good, ...bad]),
      hint: `Put each number in for x. Is the statement true? Careful with ${c} itself!`,
      explain: `${good} ${sym} ${c} is true.`,
    };
  }
  if (kind === 2) {
    const c = rand(-5, 20);
    const [open, right] = [rand(0, 1) === 1, rand(0, 1) === 1];
    const sym = right ? (open ? ">" : "≥") : open ? "<" : "≤";
    return {
      key: `iq-line-${c}-${open}-${right}`,
      prompt: "Which inequality does the graph show?",
      speech: "The number line shows the solutions of an inequality. Which inequality is it?",
      visual: { kind: "numberline", min: -10, max: 20, step: 1, labelStep: 5, from: c, to: c, ray: { at: c, dir: right ? "right" : "left", open } },
      needsVisual: true,
      ...label(`x ${sym} ${fmt(c)}`, ["<", ">", "≤", "≥"].filter((s) => s !== sym).map((s) => `x ${s} ${fmt(c)}`)),
      hint: "Open dot: the number itself is not included. Shaded right: bigger numbers.",
      explain: `${open ? "Open" : "Closed"} means ${fmt(c)} is ${open ? "not " : ""}included; shaded ${right ? "right means greater" : "left means less"}. So x ${sym} ${fmt(c)}.`,    };
  }
  const c = rand(1, 20);
  const sym = pick([">", "<"]);
  return {
    key: `iq-many-${sym}-${c}`,
    prompt: `How many numbers make x ${sym} ${c} true?`,
    speech: talk(`How many numbers make x ${sym} ${c} true?`),
    visual: NONE,
    ...label("Infinitely many", ["Just one", "None", `${c}`]),
    hint: "Think about decimals and fractions too, not just whole numbers.",
    explain: `Every number ${sym === ">" ? "greater" : "less"} than ${c} works: ${c + (sym === ">" ? 1 : -1)}, ${ds(c + (sym === ">" ? 0.5 : -0.5))}, … There are infinitely many.`,
  };
}

const VAR_PAIRS: [string, string][] = [
  ["hours you work", "money you earn"],
  ["tickets bought", "total cost"],
  ["minutes you run", "distance you run"],
  ["people at a party", "pizzas needed"],
  ["days of rain", "height of the river"],
  ["hours of study", "test score"],
  ["pages printed", "ink used"],
  ["gallons of gas", "miles you can drive"],
];

/** 6.EE.C.9 — dependent and independent variables; tables and equations. */
export function variablesTables(): Question {
  const kind = rand(0, 3);
  const k = rand(2, 9);
  const start = rand(0, 4);
  const xs = [start, start + 1, start + 2, start + 3];
  const times = rand(0, 1) === 1;
  const f = (x: number) => (times ? k * x : x + k);
  if (kind === 0) {
    return {
      key: `vt-rule-${k}-${start}-${times}`,
      prompt: "Which equation fits the table?",
      speech: "Which equation matches the table of x and y?",
      visual: { kind: "table", header: ["x", "y"], rows: xs.map((x) => [x, f(x)]) },
      needsVisual: true,
      ...label(times ? `y = ${k}x` : `y = x + ${k}`, times ? [`y = x + ${k}`, `y = ${k + 1}x`, `y = ${k}x + 1`] : [`y = ${k}x`, `y = x + ${k + 1}`, `y = x − ${k}`]),
      hint: "Try the rule on every row, not just the first.",
      explain: `Every y is ${times ? `${k} times x` : `x plus ${k}`}: ${times ? `y = ${k}x` : `y = x + ${k}`}.`,
    };
  }
  if (kind === 1) {
    const v = rand(10, 20);
    return {
      key: `vt-find-${k}-${start}-${times}-${v}`,
      prompt: `The rule is ${times ? `y = ${k}x` : `y = x + ${k}`}. Find y when x = ${v}.`,
      speech: talk(`The rule is ${times ? `y = ${k}x` : `y = x + ${k}`}. What is y when x is ${v}?`),
      visual: { kind: "table", header: ["x", "y"], rows: [...xs.slice(0, 3).map((x) => [x, f(x)]), [v, "?"]] },
      ...keypad(f(v)),
      hint: `Put ${v} in for x.`,
      explain: `y = ${times ? `${k} × ${v}` : `${v} + ${k}`} = ${f(v)}`,
    };
  }
  if (kind === 2) {
    const i = rand(0, VAR_PAIRS.length - 1);
    const [ind, dep] = VAR_PAIRS[i];
    const askDep = rand(0, 1) === 1;
    return {
      key: `vt-dep-${i}-${askDep}`,
      prompt: `${ind[0].toUpperCase()}${ind.slice(1)} and ${dep}: which is ${askDep ? "dependent" : "independent"}?`,
      speech: `Think about ${ind} and ${dep}. Which one is the ${askDep ? "dependent" : "independent"} variable?`,
      visual: NONE,
      ...label(askDep ? dep : ind, [askDep ? ind : dep]),
      hint: "The dependent variable changes because of the other one.",
      explain: `The ${dep} depends on the ${ind}. So ${dep} is dependent and ${ind} is independent.`,
    };
  }
  const r = rand(1, 3);
  const pts = [1, 2, 3].map((x) => ({ x, y: r * x, label: "" }));
  return {
    key: `vt-graph-${r}`,
    prompt: "These points follow y = ?x. What's the missing number?",
    speech: "The points follow the rule y equals something times x. What is the missing number?",
    visual: { kind: "plot", x: [0, 5], y: [0, 10], points: pts.map(({ x, y }) => ({ x, y })) },
    needsVisual: true,
    ...keypad(r),
    hint: "Look at the point where x = 1. What is y there?",
    explain: `At x = 1, y = ${r}. So y = ${r === 1 ? "" : r}x.`,
  };
}

/** 7.EE.B.4a — solve px + q = r and p(x + q) = r. */
export function twoStep(): Question {
  const kind = rand(0, 4);
  const x = rand(-10, 15) || 4;
  const p = rand(2, 9);
  const q = (rand(0, 1) ? 1 : -1) * rand(1, 20);
  let eq: Token[];
  let ans = x;
  let hint = "Undo the + or − first, then undo the ×.";
  const pm = (n: number): Token[] => [n < 0 ? "−" : "+", Math.abs(n)];
  if (kind === 0) eq = [{ x: p }, ...pm(q), "=", p * x + q];
  else if (kind === 1) {
    eq = [p, "×", "(", "x", ...pm(q), ")", "=", p * (x + q)];
    hint = `Divide both sides by ${p} first, then undo the ${q < 0 ? "−" : "+"} ${Math.abs(q)}.`;
  } else if (kind === 2) {
    const k = rand(-6, 9) || 3;
    ans = k * p;
    eq = ["x", "÷", p, ...pm(q), "=", k + q];
    hint = `Undo the ${q < 0 ? "−" : "+"} ${Math.abs(q)} first, then multiply by ${p}.`;
  } else if (kind === 3) {
    const xe = 2 * (rand(-5, 10) || 3);
    ans = xe;
    eq = [{ x: 0.5 }, ...pm(q), "=", xe / 2 + q];
    hint = "Undo the + or − first. Then multiply by 2, because 0.5x is half of x.";
  } else {
    eq = [{ x: -p }, ...pm(q), "=", -p * x + q];
    hint = `Undo the ${q < 0 ? "−" : "+"} ${Math.abs(q)}, then divide by −${p}. Watch the sign!`;
  }
  return {
    key: `ts-${kind}-${eqStr(eq)}`,
    prompt: pick(["Solve for x.", "Find x. Two steps!", "What is x?"]),
    speech: talk(`Solve ${eqStr(eq)}.`),
    equation: eq,
    answerLine: X_LINE,
    visual: NONE,
    ...signed(ans),
    hint,
    explain: `x = ${fmt(ans)}. Check: ${subX(eqStr(eq), ans)} ✓`,
  };
}

/** 7.EE.B.4b — solve two-step inequalities and use them in word problems. */
export function twoStepInequalities(): Question {
  const kind = rand(0, 3);
  const p = rand(2, 8);
  const s = rand(-5, 12);
  const q = rand(1, 20);
  const syms = [">", "<", "≥", "≤"];
  const flip: Record<string, string> = { ">": "<", "<": ">", "≥": "≤", "≤": "≥" };
  const soft: Record<string, string> = { ">": "≥", "<": "≤", "≥": ">", "≤": "<" };
  if (kind <= 1) {
    const sym = pick(syms);
    const neg = kind === 1;
    const coef = neg ? -p : p;
    const r = coef * s + q;
    const solSym = neg ? flip[sym] : sym;
    return {
      key: `tsi-${neg}-${p}-${s}-${q}-${sym}`,
      prompt: `Solve: ${lin(coef, q)} ${sym} ${fmt(r)}`,
      speech: talk(`Solve the inequality ${lin(coef, q)} ${sym} ${fmt(r)}.`),
      visual: NONE,
      ...label(`x ${solSym} ${fmt(s)}`, [`x ${neg ? sym : flip[sym]} ${fmt(s)}`, `x ${soft[solSym]} ${fmt(s)}`, `x ${solSym} ${fmt(s + 1)}`, `x ${solSym} ${fmt(-s || 1)}`]),
      hint: neg ? "Solve like an equation. Dividing by a negative number flips the sign!" : "Solve like an equation: subtract, then divide.",
      explain: `${lin(coef, 0)} ${sym} ${fmt(r - q)}, so x ${solSym} ${fmt(s)}${neg ? " (flipped, because we divided by a negative)" : ""}.`,
    };
  }
  if (kind === 2) {
    const m = rand(20, 60);
    const t = rand(3, 12);
    const c = rand(2, 8);
    const most = Math.floor((m - t) / c);
    return {
      key: `tsi-most-${m}-${t}-${c}`,
      prompt: `You have $${m}. Entry is $${t} and rides are $${c} each. Most rides?`,
      speech: `You have ${m} dollars. Entry costs ${t} dollars and each ride costs ${c} dollars. What is the greatest number of rides?`,
      visual: NONE,
      ...keypad(most),
      hint: `Write ${t} + ${c}r ≤ ${m}. Solve, then round down to a whole number of rides.`,
      explain: `${t} + ${c}r ≤ ${m} → ${c}r ≤ ${m - t} → r ≤ ${fracStr(m - t, c)}. So at most ${most} rides.`,
    };
  }
  const T = rand(30, 100);
  const h = rand(1, T - 10);
  const g = rand(3, 9);
  const fewest = Math.ceil((T - h) / g);
  return {
    key: `tsi-least-${T}-${h}-${g}`,
    prompt: `You need ${T} points. You have ${h}. Each win gives ${g}. Fewest wins?`,
    speech: `You need at least ${T} points. You have ${h}. Each win gives ${g} points. What is the fewest number of wins you need?`,
    visual: NONE,
    ...keypad(fewest),
    hint: `Write ${h} + ${g}w ≥ ${T}. Solve, then round up.`,
    explain: `${h} + ${g}w ≥ ${T} → w ≥ ${fracStr(T - h, g)}. So at least ${fewest} wins.`,
  };
}

/** 7.EE.B.3, 7.EE.B.4a — multi-step word problems. */
export function equationStories(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const [f, m, n] = [rand(2, 10) * 5, rand(10, 30), rand(2, 12)];
    return {
      key: `es-gym-${f}-${m}-${n}`,
      prompt: `A gym costs $${f} to join plus $${m} a month. You paid $${f + m * n}. Months?`,
      speech: `A gym costs ${f} dollars to join plus ${m} dollars a month. You paid ${f + m * n} dollars in all. How many months?`,
      visual: NONE,
      ...keypad(n),
      hint: `Write ${f} + ${m}m = ${f + m * n}. Subtract, then divide.`,
      explain: `${f + m * n} − ${f} = ${m * n}. ${m * n} ÷ ${m} = ${n} months.`,
    };
  }
  if (kind === 1) {
    const [l, w] = [rand(8, 30), rand(3, 20)];
    return {
      key: `es-per-${l}-${w}`,
      prompt: `A rectangle's perimeter is ${2 * (l + w)} cm. Its length is ${l} cm. Width?`,
      speech: `A rectangle has a perimeter of ${2 * (l + w)} centimeters. Its length is ${l} centimeters. What is its width?`,
      visual: { kind: "rect", w: l, h: w, showW: true, showH: false, grid: false, unit: "cm" },
      unit: "cm",
      ...keypad(w),
      hint: `2 × ${l} + 2w = ${2 * (l + w)}. Take away the two lengths, then halve.`,
      explain: `${2 * (l + w)} − ${2 * l} = ${2 * w}, and ${2 * w} ÷ 2 = ${w} cm.`,
    };
  }
  if (kind === 2) {
    const [n, each, ship] = [rand(2, 5), rand(6, 25), rand(3, 12)];
    return {
      key: `es-shirt-${n}-${each}-${ship}`,
      prompt: `${n} shirts plus $${ship} shipping cost $${n * each + ship}. Price per shirt?`,
      speech: `${n} shirts plus ${ship} dollars shipping cost ${n * each + ship} dollars. How much is each shirt?`,
      visual: NONE,
      prefix: "$",
      ...keypad(each),
      hint: `Write ${n}s + ${ship} = ${n * each + ship}.`,
      explain: `${n * each + ship} − ${ship} = ${n * each}. ${n * each} ÷ ${n} = $${each}.`,
    };
  }
  if (kind === 3) {
    const w = rand(10, 30);
    const p = pick([5, 10, 15, 20, 25]);
    return {
      key: `es-raise-${w}-${p}`,
      prompt: `You earn $${w} an hour and get a ${p}% raise. New pay per hour?`,
      speech: `You earn ${w} dollars an hour and get a ${p} percent raise. What is your new pay per hour?`,
      visual: NONE,
      prefix: "$",
      ...keypad(sh(w * (100 + p), -2)),
      hint: `${p}% of $${w} is the raise. Or multiply by ${ds((100 + p) / 100)}.`,
      explain: `$${w} × ${ds((100 + p) / 100)} = ${money(sh(w * (100 + p), -2))}`,
    };
  }
  if (kind === 4) {
    const n = rand(2, 4);
    const E = rand(10, 50);
    let A = 10 - ((n * E) % 10);
    if (A === 10) A = 10;
    A += 10 * rand(0, 3);
    const L = (n * E + A) / 10;
    return {
      key: `es-board-${n}-${E}-${A}`,
      prompt: `A ${L} ft board is cut: one ${ds(A / 10)} ft piece and ${n} equal pieces. Each?`,
      speech: `A ${L} foot board is cut into one ${ds(A / 10)} foot piece and ${n} equal pieces. How long is each equal piece?`,
      visual: NONE,
      unit: "ft",
      ...keypad(sh(E, -1)),
      hint: `Take away the ${ds(A / 10)} ft piece, then split what's left into ${n}.`,
      explain: `${L} − ${ds(A / 10)} = ${ds((n * E) / 10)}. ${ds((n * E) / 10)} ÷ ${n} = ${ds(E / 10)} ft.`,
    };
  }
  const k = rand(2, 5);
  const a = rand(3, 15);
  return {
    key: `es-age-${k}-${a}`,
    prompt: `Jo is ${k} times as old as Max. Together they're ${a * (k + 1)}. Max's age?`,
    speech: `Jo is ${k} times as old as Max. Together their ages add up to ${a * (k + 1)}. How old is Max?`,
    visual: { kind: "tape", rows: [{ label: "Max", parts: 1 }, { label: "Jo", parts: k }], partValue: "?" },
    ...keypad(a),
    hint: `Max is 1 part and Jo is ${k} parts. That's ${k + 1} equal parts in all.`,
    explain: `m + ${k}m = ${a * (k + 1)}, so ${k + 1}m = ${a * (k + 1)} and m = ${a}.`,
  };
}

/* ======================================================= 10. Area & volume (G5–6) */

const FACTS: [string, boolean, ShapeName, string][] = [
  ["All squares are rectangles.", true, "square", "A square has 4 right angles, so it's a special rectangle."],
  ["All rectangles are squares.", false, "rectangle", "A rectangle can have two long sides and two short sides."],
  ["All squares are rhombuses.", true, "square", "A square has 4 equal sides, so it's a special rhombus."],
  ["All rhombuses are squares.", false, "rhombus", "A rhombus can lean over, without right angles."],
  ["All rectangles are parallelograms.", true, "rectangle", "A rectangle has 2 pairs of parallel sides."],
  ["All parallelograms are rectangles.", false, "parallelogram", "A parallelogram can lean over, without right angles."],
  ["Every rhombus has 4 equal sides.", true, "rhombus", "That's what makes a shape a rhombus."],
  ["Every square has 4 right angles.", true, "square", "Squares are rectangles, and all rectangles have 4 right angles."],
  ["Every quadrilateral is a parallelogram.", false, "trapezoid", "A trapezoid is a quadrilateral without 2 pairs of parallel sides."],
  ["Some parallelograms are rhombuses.", true, "rhombus", "A parallelogram with 4 equal sides is a rhombus."],
  ["A rectangle always has 4 equal sides.", false, "rectangle", "Only some rectangles (the squares) have 4 equal sides."],
  ["Every parallelogram has 2 pairs of parallel sides.", true, "parallelogram", "That's what makes a shape a parallelogram."],
  ["Some rectangles are squares.", true, "rectangle", "A rectangle with 4 equal sides is a square."],
  ["A triangle can have 2 right angles.", false, "triangle", "Two right angles already make 180°, leaving nothing for the third angle."],
  ["All equilateral triangles are isosceles.", true, "triangle", "Isosceles means at least 2 equal sides, and equilateral has 3."],
  ["Every square is a parallelogram.", true, "square", "A square has 2 pairs of parallel sides."],
];
const WHICH_SHAPE: [string, string, string[], ShapeName][] = [
  ["Which is NOT always a parallelogram?", "trapezoid", ["square", "rectangle", "rhombus"], "parallelogram"],
  ["A rhombus with 4 right angles is a…", "square", ["trapezoid", "triangle", "pentagon"], "rhombus"],
  ["A rectangle with 4 equal sides is a…", "square", ["trapezoid", "triangle", "hexagon"], "rectangle"],
  ["Which shape has every property of a rectangle?", "square", ["rhombus", "trapezoid", "kite"], "rectangle"],
  ["Which shape has every property of a rhombus?", "square", ["rectangle", "trapezoid", "kite"], "rhombus"],
  ["Which shape is always a rectangle?", "square", ["rhombus", "parallelogram", "trapezoid"], "square"],
];

/** 5.G.B.3, 5.G.B.4 — shape families share properties; the quadrilateral hierarchy. */
export function shapeFamilies(): Question {
  if (rand(0, 3) > 0) {
    const i = rand(0, FACTS.length - 1);
    const [fact, truth, shape, why] = FACTS[i];
    return {
      key: `sf-tf-${i}`,
      prompt: `True or false? ${fact}`,
      speech: `True or false? ${fact}`,
      visual: { kind: "shape", shape },
      ...label(truth ? "True" : "False", [truth ? "False" : "True"]),
      hint: "Think about what each shape needs. A square has everything a rectangle needs, plus more.",
      explain: `${truth ? "True" : "False"}. ${why}`,
    };
  }
  const i = rand(0, WHICH_SHAPE.length - 1);
  const [q, right, wrong, shape] = WHICH_SHAPE[i];
  return {
    key: `sf-which-${i}`,
    prompt: q,
    speech: q,
    visual: { kind: "shape", shape },
    ...label(right, wrong),
    hint: "Squares are special rectangles and special rhombuses. All of them are parallelograms.",
    explain: `The answer is ${right}.`,
  };
}

/** 6.G.A.1 — area of triangles and parallelograms. */
export function areaTriangles(): Question {
  const kind = rand(0, 3);
  const b = rand(3, 20);
  const h = rand(2, 15);
  if (kind === 0 || kind === 2) {
    const right = kind === 2;
    return {
      key: `at-tri-${right}-${b}-${h}`,
      prompt: right ? `A right triangle has legs ${b} cm and ${h} cm. Area?` : "Find the area of the triangle.",
      speech: right ? `A right triangle has legs of ${b} and ${h} centimeters. What is its area?` : `A triangle has base ${b} centimeters and height ${h} centimeters. What is its area?`,
      visual: { kind: "polygon", shape: "triangle", base: b, height: h, unit: "cm" },
      unit: "cm²",
      ...keypad((b * h) / 2),
      hint: "A triangle is half of a rectangle with the same base and height.",
      explain: `${b} × ${h} ÷ 2 = ${ds((b * h) / 2)} cm²`,
    };
  }
  if (kind === 1) {
    return {
      key: `at-par-${b}-${h}`,
      prompt: "Find the area of the parallelogram.",
      speech: `A parallelogram has base ${b} centimeters and height ${h} centimeters. What is its area?`,
      visual: { kind: "polygon", shape: "parallelogram", base: b, height: h, unit: "cm" },
      unit: "cm²",
      ...keypad(b * h),
      hint: "Cut off the slanted end and slide it over: it makes a rectangle.",
      explain: `${b} × ${h} = ${b * h} cm²`,
    };
  }
  const bb = 2 * rand(2, 10);
  return {
    key: `at-ht-${bb}-${h}`,
    prompt: `A triangle has area ${(bb * h) / 2} cm² and base ${bb} cm. Height?`,
    speech: `A triangle has an area of ${(bb * h) / 2} square centimeters and a base of ${bb} centimeters. What is its height?`,
    visual: NONE,
    unit: "cm",
    ...keypad(h),
    hint: "Area = base × height ÷ 2. Double the area, then divide by the base.",
    explain: `${(bb * h) / 2} × 2 = ${bb * h}, and ${bb * h} ÷ ${bb} = ${h} cm.`,
  };
}

/** 6.G.A.1 — area of trapezoids and shapes made of rectangles and triangles. */
export function areaPolygons(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const b1 = rand(6, 16);
    const b2 = rand(2, b1 - 2);
    const h = rand(2, 10);
    return {
      key: `ap-trap-${b1}-${b2}-${h}`,
      prompt: "Find the area of the trapezoid.",
      speech: `A trapezoid has parallel sides of ${b1} and ${b2} centimeters and a height of ${h}. What is its area?`,
      visual: { kind: "polygon", shape: "trapezoid", base: b1, top: b2, height: h, unit: "cm" },
      unit: "cm²",
      ...keypad(((b1 + b2) * h) / 2),
      hint: "Add the two parallel sides, multiply by the height, then halve.",
      explain: `(${b1} + ${b2}) × ${h} ÷ 2 = ${ds(((b1 + b2) * h) / 2)} cm²`,
    };
  }
  if (kind === 1) {
    const s = rand(4, 10);
    const t = rand(2, 6);
    return {
      key: `ap-house-${s}-${t}`,
      prompt: `A house shape: a ${s}×${s} m square with a roof triangle ${t} m tall. Area?`,
      speech: `A house shape is a square ${s} meters on each side, with a triangle roof ${t} meters tall on top. What is the total area?`,
      visual: { kind: "shape", shape: "house" },
      unit: "m²",
      ...keypad(s * s + (s * t) / 2),
      hint: "Find the square's area and the triangle's area. Add them.",
      explain: `${s} × ${s} = ${s * s}. Triangle: ${s} × ${t} ÷ 2 = ${ds((s * t) / 2)}. Total ${ds(s * s + (s * t) / 2)} m².`,
    };
  }
  if (kind === 2) {
    const [W, H] = [rand(6, 14), rand(5, 12)];
    const [w, h] = [rand(2, W - 2), rand(2, H - 2)];
    return {
      key: `ap-L-${W}-${H}-${w}-${h}`,
      prompt: `An L-shape: a ${W}×${H} m rectangle missing a ${w}×${h} m corner. Area?`,
      speech: `An L shape is a ${W} by ${H} meter rectangle with a ${w} by ${h} meter corner cut out. What is its area?`,
      visual: { kind: "lshape", w: W, h: H, cutW: w, cutH: h, unit: "m", grid: false },
      unit: "m²",
      ...keypad(W * H - w * h),
      hint: "Find the big rectangle's area, then take away the missing corner.",
      explain: `${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${W * H - w * h} m²`,
    };
  }
  if (kind === 3) {
    const [b, h] = [rand(2, 8), rand(2, 7)];
    return {
      key: `ap-hex-${b}-${h}`,
      prompt: `A hexagon is 6 triangles, each base ${b} cm, height ${h} cm. Area?`,
      speech: `A hexagon is made of 6 equal triangles. Each has base ${b} and height ${h} centimeters. What is the hexagon's area?`,
      visual: { kind: "shape", shape: "hexagon" },
      unit: "cm²",
      ...keypad(3 * b * h),
      hint: "Find one triangle's area, then multiply by 6.",
      explain: `One triangle: ${b} × ${h} ÷ 2 = ${ds((b * h) / 2)}. × 6 = ${3 * b * h} cm².`,
    };
  }
  const [W, H] = [rand(6, 14), rand(5, 12)];
  const [p, q] = [rand(2, W - 1), rand(2, H - 1)];
  return {
    key: `ap-cut-${W}-${H}-${p}-${q}`,
    prompt: `A ${W}×${H} cm card minus a corner triangle (legs ${p}, ${q}). Area?`,
    speech: `A ${W} by ${H} centimeter card has a right triangle with legs ${p} and ${q} centimeters cut off a corner. What area is left?`,
    visual: NONE,
    unit: "cm²",
    ...keypad(W * H - (p * q) / 2),
    hint: "Rectangle area minus the triangle's area.",
    explain: `${W * H} − ${p} × ${q} ÷ 2 = ${W * H} − ${ds((p * q) / 2)} = ${ds(W * H - (p * q) / 2)} cm²`,
  };
}

const NETS: [string, number, ShapeName][] = [
  ["cube", 6, "cube"],
  ["rectangular prism", 6, "prism"],
  ["triangular prism", 5, "triangular-prism"],
  ["square pyramid", 5, "pyramid"],
  ["triangular pyramid", 4, "pyramid"],
];

/** 6.G.A.4 — nets and surface area. */
export function surfaceArea(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [l, w, h] = [rand(2, 10), rand(2, 8), rand(2, 8)];
    const sa = 2 * (l * w + l * h + w * h);
    return {
      key: `sa-box-${l}-${w}-${h}`,
      prompt: "Find the surface area of the box.",
      speech: `A box is ${l} by ${w} by ${h} centimeters. Unfold it into a net. What is the total area of all 6 faces?`,
      visual: { kind: "box", l, w, h, unit: "cm" },
      unit: "cm²",
      ...keypad(sa),
      hint: "A box has 3 pairs of matching faces: top and bottom, front and back, two sides.",
      explain: `2 × (${l}×${w} + ${l}×${h} + ${w}×${h}) = 2 × (${l * w} + ${l * h} + ${w * h}) = ${sa} cm²`,
    };
  }
  if (kind === 1) {
    const s = rand(2, 12);
    return {
      key: `sa-cube-${s}`,
      prompt: `A cube has ${s} cm edges. What is its surface area?`,
      speech: `A cube has edges ${s} centimeters long. What is its surface area?`,
      visual: { kind: "box", l: s, w: s, h: s, unit: "cm" },
      unit: "cm²",
      ...keypad(6 * s * s),
      hint: "A cube's net is 6 equal squares.",
      explain: `6 × ${s} × ${s} = ${6 * s * s} cm²`,
    };
  }
  if (kind === 2) {
    const i = rand(0, NETS.length - 1);
    const [name, faces, shape] = NETS[i];
    return {
      key: `sa-net-${i}`,
      prompt: `How many faces does the net of a ${name} have?`,
      speech: `If you unfold a ${name} into a flat net, how many faces does it have?`,
      visual: { kind: "shape", shape },
      ...keypad(faces),
      hint: "Count every flat face: top, bottom and all the sides.",
      explain: `A ${name} has ${faces} faces, so its net has ${faces} shapes.`,
    };
  }
  const [s, t] = [rand(2, 10), rand(2, 10)];
  return {
    key: `sa-pyr-${s}-${t}`,
    prompt: `Square pyramid: base ${s} cm, triangles ${t} cm tall. Surface area?`,
    speech: `A square pyramid has a base ${s} by ${s} centimeters. Each of its 4 triangles has base ${s} and height ${t}. What is the surface area?`,
    visual: { kind: "shape", shape: "pyramid" },
    unit: "cm²",
    ...keypad(s * s + 2 * s * t),
    hint: "Add the square base and the 4 triangles.",
    explain: `${s} × ${s} = ${s * s}. 4 triangles: 4 × ${s} × ${t} ÷ 2 = ${2 * s * t}. Total ${s * s + 2 * s * t} cm².`,
  };
}

/** 6.G.A.2 — volume of boxes with fraction edge lengths. */
export function fractionEdgeVolume(): Question {
  const kind = rand(0, 3);
  const [L, W, H] = [rand(1, 8), rand(1, 6), rand(1, 6)];
  const half = (n: number) => fracStr(n, 2);
  if (kind === 0) {
    return {
      key: `fv-cubes-${L}-${W}-${H}`,
      prompt: `How many 1/2 cm cubes fill a ${half(L)} × ${half(W)} × ${half(H)} cm box?`,
      speech: talk(`How many cubes with 1/2 centimeter edges fill a box that is ${half(L)} by ${half(W)} by ${half(H)} centimeters?`),
      visual: { kind: "box", l: L / 2, w: W / 2, h: H / 2, unit: "cm" },
      unit: "cubes",
      ...keypad(L * W * H),
      hint: "How many 1/2s fit along each edge? Multiply those three numbers.",
      explain: `${L} × ${W} × ${H} = ${L * W * H} half-cubes fit.`,
    };
  }
  if (kind === 1) {
    const l = L + 2;
    return {
      key: `fv-vol-${l}-${W}-${H}`,
      prompt: `Find the volume: ${half(l)} cm × ${half(W)} cm × ${half(H)} cm.`,
      speech: talk(`Find the volume of a box that is ${half(l)} by ${half(W)} by ${half(H)} centimeters.`),
      visual: { kind: "box", l: l / 2, w: W / 2, h: H / 2, unit: "cm" },
      unit: "cm³",
      ...keypad((l * W * H) / 8),
      hint: "V = l × w × h. Decimals help: 1/2 = 0.5.",
      explain: `${ds(l / 2)} × ${ds(W / 2)} × ${ds(H / 2)} = ${ds((l * W * H) / 8)} cm³`,
    };
  }
  if (kind === 2) {
    const B = rand(11, 99);
    const h = rand(2, 9);
    return {
      key: `fv-bh-${B}-${h}`,
      prompt: `Base area ${ds(B / 10)} cm², height ${h} cm. Volume?`,
      speech: `A prism has a base area of ${ds(B / 10)} square centimeters and a height of ${h} centimeters. What is its volume?`,
      visual: NONE,
      unit: "cm³",
      ...keypad(sh(B * h, -1)),
      hint: "V = base area × height.",
      explain: `${ds(B / 10)} × ${h} = ${ds((B * h) / 10)} cm³`,
    };
  }
  const k = rand(2, 5);
  const n = rand(1, 3);
  return {
    key: `fv-unit-${k}-${n}`,
    prompt: `How many 1/${k} cm cubes fit in a ${n} cm cube?`,
    speech: talk(`How many cubes with 1/${k} centimeter edges fit inside a cube with ${n} centimeter edges?`),
    visual: { kind: "box", l: n, w: n, h: n, unit: "cm" },
    unit: "cubes",
    ...keypad((k * n) ** 3),
    hint: `${k * n} small cubes fit along each edge.`,
    explain: `${k * n} × ${k * n} × ${k * n} = ${(k * n) ** 3}`,
  };
}

/* ================================================================ 11. Data (G5–6) */

const STAT_QS: [string, string][] = [
  ["How many pets do students in my class have?", "How many pets does Zoe have?"],
  ["How tall are the players on our team?", "How tall is the coach?"],
  ["How long do 6th graders sleep each night?", "How long did I sleep last night?"],
  ["How old are the people at the park?", "How old is the park ranger?"],
  ["How many books did each student read this month?", "How many books are on this shelf?"],
  ["What do students at our school eat for lunch?", "What did Ben eat for lunch today?"],
  ["How much do the cats at the shelter weigh?", "How much does my cat weigh?"],
  ["How many minutes do kids spend on homework?", "How many minutes long is recess today?"],
];
const MEASURED: [string, string][] = [
  ["How many hours do you sleep?", "Hours of sleep"],
  ["How tall are you, in cm?", "Height in centimeters"],
  ["How many pets do you have?", "Number of pets"],
  ["How many minutes is your walk to school?", "Minutes walking to school"],
  ["How many books did you read this year?", "Number of books read"],
  ["What size shoe do you wear?", "Shoe size"],
];

/** 6.SP.A.1, 6.SP.B.5b — statistical questions; what was measured. */
export function statQuestions(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, STAT_QS.length - 1);
    const others = shuffle(STAT_QS.filter((_, j) => j !== i)).slice(0, 3).map((p) => p[1]);
    return {
      key: `sq-which-${i}`,
      prompt: "Which is a statistical question?",
      speech: "Which is a statistical question? It expects answers that vary.",
      visual: NONE,
      ...label(STAT_QS[i][0], others),
      hint: "A statistical question has many different answers, not just one.",
      explain: `"${STAT_QS[i][0]}" gets lots of different answers, so it's statistical.`,
    };
  }
  if (kind === 1) {
    const i = rand(0, STAT_QS.length - 1);
    const stat = rand(0, 1) === 1;
    const q = STAT_QS[i][stat ? 0 : 1];
    return {
      key: `sq-yn-${i}-${stat}`,
      prompt: `Statistical question? "${q}"`,
      speech: `Is this a statistical question? ${q}`,
      visual: NONE,
      ...label(stat ? "Yes" : "No", [stat ? "No" : "Yes"]),
      hint: "Would you collect many answers that vary, or find just one answer?",
      explain: stat ? "Yes: the answers vary, so you'd collect data." : "No: there's just one answer.",
    };
  }
  const i = rand(0, MEASURED.length - 1);
  const [q, attr] = MEASURED[i];
  return {
    key: `sq-attr-${i}`,
    prompt: `Survey: "${q}" What is measured?`,
    speech: `A survey asks: ${q} What is being measured?`,
    visual: NONE,
    ...label(attr, shuffle(MEASURED.filter((_, j) => j !== i)).map((m) => m[1])),
    hint: "What would each person's answer be about?",
    explain: `Each answer tells you something about: ${attr.toLowerCase()}. That's what is measured.`,
  };
}

/** A dot plot's worth of whole-number data with one clear peak. */
function moundData(lo: number, hi: number, n: number): number[] {
  for (;;) {
    const peak = rand(lo + 1, hi - 1);
    const vals = Array.from({ length: n }, () => Math.max(lo, Math.min(hi, peak + rand(-2, 2) + (rand(0, 3) === 0 ? rand(-2, 2) : 0))));
    const counts = new Map<number, number>();
    vals.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
    const top = Math.max(...counts.values());
    if ([...counts.values()].filter((c) => c === top).length === 1) return vals;
  }
}

const modeOf = (vals: number[]) => {
  const counts = new Map<number, number>();
  vals.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

/** 5.MD.B.2, 6.SP.A.2, 6.SP.B.4, 6.SP.B.5a — line plots, dot plots and histograms. */
export function dotPlots(): Question {
  const kind = rand(0, 4);
  const lbl = pick(["Goals per game", "Pets per student", "Hours of sleep", "Books read"]);
  if (kind <= 2) {
    const vals = moundData(0, 10, rand(8, 16));
    const visual: Visual = { kind: "dots", values: sorted(vals), min: 0, max: 10, label: lbl };
    if (kind === 0) {
      return {
        key: `dp-count-${sorted(vals).join(".")}`,
        prompt: "How many data values are in the dot plot?",
        speech: `The dot plot shows ${lbl.toLowerCase()}. How many data values are there?`,
        visual,
        needsVisual: true,
        ...keypad(vals.length),
        hint: "Each dot is one value. Count every dot.",
        explain: `There are ${vals.length} dots, so ${vals.length} observations.`,
      };
    }
    if (kind === 1) {
      const m = modeOf(vals);
      return {
        key: `dp-peak-${sorted(vals).join(".")}`,
        prompt: "Which value has the most dots (the peak)?",
        speech: `The dot plot shows ${lbl.toLowerCase()}. Which value has the most dots?`,
        visual,
        needsVisual: true,
        ...keypad(m),
        hint: "Find the tallest stack of dots.",
        explain: `The tallest stack is at ${m}. That's the peak of the data's shape.`,
      };
    }
    const t = rand(3, 7);
    return {
      key: `dp-above-${t}-${sorted(vals).join(".")}`,
      prompt: `How many values are greater than ${t}?`,
      speech: `The dot plot shows ${lbl.toLowerCase()}. How many values are greater than ${t}?`,
      visual,
      needsVisual: true,
      ...keypad(vals.filter((v) => v > t).length),
      hint: `Count the dots to the right of ${t}. Don't count ${t} itself.`,
      explain: `${vals.filter((v) => v > t).length} dots are to the right of ${t}.`,
    };
  }
  if (kind === 3) {
    const d = pick([4, 8]);
    const nums = Array.from({ length: rand(6, 10) }, () => rand(1, d));
    const k = pick(nums);
    const count = nums.filter((v) => v === k).length;
    const thing = pick([["Rain (inches)", "inch"], ["Sand bags (lb)", "pound"], ["Water in beakers (L)", "liter"]]);
    const total = rand(0, 1) === 1;
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    if (!total && lo === hi) return dotPlots();
    return {
      key: `dp-frac-${total}-${d}-${k}-${sorted(nums).join(".")}`,
      prompt: total ? `What is the total of all the ${fracStr(k, d)} ${thing[1]} values?` : "How much more is the biggest value than the smallest?",
      speech: talk(total ? `The line plot shows ${thing[0]}. What is the total of all the ${fracStr(k, d)} ${thing[1]} values?` : `The line plot shows ${thing[0]}. How much more is the biggest value than the smallest?`),
      visual: { kind: "dots", values: sorted(nums.map((v) => v / d)), min: 0, max: 1, label: thing[0] },
      needsVisual: true,
      ...(total
        ? label(fracStr(count * k, d), [fracStr(k, d * count), fracStr(count * k + 1, d), fracStr(count + k, d), fracStr(count * k, d * 2)])
        : label(fracStr(hi - lo, d), [fracStr(hi + lo, d), fracStr(hi, d), fracStr(hi - lo + 1, d), fracStr(hi - lo, d * 2)])),
      hint: total ? `Count the dots at ${fracStr(k, d)}, then multiply.` : "Find the dots farthest right and farthest left. Subtract.",
      explain: total ? `${count} × ${fracStr(k, d)} = ${fracStr(count * k, d)}` : `${fracStr(hi, d)} − ${fracStr(lo, d)} = ${fracStr(hi - lo, d)}`,
    };
  }
  const bins = ["0–9", "10–19", "20–29", "30–39", "40–49"];
  const items = bins.map((b) => ({ label: b, value: rand(1, 9) }));
  const ask = rand(-1, 4);
  return {
    key: `dp-hist-${ask}-${items.map((i) => i.value).join(".")}`,
    prompt: ask < 0 ? "How many scores are in the histogram?" : `How many scores are ${bins[ask]}?`,
    speech: ask < 0 ? "The histogram shows test scores. How many scores are there in all?" : `The histogram shows test scores. How many scores are from ${bins[ask].replace("–", " to ")}?`,
    visual: { kind: "bars", title: "Test scores", items, max: 10, step: 2 },
    needsVisual: true,
    ...keypad(ask < 0 ? sum(items.map((i) => i.value)) : items[ask].value),
    hint: ask < 0 ? "Add up the heights of all the bars." : "Read the height of that bar.",
    explain: ask < 0 ? `${items.map((i) => i.value).join(" + ")} = ${sum(items.map((i) => i.value))}` : `The ${bins[ask]} bar is ${items[ask].value} tall.`,
  };
}

/** Whole-number data with a whole-number mean. */
function meanData(n: number): [number[], number] {
  for (;;) {
    const m = rand(4, 20);
    const devs = Array.from({ length: n - 1 }, () => rand(-5, 5));
    const last = -sum(devs);
    const vals = [...devs, last].map((d) => m + d);
    if (Math.abs(last) <= 7 && vals.every((v) => v > 0)) return [vals, m];
  }
}

/** 6.SP.A.3, 6.SP.B.5c — the mean as a fair share and a balance point. */
export function meanLevel(): Question {
  const kind = rand(0, 3);
  const [vals, m] = meanData(rand(4, 6));
  if (kind === 0) {
    return {
      key: `mn-${vals.join(".")}`,
      prompt: `Find the mean: ${vals.join(", ")}`,
      speech: `Find the mean of ${vals.join(", ")}.`,
      visual: NONE,
      ...keypad(m),
      hint: "Add all the values, then divide by how many there are.",
      explain: `${vals.join(" + ")} = ${sum(vals)}. ${sum(vals)} ÷ ${vals.length} = ${m}.`,
    };
  }
  if (kind === 1) {
    const shown = vals.slice(0, -1);
    const miss = vals[vals.length - 1];
    return {
      key: `mn-miss-${vals.join(".")}`,
      prompt: `Mean of ${vals.length} scores: ${m}. Others: ${shown.join(", ")}. Missing one?`,
      speech: `The mean of ${vals.length} scores is ${m}. The others are ${shown.join(", ")}. What is the missing score?`,
      visual: NONE,
      ...keypad(miss),
      hint: `The total must be ${vals.length} × ${m}. Subtract the scores you know.`,
      explain: `${vals.length} × ${m} = ${sum(vals)}. ${sum(vals)} − ${sum(shown)} = ${miss}.`,
    };
  }
  if (kind === 2) {
    const names = ["Ava", "Ben", "Cy", "Dee", "Eli", "Fay"];
    return {
      key: `mn-bars-${vals.join(".")}`,
      prompt: "Share the stickers equally. How many does each get?",
      speech: "The bar graph shows how many stickers each friend has. If they share them equally, how many does each get?",
      visual: { kind: "bars", title: "Stickers", items: vals.map((v, i) => ({ label: names[i], value: v })), max: Math.ceil((Math.max(...vals) + 1) / 5) * 5, step: 5 },
      needsVisual: true,
      ...keypad(m),
      hint: "Sharing equally gives the mean: add them all, then divide by the number of friends.",
      explain: `Total ${sum(vals)} ÷ ${vals.length} friends = ${m} each.`,
    };
  }
  const bank: [string, string, string[]][] = [
    ["The mean describes the…", "center of the data", ["spread of the data", "number of values", "biggest value"]],
    ["The median describes the…", "center of the data", ["spread of the data", "number of values", "smallest value"]],
    ["The range describes the…", "spread of the data", ["center of the data", "most common value", "number of values"]],
    ["The IQR describes the…", "spread of the middle half", ["center of the data", "most common value", "number of values"]],
  ];
  const i = rand(0, bank.length - 1);
  return {
    key: `mn-idea-${i}`,
    prompt: bank[i][0],
    speech: bank[i][0].replace("…", " what?"),
    visual: NONE,
    ...label(bank[i][1], bank[i][2]),
    hint: "Mean and median are 'typical value' numbers. Range and IQR say how spread out the data is.",
    explain: `${bank[i][0].replace("…", "")} ${bank[i][1]}.`,
  };
}

/** 6.SP.A.2, 6.SP.A.3, 6.SP.B.5c — median, mode and range. */
export function medianModeRange(): Question {
  const kind = rand(0, 4);
  if (kind <= 1) {
    const n = kind === 0 ? pick([5, 7]) : 6;
    const vals = distinct(n, 1, 40);
    const s = sorted(vals);
    const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return {
      key: `mm-med-${vals.join(".")}`,
      prompt: `Find the median: ${vals.join(", ")}`,
      speech: `Find the median of ${vals.join(", ")}.`,
      visual: NONE,
      ...keypad(med),
      hint: n % 2 ? "Put the numbers in order. The median is the middle one." : "Put them in order. With an even count, the median is halfway between the two middle numbers.",
      explain: `In order: ${s.join(", ")}. Median = ${ds(med)}.`,
    };
  }
  if (kind === 2) {
    const base = distinct(4, 1, 20);
    const mode = base[0];
    const vals = shuffle([...base, mode, ...(rand(0, 1) ? [mode] : [])]);
    return {
      key: `mm-mode-${vals.join(".")}`,
      prompt: `Find the mode: ${vals.join(", ")}`,
      speech: `Find the mode of ${vals.join(", ")}.`,
      visual: NONE,
      ...keypad(mode),
      hint: "The mode is the value that shows up most often.",
      explain: `${mode} appears most often.`,
    };
  }
  if (kind === 3) {
    const vals = distinct(rand(5, 7), 2, 60);
    return {
      key: `mm-range-${vals.join(".")}`,
      prompt: `Find the range: ${vals.join(", ")}`,
      speech: `Find the range of ${vals.join(", ")}.`,
      visual: NONE,
      ...keypad(Math.max(...vals) - Math.min(...vals)),
      hint: "Range = greatest value − least value.",
      explain: `${Math.max(...vals)} − ${Math.min(...vals)} = ${Math.max(...vals) - Math.min(...vals)}`,
    };
  }
  const vals = moundData(0, 10, pick([7, 9, 11, 13]));
  const s = sorted(vals);
  return {
    key: `mm-dots-${s.join(".")}`,
    prompt: "What is the median of the dot plot data?",
    speech: "What is the median of the data in the dot plot?",
    visual: { kind: "dots", values: s, min: 0, max: 10 },
    needsVisual: true,
    ...keypad(s[(s.length - 1) / 2]),
    hint: `There are ${s.length} dots. Count in from both ends to find the middle one.`,
    explain: `The middle (number ${(s.length + 1) / 2}) of ${s.length} values is ${s[(s.length - 1) / 2]}.`,
  };
}

/** 6.SP.B.4, 6.SP.B.5c, 6.SP.B.5d — box plots, IQR, MAD, and choosing a measure. */
export function spreadLevel(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const [mn, q1, med, q3, mx] = sorted(distinct(5, 0, 50));
    const visual: Visual = { kind: "boxplot", min: mn, q1, median: med, q3, max: mx, axis: [0, 50], label: "Points" };
    if (kind === 0) {
      return {
        key: `sp-iqr-${mn}-${q1}-${med}-${q3}-${mx}`,
        prompt: "What is the interquartile range (IQR)?",
        speech: `The box plot has quartiles at ${q1} and ${q3}. What is the interquartile range?`,
        visual,
        needsVisual: true,
        ...keypad(q3 - q1),
        hint: "IQR = upper quartile − lower quartile: the width of the box.",
        explain: `${q3} − ${q1} = ${q3 - q1}`,
      };
    }
    return {
      key: `sp-half-${mn}-${q1}-${med}-${q3}-${mx}`,
      prompt: "The middle half of the data is between…",
      speech: "Look at the box plot. The middle half of the data is between which two values?",
      visual,
      needsVisual: true,
      ...label(`${q1} and ${q3}`, [`${mn} and ${mx}`, `${q1} and ${med}`, `${med} and ${q3}`, `${mn} and ${med}`]),
      hint: "The box holds the middle 50% of the data.",
      explain: `The box goes from ${q1} to ${q3}.`,
    };
  }
  if (kind === 2) {
    const m = rand(8, 30);
    let [a, b] = distinct(2, 1, 7);
    if ((a + b) % 2) b = b === 7 ? b - 1 : b + 1;
    if (a === b) a = a === 1 ? 3 : a - 2;
    const vals = shuffle([m - a, m - b, m + b, m + a]);
    const mad = (a + b) / 2;
    return {
      key: `sp-mad-${vals.join(".")}`,
      prompt: `The mean of ${vals.join(", ")} is ${m}. Find the MAD.`,
      speech: `The mean of ${vals.join(", ")} is ${m}. What is the mean absolute deviation?`,
      visual: NONE,
      ...keypad(mad),
      hint: `Find how far each value is from ${m}. Then find the mean of those distances.`,
      explain: `Distances: ${vals.map((v) => Math.abs(v - m)).join(", ")}. Their mean is ${ds(mad)}.`,
    };
  }
  const base = Array.from({ length: 5 }, () => rand(20, 40));
  const out = rand(150, 400);
  const vals = shuffle([...base, out]);
  const q = rand(0, 2);
  const bank: [string, string, string[]][] = [
    ["Which measure of center fits best?", "Median", ["Mean"]],
    [`Which changes more because of ${out}?`, "Mean", ["Median"]],
    ["Which describes the spread better?", "IQR", ["Range"]],
  ];
  return {
    key: `sp-pick-${q}-${vals.join(".")}`,
    prompt: `Data: ${vals.join(", ")}. ${bank[q][0]}`,
    speech: `The data is ${vals.join(", ")}. ${bank[q][0]}`,
    visual: NONE,
    ...label(bank[q][1], bank[q][2]),
    hint: `${out} is an outlier: far away from the rest. Which measures does it pull a lot?`,
    explain: q === 1
      ? `The mean uses every value, so ${out} drags it up. The median barely moves.`
      : `${out} is an outlier. ${bank[q][1]} isn't pulled much by it, so it describes the data better.`,
  };
}

/* ====================================================== 12. Angles & circles (G7) */

/** 7.G.B.5 — supplementary, complementary, vertical and adjacent angles. */
export function anglePairs(): Question {
  const kind = rand(0, 5);
  const a = rand(2, 16) * 10 + pick([0, 5, 2, 8]);
  if (kind === 0) {
    const x = Math.min(a, 170);
    return {
      key: `ang-supp-${x}`,
      prompt: `Two angles make a straight line. One is ${x}°. The other?`,
      speech: `Two angles together make a straight line. One is ${x} degrees. What is the other?`,
      visual: { kind: "angle", mode: "line", angles: [x, 180 - x] },
      unit: "°",
      ...keypad(180 - x),
      hint: "Angles on a straight line are supplementary: they add to 180°.",
      explain: `180 − ${x} = ${180 - x}°`,
    };
  }
  if (kind === 1) {
    const x = rand(10, 80);
    return {
      key: `ang-comp-${x}`,
      prompt: `Two angles are complementary. One is ${x}°. The other?`,
      speech: `Two angles are complementary. One is ${x} degrees. What is the other?`,
      visual: { kind: "protractor", angle: x, scale: false },
      unit: "°",
      ...keypad(90 - x),
      hint: "Complementary angles add up to 90°: a right angle.",
      explain: `90 − ${x} = ${90 - x}°`,
    };
  }
  if (kind === 2) {
    const x = Math.min(a, 170);
    const opp = rand(0, 1) === 1;
    return {
      key: `ang-vert-${x}-${opp}`,
      prompt: opp ? `Two lines cross. One angle is ${x}°. The angle opposite it?` : `Two lines cross. One angle is ${x}°. The angle next to it?`,
      speech: `Two lines cross. One angle is ${x} degrees. What is the angle ${opp ? "opposite it" : "next to it"}?`,
      visual: { kind: "lines", type: "intersecting" },
      unit: "°",
      ...keypad(opp ? x : 180 - x),
      hint: opp ? "Vertical (opposite) angles are equal." : "Angles next to each other on a line add to 180°.",
      explain: opp ? `Vertical angles match: ${x}°.` : `180 − ${x} = ${180 - x}°`,
    };
  }
  if (kind === 3) {
    const b = rand(40, 150);
    const c = rand(30, Math.min(150, 330 - b));
    return {
      key: `ang-around-${b}-${c}`,
      prompt: `Angles around a point: ${b}°, ${c}° and ?`,
      speech: `Three angles fit around a point. Two are ${b} and ${c} degrees. What is the third?`,
      visual: { kind: "angle", mode: "around", angles: [b, c, 360 - b - c] },
      unit: "°",
      ...keypad(360 - b - c),
      hint: "Angles all the way around a point add to 360°.",
      explain: `360 − ${b} − ${c} = ${360 - b - c}°`,
    };
  }
  if (kind === 4) {
    const supp = rand(0, 1) === 1;
    const total = supp ? 180 : 90;
    const sums = (supp ? [2, 3, 4, 5, 6, 9, 10] : [2, 3, 5, 6, 9, 10]).filter((s) => total % s === 0);
    const sTot = pick(sums);
    const k = rand(1, sTot - 1);
    const m = sTot - k;
    const eq: Token[] = [{ x: k }, "+", { x: m }, "=", total];
    return {
      key: `ang-eq-${supp}-${k}-${m}`,
      prompt: `${supp ? "Supplementary" : "Complementary"} angles: ${k === 1 ? "" : k}x° and ${m === 1 ? "" : m}x°. Find x.`,
      speech: `Two angles are ${supp ? "supplementary" : "complementary"}. They measure ${k}x and ${m}x degrees. What is x?`,
      equation: eq,
      answerLine: X_LINE,
      visual: NONE,
      ...keypad(total / sTot),
      hint: `They add to ${total}°. Combine the x-terms first.`,
      explain: `${sTot}x = ${total}, so x = ${total / sTot}.`,
    };
  }
  const T = rand(6, 17) * 10;
  const p = rand(1, T / 10 - 1) * 10 + pick([0, 5]);
  return {
    key: `ang-adj-${T}-${p}`,
    prompt: `∠ABC is ${T}°. Ray BD splits it. ∠ABD is ${p}°. ∠DBC?`,
    speech: `Angle ABC is ${T} degrees. Ray BD splits it into two adjacent angles. Angle ABD is ${p} degrees. What is angle DBC?`,
    visual: { kind: "angle", mode: "parts", angles: [p, T - p] },
    unit: "°",
    ...keypad(T - p),
    hint: "The two adjacent angles add up to the whole angle.",
    explain: `${T} − ${p} = ${T - p}°`,
  };
}

/** 7.G.A.2 — triangles from given conditions: side and angle rules. */
export function triangleRules(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [a, b, c] = sorted([rand(2, 15), rand(2, 15), rand(2, 15)]);
    const ok = a + b > c;
    return {
      key: `tr-yn-${a}-${b}-${c}`,
      prompt: `Can sides ${a}, ${b} and ${c} cm make a triangle?`,
      speech: `Can sides of ${a}, ${b} and ${c} centimeters make a triangle?`,
      visual: NONE,
      ...label(ok ? "Yes" : "No", [ok ? "No" : "Yes"]),
      hint: "The two shorter sides must add up to MORE than the longest side.",
      explain: `${a} + ${b} = ${a + b}, which is ${ok ? "more" : "not more"} than ${c}. ${ok ? "Yes!" : "No."}`,
    };
  }
  if (kind === 1) {
    const [a, b] = distinct(2, 3, 12);
    const lo = Math.abs(a - b);
    const hi = a + b;
    const c = rand(lo + 1, hi - 1);
    return {
      key: `tr-third-${Math.min(a, b)}-${Math.max(a, b)}-${c}`,
      prompt: `Two sides are ${a} cm and ${b} cm. Which could be the third side?`,
      speech: `A triangle has sides of ${a} and ${b} centimeters. Which could be the third side?`,
      visual: NONE,
      answer: c,
      input: "choices",
      choices: shuffle([c, hi, hi + rand(1, 4), ...(lo > 0 ? [lo] : [hi + 6])]),
      hint: `The third side must be longer than ${Math.max(a, b)} − ${Math.min(a, b)} and shorter than ${a} + ${b}.`,
      explain: `It must be between ${lo} and ${hi}. ${c} works.`,
    };
  }
  if (kind === 2) {
    const a = rand(20, 100);
    const b = rand(20, 160 - a);
    return {
      key: `tr-angle-${a}-${b}`,
      prompt: `A triangle has angles ${a}° and ${b}°. The third?`,
      speech: `A triangle has angles of ${a} and ${b} degrees. What is the third angle?`,
      visual: { kind: "angle", mode: "triangle", angles: [a, b, 180 - a - b] },
      unit: "°",
      ...keypad(180 - a - b),
      hint: "The angles in any triangle add up to 180°.",
      explain: `180 − ${a} − ${b} = ${180 - a - b}°`,
    };
  }
  const angles = rand(0, 1) === 1;
  if (angles) {
    const a = rand(30, 80);
    const b = rand(30, 80);
    const good = rand(0, 1) === 1;
    const c = good ? 180 - a - b : 180 - a - b + pick([-10, 10, 20]);
    return {
      key: `tr-many-a-${a}-${b}-${c}`,
      prompt: `How many triangles have angles ${a}°, ${b}°, ${c}°?`,
      speech: `How many different triangles have angles of ${a}, ${b} and ${c} degrees?`,
      visual: NONE,
      ...label(good ? "More than one" : "None", ["None", "Exactly one", "More than one"].filter((s) => s !== (good ? "More than one" : "None")), true),
      hint: "Angles must add to 180°. If they do, the same angles work for big and small triangles.",
      explain: good ? `They add to 180°, and you can draw them at any size: more than one.` : `${a} + ${b} + ${c} = ${a + b + c}, not 180°. None.`,
    };
  }
  const [x, y, z] = sorted([rand(3, 12), rand(3, 12), rand(3, 12)]);
  const ok = x + y > z;
  return {
    key: `tr-many-s-${x}-${y}-${z}`,
    prompt: `How many triangles have sides ${x}, ${y} and ${z} cm?`,
    speech: `How many different triangles have sides of ${x}, ${y} and ${z} centimeters?`,
    visual: NONE,
    ...label(ok ? "Exactly one" : "None", ["None", "Exactly one", "More than one"].filter((s) => s !== (ok ? "Exactly one" : "None")), true),
    hint: "Three side lengths fix the triangle's shape and size, if they can meet at all.",
    explain: ok ? `${x} + ${y} > ${z}, and three sides make just one triangle.` : `${x} + ${y} is not more than ${z}, so the sides can't meet. None.`,
  };
}

type SliceSolid = Extract<Visual, { kind: "slice" }>["solid"];
type SliceCut = Extract<Visual, { kind: "slice" }>["cut"];
const SLICE_PICS: Record<number, [SliceSolid, SliceCut]> = {
  0: ["cube", "horizontal"], 1: ["prism", "horizontal"], 2: ["cylinder", "horizontal"], 3: ["cylinder", "vertical"],
  4: ["cone", "horizontal"], 5: ["cone", "vertical"], 6: ["sphere", "horizontal"], 7: ["pyramid", "horizontal"],
  8: ["pyramid", "vertical"], 11: ["cube", "diagonal"], 12: ["cylinder", "diagonal"],
};
const SLICES: [string, string, string, ShapeName][] = [
  ["cube", "parallel to a face", "square", "cube"],
  ["box", "parallel to its base", "rectangle", "prism"],
  ["cylinder", "parallel to its base", "circle", "cylinder"],
  ["cylinder", "top to bottom through the middle", "rectangle", "cylinder"],
  ["cone", "parallel to its base", "circle", "cone"],
  ["cone", "top to bottom through the tip", "triangle", "cone"],
  ["sphere", "straight through", "circle", "sphere"],
  ["square pyramid", "parallel to its base", "square", "pyramid"],
  ["square pyramid", "top to bottom through the tip", "triangle", "pyramid"],
  ["cube", "to cut off one corner", "triangle", "cube"],
  ["triangular prism", "parallel to its ends", "triangle", "triangular-prism"],
  ["cube", "from edge to opposite edge", "rectangle", "cube"],
  ["cylinder", "on a slant through the sides", "oval", "cylinder"],
  ["square pyramid", "top to bottom, missing the tip", "trapezoid", "pyramid"],
];
const SLICE_SHAPES = ["square", "rectangle", "circle", "triangle", "oval", "trapezoid", "pentagon", "hexagon"];

/** 7.G.A.3 — the 2D shapes you get by slicing 3D figures. */
export function slices(): Question {
  const i = rand(0, SLICES.length - 1);
  const [solid, cut, shape, pic] = SLICES[i];
  return {
    key: `sl-${i}`,
    prompt: `Slice a ${solid} ${cut}. What shape?`,
    speech: `Imagine slicing a ${solid} ${cut}. What shape is the flat cut face?`,
    visual: SLICE_PICS[i] ? { kind: "slice", solid: SLICE_PICS[i][0], cut: SLICE_PICS[i][1] } : { kind: "shape", shape: pic },
    ...label(shape, SLICE_SHAPES.filter((s) => s !== shape)),
    hint: "Picture the knife going through. What outline does the flat face have?",
    explain: `Slicing a ${solid} ${cut} makes ${/^[aeiou]/.test(shape) ? "an" : "a"} ${shape}.`,
  };
}

/** 7.G.B.4 — area and circumference of circles. */
export function circles(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const d = rand(2, 20);
    return {
      key: `ci-cd-${d}`,
      prompt: `Diameter ${d} cm. Circumference? Use π ≈ 3.14.`,
      speech: `A circle has a diameter of ${d} centimeters. What is its circumference? Use 3.14 for pi.`,
      visual: { kind: "circle", r: d / 2, show: "diameter", unit: "cm" },
      unit: "cm",
      ...keypad(sh(314 * d, -2)),
      hint: "Circumference = π × diameter.",
      explain: `3.14 × ${d} = ${ds(sh(314 * d, -2))} cm`,
    };
  }
  if (kind === 1) {
    const r = rand(1, 12);
    return {
      key: `ci-cr-${r}`,
      prompt: `Radius ${r} cm. Circumference? Use π ≈ 3.14.`,
      speech: `A circle has a radius of ${r} centimeters. What is its circumference? Use 3.14 for pi.`,
      visual: { kind: "circle", r, show: "radius", unit: "cm" },
      unit: "cm",
      ...keypad(sh(628 * r, -2)),
      hint: "Circumference = 2 × π × radius (the diameter is twice the radius).",
      explain: `2 × 3.14 × ${r} = ${ds(sh(628 * r, -2))} cm`,
    };
  }
  if (kind === 2) {
    const fromD = rand(0, 1) === 1;
    const r = rand(1, 10);
    return {
      key: `ci-a-${r}-${fromD}`,
      prompt: `${fromD ? `Diameter ${2 * r}` : `Radius ${r}`} cm. Area? Use π ≈ 3.14.`,
      speech: `A circle has a ${fromD ? `diameter of ${2 * r}` : `radius of ${r}`} centimeters. What is its area? Use 3.14 for pi.`,
      visual: { kind: "circle", r, show: fromD ? "diameter" : "radius", unit: "cm" },
      unit: "cm²",
      ...keypad(sh(314 * r * r, -2)),
      hint: fromD ? "Halve the diameter to get the radius. Area = π × r × r." : "Area = π × r × r.",
      explain: `3.14 × ${r} × ${r} = ${ds(sh(314 * r * r, -2))} cm²`,
    };
  }
  if (kind === 3) {
    const d = rand(2, 20);
    return {
      key: `ci-back-${d}`,
      prompt: `Circumference ${ds(sh(314 * d, -2))} cm. Diameter? (π ≈ 3.14)`,
      speech: `A circle's circumference is ${ds(sh(314 * d, -2))} centimeters. What is its diameter? Use 3.14 for pi.`,
      visual: NONE,
      unit: "cm",
      ...keypad(d),
      hint: "Circumference = π × d, so d = circumference ÷ π.",
      explain: `${ds(sh(314 * d, -2))} ÷ 3.14 = ${d} cm`,
    };
  }
  if (kind === 4) {
    const k = rand(1, 6);
    return {
      key: `ci-22-${k}`,
      prompt: `Use π ≈ 22/7. Diameter ${7 * k} cm. Circumference?`,
      speech: `Use 22 sevenths for pi. A circle has a diameter of ${7 * k} centimeters. What is its circumference?`,
      visual: { kind: "circle", r: (7 * k) / 2, show: "diameter", unit: "cm" },
      unit: "cm",
      ...keypad(22 * k),
      hint: `${7 * k} ÷ 7 is easy! Then multiply by 22.`,
      explain: `22/7 × ${7 * k} = 22 × ${k} = ${22 * k} cm`,
    };
  }
  const f = rand(2, 3);
  const what = rand(0, 1) === 1;
  const times = what ? f * f : f;
  return {
    key: `ci-scale-${f}-${what}`,
    prompt: `The radius gets ${f} times bigger. The ${what ? "area" : "circumference"} is…`,
    speech: `A circle's radius gets ${f} times bigger. What happens to its ${what ? "area" : "circumference"}?`,
    visual: { kind: "circle", r: f, show: "radius", unit: "" },
    ...label(`${times} times as big`, [`${what ? f : f * f} times as big`, "the same", `${times + 1} times as big`]),
    hint: what ? "Area uses r × r, so both r's grow." : "Circumference uses r once.",
    explain: what ? `r × r grows by ${f} × ${f} = ${times}.` : `C = 2πr grows by ${f}.`,
  };
}

/** 7.G.A.1 — scale drawings and maps. */
export function scaleDrawings(): Question {
  const kind = rand(0, 4);
  if (kind <= 1) {
    const s = pick([2, 5, 10, 20, 25, 50]);
    const m = rand(2, 12);
    const back = kind === 1;
    return {
      key: `sd-map-${s}-${m}-${back}`,
      prompt: back ? `Map: 1 cm = ${s} km. Towns are ${s * m} km apart. Map cm?` : `Map: 1 cm = ${s} km. Towns are ${m} cm apart. Real km?`,
      speech: back
        ? `On a map, 1 centimeter stands for ${s} kilometers. Two towns are really ${s * m} kilometers apart. How far apart are they on the map?`
        : `On a map, 1 centimeter stands for ${s} kilometers. Two towns are ${m} centimeters apart on the map. How far apart are they really?`,
      visual: { kind: "table", header: ["Map (cm)", "Real (km)"], rows: [[1, s], back ? ["?", s * m] : [m, "?"]] },
      unit: back ? "cm" : "km",
      ...keypad(back ? m : s * m),
      hint: back ? `How many ${s}s are in ${s * m}?` : `Each cm is ${s} km. Multiply.`,
      explain: back ? `${s * m} ÷ ${s} = ${m} cm` : `${m} × ${s} = ${s * m} km`,
    };
  }
  if (kind === 2) {
    const [a, b] = [rand(1, 4), rand(2, 6)];
    const k = rand(2, 8);
    return {
      key: `sd-plan-${a}-${b}-${k}`,
      prompt: `Plan: ${a} cm = ${b} m. A wall is ${a * k} cm on the plan. Real length?`,
      speech: `On a floor plan, ${a} centimeters stands for ${b} meters. A wall is ${a * k} centimeters on the plan. How long is the real wall?`,
      visual: { kind: "table", header: ["Plan (cm)", "Real (m)"], rows: [[a, b], [a * k, "?"]] },
      unit: "m",
      ...keypad(b * k),
      hint: `How many groups of ${a} cm are in ${a * k} cm?`,
      explain: `${a * k} ÷ ${a} = ${k} groups. ${k} × ${b} = ${b * k} m.`,
    };
  }
  if (kind === 3) {
    const k = pick([10, 20, 25, 50]);
    const L = (k / gcd(k, 100)) * rand(1, 8);
    return {
      key: `sd-model-${k}-${L}`,
      prompt: `A model is 1:${k}. The real one is ${L} m long. Model length in cm?`,
      speech: `A model is built at a scale of 1 to ${k}. The real thing is ${L} meters long. How long is the model in centimeters?`,
      visual: NONE,
      unit: "cm",
      ...keypad((L * 100) / k),
      hint: `Change ${L} m to cm, then divide by ${k}.`,
      explain: `${L} m = ${L * 100} cm. ${L * 100} ÷ ${k} = ${(L * 100) / k} cm.`,
    };
  }
  const [w, h] = [rand(2, 8), rand(2, 6)];
  const s = rand(2, 5);
  return {
    key: `sd-area-${w}-${h}-${s}`,
    prompt: `A ${w} cm × ${h} cm drawing. 1 cm = ${s} m. Real area?`,
    speech: `A drawing is ${w} by ${h} centimeters. Each centimeter stands for ${s} meters. What is the real area?`,
    visual: { kind: "rect", w, h, showW: true, showH: true, grid: false, unit: "cm" },
    unit: "m²",
    ...keypad(w * s * h * s),
    hint: "Find the real length and real width first, then multiply.",
    explain: `${w} × ${s} = ${w * s} m and ${h} × ${s} = ${h * s} m. ${w * s} × ${h * s} = ${w * s * h * s} m².`,
  };
}

/** 7.G.B.6 — area, volume and surface area problems with prisms and composite shapes. */
export function solidProblems(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const b = 2 * rand(1, 5);
    const h = rand(2, 8);
    const L = rand(3, 12);
    return {
      key: `so-tri-${b}-${h}-${L}`,
      prompt: `Triangular prism: triangle base ${b}, height ${h}, length ${L} m. Volume?`,
      speech: `A tent is a triangular prism. The triangle has base ${b} and height ${h} meters, and the tent is ${L} meters long. What is its volume?`,
      visual: { kind: "shape", shape: "triangular-prism" },
      unit: "m³",
      ...keypad((b * h * L) / 2),
      hint: "Volume of a prism = area of the end × length.",
      explain: `Triangle: ${b} × ${h} ÷ 2 = ${(b * h) / 2}. × ${L} = ${(b * h * L) / 2} m³.`,
    };
  }
  if (kind === 1) {
    const [l, w, h] = [rand(4, 12), rand(3, 10), rand(2, 8)];
    return {
      key: `so-open-${l}-${w}-${h}`,
      prompt: `A box with no lid is ${l}×${w}×${h} cm. Outside area?`,
      speech: `A box with no lid is ${l} by ${w} by ${h} centimeters. How much cardboard covers the outside?`,
      visual: { kind: "box", l, w, h, unit: "cm" },
      unit: "cm²",
      ...keypad(l * w + 2 * l * h + 2 * w * h),
      hint: "Add the bottom and the 4 sides. There's no top!",
      explain: `${l * w} + 2 × ${l * h} + 2 × ${w * h} = ${l * w + 2 * l * h + 2 * w * h} cm²`,
    };
  }
  if (kind === 2) {
    const k = rand(2, 4);
    const [a, b, c] = [rand(2, 5), rand(2, 4), rand(1, 4)];
    return {
      key: `so-pack-${k}-${a}-${b}-${c}`,
      prompt: `How many ${k} cm cubes fit in a ${k * a}×${k * b}×${k * c} cm box?`,
      speech: `How many cubes with ${k} centimeter edges fit in a box ${k * a} by ${k * b} by ${k * c} centimeters?`,
      visual: { kind: "box", l: k * a, w: k * b, h: k * c, unit: "cm" },
      unit: "cubes",
      ...keypad(a * b * c),
      hint: `How many ${k} cm cubes fit along each edge?`,
      explain: `${a} × ${b} × ${c} = ${a * b * c} cubes.`,
    };
  }
  if (kind === 3) {
    const [a, b, c] = [rand(2, 6), rand(2, 5), rand(2, 5)];
    return {
      key: `so-tank-${a}-${b}-${c}`,
      prompt: `A tank is ${10 * a}×${10 * b}×${10 * c} cm. How many liters? (1 L = 1000 cm³)`,
      speech: `A fish tank is ${10 * a} by ${10 * b} by ${10 * c} centimeters. How many liters does it hold? 1 liter is 1000 cubic centimeters.`,
      visual: { kind: "box", l: 10 * a, w: 10 * b, h: 10 * c, unit: "cm" },
      unit: "L",
      ...keypad(a * b * c),
      hint: "Find the volume in cm³, then divide by 1,000.",
      explain: `${10 * a} × ${10 * b} × ${10 * c} = ${1000 * a * b * c} cm³ = ${a * b * c} L`,
    };
  }
  const b1 = rand(6, 12);
  const b2 = rand(2, b1 - 2);
  const h = 2 * rand(1, 4);
  const L = rand(3, 10);
  return {
    key: `so-trap-${b1}-${b2}-${h}-${L}`,
    prompt: `Trapezoid prism: sides ${b1} & ${b2}, height ${h}, length ${L} cm. Volume?`,
    speech: `A prism's end is a trapezoid with parallel sides ${b1} and ${b2} and height ${h}. The prism is ${L} centimeters long. What is its volume?`,
    visual: { kind: "polygon", shape: "trapezoid", base: b1, top: b2, height: h, unit: "cm" },
    unit: "cm³",
    ...keypad((((b1 + b2) * h) / 2) * L),
    hint: "Find the trapezoid's area, then multiply by the length.",
    explain: `(${b1} + ${b2}) × ${h} ÷ 2 = ${((b1 + b2) * h) / 2}. × ${L} = ${(((b1 + b2) * h) / 2) * L} cm³.`,
  };
}

/* ====================================================== 13. Chance & samples (G7) */

const LIKELY = ["Impossible", "Unlikely", "As likely as not", "Likely", "Certain"];
const likelyWord = (p: number) => (p === 0 ? LIKELY[0] : p < 0.5 ? LIKELY[1] : p === 0.5 ? LIKELY[2] : p < 1 ? LIKELY[3] : LIKELY[4]);
const PROB_TEXT: [string, number][] = [
  ["0", 0], ["0.1", 0.1], ["1/8", 0.125], ["0.25", 0.25], ["0.3", 0.3], ["2/5", 0.4], ["0.5", 0.5], ["1/2", 0.5],
  ["0.6", 0.6], ["3/4", 0.75], ["0.8", 0.8], ["0.9", 0.9], ["7/8", 0.875], ["1", 1], ["0.05", 0.05], ["0.95", 0.95],
];

/** 7.SP.C.5 — probability is a number from 0 to 1. */
export function likelihood(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, PROB_TEXT.length - 1);
    const [t, p] = PROB_TEXT[i];
    const right = likelyWord(p);
    return {
      key: `lk-word-${i}`,
      prompt: `A probability of ${t} means the event is…`,
      speech: talk(`A probability of ${t} means the event is what?`),
      visual: NONE,
      ...label(right, LIKELY.filter((w) => w !== right)),
      hint: "0 is impossible, 1/2 is a toss-up, 1 is certain.",
      explain: `${t} is ${p === 0 || p === 1 ? "at the end of" : p < 0.5 ? "below 1/2 on" : p === 0.5 ? "the middle of" : "above 1/2 on"} the 0-to-1 scale: ${right.toLowerCase()}.`,
    };
  }
  if (kind === 1) {
    const [c1, c2] = shuffle(MARBLE_COLOURS).slice(0, 2);
    const r = rand(0, 8);
    const b = r === 0 ? rand(1, 8) : rand(0, 8);
    const p = r / (r + b);
    const right = likelyWord(p);
    return {
      key: `lk-bag-${r}-${b}-${c1}-${c2}`,
      prompt: `Picking a ${COLOUR_WORD[c1]} marble is…`,
      speech: `You pick one marble without looking. Picking a ${COLOUR_WORD[c1]} marble is what?`,
      visual: { kind: "marbles", marbles: [{ colour: c1, count: r }, { colour: c2, count: b }].filter((m) => m.count > 0) },
      needsVisual: true,
      ...label(right, LIKELY.filter((w) => w !== right)),
      hint: `Compare the ${COLOUR_WORD[c1]} marbles to all the marbles.`,
      explain: `${r} of ${r + b} marbles are ${COLOUR_WORD[c1]}: ${right.toLowerCase()}.`,
    };
  }
  const bad = pick(["1.2", "−0.3", "5/4", "150%", "2", "−1/2"]);
  const good = shuffle(["0", "1", "0.7", "1/3", "45%", "0.05", "99%", "3/5"]).slice(0, 3);
  return {
    key: `lk-bad-${bad}-${sorted(good.map((g) => g.length * 100 + g.charCodeAt(0))).join(".")}`,
    prompt: "Which one can't be a probability?",
    speech: "Which one of these can't be a probability?",
    visual: NONE,
    ...label(bad, good),
    hint: "Probabilities go from 0 to 1 (0% to 100%). Nothing below 0 or above 1.",
    explain: `${bad} is ${bad.startsWith("−") ? "less than 0" : "more than 1"}, so it can't be a probability.`,
  };
}

const CUBE_EVENTS: [string, number][] = [
  ["an even number", 3], ["a number greater than 4", 2], ["a 6", 1], ["a number less than 3", 2], ["a prime number", 3],
  ["a multiple of 3", 2], ["a number from 1 to 6", 6], ["a 7", 0], ["an odd number", 3], ["a number greater than 1", 5],
];

/** 7.SP.C.7a, 7.SP.C.5 — probability with equally likely outcomes. */
export function simpleProbability(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const cols = shuffle(MARBLE_COLOURS).slice(0, rand(2, 3));
    const counts = cols.map(() => rand(1, 7));
    const T = sum(counts);
    const i = rand(0, cols.length - 1);
    const c = counts[i];
    return {
      key: `pb-bag-${cols.join("")}-${counts.join(".")}-${i}`,
      prompt: `What's the probability of picking ${COLOUR_WORD[cols[i]]}?`,
      speech: `You pick one marble without looking. What is the probability it is ${COLOUR_WORD[cols[i]]}?`,
      visual: { kind: "marbles", marbles: cols.map((colour, j) => ({ colour, count: counts[j] })) },
      needsVisual: true,
      ...label(fracStr(c, T), [fracStr(c, T - c || 1), fracStr(T - c, T), fracStr(c + 1, T), fracStr(1, T)]),
      hint: `Probability = ${COLOUR_WORD[cols[i]]} marbles ÷ all marbles.`,
      explain: `${c} out of ${T}: ${fracStr(c, T)}.`,
    };
  }
  if (kind === 1) {
    const i = rand(0, CUBE_EVENTS.length - 1);
    const [ev, k] = CUBE_EVENTS[i];
    return {
      key: `pb-cube-${i}`,
      prompt: `Roll a number cube (1–6). P(${ev})?`,
      speech: `You roll a number cube numbered 1 to 6. What is the probability of rolling ${ev}?`,
      visual: NONE,
      ...label(fracStr(k, 6), [fracStr(k + 1, 6), fracStr(6 - k, 6), fracStr(1, k + 1), fracStr(k, 12)]),
      hint: "List the outcomes that count. There are 6 equally likely outcomes in all.",
      explain: `${k} out of 6 outcomes: ${fracStr(k, 6)}.`,
    };
  }
  if (kind === 2) {
    const n = rand(4, 10);
    const k = rand(1, n - 1);
    return {
      key: `pb-spin-${n}-${k}`,
      prompt: `A spinner has ${n} equal parts. ${k} are green. P(green)?`,
      speech: `A spinner has ${n} equal parts, and ${k} of them are green. What is the probability of landing on green?`,
      visual: { kind: "spinner", sections: shuffle([...Array(k).fill("leaf"), ...Array(n - k).fill(pick(["sun", "wave", "berry"]))]).map((colour: Colour) => ({ colour })) },
      ...label(fracStr(k, n), [fracStr(n - k, n), fracStr(k, n - k), fracStr(k + 1, n), fracStr(1, n)]),
      hint: "Count the green parts out of all the parts.",
      explain: `${k} out of ${n}: ${fracStr(k, n)}.`,
    };
  }
  const P = rand(1, 19) * 5;
  const pct = rand(0, 1) === 1;
  return {
    key: `pb-not-${P}-${pct}`,
    prompt: pct ? `P(rain) = ${P}%. What is P(no rain)?` : `P(win) = ${ds(P / 100)}. What is P(not win)?`,
    speech: pct ? `The chance of rain is ${P} percent. What is the chance of no rain?` : `The probability of winning is ${ds(P / 100)}. What is the probability of not winning?`,
    visual: NONE,
    unit: pct ? "%" : undefined,
    ...keypad(pct ? 100 - P : sh(100 - P, -2)),
    hint: pct ? "Something either happens or not: the two chances add to 100%." : "The two probabilities add up to 1.",
    explain: pct ? `100 − ${P} = ${100 - P}%` : `1 − ${ds(P / 100)} = ${ds((100 - P) / 100)}`,
  };
}

/** 7.SP.C.6, 7.SP.C.7b — probability from experiments; predictions. */
export function experiments(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const n = pick([20, 25, 40, 50]);
    const b = rand(2, n - 2);
    const k = rand(2, 10);
    return {
      key: `xp-pred-${n}-${b}-${k}`,
      prompt: `Blue came up ${b} times in ${n} spins. About how many in ${n * k}?`,
      speech: `A spinner landed on blue ${b} times in ${n} spins. About how many blues would you expect in ${n * k} spins?`,
      visual: NONE,
      ...keypad(b * k),
      hint: `${n * k} spins is ${k} times as many as ${n}.`,
      explain: `${b}/${n} of ${n * k} = ${b} × ${k} = ${b * k}.`,
    };
  }
  if (kind === 1) {
    const [h, t] = [rand(5, 30), rand(5, 30)];
    const [A, B, thing] = pick([["Heads", "Tails", "coin"], ["Point up", "Point down", "tack"], ["Lands open", "Lands shut", "cup"]]);
    return {
      key: `xp-exp-${h}-${t}-${thing}`,
      prompt: `From the data, what's the experimental P(${A.toLowerCase()})?`,
      speech: `A ${thing} was tossed ${h + t} times. It landed ${A.toLowerCase()} ${h} times. What is the experimental probability of ${A.toLowerCase()}?`,
      visual: { kind: "table", header: ["Outcome", "Count"], rows: [[A, h], [B, t]] },
      needsVisual: true,
      ...label(fracStr(h, h + t), [fracStr(t, h + t), fracStr(h, t), "1/2", fracStr(h + 1, h + t)]),
      hint: "Experimental probability = times it happened ÷ total tries.",
      explain: `${h} out of ${h + t}: ${fracStr(h, h + t)}.`,
    };
  }
  if (kind === 2) {
    const coin = rand(0, 1) === 1;
    const N = coin ? 2 * rand(10, 300) : 6 * pick([10, 20, 30, 50, 100, 150, 200]);
    const face = coin ? "heads" : `${rand(1, 6)}s`;
    return {
      key: `xp-theory-${coin}-${N}-${face}`,
      prompt: coin ? `Flip a fair coin ${N} times. About how many heads?` : `Roll a fair number cube ${N} times. About how many ${face}?`,
      speech: coin ? `You flip a fair coin ${N} times. About how many heads do you expect?` : `You roll a fair number cube ${N} times. About how many ${face} do you expect?`,
      visual: NONE,
      ...keypad(coin ? N / 2 : N / 6),
      hint: coin ? "Heads should come up about 1/2 of the time." : "Each number should come up about 1/6 of the time.",
      explain: `${coin ? "1/2" : "1/6"} of ${N} = ${coin ? N / 2 : N / 6}.`,
    };
  }
  const cols = shuffle(MARBLE_COLOURS).slice(0, 3);
  const counts = distinct(3, 3, 30);
  const best = cols[counts.indexOf(Math.max(...counts))];
  return {
    key: `xp-most-${cols.join("")}-${counts.join(".")}`,
    prompt: "Based on the data, which colour seems most likely?",
    speech: "A bag of marbles was tested by picking and putting back. Based on the data, which colour seems most likely?",
    visual: { kind: "table", header: ["Colour", "Times picked"], rows: cols.map((c, i) => [COLOUR_WORD[c], counts[i]]) },
    needsVisual: true,
    ...label(COLOUR_WORD[best], cols.filter((c) => c !== best).map((c) => COLOUR_WORD[c])),
    hint: "The outcome that happened most often is probably the most likely.",
    explain: `${COLOUR_WORD[best]} was picked most: ${Math.max(...counts)} times.`,
  };
}

const SIMS: [string, string][] = [
  ["a 1 in 2 chance", "Flip a coin"],
  ["a 1 in 6 chance", "Roll a number cube"],
  ["a 1 in 4 chance", "Spin a 4-part spinner"],
  ["a 1 in 10 chance", "Pick a digit 0–9 at random"],
  ["a 1 in 3 chance", "Spin a 3-part spinner"],
];
const SUM_TABLE: Visual = {
  kind: "table",
  header: ["+", "1", "2", "3", "4", "5", "6"],
  rows: [1, 2, 3, 4, 5, 6].map((r) => [r, ...[1, 2, 3, 4, 5, 6].map((c) => r + c)]),
};

/** 7.SP.C.8a–c — compound events: sample spaces, probabilities and simulations. */
export function compoundEvents(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const s = rand(0, 3);
    const [a, b, c] = [rand(2, 6), rand(2, 5), rand(2, 4)];
    const bank: [string, number, string][] = [
      [`You have ${a} shirts and ${b} pants. How many outfits?`, a * b, `${a} × ${b}`],
      ["Flip a coin and roll a number cube. How many outcomes?", 12, "2 × 6"],
      [`Spin a ${a}-part spinner twice. How many outcomes?`, a * a, `${a} × ${a}`],
      [`Pick 1 of ${a} sandwiches, ${b} drinks and ${c} snacks. Combos?`, a * b * c, `${a} × ${b} × ${c}`],
    ];
    const [t, n, how] = bank[s];
    return {
      key: `ce-count-${s}-${a}-${b}-${c}`,
      prompt: t,
      speech: t,
      visual: NONE,
      ...keypad(n),
      hint: "Each choice for the first thing pairs with every choice for the next. Draw a tree or a table.",
      explain: `${how} = ${n}`,
    };
  }
  if (kind === 1) {
    const s = rand(0, 4);
    if (s === 4) {
      const total = rand(2, 12);
      const ways = 6 - Math.abs(7 - total);
      return {
        key: `ce-dice-${total}`,
        prompt: `Roll two number cubes. P(sum is ${total})?`,
        speech: `You roll two number cubes and add them. What is the probability that the sum is ${total}?`,
        visual: SUM_TABLE,
        ...label(fracStr(ways, 36), [fracStr(1, 12), fracStr(ways, 12), fracStr(ways + 1, 36), fracStr(1, total)]),
        hint: `Count the cells in the table that show ${total}. There are 36 cells in all.`,
        explain: `${ways} of 36 outcomes: ${fracStr(ways, 36)}.`,
      };
    }
    const [a, b] = [rand(2, 6), rand(2, 5)];
    const bank: [string, number, number][] = [
      ["Flip 2 coins. P(both heads)?", 1, 4],
      ["Flip 3 coins. P(all heads)?", 1, 8],
      [`Flip a coin and roll a number cube. P(heads and a ${rand(1, 6)})?`, 1, 12],
      [`Pick 1 of ${a} shirts and 1 of ${b} hats at random. P(a set pair)?`, 1, a * b],
    ];
    const [t, n, d] = bank[s];
    return {
      key: `ce-p-${s}-${t}`,
      prompt: t,
      speech: talk(t.replace("P(", "What is the probability of ").replace(")?", "?")),
      visual: NONE,
      ...label(fracStr(n, d), [fracStr(1, 2), fracStr(2, d), fracStr(1, d + 2), fracStr(1, d / 2 || 3)]),
      hint: "Count all the outcomes in the sample space. How many of them match?",
      explain: `1 matching outcome out of ${d}: ${fracStr(n, d)}.`,
    };
  }
  if (kind === 2) {
    const i = rand(0, SIMS.length - 1);
    return {
      key: `ce-sim-${i}`,
      prompt: `Which could simulate ${SIMS[i][0]}?`,
      speech: `Which tool could you use to simulate ${SIMS[i][0]}?`,
      visual: NONE,
      ...label(SIMS[i][1], SIMS.filter((_, j) => j !== i).map((x) => x[1])),
      hint: "The tool needs equally likely outcomes, with the right number of them.",
      explain: `${SIMS[i][1]}: it has outcomes matching ${SIMS[i][0]}.`,
    };
  }
  const s = rand(0, 2);
  const trees = [[["H", "T"], ["H", "T"]], [["R", "B"], ["H", "T"]], [["A", "B"], ["1", "2", "3"]]];
  const bank: [string, string, string[]][] = [
    ["Flip a coin twice. Which list shows every outcome?", "HH, HT, TH, TT", ["HH, HT, TT", "HH, TT", "HT, TH"]],
    ["Spin red or blue, then flip a coin. Which list is complete?", "RH, RT, BH, BT", ["RH, BT", "RH, RT, BH", "R, B, H, T"]],
    ["Pick a letter A or B, then 1, 2 or 3. Which list is complete?", "A1, A2, A3, B1, B2, B3", ["A1, B2, A3", "A1, A2, A3", "A, B, 1, 2, 3"]],
  ];
  return {
    key: `ce-list-${s}`,
    prompt: bank[s][0],
    speech: bank[s][0],
    visual: { kind: "tree", stages: trees[s] },
    ...label(bank[s][1], bank[s][2]),
    hint: "Pair every first result with every second result. A tree diagram helps.",
    explain: `The full sample space is ${bank[s][1]}.`,
  };
}

const SAMPLE_CTX: [string, string, string[]][] = [
  ["students' favorite lunch", "Draw 50 names at random from the school list", ["Ask 50 kids in the pizza club", "Ask 50 of your friends", "Ask the first 50 kids in the lunch line"]],
  ["how often town people use the park", "Phone 100 town numbers picked at random", ["Ask 100 people at the park", "Ask 100 people at the gym", "Ask your neighbors"]],
  ["the favorite sport at school", "Pull 40 student names from a hat", ["Ask the soccer team", "Ask fans at a basketball game", "Ask one gym class"]],
  ["bedtimes of 6th graders", "Pick 30 sixth graders at random from all classes", ["Ask 30 kids at a sleepover", "Ask only your own class", "Ask 30 high schoolers"]],
  ["what movie the grade wants", "Number everyone and pick 20 numbers at random", ["Ask the kids sitting near you", "Ask only the drama club", "Ask whoever answers first online"]],
];

/** 7.SP.A.1, 7.SP.A.2 — random samples; using samples to estimate a population. */
export function samples(): Question {
  if (rand(0, 1) === 0) {
    const i = rand(0, SAMPLE_CTX.length - 1);
    const [topic, right, wrong] = SAMPLE_CTX[i];
    return {
      key: `sa-fair-${i}`,
      prompt: `You want to know ${topic}. Which sample is fair?`,
      speech: `You want to learn about ${topic}. Which sample is random and fair?`,
      visual: NONE,
      ...label(right, wrong),
      hint: "In a fair (random) sample, everyone has the same chance of being picked.",
      explain: `${right}: everyone has an equal chance, so the sample represents the whole group.`,
    };
  }
  const n = pick([20, 25, 40, 50, 100]);
  const k = rand(2, n - 2);
  const N = n * rand(3, 12);
  const thing = pick(["like jazz", "walk to school", "have a dog", "play an instrument"]);
  return {
    key: `sa-est-${n}-${k}-${N}-${thing}`,
    prompt: `${k} of ${n} sampled students ${thing}. About how many of ${N}?`,
    speech: `In a random sample of ${n} students, ${k} ${thing}. About how many of all ${N} students ${thing}?`,
    visual: { kind: "table", header: ["Students", thing], rows: [[n, k], [N, "?"]] },
    ...keypad((k * N) / n),
    hint: `The sample rate is ${k} out of ${n}. Scale it up to ${N}.`,
    explain: `${k}/${n} of ${N} = ${(k * N) / n}.`,
  };
}

/** 7.SP.B.3, 7.SP.B.4 — compare two groups using center and spread. */
export function compareGroups(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const d = rand(2, 6);
    const k = rand(1, 5);
    const m1 = rand(20, 80);
    const m2 = m1 + (rand(0, 1) ? 1 : -1) * k * d;
    return {
      key: `cg-mad-${m1}-${m2}-${d}`,
      prompt: `Means: ${m1} and ${m2}. Both MADs are ${d}. How many MADs apart?`,
      speech: `Two teams have mean scores of ${m1} and ${m2}. Both have a mean absolute deviation of ${d}. How many MADs apart are the means?`,
      visual: NONE,
      ...keypad(k),
      hint: "Find the difference of the means, then divide by the MAD.",
      explain: `|${m1} − ${m2}| = ${k * d}, and ${k * d} ÷ ${d} = ${k}.`,
    };
  }
  if (kind <= 2) {
    let A = distinct(5, 10, 40);
    let B = distinct(5, 10, 40);
    const med = (xs: number[]) => sorted(xs)[2];
    const rng = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    const byMedian = kind === 1;
    const f = byMedian ? med : rng;
    while (f(A) === f(B)) B = distinct(5, 10, 40);
    A = shuffle(A);
    const winner = f(A) > f(B) ? "Group A" : "Group B";
    return {
      key: `cg-${byMedian ? "med" : "rng"}-${A.join(".")}-${B.join(".")}`,
      prompt: byMedian ? "Which group has the greater median?" : "Which group is more spread out (range)?",
      speech: byMedian ? "Look at the two groups. Which one has the greater median?" : "Look at the two groups. Which one is more spread out, using the range?",
      visual: { kind: "dots", values: sorted(A), min: 10, max: 40, label: "Group A", second: { values: sorted(B), label: "Group B" } },
      needsVisual: true,
      ...label(winner, [winner === "Group A" ? "Group B" : "Group A", "They're the same"]),
      hint: byMedian ? "Order each group and find its middle value." : "Range = biggest − smallest for each group.",
      explain: byMedian ? `Medians: A = ${med(A)}, B = ${med(B)}. ${winner} is greater.` : `Ranges: A = ${rng(A)}, B = ${rng(B)}. ${winner} is more spread out.`,
    };
  }
  const [mA, mB] = distinct(2, 60, 95);
  const iqr = rand(5, 15);
  return {
    key: `cg-typ-${mA}-${mB}-${iqr}`,
    prompt: `A: median ${mA}, IQR ${iqr}. B: median ${mB}, IQR ${iqr}. Typical A score?`,
    speech: `Class A has median ${mA} and IQR ${iqr}. Class B has median ${mB} and IQR ${iqr}. Compared with B, a typical A score is what?`,
    visual: NONE,
    ...label(mA > mB ? "Higher than B" : "Lower than B", [mA > mB ? "Lower than B" : "Higher than B", "The same as B"]),
    hint: "The median is the typical value. The IQRs match, so compare the medians.",
    explain: `${mA} is ${mA > mB ? "more" : "less"} than ${mB}, with the same spread, so A is typically ${mA > mB ? "higher" : "lower"}.`,
  };
}

/* ============================================================================
 * Expansion: more lessons per world, including hands-on "Do it" activities.
 * ========================================================================== */

type ActAnswer = Pick<Question, "input" | "activity" | "answer">;

/** A hands-on activity; `answer` is its key number (target, count, degrees…). */
const act = (activity: Activity, answer: number): ActAnswer => ({ input: "activity", activity, answer: clean(answer) });

const NAMES = ["Leo", "Mia", "Sam", "Ava", "Kai", "Zoe", "Ben", "Ana"];

/** Distinct grid points with coordinates from lo to hi (no zeros when `noAxes`). */
function gridSpots(n: number, lo: number, hi: number, noAxes = false): { x: number; y: number }[] {
  const out = new Map<string, { x: number; y: number }>();
  while (out.size < n) {
    const x = rand(lo, hi);
    const y = rand(lo, hi);
    if (noAxes && (x === 0 || y === 0)) continue;
    out.set(`${x},${y}`, { x, y });
  }
  return [...out.values()];
}

const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* ------------------------------------------------------------ 1. Decimals */

/** 5.NBT.A.3a, 5.NBT.A.3b — place decimals on a number line (Do it). */
export function decimalsOnLine(): Question {
  const kind = rand(0, 2);
  const k = rand(1, 9);
  const base = kind === 0 ? rand(0, 8) : kind === 1 ? rand(1, 99) : rand(1, 199);
  const p = kind + 1;
  const min = sh(base, -kind);
  const max = sh(base + 1, -kind);
  const step = sh(1, -p);
  const target = sh(base * 10 + k, -p);
  return {
    key: `dol-${kind}-${base}-${k}`,
    prompt: `Put ${ds(target)} on the number line.`,
    speech: `Drag the marker to ${ds(target)}.`,
    visual: NONE,
    ...act({ kind: "placeOnLine", min, max, step, labelStep: sh(5, -p), target }, target),
    hint: `The line goes from ${ds(min)} to ${ds(max)}. Each small step is ${ds(step)}.`,
    explain: `${ds(target)} is ${k} step${k > 1 ? "s" : ""} past ${ds(min)}.`,
  };
}

/** 5.NBT.A.3b — put decimals in order (Do it). */
export function orderDecimals(): Question {
  const w = rand(0, 9);
  const n = rand(4, 5);
  const vals = new Set<number>();
  while (vals.size < n) vals.add(decimalNear(w));
  const up = rand(0, 1) === 1;
  const list = sorted([...vals]);
  if (!up) list.reverse();
  const dir = up ? "least to greatest" : "greatest to least";
  return {
    key: `odc-${up}-${sorted([...vals]).join("_")}`,
    prompt: `Tap the decimals from ${dir}.`,
    speech: `Tap the decimals in order, from ${dir}.`,
    visual: NONE,
    ...act({ kind: "order", items: list.map(ds), direction: dir }, n),
    hint: "Compare the tenths first, then hundredths, then thousandths. More digits doesn't mean bigger.",
    explain: `In order: ${list.map(ds).join(up ? " < " : " > ")}.`,
  };
}

const notNearHalf = () => {
  let v = rand(11, 99);
  while (v % 10 === 5 || v % 10 === 0) v = rand(11, 99);
  return v;
};

/** 5.NBT.B.7, 5.NBT.A.4 — estimate decimal answers; is it reasonable? */
export function decimalEstimate(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const [A, B] = [notNearHalf(), notNearHalf()];
    const [ra, rb] = [Math.round(A / 10), Math.round(B / 10)];
    const est = ra * rb;
    return {
      key: `dce-mul-${A}-${B}`,
      prompt: `Estimate: ${ds(A / 10)} × ${ds(B / 10)} is about…`,
      speech: `Estimate. ${ds(A / 10)} times ${ds(B / 10)} is about what?`,
      visual: NONE,
      ...choose(est, [est * 10, sh(est, -1), est * 100, est + ra + rb], 1, 0),
      hint: "Round each decimal to the nearest whole number first.",
      explain: `${ds(A / 10)} ≈ ${ra} and ${ds(B / 10)} ≈ ${rb}, so about ${ra} × ${rb} = ${est}. (Exactly ${ds(sh(A * B, -2))}.)`,
    };
  }
  if (kind === 1) {
    const A = notNearHalf();
    const B = rand(11, 49);
    const P = sh(A * B, -2);
    const shift = pick([0, 1, -1]);
    const claim = shift === 0 ? P : sh(A * B, shift > 0 ? -1 : -3);
    const ok = shift === 0;
    const [ra, rb] = [Math.round(A / 10), Math.round(B / 10)];
    const yes = "Yes, it's about right";
    const no = "No, the point is in the wrong place";
    return {
      key: `dce-chk-${A}-${B}-${shift}`,
      prompt: `${pick(NAMES)} says ${ds(A / 10)} × ${ds(B / 10)} = ${ds(claim)}. Reasonable?`,
      speech: `Someone says ${ds(A / 10)} times ${ds(B / 10)} equals ${ds(claim)}. Is that reasonable?`,
      visual: NONE,
      ...label(ok ? yes : no, [ok ? no : yes]),
      hint: "Estimate with whole numbers. Is the answer close to your estimate?",
      explain: `About ${ra} × ${rb} = ${ra * rb}. The exact answer is ${ds(P)}${ok ? ", so it's right." : `, so ${ds(claim)} is way off.`}`,
    };
  }
  const xs = [notNearHalf(), notNearHalf(), notNearHalf()];
  const rs = xs.map((x) => Math.round(x / 10));
  const est = sum(rs);
  return {
    key: `dce-add-${xs.join("-")}`,
    prompt: `About how much is ${xs.map((x) => ds(x / 10)).join(" + ")}?`,
    speech: `About how much is ${xs.map((x) => ds(x / 10)).join(" plus ")}? Round to whole numbers first.`,
    visual: NONE,
    ...choose(est, [est + 1, est - 1, est * 10, sum(xs.map((x) => Math.floor(x / 10)))], 1, 0),
    hint: "Round each number to the nearest whole number, then add.",
    explain: `${rs.join(" + ")} = ${est}. The exact sum is ${ds(sh(sum(xs), -1))}.`,
  };
}

/* ----------------------------------------------------------- 2. Fractions */

/** 5.NF.A.1, 5.NF.B.4a — shade sums and products of fractions (Do it). */
export function shadeFractions(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    for (;;) {
      const [b, d] = unlikePair([2, 3, 4, 6, 12], 12);
      const L = lcm(b, d);
      const a = top(b);
      const c = top(d);
      const N = (a * L) / b + (c * L) / d;
      if (N > L) continue;
      return {
        key: `shf-sum-${a}/${b}-${c}/${d}`,
        prompt: `Shade ${a}/${b} + ${c}/${d} of the bar.`,
        speech: talk(`The bar has ${L} equal parts. Shade ${a}/${b} + ${c}/${d} of it.`),
        visual: NONE,
        ...act({ kind: "shade", parts: L, target: N, shape: "bar" }, N),
        hint: `The bar has ${L} parts. How many ${pieces(L)} make ${a}/${b}? How many make ${c}/${d}?`,
        explain: `${a}/${b} = ${(a * L) / b}/${L} and ${c}/${d} = ${(c * L) / d}/${L}, so shade ${N} parts.`,
      };
    }
  }
  for (;;) {
    const b = rand(2, 4);
    const d = rand(2, 4);
    if (b * d > 12) continue;
    const a = top(b);
    const c = top(d);
    const pie = kind === 2;
    return {
      key: `shf-prod-${a}/${b}-${c}/${d}-${pie}`,
      prompt: `Shade ${a}/${b} of ${c}/${d} of the ${pie ? "pie" : "bar"}.`,
      speech: talk(`The ${pie ? "pie" : "bar"} has ${b * d} equal parts. Shade ${a}/${b} of ${c}/${d} of it.`),
      visual: NONE,
      ...act({ kind: "shade", parts: b * d, target: a * c, shape: pie ? "pie" : "bar" }, a * c),
      hint: `${a}/${b} of ${c}/${d} means ${a}/${b} × ${c}/${d}. Multiply the tops to know how many of the ${b * d} parts.`,
      explain: `${a}/${b} × ${c}/${d} = ${a * c}/${b * d}, so shade ${a * c} of the ${b * d} parts.`,
    };
  }
}

/** 5.NF.A.1, 5.NF.A.2 — spot the mistake; is it reasonable; which problem gives this answer? */
export function fractionErrors(): Question {
  const kind = rand(0, 3);
  const [b, d] = unlikePair([2, 3, 4, 5, 6, 8], 24);
  const a = top(b);
  const c = top(d);
  const L = lcm(b, d);
  const N = (a * L) / b + (c * L) / d;
  const who = pick(NAMES);
  const sumText = `${a}/${b} + ${c}/${d}`;
  if (kind === 0) {
    return {
      key: `fer-bot-${a}/${b}-${c}/${d}`,
      prompt: `${who} says ${sumText} = ${a + c}/${b + d}. What went wrong?`,
      speech: talk(`${who} says ${sumText} = ${a + c}/${b + d}. What went wrong?`),
      visual: NONE,
      ...label("Added the bottoms too", ["Forgot to simplify", "Should have multiplied", "Nothing, it's right"]),
      hint: "You can only add pieces of the same size. What should happen to the denominators?",
      explain: `Don't add the denominators. Rename as ${pieces(L)}: ${sumText} = ${fracStr(N, L)}.`,
    };
  }
  if (kind === 1) {
    const big = a / b > c / d ? `${a}/${b}` : `${c}/${d}`;
    const no = `No: it's less than ${big} alone`;
    return {
      key: `fer-bench-${a}/${b}-${c}/${d}`,
      prompt: `${who} says ${sumText} = ${fracStr(a + c, b + d)}. Reasonable?`,
      speech: talk(`${who} says ${sumText} = ${fracStr(a + c, b + d)}. Is that reasonable?`),
      visual: NONE,
      ...label(no, ["Yes, it looks right", "Yes: adding makes it smaller"]),
      hint: "Adding two positive numbers must give more than either one.",
      explain: `${fracStr(a + c, b + d)} is less than ${big}, so it can't be the sum. The real sum is ${fracStr(N, L)}.`,
    };
  }
  if (kind === 2) {
    const B = pick([4, 6, 8]);
    const [x, y] = sorted(shuffle([1, 2, 3, 4, 5, 6, 7].filter((v) => v < B && gcd(v, B) === 1)).slice(0, 2));
    const w1 = rand(3, 7);
    const w2 = rand(1, w1 - 1);
    const right = fracStr(w1 * B + x - (w2 * B + y), B);
    return {
      key: `fer-borrow-${w1}-${x}-${w2}-${y}-${B}`,
      prompt: `${who} says ${w1} ${x}/${B} − ${w2} ${y}/${B} = ${w1 - w2} ${y - x}/${B}. What went wrong?`,
      speech: talk(`${who} says ${w1} ${x}/${B} − ${w2} ${y}/${B} = ${w1 - w2} ${y - x}/${B}. What went wrong?`),
      visual: NONE,
      ...label("Subtracted the fractions backwards", ["Forgot to simplify", "Added instead", "Nothing, it's right"]),
      hint: `Can you take ${y}/${B} from ${x}/${B}? You may need to borrow a whole.`,
      explain: `${x}/${B} is smaller than ${y}/${B}, so borrow 1 whole. The answer is ${right}.`,
    };
  }
  const right = fracStr(N, L);
  const wrong = new Set<string>();
  for (let t = 0; wrong.size < 3 && t < 50; t++) {
    const [b2, d2] = unlikePair([2, 3, 4, 5, 6, 8], 24);
    const a2 = top(b2);
    const c2 = top(d2);
    if (fracStr(a2 * d2 + c2 * b2, b2 * d2) !== right) wrong.add(`${a2}/${b2} + ${c2}/${d2}`);
  }
  return {
    key: `fer-rev-${a}/${b}-${c}/${d}`,
    prompt: `Which sum has the answer ${right}?`,
    speech: talk(`Which sum has the answer ${right}?`),
    visual: NONE,
    ...label(sumText, [...wrong]),
    hint: "Estimate each sum first, then check the closest one exactly.",
    explain: `${sumText} = ${N}/${L} = ${right}.`,
  };
}

/* ------------------------------------------ 3. Volume, graphs & expressions */

/** 5.G.A.1, 5.G.A.2, 5.OA.B.3 — plot points in the first quadrant (Do it). */
export function plotGridPoints(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const pts = gridSpots(kind === 0 ? 1 : rand(2, 3), 0, 10).map((q, i) => ({ ...q, label: "ABC"[i] }));
    return {
      key: `pgp-${pts.map((q) => `${q.x}.${q.y}`).join("_")}`,
      prompt: `Plot ${andList(pts.map((q) => `${q.label}${pt(q.x, q.y)}`))}.`,
      speech: `Plot ${pts.map((q) => `point ${q.label} at ${q.x} comma ${q.y}`).join(", then ")}. Go across first, then up.`,
      visual: NONE,
      ...act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, pts[0].x),
      hint: "Start at the origin (0, 0). The first number is how far across; the second is how far up.",
      explain: pts.map((q) => `${q.label} is ${q.x} across and ${q.y} up.`).join(" "),
    };
  }
  if (kind === 2) {
    const [p, k, steps] = pick([[1, 2, 3], [1, 3, 3], [2, 2, 2], [1, 4, 2], [3, 1, 3]] as [number, number, number][]);
    const pts = Array.from({ length: steps }, (_, i) => ({ x: (i + 1) * p, y: (i + 1) * p * k, label: String(i + 1) }));
    return {
      key: `pgp-pat-${p}-${k}-${steps}`,
      prompt: `A adds ${p}, B adds ${p * k}. Plot (A, B) for steps 1 to ${steps}.`,
      speech: `Pattern A adds ${p} each step and pattern B adds ${p * k}. Both start at 0. Plot the pairs A comma B for steps 1 to ${steps}.`,
      visual: { kind: "table", header: ["Step", "A", "B"], rows: pts.map((q) => [q.label, q.x, q.y]) },
      ...act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, p),
      hint: "Each row of the table is one point: A across, B up.",
      explain: `The points ${pts.map((q) => pt(q.x, q.y)).join(", ")}. Each B is ${k} times its A, so they line up.`,
    };
  }
  const [x, y] = [rand(1, 10), rand(1, 10)];
  const place = pick(["library", "park", "pool", "bakery"]);
  return {
    key: `pgp-map-${x}-${y}-${place}`,
    prompt: `The ${place} is ${x} blocks east and ${y} north of school (0, 0). Plot it.`,
    speech: `School is at the origin. The ${place} is ${x} blocks east and ${y} blocks north. Plot the ${place}.`,
    visual: NONE,
    ...act({ kind: "plotPoints", points: [{ x, y, label: place[0].toUpperCase() }], size: 10, quadrants: 1 }, x),
    hint: "East is across (the x-axis). North is up (the y-axis).",
    explain: `${x} east and ${y} north is the point (${x}, ${y}).`,
  };
}

/** 5.NBT.B.5, 5.NBT.B.6 — estimate products and quotients; is it reasonable? */
export function estimateProducts(): Question {
  const kind = rand(0, 2);
  const nz = (lo: number, hi: number) => {
    let v = rand(lo, hi);
    while (v % 10 === 0 || v % 10 === 5) v = rand(lo, hi);
    return v;
  };
  if (kind === 0) {
    const [a, b] = [nz(12, 98), nz(12, 98)];
    const [ra, rb] = [Math.round(a / 10) * 10, Math.round(b / 10) * 10];
    const est = ra * rb;
    return {
      key: `ep-mul-${a}-${b}`,
      prompt: `Estimate: ${a} × ${b} is about…`,
      speech: `Estimate. ${a} times ${b} is about what?`,
      visual: NONE,
      ...choose(est, [est * 10, est / 10, ra * rb + ra * 10, Math.floor(a / 10) * 10 * Math.floor(b / 10) * 10], 1, 1),
      hint: "Round each number to the nearest ten, then multiply.",
      explain: `${a} ≈ ${ra} and ${b} ≈ ${rb}. ${ra} × ${rb} = ${est}. (Exactly ${a * b}.)`,
    };
  }
  if (kind === 1) {
    const dr = rand(2, 9) * 10;
    const qr = rand(2, 9) * 10;
    const d = dr + pick([-2, -1, 1, 2]);
    const N = dr * qr + rand(-15, 15);
    return {
      key: `ep-div-${N}-${d}`,
      prompt: `About how much is ${N} ÷ ${d}?`,
      speech: `About how much is ${N} divided by ${d}? Use friendly numbers.`,
      visual: NONE,
      ...choose(qr, [qr * 10, qr / 10, qr + 10, qr - 10], 1, 1),
      hint: `${d} is close to ${dr}. What friendly number near ${N} does ${dr} divide evenly?`,
      explain: `${dr * qr} ÷ ${dr} = ${qr}, so ${N} ÷ ${d} is about ${qr}.`,
    };
  }
  const a = rand(101, 899);
  const b = nz(12, 89);
  const P = a * b;
  const kindOf = pick(["ok", "big", "small"]);
  const claim = kindOf === "ok" ? P : kindOf === "big" ? P * 10 : Math.round(P / 10);
  const est = Math.round(a / 100) * 100 * (Math.round(b / 10) * 10);
  const yes = "Yes, it's close to my estimate";
  const big = "No, it's about 10 times too big";
  const small = "No, it's about 10 times too small";
  return {
    key: `ep-chk-${a}-${b}-${kindOf}`,
    prompt: `${pick(NAMES)} says ${a} × ${b} = ${claim}. Reasonable?`,
    speech: `Someone says ${a} times ${b} equals ${claim}. Is that reasonable?`,
    visual: NONE,
    ...label(kindOf === "ok" ? yes : kindOf === "big" ? big : small, [yes, big, small].filter((t) => t !== (kindOf === "ok" ? yes : kindOf === "big" ? big : small)), true),
    hint: "Round to friendly numbers and estimate. Compare the size of the answers.",
    explain: `About ${Math.round(a / 100) * 100} × ${Math.round(b / 10) * 10} = ${est}. Exactly, ${a} × ${b} = ${P}.`,
  };
}

/* ------------------------------------------------------ 4. Factors & dividing */

/** 6.NS.B.4 — sort numbers by factors, common factors and multiples (Do it). */
export function sortFactors(): Question {
  const kind = rand(0, 2);
  const items = (yes: number[], no: number[], third: number[] = [], fourth: number[] = []) =>
    shuffle([...yes.map((v) => ({ label: String(v), bin: 0 })), ...no.map((v) => ({ label: String(v), bin: 1 })), ...third.map((v) => ({ label: String(v), bin: 2 })), ...fourth.map((v) => ({ label: String(v), bin: 3 }))]);
  if (kind === 0) {
    const N = pick([12, 18, 20, 24, 30, 36, 40, 48, 60]);
    const yes = shuffle(factorsOf(N).filter((f) => f > 1 && f < N)).slice(0, rand(2, 4));
    const no = shuffle(Array.from({ length: Math.min(N, 30) }, (_, i) => i + 2).filter((v) => N % v !== 0)).slice(0, rand(2, 4));
    return {
      key: `sfa-f-${N}-${sorted(yes).join(".")}-${sorted(no).join(".")}`,
      prompt: `Sort the numbers: is each one a factor of ${N}?`,
      speech: `Sort the numbers. Put each one in factor of ${N}, or not a factor.`,
      visual: NONE,
      ...act({ kind: "sort", bins: [`Factor of ${N}`, "Not a factor"], items: items(yes, no) }, yes.length),
      hint: `A factor divides ${N} with nothing left over. Try dividing.`,
      explain: `Factors of ${N}: ${factorsOf(N).join(", ")}.`,
    };
  }
  if (kind === 1) {
    let a = 0, b = 0;
    do [a, b] = [rand(12, 60), rand(12, 60)];
    while (a === b || gcd(a, b) < 4);
    const common = factorsOf(gcd(a, b)).filter((f) => f > 1);
    const yes = shuffle(common).slice(0, Math.min(common.length, rand(2, 3)));
    const no = shuffle(Array.from({ length: 11 }, (_, i) => i + 2).filter((v) => a % v !== 0 || b % v !== 0)).slice(0, rand(2, 4));
    return {
      key: `sfa-c-${a}-${b}-${sorted(yes).join(".")}-${sorted(no).join(".")}`,
      prompt: `Sort: which are common factors of ${a} and ${b}?`,
      speech: `Sort the numbers. Is each one a common factor of ${a} and ${b}?`,
      visual: NONE,
      ...act({ kind: "sort", bins: [`Factor of both`, "Not of both"], items: items(yes, no) }, yes.length),
      hint: "A common factor divides both numbers evenly.",
      explain: `Common factors of ${a} and ${b}: ${factorsOf(gcd(a, b)).join(", ")}. The greatest is ${gcd(a, b)}.`,
    };
  }
  const [a, b] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [3, 7]] as [number, number][]);
  const pool = shuffle(Array.from({ length: 40 }, (_, i) => i + 1));
  const isA = (v: number) => v % a === 0;
  const isB = (v: number) => v % b === 0;
  const both = pool.filter((v) => isA(v) && isB(v)).slice(0, 1);
  const onlyA = pool.filter((v) => isA(v) && !isB(v)).slice(0, rand(1, 2));
  const onlyB = pool.filter((v) => isB(v) && !isA(v)).slice(0, rand(1, 2));
  const neither = pool.filter((v) => !isA(v) && !isB(v)).slice(0, rand(1, 2));
  return {
    key: `sfa-m-${a}-${b}-${[...both, ...onlyA, ...onlyB, ...neither].join(".")}`,
    prompt: `Sort by multiples of ${a} and ${b}.`,
    speech: `Sort each number: a multiple of ${a} only, of ${b} only, of both, or of neither.`,
    visual: NONE,
    ...act({ kind: "sort", bins: [`Only ${a}s`, `Only ${b}s`, "Both", "Neither"], items: items(onlyA, onlyB, both, neither) }, both[0]),
    hint: `Multiples of both ${a} and ${b} are multiples of ${lcm(a, b)}.`,
    explain: `Multiples of both are multiples of the LCM, ${lcm(a, b)}: like ${both[0]}.`,
  };
}

/** 6.NS.B.2, 6.NS.B.3 — check a quotient or product: is it right? */
export function divisionCheck(): Question {
  const kind = rand(0, 2);
  const who = pick(NAMES);
  if (kind === 0) {
    const B = rand(12, 99);
    const q = rand(12, 99);
    const top = sh(q * B, -2);
    const by = sh(B, -2);
    const claimK = pick([0, 1, -1]);
    const claim = claimK === 0 ? q : claimK > 0 ? q * 10 : q / 10;
    const right = claimK === 0 ? "Yes" : `No, it's ${q}`;
    return {
      key: `dvc-dec-${q}-${B}-${claimK}`,
      prompt: `${who} says ${ds(top)} ÷ ${ds(by)} = ${ds(claim)}. Right?`,
      speech: `${who} says ${ds(top)} divided by ${ds(by)} equals ${ds(claim)}. Is that right?`,
      visual: NONE,
      ...label(right, ["Yes", `No, it's ${q}`, `No, it's ${ds(claimK === 1 ? q / 10 : q * 10)}`].filter((t) => t !== right)),
      hint: `Multiply both numbers by 100: ${q * B} ÷ ${B}.`,
      explain: `${ds(top)} ÷ ${ds(by)} = ${q * B} ÷ ${B} = ${q}.`,
    };
  }
  if (kind === 1) {
    const d = rand(12, 89);
    const q = rand(101, 999);
    const off = pick([0, 0, 1, -1, 10, -10, 2]);
    const claim = q + off;
    const ok = off === 0;
    return {
      key: `dvc-long-${d}-${q}-${off}`,
      prompt: `${who} says ${d * q} ÷ ${d} = ${claim}. Right?`,
      speech: `${who} says ${d * q} divided by ${d} equals ${claim}. Is that right? Check by multiplying.`,
      visual: NONE,
      ...label(ok ? "Yes" : "No", [ok ? "No" : "Yes"]),
      hint: `Check: does ${d} × ${claim} make ${d * q}?`,
      explain: `${d} × ${claim} = ${d * claim}${ok ? ". It checks out." : `, not ${d * q}. The answer is ${q}.`}`,
    };
  }
  const A = rand(11, 99);
  const B = rand(11, 49);
  const P = sh(A * B, -2);
  const shift = pick([0, 1, -1]);
  const claim = shift === 0 ? P : sh(A * B, shift > 0 ? -1 : -3);
  return {
    key: `dvc-mul-${A}-${B}-${shift}`,
    prompt: `${who} says ${ds(A / 10)} × ${ds(B / 10)} = ${ds(claim)}. Right?`,
    speech: `${who} says ${ds(A / 10)} times ${ds(B / 10)} equals ${ds(claim)}. Is that right?`,
    visual: NONE,
    ...label(shift === 0 ? "Yes" : `No, it's ${ds(P)}`, ["Yes", `No, it's ${ds(P)}`, `No, it's ${ds(sh(A * B, -1))}`, `No, it's ${ds(sh(A * B, -3))}`].filter((t) => t !== (shift === 0 ? "Yes" : `No, it's ${ds(P)}`) && t !== `No, it's ${ds(claim)}`)),
    hint: "Count the decimal places in both factors. Estimate to check.",
    explain: `${A} × ${B} = ${A * B}, with 2 decimal places: ${ds(P)}.`,
  };
}

/* --------------------------------------------------------- 5. Ratios & rates */

/** 6.RP.A.3a — plot the pairs from a ratio table (Do it). */
export function plotRatios(): Question {
  const [h1, h2] = pick(RATIO_ITEMS);
  for (;;) {
    const a = rand(1, 3);
    const b = rand(1, 4);
    const ks = rand(0, 1) ? [1, 2, 3] : [1, rand(2, 4)];
    if (ks.some((k) => k * a > 10 || k * b > 10)) continue;
    const pts = ks.map((k, i) => ({ x: k * a, y: k * b, label: "ABC"[i] }));
    return {
      key: `prt-${a}-${b}-${ks.join(".")}`,
      prompt: "Plot each pair from the ratio table.",
      speech: `The table shows ${h1.toLowerCase()} and ${h2.toLowerCase()} in the ratio ${a} to ${b}. Plot each row as a point: ${h1.toLowerCase()} across, ${h2.toLowerCase()} up.`,
      visual: { kind: "table", header: ["Point", h1, h2], rows: pts.map((q) => [q.label, q.x, q.y]) },
      ...act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, a),
      hint: "The first number in each row goes across; the second goes up.",
      explain: `The points ${pts.map((q) => pt(q.x, q.y)).join(", ")} line up on a straight line through (0, 0).`,
    };
  }
}

const SLOPES: [number, string][] = [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [0.5, "1/2"], [1.5, "3/2"], [2 / 3, "2/3"], [1 / 3, "1/3"], [2.5, "5/2"]];

/** 7.RP.A.2a, 7.RP.A.2c, 7.RP.A.2d — draw the graph of a proportional relationship (Do it). */
export function drawProportional(): Question {
  const kind = rand(0, 2);
  const [k, kt] = pick(SLOPES);
  const eq = `y = ${kt.includes("/") ? `(${kt})` : kt === "1" ? "" : kt}x`;
  const draw = act({ kind: "drawLine", m: k, b: 0, size: 10, quadrants: 1 }, k);
  const explain = `y = ${kt}x goes through (0, 0) and (1, ${kt}). For example, x = ${kt.includes("/") ? kt.split("/")[1] : 2} gives y = ${ds(k * (kt.includes("/") ? +kt.split("/")[1] : 2))}.`;
  if (kind === 0) {
    return {
      key: `dpl-eq-${kt}`,
      prompt: `Draw the graph of ${eq}.`,
      speech: `Tap two points to draw the line y equals ${kt.includes("/") ? sayFrac(+kt.split("/")[0], +kt.split("/")[1]) : kt} x.`,
      visual: NONE,
      ...draw,
      hint: "A proportional line always passes through (0, 0). Find one more point by picking an x.",
      explain,
    };
  }
  if (kind === 1) {
    const xs = kt.includes("/") ? [0, +kt.split("/")[1], 2 * +kt.split("/")[1]] : [0, 1, 2];
    return {
      key: `dpl-tab-${kt}`,
      prompt: "Draw the line that goes through the table's points.",
      speech: "Tap two points to draw the line that matches the table.",
      visual: { kind: "table", header: ["x", "y"], rows: xs.map((x) => [x, ds(k * x)]) },
      ...draw,
      hint: "Plot two rows of the table as points, then join them.",
      explain,
    };
  }
  const whole = Number.isInteger(k) ? k : 2;
  const [thing, unit] = pick([["Apples cost", "a pound"], ["You earn", "an hour"], ["Tickets cost", "each"]]);
  return {
    key: `dpl-ctx-${whole}-${thing}`,
    prompt: `${thing} $${whole} ${unit}. Draw the cost line y = ${whole === 1 ? "" : whole}x.`,
    speech: `${thing} ${whole} dollars ${unit}. Tap two points to draw the line y = ${whole} x.`,
    visual: NONE,
    ...act({ kind: "drawLine", m: whole, b: 0, size: 10, quadrants: 1 }, whole),
    hint: "0 of them cost $0, so start at (0, 0). Then where is 1?",
    explain: `The line goes through (0, 0) and (1, ${whole}): the unit rate.`,
  };
}

/** 6.RP.A.3a, 6.RP.A.3b — compare ratios and rates: which is stronger, faster, sweeter? */
export function compareRatios(): Question {
  const kind = rand(0, 1);
  let [a, b, c, d] = [rand(1, 6), rand(2, 9), rand(1, 6), rand(2, 9)];
  if (rand(0, 4) === 0) [c, d] = [a * 2, b * 2];
  const same = a * d === b * c;
  if (kind === 0) {
    const [what, base] = pick([["lemons", "cups of water"], ["scoops of cocoa", "cups of milk"], ["cups of sugar", "cups of flour"]]);
    const right = same ? "They're the same" : a / b > c / d ? "Mix A" : "Mix B";
    return {
      key: `cr-mix-${a}-${b}-${c}-${d}-${what}`,
      prompt: `A: ${a} ${what} per ${b} ${base}. B: ${c} per ${d}. Which is stronger?`,
      speech: `Mix A has ${a} ${what} for ${b} ${base}. Mix B has ${c} ${what} for ${d} ${base}. Which mix is stronger?`,
      visual: { kind: "table", header: ["Mix", what, base], rows: [["A", a, b], ["B", c, d]] },
      ...label(right, ["Mix A", "Mix B", "They're the same"].filter((t) => t !== right), true),
      hint: `Compare ${what} per 1 cup, or scale both mixes to the same amount of ${base}.`,
      explain: `A: ${a}/${b} = ${ds(a / b)} per cup. B: ${c}/${d} = ${ds(c / d)} per cup. ${right === "They're the same" ? "They match." : `${right} is stronger.`}`,
    };
  }
  const [d1, t1, d2, t2] = [a * 20, b, c * 20, d];
  const right = same ? "Same speed" : d1 / t1 > d2 / t2 ? "Ann" : "Ben";
  return {
    key: `cr-run-${d1}-${t1}-${d2}-${t2}`,
    prompt: `Ann runs ${d1} m in ${t1} s. Ben runs ${d2} m in ${t2} s. Who's faster?`,
    speech: `Ann runs ${d1} meters in ${t1} seconds. Ben runs ${d2} meters in ${t2} seconds. Who is faster?`,
    visual: NONE,
    ...label(right, ["Ann", "Ben", "Same speed"].filter((t) => t !== right), true),
    hint: "Find each runner's meters per second, then compare.",
    explain: `Ann: ${ds(d1 / t1)} m/s. Ben: ${ds(d2 / t2)} m/s. ${right === "Same speed" ? "Same speed." : `${right} is faster.`}`,
  };
}

/* --------------------------------------------------------------- 6. Percents */

/** 6.RP.A.3c — shade a percent of a bar or pie (Do it). */
export function shadePercent(): Question {
  const parts = pick([10, 5, 4, 2, 10, 5, 4]);
  const k = rand(1, parts - 1);
  const pct = (k * 100) / parts;
  const pie = rand(0, 1) === 1;
  return {
    key: `shp-${parts}-${k}-${pie}`,
    prompt: `Shade ${pct}% of the ${pie ? "pie" : "bar"}.`,
    speech: `The ${pie ? "pie" : "bar"} has ${parts} equal parts. Shade ${pct} percent of it.`,
    visual: NONE,
    ...act({ kind: "shade", parts, target: k, shape: pie ? "pie" : "bar" }, k),
    hint: `The whole is 100%. Each of the ${parts} parts is ${100 / parts}%.`,
    explain: `Each part is ${100 / parts}%, so ${pct}% is ${k} part${k > 1 ? "s" : ""}.`,
  };
}

/** 6.RP.A.3c — mark a percent of a number on a number line (Do it). */
export function percentOnLine(): Question {
  const N = pick([20, 40, 50, 60, 80, 100, 120, 200, 400, 500]);
  const kind = rand(0, 3);
  const over = kind === 3;
  const fives = kind === 2;
  const step = fives ? N / 20 : N / 10;
  const p = over ? pick([110, 120, 130, 140, 150, 160, 180]) : fives ? 5 * pick([1, 3, 7, 9, 11, 13, 15, 17, 19]) : 10 * rand(1, 9);
  const target = (p * N) / 100;
  const max = over ? 2 * N : N;
  return {
    key: `pol-${N}-${p}-${kind}`,
    prompt: `Mark ${p}% of ${N} on the number line.`,
    speech: `The line goes from 0 to ${max}. Drag the marker to ${p} percent of ${N}.`,
    visual: NONE,
    ...act({ kind: "placeOnLine", min: 0, max, step, labelStep: N / 2, target }, target),
    hint: `100% is ${N}. Each step on the line is ${fives ? 5 : 10}% of ${N}, which is ${ds(step)}.`,
    explain: `${p}% of ${N} = ${p}/100 × ${N} = ${ds(target)}.`,
  };
}

/** 6.RP.A.3c, 7.RP.A.3 — percent shortcuts and mental math. */
export function percentMental(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const N = 20 * rand(2, 40);
    return {
      key: `pm-5-${N}`,
      prompt: `10% of ${N} is ${N / 10}. What is 5% of ${N}?`,
      speech: `10 percent of ${N} is ${N / 10}. What is 5 percent of ${N}?`,
      visual: NONE,
      ...keypad(N / 20),
      hint: "5% is half of 10%.",
      explain: `Half of ${N / 10} is ${N / 20}.`,
    };
  }
  if (kind === 1) {
    const N = 20 * rand(2, 40);
    const p = pick([15, 20, 30, 25]);
    const how: Record<number, string> = { 15: "10% + 5%", 20: "2 × 10%", 30: "3 × 10%", 25: "half of 50%" };
    return {
      key: `pm-build-${N}-${p}`,
      prompt: `Use 10% to find ${p}% of ${N}.`,
      speech: `Use 10 percent to help you find ${p} percent of ${N}.`,
      visual: NONE,
      ...keypad((p * N) / 100),
      hint: `${p}% = ${how[p]}. 10% of ${N} is ${N / 10}.`,
      explain: `${p}% = ${how[p]} = ${(p * N) / 100}.`,
    };
  }
  if (kind === 2) {
    const half = rand(6, 90);
    const p = pick([50, 25, 10, 20]);
    const part = (half * p) / 50;
    if (!Number.isInteger(part)) return percentMental();
    return {
      key: `pm-whole-${p}-${part}`,
      prompt: `${p}% of a number is ${part}. What is the number?`,
      speech: `${p} percent of a number is ${part}. What is the number?`,
      visual: NONE,
      ...keypad((part * 100) / p),
      hint: `${p}% is 1/${100 / p} of the whole. Multiply by ${100 / p}.`,
      explain: `${part} × ${100 / p} = ${(part * 100) / p}.`,
    };
  }
  const [a, b] = distinct(2, 1, 9).map((v) => v * 10);
  return {
    key: `pm-swap-${a}-${b}`,
    prompt: `Which is bigger: ${a}% of ${b} or ${b}% of ${a}?`,
    speech: `Which is bigger: ${a} percent of ${b}, or ${b} percent of ${a}?`,
    visual: NONE,
    ...label("They're equal", [`${a}% of ${b}`, `${b}% of ${a}`]),
    hint: "Both mean multiplying the same two numbers, then dividing by 100.",
    explain: `${a}% of ${b} = ${a} × ${b} ÷ 100 = ${(a * b) / 100}, and ${b}% of ${a} is the same.`,
  };
}

/* ------------------------------------------------------- 7. Negative numbers */

/** 6.NS.C.6c, 6.NS.C.7a — place signed numbers on a number line (Do it). */
export function placeNegatives(): Question {
  const kind = rand(0, 4);
  const line = { min: -10, max: 10, step: 1, labelStep: 5 };
  if (kind === 0 || kind >= 3) {
    const n = (rand(0, 1) ? 1 : -1) * rand(1, 10);
    const t = kind === 3 ? -n : kind === 4 ? -Math.abs(n) : n;
    const prompt = kind === 3 ? `Put the opposite of ${fmt(n)} on the line.` : kind === 4 ? `It's ${Math.abs(n)}° below zero. Show it on the line.` : `Put ${fmt(t)} on the number line.`;
    return {
      key: `pln-${kind}-${n}`,
      prompt,
      speech: talk(prompt.replace("Put", "Drag the marker to").replace(" on the line", "").replace(" on the number line", "")),
      visual: NONE,
      ...act({ kind: "placeOnLine", ...line, target: t }, t),
      hint: kind === 3 ? "Opposites are the same distance from 0, on the other side." : "Negative numbers are to the left of 0.",
      explain: `${fmt(t)} is ${Math.abs(t)} step${Math.abs(t) === 1 ? "" : "s"} ${t < 0 ? "left" : "right"} of 0.`,
    };
  }
  if (kind === 1) {
    let H = rand(-9, 9);
    if (H % 2 === 0) H += 1;
    const t = H / 2;
    return {
      key: `pln-half-${H}`,
      prompt: `Put ${ds(t)} on the number line.`,
      speech: talk(`Drag the marker to ${ds(t)}.`),
      visual: NONE,
      ...act({ kind: "placeOnLine", min: -5, max: 5, step: 0.5, labelStep: 1, target: t }, t),
      hint: `${ds(t)} is halfway between ${fmt(Math.floor(t))} and ${fmt(Math.ceil(t))}.`,
      explain: `${ds(t)} sits halfway between ${fmt(Math.floor(t))} and ${fmt(Math.ceil(t))}.`,
    };
  }
  let q = rand(-7, 7);
  if (q % 4 === 0) q += q < 0 ? 1 : -1;
  if (q === 0) q = -3;
  const t = q / 4;
  return {
    key: `pln-qtr-${q}`,
    prompt: `Put ${fracStr(q, 4)} on the number line.`,
    speech: talk(`Drag the marker to ${fracStr(q, 4)}.`),
    visual: NONE,
    ...act({ kind: "placeOnLine", min: -2, max: 2, step: 0.25, labelStep: 1, target: t, fractions: 4 }, t),
    hint: "Each whole is cut into 4 quarters. Negative numbers go left of 0.",
    explain: `${fracStr(q, 4)} is ${Math.abs(q)} quarter${Math.abs(q) === 1 ? "" : "s"} ${q < 0 ? "left" : "right"} of 0.`,
  };
}

/** 6.NS.C.6b, 6.NS.C.6c, 6.NS.C.8 — plot points in all four quadrants (Do it). */
export function plotFourQuadrants(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const pts = gridSpots(rand(1, 3), -6, 6, true).map((q, i) => ({ ...q, label: "ABC"[i] }));
    return {
      key: `pfq-${pts.map((q) => `${q.x}.${q.y}`).join("_")}`,
      prompt: `Plot ${andList(pts.map((q) => `${q.label}${pt(q.x, q.y)}`))}.`,
      speech: talk(`Plot ${pts.map((q) => `point ${q.label} at ${fmt(q.x)} comma ${fmt(q.y)}`).join(", then ")}.`),
      visual: NONE,
      ...act({ kind: "plotPoints", points: pts, size: 6, quadrants: 4 }, pts[0].x),
      hint: "Negative x goes left, negative y goes down. Start at the origin.",
      explain: pts.map((q) => `${q.label}: ${Math.abs(q.x)} ${q.x < 0 ? "left" : "right"}, ${Math.abs(q.y)} ${q.y < 0 ? "down" : "up"}.`).join(" "),
    };
  }
  if (kind === 1) {
    const [{ x, y }] = gridSpots(1, -6, 6, true);
    const overX = rand(0, 1) === 1;
    const r = overX ? { x, y: -y } : { x: -x, y };
    return {
      key: `pfq-refl-${x}-${y}-${overX}`,
      prompt: `Plot the reflection of ${pt(x, y)} across the ${overX ? "x" : "y"}-axis.`,
      speech: talk(`Reflect the point ${fmt(x)} comma ${fmt(y)} across the ${overX ? "x" : "y"} axis. Plot where it lands.`),
      visual: NONE,
      ...act({ kind: "plotPoints", points: [{ ...r, label: "A′" }], size: 6, quadrants: 4 }, r.x),
      hint: overX ? "Over the x-axis, x stays the same and y changes sign." : "Over the y-axis, y stays the same and x changes sign.",
      explain: `The reflection is ${pt(r.x, r.y)}.`,
    };
  }
  for (;;) {
    const [{ x, y }] = gridSpots(1, -6, 6);
    const flat = rand(0, 1) === 1;
    const d = (rand(0, 1) ? 1 : -1) * rand(2, 6);
    const B = flat ? { x: x + d, y } : { x, y: y + d };
    if (Math.abs(B.x) > 6 || Math.abs(B.y) > 6) continue;
    const dir = flat ? (d > 0 ? "right" : "left") : d > 0 ? "up" : "down";
    return {
      key: `pfq-dist-${x}-${y}-${flat}-${d}`,
      prompt: `Plot A${pt(x, y)}, then B ${Math.abs(d)} units ${dir} of A.`,
      speech: talk(`Plot point A at ${fmt(x)} comma ${fmt(y)}. Then plot B, ${Math.abs(d)} units ${dir} of A.`),
      visual: NONE,
      ...act({ kind: "plotPoints", points: [{ x, y, label: "A" }, { ...B, label: "B" }], size: 6, quadrants: 4 }, x),
      hint: `Moving ${dir} changes only the ${flat ? "x" : "y"}-coordinate.`,
      explain: `B is at ${pt(B.x, B.y)}, ${Math.abs(d)} units from A.`,
    };
  }
}

/** 6.NS.C.7a, 6.NS.C.7b — order signed numbers, temperatures and elevations (Do it). */
export function orderIntegers(): Question {
  const kind = rand(0, 3);
  const n = rand(4, 6);
  let vals: number[];
  if (kind === 3) {
    const qs = new Set<number>();
    while (qs.size < n) qs.add(rand(-12, 12));
    vals = [...qs].map((q) => q / 4);
  } else vals = distinct(n, kind === 2 ? -60 : -15, kind === 2 ? 40 : 15);
  if (vals.filter((v) => v < 0).length < 2) return orderIntegers();
  const up = kind === 0 ? rand(0, 1) === 1 : true;
  const list = sorted(vals);
  if (!up) list.reverse();
  const show = (v: number) => (kind === 1 ? `${fmt(v)} °C` : kind === 2 ? `${fmt(v)} m` : kind === 3 ? (rand(0, 1) ? fracStr(v * 4, 4) : ds(v)) : fmt(v));
  const items = list.map(show);
  if (new Set(items).size < items.length) return orderIntegers();
  const dir = kind === 1 ? "coldest to warmest" : kind === 2 ? "lowest to highest" : up ? "least to greatest" : "greatest to least";
  return {
    key: `oint-${kind}-${up}-${sorted(vals).join("_")}`,
    prompt: `Tap the ${kind === 1 ? "temperatures" : kind === 2 ? "elevations" : "numbers"} from ${dir}.`,
    speech: talk(`Tap them in order, from ${dir}.`),
    visual: NONE,
    ...act({ kind: "order", items, direction: dir }, n),
    hint: "Picture a number line: the further left, the less. −10 is less than −2.",
    explain: `In order: ${items.join(", ")}.`,
  };
}

/* ------------------------------------------------------------- 8. Expressions */

/** 6.EE.A.3, 6.EE.A.4 — sort expressions: equivalent or not (Do it). */
export function sortEquivalent(): Question {
  const kind = rand(0, 1);
  let target: string, good: string[], bad: string[], key: string;
  if (kind === 0) {
    const k = rand(2, 6);
    const m = rand(2, 9);
    target = `${k}(x + ${m})`;
    good = [`${k}x + ${k * m}`, `${k * m} + ${k}x`, `${k}(${m} + x)`, ...(k <= 3 ? [`${Array(k).fill("x").join(" + ")} + ${k * m}`] : [])];
    bad = [`${k}x + ${m}`, `${k + m}x`, `x + ${k * m}`, `${k}x + ${k + m}`, `${k * m}x`];
    key = `seq-d-${k}-${m}`;
  } else {
    const [a, b] = distinct(2, 2, 9);
    target = `${a}x + ${b}x`;
    good = [`${a + b}x`, `${b}x + ${a}x`, `(${a} + ${b})x`];
    bad = [`${a * b}x`, `${a + b}x²`, `${a}x + ${b}`, `${a + b} + x`];
    key = `seq-c-${a}-${b}`;
  }
  const g = shuffle(good).slice(0, rand(2, 3));
  const w = shuffle(bad).slice(0, rand(2, 3));
  return {
    key: `${key}-${sorted(g.map((t) => good.indexOf(t))).join("")}-${sorted(w.map((t) => bad.indexOf(t))).join("")}`,
    prompt: `Sort: which are equivalent to ${target}?`,
    speech: talk(`Sort the expressions. Which ones are equivalent to ${target}?`),
    visual: NONE,
    ...act({ kind: "sort", bins: [`Same as ${target}`, "Not the same"], items: shuffle([...g.map((t) => ({ label: t, bin: 0 })), ...w.map((t) => ({ label: t, bin: 1 }))]) }, g.length),
    hint: "Try x = 1 in each one. Equivalent expressions give the same value.",
    explain: `${target} = ${good[0]}. The equivalent ones are: ${g.join(", ")}.`,
  };
}

/** 6.EE.A.1, 6.EE.A.2c, 6.EE.A.3 — spot the mistake; which expression gives this answer? */
export function orderOpsErrors(): Question {
  const kind = rand(0, 4);
  const who = pick(NAMES);
  const [a, b, c] = [rand(2, 12), rand(2, 9), rand(2, 9)];
  const bank: [string, string, string[], string, string][] = [
    [`${who} says ${a} + ${b} × ${c} = ${(a + b) * c}.`, "Added before multiplying", ["Multiplied before adding", "Made an adding slip", "Nothing, it's right"], "Multiply before you add.", `${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`],
    [`${who} says ${b + 1}² = ${2 * (b + 1)}.`, `Did ${b + 1} × 2, not ${b + 1} × ${b + 1}`, ["Should have added", "Forgot the brackets", "Nothing, it's right"], "The little 2 means multiply the number by itself.", `${b + 1}² = ${b + 1} × ${b + 1} = ${(b + 1) ** 2}.`],
    [`${who} says ${a + b + c} − ${b} + ${c} = ${a}.`, "Added first; go left to right", ["Subtracted first", "Made a counting slip", "Nothing, it's right"], "+ and − go left to right.", `${a + b + c} − ${b} = ${a + c}, then + ${c} = ${a + 2 * c}.`],
    [`${who} says ${b}(x + ${c}) = ${b}x + ${c}.`, `Didn't multiply ${c} by ${b}`, ["Should have added", `Multiplied x by ${c}`, "Nothing, it's right"], "The number outside multiplies everything inside.", `${b}(x + ${c}) = ${b}x + ${b * c}.`],
  ];
  if (kind < 4) {
    const [said, right, wrong, hint, explain] = bank[kind];
    return {
      key: `ooe-${kind}-${a}-${b}-${c}`,
      prompt: `${said} What went wrong?`,
      speech: talk(`${said} What went wrong?`),
      visual: NONE,
      ...label(right, wrong),
      hint,
      explain,
    };
  }
  const target = a + b * c;
  const cands = [`(${a} + ${b}) × ${c}`, `${a} × ${b} + ${c}`, `${a} + ${b} + ${c}`, `${a} × (${b} + ${c})`];
  const vals = [(a + b) * c, a * b + c, a + b + c, a * (b + c)];
  const wrong = cands.filter((_, i) => vals[i] !== target);
  return {
    key: `ooe-rev-${a}-${b}-${c}`,
    prompt: `Which expression equals ${target}?`,
    speech: `Which expression equals ${target}?`,
    visual: NONE,
    ...label(`${a} + ${b} × ${c}`, wrong),
    hint: "Work out each one with the order of operations.",
    explain: `${a} + ${b} × ${c} = ${a} + ${b * c} = ${target}.`,
  };
}

/** 6.EE.A.2b, 7.EE.A.1 — sort like terms (Do it). */
export function likeTerms(): Question {
  const kind = rand(0, 1);
  const coef = (v: string) => pick([`${rand(2, 9)}${v}`, `−${rand(2, 9)}${v}`, v, `−${v}`, `${pick([0.5, 1.5, 2.5])}${v}`]);
  const uniq = (make: () => string, n: number) => {
    const out = new Set<string>();
    while (out.size < n) out.add(make());
    return [...out];
  };
  if (kind === 0) {
    const xs = uniq(() => coef("x"), rand(2, 3));
    const ys = uniq(() => coef("y"), rand(1, 3));
    const ns = uniq(() => pick([String(rand(1, 20)), `−${rand(1, 20)}`, ds(sh(rand(11, 99), -1))]), rand(1, 2));
    const items = shuffle([...xs.map((t) => ({ label: t, bin: 0 })), ...ys.map((t) => ({ label: t, bin: 1 })), ...ns.map((t) => ({ label: t, bin: 2 }))]);
    return {
      key: `lt-3-${[...xs, ...ys, ...ns].join("_")}`,
      prompt: "Sort the terms: x-terms, y-terms or numbers.",
      speech: "Sort the terms into x terms, y terms, and plain numbers.",
      visual: NONE,
      ...act({ kind: "sort", bins: ["x-terms", "y-terms", "Numbers"], items }, xs.length),
      hint: "Like terms have exactly the same letter part. Numbers with no letter are constants.",
      explain: `x-terms: ${xs.join(", ")}. y-terms: ${ys.join(", ")}. Numbers: ${ns.join(", ")}.`,
    };
  }
  const k = rand(2, 9);
  const like = uniq(() => coef("x"), rand(2, 3)).filter((t) => t !== `${k}x`);
  const unlike = shuffle([`${k}x²`, `${k}y`, `${k}`, "xy", `−${k}y`, "x²"]).slice(0, rand(2, 3));
  return {
    key: `lt-2-${k}-${[...like, ...unlike].join("_")}`,
    prompt: `Sort: which terms are like terms with ${k}x?`,
    speech: `Sort the terms. Which ones are like terms with ${k} x?`,
    visual: NONE,
    ...act({ kind: "sort", bins: [`Like ${k}x`, "Not like"], items: shuffle([...like.map((t) => ({ label: t, bin: 0 })), ...unlike.map((t) => ({ label: t, bin: 1 }))]) }, like.length),
    hint: "A like term has just x, to the first power, with any number in front.",
    explain: `Like terms with ${k}x: ${like.join(", ")}. x² and y-terms are different kinds.`,
  };
}

/* --------------------------------------------------------------- 9. Equations */

/** 6.EE.B.5, 6.EE.B.8 — read inequality graphs; test values against them. */
export function inequalityGraphs(): Question {
  const c = rand(-7, 7);
  const dir: "left" | "right" = rand(0, 1) ? "right" : "left";
  const open = rand(0, 1) === 1;
  const sym = dir === "right" ? (open ? ">" : "≥") : open ? "<" : "≤";
  const ok = (v: number) => (sym === ">" ? v > c : sym === "≥" ? v >= c : sym === "<" ? v < c : v <= c);
  const ray = { at: c, dir, open };
  if (rand(0, 1) === 0) {
    const cands = [c - 3, c - 2, c - 1, c, c + 1, c + 2, c + 3];
    const good = pick(cands.filter(ok));
    const bad = shuffle(cands.filter((v) => !ok(v))).slice(0, 3);
    return {
      key: `igr-pick-${c}-${dir}-${open}-${good}`,
      prompt: "Which number is a solution shown by the graph?",
      speech: "The number line shows the solutions of an inequality. Which number is a solution?",
      visual: { kind: "numberline", min: -10, max: 10, step: 1, labelStep: 5, from: c, to: good, ray },
      needsVisual: true,
      answer: good,
      input: "choices",
      choices: shuffle([good, ...bad]),
      hint: `Solutions are in the shaded part. ${open ? "The open dot itself is NOT included." : "The closed dot IS included."}`,
      explain: `The graph shows x ${sym} ${fmt(c)}. ${fmt(good)} ${sym} ${fmt(c)} is true.`,
    };
  }
  const v = c + pick([-2, -1, 0, 1, 2]);
  const yes = ok(v);
  return {
    key: `igr-yn-${c}-${dir}-${open}-${v}`,
    prompt: `Is ${fmt(v)} a solution shown by the graph?`,
    speech: talk(`The number line shows the solutions of an inequality. Is ${fmt(v)} a solution?`),
    visual: { kind: "numberline", min: -10, max: 10, step: 1, labelStep: 5, from: c, to: c, ray },
    needsVisual: true,
    ...label(yes ? "Yes" : "No", [yes ? "No" : "Yes"]),
    hint: "Is the number in the shaded part? Watch whether the dot is open or closed.",
    explain: `The graph shows x ${sym} ${fmt(c)}. ${fmt(v)} ${sym} ${fmt(c)} is ${yes ? "true" : "false"}.`,
  };
}

/** 6.EE.C.9 — graph a rule from a table or story (Do it). */
export function graphRule(): Question {
  const times = rand(0, 1) === 1;
  const k = times ? rand(1, 3) : rand(1, 6);
  const story = rand(0, 1) === 1;
  const f = (x: number) => (times ? k * x : x + k);
  const eq = times ? `y = ${k === 1 ? "" : k}x` : `y = x + ${k}`;
  const text = times
    ? `Each pack has ${k} card${k > 1 ? "s" : ""}. Draw ${eq} for x packs.`
    : `You start with ${k} stickers and get 1 a day. Draw ${eq}.`;
  return {
    key: `grl-${times}-${k}-${story}`,
    prompt: story ? text : `Draw the line ${eq}.`,
    speech: talk(story ? text.replace("Draw", "Tap two points to draw") : `Tap two points to draw the line ${eq}.`),
    visual: { kind: "table", header: ["x", "y"], rows: [0, 1, 2].map((x) => [x, f(x)]) },
    ...act({ kind: "drawLine", m: times ? k : 1, b: times ? 0 : k, size: 10, quadrants: 1 }, times ? k : 1),
    hint: "Plot two rows of the table, then join them.",
    explain: `x is independent and y depends on it. The line goes through ${pt(0, f(0))} and ${pt(2, f(2))}.`,
  };
}

/** 7.EE.B.4a, 7.EE.B.4b — find the wrong step in a solution. */
export function solveErrors(): Question {
  const who = pick(NAMES);
  if (rand(0, 3) > 0) {
    const p = rand(2, 6);
    const x = rand(1, 10);
    const q = rand(1, 15);
    const r = p * x + q;
    const err = pick(["s1", "s2", "none"]);
    const s1 = err === "s1" ? r + q : r - q;
    const s2 = err === "s1" ? fracStr(r + q, p) : err === "s2" ? fmt(r - q - p) : fmt(x);
    const right = err === "s1" ? "Step 1" : err === "s2" ? "Step 2" : "No mistake";
    return {
      key: `ser-${p}-${x}-${q}-${err}`,
      prompt: `${who} solved ${p}x + ${q} = ${r}. Which step is wrong?`,
      speech: `${who} solved ${p} x plus ${q} equals ${r}. Look at the steps. Which step is wrong?`,
      visual: { kind: "table", header: ["Step", "Work"], rows: [["1", `${p}x = ${s1}`], ["2", `x = ${s2}`]] },
      needsVisual: true,
      ...label(right, ["Step 1", "Step 2", "No mistake"].filter((t) => t !== right), true),
      hint: "Step 1 should undo the + by subtracting. Step 2 should undo the × by dividing.",
      explain: `${p}x = ${r} − ${q} = ${r - q}, then x = ${r - q} ÷ ${p} = ${x}.${err === "none" ? " No mistake!" : ""}`,
    };
  }
  const p = rand(2, 6);
  const s = rand(-6, 6) || 2;
  const forgot = rand(0, 1) === 1;
  const sym = pick([">", "<"]);
  const flip = sym === ">" ? "<" : ">";
  const rhs = -p * s;
  const right = forgot ? "Forgot to flip the sign" : "No mistake";
  return {
    key: `ser-ineq-${p}-${s}-${sym}-${forgot}`,
    prompt: `${who} solved −${p}x ${sym} ${fmt(rhs)} and got x ${forgot ? sym : flip} ${fmt(s)}. Mistake?`,
    speech: talk(`${who} solved negative ${p}x ${sym} ${fmt(rhs)} and got x ${forgot ? sym : flip} ${fmt(s)}. Is there a mistake?`),
    visual: NONE,
    ...label(right, ["Forgot to flip the sign", "Divided wrong", "No mistake"].filter((t) => t !== right), true),
    hint: "Dividing both sides by a negative number flips the inequality sign.",
    explain: `Divide by −${p} and flip: x ${flip} ${fmt(s)}.`,
  };
}

/* ----------------------------------------------------------- 10. Area & volume */

const SHAPE_PROPS: Record<string, [boolean, boolean, boolean, boolean]> = {
  // [always a parallelogram, always 4 right angles, always 4 equal sides, quadrilateral]
  square: [true, true, true, true],
  rectangle: [true, true, false, true],
  rhombus: [true, false, true, true],
  parallelogram: [true, false, false, true],
  trapezoid: [false, false, false, true],
  kite: [false, false, false, true],
  triangle: [false, false, false, false],
  pentagon: [false, false, false, false],
  hexagon: [false, false, false, false],
};
const PROP_BINS: [string, string][] = [
  ["Always a parallelogram", "Not always"],
  ["Always 4 right angles", "Not always"],
  ["Always 4 equal sides", "Not always"],
  ["Quadrilateral", "Not a quadrilateral"],
];

/** 5.G.B.3, 5.G.B.4 — sort shapes by their properties (Do it). */
export function sortShapes(): Question {
  const i = rand(0, PROP_BINS.length - 1);
  const pool = Object.keys(SHAPE_PROPS).filter((n) => i === 3 || SHAPE_PROPS[n][3]);
  for (;;) {
    const names = shuffle(pool).slice(0, rand(5, 6));
    const yes = names.filter((n) => SHAPE_PROPS[n][i]);
    if (!yes.length || yes.length === names.length) continue;
    return {
      key: `ssh-${i}-${sorted(names.map((n) => pool.indexOf(n))).join(".")}`,
      prompt: `Sort the shapes: ${PROP_BINS[i][0].toLowerCase()}?`,
      speech: `Sort the shapes into: ${PROP_BINS[i][0].toLowerCase()}, or ${PROP_BINS[i][1].toLowerCase()}.`,
      visual: NONE,
      ...act({ kind: "sort", bins: PROP_BINS[i], items: names.map((n) => ({ label: n, bin: SHAPE_PROPS[n][i] ? 0 : 1 })) }, yes.length),
      hint: "Squares are special rectangles AND special rhombuses. All of those are parallelograms.",
      explain: `${PROP_BINS[i][0]}: ${yes.join(", ")}.`,
    };
  }
}

/** 5.G.B.3, 5.G.B.4 — draw quadrilaterals and other polygons from their properties (Do it). */
export function drawQuadrilaterals(): Question {
  const kind = rand(0, 3);
  if (kind === 3) {
    const [x, y] = [rand(0, 2), rand(0, 2)];
    const [w, h] = [rand(2, 5), rand(2, 5)];
    const shapes: [string, { x: number; y: number }[]][] = [
      ["rectangle", [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]],
      ["rhombus", [{ x: x + w, y }, { x: x + 2 * w, y: y + h }, { x: x + w, y: y + 2 * h }, { x, y: y + h }]],
      ["kite", [{ x: x + w, y }, { x: x + 2 * w, y: y + h }, { x: x + w, y: y + h + 2 }, { x, y: y + h }]],
      ["isosceles trapezoid", [{ x, y }, { x: x + 2 * w, y }, { x: x + w + 1, y: y + h }, { x: x + w - 1, y: y + h }]],
    ];
    const j = rand(0, shapes.length - 1);
    const [name, points] = shapes[j];
    if (points.some((q) => q.x > 10 || q.y > 10)) return drawQuadrilaterals();
    return {
      key: `dq-sym-${j}-${x}-${y}-${w}-${h}`,
      prompt: `Draw a line of symmetry on the ${name}.`,
      speech: `Tap two points to draw a fold line that splits the ${name} into matching halves.`,
      visual: NONE,
      ...act({ kind: "symmetryLine", points, size: 10 }, points.length),
      hint: "Fold it in your mind: both halves must match exactly.",
      explain: `A ${name} folds onto itself along a line through its middle.`,
    };
  }
  if (kind === 0) {
    const bank: [string, Omit<Extract<Activity, { kind: "drawShape" }>, "kind" | "size">, string][] = [
      ["square", { sides: 4, rightAngles: 4, equalSides: true }, "4 equal sides and 4 right angles."],
      ["rectangle", { sides: 4, rightAngles: 4 }, "4 right angles. (A square counts too!)"],
      ["rhombus", { sides: 4, equalSides: true, parallelPairs: 2 }, "4 equal sides; it can lean over."],
      ["parallelogram with no right angles", { sides: 4, parallelPairs: 2, rightAngles: 0 }, "2 pairs of parallel sides, slanted."],
      ["trapezoid", { sides: 4, parallelPairs: 1 }, "exactly 1 pair of parallel sides."],
      ["right triangle", { sides: 3, rightAngles: 1 }, "3 sides and one square corner."],
      ["pentagon", { sides: 5 }, "5 straight sides."],
      ["hexagon", { sides: 6 }, "6 straight sides."],
      ["quadrilateral with exactly 2 right angles", { sides: 4, rightAngles: 2 }, "4 sides, 2 square corners."],
    ];
    const j = rand(0, bank.length - 1);
    const [name, spec, about] = bank[j];
    return {
      key: `dq-${j}`,
      prompt: `Draw a ${name} on the dot grid.`,
      speech: `Tap corners on the dot grid to draw a ${name}. Tap the first corner again to close it.`,
      visual: NONE,
      ...act({ kind: "drawShape", size: 8, ...spec }, spec.sides),
      hint: `A ${name.split(" with")[0]} has ${about}`,
      explain: `A ${name} has ${about}`,
    };
  }
  if (kind === 1) {
    const A = pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24]);
    return {
      key: `dq-rect-${A}`,
      prompt: `Draw a rectangle with an area of ${A} squares.`,
      speech: `Draw a rectangle that covers ${A} squares on the grid.`,
      visual: NONE,
      ...act({ kind: "drawShape", size: 8, sides: 4, rightAngles: 4, area: A }, A),
      hint: `Think of two numbers that multiply to ${A}.`,
      explain: `For example ${factorsOf(A).filter((f) => f <= 8 && A / f <= 8)[0]} × ${A / factorsOf(A).filter((f) => f <= 8 && A / f <= 8)[0]} = ${A}.`,
    };
  }
  const s = rand(2, 6);
  return {
    key: `dq-sq-${s}`,
    prompt: `Draw a square with a perimeter of ${4 * s} units.`,
    speech: `Draw a square whose sides add up to ${4 * s} units.`,
    visual: NONE,
    ...act({ kind: "drawShape", size: 8, sides: 4, rightAngles: 4, equalSides: true, perimeter: 4 * s }, 4 * s),
    hint: "A square's 4 sides are equal. Divide the perimeter by 4.",
    explain: `${4 * s} ÷ 4 = ${s}, so each side is ${s} units.`,
  };
}

/** 6.G.A.1 — draw triangles, parallelograms and trapezoids with a given area (Do it). */
export function drawArea(): Question {
  const kind = rand(0, 3);
  const A = rand(3, 16);
  const bank: [string, Omit<Extract<Activity, { kind: "drawShape" }>, "kind" | "size">, string][] = [
    ["triangle", { sides: 3, area: A }, `Area = base × height ÷ 2, so base × height must be ${2 * A}.`],
    ["right triangle", { sides: 3, rightAngles: 1, area: A }, `The two legs multiply to ${2 * A}.`],
    ["parallelogram with no right angles", { sides: 4, parallelPairs: 2, rightAngles: 0, area: A }, `Area = base × height = ${A}. Slant the sides but keep the height.`],
    ["trapezoid", { sides: 4, parallelPairs: 1, area: A }, `Area = (top + bottom) × height ÷ 2 = ${A}.`],
  ];
  const [name, spec, about] = bank[kind];
  return {
    key: `da-${kind}-${A}`,
    prompt: `Draw a ${name} with an area of ${A} squares.`,
    speech: `Tap corners on the dot grid to draw a ${name} with an area of ${A} square units.`,
    visual: NONE,
    ...act({ kind: "drawShape", size: 8, ...spec }, A),
    hint: about,
    explain: `${about} Many shapes work!`,
  };
}

/** 6.G.A.3 — draw polygons on the coordinate plane from vertices (Do it). */
export function polygonPlot(): Question {
  const kind = rand(0, 2);
  for (;;) {
    const [x1, y1] = [rand(-6, 3), rand(-6, 3)];
    const [w, h] = [rand(2, 6), rand(2, 6)];
    if (x1 + w > 6 || y1 + h > 6) continue;
    if (kind === 0) {
      const pts = [{ x: x1, y: y1, label: "A" }, { x: x1 + w, y: y1, label: "B" }, { x: x1 + w, y: y1 + h, label: "C" }, { x: x1, y: y1 + h, label: "D" }];
      return {
        key: `pp-rect-${x1}-${y1}-${w}-${h}`,
        prompt: `Rectangle ABCD: A${pt(x1, y1)}, B${pt(x1 + w, y1)}, C${pt(x1 + w, y1 + h)}. Plot A, B, C and D.`,
        speech: talk(`Rectangle ABCD has A at ${fmt(x1)}, ${fmt(y1)}; B at ${fmt(x1 + w)}, ${fmt(y1)}; and C at ${fmt(x1 + w)}, ${fmt(y1 + h)}. Plot all four corners.`),
        visual: NONE,
        ...act({ kind: "plotPoints", points: pts, size: 6, quadrants: 4 }, x1),
        hint: "D lines up with A (same x) and with C (same y).",
        explain: `D is ${pt(x1, y1 + h)}. The rectangle is ${w} wide and ${h} tall.`,
      };
    }
    if (kind === 1) {
      const s = Math.min(w, h);
      const pts = [{ x: x1, y: y1, label: "A" }, { x: x1 + s, y: y1, label: "B" }, { x: x1 + s, y: y1 + s, label: "C" }, { x: x1, y: y1 + s, label: "D" }];
      return {
        key: `pp-sq-${x1}-${y1}-${s}`,
        prompt: `Square ABCD: A${pt(x1, y1)}, B${pt(x1 + s, y1)}; C and D above. Plot all four.`,
        speech: talk(`Square ABCD has A at ${fmt(x1)}, ${fmt(y1)} and B at ${fmt(x1 + s)}, ${fmt(y1)}. C and D are above them. Plot all four corners.`),
        visual: NONE,
        ...act({ kind: "plotPoints", points: pts, size: 6, quadrants: 4 }, x1),
        hint: `AB is ${s} units long, so every side is ${s}. Go ${s} up from A and from B.`,
        explain: `C is ${pt(x1 + s, y1 + s)} and D is ${pt(x1, y1 + s)}.`,
      };
    }
    const pts = [{ x: x1, y: y1, label: "A" }, { x: x1 + w, y: y1, label: "B" }, { x: x1, y: y1 + h, label: "C" }];
    return {
      key: `pp-tri-${x1}-${y1}-${w}-${h}`,
      prompt: `Plot triangle A${pt(x1, y1)}, B${pt(x1 + w, y1)}, C${pt(x1, y1 + h)}.`,
      speech: talk(`Plot the triangle with A at ${fmt(x1)}, ${fmt(y1)}; B at ${fmt(x1 + w)}, ${fmt(y1)}; and C at ${fmt(x1)}, ${fmt(y1 + h)}.`),
      visual: NONE,
      ...act({ kind: "plotPoints", points: pts, size: 6, quadrants: 4 }, x1),
      hint: "Plot each corner: across first, then up or down.",
      explain: `AB is ${w} units and AC is ${h} units, so the triangle's area is ${w} × ${h} ÷ 2 = ${ds((w * h) / 2)}.`,
    };
  }
}

const NET_SOLIDS: ["cube" | "prism" | "triangular-prism" | "pyramid", string, number][] = [
  ["cube", "Cube", 6],
  ["prism", "Rectangular prism", 6],
  ["triangular-prism", "Triangular prism", 5],
  ["pyramid", "Square pyramid", 5],
];

/** 6.G.A.4 — nets: name the solid, count faces, find surface area. */
export function netsLevel(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const i = rand(0, NET_SOLIDS.length - 1);
    const [solid, name, faces] = NET_SOLIDS[i];
    const [l, w, h] = [rand(2, 6), rand(2, 6), rand(2, 6)];
    const dims = solid === "cube" ? { l, w: l, h: l } : solid === "prism" ? { l, w, h } : {};
    if (kind === 0) {
      return {
        key: `nt-name-${i}-${JSON.stringify(dims)}`,
        prompt: "This net folds up into which solid?",
        speech: "Imagine folding up this net. Which solid does it make?",
        visual: { kind: "net", solid, ...dims, unit: "cm" },
        needsVisual: true,
        ...label(name, NET_SOLIDS.map((n) => n[1]).filter((n) => n !== name)),
        hint: "Count the faces and look at their shapes: squares, rectangles, triangles?",
        explain: `${faces} faces like these fold into a ${name.toLowerCase()}.`,
      };
    }
    return {
      key: `nt-faces-${i}-${JSON.stringify(dims)}`,
      prompt: "How many faces does this net have?",
      speech: "How many faces does this net have?",
      visual: { kind: "net", solid, ...dims, unit: "cm" },
      needsVisual: true,
      ...keypad(faces),
      hint: "Count every flat shape in the net.",
      explain: `It has ${faces} faces: it folds into a ${name.toLowerCase()}.`,
    };
  }
  if (kind === 2) {
    const s = rand(2, 10);
    return {
      key: `nt-cube-${s}`,
      prompt: `Each square in this cube net is ${s} cm wide. Surface area?`,
      speech: `This net folds into a cube with ${s} centimeter edges. What is the total area of the net?`,
      visual: { kind: "net", solid: "cube", l: s, w: s, h: s, unit: "cm" },
      unit: "cm²",
      ...keypad(6 * s * s),
      hint: "The net has 6 equal squares. Find one, then multiply by 6.",
      explain: `6 × ${s} × ${s} = ${6 * s * s} cm²`,
    };
  }
  const [l, w, h] = [rand(2, 9), rand(2, 7), rand(2, 7)];
  return {
    key: `nt-box-${l}-${w}-${h}`,
    prompt: "Find the surface area from the net.",
    speech: `This net folds into a box ${l} by ${w} by ${h} centimeters. What is the total area of the net?`,
    visual: { kind: "net", solid: "prism", l, w, h, unit: "cm" },
    needsVisual: true,
    unit: "cm²",
    ...keypad(2 * (l * w + l * h + w * h)),
    hint: "The net has 3 pairs of matching rectangles. Add one of each, then double.",
    explain: `2 × (${l * w} + ${l * h} + ${w * h}) = ${2 * (l * w + l * h + w * h)} cm²`,
  };
}

/* ------------------------------------------------------------------- 11. Data */

/** 6.SP.A.1 — sort questions: statistical or not (Do it). */
export function sortQuestions(): Question {
  const n = rand(4, 6);
  const picks = shuffle(STAT_QS.flatMap((pair, i) => [{ q: pair[0], bin: 0, id: `${i}s` }, { q: pair[1], bin: 1, id: `${i}n` }])).slice(0, n);
  if (picks.every((p) => p.bin === 0) || picks.every((p) => p.bin === 1)) return sortQuestions();
  const yes = picks.filter((p) => p.bin === 0).length;
  return {
    key: `sqs-${picks.map((p) => p.id).sort().join(".")}`,
    prompt: "Sort the questions: statistical or not?",
    speech: "Sort each question. Is it a statistical question, with answers that vary, or not?",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Statistical", "Not statistical"], items: picks.map((p) => ({ label: p.q, bin: p.bin })) }, yes),
    hint: "Would you collect lots of different answers? Then it's statistical.",
    explain: `Statistical: ${picks.filter((p) => p.bin === 0).map((p) => `"${p.q}"`).join(" ")}`,
  };
}

/** 6.SP.B.4, 6.SP.B.5a — make a dot plot from data (Do it). */
export function makeDotPlot(): Question {
  const lo = rand(0, 5);
  const span = rand(5, 8);
  const vals = moundData(lo, lo + span, rand(6, 12));
  const lbl = pick(["Goals per game", "Pets per family", "Hours of sleep", "Books read"]);
  return {
    key: `mdp-${lo}-${span}-${sorted(vals).join(".")}`,
    prompt: `Make a dot plot: ${vals.join(", ")}`,
    speech: `Make a dot plot of ${lbl.toLowerCase()}: ${vals.join(", ")}.`,
    visual: NONE,
    ...act({ kind: "dotPlot", values: vals, min: lo, max: lo + span, step: 1, label: lbl }, vals.length),
    hint: "Put one dot above the number line for each value. Cross values off as you go.",
    explain: `${vals.length} values, so ${vals.length} dots. The tallest stack is at ${modeOf(vals)}.`,
  };
}

/** 5.MD.B.2 — line plots with fractions: make them and use them. */
export function fractionLinePlot(): Question {
  const kind = rand(0, 2);
  const d = pick([4, 8]);
  const nums = Array.from({ length: rand(5, 9) }, () => rand(1, d));
  const thing = pick([["Rain (inches)", "inch"], ["Water in beakers (L)", "liter"], ["Sand in bags (lb)", "pound"]]);
  const vals = nums.map((k) => k / d);
  if (kind === 0) {
    return {
      key: `flp-make-${d}-${sorted(nums).join(".")}`,
      prompt: `Make a line plot: ${nums.map((k) => fracStr(k, d)).join(", ")}`,
      speech: talk(`Make a line plot of ${thing[0].replace(/ \(.*\)/, "").toLowerCase()}: ${nums.map((k) => fracStr(k, d)).join(", ")}.`),
      visual: NONE,
      ...act({ kind: "dotPlot", values: vals, min: 0, max: 1, step: 1 / d, label: thing[0] }, nums.length),
      hint: `The line is marked in ${pieces(d)}. Put one dot above each value.`,
      explain: `${nums.length} values, so ${nums.length} dots.`,
    };
  }
  const total = sum(nums);
  if (kind === 1) {
    return {
      key: `flp-share-${d}-${sorted(nums).join(".")}`,
      prompt: `Share all of it equally among the ${nums.length} ${thing[1] === "liter" ? "beakers" : "days"}. Each gets?`,
      speech: talk(`The line plot shows ${thing[0].replace(/ \(.*\)/, "").toLowerCase()}. If the total were shared equally among all ${nums.length}, how much would each get?`),
      visual: { kind: "dots", values: sorted(vals), min: 0, max: 1, label: thing[0] },
      needsVisual: true,
      ...label(fracStr(total, d * nums.length), [fracStr(total, d), fracStr(total + 1, d * nums.length), fracStr(nums.length, total), fracStr(total, d * (nums.length + 1))]),
      hint: "Add up all the values first. Then divide the total by how many there are.",
      explain: `Total: ${fracStr(total, d)}. ${fracStr(total, d)} ÷ ${nums.length} = ${fracStr(total, d * nums.length)}.`,
    };
  }
  return {
    key: `flp-total-${d}-${sorted(nums).join(".")}`,
    prompt: `What is the total of all the values?`,
    speech: talk(`The line plot shows ${thing[0].replace(/ \(.*\)/, "").toLowerCase()}. What is the total of all the values?`),
    visual: { kind: "dots", values: sorted(vals), min: 0, max: 1, label: thing[0] },
    needsVisual: true,
    ...label(fracStr(total, d), [fracStr(total + 1, d), fracStr(total, d * 2), fracStr(nums.length, d), fracStr(total - 1, d)]),
    hint: "Group the dots by value. Multiply, then add the groups.",
    explain: `${nums.map((k) => fracStr(k, d)).join(" + ")} = ${fracStr(total, d)}`,
  };
}

/** 6.SP.B.4 — make a histogram from data (Do it). */
export function makeHistogram(): Question {
  const n = rand(12, 18);
  const vals = Array.from({ length: n }, () => Math.min(49, Math.max(0, 25 + rand(-12, 12) + rand(-12, 12))));
  const bins = ["0–9", "10–19", "20–29", "30–39", "40–49"];
  const items = bins.map((b, i) => ({ label: b, value: vals.filter((v) => Math.floor(v / 10) === i).length }));
  const top = Math.max(...items.map((i) => i.value));
  const rows: (number | string)[][] = [];
  for (let i = 0; i < n; i += 6) rows.push([...vals.slice(i, i + 6), ...Array(Math.max(0, i + 6 - n)).fill("")]);
  return {
    key: `mh-${vals.join(".")}`,
    prompt: "Make a histogram of these test scores.",
    speech: "Count how many scores fall in each group of ten, and drag each bar to that height.",
    visual: { kind: "table", header: ["Scores", "", "", "", "", ""], rows },
    needsVisual: true,
    ...act({ kind: "barGraph", title: "Test scores", items, max: top > 10 ? 20 : 10, step: 1, hideData: true }, n),
    hint: "Tally the scores 0–9, then 10–19, and so on. Each bar is a count.",
    explain: items.map((i) => `${i.label}: ${i.value}`).join(", "),
  };
}

/** Values 0–10 for a dot plot with a chosen shape. */
function shapedData(shape: 0 | 1 | 2): number[] {
  const base = shape === 0 ? [1, 2, 3 + rand(0, 2), 2, 1] : [4 + rand(0, 1), 3 + rand(0, 2), 2, 1, 1, 1];
  const start = shape === 0 ? rand(2, 6) : rand(0, 2);
  const vals = base.flatMap((c, i) => Array(c).fill(start + i));
  return shape === 2 ? vals.map((v) => 10 - v) : vals;
}

/** 6.SP.A.2, 6.SP.B.5d — describe the shape of data; choose a measure of center. */
export function dataShape(): Question {
  const shape = rand(0, 2) as 0 | 1 | 2;
  const vals = sorted(shapedData(shape));
  const kind = rand(0, 2);
  const visual: Visual = { kind: "dots", values: vals, min: 0, max: 10 };
  const names = ["Symmetric", "Skewed right (tail on the right)", "Skewed left (tail on the left)"];
  if (kind === 0) {
    return {
      key: `dsh-shape-${vals.join(".")}`,
      prompt: "How would you describe the shape of this data?",
      speech: "Look at the dot plot. How would you describe the shape of the data?",
      visual,
      needsVisual: true,
      ...label(names[shape], names.filter((_, i) => i !== shape), true),
      hint: "Symmetric data looks the same on both sides of the middle. A tail is a long thin stretch of dots.",
      explain: `The data is ${names[shape].toLowerCase()}.`,
    };
  }
  const mean = sum(vals) / vals.length;
  const n = vals.length;
  const median = n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
  if (kind === 1) {
    const right = shape === 0 ? "Mean" : "Median";
    return {
      key: `dsh-center-${vals.join(".")}`,
      prompt: "Which measure of center fits this data best?",
      speech: "Look at the shape of the dot plot. Which measure of center fits the data best?",
      visual,
      needsVisual: true,
      ...label(right, [right === "Mean" ? "Median" : "Mean"]),
      hint: "A long tail pulls the mean toward it. The median stays in the middle.",
      explain: shape === 0 ? "The data is symmetric, so the mean is a good center." : "The data is skewed, so the median describes the center better.",
    };
  }
  const gap = mean - median;
  const right = Math.abs(gap) < 0.3 ? "About the same" : gap > 0 ? "The mean" : "The median";
  return {
    key: `dsh-cmp-${vals.join(".")}`,
    prompt: "Which is greater here: the mean or the median?",
    speech: "Look at the dot plot. Which is greater: the mean or the median?",
    visual,
    needsVisual: true,
    ...label(right, ["The mean", "The median", "About the same"].filter((t) => t !== right), true),
    hint: "The mean gets pulled toward the tail. The median is the middle value.",
    explain: `Mean ≈ ${ds(Math.round(mean * 10) / 10)}, median = ${ds(median)}.`,
  };
}

/* ---------------------------------------------------------- 12. Angles & circles */

/** 7.G.B.5, 7.G.A.2 — make supplementary, complementary, vertical and triangle angles (Do it). */
export function makeAngles(): Question {
  const kind = rand(0, 3);
  let deg: number, prompt: string, hint: string, explain: string, key: string;
  if (kind === 0) {
    const a = 5 * rand(2, 34);
    [deg, key] = [180 - a, `ma-supp-${a}`];
    prompt = `Make the supplement of a ${a}° angle.`;
    hint = "Supplementary angles add up to 180°.";
    explain = `180 − ${a} = ${deg}°`;
  } else if (kind === 1) {
    const a = 5 * rand(1, 17);
    [deg, key] = [90 - a, `ma-comp-${a}`];
    prompt = `Make the complement of a ${a}° angle.`;
    hint = "Complementary angles add up to 90°.";
    explain = `90 − ${a} = ${deg}°`;
  } else if (kind === 2) {
    const a = 5 * rand(4, 20);
    const b = 5 * rand(4, Math.min(30, 34 - a / 5));
    [deg, key] = [180 - a - b, `ma-tri-${a}-${b}`];
    prompt = `A triangle has angles ${a}° and ${b}°. Make the third angle.`;
    hint = "A triangle's angles add up to 180°.";
    explain = `180 − ${a} − ${b} = ${deg}°`;
  } else {
    const a = 5 * rand(3, 33);
    [deg, key] = [a, `ma-vert-${a}`];
    prompt = `Two lines cross, making a ${a}° angle. Make the angle opposite it.`;
    hint = "Vertical (opposite) angles are equal.";
    explain = `Vertical angles match: ${a}°.`;
  }
  return {
    key,
    prompt,
    speech: talk(prompt.replace("Make", "Drag the ray to make")),
    visual: NONE,
    ...act({ kind: "makeAngle", degrees: deg, scale: true }, deg),
    hint,
    explain,
  };
}

/** 7.G.A.2 — draw triangles that meet given conditions (Do it). */
export function drawTriangles(): Question {
  const kind = rand(0, 2);
  if (kind === 2) {
    const big = rand(0, 1) === 1;
    const P = big ? 24 : 12;
    return {
      key: `dtr-per-${P}`,
      prompt: `Draw a right triangle with a perimeter of ${P} units.`,
      speech: `Draw a right triangle whose three sides add up to ${P} units.`,
      visual: NONE,
      ...act({ kind: "drawShape", size: 10, sides: 3, rightAngles: 1, perimeter: P }, P),
      hint: `Try legs of ${big ? "6 and 8" : "3 and 4"}. How long is the slanted side then?`,
      explain: `${big ? "6 + 8 + 10" : "3 + 4 + 5"} = ${P}. The slanted side of a ${big ? "6-by-8" : "3-by-4"} right triangle is ${big ? 10 : 5}.`,
    };
  }
  const A = rand(2, 16);
  const right = kind === 0;
  return {
    key: `dtr-${right}-${A}`,
    prompt: `Draw a ${right ? "right triangle" : "triangle with no right angle"} with area ${A} squares.`,
    speech: `Tap corners to draw a ${right ? "right triangle" : "triangle with no right angle"} with an area of ${A} square units.`,
    visual: NONE,
    ...act({ kind: "drawShape", size: 8, sides: 3, rightAngles: right ? 1 : 0, area: A }, A),
    hint: `Area = base × height ÷ 2, so base × height = ${2 * A}.`,
    explain: `Any triangle with base × height = ${2 * A} works, like base ${factorsOf(2 * A).filter((f) => f <= 8 && (2 * A) / f <= 8)[0]} and height ${(2 * A) / factorsOf(2 * A).filter((f) => f <= 8 && (2 * A) / f <= 8)[0]}.`,
  };
}

/** 7.G.B.4 — estimate with circles; radius, diameter and π. */
export function circleEstimates(): Question {
  const kind = rand(0, 3);
  const d = rand(2, 30);
  if (kind === 0) {
    return {
      key: `cie-c-${d}`,
      prompt: `A circle's diameter is ${d} m. Its circumference is about…`,
      speech: `A circle's diameter is ${d} meters. About how long is its circumference?`,
      visual: { kind: "circle", r: d / 2, show: "diameter", unit: "m" },
      unit: "m",
      ...choose(3 * d, [2 * d, d, 6 * d, d + 3], 1, 1),
      hint: "The circumference is a bit more than 3 diameters (π ≈ 3.14).",
      explain: `About 3 × ${d} = ${3 * d} m (exactly ${ds(sh(314 * d, -2))} m).`,
    };
  }
  if (kind === 1) {
    return {
      key: `cie-wheel-${d}`,
      prompt: `A wheel's diameter is ${d} cm. One turn rolls about how far? (π ≈ 3)`,
      speech: `A wheel has a diameter of ${d} centimeters. About how far does it roll in one turn? Use 3 for pi.`,
      visual: { kind: "circle", r: d / 2, show: "diameter", unit: "cm" },
      unit: "cm",
      ...keypad(3 * d),
      hint: "One turn rolls out the whole circumference.",
      explain: `About 3 × ${d} = ${3 * d} cm.`,
    };
  }
  if (kind === 2) {
    const r = rand(1, 12);
    return {
      key: `cie-a-${r}`,
      prompt: `Radius ${r} m. Area is about 3 × r × r. About how much?`,
      speech: `A circle has a radius of ${r} meters. Its area is about 3 times r times r. About how much is that?`,
      visual: { kind: "circle", r, show: "radius", unit: "m" },
      unit: "m²",
      ...keypad(3 * r * r),
      hint: `${r} × ${r} first, then times 3.`,
      explain: `3 × ${r} × ${r} = ${3 * r * r} m² (exactly ${ds(sh(314 * r * r, -2))} m²).`,
    };
  }
  const toR = rand(0, 1) === 1;
  const v = toR ? 2 * rand(1, 15) : rand(1, 20);
  return {
    key: `cie-rd-${toR}-${v}`,
    prompt: toR ? `Diameter ${v} cm. What is the radius?` : `Radius ${v} cm. What is the diameter?`,
    speech: toR ? `A circle's diameter is ${v} centimeters. What is its radius?` : `A circle's radius is ${v} centimeters. What is its diameter?`,
    visual: { kind: "circle", r: toR ? v / 2 : v, show: toR ? "diameter" : "radius", unit: "cm" },
    unit: "cm",
    ...keypad(toR ? v / 2 : 2 * v),
    hint: "The diameter goes all the way across: it's 2 radii.",
    explain: toR ? `${v} ÷ 2 = ${v / 2} cm` : `2 × ${v} = ${2 * v} cm`,
  };
}

/** 7.G.B.4, 7.G.B.6 — circle word problems. */
export function circleStories(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const r = rand(5, 20);
    return {
      key: `cis-pizza-${r}`,
      prompt: `A pizza is ${2 * r} cm across. Its area? (π ≈ 3.14)`,
      speech: `A pizza is ${2 * r} centimeters across. What is its area? Use 3.14 for pi.`,
      visual: { kind: "circle", r, show: "diameter", unit: "cm" },
      unit: "cm²",
      ...keypad(sh(314 * r * r, -2)),
      hint: "Halve the diameter to get the radius. Then π × r × r.",
      explain: `r = ${r}. 3.14 × ${r} × ${r} = ${ds(sh(314 * r * r, -2))} cm²`,
    };
  }
  if (kind === 1) {
    const r = 5 * rand(2, 12);
    const n = rand(1, 3);
    return {
      key: `cis-track-${r}-${n}`,
      prompt: `A round track has radius ${r} m. How far is ${n} lap${n > 1 ? "s" : ""}? (π ≈ 3.14)`,
      speech: `A circular track has a radius of ${r} meters. How far is ${n} lap${n > 1 ? "s" : ""}? Use 3.14 for pi.`,
      visual: { kind: "circle", r, show: "radius", unit: "m" },
      unit: "m",
      ...keypad(sh(628 * r * n, -2)),
      hint: "One lap is the circumference: 2 × π × r.",
      explain: `2 × 3.14 × ${r} = ${ds(sh(628 * r, -2))} m per lap. × ${n} = ${ds(sh(628 * r * n, -2))} m.`,
    };
  }
  if (kind === 2) {
    const d = rand(4, 20);
    return {
      key: `cis-fence-${d}`,
      prompt: `A round garden is ${d} m across. Fence around it? (π ≈ 3.14)`,
      speech: `A round garden is ${d} meters across. How much fence do you need to go all the way around? Use 3.14 for pi.`,
      visual: { kind: "circle", r: d / 2, show: "diameter", unit: "m" },
      unit: "m",
      ...keypad(sh(314 * d, -2)),
      hint: "Fence around a circle is its circumference: π × d.",
      explain: `3.14 × ${d} = ${ds(sh(314 * d, -2))} m`,
    };
  }
  const r = rand(2, 10);
  return {
    key: `cis-semi-${r}`,
    prompt: `A half-circle rug has radius ${r} m. Its area? (π ≈ 3.14)`,
    speech: `A rug is half of a circle with a radius of ${r} meters. What is its area? Use 3.14 for pi.`,
    visual: { kind: "shape", shape: "semicircle" },
    unit: "m²",
    ...keypad(sh(157 * r * r, -2)),
    hint: "Find the whole circle's area, then halve it.",
    explain: `3.14 × ${r} × ${r} = ${ds(sh(314 * r * r, -2))}. Half is ${ds(sh(157 * r * r, -2))} m².`,
  };
}

/* ---------------------------------------------------------- 13. Chance & samples */

const EVENTS: [string, number][] = [
  ["Roll a 7 on a number cube", 0],
  ["Roll a 6 on a number cube", 1 / 6],
  ["Flip heads on a coin", 1 / 2],
  ["Roll less than 5 on a number cube", 4 / 6],
  ["Roll a number from 1 to 6", 1],
  ["Pick red from 3 red, 1 blue", 3 / 4],
  ["Pick blue from 3 red, 1 blue", 1 / 4],
  ["Spin red: 1 red part of 5", 1 / 5],
  ["Roll more than 1 on a number cube", 5 / 6],
  ["Pick a vowel from A, B, C, D, E", 2 / 5],
];
const PROB_FORMS: [number, string[]][] = [
  [0, ["0", "0%"]], [0.1, ["0.1", "10%", "1/10"]], [0.2, ["1/5", "20%", "0.2"]], [0.25, ["1/4", "25%", "0.25"]],
  [1 / 3, ["1/3"]], [0.4, ["0.4", "40%", "2/5"]], [0.5, ["1/2", "50%", "0.5"]], [0.6, ["0.6", "60%", "3/5"]],
  [2 / 3, ["2/3"]], [0.75, ["3/4", "75%", "0.75"]], [0.9, ["0.9", "90%"]], [1, ["1", "100%"]],
];

/** 7.SP.C.5 — order events and probabilities from least to most likely (Do it). */
export function orderLikelihood(): Question {
  const n = rand(4, 5);
  if (rand(0, 1) === 0) {
    for (;;) {
      const evs = shuffle(EVENTS).slice(0, n);
      if (new Set(evs.map((e) => e[1].toFixed(4))).size < n) continue;
      const list = [...evs].sort((a, b) => a[1] - b[1]);
      return {
        key: `ol-ev-${sorted(evs.map((e) => EVENTS.indexOf(e))).join(".")}`,
        prompt: "Tap from least likely to most likely.",
        speech: "Tap the events in order, from least likely to most likely.",
        visual: NONE,
        ...act({ kind: "order", items: list.map((e) => e[0]), direction: "least likely to most likely" }, n),
        hint: "Give each event a probability from 0 to 1, then compare.",
        explain: list.map((e) => `${e[0]}: ${fracStr(Math.round(e[1] * 60), 60)}`).join("; "),
      };
    }
  }
  const picks = shuffle(PROB_FORMS).slice(0, n).sort((a, b) => a[0] - b[0]);
  const items = picks.map((p) => pick(p[1]));
  return {
    key: `ol-num-${picks.map((p) => PROB_FORMS.indexOf(p)).join(".")}-${items.join("_")}`,
    prompt: "Tap these probabilities from least to most likely.",
    speech: "Tap these probabilities in order, from least likely to most likely.",
    visual: NONE,
    ...act({ kind: "order", items, direction: "least likely to most likely" }, n),
    hint: "Change them all to the same form: decimals or percents work well.",
    explain: `In order: ${items.join(", ")}.`,
  };
}

const TREES: [string, string[][]][] = [
  ["Flip a coin twice.", [["H", "T"], ["H", "T"]]],
  ["Flip a coin, then spin 1, 2 or 3.", [["H", "T"], ["1", "2", "3"]]],
  ["Pick red or blue, then red, blue or green.", [["Red", "Blue"], ["Red", "Blue", "Green"]]],
  ["Pick pizza or tacos, then milk, juice or water.", [["Pizza", "Tacos"], ["Milk", "Juice", "Water"]]],
  ["Flip a coin 3 times.", [["H", "T"], ["H", "T"], ["H", "T"]]],
  ["Pick A, B or C, then 1 or 2.", [["A", "B", "C"], ["1", "2"]]],
  ["Spin 1, 2, 3 or 4, then flip a coin.", [["1", "2", "3", "4"], ["H", "T"]]],
];

/** 7.SP.C.8a, 7.SP.C.8b — tree diagrams: count outcomes and find probabilities. */
export function treeDiagrams(): Question {
  const i = rand(0, TREES.length - 1);
  const [story, stages] = TREES[i];
  const total = stages.reduce((p, s) => p * s.length, 1);
  const outcomes = stages.reduce<string[][]>((acc, s) => acc.flatMap((o) => s.map((x) => [...o, x])), [[]]);
  const visual: Visual = { kind: "tree", stages };
  const kind = rand(0, 2);
  if (kind === 0) {
    return {
      key: `td-count-${i}`,
      prompt: `${story} How many outcomes?`,
      speech: `${story} Use the tree diagram. How many different outcomes are there?`,
      visual,
      ...keypad(total),
      hint: "Count the ends of the branches on the right.",
      explain: `${stages.map((s) => s.length).join(" × ")} = ${total} outcomes.`,
    };
  }
  if (kind === 1) {
    const path = stages.map((s) => pick(s));
    return {
      key: `td-path-${i}-${path.join("")}`,
      prompt: `${story} P(${path.join(", then ")})?`,
      speech: `${story} What is the probability of ${path.join(", then ")}?`,
      visual,
      ...label(fracStr(1, total), [fracStr(1, stages[0].length), fracStr(stages.length, total), fracStr(2, total), fracStr(1, total + 1)]),
      hint: "Exactly one branch path matches. How many paths are there in all?",
      explain: `1 of ${total} equally likely outcomes: ${fracStr(1, total)}.`,
    };
  }
  const x = pick(stages.flat());
  const hits = outcomes.filter((o) => o.includes(x)).length;
  const repeated = stages.filter((st) => st.includes(x)).length > 1;
  return {
    key: `td-any-${i}-${x}`,
    prompt: `${story} P(${repeated ? `at least one ${x}` : x})?`,
    speech: `${story} What is the probability of getting ${repeated ? `at least one ${x}` : x}?`,
    visual,
    ...label(fracStr(hits, total), [fracStr(1, total), fracStr(hits + 1, total), fracStr(total - hits || 1, total), fracStr(1, 2)]),
    hint: `Count the paths that have ${x} anywhere in them.`,
    explain: `${hits} of the ${total} outcomes include ${x}: ${fracStr(hits, total)}.`,
  };
}

/** 7.SP.C.7a, 7.SP.C.6 — spinners: probability and predictions. */
export function spinners(): Question {
  const n = rand(3, 8);
  const cols = shuffle(MARBLE_COLOURS).slice(0, rand(2, 3));
  const counts = cols.map(() => 1);
  for (let i = cols.length; i < n; i++) counts[rand(0, cols.length - 1)]++;
  const sections = shuffle(cols.flatMap((c, i) => Array(counts[i]).fill(c))).map((colour: Colour) => ({ colour }));
  const j = rand(0, cols.length - 1);
  const c = counts[j];
  const word = COLOUR_WORD[cols[j]];
  const visual: Visual = { kind: "spinner", sections };
  const kind = rand(0, 2);
  const key = `spn-${sections.map((s) => s.colour[0]).join("")}-${j}`;
  if (kind <= 1) {
    const not = kind === 1;
    return {
      key: `${key}-${not}`,
      prompt: not ? `What's the probability of NOT landing on ${word}?` : `What's the probability of landing on ${word}?`,
      speech: `The spinner has ${n} equal parts. What is the probability of ${not ? "not " : ""}landing on ${word}?`,
      visual,
      needsVisual: true,
      ...label(fracStr(not ? n - c : c, n), [fracStr(not ? c : n - c, n), fracStr(1, n), fracStr(c, n - c || 1), fracStr((not ? n - c : c) + 1, n)]),
      hint: `Count the ${word} parts and all the parts. The parts are equal, so each is equally likely.`,
      explain: `${not ? n - c : c} of ${n} parts: ${fracStr(not ? n - c : c, n)}.`,
    };
  }
  const N = n * rand(5, 20);
  return {
    key: `${key}-pred-${N}`,
    prompt: `In ${N} spins, about how many ${word}s do you expect?`,
    speech: `You spin this spinner ${N} times. About how many times do you expect ${word}?`,
    visual,
    needsVisual: true,
    ...keypad((N * c) / n),
    hint: `${word} is ${c} out of ${n} parts. Find that fraction of ${N}.`,
    explain: `${fracStr(c, n)} of ${N} = ${(N * c) / n}.`,
  };
}

/** 7.SP.B.3, 7.SP.B.4 — compare two groups with box plots. */
export function comparePlots(): Question {
  const five = () => sorted(distinct(5, 0, 50));
  let [A, B] = [five(), five()];
  while (A[2] === B[2] || A[3] - A[1] === B[3] - B[1] || A[4] - A[0] === B[4] - B[0]) [A, B] = [five(), five()];
  const box = (v: number[]) => ({ min: v[0], q1: v[1], median: v[2], q3: v[3], max: v[4] });
  const visual: Visual = { kind: "boxplot", ...box(A), axis: [0, 50], label: "Class A", second: { ...box(B), label: "Class B" } };
  const kind = rand(0, 3);
  if (kind === 3) {
    return {
      key: `cpl-diff-${A.join(".")}-${B.join(".")}`,
      prompt: "How far apart are the two medians?",
      speech: "The box plots show test scores for two classes. How far apart are their medians?",
      visual,
      needsVisual: true,
      ...keypad(Math.abs(A[2] - B[2])),
      hint: "The median is the line inside each box. Subtract.",
      explain: `Medians ${A[2]} and ${B[2]}: ${Math.abs(A[2] - B[2])} apart.`,
    };
  }
  const [what, fa, fb] = [
    ["greater median", A[2], B[2]],
    ["greater IQR (wider box)", A[3] - A[1], B[3] - B[1]],
    ["greater range", A[4] - A[0], B[4] - B[0]],
  ][kind] as [string, number, number];
  const right = fa > fb ? "Class A" : "Class B";
  return {
    key: `cpl-${kind}-${A.join(".")}-${B.join(".")}`,
    prompt: `Which class has the ${what}?`,
    speech: `The box plots show test scores for two classes. Which class has the ${what.replace(/ \(.*\)/, "")}?`,
    visual,
    needsVisual: true,
    ...label(right, [right === "Class A" ? "Class B" : "Class A", "They're the same"]),
    hint: kind === 0 ? "Compare the middle lines of the boxes." : kind === 1 ? "IQR = Q3 − Q1: the width of each box." : "Range = max − min: the whole length, whisker to whisker.",
    explain: `Class A: ${fa}. Class B: ${fb}. ${right} has the ${what.replace(/ \(.*\)/, "")}.`,
  };
}
