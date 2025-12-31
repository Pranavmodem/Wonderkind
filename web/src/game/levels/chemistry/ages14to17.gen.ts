/**
 * Question generators for high school chemistry (ages 14–17, NGSS HS-PS1 and HS-PS2-6). Worlds and lessons are
 * assembled in ./ages14to17.ts.
 *
 * Numbers come from real data: element data and molar masses from elements.ts, equations balanced by the same
 * `balance` the pictures validate with, and textbook values (rounded) for radii, ionization energies, bond
 * enthalpies, boiling points and half-lives.
 */
import { labelChoices, pick, rand, shuffle } from "../../questions";
import { balance } from "../../science/chemistryValidate";
import type { ChemistryVisual, Nuclide, ReactionTerm } from "../../science/chemistryTypes";
import { chargeText, electronConfig, element, metalClass, sub, sup, valenceElectrons } from "../../science/elements";
import type { Activity, Question, Visual } from "../../types";

/* =================================================================== helpers */

const NONE: Visual = { kind: "none" };
type Ans = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra" | "activity">;

/** Remove floating-point noise. */
const clean = (x: number) => Math.round(x * 1e6) / 1e6;
/** Round to d decimal places. */
const rd = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
/** A number as text with a real minus sign. */
const ns = (x: number) => (x < 0 ? `−${clean(-x)}` : String(clean(x)));
/** Signed text: +57, −92. */
const sgn = (x: number) => (x > 0 ? `+${x}` : ns(x));
/** Fixed decimals as text: 35.48, 2.0. */
const fx = (x: number, d: number) => (x < 0 ? `−${(-x).toFixed(d)}` : x.toFixed(d));
const pickN = <T,>(items: readonly T[], n: number): T[] => shuffle(items).slice(0, n);
const nameOf = (sym: string) => element(sym)!.name;
const lower = (sym: string) => element(sym)!.name.toLowerCase();
const zOf = (sym: string) => element(sym)!.z;
/** Lower-case just the first letter (keeps formulas like NaOH intact). */
const lc1 = (t: string) => t[0].toLowerCase() + t.slice(1);

/** Text choices (label indexes). */
function label(correct: string, wrong: string[]): Ans {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong));
  return { answer, input: "choices", choices, labels };
}

/** Text choices kept in the given order (e.g. A, B / left, right). */
function labelInOrder(options: string[], correct: string): Ans {
  return { answer: options.indexOf(correct), input: "choices", choices: options.map((_, i) => i), labels: options };
}

/** Number choices: the answer, likely mistakes, then neighbours `step` apart. */
function nums(answer: number, wrong: number[], step = 1, n = 4): number[] {
  const out: number[] = [clean(answer)];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < n && Number.isFinite(v) && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < n && k < 80; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return shuffle(out);
}

function choose(answer: number, wrong: number[], step = 1): Ans {
  return { answer: clean(answer), input: "choices", choices: nums(answer, wrong, step) };
}

/** Type the answer: decimals get ".", negatives get "−" (negative decimals become choices). */
function keypad(answer: number, wrong: number[] = []): Ans {
  const a = clean(answer);
  if (a < 0 && !Number.isInteger(a)) return choose(a, wrong.length ? wrong : [-a], 0.5);
  if (a < 0) return { answer: a, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(a)) return { answer: a, input: "keypad", keypadExtra: "." };
  return { answer: a, input: "keypad" };
}

/** A signed whole number on a keypad with a "−" key (so the sign isn't given away). */
const signed = (answer: number): Ans => ({ answer, input: "keypad", keypadExtra: "−" });

const act = (activity: Activity, answer = 1): Ans => ({ input: "activity", activity, answer });

const SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const fromSup = (s: string) => [...s].map((c) => SUPD.indexOf(c)).join("");

/** Turn chemistry text into words for the voice (the speech helper does formulas, charges and units). */
export function say(s: string): string {
  return s
    .replace(/×\s?10([⁻]?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, neg: string, d: string) => ` times 10 to the ${neg ? "negative " : ""}${fromSup(d)}`)
    .replace(/¹₀n/g, " a neutron ")
    .replace(/⁰₋₁e/g, " a beta particle ")
    .replace(/⁰₊₁e/g, " a positron ")
    .replace(/⁰₀γ/g, " a gamma ray ")
    .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)[₋₀₁₂₃₄₅₆₇₈₉]*([A-Z][a-z]?)/g, (m, a: string, sym: string) =>
      element(sym) ? ` ${lower(sym)}-${fromSup(a)} ` : m,
    )
    .replace(/([1-7])([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, n: string, l: string, k: string) => `${n} ${l} ${fromSup(k)},`)
    .replace(/\[([A-Z][a-z]?)\]/g, "$1 core,")
    .replace(/([A-Z][a-z]?)≡([A-Z])/g, "$1 triple-bond $2")
    .replace(/([A-Z][a-z]?)=([A-Z])/g, "$1 double-bond $2")
    .replace(/([A-Z][a-z]?)–([A-Z])/g, "$1 $2")
    .replace(/kJ\/mol/g, " kilojoules per mole")
    .replace(/g\/mol/g, " grams per mole")
    .replace(/J\/\(g·°C\)/g, " joules per gram per degree")
    .replace(/mL\/s/g, " milliliters per second")
    .replace(/g\/s/g, " grams per second")
    .replace(/(\d) pm\b/g, "$1 picometers")
    .replace(/ΔH/g, "delta H")
    .replace(/\bEa\b/g, "activation energy")
    .replace(/e⁻/g, " electrons")
    .replace(/\s+/g, " ")
    .replace(/\s+([?.,!:])/g, "$1")
    .replace(/,([.?!])/g, "$1")
    .trim();
}

interface QIn {
  key: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  ans: Ans;
  hint: string;
  explain: string;
  unit?: string;
}

/** Build a question; speech defaults to the prompt, read aloud. */
function q(o: QIn): Question {
  const out: Question = {
    key: o.key,
    prompt: o.prompt,
    speech: o.speech ?? say(o.prompt),
    visual: o.visual ?? NONE,
    ...o.ans,
    hint: o.hint,
    explain: o.explain,
  };
  if (o.needsVisual) out.needsVisual = true;
  if (o.unit) out.unit = o.unit;
  return out;
}

/** Isotope notation: ³⁷₁₇Cl (with atomic number) or ³⁷Cl. */
const iso = (sym: string, A: number, withZ = true) => `${sup(String(A))}${withZ ? sub(String(zOf(sym))) : ""}${sym}`;
/** Ion text: Mg²⁺, Cl⁻. */
const ion = (sym: string, charge: number) => `${sym}${chargeText(charge)}`;
/** A charge written as text: "2+", "1−". */
const chargeWord = (c: number) => (c === 0 ? "0" : `${Math.abs(c)}${c > 0 ? "+" : "−"}`);

/* ------------------------------------------------------------- equations */

/** Parse "2H₂ + O₂ → 2H₂O" into reactant and product terms. */
function eqTerms(eq: string): { r: [number, string][]; p: [number, string][] } {
  const side = (s: string) =>
    s.split(" + ").map((t) => {
      const m = /^(\d+)(.+)$/.exec(t.trim());
      return (m ? [Number(m[1]), m[2]] : [1, t.trim()]) as [number, string];
    });
  const [l, r] = eq.split(/ → | ⇌ /);
  return { r: side(l), p: side(r) };
}

/** A chem-reaction picture of a balanced equation string, optionally with one coefficient as "?". */
function rxn(eq: string, opts: { askCoef?: number; arrow?: "→" | "⇌"; dH?: number | string; above?: string; askProducts?: boolean } = {}): ChemistryVisual {
  const { r, p } = eqTerms(eq);
  let i = 0;
  const term = ([c, f]: [number, string]): ReactionTerm => {
    const t: ReactionTerm = { coef: opts.askCoef === i ? "?" : c, formula: f };
    i++;
    return t;
  };
  const v: ChemistryVisual = {
    kind: "chem-reaction",
    reactants: r.map(term),
    products: opts.askProducts ? [{ formula: "?" }] : p.map(term),
    arrow: opts.arrow ?? (eq.includes("⇌") ? "⇌" : "→"),
  };
  if (opts.dH !== undefined) v.dH = opts.dH;
  if (opts.above) v.above = opts.above;
  return v;
}

/** Smallest whole-number coefficients for formulas (reactants then products). */
function coefs(reactants: string[], products: string[]): number[] {
  return balance(reactants, products).coefficients!;
}

/** "2H₂ + O₂ → 2H₂O" from formulas, balanced. */
function balancedText(reactants: string[], products: string[]): string {
  const c = coefs(reactants, products);
  const t = (f: string, i: number) => `${c[i] === 1 ? "" : c[i]}${f}`;
  return `${reactants.map((f, i) => t(f, i)).join(" + ")} → ${products.map((f, i) => t(f, i + reactants.length)).join(" + ")}`;
}

/** Atoms of each element in a formula (with a coefficient). */
function countAtoms(formula: string, el: string): number {
  // Expand parentheses: Ca(NO₃)₂ → 1 Ca, 2 N, 6 O.
  const s = formula.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080)).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/, "");
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  const num = () => {
    let d = "";
    while (i < s.length && /\d/.test(s[i])) d += s[i++];
    return d ? Number(d) : 1;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "(") {
      stack.push({});
      i++;
    } else if (c === ")") {
      i++;
      const n = num();
      const top = stack.pop()!;
      for (const [k, v] of Object.entries(top)) stack[stack.length - 1][k] = (stack[stack.length - 1][k] ?? 0) + v * n;
    } else if (/[A-Z]/.test(c)) {
      let sym = c;
      i++;
      if (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
      const n = num();
      stack[stack.length - 1][sym] = (stack[stack.length - 1][sym] ?? 0) + n;
    } else i++;
  }
  return stack[0][el] ?? 0;
}

/* ===================================================== 1. Atoms & isotopes */

/** Real isotopes of light elements (symbol, mass number), small enough to draw. */
const LIGHT_ISOTOPES: [string, number][] = [
  ["He", 4], ["Li", 6], ["Li", 7], ["Be", 9], ["B", 10], ["B", 11], ["C", 12], ["C", 13], ["C", 14], ["N", 14], ["N", 15],
  ["O", 16], ["O", 17], ["O", 18], ["F", 19], ["Ne", 20], ["Ne", 22], ["Na", 23], ["Mg", 24], ["Mg", 25], ["Mg", 26], ["Al", 27],
  ["Si", 28], ["Si", 30], ["P", 31], ["S", 32], ["S", 34], ["Cl", 35], ["Cl", 37], ["Ar", 40], ["K", 39], ["K", 41], ["Ca", 40], ["Ca", 44],
];
/** Heavier isotopes for notation questions. */
const HEAVY_ISOTOPES: [string, number][] = [
  ["Fe", 56], ["Co", 60], ["Cu", 63], ["Cu", 65], ["Zn", 64], ["Br", 79], ["Br", 81], ["Sr", 90], ["Ag", 107], ["I", 127], ["I", 131],
  ["Cs", 137], ["Au", 197], ["Pb", 208], ["U", 235], ["U", 238],
];
const isoName = (sym: string, A: number) => `${lower(sym)}-${A}`;

/** HS-PS1-1 — protons, neutrons, electrons; atomic and mass numbers. */
export function subatomic(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [sym, A] = pick([...LIGHT_ISOTOPES, ...HEAVY_ISOTOPES]);
    const Z = zOf(sym);
    const ask = pick(["protons", "neutrons", "electrons"] as const);
    const ans = ask === "neutrons" ? A - Z : Z;
    return q({
      key: `sub-iso-${sym}${A}-${ask}`,
      prompt: `How many ${ask} are in a neutral atom of ${iso(sym, A, false)}? Use the tile for the atomic number.`,
      visual: { kind: "chem-element", element: sym, mass: null },
      ans: keypad(ans),
      hint: ask === "neutrons" ? "Neutrons = mass number − atomic number." : `The atomic number is the number of protons${ask === "electrons" ? ", and a neutral atom has the same number of electrons" : ""}.`,
      explain: ask === "neutrons" ? `${A} − ${Z} = ${A - Z} neutrons.` : `${nameOf(sym)} has atomic number ${Z}, so ${Z} ${ask}.`,
    });
  }
  if (kind === 1) {
    const [sym, A] = pick(LIGHT_ISOTOPES);
    const Z = zOf(sym);
    return q({
      key: `sub-massno-${sym}${A}`,
      prompt: `An atom has ${Z} protons and ${A - Z} neutrons. What is its mass number?`,
      ans: keypad(A),
      hint: "The mass number counts everything in the nucleus: protons + neutrons.",
      explain: `${Z} + ${A - Z} = ${A}. It's ${isoName(sym, A)}.`,
    });
  }
  if (kind === 2) {
    const [sym, A] = pick(LIGHT_ISOTOPES);
    const Z = zOf(sym);
    const wrong = [Z - 1, Z + 1, A - Z, A].filter((z) => z >= 1 && z <= 118 && z !== Z).map((z) => element(z)!.name);
    return q({
      key: `sub-which-${sym}${A}`,
      prompt: "Which element is this atom?",
      speech: "Count the protons. Which element is this atom?",
      visual: { kind: "chem-atom", protons: Z, neutrons: A - Z, electrons: Z, hide: ["symbol"] },
      needsVisual: true,
      ans: label(nameOf(sym), wrong),
      hint: "Only the number of protons decides the element. Look for p⁺ in the nucleus.",
      explain: `${Z} protons means atomic number ${Z}: ${lower(sym)}. (Neutrons don't change the element.)`,
    });
  }
  if (kind === 3) {
    const [sym, A] = pick(LIGHT_ISOTOPES);
    const Z = zOf(sym);
    return q({
      key: `sub-read-${sym}${A}`,
      prompt: "What is the mass number of this atom?",
      speech: "Read the nucleus. What is the mass number of this atom?",
      visual: { kind: "chem-atom", protons: Z, neutrons: A - Z, electrons: Z, hide: ["mass"] },
      needsVisual: true,
      ans: keypad(A),
      hint: "Add the protons and neutrons in the nucleus. Electrons are too light to count.",
      explain: `${Z} protons + ${A - Z} neutrons = ${A}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Which particle decides which element an atom is?", "Proton", ["Neutron", "Electron", "Photon"]],
    ["Which particles are found in the nucleus?", "Protons and neutrons", ["Protons and electrons", "Neutrons and electrons", "Only electrons"]],
    ["Which particle has by far the least mass?", "Electron", ["Proton", "Neutron", "They're all the same"]],
    ["Which particle has no electric charge?", "Neutron", ["Proton", "Electron", "Ion"]],
    ["Which particles take part in chemical reactions?", "Electrons (the outer ones)", ["Protons", "Neutrons", "The whole nucleus"]],
    ["Why is a whole atom neutral?", "It has equal numbers of protons and electrons", ["It has equal protons and neutrons", "Neutrons cancel the charges", "Electrons have no charge"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `sub-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Protons (+) and neutrons (0) sit in the tiny nucleus; light electrons (−) move around it.",
    explain: `${right}. Protons set the element, neutrons add mass, and outer electrons do the chemistry.`,
  });
}

/** HS-PS1-1 — isotopes: same protons, different neutrons. */
export function isotopes(): Question {
  const kind = rand(0, 3);
  const pairs = LIGHT_ISOTOPES.filter(([s], i) => LIGHT_ISOTOPES.findIndex(([t]) => t === s) !== i);
  if (kind === 0) {
    const [sym, A] = pick(pairs);
    const others = LIGHT_ISOTOPES.filter(([s, a]) => s === sym && a !== A);
    const [, B] = pick(others);
    const Z = zOf(sym);
    const sameA = LIGHT_ISOTOPES.filter(([s, a]) => a === A && s !== sym).map(([s, a]) => iso(s, a));
    const wrong = [...sameA, iso(element(Z + 1)!.symbol, A + 1), iso(element(Z - 1)!.symbol, B), iso(element(Z + 1)!.symbol, B + 2)];
    return q({
      key: `iso-pick-${sym}${A}-${B}`,
      prompt: `Which atom is an isotope of ${iso(sym, A)}?`,
      ans: label(iso(sym, B), wrong),
      hint: "Isotopes have the same atomic number (bottom number) but different mass numbers.",
      explain: `${iso(sym, B)} also has ${Z} protons, so it's ${lower(sym)}, just with ${Math.abs(B - A)} ${B > A ? "more" : "fewer"} neutron${Math.abs(B - A) === 1 ? "" : "s"}.`,
    });
  }
  if (kind === 1) {
    const [sym, A] = pick(pairs);
    const [, B] = pick(LIGHT_ISOTOPES.filter(([s, a]) => s === sym && a > A).length ? LIGHT_ISOTOPES.filter(([s, a]) => s === sym && a > A) : LIGHT_ISOTOPES.filter(([s, a]) => s === sym && a !== A));
    const [lo, hi] = A < B ? [A, B] : [B, A];
    const d = hi - lo;
    const n = (k: number) => `${k} more ${k === 1 ? "" : ""}`;
    return q({
      key: `iso-diff-${sym}${lo}-${hi}`,
      prompt: `How is ${isoName(sym, hi)} different from ${isoName(sym, lo)}?`,
      ans: label(`${n(d)}neutron${d === 1 ? "" : "s"}`, [`${n(d)}proton${d === 1 ? "" : "s"}`, `${n(d)}electron${d === 1 ? "" : "s"}`, "It's a different element"]),
      hint: "The number after the name is the mass number. The element (protons) stays the same.",
      explain: `Both are ${lower(sym)} (${zOf(sym)} protons). Mass ${hi} vs ${lo}: ${d} more neutron${d === 1 ? "" : "s"}.`,
    });
  }
  if (kind === 2) {
    const [sym, A] = pick([...LIGHT_ISOTOPES, ...HEAVY_ISOTOPES]);
    const Z = zOf(sym);
    return q({
      key: `iso-n-${sym}${A}`,
      prompt: `How many neutrons are in ${isoName(sym, A)}?`,
      visual: { kind: "chem-element", element: sym, mass: null },
      ans: keypad(A - Z, [A, Z, A + Z]),
      hint: `"${isoName(sym, A)}" means mass number ${A}. Subtract the atomic number from the tile.`,
      explain: `${A} − ${Z} = ${A - Z} neutrons.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Carbon-12 and carbon-14 react in the same way. Why?", "Same protons, so same electrons", ["Same mass number", "Same number of neutrons", "Neutrons control reactions"]],
    ["What is the SAME in every isotope of an element?", "The number of protons", ["The number of neutrons", "The mass number", "The mass of the atom"]],
    ["What is DIFFERENT between isotopes of an element?", "The number of neutrons", ["The number of protons", "The atomic number", "The charge of the nucleus"]],
    ["Uranium-235 and uranium-238 differ in…", "Mass, not chemistry", ["Chemistry, not mass", "Their atomic number", "Their number of electrons"]],
    ["Heavy water contains ²H (deuterium) instead of ¹H. A deuterium atom has…", "1 proton and 1 neutron", ["2 protons", "2 electrons", "1 proton and 2 neutrons"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `iso-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Isotopes: same element (same protons and electrons), different neutrons (different mass).",
    explain: `${right}. Chemistry depends on electrons, which depend on protons; neutrons only add mass.`,
  });
}

/** HS-PS1-1 — Do it: build an isotope. */
export function buildIsotope(): Question {
  const [sym, A] = pick(LIGHT_ISOTOPES.filter(([s]) => zOf(s) <= 20));
  const Z = zOf(sym);
  const name = isoName(sym, A);
  const asNotation = rand(0, 1) === 1;
  return q({
    key: `build-iso-${sym}${A}-${asNotation ? "n" : "w"}`,
    prompt: asNotation ? `Build a neutral atom of ${iso(sym, A)}.` : `Build a neutral atom of ${name}.`,
    speech: `Build a neutral atom of ${name}. Add protons, neutrons and electrons.`,
    ans: act({ kind: "chem-buildAtom", target: { element: sym, A } }, A),
    hint: `Protons = atomic number (${Z}). Neutrons = ${A} − ${Z}. Neutral means electrons = protons.`,
    explain: `${name}: ${Z} protons, ${A - Z} neutrons and ${Z} electrons.`,
  });
}

/** Common simple ions, light enough to draw. */
const IONS: [string, number][] = [
  ["Li", 1], ["Na", 1], ["K", 1], ["Be", 2], ["Mg", 2], ["Ca", 2], ["Al", 3], ["N", -3], ["O", -2], ["F", -1], ["P", -3], ["S", -2], ["Cl", -1], ["Br", -1],
];
const MASS_NO: Record<string, number> = { B: 11, C: 12, Si: 28, Ne: 20, Ar: 40, Li: 7, Na: 23, K: 39, Be: 9, Mg: 24, Ca: 40, Al: 27, N: 14, O: 16, F: 19, P: 31, S: 32, Cl: 35, Br: 79, H: 1 };

/** HS-PS1-1 — ions: gaining and losing electrons. */
export function ions(): Question {
  const kind = rand(0, 3);
  const [sym, c] = pick(IONS);
  const Z = zOf(sym);
  const e = Z - c;
  if (kind === 0) {
    const wrong = [chargeWord(-c), chargeWord(c + (c > 0 ? 1 : -1)), chargeWord(c > 0 ? c - 1 || 2 : c + 1 || -2), "0"];
    return q({
      key: `ion-read-${sym}`,
      prompt: "What is the charge on this ion?",
      speech: "Compare protons and electrons. What is the charge on this ion?",
      visual: { kind: "chem-atom", protons: Z, neutrons: MASS_NO[sym] - Z, electrons: e, hide: ["charge"] },
      needsVisual: true,
      ans: label(chargeWord(c), wrong),
      hint: "Charge = protons − electrons. Count the electrons on all the shells.",
      explain: `${Z} protons − ${e} electrons = ${c > 0 ? "+" : "−"}${Math.abs(c)}, so it's ${ion(sym, c)}.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `ion-e-${sym}`,
      prompt: `How many electrons does the ion ${ion(sym, c)} have?`,
      ans: keypad(e, [Z, Z + c, Z - c + 1]),
      hint: `${nameOf(sym)} has ${Z} protons. A ${c > 0 ? "positive ion has LOST" : "negative ion has GAINED"} electrons.`,
      explain: `${Z} ${c > 0 ? "−" : "+"} ${Math.abs(c)} = ${e} electrons.`,
    });
  }
  if (kind === 2) {
    const wrong = [ion(sym, -c), ion(element(Z + 1)!.symbol, c), ion(element(Z - 1)!.symbol, -c), ion(sym, c + (c > 0 ? 1 : -1))];
    return q({
      key: `ion-symbol-${sym}`,
      prompt: `An ion has ${Z} protons and ${e} electrons. Which ion is it?`,
      ans: label(ion(sym, c), wrong),
      hint: "Protons name the element; charge = protons − electrons.",
      explain: `${Z} protons is ${lower(sym)}; ${Z} − ${e} = ${sgn(c)}, so ${ion(sym, c)}.`,
    });
  }
  const n = Math.abs(c);
  const v = valenceElectrons(sym)!;
  const right = c > 0 ? `Loses ${n} electron${n === 1 ? "" : "s"}` : `Gains ${n} electron${n === 1 ? "" : "s"}`;
  const wrong = c > 0 ? [`Gains ${8 - v} electrons`, `Gains ${n} electron${n === 1 ? "" : "s"}`, `Loses ${n} proton${n === 1 ? "" : "s"}`] : [`Loses ${v} electrons`, `Loses ${n} electron${n === 1 ? "" : "s"}`, `Gains ${n} proton${n === 1 ? "" : "s"}`];
  return q({
    key: `ion-why-${sym}`,
    prompt: `${nameOf(sym)} has ${v} valence electron${v === 1 ? "" : "s"}. How does it usually become stable?`,
    ans: label(right, wrong),
    hint: "Atoms take the easiest path to a full outer shell: lose a few electrons, or gain a few.",
    explain: `${right}, making ${ion(sym, c)} with a full outer shell. ${c > 0 ? "Losing" : "Gaining"} ${n} is far easier than ${c > 0 ? `gaining ${8 - v}` : `losing ${v}`}.`,
  });
}

/** HS-PS1-1 — Do it: build an ion. */
export function buildIon(): Question {
  const light = IONS.filter(([s]) => zOf(s) <= 20);
  const [sym, c] = pick(light);
  const Z = zOf(sym);
  const hidden = rand(0, 1) === 1;
  const v = valenceElectrons(sym)!;
  return q({
    key: `build-ion-${sym}-${hidden ? "h" : "s"}`,
    prompt: hidden
      ? `${nameOf(sym)} (${v} valence electron${v === 1 ? "" : "s"}) forms one stable ion. Build that ion.`
      : `Build the ion ${ion(sym, c)}.`,
    speech: hidden ? `${nameOf(sym)} has ${v} valence electrons and forms one stable ion. Build that ion.` : `Build the ${lower(sym)} ion with a charge of ${chargeWord(c).replace("−", " minus").replace("+", " plus")}.`,
    ans: act({ kind: "chem-buildAtom", target: { element: sym, charge: c }, hideTarget: hidden }, Z),
    hint: hidden ? `Will ${lower(sym)} lose ${v} or gain ${8 - v} to fill its outer shell? Pick the smaller number.` : `${Z} protons for ${lower(sym)}. Charge = protons − electrons.`,
    explain: `${ion(sym, c)}: ${Z} protons and ${Z - c} electrons (${c > 0 ? "lost" : "gained"} ${Math.abs(c)}).`,
  });
}

/** Isotope abundances (mass number, percent) for real elements. */
const ABUNDANCE: Record<string, [number, number][]> = {
  Cl: [[35, 75.8], [37, 24.2]],
  B: [[10, 19.9], [11, 80.1]],
  Cu: [[63, 69.2], [65, 30.8]],
  Br: [[79, 50.7], [81, 49.3]],
  Li: [[6, 7.6], [7, 92.4]],
  Ga: [[69, 60.1], [71, 39.9]],
  Rb: [[85, 72.2], [87, 27.8]],
  Ag: [[107, 51.8], [109, 48.2]],
  Sb: [[121, 57.2], [123, 42.8]],
  K: [[39, 93.3], [41, 6.7]],
  Mg: [[24, 79.0], [25, 10.0], [26, 11.0]],
  Ne: [[20, 90.5], [21, 0.3], [22, 9.2]],
  Si: [[28, 92.2], [29, 4.7], [30, 3.1]],
  Cr: [[50, 4.3], [52, 83.8], [53, 9.5], [54, 2.4]],
  Fe: [[54, 5.8], [56, 91.8], [57, 2.1], [58, 0.3]],
  Zn: [[64, 49.2], [66, 27.7], [67, 4.0], [68, 18.5], [70, 0.6]],
  Ge: [[70, 20.5], [72, 27.4], [73, 7.8], [74, 36.5], [76, 7.8]],
  Zr: [[90, 51.5], [91, 11.2], [92, 17.1], [94, 17.4], [96, 2.8]],
};
const avgOf = (iso2: [number, number][]) => iso2.reduce((t, [m, p]) => t + m * p, 0) / 100;
const spectrum = (sym: string, title: boolean, labels = true): ChemistryVisual => ({
  kind: "chem-spectrum",
  mode: "mass",
  peaks: ABUNDANCE[sym].map(([mz, percent]) => ({ mz, percent, label: labels ? `${sup(String(mz))}${sym} ${percent}%` : undefined })),
  ...(title ? { title: nameOf(sym) } : {}),
});

/** HS-PS1-1 — average atomic mass from isotope abundances. */
export function avgMass(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const sym = pick(["Cl", "B", "Cu", "Br", "Li", "Ga", "Rb", "Ag", "Sb", "K", "Mg", "Si"]);
    const data = ABUNDANCE[sym];
    const avg = rd(avgOf(data));
    const plain = rd(data.reduce((t, [m]) => t + m, 0) / data.length);
    const swapped = data.length === 2 ? rd((data[0][0] * data[1][1] + data[1][0] * data[0][1]) / 100) : rd(avg + 0.5);
    const top = [...data].sort((a, b) => b[1] - a[1])[0][0];
    return q({
      key: `avg-real-${sym}`,
      prompt: `Use the mass spectrum to find the average atomic mass of ${lower(sym)} (use the mass numbers).`,
      visual: spectrum(sym, true),
      needsVisual: true,
      ans: choose(avg, [plain, swapped, top, rd(avg + 0.3)], 0.25),
      hint: "Weighted average: multiply each mass by its percent (as a decimal), then add.",
      explain: `${data.map(([m, p]) => `${m} × ${(p / 100).toFixed(3).replace(/0+$/, "")}`).join(" + ")} = ${avg.toFixed(2)}. The table lists ${element(sym)!.mass}, very close.`,
    });
  }
  if (kind === 1) {
    const m = rand(10, 45) * 2;
    const p = rand(1, 9) * 10;
    const avg = rd((m * p + (m + 2) * (100 - p)) / 100, 1);
    return q({
      key: `avg-x-${m}-${p}`,
      prompt: `Element X is ${p}% X-${m} and ${100 - p}% X-${m + 2}. What is its average atomic mass?`,
      visual: { kind: "chem-spectrum", mode: "mass", peaks: [{ mz: m, percent: p, label: `X-${m} ${p}%` }, { mz: m + 2, percent: 100 - p, label: `X-${m + 2} ${100 - p}%` }], title: "Element X" },
      ans: keypad(avg),
      hint: `Average = ${m} × ${p / 100} + ${m + 2} × ${(100 - p) / 100}. It must land nearer the more common isotope.`,
      explain: `${m} × ${p / 100} + ${m + 2} × ${(100 - p) / 100} = ${avg}.`,
    });
  }
  const sym = pick(["Cl", "B", "Cu", "Li", "Ga", "Rb", "K", "Sb"]);
  const [a, b] = ABUNDANCE[sym];
  const more = a[1] > b[1] ? a[0] : b[0];
  const mass = element(sym)!.mass;
  return q({
    key: `avg-which-${sym}`,
    prompt: `${nameOf(sym)} has two isotopes, ${sym}-${a[0]} and ${sym}-${b[0]}. Its average atomic mass is ${mass}. Which isotope is more common?`,
    ans: label(`${sym}-${more}`, [`${sym}-${more === a[0] ? b[0] : a[0]}`, "They're equally common", "You can't tell"]),
    hint: `If they were equally common the average would be exactly halfway (${(a[0] + b[0]) / 2}). Which way is it pulled?`,
    explain: `${mass} is closer to ${more}, so ${sym}-${more} is more common (${Math.max(a[1], b[1])}%).`,
  });
}

/** HS-PS1-1 — reading mass spectra. */
export function massSpectra(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const sym = pick(Object.keys(ABUNDANCE));
    const n = ABUNDANCE[sym].length;
    return q({
      key: `ms-count-${sym}`,
      prompt: `How many isotopes of ${lower(sym)} does this mass spectrum show?`,
      visual: spectrum(sym, true, false),
      needsVisual: true,
      ans: choose(n, [n + 1, n - 1, 1]),
      hint: "Each peak is one isotope (one mass).",
      explain: `There are ${n} peaks, at ${ABUNDANCE[sym].map(([m]) => m).join(", ")}: ${n} isotopes.`,
    });
  }
  if (kind === 1) {
    const sym = pick(Object.keys(ABUNDANCE));
    const top = [...ABUNDANCE[sym]].sort((a, b) => b[1] - a[1])[0][0];
    const others = ABUNDANCE[sym].map(([m]) => `${sym}-${m}`).filter((s) => s !== `${sym}-${top}`);
    return q({
      key: `ms-top-${sym}`,
      prompt: `Which isotope of ${lower(sym)} is most abundant?`,
      visual: spectrum(sym, true, false),
      needsVisual: true,
      ans: label(`${sym}-${top}`, [...others, `${sym}-${Math.round(element(sym)!.mass) === top ? top + 1 : Math.round(element(sym)!.mass)}`]),
      hint: "The tallest peak is the most common isotope. Read its mass on the m/z axis.",
      explain: `The tallest peak is at m/z ${top}: ${sym}-${top}.`,
    });
  }
  if (kind === 2) {
    const sym = pick(["Cl", "B", "Cu", "Br", "Li", "Ga", "Rb", "Ag", "Mg", "Si", "Ne", "Zr", "Ge", "Zn"]);
    const avg = avgOf(ABUNDANCE[sym]);
    const pool = Object.keys(ABUNDANCE).filter((s) => s !== sym && Math.abs(element(s)!.mass - avg) > 2);
    const near = [element(zOf(sym) - 1)!.symbol, element(zOf(sym) + 1)!.symbol];
    return q({
      key: `ms-id-${sym}`,
      prompt: "This element's spectrum is shown (its name is hidden). Which element is it?",
      visual: spectrum(sym, false, false),
      needsVisual: true,
      ans: label(nameOf(sym), [...near.map(nameOf), ...pickN(pool, 2).map(nameOf)]),
      hint: "Estimate the weighted average mass from the peaks, then match it to the periodic table.",
      explain: `The peaks average to about ${avg.toFixed(1)}, which matches ${lower(sym)} (${element(sym)!.mass}).`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why is chlorine's atomic mass 35.45 and not a whole number?", "It's an average of isotopes", ["Protons have fractional mass", "Some atoms are missing electrons", "It's a rounding error"]],
    ["In a mass spectrum, what does the height of each peak show?", "How common that isotope is", ["The isotope's mass", "How many protons it has", "How fast it moves"]],
    ["In a mass spectrum, what does the position of a peak (m/z) show?", "The isotope's mass", ["How common the isotope is", "The element's group", "The number of electrons"]],
    ["Two elements' spectra both have peaks at mass 40. How can you tell them apart?", "Look at the other peaks and the average mass", ["You can't, they're the same", "The taller peak is always the element", "Count the protons in the peak"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `ms-fact-${i}`,
    prompt,
    visual: spectrum("Cl", true),
    ans: label(right, wrong),
    hint: "Peaks sit at each isotope's mass; their heights show the percent of atoms.",
    explain: `${right}.`,
  });
}

/** Elements for configuration questions (avoids the Cr/Cu exceptions). */
const CONFIG_Z = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 26, 30, 31, 33, 34, 35, 36];

/** HS-PS1-1 — electron configurations. */
export function configurations(): Question {
  const kind = rand(0, 4);
  const z = pick(CONFIG_Z);
  const sym = element(z)!.symbol;
  const near = [z - 2, z - 1, z + 1, z + 2].filter((x) => x >= 1 && x <= 36);
  if (kind === 0) {
    return q({
      key: `cfg-which-${z}`,
      prompt: `Which element has this configuration? ${electronConfig(z)}`,
      ans: label(nameOf(sym), near.map((x) => element(x)!.name)),
      hint: "Add up all the superscripts: that's the number of electrons, which equals the atomic number.",
      explain: `The superscripts add to ${z}, so it's ${lower(sym)} (Z = ${z}).`,
    });
  }
  if (kind === 1) {
    return q({
      key: `cfg-write-${z}`,
      prompt: `Which is the electron configuration of ${lower(sym)} (Z = ${z})?`,
      ans: label(electronConfig(z), near.map((x) => electronConfig(x))),
      hint: "Fill in order 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p… until you've placed all the electrons.",
      explain: `${nameOf(sym)} has ${z} electrons: ${electronConfig(z)}.`,
    });
  }
  if (kind === 2) {
    const mainZ = pick(CONFIG_Z.filter((x) => valenceElectrons(x) !== null));
    const v = valenceElectrons(mainZ)!;
    const s = element(mainZ)!.symbol;
    return q({
      key: `cfg-outer-${mainZ}`,
      prompt: `${nameOf(s)} is ${electronConfig(mainZ)}. How many electrons are in its outermost shell?`,
      ans: keypad(v),
      hint: "Find the highest shell number (the biggest leading digit) and add the electrons in that shell's s and p.",
      explain: `The highest shell is ${element(mainZ)!.period}; it holds ${v} electron${v === 1 ? "" : "s"}. Those are the valence electrons.`,
    });
  }
  if (kind === 3) {
    return q({
      key: `cfg-short-${z}`,
      prompt: `Which is the noble-gas shorthand for ${lower(sym)}?`,
      ans: label(electronConfig(z, true), near.map((x) => electronConfig(x, true))),
      hint: "Start from the noble gas before the element in brackets, then add the electrons after it.",
      explain: `${nameOf(sym)}: ${electronConfig(z, true)}.`,
    });
  }
  const facts: [string, number, number[]][] = [
    ["How many electrons can an s sublevel hold?", 2, [1, 6, 8]],
    ["How many electrons can a p sublevel hold?", 6, [3, 8, 2]],
    ["How many electrons can a d sublevel hold?", 10, [5, 8, 14]],
    ["How many electrons can the 2nd shell hold (2s + 2p)?", 8, [2, 6, 18]],
    ["How many electrons can the 3rd shell hold (3s + 3p + 3d)?", 18, [8, 32, 10]],
    ["How many orbitals make up a p sublevel?", 3, [6, 1, 2]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, a, wrong] = facts[i];
  return q({
    key: `cfg-cap-${i}`,
    prompt,
    ans: choose(a, wrong),
    hint: "Each orbital holds 2 electrons. s has 1 orbital, p has 3, d has 5, f has 7.",
    explain: `The answer is ${a}. (Shell n holds 2n² electrons.)`,
  });
}

/** HS-PS1-1 — valence electrons from the table, Bohr and Lewis pictures. */
export function valence(): Question {
  const kind = rand(0, 3);
  const mains = ["Li", "Be", "B", "C", "N", "O", "F", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca"];
  if (kind === 0) {
    const sym = pick(mains);
    const z = zOf(sym);
    const v = valenceElectrons(sym)!;
    return q({
      key: `val-bohr-${sym}`,
      prompt: "How many valence electrons does this atom have?",
      visual: { kind: "chem-atom", protons: z, neutrons: MASS_NO[sym] - z, electrons: z, valence: true },
      needsVisual: true,
      ans: keypad(v),
      hint: "Valence electrons are the ones on the OUTERMOST shell only.",
      explain: `${nameOf(sym)}'s shells hold ${[2, 8, 8, 2].slice(0, element(sym)!.period).map((c, i, a) => (i === a.length - 1 ? v : c)).join(", ")}: ${v} on the outside.`,
    });
  }
  if (kind === 1) {
    const sym = pick([...mains, "Ga", "Ge", "As", "Se", "Br", "Rb", "Sr", "Sn", "I", "Ba"]);
    const v = valenceElectrons(sym)!;
    const g = element(sym)!.group!;
    return q({
      key: `val-group-${sym}`,
      prompt: `${nameOf(sym)} is in group ${g}. How many valence electrons does it have?`,
      ans: keypad(v),
      hint: "Groups 1–2: valence = group number. Groups 13–18: valence = group number − 10.",
      explain: `Group ${g} → ${v} valence electron${v === 1 ? "" : "s"}.`,
    });
  }
  if (kind === 2) {
    const sym = pick([...mains, "Br", "I", "Se", "As", "Ga", "Sr"]);
    const v = valenceElectrons(sym)!;
    return q({
      key: `val-table-${sym}`,
      prompt: "How many valence electrons does the element at the ? have?",
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 5], ask: [sym] },
      needsVisual: true,
      ans: keypad(v),
      hint: "Find its column. Main-group columns are 1, 2, then 13–18.",
      explain: `The ? is ${lower(sym)}, in group ${element(sym)!.group}: ${v} valence electron${v === 1 ? "" : "s"}.`,
    });
  }
  const sym = pick(["Li", "Be", "B", "C", "N", "O", "F", "Na", "Mg", "Al", "Si", "P", "S", "Cl"]);
  const v = valenceElectrons(sym)!;
  const z = zOf(sym);
  const other = ["Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"].filter((s) => valenceElectrons(s) !== v);
  const sameGroup = ["Li", "Be", "B", "C", "N", "O", "F", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Br"].filter((s) => valenceElectrons(s) === v && s !== sym);
  return q({
    key: `val-lewis-${sym}`,
    prompt: `This Lewis dot symbol has its letters hidden. It could be ${lower(sym)} or which other element?`,
    speech: "Count the dots. This Lewis symbol could belong to which other element?",
    visual: { kind: "chem-atom", protons: z, neutrons: MASS_NO[sym] - z, electrons: z, style: "lewis", hide: ["symbol"] },
    needsVisual: true,
    ans: label(nameOf(pick(sameGroup)), pickN(other, 3).map(nameOf)),
    hint: "Each dot is a valence electron. Elements in the same group have the same number of dots.",
    explain: `${v} dot${v === 1 ? "" : "s"} means ${v} valence electron${v === 1 ? "" : "s"}: group ${element(sym)!.group}, the same group as ${lower(sym)}.`,
  });
}

/** Isoelectronic families. */
const LIKE_HE: [string, number][] = [["Li", 1], ["Be", 2], ["H", -1]];
const LIKE_NE: [string, number][] = [["N", -3], ["O", -2], ["F", -1], ["Na", 1], ["Mg", 2], ["Al", 3]];
const LIKE_AR: [string, number][] = [["P", -3], ["S", -2], ["Cl", -1], ["K", 1], ["Ca", 2]];

/** HS-PS1-1 — ions get noble-gas electron arrangements. */
export function stableIons(): Question {
  const kind = rand(0, 3);
  const fam = pick([LIKE_NE, LIKE_AR, LIKE_NE, LIKE_AR]);
  const gas = fam === LIKE_NE ? "Ne" : "Ar";
  const [sym, c] = pick(fam);
  if (kind === 0) {
    return q({
      key: `stab-gas-${sym}`,
      prompt: `Which noble gas has the same electron arrangement as ${ion(sym, c)}?`,
      ans: label(nameOf(gas), ["Helium", "Neon", "Argon", "Krypton"].filter((g) => g !== nameOf(gas))),
      hint: `Count the electrons in ${ion(sym, c)}: ${zOf(sym)} protons, charge ${chargeWord(c)}.`,
      explain: `${ion(sym, c)} has ${zOf(sym) - c} electrons, like ${lower(gas)} (${zOf(gas)}).`,
    });
  }
  if (kind === 1) {
    const other = fam === LIKE_NE ? LIKE_AR : LIKE_NE;
    const right = pick(fam.filter(([s]) => s !== sym));
    const wrong = pickN(other, 3).map(([s, ch]) => ion(s, ch));
    return q({
      key: `stab-same-${sym}-${right[0]}`,
      prompt: `Which ion has the same number of electrons as ${ion(sym, c)}?`,
      ans: label(ion(right[0], right[1]), wrong),
      hint: "Electrons = atomic number − charge. Work it out for each.",
      explain: `${ion(sym, c)} and ${ion(right[0], right[1])} both have ${zOf(gas)} electrons, like ${lower(gas)}.`,
    });
  }
  if (kind === 2) {
    const z = zOf(sym);
    const e = z - c;
    const wrongs = [electronConfig(z), electronConfig(e + 1 <= 36 ? e + 1 : e - 1), electronConfig(e - 2)];
    return q({
      key: `stab-cfg-${sym}`,
      prompt: `Which is the electron configuration of ${ion(sym, c)}?`,
      ans: label(electronConfig(z, false, e), wrongs),
      hint: `First find how many electrons ${ion(sym, c)} has, then fill 1s, 2s, 2p, 3s, 3p…`,
      explain: `${ion(sym, c)} has ${e} electrons: ${electronConfig(z, false, e)}, the same as ${lower(gas)}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why does chlorine gain 1 electron instead of losing 7?", "Gaining 1 takes much less energy", ["Losing electrons is impossible", "It wants to be positive", "Chlorine has no outer electrons"]],
    ["Why are noble gases so unreactive?", "Their outer shells are already full", ["They have no electrons", "Their nuclei are very large", "They are all gases"]],
    ["Sodium loses 1 electron. Why not 2?", "The 2nd would come from a full inner shell", ["Sodium only has 1 electron", "It would become a noble gas", "Protons would leave too"]],
    ["What do Na⁺, Mg²⁺ and F⁻ all have in common?", "10 electrons, like neon", ["The same charge", "The same number of protons", "No electrons left"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `stab-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "A full outer shell (like a noble gas) is very stable. Atoms gain or lose the fewest electrons to get one.",
    explain: `${right}.`,
  });
}

/** HS-PS1-1 — Do it: sort ions by which noble gas they match. */
export function sortIons(): Question {
  const three = rand(0, 2) === 0;
  const fams = three ? [LIKE_HE, LIKE_NE, LIKE_AR] : [LIKE_NE, LIKE_AR];
  const items = fams.flatMap((f, bin) => pickN(f, three ? 2 : rand(2, 4)).map(([s, c]) => ({ label: ion(s, c), bin })));
  const bins = three ? ["Like He (2 e⁻)", "Like Ne (10 e⁻)", "Like Ar (18 e⁻)"] : ["Like Ne (10 e⁻)", "Like Ar (18 e⁻)"];
  const picked = shuffle(items);
  return q({
    key: `sortion-${picked.map((i) => i.label).sort().join(",")}`,
    prompt: "Sort the ions by the noble gas they match.",
    speech: "Count each ion's electrons, then sort it by the noble gas it matches.",
    ans: act({ kind: "sort", bins, items: picked }, picked.length),
    hint: "Electrons = atomic number − charge. Neon has 10, argon 18, helium 2.",
    explain: picked.map((i) => `${i.label}: ${bins[i.bin].match(/\d+/)![0]}`).join(", ") + ".",
  });
}

/* ===================================================== 2. The periodic table */

const MAIN5 = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "In", "Sn", "Sb", "Te", "I", "Xe"];

/** HS-PS1-1 — groups, periods and reading the table. */
export function groupsPeriods(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const sym = pick(MAIN5.filter((s) => s !== "H" && s !== "He"));
    const e = element(sym)!;
    const sameGroup = MAIN5.filter((s) => element(s)!.group === e.group && s !== sym);
    const samePeriod = MAIN5.filter((s) => element(s)!.period === e.period && s !== sym);
    return q({
      key: `gp-ask-${sym}`,
      prompt: "Which element is at the ?",
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 5], ask: [sym] },
      needsVisual: true,
      ans: label(e.name, [...pickN(sameGroup, 1), ...pickN(samePeriod, 2)].map(nameOf)),
      hint: "Count the row (period) from the top and the column (group) from the left.",
      explain: `Period ${e.period}, group ${e.group}: ${lower(sym)} (${sym}).`,
    });
  }
  if (kind === 1) {
    const sym = pick(MAIN5);
    const e = element(sym)!;
    const askPeriod = rand(0, 1) === 0;
    return q({
      key: `gp-num-${sym}-${askPeriod ? "p" : "g"}`,
      prompt: `${nameOf(sym)} is highlighted. Which ${askPeriod ? "period (row)" : "group (column, 1–18)"} is it in?`,
      visual: { kind: "chem-table", periods: [1, 5], highlight: [{ cells: [sym], colour: "sun" }] },
      needsVisual: true,
      ans: keypad(askPeriod ? e.period : e.group!),
      hint: askPeriod ? "Count rows from the top: H and He are period 1." : "Count columns from the left, all 18 of them (the middle block is groups 3–12).",
      explain: `${nameOf(sym)} is in period ${e.period}, group ${e.group}.`,
    });
  }
  if (kind === 2) {
    const g = pick([1, 2, 13, 14, 15, 16, 17, 18]);
    const p = rand(2, 5);
    const sym = MAIN5.find((s) => element(s)!.group === g && element(s)!.period === p)!;
    const wrong = MAIN5.filter((s) => (element(s)!.group === g) !== (element(s)!.period === p)).filter((s) => Math.abs(element(s)!.period - p) <= 1 && Math.abs((element(s)!.group ?? 0) - g) <= 2);
    return q({
      key: `gp-find-${g}-${p}`,
      prompt: `Which element is in period ${p}, group ${g}?`,
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 5] },
      ans: label(nameOf(sym), pickN(wrong, 3).map(nameOf)),
      hint: "Go down to the row, then across to the column. Groups 13–18 are the six columns on the right.",
      explain: `Period ${p}, group ${g} is ${lower(sym)} (${sym}).`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Elements in the same GROUP have the same number of…", "valence electrons", ["electron shells", "neutrons", "protons"]],
    ["Elements in the same PERIOD have the same number of…", "occupied electron shells", ["valence electrons", "neutrons", "protons"]],
    ["The modern periodic table is arranged in order of…", "atomic number", ["atomic mass", "date of discovery", "density"]],
    ["Why do elements in a group react in similar ways?", "Same number of outer electrons", ["Same atomic mass", "Same number of shells", "They were discovered together"]],
    ["Moving one step right along a period adds one…", "proton (and one electron)", ["neutron only", "electron shell", "whole group"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `gp-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Columns (groups) share outer electrons; rows (periods) share the number of shells.",
    explain: `${right[0].toUpperCase()}${right.slice(1)}.`,
  });
}

const FAMILIES: { name: string; group?: number; block?: "d"; members: string[]; clue: string }[] = [
  { name: "Alkali metals", group: 1, members: ["Li", "Na", "K", "Rb", "Cs"], clue: "Soft, shiny metals that react violently with water and form 1+ ions" },
  { name: "Alkaline earth metals", group: 2, members: ["Be", "Mg", "Ca", "Sr", "Ba"], clue: "Reactive metals that form 2+ ions, like calcium in bones" },
  { name: "Halogens", group: 17, members: ["F", "Cl", "Br", "I"], clue: "Very reactive nonmetals that form 1− ions and make salts" },
  { name: "Noble gases", group: 18, members: ["He", "Ne", "Ar", "Kr", "Xe"], clue: "Unreactive gases with full outer shells; used in signs and balloons" },
  { name: "Transition metals", block: "d", members: ["Fe", "Cu", "Zn", "Ni", "Cr", "Ag", "Au", "Ti"], clue: "Hard, dense metals that often form coloured compounds and several ions" },
];

/** HS-PS1-1 — families of elements. */
export function families(): Question {
  const kind = rand(0, 3);
  const fam = pick(FAMILIES);
  const others = FAMILIES.filter((f) => f !== fam).map((f) => f.name);
  if (kind === 0) {
    return q({
      key: `fam-hl-${fam.name}`,
      prompt: "What family of elements is highlighted?",
      visual: { kind: "chem-table", periods: [1, 6], highlight: [fam.block ? { block: "d", colour: "grape" } : { group: fam.group, colour: "grape" }] },
      needsVisual: true,
      ans: label(fam.name, others),
      hint: "Group 1 is the far-left column, groups 17 and 18 the far right, and the middle block is the transition metals.",
      explain: `${fam.name}${fam.group ? ` (group ${fam.group})` : " (the d-block)"}.`,
    });
  }
  if (kind === 1) {
    const sym = pick(fam.members);
    const wrong = shuffle(FAMILIES.filter((f) => f !== fam)).slice(0, 3).map((f) => nameOf(pick(f.members)));
    return q({
      key: `fam-member-${fam.name}-${sym}`,
      prompt: `Which element is one of the ${fam.name.toLowerCase()}?`,
      ans: label(nameOf(sym), wrong),
      hint: fam.group ? `${fam.name} are group ${fam.group}.` : "Transition metals sit in the middle block (groups 3–12).",
      explain: `${nameOf(sym)} is one of the ${fam.name.toLowerCase()}.`,
    });
  }
  if (kind === 2) {
    return q({
      key: `fam-clue-${fam.name}`,
      prompt: `Which family is this? "${fam.clue}."`,
      ans: label(fam.name, others),
      hint: "Think about where each family sits and how many outer electrons it has.",
      explain: `${fam.name}: ${fam.members.slice(0, 3).join(", ")}…`,
    });
  }
  const f2 = pick(FAMILIES.filter((f) => f.group));
  const [a, b] = pickN(f2.members, 2);
  const period = element(a)!.period;
  const wrongPairs = MAIN5.filter((s) => element(s)!.group !== f2.group && Math.abs(element(s)!.period - Math.min(period, 5)) <= 1).map((s) => `${a} and ${s}`);
  return q({
    key: `fam-similar-${a}-${b}`,
    prompt: "Which pair of elements will have the most similar chemical properties?",
    ans: label(`${a} and ${b}`, pickN(wrongPairs, 3)),
    hint: "Similar properties come from the same number of valence electrons: the same group.",
    explain: `${a} and ${b} are both ${f2.name.toLowerCase()} (group ${f2.group}).`,
  });
}

/** HS-PS1-1 — Do it: sort elements into metals, nonmetals and metalloids. */
export function sortMetals(): Question {
  const pool = [...MAIN5.filter((s) => s !== "H"), "Fe", "Cu", "Zn", "Ag", "Au", "Ti", "Pb", "Hg"];
  const bins = ["Metal", "Nonmetal", "Metalloid"];
  const binOf = (s: string) => bins.indexOf(metalClass(element(s)!)[0].toUpperCase() + metalClass(element(s)!).slice(1));
  const metals = pickN(pool.filter((s) => binOf(s) === 0), 3);
  const non = pickN(pool.filter((s) => binOf(s) === 1), 3);
  const loids = pickN(pool.filter((s) => binOf(s) === 2), rand(1, 2));
  const items = shuffle([...metals, ...non, ...loids]).map((s) => ({ label: `${s} (${nameOf(s)})`, bin: binOf(s) }));
  return q({
    key: `sortmet-${items.map((i) => i.label).sort().join(",")}`,
    prompt: "Sort the elements: metal, nonmetal or metalloid. The staircase line on the table helps.",
    speech: "Sort each element as a metal, a nonmetal or a metalloid.",
    visual: { kind: "chem-table", periods: [1, 6], staircase: true, colourBy: "metal" },
    ans: act({ kind: "sort", bins, items }, items.length),
    hint: "Metals are left of the staircase, nonmetals to the right. Metalloids (B, Si, Ge, As, Sb, Te) sit along it.",
    explain: items.map((i) => `${i.label.split(" ")[0]}: ${bins[i.bin].toLowerCase()}`).join(", ") + ".",
  });
}

/** HS-PS1-1 — why trends happen: shells and core charge. */
export function shielding(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const sym = pick(MAIN5);
    const p = element(sym)!.period;
    return q({
      key: `sh-shells-${sym}`,
      prompt: `How many occupied electron shells does ${lower(sym)} have?`,
      visual: { kind: "chem-element", element: sym },
      ans: keypad(p),
      hint: "The period (row) number tells you how many shells hold electrons.",
      explain: `${nameOf(sym)} is in period ${p}, so ${p} shell${p === 1 ? "" : "s"}.`,
    });
  }
  if (kind === 1) {
    const sym = pick(MAIN5.filter((s) => element(s)!.period <= 4 && element(s)!.group !== 18 && s !== "H"));
    const v = valenceElectrons(sym)!;
    const z = zOf(sym);
    return q({
      key: `sh-core-${sym}`,
      prompt: `Core charge = protons − inner (non-valence) electrons. What core charge do ${lower(sym)}'s valence electrons feel?`,
      ans: keypad(v, [z, z - v, 8 - v]),
      hint: `${nameOf(sym)} has ${z} protons and ${v} valence electrons, so ${z - v} inner electrons shield the nucleus.`,
      explain: `${z} − ${z - v} = +${v}. Core charge rises across a period, pulling electrons in tighter.`,
    });
  }
  if (kind === 2) {
    const p = rand(2, 4);
    const row = MAIN5.filter((s) => element(s)!.period === p && element(s)!.group !== 18);
    const [a, b] = pickN(row, 2).sort((x, y) => zOf(x) - zOf(y));
    return q({
      key: `sh-pull-${a}-${b}`,
      prompt: `${nameOf(a)} and ${lower(b)} are in the same period. Which pulls harder on its outer electrons?`,
      ans: labelInOrder([nameOf(a), nameOf(b), "Both the same"], nameOf(b)),
      hint: "Same number of shells; which has more protons (a bigger core charge)?",
      explain: `${nameOf(b)}: core charge +${valenceElectrons(b)} vs +${valenceElectrons(a)}, with the same number of shells.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Going DOWN a group, atoms get bigger. Why?", "Each period adds a new electron shell", ["The nucleus gets less charge", "Electrons get heavier", "Neutrons push electrons out"]],
    ["Going ACROSS a period, atoms get smaller. Why?", "More protons pull the same shells in tighter", ["Electrons are removed", "New shells are added", "Neutrons squeeze the atom"]],
    ["What do inner electrons do to the outer electrons?", "Shield them from the nucleus's pull", ["Attract them", "Push them into the nucleus", "Give them more charge"]],
    ["Why is potassium's outer electron easier to remove than sodium's?", "It is farther from the nucleus and more shielded", ["Potassium has fewer protons", "Potassium has no inner electrons", "Sodium's electron is heavier"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `sh-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Two ideas explain every trend: the number of shells (distance) and the core charge (pull).",
    explain: `${right}.`,
  });
}

/** Atomic radii (pm) for main-group elements, from a standard textbook table. */
const RADIUS: Record<string, number> = {
  Li: 152, Be: 112, B: 85, C: 77, N: 75, O: 73, F: 72,
  Na: 186, Mg: 160, Al: 143, Si: 118, P: 110, S: 103, Cl: 99,
  K: 227, Ca: 197, Ge: 122, As: 120, Se: 119, Br: 114,
  Rb: 248, Sr: 215, I: 133, Cs: 265, Ba: 222,
};
/** Groups where radius rises cleanly down the column. */
const RADIUS_GROUPS = [["Li", "Na", "K", "Rb", "Cs"], ["Be", "Mg", "Ca", "Sr", "Ba"], ["N", "P", "As"], ["O", "S", "Se"], ["F", "Cl", "Br", "I"]];
const RADIUS_PERIODS = [["Li", "Be", "B", "C", "N", "O", "F"], ["Na", "Mg", "Al", "Si", "P", "S", "Cl"], ["K", "Ca", "Ge", "As", "Se", "Br"]];

/** HS-PS1-1 — atomic radius trend. */
export function radius(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const line = pick([...RADIUS_GROUPS, ...RADIUS_PERIODS]);
    const [a, b] = pickN(line, 2);
    const big = RADIUS[a] > RADIUS[b] ? a : b;
    const down = RADIUS_GROUPS.includes(line);
    return q({
      key: `rad-cmp-${[a, b].sort().join("-")}`,
      prompt: `Which atom is larger: ${a} or ${b}?`,
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 6], highlight: [{ cells: [a, b], colour: "sun" }], trends: [{ dir: "left", label: "Radius increases" }, { dir: "down", label: "Radius increases" }] },
      ans: labelInOrder([a, b, "Same size"], big),
      hint: down ? "Same group: lower down means more shells, so a bigger atom." : "Same period: further right means more protons pulling the same shells in, so a smaller atom.",
      explain: `${big} (${RADIUS[big]} pm vs ${RADIUS[big === a ? b : a]} pm).`,
    });
  }
  if (kind === 1) {
    const [sym, c] = pick(IONS);
    const atomBig = c > 0;
    return q({
      key: `rad-ion-${sym}`,
      prompt: `Which is larger: a ${lower(sym)} atom (${sym}) or the ion ${ion(sym, c)}?`,
      ans: labelInOrder([sym, ion(sym, c), "Same size"], atomBig ? sym : ion(sym, c)),
      hint: atomBig ? "A positive ion has lost its outer shell (and the rest are pulled in)." : "A negative ion has extra electrons that repel and spread out, with the same nuclear pull.",
      explain: atomBig ? `${sym}: losing electrons empties the outer shell, so ${ion(sym, c)} is smaller.` : `${ion(sym, c)}: extra electrons repel each other and the cloud swells.`,
    });
  }
  const row = pick(RADIUS_PERIODS);
  const i = rand(1, row.length - 2);
  const target = row[i];
  const left = RADIUS[row[i - 1]];
  const right = RADIUS[row[i + 1]];
  const ans = RADIUS[target];
  return q({
    key: `rad-gap-${target}`,
    prompt: `Atomic radii in period ${element(target)!.period}, left to right. Which value fits the gap?`,
    visual: { kind: "table", header: row.slice(Math.max(0, i - 2), i + 3), rows: [row.slice(Math.max(0, i - 2), i + 3).map((s) => (s === target ? "?" : `${RADIUS[s]} pm`))] },
    needsVisual: true,
    ans: choose(ans, [left + rand(5, 25), right - rand(5, 20), Math.round((left + 400) / 2)], 1),
    unit: "pm",
    hint: "Radius shrinks steadily across a period, so the gap must lie between its neighbours.",
    explain: `${target} is ${ans} pm: smaller than ${row[i - 1]} (${left}) and bigger than ${row[i + 1]} (${right}).`,
  });
}

/** HS-PS1-1 — Do it: order atoms by size. */
export function orderRadius(): Question {
  const line = pick([...RADIUS_GROUPS.filter((g) => g.length >= 4), ...RADIUS_PERIODS, ...RADIUS_PERIODS]);
  const items = pickN(line, 4).sort((a, b) => RADIUS[a] - RADIUS[b]);
  const big = rand(0, 1) === 1;
  const list = big ? [...items].reverse() : items;
  return q({
    key: `ordrad-${list.join("-")}`,
    prompt: `Tap the atoms from ${big ? "largest to smallest" : "smallest to largest"}.`,
    visual: { kind: "chem-table", mainOnly: true, periods: [1, 6], highlight: [{ cells: items, colour: "teal" }] },
    ans: act({ kind: "order", items: list, direction: big ? "largest → smallest" : "smallest → largest" }, 4),
    hint: "Down a group: bigger (more shells). Across a period: smaller (more pull).",
    explain: `${list.map((s) => `${s} ${RADIUS[s]} pm`).join(", ")}.`,
  });
}

/** First ionization energies (kJ/mol). */
const IE1: Record<string, number> = {
  H: 1312, He: 2372, Li: 520, Be: 899, B: 801, C: 1086, N: 1402, O: 1314, F: 1681, Ne: 2081,
  Na: 496, Mg: 738, Al: 578, Si: 787, P: 1012, S: 1000, Cl: 1251, Ar: 1521,
  K: 419, Ca: 590, Ge: 762, As: 947, Br: 1140, Kr: 1351, Rb: 403, Sr: 550, I: 1008, Xe: 1170, Cs: 376, Ba: 503,
};
/** Rows and columns where IE changes steadily (skipping the group 13 and 16 dips). */
const IE_LINES = [
  ["Li", "Be", "C", "N", "F", "Ne"], ["Na", "Mg", "Si", "P", "Cl", "Ar"], ["K", "Ca", "Ge", "As", "Br", "Kr"],
  ["Li", "Na", "K", "Rb", "Cs"], ["Be", "Mg", "Ca", "Sr", "Ba"], ["F", "Cl", "Br", "I"], ["He", "Ne", "Ar", "Kr", "Xe"],
];
/** Successive ionization energies (kJ/mol) for the "big jump" question. */
const SUCCESSIVE: Record<string, number[]> = {
  Li: [520, 7298, 11815], Na: [496, 4562, 6910, 9543], K: [419, 3052, 4420, 5877],
  Be: [899, 1757, 14849], Mg: [738, 1451, 7733, 10543], Ca: [590, 1145, 4912, 6491],
  B: [801, 2427, 3660, 25026], Al: [578, 1817, 2745, 11577],
};

/** HS-PS1-1 — ionization energy. */
export function ionization(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [a, b] = pickN(pick(IE_LINES), 2);
    const hi = IE1[a] > IE1[b] ? a : b;
    return q({
      key: `ie-cmp-${[a, b].sort().join("-")}`,
      prompt: `Which needs more energy to remove one electron: ${a} or ${b}?`,
      ans: labelInOrder([a, b], hi),
      hint: "Ionization energy rises across a period (more pull) and falls down a group (outer electron farther away).",
      explain: `${hi}: ${IE1[hi]} kJ/mol vs ${IE1[hi === a ? b : a]} kJ/mol.`,
    });
  }
  if (kind === 1) {
    const sym = pick(Object.keys(SUCCESSIVE));
    const ies = SUCCESSIVE[sym];
    const v = valenceElectrons(sym)!;
    return q({
      key: `ie-jump-${sym}`,
      prompt: "These are an element's 1st, 2nd, 3rd… ionization energies (kJ/mol). How many valence electrons does it have?",
      visual: { kind: "table", header: ies.map((_, i) => ["1st", "2nd", "3rd", "4th"][i]), rows: [ies] },
      needsVisual: true,
      ans: choose(v, [v + 1, v - 1, ies.length].filter((x) => x > 0)),
      hint: "Look for the huge jump. Before it, electrons come from the outer shell; after it, from a full inner shell.",
      explain: `The big jump comes after electron ${v}, so it has ${v} valence electron${v === 1 ? "" : "s"} (it could be ${lower(sym)}).`,
    });
  }
  if (kind === 2) {
    const p = rand(2, 5);
    const row = MAIN5.filter((s) => element(s)!.period === p);
    const most = rand(0, 1) === 0;
    const ans = most ? row.find((s) => element(s)!.group === 18)! : row.find((s) => element(s)!.group === 1)!;
    return q({
      key: `ie-ext-${p}-${most ? "hi" : "lo"}`,
      prompt: `Which element in period ${p} has the ${most ? "highest" : "lowest"} first ionization energy?`,
      ans: label(nameOf(ans), pickN(row.filter((s) => s !== ans), 3).map(nameOf)),
      hint: most ? "Full outer shells are the hardest to break into." : "One lonely outer electron, far from a weakly-charged core, is easiest to remove.",
      explain: most ? `${nameOf(ans)}, the noble gas: a full shell held by the biggest core charge in the row.` : `${nameOf(ans)}, the alkali metal: its single outer electron is the easiest to remove.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Ionization energy is the energy needed to…", "remove an electron from an atom", ["add an electron to an atom", "split the nucleus", "break a bond"]],
    ["Why does ionization energy DROP down a group?", "The outer electron is farther away and more shielded", ["There are fewer protons", "Electrons are heavier lower down", "The atoms are smaller"]],
    ["Why is the 2nd ionization energy of sodium so much bigger than its 1st?", "The 2nd electron comes from a full inner shell", ["Sodium has only one electron", "The nucleus gains a proton", "Na⁺ is a noble gas atom"]],
    ["Low ionization energy usually means an element is…", "a reactive metal", ["a noble gas", "a reactive nonmetal", "radioactive"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `ie-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Think about distance from the nucleus and the pull of the core charge.",
    explain: `${right[0].toUpperCase()}${right.slice(1)}.`,
  });
}

/** HS-PS1-1 — electronegativity. */
export function electronegativity(): Question {
  const kind = rand(0, 3);
  const enPool = ["H", "Li", "Be", "B", "C", "N", "O", "F", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Br", "I", "Cs"];
  const en = (s: string) => element(s)!.en!;
  if (kind === 0) {
    let a = "", b = "";
    do [a, b] = pickN(enPool, 2);
    while (Math.abs(en(a) - en(b)) < 0.3);
    const hi = en(a) > en(b) ? a : b;
    return q({
      key: `en-cmp-${[a, b].sort().join("-")}`,
      prompt: `Which element pulls harder on shared electrons (is more electronegative): ${a} or ${b}?`,
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 6], highlight: [{ cells: [a, b], colour: "berry" }], trends: [{ dir: "right", label: "EN increases" }, { dir: "up", label: "EN increases" }] },
      ans: labelInOrder([a, b], hi),
      hint: "Electronegativity rises toward the top right (fluorine is the most). Noble gases are left out.",
      explain: `${hi}: ${en(hi).toFixed(2)} vs ${en(hi === a ? b : a).toFixed(2)}.`,
    });
  }
  if (kind === 1) {
    const sets = [["H", "Cl"], ["H", "Br"], ["H", "I"], ["H", "F"], ["C", "H"], ["N", "H"], ["O", "H"], ["C", "O"], ["C", "Cl"], ["Na", "Cl"], ["C", "C"], ["Cl", "Cl"], ["Si", "O"], ["Li", "F"], ["S", "O"], ["P", "Cl"]];
    const picked = pickN(sets, 4);
    const d = (p: string[]) => Math.abs(en(p[0]) - en(p[1]));
    const sorted = [...picked].sort((x, y) => d(y) - d(x));
    if (d(sorted[0]) - d(sorted[1]) < 0.15) return electronegativity();
    const txt = (p: string[]) => `${p[0]}–${p[1]}`;
    return q({
      key: `en-polar-${picked.map(txt).sort().join(",")}`,
      prompt: "Which bond is the most polar?",
      ans: label(txt(sorted[0]), sorted.slice(1).map(txt)),
      hint: "The bigger the electronegativity difference between the two atoms, the more polar the bond.",
      explain: `${txt(sorted[0])} has the biggest difference (${d(sorted[0]).toFixed(2)}).`,
    });
  }
  if (kind === 2) {
    const four = pickN(enPool, 4);
    const sorted = [...four].sort((x, y) => en(y) - en(x));
    if (en(sorted[0]) - en(sorted[1]) < 0.2) return electronegativity();
    return q({
      key: `en-most-${four.sort().join(",")}`,
      prompt: `Which is the most electronegative: ${four.join(", ")}?`,
      ans: label(sorted[0], sorted.slice(1)),
      hint: "Find the one closest to fluorine, at the top right of the table.",
      explain: `${sorted.map((s) => `${s} ${en(s).toFixed(2)}`).join(", ")}.`,
    });
  }
  const arrows = rand(0, 1) === 0;
  const right = arrows ? "Electronegativity" : pick(["Atomic radius", "Metallic reactivity"]);
  const wrong = arrows ? ["Atomic radius", "Metallic reactivity", "Number of shells"] : ["Electronegativity", "Ionization energy", "Nonmetal reactivity"];
  return q({
    key: `en-arrows-${arrows ? "ur" : "dl"}-${right}`,
    prompt: "Which property increases in the direction of BOTH arrows?",
    visual: {
      kind: "chem-table",
      mainOnly: true,
      periods: [1, 6],
      trends: arrows ? [{ dir: "right", label: "?" }, { dir: "up", label: "?" }] : [{ dir: "left", label: "?" }, { dir: "down", label: "?" }],
    },
    needsVisual: true,
    ans: label(right, wrong),
    hint: "Up and right: atoms are small with a strong pull. Down and left: atoms are big and lose electrons easily.",
    explain: arrows ? "Electronegativity (and ionization energy) rise toward the top right." : `${right} rises toward the bottom left: bigger atoms hold outer electrons loosely.`,
  });
}

/** HS-PS1-1 — Do it: order elements by electronegativity or ionization energy. */
export function orderTrend(): Question {
  const byEN = rand(0, 1) === 0;
  if (byEN) {
    const pool = ["Li", "Be", "B", "C", "N", "O", "F", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Br", "I", "Cs", "H"];
    const en = (s: string) => element(s)!.en!;
    let four: string[] = [];
    do four = pickN(pool, 4).sort((a, b) => en(a) - en(b));
    while (four.some((s, i) => i > 0 && en(s) - en(four[i - 1]) < 0.15));
    return q({
      key: `ordtr-en-${four.join("-")}`,
      prompt: "Tap the elements from LOWEST to HIGHEST electronegativity.",
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 6], highlight: [{ cells: four, colour: "berry" }] },
      ans: act({ kind: "order", items: four, direction: "lowest → highest electronegativity" }, 4),
      hint: "Electronegativity rises across a period and up a group. Fluorine is the highest of all.",
      explain: four.map((s) => `${s} ${en(s).toFixed(2)}`).join(" < ") + ".",
    });
  }
  const line = pick(IE_LINES);
  const four = pickN(line, 4).sort((a, b) => IE1[a] - IE1[b]);
  return q({
    key: `ordtr-ie-${four.join("-")}`,
    prompt: "Tap the elements from LOWEST to HIGHEST first ionization energy.",
    visual: { kind: "chem-table", mainOnly: true, periods: [1, 6], highlight: [{ cells: four, colour: "wave" }] },
    ans: act({ kind: "order", items: four, direction: "lowest → highest ionization energy" }, 4),
    hint: "Easier to remove = farther out and less pulled: down and to the left.",
    explain: four.map((s) => `${s} ${IE1[s]}`).join(" < ") + " kJ/mol.",
  });
}

/** HS-PS1-1, HS-PS1-2 — reactivity of metals and nonmetals. */
export function reactivity(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const three = pickN(["Li", "Na", "K", "Rb", "Cs"], 3).sort((a, b) => zOf(a) - zOf(b));
    return q({
      key: `react-alk-${three.join("")}`,
      prompt: `Which reacts most violently with water: ${three.map(nameOf).join(", ")}?`,
      ans: label(nameOf(three[2]), three.slice(0, 2).map(nameOf)),
      hint: "Alkali metals react by LOSING their outer electron. Which loses it most easily?",
      explain: `${nameOf(three[2])}: it's lowest in group 1, so its outer electron is farthest out and easiest to lose.`,
    });
  }
  if (kind === 1) {
    const three = pickN(["F", "Cl", "Br", "I"], 3).sort((a, b) => zOf(a) - zOf(b));
    return q({
      key: `react-hal-${three.join("")}`,
      prompt: `Which halogen is the most reactive: ${three.map(nameOf).join(", ")}?`,
      ans: label(nameOf(three[0]), three.slice(1).map(nameOf)),
      hint: "Halogens react by GAINING an electron. Which atom pulls an extra electron in most strongly?",
      explain: `${nameOf(three[0])}: the smallest halogen here, so the incoming electron is closest to the nucleus.`,
    });
  }
  if (kind === 2) {
    const [up, down] = pick([["K", "Rb"], ["Na", "K"], ["Ca", "Sr"], ["Mg", "Ca"], ["Cl", "Br"], ["Br", "I"], ["Rb", "Cs"], ["Sr", "Ba"]]);
    const metal = metalClass(element(up)!) === "metal";
    const right = metal ? `More violently than ${lower(up)}` : `Less vigorously than ${lower(up)}`;
    const wrong = metal ? [`Less vigorously than ${lower(up)}`, "Not at all", `Exactly like ${lower(up)}`] : [`More violently than ${lower(up)}`, "Not at all", `Exactly like ${lower(up)}`];
    return q({
      key: `react-pred-${up}-${down}`,
      prompt: `${nameOf(down)} is just below ${lower(up)} in the same group. How will it react (with water for metals, with metals for halogens)?`,
      ans: label(right, wrong),
      hint: metal ? "Metals: lower in the group loses electrons more easily." : "Nonmetals: lower in the group attracts electrons less strongly.",
      explain: `${right}. ${metal ? "Bigger atoms give up their outer electrons more easily." : "Bigger atoms attract an extra electron less strongly."}`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why does metal reactivity INCREASE down a group?", "Outer electrons are farther out and easier to lose", ["Atoms have fewer protons", "Atoms get smaller", "Electrons get closer to the nucleus"]],
    ["Why does halogen reactivity DECREASE down a group?", "Bigger atoms attract an extra electron less strongly", ["Halogens lose electrons more easily", "They have more valence electrons", "Their shells are already full"]],
    ["Why are alkali metals stored under oil?", "They react with air and water", ["They melt at room temperature", "They are radioactive", "Oil makes them shine"]],
    ["Which pair would react most violently?", "Cesium and fluorine", ["Lithium and iodine", "Neon and sodium", "Carbon and oxygen at room temperature"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `react-fact-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Metals react by losing electrons (easier when far out); nonmetals by gaining them (easier when the atom is small).",
    explain: `${right}.`,
  });
}

/** HS-PS1-1 — predict an element's properties from its position. */
export function predictProperties(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const sym = pick(["Li", "Na", "K", "Rb", "Cs", "Be", "Mg", "Ca", "Sr", "Ba", "Al", "Ga", "N", "P", "O", "S", "Se", "F", "Cl", "Br", "I"]);
    const c = element(sym)!.ions[0];
    const g = element(sym)!.group!;
    return q({
      key: `pred-ion-${sym}`,
      prompt: `An element sits in group ${g}, period ${element(sym)!.period}. What ion will it most likely form?`,
      ans: label(`${chargeWord(c)} ion`, ["1+", "2+", "3+", "3−", "2−", "1−"].filter((w) => w !== chargeWord(c)).slice(0, 5).map((w) => `${w} ion`).filter((_, i, a) => i < a.length)),
      hint: "Groups 1, 2, 13: lose 1, 2, 3 electrons. Groups 15, 16, 17: gain 3, 2, 1.",
      explain: `Group ${g} → ${chargeWord(c)} (it's ${lower(sym)}, which forms ${ion(sym, c)}).`,
    });
  }
  if (kind === 1) {
    const sym = pick(["Li", "Na", "K", "Rb", "Cs", "Be", "Mg", "Ca", "Sr", "Ba", "Al", "Ga"]);
    const c = element(sym)!.ions[0];
    const f = (n: number) => `${sym}Cl${n === 1 ? "" : sub(String(n))}`;
    return q({
      key: `pred-cl-${sym}`,
      prompt: `${nameOf(sym)} is in group ${element(sym)!.group}. What is the formula of its chloride?`,
      ans: label(f(c), [1, 2, 3].filter((n) => n !== c).map(f).concat([`${sym}${sub(String(c))}Cl`])),
      hint: `Group ${element(sym)!.group} metals form ${chargeWord(c)} ions; chloride is Cl⁻. How many Cl⁻ cancel the charge?`,
      explain: `${ion(sym, c)} needs ${c} Cl⁻: ${f(c)}.`,
    });
  }
  if (kind === 2) {
    const sym = pick(["Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Ga", "Ge", "As", "Se", "Br", "Rb", "Sr", "In", "Sn", "Sb", "Te", "I", "B", "C", "N", "O", "F", "Li", "Be"]);
    const cls = metalClass(element(sym)!);
    const cap = cls[0].toUpperCase() + cls.slice(1);
    return q({
      key: `pred-class-${sym}`,
      prompt: "Is the element at the ? a metal, a nonmetal or a metalloid?",
      visual: { kind: "chem-table", periods: [1, 5], ask: [sym], staircase: true },
      needsVisual: true,
      ans: labelInOrder(["Metal", "Nonmetal", "Metalloid"], cap),
      hint: "Left of the staircase: metals. Right: nonmetals. Touching it: metalloids (B, Si, Ge, As, Sb, Te). Aluminum counts as a metal.",
      explain: `It's ${lower(sym)}: a ${cls}.`,
    });
  }
  const cases: [string, string, string[]][] = [
    ["Mendeleev left a gap below silicon and predicted 'eka-silicon' (germanium). Its properties should be most like…", "Silicon", ["Gallium", "Arsenic", "Aluminum"]],
    ["Francium is at the bottom of group 1. Predict its properties.", "A very soft, extremely reactive metal", ["An unreactive gas", "A hard, unreactive metal", "A reactive nonmetal"]],
    ["Astatine is below iodine. Predict its state and color.", "A dark solid", ["A pale yellow gas", "A colorless liquid", "A shiny metal"]],
    ["Radon is in group 18. How reactive is it?", "Almost unreactive (full outer shell)", ["As reactive as sodium", "As reactive as fluorine", "It forms 2+ ions"]],
    ["Strontium is below calcium. Which compound formula is it most likely to form with oxygen?", "SrO", ["Sr₂O", "SrO₂", "Sr₂O₃"]],
  ];
  const i = rand(0, cases.length - 1);
  const [prompt, right, wrong] = cases[i];
  return q({
    key: `pred-case-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Elements in the same group act alike, and trends continue smoothly down the group.",
    explain: `${right}.`,
  });
}

/* ===================================================== 3. Predicting reactions */

interface IonInfo { f: string; q: number; name: string; poly?: boolean }
const CATIONS: IonInfo[] = [
  { f: "Li", q: 1, name: "lithium" }, { f: "Na", q: 1, name: "sodium" }, { f: "K", q: 1, name: "potassium" },
  { f: "Mg", q: 2, name: "magnesium" }, { f: "Ca", q: 2, name: "calcium" }, { f: "Ba", q: 2, name: "barium" },
  { f: "Al", q: 3, name: "aluminum" }, { f: "Zn", q: 2, name: "zinc" },
];
const ANIONS: IonInfo[] = [
  { f: "F", q: -1, name: "fluoride" }, { f: "Cl", q: -1, name: "chloride" }, { f: "Br", q: -1, name: "bromide" }, { f: "I", q: -1, name: "iodide" },
  { f: "O", q: -2, name: "oxide" }, { f: "S", q: -2, name: "sulfide" }, { f: "N", q: -3, name: "nitride" },
];
const POLY_ANIONS: IonInfo[] = [
  { f: "OH", q: -1, name: "hydroxide", poly: true }, { f: "NO₃", q: -1, name: "nitrate", poly: true }, { f: "SO₄", q: -2, name: "sulfate", poly: true },
  { f: "CO₃", q: -2, name: "carbonate", poly: true }, { f: "PO₄", q: -3, name: "phosphate", poly: true }, { f: "HCO₃", q: -1, name: "hydrogen carbonate", poly: true },
];
const AMMONIUM: IonInfo = { f: "NH₄", q: 1, name: "ammonium", poly: true };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const ionText = (i: IonInfo) => `${i.f}${chargeText(i.q)}`;
const part = (i: IonInfo, n: number) => (n === 1 ? i.f : i.poly ? `(${i.f})${sub(String(n))}` : `${i.f}${sub(String(n))}`);
/** Formula of the neutral compound of a cation and an anion, and how many of each. */
function ionic(c: IonInfo, a: IonInfo): { formula: string; nc: number; na: number } {
  const l = (c.q * -a.q) / gcd(c.q, -a.q);
  const nc = l / c.q;
  const na = l / -a.q;
  return { formula: part(c, nc) + part(a, na), nc, na };
}
const compoundName = (c: IonInfo, a: IonInfo) => `${c.name} ${a.name}`;

/** HS-PS1-2 — ion charges from the periodic table. */
export function ionCharges(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const g = pick([1, 2, 13, 15, 16, 17, 18]);
    const right = { 1: "1+", 2: "2+", 13: "3+", 15: "3−", 16: "2−", 17: "1−", 18: "No ions (full shell)" }[g]!;
    return q({
      key: `ch-group-${g}`,
      prompt: "Elements in the highlighted group usually form ions with what charge?",
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 5], highlight: [{ group: g, colour: "tangerine" }] },
      needsVisual: true,
      ans: label(right, ["1+", "2+", "3+", "3−", "2−", "1−", "No ions (full shell)"].filter((w) => w !== right)),
      hint: "Count valence electrons from the group, then lose or gain the fewest to reach 8.",
      explain: g === 18 ? "Group 18 already has a full shell, so it doesn't form ions." : `Group ${g}: ${valenceElectrons(MAIN5.find((s) => element(s)!.group === g && element(s)!.period === 3)!)} valence electron${g === 1 ? "" : "s"} → ${right} ions.`,
    });
  }
  if (kind === 1) {
    const [sym, c] = pick(IONS);
    return q({
      key: `ch-ion-${sym}`,
      prompt: `What ion does ${lower(sym)} form?`,
      visual: { kind: "chem-table", mainOnly: true, periods: [1, 4], ask: [] , highlight: [{ cells: [sym], colour: "sun" }] },
      ans: label(ion(sym, c), [ion(sym, -c), ion(sym, c > 0 ? c + 1 : c - 1), ion(sym, c > 0 ? -(8 - c) : 8 + c)]),
      hint: "Metals lose electrons (positive ions); nonmetals gain them (negative ions).",
      explain: `${nameOf(sym)} has ${valenceElectrons(sym)} valence electron${valenceElectrons(sym) === 1 ? "" : "s"}, so it forms ${ion(sym, c)}.`,
    });
  }
  if (kind === 2) {
    const cases: [string, string, string][] = [
      ["FeCl₃", "Fe", "Fe³⁺"], ["FeCl₂", "Fe", "Fe²⁺"], ["FeO", "Fe", "Fe²⁺"], ["Fe₂O₃", "Fe", "Fe³⁺"], ["CuO", "Cu", "Cu²⁺"],
      ["Cu₂O", "Cu", "Cu⁺"], ["CuCl₂", "Cu", "Cu²⁺"], ["PbO₂", "Pb", "Pb⁴⁺"], ["SnCl₄", "Sn", "Sn⁴⁺"], ["MnO₂", "Mn", "Mn⁴⁺"],
    ];
    const [f, m, right] = pick(cases);
    const opts = [`${m}⁺`, `${m}²⁺`, `${m}³⁺`, `${m}⁴⁺`];
    return q({
      key: `ch-tm-${f}`,
      prompt: `Transition metals can form more than one ion. Which ${element(m)!.name.toLowerCase()} ion is in ${f}?`,
      ans: labelInOrder(opts, right),
      hint: "Oxide is O²⁻ and chloride is Cl⁻. The metal's charge must cancel the total negative charge.",
      explain: `In ${f}, the negative charge is cancelled by ${right}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why does aluminum form Al³⁺?", "It loses its 3 valence electrons", ["It gains 3 electrons", "It has 3 neutrons extra", "It loses 3 protons"]],
    ["Why do metals form POSITIVE ions?", "They lose their few valence electrons", ["They gain protons", "They gain electrons", "They lose neutrons"]],
    ["Why does oxygen form O²⁻?", "It gains 2 electrons to fill its outer shell", ["It loses 2 electrons", "It loses 6 electrons", "It gains 2 protons"]],
    ["In an ionic compound, the total charge is…", "zero", ["always positive", "always negative", "equal to the number of ions"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `ch-fact-${i}`, prompt, ans: label(right, wrong), hint: "Ions form so that outer shells end up full (8 electrons).", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-2 — formulas of ionic compounds from charges. */
export function ionicFormulas(): Question {
  const kind = rand(0, 3);
  const c = pick(CATIONS);
  const a = pick(ANIONS);
  const { formula, nc, na } = ionic(c, a);
  const wrongs = [part(c, na) + part(a, nc), c.f + a.f, part(c, -a.q) + part(a, -a.q === c.q ? 2 : c.q), part(c, nc + 1) + part(a, na)].filter((w) => w !== formula);
  if (kind === 0) {
    return q({
      key: `if-form-${c.f}${a.f}`,
      prompt: `What is the formula of ${compoundName(c, a)} (${ionText(c)} and ${ionText(a)})?`,
      ans: label(formula, wrongs),
      hint: "Find the smallest total charge both can reach (the LCM), then count the ions needed.",
      explain: `${nc} × (${sgn(c.q)}) + ${na} × (${ns(a.q)}) = 0, so ${formula}.`,
    });
  }
  if (kind === 1) {
    const big = c.q >= -a.q;
    return q({
      key: `if-count-${c.f}${a.f}`,
      prompt: `How many ${big ? ionText(a) : ionText(c)} ions are needed for every ${big ? nc : na} ${big ? ionText(c) : ionText(a)} ion${(big ? nc : na) === 1 ? "" : "s"} in ${compoundName(c, a)}?`,
      ans: keypad(big ? na : nc),
      hint: "Positive and negative charges must cancel exactly.",
      explain: `${formula}: ${nc} ${ionText(c)} (${sgn(c.q * nc)}) and ${na} ${ionText(a)} (${ns(a.q * na)}).`,
    });
  }
  if (kind === 2) {
    const name = compoundName(c, a);
    const otherAn = pickN(ANIONS.filter((x) => x !== a), 2).map((x) => compoundName(c, x));
    return q({
      key: `if-name-${c.f}${a.f}`,
      prompt: `What is the name of ${formula}?`,
      ans: label(name, [...otherAn, `${c.name} ${lower(a.f)}`]),
      hint: "Name the metal first, then the nonmetal with its ending changed to -ide.",
      explain: `${formula} is ${name}.`,
    });
  }
  const bad = c.f + a.f;
  if (bad === formula) return ionicFormulas();
  return q({
    key: `if-spot-${c.f}${a.f}`,
    prompt: `Sam wrote "${bad}" for ${compoundName(c, a)}. What's wrong?`,
    ans: label(`The charges don't cancel; it should be ${formula}`, [`Nothing, ${bad} is right`, `The metal should be written second`, `It should be ${part(c, na) + part(a, nc)}`]),
    hint: `${ionText(c)} and ${ionText(a)}: add up the charges in ${bad}.`,
    explain: `${bad} has charge ${sgn(c.q + a.q)}. ${formula} is neutral.`,
  });
}

/** HS-PS1-2 — polyatomic ions. */
export function polyatomic(): Question {
  const kind = rand(0, 3);
  const c = pick([...CATIONS.filter((x) => x.f !== "Zn"), AMMONIUM]);
  const a = pick(POLY_ANIONS.filter((x) => !(c === AMMONIUM && x.f === "OH")));
  const { formula, nc, na } = ionic(c, a);
  if (kind === 0) {
    const noBrackets = `${c.poly && nc > 1 ? `${c.f}${sub(String(nc))}` : part(c, nc)}${na > 1 ? `${a.f}${sub(String(na))}` : a.f}`;
    const wrong = [noBrackets, part(c, na) + part(a, nc), c.f + a.f, part(c, nc) + part(a, na + 1), part(c, nc + 1) + part(a, na)].filter((w) => w !== formula);
    return q({
      key: `poly-form-${c.f}${a.f}`,
      prompt: `What is the formula of ${compoundName(c, a)}? (${ionText(c)}, ${ionText(a)})`,
      ans: label(formula, wrong),
      hint: "Treat the polyatomic ion as one unit. If you need more than one, put it in brackets.",
      explain: `${nc} ${ionText(c)} and ${na} ${ionText(a)} cancel: ${formula}.`,
    });
  }
  if (kind === 1) {
    const el = pick(["O", "H", "N"].filter((e) => countAtoms(formula, e) > 0));
    const n = countAtoms(formula, el);
    return q({
      key: `poly-count-${formula}-${el}`,
      prompt: `How many ${lower(el)} atoms are in one formula unit of ${formula}?`,
      ans: keypad(n, [n + 1, n - 1, countAtoms(a.f, el)]),
      hint: "A subscript after a bracket multiplies everything inside the bracket.",
      explain: `${formula} contains ${n} ${el} atom${n === 1 ? "" : "s"}.`,
    });
  }
  if (kind === 2) {
    const p = pick([...POLY_ANIONS, AMMONIUM]);
    const right = ionText(p);
    return q({
      key: `poly-charge-${p.f}`,
      prompt: `What is the formula of the ${p.name} ion?`,
      ans: label(right, [`${p.f}${chargeText(-p.q)}`, `${p.f}${chargeText(p.q > 0 ? p.q + 1 : p.q - 1)}`, `${p.f}${chargeText(p.q > 0 ? 2 : p.q === -1 ? -2 : -1)}`]),
      hint: "Common ones: nitrate NO₃⁻, sulfate SO₄²⁻, carbonate CO₃²⁻, phosphate PO₄³⁻, hydroxide OH⁻, ammonium NH₄⁺.",
      explain: `The ${p.name} ion is ${right}.`,
    });
  }
  const name = compoundName(c, a);
  const others = pickN(POLY_ANIONS.filter((x) => x !== a), 3).map((x) => compoundName(c, x));
  return q({
    key: `poly-name-${formula}`,
    prompt: `What is the name of ${formula}?`,
    ans: label(name, others),
    hint: "Name the cation, then the polyatomic ion's own name (sulfate, nitrate…).",
    explain: `${formula} is ${name}.`,
  });
}

/** HS-PS1-2 — Do it: mix ions in the ratio that makes a neutral compound. */
export function makeNeutral(): Question {
  const c = pick(CATIONS);
  const a = pick([...ANIONS, ...POLY_ANIONS.filter((x) => x.f !== "HCO₃")]);
  const { formula, nc, na } = ionic(c, a);
  return q({
    key: `neutral-${c.f}-${a.f}`,
    prompt: `Add ions to the beaker to make neutral ${compoundName(c, a)}. Any amounts in the right ratio work.`,
    ans: act({ kind: "chem-mix", mode: "mixture", species: [{ name: c.name, formula: ionText(c) }, { name: a.name, formula: ionText(a) }], target: { ratio: [nc, na] }, max: 12 }, nc + na),
    hint: `Each ${ionText(c)} is ${sgn(c.q)}, each ${ionText(a)} is ${ns(a.q)}. Add until the total charge is 0.`,
    explain: `${nc} ${ionText(c)} : ${na} ${ionText(a)} (${formula}).`,
  });
}

/** Equations used for balancing practice (balanced by `balance`). */
const SYNTH_DECOMP: [string[], string[]][] = [
  [["H₂", "O₂"], ["H₂O"]], [["Na", "Cl₂"], ["NaCl"]], [["Mg", "O₂"], ["MgO"]], [["Al", "O₂"], ["Al₂O₃"]], [["Fe", "Cl₂"], ["FeCl₃"]],
  [["N₂", "H₂"], ["NH₃"]], [["Al", "Cl₂"], ["AlCl₃"]], [["Li", "N₂"], ["Li₃N"]], [["K", "O₂"], ["K₂O"]], [["Ca", "O₂"], ["CaO"]],
  [["P₄", "O₂"], ["P₄O₁₀"]], [["Fe", "O₂"], ["Fe₂O₃"]], [["H₂O₂"], ["H₂O", "O₂"]], [["KClO₃"], ["KCl", "O₂"]], [["NaN₃"], ["Na", "N₂"]],
  [["HgO"], ["Hg", "O₂"]], [["H₂O"], ["H₂", "O₂"]], [["Ag₂O"], ["Ag", "O₂"]],
];
const REPLACE_COMBUST: [string[], string[]][] = [
  [["Zn", "HCl"], ["ZnCl₂", "H₂"]], [["Al", "HCl"], ["AlCl₃", "H₂"]], [["Na", "H₂O"], ["NaOH", "H₂"]], [["Cu", "AgNO₃"], ["Cu(NO₃)₂", "Ag"]],
  [["Cl₂", "NaBr"], ["NaCl", "Br₂"]], [["Pb(NO₃)₂", "KI"], ["PbI₂", "KNO₃"]], [["BaCl₂", "Na₂SO₄"], ["BaSO₄", "NaCl"]], [["FeCl₃", "NaOH"], ["Fe(OH)₃", "NaCl"]],
  [["Al", "CuSO₄"], ["Al₂(SO₄)₃", "Cu"]], [["H₂SO₄", "NaOH"], ["Na₂SO₄", "H₂O"]], [["CH₄", "O₂"], ["CO₂", "H₂O"]], [["C₃H₈", "O₂"], ["CO₂", "H₂O"]],
  [["C₂H₆", "O₂"], ["CO₂", "H₂O"]], [["C₂H₅OH", "O₂"], ["CO₂", "H₂O"]], [["C₄H₁₀", "O₂"], ["CO₂", "H₂O"]], [["C₂H₂", "O₂"], ["CO₂", "H₂O"]],
  [["CH₃OH", "O₂"], ["CO₂", "H₂O"]], [["K", "H₂O"], ["KOH", "H₂"]],
];

/** HS-PS1-7, HS-PS1-2 — what balancing means. */
export function balancingBasics(): Question {
  const kind = rand(0, 3);
  const [r, p] = pick([...SYNTH_DECOMP, ...REPLACE_COMBUST.slice(0, 12)]);
  const c = coefs(r, p);
  const eq = balancedText(r, p);
  const all = [...r, ...p];
  if (kind === 0) {
    const idx = c.map((v, i) => (v > 1 ? i : -1)).filter((i) => i >= 0);
    const at = pick(idx.length ? idx : [0]);
    return q({
      key: `bal-blank-${all.join("")}-${at}`,
      prompt: "What number balances the equation in the blank?",
      speech: "What coefficient goes in the blank to balance the equation?",
      visual: rxn(eq, { askCoef: at }),
      needsVisual: true,
      ans: keypad(c[at]),
      hint: "Count each kind of atom on both sides. The blank must make them equal.",
      explain: `${eq}: every atom is counted the same on both sides.`,
    });
  }
  if (kind === 1) {
    const ok = rand(0, 1) === 0;
    const skeleton = `${r.join(" + ")} → ${p.join(" + ")}`;
    const shown = ok ? eq : skeleton;
    return q({
      key: `bal-isit-${all.join("")}-${ok ? 1 : 0}`,
      prompt: "Is this equation balanced?",
      visual: ok ? rxn(eq) : { kind: "chem-reaction", reactants: r.map((f) => ({ formula: f })), products: p.map((f) => ({ formula: f })), unbalanced: true },
      needsVisual: true,
      ans: labelInOrder(["Yes, it's balanced", "No, it isn't"], ok ? "Yes, it's balanced" : "No, it isn't"),
      hint: "Count every element on the left and on the right. All must match.",
      explain: ok ? `Yes: ${shown} has the same atoms on both sides.` : `No. Balanced, it is ${eq}.`,
    });
  }
  if (kind === 2) {
    const terms = [...r.map((f, i) => [c[i], f] as [number, string]), ...p.map((f, i) => [c[i + r.length], f] as [number, string])];
    const els = [...new Set(all.flatMap((f) => ["H", "O", "N", "Cl", "C", "Na", "Al", "Fe", "K", "Mg"].filter((e) => countAtoms(f, e) > 0)))];
    const el = pick(els);
    const right = rand(0, 1) === 0;
    const side = right ? terms.slice(r.length) : terms.slice(0, r.length);
    const n = side.reduce((t, [k, f]) => t + k * countAtoms(f, el), 0);
    return q({
      key: `bal-count-${all.join("")}-${el}-${right ? "R" : "L"}`,
      prompt: `How many ${lower(el)} atoms are on the ${right ? "right (products)" : "left (reactants)"} side?`,
      visual: rxn(eq),
      needsVisual: true,
      ans: keypad(n),
      hint: "Coefficient × subscript for each formula, then add them up.",
      explain: `${side.filter(([, f]) => countAtoms(f, el) > 0).map(([k, f]) => `${k} × ${countAtoms(f, el)} (${f})`).join(" + ")} = ${n}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["To balance H₂ + O₂ → H₂O, why can't you change H₂O to H₂O₂?", "That makes a different substance", ["Subscripts can only go up to 1", "It would add too much mass", "You can, it's just slower"]],
    ["Why must chemical equations be balanced?", "Atoms are not created or destroyed", ["Reactions need equal molecules", "Products must weigh more", "Each side needs the same number of compounds"]],
    ["What does the 2 in 2H₂O mean?", "Two water molecules", ["Two hydrogen atoms", "Two oxygen atoms", "Water twice as heavy"]],
    ["What does the subscript 2 in H₂O mean?", "Two hydrogen atoms in each molecule", ["Two water molecules", "Two oxygen atoms", "Two bonds in total"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `bal-fact-${i}`, prompt, ans: label(right, wrong), hint: "Coefficients count molecules; subscripts are part of the formula itself.", explain: `${right}.` });
}

/** HS-PS1-7 — Do it: balance synthesis and decomposition equations. */
export function balanceSynth(): Question {
  const [r, p] = pick(SYNTH_DECOMP);
  return q({
    key: `balsyn-${r.join("+")}=${p.join("+")}`,
    prompt: "Balance the equation.",
    speech: "Balance the equation. Tap plus and minus on each coefficient until the atoms match.",
    ans: act({ kind: "chem-balance", reactants: r, products: p }, coefs(r, p)[0]),
    hint: "Start with the element in the fewest formulas. Leave single elements (like O₂) until last.",
    explain: `${balancedText(r, p)}.`,
  });
}

type RType = "Synthesis" | "Decomposition" | "Single replacement" | "Double replacement" | "Combustion";
const TYPED: [string, RType][] = [
  ["2Na + Cl₂ → 2NaCl", "Synthesis"], ["2Mg + O₂ → 2MgO", "Synthesis"], ["N₂ + 3H₂ → 2NH₃", "Synthesis"], ["CaO + H₂O → Ca(OH)₂", "Synthesis"], ["2Fe + 3Cl₂ → 2FeCl₃", "Synthesis"],
  ["2H₂O → 2H₂ + O₂", "Decomposition"], ["CaCO₃ → CaO + CO₂", "Decomposition"], ["2KClO₃ → 2KCl + 3O₂", "Decomposition"], ["2H₂O₂ → 2H₂O + O₂", "Decomposition"], ["2HgO → 2Hg + O₂", "Decomposition"],
  ["Zn + 2HCl → ZnCl₂ + H₂", "Single replacement"], ["Fe + CuSO₄ → FeSO₄ + Cu", "Single replacement"], ["Cl₂ + 2NaBr → 2NaCl + Br₂", "Single replacement"], ["Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag", "Single replacement"], ["2Na + 2H₂O → 2NaOH + H₂", "Single replacement"],
  ["AgNO₃ + NaCl → AgCl + NaNO₃", "Double replacement"], ["BaCl₂ + Na₂SO₄ → BaSO₄ + 2NaCl", "Double replacement"], ["HCl + NaOH → NaCl + H₂O", "Double replacement"], ["Pb(NO₃)₂ + 2KI → PbI₂ + 2KNO₃", "Double replacement"], ["CaCl₂ + Na₂CO₃ → CaCO₃ + 2NaCl", "Double replacement"],
  ["CH₄ + 2O₂ → CO₂ + 2H₂O", "Combustion"], ["C₃H₈ + 5O₂ → 3CO₂ + 4H₂O", "Combustion"], ["2C₂H₆ + 7O₂ → 4CO₂ + 6H₂O", "Combustion"], ["C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O", "Combustion"], ["C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O", "Combustion"],
];
const TYPE_PATTERN: Record<RType, string> = {
  Synthesis: "A + B → AB",
  Decomposition: "AB → A + B",
  "Single replacement": "A + BC → AC + B",
  "Double replacement": "AB + CD → AD + CB",
  Combustion: "fuel + O₂ → CO₂ + H₂O",
};
const RTYPES = Object.keys(TYPE_PATTERN) as RType[];

/** HS-PS1-2 — classify reactions. */
export function reactionTypes(): Question {
  const kind = rand(0, 2);
  if (kind < 2) {
    const [eq, t] = pick(TYPED);
    return q({
      key: `rtype-${eq}`,
      prompt: "What type of reaction is this?",
      visual: rxn(eq),
      needsVisual: true,
      ans: label(t, RTYPES.filter((x) => x !== t)),
      hint: "Count the reactants and products, and look for O₂ with a fuel, a lone element swapping in, or two compounds swapping partners.",
      explain: `${t}: it fits the pattern ${TYPE_PATTERN[t]}.`,
    });
  }
  const t = pick(RTYPES);
  return q({
    key: `rtype-pattern-${t}`,
    prompt: `Which type of reaction follows the pattern ${TYPE_PATTERN[t]}?`,
    ans: label(t, RTYPES.filter((x) => x !== t)),
    hint: "Synthesis builds up, decomposition breaks down, replacements swap partners, combustion burns a fuel in oxygen.",
    explain: `${TYPE_PATTERN[t]} is ${t.toLowerCase()}.`,
  });
}

/** HS-PS1-2 — Do it: sort reactions by type. */
export function sortReactionTypes(): Question {
  const types = pickN(RTYPES, rand(3, 4));
  const items = types.flatMap((t, bin) => pickN(TYPED.filter(([, x]) => x === t), types.length === 3 ? 2 : rand(1, 2)).map(([eq]) => ({ label: eq, bin })));
  const shuffled = shuffle(items);
  return q({
    key: `sortrt-${shuffled.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort the reactions by type.",
    speech: "Sort each reaction by its type.",
    ans: act({ kind: "sort", bins: types, items: shuffled }, shuffled.length),
    hint: types.map((t) => `${t}: ${TYPE_PATTERN[t]}`).join(". ") + ".",
    explain: shuffled.map((i) => `${i.label}: ${types[i.bin].toLowerCase()}`).join("; ") + ".",
  });
}

/** Activity series of metals (most reactive first) and of halogens. */
const SERIES = ["K", "Na", "Ca", "Mg", "Al", "Zn", "Fe", "Ni", "Sn", "Pb", "H", "Cu", "Ag", "Au"];
const SALT: Record<string, { f: string; q: number; anion: IonInfo }> = {
  Mg: { f: "MgSO₄", q: 2, anion: POLY_ANIONS[2] }, Zn: { f: "ZnSO₄", q: 2, anion: POLY_ANIONS[2] }, Fe: { f: "FeSO₄", q: 2, anion: POLY_ANIONS[2] },
  Ni: { f: "NiSO₄", q: 2, anion: POLY_ANIONS[2] }, Cu: { f: "CuSO₄", q: 2, anion: POLY_ANIONS[2] }, Pb: { f: "Pb(NO₃)₂", q: 2, anion: POLY_ANIONS[1] },
  Ag: { f: "AgNO₃", q: 1, anion: POLY_ANIONS[1] }, Sn: { f: "SnSO₄", q: 2, anion: POLY_ANIONS[2] },
};

/** HS-PS1-2 — single replacement and the activity series. */
export function singleReplacement(): Question {
  const kind = rand(0, 3);
  const metals = ["Mg", "Zn", "Fe", "Ni", "Sn", "Pb", "Cu", "Ag"];
  if (kind === 0 || kind === 1) {
    const [a, b] = pickN(metals, 2);
    const yes = SERIES.indexOf(a) < SERIES.indexOf(b);
    if (kind === 0) {
      return q({
        key: `sr-will-${a}-${b}`,
        prompt: `A strip of ${lower(a)} is dipped into ${SALT[b].f} solution. Will a reaction happen?`,
        visual: { kind: "table", header: ["Activity series (most reactive first)"], rows: [[SERIES.filter((s) => metals.includes(s) || s === "H").join(" > ")]] },
        ans: labelInOrder([`Yes: ${a} is more reactive than ${b}`, `No: ${a} is less reactive than ${b}`], yes ? `Yes: ${a} is more reactive than ${b}` : `No: ${a} is less reactive than ${b}`),
        hint: "A metal can only push out a metal BELOW it in the activity series.",
        explain: yes ? `${a} is above ${b}, so ${a} replaces it: ${b} metal coats the strip.` : `${a} is below ${b}, so nothing happens.`,
      });
    }
    // Predict the products (only for reactions that happen).
    const [hi, lo] = SERIES.indexOf(a) < SERIES.indexOf(b) ? [a, b] : [b, a];
    const newSalt = ionic({ f: hi, q: SALT[hi].q, name: "" }, SALT[lo].anion).formula;
    const eq = balancedText([hi, SALT[lo].f], [newSalt, lo]);
    const right = `${newSalt} + ${lo}`;
    return q({
      key: `sr-prod-${hi}-${lo}`,
      prompt: `${hi} is more reactive than ${lo}. What are the products of ${hi} + ${SALT[lo].f}?`,
      visual: rxn(eq, { askProducts: true }),
      ans: label(right, [`${SALT[lo].f} + ${hi}`, `${hi}${lo} + ${SALT[lo].anion.f}`, "No reaction"]),
      hint: `The more reactive metal (${hi}) takes the ${SALT[lo].anion.name} ion; ${lo} is left as the metal.`,
      explain: `${eq}.`,
    });
  }
  if (kind === 2) {
    const hal = ["F₂", "Cl₂", "Br₂", "I₂"];
    const salts: Record<string, string> = { "Cl₂": "KCl", "Br₂": "KBr", "I₂": "KI" };
    const x = pick(hal.slice(0, 3));
    const y = pick(Object.keys(salts).filter((h) => h !== x));
    const yes = hal.indexOf(x) < hal.indexOf(y);
    const xEl = x.replace("₂", "");
    const yEl = y.replace("₂", "");
    const right = yes ? `Yes, it makes K${xEl} and ${y}` : "No reaction";
    return q({
      key: `sr-hal-${x}-${y}`,
      prompt: `${nameOf(xEl)} (${x}) is added to ${salts[y]} solution. What happens?`,
      ans: label(right, [yes ? "No reaction" : `Yes, it makes K${xEl} and ${y}`, `Yes, it makes K${yEl}${xEl}`, "The potassium is replaced"]),
      hint: "A more reactive halogen (higher in group 17) pushes a less reactive one out of its salt.",
      explain: yes ? `${x} is above ${y}, so ${x} + 2${salts[y]} → 2K${xEl} + ${y}.` : `${x} is below ${y}, so it can't replace it.`,
    });
  }
  const m = pick(["Mg", "Zn", "Fe", "Cu", "Ag", "Au", "Ca", "Al", "Ni"]);
  const reacts = SERIES.indexOf(m) < SERIES.indexOf("H");
  return q({
    key: `sr-acid-${m}`,
    prompt: `${nameOf(m)} is dropped into hydrochloric acid. Will hydrogen gas bubble off?`,
    visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 120, colour: "clear", bubbles: reacts ? 10 : false, label: `${m} in HCl` }] },
    ans: labelInOrder([`Yes: ${m} is above H in the series`, `No: ${m} is below H in the series`], reacts ? `Yes: ${m} is above H in the series` : `No: ${m} is below H in the series`),
    hint: "Metals above hydrogen in the activity series replace it from acids.",
    explain: reacts ? `${nameOf(m)} is above hydrogen, so it makes ${m} chloride and H₂ gas.` : `${nameOf(m)} is below hydrogen, so nothing happens.`,
  });
}

const PRECIP: { r: [string, string]; p: [string, string]; solid: string; colour: "sun" | "wave" | "tangerine" | "cocoa" | true }[] = [
  { r: ["AgNO₃", "NaCl"], p: ["AgCl", "NaNO₃"], solid: "AgCl", colour: true },
  { r: ["BaCl₂", "Na₂SO₄"], p: ["BaSO₄", "NaCl"], solid: "BaSO₄", colour: true },
  { r: ["Pb(NO₃)₂", "KI"], p: ["PbI₂", "KNO₃"], solid: "PbI₂", colour: "sun" },
  { r: ["CuSO₄", "NaOH"], p: ["Cu(OH)₂", "Na₂SO₄"], solid: "Cu(OH)₂", colour: "wave" },
  { r: ["CaCl₂", "Na₂CO₃"], p: ["CaCO₃", "NaCl"], solid: "CaCO₃", colour: true },
  { r: ["FeCl₃", "NaOH"], p: ["Fe(OH)₃", "NaCl"], solid: "Fe(OH)₃", colour: "cocoa" },
  { r: ["AgNO₃", "KBr"], p: ["AgBr", "KNO₃"], solid: "AgBr", colour: "sun" },
  { r: ["Ba(NO₃)₂", "K₂SO₄"], p: ["BaSO₄", "KNO₃"], solid: "BaSO₄", colour: true },
  { r: ["MgCl₂", "NaOH"], p: ["Mg(OH)₂", "NaCl"], solid: "Mg(OH)₂", colour: true },
];
const NEUTRAL: [string[], string[]][] = [
  [["HCl", "NaOH"], ["NaCl", "H₂O"]], [["HNO₃", "KOH"], ["KNO₃", "H₂O"]], [["H₂SO₄", "KOH"], ["K₂SO₄", "H₂O"]], [["HCl", "Ca(OH)₂"], ["CaCl₂", "H₂O"]], [["H₂SO₄", "NaOH"], ["Na₂SO₄", "H₂O"]],
];

/** HS-PS1-2 — double replacement: precipitates and neutralization. */
export function doubleReplacement(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const d = pick(PRECIP);
    const eq = balancedText(d.r, d.p);
    const other = d.p.find((x) => x !== d.solid)!;
    return q({
      key: `dr-solid-${d.r.join("")}`,
      prompt: `${d.r[0]} and ${d.r[1]} solutions are mixed and a solid forms. Which product is the precipitate?`,
      visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 100, colour: "clear", label: d.r[0] }, { glass: "beaker", volume: 200, colour: "clear", precipitate: d.colour, label: "Mixed" }], joiner: "+" },
      ans: label(d.solid, [other, ...d.r]),
      hint: "Sodium, potassium and nitrate compounds always dissolve. The other product must be the solid.",
      explain: `${eq}. ${other} stays dissolved; ${d.solid} is insoluble.`,
    });
  }
  if (kind === 1) {
    const d = pick(PRECIP);
    const eq = balancedText(d.r, d.p);
    const right = `${d.p[0]} + ${d.p[1]}`;
    const [a, b] = d.r;
    const metal = (f: string) => /^[A-Z][a-z]?/.exec(f)![0];
    return q({
      key: `dr-prod-${d.r.join("")}`,
      prompt: `Predict the products: ${a} + ${b} → ?`,
      visual: rxn(eq, { askProducts: true }),
      ans: label(right, [`${metal(a)}${metal(b)} + ${a.replace(metal(a), "").replace(/^\(|\)₂$/g, "")}`, `${metal(a)} + ${metal(b)}`, "No reaction"]),
      hint: "Double replacement: the two cations swap anion partners. Then fix the formulas using charges.",
      explain: `${eq}.`,
    });
  }
  const [r, p] = pick(NEUTRAL);
  const eq = balancedText(r, p);
  return q({
    key: `dr-neut-${r.join("")}`,
    prompt: `An acid and a base react: ${r[0]} + ${r[1]}. What are the products?`,
    ans: label(`${p[0]} + H₂O`, [`${p[0]} + H₂`, `${p[0]} + O₂`, "No reaction"]),
    hint: "Neutralization is a double replacement: H⁺ joins OH⁻ to make water, and the other ions make a salt.",
    explain: `${eq}.`,
  });
}

const FUELS = ["CH₄", "C₂H₆", "C₃H₈", "C₄H₁₀", "C₂H₄", "C₂H₂", "C₅H₁₂", "CH₃OH", "C₂H₅OH", "C₆H₁₂O₆"];

/** HS-PS1-2 — combustion. */
export function combustion(): Question {
  const kind = rand(0, 3);
  const fuel = pick(FUELS);
  const c = coefs([fuel, "O₂"], ["CO₂", "H₂O"]);
  const eq = balancedText([fuel, "O₂"], ["CO₂", "H₂O"]);
  if (kind === 0) {
    return q({
      key: `comb-prod-${fuel}`,
      prompt: `What are the products when ${fuel} burns completely in oxygen?`,
      ans: label("CO₂ + H₂O", ["CO₂ + H₂", "C + H₂O", "CO + H₂", "CH₄ + O₂"]),
      hint: "Complete combustion turns all the carbon into CO₂ and all the hydrogen into H₂O.",
      explain: `${eq}.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `comb-o2-${fuel}`,
      prompt: "What coefficient of O₂ balances this combustion?",
      visual: rxn(eq, { askCoef: 1 }),
      needsVisual: true,
      ans: keypad(c[1]),
      hint: "Balance C first (CO₂), then H (H₂O), then count the O atoms needed on the right.",
      explain: `${eq}.`,
    });
  }
  if (kind === 2) {
    const nC = countAtoms(fuel, "C");
    const nH = countAtoms(fuel, "H");
    const askC = rand(0, 1) === 0;
    return q({
      key: `comb-mol-${fuel}-${askC ? "c" : "h"}`,
      prompt: `One molecule of ${fuel} burns completely. How many ${askC ? "CO₂" : "H₂O"} molecules form?`,
      ans: keypad(askC ? nC : nH / 2, [askC ? nH : nH, askC ? nC * 2 : nC]),
      hint: askC ? "Each carbon atom ends up in one CO₂." : "Each H₂O holds 2 hydrogen atoms.",
      explain: askC ? `${nC} C atoms → ${nC} CO₂.` : `${nH} H atoms → ${nH / 2} H₂O.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["With too little oxygen, a flame makes a poisonous gas. Which?", "Carbon monoxide, CO", ["Carbon dioxide, CO₂", "Water vapor", "Hydrogen, H₂"]],
    ["Why is combustion useful for heating homes?", "It releases energy (it's exothermic)", ["It absorbs heat", "It makes oxygen", "It cools the air"]],
    ["A sooty yellow flame shows that…", "combustion is incomplete", ["combustion is complete", "the fuel is pure hydrogen", "no CO₂ is made"]],
    ["Which reactant is in every combustion reaction?", "Oxygen, O₂", ["Water", "Carbon dioxide", "Hydrogen"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `comb-fact-${i}`, prompt, ans: label(right, wrong), hint: "Combustion: fuel + O₂ → CO₂ + H₂O + energy (when there's plenty of oxygen).", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-7, HS-PS1-2 — Do it: balance replacement and combustion equations. */
export function balanceMore(): Question {
  const [r, p] = pick(REPLACE_COMBUST);
  const c = coefs(r, p);
  return q({
    key: `balmore-${r.join("+")}=${p.join("+")}`,
    prompt: "Balance the equation.",
    speech: "Balance the equation by setting each coefficient.",
    ans: act({ kind: "chem-balance", reactants: r, products: p, max: Math.max(10, ...c) + 1 }, c[0]),
    hint: p.includes("CO₂") ? "Combustion: balance C, then H, then O last. If O₂ needs a half, double everything." : "Treat a polyatomic ion that stays together (like SO₄ or NO₃) as one unit.",
    explain: `${balancedText(r, p)}.`,
  });
}

/* ===================================================== 4. Bonding & properties */

type Bond = "Ionic" | "Covalent" | "Metallic";
const SUBSTANCES: [string, string, Bond][] = [
  ["NaCl", "table salt", "Ionic"], ["MgO", "magnesium oxide", "Ionic"], ["KBr", "potassium bromide", "Ionic"], ["CaF₂", "calcium fluoride", "Ionic"],
  ["Li₂O", "lithium oxide", "Ionic"], ["Al₂O₃", "aluminum oxide", "Ionic"], ["K₂S", "potassium sulfide", "Ionic"], ["CaCl₂", "calcium chloride", "Ionic"],
  ["H₂O", "water", "Covalent"], ["CO₂", "carbon dioxide", "Covalent"], ["CH₄", "methane", "Covalent"], ["NH₃", "ammonia", "Covalent"],
  ["HCl", "hydrogen chloride", "Covalent"], ["O₂", "oxygen", "Covalent"], ["C₁₂H₂₂O₁₁", "sugar", "Covalent"], ["I₂", "iodine", "Covalent"], ["SiO₂", "quartz", "Covalent"],
  ["Cu", "copper", "Metallic"], ["Fe", "iron", "Metallic"], ["Al", "aluminum", "Metallic"], ["Na", "sodium", "Metallic"], ["Au", "gold", "Metallic"], ["Mg", "magnesium", "Metallic"], ["Ag", "silver", "Metallic"],
];
const BOND_WHY: Record<Bond, string> = {
  Ionic: "a metal gives electrons to a nonmetal, and the ions attract",
  Covalent: "nonmetal atoms share pairs of electrons",
  Metallic: "metal atoms share a sea of loose electrons",
};

/** HS-PS1-3 — ionic, covalent and metallic bonding. */
export function bondTypes(): Question {
  const kind = rand(0, 3);
  const BONDS: Bond[] = ["Ionic", "Covalent", "Metallic"];
  if (kind === 0) {
    const [f, name, b] = pick(SUBSTANCES);
    return q({
      key: `bt-sub-${f}`,
      prompt: `What kind of bonding holds ${name} (${f}) together?`,
      ans: labelInOrder(BONDS, b),
      hint: "Metal + nonmetal → ionic. Nonmetals only → covalent. Metal only → metallic.",
      explain: `${b}: ${BOND_WHY[b]}.`,
    });
  }
  if (kind === 1) {
    const pics: [Bond, ChemistryVisual][] = [
      ["Ionic", { kind: "chem-particles", panels: [{ species: [{ formula: "Na⁺", count: 8 }, { formula: "Cl⁻", count: 8 }], arrangement: "solid" }] }],
      ["Ionic", { kind: "chem-particles", panels: [{ species: [{ formula: "Mg²⁺", count: 8 }, { formula: "O²⁻", count: 8 }], arrangement: "solid" }] }],
      ["Covalent", { kind: "chem-molecule", molecule: "H₂O", style: "lewis" }],
      ["Covalent", { kind: "chem-molecule", molecule: "CH₄", style: "lewis" }],
      ["Covalent", { kind: "chem-molecule", molecule: "N₂", style: "lewis" }],
      ["Covalent", { kind: "chem-molecule", molecule: "CO₂", style: "lewis" }],
    ];
    const i = rand(0, pics.length - 1);
    const [b, v] = pics[i];
    return q({
      key: `bt-pic-${i}`,
      prompt: "What kind of bonding does this picture show?",
      visual: v,
      needsVisual: true,
      ans: labelInOrder(BONDS, b),
      hint: "Charged ions packed together → ionic. Lines (shared pairs) between atoms → covalent.",
      explain: `${b}: ${BOND_WHY[b]}.`,
    });
  }
  if (kind === 2) {
    const pairs = [["Na", "Cl"], ["K", "F"], ["Mg", "O"], ["Ca", "Cl"], ["Li", "F"], ["H", "Cl"], ["H", "O"], ["C", "O"], ["N", "H"], ["C", "H"], ["Cl", "Cl"], ["H", "H"], ["O", "O"], ["Al", "Cl"], ["S", "O"], ["P", "Cl"], ["H", "F"], ["C", "Cl"]];
    const [a, b] = pick(pairs);
    const d = rd(Math.abs(element(a)!.en! - element(b)!.en!));
    const right = d > 1.7 ? "Ionic" : d >= 0.4 ? "Polar covalent" : "Nonpolar covalent";
    return q({
      key: `bt-en-${a}${b}`,
      prompt: `The electronegativities are ${a} ${element(a)!.en!.toFixed(2)} and ${b} ${element(b)!.en!.toFixed(2)}. What kind of bond forms between them?`,
      visual: { kind: "table", header: ["EN difference", "Bond"], rows: [["less than 0.4", "nonpolar covalent"], ["0.4 to 1.7", "polar covalent"], ["more than 1.7", "ionic"]] },
      ans: labelInOrder(["Nonpolar covalent", "Polar covalent", "Ionic"], right),
      hint: "Subtract the smaller electronegativity from the bigger one, then use the table.",
      explain: `Difference = ${d.toFixed(2)}: ${right.toLowerCase()}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["In which kind of bond do atoms SHARE pairs of electrons?", "Covalent", ["Ionic", "Metallic", "Hydrogen"]],
    ["In which kind of bond are electrons TRANSFERRED to make ions?", "Ionic", ["Covalent", "Metallic", "Polar covalent"]],
    ["Which kind of bonding has a 'sea' of free electrons?", "Metallic", ["Ionic", "Covalent", "Hydrogen"]],
    ["In a polar covalent bond, electrons are…", "shared unequally", ["shared equally", "fully transferred", "not involved"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `bt-fact-${i}`, prompt, ans: label(right, wrong), hint: "Transfer → ions. Share → covalent. Free sea of electrons → metallic.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-3 — Do it: sort substances by bond type. */
export function sortBondTypes(): Question {
  const bins: Bond[] = ["Ionic", "Covalent", "Metallic"];
  const items = bins.flatMap((b, bin) => pickN(SUBSTANCES.filter(([, , x]) => x === b), rand(2, 3)).map(([f, name]) => ({ label: `${f} (${name})`, bin })));
  const shuffled = shuffle(items);
  return q({
    key: `sortbt-${shuffled.map((i) => i.label).sort().join(",")}`,
    prompt: "Sort the substances by the kind of bonding inside them.",
    ans: act({ kind: "sort", bins, items: shuffled }, shuffled.length),
    hint: "Look at the elements: metal + nonmetal, nonmetals only, or metal only?",
    explain: shuffled.map((i) => `${i.label.split(" ")[0]}: ${bins[i.bin].toLowerCase()}`).join(", ") + ".",
  });
}

/** Lewis data: bonding pairs and lone pairs (whole molecule). */
const LEWIS: Record<string, { bp: number; lp: number; name: string; multiple?: string }> = {
  "H₂O": { bp: 2, lp: 2, name: "water" }, "NH₃": { bp: 3, lp: 1, name: "ammonia" }, "CH₄": { bp: 4, lp: 0, name: "methane" },
  "CO₂": { bp: 4, lp: 4, name: "carbon dioxide", multiple: "two double bonds" }, HCN: { bp: 4, lp: 1, name: "hydrogen cyanide", multiple: "a triple bond" },
  "N₂": { bp: 3, lp: 2, name: "nitrogen", multiple: "a triple bond" }, "O₂": { bp: 2, lp: 4, name: "oxygen", multiple: "a double bond" },
  HCl: { bp: 1, lp: 3, name: "hydrogen chloride" }, "CCl₄": { bp: 4, lp: 12, name: "carbon tetrachloride" }, "C₂H₄": { bp: 6, lp: 0, name: "ethene", multiple: "a double bond" },
  "C₂H₂": { bp: 5, lp: 0, name: "ethyne", multiple: "a triple bond" }, "CH₂O": { bp: 4, lp: 2, name: "formaldehyde", multiple: "a double bond" },
  "PCl₃": { bp: 3, lp: 10, name: "phosphorus trichloride" }, "F₂": { bp: 1, lp: 6, name: "fluorine" }, "H₂S": { bp: 2, lp: 2, name: "hydrogen sulfide" },
};
/** Total valence electrons of a neutral molecule. */
const valenceTotal = (f: string) => ["H", "C", "N", "O", "F", "P", "S", "Cl"].reduce((t, e) => t + countAtoms(f, e) * valenceElectrons(e)!, 0);

/** HS-PS1-3 — Lewis structures. */
export function lewis(): Question {
  const kind = rand(0, 3);
  const f = pick(Object.keys(LEWIS));
  const d = LEWIS[f];
  if (kind === 0) {
    const askLone = rand(0, 1) === 0;
    const n = askLone ? d.lp : d.bp;
    return q({
      key: `lw-pairs-${f}-${askLone ? "lp" : "bp"}`,
      prompt: `How many ${askLone ? "lone pairs" : "bonding pairs (shared pairs)"} are in this Lewis structure of ${f}?`,
      visual: { kind: "chem-molecule", molecule: f, style: "lewis" },
      needsVisual: true,
      ans: keypad(n),
      hint: askLone ? "Lone pairs are pairs of dots that aren't between two atoms." : "Each line is one shared pair; a double bond is 2 pairs, a triple bond 3.",
      explain: `${f} has ${d.bp} bonding pair${d.bp === 1 ? "" : "s"} and ${d.lp} lone pair${d.lp === 1 ? "" : "s"}: ${2 * (d.bp + d.lp)} valence electrons in all.`,
    });
  }
  if (kind === 1) {
    const total = valenceTotal(f);
    return q({
      key: `lw-total-${f}`,
      prompt: `How many valence electrons does one molecule of ${d.name} (${f}) have in total?`,
      ans: keypad(total, [total - 2, total + 2, d.bp * 2]),
      hint: "Add the valence electrons of every atom: H 1, C 4, N and P 5, O and S 6, F and Cl 7.",
      explain: `${["H", "C", "N", "O", "F", "P", "S", "Cl"].filter((e) => countAtoms(f, e)).map((e) => `${countAtoms(f, e)} ${e} × ${valenceElectrons(e)}`).join(" + ")} = ${total}.`,
    });
  }
  if (kind === 2) {
    const m = pick(["N₂", "O₂", "CO₂", "HCN", "C₂H₄", "C₂H₂", "CH₂O", "F₂", "HCl", "CH₄"]);
    const right = LEWIS[m].multiple ? (LEWIS[m].multiple!.includes("triple") ? "Triple" : "Double") : "Only single bonds";
    return q({
      key: `lw-mult-${m}`,
      prompt: `Which kind of bond does ${LEWIS[m].name} (${m}) contain?`,
      visual: { kind: "chem-molecule", molecule: m, style: "structural" },
      ans: labelInOrder(["Only single bonds", "Double", "Triple"], right),
      hint: "Count the lines between each pair of atoms.",
      explain: LEWIS[m].multiple ? `${m} has ${LEWIS[m].multiple}, so every atom gets a full shell.` : `${m} has only single bonds.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why does N₂ need a triple bond?", "Each N needs 3 more electrons to reach 8", ["N has 3 electrons in total", "Triple bonds are always the strongest choice", "N₂ is an ion"]],
    ["Why does hydrogen only ever make one bond?", "Its shell is full with just 2 electrons", ["It has no electrons", "It only has neutrons", "It is a metal"]],
    ["What is the 'octet rule'?", "Atoms bond until they have 8 outer electrons", ["Atoms have 8 protons", "Molecules have 8 atoms", "Every bond has 8 electrons"]],
    ["How many electrons does a double bond share?", "4", ["2", "6", "8"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `lw-fact-${i}`, prompt, ans: label(right, wrong), hint: "Atoms share pairs until each has a full outer shell (8, or 2 for hydrogen).", explain: `${right}.` });
}

const BUILDS: [string, string[], string][] = [
  ["C", ["H"], "CH₄"], ["N", ["H"], "NH₃"], ["O", ["H"], "H₂O"], ["C", ["O"], "CO₂"], ["C", ["H", "N"], "HCN"], ["C", ["H", "O"], "CH₂O"],
  ["C", ["Cl"], "CCl₄"], ["N", ["Cl"], "NCl₃"], ["P", ["H"], "PH₃"], ["S", ["H"], "H₂S"], ["C", ["S"], "CS₂"], ["Si", ["H"], "SiH₄"],
  ["O", ["F"], "OF₂"], ["C", ["H", "Cl"], "CHCl₃"], ["C", ["H", "Cl"], "CH₂Cl₂"], ["C", ["O", "Cl"], "COCl₂"], ["P", ["Cl"], "PCl₃"], ["C", ["H", "F"], "CH₃F"],
];

/** HS-PS1-3 — Do it: build a molecule with full shells. */
export function buildMolecule(): Question {
  const [center, tray0, target] = pick(BUILDS);
  const extra = pick(["H", "O", "Cl", "N"].filter((e) => !tray0.includes(e) && e !== center));
  const tray = rand(0, 1) === 0 ? shuffle([...tray0, extra]) : tray0;
  return q({
    key: `bm-${target}-${tray.length}`,
    prompt: `Build ${target} around the central ${center}, giving every atom a full shell.`,
    ans: act({ kind: "chem-buildMolecule", center, tray, target }, 1),
    hint: `${center} has ${valenceElectrons(center)} valence electrons, so it needs ${8 - valenceElectrons(center)!} more. O and S can double-bond; N can triple-bond.`,
    explain: `${target}: ${center} makes ${8 - valenceElectrons(center)!} bonds in all, and every atom ends with a full shell.`,
  });
}

const SHAPES: Record<string, { polar: boolean; shape: string }> = {
  "H₂O": { polar: true, shape: "bent" }, "NH₃": { polar: true, shape: "trigonal pyramidal" }, "CH₄": { polar: false, shape: "tetrahedral" },
  "CO₂": { polar: false, shape: "linear" }, "CCl₄": { polar: false, shape: "tetrahedral" }, HCl: { polar: true, shape: "linear" },
  "BF₃": { polar: false, shape: "trigonal planar" }, "SO₂": { polar: true, shape: "bent" }, "H₂S": { polar: true, shape: "bent" },
  "PCl₃": { polar: true, shape: "trigonal pyramidal" }, HCN: { polar: true, shape: "linear" }, HF: { polar: true, shape: "linear" },
  "Cl₂": { polar: false, shape: "linear" }, "N₂": { polar: false, shape: "linear" },
};

/** HS-PS1-3 — molecular shape and polarity. */
export function polarity(): Question {
  const kind = rand(0, 3);
  const f = pick(Object.keys(SHAPES));
  const s = SHAPES[f];
  if (kind === 0) {
    return q({
      key: `pol-pic-${f}`,
      prompt: `Is ${f} a polar or a nonpolar molecule?`,
      visual: { kind: "chem-molecule", molecule: f, style: "ball", shape: true, lonePairs: true },
      needsVisual: true,
      ans: labelInOrder(["Polar", "Nonpolar"], s.polar ? "Polar" : "Nonpolar"),
      hint: "Polar bonds AND a lopsided shape → polar. Identical bonds arranged symmetrically cancel out.",
      explain: s.polar ? `Polar: its ${s.shape} shape leaves one side more negative.` : `Nonpolar: the ${s.shape} shape is symmetrical${f.length > 2 ? ", so the bond dipoles cancel" : ""}.`,
    });
  }
  if (kind === 1) {
    const m = pick(["CO₂", "CCl₄", "BF₃", "CH₄"]);
    return q({
      key: `pol-cancel-${m}`,
      prompt: `${m} has polar bonds, but the molecule is nonpolar. Why?`,
      visual: { kind: "chem-molecule", molecule: m, style: "ball", shape: true },
      ans: label("Its symmetrical shape makes the bond dipoles cancel", ["Its bonds aren't really polar", "It has no electrons to share", "Nonpolar molecules can't have polar bonds"]),
      hint: "Think of each bond as a tug of war. What happens when equal pulls point in balanced directions?",
      explain: `${m} is ${SHAPES[m].shape}: the pulls are equal and balanced, so they cancel.`,
    });
  }
  if (kind === 2) {
    const polars = Object.keys(SHAPES).filter((k) => SHAPES[k].polar);
    const nons = Object.keys(SHAPES).filter((k) => !SHAPES[k].polar);
    const askPolar = rand(0, 1) === 0;
    const right = pick(askPolar ? polars : nons);
    return q({
      key: `pol-which-${askPolar ? "p" : "n"}-${right}`,
      prompt: `Which molecule is ${askPolar ? "POLAR" : "NONPOLAR"}?`,
      ans: label(right, pickN(askPolar ? nons : polars, 3)),
      hint: "Lone pairs on the central atom (H₂O, NH₃) or different outer atoms usually make a molecule polar.",
      explain: `${right} is ${SHAPES[right].shape} and ${askPolar ? "polar" : "nonpolar"}.`,
    });
  }
  const m = pick(Object.keys(SHAPES).filter((k) => k.length > 2 || k === "HCN"));
  const all = [...new Set(Object.values(SHAPES).map((v) => v.shape))];
  return q({
    key: `pol-shape-${m}`,
    prompt: `What shape is ${m}?`,
    visual: { kind: "chem-molecule", molecule: m, style: "ball", shape: "?", lonePairs: true },
    needsVisual: true,
    ans: label(SHAPES[m].shape, all.filter((x) => x !== SHAPES[m].shape)),
    hint: "Count the atoms bonded to the centre and the lone pairs on it; lone pairs push the bonds closer.",
    explain: `${m} is ${SHAPES[m].shape}.`,
  });
}

type IMF = "London dispersion" | "Dipole–dipole" | "Hydrogen bonding";
const IMFS: [string, string, IMF][] = [
  ["H₂O", "water", "Hydrogen bonding"], ["NH₃", "ammonia", "Hydrogen bonding"], ["HF", "hydrogen fluoride", "Hydrogen bonding"], ["CH₃OH", "methanol", "Hydrogen bonding"], ["C₂H₅OH", "ethanol", "Hydrogen bonding"],
  ["HCl", "hydrogen chloride", "Dipole–dipole"], ["H₂S", "hydrogen sulfide", "Dipole–dipole"], ["SO₂", "sulfur dioxide", "Dipole–dipole"], ["PCl₃", "phosphorus trichloride", "Dipole–dipole"], ["CH₂O", "formaldehyde", "Dipole–dipole"],
  ["CH₄", "methane", "London dispersion"], ["CO₂", "carbon dioxide", "London dispersion"], ["I₂", "iodine", "London dispersion"], ["Cl₂", "chlorine", "London dispersion"], ["C₈H₁₈", "octane", "London dispersion"], ["CCl₄", "carbon tetrachloride", "London dispersion"],
];

/** HS-PS1-3 — intermolecular forces. */
export function imfs(): Question {
  const kind = rand(0, 3);
  const TYPES: IMF[] = ["London dispersion", "Dipole–dipole", "Hydrogen bonding"];
  if (kind === 0 || kind === 1) {
    const [f, name, t] = pick(IMFS);
    return q({
      key: `imf-strong-${f}`,
      prompt: `What is the strongest force BETWEEN molecules of ${name} (${f})?`,
      ans: labelInOrder(TYPES, t),
      hint: "H bonded to N, O or F → hydrogen bonding. Other polar molecules → dipole–dipole. Nonpolar → London only.",
      explain: t === "Hydrogen bonding" ? `${f} has H joined to N, O or F, so its molecules hydrogen-bond.` : t === "Dipole–dipole" ? `${f} is polar but has no H on N, O or F: dipole–dipole.` : `${f} is nonpolar, so only London dispersion forces hold its molecules together.`,
    });
  }
  if (kind === 2) {
    const pairs: [string, string][] = [["I₂", "F₂"], ["Br₂", "Cl₂"], ["C₈H₁₈", "CH₄"], ["Xe", "He"], ["C₅H₁₂", "C₂H₆"], ["Kr", "Ne"]];
    const [big, small] = pick(pairs);
    return q({
      key: `imf-london-${big}`,
      prompt: `Both are nonpolar. Why are the London forces between ${big} molecules stronger than between ${small} molecules?`,
      ans: label(`${big} is bigger, with more electrons to distort`, [`${big} is polar`, `${big} can hydrogen-bond`, `${small} has more electrons`]),
      hint: "London forces come from short-lived uneven electron clouds. Big electron clouds are easier to distort.",
      explain: `${big} has more electrons, so its temporary dipoles are bigger: stronger London forces.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["When water boils, what is broken?", "Hydrogen bonds BETWEEN molecules", ["O–H bonds INSIDE molecules", "Water molecules into H₂ and O₂", "The oxygen atoms"]],
    ["Hydrogen bonds form when H is bonded to which atoms?", "N, O or F", ["C or Cl", "Any metal", "Other H atoms"]],
    ["Which are stronger: covalent bonds or intermolecular forces?", "Covalent bonds (inside molecules)", ["Intermolecular forces", "They're the same", "It depends on the color"]],
    ["Which molecules have London dispersion forces?", "All molecules", ["Only polar molecules", "Only ions", "Only molecules with O–H"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `imf-fact-${i}`, prompt, ans: label(right, wrong), hint: "Bonds hold atoms together inside a molecule; intermolecular forces hold separate molecules to each other.", explain: `${right}.` });
}

/** Normal boiling points (°C). */
const BP: Record<string, number> = {
  "H₂O": 100, "H₂S": -60, "H₂Se": -41, "H₂Te": -2, HF: 20, HCl: -85, HBr: -67, HI: -35, "NH₃": -33, "PH₃": -88, "AsH₃": -62, "SbH₃": -17,
  "CH₄": -162, "SiH₄": -112, "GeH₄": -88, "SnH₄": -52, "F₂": -188, "Cl₂": -34, "Br₂": 59, "I₂": 184, He: -269, Ne: -246, Ar: -186, Kr: -153, Xe: -108,
  "C₂H₆": -89, "C₃H₈": -42, "C₄H₁₀": -1, "C₅H₁₂": 36, "C₆H₁₄": 69, "C₈H₁₈": 126, "CH₃OH": 65, "C₂H₅OH": 78, "CH₃OCH₃": -24, "N₂": -196, NaCl: 1413,
};
const HYDRIDES: { group: number; list: string[]; odd: string | null }[] = [
  { group: 14, list: ["CH₄", "SiH₄", "GeH₄", "SnH₄"], odd: null },
  { group: 15, list: ["NH₃", "PH₃", "AsH₃", "SbH₃"], odd: "NH₃" },
  { group: 16, list: ["H₂O", "H₂S", "H₂Se", "H₂Te"], odd: "H₂O" },
  { group: 17, list: ["HF", "HCl", "HBr", "HI"], odd: "HF" },
];

/** HS-PS1-3 — melting and boiling points from forces between particles. */
export function boilingPoints(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const pairs: [string, string, string][] = [
      ["H₂O", "H₂S", "water hydrogen-bonds; H₂S molecules only attract by weaker dipole forces"],
      ["HF", "HCl", "HF hydrogen-bonds; HCl can't"],
      ["NH₃", "PH₃", "NH₃ hydrogen-bonds; PH₃ can't"],
      ["C₂H₅OH", "CH₃OCH₃", "ethanol has an O–H and hydrogen-bonds; dimethyl ether (same atoms) can't"],
      ["I₂", "Br₂", "I₂ is bigger with more electrons: stronger London forces"],
      ["C₈H₁₈", "C₃H₈", "octane is a much longer chain: stronger London forces"],
      ["NaCl", "H₂O", "NaCl's ions are held by strong ionic bonds, which must break to boil it"],
      ["Cl₂", "F₂", "Cl₂ has more electrons: stronger London forces"],
      ["Xe", "Ar", "xenon atoms are bigger: stronger London forces"],
      ["CH₃OH", "CH₄", "methanol hydrogen-bonds; methane only has London forces"],
      ["HCl", "F₂", "HCl is polar (dipole–dipole) while F₂ is nonpolar, and they're a similar size"],
    ];
    const [hi, lo, why] = pick(pairs);
    const [a, b] = rand(0, 1) === 0 ? [hi, lo] : [lo, hi];
    return q({
      key: `bp-cmp-${hi}-${a === hi ? 1 : 0}`,
      prompt: `Which has the higher boiling point: ${a} or ${b}?`,
      ans: labelInOrder([a, b], hi),
      hint: "Stronger forces between particles need more energy to pull apart: ionic > hydrogen bonding > dipole > London (for similar sizes).",
      explain: `${hi} (${ns(BP[hi])} °C vs ${ns(BP[lo])} °C): ${why}.`,
    });
  }
  if (kind === 1) {
    const h = pick(HYDRIDES);
    const ys = h.list.map((f) => BP[f]);
    return q({
      key: `bp-plot-${h.group}`,
      prompt: `Boiling points of the group ${h.group} hydrides, periods 2–5. Which one breaks the trend?`,
      visual: {
        kind: "plot",
        x: [1, 6],
        y: [-200, 120],
        xLabel: "period",
        yLabel: "boiling point (°C)",
        points: h.list.map((f, i) => ({ x: i + 2, y: ys[i], label: f })),
        lines: h.list.slice(1).map((_, i) => ({ from: [i + 2, ys[i]] as [number, number], to: [i + 3, ys[i + 1]] as [number, number], colour: "wave" as const, dashed: true })),
      },
      needsVisual: true,
      ans: label(h.odd ?? "None: the trend is smooth", [...h.list.filter((f) => f !== h.odd).slice(0, 2), ...(h.odd ? ["None: the trend is smooth"] : [h.list[0]])]),
      hint: "Heavier molecules usually boil higher (more electrons, stronger London forces). Look for one far too high.",
      explain: h.odd ? `${h.odd} boils at ${BP[h.odd]} °C, far above the trend, because it hydrogen-bonds.` : "Group 14 hydrides are nonpolar with no hydrogen bonding: boiling point just rises with size.",
    });
  }
  const sets = [["F₂", "Cl₂", "Br₂", "I₂"], ["He", "Ne", "Ar", "Kr", "Xe"], ["CH₄", "C₂H₆", "C₃H₈", "C₄H₁₀", "C₅H₁₂", "C₆H₁₄", "C₈H₁₈"]];
  const set = pick(sets);
  const i = rand(1, set.length - 2);
  const t = set[i];
  const shown = set.slice(Math.max(0, i - 1), i + 2);
  return q({
    key: `bp-gap-${t}`,
    prompt: `Predict the boiling point of ${t}.`,
    visual: { kind: "table", header: ["Substance", "Boiling point"], rows: shown.map((f) => [f, f === t ? "?" : `${BP[f]} °C`]) },
    needsVisual: true,
    ans: choose(BP[t], [BP[set[i - 1]] - rand(15, 40), BP[set[i + 1]] + rand(15, 40), 2 * BP[set[i + 1]] - BP[set[i - 1]] + 30].map(Math.round), 1),
    unit: "°C",
    hint: "These are all nonpolar, so only size (number of electrons) matters. The answer must fall between its neighbours.",
    explain: `${t} boils at ${ns(BP[t])} °C, between ${set[i - 1]} (${ns(BP[set[i - 1]])} °C) and ${set[i + 1]} (${ns(BP[set[i + 1]])} °C).`,
  });
}

/** HS-PS1-3 — Do it: order substances by boiling point. */
export function orderBoiling(): Question {
  const sets = [
    ["F₂", "Cl₂", "Br₂", "I₂"], ["He", "Ne", "Ar", "Kr", "Xe"], ["CH₄", "C₂H₆", "C₃H₈", "C₄H₁₀", "C₅H₁₂", "C₆H₁₄", "C₈H₁₈"],
    ["N₂", "CH₄", "HCl", "NH₃", "CH₃OH", "H₂O", "NaCl"], ["CH₄", "H₂S", "NH₃", "H₂O"],
  ];
  const set = pick(sets);
  const four = pickN(set, 4).sort((a, b) => BP[a] - BP[b]);
  return q({
    key: `ordbp-${four.join("-")}`,
    prompt: "Tap from LOWEST to HIGHEST boiling point.",
    ans: act({ kind: "order", items: four, direction: "lowest → highest boiling point" }, 4),
    hint: "Weakest forces boil first: London (small) < London (big) < dipole < hydrogen bonding < ionic.",
    explain: four.map((f) => `${f} ${ns(BP[f])} °C`).join(" < ") + ".",
  });
}

const STATES: { name: string; formula?: string; melt: number; boil: number; note: string }[] = [
  { name: "water", formula: "H₂O", melt: 0, boil: 100, note: "Water molecules hydrogen-bond strongly." },
  { name: "ethanol", melt: -114, boil: 78, note: "Ethanol hydrogen-bonds, but has only one O–H per molecule." },
  { name: "methanol", melt: -98, boil: 65, note: "Methanol is a small molecule that hydrogen-bonds." },
  { name: "dimethyl ether", melt: -141, boil: -24, note: "It has the same atoms as ethanol (78 °C) but no O–H, so no hydrogen bonds." },
  { name: "ammonia", formula: "NH₃", melt: -78, boil: -33, note: "Ammonia hydrogen-bonds, more weakly than water (100 °C)." },
  { name: "hydrogen sulfide", formula: "H₂S", melt: -82, boil: -60, note: "H₂S is like water but can't hydrogen-bond." },
  { name: "methane", formula: "CH₄", melt: -182, boil: -162, note: "Methane is small and nonpolar: London forces only." },
  { name: "bromine", formula: "Br₂", melt: -7, boil: 59, note: "Br₂ is nonpolar but has 70 electrons: strong London forces." },
  { name: "iodine", formula: "I₂", melt: 114, boil: 184, note: "I₂ is even bigger than Br₂ (59 °C)." },
  { name: "hexane", melt: -95, boil: 69, note: "Hexane is a nonpolar chain of 6 carbons." },
  { name: "octane", melt: -57, boil: 126, note: "Octane is a longer chain than hexane (69 °C)." },
  { name: "hydrogen fluoride", formula: "HF", melt: -83, boil: 20, note: "HF hydrogen-bonds; HCl (−85 °C) can't." },
  { name: "chlorine", formula: "Cl₂", melt: -101, boil: -34, note: "Cl₂ is nonpolar; F₂ boils at −188 °C." },
];

/** HS-PS1-3 — Do it: warm a substance and find where it melts or boils. */
export function findBoiling(): Question {
  const s = pick(STATES);
  const melt = rand(0, 2) === 0;
  const t = melt ? s.melt : s.boil;
  const min = melt ? s.melt - 30 : s.boil - 50;
  const max = melt ? Math.min(s.melt + 50, s.boil - 5) : s.boil + 30;
  return q({
    key: `findbp-${s.name}-${melt ? "m" : "b"}`,
    prompt: `${s.note} Warm ${s.name} slowly and stop exactly where it starts to ${melt ? "melt" : "boil"}.`,
    ans: act({ kind: "chem-states", substance: s.name, formula: s.formula, melt: s.melt, boil: s.boil, target: { find: melt ? "melt" : "boil" }, min, max, step: 1 }, t),
    hint: `Watch the particles. At the ${melt ? "melting" : "boiling"} point they ${melt ? "break out of their rows" : "fly apart into a gas"}.`,
    explain: `${s.name[0].toUpperCase()}${s.name.slice(1)} ${melt ? "melts" : "boils"} at ${ns(t)} °C. ${melt ? "" : "Stronger forces between molecules mean a higher boiling point."}`.trim(),
  });
}

/** HS-PS1-3 — bulk properties: conductivity, hardness, surface tension, evaporation. */
export function bulkProperties(): Question {
  const facts: [string, string, string[]][] = [
    ["Which conducts electricity when MELTED but not when solid?", "Sodium chloride (ionic)", ["Copper (metallic)", "Sugar (covalent)", "Wax (covalent)"]],
    ["Which conducts electricity as a SOLID?", "Copper (metallic)", ["Sodium chloride (ionic)", "Sugar (covalent)", "Ice (covalent)"]],
    ["Why is table salt brittle?", "Shifting a layer lines up like charges, which repel", ["Its molecules are weak", "It has free electrons", "Salt is a liquid at room temperature"]],
    ["Why can copper be hammered into thin sheets?", "Its ions can slide in the sea of electrons without breaking bonds", ["Copper has weak covalent bonds", "Copper ions repel each other", "Copper is a molecular solid"]],
    ["Why is diamond so hard?", "Every carbon is covalently bonded in a giant network", ["Its molecules attract strongly", "It is ionic", "It has a sea of electrons"]],
    ["Why does wax melt at a low temperature?", "Only weak forces hold its molecules together", ["Its covalent bonds break easily", "It is ionic", "It contains water"]],
    ["Why can a water strider stand on water?", "Hydrogen bonds pull surface molecules together (surface tension)", ["Water is denser than the insect", "The insect is magnetic", "Air pushes up on its legs"]],
    ["Which has the higher surface tension?", "Water (hydrogen bonding)", ["Hexane (London forces only)", "They're the same", "Rubbing alcohol"]],
    ["Why does rubbing alcohol evaporate faster than water?", "Its molecules are held by weaker forces", ["It has stronger hydrogen bonds", "It is heavier", "It is ionic"]],
    ["Why does a drop of water bead up on wax paper?", "Water molecules attract each other more than the wax", ["Wax attracts water strongly", "Water has no surface tension", "The wax is hot"]],
    ["Why does salt dissolve in water but not in oil?", "Polar water attracts the ions; nonpolar oil can't", ["Oil is too thick", "Salt is nonpolar", "Water has free electrons"]],
    ["Why is honey thicker (more viscous) than water?", "Its large sugar molecules form many hydrogen bonds", ["It has fewer molecules", "It is a metal", "It has no intermolecular forces"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `bulk-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Ask: what particles are there (ions, molecules, metal atoms, a network), and how strongly are they held?",
    explain: `${right}.`,
  });
}

/** HS-PS2-6 — why designed materials work. */
export function designedMaterials(): Question {
  const facts: [string, string, string[]][] = [
    ["Nothing sticks to a nonstick (PTFE) pan. Why?", "Its fluorine-covered chains have very weak attractions to other molecules", ["It is covered in oil", "It is magnetic", "It has a sea of free electrons"]],
    ["Gecko tape sticks to glass with no glue. How?", "Millions of tiny hairs add up huge numbers of weak London forces", ["Suction cups", "Ionic bonds with the glass", "Static electricity from rubbing"]],
    ["Why are copper wires used for electricity?", "Metallic bonding gives free electrons that can carry current", ["Copper is ionic", "Copper molecules are polar", "Copper has no electrons"]],
    ["Kevlar fibers stop bullets. What makes them so strong?", "Long chains lined up and linked by hydrogen bonds", ["They are made of metal", "They are brittle like salt", "Single short molecules"]],
    ["Why does a diaper gel soak up so much water?", "Its polymer chains have many polar groups that attract water", ["It is nonpolar", "It is a metal", "It reacts to destroy the water"]],
    ["Why is a polyethylene bag soft and flexible?", "Its long chains are held only by weak London forces and can slide", ["It is a giant covalent network", "It has ionic bonds", "It is a metal"]],
    ["Why does pencil 'lead' (graphite) leave marks on paper?", "Its layers are held by weak forces and slide off", ["It contains real lead", "It is ionic", "It melts on paper"]],
    ["Why does vulcanized rubber snap back after stretching?", "Cross-links between chains pull it back into shape", ["It is a metal", "It is an ionic crystal", "It has no chains"]],
    ["Why is aluminum foil easy to fold without breaking?", "Metal ions slide past each other in the sea of electrons", ["It is brittle", "It is a covalent network", "It is a polymer"]],
    ["A waterproof, breathable jacket has a PTFE layer full of tiny pores. How does it work?", "The pores are too small for drops but let water vapor through", ["It absorbs water", "It is magnetic", "It heats the rain"]],
    ["Why are ceramic tiles hard but crack when dropped?", "Strong ionic or network bonds, but layers can't slide", ["They are metals", "They have weak London forces only", "They are polymers"]],
    ["Why is silicon used in computer chips?", "As a metalloid it conducts a little, and that can be controlled", ["It is the best conductor", "It is an insulator that never conducts", "It is a liquid"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `mat-${i}`,
    prompt,
    ans: label(right, wrong),
    hint: "Designed materials work because of their particles: free electrons, long chains, networks, or lots of small forces added up.",
    explain: `${right}.`,
  });
}

/** HS-PS2-6 — Do it: sort materials by the structure that makes them work. */
export function sortMaterials(): Question {
  const bins = ["Metallic bonding", "Polymer chains", "Covalent network"];
  const pool: [string, number][] = [
    ["🔌 Copper wire", 0], ["🥫 Aluminum foil", 0], ["📱 Gold phone contacts", 0], ["🔩 Steel bolts", 0], ["🔧 Solder", 0],
    ["🪢 Nylon rope", 1], ["🦺 Kevlar vest", 1], ["🛍️ Plastic bag", 1], ["➰ Rubber band", 1], ["🍳 Nonstick (PTFE) coating", 1], ["🧷 Diaper gel", 1],
    ["💎 Diamond saw blade", 2], ["🔮 Quartz crystal", 2], ["💻 Silicon chip", 2], ["✏️ Pencil graphite", 2], ["🪚 Silicon carbide sandpaper", 2],
  ];
  const items = [0, 1, 2].flatMap((b) => pickN(pool.filter(([, x]) => x === b), 2)).map(([label2, bin]) => ({ label: label2, bin }));
  const extra = pick(pool.filter(([l]) => !items.some((i) => i.label === l)));
  const all = shuffle([...items, { label: extra[0], bin: extra[1] }]);
  return q({
    key: `sortmat-${all.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort the materials by the structure that makes them useful.",
    ans: act({ kind: "sort", bins, items: all }, all.length),
    hint: "Metals: free electrons (conduct, bend). Plastics, fibers, rubber: long chains. Diamond, quartz, silicon, graphite: giant networks of covalent bonds.",
    explain: all.map((i) => `${i.label.replace(/^\S+\s/, "")}: ${bins[i.bin].toLowerCase()}`).join(", ") + ".",
  });
}

/* ===================================================== 5. Energy in reactions */

const EXO_PROCESSES = ["🔥 Burning methane", "🧤 Hand warmer (iron rusting)", "🏃 Respiration in your cells", "🧪 Acid neutralizing a base", "❄️ Water freezing", "🌧️ Steam condensing", "💥 Fireworks exploding", "🕯️ A candle burning"];
const ENDO_PROCESSES = ["🧊 Cold pack (NH₄NO₃ dissolving)", "🌱 Photosynthesis", "🧊 Ice melting", "💦 Sweat evaporating", "🥤 Baking soda + vinegar (gets cold)", "🍳 Cooking an egg", "🪨 Heating limestone to make lime", "💧 Water boiling"];

/** HS-PS1-4 — exothermic or endothermic? */
export function exoEndo(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const t1 = rand(18, 24);
    const up = rand(0, 1) === 0;
    const d = rand(3, 15);
    const t2 = up ? t1 + d : t1 - d;
    const right = up ? "Exothermic" : "Endothermic";
    return q({
      key: `exo-temp-${t1}-${t2}`,
      prompt: `Two solutions are mixed in a beaker. The temperature goes from ${t1} °C to ${t2} °C. Is the reaction exothermic or endothermic?`,
      visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 100, thermometer: t1, label: "Before" }, { glass: "beaker", volume: 100, thermometer: t2, colour: "lime", label: "After" }] },
      ans: labelInOrder(["Exothermic", "Endothermic"], right),
      hint: "Exothermic reactions release energy to the surroundings (they warm up). Endothermic ones absorb it (they cool down).",
      explain: up ? `It warmed by ${d} °C: energy was released to the water, so it's exothermic.` : `It cooled by ${d} °C: the reaction took energy from the water, so it's endothermic.`,
    });
  }
  if (kind === 1) {
    const exo = rand(0, 1) === 0;
    const item = pick(exo ? EXO_PROCESSES : ENDO_PROCESSES);
    return q({
      key: `exo-ex-${item}`,
      prompt: `${item.replace(/^\S+\s/, "")}: exothermic or endothermic?`,
      ans: labelInOrder(["Exothermic", "Endothermic"], exo ? "Exothermic" : "Endothermic"),
      hint: "Does it give out heat (feels warm, exothermic) or take heat in (needs heating or feels cold, endothermic)?",
      explain: exo ? "Exothermic: it releases energy to the surroundings." : "Endothermic: it absorbs energy from the surroundings.",
    });
  }
  if (kind === 2) {
    const dH = pick([-890, -572, -394, -92, -286, 178, 2803, 52, 181, 90]);
    const exo = dH < 0;
    return q({
      key: `exo-dh-${dH}`,
      prompt: `A reaction has ΔH = ${sgn(dH)} kJ. Which is true?`,
      ans: label(exo ? "It releases energy (exothermic)" : "It absorbs energy (endothermic)", [exo ? "It absorbs energy (endothermic)" : "It releases energy (exothermic)", "No energy changes", "The products have more energy than the reactants and it's exothermic"]),
      hint: "ΔH = energy of products − energy of reactants. Negative means energy left the system.",
      explain: exo ? `ΔH is negative: the products have ${-dH} kJ less energy, released as heat.` : `ΔH is positive: the products have ${dH} kJ more energy, absorbed from the surroundings.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["A cold pack feels cold in your hand. Where does the energy go?", "From your hand into the pack", ["From the pack into your hand", "Cold flows into your hand", "Nowhere; energy is destroyed"]],
    ["A hand warmer feels warm. Where does the energy come from?", "Chemical energy stored in bonds", ["Your hand", "The air outside", "It is created by the reaction"]],
    ["In an exothermic reaction, the products have…", "less energy than the reactants", ["more energy than the reactants", "the same energy as the reactants", "no energy at all"]],
    ["Total energy in a reaction (system + surroundings) is…", "conserved", ["always increasing", "always decreasing", "destroyed as heat"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `exo-fact-${i}`, prompt, ans: label(right, wrong), hint: "Energy is never created or destroyed; it moves between the chemicals and their surroundings.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-4 — reading reaction energy diagrams. */
export function energyDiagrams(): Question {
  const kind = rand(0, 3);
  const R = rand(2, 12) * 10;
  let P = rand(1, 14) * 10;
  while (P === R) P = rand(1, 14) * 10;
  const peak = Math.max(R, P) + rand(3, 10) * 10;
  const dH = P - R;
  const base: ChemistryVisual = { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, labels: { reactants: `Reactants ${R} kJ`, products: `Products ${P} kJ` } };
  if (kind === 0) {
    return q({
      key: `ed-dh-${R}-${P}-${peak}`,
      prompt: "What is ΔH for this reaction?",
      visual: { ...base, labels: { reactants: `Reactants ${R} kJ`, products: `Products ${P} kJ`, dH: "?", ea: null } } as ChemistryVisual,
      needsVisual: true,
      ans: signed(dH),
      unit: "kJ",
      hint: "ΔH = products − reactants. It's negative if the products sit lower.",
      explain: `${P} − ${R} = ${ns(dH)} kJ: ${dH < 0 ? "exothermic" : "endothermic"}.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `ed-ea-${R}-${P}-${peak}`,
      prompt: `The top of the hump is at ${peak} kJ. What is the activation energy (Ea)?`,
      visual: { ...base, labels: { reactants: `Reactants ${R} kJ`, products: `Products ${P} kJ`, ea: "?", dH: null } } as ChemistryVisual,
      needsVisual: true,
      ans: keypad(peak - R, [peak - P, peak, Math.abs(dH)]),
      unit: "kJ",
      hint: "Ea is measured from the REACTANTS up to the top of the hump.",
      explain: `${peak} − ${R} = ${peak - R} kJ.`,
    });
  }
  if (kind === 2) {
    return q({
      key: `ed-rev-${R}-${P}-${peak}`,
      prompt: `The hump's top is at ${peak} kJ. What is the activation energy of the REVERSE reaction (products → reactants)?`,
      visual: { ...base, showEa: false, showDH: false } as ChemistryVisual,
      needsVisual: true,
      ans: keypad(peak - P, [peak - R, peak, Math.abs(dH)]),
      unit: "kJ",
      hint: "Going backwards, you start at the products and climb the same hump.",
      explain: `${peak} − ${P} = ${peak - P} kJ.`,
    });
  }
  return q({
    key: `ed-type-${R}-${P}-${peak}`,
    prompt: "Is this reaction exothermic or endothermic?",
    visual: { ...base, labels: { reactants: "Reactants", products: "Products" }, showEa: false } as ChemistryVisual,
    needsVisual: true,
    ans: labelInOrder(["Exothermic", "Endothermic"], dH < 0 ? "Exothermic" : "Endothermic"),
    hint: "Compare where the products end up with where the reactants started.",
    explain: dH < 0 ? "The products are lower: energy was released, so it's exothermic." : "The products are higher: energy was absorbed, so it's endothermic.",
  });
}

/** HS-PS1-4 — Do it: sort processes into exothermic and endothermic. */
export function sortExoEndo(): Question {
  const exo = pickN(EXO_PROCESSES, rand(3, 4));
  const endo = pickN(ENDO_PROCESSES, rand(3, 4));
  const items = shuffle([...exo.map((l) => ({ label: l, bin: 0 })), ...endo.map((l) => ({ label: l, bin: 1 }))]);
  return q({
    key: `sortexo-${items.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort each change: does it release energy or absorb it?",
    ans: act({ kind: "sort", bins: ["Exothermic (releases)", "Endothermic (absorbs)"], items }, items.length),
    hint: "Burning, freezing and condensing release energy. Melting, boiling, evaporating and photosynthesis absorb it.",
    explain: `Exothermic: ${exo.map((l) => lc1(l.replace(/^\S+\s/, ""))).join(", ")}. Endothermic: ${endo.map((l) => lc1(l.replace(/^\S+\s/, ""))).join(", ")}.`,
  });
}

/** Average bond enthalpies (kJ/mol). */
const BE: Record<string, number> = {
  "H–H": 436, "Cl–Cl": 243, "H–Cl": 432, "F–F": 158, "H–F": 568, "Br–Br": 193, "H–Br": 366, "I–I": 151, "H–I": 299,
  "O=O": 498, "O–H": 463, "C–H": 413, "C=O": 799, "N≡N": 945, "N–H": 391, "C=C": 614, "C–C": 348, "C–Cl": 339,
};
interface BondRxn { eq: string; broken: [number, string][]; formed: [number, string][] }
const BOND_RXNS: BondRxn[] = [
  { eq: "H₂ + Cl₂ → 2HCl", broken: [[1, "H–H"], [1, "Cl–Cl"]], formed: [[2, "H–Cl"]] },
  { eq: "H₂ + F₂ → 2HF", broken: [[1, "H–H"], [1, "F–F"]], formed: [[2, "H–F"]] },
  { eq: "H₂ + Br₂ → 2HBr", broken: [[1, "H–H"], [1, "Br–Br"]], formed: [[2, "H–Br"]] },
  { eq: "H₂ + I₂ → 2HI", broken: [[1, "H–H"], [1, "I–I"]], formed: [[2, "H–I"]] },
  { eq: "2H₂ + O₂ → 2H₂O", broken: [[2, "H–H"], [1, "O=O"]], formed: [[4, "O–H"]] },
  { eq: "CH₄ + 2O₂ → CO₂ + 2H₂O", broken: [[4, "C–H"], [2, "O=O"]], formed: [[2, "C=O"], [4, "O–H"]] },
  { eq: "N₂ + 3H₂ → 2NH₃", broken: [[1, "N≡N"], [3, "H–H"]], formed: [[6, "N–H"]] },
  { eq: "C₂H₄ + H₂ → C₂H₆", broken: [[1, "C=C"], [4, "C–H"], [1, "H–H"]], formed: [[1, "C–C"], [6, "C–H"]] },
  { eq: "CH₄ + Cl₂ → CH₃Cl + HCl", broken: [[4, "C–H"], [1, "Cl–Cl"]], formed: [[3, "C–H"], [1, "C–Cl"], [1, "H–Cl"]] },
  { eq: "2HCl → H₂ + Cl₂", broken: [[2, "H–Cl"]], formed: [[1, "H–H"], [1, "Cl–Cl"]] },
  { eq: "2H₂O → 2H₂ + O₂", broken: [[4, "O–H"]], formed: [[2, "H–H"], [1, "O=O"]] },
  { eq: "2NH₃ → N₂ + 3H₂", broken: [[6, "N–H"]], formed: [[1, "N≡N"], [3, "H–H"]] },
  { eq: "2HBr → H₂ + Br₂", broken: [[2, "H–Br"]], formed: [[1, "H–H"], [1, "Br–Br"]] },
];
const sumBE = (list: [number, string][]) => list.reduce((t, [n, b]) => t + n * BE[b], 0);
const dHof = (r: BondRxn) => sumBE(r.broken) - sumBE(r.formed);
const bondTable = (r: BondRxn): Visual => {
  const bonds = [...new Set([...r.broken, ...r.formed].map(([, b]) => b))];
  return { kind: "table", header: ["Bond", "kJ/mol"], rows: bonds.map((b) => [b, BE[b]]) };
};
const bondList = (list: [number, string][]) => list.map(([n, b]) => `${n} ${b}`).join(" + ");

/** HS-PS1-4 — breaking bonds absorbs energy, making bonds releases it. */
export function bondsBreakMake(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const r = pick(BOND_RXNS);
    const right = r.broken.map(([, b]) => b).join(" and ");
    const wrong = [r.formed.map(([, b]) => b).join(" and "), [...r.broken, ...r.formed].map(([, b]) => b).join(" and ")].filter((w) => w !== right);
    return q({
      key: `bbm-which-${r.eq}`,
      prompt: `In ${r.eq}, which bonds must BREAK?`,
      visual: rxn(r.eq),
      ans: label(right, [...wrong, "No bonds break; atoms just join"]),
      hint: "The bonds holding the REACTANT molecules together have to break first.",
      explain: `Break ${bondList(r.broken)}; then form ${bondList(r.formed)}.`,
    });
  }
  if (kind === 1) {
    const b = pick(Object.keys(BE));
    const makeIt = rand(0, 1) === 0;
    return q({
      key: `bbm-num-${b}-${makeIt ? "m" : "b"}`,
      prompt: `It takes ${BE[b]} kJ to break 1 mol of ${b} bonds. How much energy is ${makeIt ? "RELEASED when 1 mol of these bonds forms" : "needed to break 2 mol of them"}?`,
      ans: keypad(makeIt ? BE[b] : 2 * BE[b], makeIt ? [0, BE[b] / 2, 2 * BE[b]] : [BE[b], BE[b] / 2]),
      unit: "kJ",
      hint: makeIt ? "Making a bond is breaking it in reverse: the same amount of energy, going the other way." : "Twice as many bonds, twice the energy.",
      explain: makeIt ? `${BE[b]} kJ is released (the same as it takes to break it).` : `2 × ${BE[b]} = ${2 * BE[b]} kJ.`,
    });
  }
  if (kind === 2) {
    const r = pick(BOND_RXNS);
    const dH = dHof(r);
    const exo = dH < 0;
    return q({
      key: `bbm-net-${r.eq}`,
      prompt: `Breaking the bonds in ${r.eq} takes ${sumBE(r.broken)} kJ. Forming the new bonds releases ${sumBE(r.formed)} kJ. Overall, is it exothermic or endothermic?`,
      ans: labelInOrder(["Exothermic", "Endothermic"], exo ? "Exothermic" : "Endothermic"),
      hint: "If more energy comes out (forming) than goes in (breaking), the reaction gives out heat.",
      explain: `${sumBE(r.broken)} − ${sumBE(r.formed)} = ${ns(dH)} kJ: ${exo ? "more released than absorbed, so exothermic" : "more absorbed than released, so endothermic"}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Breaking a chemical bond…", "always absorbs energy", ["always releases energy", "needs no energy", "destroys energy"]],
    ["Making a chemical bond…", "always releases energy", ["always absorbs energy", "needs no energy", "creates energy"]],
    ["A reaction is exothermic when…", "the bonds formed are stronger than the bonds broken", ["the bonds broken are stronger than the bonds formed", "no bonds break", "the products are gases"]],
    ["Why does a match need a strike to start burning?", "Some bonds must break first (activation energy)", ["Burning absorbs energy overall", "Oxygen must be created", "The wood needs to melt"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `bbm-fact-${i}`, prompt, ans: label(right, wrong), hint: "Bond breaking costs energy; bond making pays energy back.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-4 — Do it: sort bonds into broken and formed. */
export function sortBondsBroken(): Question {
  const r = pick(BOND_RXNS);
  const items = shuffle([...r.broken.map(([n, b]) => ({ label: `${n} ${b}`, bin: 0 })), ...r.formed.map(([n, b]) => ({ label: `${n} ${b}`, bin: 1 }))]);
  if (items.length < 3) return sortBondsBroken();
  return q({
    key: `sortbb-${r.eq}`,
    prompt: `For ${r.eq}, sort the bonds: broken or formed?`,
    visual: rxn(r.eq),
    ans: act({ kind: "sort", bins: ["Broken (absorbs energy)", "Formed (releases energy)"], items }, items.length),
    hint: "Draw each molecule. Bonds in the reactants break; bonds in the products form.",
    explain: `Broken: ${bondList(r.broken)}. Formed: ${bondList(r.formed)}.`,
  });
}

/** HS-PS1-4 — ΔH from bond enthalpies. */
export function bondEnthalpy(): Question {
  const kind = rand(0, 2);
  const r = pick(BOND_RXNS);
  const brk = sumBE(r.broken);
  const frm = sumBE(r.formed);
  const dH = brk - frm;
  if (kind === 0) {
    return q({
      key: `be-dh-${r.eq}`,
      prompt: `Use the bond enthalpies to find ΔH for ${r.eq}.`,
      visual: bondTable(r),
      needsVisual: true,
      ans: signed(dH),
      unit: "kJ",
      hint: `ΔH = bonds broken − bonds formed. Broken: ${bondList(r.broken)}. Formed: ${bondList(r.formed)}.`,
      explain: `${brk} − ${frm} = ${ns(dH)} kJ.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `be-brk-${r.eq}`,
      prompt: `How much energy is needed to break all the bonds in the reactants of ${r.eq}?`,
      visual: bondTable(r),
      needsVisual: true,
      ans: keypad(brk, [frm, Math.abs(dH)]),
      unit: "kJ",
      hint: `Bonds broken: ${bondList(r.broken)}. Multiply each by its enthalpy, then add.`,
      explain: `${r.broken.map(([n, b]) => `${n} × ${BE[b]}`).join(" + ")} = ${brk} kJ.`,
    });
  }
  return q({
    key: `be-frm-${r.eq}`,
    prompt: `How much energy is released when the product bonds of ${r.eq} form?`,
    visual: bondTable(r),
    needsVisual: true,
    ans: keypad(frm, [brk, Math.abs(dH)]),
    unit: "kJ",
    hint: `Bonds formed: ${bondList(r.formed)}.`,
    explain: `${r.formed.map(([n, b]) => `${n} × ${BE[b]}`).join(" + ")} = ${frm} kJ.`,
  });
}

/** HS-PS1-4 — Do it: calculate ΔH and place it on a number line. */
export function placeEnthalpy(): Question {
  const r = pick(BOND_RXNS);
  const dH = dHof(r);
  const five = dH % 5 === 0 && dH % 10 !== 0;
  const step = five ? 5 : 10;
  const target = five ? dH : Math.round(dH / 10) * 10;
  const [min, max] = dH < 0 ? (five ? [-400, 100] : [-900, 100]) : five ? [-100, 400] : [-100, 600];
  return q({
    key: `placedh-${r.eq}`,
    prompt: `Find ΔH for ${r.eq} from the bond enthalpies, then drag the marker to it${five ? "" : " (to the nearest 10 kJ)"}.`,
    visual: bondTable(r),
    ans: act({ kind: "placeOnLine", min, max, step, labelStep: 100, target }, target),
    hint: `ΔH = broken − formed = (${bondList(r.broken)}) − (${bondList(r.formed)}).`,
    explain: `${sumBE(r.broken)} − ${sumBE(r.formed)} = ${ns(dH)} kJ${five || dH === target ? "" : `, about ${ns(target)} kJ`}.`,
  });
}

/** HS-PS1-4, HS-PS1-5 — activation energy and catalysts on energy diagrams. */
export function activationCatalyst(): Question {
  const kind = rand(0, 3);
  const R = rand(3, 10) * 10;
  let P = R + rand(-5, 4) * 10;
  while (P === R || P < 10) P = R + rand(-5, 4) * 10;
  const hi = Math.max(R, P);
  const cat = hi + rand(2, 5) * 10;
  const peak = cat + rand(3, 6) * 10;
  const v = (labels: Record<string, string | null>): ChemistryVisual => ({ kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, catalyst: cat, labels: { reactants: `Reactants ${R} kJ`, products: `Products ${P} kJ`, ...labels } } as ChemistryVisual);
  if (kind === 0) {
    return q({
      key: `cat-ea-${R}-${P}-${cat}-${peak}`,
      prompt: `Without a catalyst the hump peaks at ${peak} kJ; with one (dashed) it peaks at ${cat} kJ. What is Ea WITH the catalyst?`,
      visual: v({ ea: null, dH: null }),
      needsVisual: true,
      ans: keypad(cat - R, [peak - R, peak - cat, cat]),
      unit: "kJ",
      hint: "Ea is from the reactants to the top of the path the reaction takes.",
      explain: `${cat} − ${R} = ${cat - R} kJ (instead of ${peak - R} kJ).`,
    });
  }
  if (kind === 1) {
    return q({
      key: `cat-lower-${R}-${P}-${cat}-${peak}`,
      prompt: `The uncatalysed peak is ${peak} kJ and the catalysed peak is ${cat} kJ. By how much does the catalyst lower the activation energy?`,
      visual: v({ ea: null, dH: null }),
      ans: keypad(peak - cat, [cat - R, peak - R]),
      unit: "kJ",
      hint: "Both start from the same reactants, so just compare the two peaks.",
      explain: `${peak} − ${cat} = ${peak - cat} kJ lower.`,
    });
  }
  if (kind === 2) {
    return q({
      key: `cat-dh-${R}-${P}-${cat}-${peak}`,
      prompt: "What does the catalyst do to ΔH?",
      visual: v({ ea: null }),
      ans: label("Nothing: ΔH stays the same", ["Makes ΔH more negative", "Makes ΔH more positive", "Makes ΔH zero"]),
      hint: "Look at the start and end levels of both paths.",
      explain: `Both paths start at ${R} kJ and end at ${P} kJ, so ΔH = ${ns(P - R)} kJ either way. Only the hump changes.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["How does a catalyst speed up a reaction?", "It gives a pathway with lower activation energy", ["It gives particles more energy", "It changes ΔH", "It adds more reactant"]],
    ["What happens to a catalyst during a reaction?", "It is not used up", ["It is used up like a reactant", "It becomes a product", "It always explodes"]],
    ["Enzymes in your body are…", "biological catalysts", ["fuels", "products of combustion", "types of fat"]],
    ["Why does a catalytic converter help cars?", "It speeds up turning toxic gases into safer ones", ["It burns more fuel", "It removes all CO₂", "It makes the engine hotter"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `cat-fact-${i}`, prompt, ans: label(right, wrong), hint: "A catalyst lowers the hump, not the start or end levels.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

const THERMO: { eq: string; dH: number; per: string; coef: number }[] = [
  { eq: "CH₄ + 2O₂ → CO₂ + 2H₂O", dH: -890, per: "CH₄", coef: 1 },
  { eq: "2H₂ + O₂ → 2H₂O", dH: -572, per: "H₂", coef: 2 },
  { eq: "C + O₂ → CO₂", dH: -394, per: "C", coef: 1 },
  { eq: "N₂ + 3H₂ → 2NH₃", dH: -92, per: "NH₃", coef: 2 },
  { eq: "CaCO₃ → CaO + CO₂", dH: 178, per: "CaCO₃", coef: 1 },
  { eq: "2C₂H₆ + 7O₂ → 4CO₂ + 6H₂O", dH: -3120, per: "C₂H₆", coef: 2 },
  { eq: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", dH: 2803, per: "C₆H₁₂O₆", coef: 1 },
  { eq: "N₂ + O₂ → 2NO", dH: 181, per: "NO", coef: 2 },
];

/** HS-PS1-4 — thermochemical equations: scaling and reversing ΔH. */
export function thermoEquations(): Question {
  const kind = rand(0, 2);
  const t = pick(THERMO);
  if (kind === 0) {
    const n = pick([1, 2, 3, 4, 5, 6, 10].map((x) => x * (t.coef === 2 && Math.abs(t.dH) % 4 !== 0 ? 2 : 1)));
    const e = (Math.abs(t.dH) * n) / t.coef;
    return q({
      key: `th-scale-${t.per}-${n}`,
      prompt: `How much energy is ${t.dH < 0 ? "released" : "absorbed"} when ${n} mol of ${t.per} ${t.per === "NH₃" || t.per === "NO" || t.per === "C₆H₁₂O₆" ? "is made" : "reacts"}?`,
      visual: rxn(t.eq, { dH: t.dH }),
      ans: keypad(e, [Math.abs(t.dH) * n, Math.abs(t.dH), e / 2]),
      unit: "kJ",
      hint: `The ΔH is for the equation as written, which has ${t.coef} mol of ${t.per}. Scale it.`,
      explain: `${Math.abs(t.dH)} kJ per ${t.coef} mol, so ${n} mol → ${Math.abs(t.dH)} × ${n}/${t.coef} = ${e} kJ.`,
    });
  }
  if (kind === 1) {
    const { r, p } = eqTerms(t.eq);
    const rev = `${p.map(([c, f]) => `${c === 1 ? "" : c}${f}`).join(" + ")} → ${r.map(([c, f]) => `${c === 1 ? "" : c}${f}`).join(" + ")}`;
    return q({
      key: `th-rev-${t.per}`,
      prompt: `${t.eq} has ΔH = ${sgn(t.dH)} kJ. What is ΔH for the reverse reaction, ${rev}?`,
      ans: signed(-t.dH),
      unit: "kJ",
      hint: "Running a reaction backwards swaps reactants and products, so ΔH flips sign.",
      explain: `ΔH = ${sgn(-t.dH)} kJ: same size, opposite sign.`,
    });
  }
  const k = pick([2, 3]);
  return q({
    key: `th-mult-${t.per}-${k}`,
    prompt: `${t.eq} has ΔH = ${sgn(t.dH)} kJ. What is ΔH if every coefficient is multiplied by ${k}?`,
    ans: signed(t.dH * k),
    unit: "kJ",
    hint: "ΔH is an amount of energy: twice the chemicals, twice the energy.",
    explain: `${sgn(t.dH)} × ${k} = ${sgn(t.dH * k)} kJ.`,
  });
}

/** HS-PS1-4 — calorimetry: measuring reaction energy with water. */
export function calorimetry(): Question {
  const kind = rand(0, 2);
  const m = pick([50, 100, 150, 200, 250]);
  const t1 = rand(18, 24);
  const d = rand(2, 15);
  const up = rand(0, 3) > 0;
  const t2 = up ? t1 + d : t1 - d;
  const qJ = Math.round(m * 4.18 * d);
  const pic: Visual = { kind: "chem-beaker", panels: [{ glass: "beaker", volume: m, max: 250, thermometer: t1, label: "Before" }, { glass: "beaker", volume: m, max: 250, thermometer: t2, colour: "lime", label: "After" }] };
  if (kind === 0) {
    return q({
      key: `cal-q-${m}-${t1}-${t2}`,
      prompt: `A reaction in ${m} g of water changes its temperature from ${t1} °C to ${t2} °C. How much heat did the water ${up ? "gain" : "lose"}? (q = mcΔT, c = 4.18 J/(g·°C))`,
      visual: pic,
      ans: keypad(qJ),
      unit: "J",
      hint: `ΔT = ${Math.max(t1, t2)} − ${Math.min(t1, t2)} = ${d} °C. Then q = ${m} × 4.18 × ${d}.`,
      explain: `q = ${m} × 4.18 × ${d} = ${qJ} J. ${up ? "The reaction released it (exothermic)." : "The reaction absorbed it (endothermic)."}`,
    });
  }
  if (kind === 1) {
    return q({
      key: `cal-kj-${m}-${d}`,
      prompt: `${m} g of water warms by ${d} °C. How many kJ of heat is that? (c = 4.18 J/(g·°C))`,
      ans: keypad(qJ / 1000),
      unit: "kJ",
      hint: "Find q in joules with q = mcΔT, then divide by 1000.",
      explain: `${m} × 4.18 × ${d} = ${qJ} J = ${qJ / 1000} kJ.`,
    });
  }
  return q({
    key: `cal-dt-${m}-${d}`,
    prompt: `A reaction releases ${qJ} J into ${m} g of water. By how many °C does the water warm? (c = 4.18 J/(g·°C))`,
    ans: keypad(d),
    unit: "°C",
    hint: "Rearrange q = mcΔT: ΔT = q ÷ (m × c).",
    explain: `${qJ} ÷ (${m} × 4.18) = ${d} °C.`,
  });
}

/* ===================================================== 6. Reaction rates */

/** HS-PS1-5 — collision theory. */
export function collisions(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const a = rand(2, 6);
    const b = rand(2, 6);
    return q({
      key: `col-pairs-${a}-${b}`,
      prompt: "Every red particle can collide with every blue one. How many different red–blue pairs are there?",
      visual: { kind: "chem-particles", panels: [{ species: [{ name: "A (red)", colour: "berry", count: a }, { name: "B (blue)", colour: "wave", count: b }], motion: 2 }] },
      needsVisual: true,
      ans: keypad(a * b, [a + b, a * b + a]),
      hint: "Each of the red particles can pair with each of the blue ones: multiply.",
      explain: `${a} × ${b} = ${a * b} possible pairs. Add more of either particle and the number of collisions goes up.`,
    });
  }
  if (kind === 1) {
    let a1 = 0, b1 = 0, a2 = 0, b2 = 0;
    do [a1, b1, a2, b2] = [rand(2, 6), rand(2, 6), rand(2, 6), rand(2, 6)];
    while (a1 * b1 === a2 * b2);
    const right = a1 * b1 > a2 * b2 ? "Box 1" : "Box 2";
    return q({
      key: `col-box-${a1}${b1}${a2}${b2}`,
      prompt: "Same temperature in both boxes. Which box will react faster?",
      visual: {
        kind: "chem-particles",
        panels: [
          { species: [{ name: "A", colour: "berry", count: a1 }, { name: "B", colour: "wave", count: b1 }], label: "Box 1", motion: 2 },
          { species: [{ name: "A", colour: "berry", count: a2 }, { name: "B", colour: "wave", count: b2 }], label: "Box 2", motion: 2 },
        ],
        joiner: "vs",
      },
      needsVisual: true,
      ans: labelInOrder(["Box 1", "Box 2"], right),
      hint: "More possible A–B pairs means more collisions each second. Multiply the counts in each box.",
      explain: `Box 1: ${a1} × ${b1} = ${a1 * b1} pairs. Box 2: ${a2} × ${b2} = ${a2 * b2}. ${right} has more collisions.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["For particles to react, they must…", "collide with enough energy and the right orientation", ["just be in the same container", "be the same size", "move slowly"]],
    ["Why don't ALL collisions cause a reaction?", "Many have less energy than Ea, or hit the wrong way round", ["Particles never really touch", "Only solids react", "Collisions destroy energy"]],
    ["What is activation energy?", "The minimum energy a collision needs to react", ["The energy released by a reaction", "The energy of the products", "The speed of the particles"]],
    ["A collision that has enough energy AND the right orientation is called…", "an effective (successful) collision", ["an elastic collision", "a bond", "an equilibrium"]],
    ["The rate of a reaction depends mostly on…", "how many effective collisions happen each second", ["the size of the container only", "the color of the reactants", "the amount of product already made"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `col-fact-${i}`, prompt, ans: label(right, wrong), hint: "Rate = how often particles collide × the fraction of collisions that succeed.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-5 — temperature and rate. */
export function temperatureRate(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const hot = rand(0, 1);
    const n = rand(4, 7);
    return q({
      key: `temp-pic-${hot}-${n}`,
      prompt: "The boxes hold the same particles. The motion lines show how fast they move. Which box reacts faster?",
      visual: {
        kind: "chem-particles",
        panels: [0, 1].map((i) => ({ species: [{ name: "A", colour: "berry" as const, count: n }, { name: "B", colour: "wave" as const, count: n }], label: `Box ${i + 1}`, motion: (i === hot ? 3 : 1) as 1 | 3 })),
        joiner: "vs",
      },
      needsVisual: true,
      ans: labelInOrder(["Box 1", "Box 2"], `Box ${hot + 1}`),
      hint: "Faster particles mean a higher temperature.",
      explain: `Box ${hot + 1} is hotter: its particles collide more often and harder, so more collisions beat Ea.`,
    });
  }
  if (kind === 1) {
    const t = pick([40, 80, 120, 160, 240, 320]);
    const T1 = pick([15, 20, 25, 30]);
    const k = rand(1, 3);
    return q({
      key: `temp-time-${t}-${T1}-${k}`,
      prompt: `A reaction takes ${t} s at ${T1} °C. Rule of thumb: its rate roughly doubles for every 10 °C rise. About how long will it take at ${T1 + 10 * k} °C?`,
      ans: keypad(t / 2 ** k, [t * 2 ** k, t / 2, t - 10 * k]),
      unit: "s",
      hint: `${10 * k} °C warmer is ${k} doubling${k === 1 ? "" : "s"} of the rate. Double the rate, half the time.`,
      explain: `${t} ÷ ${2 ** k} = ${t / 2 ** k} s.`,
    });
  }
  if (kind === 2) {
    const k = rand(1, 4);
    return q({
      key: `temp-times-${k}`,
      prompt: `If the rate doubles for every 10 °C rise, how many times faster is the reaction ${10 * k} °C warmer?`,
      ans: choose(2 ** k, [2 * k, k, 2 ** (k + 1)]),
      hint: "Double, then double again… once for each 10 °C.",
      explain: `${Array(k).fill(2).join(" × ")} = ${2 ** k} times faster.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why does heating speed up a reaction?", "Particles collide more often, and many more collisions have energy above Ea", ["Heat lowers the activation energy", "Heat makes more particles", "Heat makes particles bigger"]],
    ["Why does food last longer in a fridge?", "Spoiling reactions slow down at low temperature", ["Cold kills all bacteria instantly", "The fridge removes oxygen", "Food can't react in the dark"]],
    ["A glow stick is put in hot water. What happens?", "It glows brighter but runs out sooner", ["It glows dimmer for longer", "Nothing changes", "It stops glowing"]],
    ["Why does a pressure cooker cook food faster?", "Water boils at a higher temperature, so reactions go faster", ["It adds a catalyst", "It removes the food's water", "It lowers the temperature"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `temp-fact-${i}`, prompt, ans: label(right, wrong), hint: "Hotter particles move faster: more collisions, and harder ones.", explain: `${right}.` });
}

/** HS-PS1-5 — concentration and surface area. */
export function concentrationSurface(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const L = rand(2, 5);
    const ask = rand(0, 2);
    const whole = 6 * L * L;
    const cut = 6 * L * L * L;
    const prompts = [
      `A cube of marble is ${L} cm on each side. What is its total surface area?`,
      `A ${L} cm marble cube is cut into 1 cm cubes. What is their TOTAL surface area?`,
      `A ${L} cm marble cube is cut into 1 cm cubes. How many times more surface does the acid touch now?`,
    ];
    const ans = [whole, cut, L][ask];
    return q({
      key: `cs-cube-${L}-${ask}`,
      prompt: prompts[ask],
      visual: { kind: "box", l: L, w: L, h: L, unit: "cm", cubes: ask > 0 },
      ans: keypad(ans, [whole, cut, L * L]),
      unit: ask < 2 ? "cm²" : undefined,
      hint: ask === 0 ? "6 faces, each L × L." : ask === 1 ? `There are ${L}³ = ${L ** 3} small cubes, each with 6 cm² of surface.` : `Compare ${cut} cm² with ${whole} cm².`,
      explain: ask === 0 ? `6 × ${L} × ${L} = ${whole} cm².` : ask === 1 ? `${L ** 3} × 6 = ${cut} cm², much more surface to collide with.` : `${cut} ÷ ${whole} = ${L} times more surface, so it reacts much faster.`,
    });
  }
  if (kind === 1) {
    const lo = rand(3, 6);
    const hi = lo * 2;
    const first = rand(0, 1) === 0;
    return q({
      key: `cs-conc-${lo}-${first ? 1 : 0}`,
      prompt: "The same zinc grain sits in two acids. Which reacts faster?",
      visual: {
        kind: "chem-particles",
        panels: [first ? hi : lo, first ? lo : hi].map((n, i) => ({ species: [{ formula: "H₃O⁺", count: n, name: "acid particles" }, { name: "zinc", colour: "night" as const, count: 1 }], label: `Beaker ${i + 1}`, container: "beaker" as const, arrangement: "liquid" as const })),
        joiner: "vs",
      },
      needsVisual: true,
      ans: labelInOrder(["Beaker 1", "Beaker 2"], first ? "Beaker 1" : "Beaker 2"),
      hint: "More acid particles in the same space (higher concentration) hit the zinc more often.",
      explain: `Beaker ${first ? 1 : 2} is twice as concentrated (${hi} vs ${lo} particles): about twice as many collisions with the zinc each second.`,
    });
  }
  if (kind === 2) {
    const forms = ["one big lump", "a few small chips", "a fine powder"];
    const askFast = rand(0, 1) === 0;
    const what = pick(["marble (CaCO₃) in acid", "sugar in water", "magnesium in acid", "zinc in acid"]);
    return q({
      key: `cs-form-${what}-${askFast ? "f" : "s"}`,
      prompt: `Same mass of ${what}. Which reacts ${askFast ? "fastest" : "slowest"}?`,
      ans: labelInOrder(forms, askFast ? forms[2] : forms[0]),
      hint: "Only particles on the surface can be hit. Smaller pieces expose more surface.",
      explain: askFast ? "The powder: it has by far the most surface area." : "The lump: most of its particles are hidden inside, away from collisions.",
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why can flour dust in the air explode, when a bag of flour only burns slowly?", "Tiny dust grains have a huge total surface area", ["Dust is a different chemical", "Air is a catalyst", "The bag stops oxygen"]],
    ["Why do people start a campfire with small twigs, not big logs?", "Twigs have more surface area for oxygen to reach", ["Twigs contain more energy", "Logs have no carbon", "Twigs are always wetter"]],
    ["Doubling the concentration of an acid usually…", "about doubles the collision rate", ["halves the rate", "has no effect", "stops the reaction"]],
    ["Why does chewing food help digestion?", "It increases the surface area for enzymes", ["It adds acid", "It cools the food", "It removes water"]],
    ["For gases, raising the pressure speeds up a reaction because…", "the particles are squeezed closer, so they collide more", ["the particles get bigger", "it lowers Ea", "it removes the products"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `cs-fact-${i}`, prompt, ans: label(right, wrong), hint: "More particles in a space (concentration) or more exposed surface → more collisions per second.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-5 — catalysts. */
export function catalystsRate(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const g = pick([0.5, 1.0, 1.5, 2.0, 2.5, 3.0]);
    const v = rand(4, 9) * 10;
    return q({
      key: `catr-mass-${g}-${v}`,
      prompt: `${g.toFixed(1)} g of black MnO₂ is added to ${v} mL of hydrogen peroxide, which fizzes out oxygen fast. Afterwards the solid is filtered, dried and weighed. What is its mass?`,
      visual: { kind: "chem-beaker", panels: [{ glass: "flask", volume: v, colour: "clear", bubbles: 14, precipitate: "night", label: "2H₂O₂ → 2H₂O + O₂" }] },
      ans: keypad(g, [0, g / 2, g * 2]),
      unit: "g",
      hint: "A catalyst speeds a reaction up but is not used up.",
      explain: `Still ${g.toFixed(1)} g: MnO₂ is a catalyst, so it comes out unchanged.`,
    });
  }
  if (kind === 1) {
    const R = rand(2, 6) * 10;
    const P = R - rand(1, 2) * 10;
    const cat = R + rand(2, 4) * 10;
    const peak = cat + rand(3, 5) * 10;
    const askFrac = rand(0, 1) === 0;
    return q({
      key: `catr-ea-${R}-${P}-${cat}-${peak}-${askFrac ? 1 : 0}`,
      prompt: askFrac ? "Which path (solid or dashed) has more collisions with enough energy to react?" : `Ea drops from ${peak - R} kJ to ${cat - R} kJ with the catalyst. What does this do to the number of successful collisions?`,
      visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, catalyst: cat, labels: { ea: null, dH: null, reactants: "Reactants", products: "Products" } },
      needsVisual: askFrac,
      ans: askFrac ? labelInOrder(["Solid (no catalyst)", "Dashed (catalyst)", "The same"], "Dashed (catalyst)") : label("More collisions now have enough energy", ["Fewer collisions succeed", "No change: only temperature matters", "Collisions stop happening"]),
      hint: "A lower hump means a lower energy bar for each collision to clear.",
      explain: "With the catalyst the hump is lower, so a bigger fraction of collisions have at least Ea: the reaction is faster.",
    });
  }
  const facts: [string, string, string[]][] = [
    ["Enzymes like amylase in your saliva are…", "catalysts that speed up digestion", ["fuels for your muscles", "reactants used up by food", "the products of digestion"]],
    ["A catalytic converter speeds up which kind of change?", "Turning CO and NO into CO₂ and N₂", ["Turning CO₂ into fuel", "Burning more gasoline", "Making the engine hotter"]],
    ["Iron is used as a catalyst in the Haber process. It…", "helps reach equilibrium faster", ["makes more ammonia at equilibrium", "is used up in the reaction", "makes the reaction endothermic"]],
    ["Why are catalysts important to industry?", "Faster reactions at lower temperatures save energy", ["They are free", "They create more atoms", "They make products heavier"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `catr-fact-${i}`, prompt, ans: label(right, wrong), hint: "Catalysts provide an easier path; they are not used up.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

const growth = (vmax: number, tau: number) => (t: number) => (t <= 0 ? 0 : vmax * (1 - Math.exp(-t / tau)));

/** HS-PS1-5 — rate graphs (amount of product against time). */
export function rateGraphs(): Question {
  const kind = rand(0, 4);
  const vmax = pick([40, 60, 80, 100]);
  const tA = pick([8, 10, 12, 15]);
  const tB = pick([4, 5, 6, 25, 30].filter((t) => Math.abs(t - tA) >= 4));
  const axes = { x: [0, 100] as [number, number], y: [0, vmax + 20] as [number, number], xLabel: "time (s)", yLabel: "gas made (mL)" };
  if (kind === 0) {
    const fast = tA < tB ? "A" : "B";
    return q({
      key: `rg-fast-${vmax}-${tA}-${tB}`,
      prompt: "Gas made in two runs of the same reaction. Which run was faster?",
      visual: { kind: "plot", ...axes, curves: [{ fn: growth(vmax, tA), label: "A" }, { fn: growth(vmax, tB), label: "B" }] },
      needsVisual: true,
      ans: labelInOrder(["A", "B", "Same speed"], fast),
      hint: "The rate is the slope. The steeper curve at the start is faster.",
      explain: `${fast} rises more steeply. Both level off at ${vmax} mL because they used the same amount of reactant.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `rg-total-${vmax}-${tA}`,
      prompt: "How much gas was made in total?",
      visual: { kind: "plot", ...axes, curves: [{ fn: growth(vmax, tA) }] },
      needsVisual: true,
      ans: choose(vmax, [vmax - 10, vmax + 10, vmax / 2]),
      unit: "mL",
      hint: "When the reaction stops, the curve goes flat. Read the flat part.",
      explain: `It levels off at ${vmax} mL: one of the reactants has run out.`,
    });
  }
  if (kind === 2) {
    const less = rand(0, 1) === 0 ? "A" : "B";
    return q({
      key: `rg-less-${vmax}-${tA}-${less}`,
      prompt: "One run used half as much marble (with plenty of acid). Which curve is it?",
      visual: {
        kind: "plot",
        ...axes,
        curves: [{ fn: growth(less === "A" ? vmax / 2 : vmax, tA), label: "A" }, { fn: growth(less === "B" ? vmax / 2 : vmax, tA), label: "B" }],
      },
      needsVisual: true,
      ans: labelInOrder(["A", "B"], less),
      hint: "Half the limiting reactant makes half the product. Compare where each curve levels off.",
      explain: `${less} levels off at ${vmax / 2} mL, half of ${vmax} mL.`,
    });
  }
  if (kind === 3) {
    const t = rand(0, 1) === 0 ? "speed" : "slow";
    return q({
      key: `rg-when-${vmax}-${tA}-${t}`,
      prompt: t === "speed" ? "When is this reaction fastest?" : "Why does the curve get less steep as time goes on?",
      visual: { kind: "plot", ...axes, curves: [{ fn: growth(vmax, tA) }] },
      needsVisual: t === "speed",
      ans: t === "speed" ? labelInOrder(["At the start", "In the middle", "At the end", "The rate never changes"], "At the start") : label("Reactants are used up, so there are fewer collisions", ["The product is a catalyst", "The temperature rises", "The particles get bigger"]),
      hint: "Steepest slope = fastest rate. What is running out as the reaction goes?",
      explain: "At the start the reactants are most concentrated, so collisions are most frequent. As they're used up, the rate falls until it stops.",
    });
  }
  const fast = tA < tB ? "A" : "B";
  const slow = fast === "A" ? "B" : "A";
  return q({
    key: `rg-cause-${vmax}-${tA}-${tB}`,
    prompt: `Run ${slow} was at 20 °C with lumps of marble. Run ${fast} was faster but made the same total gas. What was changed?`,
    visual: { kind: "plot", ...axes, curves: [{ fn: growth(vmax, tA), label: "A" }, { fn: growth(vmax, tB), label: "B" }] },
    needsVisual: true,
    ans: label(pick(["The acid was warmed", "The marble was crushed to powder"]), ["Half as much marble was used", "The acid was diluted", "Bigger lumps were used"]),
    hint: "Same final volume → same amount of reactant. Faster → more effective collisions.",
    explain: "Warming or crushing speeds up collisions without changing how much marble there is, so the curve is steeper but levels off at the same height.",
  });
}

/** HS-PS1-5 — calculating average rates from data. */
export function rateCalc(): Question {
  const kind = rand(0, 2);
  const vmax = pick([60, 80, 100, 120]);
  const h = pick([10, 15, 20]);
  const times = [0, 10, 20, 30, 40, 60];
  const vols = times.map((t) => Math.round(vmax * (1 - 0.5 ** (t / h))));
  const table: Visual = { kind: "table", header: ["Time (s)", ...times.map(String)], rows: [["Gas (mL)", ...vols]] };
  if (kind === 0) {
    const i = rand(0, 3);
    const rate = (vols[i + 1] - vols[i]) / 10;
    return q({
      key: `rc-avg-${vmax}-${h}-${i}`,
      prompt: `What was the average rate between ${times[i]} s and ${times[i + 1]} s?`,
      visual: table,
      needsVisual: true,
      ans: keypad(rate),
      unit: "mL/s",
      hint: "Average rate = change in volume ÷ change in time.",
      explain: `(${vols[i + 1]} − ${vols[i]}) ÷ 10 = ${rate} mL/s.`,
    });
  }
  if (kind === 1) {
    const labels2 = ["0–10 s", "10–20 s", "20–30 s", "30–40 s"];
    return q({
      key: `rc-max-${vmax}-${h}`,
      prompt: "During which 10-second interval was the reaction fastest?",
      visual: table,
      needsVisual: true,
      ans: labelInOrder(labels2, labels2[0]),
      hint: "Find the biggest increase in gas volume in 10 seconds.",
      explain: `0–10 s: ${vols[1]} mL in 10 s. The rate falls as the reactants get used up.`,
    });
  }
  const rate = rd(vols[5] / 60, 1);
  return q({
    key: `rc-overall-${vmax}-${h}`,
    prompt: "What was the average rate over the first 60 s? (Round to 1 decimal place.)",
    visual: table,
    needsVisual: true,
    ans: keypad(rate),
    unit: "mL/s",
    hint: "Total volume at 60 s ÷ 60 s.",
    explain: `${vols[5]} ÷ 60 ≈ ${rate} mL/s.`,
  });
}

/** HS-PS1-5 — Do it: graph reaction data. */
export function rateBarGraph(): Question {
  if (rand(0, 1) === 0) {
    const [t0, step] = pick([[80, 10], [120, 15], [160, 10], [200, 25], [240, 30]] as [number, number][]);
    const T = pick([10, 20, 30]);
    const items = [0, 1, 2, 3].map((k) => ({ label: `${T + 10 * k} °C`, value: t0 / 2 ** k }));
    return q({
      key: `rbg-temp-${t0}-${T}`,
      prompt: "Make a bar graph of the time each run took to finish. What pattern do you see?",
      ans: act({ kind: "barGraph", title: "Time to react (s)", items, max: t0, step }, t0),
      hint: "Drag each bar to its time. Read the scale carefully.",
      explain: `${items.map((i) => `${i.label}: ${i.value} s`).join(", ")}. Each 10 °C rise halves the time: the rate doubles.`,
    });
  }
  const k = pick([8, 12, 16, 20, 24]);
  const items = [0.5, 1, 1.5, 2].map((c) => ({ label: `${c.toFixed(1)} M`, value: c * k }));
  return q({
    key: `rbg-conc-${k}`,
    prompt: "Make a bar graph of the gas made in the first 30 s for each acid concentration.",
    ans: act({ kind: "barGraph", title: "Gas in 30 s (mL)", items, max: 2.5 * k, step: k / 2 }, k),
    hint: "Drag each bar to its volume.",
    explain: `${items.map((i) => `${i.label}: ${i.value} mL`).join(", ")}. Doubling the concentration doubles the rate.`,
  });
}

const FASTER = ["🔥 Heat the mixture", "🔨 Grind the solid into powder", "⚗️ Add a catalyst", "🧪 Use more concentrated acid", "🎈 Raise the gas pressure", "🌡️ Use warm water instead of cold"];
const SLOWER = ["🧊 Cool it in ice", "🪨 Use one big lump", "💧 Dilute the acid with water", "🥶 Put food in the fridge", "🛑 Add an inhibitor", "🎈 Lower the gas pressure"];

/** HS-PS1-5 — Do it: sort changes that speed up or slow down a reaction. */
export function sortSpeed(): Question {
  const f = pickN(FASTER, rand(3, 4));
  const s = pickN(SLOWER, rand(3, 4));
  const items = shuffle([...f.map((l) => ({ label: l, bin: 0 })), ...s.map((l) => ({ label: l, bin: 1 }))]);
  return q({
    key: `sortspd-${items.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort each change: does it make the reaction faster or slower?",
    ans: act({ kind: "sort", bins: ["Faster", "Slower"], items }, items.length),
    hint: "Faster = more collisions per second, or more of them with enough energy.",
    explain: "Heat, smaller pieces, higher concentration or pressure, and catalysts speed reactions up; the opposites slow them down.",
  });
}

/** HS-PS1-5 — Do it: order setups from slowest to fastest. */
export function orderRates(): Question {
  const forms = ["lumps", "chips", "powder"];
  const temps = ["20 °C", "40 °C", "60 °C"];
  const concs = ["0.5 M", "1 M", "2 M"];
  const state = [0, 0, 0];
  const label2 = () => `Marble ${forms[state[0]]}, ${temps[state[1]]}, ${concs[state[2]]} acid`;
  const items = [label2()];
  for (let k = 0; k < 3; k++) {
    const can = [0, 1, 2].filter((i) => state[i] < 2);
    state[pick(can)]++;
    items.push(label2());
  }
  return q({
    key: `ordrate-${items.join("|")}`,
    prompt: "Tap the setups from SLOWEST to FASTEST reaction.",
    ans: act({ kind: "order", items, direction: "slowest → fastest" }, 4),
    hint: "Each setup differs from the next in one change. Powder, heat and stronger acid all speed it up.",
    explain: items.join(" → ") + ".",
  });
}

/** HS-PS1-5 — rates in real life. */
export function realLifeRates(): Question {
  const facts: [string, string, string[]][] = [
    ["Why are some medicines stored in a cool place?", "Cooler temperatures slow the reactions that break them down", ["Cold makes them stronger", "Heat adds more medicine", "Light is a catalyst"]],
    ["Why does a sliced apple brown faster than a whole one?", "Cutting exposes more surface to oxygen and enzymes", ["Knives are catalysts", "The apple gets colder", "Apples have no enzymes inside"]],
    ["Why does a fire burn more fiercely when you blow on it?", "More oxygen reaches the fuel (higher concentration)", ["Blowing cools it", "Your breath is a fuel", "It lowers Ea"]],
    ["Why is iron in steel wool rusting faster than an iron nail?", "Thin strands have much more surface area", ["Steel wool is a different element", "Nails are catalysts", "Steel wool is colder"]],
    ["Why do biological washing powders work best around 40 °C, not 90 °C?", "Their enzymes stop working when too hot", ["Hot water dissolves less", "Enzymes need ice", "Higher temperature always slows reactions"]],
    ["Why do coal mines worry about coal dust?", "Fine dust has a huge surface area and can explode", ["Dust is radioactive", "Dust absorbs oxygen", "Dust makes coal heavier"]],
    ["Why is fuel sprayed as a fine mist into a car engine?", "Tiny droplets have more surface area, so they burn fast", ["Mist is cooler", "Mist contains more energy", "It stops the fuel burning"]],
    ["Why do pickles last a long time?", "The acid slows the growth of microbes that spoil food", ["Vinegar is a catalyst", "Pickles have no water", "Salt speeds up reactions"]],
    ["Why do people blanch (briefly boil) vegetables before freezing them?", "It destroys enzymes that would slowly spoil them", ["It adds catalysts", "It makes them colder", "It removes all the water"]],
    ["Why is an ice pack effective at reducing swelling?", "Cold slows the body's chemical reactions near the injury", ["Cold adds energy", "Ice is a catalyst", "It increases blood flow"]],
    ["Why does bread go moldy faster in a warm kitchen?", "Mold's chemical reactions speed up when warm", ["Warm air has no oxygen", "Cold kitchens have more mold", "Bread is a catalyst"]],
    ["Why are firelighters made of thin, crumbly pieces?", "Small pieces catch fire quickly because of their large surface area", ["They contain no fuel", "Large pieces burn faster", "They are made of metal"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `rl-${i}`, prompt, ans: label(right, wrong), hint: "Which factor is at work: temperature, concentration, surface area, or a catalyst?", explain: `${right}.` });
}

/* ===================================================== 7. Equilibrium */

interface EqRxn { eq: string; dH: number; gasL: number; gasR: number; r: string[]; p: string[] }
const EQS: EqRxn[] = [
  { eq: "N₂ + 3H₂ ⇌ 2NH₃", dH: -92, gasL: 4, gasR: 2, r: ["N₂", "H₂"], p: ["NH₃"] },
  { eq: "2SO₂ + O₂ ⇌ 2SO₃", dH: -198, gasL: 3, gasR: 2, r: ["SO₂", "O₂"], p: ["SO₃"] },
  { eq: "N₂O₄ ⇌ 2NO₂", dH: 57, gasL: 1, gasR: 2, r: ["N₂O₄"], p: ["NO₂"] },
  { eq: "H₂ + I₂ ⇌ 2HI", dH: -10, gasL: 2, gasR: 2, r: ["H₂", "I₂"], p: ["HI"] },
  { eq: "CO + 2H₂ ⇌ CH₃OH", dH: -91, gasL: 3, gasR: 1, r: ["CO", "H₂"], p: ["CH₃OH"] },
  { eq: "CH₄ + H₂O ⇌ CO + 3H₂", dH: 206, gasL: 2, gasR: 4, r: ["CH₄", "H₂O"], p: ["CO", "H₂"] },
  { eq: "PCl₅ ⇌ PCl₃ + Cl₂", dH: 88, gasL: 1, gasR: 2, r: ["PCl₅"], p: ["PCl₃", "Cl₂"] },
  { eq: "CO + H₂O ⇌ CO₂ + H₂", dH: -41, gasL: 2, gasR: 2, r: ["CO", "H₂O"], p: ["CO₂", "H₂"] },
  { eq: "N₂ + O₂ ⇌ 2NO", dH: 181, gasL: 2, gasR: 2, r: ["N₂", "O₂"], p: ["NO"] },
];
type Dir = "right" | "left" | "none";
type Change = { text: string; dir: Dir };
const SHIFT_LABEL: Record<Dir, string> = { right: "Shifts right (more products)", left: "Shifts left (more reactants)", none: "No shift" };
const SHIFTS = [SHIFT_LABEL.right, SHIFT_LABEL.left, SHIFT_LABEL.none];

function concChanges(e: EqRxn): Change[] {
  return [
    ...e.r.map((f) => ({ text: `Add more ${f}`, dir: "right" as Dir })),
    ...e.r.map((f) => ({ text: `Remove some ${f}`, dir: "left" as Dir })),
    ...e.p.map((f) => ({ text: `Add more ${f}`, dir: "left" as Dir })),
    ...e.p.map((f) => ({ text: `Remove ${f} as it forms`, dir: "right" as Dir })),
  ];
}
function pressureChanges(e: EqRxn): Change[] {
  const up: Dir = e.gasL === e.gasR ? "none" : e.gasR < e.gasL ? "right" : "left";
  const down: Dir = up === "none" ? "none" : up === "right" ? "left" : "right";
  return [{ text: "Raise the pressure (squeeze it)", dir: up }, { text: "Lower the pressure", dir: down }];
}
function tempChanges(e: EqRxn): Change[] {
  const hot: Dir = e.dH > 0 ? "right" : "left";
  return [{ text: "Raise the temperature", dir: hot }, { text: "Lower the temperature", dir: hot === "right" ? "left" : "right" }];
}
const catalystChange: Change = { text: "Add a catalyst", dir: "none" };
const eqPic = (e: EqRxn) => rxn(e.eq, { dH: e.dH });

/** HS-PS1-6 — reversible reactions and dynamic equilibrium. */
export function dynamicEquilibrium(): Question {
  const kind = rand(0, 1);
  if (kind === 0) {
    const e = pick(EQS);
    const facts: [string, string, string[]][] = [
      ["At equilibrium, what is true about the forward and reverse reactions?", "Both still happen, at the same rate", ["Both have stopped", "Only the forward reaction happens", "The reverse reaction is faster"]],
      ["At equilibrium, the amounts of reactants and products are…", "constant, but not necessarily equal", ["always equal", "both zero", "still changing quickly"]],
      ["What does the ⇌ arrow mean?", "The reaction can go both ways", ["The reaction is finished", "The reaction is very fast", "Heat is needed"]],
      ["Equilibrium can only be reached in…", "a closed system", ["an open beaker", "a vacuum", "sunlight"]],
    ];
    const i = rand(0, facts.length - 1);
    const [prompt, right, wrong] = facts[i];
    return q({
      key: `deq-${i}-${e.eq}`,
      prompt,
      visual: eqPic(e),
      ans: label(right, wrong),
      hint: "Equilibrium is dynamic: particles keep reacting both ways, but nothing changes overall.",
      explain: `${right[0].toUpperCase()}${right.slice(1)}.`,
    });
  }
  const n = rand(4, 12);
  const f = rand(2, 6);
  return q({
    key: `deq-rate-${n}-${f}`,
    prompt: `At equilibrium, ${n * f} molecules react forward each second. How many react in reverse each second?`,
    ans: keypad(n * f, [0, n, f]),
    hint: "At equilibrium the two rates are equal, so the amounts stay steady.",
    explain: `${n * f}: forward rate = reverse rate.`,
  });
}

/** HS-PS1-6 — reading equilibrium graphs. */
export function equilibriumGraphs(): Question {
  const kind = rand(0, 2);
  const te = pick([3, 4, 5, 6, 8]);
  const R0 = pick([8, 10]);
  const Re = rand(2, 5);
  const ratio = pick([1, 2]);
  const Rfn = (t: number) => (t >= te ? Re : Re + (R0 - Re) * (1 - t / te) ** 2);
  const Pfn = (t: number) => (R0 - Rfn(t)) * ratio;
  const top = Math.max(R0, (R0 - Re) * ratio) + 2;
  if (kind === 0) {
    return q({
      key: `eqg-when-${te}-${R0}-${Re}-${ratio}`,
      prompt: "Reactant A turns into product B in a closed flask. When is equilibrium reached?",
      visual: { kind: "plot", x: [0, 12], y: [0, top], xLabel: "time (min)", yLabel: "concentration (M)", curves: [{ fn: Rfn, label: "A reactant" }, { fn: Pfn, label: "B product" }] },
      needsVisual: true,
      ans: choose(te, [te - 2, te + 2, 0, 12].filter((x) => x >= 0), 1),
      unit: "min",
      hint: "Equilibrium starts when both lines go flat: the amounts stop changing.",
      explain: `Both curves flatten at ${te} min. After that the forward and reverse rates are equal.`,
    });
  }
  if (kind === 1) {
    const eq = (R0 - Re) * ratio;
    return q({
      key: `eqg-equal-${te}-${R0}-${Re}-${ratio}`,
      prompt: "At equilibrium, are the concentrations of A and B equal?",
      visual: { kind: "plot", x: [0, 12], y: [0, top], xLabel: "time (min)", yLabel: "concentration (M)", curves: [{ fn: Rfn, label: "A reactant" }, { fn: Pfn, label: "B product" }] },
      needsVisual: true,
      ans: eq === Re ? label("Yes here, but they don't have to be", ["No, B is higher", "No, A is higher", "They're both zero"]) : label("No: they're constant, not equal", ["Yes, always", "Yes, after a long time", "They're both zero"]),
      hint: "Read the flat parts of both lines.",
      explain: `A levels at ${Re} and B at ${eq}. Equilibrium means steady amounts, not equal ones.`,
    });
  }
  const f0 = pick([8, 10, 12]);
  const r = rand(3, 6);
  const fwd = (t: number) => (t >= te ? r : r + (f0 - r) * (1 - t / te) ** 2);
  const rev = (t: number) => (t >= te ? r : r * (1 - (1 - t / te) ** 2));
  return q({
    key: `eqg-rates-${te}-${f0}-${r}`,
    prompt: "The forward and reverse reaction rates over time. What is true after the lines meet?",
    visual: { kind: "plot", x: [0, 12], y: [0, f0 + 2], xLabel: "time (min)", yLabel: "rate", curves: [{ fn: fwd, label: "forward" }, { fn: rev, label: "reverse", dashed: true }] },
    needsVisual: true,
    ans: label("The system is at equilibrium", ["Both reactions have stopped", "Only products are left", "The forward reaction speeds up again"]),
    hint: "The forward rate falls as reactants are used; the reverse rate rises as products build up.",
    explain: `From ${te} min both rates equal ${r}: dynamic equilibrium. Both reactions continue at the same rate.`,
  });
}

/** HS-PS1-6 — Le Châtelier: changing concentration. */
export function leConcentration(): Question {
  const kind = rand(0, 2);
  const e = pick(EQS);
  const ch = pick(concChanges(e));
  if (kind < 2) {
    return q({
      key: `lec-${e.eq}-${ch.text}`,
      prompt: `${e.eq} is at equilibrium. You ${lc1(ch.text)}. Which way does it shift?`,
      visual: eqPic(e),
      ans: labelInOrder(SHIFTS, SHIFT_LABEL[ch.dir]),
      hint: "The system shifts to use up what you add, or to replace what you take away.",
      explain: ch.dir === "right" ? "It shifts right, toward the products, to counteract the change." : "It shifts left, toward the reactants, to counteract the change.",
    });
  }
  const added = pick(e.r);
  const other = e.p[0];
  return q({
    key: `lec-amt-${e.eq}-${added}`,
    prompt: `${e.eq} is at equilibrium. More ${added} is added. What happens to the amount of ${other}?`,
    visual: eqPic(e),
    ans: labelInOrder(["It increases", "It decreases", "It stays the same"], "It increases"),
    hint: `Adding a reactant pushes the reaction forward.`,
    explain: `The equilibrium shifts right to use up the extra ${added}, making more ${other}.`,
  });
}

/** HS-PS1-6 — Le Châtelier: changing pressure. */
export function lePressure(): Question {
  const kind = rand(0, 2);
  const e = pick(EQS);
  if (kind === 0) {
    const ch = pick(pressureChanges(e));
    return q({
      key: `lep-${e.eq}-${ch.text}`,
      prompt: `All are gases: ${e.eq}. You ${lc1(ch.text)}. Which way does it shift?`,
      visual: eqPic(e),
      ans: labelInOrder(SHIFTS, SHIFT_LABEL[ch.dir]),
      hint: `Count gas molecules: ${e.gasL} on the left, ${e.gasR} on the right. Higher pressure favors the side with fewer.`,
      explain: e.gasL === e.gasR ? `Both sides have ${e.gasL} mol of gas, so pressure can't shift it.` : `${e.gasL} mol of gas on the left, ${e.gasR} on the right: it ${ch.dir === "right" ? "shifts right" : "shifts left"}.`,
    });
  }
  if (kind === 1) {
    const left = rand(0, 1) === 0;
    return q({
      key: `lep-count-${e.eq}-${left ? "L" : "R"}`,
      prompt: `How many moles of gas are on the ${left ? "left (reactant)" : "right (product)"} side of ${e.eq}?`,
      ans: keypad(left ? e.gasL : e.gasR),
      hint: "Add the coefficients of the gases on that side.",
      explain: `${left ? e.gasL : e.gasR} mol of gas.`,
    });
  }
  const pool = EQS.filter((x) => x.gasL > x.gasR);
  const right = pick(pool);
  const wrong = pickN(EQS.filter((x) => x.gasL <= x.gasR), 3).map((x) => x.eq);
  return q({
    key: `lep-which-${right.eq}`,
    prompt: "Which equilibrium makes MORE product when the pressure is raised?",
    ans: label(right.eq, wrong),
    hint: "High pressure favors the side with fewer gas molecules. Look for fewer on the right.",
    explain: `${right.eq}: ${right.gasL} mol of gas → ${right.gasR}, so high pressure shifts it right.`,
  });
}

/** HS-PS1-6 — Le Châtelier: changing temperature. */
export function leTemperature(): Question {
  const kind = rand(0, 2);
  const e = pick(EQS);
  if (kind < 2) {
    const ch = pick(tempChanges(e));
    return q({
      key: `let-${e.eq}-${ch.text}`,
      prompt: `${e.eq}, ΔH = ${sgn(e.dH)} kJ. You ${lc1(ch.text)}. Which way does it shift?`,
      visual: eqPic(e),
      ans: labelInOrder(SHIFTS.slice(0, 2), SHIFT_LABEL[ch.dir]),
      hint: e.dH < 0 ? "Exothermic forward: treat heat as a PRODUCT." : "Endothermic forward: treat heat as a REACTANT.",
      explain: `${e.dH < 0 ? "Heat is a product" : "Heat is a reactant"}. ${ch.text.startsWith("Raise") ? "Adding heat" : "Removing heat"} shifts it ${ch.dir}.`,
    });
  }
  const more = rand(0, 1) === 0;
  return q({
    key: `let-infer-${more ? 1 : 0}`,
    prompt: `When an equilibrium mixture is heated, ${more ? "more" : "less"} product forms. Is the forward reaction exothermic or endothermic?`,
    ans: labelInOrder(["Exothermic", "Endothermic"], more ? "Endothermic" : "Exothermic"),
    hint: "Heating favors the direction that absorbs heat (the endothermic one).",
    explain: more ? "Heating pushed it forward, so the forward reaction absorbs heat: endothermic." : "Heating pushed it backward, so the reverse absorbs heat and the forward is exothermic.",
  });
}

/** HS-PS1-6 — catalysts and what changes the equilibrium. */
export function catalystEquilibrium(): Question {
  const facts: [string, string, string[]][] = [
    ["What does a catalyst do to an equilibrium?", "Reaches it faster, without changing the amounts", ["Shifts it right", "Shifts it left", "Stops the reverse reaction"]],
    ["A catalyst speeds up the forward reaction. What does it do to the reverse?", "Speeds it up by the same factor", ["Slows it down", "Stops it", "Nothing"]],
    ["Which change alters the equilibrium constant K?", "Changing the temperature", ["Adding a catalyst", "Adding more reactant", "Raising the pressure"]],
    ["Why do factories still use catalysts if they don't change the yield?", "The product is made much faster", ["Catalysts are free", "They make the product purer", "They increase K"]],
    ["Adding argon (an unreactive gas) at constant volume to a gas equilibrium…", "doesn't shift it", ["shifts it right", "shifts it left", "stops the reaction"]],
    ["Le Châtelier's principle says a system at equilibrium will…", "shift to partly undo any change made to it", ["always make more products", "never change", "explode when heated"]],
  ];
  const e = pick(EQS);
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({
    key: `cateq-${i}-${e.eq}`,
    prompt,
    visual: eqPic(e),
    ans: label(right, wrong),
    hint: "A catalyst lowers the hump for BOTH directions equally.",
    explain: `${right[0].toUpperCase()}${right.slice(1)}.`,
  });
}

/** HS-PS1-6 — Do it: sort changes by which way they shift an equilibrium. */
export function sortShifts(): Question {
  const e = pick(EQS);
  const all = [...pickN(concChanges(e), 3), ...pressureChanges(e).slice(0, rand(1, 2)), pick(tempChanges(e)), ...(rand(0, 1) ? [catalystChange] : [])];
  const items = shuffle(all).map((c) => ({ label: c.text, bin: ["right", "left", "none"].indexOf(c.dir) }));
  return q({
    key: `sortsh-${e.eq}-${items.map((i) => i.label).sort().join("|")}`,
    prompt: `${e.eq}, ΔH = ${sgn(e.dH)} kJ (all gases). Sort each change by how it shifts the equilibrium.`,
    visual: eqPic(e),
    ans: act({ kind: "sort", bins: ["Shifts right", "Shifts left", "No shift"], items }, items.length),
    hint: `Add → use it up; remove → replace it. Pressure favors fewer gas molecules (${e.gasL} vs ${e.gasR}). Heat is a ${e.dH < 0 ? "product" : "reactant"}.`,
    explain: shuffle(all).map((c) => `${c.text}: ${c.dir === "none" ? "no shift" : c.dir}`).join("; ") + ".",
  });
}

/** HS-PS1-6 — Do it: which conditions give more product? */
export function moreProduct(): Question {
  const e = pick(EQS);
  const changes: { text: string; bin: number }[] = [];
  const binOf = (d: Dir) => (d === "right" ? 0 : d === "left" ? 1 : 2);
  pickN(concChanges(e), 2).forEach((c) => changes.push({ text: c.text, bin: binOf(c.dir) }));
  tempChanges(e).forEach((c) => changes.push({ text: c.text, bin: binOf(c.dir) }));
  if (e.gasL !== e.gasR) pressureChanges(e).forEach((c) => changes.push({ text: c.text, bin: binOf(c.dir) }));
  else changes.push({ text: "Raise the pressure (squeeze it)", bin: 2 });
  changes.push({ text: "Add a catalyst", bin: 2 });
  const items = shuffle(changes).map((c) => ({ label: c.text, bin: c.bin }));
  return q({
    key: `moreprod-${e.eq}-${items.map((i) => i.label).sort().join("|")}`,
    prompt: `A factory makes ${e.p.join(" and ")} by ${e.eq} (ΔH = ${sgn(e.dH)} kJ, all gases). Sort each change.`,
    visual: eqPic(e),
    ans: act({ kind: "sort", bins: ["More product", "Less product", "Only faster (same yield)"], items }, items.length),
    hint: "More product = shifts right. A catalyst (or pressure when both sides have equal gas molecules) only speeds things up.",
    explain: items.map((i) => `${i.label}: ${["more product", "less product", "only faster"][i.bin]}`).join("; ") + ".",
  });
}

/** HS-PS1-6 — the Haber process. */
export function haberProcess(): Question {
  const haber = EQS[0];
  const kind = rand(0, 2);
  if (kind === 0) {
    const ch = pick([...concChanges(haber), ...pressureChanges(haber), ...tempChanges(haber), catalystChange]);
    return q({
      key: `haber-shift-${ch.text}`,
      prompt: `Haber process: N₂ + 3H₂ ⇌ 2NH₃, ΔH = −92 kJ. What happens if you ${lc1(ch.text)}?`,
      visual: { ...rxn(haber.eq, { dH: -92, above: "Fe, 450 °C" }) } as Visual,
      ans: labelInOrder(SHIFTS, SHIFT_LABEL[ch.dir]),
      hint: "4 mol of gas → 2 mol; exothermic forward.",
      explain: ch.dir === "none" ? "No shift: a catalyst just gets to equilibrium faster." : `It shifts ${ch.dir}${ch.dir === "right" ? ", making more ammonia" : ", making less ammonia"}.`,
    });
  }
  if (kind === 1) {
    const n = rand(1, 6);
    const askH = rand(0, 1) === 0;
    return q({
      key: `haber-mol-${n}-${askH ? "h" : "n"}`,
      prompt: askH ? `How many mol of H₂ react with ${n} mol of N₂ in the Haber process?` : `If ${n} mol of N₂ reacted completely, how many mol of NH₃ would form?`,
      visual: rxn(haber.eq, { dH: -92 }),
      ans: keypad(askH ? 3 * n : 2 * n, [n, 2 * n, 3 * n, 6 * n]),
      unit: "mol",
      hint: "Use the coefficients: 1 N₂ : 3 H₂ : 2 NH₃.",
      explain: askH ? `${n} × 3 = ${3 * n} mol of H₂.` : `${n} × 2 = ${2 * n} mol of NH₃ (in practice equilibrium stops it short).`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why does the Haber process use high pressure (about 200 atm)?", "4 mol of gas become 2, so high pressure shifts it right", ["High pressure lowers ΔH", "It makes the catalyst work", "Pressure has no effect"]],
    ["Lower temperatures give more ammonia. Why run at about 450 °C?", "A compromise: colder would be far too slow", ["Ammonia is endothermic to make", "The iron melts below 450 °C", "Higher temperature gives more ammonia"]],
    ["What does the iron catalyst do in the Haber process?", "Speeds up reaching equilibrium; yield unchanged", ["Increases the yield", "Absorbs the ammonia", "Makes the reaction endothermic"]],
    ["Ammonia is cooled to a liquid and removed. Why?", "Removing product shifts the equilibrium right", ["Liquid ammonia is a catalyst", "To stop the reverse reaction completely", "It makes N₂ react slower"]],
    ["Unreacted N₂ and H₂ are recycled back in. Why?", "Only part reacts each pass; recycling avoids waste", ["They catalyse the reaction", "They cool the reactor", "They are a product"]],
    ["What is most ammonia made into?", "Fertilizers to grow food", ["Rocket fuel", "Plastic bags", "Table salt"]],
    ["Why not use an even higher pressure, like 1000 atm?", "Equipment would be too costly and dangerous", ["It would shift it left", "It would lower the yield", "Ammonia would freeze"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `haber-fact-${i}`, prompt, visual: rxn(haber.eq, { dH: -92, above: "Fe" }), ans: label(right, wrong), hint: "Yield (Le Châtelier) and rate (collisions) pull in different directions; industry balances them.", explain: `${right}.` });
}

interface ColourEq { eq: string; left: string; right: string; lc: "rose" | "wave" | "sun" | "tangerine" | "berry" | "clear" | "cocoa"; rc: "rose" | "wave" | "sun" | "tangerine" | "berry" | "clear" | "cocoa"; changes: Change[] }
const COLOUR_EQS: ColourEq[] = [
  { eq: "N₂O₄ ⇌ 2NO₂", left: "colorless", right: "brown", lc: "clear", rc: "cocoa", changes: [{ text: "Heat the tube", dir: "right" }, { text: "Cool the tube in ice", dir: "left" }, { text: "Squeeze it to a higher pressure", dir: "left" }] },
  { eq: "Co(H₂O)₆²⁺ + 4Cl⁻ ⇌ CoCl₄²⁻ + 6H₂O", left: "pink", right: "blue", lc: "rose", rc: "wave", changes: [{ text: "Heat the solution", dir: "right" }, { text: "Cool it in ice", dir: "left" }, { text: "Add concentrated HCl (more Cl⁻)", dir: "right" }, { text: "Add water", dir: "left" }] },
  { eq: "2CrO₄²⁻ + 2H⁺ ⇌ Cr₂O₇²⁻ + H₂O", left: "yellow", right: "orange", lc: "sun", rc: "tangerine", changes: [{ text: "Add acid (more H⁺)", dir: "right" }, { text: "Add NaOH (removes H⁺)", dir: "left" }] },
  { eq: "Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺", left: "pale yellow", right: "blood red", lc: "sun", rc: "berry", changes: [{ text: "Add more Fe³⁺", dir: "right" }, { text: "Add more SCN⁻", dir: "right" }, { text: "Add something that removes Fe³⁺", dir: "left" }] },
];

/** HS-PS1-6 — seeing equilibrium shifts as colour changes. */
export function colourEquilibria(): Question {
  const c = pick(COLOUR_EQS);
  const ch = pick(c.changes);
  const right = ch.dir === "right" ? `More ${c.right}` : `More ${c.left}`;
  const note = c.eq.startsWith("Co") ? " (forward reaction is endothermic)" : c.eq.startsWith("N₂O₄") ? " (ΔH = +57 kJ)" : "";
  return q({
    key: `coleq-${c.eq}-${ch.text}`,
    prompt: `${c.left[0].toUpperCase()}${c.left.slice(1)} ⇌ ${c.right}${note}. You ${lc1(ch.text)}. What color change do you see?`,
    visual: { kind: "chem-beaker", panels: [{ glass: "testtube", volume: 12, colour: c.lc, label: c.left }, { glass: "testtube", volume: 12, colour: c.rc, label: c.right }], joiner: null },
    ans: label(right, [ch.dir === "right" ? `More ${c.left}` : `More ${c.right}`, "No change", "It turns green"]),
    hint: "Decide which way the equilibrium shifts, then which colored substance there is more of.",
    explain: `${c.eq}: it shifts ${ch.dir}, so the mixture looks ${ch.dir === "right" ? c.right : c.left}.`,
  });
}

/* ===================================================== 8. Moles & stoichiometry */

/** Atomic masses rounded to 0.1, as on a school data sheet (in tenths, so sums stay exact). */
const AM10: Record<string, number> = {
  H: 10, C: 120, N: 140, O: 160, Na: 230, Mg: 243, Al: 270, Si: 281, P: 310, S: 321, Cl: 355, K: 391, Ca: 401, Fe: 558, Cu: 635, Zn: 654, Br: 799, Ag: 1079, I: 1269, Ba: 1373,
};
const elementsIn = (f: string) => Object.keys(AM10).filter((e) => countAtoms(f, e) > 0);
/** Molar mass to 0.1 g/mol, from the data-sheet masses. */
const mm = (f: string) => elementsIn(f).reduce((t, e) => t + countAtoms(f, e) * AM10[e], 0) / 10;
const massTable = (fs: string[]): Visual => {
  const els = [...new Set(fs.flatMap(elementsIn))];
  return els.length <= 3
    ? { kind: "table", header: ["Element", ...els], rows: [["g/mol", ...els.map((e) => fx(AM10[e] / 10, 1))]] }
    : { kind: "table", header: ["Element", "Mass (g/mol)"], rows: els.map((e) => [e, fx(AM10[e] / 10, 1)]) };
};
const COMPOUNDS = ["H₂O", "CO₂", "NaCl", "CH₄", "NH₃", "O₂", "N₂", "CaCO₃", "H₂SO₄", "NaOH", "MgO", "C₆H₁₂O₆", "HCl", "KCl", "Fe₂O₃", "CuSO₄", "Al₂O₃", "Ca(OH)₂", "C₂H₅OH", "NaHCO₃", "Mg(OH)₂", "KNO₃", "C₃H₈"];
const NAMES: Record<string, string> = {
  "H₂O": "water", "CO₂": "carbon dioxide", NaCl: "sodium chloride", "CH₄": "methane", "NH₃": "ammonia", "O₂": "oxygen", "N₂": "nitrogen", "CaCO₃": "calcium carbonate",
  "H₂SO₄": "sulfuric acid", NaOH: "sodium hydroxide", MgO: "magnesium oxide", "C₆H₁₂O₆": "glucose", HCl: "hydrogen chloride", KCl: "potassium chloride",
  "Fe₂O₃": "iron(III) oxide", "CuSO₄": "copper sulfate", "Al₂O₃": "aluminum oxide", "Ca(OH)₂": "calcium hydroxide", "C₂H₅OH": "ethanol", "NaHCO₃": "baking soda",
  "Mg(OH)₂": "magnesium hydroxide", "KNO₃": "potassium nitrate", "C₃H₈": "propane", "H₂": "hydrogen", "Cl₂": "chlorine", CO: "carbon monoxide", "SO₂": "sulfur dioxide",
  "SO₃": "sulfur trioxide", Mg: "magnesium", Na: "sodium", Fe: "iron", CaO: "calcium oxide", "KClO₃": "potassium chlorate", Zn: "zinc", "ZnCl₂": "zinc chloride", C: "carbon",
};
const nm = (f: string) => NAMES[f] ?? f;

/** "1.20 × 10²⁴" from a number. */
function sci(x: number): string {
  let e = Math.floor(Math.log10(x));
  let m = Number((x / 10 ** e).toFixed(2));
  if (m >= 10) {
    m /= 10;
    e += 1;
  }
  return `${m.toFixed(2)} × 10${sup(String(e))}`;
}
const NA = 6.02e23;

/** HS-PS1-7 — the mole and Avogadro's number. */
export function mole(): Question {
  const kind = rand(0, 3);
  const nice = [0.5, 2, 3, 0.25, 1.5, 4, 5, 10, 0.1, 2.5];
  if (kind === 0) {
    const n = pick(nice);
    const f = pick(["H₂O", "CO₂", "O₂", "NH₃", "CH₄", "N₂"]);
    return q({
      key: `mol-n2N-${n}-${f}`,
      prompt: `How many molecules are in ${n} mol of ${f}?`,
      ans: label(sci(n * NA), [sci(NA), sci(NA / n), sci(n * NA * 10), sci(n * NA / 10)]),
      hint: "1 mol = 6.02 × 10²³ particles. Multiply.",
      explain: `${n} × 6.02 × 10²³ = ${sci(n * NA)} molecules.`,
    });
  }
  if (kind === 1) {
    const n = pick(nice);
    return q({
      key: `mol-N2n-${n}`,
      prompt: `A sample contains ${sci(n * NA)} atoms of iron. How many moles is that?`,
      ans: keypad(n),
      unit: "mol",
      hint: "Divide the number of atoms by 6.02 × 10²³.",
      explain: `${sci(n * NA)} ÷ 6.02 × 10²³ = ${n} mol.`,
    });
  }
  if (kind === 2) {
    const f = pick(["H₂O", "CH₄", "NH₃", "C₂H₅OH", "C₆H₁₂O₆", "H₂SO₄", "CO₂", "C₃H₈"]);
    const el = pick(elementsIn(f));
    const n = pick([1, 2, 3, 4, 5]);
    const k = countAtoms(f, el);
    return q({
      key: `mol-atoms-${f}-${el}-${n}`,
      prompt: `How many moles of ${lower(el)} atoms are in ${n} mol of ${f}?`,
      ans: keypad(n * k, [n, k, n + k]),
      unit: "mol",
      hint: `Each ${f} contains ${k} ${el} atom${k === 1 ? "" : "s"}.`,
      explain: `${n} × ${k} = ${n * k} mol of ${el} atoms.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["One mole of any substance contains…", "6.02 × 10²³ particles", ["6.02 × 10²³ grams", "1 gram", "12 particles"]],
    ["Why do chemists count atoms in moles?", "Atoms are far too small and numerous to count one by one", ["Moles are lighter than atoms", "Atoms can't be counted at all", "It's a unit of volume"]],
    ["One mole of carbon-12 has a mass of exactly…", "12 g", ["1 g", "6.02 g", "24 g"]],
    ["Which contains more atoms: 1 mol of gold or 1 mol of helium?", "Both have the same number", ["1 mol of gold", "1 mol of helium", "It depends on the temperature"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `mol-fact-${i}`, prompt, ans: label(right, wrong), hint: "A mole is a counting number, like a dozen, but 6.02 × 10²³.", explain: `${right}.` });
}

/** HS-PS1-7 — molar mass. */
export function molarMassQ(): Question {
  const kind = rand(0, 2);
  if (kind < 2) {
    const f = pick(COMPOUNDS);
    const m = mm(f);
    return q({
      key: `mm-${f}`,
      prompt: `What is the molar mass of ${nm(f)}, ${f}?`,
      visual: massTable([f]),
      ans: keypad(m),
      unit: "g/mol",
      hint: "Multiply each element's mass by how many atoms it has in the formula, then add.",
      explain: `${elementsIn(f).map((e) => `${countAtoms(f, e)} × ${fx(AM10[e] / 10, 1)}`).join(" + ")} = ${fx(m, 1)} g/mol.`,
    });
  }
  const four = pickN(COMPOUNDS, 4);
  const best = [...four].sort((a, b) => mm(b) - mm(a));
  if (mm(best[0]) === mm(best[1])) return molarMassQ();
  return q({
    key: `mm-max-${four.sort().join(",")}`,
    prompt: "Which has the greatest molar mass?",
    visual: massTable(four),
    ans: label(best[0], best.slice(1)),
    hint: "Work out each molar mass, or look for heavy atoms and lots of them.",
    explain: best.map((f) => `${f} ${fx(mm(f), 1)}`).join(", ") + " g/mol.",
  });
}

const NICE_N = [0.5, 2, 3, 0.25, 1.5, 4, 0.1, 5, 2.5, 0.2];

/** HS-PS1-7 — converting between grams, moles and particles. */
export function massMoles(): Question {
  const kind = rand(0, 2);
  const f = pick(COMPOUNDS);
  const M = mm(f);
  const n = pick(NICE_N);
  const g = clean(n * M);
  if (kind === 0) {
    return q({
      key: `gm-g2n-${f}-${n}`,
      prompt: `How many moles are in ${g} g of ${f}?`,
      visual: massTable([f]),
      ans: keypad(n),
      unit: "mol",
      hint: `Moles = mass ÷ molar mass. Molar mass of ${f} = ${fx(M, 1)} g/mol.`,
      explain: `${g} ÷ ${fx(M, 1)} = ${n} mol.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `gm-n2g-${f}-${n}`,
      prompt: `What is the mass of ${n} mol of ${f}?`,
      visual: massTable([f]),
      ans: keypad(g),
      unit: "g",
      hint: `Mass = moles × molar mass (${f}: ${fx(M, 1)} g/mol).`,
      explain: `${n} × ${fx(M, 1)} = ${g} g.`,
    });
  }
  return q({
    key: `gm-g2N-${f}-${n}`,
    prompt: `How many molecules (or formula units) are in ${g} g of ${f}?`,
    visual: massTable([f]),
    ans: label(sci(n * NA), [sci(NA), sci(g * NA), sci(n * NA * 10), sci(NA / n)]),
    hint: "Grams → moles (÷ molar mass) → particles (× 6.02 × 10²³).",
    explain: `${g} ÷ ${fx(M, 1)} = ${n} mol; × 6.02 × 10²³ = ${sci(n * NA)}.`,
  });
}

const WEIGH: [string, string][] = [
  ["H₂O", "💧"], ["NaCl", "🧂"], ["CaCO₃", "🪨"], ["C₆H₁₂O₆", "🍬"], ["NaOH", "🧴"], ["CuSO₄", "💎"], ["KCl", "🧂"], ["MgO", "⚪"], ["NaHCO₃", "🧁"], ["Fe₂O₃", "🟫"], ["Al₂O₃", "⬜"], ["KNO₃", "🧪"],
];

/** HS-PS1-7 — Do it: weigh out a number of moles. */
export function weighMoles(): Question {
  let f = "", emoji = "", n = 0, g = 0;
  do {
    [f, emoji] = pick(WEIGH);
    n = pick([0.25, 0.5, 1, 1.5, 2, 3]);
    g = n * mm(f);
  } while (Math.abs((g % 1) - 0.5) < 0.05 || g > 500 || g < 5);
  const target = Math.round(g);
  return q({
    key: `weigh-${f}-${n}`,
    prompt: `Weigh out ${n} mol of ${nm(f)} (${f}), to the nearest gram, by adding weights to the pan.`,
    visual: massTable([f]),
    ans: act({ kind: "chem-measure", mode: "balance", mass: target, emoji }, target),
    hint: `Mass = ${n} × ${fx(mm(f), 1)} g/mol. Then build that mass from the weights.`,
    explain: `${n} × ${fx(mm(f), 1)} = ${clean(g)} g ≈ ${target} g.`,
  });
}

/** HS-PS1-7 — percent composition by mass. */
export function percentComposition(): Question {
  const kind = rand(0, 1);
  if (kind === 0) {
    const f = pick(COMPOUNDS.filter((x) => elementsIn(x).length > 1));
    const el = pick(elementsIn(f));
    const pct = rd((countAtoms(f, el) * AM10[el]) / 10 / mm(f) * 100, 1);
    return q({
      key: `pc-${f}-${el}`,
      prompt: `What percent of the mass of ${f} is ${lower(el)}? (1 decimal place)`,
      visual: massTable([f]),
      ans: keypad(pct),
      unit: "%",
      hint: `% = (mass of ${el} in one mole ÷ molar mass) × 100.`,
      explain: `${countAtoms(f, el)} × ${fx(AM10[el] / 10, 1)} = ${fx(countAtoms(f, el) * AM10[el] / 10, 1)}; ÷ ${fx(mm(f), 1)} × 100 = ${fx(pct, 1)}%.`,
    });
  }
  const el = pick(["O", "H", "C"]);
  const pool = COMPOUNDS.filter((x) => countAtoms(x, el) > 0);
  const four = pickN(pool, 4);
  const p = (x: string) => (countAtoms(x, el) * AM10[el]) / 10 / mm(x);
  const sorted = [...four].sort((a, b) => p(b) - p(a));
  if (p(sorted[0]) - p(sorted[1]) < 0.02) return percentComposition();
  return q({
    key: `pc-max-${el}-${four.sort().join(",")}`,
    prompt: `Which compound has the greatest percentage of ${lower(el)} by mass?`,
    visual: massTable(four),
    ans: label(sorted[0], sorted.slice(1)),
    hint: `For each, work out (mass of ${el}) ÷ (molar mass).`,
    explain: sorted.map((x) => `${x} ${fx(p(x) * 100, 1)}%`).join(", ") + ".",
  });
}

/** HS-PS1-7 — conservation of mass. */
export function conservationMass(): Question {
  const kind = rand(0, 3);
  const before = rd(rand(1500, 2500) / 10, 1);
  if (kind === 0) {
    return q({
      key: `cons-closed-${before}`,
      prompt: "Two solutions react in a sealed flask and a solid forms. What does the balance read after?",
      visual: { kind: "chem-beaker", panels: [{ glass: "flask", volume: 120, stopper: true, balance: before, label: "Before" }, { glass: "flask", volume: 120, colour: "sun", precipitate: true, stopper: true, balance: "?", label: "After" }] },
      needsVisual: true,
      ans: keypad(before),
      unit: "g",
      hint: "In a closed system, no atoms get in or out.",
      explain: `Still ${fx(before, 1)} g: atoms are only rearranged, never created or destroyed.`,
    });
  }
  if (kind === 1) {
    const lost = rd(rand(5, 60) / 10, 1);
    const after = rd(before - lost, 1);
    return q({
      key: `cons-open-${before}-${lost}`,
      prompt: "Marble chips react with acid in an open flask. The mass drops. How much CO₂ gas escaped?",
      visual: { kind: "chem-beaker", panels: [{ glass: "flask", volume: 100, balance: before, label: "Start" }, { glass: "flask", volume: 100, bubbles: 10, balance: after, label: "End" }] },
      needsVisual: true,
      ans: keypad(lost),
      unit: "g",
      hint: "The missing mass didn't vanish; it left as gas.",
      explain: `${fx(before, 1)} − ${fx(after, 1)} = ${fx(lost, 1)} g of CO₂ escaped into the air.`,
    });
  }
  if (kind === 2) {
    const sets: [string, string, string, string][] = [
      ["2H₂ + O₂ → 2H₂O", "H₂", "O₂", "H₂O"], ["2Mg + O₂ → 2MgO", "Mg", "O₂", "MgO"], ["C + O₂ → CO₂", "C", "O₂", "CO₂"], ["2Na + Cl₂ → 2NaCl", "Na", "Cl₂", "NaCl"], ["N₂ + 3H₂ → 2NH₃", "N₂", "H₂", "NH₃"],
    ];
    const [eq, a, b, p] = pick(sets);
    const { r } = eqTerms(eq);
    const k = pick([0.5, 1, 2, 3]);
    const ma = clean(k * r[0][0] * mm(a));
    const mb = clean(k * r[1][0] * mm(b));
    return q({
      key: `cons-sum-${eq}-${k}`,
      prompt: `${ma} g of ${a} reacts exactly with ${mb} g of ${b}. What mass of ${p} forms?`,
      visual: rxn(eq),
      ans: keypad(clean(ma + mb)),
      unit: "g",
      hint: "Mass of products = mass of reactants.",
      explain: `${ma} + ${mb} = ${clean(ma + mb)} g of ${p}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Wood burns to a small pile of ash. Where did the rest of the mass go?", "Into gases like CO₂ and water vapor", ["It was destroyed by the fire", "It turned into energy only", "It was never there"]],
    ["Steel wool gets HEAVIER when it rusts. Why?", "It combines with oxygen from the air", ["Rust is made of new atoms", "Heat adds mass", "Water is removed"]],
    ["Why do balanced equations show conservation of mass?", "The same atoms appear on both sides", ["The same molecules appear on both sides", "Coefficients add to the same number", "Products are always heavier"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `cons-fact-${i}`, prompt, ans: label(right, wrong), hint: "Atoms are rearranged, not made or destroyed. Look for gases going in or out.", explain: `${right}.` });
}

const STOICH: string[] = [
  "2H₂ + O₂ → 2H₂O", "CH₄ + 2O₂ → CO₂ + 2H₂O", "N₂ + 3H₂ → 2NH₃", "CaCO₃ → CaO + CO₂", "2Mg + O₂ → 2MgO", "Fe₂O₃ + 3CO → 2Fe + 3CO₂",
  "2Na + Cl₂ → 2NaCl", "C₃H₈ + 5O₂ → 3CO₂ + 4H₂O", "2KClO₃ → 2KCl + 3O₂", "Zn + 2HCl → ZnCl₂ + H₂", "2H₂O₂ → 2H₂O + O₂", "2SO₂ + O₂ → 2SO₃",
];

/** HS-PS1-7 — mole ratios. */
export function moleRatios(): Question {
  const eq = pick(STOICH);
  const { r, p } = eqTerms(eq);
  const all = [...r, ...p];
  const [ia, ib] = pickN(all.map((_, i) => i), 2);
  const [ca, fa] = all[ia];
  const [cb, fb] = all[ib];
  const k = pick([1, 2, 3, 4, 5, 0.5]);
  const na = ca * k;
  const nb = cb * k;
  return q({
    key: `ratio-${eq}-${fa}-${fb}-${k}`,
    prompt: `${eq}. How many moles of ${fb} go with ${na} mol of ${fa}?`,
    visual: rxn(eq),
    ans: keypad(nb, [na, ca * cb * k, cb]),
    unit: "mol",
    hint: `The coefficients give the mole ratio ${fa} : ${fb} = ${ca} : ${cb}.`,
    explain: `${na} × ${cb}/${ca} = ${nb} mol of ${fb}.`,
  });
}

/** HS-PS1-7 — mass-to-mass stoichiometry. */
export function massMass(): Question {
  const eq = pick(STOICH);
  const { r, p } = eqTerms(eq);
  const [ca, fa] = pick(r);
  const [cb, fb] = pick(p.length > 1 ? p : p);
  const na = pick([0.5, 1, 2, 3, 0.25, 4]) * ca;
  const ga = clean(na * mm(fa));
  const nb = (na * cb) / ca;
  const gb = rd(nb * mm(fb), 1);
  return q({
    key: `mm2-${eq}-${fa}-${fb}-${na}`,
    prompt: `${eq}. What mass of ${fb} forms from ${ga} g of ${fa}? (1 decimal place)`,
    visual: massTable([fa, fb]),
    ans: keypad(gb),
    unit: "g",
    hint: `Grams of ${fa} → moles (÷ ${fx(mm(fa), 1)}) → moles of ${fb} (× ${cb}/${ca}) → grams (× ${fx(mm(fb), 1)}).`,
    explain: `${ga} ÷ ${fx(mm(fa), 1)} = ${clean(na)} mol ${fa} → ${clean(nb)} mol ${fb} → × ${fx(mm(fb), 1)} = ${fx(gb, 1)} g.`,
  });
}

const LIMIT_RXNS: [string[], string[]][] = [
  [["H₂", "O₂"], ["H₂O"]], [["N₂", "H₂"], ["NH₃"]], [["CO", "O₂"], ["CO₂"]], [["H₂", "Cl₂"], ["HCl"]], [["CH₄", "O₂"], ["CO₂", "H₂O"]], [["SO₂", "O₂"], ["SO₃"]], [["C", "O₂"], ["CO₂"]],
];

/** HS-PS1-7 — Do it: run a reaction until the limiting reactant runs out. */
export function limitingParticles(): Question {
  for (;;) {
    const [r, p] = pick(LIMIT_RXNS);
    const c = coefs(r, p);
    const counts = r.map(() => rand(1, 9));
    const runs = Math.min(...counts.map((n, i) => Math.floor(n / c[i])));
    if (runs < 1) continue;
    const left = counts.map((n, i) => n - runs * c[i]);
    if (left.every((x) => x === 0)) continue;
    const total = counts.reduce((a, b) => a + b, 0);
    const made = runs * p.reduce((t, _, i) => t + c[r.length + i], 0);
    if (total > 20 || made > 20) continue;
    if (counts.filter((n, i) => Math.floor(n / c[i]) === runs).length !== 1) continue;
    const lim = r.find((_, i) => counts[i] - runs * c[i] < c[i] && Math.floor(counts[i] / c[i]) === runs)!;
    return q({
      key: `limp-${r.join("+")}-${counts.join(",")}`,
      prompt: `${balancedText(r, p)}. Tap React! until one reactant runs out. Which one is limiting?`,
      ans: act({ kind: "chem-mix", mode: "limiting", reactants: r.map((f, i) => ({ formula: f, count: counts[i] })), products: p }, runs),
      hint: "Each React! uses the coefficient amounts. Stop when you can't do it again.",
      explain: `It runs ${runs} time${runs === 1 ? "" : "s"}. Then there isn't enough ${lim} to react again, so ${lim} is limiting. Left over: ${r.filter((_, i) => left[i] > 0).map((f) => `${left[r.indexOf(f)]} ${f}`).join(" and ")}.`,
    });
  }
}

/** HS-PS1-7 — limiting reactant calculations. */
export function limitingCalc(): Question {
  for (;;) {
    const eq = pick(["2H₂ + O₂ → 2H₂O", "N₂ + 3H₂ → 2NH₃", "2Mg + O₂ → 2MgO", "2Na + Cl₂ → 2NaCl", "CH₄ + 2O₂ → CO₂ + 2H₂O", "2SO₂ + O₂ → 2SO₃", "Zn + 2HCl → ZnCl₂ + H₂", "Fe₂O₃ + 3CO → 2Fe + 3CO₂"]);
    const { r, p } = eqTerms(eq);
    const [[ca, fa], [cb, fb]] = r;
    const [cp, fp] = p[0];
    const na = rand(1, 10);
    const nb = rand(1, 10);
    const ra = na / ca;
    const rb = nb / cb;
    if (Math.abs(ra - rb) < 1e-9) continue;
    const runs = Math.min(ra, rb);
    const lim = ra < rb ? fa : fb;
    const ex = ra < rb ? fb : fa;
    const prod = runs * cp;
    const leftover = ra < rb ? nb - runs * cb : na - runs * ca;
    if (!Number.isInteger(prod * 2) || !Number.isInteger(leftover * 2)) continue;
    const kind = rand(0, 2);
    const base = `${eq}. You start with ${na} mol of ${fa} and ${nb} mol of ${fb}.`;
    if (kind === 0) {
      return q({
        key: `limc-which-${eq}-${na}-${nb}`,
        prompt: `${base} Which reactant is limiting?`,
        visual: rxn(eq),
        ans: labelInOrder([fa, fb], lim),
        hint: `Divide each amount by its coefficient: ${fa} ${na}/${ca}, ${fb} ${nb}/${cb}. The smaller one runs out first.`,
        explain: `${fa}: ${na} ÷ ${ca} = ${clean(ra)}; ${fb}: ${nb} ÷ ${cb} = ${clean(rb)}. The smaller one, ${lim}, is limiting.`,
      });
    }
    if (kind === 1) {
      return q({
        key: `limc-prod-${eq}-${na}-${nb}`,
        prompt: `${base} How many moles of ${fp} can form?`,
        visual: rxn(eq),
        ans: keypad(prod, [Math.max(ra, rb) * cp]),
        unit: "mol",
        hint: "Find the limiting reactant first; it decides how much product forms.",
        explain: `${lim} is limiting: there's enough for the equation ${clean(runs)} time${runs === 1 ? "" : "s"} → ${clean(runs)} × ${cp} = ${clean(prod)} mol of ${fp}.`,
      });
    }
    return q({
      key: `limc-left-${eq}-${na}-${nb}`,
      prompt: `${base} How many moles of the excess reactant (${ex}) are left over?`,
      visual: rxn(eq),
      ans: keypad(leftover),
      unit: "mol",
      hint: `${lim} is used up. How much ${ex} does that use?`,
      explain: `Using up the ${lim} takes ${clean(runs * (ex === fa ? ca : cb))} mol of ${ex}, leaving ${clean(leftover)} mol.`,
    });
  }
}

/** HS-PS1-7 — percent yield. */
export function percentYield(): Question {
  const kind = rand(0, 2);
  const theo = rd(rand(40, 400) / 4, 2);
  const pct = rand(55, 96);
  const actual = rd((theo * pct) / 100, 2);
  if (kind === 0) {
    const y = rd((actual / theo) * 100, 1);
    return q({
      key: `py-pct-${theo}-${pct}`,
      prompt: `The theoretical yield was ${theo} g, but only ${actual} g was collected. What is the percent yield? (1 decimal place)`,
      ans: keypad(y),
      unit: "%",
      hint: "Percent yield = actual ÷ theoretical × 100.",
      explain: `${actual} ÷ ${theo} × 100 = ${fx(y, 1)}%.`,
    });
  }
  if (kind === 1) {
    const eq = pick(["CaCO₃ → CaO + CO₂", "2Mg + O₂ → 2MgO", "N₂ + 3H₂ → 2NH₃", "2H₂ + O₂ → 2H₂O"]);
    const { r, p } = eqTerms(eq);
    const [ca, fa] = r[0];
    const [cp, fp] = p[0];
    const na = pick([1, 2, 0.5, 4]) * ca;
    const tg = clean((na * cp) / ca * mm(fp));
    const ag = rd((tg * pct) / 100, 1);
    const y = rd((ag / tg) * 100, 1);
    return q({
      key: `py-full-${eq}-${na}-${pct}`,
      prompt: `${eq}. ${na} mol of ${fa} reacts fully, but only ${fx(ag, 1)} g of ${fp} is collected. What is the percent yield? (1 decimal place)`,
      visual: massTable([fp]),
      ans: keypad(y),
      unit: "%",
      hint: `First the theoretical yield: ${na} mol ${fa} → ${clean((na * cp) / ca)} mol ${fp} → grams.`,
      explain: `Theoretical: ${clean((na * cp) / ca)} × ${fx(mm(fp), 1)} = ${tg} g. ${fx(ag, 1)} ÷ ${tg} × 100 = ${fx(y, 1)}%.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Why is the actual yield usually less than the theoretical yield?", "Some product is lost, or side reactions happen", ["Atoms are destroyed", "Mass is not conserved", "The limiting reactant grows"]],
    ["A student reports a 112% yield. What most likely went wrong?", "The product was still wet or impure", ["The reaction made extra atoms", "Too little product formed", "Nothing; that's normal"]],
    ["Why do chemical companies care about percent yield?", "Wasted reactants cost money and make waste", ["It changes the formula", "It makes reactions exothermic", "It's required to balance equations"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `py-fact-${i}`, prompt, ans: label(right, wrong), hint: "Theoretical yield is the most you could ever get; real experiments lose some.", explain: `${right}.` });
}

const HARD: [string[], string[]][] = [
  [["Fe₂O₃", "CO"], ["Fe", "CO₂"]], [["NH₃", "O₂"], ["NO", "H₂O"]], [["C₃H₈", "O₂"], ["CO₂", "H₂O"]], [["Al", "Fe₂O₃"], ["Al₂O₃", "Fe"]], [["C₆H₁₂O₆", "O₂"], ["CO₂", "H₂O"]],
  [["Ca₃(PO₄)₂", "H₂SO₄"], ["CaSO₄", "H₃PO₄"]], [["Fe", "H₂O"], ["Fe₃O₄", "H₂"]], [["CS₂", "O₂"], ["CO₂", "SO₂"]], [["C₂H₆", "O₂"], ["CO₂", "H₂O"]], [["NO₂", "H₂O"], ["HNO₃", "NO"]],
  [["SiCl₄", "H₂O"], ["SiO₂", "HCl"]], [["Mg₃N₂", "H₂O"], ["Mg(OH)₂", "NH₃"]], [["C₄H₁₀", "O₂"], ["CO₂", "H₂O"]], [["Al", "H₂SO₄"], ["Al₂(SO₄)₃", "H₂"]],
];

/** HS-PS1-7 — Do it: balance harder equations. */
export function balanceHard(): Question {
  const [r, p] = pick(HARD);
  const c = coefs(r, p);
  return q({
    key: `balhard-${r.join("+")}=${p.join("+")}`,
    prompt: "Balance the equation. Atoms are conserved, so every count must match.",
    speech: "Balance the equation. Every atom count must match on both sides.",
    ans: act({ kind: "chem-balance", reactants: r, products: p, max: Math.max(10, ...c) + 1 }, c[0]),
    hint: "Start with the most complicated formula. Balance elements that appear in only one formula on each side first; O and H last.",
    explain: `${balancedText(r, p)}.`,
  });
}

/* ===================================================== 9. Nuclear chemistry */

const ALPHA_PARENTS: [string, number][] = [
  ["U", 238], ["Ra", 226], ["Po", 210], ["Am", 241], ["Th", 232], ["Rn", 222], ["Pu", 239], ["Po", 218], ["U", 234], ["Th", 230], ["Ra", 224], ["Bi", 212],
];
const BETA_PARENTS: [string, number][] = [
  ["C", 14], ["H", 3], ["Co", 60], ["Sr", 90], ["I", 131], ["Cs", 137], ["Th", 234], ["P", 32], ["K", 40], ["Pb", 214], ["Bi", 214], ["Na", 24],
];
const POSITRON_PARENTS: [string, number][] = [["F", 18], ["C", 11], ["Na", 22], ["O", 15], ["N", 13]];
const shift = (sym: string, dz: number) => element(zOf(sym) + dz)!.symbol;
type Decay = "alpha" | "beta" | "positron" | "gamma";
const DECAY_NAME: Record<Decay, string> = { alpha: "Alpha decay", beta: "Beta decay", positron: "Positron emission", gamma: "Gamma emission" };
const PARTICLE_TEXT: Record<Decay | "neutron", string> = { alpha: "An alpha particle, ⁴₂He", beta: "A beta particle, ⁰₋₁e", positron: "A positron, ⁰₊₁e", gamma: "A gamma ray, ⁰₀γ", neutron: "A neutron, ¹₀n" };

/** The nuclide after a decay. */
function daughter(sym: string, A: number, d: Decay): [string, number] {
  if (d === "alpha") return [shift(sym, -2), A - 4];
  if (d === "beta") return [shift(sym, 1), A];
  if (d === "positron") return [shift(sym, -1), A];
  return [sym, A];
}
function decayPic(sym: string, A: number, d: Decay, ask?: "A" | "Z" | "symbol", askParticle = false, label = true): ChemistryVisual {
  const [s2, A2] = daughter(sym, A, d);
  const after: Nuclide[] = [{ element: s2, A: A2, ...(ask ? { ask } : {}) }, { particle: d, ...(askParticle ? { ask: "symbol" as const } : {}) }];
  return { kind: "chem-nucleus", before: [{ element: sym, A }], after, ...(label ? { change: d === "gamma" ? "gamma emission" : `${d} decay` } : {}) };
}

/** HS-PS1-8 — the nucleus, stability and nuclear vs chemical change. */
export function nucleusStability(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const pairs: [string, number, number][] = [["C", 12, 14], ["H", 1, 3], ["K", 39, 40], ["I", 127, 131], ["Co", 59, 60], ["Sr", 88, 90], ["Cs", 133, 137], ["P", 31, 32], ["Na", 23, 24], ["O", 16, 15]];
    const [s, stable, radio] = pick(pairs);
    return q({
      key: `nuc-which-${s}`,
      prompt: `${nameOf(s)}-${stable} is stable. ${nameOf(s)}-${radio} is radioactive. What makes them different?`,
      ans: label(`${Math.abs(radio - stable)} ${radio > stable ? "more" : "fewer"} neutron${Math.abs(radio - stable) === 1 ? "" : "s"} in the nucleus`, ["A different number of protons", "A different number of electrons", "One is an ion"]),
      hint: "Same element means same protons. What else is in the nucleus?",
      explain: `Too many or too few neutrons for the number of protons makes a nucleus unstable, so ${lower(s)}-${radio} decays.`,
    });
  }
  if (kind === 1) {
    const [sym, A] = pick([...ALPHA_PARENTS, ...BETA_PARENTS]);
    const ask = pick(["protons", "neutrons"] as const);
    return q({
      key: `nuc-count-${sym}${A}-${ask}`,
      prompt: `How many ${ask} are in the nucleus of ${iso(sym, A)}?`,
      ans: keypad(ask === "protons" ? zOf(sym) : A - zOf(sym)),
      hint: "Top number: mass number (protons + neutrons). Bottom number: atomic number (protons).",
      explain: `${zOf(sym)} protons and ${A} − ${zOf(sym)} = ${A - zOf(sym)} neutrons.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Protons repel each other. What holds the nucleus together?", "The strong nuclear force", ["Gravity", "Electrons", "Magnetism"]],
    ["In a nuclear change, unlike a chemical change…", "the nucleus changes, so the element can change", ["only electrons move", "no energy is released", "atoms are conserved as the same elements"]],
    ["Which releases far more energy per gram?", "Nuclear reactions", ["Chemical reactions", "They release the same", "Neither releases energy"]],
    ["Why does a radioactive isotope give off radiation?", "Its nucleus is unstable and changes to a more stable one", ["Its electrons are excited", "It is very hot", "It is an ion"]],
    ["Is radioactive decay affected by temperature or by chemical bonding?", "No: it depends only on the nucleus", ["Yes, heat speeds it up a lot", "Yes, bonds stop it", "Only pressure affects it"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `nuc-fact-${i}`, prompt, ans: label(right, wrong), hint: "Chemistry is about electrons; nuclear changes are about protons and neutrons.", explain: `${right[0].toUpperCase()}${right.slice(1)}.` });
}

/** HS-PS1-8 — alpha, beta and gamma radiation. */
export function radiationTypes(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const d = pick(["alpha", "beta", "alpha", "beta", "gamma"] as Decay[]);
    const [sym, A] = d === "alpha" ? pick(ALPHA_PARENTS) : d === "beta" ? pick(BETA_PARENTS) : d === "positron" ? pick(POSITRON_PARENTS) : pick([["Tc", 99], ["Co", 60], ["Ba", 137], ["Ni", 60]] as [string, number][]);
    return q({
      key: `rad-type-${d}-${sym}${A}`,
      prompt: "What kind of decay is this?",
      visual: decayPic(sym, A, d, undefined, false, false),
      needsVisual: true,
      ans: label(DECAY_NAME[d], Object.values(DECAY_NAME).filter((x) => x !== DECAY_NAME[d])),

      hint: "Look at the small particle given off and at how A (top) and Z (bottom) change.",
      explain: `${DECAY_NAME[d]}: ${d === "alpha" ? "A drops by 4 and Z by 2" : d === "beta" ? "A stays the same and Z goes up by 1" : d === "positron" ? "A stays the same and Z goes down by 1" : "nothing changes but energy is released"}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Which radiation is stopped by a sheet of paper?", "Alpha", ["Beta", "Gamma", "All of them"]],
    ["Which radiation needs thick lead or concrete to stop it?", "Gamma", ["Alpha", "Beta", "None of them"]],
    ["What is an alpha particle?", "2 protons and 2 neutrons (a helium nucleus)", ["A fast electron", "High-energy light", "A single neutron"]],
    ["What is a beta particle?", "A fast electron made in the nucleus", ["A helium nucleus", "A photon of light", "A proton"]],
    ["What is gamma radiation?", "High-energy electromagnetic radiation", ["A helium nucleus", "A fast electron", "A neutron"]],
    ["In beta decay, a neutron in the nucleus turns into…", "a proton and an electron", ["two protons", "an alpha particle", "a gamma ray only"]],
    ["Which radiation has no charge and no mass?", "Gamma", ["Alpha", "Beta", "Positron"]],
    ["Why is alpha radiation most dangerous if swallowed, but harmless outside the body?", "It ionizes strongly but can't get through skin", ["It's the most penetrating", "It has no charge", "It turns into gamma inside"]],
    ["Smoke detectors use americium-241, an alpha emitter. Why is that safe?", "Alpha can't get out through the detector's case", ["Alpha is harmless", "It emits only light", "It isn't radioactive"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `rad-fact-${i}`, prompt, ans: label(right, wrong), hint: "Alpha: big, +2, stopped by paper. Beta: electron, −1, stopped by aluminum. Gamma: light, no charge, needs lead.", explain: `${right}.` });
}

/** HS-PS1-8 — alpha decay. */
export function alphaDecay(): Question {
  const kind = rand(0, 3);
  const [sym, A] = pick(ALPHA_PARENTS);
  const [s2, A2] = daughter(sym, A, "alpha");
  const z2 = zOf(s2);
  if (kind === 0) {
    return q({
      key: `alpha-sym-${sym}${A}`,
      prompt: `${nameOf(sym)}-${A} gives off an alpha particle. What element does it become?`,
      visual: decayPic(sym, A, "alpha", "symbol"),
      ans: label(`${nameOf(s2)} (${s2})`, [shift(sym, -1), shift(sym, 2), shift(sym, -4), sym].map((s) => `${nameOf(s)} (${s})`)),
      hint: "An alpha particle carries away 2 protons. Count 2 back on the periodic table.",
      explain: `${zOf(sym)} − 2 = ${z2}: ${lower(s2)}. ${iso(sym, A)} → ${iso(s2, A2)} + ⁴₂He.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `alpha-A-${sym}${A}`,
      prompt: "What is the mass number of the new nucleus?",
      speech: `${nameOf(sym)}-${A} undergoes alpha decay. What is the mass number of the new nucleus?`,
      visual: decayPic(sym, A, "alpha", "A"),
      needsVisual: true,
      ans: keypad(A2, [A - 2, A, A - 1]),
      hint: "Mass numbers must add up the same on both sides. The alpha particle has mass number 4.",
      explain: `${A} = ? + 4, so ? = ${A2}.`,
    });
  }
  if (kind === 2) {
    return q({
      key: `alpha-Z-${sym}${A}`,
      prompt: "What is the atomic number of the new nucleus?",
      speech: `${nameOf(sym)}-${A} undergoes alpha decay. What is the atomic number of the new nucleus?`,
      visual: decayPic(sym, A, "alpha", "Z"),
      needsVisual: true,
      ans: keypad(z2, [zOf(sym) - 4, zOf(sym) - 1, zOf(sym)]),
      hint: "Atomic numbers must add up the same on both sides. The alpha particle has atomic number 2.",
      explain: `${zOf(sym)} = ? + 2, so ? = ${z2} (${s2}).`,
    });
  }
  return q({
    key: `alpha-rule-${sym}`,
    prompt: "In alpha decay, how do the mass number (A) and atomic number (Z) change?",
    visual: decayPic(sym, A, "alpha"),
    ans: label("A goes down 4, Z goes down 2", ["A goes down 2, Z goes down 4", "A stays the same, Z goes up 1", "A goes down 4, Z stays the same"]),
    hint: "The alpha particle is ⁴₂He: it takes 4 nucleons, 2 of them protons.",
    explain: `${iso(sym, A)} → ${iso(s2, A2)} + ⁴₂He: A drops by 4 and Z by 2.`,
  });
}

/** HS-PS1-8 — beta decay. */
export function betaDecay(): Question {
  const kind = rand(0, 3);
  const [sym, A] = pick(BETA_PARENTS);
  const [s2] = daughter(sym, A, "beta");
  if (kind === 0) {
    return q({
      key: `beta-sym-${sym}${A}`,
      prompt: `${nameOf(sym)}-${A} undergoes beta decay. What does it become?`,
      visual: decayPic(sym, A, "beta", "symbol"),
      ans: label(`${nameOf(s2)}-${A}`, [...(zOf(sym) > 1 ? [`${nameOf(shift(sym, -1))}-${A}`] : []), `${nameOf(sym)}-${A - 1}`, ...(zOf(sym) > 2 ? [`${nameOf(shift(sym, -2))}-${A - 4}`] : []), `${nameOf(s2)}-${A + 1}`]),
      hint: "A neutron turns into a proton (and the electron flies out). One more proton → next element; same mass number.",
      explain: `${iso(sym, A)} → ${iso(s2, A)} + ⁰₋₁e. Z goes up by 1; A stays ${A}.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `beta-Z-${sym}${A}`,
      prompt: "What is the atomic number of the new nucleus?",
      speech: `${nameOf(sym)}-${A} undergoes beta decay. What is the atomic number of the new nucleus?`,
      visual: decayPic(sym, A, "beta", "Z"),
      needsVisual: true,
      ans: keypad(zOf(s2), [zOf(sym) - 1, zOf(sym), zOf(sym) + 2]),
      hint: "The beta particle has atomic number −1. Atomic numbers on both sides must balance.",
      explain: `${zOf(sym)} = ? + (−1), so ? = ${zOf(s2)}.`,
    });
  }
  if (kind === 2) {
    const [ps, pA] = pick(POSITRON_PARENTS);
    const [d2] = daughter(ps, pA, "positron");
    return q({
      key: `beta-pos-${ps}${pA}`,
      prompt: `${nameOf(ps)}-${pA} (used in PET scans) emits a positron, ⁰₊₁e: a proton turns into a neutron. What does it become?`,
      ans: label(`${nameOf(d2)}-${pA}`, [`${nameOf(shift(ps, 1))}-${pA}`, `${nameOf(ps)}-${pA - 1}`, `${nameOf(d2)}-${pA - 1}`]),
      hint: "A positron is like a positive electron: a proton becomes a neutron, so Z goes DOWN by 1.",
      explain: `${iso(ps, pA)} → ${iso(d2, pA)} + ⁰₊₁e.`,
    });
  }
  return q({
    key: `beta-rule-${sym}`,
    prompt: "In beta decay, how do the mass number (A) and atomic number (Z) change?",
    visual: decayPic(sym, A, "beta"),
    ans: label("A stays the same, Z goes up 1", ["A goes down 4, Z goes down 2", "A goes up 1, Z stays the same", "A stays the same, Z goes down 1"]),
    hint: "A neutron becomes a proton: the total number of nucleons doesn't change.",
    explain: `${iso(sym, A)} → ${iso(s2, A)} + ⁰₋₁e.`,
  });
}

/** HS-PS1-8 — balancing nuclear equations (missing particles and nuclei). */
export function nuclearEquations(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const d = pick(["alpha", "beta", "gamma", "alpha", "beta"] as Decay[]);
    const [sym, A] = d === "alpha" ? pick(ALPHA_PARENTS) : d === "beta" ? pick(BETA_PARENTS) : pick([["Tc", 99], ["Co", 60], ["Ba", 137], ["Ni", 60]] as [string, number][]);
    const [s2, A2] = daughter(sym, A, d);
    return q({
      key: `neq-part-${d}-${sym}${A}`,
      prompt: `${iso(sym, A)} → ${iso(s2, A2)} + ?   What is the missing particle?`,
      visual: decayPic(sym, A, d, undefined, true, false),
      needsVisual: true,
      ans: label(PARTICLE_TEXT[d], Object.values(PARTICLE_TEXT).filter((x) => x !== PARTICLE_TEXT[d])),
      hint: "Find what's missing from the top numbers (mass) and the bottom numbers (charge) on the right.",
      explain: `Missing: A = ${A - A2}, Z = ${zOf(sym) - zOf(s2)}. That's ${PARTICLE_TEXT[d].toLowerCase()}.`,
    });
  }
  if (kind === 1) {
    const f = pick(FISSION);
    const which = rand(0, 1);
    const [s, A] = f.products[which];
    return q({
      key: `neq-fis-${f.products.map((p) => p.join("")).join("")}-${which}`,
      prompt: "Balance the mass numbers. What is the missing mass number?",
      speech: "In this fission, what is the missing mass number?",
      visual: { kind: "chem-nucleus", before: [{ particle: "neutron" }, { element: "U", A: 235 }], after: [...f.products.map(([ps, pA], i) => ({ element: ps, A: pA, ...(i === which ? { ask: "A" as const } : {}) })), { particle: "neutron", count: f.n }], balls: false, change: "fission" },
      needsVisual: true,
      ans: keypad(A, [A + f.n, A - 1, 236 - A]),
      hint: `Left side: 1 + 235 = 236. Right side: the other nucleus + ${f.n} neutrons + ?`,
      explain: `236 − ${f.products[1 - which][1]} − ${f.n} = ${A} (${nameOf(s)}-${A}).`,
    });
  }
  const fu = pick(FUSION);
  return q({
    key: `neq-fus-${fu.label}`,
    prompt: `In this fusion reaction, what is the missing product?`,
    visual: { kind: "chem-nucleus", before: fu.before, after: fu.after.map((n, i) => (i === fu.ask ? { ...n, ask: "symbol" as const } : n)), change: "fusion" },
    needsVisual: true,
    ans: label(fu.answer, fu.wrong),
    hint: "Add the top numbers and the bottom numbers on the left; the right must match.",
    explain: `${fu.label}.`,
  });
}

/** HS-PS1-8 — Do it: sort properties of alpha, beta and gamma radiation. */
export function sortRadiation(): Question {
  const pool: [string, number][] = [
    ["Helium nucleus (2p + 2n)", 0], ["Charge +2", 0], ["Stopped by paper", 0], ["Mass number 4", 0], ["Most ionizing", 0],
    ["Fast electron from the nucleus", 1], ["Charge −1", 1], ["Stopped by a few mm of aluminum", 1], ["Made when a neutron becomes a proton", 1],
    ["Electromagnetic wave", 2], ["No charge and no mass", 2], ["Needs thick lead or concrete", 2], ["Most penetrating", 2],
  ];
  const items = [0, 1, 2].flatMap((b) => pickN(pool.filter(([, x]) => x === b), 2)).map(([l, bin]) => ({ label: l, bin }));
  const shuffled = shuffle(items);
  return q({
    key: `sortrad-${shuffled.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort each property: alpha, beta or gamma?",
    ans: act({ kind: "sort", bins: ["Alpha (α)", "Beta (β)", "Gamma (γ)"], items: shuffled }, shuffled.length),
    hint: "Alpha = ⁴₂He, beta = ⁰₋₁e, gamma = ⁰₀γ (pure energy).",
    explain: shuffled.map((i) => `${i.label}: ${["alpha", "beta", "gamma"][i.bin]}`).join("; ") + ".",
  });
}

const HALF_LIVES: { name: string; T: number; unit: string }[] = [
  { name: "carbon-14", T: 5730, unit: "years" }, { name: "iodine-131", T: 8, unit: "days" }, { name: "cobalt-60", T: 5.3, unit: "years" },
  { name: "strontium-90", T: 29, unit: "years" }, { name: "cesium-137", T: 30, unit: "years" }, { name: "technetium-99m", T: 6, unit: "hours" },
  { name: "radon-222", T: 3.8, unit: "days" }, { name: "phosphorus-32", T: 14, unit: "days" }, { name: "hydrogen-3 (tritium)", T: 12.3, unit: "years" },
  { name: "fluorine-18", T: 110, unit: "minutes" }, { name: "polonium-210", T: 138, unit: "days" }, { name: "radium-226", T: 1600, unit: "years" },
];
const FRAC = ["1", "1/2", "1/4", "1/8", "1/16", "1/32"];

/** HS-PS1-8 — half-life calculations. */
export function halfLife(): Question {
  const kind = rand(0, 4);
  const h = pick(HALF_LIVES);
  const n = rand(1, 4);
  if (kind === 0) {
    const m0 = pick([80, 64, 120, 200, 160, 48, 96]);
    return q({
      key: `hl-mass-${h.name}-${m0}-${n}`,
      prompt: `${h.name[0].toUpperCase()}${h.name.slice(1)} has a half-life of ${h.T} ${h.unit}. How much of a ${m0} g sample is left after ${clean(n * h.T)} ${h.unit}?`,
      ans: keypad(m0 / 2 ** n, [m0 / 2, m0 / (2 * n), m0 - (m0 / 2) * n].filter((x) => x > 0)),
      unit: "g",
      hint: `${clean(n * h.T)} ÷ ${h.T} = ${n} half-lives. Halve the mass ${n} time${n === 1 ? "" : "s"}.`,
      explain: `${m0} → ${Array.from({ length: n }, (_, k) => clean(m0 / 2 ** (k + 1))).join(" → ")} g.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `hl-time-${h.name}-${n}`,
      prompt: `How long until only ${FRAC[n]} of a ${h.name} sample remains? (half-life ${h.T} ${h.unit})`,
      ans: keypad(clean(n * h.T)),
      unit: h.unit,
      hint: `${FRAC[n]} means halving ${n} time${n === 1 ? "" : "s"}.`,
      explain: `${n} half-lives × ${h.T} = ${clean(n * h.T)} ${h.unit}.`,
    });
  }
  if (kind === 2) {
    const T = pick([2, 3, 4, 5, 6, 8, 10, 12]);
    const m0 = pick([80, 160, 64, 96]);
    return q({
      key: `hl-find-${T}-${m0}-${n}`,
      prompt: `A sample drops from ${m0} g to ${m0 / 2 ** n} g in ${n * T} days. What is its half-life?`,
      ans: keypad(T, [n * T, (n * T) / 2]),
      unit: "days",
      hint: `How many times was ${m0} halved to get ${m0 / 2 ** n}? Share the time equally between those half-lives.`,
      explain: `${m0} → ${m0 / 2 ** n} is ${n} half-li${n === 1 ? "fe" : "ves"}; ${n * T} ÷ ${n} = ${T} days.`,
    });
  }
  if (kind === 3) {
    return q({
      key: `hl-frac-${n}`,
      prompt: `What fraction of a radioactive sample is left after ${n} half-li${n === 1 ? "fe" : "ves"}?`,
      ans: label(FRAC[n], FRAC.slice(1).filter((f) => f !== FRAC[n]).concat([`1/${2 * n}`])),
      hint: "Each half-life halves what's left: 1 → 1/2 → 1/4 → …",
      explain: `(1/2)${sup(String(n))} = ${FRAC[n]}.`,
    });
  }
  const k = rand(1, 4);
  return q({
    key: `hl-date-${k}`,
    prompt: `A wooden tool has ${FRAC[k]} of the carbon-14 found in living wood. About how old is it? (half-life 5,730 years)`,
    ans: keypad(5730 * k, [5730, 5730 * (k + 1)]),
    unit: "years",
    hint: `${FRAC[k]} remains after ${k} half-li${k === 1 ? "fe" : "ves"}.`,
    explain: `${k} × 5,730 = ${(5730 * k).toLocaleString("en-US")} years.`,
  });
}

/** HS-PS1-8 — reading decay curves. */
export function halfLifeGraphs(): Question {
  const kind = rand(0, 2);
  const [X, T] = pick([[16, 4], [16, 2], [40, 10], [40, 5], [80, 20], [80, 10]] as [number, number][]);
  const N0 = pick([40, 80, 160]);
  const unit = pick(["days", "hours", "years"]);
  const plot: Visual = { kind: "plot", x: [0, X], y: [0, N0], xLabel: `time (${unit})`, yLabel: "mass left (g)", curves: [{ fn: (t: number) => N0 * 0.5 ** (t / T), colour: "berry" }] };
  if (kind === 0) {
    return q({
      key: `hlg-T-${X}-${T}-${N0}-${unit}`,
      prompt: "What is the half-life of this isotope?",
      visual: plot,
      needsVisual: true,
      ans: choose(T, [T * 2, T / 2, T * 3].filter((x) => x <= X), T / 2),
      unit,
      hint: `Start at ${N0} g. Find when the curve reaches ${N0 / 2} g.`,
      explain: `It falls from ${N0} g to ${N0 / 2} g in ${T} ${unit}, then to ${N0 / 4} g after ${2 * T}.`,
    });
  }
  if (kind === 1) {
    const k = rand(1, 3);
    return q({
      key: `hlg-m-${X}-${T}-${N0}-${k}`,
      prompt: `How much is left after ${k * T} ${unit}?`,
      visual: plot,
      needsVisual: true,
      ans: choose(N0 / 2 ** k, [N0 / 2 ** (k + 1), N0 / 2 ** (k - 1), N0 - (N0 / 4) * k].filter((x) => x > 0)),
      unit: "g",
      hint: `Read up from ${k * T} on the time axis to the curve.`,
      explain: `${k * T} ${unit} is ${k} half-li${k === 1 ? "fe" : "ves"}: ${N0} ÷ ${2 ** k} = ${N0 / 2 ** k} g.`,
    });
  }
  return q({
    key: `hlg-shape-${X}-${T}-${N0}`,
    prompt: "Why does the curve never quite reach zero?",
    visual: plot,
    ans: label("Each half-life only halves what's left", ["The isotope stops decaying", "The graph is wrong", "New atoms are made"]),
    hint: "Half of a half of a half… is still something.",
    explain: "Every half-life removes half of what remains, so the amount keeps halving but never hits exactly zero.",
  });
}

/** HS-PS1-8 — Do it: plot a decay curve. */
export function plotDecay(): Question {
  const h = pick(HALF_LIVES.filter((x) => Number.isInteger(x.T / 2) || x.T % 1 === 0));
  const sq = pick([1, 2]);
  const per = clean(h.T / sq);
  const pts = [0, 1, 2, 3].map((k) => ({ x: k * sq, y: 8 / 2 ** k, label: k === 0 ? "start" : `${k} half-li${k === 1 ? "fe" : "ves"}` }));
  return q({
    key: `plotdec-${h.name}-${sq}`,
    prompt: `A sample of ${h.name} (half-life ${h.T} ${h.unit}) starts at 80 g. Plot the mass at the start and after 1, 2 and 3 half-lives. Across: 1 square = ${per} ${h.unit}. Up: 1 square = 10 g.`,
    ans: act({ kind: "plotPoints", points: pts, size: 8, quadrants: 1 }, 4),
    hint: `Each half-life moves ${sq} square${sq === 1 ? "" : "s"} right and halves the mass: 80, 40, 20, 10 g.`,
    explain: `Points: (0, 8), (${sq}, 4), (${2 * sq}, 2), (${3 * sq}, 1) in squares: 80 → 40 → 20 → 10 g.`,
  });
}

const FISSION: { products: [string, number][]; n: number }[] = [
  { products: [["Ba", 141], ["Kr", 92]], n: 3 }, { products: [["Xe", 140], ["Sr", 94]], n: 2 }, { products: [["Cs", 137], ["Rb", 96]], n: 3 },
  { products: [["Te", 137], ["Zr", 97]], n: 2 }, { products: [["La", 146], ["Br", 87]], n: 3 },
];
const FUSION: { before: Nuclide[]; after: Nuclide[]; ask: number; answer: string; wrong: string[]; label: string }[] = [
  { before: [{ element: "H", A: 2 }, { element: "H", A: 3 }], after: [{ element: "He", A: 4 }, { particle: "neutron" }], ask: 0, answer: "Helium-4", wrong: ["Helium-3", "Lithium-5", "Hydrogen-4"], label: "²₁H + ³₁H → ⁴₂He + ¹₀n" },
  { before: [{ element: "H", A: 2 }, { element: "H", A: 2 }], after: [{ element: "He", A: 3 }, { particle: "neutron" }], ask: 0, answer: "Helium-3", wrong: ["Helium-4", "Hydrogen-3", "Lithium-3"], label: "²₁H + ²₁H → ³₂He + ¹₀n" },
  { before: [{ element: "H", A: 1 }, { element: "H", A: 2 }], after: [{ element: "He", A: 3 }, { particle: "gamma" }], ask: 0, answer: "Helium-3", wrong: ["Helium-4", "Hydrogen-3", "Lithium-3"], label: "¹₁H + ²₁H → ³₂He + γ" },
  { before: [{ element: "He", A: 3 }, { element: "He", A: 3 }], after: [{ element: "He", A: 4 }, { particle: "proton", count: 2 }], ask: 0, answer: "Helium-4", wrong: ["Beryllium-6", "Helium-6", "Lithium-4"], label: "³₂He + ³₂He → ⁴₂He + 2 ¹₁p" },
  { before: [{ element: "H", A: 2 }, { element: "H", A: 3 }], after: [{ element: "He", A: 4 }, { particle: "neutron" }], ask: 1, answer: "A neutron, ¹₀n", wrong: ["A proton, ¹₁p", "An electron, ⁰₋₁e", "A gamma ray, ⁰₀γ"], label: "²₁H + ³₁H → ⁴₂He + ¹₀n" },
];

/** HS-PS1-8 — nuclear fission. */
export function fission(): Question {
  const kind = rand(0, 2);
  const f = pick(FISSION);
  if (kind === 0) {
    const which = rand(0, 1);
    const [s, A] = f.products[which];
    const wrongs = [shift(s, 1), shift(s, -1), shift(s, 2)].map((x) => `${nameOf(x)} (${x})`);
    return q({
      key: `fis-sym-${s}${A}`,
      prompt: "A neutron splits uranium-235. Which element is the missing fragment?",
      visual: { kind: "chem-nucleus", before: [{ particle: "neutron" }, { element: "U", A: 235 }], after: [...f.products.map(([ps, pA], i) => ({ element: ps, A: pA, ...(i === which ? { ask: "symbol" as const } : {}) })), { particle: "neutron", count: f.n }], balls: false, change: "fission" },
      needsVisual: true,
      ans: label(`${nameOf(s)} (${s})`, wrongs),
      hint: `Atomic numbers must add to 92. The other fragment is ${nameOf(f.products[1 - which][0])} (Z = ${zOf(f.products[1 - which][0])}).`,
      explain: `92 − ${zOf(f.products[1 - which][0])} = ${zOf(s)}: ${lower(s)}.`,
    });
  }
  if (kind === 1) {
    return q({
      key: `fis-n-${f.products[0][0]}`,
      prompt: `¹₀n + ²³⁵₉₂U → ${iso(f.products[0][0], f.products[0][1])} + ${iso(f.products[1][0], f.products[1][1])} + ? neutrons. How many neutrons are released?`,
      ans: keypad(f.n, [1, f.n + 1]),
      hint: "Mass numbers: 1 + 235 = 236 on the left. Subtract both fragments.",
      explain: `236 − ${f.products[0][1]} − ${f.products[1][1]} = ${f.n} neutrons. These can split more nuclei: a chain reaction.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["What starts the fission of uranium-235?", "A neutron hitting the nucleus", ["Heating it to a million degrees", "An electron", "Sunlight"]],
    ["Why can fission become a chain reaction?", "Each fission releases neutrons that split more nuclei", ["The fragments fuse back together", "It makes more uranium", "It absorbs energy"]],
    ["What do control rods in a reactor do?", "Absorb neutrons to slow the chain reaction", ["Add more uranium", "Cool the steam", "Make the reaction go faster"]],
    ["Where does the energy of fission come from?", "A tiny amount of mass is converted to energy (E = mc²)", ["Burning uranium in oxygen", "Breaking chemical bonds", "The neutron's speed only"]],
    ["What is a disadvantage of fission power?", "Radioactive waste that lasts thousands of years", ["It releases lots of CO₂", "It only works in the Sun", "It produces very little energy"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `fis-fact-${i}`, prompt, ans: label(right, wrong), hint: "Fission splits a heavy nucleus into two medium ones plus neutrons and energy.", explain: `${right}.` });
}

/** HS-PS1-8 — nuclear fusion. */
export function fusion(): Question {
  const kind = rand(0, 1);
  if (kind === 0) {
    const fu = pick(FUSION);
    return q({
      key: `fus-${fu.label}-${fu.ask}`,
      prompt: "What is the missing product of this fusion reaction?",
      visual: { kind: "chem-nucleus", before: fu.before, after: fu.after.map((n, i) => (i === fu.ask ? { ...n, ask: "symbol" as const } : n)), change: "fusion" },
      needsVisual: true,
      ans: label(fu.answer, fu.wrong),
      hint: "Add the mass numbers and atomic numbers on the left; the right must match.",
      explain: `${fu.label}.`,
    });
  }
  const facts: [string, string, string[]][] = [
    ["Where does the Sun get its energy?", "Fusing hydrogen nuclei into helium", ["Burning hydrogen gas", "Splitting uranium", "Chemical reactions of carbon"]],
    ["Why does fusion need temperatures of millions of degrees?", "Nuclei must move fast enough to overcome their electric repulsion", ["To melt the hydrogen", "To make neutrons", "To stop the chain reaction"]],
    ["In fusion, the products have slightly LESS mass than the reactants. Where did it go?", "It became energy (E = mc²)", ["It was destroyed", "It escaped as air", "It became electrons"]],
    ["Why is fusion power hard to build on Earth?", "It's very hard to hold plasma hot and dense enough", ["Fuel is impossible to find", "It makes too much CO₂", "It only works with uranium"]],
    ["Which is a fuel for fusion reactors?", "Deuterium and tritium (heavy hydrogen)", ["Uranium-235", "Coal", "Plutonium-239"]],
    ["Fusion vs fission: which joins nuclei together?", "Fusion", ["Fission", "Both", "Neither"]],
    ["Why are only light nuclei (like hydrogen) used for fusion power?", "Joining light nuclei releases energy; joining heavy ones would absorb it", ["Heavy nuclei can't move", "Light nuclei are radioactive", "Hydrogen has no protons"]],
    ["What waste does deuterium–tritium fusion mainly make?", "Helium, which is harmless", ["Long-lived uranium waste", "Carbon dioxide", "Smoke and ash"]],
  ];
  const i = rand(0, facts.length - 1);
  const [prompt, right, wrong] = facts[i];
  return q({ key: `fus-fact-${i}`, prompt, ans: label(right, wrong), hint: "Fusion joins light nuclei; a little mass becomes a lot of energy.", explain: `${right}.` });
}

/** HS-PS1-8 — Do it: sort statements about fission and fusion. */
export function sortFissionFusion(): Question {
  const pool: [string, number][] = [
    ["Splits a heavy nucleus", 0], ["Used in today's nuclear power plants", 0], ["Uses uranium-235", 0], ["Started by a neutron hitting a nucleus", 0], ["Can run as a chain reaction", 0], ["Leaves long-lived radioactive waste", 0],
    ["Joins light nuclei", 1], ["Powers the Sun and stars", 1], ["Needs millions of degrees", 1], ["Uses isotopes of hydrogen", 1], ["Makes helium", 1],
    ["Turns a little mass into energy", 2], ["Releases far more energy than burning fuel", 2], ["Changes one element into another", 2],
  ];
  const items = [pickN(pool.filter(([, b]) => b === 0), 3), pickN(pool.filter(([, b]) => b === 1), 3), pickN(pool.filter(([, b]) => b === 2), 1)].flat().map(([l, bin]) => ({ label: l, bin }));
  const shuffled = shuffle(items);
  return q({
    key: `sortff-${shuffled.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort each statement: fission, fusion, or both?",
    ans: act({ kind: "sort", bins: ["Fission", "Fusion", "Both"], items: shuffled }, shuffled.length),
    hint: "Fission splits heavy nuclei; fusion joins light ones. Both turn a little mass into a lot of energy.",
    explain: shuffled.map((i) => `${i.label}: ${["fission", "fusion", "both"][i.bin]}`).join("; ") + ".",
  });
}
