/**
 * Question generators for AP Chemistry units 6–9 (ages 16–18): thermochemistry, equilibrium, acids and bases, and
 * applications of thermodynamics. Worlds and levels are assembled in ./ages16to18ap2.ts.
 *
 * Conventions
 * - Numbers that the kid types are rounded the way the prompt asks (sig figs, decimal places or the nearest kJ),
 *   and the answer is computed from the rounded data that is shown, so it matches what a careful student gets.
 * - Answers in scientific notation (K, Ksp, Ka) are choices, since the keypad has no exponent key.
 * - Negative decimals can't be typed (the keypad has one extra key), so those become number choices.
 */
import { REDUCTION_POTENTIALS } from "../../science/elements";
import { labelChoices, pick, rand, shuffle } from "../../questions";
import type { Activity, Question, Visual } from "../../types";

/* ====================================================================== helpers */

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra" | "activity">;
interface Spec {
  key: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  unit?: string;
  hint: string;
  explain: string;
}

const NONE: Visual = { kind: "none" };

/** Remove floating-point noise. */
export const clean = (x: number) => Math.round(x * 1e9) / 1e9;
/** Round to n significant figures. */
export const sig = (x: number, n: number) => (x === 0 ? 0 : clean(Number(x.toPrecision(n))));
/** Round to n decimal places. */
export const dp = (x: number, n = 0) => clean(Math.round(x * 10 ** n) / 10 ** n);

/** A number as text with a real minus sign; `places` fixes the decimal places. */
export function num(x: number, places?: number): string {
  const a = places === undefined ? String(clean(Math.abs(x))) : Math.abs(x).toFixed(places);
  return (x < 0 && Number(a) !== 0 ? "−" : "") + a;
}
/** With a + sign for positive values (enthalpy changes). */
export const sgn = (x: number, places?: number) => (x > 0 ? "+" : "") + num(x, places);
/** A number to n significant figures, as text (keeps trailing zeros, no exponent). */
export function sf(x: number, n: number): string {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  return num(Number(x.toPrecision(n)), Math.max(0, n - 1 - e));
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const supNum = (k: number) => (k < 0 ? "⁻" : "") + [...String(Math.abs(k))].map((d) => SUP[+d]).join("");
/** Scientific notation with n significant figures: "1.8 × 10⁻⁵". */
export function sci(x: number, n = 2): string {
  if (x === 0) return "0";
  let e = Math.floor(Math.log10(Math.abs(x)));
  let m = Number((x / 10 ** e).toPrecision(n));
  if (Math.abs(m) >= 10) {
    m /= 10;
    e += 1;
  }
  if (e === 0) return num(m, n - 1);
  return `${num(m, n - 1)} × 10${supNum(e)}`;
}
/** log10 */
const lg = Math.log10;

/** Turn on-screen chemistry text into words for the voice (the speech helper does formulas, units and arrows). */
export function talk(s: string): string {
  return s
    .replace(/×\s?10([⁻]?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, neg: string, d: string) => ` times 10 to the ${neg ? "minus " : ""}${[...d].map((c) => SUP.indexOf(c)).join("")}`)
    .replace(/kJ\/mol/g, "kilojoules per mole")
    .replace(/J\/\(mol·K\)/g, "joules per mole kelvin")
    .replace(/J\/\(g·°C\)/g, "joules per gram degree Celsius")
    .replace(/J\/K/g, "joules per kelvin")
    .replace(/kJ\/K/g, "kilojoules per kelvin")
    .replace(/\bKsp\b/g, "K s p")
    .replace(/\bpKa\b/g, "p K a")
    .replace(/\bpKb\b/g, "p K b")
    .replace(/\bKa\b/g, "K a")
    .replace(/\bKb\b/g, "K b")
    .replace(/\bKw\b/g, "K w")
    .replace(/\bKp\b/g, "K p")
    .replace(/\bKc\b/g, "K c")
    .replace(/\bpOH\b/g, "p O H")
    .replace(/\bpH\b/g, "p H")
    .replace(/([HSGE])°/g, "$1 naught")
    .replace(/\[([^\]]+)\]/g, " the concentration of $1 ")
    .replace(/ln K/g, "natural log of K")
    .replace(/·/g, " ");
}

function Q(s: Spec & Answer): Question {
  return { ...s, visual: s.visual ?? NONE, speech: s.speech ?? talk(s.prompt) };
}

/** Number choices: the answer, likely mistakes, then neighbours `step` apart. */
function numChoices(answer: number, wrong: number[], step: number, n = 4): number[] {
  const out: number[] = [clean(answer)];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < n && Number.isFinite(v) && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < n && k < 60; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return shuffle(out);
}
/** Pick from number choices. */
export const nums = (answer: number, wrong: number[], step = 1): Answer => ({ answer: clean(answer), input: "choices", choices: numChoices(answer, wrong, step) });
/**
 * Type the answer. Whole numbers always get a "−" key when `signed` (so the sign isn't given away); positive
 * decimals get "."; negative decimals become choices (the keypad has only one extra key).
 */
export function key(answer: number, signed = false, wrong: number[] = []): Answer {
  const a = clean(answer);
  if (!Number.isInteger(a)) {
    if (a < 0) {
      const step = Math.abs(a) >= 10 ? 1 : Math.abs(a) >= 1 ? 0.1 : 0.01;
      return nums(a, [-a, ...wrong], step);
    }
    return { answer: a, input: "keypad", keypadExtra: "." };
  }
  if (a < 0 || signed) return { answer: a, input: "keypad", keypadExtra: "−" };
  return { answer: a, input: "keypad" };
}
/** Soft hyphens in long words, so text choices on a phone break between syllables instead of anywhere. */
const HYPHENS: [RegExp, string][] = [
  [/ndothermic/g, "ndo\u00ADthermic"],
  [/xothermic/g, "xo\u00ADthermic"],
  [/urroundings/g, "urround\u00ADings"],
  [/aporization/g, "apor\u00ADization"],
  [/emperature/g, "empera\u00ADture"],
  [/recipitate/g, "recipi\u00ADtate"],
  [/oncentration/g, "oncen\u00ADtration"],
  [/olubilit/g, "olubil\u00ADit"],
  [/quilibrium/g, "qui\u00ADlibrium"],
  [/lectronegativ/g, "lectro\u00ADnegativ"],
  [/henolphthalein/g, "henol\u00ADphthalein"],
  [/pontaneous/g, "ponta\u00ADneous"],
  [/lectrolytic/g, "lectro\u00ADlytic"],
  [/ntermediate/g, "nter\u00ADmediate"],
  [/hermodynamically/g, "hermo\u00ADdynamically"],
  [/oefficient/g, "oeffi\u00ADcient"],
  [/aporize/g, "apor\u00ADize"],
];
/** Let long formulas break between terms ([A][B], P(A)P(B), A/B, m·c) rather than mid-symbol. */
export const breakable = (s: string) =>
  HYPHENS.reduce((x, [re, to]) => x.replace(re, to), s)
    .replace(/([\])][²³⁴]?)(?=[[(P])/g, "$1\u200B")
    .replace(/(\S)\/(?=\S)/g, "$1/\u200B")
    .replace(/(\S)·(?=\S)/g, "$1\u200B·");

/** Text choices; wrong ones are shuffled and the first 3 used. */
export function lab(correct: string, wrong: string[]): Answer {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong));
  return { answer, input: "choices", choices, labels: labels.map(breakable) };
}
/** A hands-on activity. */
export const act = (activity: Activity, answer = 1): Answer => ({ answer, input: "activity", activity });

/** Pick one of several question makers at random. */
export const mix =
  (...makers: (() => Question)[]) =>
  () =>
    pick(makers)();

/** n different random items. */
const some = <T>(items: readonly T[], n: number): T[] => shuffle(items).slice(0, n);

const table = (header: string[], rows: (string | number)[][]): Visual => ({ kind: "table", header, rows });

/* ==================================================================== equations */

type State = "s" | "l" | "g" | "aq";
interface Term {
  coef?: number;
  formula: string;
  state?: State;
}
const t = (formula: string, coef = 1, state?: State): Term => ({ formula, coef, state });
const termText = (x: Term) => `${x.coef && x.coef > 1 ? x.coef : ""}${x.formula}${x.state ? `(${x.state})` : ""}`;
/** "CH₄ + 2O₂ → CO₂ + 2H₂O" */
export const eqText = (r: Term[], p: Term[], arrow = "→") => `${r.map(termText).join(" + ")} ${arrow} ${p.map(termText).join(" + ")}`;
const reaction = (r: Term[], p: Term[], extra: { dH?: number | string | null; arrow?: "→" | "⇌"; above?: string } = {}): Visual => ({
  kind: "chem-reaction",
  reactants: r,
  products: p,
  ...extra,
});

/* ============================================================ unit 6: thermochemistry */

const ENDO = "Endothermic (ΔH > 0)";
const EXO = "Exothermic (ΔH < 0)";

const PROCESSES: { label: string; endo: boolean; why: string }[] = [
  { label: "🧊 Ice melts", endo: true, why: "melting takes in energy to overcome the attractions between molecules" },
  { label: "💧 Steam condenses", endo: false, why: "molecules attracting each other as they come together release energy" },
  { label: "🔥 Methane burns", endo: false, why: "combustion forms strong C=O and O–H bonds, releasing energy" },
  { label: "✂️ An H–H bond breaks", endo: true, why: "breaking any bond takes energy" },
  { label: "🔗 O–H bonds form", endo: false, why: "forming a bond always releases energy" },
  { label: "🌿 Photosynthesis", endo: true, why: "plants store the energy of light in glucose" },
  { label: "❄️ Water freezes", endo: false, why: "freezing releases energy as the molecules lock into place" },
  { label: "😓 Sweat evaporates", endo: true, why: "evaporation takes energy from your skin" },
  { label: "🌫️ Dry ice sublimes", endo: true, why: "separating molecules into a gas takes energy" },
  { label: "🪨 CaCO₃ decomposes when heated", endo: true, why: "it needs a steady input of heat to keep going" },
  { label: "🫁 Cellular respiration", endo: false, why: "it releases the energy stored in glucose" },
  { label: "⚡ Na(g) → Na⁺(g) + e⁻", endo: true, why: "removing an electron (ionization) always takes energy" },
  { label: "🧲 Na⁺(g) + Cl⁻(g) → NaCl(s)", endo: false, why: "oppositely charged ions coming together release lattice energy" },
  { label: "🧯 Thermite reaction", endo: false, why: "it releases so much heat that the iron made is molten" },
  { label: "🥶 Cold pack: NH₄NO₃ dissolves", endo: true, why: "the pack gets cold because dissolving takes heat from the water" },
  { label: "♨️ Hot pack: CaCl₂ dissolves", endo: false, why: "the pack gets warm because dissolving releases heat" },
];

const IN_WATER: { what: string; endo: boolean }[] = [
  { what: "dissolve ammonium nitrate, NH₄NO₃,", endo: true },
  { what: "dissolve calcium chloride, CaCl₂,", endo: false },
  { what: "dissolve sodium hydroxide, NaOH,", endo: false },
  { what: "dissolve potassium nitrate, KNO₃,", endo: true },
  { what: "dissolve ammonium chloride, NH₄Cl,", endo: true },
  { what: "mix HCl(aq) with NaOH(aq)", endo: false },
  { what: "add magnesium ribbon to HCl(aq)", endo: false },
  { what: "add baking soda (NaHCO₃) to citric acid solution", endo: true },
];

interface Rxn {
  r: Term[];
  p: Term[];
  dH: number;
}
const RXNS: Rxn[] = [
  { r: [t("CH₄", 1, "g"), t("O₂", 2, "g")], p: [t("CO₂", 1, "g"), t("H₂O", 2, "l")], dH: -890 },
  { r: [t("N₂", 1, "g"), t("H₂", 3, "g")], p: [t("NH₃", 2, "g")], dH: -92 },
  { r: [t("CaCO₃", 1, "s")], p: [t("CaO", 1, "s"), t("CO₂", 1, "g")], dH: 178 },
  { r: [t("N₂", 1, "g"), t("O₂", 1, "g")], p: [t("NO", 2, "g")], dH: 181 },
  { r: [t("H₂", 2, "g"), t("O₂", 1, "g")], p: [t("H₂O", 2, "l")], dH: -572 },
  { r: [t("NH₃", 2, "g")], p: [t("N₂", 1, "g"), t("H₂", 3, "g")], dH: 92 },
  { r: [t("Mg", 2, "s"), t("O₂", 1, "g")], p: [t("MgO", 2, "s")], dH: -1204 },
  { r: [t("CO₂", 6, "g"), t("H₂O", 6, "l")], p: [t("C₆H₁₂O₆", 1, "s"), t("O₂", 6, "g")], dH: 2803 },
];

function endoBeaker(): Question {
  const c = pick(IN_WATER);
  const t1 = rand(19, 24);
  const d = rand(3, 14);
  const t2 = c.endo ? t1 - d : t1 + d;
  const right = c.endo ? "Endothermic: ΔH > 0" : "Exothermic: ΔH < 0";
  return Q({
    key: `beaker-${c.what}-${t1}-${t2}`,
    prompt: `You ${c.what} in water. The thermometer goes from ${t1} °C to ${t2} °C. Which describes the process?`,
    visual: {
      kind: "chem-beaker",
      panels: [
        { glass: "beaker", volume: 100, thermometer: t1, label: "Before" },
        { glass: "beaker", volume: 100, thermometer: t2, label: "After", colour: "clear" },
      ],
    },
    needsVisual: false,
    ...lab(right, ["Exothermic: ΔH < 0", "Endothermic: ΔH > 0", "Endothermic: ΔH < 0", "Exothermic: ΔH > 0"].filter((x) => x !== right)),
    hint: "The water is the surroundings. If the water warms, the process gave it heat (exothermic, ΔH < 0). If it cools, the process took heat (endothermic, ΔH > 0).",
    explain: `The water ${c.endo ? "cooled" : "warmed"} by ${d} °C, so heat flowed ${c.endo ? "from the water into the process" : "out of the process into the water"}: ${right}.`,
  });
}

function endoClassify(): Question {
  const p = pick(PROCESSES);
  return Q({
    key: `cls-${p.label}`,
    prompt: `${p.label}. Is this process endothermic or exothermic?`,
    ...lab(p.endo ? ENDO : EXO, [p.endo ? EXO : ENDO]),
    hint: "Ask: does the system take in energy (endothermic) or give it out (exothermic)? Breaking bonds or attractions takes energy; forming them releases it.",
    explain: `${p.endo ? "Endothermic" : "Exothermic"}: ${p.why}.`,
  });
}

function endoFlow(): Question {
  const c = pick(IN_WATER);
  const into = "Energy flowed from the surroundings into the system";
  const out = "Energy flowed from the system into the surroundings";
  return Q({
    key: `flow-${c.what}`,
    prompt: `You ${c.what} in a flask of water, and the flask feels ${c.endo ? "cold" : "warm"} in your hand. Taking the dissolved substances as the system, which is true?`,
    ...lab(c.endo ? into : out, [c.endo ? out : into, "Cold flowed from the system into your hand", "No energy moved; only the temperature changed"]),
    hint: "Your hand and the water are the surroundings. Cold means they lost energy; warm means they gained it.",
    explain: c.endo
      ? "The flask feels cold because the system took energy from the water and your hand: endothermic, ΔH > 0."
      : "The flask feels warm because the system released energy into the water and your hand: exothermic, ΔH < 0.",
  });
}

function endoBonds(): Question {
  const rx = pick(RXNS);
  const exo = rx.dH < 0;
  const right = exo ? "More energy is released forming product bonds than is absorbed breaking reactant bonds" : "More energy is absorbed breaking reactant bonds than is released forming product bonds";
  const wrong = exo ? "More energy is absorbed breaking reactant bonds than is released forming product bonds" : "More energy is released forming product bonds than is absorbed breaking reactant bonds";
  return Q({
    key: `bonds-${rx.dH}`,
    prompt: `For this reaction ΔH = ${sgn(rx.dH)} kJ. Which explains the sign of ΔH?`,
    visual: reaction(rx.r, rx.p, { dH: rx.dH }),
    ...lab(right, [wrong, "Breaking bonds releases energy, and forming bonds absorbs it", exo ? "The products have more enthalpy than the reactants" : "The products have less enthalpy than the reactants"]),
    hint: "Breaking bonds always takes energy; forming bonds always releases it. ΔH is the balance of the two.",
    explain: `ΔH = (energy to break bonds) − (energy released forming bonds) = ${sgn(rx.dH)} kJ, so ${right.toLowerCase()}.`,
  });
}

export const endoExo = mix(endoBeaker, endoClassify, endoClassify, endoFlow, endoBonds);

/* ---------- Do it: sort the heat */

const PHASES: { label: string; endo: boolean }[] = [
  { label: "Melting", endo: true },
  { label: "Freezing", endo: false },
  { label: "Vaporization", endo: true },
  { label: "Condensation", endo: false },
  { label: "Sublimation", endo: true },
  { label: "Deposition", endo: false },
];

function sortProcesses(): Question {
  const items = some(PROCESSES, 6);
  return Q({
    key: `sort-${items.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort each process: does it absorb energy (endothermic) or release energy (exothermic)?",
    speech: "Sort each process into endothermic or exothermic.",
    ...act({ kind: "sort", bins: [ENDO, EXO], items: items.map((i) => ({ label: i.label, bin: i.endo ? 0 : 1 })) }, items.length),
    hint: "Breaking bonds or pulling particles apart takes energy. Forming bonds or bringing particles together releases it.",
    explain: items.map((i) => `${i.label}: ${i.endo ? "endothermic" : "exothermic"}`).join("; ") + ".",
  });
}

function sortPhases(): Question {
  const extra = some(PROCESSES, 2);
  const items = [...some(PHASES, 4), ...extra];
  return Q({
    key: `phase-${items.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort these changes by the sign of ΔH for the system.",
    ...act({ kind: "sort", bins: ["ΔH > 0 (absorbs energy)", "ΔH < 0 (releases energy)"], items: items.map((i) => ({ label: i.label, bin: i.endo ? 0 : 1 })) }, items.length),
    hint: "Going solid → liquid → gas pulls particles apart, which absorbs energy. The reverse changes release the same amount.",
    explain: "Melting, vaporization and sublimation absorb energy (ΔH > 0); freezing, condensation and deposition release it (ΔH < 0).",
  });
}

function orderHeatingSteps(): Question {
  const m = pick([10, 20, 25, 50]);
  const ti = pick([10, 20, 30]);
  const ts = pick([10, 20, 30]);
  const steps = [
    { label: "Warm the ice to 0 °C", q: m * 2.09 * ti },
    { label: "Melt the ice", q: m * 334 },
    { label: "Warm the water to 100 °C", q: m * 4.18 * 100 },
    { label: "Boil the water", q: m * 2260 },
    { label: `Warm the steam to ${100 + ts} °C`, q: m * 2.01 * ts },
  ].sort((a, b) => a.q - b.q);
  if (new Set(steps.map((s) => Math.round(s.q))).size < 5) return orderHeatingSteps();
  return Q({
    key: `order-${m}-${ti}-${ts}`,
    prompt: `${m} g of ice at −${ti} °C is heated to steam at ${100 + ts} °C. Put the steps in order of the energy they need, least first.`,
    visual: table(["Data", "Value"], [["c(ice)", "2.09 J/(g·°C)"], ["c(water)", "4.18 J/(g·°C)"], ["c(steam)", "2.01 J/(g·°C)"], ["ΔHfus", "334 J/g"], ["ΔHvap", "2260 J/g"]]),
    ...act({ kind: "order", items: steps.map((s) => s.label), direction: "least energy first" }, 5),
    hint: "Use q = mcΔT for warming and q = m·ΔH for a phase change. Vaporization is by far the biggest.",
    explain: steps.map((s) => `${s.label}: ${sf(s.q, 3)} J`).join("; ") + ".",
  });
}

export const sortHeat = mix(sortProcesses, sortProcesses, sortPhases, orderHeatingSteps);

/* ---------- energy diagrams */

function levels() {
  const R = rand(2, 12) * 10;
  let P = rand(1, 14) * 10;
  while (P === R) P = rand(1, 14) * 10;
  const peak = Math.max(R, P) + rand(3, 10) * 10;
  return { R, P, peak };
}

function diagramDH(): Question {
  const { R, P, peak } = levels();
  const dH = P - R;
  return Q({
    key: `dh-${R}-${P}-${peak}`,
    prompt: "Read the energy diagram. What is ΔH for the reaction?",
    visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, labels: { reactants: R, products: P, dH: "?", ea: null } },
    needsVisual: true,
    unit: "kJ",
    ...key(dH, true),
    hint: "ΔH = H(products) − H(reactants). Products below reactants means ΔH is negative.",
    explain: `ΔH = ${P} − ${R} = ${sgn(dH)} kJ, so the reaction is ${dH < 0 ? "exothermic" : "endothermic"}.`,
  });
}

function diagramEa(): Question {
  const { R, P, peak } = levels();
  const reverse = Math.random() < 0.5;
  const ea = reverse ? peak - P : peak - R;
  return Q({
    key: `ea-${R}-${P}-${peak}-${reverse}`,
    prompt: `The top of the hump is at ${peak} kJ. What is the activation energy of the ${reverse ? "reverse" : "forward"} reaction?`,
    visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, labels: { reactants: R, products: P, ea: reverse ? null : "?", dH: null } },
    needsVisual: true,
    unit: "kJ",
    ...key(ea),
    hint: `Activation energy is measured from where the reaction starts up to the top of the hump. The ${reverse ? "reverse reaction starts at the products" : "forward reaction starts at the reactants"}.`,
    explain: `Ea(${reverse ? "reverse" : "forward"}) = ${peak} − ${reverse ? P : R} = ${ea} kJ.`,
  });
}

function diagramCatalyst(): Question {
  const { R, P, peak } = levels();
  const hi = Math.max(R, P);
  const steps = (peak - hi) / 10;
  if (steps < 2) return diagramCatalyst();
  const cat = hi + 10 * rand(1, steps - 1);
  if (Math.random() < 0.5) {
    return Q({
      key: `cat-${R}-${P}-${peak}-${cat}`,
      prompt: `The dashed path is the same reaction with a catalyst; its hump peaks at ${cat} kJ. What is the forward activation energy with the catalyst?`,
      visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, catalyst: cat, labels: { reactants: R, products: P, ea: null, dH: null } },
      needsVisual: true,
      unit: "kJ",
      ...key(cat - R, false),
      hint: "Measure from the reactants' level up to the top of the catalysed (dashed) hump.",
      explain: `Ea = ${cat} − ${R} = ${cat - R} kJ, down from ${peak - R} kJ without the catalyst. ΔH is still ${sgn(P - R)} kJ.`,
    });
  }
  const right = "Ea is lower; ΔH is unchanged";
  return Q({
    key: `catc-${R}-${P}-${peak}-${cat}`,
    prompt: "The dashed path shows the reaction with a catalyst. What does the catalyst change?",
    visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, catalyst: cat, labels: { reactants: "Reactants", products: "Products" } },
    needsVisual: true,
    ...lab(right, ["ΔH is lower; Ea is unchanged", "Both Ea and ΔH are lower", "The products' energy is lower"]),
    hint: "A catalyst gives a new pathway with a lower hump. The start and end levels don't move.",
    explain: "The catalyst lowers the activation energy (both forward and reverse), but reactants and products keep the same enthalpy, so ΔH doesn't change.",
  });
}

function diagramCompare(): Question {
  const { R, P, peak } = levels();
  const exo = P < R;
  const right = exo ? "Exothermic; the reverse Ea is larger" : "Endothermic; the forward Ea is larger";
  return Q({
    key: `cmp-${R}-${P}-${peak}`,
    prompt: "Which statement describes this reaction?",
    visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, labels: { reactants: "Reactants", products: "Products", ea: null, dH: null } },
    needsVisual: true,
    ...lab(right, ["Exothermic; the reverse Ea is larger", "Exothermic; the forward Ea is larger", "Endothermic; the forward Ea is larger", "Endothermic; the reverse Ea is larger"].filter((x) => x !== right)),
    hint: "Compare the two ends first (ΔH). Then compare the climb to the top from each end.",
    explain: `Products are ${exo ? "below" : "above"} reactants, so it is ${exo ? "exothermic" : "endothermic"}. Ea(reverse) = Ea(forward) − ΔH, so the ${exo ? "reverse" : "forward"} climb is longer.`,
  });
}

function diagramSteps(): Question {
  const R = rand(3, 8) * 10;
  const v = R + rand(-2, 3) * 10;
  const P = rand(0, 6) * 10;
  const p1 = Math.max(R, v) + rand(3, 10) * 10;
  const p2 = Math.max(v, P) + rand(3, 10) * 10;
  const ea1 = p1 - R;
  const ea2 = p2 - v;
  if (Math.abs(ea1 - ea2) < 20 || v === P || v <= 0) return diagramSteps();
  const slow = ea1 > ea2 ? 1 : 2;
  return Q({
    key: `steps-${R}-${v}-${P}-${p1}-${p2}`,
    prompt: `A two-step mechanism: reactants ${R} kJ, intermediate ${v} kJ, products ${P} kJ; the humps peak at ${p1} and ${p2} kJ. Which step is rate-determining?`,
    visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peaks: [p1, p2], valleys: [v], showEa: false, showDH: false, labels: { reactants: R, products: P } },
    needsVisual: true,
    ...lab(`Step ${slow}`, [`Step ${3 - slow}`, "Both steps equally"]),
    hint: "The slow step has the bigger climb. Measure each step's Ea from where that step starts (reactants for step 1, the intermediate for step 2).",
    explain: `Ea(step 1) = ${p1} − ${R} = ${ea1} kJ; Ea(step 2) = ${p2} − ${v} = ${ea2} kJ. Step ${slow} has the larger activation energy, so it is the slow, rate-determining step.`,
  });
}

export const energyDiagrams = mix(diagramDH, diagramEa, diagramCatalyst, diagramCompare, diagramSteps);

/* ---------- heat transfer and thermal equilibrium */

const METALS: { name: string; c: number }[] = [
  { name: "aluminum", c: 0.897 },
  { name: "iron", c: 0.449 },
  { name: "copper", c: 0.385 },
  { name: "lead", c: 0.129 },
  { name: "silver", c: 0.235 },
];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function mixWater(): Question {
  const m1 = pick([50, 100, 150, 200]);
  let m2 = pick([50, 100, 150, 200, 250]);
  if (m1 === m2) m2 = 250;
  const T1 = rand(12, 18) * 5;
  const T2 = rand(10, 25);
  const tf = dp((m1 * T1 + m2 * T2) / (m1 + m2), 1);
  return Q({
    key: `mix-${m1}-${m2}-${T1}-${T2}`,
    prompt: `${m1} g of water at ${T1} °C is poured into ${m2} g of water at ${T2} °C in an insulated cup. What is the final temperature (°C, to 0.1 °C)?`,
    visual: {
      kind: "chem-beaker",
      panels: [
        { glass: "beaker", volume: m1, max: 250, thermometer: T1, label: `${m1} g`, colour: "berry" },
        { glass: "beaker", volume: m2, max: 250, thermometer: T2, label: `${m2} g`, colour: "wave" },
      ],
      joiner: "+",
    },
    unit: "°C",
    ...key(tf),
    hint: "Heat lost by the hot water = heat gained by the cold water: m₁c(T₁ − Tf) = m₂c(Tf − T₂). The c cancels.",
    explain: `Tf = (${m1} × ${T1} + ${m2} × ${T2}) ÷ (${m1} + ${m2}) = ${num(tf, 1)} °C. It's nearer ${m1 > m2 ? T1 : T2} °C because there is more of that water.`,
  });
}

function metalWater(): Question {
  const m = pick(METALS);
  const mm = pick([25.0, 50.0, 75.0, 100.0]);
  const Tm = rand(16, 20) * 5;
  const mw = pick([50.0, 100.0, 150.0]);
  const Tw = rand(18, 24);
  const tf = dp((mm * m.c * Tm + mw * 4.18 * Tw) / (mm * m.c + mw * 4.18), 1);
  return Q({
    key: `metal-${m.name}-${mm}-${Tm}-${mw}-${Tw}`,
    prompt: `A ${num(mm, 1)} g block of ${m.name} (c = ${m.c} J/(g·°C)) at ${Tm} °C is dropped into ${num(mw, 1)} g of water (c = 4.18 J/(g·°C)) at ${Tw} °C. What is the final temperature (°C, to 0.1 °C)?`,
    visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: mw, max: 250, thermometer: Tw, label: "Water before" }] },
    unit: "°C",
    ...key(tf),
    hint: "Set heat lost by the metal equal to heat gained by the water: m(metal)c(metal)(Tm − Tf) = m(water)c(water)(Tf − Tw), then solve for Tf.",
    explain: `Tf = (${mm} × ${m.c} × ${Tm} + ${mw} × 4.18 × ${Tw}) ÷ (${mm} × ${m.c} + ${mw} × 4.18) = ${num(tf, 1)} °C. Water's large c keeps Tf close to ${Tw} °C.`,
  });
}

function biggerChange(): Question {
  const [a, b] = some(METALS, 2);
  const lo = a.c < b.c ? a : b;
  const m = pick([50, 100, 200]);
  const qJ = pick([500, 1000, 2000]);
  return Q({
    key: `bigger-${a.name}-${b.name}-${m}-${qJ}`,
    prompt: `${m} g of ${a.name} (c = ${a.c}) and ${m} g of ${b.name} (c = ${b.c} J/(g·°C)) each absorb ${qJ} J. Which has the larger temperature rise?`,
    ...lab(cap(lo.name), [cap(lo === a ? b.name : a.name), "Both rise the same amount", "You need to know the starting temperatures"]),
    hint: "ΔT = q ÷ (mc). Same q and same m, so the smaller c gives the bigger ΔT.",
    explain: `ΔT(${a.name}) = ${qJ} ÷ (${m} × ${a.c}) = ${sf(qJ / (m * a.c), 3)} °C; ΔT(${b.name}) = ${sf(qJ / (m * b.c), 3)} °C. ${cap(lo.name)} has the smaller specific heat, so it warms more.`,
  });
}

const CONTACTS = ["A hot iron nail is dropped into cool water", "An ice cube floats in warm juice", "A cold spoon is placed in hot soup", "A warm hand holds a cold can", "A hot pan is set on a cool counter"];

function heatFlowIdea(): Question {
  const c = pick(CONTACTS);
  if (Math.random() < 0.5) {
    const right = "Energy moves from the warmer object to the cooler one until their temperatures are equal";
    return Q({
      key: `flow-${c}`,
      prompt: `${c}. Which describes the energy transfer?`,
      ...lab(right, ["Cold moves from the cooler object into the warmer one", "Energy moves until both objects have the same thermal energy", "Energy moves from the bigger object to the smaller one"]),
      hint: "Heat is energy moving because of a temperature difference. It stops when there is no difference left.",
      explain: "Faster-moving particles of the warmer object collide with slower ones and pass on kinetic energy until the average kinetic energies (temperatures) match: thermal equilibrium.",
    });
  }
  const right = "The average kinetic energy of their particles";
  return Q({
    key: `eq-${c}`,
    prompt: `${c}. Once they reach thermal equilibrium, what is the same for both?`,
    ...lab(right, ["Their total thermal energy", "Their heat capacity", "The heat each one has absorbed"]),
    hint: "Temperature measures the average kinetic energy of the particles.",
    explain: "At thermal equilibrium the temperatures are equal, so the average kinetic energy of the particles is equal. The total energy depends on mass and c, so it can still differ.",
  });
}

export const heatTransfer = mix(mixWater, metalWater, biggerChange, heatFlowIdea);

/* ---------- calorimetry */

function qWater(): Question {
  const m = pick([25.0, 50.0, 75.0, 100.0, 150.0, 200.0]);
  const t1 = rand(18, 25);
  const d = rand(4, 30) * (Math.random() < 0.3 ? -1 : 1);
  const t2 = t1 + d;
  const qkJ = sig((m * 4.18 * Math.abs(d)) / 1000, 3);
  return Q({
    key: `qw-${m}-${t1}-${t2}`,
    prompt: `${num(m, 1)} g of water goes from ${t1} °C to ${t2} °C. How much heat did it ${d > 0 ? "gain" : "lose"}? Give kJ to 3 significant figures (c = 4.18 J/(g·°C)).`,
    visual: {
      kind: "chem-beaker",
      panels: [
        { glass: "beaker", volume: m, max: 250, thermometer: t1, label: "Start" },
        { glass: "beaker", volume: m, max: 250, thermometer: t2, label: "End" },
      ],
      joiner: "→",
    },
    unit: "kJ",
    ...key(qkJ),
    hint: "q = mcΔT. Use ΔT = final − initial, then divide joules by 1000 for kJ.",
    explain: `q = ${num(m, 1)} g × 4.18 J/(g·°C) × ${Math.abs(d)} °C = ${sf(m * 4.18 * Math.abs(d), 4)} J ≈ ${sf(qkJ, 3)} kJ.`,
  });
}

const SUBST = [
  { name: "water", c: 4.18 },
  { name: "ethanol", c: 2.44 },
  { name: "aluminum", c: 0.897 },
  { name: "iron", c: 0.449 },
  { name: "copper", c: 0.385 },
];

function deltaT(): Question {
  const s = pick(SUBST);
  const m = pick([20.0, 25.0, 40.0, 50.0, 80.0, 100.0]);
  const qJ = rand(5, 40) * 100;
  const dT = sig(qJ / (m * s.c), 3);
  return Q({
    key: `dt-${s.name}-${m}-${qJ}`,
    prompt: `${qJ} J of heat is added to ${num(m, 1)} g of ${s.name} (c = ${s.c} J/(g·°C)). By how many °C does it warm? Give 3 significant figures.`,
    unit: "°C",
    ...key(dT),
    hint: "Rearrange q = mcΔT to ΔT = q ÷ (mc).",
    explain: `ΔT = ${qJ} ÷ (${num(m, 1)} × ${s.c}) = ${sf(dT, 3)} °C.`,
  });
}

function whichMetal(): Question {
  const m = pick(METALS);
  const mass = rand(4, 20) * 5;
  const dT = rand(10, 40);
  const qJ = Math.round(m.c * mass * dT);
  const lbl = (x: { name: string; c: number }) => `${cap(x.name)} (${x.c})`;
  return Q({
    key: `which-${m.name}-${mass}-${dT}`,
    prompt: `A ${mass}.0 g metal sample absorbs ${qJ} J and warms by ${dT}.0 °C. Which metal is it?`,
    visual: table(["Metal", "c (J/(g·°C))"], METALS.map((x) => [cap(x.name), x.c])),
    ...lab(lbl(m), METALS.filter((x) => x !== m).map(lbl)),
    hint: "Find c = q ÷ (mΔT), then match it to the table.",
    explain: `c = ${qJ} ÷ (${mass}.0 × ${dT}.0) = ${sf(qJ / (mass * dT), 3)} J/(g·°C), which matches ${m.name}.`,
  });
}

function neutralization(): Question {
  const V = pick([25.0, 50.0, 100.0]);
  const M = pick([0.5, 1.0, 2.0]);
  const n = (V / 1000) * M;
  const m = 2 * V;
  const t1 = dp(rand(200, 240) / 10, 1);
  const dT = dp((57100 * n) / (m * 4.18), 1);
  const dH = Math.round(-(m * 4.18 * dT) / n / 1000);
  return Q({
    key: `neut-${V}-${M}-${t1}`,
    prompt: `${num(V, 1)} mL of ${num(M, 2)} M HCl and ${num(V, 1)} mL of ${num(M, 2)} M NaOH, both at ${num(t1, 1)} °C, are mixed in a coffee-cup calorimeter. The temperature rises to ${num(t1 + dT, 1)} °C. Find ΔH in kJ per mole of water formed, to the nearest kJ. (Solution: 1.00 g/mL, c = 4.18 J/(g·°C).)`,
    visual: {
      kind: "chem-beaker",
      panels: [
        { glass: "beaker", volume: 2 * V > 250 ? 250 : 2 * V, max: 250, thermometer: t1, label: "Mixed" },
        { glass: "beaker", volume: 2 * V > 250 ? 250 : 2 * V, max: 250, thermometer: dp(t1 + dT, 1), label: "Final" },
      ],
      joiner: "→",
    },
    unit: "kJ/mol",
    ...key(dH, true),
    hint: "q(solution) = mcΔT with m = total volume × 1.00 g/mL. Moles of water = moles of HCl. ΔH = −q ÷ n (negative because the solution warmed).",
    explain: `q = ${m} g × 4.18 × ${num(dT, 1)} = ${sf(m * 4.18 * dT, 4)} J; n = ${num(V / 1000, 4)} L × ${num(M, 2)} M = ${num(n, 4)} mol; ΔH = −${sf(m * 4.18 * dT, 4)} J ÷ ${num(n, 4)} mol ≈ ${num(dH)} kJ/mol.`,
  });
}

const SALTS = [
  { f: "NH₄NO₃", M: 80.04, dH: 25.7 },
  { f: "CaCl₂", M: 110.98, dH: -81.3 },
  { f: "NaOH", M: 40.0, dH: -44.5 },
  { f: "KNO₃", M: 101.1, dH: 34.9 },
  { f: "NH₄Cl", M: 53.49, dH: 14.8 },
  { f: "LiCl", M: 42.39, dH: -37.0 },
];

function dissolveCal(): Question {
  const s = pick(SALTS);
  const g = pick([2.0, 4.0, 5.0, 8.0, 10.0]);
  const m = 100 + g;
  const n = g / s.M;
  const t1 = rand(20, 24);
  const dT = dp((-s.dH * 1000 * n) / (m * 4.18), 1);
  const dH = Math.round(-(m * 4.18 * dT) / n / 1000);
  return Q({
    key: `diss-${s.f}-${g}-${t1}`,
    prompt: `${num(g, 2)} g of ${s.f} (${s.M} g/mol) dissolves in 100.0 g of water. The temperature goes from ${t1}.0 °C to ${num(t1 + dT, 1)} °C. Find ΔH of solution in kJ/mol, to the nearest kJ. (Use the total mass and c = 4.18 J/(g·°C).)`,
    visual: {
      kind: "chem-beaker",
      panels: [
        { glass: "beaker", volume: 100, thermometer: t1, label: "Water" },
        { glass: "beaker", volume: 100, thermometer: dp(t1 + dT, 1), label: `+ ${s.f}` },
      ],
      joiner: "→",
    },
    unit: "kJ/mol",
    ...key(dH, true),
    hint: "q(solution) = mcΔT. The salt's ΔH has the opposite sign to the solution's q: if the water cools, ΔH is positive.",
    explain: `q = ${num(m, 1)} × 4.18 × (${num(dT, 1)}) = ${sf(m * 4.18 * dT, 3)} J; n = ${num(g, 2)} ÷ ${s.M} = ${sf(n, 3)} mol; ΔH = −q ÷ n ≈ ${sgn(dH)} kJ/mol (${dH > 0 ? "endothermic: the water cooled" : "exothermic: the water warmed"}).`,
  });
}

const CAL_IDEAS: { prompt: string; right: string; wrong: string[]; why: string }[] = [
  {
    prompt: "A coffee-cup calorimeter has no lid, so some heat escapes into the air during an exothermic reaction. How does this affect the measured |ΔH|?",
    right: "It is too small",
    wrong: ["It is too large", "No effect, because heat lost is not part of ΔH", "It changes sign"],
    why: "Lost heat never warms the water, so ΔT and q come out too small, making |ΔH| too small.",
  },
  {
    prompt: "Why do chemists use a polystyrene (styrofoam) cup for a coffee-cup calorimeter?",
    right: "It is a good insulator, so almost all the heat stays in the solution",
    wrong: ["It reacts with neither acids nor bases", "It has a very large specific heat", "It speeds up the reaction"],
    why: "Calorimetry assumes q(reaction) = −q(solution), which needs the cup to let almost no heat in or out.",
  },
  {
    prompt: "In calorimetry, why is q(reaction) = −q(solution)?",
    right: "Energy is conserved: heat released by the reaction is gained by the solution",
    wrong: ["The solution and reaction always have the same temperature", "Heat is destroyed in the reaction", "The specific heat of the reaction is negative"],
    why: "With an insulated calorimeter, energy only moves between the reaction (system) and the solution (surroundings), so their q values are equal and opposite.",
  },
  {
    prompt: "A student used 50.0 mL of solution but recorded the mass as 25.0 g in q = mcΔT. How does this affect the calculated |ΔH|?",
    right: "It is too small",
    wrong: ["It is too large", "No effect", "It changes sign"],
    why: "q is proportional to m, so using half the mass halves q and |ΔH|.",
  },
];

function calIdea(): Question {
  const c = pick(CAL_IDEAS);
  return Q({
    key: `idea-${c.prompt.slice(0, 30)}`,
    prompt: c.prompt,
    ...lab(c.right, c.wrong),
    hint: "Follow the heat: q(solution) = mcΔT, and ΔH = −q(solution) ÷ n.",
    explain: c.why,
  });
}

export const calorimetry = mix(qWater, qWater, deltaT, whichMetal, neutralization, dissolveCal, calIdea);

/* ---------- Do it: specific heat */

const C_ALL = [
  { name: "Water", c: 4.18 },
  { name: "Ethanol", c: 2.44 },
  { name: "Glass", c: 0.84 },
  { name: "Aluminum", c: 0.897 },
  { name: "Iron", c: 0.449 },
  { name: "Copper", c: 0.385 },
  { name: "Lead", c: 0.129 },
];

function orderRise(): Question {
  const set = some(C_ALL, 4).sort((a, b) => b.c - a.c);
  const m = pick([50, 100, 200]);
  return Q({
    key: `rise-${m}-${set.map((s) => s.name).join("")}`,
    prompt: `${m} g of each substance absorbs 1000 J. Order them by temperature rise, smallest rise first.`,
    visual: table(["Substance", "c (J/(g·°C))"], set.map((s) => [s.name, s.c])),
    ...act({ kind: "order", items: set.map((s) => s.name), direction: "smallest temperature rise first" }, 4),
    hint: "ΔT = q ÷ (mc). With the same q and m, the largest specific heat gives the smallest ΔT.",
    explain: set.map((s) => `${s.name}: ${sf(1000 / (m * s.c), 3)} °C`).join("; ") + ".",
  });
}

function orderHeat(): Question {
  const set = some(C_ALL, 4).map((s) => ({ ...s, m: pick([20, 50, 100, 200, 500]) }));
  const q = set.map((s) => s.m * s.c * 10);
  const sorted = [...q].sort((a, b) => a - b);
  if (sorted.some((v, i) => i > 0 && v / sorted[i - 1] < 1.08)) return orderHeat();
  const ordered = set.map((s, i) => ({ ...s, q: q[i] })).sort((a, b) => b.q - a.q);
  return Q({
    key: `heat-${ordered.map((s) => `${s.m}${s.name}`).join("")}`,
    prompt: "Each sample is warmed by 10 °C. Order them by the heat needed, most first.",
    visual: table(["Sample", "c (J/(g·°C))"], set.map((s) => [`${s.m} g ${s.name.toLowerCase()}`, s.c])),
    ...act({ kind: "order", items: ordered.map((s) => `${s.m} g ${s.name.toLowerCase()}`), direction: "most heat first" }, 4),
    hint: "q = mcΔT. ΔT is the same for all, so compare m × c.",
    explain: ordered.map((s) => `${s.m} g ${s.name.toLowerCase()}: ${sf(s.q, 3)} J`).join("; ") + ".",
  });
}

function measureLiquid(): Question {
  if (Math.random() < 0.5) {
    const g = rand(15, 48) * 2;
    return Q({
      key: `water-${g}`,
      prompt: `Your calorimeter needs ${g}.0 g of water. Water's density is 1.00 g/mL. Measure it in the cylinder.`,
      ...act({ kind: "chem-measure", mode: "fill", glass: "cylinder", target: g, max: 100, step: 2, colour: "clear" }, g),
      hint: "V = m ÷ d. Read the cylinder at the bottom of the meniscus.",
      explain: `V = ${g}.0 g ÷ 1.00 g/mL = ${g} mL.`,
    });
  }
  const V = rand(3, 9) * 10;
  const g = sf(V * 0.789, 3);
  return Q({
    key: `eth-${V}`,
    prompt: `You need ${g} g of ethanol (density 0.789 g/mL). Measure the right volume in the cylinder.`,
    ...act({ kind: "chem-measure", mode: "fill", glass: "cylinder", target: V, max: 100, step: 2, colour: "sun" }, V),
    hint: "V = m ÷ d.",
    explain: `V = ${g} g ÷ 0.789 g/mL = ${V} mL.`,
  });
}

function weighBlock(): Question {
  const metal = pick([
    { name: "aluminum", c: 0.9, emoji: "🧱" },
    { name: "iron", c: 0.45, emoji: "🔩" },
  ]);
  const m = rand(4, 30) * 5;
  const C = sf(m * metal.c, 3);
  return Q({
    key: `weigh-${metal.name}-${m}`,
    prompt: `You need a block of ${metal.name} (c = ${num(metal.c, 3)} J/(g·°C)) with a heat capacity of ${C} J/°C. Find its mass, then weigh it out.`,
    ...act({ kind: "chem-measure", mode: "balance", mass: m, emoji: metal.emoji }, m),
    hint: "Heat capacity C = mc, so m = C ÷ c.",
    explain: `m = ${C} J/°C ÷ ${num(metal.c, 3)} J/(g·°C) = ${m} g.`,
  });
}

export const specificHeat = mix(orderRise, orderHeat, measureLiquid, weighBlock);

/* ---------- phase-change energy */

const SEG_EQ = ["q = m·c(solid)·ΔT", "q = n·ΔHfus", "q = m·c(liquid)·ΔT", "q = n·ΔHvap", "q = m·c(gas)·ΔT"];
const SEG_NAME = ["Solid", "Melting", "Liquid", "Boiling", "Gas"];
const CURVES = [
  { name: "water", melt: 0, boil: 100, start: -30, end: 130 },
  { name: "ethanol", melt: -114, boil: 78, start: -140, end: 100 },
  { name: "benzene", melt: 6, boil: 80, start: -20, end: 110 },
];

function curveSegment(): Question {
  const c = pick(CURVES);
  const i = rand(0, 4);
  const labels = SEG_NAME.map((n, j) => (j === i ? "?" : n)) as [string, string, string, string, string];
  const flat = i === 1 || i === 3;
  if (Math.random() < 0.5) {
    return Q({
      key: `seg-${c.name}-${i}`,
      prompt: `Heating curve of ${c.name}. Which equation gives the heat absorbed in the segment marked "?"?`,
      visual: { kind: "chem-energy", mode: "heating", ...c, labels, title: `Heating ${c.name}` },
      needsVisual: true,
      ...lab(SEG_EQ[i], SEG_EQ.filter((_, j) => j !== i)),
      hint: "Sloped parts change temperature (q = mcΔT, with that phase's c). Flat parts are phase changes (q = n·ΔH).",
      explain: `The "?" segment is ${SEG_NAME[i].toLowerCase()}${flat ? `, a flat phase change at ${i === 1 ? c.melt : c.boil} °C` : ", a sloped section"}: ${SEG_EQ[i]}.`,
    });
  }
  const right = flat ? "It stays the same; the energy overcomes attractions between molecules" : "It increases as the temperature rises";
  return Q({
    key: `ke-${c.name}-${i}`,
    prompt: `Heating curve of ${c.name}. During the segment marked "?", what happens to the average kinetic energy of the molecules?`,
    visual: { kind: "chem-energy", mode: "heating", ...c, labels, title: `Heating ${c.name}` },
    needsVisual: true,
    ...lab(right, ["It stays the same; the energy overcomes attractions between molecules", "It increases as the temperature rises", "It decreases because energy is being absorbed"].filter((x) => x !== right)),
    hint: "Temperature measures average kinetic energy. Is the line flat or rising in that segment?",
    explain: flat
      ? "The line is flat, so the temperature (average KE) doesn't change: the energy goes into breaking intermolecular attractions (raising potential energy)."
      : "The line rises, so the temperature and the average kinetic energy increase.",
  });
}

function meltBoil(): Question {
  const boil = Math.random() < 0.5;
  const m = pick([9.0, 10.0, 15.0, 20.0, 25.0, 36.0, 45.0, 50.0, 90.0]);
  const n = m / 18.02;
  const H = boil ? 40.7 : 6.01;
  const q = sig(n * H, 3);
  return Q({
    key: `mb-${boil}-${m}`,
    prompt: `How much heat is needed to ${boil ? "vaporize" : "melt"} ${num(m, 1)} g of ${boil ? "water at 100 °C" : "ice at 0 °C"}? Give kJ to 3 significant figures. (ΔH${boil ? "vap = 40.7" : "fus = 6.01"} kJ/mol, H₂O = 18.02 g/mol)`,
    unit: "kJ",
    ...key(q),
    hint: "Convert grams to moles, then q = n × ΔH. The temperature doesn't change, so there is no ΔT.",
    explain: `n = ${num(m, 1)} ÷ 18.02 = ${sf(n, 3)} mol; q = ${sf(n, 3)} × ${H} = ${sf(q, 3)} kJ.`,
  });
}

function iceToWater(): Question {
  const m = pick([10.0, 20.0, 25.0, 50.0]);
  const ti = pick([5, 10, 15, 20]);
  const tw = rand(2, 12) * 5;
  const qJ = m * 2.09 * ti + m * 334 + m * 4.18 * tw;
  const q = sig(qJ / 1000, 3);
  return Q({
    key: `iw-${m}-${ti}-${tw}`,
    prompt: `How much heat turns ${num(m, 1)} g of ice at −${ti} °C into liquid water at ${tw} °C? Give kJ to 3 significant figures.`,
    visual: table(["Data", "Value"], [["c(ice)", "2.09 J/(g·°C)"], ["ΔHfus", "334 J/g"], ["c(water)", "4.18 J/(g·°C)"]]),
    unit: "kJ",
    ...key(q),
    hint: "Three steps: warm the ice to 0 °C (mcΔT), melt it (m × ΔHfus), warm the water to the end (mcΔT). Add them.",
    explain: `${num(m * 2.09 * ti, 1)} J + ${num(m * 334, 0)} J + ${num(m * 4.18 * tw, 1)} J = ${num(qJ, 1)} J ≈ ${sf(q, 3)} kJ.`,
  });
}

const PHASE_IDEAS: { prompt: string; right: string; wrong: string[]; why: string }[] = [
  {
    prompt: "For water, ΔHvap (40.7 kJ/mol) is much larger than ΔHfus (6.01 kJ/mol). Why?",
    right: "Boiling separates the molecules completely; melting only loosens their attractions",
    wrong: ["Boiling happens at a higher temperature, so it needs more energy", "Boiling breaks the O–H bonds inside the molecules", "Liquid water has a larger specific heat than ice"],
    why: "In a liquid the molecules still touch and attract; turning to gas overcomes nearly all of those attractions, so it takes far more energy than melting.",
  },
  {
    prompt: "Why does steam at 100 °C cause a worse burn than the same mass of water at 100 °C?",
    right: "Steam releases its heat of vaporization as it condenses on the skin",
    wrong: ["Steam has a higher temperature than 100 °C", "Steam molecules are smaller and get into the skin", "Water at 100 °C absorbs heat from the skin"],
    why: "Condensation is exothermic: each gram of steam gives up 2260 J before it even starts cooling like the water does.",
  },
  {
    prompt: "Before a frost, farmers spray water on fruit trees. Why does this protect the fruit?",
    right: "Water releases heat as it freezes, holding the fruit near 0 °C",
    wrong: ["Ice is a good conductor that lets heat in", "Water absorbs heat from the fruit as it freezes", "The water lowers the freezing point of the fruit"],
    why: "Freezing is exothermic (ΔH = −6.01 kJ/mol). While water is freezing, the temperature stays at 0 °C instead of dropping lower.",
  },
  {
    prompt: "Evaporating sweat cools you down. Which statement explains this?",
    right: "Vaporization is endothermic, so the sweat absorbs heat from your skin",
    wrong: ["Vaporization is exothermic, so it releases cold", "Sweat has a lower specific heat than skin", "Evaporation lowers the boiling point of water"],
    why: "Molecules need energy to escape into the gas, and they take it from your skin, so your skin cools.",
  },
];

function phaseIdea(): Question {
  const c = pick(PHASE_IDEAS);
  return Q({
    key: `pi-${c.prompt.slice(0, 30)}`,
    prompt: c.prompt,
    ...lab(c.right, c.wrong),
    hint: "Changes that pull molecules apart absorb energy; changes that bring them together release it. Temperature stays constant during the change.",
    explain: c.why,
  });
}

export const phaseEnergy = mix(curveSegment, curveSegment, meltBoil, iceToWater, phaseIdea);

/* ---------- enthalpy of reaction */

const FUELS = [
  { rx: RXNS[0], f: "CH₄", M: 16.04, coef: 1, verb: "burns" },
  { rx: { r: [t("C₃H₈", 1, "g"), t("O₂", 5, "g")], p: [t("CO₂", 3, "g"), t("H₂O", 4, "l")], dH: -2220 }, f: "C₃H₈", M: 44.1, coef: 1, verb: "burns" },
  { rx: RXNS[4], f: "H₂", M: 2.016, coef: 2, verb: "burns" },
  { rx: RXNS[6], f: "Mg", M: 24.31, coef: 2, verb: "burns" },
  { rx: { r: [t("C₆H₁₂O₆", 1, "s"), t("O₂", 6, "g")], p: [t("CO₂", 6, "g"), t("H₂O", 6, "l")], dH: -2803 }, f: "C₆H₁₂O₆", M: 180.16, coef: 1, verb: "is oxidized" },
  { rx: RXNS[2], f: "CaCO₃", M: 100.09, coef: 1, verb: "decomposes" },
  { rx: RXNS[1], f: "NH₃", M: 17.03, coef: 2, verb: "forms" },
];

function heatFromMass(): Question {
  const fu = pick(FUELS);
  const m = pick([1.0, 2.5, 5.0, 10.0, 25.0, 50.0]);
  const q = sig(((m / fu.M) * Math.abs(fu.rx.dH)) / fu.coef, 3);
  const word = fu.rx.dH < 0 ? "released" : "absorbed";
  return Q({
    key: `hm-${fu.f}-${m}`,
    prompt: `How much heat is ${word} when ${num(m, 1)} g of ${fu.f} ${fu.verb}? Give kJ to 3 significant figures. (${fu.f}: ${fu.M} g/mol)`,
    visual: reaction(fu.rx.r, fu.rx.p, { dH: fu.rx.dH }),
    unit: "kJ",
    ...key(q),
    hint: `Convert grams to moles. ΔH is for the equation as written, which has ${fu.coef} mol of ${fu.f}, so the heat is (n ÷ ${fu.coef}) × |ΔH|.`,
    explain: `n = ${num(m, 1)} ÷ ${fu.M} = ${sf(m / fu.M, 3)} mol; q = ${sf(m / fu.M, 3)} ÷ ${fu.coef} × ${Math.abs(fu.rx.dH)} = ${sf(q, 3)} kJ ${word}.`,
  });
}

function scaleEquation(): Question {
  const rx = pick(RXNS);
  const k = pick([-1, 2, 3, -2]);
  const ans = k * rx.dH;
  const what = k === -1 ? "the reverse reaction" : k < 0 ? `the reverse reaction, multiplied by ${-k}` : `the equation multiplied by ${k}`;
  return Q({
    key: `scale-${rx.dH}-${k}`,
    prompt: `Using this equation, what is ΔH for ${what}?`,
    visual: reaction(rx.r, rx.p, { dH: rx.dH }),
    unit: "kJ",
    ...key(ans, true),
    hint: "Reversing an equation flips the sign of ΔH. Multiplying the coefficients multiplies ΔH by the same number.",
    explain: `ΔH = ${k} × (${sgn(rx.dH)}) = ${sgn(ans)} kJ.`,
  });
}

function massForHeat(): Question {
  const fu = pick(FUELS.filter((x) => x.rx.dH < 0 && x.verb === "burns"));
  const qkJ = pick([500, 1000, 2000, 2500, 5000]);
  const m = sig((qkJ / Math.abs(fu.rx.dH)) * fu.coef * fu.M, 3);
  return Q({
    key: `mfh-${fu.f}-${qkJ}`,
    prompt: `What mass of ${fu.f} must burn to release ${qkJ} kJ? Give grams to 3 significant figures. (${fu.f}: ${fu.M} g/mol)`,
    visual: reaction(fu.rx.r, fu.rx.p, { dH: fu.rx.dH }),
    unit: "g",
    ...key(m),
    hint: `Moles of reaction = ${qkJ} ÷ ${Math.abs(fu.rx.dH)}. Each mole of reaction uses ${fu.coef} mol of ${fu.f}. Then convert to grams.`,
    explain: `n(${fu.f}) = ${qkJ} ÷ ${Math.abs(fu.rx.dH)} × ${fu.coef} = ${sf((qkJ / Math.abs(fu.rx.dH)) * fu.coef, 3)} mol; m = n × ${fu.M} = ${sf(m, 3)} g.`,
  });
}

function enthalpyIdea(): Question {
  const rx = pick(RXNS);
  const k = pick([2, 3, 4]);
  const right = `${k} × ${Math.abs(rx.dH)} = ${k * Math.abs(rx.dH)} kJ ${rx.dH < 0 ? "released" : "absorbed"}`;
  return Q({
    key: `ext-${rx.dH}-${k}`,
    prompt: `The reaction runs ${k} times over (${k} moles of reaction). How much heat is involved?`,
    visual: reaction(rx.r, rx.p, { dH: rx.dH }),
    ...lab(right, [`${Math.abs(rx.dH)} kJ ${rx.dH < 0 ? "released" : "absorbed"}`, `${k * Math.abs(rx.dH)} kJ ${rx.dH < 0 ? "absorbed" : "released"}`, `${sf(Math.abs(rx.dH) / k, 3)} kJ ${rx.dH < 0 ? "released" : "absorbed"}`]),
    hint: "ΔH is extensive: it is per mole of reaction as written, so twice the reaction means twice the heat.",
    explain: `Heat scales with the amount: ${right}.`,
  });
}

export const reactionEnthalpy = mix(heatFromMass, heatFromMass, scaleEquation, massForHeat, enthalpyIdea);

/* ---------- bond enthalpies */

const BE: Record<string, number> = {
  "H–H": 436,
  "Cl–Cl": 242,
  "H–Cl": 431,
  "F–F": 155,
  "H–F": 567,
  "Br–Br": 193,
  "H–Br": 366,
  "I–I": 151,
  "H–I": 299,
  "O=O": 495,
  "O–H": 463,
  "C–H": 413,
  "C=O": 799,
  "N≡N": 941,
  "N–H": 391,
  "C=C": 614,
  "C–C": 348,
};

const BE_RX: { r: Term[]; p: Term[]; broken: [string, number][]; formed: [string, number][] }[] = [
  { r: [t("H₂", 1, "g"), t("Cl₂", 1, "g")], p: [t("HCl", 2, "g")], broken: [["H–H", 1], ["Cl–Cl", 1]], formed: [["H–Cl", 2]] },
  { r: [t("H₂", 1, "g"), t("F₂", 1, "g")], p: [t("HF", 2, "g")], broken: [["H–H", 1], ["F–F", 1]], formed: [["H–F", 2]] },
  { r: [t("H₂", 1, "g"), t("Br₂", 1, "g")], p: [t("HBr", 2, "g")], broken: [["H–H", 1], ["Br–Br", 1]], formed: [["H–Br", 2]] },
  { r: [t("H₂", 1, "g"), t("I₂", 1, "g")], p: [t("HI", 2, "g")], broken: [["H–H", 1], ["I–I", 1]], formed: [["H–I", 2]] },
  { r: [t("CH₄", 1, "g"), t("O₂", 2, "g")], p: [t("CO₂", 1, "g"), t("H₂O", 2, "g")], broken: [["C–H", 4], ["O=O", 2]], formed: [["C=O", 2], ["O–H", 4]] },
  { r: [t("N₂", 1, "g"), t("H₂", 3, "g")], p: [t("NH₃", 2, "g")], broken: [["N≡N", 1], ["H–H", 3]], formed: [["N–H", 6]] },
  { r: [t("H₂", 2, "g"), t("O₂", 1, "g")], p: [t("H₂O", 2, "g")], broken: [["H–H", 2], ["O=O", 1]], formed: [["O–H", 4]] },
  { r: [t("C₂H₄", 1, "g"), t("H₂", 1, "g")], p: [t("C₂H₆", 1, "g")], broken: [["C=C", 1], ["C–H", 4], ["H–H", 1]], formed: [["C–C", 1], ["C–H", 6]] },
];

const bondSum = (list: [string, number][]) => list.reduce((s, [b, n]) => s + BE[b] * n, 0);
const bondList = (list: [string, number][]) => list.map(([b, n]) => `${n} × ${b} (${BE[b]})`).join(" + ");
const bondTable = (rx: (typeof BE_RX)[number], hide?: string): Visual => {
  const bonds = [...new Set([...rx.broken, ...rx.formed].map(([b]) => b))];
  return table(["Bond", "kJ/mol"], bonds.map((b) => [b, b === hide ? "?" : BE[b]]));
};

function bondDH(): Question {
  const rx = pick(BE_RX);
  const dH = bondSum(rx.broken) - bondSum(rx.formed);
  return Q({
    key: `bdh-${eqText(rx.r, rx.p)}`,
    prompt: `Use the bond enthalpies to estimate ΔH for ${eqText(rx.r, rx.p)}.`,
    visual: bondTable(rx),
    unit: "kJ",
    ...key(dH, true),
    hint: "ΔH ≈ Σ(bonds broken) − Σ(bonds formed). Count every bond in the reactants and products, using the coefficients.",
    explain: `Broken: ${bondList(rx.broken)} = ${bondSum(rx.broken)} kJ. Formed: ${bondList(rx.formed)} = ${bondSum(rx.formed)} kJ. ΔH ≈ ${bondSum(rx.broken)} − ${bondSum(rx.formed)} = ${sgn(dH)} kJ.`,
  });
}

function bondsBroken(): Question {
  const rx = pick(BE_RX);
  const formed = Math.random() < 0.5;
  const list = formed ? rx.formed : rx.broken;
  return Q({
    key: `bb-${eqText(rx.r, rx.p)}-${formed}`,
    prompt: `For ${eqText(rx.r, rx.p)}, how much energy is ${formed ? "released forming the product bonds" : "needed to break the reactant bonds"}?`,
    visual: bondTable(rx),
    unit: "kJ",
    ...key(bondSum(list)),
    hint: `List the bonds in the ${formed ? "products" : "reactants"}, multiply by the coefficients, and add their enthalpies.`,
    explain: `${bondList(list)} = ${bondSum(list)} kJ.`,
  });
}

function missingBond(): Question {
  const rx = pick(BE_RX.slice(0, 4));
  const hideFormed = Math.random() < 0.5;
  const hide = hideFormed ? rx.formed[0][0] : rx.broken[1][0];
  const dH = bondSum(rx.broken) - bondSum(rx.formed);
  return Q({
    key: `mb-${eqText(rx.r, rx.p)}-${hide}`,
    prompt: `For ${eqText(rx.r, rx.p)}, ΔH = ${sgn(dH)} kJ. What is the ${hide} bond enthalpy?`,
    visual: bondTable(rx, hide),
    unit: "kJ/mol",
    ...key(BE[hide]),
    hint: "Write ΔH = Σ(broken) − Σ(formed) with the unknown as x, then solve.",
    explain: hideFormed
      ? `${sgn(dH)} = ${bondSum(rx.broken)} − 2x, so 2x = ${bondSum(rx.broken) - dH} and x = ${BE[hide]} kJ/mol.`
      : `${sgn(dH)} = ${BE[rx.broken[0][0]]} + x − ${bondSum(rx.formed)}, so x = ${BE[hide]} kJ/mol.`,
  });
}

function bondMistake(): Question {
  const rx = pick(BE_RX);
  const dH = bondSum(rx.broken) - bondSum(rx.formed);
  if (Math.random() < 0.5) {
    const right = "They did formed − broken; it should be broken − formed";
    return Q({
      key: `bm-${eqText(rx.r, rx.p)}`,
      prompt: `A student estimates ΔH = ${sgn(-dH)} kJ for ${eqText(rx.r, rx.p)} from bond enthalpies. The true estimate is ${sgn(dH)} kJ. What went wrong?`,
      visual: bondTable(rx),
      ...lab(right, ["They forgot the coefficients", "They used the wrong bond enthalpy for one bond", "Bond enthalpies can't be used for gases"]),
      hint: "Breaking bonds costs energy (+); forming bonds releases energy (−).",
      explain: `ΔH ≈ Σ(broken) − Σ(formed) = ${bondSum(rx.broken)} − ${bondSum(rx.formed)} = ${sgn(dH)} kJ. Subtracting the other way flips the sign.`,
    });
  }
  const right = "Bond enthalpies are averages over many different molecules";
  return Q({
    key: `bavg-${eqText(rx.r, rx.p)}`,
    prompt: `Bond enthalpies give ΔH ≈ ${sgn(dH)} kJ for ${eqText(rx.r, rx.p)}, a little different from the value from enthalpies of formation. Why?`,
    ...lab(right, ["Enthalpies of formation are only estimates", "Some bonds are counted twice", "Bond enthalpies include the energy of phase changes"]),
    hint: "Is a C–H bond exactly the same strength in every molecule?",
    explain: "A bond's strength depends on its surroundings, so tables list average values for gases. ΔH from bond enthalpies is a good estimate, not an exact value.",
  });
}

export const bondEnthalpy = mix(bondDH, bondDH, bondsBroken, missingBond, bondMistake);

/* ---------- enthalpy of formation */

const HF: Record<string, number> = {
  "CO₂(g)": -393.5,
  "H₂O(l)": -285.8,
  "H₂O(g)": -241.8,
  "CH₄(g)": -74.8,
  "C₃H₈(g)": -103.8,
  "C₂H₅OH(l)": -277.7,
  "NH₃(g)": -46.1,
  "NO(g)": 90.3,
  "NO₂(g)": 33.2,
  "CO(g)": -110.5,
  "SO₂(g)": -296.8,
  "SO₃(g)": -395.7,
  "CaCO₃(s)": -1206.9,
  "CaO(s)": -635.1,
  "Fe₂O₃(s)": -824.2,
  "Al₂O₃(s)": -1675.7,
};
const ELEMENTS_STD = ["O₂(g)", "Al(s)", "Fe(s)", "N₂(g)", "H₂(g)"];
const hf = (x: Term) => (ELEMENTS_STD.includes(termText({ ...x, coef: 1 })) ? 0 : HF[termText({ ...x, coef: 1 })]);

const FORM_RX: { r: Term[]; p: Term[] }[] = [
  { r: [t("CH₄", 1, "g"), t("O₂", 2, "g")], p: [t("CO₂", 1, "g"), t("H₂O", 2, "l")] },
  { r: [t("C₃H₈", 1, "g"), t("O₂", 5, "g")], p: [t("CO₂", 3, "g"), t("H₂O", 4, "l")] },
  { r: [t("CaCO₃", 1, "s")], p: [t("CaO", 1, "s"), t("CO₂", 1, "g")] },
  { r: [t("SO₂", 2, "g"), t("O₂", 1, "g")], p: [t("SO₃", 2, "g")] },
  { r: [t("CO", 2, "g"), t("O₂", 1, "g")], p: [t("CO₂", 2, "g")] },
  { r: [t("Fe₂O₃", 1, "s"), t("Al", 2, "s")], p: [t("Al₂O₃", 1, "s"), t("Fe", 2, "s")] },
  { r: [t("C₂H₅OH", 1, "l"), t("O₂", 3, "g")], p: [t("CO₂", 2, "g"), t("H₂O", 3, "l")] },
  { r: [t("NO", 2, "g"), t("O₂", 1, "g")], p: [t("NO₂", 2, "g")] },
  { r: [t("NH₃", 4, "g"), t("O₂", 5, "g")], p: [t("NO", 4, "g"), t("H₂O", 6, "g")] },
];
const sumHf = (ts: Term[]) => ts.reduce((s, x) => s + (x.coef ?? 1) * hf(x), 0);
const formTable = (rx: { r: Term[]; p: Term[] }, hide?: string) =>
  table(
    ["Substance", "ΔHf° (kJ/mol)"],
    [...rx.r, ...rx.p].filter((x) => hf(x) !== 0).map((x) => {
      const n = termText({ ...x, coef: 1 });
      return [n, n === hide ? "?" : num(hf(x), 1)];
    }),
  );

function formationDH(): Question {
  const rx = pick(FORM_RX);
  const exact = sumHf(rx.p) - sumHf(rx.r);
  const dH = Math.round(exact);
  const lst = (ts: Term[]) => ts.map((x) => `${x.coef ?? 1}(${num(hf(x), 1)})`).join(" + ");
  return Q({
    key: `fdh-${eqText(rx.r, rx.p)}`,
    prompt: `Find ΔH° for ${eqText(rx.r, rx.p)}, to the nearest kJ. (Elements in their standard states have ΔHf° = 0.)`,
    visual: formTable(rx),
    unit: "kJ",
    ...key(dH, true),
    hint: "ΔH° = Σ n·ΔHf°(products) − Σ n·ΔHf°(reactants). Multiply each by its coefficient; elements count as 0.",
    explain: `Products: ${lst(rx.p)} = ${num(sumHf(rx.p), 1)}. Reactants: ${lst(rx.r)} = ${num(sumHf(rx.r), 1)}. ΔH° = ${num(exact, 1)} ≈ ${sgn(dH)} kJ.`,
  });
}

function backFormation(): Question {
  const rx = pick(FORM_RX.filter((x) => x.r.some((y) => hf(y) !== 0)));
  const target = rx.r.find((y) => hf(y) !== 0)!;
  const name = termText({ ...target, coef: 1 });
  const dH = dp(sumHf(rx.p) - sumHf(rx.r), 1);
  const ans = Math.round(hf(target));
  return Q({
    key: `back-${eqText(rx.r, rx.p)}`,
    prompt: `ΔH° = ${sgn(dH, 1)} kJ for ${eqText(rx.r, rx.p)}. Use the table to find ΔHf° of ${name}, to the nearest kJ/mol.`,
    visual: formTable(rx, name),
    unit: "kJ/mol",
    ...key(ans, true),
    hint: "Write ΔH° = Σ products − Σ reactants with the unknown as x (times its coefficient), then solve for x.",
    explain: `${num(dH, 1)} = ${num(sumHf(rx.p), 1)} − (${target.coef ?? 1}x${rx.r.filter((y) => y !== target && hf(y) !== 0).length ? " + others" : ""}), giving x = ${num(hf(target), 1)} ≈ ${num(ans)} kJ/mol.`,
  });
}

const FORMATION_EQ: { sub: string; right: string; wrong: string[] }[] = [
  { sub: "H₂O(l)", right: "H₂(g) + ½O₂(g) → H₂O(l)", wrong: ["2H₂(g) + O₂(g) → 2H₂O(l)", "H₂(g) + O(g) → H₂O(l)", "H₂O(g) → H₂O(l)"] },
  { sub: "CO₂(g)", right: "C(graphite) + O₂(g) → CO₂(g)", wrong: ["C(diamond) + O₂(g) → CO₂(g)", "CO(g) + ½O₂(g) → CO₂(g)", "C(g) + 2O(g) → CO₂(g)"] },
  { sub: "NH₃(g)", right: "½N₂(g) + 3/2H₂(g) → NH₃(g)", wrong: ["N₂(g) + 3H₂(g) → 2NH₃(g)", "N(g) + 3H(g) → NH₃(g)", "NH₄⁺(aq) → NH₃(g) + H⁺(aq)"] },
  { sub: "NaCl(s)", right: "Na(s) + ½Cl₂(g) → NaCl(s)", wrong: ["Na⁺(g) + Cl⁻(g) → NaCl(s)", "2Na(s) + Cl₂(g) → 2NaCl(s)", "Na(g) + Cl(g) → NaCl(s)"] },
  { sub: "CH₄(g)", right: "C(graphite) + 2H₂(g) → CH₄(g)", wrong: ["C(g) + 4H(g) → CH₄(g)", "C(diamond) + 2H₂(g) → CH₄(g)", "CO₂(g) + 2H₂O(l) → CH₄(g) + 2O₂(g)"] },
  { sub: "C₂H₅OH(l)", right: "2C(graphite) + 3H₂(g) + ½O₂(g) → C₂H₅OH(l)", wrong: ["C₂H₄(g) + H₂O(l) → C₂H₅OH(l)", "4C(graphite) + 6H₂(g) + O₂(g) → 2C₂H₅OH(l)", "2C(g) + 6H(g) + O(g) → C₂H₅OH(l)"] },
];

function formationEq(): Question {
  const f = pick(FORMATION_EQ);
  return Q({
    key: `feq-${f.sub}`,
    prompt: `Which equation's ΔH° is the standard enthalpy of formation of ${f.sub}?`,
    ...lab(f.right, f.wrong),
    hint: "A formation reaction makes exactly 1 mol of the compound from its elements in their standard states (O₂(g), C(graphite), Na(s)…). Fractions are fine.",
    explain: `${f.right}: one mole of ${f.sub} from elements in their standard states.`,
  });
}

function zeroHf(): Question {
  const right = pick(["O₂(g)", "N₂(g)", "Fe(s)", "C(graphite)", "Br₂(l)", "Hg(l)", "Na(s)"]);
  return Q({
    key: `zero-${right}`,
    prompt: "Which of these has a standard enthalpy of formation of exactly zero?",
    ...lab(right, some(["O₃(g)", "Br₂(g)", "C(diamond)", "H(g)", "H₂O(l)", "Cl(g)", "I₂(g)"], 3)),
    hint: "ΔHf° = 0 only for an element in its most stable form at 25 °C and 1 bar.",
    explain: `${right} is an element in its standard state, so nothing needs to happen to form it: ΔHf° = 0. The others are compounds, other forms, or atoms.`,
  });
}

export const formationEnthalpy = mix(formationDH, formationDH, backFormation, formationEq, zeroHf);

/* ---------- Hess's law */

interface HessStep {
  eq: string;
  dH: number;
  k: number;
}
const HESS: { target: string; steps: HessStep[] }[] = [
  {
    target: "2C(s) + O₂(g) → 2CO(g)",
    steps: [
      { eq: "C(s) + O₂(g) → CO₂(g)", dH: -393.5, k: 2 },
      { eq: "2CO(g) + O₂(g) → 2CO₂(g)", dH: -566.0, k: -1 },
    ],
  },
  {
    target: "N₂(g) + 2O₂(g) → 2NO₂(g)",
    steps: [
      { eq: "N₂(g) + O₂(g) → 2NO(g)", dH: 180.6, k: 1 },
      { eq: "2NO(g) + O₂(g) → 2NO₂(g)", dH: -114.2, k: 1 },
    ],
  },
  {
    target: "2S(s) + 3O₂(g) → 2SO₃(g)",
    steps: [
      { eq: "S(s) + O₂(g) → SO₂(g)", dH: -296.8, k: 2 },
      { eq: "2SO₂(g) + O₂(g) → 2SO₃(g)", dH: -197.8, k: 1 },
    ],
  },
  {
    target: "C₂H₄(g) + H₂(g) → C₂H₆(g)",
    steps: [
      { eq: "C₂H₄(g) + 3O₂(g) → 2CO₂(g) + 2H₂O(l)", dH: -1411, k: 1 },
      { eq: "2H₂(g) + O₂(g) → 2H₂O(l)", dH: -572, k: 0.5 },
      { eq: "2C₂H₆(g) + 7O₂(g) → 4CO₂(g) + 6H₂O(l)", dH: -3120, k: -0.5 },
    ],
  },
  {
    target: "3C(s) + 4H₂(g) → C₃H₈(g)",
    steps: [
      { eq: "C(s) + O₂(g) → CO₂(g)", dH: -393.5, k: 3 },
      { eq: "2H₂(g) + O₂(g) → 2H₂O(l)", dH: -571.6, k: 2 },
      { eq: "C₃H₈(g) + 5O₂(g) → 3CO₂(g) + 4H₂O(l)", dH: -2219.9, k: -1 },
    ],
  },
  {
    target: "N₂H₄(l) + 2H₂O₂(l) → N₂(g) + 4H₂O(l)",
    steps: [
      { eq: "N₂H₄(l) + O₂(g) → N₂(g) + 2H₂O(l)", dH: -622.2, k: 1 },
      { eq: "2H₂(g) + O₂(g) → 2H₂O(l)", dH: -571.6, k: 1 },
      { eq: "H₂(g) + O₂(g) → H₂O₂(l)", dH: -187.8, k: -2 },
    ],
  },
];
const kWord = (k: number) =>
  k === 1 ? "Use it as written" : k === -1 ? "Reverse it" : k > 0 ? `Multiply it by ${k === 0.5 ? "½" : k}` : `Reverse it and multiply by ${k === -0.5 ? "½" : -k}`;
const hessTable = (h: (typeof HESS)[number]) => table(["Equation", "ΔH (kJ)"], h.steps.map((s, i) => [`${i + 1}. ${s.eq}`, num(s.dH, Number.isInteger(s.dH) ? 0 : 1)]));

function hessCalc(): Question {
  const h = pick(HESS);
  const exact = h.steps.reduce((s, x) => s + x.k * x.dH, 0);
  const ans = Math.round(exact);
  return Q({
    key: `hc-${h.target}`,
    prompt: `Use Hess's law and the equations in the table to find ΔH for ${h.target}, to the nearest kJ.`,
    visual: hessTable(h),
    unit: "kJ",
    ...key(ans, true),
    hint: "Reverse or multiply each equation so that adding them cancels everything except the target. Do the same to each ΔH, then add.",
    explain: h.steps.map((s, i) => `${kWord(s.k).toLowerCase()} (${i + 1}): ${num(s.k * s.dH, 1)}`).join("; ") + `. Sum = ${num(exact, 1)} ≈ ${sgn(ans)} kJ.`,
  });
}

function hessStep(): Question {
  const h = pick(HESS);
  const i = rand(0, h.steps.length - 1);
  const s = h.steps[i];
  const all = ["Use it as written", "Reverse it", "Multiply it by 2", "Reverse it and multiply by 2", "Multiply it by ½", "Reverse it and multiply by ½", "Multiply it by 3"];
  return Q({
    key: `hs-${h.target}-${i}`,
    prompt: `To get ${h.target}, what must you do to equation ${i + 1}?`,
    visual: hessTable(h),
    ...lab(kWord(s.k), all.filter((x) => x !== kWord(s.k))),
    hint: "Find a substance that appears only in that equation and in the target. It must end up on the same side, with the same coefficient, as in the target.",
    explain: `${kWord(s.k)}: then equation ${i + 1} contributes ${num(s.k * s.dH, 1)} kJ, and adding the equations leaves exactly the target.`,
  });
}

function graphiteDiamond(): Question {
  const a = -393.5;
  const b = -395.4;
  const ans = dp(a - b, 1);
  return Q({
    key: "gd",
    prompt: "C(graphite) + O₂ → CO₂ has ΔH = −393.5 kJ, and C(diamond) + O₂ → CO₂ has ΔH = −395.4 kJ. What is ΔH for C(graphite) → C(diamond)?",
    unit: "kJ",
    ...nums(ans, [-ans, a + b, -(a + b)], 0.1),
    hint: "Keep the graphite equation as written; reverse the diamond equation; add.",
    explain: `ΔH = (−393.5) − (−395.4) = +1.9 kJ. Diamond has slightly more enthalpy than graphite.`,
  });
}

function hessRule(): Question {
  const x = pick([-92, -184, 57, 131, 178, -283, 44, -46]);
  const k = pick([2, 3]);
  const ans = -k * x;
  return Q({
    key: `hr-${x}-${k}`,
    prompt: `For A → 2B, ΔH = ${sgn(x)} kJ. What is ΔH for ${2 * k}B → ${k}A?`,
    unit: "kJ",
    ...key(ans, true),
    hint: "The new equation is the old one reversed and multiplied by " + k + ".",
    explain: `Reverse (flip the sign) and multiply by ${k}: ΔH = −${k} × (${sgn(x)}) = ${sgn(ans)} kJ.`,
  });
}

export const hessLaw = mix(hessCalc, hessCalc, hessStep, hessStep, hessRule, graphiteDiamond);

/* ================================================================ unit 7: equilibrium */

interface Equil {
  r: Term[];
  p: Term[];
  K: string;
  wrong: string[];
  dH: number | null;
  /** Gas (or aqueous) particles on each side, for volume and dilution questions. */
  n: [number, number];
  gas: boolean;
}
const EQS: Equil[] = [
  { r: [t("N₂", 1, "g"), t("H₂", 3, "g")], p: [t("NH₃", 2, "g")], K: "[NH₃]² / ([N₂][H₂]³)", wrong: ["[N₂][H₂]³ / [NH₃]²", "[NH₃] / ([N₂][H₂])", "2[NH₃] / ([N₂] × 3[H₂])"], dH: -92, n: [4, 2], gas: true },
  { r: [t("SO₂", 2, "g"), t("O₂", 1, "g")], p: [t("SO₃", 2, "g")], K: "[SO₃]² / ([SO₂]²[O₂])", wrong: ["[SO₂]²[O₂] / [SO₃]²", "[SO₃] / ([SO₂][O₂])", "2[SO₃] / (2[SO₂] + [O₂])"], dH: -198, n: [3, 2], gas: true },
  { r: [t("N₂O₄", 1, "g")], p: [t("NO₂", 2, "g")], K: "[NO₂]² / [N₂O₄]", wrong: ["[N₂O₄] / [NO₂]²", "2[NO₂] / [N₂O₄]", "[NO₂] / [N₂O₄]"], dH: 57, n: [1, 2], gas: true },
  { r: [t("H₂", 1, "g"), t("I₂", 1, "g")], p: [t("HI", 2, "g")], K: "[HI]² / ([H₂][I₂])", wrong: ["[H₂][I₂] / [HI]²", "2[HI] / ([H₂][I₂])", "[HI] / ([H₂][I₂])"], dH: -9, n: [2, 2], gas: true },
  { r: [t("PCl₅", 1, "g")], p: [t("PCl₃", 1, "g"), t("Cl₂", 1, "g")], K: "[PCl₃][Cl₂] / [PCl₅]", wrong: ["[PCl₅] / ([PCl₃][Cl₂])", "[PCl₃] + [Cl₂] / [PCl₅]", "[PCl₃][Cl₂]"], dH: 88, n: [1, 2], gas: true },
  { r: [t("CO", 1, "g"), t("H₂", 2, "g")], p: [t("CH₃OH", 1, "g")], K: "[CH₃OH] / ([CO][H₂]²)", wrong: ["[CO][H₂]² / [CH₃OH]", "[CH₃OH] / ([CO][H₂])", "[CH₃OH] / ([CO] × 2[H₂])"], dH: -91, n: [3, 1], gas: true },
  { r: [t("N₂", 1, "g"), t("O₂", 1, "g")], p: [t("NO", 2, "g")], K: "[NO]² / ([N₂][O₂])", wrong: ["[N₂][O₂] / [NO]²", "2[NO] / ([N₂][O₂])", "[NO] / ([N₂][O₂])"], dH: 181, n: [2, 2], gas: true },
  { r: [t("CaCO₃", 1, "s")], p: [t("CaO", 1, "s"), t("CO₂", 1, "g")], K: "[CO₂]", wrong: ["[CaO][CO₂] / [CaCO₃]", "[CaCO₃] / ([CaO][CO₂])", "1 / [CO₂]"], dH: 178, n: [0, 1], gas: false },
  { r: [t("C", 1, "s"), t("H₂O", 1, "g")], p: [t("CO", 1, "g"), t("H₂", 1, "g")], K: "[CO][H₂] / [H₂O]", wrong: ["[CO][H₂] / ([C][H₂O])", "[H₂O] / ([CO][H₂])", "[C][H₂O] / ([CO][H₂])"], dH: 131, n: [1, 2], gas: false },
  { r: [t("CH₃COOH", 1, "aq"), t("H₂O", 1, "l")], p: [t("CH₃COO⁻", 1, "aq"), t("H₃O⁺", 1, "aq")], K: "[CH₃COO⁻][H₃O⁺] / [CH₃COOH]", wrong: ["[CH₃COO⁻][H₃O⁺] / ([CH₃COOH][H₂O])", "[CH₃COOH] / ([CH₃COO⁻][H₃O⁺])", "[CH₃COO⁻] + [H₃O⁺] / [CH₃COOH]"], dH: null, n: [1, 2], gas: false },
  { r: [t("AgCl", 1, "s")], p: [t("Ag⁺", 1, "aq"), t("Cl⁻", 1, "aq")], K: "[Ag⁺][Cl⁻]", wrong: ["[Ag⁺][Cl⁻] / [AgCl]", "[AgCl] / ([Ag⁺][Cl⁻])", "[Ag⁺] + [Cl⁻]"], dH: null, n: [0, 2], gas: false },
];
const GAS_EQS = EQS.filter((e) => e.gas);
const eqVis = (e: Equil, withDH = false): Visual => reaction(e.r, e.p, { arrow: "⇌", ...(withDH && e.dH !== null ? { dH: e.dH } : {}) });
const eqStr = (e: Equil) => eqText(e.r, e.p, "⇌");
/** Species that appear in K (gases and aqueous). */
const inK = (ts: Term[]) => ts.filter((x) => x.state === "g" || x.state === "aq");


/** Concentrations for each species in K, and Q from them. */
function randomConc(e: Equil) {
  const pool = [0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1.0, 1.5, 2.0];
  const conc = new Map<string, number>();
  [...inK(e.r), ...inK(e.p)].forEach((x) => conc.set(x.formula, pick(pool)));
  const prod = (ts: Term[]) => inK(ts).reduce((s, x) => s * conc.get(x.formula)! ** (x.coef ?? 1), 1);
  return { conc, Q: prod(e.p) / prod(e.r) };
}
const concTable = (conc: Map<string, number>, unit = "M") => table(["Species", `Concentration (${unit})`], [...conc].map(([f, c]) => [`[${f}]`, num(c, 2)]));
const concKey = (conc: Map<string, number>) => [...conc.values()].join(",");

/* ---------- dynamic equilibrium */

function eqCurves(aEq: number, teq: number, fromProducts = false) {
  const A = (x: number) => (x >= teq ? aEq : aEq + ((fromProducts ? 0 : 1) - aEq) * (1 - x / teq) ** 2);
  const B = (x: number) => 1 - A(x);
  return { A, B };
}

function dynTime(): Question {
  const aEq = pick([0.2, 0.4, 0.6, 0.8]);
  const teq = pick([2, 4, 6, 8]);
  const { A, B } = eqCurves(aEq, teq);
  return Q({
    key: `dt-${aEq}-${teq}`,
    prompt: "A ⇌ B starts with 1.0 M A. At what time is equilibrium first reached?",
    visual: { kind: "plot", x: [0, 10], y: [0, 1], xLabel: "time (min)", yLabel: "concentration (M)", curves: [{ fn: A, label: "[A]", colour: "wave" }, { fn: B, label: "[B]", colour: "berry" }] },
    needsVisual: true,
    unit: "min",
    ...key(teq),
    hint: "Equilibrium is reached when the concentrations stop changing: where both curves go flat.",
    explain: `Both curves level off at t = ${teq} min. After that, [A] = ${num(aEq, 1)} M and [B] = ${num(1 - aEq, 1)} M stay constant, though both reactions continue.`,
  });
}

function dynK(): Question {
  const aEq = pick([0.2, 0.4, 0.6, 0.8]);
  const teq = pick([4, 5, 6]);
  const { A, B } = eqCurves(aEq, teq, Math.random() < 0.4);
  const K = dp((1 - aEq) / aEq, 2);
  const startB = A(0) === 0;
  return Q({
    key: `dk-${aEq}-${teq}-${startB}`,
    prompt: `A ⇌ B starts with 1.0 M ${startB ? "B" : "A"}. What is K = [B]/[A]? Give 2 decimal places if needed.`,
    visual: { kind: "plot", x: [0, 10], y: [0, 1], xLabel: "time (min)", yLabel: "concentration (M)", curves: [{ fn: A, label: "[A]", colour: "wave" }, { fn: B, label: "[B]", colour: "berry" }] },
    needsVisual: true,
    ...key(K),
    hint: "Read the flat (equilibrium) values at the right of the graph, not the starting values.",
    explain: `At equilibrium [A] = ${num(aEq, 1)} M and [B] = ${num(1 - aEq, 1)} M, so K = ${num(1 - aEq, 1)} ÷ ${num(aEq, 1)} = ${num(K)}.`,
  });
}

function dynRates(): Question {
  const r = pick([0.3, 0.4, 0.5, 0.6]);
  const teq = pick([4, 5, 6, 7]);
  const f = (x: number) => (x >= teq ? r : r + (1 - r) * (1 - x / teq) ** 2);
  const b = (x: number) => (x >= teq ? r : r * (1 - (1 - x / teq) ** 2));
  const right = "Forward and reverse rates are equal, and neither is zero";
  return Q({
    key: `dr-${r}-${teq}`,
    prompt: `The graph shows the forward and reverse reaction rates. Which is true after ${teq} min?`,
    visual: { kind: "plot", x: [0, 10], y: [0, 1], xLabel: "time (min)", yLabel: "rate (M/s)", curves: [{ fn: f, label: "forward", colour: "leaf" }, { fn: b, label: "reverse", colour: "tangerine" }] },
    needsVisual: true,
    ...lab(right, ["Both reactions have stopped", "The concentrations of reactants and products are equal", "The forward rate is still larger than the reverse rate"]),
    hint: "Look at where the two rate curves meet and stay together.",
    explain: `After ${teq} min the curves meet at the same nonzero rate: reactants are made as fast as they are used. That is dynamic equilibrium; the concentrations stay constant but need not be equal.`,
  });
}

const DYN_IDEAS: { prompt: string; right: string; wrong: string[]; why: string }[] = [
  {
    prompt: "N₂ + 3H₂ ⇌ 2NH₃ is at equilibrium. Some H₂ is swapped for the same amount of D₂ (heavy hydrogen). Later, D atoms turn up in the NH₃. What does this show?",
    right: "The forward and reverse reactions are still happening",
    wrong: ["The equilibrium shifted toward products", "D₂ is more reactive than H₂", "The system was not at equilibrium yet"],
    why: "NH₃ keeps breaking apart and re-forming even at equilibrium, so the D atoms get mixed in: equilibrium is dynamic.",
  },
  {
    prompt: "Which statement is true for every system at equilibrium?",
    right: "Concentrations stay constant but are not necessarily equal",
    wrong: ["Reactant and product concentrations are equal", "The reactions have stopped", "The forward and reverse rate constants are equal"],
    why: "The rates are equal, not the concentrations. K tells you the ratio of concentrations, which is rarely 1.",
  },
  {
    prompt: "Why must CaCO₃(s) ⇌ CaO(s) + CO₂(g) be in a closed container to reach equilibrium?",
    right: "Otherwise CO₂ escapes, so the reverse reaction can't keep up",
    wrong: ["Solids only react in closed containers", "An open container lets in O₂ that reacts with CaO", "Heat can't escape from a closed container"],
    why: "Equilibrium needs both directions. In an open container the CO₂ leaves, so the CaCO₃ just keeps decomposing.",
  },
  {
    prompt: "A sealed flask of brown NO₂ and colourless N₂O₄ keeps exactly the same colour for hours. Which is true?",
    right: "NO₂ is being made and used up at the same rate",
    wrong: ["No NO₂ is reacting any more", "All of the N₂O₄ has turned into NO₂", "There are equal amounts of NO₂ and N₂O₄"],
    why: "Constant colour means constant [NO₂], which at equilibrium comes from equal forward and reverse rates, not from the reaction stopping.",
  },
  {
    prompt: "The water level in a sealed bottle stays the same for days. Why?",
    right: "Water evaporates and condenses at equal rates",
    wrong: ["No molecules leave the liquid", "All the vapor has condensed", "The bottle stops evaporation"],
    why: "Molecules still escape the surface, but vapor molecules return just as fast: a dynamic (phase) equilibrium.",
  },
];

function dynIdea(): Question {
  const c = pick(DYN_IDEAS);
  return Q({
    key: `di-${c.prompt.slice(0, 30)}`,
    prompt: c.prompt,
    ...lab(c.right, c.wrong),
    hint: "At equilibrium both reactions continue at equal rates, so nothing seems to change.",
    explain: c.why,
  });
}

function dynParticles(): Question {
  const eqB = pick([4, 6, 8, 9]);
  const eqA = 12 - eqB;
  const midB = rand(1, eqB - 1);
  const askK = Math.random() < 0.5;
  const visual: Visual = {
    kind: "chem-particles",
    panels: [
      { species: [{ name: "A", colour: "wave", count: 12 }, { name: "B", colour: "berry", count: 0 }], label: "0 min" },
      { species: [{ name: "A", colour: "wave", count: 12 - midB }, { name: "B", colour: "berry", count: midB }], label: "5 min" },
      { species: [{ name: "A", colour: "wave", count: eqA }, { name: "B", colour: "berry", count: eqB }], label: "10 min" },
    ],
    key: true,
  };
  if (askK) {
    const K = dp(eqB / eqA, 2);
    return Q({
      key: `dpk-${eqB}-${midB}`,
      prompt: "A ⇌ B in a sealed box. At 20 min the box still looks the same as at 10 min. What is K = [B]/[A]?",
      visual,
      needsVisual: true,
      ...key(K),
      hint: "The equilibrium picture is the one that stops changing. In one box, the ratio of particle counts is the ratio of concentrations.",
      explain: `At equilibrium there are ${eqB} B and ${eqA} A, so K = ${eqB} ÷ ${eqA} = ${num(K)}.`,
    });
  }
  const right = "The forward rate is greater than the reverse rate";
  return Q({
    key: `dpr-${eqB}-${midB}`,
    prompt: "A ⇌ B in a sealed box. At 20 min the box still looks the same as at 10 min. Which is true at 5 min?",
    visual,
    needsVisual: true,
    ...lab(right, ["The system is at equilibrium", "The reverse rate is greater than the forward rate", "Both rates are zero"]),
    hint: "Compare the 5-minute box with the final equilibrium box. Is B still increasing?",
    explain: `At 5 min there are ${midB} B but equilibrium has ${eqB} B, so B is still forming: the forward rate is greater than the reverse rate.`,
  });
}

export const dynamicEq = mix(dynTime, dynK, dynRates, dynIdea, dynIdea, dynParticles);

/* ---------- direction of reversible reactions */

function dirStart(): Question {
  const e = pick(GAS_EQS);
  const fromP = Math.random() < 0.5;
  const R = e.r.map((x) => x.formula).join(" and ");
  const P = e.p.map((x) => x.formula).join(" and ");
  const right = fromP ? `The reverse reaction runs: ${P} forms some ${R} until the rates are equal` : `The forward reaction runs: ${R} forms some ${P} until the rates are equal`;
  return Q({
    key: `ds-${eqStr(e)}-${fromP}`,
    prompt: `A sealed flask starts with only ${fromP ? P : R}. What happens?`,
    visual: eqVis(e),
    ...lab(right, [
      fromP ? `Nothing: only ${R} can react` : `Nothing: only ${P} can react`,
      fromP ? `All the ${P} turns into ${R}` : `All the ${R} turns into ${P}`,
      fromP ? `The forward reaction runs: ${R} forms more ${P}` : `The reverse reaction runs: ${P} forms more ${R}`,
    ]),
    hint: "Equilibrium can be reached from either side. With no products at all, only the reaction that uses what's there can start.",
    explain: `With only ${fromP ? P : R} present, the ${fromP ? "reverse" : "forward"} rate starts high and the other starts at zero. The mixture changes until both rates are equal: equilibrium.`,
  });
}

function dirRates(): Question {
  const f = rand(1, 9) * 0.1;
  let b = rand(1, 9) * 0.1;
  if (Math.random() < 0.2) b = f;
  const right = f > b ? "Toward products (net forward)" : f < b ? "Toward reactants (net reverse)" : "No net change: it's at equilibrium";
  return Q({
    key: `dr-${num(f, 1)}-${num(b, 1)}`,
    prompt: `At one moment, A ⇌ B has a forward rate of ${num(f, 1)} M/s and a reverse rate of ${num(b, 1)} M/s. Which way is the net reaction going?`,
    ...lab(right, ["Toward products (net forward)", "Toward reactants (net reverse)", "No net change: it's at equilibrium"].filter((x) => x !== right)),
    hint: "The net change goes the way of the faster reaction. Equal rates means equilibrium.",
    explain: f === b ? "The rates are equal, so the concentrations don't change: equilibrium." : `The ${f > b ? "forward" : "reverse"} reaction is faster, so there is a net change toward ${f > b ? "products" : "reactants"}.`,
  });
}

function dirPlot(): Question {
  const aEq = pick([0.2, 0.4, 0.6, 0.8]);
  const teq = pick([4, 5, 6, 7]);
  const fromP = Math.random() < 0.5;
  const { A, B } = eqCurves(aEq, teq, fromP);
  const right = fromP ? "Net reverse: B turned into A" : "Net forward: A turned into B";
  return Q({
    key: `dp-${aEq}-${teq}-${fromP}`,
    prompt: "The graph shows [A] and [B] for A ⇌ B. Which way did the reaction go before equilibrium?",
    visual: { kind: "plot", x: [0, 10], y: [0, 1], xLabel: "time (min)", yLabel: "concentration (M)", curves: [{ fn: A, label: "[A]", colour: "wave" }, { fn: B, label: "[B]", colour: "berry" }] },
    needsVisual: true,
    ...lab(right, ["Net reverse: B turned into A", "Net forward: A turned into B", "Neither: it started at equilibrium"].filter((x) => x !== right)),
    hint: "Which concentration starts high and falls?",
    explain: `[${fromP ? "B" : "A"}] starts at 1.0 M and falls while [${fromP ? "A" : "B"}] rises, so the net reaction was ${fromP ? "reverse" : "forward"} until both levelled off at ${teq} min.`,
  });
}

function dirQK(): Question {
  const rel = pick(["<", ">", "="] as const);
  const e = pick(GAS_EQS);
  const right =
    rel === "<" ? "Forward rate > reverse rate, so the net reaction goes right" : rel === ">" ? "Reverse rate > forward rate, so the net reaction goes left" : "The rates are equal, so there is no net change";
  return Q({
    key: `dq-${rel}-${eqStr(e)}`,
    prompt: `For ${eqStr(e)}, a mixture has Q ${rel} K. Which is true?`,
    ...lab(right, [
      "Forward rate > reverse rate, so the net reaction goes right",
      "Reverse rate > forward rate, so the net reaction goes left",
      "The rates are equal, so there is no net change",
      "K changes until it equals Q",
    ].filter((x) => x !== right)),
    hint: "Q < K means too few products for equilibrium, so more products must form. Q > K means too many products.",
    explain: `${rel === "=" ? "Q = K means the mixture is at equilibrium." : rel === "<" ? "Q < K: the mixture needs more products, so the forward reaction wins until Q = K." : "Q > K: the mixture has too many products, so the reverse reaction wins until Q = K."} K only changes with temperature.`,
  });
}

export const reactionDirection = mix(dirStart, dirStart, dirRates, dirPlot, dirQK);

/* ---------- Q and K expressions */

const toKp = (s: string) => s.replace(/\[([^\]]+)\]/g, "P($1)");

function kExpression(): Question {
  const e = pick(EQS);
  return Q({
    key: `ke-${eqStr(e)}`,
    prompt: "Which is the equilibrium-constant expression (Kc) for this reaction?",
    visual: eqVis(e),
    ...lab(`K = ${e.K}`, e.wrong.map((w) => `K = ${w}`)),
    hint: "Products over reactants, each raised to its coefficient. Leave out pure solids and liquids (like H₂O(l)).",
    explain: `K = ${e.K}. Coefficients become powers, and solids and liquids are left out.`,
  });
}

function kpExpression(): Question {
  const e = pick(GAS_EQS);
  return Q({
    key: `kp-${eqStr(e)}`,
    prompt: "Which is Kp for this reaction?",
    visual: eqVis(e),
    ...lab(`Kp = ${toKp(e.K)}`, e.wrong.map((w) => `Kp = ${toKp(w)}`)),
    hint: "Kp has the same form as Kc, but uses partial pressures of the gases instead of concentrations.",
    explain: `Kp = ${toKp(e.K)}: each gas's partial pressure, raised to its coefficient, products over reactants.`,
  });
}

function computeQ(): Question {
  const e = pick(GAS_EQS);
  const { conc, Q: q } = randomConc(e);
  if (q < 0.01 || q >= 1000) return computeQ();
  const ans = sig(q, 3);
  return Q({
    key: `cq-${eqStr(e)}-${concKey(conc)}`,
    prompt: `For ${eqStr(e)}, a mixture has the concentrations shown. Calculate Q to 3 significant figures.`,
    visual: concTable(conc),
    ...key(ans),
    hint: `Q has the same form as K: ${e.K}. Put in the concentrations you have right now.`,
    explain: `Q = ${e.K} = ${sf(ans, 3)}.`,
  });
}

const SOLID_EQS = EQS.filter((e) => !e.gas);
function leftOut(): Question {
  const e = pick(SOLID_EQS);
  const missing = [...e.r, ...e.p].filter((x) => x.state === "s" || x.state === "l").map((x) => termText({ ...x, coef: 1 }));
  const right = "Pure solids and liquids have a constant concentration (activity = 1)";
  return Q({
    key: `lo-${eqStr(e)}`,
    prompt: `K = ${e.K}. Why ${missing.length > 1 ? `are ${missing.join(" and ")}` : `is ${missing[0]}`} left out of the expression?`,
    visual: eqVis(e),
    ...lab(right, ["They don't take part in the reaction", "Their amounts are too small to matter", "Only gases can appear in K"]),
    hint: "Adding more of a pure solid doesn't change how concentrated it is.",
    explain: "The concentration of a pure solid or liquid is fixed by its density, so it doesn't change as the reaction runs. It is folded into K (activity = 1).",
  });
}

export const qkExpressions = mix(kExpression, kExpression, kpExpression, computeQ, computeQ, leftOut);

/* ---------- calculating K */

function kFromConc(): Question {
  const e = pick(GAS_EQS);
  const { conc, Q: k } = randomConc(e);
  if (k < 0.01 || k >= 1000) return kFromConc();
  const ans = sig(k, 3);
  return Q({
    key: `kc-${eqStr(e)}-${concKey(conc)}`,
    prompt: `${eqStr(e)} is at equilibrium with the concentrations shown. Calculate K to 3 significant figures.`,
    visual: concTable(conc),
    ...key(ans),
    hint: `K = ${e.K}, using the equilibrium concentrations. Don't forget the powers.`,
    explain: `K = ${e.K} = ${sf(ans, 3)}.`,
  });
}

function kpFromP(): Question {
  const e = pick(GAS_EQS.filter((x) => x.n[0] + x.n[1] <= 4));
  const { conc, Q: k } = randomConc(e);
  if (k < 0.01 || k >= 1000) return kpFromP();
  const ans = sig(k, 3);
  return Q({
    key: `kp-${eqStr(e)}-${concKey(conc)}`,
    prompt: `At equilibrium the partial pressures for ${eqStr(e)} are shown (atm). Calculate Kp to 3 significant figures.`,
    visual: table(["Gas", "P (atm)"], [...conc].map(([f, c]) => [f, num(c, 2)])),
    ...key(ans),
    hint: `Kp = ${toKp(e.K)}.`,
    explain: `Kp = ${toKp(e.K)} = ${sf(ans, 3)}.`,
  });
}

function kFromICE(): Question {
  const hi = Math.random() < 0.5;
  if (hi) {
    const a = pick([0.5, 0.8, 1.0, 1.2]);
    const h = dp(a * pick([0.4, 0.6, 0.8, 1.0, 1.2, 1.4]), 2);
    const left = dp(a - h / 2, 2);
    const K = sig((h * h) / (left * left), 3);
    return Q({
      key: `ih-${a}-${h}`,
      prompt: `H₂ and I₂ both start at ${num(a, 2)} M. At equilibrium [HI] = ${num(h, 2)} M. Use the ICE table to find K to 3 significant figures.`,
      visual: table(["", "H₂", "I₂", "HI"], [["I", num(a, 2), num(a, 2), 0], ["C", "−x", "−x", "+2x"], ["E", "?", "?", num(h, 2)]]),
      ...key(K),
      hint: "2x = [HI], so x = [HI] ÷ 2. Then [H₂] = [I₂] = start − x. K = [HI]² / ([H₂][I₂]).",
      explain: `x = ${num(h / 2, 3)} M, so [H₂] = [I₂] = ${num(left, 2)} M. K = ${num(h, 2)}² ÷ ${num(left, 2)}² = ${sf(K, 3)}.`,
    });
  }
  const a = pick([0.5, 1.0, 1.5, 2.0]);
  const x = dp(a * pick([0.2, 0.3, 0.4, 0.5, 0.6]), 2);
  const K = sig((x * x) / (a - x), 3);
  return Q({
    key: `ip-${a}-${x}`,
    prompt: `PCl₅ ⇌ PCl₃ + Cl₂ starts with ${num(a, 2)} M PCl₅. At equilibrium [Cl₂] = ${num(x, 2)} M. Find K to 3 significant figures.`,
    visual: table(["", "PCl₅", "PCl₃", "Cl₂"], [["I", num(a, 2), 0, 0], ["C", "−x", "+x", "+x"], ["E", "?", "?", num(x, 2)]]),
    ...key(K),
    hint: "x = [Cl₂]. Then [PCl₃] = x and [PCl₅] = start − x. K = [PCl₃][Cl₂] / [PCl₅].",
    explain: `[PCl₃] = ${num(x, 2)} M, [PCl₅] = ${num(a - x, 2)} M. K = ${num(x, 2)}² ÷ ${num(a - x, 2)} = ${sf(K, 3)}.`,
  });
}

export const calculatingK = mix(kFromConc, kFromConc, kpFromP, kFromICE, kFromICE);

/* ---------- size of K */

const randK = (lo: number, hi: number) => {
  const e = rand(lo, hi);
  return rand(11, 99) / 10 * 10 ** e;
};

function sizeK(): Question {
  const kind = rand(0, 2);
  const K = kind === 0 ? randK(-15, -4) : kind === 1 ? randK(4, 15) : rand(2, 30) / 10;
  const right = kind === 0 ? "Mostly reactants" : kind === 1 ? "Mostly products" : "Significant amounts of both";
  return Q({
    key: `sk-${sci(K)}`,
    prompt: `A reaction has K = ${sci(K)}. What does the equilibrium mixture contain?`,
    ...lab(right, ["Mostly reactants", "Mostly products", "Significant amounts of both", "Nothing; K tells you only the rate"].filter((x) => x !== right)),
    hint: "K is products over reactants. Much bigger than 1: products win. Much smaller than 1: reactants win.",
    explain: `K = ${sci(K)} is ${kind === 0 ? "much less than 1, so reactants are favored" : kind === 1 ? "much greater than 1, so products are favored" : "close to 1, so both are present in similar amounts"}.`,
  });
}

function orderK(): Question {
  const exps = some([-12, -9, -6, -3, -1, 0, 2, 5, 8, 11], 4).sort((a, b) => b - a);
  const ks = exps.map((e) => rand(11, 99) / 10 * 10 ** e);
  const items = ks.map((k) => `K = ${sci(k)}`);
  return Q({
    key: `ok-${items.join("|")}`,
    prompt: "Order these reactions from most product-favored to least.",
    ...act({ kind: "order", items, direction: "most product-favored first" }, 4),
    hint: "Compare the powers of 10 first: the biggest K has the most products at equilibrium.",
    explain: `${items.join(" > ")}. A larger K means a larger products-to-reactants ratio.`,
  });
}

function barsK(): Question {
  const a = rand(1, 9) / 10;
  let b = rand(1, 9) / 10;
  if (b === a) b = a === 0.9 ? 0.1 : dp(a + 0.1, 1);
  const right = b > a ? "K > 1" : "K < 1";
  return Q({
    key: `bk-${a}-${b}`,
    prompt: "The bars show equilibrium concentrations for A ⇌ B. Is K greater or less than 1?",
    visual: { kind: "bars", title: "At equilibrium (M)", items: [{ label: "[A]", value: a }, { label: "[B]", value: b }], max: 1, step: 0.2 },
    needsVisual: true,
    ...lab(right, ["K > 1", "K < 1", "K = 1"].filter((x) => x !== right)),
    hint: "K = [B]/[A]. Which bar is taller?",
    explain: `K = ${num(b, 1)} ÷ ${num(a, 1)} = ${sf(b / a, 2)}, which is ${b > a ? "more" : "less"} than 1.`,
  });
}

const BIG_K: { prompt: string; right: string; wrong: string[]; why: string }[] = [
  {
    prompt: "2H₂(g) + O₂(g) ⇌ 2H₂O(g) has K ≈ 10⁸⁰ at 25 °C, yet a balloon of H₂ and O₂ can sit for years. Why?",
    right: "K says where equilibrium lies, not how fast it is reached",
    wrong: ["K is wrong at room temperature", "The reaction is at equilibrium in the balloon", "A large K means a slow reaction"],
    why: "K is about the equilibrium position (thermodynamics). The speed depends on the activation energy (kinetics); a spark gets it going.",
  },
  {
    prompt: "For A ⇌ B, K = 1.0 × 10⁻¹⁰. A flask starts with 1.0 M A. Which is closest to [B] at equilibrium?",
    right: "About 1 × 10⁻¹⁰ M: almost no B forms",
    wrong: ["About 0.5 M", "About 1.0 M", "About 1 × 10¹⁰ M"],
    why: "[B]/[A] = 10⁻¹⁰ and [A] stays about 1.0 M, so [B] ≈ 10⁻¹⁰ M. Small K: the reaction barely goes.",
  },
  {
    prompt: "A reaction has K = 1.0. What does that tell you?",
    right: "At equilibrium, products and reactants (raised to their powers) balance exactly",
    wrong: ["The reaction does not happen", "The reaction goes to completion", "The reaction is very fast"],
    why: "K = 1 means the product terms equal the reactant terms at equilibrium; neither side is strongly favored.",
  },
];

function bigKIdea(): Question {
  const c = pick(BIG_K);
  return Q({ key: `bki-${c.prompt.slice(0, 30)}`, prompt: c.prompt, ...lab(c.right, c.wrong), hint: "K compares products to reactants at equilibrium.", explain: c.why });
}

export const sizeOfK = mix(sizeK, sizeK, orderK, orderK, barsK, bigKIdea);

/* ---------- properties of K */

function manipulateK(): Question {
  const e = pick(GAS_EQS);
  const K = randK(-6, 6);
  const ops = [
    { what: "the reverse reaction", f: (k: number) => 1 / k, how: "Reverse: K′ = 1/K" },
    { what: "the equation with every coefficient doubled", f: (k: number) => k * k, how: "Double: K′ = K²" },
    { what: "the equation with every coefficient tripled", f: (k: number) => k ** 3, how: "Triple: K′ = K³" },
    { what: "the equation with every coefficient halved", f: (k: number) => Math.sqrt(k), how: "Halve: K′ = K^½ = √K" },
    { what: "the reverse reaction with coefficients doubled", f: (k: number) => 1 / (k * k), how: "Reverse and double: K′ = 1/K²" },
  ];
  const op = pick(ops);
  const ans = sci(op.f(K));
  const wrongs = [1 / K, K * K, Math.sqrt(K), 2 * K, K / 2, 1 / (K * K), K ** 3, -K].map((x) => (x < 0 ? `−${sci(-x)}` : sci(x)));
  return Q({
    key: `mk-${eqStr(e)}-${sci(K)}-${op.what}`,
    prompt: `${eqStr(e)} has K = ${sci(K)}. What is K for ${op.what}?`,
    ...lab(ans, wrongs.filter((w) => w !== ans)),
    hint: "Reversing an equation inverts K. Multiplying coefficients by n raises K to the power n.",
    explain: `${op.how} = ${ans}.`,
  });
}

function manipulateNice(): Question {
  const K = pick([2, 4, 5, 0.5, 0.25, 10, 20]);
  const op = pick(["rev", "dbl", "revdbl"] as const);
  const ans = op === "rev" ? 1 / K : op === "dbl" ? K * K : 1 / (K * K);
  const what = op === "rev" ? "2B ⇌ A" : op === "dbl" ? "2A ⇌ 4B" : "4B ⇌ 2A";
  return Q({
    key: `mn-${K}-${op}`,
    prompt: `A ⇌ 2B has K = ${num(K)}. What is K for ${what}?`,
    ...key(ans),
    hint: "Reverse → 1/K. Double the coefficients → K².",
    explain: `${op === "rev" ? `1/${num(K)}` : op === "dbl" ? `${num(K)}²` : `1/${num(K)}²`} = ${num(clean(ans))}.`,
  });
}

function addK(): Question {
  const k1 = randK(-8, 4);
  const k2 = randK(-4, 8);
  const ans = sci(k1 * k2);
  return Q({
    key: `ak-${sci(k1)}-${sci(k2)}`,
    prompt: `N₂ + O₂ ⇌ 2NO has K₁ = ${sci(k1)}, and 2NO + O₂ ⇌ 2NO₂ has K₂ = ${sci(k2)} (same temperature). What is K for N₂ + 2O₂ ⇌ 2NO₂?`,
    ...lab(ans, [sci(k1 + k2), sci(k1 / k2), sci(k2 / k1), sci(Math.sqrt(k1 * k2))].filter((w) => w !== ans)),
    hint: "Adding two equations multiplies their K values (just as it adds their ΔH values).",
    explain: `K = K₁ × K₂ = ${sci(k1)} × ${sci(k2)} = ${ans}.`,
  });
}

export const propertiesOfK = mix(manipulateK, manipulateK, manipulateNice, addK);

/* ---------- ICE tables */

function iceSimple(): Question {
  const c = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0]);
  const K = pick([1, 2, 3, 4, 9]);
  const b = sig((c * K) / (1 + K), 3);
  return Q({
    key: `is-${c}-${K}`,
    prompt: `cis-2-butene ⇌ trans-2-butene has K = ${K}. A flask starts with ${num(c, 2)} M cis-2-butene. What is [trans] at equilibrium (M, 3 significant figures)?`,
    visual: table(["", "cis", "trans"], [["I", num(c, 2), 0], ["C", "−x", "+x"], ["E", `${num(c, 2)} − x`, "x"]]),
    unit: "M",
    ...key(b),
    hint: `K = x / (${num(c, 2)} − x). Solve: x = K × ${num(c, 2)} / (1 + K).`,
    explain: `${K} = x / (${num(c, 2)} − x) → x = ${K} × ${num(c, 2)} ÷ ${1 + K} = ${sf(b, 3)} M.`,
  });
}

function iceSquare(): Question {
  const c = pick([0.1, 0.2, 0.25, 0.4, 0.5, 1.0]);
  const K = pick([4, 9, 16, 25, 36, 49, 64]);
  const s = Math.sqrt(K);
  const x = (c * s) / (2 + s);
  const hi = sig(2 * x, 3);
  return Q({
    key: `iq-${c}-${K}`,
    prompt: `H₂(g) + I₂(g) ⇌ 2HI(g), K = ${K}. [H₂] and [I₂] both start at ${num(c, 2)} M, with no HI. Find [HI] at equilibrium (M, 3 significant figures).`,
    visual: table(["", "H₂", "I₂", "HI"], [["I", num(c, 2), num(c, 2), 0], ["C", "−x", "−x", "+2x"], ["E", `${num(c, 2)} − x`, `${num(c, 2)} − x`, "2x"]]),
    unit: "M",
    ...key(hi),
    hint: `K = (2x)² / (${num(c, 2)} − x)² is a perfect square: take the square root of both sides, √K = 2x / (${num(c, 2)} − x).`,
    explain: `${s} = 2x / (${num(c, 2)} − x) → x = ${s} × ${num(c, 2)} ÷ ${2 + s} = ${sf(x, 3)} M, so [HI] = 2x = ${sf(hi, 3)} M.`,
  });
}

function iceSmallX(): Question {
  const c = pick([0.1, 0.2, 0.25, 0.5, 1.0]);
  const K = pick([1.0, 1.6, 2.5, 4.0, 6.4]) * 10 ** -pick([5, 6, 7, 8]);
  const x = Math.sqrt(K * c);
  const ans = sci(x);
  return Q({
    key: `ix-${c}-${sci(K)}`,
    prompt: `PCl₅ ⇌ PCl₃ + Cl₂ has K = ${sci(K)} at a low temperature. [PCl₅] starts at ${num(c, 2)} M. Find [Cl₂] at equilibrium.`,
    visual: table(["", "PCl₅", "PCl₃", "Cl₂"], [["I", num(c, 2), 0, 0], ["C", "−x", "+x", "+x"], ["E", `${num(c, 2)} − x`, "x", "x"]]),
    ...lab(ans, [sci(K * c), sci(Math.sqrt(K)), sci(K / c), sci(2 * x), sci(x * x)].filter((w) => w !== ans)),
    hint: "K is tiny, so x is tiny compared with the starting amount: ${c} − x ≈ ${c}. Then K ≈ x² / c.".replace("${c}", num(c, 2)).replace("${c}", num(c, 2)),
    explain: `x² ≈ K × ${num(c, 2)} = ${sci(K * c)}, so x ≈ ${ans} M. That's under 5% of ${num(c, 2)} M, so the approximation holds.`,
  });
}

function iceChange(): Question {
  const e = pick(GAS_EQS);
  const all = [...e.r.map((x) => ({ ...x, side: -1 })), ...e.p.map((x) => ({ ...x, side: 1 }))];
  const ref = pick(all.filter((x) => (x.coef ?? 1) === 1));
  const target = pick(all.filter((x) => x !== ref));
  const k = (target.coef ?? 1) * target.side * ref.side * -1;
  const txt = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n) === 1 ? "" : Math.abs(n)}x`;
  const right = txt(k);
  return Q({
    key: `ic-${eqStr(e)}-${ref.formula}-${target.formula}`,
    prompt: `In an ICE table for ${eqStr(e)}, the change for ${ref.formula} is −x. What is the change for ${target.formula}?`,
    visual: eqVis(e),
    ...lab(right, [txt(-k), txt(k > 0 ? k + 1 : k - 1), txt(-(k > 0 ? k + 1 : k - 1)), "+x", "−x"].filter((w) => w !== right)),
    hint: "Changes follow the coefficients. Species on the same side as the one losing x also lose; the other side gains.",
    explain: `For every 1 ${ref.formula} used, ${Math.abs(k)} ${target.formula} is ${k > 0 ? "made" : "used"}, so the change is ${right}.`,
  });
}

export const iceTables = mix(iceSimple, iceSquare, iceSmallX, iceChange);

/* ---------- Do it: equilibrium particles */

const AB = (a: number, b: number, label?: string) => ({ species: [{ name: "A", colour: "wave" as const, count: a }, { name: "B", colour: "berry" as const, count: b }], label });

function buildRatio(): Question {
  const K = pick([2, 3, 4, 0.5, 0.25, 1 / 3]);
  const ratio = K >= 1 ? [1, K] : [Math.round(1 / K), 1];
  return Q({
    key: `br-${num(sig(K, 3))}`,
    prompt: `A ⇌ B has K = [B]/[A] = ${K === 1 / 3 ? "1/3" : num(K)}. Add particles to make a mixture that is at equilibrium.`,
    ...act({ kind: "chem-mix", mode: "mixture", species: [{ name: "A", colour: "wave" }, { name: "B", colour: "berry" }], target: { ratio } }, 1),
    hint: "In one container, the ratio of particle counts equals the ratio of concentrations. Make B ÷ A equal to K.",
    explain: `Any mixture with ${ratio[1]} B for every ${ratio[0]} A works, e.g. ${ratio[0] * 2} A and ${ratio[1] * 2} B.`,
  });
}

function buildCounts(): Question {
  const [n, a, b, K] = pick([
    [12, 4, 8, "2"],
    [12, 3, 9, "3"],
    [12, 8, 4, "0.5"],
    [10, 2, 8, "4"],
    [10, 5, 5, "1"],
    [9, 3, 6, "2"],
    [15, 5, 10, "2"],
    [12, 2, 10, "5"],
    [10, 8, 2, "0.25"],
    [16, 4, 12, "3"],
    [9, 6, 3, "0.5"],
    [15, 3, 12, "4"],
  ] as [number, number, number, string][]);
  return Q({
    key: `bc-${n}-${K}`,
    prompt: `A ⇌ B has K = ${K}. The box holds ${n} particles in all at equilibrium. Build it.`,
    ...act({ kind: "chem-mix", mode: "mixture", species: [{ name: "A", colour: "wave" }, { name: "B", colour: "berry" }], target: { counts: [a, b] }, max: 16 }, b),
    hint: `B = K × A and A + B = ${n}. Try values of A until both are true.`,
    explain: `${a} A + ${b} B = ${n}, and ${b} ÷ ${a} = ${K}.`,
  });
}

function countNO2(): Question {
  const n = rand(2, 7);
  const m = rand(1, 6);
  const K = sig((m * 0.1) / (n * 0.1) ** 2, 3);
  return Q({
    key: `cn-${n}-${m}`,
    prompt: "2NO₂ ⇌ N₂O₄ is at equilibrium in a 1.0 L box. Each particle stands for 0.10 mol. Find Kc to 3 significant figures.",
    visual: { kind: "chem-particles", panels: [{ species: [{ formula: "NO₂", count: n }, { formula: "N₂O₄", count: m }] }] },
    needsVisual: true,
    ...key(K),
    hint: "Count each kind, multiply by 0.10 M, then K = [N₂O₄] / [NO₂]².",
    explain: `[NO₂] = ${n} × 0.10 = ${num(n / 10, 2)} M; [N₂O₄] = ${num(m / 10, 2)} M. K = ${num(m / 10, 2)} ÷ ${num(n / 10, 2)}² = ${sf(K, 3)}.`,
  });
}

function countHI(): Question {
  const h = rand(1, 4);
  const i = rand(1, 4);
  const hi = rand(2, 8);
  const K = sig((hi * hi) / (h * i), 3);
  return Q({
    key: `ch-${h}-${i}-${hi}`,
    prompt: "H₂ + I₂ ⇌ 2HI is at equilibrium in this box. Find K to 3 significant figures. (The volume cancels here.)",
    visual: { kind: "chem-particles", panels: [{ species: [{ formula: "H₂", count: h }, { formula: "I₂", count: i }, { formula: "HI", count: hi }] }] },
    needsVisual: true,
    ...key(K),
    hint: "K = [HI]² / ([H₂][I₂]). Both sides have 2 moles of particles, so you can use particle counts directly.",
    explain: `K = ${hi}² ÷ (${h} × ${i}) = ${sf(K, 3)}.`,
  });
}

function whichBox(): Question {
  const K = pick([2, 0.5, 1]);
  const good = K === 2 ? [3, 6] : K === 0.5 ? [6, 3] : [4, 4];
  const bad = shuffle([
    [5, 4],
    [2, 7],
    [7, 2],
    [4, 5],
    [8, 1],
  ].filter(([a, b]) => b / a !== K)).slice(0, 2);
  const boxes = shuffle([good, ...bad]);
  const at = boxes.indexOf(good);
  return Q({
    key: `wb-${K}-${boxes.flat().join("")}`,
    prompt: `A ⇌ B has K = ${num(K)}. Which box is at equilibrium?`,
    visual: { kind: "chem-particles", panels: boxes.map((bx, i) => AB(bx[0], bx[1], `Box ${i + 1}`)), joiner: null, key: true },
    needsVisual: true,
    ...lab(`Box ${at + 1}`, [0, 1, 2].filter((i) => i !== at).map((i) => `Box ${i + 1}`)),
    hint: "Work out Q = B ÷ A for each box. The one with Q = K is at equilibrium.",
    explain: boxes.map((bx, i) => `Box ${i + 1}: Q = ${bx[1]}/${bx[0]}`).join("; ") + `. Box ${at + 1} has Q = K.`,
  });
}

function disturbBox(): Question {
  const a = pick([3, 4]);
  const b = 2 * a;
  const remove = rand(2, 4);
  const right = "More A turns into B until B/A is 2 again";
  return Q({
    key: `db-${a}-${remove}`,
    prompt: `A ⇌ B (K = 2) is at equilibrium in box 1. Then ${remove} B particles are removed (box 2). What happens next?`,
    visual: { kind: "chem-particles", panels: [AB(a, b, "Box 1"), AB(a, b - remove, "Box 2")], joinerLabel: `remove ${remove} B`, key: true },
    needsVisual: true,
    ...lab(right, ["Some B turns back into A", "Nothing: it stays as box 2", "K falls to match the new ratio"]),
    hint: "Find Q for box 2 and compare it with K.",
    explain: `Box 2 has Q = ${b - remove}/${a} < 2, so the forward reaction runs: some A becomes B until Q = K = 2 again.`,
  });
}

export const equilibriumParticles = mix(buildRatio, buildCounts, buildCounts, countNO2, countHI, whichBox, disturbBox);

/* ---------- Le Châtelier */

const SHIFT = ["Shifts right (more products)", "Shifts left (more reactants)", "No shift"];
type Stress = { text: string; shift: 0 | 1 | 2; K: "up" | "down" | "same" };
const LC_EQS = EQS.filter((e) => e.dH !== null);

function stresses(e: Equil): Stress[] {
  const out: Stress[] = [];
  const g = (ts: Term[]) => ts.filter((x) => x.state === "g");
  const rg = g(e.r);
  const pg = g(e.p);
  if (rg.length) out.push({ text: `Add ${rg[0].formula}`, shift: 0, K: "same" }, { text: `Remove some ${rg[rg.length - 1].formula}`, shift: 1, K: "same" });
  if (pg.length) out.push({ text: `Add ${pg[0].formula}`, shift: 1, K: "same" }, { text: `Remove some ${pg[pg.length - 1].formula}`, shift: 0, K: "same" });
  const solid = [...e.r, ...e.p].find((x) => x.state === "s");
  if (solid) out.push({ text: `Add more ${solid.formula}(s)`, shift: 2, K: "same" });
  const endo = (e.dH ?? 0) > 0;
  out.push({ text: "Raise the temperature", shift: endo ? 0 : 1, K: endo ? "up" : "down" }, { text: "Lower the temperature", shift: endo ? 1 : 0, K: endo ? "down" : "up" });
  const [nr, np] = e.n;
  out.push(
    { text: "Shrink the volume (raise the pressure)", shift: nr === np ? 2 : nr > np ? 0 : 1, K: "same" },
    { text: "Expand the volume (lower the pressure)", shift: nr === np ? 2 : nr > np ? 1 : 0, K: "same" },
    { text: "Add a catalyst", shift: 2, K: "same" },
    { text: "Add argon at constant volume", shift: 2, K: "same" },
  );
  return out;
}
const SHIFT_WHY = (e: Equil, s: Stress) => {
  if (s.text.startsWith("Add a catalyst")) return "A catalyst speeds up both directions equally, so the position doesn't change.";
  if (s.text.startsWith("Add argon")) return "Argon doesn't change any partial pressure or concentration in Q, so nothing shifts.";
  if (s.text.includes("(s)")) return "A pure solid isn't in K or Q, so adding more of it changes nothing.";
  if (s.text.includes("temperature")) return `ΔH = ${sgn(e.dH ?? 0)} kJ, so heat acts as a ${(e.dH ?? 0) > 0 ? "reactant" : "product"}. ${s.text.startsWith("Raise") ? "Adding" : "Removing"} heat shifts ${s.shift === 0 ? "right" : "left"}, and K ${s.K === "up" ? "increases" : "decreases"}.`;
  if (s.text.includes("volume")) return e.n[0] === e.n[1] ? "Both sides have the same number of gas molecules, so pressure changes don't favor either side." : `The system shifts toward the side with ${s.text.startsWith("Shrink") ? "fewer" : "more"} gas molecules (${e.n[0]} on the left, ${e.n[1]} on the right).`;
  return `The system shifts to use up what was added or replace what was removed: ${SHIFT[s.shift].toLowerCase()}.`;
};

function lcPredict(): Question {
  const e = pick(LC_EQS);
  const s = pick(stresses(e));
  return Q({
    key: `lp-${eqStr(e)}-${s.text}`,
    prompt: `${eqStr(e)} is at equilibrium. ${s.text}. What happens?`,
    visual: eqVis(e, true),
    ...lab(SHIFT[s.shift], SHIFT.filter((_, i) => i !== s.shift)),
    hint: "The system partly undoes the change. Heat counts as a reactant (ΔH > 0) or a product (ΔH < 0). Pressure favors the side with fewer gas molecules.",
    explain: SHIFT_WHY(e, s),
  });
}

function lcYield(): Question {
  const e = pick(LC_EQS);
  const all = stresses(e);
  const good = pick(all.filter((s) => s.shift === 0));
  const bad = some(all.filter((s) => s.shift !== 0), 3);
  const prod = e.p.find((x) => x.state === "g") ?? e.p[0];
  return Q({
    key: `ly-${eqStr(e)}-${good.text}-${bad.map((b) => b.text).join()}`,
    prompt: `Which change would increase the amount of ${prod.formula} at equilibrium?`,
    visual: eqVis(e, true),
    ...lab(good.text, bad.map((b) => b.text)),
    hint: "Find the change that makes the system shift right (toward products).",
    explain: `${good.text}: ${SHIFT_WHY(e, good)}`,
  });
}

function lcK(): Question {
  const e = pick(LC_EQS);
  const s = pick(stresses(e));
  const right = s.K === "up" ? "K increases" : s.K === "down" ? "K decreases" : "K stays the same";
  return Q({
    key: `lk-${eqStr(e)}-${s.text}`,
    prompt: `${eqStr(e)} is at equilibrium. ${s.text}. What happens to K?`,
    visual: eqVis(e, true),
    ...lab(right, ["K increases", "K decreases", "K stays the same"].filter((x) => x !== right)),
    hint: "Only a temperature change changes K. Other stresses change Q, and the system shifts until Q = K again.",
    explain: s.K === "same" ? `K depends only on temperature, so it stays the same. (${SHIFT_WHY(e, s)})` : SHIFT_WHY(e, s),
  });
}

function lcSort(): Question {
  const e = pick(LC_EQS);
  const items = some(stresses(e), 5);
  return Q({
    key: `ls-${eqStr(e)}-${items.map((i) => i.text).sort().join()}`,
    prompt: `${eqStr(e)}, ΔH = ${sgn(e.dH ?? 0)} kJ. Sort each change by how the equilibrium responds.`,
    visual: eqVis(e, true),
    ...act({ kind: "sort", bins: ["Shifts right", "Shifts left", "No shift"], items: items.map((s) => ({ label: s.text, bin: s.shift })) }, items.length),
    hint: "Added stuff gets used up; removed stuff gets replaced. Heat is a reactant if ΔH > 0. Fewer gas molecules wins under pressure. Catalysts and inert gases do nothing.",
    explain: items.map((s) => `${s.text}: ${SHIFT[s.shift].split(" (")[0].toLowerCase()}`).join("; ") + ".",
  });
}

export const leChatelier = mix(lcPredict, lcPredict, lcYield, lcK, lcSort, lcSort);

/* ---------- Q versus K */

function qkCompare(): Question {
  const e = pick(GAS_EQS);
  const { conc, Q: q } = randomConc(e);
  if (q < 0.01 || q >= 1000) return qkCompare();
  const f = pick([0.1, 0.2, 5, 10, 1]);
  const K = sig(q * f, 3);
  const rel = f === 1 ? 2 : f > 1 ? 0 : 1;
  const L = ["Q < K: shifts right", "Q > K: shifts left", "Q = K: at equilibrium"];
  return Q({
    key: `qk-${eqStr(e)}-${concKey(conc)}-${f}`,
    prompt: `For ${eqStr(e)}, K = ${sf(K, 3)}. A mixture has the concentrations shown. Which way will it go?`,
    visual: concTable(conc),
    ...lab(L[rel], L.filter((_, i) => i !== rel)),
    hint: `Calculate Q = ${e.K} for this mixture, then compare it with K.`,
    explain: `Q = ${sf(q, 3)} ${rel === 0 ? "<" : rel === 1 ? ">" : "="} K = ${sf(K, 3)}, so ${rel === 0 ? "more products form (shifts right)" : rel === 1 ? "products turn back into reactants (shifts left)" : "the mixture is already at equilibrium"}.`,
  });
}

function qkStress(): Question {
  const e = pick(LC_EQS.filter((x) => x.gas));
  const s = pick(stresses(e).filter((x) => x.text.startsWith("Add ") || x.text.startsWith("Remove")).filter((x) => !x.text.includes("(s)") && !x.text.includes("argon") && !x.text.includes("catalyst")));
  const right = s.shift === 0 ? "Q becomes less than K, so the reaction shifts right" : "Q becomes greater than K, so the reaction shifts left";
  return Q({
    key: `qs-${eqStr(e)}-${s.text}`,
    prompt: `${eqStr(e)} is at equilibrium. ${s.text}. Using Q, explain what happens.`,
    visual: eqVis(e),
    ...lab(right, ["Q becomes less than K, so the reaction shifts right", "Q becomes greater than K, so the reaction shifts left", "K changes to match the new Q", "Q and K both stay the same"].filter((x) => x !== right)),
    hint: `Q = ${e.K}. Does the change make the top bigger, or the bottom bigger?`,
    explain: `${s.text} ${s.shift === 0 ? "makes Q smaller" : "makes Q bigger"} while K stays fixed, so the system ${s.shift === 0 ? "makes more products" : "makes more reactants"} until Q = K.`,
  });
}

const VOL_EQS: { e: Equil; aq?: boolean }[] = [
  ...GAS_EQS.map((e) => ({ e })),
  { e: { r: [t("Fe³⁺", 1, "aq"), t("SCN⁻", 1, "aq")], p: [t("FeSCN²⁺", 1, "aq")], K: "[FeSCN²⁺] / ([Fe³⁺][SCN⁻])", wrong: [], dH: null, n: [2, 1], gas: false }, aq: true },
];

function qkVolume(): Question {
  const { e, aq } = pick(VOL_EQS);
  const halve = aq ? false : Math.random() < 0.5;
  const f = halve ? 2 : 0.5;
  const dn = e.n[1] - e.n[0];
  const qf = f ** dn;
  const facText = (x: number) => (x === 1 ? "unchanged" : x > 1 ? `× ${x}` : `× 1/${1 / x}`);
  const dir = qf > 1 ? "shifts left" : qf < 1 ? "shifts right" : "no shift";
  const right = `Q ${facText(qf)}; ${dir}`;
  const change = aq ? "is diluted with water to twice its volume" : halve ? "is squeezed to half its volume" : "is expanded to twice its volume";
  const wrongs = [
    `Q ${facText(1 / qf === qf ? 2 : 1 / qf)}; ${qf > 1 ? "shifts right" : "shifts left"}`,
    `Q ${facText(qf)}; ${qf > 1 ? "shifts right" : qf < 1 ? "shifts left" : "shifts right"}`,
    `Q ${facText(qf === 1 ? 0.5 : 1)}; no shift`,
    `Q ${facText(f)}; ${f > 1 ? "shifts left" : "shifts right"}`,
  ];
  return Q({
    key: `qv-${eqStr(e)}-${halve}`,
    prompt: `${eqStr(e)} at equilibrium ${change}. How does Q change, and which way does the system shift?`,
    visual: eqVis(e),
    ...lab(right, wrongs.filter((w) => w !== right)),
    hint: `Every concentration is multiplied by ${halve ? 2 : "½"}. Put that into Q = ${e.K} and see what happens to the ratio.`,
    explain: `Each concentration is ${halve ? "doubled" : "halved"}. With ${e.n[0]} particles on the left and ${e.n[1]} on the right in Q, Q is multiplied by (${halve ? 2 : "½"})^${dn} → ${facText(qf)}. ${qf === 1 ? "Q still equals K." : qf > 1 ? "Q > K, so it shifts left" : "Q < K, so it shifts right"}${qf === 1 ? "" : `, toward the side with ${halve ? "fewer" : "more"} particles`}.`,
  });
}

function qkTemp(): Question {
  const e = pick(LC_EQS);
  const up = Math.random() < 0.5;
  const endo = (e.dH ?? 0) > 0;
  const Kup = up === endo;
  const right = Kup ? "K increases, so now Q < K and it shifts right" : "K decreases, so now Q > K and it shifts left";
  return Q({
    key: `qt-${eqStr(e)}-${up}`,
    prompt: `${eqStr(e)}, ΔH = ${sgn(e.dH ?? 0)} kJ, is at equilibrium. The temperature is ${up ? "raised" : "lowered"}. Which explains what happens?`,
    visual: eqVis(e, true),
    ...lab(right, ["K increases, so now Q < K and it shifts right", "K decreases, so now Q > K and it shifts left", "Q changes but K stays the same", "Neither Q nor K changes"].filter((x) => x !== right)),
    hint: "Temperature is the one stress that changes K itself. For an endothermic reaction, heating increases K.",
    explain: `${endo ? "Endothermic" : "Exothermic"} and ${up ? "heated" : "cooled"}: K ${Kup ? "increases" : "decreases"}. Q hasn't changed yet, so Q ${Kup ? "<" : ">"} K and the system shifts ${Kup ? "right" : "left"}.`,
  });
}

export const qVersusK = mix(qkCompare, qkCompare, qkStress, qkVolume, qkTemp);

/* ---------- solubility (Ksp) */

interface Salt {
  f: string;
  cat: string;
  an: string;
  a: number;
  b: number;
  ksp: number;
}
const KSP: Salt[] = [
  { f: "AgCl", cat: "Ag⁺", an: "Cl⁻", a: 1, b: 1, ksp: 1.8e-10 },
  { f: "AgBr", cat: "Ag⁺", an: "Br⁻", a: 1, b: 1, ksp: 5.0e-13 },
  { f: "BaSO₄", cat: "Ba²⁺", an: "SO₄²⁻", a: 1, b: 1, ksp: 1.1e-10 },
  { f: "CaCO₃", cat: "Ca²⁺", an: "CO₃²⁻", a: 1, b: 1, ksp: 3.4e-9 },
  { f: "PbI₂", cat: "Pb²⁺", an: "I⁻", a: 1, b: 2, ksp: 9.8e-9 },
  { f: "CaF₂", cat: "Ca²⁺", an: "F⁻", a: 1, b: 2, ksp: 3.9e-11 },
  { f: "Mg(OH)₂", cat: "Mg²⁺", an: "OH⁻", a: 1, b: 2, ksp: 5.6e-12 },
  { f: "Ag₂CrO₄", cat: "Ag⁺", an: "CrO₄²⁻", a: 2, b: 1, ksp: 1.1e-12 },
  { f: "Ag₂CO₃", cat: "Ag⁺", an: "CO₃²⁻", a: 2, b: 1, ksp: 8.5e-12 },
];
const supP = (n: number) => (n > 1 ? "²³⁴"[n - 2] : "");
const kspExpr = (s: Salt) => `[${s.cat}]${supP(s.a)}[${s.an}]${supP(s.b)}`;
const molarS = (s: Salt) => (s.ksp / (s.a ** s.a * s.b ** s.b)) ** (1 / (s.a + s.b));
const kspForm = (s: Salt) => (s.a === s.b ? "Ksp = s²" : `Ksp = (${s.a === 2 ? "2s" : "s"})${s.a === 2 ? "²" : ""}(${s.b === 2 ? "2s" : "s"})${s.b === 2 ? "²" : ""} = 4s³`);
const dissolveVis = (s: Salt): Visual => reaction([t(s.f, 1, "s")], [t(s.cat, s.a, "aq"), t(s.an, s.b, "aq")], { arrow: "⇌" });

function kspExpression(): Question {
  const s = pick(KSP);
  const right = `Ksp = ${kspExpr(s)}`;
  return Q({
    key: `kx-${s.f}`,
    prompt: `Which is the Ksp expression for ${s.f}?`,
    visual: dissolveVis(s),
    ...lab(right, [
      `Ksp = ${kspExpr(s)} / [${s.f}]`,
      `Ksp = [${s.cat}][${s.an}]`,
      `Ksp = [${s.a > 1 ? `${s.a}` : ""}${s.cat}][${s.b > 1 ? `${s.b}` : ""}${s.an}]`,
      `Ksp = ${s.a > 1 ? s.a : ""}[${s.cat}]${s.b > 1 ? ` × ${s.b}` : " + "}[${s.an}]`,
    ].filter((w) => w !== right)),
    hint: "Write the dissolving equation. The solid is left out; each ion's concentration is raised to its coefficient.",
    explain: `${s.f}(s) ⇌ ${s.a > 1 ? s.a : ""}${s.cat} + ${s.b > 1 ? s.b : ""}${s.an}, so Ksp = ${kspExpr(s)}.`,
  });
}

function kspToS(): Question {
  const s = pick(KSP);
  const x = molarS(s);
  const ans = sci(x);
  return Q({
    key: `ks-${s.f}`,
    prompt: `${s.f} has Ksp = ${sci(s.ksp)}. What is its molar solubility in pure water (mol/L)?`,
    visual: dissolveVis(s),
    ...lab(ans, [sci(Math.sqrt(s.ksp)), sci(Math.cbrt(s.ksp)), sci(s.ksp / 2), sci(Math.cbrt(s.ksp / 2)), sci(Math.sqrt(s.ksp / 4))].filter((w) => w !== ans)),
    hint: `Let s = mol/L that dissolves. Each ion's concentration is its coefficient × s. ${s.a + s.b === 2 ? "Ksp = s²." : "Ksp = 4s³."}`,
    explain: `${kspForm(s)}, so s = ${s.a + s.b === 2 ? `√(${sci(s.ksp)})` : `∛(${sci(s.ksp)} ÷ 4)`} = ${ans} M.`,
  });
}

function sToKsp(): Question {
  const s = pick(KSP);
  const x = Number(molarS(s).toPrecision(2));
  const k = s.a ** s.a * s.b ** s.b * x ** (s.a + s.b);
  const ans = sci(k);
  return Q({
    key: `sk-${s.f}`,
    prompt: `The molar solubility of ${s.f} is ${sci(x)} M. Calculate Ksp.`,
    visual: dissolveVis(s),
    ...lab(ans, [sci(x * x), sci(x ** 3), sci(2 * x ** 3), sci(2 * x * x), sci(4 * x * x)].filter((w) => w !== ans)),
    hint: "Find each ion's concentration from s (watch the coefficients), then multiply them, raised to their powers.",
    explain: `${kspForm(s)} = ${ans}.`,
  });
}

function kspCompare(): Question {
  const pairs: [string, string][] = [
    ["AgCl", "Ag₂CrO₄"],
    ["AgCl", "PbI₂"],
    ["BaSO₄", "CaF₂"],
    ["AgBr", "Mg(OH)₂"],
    ["CaCO₃", "PbI₂"],
    ["AgCl", "Ag₂CO₃"],
    ["AgCl", "AgBr"],
    ["CaF₂", "Mg(OH)₂"],
  ];
  const [p, q] = shuffle(pick(pairs)).map((f) => KSP.find((s) => s.f === f)!);
  const more = molarS(p) > molarS(q) ? p : q;
  return Q({
    key: `kc-${p.f}-${q.f}`,
    prompt: `${p.f} has Ksp = ${sci(p.ksp)} and ${q.f} has Ksp = ${sci(q.ksp)}. Which dissolves more (higher molar solubility)?`,
    ...lab(more.f, [more === p ? q.f : p.f, "They dissolve equally", "You can't compare solubilities at all"]),
    hint: "You can only compare Ksp values directly when the salts make the same number of ions. Otherwise, work out s for each.",
    explain: `s(${p.f}) = ${sci(molarS(p))} M and s(${q.f}) = ${sci(molarS(q))} M, so ${more.f} is more soluble.`,
  });
}

const SOURCES: Record<string, string> = { "Ag⁺": "AgNO₃", "Cl⁻": "NaCl", "Br⁻": "NaBr", "Ba²⁺": "BaCl₂", "SO₄²⁻": "Na₂SO₄", "Ca²⁺": "CaCl₂", "CO₃²⁻": "Na₂CO₃", "Pb²⁺": "Pb(NO₃)₂", "I⁻": "KI", "F⁻": "NaF", "Mg²⁺": "MgCl₂", "OH⁻": "NaOH", "CrO₄²⁻": "K₂CrO₄" };

function precipitate(): Question {
  const s = pick(KSP);
  const c1 = pick([1e-4, 1e-3, 1e-2, 0.1]);
  const c2 = pick([1e-4, 1e-3, 1e-2, 0.1]);
  const v1 = pick([50, 100]);
  const v2 = pick([50, 100]);
  const m1 = (c1 * v1) / (v1 + v2);
  const m2 = (c2 * v2) / (v1 + v2);
  const q = m1 ** s.a * m2 ** s.b;
  if (q / s.ksp < 3 && s.ksp / q < 3) return precipitate();
  const yes = q > s.ksp;
  const Y = "Yes: Q > Ksp, so a precipitate forms";
  const N = "No: Q < Ksp, so it all stays dissolved";
  return Q({
    key: `pp-${s.f}-${c1}-${c2}-${v1}-${v2}`,
    prompt: `${v1} mL of ${sci(c1)} M ${SOURCES[s.cat]} is mixed with ${v2} mL of ${sci(c2)} M ${SOURCES[s.an]}. Will ${s.f} (Ksp = ${sci(s.ksp)}) precipitate?`,
    visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: v1, max: 250, label: SOURCES[s.cat] }, { glass: "beaker", volume: v2, max: 250, label: SOURCES[s.an] }], joiner: "+" },
    ...lab(yes ? Y : N, [yes ? N : Y, "Yes, because any amount of these ions reacts", "No, because Ksp is very small"]),
    hint: "First find each ion's concentration after mixing (it's diluted by the total volume). Then Q = Ksp expression with those values.",
    explain: `After mixing: [${s.cat}] = ${sci(m1)} M, [${s.an}] = ${sci(m2)} M. Q = ${kspExpr(s)} = ${sci(q)} ${yes ? ">" : "<"} Ksp = ${sci(s.ksp)}.`,
  });
}

export const solubility = mix(kspExpression, kspToS, kspToS, sToKsp, kspCompare, precipitate);

/* ---------- common ion and pH */

function commonIon(): Question {
  const s = pick(KSP);
  const onAnion = Math.random() < 0.5;
  const C = pick([0.01, 0.05, 0.1, 0.2]);
  const x = onAnion ? (s.ksp / C ** s.b) ** (1 / s.a) / s.a : (s.ksp / C ** s.a) ** (1 / s.b) / s.b;
  const ion = onAnion ? s.an : s.cat;
  const ans = sci(x);
  const formula = onAnion
    ? `Ksp = (${s.a > 1 ? "2s" : "s"})${s.a > 1 ? "²" : ""}(${num(C)})${s.b > 1 ? "²" : ""}`
    : `Ksp = (${num(C)})${s.a > 1 ? "²" : ""}(${s.b > 1 ? "2s" : "s"})${s.b > 1 ? "²" : ""}`;
  return Q({
    key: `ci-${s.f}-${onAnion}-${C}`,
    prompt: `What is the molar solubility of ${s.f} (Ksp = ${sci(s.ksp)}) in ${num(C)} M ${SOURCES[ion]}?`,
    visual: dissolveVis(s),
    ...lab(ans, [sci(molarS(s)), sci(s.ksp / C), sci(s.ksp * C), sci(Math.sqrt(s.ksp / C))].filter((w) => w !== ans)),
    hint: `The ${SOURCES[ion]} already supplies ${num(C)} M ${ion}, which is far more than dissolves, so use ${num(C)} for that ion and solve for s.`,
    explain: `${formula} → s = ${ans} M, much less than ${sci(molarS(s))} M in pure water: the common ion pushes the equilibrium left.`,
  });
}

function commonIdea(): Question {
  const s = pick(KSP);
  const add = pick([s.cat, s.an]);
  const right = `More ${s.f} precipitates, because Q > Ksp`;
  return Q({
    key: `cd-${s.f}-${add}`,
    prompt: `Solid ${s.f} sits in its saturated solution. Some ${SOURCES[add]} (a source of ${add}) is stirred in. What happens?`,
    visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 150, precipitate: true, label: "Saturated" }] },
    ...lab(right, [`More ${s.f} dissolves, because Q < Ksp`, "Ksp gets larger", "Nothing, because the solution was already saturated"]),
    hint: "Adding one of the ions raises Q above Ksp. Which way must the dissolving equilibrium go?",
    explain: `Extra ${add} makes Q = ${kspExpr(s)} bigger than Ksp, so the equilibrium shifts left and ${s.f} precipitates. Ksp itself only changes with temperature.`,
  });
}

const BASIC_SALTS: { f: string; how: string }[] = [
  { f: "CaCO₃", how: "H⁺ turns CO₃²⁻ into HCO₃⁻ (and CO₂)" },
  { f: "Mg(OH)₂", how: "H⁺ turns OH⁻ into H₂O" },
  { f: "CaF₂", how: "H⁺ turns F⁻ into HF, a weak acid" },
  { f: "Ag₂CO₃", how: "H⁺ turns CO₃²⁻ into HCO₃⁻" },
  { f: "Zn(OH)₂", how: "H⁺ turns OH⁻ into H₂O" },
  { f: "Ca₃(PO₄)₂", how: "H⁺ turns PO₄³⁻ into HPO₄²⁻" },
];

function phSoluble(): Question {
  const s = pick(BASIC_SALTS);
  return Q({
    key: `ps-${s.f}`,
    prompt: "Which salt becomes much more soluble when the solution is made acidic?",
    ...lab(s.f, some(["AgCl", "AgBr", "AgI", "PbCl₂", "PbBr₂"], 3)),
    hint: "Acid helps when the salt's anion is a base (the conjugate base of a weak acid, or OH⁻). Cl⁻, Br⁻ and I⁻ are conjugates of strong acids.",
    explain: `In ${s.f}, ${s.how}. That lowers the anion's concentration, so Q < Ksp and more dissolves.`,
  });
}

function phWhy(): Question {
  const s = pick(BASIC_SALTS);
  const right = `${cap(s.how)}, so Q < Ksp and more dissolves`;
  return Q({
    key: `pw-${s.f}`,
    prompt: `Why does adding HCl dissolve more ${s.f}?`,
    ...lab(right, ["Cl⁻ forms a soluble compound with the cation", "Acid raises the value of Ksp", "H⁺ lowers the temperature of the solution"]),
    hint: "Think about what H⁺ does to the salt's anion, then compare Q with Ksp.",
    explain: `${cap(s.how)}. With less anion in solution, Q drops below Ksp, so more solid dissolves (Le Châtelier).`,
  });
}

function hydroxidePH(): Question {
  const s = pick([
    { f: "Mg(OH)₂", cat: "Mg²⁺", ksp: 5.6e-12 },
    { f: "Fe(OH)₂", cat: "Fe²⁺", ksp: 4.9e-17 },
    { f: "Zn(OH)₂", cat: "Zn²⁺", ksp: 3.0e-17 },
  ]);
  const pH = pick([9, 10, 11, 12]);
  const oh = 10 ** (pH - 14);
  const x = s.ksp / (oh * oh);
  const ans = sci(x);
  return Q({
    key: `hp-${s.f}-${pH}`,
    prompt: `A solution is buffered at pH ${pH}. What is the molar solubility of ${s.f} (Ksp = ${sci(s.ksp)})?`,
    ...lab(ans, [sci(s.ksp / oh), sci(Math.cbrt(s.ksp / 4)), sci(s.ksp / (10 ** -pH) ** 2), sci(x / 10), sci(x * 100)].filter((w) => w !== ans)),
    hint: "pOH = 14 − pH gives [OH⁻]. The buffer holds [OH⁻] fixed, so Ksp = s[OH⁻]².",
    explain: `pOH = ${14 - pH}, [OH⁻] = 1 × 10${supNum(pH - 14)} M. s = Ksp ÷ [OH⁻]² = ${ans} M. Lower pH → less OH⁻ → more soluble.`,
  });
}

export const commonIonPH = mix(commonIon, commonIon, commonIdea, phSoluble, phWhy, hydroxidePH);

/* ---------- free energy of dissolution */

const DISS = [
  { f: "NH₄NO₃", dH: 25.7, dS: 108.7 },
  { f: "NaCl", dH: 3.9, dS: 43.4 },
  { f: "NH₄Cl", dH: 14.8, dS: 75.3 },
  { f: "KNO₃", dH: 34.9, dS: 116.5 },
  { f: "NaOH", dH: -44.5, dS: 42.7 },
  { f: "CaCl₂", dH: -81.3, dS: -44.8 },
  { f: "AgCl", dH: 65.5, dS: 32.9 },
];

function dissDG(): Question {
  const d = pick(DISS);
  const T = pick([273, 298, 310, 323, 348]);
  const dG = Math.round(d.dH - (T * d.dS) / 1000);
  return Q({
    key: `dg-${d.f}-${T}`,
    prompt: `For dissolving ${d.f}: ΔH° = ${sgn(d.dH, 1)} kJ/mol and ΔS° = ${sgn(d.dS, 1)} J/(mol·K). Find ΔG° at ${T} K, to the nearest kJ/mol.`,
    visual: reaction([t(d.f, 1, "s")], d.f === "CaCl₂" ? [t("Ca²⁺", 1, "aq"), t("Cl⁻", 2, "aq")] : [t(d.f === "NH₄NO₃" ? "NH₄⁺" : d.f === "NH₄Cl" ? "NH₄⁺" : d.f.startsWith("Na") ? "Na⁺" : d.f.startsWith("K") ? "K⁺" : "Ag⁺", 1, "aq"), t(d.f.endsWith("NO₃") ? "NO₃⁻" : d.f.endsWith("Cl") ? "Cl⁻" : "OH⁻", 1, "aq")]),
    unit: "kJ/mol",
    ...key(dG, true),
    hint: "ΔG° = ΔH° − TΔS°. Change ΔS° to kJ/(mol·K) first (divide by 1000).",
    explain: `ΔG° = ${num(d.dH, 1)} − ${T} × ${num(d.dS / 1000, 4)} = ${num(d.dH - (T * d.dS) / 1000, 1)} ≈ ${sgn(dG)} kJ/mol: ${dG < 0 ? "dissolving is favorable" : "dissolving is not favorable (a sparingly soluble salt)"}.`,
  });
}

function dissDriver(): Question {
  const d = pick(DISS.filter((x) => x.f !== "AgCl"));
  const right =
    d.dH > 0 ? "Entropy: the increase in disorder (TΔS°) outweighs the positive ΔH°" : d.dS < 0 ? "Enthalpy: strong ion–water attractions release heat, outweighing the entropy decrease" : "Both: ΔH° < 0 and ΔS° > 0 both favor dissolving";
  return Q({
    key: `dd-${d.f}`,
    prompt: `Dissolving ${d.f} has ΔH° = ${sgn(d.dH, 1)} kJ/mol and ΔS° = ${sgn(d.dS, 1)} J/(mol·K), and it dissolves readily at 25 °C. What drives it?`,
    ...lab(right, [
      "Entropy: the increase in disorder (TΔS°) outweighs the positive ΔH°",
      "Enthalpy: strong ion–water attractions release heat, outweighing the entropy decrease",
      "Both: ΔH° < 0 and ΔS° > 0 both favor dissolving",
      "Neither: it dissolves only because it is stirred",
    ].filter((x) => x !== right)),
    hint: "ΔG° = ΔH° − TΔS° must be negative. Which term makes it negative?",
    explain: `ΔG° = ${num(d.dH, 1)} − 298 × ${num(d.dS / 1000, 4)} = ${num(d.dH - 0.298 * d.dS, 1)} kJ/mol. ${right}.`,
  });
}

function dissSteps(): Question {
  const d = pick(DISS);
  const right = "Ions are surrounded by water molecules (ion–dipole attractions form)";
  return Q({
    key: `dsp-${d.f}`,
    prompt: `When ${d.f} dissolves, which step releases energy?`,
    visual: { kind: "chem-particles", panels: [{ species: [{ formula: "Na⁺", count: 4 }, { formula: "Cl⁻", count: 4 }, { formula: "H₂O", count: 10 }], arrangement: "liquid", container: "beaker", label: "Example: NaCl(aq)" }] },
    ...lab(right, ["Breaking apart the ionic lattice", "Pulling water molecules away from each other", "None of the steps; dissolving always absorbs energy"]),
    hint: "Separating things that attract takes energy. Bringing together things that attract releases it.",
    explain: "Breaking the lattice and separating water molecules both absorb energy. Forming ion–dipole attractions releases energy. ΔH(solution) is the sum, so it can be either sign.",
  });
}

function dissTemp(): Question {
  const d = pick(DISS.filter((x) => x.f !== "NaOH"));
  const more = d.dS > 0;
  const right = more ? "ΔG° becomes more negative, so it is more soluble" : "ΔG° becomes less negative, so it is less soluble";
  return Q({
    key: `dt-${d.f}`,
    prompt: `Dissolving ${d.f}: ΔH° = ${sgn(d.dH, 1)} kJ/mol, ΔS° = ${sgn(d.dS, 1)} J/(mol·K). How does warming the water change ΔG° of dissolving?`,
    ...lab(right, ["ΔG° becomes more negative, so it is more soluble", "ΔG° becomes less negative, so it is less soluble", "ΔG° doesn't depend on temperature"].filter((x) => x !== right)),
    hint: "In ΔG° = ΔH° − TΔS°, raising T makes the −TΔS° term matter more. What sign is ΔS°?",
    explain: `ΔS° is ${more ? "positive" : "negative"}, so a larger T makes −TΔS° ${more ? "more negative" : "more positive"}: ${right.toLowerCase()}.`,
  });
}

export const dissolutionEnergy = mix(dissDG, dissDG, dissDriver, dissSteps, dissTemp);

/* ============================================================== unit 8: acids and bases */

interface Acid {
  name: string;
  f: string;
  base: string;
  Ka: number;
  pKa: number;
}
const ACIDS: Acid[] = [
  { name: "hydrofluoric acid", f: "HF", base: "F⁻", Ka: 6.8e-4, pKa: 3.17 },
  { name: "nitrous acid", f: "HNO₂", base: "NO₂⁻", Ka: 4.5e-4, pKa: 3.35 },
  { name: "formic acid", f: "HCOOH", base: "HCOO⁻", Ka: 1.8e-4, pKa: 3.74 },
  { name: "benzoic acid", f: "C₆H₅COOH", base: "C₆H₅COO⁻", Ka: 6.3e-5, pKa: 4.2 },
  { name: "acetic acid", f: "CH₃COOH", base: "CH₃COO⁻", Ka: 1.8e-5, pKa: 4.74 },
  { name: "hypochlorous acid", f: "HClO", base: "ClO⁻", Ka: 3.0e-8, pKa: 7.52 },
  { name: "hydrocyanic acid", f: "HCN", base: "CN⁻", Ka: 6.2e-10, pKa: 9.21 },
];
const WEAK_BASES = [
  { name: "ammonia", f: "NH₃", acid: "NH₄⁺", Kb: 1.8e-5 },
  { name: "methylamine", f: "CH₃NH₂", acid: "CH₃NH₃⁺", Kb: 4.4e-4 },
  { name: "pyridine", f: "C₅H₅N", acid: "C₅H₅NH⁺", Kb: 1.7e-9 },
];
const pHof = (h: number) => -lg(h);

/* ---------- Kw */

function kwOH(): Question {
  const m = rand(10, 99) / 10;
  const e = rand(1, 13);
  const h = m * 10 ** -e;
  const fromH = Math.random() < 0.5;
  const other = 1e-14 / h;
  const ans = sci(other);
  return Q({
    key: `kw-${m}-${e}-${fromH}`,
    prompt: `At 25 °C a solution has [${fromH ? "H₃O⁺" : "OH⁻"}] = ${sci(h)} M. What is [${fromH ? "OH⁻" : "H₃O⁺"}]?`,
    ...lab(ans, [sci(h), sci(1e-14 * h), sci(10 ** -(14 - e)), sci(other * 10), sci(other / 10)].filter((w) => w !== ans)),
    hint: "Kw = [H₃O⁺][OH⁻] = 1.0 × 10⁻¹⁴ at 25 °C, so divide 1.0 × 10⁻¹⁴ by the one you know.",
    explain: `[${fromH ? "OH⁻" : "H₃O⁺"}] = 1.0 × 10⁻¹⁴ ÷ ${sci(h)} = ${ans} M.`,
  });
}

function kwClassify(): Question {
  const e = rand(2, 12);
  const m = rand(10, 99) / 10;
  const h = e === 7 && Math.random() < 0.5 ? 1e-7 : m * 10 ** -e;
  const fromH = Math.random() < 0.5;
  const shown = fromH ? h : 1e-14 / h;
  const kind = Math.abs(h - 1e-7) < 1e-12 ? 2 : h > 1e-7 ? 0 : 1;
  const L = ["Acidic", "Basic", "Neutral"];
  return Q({
    key: `kc-${sci(h)}-${fromH}`,
    prompt: `At 25 °C a solution has [${fromH ? "H₃O⁺" : "OH⁻"}] = ${sci(shown)} M. Is it acidic, basic or neutral?`,
    ...lab(L[kind], L.filter((_, i) => i !== kind)),
    hint: "Compare with 1.0 × 10⁻⁷ M. Acidic means [H₃O⁺] > [OH⁻].",
    explain: `[H₃O⁺] = ${sci(h)} M and [OH⁻] = ${sci(1e-14 / h)} M, so it is ${L[kind].toLowerCase()}.`,
  });
}

const KW_T = [
  { T: 0, kw: 1.1e-15 },
  { T: 10, kw: 2.9e-15 },
  { T: 40, kw: 2.9e-14 },
  { T: 50, kw: 5.5e-14 },
  { T: 60, kw: 9.6e-14 },
];

function kwTemp(): Question {
  const w = pick(KW_T);
  const pH = dp(pHof(Math.sqrt(w.kw)), 2);
  if (Math.random() < 0.5) {
    return Q({
      key: `kt-${w.T}`,
      prompt: `At ${w.T} °C, Kw = ${sci(w.kw)}. What is the pH of pure water at this temperature (2 decimal places)?`,
      ...key(pH),
      hint: "In pure water [H₃O⁺] = [OH⁻], so [H₃O⁺] = √Kw. Then pH = −log[H₃O⁺].",
      explain: `[H₃O⁺] = √(${sci(w.kw)}) = ${sci(Math.sqrt(w.kw))} M, so pH = ${num(pH, 2)}.`,
    });
  }
  const right = "Neutral, because [H₃O⁺] = [OH⁻]";
  return Q({
    key: `ktn-${w.T}`,
    prompt: `Pure water at ${w.T} °C has pH ${num(pH, 2)}. Is it acidic, basic or neutral?`,
    ...lab(right, [`${pH < 7 ? "Acidic" : "Basic"}, because its pH is ${pH < 7 ? "below" : "above"} 7`, "Acidic, because Kw has changed", "You can't tell without an indicator"]),
    hint: "Neutral means [H₃O⁺] = [OH⁻]. Is that still true in pure water?",
    explain: `Water's autoionization is endothermic, so Kw changes with temperature. pH 7 is neutral only at 25 °C; at ${w.T} °C neutral water has pH ${num(pH, 2)}.`,
  });
}

const CONJ: { r: [string, string]; p: [string, string] }[] = [
  { r: ["HF", "H₂O"], p: ["F⁻", "H₃O⁺"] },
  { r: ["NH₃", "H₂O"], p: ["NH₄⁺", "OH⁻"] },
  { r: ["HCO₃⁻", "H₂O"], p: ["CO₃²⁻", "H₃O⁺"] },
  { r: ["H₂O", "HCO₃⁻"], p: ["OH⁻", "H₂CO₃"] },
  { r: ["CH₃COOH", "NH₃"], p: ["CH₃COO⁻", "NH₄⁺"] },
  { r: ["HNO₂", "CN⁻"], p: ["NO₂⁻", "HCN"] },
  { r: ["H₂PO₄⁻", "OH⁻"], p: ["HPO₄²⁻", "H₂O"] },
];

function conjugates(): Question {
  const c = pick(CONJ);
  const kind = rand(0, 2);
  const ask = kind === 0 ? `the conjugate base of ${c.r[0]}` : kind === 1 ? `the conjugate acid of ${c.r[1]}` : "the Brønsted–Lowry acid on the left";
  const right = kind === 0 ? c.p[0] : kind === 1 ? c.p[1] : c.r[0];
  const all = [...new Set([...c.r, ...c.p])];
  return Q({
    key: `cj-${c.r.join()}-${kind}`,
    prompt: `In this reaction, which species is ${ask}?`,
    visual: reaction([t(c.r[0]), t(c.r[1])], [t(c.p[0]), t(c.p[1])], { arrow: "⇌" }),
    ...lab(right, all.filter((x) => x !== right)),
    hint: "An acid donates H⁺ and becomes its conjugate base (one H fewer, one more negative charge). A base accepts H⁺ and becomes its conjugate acid.",
    explain: `${c.r[0]} gives H⁺ to ${c.r[1]}: ${c.r[0]} → ${c.p[0]} (acid → conjugate base) and ${c.r[1]} → ${c.p[1]} (base → conjugate acid).`,
  });
}

export const waterKw = mix(kwOH, kwClassify, kwTemp, conjugates, conjugates);

/* ---------- strong acids and bases */

const STRONG_A = ["HCl", "HNO₃", "HBr", "HClO₄"];
const STRONG_B: [string, number][] = [
  ["NaOH", 1],
  ["KOH", 1],
  ["Ba(OH)₂", 2],
  ["Ca(OH)₂", 2],
];
const randConc = () => pick([1.0, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0]) * 10 ** -rand(1, 4);

function strongAcidPH(): Question {
  const a = pick(STRONG_A);
  const c = randConc();
  const pH = dp(pHof(c), 2);
  return Q({
    key: `sa-${a}-${c}`,
    prompt: `What is the pH of ${sci(c)} M ${a}? Give 2 decimal places.`,
    visual: { kind: "chem-ph", markers: [{ pH, label: "?", emoji: "🧪" }] },
    ...key(pH),
    hint: `${a} is a strong acid: it ionizes completely, so [H₃O⁺] = ${sci(c)} M. pH = −log[H₃O⁺].`,
    explain: `pH = −log(${sci(c)}) = ${num(pH, 2)}. (2 significant figures in the concentration → 2 decimal places in pH.)`,
  });
}

function strongBasePH(): Question {
  const [b, n] = pick(STRONG_B);
  const c = pick([1.0, 2.0, 2.5, 4.0, 5.0]) * 10 ** -rand(2, 4);
  const oh = n * c;
  const pOH = pHof(oh);
  const pH = dp(14 - pOH, 2);
  return Q({
    key: `sb-${b}-${c}`,
    prompt: `What is the pH of ${sci(c)} M ${b} at 25 °C? Give 2 decimal places.`,
    ...key(pH),
    hint: `${b} is a strong base${n === 2 ? " that gives 2 OH⁻ per formula unit" : ""}. Find [OH⁻], then pOH = −log[OH⁻] and pH = 14.00 − pOH.`,
    explain: `[OH⁻] = ${n === 2 ? `2 × ${sci(c)} = ` : ""}${sci(oh)} M; pOH = ${num(pOH, 2)}; pH = 14.00 − ${num(pOH, 2)} = ${num(pH, 2)}.`,
  });
}

function fromPH(): Question {
  const pH = rand(100, 1300) / 100;
  const askOH = Math.random() < 0.5;
  const h = 10 ** -pH;
  const ans = askOH ? sci(1e-14 / h) : sci(h);
  return Q({
    key: `fp-${pH}-${askOH}`,
    prompt: `A solution has pH ${num(pH, 2)} at 25 °C. What is [${askOH ? "OH⁻" : "H₃O⁺"}]?`,
    visual: { kind: "chem-ph", markers: [{ pH, label: num(pH, 2), emoji: "🧪" }] },
    ...lab(ans, [sci(askOH ? h : 1e-14 / h), sci(10 ** -(14 - pH) * 10), sci(10 ** -pH * 10), sci(10 ** -(pH / 2))].filter((w) => w !== ans)),
    hint: askOH ? "pOH = 14.00 − pH, then [OH⁻] = 10^(−pOH)." : "[H₃O⁺] = 10^(−pH).",
    explain: askOH ? `pOH = ${num(14 - pH, 2)}, so [OH⁻] = 10^−${num(14 - pH, 2)} = ${ans} M.` : `[H₃O⁺] = 10^−${num(pH, 2)} = ${ans} M.`,
  });
}

function dilutePH(): Question {
  const acid = Math.random() < 0.5;
  const pH0 = acid ? rand(1, 3) : rand(11, 13);
  const f = pick([10, 100]);
  const pH = acid ? pH0 + lg(f) : pH0 - lg(f);
  return Q({
    key: `dl-${acid}-${pH0}-${f}`,
    prompt: `A strong ${acid ? "acid" : "base"} solution with pH ${pH0}.00 is diluted ${f}-fold with water. What is the new pH?`,
    ...key(pH),
    hint: `Diluting ${f}-fold divides [${acid ? "H₃O⁺" : "OH⁻"}] by ${f}. Each factor of 10 moves the pH one unit toward 7.`,
    explain: `[${acid ? "H₃O⁺" : "OH⁻"}] falls by ${f}, so ${acid ? "pH rises" : "pOH rises, and pH falls"} by ${lg(f)}: pH = ${pH}.00.`,
  });
}

function phScale(): Question {
  const vals = some([1, 2, 3, 4, 5, 9, 10, 11, 12, 13], 4).sort((a, b) => a - b);
  const names = ["A", "B", "C", "D"];
  const i = rand(0, 3);
  const v = vals[i];
  const what = v < 7 ? `1.0 × 10${supNum(-v)} M HCl` : `1.0 × 10${supNum(v - 14)} M NaOH`;
  return Q({
    key: `ps-${vals.join()}-${i}`,
    prompt: `Which marker shows ${what}?`,
    visual: { kind: "chem-ph", markers: vals.map((p, j) => ({ pH: p, label: names[j] })) },
    needsVisual: true,
    ...lab(names[i], names.filter((_, j) => j !== i)),
    hint: v < 7 ? "For a strong acid, pH = −log[H₃O⁺]." : "For a strong base, pOH = −log[OH⁻] and pH = 14 − pOH.",
    explain: v < 7 ? `pH = −log(10${supNum(-v)}) = ${v}: marker ${names[i]}.` : `pOH = ${14 - v}, so pH = ${v}: marker ${names[i]}.`,
  });
}

export const strongAcidsBases = mix(strongAcidPH, strongAcidPH, strongBasePH, fromPH, dilutePH, phScale);

/* ---------- weak acids and bases */

const exactX = (K: number, c: number) => (-K + Math.sqrt(K * K + 4 * K * c)) / 2;
const CONCS = [0.05, 0.1, 0.2, 0.25, 0.5, 1.0];

function weakAcidPH(): Question {
  const a = pick(ACIDS);
  const c = pick(CONCS);
  const x = exactX(a.Ka, c);
  const pH = dp(pHof(x), 2);
  if (dp(pHof(Math.sqrt(a.Ka * c)), 2) !== pH) return weakAcidPH();
  return Q({
    key: `wa-${a.f}-${c}`,
    prompt: `What is the pH of ${num(c, 2)} M ${a.name}, ${a.f} (Ka = ${sci(a.Ka)})? Give 2 decimal places.`,
    visual: table(["", a.f, "H₃O⁺", a.base], [["I", num(c, 2), "≈ 0", 0], ["C", "−x", "+x", "+x"], ["E", `${num(c, 2)} − x`, "x", "x"]]),
    ...key(pH),
    hint: `Ka = x² / (${num(c, 2)} − x). Ka is small, so x ≪ ${num(c, 2)}: x ≈ √(Ka × c). Then pH = −log x.`,
    explain: `x = √(${sci(a.Ka)} × ${num(c, 2)}) = ${sci(x)} M (under 5% of ${num(c, 2)}, so the shortcut works). pH = ${num(pH, 2)}.`,
  });
}

function percentIon(): Question {
  const a = pick(ACIDS.slice(2));
  const c = pick(CONCS);
  const x = exactX(a.Ka, c);
  const pct = sig((x / c) * 100, 2);
  return Q({
    key: `pi-${a.f}-${c}`,
    prompt: `What percent of ${num(c, 2)} M ${a.f} (Ka = ${sci(a.Ka)}) is ionized? Give 2 significant figures.`,
    unit: "%",
    ...key(pct),
    hint: "Find x = [H₃O⁺] at equilibrium, then % ionized = x ÷ (starting concentration) × 100.",
    explain: `x ≈ √(${sci(a.Ka)} × ${num(c, 2)}) = ${sci(x)} M; ${sci(x)} ÷ ${num(c, 2)} × 100 = ${num(pct)}%. Diluting the acid would raise this percentage.`,
  });
}

function kaFromPH(): Question {
  const a = pick(ACIDS);
  const c = pick(CONCS);
  const pH = dp(pHof(exactX(a.Ka, c)), 2);
  const x = 10 ** -pH;
  const Ka = (x * x) / (c - x);
  const ans = sci(Ka);
  return Q({
    key: `kp-${a.f}-${c}`,
    prompt: `A ${num(c, 2)} M solution of a weak acid HA has pH ${num(pH, 2)}. What is Ka?`,
    ...lab(ans, [sci(x), sci(x / c), sci(Ka * 100), sci(Math.sqrt(Ka)), sci(x * x * c)].filter((w) => w !== ans)),
    hint: "[H₃O⁺] = [A⁻] = 10^(−pH) = x. Then Ka = x² / (c − x).",
    explain: `x = 10^−${num(pH, 2)} = ${sci(x)} M; Ka = (${sci(x)})² ÷ (${num(c, 2)} − ${sci(x)}) = ${ans}. That matches ${a.name}.`,
  });
}

function weakBasePH(): Question {
  const b = pick(WEAK_BASES);
  const c = pick(CONCS);
  const x = exactX(b.Kb, c);
  const pH = dp(14 - pHof(x), 2);
  if (dp(14 - pHof(Math.sqrt(b.Kb * c)), 2) !== pH) return weakBasePH();
  return Q({
    key: `wb-${b.f}-${c}`,
    prompt: `What is the pH of ${num(c, 2)} M ${b.name}, ${b.f} (Kb = ${sci(b.Kb)}), at 25 °C? Give 2 decimal places.`,
    visual: reaction([t(b.f, 1, "aq"), t("H₂O", 1, "l")], [t(b.acid, 1, "aq"), t("OH⁻", 1, "aq")], { arrow: "⇌" }),
    ...key(pH),
    hint: "Kb = x² / (c − x) with x = [OH⁻]. Use x ≈ √(Kb × c), then pOH = −log x and pH = 14.00 − pOH.",
    explain: `[OH⁻] = √(${sci(b.Kb)} × ${num(c, 2)}) = ${sci(x)} M; pOH = ${num(pHof(x), 2)}; pH = ${num(pH, 2)}.`,
  });
}

function kaKb(): Question {
  if (Math.random() < 0.5) {
    const a = pick(ACIDS);
    const ans = sci(1e-14 / a.Ka);
    return Q({
      key: `kk-${a.f}`,
      prompt: `${a.f} has Ka = ${sci(a.Ka)}. What is Kb for its conjugate base, ${a.base}?`,
      ...lab(ans, [sci(a.Ka), sci(1 / a.Ka), sci(1e-14 * a.Ka), sci(Math.sqrt(1e-14 / a.Ka))].filter((w) => w !== ans)),
      hint: "For a conjugate pair, Ka × Kb = Kw = 1.0 × 10⁻¹⁴.",
      explain: `Kb = 1.0 × 10⁻¹⁴ ÷ ${sci(a.Ka)} = ${ans}. The weaker the acid, the stronger its conjugate base.`,
    });
  }
  const b = pick(WEAK_BASES);
  const ans = sci(1e-14 / b.Kb);
  return Q({
    key: `kkb-${b.f}`,
    prompt: `${b.f} has Kb = ${sci(b.Kb)}. What is Ka for ${b.acid}?`,
    ...lab(ans, [sci(b.Kb), sci(1 / b.Kb), sci(1e-14 * b.Kb), sci(Math.sqrt(1e-14 / b.Kb))].filter((w) => w !== ans)),
    hint: "Ka × Kb = Kw = 1.0 × 10⁻¹⁴.",
    explain: `Ka = 1.0 × 10⁻¹⁴ ÷ ${sci(b.Kb)} = ${ans}.`,
  });
}

function weakCompare(): Question {
  const [a, b] = some(ACIDS, 2);
  const c = pick(CONCS);
  const lower = a.Ka > b.Ka ? a : b;
  return Q({
    key: `wc-${a.f}-${b.f}-${c}`,
    prompt: `${num(c, 2)} M ${a.f} (Ka = ${sci(a.Ka)}) and ${num(c, 2)} M ${b.f} (Ka = ${sci(b.Ka)}). Which solution has the lower pH?`,
    ...lab(`${lower.f}`, [`${lower === a ? b.f : a.f}`, "Same pH, because the concentrations are equal"]),
    hint: "At the same concentration, the acid with the larger Ka ionizes more and makes more H₃O⁺.",
    explain: `${lower.f} has the larger Ka, so it produces more H₃O⁺ and has the lower pH.`,
  });
}

export const weakAcidsBases = mix(weakAcidPH, weakAcidPH, percentIon, kaFromPH, weakBasePH, kaKb, weakCompare);

/* ---------- acid–base reactions */

function strongMix(): Question {
  const V1 = pick([10.0, 20.0, 25.0, 30.0, 40.0, 50.0]);
  const V2 = pick([10.0, 20.0, 25.0, 30.0, 40.0, 50.0]);
  const c1 = pick([0.1, 0.2]);
  const c2 = pick([0.1, 0.2]);
  const a = V1 * c1;
  const b = V2 * c2;
  if (Math.abs(a - b) < 0.1) return strongMix();
  const ex = Math.abs(a - b) / (V1 + V2);
  const pH = dp(a > b ? pHof(ex) : 14 - pHof(ex), 2);
  return Q({
    key: `sm-${V1}-${c1}-${V2}-${c2}`,
    prompt: `${num(V1, 1)} mL of ${num(c1, 3)} M HCl is mixed with ${num(V2, 1)} mL of ${num(c2, 3)} M NaOH. What is the pH? Give 2 decimal places.`,
    visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: V1, max: 100, label: "HCl" }, { glass: "beaker", volume: V2, max: 100, label: "NaOH", colour: "grape" }], joiner: "+" },
    ...key(pH),
    hint: "Find millimoles of H₃O⁺ and OH⁻ (mL × M). They cancel 1 : 1. Divide what's left over by the total volume.",
    explain: `H₃O⁺: ${num(a, 2)} mmol; OH⁻: ${num(b, 2)} mmol. ${num(Math.abs(a - b), 2)} mmol ${a > b ? "H₃O⁺" : "OH⁻"} left in ${num(V1 + V2, 1)} mL = ${sci(ex, 3)} M, so pH = ${num(pH, 2)}.`,
  });
}

function whatsInFlask(): Question {
  const a = pick(ACIDS.slice(0, 6));
  const n = pick([2.0, 2.5, 5.0]);
  const k = rand(0, 2);
  const b = k === 0 ? n / 2 : k === 1 ? n : n * 1.5;
  const L = [`${a.f} and ${a.base}: a buffer`, `${a.base} only: a weakly basic solution`, `${a.base} and extra OH⁻: a strongly basic solution`, `${a.f} only: a weakly acidic solution`];
  return Q({
    key: `wf-${a.f}-${n}-${k}`,
    prompt: `${num(n, 1)} mmol of ${a.f} reacts with ${num(b, 2)} mmol of NaOH. Which species mainly remain (besides Na⁺ and water)?`,
    visual: reaction([t(a.f, 1, "aq"), t("OH⁻", 1, "aq")], [t(a.base, 1, "aq"), t("H₂O", 1, "l")]),
    ...lab(L[k], L.filter((_, i) => i !== k)),
    hint: "OH⁻ reacts completely with the weak acid, 1 : 1. Compare the amounts to see what is left.",
    explain:
      k === 0
        ? `Half the ${a.f} becomes ${a.base}: ${num(n / 2, 2)} mmol of each, a buffer.`
        : k === 1
          ? `All the ${a.f} becomes ${a.base}. ${a.base} is a weak base, so the solution is slightly basic (this is the equivalence point).`
          : `All the ${a.f} is used and ${num(b - n, 2)} mmol of OH⁻ is left over, which makes the solution strongly basic.`,
  });
}

const NET_IONIC: { what: string; right: string; wrong: string[] }[] = [
  { what: "HF(aq) + NaOH(aq)", right: "HF + OH⁻ → F⁻ + H₂O", wrong: ["H⁺ + OH⁻ → H₂O", "HF + NaOH → NaF + H₂O", "F⁻ + H₂O → HF + OH⁻"] },
  { what: "HCl(aq) + NaOH(aq)", right: "H₃O⁺ + OH⁻ → 2H₂O", wrong: ["HCl + OH⁻ → Cl⁻ + H₂O", "HCl + NaOH → NaCl + H₂O", "Na⁺ + Cl⁻ → NaCl"] },
  { what: "CH₃COOH(aq) + KOH(aq)", right: "CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O", wrong: ["H₃O⁺ + OH⁻ → 2H₂O", "CH₃COOH + KOH → CH₃COOK + H₂O", "CH₃COO⁻ + H₃O⁺ → CH₃COOH + H₂O"] },
  { what: "NH₃(aq) + HCl(aq)", right: "NH₃ + H₃O⁺ → NH₄⁺ + H₂O", wrong: ["NH₃ + HCl → NH₄Cl", "H₃O⁺ + OH⁻ → 2H₂O", "NH₄⁺ + OH⁻ → NH₃ + H₂O"] },
  { what: "HNO₂(aq) + NaOH(aq)", right: "HNO₂ + OH⁻ → NO₂⁻ + H₂O", wrong: ["H₃O⁺ + OH⁻ → 2H₂O", "HNO₂ + Na⁺ → NaNO₂ + H⁺", "NO₂⁻ + H₂O → HNO₂ + OH⁻"] },
  { what: "NH₃(aq) + CH₃COOH(aq)", right: "NH₃ + CH₃COOH → NH₄⁺ + CH₃COO⁻", wrong: ["H₃O⁺ + OH⁻ → 2H₂O", "NH₄⁺ + CH₃COO⁻ → NH₃ + CH₃COOH", "NH₃ + H₃O⁺ → NH₄⁺ + H₂O"] },
];

function netIonic(): Question {
  const n = pick(NET_IONIC);
  return Q({
    key: `ni-${n.what}`,
    prompt: `Which is the net ionic equation for ${n.what}?`,
    ...lab(n.right, n.wrong),
    hint: "Strong acids and strong bases are written as ions (H₃O⁺, OH⁻). Weak acids and bases stay as molecules. Leave out spectator ions like Na⁺, K⁺, Cl⁻.",
    explain: `${n.right}. Weak species are written whole, and spectator ions are left out.`,
  });
}

function particleNeutralize(): Question {
  const n = rand(5, 9);
  const m = rand(1, n - 1);
  const askLeft = Math.random() < 0.5;
  return Q({
    key: `pn-${n}-${m}-${askLeft}`,
    prompt: `The beaker holds weak acid HA and some OH⁻ just added. After the reaction HA + OH⁻ → A⁻ + H₂O, how many ${askLeft ? "HA" : "A⁻"} particles are there?`,
    visual: { kind: "chem-particles", panels: [{ species: [{ name: "HA", colour: "wave", count: n }, { name: "OH⁻", colour: "berry", count: m }], container: "beaker", arrangement: "liquid" }] },
    needsVisual: true,
    ...key(askLeft ? n - m : m),
    hint: "Each OH⁻ removes one HA and makes one A⁻. OH⁻ is the limiting reactant here.",
    explain: `${m} OH⁻ react with ${m} HA, making ${m} A⁻ and leaving ${n - m} HA. A mix of HA and A⁻ is a buffer.`,
  });
}

function makesBuffer(): Question {
  const a = pick(ACIDS.slice(0, 6));
  const n = pick([0.1, 0.2, 0.3]);
  const right = `${num(2 * n, 1)} mol ${a.f} + ${num(n, 1)} mol NaOH`;
  return Q({
    key: `mb-${a.f}-${n}`,
    prompt: "Which mixture (in 1 L of water) makes a buffer?",
    ...lab(right, [`${num(n, 1)} mol ${a.f} + ${num(n, 1)} mol NaOH`, `${num(n, 1)} mol HCl + ${num(n, 1)} mol NaCl`, `${num(n, 1)} mol NH₃ + ${num(2 * n, 1)} mol HCl`, `${num(n, 1)} mol ${a.f} + ${num(n, 1)} mol HCl`]),
    hint: "A buffer needs a weak acid AND its conjugate base left over after any reaction. Check what remains once the strong acid or base has reacted completely.",
    explain: `${right}: half the ${a.f} becomes ${a.base}, leaving ${num(n, 1)} mol of each. Equal amounts of acid and base would leave only ${a.base}; HCl/NaCl has no weak acid; excess HCl leaves a strong acid.`,
  });
}

export const acidBaseReactions = mix(strongMix, whatsInFlask, netIonic, particleNeutralize, makesBuffer);

/* ---------- titration curves */

function titration() {
  const analyte: "acid" | "base" = Math.random() < 0.75 ? "acid" : "base";
  const weak = Math.random() < 0.7;
  const veq = pick([10, 15, 20, 25, 30, 40]);
  const V = pick([20.0, 25.0, 50.0]);
  const ct = pick([0.1, 0.2]);
  const ca = (ct * veq) / V;
  const acid = pick([ACIDS[0], ACIDS[2], ACIDS[3], ACIDS[4], ACIDS[5]]);
  const pK = weak ? (analyte === "acid" ? acid.pKa : 4.74) : undefined;
  return { analyte, weak, veq, V, ct, ca, pK, acid };
}
const curveVis = (x: ReturnType<typeof titration>, extra: Partial<Extract<Visual, { kind: "chem-titration"; mode: "curve" }>> = {}): Visual => ({
  kind: "chem-titration",
  mode: "curve",
  analyte: x.analyte,
  pK: x.pK,
  conc: x.ca,
  volume: x.V,
  titrantConc: x.ct,
  ...extra,
});
const analyteName = (x: ReturnType<typeof titration>) => (x.analyte === "acid" ? (x.weak ? x.acid.f : "HCl") : x.weak ? "NH₃" : "NaOH");
const titrantName = (x: ReturnType<typeof titration>) => (x.analyte === "acid" ? "NaOH" : "HCl");

function readEquivalence(): Question {
  const x = titration();
  return Q({
    key: `re-${x.analyte}-${x.weak}-${x.veq}-${x.V}-${x.ct}-${x.pK}`,
    prompt: `${num(x.V, 1)} mL of ${analyteName(x)} is titrated with ${num(x.ct, 3)} M ${titrantName(x)}. What volume of titrant reaches the equivalence point (mL)?`,
    visual: curveVis(x),
    needsVisual: true,
    unit: "mL",
    ...key(x.veq),
    hint: "The equivalence point is the middle of the steep jump in pH. Read its volume on the x-axis.",
    explain: `The steepest point is at ${x.veq} mL: there the moles of ${titrantName(x)} added equal the moles of ${analyteName(x)} at the start.`,
  });
}

function analyteConc(): Question {
  const x = titration();
  const ans = sig(x.ca, 3);
  return Q({
    key: `ac-${x.analyte}-${x.weak}-${x.veq}-${x.V}-${x.ct}-${x.pK}`,
    prompt: `${num(x.V, 1)} mL of ${analyteName(x)} is titrated with ${num(x.ct, 3)} M ${titrantName(x)}. Use the curve to find the concentration of the ${analyteName(x)} (M, 3 significant figures).`,
    visual: curveVis(x),
    needsVisual: true,
    unit: "M",
    ...key(ans),
    hint: "At equivalence, moles of titrant = moles of analyte (1 : 1). So c(analyte) × V(analyte) = c(titrant) × V(equivalence).",
    explain: `Equivalence at ${x.veq} mL: n = ${num(x.ct, 3)} × ${x.veq} = ${num(x.ct * x.veq, 2)} mmol; c = ${num(x.ct * x.veq, 2)} ÷ ${num(x.V, 1)} = ${sf(ans, 3)} M.`,
  });
}

function whichAcidCurve(): Question {
  const set = [ACIDS[0], ACIDS[4], ACIDS[5], ACIDS[6]];
  const a = pick(set.slice(0, 3));
  const x = { ...titration(), analyte: "acid" as const, weak: true, pK: a.pKa, acid: a };
  const lbl = (y: Acid) => `${y.f} (pKa ${num(y.pKa, 2)})`;
  return Q({
    key: `wa-${a.f}-${x.veq}-${x.V}-${x.ct}`,
    prompt: "A weak acid is titrated with NaOH. Use the half-equivalence point to identify the acid.",
    visual: curveVis(x, { halfEquivalence: "pH = ?" }),
    needsVisual: true,
    ...lab(lbl(a), set.filter((y) => y !== a).map(lbl)),
    hint: "At half the equivalence volume, half the HA has become A⁻, so [HA] = [A⁻] and pH = pKa.",
    explain: `At ${x.veq / 2} mL (half of ${x.veq} mL) the pH is about ${num(a.pKa, 1)}, so pKa ≈ ${num(a.pKa, 2)}: ${a.name}.`,
  });
}

function eqPHof(x: ReturnType<typeof titration>): number {
  if (!x.weak) return 7;
  const conc = (x.ca * x.V) / (x.V + x.veq);
  if (x.analyte === "acid") {
    const kb = 1e-14 / x.acid.Ka;
    return 14 - pHof(Math.sqrt(kb * conc));
  }
  const ka = 1e-14 / 1.8e-5;
  return pHof(Math.sqrt(ka * conc));
}

function eqSide(): Question {
  const x = titration();
  const e = eqPHof(x);
  const L = ["Above 7", "Below 7", "Exactly 7"];
  const k = !x.weak ? 2 : x.analyte === "acid" ? 0 : 1;
  return Q({
    key: `es-${x.analyte}-${x.weak}-${x.veq}-${x.V}-${x.ct}-${x.pK}`,
    prompt: `${analyteName(x)} is titrated with ${titrantName(x)}. Is the pH at the equivalence point above, below or exactly 7?`,
    visual: curveVis(x, { equivalence: "?" }),
    ...lab(L[k], L.filter((_, i) => i !== k)),
    hint: "At equivalence only the salt is left. A weak acid's conjugate base makes the solution basic; a weak base's conjugate acid makes it acidic.",
    explain: !x.weak
      ? "Strong acid + strong base gives a neutral salt (like NaCl), so pH = 7.00."
      : x.analyte === "acid"
        ? `Only ${x.acid.base} is left, a weak base, so pH ≈ ${num(e, 1)} (above 7).`
        : `Only NH₄⁺ is left, a weak acid, so pH ≈ ${num(e, 1)} (below 7).`,
  });
}

const INDICATORS = [
  { name: "Methyl orange", from: 3.1, to: 4.4 },
  { name: "Methyl red", from: 4.4, to: 6.2 },
  { name: "Bromothymol blue", from: 6.0, to: 7.6 },
  { name: "Phenolphthalein", from: 8.2, to: 10.0 },
];

function pickIndicator(): Question {
  const x = titration();
  const e = eqPHof(x);
  const best = INDICATORS.reduce((b, i) => (Math.abs((i.from + i.to) / 2 - e) < Math.abs((b.from + b.to) / 2 - e) ? i : b));
  const lbl = (i: (typeof INDICATORS)[number]) => `${i.name} (${num(i.from, 1)}–${num(i.to, 1)})`;
  return Q({
    key: `pi-${x.analyte}-${x.weak}-${x.veq}-${x.V}-${x.ct}-${x.pK}`,
    prompt: `${analyteName(x)} is titrated with ${titrantName(x)}. Which indicator's color-change range best fits the equivalence point?`,
    visual: curveVis(x),
    needsVisual: true,
    ...lab(lbl(best), INDICATORS.filter((i) => i !== best).map(lbl)),
    hint: "Pick the indicator whose color-change range sits on the steep part of the curve, around the equivalence pH.",
    explain: `The equivalence pH is about ${num(e, 1)}, which falls in the range of ${best.name.toLowerCase()} (${num(best.from, 1)}–${num(best.to, 1)}).`,
  });
}

export const titrationCurves = mix(readEquivalence, analyteConc, whichAcidCurve, eqSide, pickIndicator);

/* ---------- Do it: titrate */

function readBurette(): Question {
  const r = rand(10, 480) / 10;
  return Q({
    key: `rb-${r}`,
    prompt: "Read the burette at the bottom of the meniscus (mL).",
    visual: { kind: "chem-titration", mode: "burette", reading: r, ask: true, flask: "rose" },
    needsVisual: true,
    unit: "mL",
    ...key(r),
    hint: "A burette reads from 0 at the TOP, so numbers increase going down. Read where the bottom of the curved surface sits.",
    explain: `The bottom of the meniscus is at ${num(r, 1)} mL.`,
  });
}

function titre(): Question {
  const start = rand(0, 20) / 10;
  const end = dp(start + rand(150, 400) / 10, 1);
  const v = dp(end - start, 1);
  return Q({
    key: `ti-${start}-${end}`,
    prompt: `The burette read ${num(start, 1)} mL before the titration. The flask has just turned pink. Read the burette and find the volume delivered (mL).`,
    visual: { kind: "chem-titration", mode: "burette", reading: end, ask: true, flask: "rose" },
    needsVisual: true,
    unit: "mL",
    ...key(v),
    hint: "Volume delivered = final reading − initial reading. The scale increases downward.",
    explain: `Final reading ${num(end, 1)} mL − initial ${num(start, 1)} mL = ${num(v, 1)} mL.`,
  });
}

function titrCalc(): Question {
  const kind = rand(0, 2);
  const Vb = dp(rand(150, 450) / 10, 1);
  const cb = pick([0.1, 0.15, 0.2]);
  const Va = pick([20.0, 25.0]);
  const ratio = kind === 1 ? 0.5 : kind === 2 ? 2 : 1;
  const acid = kind === 1 ? "H₂SO₄" : "HCl";
  const base = kind === 2 ? "Ba(OH)₂" : "NaOH";
  const ca = sig(((cb * Vb) / Va) * (kind === 1 ? 0.5 : kind === 2 ? 2 : 1), 3);
  return Q({
    key: `tc-${kind}-${Vb}-${cb}-${Va}`,
    prompt: `${num(Va, 1)} mL of ${acid} needs ${num(Vb, 1)} mL of ${num(cb, 3)} M ${base} to reach the end point. What is the ${acid} concentration (M, 3 significant figures)?`,
    visual: reaction(kind === 1 ? [t("H₂SO₄", 1, "aq"), t("NaOH", 2, "aq")] : kind === 2 ? [t("HCl", 2, "aq"), t("Ba(OH)₂", 1, "aq")] : [t("HCl", 1, "aq"), t("NaOH", 1, "aq")], kind === 1 ? [t("Na₂SO₄", 1, "aq"), t("H₂O", 2, "l")] : kind === 2 ? [t("BaCl₂", 1, "aq"), t("H₂O", 2, "l")] : [t("NaCl", 1, "aq"), t("H₂O", 1, "l")]),
    unit: "M",
    ...key(ca),
    hint: `Moles of base = M × V. Use the equation's mole ratio${ratio !== 1 ? " (it isn't 1 : 1 here)" : ""} to get moles of acid, then divide by the acid's volume.`,
    explain: `n(${base}) = ${num(cb, 3)} × ${num(Vb, 1)} = ${num(cb * Vb, 3)} mmol → n(${acid}) = ${num(cb * Vb * (kind === 1 ? 0.5 : kind === 2 ? 2 : 1), 3)} mmol; c = ÷ ${num(Va, 1)} mL = ${sf(ca, 3)} M.`,
  });
}

function measureAcid(): Question {
  const c = pick([0.1, 0.2, 0.5]);
  const V = rand(10, 50);
  const n = dp(c * V, 2);
  return Q({
    key: `ma-${c}-${V}`,
    prompt: `You need ${num(n, 2)} mmol of HCl from a ${num(c, 3)} M stock. Measure the right volume in the cylinder.`,
    ...act({ kind: "chem-measure", mode: "fill", glass: "cylinder", target: V, max: 50, step: 1, colour: "clear" }, V),
    hint: "V = n ÷ c. mmol ÷ M gives mL.",
    explain: `V = ${num(n, 2)} mmol ÷ ${num(c, 3)} M = ${V} mL.`,
  });
}

export const doTitration = mix(readBurette, titre, titre, titrCalc, measureAcid, measureAcid);

/* ---------- structure and acid strength */

const ACID_SETS: { items: string[]; why: string }[] = [
  { items: ["HI", "HBr", "HCl", "HF"], why: "Down the group the H–X bond gets longer and weaker, so H⁺ leaves more easily." },
  { items: ["HClO₄", "HClO₃", "HClO₂", "HClO"], why: "Each extra O pulls electron density from the O–H bond and spreads the negative charge of the conjugate base." },
  { items: ["HOCl", "HOBr", "HOI"], why: "A more electronegative halogen pulls electron density from the O–H bond and stabilizes the conjugate base." },
  { items: ["CCl₃COOH", "CHCl₂COOH", "CH₂ClCOOH", "CH₃COOH"], why: "Each electronegative Cl pulls electron density toward itself, stabilizing the carboxylate ion." },
  { items: ["H₂Se", "H₂S", "H₂O"], why: "Down the group the H–X bond gets longer and weaker." },
  { items: ["HNO₃", "HNO₂", "HClO"], why: "More O atoms on the central atom (and N's higher electronegativity than in HClO's O–Cl) pull more electron density from O–H." },
];

function orderAcids(): Question {
  const s = pick(ACID_SETS);
  const n = s.items.length === 4 && Math.random() < 0.5 ? 3 : s.items.length;
  const start = rand(0, s.items.length - n);
  const items = s.items.slice(start, start + n);
  return Q({
    key: `oa-${items.join()}`,
    prompt: "Order these acids from strongest to weakest.",
    ...act({ kind: "order", items, direction: "strongest acid first" }, items.length),
    hint: "Ask what makes H⁺ easier to lose: a weaker H–X bond, or electronegative atoms pulling electron density away from the O–H bond.",
    explain: `${items.join(" > ")}. ${s.why}`,
  });
}

const STRENGTH_WHY: { prompt: string; right: string; wrong: string[] }[] = [
  {
    prompt: "F is more electronegative than I, yet HI is a much stronger acid than HF. Why?",
    right: "The H–I bond is much longer and weaker, so it breaks more easily",
    wrong: ["I⁻ is more electronegative than F⁻", "HF is a gas and HI is a liquid", "HI has more electrons to donate"],
  },
  {
    prompt: "Why is HClO₄ a far stronger acid than HClO?",
    right: "The extra O atoms pull electron density from O–H and spread out the negative charge of ClO₄⁻",
    wrong: ["HClO₄ has more H atoms to give away", "The Cl–O bonds in HClO₄ are weaker", "HClO₄ is a larger molecule, so it dissolves better"],
  },
  {
    prompt: "Why is HOCl a stronger acid than HOI?",
    right: "Cl is more electronegative, so it pulls electron density away from the O–H bond",
    wrong: ["I is more electronegative than Cl", "The O–I bond is shorter", "HOI has a weaker O–H bond"],
  },
  {
    prompt: "Why is CCl₃COOH (trichloroacetic acid) much stronger than CH₃COOH?",
    right: "The electronegative Cl atoms stabilize the conjugate base by pulling electron density",
    wrong: ["Cl atoms donate H⁺ too", "CCl₃COOH has a weaker C=O bond", "The Cl atoms make the molecule more polar, so it dissolves more"],
  },
  {
    prompt: "Why is CH₃COOH a much stronger acid than CH₃CH₂OH (ethanol)?",
    right: "In CH₃COO⁻ the negative charge is shared by two O atoms (resonance)",
    wrong: ["Ethanol has no O–H bond", "CH₃COOH has more H atoms", "Ethanol is a strong base"],
  },
];

function strengthWhy(): Question {
  const s = pick(STRENGTH_WHY);
  return Q({
    key: `sw-${s.prompt.slice(0, 30)}`,
    prompt: s.prompt,
    ...lab(s.right, s.wrong),
    hint: "A stronger acid has an H that's easier to remove and a more stable conjugate base.",
    explain: `${s.right}.`,
  });
}

const BASE_SETS: { bases: string[]; acids: string[] }[] = [
  { bases: ["F⁻", "Cl⁻", "Br⁻", "I⁻"], acids: ["HF", "HCl", "HBr", "HI"] },
  { bases: ["ClO⁻", "ClO₂⁻", "ClO₃⁻", "ClO₄⁻"], acids: ["HClO", "HClO₂", "HClO₃", "HClO₄"] },
  { bases: ["CH₃COO⁻", "CH₂ClCOO⁻", "CHCl₂COO⁻", "CCl₃COO⁻"], acids: ["CH₃COOH", "CH₂ClCOOH", "CHCl₂COOH", "CCl₃COOH"] },
];

function strongestBase(): Question {
  const s = pick(BASE_SETS);
  const strong = Math.random() < 0.5;
  const right = strong ? s.bases[0] : s.bases[3];
  return Q({
    key: `sb-${s.bases[0]}-${strong}`,
    prompt: `Which is the ${strong ? "strongest" : "weakest"} base: ${shuffle(s.bases).join(", ")}?`,
    ...lab(right, s.bases.filter((b) => b !== right)),
    hint: "The weaker the acid, the stronger its conjugate base.",
    explain: `${right} is the conjugate base of ${strong ? s.acids[0] : s.acids[3]}, the ${strong ? "weakest" : "strongest"} acid of the set, so it is the ${strong ? "strongest" : "weakest"} base.`,
  });
}

export const acidStructure = mix(orderAcids, orderAcids, strengthWhy, strengthWhy, strongestBase);

/* ---------- pH and pKa */

function formAt(): Question {
  const a = pick(ACIDS);
  const d = pick([-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]);
  const pH = dp(a.pKa + d, 2);
  if (pH < 0.5 || pH > 13.5) return formAt();
  const L = [`Mostly ${a.f}`, `Mostly ${a.base}`, "Equal amounts of both"];
  const k = d < 0 ? 0 : d > 0 ? 1 : 2;
  return Q({
    key: `fa-${a.f}-${d}`,
    prompt: `${a.f} has pKa ${num(a.pKa, 2)}. In a solution at pH ${num(pH, 2)}, which form is mainly present?`,
    visual: { kind: "chem-ph", markers: [{ pH: a.pKa, label: "pKa" }, { pH, label: "pH", emoji: "🧪" }] },
    ...lab(L[k], L.filter((_, i) => i !== k)),
    hint: "pH < pKa: lots of H₃O⁺, so the protonated acid form wins. pH > pKa: the deprotonated base form wins. pH = pKa: equal.",
    explain: `pH ${d < 0 ? "<" : d > 0 ? ">" : "="} pKa, so ${k === 2 ? `[${a.f}] = [${a.base}]` : k === 0 ? `the protonated form ${a.f} dominates` : `the deprotonated form ${a.base} dominates`}. [A⁻]/[HA] = 10^(pH − pKa) = 10^${num(d)}.`,
  });
}

function ratioAt(): Question {
  const a = pick(ACIDS);
  const d = pick([-3, -2, -1, 1, 2, 3]);
  const pH = dp(a.pKa + d, 2);
  if (pH < 0.5 || pH > 13.5) return ratioAt();
  const r = (x: number) => (x >= 0 ? `${10 ** x} : 1` : `1 : ${10 ** -x}`);
  return Q({
    key: `ra-${a.f}-${d}`,
    prompt: `${a.f} has pKa ${num(a.pKa, 2)}. At pH ${num(pH, 2)}, what is the ratio [${a.base}] : [${a.f}]?`,
    ...lab(r(d), [r(-d), `${Math.abs(d)} : 1`, `1 : ${Math.abs(d)}`, r(d > 0 ? d + 1 : d - 1)].filter((x) => x !== r(d))),
    hint: "[A⁻]/[HA] = 10^(pH − pKa). Each pH unit is a factor of 10.",
    explain: `pH − pKa = ${num(d)}, so [${a.base}]/[${a.f}] = 10^${num(d)} = ${r(d)}.`,
  });
}

const INDIC = [
  { name: "bromothymol blue", pKa: 7.1, acid: "Yellow", base: "Blue", mid: "Green" },
  { name: "phenolphthalein", pKa: 9.4, acid: "Colorless", base: "Pink", mid: "Pale pink" },
  { name: "methyl orange", pKa: 3.7, acid: "Red", base: "Yellow", mid: "Orange" },
  { name: "methyl red", pKa: 5.1, acid: "Red", base: "Yellow", mid: "Orange" },
];

function indicatorColor(): Question {
  const i = pick(INDIC);
  const d = pick([-3, -2, 0, 2, 3]);
  const pH = dp(i.pKa + d, 1);
  const right = d < 0 ? `${i.acid} (mostly HIn)` : d > 0 ? `${i.base} (mostly In⁻)` : `${i.mid} (HIn and In⁻ equal)`;
  return Q({
    key: `ic-${i.name}-${d}`,
    prompt: `${cap(i.name)} (pKa ${num(i.pKa, 1)}) is ${i.acid.toLowerCase()} as HIn and ${i.base.toLowerCase()} as In⁻. What color is it at pH ${num(pH, 1)}?`,
    visual: { kind: "chem-ph", markers: [{ pH, label: "?", emoji: "🧪" }] },
    ...lab(right, [`${i.acid} (mostly HIn)`, `${i.base} (mostly In⁻)`, `${i.mid} (HIn and In⁻ equal)`].filter((x) => x !== right)),
    hint: "An indicator is a weak acid. Compare the pH with its pKa, as for any acid.",
    explain: `pH ${d < 0 ? "is below" : d > 0 ? "is above" : "equals"} the pKa, so ${d < 0 ? "HIn dominates" : d > 0 ? "In⁻ dominates" : "the two forms are equal"}: ${right.split(" (")[0].toLowerCase()}.`,
  });
}

function drugForm(): Question {
  const drug = pick([
    { name: "aspirin", pKa: 3.5 },
    { name: "ibuprofen", pKa: 4.9 },
    { name: "lactic acid", pKa: 3.9 },
    { name: "phenol", pKa: 10.0 },
  ]);
  const place = pick([
    { name: "the stomach", pH: 1.5 },
    { name: "blood", pH: 7.4 },
    { name: "the small intestine", pH: 6.5 },
  ]);
  const right = place.pH < drug.pKa ? "Mostly the neutral acid (HA)" : "Mostly the ionized base form (A⁻)";
  return Q({
    key: `df-${drug.name}-${place.name}`,
    prompt: `${cap(drug.name)} is a weak acid with pKa ${num(drug.pKa, 1)}. Which form is mainly present in ${place.name} (pH ${num(place.pH, 1)})?`,
    ...lab(right, ["Mostly the neutral acid (HA)", "Mostly the ionized base form (A⁻)", "Equal amounts of HA and A⁻"].filter((x) => x !== right)),
    hint: "Compare pH with pKa: below pKa the acid keeps its H⁺; above it, it loses H⁺.",
    explain: `pH ${num(place.pH, 1)} is ${place.pH < drug.pKa ? "below" : "above"} the pKa (${num(drug.pKa, 1)}), so ${right.toLowerCase().replace("mostly ", "the ")} dominates.`,
  });
}

export const pHandPKa = mix(formAt, formAt, ratioAt, indicatorColor, drugForm);

/* ---------- buffers */

const PAIRS = [
  { acid: "CH₃COOH", base: "CH₃COO⁻", salt: "CH₃COONa", pKa: 4.74 },
  { acid: "NH₄⁺", base: "NH₃", salt: "NH₄Cl", pKa: 9.25 },
  { acid: "HF", base: "F⁻", salt: "NaF", pKa: 3.17 },
  { acid: "H₂CO₃", base: "HCO₃⁻", salt: "NaHCO₃", pKa: 6.35 },
  { acid: "H₂PO₄⁻", base: "HPO₄²⁻", salt: "Na₂HPO₄", pKa: 7.21 },
  { acid: "HNO₂", base: "NO₂⁻", salt: "KNO₂", pKa: 3.35 },
  { acid: "HCOOH", base: "HCOO⁻", salt: "HCOONa", pKa: 3.74 },
];
const pairName = (p: (typeof PAIRS)[number]) => (p.acid === "NH₄⁺" ? "NH₃ and NH₄Cl" : p.acid === "H₂PO₄⁻" ? "NaH₂PO₄ and Na₂HPO₄" : `${p.acid} and ${p.salt}`);

function bufferPair(): Question {
  const p = pick(PAIRS);
  return Q({
    key: `bp-${p.acid}`,
    prompt: "Which pair of substances, dissolved together, makes a buffer?",
    ...lab(pairName(p), some(["HCl and NaCl", "HNO₃ and KNO₃", "NaOH and NaCl", "HBr and NaBr", "KOH and KNO₃", "HClO₄ and NaClO₄"], 3)),
    hint: "A buffer is a weak acid with its conjugate base (or a weak base with its conjugate acid), in similar amounts.",
    explain: `${pairName(p)} gives ${p.acid} and ${p.base}, a weak conjugate pair. A strong acid's anion (Cl⁻, NO₃⁻…) is too weak a base to buffer.`,
  });
}

function bufferReact(): Question {
  const p = pick(PAIRS);
  const addAcid = Math.random() < 0.5;
  const right = addAcid ? `${p.base} + H₃O⁺ → ${p.acid} + H₂O` : `${p.acid} + OH⁻ → ${p.base} + H₂O`;
  return Q({
    key: `br-${p.acid}-${addAcid}`,
    prompt: `A little ${addAcid ? "HCl" : "NaOH"} is added to a buffer of ${p.acid} and ${p.base}. Which reaction keeps the pH nearly constant?`,
    ...lab(right, [addAcid ? `${p.acid} + H₃O⁺ → ${p.base} + H₂O` : `${p.base} + OH⁻ → ${p.acid} + H₂O`, "H₃O⁺ + OH⁻ → 2H₂O", addAcid ? `${p.acid} + OH⁻ → ${p.base} + H₂O` : `${p.base} + H₃O⁺ → ${p.acid} + H₂O`]),
    hint: `Added ${addAcid ? "acid (H₃O⁺) is soaked up by the buffer's base" : "base (OH⁻) is soaked up by the buffer's acid"}.`,
    explain: `${right}. The strong ${addAcid ? "acid" : "base"} is turned into the weak one, and only the ratio [${p.base}]/[${p.acid}] shifts slightly.`,
  });
}

function bufferParticles(): Question {
  const a = rand(3, 8);
  let b = rand(3, 8);
  if (Math.random() < 0.25) b = a;
  const add = rand(1, 2);
  const visual: Visual = { kind: "chem-particles", panels: [{ species: [{ name: "HA", colour: "wave", count: a }, { name: "A⁻", colour: "berry", count: b }], container: "beaker", arrangement: "liquid" }] };
  if (Math.random() < 0.5) {
    const L = ["pH > pKa", "pH < pKa", "pH = pKa"];
    const k = b > a ? 0 : b < a ? 1 : 2;
    return Q({
      key: `bpa-${a}-${b}`,
      prompt: "This buffer contains HA and A⁻. How does its pH compare with the pKa of HA?",
      visual,
      needsVisual: true,
      ...lab(L[k], L.filter((_, i) => i !== k)),
      hint: "pH = pKa + log([A⁻]/[HA]). More A⁻ than HA makes the log positive.",
      explain: `${b} A⁻ and ${a} HA: [A⁻]/[HA] ${k === 0 ? "> 1, so pH > pKa" : k === 1 ? "< 1, so pH < pKa" : "= 1, so pH = pKa"}.`,
    });
  }
  return Q({
    key: `bpo-${a}-${b}-${add}`,
    prompt: `${add} OH⁻ ${add === 1 ? "ion is" : "ions are"} added to this buffer. After the reaction, how many A⁻ particles are there?`,
    visual,
    needsVisual: true,
    ...key(b + add),
    hint: "Each OH⁻ reacts with one HA: HA + OH⁻ → A⁻ + H₂O.",
    explain: `${add} HA become ${add} A⁻: A⁻ goes from ${b} to ${b + add}, and HA from ${a} to ${a - add}. The ratio changes a little, so the pH rises only slightly.`,
  });
}

function bufferDilute(): Question {
  const p = pick(PAIRS);
  const right = "It stays about the same, because [base]/[acid] doesn't change";
  return Q({
    key: `bd-${p.acid}`,
    prompt: `A buffer of 0.20 M ${p.acid} and 0.20 M ${p.base} is diluted with an equal volume of water. What happens to its pH?`,
    ...lab(right, ["It rises toward 7", "It halves", "It falls by 0.30"]),
    hint: "pH = pKa + log([A⁻]/[HA]). Dilution divides both concentrations by the same amount.",
    explain: `Both become 0.10 M, so the ratio is still 1 and pH = pKa = ${num(p.pKa, 2)}. The buffer has less capacity, but the same pH.`,
  });
}

export const bufferProperties = mix(bufferPair, bufferReact, bufferReact, bufferParticles, bufferParticles, bufferDilute);

/* ---------- Henderson–Hasselbalch */

const HH_CONC = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];

function hhPH(): Question {
  const p = pick(PAIRS);
  const a = pick(HH_CONC);
  const b = pick(HH_CONC);
  const pH = dp(p.pKa + lg(b / a), 2);
  return Q({
    key: `hp-${p.acid}-${a}-${b}`,
    prompt: `A buffer has ${num(a, 2)} M ${p.acid} and ${num(b, 2)} M ${p.base} (pKa = ${num(p.pKa, 2)}). What is its pH? Give 2 decimal places.`,
    ...key(pH),
    hint: "pH = pKa + log([base]/[acid]).",
    explain: `pH = ${num(p.pKa, 2)} + log(${num(b, 2)} ÷ ${num(a, 2)}) = ${num(p.pKa, 2)} ${b >= a ? "+" : "−"} ${num(Math.abs(lg(b / a)), 2)} = ${num(pH, 2)}.`,
  });
}

function hhRatio(): Question {
  const p = pick(PAIRS);
  const d = pick([-0.6, -0.4, -0.3, -0.2, 0.1, 0.2, 0.3, 0.5, 0.7]);
  const pH = dp(p.pKa + d, 2);
  const ratio = sig(10 ** d, 2);
  return Q({
    key: `hr-${p.acid}-${d}`,
    prompt: `What ratio [${p.base}]/[${p.acid}] gives a buffer with pH ${num(pH, 2)}? (pKa = ${num(p.pKa, 2)}; 2 significant figures)`,
    ...key(ratio),
    hint: "Rearrange: log([base]/[acid]) = pH − pKa, so the ratio is 10^(pH − pKa).",
    explain: `pH − pKa = ${num(d, 2)}, so [${p.base}]/[${p.acid}] = 10^${num(d, 2)} = ${num(ratio)}.`,
  });
}

function hhChoose(): Question {
  const set = [PAIRS[2], PAIRS[0], PAIRS[4], PAIRS[1]];
  const p = pick(set);
  const pH = dp(p.pKa + pick([-0.3, -0.2, 0.2, 0.3]), 1);
  const lbl = (x: (typeof PAIRS)[number]) => `${x.acid}/${x.base} (pKa ${num(x.pKa, 2)})`;
  return Q({
    key: `hc-${p.acid}-${pH}`,
    prompt: `You need a buffer at pH ${num(pH, 1)}. Which conjugate pair is the best choice?`,
    ...lab(lbl(p), set.filter((x) => x !== p).map(lbl)),
    hint: "A buffer works best when pH ≈ pKa (within about ±1), with similar amounts of acid and base.",
    explain: `${lbl(p)} has pKa closest to ${num(pH, 1)}, so it needs a ratio near 1 and has the most capacity in both directions.`,
  });
}

function hhBuild(): Question {
  const p = pick([PAIRS[0], PAIRS[1], PAIRS[2], PAIRS[6]]);
  const [ra, rb] = pick([
    [1, 2],
    [2, 1],
    [1, 1],
    [1, 3],
    [3, 1],
    [1, 4],
  ]);
  const pH = dp(p.pKa + lg(rb / ra), 2);
  return Q({
    key: `hb-${p.acid}-${ra}-${rb}`,
    prompt: `Build a buffer with pH ${num(pH, 2)} from ${p.acid} and ${p.base} (pKa ${num(p.pKa, 2)}). Add particles in the right ratio.`,
    ...act({ kind: "chem-mix", mode: "mixture", species: [{ name: p.acid, colour: "wave" }, { name: p.base, colour: "berry" }], target: { ratio: [ra, rb] }, max: 12 }, 1),
    hint: "[base]/[acid] = 10^(pH − pKa). Find the ratio, then add particles to match it.",
    explain: `10^(${num(pH, 2)} − ${num(p.pKa, 2)}) = ${num(sig(rb / ra, 2))}, so use ${rb} ${p.base} for every ${ra} ${p.acid}.`,
  });
}

function hhAdd(): Question {
  const p = pick(PAIRS);
  const na = pick([0.1, 0.2, 0.25, 0.3, 0.5]);
  const nb = pick([0.1, 0.2, 0.25, 0.3, 0.5]);
  const addBase = Math.random() < 0.5;
  const x = pick([0.01, 0.02, 0.025, 0.05]);
  const a2 = addBase ? na - x : na + x;
  const b2 = addBase ? nb + x : nb - x;
  const pH = dp(p.pKa + lg(b2 / a2), 2);
  return Q({
    key: `ha-${p.acid}-${na}-${nb}-${addBase}-${x}`,
    prompt: `A buffer holds ${num(na, 2)} mol ${p.acid} and ${num(nb, 2)} mol ${p.base} (pKa ${num(p.pKa, 2)}). ${num(x, 3)} mol of ${addBase ? "NaOH" : "HCl"} is added. What is the new pH (2 decimal places)?`,
    ...key(pH),
    hint: `First let the ${addBase ? "OH⁻ react with the acid" : "H₃O⁺ react with the base"} (moles change by ${num(x, 3)}). Then use pH = pKa + log(n base / n acid); the volume cancels.`,
    explain: `${p.acid}: ${num(a2, 3)} mol, ${p.base}: ${num(b2, 3)} mol. pH = ${num(p.pKa, 2)} + log(${num(b2, 3)} ÷ ${num(a2, 3)}) = ${num(pH, 2)}.`,
  });
}

export const hendersonHasselbalch = mix(hhPH, hhPH, hhRatio, hhChoose, hhBuild, hhBuild, hhAdd);

/* ---------- buffer capacity */

function capCompare(): Question {
  const p = pick(PAIRS);
  const concs = some([0.05, 0.1, 0.2, 0.5, 1.0, 2.0], 3).sort((a, b) => b - a);
  const lbl = (c: number) => `${num(c, 2)} M ${p.acid} + ${num(c, 2)} M ${p.base}`;
  return Q({
    key: `cc-${p.acid}-${concs.join()}`,
    prompt: "All three buffers have the same pH. Which has the greatest buffer capacity?",
    ...lab(lbl(concs[0]), [lbl(concs[1]), lbl(concs[2]), "They are all the same, since the pH is the same"]),
    hint: "Capacity is how much strong acid or base a buffer can absorb, which depends on how many moles of HA and A⁻ it holds.",
    explain: `${lbl(concs[0])} has the most acid and base to react with added H₃O⁺ or OH⁻, so it can absorb the most before its pH changes a lot.`,
  });
}

function capMax(): Question {
  const p = pick(PAIRS);
  const na = pick([0.05, 0.08, 0.1, 0.12, 0.15, 0.2]);
  const nb = pick([0.05, 0.08, 0.1, 0.12, 0.15, 0.2]);
  const acid = Math.random() < 0.5;
  return Q({
    key: `cm-${p.acid}-${na}-${nb}-${acid}`,
    prompt: `A buffer holds ${num(na, 2)} mol ${p.acid} and ${num(nb, 2)} mol ${p.base}. How many moles of ${acid ? "HCl" : "NaOH"} would use up its ${acid ? "base" : "acid"} completely?`,
    visual: { kind: "bars", title: "Moles in the buffer", items: [{ label: p.acid, value: na }, { label: p.base, value: nb }], max: 0.25, step: 0.05 },
    unit: "mol",
    ...key(acid ? nb : na),
    hint: `Added ${acid ? "H₃O⁺ reacts 1 : 1 with the base" : "OH⁻ reacts 1 : 1 with the acid"}.`,
    explain: `${num(acid ? nb : na, 2)} mol of ${acid ? p.base : p.acid} can neutralize ${num(acid ? nb : na, 2)} mol of ${acid ? "HCl" : "NaOH"}; after that the pH changes sharply.`,
  });
}

function capDelta(): Question {
  const p = pick(PAIRS);
  const n0 = pick([0.1, 0.2, 0.5]);
  const x = pick([0.01, 0.02, 0.05]);
  const d = dp(lg((n0 + x) / (n0 - x)), 2);
  if (d === 0) return capDelta();
  return Q({
    key: `cd-${p.acid}-${n0}-${x}`,
    prompt: `A buffer has ${num(n0, 2)} mol each of ${p.acid} and ${p.base}. By how much does the pH drop when ${num(x, 2)} mol of HCl is added? (2 decimal places)`,
    ...key(d),
    hint: "Before: pH = pKa. After: base = n − x, acid = n + x, so pH = pKa + log((n − x)/(n + x)). Find the difference.",
    explain: `ΔpH = log(${num(n0 + x, 2)} ÷ ${num(n0 - x, 2)}) = ${num(d, 2)}. A more concentrated buffer would change even less.`,
  });
}

function capBars(): Question {
  const p = pick(PAIRS);
  const na = rand(1, 4) * 0.05;
  let nb = rand(1, 4) * 0.05;
  if (Math.abs(nb - na) < 1e-9) nb = na === 0.2 ? 0.05 : dp(na + 0.05, 2);
  const right = nb > na ? "Added acid (it has more base to react)" : "Added base (it has more acid to react)";
  return Q({
    key: `cb-${p.acid}-${na}-${nb}`,
    prompt: `This buffer is better at resisting which: added acid or added base?`,
    visual: { kind: "bars", title: "Moles in the buffer", items: [{ label: p.acid, value: dp(na, 2) }, { label: p.base, value: dp(nb, 2) }], max: 0.25, step: 0.05 },
    needsVisual: true,
    ...lab(right, ["Added acid (it has more base to react)", "Added base (it has more acid to react)", "Both equally"].filter((x) => x !== right)),
    hint: "Added acid is used up by the buffer's base; added base by its acid. Which is there more of?",
    explain: `It has ${num(nb, 2)} mol ${p.base} and ${num(na, 2)} mol ${p.acid}, so it can absorb more ${nb > na ? "acid" : "base"}.`,
  });
}

export const bufferCapacity = mix(capCompare, capMax, capMax, capDelta, capBars);

/* ================================================== unit 9: applications of thermodynamics */

const ENT_PROC: { label: string; up: boolean; why: string }[] = [
  { label: "H₂O(l) → H₂O(g)", up: true, why: "a liquid becomes a gas" },
  { label: "CO₂(g) → CO₂(s)", up: false, why: "a gas becomes a solid" },
  { label: "2H₂(g) + O₂(g) → 2H₂O(l)", up: false, why: "3 mol of gas become a liquid" },
  { label: "CaCO₃(s) → CaO(s) + CO₂(g)", up: true, why: "a gas forms from a solid" },
  { label: "N₂(g) + 3H₂(g) → 2NH₃(g)", up: false, why: "4 mol of gas become 2 mol" },
  { label: "NaCl(s) → Na⁺(aq) + Cl⁻(aq)", up: true, why: "an ordered crystal spreads out as ions in solution" },
  { label: "2NO₂(g) → N₂O₄(g)", up: false, why: "2 mol of gas become 1 mol" },
  { label: "I₂(s) → I₂(g)", up: true, why: "a solid becomes a gas" },
  { label: "Ag⁺(aq) + Cl⁻(aq) → AgCl(s)", up: false, why: "dissolved ions lock into a solid" },
  { label: "2KClO₃(s) → 2KCl(s) + 3O₂(g)", up: true, why: "3 mol of gas form from solids" },
  { label: "A gas cools from 400 K to 300 K", up: false, why: "slower particles have fewer ways to share their energy" },
  { label: "A gas expands into a larger flask", up: true, why: "the particles have more positions to spread into" },
  { label: "H₂O(l) → H₂O(s)", up: false, why: "a liquid freezes into an ordered solid" },
  { label: "PCl₅(g) → PCl₃(g) + Cl₂(g)", up: true, why: "1 mol of gas becomes 2 mol" },
];
const DS_POS = "ΔS > 0 (entropy increases)";
const DS_NEG = "ΔS < 0 (entropy decreases)";

function entSign(): Question {
  const p = pick(ENT_PROC);
  return Q({
    key: `es-${p.label}`,
    prompt: `${p.label}. What is the sign of ΔS for the system?`,
    ...lab(p.up ? DS_POS : DS_NEG, [p.up ? DS_NEG : DS_POS, "ΔS = 0"]),
    hint: "Entropy grows when matter and energy spread out: solid → liquid → gas, more moles of gas, dissolving, higher temperature, larger volume.",
    explain: `ΔS ${p.up ? ">" : "<"} 0: ${p.why}.`,
  });
}

function entParticles(): Question {
  const kind = rand(0, 2);
  const fwd = Math.random() < 0.5;
  let panels: Visual & { kind: "chem-particles" };
  let what: string;
  if (kind === 0) {
    const from = pick(["solid", "liquid"] as const);
    const to: "liquid" | "gas" = from === "solid" ? "liquid" : "gas";
    const a = { species: [{ formula: "H₂O", count: 9 }], arrangement: from as "solid" | "liquid", label: from === "solid" ? "Ice" : "Water" };
    const b = { species: [{ formula: "H₂O", count: 9 }], arrangement: to, label: to === "liquid" ? "Water" : "Steam" };
    panels = { kind: "chem-particles", panels: fwd ? [a, b] : [b, a] };
    what = `${from}-${to}`;
  } else if (kind === 1) {
    const a = { species: [{ formula: "NO₂", count: 8 }], label: "8 NO₂" };
    const b = { species: [{ formula: "N₂O₄", count: 4 }], label: "4 N₂O₄" };
    panels = { kind: "chem-particles", panels: fwd ? [a, b] : [b, a] };
    what = "dimer";
  } else {
    const a = { species: [{ formula: "Na⁺", count: 6 }, { formula: "Cl⁻", count: 6 }], arrangement: "solid" as const, label: "NaCl(s)" };
    const b = { species: [{ formula: "Na⁺", count: 6 }, { formula: "Cl⁻", count: 6 }], arrangement: "gas" as const, label: "Ions in solution", container: "beaker" as const };
    panels = { kind: "chem-particles", panels: fwd ? [a, b] : [b, a] };
    what = "dissolve";
  }
  const up = fwd;
  return Q({
    key: `ep-${what}-${fwd}`,
    prompt: "What is the sign of ΔS for the change shown?",
    visual: panels,
    needsVisual: true,
    ...lab(up ? DS_POS : DS_NEG, [up ? DS_NEG : DS_POS, "ΔS = 0"]),
    hint: "Which picture has the particles more spread out, more free to move, or more numerous?",
    explain: up ? "The particles end up more spread out and free (or more numerous), so there are more ways to arrange them: ΔS > 0." : "The particles end up more ordered or fewer in number, so ΔS < 0.",
  });
}

const S_PAIRS: { a: string; b: string; hi: "a" | "b"; why: string }[] = [
  { a: "1 mol H₂O(l)", b: "1 mol H₂O(g)", hi: "b", why: "gas particles are far more spread out" },
  { a: "1 mol CH₄(g)", b: "1 mol C₃H₈(g)", hi: "b", why: "a bigger molecule with more atoms has more ways to vibrate and rotate" },
  { a: "1 mol He(g)", b: "1 mol Kr(g)", hi: "b", why: "heavier atoms have more closely spaced energy levels" },
  { a: "1 mol C(diamond)", b: "1 mol C(graphite)", hi: "b", why: "graphite's layers are less rigid than diamond's network" },
  { a: "1 mol O₂(g) at 300 K", b: "1 mol O₂(g) at 400 K", hi: "b", why: "a higher temperature spreads energy over more states" },
  { a: "1 mol NaCl(s)", b: "1 mol NaCl(aq)", hi: "b", why: "dissolved ions are more dispersed than ions in a crystal" },
  { a: "1 mol N₂(g) in 10 L", b: "1 mol N₂(g) in 20 L", hi: "b", why: "a larger volume gives the particles more positions" },
];

function entCompare(): Question {
  const s = pick(S_PAIRS);
  const flip = Math.random() < 0.5;
  const [x, y] = flip ? [s.b, s.a] : [s.a, s.b];
  const hi = s.hi === "a" ? s.a : s.b;
  return Q({
    key: `ec-${s.a}-${flip}`,
    prompt: `Which has the higher entropy: ${x} or ${y}?`,
    ...lab(hi, [hi === x ? y : x, "They have the same entropy"]),
    hint: "More dispersal of matter or energy means more microstates and higher entropy.",
    explain: `${hi}: ${s.why}.`,
  });
}

export const entropy = mix(entSign, entSign, entParticles, entCompare);

/* ---------- Do it: entropy */

const S_SETS: [string, number][][] = [
  [["H₂O(s)", 41], ["H₂O(l)", 70], ["H₂O(g)", 189]],
  [["He(g)", 126], ["Ne(g)", 146], ["Ar(g)", 155], ["Kr(g)", 164]],
  [["CH₄(g)", 186], ["C₂H₆(g)", 229], ["C₃H₈(g)", 270]],
  [["C(diamond)", 2.4], ["C(graphite)", 5.7], ["Br₂(l)", 152], ["Br₂(g)", 245]],
  [["Na(s)", 51], ["NaCl(s)", 72], ["Cl₂(g)", 223]],
  [["Fe(s)", 27], ["H₂O(l)", 70], ["CO₂(g)", 214], ["SO₂(g)", 248]],
];

function sortEntropy(): Question {
  const items = some(ENT_PROC, 6);
  return Q({
    key: `se-${items.map((i) => i.label).sort().join("|")}`,
    prompt: "Sort each change by the sign of ΔS.",
    ...act({ kind: "sort", bins: [DS_POS, DS_NEG], items: items.map((i) => ({ label: i.label, bin: i.up ? 0 : 1 })) }, items.length),
    hint: "Count moles of gas on each side first. Then look for phase changes, dissolving, temperature and volume changes.",
    explain: items.map((i) => `${i.label}: ${i.up ? "+" : "−"} (${i.why})`).join("; ") + ".",
  });
}

function orderEntropy(): Question {
  const s = pick(S_SETS);
  return Q({
    key: `oe-${s.map((x) => x[0]).join()}`,
    prompt: "Order these by standard molar entropy (S°), lowest first.",
    ...act({ kind: "order", items: s.map((x) => x[0]), direction: "lowest S° first" }, s.length),
    hint: "Solids < liquids < gases. Within a phase, heavier or more complex particles have more entropy.",
    explain: s.map((x) => `${x[0]} ${x[1]} J/(mol·K)`).join(" < ") + ".",
  });
}

export const entropyActivity = mix(sortEntropy, sortEntropy, orderEntropy);

/* ---------- standard entropy change */

const S0: Record<string, number> = {
  "H₂(g)": 130.7,
  "O₂(g)": 205.2,
  "N₂(g)": 191.6,
  "NH₃(g)": 192.8,
  "H₂O(l)": 70.0,
  "H₂O(g)": 188.8,
  "CO₂(g)": 213.8,
  "CH₄(g)": 186.3,
  "CaCO₃(s)": 92.9,
  "CaO(s)": 38.1,
  "SO₂(g)": 248.2,
  "SO₃(g)": 256.8,
  "NO₂(g)": 240.1,
  "N₂O₄(g)": 304.4,
  "CO(g)": 197.7,
  "Cl₂(g)": 223.1,
  "HCl(g)": 186.9,
};
const s0 = (x: Term) => S0[termText({ ...x, coef: 1 })];
const sumS = (ts: Term[]) => ts.reduce((s, x) => s + (x.coef ?? 1) * s0(x), 0);

interface GRx {
  r: Term[];
  p: Term[];
  dH: number;
}
const G_RX: GRx[] = [
  { r: [t("N₂", 1, "g"), t("H₂", 3, "g")], p: [t("NH₃", 2, "g")], dH: -92.2 },
  { r: [t("H₂", 2, "g"), t("O₂", 1, "g")], p: [t("H₂O", 2, "l")], dH: -571.6 },
  { r: [t("CaCO₃", 1, "s")], p: [t("CaO", 1, "s"), t("CO₂", 1, "g")], dH: 178.3 },
  { r: [t("SO₂", 2, "g"), t("O₂", 1, "g")], p: [t("SO₃", 2, "g")], dH: -197.8 },
  { r: [t("CH₄", 1, "g"), t("O₂", 2, "g")], p: [t("CO₂", 1, "g"), t("H₂O", 2, "l")], dH: -890.3 },
  { r: [t("NO₂", 2, "g")], p: [t("N₂O₄", 1, "g")], dH: -57.2 },
  { r: [t("N₂O₄", 1, "g")], p: [t("NO₂", 2, "g")], dH: 57.2 },
  { r: [t("H₂", 1, "g"), t("Cl₂", 1, "g")], p: [t("HCl", 2, "g")], dH: -184.6 },
  { r: [t("CO", 2, "g"), t("O₂", 1, "g")], p: [t("CO₂", 2, "g")], dH: -566.0 },
];
const dS = (x: GRx) => sumS(x.p) - sumS(x.r);
const sTable = (x: GRx) => table(["Substance", "S° (J/(mol·K))"], [...new Set([...x.r, ...x.p].map((y) => termText({ ...y, coef: 1 })))].map((n) => [n, num(S0[n], 1)]));

function dSCalc(): Question {
  const x = pick(G_RX);
  const v = dS(x);
  const lst = (ts: Term[]) => ts.map((y) => `${y.coef ?? 1}(${num(s0(y), 1)})`).join(" + ");
  return Q({
    key: `ds-${eqText(x.r, x.p)}`,
    prompt: `Find ΔS° for ${eqText(x.r, x.p)}, to the nearest J/K.`,
    visual: sTable(x),
    unit: "J/K",
    ...key(Math.round(v), true),
    hint: "ΔS° = Σ n·S°(products) − Σ n·S°(reactants). Elements have S° values too (they are not zero).",
    explain: `Products: ${lst(x.p)} = ${num(sumS(x.p), 1)}. Reactants: ${lst(x.r)} = ${num(sumS(x.r), 1)}. ΔS° = ${num(v, 1)} ≈ ${sgn(Math.round(v))} J/K.`,
  });
}

function dSPredict(): Question {
  const x = pick(G_RX);
  const gas = (ts: Term[]) => ts.filter((y) => y.state === "g").reduce((s, y) => s + (y.coef ?? 1), 0);
  const [gr, gp] = [gas(x.r), gas(x.p)];
  const up = dS(x) > 0;
  return Q({
    key: `dp-${eqText(x.r, x.p)}`,
    prompt: `Without calculating, predict the sign of ΔS° for ${eqText(x.r, x.p)}.`,
    visual: reaction(x.r, x.p),
    ...lab(up ? DS_POS : DS_NEG, [up ? DS_NEG : DS_POS, "ΔS° = 0"]),
    hint: "Count moles of gas on each side: gases have far more entropy than solids and liquids.",
    explain: `Gas moles go from ${gr} to ${gp}, so ΔS° ${up ? ">" : "<"} 0 (calculated: ${sgn(Math.round(dS(x)))} J/K).`,
  });
}

function dSMistake(): Question {
  const x = pick(G_RX.filter((y) => [...y.r, ...y.p].some((z) => (z.coef ?? 1) > 1)));
  const v = Math.round(dS(x));
  const noCoef = Math.round(x.p.reduce((s, y) => s + s0(y), 0) - x.r.reduce((s, y) => s + s0(y), 0));
  const right = "They forgot to multiply each S° by its coefficient";
  return Q({
    key: `dm-${eqText(x.r, x.p)}`,
    prompt: `A student got ΔS° = ${sgn(noCoef)} J/K for ${eqText(x.r, x.p)}, but the answer is ${sgn(v)} J/K. What went wrong?`,
    visual: sTable(x),
    ...lab(right, ["They left out the elements, whose S° is zero", "They subtracted products from reactants", "They used kJ instead of J"]),
    hint: "Redo the sum with and without the coefficients.",
    explain: `Without coefficients the sum is ${sgn(noCoef)} J/K. Each S° must be multiplied by its coefficient: ΔS° = ${sgn(v)} J/K.`,
  });
}

function s0Element(): Question {
  const el = pick(["O₂(g)", "H₂(g)", "N₂(g)", "Cl₂(g)"]);
  const right = `${num(S0[el], 1)} J/(mol·K): elements have positive S°`;
  return Q({
    key: `se-${el}`,
    prompt: `What is the standard molar entropy (S°) of ${el}?`,
    ...lab(right, ["0, because it is an element in its standard state", `−${num(S0[el], 1)} J/(mol·K)`, "It has no entropy until it reacts"]),
    hint: "Unlike ΔHf°, absolute entropies are measured from a perfect crystal at 0 K, so every substance at 25 °C has S° > 0.",
    explain: `S°(${el}) = ${num(S0[el], 1)} J/(mol·K). Only a perfect crystal at 0 K has zero entropy (third law).`,
  });
}

export const entropyChange = mix(dSCalc, dSCalc, dSPredict, dSMistake, s0Element);

/* ---------- Gibbs free energy */

function gibbsDG(): Question {
  const x = pick(G_RX);
  const T = pick([298, 400, 500, 800, 1000, 1200]);
  const s = dS(x);
  const g = x.dH - (T * s) / 1000;
  const ans = Math.round(g);
  return Q({
    key: `gd-${eqText(x.r, x.p)}-${T}`,
    prompt: `For ${eqText(x.r, x.p)}, ΔH° = ${sgn(x.dH, 1)} kJ and ΔS° = ${sgn(s, 1)} J/K. Find ΔG° at ${T} K, to the nearest kJ.`,
    unit: "kJ",
    ...key(ans, true),
    hint: "ΔG° = ΔH° − TΔS°. Convert ΔS° to kJ/K first (÷ 1000).",
    explain: `ΔG° = ${num(x.dH, 1)} − ${T} × ${num(s / 1000, 4)} = ${num(g, 1)} ≈ ${sgn(ans)} kJ: ${ans < 0 ? "thermodynamically favorable" : "not favorable"} at ${T} K.`,
  });
}

const CASES = [
  { h: "< 0", s: "> 0", ans: "At any T" },
  { h: "> 0", s: "< 0", ans: "At no T" },
  { h: "> 0", s: "> 0", ans: "Only at high T" },
  { h: "< 0", s: "< 0", ans: "Only at low T" },
];

function gibbsCases(): Question {
  const c = pick(CASES);
  const x = pick(G_RX.filter((y) => `${y.dH < 0 ? "< 0" : "> 0"}${dS(y) < 0 ? "< 0" : "> 0"}` === c.h + c.s));
  return Q({
    key: `gc-${c.h}${c.s}-${x ? eqText(x.r, x.p) : "none"}`,
    prompt: `${x ? `${eqText(x.r, x.p)} has` : "A reaction has"} ΔH° ${c.h} and ΔS° ${c.s}. When is it thermodynamically favorable?`,
    ...lab(c.ans, CASES.map((y) => y.ans).filter((a) => a !== c.ans)),
    hint: "ΔG° = ΔH° − TΔS°. Favorable needs ΔG° < 0. Which term wins when T is small, and when T is large?",
    explain:
      c.ans === "At any T"
        ? "Both terms make ΔG° negative, at any T."
        : c.ans === "At no T"
          ? "Both terms make ΔG° positive, at any T."
          : c.ans === "Only at high T"
            ? "ΔH° > 0 opposes it, but −TΔS° is negative and grows with T, so it wins above T = ΔH°/ΔS°."
            : "ΔH° < 0 favors it, but −TΔS° is positive and grows with T, so it is favorable only below T = ΔH°/ΔS°.",
  });
}

function crossover(): Question {
  const x = pick(G_RX.filter((y) => y.dH * dS(y) > 0));
  const s = dS(x);
  const T = Math.round((x.dH * 1000) / s);
  return Q({
    key: `co-${eqText(x.r, x.p)}`,
    prompt: `For ${eqText(x.r, x.p)}, ΔH° = ${sgn(x.dH, 1)} kJ and ΔS° = ${sgn(s, 1)} J/K. At what temperature does ΔG° = 0? (nearest K)`,
    unit: "K",
    ...key(T),
    hint: "Set ΔG° = ΔH° − TΔS° = 0, so T = ΔH° ÷ ΔS°. Use the same energy units for both.",
    explain: `T = ${num(x.dH * 1000, 0)} J ÷ ${num(s, 1)} J/K ≈ ${T} K. ${x.dH > 0 ? "Above" : "Below"} this temperature the reaction is favorable.`,
  });
}

function plotGibbs(): Question {
  const a = rand(2, 6);
  const b = pick([1, 2]);
  const endo = Math.random() < 0.5;
  const sg = endo ? 1 : -1;
  const xs = [1, 3, 5];
  const pts = xs.map((x) => ({ x, y: sg * (a - b * x), label: `${x * 100} K` }));
  const Tc = (100 * a) / b;
  return Q({
    key: `pg-${a}-${b}-${endo}`,
    prompt: `ΔH° = ${endo ? "+" : "−"}${10 * a} kJ and ΔS° = ${endo ? "+" : "−"}${100 * b} J/K. Plot ΔG° at 100 K, 300 K and 500 K. Across: 1 square = 100 K. Up: 1 square = 10 kJ.`,
    speech: `Delta H is ${endo ? "plus" : "minus"} ${10 * a} kilojoules and delta S is ${endo ? "plus" : "minus"} ${100 * b} joules per kelvin. Plot delta G at 100, 300 and 500 kelvin.`,
    ...act({ kind: "plotPoints", points: pts, size: 8, quadrants: 4 }, Tc),
    hint: `ΔG° = ΔH° − TΔS°. At 100 K, TΔS° = 100 × ${endo ? "" : "−"}${num(b / 10)} kJ/K = ${endo ? "" : "−"}${10 * b} kJ.`,
    explain: pts.map((p) => `${p.label}: ${p.y * 10} kJ`).join("; ") + `. The line crosses zero at T = ΔH°/ΔS° = ${Tc} K; it is favorable ${endo ? "above" : "below"} that.`,
  });
}

export const gibbsEnergy = mix(gibbsDG, gibbsDG, gibbsCases, crossover, plotGibbs, plotGibbs);

/* ---------- thermodynamic and kinetic control */

function tkProfile(): Question {
  const R = rand(5, 15) * 10;
  const fav = Math.random() < 0.6;
  const P = fav ? R - rand(3, 10) * 10 : R + rand(2, 5) * 10;
  const fast = Math.random() < 0.5;
  const peak = Math.max(R, P) + (fast ? rand(2, 4) * 10 : rand(18, 25) * 10);
  const L = ["Favorable but slow", "Favorable and fast", "Unfavorable but fast", "Unfavorable and slow"];
  const right = fav ? (fast ? L[1] : L[0]) : fast ? L[2] : L[3];
  return Q({
    key: `tp-${R}-${P}-${peak}`,
    prompt: `Free-energy diagram: reactants at ${R} kJ, products at ${P} kJ, and the hump peaks at ${peak} kJ. Which best describes the reaction at room temperature?`,
    visual: { kind: "chem-energy", mode: "profile", reactants: R, products: P, peak, yLabel: "Free energy", labels: { reactants: R, products: P, ea: null, dH: null } },
    needsVisual: true,
    ...lab(right, L.filter((x) => x !== right)),
    hint: "Favorability depends only on the two ends (ΔG°). Speed depends on the height of the hump (Ea): a big hump means slow.",
    explain: `ΔG° = ${P} − ${R} = ${sgn(P - R)} kJ (${fav ? "favorable" : "unfavorable"}). Ea = ${peak - R} kJ, which is ${fast ? "small, so it is fast" : "large, so it is very slow"}.`,
  });
}

const TK_CASES: { what: string; dg: string }[] = [
  { what: "Diamond turning into graphite", dg: "−2.9 kJ/mol" },
  { what: "A balloon of H₂ and O₂ forming water", dg: "−237 kJ/mol H₂O" },
  { what: "Paper burning in air", dg: "very negative" },
  { what: "N₂ and H₂ forming NH₃ at room temperature", dg: "−16 kJ/mol NH₃" },
  { what: "Sugar reacting with O₂ in the air", dg: "−2880 kJ/mol" },
];

function tkWhy(): Question {
  const c = pick(TK_CASES);
  const right = "It is favorable (ΔG° < 0), but its activation energy is so large that it is extremely slow";
  return Q({
    key: `tw-${c.what}`,
    prompt: `${c.what} has ΔG° ${c.dg.startsWith("very") ? "that is" : "="} ${c.dg}, yet it doesn't noticeably happen at room temperature. Why?`,
    ...lab(right, ["ΔG° is wrong at room temperature", "The reaction is at equilibrium already", "It is not favorable, because ΔS° is negative"]),
    hint: "Thermodynamics says whether a reaction can go; kinetics says how fast.",
    explain: "ΔG° < 0 means the products are favored, but the reaction is under kinetic control: the activation energy is so high that almost no collisions succeed. A spark, a flame or a catalyst gets it going.",
  });
}

function tkCatalyst(): Question {
  const c = pick(TK_CASES);
  const right = "It lowers Ea, so it speeds up the reaction; ΔG° and K stay the same";
  return Q({
    key: `tc-${c.what}`,
    prompt: `A catalyst is found for ${c.what.charAt(0).toLowerCase() + c.what.slice(1)}. What does it change?`,
    ...lab(right, ["It makes ΔG° more negative", "It increases K, so more product forms", "It changes the products that form"]),
    hint: "A catalyst gives a lower-energy path. Does it move the starting or ending energy?",
    explain: "A catalyst lowers the activation energy for both directions, so equilibrium is reached faster. The start and end free energies are unchanged, so ΔG° and K don't change.",
  });
}

function tkWhich(): Question {
  const ask = pick(["how fast", "whether products are favored"] as const);
  const what = pick(["a reaction", "rusting iron", "a fuel burning", "an enzyme reaction"]);
  const right = ask === "how fast" ? "The activation energy, Ea" : "ΔG° (or K)";
  return Q({
    key: `tq-${ask}-${what}`,
    prompt: `For ${what}, which quantity tells you ${ask} it goes?`,
    ...lab(right, ["The activation energy, Ea", "ΔG° (or K)", "ΔH° alone", "The temperature of the room"].filter((x) => x !== right)),
    hint: "Thermodynamic quantities (ΔG°, K) compare the start and end. Kinetic quantities (Ea, k) describe the path.",
    explain: ask === "how fast" ? "Speed depends on Ea (through the rate constant); ΔG° says nothing about rate." : "ΔG° < 0 (K > 1) means products are favored at equilibrium, however slowly it gets there.",
  });
}

export const kineticControl = mix(tkProfile, tkProfile, tkWhy, tkCatalyst, tkWhich);

/* ---------- free energy and equilibrium */

const R_GAS = 8.314;

function kFromG(): Question {
  const g = pick([-50, -40, -30, -20, -15, -10, -5, 5, 10, 15, 20, 30, 40]);
  const T = 298;
  const K = Math.exp((-g * 1000) / (R_GAS * T));
  const ans = sci(K);
  return Q({
    key: `kg-${g}`,
    prompt: `A reaction has ΔG° = ${sgn(g)}.0 kJ/mol at 298 K. What is K?`,
    ...lab(ans, [sci(1 / K), sci(Math.exp(-g / (R_GAS * T))), sci(10 ** ((-g * 1000) / (R_GAS * T))), sci(K * 10)].filter((w) => w !== ans)),
    hint: "K = e^(−ΔG°/RT), with ΔG° in J/mol and R = 8.314 J/(mol·K).",
    explain: `K = e^(−(${sgn(g * 1000)}) ÷ (8.314 × 298)) = e^(${num(dp((-g * 1000) / (R_GAS * T), 2))}) = ${ans}. ${g < 0 ? "ΔG° < 0, so K > 1." : "ΔG° > 0, so K < 1."}`,
  });
}

function gFromK(): Question {
  const K = rand(11, 99) / 10 * 10 ** rand(-20, 20);
  const g = (-R_GAS * 298 * Math.log(K)) / 1000;
  const ans = Math.round(g);
  return Q({
    key: `gk-${sci(K)}`,
    prompt: `At 298 K a reaction has K = ${sci(K)}. Find ΔG° in kJ/mol, to the nearest kJ.`,
    unit: "kJ/mol",
    ...key(ans, true),
    hint: "ΔG° = −RT ln K, with R = 8.314 J/(mol·K). Divide by 1000 for kJ.",
    explain: `ln K = ${num(dp(Math.log(K), 2))}; ΔG° = −8.314 × 298 × ${num(dp(Math.log(K), 2))} ÷ 1000 = ${num(dp(g, 1))} ≈ ${sgn(ans)} kJ/mol.`,
  });
}

function gSign(): Question {
  const kind = rand(0, 2);
  const K = kind === 0 ? randK(2, 12) : kind === 1 ? randK(-12, -2) : 1;
  const L = ["ΔG° < 0", "ΔG° > 0", "ΔG° = 0"];
  return Q({
    key: `gs-${sci(K)}`,
    prompt: `A reaction has K = ${K === 1 ? "1" : sci(K)}. What is the sign of ΔG°?`,
    ...lab(L[kind], L.filter((_, i) => i !== kind)),
    hint: "ΔG° = −RT ln K. ln K is positive when K > 1 and negative when K < 1.",
    explain: kind === 2 ? "ln 1 = 0, so ΔG° = 0." : `ln K is ${kind === 0 ? "positive" : "negative"}, so ΔG° is ${kind === 0 ? "negative: products favored" : "positive: reactants favored"}.`,
  });
}

function kspToG(): Question {
  const s = pick(KSP);
  const g = Math.round((-R_GAS * 298 * Math.log(s.ksp)) / 1000);
  return Q({
    key: `ksg-${s.f}`,
    prompt: `${s.f} has Ksp = ${sci(s.ksp)} at 298 K. What is ΔG° for dissolving it, to the nearest kJ/mol?`,
    visual: dissolveVis(s),
    unit: "kJ/mol",
    ...key(g, true),
    hint: "Ksp is just K for dissolving, so ΔG° = −RT ln Ksp.",
    explain: `ΔG° = −8.314 × 298 × ln(${sci(s.ksp)}) ÷ 1000 ≈ ${sgn(g)} kJ/mol. Positive: the salt is only slightly soluble.`,
  });
}

function gQ(): Question {
  const rel = pick(["<", ">", "="] as const);
  const right = rel === "<" ? "ΔG < 0: the forward reaction is favorable" : rel === ">" ? "ΔG > 0: the reverse reaction is favorable" : "ΔG = 0: the system is at equilibrium";
  const e = pick(GAS_EQS);
  return Q({
    key: `gq-${rel}-${eqStr(e)}`,
    prompt: `For ${eqStr(e)}, ΔG = ΔG° + RT ln Q = RT ln(Q/K). A mixture has Q ${rel} K. Which is true?`,
    ...lab(right, ["ΔG < 0: the forward reaction is favorable", "ΔG > 0: the reverse reaction is favorable", "ΔG = 0: the system is at equilibrium"].filter((x) => x !== right)),
    hint: "If Q/K < 1, its log is negative.",
    explain: `Q ${rel} K → ln(Q/K) ${rel === "<" ? "< 0" : rel === ">" ? "> 0" : "= 0"}, so ${right}.`,
  });
}

export const freeEnergyK = mix(kFromG, gFromK, gFromK, gSign, kspToG, gQ);

/* ---------- coupled reactions */

const ATP = -30.5;
const BIO = [
  { what: "glucose + phosphate → glucose-6-phosphate", g: 13.8 },
  { what: "glutamate + NH₃ → glutamine", g: 14.2 },
  { what: "fructose-6-phosphate + phosphate → fructose-1,6-bisphosphate", g: 16.3 },
  { what: "glycerol + phosphate → glycerol-3-phosphate", g: 9.2 },
];

function coupledATP(): Question {
  const b = pick(BIO);
  const total = dp(b.g + ATP, 1);
  return Q({
    key: `ca-${b.what}`,
    prompt: `In cells, ${b.what} (ΔG° = ${sgn(b.g, 1)} kJ/mol) is coupled to ATP → ADP + phosphate (ΔG° = −30.5 kJ/mol). What is ΔG° for the coupled process?`,
    unit: "kJ/mol",
    ...nums(total, [-total, b.g - ATP, b.g, ATP], 1),
    hint: "When reactions are added, their ΔG° values add. Shared species (like phosphate) cancel.",
    explain: `ΔG° = ${sgn(b.g, 1)} + (−30.5) = ${sgn(total, 1)} kJ/mol. Negative, so the coupled process is favorable.`,
  });
}

function howManyATP(): Question {
  const g = rand(8, 30) * 5;
  const n = Math.ceil(g / 30.5);
  return Q({
    key: `hm-${g}`,
    prompt: `A cell must drive a reaction with ΔG° = +${g} kJ/mol. Each ATP hydrolysis gives ΔG° = −30.5 kJ/mol. What is the fewest ATP per reaction that makes the coupled ΔG° negative?`,
    ...key(n),
    hint: `Find the smallest whole number n with ${g} − 30.5n < 0.`,
    explain: `${g} ÷ 30.5 = ${num(dp(g / 30.5, 2))}, so n = ${n}: ${g} − 30.5 × ${n} = ${num(dp(g - 30.5 * n, 1))} kJ/mol.`,
  });
}

const ORES = [
  { ore: "Cu₂S(s) → 2Cu(s) + S(s)", g1: 86.2, help: "S(s) + O₂(g) → SO₂(g)", g2: -300.1 },
  { ore: "2Fe₂O₃(s) → 4Fe(s) + 3O₂(g)", g1: 1484.4, help: "6CO(g) + 3O₂(g) → 6CO₂(g)", g2: -1543.2 },
  { ore: "2ZnO(s) → 2Zn(s) + O₂(g)", g1: 636.6, help: "2C(s) + O₂(g) → 2CO(g)", g2: -274.4 },
  { ore: "TiO₂(s) → Ti(s) + O₂(g)", g1: 889.4, help: "C(s) + O₂(g) → CO₂(g)", g2: -394.4 },
];

function coupledOre(): Question {
  const o = pick(ORES);
  const total = dp(o.g1 + o.g2, 1);
  const fav = total < 0;
  if (Math.random() < 0.5) {
    const right = fav ? `Yes: ΔG° = ${sgn(total, 1)} kJ` : `No: ΔG° = ${sgn(total, 1)} kJ`;
    return Q({
      key: `co-${o.ore}`,
      prompt: `At 298 K, ${o.ore} has ΔG° = ${sgn(o.g1, 1)} kJ. It is coupled with ${o.help} (ΔG° = ${sgn(o.g2, 1)} kJ). Is the coupled process favorable?`,
      ...lab(right, [fav ? `No: ΔG° = ${sgn(-total, 1)} kJ` : `Yes: ΔG° = ${sgn(-total, 1)} kJ`, `Yes, because ${o.help.split(" →")[0]} reacts`, `No, because the first reaction is unfavorable`]),
      hint: "Add the two equations (the O₂ or S cancels) and add the ΔG° values.",
      explain: `ΔG° = ${sgn(o.g1, 1)} + (${sgn(o.g2, 1)}) = ${sgn(total, 1)} kJ: ${fav ? "favorable, so the metal can be extracted this way" : "still unfavorable at 298 K, so a higher temperature or another partner is needed"}.`,
    });
  }
  return Q({
    key: `cv-${o.ore}`,
    prompt: `${o.ore} has ΔG° = ${sgn(o.g1, 1)} kJ and ${o.help} has ΔG° = ${sgn(o.g2, 1)} kJ. What is ΔG° for the coupled process?`,
    unit: "kJ",
    ...nums(total, [-total, o.g1 - o.g2, o.g2 - o.g1], 1),
    hint: "Add the two reactions and add their ΔG° values.",
    explain: `ΔG° = ${num(o.g1, 1)} + (${num(o.g2, 1)}) = ${sgn(total, 1)} kJ.`,
  });
}

const EXTERNAL: { prompt: string; right: string; wrong: string[] }[] = [
  { prompt: "Photosynthesis, 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, has ΔG° = +2880 kJ/mol. How do plants make it happen?", right: "Absorbed light supplies the energy", wrong: ["Plants lower the temperature until ΔG° < 0", "A catalyst makes ΔG° negative", "It happens slowly because ΔG° > 0 only affects the rate"] },
  { prompt: "Recharging a phone battery runs its cell reaction backward (ΔG > 0). What drives it?", right: "Electrical energy from the charger", wrong: ["Heat from the phone", "The battery's own voltage", "Nothing: ΔG > 0 reactions happen on their own"] },
  { prompt: "Electrolysis of water, 2H₂O → 2H₂ + O₂, has ΔG° = +474 kJ. How can it be done?", right: "Use an external power supply to push electrons", wrong: ["Add a catalyst so ΔG° becomes negative", "Cool the water", "Add salt so the water is more stable"] },
  { prompt: "Which pair of reactions could be coupled to drive an unfavorable reaction?", right: "Two reactions that share an intermediate, with a total ΔG° < 0", wrong: ["Two reactions with the same ΔH°", "Any two reactions at the same temperature", "Two unfavorable reactions, since their ΔG° values cancel"] },
];

function externalEnergy(): Question {
  const c = pick(EXTERNAL);
  return Q({ key: `ee-${c.prompt.slice(0, 30)}`, prompt: c.prompt, ...lab(c.right, c.wrong), hint: "An unfavorable process needs either a favorable partner reaction or energy from outside (light, electricity).", explain: `${c.right}. Coupling or an outside energy source makes the overall ΔG negative.` });
}

export const coupledReactions = mix(coupledATP, howManyATP, coupledOre, coupledOre, externalEnergy);

/* ---------- electrochemical cells */

const METAL_IONS: Record<string, { ion: string; z: number; name: string; M: number }> = {
  Zn: { ion: "Zn²⁺", z: 2, name: "zinc", M: 65.38 },
  Cu: { ion: "Cu²⁺", z: 2, name: "copper", M: 63.55 },
  Ag: { ion: "Ag⁺", z: 1, name: "silver", M: 107.87 },
  Mg: { ion: "Mg²⁺", z: 2, name: "magnesium", M: 24.31 },
  Fe: { ion: "Fe²⁺", z: 2, name: "iron", M: 55.85 },
  Ni: { ion: "Ni²⁺", z: 2, name: "nickel", M: 58.69 },
  Pb: { ion: "Pb²⁺", z: 2, name: "lead", M: 207.2 },
  Sn: { ion: "Sn²⁺", z: 2, name: "tin", M: 118.71 },
  Al: { ion: "Al³⁺", z: 3, name: "aluminum", M: 26.98 },
  Cd: { ion: "Cd²⁺", z: 2, name: "cadmium", M: 112.41 },
  Cr: { ion: "Cr³⁺", z: 3, name: "chromium", M: 52.0 },
  Co: { ion: "Co²⁺", z: 2, name: "cobalt", M: 58.93 },
};
const E0 = (m: string) => REDUCTION_POTENTIALS[m].volts;
const CELL_METALS = Object.keys(METAL_IONS);
const ION_COLOUR: Record<string, "wave" | "leaf" | "teal" | "clear" | "rose"> = { Cu: "wave", Ni: "leaf", Cr: "teal", Co: "rose" };

function cellPair(onlyCharge?: number) {
  const pool = onlyCharge ? CELL_METALS.filter((m) => METAL_IONS[m].z === onlyCharge) : CELL_METALS;
  const [x, y] = some(pool, 2);
  if (Math.abs(E0(x) - E0(y)) < 0.1) return cellPair(onlyCharge);
  const anode = E0(x) < E0(y) ? x : y;
  const cathode = anode === x ? y : x;
  return { left: x, right: y, anode, cathode, E: dp(Math.abs(E0(x) - E0(y)), 2) };
}
const gcdN = (a: number, b: number): number => (b ? gcdN(b, a % b) : a);
const cellRxn = (an: string, ca: string) => {
  const za = METAL_IONS[an].z;
  const zc = METAL_IONS[ca].z;
  const n = (za * zc) / gcdN(za, zc);
  return { n, r: [t(an, n / za, "s"), t(METAL_IONS[ca].ion, n / zc, "aq")], p: [t(METAL_IONS[an].ion, n / za, "aq"), t(ca, n / zc, "s")] };
};
const cellVis = (c: ReturnType<typeof cellPair>, extra: Partial<Extract<Visual, { kind: "chem-cell" }>> = {}): Visual => ({
  kind: "chem-cell",
  type: "galvanic",
  left: { metal: c.left, solution: METAL_IONS[c.left].ion, colour: ION_COLOUR[c.left] ?? "clear" },
  right: { metal: c.right, solution: METAL_IONS[c.right].ion, colour: ION_COLOUR[c.right] ?? "clear" },
  ...extra,
});
const e0Table = (ms: string[]): Visual => table(["Half-reaction", "E° (V)"], ms.map((m) => [REDUCTION_POTENTIALS[m].half, num(E0(m), 2)]));

function cellAnode(): Question {
  const c = cellPair();
  return Q({
    key: `ca-${c.left}-${c.right}`,
    prompt: `A galvanic cell is made from ${METAL_IONS[c.left].name} and ${METAL_IONS[c.right].name} half-cells. Which metal is the anode?`,
    visual: e0Table([c.left, c.right]),
    ...lab(`${cap(METAL_IONS[c.anode].name)} (${c.anode})`, [`${cap(METAL_IONS[c.cathode].name)} (${c.cathode})`, "Either, depending on the wire"]),
    hint: "The half-reaction with the higher E° runs as a reduction (cathode). The other runs backward as an oxidation: the anode.",
    explain: `${c.anode} has the lower E° (${num(E0(c.anode), 2)} V), so it is oxidized: ${c.anode} → ${METAL_IONS[c.anode].ion} + ${METAL_IONS[c.anode].z}e⁻ at the anode.`,
  });
}

function cellElectrons(): Question {
  const c = cellPair();
  const right = `From ${c.anode} to ${c.cathode}, through the wire`;
  return Q({
    key: `ce-${c.left}-${c.right}`,
    prompt: "Which way do electrons flow in this cell?",
    visual: cellVis(c, { electrons: false }),
    needsVisual: true,
    ...lab(right, [`From ${c.cathode} to ${c.anode}, through the wire`, "Through the salt bridge", "They don't flow until the circuit is reversed"]),
    hint: "Electrons are released by oxidation at the anode and travel through the wire to the cathode.",
    explain: `${c.anode} is oxidized at the anode; its electrons travel through the wire to the ${c.cathode} cathode, where ${METAL_IONS[c.cathode].ion} is reduced. Ions, not electrons, move through the salt bridge.`,
  });
}

function cellMass(): Question {
  const c = cellPair();
  const right = `The ${c.cathode} electrode (cathode)`;
  return Q({
    key: `cm-${c.left}-${c.right}`,
    prompt: "As this cell runs, which electrode gains mass?",
    visual: cellVis(c),
    needsVisual: true,
    ...lab(right, [`The ${c.anode} electrode (anode)`, "Both electrodes", "Neither electrode"]),
    hint: "At the cathode, metal ions are reduced and plate out as metal. At the anode, metal atoms dissolve as ions.",
    explain: `${METAL_IONS[c.cathode].ion} + ${METAL_IONS[c.cathode].z}e⁻ → ${c.cathode}: the cathode gains metal. The ${c.anode} anode dissolves and loses mass.`,
  });
}

function cellBridge(): Question {
  const c = cellPair();
  const right = `Toward the ${c.anode} (anode) beaker`;
  return Q({
    key: `cb-${c.left}-${c.right}`,
    prompt: "The salt bridge contains KNO₃. Which way do the NO₃⁻ ions move?",
    visual: cellVis(c),
    needsVisual: true,
    ...lab(right, [`Toward the ${c.cathode} (cathode) beaker`, "They stay still in the bridge", "Into the wire"]),
    hint: "At the anode, positive metal ions are being made; at the cathode, they are being used up. Anions move to balance the charge.",
    explain: `The anode beaker gains ${METAL_IONS[c.anode].ion} ions, so NO₃⁻ moves toward it to keep it neutral (K⁺ moves toward the cathode).`,
  });
}

const MELTS = [
  { sol: "NaCl(l)", cat: "Na metal", an: "Cl₂ gas" },
  { sol: "KBr(l)", cat: "K metal", an: "Br₂" },
  { sol: "MgCl₂(l)", cat: "Mg metal", an: "Cl₂ gas" },
  { sol: "CuCl₂(aq)", cat: "Cu metal", an: "Cl₂ gas" },
  { sol: "ZnBr₂(aq)", cat: "Zn metal", an: "Br₂" },
  { sol: "CaCl₂(l)", cat: "Ca metal", an: "Cl₂ gas" },
];

function electrolyticProducts(): Question {
  const m = pick(MELTS);
  const atCathode = Math.random() < 0.5;
  const right = atCathode ? m.cat : m.an;
  return Q({
    key: `ep-${m.sol}-${atCathode}`,
    prompt: `${m.sol} is electrolyzed with inert electrodes. What forms at the ${atCathode ? "cathode" : "anode"}?`,
    visual: { kind: "chem-cell", type: "electrolytic", left: { metal: "C", solution: m.sol, colour: m.sol.startsWith("Cu") ? "wave" : "clear" }, right: { metal: "C", solution: m.sol }, voltage: 6 },
    ...lab(right, [atCathode ? m.an : m.cat, "H₂ gas", "O₂ gas"]),
    hint: "The cathode (−) reduces the cation to metal. The anode (+) oxidizes the anion.",
    explain: `Cathode: the metal cation gains electrons → ${m.cat}. Anode: the halide ions lose electrons → ${m.an}.`,
  });
}

function cellKind(): Question {
  const galv = Math.random() < 0.5;
  const c = cellPair();
  const right = galv ? "Galvanic: ΔG < 0, and it produces electrical energy" : "Electrolytic: ΔG > 0, and the battery drives it";
  const m = pick(MELTS);
  return Q({
    key: `ck-${galv}-${galv ? `${c.left}${c.right}` : m.sol}`,
    prompt: "What kind of cell is this?",
    visual: galv ? cellVis(c, { voltage: c.E }) : { kind: "chem-cell", type: "electrolytic", left: { metal: "C", solution: m.sol }, right: { metal: "C", solution: m.sol }, voltage: 6 },
    needsVisual: true,
    ...lab(right, ["Galvanic: ΔG > 0, and the battery drives it", "Electrolytic: ΔG < 0, and it produces electrical energy", galv ? "Electrolytic: ΔG > 0, and the battery drives it" : "Galvanic: ΔG < 0, and it produces electrical energy"]),
    hint: "A voltmeter and two half-cells with a salt bridge: the reaction runs by itself. A battery forcing current: an unfavorable reaction is being driven.",
    explain: galv ? `A spontaneous redox reaction (E° = ${num(c.E, 2)} V > 0, ΔG < 0) pushes electrons through the voltmeter.` : "The external battery forces a nonspontaneous reaction (ΔG > 0) to happen.",
  });
}

export const electrochemCells = mix(cellAnode, cellElectrons, cellMass, cellBridge, electrolyticProducts, cellKind);

/* ---------- cell potential and free energy */

function cellE(): Question {
  const c = cellPair();
  return Q({
    key: `ee-${c.left}-${c.right}`,
    prompt: `Find the standard cell potential, E°cell, for this ${c.left}/${c.right} cell (V, 2 decimal places).`,
    visual: Math.random() < 0.5 ? cellVis(c, { voltage: "?" }) : e0Table([c.left, c.right]),
    unit: "V",
    ...key(c.E),
    hint: "E°cell = E°(cathode) − E°(anode). Don't multiply E° by coefficients: potentials are per electron.",
    explain: `E°cell = ${num(E0(c.cathode), 2)} − (${num(E0(c.anode), 2)}) = ${num(c.E, 2)} V.`,
  });
}

function cellDG(): Question {
  const c = cellPair();
  const rx = cellRxn(c.anode, c.cathode);
  const g = Math.round((-rx.n * 96485 * c.E) / 1000);
  return Q({
    key: `cg-${c.left}-${c.right}`,
    prompt: `For this reaction, E°cell = ${num(c.E, 2)} V. Find ΔG° in kJ, to the nearest kJ. (F = 96,485 C/mol e⁻)`,
    visual: reaction(rx.r, rx.p),
    unit: "kJ",
    ...key(g, true),
    hint: "ΔG° = −nFE°, where n is the number of electrons transferred in the balanced equation.",
    explain: `n = ${rx.n}. ΔG° = −${rx.n} × 96,485 × ${num(c.E, 2)} ÷ 1000 ≈ ${sgn(g)} kJ. Negative: spontaneous.`,
  });
}

function spontaneous(): Question {
  const c = cellPair();
  const forward = Math.random() < 0.5;
  const rx = forward ? cellRxn(c.anode, c.cathode) : cellRxn(c.cathode, c.anode);
  const E = forward ? c.E : -c.E;
  const right = forward ? `Spontaneous: E° = +${num(c.E, 2)} V` : `Not spontaneous: E° = −${num(c.E, 2)} V`;
  return Q({
    key: `sp-${c.left}-${c.right}-${forward}`,
    prompt: "Is this reaction spontaneous under standard conditions?",
    visual: reaction(rx.r, rx.p),
    ...lab(right, [forward ? `Not spontaneous: E° = −${num(c.E, 2)} V` : `Spontaneous: E° = +${num(c.E, 2)} V`, `Spontaneous: E° = ${sgn(dp(E0(c.anode) + E0(c.cathode), 2), 2)} V`, "It depends only on the mass of metal"]),
    hint: "Find which species is reduced in the equation as written. E° = E°(reduced) − E°(oxidized). Positive means spontaneous.",
    explain: `As written, ${forward ? c.cathode : c.anode} ions are reduced: E° = ${num(E0(forward ? c.cathode : c.anode), 2)} − (${num(E0(forward ? c.anode : c.cathode), 2)}) = ${num(E, 2)} V.`,
  });
}

function signsLink(): Question {
  const pos = Math.random() < 0.5;
  const c = cellPair();
  const right = pos ? "ΔG° < 0 and K > 1" : "ΔG° > 0 and K < 1";
  return Q({
    key: `sl-${pos}-${c.left}-${c.right}`,
    prompt: `A redox reaction has E° = ${pos ? "+" : "−"}${num(c.E, 2)} V. Which is true?`,
    ...lab(right, ["ΔG° < 0 and K > 1", "ΔG° > 0 and K < 1", "ΔG° < 0 and K < 1", "ΔG° > 0 and K > 1"].filter((x) => x !== right)),
    hint: "ΔG° = −nFE° and ΔG° = −RT ln K, so all three signs are linked.",
    explain: pos ? "E° > 0 → ΔG° = −nFE° < 0 → ln K > 0, so K > 1: products favored." : "E° < 0 → ΔG° > 0 → K < 1: reactants favored.",
  });
}

export const cellPotential = mix(cellE, cellE, cellDG, spontaneous, signsLink);

/* ---------- nonstandard conditions */

function nernstQual(): Question {
  const c = cellPair(2);
  const ca = pick([0.01, 0.1, 1.0, 2.0]);
  let cc = pick([0.01, 0.1, 1.0, 2.0]);
  if (Math.random() < 0.15) cc = ca;
  const Qv = ca / cc;
  const L = [`Greater than ${num(c.E, 2)} V`, `Less than ${num(c.E, 2)} V`, `Equal to ${num(c.E, 2)} V`];
  const k = Qv < 1 ? 0 : Qv > 1 ? 1 : 2;
  return Q({
    key: `nq-${c.anode}-${c.cathode}-${ca}-${cc}`,
    prompt: `In the ${c.anode}/${c.cathode} cell (E° = ${num(c.E, 2)} V), [${METAL_IONS[c.anode].ion}] = ${num(ca)} M and [${METAL_IONS[c.cathode].ion}] = ${num(cc)} M. How does Ecell compare with E°?`,
    visual: reaction(cellRxn(c.anode, c.cathode).r, cellRxn(c.anode, c.cathode).p),
    ...lab(L[k], L.filter((_, i) => i !== k)),
    hint: `Q = [${METAL_IONS[c.anode].ion}] / [${METAL_IONS[c.cathode].ion}]. Q < 1 pushes the reaction forward (E > E°); Q > 1 holds it back (E < E°).`,
    explain: `Q = ${num(ca)} ÷ ${num(cc)} = ${num(Qv)}. ${k === 0 ? "Q < 1, so Ecell > E°" : k === 1 ? "Q > 1, so Ecell < E°" : "Q = 1, so Ecell = E°"} (E = E° − (RT/nF) ln Q).`,
  });
}

function nernstCalc(): Question {
  const c = cellPair(2);
  const ca = pick([0.001, 0.01, 0.1]);
  const cc = pick([1.0, 0.1, 0.01]);
  const E = dp(c.E - (0.0592 / 2) * lg(ca / cc), 2);
  return Q({
    key: `nc-${c.anode}-${c.cathode}-${ca}-${cc}`,
    prompt: `${c.anode}/${c.cathode} cell, E° = ${num(c.E, 2)} V, n = 2. [${METAL_IONS[c.anode].ion}] = ${num(ca)} M, [${METAL_IONS[c.cathode].ion}] = ${num(cc)} M. Use E = E° − (0.0592/n) log Q to find Ecell (V, 2 decimal places).`,
    unit: "V",
    ...key(E),
    hint: `Q = [${METAL_IONS[c.anode].ion}] / [${METAL_IONS[c.cathode].ion}] (the metals are solids, so they're left out).`,
    explain: `Q = ${num(ca)} ÷ ${num(cc)} = ${num(clean(ca / cc))}; log Q = ${num(dp(lg(ca / cc), 2))}. E = ${num(c.E, 2)} − 0.0296 × (${num(dp(lg(ca / cc), 2))}) = ${num(E, 2)} V.`,
  });
}

const NERNST_IDEAS: { prompt: string; right: string; wrong: string[]; why: string }[] = [
  { prompt: "A galvanic cell has gone 'dead' (Ecell = 0). Which is true?", right: "Q = K, and the cell reaction is at equilibrium", wrong: ["All the electrodes have dissolved", "Q = 1", "E° has fallen to 0"], why: "Ecell = 0 means ΔG = 0: the reaction is at equilibrium, Q = K. E° is a fixed property of the reaction." },
  { prompt: "As a galvanic cell runs, what happens to Q and Ecell?", right: "Q increases, so Ecell decreases", wrong: ["Q decreases, so Ecell increases", "Both stay constant", "Q increases, so Ecell increases"], why: "Products build up and reactants are used, so Q rises toward K and Ecell falls toward 0." },
  { prompt: "A concentration cell has Cu in 0.010 M Cu²⁺ on one side and Cu in 1.0 M Cu²⁺ on the other. Which electrode is the anode?", right: "The Cu in 0.010 M Cu²⁺", wrong: ["The Cu in 1.0 M Cu²⁺", "Neither: E° = 0, so no current flows", "Both, in turn"], why: "E° = 0, but the concentrations differ. The dilute side oxidizes Cu to make more Cu²⁺, and the concentrated side reduces Cu²⁺, evening them out." },
  { prompt: "Which change would increase Ecell for a Zn/Cu²⁺ cell?", right: "Increase [Cu²⁺]", wrong: ["Increase [Zn²⁺]", "Use a bigger zinc electrode", "Make the salt bridge longer"], why: "More Cu²⁺ (a reactant) lowers Q = [Zn²⁺]/[Cu²⁺], so E = E° − (RT/nF) ln Q goes up. Electrode size doesn't appear in Q." },
];

function nernstIdea(): Question {
  const c = pick(NERNST_IDEAS);
  return Q({ key: `ni-${c.prompt.slice(0, 30)}`, prompt: c.prompt, ...lab(c.right, c.wrong), hint: "E = E° − (RT/nF) ln Q: Ecell falls as Q grows, and is 0 when Q = K.", explain: c.why });
}

export const nernst = mix(nernstQual, nernstQual, nernstCalc, nernstIdea, nernstIdea);

/* ---------- electrolysis and Faraday's law */

const PLATE = ["Cu", "Ag", "Zn", "Ni", "Cr", "Al"];
const F = 96485;

function faradayMass(): Question {
  const m = pick(PLATE);
  const d = METAL_IONS[m];
  const I = pick([0.5, 1.5, 2.0, 2.5, 3.0, 5.0, 10.0]);
  const min = pick([10.0, 15.0, 20.0, 30.0, 45.0, 60.0]);
  const q = I * min * 60;
  const g = sig((q / F / d.z) * d.M, 3);
  return Q({
    key: `fm-${m}-${I}-${min}`,
    prompt: `A current of ${sf(I, 3)} A passes through ${d.ion} solution for ${sf(min, 3)} min. What mass of ${d.name} plates out? Give grams to 3 significant figures. (${m}: ${d.M} g/mol)`,
    visual: { kind: "chem-cell", type: "electrolytic", left: { metal: "C", solution: `${d.ion}(aq)`, colour: ION_COLOUR[m] ?? "clear" }, right: { metal: m, solution: `${d.ion}(aq)` }, anode: "left", voltage: null },
    unit: "g",
    ...key(g),
    hint: `Charge q = I × t (in seconds). Moles of e⁻ = q ÷ 96,485. ${d.ion} needs ${d.z} e⁻ per atom.`,
    explain: `q = ${sf(I, 3)} × ${min * 60} s = ${num(q)} C; n(e⁻) = ${sf(q / F, 3)} mol; n(${m}) = ÷ ${d.z} = ${sf(q / F / d.z, 3)} mol; mass = × ${d.M} = ${sf(g, 3)} g.`,
  });
}

function faradayTime(): Question {
  const m = pick(PLATE);
  const d = METAL_IONS[m];
  const g = pick([0.5, 1.0, 2.0, 5.0]);
  const I = pick([1.0, 2.0, 2.5, 5.0, 10.0]);
  const min = sig(((g / d.M) * d.z * F) / I / 60, 3);
  return Q({
    key: `ft-${m}-${g}-${I}`,
    prompt: `How many minutes does a ${sf(I, 3)} A current take to plate ${sf(g, 3)} g of ${d.name} from ${d.ion}? Give 3 significant figures. (${m}: ${d.M} g/mol)`,
    unit: "min",
    ...key(min),
    hint: "Work backward: grams → moles of metal → moles of e⁻ (× charge) → coulombs (× 96,485) → seconds (÷ current) → minutes.",
    explain: `n(${m}) = ${sf(g / d.M, 3)} mol; n(e⁻) = ${sf((g / d.M) * d.z, 3)} mol; q = ${sf((g / d.M) * d.z * F, 3)} C; t = ÷ ${sf(I, 3)} A = ${sf(((g / d.M) * d.z * F) / I, 3)} s = ${sf(min, 3)} min.`,
  });
}

function faradayCharge(): Question {
  const I = pick([0.5, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]);
  const min = pick([5, 10, 15, 20, 30, 60]);
  const q = I * min * 60;
  const askMol = Math.random() < 0.5;
  return Q({
    key: `fc-${I}-${min}-${askMol}`,
    prompt: askMol ? `A ${sf(I, 3)} A current flows for ${min}.0 min. How many moles of electrons pass? Give 3 significant figures.` : `A ${sf(I, 3)} A current flows for ${min}.0 min. How much charge passes, in coulombs?`,
    unit: askMol ? "mol" : "C",
    ...key(askMol ? sig(q / F, 3) : q),
    hint: askMol ? "q = I × t (seconds), then divide by Faraday's constant, 96,485 C/mol." : "q = I × t, with t in seconds (1 A = 1 C/s).",
    explain: askMol ? `q = ${sf(I, 3)} × ${min * 60} = ${q} C; n = ${q} ÷ 96,485 = ${sf(q / F, 3)} mol e⁻.` : `q = ${sf(I, 3)} A × ${min * 60} s = ${q} C.`,
  });
}

function compareMetals(): Question {
  const [a, b] = some(PLATE, 2);
  const da = METAL_IONS[a];
  const db = METAL_IONS[b];
  const ma = da.M / da.z;
  const mb = db.M / db.z;
  if (Math.abs(ma - mb) < 2) return compareMetals();
  const more = ma > mb ? a : b;
  return Q({
    key: `cmp-${a}-${b}`,
    prompt: `The same charge passes through a ${da.ion} cell and a ${db.ion} cell in series. Which deposits the greater mass of metal?`,
    ...lab(`${cap(METAL_IONS[more].name)}`, [`${cap(METAL_IONS[more === a ? b : a].name)}`, "The same mass of each"]),
    hint: "Same charge means the same moles of electrons. Mass per mole of electrons = molar mass ÷ ion charge.",
    explain: `${a}: ${num(da.M)} ÷ ${da.z} = ${sf(ma, 3)} g per mol e⁻; ${b}: ${num(db.M)} ÷ ${db.z} = ${sf(mb, 3)} g per mol e⁻. ${cap(METAL_IONS[more].name)} deposits more.`,
  });
}

export const electrolysis = mix(faradayMass, faradayMass, faradayTime, faradayCharge, compareMetals);

/* ---------- Do it: rank and sort redox */

function orderReducing(): Question {
  const ms = some(CELL_METALS, 4).sort((a, b) => E0(a) - E0(b));
  if (new Set(ms.map(E0)).size < 4) return orderReducing();
  return Q({
    key: `or-${ms.join()}`,
    prompt: "Order these metals as reducing agents, strongest first.",
    visual: e0Table(ms),
    ...act({ kind: "order", items: ms.map((m) => `${cap(METAL_IONS[m].name)} (${m})`), direction: "strongest reducing agent first" }, 4),
    hint: "A strong reducing agent is easily oxidized. The more negative its E° (as a reduction), the more readily the metal gives up electrons.",
    explain: ms.map((m) => `${m} (${num(E0(m), 2)} V)`).join(" > ") + ".",
  });
}

function orderOxidizing(): Question {
  const pool = ["F₂", "Cl₂", "Br₂", "I₂", "O₂", "Ag", "Cu"];
  const ms = some(pool, 4).sort((a, b) => E0(b) - E0(a));
  const name = (m: string) => (m === "Ag" ? "Ag⁺" : m === "Cu" ? "Cu²⁺" : m);
  return Q({
    key: `oo-${ms.join()}`,
    prompt: "Order these as oxidizing agents, strongest first.",
    visual: e0Table(ms),
    ...act({ kind: "order", items: ms.map(name), direction: "strongest oxidizing agent first" }, 4),
    hint: "An oxidizing agent is reduced. The higher (more positive) its reduction potential, the stronger it is.",
    explain: ms.map((m) => `${name(m)} (${num(E0(m), 2)} V)`).join(" > ") + ".",
  });
}

function orderCells(): Question {
  const pairs: ReturnType<typeof cellPair>[] = [];
  for (let i = 0; i < 40 && pairs.length < 4; i++) {
    const c = cellPair();
    if (!pairs.some((p) => Math.abs(p.E - c.E) < 0.05)) pairs.push(c);
  }
  if (pairs.length < 4) return orderCells();
  pairs.sort((a, b) => b.E - a.E);
  const metals = [...new Set(pairs.flatMap((p) => [p.left, p.right]))].sort((a, b) => E0(a) - E0(b));
  if (metals.length > 7) return orderCells();
  const items = pairs.map((p) => `${p.anode} | ${p.cathode} cell`);
  return Q({
    key: `oc-${items.join()}`,
    prompt: "Order these galvanic cells by standard cell potential, highest first.",
    visual: table(["Metal", "E° (V)"], metals.map((m) => [`${METAL_IONS[m].ion}/${m}`, num(E0(m), 2)])),
    ...act({ kind: "order", items, direction: "highest E°cell first" }, 4),
    hint: "For each cell, E°cell = E°(cathode) − E°(anode): the gap between the two values in the table.",
    explain: pairs.map((p) => `${p.anode} | ${p.cathode}: ${num(p.E, 2)} V`).join("; ") + ".",
  });
}

function sortSpontaneous(): Question {
  const rows: { label: string; bin: number }[] = [];
  const used = new Set<string>();
  const pool = some(CELL_METALS, 5);
  for (let i = 0; i < 80 && rows.length < 5; i++) {
    const [x, y] = some(pool, 2);
    if (Math.abs(E0(x) - E0(y)) < 0.1 || used.has(x + y) || used.has(y + x)) continue;
    used.add(x + y);
    const rx = cellRxn(x, y);
    rows.push({ label: eqText(rx.r.map((r) => ({ ...r, state: undefined })), rx.p.map((p) => ({ ...p, state: undefined }))), bin: E0(y) > E0(x) ? 0 : 1 });
  }
  if (rows.length < 4) return sortSpontaneous();
  return Q({
    key: `ss-${rows.map((r) => r.label).sort().join("|")}`,
    prompt: "Sort these reactions: spontaneous under standard conditions, or not? Use the table of E° values.",
    visual: table(["Metal", "E° (V)"], [...pool].sort((a, b) => E0(a) - E0(b)).map((m) => [`${METAL_IONS[m].ion}/${m}`, num(E0(m), 2)])),
    ...act({ kind: "sort", bins: ["Spontaneous (E° > 0)", "Not spontaneous (E° < 0)"], items: rows }, rows.length),
    hint: "In each equation, the metal ion on the left is reduced. It's spontaneous if that ion's E° is higher than the E° of the metal being oxidized.",
    explain: rows.map((r) => `${r.label}: ${r.bin === 0 ? "spontaneous" : "not spontaneous"}`).join("; ") + ".",
  });
}

export const redoxActivity = mix(orderReducing, orderOxidizing, orderCells, sortSpontaneous, sortSpontaneous);
