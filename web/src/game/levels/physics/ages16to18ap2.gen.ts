/**
 * Question generators for AP Physics 2 (ages 16–18): thermodynamics, electric force, field and potential,
 * circuits, magnetism and induction, geometric optics, waves and physical optics, and modern physics
 * (the PHYS.9 to PHYS.15 codes). Worlds and levels are assembled in ./ages16to18ap2.ts.
 *
 * Keypad answers are exact (whole numbers or short decimals, rounded as the prompt says). Answers that need
 * scientific notation or a unit are text choices whose wrong options are the mistakes students really make:
 * a missed square, °C for K, cm for m, a lost factor of ½, the wrong sign convention, and so on.
 *
 * Constants (AP Physics 2 equation sheet values): k = 9.0 × 10⁹ N·m²/C², e = 1.6 × 10⁻¹⁹ C,
 * mₑ = 9.11 × 10⁻³¹ kg, mₚ = 1.67 × 10⁻²⁷ kg, h = 6.63 × 10⁻³⁴ J·s = 4.14 × 10⁻¹⁵ eV·s, hc = 1240 eV·nm,
 * c = 3.0 × 10⁸ m/s, R = 8.31 J/(mol·K), k_B = 1.38 × 10⁻²³ J/K, ε₀ = 8.85 × 10⁻¹² C²/(N·m²),
 * μ₀ = 4π × 10⁻⁷ T·m/A, 1 u = 931.5 MeV/c², g = 9.8 m/s².
 */
import { fmt, labelChoices, pick, rand, shuffle } from "../../questions";
import { circuitSolution, lensImage, litNames, snell } from "../../science/physicsValidate";
import type { CircuitLayout, CircuitPart } from "../../science/physicsTypes";
import type { Activity, Colour, Question, Visual } from "../../types";

/* =================================================================== helpers */

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra" | "activity">;
type PlotV = Extract<Visual, { kind: "plot" }>;
type Seg = { from: [number, number]; to: [number, number]; colour?: Colour; dashed?: boolean };

const NONE: Visual = { kind: "none" };

const R_GAS = 8.31;
const KB = 1.38e-23;
const KC = 9.0e9;
const QE = 1.6e-19;
const ME = 9.11e-31;
const MP = 1.67e-27;
const H = 6.63e-34;
const HEV = 4.14e-15;
const HC = 1240;
const C = 3.0e8;
const EPS0 = 8.85e-12;
const MU0 = 4 * Math.PI * 1e-7;
const RAD = Math.PI / 180;

/** Remove floating-point noise. */
const clean = (x: number) => Number(x.toPrecision(12));
/** Round to n significant figures. */
const sig = (x: number, n = 3) => (x === 0 ? 0 : Number(x.toPrecision(n)));
/** Round to d decimal places. */
const dp = (x: number, d = 0) => clean(Math.round(x * 10 ** d) / 10 ** d);

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => (n < 0 ? "⁻" : "") + [...String(Math.abs(n))].map((d) => SUP[Number(d)]).join("");

/** Scientific notation with n significant figures: "3.2 × 10⁻⁵". */
export function sci(x: number, n = 2): string {
  if (x === 0) return "0";
  const [m, e] = Math.abs(x).toExponential(n - 1).split("e");
  const ex = Number(e);
  const sign = x < 0 ? "−" : "";
  return ex === 0 ? `${sign}${m}` : `${sign}${m} × 10${sup(ex)}`;
}

/** A number for display with n significant figures: plain from 0.01 to 99 999, else scientific. */
export function nf(x: number, n = 3): string {
  const a = Math.abs(x);
  if (a === 0) return "0";
  if (a >= 0.01 && a < 1e5) return fmt(sig(x, n));
  return sci(x, n);
}

/** A plain number with a real minus sign. */
const ds = (x: number) => fmt(clean(x));

const UNIT_SAY: Record<string, string> = {
  μC: "microcoulombs",
  nC: "nanocoulombs",
  C: "coulombs",
  μF: "microfarads",
  pF: "picofarads",
  nF: "nanofarads",
  F: "farads",
  eV: "electron volts",
  keV: "kilo electron volts",
  MeV: "mega electron volts",
  nm: "nanometers",
  μm: "micrometers",
  mm: "millimeters",
  cm: "centimeters",
  km: "kilometers",
  m: "meters",
  ms: "milliseconds",
  μs: "microseconds",
  s: "seconds",
  kΩ: "kilohms",
  MΩ: "megohms",
  mA: "milliamps",
  kHz: "kilohertz",
  MHz: "megahertz",
  "N/C": "newtons per coulomb",
  "V/m": "volts per meter",
  "J/K": "joules per kelvin",
  mT: "millitesla",
  μT: "microtesla",
  T: "tesla",
  Wb: "webers",
  u: "atomic mass units",
  atm: "atmospheres",
  kJ: "kilojoules",
  mJ: "millijoules",
  μJ: "microjoules",
  mW: "milliwatts",
  kW: "kilowatts",
  kWh: "kilowatt hours",
  "W/m²": "watts per square meter",
  Bq: "becquerels",
  dB: "decibels",
  D: "diopters",
};
const UNIT_RE = new RegExp(
  `(\\d)\\s?(${Object.keys(UNIT_SAY)
    .sort((a, b) => b.length - a.length)
    .map((u) => u.replace(/[/]/g, "\\/"))
    .join("|")})(?![A-Za-z²³/])`,
  "g",
);

/** Turn on-screen physics text into something the speech voice reads well. */
export function say(t: string): string {
  return t
    .replace(/ × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, e: string) => ` times 10 to the ${e.startsWith("⁻") ? "minus " : ""}${[...e.replace("⁻", "")].map((c) => SUP.indexOf(c)).join("")}`)
    .replace(UNIT_RE, (_, d: string, u: string) => `${d} ${UNIT_SAY[u]}`)
    .replace(/(in |of |per )(μC|nC|μF|μJ|mJ|kJ|kΩ|eV|MeV|mA|nm|mm|cm|μT|mT|kWh)(?![A-Za-z])/g, (_, w: string, u: string) => `${w}${UNIT_SAY[u]}`)
    .replace(/μ₀/g, "mu nought")
    .replace(/ε₀/g, "epsilon nought")
    .replace(/k_B/g, "k B")
    .replace(/→/g, " to ")
    .replace(/·/g, " ")
    .replace(/ρ/g, "rho")
    .replace(/Φ/g, "flux")
    .replace(/φ/g, "phi")
    .replace(/τ/g, "tau")
    .replace(/ψ/g, "psi")
    .replace(/κ/g, "kappa")
    .replace(/ε/g, "E M F")
    .replace(/ℏ/g, "h bar")
    .replace(/⊥/g, "perpendicular to");
}

interface Spec extends Partial<Answer> {
  key: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  unit?: string;
  prefix?: string;
  hint: string;
  explain: string;
}

/** Build a question; speech defaults to the prompt, read aloud nicely. */
function Q(s: Spec): Question {
  const { speech, visual, ...rest } = s;
  return { ...(rest as Question), visual: visual ?? NONE, speech: speech ?? say(s.prompt) };
}

/** Type a number (no negative key unless the answer is negative). Negative decimals become choices. */
function kp(x: number): Answer {
  const v = clean(x);
  if (Number.isInteger(v)) return v < 0 ? { answer: v, input: "keypad", keypadExtra: "−" } : { answer: v, input: "keypad" };
  if (v < 0) return nums(v, [-v, v * 2, v / 2]);
  return { answer: v, input: "keypad", keypadExtra: "." };
}

/** Type a signed whole number: the "−" key is always there, so the sign isn't given away. */
function kps(x: number): Answer {
  const v = clean(x);
  if (Number.isInteger(v)) return { answer: v, input: "keypad", keypadExtra: "−" };
  return nums(v, [-v, v * 2, v / 2]);
}

/** Number choices: the answer, the likely mistakes, then neighbours. */
function nums(answer: number, wrong: number[], step = 1): Answer {
  const a = clean(answer);
  const out = [a];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < 4 && Number.isFinite(v) && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  wrong.forEach(add);
  for (let k = 1; out.length < 4 && k < 50; k++) {
    add(a + k * step);
    add(a - k * step);
  }
  return { answer: a, input: "choices", choices: shuffle(out) };
}

/** Text choices: the right answer and up to three wrong ones (shuffled). */
function txt(correct: string, wrong: string[], n = 4): Answer {
  return { input: "choices", ...labelChoices(correct, shuffle(wrong), n) };
}

/**
 * Text choices for a computed value: the answer and the likely mistakes, all formatted alike
 * (n significant figures, with the unit), topped up with ×10 / ÷10 slips when mistakes coincide.
 */
function vals(ans: number, wrong: number[], unit = "", n = 2, f: (x: number, n: number) => string = nf): Answer {
  const u = unit ? ` ${unit}` : "";
  const t = (x: number) => `${f(x, n)}${u}`;
  const correct = t(ans);
  const others: string[] = [];
  const add = (x: number) => {
    if (!Number.isFinite(x) || x === 0) return;
    const s = t(x);
    if (s !== correct && !others.includes(s) && others.length < 3) others.push(s);
  };
  wrong.forEach(add);
  [10, 0.1, 2, 0.5, 100, 0.01, 4, 0.25, 3].forEach((k) => add(ans * k));
  return { input: "choices", ...labelChoices(correct, others, 4) };
}

/** A hands-on activity; `answer` is its key number. */
const act = (activity: Activity, answer: number): Answer => ({ input: "activity", activity, answer });

/** A graph with axis titles (an empty title is left off). */
const plot = (x: [number, number], y: [number, number], xLabel: string, yLabel: string, more: Partial<Omit<PlotV, "kind" | "x" | "y">> = {}): Visual => ({
  kind: "plot",
  x,
  y,
  ...(xLabel ? { xLabel } : {}),
  ...(yLabel ? { yLabel } : {}),
  ...more,
});

/** Choose k different items. */
const some = <T,>(items: readonly T[], k: number): T[] => shuffle(items).slice(0, k);
const table = (header: string[], rows: (number | string)[][]): Visual => ({ kind: "table", header, rows });
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/* ============================================================ 1. Thermodynamics */

const GASES = [
  { f: "H₂", name: "hydrogen", M: 2 },
  { f: "He", name: "helium", M: 4 },
  { f: "CH₄", name: "methane", M: 16 },
  { f: "Ne", name: "neon", M: 20 },
  { f: "N₂", name: "nitrogen", M: 28 },
  { f: "O₂", name: "oxygen", M: 32 },
  { f: "Ar", name: "argon", M: 40 },
  { f: "SO₂", name: "sulfur dioxide", M: 64 },
];
const gas = (f: string) => GASES.find((g) => g.f === f)!;

/** Maxwell–Boltzmann speed distribution with most-probable speed a (normalised). */
const mb = (a: number) => (v: number) => (v < 0 ? 0 : ((4 / Math.sqrt(Math.PI)) * v * v * Math.exp(-(v * v) / (a * a))) / a ** 3);

/** PHYS.9.1 — temperature as average molecular kinetic energy; pressure from collisions. */
export function kineticTheory(): Question {
  const kind = rand(0, 7);
  if (kind === 0) {
    const T1 = pick([200, 250, 300, 350, 400]);
    const k = pick([1.5, 2, 3, 4]);
    const T2 = T1 * k;
    return Q({
      key: `kt-ke-${T1}-${k}`,
      prompt: `A gas is heated from ${T1} K to ${T2} K. By what factor does the average kinetic energy of its molecules change?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: 0.6, T: T2, heat: "in", hot: true },
      ...vals(k, [Math.sqrt(k), k * k, 1 / k], "", 3, (x) => `× ${nf(x, 3)}`),
      hint: "Average kinetic energy is (3/2)k_B T. What happens to it when the kelvin temperature is multiplied?",
      explain: `KE_avg = (3/2)k_B T is proportional to absolute temperature, so ${T2} ÷ ${T1} = ${k}: the average KE is ${k} times as big.`,
    });
  }
  if (kind === 1) {
    const k = pick([2, 3, 4]);
    const T1 = pick([100, 150, 200, 250]);
    const T2 = T1 * k * k;
    return Q({
      key: `kt-vrms-${T1}-${k}`,
      prompt: `A gas warms from ${T1} K to ${T2} K. By what factor does the rms speed of its molecules change?`,
      ...nums(k, [k * k, 2 * k, k * k * k]),
      hint: "v_rms = √(3RT/M). Speed goes as the square root of absolute temperature.",
      explain: `The temperature is ${k * k} times as big, so v_rms is √${k * k} = ${k} times as big.`,
    });
  }
  if (kind === 2) {
    const T = pick([300, 350, 400, 500, 600, 800]);
    const ke = 1.5 * KB * T;
    return Q({
      key: `kt-avgke-${T}`,
      prompt: `What is the average translational kinetic energy of a gas molecule at ${T} K? (k_B = 1.38 × 10⁻²³ J/K)`,
      ...vals(ke, [KB * T, 1.5 * KB * (T - 273), (2 / 3) * KB * T], "J", 2, sci),
      hint: "KE_avg = (3/2)k_B T, with T in kelvin.",
      explain: `KE_avg = 1.5 × (1.38 × 10⁻²³) × ${T} = ${sci(ke, 2)} J. Every ideal gas at ${T} K has this same average KE per molecule.`,
    });
  }
  if (kind === 3) {
    const [a, b] = some(GASES, 2).sort((x, y) => x.M - y.M);
    const T = pick([250, 300, 350, 400]);
    return Q({
      key: `kt-same-${a.f}-${b.f}-${T}`,
      prompt: `${a.f} (${a.M} g/mol) and ${b.f} (${b.M} g/mol) are mixed in a box at ${T} K. Which statement is true?`,
      ...txt(`Same average KE; the ${a.f} molecules move faster`, [
        `Same average speed for both gases`,
        `The ${b.f} molecules have more average KE`,
        `Same average KE; the ${b.f} molecules move faster`,
      ]),
      hint: "Temperature sets the average kinetic energy, ½mv². If KE is equal, which molecules must be faster?",
      explain: `At the same temperature both have KE_avg = (3/2)k_B T. ½mv² is the same, so the lighter ${a.f} molecules have the higher rms speed.`,
    });
  }
  if (kind === 4) {
    const [lf, hf] = pick([["H₂", "O₂"], ["He", "CH₄"], ["He", "SO₂"], ["CH₄", "SO₂"]] as const);
    const l = gas(lf);
    const h = gas(hf);
    const r = Math.sqrt(h.M / l.M);
    const T = pick([250, 300, 400]);
    return Q({
      key: `kt-ratio-${lf}-${hf}-${T}`,
      prompt: `At ${T} K, how many times faster is the rms speed of ${l.f} (${l.M} g/mol) than ${h.f} (${h.M} g/mol)?`,
      ...nums(r, [r * r, r / 2, r + 2]),
      hint: "v_rms = √(3RT/M). At the same T, the ratio is √(M_heavy / M_light).",
      explain: `v_${l.f} / v_${h.f} = √(${h.M} / ${l.M}) = √${h.M / l.M} = ${r}.`,
    });
  }
  if (kind === 5) {
    const k = pick([2, 3]);
    const what = pick(["pressure", "force on each wall"]);
    return Q({
      key: `kt-press-${k}-${what}`,
      prompt: `Every molecule in a sealed rigid box suddenly moved ${k} times as fast. By what factor would the ${what} change?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: 0.7, hot: true, particles: 20 },
      ...nums(k * k, [k, 2 * k, k ** 3]),
      hint: "Two effects: each collision gives the wall more momentum, and collisions happen more often.",
      explain: `Each hit delivers ${k}× the momentum and hits happen ${k}× as often, so the ${what} grows by ${k} × ${k} = ${k * k}. (P ∝ v², which is why P ∝ T.)`,
    });
  }
  if (kind === 6) {
    const aHot = pick([1.4, 1.6, 1.8]);
    const hot = pick(["A", "B"]);
    const ask = pick(["hot", "cold"] as const);
    const fa = hot === "A" ? mb(aHot) : mb(1);
    const fb = hot === "A" ? mb(1) : mb(aHot);
    const cold = hot === "A" ? "B" : "A";
    return Q({
      key: `kt-mb-${aHot}-${hot}-${ask}`,
      prompt: `The graph shows the speed distributions of the same gas at two temperatures. Which curve is the ${ask === "hot" ? "higher" : "lower"} temperature?`,
      visual: plot([0, 4], [0, 1], "speed", "fraction of molecules", { curves: [{ fn: fa, label: "A", colour: "berry" }, { fn: fb, label: "B", colour: "wave" }] }),
      needsVisual: true,
      ...txt(ask === "hot" ? hot : cold, [ask === "hot" ? cold : hot, "Neither: same temperature"], 3),
      hint: "Hotter molecules move faster on average, so the curve shifts right, spreads out and its peak drops (the area stays the same).",
      explain: `Curve ${hot} peaks at a higher speed and is wider and lower, so it is the hotter gas; curve ${cold} is the colder one.`,
    });
  }
  const g = pick(GASES.filter((x) => x.M >= 4));
  const T = pick([250, 300, 400, 500]);
  const v = Math.sqrt((3 * R_GAS * T) / (g.M / 1000));
  return Q({
    key: `kt-vcalc-${g.f}-${T}`,
    prompt: `Find the rms speed of ${g.name} (${g.f}, ${g.M} g/mol) molecules at ${T} K.`,
    ...vals(v, [Math.sqrt((3 * R_GAS * T) / g.M), Math.sqrt((R_GAS * T) / (g.M / 1000)), (3 * R_GAS * T) / (g.M / 1000)], "m/s", 3),
    hint: "v_rms = √(3RT/M) with R = 8.31 J/(mol·K) and M in kg/mol.",
    explain: `M = ${g.M / 1000} kg/mol, so v_rms = √(3 × 8.31 × ${T} ÷ ${g.M / 1000}) ≈ ${nf(v, 3)} m/s.`,
  });
}

/** PHYS.9.2 — PV = nRT and the combined gas law. */
export function idealGas(): Question {
  const kind = rand(0, 6);
  if (kind === 0) {
    const n = pick([0.5, 1, 1.5, 2]);
    const T = pick([250, 300, 350, 400]);
    const V = pick([10, 20, 25, 40, 50]);
    const P = (n * R_GAS * T) / V;
    return Q({
      key: `ig-p-${n}-${T}-${V}`,
      prompt: `${n} mol of gas fills a ${V} L container at ${T} K. What is the pressure?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: 0.6, P: "?", V, T },
      ...vals(P, [P * 1000, (n * R_GAS * (T + 273)) / V, (n * 0.0821 * T) / V], "kPa", 3),
      hint: "P = nRT/V. With V in m³ you get pascals; with V in liters, nRT/V comes out in kilopascals.",
      explain: `P = ${n} × 8.31 × ${T} ÷ ${V / 1000} m³ ≈ ${nf(P * 1000, 3)} Pa = ${nf(P, 3)} kPa.`,
    });
  }
  if (kind === 1) {
    const P = pick([100, 150, 200]);
    const V = pick([10, 20, 30]);
    const T = pick([250, 300, 350, 400]);
    const n = (P * V) / (R_GAS * T);
    return Q({
      key: `ig-n-${P}-${V}-${T}`,
      prompt: `A ${V} L tank holds gas at ${P} kPa and ${T} K. How many moles of gas are inside?`,
      ...vals(n, [n * 1000, (P * V) / T, (P * V) / (R_GAS * (T + 273))], "mol", 3),
      hint: "n = PV/(RT). Convert: kPa → Pa (×1000) and L → m³ (÷1000).",
      explain: `n = (${P * 1000} Pa × ${V / 1000} m³) ÷ (8.31 × ${T}) ≈ ${nf(n, 3)} mol.`,
    });
  }
  if (kind === 2) {
    const V1 = pick([2, 4, 6, 8, 12]);
    const P1 = pick([100, 120, 150]);
    const T1 = pick([200, 300, 400]);
    const [a, b] = pick([[2, 1.5], [2, 1], [0.5, 1], [3, 1.5], [2, 0.5], [0.5, 1.5]]);
    const V2 = (V1 * b) / a;
    return Q({
      key: `ig-comb-${V1}-${P1}-${T1}-${a}-${b}`,
      prompt: `A gas starts at ${P1} kPa, ${V1} L and ${T1} K. It changes to ${clean(P1 * a)} kPa and ${clean(T1 * b)} K. What is its new volume?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: Math.min(1, Math.max(0.2, (0.6 * b) / a)), P: clean(P1 * a), V: "?", T: clean(T1 * b), heat: b > 1 ? "in" : b < 1 ? "out" : undefined },
      ...kp(V2),
      unit: "L",
      hint: "P₁V₁/T₁ = P₂V₂/T₂ (n fixed). Solve V₂ = V₁ × (P₁/P₂) × (T₂/T₁).",
      explain: `V₂ = ${V1} × (${P1}/${clean(P1 * a)}) × (${clean(T1 * b)}/${T1}) = ${ds(V2)} L.`,
    });
  }
  if (kind === 3) {
    const [T1C, k] = pick([[27, 2], [127, 2], [-73, 2], [-73, 3], [27, 1.5], [-23, 2]]);
    const T1K = T1C + 273;
    const T2K = T1K * k;
    const T2C = T2K - 273;
    const P1 = pick([100, 120, 150, 200]);
    const P2 = (P1 * T2K) / T1K;
    return Q({
      key: `ig-celsius-${T1C}-${k}-${P1}`,
      prompt: `A sealed rigid can holds gas at ${P1} kPa and ${T1C} °C. It is heated to ${T2C} °C. What is the new pressure in kPa?`,
      ...nums(P2, [T1C > 0 ? Math.round((P1 * T2C) / T1C) : P1 * 4, P1, P2 + 100]),
      hint: "Gas laws need absolute temperature. Change °C to K first (add 273).",
      explain: `${T1C} °C = ${T1K} K and ${T2C} °C = ${T2K} K. At constant V, P ∝ T: P₂ = ${P1} × ${T2K}/${T1K} = ${ds(P2)} kPa.`,
    });
  }
  if (kind === 4) {
    const P = pick([100, 200, 300]);
    const V = pick([1, 2, 5]);
    const T = pick([250, 300, 400]);
    const N = (P * 1000 * V * 1e-3) / (KB * T);
    return Q({
      key: `ig-molecules-${P}-${V}-${T}`,
      prompt: `How many gas molecules are in ${V} L of gas at ${P} kPa and ${T} K?`,
      ...vals(N, [(P * V) / (R_GAS * T), N * 1000, N / 1000], "", 2, sci),
      hint: "PV = Nk_B T, so N = PV/(k_B T). Use pascals and cubic meters.",
      explain: `N = (${P * 1000} × ${sci(V * 1e-3, 1)}) ÷ (1.38 × 10⁻²³ × ${T}) ≈ ${sci(N, 2)} molecules.`,
    });
  }
  if (kind === 5) {
    const tf = pick([2, 3, 0.5]);
    const nfac = pick([1, 2, 0.5]);
    const vf = pick([1, 2, 0.5]);
    const f = (tf * nfac) / vf;
    const say1 = (x: number, what: string) => (x === 1 ? "" : x > 1 ? `${what} is multiplied by ${x}` : `${what} is halved`);
    const changes = [say1(tf, "the kelvin temperature"), say1(nfac, "the amount of gas"), say1(vf, "the volume")].filter(Boolean);
    return Q({
      key: `ig-factor-${tf}-${nfac}-${vf}`,
      prompt: `For an ideal gas, ${changes.join(", ")}${changes.length ? "" : "nothing changes"}. By what factor does the pressure change?`,
      ...vals(f, [tf * nfac * vf, tf / vf, nfac * tf], "", 3, (x) => `× ${nf(x, 3)}`),
      hint: "P = nRT/V: P is proportional to n and T, and inversely proportional to V.",
      explain: `P ∝ nT/V, so the factor is (${nfac} × ${tf}) ÷ ${vf} = ${ds(f)}.`,
    });
  }
  const T0 = pick([20, 40, 77, 100]);
  return Q({
    key: `ig-double-${T0}`,
    prompt: `A rigid tank of gas is at ${T0} °C. Which change doubles its pressure?`,
    ...txt(`Heat it to ${2 * (T0 + 273) - 273} °C`, [`Heat it to ${2 * T0} °C`, "Double the size of the tank", "Let half of the gas escape"]),
    hint: "Pressure is proportional to absolute temperature. Work in kelvin.",
    explain: `${T0} °C = ${T0 + 273} K. Doubling that gives ${2 * (T0 + 273)} K = ${2 * (T0 + 273) - 273} °C. Doubling the Celsius number doesn't double the kelvin temperature.`,
  });
}

/** PHYS.9.2 — reading gas-law graphs: absolute zero, isotherms, P against 1/V. */
export function gasGraphs(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const P0 = pick([60, 80, 100, 120]);
    const ask = pick(["where", "meaning"] as const);
    const fn = (t: number) => (P0 * (t + 273)) / 273;
    return Q({
      key: `gg-zero-${P0}-${ask}`,
      prompt:
        ask === "where"
          ? "Pressure against Celsius temperature for a gas in a rigid tank. The dashed line extends the data. Where does it reach P = 0?"
          : "Pressure against Celsius temperature for a gas in a rigid tank. What does the point where the dashed line reaches P = 0 stand for?",
      visual: plot([-300, 200], [0, Math.ceil(fn(200) / 20) * 20], "T (°C)", "P (kPa)", {
        lines: [
          { from: [-273, 0], to: [0, P0], dashed: true, colour: "grape" },
          { from: [0, P0], to: [200, fn(200)], colour: "berry" },
        ],
        points: [0, 50, 100, 150].map((t) => ({ x: t, y: fn(t) })),
      }),
      needsVisual: true,
      ...(ask === "where"
        ? txt("−273 °C", ["0 °C", "−100 °C", "273 °C"])
        : txt("Absolute zero, 0 K: the molecules have (classically) no kinetic energy", ["The freezing point of water", "The gas turns into a liquid", "The pressure of the outside air"])),
      hint: "P is proportional to absolute temperature. At what temperature would it fall to zero?",
      explain: "Every gas's P–T line extrapolates to about −273 °C. That is absolute zero, 0 K, the zero of the kelvin scale.",
    });
  }
  if (kind === 1) {
    const c1 = pick([400, 800, 1200]);
    const k = pick([2, 3]);
    const c2 = c1 * k;
    const hotLabel = pick(["T₁", "T₂"]);
    const coldLabel = hotLabel === "T₁" ? "T₂" : "T₁";
    const ask = pick(["which", "ratio"] as const);
    const curves = [
      { fn: (v: number) => c2 / v, label: hotLabel, colour: "berry" as Colour },
      { fn: (v: number) => c1 / v, label: coldLabel, colour: "wave" as Colour },
    ];
    const ymax = Math.ceil(c2 / 4 / 100) * 100 + 200;
    return Q({
      key: `gg-iso-${c1}-${k}-${hotLabel}-${ask}`,
      prompt:
        ask === "which"
          ? "Two isotherms for the same amount of gas. Which one is at the higher temperature?"
          : `Two isotherms for the same gas, read at V = 4 L. What is T_hot ÷ T_cold?`,
      visual: plot([0, 10], [0, ymax], "V (L)", "P (kPa)", {
        curves,
        points: ask === "ratio" ? [{ x: 4, y: c2 / 4, label: `${c2 / 4} kPa` }, { x: 4, y: c1 / 4, label: `${c1 / 4} kPa` }] : [],
      }),
      needsVisual: true,
      ...(ask === "which" ? txt(hotLabel, [coldLabel, "Both the same"], 3) : nums(k, [1 / k, k * k, k + 1])),
      hint: "PV = nRT: at the same volume, the curve with the higher pressure has the higher temperature.",
      explain:
        ask === "which"
          ? `The ${hotLabel} curve lies farther from the origin (bigger PV), so ${hotLabel} is the hotter isotherm.`
          : `At the same V and n, T ∝ P: ${c2 / 4} ÷ ${c1 / 4} = ${k}.`,
    });
  }
  if (kind === 2) {
    const n = pick([0.5, 1, 2]);
    const T = pick([200, 300, 400]);
    const S = sig(n * R_GAS * T, 3);
    return Q({
      key: `gg-inv-${n}-${T}`,
      prompt: `For a gas at ${T} K, a graph of P against 1/V is a straight line through the origin with slope ${S} kPa·L. How many moles of gas are there?`,
      visual: plot([0, 0.5], [0, Math.ceil((S * 0.5) / 100) * 100], "1/V (L⁻¹)", "P (kPa)", {
        lines: [{ from: [0, 0], to: [0.5, S * 0.5], colour: "berry" }],
        points: [0.1, 0.2, 0.3, 0.4].map((x) => ({ x, y: S * x })),
      }),
      ...vals(n, [S / T, (S * R_GAS) / T, S / (R_GAS * (T + 273))], "mol", 2),
      hint: "P = nRT × (1/V), so the slope is nRT. Note 1 kPa·L = 1 J.",
      explain: `Slope = nRT, so n = ${S} J ÷ (8.31 × ${T}) ≈ ${nf(n, 2)} mol.`,
    });
  }
  if (kind === 3) {
    const order = shuffle(["A", "B", "C"]);
    const [hyp, line, flat] = order;
    const ask = pick(["isothermal", "isobaric", "proportional"] as const);
    const ans = ask === "isothermal" ? hyp : ask === "isobaric" ? flat : line;
    return Q({
      key: `gg-shape-${order.join("")}-${ask}`,
      prompt:
        ask === "isothermal"
          ? "Pressure against volume for three processes. Which curve could be an isothermal (constant T) process?"
          : ask === "isobaric"
            ? "Pressure against volume for three processes. Which curve is isobaric?"
            : "Pressure against volume for three processes. Along which curve is P proportional to V, so T rises fastest as V grows?",
      visual: plot([0, 8], [0, 8], "V", "P", {
        curves: [
          { fn: (v) => 12 / v, label: hyp, colour: "berry" },
          { fn: (v) => v, label: line, colour: "wave" },
          { fn: () => 3, label: flat, colour: "leaf" },
        ],
      }),
      needsVisual: true,
      ...txt(ans, order.filter((o) => o !== ans), 3),
      hint: "Isothermal: PV constant, a hyperbola. Isobaric: P constant, a flat line. P ∝ V: a line through the origin.",
      explain: `Curve ${hyp} is a hyperbola (PV constant, isothermal), ${flat} is flat (isobaric) and ${line} is a line through the origin (P ∝ V, so T ∝ PV ∝ V²).`,
    });
  }
  const m = pick([1, 2, 3]);
  const T1 = pick([200, 250, 300]);
  const V1 = (m * T1) / 100;
  const T2 = pick([400, 450, 500, 600].filter((t) => t > T1));
  const V2 = (m * T2) / 100;
  return Q({
    key: `gg-charles-${m}-${T1}-${T2}`,
    prompt: `A gas at constant pressure: volume against temperature. Predict the volume at ${T2} K.`,
    visual: plot([0, 700], [0, m * 7 + 1], "T (K)", "V (L)", { lines: [{ from: [0, 0], to: [700, m * 7], colour: "berry", dashed: true }], points: [{ x: T1, y: V1, label: `${ds(V1)} L` }] }),
    needsVisual: true,
    ...kp(V2),
    unit: "L",
    hint: "The line passes through the origin, so V ∝ T (in kelvin). Scale the marked point.",
    explain: `V₂ = ${ds(V1)} × ${T2}/${T1} = ${ds(V2)} L.`,
  });
}

/** PHYS.9.2 — Do it: plot gas-law data and draw the straight line (including linearizing Boyle's law). */
export function gasGraphDoIt(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const m = pick([1, 2]);
    const xs = some([1, 2, 3, 4].filter((x) => m * x <= 8), 3).sort((a, b) => a - b);
    return Q({
      key: `gd-charles-${m}-${xs.join("")}`,
      prompt: "Plot V against T for this gas at constant pressure. Each square across is 100 K; each square up is 1 L.",
      speech: "Plot volume against temperature. Each square across is 100 kelvin, and each square up is 1 liter.",
      visual: table(["T (K)", "V (L)"], xs.map((x) => [x * 100, m * x])),
      ...act({ kind: "plotPoints", points: xs.map((x, i) => ({ x, y: m * x, label: "ABC"[i] })), size: 8, quadrants: 1 }, 3),
      hint: "Divide each temperature by 100 to get the squares across; the volume in liters is the squares up.",
      explain: `The points ${xs.map((x) => `(${x}, ${m * x})`).join(", ")} lie on a line through the origin: V ∝ T at constant pressure.`,
    });
  }
  if (kind === 1) {
    const [p, q] = pick([[1, 2], [1, 1], [3, 2], [2, 1]]);
    const m = p / q;
    const xs = [2, 4, 6].filter((x) => m * x <= 8);
    return Q({
      key: `gd-pt-${p}-${q}`,
      prompt: "Draw the best-fit line for this gas in a rigid tank: P against T. Each square across is 100 K; each square up is 50 kPa.",
      speech: "Draw the best fit line of pressure against temperature. Each square across is 100 kelvin, and each square up is 50 kilopascals.",
      visual: table(["T (K)", "P (kPa)"], xs.map((x) => [x * 100, m * x * 50])),
      ...act({ kind: "drawLine", m, b: 0, size: 8, quadrants: 1 }, m),
      hint: "P ∝ T in kelvin, so the line goes through the origin. Turn each data pair into squares and join them.",
      explain: `In squares the slope is ${ds(m)}: P rises ${ds(m * 50)} kPa for every 100 K, and the line passes through 0 K, 0 kPa.`,
    });
  }
  const c = pick([1, 2]);
  const vs = c === 1 ? some([1, 0.5, 0.25, 0.2], 3) : some([1, 0.5, 0.25], 3);
  const xs = vs.map((v) => 1 / v).sort((a, b) => a - b);
  if (kind === 2)
    return Q({
      key: `gd-boyle-${c}-${xs.join("")}`,
      prompt: "Linearize Boyle's law: plot P against 1/V. Each square across is 1 L⁻¹ (1 per liter); each square up is 100 kPa.",
      speech: "Linearize Boyle's law. Plot pressure against 1 over volume. Each square across is 1 per liter, and each square up is 100 kilopascals.",
      visual: table(["V (L)", "P (kPa)"], xs.map((x) => [ds(1 / x), c * x * 100])),
      ...act({ kind: "plotPoints", points: xs.map((x, i) => ({ x, y: c * x, label: "ABC"[i] })), size: 8, quadrants: 1 }, 3),
      hint: "Work out 1/V for each row first (1 ÷ 0.25 = 4). Then P ÷ 100 gives the squares up.",
      explain: `1/V = ${xs.map(ds).join(", ")} and P/100 = ${xs.map((x) => c * x).join(", ")}: a straight line through the origin, because P = (nRT) × (1/V).`,
    });
  return Q({
    key: `gd-boyleline-${c}-${xs.join("")}`,
    prompt: "These are Boyle's-law data. Draw the straight line of P against 1/V. Each square across is 1 L⁻¹; each square up is 100 kPa.",
    speech: "Draw the straight line of pressure against 1 over volume. Each square across is 1 per liter, and each square up is 100 kilopascals.",
    visual: table(["V (L)", "P (kPa)"], xs.map((x) => [ds(1 / x), c * x * 100])),
    ...act({ kind: "drawLine", m: c, b: 0, size: 8, quadrants: 1 }, c),
    hint: "Find 1/V for each row. P against 1/V is a line through the origin with slope nRT.",
    explain: `The points (${xs.map((x) => `${ds(x)}, ${c * x}`).join("), (")}) give slope ${c} squares per square: nRT = ${c * 100} kPa·L = ${c * 100} J.`,
  });
}

const HOT_COLD = [
  { a: { emoji: "☕", name: "coffee" }, b: { emoji: "🥄", name: "spoon" } },
  { a: { emoji: "🍳", name: "pan" }, b: { emoji: "🧈", name: "butter" } },
  { a: { emoji: "🧊", name: "ice" }, b: { emoji: "🥤", name: "drink" } },
  { a: { emoji: "🪨", name: "rock" }, b: { emoji: "💧", name: "water" } },
  { a: { emoji: "🔩", name: "bolt" }, b: { emoji: "🛢️", name: "oil" } },
];

const TRANSFER = [
  { t: "A metal spoon's handle warms up in hot soup", m: 0 },
  { t: "Your hand feels warm holding a mug of cocoa", m: 0 },
  { t: "A pan's handle gets hot on the stove", m: 0 },
  { t: "Bare feet feel cold on a tile floor", m: 0 },
  { t: "Ice melts in your warm hand", m: 0 },
  { t: "Warm air rising above a radiator", m: 1 },
  { t: "Soup circulating as it heats in a pot", m: 1 },
  { t: "A sea breeze blowing on a sunny afternoon", m: 1 },
  { t: "Hot water rising in a kettle", m: 1 },
  { t: "A hair dryer blowing warm air", m: 1 },
  { t: "Sunlight warming the Earth through space", m: 2 },
  { t: "Feeling heat from a campfire across the room", m: 2 },
  { t: "A thermal camera picking up body heat", m: 2 },
  { t: "Glowing toaster wires warming the bread", m: 2 },
  { t: "Heat from a light bulb you don't touch", m: 2 },
];
const MECH = ["conduction", "convection", "radiation"];

/** PHYS.9.3 — conduction, convection, radiation; thermal equilibrium. */
export function heatTransfer(): Question {
  const kind = rand(0, 6);
  if (kind === 0) {
    const pair = pick(HOT_COLD);
    const same = rand(0, 4) === 0;
    const ta = rand(1, 18) * 5;
    let tb = same ? ta : rand(1, 18) * 5;
    while (!same && tb === ta) tb = rand(1, 18) * 5;
    const AtoB = `From the ${pair.a.name} to the ${pair.b.name}`;
    const BtoA = `From the ${pair.b.name} to the ${pair.a.name}`;
    const none = "No net flow: they're in equilibrium";
    return Q({
      key: `ht-flow-${pair.a.name}-${ta}-${tb}`,
      prompt: `The ${pair.a.name} and the ${pair.b.name} are touching. Which way does energy flow as heat?`,
      visual: { kind: "phys-thermo", scene: "flow", a: { ...pair.a, temp: ta }, b: { ...pair.b, temp: tb }, arrowLabel: "?" },
      needsVisual: true,
      ...txt(same ? none : ta > tb ? AtoB : BtoA, [AtoB, BtoA, none].filter((x) => x !== (same ? none : ta > tb ? AtoB : BtoA)), 3),
      hint: "Heat flows from higher temperature to lower temperature, never the other way by itself.",
      explain: same ? `Both are at ${ta} °C, so there is no net heat flow: they're in thermal equilibrium.` : `${Math.max(ta, tb)} °C is hotter than ${Math.min(ta, tb)} °C, so the net flow is ${(ta > tb ? AtoB : BtoA).toLowerCase()}.`,
    });
  }
  if (kind === 1) {
    const s = pick(TRANSFER);
    return Q({
      key: `ht-mech-${s.t}`,
      prompt: `${s.t}. Which kind of heat transfer is this mainly?`,
      ...txt(MECH[s.m], MECH.filter((_, i) => i !== s.m), 3),
      hint: "Conduction: through touching matter. Convection: a fluid flows and carries the energy. Radiation: electromagnetic waves, no medium needed.",
      explain: `${s.t}: ${["energy passes by collisions through materials that touch", "a moving fluid carries the energy", "electromagnetic waves (infrared) carry the energy"][s.m]}, so it's ${MECH[s.m]}.`,
    });
  }
  if (kind === 2) {
    const m1 = rand(1, 4);
    const m2 = rand(1, 4);
    const T2 = pick([10, 20, 30]);
    const d = (m1 + m2) * pick([5, 10, 15]);
    const T1 = T2 + d;
    const Tf = T2 + (d * m1) / (m1 + m2);
    return Q({
      key: `ht-eq-${m1}-${m2}-${T2}-${d}`,
      prompt: `A ${m1} kg iron block at ${T1} °C touches a ${m2} kg iron block at ${T2} °C, insulated from everything else. What temperature do they end at?`,
      visual: { kind: "phys-thermo", scene: "flow", a: { emoji: "🧱", temp: T1 }, b: { emoji: "🧱", temp: T2 } },
      ...kp(Tf),
      unit: "°C",
      hint: "Same material, so energy lost by the hot block = energy gained by the cold one: m₁(T₁ − T) = m₂(T − T₂).",
      explain: `T = (m₁T₁ + m₂T₂)/(m₁ + m₂) = (${m1} × ${T1} + ${m2} × ${T2}) ÷ ${m1 + m2} = ${ds(Tf)} °C. Flow stops when the temperatures (not the energies) are equal.`,
    });
  }
  if (kind === 3) {
    const v = pick(["conduction", "equilibrium"] as const);
    return Q({
      key: `ht-micro-${v}-${rand(0, 3)}`,
      prompt: v === "conduction" ? "On the molecular scale, how does heat conduct from a hot end of a rod to its cold end?" : "Two objects reach thermal equilibrium. What is now equal?",
      ...(v === "conduction"
        ? txt("Faster-vibrating particles collide with slower neighbours and pass on kinetic energy", ["Heat particles flow down the rod", "Cold flows from the cold end to the hot end", "The atoms themselves travel to the cold end"])
        : txt("Their temperatures (average KE per molecule)", ["Their internal energies", "Their masses", "Their specific heats"])),
      hint: "Temperature measures average molecular kinetic energy. Energy spreads by collisions.",
      explain: v === "conduction" ? "In conduction energy, not matter, moves: energetic particles collide with neighbours and share kinetic energy until temperatures even out." : "At equilibrium the average KE per molecule (temperature) is the same, so there is no net energy flow, even if the total internal energies differ.",
    });
  }
  if (kind === 4) {
    const celsius = rand(0, 1) === 1;
    const [T1, T2] = pick([[300, 600], [200, 400], [300, 900], [250, 500]]);
    const k = T2 / T1;
    return Q({
      key: `ht-rad-${T1}-${T2}-${celsius}`,
      prompt: celsius
        ? `A hot plate is heated from ${T1 - 273} °C to ${T2 - 273} °C. By what factor does the power it radiates change?`
        : `A blackbody's temperature rises from ${T1} K to ${T2} K. By what factor does the power it radiates change?`,
      ...nums(k ** 4, [k, k * k, celsius ? ((T2 - 273) / (T1 - 273)) ** 4 : 2 * k]),
      hint: "Radiated power is proportional to T⁴, with T in kelvin.",
      explain: `${celsius ? `In kelvin that's ${T1} K to ${T2} K: ` : ""}T is ${k} times as big, so the power is ${k}⁴ = ${k ** 4} times as big.`,
    });
  }
  if (kind === 5) {
    const [a, b, c] = some(["A", "B", "C", "X", "Y", "Z"], 3);
    return Q({
      key: `ht-zeroth-${a}${b}${c}`,
      prompt: `Object ${a} is in thermal equilibrium with ${c}, and ${b} is in thermal equilibrium with ${c}. What can you say about ${a} and ${b}?`,
      ...txt(`They are at the same temperature`, [`${a} is hotter than ${b}`, `They have the same internal energy`, `Nothing without more data`]),
      hint: "This is the zeroth law of thermodynamics; it's why thermometers work.",
      explain: `${a} and ${b} both have ${c}'s temperature, so they are at the same temperature as each other (the zeroth law).`,
    });
  }
  const Tobj = pick([20, 30, 37, 60]);
  const Tenv = pick([5, 25, 40, 80].filter((t) => t !== Tobj));
  const net = Tobj > Tenv ? "Emits more than it absorbs: net loss" : "Absorbs more than it emits: net gain";
  return Q({
    key: `ht-netrad-${Tobj}-${Tenv}`,
    prompt: `An object at ${Tobj} °C sits in a room whose walls are at ${Tenv} °C. What is true of its radiation?`,
    ...txt(net, ["It stops radiating", "It only emits, it never absorbs", Tobj > Tenv ? "Absorbs more than it emits: net gain" : "Emits more than it absorbs: net loss"]),
    hint: "Everything above 0 K both emits and absorbs radiation. The net flow depends on T⁴ − T_surroundings⁴.",
    explain: `Both emit; P_net ∝ T⁴ − T_env⁴ (kelvin). The ${Tobj > Tenv ? "object is hotter, so it loses energy" : "walls are hotter, so the object gains energy"} overall.`,
  });
}

const RODS = ["k", "2k", "3k"].flatMap((k) => ["A", "2A"].flatMap((a) => ["L", "2L", "3L"].map((l) => ({ k, a, l }))));
const rodVal = (r: { k: string; a: string; l: string }) => (parseInt(r.k) || 1) * (parseInt(r.a) || 1) / (parseInt(r.l) || 1);

/** PHYS.9.3, PHYS.9.5 — Do it: sort heat transfer and rank conduction rates. */
export function heatDoIt(): Question {
  if (rand(0, 2) > 0) {
    let items = some(TRANSFER, 6);
    while (new Set(items.map((i) => i.m)).size < 3) items = some(TRANSFER, 6);
    return Q({
      key: `hd-sort-${items.map((i) => TRANSFER.indexOf(i)).sort((a, b) => a - b).join("-")}`,
      prompt: "Sort each example by how the energy is mainly transferred.",
      ...act({ kind: "sort", bins: ["conduction", "convection", "radiation"], items: items.map((i) => ({ label: i.t, bin: i.m })) }, items.filter((i) => i.m === 0).length),
      hint: "Touching? Conduction. A fluid moving? Convection. Through empty space or across a gap as light or infrared? Radiation.",
      explain: MECH.map((m, k) => `${m}: ${items.filter((i) => i.m === k).map((i) => i.t.toLowerCase()).join("; ")}`).join(". ") + ".",
    });
  }
  let rods = some(RODS, 4);
  while (new Set(rods.map(rodVal)).size < 4) rods = some(RODS, 4);
  const sorted = [...rods].sort((a, b) => rodVal(b) - rodVal(a));
  const lab = (r: (typeof RODS)[number]) => `${r.k}, ${r.a}, ${r.l}`;
  return Q({
    key: `hd-rank-${rods.map(lab).join("|")}`,
    prompt: "Rods join the same hot and cold reservoirs. Each is labelled conductivity, area, length. Rank them from fastest heat flow to slowest.",
    speech: "Rods join the same hot and cold reservoirs. Each is labelled with its conductivity, cross section area, and length. Rank them from fastest heat flow to slowest.",
    ...act({ kind: "order", items: sorted.map(lab), direction: "fastest heat flow first" }, 4),
    hint: "Rate = kAΔT/L. ΔT is the same, so compare k × A ÷ L for each rod.",
    explain: sorted.map((r) => `${lab(r)} → ${nf(rodVal(r), 3)}`).join("; ") + " (in units of kAΔT/L).",
  });
}

const METALS = [
  { name: "aluminum", c: 900 },
  { name: "iron", c: 450 },
  { name: "copper", c: 385 },
  { name: "lead", c: 130 },
  { name: "silver", c: 235 },
];

/** PHYS.9.5, PHYS.9.3 — Q = mcΔT and calorimetry. */
export function specificHeat(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const s = pick([{ name: "water", c: 4186 }, ...METALS.slice(0, 3)]);
    const m = pick([0.2, 0.5, 1.5, 2]);
    const T1 = pick([10, 20, 25]);
    const dT = pick([10, 20, 30, 40]);
    const Qj = m * s.c * dT;
    return Q({
      key: `sh-q-${s.name}-${m}-${T1}-${dT}`,
      prompt: `How much energy heats ${m} kg of ${s.name} (c = ${s.c} J/(kg·°C)) from ${T1} °C to ${T1 + dT} °C?`,
      ...vals(Qj / 1000, [(m * s.c * (T1 + dT)) / 1000, (s.c * dT) / 1000, (m * 1000 * s.c * dT) / 1000], "kJ", 3),
      hint: "Q = mcΔT, where ΔT is the change in temperature, not the final temperature.",
      explain: `Q = ${m} × ${s.c} × ${dT} = ${nf(Qj, 4)} J ≈ ${nf(Qj / 1000, 3)} kJ.`,
    });
  }
  if (kind === 1) {
    const m1 = pick([1, 2, 3, 4]) / 10;
    const m2 = pick([1, 2, 3, 4]) / 10;
    const T2 = pick([10, 15, 20]);
    const d = Math.round((m1 + m2) * 10) * pick([5, 10]);
    const T1 = T2 + d;
    const Tf = T2 + (d * m1) / (m1 + m2);
    return Q({
      key: `sh-mix-${m1}-${m2}-${T2}-${d}`,
      prompt: `${m1} kg of water at ${T1} °C is mixed with ${m2} kg of water at ${T2} °C in an insulated cup. What is the final temperature?`,
      visual: { kind: "phys-thermo", scene: "thermometer", min: 0, max: 100, step: 2, labelStep: 10, thermometers: [{ temp: T1, label: `${m1} kg` }, { temp: T2, label: `${m2} kg` }] },
      ...kp(Tf),
      unit: "°C",
      hint: "Heat lost by the hot water = heat gained by the cold water. c cancels because both are water.",
      explain: `${m1}(${T1} − T) = ${m2}(T − ${T2}) gives T = (${m1} × ${T1} + ${m2} × ${T2}) ÷ ${clean(m1 + m2)} = ${ds(Tf)} °C.`,
    });
  }
  if (kind === 2) {
    const metal = pick(METALS.filter((x) => x.name !== "silver"));
    const mm = pick([0.5, 1]);
    const mw = pick([0.2, 0.3]);
    const Tf = (mm * metal.c * 100 + mw * 4186 * 20) / (mm * metal.c + mw * 4186);
    const shown = dp(Tf, 1);
    return Q({
      key: `sh-identify-${metal.name}-${mm}-${mw}`,
      prompt: `A ${mm} kg metal block at 100 °C goes into ${mw} kg of water at 20 °C (c = 4186 J/(kg·°C)). They settle at ${shown} °C. Which metal is it?`,
      visual: table(["metal", "c (J/(kg·°C))"], METALS.filter((x) => x.name !== "silver").map((x) => [x.name, x.c])),
      ...txt(metal.name, METALS.filter((x) => x.name !== metal.name && x.name !== "silver").map((x) => x.name)),
      hint: "Heat gained by the water = heat lost by the metal: m_w c_w (T − 20) = m c (100 − T). Solve for c.",
      explain: `c = ${mw} × 4186 × (${shown} − 20) ÷ (${mm} × (100 − ${shown})) ≈ ${Math.round((mw * 4186 * (shown - 20)) / (mm * (100 - shown)))} J/(kg·°C): ${metal.name}.`,
    });
  }
  if (kind === 3) {
    const ms = some(METALS, 4);
    const big = pick([true, false]);
    const ans = [...ms].sort((a, b) => a.c - b.c)[big ? 0 : 3];
    return Q({
      key: `sh-rank-${ms.map((x) => x.name).join("-")}-${big}`,
      prompt: `Equal masses of these metals each absorb the same energy. Which has the ${big ? "largest" : "smallest"} temperature rise?`,
      visual: table(["metal", "c (J/(kg·°C))"], ms.map((x) => [x.name, x.c])),
      ...txt(ans.name, ms.filter((x) => x !== ans).map((x) => x.name)),
      hint: "ΔT = Q/(mc). With Q and m fixed, ΔT is inversely proportional to c.",
      explain: `ΔT ∝ 1/c, so the ${big ? "smallest" : "largest"} specific heat (${ans.name}, ${ans.c}) gives the ${big ? "largest" : "smallest"} rise.`,
    });
  }
  if (kind === 4) {
    const s = pick(METALS.slice(0, 3));
    const m = pick([0.5, 1, 2]);
    const dT = pick([10, 20]);
    const Qk = (m * s.c * dT) / 1000;
    const T0 = 20;
    return Q({
      key: `sh-graph-${s.name}-${m}-${dT}`,
      prompt: `The graph shows the temperature of a ${m} kg block as heat is added. What is its specific heat in J/(kg·°C)?`,
      visual: plot([0, Math.ceil(Qk * 1.25)], [0, 50], "Q (kJ)", "T (°C)", {
        lines: [{ from: [0, T0], to: [Qk, T0 + dT], colour: "berry" }],
        points: [{ x: 0, y: T0, label: `${T0} °C` }, { x: Qk, y: T0 + dT, label: `${ds(Qk)} kJ, ${T0 + dT} °C` }],
      }),
      needsVisual: true,
      ...kp(s.c),
      unit: "J/(kg·°C)",
      hint: "c = Q/(mΔT). Read Q and ΔT off the graph and convert kJ to J.",
      explain: `c = ${ds(Qk * 1000)} J ÷ (${m} kg × ${dT} °C) = ${s.c} J/(kg·°C), which is ${s.name}. A steeper line would mean a smaller c.`,
    });
  }
  const a = pick([2, 0.5, 3]);
  const b = pick([2, 0.5, 4]);
  const r = 1 / (a * b);
  return Q({
    key: `sh-ratio-${a}-${b}`,
    prompt: `Object X has ${a === 0.5 ? "half" : `${a} times`} the mass of Y and ${b === 0.5 ? "half" : `${b} times`} its specific heat. Both get the same heat. What is ΔT_X ÷ ΔT_Y?`,
    ...vals(r, [a * b, a / b, b / a], "", 3, (x) => nf(x, 3)),
    hint: "ΔT = Q/(mc). With equal Q, ΔT is inversely proportional to the product mc.",
    explain: `ΔT_X/ΔT_Y = (m_Y c_Y)/(m_X c_X) = 1/(${a} × ${b}) = ${nf(r, 3)}.`,
  });
}

const CONDUCT = [
  { name: "copper", k: 400 },
  { name: "aluminum", k: 240 },
  { name: "steel", k: 50 },
  { name: "glass", k: 0.8 },
  { name: "brick", k: 0.6 },
  { name: "wood", k: 0.12 },
  { name: "styrofoam", k: 0.033 },
  { name: "still air", k: 0.026 },
];

/** PHYS.9.5 — conduction rate kAΔT/L. */
export function conductivity(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const A = pick([1, 1.5, 2]);
    const L = pick([4, 5, 8]);
    const dT = pick([10, 15, 20, 25]);
    const P = (0.8 * A * dT) / (L / 1000);
    return Q({
      key: `cd-window-${A}-${L}-${dT}`,
      prompt: `A glass window (k = 0.8 W/(m·K)) is ${A} m² and ${L} mm thick. Inside is ${dT} K warmer than outside. At what rate does heat conduct through it?`,
      ...vals(P, [P / 1000, 0.8 * A * dT * L, (0.8 * dT) / (L / 1000)], "W", 2),
      hint: "Q/Δt = kAΔT/L, with L in meters.",
      explain: `Q/Δt = 0.8 × ${A} × ${dT} ÷ ${L / 1000} = ${nf(P, 3)} W. That's why thin single glazing loses so much heat.`,
    });
  }
  if (kind === 1) {
    const c = pick([
      { t: "the area doubles and the thickness doubles", a: "the same" },
      { t: "the area triples and the thickness doubles", a: "1.5 times as fast" },
      { t: "the temperature difference doubles and the thickness quadruples", a: "half as fast" },
      { t: "the area doubles and the temperature difference doubles", a: "4 times as fast" },
      { t: "the thickness triples", a: "one third as fast" },
      { t: "the slab is swapped for one with half the conductivity", a: "half as fast" },
      { t: "the temperature difference triples and the area doubles", a: "6 times as fast" },
    ]);
    const all = ["the same", "1.5 times as fast", "half as fast", "4 times as fast", "one third as fast", "6 times as fast", "twice as fast", "9 times as fast"];
    return Q({
      key: `cd-scale-${c.t}`,
      prompt: `Heat conducts through a slab. If ${c.t}, how does the rate change?`,
      ...txt(c.a, all.filter((x) => x !== c.a)),
      hint: "Rate = kAΔT/L: proportional to k, A and ΔT; inversely proportional to the thickness L.",
      explain: `Multiply the factors for k, A and ΔT and divide by the factor for L: the rate is ${c.a}.`,
    });
  }
  if (kind === 2) {
    const [k1, k2] = pick([[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [1, 5], [2, 3], [3, 2], [1, 4]]);
    const span = pick([60, 120]);
    const Tc = pick([0, 10, 20]);
    const Th = Tc + span;
    const Ti = Tc + (k1 * span) / (k1 + k2);
    return Q({
      key: `cd-layers-${k1}-${k2}-${span}-${Tc}`,
      prompt: `Two slabs of equal thickness are stacked. Slab A (k = ${k1} W/(m·K)) faces ${Th} °C; slab B (k = ${k2} W/(m·K)) faces ${Tc} °C. What is the temperature where they meet?`,
      ...kp(Ti),
      unit: "°C",
      hint: "In steady state the same heat rate flows through both: k_A(T_h − T) = k_B(T − T_c).",
      explain: `${k1}(${Th} − T) = ${k2}(T − ${Tc}) gives T = (${k1} × ${Th} + ${k2} × ${Tc}) ÷ ${k1 + k2} = ${ds(Ti)} °C. The poorer conductor has the bigger temperature drop.`,
    });
  }
  if (kind === 3) {
    const [metal, other] = pick([["metal bench", "wooden bench"], ["steel railing", "plastic handle"], ["tile floor", "carpet"]]);
    const T = pick([5, 10, 15]);
    return Q({
      key: `cd-feel-${metal}-${T}`,
      prompt: `On a ${T} °C morning a ${metal} feels colder than a ${other}, though both are at ${T} °C. Why?`,
      ...txt(`The ${metal.split(" ")[0]} conducts heat away from your skin faster`, [`The ${metal.split(" ")[0]} is actually colder`, `The ${other.split(" ")[0]} makes its own heat`, `The ${metal.split(" ")[0]} has less thermal energy`]),
      hint: "Your skin senses how fast it loses heat, not the temperature of what it touches.",
      explain: `Same temperature, but the ${metal.split(" ")[0]} has a much higher thermal conductivity, so it draws heat out of your warmer skin faster.`,
    });
  }
  if (kind === 4) {
    const ms = some(CONDUCT, 4);
    const best = pick([true, false]);
    const ans = [...ms].sort((a, b) => a.k - b.k)[best ? 0 : 3];
    return Q({
      key: `cd-insul-${ms.map((x) => x.name).join("-")}-${best}`,
      prompt: best ? "Slabs of the same size are made of these materials. Which makes the best insulator?" : "Slabs of the same size are made of these materials. Which lets heat through fastest?",
      visual: table(["material", "k (W/(m·K))"], ms.map((x) => [x.name, x.k])),
      ...txt(ans.name, ms.filter((x) => x !== ans).map((x) => x.name)),
      hint: "Same A, L and ΔT, so the rate is proportional to k.",
      explain: `${ans.name} has the ${best ? "lowest" : "highest"} k (${ans.k} W/(m·K)), so it conducts ${best ? "slowest: the best insulator" : "fastest"}.`,
    });
  }
  const P1 = pick([20, 40, 60]);
  const [aL, aA, aT] = pick([[2, 2, 1], [2, 1, 2], [3, 3, 2], [2, 4, 1], [4, 2, 1]]);
  const P2 = (P1 * aA * aT) / aL;
  return Q({
    key: `cd-rod-${P1}-${aL}-${aA}-${aT}`,
    prompt: `A rod conducts ${P1} W. A rod of the same metal is ${aL} times as long, has ${aA === 1 ? "the same" : `${aA} times the`} area and ${aT === 1 ? "the same" : `${aT} times the`} temperature difference. What power does it conduct?`,
    ...kp(P2),
    unit: "W",
    hint: "Rate ∝ AΔT/L. Multiply by the area and ΔT factors, divide by the length factor.",
    explain: `${P1} × ${aA} × ${aT} ÷ ${aL} = ${ds(P2)} W.`,
  });
}

/** PHYS.9.4 — the first law, ΔU = Q + W (W = work done ON the gas). */
export function firstLaw(): Question {
  const kind = rand(0, 6);
  if (kind === 0) {
    const Qin = rand(4, 18) * 50;
    const Wby = rand(2, 12) * 50;
    return Q({
      key: `fl-expand-${Qin}-${Wby}`,
      prompt: `${Qin} J of heat flows into a gas while it expands, doing ${Wby} J of work on its surroundings. What is ΔU of the gas?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: 0.75, heat: "in", hot: true },
      ...kps(Qin - Wby),
      unit: "J",
      hint: "ΔU = Q + W, where W is the work done ON the gas. When the gas does work by expanding, W is negative.",
      explain: `Q = +${Qin} J and W = −${Wby} J, so ΔU = ${Qin} − ${Wby} = ${ds(Qin - Wby)} J.`,
    });
  }
  if (kind === 1) {
    const Qout = rand(2, 12) * 50;
    const Won = rand(2, 12) * 50;
    return Q({
      key: `fl-compress-${Qout}-${Won}`,
      prompt: `A gas is compressed with ${Won} J of work done on it, while ${Qout} J of heat leaves it. What is ΔU of the gas?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: 0.35, heat: "out", weight: "🧱" },
      ...kps(Won - Qout),
      unit: "J",
      hint: "ΔU = Q + W. Heat leaving makes Q negative; work done on the gas makes W positive.",
      explain: `Q = −${Qout} J and W = +${Won} J, so ΔU = ${Won} − ${Qout} = ${ds(Won - Qout)} J.`,
    });
  }
  if (kind === 2) {
    const W = rand(2, 16) * 50;
    const comp = rand(0, 1) === 1;
    return Q({
      key: `fl-iso-${W}-${comp}`,
      prompt: comp
        ? `An ideal gas is compressed slowly at constant temperature; ${W} J of work is done on it. What is Q for the gas?`
        : `An ideal gas expands slowly at constant temperature, doing ${W} J of work. What is Q for the gas?`,
      ...kps(comp ? -W : W),
      unit: "J",
      hint: "An ideal gas's internal energy depends only on T. Isothermal means ΔU = 0, so Q = −W.",
      explain: comp ? `ΔU = 0 and W = +${W} J, so Q = −${W} J: the gas gives off heat as it is squeezed.` : `ΔU = 0 and W = −${W} J (the gas does work), so Q = +${W} J flows in.`,
    });
  }
  if (kind === 3) {
    const comp = rand(0, 1) === 1;
    const W = rand(2, 10) * 50;
    return Q({
      key: `fl-adiabatic-${comp}-${W}`,
      prompt: comp ? `A gas is compressed so quickly that no heat flows (adiabatic); ${W} J of work is done on it. What happens to its temperature?` : `A gas expands adiabatically (no heat flow), doing ${W} J of work. What happens to its temperature?`,
      ...txt(comp ? "It rises" : "It falls", [comp ? "It falls" : "It rises", "It stays the same"], 3),
      hint: "Adiabatic: Q = 0, so ΔU = W. Internal energy of an ideal gas goes with temperature.",
      explain: comp ? `Q = 0 and W = +${W} J, so ΔU = +${W} J: the gas gets hotter (like a bike pump).` : `Q = 0 and W = −${W} J, so ΔU = −${W} J: the gas cools (like spray from a can).`,
    });
  }
  if (kind === 4) {
    const n = pick([0.5, 1, 2]);
    const Qin = pick([300, 500, 750, 1000, 1500]);
    const dT = Qin / (1.5 * n * R_GAS);
    return Q({
      key: `fl-isochoric-${n}-${Qin}`,
      prompt: `${Qin} J of heat is added to ${n} mol of a monatomic ideal gas in a rigid container. By how much does its temperature rise?`,
      ...vals(dT, [Qin / (n * R_GAS), Qin / (2.5 * n * R_GAS), (Qin * 1.5) / (n * R_GAS)], "K", 3),
      hint: "Rigid container: W = 0, so ΔU = Q. For a monatomic gas ΔU = (3/2)nRΔT.",
      explain: `ΔT = Q ÷ (1.5nR) = ${Qin} ÷ (1.5 × ${n} × 8.31) ≈ ${nf(dT, 3)} K.`,
    });
  }
  if (kind === 5) {
    const Qin = rand(2, 8) * 50;
    const Won = rand(2, 8) * 50;
    const dU = Qin + Won;
    const max = Math.ceil(dU / 100) * 100;
    return Q({
      key: `fl-bars-${Qin}-${Won}`,
      prompt: `A gas is squeezed (W = +${Won} J) while being heated (Q = +${Qin} J). What is ΔU?`,
      visual: { kind: "phys-energy", names: ["Q", "W", "ΔU"], bars: [{ title: "Energy into the gas", values: [Qin, Won, "?"] }], max, unit: "J" },
      ...kps(dU),
      unit: "J",
      hint: "ΔU = Q + W. Both heat in and work done on the gas add energy.",
      explain: `ΔU = ${Qin} + ${Won} = ${dU} J.`,
    });
  }
  const s = pick([
    { t: "expands while heat is removed", a: "Negative" },
    { t: "is compressed while heat is added", a: "Positive" },
    { t: "expands while heat is added", a: "Can't tell without the amounts" },
    { t: "is compressed while heat is removed", a: "Can't tell without the amounts" },
    { t: "is heated in a rigid container", a: "Positive" },
    { t: "is cooled in a rigid container", a: "Negative" },
  ]);
  return Q({
    key: `fl-sign-${s.t}`,
    prompt: `A gas ${s.t}. What is the sign of ΔU?`,
    ...txt(s.a, ["Positive", "Negative", "Zero", "Can't tell without the amounts"].filter((x) => x !== s.a)),
    hint: "ΔU = Q + W. Heat in: Q > 0. Compression: W > 0 (work done on the gas). Expansion: W < 0.",
    explain: s.a === "Can't tell without the amounts" ? "Q and W have opposite signs here, so ΔU could be either sign." : `Q and W are both ${s.a === "Positive" ? "≥ 0" : "≤ 0"} here, so ΔU is ${s.a.toLowerCase()}.`,
  });
}

/** Signed area of a polygon (counterclockwise positive). */
const shoelace = (p: [number, number][]) => p.reduce((s, [x1, y1], i) => s + x1 * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y1, 0) / 2;
const loop = (p: [number, number][], colour: Colour = "berry"): Seg[] => p.map((a, i) => ({ from: a, to: p[(i + 1) % p.length], colour }));

/** PHYS.9.4 — work as the area under a P–V graph. */
export function pvWork(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const P = pick([100, 150, 200, 250, 300]);
    const V1 = rand(1, 3);
    const V2 = V1 + rand(2, 4);
    const expand = rand(0, 1) === 1;
    const [A, B] = expand ? [V1, V2] : [V2, V1];
    return Q({
      key: `pv-isobar-${P}-${V1}-${V2}-${expand}`,
      prompt: `The gas goes from A to B at constant pressure. How much work is done ON the gas?`,
      visual: plot([0, 8], [0, 350], "V (L)", "P (kPa)", { lines: [{ from: [A, P], to: [B, P], colour: "berry" }], points: [{ x: A, y: P, label: "A" }, { x: B, y: P, label: "B" }], shade: { fn: () => P, from: V1, to: V2 } }),
      needsVisual: true,
      ...kps(-P * (B - A)),
      unit: "J",
      hint: "W_on = −PΔV. The shaded area is the size of the work; expanding gas has negative work done on it. 1 kPa·L = 1 J.",
      explain: `ΔV = ${B - A} L, so W_on = −${P} × (${B - A}) = ${ds(-P * (B - A))} J.`,
    });
  }
  if (kind === 1 || kind === 2) {
    const dV = pick([2, 4, 6]);
    const dP = pick([100, 200, 300]);
    const V0 = rand(1, 2);
    const P0 = pick([100, 200]);
    const tri = kind === 1;
    const base: [number, number][] = tri
      ? [[V0, P0], [V0 + dV, P0], [V0, P0 + dP]]
      : [[V0, P0], [V0 + dV, P0], [V0 + dV, P0 + dP], [V0, P0 + dP]];
    const cw = rand(0, 1) === 1;
    const pts = cw ? [...base].reverse() : base;
    const Wby = -shoelace(pts);
    const ask = tri ? "by" : pick(["by", "on"]);
    const names = "ABCD";
    return Q({
      key: `pv-cycle-${tri}-${dV}-${dP}-${V0}-${P0}-${cw}-${ask}`,
      prompt: `The gas goes round the cycle ${names.slice(0, pts.length).split("").join("→")}→A. What is the net work done ${ask.toUpperCase()} the gas per cycle?`,
      visual: plot([0, 9], [0, 600], "V (L)", "P (kPa)", { lines: loop(pts), points: pts.map(([x, y], i) => ({ x, y, label: names[i] })) }),
      needsVisual: true,
      ...kps(ask === "by" ? Wby : -Wby),
      unit: "J",
      hint: "Net work is the area inside the loop. Clockwise on a P–V graph: the gas does positive net work. 1 kPa·L = 1 J.",
      explain: `Area = ${tri ? `½ × ${dV} × ${dP}` : `${dV} × ${dP}`} = ${Math.abs(Wby)} J. The loop runs ${Wby > 0 ? "clockwise" : "counterclockwise"}, so W_by = ${ds(Wby)} J and W_on = ${ds(-Wby)} J.`,
    });
  }
  if (kind === 3) {
    const V1 = rand(1, 2);
    const V2 = V1 + pick([3, 4, 5]);
    const Ph = pick([300, 400]);
    const Pl = pick([100, 200]);
    const ask = pick(["which", "diff"] as const);
    return Q({
      key: `pv-paths-${V1}-${V2}-${Ph}-${Pl}-${ask}`,
      prompt: ask === "which" ? "The gas goes from A to C by path ABC or by path ADC. Along which path does the gas do more work?" : "How much more work does the gas do along path ABC than along ADC?",
      visual: plot([0, 8], [0, 500], "V (L)", "P (kPa)", {
        lines: [
          { from: [V1, Ph], to: [V2, Ph], colour: "berry" },
          { from: [V2, Ph], to: [V2, Pl], colour: "berry" },
          { from: [V1, Ph], to: [V1, Pl], colour: "wave" },
          { from: [V1, Pl], to: [V2, Pl], colour: "wave" },
        ],
        points: [{ x: V1, y: Ph, label: "A" }, { x: V2, y: Ph, label: "B" }, { x: V2, y: Pl, label: "C" }, { x: V1, y: Pl, label: "D" }],
      }),
      needsVisual: true,
      ...(ask === "which" ? txt("ABC", ["ADC", "The same: same start and end"], 3) : kp((Ph - Pl) * (V2 - V1))),
      unit: ask === "diff" ? "J" : undefined,
      hint: "Work depends on the path: it is the area under the curve. Expanding at higher pressure does more work.",
      explain: `ABC expands at ${Ph} kPa: ${Ph * (V2 - V1)} J. ADC expands at ${Pl} kPa: ${Pl * (V2 - V1)} J. ABC does ${(Ph - Pl) * (V2 - V1)} J more, even though ΔU is the same.`,
    });
  }
  if (kind === 4) {
    const dV = pick([2, 3, 4]);
    const dP = pick([100, 200, 300]);
    const V0 = rand(1, 3);
    const P0 = pick([100, 200]);
    const shape = rand(0, 2);
    const pts: [number, number][] =
      shape === 0 ? [[V0, P0], [V0, P0 + dP], [V0 + dV, P0]] : shape === 1 ? [[V0, P0 + dP], [V0 + dV, P0 + dP], [V0 + dV, P0]] : [[V0, P0], [V0 + dV, P0], [V0 + dV, P0 + dP]];
    const segs = ["A→B", "B→C", "C→A"];
    const zero = segs.find((_, i) => pts[i][0] === pts[(i + 1) % 3][0])!;
    return Q({
      key: `pv-zero-${dV}-${dP}-${V0}-${P0}-${shape}`,
      prompt: "In which part of the cycle is no work done on or by the gas?",
      visual: plot([0, 8], [0, 600], "V (L)", "P (kPa)", { lines: loop(pts), points: pts.map(([x, y], i) => ({ x, y, label: "ABC"[i] })) }),
      needsVisual: true,
      ...txt(zero, segs.filter((s) => s !== zero), 3),
      hint: "W = −PΔV summed along the path. Where is ΔV = 0?",
      explain: `${zero} is vertical: the volume doesn't change, so W = 0 (an isochoric step).`,
    });
  }
  const V1 = rand(1, 2);
  const V2 = V1 + pick([2, 4]);
  const P1 = pick([100, 200, 300, 400]);
  let P2 = pick([100, 200, 300, 400]);
  while (P2 === P1) P2 = pick([100, 200, 300, 400]);
  const W = ((P1 + P2) / 2) * (V2 - V1);
  return Q({
    key: `pv-trap-${V1}-${V2}-${P1}-${P2}`,
    prompt: "The gas expands along the straight line from A to B. How much work does the gas do?",
    visual: plot([0, 8], [0, 500], "V (L)", "P (kPa)", { lines: [{ from: [V1, P1], to: [V2, P2], colour: "berry" }], points: [{ x: V1, y: P1, label: "A" }, { x: V2, y: P2, label: "B" }], shade: { fn: (v) => P1 + ((P2 - P1) * (v - V1)) / (V2 - V1), from: V1, to: V2 } }),
    needsVisual: true,
    ...kp(W),
    unit: "J",
    hint: "The area under a straight line is a trapezoid: average pressure × ΔV.",
    explain: `W_by = ½(${P1} + ${P2}) × ${V2 - V1} = ${W} J.`,
  });
}

/** PHYS.9.4, PHYS.9.2 — thermodynamic processes on a P–V diagram. */
export function processes(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    for (;;) {
      const PA = pick([100, 200, 300]);
      const VA = pick([1, 2, 3, 4]);
      const PB = pick([100, 200, 300, 400]);
      const VB = pick([1, 2, 3, 4, 6]);
      const TA = pick([200, 300, 400]);
      const TB = (TA * PB * VB) / (PA * VA);
      if (!Number.isInteger(TB) || (PA === PB && VA === VB) || TB > 2400) continue;
      return Q({
        key: `pr-tb-${PA}-${VA}-${PB}-${VB}-${TA}`,
        prompt: `A fixed amount of ideal gas goes from state A to state B. T_A = ${TA} K. What is T_B?`,
        visual: plot([0, 7], [0, 450], "V (L)", "P (kPa)", { lines: [{ from: [VA, PA], to: [VB, PB], colour: "berry", dashed: true }], points: [{ x: VA, y: PA, label: "A" }, { x: VB, y: PB, label: "B" }] }),
        needsVisual: true,
        ...kp(TB),
        unit: "K",
        hint: "PV/T is constant for a fixed amount of gas, so T_B = T_A × (P_B V_B)/(P_A V_A).",
        explain: `P_A V_A = ${PA * VA} and P_B V_B = ${PB * VB}, so T_B = ${TA} × ${PB * VB}/${PA * VA} = ${TB} K.`,
      });
    }
  }
  if (kind === 1) {
    const type = pick(["isobaric", "isochoric", "isothermal", "adiabatic"] as const);
    const VA = pick([1, 2]);
    const PA = pick([300, 400]);
    const k = pick([2, 3]);
    const c = PA * VA;
    const cA = PA * VA ** (5 / 3);
    const VB = type === "isochoric" ? VA : VA * k;
    const PB = type === "isobaric" ? PA : type === "isochoric" ? PA / k : type === "isothermal" ? c / VB : cA / VB ** (5 / 3);
    const lines: Seg[] = type === "isobaric" || type === "isochoric" ? [{ from: [VA, PA], to: [VB, PB], colour: "berry" }] : [];
    const curves =
      type === "isothermal"
        ? [{ fn: (v: number) => (v >= VA && v <= VB ? c / v : NaN), colour: "berry" as Colour }]
        : type === "adiabatic"
          ? [
              { fn: (v: number) => (v >= VA && v <= VB ? cA / v ** (5 / 3) : NaN), colour: "berry" as Colour },
              { fn: (v: number) => c / v, colour: "wave" as Colour, dashed: true, label: "isotherm" },
            ]
          : [];
    return Q({
      key: `pr-type-${type}-${VA}-${PA}-${k}`,
      prompt: `What kind of process is A→B?${type === "adiabatic" ? " The dashed curve is the isotherm through A." : ""}`,
      visual: plot([0, 7], [0, 450], "V (L)", "P (kPa)", { lines, curves, points: [{ x: VA, y: PA, label: "A" }, { x: VB, y: PB, label: "B" }] }),
      needsVisual: true,
      ...txt(type, ["isobaric", "isochoric", "isothermal", "adiabatic"].filter((t) => t !== type)),
      hint: "Flat: constant P. Vertical: constant V. PV constant: isothermal. Falls more steeply than the isotherm: adiabatic.",
      explain: {
        isobaric: "The pressure stays the same while V changes: isobaric.",
        isochoric: "The volume doesn't change: isochoric, so W = 0.",
        isothermal: `PV stays at ${c} along the curve: isothermal, so ΔU = 0.`,
        adiabatic: "It drops more steeply than the isotherm: with no heat in, the gas cools as it expands. Adiabatic.",
      }[type],
    });
  }
  if (kind === 2) {
    const PA = pick([100, 200, 300]);
    const VA = pick([1, 2, 3]);
    let PB = pick([100, 200, 300, 400]);
    let VB = pick([1, 2, 3, 4]);
    while (PA * VA === PB * VB) {
      PB = pick([100, 200, 300, 400]);
      VB = pick([1, 2, 3, 4]);
    }
    const dU = 1.5 * (PB * VB - PA * VA);
    return Q({
      key: `pr-du-${PA}-${VA}-${PB}-${VB}`,
      prompt: "A monatomic ideal gas goes from A to B. What is ΔU?",
      visual: plot([0, 5], [0, 450], "V (L)", "P (kPa)", { lines: [{ from: [VA, PA], to: [VB, PB], colour: "berry", dashed: true }], points: [{ x: VA, y: PA, label: "A" }, { x: VB, y: PB, label: "B" }] }),
      needsVisual: true,
      ...kps(dU),
      unit: "J",
      hint: "For a monatomic ideal gas U = (3/2)nRT = (3/2)PV, so ΔU = (3/2)(P_B V_B − P_A V_A). The path doesn't matter.",
      explain: `ΔU = 1.5 × (${PB * VB} − ${PA * VA}) = ${ds(dU)} J.`,
    });
  }
  if (kind === 3) {
    const P = pick([100, 200, 300]);
    const dV = pick([1, 2, 3, 4]);
    const ask = pick(["Q", "dU"] as const);
    return Q({
      key: `pr-isobaricq-${P}-${dV}-${ask}`,
      prompt: `A monatomic ideal gas expands at a constant ${P} kPa by ${dV} L. ${ask === "Q" ? "How much heat flows into it?" : "What is ΔU?"}`,
      ...kp(ask === "Q" ? 2.5 * P * dV : 1.5 * P * dV),
      unit: "J",
      hint: "W_by = PΔV and ΔU = (3/2)PΔV here. Then Q = ΔU + W_by.",
      explain: `W_by = ${P * dV} J and ΔU = 1.5 × ${P * dV} = ${1.5 * P * dV} J, so Q = ${1.5 * P * dV} + ${P * dV} = ${2.5 * P * dV} J.`,
    });
  }
  if (kind === 4) {
    const W = rand(2, 12) * 50;
    const cw = rand(0, 1) === 1;
    return Q({
      key: `pr-cycle-${W}-${cw}`,
      prompt: `A gas goes once round a ${cw ? "clockwise" : "counterclockwise"} cycle on a P–V diagram enclosing an area of ${W} J. What is the net heat added to the gas?`,
      ...kps(cw ? W : -W),
      unit: "J",
      hint: "Back at the start state, ΔU = 0 for the whole cycle, so Q_net = −W_on = W_by.",
      explain: `ΔU = 0 over a cycle. ${cw ? "Clockwise" : "Counterclockwise"} means W_by = ${cw ? "+" : "−"}${W} J, so Q_net = ${cw ? "+" : "−"}${W} J.`,
    });
  }
  const s = pick([
    { p: "isothermal expansion", a: "ΔU = 0 and Q = work done by the gas" },
    { p: "adiabatic expansion", a: "Q = 0 and the temperature drops" },
    { p: "isochoric heating", a: "W = 0 and ΔU = Q" },
    { p: "isobaric compression", a: "The temperature drops and heat leaves" },
  ]);
  const all = ["ΔU = 0 and Q = work done by the gas", "Q = 0 and the temperature drops", "W = 0 and ΔU = Q", "The temperature drops and heat leaves", "ΔU = 0 and Q = 0"];
  return Q({
    key: `pr-fact-${s.p}`,
    prompt: `Which is true for an ideal gas in ${s.p}?`,
    ...txt(s.a, all.filter((x) => x !== s.a)),
    hint: "Isothermal: ΔT = 0 so ΔU = 0. Adiabatic: Q = 0. Isochoric: ΔV = 0 so W = 0. Isobaric: P constant, so T ∝ V.",
    explain: `For ${s.p}: ${s.a}.`,
  });
}

/** PHYS.9.6 — entropy and the second law. */
export function entropy(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const Qj = pick([300, 600, 900, 1200, 1500]);
    const T = pick([150, 200, 250, 300]);
    return Q({
      key: `en-dS-${Qj}-${T}`,
      prompt: `${Qj} J of heat flows slowly into a large reservoir kept at ${T} K. What is the reservoir's entropy change?`,
      ...kp(Qj / T),
      unit: "J/K",
      hint: "At constant temperature ΔS = Q/T (T in kelvin).",
      explain: `ΔS = ${Qj} ÷ ${T} = ${ds(Qj / T)} J/K.`,
    });
  }
  if (kind === 1) {
    const Qj = pick([600, 1200, 1800, 2400]);
    const [Th, Tc] = pick([[400, 200], [600, 300], [600, 200], [400, 100], [300, 200], [600, 400]]);
    const dS = Qj / Tc - Qj / Th;
    return Q({
      key: `en-total-${Qj}-${Th}-${Tc}`,
      prompt: `${Qj} J of heat flows from a reservoir at ${Th} K to one at ${Tc} K. What is the total entropy change of the two?`,
      ...kp(dS),
      unit: "J/K",
      hint: "The hot one loses Q/T_h; the cold one gains Q/T_c. Add them.",
      explain: `ΔS = ${Qj}/${Tc} − ${Qj}/${Th} = ${ds(Qj / Tc)} − ${ds(Qj / Th)} = ${ds(dS)} J/K. It's positive, as the second law requires.`,
    });
  }
  if (kind === 2) {
    const ok = pick([
      "Heat flows by itself from a cold object to a hot one",
      "An engine turns all the heat it takes in into work, in a cycle",
      "A gas spontaneously gathers in one half of its box",
      "The total entropy of an isolated system decreases",
    ]);
    return Q({
      key: `en-impossible-${ok}`,
      prompt: "Which of these would break the second law of thermodynamics?",
      ...txt(ok, ["A refrigerator moves heat from cold to hot using work", "Ice melts in a warm room", "A hot drink cools to room temperature", "A gas expands to fill a vacuum"]),
      hint: "The total entropy of an isolated system never decreases. Heat flows hot → cold unless work is done.",
      explain: `"${ok}" would lower the total entropy, so it never happens on its own. A fridge is fine: its work adds more entropy to the room than it removes from inside.`,
    });
  }
  if (kind === 3) {
    const N = rand(2, 8);
    return Q({
      key: `en-micro-${N}`,
      prompt: `${N} gas molecules move randomly in a box. What is the probability that all ${N} are in the left half at one moment?`,
      ...txt(`1/${2 ** N}`, [`1/${N}`, `1/${2 * N}`, "1/2", `1/${N * N}`]),
      hint: "Each molecule is on the left with probability ½, independently.",
      explain: `(½)^${N} = 1/${2 ** N}. With 10²³ molecules this is essentially zero: the spread-out (high-entropy) arrangements are overwhelmingly more likely.`,
    });
  }
  if (kind === 4) {
    const s = pick([
      { t: "An ice cube melts", a: "increases" },
      { t: "Water freezes into ice", a: "decreases" },
      { t: "A gas expands freely into a vacuum", a: "increases" },
      { t: "A gas is compressed slowly at constant temperature", a: "decreases" },
      { t: "A gas is heated in a rigid tank", a: "increases" },
      { t: "Steam condenses into water", a: "decreases" },
      { t: "Salt dissolves in water", a: "increases" },
    ]);
    return Q({
      key: `en-sign-${s.t}`,
      prompt: `${s.t}. What happens to the entropy of that substance (the system)?`,
      ...txt(s.a, ["increases", "decreases", "stays the same"].filter((x) => x !== s.a), 3),
      hint: "Entropy measures how spread out the energy and particles are: more disorder, more possible microstates.",
      explain: `The system ${s.a === "increases" ? "gets more spread out" : "gets more ordered"}, so its entropy ${s.a}. ${s.a === "decreases" ? "The surroundings gain at least as much, so total entropy still doesn't fall." : ""}`.trim(),
    });
  }
  const Th = pick([500, 600, 800]);
  const Tc = pick([300, 400].filter((t) => t < Th));
  const e = 1 - Tc / Th;
  return Q({
    key: `en-engine-${Th}-${Tc}`,
    prompt: `A heat engine runs between ${Th} K and ${Tc} K. What is the greatest efficiency the second law allows?`,
    ...vals(e * 100, [(Tc / Th) * 100, 100, ((Th - Tc) / Tc) * 100], "%", 3),
    hint: "An engine must dump some heat into the cold reservoir to keep total entropy from falling. e_max = 1 − T_c/T_h.",
    explain: `e_max = 1 − ${Tc}/${Th} = ${nf(e * 100, 3)}%. A real engine does worse; none can reach 100%.`,
  });
}

/* ============================================= 2. Electric force, field and potential */

type Charge = { sign: "+" | "−"; x: number; y: number; q?: number; label?: string };
const chargesV = (charges: Charge[], more: { lines?: boolean; distance?: string | number; unit?: string; forces?: boolean; forceLabels?: (string | number | null)[] } = {}): Visual => ({
  kind: "phys-magnets",
  scene: "charges",
  charges,
  ...more,
});
const sgn = (q: number): "+" | "−" => (q < 0 ? "−" : "+");
const qMag = (q: number) => Math.min(3, Math.max(1, Math.round(Math.abs(q))));
const μC = (q: number) => `${q > 0 ? "+" : q < 0 ? "−" : ""}${Math.abs(q)} μC`;
/** A force or field as "2.5 N to the right". */
const dirFmt = (unit: string, pos = "to the right", neg = "to the left") => (x: number, n: number) => `${nf(Math.abs(x), n)} ${unit} ${x >= 0 ? pos : neg}`;

/** PHYS.10.2 — conservation of charge; charging by contact, friction and induction. */
export function charging(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    let q1 = rand(-8, 8);
    let q2 = rand(-8, 8);
    while ((q1 + q2) % 2 !== 0 || q1 === q2 || q1 === 0 || q2 === 0) {
      q1 = rand(-8, 8);
      q2 = rand(-8, 8);
    }
    return Q({
      key: `ch-touch-${q1}-${q2}`,
      prompt: `Identical metal spheres A (${μC(q1)}) and B (${μC(q2)}) touch and are pulled apart. What is A's charge now, in μC?`,
      visual: chargesV([
        { sign: sgn(q1), x: -2, y: 0, q: qMag(q1 / 3), label: "A" },
        { sign: sgn(q2), x: 2, y: 0, q: qMag(q2 / 3), label: "B" },
      ]),
      ...kps((q1 + q2) / 2),
      unit: "μC",
      hint: "Charge is conserved. Identical conductors share the total equally.",
      explain: `Total = ${ds(q1)} + ${ds(q2)} = ${ds(q1 + q2)} μC, shared equally: ${ds((q1 + q2) / 2)} μC each.`,
    });
  }
  if (kind === 1) {
    const q = pick([4, 8, 12, 16, -4, -8, -12, -16]);
    return Q({
      key: `ch-three-${q}`,
      prompt: `Identical spheres: A has ${μC(q)}, B and C are neutral. A touches B and they separate; then B touches C. What is C's final charge, in μC?`,
      ...kps(q / 4),
      unit: "μC",
      hint: "Each touch shares the pair's total equally. Follow the charge one step at a time.",
      explain: `A and B each get ${ds(q / 2)} μC. B then shares ${ds(q / 2)} μC with C: ${ds(q / 4)} μC each.`,
    });
  }
  if (kind === 2) {
    const n = rand(2, 9);
    const p = rand(9, 13);
    const sign = pick([1, -1]);
    const qC = sign * n * 10 ** p * QE;
    return Q({
      key: `ch-electrons-${n}-${p}-${sign}`,
      prompt: `A neutral object ends up with a charge of ${sci(qC, 2)} C. How many electrons did it ${sign < 0 ? "gain" : "lose"}?`,
      ...vals(n * 10 ** p, [n * 10 ** p * 1e-19, Math.abs(qC) * 1.6e19 * 1e-19, n * 10 ** (p - 19)], "", 2, sci),
      hint: "Charge is quantized: q = Ne with e = 1.6 × 10⁻¹⁹ C. Divide.",
      explain: `N = ${sci(Math.abs(qC), 2)} ÷ 1.6 × 10⁻¹⁹ = ${sci(n * 10 ** p, 2)} electrons ${sign < 0 ? "gained (it's negative)" : "lost (it's positive)"}.`,
    });
  }
  if (kind === 3) {
    const rod = pick(["+", "−"] as const);
    const grounded = pick([true, false]);
    const opp = rod === "+" ? "negative" : "positive";
    return Q({
      key: `ch-induct-${rod}-${grounded}`,
      prompt: grounded
        ? `A ${rod === "+" ? "positive" : "negative"} rod is held near (not touching) a neutral metal sphere. The sphere is grounded, the ground wire is removed, then the rod is taken away. The sphere is now:`
        : `A ${rod === "+" ? "positive" : "negative"} rod is held near (not touching) a neutral metal sphere on an insulating stand, then taken away. The sphere is now:`,
      ...txt(grounded ? opp : "neutral", ["positive", "negative", "neutral"].filter((x) => x !== (grounded ? opp : "neutral")), 3),
      hint: "Nearby charge only pushes the sphere's electrons around (polarization). Charge can only leave or arrive through the ground wire.",
      explain: grounded
        ? `The rod ${rod === "+" ? "pulls electrons up from the ground" : "pushes electrons out to the ground"}; cutting the wire traps that change, so the sphere is ${opp} (opposite to the rod).`
        : "Nothing touched it, so no charge was added or removed: it is still neutral once the rod leaves.",
    });
  }
  if (kind === 4) {
    const [obj, cloth, objGets] = pick([["balloon", "hair", "−"], ["plastic rod", "wool", "−"], ["glass rod", "silk", "+"], ["rubber rod", "fur", "−"]] as const);
    const q = rand(2, 9) * 10;
    return Q({
      key: `ch-rub-${obj}-${q}`,
      prompt: `A ${obj} rubbed with ${cloth} ends up with ${objGets}${q} nC. What charge is left on the ${cloth}?`,
      ...txt(`${objGets === "−" ? "+" : "−"}${q} nC`, [`${objGets}${q} nC`, "0 nC", `${objGets === "−" ? "+" : "−"}${q * 2} nC`]),
      hint: "Rubbing moves electrons from one object to the other; it doesn't create charge.",
      explain: `Charge is conserved: the ${cloth} has exactly the opposite charge, ${objGets === "−" ? "+" : "−"}${q} nC.`,
    });
  }
  const good = rand(2, 9);
  const bad = pick([1.5, 2.5, 0.5, 3.5]);
  return Q({
    key: `ch-quant-${good}-${bad}`,
    prompt: "Which of these could NOT be the net charge on an object?",
    ...txt(`${sci(bad * QE, 2)} C`, [`${sci(good * QE, 2)} C`, `${sci(-(good + 1) * QE, 2)} C`, `${sci(10 * good * QE, 2)} C`]),
    hint: "Every charge is a whole-number multiple of e = 1.6 × 10⁻¹⁹ C.",
    explain: `${sci(bad * QE, 2)} C is ${bad} e, not a whole number of electrons, so it can't happen.`,
  });
}

/** PHYS.10.1 — Coulomb's law. */
export function coulomb(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const q1 = rand(1, 9);
    const q2 = rand(1, 9) * pick([1, -1]);
    const r = pick([10, 20, 30, 50]);
    const F = (KC * q1 * 1e-6 * Math.abs(q2) * 1e-6) / (r / 100) ** 2;
    return Q({
      key: `co-f-${q1}-${q2}-${r}`,
      prompt: `What is the size of the electric force between ${μC(q1)} and ${μC(q2)} charges ${r} cm apart? (k = 9.0 × 10⁹ N·m²/C²)`,
      visual: chargesV([{ sign: "+", x: -2, y: 0, q: qMag(q1 / 3), label: "q₁" }, { sign: sgn(q2), x: 2, y: 0, q: qMag(Math.abs(q2) / 3), label: "q₂" }], { distance: r, unit: "cm", forces: true }),
      ...vals(F, [F * (r / 100), F / 1e4, (KC * q1 * Math.abs(q2) * 1e-6) / (r / 100) ** 2], "N", 2),
      hint: "F = k|q₁q₂|/r² with charges in coulombs (1 μC = 10⁻⁶ C) and r in meters. Don't forget to square r.",
      explain: `F = 9.0 × 10⁹ × ${q1} × 10⁻⁶ × ${Math.abs(q2)} × 10⁻⁶ ÷ ${r / 100}² = ${nf(F, 2)} N, ${q2 > 0 ? "repulsive" : "attractive"}.`,
    });
  }
  if (kind === 1) {
    const F = pick([36, 72, 144]);
    const [a, b] = pick([[2, 1], [2, 2], [3, 1], [3, 3], [0.5, 1], [0.5, 2], [2, 4], [3, 2]]);
    const F2 = (F * b) / (a * a);
    return Q({
      key: `co-scale-${F}-${a}-${b}`,
      prompt: `Two charges attract with ${F} N. The distance is ${a === 0.5 ? "halved" : `multiplied by ${a}`} and one charge is ${b === 1 ? "unchanged" : `multiplied by ${b}`}. What is the new force, in N?`,
      ...kp(F2),
      unit: "N",
      hint: "F ∝ q₁q₂/r². Multiply by the charge factor and divide by the distance factor squared.",
      explain: `F' = ${F} × ${b} ÷ ${a}² = ${ds(F2)} N.`,
    });
  }
  if (kind === 2) {
    const k = rand(2, 5);
    const sign = pick([1, -1]);
    return Q({
      key: `co-third-${k}-${sign}`,
      prompt: `Charge A is ${k} times as big as charge B${sign < 0 ? ", and they have opposite signs" : ""}. How does the force on B compare with the force on A?`,
      visual: chargesV([{ sign: "+", x: -2, y: 0, q: 3, label: "A" }, { sign: sign > 0 ? "+" : "−", x: 2, y: 0, q: 1, label: "B" }], { forces: true, forceLabels: ["F_A", "?"] }),
      ...txt("Equal in size, opposite in direction", [`${k} times as big`, `1/${k} as big`, `${k * k} times as big`]),
      hint: "Coulomb forces come in Newton's-third-law pairs.",
      explain: `Each force is k|q_A q_B|/r², the same expression, so they're equal and opposite whatever the charges are.`,
    });
  }
  if (kind === 3) {
    const q = pick([1, 2, 3, 4]);
    const r = pick([0.1, 0.2, 0.3, 0.5]);
    const F = sig((KC * (q * 1e-6) ** 2) / (r * r), 2);
    return Q({
      key: `co-r-${q}-${r}`,
      prompt: `Two equal ${q} μC charges repel with ${nf(F, 2)} N. How far apart are they?`,
      ...vals(r, [r * r, Math.sqrt(r), r * 100], "m", 2),
      hint: "Rearrange: r = √(kq₁q₂/F).",
      explain: `r = √(9.0 × 10⁹ × (${q} × 10⁻⁶)² ÷ ${nf(F, 2)}) ≈ ${nf(r, 2)} m.`,
    });
  }
  if (kind === 4) {
    const a = rand(1, 5);
    const b = rand(2, 9);
    return Q({
      key: `co-compare-${a}-${b}`,
      prompt: `q₁ = +${a} μC and q₂ = −${a * b} μC. Which feels the larger electric force?`,
      visual: chargesV([{ sign: "+", x: -2, y: 0, q: 1, label: "q₁" }, { sign: "−", x: 2, y: 0, q: 3, label: "q₂" }], { forces: true }),
      ...txt("Neither: the forces are equal in size", ["q₂, the larger charge", "q₁, the smaller charge", "Neither: there is no force"]),
      hint: "Think Newton's third law, not which charge is bigger.",
      explain: `The pair attracts with one force k|q₁q₂|/r² on each, equal and opposite, even though q₂ is ${b} times as big.`,
    });
  }
  const r = 5.3e-11;
  const ask = pick(["F", "ratio"] as const);
  const Fe = (KC * QE * QE) / (r * r);
  const Fg = (6.67e-11 * ME * MP) / (r * r);
  return Q({
    key: `co-hydrogen-${ask}-${rand(0, 5)}`,
    prompt:
      ask === "F"
        ? "In hydrogen the electron and proton are 5.3 × 10⁻¹¹ m apart. What is the electric force between them?"
        : "In hydrogen, about how many times stronger is the electric attraction than the gravitational attraction between the electron and proton?",
    ...(ask === "F" ? vals(Fe, [(KC * QE * QE) / r, (KC * QE) / (r * r), Fg], "N", 2, sci) : vals(Fe / Fg, [Fe / Fg / 1e10, Fe / Fg / 1e20, 1e10], "", 1, sci)),
    hint: ask === "F" ? "F = ke²/r² with e = 1.6 × 10⁻¹⁹ C." : "F_e = ke²/r² and F_g = Gmₑmₚ/r². The r² cancels in the ratio.",
    explain: ask === "F" ? `F = 9.0 × 10⁹ × (1.6 × 10⁻¹⁹)² ÷ (5.3 × 10⁻¹¹)² ≈ ${sci(Fe, 2)} N.` : `F_e/F_g = ke²/(Gmₑmₚ) ≈ ${sci(Fe / Fg, 1)}. Gravity is negligible inside atoms.`,
  });
}

/** PHYS.10.1 — superposition: net force from several charges. */
export function netForce(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const qa = rand(1, 4) * pick([1, -1]);
    const qb = rand(1, 3) * pick([1, -1]);
    const qc = rand(1, 4) * pick([1, -1]);
    const d1 = pick([0.1, 0.2, 0.3]);
    const d2 = pick([0.1, 0.2, 0.3]);
    // Force on B (middle): + is to the right.
    const fA = (KC * qa * qb * 1e-12) / (d1 * d1); // positive = repel = B pushed right
    const fC = (-KC * qc * qb * 1e-12) / (d2 * d2); // repel pushes B left
    const net = fA + fC;
    if (Math.abs(net) < 0.05) return netForce();
    const span = d1 + d2;
    const gx = (x: number) => dp(-3.5 + (7 * x) / span, 1);
    return Q({
      key: `nf-line-${qa}-${qb}-${qc}-${d1}-${d2}`,
      prompt: `A (${μC(qa)}) is ${d1 * 100} cm left of B (${μC(qb)}), and C (${μC(qc)}) is ${d2 * 100} cm right of B. What is the net force on B?`,
      visual: chargesV([
        { sign: sgn(qa), x: gx(0), y: 0, q: qMag(qa), label: "A" },
        { sign: sgn(qb), x: gx(d1), y: 0, q: qMag(qb), label: "B" },
        { sign: sgn(qc), x: gx(span), y: 0, q: qMag(qc), label: "C" },
      ]),
      ...vals(net, [fA - fC, (Math.abs(fA) + Math.abs(fC)) * Math.sign(net), -net], "", 2, dirFmt("N")),
      hint: "Find each force with F = kq₁q₂/r², decide its direction (like charges repel), then add them as signed numbers.",
      explain: `From A: ${dirFmt("N")(fA, 2)}. From C: ${dirFmt("N")(fC, 2)}. Net: ${dirFmt("N")(net, 2)}.`,
    });
  }
  if (kind === 1) {
    const ratio = pick([1, 4, 9]);
    const q1 = rand(1, 3);
    const d = pick([30, 60, 90, 120]);
    const x = d / (1 + Math.sqrt(ratio));
    return Q({
      key: `nf-zero-${ratio}-${q1}-${d}`,
      prompt: `+${q1} μC sits at x = 0 and +${q1 * ratio} μC at x = ${d} cm. Where between them would a third charge feel no net force? (x in cm)`,
      visual: chargesV([{ sign: "+", x: -3, y: 0, q: 1, label: `${q1} μC` }, { sign: "+", x: 3, y: 0, q: ratio === 1 ? 1 : ratio === 4 ? 2 : 3, label: `${q1 * ratio} μC` }], { distance: d, unit: "cm" }),
      ...kp(x),
      unit: "cm",
      hint: "The two pushes balance where kq₁/x² = kq₂/(d − x)². Take square roots.",
      explain: `(d − x)/x = √${ratio} = ${Math.sqrt(ratio)}, so x = ${d}/(1 + ${Math.sqrt(ratio)}) = ${ds(x)} cm, closer to the smaller charge.`,
    });
  }
  if (kind === 2) {
    const [F1, F2] = pick([[3, 4], [6, 8], [5, 12], [0.3, 0.4], [1.2, 0.9], [0.5, 1.2]]);
    const Fn = Math.hypot(F1, F2);
    return Q({
      key: `nf-perp-${F1}-${F2}`,
      prompt: `Charge A pushes q with ${F1} N to the right; charge B pulls q with ${F2} N straight up. What is the size of the net force on q?`,
      visual: { kind: "phys-forces", object: "dot", objectLabel: "q", forces: [{ dir: 0, size: F1, label: F1 }, { dir: 90, size: F2, label: F2 }, { dir: (Math.atan2(F2, F1) * 180) / Math.PI, size: Fn, label: "?", dashed: true, colour: "grape" }] },
      ...kp(Fn),
      unit: "N",
      hint: "Forces are vectors. Perpendicular forces combine with Pythagoras.",
      explain: `F = √(${F1}² + ${F2}²) = ${ds(Fn)} N, at ${Math.round((Math.atan2(F2, F1) * 180) / Math.PI)}° above the +x direction.`,
    });
  }
  const s = pick([
    { t: "Four equal positive charges sit at the corners of a square. A fifth charge is at the center.", a: "Zero" },
    { t: "Equal positive charges sit at x = −d and x = +d. A positive charge is at the origin.", a: "Zero" },
    { t: "+q sits at x = −d and −q at x = +d. A positive charge is at the origin.", a: "Toward +x (toward the −q)" },
    { t: "−q sits at x = −d and +q at x = +d. A positive charge is at the origin.", a: "Toward −x (toward the −q)" },
  ]);
  return Q({
    key: `nf-sym-${s.t}`,
    prompt: `${s.t} What is the net force on the middle charge?`,
    ...txt(s.a, ["Zero", "Toward +x (toward the −q)", "Toward −x (toward the −q)", "Straight up"].filter((x) => x !== s.a)),
    hint: "Draw each force on the middle charge (repel or attract), then look for forces that cancel.",
    explain: s.a === "Zero" ? "By symmetry the pushes are equal and opposite, so they cancel." : "The + charge pushes it away and the − charge pulls it toward itself: both point toward the −q, so they add.",
  });
}

/** PHYS.10.1, PHYS.10.3 — Do it: draw the direction of the electric force or field. */
export function forceDoIt(): Question {
  const kind = rand(0, 2);
  const start = (ans: number) => (ans + pick([90, 135, 180])) % 360;
  if (kind === 0) {
    const s1 = pick([1, -1]);
    const s2 = pick([1, -1]);
    const test = pick([1, -1]);
    // Source 1 at left of the test charge, source 2 above it.
    const f1 = s1 * test > 0 ? 0 : 180; // repel → away from source on the left → right
    const f2 = s2 * test > 0 ? 270 : 90;
    const net = (Math.atan2(Math.sin(f1 * RAD) + Math.sin(f2 * RAD), Math.cos(f1 * RAD) + Math.cos(f2 * RAD)) / RAD + 360) % 360;
    const ans = Math.round(net);
    return Q({
      key: `fd-two-${s1}-${s2}-${test}`,
      prompt: `Charges A and B have the same size and are the same distance from q (${test > 0 ? "+" : "−"}). Drag the arrow to show the direction of the net force on q.`,
      visual: chargesV([
        { sign: s1 > 0 ? "+" : "−", x: -3, y: -1, q: 2, label: "A" },
        { sign: s2 > 0 ? "+" : "−", x: 0, y: 2, q: 2, label: "B" },
        { sign: test > 0 ? "+" : "−", x: 0, y: -1, q: 1, label: "q" },
      ]),
      needsVisual: true,
      ...act({ kind: "phys-forceArrows", object: "dot", directions: 8, maxSize: 1, arrows: [{ label: "F", dir: start(ans), size: 1, answer: { dir: ans, size: 1 } }], check: "exact" }, ans),
      hint: "Find each force first: like charges repel, unlike attract. Equal-sized perpendicular forces add to a diagonal.",
      explain: `A pushes or pulls q ${f1 === 0 ? "right" : "left"}; B ${f2 === 270 ? "down" : "up"}. Equal sizes, so the net force points diagonally ${f2 === 90 ? "up" : "down"} and to the ${f1 === 0 ? "right" : "left"}.`,
    });
  }
  if (kind === 1) {
    const Edir = pick([0, 90, 180, 270]);
    const particle = pick(["electron", "proton"] as const);
    const ans = particle === "proton" ? Edir : (Edir + 180) % 360;
    return Q({
      key: `fd-field-${Edir}-${particle}`,
      prompt: `The electric field E points as shown. Drag the arrow to show the force on ${particle === "proton" ? "a proton" : "an electron"} placed in it.`,
      ...act({ kind: "phys-forceArrows", object: "dot", directions: 4, maxSize: 1, given: [{ dir: Edir, size: 1, label: "E", colour: "grape" }], arrows: [{ label: "F", dir: (ans + 90) % 360, size: 1, answer: { dir: ans, size: 1 } }], check: "exact" }, ans),
      hint: "F = qE. A positive charge is pushed along E; a negative charge the opposite way.",
      explain: `${particle === "proton" ? "The proton is positive, so F points along E." : "The electron is negative, so F points opposite to E."}`,
    });
  }
  const src = pick([1, -1]);
  const [where, away] = pick([["to the right of", 0], ["to the left of", 180], ["above", 90], ["below", 270], ["up and to the right of", 45], ["up and to the left of", 135], ["down and to the left of", 225], ["down and to the right of", 315]] as const);
  const ans = src > 0 ? away : (away + 180) % 360;
  return Q({
    key: `fd-pointfield-${src}-${away}`,
    prompt: `Point P is ${where} the charge Q shown. Drag the arrow to show the direction of the electric field at P.`,
    visual: chargesV([{ sign: src > 0 ? "+" : "−", x: 0, y: 0, q: 2, label: "Q" }], { lines: true }),
    needsVisual: true,
    ...act({ kind: "phys-forceArrows", object: "📍", directions: 8, maxSize: 1, arrows: [{ label: "E", dir: start(ans), size: 1, answer: { dir: ans, size: 1 } }], check: "exact" }, ans),
    hint: "The field is the direction of the force on a small positive test charge: away from +, toward −.",
    explain: `A positive test charge at P would be ${src > 0 ? "pushed away from" : "pulled toward"} Q, so E points ${src > 0 ? "away from" : "toward"} Q.`,
  });
}

/** PHYS.10.3 — electric fields of point charges and between plates. */
export function efield(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const q = pick([2, 4, 5, 8]);
    const r = pick([0.1, 0.2, 0.3, 0.5]);
    const E = (KC * q * 1e-9) / (r * r);
    return Q({
      key: `ef-point-${q}-${r}`,
      prompt: `What is the electric field strength ${r * 100} cm from a ${q} nC point charge?`,
      ...vals(E, [E * r, E / 1e3, E * r * r * 4], "N/C", 2),
      hint: "E = kq/r², with q in coulombs (1 nC = 10⁻⁹ C) and r in meters.",
      explain: `E = 9.0 × 10⁹ × ${q} × 10⁻⁹ ÷ ${r}² = ${nf(E, 2)} N/C, pointing away from the charge.`,
    });
  }
  if (kind === 1) {
    const E = pick([2, 5, 8]) * 10 ** pick([3, 4]);
    const F = QE * E;
    const a = F / ME;
    const ask = pick(["F", "a"] as const);
    return Q({
      key: `ef-electron-${E}-${ask}`,
      prompt: ask === "F" ? `What force does an electron feel in a ${sci(E, 1)} N/C field?` : `What is the acceleration of an electron in a ${sci(E, 1)} N/C field? (mₑ = 9.11 × 10⁻³¹ kg)`,
      ...(ask === "F" ? vals(F, [E / QE, F * 1e3, QE / E], "N", 2, sci) : vals(a, [F / MP, (E * ME) / QE, a / 1e3], "m/s²", 2, sci)),
      hint: ask === "F" ? "F = qE." : "F = qE, then a = F/m.",
      explain: ask === "F" ? `F = 1.6 × 10⁻¹⁹ × ${sci(E, 1)} = ${sci(F, 2)} N, opposite to E.` : `a = eE/mₑ = ${sci(F, 2)} ÷ 9.11 × 10⁻³¹ ≈ ${sci(a, 2)} m/s².`,
    });
  }
  if (kind === 2) {
    const qa = pick([1, 2, 3]);
    let qb = pick([1, 2, 3]);
    while (qb === qa) qb = pick([1, 2, 3]);
    const sa = pick(["+", "−"] as const);
    const sb = pick(["+", "−"] as const);
    const ask = pick(["bigger", "signA"] as const);
    return Q({
      key: `ef-lines-${qa}-${qb}-${sa}-${sb}-${ask}`,
      prompt: ask === "bigger" ? "The field lines of two charges are drawn. Which charge has the larger magnitude?" : "The field lines of two charges are drawn. What is the sign of charge A?",
      visual: chargesV([{ sign: sa, x: -2, y: 0, q: qa, label: "A" }, { sign: sb, x: 2, y: 0, q: qb, label: "B" }], { lines: true }),
      needsVisual: true,
      ...(ask === "bigger" ? txt(qa > qb ? "A" : "B", [qa > qb ? "B" : "A", "They are equal"], 3) : txt(sa === "+" ? "positive" : "negative", [sa === "+" ? "negative" : "positive", "neutral"], 3)),
      hint: ask === "bigger" ? "The number of lines leaving or entering a charge is proportional to its size." : "Field lines start on positive charges and end on negative ones.",
      explain: ask === "bigger" ? `More lines touch ${qa > qb ? "A" : "B"}, so it has the larger charge.` : `Lines ${sa === "+" ? "leave" : "enter"} A, so A is ${sa === "+" ? "positive" : "negative"}.`,
    });
  }
  if (kind === 3) {
    const q = pick([1, 2, 4]);
    const d = pick([0.2, 0.4, 0.6]);
    const E = (2 * KC * q * 1e-9) / ((d / 2) ** 2);
    return Q({
      key: `ef-mid-${q}-${d}`,
      prompt: `+${q} nC is at x = 0 and −${q} nC at x = ${d} m. What is the electric field at the midpoint?`,
      visual: chargesV([{ sign: "+", x: -3, y: 0, q: 2 }, { sign: "−", x: 3, y: 0, q: 2 }], { lines: true, distance: d }),
      ...vals(E, [0, E / 2, -E, (2 * KC * q * 1e-9) / (d * d)], "", 2, dirFmt("N/C", "in the +x direction", "in the −x direction")),
      hint: "Each charge makes kq/(d/2)² there. Away from +, toward −: do they point the same way?",
      explain: `Both fields point toward the −charge (+x), so they add: 2 × kq/(${d / 2})² = ${nf(E, 2)} N/C in +x.`,
    });
  }
  if (kind === 4) {
    const V = pick([100, 150, 300, 600, 900, 1200]);
    const d = pick([2, 3, 5, 10]);
    const E = V / (d / 1000);
    return Q({
      key: `ef-plates-${V}-${d}`,
      prompt: `Parallel plates ${d} mm apart have a ${V} V potential difference. What is the field between them?`,
      ...vals(E, [V / d, V * d, V / (d / 100)], "V/m", 2),
      hint: "Between parallel plates the field is uniform: E = ΔV/d, with d in meters.",
      explain: `E = ${V} ÷ ${d / 1000} = ${nf(E, 2)} V/m (1 V/m = 1 N/C), from + plate to − plate.`,
    });
  }
  const k = pick([2, 3, 0.5]);
  return Q({
    key: `ef-scale-${k}`,
    prompt: `The field at distance r from a point charge is E. What is it at ${k === 0.5 ? "half that distance" : `${k}r`}?`,
    ...txt(k === 0.5 ? "4E" : `E/${k * k}`, k === 0.5 ? ["2E", "E/4", "E/2"] : [`E/${k}`, `${k * k}E`, `${k}E`]),
    hint: "E = kq/r²: an inverse-square law.",
    explain: `E ∝ 1/r²: changing r by ${k} changes E by 1/${k * k === 0.25 ? "(1/4)" : k * k}, giving ${k === 0.5 ? "4E" : `E/${k * k}`}.`,
  });
}

/** PHYS.10.3, PHYS.10.7 — charged particles moving in uniform fields. */
export function chargeMotion(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const E = pick([1, 2, 5]) * 10 ** pick([3, 4]);
    const t = pick([1, 2, 5]) * 1e-6;
    const v = ((QE * E) / MP) * t;
    return Q({
      key: `cm-proton-${E}-${t}`,
      prompt: `A proton starts at rest in a uniform ${sci(E, 1)} N/C field. How fast is it moving after ${t * 1e6} μs? (mₚ = 1.67 × 10⁻²⁷ kg)`,
      ...vals(v, [((QE * E) / ME) * t, (QE * E * t) / MP / 1e6, v * 1e6], "m/s", 2, sci),
      hint: "a = qE/m (constant), then v = at.",
      explain: `a = 1.6 × 10⁻¹⁹ × ${sci(E, 1)} ÷ 1.67 × 10⁻²⁷ ≈ ${sci((QE * E) / MP, 2)} m/s², so v = at ≈ ${sci(v, 2)} m/s.`,
    });
  }
  if (kind === 1) {
    const top = pick(["+", "−"] as const);
    const p = pick(["electron", "proton", "neutron"] as const);
    const ans = p === "neutron" ? "Straight on" : (p === "electron") === (top === "+") ? "Up, curving toward the top plate" : "Down, curving toward the bottom plate";
    return Q({
      key: `cm-beam-${top}-${p}`,
      prompt: `A beam of ${p}s enters, moving right, between plates; the top plate is ${top === "+" ? "positive" : "negative"}. Which way does the beam bend?`,
      ...txt(ans, ["Up, curving toward the top plate", "Down, curving toward the bottom plate", "Straight on", "Back to the left"].filter((x) => x !== ans)),
      hint: "E points from + plate to − plate. Positive charges feel force along E; negative charges against it.",
      explain: p === "neutron" ? "Neutrons have no charge, so the field doesn't push them." : `E points ${top === "+" ? "down" : "up"}; the ${p} is ${p === "proton" ? "positive, pushed along E" : "negative, pushed against E"}: ${ans.toLowerCase()}, on a parabola like a projectile.`,
    });
  }
  if (kind === 2) {
    const n = rand(1, 6);
    const E = pick([2, 3, 4, 5]) * 1e4;
    const m = (n * QE * E) / 9.8;
    return Q({
      key: `cm-millikan-${n}-${E}`,
      prompt: `An oil drop of mass ${sci(m, 3)} kg hangs still in an upward ${sci(E, 1)} N/C field. How many elementary charges (e) does it carry?`,
      ...kp(n),
      hint: "Hanging still: qE = mg, so q = mg/E. Then divide by e = 1.6 × 10⁻¹⁹ C.",
      explain: `q = ${sci(m, 3)} × 9.8 ÷ ${sci(E, 1)} = ${sci(n * QE, 2)} C = ${n} × e. (This is how Millikan showed charge is quantized.)`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "Compare the forces on a proton and an electron in the same field.", a: "Equal in size, opposite in direction" },
      { q: "Compare the accelerations of a proton and an electron in the same field.", a: "The electron's is about 1800 times bigger" },
    ]);
    return Q({
      key: `cm-pe-${s.q}`,
      prompt: s.q,
      ...txt(s.a, ["Equal in size, opposite in direction", "The electron's is about 1800 times bigger", "The proton's is about 1800 times bigger", "Equal in size and direction"].filter((x) => x !== s.a)),
      hint: "F = qE: same |q|, so same force size. a = F/m, and mₚ ≈ 1836 mₑ.",
      explain: "Both have charge of size e, so |F| = eE for each, in opposite directions. The electron is ~1836 times lighter, so it accelerates ~1836 times more.",
    });
  }
  const q = rand(1, 5);
  const E = pick([200, 500, 1000, 2000]);
  const d = pick([0.1, 0.2, 0.5]);
  const W = q * 1e-6 * E * d;
  return Q({
    key: `cm-work-${q}-${E}-${d}`,
    prompt: `A +${q} μC charge moves ${d} m along a uniform ${E} N/C field. How much work does the field do on it?`,
    ...vals(W, [q * E * d, (q * 1e-6 * E) / d, W * 1e3], "J", 2, sci),
    hint: "The force qE is constant and along the motion, so W = qEd.",
    explain: `W = ${q} × 10⁻⁶ × ${E} × ${d} = ${sci(W, 2)} J (positive: the charge moves the way the field pushes it).`,
  });
}

/** PHYS.10.4 — electric potential energy of charge systems. */
export function potentialEnergy(): Question {
  const kind = rand(0, 5);
  if (kind === 0 || kind === 1) {
    const q1 = rand(1, 6) * pick([1, -1]);
    const q2 = rand(1, 6) * pick([1, -1]);
    const r = pick([0.1, 0.2, 0.3, 0.5]);
    const U = (KC * q1 * q2 * 1e-12) / r;
    return Q({
      key: `pe-pair-${kind}-${q1}-${q2}-${r}`,
      prompt:
        kind === 0
          ? `What is the electric potential energy of ${μC(q1)} and ${μC(q2)} charges ${r * 100} cm apart?`
          : `How much work must an outside agent do to bring ${μC(q1)} from very far away to ${r * 100} cm from ${μC(q2)} (both start at rest and end at rest)?`,
      ...vals(U, [-U, U / r, (KC * q1 * q2 * 1e-12) / (r * 100)], "J", 2),
      hint: "U = kq₁q₂/r (no square), keeping the signs. The work to assemble the pair equals the U it ends with.",
      explain: `U = 9.0 × 10⁹ × (${ds(q1)} × 10⁻⁶)(${ds(q2)} × 10⁻⁶) ÷ ${r} = ${nf(U, 2)} J. ${U < 0 ? "Negative: the charges attract, so the agent holds them back." : "Positive: like charges have to be pushed together."}`,
    });
  }
  if (kind === 2) {
    const [a, b, c] = pick([[1, 1, 1], [1, 1, -1], [2, -1, -1], [2, 1, -1], [3, 1, 1], [2, 2, -1]]);
    const total = a * b + b * c + a * c;
    const lab = (n: number) => (n === 0 ? "0" : `${n === 1 ? "" : n === -1 ? "−" : ds(n)}kq²/s`);
    return Q({
      key: `pe-triangle-${a}-${b}-${c}`,
      prompt: `Charges ${[a, b, c].map((x) => `${x > 0 ? "+" : "−"}${Math.abs(x) === 1 ? "" : Math.abs(x)}q`).join(", ")} sit at the corners of an equilateral triangle of side s. What is the total electric potential energy?`,
      ...txt(lab(total), [lab(Math.abs(a * b) + Math.abs(b * c) + Math.abs(a * c)), lab(-total || 2), lab(total + 1)].filter((x) => x !== lab(total))),
      hint: "Add kqᵢqⱼ/s for each of the three pairs, with signs.",
      explain: `Pairs: ${ds(a * b)} + ${ds(b * c)} + ${ds(a * c)} = ${ds(total)}, so U = ${lab(total)}.`,
    });
  }
  if (kind === 3) {
    const like = pick([true, false]);
    return Q({
      key: `pe-graph-${like}`,
      prompt: "The graph shows the potential energy U of two charges against their separation r. If they are released from rest, what happens?",
      visual: plot([0, 5], [-6, 6], "r", "U", { curves: [{ fn: (r) => (like ? 3 / r : -3 / r), colour: "berry", label: "U" }] }),
      needsVisual: true,
      ...txt(like ? "They fly apart, gaining kinetic energy" : "They pull together, gaining kinetic energy", [like ? "They pull together, gaining kinetic energy" : "They fly apart, gaining kinetic energy", "They stay where they are", "They fly apart, losing kinetic energy"]),
      hint: "Systems move toward lower potential energy, turning U into kinetic energy.",
      explain: like ? "U is positive and falls as r grows (like charges), so they repel and speed up as they separate." : "U is negative and drops as r shrinks (unlike charges), so they attract and speed up as they approach.",
    });
  }
  if (kind === 4) {
    const s = pick([
      { q: "The potential energy of a pair of charges is negative. What does that tell you?", a: "They are opposite charges; energy must be added to pull them apart" },
      { q: "The potential energy of a pair of charges is positive. What does that tell you?", a: "They are like charges; they would speed up flying apart" },
    ]);
    return Q({
      key: `pe-sign-${s.a.slice(0, 10)}`,
      prompt: s.q,
      ...txt(s.a, ["They are opposite charges; energy must be added to pull them apart", "They are like charges; they would speed up flying apart", "The charges must be very far apart", "The system has negative mass"].filter((x) => x !== s.a)),
      hint: "U = kq₁q₂/r is zero at infinite separation. Its sign is the sign of q₁q₂.",
      explain: s.a,
    });
  }
  const q = rand(1, 4);
  const r = pick([0.1, 0.2, 0.3]);
  const U = (KC * q * q * 1e-12) / r;
  return Q({
    key: `pe-release-${q}-${r}`,
    prompt: `Two +${q} μC charges are held ${r * 100} cm apart, then released. What is their total kinetic energy once they are very far apart?`,
    ...vals(U, [U / 2, U / r, U * 2], "J", 2),
    hint: "Energy is conserved: the starting U all becomes kinetic energy (U → 0 at infinity).",
    explain: `K_total = U = kq²/r = 9.0 × 10⁹ × (${q} × 10⁻⁶)² ÷ ${r} = ${nf(U, 2)} J.`,
  });
}

/** PHYS.10.5 — electric potential and equipotentials. */
export function potential(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const q = rand(1, 9) * pick([1, -1]);
    const r = pick([0.1, 0.2, 0.3, 0.5]);
    const V = (KC * q * 1e-9) / r;
    return Q({
      key: `po-point-${q}-${r}`,
      prompt: `What is the electric potential ${r * 100} cm from a ${q > 0 ? "+" : "−"}${Math.abs(q)} nC point charge (zero far away)?`,
      ...vals(V, [-V, V / r, (KC * q * 1e-9) / (r * r)], "V", 2),
      hint: "V = kq/r: a scalar, with the sign of the charge, and only one power of r.",
      explain: `V = 9.0 × 10⁹ × ${ds(q)} × 10⁻⁹ ÷ ${r} = ${nf(V, 2)} V.`,
    });
  }
  if (kind === 1) {
    const q = pick([2, 4, 6]);
    const d = pick([0.2, 0.4, 0.6]);
    const same = pick([true, false]);
    const V = same ? (2 * KC * q * 1e-9) / (d / 2) : 0;
    return Q({
      key: `po-mid-${q}-${d}-${same}`,
      prompt: `+${q} nC is at x = 0 and ${same ? "+" : "−"}${q} nC at x = ${d} m. What is the potential at the midpoint?`,
      visual: chargesV([{ sign: "+", x: -3, y: 0, q: 2 }, { sign: same ? "+" : "−", x: 3, y: 0, q: 2 }], { lines: true, distance: d }),
      ...(same ? vals(V, [V / 2, (2 * KC * q * 1e-9) / ((d / 2) ** 2), V * 2], "V", 2) : txt("0 V", [`${nf((2 * KC * q * 1e-9) / (d / 2), 2)} V`, `${nf((KC * q * 1e-9) / (d / 2), 2)} V`, `${nf((2 * KC * q * 1e-9) / ((d / 2) ** 2), 2)} V`])),
      hint: "Potentials are scalars: add kq/r for each charge with its sign. (The field may not be zero even if V is!)",
      explain: same ? `V = 2 × kq/(d/2) = 2 × 9.0 × 10⁹ × ${q} × 10⁻⁹ ÷ ${d / 2} = ${nf(V, 2)} V.` : "The +q and −q contributions are equal and opposite, so V = 0 there, even though E is not zero.",
    });
  }
  if (kind === 2) {
    const q = rand(1, 5) * pick([1, -1]);
    const VA = pick([50, 100, 200, 300]);
    const VB = pick([0, 100, 400, 500, 50].filter((v) => v !== VA));
    const W = q * (VB - VA);
    const ask = pick(["field", "agent"] as const);
    return Q({
      key: `po-work-${q}-${VA}-${VB}-${ask}`,
      prompt: `A ${μC(q)} charge moves from A (${VA} V) to B (${VB} V). How much work does ${ask === "field" ? "the electric field" : "an outside agent (moving it slowly)"} do, in μJ?`,
      ...kps(ask === "field" ? -W : W),
      unit: "μJ",
      hint: "ΔU = qΔV. The field does W = −ΔU; an agent moving it slowly does W = +ΔU.",
      explain: `ΔU = q(V_B − V_A) = ${ds(q)} × ${ds(VB - VA)} = ${ds(W)} μJ, so W_${ask} = ${ds(ask === "field" ? -W : W)} μJ.`,
    });
  }
  if (kind === 3) {
    const xs = [0, 2, 4, 6];
    const Vs = [pick([400, 500, 600]), 0, 0, 0];
    const drops = shuffle([0, pick([50, 100]), pick([150, 200])]);
    for (let i = 1; i < 4; i++) Vs[i] = Vs[i - 1] - drops[i - 1];
    const regions = ["A", "B", "C"];
    const ask = pick(["strongest", "zero"] as const);
    const iMax = drops.indexOf(Math.max(...drops));
    const iZero = drops.indexOf(0);
    const ans = regions[ask === "strongest" ? iMax : iZero];
    return Q({
      key: `po-vx-${Vs.join("-")}-${ask}`,
      prompt: ask === "strongest" ? "Electric potential along a line. In which region (A: 0–2, B: 2–4, C: 4–6 cm) is the field strongest?" : "Electric potential along a line. In which region (A: 0–2, B: 2–4, C: 4–6 cm) is the electric field zero?",
      visual: plot([0, 6], [0, 700], "x (cm)", "V (V)", { lines: xs.slice(0, 3).map((x, i) => ({ from: [x, Vs[i]] as [number, number], to: [xs[i + 1], Vs[i + 1]] as [number, number], colour: "berry" as Colour })), points: xs.map((x, i) => ({ x, y: Vs[i] })) }),
      needsVisual: true,
      ...txt(ans, regions.filter((r) => r !== ans), 3),
      hint: "E = −ΔV/Δx: the steeper the V graph, the stronger the field. Flat means E = 0.",
      explain: `Region ${ans} ${ask === "strongest" ? `has the steepest slope (${Math.max(...drops)} V over 2 cm = ${Math.max(...drops) * 50} V/m)` : "is flat, so E = 0 there"}.`,
    });
  }
  if (kind === 4) {
    const s = pick([
      { q: "How are electric field lines arranged relative to equipotential lines?", a: "Perpendicular, pointing toward lower potential" },
      { q: "How much work does the field do moving a charge along an equipotential?", a: "Zero" },
      { q: "Equipotential lines are drawn every 10 V. Where is the field strongest?", a: "Where the lines are closest together" },
    ]);
    return Q({
      key: `po-eq-${s.q}`,
      prompt: s.q,
      ...txt(s.a, ["Perpendicular, pointing toward lower potential", "Zero", "Where the lines are closest together", "Parallel to them", "Where the lines are farthest apart"].filter((x) => x !== s.a)),
      hint: "Along an equipotential ΔV = 0, so no work is done; E always points downhill in V, perpendicular to equipotentials.",
      explain: `${s.a}. E = −ΔV/Δx: closely spaced equipotentials mean V changes fast, so E is strong.`,
    });
  }
  const E = pick([100, 200, 500, 1000]);
  const d = pick([0.02, 0.05, 0.1, 0.2]);
  return Q({
    key: `po-uniform-${E}-${d}`,
    prompt: `In a uniform ${E} V/m field, point B is ${d * 100} cm from A in the direction of the field. What is V_B − V_A?`,
    ...kps(-E * d),
    unit: "V",
    hint: "Potential drops along the field direction: ΔV = −Ed.",
    explain: `ΔV = −${E} × ${d} = ${ds(-E * d)} V: moving with the field takes you to lower potential.`,
  });
}

/** PHYS.10.7, PHYS.10.4 — energy conservation for charges moving through potential differences. */
export function energyConservation(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const V = pick([10, 50, 100, 200, 500, 1000]);
    const v = Math.sqrt((2 * QE * V) / ME);
    return Q({
      key: `ec-electron-${V}`,
      prompt: `An electron starts from rest and is accelerated through ${V} V. How fast is it going?`,
      ...vals(v, [Math.sqrt((QE * V) / ME), (2 * QE * V) / ME, Math.sqrt((2 * QE * V) / MP)], "m/s", 2, sci),
      hint: "Energy: eΔV = ½mv², so v = √(2eΔV/m).",
      explain: `v = √(2 × 1.6 × 10⁻¹⁹ × ${V} ÷ 9.11 × 10⁻³¹) ≈ ${sci(v, 2)} m/s.`,
    });
  }
  if (kind === 1) {
    const p = pick([{ n: "proton", q: 1 }, { n: "alpha particle (charge +2e)", q: 2 }, { n: "electron", q: 1 }, { n: "helium ion (charge +e)", q: 1 }]);
    const V = pick([100, 250, 500, 1500, 2000]);
    return Q({
      key: `ec-ev-${p.n}-${V}`,
      prompt: `A${/^[aeiou]/.test(p.n) ? "n" : ""} ${p.n} accelerates from rest through ${V} V. How much kinetic energy does it gain, in electron volts?`,
      ...kp(p.q * V),
      unit: "eV",
      hint: "A charge q falling through ΔV gains K = |q|ΔV. One electron volt is the energy of charge e through 1 V.",
      explain: `K = ${p.q}e × ${V} V = ${p.q * V} eV, whatever the mass.`,
    });
  }
  if (kind === 2) {
    const Q1 = pick([2, 4, 5, 8]);
    const K = pick([1, 2, 4]) * 1e6 * QE;
    const r = (KC * Q1 * 1e-6 * QE) / K;
    return Q({
      key: `ec-approach-${Q1}-${K}`,
      prompt: `A proton with ${dp(K / QE / 1e6)} MeV of kinetic energy heads straight for a fixed +${Q1} μC charge from far away. How close does it get?`,
      ...vals(r, [Math.sqrt(r), r * 2, r / 1e6], "m", 2, sci),
      hint: "At closest approach it stops: all K has become U = kQe/r.",
      explain: `r = kQe/K = 9.0 × 10⁹ × ${Q1} × 10⁻⁶ × 1.6 × 10⁻¹⁹ ÷ ${sci(K, 2)} J ≈ ${sci(r, 2)} m.`,
    });
  }
  if (kind === 3) {
    const V = pick([100, 500, 1000]);
    return Q({
      key: `ec-ratio-${V}`,
      prompt: `An electron and a proton each accelerate from rest through ${V} V. About how many times faster is the electron?`,
      ...nums(43, [1836, 1, 18]),
      hint: "Both gain the same KE, eΔV. ½mv² equal means v ∝ 1/√m.",
      explain: "v_e/v_p = √(mₚ/mₑ) = √1836 ≈ 43.",
    });
  }
  const VA = pick([0, 100, 200, 300]);
  const VB = pick([0, 100, 200, 300, 400].filter((v) => v !== VA));
  const p = pick(["electron", "proton"] as const);
  const dK = p === "electron" ? VB - VA : VA - VB;
  return Q({
    key: `ec-dk-${VA}-${VB}-${p}`,
    prompt: `A${p === "electron" ? "n" : ""} ${p} moves (only electric force acting) from a point at ${VA} V to a point at ${VB} V. What is its change in kinetic energy, in eV?`,
    ...kps(dK),
    unit: "eV",
    hint: "ΔK = −ΔU = −qΔV. An electron has q = −e; a proton q = +e.",
    explain: `ΔK = −q(V_B − V_A) = −(${p === "electron" ? "−" : "+"}e)(${ds(VB - VA)} V) = ${ds(dK)} eV. ${p === "electron" ? "Electrons speed up moving to higher potential." : "Protons speed up moving to lower potential."}`,
  });
}

/** PHYS.10.6 — parallel-plate capacitors: C, Q, U, and changing d or adding a dielectric. */
export function capacitors(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const A = pick([0.01, 0.02, 0.05, 0.1]);
    const d = pick([0.5, 1, 2]);
    const Cp = (EPS0 * A) / (d / 1000);
    return Q({
      key: `cap-c-${A}-${d}`,
      prompt: `A parallel-plate capacitor has plates of area ${A} m², ${d} mm apart (air). What is its capacitance?`,
      ...vals(Cp, [(EPS0 * A) / d, (EPS0 * d) / 1000 / A, Cp * 1e3], "F", 2, sci),
      hint: "C = ε₀A/d with ε₀ = 8.85 × 10⁻¹² C²/(N·m²) and d in meters.",
      explain: `C = 8.85 × 10⁻¹² × ${A} ÷ ${d / 1000} = ${sci(Cp, 2)} F (about ${nf(Cp * 1e12, 2)} pF).`,
    });
  }
  if (kind === 1) {
    const Cu = pick([2, 5, 10, 20, 47, 100]);
    const V = pick([3, 6, 9, 12, 20]);
    return Q({
      key: `cap-q-${Cu}-${V}`,
      prompt: `A ${Cu} μF capacitor is connected to a ${V} V battery. How much charge is on each plate, in μC?`,
      visual: { kind: "phys-circuit", top: [{ part: "cell", label: V }, { part: "switch", closed: true }], bottom: [{ part: "resistor" }, { part: "capacitor", label: Cu, across: "?" }] },
      ...kp(Cu * V),
      unit: "μC",
      hint: "Fully charged, the capacitor has the battery's voltage across it. Q = CV.",
      explain: `Q = ${Cu} μF × ${V} V = ${Cu * V} μC (+ on one plate, − on the other).`,
    });
  }
  if (kind === 2) {
    const Cu = pick([2, 4, 10, 20, 50]);
    const V = pick([5, 10, 12, 20, 100]);
    const U = 0.5 * Cu * 1e-6 * V * V;
    return Q({
      key: `cap-u-${Cu}-${V}`,
      prompt: `How much energy is stored in a ${Cu} μF capacitor charged to ${V} V?`,
      ...vals(U, [Cu * 1e-6 * V * V, 0.5 * Cu * 1e-6 * V, 0.5 * Cu * V * V], "J", 2),
      hint: "U = ½CV² (or ½QV). Use C in farads.",
      explain: `U = ½ × ${Cu} × 10⁻⁶ × ${V}² = ${nf(U, 2)} J.`,
    });
  }
  if (kind === 3) {
    const connected = pick([true, false]);
    const change = pick(["double", "halve"] as const);
    const what = pick(["C", "Q", "V", "U", "E"] as const);
    // d doubled → C halves. Connected: V same, Q halves, U halves, E halves. Isolated: Q same, V doubles, U doubles, E same.
    const f = change === "double" ? 2 : 0.5;
    const factor: Record<string, number> = connected ? { C: 1 / f, Q: 1 / f, V: 1, U: 1 / f, E: 1 / f } : { C: 1 / f, Q: 1, V: f, U: f, E: 1 };
    const word = (x: number) => (x === 1 ? "stays the same" : x === 2 ? "doubles" : "halves");
    const name = { C: "capacitance", Q: "charge", V: "voltage", U: "stored energy", E: "field between the plates" }[what];
    return Q({
      key: `cap-change-${connected}-${change}-${what}`,
      prompt: `A charged parallel-plate capacitor ${connected ? "stays connected to its battery" : "is disconnected from its battery"}. The plate gap is ${change === "double" ? "doubled" : "halved"}. What happens to the ${name}?`,
      ...txt(word(factor[what]), ["doubles", "halves", "stays the same", "quadruples"].filter((x) => x !== word(factor[what]))),
      hint: connected ? "Connected: the battery holds V fixed. C = ε₀A/d, Q = CV, U = ½CV², E = V/d." : "Disconnected: Q has nowhere to go, so Q is fixed. C = ε₀A/d, V = Q/C, U = Q²/(2C), E = V/d.",
      explain: `C ${word(1 / f)} (C ∝ 1/d). With ${connected ? "V" : "Q"} fixed, the ${name} ${word(factor[what])}.`,
    });
  }
  if (kind === 4) {
    const kappa = pick([2, 3, 4, 5]);
    const connected = pick([true, false]);
    const what = pick(["C", "Q", "V"] as const);
    const f: Record<string, number> = connected ? { C: kappa, Q: kappa, V: 1 } : { C: kappa, Q: 1, V: 1 / kappa };
    const w = (x: number) => (x === 1 ? "stays the same" : x > 1 ? `× ${x}` : `÷ ${1 / x}`);
    return Q({
      key: `cap-diel-${kappa}-${connected}-${what}`,
      prompt: `A dielectric with κ = ${kappa} fills a capacitor that is ${connected ? "connected to a battery" : "charged and isolated"}. How does ${{ C: "its capacitance", Q: "its charge", V: "its voltage" }[what]} change?`,
      ...txt(w(f[what]), ["stays the same", `× ${kappa}`, `÷ ${kappa}`, `× ${kappa * kappa}`].filter((x) => x !== w(f[what]))),
      hint: `The dielectric multiplies C by κ. Then ask what is held fixed: ${connected ? "V (battery)" : "Q (isolated)"}.`,
      explain: `C → κC = ${kappa}C. ${connected ? `V fixed, so Q = CV goes up ×${kappa}.` : `Q fixed, so V = Q/C falls ÷${kappa}.`}`,
    });
  }
  const R1 = pick([2, 4, 6]);
  const V = pick([6, 9, 12]);
  const Cu = pick([5, 10, 20]);
  return Q({
    key: `cap-circuit-${R1}-${V}-${Cu}`,
    prompt: `The switch has been closed for a long time. What is the voltage across the ${Cu} μF capacitor?`,
    visual: { kind: "phys-circuit", top: [{ part: "cell", label: V }, { part: "switch", closed: true }], bottom: [{ part: "resistor", label: R1 }, { part: "capacitor", label: Cu, across: "?" }] },
    needsVisual: true,
    ...kp(V),
    unit: "V",
    hint: "A fully charged capacitor passes no current. With no current, how much voltage drops across the resistor?",
    explain: `No current flows, so V_R = IR = 0 and the capacitor has the full ${V} V across it (Q = ${Cu * V} μC).`,
  });
}

/** PHYS.10.6 — capacitors in series and parallel. */
export function capCombos(): Question {
  const kind = rand(0, 4);
  const pairs: [number, number][] = [[2, 2], [3, 6], [4, 12], [6, 12], [10, 15], [20, 5], [6, 3], [12, 4], [10, 10], [30, 6]];
  if (kind === 0) {
    const [a, b] = pick(pairs);
    return Q({
      key: `cc-series-${a}-${b}`,
      prompt: `${a} μF and ${b} μF capacitors are joined in series. What is the equivalent capacitance?`,
      visual: { kind: "phys-circuit", top: [{ part: "cell" }], bottom: [{ part: "capacitor", label: a, name: "C₁" }, { part: "capacitor", label: b, name: "C₂" }] },
      ...kp((a * b) / (a + b)),
      unit: "μF",
      hint: "Series capacitors: 1/C = 1/C₁ + 1/C₂ (the opposite of resistors). The result is smaller than either.",
      explain: `C = ${a} × ${b} ÷ (${a} + ${b}) = ${ds((a * b) / (a + b))} μF.`,
    });
  }
  if (kind === 1) {
    const a = pick([2, 5, 10, 20]);
    const b = pick([3, 4, 15, 30]);
    const V = pick([6, 10, 12]);
    const ask = pick(["C", "Q"] as const);
    return Q({
      key: `cc-par-${a}-${b}-${V}-${ask}`,
      prompt: ask === "C" ? `${a} μF and ${b} μF capacitors are joined in parallel. What is the equivalent capacitance?` : `${a} μF and ${b} μF capacitors in parallel are charged by a ${V} V battery. What total charge do they store, in μC?`,
      visual: { kind: "phys-circuit", top: [{ part: "cell", label: V }], branches: [[{ part: "capacitor", label: a, name: "C₁" }], [{ part: "capacitor", label: b, name: "C₂" }]] },
      ...kp(ask === "C" ? a + b : (a + b) * V),
      unit: ask === "C" ? "μF" : "μC",
      hint: "Parallel capacitors add: C = C₁ + C₂, and each has the full battery voltage.",
      explain: ask === "C" ? `C = ${a} + ${b} = ${a + b} μF.` : `C = ${a + b} μF, so Q = ${a + b} × ${V} = ${(a + b) * V} μC.`,
    });
  }
  if (kind === 2) {
    const [a, b] = pick(pairs.filter(([x, y]) => x !== y));
    const Ceq = (a * b) / (a + b);
    const V = pick([6, 12, 18, 24, 30]);
    const Qc = Ceq * V;
    const which = pick([0, 1]);
    return Q({
      key: `cc-split-${a}-${b}-${V}-${which}`,
      prompt: `${a} μF and ${b} μF capacitors in series are connected to ${V} V. What is the voltage across the ${which === 0 ? a : b} μF one?`,
      visual: { kind: "phys-circuit", top: [{ part: "cell", label: V }], bottom: [{ part: "capacitor", label: a, across: which === 0 ? "?" : undefined }, { part: "capacitor", label: b, across: which === 1 ? "?" : undefined }] },
      ...kp(Qc / (which === 0 ? a : b)),
      unit: "V",
      hint: "In series every capacitor has the same charge Q = C_eq V. Then V₁ = Q/C₁: the smaller capacitor gets the bigger voltage.",
      explain: `C_eq = ${ds(Ceq)} μF, Q = ${ds(Qc)} μC, so V = ${ds(Qc)} ÷ ${which === 0 ? a : b} = ${ds(Qc / (which === 0 ? a : b))} V.`,
    });
  }
  if (kind === 3) {
    const [a, b] = pick(pairs);
    const V = pick([10, 20, 100]);
    const ser = pick([true, false]);
    const Ceq = ser ? (a * b) / (a + b) : a + b;
    const U = 0.5 * Ceq * 1e-6 * V * V;
    return Q({
      key: `cc-energy-${a}-${b}-${V}-${ser}`,
      prompt: `${a} μF and ${b} μF capacitors are connected in ${ser ? "series" : "parallel"} across ${V} V. What total energy do they store?`,
      ...vals(U, [0.5 * (ser ? a + b : (a * b) / (a + b)) * 1e-6 * V * V, Ceq * 1e-6 * V * V, 0.5 * Ceq * V * V], "J", 2),
      hint: "Find the equivalent capacitance first, then U = ½C_eq V².",
      explain: `C_eq = ${ds(Ceq)} μF, so U = ½ × ${ds(Ceq)} × 10⁻⁶ × ${V}² = ${nf(U, 2)} J.`,
    });
  }
  const s = pick([
    { q: "Three identical capacitors C: which arrangement has the largest equivalent capacitance?", a: "All three in parallel (3C)" },
    { q: "Three identical capacitors C: which arrangement has the smallest equivalent capacitance?", a: "All three in series (C/3)" },
  ]);
  return Q({
    key: `cc-rank-${s.a}`,
    prompt: s.q,
    ...txt(s.a, ["All three in parallel (3C)", "All three in series (C/3)", "Two in series, then in parallel with the third (1.5C)", "Two in parallel, then in series with the third (2C/3)"].filter((x) => x !== s.a)),
    hint: "Parallel capacitors add like resistors in series; series capacitors combine like resistors in parallel.",
    explain: "Parallel gives 3C (largest); series gives C/3 (smallest); the mixed ones are 1.5C and 2C/3.",
  });
}

/** PHYS.10.3, PHYS.10.5, PHYS.10.6 — Do it: rank fields, potentials and capacitances. */
export function rankDoIt(): Question {
  const kind = rand(0, 2);
  if (kind === 0 || kind === 1) {
    const field = kind === 0;
    for (;;) {
      const items = Array.from({ length: 4 }, () => ({ q: rand(1, 4) * (field ? 1 : pick([1, -1])), r: rand(1, 4) }));
      const val = (i: { q: number; r: number }) => (field ? Math.abs(i.q) / (i.r * i.r) : i.q / i.r);
      const labels = items.map((i) => `${i.q > 0 ? "+" : "−"}${Math.abs(i.q)} nC, ${i.r} m away`);
      if (new Set(items.map((i) => val(i).toFixed(6))).size < 4 || new Set(labels).size < 4) continue;
      const order = [...items].sort((a, b) => val(b) - val(a));
      const lab = (i: { q: number; r: number }) => `${i.q > 0 ? "+" : "−"}${Math.abs(i.q)} nC, ${i.r} m away`;
      return Q({
        key: `rk-${field ? "E" : "V"}-${labels.join("|")}`,
        prompt: field ? "Each point is near its own point charge. Rank the points from strongest electric field to weakest." : "Each point is near its own point charge. Rank the points from highest electric potential to lowest.",
        ...act({ kind: "order", items: order.map(lab), direction: field ? "strongest field first" : "highest potential first" }, 4),
        hint: field ? "E = k|q|/r²: compare |q|/r² (the 1/r² matters a lot)." : "V = kq/r keeps the sign: negative potentials are lowest. Compare q/r.",
        explain: order.map((i) => `${lab(i)}: ${field ? "|q|/r²" : "q/r"} = ${nf(val(i), 3)}`).join("; ") + ".",
      });
    }
  }
  for (;;) {
    const items = Array.from({ length: 4 }, () => ({ k: pick([1, 2, 3]), A: pick([1, 2]), d: pick([1, 2, 3]) }));
    const val = (i: { k: number; A: number; d: number }) => (i.k * i.A) / i.d;
    const lab = (i: { k: number; A: number; d: number }) => `κ = ${i.k}, area ${i.A === 1 ? "A" : "2A"}, gap ${i.d === 1 ? "d" : `${i.d}d`}`;
    if (new Set(items.map((i) => val(i).toFixed(6))).size < 4) continue;
    const order = [...items].sort((a, b) => val(b) - val(a));
    return Q({
      key: `rk-C-${items.map(lab).join("|")}`,
      prompt: "Rank these parallel-plate capacitors from largest capacitance to smallest.",
      ...act({ kind: "order", items: order.map(lab), direction: "largest capacitance first" }, 4),
      hint: "C = κε₀A/d: compare κA/d.",
      explain: order.map((i) => `${lab(i)} → ${nf(val(i), 3)} ε₀A/d`).join("; ") + ".",
    });
  }
}

/* ================================================================ 3. Electric circuits */

const cell = (V?: number): CircuitPart => ({ part: "cell", label: V });
const res = (R?: number | string, extra: Partial<{ name: string; across: number | string }> = {}): CircuitPart => ({ part: "resistor", label: R, ...extra });
const amm = (I?: number | string, name?: string): CircuitPart => ({ part: "ammeter", label: I, name });
const bulb = (name: string, extra: Partial<{ across: number | string }> = {}): CircuitPart => ({ part: "bulb", name, ...extra });
const circuit = (c: CircuitLayout): Visual => ({ kind: "phys-circuit", ...c });

/** Two resistors whose parallel combination is a whole number. */
const PAR: [number, number][] = [[2, 2], [3, 6], [4, 4], [4, 12], [6, 6], [6, 12], [12, 12], [10, 15], [20, 5], [6, 3], [12, 4], [20, 20], [30, 6]];
const par = (a: number, b: number) => (a * b) / (a + b);
const twoDp = (x: number) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;

/** PHYS.11.1 — current as the rate of flow of charge. */
export function current(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const I = pick([0.5, 1.5, 2, 3, 4, 0.25]);
    const t = pick([2, 4, 5, 10, 20]);
    return Q({
      key: `cu-i-${I}-${t}`,
      prompt: `${clean(I * t)} C of charge passes a point in a wire in ${t} s. What is the current?`,
      ...kp(I),
      unit: "A",
      hint: "Current is charge per second: I = ΔQ/Δt.",
      explain: `I = ${clean(I * t)} C ÷ ${t} s = ${ds(I)} A.`,
    });
  }
  if (kind === 1) {
    const mA = pick([1, 2, 5, 10, 20, 50, 100, 500]);
    const n = (mA / 1000) / QE;
    return Q({
      key: `cu-n-${mA}`,
      prompt: `A wire carries ${mA} mA. How many electrons pass a point each second?`,
      ...vals(n, [mA / QE, (mA / 1000) * QE, n / 1000], "", 2, sci),
      hint: "Each electron carries 1.6 × 10⁻¹⁹ C. Electrons per second = I ÷ e (with I in amperes).",
      explain: `${mA / 1000} C/s ÷ 1.6 × 10⁻¹⁹ C ≈ ${sci(n, 2)} electrons per second.`,
    });
  }
  if (kind === 2) {
    const I = pick([0.2, 0.5, 1.5, 2, 3]);
    const mins = pick([1, 2, 5, 10]);
    return Q({
      key: `cu-q-${I}-${mins}`,
      prompt: `A ${I} A current flows for ${mins} minute${mins > 1 ? "s" : ""}. How much charge passes?`,
      ...kp(I * mins * 60),
      unit: "C",
      hint: "ΔQ = IΔt, with time in seconds.",
      explain: `ΔQ = ${I} × ${mins * 60} s = ${ds(I * mins * 60)} C.`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "In a wire, which way do the electrons drift compared with the conventional current?", a: "Opposite to the conventional current" },
      { q: "Conventional current is defined as the flow of which charge?", a: "Positive charge, from + to − outside the battery" },
    ]);
    return Q({
      key: `cu-conv-${s.a.slice(0, 8)}`,
      prompt: s.q,
      ...txt(s.a, ["Opposite to the conventional current", "Positive charge, from + to − outside the battery", "The same way as the conventional current", "Negative charge, from + to −"].filter((x) => x !== s.a)),
      hint: "Conventional current is the direction positive charge would move. Electrons are negative.",
      explain: "Conventional current runs from + to − in the outside circuit; the electrons (negative) actually drift the other way.",
    });
  }
  if (kind === 4) {
    const I0 = pick([2, 3, 4, 6]);
    const t1 = pick([2, 4]);
    const t2 = t1 + pick([2, 3, 4]);
    const area = 0.5 * I0 * t1 + I0 * (t2 - t1);
    const fn = (t: number) => (t <= t1 ? (I0 * t) / t1 : t <= t2 ? I0 : 0);
    return Q({
      key: `cu-area-${I0}-${t1}-${t2}`,
      prompt: "The graph shows the current in a wire. How much charge flows from t = 0 to the end?",
      visual: plot([0, 10], [0, 8], "t (s)", "I (A)", { lines: [{ from: [0, 0], to: [t1, I0], colour: "berry" }, { from: [t1, I0], to: [t2, I0], colour: "berry" }, { from: [t2, I0], to: [t2, 0], colour: "berry" }], shade: { fn, from: 0, to: t2 } }),
      needsVisual: true,
      ...kp(area),
      unit: "C",
      hint: "Charge is the area under an I–t graph. Split it into a triangle and a rectangle.",
      explain: `Triangle ½ × ${t1} × ${I0} = ${0.5 * I0 * t1} C, plus rectangle ${t2 - t1} × ${I0} = ${I0 * (t2 - t1)} C: ${ds(area)} C.`,
    });
  }
  return Q({
    key: `cu-drift-${rand(0, 12)}`,
    prompt: "Electrons drift through a wire at less than a millimeter per second, yet a lamp lights almost instantly. Why?",
    ...txt("The field pushes electrons all along the wire at once; they're already everywhere", ["Electrons move at the speed of light", "The battery stores electrons in the lamp", "Current only flows near the lamp"]),
    hint: "The wire is already full of free electrons. What sets them all moving?",
    explain: "Closing the switch sets up an electric field through the whole circuit almost at once, so electrons everywhere, including those in the filament, start drifting together.",
  });
}

const RHO = [
  { name: "copper", rho: 1.7e-8 },
  { name: "aluminum", rho: 2.8e-8 },
  { name: "tungsten", rho: 5.6e-8 },
  { name: "nichrome", rho: 1.1e-6 },
];

/** PHYS.11.3 — resistance and resistivity, R = ρL/A. */
export function resistivity(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const m = pick(RHO);
    const L = pick([2, 5, 10, 20, 50]);
    const d = pick([0.5, 1, 2]);
    const A = Math.PI * (d / 2000) ** 2;
    const R = (m.rho * L) / A;
    return Q({
      key: `rs-r-${m.name}-${L}-${d}`,
      prompt: `What is the resistance of a ${L} m ${m.name} wire (ρ = ${sci(m.rho, 2)} Ω·m) with a diameter of ${d} mm?`,
      ...vals(R, [(m.rho * L) / (Math.PI * (d / 1000) ** 2), (m.rho * L) / (d / 1000), R * 1e6], "Ω", 2),
      hint: "R = ρL/A, where A = πr² and r is half the diameter, in meters.",
      explain: `A = π × (${d / 2000})² = ${sci(A, 2)} m², so R = ${sci(m.rho, 2)} × ${L} ÷ ${sci(A, 2)} ≈ ${nf(R, 2)} Ω.`,
    });
  }
  if (kind === 1) {
    const c = pick([
      { t: "its length doubles and its diameter doubles", f: 0.5 },
      { t: "its length is halved", f: 0.5 },
      { t: "its diameter is halved", f: 4 },
      { t: "its diameter doubles", f: 0.25 },
      { t: "its length triples and its diameter triples", f: 1 / 3 },
      { t: "its length doubles and its cross-sectional area doubles", f: 1 },
    ]);
    const w = (x: number) => (x === 1 ? "the same" : x >= 1 ? `${x} times as big` : `${x === 0.5 ? "half" : x === 0.25 ? "a quarter" : "a third"} as big`);
    return Q({
      key: `rs-scale-${c.t}`,
      prompt: `A wire is replaced by one of the same metal where ${c.t}. Its resistance is now:`,
      ...txt(w(c.f), ["the same", "4 times as big", "half as big", "a quarter as big", "2 times as big", "a third as big"].filter((x) => x !== w(c.f))),
      hint: "R = ρL/A. Area goes as diameter squared.",
      explain: `R ∝ L/d²: the new resistance is ${w(c.f)}.`,
    });
  }
  if (kind === 2) {
    const k = pick([2, 3]);
    return Q({
      key: `rs-stretch-${k}`,
      prompt: `A wire is stretched to ${k} times its length (its volume stays the same). Its resistance becomes:`,
      ...nums(k * k, [k, 1 / k, 2 * k]),
      hint: "Same volume: if L grows by a factor, A shrinks by the same factor.",
      explain: `L × ${k} and A ÷ ${k}, so R = ρL/A grows by ${k} × ${k} = ${k * k}.`,
    });
  }
  if (kind === 3) {
    const m = pick(RHO);
    const L = pick([1, 2, 4]);
    const A = pick([1, 2, 5]) * 1e-7;
    const R = (m.rho * L) / A;
    return Q({
      key: `rs-rho-${m.name}-${L}-${A}`,
      prompt: `A ${L} m wire with cross-section ${sci(A, 1)} m² has a resistance of ${nf(R, 3)} Ω. What is the resistivity of its metal?`,
      ...vals(m.rho, [(R * L) / A, R / (L * A), (R * A) / L / 10], "Ω·m", 2, sci),
      hint: "ρ = RA/L.",
      explain: `ρ = ${nf(R, 3)} × ${sci(A, 1)} ÷ ${L} = ${sci(m.rho, 2)} Ω·m, which is ${m.name}.`,
    });
  }
  if (kind === 4) {
    const hot = pick([true, false]);
    return Q({
      key: `rs-temp-${hot}-${rand(0, 6)}`,
      prompt: hot ? "A metal wire is heated. What happens to its resistance, and why?" : "A metal wire is cooled. What happens to its resistance, and why?",
      ...txt(hot ? "It rises: atoms vibrate more and scatter the electrons more" : "It falls: atoms vibrate less and scatter the electrons less", [hot ? "It falls: hot electrons move faster" : "It rises: cold electrons move slower", "It stays the same: R depends only on shape", hot ? "It falls: the wire expands" : "It rises: the wire contracts"]),
      hint: "Resistance in a metal comes from electrons colliding with the vibrating lattice of ions.",
      explain: hot ? "Hotter ions vibrate more, so drifting electrons collide more often: resistivity and resistance go up." : "Cooler ions vibrate less, so electrons collide less often: resistance goes down.",
    });
  }
  const ms = some(RHO, 3);
  const best = [...ms].sort((a, b) => a.rho - b.rho)[0];
  return Q({
    key: `rs-best-${ms.map((x) => x.name).join("-")}`,
    prompt: "Wires of the same length and thickness are made of these metals. Which has the lowest resistance?",
    visual: table(["metal", "ρ (Ω·m)"], ms.map((x) => [x.name, sci(x.rho, 2)])),
    ...txt(best.name, ms.filter((x) => x !== best).map((x) => x.name), 3),
    hint: "Same L and A, so R ∝ ρ.",
    explain: `${best.name} has the smallest resistivity (${sci(best.rho, 2)} Ω·m), so the lowest R.`,
  });
}

/** PHYS.11.3 — Ohm's law and V–I graphs, including drawing the line through data. */
export function viGraphs(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const R = pick([4, 5, 8, 10, 12, 20, 50, 100]);
    const I = pick([0.1, 0.2, 0.5, 1.5, 2, 3]);
    const V = clean(I * R);
    const ask = pick(["V", "I", "R"] as const);
    return Q({
      key: `vi-ohm-${R}-${I}-${ask}`,
      prompt: ask === "V" ? `A ${R} Ω resistor carries ${I} A. What is the voltage across it?` : ask === "I" ? `A ${R} Ω resistor has ${V} V across it. What current flows?` : `A resistor carries ${I} A with ${V} V across it. What is its resistance?`,
      ...kp(ask === "V" ? V : ask === "I" ? I : R),
      unit: ask === "V" ? "V" : ask === "I" ? "A" : "Ω",
      hint: "Ohm's law: V = IR.",
      explain: ask === "V" ? `V = ${I} × ${R} = ${V} V.` : ask === "I" ? `I = ${V} ÷ ${R} = ${I} A.` : `R = ${V} ÷ ${I} = ${R} Ω.`,
    });
  }
  if (kind === 1) {
    const R = pick([2, 4, 5, 10, 20]);
    const Imax = R >= 10 ? 1 : 4;
    const pts = [0.25, 0.5, 0.75].map((f) => f * Imax);
    return Q({
      key: `vi-slope-${R}`,
      prompt: "The graph shows V against I for a resistor. What is its resistance?",
      visual: plot([0, Imax], [0, R * Imax], "I (A)", "V (V)", { lines: [{ from: [0, 0], to: [Imax, R * Imax], colour: "berry" }], points: pts.map((x) => ({ x, y: R * x, label: `(${ds(x)} A, ${ds(R * x)} V)` })).slice(1, 2) }),
      needsVisual: true,
      ...kp(R),
      unit: "Ω",
      hint: "On a V–I graph the slope ΔV/ΔI is the resistance.",
      explain: `Slope = ${ds(R * pts[1])} V ÷ ${ds(pts[1])} A = ${R} Ω.`,
    });
  }
  if (kind === 2) {
    const [ra, rb] = some([1, 2, 4, 5], 2);
    const ask = pick(["larger", "smaller"] as const);
    const ans = (ask === "larger") === (ra > rb) ? "A" : "B";
    return Q({
      key: `vi-iv-${ra}-${rb}-${ask}`,
      prompt: `Careful with the axes: current against voltage for resistors A and B. Which has the ${ask} resistance?`,
      visual: plot([0, 10], [0, 10], "V (V)", "I (A)", { curves: [{ fn: (v) => v / ra, label: "A", colour: "berry" }, { fn: (v) => v / rb, label: "B", colour: "wave" }] }),
      needsVisual: true,
      ...txt(ans, [ans === "A" ? "B" : "A", "They're equal"], 3),
      hint: "Careful with the axes: on an I–V graph the slope is I/V = 1/R. Steeper means smaller R.",
      explain: `A has slope 1/${ra} and B has slope 1/${rb}; the ${ask === "larger" ? "shallower" : "steeper"} line, ${ans}, has the ${ask} resistance.`,
    });
  }
  if (kind === 3) {
    const ask = pick(["R", "ohmic"] as const);
    const k = pick([2, 3, 4]);
    return Q({
      key: `vi-bulb-${ask}-${k}`,
      prompt: ask === "R" ? "The I–V graph of a filament lamp. As the voltage rises, what happens to its resistance?" : "The I–V graph of a filament lamp. Is the lamp ohmic?",
      visual: plot([0, 12], [0, 2.5], "V (V)", "I (A)", { curves: [{ fn: (v) => (v < 0 ? 0 : (2 * Math.sqrt(v / 12)) ** (k === 2 ? 1 : k === 3 ? 1.1 : 0.9)), colour: "tangerine", label: "lamp" }] }),
      needsVisual: true,
      ...(ask === "R"
        ? txt("It increases (the filament heats up)", ["It decreases", "It stays the same", "It drops to zero"])
        : txt("No: V/I is not constant", ["Yes: the current rises with voltage", "Yes: it has a resistance", "No: no current flows"])),
      hint: "R = V/I at each point. On an I–V graph, a curve that flattens means V/I is growing.",
      explain: "The I–V curve bends over, so V/I grows with V: the hotter filament has more resistance, and the lamp does not obey Ohm's law.",
    });
  }
  const R = pick([5, 10, 15, 20]);
  const m = R / 10;
  const xs = [2, 4, 6].filter((x) => m * x <= 8);
  if (kind === 4)
    return Q({
      key: `vi-draw-${R}`,
      prompt: "Draw the best-fit line of V against I for this resistor. Each square across is 0.1 A; each square up is 1 V.",
      speech: "Draw the best fit line of voltage against current. Each square across is 0.1 amps, and each square up is 1 volt.",
      visual: table(["I (A)", "V (V)"], xs.map((x) => [ds(x / 10), ds(m * x)])),
      ...act({ kind: "drawLine", m, b: 0, size: 8, quadrants: 1 }, m),
      hint: "Turn each pair into squares (I ÷ 0.1, V ÷ 1). For an ohmic resistor the line goes through the origin.",
      explain: `The line rises ${ds(m)} squares per square: slope = ${ds(m)} V per 0.1 A = ${R} Ω.`,
    });
  const ys = some([1, 2, 3, 4, 5, 6, 7].filter((x) => m * x <= 8 && Number.isInteger(m * x)), 3).sort((a, b) => a - b);
  return Q({
    key: `vi-plot-${R}-${ys.join("")}`,
    prompt: "Plot these measurements as V against I. Each square across is 0.1 A; each square up is 1 V.",
    speech: "Plot these measurements as voltage against current. Each square across is 0.1 amps, and each square up is 1 volt.",
    visual: table(["I (A)", "V (V)"], ys.map((x) => [ds(x / 10), ds(m * x)])),
    ...act({ kind: "plotPoints", points: ys.map((x, i) => ({ x, y: m * x, label: "ABC"[i] })), size: 8, quadrants: 1 }, ys.length),
    hint: "Squares across = I ÷ 0.1; squares up = V.",
    explain: `The points lie on a line through the origin with slope ${R} Ω: the resistor is ohmic.`,
  });
}

/** PHYS.11.2 — bulbs, brightness and what a circuit does when it changes. */
export function bulbs(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const ask = pick(["brightest", "rank"] as const);
    return Q({
      key: `bu-mixed-${ask}-${rand(0, 3)}`,
      prompt: ask === "brightest" ? "The bulbs are identical. Which bulb is brightest?" : "The bulbs are identical. Rank their brightness.",
      visual: circuit({ top: [cell(), bulb("A")], branches: [[bulb("B")], [bulb("C")]] }),
      needsVisual: true,
      ...(ask === "brightest" ? txt("A", ["B", "C", "All the same"]) : txt("A > B = C", ["A = B = C", "B = C > A", "A > B > C"])),
      hint: "All the current passes through A, then splits between B and C. Brightness goes with power, I²R.",
      explain: "A carries the whole current; B and C each get half of it. So A is brightest and B and C are equally dim.",
    });
  }
  if (kind === 1) {
    const ask = pick(["brightest", "dimmest"] as const);
    return Q({
      key: `bu-branch-${ask}-${rand(0, 3)}`,
      prompt: `The bulbs are identical. Which is ${ask}?`,
      visual: circuit({ top: [cell()], branches: [[bulb("A"), bulb("B")], [bulb("C")]] }),
      needsVisual: true,
      ...(ask === "brightest" ? txt("C", ["A", "B", "All the same"]) : txt("A and B (equally)", ["C", "A only", "All the same"])),
      hint: "Each branch gets the full battery voltage. C has it all; A and B share theirs.",
      explain: "C gets the full voltage. A and B split the same voltage, so each gets half: they are equally dim, C is brightest.",
    });
  }
  if (kind === 2) {
    const ask = pick(["A", "B"] as const);
    return Q({
      key: `bu-short-${ask}-${rand(0, 3)}`,
      prompt: `A wire is connected across bulb B, as shown. Compared with before the wire was added, bulb ${ask}:`,
      visual: circuit({ top: [cell(), bulb("A")], branches: [[bulb("B")], [{ part: "wire" }]] }),
      needsVisual: true,
      ...(ask === "A" ? txt("gets brighter", ["gets dimmer", "goes out", "stays the same"]) : txt("goes out", ["gets brighter", "gets dimmer", "stays the same"])),
      hint: "Current takes the zero-resistance wire around B. What does that do to the total resistance?",
      explain: "B is shorted out: no current goes through it, so it goes out. The total resistance drops to just A's, so A gets the full voltage and gets brighter.",
    });
  }
  if (kind === 3) {
    const ask = pick(["A", "total"] as const);
    return Q({
      key: `bu-parallel-${ask}-${rand(0, 3)}`,
      prompt: ask === "A" ? "Switch S is closed, so bulb B lights too. What happens to bulb A? (ideal battery)" : "Switch S is closed, so bulb B lights too. What happens to the current from the battery?",
      visual: circuit({ top: [cell()], branches: [[bulb("A")], [bulb("B"), { part: "switch", closed: false, name: "S" }]] }),
      needsVisual: true,
      ...(ask === "A" ? txt("Stays the same", ["Gets brighter", "Gets dimmer", "Goes out"]) : txt("Doubles", ["Stays the same", "Halves", "Drops to zero"])),
      hint: "A parallel branch always has the battery's full voltage across it.",
      explain: ask === "A" ? "A still has the full battery voltage across it, so its current and brightness don't change." : "A new identical branch adds the same current again, so the battery supplies twice as much (the total resistance halves).",
    });
  }
  if (kind === 4) {
    const ask = pick(["A", "B"] as const);
    return Q({
      key: `bu-add-${ask}-${rand(0, 3)}`,
      prompt: `Closing switch S adds bulb C in parallel with B. What happens to bulb ${ask}?`,
      visual: circuit({ top: [cell(), bulb("A")], branches: [[bulb("B")], [bulb("C"), { part: "switch", closed: false, name: "S" }]] }),
      needsVisual: true,
      ...(ask === "A" ? txt("Gets brighter", ["Gets dimmer", "Stays the same", "Goes out"]) : txt("Gets dimmer", ["Gets brighter", "Stays the same", "Goes out"])),
      hint: "Adding a parallel branch lowers the total resistance. Then follow the current through A, and the voltage left for B.",
      explain: "Total resistance falls (R + R/2 instead of 2R), so the current through A rises: A brighter. A now takes 2/3 of the voltage instead of 1/2, leaving less for B: B dimmer.",
    });
  }
  const s = pick([
    { q: "How is an ammeter connected to measure the current through a bulb?", a: "In series, with a very small resistance" },
    { q: "How is a voltmeter connected to measure the voltage across a bulb?", a: "In parallel, with a very large resistance" },
  ]);
  return Q({
    key: `bu-meter-${s.a.slice(0, 6)}`,
    prompt: s.q,
    ...txt(s.a, ["In series, with a very small resistance", "In parallel, with a very large resistance", "In series, with a very large resistance", "In parallel, with a very small resistance"].filter((x) => x !== s.a)),
    hint: "A meter mustn't change what it measures.",
    explain: "An ammeter sits in the path of the current and must barely resist it; a voltmeter sits beside the part and must draw almost no current.",
  });
}

/** PHYS.11.4 — electric power and energy. */
export function power(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const f = pick(["VR", "IR", "IV"] as const);
    const R = pick([2, 4, 5, 10, 20]);
    const I = pick([0.5, 1, 2, 3]);
    const V = clean(I * R);
    const P = clean(I * V);
    return Q({
      key: `pw-p-${f}-${R}-${I}`,
      prompt: f === "VR" ? `A ${R} Ω resistor has ${V} V across it. What power does it dissipate?` : f === "IR" ? `A ${R} Ω resistor carries ${I} A. What power does it dissipate?` : `A device draws ${I} A at ${V} V. What is its power?`,
      ...kp(P),
      unit: "W",
      hint: "P = IV = I²R = V²/R. Pick the form that uses what you know.",
      explain: f === "VR" ? `P = V²/R = ${V}² ÷ ${R} = ${P} W.` : f === "IR" ? `P = I²R = ${I}² × ${R} = ${P} W.` : `P = IV = ${I} × ${V} = ${P} W.`,
    });
  }
  if (kind === 1) {
    const W = pick([60, 100, 1200, 1500, 2000, 40]);
    const h = pick([2, 4, 5, 8]);
    const days = 30;
    const price = pick([0.1, 0.12, 0.15, 0.2]);
    const kWh = (W / 1000) * h * days;
    const cost = dp(kWh * price, 2);
    return Q({
      key: `pw-cost-${W}-${h}-${price}`,
      prompt: `A ${W} W appliance runs ${h} hours a day for ${days} days. Electricity costs $${price.toFixed(2)} per kWh. What does it cost, to the nearest cent?`,
      ...kp(cost),
      prefix: "$",
      hint: "Energy in kWh = power in kW × hours. Then multiply by the price.",
      explain: `${W / 1000} kW × ${h * days} h = ${ds(kWh)} kWh; × $${price.toFixed(2)} = $${cost.toFixed(2)}.`,
    });
  }
  if (kind === 2) {
    const series = pick([true, false]);
    const [a, b] = pick([[60, 100], [40, 100], [25, 60], [40, 60]]);
    return Q({
      key: `pw-bulbs-${series}-${a}-${b}`,
      prompt: `A ${a} W bulb and a ${b} W bulb (both rated for 120 V) are connected in ${series ? "series" : "parallel"} to 120 V. Which glows brighter?`,
      ...txt(series ? `The ${a} W bulb` : `The ${b} W bulb`, [series ? `The ${b} W bulb` : `The ${a} W bulb`, "They glow equally"], 3),
      hint: "Find each resistance with R = V²/P. In series the same current flows (P = I²R); in parallel the same voltage (P = V²/R).",
      explain: `R_${a} = 120²/${a} = ${14400 / a} Ω and R_${b} = ${14400 / b} Ω. ${series ? `In series, the bigger resistance (the ${a} W bulb) takes more power.` : `In parallel each gets 120 V, so the ${b} W bulb really uses ${b} W.`}`,
    });
  }
  if (kind === 3) {
    const [V, P] = pick([[120, 60], [120, 100], [120, 40], [12, 6], [12, 24], [6, 3], [240, 60]]);
    return Q({
      key: `pw-rated-${V}-${P}`,
      prompt: `A lamp is rated ${P} W at ${V} V. What is its resistance when working normally?`,
      ...kp((V * V) / P),
      unit: "Ω",
      hint: "P = V²/R, so R = V²/P.",
      explain: `R = ${V}² ÷ ${P} = ${ds((V * V) / P)} Ω.`,
    });
  }
  if (kind === 4) {
    const k = pick([2, 3, 0.5]);
    return Q({
      key: `pw-scale-${k}`,
      prompt: `The voltage across a resistor is ${k === 0.5 ? "halved" : `multiplied by ${k}`}. By what factor does its power change?`,
      ...nums(k * k, [k, 2 * k, k ** 3]),
      hint: "P = V²/R with R fixed.",
      explain: `P ∝ V², so the factor is ${k}² = ${k * k}.`,
    });
  }
  const [r1, r2] = some([2, 4, 6, 8, 12], 2);
  const series = pick([true, false]);
  const big = r1 > r2 ? "R₁" : "R₂";
  const small = r1 > r2 ? "R₂" : "R₁";
  const V = 12;
  return Q({
    key: `pw-which-${r1}-${r2}-${series}`,
    prompt: "Which resistor dissipates more power?",
    visual: series
      ? circuit({ top: [cell(V)], bottom: [res(r1, { name: "R₁" }), res(r2, { name: "R₂" })] })
      : circuit({ top: [cell(V)], branches: [[res(r1, { name: "R₁" })], [res(r2, { name: "R₂" })]] }),
    needsVisual: true,
    ...txt(series ? big : small, [series ? small : big, "Both the same"], 3),
    hint: series ? "In series the current is the same, so use P = I²R." : "In parallel the voltage is the same, so use P = V²/R.",
    explain: series ? `Same current, P = I²R: the larger resistor, ${big}, dissipates more.` : `Same voltage, P = V²/R: the smaller resistor, ${small}, dissipates more.`,
  });
}

/** PHYS.11.5 — equivalent resistance and current in series and parallel. */
export function seriesParallel(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const r1 = pick([2, 3, 4, 5, 6]);
    const r2 = pick([4, 6, 8, 10]);
    const I = pick([0.5, 1, 1.5, 2]);
    const V = clean(I * (r1 + r2));
    return Q({
      key: `sp-series-${r1}-${r2}-${I}`,
      prompt: "What does the ammeter read?",
      visual: circuit({ top: [cell(V), amm("?")], bottom: [res(r1), res(r2)] }),
      needsVisual: true,
      ...kp(I),
      unit: "A",
      hint: "In series, resistances add: R = R₁ + R₂. Then I = V/R.",
      explain: `R = ${r1} + ${r2} = ${r1 + r2} Ω, so I = ${V} ÷ ${r1 + r2} = ${I} A.`,
    });
  }
  if (kind === 1) {
    const [a, b] = pick(PAR);
    return Q({
      key: `sp-par-${a}-${b}`,
      prompt: `What is the equivalent resistance of ${a} Ω and ${b} Ω in parallel?`,
      visual: circuit({ top: [cell()], branches: [[res(a)], [res(b)]] }),
      ...kp(par(a, b)),
      unit: "Ω",
      hint: "1/R = 1/R₁ + 1/R₂, or R = R₁R₂/(R₁ + R₂) for two. It's less than either one.",
      explain: `R = ${a} × ${b} ÷ ${a + b} = ${ds(par(a, b))} Ω.`,
    });
  }
  if (kind === 2) {
    const r1 = pick([2, 4, 6]);
    const [a, b] = pick(PAR);
    const I = pick([1, 2, 3]);
    const V = I * (r1 + par(a, b));
    if (V > 60) return seriesParallel();
    return Q({
      key: `sp-combo-${r1}-${a}-${b}-${I}`,
      prompt: "What current does the battery supply?",
      visual: circuit({ top: [cell(V), res(r1), amm("?")], branches: [[res(a)], [res(b)]] }),
      needsVisual: true,
      ...kp(I),
      unit: "A",
      hint: "Combine the parallel pair first, then add the series resistor. I = V/R_total.",
      explain: `${a} ∥ ${b} = ${ds(par(a, b))} Ω; total ${ds(r1 + par(a, b))} Ω; I = ${ds(V)} ÷ ${ds(r1 + par(a, b))} = ${I} A.`,
    });
  }
  if (kind === 3) {
    const r1 = pick([2, 4, 6]);
    const r2 = pick([2, 3, 6, 8]);
    const I = pick([0.5, 1, 2]);
    const V = clean(I * (r1 + r2));
    const which = pick([0, 1]);
    return Q({
      key: `sp-vdrop-${r1}-${r2}-${I}-${which}`,
      prompt: `What is the voltage across the ${which === 0 ? r1 : r2} Ω resistor?`,
      visual: circuit({ top: [cell(V)], bottom: [res(r1, which === 0 ? { across: "?" } : {}), res(r2, which === 1 ? { across: "?" } : {})] }),
      needsVisual: true,
      ...kp(I * (which === 0 ? r1 : r2)),
      unit: "V",
      hint: "Find the current first (series: R adds). Then V = IR for that resistor.",
      explain: `I = ${V} ÷ ${r1 + r2} = ${I} A, so V = ${I} × ${which === 0 ? r1 : r2} = ${ds(I * (which === 0 ? r1 : r2))} V. The bigger resistor gets the bigger share.`,
    });
  }
  if (kind === 4) {
    const what = pick(["equivalent resistance", "battery current"] as const);
    return Q({
      key: `sp-addpar-${what}-${rand(0, 4)}`,
      prompt: `Another resistor is added in parallel to a circuit's resistors. What happens to the ${what}?`,
      ...txt(what === "equivalent resistance" ? "It decreases" : "It increases", ["It increases", "It decreases", "It stays the same"].filter((x) => x !== (what === "equivalent resistance" ? "It decreases" : "It increases")), 3),
      hint: "Each new branch is another path for current.",
      explain: "Another parallel path lowers the equivalent resistance, so (with the same battery) more total current flows.",
    });
  }
  const s = pick([
    { q: "Three identical resistors R: which arrangement has the greatest equivalent resistance?", a: "All in series (3R)" },
    { q: "Three identical resistors R: which arrangement has the least equivalent resistance?", a: "All in parallel (R/3)" },
    { q: "Three identical resistors R: what is one in series with the other two in parallel?", a: "1.5R" },
  ]);
  return Q({
    key: `sp-rank-${s.a}`,
    prompt: s.q,
    ...txt(s.a, ["All in series (3R)", "All in parallel (R/3)", "1.5R", "2R/3"].filter((x) => x !== s.a)),
    hint: "Series adds; parallel combines to less than the smallest.",
    explain: "Series: 3R. Parallel: R/3. R + R/2 = 1.5R. (R + R) ∥ R = 2R/3.",
  });
}

/** PHYS.11.2, PHYS.11.5 — Do it: tap gaps and switches so that exactly the named bulbs light. */
export function buildDoIt(): Question {
  for (;;) {
    const kind = rand(0, 3);
    let c: CircuitLayout;
    let want: string[];
    if (kind === 0) {
      c = { top: [cell(), { part: "gap" }], bottom: [bulb("A"), pick<CircuitPart>([{ part: "switch", closed: false }, { part: "gap" }]), bulb("B")] };
      want = ["A", "B"];
    } else if (kind === 1) {
      const n = rand(2, 3);
      const names = ["A", "B", "C"].slice(0, n);
      const ctl = (): CircuitPart => pick<CircuitPart>([{ part: "gap" }, { part: "switch", closed: false }, { part: "switch", closed: true }]);
      c = { top: [cell(), pick<CircuitPart>([{ part: "switch", closed: true }, { part: "gap" }])], branches: names.map((nm) => [bulb(nm), ctl()]) };
      want = some(names, rand(1, n - 1 + (rand(0, 2) === 0 ? 1 : 0))).sort();
    } else if (kind === 2) {
      c = { top: [cell(), bulb("A")], branches: [[bulb("B")], [{ part: "gap" }]] };
      want = ["A"];
    } else {
      c = { top: [cell(), { part: "switch", closed: false }], branches: [[bulb("A"), bulb("B")], [bulb("C"), { part: "gap" }]] };
      want = pick([["A", "B"], ["C"], ["A", "B", "C"]]);
    }
    if (!circuitSolution(c, want) || litNames(c, {}).join("|") === want.join("|")) continue;
    const parts = JSON.stringify(c).replace(/[^a-z]/g, "").slice(0, 400);
    const list = want.length === 1 ? `only bulb ${want[0]}` : want.length === 2 ? `bulbs ${want[0]} and ${want[1]} (and no others)` : "all three bulbs";
    return Q({
      key: `bd-${kind}-${want.join("")}-${parts}`,
      prompt: `Tap gaps to fill them with wire and tap switches to open or close them so that ${list} light${want.length === 1 ? "s" : ""}.`,
      ...act({ kind: "phys-buildCircuit", ...c, lit: want }, want.length),
      hint: kind === 2 ? "A wire across a bulb shorts it out: the current takes the no-resistance path." : "A bulb lights only if it's in a complete loop with the battery, and not shorted out.",
      explain: kind === 2 ? "Filling the gap puts a plain wire across B. Current bypasses B, so only A lights." : `Close the path through ${want.join(" and ")} and leave any other branch broken.`,
    });
  }
}

/** PHYS.11.7 — Kirchhoff's junction rule. */
export function junctionRule(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const V = pick([6, 12]);
    const [a, b] = some([2, 3, 4, 6, 12], 2);
    const ia = V / a;
    const ib = V / b;
    return Q({
      key: `jr-total-${V}-${a}-${b}`,
      prompt: "What does the ammeter next to the battery read?",
      visual: circuit({ top: [cell(V), amm("?")], branches: [[res(a), amm(ia)], [res(b), amm(ib)]] }),
      needsVisual: true,
      ...kp(ia + ib),
      unit: "A",
      hint: "Current into a junction = current out. The branch currents join to make the total.",
      explain: `${ds(ia)} A + ${ds(ib)} A = ${ds(ia + ib)} A.`,
    });
  }
  if (kind === 1) {
    const n = rand(2, 3);
    const parts = Array.from({ length: n - 1 }, () => pick([0.2, 0.4, 0.5, 0.8, 1, 1.2, 1.5]));
    const missing = pick([0.3, 0.6, 0.7, 1, 1.4, 2]);
    const total = clean(parts.reduce((s, x) => s + x, 0) + missing);
    return Q({
      key: `jr-missing-${parts.join("-")}-${missing}`,
      prompt: "What does the ammeter marked ? read?",
      visual: circuit({ top: [cell(), amm(total)], branches: [...parts.map((p, i) => [res(undefined, { name: `R${"₁₂₃"[i]}` }), amm(p)]), [res(undefined, { name: `R${"₁₂₃"[n - 1]}` }), amm("?")]] }),
      needsVisual: true,
      ...kp(missing),
      unit: "A",
      hint: "The total current splits among the branches: the branch currents add up to the total.",
      explain: `${total} − ${parts.join(" − ")} = ${missing} A.`,
    });
  }
  if (kind === 2) {
    const ins = [rand(1, 6), rand(1, 6)];
    const out1 = rand(1, ins[0] + ins[1] - 1);
    return Q({
      key: `jr-node-${ins.join("-")}-${out1}`,
      prompt: `At a junction, ${ins[0]} A and ${ins[1]} A flow in. One wire carries ${out1} A out. How much flows out of the other wire?`,
      ...kp(ins[0] + ins[1] - out1),
      unit: "A",
      hint: "ΣI_in = ΣI_out.",
      explain: `${ins[0]} + ${ins[1]} = ${out1} + I, so I = ${ins[0] + ins[1] - out1} A.`,
    });
  }
  if (kind === 3) {
    const [R, V] = pick([[6, 6], [6, 12], [6, 18], [12, 6], [12, 18], [12, 12], [4, 6], [4, 12], [2, 6], [8, 12], [10, 15]]);
    const n = 3;
    const I = V / R;
    return Q({
      key: `jr-three-${R}-${V}`,
      prompt: `Three identical ${R} Ω resistors are in parallel. What does the ammeter in the middle branch read?`,
      visual: circuit({ top: [cell(V), amm(n * I)], branches: [[res(R)], [res(R), amm("?")], [res(R)]] }),
      needsVisual: true,
      ...kp(I),
      unit: "A",
      hint: "Identical branches share the current equally. Or: each has the full battery voltage.",
      explain: `${ds(n * I)} A ÷ 3 = ${ds(I)} A (also V/R = ${V}/${R}).`,
    });
  }
  return Q({
    key: `jr-why-${rand(0, 12)}`,
    prompt: "Kirchhoff's junction rule (current in = current out) is a statement of which conservation law?",
    ...txt("Conservation of charge", ["Conservation of energy", "Conservation of momentum", "Conservation of mass"]),
    hint: "Charge can't pile up at a junction or vanish there.",
    explain: "Charge is conserved and doesn't build up at a junction, so whatever flows in each second must flow out.",
  });
}

/** PHYS.11.6 — Kirchhoff's loop rule and internal resistance. */
export function loopRule(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const V = pick([9, 12, 18, 24]);
    const v1 = rand(1, Math.floor(V / 3));
    const v2 = rand(1, Math.floor(V / 3));
    return Q({
      key: `lr-series-${V}-${v1}-${v2}`,
      prompt: "Two voltmeter readings are shown. What does the third voltmeter read?",
      visual: circuit({ top: [cell(V)], bottom: [res(undefined, { across: v1 }), res(undefined, { across: v2 }), res(undefined, { across: "?" })] }),
      needsVisual: true,
      ...kp(V - v1 - v2),
      unit: "V",
      hint: "Around any closed loop the voltage rises equal the drops: ε = V₁ + V₂ + V₃.",
      explain: `${V} − ${v1} − ${v2} = ${V - v1 - v2} V.`,
    });
  }
  if (kind === 1) {
    const e1 = pick([9, 12, 15, 18]);
    const e2 = pick([3, 6]);
    const R = pick([2, 3, 6]);
    const R2 = pick([1, 3]);
    const I = (e1 - e2) / (R + R2);
    if (!twoDp(I)) return loopRule();
    return Q({
      key: `lr-two-${e1}-${e2}-${R}-${R2}`,
      prompt: `A single loop has a ${e1} V battery and a ${e2} V battery facing the opposite way, plus ${R} Ω and ${R2} Ω resistors. What current flows?`,
      ...kp(I),
      unit: "A",
      hint: "Walk round the loop: +ε₁ − ε₂ − IR₁ − IR₂ = 0.",
      explain: `I = (${e1} − ${e2}) ÷ (${R} + ${R2}) = ${ds(I)} A, in the direction the ${e1} V battery pushes.`,
    });
  }
  if (kind === 2) {
    const V = pick([6, 9, 12]);
    const [a, b] = some([2, 3, 4, 6], 2);
    return Q({
      key: `lr-branch-${V}-${a}-${b}`,
      prompt: `What does the voltmeter across the ${b} Ω resistor read?`,
      visual: circuit({ top: [cell(V)], branches: [[res(a)], [res(b, { across: "?" })]] }),
      needsVisual: true,
      ...kp(V),
      unit: "V",
      hint: "Take a loop through the battery and just that branch.",
      explain: `The loop battery → ${b} Ω → back has only one drop, so it is the full ${V} V, whatever the other branch holds.`,
    });
  }
  if (kind === 3) {
    const e = pick([6, 9, 12]);
    const r = pick([0.5, 1, 2]);
    const R = pick([1, 2, 3, 4, 5, 10]);
    const I = e / (R + r);
    if (!twoDp(I * R)) return loopRule();
    const ask = pick(["V", "I"] as const);
    return Q({
      key: `lr-internal-${e}-${r}-${R}-${ask}`,
      prompt: `A battery with emf ${e} V and internal resistance ${r} Ω powers a ${R} Ω resistor. ${ask === "V" ? "What is the terminal voltage?" : "What current flows?"}`,
      ...kp(ask === "V" ? I * R : I),
      unit: ask === "V" ? "V" : "A",
      hint: "The internal resistance is in series: I = ε/(R + r). Terminal voltage = ε − Ir = IR.",
      explain: `I = ${e} ÷ ${R + r} = ${ds(dp(I, 4))} A; terminal voltage = ${e} − ${ds(dp(I, 4))} × ${r} = ${ds(dp(I * R, 2))} V.`,
    });
  }
  if (kind === 4) {
    return Q({
      key: `lr-why-${rand(0, 12)}`,
      prompt: "Kirchhoff's loop rule (the voltages around a loop add to zero) follows from which conservation law?",
      ...txt("Conservation of energy", ["Conservation of charge", "Conservation of momentum", "Conservation of current"]),
      hint: "Voltage is energy per unit charge.",
      explain: "A charge going round a loop returns to the same potential, so the energy it gains from batteries equals the energy it gives up in the resistors.",
    });
  }
  const V = pick([12, 18, 24]);
  const r1 = pick([2, 4, 6]);
  const [a, b] = pick(PAR);
  const I = V / (r1 + par(a, b));
  if (!twoDp(I * par(a, b))) return loopRule();
  return Q({
    key: `lr-mixed-${V}-${r1}-${a}-${b}`,
    prompt: `What does the voltmeter across the ${a} Ω resistor read?`,
    visual: circuit({ top: [cell(V), res(r1)], branches: [[res(a, { across: "?" })], [res(b)]] }),
    needsVisual: true,
    ...kp(I * par(a, b)),
    unit: "V",
    hint: "Find the total current, subtract the drop across the series resistor: the rest is across the parallel pair.",
    explain: `R_total = ${r1} + ${ds(par(a, b))} = ${ds(r1 + par(a, b))} Ω; I = ${ds(dp(I, 3))} A; drop across ${r1} Ω = ${ds(dp(I * r1, 2))} V; so ${ds(dp(I * par(a, b), 2))} V across the pair.`,
  });
}

/** PHYS.11.5, PHYS.11.6, PHYS.11.4 — full analysis of a series–parallel circuit. */
export function combination(): Question {
  for (;;) {
    const r1 = pick([2, 4, 6]);
    const [a, b] = pick(PAR.filter(([x, y]) => x !== y));
    const It = pick([1, 2, 3, 6]);
    const Rp = par(a, b);
    const V = It * (r1 + Rp);
    const Ia = (It * Rp) / a;
    const Ib = (It * Rp) / b;
    if (V > 60 || !twoDp(Ia) || !twoDp(Ib)) continue;
    const ask = pick(["Ia", "V1", "Pb", "remove"] as const);
    const visual = circuit({
      top: [cell(V), res(r1, { name: "R₁", across: ask === "V1" ? "?" : undefined })],
      branches: [[res(a, { name: "R₂" }), amm(ask === "Ia" ? "?" : undefined)], [res(b, { name: "R₃" })]],
    });
    if (ask === "remove")
      return Q({
        key: `cb-remove-${r1}-${a}-${b}-${It}`,
        prompt: "R₃ is removed, breaking its branch. What happens to the current through R₁?",
        visual,
        ...txt("It decreases", ["It increases", "It stays the same", "It drops to zero"]),
        hint: "Removing a parallel branch raises the total resistance.",
        explain: `The total resistance rises from ${ds(r1 + Rp)} Ω to ${r1 + a} Ω, so the current through R₁ falls from ${It} A to ${ds(dp(V / (r1 + a), 2))} A.`,
      });
    return Q({
      key: `cb-${ask}-${r1}-${a}-${b}-${It}`,
      prompt: ask === "Ia" ? "What current flows through R₂?" : ask === "V1" ? "What is the voltage across R₁?" : "What power does R₃ dissipate?",
      visual,
      needsVisual: true,
      ...kp(ask === "Ia" ? Ia : ask === "V1" ? It * r1 : Ib * Ib * b),
      unit: ask === "Ia" ? "A" : ask === "V1" ? "V" : "W",
      hint: "Total resistance: R₁ + (R₂ ∥ R₃). Total current I = V/R. The pair shares the leftover voltage.",
      explain: `R = ${r1} + ${ds(Rp)} = ${ds(r1 + Rp)} Ω, I = ${It} A, V_pair = ${ds(It * Rp)} V. ${ask === "Ia" ? `I₂ = ${ds(It * Rp)} ÷ ${a} = ${ds(Ia)} A.` : ask === "V1" ? `V₁ = ${It} × ${r1} = ${It * r1} V.` : `I₃ = ${ds(Ib)} A, so P = ${ds(Ib)}² × ${b} = ${ds(Ib * Ib * b)} W.`}`,
    });
  }
}

/** PHYS.11.8 — charging RC circuits: time constant and graphs. */
export function rcCharging(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const R = pick([1, 2, 5, 10, 20, 50]);
    const Cu = pick([10, 20, 50, 100, 200]);
    const tau = (R * 1000 * Cu * 1e-6);
    return Q({
      key: `rc-tau-${R}-${Cu}`,
      prompt: `What is the time constant of a ${R} kΩ resistor in series with a ${Cu} μF capacitor?`,
      ...kp(tau),
      unit: "s",
      hint: "τ = RC, with R in ohms and C in farads.",
      explain: `τ = ${R * 1000} Ω × ${Cu} × 10⁻⁶ F = ${ds(tau)} s.`,
    });
  }
  if (kind === 1) {
    const tau = pick([1, 2, 3, 4]);
    const e = pick([6, 9, 12]);
    const Cu = pick([100, 200, 500]);
    const R = (tau / (Cu * 1e-6)) / 1000;
    return Q({
      key: `rc-graph-${tau}-${e}-${Cu}`,
      prompt: `A capacitor's voltage as it charges through a resistor. C = ${Cu} μF. What is R, in kΩ?`,
      visual: plot([0, 5 * tau], [0, e + 2], "t (s)", "V_C (V)", {
        curves: [{ fn: (t) => (t < 0 ? 0 : e * (1 - Math.exp(-t / tau))), colour: "berry", label: "V_C" }],
        lines: [{ from: [0, e], to: [5 * tau, e], dashed: true, colour: "night" }, { from: [0, 0.632 * e], to: [tau, 0.632 * e], dashed: true, colour: "grape" }, { from: [tau, 0], to: [tau, 0.632 * e], dashed: true, colour: "grape" }],
        points: [{ x: tau, y: 0.632 * e, label: "63%" }],
      }),
      needsVisual: true,
      ...kp(R),
      unit: "kΩ",
      hint: "After one time constant the capacitor reaches 63% of its final voltage. Read τ, then R = τ/C.",
      explain: `The 63% point is at t = ${tau} s, so τ = ${tau} s and R = ${tau} ÷ ${Cu} × 10⁻⁶ = ${ds(R * 1000)} Ω = ${ds(R)} kΩ.`,
    });
  }
  if (kind === 2) {
    const e = pick([6, 9, 12, 24]);
    const R = pick([1, 2, 3, 4, 6]);
    const when = pick(["start", "end"] as const);
    return Q({
      key: `rc-i0-${e}-${R}-${when}`,
      prompt: `An uncharged capacitor, a ${R} kΩ resistor and a ${e} V battery are in series. What current flows ${when === "start" ? "just after the switch closes" : "a long time after the switch closes"}, in mA?`,
      visual: circuit({ top: [cell(e), { part: "switch", closed: true }], bottom: [res(`${R} kΩ`), { part: "capacitor" }] }),
      ...kp(when === "start" ? e / R : 0),
      unit: "mA",
      hint: "An uncharged capacitor has no voltage across it (it acts like a wire). A fully charged one passes no current (it acts like a break).",
      explain: when === "start" ? `At first V_C = 0, so all ${e} V is across R: I = ${e} V ÷ ${R} kΩ = ${ds(e / R)} mA.` : "Once charged, V_C = ε and no current flows: 0 mA.",
    });
  }
  if (kind === 3) {
    const Qm = pick([100, 200, 500, 1000]);
    const n = pick([1, 2, 3]);
    const f = 1 - Math.exp(-n);
    return Q({
      key: `rc-frac-${Qm}-${n}`,
      prompt: `A capacitor charging through a resistor will end with ${Qm} μC. How much charge does it hold after ${n} time constant${n > 1 ? "s" : ""}?`,
      ...vals(Qm * f, [Qm * Math.exp(-n), Qm * (n / 5), Qm * 0.5], "μC", 3),
      hint: "Charging: Q = Q_max(1 − e^(−t/τ)). After τ that's 63%.",
      explain: `Q = ${Qm}(1 − e^−${n}) = ${Qm} × ${nf(f, 3)} ≈ ${nf(Qm * f, 3)} μC.`,
    });
  }
  if (kind === 4) {
    const order = shuffle(["A", "B", "C"]);
    const [decay, rise, flat] = order;
    const ask = pick(["current", "V_C", "V_R"] as const);
    const ans = ask === "V_C" ? rise : decay;
    return Q({
      key: `rc-which-${order.join("")}-${ask}`,
      prompt: `A capacitor charges through a resistor from a battery. Which graph shows ${ask === "current" ? "the current" : ask === "V_C" ? "the voltage across the capacitor" : "the voltage across the resistor"} against time?`,
      visual: plot([0, 5], [0, 6], "time", "", {
        curves: [
          { fn: (t) => 5 * Math.exp(-t), label: decay, colour: "berry" },
          { fn: (t) => 5 * (1 - Math.exp(-t)), label: rise, colour: "wave" },
          { fn: () => 2.5, label: flat, colour: "leaf" },
        ],
      }),
      needsVisual: true,
      ...txt(ans, order.filter((x) => x !== ans), 3),
      hint: "As charge builds up, V_C grows toward ε; the voltage left for the resistor, and so the current, shrinks.",
      explain: `V_C rises toward ε (curve ${rise}); V_R = ε − V_C and I = V_R/R both decay exponentially (curve ${decay}).`,
    });
  }
  let items = some([[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3], [4, 1], [3, 2]] as [number, number][], 4);
  while (new Set(items.map(([r, c]) => r * c)).size < 4) items = some([[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3], [4, 1], [3, 2]] as [number, number][], 4);
  const lab = ([r, c]: [number, number]) => `${r === 1 ? "" : r}R, ${c === 1 ? "" : c}C`;
  const order = [...items].sort((x, y) => y[0] * y[1] - x[0] * x[1]);
  return Q({
    key: `rc-rank-${items.map(lab).join("|")}`,
    prompt: "Each RC circuit charges from the same battery. Rank them from slowest to charge to fastest.",
    ...act({ kind: "order", items: order.map(lab), direction: "slowest first" }, 4),
    hint: "The time constant τ = RC sets how fast it charges: bigger τ, slower.",
    explain: order.map((x) => `${lab(x)}: τ = ${x[0] * x[1]}RC`).join("; ") + ".",
  });
}

/** PHYS.11.8 — RC circuits at the start, in steady state, and discharging. */
export function rcSteady(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    for (;;) {
      const e = pick([6, 9, 12, 18]);
      const r1 = pick([1, 2, 3, 4, 6]);
      const r2 = pick([2, 3, 4, 6, 8]);
      const r3 = pick([2, 5, 10]);
      const Cu = pick([2, 5, 10, 20]);
      const Vc = (e * r2) / (r1 + r2);
      if (!twoDp(Vc * Cu)) continue;
      return Q({
        key: `rs-steady-${e}-${r1}-${r2}-${r3}-${Cu}`,
        prompt: `The switch has been closed a long time. How much charge is on the ${Cu} μF capacitor?`,
        visual: circuit({ top: [cell(e), res(r1, { name: "R₁" })], branches: [[res(r2, { name: "R₂" })], [res(r3, { name: "R₃" }), { part: "capacitor", label: Cu, across: "?" }]] }),
        needsVisual: true,
        ...kp(Vc * Cu),
        unit: "μC",
        hint: "In steady state no current flows in the capacitor's branch, so R₃ has no voltage drop. The capacitor's voltage equals R₂'s.",
        explain: `I = ${e} ÷ (${r1} + ${r2}) = ${ds(dp(e / (r1 + r2), 3))} A; V_C = V₂ = ${ds(dp(Vc, 3))} V; Q = ${Cu} × ${ds(dp(Vc, 3))} = ${ds(dp(Vc * Cu, 2))} μC.`,
      });
    }
  }
  if (kind === 1) {
    for (;;) {
      const r1 = pick([2, 4, 6]);
      const [r2, r3] = pick(PAR);
      const I = pick([1, 2, 3]);
      const e = I * (r1 + par(r2, r3));
      if (e > 60) continue;
      return Q({
        key: `rs-start-${r1}-${r2}-${r3}-${I}`,
        prompt: "The capacitor is uncharged. What current leaves the battery just after the switch is closed?",
        visual: circuit({ top: [cell(e), res(r1, { name: "R₁" })], branches: [[res(r2, { name: "R₂" })], [res(r3, { name: "R₃" }), { part: "capacitor" }]] }),
        needsVisual: true,
        ...kp(I),
        unit: "A",
        hint: "At the instant the switch closes an uncharged capacitor acts like a plain wire, so R₃'s branch conducts too.",
        explain: `R = ${r1} + (${r2} ∥ ${r3}) = ${ds(r1 + par(r2, r3))} Ω, so I = ${ds(e)} ÷ ${ds(r1 + par(r2, r3))} = ${I} A. Later the capacitor blocks its branch and the current falls to ${ds(dp(e / (r1 + r2), 2))} A.`,
      });
    }
  }
  if (kind === 2) {
    const V0 = pick([6, 10, 12, 20]);
    const tau = pick([1, 2, 5]);
    const ask = pick(["V", "half"] as const);
    return Q({
      key: `rs-dis-${V0}-${tau}-${ask}`,
      prompt: ask === "V" ? `A capacitor charged to ${V0} V discharges through a resistor; τ = ${tau} s. What is its voltage after ${tau} s?` : `A capacitor discharges through a resistor with τ = ${tau} s. How long until its voltage has halved?`,
      visual: plot([0, 5 * tau], [0, V0 + 2], "t (s)", "V_C (V)", { curves: [{ fn: (t) => (t < 0 ? V0 : V0 * Math.exp(-t / tau)), colour: "berry", label: "V_C" }] }),
      ...(ask === "V" ? vals(V0 / Math.E, [V0 * 0.632, V0 / 2, V0 * Math.exp(-2)], "V", 2) : vals(tau * Math.LN2, [tau / 2, tau, tau * 1.44], "s", 2)),
      hint: "Discharging: V = V₀e^(−t/τ). At t = τ it is 37% of V₀; it halves at t = τ ln 2 ≈ 0.69τ.",
      explain: ask === "V" ? `V = ${V0} × e⁻¹ ≈ ${nf(V0 / Math.E, 2)} V.` : `e^(−t/τ) = ½ gives t = τ ln 2 = ${nf(tau * Math.LN2, 2)} s.`,
    });
  }
  if (kind === 3) {
    const Cu = pick([10, 47, 100, 470, 1000]);
    const V = pick([5, 9, 12]);
    const U = 0.5 * Cu * 1e-6 * V * V;
    return Q({
      key: `rs-energy-${Cu}-${V}`,
      prompt: `In steady state, a ${Cu} μF capacitor in an RC circuit has ${V} V across it. How much energy is stored?`,
      ...vals(U, [Cu * 1e-6 * V * V, 0.5 * Cu * 1e-6 * V, U * 1e6], "J", 2),
      hint: "U = ½CV².",
      explain: `U = ½ × ${Cu} × 10⁻⁶ × ${V}² = ${nf(U, 2)} J.`,
    });
  }
  return Q({
    key: `rs-bulb-${rand(0, 12)}`,
    prompt: "A bulb is connected across a charged capacitor and the battery is then disconnected. What does the bulb do?",
    ...txt("Glows brightly, then fades as the capacitor discharges", ["Stays at a steady brightness", "Never lights", "Gets brighter and brighter"]),
    hint: "The capacitor is now the only source, and its voltage falls as charge flows off it.",
    explain: "Current is largest at first (V₀/R) and decays exponentially as the capacitor loses charge, so the bulb fades out.",
  });
}

/* ====================================================== 4. Magnetism and electromagnetism */

const DIRS: Record<number, string> = { 0: "right", 90: "up", 180: "left", 270: "down" };
const DIR_WORDS = ["right", "up", "left", "down"];
const norm = (d: number) => ((d % 360) + 360) % 360;
/** Direction of qv × B in the page for v in the page and B into (−z) or out of (+z) the page. */
const crossDir = (vdir: number, B: "in" | "out", positive: boolean) => norm(vdir + (B === "in" ? 90 : -90) + (positive ? 0 : 180));
const intoOut = (B: "in" | "out") => (B === "in" ? "into the page" : "out of the page");

/** PHYS.12.1 — magnetic fields, poles, field lines and compasses. */
export function magFields(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const magnet = pick(["NS", "SN"] as const);
    const spot = pick(["left end", "right end", "middle"] as const);
    let ans: string;
    if (spot === "middle") ans = magnet === "NS" ? "right" : "left";
    else {
      const pole = spot === "left end" ? magnet[0] : magnet[1];
      const away = spot === "left end" ? "left" : "right";
      ans = pole === "N" ? away : away === "left" ? "right" : "left";
    }
    return Q({
      key: `mf-compass-${magnet}-${spot}`,
      prompt: spot === "middle" ? "A compass sits just above the middle of this bar magnet. Which way does its north end point?" : `A compass sits just beyond the ${spot} of this bar magnet. Which way does its north end point?`,
      visual: { kind: "phys-magnets", scene: "field", magnet },
      needsVisual: true,
      ...txt(ans, DIR_WORDS.filter((d) => d !== ans), 4),
      hint: "A compass needle's north end points along the field. Outside a magnet, field lines run out of N and into S.",
      explain: spot === "middle" ? `Above the magnet the lines run from the N end to the S end: ${ans}.` : `At that end the field points ${ans}, ${ans === (spot === "left end" ? "left" : "right") ? "away from the N pole" : "into the S pole"}.`,
    });
  }
  if (kind === 1 || kind === 2) {
    const s = pick([
      { q: "The north end of a compass points to Earth's geographic North Pole. What kind of magnetic pole is there?", a: "A magnetic south pole", w: ["A magnetic north pole", "No pole: Earth's field is uniform", "An electric charge"] },
      { q: "Why do field lines of a magnet never cross?", a: "The field has only one direction at each point", w: ["They repel each other", "They do cross inside the magnet", "Lines only start on N poles"] },
      { q: "Where is the field of a bar magnet strongest?", a: "Near the poles, where the lines crowd together", w: ["In the middle, between the poles", "Far from the magnet", "It's the same everywhere"] },
      { q: "A bar magnet is cut in half. What do you get?", a: "Two smaller magnets, each with N and S poles", w: ["One N piece and one S piece", "Two unmagnetized pieces", "One magnet and one plain iron bar"] },
      { q: "Why does a magnet attract an unmagnetized iron nail?", a: "Its field lines up the nail's magnetic domains", w: ["The nail is already a magnet", "Iron carries a net electric charge", "The magnet's gravity is strong"] },
      { q: "How are magnetic field lines different from electric field lines of charges?", a: "They form closed loops: there are no magnetic monopoles", w: ["They start on N charges and end on S charges", "They point toward N poles", "They can cross each other"] },
    ]);
    return Q({
      key: `mf-fact-${s.q.slice(0, 24)}`,
      prompt: s.q,
      ...txt(s.a, s.w),
      hint: "Field lines leave N and enter S outside the magnet, continue inside, and close on themselves. Opposite poles attract.",
      explain: `${s.a}.`,
    });
  }
  const m1 = pick(["NS", "SN"] as const);
  const m2 = pick(["NS", "SN"] as const);
  const repel = m1[1] === m2[0];
  return Q({
    key: `mf-bars-${m1}-${m2}`,
    prompt: "Do these two bar magnets attract or repel?",
    visual: { kind: "phys-magnets", scene: "bars", magnets: [m1, m2] },
    needsVisual: true,
    ...txt(repel ? "Repel" : "Attract", [repel ? "Attract" : "Repel", "Neither"], 3),
    hint: "Look only at the two poles that face each other. Like poles repel; unlike poles attract.",
    explain: `The facing poles are ${m1[1]} and ${m2[0]}: ${repel ? "alike, so they repel" : "opposite, so they attract"}.`,
  });
}

/** PHYS.12.2 — magnetic force on a moving charge, F = qvB sin θ. */
export function magForce(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const p = pick([{ n: "proton", m: MP }, { n: "electron", m: ME }]);
    const v = pick([2, 3, 5, 8]) * 10 ** pick([5, 6]);
    const B = pick([0.1, 0.2, 0.5, 1.5]);
    const th = pick([90, 30, 60]);
    const F = QE * v * B * Math.sin(th * RAD);
    return Q({
      key: `mfc-f-${p.n}-${v}-${B}-${th}`,
      prompt: `A${p.n === "electron" ? "n" : ""} ${p.n} moves at ${sci(v, 1)} m/s at ${th}° to a ${B} T magnetic field. What is the size of the magnetic force on it?`,
      ...vals(F, [QE * v * B, QE * v * B * Math.cos(th * RAD), p.m * v * B], "N", 2, sci),
      hint: "F = |q|vB sin θ, where θ is the angle between v and B.",
      explain: `F = 1.6 × 10⁻¹⁹ × ${sci(v, 1)} × ${B} × sin ${th}° = ${sci(F, 2)} N.`,
    });
  }
  if (kind === 1) {
    const s = pick([
      { t: "parallel to the field", a: "Zero" },
      { t: "at 30° to the field", a: "Half the maximum" },
      { t: "perpendicular to the field", a: "The maximum, qvB" },
      { t: "antiparallel (opposite) to the field", a: "Zero" },
    ]);
    return Q({
      key: `mfc-angle-${s.t}`,
      prompt: `A charge moves ${s.t}. How big is the magnetic force on it?`,
      ...txt(s.a, ["Zero", "Half the maximum", "The maximum, qvB", "Twice the maximum"].filter((x) => x !== s.a)),
      hint: "F = qvB sin θ. Only the part of the velocity perpendicular to B counts.",
      explain: `sin θ is ${s.a === "Zero" ? "0" : s.a === "Half the maximum" ? "½" : "1"} here, so the force is ${s.a.toLowerCase()}.`,
    });
  }
  if (kind === 2) {
    const vdir = pick([0, 90, 180, 270]);
    const B = pick(["in", "out"] as const);
    const pos = pick([true, false]);
    const ans = DIRS[crossDir(vdir, B, pos)];
    return Q({
      key: `mfc-dir-${vdir}-${B}-${pos}`,
      prompt: `A${pos ? " proton" : "n electron"} moves ${DIRS[vdir]} (up the page = up) through a magnetic field pointing ${intoOut(B)}. Which way is the magnetic force on it?`,
      ...txt(ans, DIR_WORDS.filter((d) => d !== ans)),
      hint: "Right-hand rule: fingers along v, curl toward B; your thumb gives F for a positive charge. Flip it for a negative charge.",
      explain: `For a positive charge, F = qv × B points ${DIRS[crossDir(vdir, B, true)]}.${pos ? "" : ` The electron is negative, so the force is reversed: ${ans}.`}`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "How much work does a magnetic field do on a moving charge?", a: "None: the force is always perpendicular to the velocity" },
      { q: "A charged particle moves through a steady magnetic field. What happens to its speed?", a: "It stays the same; only the direction changes" },
    ]);
    return Q({
      key: `mfc-work-${s.q.slice(0, 10)}`,
      prompt: s.q,
      ...txt(s.a, ["None: the force is always perpendicular to the velocity", "It stays the same; only the direction changes", "It increases steadily", "qvB times the distance moved"].filter((x) => x !== s.a)),
      hint: "Work needs a force component along the motion.",
      explain: "The magnetic force is perpendicular to v at every instant, so it does no work and can't change the kinetic energy: it only turns the particle.",
    });
  }
  const E = pick([1, 2, 3, 5]) * 10 ** pick([3, 4]);
  const B = pick([0.01, 0.02, 0.05, 0.1]);
  return Q({
    key: `mfc-selector-${E}-${B}`,
    prompt: `In a velocity selector, crossed fields E = ${sci(E, 1)} V/m and B = ${B} T let only one speed through undeflected. What speed?`,
    ...vals(E / B, [E * B, B / E, E / B / 10], "m/s", 2, sci),
    hint: "Undeflected means the electric and magnetic forces cancel: qE = qvB.",
    explain: `v = E/B = ${sci(E, 1)} ÷ ${B} = ${sci(E / B, 2)} m/s, whatever the charge or mass.`,
  });
}

/** PHYS.12.2, PHYS.12.3 — Do it: draw the magnetic force on a charge or wire, or the field near a wire. */
export function magDoIt(): Question {
  const kind = rand(0, 2);
  if (kind === 0 || kind === 1) {
    const vdir = pick([0, 90, 180, 270]);
    const B = pick(["in", "out"] as const);
    const pos = kind === 1 ? true : pick([true, false]);
    const ans = crossDir(vdir, B, pos);
    const what = kind === 1 ? "a wire carrying current I in the direction shown" : pos ? "a proton moving with velocity v" : "an electron moving with velocity v";
    return Q({
      key: `md-${kind}-${vdir}-${B}-${pos}`,
      prompt: `The magnetic field points ${intoOut(B)}. Drag the F arrow to show the magnetic force on ${what}.`,
      ...act({ kind: "phys-forceArrows", object: kind === 1 ? "dot" : "dot", directions: 4, maxSize: 1, given: [{ dir: vdir, size: 1, label: kind === 1 ? "I" : "v", colour: "grape" }], arrows: [{ label: "F", dir: norm(ans + 180), size: 1, answer: { dir: ans, size: 1 } }], check: "exact" }, ans),
      hint: "Right-hand rule: point your fingers along v (or I), curl them toward B; your thumb gives F. Reverse it for a negative charge.",
      explain: `${kind === 1 ? "F = IL × B" : "F = qv × B"} points ${DIRS[crossDir(vdir, B, true)]} for positive charge${pos ? "" : `; the electron is negative, so F points ${DIRS[ans]}`}.`,
    });
  }
  const current = pick(["in", "out"] as const);
  const phi = pick([0, 90, 180, 270]);
  const ans = norm(phi + (current === "out" ? 90 : -90));
  const where = { 0: "to the right of", 90: "above", 180: "to the left of", 270: "below" }[phi as 0 | 90 | 180 | 270];
  return Q({
    key: `md-wire-${current}-${phi}`,
    prompt: `Point P is just ${where} this wire. Drag the B arrow to show the magnetic field at P.`,
    visual: { kind: "phys-magnets", scene: "wire", current, label: "I" },
    needsVisual: true,
    ...act({ kind: "phys-forceArrows", object: "📍", directions: 4, maxSize: 1, arrows: [{ label: "B", dir: norm(ans + 180), size: 1, answer: { dir: ans, size: 1 } }], check: "exact" }, ans),
    hint: "Right-hand rule for a wire: thumb along the current, fingers curl the way B circles. Current out of the page circles counterclockwise.",
    explain: `Current ${current === "out" ? "out of the page: B circles counterclockwise" : "into the page: B circles clockwise"}, so ${where} the wire B points ${DIRS[ans]}.`,
  });
}

/** PHYS.12.2 — circular motion of charges in magnetic fields. */
export function circularMotion(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const p = pick([{ n: "proton", m: MP }, { n: "electron", m: ME }]);
    const v = pick([1, 2, 5]) * 10 ** (p.n === "proton" ? 6 : 7);
    const B = pick([0.01, 0.05, 0.1, 0.5]);
    const r = (p.m * v) / (QE * B);
    return Q({
      key: `cmo-r-${p.n}-${v}-${B}`,
      prompt: `A${p.n === "electron" ? "n" : ""} ${p.n} moves at ${sci(v, 1)} m/s perpendicular to a ${B} T field. What is the radius of its circle?`,
      ...vals(r, [(QE * B) / (p.m * v), (p.m * v * v) / (QE * B), r * 1000], "m", 2, sci),
      hint: "The magnetic force is the centripetal force: qvB = mv²/r, so r = mv/(qB).",
      explain: `r = ${sci(p.m, 3)} × ${sci(v, 1)} ÷ (1.6 × 10⁻¹⁹ × ${B}) ≈ ${sci(r, 2)} m.`,
    });
  }
  if (kind === 1) {
    const [a, b, name] = pick([[12, 14, "carbon"], [35, 37, "chlorine"], [16, 18, "oxygen"], [20, 22, "neon"], [235, 238, "uranium"]] as const);
    const r = b / a;
    return Q({
      key: `cmo-iso-${name}`,
      prompt: `In a mass spectrometer, ${name}-${a} and ${name}-${b} ions (same charge, same speed) curve in the same field. What is r_${b} ÷ r_${a}?`,
      ...vals(r, [a / b, (b / a) ** 2, Math.sqrt(b / a)], "", 3),
      hint: "r = mv/(qB). With q, v and B the same, r ∝ m.",
      explain: `r ∝ m, so the ratio is ${b}/${a} ≈ ${nf(r, 3)}: the heavier isotope makes the wider circle.`,
    });
  }
  if (kind === 2) {
    const k = pick([2, 3]);
    const what = pick(["radius", "period"] as const);
    const ans = what === "radius" ? `× ${k}` : "Unchanged";
    return Q({
      key: `cmo-speed-${k}-${what}`,
      prompt: `A charged particle circles in a uniform magnetic field. If its speed is multiplied by ${k}, what happens to its ${what}?`,
      ...txt(ans, ["Unchanged", `× ${k}`, `÷ ${k}`, `× ${k * k}`].filter((x) => x !== ans)),
      hint: "r = mv/(qB) and T = 2πr/v = 2πm/(qB).",
      explain: what === "radius" ? `r ∝ v, so the radius is ${k} times as big.` : "T = 2πm/(qB) doesn't involve v: a faster particle runs a bigger circle in the same time.",
    });
  }
  if (kind === 3) {
    const B = pick(["in", "out"] as const);
    const pos = pick([true, false]);
    const cw = (B === "out") === pos;
    return Q({
      key: `cmo-sense-${B}-${pos}`,
      prompt: `A${pos ? " proton" : "n electron"} moves in a circle in a uniform field pointing ${intoOut(B)}. Which way does it go round, as seen on the page?`,
      ...txt(cw ? "Clockwise" : "Counterclockwise", [cw ? "Counterclockwise" : "Clockwise", "It doesn't circle; it moves straight"], 3),
      hint: "Pick a point: say it moves right. Find the force direction with the right-hand rule; the circle bends that way.",
      explain: `Moving right, the force on it points ${DIRS[crossDir(0, B, pos)]}, so it curves ${cw ? "clockwise" : "counterclockwise"}.`,
    });
  }
  const E = pick([2, 4, 6]) * 1e4;
  const B1 = pick([0.1, 0.2]);
  const B2 = pick([0.2, 0.5, 1]);
  const v = E / B1;
  const m = pick([1, 2, 4]) * MP;
  const r = (m * v) / (QE * B2);
  if (kind === 4)
    return Q({
      key: `cmo-spec-${E}-${B1}-${B2}-${m}`,
      prompt: `Ions (+e, mass ${sci(m, 3)} kg) pass a velocity selector with E = ${sci(E, 1)} V/m and B = ${B1} T, then enter a ${B2} T field. What radius do they follow?`,
      ...vals(r, [(m * E) / (QE * B2), (m * v) / (QE * B1), r * 2], "m", 2, sci),
      hint: "Step 1: the selector passes v = E/B. Step 2: in the second field r = mv/(qB).",
      explain: `v = ${sci(E, 1)} ÷ ${B1} = ${sci(v, 2)} m/s; r = ${sci(m, 3)} × ${sci(v, 2)} ÷ (1.6 × 10⁻¹⁹ × ${B2}) ≈ ${sci(r, 2)} m.`,
    });
  return Q({
    key: `cmo-why-${rand(0, 12)}`,
    prompt: "Why does a charged particle moving perpendicular to a uniform magnetic field travel in a circle?",
    ...txt("The force is always perpendicular to v and constant in size", ["The field pulls it toward a center point", "The force is along v, speeding it up", "Its charge changes as it moves"]),
    hint: "Think of a ball on a string: what kind of force makes uniform circular motion?",
    explain: "F = qvB is perpendicular to v and has constant size (speed doesn't change), which is exactly a centripetal force: uniform circular motion.",
  });
}

/** PHYS.12.2 — magnetic force on a current-carrying wire. */
export function wireForce(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const B = pick([0.1, 0.2, 0.4, 0.5]);
    const I = pick([2, 4, 5, 10]);
    const L = pick([0.2, 0.5, 1]);
    const th = pick([90, 30]);
    const F = B * I * L * Math.sin(th * RAD);
    return Q({
      key: `wf-f-${B}-${I}-${L}-${th}`,
      prompt: `A ${L} m wire carrying ${I} A sits at ${th}° to a ${B} T field. What force acts on it?`,
      ...kp(dp(F, 3)),
      unit: "N",
      hint: "F = ILB sin θ.",
      explain: `F = ${I} × ${L} × ${B} × sin ${th}° = ${ds(dp(F, 3))} N.`,
    });
  }
  if (kind === 1) {
    const idir = pick([0, 90, 180, 270]);
    const B = pick(["in", "out"] as const);
    const ans = DIRS[crossDir(idir, B, true)];
    return Q({
      key: `wf-dir-${idir}-${B}`,
      prompt: `A wire carries current ${DIRS[idir]} (on the page) through a field pointing ${intoOut(B)}. Which way is the force on the wire?`,
      ...txt(ans, DIR_WORDS.filter((d) => d !== ans)),
      hint: "F = IL × B: fingers along I, curl toward B, thumb gives F.",
      explain: `I ${DIRS[idir]} crossed with B ${intoOut(B)} gives a force ${ans}.`,
    });
  }
  if (kind === 2) {
    const m = pick([5, 10, 20, 50]);
    const L = pick([0.2, 0.5]);
    const B = pick([0.1, 0.2, 0.5]);
    const I = ((m / 1000) * 9.8) / (B * L);
    return Q({
      key: `wf-float-${m}-${L}-${B}`,
      prompt: `A ${m} g, ${L} m horizontal wire hangs in a horizontal ${B} T field perpendicular to it. What current makes the magnetic force hold it up?`,
      ...vals(I, [(m * 9.8) / (B * L), (m / 1000) / (B * L), I / 9.8], "A", 2),
      hint: "Balance: ILB = mg. Use m in kg and g = 9.8 m/s².",
      explain: `I = mg/(LB) = ${m / 1000} × 9.8 ÷ (${L} × ${B}) ≈ ${nf(I, 2)} A.`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "A current-carrying wire lies parallel to a magnetic field. What force acts on it?", a: "None" },
      { q: "A rectangular current loop sits in a uniform field, its plane parallel to the field. What does the field do to it?", a: "Zero net force, but a torque that turns it" },
    ]);
    return Q({
      key: `wf-fact-${s.a}`,
      prompt: s.q,
      ...txt(s.a, ["None", "Zero net force, but a torque that turns it", "A net force along the field", "It pushes the whole loop sideways"].filter((x) => x !== s.a)),
      hint: "F = ILB sin θ, with θ between the wire and B. On a loop, opposite sides carry opposite currents.",
      explain: s.a === "None" ? "θ = 0°, so sin θ = 0 and F = 0." : "Opposite sides feel equal and opposite forces (no net force) along different lines, making a torque: that's how a motor turns.",
    });
  }
  const k = pick([2, 3]);
  return Q({
    key: `wf-scale-${k}`,
    prompt: `The current in a wire in a magnetic field is multiplied by ${k} and the length in the field is halved. By what factor does the force change?`,
    ...vals(k / 2, [k * 2, k, 1 / (2 * k)], "", 3, (x) => `× ${nf(x, 3)}`),
    hint: "F = ILB: proportional to I and to L.",
    explain: `${k} × ½ = ${ds(k / 2)}.`,
  });
}

/** PHYS.12.3 — magnetic fields made by currents. */
export function currentFields(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const I = pick([2, 5, 10, 20]);
    const r = pick([1, 2, 4, 5, 10]);
    const B = (20 * I) / r;
    return Q({
      key: `cf-b-${I}-${r}`,
      prompt: `What is the magnetic field ${r} cm from a long straight wire carrying ${I} A? (μ₀ = 4π × 10⁻⁷ T·m/A)`,
      ...kp(B),
      unit: "μT",
      hint: "B = μ₀I/(2πr), with r in meters. 1 μT = 10⁻⁶ T.",
      explain: `B = 4π × 10⁻⁷ × ${I} ÷ (2π × ${r / 100}) = ${sci(B * 1e-6, 2)} T = ${ds(B)} μT.`,
    });
  }
  if (kind === 1) {
    const current = pick(["in", "out"] as const);
    const phi = pick([0, 90, 180, 270]);
    const ans = DIRS[norm(phi + (current === "out" ? 90 : -90))];
    const where = { 0: "to the right of", 90: "above", 180: "to the left of", 270: "below" }[phi as 0 | 90 | 180 | 270];
    return Q({
      key: `cf-dir-${current}-${phi}`,
      prompt: `Which way does the magnetic field point at a spot just ${where} this wire?`,
      visual: { kind: "phys-magnets", scene: "wire", current, label: "I" },
      needsVisual: true,
      ...txt(ans, DIR_WORDS.filter((d) => d !== ans)),
      hint: "Thumb along the current (• out of the page, ✕ into it); your fingers curl the way the field lines go.",
      explain: `The field circles ${current === "out" ? "counterclockwise" : "clockwise"}, so ${where} the wire it points ${ans}.`,
    });
  }
  if (kind === 2) {
    const k = pick([2, 3, 4]);
    return Q({
      key: `cf-scale-${k}`,
      prompt: `The field ${k === 4 ? "4 cm" : "2 cm"} from a long wire is B. What is it ${k === 4 ? "1 cm" : `${2 * k} cm`} from the wire?`,
      ...txt(k === 4 ? "4B" : `B/${k}`, k === 4 ? ["B/4", "16B", "2B"] : [`B/${k * k}`, `${k}B`, `${k * k}B`]),
      hint: "For a long straight wire, B ∝ 1/r (not 1/r²).",
      explain: k === 4 ? "4 times closer gives 4 times the field: 4B." : `${k} times farther gives 1/${k} of the field: B/${k}.`,
    });
  }
  if (kind === 3) {
    const I = pick([2, 5, 10]);
    const d = pick([4, 10, 20]);
    const same = pick([true, false]);
    const B = same ? 0 : 2 * ((20 * I) / (d / 2));
    return Q({
      key: `cf-two-${I}-${d}-${same}`,
      prompt: `Two long parallel wires ${d} cm apart each carry ${I} A, ${same ? "in the same direction" : "in opposite directions"}. What is the field halfway between them, in μT?`,
      ...kp(B),
      unit: "μT",
      hint: "Find each wire's field at the midpoint (B = μ₀I/(2πr)) and its direction. Do they add or cancel?",
      explain: same ? "Between currents in the same direction the two fields point opposite ways and, being equal, cancel: 0 μT." : `They point the same way and add: 2 × ${ds((20 * I) / (d / 2))} = ${ds(B)} μT.`,
    });
  }
  const n = pick([500, 1000, 2000, 5000]);
  const I = pick([0.5, 1, 2, 3]);
  const B = MU0 * n * I;
  return Q({
    key: `cf-sol-${n}-${I}`,
    prompt: `A long solenoid has ${n} turns per meter and carries ${I} A. What is the field inside?`,
    ...vals(B * 1000, [B * 1000 * 2 * Math.PI, (MU0 * I) / (2 * Math.PI) * 1000 * n / 100, B * 1e6], "mT", 2),
    hint: "Inside a long solenoid the field is uniform: B = μ₀nI, with n in turns per meter.",
    explain: `B = 4π × 10⁻⁷ × ${n} × ${I} ≈ ${sci(B, 2)} T = ${nf(B * 1000, 2)} mT.`,
  });
}

/** PHYS.12.3 — forces between parallel currents. */
export function parallelWires(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const I1 = pick([2, 5, 10, 20]);
    const I2 = pick([2, 5, 10]);
    const d = pick([1, 2, 5, 10]);
    const f = (2e-7 * I1 * I2) / (d / 100);
    return Q({
      key: `pw-f-${I1}-${I2}-${d}`,
      prompt: `Two long parallel wires ${d} cm apart carry ${I1} A and ${I2} A. What is the force per meter of length between them?`,
      ...vals(f, [(2e-7 * I1 * I2) / d, (MU0 * I1 * I2) / (d / 100), f / 2], "N/m", 2, sci),
      hint: "Wire 1's field at wire 2 is μ₀I₁/(2πd); the force per length on wire 2 is I₂ times that.",
      explain: `F/L = μ₀I₁I₂/(2πd) = 2 × 10⁻⁷ × ${I1} × ${I2} ÷ ${d / 100} = ${sci(f, 2)} N/m.`,
    });
  }
  if (kind === 1) {
    const same = pick([true, false]);
    return Q({
      key: `pw-ar-${same}-${rand(0, 5)}`,
      prompt: `Two parallel wires carry currents in ${same ? "the same direction" : "opposite directions"}. What do they do?`,
      ...txt(same ? "Attract" : "Repel", [same ? "Repel" : "Attract", "Nothing: currents don't push on each other", "Twist at right angles"]),
      hint: "Find the field of wire 1 at wire 2, then the force on wire 2 with F = IL × B.",
      explain: same ? "Parallel currents attract (the opposite of charges!)." : "Antiparallel currents repel.",
    });
  }
  if (kind === 2) {
    const k = pick([2, 3, 4]);
    return Q({
      key: `pw-third-${k}`,
      prompt: `Wire A carries ${k} times the current of wire B, parallel to it. How do the forces on the two wires compare?`,
      ...txt("Equal in size, opposite in direction", [`A's is ${k} times B's`, `B's is ${k} times A's`, `A's is ${k * k} times B's`]),
      hint: "F/L = μ₀I_AI_B/(2πd) is symmetric in the two currents.",
      explain: "Each force uses the product I_A I_B, so they're equal in size and opposite: Newton's third law.",
    });
  }
  const [a, b, c] = pick([[2, 2, 2], [2, 1, 2], [3, 1, 3], [2, 2, 4], [1, 1, 2], [3, 3, 3]]);
  const f = (a * b) / c;
  return Q({
    key: `pw-scale-${a}-${b}-${c}`,
    prompt: `Two parallel wires: one current is multiplied by ${a}, the other by ${b}, and the distance by ${c}. By what factor does the force per length change?`,
    ...vals(f, [(a * b) / (c * c), a * b * c, a + b - c], "", 3, (x) => `× ${nf(x, 3)}`),
    hint: "F/L ∝ I₁I₂/d.",
    explain: `${a} × ${b} ÷ ${c} = ${ds(f)}.`,
  });
}

/** PHYS.12.4 — magnetic flux and Faraday's law. */
export function faraday(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const B = pick([0.2, 0.4, 0.5, 1.2]);
    const A = pick([0.01, 0.02, 0.05, 0.5]);
    const th = pick([0, 60, 90]);
    const phi = B * A * Math.cos(th * RAD);
    const ans = th === 90 ? "0 Wb" : `${nf(phi, 2)} Wb`;
    return Q({
      key: `fa-flux-${B}-${A}-${th}`,
      prompt: `A loop of area ${A} m² sits in a ${B} T field. The field makes ${th}° with the loop's normal (the line perpendicular to its face). What flux passes through it?`,
      ...txt(ans, [`${nf(B * A, 2)} Wb`, `${nf(B * A * 0.5, 2)} Wb`, `${nf(B / A, 2)} Wb`, `${nf(B * A * 0.87, 2)} Wb`, "0 Wb"].filter((x) => x !== ans)),
      hint: "Φ = BA cos θ, where θ is between B and the normal to the loop.",
      explain: `Φ = ${B} × ${A} × cos ${th}° = ${ans}.`,
    });
  }
  if (kind === 1) {
    const N = pick([10, 50, 100, 200]);
    const A = pick([0.01, 0.02, 0.05]);
    const B1 = pick([0, 0.2, 0.5]);
    const B2 = pick([0.6, 0.8, 1, 1.5]);
    const dt = pick([0.1, 0.2, 0.5]);
    const emf = (N * A * (B2 - B1)) / dt;
    return Q({
      key: `fa-emf-${N}-${A}-${B1}-${B2}-${dt}`,
      prompt: `A ${N}-turn coil of area ${A} m² lies face-on to a field that rises from ${B1} T to ${B2} T in ${dt} s. What emf is induced?`,
      ...vals(emf, [(A * (B2 - B1)) / dt, (N * A * B2) / dt, N * A * (B2 - B1) * dt], "V", 2),
      hint: "Faraday's law: |ε| = N ΔΦ/Δt, with ΔΦ = AΔB here.",
      explain: `ΔΦ = ${A} × ${clean(B2 - B1)} = ${clean(A * (B2 - B1))} Wb per turn, so ε = ${N} × ${clean(A * (B2 - B1))} ÷ ${dt} = ${nf(emf, 2)} V.`,
    });
  }
  if (kind === 2) {
    const t = [0, 2, 4, 6];
    const slopes = shuffle([0, pick([1, 2]), pick([3, 4]) * pick([1, -1])]);
    const phis = [pick([0, 2])];
    for (let i = 0; i < 3; i++) phis.push(phis[i] + slopes[i] * 2);
    const lo = Math.min(...phis);
    const shift = lo < 0 ? -lo : 0;
    const P = phis.map((p) => p + shift);
    const ask = pick(["largest", "zero", "value"] as const);
    const regions = ["A", "B", "C"];
    const iBig = slopes.map(Math.abs).indexOf(Math.max(...slopes.map(Math.abs)));
    const iZero = slopes.indexOf(0);
    const ri = ask === "value" ? pick([0, 1, 2].filter((i) => i !== iZero)) : 0;
    return Q({
      key: `fa-graph-${slopes.join("_")}-${P[0]}-${ask}-${ri}`,
      prompt:
        ask === "value"
          ? `The flux through a one-turn loop. What emf is induced during interval ${regions[ri]} (A: 0–2 s, B: 2–4 s, C: 4–6 s)?`
          : `The flux through a loop. In which interval (A: 0–2 s, B: 2–4 s, C: 4–6 s) is the induced emf ${ask === "largest" ? "largest" : "zero"}?`,
      visual: plot([0, 6], [0, Math.max(...P) + 2], "t (s)", "Φ (Wb)", { lines: [0, 1, 2].map((i) => ({ from: [t[i], P[i]] as [number, number], to: [t[i + 1], P[i + 1]] as [number, number], colour: "berry" as Colour })), points: t.map((x, i) => ({ x, y: P[i] })) }),
      needsVisual: true,
      ...(ask === "value" ? kp(Math.abs(slopes[ri])) : txt(regions[ask === "largest" ? iBig : iZero], regions.filter((_, i) => i !== (ask === "largest" ? iBig : iZero)), 3)),
      unit: ask === "value" ? "V" : undefined,
      hint: "The emf is the rate of change of flux: the slope of the Φ–t graph, not its height.",
      explain: ask === "value" ? `In ${regions[ri]} the flux changes ${Math.abs(slopes[ri] * 2)} Wb in 2 s: |ε| = ${Math.abs(slopes[ri])} V.` : ask === "largest" ? `${regions[iBig]} is steepest (${Math.abs(slopes[iBig])} Wb/s), so its emf is largest.` : `${regions[iZero]} is flat: the flux isn't changing, so no emf, even though the flux isn't zero.`,
    });
  }
  if (kind === 3) {
    const N = pick([20, 50, 100]);
    const rate = pick([0.02, 0.05, 0.1, 0.2]);
    const R = pick([2, 4, 5, 10]);
    const I = (N * rate) / R;
    return Q({
      key: `fa-i-${N}-${rate}-${R}`,
      prompt: `The flux through each turn of a ${N}-turn coil changes at ${rate} Wb/s. The coil's resistance is ${R} Ω. What current is induced?`,
      ...kp(dp(I, 3)),
      unit: "A",
      hint: "ε = N ΔΦ/Δt, then I = ε/R.",
      explain: `ε = ${N} × ${rate} = ${ds(N * rate)} V, so I = ${ds(N * rate)} ÷ ${R} = ${ds(dp(I, 3))} A.`,
    });
  }
  if (kind === 4) {
    const s = pick([
      { q: "A coil turns steadily in a uniform field. When is its emf largest?", a: "When its plane is parallel to the field (flux zero, changing fastest)" },
      { q: "A coil turns steadily in a uniform field. When is its emf zero?", a: "When its plane faces the field (flux greatest, momentarily not changing)" },
    ]);
    return Q({
      key: `fa-gen-${s.q.slice(-15)}`,
      prompt: s.q,
      ...txt(s.a, ["When its plane is parallel to the field (flux zero, changing fastest)", "When its plane faces the field (flux greatest, momentarily not changing)", "Never: the emf is constant", "Only when it stops turning"].filter((x) => x !== s.a)),
      hint: "Emf depends on how fast the flux changes, which is the slope of Φ = BA cos ωt.",
      explain: "Φ = BA cos ωt and ε = NBAω sin ωt: ε peaks where Φ passes through zero and is zero where Φ peaks.",
    });
  }
  const ok = pick(["Moving a magnet into a coil", "Spinning a coil in a magnetic field", "Changing the current in a nearby coil", "Shrinking a loop in a steady field"]);
  return Q({
    key: `fa-how-${ok}`,
    prompt: "Which of these induces a current in a closed loop?",
    ...txt(ok, ["Holding a strong magnet still inside the coil", "Sliding the loop around inside a uniform field", "A steady DC current in a nearby wire"]),
    hint: "Only a changing magnetic flux through the loop induces an emf.",
    explain: `${ok} changes the flux through the loop; the others keep the flux constant.`,
  });
}

/** PHYS.12.4 — Lenz's law: the direction of induced currents. */
export function lenz(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const pole = pick(["N", "S"] as const);
    const toward = pick([true, false]);
    // Viewed from the magnet's side.
    const ccw = (pole === "N") === toward;
    return Q({
      key: `lz-magnet-${pole}-${toward}`,
      prompt: `The ${pole} pole of a magnet is ${toward ? "pushed toward" : "pulled away from"} a wire loop. Looking at the loop from the magnet's side, which way does the induced current flow?`,
      visual: { kind: "phys-magnets", scene: "field", magnet: pole === "N" ? "SN" : "NS" },
      ...txt(ccw ? "Counterclockwise" : "Clockwise", [ccw ? "Clockwise" : "Counterclockwise", "No current flows"], 3),
      hint: "The induced current makes a field that opposes the change in flux. Approaching N pole: the loop's near face becomes N to push back.",
      explain: `${toward ? "The flux grows, so the loop opposes it" : "The flux shrinks, so the loop tries to keep it"}: its face toward the magnet becomes ${toward ? pole : pole === "N" ? "S" : "N"}. Seen from the magnet, a${toward === (pole === "N") ? " N face has counterclockwise" : " S face has clockwise"} current.`,
    });
  }
  if (kind === 1) {
    const toward = pick([true, false]);
    return Q({
      key: `lz-force-${toward}-${rand(0, 5)}`,
      prompt: `A magnet is ${toward ? "pushed toward" : "pulled away from"} a closed copper ring. What force does the ring's induced current exert on the magnet?`,
      ...txt(toward ? "It repels the magnet, opposing the approach" : "It attracts the magnet, opposing the separation", [toward ? "It attracts the magnet" : "It repels the magnet", "No force: copper isn't magnetic", "A force that helps the motion along"]),
      hint: "Lenz's law: the induced effects oppose the change that causes them. Otherwise you'd get energy for free.",
      explain: toward ? "The ring opposes the approach by repelling the magnet: you must do work, which becomes electrical energy." : "The ring opposes the separation by attracting the magnet.",
    });
  }
  if (kind === 2) {
    const stage = pick(["entering", "inside", "leaving"] as const);
    const B = pick(["in", "out"] as const);
    const ans = stage === "inside" ? "No current" : (stage === "entering") === (B === "in") ? "Counterclockwise" : "Clockwise";
    return Q({
      key: `lz-region-${stage}-${B}`,
      prompt: `A square loop moves right at steady speed through a region of uniform field pointing ${intoOut(B)}. Which way does current flow while the loop is ${stage === "inside" ? "completely inside the field" : stage === "entering" ? "entering the field" : "leaving the field"}?`,
      ...txt(ans, ["Clockwise", "Counterclockwise", "No current"].filter((x) => x !== ans), 3),
      hint: "Is the flux through the loop growing, shrinking or steady? The induced field opposes the change.",
      explain: stage === "inside" ? "Fully inside, the flux is constant, so no emf and no current." : `The flux ${intoOut(B)} is ${stage === "entering" ? "growing" : "shrinking"}, so the induced field points ${stage === "entering" ? (B === "in" ? "out of" : "into") : intoOut(B).replace(" the page", "")} the page: ${ans.toLowerCase()} current.`,
    });
  }
  if (kind === 3) {
    return Q({
      key: `lz-tube-${rand(0, 12)}`,
      prompt: "A strong magnet dropped down a vertical copper pipe falls much more slowly than in free fall. Why?",
      ...txt("Currents induced in the pipe make fields that oppose its motion", ["Copper is attracted to magnets", "Air inside the pipe is compressed", "The pipe's gravity pulls up on the magnet"]),
      hint: "The magnet's moving field changes the flux through every ring of the pipe.",
      explain: "Eddy currents are induced in the pipe above and below the magnet; by Lenz's law their fields push up on it, slowing its fall. Its lost energy heats the pipe.",
    });
  }
  const B = pick(["in", "out"] as const);
  const grow = pick([true, false]);
  const ccw = (B === "in") === grow;
  return Q({
    key: `lz-changing-${B}-${grow}`,
    prompt: `A loop lies flat on the page in a uniform field pointing ${intoOut(B)}. The field is ${grow ? "increasing" : "decreasing"}. Which way does the induced current flow?`,
    ...txt(ccw ? "Counterclockwise" : "Clockwise", [ccw ? "Clockwise" : "Counterclockwise", "No current"], 3),
    hint: "Find the induced field (opposing the change), then use the right-hand rule: counterclockwise current makes a field out of the page.",
    explain: `The flux ${intoOut(B)} is ${grow ? "increasing, so the induced field points the other way" : "decreasing, so the induced field points the same way to prop it up"}: ${ccw ? "out of the page, which needs counterclockwise current" : "into the page, which needs clockwise current"}.`,
  });
}

const INDUCE = [
  { t: "A magnet is pushed into a coil", b: 0 },
  { t: "A magnet is pulled out of a coil", b: 0 },
  { t: "A coil spins in a steady magnetic field", b: 0 },
  { t: "The current in a nearby coil is switched on", b: 0 },
  { t: "A loop is squashed smaller inside a steady field", b: 0 },
  { t: "A loop slides into a magnetic field region", b: 0 },
  { t: "AC current flows in a neighboring coil", b: 0 },
  { t: "A magnet rests inside a coil", b: 1 },
  { t: "A loop slides around entirely inside a uniform field", b: 1 },
  { t: "A steady DC current flows in a nearby coil", b: 1 },
  { t: "A loop sits still in a strong steady field", b: 1 },
  { t: "A magnet and coil move together at the same velocity", b: 1 },
  { t: "A loop lies with its plane parallel to a changing field", b: 1 },
];

/** PHYS.12.4 — Do it: sort situations that do and don't induce a current; rank induced emfs. */
export function inductionDoIt(): Question {
  if (rand(0, 2) > 0) {
    let items = some(INDUCE, 6);
    while (new Set(items.map((i) => i.b)).size < 2) items = some(INDUCE, 6);
    return Q({
      key: `id-sort-${items.map((i) => INDUCE.indexOf(i)).sort((a, b) => a - b).join("-")}`,
      prompt: "Sort each situation: is a current induced in the loop or coil?",
      ...act({ kind: "sort", bins: ["current induced", "no current"], items: items.map((i) => ({ label: i.t, bin: i.b })) }, items.filter((i) => i.b === 0).length),
      hint: "Ask one question: is the magnetic flux through the loop changing?",
      explain: `Changing flux, so current: ${items.filter((i) => i.b === 0).map((i) => i.t.toLowerCase()).join("; ")}. Steady flux, no current: ${items.filter((i) => i.b === 1).map((i) => i.t.toLowerCase()).join("; ")}.`,
    });
  }
  for (;;) {
    const items = Array.from({ length: 4 }, () => ({ N: pick([50, 100, 200]), dB: pick([0.1, 0.2, 0.4]), dt: pick([0.1, 0.2, 0.4]) }));
    const val = (i: (typeof items)[number]) => (i.N * i.dB) / i.dt;
    const lab = (i: (typeof items)[number]) => `${i.N} turns, ΔB = ${i.dB} T in ${i.dt} s`;
    if (new Set(items.map((i) => val(i).toFixed(6))).size < 4) continue;
    const order = [...items].sort((a, b) => val(b) - val(a));
    return Q({
      key: `id-rank-${items.map(lab).join("|")}`,
      prompt: "Coils of the same area sit face-on to changing fields. Rank them from largest induced emf to smallest.",
      ...act({ kind: "order", items: order.map(lab), direction: "largest emf first" }, 4),
      hint: "ε = NAΔB/Δt. Same area, so compare N × ΔB ÷ Δt.",
      explain: order.map((i) => `${lab(i)} → ${nf(val(i), 3)}`).join("; ") + " (× area).",
    });
  }
}

/** PHYS.12.4 — motional emf, ε = BLv. */
export function motionalEmf(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const B = pick([0.2, 0.4, 0.5, 0.8]);
    const L = pick([0.2, 0.5, 1]);
    const v = pick([2, 4, 5, 10]);
    return Q({
      key: `me-emf-${B}-${L}-${v}`,
      prompt: `A ${L} m metal rod slides at ${v} m/s along rails, perpendicular to a ${B} T field. What emf is induced across it?`,
      ...kp(dp(B * L * v, 3)),
      unit: "V",
      hint: "Motional emf: ε = BLv.",
      explain: `ε = ${B} × ${L} × ${v} = ${ds(dp(B * L * v, 3))} V. (The loop's area grows at Lv each second, so ΔΦ/Δt = BLv.)`,
    });
  }
  if (kind === 1) {
    const B = pick([0.5, 1]);
    const L = pick([0.2, 0.5]);
    const v = pick([2, 4, 6]);
    const R = pick([0.5, 1, 2]);
    const I = (B * L * v) / R;
    const ask = pick(["I", "F"] as const);
    return Q({
      key: `me-force-${B}-${L}-${v}-${R}-${ask}`,
      prompt: `A ${L} m rod moves at ${v} m/s on rails in a ${B} T field; the circuit's resistance is ${R} Ω. ${ask === "I" ? "What current flows?" : "What force keeps the rod moving at steady speed?"}`,
      ...kp(dp(ask === "I" ? I : I * L * B, 3)),
      unit: ask === "I" ? "A" : "N",
      hint: "ε = BLv, I = ε/R, and the magnetic drag on the rod is F = ILB (it opposes the motion, as Lenz says).",
      explain: `ε = ${ds(B * L * v)} V, I = ${ds(dp(I, 3))} A${ask === "F" ? `, F = ILB = ${ds(dp(I, 3))} × ${L} × ${B} = ${ds(dp(I * L * B, 3))} N` : ""}.`,
    });
  }
  if (kind === 2) {
    const B = pick(["in", "out"] as const);
    const move = pick([0, 180]);
    const up = crossDir(move, B, true) === 90;
    return Q({
      key: `me-dir-${B}-${move}`,
      prompt: `A vertical rod slides ${DIRS[move]} along horizontal rails in a field pointing ${intoOut(B)}. Which way does the induced current flow in the rod?`,
      ...txt(up ? "Up the rod" : "Down the rod", [up ? "Down the rod" : "Up the rod", "No current flows"], 3),
      hint: "The rod's positive charges move with it: F = qv × B on them pushes them along the rod.",
      explain: `v ${DIRS[move]} × B ${intoOut(B)} points ${up ? "up" : "down"}, so current flows ${up ? "up" : "down"} the rod.`,
    });
  }
  if (kind === 3) {
    const B = pick([0.5, 1]);
    const L = pick([0.5, 1]);
    const v = pick([2, 4]);
    const R = pick([1, 2, 4]);
    const P = (B * L * v) ** 2 / R;
    return Q({
      key: `me-power-${B}-${L}-${v}-${R}`,
      prompt: `A ${L} m rod is pushed at ${v} m/s on rails in a ${B} T field; the circuit has ${R} Ω. What power must the push supply?`,
      ...kp(dp(P, 3)),
      unit: "W",
      hint: "Energy is conserved: the push's power Fv equals the electrical power ε²/R.",
      explain: `ε = ${ds(B * L * v)} V, P = ε²/R = ${ds(dp(P, 3))} W, which ends up as heat in the resistor.`,
    });
  }
  const span = pick([30, 40, 50, 60]);
  const v = pick([200, 250]);
  const Bv = 5e-5;
  return Q({
    key: `me-plane-${span}-${v}`,
    prompt: `A jet with a ${span} m wingspan flies level at ${v} m/s where the vertical part of Earth's field is 5.0 × 10⁻⁵ T. What emf appears between its wingtips?`,
    ...vals(Bv * span * v, [Bv * span, Bv * v, Bv * span * v * 1000], "V", 2),
    hint: "The wing is a rod cutting the vertical field lines: ε = BLv.",
    explain: `ε = 5.0 × 10⁻⁵ × ${span} × ${v} = ${nf(Bv * span * v, 2)} V.`,
  });
}

/* ================================================================== 5. Geometric optics */

/** Object and image distances with whole-number answers: [f, do, |di|]. */
const REAL: [number, number, number][] = [[10, 15, 30], [10, 20, 20], [10, 30, 15], [10, 60, 12], [12, 18, 36], [12, 24, 24], [12, 36, 18], [15, 20, 60], [15, 30, 30], [20, 30, 60], [20, 40, 40], [20, 60, 30], [8, 12, 24], [8, 24, 12], [6, 9, 18], [6, 12, 12], [6, 18, 9], [5, 10, 10], [4, 12, 6], [12, 16, 48], [12, 15, 60]];
const VIRTUAL: [number, number, number][] = [[10, 5, 10], [12, 6, 12], [12, 8, 24], [15, 10, 30], [20, 10, 20], [20, 15, 60], [8, 4, 8], [6, 4, 12], [16, 8, 16], [30, 20, 60]];
const DIVERGE: [number, number, number][] = [[10, 15, 6], [10, 40, 8], [12, 24, 8], [12, 36, 9], [12, 60, 10], [20, 30, 12], [20, 60, 15], [20, 80, 16], [6, 12, 4], [6, 30, 5], [15, 30, 10], [15, 10, 6], [6, 3, 2], [30, 20, 12], [30, 60, 20]];

/** Magnification of an upright virtual image as a fraction, with sign slips and the upside-down ratio as distractors. */
const magChoices = (di: number, d: number): Answer => {
  const g = gcd(di, d);
  const f = (a: number, b: number) => (b === 1 ? String(a) : `${a}/${b}`);
  return txt(f(di / g, d / g), [`−${f(di / g, d / g)}`, f(d / g, di / g), `−${f(d / g, di / g)}`]);
};
type Optic = "converging" | "diverging" | "concave" | "convex";
const lensV = (optic: Optic, f: number, d: number, more: { showImage?: boolean; image?: number | string; rays?: boolean; twoF?: boolean; height?: number } = {}): Visual => ({
  kind: "phys-rays",
  scene: "lens",
  optic,
  focal: f,
  object: d,
  showImage: more.showImage,
  rays: more.rays,
  twoF: more.twoF,
  height: more.height,
  labels: { f, object: d, image: more.image },
  unit: "cm",
});
const NATURES = ["real, inverted, smaller", "real, inverted, larger", "real, inverted, same size", "virtual, upright, larger", "virtual, upright, smaller"];
const nature = (optic: Optic, f: number, d: number) => {
  const { di, m } = lensImage(optic, f, d);
  const size = Math.abs(Math.abs(m) - 1) < 1e-9 ? "same size" : Math.abs(m) > 1 ? "larger" : "smaller";
  return di > 0 ? `real, inverted, ${size}` : `virtual, upright, ${size}`;
};

/** PHYS.13.1 — the law of reflection and plane mirrors. */
export function reflection(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const a = rand(2, 14) * 5;
    const glancing = rand(0, 1) === 1;
    return Q({
      key: `rf-law-${a}-${glancing}`,
      prompt: glancing ? `A ray strikes a flat mirror making ${90 - a}° with the mirror's surface. What is the angle of reflection?` : "What is the angle of reflection?",
      visual: { kind: "phys-rays", scene: "mirror", angle: a, incident: glancing ? null : a, reflected: "?", ends: true },
      needsVisual: !glancing,
      ...kp(a),
      unit: "°",
      hint: "Angles are measured from the normal (the dashed line perpendicular to the mirror). Angle of incidence = angle of reflection.",
      explain: glancing ? `${90 - a}° from the surface is ${a}° from the normal, so the ray reflects at ${a}°.` : `The angle of reflection equals the angle of incidence: ${a}°.`,
    });
  }
  if (kind === 1) {
    const al = pick([5, 10, 15, 20, 25]);
    return Q({
      key: `rf-rotate-${al}`,
      prompt: `A mirror is turned through ${al}° while the incoming ray stays fixed. Through what angle does the reflected ray turn?`,
      ...kp(2 * al),
      unit: "°",
      hint: "Turning the mirror turns the normal by the same angle, changing both the incidence and the reflection angles.",
      explain: `The angle of incidence changes by ${al}°, and so does the angle of reflection, so the reflected ray swings 2 × ${al}° = ${2 * al}°.`,
    });
  }
  if (kind === 2) {
    const d = pick([1, 1.5, 2, 2.5, 3]);
    const v = pick([0.5, 1, 1.5]);
    const ask = pick(["dist", "speed"] as const);
    return Q({
      key: `rf-plane-${d}-${v}-${ask}`,
      prompt: ask === "dist" ? `You stand ${d} m in front of a flat mirror. How far are you from your image?` : `You walk toward a flat mirror at ${v} m/s. How fast does your image approach you?`,
      ...kp(ask === "dist" ? 2 * d : 2 * v),
      unit: ask === "dist" ? "m" : "m/s",
      hint: "A plane mirror's image is as far behind the mirror as the object is in front.",
      explain: ask === "dist" ? `The image is ${d} m behind the mirror, so it's ${d} + ${d} = ${2 * d} m from you.` : `You and your image each close in on the mirror at ${v} m/s, so the gap shrinks at ${2 * v} m/s.`,
    });
  }
  if (kind === 3) {
    const h = pick([1.5, 1.6, 1.7, 1.8, 1.9]);
    return Q({
      key: `rf-height-${h}`,
      prompt: `What is the shortest flat wall mirror in which a ${h} m tall person can see their whole body?`,
      ...kp(h / 2),
      unit: "m",
      hint: "Draw rays from your head and your feet to your eye. Each reflects halfway between.",
      explain: `Each reflection point is halfway up between eye and head, or eye and feet, so the mirror needs half your height: ${ds(h / 2)} m, wherever you stand.`,
    });
  }
  if (kind === 4) {
    const th = pick([90, 60, 45, 30, 120, 72]);
    return Q({
      key: `rf-images-${th}`,
      prompt: `Two flat mirrors meet at ${th}°. How many images of an object between them can you see?`,
      ...kp(360 / th - 1),
      hint: "For mirrors at angle θ (dividing 360°), the number of images is 360°/θ − 1.",
      explain: `360 ÷ ${th} − 1 = ${360 / th - 1} images.`,
    });
  }
  const s = pick([
    { q: "Why can you see your reflection in a still pond but not in rough water?", a: "Smooth water reflects specularly; rough water scatters light diffusely" },
    { q: "Does diffuse reflection off paper obey the law of reflection?", a: "Yes: each tiny facet does; the facets point different ways" },
  ]);
  return Q({
    key: `rf-diffuse-${s.q.slice(0, 12)}`,
    prompt: s.q,
    ...txt(s.a, ["Smooth water reflects specularly; rough water scatters light diffusely", "Yes: each tiny facet does; the facets point different ways", "Rough water absorbs all the light", "No: diffuse reflection breaks the law"].filter((x) => x !== s.a)),
    hint: "The law of reflection holds at every point; what changes is which way the surface faces.",
    explain: s.a + ".",
  });
}

/** PHYS.13.2 — concave mirrors: mirror equation, magnification and image types. */
export function concaveMirrors(): Question {
  const kind = rand(0, 5);
  if (kind === 0 || kind === 1) {
    const [f, d, di] = pick(REAL);
    const useR = kind === 1;
    return Q({
      key: `cm-di-${f}-${d}-${useR}`,
      prompt: useR ? `A concave mirror has radius of curvature ${2 * f} cm. An object is ${d} cm in front of it. How far from the mirror is the image?` : `An object is ${d} cm in front of a concave mirror with f = ${f} cm. How far from the mirror is the image?`,
      visual: lensV("concave", f, d, { image: "?", twoF: true }),
      ...kp(di),
      unit: "cm",
      hint: `${useR ? "First f = R/2. Then u" : "U"}se 1/f = 1/d_o + 1/d_i.`,
      explain: `${useR ? `f = ${2 * f}/2 = ${f} cm. ` : ""}1/d_i = 1/${f} − 1/${d}, so d_i = ${di} cm: a real image in front of the mirror.`,
    });
  }
  if (kind === 2) {
    const [f, d, di] = pick([...REAL, ...VIRTUAL.map(([a, b, c]) => [a, b, -c] as [number, number, number])]);
    const m = -di / d;
    const ans = ds(m);
    return Q({
      key: `cm-mag-${f}-${d}`,
      prompt: `An object sits ${d} cm from a concave mirror with f = ${f} cm. What is the magnification?`,
      ...txt(ans, [ds(-m), ds(clean(1 / m)), ds(clean(-1 / m)), ds(clean(m * 2))]),
      hint: "Find d_i from 1/f = 1/d_o + 1/d_i, then m = −d_i/d_o. Negative m means inverted.",
      explain: `d_i = ${ds(di)} cm, so m = −(${ds(di)})/${d} = ${ans}: ${m < 0 ? "inverted (real)" : "upright (virtual)"}, ${Math.abs(m) > 1 ? "enlarged" : Math.abs(m) < 1 ? "reduced" : "same size"}.`,
    });
  }
  if (kind === 3) {
    const [f, d] = pick([...REAL, ...VIRTUAL]);
    const ans = nature("concave", f, d);
    return Q({
      key: `cm-nature-${f}-${d}`,
      prompt: `An object is ${d} cm from a concave mirror with f = ${f} cm. Describe the image.`,
      visual: lensV("concave", f, d, { showImage: false, twoF: true }),
      ...txt(ans, NATURES.filter((x) => x !== ans)),
      hint: "Beyond C (2f): real, inverted, smaller. Between C and F: real, inverted, larger. Inside F: virtual, upright, larger.",
      explain: `The object is ${d > 2 * f ? "beyond C" : d === 2 * f ? "at C" : d > f ? "between C and F" : "inside F"}, so the image is ${ans}.`,
    });
  }
  if (kind === 4) {
    const s = pick([
      { q: "Where should the bulb go in a concave headlight reflector to make a parallel beam?", a: "At the focal point" },
      { q: "Where must your face be for a concave makeup mirror to show it upright and enlarged?", a: "Inside the focal length" },
      { q: "A concave mirror forms an image of a very distant star. Where is the image?", a: "At the focal point" },
    ]);
    return Q({
      key: `cm-use-${s.q.slice(0, 14)}`,
      prompt: s.q,
      ...txt(s.a, ["At the focal point", "Inside the focal length", "At the center of curvature", "Beyond the center of curvature"].filter((x) => x !== s.a), 4),
      hint: "Rays from the focal point reflect parallel; parallel rays reflect through the focal point. Inside F the image is virtual and upright.",
      explain: `${s.a}.`,
    });
  }
  const [f, d, di] = pick(REAL);
  const h = pick([1, 2, 3, 4]);
  return Q({
    key: `cm-height-${f}-${d}-${h}`,
    prompt: `A ${h} cm tall object stands ${d} cm from a concave mirror (f = ${f} cm). How tall is the image?`,
    ...kp((h * di) / d),
    unit: "cm",
    hint: "|m| = d_i/d_o, and image height = |m| × object height.",
    explain: `d_i = ${di} cm, |m| = ${di}/${d} = ${ds(di / d)}, so the image is ${ds((h * di) / d)} cm tall (and inverted).`,
  });
}

/** PHYS.13.2 — convex mirrors. */
export function convexMirrors(): Question {
  const kind = rand(0, 4);
  const [f, d, di] = pick(DIVERGE);
  if (kind === 0)
    return Q({
      key: `vx-di-${f}-${d}`,
      prompt: `An object is ${d} cm in front of a convex mirror with focal length −${f} cm. How far behind the mirror is the image?`,
      visual: lensV("convex", f, d, { image: "?" }),
      ...kp(di),
      unit: "cm",
      hint: "Use 1/f = 1/d_o + 1/d_i with f negative for a convex mirror. A negative d_i means behind the mirror (virtual).",
      explain: `1/d_i = −1/${f} − 1/${d}, so d_i = −${di} cm: ${di} cm behind the mirror.`,
    });
  if (kind === 1)
    return Q({
      key: `vx-nature-${f}-${d}`,
      prompt: `What kind of image does a convex mirror (f = −${f} cm) form of an object ${d} cm away?`,
      visual: lensV("convex", f, d, { showImage: false }),
      ...txt("virtual, upright, smaller", NATURES.filter((x) => x !== "virtual, upright, smaller")),
      hint: "Reflected rays from a convex mirror always spread out.",
      explain: "A convex mirror always gives a virtual, upright, smaller image behind it, wherever the object is.",
    });
  if (kind === 2)
    return Q({
      key: `vx-mag-${f}-${d}`,
      prompt: `An object is ${d} cm from a convex mirror with f = −${f} cm. What is the magnification?`,
      ...magChoices(di, d),
      hint: "m = −d_i/d_o, and d_i is negative here.",
      explain: `d_i = −${di} cm, so m = ${di}/${d} ≈ ${nf(di / d, 2)}: upright and smaller.`,
    });
  if (kind === 3)
    return Q({
      key: `vx-why-${rand(0, 12)}`,
      prompt: "Why are security mirrors in shops and on blind corners convex?",
      ...txt("They show a wide field of view (with smaller images)", ["They magnify faraway objects", "They form real images on a screen", "They focus sunlight"]),
      hint: "Think about how wide an area of the room a convex mirror reflects to your eye.",
      explain: "Rays from a wide range of directions all reflect toward you, so you see a large area, at the cost of smaller images.",
    });
  return Q({
    key: `vx-f-${f}-${d}`,
    prompt: `A convex mirror forms an image ${di} cm behind it of an object ${d} cm in front. What is the magnitude of its focal length?`,
    ...kp(f),
    unit: "cm",
    hint: "Use 1/f = 1/d_o + 1/d_i with d_i = −" + di + " cm.",
    explain: `1/f = 1/${d} − 1/${di} = −1/${f}, so f = −${f} cm.`,
  });
}

const MEDIA = [
  { name: "water", n: 1.33 },
  { name: "glass", n: 1.5 },
  { name: "diamond", n: 2.42 },
  { name: "acrylic", n: 1.49 },
];

/** PHYS.13.3 — refraction and Snell's law. */
export function snellLaw(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const [a, b] = pick([[{ name: "air", n: 1 }, MEDIA[0]], [{ name: "air", n: 1 }, MEDIA[1]], [{ name: "air", n: 1 }, MEDIA[2]], [MEDIA[0], MEDIA[1]], [MEDIA[1], MEDIA[0]]]);
    const ang = rand(2, 13) * 5;
    const r = snell(ang, a.n, b.n)!;
    if (r === null || r > 80) return snellLaw();
    return Q({
      key: `sn-angle-${a.name}-${b.name}-${ang}`,
      prompt: `Light passes from ${a.name} (n = ${a.n}) into ${b.name} (n = ${b.n}). Find the angle of refraction to the nearest degree.`,
      visual: { kind: "phys-rays", scene: "refraction", angle: ang, n1: a.n, n2: b.n, top: a.name, bottom: b.name, incident: ang, refracted: "?" },
      ...kp(Math.round(r)),
      unit: "°",
      hint: "Snell's law: n₁ sin θ₁ = n₂ sin θ₂, with angles from the normal.",
      explain: `sin θ₂ = ${a.n} × sin ${ang}° ÷ ${b.n} = ${nf(Math.sin(r * RAD), 3)}, so θ₂ ≈ ${Math.round(r)}°. It bends ${b.n > a.n ? "toward" : "away from"} the normal.`,
    });
  }
  if (kind === 1) {
    const m = pick(MEDIA);
    return Q({
      key: `sn-speed-${m.name}`,
      prompt: `How fast does light travel in ${m.name} (n = ${m.n})?`,
      ...vals(C / m.n, [C * m.n, C, C / m.n / 10], "m/s", 3, sci),
      hint: "n = c/v, so v = c/n with c = 3.0 × 10⁸ m/s.",
      explain: `v = 3.0 × 10⁸ ÷ ${m.n} ≈ ${sci(C / m.n, 3)} m/s.`,
    });
  }
  if (kind === 2) {
    const [lam, n] = pick([[600, 1.5], [450, 1.5], [532, 1.33], [665, 1.33], [480, 1.6], [500, 1.25]]);
    const ask = pick(["lambda", "f"] as const);
    return Q({
      key: `sn-lambda-${lam}-${n}-${ask}`,
      prompt: ask === "lambda" ? `Light of wavelength ${lam} nm in air enters a material with n = ${n}. What is its wavelength inside?` : `Light of wavelength ${lam} nm in air enters a material with n = ${n}. What happens to its frequency?`,
      ...(ask === "lambda" ? kp(lam / n) : txt("It stays the same", ["It increases by a factor of n", "It decreases by a factor of n", "It becomes zero"])),
      unit: ask === "lambda" ? "nm" : undefined,
      hint: "Frequency is set by the source and can't change at a boundary. v = fλ, and v drops by a factor of n.",
      explain: ask === "lambda" ? `λ = λ₀/n = ${lam} ÷ ${n} = ${ds(lam / n)} nm; the frequency is unchanged.` : "The frequency stays the same; the speed and the wavelength both shrink by a factor of n.",
    });
  }
  if (kind === 3) {
    const into = pick([true, false]);
    const m = pick(MEDIA);
    return Q({
      key: `sn-bend-${into}-${m.name}`,
      prompt: into ? `A ray goes from air into ${m.name} at an angle. Which way does it bend?` : `A ray goes from ${m.name} out into air at an angle. Which way does it bend?`,
      ...txt(into ? "Toward the normal" : "Away from the normal", [into ? "Away from the normal" : "Toward the normal", "It doesn't bend", "Along the surface"]),
      hint: "Into a slower (higher-n) medium the ray bends toward the normal.",
      explain: into ? `Light slows in ${m.name} (n = ${m.n}), so θ₂ < θ₁: toward the normal.` : `Light speeds up leaving ${m.name}, so θ₂ > θ₁: away from the normal.`,
    });
  }
  if (kind === 4) {
    const m = pick(MEDIA.slice(0, 2));
    const a = rand(3, 12) * 5;
    const r = Math.round(snell(a, 1, m.n)!);
    const n = Math.sin(a * RAD) / Math.sin(r * RAD);
    return Q({
      key: `sn-n-${a}-${r}`,
      prompt: `A ray in air hits a block at ${a}° to the normal and refracts at ${r}°. What is the block's index of refraction?`,
      ...vals(n, [Math.sin(r * RAD) / Math.sin(a * RAD), a / r, Math.cos(a * RAD) / Math.cos(r * RAD)], "", 3),
      hint: "n_air sin θ₁ = n sin θ₂, with n_air = 1.00.",
      explain: `n = sin ${a}° ÷ sin ${r}° ≈ ${nf(n, 3)}.`,
    });
  }
  const [a, b] = some(MEDIA.filter((m) => m.name !== "acrylic"), 2);
  return Q({
    key: `sn-ratio-${a.name}-${b.name}`,
    prompt: `How many times faster does light travel in ${a.name} (n = ${a.n}) than in ${b.name} (n = ${b.n})?`,
    ...vals(b.n / a.n, [a.n / b.n, b.n - a.n + 1, (b.n / a.n) ** 2], "", 3),
    hint: "v = c/n, so v₁/v₂ = n₂/n₁.",
    explain: `v_${a.name}/v_${b.name} = ${b.n}/${a.n} ≈ ${nf(b.n / a.n, 3)}${b.n < a.n ? " (less than 1: it's actually slower)" : ""}.`,
  });
}

/** PHYS.13.3 — total internal reflection and the critical angle. */
export function tir(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [a, out] = pick([[MEDIA[0], { name: "air", n: 1 }], [MEDIA[1], { name: "air", n: 1 }], [MEDIA[2], { name: "air", n: 1 }], [MEDIA[3], { name: "air", n: 1 }], [MEDIA[1], MEDIA[0]], [MEDIA[2], MEDIA[0]]]);
    const th = (Math.asin(out.n / a.n) * 180) / Math.PI;
    return Q({
      key: `ti-crit-${a.name}-${out.name}`,
      prompt: `What is the critical angle for light going from ${a.name} (n = ${a.n}) into ${out.name}${out.n > 1 ? ` (n = ${out.n})` : ""}? Answer to the nearest degree.`,
      ...kp(Math.round(th)),
      unit: "°",
      hint: "At the critical angle the refracted ray skims the surface (θ₂ = 90°): sin θ_c = n₂/n₁.",
      explain: `sin θ_c = ${out.n === 1 ? "1.00" : out.n}/${a.n} = ${nf(out.n / a.n, 3)}, so θ_c ≈ ${Math.round(th)}°.`,
    });
  }
  if (kind === 1) {
    const a = pick([MEDIA[0], MEDIA[1], MEDIA[2]]);
    const th = (Math.asin(1 / a.n) * 180) / Math.PI;
    const ang = pick([Math.round(th) - 10, Math.round(th) + 8, Math.round(th) - 5, Math.round(th) + 15].filter((x) => x > 5 && x < 85));
    const total = ang > th;
    return Q({
      key: `ti-will-${a.name}-${ang}`,
      prompt: `Light inside ${a.name} (n = ${a.n}) hits the surface with air at ${ang}° to the normal. What happens?`,
      ...txt(total ? "Total internal reflection: no light escapes" : "Most of it refracts out into the air", [total ? "Most of it refracts out into the air" : "Total internal reflection: no light escapes", "It passes straight through without bending"], 3),
      hint: `Compare with the critical angle: sin θ_c = 1/${a.n}.`,
      explain: `θ_c ≈ ${Math.round(th)}°. ${ang}° is ${total ? "larger, so the light is totally internally reflected" : "smaller, so the light refracts out (bending away from the normal)"}.`,
    });
  }
  if (kind === 2) {
    const s = pick([
      { q: "For total internal reflection, light must travel:", a: "From a higher-n medium toward a lower-n medium" },
      { q: "An optical fiber's core is wrapped in cladding. How must their indices compare?", a: "The core's n is higher than the cladding's" },
      { q: "Why does a diamond sparkle more than glass cut the same way?", a: "Its high n gives a small critical angle, so light reflects inside many times" },
    ]);
    return Q({
      key: `ti-fact-${s.q.slice(0, 14)}`,
      prompt: s.q,
      ...txt(s.a, ["From a higher-n medium toward a lower-n medium", "The core's n is higher than the cladding's", "Its high n gives a small critical angle, so light reflects inside many times", "From a lower-n medium toward a higher-n medium", "The cladding's n is higher than the core's"].filter((x) => x !== s.a)),
      hint: "TIR only happens going toward a medium where light is faster (lower n), beyond the critical angle.",
      explain: `${s.a}.`,
    });
  }
  if (kind === 3) {
    const th = pick([30, 37, 42, 45, 49, 24]);
    const n = 1 / Math.sin(th * RAD);
    return Q({
      key: `ti-n-${th}`,
      prompt: `The critical angle for a material in air is ${th}°. What is its index of refraction?`,
      ...vals(n, [Math.sin(th * RAD), 1 / Math.cos(th * RAD), Math.tan(th * RAD)], "", 3),
      hint: "sin θ_c = 1/n, so n = 1/sin θ_c.",
      explain: `n = 1 ÷ sin ${th}° ≈ ${nf(n, 3)}.`,
    });
  }
  const m = pick([MEDIA[0], MEDIA[1]]);
  const th = (Math.asin(1 / m.n) * 180) / Math.PI;
  const ang = Math.round(th) + pick([5, 10, 15]);
  return Q({
    key: `ti-pic-${m.name}-${ang}`,
    prompt: `Light in ${m.name} meets air at ${ang}° and none escapes, as shown. What is the critical angle, to the nearest degree?`,
    visual: { kind: "phys-rays", scene: "refraction", angle: ang, n1: m.n, n2: 1, top: m.name, bottom: "air", incident: ang },
    ...kp(Math.round(th)),
    unit: "°",
    hint: "sin θ_c = n_air/n.",
    explain: `θ_c = sin⁻¹(1/${m.n}) ≈ ${Math.round(th)}°. ${ang}° is bigger, so yes: total internal reflection.`,
  });
}

/** PHYS.13.3 — Do it: graph sin θ in air against sin θ in a material; the slope is n. */
export function snellDoIt(): Question {
  const mat = pick([
    { name: "glass", n: 1.5, xs: [2, 4, 6] },
    { name: "a mystery plastic", n: 1.25, xs: [4, 8] },
    { name: "water", n: 4 / 3, xs: [3, 6] },
    { name: "a dense crystal", n: 2, xs: [1, 2, 3, 4] },
  ]);
  const xs = mat.xs.length > 2 ? some(mat.xs, Math.min(3, mat.xs.length)).sort((a, b) => a - b) : mat.xs;
  const rows = xs.map((x) => [ds(x / 10), ds(dp((mat.n * x) / 10, 2))]);
  const kind = rand(0, 2);
  if (kind === 0)
    return Q({
      key: `sd-plot-${mat.name}-${xs.join("")}`,
      prompt: `Plot sin θ in air (up) against sin θ in ${mat.name} (across). Each square is 0.1 both ways.`,
      speech: `Plot sine theta in air, going up, against sine theta in ${mat.name}, going across. Each square is 0.1 both ways.`,
      visual: table([`sin θ (${mat.name})`, "sin θ (air)"], rows),
      ...act({ kind: "plotPoints", points: xs.map((x, i) => ({ x, y: Math.round(mat.n * x), label: "ABCD"[i] })), size: 10, quadrants: 1 }, xs.length),
      hint: "Multiply each sine by 10 to get squares.",
      explain: `The points lie on a line through the origin: sin θ_air = n sin θ_${mat.name.split(" ").pop()}, slope n = ${nf(mat.n, 3)}.`,
    });
  if (kind === 1)
    return Q({
      key: `sd-line-${mat.name}-${xs.join("")}`,
      prompt: `Draw the line through these refraction data: sin θ in air (up) against sin θ in ${mat.name} (across). Each square is 0.1.`,
      speech: `Draw the line through these refraction data: sine theta in air, going up, against sine theta in ${mat.name}, going across. Each square is 0.1.`,
      visual: table([`sin θ (${mat.name})`, "sin θ (air)"], rows),
      ...act({ kind: "drawLine", m: mat.n, b: 0, size: 10, quadrants: 1 }, mat.n),
      hint: "Snell's law with n_air = 1: sin θ_air = n sin θ_material, a line through the origin with slope n.",
      explain: `Slope = ${nf(mat.n, 3)}, which is the index of refraction of ${mat.name}.`,
    });
  return Q({
    key: `sd-read-${mat.name}`,
    prompt: `The graph shows refraction data for ${mat.name}. What is its index of refraction?`,
    visual: plot([0, 1], [0, 1], "sin θ (material)", "sin θ (air)", { lines: [{ from: [0, 0], to: [1 / mat.n, 1], colour: "berry" }], points: xs.map((x) => ({ x: x / 10, y: (mat.n * x) / 10 })) }),
    needsVisual: true,
    ...vals(mat.n, [1 / mat.n, mat.n + 0.5, mat.n * mat.n], "", 3),
    hint: "sin θ_air = n sin θ_material, so the slope of this graph is n.",
    explain: `Slope = rise ÷ run = ${nf(mat.n, 3)}.`,
  });
}

/** PHYS.13.4 — converging lenses: the thin lens equation and magnification. */
export function convergingLens(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [f, d, di] = pick(REAL);
    return Q({
      key: `cl-real-${f}-${d}`,
      prompt: `An object is ${d} cm from a converging lens with f = ${f} cm. How far from the lens is the image?`,
      visual: lensV("converging", f, d, { image: "?", twoF: true }),
      ...kp(di),
      unit: "cm",
      hint: "Thin lens equation: 1/f = 1/d_o + 1/d_i.",
      explain: `1/d_i = 1/${f} − 1/${d}, so d_i = ${di} cm on the far side of the lens: a real image.`,
    });
  }
  if (kind === 1) {
    const [f, d, di] = pick(VIRTUAL);
    return Q({
      key: `cl-virt-${f}-${d}`,
      prompt: `An object is ${d} cm from a converging lens with f = ${f} cm, inside the focal length. How far from the lens is the image?`,
      visual: lensV("converging", f, d, { image: "?" }),
      ...kp(di),
      unit: "cm",
      hint: "1/d_i = 1/f − 1/d_o. A negative answer means the image is on the same side as the object (virtual).",
      explain: `1/d_i = 1/${f} − 1/${d} gives d_i = −${di} cm: a virtual image ${di} cm from the lens, on the object's side (a magnifying glass).`,
    });
  }
  if (kind === 2) {
    const [f, d, di] = pick([...REAL, ...VIRTUAL]);
    const h = pick([1, 2, 3]);
    return Q({
      key: `cl-height-${f}-${d}-${h}`,
      prompt: `A ${h} cm tall object is ${d} cm from a converging lens with f = ${f} cm. How tall is its image?`,
      ...kp((h * di) / d),
      unit: "cm",
      hint: "Find d_i, then |m| = |d_i|/d_o and h_i = |m| h_o.",
      explain: `|d_i| = ${di} cm, |m| = ${ds(di / d)}, so the image is ${ds((h * di) / d)} cm tall.`,
    });
  }
  if (kind === 3) {
    const [f, d, di] = pick(REAL);
    return Q({
      key: `cl-f-${f}-${d}`,
      prompt: `A converging lens makes a sharp image on a screen ${di} cm behind it of a candle ${d} cm in front. What is its focal length?`,
      ...kp(f),
      unit: "cm",
      hint: "1/f = 1/d_o + 1/d_i.",
      explain: `1/f = 1/${d} + 1/${di} = 1/${f}, so f = ${f} cm.`,
    });
  }
  const [f, P] = pick([[10, 10], [20, 5], [25, 4], [50, 2], [12.5, 8], [40, 2.5], [100, 1]]);
  return Q({
    key: `cl-power-${f}`,
    prompt: `Optometrists rate lenses by power P = 1/f (f in meters), in diopters. What is the power of a converging lens with f = ${f} cm?`,
    ...kp(P),
    unit: "D",
    hint: "Convert f to meters first.",
    explain: `f = ${f / 100} m, so P = 1/${f / 100} = ${P} D.`,
  });
}

/** PHYS.13.4 — ray diagrams and image characteristics. */
export function rayDiagrams(): Question {
  const kind = rand(0, 4);
  if (kind === 0 || kind === 1) {
    const [f, d] = pick([...REAL, ...VIRTUAL]);
    const ans = nature("converging", f, d);
    return Q({
      key: `rd-nature-${f}-${d}`,
      prompt: `An object is ${d} cm from a converging lens with f = ${f} cm. Describe the image.`,
      visual: lensV("converging", f, d, { showImage: false, twoF: true }),
      ...txt(ans, NATURES.filter((x) => x !== ans)),
      hint: "Beyond 2F: real, inverted, smaller. Between F and 2F: real, inverted, larger. Inside F: virtual, upright, larger.",
      explain: `With d_o = ${d} cm and f = ${f} cm the image is ${ans}.`,
    });
  }
  if (kind === 2) {
    const s = pick([
      { q: "A ray passes through the center of a thin lens. Where does it go?", a: "Straight on, undeviated" },
      { q: "A ray parallel to the axis enters a converging lens. Where does it go?", a: "Through the focal point on the far side" },
      { q: "A ray passes through the near focal point of a converging lens. Where does it go?", a: "Out parallel to the axis" },
    ]);
    return Q({
      key: `rd-ray-${s.q.slice(0, 12)}`,
      prompt: s.q,
      ...txt(s.a, ["Straight on, undeviated", "Through the focal point on the far side", "Out parallel to the axis", "Back toward the object"].filter((x) => x !== s.a)),
      hint: "These are the three principal rays used in every ray diagram.",
      explain: `${s.a}.`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "Half of a converging lens is covered with black card. What happens to the image?", a: "It's still complete, just dimmer" },
      { q: "An object sits exactly at the focal point of a converging lens. Where is the image?", a: "No image forms: the rays leave parallel" },
      { q: "A glass converging lens is put under water. Its focal length:", a: "Gets longer, because it bends light less" },
    ]);
    return Q({
      key: `rd-trick-${s.q.slice(0, 12)}`,
      prompt: s.q,
      ...txt(s.a, ["It's still complete, just dimmer", "No image forms: the rays leave parallel", "Gets longer, because it bends light less", "Half the image disappears", "Gets shorter", "It forms at 2F"].filter((x) => x !== s.a)),
      hint: "Every part of the lens sends rays from every part of the object to the image. Bending depends on the index difference.",
      explain: `${s.a}.`,
    });
  }
  const s = pick([
    { q: "In a camera, where is the object compared with the lens's focal length f?", a: "Farther than 2f: real, inverted, smaller image" },
    { q: "In a projector, where is the slide compared with the lens's focal length f?", a: "Between f and 2f: real, inverted, larger image" },
    { q: "For a magnifying glass, where is the object compared with the focal length f?", a: "Inside f: virtual, upright, larger image" },
  ]);
  return Q({
    key: `rd-device-${s.q.slice(5, 18)}`,
    prompt: s.q,
    ...txt(s.a, ["Farther than 2f: real, inverted, smaller image", "Between f and 2f: real, inverted, larger image", "Inside f: virtual, upright, larger image", "Exactly at f"].filter((x) => x !== s.a)),
    hint: "Match each device to the kind of image it needs.",
    explain: `${s.a}.`,
  });
}

/** PHYS.13.4 — diverging lenses. */
export function divergingLens(): Question {
  const kind = rand(0, 4);
  const [f, d, di] = pick(DIVERGE);
  if (kind === 0)
    return Q({
      key: `dl-di-${f}-${d}`,
      prompt: `An object is ${d} cm from a diverging lens with f = −${f} cm. How far from the lens is the image?`,
      visual: lensV("diverging", f, d, { image: "?" }),
      ...kp(di),
      unit: "cm",
      hint: "Use 1/f = 1/d_o + 1/d_i with f negative. The image comes out negative: virtual, on the object's side.",
      explain: `1/d_i = −1/${f} − 1/${d}, so d_i = −${di} cm: ${di} cm from the lens, on the same side as the object.`,
    });
  if (kind === 1)
    return Q({
      key: `dl-nature-${f}-${d}`,
      prompt: `Describe the image a diverging lens (f = −${f} cm) makes of an object ${d} cm away.`,
      visual: lensV("diverging", f, d, { showImage: false }),
      ...txt("virtual, upright, smaller", NATURES.filter((x) => x !== "virtual, upright, smaller")),
      hint: "A diverging lens spreads rays out; trace them back to where they seem to come from.",
      explain: "A diverging lens always forms a virtual, upright, smaller image between the lens and its focal point.",
    });
  if (kind === 2)
    return Q({
      key: `dl-mag-${f}-${d}`,
      prompt: `What is the magnification for an object ${d} cm from a diverging lens with f = −${f} cm?`,
      ...magChoices(di, d),
      hint: "Find d_i (negative), then m = −d_i/d_o.",
      explain: `d_i = −${di} cm, so m = ${di}/${d} ≈ ${nf(di / d, 2)}: upright and reduced.`,
    });
  if (kind === 3)
    return Q({
      key: `dl-eye-${rand(0, 12)}`,
      prompt: "A nearsighted eye focuses distant light in front of the retina. Which lens corrects it?",
      ...txt("A diverging lens, which spreads the rays a little first", ["A converging lens, to focus light sooner", "A flat sheet of glass", "A prism"]),
      hint: "The eye already bends light too much for distant objects.",
      explain: "A diverging lens spreads incoming rays so the eye's too-strong lens brings them to focus farther back, on the retina.",
    });
  return Q({
    key: `dl-ray-${f}-${d}`,
    prompt: `A ray parallel to the axis enters a diverging lens (f = −${f} cm). Where does it go?`,
    visual: lensV("diverging", f, d),
    ...txt("It spreads out as if it came from the near focal point", ["It passes through the far focal point", "It goes straight through", "It reflects back"]),
    hint: "Look at the red ray in the diagram and trace it backward (dashed).",
    explain: "After a diverging lens the parallel ray bends away from the axis; traced back, it lines up with the focal point on the incoming side.",
  });
}

/** PHYS.13.2, PHYS.13.4 — Do it: drag the marker to where the image forms. */
export function imageDoIt(): Question {
  const optic = pick(["converging", "concave"] as const);
  const [f, d, di] = pick(REAL.filter(([, , x]) => x <= 60));
  const thing = optic === "converging" ? "converging lens" : "concave mirror";
  return Q({
    key: `idt-${optic}-${f}-${d}`,
    prompt: `An object is ${d} cm from a ${thing} with f = ${f} cm. Drag the marker to the image distance, in cm from the ${optic === "converging" ? "lens" : "mirror"}.`,
    visual: lensV(optic, f, d, { showImage: false, twoF: true }),
    ...act({ kind: "placeOnLine", min: 0, max: 60, step: 1, labelStep: 10, target: di }, di),
    hint: "1/d_i = 1/f − 1/d_o. Check your answer: an object between F and 2F gives an image beyond 2F, and vice versa.",
    explain: `1/d_i = 1/${f} − 1/${d} = 1/${di}, so the image is ${di} cm from the ${optic === "converging" ? "lens" : "mirror"}.`,
  });
}

/* ================================================== 6. Waves, sound and physical optics */

const V_SOUND = 340;
const sinc2 = (w: number) => (y: number) => {
  const u = (Math.PI * y) / w;
  return Math.abs(u) < 1e-9 ? 1 : (Math.sin(u) / u) ** 2;
};

/** PHYS.14.1 — pulses and waves: types, speed on a string, superposition. */
export function pulses(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const form = pick(["transverse", "longitudinal"] as const);
    const lam = pick([2, 3, 4]);
    const ask = pick(["type", "motion"] as const);
    return Q({
      key: `pu-type-${form}-${lam}-${ask}`,
      prompt: ask === "type" ? "What kind of wave is shown?" : "The wave travels to the right. How do the particles of the medium move?",
      visual: { kind: "phys-wave", form, length: 12, waves: [{ amplitude: 1, wavelength: lam }], travel: "v", names: true },
      needsVisual: true,
      ...(ask === "type"
        ? txt(form, [form === "transverse" ? "longitudinal" : "transverse", "standing"], 3)
        : txt(form === "transverse" ? "Up and down, perpendicular to the wave's motion" : "Back and forth, along the wave's motion", ["Up and down, perpendicular to the wave's motion", "Back and forth, along the wave's motion", "Along with the wave to the right", "They don't move"].filter((x) => x !== (form === "transverse" ? "Up and down, perpendicular to the wave's motion" : "Back and forth, along the wave's motion")))),
      hint: "Transverse: the medium moves perpendicular to the wave (crests and troughs). Longitudinal: parallel to it (compressions and rarefactions).",
      explain: form === "transverse" ? "Crests and troughs: a transverse wave, with the medium moving up and down while energy travels right." : "Compressions and rarefactions: a longitudinal wave, with the medium moving back and forth along the direction of travel.",
    });
  }
  if (kind === 1) {
    const mu = pick([0.01, 0.02, 0.05]);
    const v = pick([10, 20, 30, 40]);
    const T = clean(mu * v * v);
    return Q({
      key: `pu-speed-${mu}-${v}`,
      prompt: `A string with linear density ${mu} kg/m is under ${T} N of tension. How fast do waves travel on it?`,
      ...kp(v),
      unit: "m/s",
      hint: "On a string, v = √(T/μ): tension speeds waves up, heavier strings slow them down.",
      explain: `v = √(${T} ÷ ${mu}) = √${clean(T / mu)} = ${v} m/s.`,
    });
  }
  if (kind === 2) {
    const a = rand(1, 5) * pick([1, -1]);
    const b = rand(1, 5) * pick([1, -1]);
    return Q({
      key: `pu-super-${a}-${b}`,
      prompt: `A pulse of height ${ds(a)} cm meets a pulse of height ${ds(b)} cm on a string (negative means below the line). What is the height where they overlap exactly?`,
      ...kps(a + b),
      unit: "cm",
      hint: "Superposition: the displacements add (with signs). Afterward each pulse continues unchanged.",
      explain: `${ds(a)} + ${ds(b)} = ${ds(a + b)} cm: ${Math.sign(a) === Math.sign(b) ? "constructive" : "destructive"} interference.`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "What does a wave carry from one place to another?", a: "Energy, not matter" },
      { q: "What sets the speed of a mechanical wave?", a: "The properties of the medium" },
    ]);
    return Q({
      key: `pu-fact-${s.a}`,
      prompt: s.q,
      ...txt(s.a, ["Energy, not matter", "The properties of the medium", "Matter, not energy", "The frequency of the source", "The amplitude of the wave"].filter((x) => x !== s.a)),
      hint: "A cork bobbing on a ripple stays roughly in place.",
      explain: s.a === "Energy, not matter" ? "The medium only oscillates about where it is; the disturbance and its energy travel." : "Wave speed depends on the medium (tension and density for a string), not on the frequency or amplitude.",
    });
  }
  if (kind === 4) {
    const k = pick([4, 9, 0.25]);
    return Q({
      key: `pu-tension-${k}`,
      prompt: `The tension in a string is ${k < 1 ? `divided by ${1 / k}` : `multiplied by ${k}`}. By what factor does the wave speed change?`,
      ...nums(Math.sqrt(k), [k, k / 2, k * k]),
      hint: "v = √(T/μ).",
      explain: `v ∝ √T, so the factor is √${k} = ${ds(Math.sqrt(k))}.`,
    });
  }
  const L = pick([2, 4, 6, 10]);
  const v = pick([20, 40, 50, 80]);
  return Q({
    key: `pu-time-${L}-${v}`,
    prompt: `A pulse travels at ${v} m/s along a ${L} m rope, reflects at the far end and comes back. How long does the round trip take?`,
    ...kp((2 * L) / v),
    unit: "s",
    hint: "Distance = there and back = 2L. Time = distance ÷ speed.",
    explain: `t = 2 × ${L} ÷ ${v} = ${ds((2 * L) / v)} s.`,
  });
}

/** PHYS.14.2 — periodic waves: wavelength, frequency, period, speed and amplitude. */
export function periodic(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const lam = pick([2, 3, 4, 6]);
    const A = pick([0.5, 1, 1.5, 2]);
    const L = 12;
    const ask = pick(["lambda", "A"] as const);
    return Q({
      key: `pe-read-${lam}-${A}-${ask}`,
      prompt: ask === "lambda" ? "Each grid square is 1 m. What is the wavelength?" : "Each grid square is 1 m. What is the amplitude?",
      visual: { kind: "phys-wave", length: L, waves: [{ amplitude: A, wavelength: lam }], grid: true, wavelengthLabel: ask === "lambda" ? "?" : undefined, amplitudeLabel: ask === "A" ? "?" : undefined },
      needsVisual: true,
      ...kp(ask === "lambda" ? lam : A),
      unit: "m",
      hint: ask === "lambda" ? "Wavelength: the distance from one crest to the next." : "Amplitude: from the middle line to a crest, not crest to trough.",
      explain: ask === "lambda" ? `Crests repeat every ${lam} m, so λ = ${lam} m.` : `The crest is ${A} m above the middle line: A = ${A} m.`,
    });
  }
  if (kind === 1) {
    const f = pick([2, 5, 10, 50, 200, 440]);
    const lam = pick([0.5, 0.8, 1.5, 2, 4]);
    const ask = pick(["v", "lambda"] as const);
    const v = clean(f * lam);
    return Q({
      key: `pe-vfl-${f}-${lam}-${ask}`,
      prompt: ask === "v" ? `A wave has frequency ${f} Hz and wavelength ${lam} m. How fast does it travel?` : `A wave travels at ${v} m/s with frequency ${f} Hz. What is its wavelength?`,
      ...kp(ask === "v" ? v : lam),
      unit: ask === "v" ? "m/s" : "m",
      hint: "v = fλ: in one period the wave moves one wavelength.",
      explain: ask === "v" ? `v = ${f} × ${lam} = ${v} m/s.` : `λ = v/f = ${v} ÷ ${f} = ${lam} m.`,
    });
  }
  if (kind === 2) {
    const f = pick([50, 100, 200, 250, 500, 1000, 40]);
    return Q({
      key: `pe-period-${f}`,
      prompt: `What is the period of a ${f} Hz wave, in milliseconds?`,
      ...kp(1000 / f),
      unit: "ms",
      hint: "T = 1/f. 1 s = 1000 ms.",
      explain: `T = 1/${f} s = ${ds(1000 / f)} ms.`,
    });
  }
  if (kind === 3) {
    const T = pick([0.2, 0.25, 0.5, 2, 4]);
    const A = pick([1, 2, 3]);
    return Q({
      key: `pe-yt-${T}-${A}`,
      prompt: "The graph shows the displacement of one point on a string against time. What is the wave's frequency?",
      visual: plot([0, 3 * T], [-4, 4], "t (s)", "y (cm)", { curves: [{ fn: (t) => A * Math.sin((2 * Math.PI * t) / T), colour: "berry" }] }),
      needsVisual: true,
      ...kp(1 / T),
      unit: "Hz",
      hint: "This is a displacement–time graph, so crest to crest is the period T, not the wavelength. Then f = 1/T.",
      explain: `One cycle takes ${T} s, so f = 1/${T} = ${ds(1 / T)} Hz.`,
    });
  }
  if (kind === 4) {
    const what = pick(["wavelength", "speed"] as const);
    const k = pick([2, 3]);
    const ans = what === "wavelength" ? `It is divided by ${k}` : "It stays the same";
    return Q({
      key: `pe-change-${what}-${k}`,
      prompt: `A source on a rope makes waves ${k} times as often (same tension). What happens to the ${what}?`,
      ...txt(ans, ["It stays the same", `It is divided by ${k}`, `It is multiplied by ${k}`, `It is multiplied by ${k * k}`].filter((x) => x !== ans)),
      hint: "The medium fixes the speed. Then λ = v/f.",
      explain: `The speed depends only on the rope, so it stays the same; λ = v/f is divided by ${k}.`,
    });
  }
  const k = pick([2, 3, 0.5]);
  return Q({
    key: `pe-energy-${k}`,
    prompt: `The amplitude of a wave is ${k === 0.5 ? "halved" : `multiplied by ${k}`}. By what factor does the energy it carries change?`,
    ...nums(k * k, [k, 2 * k, Math.sqrt(k)]),
    hint: "Wave energy (and intensity) is proportional to amplitude squared.",
    explain: `E ∝ A², so the factor is ${k}² = ${k * k}.`,
  });
}

/** PHYS.14.2 — Do it: match a wave by setting amplitude, wavelength or frequency. */
export function waveDoIt(): Question {
  const kind = rand(0, 1);
  if (kind === 0) {
    const v = pick([4, 6, 8, 12]);
    const f = pick([1, 2, 3, 4, 6].filter((x) => v / x >= 1 && Number.isInteger(v / x) && v / x <= 8));
    const lam = v / f;
    const A = pick([1, 1.5, 2]);
    return Q({
      key: `wd-freq-${v}-${f}-${A}`,
      prompt: `Waves travel at ${v} m/s on this rope. Set the frequency to make the faint target wave (wavelength ${lam} m).`,
      ...act({ kind: "phys-matchWave", length: 12, target: { amplitude: A, wavelength: lam }, frequency: { min: 1, max: 8, step: 1 }, speed: v }, lam),
      hint: "f = v/λ.",
      explain: `f = ${v} ÷ ${lam} = ${f} Hz.`,
    });
  }
  const A = pick([0.5, 1, 1.5, 2, 2.5]);
  const lam = pick([2, 3, 4, 6, 8]);
  return Q({
    key: `wd-al-${A}-${lam}`,
    prompt: `Use the sliders to make a wave with amplitude ${A} m and wavelength ${lam} m.`,
    ...act({ kind: "phys-matchWave", length: 12, target: { amplitude: A, wavelength: lam }, amplitude: { min: 0.5, max: 3, step: 0.5 }, wavelength: { min: 1, max: 10, step: 1 } }, lam),
    hint: "Amplitude: middle line to crest. Wavelength: crest to crest. Each grid square is 1 m.",
    explain: `Crests ${A} m above the middle, repeating every ${lam} m.`,
  });
}

/** PHYS.14.3 — waves at boundaries, and polarization. */
export function boundaries(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const end = pick(["fixed", "free"] as const);
    return Q({
      key: `bd-end-${end}-${rand(0, 4)}`,
      prompt: `An upward pulse travels along a rope to a ${end === "fixed" ? "fixed end (tied to a wall)" : "free end (a ring sliding on a pole)"}. What does the reflected pulse look like?`,
      ...txt(end === "fixed" ? "Inverted (now downward)" : "Upright (still upward)", [end === "fixed" ? "Upright (still upward)" : "Inverted (now downward)", "There is no reflected pulse", "Twice as tall"]),
      hint: "At a fixed end the wall pulls the rope back down; a free end can flip up freely.",
      explain: end === "fixed" ? "A fixed end reflects the pulse inverted (a half-cycle phase change)." : "A free end reflects the pulse upright.",
    });
  }
  if (kind === 1) {
    const toHeavy = pick([true, false]);
    const ask = pick(["reflected", "transmitted"] as const);
    const ans = ask === "reflected" ? (toHeavy ? "Inverted" : "Upright") : toHeavy ? "Slower, upright" : "Faster, upright";
    return Q({
      key: `bd-strings-${toHeavy}-${ask}`,
      prompt: `An upward pulse goes from a ${toHeavy ? "light" : "heavy"} rope into a ${toHeavy ? "heavy" : "light"} rope. Describe the ${ask} pulse.`,
      ...txt(ans, ask === "reflected" ? ["Inverted", "Upright", "There is none"].filter((x) => x !== ans) : ["Slower, upright", "Faster, upright", "Slower, inverted", "Faster, inverted"].filter((x) => x !== ans)),
      hint: "Going into a heavier medium acts partly like a fixed end. The transmitted pulse is never inverted; its speed is set by the new rope.",
      explain: ask === "reflected" ? `Into a ${toHeavy ? "heavier" : "lighter"} rope the reflection is ${ans.toLowerCase()}.` : `The transmitted pulse is upright and ${toHeavy ? "slower (heavier rope)" : "faster (lighter rope)"}.`,
    });
  }
  if (kind === 2) {
    const f = pick([5, 10, 20]);
    const v1 = pick([10, 20, 40]);
    const v2 = pick([5, 30, 60, 80].filter((v) => v !== v1));
    return Q({
      key: `bd-lambda-${f}-${v1}-${v2}`,
      prompt: `A ${f} Hz wave on a rope (speed ${v1} m/s) passes into a second rope where waves travel at ${v2} m/s. What is the wavelength in the second rope?`,
      ...kp(v2 / f),
      unit: "m",
      hint: "The frequency doesn't change at a boundary (the joint shakes at the same rate). λ = v/f.",
      explain: `f stays ${f} Hz, so λ₂ = ${v2} ÷ ${f} = ${ds(v2 / f)} m (it was ${ds(v1 / f)} m).`,
    });
  }
  if (kind === 3) {
    const th = pick([0, 30, 45, 60, 90]);
    const I0 = pick([100, 200, 400, 800]);
    const unpol = pick([true, false]);
    const c2 = [1, 0.75, 0.5, 0.25, 0][[0, 30, 45, 60, 90].indexOf(th)];
    const I = (unpol ? I0 / 2 : I0) * c2;
    return Q({
      key: `bd-malus-${th}-${I0}-${unpol}`,
      prompt: unpol
        ? `Unpolarized light of intensity ${I0} W/m² passes through two polarizers whose axes are ${th}° apart. What intensity comes out?`
        : `Polarized light of intensity ${I0} W/m² meets a polarizer at ${th}° to its polarization. What intensity gets through?`,
      ...kp(I),
      unit: "W/m²",
      hint: `${unpol ? "The first polarizer passes half of unpolarized light. Then " : ""}Malus's law: I = I₀ cos² θ.`,
      explain: `${unpol ? `After the first: ${I0 / 2} W/m². ` : ""}cos² ${th}° = ${c2}, so I = ${ds(unpol ? I0 / 2 : I0)} × ${c2} = ${ds(I)} W/m².`,
    });
  }
  if (kind === 4) {
    return Q({
      key: `bd-sound-${rand(0, 12)}`,
      prompt: "Light can be polarized but sound in air cannot. Why?",
      ...txt("Sound is longitudinal; only transverse waves have a direction of vibration to filter", ["Sound is too slow", "Sound has no frequency", "Light has no wavelength"]),
      hint: "A polarizer selects one direction of vibration perpendicular to the travel direction.",
      explain: "Polarization needs vibrations perpendicular to the motion. Light (transverse) has them; sound in air (longitudinal) vibrates along its motion.",
    });
  }
  return Q({
    key: `bd-glare-${rand(0, 12)}`,
    prompt: "Why do polarized sunglasses cut glare from a lake?",
    ...txt("Reflected light is mostly polarized horizontally, and the lenses block that direction", ["They block all light from below", "They absorb only blue light", "They make the water less shiny"]),
    hint: "Light reflected off a flat surface is partly polarized parallel to the surface.",
    explain: "Glare is largely horizontally polarized, so lenses with vertical transmission axes block most of it.",
  });
}

const SPECTRUM = ["radio waves", "microwaves", "infrared", "visible light", "ultraviolet", "X-rays", "gamma rays"];

/** PHYS.14.4 — electromagnetic waves and the spectrum. */
export function emWaves(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const s = pick([
      { name: "an FM radio station", f: 1e8 },
      { name: "a microwave oven", f: 2.45e9 },
      { name: "green light", f: 5.6e14 },
      { name: "a dental X-ray", f: 3e18 },
      { name: "a TV remote's infrared beam", f: 3.3e14 },
    ]);
    const lam = C / s.f;
    return Q({
      key: `em-lambda-${s.name}`,
      prompt: `The waves from ${s.name} have frequency ${sci(s.f, 3)} Hz. What is their wavelength?`,
      ...vals(lam, [s.f / C, C * s.f, lam / 1000], "m", 2, sci),
      hint: "All EM waves travel at c = 3.0 × 10⁸ m/s in vacuum, so λ = c/f.",
      explain: `λ = 3.0 × 10⁸ ÷ ${sci(s.f, 3)} ≈ ${sci(lam, 2)} m.`,
    });
  }
  if (kind === 1) {
    const start = rand(0, 2);
    const items = SPECTRUM.slice(start, start + 5);
    const up = pick([true, false]);
    return Q({
      key: `em-order-${start}-${up}`,
      prompt: up ? "Put these in order from longest wavelength to shortest." : "Put these in order from highest frequency to lowest.",
      ...act({ kind: "order", items: up ? items : [...items].reverse(), direction: up ? "longest wavelength first" : "highest frequency first" }, items.length),
      hint: "Radio, microwave, infrared, visible, ultraviolet, X-ray, gamma: wavelength shrinks and frequency (and photon energy) grows along this list.",
      explain: `Longest to shortest wavelength: ${items.join(", ")}.`,
    });
  }
  if (kind === 2) {
    const E = pick([3, 6, 30, 150, 600]);
    return Q({
      key: `em-eb-${E}`,
      prompt: `The electric field of a light wave has amplitude ${E} V/m. What is the amplitude of its magnetic field?`,
      ...vals(E / C, [E * C, C / E, E / C / 1000], "T", 2, sci),
      hint: "In an EM wave E = cB.",
      explain: `B = E/c = ${E} ÷ 3.0 × 10⁸ = ${sci(E / C, 2)} T, perpendicular to E and to the direction of travel.`,
    });
  }
  if (kind === 3) {
    const s = pick([
      { q: "How are E and B arranged in an electromagnetic wave?", a: "Perpendicular to each other and to the direction of travel" },
      { q: "What do electromagnetic waves need to travel through?", a: "Nothing: they can cross a vacuum" },
      { q: "What produces electromagnetic waves?", a: "Accelerating (oscillating) charges" },
    ]);
    return Q({
      key: `em-fact-${s.q.slice(0, 16)}`,
      prompt: s.q,
      ...txt(s.a, ["Perpendicular to each other and to the direction of travel", "Nothing: they can cross a vacuum", "Accelerating (oscillating) charges", "Parallel to each other", "Air or another medium", "Charges at rest"].filter((x) => x !== s.a)),
      hint: "A changing electric field makes a magnetic field and vice versa: the wave sustains itself.",
      explain: `${s.a}.`,
    });
  }
  if (kind === 4) {
    const r = pick([
      { lam: "3 m", i: 0 },
      { lam: "1 cm", i: 1 },
      { lam: "10 μm", i: 2 },
      { lam: "500 nm", i: 3 },
      { lam: "200 nm", i: 4 },
      { lam: "0.1 nm", i: 5 },
    ]);
    return Q({
      key: `em-region-${r.lam}`,
      prompt: `An electromagnetic wave has wavelength ${r.lam}. Which part of the spectrum is it in?`,
      ...txt(SPECTRUM[r.i], some(SPECTRUM.filter((_, i) => i !== r.i), 3)),
      hint: "Visible light runs from about 400 nm (violet) to 700 nm (red). Longer: infrared, microwaves, radio. Shorter: UV, X-rays, gamma.",
      explain: `${r.lam} falls in the ${SPECTRUM[r.i]} range.`,
    });
  }
  const T = pick([1.3, 2.56, 8.3]);
  return Q({
    key: `em-time-${T}`,
    prompt: T === 8.3 ? "Light takes about 500 s to reach Earth from the Sun. How far away is the Sun?" : `A radio signal to a probe and back takes ${T} s. How far away is the probe?`,
    ...vals(T === 8.3 ? C * 500 : (C * T) / 2, T === 8.3 ? [C * 500 / 60, C * 8.3] : [C * T, (C * T) / 4], "m", 2, sci),
    hint: "Distance = speed × time, with c = 3.0 × 10⁸ m/s. A round trip covers the distance twice.",
    explain: T === 8.3 ? `d = 3.0 × 10⁸ × 500 = ${sci(C * 500, 2)} m.` : `One way takes ${T / 2} s, so d = 3.0 × 10⁸ × ${T / 2} = ${sci((C * T) / 2, 2)} m.`,
  });
}

/** PHYS.14.5 — the Doppler effect. */
export function doppler(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const f = pick([400, 500, 800, 1000]);
    const vs = pick([20, 30, 40]);
    const toward = pick([true, false]);
    const fp = (f * V_SOUND) / (V_SOUND + (toward ? -vs : vs));
    return Q({
      key: `do-src-${f}-${vs}-${toward}`,
      prompt: `A ${f} Hz siren moves at ${vs} m/s ${toward ? "toward" : "away from"} you (sound speed 340 m/s). What frequency do you hear?`,
      ...vals(fp, [(f * V_SOUND) / (V_SOUND + (toward ? vs : -vs)), (f * (V_SOUND + (toward ? vs : -vs))) / V_SOUND, f], "Hz", 3),
      hint: "Moving source: f′ = f × v/(v ∓ v_s). Use − when it approaches (waves bunch up), + when it recedes.",
      explain: `f′ = ${f} × 340/(340 ${toward ? "−" : "+"} ${vs}) ≈ ${nf(fp, 3)} Hz: ${toward ? "higher" : "lower"} than ${f} Hz.`,
    });
  }
  if (kind === 1) {
    const ahead = pick([true, false]);
    return Q({
      key: `do-pic-${ahead}-${rand(0, 4)}`,
      prompt: `The ambulance drives right with its siren on. Compared with the siren's real pitch, the person ${ahead ? "ahead of it (on the right)" : "behind it (on the left)"} hears:`,
      visual: { kind: "phys-motion", look: "ghosts", track: { min: 0, max: 20, step: 2, unit: "m" }, rows: [{ emoji: "🚑", positions: [6, 8, 10, 12], flip: true, name: "siren" }, { emoji: "🧍", positions: [ahead ? 19 : 1], name: "you" }] },
      ...txt(ahead ? "A higher pitch" : "A lower pitch", [ahead ? "A lower pitch" : "A higher pitch", "The same pitch", "No sound at all"]),
      hint: "Ahead of a moving source the wave crests are squeezed together; behind it they're stretched apart.",
      explain: ahead ? "The crests bunch up ahead of the ambulance: shorter wavelength, higher frequency." : "Behind the ambulance the crests spread out: longer wavelength, lower frequency.",
    });
  }
  if (kind === 2) {
    const f = pick([300, 500, 680, 1000]);
    const vo = pick([10, 17, 20, 34]);
    const toward = pick([true, false]);
    const fp = (f * (V_SOUND + (toward ? vo : -vo))) / V_SOUND;
    return Q({
      key: `do-obs-${f}-${vo}-${toward}`,
      prompt: `You drive at ${vo} m/s ${toward ? "toward" : "away from"} a stationary ${f} Hz alarm. What frequency do you hear? (v_sound = 340 m/s)`,
      ...vals(fp, [(f * V_SOUND) / (V_SOUND - (toward ? vo : -vo)), (f * (V_SOUND - (toward ? vo : -vo))) / V_SOUND, f], "Hz", 3),
      hint: "Moving observer: f′ = f × (v ± v_o)/v. Moving toward the source you meet crests more often.",
      explain: `f′ = ${f} × (340 ${toward ? "+" : "−"} ${vo})/340 ≈ ${nf(fp, 3)} Hz.`,
    });
  }
  if (kind === 3) {
    const lam0 = pick([486, 656]);
    const dl = pick([1, 2, 4, 5]) * pick([1, -1]);
    const v = (Math.abs(dl) / lam0) * C;
    return Q({
      key: `do-light-${lam0}-${dl}`,
      prompt: `A hydrogen line emitted at ${lam0} nm is seen from a star at ${lam0 + dl} nm. How fast is the star moving, and which way?`,
      ...txt(`${sci(v, 2)} m/s, ${dl > 0 ? "away from us" : "toward us"}`, [`${sci(v, 2)} m/s, ${dl > 0 ? "toward us" : "away from us"}`, `${sci(v * 10, 2)} m/s, ${dl > 0 ? "away from us" : "toward us"}`, `${sci((Math.abs(dl) / lam0) * 340, 2)} m/s, ${dl > 0 ? "away from us" : "toward us"}`]),
      hint: "For speeds much less than c: Δλ/λ = v/c. Longer (redshift) means moving away.",
      explain: `v = c × ${Math.abs(dl)}/${lam0} ≈ ${sci(v, 2)} m/s. The line is ${dl > 0 ? "redshifted: the star recedes" : "blueshifted: the star approaches"}.`,
    });
  }
  const f = pick([170, 340, 680]);
  const vs = pick([20, 40, 68]);
  const lam = (V_SOUND - vs) / f;
  return Q({
    key: `do-wl-${f}-${vs}`,
    prompt: `A ${f} Hz source moves at ${vs} m/s. What is the wavelength of the sound directly in front of it? (v = 340 m/s)`,
    ...vals(lam, [V_SOUND / f, (V_SOUND + vs) / f, vs / f], "m", 3),
    hint: "In one period T = 1/f, the source moves v_s T toward the last crest it made, so λ′ = (v − v_s)/f.",
    explain: `λ′ = (340 − ${vs}) ÷ ${f} = ${nf(lam, 3)} m, shorter than the ${nf(V_SOUND / f, 3)} m it would be at rest.`,
  });
}

/** PHYS.14.6 — standing waves on strings and in pipes. */
export function standingWaves(): Question {
  const kind = rand(0, 5);
  if (kind === 0 || kind === 1) {
    const L = pick([2, 3, 4, 6, 8, 12]);
    const n = pick([1, 2, 3, 4].filter((k) => Number.isInteger(((2 * L) / k) * 10)));
    const lam = (2 * L) / n;
    const ask = kind === 0 ? "lambda" : pick(["n", "nodes"] as const);
    return Q({
      key: `sw-pic-${L}-${n}-${ask}`,
      prompt: ask === "lambda" ? `A ${L} m string vibrates as shown. What is the wavelength?` : ask === "n" ? `A string vibrates as shown. Which harmonic is this?` : "How many nodes does this standing wave have, counting both ends?",
      visual: { kind: "phys-wave", form: "standing", length: L, waves: [{ amplitude: Math.min(1, L / 4), wavelength: lam }], names: ask !== "nodes" },
      needsVisual: true,
      ...kp(ask === "lambda" ? lam : ask === "n" ? n : n + 1),
      unit: ask === "lambda" ? "m" : undefined,
      hint: "Each loop is half a wavelength. The nth harmonic has n loops, n antinodes and n + 1 nodes.",
      explain: `There ${n === 1 ? "is 1 loop" : `are ${n} loops`}: harmonic ${n}, with λ = 2L/n = ${ds(lam)} m and ${n + 1} nodes.`,
    });
  }
  if (kind === 2) {
    const L = pick([0.5, 0.6, 0.8, 1, 1.2]);
    const v = pick([120, 240, 360, 480]);
    const n = rand(1, 3);
    const f = (n * v) / (2 * L);
    return Q({
      key: `sw-string-${L}-${v}-${n}`,
      prompt: `A ${L} m guitar string carries waves at ${v} m/s. What is the frequency of its ${["", "first", "second", "third"][n]} harmonic?`,
      ...kp(f),
      unit: "Hz",
      hint: "Fixed at both ends: λₙ = 2L/n, so fₙ = nv/(2L).",
      explain: `f${"₁₂₃"[n - 1]} = ${n} × ${v} ÷ (2 × ${L}) = ${ds(f)} Hz.`,
    });
  }
  if (kind === 3) {
    const closed = pick([true, false]);
    const L = closed ? pick([0.25, 0.5, 0.85, 1]) : pick([0.5, 0.85, 1, 1.7]);
    const f1 = V_SOUND / ((closed ? 4 : 2) * L);
    const which = pick(["first", "next"] as const);
    const ans = which === "first" ? f1 : (closed ? 3 : 2) * f1;
    return Q({
      key: `sw-pipe-${closed}-${L}-${which}`,
      prompt: `A ${L} m pipe is ${closed ? "closed at one end" : "open at both ends"}. What is its ${which === "first" ? "fundamental frequency" : "next resonant frequency above the fundamental"}? (v = 340 m/s)`,
      visual: { kind: "phys-sound", scene: "vibrate", source: "fork", rings: 3, pitch: L > 0.8 ? "low" : "high", label: closed ? "closed pipe" : "open pipe" },
      ...kp(ans),
      unit: "Hz",
      hint: closed ? "Closed at one end: a node at the closed end, an antinode at the open end, so L = λ/4 and only odd harmonics exist." : "Open at both ends: antinodes at each end, so L = λ/2 and all harmonics exist.",
      explain: `f₁ = 340 ÷ (${closed ? 4 : 2} × ${L}) = ${ds(f1)} Hz.${which === "next" ? ` The next is ${closed ? "3f₁ (odd harmonics only)" : "2f₁"} = ${ds(ans)} Hz.` : ""}`,
    });
  }
  if (kind === 4) {
    const k = pick([4, 9, 0.25]);
    return Q({
      key: `sw-tension-${k}`,
      prompt: `A violinist ${k > 1 ? "tightens" : "loosens"} a string so its tension is ${k < 1 ? `divided by ${1 / k}` : `multiplied by ${k}`}. By what factor does its fundamental frequency change?`,
      ...nums(Math.sqrt(k), [k, k / 2, k * k]),
      hint: "f = v/(2L) and v = √(T/μ).",
      explain: `v (and so f) goes as √T: the factor is √${k} = ${ds(Math.sqrt(k))}.`,
    });
  }
  return Q({
    key: `sw-why-${rand(0, 12)}`,
    prompt: "How does a standing wave on a string form?",
    ...txt("Waves reflecting from the ends interfere with incoming waves", ["The string stops moving at some points by friction", "The source shakes only at the nodes", "Energy travels along it in one direction"]),
    hint: "Think about what happens when a wave reaches a fixed end and meets the next wave coming in.",
    explain: "Reflected waves superpose with incoming ones of the same frequency; at the resonant frequencies they combine into fixed nodes and antinodes.",
  });
}

/** PHYS.14.6 — interference of sound: path difference and beats. */
export function interference(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const lam = pick([0.5, 1, 2]);
    const m = rand(0, 3);
    const half = pick([true, false]);
    const d = (m + (half ? 0.5 : 0)) * lam;
    const d1 = pick([3, 4, 5, 6]);
    return Q({
      key: `if-path-${lam}-${m}-${half}-${d1}`,
      prompt: `Two speakers play the same ${ds(V_SOUND / lam)} Hz tone in phase (λ = ${lam} m). You stand ${d1} m from one and ${ds(d1 + d)} m from the other. What do you hear?`,
      visual: { kind: "phys-sound", scene: "vibrate", source: "speaker", ear: true, rings: 3 },
      ...txt(half ? "Destructive interference: quiet" : "Constructive interference: loud", [half ? "Constructive interference: loud" : "Destructive interference: quiet", "Beats"], 3),
      hint: "Path difference a whole number of wavelengths: constructive. A half-wavelength more than that: destructive.",
      explain: `The path difference is ${ds(d)} m = ${ds(d / lam)} λ, so the waves arrive ${half ? "out of phase: destructive" : "in phase: constructive"}.`,
    });
  }
  if (kind === 1) {
    const f1 = pick([256, 440, 512, 330]);
    const df = rand(1, 6);
    const f2 = f1 + df * pick([1, -1]);
    return Q({
      key: `if-beats-${f1}-${f2}`,
      prompt: `Tuning forks of ${f1} Hz and ${f2} Hz sound together. How many beats per second do you hear?`,
      ...kp(df),
      unit: "Hz",
      hint: "Beat frequency = |f₁ − f₂|.",
      explain: `|${f1} − ${f2}| = ${df} beats per second.`,
    });
  }
  if (kind === 2) {
    const fr = pick([440, 330]);
    const b = rand(2, 5);
    return Q({
      key: `if-tune-${fr}-${b}`,
      prompt: `A guitar string and a ${fr} Hz fork give ${b} beats per second. Tightening the string slightly makes the beats slower. What was the string's frequency, in Hz?`,
      ...nums(fr - b, [fr + b, fr, b]),
      hint: "Tightening raises the pitch. If that brings it closer to the fork, it started below.",
      explain: `It was ${fr} ± ${b} Hz. Raising the pitch reduced the beats, so it was ${fr - b} Hz, below the fork.`,
    });
  }
  if (kind === 3) {
    const a = rand(2, 6);
    const b = rand(1, 5);
    const inPhase = pick([true, false]);
    return Q({
      key: `if-amp-${a}-${b}-${inPhase}`,
      prompt: `Two waves of amplitude ${a} cm and ${b} cm overlap ${inPhase ? "in phase" : "half a cycle out of phase"}. What is the amplitude of the result?`,
      visual: plot([0, 4], [-12, 12], "x", "y (cm)", {
        curves: [
          { fn: (x) => a * Math.sin(Math.PI * x), colour: "wave", dashed: true },
          { fn: (x) => (inPhase ? b : -b) * Math.sin(Math.PI * x), colour: "grape", dashed: true },
          { fn: (x) => (a + (inPhase ? b : -b)) * Math.sin(Math.PI * x), colour: "berry", label: "sum" },
        ],
      }),
      ...kp(inPhase ? a + b : Math.abs(a - b)),
      unit: "cm",
      hint: "Superposition: add the displacements point by point.",
      explain: inPhase ? `Crests line up: ${a} + ${b} = ${a + b} cm.` : `Crest meets trough: |${a} − ${b}| = ${Math.abs(a - b)} cm.`,
    });
  }
  const d = pick([0.5, 0.85, 1, 1.7]);
  return Q({
    key: `if-min-${d}`,
    prompt: `Two in-phase speakers are placed so the path difference to you is ${d} m. What is the lowest frequency that cancels there? (v = 340 m/s)`,
    ...kp(V_SOUND / (2 * d)),
    unit: "Hz",
    hint: "The lowest cancelling frequency has path difference = λ/2.",
    explain: `λ = 2 × ${d} = ${2 * d} m, so f = 340 ÷ ${2 * d} = ${ds(V_SOUND / (2 * d))} Hz.`,
  });
}

/** PHYS.14.7 — diffraction through a single opening. */
export function diffraction(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const lam = pick([400, 500, 600, 700]);
    const a = pick([1, 2, 5, 10]);
    const th = (Math.asin(lam / 1000 / a) * 180) / Math.PI;
    return Q({
      key: `df-angle-${lam}-${a}`,
      prompt: `${lam} nm light passes through a slit ${a} μm wide. At what angle is the first dark fringe, to the nearest degree?`,
      ...kp(Math.round(th)),
      unit: "°",
      hint: "Single slit: dark fringes where a sin θ = mλ. For the first, m = 1. (1 μm = 1000 nm.)",
      explain: `sin θ = ${lam} nm ÷ ${a * 1000} nm = ${ds(lam / 1000 / a)}, so θ ≈ ${Math.round(th)}°.`,
    });
  }
  if (kind === 1) {
    const what = pick(["narrower slit", "longer wavelength", "wider slit", "shorter wavelength"] as const);
    const wider = what === "narrower slit" || what === "longer wavelength";
    return Q({
      key: `df-change-${what}`,
      prompt: `The single-slit pattern is redone with a ${what}. What happens to the central bright band?`,
      ...txt(wider ? "It gets wider" : "It gets narrower", [wider ? "It gets narrower" : "It gets wider", "It stays the same", "It disappears"]),
      hint: "sin θ = λ/a: the spread grows with λ and shrinks with the slit width a.",
      explain: `The first minimum is at sin θ = λ/a; a ${what} makes that angle ${wider ? "bigger" : "smaller"}, so the central band gets ${wider ? "wider" : "narrower"}.`,
    });
  }
  if (kind === 2) {
    const lam = pick([500, 600, 650]);
    const a = pick([0.05, 0.1, 0.2]);
    const L = pick([1, 2, 3]);
    const w = (2 * lam * 1e-9 * L) / (a / 1000) * 1000;
    return Q({
      key: `df-width-${lam}-${a}-${L}`,
      prompt: `${lam} nm light passes through a ${a} mm slit onto a screen ${L} m away. How wide is the central bright band?`,
      ...vals(w, [w / 2, w * 1000, w * 4], "mm", 2),
      hint: "The first minima are at y = λL/a on either side (small angles), so the central band is 2λL/a wide.",
      explain: `Width = 2 × ${lam} × 10⁻⁹ × ${L} ÷ ${a / 1000} = ${nf(w, 2)} mm.`,
    });
  }
  if (kind === 3) {
    return Q({
      key: `df-door-${rand(0, 12)}`,
      prompt: "You can hear people talking around a doorway but can't see them. Why?",
      ...txt("Sound's wavelength is similar to the doorway's width; light's is far smaller", ["Sound travels faster than light", "Light can't pass through doorways", "Sound reflects but light doesn't"]),
      hint: "Diffraction is strong when the wavelength is comparable to the size of the gap.",
      explain: "Speech has wavelengths around a meter, like the door, so it spreads widely. Light's wavelength (~500 nm) is a million times smaller, so it barely diffracts.",
    });
  }
  const wa = pick([1, 1.5]);
  const wb = pick([2.5, 3]);
  const swap = pick([true, false]);
  const [la, lb] = swap ? ["B", "A"] : ["A", "B"];
  const ask = pick(["wider", "narrower"] as const);
  const ans = ask === "wider" ? la : lb;
  return Q({
    key: `df-patterns-${wa}-${wb}-${swap}-${ask}`,
    prompt: `The same light passes through two single slits, giving patterns ${la} and ${lb}. Which slit is ${ask}?`,
    visual: plot([-6, 6], [0, 1.1], "position on screen", "intensity", { curves: [{ fn: sinc2(wa), label: la, colour: "berry" }, { fn: sinc2(wb), label: lb, colour: "wave" }] }),
    needsVisual: true,
    ...txt(ans, [ans === "A" ? "B" : "A", "They're the same width"], 3),
    hint: "A narrow slit spreads light more: the central peak gets wider.",
    explain: `Pattern ${la} has the narrower central peak, so its slit is wider; ${lb} spreads more, so its slit is narrower.`,
  });
}

/** PHYS.14.8 — double-slit interference and diffraction gratings. */
export function doubleSlit(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const lam = pick([450, 500, 600, 650]);
    const L = pick([1, 1.5, 2]);
    const d = pick([0.2, 0.25, 0.5]);
    const dy = ((lam * 1e-9 * L) / (d / 1000)) * 1000;
    return Q({
      key: `ds-dy-${lam}-${L}-${d}`,
      prompt: `${lam} nm light falls on two slits ${d} mm apart. How far apart are the bright fringes on a screen ${L} m away?`,
      ...vals(dy, [dy * 1000, (lam * 1e-9 * d) / L, dy / 2], "mm", 2),
      hint: "Fringe spacing Δy = λL/d (small angles). Keep everything in meters.",
      explain: `Δy = ${lam} × 10⁻⁹ × ${L} ÷ ${d / 1000} = ${nf(dy, 2)} mm.`,
    });
  }
  if (kind === 1) {
    for (;;) {
      const dy = pick([1, 1.2, 1.5, 2, 2.4, 3]);
      const d = pick([0.2, 0.25, 0.3, 0.4, 0.5]);
      const L = pick([1, 1.5, 2]);
      const lam = (dy * d * 1000) / L;
      if (!Number.isInteger(dp(lam, 6)) || lam < 400 || lam > 700) continue;
      return Q({
        key: `ds-lambda-${dy}-${d}-${L}`,
        prompt: `Light through two slits ${d} mm apart gives this pattern on a screen ${L} m away. What is the wavelength, in nm?`,
        visual: plot([-3 * dy, 3 * dy], [0, 1.2], "y (mm)", "intensity", { curves: [{ fn: (y) => Math.cos((Math.PI * y) / dy) ** 2, colour: "berry" }], points: [{ x: 0, y: 1 }, { x: dy, y: 1, label: `${dy} mm` }] }),
        needsVisual: true,
        ...kp(dp(lam, 6)),
        unit: "nm",
        hint: "Read the fringe spacing Δy (peak to peak), then λ = Δy·d/L.",
        explain: `Δy = ${dy} mm, so λ = ${dy} × 10⁻³ × ${d} × 10⁻³ ÷ ${L} = ${dp(lam, 6)} nm.`,
      });
    }
  }
  if (kind === 2) {
    const [N, lam, m] = pick([[500, 500, 2], [500, 500, 1], [600, 500, 1], [300, 600, 1], [1000, 500, 1], [250, 400, 2], [800, 625, 1], [400, 500, 2], [200, 500, 3]] as [number, number, number][]);
    const exact = (Math.asin((m * lam * 1e-6 * N)) * 180) / Math.PI;
    return Q({
      key: `ds-grating-${N}-${lam}-${m}`,
      prompt: `A grating has ${N} lines per mm. At what angle is the order-${m} bright line for ${lam} nm light? (nearest degree)`,
      ...kp(Math.round(exact)),
      unit: "°",
      hint: "Slit spacing d = 1/N (convert to meters or nm). Bright lines where d sin θ = mλ.",
      explain: `d = 1/${N} mm = ${ds(1e6 / N)} nm; sin θ = ${m} × ${lam} ÷ ${ds(1e6 / N)} = ${ds(dp((m * lam * N) / 1e6, 4))}, θ ≈ ${Math.round(exact)}°.`,
    });
  }
  if (kind === 3) {
    const N = pick([300, 500, 600, 800]);
    const lam = pick([400, 500, 600, 700]);
    const d = 1e6 / N;
    const mmax = Math.floor(d / lam - 1e-9);
    return Q({
      key: `ds-max-${N}-${lam}`,
      prompt: `What is the highest order of bright line you can see for ${lam} nm light through a ${N} lines/mm grating?`,
      ...kp(mmax),
      hint: "sin θ can't exceed 1, so m ≤ d/λ.",
      explain: `d = ${ds(dp(d, 1))} nm and d/λ = ${ds(dp(d / lam, 2))}. m must be less than that (m = d/λ would need θ = 90°), so the highest order is ${mmax}.`,
    });
  }
  const s = pick([
    { t: "the slits are moved closer together", a: "Farther apart" },
    { t: "red light is used instead of blue", a: "Farther apart" },
    { t: "the whole setup is put under water", a: "Closer together" },
    { t: "the screen is moved farther away", a: "Farther apart" },
    { t: "the slit separation is doubled", a: "Closer together" },
  ]);
  return Q({
    key: `ds-change-${s.t}`,
    prompt: `In a double-slit experiment, ${s.t}. What happens to the bright fringes on the screen?`,
    ...txt(s.a, ["Farther apart", "Closer together", "No change", "They vanish"].filter((x) => x !== s.a)),
    hint: "Δy = λL/d. In water λ is shorter (λ/n).",
    explain: `Δy = λL/d: ${s.t} makes Δy ${s.a === "Farther apart" ? "larger" : "smaller"}.`,
  });
}

/** PHYS.14.9 — thin-film interference. */
export function thinFilms(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const s = pick([
      { t: "a soap film (n = 1.33) in air", a: "Only at the top surface" },
      { t: "an oil film (n = 1.45) floating on water (n = 1.33)", a: "Only at the top surface" },
      { t: "a coating (n = 1.38) on glass (n = 1.50)", a: "At both surfaces" },
      { t: "a thin layer of water (n = 1.33) on glass (n = 1.50)", a: "At both surfaces" },
      { t: "an air gap between two glass plates", a: "Only at the bottom surface (air to glass)" },
    ]);
    return Q({
      key: `tf-phase-${s.t}`,
      prompt: `Light shines on ${s.t}. Where does the reflected light flip phase by half a wavelength?`,
      ...txt(s.a, ["Only at the top surface", "At both surfaces", "Only at the bottom surface (air to glass)", "At neither surface"].filter((x) => x !== s.a)),
      hint: "A reflection flips phase only when light reflects off a medium with a higher index than the one it's in.",
      explain: `${s.a}: check each surface for low n → high n.`,
    });
  }
  if (kind === 1 || kind === 2) {
    const coat = kind === 2;
    const lam = pick([480, 532, 550, 600, 640]);
    const n = coat ? 1.38 : 1.33;
    const t = lam / (4 * n);
    return Q({
      key: `tf-thick-${coat}-${lam}`,
      prompt: coat
        ? `A lens (n = 1.50) gets an anti-reflection coating with n = 1.38. What is the thinnest coating that cancels reflected ${lam} nm light? (nearest nm)`
        : `What is the thinnest soap film (n = 1.33, in air) that strongly reflects ${lam} nm light? (nearest nm)`,
      ...kp(Math.round(t)),
      unit: "nm",
      hint: coat
        ? "Both reflections flip, so they cancel when the extra path 2nt is half a wavelength: 2nt = λ/2."
        : "Only the top reflection flips, so bright reflection needs 2nt = λ/2 (the extra half wave from the flip makes it a whole one).",
      explain: `t = λ/(4n) = ${lam} ÷ (4 × ${n}) ≈ ${Math.round(t)} nm.`,
    });
  }
  if (kind === 3) {
    return Q({
      key: `tf-dark-${rand(0, 12)}`,
      prompt: "Just before a soap bubble pops, the very top looks black in reflected light. Why?",
      ...txt("The film is much thinner than λ, and the one phase flip makes the reflections cancel", ["All the soap has drained to the top", "The film absorbs all light", "It is thicker there, so the reflections add"]),
      hint: "As t → 0 the path difference vanishes. What's left?",
      explain: "With almost no path difference, only the half-wave flip at the top surface remains, so the two reflected waves are out of phase and cancel: the film looks dark.",
    });
  }
  const t = pick([250, 300]);
  const n = 1.45;
  const lam = (2 * n * t) / 1.5;
  return Q({
    key: `tf-oil-${t}`,
    prompt: `An oil film (n = 1.45) ${t} nm thick floats on water (n = 1.33). Which visible wavelength reflects most strongly? (nearest nm)`,
    ...kp(Math.round(lam)),
    unit: "nm",
    hint: "One phase flip (top surface only), so bright reflection needs 2nt = (m + ½)λ. Try m = 0, 1, 2 and keep the one between 400 and 700 nm.",
    explain: `2nt = ${dp(2 * n * t, 1)} nm. m = 0 gives ${Math.round(2 * 2 * n * t)} nm (infrared); m = 1 gives ${Math.round(lam)} nm, which is visible.`,
  });
}

/* ===================================================================== 7. Modern physics */

/** Wavelengths (nm) whose photon energies 1240/λ are tidy. */
const NICE_LAMBDA = [124, 155, 248, 310, 400, 496, 620, 800, 1240];
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => [...String(n)].map((d) => SUB[Number(d)]).join("");
const nuc = (A: number, Z: number, s: string) => `${sup(A)}${sub(Z)}${s}`;

/** PHYS.15.1 — photons: E = hf = hc/λ. */
export function photons(): Question {
  const kind = rand(0, 5);
  if (kind === 0 || kind === 5) {
    const lam = pick(NICE_LAMBDA);
    const E = HC / lam;
    const toE = kind === 0;
    return Q({
      key: `ph-ev-${lam}-${toE}`,
      prompt: toE ? `What is the energy of a ${lam} nm photon, in eV? (hc = 1240 eV·nm)` : `A photon carries ${ds(E)} eV. What is its wavelength? (hc = 1240 eV·nm)`,
      ...kp(toE ? E : lam),
      unit: toE ? "eV" : "nm",
      hint: "E = hc/λ. With hc = 1240 eV·nm, E (eV) = 1240 ÷ λ (nm).",
      explain: toE ? `E = 1240 ÷ ${lam} = ${ds(E)} eV.` : `λ = 1240 ÷ ${ds(E)} = ${lam} nm.`,
    });
  }
  if (kind === 1) {
    const f = pick([4.5e14, 5e14, 6e14, 7.5e14, 1e15, 3e18]);
    const E = H * f;
    return Q({
      key: `ph-j-${f}`,
      prompt: `What is the energy of a photon of frequency ${sci(f, 2)} Hz, in joules?`,
      ...vals(E, [f / H, H / f, HEV * f], "J", 2, sci),
      hint: "E = hf with h = 6.63 × 10⁻³⁴ J·s.",
      explain: `E = 6.63 × 10⁻³⁴ × ${sci(f, 2)} ≈ ${sci(E, 2)} J (${nf(HEV * f, 3)} eV).`,
    });
  }
  if (kind === 2) {
    const P = pick([1, 2, 5]);
    const lam = pick([405, 532, 633, 650]);
    const N = (P * 1e-3 * lam * 1e-9) / (H * C);
    return Q({
      key: `ph-rate-${P}-${lam}`,
      prompt: `A ${P} mW laser emits ${lam} nm light. How many photons does it emit each second?`,
      ...vals(N, [(P * lam * 1e-9) / (H * C), (P * 1e-3 * H * C) / (lam * 1e-9), N / 1000], "", 2, sci),
      hint: "Photons per second = power ÷ energy per photon, with E = hc/λ in joules.",
      explain: `E = hc/λ = ${sci((H * C) / (lam * 1e-9), 2)} J, so N = ${sci(P * 1e-3, 1)} ÷ that ≈ ${sci(N, 2)} photons/s.`,
    });
  }
  if (kind === 3) {
    const lam = pick([400, 500, 600, 1]);
    const L = lam === 1 ? 1e-10 : lam * 1e-9;
    const p = H / L;
    return Q({
      key: `ph-p-${lam}`,
      prompt: `What is the momentum of a photon with wavelength ${lam === 1 ? "0.1 nm (an X-ray)" : `${lam} nm`}?`,
      ...vals(p, [H * L, H / (L * C), (H * C) / L], "kg·m/s", 2, sci),
      hint: "Photons have momentum even though they have no mass: p = h/λ = E/c.",
      explain: `p = 6.63 × 10⁻³⁴ ÷ ${sci(L, 1)} = ${sci(p, 2)} kg·m/s.`,
    });
  }
  const s = pick([
    { q: "A dim blue light and a bright red light: which sends photons with more energy each?", a: "The blue light", w: ["The red light", "They are equal", "It depends on the brightness"] },
    { q: "A light source is made brighter without changing its color. What changes?", a: "More photons per second, same energy each", w: ["More energy per photon, same number", "Both the number and the energy of photons", "The speed of the photons"] },
  ]);
  return Q({
    key: `ph-fact-${s.a}`,
    prompt: s.q,
    ...txt(s.a, s.w),
    hint: "Each photon's energy depends only on its frequency (color): E = hf. Brightness counts photons.",
    explain: s.a === "The blue light" ? "Blue light has the higher frequency, so each photon carries more energy, however dim the beam." : "Brightness is the number of photons per second; the color, and so each photon's energy, stays the same.",
  });
}

/** PHYS.15.1 — wave–particle duality and de Broglie wavelengths. */
export function duality(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const v = pick([1, 2, 5, 8]) * 10 ** pick([5, 6]);
    const lam = H / (ME * v);
    return Q({
      key: `du-v-${v}`,
      prompt: `What is the de Broglie wavelength of an electron moving at ${sci(v, 1)} m/s?`,
      ...vals(lam, [H / (MP * v), (H * v) / ME, lam * 1000], "m", 2, sci),
      hint: "λ = h/p = h/(mv), with mₑ = 9.11 × 10⁻³¹ kg.",
      explain: `λ = 6.63 × 10⁻³⁴ ÷ (9.11 × 10⁻³¹ × ${sci(v, 1)}) ≈ ${sci(lam, 2)} m.`,
    });
  }
  if (kind === 1) {
    const V = pick([50, 100, 150, 1000, 10000]);
    const lam = H / Math.sqrt(2 * ME * QE * V);
    return Q({
      key: `du-V-${V}`,
      prompt: `An electron is accelerated from rest through ${V} V. What is its de Broglie wavelength?`,
      ...vals(lam, [H / (2 * ME * QE * V), H / Math.sqrt(ME * QE * V), H / Math.sqrt(2 * MP * QE * V)], "m", 2, sci),
      hint: "K = eV, and p = √(2mK). Then λ = h/p.",
      explain: `p = √(2 × 9.11 × 10⁻³¹ × 1.6 × 10⁻¹⁹ × ${V}) ≈ ${sci(Math.sqrt(2 * ME * QE * V), 2)} kg·m/s, so λ ≈ ${sci(lam, 2)} m, about the spacing of atoms in a crystal.`,
    });
  }
  if (kind === 2) {
    const e = pick([
      { t: "Electrons make a diffraction pattern off a crystal", a: "Wave" },
      { t: "Single electrons build up a two-slit interference pattern", a: "Wave" },
      { t: "Light ejects electrons only above a threshold frequency", a: "Particle" },
      { t: "X-rays bounce off electrons and lose energy like billiard balls (Compton)", a: "Particle" },
      { t: "Light spreads out after passing through a narrow slit", a: "Wave" },
      { t: "A faint light image builds up dot by dot on a detector", a: "Particle" },
    ]);
    return Q({
      key: `du-evidence-${e.t.slice(0, 20)}`,
      prompt: `"${e.t}." Does this show wave behavior or particle behavior?`,
      ...txt(e.a === "Wave" ? "Wave behavior" : "Particle behavior", [e.a === "Wave" ? "Particle behavior" : "Wave behavior", "Neither"], 3),
      hint: "Interference and diffraction are wave signatures. Localized, all-or-nothing energy and momentum transfers are particle signatures.",
      explain: `${e.t}: that's ${e.a === "Wave" ? "interference or diffraction, a wave effect" : "a localized, quantized interaction, a particle effect"}.`,
    });
  }
  if (kind === 3) {
    const same = pick(["speed", "kinetic energy"] as const);
    const ans = same === "speed" ? "The electron's, about 1800 times longer" : "The electron's, about 43 times longer";
    return Q({
      key: `du-compare-${same}`,
      prompt: `An electron and a proton have the same ${same}. Which has the longer de Broglie wavelength?`,
      ...txt(ans, [same === "speed" ? "The electron's, about 43 times longer" : "The electron's, about 1800 times longer", "The proton's", "They are equal"]),
      hint: same === "speed" ? "λ = h/(mv): same v, so λ ∝ 1/m." : "p = √(2mK): same K, so λ ∝ 1/√m.",
      explain: same === "speed" ? "λ ∝ 1/m and mₚ/mₑ ≈ 1836, so the electron's wavelength is ~1800 times longer." : "λ ∝ 1/√m and √1836 ≈ 43, so the electron's wavelength is ~43 times longer.",
    });
  }
  const m = pick([0.145, 0.057, 0.45]);
  const v = pick([20, 40]);
  const lam = H / (m * v);
  return Q({
    key: `du-ball-${m}-${v}`,
    prompt: `What is the de Broglie wavelength of a ${m} kg ball moving at ${v} m/s?`,
    ...vals(lam, [m * v * H, H / m, lam * 1e20], "m", 2, sci),
    hint: "λ = h/(mv). Compare the answer with the size of anything it could diffract through.",
    explain: `λ = 6.63 × 10⁻³⁴ ÷ (${m} × ${v}) ≈ ${sci(lam, 2)} m, far smaller than any opening, so a ball never shows wave behavior.`,
  });
}

/** Planck spectrum (relative) at temperature T, wavelength in μm. */
const planck = (T: number) => (l: number) => (l <= 0.05 ? 0 : 1 / (l ** 5 * (Math.exp(14388 / (l * T)) - 1)));

/** PHYS.15.4 — blackbody radiation and Wien's law. */
export function blackbody(): Question {
  const kind = rand(0, 5);
  const WIEN: [number, number][] = [[2900, 1000], [5800, 500], [7250, 400], [3625, 800], [10000, 290], [4000, 725], [5000, 580], [2000, 1450], [6000, 483]];
  if (kind === 0 || kind === 1) {
    const [T, lam] = pick(WIEN.filter(([t]) => t !== 6000));
    const toLam = kind === 0;
    return Q({
      key: `bb-wien-${T}-${toLam}`,
      prompt: toLam ? `At what wavelength does a ${T} K blackbody radiate most strongly? (Wien: λ_max T = 2.9 × 10⁻³ m·K)` : `A star's spectrum peaks at ${lam} nm. What is its surface temperature? (λ_max T = 2.9 × 10⁻³ m·K)`,
      ...kp(toLam ? lam : T),
      unit: toLam ? "nm" : "K",
      hint: "Wien's law: λ_max = 2.9 × 10⁻³ m·K ÷ T. Hotter objects peak at shorter wavelengths.",
      explain: toLam ? `λ_max = 2.9 × 10⁻³ ÷ ${T} = ${sci(lam * 1e-9, 2)} m = ${lam} nm.` : `T = 2.9 × 10⁻³ ÷ ${lam} × 10⁻⁹ = ${T} K.`,
    });
  }
  if (kind === 2) {
    const [Tc, Th] = pick([[3000, 5000], [4000, 6000], [3500, 5500], [4000, 7000]]);
    const hotLabel = pick(["A", "B"]);
    const coldLabel = hotLabel === "A" ? "B" : "A";
    const peak = planck(Th)(2898 / Th);
    const ask = pick(["hotter", "cooler"] as const);
    return Q({
      key: `bb-curves-${Tc}-${Th}-${hotLabel}-${ask}`,
      prompt: `These are the spectra of two stars of the same size. Which star is ${ask}?`,
      visual: plot([0, 3], [0, 1.1], "λ (μm)", "intensity", {
        curves: [
          { fn: (l) => planck(Th)(l) / peak, label: hotLabel, colour: "wave" },
          { fn: (l) => planck(Tc)(l) / peak, label: coldLabel, colour: "berry" },
        ],
      }),
      needsVisual: true,
      ...txt(ask === "hotter" ? hotLabel : coldLabel, [ask === "hotter" ? coldLabel : hotLabel, "Same temperature"], 3),
      hint: "A hotter blackbody emits more at every wavelength, and its peak moves to shorter wavelengths.",
      explain: `Star ${hotLabel}'s curve is higher everywhere and peaks at a shorter wavelength, so ${hotLabel} is hotter (about ${Th} K vs ${Tc} K).`,
    });
  }
  if (kind === 3) {
    const k = pick([2, 3, 0.5]);
    return Q({
      key: `bb-stefan-${k}`,
      prompt: `If a star's surface temperature were ${k === 0.5 ? "halved" : `multiplied by ${k}`} with no change in size, by what factor would its total power change?`,
      ...nums(k ** 4, [k, k * k, k ** 3]),
      hint: "Total radiated power ∝ AT⁴ (Stefan–Boltzmann).",
      explain: `P ∝ T⁴: ${k}⁴ = ${ds(k ** 4)}.`,
    });
  }
  if (kind === 4) {
    return Q({
      key: `bb-uv-${rand(0, 12)}`,
      prompt: "Classical physics predicted a blackbody would emit unlimited energy at short wavelengths. How did Planck fix this?",
      ...txt("He assumed energy is emitted in quanta E = hf, so high-frequency modes are rarely excited", ["He assumed light travels faster at short wavelengths", "He assumed atoms can't emit ultraviolet at all", "He changed the speed of light"]),
      hint: "This 'ultraviolet catastrophe' started quantum theory.",
      explain: "Planck proposed energy comes in packets hf. High-frequency packets cost so much energy that few are emitted, so the spectrum falls off at short wavelengths.",
    });
  }
  const s = pick([
    { q: "Betelgeuse looks red and Rigel looks blue-white. Which is hotter?", a: "Rigel" },
    { q: "A metal bar is heated until it glows. As it gets hotter, its color shifts from:", a: "Red to orange to white" },
  ]);
  return Q({
    key: `bb-color-${s.a}`,
    prompt: s.q,
    ...txt(s.a, s.a === "Rigel" ? ["Betelgeuse", "They're the same", "You can't tell from color"] : ["White to orange to red", "Blue to green to red", "It doesn't change"]),
    hint: "Wien's law: the peak wavelength shrinks as temperature rises.",
    explain: s.a === "Rigel" ? "A bluer color means a shorter peak wavelength, so a higher temperature: Rigel." : "As T rises the peak moves from infrared toward visible, and the glow goes red → orange → white.",
  });
}

/** PHYS.15.2 — the Bohr model of hydrogen. */
export function bohr(): Question {
  const kind = rand(0, 5);
  const En = (n: number) => -13.6 / (n * n);
  if (kind === 0) {
    const n = rand(2, 6);
    return Q({
      key: `bo-level-${n}`,
      prompt: `What is the energy of the n = ${n} level of hydrogen?`,
      ...vals(En(n), [-13.6 / n, 13.6 / (n * n), -13.6 * n * n], "eV", 3),
      hint: "Eₙ = −13.6 eV/n². Negative means bound: it takes energy to free the electron.",
      explain: `E${sub(n)} = −13.6/${n * n} = ${nf(En(n), 3)} eV.`,
    });
  }
  if (kind === 1 || kind === 2) {
    const nf_ = rand(1, 3);
    const ni = nf_ + rand(1, 3);
    const dE = En(ni) - En(nf_);
    const lam = HC / dE;
    const askLam = kind === 2;
    return Q({
      key: `bo-trans-${ni}-${nf_}-${askLam}`,
      prompt: askLam ? `What is the wavelength of the photon emitted when hydrogen's electron drops from n = ${ni} to n = ${nf_}?` : `How much energy does the photon carry when hydrogen's electron drops from n = ${ni} to n = ${nf_}?`,
      ...(askLam ? vals(lam, [HC / -En(ni), HC / -En(nf_), lam / 2], "nm", 3) : vals(dE, [-En(ni), -En(nf_), -(En(ni) + En(nf_))], "eV", 3)),
      hint: "The photon carries the energy difference: E = 13.6(1/n_f² − 1/n_i²) eV. Then λ = 1240/E nm.",
      explain: `E = ${nf(En(ni), 3)} − (${nf(En(nf_), 3)}) = ${nf(dE, 3)} eV${askLam ? `, so λ = 1240 ÷ ${nf(dE, 3)} ≈ ${nf(lam, 3)} nm${lam > 400 && lam < 700 ? " (visible)" : lam < 400 ? " (ultraviolet)" : " (infrared)"}` : ""}.`,
    });
  }
  if (kind === 3) {
    const n = rand(1, 4);
    const ask = pick(["ion", "radius"] as const);
    return Q({
      key: `bo-${ask}-${n}`,
      prompt: ask === "ion" ? `How much energy ionizes a hydrogen atom whose electron is in the n = ${n} level?` : `In the Bohr model r₁ = 0.053 nm. What is the radius of the n = ${n} orbit?`,
      ...(ask === "ion" ? vals(13.6 / (n * n), [13.6, 13.6 / n, 13.6 * n * n], "eV", 3) : vals(0.053 * n * n, [0.053 * n, 0.053 / n, 0.053 * n * n * n], "nm", 3)),
      hint: ask === "ion" ? "Ionizing means raising the electron to E = 0." : "rₙ = n² r₁.",
      explain: ask === "ion" ? `It must go from ${nf(En(n), 3)} eV to 0: ${nf(13.6 / (n * n), 3)} eV.` : `r = ${n}² × 0.053 = ${nf(0.053 * n * n, 3)} nm.`,
    });
  }
  if (kind === 4) {
    const E = pick([10.2, 11, 12.09, 5, 14]);
    const ans = E === 10.2 ? "Yes, it lifts the electron to n = 2" : E === 12.09 ? "Yes, it lifts the electron to n = 3" : E === 14 ? "Yes, it ionizes the atom" : "No, it matches no energy difference, so it passes through";
    return Q({
      key: `bo-absorb-${E}`,
      prompt: `A hydrogen atom in its ground state (−13.6 eV) is hit by a ${E} eV photon. Is the photon absorbed?`,
      ...txt(ans, ["Yes, it lifts the electron to n = 2", "Yes, it lifts the electron to n = 3", "Yes, it ionizes the atom", "No, it matches no energy difference, so it passes through"].filter((x) => x !== ans)),
      hint: "Levels: −13.6, −3.4, −1.51 eV… A photon is absorbed only if its energy exactly matches a jump (or is enough to ionize, 13.6 eV or more).",
      explain: `Jumps from n = 1: 10.2 eV (to 2), 12.09 eV (to 3), … 13.6 eV (free). ${ans}.`,
    });
  }
  return Q({
    key: `bo-idea-${rand(0, 12)}`,
    prompt: "What was Bohr's key new idea about the hydrogen atom?",
    ...txt("Electrons occupy only certain energy levels and emit photons when they jump down", ["Electrons spiral steadily into the nucleus", "The nucleus is spread through the atom", "Electrons can have any energy"]),
    hint: "Think about why atoms give line spectra instead of rainbows.",
    explain: "Bohr proposed allowed orbits with fixed energies; light is emitted or absorbed only in jumps between them, with E_photon = ΔE, giving discrete spectral lines.",
  });
}

/** PHYS.15.3 — emission and absorption spectra from energy-level diagrams. */
export function spectra(): Question {
  const kind = rand(0, 5);
  const sets: number[][] = [[-10, -6, -3, -1], [-12, -7, -4, -2], [-8, -5, -3, -1], [-9, -5, -2, -1], [-11, -6.5, -3.5, -1.5]];
  const lv = pick(sets);
  const diagram = (hl?: [number, number]): Visual =>
    plot([0, 6], [Math.min(...lv) - 2, 0], "", "E (eV)", {
      lines: [...lv.map((e) => ({ from: [0.5, e] as [number, number], to: [4.5, e] as [number, number], colour: "night" as Colour })), ...(hl ? [{ from: [2.5, lv[hl[0]]] as [number, number], to: [2.5, lv[hl[1]]] as [number, number], colour: "berry" as Colour, dashed: true }] : [])],
      points: lv.map((e, i) => ({ x: 4.5, y: e, label: `n = ${i + 1}` })),
    });
  if (kind === 0 || kind === 1) {
    const [lo, hi] = some([0, 1, 2, 3], 2).sort((a, b) => a - b);
    const dE = lv[hi] - lv[lo];
    const askLam = kind === 1 && Number.isInteger((HC / dE) * 10);
    return Q({
      key: `sp-gap-${lv.join("")}-${hi}-${lo}-${askLam}`,
      prompt: askLam ? `An electron in this atom drops from n = ${hi + 1} to n = ${lo + 1}. What wavelength of light is emitted, in nm?` : `An electron in this atom drops from n = ${hi + 1} to n = ${lo + 1}. What energy does the emitted photon carry?`,
      visual: diagram([hi, lo]),
      needsVisual: true,
      ...kp(askLam ? HC / dE : dE),
      unit: askLam ? "nm" : "eV",
      hint: "The photon's energy is the gap between the levels. λ = 1240/E (nm, with E in eV).",
      explain: `E = ${ds(lv[hi])} − (${ds(lv[lo])}) = ${ds(dE)} eV${askLam ? `, λ = 1240 ÷ ${ds(dE)} = ${ds(HC / dE)} nm` : ""}.`,
    });
  }
  if (kind === 2) {
    const n = rand(2, 6);
    return Q({
      key: `sp-lines-${n}`,
      prompt: `Atoms are excited to the n = ${n} level. How many different spectral lines can they emit as they cascade down?`,
      ...kp((n * (n - 1)) / 2),
      hint: "Count every pair of levels from 1 to n: n(n − 1)/2.",
      explain: `Each pair of the ${n} levels gives one line: ${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}.`,
    });
  }
  if (kind === 3) {
    const pairs: [number, number][] = [[1, 0], [2, 0], [3, 0], [2, 1], [3, 1], [3, 2]];
    const gaps = pairs.map(([h, l]) => lv[h] - lv[l]);
    const longest = pick([true, false]);
    const target = longest ? Math.min(...gaps) : Math.max(...gaps);
    if (gaps.filter((g) => g === target).length > 1) return spectra();
    const idx = gaps.indexOf(target);
    const lab = ([h, l]: [number, number]) => `${h + 1} → ${l + 1}`;
    const ans = lab(pairs[idx]);
    return Q({
      key: `sp-extreme-${lv.join("")}-${longest}`,
      prompt: `Which downward jump in this atom gives the ${longest ? "longest" : "shortest"}-wavelength light?`,
      visual: diagram(),
      needsVisual: true,
      ...txt(ans, some(pairs.filter((_, i) => i !== idx).map(lab), 3)),
      hint: "λ = hc/E: the longest wavelength comes from the smallest energy gap, the shortest from the biggest.",
      explain: `${ans} has the ${longest ? "smallest" : "largest"} gap (${ds(gaps[idx])} eV), so its light has the ${longest ? "longest" : "shortest"} wavelength.`,
    });
  }
  if (kind === 4) {
    return Q({
      key: `sp-absorb-${rand(0, 12)}`,
      prompt: "White light passes through a cool gas. How do the dark lines in its absorption spectrum compare with the gas's bright emission lines?",
      ...txt("They're at the same wavelengths", ["They're at completely different wavelengths", "There are no dark lines; the spectrum is continuous", "They're all in the ultraviolet"]),
      hint: "Both come from jumps between the same pairs of energy levels.",
      explain: "An atom absorbs exactly the photon energies it can emit (the same level gaps), so the dark lines sit where the bright lines would be.",
    });
  }
  return Q({
    key: `sp-why-${rand(0, 12)}`,
    prompt: "Why does a glowing gas give a line spectrum rather than a continuous rainbow?",
    ...txt("Its atoms have discrete energy levels, so only certain photon energies come out", ["Its atoms are too far apart to glow", "The gas filters out most colors", "Glowing gases are always one color"]),
    hint: "Each spectral line is one jump between two levels.",
    explain: "Electrons can only drop between fixed levels, so each photon has one of a few fixed energies: a fingerprint of lines unique to each element.",
  });
}

const METALS_PHI = [
  { name: "cesium", phi: 2.1 },
  { name: "sodium", phi: 2.3 },
  { name: "calcium", phi: 2.9 },
  { name: "zinc", phi: 4.3 },
  { name: "copper", phi: 4.7 },
];

/** PHYS.15.5 — the photoelectric effect. */
export function photoelectric(): Question {
  const kind = rand(0, 5);
  if (kind === 0 || kind === 4) {
    for (;;) {
      const m = pick(METALS_PHI);
      const lam = pick([124, 155, 200, 248, 310, 400]);
      const E = HC / lam;
      const K = dp(E - m.phi, 2);
      if (K <= 0) continue;
      const stop = kind === 4;
      return Q({
        key: `pe-k-${m.name}-${lam}-${stop}`,
        prompt: stop ? `${lam} nm light shines on ${m.name} (work function ${m.phi} eV). What stopping voltage halts the fastest electrons?` : `${lam} nm light shines on ${m.name} (work function ${m.phi} eV). What is the maximum kinetic energy of the ejected electrons?`,
        ...kp(K),
        unit: stop ? "V" : "eV",
        hint: `Photon energy E = 1240/λ eV. Then K_max = E − φ.${stop ? " The stopping voltage satisfies eV_s = K_max." : ""}`,
        explain: `E = 1240 ÷ ${lam} = ${ds(dp(E, 2))} eV, K_max = ${ds(dp(E, 2))} − ${m.phi} = ${ds(K)} eV${stop ? `, so V_s = ${ds(K)} V` : ""}.`,
      });
    }
  }
  if (kind === 1) {
    const m = pick(METALS_PHI);
    const ask = pick(["f", "lambda"] as const);
    const f0 = m.phi / HEV;
    return Q({
      key: `pe-thresh-${m.name}-${ask}`,
      prompt: ask === "f" ? `What is the threshold frequency for ${m.name} (φ = ${m.phi} eV)?` : `What is the longest wavelength of light that can eject electrons from ${m.name} (φ = ${m.phi} eV)?`,
      ...(ask === "f" ? vals(f0, [m.phi * HEV, m.phi / H, f0 / 10], "Hz", 2, sci) : vals(HC / m.phi, [m.phi * HC / 1000, HC / m.phi / 2, HC / (2 * m.phi) * 3], "nm", 3)),
      hint: "At threshold the photon has just enough energy: hf₀ = φ. Use h = 4.14 × 10⁻¹⁵ eV·s, or λ₀ = 1240/φ nm.",
      explain: ask === "f" ? `f₀ = φ/h = ${m.phi} ÷ 4.14 × 10⁻¹⁵ ≈ ${sci(f0, 2)} Hz.` : `λ₀ = 1240 ÷ ${m.phi} ≈ ${nf(HC / m.phi, 3)} nm; longer wavelengths eject nothing.`,
    });
  }
  if (kind === 2) {
    const change = pick(["brighter (same color)", "higher in frequency (same brightness)"] as const);
    const ans = change === "brighter (same color)" ? "More electrons per second, same maximum KE" : "Same number of electrons, higher maximum KE";
    return Q({
      key: `pe-change-${change}`,
      prompt: `Light above the threshold frequency ejects electrons from a metal. The light is made ${change}. What happens?`,
      ...txt(ans, ["More electrons per second, same maximum KE", "Same number of electrons, higher maximum KE", "More electrons and higher maximum KE", "Nothing changes"].filter((x) => x !== ans)),
      hint: "One photon frees one electron. Brightness = number of photons; frequency = energy per photon.",
      explain: change === "brighter (same color)" ? "More photons per second free more electrons, but each photon still has the same hf, so K_max is unchanged." : "Each photon now has more energy, so K_max = hf − φ rises; the photon rate (and so the current) stays about the same.",
    });
  }
  if (kind === 3) {
    return Q({
      key: `pe-below-${rand(0, 12)}`,
      prompt: "Very bright red light shines on zinc for an hour but no electrons come out, while dim ultraviolet ejects them at once. Why?",
      ...txt("Each red photon has less energy than the work function; energy can't build up from several photons", ["Red light is absorbed by the air", "Zinc needs to warm up first", "Dim light has more energy than bright light"]),
      hint: "Classical waves would deliver energy gradually. What does the photon model say?",
      explain: "Energy arrives in photons of hf. Below threshold no single photon can free an electron, however many arrive. This is why Einstein proposed photons.",
    });
  }
  const lam = pick([200, 248, 310, 400, 496, 620]);
  const E = HC / lam;
  const ok = METALS_PHI.filter((m) => m.phi < E);
  if (!ok.length || ok.length === METALS_PHI.length) return photoelectric();
  const ask = pick(ok);
  return Q({
    key: `pe-which-${lam}-${ask.name}`,
    prompt: `${lam} nm light shines on each of these metals. Which one does it eject electrons from?`,
    visual: table(["metal", "φ (eV)"], METALS_PHI.map((m) => [m.name, m.phi])),
    ...txt(ask.name, METALS_PHI.filter((m) => m.phi >= E).map((m) => m.name)),
    hint: "Find the photon energy (1240/λ). Electrons come out only if E > φ.",
    explain: `E = ${ds(dp(E, 2))} eV, enough for ${ok.map((m) => m.name).join(" and ")} but not the others.`,
  });
}

/** PHYS.15.5 — K_max against frequency graphs. */
export function photoGraphs(): Question {
  const kind = rand(0, 4);
  const slope = 0.414;
  if (kind === 0 || kind === 1) {
    const f0 = pick([5, 6, 8, 10]);
    const phi = slope * f0;
    const askF = kind === 0;
    return Q({
      key: `pg-${askF ? "f0" : "phi"}-${f0}`,
      prompt: askF ? "The graph shows K_max of photoelectrons against light frequency for a metal. What is its threshold frequency?" : "The graph shows K_max against frequency for a metal. The dashed line extends the data back. What is the work function?",
      visual: plot([0, 16], [-5, 4], "f (× 10¹⁴ Hz)", "K_max (eV)", {
        lines: [
          { from: [0, -phi], to: [f0, 0], dashed: true, colour: "grape" },
          { from: [f0, 0], to: [16, slope * (16 - f0)], colour: "berry" },
        ],
        points: [{ x: f0, y: 0 }, { x: 0, y: -phi, label: askF ? undefined : `−${nf(phi, 3)} eV` }],
      }),
      needsVisual: true,
      ...(askF ? txt(`${sci(f0 * 1e14, 2)} Hz`, [`${sci((f0 + 2) * 1e14, 2)} Hz`, `${sci((f0 - 2) * 1e14, 2)} Hz`, `${sci(phi * 1e14, 2)} Hz`]) : vals(phi, [slope, f0, phi / 2], "eV", 3)),
      hint: "K_max = hf − φ: the line crosses K = 0 at the threshold frequency f₀, and its extension meets the K axis at −φ.",
      explain: askF ? `The line reaches zero at f₀ = ${f0} × 10¹⁴ Hz; below that no electrons come out.` : `The intercept is −φ, so φ = ${nf(phi, 3)} eV (also h f₀ = 4.14 × 10⁻¹⁵ × ${f0} × 10¹⁴).`,
    });
  }
  if (kind === 2) {
    const [fa, fb] = some([4, 6, 8, 10], 2);
    const ask = pick(["larger", "smaller"] as const);
    const ans = (ask === "larger") === (fa > fb) ? "A" : "B";
    return Q({
      key: `pg-two-${fa}-${fb}-${ask}`,
      prompt: `K_max against frequency for metals A and B. Which has the ${ask} work function?`,
      visual: plot([0, 16], [0, 4], "f (× 10¹⁴ Hz)", "K_max (eV)", {
        curves: [
          { fn: (f) => (f >= fa ? slope * (f - fa) : NaN), label: "A", colour: "berry" },
          { fn: (f) => (f >= fb ? slope * (f - fb) : NaN), label: "B", colour: "wave" },
        ],
      }),
      needsVisual: true,
      ...txt(ans, [ans === "A" ? "B" : "A", "They're equal (the lines are parallel)"], 3),
      hint: "Both lines have slope h. The one that starts at a higher threshold frequency needs more energy per electron.",
      explain: `The lines are parallel (slope h for every metal). ${ans} starts at the ${ask === "larger" ? "higher" : "lower"} threshold, so it has the ${ask} work function.`,
    });
  }
  if (kind === 3) {
    const which = pick(["K_max", "stopping voltage"] as const);
    return Q({
      key: `pg-slope-${which}`,
      prompt: `What does the slope of a graph of ${which} against light frequency equal, for any metal?`,
      ...txt(which === "K_max" ? "Planck's constant, h" : "h/e", ["Planck's constant, h", "h/e", "The work function", "The threshold frequency", "e/h"].filter((x) => x !== (which === "K_max" ? "Planck's constant, h" : "h/e"))),
      hint: which === "K_max" ? "K_max = hf − φ is a straight line in f." : "eV_s = hf − φ, so V_s = (h/e)f − φ/e.",
      explain: which === "K_max" ? "K_max = hf − φ: slope h, the same for every metal. This is how Millikan measured h." : "V_s = (h/e)f − φ/e: slope h/e, the same for every metal.",
    });
  }
  return Q({
    key: `pg-intensity-${rand(0, 12)}`,
    prompt: "The experiment behind a K_max–frequency graph is repeated with twice the light intensity. How does the graph change?",
    ...txt("It doesn't change", ["It shifts up", "The slope doubles", "The threshold frequency halves"]),
    hint: "Intensity changes how many photons arrive, not how much energy each one has.",
    explain: "K_max depends only on hf − φ, so the graph is unchanged; only the number of electrons (the current) grows.",
  });
}

/** PHYS.15.5, PHYS.15.7 — Do it: straight-line graphs of photoelectric and decay data. */
export function modernDoIt(): Question {
  const kind = rand(0, 3);
  if (kind === 0 || kind === 1) {
    const phi = pick([1, 2, 3]);
    const xs = some([phi + 1, phi + 2, phi + 3, phi + 4].filter((x) => x <= 6), 3).sort((a, b) => a - b);
    const rows = xs.map((x) => [ds(dp(2.42 * x, 2)), x - phi]);
    if (kind === 0)
      return Q({
        key: `mdi-pe-plot-${phi}-${xs.join("")}`,
        prompt: "Plot K_max against frequency. Each square across is 2.42 × 10¹⁴ Hz (the frequency of a 1 eV photon); each square up is 1 eV.",
        speech: "Plot maximum kinetic energy against frequency. Each square across is 2.42 times 10 to the 14 hertz, the frequency of a 1 electron volt photon. Each square up is 1 electron volt.",
        visual: table(["f (× 10¹⁴ Hz)", "K_max (eV)"], rows),
        ...act({ kind: "plotPoints", points: xs.map((x, i) => ({ x, y: x - phi, label: "ABC"[i] })), size: 6, quadrants: 1 }, 3),
        hint: "Divide each frequency by 2.42 to get the squares across.",
        explain: `The points lie on a line of slope 1 eV per square (that's h) that meets K = 0 at ${phi} squares: φ = ${phi} eV.`,
      });
    return Q({
      key: `mdi-pe-line-${phi}-${xs.join("")}`,
      prompt: "Draw the line through these photoelectric data and extend it to the vertical axis. Across: 2.42 × 10¹⁴ Hz per square; up: 1 eV per square.",
      speech: "Draw the line through these photoelectric data and extend it to the vertical axis. Each square across is 2.42 times 10 to the 14 hertz; each square up is 1 electron volt.",
      visual: table(["f (× 10¹⁴ Hz)", "K_max (eV)"], rows),
      ...act({ kind: "drawLine", m: 1, b: -phi, size: 6, quadrants: 4 }, -phi),
      hint: "K_max = hf − φ. With these scales the slope is 1 square per square, and the line meets the vertical axis at −φ.",
      explain: `The line is K = f − ${phi} in squares: it crosses the vertical axis at −${phi} eV, so the work function is ${phi} eV.`,
    });
  }
  const T = pick([1, 2]);
  const b = pick([6, 7, 8]);
  const N0 = 2 ** b;
  const ts = [0, 2, 4, 6].filter((t) => b - t / T >= 0);
  const rows = ts.map((t) => [t, 2 ** (b - t / T)]);
  if (kind === 2)
    return Q({
      key: `mdi-decay-line-${T}-${b}`,
      prompt: `Draw the straight line of log₂ N against t (in hours) for this sample. Each square is 1 hour across and 1 unit of log₂ N up.`,
      speech: "Draw the straight line of log base 2 of N against time in hours for this sample. Each square is 1 hour across and 1 unit up.",
      visual: table(["t (h)", "N", "log₂ N"], rows.map(([t, n]) => [t, n, Math.log2(n)])),
      ...act({ kind: "drawLine", m: -1 / T, b, size: 8, quadrants: 1 }, -1 / T),
      hint: "Each half-life lowers log₂ N by exactly 1, so the graph is a straight line falling 1 unit per half-life.",
      explain: `log₂ N falls 1 every ${T} h: slope −1/${T}, starting at log₂ ${N0} = ${b}. The half-life is ${T} h.`,
    });
  return Q({
    key: `mdi-decay-plot-${T}-${b}`,
    prompt: "Linearize the decay data: plot log₂ N against t. Each square is 1 hour across and 1 unit of log₂ N up.",
    speech: "Linearize the decay data. Plot log base 2 of N against time. Each square is 1 hour across and 1 unit up.",
    visual: table(["t (h)", "N"], rows),
    ...act({ kind: "plotPoints", points: ts.slice(0, 4).map((t, i) => ({ x: t, y: b - t / T, label: "ABCD"[i] })), size: 8, quadrants: 1 }, Math.min(4, ts.length)),
    hint: `log₂ ${N0} = ${b}: count how many times you halve 1 to reach N (2⁸ = 256, 2⁷ = 128, 2⁶ = 64…).`,
    explain: `The points fall in a straight line, 1 unit every ${T} h, so the half-life is ${T} h.`,
  });
}

/** Particle in a box probability density for level n on 0 ≤ x ≤ 1. */
const box = (n: number) => (x: number) => (x < 0 || x > 1 ? 0 : 2 * Math.sin(n * Math.PI * x) ** 2);

/** PHYS.15.6 — wave functions and probability. */
export function waveFunctions(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const n = rand(1, 4);
    const ask = pick(["zeros", "peaks"] as const);
    return Q({
      key: `wf-count-${n}-${ask}`,
      prompt: ask === "zeros" ? "The graph shows |ψ|² for an electron in a box (walls at 0 and 1). At how many points inside the box is the electron never found?" : "The graph shows |ψ|² for an electron in a box. At how many places is it most likely to be found?",
      visual: plot([0, 1], [0, 2.2], "x (box width)", "|ψ|²", { curves: [{ fn: box(n), colour: "berry" }] }),
      needsVisual: true,
      ...kp(ask === "zeros" ? n - 1 : n),
      hint: "|ψ|² is the probability density. Where it's zero, the electron is never found; peaks are the most likely spots.",
      explain: `This is level n = ${n}: ${n} peak${n > 1 ? "s" : ""} and ${n - 1} zero${n - 1 === 1 ? "" : "s"} between the walls.`,
    });
  }
  if (kind === 1) {
    const [n, a, b, P] = pick([[1, 0, 0.5, 0.5], [2, 0, 0.25, 0.25], [2, 0, 0.5, 0.5], [3, 0, 1 / 3, 1 / 3], [4, 0, 0.25, 0.25], [2, 0.25, 0.75, 0.5], [1, 0.5, 1, 0.5]]);
    return Q({
      key: `wf-area-${n}-${a}-${b}`,
      prompt: `What is the probability of finding the electron in the shaded part of the box?`,
      visual: plot([0, 1], [0, 2.2], "x (box width)", "|ψ|²", { curves: [{ fn: box(n), colour: "berry" }], shade: { fn: box(n), from: a, to: b } }),
      needsVisual: true,
      ...txt(P === 1 / 3 ? "1/3" : String(P), ["1/3", "0.5", "0.25", "0.75", "1"].filter((x) => x !== (P === 1 / 3 ? "1/3" : String(P)))),
      hint: "Probability is the area under |ψ|², and the total area is 1. Use the symmetry of the humps.",
      explain: `The shaded part holds ${P === 1 / 3 ? "one of three equal humps" : P === 0.25 ? "a quarter of the total area" : "exactly half the total area"}, so P = ${P === 1 / 3 ? "1/3" : P}.`,
    });
  }
  if (kind === 2) {
    const s = pick([
      { q: "What does |ψ|² tell you about a particle?", a: "The probability per unit length of finding it at each place" },
      { q: "What must the total area under |ψ|² equal?", a: "1: the particle is certainly somewhere" },
      { q: "Before you measure it, where is an electron described by a spread-out ψ?", a: "Not at a definite place: only probabilities are defined" },
    ]);
    return Q({
      key: `wf-fact-${s.q.slice(0, 14)}`,
      prompt: s.q,
      ...txt(s.a, ["The probability per unit length of finding it at each place", "1: the particle is certainly somewhere", "Not at a definite place: only probabilities are defined", "Its exact position", "0", "Always at the peak of ψ"].filter((x) => x !== s.a)),
      hint: "ψ itself isn't measured; its square gives probabilities (Born's rule).",
      explain: `${s.a}.`,
    });
  }
  if (kind === 3) {
    return Q({
      key: `wf-slits-${rand(0, 12)}`,
      prompt: "Electrons are fired one at a time at two slits. What appears on the screen?",
      ...txt("Single dots that slowly build up an interference pattern", ["Two bright bands behind the slits only", "A smooth glow from the start", "Nothing, since one electron can't interfere"]),
      hint: "Each electron is detected at one spot, but where it lands follows |ψ|².",
      explain: "Each electron lands at one point (particle), but the probability of where follows |ψ|², which shows interference (wave). Many dots reveal the fringes.",
    });
  }
  const n = rand(1, 3);
  return Q({
    key: `wf-center-${n}`,
    prompt: `For the n = ${n} state of an electron in a box, what is the probability density at the center of the box?`,
    visual: plot([0, 1], [0, 2.2], "x (box width)", "|ψ|²", { curves: [{ fn: box(n), colour: "berry" }], points: [{ x: 0.5, y: box(n)(0.5), label: "center" }] }),
    ...txt(n === 2 ? "Zero: it's never found exactly there" : "A maximum: it's most likely there", ["Zero: it's never found exactly there", "A maximum: it's most likely there", "Half the maximum"].filter((x) => x !== (n === 2 ? "Zero: it's never found exactly there" : "A maximum: it's most likely there")), 3),
    hint: "Odd n puts a peak in the middle; even n puts a node there.",
    explain: n === 2 ? "n = 2 has a node at the center: |ψ|² = 0." : `n = ${n} has a peak at the center.`,
  });
}

const DECAYS = [
  { A: 238, Z: 92, s: "U", t: "alpha", dA: 234, dZ: 90, ds: "Th" },
  { A: 226, Z: 88, s: "Ra", t: "alpha", dA: 222, dZ: 86, ds: "Rn" },
  { A: 210, Z: 84, s: "Po", t: "alpha", dA: 206, dZ: 82, ds: "Pb" },
  { A: 241, Z: 95, s: "Am", t: "alpha", dA: 237, dZ: 93, ds: "Np" },
  { A: 14, Z: 6, s: "C", t: "beta-minus", dA: 14, dZ: 7, ds: "N" },
  { A: 90, Z: 38, s: "Sr", t: "beta-minus", dA: 90, dZ: 39, ds: "Y" },
  { A: 60, Z: 27, s: "Co", t: "beta-minus", dA: 60, dZ: 28, ds: "Ni" },
  { A: 131, Z: 53, s: "I", t: "beta-minus", dA: 131, dZ: 54, ds: "Xe" },
  { A: 18, Z: 9, s: "F", t: "beta-plus", dA: 18, dZ: 8, ds: "O" },
  { A: 22, Z: 11, s: "Na", t: "beta-plus", dA: 22, dZ: 10, ds: "Ne" },
];
const PARTICLE: Record<string, string> = { alpha: "an alpha particle (⁴₂He)", "beta-minus": "a beta-minus particle (an electron)", "beta-plus": "a positron (beta-plus)" };
const RADIATION = [
  { t: "Stopped by a sheet of paper", b: 0 },
  { t: "A helium-4 nucleus", b: 0 },
  { t: "Charge +2e", b: 0 },
  { t: "Lowers Z by 2 and A by 4", b: 0 },
  { t: "A fast electron from the nucleus", b: 1 },
  { t: "Stopped by a few mm of aluminum", b: 1 },
  { t: "Raises Z by 1, A unchanged", b: 1 },
  { t: "Charge −e", b: 1 },
  { t: "A high-energy photon", b: 2 },
  { t: "Needs thick lead or concrete to stop", b: 2 },
  { t: "No charge and no mass", b: 2 },
  { t: "Leaves Z and A unchanged", b: 2 },
];

/** PHYS.15.7 — radioactive decay: types, nuclear equations and conservation laws. */
export function decayTypes(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const d = pick(DECAYS);
    const ask = pick(["A", "Z"] as const);
    return Q({
      key: `dt-daughter-${d.s}-${ask}`,
      prompt: `${nuc(d.A, d.Z, d.s)} decays by emitting ${PARTICLE[d.t]}. What is the ${ask === "A" ? "mass number A" : "atomic number Z"} of the new nucleus?`,
      speech: `${d.s}-${d.A}, with atomic number ${d.Z}, decays by emitting ${PARTICLE[d.t].replace(/\(.*\)/, "")}. What is the ${ask === "A" ? "mass number" : "atomic number"} of the new nucleus?`,
      ...kp(ask === "A" ? d.dA : d.dZ),
      hint: "Nucleon number (A) and charge (Z) are both conserved. α carries A = 4, Z = 2; β⁻ carries Z = −1; β⁺ carries Z = +1.",
      explain: `${nuc(d.A, d.Z, d.s)} → ${nuc(d.dA, d.dZ, d.ds)} + ${d.t === "alpha" ? "⁴₂He" : d.t === "beta-minus" ? "e⁻ + antineutrino" : "e⁺ + neutrino"}. The daughter is ${d.ds}-${d.dA}.`,
    });
  }
  if (kind === 1) {
    const d = pick(DECAYS);
    const ans = { alpha: "alpha (⁴₂He)", "beta-minus": "beta-minus (electron)", "beta-plus": "beta-plus (positron)" }[d.t]!;
    return Q({
      key: `dt-which-${d.s}`,
      prompt: `${nuc(d.A, d.Z, d.s)} → ${nuc(d.dA, d.dZ, d.ds)} + ?  What is emitted?`,
      speech: `${d.s}-${d.A}, atomic number ${d.Z}, turns into ${d.ds}-${d.dA}, atomic number ${d.dZ}, plus what?`,
      ...txt(ans, ["alpha (⁴₂He)", "beta-minus (electron)", "beta-plus (positron)", "gamma ray", "neutron"].filter((x) => x !== ans)),
      hint: "Compare A and Z on both sides. ΔA = −4, ΔZ = −2: alpha. ΔA = 0, ΔZ = +1: β⁻. ΔA = 0, ΔZ = −1: β⁺.",
      explain: `A changes by ${d.dA - d.A} and Z by ${d.dZ - d.Z > 0 ? "+" : ""}${d.dZ - d.Z}: ${ans}.`,
    });
  }
  if (kind === 2) {
    let items = some(RADIATION, 6);
    while (new Set(items.map((i) => i.b)).size < 3) items = some(RADIATION, 6);
    return Q({
      key: `dt-sort-${items.map((i) => RADIATION.indexOf(i)).sort((a, b) => a - b).join("-")}`,
      prompt: "Sort each property into the radiation it describes.",
      ...act({ kind: "sort", bins: ["alpha", "beta", "gamma"], items: items.map((i) => ({ label: i.t, bin: i.b })) }, items.filter((i) => i.b === 0).length),
      hint: "Alpha: heavy, +2e, barely penetrates. Beta: an electron, −e, medium. Gamma: a photon, no charge, very penetrating.",
      explain: ["alpha", "beta", "gamma"].map((n, k) => `${n}: ${items.filter((i) => i.b === k).map((i) => i.t.toLowerCase()).join("; ") || "none here"}`).join(". ") + ".",
    });
  }
  if (kind === 3) {
    const c = pick([
      { from: "²³⁸₉₂U", to: "²⁰⁶₈₂Pb", say: "uranium-238 to lead-206", a: 8, b: 6 },
      { from: "²³⁵₉₂U", to: "²⁰⁷₈₂Pb", say: "uranium-235 to lead-207", a: 7, b: 4 },
      { from: "²³²₉₀Th", to: "²⁰⁸₈₂Pb", say: "thorium-232 to lead-208", a: 6, b: 4 },
      { from: "²²⁶₈₈Ra", to: "²⁰⁶₈₂Pb", say: "radium-226 to lead-206", a: 5, b: 4 },
    ]);
    const ask = pick(["alpha", "beta"] as const);
    return Q({
      key: `dt-chain-${c.from}-${ask}`,
      prompt: `A decay chain runs from ${c.from} to ${c.to} by alpha and beta-minus decays. How many ${ask} decays are there?`,
      speech: `A decay chain runs from ${c.say} by alpha and beta minus decays. How many ${ask} decays are there?`,
      ...kp(ask === "alpha" ? c.a : c.b),
      hint: "Only alphas change A (by 4 each): that gives the number of alphas. Then betas fix up Z (each raises it by 1).",
      explain: `ΔA = ${c.a * 4}, so ${c.a} alphas, which lower Z by ${2 * c.a}. Z only falls by ${2 * c.a - c.b} overall, so ${c.b} beta-minus decays raise it back.`,
    });
  }
  return Q({
    key: `dt-cons-${rand(0, 12)}`,
    prompt: "Which quantities must be the same on both sides of every nuclear decay equation?",
    ...txt("Nucleon number (A) and charge (Z)", ["Only the mass in kg", "The number of neutrons", "The element"]),
    hint: "Check any balanced equation: the top numbers add up, and so do the bottom numbers.",
    explain: "Nucleon number and electric charge are conserved, so the A's and the Z's balance. (Mass is not exactly conserved: a little becomes energy.)",
  });
}

/** PHYS.15.7 — half-life and decay curves. */
export function halfLife(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const n = rand(1, 4);
    const N0 = pick([800, 1600, 3200, 4000, 6400]);
    const T = pick([2, 5, 8, 12]);
    return Q({
      key: `hl-n-${n}-${N0}-${T}`,
      prompt: `A sample has ${N0} radioactive nuclei with a half-life of ${T} days. How many are left after ${n * T} days?`,
      ...kp(N0 / 2 ** n),
      hint: "Count half-lives: t ÷ T½. Halve that many times.",
      explain: `${n * T} ÷ ${T} = ${n} half-lives: ${N0} ÷ 2${n > 1 ? `^${n}` : ""} = ${N0 / 2 ** n}.`,
    });
  }
  if (kind === 1) {
    const n = rand(2, 6);
    return Q({
      key: `hl-frac-${n}`,
      prompt: `What fraction of a radioactive sample is left after ${n} half-lives?`,
      ...txt(`1/${2 ** n}`, [`1/${2 * n}`, `1/${n}`, `1/${2 ** (n - 1)}`, `1/${2 ** (n + 1)}`]),
      hint: "Each half-life halves what's left: (½)ⁿ.",
      explain: `(½)^${n} = 1/${2 ** n}.`,
    });
  }
  if (kind === 2) {
    const T = pick([2, 3, 4, 5, 8]);
    const N0 = pick([400, 800, 1000]);
    return Q({
      key: `hl-graph-${T}-${N0}`,
      prompt: "The graph shows the number of undecayed nuclei against time (hours). What is the half-life?",
      visual: plot([0, 4 * T], [0, N0 * 1.1], "t (h)", "N", {
        curves: [{ fn: (t) => N0 * 2 ** (-t / T), colour: "berry" }],
        lines: [{ from: [0, N0 / 2], to: [T, N0 / 2], dashed: true, colour: "grape" }, { from: [T, 0], to: [T, N0 / 2], dashed: true, colour: "grape" }],
        points: [{ x: 0, y: N0, label: `${N0}` }, { x: T, y: N0 / 2, label: `${N0 / 2}` }],
      }),
      needsVisual: true,
      ...kp(T),
      unit: "h",
      hint: "Find where N has dropped to half its starting value and read the time.",
      explain: `N falls from ${N0} to ${N0 / 2} at t = ${T} h, so T½ = ${T} h. (It reaches ${N0 / 4} at ${2 * T} h.)`,
    });
  }
  if (kind === 3) {
    const T = pick([3, 6, 8, 12, 5730]);
    const n = rand(2, 5);
    const unit = T === 5730 ? "years" : "days";
    return Q({
      key: `hl-time-${T}-${n}`,
      prompt: T === 5730 ? `A bone has 1/${2 ** n} of the carbon-14 of living tissue (T½ = 5730 years). How old is it, in years?` : `How long until a sample with T½ = ${T} days decays to 1/${2 ** n} of its start, in days?`,
      ...kp(n * T),
      unit: unit === "years" ? "years" : "days",
      hint: `1/${2 ** n} = (½)^${n}, so ${n} half-lives have passed.`,
      explain: `${n} × ${T} = ${n * T} ${unit}.`,
    });
  }
  if (kind === 4) {
    const T = pick([8, 30, 140]);
    const N = pick([1, 2, 5]) * 1e15;
    const lam = Math.LN2 / (T * 86400);
    const A = lam * N;
    return Q({
      key: `hl-activity-${T}-${N}`,
      prompt: `A sample holds ${sci(N, 1)} nuclei with a half-life of ${T} days. What is its activity (decays per second)?`,
      ...vals(A, [N / (T * 86400), lam * N * 86400, (N * T) / Math.LN2], "Bq", 2, sci),
      hint: "Activity A = λN with decay constant λ = ln 2 / T½ (T½ in seconds).",
      explain: `λ = 0.693 ÷ (${T} × 86 400 s) ≈ ${sci(lam, 2)} s⁻¹, so A ≈ ${sci(A, 2)} Bq.`,
    });
  }
  return Q({
    key: `hl-random-${rand(0, 12)}`,
    prompt: "A sample of 1000 nuclei has a half-life of 1 hour. What can you say about one particular nucleus?",
    ...txt("It has a 50% chance of decaying in the next hour; you can't predict when", ["It will decay in exactly 1 hour", "It decays after 500 others have", "It will decay within 2 hours for sure"]),
    hint: "Half-life is a statistical statement about large numbers of nuclei.",
    explain: "Decay is random: each nucleus has the same chance per unit time, so half-life predicts the group, not any single nucleus.",
  });
}

/** Rough binding energy per nucleon (MeV) from the semi-empirical mass formula. */
const bePerA = (A: number) => {
  if (A < 2) return 0;
  const Z = A / (2 + 0.0155 * A ** (2 / 3));
  const B = 15.8 * A - 18.3 * A ** (2 / 3) - (0.714 * Z * (Z - 1)) / A ** (1 / 3) - (23.2 * (A - 2 * Z) ** 2) / A;
  return Math.max(0, B / A);
};

/** PHYS.15.7 — mass–energy, binding energy, fission and fusion. */
export function nuclearEnergy(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const dm = pick([0.001, 0.0025, 0.0055, 0.01, 0.0189, 0.0304, 0.2]);
    return Q({
      key: `ne-u-${dm}`,
      prompt: `A nuclear reaction converts ${dm} u of mass into energy. How much energy is released? (1 u = 931.5 MeV/c²)`,
      ...vals(dm * 931.5, [dm * 931.5 * 1000, dm * 9e16, dm / 931.5], "MeV", 3),
      hint: "E = Δm c². In nuclear units each u of mass is 931.5 MeV.",
      explain: `E = ${dm} × 931.5 ≈ ${nf(dm * 931.5, 3)} MeV.`,
    });
  }
  if (kind === 1) {
    const m = pick([{ t: "1 g", kg: 1e-3 }, { t: "1 mg", kg: 1e-6 }, { t: "1 kg", kg: 1 }, { t: "0.5 g", kg: 5e-4 }]);
    const E = m.kg * C * C;
    return Q({
      key: `ne-j-${m.t}`,
      prompt: `How much energy is equivalent to ${m.t} of mass?`,
      ...vals(E, [m.kg * C, E / 1000, E * 1000], "J", 2, sci),
      hint: "E = mc² with m in kg and c = 3.0 × 10⁸ m/s.",
      explain: `E = ${sci(m.kg, 1)} × (3.0 × 10⁸)² = ${sci(E, 2)} J.`,
    });
  }
  if (kind === 2) {
    const ask = pick(["defect", "BE"] as const);
    const dm = 2 * 1.007276 + 2 * 1.008665 - 4.001506;
    return Q({
      key: `ne-he-${ask}-${rand(0, 3)}`,
      prompt: ask === "defect" ? "A helium-4 nucleus (4.001506 u) is made of 2 protons (1.007276 u each) and 2 neutrons (1.008665 u each). What is its mass defect?" : "Helium-4's mass defect is 0.0304 u. What is its total binding energy? (1 u = 931.5 MeV/c²)",
      ...(ask === "defect" ? vals(dm, [4.001506 - 2 * 1.007276, 2 * 1.007276 + 2 * 1.008665, dm * 2], "u", 3) : vals(0.0304 * 931.5, [(0.0304 * 931.5) / 4, 0.0304 * 9e16, 931.5 / 4], "MeV", 3)),
      hint: ask === "defect" ? "Mass defect = (mass of the separate nucleons) − (mass of the nucleus)." : "Binding energy = Δm × 931.5 MeV/u.",
      explain: ask === "defect" ? `2(1.007276) + 2(1.008665) = 4.031882 u; minus 4.001506 u gives ${nf(dm, 3)} u.` : `0.0304 × 931.5 ≈ ${nf(0.0304 * 931.5, 3)} MeV, about 7.1 MeV per nucleon.`,
    });
  }
  if (kind === 3) {
    const ask = pick(["uranium", "hydrogen", "iron"] as const);
    const ans = { uranium: "Fission: splitting it into middle-sized nuclei", hydrogen: "Fusion: joining nuclei into heavier ones", iron: "Neither: it is near the peak, the most tightly bound" }[ask];
    return Q({
      key: `ne-curve-${ask}`,
      prompt: ask === "iron" ? "The graph shows binding energy per nucleon against mass number. Which process releases energy from iron-56?" : `The graph shows binding energy per nucleon against mass number. How can energy be released from ${ask === "uranium" ? "uranium-235" : "hydrogen"}?`,
      visual: plot([0, 250], [0, 10], "mass number A", "BE per nucleon (MeV)", { curves: [{ fn: bePerA, colour: "berry" }], points: [{ x: 56, y: bePerA(56), label: "Fe-56" }, { x: 235, y: bePerA(235), label: "U-235" }] }),
      needsVisual: true,
      ...txt(ans, ["Fission: splitting it into middle-sized nuclei", "Fusion: joining nuclei into heavier ones", "Neither: it is near the peak, the most tightly bound"].filter((x) => x !== ans), 3),
      hint: "Energy is released when the products are more tightly bound: higher on this curve.",
      explain: ask === "uranium" ? "Splitting U-235 makes middle-sized nuclei that sit higher on the curve, releasing about 200 MeV." : ask === "hydrogen" ? "Light nuclei climb the steep left side of the curve when they fuse, releasing energy (as in the Sun)." : "Iron is at the top: both fusion and fission of iron would need energy, not release it.",
    });
  }
  if (kind === 4) {
    const r = pick([
      { eq: "²₁H + ³₁H → ⁴₂He + ¹₀n", say: "deuterium plus tritium makes helium-4 plus a neutron", before: 2.014102 + 3.016049, after: 4.002603 + 1.008665 },
      { eq: "²₁H + ²₁H → ³₂He + ¹₀n", say: "deuterium plus deuterium makes helium-3 plus a neutron", before: 2 * 2.014102, after: 3.016029 + 1.008665 },
    ]);
    const dm = r.before - r.after;
    return Q({
      key: `ne-q-${r.say.slice(0, 20)}`,
      prompt: `For ${r.eq}, the masses add to ${nf(r.before, 7)} u before and ${nf(r.after, 7)} u after. How much energy is released?`,
      speech: `For the reaction ${r.say}, the masses add to ${nf(r.before, 7)} atomic mass units before and ${nf(r.after, 7)} after. How much energy is released?`,
      ...vals(dm * 931.5, [dm, r.after * 931.5 / 100, dm * 931.5 / 2], "MeV", 3),
      hint: "Energy released = (mass before − mass after) × 931.5 MeV/u.",
      explain: `Δm = ${nf(dm, 4)} u, so E ≈ ${nf(dm * 931.5, 3)} MeV, carried off as kinetic energy of the products.`,
    });
  }
  const s = pick([
    { q: "In a nuclear reactor, what happens to U-235?", a: "A neutron splits it into two smaller nuclei and more neutrons" },
    { q: "What powers the Sun?", a: "Fusion of hydrogen nuclei into helium" },
    { q: "Where does the energy released in fission or fusion come from?", a: "A small loss of mass: the products are more tightly bound" },
  ]);
  return Q({
    key: `ne-fact-${s.q.slice(0, 14)}`,
    prompt: s.q,
    ...txt(s.a, ["A neutron splits it into two smaller nuclei and more neutrons", "Fusion of hydrogen nuclei into helium", "A small loss of mass: the products are more tightly bound", "Burning uranium in oxygen", "Chemical reactions of hydrogen gas", "Electrons dropping between energy levels"].filter((x) => x !== s.a)),
    hint: "E = mc²: nuclear energy comes from changes in binding.",
    explain: `${s.a}.`,
  });
}
