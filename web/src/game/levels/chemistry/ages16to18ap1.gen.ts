/**
 * Question generators for AP Chemistry units 1–5 (ages 16–18): atoms and moles, bonding, properties of
 * substances and mixtures, reactions, and kinetics. Worlds and levels are assembled in ./ages16to18ap1.ts.
 *
 * Conventions
 * - Keypad answers are rounded to the significant figures the prompt asks for. Numbers are chosen so the exact
 *   answer is not near a rounding boundary (`safe`), so rounding the given data differently can't flip the digit.
 * - Molar masses are printed in the prompt (2 decimal places) and the answer is worked from the printed value.
 * - Very large and very small numbers are asked in "× 10ⁿ" units so they can be typed.
 */
import { labelChoices, pick, rand, shuffle } from "../../questions";
import type { ChemistryVisual, GlassPanel, ReactionTerm, StateSymbol } from "../../science/chemistryTypes";
import { balance } from "../../science/chemistryValidate";
import { electronConfig, element, molarMass, parseFormula, valenceElectrons } from "../../science/elements";
import { MOLECULES, normFormula } from "../../../components/science/chemistry/molecules";
import type { Activity, Question, Visual } from "../../types";

/* =================================================================== helpers */

const NONE: Visual = { kind: "none" };

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra">;

/** Remove floating-point noise. */
export const clean = (x: number) => Math.round(x * 1e9) / 1e9;

/** Round to n significant figures. */
export const sf = (x: number, n = 3) => (x === 0 ? 0 : clean(Number(x.toPrecision(n))));

/** Round to d decimal places. */
export const dp = (x: number, d = 2) => clean(Math.round(x * 10 ** d) / 10 ** d);

/** Is x comfortably away from a rounding boundary at n significant figures? */
export function safe(x: number, n = 3, margin = 0.12): boolean {
  if (x === 0 || !Number.isFinite(x)) return x === 0;
  const e = Math.floor(Math.log10(Math.abs(x))) - n + 1;
  const scaled = Math.abs(x) / 10 ** e;
  const f = scaled - Math.floor(scaled);
  return Math.abs(f - 0.5) > margin;
}

/** Is x comfortably away from a rounding boundary at d decimal places? */
export function safeDp(x: number, d = 2, margin = 0.12): boolean {
  const scaled = Math.abs(x) * 10 ** d;
  const f = scaled - Math.floor(scaled);
  return Math.abs(f - 0.5) > margin;
}

/** Text with n significant figures and no exponent: 0.0450, 12.0, 340. */
export function sig(x: number, n = 3): string {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(Number(x.toPrecision(n)))));
  const d = Math.max(0, n - 1 - e);
  const s = Number(x.toPrecision(n)).toFixed(d);
  return s.replace("-", "−");
}

/** Fixed decimals with a real minus sign. */
export const fix = (x: number, d: number) => x.toFixed(d).replace("-", "−");

/** A signed whole number as text: +2, −1, 0. */
export const signText = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

/** Keep trying `make` until it returns a question (or value). */
export function again<T>(make: () => T | null | undefined, tries = 400): T {
  for (let i = 0; i < tries; i++) {
    const v = make();
    if (v !== null && v !== undefined) return v;
  }
  throw new Error("no valid question found");
}

/** Pick one of several question makers. */
export const mix = (...makers: (() => Question)[]) => () => pick(makers)();

/** Number choices: the answer, likely mistakes, then neighbours `step` apart. */
export function numChoices(answer: number, wrong: number[], step = 1, n = 4, min = -Infinity): number[] {
  const out: number[] = [clean(answer)];
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

/** Type the answer: decimals get ".", negatives get "−". */
export function keypad(answer: number): Answer {
  const a = clean(answer);
  if (a < 0 && !Number.isInteger(a)) return choose(a, [-a, a * 2, a / 2], Math.abs(a) / 4);
  if (a < 0) return { answer: a, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(a)) return { answer: a, input: "keypad", keypadExtra: "." };
  return { answer: a, input: "keypad" };
}

/** A whole number whose sign matters (ΔH, formal charge, oxidation number): the keypad always has "−". */
export const signed = (answer: number): Answer => ({ answer: clean(answer), input: "keypad", keypadExtra: "−" });

/** Text choices. Wrong ones are shuffled, then the first 3 used. */
export function label(correct: string, wrong: string[], keepOrder = false, n = 4): Answer {
  const { choices, labels, answer } = labelChoices(correct, keepOrder ? wrong : shuffle(wrong), n);
  return { answer, input: "choices", choices, labels };
}

/** Text choices that keep a fixed display order (e.g. A, B, C or a scale). */
export function fixedLabels(options: string[], correct: string): Answer {
  return { answer: options.indexOf(correct), input: "choices", choices: options.map((_, i) => i), labels: options };
}

/** A hands-on activity; `answer` is its key number. */
export const act = (activity: Activity, answer: number): Answer & { activity: Activity } => ({ input: "activity", activity, answer });

const SUP_WORD: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

/** Turn on-screen chemistry text into words for the voice (formulas and charges are read by the speech helper). */
export function talk(s: string): string {
  return s
    .replace(/×\s?10(⁻?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, m: string, d: string) => ` times 10 to the ${m ? "minus " : ""}${[...d].map((c) => SUP_WORD[c]).join("")}`)
    .replace(/(^|[\s(])10(⁻?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, pre: string, m: string, d: string) => `${pre}10 to the ${m ? "minus " : ""}${[...d].map((c) => SUP_WORD[c]).join("")}`)
    .replace(/\[([^\]]+)\]₀/g, " the initial concentration of $1 ")
    .replace(/1\/\[([^\]]+)\]/g, " 1 over the concentration of $1 ")
    .replace(/ln\[([^\]]+)\]/g, " the natural log of the concentration of $1 ")
    .replace(/M⁻¹\s?s⁻¹/g, "per molar per second")
    .replace(/M⁻²\s?s⁻¹/g, "per molar squared per second")
    .replace(/M⁻¹\s?min⁻¹/g, "per molar per minute")
    .replace(/s⁻¹/g, "per second")
    .replace(/min⁻¹/g, "per minute")
    .replace(/M⁻¹/g, "per molar")
    .replace(/L·atm\/\(mol·K\)/g, "liter atmospheres per mole kelvin")
    .replace(/J\/\(mol·K\)/g, "joules per mole kelvin")
    .replace(/L\/\(mol·cm\)/g, "liters per mole centimeter")
    .replace(/kJ\/mol/g, "kilojoules per mole")
    .replace(/MJ\/mol/g, "megajoules per mole")
    .replace(/kg\/mol/g, "kilograms per mole")
    .replace(/g\/mol/g, "grams per mole")
    .replace(/g\/L/g, "grams per liter")
    .replace(/M\/s/g, "molar per second")
    .replace(/M\/min/g, "molar per minute")
    .replace(/\bm\/z\b/g, "m over z")
    .replace(/(\d)\s?pm\b/g, "$1 picometers")
    .replace(/(\d)\s?nm\b/g, "$1 nanometers")
    .replace(/(\d)\s?μm\b/g, "$1 micrometers")
    .replace(/(\d)\s?cm\b/g, "$1 centimeters")
    .replace(/(\d)\s?atm\b/g, "$1 atmospheres")
    .replace(/(\d)\s?mmHg\b/g, "$1 millimeters of mercury")
    .replace(/(\d)\s?Hz\b/g, "$1 hertz")
    .replace(/(\d)\s?s\b/g, "$1 seconds")
    .replace(/(\d)\s?min\b/g, "$1 minutes")
    .replace(/\[([^\]]+)\]/g, " the concentration of $1 ")
    .replace(/t½/g, "half-life")
    .replace(/½/g, " half")
    .replace(/ε/g, "epsilon")
    .replace(/ν/g, "frequency")
    .replace(/δ/g, "partial ")
    .replace(/σ/g, "sigma")
    .replace(/π/g, "pi")
    .replace(/(\d)\s?–\s?(\d)/g, "$1 to $2")
    .replace(/–/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a question; speech defaults to the prompt read aloud. */
export function q(o: Omit<Question, "speech" | "visual"> & { speech?: string; visual?: Visual }): Question {
  return { ...o, visual: o.visual ?? NONE, speech: o.speech ?? talk(o.prompt) };
}

/** Molar mass to 2 decimal places, as printed in prompts. */
export const mm = (f: string) => dp(molarMass(f), 2);
export const mmText = (f: string) => mm(f).toFixed(2);

/** Element name for speech and prompts. */
export const nameOf = (sym: string) => element(sym)?.name ?? sym;

/** Atoms of each element in a formula. */
export const atomsOf = (f: string) => parseFormula(f).atoms;

/** Total valence electrons in a molecule or ion (main-group elements). */
export function valenceTotal(f: string): number {
  const p = parseFormula(f);
  return Object.entries(p.atoms).reduce((t, [el, n]) => t + (valenceElectrons(el) ?? 0) * n, 0) - p.charge;
}

/** Equation text from formulas and coefficients: "2H₂ + O₂ → 2H₂O". */
export function eqText(reactants: string[], products: string[], coefs: number[], arrow = "→", states?: (StateSymbol | null)[]): string {
  const term = (f: string, i: number) => `${coefs[i] === 1 ? "" : coefs[i]}${f}${states?.[i] ? `(${states[i]})` : ""}`;
  return `${reactants.map(term).join(" + ")} ${arrow} ${products.map((f, i) => term(f, i + reactants.length)).join(" + ")}`;
}

/** Smallest whole-number coefficients (throws if the equation can't be balanced). */
export function coefsOf(reactants: string[], products: string[]): number[] {
  const r = balance(reactants, products);
  if (!r.coefficients) throw new Error(`can't balance ${reactants.join(" + ")} → ${products.join(" + ")}`);
  return r.coefficients;
}

/** A balanced chem-reaction picture. */
export function reaction(reactants: string[], products: string[], opts: { states?: (StateSymbol | null)[]; arrow?: "→" | "⇌"; above?: string; dH?: number | string; blank?: number } = {}): Visual {
  const c = coefsOf(reactants, products);
  const term = (f: string, i: number): ReactionTerm => ({
    formula: f,
    coef: opts.blank === i ? "?" : c[i],
    ...(opts.states?.[i] ? { state: opts.states[i]! } : {}),
  });
  const v: ChemistryVisual = {
    kind: "chem-reaction",
    reactants: reactants.map(term),
    products: products.map((f, i) => term(f, i + reactants.length)),
    ...(opts.arrow ? { arrow: opts.arrow } : {}),
    ...(opts.above ? { above: opts.above } : {}),
    ...(opts.dH !== undefined ? { dH: opts.dH } : {}),
  };
  return v;
}

/** A table picture. */
export const table = (header: string[], rows: (number | string)[][]): Visual => ({ kind: "table", header, rows });

/** "× 10ⁿ" text for an exponent. */
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const pow10 = (e: number) => `× 10${e < 0 ? "⁻" : ""}${[...String(Math.abs(e))].map((d) => SUPS[+d]).join("")}`;

/** Scientific notation text with n significant figures: "1.20 × 10⁻³". */
export function sci(x: number, n = 3): string {
  const e = Math.floor(Math.log10(Math.abs(Number(x.toPrecision(n)))));
  const m = x / 10 ** e;
  if (e === 0) return sig(x, n);
  return `${m.toFixed(n - 1)} ${pow10(e)}`;
}

/** Spoken scientific notation: "1.20 times 10 to the minus 3". */
export const sayNum = (s: string) => talk(s);

/* ====================================================== Unit 1: atoms and moles */

/** Substances for mole problems; `ionic` ones are counted in formula units. */
const MOLE_STUFF: { f: string; name: string; ionic?: boolean }[] = [
  { f: "H₂O", name: "water" },
  { f: "CO₂", name: "carbon dioxide" },
  { f: "NaCl", name: "sodium chloride", ionic: true },
  { f: "CaCO₃", name: "calcium carbonate", ionic: true },
  { f: "C₆H₁₂O₆", name: "glucose" },
  { f: "NH₃", name: "ammonia" },
  { f: "CH₄", name: "methane" },
  { f: "O₂", name: "oxygen" },
  { f: "Fe₂O₃", name: "iron(III) oxide", ionic: true },
  { f: "KMnO₄", name: "potassium permanganate", ionic: true },
  { f: "MgCl₂", name: "magnesium chloride", ionic: true },
  { f: "C₂H₅OH", name: "ethanol" },
  { f: "Al₂(SO₄)₃", name: "aluminum sulfate", ionic: true },
  { f: "NaHCO₃", name: "sodium bicarbonate", ionic: true },
  { f: "H₂SO₄", name: "sulfuric acid" },
  { f: "Ca(NO₃)₂", name: "calcium nitrate", ionic: true },
  { f: "C₁₂H₂₂O₁₁", name: "sucrose" },
  { f: "(NH₄)₂SO₄", name: "ammonium sulfate", ionic: true },
];

const SF3 = "Give 3 significant figures.";

/** 1.1: grams ↔ moles ↔ particles. */
export const moles = mix(
  () =>
    again(() => {
      const s = pick(MOLE_STUFF);
      const M = mm(s.f);
      const m = rand(100, 999) / 10;
      const n = m / M;
      if (!safe(n)) return null;
      return q({
        key: `mol-gn-${s.f}-${m}`,
        prompt: `How many moles are in ${m.toFixed(1)} g of ${s.f}? (M = ${M.toFixed(2)} g/mol) ${SF3}`,
        speech: `How many moles are in ${m.toFixed(1)} grams of ${s.name}? The molar mass is ${M.toFixed(2)} grams per mole.`,
        ...keypad(sf(n)),
        unit: "mol",
        hint: "Moles = mass ÷ molar mass.",
        explain: `n = ${m.toFixed(1)} g ÷ ${M.toFixed(2)} g/mol = ${sig(n)} mol.`,
      });
    }),
  () =>
    again(() => {
      const s = pick(MOLE_STUFF);
      const M = mm(s.f);
      const n = rand(105, 995) / 1000;
      const m = n * M;
      if (!safe(m) || m >= 999.5) return null;
      return q({
        key: `mol-ng-${s.f}-${n}`,
        prompt: `What is the mass of ${n.toFixed(3)} mol of ${s.f}? (M = ${M.toFixed(2)} g/mol) ${SF3}`,
        speech: `What is the mass of ${n.toFixed(3)} moles of ${s.name}? The molar mass is ${M.toFixed(2)} grams per mole.`,
        ...keypad(sf(m)),
        unit: "g",
        hint: "Mass = moles × molar mass.",
        explain: `m = ${n.toFixed(3)} mol × ${M.toFixed(2)} g/mol = ${sig(m)} g.`,
      });
    }),
  () =>
    again(() => {
      const s = pick(MOLE_STUFF);
      const M = mm(s.f);
      const m = sf(rand(Math.ceil(M * 0.18), Math.floor(M * 1.6)), 3);
      const N = (m / M) * 6.022;
      if (N < 1 || N >= 9.95 || !safe(N)) return null;
      const what = s.ionic ? "formula units" : "molecules";
      return q({
        key: `mol-gN-${s.f}-${m}`,
        prompt: `How many ${what} are in ${sig(m)} g of ${s.f}? (M = ${M.toFixed(2)} g/mol) Answer in units of 10²³, to 3 significant figures.`,
        speech: `How many ${what} are in ${sig(m)} grams of ${s.name}? Answer in units of 10 to the 23rd.`,
        ...keypad(sf(N)),
        unit: "× 10²³",
        hint: "First find moles (mass ÷ molar mass), then multiply by Avogadro's number, 6.022 × 10²³.",
        explain: `${sig(m)} g ÷ ${M.toFixed(2)} g/mol = ${sig(m / M, 4)} mol; × 6.022 × 10²³ = ${sig(N)} × 10²³ ${what}.`,
      });
    }),
  () =>
    again(() => {
      const s = pick(MOLE_STUFF.filter((x) => Object.keys(atomsOf(x.f)).length > 1));
      const atoms = atomsOf(s.f);
      const el = pick(Object.keys(atoms));
      const n = rand(11, 99) / 100;
      const total = n * atoms[el];
      return q({
        key: `mol-atoms-${s.f}-${el}-${n}`,
        prompt: `How many moles of ${el} atoms are in ${n.toFixed(2)} mol of ${s.f}?`,
        speech: `How many moles of ${nameOf(el)} atoms are in ${n.toFixed(2)} moles of ${s.name}?`,
        ...keypad(dp(total, 2)),
        unit: "mol",
        hint: `Count the ${el} atoms in one ${s.f}. Remember a subscript after brackets multiplies everything inside.`,
        explain: `Each ${s.f} has ${atoms[el]} ${el} atom${atoms[el] === 1 ? "" : "s"}, so ${n.toFixed(2)} × ${atoms[el]} = ${dp(total, 2)} mol of ${el}.`,
      });
    }),
  () => {
    const s = pick(MOLE_STUFF.filter((x) => x.f.includes("(") || Object.values(atomsOf(x.f)).some((c) => c > 1)));
    const M = mm(s.f);
    const atoms = atomsOf(s.f);
    const heavy = Object.keys(atoms).sort((a, b) => element(b)!.mass - element(a)!.mass)[0];
    const wrong = [
      dp(M - element(heavy)!.mass, 2),
      dp(M + element(heavy)!.mass, 2),
      dp(Object.entries(atoms).reduce((t, [el]) => t + element(el)!.mass, 0), 2),
      dp(M - 16.0, 2),
    ].filter((w) => Math.abs(w - M) > 0.5);
    return q({
      key: `mol-M-${s.f}`,
      prompt: `What is the molar mass of ${s.f}?`,
      speech: `What is the molar mass of ${s.name}?`,
      ...choose(M, wrong, 12.01, 1),
      unit: "g/mol",
      hint: "Multiply each element's atomic mass by how many of its atoms are in the formula, then add.",
      explain: `${Object.entries(atoms)
        .map(([el, c]) => `${c} × ${element(el)!.mass.toFixed(2)} (${el})`)
        .join(" + ")} = ${M.toFixed(2)} g/mol.`,
    });
  },
  () =>
    again(() => {
      const set = shuffle(["H₂", "He", "CH₄", "O₂", "NH₃", "H₂O", "N₂", "CO₂", "Ne", "C₂H₆"]).slice(0, 4);
      const count = (f: string) => (10 / molarMass(f)) * Object.values(atomsOf(f)).reduce((a, b) => a + b, 0);
      const sorted = [...set].sort((a, b) => count(b) - count(a));
      if (count(sorted[0]) < count(sorted[1]) * 1.08) return null;
      return q({
        key: `mol-most-${[...set].sort().join("")}`,
        prompt: `Each sample has a mass of 10.0 g. Which contains the most atoms: ${set.join(", ")}?`,
        speech: `Each sample has a mass of 10.0 grams. Which sample contains the most atoms?`,
        ...label(sorted[0], sorted.slice(1)),
        hint: "Find moles of each (10.0 g ÷ M), then multiply by the number of atoms in one formula.",
        explain: `${sorted.map((f) => `${f}: ${sig(count(f), 3)} mol of atoms`).join("; ")}. ${sorted[0]} has the most.`,
      });
    }),
);

/** Liquids for "measure out n mol" (density in g/mL). */
const LIQUIDS = [
  { f: "H₂O", name: "water", d: 1.0 },
  { f: "C₂H₅OH", name: "ethanol", d: 0.789 },
  { f: "CH₃OH", name: "methanol", d: 0.792 },
  { f: "C₃H₆O", name: "acetone", d: 0.784 },
  { f: "C₆H₁₄", name: "hexane", d: 0.655 },
  { f: "C₃H₈O₃", name: "glycerol", d: 1.26 },
];

/** 1.1 Do it: weigh or measure out a number of moles. */
export const measureMoles = mix(
  () =>
    again(() => {
      const s = pick(MOLE_STUFF.filter((x) => x.ionic || x.f === "C₆H₁₂O₆" || x.f === "C₁₂H₂₂O₁₁"));
      const M = mm(s.f);
      const n = rand(4, 120) * 0.025;
      const m = n * M;
      const g = Math.round(m);
      if (Math.abs(m - g) > 0.2 || g < 5 || g > 300) return null;
      const nText = n.toFixed(3);
      return q({
        key: `wm-bal-${s.f}-${nText}`,
        prompt: `Do it: weigh out ${nText} mol of ${s.f} (M = ${M.toFixed(2)} g/mol). Add weights until the pans balance, to the nearest gram.`,
        speech: `Weigh out ${nText} moles of ${s.name}. Its molar mass is ${M.toFixed(2)} grams per mole. Add weights until the pans balance.`,
        ...act({ kind: "chem-measure", mode: "balance", mass: g, emoji: "🧂" }, g),
        hint: "Mass = moles × molar mass. Then build that mass from the weights, biggest first.",
        explain: `${nText} mol × ${M.toFixed(2)} g/mol = ${m.toFixed(1)} g, so about ${g} g.`,
      });
    }),
  () =>
    again(() => {
      const l = pick(LIQUIDS);
      const M = mm(l.f);
      const n = rand(4, 60) * 0.025;
      const V = (n * M) / l.d;
      const mL = Math.round(V);
      if (Math.abs(V - mL) > 0.2 || mL < 5 || mL > 50) return null;
      const nText = n.toFixed(3);
      return q({
        key: `wm-vol-${l.f}-${nText}`,
        prompt: `Do it: measure out ${nText} mol of ${l.name}, ${l.f} (M = ${M.toFixed(2)} g/mol, density ${l.d.toFixed(3)} g/mL). Fill the cylinder to the nearest mL.`,
        speech: `Measure out ${nText} moles of ${l.name}. The molar mass is ${M.toFixed(2)} grams per mole and the density is ${l.d.toFixed(3)} grams per milliliter.`,
        ...act({ kind: "chem-measure", mode: "fill", glass: "cylinder", target: mL, max: 50, step: 1, colour: "clear" }, mL),
        hint: "Mass = moles × molar mass. Volume = mass ÷ density.",
        explain: `${nText} mol × ${M.toFixed(2)} g/mol = ${(n * M).toFixed(2)} g; ÷ ${l.d.toFixed(3)} g/mL = ${V.toFixed(1)} mL, so about ${mL} mL.`,
      });
    }),
);

/** Isotope abundances (% by mass number) for mass spectra. */
const ISOTOPES: { el: string; peaks: [number, number][] }[] = [
  { el: "Li", peaks: [[6, 7.6], [7, 92.4]] },
  { el: "B", peaks: [[10, 19.9], [11, 80.1]] },
  { el: "Ne", peaks: [[20, 90.5], [21, 0.3], [22, 9.2]] },
  { el: "Mg", peaks: [[24, 79.0], [25, 10.0], [26, 11.0]] },
  { el: "Si", peaks: [[28, 92.2], [29, 4.7], [30, 3.1]] },
  { el: "Cl", peaks: [[35, 75.8], [37, 24.2]] },
  { el: "K", peaks: [[39, 93.3], [41, 6.7]] },
  { el: "Ti", peaks: [[46, 8.3], [47, 7.4], [48, 73.7], [49, 5.4], [50, 5.2]] },
  { el: "Cr", peaks: [[50, 4.3], [52, 83.8], [53, 9.5], [54, 2.4]] },
  { el: "Fe", peaks: [[54, 5.8], [56, 91.8], [57, 2.1], [58, 0.3]] },
  { el: "Cu", peaks: [[63, 69.2], [65, 30.8]] },
  { el: "Zn", peaks: [[64, 49.2], [66, 27.7], [67, 4.0], [68, 18.5], [70, 0.6]] },
  { el: "Ga", peaks: [[69, 60.1], [71, 39.9]] },
  { el: "Br", peaks: [[79, 50.7], [81, 49.3]] },
  { el: "Rb", peaks: [[85, 72.2], [87, 27.8]] },
  { el: "Ag", peaks: [[107, 51.8], [109, 48.2]] },
  { el: "Sb", peaks: [[121, 57.2], [123, 42.8]] },
];

const SUPN = (n: number) => [...String(n)].map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]).join("");
const avgMass = (peaks: [number, number][]) => peaks.reduce((t, [m, p]) => t + m * p, 0) / 100;

function spectrum(peaks: [number, number][], el?: string, title?: string): Visual {
  return {
    kind: "chem-spectrum",
    mode: "mass",
    peaks: peaks.map(([mz, percent]) => ({ mz, percent, label: el ? `${SUPN(mz)}${el} ${percent}%` : `${percent}%` })),
    ...(title ? { title } : {}),
  };
}

/** 1.2: mass spectra and average atomic mass. */
export const massSpectra = mix(
  () =>
    again(() => {
      const iso = pick(ISOTOPES);
      const avg = avgMass(iso.peaks);
      if (!safeDp(avg, 2)) return null;
      return q({
        key: `ms-avg-${iso.el}`,
        prompt: `The mass spectrum of ${nameOf(iso.el)} is shown. Using each mass number as the isotope's mass, what is the average atomic mass? Give 2 decimal places.`,
        visual: spectrum(iso.peaks, iso.el, nameOf(iso.el)),
        needsVisual: true,
        ...keypad(dp(avg, 2)),
        unit: "amu",
        hint: "Average = Σ (mass × fraction). Turn each percent into a fraction first.",
        explain: `${iso.peaks.map(([m, p]) => `${m} × ${(p / 100).toFixed(3)}`).join(" + ")} = ${dp(avg, 2)} amu.`,
      });
    }),
  () => {
    const iso = pick(ISOTOPES.filter((i) => i.peaks.length <= 3));
    const others = shuffle(ISOTOPES.filter((i) => i.el !== iso.el && Math.abs(avgMass(i.peaks) - avgMass(iso.peaks)) < 40)).slice(0, 3);
    return q({
      key: `ms-id-${iso.el}`,
      prompt: "This mass spectrum is from a pure element. Which element is it?",
      visual: spectrum(iso.peaks),
      needsVisual: true,
      ...label(nameOf(iso.el), others.map((o) => nameOf(o.el))),
      hint: "Work out the weighted average mass from the peaks, then find the element with that atomic mass.",
      explain: `The weighted average is about ${avgMass(iso.peaks).toFixed(1)}, which matches ${nameOf(iso.el)} (${element(iso.el)!.mass}).`,
    });
  },
  () =>
    again(() => {
      const m1 = rand(20, 120);
      const gap = pick([1, 2]);
      const p = rand(5, 95);
      const avg = m1 + (gap * p) / 100;
      return q({
        key: `ms-abund-${m1}-${gap}-${p}`,
        prompt: `Element X has two isotopes, with masses ${m1} and ${m1 + gap} amu. Its average atomic mass is ${avg.toFixed(2)} amu. What percent of X atoms have mass ${m1 + gap}?`,
        ...keypad(p),
        unit: "%",
        hint: `Let x be the fraction with mass ${m1 + gap}: ${m1}(1 − x) + ${m1 + gap}x = ${avg.toFixed(2)}.`,
        explain: `${m1} + ${gap}x = ${avg.toFixed(2)}, so x = ${(avg - m1).toFixed(2)} ÷ ${gap} = ${(p / 100).toFixed(2)}, which is ${p}%.`,
      });
    }),
  () => {
    const [el, peaks, names] = pick([
      ["Cl", [[70, 57.4], [72, 36.7], [74, 5.9]], ["³⁵Cl–³⁵Cl", "³⁵Cl–³⁷Cl", "³⁷Cl–³⁷Cl"]],
      ["Br", [[158, 25.7], [160, 50.0], [162, 24.3]], ["⁷⁹Br–⁷⁹Br", "⁷⁹Br–⁸¹Br", "⁸¹Br–⁸¹Br"]],
    ] as [string, [number, number][], string[]][]);
    const i = rand(0, 2);
    const wrong = [...names.filter((_, j) => j !== i), `${el} atom alone`];
    return q({
      key: `ms-di-${el}-${i}`,
      prompt: `This is the mass spectrum of ${el}₂ molecules. Which molecule gives the peak at m/z = ${peaks[i][0]}?`,
      speech: `This is the mass spectrum of ${nameOf(el)} molecules. Which molecule gives the peak at m over z equals ${peaks[i][0]}?`,
      visual: spectrum(peaks, undefined, `${el}₂`),
      ...label(names[i], wrong),
      hint: "Each peak is one molecule's mass: add the mass numbers of its two atoms.",
      explain: `${names[i]} has mass ${peaks[i][0]}.${i === 1 ? " It's the tallest peak because there are two ways to pair different isotopes." : ""}`,
    });
  },
  () => {
    const iso = pick(ISOTOPES.filter((i) => i.peaks.length === 2));
    const [[m1, p1], [m2]] = iso.peaks;
    const correct = p1 > 50 ? `${SUPN(m1)}${iso.el}: the average is closer to ${m1}` : `${SUPN(m2)}${iso.el}: the average is closer to ${m2}`;
    const other = p1 > 50 ? m2 : m1;
    return q({
      key: `ms-more-${iso.el}`,
      prompt: `${nameOf(iso.el)} has two stable isotopes, ${SUPN(m1)}${iso.el} and ${SUPN(m2)}${iso.el}. Its average atomic mass is ${element(iso.el)!.mass}. Which isotope is more abundant?`,
      speech: `${nameOf(iso.el)} has two stable isotopes, ${iso.el} ${m1} and ${iso.el} ${m2}. Its average atomic mass is ${element(iso.el)!.mass}. Which isotope is more abundant?`,
      ...label(correct, [
        `${SUPN(other)}${iso.el}: the average is closer to ${other}`,
        "Equal: there are two isotopes",
        `${SUPN(Math.max(m1, m2))}${iso.el}: heavier ones are more common`,
      ]),
      hint: "A weighted average is pulled toward the more common isotope.",
      explain: `The average sits closer to ${p1 > 50 ? m1 : m2}, so that isotope makes up most atoms (${p1 > 50 ? p1 : 100 - p1}%).`,
    });
  },
);

/** Compounds for percent composition. */
const COMPOSITION = ["KClO₃", "CaCO₃", "Fe₂O₃", "NaHCO₃", "H₂SO₄", "C₆H₁₂O₆", "NH₄NO₃", "Ca(OH)₂", "Al₂(SO₄)₃", "C₂H₅OH", "(NH₄)₂SO₄", "KMnO₄", "Na₂CO₃", "C₁₂H₂₂O₁₁", "Mg(NO₃)₂", "CuSO₄"];

const HYDRATES = [
  { salt: "CuSO₄", x: 5 },
  { salt: "MgSO₄", x: 7 },
  { salt: "CaCl₂", x: 2 },
  { salt: "BaCl₂", x: 2 },
  { salt: "Na₂CO₃", x: 10 },
  { salt: "CoCl₂", x: 6 },
  { salt: "ZnSO₄", x: 7 },
  { salt: "Na₂SO₄", x: 10 },
];

const massPct = (f: string, el: string) => ((atomsOf(f)[el] ?? 0) * element(el)!.mass * 100) / molarMass(f);

/** 1.3: percent composition, mass of an element, hydrates. */
export const percentComposition = mix(
  () =>
    again(() => {
      const f = pick(COMPOSITION);
      const el = pick(Object.keys(atomsOf(f)));
      const pct = massPct(f, el);
      if (!safe(pct, 3, 0.2)) return null;
      return q({
        key: `pc-pct-${f}-${el}`,
        prompt: `What is the mass percent of ${el} in ${f}? ${SF3}`,
        speech: `What is the mass percent of ${nameOf(el)} in ${f}?`,
        ...keypad(sf(pct)),
        unit: "%",
        hint: `Mass % = (mass of ${el} in one mole ÷ molar mass) × 100.`,
        explain: `${atomsOf(f)[el]} × ${element(el)!.mass.toFixed(2)} = ${(atomsOf(f)[el] * element(el)!.mass).toFixed(2)} g of ${el} per ${molarMass(f).toFixed(2)} g, which is ${sig(pct)}%.`,
      });
    }),
  () =>
    again(() => {
      const f = pick(COMPOSITION);
      const el = pick(Object.keys(atomsOf(f)).filter((e) => e !== "H"));
      const m = rand(100, 999) / 10;
      const g = (m * massPct(f, el)) / 100;
      if (!safe(g, 3, 0.2)) return null;
      return q({
        key: `pc-mass-${f}-${el}-${m}`,
        prompt: `How many grams of ${el} are in ${m.toFixed(1)} g of ${f}? ${SF3}`,
        speech: `How many grams of ${nameOf(el)} are in ${m.toFixed(1)} grams of ${f}?`,
        ...keypad(sf(g)),
        unit: "g",
        hint: `Find the mass fraction of ${el} in ${f}, then multiply by the sample mass.`,
        explain: `${el} is ${massPct(f, el).toFixed(2)}% of ${f}, so ${m.toFixed(1)} g × ${(massPct(f, el) / 100).toFixed(4)} = ${sig(g)} g.`,
      });
    }),
  () =>
    again(() => {
      const h = pick(HYDRATES);
      const Ms = mm(h.salt);
      const Mw = 18.02;
      const sample = rand(200, 999) / 100;
      const water = (sample * h.x * Mw) / (Ms + h.x * Mw);
      const anhyd = sample - water;
      const wText = water.toFixed(2);
      const ratio = Number(wText) / Mw / ((sample - Number(wText)) / Ms);
      if (Math.abs(ratio - h.x) > 0.25) return null;
      return q({
        key: `pc-hyd-${h.salt}-${sample}`,
        prompt: `A ${sample.toFixed(2)} g sample of ${h.salt}·xH₂O is heated until all the water is gone. It loses ${wText} g. What is x? (${h.salt}: ${Ms.toFixed(2)} g/mol, H₂O: 18.02 g/mol)`,
        speech: `A ${sample.toFixed(2)} gram sample of hydrated ${h.salt} is heated until all the water is gone. It loses ${wText} grams. How many waters, x, are in the formula?`,
        ...keypad(h.x),
        hint: "Find moles of water lost and moles of the dry salt left. x is their ratio.",
        explain: `Water: ${wText} ÷ 18.02 = ${(Number(wText) / Mw).toFixed(4)} mol. Salt: ${(sample - Number(wText)).toFixed(2)} g ÷ ${Ms.toFixed(2)} = ${(anhyd / Ms).toFixed(4)} mol. Ratio ≈ ${h.x}.`,
      });
    }),
  () =>
    again(() => {
      const el = pick(["N", "O", "C", "S"]);
      const pool = COMPOSITION.concat(["NH₃", "CO(NH₂)₂", "CO₂", "SO₂", "H₂O", "CH₄", "HNO₃"]).filter((f) => atomsOf(f)[el]);
      const set = shuffle([...new Set(pool)]).slice(0, 4);
      if (set.length < 4) return null;
      const sorted = [...set].sort((a, b) => massPct(b, el) - massPct(a, el));
      if (massPct(sorted[0], el) - massPct(sorted[1], el) < 2) return null;
      return q({
        key: `pc-most-${el}-${[...set].sort().join("")}`,
        prompt: `Which compound has the greatest mass percent of ${el}: ${set.join(", ")}?`,
        speech: `Which compound has the greatest mass percent of ${nameOf(el)}?`,
        ...label(sorted[0], sorted.slice(1)),
        hint: `For each, divide the mass of ${el} in the formula by the molar mass.`,
        explain: sorted.map((f) => `${f}: ${massPct(f, el).toFixed(1)}%`).join("; ") + ".",
      });
    }),
);

/** Empirical formulas with mass-percent data and wrong options. */
const EMPIRICAL: { f: string; wrong: string[] }[] = [
  { f: "CH₂O", wrong: ["CHO", "CH₄O", "C₂H₃O"] },
  { f: "CH₂", wrong: ["CH", "CH₃", "C₂H₅"] },
  { f: "CH", wrong: ["CH₂", "C₂H₃", "CH₄"] },
  { f: "C₂H₅", wrong: ["CH₃", "CH₂", "C₃H₄"] },
  { f: "Fe₂O₃", wrong: ["FeO", "Fe₃O₄", "FeO₂"] },
  { f: "N₂O₅", wrong: ["NO₂", "N₂O₃", "NO₃"] },
  { f: "P₂O₅", wrong: ["PO₂", "P₂O₃", "PO₃"] },
  { f: "C₃H₄O₃", wrong: ["CH₂O", "C₂H₃O₂", "C₃H₆O₃"] },
  { f: "NH₂", wrong: ["NH₃", "NH", "N₂H₃"] },
  { f: "SO₃", wrong: ["SO₂", "S₂O₃", "SO₄"] },
  { f: "C₂H₆O", wrong: ["CH₃O", "C₂H₄O", "CH₄O"] },
  { f: "Cu₂S", wrong: ["CuS", "CuS₂", "Cu₃S"] },
  { f: "Na₂SO₄", wrong: ["NaSO₄", "Na₂SO₃", "NaSO₃"] },
];

const MOLECULAR: { emp: string; mol: string }[] = [
  { emp: "CH₂O", mol: "C₆H₁₂O₆" },
  { emp: "CH", mol: "C₆H₆" },
  { emp: "C₂H₅", mol: "C₄H₁₀" },
  { emp: "NO₂", mol: "N₂O₄" },
  { emp: "P₂O₅", mol: "P₄O₁₀" },
  { emp: "CH₂", mol: "C₅H₁₀" },
  { emp: "C₃H₄O₃", mol: "C₆H₈O₆" },
  { emp: "NH₂", mol: "N₂H₄" },
  { emp: "HO", mol: "H₂O₂" },
  { emp: "CH₂O", mol: "C₂H₄O₂" },
  { emp: "C₂H₄O", mol: "C₄H₈O₂" },
  { emp: "CH₃O", mol: "C₂H₆O₂" },
  { emp: "CH", mol: "C₂H₂" },
  { emp: "C₂H₃", mol: "C₄H₆" },
];

/** Write a formula from element counts in a fixed order: C, H, then the rest. */
function formulaFrom(atoms: Record<string, number>): string {
  const order = Object.keys(atoms).sort((a, b) => (a === "C" ? -1 : b === "C" ? 1 : a === "H" ? -1 : b === "H" ? 1 : 0));
  const subs = "₀₁₂₃₄₅₆₇₈₉";
  return order.map((el) => `${el}${atoms[el] === 1 ? "" : [...String(atoms[el])].map((d) => subs[+d]).join("")}`).join("");
}

const HYDROCARBONS = ["CH₄", "C₂H₆", "C₃H₈", "C₂H₄", "C₂H₂", "C₄H₁₀", "C₆H₆", "C₃H₄", "C₅H₁₂", "C₇H₁₆", "C₃H₆"];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

function empiricalOf(f: string): string {
  const atoms = atomsOf(f);
  const g = Object.values(atoms).reduce(gcd);
  return formulaFrom(Object.fromEntries(Object.entries(atoms).map(([k, v]) => [k, v / g])));
}

/** 1.3: empirical and molecular formulas. */
export const empiricalFormulas = mix(
  () => {
    const e = pick(EMPIRICAL);
    const els = Object.keys(atomsOf(e.f));
    const pcts = els.map((el) => massPct(e.f, el).toFixed(1));
    return q({
      key: `ef-pct-${e.f}`,
      prompt: `A compound is ${els.map((el, i) => `${pcts[i]}% ${el}`).join(", ")} by mass. What is its empirical formula?`,
      speech: `A compound is ${els.map((el, i) => `${pcts[i]} percent ${nameOf(el)}`).join(", ")} by mass. What is its empirical formula?`,
      ...label(e.f, e.wrong),
      hint: "Assume 100 g. Turn each mass into moles, then divide by the smallest number of moles.",
      explain: `Per 100 g: ${els.map((el, i) => `${el} ${(Number(pcts[i]) / element(el)!.mass).toFixed(3)} mol`).join(", ")}. The whole-number ratio gives ${e.f}.`,
    });
  },
  () => {
    const m = pick(MOLECULAR);
    const M = mm(m.mol);
    const k = Math.round(molarMass(m.mol) / molarMass(m.emp));
    const wrongs = [2, 3, 4, 5, 6].filter((n) => n !== k).map((n) => formulaFrom(Object.fromEntries(Object.entries(atomsOf(m.emp)).map(([el, c]) => [el, c * n]))));
    return q({
      key: `ef-mol-${m.mol}`,
      prompt: `A compound has empirical formula ${m.emp} and molar mass ${M.toFixed(1)} g/mol. What is its molecular formula?`,
      ...label(m.mol, [m.emp, ...wrongs]),
      hint: "Divide the molar mass by the empirical formula mass. Multiply every subscript by that whole number.",
      explain: `${m.emp} has mass ${molarMass(m.emp).toFixed(2)} g/mol. ${M.toFixed(1)} ÷ ${molarMass(m.emp).toFixed(2)} = ${k}, so the formula is ${m.mol}.`,
    });
  },
  () =>
    again(() => {
      const hc = pick(HYDROCARBONS);
      const { C, H } = atomsOf(hc);
      const k = rand(10, 60) / 1000;
      const mCO2 = k * C * 44.01;
      const mH2O = ((k * H) / 2) * 18.02;
      const emp = empiricalOf(hc);
      const wrong = HYDROCARBONS.map(empiricalOf).filter((x) => x !== emp);
      const nC = Number(sig(mCO2)) / 44.01;
      const nH = (2 * Number(sig(mH2O))) / 18.02;
      const g = gcd(C, H);
      if (Math.abs(nH / nC - H / g / (C / g)) > 0.03 * (H / C)) return null;
      return q({
        key: `ef-comb-${hc}-${k}`,
        prompt: `A hydrocarbon burns completely in oxygen to give ${sig(mCO2)} g of CO₂ and ${sig(mH2O)} g of H₂O. What is its empirical formula? (CO₂ 44.01, H₂O 18.02 g/mol)`,
        speech: `A hydrocarbon burns completely in oxygen to give ${sig(mCO2)} grams of carbon dioxide and ${sig(mH2O)} grams of water. What is its empirical formula?`,
        ...label(emp, wrong),
        hint: "All the C ends up in CO₂ and all the H in H₂O. Each H₂O carries 2 H atoms.",
        explain: `mol C = ${sig(mCO2)} ÷ 44.01 = ${nC.toFixed(4)}; mol H = 2 × ${sig(mH2O)} ÷ 18.02 = ${nH.toFixed(4)}. H : C ≈ ${(nH / nC).toFixed(2)}, so the formula is ${emp}.`,
      });
    }),
  () =>
    again(() => {
      const f = pick(["MgO", "Al₂O₃", "Fe₂O₃", "FeO", "Fe₃O₄", "Cu₂O", "CuO", "Na₂O", "CaCl₂", "AlCl₃", "TiO₂", "Cr₂O₃", "P₄O₁₀", "SO₃", "N₂O₃"]);
      const atoms = atomsOf(f);
      const [a, b] = Object.keys(atoms);
      const k = rand(15, 90) / 1000;
      const ma = k * atoms[a] * element(a)!.mass;
      const mb = k * atoms[b] * element(b)!.mass;
      const emp = empiricalOf(f);
      const alt = [`${a}${b}`, `${a}₂${b}`, `${a}${b}₂`, `${a}₂${b}₃`, `${a}₃${b}₂`, `${a}${b}₃`, `${a}₃${b}₄`].filter((x) => x !== emp);
      return q({
        key: `ef-mass-${f}-${k}`,
        prompt: `A sample of a compound contains ${sig(ma)} g of ${a} and ${sig(mb)} g of ${b}. What is its empirical formula?`,
        speech: `A sample of a compound contains ${sig(ma)} grams of ${nameOf(a)} and ${sig(mb)} grams of ${nameOf(b)}. What is its empirical formula?`,
        ...label(emp, alt),
        hint: "Turn both masses into moles, then find the simplest whole-number ratio.",
        explain: `${a}: ${sig(ma)} ÷ ${element(a)!.mass.toFixed(2)} = ${(ma / element(a)!.mass).toFixed(4)} mol; ${b}: ${sig(mb)} ÷ ${element(b)!.mass.toFixed(2)} = ${(mb / element(b)!.mass).toFixed(4)} mol. The ratio gives ${emp}.`,
      });
    }),
);

/** Salts analysed by precipitating with Ag⁺ or Ba²⁺ (1 : 1). */
const GRAVIMETRIC = [
  { salt: "NaCl", ppt: "AgCl", reagent: "AgNO₃" },
  { salt: "KCl", ppt: "AgCl", reagent: "AgNO₃" },
  { salt: "NaBr", ppt: "AgBr", reagent: "AgNO₃" },
  { salt: "KI", ppt: "AgI", reagent: "AgNO₃" },
  { salt: "Na₂SO₄", ppt: "BaSO₄", reagent: "BaCl₂" },
  { salt: "MgSO₄", ppt: "BaSO₄", reagent: "BaCl₂" },
];

const CHLORIDES = ["LiCl", "NaCl", "KCl", "MgCl₂", "CaCl₂", "RbCl", "NaBr", "KBr", "NaF"];

/** 1.4: composition of mixtures. */
export const mixtures = mix(
  () =>
    again(() => {
      const g = pick(GRAVIMETRIC);
      const pct = rand(20, 95);
      const m = rand(1000, 3000) / 1000;
      const mp = ((m * pct) / 100) * (molarMass(g.ppt) / molarMass(g.salt));
      const mpText = mp.toFixed(3);
      const real = ((Number(mpText) / mm(g.ppt)) * mm(g.salt) * 100) / m;
      if (!safe(real, 3, 0.15)) return null;
      return q({
        key: `mx-grav-${g.salt}-${pct}-${m}`,
        prompt: `A ${m.toFixed(3)} g mixture of ${g.salt} and sand is dissolved and filtered, and excess ${g.reagent} is added. ${mpText} g of ${g.ppt} precipitates. What is the mass percent of ${g.salt} in the mixture? (${g.salt} ${mmText(g.salt)}, ${g.ppt} ${mmText(g.ppt)} g/mol) ${SF3}`,
        speech: `A ${m.toFixed(3)} gram mixture of ${g.salt} and sand is dissolved and filtered, and excess ${g.reagent} is added. ${mpText} grams of ${g.ppt} precipitates. What is the mass percent of ${g.salt} in the mixture?`,
        ...keypad(sf(real)),
        unit: "%",
        hint: `Moles of ${g.ppt} = moles of ${g.salt} (1 : 1). Turn that into grams of ${g.salt}, then divide by the mixture mass.`,
        explain: `${mpText} g ÷ ${mmText(g.ppt)} = ${(Number(mpText) / mm(g.ppt)).toFixed(5)} mol; × ${mmText(g.salt)} = ${((Number(mpText) / mm(g.ppt)) * mm(g.salt)).toFixed(4)} g of ${g.salt}; ÷ ${m.toFixed(3)} g = ${sig(real)}%.`,
      });
    }),
  () =>
    again(() => {
      const base = pick(["NaCl", "KCl", "CaCl₂", "MgCl₂"]);
      const b = massPct(base, "Cl");
      const higher = Math.random() < 0.5;
      const opts = CHLORIDES.filter((c) => c !== base);
      const right = opts.filter((c) => (higher ? massPct(c, "Cl") > b + 2 : massPct(c, "Cl") < b - 2));
      const wrong = opts.filter((c) => (higher ? massPct(c, "Cl") < b - 2 : massPct(c, "Cl") > b + 2));
      if (!right.length || wrong.length < 2) return null;
      const imp = pick(right);
      const measured = b + (massPct(imp, "Cl") - b) * (rand(15, 40) / 100);
      return q({
        key: `mx-imp-${base}-${imp}-${measured.toFixed(1)}`,
        prompt: `Pure ${base} is ${b.toFixed(1)}% Cl by mass. A sample of ${base} contaminated with ONE other compound is ${measured.toFixed(1)}% Cl. Which could the impurity be?`,
        speech: `Pure ${base} is ${b.toFixed(1)} percent chlorine by mass. A sample contaminated with one other compound is ${measured.toFixed(1)} percent chlorine. Which could the impurity be?`,
        ...label(imp, shuffle(wrong).slice(0, 3)),
        hint: `The impurity must have a ${higher ? "higher" : "lower"} mass percent of Cl than ${base} to pull the result ${higher ? "up" : "down"}.`,
        explain: `${imp} is ${massPct(imp, "Cl").toFixed(1)}% Cl, ${higher ? "more" : "less"} than ${base}, so mixing it in moves the measured % ${higher ? "up" : "down"}.`,
      });
    }),
  () =>
    again(() => {
      const f = pick(["CaCO₃", "NaCl", "KBr", "CuSO₄", "MgO", "Fe₂O₃"]);
      const el = Object.keys(atomsOf(f))[0];
      const p = massPct(f, el);
      const bad = rand(0, 3);
      const vals = [0, 1, 2, 3].map((i) => (i === bad ? p - (rand(30, 80) / 10) * pick([1, -1]) : p + (rand(-2, 2) / 10)));
      const names = ["A", "B", "C", "D"];
      return q({
        key: `mx-pure-${f}-${vals.map((v) => v.toFixed(1)).join("-")}`,
        prompt: `Four samples labelled "pure ${f}" are analysed for ${nameOf(el).toLowerCase()}. Pure ${f} is ${p.toFixed(1)}% ${el}. Which sample is a mixture?`,
        visual: table(["Sample", `Mass % ${el}`], names.map((n, i) => [n, vals[i].toFixed(1)])),
        needsVisual: true,
        ...fixedLabels(names.map((n) => `Sample ${n}`), `Sample ${names[bad]}`),
        hint: "A pure compound always has the same composition by mass (law of definite proportions).",
        explain: `Sample ${names[bad]} (${vals[bad].toFixed(1)}%) is far from ${p.toFixed(1)}%, so it must contain something else.`,
      });
    }),
  () =>
    again(() => {
      const m = rand(50, 200) / 10;
      const pct = rand(25, 95);
      const n = ((m * pct) / 100) / mm("CaCO₃");
      const nText = n.toFixed(4);
      const real = ((Number(nText) * mm("CaCO₃")) / m) * 100;
      if (!safe(real, 3, 0.15)) return null;
      return q({
        key: `mx-co2-${m}-${pct}`,
        prompt: `A ${m.toFixed(1)} g mixture of CaCO₃ and sand is heated. CaCO₃ → CaO + CO₂, and ${nText} mol of CO₂ is released. What is the mass percent of CaCO₃? (CaCO₃ ${mmText("CaCO₃")} g/mol) ${SF3}`,
        speech: `A ${m.toFixed(1)} gram mixture of calcium carbonate and sand is heated, releasing ${nText} moles of carbon dioxide. What is the mass percent of calcium carbonate?`,
        visual: reaction(["CaCO₃"], ["CaO", "CO₂"], { states: ["s", "s", "g"], above: "Δ" }),
        ...keypad(sf(real)),
        unit: "%",
        hint: "1 mol CO₂ comes from 1 mol CaCO₃. Find the mass of CaCO₃, then divide by the mixture mass.",
        explain: `${nText} mol × ${mmText("CaCO₃")} g/mol = ${(Number(nText) * mm("CaCO₃")).toFixed(3)} g; ÷ ${m.toFixed(1)} g = ${sig(real)}%.`,
      });
    }),
);

/* -------------------------------------------------------------- electrons */

/** Unpaired electrons from a configuration (Hund's rule). */
function unpaired(z: number, electrons = z): number {
  const parts = electronConfig(z, false, electrons).split(" ");
  const cap: Record<string, number> = { s: 1, p: 3, d: 5, f: 7 };
  return parts.reduce((t, p) => {
    const m = /^(\d)([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(p);
    if (!m) return t;
    const n = Number([...m[3]].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join(""));
    const k = cap[m[2]];
    return t + (n <= k ? n : 2 * k - n);
  }, 0);
}

const IONS: [string, number][] = [
  ["Na", 1], ["Mg", 2], ["Al", 3], ["O", -2], ["F", -1], ["Cl", -1], ["S", -2], ["N", -3], ["K", 1], ["Ca", 2],
  ["Fe", 2], ["Fe", 3], ["Cu", 1], ["Cu", 2], ["Zn", 2], ["Mn", 2], ["Co", 2], ["Ni", 2], ["Cr", 3], ["Ti", 2], ["Sc", 3],
];

const ionName = (sym: string, c: number) => `${sym}${c === 0 ? "" : `${Math.abs(c) === 1 ? "" : SUPN(Math.abs(c))}${c > 0 ? "⁺" : "⁻"}`}`;
const neutrons = (z: number) => Math.round(element(z)!.mass) - z;

/** Speech for a configuration: "1 s 2, 2 s 2, 2 p 6". */
const sayConfig = (cfg: string) =>
  cfg
    .replace(/\[(\w+)\]/, "the $1 core,")
    .replace(/(\d)([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, n, l, e) => `${n} ${l} ${[...e].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("")},`);

/** 1.5: electron configurations and Coulomb's law. */
export const configurations = mix(
  () => {
    const ion = Math.random() < 0.4;
    const [sym, c] = ion ? pick(IONS) : [element(rand(5, 36))!.symbol, 0];
    const z = element(sym)!.z;
    const e = z - c;
    const correct = electronConfig(z, true, e);
    const wrong = [electronConfig(z, true, e - 1), electronConfig(z, true, e + 1)];
    if (c !== 0) wrong.push(electronConfig(z, true, z));
    if (c > 0 && element(sym)!.block === "d") {
      const d = e - 18;
      wrong.push(`[Ar] 4s² 3d${SUPN(d - 2)}`);
    }
    if (sym === "Cr" && c === 0) wrong.push("[Ar] 4s² 3d⁴");
    if (sym === "Cu" && c === 0) wrong.push("[Ar] 4s² 3d⁹");
    const nm = ionName(sym, c);
    return q({
      key: `ec-cfg-${sym}-${c}`,
      prompt: `What is the ground-state electron configuration of ${nm}?`,
      speech: `What is the ground state electron configuration of ${c === 0 ? nameOf(sym) : nm}?`,
      ...label(correct, wrong),
      hint:
        c > 0 && element(sym)!.block === "d"
          ? "Transition-metal cations lose their 4s electrons before 3d."
          : c !== 0
            ? `Count electrons first: ${z} protons ${c > 0 ? "−" : "+"} ${Math.abs(c)} = ${e} electrons.`
            : "Fill 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p in order. Cr and Cu are exceptions.",
      explain: `${nm} has ${e} electrons: ${correct}.`,
    });
  },
  () => {
    const z = rand(5, 36);
    const cfg = electronConfig(z);
    const others = shuffle([z - 1, z + 1, z - 2, z + 2, z + 8, z - 8].filter((x) => x >= 3 && x <= 40)).slice(0, 3);
    return q({
      key: `ec-id-${z}`,
      prompt: `Which element has the ground-state configuration ${cfg}?`,
      speech: `Which element has the ground state configuration ${sayConfig(cfg)}?`,
      ...label(element(z)!.symbol, others.map((x) => element(x)!.symbol)),
      hint: "Add up the superscripts: that's the number of electrons, which equals the atomic number for a neutral atom.",
      explain: `The superscripts add to ${z}, so it is ${nameOf(element(z)!.symbol)} (${element(z)!.symbol}).`,
    });
  },
  () => {
    const ion = Math.random() < 0.35;
    const [sym, c] = ion ? pick(IONS) : [element(rand(5, 30))!.symbol, 0];
    const z = element(sym)!.z;
    const u = unpaired(z, z - c);
    const nm = ionName(sym, c);
    return q({
      key: `ec-unp-${sym}-${c}`,
      prompt: `How many unpaired electrons does a ground-state ${nm} ${c ? "ion" : "atom"} have?`,
      speech: `How many unpaired electrons does a ground state ${c === 0 ? nameOf(sym) : nm} ${c ? "ion" : "atom"} have?`,
      visual: c === 0 && z <= 36 ? { kind: "chem-atom", protons: z, neutrons: neutrons(z), electrons: z } : NONE,
      ...keypad(u),
      hint: "Write the configuration. In the last partly filled subshell, put one electron in each orbital before pairing (Hund's rule).",
      explain: `${nm}: ${electronConfig(z, true, z - c)}, which has ${u} unpaired electron${u === 1 ? "" : "s"}.`,
    });
  },
  () => {
    const [a, b] = pick([
      ["Na", "Mg", "Mg has one more proton, so its electrons in the same shell are pulled harder"],
      ["Li", "Be", "Be has one more proton, so its electrons in the same shell are pulled harder"],
      ["C", "N", "N has one more proton, so its electrons in the same shell are pulled harder"],
      ["Al", "Si", "Si has one more proton, so its electrons in the same shell are pulled harder"],
      ["K", "Ca", "Ca has one more proton, so its electrons in the same shell are pulled harder"],
      ["O", "F", "F has one more proton, so its electrons in the same shell are pulled harder"],
    ] as [string, string, string][]);
    return q({
      key: `ec-coul-${a}-${b}`,
      prompt: `Which needs more energy to remove: a 1s electron from ${a} or a 1s electron from ${b}? Why?`,
      speech: `Which needs more energy to remove, a 1 s electron from ${nameOf(a)} or a 1 s electron from ${nameOf(b)}? Why?`,
      ...label(`${b}: one more proton pulls harder`, [
        `${a}: fewer electrons repel it`,
        `The same: both are 1s electrons`,
        `${b}: more neutrons attract it`,
      ]),
      hint: "Coulomb's law: force grows with the nuclear charge and shrinks with distance.",
      explain: `Both 1s electrons are about the same distance from the nucleus, but ${b} has a larger nuclear charge, so its 1s electron is held more strongly.`,
    });
  },
  () => {
    const z = pick([3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 19, 20, 31, 32, 33, 34, 35]);
    const v = valenceElectrons(z)!;
    return q({
      key: `ec-val-${z}`,
      prompt: `How many valence electrons does a ${nameOf(element(z)!.symbol).toLowerCase()} (${element(z)!.symbol}) atom have? Its configuration is ${electronConfig(z, true)}.`,
      speech: `How many valence electrons does a ${nameOf(element(z)!.symbol)} atom have?`,
      visual: { kind: "chem-atom", protons: z, neutrons: neutrons(z), electrons: z, valence: true },
      ...keypad(v),
      hint: "Valence electrons are in the outermost shell (highest n). For main-group elements, d electrons don't count.",
      explain: `The outer shell of ${element(z)!.symbol} holds ${v} electrons (${electronConfig(z, true)}).`,
    });
  },
);

/** PES binding energies (MJ/mol) for H–Ca, in subshell order 1s, 2s, 2p, 3s, 3p, 4s. */
const PES: Record<number, number[]> = {
  1: [1.31], 2: [2.37], 3: [6.26, 0.52], 4: [11.5, 0.9], 5: [19.3, 1.36, 0.8], 6: [28.6, 1.72, 1.09],
  7: [39.6, 2.45, 1.4], 8: [52.6, 3.12, 1.31], 9: [67.2, 3.88, 1.68], 10: [84.0, 4.68, 2.08],
  11: [104, 6.84, 3.67, 0.5], 12: [126, 9.07, 5.31, 0.74], 13: [151, 12.1, 7.19, 1.09, 0.58],
  14: [178, 15.1, 10.3, 1.46, 0.79], 15: [208, 18.7, 13.5, 1.95, 1.01], 16: [239, 22.7, 16.5, 2.05, 1.0],
  17: [273, 26.8, 20.2, 2.44, 1.25], 18: [309, 31.5, 24.1, 2.82, 1.52], 19: [347, 37.1, 29.1, 3.93, 2.38, 0.42],
  20: [390, 42.7, 34.0, 4.65, 2.9, 0.59],
};

/** Subshells and electron counts for Z ≤ 20. */
function subshells(z: number): [string, number][] {
  return electronConfig(z)
    .split(" ")
    .map((p) => {
      const m = /^(\d[spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(p)!;
      return [m[1], Number([...m[2]].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join(""))] as [string, number];
    });
}

function pesVisual(z: number, ask = -1, labels = true): Visual {
  const sub = subshells(z);
  return {
    kind: "chem-spectrum",
    mode: "pes",
    peaks: sub.map(([name, n], i) => ({ energy: PES[z][i], electrons: n, label: i === ask ? "?" : labels ? name : null })),
  };
}

/** 1.6: photoelectron spectroscopy. */
export const photoelectron = mix(
  () => {
    const z = rand(3, 20);
    const others = shuffle([z - 1, z + 1, z - 2, z + 2, z + 8].filter((x) => x >= 2 && x <= 20)).slice(0, 3);
    return q({
      key: `pes-id-${z}`,
      prompt: "This photoelectron spectrum is for a neutral atom in its ground state. Which element is it?",
      visual: pesVisual(z, -1, false),
      needsVisual: true,
      ...label(element(z)!.symbol, others.map((x) => element(x)!.symbol)),
      hint: "Each peak is a subshell and its height is the number of electrons. Add up all the electrons.",
      explain: `The peaks hold ${subshells(z).map(([, n]) => n).join(" + ")} = ${z} electrons, so the element is ${nameOf(element(z)!.symbol)}.`,
    });
  },
  () => {
    const z = rand(4, 20);
    const sub = subshells(z);
    const i = rand(0, sub.length - 1);
    const names = ["1s", "2s", "2p", "3s", "3p", "4s"];
    return q({
      key: `pes-sub-${z}-${i}`,
      prompt: `This is the PES of ${nameOf(element(z)!.symbol).toLowerCase()}. Which subshell's electrons make the peak marked "?" (${PES[z][i]} MJ/mol)?`,
      speech: `This is the photoelectron spectrum of ${nameOf(element(z)!.symbol)}. Which subshell's electrons make the peak marked with a question mark?`,
      visual: pesVisual(z, i, false),
      needsVisual: true,
      ...label(sub[i][0], names.filter((n) => n !== sub[i][0])),
      hint: "Peaks farther left have higher binding energy: they're closer to the nucleus. Count peaks from the left: 1s, 2s, 2p, 3s…",
      explain: `Counting from the highest energy: ${sub.map(([n]) => n).join(", ")}. The marked peak is ${sub[i][0]} with ${sub[i][1]} electrons.`,
    });
  },
  () => {
    const z = rand(5, 20);
    const sub = subshells(z);
    const i = rand(0, sub.length - 1);
    return q({
      key: `pes-n-${z}-${i}`,
      prompt: `In the PES of ${nameOf(element(z)!.symbol).toLowerCase()}, how many electrons does the peak at ${PES[z][i]} MJ/mol represent?`,
      speech: `In the photoelectron spectrum of ${nameOf(element(z)!.symbol)}, how many electrons does the peak at ${PES[z][i]} megajoules per mole represent?`,
      visual: pesVisual(z, -1, false),
      ...keypad(sub[i][1]),
      hint: "Peak heights are proportional to the number of electrons. Match peaks to subshells: 1s, 2s, 2p, 3s, 3p, 4s.",
      explain: `The peak at ${PES[z][i]} MJ/mol is the ${sub[i][0]} subshell, which holds ${sub[i][1]} electrons in ${element(z)!.symbol}.`,
    });
  },
  () => {
    const z = rand(3, 19);
    const a = element(z)!.symbol;
    const b = element(z + 1)!.symbol;
    return q({
      key: `pes-cmp-${z}`,
      prompt: `The 1s peak of ${a} is at ${PES[z][0]} MJ/mol. Where would the 1s peak of ${b} be?`,
      speech: `The 1 s peak of ${nameOf(a)} is at ${PES[z][0]} megajoules per mole. Where would the 1 s peak of ${nameOf(b)} be?`,
      ...label(`Higher: ${b} has one more proton`, [
        `Lower: ${b} has more shielding`,
        `The same: both are 1s electrons`,
        `Lower: ${b} is a bigger atom`,
      ]),
      hint: "1s electrons feel almost the full nuclear charge. More protons means a stronger pull.",
      explain: `${b} has ${z + 1} protons versus ${z}, so its 1s electrons are held more tightly: the peak moves to about ${PES[z + 1][0]} MJ/mol.`,
    });
  },
  () => {
    const z = rand(3, 20);
    const sub = subshells(z);
    const last = PES[z][sub.length - 1];
    return q({
      key: `pes-val-${z}`,
      prompt: `In the PES of ${nameOf(element(z)!.symbol).toLowerCase()}, which peak's electrons are easiest to remove?`,
      speech: `In the photoelectron spectrum of ${nameOf(element(z)!.symbol)}, which peak's electrons are easiest to remove?`,
      visual: pesVisual(z),
      ...label(`${last} MJ/mol (${sub[sub.length - 1][0]})`, PES[z].slice(0, -1).map((e, i) => `${e} MJ/mol (${sub[i][0]})`).concat(["They are all equally easy"])),
      hint: "Binding energy is the energy needed to remove the electron. The smallest value is easiest.",
      explain: `The ${sub[sub.length - 1][0]} electrons at ${last} MJ/mol are outermost and least tightly held.`,
    });
  },
);

/** Pauling-style data for trend questions. */
const IE1: Record<string, number> = {
  H: 1312, He: 2372, Li: 520, Be: 899, B: 801, C: 1086, N: 1402, O: 1314, F: 1681, Ne: 2081, Na: 496, Mg: 738, Al: 578,
  Si: 786, P: 1012, S: 1000, Cl: 1251, Ar: 1521, K: 419, Ca: 590, Ga: 579, Ge: 762, As: 947, Se: 941, Br: 1140, Kr: 1351,
  Rb: 403, Sr: 550, I: 1008,
};
const RADIUS: Record<string, number> = {
  Li: 152, Be: 112, B: 85, C: 77, N: 75, O: 73, F: 72, Na: 186, Mg: 160, Al: 143, Si: 118, P: 110, S: 103, Cl: 99,
  K: 227, Ca: 197, Ga: 135, Ge: 122, As: 120, Se: 119, Br: 114, Rb: 248, Sr: 215, I: 133,
};
const PERIODS: string[][] = [
  ["Li", "Be", "B", "C", "N", "O", "F"],
  ["Na", "Mg", "Al", "Si", "P", "S", "Cl"],
  ["K", "Ca", "Ga", "Ge", "As", "Se", "Br"],
];
const GROUPS: string[][] = [
  ["Li", "Na", "K", "Rb"],
  ["Be", "Mg", "Ca", "Sr"],
  ["N", "P", "As"],
  ["O", "S", "Se"],
  ["F", "Cl", "Br", "I"],
];

/** Pick two elements in the same period or group. */
function trendPair(): { a: string; b: string; same: "period" | "group" } {
  if (Math.random() < 0.5) {
    const p = pick(PERIODS);
    const [a, b] = shuffle(p).slice(0, 2);
    return { a, b, same: "period" };
  }
  const g = pick(GROUPS);
  const [a, b] = shuffle(g).slice(0, 2);
  return { a, b, same: "group" };
}

const tableVisual = (cells: string[]): Visual => ({ kind: "chem-table", mainOnly: true, periods: [1, 5], highlight: [{ cells, colour: "sun" }] });

/** 1.7: periodic trends with Coulombic reasons. */
export const periodicTrends = mix(
  () => {
    const { a, b, same } = trendPair();
    const big = RADIUS[a] > RADIUS[b] ? a : b;
    const small = big === a ? b : a;
    const right =
      same === "period"
        ? `${big}: fewer protons pull the same shell`
        : `${big}: its valence shell is farther out`;
    return q({
      key: `tr-rad-${[a, b].sort().join("")}`,
      prompt: `Which atom has the larger atomic radius, ${a} or ${b}? Why?`,
      speech: `Which atom has the larger atomic radius, ${nameOf(a)} or ${nameOf(b)}? Why?`,
      visual: tableVisual([a, b]),
      ...label(right, [
        same === "period" ? `${small}: more electrons take up more space` : `${small}: fewer electrons repel each other`,
        same === "period" ? `${small}: more protons push electrons out` : `${small}: its nucleus is smaller`,
        same === "period" ? `${big}: it has more shells` : `${big}: it has fewer protons`,
      ]),
      hint: same === "period" ? "Across a period, electrons go into the same shell while the nuclear charge grows." : "Down a group, each element adds a new shell.",
      explain: `${big} (${RADIUS[big]} pm) is larger than ${small} (${RADIUS[small]} pm). ${same === "period" ? "Across a period the effective nuclear charge rises and pulls the shell in." : "Down a group the valence shell is farther out."}`,
    });
  },
  () => {
    const special: [string, string, string][] = [
      ["Be", "B", "B loses a higher-energy 2p electron"],
      ["Mg", "Al", "Al loses a higher-energy 3p electron"],
      ["N", "O", "O loses a paired 2p electron (extra repulsion)"],
      ["P", "S", "S loses a paired 3p electron (extra repulsion)"],
    ];
    if (Math.random() < 0.35) {
      const [hi, lo, why] = pick(special);
      return q({
        key: `tr-ie-x-${hi}`,
        prompt: `${lo} is to the right of ${hi}, but ${hi} has the higher first ionization energy. Why?`,
        speech: `${nameOf(lo)} is to the right of ${nameOf(hi)}, but ${nameOf(hi)} has the higher first ionization energy. Why?`,
        visual: tableVisual([hi, lo]),
        ...label(why, [
          `${hi} has more protons than ${lo}`,
          `${lo}'s electron is in a higher shell`,
          `${hi} is a metal, so it holds electrons tightly`,
        ]),
        hint: "Look at which subshell the removed electron comes from, and whether it is paired.",
        explain: `${hi}: ${IE1[hi]} kJ/mol; ${lo}: ${IE1[lo]} kJ/mol. ${why}.`,
      });
    }
    const pairs = (() => {
      for (;;) {
        const t = trendPair();
        const key = [t.a, t.b].sort().join("");
        if (["BBe", "AlMg", "NO", "PS", "AsSe", "CaGa"].includes(key)) continue;
        if (Math.abs(IE1[t.a] - IE1[t.b]) < 40) continue;
        return t;
      }
    })();
    const { a, b, same } = pairs;
    const hi = IE1[a] > IE1[b] ? a : b;
    const lo = hi === a ? b : a;
    return q({
      key: `tr-ie-${[a, b].sort().join("")}`,
      prompt: `Which has the higher first ionization energy, ${a} or ${b}? Why?`,
      speech: `Which has the higher first ionization energy, ${nameOf(a)} or ${nameOf(b)}? Why?`,
      visual: tableVisual([a, b]),
      ...label(
        same === "period" ? `${hi}: more protons pull the same shell` : `${hi}: its valence shell is closer in`,
        [
          same === "period" ? `${lo}: fewer electrons to remove` : `${lo}: it has more protons`,
          same === "period" ? `${lo}: its electrons are farther out` : `${hi}: fewer electrons repel`,
          `Equal: they're in the same ${same}`,
        ],
      ),
      hint: "Ionization energy is the energy to pull off the outermost electron. Stronger Coulombic attraction means a higher value.",
      explain: `${hi} (${IE1[hi]} kJ/mol) > ${lo} (${IE1[lo]} kJ/mol). ${same === "period" ? "Across a period the nuclear charge grows in the same shell." : "Up a group the valence shell is closer to the nucleus."}`,
    });
  },
  () =>
    again(() => {
      const src = Math.random() < 0.5 ? pick(PERIODS.slice(0, 2)) : pick(GROUPS.filter((g) => g[0] !== "Li"));
      const set = shuffle(src).slice(0, Math.min(4, src.length));
      const en = (s: string) => element(s)!.en!;
      const sorted = [...set].sort((x, y) => en(y) - en(x));
      if (en(sorted[0]) - en(sorted[1]) < 0.1) return null;
      return q({
        key: `tr-en-${[...set].sort().join("")}`,
        prompt: `Which element is the most electronegative: ${set.join(", ")}?`,
        speech: `Which element is the most electronegative?`,
        visual: tableVisual(set),
        ...label(sorted[0], sorted.slice(1)),
        hint: "Electronegativity increases across a period (more protons) and up a group (closer shell).",
        explain: `${sorted.map((s) => `${s} ${en(s).toFixed(2)}`).join(", ")}. ${sorted[0]} attracts shared electrons most strongly.`,
      });
    }),
  () => {
    const series = pick([
      ["N³⁻", "O²⁻", "F⁻", "Na⁺", "Mg²⁺", "Al³⁺"],
      ["P³⁻", "S²⁻", "Cl⁻", "K⁺", "Ca²⁺"],
    ]);
    const set = shuffle(series).slice(0, 4);
    const order = series.filter((s) => set.includes(s));
    const largest = Math.random() < 0.5;
    const ans = largest ? order[0] : order[order.length - 1];
    return q({
      key: `tr-iso-${largest}-${[...set].sort().join("")}`,
      prompt: `These ions all have the same number of electrons. Which is the ${largest ? "largest" : "smallest"}: ${set.join(", ")}?`,
      speech: `These ions all have the same number of electrons. Which is the ${largest ? "largest" : "smallest"}?`,
      ...label(ans, set.filter((s) => s !== ans)),
      hint: "Same electrons, different protons. More protons pull the same electron cloud in tighter.",
      explain: `In an isoelectronic series, size falls as nuclear charge rises: ${order.join(" > ")}.`,
    });
  },
  () => {
    const [atom, ion, bigger] = pick([
      ["Na", "Na⁺", "atom"], ["Mg", "Mg²⁺", "atom"], ["K", "K⁺", "atom"], ["Al", "Al³⁺", "atom"], ["Ca", "Ca²⁺", "atom"],
      ["Cl", "Cl⁻", "ion"], ["O", "O²⁻", "ion"], ["F", "F⁻", "ion"], ["S", "S²⁻", "ion"], ["N", "N³⁻", "ion"],
    ] as [string, string, string][]);
    const right = bigger === "atom" ? `${atom}: the ion lost its outer shell` : `${ion}: more electrons, same protons`;
    return q({
      key: `tr-ion-${atom}`,
      prompt: `Which is larger, ${atom} or ${ion}? Why?`,
      speech: `Which is larger, a ${nameOf(atom)} atom or the ${ion} ion? Why?`,
      ...label(right, [
        bigger === "atom" ? `${ion}: losing electrons spreads the cloud` : `${atom}: the ion lost a shell`,
        `Same size: same nucleus`,
        bigger === "atom" ? `${atom}: it has more protons` : `${ion}: it has more protons`,
      ]),
      hint: bigger === "atom" ? "Cations lose electrons, often a whole shell." : "Anions gain electrons but keep the same number of protons.",
      explain: bigger === "atom" ? `${atom} is larger. ${ion} has lost its outermost shell, so it is much smaller.` : `${ion} is larger. Adding electrons increases repulsion while the nuclear charge stays the same.`,
    });
  },
);

/** 1.7 Do it: put elements in order of a property. */
export function rankTrend(): Question {
  return again(() => {
    const prop = pick(["radius", "ie", "en"] as const);
    const src = Math.random() < 0.55 ? pick(PERIODS) : pick(GROUPS.filter((g) => g.length >= 3));
    const set = shuffle(src).slice(0, Math.min(src.length, rand(3, 4)));
    const val = (s: string) => (prop === "radius" ? RADIUS[s] : prop === "ie" ? IE1[s] : element(s)!.en!);
    if (prop === "ie") {
      const keys = new Set(set);
      if ((keys.has("Be") && keys.has("B")) || (keys.has("Mg") && keys.has("Al")) || (keys.has("N") && keys.has("O")) || (keys.has("P") && keys.has("S")) || (keys.has("As") && keys.has("Se")) || (keys.has("Ca") && keys.has("Ga"))) return null;
    }
    const sorted = [...set].sort((a, b) => val(a) - val(b));
    if (sorted.some((s, i) => i > 0 && Math.abs(val(s) - val(sorted[i - 1])) < (prop === "en" ? 0.08 : 15))) return null;
    const what = prop === "radius" ? "atomic radius" : prop === "ie" ? "first ionization energy" : "electronegativity";
    return q({
      key: `rank-${prop}-${set.join("")}`,
      prompt: `Do it: put these elements in order of increasing ${what}, smallest first.`,
      visual: tableVisual(set),
      ...act({ kind: "order", items: sorted, direction: `Smallest ${what} first` }, set.length),
      hint:
        prop === "radius"
          ? "Radius grows down a group (more shells) and shrinks across a period (more protons, same shell)."
          : `${what[0].toUpperCase()}${what.slice(1)} grows across a period and up a group, as Coulombic attraction gets stronger.`,
      explain: `${sorted.map((s) => `${s} (${prop === "en" ? val(s).toFixed(2) : val(s)})`).join(" < ")}.`,
    });
  });
}

/** Successive ionization energies (kJ/mol). */
const SUCCESSIVE: { el: string; ie: number[] }[] = [
  { el: "Li", ie: [520, 7298, 11815] },
  { el: "Be", ie: [899, 1757, 14849, 21007] },
  { el: "B", ie: [801, 2427, 3660, 25026] },
  { el: "Na", ie: [496, 4562, 6910, 9543] },
  { el: "Mg", ie: [738, 1451, 7733, 10543] },
  { el: "Al", ie: [578, 1817, 2745, 11577] },
  { el: "Si", ie: [786, 1577, 3232, 4356, 16091] },
  { el: "K", ie: [419, 3052, 4420, 5877] },
  { el: "Ca", ie: [590, 1145, 4912, 6491] },
  { el: "C", ie: [1086, 2353, 4621, 6223, 37831] },
];

const IE_NAMES = ["IE₁", "IE₂", "IE₃", "IE₄", "IE₅"];

function ieTable(ie: number[]): Visual {
  return table(IE_NAMES.slice(0, ie.length), [ie.map((x) => x.toLocaleString("en-US"))]);
}

/** 1.7/1.5: successive ionization energies. */
export const successiveIE = mix(
  () => {
    const s = pick(SUCCESSIVE);
    const v = valenceElectrons(s.el)!;
    return q({
      key: `sie-v-${s.el}`,
      prompt: "Here are the successive ionization energies (kJ/mol) of an element. How many valence electrons does it have?",
      visual: ieTable(s.ie),
      needsVisual: true,
      ...keypad(v),
      hint: "Look for the huge jump. Electrons before the jump are valence electrons; after it, they come from an inner shell.",
      explain: `The big jump is between ${IE_NAMES[v - 1]} and ${IE_NAMES[v]}, so there are ${v} valence electrons (it's ${nameOf(s.el)}).`,
    });
  },
  () => {
    const s = pick(SUCCESSIVE.filter((x) => ["Na", "Mg", "Al", "Si"].includes(x.el)));
    return q({
      key: `sie-id-${s.el}`,
      prompt: "A period-3 element has these successive ionization energies (kJ/mol). Which element is it?",
      visual: ieTable(s.ie),
      needsVisual: true,
      ...label(s.el, ["Na", "Mg", "Al", "Si", "P"].filter((x) => x !== s.el)),
      hint: "Count the ionization energies before the big jump: that's the group (1, 2, 13, 14…).",
      explain: `${valenceElectrons(s.el)} electrons come off before the jump, so it has ${valenceElectrons(s.el)} valence electrons: ${nameOf(s.el)}.`,
    });
  },
  () => {
    const s = pick(SUCCESSIVE.filter((x) => valenceElectrons(x.el)! <= 3));
    const v = valenceElectrons(s.el)!;
    const formula = ["XCl", "XCl₂", "XCl₃", "XCl₄"];
    return q({
      key: `sie-f-${s.el}`,
      prompt: "Element X has these successive ionization energies (kJ/mol). What is the most likely formula of its chloride?",
      visual: ieTable(s.ie),
      needsVisual: true,
      ...label(formula[v - 1], formula.filter((_, i) => i !== v - 1)),
      hint: "X loses electrons up to the big jump, so that number is its ion's charge. Each Cl⁻ balances one +.",
      explain: `The jump after ${IE_NAMES[v - 1]} means X forms X${v === 1 ? "" : SUPN(v)}⁺, so the chloride is ${formula[v - 1]}.`,
    });
  },
  () => {
    const s = pick(SUCCESSIVE);
    const v = valenceElectrons(s.el)!;
    const options = s.ie.slice(0, -1).map((_, i) => `Between ${IE_NAMES[i]} and ${IE_NAMES[i + 1]}`);
    return q({
      key: `sie-jump-${s.el}`,
      prompt: `For ${nameOf(s.el).toLowerCase()} (${electronConfig(element(s.el)!.z, true)}), between which two successive ionization energies is the largest jump?`,
      speech: `For ${nameOf(s.el)}, between which two successive ionization energies is the largest jump?`,
      ...fixedLabels(options, options[v - 1]),
      hint: "The jump comes when you start removing core electrons, after all the valence electrons are gone.",
      explain: `${nameOf(s.el)} has ${v} valence electron${v === 1 ? "" : "s"}, so ${IE_NAMES[v]} removes a core electron: ${s.ie[v - 1]} → ${s.ie[v]} kJ/mol.`,
    });
  },
  () => {
    const s = pick(SUCCESSIVE);
    const v = valenceElectrons(s.el)!;
    return q({
      key: `sie-why-${s.el}`,
      prompt: `For ${s.el}, ${IE_NAMES[v]} (${s.ie[v].toLocaleString("en-US")} kJ/mol) is much larger than ${IE_NAMES[v - 1]} (${s.ie[v - 1]} kJ/mol). Why?`,
      speech: `For ${nameOf(s.el)}, ionization energy ${v + 1} is much larger than ionization energy ${v}. Why?`,
      ...label("It comes from an inner shell, closer to the nucleus", [
        "That electron is removed from a neutral atom",
        "The nucleus gains a proton after each ionization",
        "Electrons in the same subshell repel each other more",
      ]),
      hint: "Think about which shell each electron is in.",
      explain: `After ${v} electron${v === 1 ? "" : "s"} the valence shell is empty, so the next electron comes from the core, which feels a much larger effective nuclear charge.`,
    });
  },
);

const METALS = ["Li", "Na", "K", "Mg", "Ca", "Ba", "Al", "Sr"];
const NONMETALS = ["N", "O", "S", "F", "Cl", "Br", "I"];
const POLY: { f: string; c: number; name: string }[] = [
  { f: "NO₃", c: -1, name: "nitrate" },
  { f: "SO₄", c: -2, name: "sulfate" },
  { f: "CO₃", c: -2, name: "carbonate" },
  { f: "PO₄", c: -3, name: "phosphate" },
  { f: "OH", c: -1, name: "hydroxide" },
];

const subNum = (n: number) => (n === 1 ? "" : [...String(n)].map((d) => "₀₁₂₃₄₅₆₇₈₉"[+d]).join(""));

/** Ionic formula from a cation (charge +a) and an anion (charge −b). */
function ionicFormula(cat: string, a: number, an: string, b: number, poly = false): string {
  const g = gcd(a, b);
  const nc = b / g;
  const na = a / g;
  const anion = poly && na > 1 ? `(${an})${subNum(na)}` : `${an}${subNum(na)}`;
  return `${cat}${subNum(nc)}${anion}`;
}

/** 1.8: valence electrons and ionic compounds. */
export const ionicCompounds = mix(
  () => {
    const m = pick(METALS);
    const n = pick(NONMETALS);
    const a = element(m)!.ions[0];
    const b = -element(n)!.ions[0];
    const f = ionicFormula(m, a, n, b);
    const wrong = [`${m}${n}`, `${m}${subNum(a)}${n}${subNum(b)}`, ionicFormula(m, b, n, a), `${m}₂${n}`, `${m}${n}₂`].filter((w) => w !== f);
    return q({
      key: `ion-bin-${m}-${n}`,
      prompt: `What is the formula of the ionic compound formed by ${nameOf(m).toLowerCase()} and ${nameOf(n).toLowerCase()}?`,
      speech: `What is the formula of the ionic compound formed by ${nameOf(m)} and ${nameOf(n)}?`,
      ...label(f, wrong),
      hint: `${m} loses ${a} electron${a === 1 ? "" : "s"} (${m}${a === 1 ? "" : SUPN(a)}⁺) and ${n} gains ${b} (${n}${b === 1 ? "" : SUPN(b)}⁻). Make the total charge zero.`,
      explain: `${m}${a === 1 ? "" : SUPN(a)}⁺ and ${n}${b === 1 ? "" : SUPN(b)}⁻ combine as ${f}, which is neutral.`,
    });
  },
  () => {
    const cat = pick([...METALS.map((m) => ({ f: m, c: element(m)!.ions[0] })), { f: "NH₄", c: 1 }]);
    const an = pick(POLY.filter((x) => cat.f !== "NH₄" || x.f !== "OH"));
    const b = -an.c;
    const g = gcd(cat.c, b);
    const nc = b / g;
    const catText = cat.f === "NH₄" && nc > 1 ? `(NH₄)${subNum(nc)}` : `${cat.f}${subNum(nc)}`;
    const f = `${catText}${an.f.length > 1 && cat.c / g > 1 ? `(${an.f})${subNum(cat.c / g)}` : `${an.f}${subNum(cat.c / g)}`}`;
    const wrong = [`${cat.f}${an.f}`, `${cat.f}${subNum(cat.c)}${an.f}${subNum(b)}`, `${cat.f}${an.f}${subNum(cat.c)}`, `${cat.f}${subNum(b)}${an.f}`, `${cat.f}(${an.f})₂`, `${cat.f}₂${an.f}`, `${cat.f}(${an.f})₃`].filter((w) => w !== f);
    return q({
      key: `ion-poly-${cat.f}-${an.f}`,
      prompt: `What is the formula of the compound of ${cat.f}${cat.c === 1 ? "" : SUPN(cat.c)}⁺ and the ${an.name} ion, ${an.f}${b === 1 ? "" : SUPN(b)}⁻?`,
      ...label(f, wrong),
      hint: "Balance the charges. Put brackets around a polyatomic ion when you need more than one.",
      explain: `${nc} × (+${cat.c}) and ${cat.c / g} × (−${b}) cancel, so the formula is ${f}.`,
    });
  },
  () => {
    const el = pick(["Li", "Na", "K", "Mg", "Ca", "Al", "N", "O", "S", "F", "Cl", "Br", "P", "Se", "I", "Ba", "Sr", "Rb"]);
    const z = element(el)!.z;
    const v = valenceElectrons(el)!;
    const charge = v <= 3 ? v : v - 8;
    return q({
      key: `ion-chg-${el}`,
      prompt: `The Lewis symbol for ${nameOf(el).toLowerCase()} is shown. What charge does its most common ion have?`,
      speech: `The Lewis symbol for ${nameOf(el)} is shown. What charge does its most common ion have?`,
      visual: { kind: "chem-atom", protons: z, neutrons: neutrons(z), electrons: z, style: "lewis" },
      ...signed(charge),
      hint: "Main-group atoms gain or lose electrons to reach a noble-gas configuration (8 valence electrons, or none).",
      explain: charge > 0 ? `${el} loses its ${v} valence electron${v === 1 ? "" : "s"}, giving ${signText(charge)}.` : `${el} gains ${-charge} electron${charge === -1 ? "" : "s"} to complete its octet, giving ${signText(charge)}.`,
    });
  },
  () => {
    const [sym, c] = pick(IONS);
    const z = element(sym)!.z;
    return q({
      key: `ion-e-${sym}-${c}`,
      prompt: `How many electrons does one ${ionName(sym, c)} ion have?`,
      ...keypad(z - c),
      hint: "Start with the atomic number (protons). A positive charge means electrons were lost; negative means gained.",
      explain: `${sym} has ${z} protons; a charge of ${signText(c)} means ${z} − (${signText(c)}) = ${z - c} electrons.`,
    });
  },
  () => {
    const g = pick([1, 2, 13, 16, 17]);
    const forms: Record<number, string> = { 1: "X₂O", 2: "XO", 13: "X₂O₃" };
    const opts: Record<number, string[]> = { 1: ["Na", "K", "Li"], 2: ["Mg", "Ca", "Ba"], 13: ["Al", "Ga"], 16: ["Mg", "Ca"], 17: ["Na", "K"] };
    const metal = pick(opts[g]);
    const real = g === 16 ? "XS" : g === 17 ? "XCl" : forms[g];
    const groupAns = g === 16 || g === 17 ? (element(metal)!.group as number) : g;
    const all = ["Group 1", "Group 2", "Group 13", "Group 14", "Group 15"];
    return q({
      key: `ion-grp-${real}-${metal}`,
      prompt: `A metal X forms an ionic compound with formula ${real}. Which group is X most likely in?`,
      ...fixedLabels(all, `Group ${groupAns}`),
      hint: `Work out the charge on X from the anion: O²⁻ and S²⁻ are 2−, Cl⁻ is 1−.`,
      explain: `In ${real}, X must be ${signText(groupAns > 12 ? groupAns - 10 : groupAns)}, which fits Group ${groupAns} (for example ${metal}).`,
    });
  },
);

/* ================================================= Unit 2: compound structure */

const BOND_TYPES = ["Nonpolar covalent", "Polar covalent", "Ionic"];

/** Bonds with a clear type: [atom A, atom B, type index]. */
const BONDS: [string, string, number][] = [
  ["H", "H", 0], ["C", "H", 0], ["Cl", "Cl", 0], ["N", "Cl", 0], ["C", "S", 0], ["P", "H", 0], ["Br", "Br", 0], ["O", "O", 0], ["C", "C", 0], ["I", "I", 0],
  ["H", "Cl", 1], ["O", "H", 1], ["N", "H", 1], ["C", "O", 1], ["C", "Cl", 1], ["C", "F", 1], ["S", "O", 1], ["P", "Cl", 1], ["H", "Br", 1], ["C", "N", 1], ["N", "O", 1], ["S", "Cl", 1],
  ["Na", "Cl", 2], ["K", "F", 2], ["Mg", "O", 2], ["Ca", "O", 2], ["Li", "F", 2], ["K", "Br", 2], ["Ba", "O", 2], ["Na", "F", 2], ["Cs", "Cl", 2], ["Ca", "F", 2],
];

const en = (s: string) => element(s)!.en!;
const dEN = (a: string, b: string) => Math.abs(en(a) - en(b));

/** 2.1: bond types and polarity. */
export const bondTypes = mix(
  () => {
    const [a, b, t] = pick(BONDS);
    return q({
      key: `bt-type-${a}-${b}`,
      prompt: `What type of bond forms between ${a} and ${b}? (Electronegativity: ${a} ${en(a).toFixed(2)}, ${b} ${en(b).toFixed(2)})`,
      speech: `What type of bond forms between ${nameOf(a)} and ${nameOf(b)}?`,
      ...fixedLabels(BOND_TYPES, BOND_TYPES[t]),
      hint: "A metal with a nonmetal transfers electrons (ionic). Two nonmetals share: equally if their electronegativities are close, unequally if not.",
      explain: `ΔEN = ${dEN(a, b).toFixed(2)}. ${t === 2 ? `${a} is a metal and ${b} a nonmetal, so electrons transfer: ionic.` : t === 1 ? "Two nonmetals sharing unequally: polar covalent." : "Two nonmetals sharing almost equally: nonpolar covalent."}`,
    });
  },
  () =>
    again(() => {
      const set = shuffle(BONDS.filter((x) => x[2] < 2 && x[0] !== x[1])).slice(0, 4);
      const sorted = [...set].sort((x, y) => dEN(y[0], y[1]) - dEN(x[0], x[1]));
      if (dEN(sorted[0][0], sorted[0][1]) - dEN(sorted[1][0], sorted[1][1]) < 0.15) return null;
      const lab = (x: [string, string, number]) => `${x[0]}–${x[1]}`;
      return q({
        key: `bt-most-${set.map(lab).sort().join("")}`,
        prompt: `Which bond is the most polar: ${set.map(lab).join(", ")}?`,
        speech: "Which of these bonds is the most polar?",
        visual: { kind: "chem-table", mainOnly: true, periods: [1, 4], colourBy: "none", trends: [{ dir: "right", label: "Electronegativity increases" }, { dir: "up", label: "Electronegativity increases" }] },
        ...label(lab(sorted[0]), sorted.slice(1).map(lab)),
        hint: "The bigger the electronegativity difference, the more polar the bond.",
        explain: sorted.map((x) => `${lab(x)}: ΔEN ${dEN(x[0], x[1]).toFixed(2)}`).join("; ") + ".",
      });
    }),
  () => {
    const [a, b] = pick(BONDS.filter((x) => x[2] === 1));
    const neg = en(a) > en(b) ? a : b;
    const pos = neg === a ? b : a;
    return q({
      key: `bt-delta-${a}-${b}`,
      prompt: `In a ${a}–${b} bond, which atom carries the partial negative charge (δ−)?`,
      speech: `In a bond between ${nameOf(a)} and ${nameOf(b)}, which atom carries the partial negative charge?`,
      ...label(`${neg}, because it is more electronegative`, [`${pos}, because it is more electronegative`, `${pos}, because it is larger`, "Neither: the electrons are shared equally"]),
      hint: "Shared electrons spend more time near the more electronegative atom.",
      explain: `${neg} (${en(neg).toFixed(2)}) pulls the shared pair harder than ${pos} (${en(pos).toFixed(2)}), so ${neg} is δ− and ${pos} is δ+.`,
    });
  },
  () => {
    const [sub, ans, wrong] = pick([
      ["Cu(s)", "Metallic: cations in a sea of delocalized electrons", "Ionic: Cu⁺ and Cu⁻ ions"],
      ["Fe(s)", "Metallic: cations in a sea of delocalized electrons", "Covalent network: shared pairs between neighbours"],
      ["Al(s)", "Metallic: cations in a sea of delocalized electrons", "Nonpolar covalent: Al–Al shared pairs"],
      ["NaCl(s)", "Ionic: Na⁺ and Cl⁻ held by Coulombic attraction", "Metallic: cations in a sea of delocalized electrons"],
      ["CH₄(g)", "Covalent: shared electron pairs within each molecule", "Ionic: C⁴⁺ and H⁻ ions"],
      ["MgO(s)", "Ionic: Mg²⁺ and O²⁻ held by Coulombic attraction", "Covalent: shared electron pairs within each molecule"],
    ]);
    return q({
      key: `bt-model-${sub}`,
      prompt: `Which model best describes the bonding in ${sub}?`,
      ...label(ans, [wrong, "Hydrogen bonds between neighbouring atoms", "London dispersion forces only"]),
      hint: "Metal only → metallic. Metal + nonmetal → ionic. Nonmetals only → covalent.",
      explain: `${sub}: ${ans}.`,
    });
  },
);

/** 2.1 Do it: sort bonds by type. */
export function sortBonds(): Question {
  const pickN = (t: number, n: number) => shuffle(BONDS.filter((x) => x[2] === t)).slice(0, n);
  const chosen = [...pickN(0, rand(2, 3)), ...pickN(1, rand(2, 3)), ...pickN(2, rand(2, 3))];
  const items = chosen.map(([a, b, t]) => ({ label: `${a}–${b} (${en(a).toFixed(1)}, ${en(b).toFixed(1)})`, bin: t }));
  return q({
    key: `sortb-${chosen.map(([a, b]) => a + b).sort().join("")}`,
    prompt: "Do it: sort each bond by type. The numbers are the two atoms' electronegativities.",
    ...act({ kind: "sort", bins: BOND_TYPES, items }, items.length),
    hint: "Metal + nonmetal: ionic. Nonmetals with ΔEN below about 0.4: nonpolar covalent. Otherwise polar covalent.",
    explain: chosen.map(([a, b, t]) => `${a}–${b}: ${BOND_TYPES[t].toLowerCase()}`).join("; ") + ".",
  });
}

/** Bond length (pm) and bond energy (kJ/mol). */
const BOND_DATA: { f: string; r: number; D: number }[] = [
  { f: "H₂", r: 74, D: 436 },
  { f: "HF", r: 92, D: 567 },
  { f: "HCl", r: 127, D: 431 },
  { f: "HBr", r: 141, D: 366 },
  { f: "HI", r: 161, D: 298 },
  { f: "Cl₂", r: 199, D: 243 },
  { f: "Br₂", r: 228, D: 193 },
  { f: "I₂", r: 267, D: 151 },
  { f: "N₂", r: 110, D: 945 },
  { f: "O₂", r: 121, D: 498 },
];

const morse = (r0: number, D: number) => (r: number) => D * ((1 - Math.exp(-0.022 * (r - r0))) ** 2 - 1);

function peVisual(items: { f: string; r: number; D: number }[], labels: string[] = []): Visual {
  const deepest = Math.max(...items.map((b) => b.D));
  const lo = -Math.ceil((deepest + 80) / 100) * 100;
  return {
    kind: "plot",
    x: [0, 400],
    y: [lo, Math.round(-lo * 0.5)],
    xLabel: "distance between nuclei (pm)",
    yLabel: "potential energy (kJ/mol)",
    curves: items.map((b, i) => ({ fn: morse(b.r, b.D), label: labels[i], colour: (["wave", "berry"] as const)[i % 2] })),
  };
}

/** 2.2: potential energy and bond length. */
export const bondEnergy = mix(
  () => {
    const b = pick(BOND_DATA);
    return q({
      key: `pe-r-${b.f}`,
      prompt: `This is the potential energy curve for ${b.f}. What is the bond length?`,
      visual: peVisual([b]),
      needsVisual: true,
      ...choose(b.r, [b.r + 70, b.r + 150, Math.max(20, b.r - 50)], 60, 10),
      unit: "pm",
      hint: "The bond length is the distance at the bottom of the well, where the energy is lowest.",
      explain: `The minimum is at about ${b.r} pm: there attraction and repulsion balance.`,
    });
  },
  () => {
    const b = pick(BOND_DATA);
    return q({
      key: `pe-D-${b.f}`,
      prompt: `From this potential energy curve for ${b.f}, how much energy is needed to break one mole of bonds?`,
      visual: peVisual([b]),
      needsVisual: true,
      ...choose(b.D, [b.D + 150, Math.max(50, b.D - 150), b.D * 2, Math.round(b.D / 2)], 100, 10),
      unit: "kJ/mol",
      hint: "Breaking the bond takes the atoms from the bottom of the well up to zero energy (far apart).",
      explain: `The well is about ${b.D} kJ/mol deep, so the bond energy is ${b.D} kJ/mol.`,
    });
  },
  () => {
    const [x, y] = pick([["HF", "HCl"], ["HCl", "HBr"], ["HBr", "HI"], ["Cl₂", "Br₂"], ["Br₂", "I₂"], ["N₂", "O₂"], ["HCl", "HI"], ["Cl₂", "I₂"]]);
    const bx = BOND_DATA.find((b) => b.f === x)!;
    const by = BOND_DATA.find((b) => b.f === y)!;
    const flip = Math.random() < 0.5;
    const curves = flip ? [by, bx] : [bx, by];
    const askY = Math.random() < 0.5;
    const target = askY ? y : x;
    const idx = curves.findIndex((b) => b.f === target);
    const why = x === "N₂" ? (askY ? "it has a lower bond order (double bond), so it is longer and weaker" : "its triple bond is shorter and stronger") : askY ? "its atoms are larger, so the bond is longer and weaker" : "its atoms are smaller, so the bond is shorter and stronger";
    return q({
      key: `pe-which-${x}-${y}-${flip}-${askY}`,
      prompt: `Curves A and B are the potential energy curves of ${x} and ${y}. Which curve is ${target}?`,
      visual: peVisual(curves, ["A", "B"]),
      needsVisual: true,
      ...fixedLabels([`Curve A`, `Curve B`], `Curve ${"AB"[idx]}`),
      hint: "Larger atoms make longer bonds (minimum farther right). Shorter bonds are usually stronger (deeper well).",
      explain: `${target} is curve ${"AB"[idx]}: ${why}.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["At distances shorter than the bond length, the energy rises steeply. Why?", "The two nuclei (and the inner electrons) repel each other", ["The bond breaks", "The atoms gain kinetic energy", "London forces get weaker"]],
      ["Why is the energy zero at very large distances?", "The atoms are too far apart to attract or repel each other", ["The bond is at its strongest", "The electrons have left the atoms", "The nuclei repel as much as they attract"]],
      ["What happens to the energy as two H atoms move from far apart toward 74 pm?", "It falls: each nucleus attracts the other's electron", ["It increases, because the nuclei repel", "It stays at zero until the bond forms", "It increases, because energy is needed to make a bond"]],
      ["Which bond is shortest: C–C, C=C or C≡C?", "C≡C, because more shared pairs pull the nuclei closer", ["C–C, because single bonds are strongest", "C=C, because double bonds are in between", "They are all the same length"]],
      ["Which has the greatest bond energy: C–C (154 pm), C=C (134 pm) or C≡C (120 pm)?", "C≡C", ["C–C", "C=C", "They are equal"]],
    ] as [string, string, string[]][]);
    return q({
      key: `pe-why-${ask.slice(0, 18)}`,
      prompt: ask,
      visual: ask.startsWith("Which") ? NONE : peVisual([BOND_DATA[0]]),
      ...label(ans, wrongs),
      hint: "Energy falls as attractions grow, and rises sharply when nuclei get too close.",
      explain: `${ans}.`,
    });
  },
);

const ION_R: Record<string, [number, number]> = {
  "Li⁺": [1, 76], "Na⁺": [1, 102], "K⁺": [1, 138], "Rb⁺": [1, 152], "Mg²⁺": [2, 72], "Ca²⁺": [2, 100], "Sr²⁺": [2, 118], "Ba²⁺": [2, 135], "Al³⁺": [3, 54],
  "F⁻": [1, 133], "Cl⁻": [1, 181], "Br⁻": [1, 196], "I⁻": [1, 220], "O²⁻": [2, 140], "S²⁻": [2, 184],
};
const SALTS: [string, string, string][] = [
  ["LiF", "Li⁺", "F⁻"], ["NaF", "Na⁺", "F⁻"], ["NaCl", "Na⁺", "Cl⁻"], ["NaBr", "Na⁺", "Br⁻"], ["NaI", "Na⁺", "I⁻"], ["KCl", "K⁺", "Cl⁻"], ["KBr", "K⁺", "Br⁻"], ["RbI", "Rb⁺", "I⁻"],
  ["MgO", "Mg²⁺", "O²⁻"], ["CaO", "Ca²⁺", "O²⁻"], ["SrO", "Sr²⁺", "O²⁻"], ["BaO", "Ba²⁺", "O²⁻"], ["MgS", "Mg²⁺", "S²⁻"], ["CaS", "Ca²⁺", "S²⁻"], ["KF", "K⁺", "F⁻"],
];
const coulomb = (s: [string, string, string]) => (ION_R[s[1]][0] * ION_R[s[2]][0]) / (ION_R[s[1]][1] + ION_R[s[2]][1]);

/** 2.3: structure and properties of ionic solids. */
export const ionicSolids = mix(
  () =>
    again(() => {
      const set = shuffle(SALTS).slice(0, rand(3, 4));
      const sorted = [...set].sort((a, b) => coulomb(b) - coulomb(a));
      if (coulomb(sorted[0]) < coulomb(sorted[1]) * 1.06) return null;
      const highMp = Math.random() < 0.5;
      return q({
        key: `is-le-${highMp}-${set.map((s) => s[0]).sort().join("")}`,
        prompt: `Which compound has the ${highMp ? "highest melting point" : "strongest Coulombic attraction between its ions"}: ${set.map((s) => s[0]).join(", ")}?`,
        ...label(sorted[0][0], sorted.slice(1).map((s) => s[0])),
        hint: "Coulomb's law: attraction ∝ (charge × charge) ÷ distance. Bigger charges matter most; then smaller ions.",
        explain: sorted.map((s) => `${s[0]}: ${s[1]} and ${s[2]}, q₁q₂ = ${ION_R[s[1]][0] * ION_R[s[2]][0]}, r = ${ION_R[s[1]][1] + ION_R[s[2]][1]} pm`).join("; ") + `. ${sorted[0][0]} has the strongest attraction.`,
      });
    }),
  () => {
    const [a, b, why, wrongs] = pick([
      ["MgO (2852 °C)", "NaF (993 °C)", "Mg²⁺ and O²⁻ have double the charges", ["MgO has covalent bonds", "MgO has stronger London forces", "Mg²⁺ and O²⁻ are larger ions"]],
      ["NaF (993 °C)", "NaI (661 °C)", "F⁻ is smaller, so the ions are closer together", ["I⁻ has a larger charge", "NaF has hydrogen bonds", "NaI has more electrons, so stronger London forces"]],
      ["CaO (2613 °C)", "KCl (770 °C)", "Ca²⁺ and O²⁻ have larger charges", ["CaO is a metal", "KCl has larger charges", "CaO molecules are heavier"]],
    ] as [string, string, string, string[]][]);
    return q({
      key: `is-why-${a}`,
      prompt: `${a} melts at a much higher temperature than ${b}. Which is the best explanation?`,
      ...label(why, wrongs),
      hint: "Melting an ionic solid means overcoming the attraction between ions. Use Coulomb's law.",
      explain: `${why}.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Why does solid NaCl not conduct electricity, while molten NaCl does?", "Ions are fixed in the solid but mobile when melted", ["The solid has no ions", "Melting releases free electrons", "Molten NaCl becomes metallic"]],
      ["Why are ionic crystals brittle?", "A shifted layer puts like charges side by side", ["The bonds between molecules are weak", "There are no electrons between the ions", "The ions are too small to slide"]],
      ["Why does an aqueous solution of KBr conduct electricity?", "Dissolved K⁺ and Br⁻ ions are free to move", ["Water molecules carry the current", "KBr releases free electrons", "KBr molecules are polar"]],
      ["In solid NaCl, what surrounds each Na⁺ ion?", "Six Cl⁻ ions, arranged so opposite charges are closest", ["Six other Na⁺ ions", "A sea of delocalized electrons", "Two Cl⁻ ions in a molecule"]],
    ] as [string, string, string[]][]);
    return q({
      key: `is-prop-${ask.slice(0, 20)}`,
      prompt: ask,
      visual: { kind: "chem-particles", panels: [{ species: [{ formula: "Na⁺", count: 8 }, { formula: "Cl⁻", count: 8 }], arrangement: "solid", label: "NaCl(s)" }] },
      ...label(ans, wrongs),
      hint: "An ionic solid is a lattice of cations and anions held by Coulombic attraction.",
      explain: `${ans}.`,
    });
  },
  () => {
    const [cat, an, nc, na] = pick([["Na⁺", "Cl⁻", 1, 1], ["K⁺", "Br⁻", 1, 1], ["Ca²⁺", "Cl⁻", 1, 2], ["Mg²⁺", "Cl⁻", 1, 2], ["Li⁺", "F⁻", 1, 1]] as [string, string, number, number][]);
    const k = nc === 1 && na === 2 ? 4 : 6;
    const state = rand(0, 2);
    const names = ["Solid (crystal lattice)", "Molten (liquid)", "Aqueous solution"];
    const panel =
      state === 0
        ? { species: [{ formula: cat, count: k * nc }, { formula: an, count: k * na }], arrangement: "solid" as const }
        : state === 1
          ? { species: [{ formula: cat, count: k * nc }, { formula: an, count: k * na }], arrangement: "liquid" as const, motion: 2 as const }
          : { species: [{ formula: cat, count: Math.ceil(k / 2) * nc }, { formula: an, count: Math.ceil(k / 2) * na }, { formula: "H₂O", count: 10 }], arrangement: "liquid" as const, motion: 1 as const };
    return q({
      key: `is-pic-${cat}-${an}-${state}`,
      prompt: "Which best describes the sample in this particle diagram?",
      visual: { kind: "chem-particles", panels: [panel] },
      needsVisual: true,
      ...fixedLabels(names, names[state]),
      hint: "Solid: ions in a tidy lattice. Molten: ions close but jumbled. Aqueous: ions spread out among water molecules.",
      explain: `The picture shows ${names[state].toLowerCase()}.`,
    });
  },
);

/** Alloys: host, added element, radii (pm), type 0 interstitial / 1 substitutional. */
const ALLOYS: { name: string; host: string; add: string; rh: number; ra: number; type: number }[] = [
  { name: "steel", host: "Fe", add: "C", rh: 126, ra: 77, type: 0 },
  { name: "brass", host: "Cu", add: "Zn", rh: 128, ra: 134, type: 1 },
  { name: "bronze", host: "Cu", add: "Sn", rh: 128, ra: 140, type: 1 },
  { name: "sterling silver", host: "Ag", add: "Cu", rh: 144, ra: 128, type: 1 },
  { name: "white gold", host: "Au", add: "Ni", rh: 144, ra: 124, type: 1 },
  { name: "nitrided steel", host: "Fe", add: "N", rh: 126, ra: 75, type: 0 },
  { name: "stainless steel", host: "Fe", add: "Cr", rh: 126, ra: 128, type: 1 },
  { name: "nichrome", host: "Ni", add: "Cr", rh: 124, ra: 128, type: 1 },
  { name: "palladium hydride", host: "Pd", add: "H", rh: 137, ra: 37, type: 0 },
  { name: "titanium carbide steel", host: "Ti", add: "C", rh: 147, ra: 77, type: 0 },
];

/** 2.4: metals and alloys. */
export const metalsAlloys = mix(
  () => {
    const a = pick(ALLOYS);
    const t = ["Interstitial alloy", "Substitutional alloy"];
    return q({
      key: `al-type-${a.name}`,
      prompt: `${a.name[0].toUpperCase()}${a.name.slice(1)} is ${a.host} (radius ${a.rh} pm) with some ${a.add} (radius ${a.ra} pm) mixed in. What kind of alloy is it?`,
      speech: `${a.name[0].toUpperCase()}${a.name.slice(1)} is ${nameOf(a.host)}, radius ${a.rh} picometers, with some ${nameOf(a.add)}, radius ${a.ra} picometers. What kind of alloy is it?`,
      visual: { kind: "chem-particles", panels: [{ species: [{ formula: a.host, count: 12 }, { formula: a.add, count: 3 }], arrangement: "solid", label: a.name }] },
      ...fixedLabels(t, t[a.type]),
      hint: "Similar-sized atoms swap places in the lattice (substitutional). Much smaller atoms fit in the gaps between (interstitial).",
      explain: a.type === 0 ? `${a.add} atoms are much smaller, so they sit in the holes of the ${a.host} lattice: interstitial.` : `${a.add} and ${a.host} are similar in size, so ${a.add} replaces some ${a.host} atoms: substitutional.`,
    });
  },
  () => {
    const inter = Math.random() < 0.5;
    const right = pick(ALLOYS.filter((a) => a.type === (inter ? 0 : 1)));
    const wrong = shuffle(ALLOYS.filter((a) => a.type !== (inter ? 0 : 1))).slice(0, 3);
    const txt = (a: (typeof ALLOYS)[number]) => `${a.name} (${a.host} ${a.rh} pm + ${a.add} ${a.ra} pm)`;
    return q({
      key: `al-which-${inter}-${right.name}-${wrong.map((w) => w.name).sort().join("")}`,
      prompt: `Which of these is ${inter ? "an interstitial" : "a substitutional"} alloy?`,
      ...label(txt(right), wrong.map(txt)),
      hint: "Compare the atomic radii. A much smaller added atom fits into the holes (interstitial); a similar-sized one swaps in (substitutional).",
      explain: `${right.name}: ${right.add} (${right.ra} pm) is ${inter ? "much smaller than" : "close in size to"} ${right.host} (${right.rh} pm).`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Adding a little carbon to iron makes steel harder and less malleable. Why?", "C atoms in the gaps stop layers sliding", ["Carbon forms ionic bonds with iron", "Carbon removes the sea of electrons", "Carbon atoms are larger and push the layers apart"]],
      ["Why are metals malleable?", "Cation layers slide but the electron sea holds them", ["Metal atoms are joined by weak covalent bonds", "Metals contain ions of opposite charge", "Metals have hydrogen bonds between atoms"]],
      ["Why do metals conduct electricity in the solid state?", "Their valence electrons are delocalized and free to move", ["Their cations move through the lattice", "They contain dissolved ions", "Their atoms share electron pairs in fixed bonds"]],
      ["Which metal has the higher melting point, Na or Mg?", "Mg: 2 electrons per atom in the sea", ["Na: it is a larger atom", "Na: it has fewer electrons to repel", "They melt at the same temperature"]],
      ["Brass (Cu with Zn) is a substitutional alloy. How does its density compare with copper's?", "Close to copper's: Zn atoms are similar to Cu", ["Much greater, because Zn fills the gaps", "Much lower, because the lattice expands a lot", "Exactly double, because there are two metals"]],
    ] as [string, string, string[]][]);
    return q({
      key: `al-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Picture metal cations in a sea of delocalized valence electrons.",
      explain: `${ans}.`,
    });
  },
);

/** Molecules and ions for Lewis, VSEPR and polarity questions. */
interface Shape {
  f: string;
  center: string;
  outer: string;
  bonds: number;
  lone: number;
  polar?: boolean;
  expanded?: boolean;
}
const SHAPES: Shape[] = [
  { f: "CH₄", center: "C", outer: "H", bonds: 4, lone: 0, polar: false },
  { f: "NH₃", center: "N", outer: "H", bonds: 3, lone: 1, polar: true },
  { f: "H₂O", center: "O", outer: "H", bonds: 2, lone: 2, polar: true },
  { f: "CO₂", center: "C", outer: "O", bonds: 2, lone: 0, polar: false },
  { f: "SO₂", center: "S", outer: "O", bonds: 2, lone: 1, polar: true },
  { f: "SF₄", center: "S", outer: "F", bonds: 4, lone: 1, polar: true, expanded: true },
  { f: "XeF₄", center: "Xe", outer: "F", bonds: 4, lone: 2, polar: false, expanded: true },
  { f: "ClF₃", center: "Cl", outer: "F", bonds: 3, lone: 2, polar: true, expanded: true },
  { f: "I₃⁻", center: "I", outer: "I", bonds: 2, lone: 3, expanded: true },
  { f: "XeF₂", center: "Xe", outer: "F", bonds: 2, lone: 3, polar: false, expanded: true },
  { f: "PCl₅", center: "P", outer: "Cl", bonds: 5, lone: 0, polar: false, expanded: true },
  { f: "SF₆", center: "S", outer: "F", bonds: 6, lone: 0, polar: false, expanded: true },
  { f: "BF₃", center: "B", outer: "F", bonds: 3, lone: 0, polar: false },
  { f: "SO₃", center: "S", outer: "O", bonds: 3, lone: 0, polar: false },
  { f: "PCl₃", center: "P", outer: "Cl", bonds: 3, lone: 1, polar: true },
  { f: "H₂S", center: "S", outer: "H", bonds: 2, lone: 2, polar: true },
  { f: "BrF₅", center: "Br", outer: "F", bonds: 5, lone: 1, polar: true, expanded: true },
  { f: "CS₂", center: "C", outer: "S", bonds: 2, lone: 0, polar: false },
  { f: "OF₂", center: "O", outer: "F", bonds: 2, lone: 2, polar: true },
  { f: "NF₃", center: "N", outer: "F", bonds: 3, lone: 1, polar: true },
  { f: "SiCl₄", center: "Si", outer: "Cl", bonds: 4, lone: 0, polar: false },
  { f: "IF₅", center: "I", outer: "F", bonds: 5, lone: 1, polar: true, expanded: true },
  { f: "BeCl₂", center: "Be", outer: "Cl", bonds: 2, lone: 0, polar: false },
  { f: "CCl₄", center: "C", outer: "Cl", bonds: 4, lone: 0, polar: false },
  { f: "PH₃", center: "P", outer: "H", bonds: 3, lone: 1, polar: true },
  { f: "NO₃⁻", center: "N", outer: "O", bonds: 3, lone: 0 },
  { f: "CO₃²⁻", center: "C", outer: "O", bonds: 3, lone: 0 },
  { f: "NH₄⁺", center: "N", outer: "H", bonds: 4, lone: 0 },
  { f: "H₃O⁺", center: "O", outer: "H", bonds: 3, lone: 1 },
  { f: "SO₄²⁻", center: "S", outer: "O", bonds: 4, lone: 0 },
  { f: "ClO₃⁻", center: "Cl", outer: "O", bonds: 3, lone: 1 },
  { f: "ICl₄⁻", center: "I", outer: "Cl", bonds: 4, lone: 2, expanded: true },
  { f: "NO₂⁻", center: "N", outer: "O", bonds: 2, lone: 1 },
  { f: "AsF₅", center: "As", outer: "F", bonds: 5, lone: 0, polar: false, expanded: true },
  { f: "SeF₄", center: "Se", outer: "F", bonds: 4, lone: 1, polar: true, expanded: true },
];

const GEOMETRY: Record<string, string> = {
  "2,0": "linear", "3,0": "trigonal planar", "2,1": "bent", "4,0": "tetrahedral", "3,1": "trigonal pyramidal", "2,2": "bent",
  "5,0": "trigonal bipyramidal", "4,1": "seesaw", "3,2": "T-shaped", "2,3": "linear", "6,0": "octahedral", "5,1": "square pyramidal", "4,2": "square planar",
};
const DOMAIN_GEOM: Record<number, string> = { 2: "linear", 3: "trigonal planar", 4: "tetrahedral", 5: "trigonal bipyramidal", 6: "octahedral" };
const ANGLE: Record<string, string> = {
  "2,0": "180°", "3,0": "120°", "2,1": "slightly less than 120°", "4,0": "109.5°", "3,1": "slightly less than 109.5° (about 107°)", "2,2": "about 104.5°",
  "5,0": "90° and 120°", "4,1": "about 90° and 120°", "3,2": "about 90°", "2,3": "180°", "6,0": "90°", "5,1": "about 90°", "4,2": "90°",
};
const shapeKey = (s: Shape) => `${s.bonds},${s.lone}`;
const sayF = (f: string) => f;

const vseprVisual = (s: Shape): Visual => ({ kind: "chem-molecule", vsepr: { center: s.center, outer: s.outer, bonds: s.bonds, lone: s.lone } });

/** Total lone pairs in a preset molecule picture. */
const presetLonePairs = (f: string) => MOLECULES[normFormula(f)].atoms.reduce((t, a) => t + (a.lone ?? 0), 0);

/** 2.5: Lewis diagrams. */
export const lewisDiagrams = mix(
  () => {
    const s = pick(SHAPES);
    const v = valenceTotal(s.f);
    const p = parseFormula(s.f);
    return q({
      key: `lw-val-${s.f}`,
      prompt: `How many valence electrons are in the Lewis structure of ${s.f}?`,
      ...keypad(v),
      hint: "Add each atom's valence electrons (its group). Add one per negative charge; subtract one per positive charge.",
      explain: `${Object.entries(p.atoms)
        .map(([el, n]) => `${n} × ${valenceElectrons(el)} (${el})`)
        .join(" + ")}${p.charge ? ` ${p.charge < 0 ? "+" : "−"} ${Math.abs(p.charge)} (charge)` : ""} = ${v}.`,
    });
  },
  () => {
    const s = pick(SHAPES);
    return q({
      key: `lw-lone-${s.f}`,
      prompt: `In the best Lewis structure of ${s.f}, how many lone pairs are on the central ${s.center} atom?`,
      speech: `In the best Lewis structure of ${sayF(s.f)}, how many lone pairs are on the central ${nameOf(s.center)} atom?`,
      ...keypad(s.lone),
      hint: "Count valence electrons, bond the outer atoms to the centre, complete the outer atoms' octets, then put any electrons left on the central atom.",
      explain: `${s.f} has ${valenceTotal(s.f)} valence electrons. ${s.bonds} atoms are bonded to ${s.center}, leaving ${s.lone} lone pair${s.lone === 1 ? "" : "s"} on the centre.`,
    });
  },
  () => {
    const f = pick(["CO₂", "H₂O", "NH₃", "HCN", "CH₂O", "Cl₂", "N₂", "O₂", "HF", "BF₃", "CCl₄", "PCl₃", "OH⁻", "H₂S", "CH₃OH", "HCl", "F₂"]);
    const n = presetLonePairs(f);
    return q({
      key: `lw-pic-${f}`,
      prompt: `Here is the Lewis structure of ${f}. How many lone pairs does it have in all?`,
      visual: { kind: "chem-molecule", molecule: f, style: "lewis" },
      needsVisual: true,
      ...keypad(n),
      hint: "Count the pairs of dots on every atom (bonds are lines, not lone pairs).",
      explain: `${f} has ${n} lone pair${n === 1 ? "" : "s"} in all, with ${valenceTotal(f)} valence electrons in total.`,
    });
  },
  () =>
    again(() => {
      const exp = Math.random() < 0.5;
      const right = shuffle(SHAPES.filter((s) => (exp ? s.expanded : s.f === "BF₃" || s.f === "BeCl₂")))[0];
      const wrong = shuffle(SHAPES.filter((s) => !s.expanded && s.f !== "BF₃" && s.f !== "BeCl₂")).slice(0, 3);
      return q({
        key: `lw-oct-${exp}-${right.f}-${wrong.map((w) => w.f).join("")}`,
        prompt: exp ? "Which species has a central atom with an expanded octet (more than 8 electrons)?" : "Which molecule has a central atom with fewer than 8 electrons?",
        ...label(right.f, wrong.map((w) => w.f)),
        hint: exp ? "Only atoms in period 3 or below (with d orbitals available) can hold more than 8 electrons. Count bonds and lone pairs on the centre." : "Boron and beryllium are often stable with fewer than 8 electrons.",
        explain: exp
          ? `${right.f}: ${right.center} has ${right.bonds} bonds and ${right.lone} lone pair${right.lone === 1 ? "" : "s"}, which is ${2 * (right.bonds + right.lone)} electrons.`
          : `${right.f}: ${right.center} has only ${2 * right.bonds} electrons around it.`,
      });
    }),
  () => {
    const s = pick(SHAPES.filter((x) => x.center !== x.outer && Object.keys(atomsOf(x.f)).length === 2 && x.outer !== "H"));
    return q({
      key: `lw-center-${s.f}`,
      prompt: `Which atom is the central atom in ${s.f}?`,
      ...label(s.center, [s.outer, "Either one", "There is no central atom"]),
      hint: "The central atom is usually the less electronegative one (and never H), and there is usually only one of it.",
      explain: `${s.center} (EN ${en(s.center) ?? "–"}) is less electronegative than ${s.outer} (${en(s.outer)}), so it sits in the middle.`,
    });
  },
);

/** 2.5 Do it: build molecules. */
export function buildMolecules(): Question {
  const [target, center, tray, name] = pick([
    ["CH₄", "C", ["H"], "methane"],
    ["NH₃", "N", ["H"], "ammonia"],
    ["H₂O", "O", ["H"], "water"],
    ["CO₂", "C", ["O", "H"], "carbon dioxide"],
    ["HCN", "C", ["H", "N"], "hydrogen cyanide"],
    ["CH₂O", "C", ["H", "O"], "formaldehyde"],
    ["CCl₄", "C", ["Cl", "H"], "carbon tetrachloride"],
    ["NCl₃", "N", ["Cl", "H"], "nitrogen trichloride"],
    ["OF₂", "O", ["F", "H"], "oxygen difluoride"],
    ["H₂S", "S", ["H", "O"], "hydrogen sulfide"],
    ["PH₃", "P", ["H", "Cl"], "phosphine"],
    ["SiH₄", "Si", ["H"], "silane"],
    ["CS₂", "C", ["S", "H"], "carbon disulfide"],
    ["COCl₂", "C", ["O", "Cl"], "phosgene"],
    ["CH₃Cl", "C", ["H", "Cl"], "chloromethane"],
    ["HOCl", "O", ["H", "Cl"], "hypochlorous acid"],
    ["SCl₂", "S", ["Cl", "O"], "sulfur dichloride"],
    ["CHCl₃", "C", ["H", "Cl", "F"], "chloroform"],
  ] as [string, string, string[], string][]);
  const outer = Object.values(atomsOf(target)).reduce((a, b) => a + b, 0) - 1;
  return q({
    key: `bm-${target}`,
    prompt: `Do it: build ${target} (${name}) around ${center}. Use double or triple bonds where you need them so every atom has a full shell.`,
    speech: `Build ${name} around the ${nameOf(center)} atom, so every atom has a full shell.`,
    ...act({ kind: "chem-buildMolecule", center, tray, target }, outer),
    hint: `${center} needs ${8 - valenceElectrons(center)!} bonds' worth of shared pairs. H makes 1 bond, halogens 1, O and S 2, N 3.`,
    explain: `${target} has ${valenceTotal(target)} valence electrons; with the right bonds every atom has an octet (H has 2).`,
  });
}

/** Lewis structures for formal-charge questions (x, y in bond lengths). */
interface Structure {
  name: string;
  charge: string;
  atoms: { el: string; x: number; y: number; lone?: number }[];
  bonds: { a: number; b: number; order?: 1 | 2 | 3 }[];
}
const T = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const tri = (el: string, lones: number[], orders: (1 | 2 | 3)[], center: string, centerLone = 0): Pick<Structure, "atoms" | "bonds"> => ({
  atoms: [{ el: center, x: 0, y: 0, lone: centerLone }, ...[-90, 30, 150].map((d, i) => ({ el, x: T(d)[0], y: T(d)[1], lone: lones[i] }))],
  bonds: orders.map((o, i) => ({ a: 0, b: i + 1, order: o })),
});
const cross = (el: string, lones: number[], orders: (1 | 2 | 3)[], center: string, centerLone = 0): Pick<Structure, "atoms" | "bonds"> => ({
  atoms: [{ el: center, x: 0, y: 0, lone: centerLone }, ...[[0, -1], [1, 0], [0, 1], [-1, 0]].map(([x, y], i) => ({ el, x, y, lone: lones[i] }))],
  bonds: orders.map((o, i) => ({ a: 0, b: i + 1, order: o })),
});
const line = (els: [string, number][], orders: (1 | 2 | 3)[]): Pick<Structure, "atoms" | "bonds"> => ({
  atoms: els.map(([el, lone], i) => ({ el, x: i - (els.length - 1) / 2, y: 0, lone })),
  bonds: orders.map((o, i) => ({ a: i, b: i + 1, order: o })),
});
const STRUCTURES: Structure[] = [
  { name: "CO", charge: "", ...line([["C", 1], ["O", 1]], [3]) },
  { name: "CN⁻", charge: "−", ...line([["C", 1], ["N", 1]], [3]) },
  { name: "NO⁺", charge: "+", ...line([["N", 1], ["O", 1]], [3]) },
  { name: "O₃", charge: "", atoms: [{ el: "O", x: -0.9, y: 0.5, lone: 3 }, { el: "O", x: 0, y: 0, lone: 1 }, { el: "O", x: 0.9, y: 0.5, lone: 2 }], bonds: [{ a: 0, b: 1 }, { a: 1, b: 2, order: 2 }] },
  { name: "NO₃⁻", charge: "−", ...tri("O", [2, 3, 3], [2, 1, 1], "N") },
  { name: "CO₃²⁻", charge: "2−", ...tri("O", [2, 3, 3], [2, 1, 1], "C") },
  { name: "SO₄²⁻ (single bonds)", charge: "2−", ...cross("O", [3, 3, 3, 3], [1, 1, 1, 1], "S") },
  { name: "SO₄²⁻ (two double bonds)", charge: "2−", ...cross("O", [2, 3, 2, 3], [2, 1, 2, 1], "S") },
  { name: "N₂O (N=N=O)", charge: "", ...line([["N", 2], ["N", 0], ["O", 2]], [2, 2]) },
  { name: "N₂O (N≡N–O)", charge: "", ...line([["N", 1], ["N", 0], ["O", 3]], [3, 1]) },
  { name: "SCN⁻ (S=C=N)", charge: "−", ...line([["S", 2], ["C", 0], ["N", 2]], [2, 2]) },
  { name: "SCN⁻ (S–C≡N)", charge: "−", ...line([["S", 3], ["C", 0], ["N", 1]], [1, 3]) },
  { name: "CO₂", charge: "", ...line([["O", 2], ["C", 0], ["O", 2]], [2, 2]) },
  { name: "CO₂ (O–C≡O)", charge: "", ...line([["O", 3], ["C", 0], ["O", 1]], [1, 3]) },
  { name: "BF₄⁻", charge: "−", ...cross("F", [3, 3, 3, 3], [1, 1, 1, 1], "B") },
  { name: "NO₂⁻", charge: "−", atoms: [{ el: "O", x: -0.9, y: 0.5, lone: 2 }, { el: "N", x: 0, y: 0, lone: 1 }, { el: "O", x: 0.9, y: 0.5, lone: 3 }], bonds: [{ a: 0, b: 1, order: 2 }, { a: 1, b: 2 }] },
  { name: "ClO₃⁻ (single bonds)", charge: "−", ...tri("O", [3, 3, 3], [1, 1, 1], "Cl", 1) },
  { name: "ClO₃⁻ (two double bonds)", charge: "−", ...tri("O", [2, 2, 3], [2, 2, 1], "Cl", 1) },
  { name: "PO₄³⁻", charge: "3−", ...cross("O", [2, 3, 3, 3], [2, 1, 1, 1], "P") },
  { name: "OCN⁻ (O=C=N)", charge: "−", ...line([["O", 2], ["C", 0], ["N", 2]], [2, 2]) },
  { name: "OCN⁻ (O–C≡N)", charge: "−", ...line([["O", 3], ["C", 0], ["N", 1]], [1, 3]) },
];

function formalCharge(s: Structure, i: number): number {
  const a = s.atoms[i];
  const bonds = s.bonds.filter((b) => b.a === i || b.b === i).reduce((t, b) => t + (b.order ?? 1), 0);
  return valenceElectrons(a.el)! - 2 * (a.lone ?? 0) - bonds;
}

function structureVisual(s: Structure, ask: number): Visual {
  return {
    kind: "chem-molecule",
    atoms: s.atoms.map((a, i) => ({ ...a, ...(i === ask ? { charge: "?" } : {}) })),
    bonds: s.bonds,
    style: "lewis",
    ...(s.charge ? { ionCharge: s.charge } : {}),
  };
}

const PREFERRED: { name: string; a: string; b: string; best: "A" | "B"; why: string }[] = [
  { name: "N₂O", a: "N=N=O (formal charges −1, +1, 0)", b: "N≡N–O (formal charges 0, +1, −1)", best: "B", why: "the −1 sits on O, the more electronegative atom" },
  { name: "SCN⁻", a: "S=C=N (formal charges 0, 0, −1)", b: "S–C≡N (formal charges −1, 0, 0)", best: "A", why: "the −1 sits on N, which is more electronegative than S" },
  { name: "OCN⁻", a: "O=C=N (formal charges 0, 0, −1)", b: "O–C≡N (formal charges −1, 0, 0)", best: "B", why: "the −1 sits on O, the most electronegative atom" },
  { name: "CO₂", a: "O=C=O (formal charges 0, 0, 0)", b: "O–C≡O (formal charges −1, 0, +1)", best: "A", why: "all formal charges are zero" },
  { name: "SO₄²⁻", a: "S with four single bonds (S: +2, each O: −1)", b: "S with two double bonds (S: 0, two O: −1)", best: "B", why: "its formal charges are closer to zero" },
  { name: "ClO₃⁻", a: "Cl with three single bonds (Cl: +2)", b: "Cl with two double bonds (Cl: 0, one O: −1)", best: "B", why: "its formal charges are closer to zero" },
];

const RESONANCE: { f: string; n: number; order: string }[] = [
  { f: "NO₃⁻", n: 3, order: "1⅓" },
  { f: "CO₃²⁻", n: 3, order: "1⅓" },
  { f: "O₃", n: 2, order: "1½" },
  { f: "SO₂", n: 2, order: "1½" },
  { f: "NO₂⁻", n: 2, order: "1½" },
  { f: "HCOO⁻", n: 2, order: "1½" },
  { f: "SO₃", n: 3, order: "1⅓" },
  { f: "C₆H₆", n: 2, order: "1½" },
];

/** 2.6: resonance and formal charge. */
export const formalCharges = mix(
  () => {
    const s = pick(STRUCTURES);
    const i = rand(0, s.atoms.length - 1);
    const fc = formalCharge(s, i);
    const a = s.atoms[i];
    const bonds = s.bonds.filter((b) => b.a === i || b.b === i).reduce((t, b) => t + (b.order ?? 1), 0);
    return q({
      key: `fc-${s.name}-${i}`,
      prompt: `In this Lewis structure of ${s.name}, what is the formal charge on the ${a.el} atom marked "?"?`,
      speech: `In this Lewis structure of ${s.name.replace(/\(.*\)/, "")}, what is the formal charge on the ${nameOf(a.el)} atom marked with a question mark?`,
      visual: structureVisual(s, i),
      needsVisual: true,
      ...signed(fc),
      hint: "Formal charge = valence electrons − lone-pair electrons − bonds (one per shared pair).",
      explain: `${a.el}: ${valenceElectrons(a.el)} − ${2 * (a.lone ?? 0)} − ${bonds} = ${signText(fc)}.`,
    });
  },
  () => {
    const p = pick(PREFERRED);
    const opts = [`Structure A: ${p.a}`, `Structure B: ${p.b}`];
    return q({
      key: `fc-pref-${p.name}`,
      prompt: `Two Lewis structures for ${p.name} are shown as choices. Which is the better (preferred) structure?`,
      ...fixedLabels(opts, p.best === "A" ? opts[0] : opts[1]),
      hint: "Prefer formal charges closest to zero, and put any negative formal charge on the most electronegative atom.",
      explain: `Structure ${p.best} is preferred: ${p.why}.`,
    });
  },
  () => {
    const r = pick(RESONANCE);
    return q({
      key: `fc-res-${r.f}`,
      prompt: `How many equivalent resonance structures can be drawn for ${r.f} (without expanding any octet)?`,
      ...keypad(r.n),
      hint: "Count the different positions the double bond can take while the atoms stay in place.",
      explain: `The double bond can sit in ${r.n} equivalent positions, so ${r.f} has ${r.n} resonance structures.`,
    });
  },
  () => {
    const r = pick(RESONANCE);
    const bond = r.f === "C₆H₆" ? "C–C" : r.f === "HCOO⁻" ? "C–O" : `${r.f[0] === "O" ? "O–O" : `${r.f[0]}–O`}`;
    return q({
      key: `fc-order-${r.f}`,
      prompt: `What is the average ${bond} bond order in ${r.f}?`,
      ...label(r.order, ["1", "2", r.order === "1½" ? "1⅓" : "1½", "1¾"]),
      hint: "Add up the bond orders of the equivalent bonds in one structure and divide by how many there are.",
      explain: `One double bond is shared over ${r.n} equivalent bonds: (2 + ${r.n - 1} × 1) ÷ ${r.n} = ${r.order}. All these bonds are the same length.`,
    });
  },
  () => {
    const s = pick(STRUCTURES.filter((x) => x.charge));
    const total = s.atoms.reduce((t, _, i) => t + formalCharge(s, i), 0);
    return q({
      key: `fc-sum-${s.name}`,
      prompt: `What is the sum of the formal charges on all atoms in ${s.name}?`,
      visual: structureVisual(s, -1),
      ...signed(total),
      hint: "The formal charges always add up to the overall charge of the molecule or ion.",
      explain: `The formal charges add up to the ion's charge: ${signText(total)}.`,
    });
  },
);

/** 2.7: VSEPR shapes. */
export const vseprShapes = mix(
  () => {
    const s = pick(SHAPES);
    const g = GEOMETRY[shapeKey(s)];
    return q({
      key: `vs-pic-${s.f}`,
      prompt: `This model shows ${s.f}. What is its molecular geometry?`,
      visual: vseprVisual(s),
      needsVisual: true,
      ...label(g, Object.values(GEOMETRY).filter((x) => x !== g).slice(0, 12).sort(() => Math.random() - 0.5)),
      hint: "Count the bonded atoms and lone pairs on the centre. Name the shape from the atoms only, not the lone pairs.",
      explain: `${s.bonds} bonded atoms + ${s.lone} lone pair${s.lone === 1 ? "" : "s"} = ${s.bonds + s.lone} electron domains (${DOMAIN_GEOM[s.bonds + s.lone]}), so the shape is ${g}.`,
    });
  },
  () => {
    const s = pick(SHAPES);
    const g = GEOMETRY[shapeKey(s)];
    return q({
      key: `vs-f-${s.f}`,
      prompt: `What is the molecular geometry of ${s.f}?`,
      ...label(g, shuffle(Object.values(GEOMETRY).filter((x) => x !== g))),
      hint: "Draw the Lewis structure first, then count electron domains (bonds count once, whatever their order) and lone pairs on the centre.",
      explain: `${s.f}: ${s.bonds} bonding domains and ${s.lone} lone pair${s.lone === 1 ? "" : "s"} → ${g}.`,
    });
  },
  () => {
    const s = pick(SHAPES.filter((x) => x.bonds + x.lone <= 4 || x.lone === 0));
    const a = ANGLE[shapeKey(s)];
    return q({
      key: `vs-ang-${s.f}`,
      prompt: `What is the approximate bond angle in ${s.f}?`,
      visual: vseprVisual(s),
      ...label(a, shuffle(Object.values(ANGLE).filter((x) => x !== a))),
      hint: "Start from the ideal angle for the number of electron domains. Lone pairs push bonds a little closer.",
      explain: `${s.f} is ${GEOMETRY[shapeKey(s)]}: about ${a}.`,
    });
  },
  () => {
    const s = pick(SHAPES);
    const d = DOMAIN_GEOM[s.bonds + s.lone];
    return q({
      key: `vs-dom-${s.f}`,
      prompt: `What is the electron-domain geometry around the central atom of ${s.f}?`,
      ...label(d, Object.values(DOMAIN_GEOM).filter((x) => x !== d)),
      hint: "Electron-domain geometry counts every domain: bonded atoms and lone pairs.",
      explain: `${s.bonds} + ${s.lone} = ${s.bonds + s.lone} domains → ${d}${s.lone ? `; the molecular shape (atoms only) is ${GEOMETRY[shapeKey(s)]}` : ""}.`,
    });
  },
);

const HYB: Record<number, string> = { 2: "sp", 3: "sp²", 4: "sp³" };

/** σ and π bonds in molecules. */
const SIGMA_PI: { f: string; name: string; sigma: number; pi: number; preset?: boolean }[] = [
  { f: "CO₂", name: "carbon dioxide", sigma: 2, pi: 2, preset: true },
  { f: "HCN", name: "hydrogen cyanide", sigma: 2, pi: 2, preset: true },
  { f: "C₂H₄", name: "ethene", sigma: 5, pi: 1, preset: true },
  { f: "C₂H₂", name: "ethyne", sigma: 3, pi: 2, preset: true },
  { f: "CH₂O", name: "formaldehyde", sigma: 3, pi: 1, preset: true },
  { f: "N₂", name: "nitrogen", sigma: 1, pi: 2, preset: true },
  { f: "C₂H₆", name: "ethane", sigma: 7, pi: 0, preset: true },
  { f: "CH₃OH", name: "methanol", sigma: 5, pi: 0, preset: true },
  { f: "CH₃COOH", name: "acetic acid", sigma: 7, pi: 1 },
  { f: "C₆H₆", name: "benzene", sigma: 12, pi: 3 },
  { f: "HCOOH", name: "formic acid", sigma: 4, pi: 1 },
  { f: "CH₃CN", name: "acetonitrile", sigma: 5, pi: 2 },
  { f: "C₃H₆O", name: "acetone", sigma: 9, pi: 1 },
  { f: "C₃H₆", name: "propene", sigma: 8, pi: 1 },
  { f: "O₂", name: "oxygen", sigma: 1, pi: 1, preset: true },
];

/** Central atoms in organic molecules for hybridization. */
const ORGANIC_HYB: [string, string, number][] = [
  ["each carbon in C₂H₆ (ethane)", "sp³", 4],
  ["each carbon in C₂H₄ (ethene)", "sp²", 3],
  ["each carbon in C₂H₂ (ethyne)", "sp", 2],
  ["the carbon in CH₂O (formaldehyde)", "sp²", 3],
  ["the carbon in HCN", "sp", 2],
  ["the carbon atoms in benzene, C₆H₆", "sp²", 3],
  ["the oxygen in CH₃OH (methanol)", "sp³", 4],
  ["the nitrogen in HCN", "sp", 2],
  ["the CH₃ carbon in CH₃COOH (acetic acid)", "sp³", 4],
  ["the C=O carbon in CH₃COOH (acetic acid)", "sp²", 3],
];

/** 2.7: hybridization, sigma and pi bonds. */
export const hybridization = mix(
  () => {
    const s = pick(SHAPES.filter((x) => x.bonds + x.lone <= 4));
    const h = HYB[s.bonds + s.lone];
    return q({
      key: `hy-c-${s.f}`,
      prompt: `What is the hybridization of the central ${s.center} atom in ${s.f}?`,
      speech: `What is the hybridization of the central ${nameOf(s.center)} atom in ${s.f}?`,
      ...label(h, ["sp", "sp²", "sp³", "sp³d"].filter((x) => x !== h)),
      hint: "Count electron domains on the atom: 2 → sp, 3 → sp², 4 → sp³.",
      explain: `${s.center} has ${s.bonds} bonding domain${s.bonds === 1 ? "" : "s"} and ${s.lone} lone pair${s.lone === 1 ? "" : "s"}: ${s.bonds + s.lone} domains → ${h}.`,
    });
  },
  () => {
    const [what, h, d] = pick(ORGANIC_HYB);
    return q({
      key: `hy-o-${what}`,
      prompt: `What is the hybridization of ${what}?`,
      ...label(h, ["sp", "sp²", "sp³", "sp³d"].filter((x) => x !== h)),
      hint: "A double bond or triple bond counts as one electron domain. 4 domains → sp³, 3 → sp², 2 → sp.",
      explain: `That atom has ${d} electron domains, so it is ${h} hybridized.`,
    });
  },
  () => {
    const m = pick(SIGMA_PI);
    const askPi = Math.random() < 0.5;
    return q({
      key: `hy-sp-${m.f}-${askPi}`,
      prompt: `How many ${askPi ? "π (pi)" : "σ (sigma)"} bonds are in one molecule of ${m.f} (${m.name})?`,
      speech: `How many ${askPi ? "pi" : "sigma"} bonds are in one molecule of ${m.name}?`,
      visual: m.preset ? { kind: "chem-molecule", molecule: m.f, style: "structural" } : NONE,
      ...keypad(askPi ? m.pi : m.sigma),
      hint: "Every single bond is 1 σ. A double bond is 1 σ + 1 π. A triple bond is 1 σ + 2 π.",
      explain: `${m.f} has ${m.sigma} σ bonds and ${m.pi} π bond${m.pi === 1 ? "" : "s"}.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["How does a π bond form?", "Sideways overlap of p orbitals", ["Head-on overlap of two hybrid orbitals", "Transfer of an electron from one atom to the other", "Overlap of two s orbitals"]],
      ["Why can't atoms rotate freely around a C=C double bond?", "Rotation would break the sideways overlap of the π bond", ["The σ bond is too strong to twist", "Double bonds are ionic", "The carbon atoms repel each other"]],
      ["A carbon atom is sp² hybridized. How many unhybridized p orbitals does it have?", "One, which can form a π bond", ["None", "Two, which form two π bonds", "Three"]],
      ["Which bond is formed by head-on overlap along the axis between the nuclei?", "A σ bond", ["A π bond", "A hydrogen bond", "A metallic bond"]],
    ] as [string, string, string[]][]);
    return q({
      key: `hy-why-${ask.slice(0, 20)}`,
      prompt: ask,
      visual: { kind: "chem-molecule", molecule: "C₂H₄", style: "ball" },
      ...label(ans, wrongs),
      hint: "σ bonds lie along the bond axis; π bonds lie above and below it.",
      explain: `${ans}.`,
    });
  },
);

/** 2.7 / 2.1: molecular polarity. */
export const molecularPolarity = mix(
  () => {
    const s = pick(SHAPES.filter((x) => x.polar !== undefined && x.outer !== "H" || x.f === "NH₃" || x.f === "H₂O" || x.f === "CH₄"));
    return q({
      key: `mp-pic-${s.f}`,
      prompt: `Is ${s.f} a polar or a nonpolar molecule?`,
      visual: vseprVisual(s),
      ...fixedLabels(["Polar", "Nonpolar"], s.polar ? "Polar" : "Nonpolar"),
      hint: "Even if the bonds are polar, a symmetric shape makes the bond dipoles cancel. Lone pairs on the centre usually break the symmetry.",
      explain: s.polar ? `${s.f} is ${GEOMETRY[shapeKey(s)]}, so its bond dipoles don't cancel: polar.` : `${s.f} is ${GEOMETRY[shapeKey(s)]}, a symmetric shape, so the bond dipoles cancel: nonpolar.`,
    });
  },
  () =>
    again(() => {
      const polar = Math.random() < 0.5;
      const pool = SHAPES.filter((x) => x.polar !== undefined).concat([
        { f: "CH₂Cl₂", center: "C", outer: "Cl", bonds: 4, lone: 0, polar: true },
        { f: "CHCl₃", center: "C", outer: "Cl", bonds: 4, lone: 0, polar: true },
      ]);
      const right = pick(pool.filter((x) => x.polar === polar));
      const wrong = shuffle(pool.filter((x) => x.polar !== polar)).slice(0, 3);
      return q({
        key: `mp-which-${polar}-${right.f}-${wrong.map((w) => w.f).join("")}`,
        prompt: `Which molecule is ${polar ? "polar" : "nonpolar"}: ${shuffle([right, ...wrong]).map((x) => x.f).join(", ")}?`,
        ...label(right.f, wrong.map((w) => w.f)),
        hint: "Find each shape. Symmetric shapes with identical outer atoms and no lone pairs on the centre are nonpolar.",
        explain: `${right.f} is ${polar ? "polar" : "nonpolar"}; the others are ${polar ? "symmetric, so their dipoles cancel" : "asymmetric, so they have a net dipole"}.`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["CO₂ has polar C=O bonds, but the molecule is nonpolar. Why?", "It is linear, so the bond dipoles cancel", ["Carbon and oxygen have the same electronegativity", "Double bonds are never polar", "CO₂ has lone pairs on carbon"]],
      ["Both are tetrahedral, but CH₂Cl₂ is polar while CCl₄ is not. Why?", "CH₂Cl₂'s unequal bond dipoles don't cancel", ["CH₂Cl₂ has a lone pair on carbon", "CCl₄ has no polar bonds", "CH₂Cl₂ is ionic"]],
      ["Why is H₂O polar while CO₂ is not?", "Water is bent, so its dipoles add up", ["O–H bonds are ionic", "CO₂ has no electrons on oxygen", "Water has hydrogen bonds inside each molecule"]],
      ["Why is BF₃ nonpolar, while NF₃ is polar?", "NF₃ has a lone pair; BF₃ is symmetric", ["B–F bonds are nonpolar", "NF₃ is an ion", "BF₃ has a lone pair on boron"]],
    ] as [string, string, string[]][]);
    return q({
      key: `mp-why-${ask.slice(0, 20)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Molecular polarity depends on bond dipoles AND shape.",
      explain: `${ans}.`,
    });
  },
);

/* ============================================ Unit 3: substances and mixtures */

const IMF_NAMES = ["London dispersion forces", "Dipole–dipole forces", "Hydrogen bonding"];

/** Molecular substances: strongest IMF (0 London, 1 dipole–dipole, 2 hydrogen bonding), molar mass, boiling point °C. */
const IMF_STUFF: { f: string; name: string; imf: number; M: number; bp: number }[] = [
  { f: "CH₄", name: "methane", imf: 0, M: 16, bp: -162 },
  { f: "C₂H₆", name: "ethane", imf: 0, M: 30, bp: -89 },
  { f: "C₃H₈", name: "propane", imf: 0, M: 44, bp: -42 },
  { f: "C₄H₁₀", name: "butane", imf: 0, M: 58, bp: -1 },
  { f: "C₈H₁₈", name: "octane", imf: 0, M: 114, bp: 126 },
  { f: "F₂", name: "fluorine", imf: 0, M: 38, bp: -188 },
  { f: "Cl₂", name: "chlorine", imf: 0, M: 71, bp: -34 },
  { f: "Br₂", name: "bromine", imf: 0, M: 160, bp: 59 },
  { f: "I₂", name: "iodine", imf: 0, M: 254, bp: 184 },
  { f: "CO₂", name: "carbon dioxide", imf: 0, M: 44, bp: -78 },
  { f: "CCl₄", name: "carbon tetrachloride", imf: 0, M: 154, bp: 77 },
  { f: "Ne", name: "neon", imf: 0, M: 20, bp: -246 },
  { f: "Ar", name: "argon", imf: 0, M: 40, bp: -186 },
  { f: "Xe", name: "xenon", imf: 0, M: 131, bp: -108 },
  { f: "HCl", name: "hydrogen chloride", imf: 1, M: 36, bp: -85 },
  { f: "HBr", name: "hydrogen bromide", imf: 1, M: 81, bp: -67 },
  { f: "H₂S", name: "hydrogen sulfide", imf: 1, M: 34, bp: -60 },
  { f: "PH₃", name: "phosphine", imf: 1, M: 34, bp: -88 },
  { f: "CH₃Cl", name: "chloromethane", imf: 1, M: 50, bp: -24 },
  { f: "CH₃OCH₃", name: "dimethyl ether", imf: 1, M: 46, bp: -24 },
  { f: "CH₂O", name: "formaldehyde", imf: 1, M: 30, bp: -19 },
  { f: "CH₃COCH₃", name: "acetone", imf: 1, M: 58, bp: 56 },
  { f: "CHCl₃", name: "chloroform", imf: 1, M: 119, bp: 61 },
  { f: "H₂O", name: "water", imf: 2, M: 18, bp: 100 },
  { f: "NH₃", name: "ammonia", imf: 2, M: 17, bp: -33 },
  { f: "HF", name: "hydrogen fluoride", imf: 2, M: 20, bp: 20 },
  { f: "CH₃OH", name: "methanol", imf: 2, M: 32, bp: 65 },
  { f: "C₂H₅OH", name: "ethanol", imf: 2, M: 46, bp: 78 },
  { f: "CH₃COOH", name: "acetic acid", imf: 2, M: 60, bp: 118 },
];
const imfOf = (f: string) => IMF_STUFF.find((s) => s.f === f)!;

/** Boiling-point pairs [higher, lower, reason, wrong reasons]. */
const BP_PAIRS: [string, string, string, string[]][] = [
  ["Br₂", "Cl₂", "more electrons, stronger London forces", ["it is polar", "it hydrogen bonds", "weaker covalent bonds"]],
  ["I₂", "Br₂", "more electrons, stronger London forces", ["it is ionic", "dipole–dipole forces", "weaker covalent bonds"]],
  ["C₈H₁₈", "C₄H₁₀", "bigger molecule, stronger London forces", ["it hydrogen bonds", "it is polar", "stronger C–C bonds"]],
  ["C₃H₈", "CH₄", "more electrons, stronger London forces", ["it is polar", "it hydrogen bonds", "stronger C–H bonds"]],
  ["H₂O", "H₂S", "it hydrogen bonds; H₂S can't", ["more electrons", "stronger O–H bonds", "it is ionic"]],
  ["NH₃", "PH₃", "it hydrogen bonds; PH₃ can't", ["more electrons", "stronger N–H bonds", "it is ionic"]],
  ["C₂H₅OH", "CH₃OCH₃", "its O–H group hydrogen bonds", ["more electrons", "it is ionic", "stronger C–O bonds"]],
  ["HF", "HCl", "it hydrogen bonds; HCl can't", ["more electrons", "HCl is nonpolar", "stronger H–F bond"]],
  ["CH₃COCH₃", "C₄H₁₀", "polar: adds dipole–dipole forces", ["it hydrogen bonds", "far more electrons", "stronger C–C bonds"]],
  ["CH₂O", "C₂H₆", "polar: adds dipole–dipole forces", ["it hydrogen bonds", "more electrons", "it is ionic"]],
  ["HBr", "HCl", "more electrons: London forces win", ["it is more polar", "it hydrogen bonds", "weaker H–Br bond"]],
  ["CCl₄", "CH₄", "many more electrons (London)", ["it is polar", "it hydrogen bonds", "it is ionic"]],
  ["Xe", "Ar", "more electrons, stronger London forces", ["it forms bonds", "it is polar", "Ar atoms repel"]],
];

/** 3.1: intermolecular forces. */
export const intermolecular = mix(
  () => {
    const s = pick(IMF_STUFF);
    return q({
      key: `imf-str-${s.f}`,
      prompt: `What is the strongest type of intermolecular force between molecules of ${s.f} (${s.name})?`,
      speech: `What is the strongest type of intermolecular force between molecules of ${s.name}?`,
      ...fixedLabels(IMF_NAMES, IMF_NAMES[s.imf]),
      hint: "H bonded to N, O or F → hydrogen bonding. Otherwise polar → dipole–dipole. Nonpolar → London forces only.",
      explain: s.imf === 2 ? `${s.f} has H bonded to N, O or F, so it hydrogen bonds.` : s.imf === 1 ? `${s.f} is polar but has no H–N, H–O or H–F bonds: dipole–dipole.` : `${s.f} is nonpolar, so only London dispersion forces act.`,
    });
  },
  () => {
    const [hi, lo, why, wrongs] = pick(BP_PAIRS);
    const flip = Math.random() < 0.5;
    const [a, b] = flip ? [lo, hi] : [hi, lo];
    return q({
      key: `imf-bp-${hi}-${lo}-${flip}`,
      prompt: `Which has the higher boiling point, ${a} or ${b}? Choose the best explanation.`,
      ...label(`${hi}: ${why}`, [`${lo}: stronger intermolecular forces`, ...wrongs.map((w) => `${hi}: ${w}`)]),
      hint: "Boiling separates molecules, so compare intermolecular forces: hydrogen bonding, then polarity, and always London forces (more electrons → stronger).",
      explain: `${hi} (${imfOf(hi).bp} °C) boils higher than ${lo} (${imfOf(lo).bp} °C): ${why}.`,
    });
  },
  () =>
    again(() => {
      const right = pick(IMF_STUFF.filter((s) => s.imf === 2));
      const wrong = shuffle(IMF_STUFF.filter((s) => s.imf < 2 && s.f.includes("H"))).slice(0, 3);
      return q({
        key: `imf-hb-${right.f}-${wrong.map((w) => w.f).join("")}`,
        prompt: `Which substance's molecules can form hydrogen bonds with each other: ${shuffle([right, ...wrong]).map((s) => s.f).join(", ")}?`,
        ...label(right.f, wrong.map((w) => w.f)),
        hint: "Hydrogen bonding needs an H atom bonded directly to N, O or F.",
        explain: `${right.f} has H bonded to ${right.f.includes("F") ? "F" : right.f.includes("N") ? "N" : "O"}. In the others, H is bonded to C, S, P or Cl.`,
      });
    }),
  () => {
    const s = pick(IMF_STUFF);
    const present = s.imf === 0 ? "London dispersion forces only" : s.imf === 1 ? "London dispersion and dipole–dipole forces" : "London dispersion, dipole–dipole and hydrogen bonding";
    return q({
      key: `imf-all-${s.f}`,
      prompt: `Which intermolecular forces act between ${s.f} molecules?`,
      ...label(present, ["London dispersion forces only", "London dispersion and dipole–dipole forces", "London dispersion, dipole–dipole and hydrogen bonding", "Dipole–dipole forces only", "Ionic bonds"].filter((x) => x !== present)),
      hint: "Every molecule has London forces. Polar molecules add dipole–dipole; H on N, O or F adds hydrogen bonding.",
      explain: `${s.f}: ${present}.`,
    });
  },
  () => {
    const set = [...shuffle(IMF_STUFF.filter((s) => s.imf === 0)).slice(0, 2), ...shuffle(IMF_STUFF.filter((s) => s.imf === 1)).slice(0, 2), ...shuffle(IMF_STUFF.filter((s) => s.imf === 2)).slice(0, 2)];
    return q({
      key: `imf-sort-${set.map((s) => s.f).sort().join("")}`,
      prompt: "Do it: sort each substance by the strongest force between its molecules.",
      ...act({ kind: "sort", bins: ["London only", "Dipole–dipole", "Hydrogen bonding"], items: set.map((s) => ({ label: s.f, bin: s.imf })) }, set.length),
      hint: "Look for H–N, H–O or H–F first, then check whether the molecule is polar.",
      explain: set.map((s) => `${s.f}: ${IMF_NAMES[s.imf].toLowerCase()}`).join("; ") + ".",
    });
  },
);

const SOLID_TYPES = ["Ionic", "Molecular", "Covalent network", "Metallic"];
const SOLIDS: { f: string; type: number; desc: string }[] = [
  { f: "NaCl", type: 0, desc: "melts at 801 °C, is brittle, and conducts electricity only when melted or dissolved" },
  { f: "MgO", type: 0, desc: "melts at 2852 °C, is brittle, and conducts only when molten" },
  { f: "KBr", type: 0, desc: "melts at 734 °C, dissolves in water, and the solution conducts" },
  { f: "I₂", type: 1, desc: "melts at 114 °C, is soft, and does not conduct in any state" },
  { f: "C₁₂H₂₂O₁₁ (sucrose)", type: 1, desc: "melts at about 186 °C and dissolves in water, but the solution does not conduct" },
  { f: "CO₂ (dry ice)", type: 1, desc: "turns to gas at −78 °C and does not conduct" },
  { f: "C (diamond)", type: 2, desc: "is extremely hard, melts above 3500 °C and does not conduct" },
  { f: "SiO₂ (quartz)", type: 2, desc: "is very hard, melts at 1713 °C, is insoluble in water and does not conduct" },
  { f: "SiC", type: 2, desc: "is very hard, decomposes at about 2700 °C and does not conduct" },
  { f: "Cu", type: 3, desc: "melts at 1085 °C, is malleable and ductile, and conducts as a solid" },
  { f: "Fe", type: 3, desc: "melts at 1538 °C, is shiny and malleable, and conducts as a solid" },
  { f: "Na", type: 3, desc: "melts at 98 °C, is soft enough to cut, shiny, and conducts as a solid" },
];

/** 3.2: properties of solids. */
export const solids = mix(
  () => {
    const s = pick(SOLIDS);
    return q({
      key: `sol-cls-${s.f}`,
      prompt: `A solid ${s.desc}. What type of solid is it most likely to be?`,
      ...fixedLabels(SOLID_TYPES, SOLID_TYPES[s.type]),
      hint: "Conducts as a solid → metallic. Conducts only melted/dissolved → ionic. Very hard, very high melting, no conduction → network. Low melting, soft → molecular.",
      explain: `That's ${s.f}, a ${SOLID_TYPES[s.type].toLowerCase()} solid.`,
    });
  },
  () => {
    const items = [...shuffle(SOLIDS.filter((s) => s.type === 0)).slice(0, 2), ...shuffle(SOLIDS.filter((s) => s.type === 1)).slice(0, 2), ...shuffle(SOLIDS.filter((s) => s.type === 2)).slice(0, 2), ...shuffle(SOLIDS.filter((s) => s.type === 3)).slice(0, 2)];
    return q({
      key: `sol-sort-${items.map((s) => s.f).sort().join("")}`,
      prompt: "Do it: sort these solids by the type of particles and forces holding them together.",
      ...act({ kind: "sort", bins: SOLID_TYPES, items: items.map((s) => ({ label: s.f, bin: s.type })) }, items.length),
      hint: "Metal + nonmetal → ionic. Metal alone → metallic. C, Si, SiO₂, SiC → network. Other nonmetal compounds → molecular.",
      explain: items.map((s) => `${s.f}: ${SOLID_TYPES[s.type].toLowerCase()}`).join("; ") + ".",
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Graphite conducts electricity but diamond does not. Why?", "Graphite has delocalized electrons", ["Graphite contains metal atoms", "Diamond has ionic bonds", "Graphite is a molecular solid"]],
      ["Why does ice melt at 0 °C while quartz (SiO₂) melts at 1713 °C?", "Quartz melting breaks covalent bonds", ["Ice is ionic", "SiO₂ molecules are much heavier", "Quartz has hydrogen bonds"]],
      ["Why are molecular solids usually soft with low melting points?", "Only weak intermolecular forces hold them", ["Their covalent bonds are weak", "They have no electrons", "Their ions are large"]],
      ["Which solid would conduct electricity as a solid?", "Aluminum foil", ["Table salt", "Sugar", "Sand (SiO₂)"]],
      ["Which solid has the highest melting point?", "SiO₂ (covalent network)", ["I₂ (molecular)", "Na (metallic)", "CO₂ (molecular)"]],
    ] as [string, string, string[]][]);
    return q({
      key: `sol-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Ask what must be broken: intermolecular forces (molecular), ionic attractions, covalent bonds (network) or metallic bonding.",
      explain: `${ans}.`,
    });
  },
);

/** 3.3: solids, liquids and gases. */
export const statesOfMatter = mix(
  () => {
    const f = pick(["H₂O", "Br₂", "CO₂", "CH₄", "NH₃", "I₂", "Cl₂", "O₂"]);
    const order = shuffle(["solid", "liquid", "gas"] as const);
    const want = pick(["solid", "liquid", "gas"] as const);
    const names = ["A", "B", "C"];
    return q({
      key: `st-pic-${f}-${order.join("")}-${want}`,
      prompt: `Which box best represents ${f} as a ${want}?`,
      visual: {
        kind: "chem-particles",
        panels: order.map((arr, i) => ({ species: [{ formula: f, count: 9 }], arrangement: arr, label: names[i], motion: (arr === "solid" ? 1 : arr === "liquid" ? 2 : 3) as 1 | 2 | 3 })),
        joiner: null,
      },
      needsVisual: true,
      ...fixedLabels(names.map((n) => `Box ${n}`), `Box ${names[order.indexOf(want)]}`),
      hint: "Solids: packed in a fixed pattern. Liquids: touching but disordered. Gases: far apart, filling the container.",
      explain: `Box ${names[order.indexOf(want)]} shows the ${want}.`,
    });
  },
  () =>
    again(() => {
      const set = shuffle([
        ["diethyl ether", 35],
        ["acetone", 56],
        ["ethanol", 78],
        ["water", 100],
        ["octane", 126],
        ["acetic acid", 118],
      ] as [string, number][]).slice(0, 3);
      const sorted = [...set].sort((a, b) => a[1] - b[1]);
      if (sorted[1][1] - sorted[0][1] < 10) return null;
      return q({
        key: `st-vp-${set.map((s) => s[0]).sort().join("")}`,
        prompt: `Which liquid has the highest vapor pressure at 25 °C? (Normal boiling points: ${set.map(([n, b]) => `${n} ${b} °C`).join(", ")})`,
        ...label(sorted[0][0], sorted.slice(1).map((s) => s[0])),
        hint: "Weaker intermolecular forces let more molecules escape into the gas: higher vapor pressure and a lower boiling point.",
        explain: `${sorted[0][0]} has the weakest intermolecular forces (lowest boiling point), so it evaporates most.`,
      });
    }),
  () => {
    const [sub, melt, boil] = pick([["water", 0, 100], ["ethanol", -114, 78], ["benzene", 6, 80], ["acetic acid", 17, 118], ["mercury", -39, 357]] as [string, number, number][]);
    const segs = ["A", "B", "C", "D", "E"];
    const asks: [string, string][] = [
      ["solid and liquid are both present, and the temperature stays constant", "B"],
      ["the liquid is being heated and the molecules' average kinetic energy rises", "C"],
      ["the liquid is boiling, so energy goes into overcoming intermolecular forces", "D"],
      ["only gas is present", "E"],
      ["only solid is present", "A"],
    ];
    const [what, seg] = pick(asks);
    const start = melt - 30;
    const end = boil + 30;
    return q({
      key: `st-heat-${sub}-${seg}`,
      prompt: `This is the heating curve of ${sub}, heated at a steady rate. Which segment matches this description: ${what}?`,
      visual: { kind: "chem-energy", mode: "heating", melt, boil, start, end, labels: ["A", "B", "C", "D", "E"], title: `Heating ${sub}` },
      needsVisual: true,
      ...fixedLabels(segs, seg),
      hint: "Sloped parts: one phase warming up. Flat parts: a phase change, where the temperature stays constant.",
      explain: `Segment ${seg}: ${what}.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Why does the temperature stay constant while ice melts?", "The energy goes into overcoming IMFs", ["The ice stops absorbing energy", "The molecules stop moving", "Covalent O–H bonds are breaking"]],
      ["Why are gases easy to compress but liquids are not?", "Gas particles have lots of space between them", ["Gas particles are smaller", "Gas particles don't move", "Liquid particles are locked in place"]],
      ["Why do liquids take the shape of their container but keep their volume?", "Particles touch but can slide past each other", ["Particles are far apart", "Particles are locked in a pattern", "Particles have no attractions"]],
      ["When a liquid boils, what happens to the particles?", "They separate; the molecules stay intact", ["The molecules break into atoms", "The particles get larger", "New substances form"]],
    ] as [string, string, string[]][]);
    return q({
      key: `st-why-${ask.slice(0, 20)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Think about the spacing, order and motion of the particles.",
      explain: `${ans}.`,
    });
  },
);

const R = 0.08206;
const GASES = ["O₂", "N₂", "CO₂", "Ar", "CH₄", "SO₂", "NH₃", "Cl₂", "He", "Ne", "C₃H₈", "H₂"];
const RTEXT = "R = 0.08206 L·atm/(mol·K)";

/** 3.4: the ideal gas law. */
export const idealGas = mix(
  () =>
    again(() => {
      const n = rand(100, 999) / 1000;
      const V = rand(100, 250) / 10;
      const T = rand(250, 450);
      const P = (n * R * T) / V;
      if (!safe(P)) return null;
      return q({
        key: `gas-P-${n}-${V}-${T}`,
        prompt: `${n.toFixed(3)} mol of gas is in a ${V.toFixed(1)} L container at ${T} K. What is the pressure? (${RTEXT}) ${SF3}`,
        ...keypad(sf(P)),
        unit: "atm",
        hint: "P = nRT ÷ V. Temperature must be in kelvin.",
        explain: `P = ${n.toFixed(3)} × 0.08206 × ${T} ÷ ${V.toFixed(1)} = ${sig(P)} atm.`,
      });
    }),
  () =>
    again(() => {
      const n = rand(100, 999) / 1000;
      const P = rand(50, 300) / 100;
      const tc = rand(-20, 150);
      const T = tc + 273.15;
      const V = (n * R * T) / P;
      if (!safe(V)) return null;
      return q({
        key: `gas-V-${n}-${P}-${tc}`,
        prompt: `What volume does ${n.toFixed(3)} mol of gas occupy at ${P.toFixed(2)} atm and ${tc} °C? (${RTEXT}) ${SF3}`,
        ...keypad(sf(V)),
        unit: "L",
        hint: "Convert to kelvin first (add 273.15), then V = nRT ÷ P.",
        explain: `T = ${T.toFixed(2)} K. V = ${n.toFixed(3)} × 0.08206 × ${T.toFixed(2)} ÷ ${P.toFixed(2)} = ${sig(V)} L.`,
      });
    }),
  () =>
    again(() => {
      const g = pick(GASES);
      const M = mm(g);
      const P = rand(50, 200) / 100;
      const T = rand(273, 400);
      const d = (P * M) / (R * T);
      const dText = sig(d);
      const Mcalc = (Number(dText) * R * T) / P;
      if (!safe(Mcalc, 3, 0.15)) return null;
      return q({
        key: `gas-M-${g}-${P}-${T}`,
        prompt: `An unknown gas has a density of ${dText} g/L at ${P.toFixed(2)} atm and ${T} K. What is its molar mass? (${RTEXT}) ${SF3}`,
        ...keypad(sf(Mcalc)),
        unit: "g/mol",
        hint: "M = dRT ÷ P (from PV = nRT with n = mass ÷ M).",
        explain: `M = ${dText} × 0.08206 × ${T} ÷ ${P.toFixed(2)} = ${sig(Mcalc)} g/mol, which matches ${g} (${M.toFixed(2)} g/mol).`,
      });
    }),
  () =>
    again(() => {
      const [a, b] = shuffle(["N₂", "O₂", "Ar", "CO₂", "He", "H₂"]).slice(0, 2);
      const na = rand(10, 90) / 100;
      const nb = rand(10, 90) / 100;
      const Pt = rand(100, 500) / 100;
      const Pa = (Pt * na) / (na + nb);
      if (!safe(Pa)) return null;
      return q({
        key: `gas-dal-${a}-${b}-${na}-${nb}-${Pt}`,
        prompt: `A mixture contains ${na.toFixed(2)} mol ${a} and ${nb.toFixed(2)} mol ${b}. The total pressure is ${Pt.toFixed(2)} atm. What is the partial pressure of ${a}? ${SF3}`,
        visual: {
          kind: "chem-particles",
          panels: [{ species: [{ formula: a, count: Math.round((na / (na + nb)) * 16) || 1 }, { formula: b, count: Math.round((nb / (na + nb)) * 16) || 1 }] }],
        },
        ...keypad(sf(Pa)),
        unit: "atm",
        hint: `Dalton's law: P(${a}) = mole fraction of ${a} × total pressure.`,
        explain: `X = ${na.toFixed(2)} ÷ ${(na + nb).toFixed(2)} = ${(na / (na + nb)).toFixed(3)}; × ${Pt.toFixed(2)} atm = ${sig(Pa)} atm.`,
      });
    }),
  () =>
    again(() => {
      const V1 = rand(100, 500) / 100;
      const P1 = rand(80, 200) / 100;
      const P2 = rand(80, 300) / 100;
      const t1 = rand(0, 40);
      const t2 = rand(50, 200);
      const V2 = (P1 * V1 * (t2 + 273.15)) / ((t1 + 273.15) * P2);
      if (!safe(V2)) return null;
      return q({
        key: `gas-comb-${V1}-${P1}-${P2}-${t1}-${t2}`,
        prompt: `A gas sample has V = ${V1.toFixed(2)} L at ${P1.toFixed(2)} atm and ${t1} °C. What is its volume at ${P2.toFixed(2)} atm and ${t2} °C? ${SF3}`,
        ...keypad(sf(V2)),
        unit: "L",
        hint: "P₁V₁/T₁ = P₂V₂/T₂, with both temperatures in kelvin.",
        explain: `V₂ = ${V1.toFixed(2)} × (${P1.toFixed(2)} ÷ ${P2.toFixed(2)}) × (${(t2 + 273.15).toFixed(2)} ÷ ${(t1 + 273.15).toFixed(2)}) = ${sig(V2)} L.`,
      });
    }),
);

/** 3.4/3.5 Do it: graph the gas laws. */
export const gasGraphs = mix(
  () => {
    const s = pick([0.5, 1, 1.5, 2]);
    const t0 = pick([2, 3, 4]);
    const V0 = s * t0;
    return q({
      key: `gg-charles-${s}-${t0}`,
      prompt: `Do it: at constant pressure a gas has V = ${fix(V0, 1)} L at ${t0 * 100} K. Draw its graph of V (L, up) against T (x-axis in hundreds of kelvin).`,
      speech: `At constant pressure a gas has a volume of ${fix(V0, 1)} liters at ${t0 * 100} kelvin. Draw its graph of volume against temperature, with temperature in hundreds of kelvin.`,
      ...act({ kind: "drawLine", m: s, b: 0, size: 8, quadrants: 1 }, s),
      hint: "Charles's law: V ∝ T in kelvin, so the line goes through the origin (0 K, 0 L).",
      explain: `V/T is constant: ${fix(V0, 1)} L per ${t0} hundred K = ${s} L per 100 K. The line is V = ${s}T through the origin.`,
    });
  },
  () => {
    const k = pick([1, 2, 3]);
    return q({
      key: `gg-boyle-${k}`,
      prompt: `Do it: at constant temperature, a gas has PV = ${k}.0 atm·L. Draw the graph of P (atm, up) against 1/V (L⁻¹, across).`,
      speech: `At constant temperature, a gas has P times V equal to ${k} atmosphere liters. Draw the graph of pressure against 1 over volume.`,
      ...act({ kind: "drawLine", m: k, b: 0, size: 8, quadrants: 1 }, k),
      hint: "Boyle's law: P = k × (1/V), a straight line through the origin with slope k = PV.",
      explain: `P = ${k} × (1/V): a line through the origin with slope ${k}.`,
    });
  },
  () => {
    const r = pick([0.5, 1, 2]);
    const xs = r === 0.5 ? [2, 4, 6, 8] : r === 1 ? [2, 3, 5, 6] : [1, 2, 3, 4];
    const [x0, ...rest] = shuffle(xs);
    const pts = rest.map((x) => ({ x, y: r * x, label: `${x * 100} K` }));
    return q({
      key: `gg-gay-${r}-${x0}-${rest.join("")}`,
      prompt: `Do it: in a rigid container, a gas is at ${fix(r * x0, 1)} atm when T = ${x0 * 100} K. Plot its pressure at ${rest.map((x) => `${x * 100} K`).join(", ")}. (x: T in hundreds of K; y: P in atm)`,
      ...act({ kind: "plotPoints", points: pts, size: 8, quadrants: 1 }, pts.length),
      hint: "At constant volume, P ∝ T (in kelvin): double the temperature, double the pressure.",
      explain: pts.map((p) => `${p.label}: ${p.y} atm`).join("; ") + ".",
    });
  },
);

const MB = (vp: number) => (v: number) => ((4 / Math.sqrt(Math.PI)) * (v * v) / vp ** 3) * Math.exp(-((v / vp) ** 2)) * 1000;
const vProb = (M: number, T: number) => Math.sqrt((2 * 8.314 * T) / (M / 1000));

/** 3.5: kinetic molecular theory. */
export const kineticTheory = mix(
  () => {
    const g = pick(["N₂", "O₂", "Ar", "CO₂", "He", "Ne", "CH₄"]);
    const M = molarMass(g);
    const [T1, T2] = pick([[200, 400], [300, 600], [250, 500], [300, 900], [150, 450]]);
    const flip = Math.random() < 0.5;
    const curves = flip ? [T2, T1] : [T1, T2];
    const hiIdx = flip ? 0 : 1;
    const vmax = vProb(M, T2) * 3;
    return q({
      key: `kmt-T-${g}-${T1}-${flip}`,
      prompt: `Curves A and B show the speed distribution of ${g} molecules at ${T1} K and ${T2} K. Which curve is at ${T2} K?`,
      visual: { kind: "plot", xLabel: "molecular speed (m/s)", yLabel: "fraction of molecules", x: [0, Math.ceil(vmax / 500) * 500], y: [0, Math.ceil(MB(vProb(M, T1))(vProb(M, T1)) * 1.2 * 10) / 10], curves: curves.map((T, i) => ({ fn: MB(vProb(M, T)), label: "AB"[i], colour: (["wave", "berry"] as const)[i] })) },
      needsVisual: true,
      ...fixedLabels(["Curve A", "Curve B"], `Curve ${"AB"[hiIdx]}`),
      hint: "At higher temperature molecules move faster on average: the peak shifts right and the curve spreads out and gets lower.",
      explain: `Curve ${"AB"[hiIdx]} peaks at a higher speed and is broader, so it is the higher temperature (${T2} K).`,
    });
  },
  () => {
    const [a, b] = pick([["He", "Ar"], ["H₂", "N₂"], ["Ne", "Kr"], ["CH₄", "SO₂"], ["N₂", "CO₂"], ["He", "O₂"]]);
    const T = 300;
    const flip = Math.random() < 0.5;
    const order = flip ? [b, a] : [a, b];
    const ask = pick([a, b]);
    const idx = order.indexOf(ask);
    const vmax = vProb(molarMass(a), T) * 3;
    return q({
      key: `kmt-M-${a}-${b}-${flip}-${ask}`,
      prompt: `Curves A and B show molecular speeds for ${a} and ${b} at the same temperature. Which curve is ${ask}?`,
      visual: { kind: "plot", xLabel: "molecular speed (m/s)", yLabel: "fraction of molecules", x: [0, Math.ceil(vmax / 500) * 500], y: [0, Math.ceil(MB(vProb(molarMass(b), T))(vProb(molarMass(b), T)) * 1.2 * 10) / 10], curves: order.map((g, i) => ({ fn: MB(vProb(molarMass(g), T)), label: "AB"[i], colour: (["wave", "berry"] as const)[i] })) },
      needsVisual: true,
      ...fixedLabels(["Curve A", "Curve B"], `Curve ${"AB"[idx]}`),
      hint: "Same temperature means the same average kinetic energy (½mv²). Lighter molecules must move faster.",
      explain: `${ask === a ? a : b} is ${ask === a ? "lighter, so its curve peaks at a higher speed" : "heavier, so its curve peaks at a lower speed and is taller"}: curve ${"AB"[idx]}.`,
    });
  },
  () =>
    again(() => {
      const t1 = rand(-50, 100);
      const t2 = rand(t1 + 50, 500);
      const ratio = (t2 + 273) / (t1 + 273);
      if (!safe(ratio)) return null;
      return q({
        key: `kmt-ke-${t1}-${t2}`,
        prompt: `A gas is heated from ${t1} °C to ${t2} °C. By what factor does the average kinetic energy of its molecules increase? (Use T(K) = T(°C) + 273.) ${SF3}`,
        ...keypad(sf(ratio)),
        unit: "×",
        hint: "Average kinetic energy is proportional to the kelvin temperature.",
        explain: `${t2 + 273} K ÷ ${t1 + 273} K = ${sig(ratio)}.`,
      });
    }),
  () =>
    again(() => {
      const g = pick(["N₂", "O₂", "He", "Ar", "CO₂", "CH₄", "H₂", "Ne"]);
      const M = mm(g);
      const T = rand(200, 600);
      const u = Math.sqrt((3 * 8.314 * T) / (M / 1000));
      if (!safe(u)) return null;
      return q({
        key: `kmt-rms-${g}-${T}`,
        prompt: `What is the root-mean-square speed of ${g} ${["He", "Ne", "Ar"].includes(g) ? "atoms" : "molecules"} at ${T} K? Use u = √(3RT/M) with R = 8.314 J/(mol·K) and M in kg/mol (${g}: ${M.toFixed(2)} g/mol). ${SF3}`,
        ...keypad(sf(u)),
        unit: "m/s",
        hint: `Convert M to kg/mol first: ${M.toFixed(2)} g/mol = ${(M / 1000).toFixed(5)} kg/mol.`,
        explain: `u = √(3 × 8.314 × ${T} ÷ ${(M / 1000).toFixed(5)}) = ${sig(u)} m/s.`,
      });
    }),
  () =>
    again(() => {
      const [a, b] = shuffle(["He", "H₂", "Ne", "N₂", "O₂", "CO₂", "Ar", "Cl₂", "SO₂", "CH₄"]).slice(0, 2);
      const [light, heavy] = molarMass(a) < molarMass(b) ? [a, b] : [b, a];
      const r = Math.sqrt(mm(heavy) / mm(light));
      if (!safe(r) || r < 1.05) return null;
      return q({
        key: `kmt-graham-${light}-${heavy}`,
        prompt: `How many times faster does ${light} effuse than ${heavy} at the same temperature? (${light} ${mmText(light)}, ${heavy} ${mmText(heavy)} g/mol) ${SF3}`,
        ...keypad(sf(r)),
        unit: "×",
        hint: "Graham's law: rate₁ ÷ rate₂ = √(M₂ ÷ M₁). The lighter gas is faster.",
        explain: `√(${mmText(heavy)} ÷ ${mmText(light)}) = ${sig(r)}.`,
      });
    }),
);

const VDW_A: Record<string, number> = { He: 0.0346, Ne: 0.208, "H₂": 0.2476, Ar: 1.355, "N₂": 1.37, "O₂": 1.382, "CH₄": 2.283, "CO₂": 3.64, "NH₃": 4.225, "H₂O": 5.536, "SO₂": 6.803, "Cl₂": 6.579 };

/** 3.6: deviations from ideal gas behavior. */
export const realGases = mix(
  () =>
    again(() => {
      const set = shuffle(Object.keys(VDW_A)).slice(0, 4);
      const sorted = [...set].sort((a, b) => VDW_A[b] - VDW_A[a]);
      if (VDW_A[sorted[0]] < VDW_A[sorted[1]] * 1.15) return null;
      const most = Math.random() < 0.6;
      const ans = most ? sorted[0] : sorted[sorted.length - 1];
      if (!most && VDW_A[sorted[sorted.length - 2]] < VDW_A[ans] * 1.15) return null;
      return q({
        key: `rg-dev-${most}-${set.sort().join("")}`,
        prompt: `At 1 atm and 300 K, which gas behaves ${most ? "LEAST" : "MOST"} ideally: ${shuffle(set).join(", ")}?`,
        ...label(ans, set.filter((s) => s !== ans)),
        hint: "Real gases deviate when their particles attract each other strongly (polar or many electrons) and when the particles are large.",
        explain: most ? `${ans} has the strongest intermolecular attractions of the four, so it deviates most.` : `${ans} has the weakest intermolecular attractions (tiny, nonpolar, few electrons), so it is closest to ideal.`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["Under which conditions does a real gas behave most like an ideal gas?", "High temperature and low pressure", ["Low temperature and high pressure", "Low temperature and low pressure", "High temperature and high pressure"]],
      ["At high pressure, a gas's measured volume is larger than PV = nRT predicts. Why?", "The particles' own volume matters", ["The particles attract each other", "The particles move faster at high pressure", "Collisions with the walls are inelastic"]],
      ["Near its condensation point, a gas's measured pressure is lower than PV = nRT predicts. Why?", "Attractions soften collisions with the walls", ["The particles take up space", "The particles move faster", "The container expands"]],
      ["Which assumption of kinetic molecular theory fails most for NH₃ at low temperature?", "That gas particles do not attract each other", ["That gas particles move randomly", "That average kinetic energy depends on temperature", "That collisions with the walls cause pressure"]],
    ] as [string, string, string[]][]);
    const T = rand(2, 9) * 50;
    return q({
      key: `rg-why-${ask.slice(0, 20)}-${T}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Ideal gases assume particles have no volume and no attractions. Ask which assumption breaks down.",
      explain: `${ans}.`,
    });
  },
  () =>
    again(() => {
      const g = pick(["CO₂", "NH₃", "SO₂", "Cl₂", "H₂O"]);
      const n = 1;
      const V = rand(5, 20) / 10;
      const T = rand(300, 400);
      const ideal = (n * R * T) / V;
      return q({
        key: `rg-calc-${g}-${V}-${T}`,
        prompt: `1.00 mol of ${g} in a ${V.toFixed(1)} L flask at ${T} K. PV = nRT predicts ${sig(ideal)} atm. How will the measured pressure compare, and why?`,
        ...label("Lower: attractions soften wall collisions", [
          "Higher, because the molecules attract each other",
          "Exactly the same, because PV = nRT always holds",
          "Lower, because the molecules take up space",
        ]),
        hint: `${g} has strong intermolecular attractions, and the gas is crowded into a small volume.`,
        explain: `Strong attractions in ${g} pull molecules back as they approach the walls, so the real pressure is below ${sig(ideal)} atm.`,
      });
    }),
);

const SALTS_M: { f: string; ions: [string, number][] }[] = [
  { f: "NaCl", ions: [["Na⁺", 1], ["Cl⁻", 1]] },
  { f: "CaCl₂", ions: [["Ca²⁺", 1], ["Cl⁻", 2]] },
  { f: "K₂SO₄", ions: [["K⁺", 2], ["SO₄²⁻", 1]] },
  { f: "Al₂(SO₄)₃", ions: [["Al³⁺", 2], ["SO₄²⁻", 3]] },
  { f: "MgCl₂", ions: [["Mg²⁺", 1], ["Cl⁻", 2]] },
  { f: "Na₃PO₄", ions: [["Na⁺", 3], ["PO₄³⁻", 1]] },
  { f: "Fe(NO₃)₃", ions: [["Fe³⁺", 1], ["NO₃⁻", 3]] },
  { f: "KNO₃", ions: [["K⁺", 1], ["NO₃⁻", 1]] },
  { f: "(NH₄)₂SO₄", ions: [["NH₄⁺", 2], ["SO₄²⁻", 1]] },
];
const SOLUTES = ["NaCl", "KCl", "CuSO₄", "NaOH", "KNO₃", "C₆H₁₂O₆", "CaCl₂", "NH₄Cl", "KMnO₄", "AgNO₃", "Na₂CO₃", "MgSO₄"];

/** 3.7: molarity and dilution. */
export const molarity = mix(
  () =>
    again(() => {
      const s = pick(SOLUTES);
      const M = mm(s);
      const m = rand(100, 999) / 100;
      const V = rand(100, 500);
      const c = m / M / (V / 1000);
      if (!safe(c)) return null;
      return q({
        key: `mo-c-${s}-${m}-${V}`,
        prompt: `${m.toFixed(2)} g of ${s} (${M.toFixed(2)} g/mol) is dissolved to make ${V} mL of solution. What is the molarity? ${SF3}`,
        ...keypad(sf(c)),
        unit: "M",
        hint: "Molarity = moles of solute ÷ liters of solution. Convert mL to L.",
        explain: `${m.toFixed(2)} ÷ ${M.toFixed(2)} = ${(m / M).toFixed(5)} mol; ÷ ${(V / 1000).toFixed(3)} L = ${sig(c)} M.`,
      });
    }),
  () =>
    again(() => {
      const s = pick(SOLUTES);
      const M = mm(s);
      const c = rand(50, 500) / 1000;
      const V = pick([100, 250, 500, 1000]);
      const m = c * (V / 1000) * M;
      if (!safe(m)) return null;
      return q({
        key: `mo-m-${s}-${c}-${V}`,
        prompt: `What mass of ${s} (${M.toFixed(2)} g/mol) is needed to make ${V}. mL of a ${c.toFixed(3)} M solution? ${SF3}`,
        ...keypad(sf(m)),
        unit: "g",
        hint: "moles = M × V(L); mass = moles × molar mass.",
        explain: `${c.toFixed(3)} M × ${(V / 1000).toFixed(3)} L = ${(c * V / 1000).toFixed(5)} mol; × ${M.toFixed(2)} = ${sig(m)} g.`,
      });
    }),
  () =>
    again(() => {
      const c1 = pick([1, 2, 3, 6, 12, 18]) / (Math.random() < 0.5 ? 1 : 2);
      const V2 = pick([100, 250, 500, 1000]);
      const c2 = rand(50, 500) / 1000;
      const V1 = (c2 * V2) / c1;
      if (!safe(V1) || V1 >= V2) return null;
      return q({
        key: `mo-dil-${c1}-${V2}-${c2}`,
        prompt: `What volume of ${c1.toFixed(2)} M stock solution is needed to make ${V2}. mL of ${c2.toFixed(3)} M solution? ${SF3}`,
        ...keypad(sf(V1)),
        unit: "mL",
        hint: "Diluting doesn't change the moles of solute: M₁V₁ = M₂V₂.",
        explain: `V₁ = ${c2.toFixed(3)} × ${V2} ÷ ${c1.toFixed(2)} = ${sig(V1)} mL.`,
      });
    }),
  () => {
    const s = pick(SALTS_M);
    const c = rand(5, 60) * 0.01;
    const [ion, k] = pick(s.ions);
    return q({
      key: `mo-ion-${s.f}-${ion}-${c}`,
      prompt: `What is [${ion}] in a ${c.toFixed(2)} M solution of ${s.f}? (Assume it dissociates completely.)`,
      ...keypad(dp(c * k, 2)),
      unit: "M",
      hint: `Write the dissociation: one ${s.f} gives ${s.ions.map(([i, n]) => `${n} ${i}`).join(" + ")}.`,
      explain: `Each ${s.f} releases ${k} ${ion}, so [${ion}] = ${k} × ${c.toFixed(2)} = ${dp(c * k, 2).toFixed(2)} M.`,
    });
  },
  () =>
    again(() => {
      const c1 = pick([1, 2, 2.5, 4, 5]);
      const V2 = pick([100, 200, 250]);
      const V1 = rand(5, 50);
      const c2 = (c1 * V1) / V2;
      if (Math.abs(Math.round(c2 * 1000) - c2 * 1000) > 1e-6) return null;
      return q({
        key: `mo-do-${c1}-${V2}-${V1}`,
        prompt: `Do it: you need ${V2} mL of ${c2.toFixed(3)} M HCl. Measure out the volume of ${c1.toFixed(2)} M stock you'll dilute.`,
        speech: `You need ${V2} milliliters of ${c2.toFixed(3)} molar H C l. Measure out the volume of ${c1.toFixed(2)} molar stock you'll dilute.`,
        ...act({ kind: "chem-measure", mode: "fill", glass: "cylinder", target: V1, max: 50, step: 1, colour: "clear" }, V1),
        hint: "M₁V₁ = M₂V₂, so V₁ = M₂V₂ ÷ M₁.",
        explain: `V₁ = ${c2.toFixed(3)} × ${V2} ÷ ${c1.toFixed(2)} = ${V1} mL. Add water to make ${V2} mL.`,
      });
    }),
);

/** 3.8: particle pictures of solutions. */
export const solutionPictures = mix(
  () => {
    const s = pick(SALTS_M.filter((x) => x.ions.every(([, n]) => n <= 3)));
    const units = rand(2, 4);
    const others = shuffle(SALTS_M.filter((x) => x.f !== s.f && x.ions[0][1] * 10 + x.ions[1][1] !== s.ions[0][1] * 10 + s.ions[1][1])).slice(0, 3);
    return q({
      key: `sp-id-${s.f}-${units}`,
      prompt: "This particle diagram shows the ions in a solution of one salt (water not shown). Which salt was dissolved?",
      visual: { kind: "chem-particles", panels: [{ species: s.ions.map(([ion, n]) => ({ formula: ion, count: n * units })), container: "beaker" }] },
      needsVisual: true,
      ...label(s.f, others.map((o) => o.f)),
      hint: "Count each ion and find the ratio. The salt's formula has the same cation : anion ratio.",
      explain: `The picture shows ${s.ions.map(([ion, n]) => `${n * units} ${ion}`).join(" and ")}, a ${s.ions[0][1]} : ${s.ions[1][1]} ratio: ${s.f}.`,
    });
  },
  () => {
    const s = pick(SALTS_M.filter((x) => x.ions.every(([, n]) => n <= 2)));
    const a = rand(1, 3);
    const k = rand(2, 3);
    const b = a * k;
    const flip = Math.random() < 0.5;
    const [ua, ub] = flip ? [b, a] : [a, b];
    const panel = (u: number, lab: string) => ({ species: s.ions.map(([ion, n]) => ({ formula: ion, count: n * u })), container: "beaker" as const, label: lab });
    return q({
      key: `sp-ratio-${s.f}-${a}-${k}-${flip}`,
      prompt: `Beakers A and B hold equal volumes of ${s.f} solution. How many times more concentrated is the more concentrated one?`,
      visual: { kind: "chem-particles", panels: [panel(ua, "A"), panel(ub, "B")], joiner: "vs" },
      needsVisual: true,
      ...keypad(k),
      unit: "×",
      hint: "With equal volumes, concentration is proportional to the number of solute particles.",
      explain: `Beaker ${flip ? "A" : "B"} has ${b} formula units' worth of ions and the other has ${a}: ${k} times as concentrated.`,
    });
  },
  () => {
    const [ion, ans, wrong] = pick([
      ["Na⁺", "Water's δ− O end points toward Na⁺", "Water's δ+ H ends point toward Na⁺"],
      ["Cl⁻", "Water's δ+ H ends point toward Cl⁻", "Water's δ− O end points toward Cl⁻"],
      ["Mg²⁺", "Water's δ− O end points toward Mg²⁺", "Water's δ+ H ends point toward Mg²⁺"],
      ["F⁻", "Water's δ+ H ends point toward F⁻", "Water's δ− O end points toward F⁻"],
    ]);
    return q({
      key: `sp-orient-${ion}`,
      prompt: `In an aqueous solution, how are water molecules arranged around a ${ion} ion?`,
      visual: { kind: "chem-molecule", molecule: "H₂O", style: "ball" },
      ...label(ans, [wrong, "Water molecules point randomly", "Water molecules bond covalently to the ion"]),
      hint: "Water is polar: O is δ−, the H atoms are δ+. Opposite charges attract (ion–dipole forces).",
      explain: `${ans}, because opposite charges attract.`,
    });
  },
  () => {
    const s = pick(SALTS_M);
    const per = pick([0.01, 0.02, 0.05]);
    const units = rand(2, 4);
    const [ion, n] = pick(s.ions);
    const conc = dp(per * units * n, 2);
    return q({
      key: `sp-conc-${s.f}-${per}-${units}-${ion}`,
      prompt: `The diagram shows 1.0 L of ${s.f} solution, and each ion drawn stands for ${per.toFixed(2)} mol. What is [${ion}]?`,
      visual: { kind: "chem-particles", panels: [{ species: s.ions.map(([i, c]) => ({ formula: i, count: c * units })), container: "beaker" }] },
      needsVisual: true,
      ...keypad(conc),
      unit: "M",
      hint: `Count the ${ion} ions, multiply by ${per.toFixed(2)} mol, and divide by the volume.`,
      explain: `${units * n} ${ion} × ${per.toFixed(2)} mol = ${conc.toFixed(2)} mol in 1.0 L: ${conc.toFixed(2)} M.`,
    });
  },
);

/** 3.9: separating mixtures. */
export const separations = mix(
  () =>
    again(() => {
      const front = rand(80, 120) / 10;
      const spot = rand(10, Math.floor(front * 10) - 5) / 10;
      const rf = spot / front;
      if (!safeDp(rf, 2)) return null;
      return q({
        key: `sep-rf-${front}-${spot}`,
        prompt: `In a paper chromatogram, the solvent front moved ${front.toFixed(1)} cm and a dye spot moved ${spot.toFixed(1)} cm from the starting line. What is the dye's Rf? (2 decimal places)`,
        speech: `In a paper chromatogram, the solvent front moved ${front.toFixed(1)} centimeters and a dye spot moved ${spot.toFixed(1)} centimeters. What is the dye's R f value?`,
        visual: table(["Distance", "cm"], [["Solvent front", front.toFixed(1)], ["Dye spot", spot.toFixed(1)]]),
        ...keypad(dp(rf, 2)),
        hint: "Rf = distance moved by the spot ÷ distance moved by the solvent front.",
        explain: `Rf = ${spot.toFixed(1)} ÷ ${front.toFixed(1)} = ${dp(rf, 2).toFixed(2)}.`,
      });
    }),
  () =>
    again(() => {
      const rfs = shuffle([rand(10, 30), rand(40, 60), rand(70, 90)]).map((x) => x / 100);
      const mostPolar = Math.random() < 0.5;
      const names = ["A", "B", "C"];
      const idx = mostPolar ? rfs.indexOf(Math.min(...rfs)) : rfs.indexOf(Math.max(...rfs));
      return q({
        key: `sep-pol-${rfs.join("-")}-${mostPolar}`,
        prompt: `Three dyes are separated by paper chromatography: the paper is very polar and the solvent is less polar. Which dye is the ${mostPolar ? "most" : "least"} polar?`,
        visual: table(["Dye", "Rf"], names.map((n, i) => [n, rfs[i].toFixed(2)])),
        needsVisual: true,
        ...fixedLabels(names.map((n) => `Dye ${n}`), `Dye ${names[idx]}`),
        hint: "A dye that is attracted strongly to the polar paper moves slowly and has a small Rf.",
        explain: `Dye ${names[idx]} has the ${mostPolar ? "lowest" : "highest"} Rf (${rfs[idx].toFixed(2)}), so it is attracted ${mostPolar ? "most" : "least"} to the polar paper.`,
      });
    }),
  () =>
    again(() => {
      const pair = shuffle([["methanol", 65], ["water", 100], ["ethanol", 78], ["acetone", 56], ["hexane", 69], ["octane", 126], ["diethyl ether", 35], ["acetic acid", 118]] as [string, number][]).slice(0, 2);
      if (Math.abs(pair[0][1] - pair[1][1]) < 8) return null;
      const first = pair[0][1] < pair[1][1] ? pair[0] : pair[1];
      return q({
        key: `sep-dist-${pair.map((p) => p[0]).sort().join("-")}`,
        prompt: `A mixture of ${pair[0][0]} (bp ${pair[0][1]} °C) and ${pair[1][0]} (bp ${pair[1][1]} °C) is distilled. Which liquid collects first, and why?`,
        ...label(`${first[0]}: weaker intermolecular forces`, [
          `${first === pair[0] ? pair[1][0] : pair[0][0]}: weaker intermolecular forces`,
          `${first[0]}: its covalent bonds break first`,
          "Both together: they're mixed",
        ]),
        hint: "Distillation separates by boiling point. Weaker intermolecular forces → lower boiling point → vaporizes first.",
        explain: `${first[0]} boils at the lower temperature (${first[1]} °C), so it vaporizes and condenses first.`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["Why do the parts of a mixture separate in chromatography?", "Different attractions to the two phases", ["They have different colours", "Their bonds break at different rates", "They have different masses only"]],
      ["In column chromatography with a polar stationary phase and a nonpolar solvent, which compound comes out of the column first?", "The least polar compound", ["The most polar compound", "The heaviest compound", "They all come out together"]],
      ["Two liquids boil at 78 °C and 80 °C. Why is simple distillation a poor way to separate them?", "Both vaporize together", ["They have the same molar mass", "Distillation only works for solids", "They would react when heated"]],
    ] as [string, string, string[]][]);
    return q({
      key: `sep-why-${ask.slice(0, 20)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Separation works because components interact differently: with phases (chromatography) or with each other (boiling points).",
      explain: `${ans}.`,
    });
  },
);

const SOLVENT_PICKS: [string, number][] = [
  ["I₂", 1], ["NaCl", 0], ["CH₃OH", 0], ["C₈H₁₈ (octane)", 1], ["sucrose", 0], ["naphthalene, C₁₀H₈", 1], ["KNO₃", 0], ["CCl₄", 1], ["acetic acid", 0], ["Br₂", 1], ["NH₃", 0], ["cooking oil", 1], ["glucose", 0], ["wax", 1],
];

/** 3.10: solubility. */
export const solubility = mix(
  () => {
    const [s, w] = pick(SOLVENT_PICKS);
    const opts = ["Water (polar)", "Hexane, C₆H₁₄ (nonpolar)"];
    return q({
      key: `slb-solv-${s}`,
      prompt: `Which solvent will dissolve ${s} better?`,
      ...fixedLabels(opts, opts[w]),
      hint: "\"Like dissolves like\": polar and ionic solutes dissolve in polar solvents; nonpolar solutes dissolve in nonpolar solvents.",
      explain: w === 0 ? `${s} is ionic or polar (or hydrogen bonds), so it interacts well with water.` : `${s} is nonpolar, so London forces with hexane are similar to those it already has.`,
    });
  },
  () => {
    const [a, b, why] = pick([
      ["methanol (CH₃OH)", "1-octanol (C₈H₁₇OH)", "its H-bonding part dominates"],
      ["ethanol (C₂H₅OH)", "1-hexanol (C₆H₁₃OH)", "its H-bonding part dominates"],
      ["acetic acid (CH₃COOH)", "hexanoic acid (C₅H₁₁COOH)", "its nonpolar chain is shorter"],
      ["NH₃", "CH₄", "it can hydrogen bond with water"],
      ["HCl", "Cl₂", "it is polar (and ionizes in water)"],
    ]);
    const flip = Math.random() < 0.5;
    return q({
      key: `slb-more-${a}-${flip}`,
      prompt: `Which is more soluble in water: ${flip ? b : a} or ${flip ? a : b}?`,
      ...label(`${a.split(" ")[0]}: ${why}`, [`${b.split(" ")[0]}: it is larger`, `${b.split(" ")[0]}: more London forces`, "They are equally soluble"]),
      hint: "Water dissolves things that can hydrogen bond or interact with its dipole. Long nonpolar chains reduce solubility.",
      explain: `${a} is more soluble: ${why}.`,
    });
  },
  () => {
    const items = shuffle(SOLVENT_PICKS).slice(0, 6);
    return q({
      key: `slb-sort-${items.map((i) => i[0]).sort().join("")}`,
      prompt: "Do it: sort each substance by the solvent it dissolves in best.",
      ...act({ kind: "sort", bins: ["Water", "Hexane"], items: items.map(([s, w]) => ({ label: s, bin: w })) }, items.length),
      hint: "Ionic and polar solutes → water. Nonpolar solutes → hexane.",
      explain: items.map(([s, w]) => `${s}: ${w ? "hexane" : "water"}`).join("; ") + ".",
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Why does KCl dissolve in water?", "Ion–dipole attractions to water", ["KCl reacts with water", "Water molecules are ionic", "KCl molecules are nonpolar"]],
      ["Why doesn't oil dissolve in water?", "Water H-bonds to itself more than to oil", ["Oil molecules are too heavy", "Oil is ionic", "Oil and water have the same polarity"]],
      ["Why does I₂ dissolve better in hexane than in water?", "Both are nonpolar (London forces)", ["I₂ is ionic", "I₂ hydrogen bonds with hexane", "Water molecules repel I₂"]],
    ] as [string, string, string[]][]);
    return q({
      key: `slb-why-${ask.slice(0, 18)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "A solute dissolves when the new solute–solvent attractions are comparable to those being broken.",
      explain: `${ans}.`,
    });
  },
);

const HC = 1986.4; // hc in 10⁻¹⁹ J·nm
const CONSTS = "h = 6.626 × 10⁻³⁴ J·s, c = 2.998 × 10⁸ m/s";
const WORK: [string, number][] = [["Cs", 3.4], ["Na", 3.65], ["Ca", 4.6], ["Mg", 5.86], ["Zn", 6.88], ["Cu", 7.53]];

/** 3.11 / 3.12: spectroscopy and photon energy. */
export const lightAndPhotons = mix(
  () => {
    const [region, wl, trans] = pick([
      ["microwave", pick(["1.2 cm", "3.0 cm", "5.0 mm"]), "Makes it rotate"],
      ["infrared", pick(["5.0 μm", "10.0 μm", "3.4 μm"]), "Makes its bonds vibrate"],
      ["ultraviolet", pick(["250 nm", "200 nm", "310 nm"]), "Moves electrons to higher levels"],
      ["visible", pick(["450 nm", "520 nm", "650 nm"]), "Moves electrons to higher levels"],
    ] as [string, string, string][]);
    return q({
      key: `lp-reg-${region}-${wl}`,
      prompt: `A molecule absorbs ${region} radiation with a wavelength of ${wl}. What does the absorbed energy do to the molecule?`,
      ...label(trans, ["Makes it rotate", "Makes its bonds vibrate", "Moves electrons to higher levels", "Splits its nuclei"].filter((x) => x !== trans)),
      hint: "Microwaves → rotation. Infrared → vibration. Visible and UV → electronic transitions.",
      explain: `${region[0].toUpperCase()}${region.slice(1)} photons have the right energy for ${trans.toLowerCase()}.`,
    });
  },
  () =>
    again(() => {
      const lam = rand(380, 750);
      const nu = 2998 / lam;
      if (!safe(nu)) return null;
      return q({
        key: `lp-nu-${lam}`,
        prompt: `What is the frequency of light with a wavelength of ${lam} nm? (c = 2.998 × 10⁸ m/s) Answer in units of 10¹⁴ Hz, ${SF3.toLowerCase()}`,
        ...keypad(sf(nu)),
        unit: "× 10¹⁴ Hz",
        hint: "ν = c ÷ λ. Convert nm to m first (1 nm = 10⁻⁹ m).",
        explain: `ν = 2.998 × 10⁸ ÷ ${lam} × 10⁻⁹ = ${sig(nu)} × 10¹⁴ Hz.`,
      });
    }),
  () =>
    again(() => {
      const lam = rand(150, 800);
      const E = HC / lam;
      if (!safe(E)) return null;
      return q({
        key: `lp-E-${lam}`,
        prompt: `What is the energy of one photon of ${lam} nm light? (${CONSTS}) Answer in units of 10⁻¹⁹ J, ${SF3.toLowerCase()}`,
        ...keypad(sf(E)),
        unit: "× 10⁻¹⁹ J",
        hint: "E = hc ÷ λ, with λ in meters.",
        explain: `E = (6.626 × 10⁻³⁴)(2.998 × 10⁸) ÷ (${lam} × 10⁻⁹) = ${sig(E)} × 10⁻¹⁹ J.`,
      });
    }),
  () =>
    again(() => {
      const lam = rand(150, 700);
      const E = (HC / lam) * 60.22;
      if (!safe(E)) return null;
      return q({
        key: `lp-mol-${lam}`,
        prompt: `What is the energy of one mole of photons of ${lam} nm light, in kJ/mol? (${CONSTS}, Nₐ = 6.022 × 10²³ /mol) ${SF3}`,
        ...keypad(sf(E)),
        unit: "kJ/mol",
        hint: "Find E for one photon (hc/λ), multiply by Avogadro's number, then convert J to kJ.",
        explain: `One photon: ${sig(HC / lam, 4)} × 10⁻¹⁹ J. × 6.022 × 10²³ = ${sig(E * 1000, 4)} J/mol = ${sig(E)} kJ/mol.`,
      });
    }),
  () => {
    const lines = shuffle([410, 434, 486, 656, 589, 700, 380, 520]).slice(0, 4);
    const hi = Math.random() < 0.5;
    const ans = hi ? Math.min(...lines) : Math.max(...lines);
    return q({
      key: `lp-line-${lines.join("-")}-${hi}`,
      prompt: `An emission spectrum has lines at ${lines.join(", ")} nm. Which line comes from the electron transition with the ${hi ? "largest" : "smallest"} energy change?`,
      visual: { kind: "chem-spectrum", mode: "emission", lines: lines.map((nm) => ({ nm, label: nm })) },
      ...label(`${ans} nm`, lines.filter((l) => l !== ans).map((l) => `${l} nm`)),
      hint: "E = hc/λ: shorter wavelength means higher energy.",
      explain: `The ${hi ? "shortest" : "longest"} wavelength, ${ans} nm, has the ${hi ? "largest" : "smallest"} photon energy.`,
    });
  },
  () =>
    again(() => {
      const [metal, phi] = pick(WORK);
      const lam = rand(150, 500);
      const E = HC / lam;
      const ke = E - phi;
      if (ke < -0.2) {
        return q({
          key: `lp-pe-no-${metal}-${lam}`,
          prompt: `Light of ${lam} nm shines on ${nameOf(metal).toLowerCase()}, whose work function is ${phi.toFixed(2)} × 10⁻¹⁹ J. Are electrons ejected? (${CONSTS})`,
          ...label("No: each photon has too little energy", [
            "Yes, if the light is bright enough",
            "Yes: each photon has more than enough",
            "No: metals never emit electrons",
          ]),
          hint: "One photon ejects one electron, but only if the photon's energy is at least the work function. Brightness doesn't change that.",
          explain: `E = hc/λ = ${sig(E)} × 10⁻¹⁹ J < ${phi.toFixed(2)} × 10⁻¹⁹ J, so no electrons are ejected.`,
        });
      }
      if (ke < 0 || !safe(ke) || ke < 1) return null;
      return q({
        key: `lp-pe-${metal}-${lam}`,
        prompt: `Light of ${lam} nm shines on ${nameOf(metal).toLowerCase()} (work function ${phi.toFixed(2)} × 10⁻¹⁹ J). What is the maximum kinetic energy of an ejected electron, in units of 10⁻¹⁹ J? (${CONSTS}) ${SF3}`,
        ...keypad(sf(ke)),
        unit: "× 10⁻¹⁹ J",
        hint: "KE = hν − (work function), with hν = hc/λ.",
        explain: `E = ${sig(E, 4)} × 10⁻¹⁹ J; KE = ${sig(E, 4)} − ${phi.toFixed(2)} = ${sig(ke)} × 10⁻¹⁹ J.`,
      });
    }),
);

/** 3.13: the Beer–Lambert law. */
export const beerLambert = mix(
  () =>
    again(() => {
      const eps = rand(100, 900) * 10;
      const A = rand(100, 950) / 1000;
      const b = pick([1, 1, 2]);
      const c = (A / (eps * b)) * 1e4;
      if (!safe(c)) return null;
      return q({
        key: `bl-c-${eps}-${A}-${b}`,
        prompt: `A solution has absorbance ${A.toFixed(3)} in a ${b}.00 cm cuvette. The molar absorptivity is ε = ${eps.toLocaleString("en-US")} L/(mol·cm). What is the concentration, in units of 10⁻⁴ M? ${SF3}`,
        ...keypad(sf(c)),
        unit: "× 10⁻⁴ M",
        hint: "A = εbc, so c = A ÷ (εb).",
        explain: `c = ${A.toFixed(3)} ÷ (${eps} × ${b}) = ${sig(c)} × 10⁻⁴ M.`,
      });
    }),
  () =>
    again(() => {
      const c = rand(10, 99) / 1e5;
      const A = rand(100, 900) / 1000;
      const eps = A / c;
      if (!safe(eps)) return null;
      return q({
        key: `bl-eps-${c}-${A}`,
        prompt: `A ${sci(c, 2)} M solution has an absorbance of ${A.toFixed(3)} in a 1.00 cm cuvette. What is ε in L/(mol·cm)? ${SF3}`,
        ...keypad(sf(eps)),
        unit: "L/(mol·cm)",
        hint: "ε = A ÷ (bc).",
        explain: `ε = ${A.toFixed(3)} ÷ (1.00 × ${sci(c, 2)}) = ${sig(eps)} L/(mol·cm).`,
      });
    }),
  () =>
    again(() => {
      const k = rand(10, 19) / 100;
      const cu = rand(10, 50) / 10;
      const Au = k * cu;
      return q({
        key: `bl-cal-${k}-${cu}`,
        prompt: `The calibration line was made from five standards. An unknown has A = ${Au.toFixed(3)}. What is its concentration in 10⁻⁴ M?`,
        visual: { kind: "plot", xLabel: "concentration (× 10⁻⁴ M)", yLabel: "absorbance", x: [0, 6], y: [0, 1], points: [1, 2, 3, 4, 5].map((x) => ({ x, y: dp(k * x, 3) })), lines: [{ from: [0, 0], to: [6, 6 * k] }] },
        needsVisual: true,
        ...choose(cu, [cu + 0.7, cu - 0.7, cu * 2, dp(Au * 10, 1)].filter((x) => x > 0), 0.6, 0.1),
        unit: "× 10⁻⁴ M",
        hint: "Find the absorbance on the y-axis, go across to the line, then down to read the concentration.",
        explain: `The line has slope ${k.toFixed(2)} per 10⁻⁴ M, so c = ${Au.toFixed(3)} ÷ ${k.toFixed(2)} = ${cu.toFixed(1)} × 10⁻⁴ M.`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["A student leaves fingerprints on the cuvette before measuring the unknown. How does this affect the calculated concentration?", "Too high: the smudges absorb or scatter light, raising A", ["Too low: the smudges let more light through", "No effect, because ε doesn't change", "No effect, because the cuvette was clean for the standards"]],
      ["The unknown is measured in a 2.00 cm cuvette, but the calibration used 1.00 cm. If the student ignores this, the calculated concentration will be…", "Twice the true value, because A doubles with path length", ["Half the true value", "Correct, because ε is the same", "Four times the true value"]],
      ["Why is the wavelength of maximum absorbance (λmax) chosen for Beer–Lambert measurements?", "A changes most with c there (most sensitive)", ["The light is brightest there", "ε is zero there", "Only that wavelength obeys A = εbc"]],
      ["The cuvette had a few drops of water in it before the sample was added. How does this affect the measured concentration?", "Too low: the sample was diluted, so A is smaller", ["Too high: water absorbs light", "No effect: water is colourless", "Too high: the volume increased"]],
      ["If a solution is diluted to half its concentration, what happens to its absorbance?", "It halves, because A is proportional to c", ["It doubles", "It stays the same", "It drops to one-quarter"]],
    ] as [string, string, string[]][]);
    return q({
      key: `bl-err-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "A = εbc. Anything that changes A (extra absorbing, path length, dilution) shows up in the calculated c.",
      explain: `${ans}.`,
    });
  },
  () => {
    const m = pick([0.5, 1, 1.5, 2]);
    return q({
      key: `bl-draw-${m}`,
      prompt: `Do it: a dye has ε = ${(m * 1000).toLocaleString("en-US")} L/(mol·cm) and b = 1.00 cm. Draw A (up, in units of 0.1) against c (across, in units of 10⁻⁴ M).`,
      speech: `A dye has a molar absorptivity of ${m * 1000} liters per mole centimeter, in a 1 centimeter cuvette. Draw absorbance, in tenths, against concentration, in units of 10 to the minus 4 molar.`,
      ...act({ kind: "drawLine", m, b: 0, size: 8, quadrants: 1 }, m),
      hint: "A = εbc is a straight line through the origin. Work out A for c = 1 × 10⁻⁴ M or 2 × 10⁻⁴ M.",
      explain: `At c = 2 × 10⁻⁴ M, A = ${m * 1000} × 1.00 × 2 × 10⁻⁴ = ${(m * 0.2).toFixed(1)} (that's ${m * 2} tenths). Join it to the origin.`,
    });
  },
);

/* ======================================================= Unit 4: reactions */


interface Scenario {
  what: string;
  tag: string;
  before: GlassPanel;
  after: GlassPanel;
  chemical: boolean;
  seen: string;
}
const beaker = (p: Partial<GlassPanel>): GlassPanel => ({ glass: "beaker", volume: 150, colour: "clear", ...p });
const SCENARIOS: Scenario[] = [
  { what: "Magnesium ribbon is dropped into hydrochloric acid.", tag: "Mg fizzes in HCl", before: beaker({ thermometer: 22 }), after: beaker({ thermometer: 31, bubbles: true }), chemical: true, seen: "Gas bubbles form and the temperature rises" },
  { what: "Silver nitrate solution is mixed with sodium chloride solution.", tag: "AgNO₃ + NaCl turns cloudy", before: beaker({}), after: beaker({ precipitate: true }), chemical: true, seen: "A white solid (precipitate) forms" },
  { what: "Lead(II) nitrate solution is mixed with potassium iodide solution.", tag: "A yellow solid forms from two solutions", before: beaker({}), after: beaker({ precipitate: "sun" }), chemical: true, seen: "A yellow precipitate forms" },
  { what: "Copper(II) sulfate solution is mixed with sodium hydroxide solution.", tag: "A blue solid forms from two solutions", before: beaker({ colour: "wave" }), after: beaker({ precipitate: "wave" }), chemical: true, seen: "A blue precipitate forms" },
  { what: "Baking soda is added to vinegar.", tag: "Baking soda fizzes in vinegar", before: beaker({ thermometer: 22 }), after: beaker({ thermometer: 16, bubbles: true }), chemical: true, seen: "Gas bubbles form and the temperature drops" },
  { what: "Iron(III) nitrate solution is mixed with potassium thiocyanate solution.", tag: "Two solutions mix and turn deep red", before: beaker({ colour: "sun" }), after: beaker({ colour: "berry" }), chemical: true, seen: "The colour turns from pale yellow to deep red" },
  { what: "Phenolphthalein is added to sodium hydroxide solution.", tag: "NaOH turns pink with phenolphthalein", before: beaker({}), after: beaker({ colour: "rose" }), chemical: true, seen: "The colour changes to pink" },
  { what: "Zinc is added to copper(II) sulfate solution.", tag: "Zn in CuSO₄: blue fades, brown solid", before: beaker({ colour: "wave", thermometer: 22 }), after: beaker({ precipitate: "cocoa", thermometer: 28 }), chemical: true, seen: "The blue fades and a brown solid forms" },
  { what: "Water is heated until it boils.", tag: "Water boils and bubbles", before: beaker({ thermometer: 25 }), after: beaker({ thermometer: 100, bubbles: true, volume: 120 }), chemical: false, seen: "Bubbles form, but they are only water vapor" },
  { what: "Sugar is stirred into water until it disappears.", tag: "Sugar disappears into water", before: beaker({ precipitate: true }), after: beaker({}), chemical: false, seen: "The sugar seems to vanish but is just spread out" },
  { what: "Ice is added to a glass of water.", tag: "Ice cools a glass of water", before: beaker({ thermometer: 22 }), after: beaker({ thermometer: 5, volume: 180 }), chemical: false, seen: "The temperature drops, but no new substance forms" },
  { what: "A blue copper(II) sulfate solution is diluted with water.", tag: "Blue CuSO₄ is diluted with water", before: beaker({ colour: "wave", volume: 80 }), after: beaker({ colour: "wave", volume: 200 }), chemical: false, seen: "The volume increases, but the same substances are present" },
];

/** 4.1: recognizing that a reaction happened. */
export const evidence = mix(
  () => {
    const s = pick(SCENARIOS);
    const right = s.chemical ? "Chemical: a new substance forms" : "Physical: no new substance forms";
    return q({
      key: `ev-cls-${s.what.slice(0, 24)}`,
      prompt: `${s.what} Is this a chemical or a physical change?`,
      visual: { kind: "chem-beaker", panels: [{ ...s.before, label: "Before" }, { ...s.after, label: "After" }] },
      ...label(right, s.chemical ? ["Physical: no new substance forms", "Physical: it can be undone", "Chemical: the volume changes"] : ["Chemical: a new substance forms", "Chemical: the temperature changes", "Chemical: bubbles appear"]),
      hint: "A chemical change makes new substances: look for gas made from liquids, a precipitate, a colour change, or heat given out or taken in by a reaction.",
      explain: `${s.chemical ? "Chemical" : "Physical"} change. ${s.seen}.`,
    });
  },
  () => {
    const s = pick(SCENARIOS.filter((x) => x.chemical));
    const wrong = SCENARIOS.filter((x) => x.chemical && x.seen !== s.seen).map((x) => x.seen);
    return q({
      key: `ev-seen-${s.what.slice(0, 24)}`,
      prompt: "What evidence of a chemical reaction do these before and after pictures show?",
      visual: { kind: "chem-beaker", panels: [{ ...s.before, label: "Before" }, { ...s.after, label: "After" }] },
      needsVisual: true,
      ...label(s.seen, shuffle(wrong)),
      hint: "Compare the two beakers: bubbles, solid, colour and the thermometer.",
      explain: `${s.what} ${s.seen}.`,
    });
  },
  () => {
    const phys = shuffle(SCENARIOS.filter((x) => !x.chemical))[0];
    const chem = shuffle(SCENARIOS.filter((x) => x.chemical)).slice(0, 3);
    return q({
      key: `ev-not-${phys.what.slice(0, 20)}-${chem.map((c) => c.what.slice(0, 6)).join("")}`,
      prompt: "Which of these is NOT evidence that a chemical reaction happened?",
      ...label(phys.tag, chem.map((c) => c.tag)),
      hint: "Ask: is a new substance formed, or is it the same substance in a different form or place?",
      explain: `${phys.what} ${phys.seen}.`,
    });
  },
);

interface Ion {
  ion: string;
  core: string;
  c: number;
  source: string;
  spect: string;
  poly?: boolean;
}
const CATIONS: Ion[] = [
  { ion: "Ag⁺", core: "Ag", c: 1, source: "AgNO₃", spect: "NO₃⁻" },
  { ion: "Pb²⁺", core: "Pb", c: 2, source: "Pb(NO₃)₂", spect: "NO₃⁻" },
  { ion: "Ba²⁺", core: "Ba", c: 2, source: "Ba(NO₃)₂", spect: "NO₃⁻" },
  { ion: "Ca²⁺", core: "Ca", c: 2, source: "Ca(NO₃)₂", spect: "NO₃⁻" },
  { ion: "Cu²⁺", core: "Cu", c: 2, source: "Cu(NO₃)₂", spect: "NO₃⁻" },
  { ion: "Fe³⁺", core: "Fe", c: 3, source: "Fe(NO₃)₃", spect: "NO₃⁻" },
  { ion: "Mg²⁺", core: "Mg", c: 2, source: "Mg(NO₃)₂", spect: "NO₃⁻" },
];
const ANIONS: Ion[] = [
  { ion: "Cl⁻", core: "Cl", c: 1, source: "NaCl", spect: "Na⁺" },
  { ion: "I⁻", core: "I", c: 1, source: "KI", spect: "K⁺" },
  { ion: "Br⁻", core: "Br", c: 1, source: "NaBr", spect: "Na⁺" },
  { ion: "SO₄²⁻", core: "SO₄", c: 2, source: "Na₂SO₄", spect: "Na⁺", poly: true },
  { ion: "CO₃²⁻", core: "CO₃", c: 2, source: "Na₂CO₃", spect: "Na⁺", poly: true },
  { ion: "OH⁻", core: "OH", c: 1, source: "NaOH", spect: "Na⁺", poly: true },
  { ion: "PO₄³⁻", core: "PO₄", c: 3, source: "Na₃PO₄", spect: "Na⁺", poly: true },
];
const INSOLUBLE: [string, string][] = [
  ["Ag", "Cl"], ["Ag", "Br"], ["Ag", "I"], ["Ag", "CO₃"], ["Ag", "PO₄"],
  ["Pb", "I"], ["Pb", "SO₄"], ["Pb", "CO₃"], ["Pb", "OH"], ["Pb", "PO₄"],
  ["Ba", "SO₄"], ["Ba", "CO₃"], ["Ba", "PO₄"], ["Ca", "CO₃"], ["Ca", "PO₄"],
  ["Cu", "CO₃"], ["Cu", "OH"], ["Cu", "PO₄"], ["Fe", "OH"], ["Fe", "PO₄"], ["Mg", "OH"], ["Mg", "CO₃"], ["Mg", "PO₄"],
];
const coef = (n: number) => (n === 1 ? "" : String(n));

function precipitation() {
  const [cs, as] = pick(INSOLUBLE);
  const cat = CATIONS.find((c) => c.core === cs)!;
  const an = ANIONS.find((a) => a.core === as)!;
  const ppt = ionicFormula(cat.core, cat.c, an.core, an.c, an.poly);
  const g = gcd(cat.c, an.c);
  const nc = an.c / g;
  const na = cat.c / g;
  const spectSalt = `${an.spect === "K⁺" ? "K" : "Na"}NO₃`;
  const net = `${coef(nc)}${cat.ion}(aq) + ${coef(na)}${an.ion}(aq) → ${ppt}(s)`;
  return { cat, an, ppt, nc, na, spectSalt, net };
}

/** 4.2: net ionic equations. */
export const netIonic = mix(
  () => {
    const p = precipitation();
    const wrongFormula = `${p.cat.ion}(aq) + ${p.an.ion}(aq) → ${p.cat.core}${p.an.core}(s)`;
    const wrongCoef = p.nc === 1 && p.na === 1 ? `2${p.cat.ion}(aq) + ${p.an.ion}(aq) → ${p.ppt}(s)` : `${p.cat.ion}(aq) + ${p.an.ion}(aq) → ${p.ppt}(s)`;
    const spect = `${p.an.spect}(aq) + NO₃⁻(aq) → ${p.spectSalt}(s)`;
    return q({
      key: `ni-ppt-${p.ppt}`,
      prompt: `Solutions of ${p.cat.source} and ${p.an.source} are mixed and ${p.ppt} precipitates. What is the net ionic equation?`,
      visual: reaction([p.cat.source, p.an.source], [p.ppt, p.spectSalt], { states: ["aq", "aq", "s", "aq"] }),
      ...label(p.net, [wrongFormula, wrongCoef, spect].filter((w) => w !== p.net)),
      hint: "Split the soluble ionic compounds into ions, cross out the ions that appear unchanged on both sides, and balance atoms and charge.",
      explain: `${p.an.spect} and NO₃⁻ are spectators. Net: ${p.net}.`,
    });
  },
  () => {
    const p = precipitation();
    const right = `${p.an.spect} and NO₃⁻`;
    return q({
      key: `ni-spect-${p.ppt}-${p.an.source}`,
      prompt: `When ${p.cat.source}(aq) and ${p.an.source}(aq) are mixed, ${p.ppt}(s) forms. Which ions are spectator ions?`,
      visual: reaction([p.cat.source, p.an.source], [p.ppt, p.spectSalt], { states: ["aq", "aq", "s", "aq"] }),
      ...label(right, [`${p.cat.ion} and ${p.an.ion}`, `${p.cat.ion} and NO₃⁻`, `${p.an.spect} and ${p.an.ion}`]),
      hint: "Spectator ions are in solution before and after; they don't end up in the precipitate.",
      explain: `${p.cat.ion} and ${p.an.ion} form ${p.ppt}; ${right} stay dissolved.`,
    });
  },
  () => {
    const p = precipitation();
    return q({
      key: `ni-which-${p.ppt}-${p.cat.source}`,
      prompt: `Solutions of ${p.cat.source} and ${p.an.source} are mixed. Which solid precipitates? (All sodium, potassium and nitrate salts are soluble.)`,
      ...label(p.ppt, [p.spectSalt, `${p.cat.core}${p.an.core}`, `${p.an.spect === "K⁺" ? "K" : "Na"}${p.cat.core}`]),
      hint: "Swap partners. The salt of Na⁺ or K⁺ with NO₃⁻ stays dissolved, so the other product must be the solid.",
      explain: `The ions swap partners: ${p.spectSalt} stays in solution, so ${p.ppt} is the precipitate.`,
    });
  },
  () => {
    const [desc, net, wrongs] = pick([
      ["HCl(aq) and NaOH(aq) (a strong acid and a strong base)", "H⁺(aq) + OH⁻(aq) → H₂O(l)", ["HCl(aq) + OH⁻(aq) → Cl⁻(aq) + H₂O(l)", "Na⁺(aq) + Cl⁻(aq) → NaCl(s)", "H⁺(aq) + NaOH(aq) → Na⁺(aq) + H₂O(l)"]],
      ["HNO₃(aq) and KOH(aq) (a strong acid and a strong base)", "H⁺(aq) + OH⁻(aq) → H₂O(l)", ["K⁺(aq) + NO₃⁻(aq) → KNO₃(s)", "HNO₃(aq) + OH⁻(aq) → NO₃⁻(aq) + H₂O(l)", "H⁺(aq) + KOH(s) → K⁺(aq) + H₂O(l)"]],
      ["CH₃COOH(aq) (a weak acid) and NaOH(aq)", "CH₃COOH(aq) + OH⁻(aq) → CH₃COO⁻(aq) + H₂O(l)", ["H⁺(aq) + OH⁻(aq) → H₂O(l)", "CH₃COO⁻(aq) + Na⁺(aq) → CH₃COONa(s)", "CH₃COOH(aq) + Na⁺(aq) → CH₃COONa(aq) + H⁺(aq)"]],
      ["HF(aq) (a weak acid) and KOH(aq)", "HF(aq) + OH⁻(aq) → F⁻(aq) + H₂O(l)", ["H⁺(aq) + OH⁻(aq) → H₂O(l)", "K⁺(aq) + F⁻(aq) → KF(s)", "HF(aq) + K⁺(aq) → KF(aq) + H⁺(aq)"]],
      ["NH₃(aq) (a weak base) and HCl(aq)", "NH₃(aq) + H⁺(aq) → NH₄⁺(aq)", ["H⁺(aq) + OH⁻(aq) → H₂O(l)", "NH₄⁺(aq) + Cl⁻(aq) → NH₄Cl(s)", "NH₃(aq) + HCl(aq) → NH₄Cl(s)"]],
      ["solid CaCO₃ and HCl(aq)", "CaCO₃(s) + 2H⁺(aq) → Ca²⁺(aq) + H₂O(l) + CO₂(g)", ["CO₃²⁻(aq) + 2H⁺(aq) → H₂O(l) + CO₂(g)", "Ca²⁺(aq) + 2Cl⁻(aq) → CaCl₂(s)", "CaCO₃(s) + H⁺(aq) → Ca²⁺(aq) + HCO₃⁻(aq) + CO₂(g)"]],
    ] as [string, string, string[]][]);
    return q({
      key: `ni-ab-${desc.slice(0, 16)}`,
      prompt: `What is the net ionic equation for the reaction between ${desc}?`,
      ...label(net, wrongs),
      hint: "Strong acids and soluble ionic compounds are written as ions. Weak acids, weak bases, solids, water and gases stay as formulas.",
      explain: `Net ionic equation: ${net}.`,
    });
  },
);

/** Simple reactions for particle pictures. */
const PARTICLE_RXNS: { r: [string, string]; p: string[]; c: number[] }[] = [
  { r: ["H₂", "O₂"], p: ["H₂O"], c: [2, 1, 2] },
  { r: ["N₂", "H₂"], p: ["NH₃"], c: [1, 3, 2] },
  { r: ["CO", "O₂"], p: ["CO₂"], c: [2, 1, 2] },
  { r: ["H₂", "Cl₂"], p: ["HCl"], c: [1, 1, 2] },
  { r: ["NO", "O₂"], p: ["NO₂"], c: [2, 1, 2] },
  { r: ["N₂", "O₂"], p: ["NO"], c: [1, 1, 2] },
  { r: ["SO₂", "O₂"], p: ["SO₃"], c: [2, 1, 2] },
  { r: ["CH₄", "O₂"], p: ["CO₂", "H₂O"], c: [1, 2, 1, 2] },
  { r: ["H₂", "F₂"], p: ["HF"], c: [1, 1, 2] },
  { r: ["N₂", "F₂"], p: ["NF₃"], c: [1, 3, 2] },
];

function runParticles(rx: (typeof PARTICLE_RXNS)[number], a: number, b: number) {
  const runs = Math.min(Math.floor(a / rx.c[0]), Math.floor(b / rx.c[1]));
  const leftA = a - runs * rx.c[0];
  const leftB = b - runs * rx.c[1];
  const made = rx.p.map((_, i) => runs * rx.c[2 + i]);
  return { runs, leftA, leftB, made };
}

/** 4.3: representing reactions with particle diagrams. */
export const particleReactions = mix(
  () =>
    again(() => {
      const rx = pick(PARTICLE_RXNS);
      const a = rand(2, 8);
      const b = rand(2, 8);
      const { runs, leftA, leftB, made } = runParticles(rx, a, b);
      if (runs < 1 || made.reduce((x, y) => x + y, 0) + leftA + leftB > 24) return null;
      const eq = eqText(rx.r, rx.p, rx.c);
      const literal = eqText(rx.r, rx.p, [a, b, ...made]);
      const wrongs = [literal, eqText(rx.r, rx.p, rx.c.map((x) => (x === 1 ? 1 : 1))), eqText(rx.r, rx.p, rx.c.map((x) => x * 2))].filter((w) => w !== eq);
      const after = [
        ...rx.p.map((f, i) => ({ formula: f, count: made[i] })),
        ...(leftA ? [{ formula: rx.r[0], count: leftA, ring: true }] : []),
        ...(leftB ? [{ formula: rx.r[1], count: leftB, ring: true }] : []),
      ];
      return q({
        key: `pr-eq-${rx.r.join("")}-${a}-${b}`,
        prompt: "Which balanced equation best represents the reaction in this particle diagram?",
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: rx.r[0], count: a }, { formula: rx.r[1], count: b }], label: "Before" }, { species: after, label: "After" }] },
        needsVisual: true,
        ...label(eq, wrongs.length >= 2 ? wrongs : [...wrongs, `${rx.r[0]} + ${rx.r[1]} → ${rx.p.join(" + ")}`]),
        hint: "Count only the particles that reacted (leftovers are not part of the equation), then reduce to the smallest whole-number ratio.",
        explain: `${runs * rx.c[0]} ${rx.r[0]} react with ${runs * rx.c[1]} ${rx.r[1]}; in lowest terms that's ${eq}.`,
      });
    }),
  () =>
    again(() => {
      const rx = pick(PARTICLE_RXNS);
      const a = rand(2, 9);
      const b = rand(2, 9);
      const { runs, leftA, leftB, made } = runParticles(rx, a, b);
      if (runs < 1 || (!leftA && !leftB)) return null;
      const askA = leftA > 0;
      const left = askA ? leftA : leftB;
      const f = askA ? rx.r[0] : rx.r[1];
      return q({
        key: `pr-left-${rx.r.join("")}-${a}-${b}`,
        prompt: `For ${eqText(rx.r, rx.p, rx.c)}, the box shows the reactants. After the reaction goes as far as it can, how many ${f} molecules are left over?`,
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: rx.r[0], count: a }, { formula: rx.r[1], count: b }], label: "Before" }] },
        needsVisual: true,
        ...keypad(left),
        hint: `See how many times the reaction can run: ${a} ÷ ${rx.c[0]} for ${rx.r[0]} and ${b} ÷ ${rx.c[1]} for ${rx.r[1]}. The smaller number wins.`,
        explain: `The reaction runs ${runs} times, using ${runs * rx.c[0]} ${rx.r[0]} and ${runs * rx.c[1]} ${rx.r[1]}, making ${made.map((m, i) => `${m} ${rx.p[i]}`).join(" and ")}. ${left} ${f} remain.`,
      });
    }),
  () =>
    again(() => {
      const rx = pick(PARTICLE_RXNS);
      const a = rand(2, 9);
      const b = rand(2, 9);
      const { runs, made } = runParticles(rx, a, b);
      if (runs < 1) return null;
      const limA = Math.floor(a / rx.c[0]) < Math.floor(b / rx.c[1]);
      const limB = Math.floor(a / rx.c[0]) > Math.floor(b / rx.c[1]);
      if (!limA && !limB) return null;
      const ask = Math.random() < 0.5;
      if (ask) {
        const lim = limA ? rx.r[0] : rx.r[1];
        return q({
          key: `pr-lim-${rx.r.join("")}-${a}-${b}`,
          prompt: `For ${eqText(rx.r, rx.p, rx.c)}, which reactant in this box is the limiting reactant?`,
          visual: { kind: "chem-particles", panels: [{ species: [{ formula: rx.r[0], count: a }, { formula: rx.r[1], count: b }] }] },
          needsVisual: true,
          ...fixedLabels([rx.r[0], rx.r[1], "Neither: they run out together"], lim),
          hint: "Divide each count by its coefficient. The reactant with the smaller result runs out first.",
          explain: `${rx.r[0]}: ${a} ÷ ${rx.c[0]} = ${(a / rx.c[0]).toFixed(1)}; ${rx.r[1]}: ${b} ÷ ${rx.c[1]} = ${(b / rx.c[1]).toFixed(1)}. ${lim} runs out first.`,
        });
      }
      return q({
        key: `pr-made-${rx.r.join("")}-${a}-${b}`,
        prompt: `For ${eqText(rx.r, rx.p, rx.c)}, how many ${rx.p[0]} molecules can this box of reactants make?`,
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: rx.r[0], count: a }, { formula: rx.r[1], count: b }] }] },
        needsVisual: true,
        ...keypad(made[0]),
        hint: "Find how many times the reaction can run (the limiting reactant decides), then multiply by the product's coefficient.",
        explain: `The reaction can run ${runs} times, making ${runs} × ${rx.c[2]} = ${made[0]} ${rx.p[0]}.`,
      });
    }),
);

const CHANGES: [string, number][] = [
  ["🧊 Ice melts", 0], ["💧 Water boils", 0], ["🧂 Salt water evaporates, leaving salt", 0], ["✂️ Paper is cut", 0], ["🍬 Sugar dissolves in tea", 0], ["❄️ Dry ice sublimes", 0],
  ["🪨 A rock is crushed", 0], ["🫗 Alcohol is distilled from a mixture", 0], ["🧲 Iron filings are pulled out of sand", 0],
  ["🔥 Methane burns", 1], ["🍂 Iron rusts", 1], ["🍳 An egg cooks", 1], ["🥛 Milk sours", 1], ["🍞 Bread dough rises with yeast", 1], ["🔋 A battery discharges", 1],
  ["🧪 Vinegar and baking soda fizz", 1], ["🌿 Photosynthesis makes glucose", 1], ["⚡ Water is split into H₂ and O₂ by electricity", 1],
];

/** 4.4: physical versus chemical change. */
export const physicalChemical = mix(
  () => {
    const items = [...shuffle(CHANGES.filter((c) => c[1] === 0)).slice(0, 3), ...shuffle(CHANGES.filter((c) => c[1] === 1)).slice(0, 3)];
    return q({
      key: `pc-sort-${items.map((i) => i[0]).sort().join("")}`,
      prompt: "Do it: sort each change into physical or chemical.",
      ...act({ kind: "sort", bins: ["Physical change", "Chemical change"], items: items.map(([l, b]) => ({ label: l, bin: b })) }, items.length),
      hint: "Chemical changes break and form bonds to make new substances. Physical changes alter form, state or mixing only.",
      explain: items.map(([l, b]) => `${l.replace(/^\S+\s/, "")}: ${b ? "chemical" : "physical"}`).join("; ") + ".",
    });
  },
  () => {
    const f = pick(["H₂O", "Br₂", "I₂", "CO₂", "CH₄", "NH₃"]);
    const [arr1, arr2] = pick([["solid", "liquid"], ["liquid", "gas"], ["solid", "gas"], ["liquid", "solid"]] as ["solid" | "liquid" | "gas", "solid" | "liquid" | "gas"][]);
    const rx = pick(PARTICLE_RXNS.filter((r) => r.p.length === 1));
    const chem = Math.random() < 0.5;
    const visual: Visual = chem
      ? { kind: "chem-particles", panels: [{ species: [{ formula: rx.r[0], count: rx.c[0] * 2 }, { formula: rx.r[1], count: rx.c[1] * 2 }] }, { species: [{ formula: rx.p[0], count: rx.c[2] * 2 }] }] }
      : { kind: "chem-particles", panels: [{ species: [{ formula: f, count: 9 }], arrangement: arr1 }, { species: [{ formula: f, count: 9 }], arrangement: arr2 }] };
    return q({
      key: `pc-pic-${chem ? rx.r.join("") : f + arr1 + arr2}`,
      prompt: "Does this particle diagram show a physical or a chemical change?",
      visual,
      needsVisual: true,
      ...label(chem ? "Chemical: atoms rearrange into new molecules" : "Physical: the same molecules, just arranged differently", [
        chem ? "Physical: the same molecules, just arranged differently" : "Chemical: atoms rearrange into new molecules",
        "Chemical: the particles move faster",
        "Physical: the number of atoms changes",
      ]),
      hint: "Compare the molecules before and after. New kinds of molecules mean a chemical change.",
      explain: chem ? `${rx.r.join(" and ")} become ${rx.p[0]}: new substances, so it's chemical.` : `${f} molecules stay intact; only their arrangement changes (${arr1} → ${arr2}).`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["When water boils, what is broken?", "Hydrogen bonds between water molecules", ["Covalent O–H bonds inside water molecules", "Ionic bonds", "Hydrogen and oxygen atoms"]],
      ["When iodine sublimes, what is overcome?", "London dispersion forces between I₂ molecules", ["The covalent I–I bond", "Ionic bonds between I⁺ and I⁻", "Hydrogen bonds"]],
      ["When hydrogen burns in oxygen, what happens to the bonds?", "H–H and O=O bonds break and new O–H bonds form", ["Only intermolecular forces are overcome", "No bonds change; the molecules just mix", "Only O=O bonds break"]],
      ["Which process is a chemical change?", "Electrolysis of water into H₂ and O₂", ["Condensing steam", "Dissolving sugar in water", "Melting butter"]],
    ] as [string, string, string[]][]);
    return q({
      key: `pc-why-${ask.slice(0, 20)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Physical changes overcome intermolecular forces; chemical changes break and make covalent or ionic bonds.",
      explain: `${ans}.`,
    });
  },
);

/** Equations to balance (reactants, products). */
const TO_BALANCE: [string[], string[]][] = [
  [["C₃H₈", "O₂"], ["CO₂", "H₂O"]],
  [["C₂H₆", "O₂"], ["CO₂", "H₂O"]],
  [["Al", "O₂"], ["Al₂O₃"]],
  [["Fe", "O₂"], ["Fe₂O₃"]],
  [["N₂", "H₂"], ["NH₃"]],
  [["KClO₃"], ["KCl", "O₂"]],
  [["Al", "HCl"], ["AlCl₃", "H₂"]],
  [["Fe₂O₃", "CO"], ["Fe", "CO₂"]],
  [["NH₃", "O₂"], ["NO", "H₂O"]],
  [["C₆H₁₂O₆", "O₂"], ["CO₂", "H₂O"]],
  [["Cu", "Ag⁺"], ["Cu²⁺", "Ag"]],
  [["Al", "Cu²⁺"], ["Al³⁺", "Cu"]],
  [["P₄", "O₂"], ["P₄O₁₀"]],
  [["Ca(OH)₂", "H₃PO₄"], ["Ca₃(PO₄)₂", "H₂O"]],
  [["Na", "H₂O"], ["NaOH", "H₂"]],
  [["C₄H₁₀", "O₂"], ["CO₂", "H₂O"]],
  [["MnO₄⁻", "Fe²⁺", "H⁺"], ["Mn²⁺", "Fe³⁺", "H₂O"]],
  [["Pb(NO₃)₂", "KI"], ["PbI₂", "KNO₃"]],
];

/** 4.3/4.5 Do it: balance equations. */
export function balanceEquations(): Question {
  const i = rand(0, TO_BALANCE.length - 1);
  const [r, p] = TO_BALANCE[i];
  const c = coefsOf(r, p);
  const max = Math.max(10, ...c);
  return q({
    key: `bal-${i}`,
    prompt: `Do it: balance ${r.join(" + ")} → ${p.join(" + ")} with the smallest whole-number coefficients.`,
    ...act({ kind: "chem-balance", reactants: r, products: p, max }, Math.max(...c)),
    hint: r.some((f) => /[⁺⁻]/.test(f)) ? "Balance the atoms, then check that the total charge is the same on both sides." : "Balance elements that appear in only one formula on each side first; leave H and O (or a lone element like O₂) for last.",
    explain: `${eqText(r, p, c)}.`,
  });
}

/** Stoichiometry reactions (reactants, products) for mass problems. */
const STOICH: [string[], string[]][] = [
  [["H₂", "O₂"], ["H₂O"]],
  [["N₂", "H₂"], ["NH₃"]],
  [["CH₄", "O₂"], ["CO₂", "H₂O"]],
  [["C₃H₈", "O₂"], ["CO₂", "H₂O"]],
  [["Al", "Cl₂"], ["AlCl₃"]],
  [["Fe₂O₃", "CO"], ["Fe", "CO₂"]],
  [["Fe", "O₂"], ["Fe₂O₃"]],
  [["Na", "Cl₂"], ["NaCl"]],
  [["Zn", "HCl"], ["ZnCl₂", "H₂"]],
  [["C₂H₆", "O₂"], ["CO₂", "H₂O"]],
  [["Mg", "O₂"], ["MgO"]],
  [["Al", "Fe₂O₃"], ["Al₂O₃", "Fe"]],
];

/** 4.5: stoichiometry, limiting reactant and percent yield. */
export const stoichiometry = mix(
  () =>
    again(() => {
      const [r, p] = pick(STOICH);
      const c = coefsOf(r, p);
      const ri = rand(0, r.length - 1);
      const pi = rand(0, p.length - 1);
      const A = r[ri];
      const B = p[pi];
      const mA = rand(100, 999) / 10;
      const mB = ((mA / mm(A)) * c[r.length + pi]) / c[ri] * mm(B);
      if (!safe(mB)) return null;
      return q({
        key: `st-mm-${A}-${B}-${mA}`,
        prompt: `${eqText(r, p, c)}. What mass of ${B} forms from ${mA.toFixed(1)} g of ${A} (with plenty of the other reactant)? (${A} ${mmText(A)}, ${B} ${mmText(B)} g/mol) ${SF3}`,
        visual: reaction(r, p),
        ...keypad(sf(mB)),
        unit: "g",
        hint: `grams ${A} → moles ${A} → (× ${c[r.length + pi]}/${c[ri]}) moles ${B} → grams ${B}.`,
        explain: `${mA.toFixed(1)} ÷ ${mmText(A)} = ${(mA / mm(A)).toFixed(4)} mol ${A}; × ${c[r.length + pi]}/${c[ri]} = ${((mA / mm(A)) * c[r.length + pi] / c[ri]).toFixed(4)} mol ${B}; × ${mmText(B)} = ${sig(mB)} g.`,
      });
    }),
  () =>
    again(() => {
      const [r, p] = pick(STOICH);
      const c = coefsOf(r, p);
      const mA = rand(50, 500) / 10;
      const mB = rand(50, 500) / 10;
      const runsA = mA / mm(r[0]) / c[0];
      const runsB = mB / mm(r[1]) / c[1];
      if (Math.abs(runsA - runsB) / Math.max(runsA, runsB) < 0.1) return null;
      const lim = runsA < runsB ? r[0] : r[1];
      const B = p[0];
      const mProd = Math.min(runsA, runsB) * c[r.length] * mm(B);
      if (!safe(mProd)) return null;
      const askMass = Math.random() < 0.5;
      if (!askMass) {
        return q({
          key: `st-lim-${r.join("")}-${mA}-${mB}`,
          prompt: `${eqText(r, p, c)}. ${mA.toFixed(1)} g of ${r[0]} reacts with ${mB.toFixed(1)} g of ${r[1]}. Which is the limiting reactant? (${r[0]} ${mmText(r[0])}, ${r[1]} ${mmText(r[1])} g/mol)`,
          visual: reaction(r, p),
          ...fixedLabels([r[0], r[1]], lim),
          hint: "Convert both to moles and divide each by its coefficient. The smaller result is limiting.",
          explain: `${r[0]}: ${(mA / mm(r[0])).toFixed(4)} mol ÷ ${c[0]} = ${runsA.toFixed(4)}; ${r[1]}: ${(mB / mm(r[1])).toFixed(4)} mol ÷ ${c[1]} = ${runsB.toFixed(4)}. ${lim} is limiting.`,
        });
      }
      return q({
        key: `st-limm-${r.join("")}-${mA}-${mB}`,
        prompt: `${eqText(r, p, c)}. ${mA.toFixed(1)} g of ${r[0]} reacts with ${mB.toFixed(1)} g of ${r[1]}. What mass of ${B} can form? (${r[0]} ${mmText(r[0])}, ${r[1]} ${mmText(r[1])}, ${B} ${mmText(B)} g/mol) ${SF3}`,
        visual: reaction(r, p),
        ...keypad(sf(mProd)),
        unit: "g",
        hint: "Find the limiting reactant first (moles ÷ coefficient). Only it decides how much product forms.",
        explain: `${lim} is limiting (${Math.min(runsA, runsB).toFixed(4)} reaction-moles). × ${c[r.length]} × ${mmText(B)} = ${sig(mProd)} g of ${B}.`,
      });
    }),
  () =>
    again(() => {
      const [r, p] = pick(STOICH);
      const c = coefsOf(r, p);
      const A = r[0];
      const B = p[0];
      const mA = rand(100, 500) / 10;
      const theo = ((mA / mm(A)) * c[r.length]) / c[0] * mm(B);
      const yieldPct = rand(55, 95);
      const actualText = sig((theo * yieldPct) / 100);
      const actual = Number(actualText);
      const pct = (actual / theo) * 100;
      if (!safe(pct) || !safe(theo)) return null;
      return q({
        key: `st-yld-${A}-${B}-${mA}-${yieldPct}`,
        prompt: `${eqText(r, p, c)}. ${mA.toFixed(1)} g of ${A} reacts completely and ${actualText} g of ${B} is collected. What is the percent yield? (${A} ${mmText(A)}, ${B} ${mmText(B)} g/mol) ${SF3}`,
        visual: reaction(r, p),
        ...keypad(sf(pct)),
        unit: "%",
        hint: "Find the theoretical yield from the stoichiometry, then percent yield = actual ÷ theoretical × 100.",
        explain: `Theoretical: ${sig(theo, 4)} g. ${actualText} ÷ ${sig(theo, 4)} × 100 = ${sig(pct)}%.`,
      });
    }),
  () =>
    again(() => {
      const [r, p] = pick(STOICH.filter(([rr]) => rr.length === 2));
      const c = coefsOf(r, p);
      const mA = rand(50, 300) / 10;
      const mB = rand(50, 300) / 10;
      const runsA = mA / mm(r[0]) / c[0];
      const runsB = mB / mm(r[1]) / c[1];
      if (Math.abs(runsA - runsB) / Math.max(runsA, runsB) < 0.15) return null;
      const [ex, exM, exC, runs] = runsA < runsB ? [r[1], mB, c[1], runsA] : [r[0], mA, c[0], runsB];
      const left = exM - runs * exC * mm(ex);
      if (!safe(left) || left < 0.5) return null;
      return q({
        key: `st-ex-${r.join("")}-${mA}-${mB}`,
        prompt: `${eqText(r, p, c)}. ${mA.toFixed(1)} g of ${r[0]} reacts with ${mB.toFixed(1)} g of ${r[1]}. What mass of the excess reactant is left over? (${r[0]} ${mmText(r[0])}, ${r[1]} ${mmText(r[1])} g/mol) ${SF3}`,
        visual: reaction(r, p),
        ...keypad(sf(left)),
        unit: "g",
        hint: "Find the limiting reactant, work out how much of the other one it uses up, and subtract from what you started with.",
        explain: `${ex} is in excess. It uses ${(runs * exC * mm(ex)).toFixed(3)} g, leaving ${exM.toFixed(1)} − ${(runs * exC * mm(ex)).toFixed(3)} = ${sig(left)} g.`,
      });
    }),
);

/** 4.5 Do it: limiting reactant with particles. */
export function limitingDo(): Question {
  return again(() => {
    const rx = pick(PARTICLE_RXNS);
    const a = rand(2, 10);
    const b = rand(2, 10);
    const { runs, made, leftA, leftB } = runParticles(rx, a, b);
    if (runs < 1 || a + b > 20 || made.reduce((x, y) => x + y, 0) + leftA + leftB > 24) return null;
    return q({
      key: `lim-${rx.r.join("")}-${a}-${b}`,
      prompt: `Do it: run ${eqText(rx.r, rx.p, rx.c)} as many times as these molecules allow.`,
      ...act({ kind: "chem-mix", mode: "limiting", reactants: [{ formula: rx.r[0], count: a }, { formula: rx.r[1], count: b }], products: rx.p }, runs),
      hint: `Each run uses ${rx.c[0]} ${rx.r[0]} and ${rx.c[1]} ${rx.r[1]}. Keep going until one of them runs out.`,
      explain: `${a} ÷ ${rx.c[0]} and ${b} ÷ ${rx.c[1]}: the reaction runs ${runs} times. ${leftA ? `${leftA} ${rx.r[0]} left over.` : leftB ? `${leftB} ${rx.r[1]} left over.` : "Nothing is left over."}`,
    });
  });
}

/** 4.6: titration. */
export const titration = mix(
  () =>
    again(() => {
      const [acid, protons] = pick([["HCl", 1], ["HNO₃", 1], ["CH₃COOH", 1], ["H₂SO₄", 2]] as [string, number][]);
      const [base, oh] = pick([["NaOH", 1], ["KOH", 1], ["Ba(OH)₂", 2]] as [string, number][]);
      const Va = pick([10, 15, 20, 25]);
      const Mb = rand(80, 200) / 1000;
      const Vb = rand(1000, 4500) / 100;
      const Ma = (Mb * Vb * oh) / (protons * Va);
      if (!safe(Ma)) return null;
      return q({
        key: `ti-M-${acid}-${base}-${Va}-${Mb}-${Vb}`,
        prompt: `${Va}.00 mL of ${acid} is titrated with ${Mb.toFixed(3)} M ${base}. The end point is reached after ${Vb.toFixed(2)} mL. What is the concentration of the ${acid}? ${SF3}`,
        visual: { kind: "chem-titration", mode: "burette", reading: Vb, flask: "rose" },
        ...keypad(sf(Ma)),
        unit: "M",
        hint: `mol OH⁻ = M × V × ${oh}. Each ${acid} gives ${protons} H⁺. Divide moles of acid by its volume in liters.`,
        explain: `mol OH⁻ = ${Mb.toFixed(3)} × ${(Vb / 1000).toFixed(5)} × ${oh} = ${((Mb * Vb * oh) / 1000).toFixed(6)}; mol ${acid} = that ÷ ${protons}; ÷ ${(Va / 1000).toFixed(5)} L = ${sig(Ma)} M.`,
      });
    }),
  () => {
    const r = rand(50, 495) / 10;
    return q({
      key: `ti-read-${r}`,
      prompt: "What is the burette reading? Read the bottom of the meniscus, to 0.1 mL.",
      visual: { kind: "chem-titration", mode: "burette", reading: r, ask: true, flask: "clear" },
      needsVisual: true,
      ...keypad(r),
      unit: "mL",
      hint: "Burette numbers increase downward. Read where the bottom of the curved surface sits.",
      explain: `The meniscus sits at ${r.toFixed(1)} mL.`,
    });
  },
  () =>
    again(() => {
      const conc = pick([0.1, 0.12, 0.15, 0.2, 0.25]);
      const vol = pick([10, 20, 25, 30]);
      const tc = pick([0.1, 0.125, 0.2, 0.25]);
      const eq = (conc * vol) / tc;
      if (eq < 8 || eq > 45 || Math.abs(eq - Math.round(eq * 10) / 10) > 1e-9) return null;
      const weak = Math.random() < 0.5;
      return q({
        key: `ti-eq-${conc}-${vol}-${tc}-${weak}`,
        prompt: `This curve is for ${vol}.0 mL of ${weak ? "a weak acid" : "HCl"} titrated with ${tc} M NaOH. At what volume of NaOH is the equivalence point?`,
        visual: { kind: "chem-titration", mode: "curve", analyte: "acid", conc, volume: vol, titrantConc: tc, equivalence: "?", ...(weak ? { pK: 4.76 } : {}) },
        needsVisual: true,
        ...choose(dp(eq, 1), [dp(eq / 2, 1), dp(eq * 2, 1), vol], 5, 1),
        unit: "mL",
        hint: "The equivalence point is the middle of the steep vertical jump in pH.",
        explain: `Equivalence at ${dp(eq, 1)} mL, where moles of NaOH equal moles of acid: ${conc} M × ${vol} mL ÷ ${tc} M.`,
      });
    }),
  () =>
    again(() => {
      const m = rand(300, 900) / 1000;
      const V = rand(1500, 4500) / 100;
      const M = m / 204.22 / (V / 1000);
      if (!safe(M)) return null;
      return q({
        key: `ti-khp-${m}-${V}`,
        prompt: `To standardize NaOH, ${m.toFixed(3)} g of KHP (KHC₈H₄O₄, 204.22 g/mol, one acidic H) needs ${V.toFixed(2)} mL of NaOH to reach the end point. What is the NaOH concentration? ${SF3}`,
        ...keypad(sf(M)),
        unit: "M",
        hint: "mol KHP = mass ÷ 204.22 = mol NaOH (1 : 1). Divide by the NaOH volume in liters.",
        explain: `${m.toFixed(3)} ÷ 204.22 = ${(m / 204.22).toFixed(6)} mol; ÷ ${(V / 1000).toFixed(5)} L = ${sig(M)} M.`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["An air bubble in the burette tip disappears during the titration. How does this affect the calculated acid concentration?", "Too high: recorded volume is too large", ["Too low: less NaOH reacted", "No effect: the bubble is only air", "Too low: the bubble diluted the NaOH"]],
      ["The burette was rinsed with water but not with the NaOH solution. How does this affect the calculated acid concentration?", "Too high: the NaOH was diluted, so more volume was needed", ["Too low: the NaOH became more concentrated", "No effect: water doesn't react", "Too low: less NaOH was needed"]],
      ["The student overshoots the end point (the solution turns dark pink). How does this affect the calculated acid concentration?", "Too high: more NaOH than needed was recorded", ["Too low", "No effect, because the colour doesn't matter", "Too low, because the indicator used up NaOH"]],
      ["Extra water is added to the acid in the flask before titrating. How does this affect the result?", "No effect: the moles of acid are unchanged", ["Too high: there is more liquid", "Too low: the acid is diluted", "Too high: water is an acid"]],
    ] as [string, string, string[]][]);
    return q({
      key: `ti-err-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "The calculation uses moles of titrant = M × recorded volume. Ask how the error changes the recorded volume or the moles really present.",
      explain: `${ans}.`,
    });
  },
);

const RXN_TYPES = ["Acid–base", "Oxidation–reduction", "Precipitation"];
const TYPED: [string[], string[], number, (StateSymbol | null)[]][] = [
  [["HCl", "NaOH"], ["NaCl", "H₂O"], 0, ["aq", "aq", "aq", "l"]],
  [["Zn", "Cu²⁺"], ["Zn²⁺", "Cu"], 1, ["s", "aq", "aq", "s"]],
  [["Ag⁺", "Cl⁻"], ["AgCl"], 2, ["aq", "aq", "s"]],
  [["CH₄", "O₂"], ["CO₂", "H₂O"], 1, ["g", "g", "g", "g"]],
  [["Mg", "O₂"], ["MgO"], 1, ["s", "g", "s"]],
  [["H₂SO₄", "KOH"], ["K₂SO₄", "H₂O"], 0, ["aq", "aq", "aq", "l"]],
  [["Ba²⁺", "SO₄²⁻"], ["BaSO₄"], 2, ["aq", "aq", "s"]],
  [["NH₃", "HCl"], ["NH₄Cl"], 0, ["aq", "aq", "aq"]],
  [["H₂O₂"], ["H₂O", "O₂"], 1, ["aq", "l", "g"]],
  [["Pb²⁺", "I⁻"], ["PbI₂"], 2, ["aq", "aq", "s"]],
  [["Na", "Cl₂"], ["NaCl"], 1, ["s", "g", "s"]],
  [["CaCO₃", "HCl"], ["CaCl₂", "H₂O", "CO₂"], 0, ["s", "aq", "aq", "l", "g"]],
  [["Fe³⁺", "OH⁻"], ["Fe(OH)₃"], 2, ["aq", "aq", "s"]],
  [["Cu", "Ag⁺"], ["Cu²⁺", "Ag"], 1, ["s", "aq", "aq", "s"]],
  [["HF", "OH⁻"], ["F⁻", "H₂O"], 0, ["aq", "aq", "aq", "l"]],
  [["Ca²⁺", "CO₃²⁻"], ["CaCO₃"], 2, ["aq", "aq", "s"]],
];

/** 4.7: types of chemical reactions. */
export const reactionTypes = mix(
  () => {
    const i = rand(0, TYPED.length - 1);
    const [r, p, t, st] = TYPED[i];
    return q({
      key: `rt-cls-${i}`,
      prompt: "What type of reaction is this?",
      visual: reaction(r, p, { states: st }),
      needsVisual: true,
      ...fixedLabels(RXN_TYPES, RXN_TYPES[t]),
      hint: "H⁺ transferred → acid–base. Oxidation numbers change (electrons transferred) → redox. Ions in solution combine into a solid → precipitation.",
      explain: t === 0 ? "A proton (H⁺) is transferred from an acid to a base." : t === 1 ? "Electrons are transferred: oxidation numbers change." : "Dissolved ions combine to form an insoluble solid.",
    });
  },
  () => {
    const set = shuffle(TYPED.map((x, i) => [x, i] as const)).slice(0, 6);
    return q({
      key: `rt-sort-${set.map(([, i]) => i).sort((a, b) => a - b).join("-")}`,
      prompt: "Do it: sort each reaction by type.",
      ...act({ kind: "sort", bins: RXN_TYPES, items: set.map(([[r, p, t]]) => ({ label: eqText(r, p, coefsOf(r, p)), bin: t })) }, set.length),
      hint: "Look for H⁺ moving (acid–base), changing charges on atoms or elements becoming ions (redox), or a solid forming from ions (precipitation).",
      explain: set.map(([[r, p, t]]) => `${eqText(r, p, coefsOf(r, p))}: ${RXN_TYPES[t].toLowerCase()}`).join("; ") + ".",
    });
  },
  () => {
    const notRedox = pick(TYPED.filter((x) => x[2] !== 1));
    const redox = shuffle(TYPED.filter((x) => x[2] === 1)).slice(0, 3);
    const text = (x: (typeof TYPED)[number]) => eqText(x[0], x[1], coefsOf(x[0], x[1]));
    return q({
      key: `rt-notredox-${text(notRedox)}-${redox.map(text).join("")}`,
      prompt: "Which reaction is NOT an oxidation–reduction reaction?",
      ...label(text(notRedox), redox.map(text)),
      hint: "In redox, some element's oxidation number changes. Free elements (like Zn, O₂, Na) turning into compounds or ions are a giveaway.",
      explain: `In ${text(notRedox)}, no oxidation numbers change, so it's ${RXN_TYPES[notRedox[2]].toLowerCase()}, not redox.`,
    });
  },
);

/** Brønsted–Lowry reactions: [acid, base, conjugate base, conjugate acid, arrow]. */
const BL: [string, string, string, string, "→" | "⇌"][] = [
  ["HF", "H₂O", "F⁻", "H₃O⁺", "⇌"],
  ["H₂O", "NH₃", "OH⁻", "NH₄⁺", "⇌"],
  ["CH₃COOH", "H₂O", "CH₃COO⁻", "H₃O⁺", "⇌"],
  ["HCO₃⁻", "OH⁻", "CO₃²⁻", "H₂O", "→"],
  ["H₃O⁺", "HCO₃⁻", "H₂O", "H₂CO₃", "→"],
  ["NH₄⁺", "OH⁻", "NH₃", "H₂O", "→"],
  ["HSO₄⁻", "H₂O", "SO₄²⁻", "H₃O⁺", "⇌"],
  ["H₂O", "CH₃NH₂", "OH⁻", "CH₃NH₃⁺", "⇌"],
  ["HCN", "NH₃", "CN⁻", "NH₄⁺", "⇌"],
  ["H₂PO₄⁻", "OH⁻", "HPO₄²⁻", "H₂O", "→"],
  ["CH₃COOH", "NH₃", "CH₃COO⁻", "NH₄⁺", "→"],
  ["HNO₂", "CN⁻", "NO₂⁻", "HCN", "⇌"],
];
const CONJ_BASE: [string, string][] = [["H₂SO₄", "HSO₄⁻"], ["HSO₄⁻", "SO₄²⁻"], ["H₂PO₄⁻", "HPO₄²⁻"], ["NH₄⁺", "NH₃"], ["H₂O", "OH⁻"], ["H₃O⁺", "H₂O"], ["HCO₃⁻", "CO₃²⁻"], ["H₂CO₃", "HCO₃⁻"], ["HF", "F⁻"], ["CH₃COOH", "CH₃COO⁻"], ["HPO₄²⁻", "PO₄³⁻"], ["HCN", "CN⁻"]];

/** Remove or add one H⁺ to a formula, for wrong answers. */
function plusH(f: string): string {
  const p = parseFormula(f);
  const atoms = { ...p.atoms, H: (p.atoms.H ?? 0) + 1 };
  const ch = p.charge + 1;
  return `${formulaFrom(atoms)}${ch === 0 ? "" : `${Math.abs(ch) === 1 ? "" : SUPN(Math.abs(ch))}${ch > 0 ? "⁺" : "⁻"}`}`;
}

/** 4.8: Brønsted–Lowry acid–base reactions. */
export const acidBase = mix(
  () => {
    const i = rand(0, BL.length - 1);
    const [a, b, cb, ca, arrow] = BL[i];
    const role = pick(["acid", "base", "conjugate base", "conjugate acid"] as const);
    const ans = role === "acid" ? a : role === "base" ? b : role === "conjugate base" ? cb : ca;
    return q({
      key: `ab-role-${i}-${role}`,
      prompt: `In this reaction, which species is the Brønsted–Lowry ${role}${role.startsWith("conj") ? ` (formed from the ${role === "conjugate base" ? "acid" : "base"})` : ""}?`,
      visual: reaction([a, b], [cb, ca], { arrow }),
      needsVisual: true,
      ...fixedLabels([a, b, cb, ca], ans),
      hint: "The acid donates H⁺ and becomes its conjugate base; the base accepts H⁺ and becomes its conjugate acid.",
      explain: `${a} gives H⁺ to ${b}. Acid ${a} → conjugate base ${cb}; base ${b} → conjugate acid ${ca}.`,
    });
  },
  () => {
    const i = rand(0, BL.length - 1);
    const [a, b, cb, ca, arrow] = BL[i];
    return q({
      key: `ab-pair-${i}`,
      prompt: "Which is a conjugate acid–base pair in this reaction?",
      visual: reaction([a, b], [cb, ca], { arrow }),
      needsVisual: true,
      ...label(`${a} / ${cb}`, [`${a} / ${b}`, `${a} / ${ca}`, `${cb} / ${ca}`]),
      hint: "A conjugate pair differs by exactly one H⁺.",
      explain: `${a} and ${cb} differ by one H⁺ (as do ${b} and ${ca}).`,
    });
  },
  () => {
    const [acid, base] = pick(CONJ_BASE);
    const askBase = Math.random() < 0.5;
    const given = askBase ? acid : base;
    const ans = askBase ? base : acid;
    const wrongs = askBase ? [plusH(acid), plusH(base) === acid ? `${acid}⁻` : plusH(base)] : [plusH(acid), base === "OH⁻" ? "O²⁻" : `${base}⁻`];
    return q({
      key: `ab-conj-${given}-${askBase}`,
      prompt: `What is the conjugate ${askBase ? "base" : "acid"} of ${given}?`,
      ...label(ans, [...wrongs.filter((w) => w !== ans && w !== given), given === "H₂O" ? "H₂O₂" : "H₂", "OH⁻", "H₃O⁺"].filter((w) => w !== ans)),
      hint: askBase ? "Remove one H⁺: one fewer H and one more negative charge." : "Add one H⁺: one more H and one more positive charge.",
      explain: `${given} ${askBase ? "−" : "+"} H⁺ → ${ans}.`,
    });
  },
  () => {
    const amph = pick(["H₂O", "HCO₃⁻", "HSO₄⁻", "H₂PO₄⁻", "HPO₄²⁻"]);
    const not = shuffle(["Cl⁻", "NH₄⁺", "CO₃²⁻", "F⁻", "H₃O⁺", "PO₄³⁻", "NO₃⁻"]).slice(0, 3);
    return q({
      key: `ab-amph-${amph}-${not.join("")}`,
      prompt: "Which species is amphoteric (can act as both a Brønsted–Lowry acid and a base)?",
      ...label(amph, not),
      hint: "It needs an H⁺ it can give away AND a way to accept another H⁺ (a lone pair or negative charge).",
      explain: `${amph} can lose H⁺ (→ ${CONJ_BASE.find(([a]) => a === amph)?.[1] ?? "its conjugate base"}) or gain H⁺ (→ ${plusH(amph)}).`,
    });
  },
);

/** Oxidation numbers: [formula, element, oxidation number]. */
const OXNUM: [string, string, number][] = [
  ["SO₄²⁻", "S", 6], ["H₂S", "S", -2], ["SO₂", "S", 4], ["S₂O₃²⁻", "S", 2], ["MnO₄⁻", "Mn", 7], ["MnO₂", "Mn", 4], ["Cr₂O₇²⁻", "Cr", 6],
  ["CrO₄²⁻", "Cr", 6], ["NH₃", "N", -3], ["NO₃⁻", "N", 5], ["NO₂", "N", 4], ["N₂O", "N", 1], ["NO", "N", 2], ["N₂H₄", "N", -2], ["HNO₂", "N", 3],
  ["CH₄", "C", -4], ["CO₂", "C", 4], ["CO", "C", 2], ["CH₂O", "C", 0], ["C₂O₄²⁻", "C", 3], ["ClO₄⁻", "Cl", 7], ["ClO₃⁻", "Cl", 5], ["ClO⁻", "Cl", 1],
  ["Cl₂", "Cl", 0], ["HCl", "Cl", -1], ["PO₄³⁻", "P", 5], ["Fe₂O₃", "Fe", 3], ["H₂O₂", "O", -1], ["NaH", "H", -1], ["VO²⁺", "V", 4],
];

/** Redox reactions: [reactants, products, oxidized, reduced, electrons]. */
const REDOX: [string[], string[], string, string, number][] = [
  [["Zn", "Cu²⁺"], ["Zn²⁺", "Cu"], "Zn", "Cu²⁺", 2],
  [["Cu", "Ag⁺"], ["Cu²⁺", "Ag"], "Cu", "Ag⁺", 2],
  [["Al", "Cu²⁺"], ["Al³⁺", "Cu"], "Al", "Cu²⁺", 6],
  [["Mg", "H⁺"], ["Mg²⁺", "H₂"], "Mg", "H⁺", 2],
  [["Na", "Cl₂"], ["NaCl"], "Na", "Cl₂", 2],
  [["Fe₂O₃", "CO"], ["Fe", "CO₂"], "CO", "Fe₂O₃", 6],
  [["Fe³⁺", "Sn²⁺"], ["Fe²⁺", "Sn⁴⁺"], "Sn²⁺", "Fe³⁺", 2],
  [["Cl₂", "Br⁻"], ["Cl⁻", "Br₂"], "Br⁻", "Cl₂", 2],
  [["H₂", "O₂"], ["H₂O"], "H₂", "O₂", 4],
  [["CH₄", "O₂"], ["CO₂", "H₂O"], "CH₄", "O₂", 8],
  [["MnO₄⁻", "Fe²⁺", "H⁺"], ["Mn²⁺", "Fe³⁺", "H₂O"], "Fe²⁺", "MnO₄⁻", 5],
  [["Cr₂O₇²⁻", "Fe²⁺", "H⁺"], ["Cr³⁺", "Fe³⁺", "H₂O"], "Fe²⁺", "Cr₂O₇²⁻", 6],
  [["Ni", "Ag⁺"], ["Ni²⁺", "Ag"], "Ni", "Ag⁺", 2],
  [["Ag", "NO₃⁻", "H⁺"], ["Ag⁺", "NO", "H₂O"], "Ag", "NO₃⁻", 3],
];

/** 4.9: oxidation–reduction. */
export const redox = mix(
  () => {
    const [f, el, ox] = pick(OXNUM);
    return q({
      key: `rx-ox-${f}-${el}`,
      prompt: `What is the oxidation number of ${el} in ${f}?`,
      speech: `What is the oxidation number of ${nameOf(el)} in ${f}?`,
      ...signed(ox),
      hint: "O is usually −2 (−1 in peroxides), H is +1 (−1 with metals), and all oxidation numbers add up to the overall charge.",
      explain: `The other atoms' oxidation numbers and the overall charge leave ${el} at ${signText(ox)}.`,
    });
  },
  () => {
    const i = rand(0, REDOX.length - 1);
    const [r, p, oxd, red] = REDOX[i];
    const role = pick(["oxidized", "reduced", "the oxidizing agent", "the reducing agent"] as const);
    const ans = role === "oxidized" || role === "the reducing agent" ? oxd : red;
    return q({
      key: `rx-role-${i}-${role}`,
      prompt: `In this reaction, which species is ${role}?`,
      visual: reaction(r, p),
      needsVisual: true,
      ...label(ans, [...r, ...p].filter((x) => x !== ans && x !== "H⁺" && x !== "H₂O")),
      hint: "Oxidation is loss of electrons (oxidation number goes up); reduction is gain. The species oxidized is the reducing agent, and vice versa.",
      explain: `${oxd} loses electrons (oxidized, the reducing agent); ${red} gains them (reduced, the oxidizing agent).`,
    });
  },
  () => {
    const i = rand(0, REDOX.length - 1);
    const [r, p, oxd, red, e] = REDOX[i];
    return q({
      key: `rx-e-${i}`,
      prompt: "How many electrons are transferred in this balanced equation, as written?",
      visual: reaction(r, p),
      needsVisual: true,
      ...keypad(e),
      hint: "Find how much one atom's oxidation number changes, then multiply by how many of those atoms react.",
      explain: `${oxd} is oxidized and ${red} is reduced; ${e} electrons move from one to the other in the balanced equation.`,
    });
  },
  () => {
    const [half, kind, wrong] = pick([
      ["Zn → Zn²⁺ + 2e⁻", "oxidation", "reduction"],
      ["Cu²⁺ + 2e⁻ → Cu", "reduction", "oxidation"],
      ["Fe²⁺ → Fe³⁺ + e⁻", "oxidation", "reduction"],
      ["Cl₂ + 2e⁻ → 2Cl⁻", "reduction", "oxidation"],
      ["2Br⁻ → Br₂ + 2e⁻", "oxidation", "reduction"],
      ["Ag⁺ + e⁻ → Ag", "reduction", "oxidation"],
      ["MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O", "reduction", "oxidation"],
      ["H₂ → 2H⁺ + 2e⁻", "oxidation", "reduction"],
    ]);
    return q({
      key: `rx-half-${half}`,
      prompt: `Is this half-reaction an oxidation or a reduction? ${half}`,
      speech: `Is this half-reaction an oxidation or a reduction? ${half.replace(/e⁻/g, " electrons")}`,
      ...label(`${kind[0].toUpperCase()}${kind.slice(1)}: electrons are ${kind === "oxidation" ? "lost" : "gained"}`, [`${wrong[0].toUpperCase()}${wrong.slice(1)}: electrons are ${kind === "oxidation" ? "gained" : "lost"}`, "Neither: no electrons move", `${wrong[0].toUpperCase()}${wrong.slice(1)}: the charge goes up`]),
      hint: "OIL RIG: Oxidation Is Loss, Reduction Is Gain (of electrons). Electrons as a product means they are lost.",
      explain: `Electrons are ${kind === "oxidation" ? "products (lost)" : "reactants (gained)"}, so it's ${kind}.`,
    });
  },
);

/* ========================================================= Unit 5: kinetics */

const RATE_RXNS: [string[], string[]][] = [
  [["N₂O₅"], ["NO₂", "O₂"]],
  [["N₂", "H₂"], ["NH₃"]],
  [["NO", "O₂"], ["NO₂"]],
  [["NH₃", "O₂"], ["NO", "H₂O"]],
  [["H₂O₂"], ["H₂O", "O₂"]],
  [["HI"], ["H₂", "I₂"]],
  [["NOCl"], ["NO", "Cl₂"]],
  [["SO₂", "O₂"], ["SO₃"]],
  [["C₃H₈", "O₂"], ["CO₂", "H₂O"]],
];

const conc = (x: string) => `[${x}]`;

/** 5.1: reaction rates. */
export const reactionRates = mix(
  () =>
    again(() => {
      const [r, p] = pick(RATE_RXNS);
      const c = coefsOf(r, p);
      const all = [...r, ...p];
      const i = rand(0, r.length - 1);
      let j = rand(0, all.length - 1);
      if (j === i) j = (j + 1) % all.length;
      const rate = rand(120, 950) / 100;
      const ans = (rate * c[j]) / c[i];
      if (!safe(ans) || c[i] === c[j]) return null;
      const verb = j < r.length ? "disappear" : "appear";
      return q({
        key: `rr-rel-${r.join("")}-${i}-${j}-${rate}`,
        prompt: `${eqText(r, p, c)}. At one moment, ${all[i]} is used up at ${rate.toFixed(2)} × 10⁻³ M/s. How fast does ${all[j]} ${verb}, in 10⁻³ M/s? ${SF3}`,
        visual: reaction(r, p),
        ...keypad(sf(ans)),
        unit: "× 10⁻³ M/s",
        hint: "Rates are linked by the coefficients: (1/a)·rate of A = (1/b)·rate of B.",
        explain: `rate(${all[j]}) = ${rate.toFixed(2)} × ${c[j]}/${c[i]} = ${sig(ans)} × 10⁻³ M/s.`,
      });
    }),
  () =>
    again(() => {
      const A0 = pick([1, 0.8, 0.6]);
      const k = pick([0.01, 0.015, 0.02, 0.025]);
      const ts = [0, 20, 40, 60, 80];
      const vals = ts.map((t) => Number(sig(A0 * Math.exp(-k * t))));
      const i = rand(0, 3);
      const jj = rand(i + 1, 4);
      const avg = ((vals[i] - vals[jj]) / (ts[jj] - ts[i])) * 1000;
      if (!safe(avg)) return null;
      return q({
        key: `rr-avg-${A0}-${k}-${i}-${jj}`,
        prompt: `The table shows [A] as A decomposes. What is the average rate of disappearance of A between ${ts[i]} s and ${ts[jj]} s, in 10⁻³ M/s? ${SF3}`,
        visual: table(["Time (s)", "[A] (M)"], ts.map((t, n) => [t, vals[n].toFixed(3)])),
        needsVisual: true,
        ...keypad(sf(avg)),
        unit: "× 10⁻³ M/s",
        hint: "Average rate = −Δ[A] ÷ Δt.",
        explain: `−(${vals[jj].toFixed(3)} − ${vals[i].toFixed(3)}) ÷ (${ts[jj]} − ${ts[i]}) = ${sig(avg / 1000)} M/s = ${sig(avg)} × 10⁻³ M/s.`,
      });
    }),
  () => {
    const [setup, ans, wrongs] = pick([
      ["zinc granules reacting with 1.0 M HCl at 25 °C", "Use zinc powder instead of granules", ["Use larger zinc pieces", "Use 0.50 M HCl", "Cool the acid to 15 °C"]],
      ["the decomposition of H₂O₂ solution at 20 °C", "Warm the solution to 40 °C", ["Dilute the H₂O₂ with water", "Cool it to 10 °C", "Use a bigger beaker"]],
      ["marble chips (CaCO₃) dissolving in 2.0 M HCl", "Use 3.0 M HCl", ["Use 1.0 M HCl", "Use one large marble block", "Add water to the acid"]],
      ["2NO(g) + O₂(g) → 2NO₂(g) in a sealed flask", "Compress the gases into a smaller volume", ["Move them to a larger flask", "Lower the temperature", "Remove some O₂"]],
    ] as [string, string, string[]][]);
    return q({
      key: `rr-fac-${setup.slice(0, 18)}`,
      prompt: `Which change would increase the initial rate of ${setup}?`,
      ...label(ans, wrongs),
      hint: "Rates rise with higher concentration (or pressure), higher temperature, more surface area, and a catalyst.",
      explain: `${ans}: it makes particles collide more often or more energetically.`,
    });
  },
  () => {
    const k = pick([0.02, 0.03, 0.04]);
    return q({
      key: `rr-curve-${k}`,
      prompt: "The graph shows [A] as a reaction proceeds. How does the rate change over time, and why?",
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "[A] (M)", x: [0, 100], y: [0, 1.2], curves: [{ fn: (t) => Math.exp(-k * t) }] },
      needsVisual: true,
      ...label("It slows as [A] falls (curve flattens)", [
        "It speeds up: more product has formed",
        "It stays constant: the curve is smooth",
        "It slows down because the temperature drops",
      ]),
      hint: "The rate at any moment is the steepness (negative slope) of the curve.",
      explain: "The slope is steepest at the start and flattens out: as A is used up, fewer collisions happen per second.",
    });
  },
);

/** 5.2: rate laws from initial-rate data. */
export const rateLaws = mix(
  ...[0, 1, 2, 3, 4].map((variant) => () =>
    again(() => {
      const m = rand(0, 2);
      const n = rand(0, 2);
      if (m + n === 0) return null;
      const a0 = pick([0.1, 0.2, 0.15]);
      const b0 = pick([0.1, 0.2, 0.25]);
      const fa = pick([2, 3]);
      const fb = pick([2, 3]);
      const r1 = rand(12, 95) / 10 / 1000;
      const rates = [r1, r1 * fa ** m, r1 * fb ** n];
      const rows = [
        [1, a0.toFixed(2), b0.toFixed(2), sci(rates[0])],
        [2, (a0 * fa).toFixed(2), b0.toFixed(2), sci(rates[1])],
        [3, a0.toFixed(2), (b0 * fb).toFixed(2), sci(rates[2])],
      ];
      const vis = table(["Exp", "[A] (M)", "[B] (M)", "Rate (M/s)"], rows);
      const order = m + n;
      const law = `rate = k${m ? `[A]${m === 2 ? "²" : ""}` : ""}${n ? `[B]${n === 2 ? "²" : ""}` : ""}`;
      const units = ["M/s", "s⁻¹", "M⁻¹ s⁻¹", "M⁻² s⁻¹", "M⁻³ s⁻¹"];
      const base = { visual: vis, needsVisual: true, hint: "Compare two experiments where only one concentration changes: if it multiplies by f and the rate by fⁿ, the order is n." };
      const key = `rl-${variant}-${m}${n}-${a0}-${b0}-${fa}-${fb}-${r1}`;
      if (variant === 0) {
        return q({ ...base, key, prompt: "Use the initial-rate data. What is the order of the reaction with respect to A?", ...keypad(m), explain: `Exp 1 → 2: [A] × ${fa}, rate × ${fa ** m} = ${fa}^${m}. Order in A is ${m}. Rate law: ${law}.` });
      }
      if (variant === 1) {
        return q({ ...base, key, prompt: "Use the initial-rate data. What is the order of the reaction with respect to B?", ...keypad(n), explain: `Exp 1 → 3: [B] × ${fb}, rate × ${fb ** n} = ${fb}^${n}. Order in B is ${n}. Rate law: ${law}.` });
      }
      if (variant === 2) {
        const k = rates[0] / (a0 ** m * b0 ** n);
        if (!safe(k)) return null;
        return q({
          ...base,
          key,
          prompt: `Use the data to find the rate constant k (units ${units[order]}). ${SF3}`,
          speech: "Use the initial-rate data to find the rate constant k.",
          ...keypad(sf(k)),
          unit: units[order],
          explain: `${law}. From Exp 1: k = ${sci(rates[0])} ÷ (${m ? `${a0.toFixed(2)}${m === 2 ? "²" : ""}` : "1"}${n ? ` × ${b0.toFixed(2)}${n === 2 ? "²" : ""}` : ""}) = ${sig(k)} ${units[order]}.`,
        });
      }
      if (variant === 3) {
        return q({
          ...base,
          key,
          prompt: "Use the data. What are the units of the rate constant k?",
          ...label(units[order], units.filter((u) => u !== units[order]).slice(0, 4)),
          hint: "Find the overall order first. k must turn M^(order) into M/s.",
          explain: `${law} is order ${order} overall, so k has units of ${units[order]}.`,
        });
      }
      const fA = pick([2, 3]);
      const fB = pick([1, 2]);
      const factor = fA ** m * fB ** n;
      return q({
        ...base,
        key: `${key}-${fA}-${fB}`,
        prompt: `Use the data to find the rate law. By what factor does the rate change if [A] is multiplied by ${fA}${fB > 1 ? ` and [B] by ${fB}` : " and [B] is unchanged"}?`,
        ...keypad(factor),
        unit: "×",
        explain: `${law}, so the rate changes by ${fA}${m === 2 ? "²" : m === 0 ? "⁰" : ""}${fB > 1 ? ` × ${fB}${n === 2 ? "²" : n === 0 ? "⁰" : ""}` : ""} = ${factor}.`,
      });
    }),
  ),
);

const ORDER_PLOTS = ["[A] vs t", "ln[A] vs t", "1/[A] vs t"];

/** 5.3: integrated rate laws. */
export const integratedRateLaws = mix(
  () => {
    const o = rand(0, 2);
    const A0 = 1;
    const k = o === 0 ? pick([0.012, 0.015, 0.018]) : o === 1 ? pick([0.0231, 0.0347, 0.0173]) : pick([0.05, 0.075, 0.1]);
    const ts = [0, 10, 20, 30, 40];
    const at = (t: number) => (o === 0 ? A0 - k * t : o === 1 ? A0 * Math.exp(-k * t) : 1 / (1 / A0 + k * t));
    return q({
      key: `irl-plot-${o}-${k}`,
      prompt: "The table shows [A] over time. Which graph of these data would be a straight line?",
      visual: table(["t (s)", "[A] (M)"], ts.map((t) => [t, at(t).toFixed(3)])),
      needsVisual: true,
      ...fixedLabels(ORDER_PLOTS, ORDER_PLOTS[o]),
      hint: "Zero order: [A] drops by the same amount each interval. First order: the same fraction each interval (constant half-life). Second order: the half-life keeps getting longer.",
      explain: o === 0 ? "[A] falls by a constant amount each 10 s: zero order, so [A] vs t is linear." : o === 1 ? "[A] falls by a constant fraction each interval: first order, so ln[A] vs t is linear." : "Each drop is smaller than constant-fraction decay: second order, so 1/[A] vs t is linear.",
    });
  },
  () => {
    const o = rand(0, 2);
    const set = o === 0 ? [0.004, 0.005, 0.008, 0.01] : o === 1 ? [0.01, 0.02, 0.025, 0.04, 0.05] : [0.04, 0.05, 0.06, 0.1];
    const k = pick(set);
    const T = o === 0 ? 50 : o === 1 ? 100 : 50;
    const y0 = o === 0 ? 0.8 : o === 1 ? 0 : 2;
    const y1 = o === 0 ? y0 - k * T : o === 1 ? -k * T : y0 + k * T;
    const ylab = ["[A] (M)", "ln[A]", "1/[A] (M⁻¹)"][o];
    const units = ["M/s", "s⁻¹", "M⁻¹ s⁻¹"][o];
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);
    const pad = (hi - lo) * 0.25;
    return q({
      key: `irl-k-${o}-${k}`,
      prompt: `For this reaction, the graph of ${ylab.split(" ")[0]} against time is a straight line. What is the rate constant k (in ${units})?`,
      visual: {
        kind: "plot",
        xLabel: "time (s)",
        yLabel: ylab,
        x: [0, T * 1.2],
        y: [dp(lo - pad, 2), dp(hi + pad, 2)],
        lines: [{ from: [0, y0], to: [T, dp(y1, 3)] }],
        points: [{ x: 0, y: y0, label: `(0, ${fix(y0, 2)})` }, { x: T, y: dp(y1, 3), label: `(${T}, ${fix(y1, 2)})` }],
      },
      needsVisual: true,
      ...keypad(k),
      unit: units,
      hint: o === 0 ? "Zero order: [A] = [A]₀ − kt, so k = −slope." : o === 1 ? "First order: ln[A] = ln[A]₀ − kt, so k = −slope." : "Second order: 1/[A] = 1/[A]₀ + kt, so k = slope.",
      explain: `Slope = (${fix(y1, 2)} − ${fix(y0, 2)}) ÷ ${T} = ${fix((y1 - y0) / T, 4)}, so k = ${k} ${units}.`,
    });
  },
  () =>
    again(() => {
      const A0 = rand(20, 99) / 100;
      const k = rand(10, 90) / 1000;
      const t = rand(10, 60);
      const A = A0 * Math.exp(-k * t);
      if (!safe(A)) return null;
      return q({
        key: `irl-1st-${A0}-${k}-${t}`,
        prompt: `A first-order reaction has k = ${k.toFixed(3)} s⁻¹ and [A]₀ = ${A0.toFixed(2)} M. What is [A] after ${t} s? ${SF3}`,
        ...keypad(sf(A)),
        unit: "M",
        hint: "ln[A] = ln[A]₀ − kt, or [A] = [A]₀·e^(−kt).",
        explain: `[A] = ${A0.toFixed(2)} × e^(−${k.toFixed(3)} × ${t}) = ${sig(A)} M.`,
      });
    }),
  () =>
    again(() => {
      const A0 = rand(20, 99) / 100;
      const k = rand(5, 50) / 100;
      const t = rand(5, 60);
      const A = 1 / (1 / A0 + k * t);
      if (!safe(A)) return null;
      return q({
        key: `irl-2nd-${A0}-${k}-${t}`,
        prompt: `A second-order reaction has k = ${k.toFixed(2)} M⁻¹ s⁻¹ and [A]₀ = ${A0.toFixed(2)} M. What is [A] after ${t} s? ${SF3}`,
        ...keypad(sf(A)),
        unit: "M",
        hint: "1/[A] = 1/[A]₀ + kt.",
        explain: `1/[A] = ${(1 / A0).toFixed(3)} + ${k.toFixed(2)} × ${t} = ${(1 / A0 + k * t).toFixed(3)} M⁻¹, so [A] = ${sig(A)} M.`,
      });
    }),
  () =>
    again(() => {
      const A0 = rand(50, 99) / 100;
      const A = rand(10, Math.floor(A0 * 100) - 10) / 100;
      const k = rand(10, 90) / 1000;
      const t = Math.log(A0 / A) / k;
      if (!safe(t)) return null;
      return q({
        key: `irl-t-${A0}-${A}-${k}`,
        prompt: `A first-order reaction has k = ${k.toFixed(3)} s⁻¹. How long does it take [A] to fall from ${A0.toFixed(2)} M to ${A.toFixed(2)} M? ${SF3}`,
        ...keypad(sf(t)),
        unit: "s",
        hint: "t = ln([A]₀/[A]) ÷ k.",
        explain: `t = ln(${A0.toFixed(2)} ÷ ${A.toFixed(2)}) ÷ ${k.toFixed(3)} = ${sig(t)} s.`,
      });
    }),
  () =>
    again(() => {
      const A0 = rand(50, 99) / 100;
      const k = rand(2, 9) / 1000;
      const t = rand(10, 80);
      const A = A0 - k * t;
      if (A <= 0.05 || !safe(A)) return null;
      return q({
        key: `irl-0th-${A0}-${k}-${t}`,
        prompt: `A zero-order reaction has k = ${k.toFixed(3)} M/s and [A]₀ = ${A0.toFixed(2)} M. What is [A] after ${t} s? ${SF3}`,
        ...keypad(sf(A)),
        unit: "M",
        hint: "[A] = [A]₀ − kt.",
        explain: `[A] = ${A0.toFixed(2)} − ${k.toFixed(3)} × ${t} = ${sig(A)} M.`,
      });
    }),
);

/** 5.3 Do it: draw and plot the linear forms. */
export const linearPlots = mix(
  () => {
    const y0 = pick([6, 8, 10]);
    const s = pick([0.5, 1]);
    return q({
      key: `lp0-${y0}-${s}`,
      prompt: `Do it: a zero-order reaction has [A]₀ = ${(y0 / 10).toFixed(2)} M and k = ${(s / 10).toFixed(2)} M/min. Draw [A] (up, in units of 0.1 M) against t (across, in min).`,
      speech: `A zero order reaction has an initial concentration of ${(y0 / 10).toFixed(2)} molar and k equals ${(s / 10).toFixed(2)} molar per minute. Draw the concentration of A, in tenths of a molar, against time in minutes.`,
      ...act({ kind: "drawLine", m: -s, b: y0, size: 10, quadrants: 1 }, -s),
      hint: "[A] = [A]₀ − kt is a straight line: start at [A]₀ and go down k each minute.",
      explain: `In 0.1 M units: [A] = ${y0} − ${s}t. It starts at ${y0} and reaches ${y0 - 2 * s} at t = 2 min.`,
    });
  },
  () => {
    const k = pick([0.5, 1]);
    return q({
      key: `lp1-${k}`,
      prompt: `Do it: a first-order reaction has [A]₀ = 1.00 M and k = ${k.toFixed(1)} min⁻¹. Draw ln[A] (up) against t (across, in min).`,
      speech: `A first order reaction has an initial concentration of 1 molar and k equals ${k} per minute. Draw the natural log of the concentration of A against time in minutes.`,
      ...act({ kind: "drawLine", m: -k, b: 0, size: 6, quadrants: 4 }, -k),
      hint: "ln[A] = ln[A]₀ − kt. ln(1.00) = 0, so the line starts at the origin with slope −k.",
      explain: `ln[A] = −${k}t: a straight line through (0, 0) and (2, ${-2 * k}).`,
    });
  },
  () => {
    const [A0, inv] = pick([[1, 1], [0.5, 2], [0.25, 4]] as [number, number][]);
    const k = pick([0.5, 1, 2]);
    return q({
      key: `lp2-${A0}-${k}`,
      prompt: `Do it: a second-order reaction has [A]₀ = ${A0.toFixed(2)} M and k = ${k.toFixed(1)} M⁻¹ min⁻¹. Draw 1/[A] (up, in M⁻¹) against t (across, in min).`,
      speech: `A second order reaction has an initial concentration of ${A0.toFixed(2)} molar and k equals ${k} per molar per minute. Draw 1 over the concentration of A against time in minutes.`,
      ...act({ kind: "drawLine", m: k, b: inv, size: 10, quadrants: 1 }, k),
      hint: "1/[A] = 1/[A]₀ + kt: start at 1/[A]₀ and rise by k each minute.",
      explain: `1/[A] = ${inv} + ${k}t. It starts at ${inv} M⁻¹ and reaches ${inv + 2 * k} at t = 2 min.`,
    });
  },
  () => {
    const half = pick([1, 2, 3]);
    const A0 = 8;
    const pts = [0, 1, 2, 3].map((n) => ({ x: n * half, y: A0 / 2 ** n, label: `${n * half} min` }));
    return q({
      key: `lpp1-${half}`,
      prompt: `Do it: a first-order reaction has [A]₀ = 0.80 M and a half-life of ${half} min. Plot [A] (in units of 0.1 M) at t = ${pts.map((p) => p.x).join(", ")} min.`,
      ...act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, pts.length),
      hint: "Each half-life, [A] halves: 8 → 4 → 2 → 1 (in 0.1 M).",
      explain: pts.map((p) => `t = ${p.x} min: ${p.y / 10} M`).join("; ") + ".",
    });
  },
  () => {
    const y0 = pick([6, 7, 8, 9, 10]);
    const d = pick([0.5, 1]);
    const pts = [0, 2, 4, 6].map((x) => ({ x, y: y0 - d * x, label: `${x} min` }));
    return q({
      key: `lpp0-${y0}-${d}`,
      prompt: `Do it: a zero-order reaction has [A]₀ = ${(y0 / 10).toFixed(2)} M and k = ${(d / 10).toFixed(2)} M/min. Plot [A] (in units of 0.1 M) at t = 0, 2, 4 and 6 min.`,
      ...act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, pts.length),
      hint: "Zero order: [A] drops by the same amount, k, every minute.",
      explain: pts.map((p) => `t = ${p.x}: ${p.y}`).join("; ") + " (in 0.1 M).",
    });
  },
);

/** 5.3: half-life. */
export const halfLife = mix(
  () =>
    again(() => {
      const k = rand(100, 999) / 10000;
      const t = Math.LN2 / k;
      if (!safe(t)) return null;
      return q({
        key: `hl-t-${k}`,
        prompt: `A first-order reaction has k = ${k.toFixed(4)} s⁻¹. What is its half-life? ${SF3}`,
        ...keypad(sf(t)),
        unit: "s",
        hint: "For first order, t½ = 0.693 ÷ k.",
        explain: `t½ = 0.693 ÷ ${k.toFixed(4)} = ${sig(t)} s.`,
      });
    }),
  () =>
    again(() => {
      const t = rand(10, 999) / 10;
      const k = Math.LN2 / t;
      if (!safe(k)) return null;
      return q({
        key: `hl-k-${t}`,
        prompt: `A first-order reaction has a half-life of ${t.toFixed(1)} min. What is k, in min⁻¹? ${SF3}`,
        ...keypad(sf(k)),
        unit: "min⁻¹",
        hint: "k = 0.693 ÷ t½.",
        explain: `k = 0.693 ÷ ${t.toFixed(1)} = ${sig(k)} min⁻¹.`,
      });
    }),
  () => {
    const n = rand(2, 5);
    const half = rand(2, 30);
    const m0 = pick([16, 32, 48, 64, 80, 96, 120, 160]);
    const left = m0 / 2 ** n;
    return q({
      key: `hl-left-${n}-${half}-${m0}`,
      prompt: `A substance decomposes by a first-order process with a half-life of ${half} min. If you start with ${m0}.0 g, how much remains after ${n * half} min?`,
      ...keypad(dp(left, 3)),
      unit: "g",
      hint: `${n * half} min is ${n} half-lives. Halve the mass that many times.`,
      explain: `${n} half-lives: ${m0} ÷ 2${SUPN(n)} = ${m0} ÷ ${2 ** n} = ${dp(left, 3)} g.`,
    });
  },
  () =>
    again(() => {
      const o = pick([0, 2]);
      const A0 = rand(20, 99) / 100;
      const k = o === 2 ? rand(10, 99) / 100 : rand(10, 99) / 10000;
      const t = o === 2 ? 1 / (k * A0) : A0 / (2 * k);
      if (!safe(t)) return null;
      return q({
        key: `hl-o${o}-${A0}-${k}`,
        prompt: `A ${o === 2 ? "second" : "zero"}-order reaction has k = ${o === 2 ? `${k.toFixed(2)} M⁻¹ s⁻¹` : `${k.toFixed(4)} M/s`} and [A]₀ = ${A0.toFixed(2)} M. What is its first half-life? ${SF3}`,
        ...keypad(sf(t)),
        unit: "s",
        hint: o === 2 ? "Second order: t½ = 1 ÷ (k[A]₀)." : "Zero order: t½ = [A]₀ ÷ (2k).",
        explain: o === 2 ? `t½ = 1 ÷ (${k.toFixed(2)} × ${A0.toFixed(2)}) = ${sig(t)} s.` : `t½ = ${A0.toFixed(2)} ÷ (2 × ${k.toFixed(4)}) = ${sig(t)} s.`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["For which order is the half-life independent of the starting concentration?", "First order", ["Zero order", "Second order", "All orders"]],
      ["A reaction's successive half-lives get longer and longer (10 s, 20 s, 40 s…). What is its order?", "Second order", ["First order", "Zero order", "It can't be told"]],
      ["A reaction's successive half-lives get shorter (40 s, 20 s, 10 s…). What is its order?", "Zero order", ["First order", "Second order", "It can't be told"]],
      ["Radioactive decay is first order. What happens to the half-life of a sample as it decays?", "It stays the same", ["It gets longer", "It gets shorter", "It doubles each time"]],
    ] as [string, string, string[]][]);
    return q({
      key: `hl-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "First order: t½ = 0.693/k. Second order: t½ = 1/(k[A]₀). Zero order: t½ = [A]₀/(2k).",
      explain: `${ans}.`,
    });
  },
  () => {
    const h = pick([10, 15, 20, 25, 30, 40]);
    const k = Math.LN2 / h;
    return q({
      key: `hl-graph-${h}`,
      prompt: "The graph shows a first-order reaction. What is its half-life?",
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "[A] (M)", x: [0, h * 4], y: [0, 1.1], curves: [{ fn: (t) => Math.exp(-k * t) }], lines: [{ from: [0, 0.5], to: [h, 0.5], dashed: true }, { from: [h, 0], to: [h, 0.5], dashed: true }] },
      needsVisual: true,
      ...choose(h, [h * 2, h / 2, h + 10], 5, 5),
      unit: "s",
      hint: "Find the time when [A] has dropped from 1.0 M to 0.50 M.",
      explain: `[A] reaches 0.50 M at ${h} s, so t½ = ${h} s (and it reaches 0.25 M at ${2 * h} s).`,
    });
  },
);

/** Elementary steps: [equation, rate law, molecularity]. */
const ELEMENTARY: [string, string, number][] = [
  ["NO₂ + NO₂ → NO₃ + NO", "rate = k[NO₂]²", 2],
  ["O₃ → O₂ + O", "rate = k[O₃]", 1],
  ["O + O₃ → 2O₂", "rate = k[O][O₃]", 2],
  ["NO + O₃ → NO₂ + O₂", "rate = k[NO][O₃]", 2],
  ["Cl + O₃ → ClO + O₂", "rate = k[Cl][O₃]", 2],
  ["2NO + O₂ → 2NO₂", "rate = k[NO]²[O₂]", 3],
  ["N₂O₅ → NO₂ + NO₃", "rate = k[N₂O₅]", 1],
  ["CH₃NC → CH₃CN", "rate = k[CH₃NC]", 1],
  ["2NO → N₂O₂", "rate = k[NO]²", 2],
  ["H + Br₂ → HBr + Br", "rate = k[H][Br₂]", 2],
  ["NO₂Cl → NO₂ + Cl", "rate = k[NO₂Cl]", 1],
  ["H₂ + 2I → 2HI", "rate = k[H₂][I]²", 3],
  ["C₄H₈ → 2C₂H₄", "rate = k[C₄H₈]", 1],
  ["NO + Br₂ → NOBr₂", "rate = k[NO][Br₂]", 2],
];
const MOLECULARITY = ["Unimolecular", "Bimolecular", "Termolecular"];

/** Reactant and product species of an equation, without coefficients. */
function speciesOf(eq: string): { r: string[]; p: string[] } {
  const [l, rr] = eq.split(/\s[→⇌]\s/);
  const strip = (s: string) => s.split(" + ").map((x) => x.trim().replace(/^\d+(?=[A-Z(])/, ""));
  return { r: strip(l), p: strip(rr) };
}

/** 5.4: elementary reactions. */
export const elementarySteps = mix(
  () => {
    const [eq, law] = pick(ELEMENTARY);
    const { r, p } = speciesOf(eq);
    const wrongs = [`rate = k${p.map(conc).join("")}`, `rate = k${r.map(conc).join("")}`, `rate = k${conc(r[0])}²${r.slice(1).map(conc).join("")}`, `rate = k${r.map((x) => `${conc(x)}²`).join("")}`].filter((w) => w !== law);
    return q({
      key: `el-law-${eq}`,
      prompt: `This is an elementary step: ${eq}. What is its rate law?`,
      ...label(law, wrongs),
      hint: "For an elementary step only, the exponents equal the coefficients of the reactants in that step.",
      explain: `Elementary step, so the rate depends on each reactant particle that collides: ${law}.`,
    });
  },
  () => {
    const [eq, , mol] = pick(ELEMENTARY);
    return q({
      key: `el-mol-${eq}`,
      prompt: `What is the molecularity of the elementary step ${eq}?`,
      ...fixedLabels(MOLECULARITY, MOLECULARITY[mol - 1]),
      hint: "Count the reactant particles that must come together in the step (include coefficients).",
      explain: `${mol} particle${mol === 1 ? "" : "s"} react${mol === 1 ? "s" : ""} in this step: ${MOLECULARITY[mol - 1].toLowerCase()}.`,
    });
  },
  () => {
    const odd = pick(["4NH₃ + 5O₂ → 4NO + 6H₂O", "2H₂ + 2NO → N₂ + 2H₂O", "C₃H₈ + 5O₂ → 3CO₂ + 4H₂O", "MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O", "2N₂O₅ + 2H₂O → 4HNO₃"]);
    const ok = shuffle(ELEMENTARY).slice(0, 3).map((e) => e[0]);
    return q({
      key: `el-odd-${odd}-${ok.join("")}`,
      prompt: "Which of these is LEAST likely to be a single elementary step?",
      ...label(odd, ok),
      hint: "An elementary step is one collision. Collisions of more than 3 particles at once are extremely unlikely.",
      explain: `${odd} would need ${speciesOf(odd).r.length > 2 ? "several" : "four or more"} particles colliding at once, so it must happen in several steps.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Why can you write the rate law of an elementary step from its equation, but not usually for an overall reaction?", "An elementary step is one collision, as written", ["Overall reactions don't have rate laws", "Coefficients are always wrong for overall reactions", "Elementary steps have no activation energy"]],
      ["Doubling [NO] in the elementary step 2NO → N₂O₂ changes its rate by what factor?", "×4, because rate = k[NO]²", ["×2", "×8", "No change"]],
      ["Why are termolecular steps rare?", "Three particles rarely collide at once", ["They release too much energy", "They need a catalyst", "They are always endothermic"]],
    ] as [string, string, string[]][]);
    return q({
      key: `el-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "An elementary step is a single molecular event: its rate depends on how often those particles meet.",
      explain: `${ans}.`,
    });
  },
);

const energyDist = (kT: number) => (E: number) => (E <= 0 ? 0 : (2 / Math.sqrt(Math.PI)) * Math.sqrt(E) * kT ** -1.5 * Math.exp(-E / kT) * 100);

/** 5.5: the collision model. */
export const collisionModel = mix(
  () => {
    const [k1, k2] = pick([[4, 7], [5, 9], [3, 6], [4, 8]]);
    const Ea = pick([20, 25, 30]);
    const flip = Math.random() < 0.5;
    const curves = flip ? [k2, k1] : [k1, k2];
    const hiIdx = flip ? 0 : 1;
    const peak = energyDist(k1)(k1 / 2);
    const askT = Math.random() < 0.5;
    return q({
      key: `co-mb-${k1}-${k2}-${Ea}-${flip}-${askT}`,
      prompt: askT ? "Curves A and B show collision energies for the same reaction at two temperatures. Which is at the higher temperature?" : `Curves A and B show collision energies at two temperatures; the dashed line is Ea. Which curve has the larger fraction of collisions with enough energy to react?`,
      visual: {
        kind: "plot",
        xLabel: "collision energy",
        yLabel: "fraction of collisions",
        x: [0, 40],
        y: [0, Math.ceil(peak * 1.25)],
        curves: curves.map((kT, i) => ({ fn: energyDist(kT), label: "AB"[i], colour: (["wave", "berry"] as const)[i] })),
        lines: [{ from: [Ea, 0], to: [Ea, Math.ceil(peak * 1.25)], dashed: true }],
      },
      needsVisual: true,
      ...fixedLabels(["Curve A", "Curve B"], `Curve ${"AB"[hiIdx]}`),
      hint: "Higher temperature spreads the curve to the right, putting more area past Ea.",
      explain: `Curve ${"AB"[hiIdx]} is flatter and shifted right: it is the higher temperature, with more collisions at or above Ea.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Which change increases the FRACTION of collisions that have at least the activation energy?", "Raising the temperature", ["Increasing the concentration", "Using a larger container", "Adding more of one reactant"]],
      ["Increasing [A] speeds up a reaction mainly because…", "Particles collide more often", ["Each collision has more energy", "The activation energy decreases", "The particles move faster"]],
      ["Two molecules collide with more than enough energy, but don't react. What is the most likely reason?", "They were not oriented correctly when they collided", ["Their energy was too high", "They were moving too slowly", "The reaction is exothermic"]],
      ["A 10 °C rise often roughly doubles a reaction rate. Why?", "Many more collisions reach Ea", ["Collision frequency doubles", "The activation energy halves", "The particles become larger"]],
      ["According to the collision model, what must happen for a reaction to occur?", "Enough energy and the right orientation", ["Particles simply touch", "Particles collide at any angle with any energy", "Particles are heated above their boiling point"]],
    ] as [string, string, string[]][]);
    return q({
      key: `co-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Rate depends on how often particles collide, what fraction have E ≥ Ea, and what fraction are oriented correctly.",
      explain: `${ans}.`,
    });
  },
);

/** 5.6: reaction energy profiles. */
export const energyProfiles = mix(
  ...[0, 1, 2, 3].map((variant) => () =>
    again(() => {
      const R = rand(2, 15) * 10;
      const P = R + rand(-12, 12) * 10;
      if (P === R || P < 0) return null;
      const T = Math.max(R, P) + rand(2, 12) * 10;
      const Ea = T - R;
      const dH = P - R;
      const base = {
        prompt: "",
        visual: { kind: "chem-energy" as const, mode: "profile" as const, reactants: R, products: P, peak: T, labels: { reactants: "Reactants", products: "Products", ea: variant === 0 ? "?" : null, dH: variant === 1 ? "?" : null } },
        hint: "Ea (forward) = transition state − reactants. ΔH = products − reactants. Ea (reverse) = transition state − products.",
      };
      const levels = `Reactants are at ${R} kJ/mol, the transition state at ${T} kJ/mol, and products at ${P} kJ/mol.`;
      const key = `ep-${variant}-${R}-${P}-${T}`;
      if (variant === 0) return q({ ...base, key, prompt: `${levels} What is the activation energy of the forward reaction?`, ...keypad(Ea), unit: "kJ/mol", explain: `Ea = ${T} − ${R} = ${Ea} kJ/mol.` });
      if (variant === 1) return q({ ...base, key, prompt: `${levels} What is ΔH for the reaction?`, ...signed(dH), unit: "kJ/mol", explain: `ΔH = ${P} − ${R} = ${signText(dH)} kJ/mol (${dH < 0 ? "exothermic" : "endothermic"}).` });
      if (variant === 2) return q({ ...base, key, prompt: `${levels} What is the activation energy of the REVERSE reaction?`, ...keypad(T - P), unit: "kJ/mol", explain: `Ea(reverse) = ${T} − ${P} = ${T - P} kJ/mol.` });
      return q({
        ...base,
        key,
        prompt: "Is this reaction exothermic or endothermic?",
        visual: { ...base.visual, labels: { reactants: "Reactants", products: "Products" } },
        needsVisual: true,
        ...fixedLabels(["Exothermic: products are lower in energy", "Endothermic: products are higher in energy"], dH < 0 ? "Exothermic: products are lower in energy" : "Endothermic: products are higher in energy"),
        explain: `The products are ${dH < 0 ? "below" : "above"} the reactants, so energy is ${dH < 0 ? "released" : "absorbed"}.`,
      });
    }),
  ),
  () => {
    const eas = shuffle([rand(3, 6) * 10, rand(7, 10) * 10, rand(11, 15) * 10]);
    const names = ["Reaction X", "Reaction Y", "Reaction Z"];
    const i = eas.indexOf(Math.min(...eas));
    return q({
      key: `ep-fast-${eas.join("-")}`,
      prompt: `At the same temperature and concentrations, which reaction is fastest? Activation energies: X ${eas[0]}, Y ${eas[1]}, Z ${eas[2]} kJ/mol.`,
      ...fixedLabels(names, names[i]),
      hint: "A lower activation energy means a larger fraction of collisions can get over the barrier.",
      explain: `${names[i]} has the lowest Ea (${eas[i]} kJ/mol), so the most collisions succeed.`,
    });
  },
);

interface Mechanism {
  steps: [string, "slow" | "fast"][];
  overall: string;
  inter: string[];
  cat: string[];
  rate: string;
  wrongRates: string[];
  orders: Record<string, number>;
  preEq?: boolean;
  kobs?: string;
}
const MECHS: Mechanism[] = [
  { steps: [["NO₂ + NO₂ → NO₃ + NO", "slow"], ["NO₃ + CO → NO₂ + CO₂", "fast"]], overall: "NO₂ + CO → NO + CO₂", inter: ["NO₃"], cat: [], rate: "rate = k[NO₂]²", wrongRates: ["rate = k[NO₂][CO]", "rate = k[NO₃][CO]", "rate = k[NO₂]²[CO]"], orders: { "NO₂": 2, CO: 0 } },
  { steps: [["2NO ⇌ N₂O₂", "fast"], ["N₂O₂ + O₂ → 2NO₂", "slow"]], overall: "2NO + O₂ → 2NO₂", inter: ["N₂O₂"], cat: [], rate: "rate = k[NO]²[O₂]", wrongRates: ["rate = k[N₂O₂][O₂]", "rate = k[NO]²", "rate = k[NO][O₂]"], orders: { NO: 2, "O₂": 1 }, preEq: true, kobs: "k = k₂k₁/k₋₁" },
  { steps: [["H₂O₂ + I⁻ → H₂O + IO⁻", "slow"], ["H₂O₂ + IO⁻ → H₂O + O₂ + I⁻", "fast"]], overall: "2H₂O₂ → 2H₂O + O₂", inter: ["IO⁻"], cat: ["I⁻"], rate: "rate = k[H₂O₂][I⁻]", wrongRates: ["rate = k[H₂O₂]²", "rate = k[H₂O₂][IO⁻]", "rate = k[H₂O₂]"], orders: { "H₂O₂": 1, "I⁻": 1 } },
  { steps: [["O₃ ⇌ O₂ + O", "fast"], ["O + O₃ → 2O₂", "slow"]], overall: "2O₃ → 3O₂", inter: ["O"], cat: [], rate: "rate = k[O₃]²/[O₂]", wrongRates: ["rate = k[O][O₃]", "rate = k[O₃]²", "rate = k[O₃]"], orders: { "O₃": 2, "O₂": -1 }, preEq: true, kobs: "k = k₂k₁/k₋₁" },
  { steps: [["Cl₂ ⇌ 2Cl", "fast"], ["Cl + CHCl₃ → HCl + CCl₃", "slow"], ["Cl + CCl₃ → CCl₄", "fast"]], overall: "Cl₂ + CHCl₃ → HCl + CCl₄", inter: ["Cl", "CCl₃"], cat: [], rate: "rate = k[Cl₂]^½[CHCl₃]", wrongRates: ["rate = k[Cl][CHCl₃]", "rate = k[Cl₂][CHCl₃]", "rate = k[Cl₂]²[CHCl₃]"], orders: { "Cl₂": 0.5, "CHCl₃": 1 }, preEq: true, kobs: "k = k₂(k₁/k₋₁)^½" },
  { steps: [["2NO ⇌ N₂O₂", "fast"], ["N₂O₂ + H₂ → N₂O + H₂O", "slow"], ["N₂O + H₂ → N₂ + H₂O", "fast"]], overall: "2NO + 2H₂ → N₂ + 2H₂O", inter: ["N₂O₂", "N₂O"], cat: [], rate: "rate = k[NO]²[H₂]", wrongRates: ["rate = k[NO]²[H₂]²", "rate = k[N₂O₂][H₂]", "rate = k[NO][H₂]"], orders: { NO: 2, "H₂": 1 }, preEq: true, kobs: "k = k₂k₁/k₋₁" },
  { steps: [["NO + Br₂ ⇌ NOBr₂", "fast"], ["NOBr₂ + NO → 2NOBr", "slow"]], overall: "2NO + Br₂ → 2NOBr", inter: ["NOBr₂"], cat: [], rate: "rate = k[NO]²[Br₂]", wrongRates: ["rate = k[NOBr₂][NO]", "rate = k[NO][Br₂]", "rate = k[NO]²"], orders: { NO: 2, "Br₂": 1 }, preEq: true, kobs: "k = k₂k₁/k₋₁" },
  { steps: [["Cl + O₃ → ClO + O₂", "slow"], ["ClO + O → Cl + O₂", "fast"]], overall: "O₃ + O → 2O₂", inter: ["ClO"], cat: ["Cl"], rate: "rate = k[Cl][O₃]", wrongRates: ["rate = k[O₃][O]", "rate = k[ClO][O]", "rate = k[O₃]"], orders: { Cl: 1, "O₃": 1, O: 0 } },
  { steps: [["(CH₃)₃CBr → (CH₃)₃C⁺ + Br⁻", "slow"], ["(CH₃)₃C⁺ + OH⁻ → (CH₃)₃COH", "fast"]], overall: "(CH₃)₃CBr + OH⁻ → (CH₃)₃COH + Br⁻", inter: ["(CH₃)₃C⁺"], cat: [], rate: "rate = k[(CH₃)₃CBr]", wrongRates: ["rate = k[(CH₃)₃CBr][OH⁻]", "rate = k[OH⁻]", "rate = k[(CH₃)₃C⁺][OH⁻]"], orders: { "(CH₃)₃CBr": 1, "OH⁻": 0 } },
  { steps: [["H₂ + ICl → HI + HCl", "slow"], ["HI + ICl → I₂ + HCl", "fast"]], overall: "H₂ + 2ICl → I₂ + 2HCl", inter: ["HI"], cat: [], rate: "rate = k[H₂][ICl]", wrongRates: ["rate = k[H₂][ICl]²", "rate = k[HI][ICl]", "rate = k[H₂]"], orders: { "H₂": 1, ICl: 1 } },
  { steps: [["NO₂Cl → NO₂ + Cl", "slow"], ["NO₂Cl + Cl → NO₂ + Cl₂", "fast"]], overall: "2NO₂Cl → 2NO₂ + Cl₂", inter: ["Cl"], cat: [], rate: "rate = k[NO₂Cl]", wrongRates: ["rate = k[NO₂Cl]²", "rate = k[NO₂Cl][Cl]", "rate = k[NO₂]²[Cl₂]"], orders: { "NO₂Cl": 1 } },
  { steps: [["I₂ ⇌ 2I", "fast"], ["H₂ + 2I → 2HI", "slow"]], overall: "H₂ + I₂ → 2HI", inter: ["I"], cat: [], rate: "rate = k[H₂][I₂]", wrongRates: ["rate = k[H₂][I]²", "rate = k[H₂][I₂]²", "rate = k[I₂]"], orders: { "H₂": 1, "I₂": 1 }, preEq: true, kobs: "k = k₂k₁/k₋₁" },
  { steps: [["NO + N₂O → N₂ + NO₂", "slow"], ["NO₂ + N₂O → N₂ + O₂ + NO", "fast"]], overall: "2N₂O → 2N₂ + O₂", inter: ["NO₂"], cat: ["NO"], rate: "rate = k[NO][N₂O]", wrongRates: ["rate = k[N₂O]²", "rate = k[NO₂][N₂O]", "rate = k[N₂O]"], orders: { NO: 1, "N₂O": 1 } },
];

function mechTable(m: Mechanism, speeds = true): Visual {
  return speeds ? table(["Step", "Reaction", "Speed"], m.steps.map(([eq, s], i) => [i + 1, eq, s])) : table(["Step", "Reaction"], m.steps.map(([eq], i) => [i + 1, eq]));
}
const mechSpecies = (m: Mechanism) => [...new Set(m.steps.flatMap(([eq]) => { const s = speciesOf(eq); return [...s.r, ...s.p]; }))];
const mechIndex = (m: Mechanism) => MECHS.indexOf(m);

/** 5.7: reaction mechanisms. */
export const mechanisms = mix(
  () => {
    const m = pick(MECHS);
    const others = shuffle(MECHS.filter((x) => x !== m)).slice(0, 2).map((x) => x.overall);
    const unc = `${m.overall} + ${m.inter[0]}`;
    return q({
      key: `me-ov-${mechIndex(m)}`,
      prompt: "What is the overall equation for this mechanism?",
      visual: mechTable(m),
      needsVisual: true,
      ...label(m.overall, [unc, ...others]),
      hint: "Add the steps together and cancel anything that appears on both sides (intermediates and catalysts).",
      explain: `Adding the steps and cancelling ${[...m.inter, ...m.cat].join(", ")} gives ${m.overall}.`,
    });
  },
  () => {
    const m = pick(MECHS);
    const ans = pick(m.inter);
    const wrong = mechSpecies(m).filter((s) => !m.inter.includes(s));
    return q({
      key: `me-int-${mechIndex(m)}-${ans}`,
      prompt: "Which species is an intermediate in this mechanism?",
      visual: mechTable(m),
      needsVisual: true,
      ...label(ans, shuffle(wrong)),
      hint: "An intermediate is made in one step and used up in a later step, so it doesn't appear in the overall equation.",
      explain: `${ans} is produced in one step and consumed in a later one.${m.cat.length ? ` (${m.cat.join(", ")} is a catalyst: used first, then remade.)` : ""}`,
    });
  },
  () => {
    const m = pick(MECHS.filter((x) => x.cat.length));
    const all = mechSpecies(m);
    const sp = pick(all);
    const ov = speciesOf(m.overall);
    const role = m.cat.includes(sp) ? "Catalyst" : m.inter.includes(sp) ? "Intermediate" : ov.r.includes(sp) ? "Reactant" : "Product";
    return q({
      key: `me-role-${mechIndex(m)}-${sp}`,
      prompt: `In this mechanism, what is the role of ${sp}?`,
      visual: mechTable(m),
      needsVisual: true,
      ...fixedLabels(["Reactant", "Product", "Intermediate", "Catalyst"], role),
      hint: "Catalyst: used in an early step and regenerated later. Intermediate: made first, then used up. Reactants and products appear in the overall equation.",
      explain: `${sp} is ${role === "Intermediate" ? "an intermediate" : `a${role === "Reactant" ? "" : ""} ${role.toLowerCase()}`} in ${m.overall}.`,
    });
  },
);

/** 5.8: mechanisms and the rate-determining step. */
export const rateDeterminingStep = mix(
  () => {
    const m = pick(MECHS.filter((x) => !x.preEq));
    return q({
      key: `rds-law-${mechIndex(m)}`,
      prompt: "What rate law does this mechanism predict?",
      visual: mechTable(m),
      needsVisual: true,
      ...label(m.rate, m.wrongRates),
      hint: "The slow step controls the overall rate. Write the rate law from the slow step's reactants.",
      explain: `Step 1 is slow and involves only reactants, so ${m.rate}.`,
    });
  },
  () => {
    const m = pick(MECHS);
    const slow = m.steps.findIndex(([, s]) => s === "slow");
    const opts = m.steps.map((_, i) => `Step ${i + 1}`);
    return q({
      key: `rds-which-${mechIndex(m)}`,
      prompt: `The observed rate law is ${m.rate}. Which step must be rate-determining?`,
      visual: mechTable(m, false),
      needsVisual: true,
      ...fixedLabels(opts, opts[slow]),
      hint: "Try each step as the slow one: write the rate law it predicts (replacing intermediates using earlier fast steps) and compare.",
      explain: `If step ${slow + 1} is slow, the mechanism predicts ${m.rate}, which matches the data.`,
    });
  },
  () => {
    const m = pick(MECHS.filter((x) => Number.isInteger(Object.values(x.orders).reduce((a, b) => a + b, 0))));
    const order = Object.values(m.orders).reduce((a, b) => a + b, 0);
    return q({
      key: `rds-order-${mechIndex(m)}`,
      prompt: "What is the overall order of the rate law predicted by this mechanism?",
      visual: mechTable(m),
      needsVisual: true,
      ...keypad(order),
      hint: "Find the rate law from the slow step (substituting for any intermediate), then add the exponents.",
      explain: `${m.rate}: overall order ${order}.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["Why doesn't a fast step that comes AFTER the slow step affect the rate law?", "Nothing goes faster than the slowest step", ["Fast steps have no activation energy", "Fast steps happen before the slow step", "Fast steps don't involve collisions"]],
      ["A reactant appears in the overall equation but not in the rate law. What does that suggest?", "It enters only after the slow step", ["It is a catalyst", "It is an intermediate", "The rate law is wrong"]],
      ["Which part of an energy profile corresponds to the rate-determining step?", "The step with the highest barrier", ["The step with the most negative ΔH", "The last step", "The step with the most reactants"]],
    ] as [string, string, string[]][]);
    return q({
      key: `rds-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "The slowest step limits the overall rate.",
      explain: `${ans}.`,
    });
  },
);

/** 5.9: fast pre-equilibrium and the steady-state approximation. */
export const steadyState = mix(
  () => {
    const m = pick(MECHS.filter((x) => x.preEq));
    return q({
      key: `ss-law-${mechIndex(m)}`,
      prompt: "Step 1 is a fast equilibrium. What rate law does this mechanism predict?",
      visual: mechTable(m),
      needsVisual: true,
      ...label(m.rate, m.wrongRates),
      hint: "Write the rate law for the slow step, then replace the intermediate using the equilibrium of the fast step (K = k₁/k₋₁).",
      explain: `Slow step rate contains ${m.inter[0]}; from the fast equilibrium, [${m.inter[0]}] is replaced by reactant concentrations, giving ${m.rate}.`,
    });
  },
  () => {
    const m = pick(MECHS.filter((x) => x.preEq));
    const [sp, ord] = pick(Object.entries(m.orders));
    return q({
      key: `ss-ord-${mechIndex(m)}-${sp}`,
      prompt: `According to the rate law this mechanism predicts, what is the order with respect to ${sp}?`,
      visual: mechTable(m),
      needsVisual: true,
      ...choose(ord, [ord + 1, ord - 1, 0, 2, 0.5, -1].filter((x) => x !== ord), 0.5),
      hint: "Derive the rate law: slow-step rate, then substitute for the intermediate from the fast equilibrium.",
      explain: `${m.rate}, so the order in ${sp} is ${ord === 0.5 ? "½" : signText(ord).replace("+", "")}.`,
    });
  },
  () => {
    const m = pick(MECHS.filter((x) => x.preEq));
    const ans = m.kobs!;
    return q({
      key: `ss-k-${mechIndex(m)}`,
      prompt: "Step 1 (forward k₁, reverse k₋₁) is a fast equilibrium and step 2 (k₂) is slow. How is the observed rate constant k related to the step constants?",
      visual: mechTable(m),
      needsVisual: true,
      ...label(ans, ["k = k₁k₂", "k = k₂k₋₁/k₁", "k = k₂", "k = k₂(k₁/k₋₁)^½", "k = k₂k₁/k₋₁"].filter((x) => x !== ans)),
      hint: "At equilibrium, k₁[reactants] = k₋₁[products of step 1]. Solve for the intermediate and put it into rate = k₂[…].",
      explain: `Substituting the equilibrium expression for the intermediate gives ${ans}.`,
    });
  },
  () => {
    const [ask, ans, wrongs] = pick([
      ["What does the steady-state approximation assume about an intermediate?", "It's used up as fast as it forms", ["Its concentration is zero", "It is the slowest species to form", "It doesn't take part in any step"]],
      ["Why can't an intermediate's concentration appear in the final rate law?", "Intermediates can't be measured or controlled", ["Intermediates don't react", "Intermediates are always catalysts", "Intermediates only appear in the overall equation"]],
      ["A rate law has a negative order for a product, like rate = k[O₃]²/[O₂]. What does that tell you?", "It's made in a fast equilibrium before the slow step", ["The product is a catalyst", "The reaction runs backward", "The rate law is impossible"]],
    ] as [string, string, string[]][]);
    return q({
      key: `ss-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "Rate laws can only contain species you can measure: reactants (and sometimes products or catalysts).",
      explain: `${ans}.`,
    });
  },
);

/** A multistep energy profile where the largest step barrier is also the highest peak. */
function multiProfile() {
  return again(() => {
    const steps = rand(2, 3);
    const R = rand(4, 10) * 10;
    const peaks: number[] = [];
    const valleys: number[] = [];
    let level = R;
    for (let i = 0; i < steps; i++) {
      const pk = level + rand(2, 10) * 10;
      peaks.push(pk);
      if (i < steps - 1) {
        level = pk - rand(2, 10) * 10;
        if (level < 10) return null;
        valleys.push(level);
      }
    }
    const P = peaks[steps - 1] - rand(3, 14) * 10;
    if (P < 0) return null;
    const starts = [R, ...valleys];
    const eas = peaks.map((pk, i) => pk - starts[i]);
    const big = eas.indexOf(Math.max(...eas));
    const high = peaks.indexOf(Math.max(...peaks));
    if (big !== high || eas.filter((e) => e >= eas[big] - 10).length > 1 || peaks.filter((p) => p >= peaks[high] - 10).length > 1) return null;
    return { R, P, peaks, valleys, eas, rds: big };
  });
}

/** 5.10: multistep energy profiles. */
export const multistepProfiles = mix(
  ...[0, 1, 2, 3, 4].map((variant) => () => {
    const pr = multiProfile();
    const visual: Visual = { kind: "chem-energy", mode: "profile", reactants: pr.R, products: pr.P, peaks: pr.peaks, valleys: pr.valleys, showEa: false, showDH: false, labels: { reactants: "Reactants", products: "Products" } };
    const levels = `Energies (kJ/mol): reactants ${pr.R}, ${pr.peaks.map((pk, i) => `TS${i + 1} ${pk}${i < pr.valleys.length ? `, intermediate ${pr.valleys[i]}` : ""}`).join(", ")}, products ${pr.P}.`;
    const key = `ms-${variant}-${pr.R}-${pr.peaks.join(".")}-${pr.valleys.join(".")}-${pr.P}`;
    const steps = pr.peaks.length;
    if (variant === 0)
      return q({ key, prompt: "How many elementary steps does this energy profile show?", visual, needsVisual: true, ...keypad(steps), hint: "Each hump (transition state) is one elementary step.", explain: `There are ${steps} humps, so ${steps} steps, with ${steps - 1} intermediate${steps === 2 ? "" : "s"} in the valleys.` });
    if (variant === 1) {
      const opts = pr.peaks.map((_, i) => `Step ${i + 1}`);
      return q({ key, prompt: `${levels} Which step is rate-determining?`, visual, ...fixedLabels(opts, opts[pr.rds]), hint: "Find each step's activation energy: its peak minus the level just before it. The largest barrier is the slow step.", explain: `Step barriers: ${pr.eas.map((e, i) => `step ${i + 1}: ${e}`).join(", ")} kJ/mol. Step ${pr.rds + 1} is slowest.` });
    }
    if (variant === 2) {
      const i = rand(0, steps - 1);
      return q({ key: `${key}-${i}`, prompt: `${levels} What is the activation energy of step ${i + 1}?`, visual, ...keypad(pr.eas[i]), unit: "kJ/mol", hint: `Step ${i + 1} starts at ${i === 0 ? "the reactants" : `intermediate ${i}`} and climbs to TS${i + 1}.`, explain: `Ea = ${pr.peaks[i]} − ${i === 0 ? pr.R : pr.valleys[i - 1]} = ${pr.eas[i]} kJ/mol.` });
    }
    if (variant === 3)
      return q({ key, prompt: `${levels} What is ΔH for the overall reaction?`, visual, ...signed(pr.P - pr.R), unit: "kJ/mol", hint: "ΔH depends only on the start and end: products − reactants. The intermediates don't matter.", explain: `ΔH = ${pr.P} − ${pr.R} = ${signText(pr.P - pr.R)} kJ/mol.` });
    const opts = ["Endothermic", "Exothermic"];
    const first = pr.valleys[0] - pr.R;
    return q({ key, prompt: `${levels} Is the first step endothermic or exothermic?`, visual, ...fixedLabels(opts, first > 0 ? "Endothermic" : "Exothermic"), hint: "Compare the first intermediate's energy with the reactants'.", explain: `Intermediate 1 (${pr.valleys[0]}) is ${first > 0 ? "above" : "below"} the reactants (${pr.R}), so step 1 is ${first > 0 ? "endothermic" : "exothermic"}.` });
  }),
);

/** 5.11: catalysis. */
export const catalysis = mix(
  () =>
    again(() => {
      const R = rand(3, 10) * 10;
      const P = R + rand(-8, 8) * 10;
      if (P === R || P < 0) return null;
      const T = Math.max(R, P) + rand(6, 14) * 10;
      const C = Math.max(R, P) + rand(2, Math.floor((T - Math.max(R, P)) / 10) - 2) * 10;
      if (C <= Math.max(R, P) || C >= T) return null;
      const askDrop = Math.random() < 0.5;
      return q({
        key: `ca-ea-${R}-${P}-${T}-${C}-${askDrop}`,
        prompt: `Reactants are at ${R} kJ/mol and products at ${P} kJ/mol. The uncatalyzed transition state is at ${T} kJ/mol; with a catalyst (dashed) it's at ${C} kJ/mol. ${askDrop ? "By how much does the catalyst lower the activation energy?" : "What is the activation energy with the catalyst?"}`,
        visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak: T, catalyst: C, labels: { reactants: "Reactants", products: "Products" } },
        ...keypad(askDrop ? T - C : C - R),
        unit: "kJ/mol",
        hint: askDrop ? "Compare the two peaks: the reactant level is the same for both paths." : "Ea = catalyzed peak − reactants.",
        explain: askDrop ? `${T} − ${C} = ${T - C} kJ/mol lower.` : `Ea(catalyzed) = ${C} − ${R} = ${C - R} kJ/mol (uncatalyzed: ${T - R}).`,
      });
    }),
  () => {
    const [ask, ans, wrongs] = pick([
      ["What does adding a catalyst change?", "It provides a new mechanism with a lower activation energy", ["It lowers ΔH", "It makes the products more stable", "It increases the energy of the reactants"]],
      ["How does a catalyst affect ΔH of a reaction?", "No change: reactants and products are at the same energies", ["ΔH becomes more negative", "ΔH becomes positive", "ΔH decreases by the same amount as Ea"]],
      ["A catalyst speeds up the forward reaction. What does it do to the reverse reaction?", "Speeds it up too (same barrier drop)", ["Slows it down", "Has no effect", "Stops it completely"]],
      ["Why can a small amount of catalyst affect a large amount of reactant?", "It is regenerated and reused", ["It is a reactant used in large amounts", "It raises the temperature", "It turns into the product"]],
    ] as [string, string, string[]][]);
    return q({
      key: `ca-why-${ask.slice(0, 22)}`,
      prompt: ask,
      ...label(ans, wrongs),
      hint: "A catalyst takes part in the mechanism but comes out unchanged; it changes the path, not the start or end.",
      explain: `${ans}.`,
    });
  },
  () => {
    const m = pick(MECHS.filter((x) => x.cat.length));
    return q({
      key: `ca-id-${mechIndex(m)}`,
      prompt: "Which species is a catalyst in this mechanism?",
      visual: mechTable(m),
      needsVisual: true,
      ...label(m.cat[0], mechSpecies(m).filter((s) => !m.cat.includes(s))),
      hint: "A catalyst is used up in an early step and made again in a later step, so it isn't in the overall equation but is present at the start.",
      explain: `${m.cat[0]} is consumed in step 1 and regenerated in step 2 (overall: ${m.overall}). ${m.inter[0]} is an intermediate.`,
    });
  },
  () => {
    const [scene, ans] = pick([
      ["Exhaust gases react on a platinum and rhodium surface in a catalytic converter.", "Surface (heterogeneous) catalysis"],
      ["H⁺ is added to an ester solution; it is used in one step and released in a later step.", "Acid catalysis"],
      ["A protein binds a substrate in its active site, holding it in the right orientation.", "Enzyme catalysis"],
      ["N₂ and H₂ react on the surface of solid iron in the Haber process.", "Surface (heterogeneous) catalysis"],
      ["Catalase speeds up the breakdown of H₂O₂ in your cells.", "Enzyme catalysis"],
      ["OH⁻ removes a proton from a reactant to start the reaction and is re-formed at the end.", "Base catalysis"],
    ]);
    return q({
      key: `ca-type-${scene.slice(0, 20)}`,
      prompt: `What kind of catalysis is this? ${scene}`,
      ...label(ans, ["Surface (heterogeneous) catalysis", "Acid catalysis", "Base catalysis", "Enzyme catalysis"].filter((x) => x !== ans)),
      hint: "Solid surface → heterogeneous. H⁺ or OH⁻ added and regenerated → acid/base. A protein → enzyme.",
      explain: `${ans}.`,
    });
  },
);
