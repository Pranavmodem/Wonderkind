/**
 * Question generators for middle-school chemistry (Grades 6–8, ages 11–14): MS-PS1-1 to MS-PS1-6.
 * Worlds and levels are assembled in ./ages11to14.ts.
 *
 * Most lessons mix a few generators: reading a picture, calculating, predicting and explaining (as choices).
 * Conceptual questions live in small banks (`bank`), handed out without repeats; numbers come from real data.
 */
import { bag, labelChoices, pick, rand, shuffle } from "../../questions";
import { balance, sideAtoms } from "../../science/chemistryValidate";
import { bohrShells, element, parseFormula } from "../../science/elements";
import type { Activity, Question, Visual } from "../../types";

/* =================================================================== helpers */

const NONE: Visual = { kind: "none" };

type Ans = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra" | "activity">;

/** Remove floating-point noise. */
const clean = (x: number) => Math.round(x * 1e6) / 1e6;

/** A number as text with a real minus sign. */
const ns = (x: number) => (x < 0 ? `−${Math.abs(clean(x))}` : String(clean(x)));

/** Text choices: the correct one and up to 3 wrong ones, shuffled. */
function label(correct: string, wrong: string[]): Ans {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong));
  return { answer, input: "choices", choices, labels };
}

/** Number choices: the answer, likely mistakes, then neighbours. */
function nums(answer: number, wrong: number[], step = 1, min = 0): Ans {
  const out = [clean(answer)];
  const add = (v: number) => {
    const c = clean(v);
    if (out.length < 4 && c >= min && !out.includes(c)) out.push(c);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < 4 && k < 40; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return { answer: clean(answer), input: "choices", choices: shuffle(out) };
}

/** Type the answer (decimals get ".", negatives get "−"). */
function keypad(answer: number): Ans {
  const a = clean(answer);
  if (a < 0) return { answer: a, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(a)) return { answer: a, input: "keypad", keypadExtra: "." };
  return { answer: a, input: "keypad" };
}

/** A hands-on activity; `answer` is its key number. */
const act = (activity: Activity, answer: number): Ans => ({ input: "activity", activity, answer: clean(answer) });

interface Q {
  key: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  unit?: string;
  hint: string;
  explain: string;
}

function make(q: Q, a: Ans): Question {
  return {
    key: q.key,
    prompt: q.prompt,
    speech: q.speech ?? q.prompt,
    visual: q.visual ?? NONE,
    ...(q.needsVisual ? { needsVisual: true } : {}),
    ...(q.unit ? { unit: q.unit } : {}),
    ...a,
    hint: q.hint,
    explain: q.explain,
  };
}

/** One multiple-choice question: k key, p prompt, a correct answer, w wrong answers, h hint, e explain. */
interface MC {
  k: string;
  p: string;
  a: string;
  w: string[];
  h: string;
  e: string;
  v?: Visual;
  nv?: boolean;
  s?: string;
}

/** Hand out multiple-choice questions from a bank without repeats. */
function bank(prefix: string, items: MC[]): () => Question {
  const next = bag(items);
  return () => {
    const it = next();
    return make({ key: `${prefix}-${it.k}`, prompt: it.p, speech: it.s, visual: it.v, needsVisual: it.nv, hint: it.h, explain: it.e }, label(it.a, it.w));
  };
}

/** Take turns between generators (repeat one to give it more weight). */
function mix(...gens: (() => Question)[]): () => Question {
  const next = bag(gens);
  return () => next()();
}

/** A sort activity from two or three pools: `n` items in all, at least one from every pool. */
function sortFrom(bins: string[], pools: string[][], n: number): { activity: Activity; key: string; items: { label: string; bin: number }[] } {
  const per = pools.map(() => 1);
  for (let i = pools.length; i < n; i++) per[rand(0, pools.length - 1)]++;
  const items = shuffle(pools.flatMap((pool, b) => shuffle(pool).slice(0, Math.min(per[b], pool.length)).map((label) => ({ label, bin: b }))));
  const key = items
    .map((it) => `${it.bin}${it.label.slice(-6)}`)
    .sort()
    .join("|");
  return { activity: { kind: "sort", bins, items }, key, items };
}

/** A whole number as a subscript: 12 → "₁₂". */
const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);

/** "an" before vowel sounds. */
const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

const NAMES = ["Leo", "Mia", "Sam", "Ava", "Kai", "Zoe", "Ben", "Ana", "Raj", "Noor"];

/* ---------------------------------------------------------------- formulas */

const el = (s: string) => element(s)!;
const elName = (s: string) => el(s).name.toLowerCase();

/** Atoms of each element in a formula, in the order they're written. */
function atomsOf(formula: string): [string, number][] {
  const counts = parseFormula(formula).atoms;
  const order: string[] = [];
  for (const m of formula.matchAll(/[A-Z][a-z]?/g)) if (!order.includes(m[0]) && counts[m[0]]) order.push(m[0]);
  return order.map((s) => [s, counts[s]]);
}
const totalAtoms = (formula: string) => atomsOf(formula).reduce((t, [, n]) => t + n, 0);

/** "2 hydrogen atoms and 1 oxygen atom". */
function atomList(formula: string, times = 1): string {
  const parts = atomsOf(formula).map(([s, n]) => `${n * times} ${elName(s)} atom${n * times === 1 ? "" : "s"}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
}

/* ============================================================ 1. ATOMS & MOLECULES */

/** Common isotopes of the first 20 elements: [symbol, mass number]. */
const ISOTOPES: [string, number][] = [
  ["H", 1], ["He", 4], ["Li", 7], ["Be", 9], ["B", 11], ["C", 12], ["N", 14], ["O", 16], ["F", 19], ["Ne", 20],
  ["Na", 23], ["Mg", 24], ["Al", 27], ["Si", 28], ["P", 31], ["S", 32], ["Cl", 35], ["Ar", 40], ["K", 39], ["Ca", 40],
];

/** Names of elements near z, for wrong answers. */
function nearNames(z: number): string[] {
  return [z - 1, z + 1, z - 2, z + 2, z + 8, z - 8].filter((x) => x >= 1 && x <= 20).map((x) => element(x)!.name);
}

/** MS-PS1-1 — the parts of an atom, read from a Bohr model. */
export const atomParts = mix(
  () => {
    const [sym, A] = pick(ISOTOPES);
    const e = el(sym);
    const z = e.z;
    const n = A - z;
    const kind = rand(0, 4);
    const base = { kind: "chem-atom" as const, protons: z, neutrons: n, electrons: z };
    if (kind === 0)
      return make(
        {
          key: `name-${sym}`,
          prompt: "Which element is this atom?",
          visual: { ...base, hide: ["symbol"] },
          needsVisual: true,
          hint: "Count the protons (p⁺) in the nucleus. The number of protons decides the element.",
          explain: `It has ${z} proton${z === 1 ? "" : "s"}, so it is ${e.name.toLowerCase()} (atomic number ${z}).`,
        },
        label(e.name, nearNames(z)),
      );
    if (kind === 1)
      return make(
        {
          key: `mass-${sym}`,
          prompt: "What is the mass number of this atom?",
          visual: { ...base, hide: ["mass"] },
          needsVisual: true,
          hint: "Mass number = protons + neutrons (the particles in the nucleus).",
          explain: `${z} protons + ${n} neutrons = ${A}.`,
        },
        keypad(A),
      );
    if (kind === 2)
      return make(
        {
          key: `neut-${sym}`,
          prompt: `This ${e.name.toLowerCase()} atom has mass number ${A}. How many neutrons does it have?`,
          visual: { ...base, hide: ["neutrons"] },
          needsVisual: true,
          hint: "Neutrons = mass number − protons.",
          explain: `${A} − ${z} protons = ${n} neutrons.`,
        },
        keypad(n),
      );
    if (kind === 3)
      return make(
        {
          key: `elec-${sym}`,
          prompt: "How many electrons does this atom have?",
          visual: { ...base, hide: ["electrons"] },
          needsVisual: true,
          hint: "Count the dots on every shell. In a neutral atom, electrons = protons.",
          explain: `${z} electron${z === 1 ? "" : "s"}, the same as its ${z} proton${z === 1 ? "" : "s"}, so the atom has no overall charge.`,
        },
        keypad(z),
      );
    const shells = bohrShells(z);
    const outer = shells[shells.length - 1];
    return make(
      {
        key: `outer-${sym}`,
        prompt: "How many electrons are in the outer shell?",
        visual: { ...base, valence: true },
        needsVisual: true,
        hint: "Find the shell farthest from the nucleus and count its electrons.",
        explain: `The shells hold ${shells.join(", ")}. The outer shell has ${outer}.`,
      },
      keypad(outer),
    );
  },
  () => {
    const [sym, A] = pick(ISOTOPES.slice(1, 18));
    const z = el(sym).z;
    const n = A - z;
    const ask = rand(0, 1);
    return make(
      {
        key: `calc-${ask}-${sym}`,
        prompt: ask ? `A neutral atom has ${z} protons and ${n} neutrons. How many electrons does it have?` : `A neutral atom has ${z} protons and ${n} neutrons. What is its mass number?`,
        hint: ask ? "In a neutral atom the + and − charges cancel, so electrons = protons." : "Mass number counts the particles in the nucleus: protons + neutrons. Electrons are too light to count.",
        explain: ask ? `${z} protons, so ${z} electrons. (Neutrons have no charge.)` : `${z} + ${n} = ${A}. It's ${el(sym).name.toLowerCase()}-${A}.`,
      },
      keypad(ask ? z : A),
    );
  },
  bank("parts", [
    { k: "neg", p: "Which particle has a negative charge?", a: "Electron", w: ["Proton", "Neutron", "Nucleus"], h: "It is the tiny particle moving around the outside.", e: "Electrons are negative, protons are positive, and neutrons have no charge." },
    { k: "none", p: "Which particle has no charge?", a: "Neutron", w: ["Proton", "Electron", "Ion"], h: "Its name sounds like 'neutral'.", e: "Neutrons are neutral: no charge. They sit in the nucleus with the protons." },
    { k: "mass", p: "Where is almost all of an atom's mass?", a: "In the nucleus", w: ["In the electron shells", "Spread evenly through the atom", "In the empty space"], h: "Protons and neutrons are about 1,800 times heavier than electrons.", e: "Protons and neutrons make up the nucleus, so nearly all the mass is there." },
    { k: "which", p: "What decides which element an atom is?", a: "Its number of protons", w: ["Its number of neutrons", "Its number of electrons", "Its size"], h: "This number is the atomic number on the periodic table.", e: "Every carbon atom has 6 protons; any atom with 6 protons is carbon. Neutrons and electrons can vary." },
    { k: "empty", p: "An atom is mostly…", a: "Empty space", w: ["Protons", "Neutrons", "Liquid"], h: "The nucleus is tiny compared with the whole atom.", e: "If an atom were a stadium, the nucleus would be a marble in the middle. The rest is mostly empty space with electrons." },
    { k: "an", p: "The atomic number of oxygen is 8. What does that tell you?", a: "Every oxygen atom has 8 protons", w: ["Oxygen atoms have 8 neutrons each", "Oxygen has a mass of 8", "Oxygen has 8 shells"], h: "Atomic number = number of protons.", e: "Atomic number counts protons. A neutral oxygen atom also has 8 electrons." },
  ]),
);

/** MS-PS1-1 — Do it: build an atom from protons, neutrons and electrons. */
export function buildAtom(): Question {
  const [sym, A] = pick(ISOTOPES);
  const e = el(sym);
  const z = e.z;
  const name = `${e.name.toLowerCase()}-${A}`;
  return make(
    {
      key: `build-${sym}`,
      prompt: `Build a neutral atom of ${name}.`,
      hint: `Protons = the atomic number of ${e.name.toLowerCase()} (the builder names the element as you add protons). Neutrons = ${A} − protons. Electrons = protons.`,
      explain: `${e.name} has atomic number ${z}: ${z} proton${z === 1 ? "" : "s"}, ${A} − ${z} = ${A - z} neutron${A - z === 1 ? "" : "s"}, and ${z} electron${z === 1 ? "" : "s"}.`,
    },
    act({ kind: "chem-buildAtom", target: { element: sym, A } }, z),
  );
}

/** Main-group elements shown on a periods 1–4 table. */
const MAIN_1_4 = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Ga", "Ge", "As", "Se", "Br", "Kr"];

/** MS-PS1-1 — find elements on the periodic table. */
export const periodicTable = mix(
  () => {
    const sym = pick(MAIN_1_4);
    const e = el(sym);
    const near = MAIN_1_4.filter((s) => s !== sym && Math.abs(el(s).z - e.z) <= 3);
    return make(
      {
        key: `ask-${sym}`,
        prompt: `Which element goes in the "?" box (atomic number ${e.z})?`,
        visual: { kind: "chem-table", mainOnly: true, periods: [1, 4], show: "number", colourBy: "category", ask: [sym] },
        needsVisual: true,
        hint: "Atomic numbers go up by one across each row. Look at the neighbours.",
        explain: `Atomic number ${e.z} is ${e.name.toLowerCase()}, ${sym}.`,
      },
      label(`${sym} (${e.name.toLowerCase()})`, shuffle(near).map((s) => `${s} (${elName(s)})`)),
    );
  },
  () => {
    const sym = pick(MAIN_1_4.slice(0, 20));
    const e = el(sym);
    const what = pick(["Protons", "Electrons"] as const);
    return make(
      {
        key: `tile-${what}-${sym}`,
        prompt: `How many ${what.toLowerCase()} are in a neutral atom of ${e.name.toLowerCase()}?`,
        visual: { kind: "chem-element", element: sym, extra: [{ label: what, value: "?" }] },
        needsVisual: true,
        hint: "The top number on the tile is the atomic number: the number of protons. A neutral atom has the same number of electrons.",
        explain: `${e.name}'s atomic number is ${e.z}, so it has ${e.z} ${what.toLowerCase()}.`,
      },
      keypad(e.z),
    );
  },
  () => {
    const [sym, name, wrong] = pick([
      ["Na", "Sodium", ["So", "S", "N"]],
      ["K", "Potassium", ["P", "Po", "Pt"]],
      ["Fe", "Iron", ["I", "Ir", "In"]],
      ["Cu", "Copper", ["Co", "C", "Cp"]],
      ["Ag", "Silver", ["Si", "S", "Sv"]],
      ["Au", "Gold", ["G", "Go", "Gd"]],
      ["Pb", "Lead", ["L", "Le", "Ld"]],
      ["Hg", "Mercury", ["M", "Me", "Mr"]],
      ["Sn", "Tin", ["T", "Ti", "Tn"]],
      ["Cl", "Chlorine", ["C", "Ch", "Co"]],
      ["Mg", "Magnesium", ["M", "Mn", "Ma"]],
      ["Si", "Silicon", ["S", "Sc", "Sl"]],
    ] as [string, string, string[]][]);
    return make(
      {
        key: `sym-${sym}`,
        prompt: `What is the symbol for ${name.toLowerCase()}?`,
        visual: { kind: "chem-element", element: sym, symbol: "?" },
        hint: "Some symbols come from Latin names: natrium (Na), kalium (K), ferrum (Fe), cuprum (Cu), argentum (Ag), aurum (Au), plumbum (Pb), hydrargyrum (Hg), stannum (Sn).",
        explain: `${name} is ${sym}. A symbol is one capital letter, sometimes followed by one small letter.`,
      },
      label(sym, wrong),
    );
  },
  bank("table", [
    { k: "def", p: "What is an element?", a: "A substance made of only one kind of atom", w: ["Any substance found in nature", "Two kinds of atoms joined together", "A mixture of different atoms"], h: "Think of oxygen, gold or carbon.", e: "An element has only one kind of atom (one number of protons). There are 118 known elements." },
    { k: "group", p: "Elements in the same column (group) of the periodic table…", a: "Have similar properties", w: ["Have the same mass", "Are all gases", "Have the same number of protons"], h: "Lithium, sodium and potassium are all in group 1.", e: "Elements in a group have the same number of outer electrons, so they react in similar ways." },
    { k: "row", p: "As you go along a row (period), the atomic number…", a: "Goes up by 1 each box", w: ["Goes down by 1 each box", "Stays the same", "Doubles each box"], h: "Find H (1), He (2), then Li (3) in the next row.", e: "Each box has one more proton than the box before it." },
    { k: "metals", p: "Most elements on the periodic table are…", a: "Metals", w: ["Gases", "Liquids", "Nonmetals"], h: "Look at the left side and the middle of the table.", e: "About three-quarters of the elements are metals: shiny, and good at conducting heat and electricity." },
    { k: "count", p: "About how many elements are known?", a: "118", w: ["12", "50", "1,000"], h: "Count the boxes on a full periodic table.", e: "118 elements are known. Everything around you is made from them." },
  ]),
);

/** Elements (one kind of atom) and compounds (2+ kinds joined), with names. */
const ELEMENT_FORMULAS: [string, string][] = [
  ["O₂", "oxygen gas"], ["N₂", "nitrogen gas"], ["H₂", "hydrogen gas"], ["Cl₂", "chlorine gas"], ["O₃", "ozone"], ["Fe", "iron"],
  ["Cu", "copper"], ["He", "helium"], ["C", "diamond"], ["S₈", "sulfur"], ["Al", "aluminum"], ["Au", "gold"],
];
const COMPOUND_FORMULAS: [string, string][] = [
  ["H₂O", "water"], ["CO₂", "carbon dioxide"], ["NaCl", "table salt"], ["CH₄", "methane"], ["NH₃", "ammonia"], ["C₆H₁₂O₆", "glucose"],
  ["CaCO₃", "chalk"], ["HCl", "hydrogen chloride"], ["Fe₂O₃", "rust"], ["NaHCO₃", "baking soda"], ["H₂O₂", "hydrogen peroxide"], ["CO", "carbon monoxide"],
];

/** MS-PS1-1 — elements, compounds and mixtures from formulas and particle pictures. */
export const elementsCompounds = mix(
  () => {
    const isEl = rand(0, 1) === 1;
    const [f, name] = pick(isEl ? ELEMENT_FORMULAS : COMPOUND_FORMULAS);
    const kinds = atomsOf(f).map(([s]) => elName(s));
    return make(
      {
        key: `eoc-${f}`,
        prompt: `Is ${name} (${f}) an element or a compound?`,
        hint: "Count the kinds of atoms (capital letters) in the formula: one kind = element, two or more joined = compound.",
        explain: isEl
          ? `${f} has only ${kinds[0]} atoms, so it's an element${totalAtoms(f) > 1 ? `, even though its atoms are joined into molecules of ${totalAtoms(f)}` : ""}.`
          : `${f} has ${kinds.length} kinds of atoms (${kinds.join(" and ")}) joined together, so it's a compound.`,
      },
      label(isEl ? "Element" : "Compound", [isEl ? "Compound" : "Element", "Mixture"]),
    );
  },
  () => {
    const [f, name] = pick([...COMPOUND_FORMULAS, ["C₁₂H₂₂O₁₁", "table sugar"], ["H₂SO₄", "sulfuric acid"], ["NaOH", "sodium hydroxide"], ["CuSO₄", "copper sulfate"]] as [string, string][]);
    const kinds = atomsOf(f).map(([s]) => s);
    return make(
      {
        key: `kinds-${f}`,
        prompt: `How many different elements are in ${name}, ${f}?`,
        hint: "Each capital letter starts a new element symbol. Subscripts don't add new elements.",
        explain: `${f} contains ${kinds.map(elName).join(", ")}: ${kinds.length} element${kinds.length === 1 ? "" : "s"}.`,
      },
      nums(kinds.length, [totalAtoms(f), kinds.length + 1, kinds.length - 1], 1, 1),
    );
  },
  () => {
    const type = rand(0, 2);
    const elems = ["O₂", "N₂", "H₂", "Cl₂", "He"];
    const comps = ["H₂O", "CO₂", "CH₄", "NH₃", "HCl"];
    let species: { formula: string; count: number }[];
    if (type === 0) species = [{ formula: pick(elems), count: rand(5, 9) }];
    else if (type === 1) species = [{ formula: pick(comps), count: rand(5, 9) }];
    else {
      const [a, b] = shuffle([...elems, ...comps]).slice(0, 2);
      species = [{ formula: a, count: rand(3, 6) }, { formula: b, count: rand(3, 6) }];
    }
    const answers = ["One element", "One compound", "A mixture"];
    const f = species[0].formula;
    return make(
      {
        key: `box-${species.map((s) => `${s.formula}${s.count}`).join("-")}`,
        prompt: "What does this box hold?",
        visual: { kind: "chem-particles", panels: [{ species }], key: true },
        needsVisual: true,
        hint: "Are all the particles the same? If so, does each particle have one kind of atom (element) or more (compound)?",
        explain:
          type === 0
            ? `Every particle is ${f}, made of one kind of atom: one element.`
            : type === 1
              ? `Every particle is the same ${f} molecule, made of ${atomsOf(f).length} kinds of atoms: one compound.`
              : `There are two different kinds of particles (${species.map((s) => s.formula).join(" and ")}) mixed together, not joined: a mixture.`,
      },
      label(answers[type], answers.filter((_, i) => i !== type)),
    );
  },
  bank("eoc", [
    { k: "comp", p: "What makes something a compound?", a: "Two or more elements chemically joined in a fixed ratio", w: ["Any two substances stirred together", "Atoms of one element joined together", "A substance found in living things"], h: "Water is always H₂O: 2 H for every 1 O.", e: "In a compound the atoms are bonded in a fixed ratio, and it has new properties." },
    { k: "o2", p: "O₂ is a molecule. Is it an element or a compound?", a: "An element: it has only oxygen atoms", w: ["A compound: it has two atoms", "A mixture of two oxygens", "Neither"], h: "A molecule can be made of one kind of atom.", e: "Molecules can be elements (O₂, N₂, H₂) or compounds (H₂O, CO₂). It depends on the kinds of atoms." },
    { k: "new", p: "Sodium is a shiny metal and chlorine is a green, poisonous gas. Sodium chloride (salt) is…", a: "A white solid you can eat: a compound with new properties", w: ["A shiny green metal", "A mixture you can pull apart with a magnet", "Still poisonous like chlorine"], h: "When elements join into a compound, the compound has its own properties.", e: "A compound is a new substance. Its properties can be completely different from its elements'." },
  ]),
);

/** Formulas for counting atoms: [formula, name]. */
const COUNT_FORMULAS: [string, string][] = [
  ["H₂O", "water"], ["CO₂", "carbon dioxide"], ["CH₄", "methane"], ["NH₃", "ammonia"], ["C₆H₁₂O₆", "glucose"],
  ["C₁₂H₂₂O₁₁", "table sugar"], ["NaHCO₃", "baking soda"], ["CaCO₃", "chalk"], ["H₂O₂", "hydrogen peroxide"],
  ["C₂H₅OH", "ethanol"], ["H₂SO₄", "sulfuric acid"], ["C₃H₈", "propane"], ["Ca(OH)₂", "slaked lime"],
  ["Mg(OH)₂", "milk of magnesia"], ["C₈H₁₈", "octane (in gasoline)"], ["Al₂O₃", "aluminum oxide"], ["C₉H₈O₄", "aspirin"],
];

/** MS-PS1-1 — count atoms in formulas, with brackets and coefficients. */
export const countAtoms = mix(
  () => {
    const [f, name] = pick(COUNT_FORMULAS);
    const total = totalAtoms(f);
    return make(
      {
        key: `tot-${f}`,
        prompt: `How many atoms are in one ${f.includes("Na") || f.includes("Ca") || f.includes("Al") || f.includes("Mg") ? "formula unit" : "molecule"} of ${name}, ${f}?`,
        hint: f.includes("(") ? "A subscript after brackets multiplies everything inside them. No subscript means 1." : "Add up the subscripts. A symbol with no subscript counts as 1.",
        explain: `${f} has ${atomList(f)}: ${total} atoms in all.`,
      },
      keypad(total),
    );
  },
  () => {
    const [f, name] = pick(COUNT_FORMULAS);
    const [s, n] = pick(atomsOf(f));
    return make(
      {
        key: `one-${f}-${s}`,
        prompt: `How many ${elName(s)} atoms are in one ${name} particle, ${f}?`,
        hint: f.includes("(") ? "Count every place the symbol appears. Brackets with a subscript multiply what's inside." : "Find every place the symbol appears and add their subscripts.",
        explain: `${f} has ${atomList(f)}. So ${n} ${elName(s)} atom${n === 1 ? "" : "s"}.`,
      },
      keypad(n),
    );
  },
  () => {
    const [f, name] = pick(COUNT_FORMULAS.slice(0, 12));
    const c = rand(2, 5);
    const [s, n] = pick(atomsOf(f));
    return make(
      {
        key: `coef-${c}-${f}-${s}`,
        prompt: `How many ${elName(s)} atoms are in ${c}${f}?`,
        speech: `How many ${elName(s)} atoms are in ${c} ${f}?`,
        hint: `The big ${c} in front means ${c} whole molecules. Count the atoms in one, then multiply by ${c}.`,
        explain: `One ${name} molecule has ${n}; ${c} molecules have ${c} × ${n} = ${c * n}.`,
      },
      keypad(c * n),
    );
  },
  () => {
    const [f, name] = pick(COUNT_FORMULAS.filter(([x]) => totalAtoms(x) <= 12));
    const who = pick(NAMES);
    const total = totalAtoms(f);
    const wrongCount = atomsOf(f).length; // counted kinds, not atoms
    return make(
      {
        key: `spot-${f}`,
        prompt: `${who} says ${name}, ${f}, has ${wrongCount} atoms. How many does it really have?`,
        hint: `${who} counted the kinds of atoms. Count every atom, using the subscripts.`,
        explain: `${who} counted the ${wrongCount} kinds of element. With the subscripts, ${f} has ${atomList(f)}: ${total} atoms.`,
      },
      nums(total, [wrongCount, total + 1, total - 1], 1, 1),
    );
  },
);

/** Molecule presets for models: [formula, name, wrong formulas]. */
const MODELS: [string, string, string[]][] = [
  ["H₂O", "water", ["HO₂", "H₂O₂", "OH"]],
  ["CO₂", "carbon dioxide", ["CO", "C₂O", "CO₃"]],
  ["CH₄", "methane", ["CH₃", "C₄H", "C₂H₄"]],
  ["NH₃", "ammonia", ["NH₄", "N₃H", "NH₂"]],
  ["O₂", "oxygen", ["O", "O₃", "H₂O"]],
  ["H₂", "hydrogen", ["H", "H₂O", "He"]],
  ["N₂", "nitrogen", ["N", "NH₃", "N₃"]],
  ["Cl₂", "chlorine", ["Cl", "HCl", "C₂l"]],
  ["HCl", "hydrogen chloride", ["H₂Cl", "HCl₂", "Cl₂"]],
  ["C₂H₆", "ethane", ["CH₃", "C₂H₄", "C₆H₂"]],
  ["CH₃OH", "methanol", ["CH₄O₂", "CH₂OH", "C₂H₅OH"]],
  ["O₃", "ozone", ["O₂", "3O", "CO₃"]],
  ["H₂S", "hydrogen sulfide", ["HS₂", "H₂SO₄", "SH"]],
  ["CCl₄", "carbon tetrachloride", ["CCl₂", "C₄Cl", "CCl₃"]],
];

/** MS-PS1-1 — read ball-and-stick models of simple molecules. */
export const moleculeModels = mix(
  () => {
    const [f, name, wrong] = pick(MODELS);
    return make(
      {
        key: `formula-${f}`,
        prompt: "What is the formula of this molecule?",
        visual: { kind: "chem-molecule", molecule: f, style: "ball" },
        needsVisual: true,
        hint: "Count each colour of ball: white H, dark grey C, red O, blue N, green Cl, yellow S. Write the count as a subscript.",
        explain: `It has ${atomList(f)}: ${f}, ${name}.`,
      },
      label(f, wrong),
    );
  },
  () => {
    const [f, name] = pick(MODELS);
    return make(
      {
        key: `count-${f}`,
        prompt: `How many atoms are in this ${name} molecule?`,
        visual: { kind: "chem-molecule", molecule: f, style: "ball" },
        needsVisual: true,
        hint: "Count every ball, including the small white hydrogens.",
        explain: `${f}: ${atomList(f)}, ${totalAtoms(f)} atoms.`,
      },
      keypad(totalAtoms(f)),
    );
  },
  () => {
    const [f, name] = pick(MODELS);
    const others = shuffle(MODELS.filter((m) => m[0] !== f)).slice(0, 3);
    return make(
      {
        key: `name-${f}`,
        prompt: "Which molecule is this?",
        visual: { kind: "chem-molecule", molecule: f, style: rand(0, 1) ? "ball" : "structural" },
        needsVisual: true,
        hint: "Work out the formula from the atoms first, then match it to a name.",
        explain: `${atomList(f)} make ${f}: ${name}.`,
      },
      label(`${name} (${f})`, others.map(([g, n]) => `${n} (${g})`)),
    );
  },
  () => {
    // Three boxes of molecules: which holds the compound (or the element)?
    const wantCompound = rand(0, 1) === 1;
    const elems = shuffle(["O₂", "N₂", "H₂", "Cl₂", "O₃"]);
    const comps = shuffle(["H₂O", "CO₂", "CH₄", "NH₃", "HCl"]);
    const odd = wantCompound ? comps[0] : elems[0];
    const rest = wantCompound ? elems.slice(0, 2) : comps.slice(0, 2);
    const order = shuffle([odd, ...rest]);
    const at = order.indexOf(odd);
    const names = ["A", "B", "C"];
    return make(
      {
        key: `odd-${order.join("-")}`,
        prompt: wantCompound ? "Which box holds molecules of a compound?" : "Which box holds molecules of an element?",
        visual: { kind: "chem-particles", panels: order.map((f, i) => ({ species: [{ formula: f, count: 4 }], label: names[i] })), joiner: null, key: false },
        needsVisual: true,
        hint: "Look inside one molecule: are its balls all one colour (element) or two colours (compound)?",
        explain: `Box ${names[at]} holds ${odd}, made of ${wantCompound ? "two kinds of atoms: a compound" : "one kind of atom: an element"}. The others are ${rest.join(" and ")}.`,
      },
      label(`Box ${names[at]}`, names.filter((_, i) => i !== at).map((n) => `Box ${n}`)),
    );
  },
);

/** Molecules to build: [target, centre, tray, name, how]. */
const BUILDS: [string, string, string[], string, string][] = [
  ["H₂O", "O", ["H"], "water", "O makes 2 single bonds to H and keeps 2 lone pairs."],
  ["H₂S", "S", ["H"], "hydrogen sulfide", "S, like O, makes 2 single bonds and keeps 2 lone pairs."],
  ["NH₃", "N", ["H"], "ammonia", "N makes 3 single bonds to H and keeps 1 lone pair."],
  ["PH₃", "P", ["H"], "phosphine", "P, like N, makes 3 single bonds and keeps 1 lone pair."],
  ["CH₄", "C", ["H"], "methane", "C makes 4 single bonds, one to each H."],
  ["SiH₄", "Si", ["H"], "silane", "Si, like C, makes 4 single bonds."],
  ["CO₂", "C", ["O"], "carbon dioxide", "C makes a double bond to each O: O=C=O."],
  ["CH₂O", "C", ["H", "O"], "formaldehyde", "C makes single bonds to 2 H and a double bond to O."],
  ["HCN", "C", ["H", "N"], "hydrogen cyanide", "C makes a single bond to H and a triple bond to N."],
  ["CCl₄", "C", ["Cl"], "carbon tetrachloride", "C makes 4 single bonds, one to each Cl."],
  ["CH₃Cl", "C", ["H", "Cl"], "chloromethane", "C makes 4 single bonds: 3 to H and 1 to Cl."],
  ["NCl₃", "N", ["Cl"], "nitrogen trichloride", "N makes 3 single bonds to Cl and keeps 1 lone pair."],
  ["OF₂", "O", ["F"], "oxygen difluoride", "O makes 2 single bonds to F and keeps 2 lone pairs."],
  ["CS₂", "C", ["S"], "carbon disulfide", "Like CO₂: a double bond to each S."],
  ["O₂", "O", ["O"], "oxygen", "Two O atoms share a double bond."],
  ["N₂", "N", ["N"], "nitrogen", "Two N atoms share a triple bond."],
  ["HCl", "Cl", ["H"], "hydrogen chloride", "Cl makes 1 single bond to H and keeps 3 lone pairs."],
];

/** MS-PS1-1 — Do it: build a molecule with full outer shells. */
export function buildMolecule(): Question {
  const [f, center, tray, name, how] = pick(BUILDS);
  const extra = rand(0, 1) && tray.length < 3 ? pick(["H", "O", "Cl", "N"].filter((x) => !tray.includes(x) && x !== center)) : null;
  const t = extra ? shuffle([...tray, extra]) : tray;
  return make(
    {
      key: `mol-${f}-${extra ?? ""}`,
      prompt: `Build ${an(name)} molecule, ${f}, around the ${elName(center)} atom.`,
      speech: `Build ${an(name)} molecule, ${f}. Every atom needs a full outer shell.`,
      hint: "H makes 1 bond. O and S make 2. N and P make 3. C and Si make 4. Tap a bond to make it double or triple.",
      explain: `${f}: ${how}`,
    },
    act({ kind: "chem-buildMolecule", center, tray: t, target: f }, totalAtoms(f) - 1),
  );
}

/** Ionic crystals: [formula, cation, anion, cations, anions, name]. */
const CRYSTALS: [string, string, string, number, number, string][] = [
  ["NaCl", "Na⁺", "Cl⁻", 1, 1, "sodium chloride (table salt)"],
  ["MgO", "Mg²⁺", "O²⁻", 1, 1, "magnesium oxide"],
  ["KCl", "K⁺", "Cl⁻", 1, 1, "potassium chloride"],
  ["CaF₂", "Ca²⁺", "F⁻", 1, 2, "calcium fluoride"],
  ["MgCl₂", "Mg²⁺", "Cl⁻", 1, 2, "magnesium chloride"],
  ["Na₂O", "Na⁺", "O²⁻", 2, 1, "sodium oxide"],
];

/** MS-PS1-1 — molecules versus extended structures (salt crystals, diamond, metals). */
export const extendedStructures = mix(
  () => {
    const [f, cat, ani, a, b, name] = pick(CRYSTALS);
    const k = pick(a + b === 2 ? [5, 6, 8, 10] : [3, 4, 5, 6]);
    const wrong = [`${cat.replace(/[⁺⁻²]/g, "")}${k * a > 1 ? sub(k * a) : ""}${ani.replace(/[⁺⁻²]/g, "")}${k * b > 1 ? sub(k * b) : ""}`];
    const strip = (x: string) => x.replace(/[⁺⁻²]/g, "");
    if (a === b) wrong.push(`${strip(cat)}${strip(ani)}₂`, `${strip(cat)}₂${strip(ani)}`);
    else wrong.push(`${strip(cat)}${strip(ani)}`, a > b ? `${strip(cat)}${strip(ani)}₂` : `${strip(cat)}₂${strip(ani)}`);
    return make(
      {
        key: `ratio-${f}-${k}`,
        prompt: `This is a tiny piece of a ${name.split(" (")[0]} crystal. What is its formula?`,
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: cat, count: k * a }, { formula: ani, count: k * b }], arrangement: "solid", label: "Crystal" }] },
        needsVisual: true,
        hint: `Count each kind of ion, then simplify the ratio. The formula gives the ratio, not every ion in the crystal.`,
        explain: `There are ${k * a} ${cat} and ${k * b} ${ani}: a ratio of ${a} : ${b}. The crystal keeps repeating, so the formula is ${f}.`,
      },
      label(f, wrong),
    );
  },
  () => {
    const kind = rand(0, 3);
    const opts: [string, Visual, string, string][] = [
      ["diamond", { kind: "chem-particles", panels: [{ species: [{ formula: "C", count: 16, name: "carbon atom" }], arrangement: "solid", label: "Diamond" }] }, "A giant network: every carbon atom is bonded to 4 others", "Diamond is one giant structure. Each C atom bonds to 4 neighbours, so the whole crystal is held together, which makes it very hard."],
      ["copper", { kind: "chem-particles", panels: [{ species: [{ formula: "Cu", count: 16, name: "copper atom" }], arrangement: "solid", label: "Copper" }] }, "A giant structure: copper atoms packed in a repeating pattern", "A metal is a huge array of atoms packed in rows. Its outer electrons can move through it, which is why metals conduct electricity."],
      ["salt", { kind: "chem-particles", panels: [{ species: [{ formula: "Na⁺", count: 8 }, { formula: "Cl⁻", count: 8 }], arrangement: "solid", label: "Salt" }] }, "A giant structure: Na⁺ and Cl⁻ ions in a repeating pattern", "Salt is a crystal of ions held by strong attractions, repeating in every direction. There are no separate NaCl molecules."],
      ["ice", { kind: "chem-particles", panels: [{ species: [{ formula: "H₂O", count: 12 }], arrangement: "solid", label: "Ice" }] }, "Separate H₂O molecules packed together", "Ice is made of separate water molecules. Each H₂O is its own molecule, held to its neighbours only weakly, so ice melts easily."],
    ];
    const [name, v, right, why] = opts[kind];
    const wrong = opts.filter((_, i) => i !== kind).map((o) => o[2]);
    return make(
      {
        key: `kind-${name}`,
        prompt: `What kind of structure does ${name} have?`,
        visual: v,
        hint: "Is it made of small separate molecules, or one huge structure that repeats in every direction?",
        explain: why,
      },
      label(right, wrong),
    );
  },
  bank("ext", [
    { k: "which", p: "Which of these is an extended structure, not made of separate molecules?", a: "Table salt, NaCl", w: ["Water, H₂O", "Carbon dioxide, CO₂", "Methane, CH₄"], h: "Ionic crystals, metals and diamond are giant repeating structures.", e: "Salt is a giant lattice of Na⁺ and Cl⁻ ions. Water, CO₂ and methane are made of small separate molecules." },
    { k: "mol", p: "Which of these is made of small separate molecules?", a: "Carbon dioxide gas", w: ["Diamond", "Copper wire", "A salt crystal"], h: "Gases at room temperature are usually made of small molecules.", e: "CO₂ is made of separate O=C=O molecules. Diamond, copper and salt are giant structures." },
    { k: "hard", p: "Why is diamond so hard?", a: "Every atom is strongly bonded into one giant network", w: ["Its molecules are very heavy", "It is made of metal atoms", "It has water trapped inside"], h: "To scratch diamond you'd have to break bonds between carbon atoms.", e: "Each carbon atom is bonded to 4 others in every direction, so there are no weak spots between molecules." },
    { k: "formula", p: "A salt crystal has billions of ions. Why is its formula just NaCl?", a: "The formula shows the ratio of ions: 1 Na⁺ for every 1 Cl⁻", w: ["Each crystal has only 2 ions", "Scientists couldn't count them", "NaCl is the name of one molecule of salt"], h: "Count the ions in any piece of the crystal: the two kinds are always equal.", e: "For extended structures, the formula gives the simplest ratio of particles, not the total." },
    { k: "melt", p: "Salt melts at 801 °C, but ice melts at 0 °C. Why the big difference?", a: "Salt's ions are all held strongly in one structure; ice is separate molecules held weakly", w: ["Salt is heavier than ice", "Ice is a metal", "Salt has no atoms"], h: "Think about what has to come apart when each one melts.", e: "Melting salt means pulling apart ions held by strong attractions. Melting ice only loosens weak pulls between molecules." },
    { k: "graphite", p: "Pencil 'lead' (graphite) and diamond are both pure carbon. What makes them different?", a: "Their carbon atoms are arranged differently", w: ["Graphite has lead atoms in it", "Diamond has more protons", "Graphite is a compound"], h: "Same atoms, different pattern.", e: "Diamond is a 3D network; graphite is flat sheets that slide. Same element, different structure, different properties." },
  ]),
);

/** Things to sort: small molecules and giant (extended) structures; elements and compounds. */
const SMALL_MOLECULES = ["💧 Water, H₂O", "🫧 Carbon dioxide, CO₂", "🔥 Methane, CH₄", "🌬️ Oxygen gas, O₂", "🧴 Ammonia, NH₃", "🍬 Sugar, C₁₂H₂₂O₁₁", "🧪 Ethanol, C₂H₅OH", "🎈 Helium, He"];
const GIANT = ["🧂 Salt, NaCl", "💎 Diamond, C", "🔩 Iron, Fe", "🥉 Copper, Cu", "✏️ Graphite, C", "🏖️ Sand, SiO₂", "🪨 Chalk, CaCO₃", "🥄 Silver, Ag"];
const SORT_ELEMENTS = ["O₂", "N₂", "Fe", "Cu", "He", "H₂", "Cl₂", "S₈", "Au", "C (diamond)"];
const SORT_COMPOUNDS = ["H₂O", "CO₂", "NaCl", "CH₄", "NH₃", "C₆H₁₂O₆", "CaCO₃", "HCl", "Fe₂O₃"];
const SORT_MIXTURES = ["🌬️ Air", "🌊 Salt water", "🥗 Salad", "🥤 Soda", "🪨 Granite", "🍜 Soup"];

/** MS-PS1-1 — Do it: sort substances by structure, or into elements, compounds and mixtures. */
export function sortStructures(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const s = sortFrom(["Small molecules", "Giant structures"], [SMALL_MOLECULES, GIANT], rand(5, 6));
    return make(
      {
        key: `mg-${s.key}`,
        prompt: "Sort: small separate molecules, or one giant repeating structure?",
        hint: "Metals, ionic crystals (like salt), diamond and sand are giant structures. Most gases and liquids are small molecules.",
        explain: `Giant structures: ${s.items.filter((i) => i.bin === 1).map((i) => i.label.replace(/^\S+ /, "")).join("; ")}. The rest are small molecules.`,
      },
      act(s.activity, s.items.filter((i) => i.bin === 1).length),
    );
  }
  if (kind === 1) {
    const s = sortFrom(["Element", "Compound"], [SORT_ELEMENTS, SORT_COMPOUNDS], rand(5, 6));
    return make(
      {
        key: `ec-${s.key}`,
        prompt: "Sort each formula: element or compound?",
        hint: "One kind of atom (one capital letter) = element. Two or more kinds joined = compound.",
        explain: `Elements: ${s.items.filter((i) => i.bin === 0).map((i) => i.label).join(", ")}. Compounds: ${s.items.filter((i) => i.bin === 1).map((i) => i.label).join(", ")}.`,
      },
      act(s.activity, s.items.filter((i) => i.bin === 0).length),
    );
  }
  const s = sortFrom(["Element", "Compound", "Mixture"], [SORT_ELEMENTS, SORT_COMPOUNDS, SORT_MIXTURES], 6);
  return make(
    {
      key: `ecm-${s.key}`,
      prompt: "Sort each one: element, compound or mixture?",
      hint: "A mixture has different substances that are not chemically joined, so you could separate them.",
      explain: `Mixtures: ${s.items.filter((i) => i.bin === 2).map((i) => i.label.replace(/^\S+ /, "")).join(", ")}. A formula with one kind of atom is an element; two or more kinds is a compound.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 2).length),
  );
}

/** MS-PS1-1 — count molecules and atoms in particle pictures. */
export const countParticles = mix(
  () => {
    const [f, name] = pick([["H₂O", "water"], ["CO₂", "carbon dioxide"], ["NH₃", "ammonia"], ["CH₄", "methane"], ["O₂", "oxygen"], ["N₂", "nitrogen"]] as [string, string][]);
    const n = rand(3, 8);
    const [s, per] = pick(atomsOf(f));
    return make(
      {
        key: `atoms-${f}-${n}-${s}`,
        prompt: `How many ${elName(s)} atoms are in this box of ${name}?`,
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: f, count: n, name }], arrangement: "gas" }] },
        needsVisual: true,
        hint: `Count the molecules, then multiply by the ${elName(s)} atoms in each one (${per}).`,
        explain: `${n} molecules × ${per} ${elName(s)} atom${per === 1 ? "" : "s"} each = ${n * per}.`,
      },
      keypad(n * per),
    );
  },
  () => {
    const [f, name] = pick([["H₂O", "water"], ["CO₂", "carbon dioxide"], ["NH₃", "ammonia"], ["CH₄", "methane"]] as [string, string][]);
    const n = rand(2, 6);
    const per = totalAtoms(f);
    return make(
      {
        key: `total-${f}-${n}`,
        prompt: `There are ${n} ${name} molecules. How many atoms is that in all?`,
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: f, count: n, name }], arrangement: "gas" }] },
        hint: `Each ${f} molecule has ${per} atoms.`,
        explain: `${n} × ${per} = ${n * per} atoms (${atomList(f, n)}).`,
      },
      keypad(n * per),
    );
  },
  () => {
    const pairs: [string, string][] = [["O₂", "N₂"], ["H₂O", "CO₂"], ["CH₄", "O₂"], ["H₂", "Cl₂"], ["N₂", "H₂O"]];
    const [a, b] = pick(pairs);
    const na = rand(2, 6);
    const nb = rand(2, 6);
    const ask = rand(0, 1);
    return make(
      {
        key: `mixcount-${a}${na}-${b}${nb}-${ask}`,
        prompt: ask ? "How many molecules are in this box?" : "How many different substances are in this box?",
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: a, count: na }, { formula: b, count: nb }] }] },
        needsVisual: true,
        hint: ask ? "Count each joined group of balls as one molecule." : "Each different kind of molecule is a different substance.",
        explain: ask ? `${na} ${a} + ${nb} ${b} = ${na + nb} molecules.` : `Two substances, ${a} and ${b}, mixed together.`,
      },
      ask ? keypad(na + nb) : nums(2, [1, 3, na + nb], 1, 1),
    );
  },
);

/* ========================================================== 2. REACTION DETECTIVES */

/** Everyday changes: [label, chemical?, why]. */
const CHANGES: [string, boolean, string][] = [
  ["🧊 Ice melting", false, "Melted ice is still water, H₂O. Only its state changed."],
  ["✂️ Cutting paper", false, "Smaller pieces are still the same paper."],
  ["🧂 Salt dissolving in water", false, "The salt is still there: let the water evaporate and you get the same salt back."],
  ["♨️ Water boiling", false, "The bubbles are water vapor, still H₂O, just as a gas."],
  ["🍫 Chocolate melting", false, "Melted chocolate is the same substance; it hardens again when it cools."],
  ["🪨 Crushing a rock", false, "The pieces are the same minerals, just smaller."],
  ["🥛 Water vapor fogging a cold glass", false, "Water vapor condenses into liquid water: same substance, new state."],
  ["☕ Sugar dissolving in tea", false, "The sugar molecules spread out in the tea but stay sugar."],
  ["🪵 Sawing wood", false, "Sawdust is still wood."],
  ["🎈 Stretching a balloon", false, "The rubber changes shape but is the same rubber."],
  ["🔥 Wood burning", true, "Burning makes ash, smoke, carbon dioxide and water: new substances."],
  ["🍳 Cooking an egg", true, "The egg's proteins change into a new form. You can't uncook it."],
  ["🔩 Iron rusting", true, "Iron joins with oxygen and water to make rust, a new substance."],
  ["🍞 Toasting bread", true, "The brown crust is new substances made by heating sugars and proteins."],
  ["🍎 A cut apple turning brown", true, "Chemicals in the apple react with oxygen in the air to make brown substances."],
  ["🥛 Milk going sour", true, "Bacteria turn the milk sugar into lactic acid, a new substance."],
  ["🎆 Fireworks exploding", true, "The chemicals burn, giving off light, heat, smoke and new gases."],
  ["🫧 Baking soda and vinegar fizzing", true, "They react to make carbon dioxide gas, water and a new salt."],
  ["🗽 A copper roof turning green", true, "Copper reacts with air and water to make a green coating (patina)."],
  ["🧁 Baking a cake", true, "Heat makes baking powder release gas and changes the egg and sugar into new substances."],
  ["💊 An antacid tablet fizzing in water", true, "The tablet's ingredients react to make carbon dioxide gas."],
  ["🍂 Leaves rotting", true, "Microbes break the leaves down into new substances like carbon dioxide."],
];

/** MS-PS1-2 — physical or chemical change, and why. */
export const changeType = mix(
  () => {
    const [what, chem, why] = pick(CHANGES);
    const name = what.replace(/^\S+ /, "");
    return make(
      {
        key: `type-${name}`,
        prompt: `${what}: physical or chemical change?`,
        speech: `${name}. Is it a physical change or a chemical change?`,
        hint: "Ask: is there a new substance with new properties? If it's the same substance in a new shape or state, it's physical.",
        explain: `${chem ? "Chemical" : "Physical"}. ${why}`,
      },
      label(chem ? "Chemical change" : "Physical change", [chem ? "Physical change" : "Chemical change"]),
    );
  },
  () => {
    const [what, chem, why] = pick(CHANGES);
    const name = what.replace(/^\S+ /, "");
    const wrong = chem
      ? ["It changes shape or size, so it must be chemical", "It changes state, so it must be chemical", "It was mixed with something, so it must be chemical"]
      : ["A new substance forms, so it's physical", "The atoms are rearranged into new molecules", "It can never be changed back"];
    return make(
      {
        key: `why-${name}`,
        prompt: `${what} is a ${chem ? "chemical" : "physical"} change. Why?`,
        speech: `${name} is a ${chem ? "chemical" : "physical"} change. Why?`,
        hint: "A chemical change makes a new substance. A physical change keeps the same substance.",
        explain: why,
      },
      label(why.replace(/\.$/, ""), wrong),
    );
  },
);

/** MS-PS1-2 — Do it: sort changes into physical and chemical. */
export function sortChanges(): Question {
  const s = sortFrom(
    ["Physical change", "Chemical change"],
    [CHANGES.filter((c) => !c[1]).map((c) => c[0]), CHANGES.filter((c) => c[1]).map((c) => c[0])],
    rand(5, 6),
  );
  return make(
    {
      key: s.key,
      prompt: "Sort the changes: physical or chemical?",
      hint: "A chemical change makes a new substance (new colour, gas, smell, solid, or heat and light). Melting, dissolving and cutting don't.",
      explain: `Chemical changes: ${s.items.filter((i) => i.bin === 1).map((i) => i.label.replace(/^\S+ /, "").toLowerCase()).join(", ")}. They make new substances.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 1).length),
  );
}

type Glass = Extract<Visual, { kind: "chem-beaker" }>["panels"][number];

/** Reaction evidence in glassware: [key, what's added, before, after, sign, explain]. */
const SIGNS: [string, string, Glass, Glass, string, string][] = [
  ["soda", "add baking soda", { glass: "beaker", volume: 100, label: "Vinegar" }, { glass: "beaker", volume: 100, bubbles: 10, label: "After" }, "A gas forms (bubbles)", "Baking soda and vinegar react to make carbon dioxide gas."],
  ["mg", "add magnesium", { glass: "testtube", volume: 10, label: "Acid" }, { glass: "testtube", volume: 10, bubbles: 8, label: "After" }, "A gas forms (bubbles)", "Magnesium reacts with acid to make hydrogen gas."],
  ["antacid", "add a tablet", { glass: "beaker", volume: 150, label: "Water" }, { glass: "beaker", volume: 150, bubbles: 12, label: "After" }, "A gas forms (bubbles)", "The tablet's ingredients react in water to make carbon dioxide gas."],
  ["cuoh", "add sodium hydroxide", { glass: "beaker", volume: 100, colour: "wave", label: "Copper sulfate" }, { glass: "beaker", volume: 120, colour: "wave", precipitate: "wave", label: "After" }, "A solid (precipitate) forms", "A blue solid, copper hydroxide, forms from two liquids."],
  ["agcl", "add salt water", { glass: "testtube", volume: 8, label: "Silver nitrate" }, { glass: "testtube", volume: 14, precipitate: true, label: "After" }, "A solid (precipitate) forms", "A white solid, silver chloride, forms when the two clear liquids mix."],
  ["feoh", "add sodium hydroxide", { glass: "beaker", volume: 100, colour: "sun", label: "Iron chloride" }, { glass: "beaker", volume: 120, colour: "sun", precipitate: "tangerine", label: "After" }, "A solid (precipitate) forms", "An orange-brown solid, iron hydroxide, forms."],
  ["starch", "add iodine", { glass: "beaker", volume: 100, label: "Starch water" }, { glass: "beaker", volume: 110, colour: "night", label: "After" }, "The colour changes", "Iodine reacts with starch to make a new blue-black substance."],
  ["cabbage", "add vinegar", { glass: "beaker", volume: 100, colour: "grape", label: "Cabbage juice" }, { glass: "beaker", volume: 120, colour: "rose", label: "After" }, "The colour changes", "The purple dye in red cabbage reacts with acid and turns pink."],
  ["phenol", "add window cleaner", { glass: "flask", volume: 100, label: "Indicator" }, { glass: "flask", volume: 120, colour: "rose", label: "After" }, "The colour changes", "Phenolphthalein turns pink when it reacts with a base like ammonia."],
  ["neut", "add the base", { glass: "beaker", volume: 100, label: "Acid", thermometer: 21 }, { glass: "beaker", volume: 200, label: "After", thermometer: 28 }, "The temperature changes", "With nothing heating it, the mixture warmed by itself: the acid and base reacted and gave off energy."],
  ["coldpack", "add the powder", { glass: "beaker", volume: 100, label: "Water", thermometer: 22 }, { glass: "beaker", volume: 100, label: "After", thermometer: 6 }, "The temperature changes", "The mixture cooled by itself, a sign that energy was taken in by a change."],
  ["salt", "add salt", { glass: "beaker", volume: 100, label: "Water" }, { glass: "beaker", volume: 100, label: "After" }, "No sign of a reaction", "The salt just dissolved: no gas, no solid, no colour or temperature change. The salt is still there."],
  ["sugar", "add sugar", { glass: "beaker", volume: 150, label: "Water", thermometer: 20 }, { glass: "beaker", volume: 150, label: "After", thermometer: 20 }, "No sign of a reaction", "The sugar dissolved and nothing else changed. Dissolving is a physical change."],
];
const SIGN_LABELS = ["A gas forms (bubbles)", "A solid (precipitate) forms", "The colour changes", "The temperature changes", "No sign of a reaction"];

/** MS-PS1-2 — evidence of a chemical reaction in glassware. */
export const reactionSigns = mix(
  () => {
    const [k, add, before, after, sign, why] = pick(SIGNS);
    return make(
      {
        key: `sign-${k}`,
        prompt: "What evidence of a chemical reaction do you see?",
        visual: { kind: "chem-beaker", panels: [before, after], joiner: "→", joinerLabel: add },
        needsVisual: true,
        hint: "Compare the two pictures: look for bubbles, a solid at the bottom, a new colour, or a different thermometer reading.",
        explain: why,
      },
      label(sign, SIGN_LABELS.filter((x) => x !== sign)),
    );
  },
  () => {
    const exo = rand(0, 1) === 1;
    const t1 = rand(18, 24);
    const d = rand(4, 18);
    const t2 = exo ? t1 + d : t1 - d;
    const [what, add] = exo ? pick([["Acid", "add a base"], ["Hydrogen peroxide", "add yeast"], ["Vinegar", "add steel wool"]] as [string, string][]) : pick([["Water", "add ammonium chloride"], ["Vinegar", "add baking soda"], ["Water", "add citric acid and baking soda"]] as [string, string][]);
    return make(
      {
        key: `temp-${t1}-${t2}-${add}`,
        prompt: `By how many °C did the temperature ${exo ? "rise" : "fall"}?`,
        speech: `Read both thermometers. By how many degrees Celsius did the temperature ${exo ? "rise" : "fall"}?`,
        visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 100, label: what, thermometer: t1 }, { glass: "beaker", volume: 120, label: "After", thermometer: t2 }], joiner: "→", joinerLabel: add },
        needsVisual: true,
        unit: "°C",
        hint: "Subtract the smaller reading from the bigger one.",
        explain: `${t1} °C to ${t2} °C is a change of ${d} °C. Warming or cooling by itself is evidence of a reaction.`,
      },
      keypad(d),
    );
  },
  bank("sign", [
    { k: "boil", p: "Water boils on a stove and makes bubbles. Is that evidence of a chemical reaction?", a: "No: the bubbles are water vapor, still water", w: ["Yes: bubbles always mean a new gas", "Yes: the water got hotter", "No: bubbles only form in cold water"], h: "Is a new substance made, or the same one in a new state?", e: "Boiling is a physical change. Bubbles are evidence of a reaction only when a new gas forms, with no heating to boil the liquid." },
    { k: "dye", p: "A drop of blue food colouring turns a glass of water blue. Is that a chemical reaction?", a: "No: the dye just spread through the water", w: ["Yes: the colour changed", "Yes: a new liquid formed", "No: water can't change colour"], h: "Did a new substance form, or did two substances just mix?", e: "Mixing a dye in is physical. A colour change is evidence of a reaction when a new substance with a new colour forms." },
    { k: "best", p: "Which is the strongest evidence of a chemical reaction?", a: "Two clear liquids mix and a solid forms", w: ["A solid is ground into powder", "Ice melts in a warm room", "Sugar disappears in water"], h: "Which one makes a substance that wasn't there before?", e: "A precipitate is a brand-new solid with new properties. The others are physical changes." },
  ]),
);

/** Substances with properties: [name, density g/cm³, melting °C, boiling °C]. */
const PROPS: [string, number, number, number][] = [
  ["water", 1.0, 0, 100],
  ["ethanol", 0.79, -114, 78],
  ["aluminum", 2.7, 660, 2470],
  ["iron", 7.87, 1538, 2862],
  ["copper", 8.96, 1085, 2562],
  ["gold", 19.32, 1064, 2856],
  ["lead", 11.34, 327, 1749],
  ["tin", 7.29, 232, 2602],
  ["table salt", 2.16, 801, 1465],
  ["mercury", 13.53, -39, 357],
];

/** MS-PS1-2 — characteristic properties identify a substance; mass and volume don't. */
export const identifyProperties = mix(
  () => {
    const [x, y] = shuffle(PROPS.filter((p) => p[2] > 0)).slice(0, 2);
    const order = shuffle([x, x, y]);
    const names = ["A", "B", "C"];
    const same = order.map((p, i) => (p === x ? names[i] : "")).filter(Boolean);
    const masses = order.map(() => rand(2, 40) * 5);
    if (masses[0] === masses[1] || masses[1] === masses[2] || masses[0] === masses[2]) masses[2] += 5;
    const pairs = ["A and B", "A and C", "B and C"];
    const right = same.join(" and ");
    return make(
      {
        key: `same-${order.map((p) => p[0]).join("-")}-${masses.join("-")}`,
        prompt: "Two of these samples are the same substance. Which two?",
        visual: { kind: "table", header: ["Sample", "Mass (g)", "Density (g/cm³)", "Melts at (°C)"], rows: order.map((p, i) => [names[i], masses[i], p[1], p[2]]) },
        needsVisual: true,
        hint: "Mass depends on how much you have. Density and melting point belong to the substance itself.",
        explain: `Samples ${right} have the same density (${x[1]} g/cm³) and melting point (${x[2]} °C), so they're both ${x[0]}, even though their masses differ.`,
      },
      label(right, pairs.filter((p) => p !== right)),
    );
  },
  () => {
    const four = shuffle(PROPS).slice(0, 4);
    const t = pick(four);
    const ask = rand(0, 1);
    return make(
      {
        key: `which-${ask}-${t[0]}-${four.map((p) => p[0]).join("")}`,
        prompt: ask ? `A pure sample boils at ${ns(t[3])} °C. Which substance could it be?` : `A pure sample melts at ${ns(t[2])} °C. Which substance could it be?`,
        visual: { kind: "table", header: ["Substance", "Melts at (°C)", "Boils at (°C)"], rows: four.map((p) => [p[0], ns(p[2]), ns(p[3])]) },
        needsVisual: true,
        hint: "Find the row with that exact temperature. Each pure substance has its own melting and boiling points.",
        explain: `${t[0][0].toUpperCase()}${t[0].slice(1)} ${ask ? "boils" : "melts"} at ${ns(ask ? t[3] : t[2])} °C.`,
      },
      label(t[0], four.filter((p) => p !== t).map((p) => p[0])),
    );
  },
  bank("prop", [
    { k: "mass", p: "Which property can't tell you what a substance is?", a: "Its mass", w: ["Its density", "Its melting point", "Its boiling point"], h: "Which one changes if you just take more or less of it?", e: "Any amount of a substance can have any mass. Density, melting point and boiling point stay the same for a pure substance." },
    { k: "vol", p: "Which property can't tell you what a substance is?", a: "Its volume", w: ["Its smell", "Its solubility in water", "Its density"], h: "Which one depends on the size of the sample?", e: "Volume depends on how much you have. Smell, solubility and density are characteristic properties." },
    { k: "half", p: "You cut a gold bar in half. What happens to the density of each half?", a: "It stays the same", w: ["It halves", "It doubles", "It becomes zero"], h: "Density = mass ÷ volume. Both halve.", e: "Half the mass in half the volume gives the same density: 19.32 g/cm³ for gold." },
    { k: "char", p: "What is a 'characteristic property'?", a: "A property that is the same for any amount of the substance", w: ["A property that changes with the sample's size", "The colour of the container", "How much the sample costs"], h: "It helps you identify a substance, whatever its size.", e: "Density, melting point, boiling point, solubility and smell are characteristic: they can identify a substance." },
    { k: "same", p: "Two clear liquids both boil at 100 °C and have a density of 1.00 g/cm³. They are probably…", a: "Both water", w: ["Different substances", "Both ethanol", "Impossible to tell apart, ever"], h: "Match the properties to a substance you know.", e: "Same boiling point and density point to the same substance: water." },
  ]),
);

/** Metals for density: [name, density g/cm³ × 100]. */
const METALS: [string, number][] = [["aluminum", 270], ["zinc", 714], ["tin", 729], ["iron", 787], ["copper", 896], ["silver", 1049], ["lead", 1134], ["gold", 1932]];

/** MS-PS1-2 — density = mass ÷ volume, and identifying metals by density. */
export const densityDetective = mix(
  () => {
    const [name, d100] = pick(METALS);
    const V = pick([2, 4, 5, 10, 20, 25]);
    const m = (d100 * V) / 100;
    return make(
      {
        key: `calc-${name}-${V}`,
        prompt: `A block of ${name} has a mass of ${m} g and a volume of ${V} cm³. What is its density?`,
        unit: "g/cm³",
        hint: "Density = mass ÷ volume.",
        explain: `${m} g ÷ ${V} cm³ = ${d100 / 100} g/cm³.`,
      },
      keypad(d100 / 100),
    );
  },
  () => {
    const four = shuffle(METALS).slice(0, 4);
    const [name, d100] = pick(four);
    const V = pick([5, 10, 20]);
    const m = (d100 * V) / 100;
    return make(
      {
        key: `id-${name}-${V}-${four.map((x) => x[0][0]).join("")}`,
        prompt: `A metal cube has a mass of ${m} g and a volume of ${V} cm³. Which metal is it?`,
        visual: { kind: "table", header: ["Metal", "Density (g/cm³)"], rows: four.map(([n, d]) => [n, d / 100]) },
        hint: "Work out mass ÷ volume, then find that density in the table.",
        explain: `${m} ÷ ${V} = ${d100 / 100} g/cm³, which matches ${name}.`,
      },
      label(name, four.filter((x) => x[0] !== name).map((x) => x[0])),
    );
  },
  () => {
    const [name, d100] = pick(METALS.slice(0, 6));
    const V = pick([2, 3, 4, 5, 6, 10]);
    const m = (d100 * V) / 100;
    return make(
      {
        key: `vol-${name}-${V}`,
        prompt: `A piece of ${name} (density ${d100 / 100} g/cm³) has a mass of ${m} g. What is its volume?`,
        unit: "cm³",
        hint: "Volume = mass ÷ density.",
        explain: `${m} g ÷ ${d100 / 100} g/cm³ = ${V} cm³.`,
      },
      keypad(V),
    );
  },
  bank("dens", [
    { k: "float", p: "Wood has a density of about 0.6 g/cm³. Water's is 1.0 g/cm³. What happens to wood in water?", a: "It floats", w: ["It sinks", "It dissolves", "It sinks halfway then stops"], h: "Things less dense than water float.", e: "0.6 is less than 1.0, so wood floats." },
    { k: "crown", p: "A 'gold' ring has a density of 10.5 g/cm³. Gold's density is 19.3 g/cm³. What can you say?", a: "It isn't pure gold", w: ["It's pure gold", "It's a bigger ring", "Density can't tell you"], h: "Every pure substance has its own density.", e: "Pure gold would be 19.3 g/cm³. 10.5 g/cm³ is close to silver's density: it's not pure gold." },
  ]),
);

/** MS-PS1-2 — Do it: measure an object's volume by how much water it pushes up. */
export function displacement(): Question {
  const start = pick([15, 20, 22, 25, 30]);
  const useMass = rand(0, 1) === 1;
  let vol: number;
  let thing: string;
  let how: string;
  if (useMass) {
    const [name, d100] = pick(METALS.slice(0, 6));
    vol = pick([5, 10, 15, 20].filter((v) => start + v <= 50));
    const m = (d100 * vol) / 100;
    thing = `a ${m} g piece of ${name} (density ${d100 / 100} g/cm³)`;
    how = `Its volume is ${m} ÷ ${d100 / 100} = ${vol} cm³, which is ${vol} mL. `;
  } else {
    vol = rand(4, 18);
    if (start + vol > 50) vol = 50 - start;
    thing = `a stone with a volume of ${vol} cm³`;
    how = `1 cm³ = 1 mL, so the stone pushes the water up ${vol} mL. `;
  }
  const target = start + vol;
  return make(
    {
      key: `disp-${start}-${thing}`,
      prompt: `The cylinder holds ${start} mL of water. You lower in ${thing}. Drag the water to its new level.`,
      hint: "An object pushes up as much water as its own volume. 1 cm³ = 1 mL.",
      explain: `${how}${start} + ${vol} = ${target} mL.`,
    },
    act({ kind: "chem-measure", mode: "fill", glass: "cylinder", target, max: 50, step: 1, colour: "clear" }, target),
  );
}

/** Before-and-after property tables: [key, title, rows, reacted?, why]. */
const BEFORE_AFTER: [string, string, [string, string, string][], boolean, string][] = [
  ["fes", "Iron and sulfur heated together", [["Colour", "grey and yellow", "black"], ["Magnetic?", "the iron is", "no"], ["Form", "two powders", "one solid"]], true, "The black solid isn't magnetic and is all one substance: iron sulfide formed."],
  ["salt", "Salt water left until the water evaporates", [["Colour", "white crystals", "white crystals"], ["Melts at", "801 °C", "801 °C"], ["Taste", "salty", "salty"]], false, "The crystals have the same melting point and properties: it's still salt."],
  ["wax", "Candle wax melted and cooled", [["Colour", "white", "white"], ["Melts at", "about 60 °C", "about 60 °C"], ["Shape", "a candle", "a puddle"]], false, "Only the shape changed. Same melting point, same substance."],
  ["sugar", "Sugar heated strongly", [["Colour", "white", "black"], ["Dissolves in water?", "yes", "no"], ["Smell", "none", "burnt"]], true, "Black, insoluble, burnt-smelling stuff is a new substance (mostly carbon)."],
  ["soda", "Baking soda added to vinegar", [["Gas?", "none", "lots of bubbles"], ["Smell", "sharp vinegar", "much weaker"], ["Solid", "white powder", "gone"]], true, "A gas formed and the vinegar smell faded: new substances were made."],
  ["copper", "Copper wire heated in air", [["Colour", "shiny orange-brown", "dull black"], ["Conducts electricity?", "very well", "the black coating doesn't"], ["Mass", "5.0 g", "5.6 g"]], true, "A black coating with new properties formed: copper oxide (oxygen joined the copper)."],
  ["ice", "Ice left to melt", [["Melts at", "0 °C", "0 °C"], ["Boils at", "100 °C", "100 °C"], ["State", "solid", "liquid"]], false, "The melting and boiling points match: it's still water, just liquid."],
  ["egg", "An egg is cooked", [["Look", "clear and runny", "white and firm"], ["Changes back when cooled?", "—", "no"], ["Texture", "liquid", "rubbery solid"]], true, "The egg white's proteins changed into a new form that can't go back."],
  ["silver", "A silver spoon left near eggs", [["Colour", "shiny silver", "black coating"], ["Shine", "bright", "dull"], ["The coating dissolves in water?", "—", "no"]], true, "The black tarnish is silver sulfide, a new substance."],
  ["chalk", "A stick of chalk crushed to powder", [["Density", "2.7 g/cm³", "2.7 g/cm³"], ["Fizzes in vinegar?", "yes", "yes"], ["Shape", "stick", "powder"]], false, "Same density and same reactions: it's still chalk, in smaller pieces."],
  ["mg", "Magnesium ribbon burned", [["Look", "shiny silver ribbon", "white powder"], ["Conducts electricity?", "yes", "no"], ["Bends?", "yes", "crumbles"]], true, "The white powder doesn't conduct: it's magnesium oxide, a new substance."],
  ["sugar2", "Sugar dissolved, then the water evaporated", [["Colour", "white", "white"], ["Taste", "sweet", "sweet"], ["Melts at", "186 °C", "186 °C"]], false, "Same properties before and after: still sugar."],
];

/** MS-PS1-2 — compare properties before and after to decide whether a reaction happened. */
export const beforeAfter = mix(
  () => {
    const [k, title, rows, reacted, why] = pick(BEFORE_AFTER);
    const yes = "Yes: the properties changed, so a new substance formed";
    const no = "No: the properties match, so it's the same substance";
    return make(
      {
        key: `ba-${k}`,
        prompt: `${title}. Did a chemical reaction happen?`,
        visual: { kind: "table", header: ["Property", "Before", "After"], rows },
        needsVisual: true,
        hint: "Look at characteristic properties (melting point, colour, solubility, smell, magnetism). Shape and state alone don't count.",
        explain: why,
      },
      label(reacted ? yes : no, [reacted ? no : yes, "Yes: its shape or state changed", "No: nothing was added to it"]),
    );
  },
  bank("ba", [
    { k: "evap", p: "Mia dissolves salt in water, then boils the water away. White crystals that melt at 801 °C are left. What does that show?", a: "The salt didn't react; it's still salt", w: ["A new substance formed", "The salt turned into water", "Salt is destroyed by boiling"], h: "Compare the crystals' melting point with salt's: 801 °C.", e: "The same melting point means the same substance. Dissolving was a physical change." },
    { k: "mass", p: "A sample's mass changes from 20 g to 10 g after you cut it. Is that evidence of a new substance?", a: "No: mass depends only on how much you have", w: ["Yes: mass changed", "Yes: it lost atoms", "Only if it's a metal"], h: "Is mass a characteristic property?", e: "Cutting changes the amount, not the substance. Look at properties like density or melting point instead." },
  ]),
);

/** Particle pictures of changes: [key, before, after, chemical?, name]. */
type Species = { formula: string; count: number; name?: string };
function particleScenes(): [string, Species[], Species[], boolean, string, string?, ("solid" | "liquid" | "gas")?, ("solid" | "liquid" | "gas")?][] {
  return [
    ["h2o", [{ formula: "H₂", count: 4 }, { formula: "O₂", count: 2 }], [{ formula: "H₂O", count: 4 }], true, "hydrogen and oxygen make water"],
    ["nh3", [{ formula: "N₂", count: 2 }, { formula: "H₂", count: 6 }], [{ formula: "NH₃", count: 4 }], true, "nitrogen and hydrogen make ammonia"],
    ["hcl", [{ formula: "H₂", count: 3 }, { formula: "Cl₂", count: 3 }], [{ formula: "HCl", count: 6 }], true, "hydrogen and chlorine make hydrogen chloride"],
    ["ch4", [{ formula: "CH₄", count: 2 }, { formula: "O₂", count: 4 }], [{ formula: "CO₂", count: 2 }, { formula: "H₂O", count: 4 }], true, "methane burns to make carbon dioxide and water"],
    ["co2", [{ formula: "C", count: 4, name: "carbon" }, { formula: "O₂", count: 4 }], [{ formula: "CO₂", count: 4 }], true, "carbon burns to make carbon dioxide"],
    ["co", [{ formula: "CO", count: 4 }, { formula: "O₂", count: 2 }], [{ formula: "CO₂", count: 4 }], true, "carbon monoxide burns to make carbon dioxide"],
    ["boil", [{ formula: "H₂O", count: 9 }], [{ formula: "H₂O", count: 9 }], false, "liquid water boils", "heat", "liquid", "gas"],
    ["freeze", [{ formula: "H₂O", count: 12 }], [{ formula: "H₂O", count: 12 }], false, "water freezes", "cool", "liquid", "solid"],
    ["dryice", [{ formula: "CO₂", count: 9 }], [{ formula: "CO₂", count: 9 }], false, "dry ice turns straight into gas", "warm", "solid", "gas"],
    ["n2", [{ formula: "N₂", count: 10 }], [{ formula: "N₂", count: 10 }], false, "nitrogen gas condenses to a liquid", "cool", "gas", "liquid"],
  ];
}

/** MS-PS1-2 — particle models: new molecules mean a chemical change. */
export const particleChange = mix(
  () => {
    const [k, before, after, chem, name, joinerLabel, a1, a2] = pick(particleScenes());
    return make(
      {
        key: `pc-${k}`,
        prompt: "Is this a physical or a chemical change?",
        visual: { kind: "chem-particles", panels: [{ species: before, arrangement: a1, label: "Before" }, { species: after, arrangement: a2, label: "After" }], ...(joinerLabel ? { joinerLabel } : {}) },
        needsVisual: true,
        hint: "Compare the molecules. Are there new kinds of molecule after, or the same molecules arranged differently?",
        explain: chem ? `New molecules appear: ${name}. The atoms were rearranged into new substances, so it's chemical.` : `The molecules are the same before and after (${before[0].formula}); only how they're spaced changed: ${name}. That's physical.`,
      },
      label(chem ? "Chemical change" : "Physical change", [chem ? "Physical change" : "Chemical change"]),
    );
  },
  () => {
    const [k, before, after, chem, name, joinerLabel, a1, a2] = pick(particleScenes());
    const right = chem ? "The atoms were rearranged into new molecules" : "The same molecules just moved closer together or farther apart";
    return make(
      {
        key: `atoms-${k}`,
        prompt: "What happened to the particles?",
        visual: { kind: "chem-particles", panels: [{ species: before, arrangement: a1, label: "Before" }, { species: after, arrangement: a2, label: "After" }], ...(joinerLabel ? { joinerLabel } : {}) },
        needsVisual: true,
        hint: "Count the atoms of each colour before and after. Then look at how they're joined.",
        explain: chem ? `${name[0].toUpperCase()}${name.slice(1)}: the same atoms are joined in new ways. No atoms were made or lost.` : `${name[0].toUpperCase()}${name.slice(1)}: each molecule is unchanged; only the spacing and motion changed.`,
      },
      label(right, [chem ? "The same molecules just moved closer together or farther apart" : "The atoms were rearranged into new molecules", "Some atoms were destroyed", "New atoms were created"]),
    );
  },
);

/** MS-PS1-2 — Do it: is it evidence of a new substance? */
export function sortEvidence(): Question {
  const yes = [
    "🫧 Bubbles of gas form when two cold liquids mix",
    "⬜ A solid forms when two clear liquids mix",
    "👃 A new smell appears after mixing",
    "🌡️ A mixture warms up by itself",
    "🔥 It gives off light and heat as it burns",
    "🎨 A blue liquid turns colourless after adding a metal",
    "🧱 The product won't dissolve, but the starting solid did",
  ];
  const no = [
    "🧊 Ice melts into water",
    "✂️ Paper is cut into pieces",
    "🧂 Salt dissolves in water",
    "♨️ Water boils and bubbles on a stove",
    "🍳 A pan gets hot on the stove",
    "📐 A metal bar is bent",
    "💧 Food colouring spreads through water",
  ];
  const s = sortFrom(["New substance", "No new substance"], [yes, no], rand(5, 6));
  return make(
    {
      key: s.key,
      prompt: "Sort: is it evidence that a new substance formed?",
      hint: "Changes in shape, state or dissolving keep the same substance. A new gas, solid, colour, smell, or warming by itself point to a reaction.",
      explain: `Evidence of a new substance: ${s.items.filter((i) => i.bin === 0).map((i) => i.label.replace(/^\S+ /, "").toLowerCase()).join("; ")}.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 0).length),
  );
}

/** Everyday word equations: [key, reactants, products, where]. */
const WORD_EQS: [string, string[], string[], string][] = [
  ["rust", ["iron", "oxygen"], ["iron oxide (rust)"], "Iron rusting"],
  ["soda", ["baking soda", "vinegar"], ["carbon dioxide", "water", "sodium acetate"], "Baking soda and vinegar"],
  ["stove", ["methane", "oxygen"], ["carbon dioxide", "water"], "A gas stove burning"],
  ["resp", ["glucose", "oxygen"], ["carbon dioxide", "water"], "Your cells releasing energy (respiration)"],
  ["photo", ["carbon dioxide", "water"], ["glucose", "oxygen"], "A leaf making sugar with light (photosynthesis)"],
  ["mg", ["magnesium", "oxygen"], ["magnesium oxide"], "Magnesium burning"],
  ["rocket", ["hydrogen", "oxygen"], ["water"], "A hydrogen rocket engine"],
  ["copper", ["copper", "oxygen"], ["copper oxide"], "Copper heated in air"],
  ["tarnish", ["silver", "sulfur"], ["silver sulfide"], "Silver tarnishing"],
  ["peroxide", ["hydrogen peroxide"], ["water", "oxygen"], "Hydrogen peroxide fizzing on a cut"],
  ["candle", ["wax", "oxygen"], ["carbon dioxide", "water"], "A candle burning"],
];
const WORD_POOL = ["oxygen", "carbon dioxide", "water", "hydrogen", "nitrogen", "glucose", "iron oxide (rust)", "magnesium oxide", "salt", "helium"];

/** MS-PS1-2 — everyday reactions as word equations. */
export const everydayReactions = mix(() => {
  const [k, reac, prod, where] = pick(WORD_EQS);
  const all = [...reac, ...prod];
  const i = rand(0, all.length - 1);
  const missing = all[i];
  const isProduct = i >= reac.length;
  const terms = all.map((t, j) => ({ text: j === i ? "?" : t }));
  return make(
    {
      key: `word-${k}-${i}`,
      prompt: `${where}. Which ${isProduct ? "product" : "reactant"} is missing?`,
      visual: { kind: "chem-reaction", words: true, reactants: terms.slice(0, reac.length), products: terms.slice(reac.length) },
      needsVisual: true,
      hint: isProduct ? "Products are the new substances made, after the arrow. Think about what you'd see or test for." : "Reactants are the starting substances, before the arrow. Many everyday reactions use oxygen from the air.",
      explain: `${reac.join(" + ")} → ${prod.join(" + ")}.`,
    },
    label(missing, WORD_POOL.filter((w) => !all.includes(w))),
  );
}, bank("word", [
  { k: "react", p: "In 'iron + oxygen → rust', which are the reactants?", a: "Iron and oxygen", w: ["Rust", "Rust and oxygen", "Only iron"], h: "Reactants come before the arrow.", e: "Reactants (iron, oxygen) are used up; the product (rust) is made." },
  { k: "arrow", p: "What does the arrow (→) in a chemical equation mean?", a: "'react to make'", w: ["'is the same as'", "'plus'", "'is heavier than'"], h: "Read 'hydrogen + oxygen → water' out loud.", e: "Reactants on the left react to make products on the right." },
  { k: "test", p: "A gas from a reaction relights a glowing splint. Which gas is it?", a: "Oxygen", w: ["Carbon dioxide", "Hydrogen", "Water vapor"], h: "This gas helps things burn.", e: "Oxygen makes a glowing splint burst into flame. (CO₂ puts flames out; hydrogen burns with a squeaky pop.)" },
]));

/** MS-PS1-2 — claims, evidence and reasoning: spot the mistake. */
export const reactionClaims = bank("claim", [
  { k: "boil", p: "Leo says: 'Boiling water is a chemical reaction because bubbles form.' What's wrong?", a: "The bubbles are water vapor, still water: it's physical", w: ["Nothing: bubbles always mean a reaction", "Boiling makes hydrogen gas", "Water can't make bubbles"], h: "What are the bubbles made of?", e: "Boiling changes water's state, not the substance. Bubbles only show a reaction when a new gas forms." },
  { k: "dissolve", p: "Ava says: 'Sugar disappears in water, so it reacted and was destroyed.' What's the best reply?", a: "The sugar is still there; taste it, or evaporate the water to get it back", w: ["She's right: the sugar is gone", "The sugar turned into water", "Sugar reacts with water to make salt"], h: "How could you show the sugar is still in the water?", e: "Dissolving is physical: sugar molecules spread out among water molecules, unchanged." },
  { k: "melt", p: "Sam says: 'When butter melts, a new substance forms because it looks different.' Is he right?", a: "No: it's the same substance in a new state", w: ["Yes: it looks different", "Yes: liquids are always new substances", "No: butter can't melt"], h: "Does it change back when it cools?", e: "A change of state is physical. Butter hardens again in the fridge." },
  { k: "temp", p: "Zoe heats water on a stove and its temperature rises. She says it's a reaction. What's wrong?", a: "The stove heated it; a temperature change is evidence only if it happens by itself", w: ["Nothing: any warming is a reaction", "Water can't get hotter", "It's a reaction because steam forms"], h: "Where did the energy come from?", e: "Warming or cooling counts as evidence when the substances do it themselves, not when you heat them." },
  { k: "colour", p: "Kai mixes blue and yellow paint and gets green. He says it's a chemical reaction. What's the better explanation?", a: "The two paints just mixed; no new substance formed", w: ["A new green chemical formed", "The yellow paint was destroyed", "Any colour change is a reaction"], h: "Under a microscope, could you still see both colours of particles?", e: "Mixing paints is physical. A colour change is good evidence only when a new substance forms." },
  { k: "rust", p: "Ben says rusting isn't a reaction because it happens slowly. Is he right?", a: "No: rust is a new substance, even though it forms slowly", w: ["Yes: reactions must be fast", "Yes: rust is just dirty iron", "No: rusting is fast"], h: "Compare rust's properties with iron's.", e: "Rust is flaky, red-brown and not magnetic like iron. New properties mean a new substance, whatever the speed." },
  { k: "fizz", p: "Mia sees fizzing when she drops a tablet in water. What's the best way to check if a new gas formed?", a: "Test the gas, for example with a burning splint", w: ["Smell the water", "Weigh the empty glass", "Stir it faster"], h: "Different gases do different things to a flame.", e: "Testing the gas gives evidence it's a new substance (CO₂ puts out a flame; O₂ relights a glowing splint)." },
  { k: "precip", p: "Two clear liquids are mixed and the mixture turns cloudy white. Ana says it's a reaction. Which evidence supports her best?", a: "A solid that wasn't there before formed", w: ["The liquids were cold", "The glass is clear", "There are two liquids"], h: "What makes it cloudy?", e: "A precipitate, a new insoluble solid, is strong evidence of a chemical reaction." },
  { k: "glow", p: "A light bulb gives off light and heat. Is it a chemical reaction?", a: "No: electricity heats the filament, but no new substance forms", w: ["Yes: light and heat always mean a reaction", "Yes: the bulb burns", "No: bulbs give off no heat"], h: "Is the filament the same metal after you switch it off?", e: "Light and heat point to a reaction only when a new substance is made, like burning wood." },
  { k: "smell", p: "Noor notices milk smells sour after a week. What is the best conclusion?", a: "A new substance (lactic acid) formed: a chemical change", w: ["The milk evaporated", "The milk froze", "The smell came from the fridge only"], h: "Does fresh milk have that smell?", e: "A new smell is evidence of a new substance. Bacteria made lactic acid from the milk sugar." },
  { k: "two", p: "Raj says: 'The mixture warmed up AND bubbled, so I'm more sure it reacted.' Is that good reasoning?", a: "Yes: more pieces of evidence make a stronger claim", w: ["No: one sign is always enough", "No: two signs cancel out", "Yes: but only if it's blue"], h: "Scientists like several kinds of evidence.", e: "Several signs together (gas plus temperature change) make a stronger case than one alone." },
  { k: "boil2", p: "Which pair of observations best shows a NEW substance formed?", a: "It now has a different boiling point and density", w: ["It's now in a bigger container", "It now has less mass", "It's now a different shape"], h: "Which are characteristic properties?", e: "Different characteristic properties (boiling point, density) mean a different substance." },
]);

/* ============================================================ 3. MADE BY CHEMISTS */

/** Materials: [label, synthetic?, source/why]. */
const MATERIALS: [string, boolean, string][] = [
  ["🧶 Wool", false, "Wool is sheep's hair, used as it grows (just cleaned and spun)."],
  ["👕 Cotton", false, "Cotton is fibre from the cotton plant's seed pods."],
  ["🧣 Silk", false, "Silk is spun by silkworms."],
  ["🪵 Wood", false, "Wood comes straight from trees."],
  ["🪨 Granite", false, "Granite is rock dug from the ground."],
  ["🐝 Beeswax", false, "Beeswax is made by bees."],
  ["🌿 Bamboo", false, "Bamboo is a fast-growing grass, cut and used."],
  ["👞 Leather", false, "Leather is treated animal skin."],
  ["🪢 Nylon rope", true, "Nylon is made in factories by joining chemicals from crude oil into long chains."],
  ["👚 Polyester shirt", true, "Polyester is made from chemicals refined from crude oil."],
  ["🧴 Plastic bottle (PET)", true, "PET plastic is made from chemicals from oil and natural gas."],
  ["🥡 Polystyrene foam", true, "Polystyrene is a plastic made from oil chemicals."],
  ["🦺 Kevlar vest", true, "Kevlar is a super-strong fibre invented by chemist Stephanie Kwolek in 1965."],
  ["🍳 Nonstick coating (Teflon)", true, "Teflon was made by chemists from fluorine and carbon compounds."],
  ["💊 Aspirin tablet", true, "Aspirin is made in factories, based on a chemical first found in willow bark."],
  ["🚰 PVC pipe", true, "PVC is a plastic made from chlorine (from salt) and ethene (from oil or gas)."],
  ["🛞 Synthetic rubber tire", true, "Synthetic rubber is made from oil chemicals, not tree sap."],
  ["🩱 Spandex (Lycra)", true, "Spandex is a stretchy synthetic fibre made from oil chemicals."],
];

/** MS-PS1-3 — natural or synthetic, and what "synthetic" means. */
export const naturalSynthetic = mix(
  () => {
    const [what, syn, why] = pick(MATERIALS);
    const name = what.replace(/^\S+ /, "");
    return make(
      {
        key: `ns-${name}`,
        prompt: `${what}: natural or synthetic?`,
        speech: `${name}. Is it natural or synthetic?`,
        hint: "Synthetic materials are made by chemical reactions in factories or labs. Natural ones are used much as they're found.",
        explain: `${syn ? "Synthetic" : "Natural"}. ${why}`,
      },
      label(syn ? "Synthetic" : "Natural", [syn ? "Natural" : "Synthetic"]),
    );
  },
  bank("ns", [
    { k: "def", p: "What does 'synthetic' mean?", a: "Made by people using chemical reactions", w: ["Found in nature unchanged", "Made only from plants", "Any material that is soft"], h: "Synthetic materials don't exist in nature until chemists make them.", e: "Synthetic materials are new substances made by chemical reactions from natural resources." },
    { k: "from", p: "Synthetic materials are made from…", a: "Natural resources like oil, gas, air, salt and plants", w: ["Nothing: chemists create new atoms", "Only recycled plastic", "Moon rocks"], h: "Atoms can't be created, so they have to come from somewhere.", e: "Chemists rearrange atoms from natural resources into new substances." },
    { k: "rubber", p: "Rubber can be natural or synthetic. Where does natural rubber come from?", a: "Sap (latex) from rubber trees", w: ["Crude oil", "Sand", "Sheep"], h: "It drips from cuts in a tree's bark.", e: "Natural rubber is latex from rubber trees. Synthetic rubber is made from oil chemicals." },
    { k: "why", p: "Why did chemists invent nylon in the 1930s?", a: "To make a cheap, strong fibre like silk", w: ["Because silk was too strong", "To replace wood", "Because oil was running out"], h: "Nylon stockings replaced silk ones.", e: "Silk was expensive and scarce. Nylon gave a strong, smooth fibre that could be made in factories." },
  ]),
);

/** MS-PS1-3 — Do it: sort materials into natural and synthetic. */
export function sortMaterials(): Question {
  const s = sortFrom(["Natural", "Synthetic"], [MATERIALS.filter((m) => !m[1]).map((m) => m[0]), MATERIALS.filter((m) => m[1]).map((m) => m[0])], rand(5, 6));
  return make(
    {
      key: s.key,
      prompt: "Sort the materials: natural or synthetic?",
      hint: "Plastics, nylon, polyester and medicines like aspirin are made by chemists. Wool, cotton, wood and stone come from nature.",
      explain: `Synthetic: ${s.items.filter((i) => i.bin === 1).map((i) => i.label.replace(/^\S+ /, "")).join(", ")}. The rest are natural.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 1).length),
  );
}

/** Products and the natural resources they're made from: [product, resource, note]. */
const SOURCES: [string, string, string][] = [
  ["a plastic water bottle", "Crude oil or natural gas", "Chemicals from oil and gas are joined into PET plastic."],
  ["a nylon rope", "Crude oil", "Nylon is made from chemicals refined from oil."],
  ["a polyester fleece", "Crude oil", "Polyester is made from oil chemicals (or recycled bottles, which came from oil)."],
  ["window glass", "Sand", "Glass is made by melting sand with soda ash and limestone."],
  ["gasoline", "Crude oil", "Gasoline is one of the parts separated from crude oil."],
  ["ammonia fertilizer", "Air and natural gas", "Nitrogen from the air reacts with hydrogen from natural gas to make ammonia."],
  ["steel", "Iron ore", "Iron ore is heated with coke to get iron, which is turned into steel."],
  ["aluminum foil", "Bauxite ore", "Aluminum is pulled out of bauxite ore using electricity."],
  ["cement", "Limestone and clay", "Limestone and clay are heated in a kiln to make cement."],
  ["soap", "Fats or plant oils", "Fats react with a strong base (lye) to make soap."],
  ["ethanol fuel", "Corn or sugarcane", "Yeast ferments the sugar in corn or sugarcane into ethanol."],
  ["computer chips", "Sand", "Silicon for chips comes from the silica in sand."],
  ["penicillin", "Mold", "Penicillin was discovered in a mold and is grown from mold cultures."],
  ["rayon fabric", "Wood pulp", "Rayon is made by chemically treating cellulose from wood."],
  ["paper", "Wood", "Paper is made from wood fibres."],
];
const RESOURCES = [...new Set(SOURCES.map((s) => s[1]))];

/** MS-PS1-3 — which natural resource each product comes from. */
export const resources = mix(
  () => {
    const [product, res, note] = pick(SOURCES);
    return make(
      {
        key: `src-${product}`,
        prompt: `Which natural resource is ${product} made from?`,
        hint: "Most plastics, fabrics like nylon and polyester, and fuels come from crude oil. Glass and silicon come from sand.",
        explain: note,
      },
      label(res, RESOURCES.filter((r) => r !== res && !(res.includes("Crude oil") && r.includes("Crude oil")))),
    );
  },
  bank("res", [
    { k: "oil", p: "Which natural resource is used to make the most synthetic materials?", a: "Crude oil", w: ["Sand", "Wool", "Granite"], h: "Plastics, nylon, polyester, synthetic rubber…", e: "Crude oil is a mixture of many hydrocarbons that chemists turn into fuels, plastics, fabrics and medicines." },
    { k: "renew", p: "Why do people worry about making plastics from crude oil?", a: "Crude oil is nonrenewable: it took millions of years to form", w: ["Crude oil grows back every year", "Oil makes plastic too strong", "Oil is found only in oceans"], h: "Can we make more crude oil quickly?", e: "Oil formed from ancient living things over millions of years. Once used, it's gone, so chemists also look for plant-based and recycled sources." },
  ]),
);

/** MS-PS1-3 — polymers: long chains of repeating small molecules. */
export const polymers = mix(
  () => {
    const n = pick([100, 200, 250, 500, 1000, 2000, 5000]);
    const ask = pick(["C", "H"] as const);
    return make(
      {
        key: `pe-${n}-${ask}`,
        prompt: `Polyethylene (plastic bag plastic) is made by joining ethene molecules, C₂H₄. A chain made from ${n.toLocaleString("en-US")} ethene molecules has how many ${ask === "C" ? "carbon" : "hydrogen"} atoms?`,
        visual: { kind: "chem-molecule", molecule: "C₂H₄", style: "structural", name: "Ethene, C₂H₄" },
        hint: `No atoms are lost when the chain forms. Each ethene brings ${ask === "C" ? 2 : 4} ${ask === "C" ? "carbon" : "hydrogen"} atoms.`,
        explain: `${n.toLocaleString("en-US")} × ${ask === "C" ? 2 : 4} = ${(n * (ask === "C" ? 2 : 4)).toLocaleString("en-US")} ${ask === "C" ? "carbon" : "hydrogen"} atoms (ignoring the chain's two ends).`,
      },
      keypad(n * (ask === "C" ? 2 : 4)),
    );
  },
  () => {
    const [mono, f, poly, per] = pick([
      ["ethene", "C₂H₄", "polyethylene", 6],
      ["propene", "C₃H₆", "polypropylene", 9],
      ["vinyl chloride", "C₂H₃Cl", "PVC", 6],
      ["styrene", "C₈H₈", "polystyrene", 16],
    ] as [string, string, string, number][]);
    const n = pick([3, 4, 5, 6, 10]);
    return make(
      {
        key: `units-${mono}-${n}`,
        prompt: `A short piece of ${poly} is made from ${n} ${mono} molecules (${f}). How many atoms does it have?`,
        hint: `Count the atoms in one ${f} (${per}), then multiply by ${n}. Joining doesn't add or remove atoms.`,
        explain: `${f} has ${per} atoms; ${n} × ${per} = ${n * per}.`,
      },
      keypad(n * per),
    );
  },
  bank("poly", [
    { k: "def", p: "What is a polymer?", a: "A very long molecule made of many small repeating units", w: ["A tiny molecule with two atoms", "A mixture of metals", "A single atom"], h: "'Poly' means many; 'mer' means part.", e: "Polymers are long chains of repeating units called monomers. Plastics, nylon, proteins and DNA are polymers." },
    { k: "mono", p: "The small molecules that join to make a polymer are called…", a: "Monomers", w: ["Polymers", "Elements", "Crystals"], h: "'Mono' means one.", e: "Monomers (like ethene) link end to end to make a polymer (like polyethylene)." },
    { k: "natural", p: "Which of these is a NATURAL polymer?", a: "Cellulose in wood and cotton", w: ["Nylon", "Polyester", "PVC"], h: "Living things make polymers too.", e: "Cellulose, starch, silk, proteins and DNA are natural polymers. Nylon, polyester and PVC are synthetic." },
    { k: "bend", p: "Why can a plastic bag stretch without breaking?", a: "Its long, tangled chains can slide past each other", w: ["It is made of metal atoms", "It has no atoms", "Its molecules are very small"], h: "Think of a bowl of cooked spaghetti.", e: "Long polymer chains are tangled but can slide and straighten, so the plastic stretches." },
  ]),
);

/** Making things from natural resources, in order. */
const PROCESSES: [string, string[]][] = [
  ["a plastic bottle from crude oil", ["Pump crude oil from underground", "Separate the oil into parts by boiling point", "Crack big molecules into small ones like ethene", "Join small molecules into long polymer chains", "Melt the plastic and mold it into a bottle"]],
  ["a fleece jacket", ["Pump crude oil", "Refine it into pure chemicals", "React the chemicals to make polyester", "Melt and spin polyester into threads", "Knit the threads into fleece fabric"]],
  ["glass", ["Dig up sand, soda ash and limestone", "Mix the raw materials", "Heat them to about 1,500 °C until they melt", "Shape the hot, runny glass", "Cool it slowly so it doesn't crack"]],
  ["a new medicine", ["Find a natural chemical that helps, like salicin in willow bark", "Work out its structure and how it works", "Make a similar chemical in the lab", "Test that it's safe and works", "Make it in large amounts in a factory"]],
  ["ethanol fuel", ["Grow corn or sugarcane", "Crush it and dissolve out the sugar", "Ferment the sugar with yeast", "Distill to separate ethanol from water", "Blend the ethanol into gasoline"]],
  ["a nylon rope", ["Get chemicals refined from crude oil", "React two chemicals so they join into nylon chains", "Melt the nylon", "Push it through tiny holes to make fibres", "Twist the fibres into rope"]],
  ["steel", ["Mine iron ore", "Heat the ore with coke in a blast furnace", "Collect the melted iron", "Blow oxygen through it to remove extra carbon", "Roll the steel into beams and sheets"]],
];

/** MS-PS1-3 — Do it: put the steps of making a material in order. */
export function makingSteps(): Question {
  const [what, steps] = pick(PROCESSES);
  const drop = rand(0, steps.length - 1); // 0 keeps every step; otherwise leave one out for variety
  const items = drop === 0 ? steps : steps.filter((_, i) => i !== drop);
  return make(
    {
      key: `${what}-${drop}`,
      prompt: `Put the steps for making ${what} in order.`,
      hint: "Start with the natural resource. Chemical reactions change it into the new material, and the last steps shape it.",
      explain: items.map((s, i) => `${i + 1}. ${s}`).join(" "),
    },
    act({ kind: "order", items, direction: "first to last" }, items.length),
  );
}

/** Oil fractions: [name, low °C, high °C, use]. */
const FRACTIONS: [string, number, number, string][] = [
  ["Refinery gas", -160, 25, "bottled gas for cooking"],
  ["Gasoline", 25, 175, "car fuel"],
  ["Kerosene", 175, 250, "jet fuel"],
  ["Diesel", 250, 350, "truck and train fuel"],
  ["Fuel oil", 350, 450, "ship fuel"],
  ["Bitumen", 450, 600, "roads and roofs"],
];

/** MS-PS1-3 — fuels from crude oil and from plants. */
export const fuels = mix(
  () => {
    const i = rand(0, FRACTIONS.length - 1);
    const [name, lo, hi] = FRACTIONS[i];
    const t = Math.round((lo + rand(2, 8) * ((hi - lo) / 10)) / 5) * 5;
    return make(
      {
        key: `frac-${name}-${t}`,
        prompt: `In a refinery, a part of crude oil boils at about ${ns(t)} °C. Which part (fraction) is it?`,
        visual: { kind: "table", header: ["Fraction", "Boils between", "Used for"], rows: FRACTIONS.map(([n, l, h, u]) => [n, l < 0 ? `below ${h} °C` : `${l}–${h} °C`, u]) },
        needsVisual: true,
        hint: "Find the row whose boiling range includes that temperature.",
        explain: `${ns(t)} °C is in the ${name.toLowerCase()} range.`,
      },
      label(name, FRACTIONS.filter((_, j) => j !== i).map((f) => f[0])),
    );
  },
  bank("fuel", [
    { k: "sep", p: "How does a refinery separate crude oil into gasoline, diesel and other fuels?", a: "By heating it: parts with different boiling points separate", w: ["By using a magnet", "By filtering it through sand", "By freezing it solid"], h: "This is called fractional distillation.", e: "Crude oil is a mixture. Small molecules boil at low temperatures, big ones at high temperatures, so they separate." },
    { k: "big", p: "Which part of crude oil has the biggest molecules?", a: "Bitumen (for roads)", w: ["Refinery gas", "Gasoline", "Kerosene"], h: "Bigger molecules are thick and boil at the highest temperatures.", e: "Bitumen's long molecules make it thick and sticky, with the highest boiling point." },
    { k: "small", p: "Small molecules in crude oil have…", a: "Low boiling points: they rise to the top of the column", w: ["High boiling points", "No boiling point", "The same boiling point as big ones"], h: "Refinery gas boils below room temperature.", e: "Smaller molecules attract each other less, so they boil at lower temperatures." },
    { k: "bio", p: "Which fuel is made from plants instead of crude oil?", a: "Ethanol from corn or sugarcane", w: ["Diesel", "Kerosene", "Gasoline"], h: "Yeast can turn plant sugar into this fuel.", e: "Ethanol is fermented from plant sugars: a biofuel. Diesel, kerosene and gasoline come from crude oil." },
    { k: "burn", p: "When a fuel like methane burns in oxygen, what new substances form?", a: "Carbon dioxide and water", w: ["Oxygen and hydrogen", "Crude oil", "Salt and water"], h: "The carbon and hydrogen atoms in the fuel join with oxygen.", e: "Carbon atoms end up in CO₂ and hydrogen atoms in H₂O, releasing energy." },
    { k: "nonrenew", p: "Why are gasoline and diesel called nonrenewable?", a: "They come from crude oil that took millions of years to form", w: ["They can be grown each year", "They don't burn completely", "They are made from air"], h: "How fast does crude oil form?", e: "Crude oil formed from ancient sea life over millions of years. We use it far faster than it forms." },
  ]),
);

/** MS-PS1-3 — medicines and materials designed by chemists. */
export const medicines = bank("med", [
  { k: "aspirin", p: "People once chewed willow bark for pain. What did chemists do with that idea?", a: "Found the pain-relieving chemical and made a gentler version, aspirin", w: ["Planted more willow trees", "Ground bark into pills", "Nothing: willow bark doesn't help"], h: "The bark contains salicin.", e: "Chemists changed the bark's chemical (salicylic acid) into aspirin, which is gentler on the stomach and made in factories." },
  { k: "why", p: "Why make a medicine in a factory instead of collecting it from plants?", a: "To make enough of it, pure and in exact doses", w: ["Because factory medicines have no atoms", "Because plants are poisonous", "Because it's always cheaper to pick plants"], h: "Think of millions of patients needing the same dose.", e: "Making a medicine by chemical reactions gives large amounts with the same purity and strength every time." },
  { k: "taxol", p: "The cancer drug Taxol was first found in the bark of rare Pacific yew trees. Why did chemists find a way to make it from other sources?", a: "Harvesting bark would have killed too many trees", w: ["The bark was too heavy", "Yew trees grow too fast", "Taxol is a metal"], h: "Each patient needed bark from several trees.", e: "Making Taxol from a renewable source (needles of a common yew, then cell cultures) protected the rare trees." },
  { k: "penicillin", p: "Penicillin, the first common antibiotic, was discovered in…", a: "A mold growing on a dish of bacteria", w: ["Crude oil", "Sea water", "A volcano"], h: "Alexander Fleming noticed it in 1928.", e: "The mold killed the bacteria around it. Chemists then learned to grow and purify it, saving millions of lives." },
  { k: "insulin", p: "People with diabetes once used insulin from pigs and cows. Today most insulin is…", a: "Made by engineered bacteria or yeast in tanks", w: ["Dug from mines", "Made from crude oil", "Collected from plants"], h: "Living cells can be set up to make human insulin.", e: "Engineered microbes make human insulin in large, pure amounts." },
  { k: "kevlar", p: "Kevlar is five times stronger than steel for its weight. What is it used for?", a: "Bulletproof vests and helmets", w: ["Soft bedsheets", "Drinking straws", "Food wrap"], h: "Strong and light is what you'd want to wear for protection.", e: "Kevlar's chains line up tightly, making a light fibre that stops fast objects." },
  { k: "teflon", p: "Why is Teflon used to coat frying pans?", a: "Almost nothing sticks to it, and it stands up to cooking heat", w: ["It makes food taste sweet", "It's magnetic", "It dissolves in oil"], h: "Eggs slide right off.", e: "Teflon's surface is very slippery and unreactive, so food doesn't stick." },
  { k: "velcro", p: "Velcro was inspired by burrs sticking to a dog's fur. What is modern Velcro made of?", a: "Nylon or polyester hooks and loops", w: ["Real burrs", "Iron wire", "Cotton only"], h: "It has to be tough and bendy.", e: "An engineer copied nature's hooks using synthetic nylon, which keeps its shape." },
  { k: "goretex", p: "A raincoat fabric lets sweat vapor out but keeps rain out. What made that possible?", a: "A synthetic material with tiny holes smaller than raindrops", w: ["Wool from special sheep", "Painting cotton with glue", "Leaving holes big enough for rain"], h: "Water vapor molecules are much smaller than drops.", e: "Gore-Tex has billions of tiny pores per square centimetre: too small for drops, big enough for vapor." },
  { k: "fert", p: "Why is making ammonia fertilizer from air so important?", a: "It helps grow enough food for billions of people", w: ["It makes plants taste better", "It removes oxygen from the air", "It's used to make glass"], h: "Plants need nitrogen to grow.", e: "Fertilizer made with the Haber process helps feed about half the people on Earth." },
  { k: "test", p: "Before a new medicine is sold, what must happen?", a: "It is tested carefully for safety and how well it works", w: ["Nothing: chemists just sell it", "It is painted a bright colour", "It is buried for a year"], h: "Medicines go through trials.", e: "New medicines go through lab tests and clinical trials to check they're safe and effective." },
  { k: "same", p: "Vitamin C made in a factory and vitamin C from an orange are…", a: "The same substance, with the same properties", w: ["Different: factory ones have different atoms", "Different: only natural ones work", "The same name but different formulas"], h: "Compare their formulas: both are C₆H₈O₆.", e: "A substance is defined by its atoms and structure, not where it came from." },
]);

/** Materials for jobs: [material, properties]. */
const MAT_PROPS: Record<string, string> = {
  Nylon: "strong, light, flexible, doesn't rot",
  Cotton: "soft, soaks up water, rots when damp",
  Kevlar: "extremely strong, light, heat resistant",
  Polyethylene: "waterproof, light, cheap, flexible",
  PVC: "stiff, waterproof, lasts for decades",
  Glass: "see-through, stiff, safe to heat, breaks if dropped",
  Steel: "very strong, heavy, can rust",
  Aluminum: "light, doesn't rust, easy to shape",
  Wool: "warm even when damp, soft",
  Polyester: "dries quickly, doesn't wrinkle, light",
  Paper: "cheap, easy to print on, tears when wet",
  "Silicone rubber": "bendy, waterproof, safe from −50 °C to 230 °C",
};
const JOBS: [string, string][] = [
  ["a climbing rope", "Nylon"],
  ["a bulletproof vest", "Kevlar"],
  ["a water pipe under a street", "PVC"],
  ["a bath towel", "Cotton"],
  ["a cheap waterproof bag", "Polyethylene"],
  ["an oven-safe dish you can see through", "Glass"],
  ["a bridge beam", "Steel"],
  ["a soda can", "Aluminum"],
  ["hiking socks for cold, wet days", "Wool"],
  ["a quick-drying running shirt", "Polyester"],
  ["a bendy baking mold", "Silicone rubber"],
];

/** MS-PS1-3 — choose a material by its properties. */
export const chooseMaterial = mix(() => {
  const [job, best] = pick(JOBS);
  const others = shuffle(Object.keys(MAT_PROPS).filter((m) => m !== best)).slice(0, 3);
  const rows = shuffle([best, ...others]);
  return make(
    {
      key: `job-${job}-${others.sort().join("")}`,
      prompt: `Which material is best for ${job}?`,
      visual: { kind: "table", header: ["Material", "Properties"], rows: rows.map((m) => [m, MAT_PROPS[m]]) },
      needsVisual: true,
      hint: "Think about what the job needs (strength? waterproof? soaks up water? heat?), then match the properties.",
      explain: `${best}: ${MAT_PROPS[best]}.`,
    },
    label(best, others),
  );
});

/** MS-PS1-3 — benefits and costs of synthetic materials for society. */
export const societyImpact = mix(
  () => {
    const ask = rand(0, 2);
    const bars = { kind: "bars" as const, title: "What happened to plastic waste (%)", items: [{ label: "Recycled", value: 9 }, { label: "Burned", value: 12 }, { label: "Landfill or nature", value: 79 }], max: 100, step: 10 };
    const q = [
      ["What percent of plastic waste was recycled?", 9, "Read the 'Recycled' bar.", "Only about 9% of all plastic waste ever made has been recycled."],
      ["What percent ended up in landfills or nature?", 79, "Read the tallest bar.", "About 79% went to landfills or the environment, where plastic can last hundreds of years."],
      ["What percent was burned?", 12, "Read the 'Burned' bar.", "About 12% was burned, which gives off carbon dioxide."],
    ][ask] as [string, number, string, string];
    return make({ key: `bars-${ask}`, prompt: q[0], visual: bars, needsVisual: true, unit: "%", hint: q[2], explain: `${q[3]} (Data: plastic waste made up to 2015.)` }, keypad(q[1]));
  },
  bank("soc", [
    { k: "cost1", p: "Which is a COST of plastics to society?", a: "Plastic waste lasts for hundreds of years in oceans", w: ["Plastic keeps food fresh longer", "Plastic medical tubes are clean and cheap", "Plastic parts make cars lighter"], h: "Which one harms people or the environment?", e: "Plastics are useful, but most don't break down, so waste builds up in landfills and oceans." },
    { k: "ben1", p: "Which is a BENEFIT of synthetic medicines?", a: "Many diseases can be treated cheaply and safely", w: ["Medicines are made without any chemicals", "They never have side effects", "They use up no resources"], h: "Think of antibiotics and vaccines.", e: "Factory-made medicines reach millions of people in pure, reliable doses." },
    { k: "micro", p: "Polyester clothes shed tiny fibres in the wash. Why is that a problem?", a: "Microplastics flow into rivers and oceans and are eaten by animals", w: ["The clothes get heavier", "The fibres turn into oxygen", "It makes the water too clean"], h: "Where does washing-machine water go?", e: "Microfibres are too small to filter out easily, so they build up in water and food chains." },
    { k: "fix", p: "Which choice best reduces the harm from plastic waste?", a: "Reuse and recycle plastics, and design ones that break down", w: ["Throw plastics in rivers", "Make plastics last even longer in nature", "Burn plastics in your yard"], h: "Reduce, reuse, recycle.", e: "Using less, recycling more and developing biodegradable plastics all cut the waste problem." },
    { k: "cfc", p: "CFCs were synthetic chemicals used in fridges and sprays. What happened when scientists found they damaged the ozone layer?", a: "Countries agreed to ban them, and the ozone layer is healing", w: ["Nothing: they're still used everywhere", "CFCs were made stronger", "The ozone layer was removed"], h: "The 1987 Montreal Protocol.", e: "Society can change course when evidence shows harm: CFCs were phased out worldwide." },
    { k: "fuel", p: "Burning fuels made from oil gives us energy. What is the biggest cost?", a: "It adds carbon dioxide to the air, warming the climate", w: ["It makes the oil renewable", "It removes CO₂ from the air", "It produces only water"], h: "What gas comes out of a car's exhaust?", e: "Burning fossil fuels releases CO₂, which traps heat and changes the climate." },
    { k: "lead", p: "Lead used to be added to gasoline. Why was it banned?", a: "Lead from car exhaust harmed people's health, especially children's brains", w: ["It made cars too fast", "It was too expensive", "It turned gasoline green"], h: "Lead is toxic.", e: "After lead was removed from gasoline, lead levels in people's blood dropped sharply." },
    { k: "bio", p: "Some new plastics are made from corn starch and break down in compost. What problem do they help with?", a: "Plastic waste that lasts for centuries, and using up oil", w: ["They make bags heavier", "They stop plants growing", "They add lead to soil"], h: "Think about where the material comes from and where it ends up.", e: "Plant-based, compostable plastics come from a renewable resource and don't pile up for hundreds of years, though they still have costs (farmland, energy)." },
    { k: "trade", p: "A town must choose between paper bags and plastic bags. What's the best way to decide?", a: "Compare costs and benefits like energy used, reuse and waste", w: ["Pick whichever is newer", "Pick whichever is natural, always", "Flip a coin"], h: "Every material has trade-offs.", e: "Good decisions weigh evidence: resources used, how long each lasts, how it's disposed of." },
  ]),
);

/** MS-PS1-3 — Do it: sort impacts into benefits and costs. */
export function sortImpacts(): Question {
  const good = [
    "💊 Medicines cure infections",
    "🦺 Kevlar vests protect police",
    "🌾 Fertilizer grows more food",
    "🧴 Plastic keeps food fresh",
    "🚗 Light plastic parts save car fuel",
    "🩹 Clean, cheap medical supplies",
    "🧥 Warm, light, waterproof clothes",
  ];
  const bad = [
    "🌊 Plastic waste in oceans",
    "🐢 Animals swallow plastic bags",
    "🏭 Factories use lots of energy",
    "🌡️ Burning fuels adds CO₂",
    "🛢️ Oil is used up and can't be replaced",
    "🐟 Microplastics in fish",
    "🌫️ Air pollution from refineries",
  ];
  const s = sortFrom(["Benefit", "Cost"], [good, bad], rand(5, 6));
  return make(
    {
      key: s.key,
      prompt: "Sort the effects of synthetic materials: benefit or cost to society?",
      hint: "A benefit helps people. A cost harms people, wildlife or the environment, or uses up resources.",
      explain: `Costs: ${s.items.filter((i) => i.bin === 1).map((i) => i.label.replace(/^\S+ /, "").toLowerCase()).join("; ")}. Weighing both helps us use materials wisely.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 1).length),
  );
}

/** Natural resource → synthetic product, with properties: [key, from, to, rows]. */
const TRANSFORMS: [string, string, string, [string, string, string][]][] = [
  ["pe", "ethene gas", "polyethylene", [["State at 20 °C", "gas", "solid"], ["Smell", "sweet", "none"], ["Burns easily?", "yes, explosively", "slowly"]]],
  ["asp", "salicylic acid", "aspirin", [["Melts at", "159 °C", "136 °C"], ["Taste", "very bitter", "slightly sour"], ["Upsets the stomach?", "badly", "much less"]]],
  ["glass", "sand", "glass", [["Look", "grainy, cloudy", "smooth, see-through"], ["Melts at", "about 1,700 °C", "softens near 600 °C"], ["Pours?", "as grains", "no, it's one solid sheet"]]],
  ["eth", "sugar water", "ethanol", [["Boils at", "about 100 °C", "78 °C"], ["Burns?", "no", "yes"], ["Taste", "sweet", "not sweet"]]],
  ["nh3", "nitrogen and hydrogen", "ammonia", [["Smell", "none", "sharp"], ["Dissolves in water?", "barely", "very well"], ["Boils at", "−196 °C and −253 °C", "−33 °C"]]],
  ["soap", "fat and lye", "soap", [["Mixes with water?", "fat doesn't", "yes, makes suds"], ["Feel", "greasy, burning (lye)", "slippery, safe"], ["Cleans grease?", "no", "yes"]]],
];

/** MS-PS1-3, MS-PS1-2 — synthetic materials are new substances made by reactions. */
export const newFromOld = mix(
  () => {
    const [k, from, to, rows] = pick(TRANSFORMS);
    return make(
      {
        key: `tr-${k}`,
        prompt: `Chemists turn ${from} into ${to}. What do the properties show?`,
        visual: { kind: "table", header: ["Property", from, to], rows },
        needsVisual: true,
        hint: "If characteristic properties like melting point, smell or how it burns change, a new substance formed.",
        explain: `The properties changed, so ${to} is a new substance made by a chemical reaction. The atoms came from ${from}.`,
      },
      label("A chemical reaction made a new substance", ["It's the same substance in a new shape", "Atoms were created from nothing", "It was only a change of state"]),
    );
  },
  () => {
    const [k, from, to] = pick(TRANSFORMS);
    return make(
      {
        key: `src-${k}`,
        prompt: `Chemists make ${to} by a chemical reaction. Where do its atoms come from?`,
        hint: "Atoms are never created or destroyed in a reaction. They come from the starting materials.",
        explain: `${to[0].toUpperCase()}${to.slice(1)} is made from ${from}: the same atoms, rearranged into a new substance.`,
      },
      label(`From the ${from}`, shuffle(TRANSFORMS.filter((t) => t[0] !== k)).slice(0, 3).map((t) => `From the ${t[1]}`)),
    );
  },
  bank("new", [
    { k: "atoms", p: "When chemists make nylon from oil chemicals, where do nylon's atoms come from?", a: "From the starting chemicals: the atoms are rearranged", w: ["They're made from energy", "From the factory walls", "Nylon has no atoms"], h: "Atoms are never created in a chemical reaction.", e: "Every atom in nylon was in the raw materials. The reaction joins them in a new arrangement." },
    { k: "how", p: "Synthetic materials are made from natural resources by…", a: "Chemical reactions that make new substances", w: ["Only cutting and shaping", "Only melting and freezing", "Mixing without any change"], h: "Synthetic materials have new properties.", e: "Reactions rearrange atoms into new molecules with properties the natural resource didn't have." },
    { k: "ethene", p: "Ethene is a gas but polyethylene is a solid. Why?", a: "Thousands of ethene molecules joined into long chains", w: ["Polyethylene has different elements", "It was frozen", "Polyethylene has fewer atoms"], h: "Bigger molecules hold on to each other more strongly.", e: "Joining small molecules into huge chains makes a new substance with new properties: a solid plastic." },
  ]),
);

/* ======================================================== 4. HOT & COLD PARTICLES */

type State = "solid" | "liquid" | "gas";
const STATES: State[] = ["solid", "liquid", "gas"];
const stateAt = (t: number, melt: number, boil: number): State => (t < melt ? "solid" : t < boil ? "liquid" : "gas");

/** MS-PS1-4 — particle arrangement in solids, liquids and gases. */
export const statesOfMatter = mix(
  () => {
    const st = pick(STATES);
    const [f, name] = pick([["H₂O", "water"], ["CO₂", "carbon dioxide"], ["O₂", "oxygen"], ["N₂", "nitrogen"], ["NH₃", "ammonia"]] as [string, string][]);
    const n = pick([9, 10, 12]);
    return make(
      {
        key: `one-${st}-${f}-${n}`,
        prompt: `This box shows ${name} particles. Which state is it in?`,
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: f, count: n, name }], arrangement: st, motion: st === "solid" ? 1 : st === "liquid" ? 2 : 3 }] },
        needsVisual: true,
        hint: "Solid: packed in rows, vibrating in place. Liquid: touching but jumbled. Gas: far apart, flying around.",
        explain: { solid: "The particles are packed tightly in a regular pattern and only vibrate: a solid.", liquid: "The particles touch but are jumbled and can slide past each other: a liquid.", gas: "The particles are far apart and move fast in all directions: a gas." }[st],
      },
      label(st[0].toUpperCase() + st.slice(1), STATES.filter((x) => x !== st).map((x) => x[0].toUpperCase() + x.slice(1))),
    );
  },
  () => {
    const order = shuffle(STATES);
    const ask = rand(0, 2);
    return make(
      {
        key: `three-${order.join("")}-${ask}`,
        prompt: "What state is the box marked '?'",
        visual: { kind: "chem-particles", panels: order.map((st, i) => ({ species: [{ formula: "H₂O", count: 9, name: "water" }], arrangement: st, label: i === ask ? "?" : st[0].toUpperCase() + st.slice(1) })), joiner: null },
        needsVisual: true,
        hint: "Look at how close together and how orderly the particles are.",
        explain: `The '?' box shows a ${order[ask]}.`,
      },
      label(order[ask][0].toUpperCase() + order[ask].slice(1), STATES.filter((x) => x !== order[ask]).map((x) => x[0].toUpperCase() + x.slice(1))),
    );
  },
  bank("som", [
    { k: "liq", p: "Which state has a fixed volume but takes the shape of its container?", a: "Liquid", w: ["Solid", "Gas", "All three"], h: "Pour juice from a tall glass into a bowl.", e: "Liquid particles stay close (fixed volume) but slide around (shape changes)." },
    { k: "gas", p: "Which state can be squeezed into a much smaller space?", a: "Gas", w: ["Solid", "Liquid", "None of them"], h: "Which state has lots of space between particles?", e: "Gas particles are far apart, so pushing them closer makes the gas take up less room." },
    { k: "solid", p: "In a solid, the particles…", a: "Vibrate in place, held in a fixed pattern", w: ["Don't move at all", "Fly around freely", "Slide past each other"], h: "Even solid particles have some energy.", e: "Solid particles vibrate but can't leave their places, so a solid keeps its shape." },
    { k: "same", p: "Ice, liquid water and steam are made of…", a: "The same H₂O molecules", w: ["Different molecules", "Different atoms", "Ice has no molecules"], h: "A change of state doesn't change the substance.", e: "All three are H₂O. Only the spacing and motion of the molecules differ." },
    { k: "size", p: "When water boils, what happens to the water molecules?", a: "They spread far apart, but each molecule stays the same size", w: ["Each molecule gets bigger", "They break into H and O atoms", "They disappear"], h: "Steam takes up more space. Is that because molecules grow?", e: "Molecules don't grow or split when water boils. They move faster and farther apart." },
  ]),
);

/** MS-PS1-4 — temperature measures how fast particles move. */
export const particleMotion = mix(
  () => {
    const st = pick(["liquid", "gas"] as State[]);
    const [ma, mb] = shuffle([1, 2, 3]).slice(0, 2) as (1 | 2 | 3)[];
    const hotter = ma > mb ? "A" : "B";
    const ask = rand(0, 1);
    const f = pick(["H₂O", "N₂", "CO₂", "O₂"]);
    return make(
      {
        key: `mot-${st}-${f}-${ma}${mb}-${ask}`,
        prompt: ask ? "Which box is at the higher temperature?" : "Which box is colder?",
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: f, count: 10 }], arrangement: st, motion: ma, label: "A" }, { species: [{ formula: f, count: 10 }], arrangement: st, motion: mb, label: "B" }], joiner: "vs" },
        needsVisual: true,
        hint: "The motion lines show how fast the particles move. Faster particles mean a higher temperature.",
        explain: `Box ${hotter}'s particles move faster, so it's hotter. Temperature measures the average energy of motion of the particles.`,
      },
      label(ask ? `Box ${hotter}` : `Box ${hotter === "A" ? "B" : "A"}`, [ask ? `Box ${hotter === "A" ? "B" : "A"}` : `Box ${hotter}`, "They're the same"]),
    );
  },
  () => {
    const [what, change, right, wrongs] = pick([
      ["a balloon of air", "heated", "Speed up and push outward harder, so the balloon expands", ["Slow down and shrink", "Get bigger themselves", "Turn into a liquid"]],
      ["a balloon of air", "put in a freezer", "Slow down, so the balloon shrinks", ["Speed up", "Get smaller themselves", "Stop existing"]],
      ["a sealed can of gas", "heated", "Hit the walls faster and harder, so the pressure rises", ["Slow down, so the pressure falls", "Grow, so the can bulges", "Turn into atoms"]],
      ["a cup of water", "cooled from 60 °C to 20 °C", "Move more slowly", ["Move faster", "Stop moving completely", "Get smaller"]],
      ["a metal rod", "heated", "Vibrate faster and push slightly apart, so it expands a little", ["Stop vibrating", "Melt instantly", "Get fewer atoms"]],
      ["a block of ice at −20 °C", "warmed to −5 °C", "Vibrate faster, but stay in place as a solid", ["Start flowing like a liquid", "Stop vibrating", "Fly apart as a gas"]],
    ] as [string, string, string, string[]][]);
    return make(
      {
        key: `pred-${what}-${change}`,
        prompt: `The particles in ${what} are ${change}. What happens to them?`,
        hint: "Adding thermal energy speeds particles up; removing it slows them down. Particles themselves don't grow or shrink.",
        explain: `${right}.`,
      },
      label(right, wrongs),
    );
  },
  bank("mot", [
    { k: "temp", p: "What does temperature measure?", a: "How fast the particles move, on average", w: ["How many particles there are", "How big the particles are", "The total mass"], h: "Hotter particles have more energy of motion.", e: "Temperature is a measure of the average kinetic energy (energy of motion) of the particles." },
    { k: "add", p: "When you add thermal energy to a substance, its particles…", a: "Move faster", w: ["Move slower", "Get heavier", "Turn into new atoms"], h: "Think of popcorn kernels on a hot pan.", e: "Added energy becomes faster particle motion, so the temperature rises (unless the state is changing)." },
    { k: "zero", p: "In the coldest ice, do the water molecules stop moving?", a: "No: they still vibrate", w: ["Yes: solids don't move", "Yes, below 0 °C", "They spin faster"], h: "Ice at −20 °C can still get colder.", e: "Particles keep vibrating in any solid. They'd only stop at absolute zero, −273 °C, which can't be reached." },
  ]),
);

/** Substances for the temperature slider: [name, formula, melt, boil, min, max, step]. */
const SLIDER: [string, string | undefined, number, number, number, number, number][] = [
  ["water", "H₂O", 0, 100, -40, 140, 5],
  ["ethanol", undefined, -114, 78, -150, 110, 2],
  ["nitrogen", "N₂", -210, -196, -230, -180, 2],
  ["oxygen", "O₂", -218, -183, -240, -160, 1],
  ["mercury", "Hg", -39, 357, -60, 390, 3],
  ["bromine", "Br₂", -7, 59, -40, 100, 1],
  ["ammonia", "NH₃", -78, -33, -100, -10, 1],
  ["table salt", undefined, 801, 1465, 700, 900, 1],
  ["gallium", "Ga", 30, 2400, 0, 100, 1],
];

/** A start temperature on the slider, not in the target state; prefers round numbers. */
function sliderStart(min: number, max: number, step: number, ok: (t: number) => boolean): number {
  const all: number[] = [];
  for (let t = min; t <= max + 1e-9; t += step) if (ok(t)) all.push(t);
  const round = all.filter((t) => t % 10 === 0);
  return pick(round.length ? round : all);
}

/** MS-PS1-4 — Do it: heat or cool a substance into a target state. */
export function changeState(): Question {
  const [name, formula, melt, boil, min, max, step] = pick(SLIDER);
  const reachable = STATES.filter((s) => (s === "solid" ? min < melt : s === "gas" ? max >= boil : melt >= min && melt <= max));
  const target = pick(reachable);
  const start = sliderStart(min, max, step, (t) => stateAt(t, melt, boil) !== target);
  const from = stateAt(start, melt, boil);
  const warm = STATES.indexOf(target) > STATES.indexOf(from);
  return make(
    {
      key: `st-${name}-${target}-${start}`,
      prompt: `Make the ${name} a ${target}. It melts at ${ns(melt)} °C and boils at ${ns(boil)} °C.`,
      speech: `Make the ${name} a ${target}. It melts at ${ns(melt)} °C and boils at ${ns(boil)} °C.`,
      hint: warm ? "Add thermal energy: slide the temperature up past the change point." : "Remove thermal energy: slide the temperature down past the change point.",
      explain:
        target === "solid"
          ? `Below ${ns(melt)} °C, ${name} is a solid: its particles slow down and lock into place.`
          : target === "gas"
            ? `At ${ns(boil)} °C and above, ${name} is a gas: its particles move fast enough to fly apart.`
            : `Between ${ns(melt)} °C and ${ns(boil)} °C, ${name} is a liquid.`,
    },
    act({ kind: "chem-states", substance: name, ...(formula ? { formula } : {}), melt, boil, target, min, max, step, start }, STATES.indexOf(target)),
  );
}

/** MS-PS1-4 — Do it: find the melting or boiling point by watching the particles. */
export function findChangePoint(): Question {
  const [name, formula, melt, boil, min, max, step] = pick(SLIDER);
  const can = (["melt", "boil"] as const).filter((k) => {
    const t = k === "melt" ? melt : boil;
    return t > min && t <= max;
  });
  const find = pick(can);
  const t = find === "melt" ? melt : boil;
  return make(
    {
      key: `find-${name}-${find}`,
      prompt: `Slide the temperature and stop exactly where the ${name} starts to ${find}.`,
      speech: `Slide the temperature and stop exactly where the ${name} starts to ${find}.`,
      hint: find === "melt" ? "Warm it slowly. Watch for the moment the neat rows break up." : "Warm it slowly. Watch for the moment particles start flying apart.",
      explain: `${name[0].toUpperCase()}${name.slice(1)} ${find === "melt" ? "melts" : "boils"} at ${ns(t)} °C. This temperature is a characteristic property of ${name}.`,
    },
    act({ kind: "chem-states", substance: name, ...(formula ? { formula } : {}), melt, boil, target: { find }, min, max, step, start: min }, t),
  );
}

/** Heating-curve substances: [name, melt, boil, start, end]. */
const CURVES: [string, number, number, number, number][] = [
  ["water", 0, 100, -30, 130],
  ["ethanol", -114, 78, -140, 110],
  ["bromine", -7, 59, -30, 90],
  ["ammonia", -78, -33, -100, 0],
  ["mercury", -39, 357, -80, 400],
  ["oxygen", -218, -183, -240, -160],
];
const SEGMENTS = ["Solid warming up", "Melting", "Liquid warming up", "Boiling", "Gas warming up"];
const COOL_SEGMENTS = ["Gas cooling", "Condensing", "Liquid cooling", "Freezing", "Solid cooling"];

/** MS-PS1-4 — read heating curves. */
export const heatingCurves = mix(
  () => {
    const [name, melt, boil, start, end] = pick(CURVES);
    const ask = rand(0, 1);
    const ans = ask ? boil : melt;
    return make(
      {
        key: `pt-${name}-${ask}`,
        prompt: `This is the heating curve of ${name}. What is its ${ask ? "boiling" : "melting"} point?`,
        visual: { kind: "chem-energy", mode: "heating", melt, boil, start, end, title: `Heating ${name}` },
        needsVisual: true,
        unit: "°C",
        hint: `Find the ${ask ? "second (higher)" : "first (lower)"} flat part. The temperature there is the ${ask ? "boiling" : "melting"} point.`,
        explain: `The curve is flat at ${ns(ans)} °C while ${name} ${ask ? "boils" : "melts"}.`,
      },
      keypad(ans),
    );
  },
  () => {
    const [name, melt, boil, start, end] = pick(CURVES);
    const i = rand(0, 4);
    const labels = [null, null, null, null, null] as (string | null)[];
    labels[i] = "?";
    return make(
      {
        key: `seg-${name}-${i}`,
        prompt: "What is happening in the part marked '?'",
        visual: { kind: "chem-energy", mode: "heating", melt, boil, start, end, labels: labels as [string | null, string | null, string | null, string | null, string | null], title: `Heating ${name}` },
        needsVisual: true,
        hint: "Sloped parts: one state warming up. Flat parts: the state is changing. The lower flat part is melting; the higher one is boiling.",
        explain: `${SEGMENTS[i]}.${i % 2 === 1 ? " The temperature stays the same while the state changes." : " The temperature rises as the particles speed up."}`,
      },
      label(SEGMENTS[i], SEGMENTS.filter((_, j) => j !== i)),
    );
  },
  () => {
    const four = shuffle(CURVES).slice(0, 4);
    const [name, melt, boil, start, end] = four[0];
    return make(
      {
        key: `id-${name}-${four.map((c) => c[0][0]).join("")}`,
        prompt: "Which substance has this heating curve?",
        visual: { kind: "chem-energy", mode: "heating", melt, boil, start, end, title: "Heating a pure substance" },
        needsVisual: true,
        hint: "Read the two flat temperatures, then match them to a substance you know: water melts at 0 °C and boils at 100 °C.",
        explain: `It melts at ${ns(melt)} °C and boils at ${ns(boil)} °C: ${name}. Melting and boiling points identify a substance.`,
      },
      label(name, four.slice(1).map((c) => c[0])),
    );
  },
  bank("hc", [
    { k: "flat", p: "On a heating curve, what happens to the temperature while a solid melts?", a: "It stays the same until all of it has melted", w: ["It rises quickly", "It falls", "It goes up and down"], h: "Look at the flat parts.", e: "During melting, the energy added breaks particles out of their fixed places instead of speeding them up." },
    { k: "longest", p: "On water's heating curve, the boiling part is longer than the melting part. What does that tell you?", a: "Boiling takes more energy than melting", w: ["Boiling happens at a lower temperature", "Water boils faster than ice melts", "Melting needs more energy"], h: "Longer means more time heating.", e: "To boil, particles must separate completely, which takes more energy than loosening them to melt." },
  ]),
);

/** MS-PS1-4 — why the flat parts: energy changes state, not speed; cooling curves. */
export const plateaus = mix(
  () => {
    const [name, melt, boil, start, end] = pick(CURVES);
    const ask = rand(0, 1);
    const ans = ask ? boil : melt;
    return make(
      {
        key: `cool-${name}-${ask}`,
        prompt: `${name[0].toUpperCase()}${name.slice(1)} is cooled from a gas. At what temperature does it ${ask ? "condense" : "freeze"}?`,
        visual: { kind: "chem-energy", mode: "heating", cooling: true, melt, boil, start: end, end: start, title: `Cooling ${name}` },
        needsVisual: true,
        unit: "°C",
        hint: `On a cooling curve the ${ask ? "first" : "second"} flat part is ${ask ? "condensing" : "freezing"}. It happens at the same temperature as ${ask ? "boiling" : "melting"}.`,
        explain: `The curve is flat at ${ns(ans)} °C: ${name} ${ask ? "condenses" : "freezes"} there, the same temperature at which it ${ask ? "boils" : "melts"}.`,
      },
      keypad(ans),
    );
  },
  () => {
    const [name, melt, boil, start, end] = pick(CURVES);
    const i = pick([1, 3]);
    const labels = [null, null, null, null, null] as (string | null)[];
    labels[i] = "?";
    return make(
      {
        key: `cseg-${name}-${i}`,
        prompt: "During the part marked '?', is thermal energy being added or removed?",
        visual: { kind: "chem-energy", mode: "heating", cooling: true, melt, boil, start: end, end: start, labels: labels as [string | null, string | null, string | null, string | null, string | null], title: `Cooling ${name}` },
        needsVisual: true,
        hint: "On a cooling curve, energy is always leaving. The flat parts are where the state changes.",
        explain: `${COOL_SEGMENTS[i]}: thermal energy is removed while particles lock closer together, and the temperature stays the same.`,
      },
      label("Removed, while the state changes", ["Added, while the state changes", "Removed, while the particles speed up", "Nothing changes at all"]),
    );
  },
  bank("plat", [
    { k: "where", p: "Ice at 0 °C is heated, but the thermometer stays at 0 °C. Where is the energy going?", a: "Into breaking the ice's particles out of their fixed pattern", w: ["Nowhere: energy is destroyed", "Into making the molecules bigger", "Into the thermometer only"], h: "The ice is melting.", e: "While ice melts, the energy loosens the hold between molecules. Their average speed, and so the temperature, stays the same." },
    { k: "after", p: "A glass of ice water stays at 0 °C on a warm day. When will its temperature start to rise?", a: "Once all the ice has melted", w: ["Right away", "Never", "Only when it boils"], h: "Melting uses the incoming energy first.", e: "The temperature stays at 0 °C while melting uses up the energy. After the ice is gone, the water warms." },
    { k: "freeze", p: "When water freezes, does it take in or give out thermal energy?", a: "It gives out energy to its surroundings", w: ["It takes in energy", "Neither", "It creates energy"], h: "Freezing is the reverse of melting.", e: "Melting takes energy in; freezing gives the same energy out as particles lock into place." },
    { k: "steam", p: "A burn from 100 °C steam is worse than one from 100 °C water. Why?", a: "Steam gives out extra energy when it condenses on your skin", w: ["Steam is hotter than 100 °C always", "Water has no energy", "Steam has heavier molecules"], h: "Condensing releases the energy that boiling took in.", e: "As steam condenses to water, it releases a lot of energy, on top of the energy from cooling." },
    { k: "sweat", p: "Why does sweating cool you down?", a: "Evaporating sweat takes thermal energy from your skin", w: ["Sweat is colder than ice", "Sweat adds new cold particles", "It blocks the sun"], h: "Evaporating needs energy. Where does it come from?", e: "The fastest water particles escape, carrying energy away, so your skin cools." },
  ]),
);

/** Changes of state: [from, to, name, energy added?, example]. */
const STATE_CHANGES: [State, State, string, boolean, string][] = [
  ["solid", "liquid", "Melting", true, "an ice cube melting in your hand"],
  ["liquid", "solid", "Freezing", false, "a pond freezing in winter"],
  ["liquid", "gas", "Evaporating (boiling)", true, "a puddle drying in the sun"],
  ["gas", "liquid", "Condensing", false, "dew forming on grass at night"],
  ["solid", "gas", "Sublimation", true, "dry ice turning straight into fog"],
  ["gas", "solid", "Deposition", false, "frost forming on a cold window"],
];

/** MS-PS1-4 — name the change of state and whether energy is added or removed. */
export const changeNames = mix(
  () => {
    const i = rand(0, 5);
    const [from, to, name] = STATE_CHANGES[i];
    const f = i >= 4 ? (i === 4 ? "CO₂" : "H₂O") : pick(["H₂O", "N₂", "O₂"]);
    return make(
      {
        key: `nm-${i}-${f}`,
        prompt: "What is this change of state called?",
        visual: { kind: "chem-particles", panels: [{ species: [{ formula: f, count: 9 }], arrangement: from, label: from[0].toUpperCase() + from.slice(1) }, { species: [{ formula: f, count: 9 }], arrangement: to, label: to[0].toUpperCase() + to.slice(1) }] },
        needsVisual: true,
        hint: "Look at the state before and after the arrow.",
        explain: `${from[0].toUpperCase() + from.slice(1)} → ${to} is ${name.toLowerCase()}.`,
      },
      label(name, STATE_CHANGES.filter((_, j) => j !== i).map((c) => c[2])),
    );
  },
  () => {
    const i = rand(0, 5);
    const [from, to, name, added, example] = STATE_CHANGES[i];
    const ask = rand(0, 1);
    if (ask)
      return make(
        {
          key: `ex-${i}`,
          prompt: `Which change of state is ${example}?`,
          hint: "What state does it start in, and what state does it end in?",
          explain: `${from[0].toUpperCase() + from.slice(1)} to ${to}: ${name.toLowerCase()}.`,
        },
        label(name, STATE_CHANGES.filter((_, j) => j !== i).map((c) => c[2])),
      );
    return make(
      {
        key: `en-${i}`,
        prompt: `During ${name.toLowerCase().replace(" (boiling)", "")} (${from} → ${to}), is thermal energy added or removed?`,
        hint: "Particles need more energy to move farther apart and faster. Moving closer together and slowing down releases energy.",
        explain: added ? `Added: going from ${from} to ${to}, particles must break free of each other, which takes energy.` : `Removed: going from ${from} to ${to}, particles slow down and pull together, giving out energy.`,
      },
      label(added ? "Thermal energy is added" : "Thermal energy is removed", [added ? "Thermal energy is removed" : "Thermal energy is added", "No energy changes"]),
    );
  },
);

/** MS-PS1-4 — Do it: does the change need thermal energy added or removed? */
export function sortHeat(): Question {
  const added = ["🧊 Ice cream melting", "♨️ Water boiling", "💧 A puddle drying up", "🌫️ Dry ice turning to fog", "🍫 Chocolate melting in your hand", "💦 Sweat evaporating", "🕯️ Candle wax melting"];
  const removed = ["❄️ Water freezing into ice", "🌱 Dew forming on grass", "🪟 Frost forming on a window", "🌋 Lava hardening into rock", "🧈 Melted butter hardening in the fridge", "☁️ Steam turning into drops on a lid", "🍭 Hot syrup setting into candy"];
  const s = sortFrom(["Energy added", "Energy removed"], [added, removed], rand(5, 6));
  return make(
    {
      key: s.key,
      prompt: "Sort the changes: is thermal energy added or removed?",
      hint: "Solid → liquid → gas needs energy added. Gas → liquid → solid gives energy out.",
      explain: `Energy removed: ${s.items.filter((i) => i.bin === 1).map((i) => i.label.replace(/^\S+ /, "").toLowerCase()).join("; ")}.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 1).length),
  );
}

/** Melting and boiling points for predicting states: [name, melt, boil]. */
const MP_BP: [string, number, number][] = [
  ["water", 0, 100], ["ethanol", -114, 78], ["mercury", -39, 357], ["oxygen", -218, -183], ["nitrogen", -210, -196],
  ["iron", 1538, 2862], ["table salt", 801, 1465], ["bromine", -7, 59], ["gallium", 30, 2400], ["ammonia", -78, -33], ["lead", 327, 1749],
];

/** MS-PS1-4 — predict the state from melting and boiling points. */
export const predictState = mix(
  () => {
    const [name, melt, boil] = pick(MP_BP);
    const st = pick(STATES);
    const t = st === "solid" ? melt - pick([5, 10, 20, 50]) : st === "gas" ? boil + pick([5, 10, 20, 50]) : Math.round((melt + (boil - melt) * pick([0.2, 0.5, 0.8])) / 5) * 5;
    const s2 = stateAt(t, melt, boil);
    return make(
      {
        key: `ps-${name}-${t}`,
        prompt: `${name[0].toUpperCase()}${name.slice(1)} melts at ${ns(melt)} °C and boils at ${ns(boil)} °C. What state is it in at ${ns(t)} °C?`,
        hint: "Below the melting point: solid. Between melting and boiling points: liquid. Above the boiling point: gas.",
        explain: `${ns(t)} °C is ${s2 === "solid" ? `below ${ns(melt)} °C` : s2 === "gas" ? `above ${ns(boil)} °C` : `between ${ns(melt)} °C and ${ns(boil)} °C`}, so it's a ${s2}.`,
      },
      label(s2[0].toUpperCase() + s2.slice(1), STATES.filter((x) => x !== s2).map((x) => x[0].toUpperCase() + x.slice(1))),
    );
  },
  () => {
    const t = pick([25, -50, 50, 150]);
    const want = pick(STATES);
    const fits = MP_BP.filter(([, m, b]) => stateAt(t, m, b) === want);
    const not = MP_BP.filter(([, m, b]) => stateAt(t, m, b) !== want);
    if (!fits.length || not.length < 3) return predictState();
    const right = pick(fits);
    const rows = shuffle([right, ...shuffle(not).slice(0, 3)]);
    return make(
      {
        key: `which-${t}-${want}-${right[0]}-${rows.map((r) => r[0][0]).join("")}`,
        prompt: `Which substance is a ${want} at ${ns(t)} °C?`,
        visual: { kind: "table", header: ["Substance", "Melts at (°C)", "Boils at (°C)"], rows: rows.map(([n, m, b]) => [n, ns(m), ns(b)]) },
        needsVisual: true,
        hint: `A ${want} at ${ns(t)} °C has ${want === "solid" ? "a melting point above it" : want === "gas" ? "a boiling point below it" : "its melting point below it and boiling point above it"}.`,
        explain: `${right[0][0].toUpperCase()}${right[0].slice(1)} melts at ${ns(right[1])} °C and boils at ${ns(right[2])} °C, so at ${ns(t)} °C it's a ${want}.`,
      },
      label(right[0], rows.filter((r) => r !== right).map((r) => r[0])),
    );
  },
);

/** MS-PS1-4 — thermal energy depends on temperature and on how much stuff there is. */
export const thermalEnergy = mix(
  () => {
    const t = rand(30, 80);
    const [va, vb] = shuffle([50, 100, 150, 200]).slice(0, 2);
    const more = va > vb ? "A" : "B";
    return make(
      {
        key: `vol-${t}-${va}-${vb}`,
        prompt: "Both beakers of water are at the same temperature. Which has more thermal energy?",
        visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: va, thermometer: t, label: "A" }, { glass: "beaker", volume: vb, thermometer: t, label: "B" }], joiner: null },
        needsVisual: true,
        hint: "Same temperature means the same average particle speed. Which one has more particles?",
        explain: `Beaker ${more} has more water, so more particles moving at the same average speed: more thermal energy in total.`,
      },
      label(`Beaker ${more}`, [`Beaker ${more === "A" ? "B" : "A"}`, "They have the same"]),
    );
  },
  () => {
    const v = pick([100, 150, 200]);
    let [ta, tb] = [rand(10, 90), rand(10, 90)];
    if (Math.abs(ta - tb) < 10) tb = ta > 50 ? ta - 30 : ta + 30;
    const more = ta > tb ? "A" : "B";
    return make(
      {
        key: `temp-${v}-${ta}-${tb}`,
        prompt: "Both beakers hold the same amount of water. Which has more thermal energy?",
        visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: v, thermometer: ta, label: "A" }, { glass: "beaker", volume: v, thermometer: tb, label: "B" }], joiner: null },
        needsVisual: true,
        hint: "Same number of particles. Which particles are moving faster?",
        explain: `Beaker ${more} is hotter (${Math.max(ta, tb)} °C), so its particles move faster: more thermal energy.`,
      },
      label(`Beaker ${more}`, [`Beaker ${more === "A" ? "B" : "A"}`, "They have the same"]),
    );
  },
  () => {
    const hot = rand(50, 90);
    const cold = rand(5, 25);
    return make(
      {
        key: `mixflow-${hot}-${cold}`,
        prompt: `A metal spoon at ${hot} °C is dropped into water at ${cold} °C. Which way does thermal energy flow?`,
        hint: "Energy flows from hot to cold until both are the same temperature.",
        explain: `From the ${hot} °C spoon to the ${cold} °C water. The spoon's particles slow down and the water's speed up until they reach the same temperature.`,
      },
      label("From the spoon to the water", ["From the water to the spoon", "No energy flows", "Both ways equally, all the time"]),
    );
  },
  bank("te", [
    { k: "bath", p: "A cup of cocoa is at 70 °C. A bathtub of water is at 40 °C. Which has more thermal energy?", a: "The bathtub: it has far more particles", w: ["The cocoa: it's hotter", "They're the same", "Neither has any"], h: "Thermal energy is the total energy of all the particles.", e: "The cocoa's particles move faster on average, but the bathtub has so many more particles that its total is bigger." },
    { k: "diff", p: "What's the difference between temperature and thermal energy?", a: "Temperature is the average particle energy; thermal energy is the total", w: ["They're exactly the same", "Temperature is the total; thermal energy is the average", "Thermal energy is only for gases"], h: "One depends on how much stuff there is.", e: "Temperature doesn't depend on amount; thermal energy does." },
    { k: "tire", p: "A car's tire pressure goes up after a long drive. Why?", a: "The air inside warms, so its particles hit the tire walls harder and more often", w: ["Air particles get bigger", "More air leaks in", "The tire shrinks"], h: "Driving warms the tires.", e: "Hotter gas particles move faster, so they push harder on the walls: higher pressure." },
  ]),
);

/* ======================================================= 5. ATOMS ARE NEVER LOST */

/** Equations (balanced by the helper): [reactants, products, name]. */
const EQS: [string[], string[], string][] = [
  [["H₂", "O₂"], ["H₂O"], "hydrogen burning"],
  [["N₂", "H₂"], ["NH₃"], "making ammonia"],
  [["CH₄", "O₂"], ["CO₂", "H₂O"], "methane burning"],
  [["Na", "Cl₂"], ["NaCl"], "making salt"],
  [["Mg", "O₂"], ["MgO"], "magnesium burning"],
  [["H₂", "Cl₂"], ["HCl"], "making hydrogen chloride"],
  [["Fe", "O₂"], ["Fe₂O₃"], "iron rusting"],
  [["Al", "O₂"], ["Al₂O₃"], "aluminum reacting with oxygen"],
  [["H₂O₂"], ["H₂O", "O₂"], "hydrogen peroxide breaking down"],
  [["Zn", "HCl"], ["ZnCl₂", "H₂"], "zinc in acid"],
  [["C₃H₈", "O₂"], ["CO₂", "H₂O"], "propane burning in a grill"],
  [["CO", "O₂"], ["CO₂"], "carbon monoxide burning"],
  [["Cu", "O₂"], ["CuO"], "copper heated in air"],
  [["Ca", "O₂"], ["CaO"], "calcium burning"],
  [["K", "H₂O"], ["KOH", "H₂"], "potassium in water"],
  [["H₂O"], ["H₂", "O₂"], "splitting water with electricity"],
  [["CO₂", "H₂O"], ["C₆H₁₂O₆", "O₂"], "photosynthesis"],
  [["C₆H₁₂O₆", "O₂"], ["CO₂", "H₂O"], "respiration"],
  [["C", "O₂"], ["CO₂"], "carbon burning"],
  [["CaCO₃"], ["CaO", "CO₂"], "heating limestone"],
  [["NaHCO₃", "HCl"], ["NaCl", "H₂O", "CO₂"], "baking soda and acid"],
];
const coefsOf = (r: string[], p: string[]) => balance(r, p).coefficients!;

/** A chem-reaction picture with the given coefficients. */
function rxn(r: string[], p: string[], c: number[], unbalanced = false): Visual {
  return {
    kind: "chem-reaction",
    reactants: r.map((f, i) => ({ formula: f, coef: c[i] })),
    products: p.map((f, i) => ({ formula: f, coef: c[r.length + i] })),
    ...(unbalanced ? { unbalanced: true } : {}),
  };
}

const eqText = (r: string[], p: string[], c: number[]) =>
  `${r.map((f, i) => `${c[i] > 1 ? c[i] : ""}${f}`).join(" + ")} → ${p.map((f, i) => `${c[r.length + i] > 1 ? c[r.length + i] : ""}${f}`).join(" + ")}`;

/** MS-PS1-5 — count atoms on each side of a balanced equation. */
export const countEquation = mix(
  () => {
    const [r, p, name] = pick(EQS);
    const c = coefsOf(r, p);
    const side = rand(0, 1);
    const atoms = side ? sideAtoms(p, c.slice(r.length)) : sideAtoms(r, c);
    const [s, n] = pick(Object.entries(atoms));
    const forms = side ? p : r;
    const cs = side ? c.slice(r.length) : c;
    const parts = forms
      .map((f, i) => [f, cs[i], parseFormula(f).atoms[s] ?? 0] as const)
      .filter(([, , a]) => a > 0)
      .map(([f, k, a]) => `${k > 1 ? `${k} × ${a}` : a} in ${k > 1 ? k : ""}${f}`);
    return make(
      {
        key: `cnt-${name}-${side}-${s}`,
        prompt: `In ${name}, how many ${elName(s)} atoms are on the ${side ? "product (right)" : "reactant (left)"} side?`,
        visual: rxn(r, p, c),
        needsVisual: true,
        hint: "Multiply the big number in front (coefficient) by the small subscript, then add up every term on that side.",
        explain: `${parts.join(", plus ")}: ${n} ${elName(s)} atoms. The other side has ${n} too.`,
      },
      keypad(n),
    );
  },
  () => {
    const [r, p, name] = pick(EQS);
    const c = coefsOf(r, p);
    const total = Object.values(sideAtoms(r, c)).reduce((a, b) => a + b, 0);
    return make(
      {
        key: `all-${name}`,
        prompt: `In ${name}, how many atoms are there in total on each side?`,
        visual: rxn(r, p, c),
        needsVisual: true,
        hint: "Count every atom on one side (coefficient × subscript for each element). The other side must match.",
        explain: `Each side has ${total} atoms: ${Object.entries(sideAtoms(r, c)).map(([s, n]) => `${n} ${s}`).join(", ")}.`,
      },
      keypad(total),
    );
  },
);

/** MS-PS1-5 — is the equation balanced? Which element isn't? */
export const isBalanced = mix(
  () => {
    const [r, p, name] = pick(EQS);
    const c = coefsOf(r, p);
    const ok = rand(0, 1) === 1;
    let shown = c;
    if (!ok) {
      do {
        shown = [...c];
        const i = rand(0, c.length - 1);
        shown[i] = Math.max(1, shown[i] + pick([-1, 1]));
      } while (shown.every((x, i) => x === c[i]));
    }
    const L = sideAtoms(r, shown.slice(0, r.length));
    const R = sideAtoms(p, shown.slice(r.length));
    const bad = Object.keys(L).filter((s) => L[s] !== R[s]);
    return make(
      {
        key: `bal-${name}-${shown.join("")}`,
        prompt: `Is this equation for ${name} balanced?`,
        visual: rxn(r, p, shown, !ok),
        needsVisual: true,
        hint: "Count each kind of atom on the left and on the right. Balanced means every element matches.",
        explain: ok
          ? `Yes. Every element has the same number of atoms on both sides: ${Object.entries(L).map(([s, n]) => `${n} ${s}`).join(", ")}.`
          : `No. ${bad.map((s) => `${s}: ${L[s]} on the left, ${R[s] ?? 0} on the right`).join("; ")}. Balanced: ${eqText(r, p, c)}.`,
      },
      label(ok ? "Yes, it's balanced" : "No, it isn't balanced", [ok ? "No, it isn't balanced" : "Yes, it's balanced"]),
    );
  },
  () => {
    let r: string[], p: string[], name: string, c: number[], shown: number[], bad: string[];
    do {
      [r, p, name] = pick(EQS);
      c = coefsOf(r, p);
      shown = [...c];
      const i = rand(0, c.length - 1);
      shown[i] = Math.max(1, shown[i] + pick([-1, 1]));
      const L = sideAtoms(r, shown.slice(0, r.length));
      const R = sideAtoms(p, shown.slice(r.length));
      bad = Object.keys(L).filter((s) => L[s] !== R[s]);
    } while (bad.length !== 1);
    const all = Object.keys(sideAtoms(r, c));
    const L = sideAtoms(r, shown.slice(0, r.length));
    const R = sideAtoms(p, shown.slice(r.length));
    const others = ["H", "O", "C", "N", "Cl", "Na", "Fe"].filter((x) => !all.includes(x));
    return make(
      {
        key: `which-${name}-${shown.join("")}`,
        prompt: "This equation isn't balanced. Which element doesn't match?",
        visual: rxn(r, p, shown, true),
        needsVisual: true,
        hint: "Make a tally for each element: left side and right side.",
        explain: `${elName(bad[0])[0].toUpperCase()}${elName(bad[0]).slice(1)}: ${L[bad[0]]} on the left but ${R[bad[0]]} on the right. Balanced: ${eqText(r, p, c)}.`,
      },
      label(bad[0], [...all.filter((x) => x !== bad[0]), ...others]),
    );
  },
);

/** Equations small enough for the balance activity (coefficients ≤ 6, not all 1). */
const BALANCE_EQS = EQS.filter(([r, p]) => {
  const c = coefsOf(r, p);
  return c.some((x) => x > 1) && Math.max(...c) <= 6;
});

/** MS-PS1-5 — particle models: atoms are rearranged, never lost. */
export const atomsRearrange = mix(
  () => {
    const [r, p, name, k] = pick([
      [["H₂", "O₂"], ["H₂O"], "hydrogen and oxygen make water", pick([1, 2])],
      [["N₂", "H₂"], ["NH₃"], "nitrogen and hydrogen make ammonia", pick([1, 2])],
      [["H₂", "Cl₂"], ["HCl"], "hydrogen and chlorine make hydrogen chloride", pick([1, 2, 3])],
      [["CH₄", "O₂"], ["CO₂", "H₂O"], "methane burns", pick([1, 2])],
      [["CO", "O₂"], ["CO₂"], "carbon monoxide burns", pick([1, 2])],
    ] as [string[], string[], string, number][]);
    const c = coefsOf(r, p).map((x) => x * k);
    const ask = pick(p);
    const n = c[r.length + p.indexOf(ask)];
    return make(
      {
        key: `make-${name}-${k}-${ask}`,
        prompt: `When ${name}, all of these molecules react. How many ${ask} molecules form?`,
        visual: { kind: "chem-particles", panels: [{ species: r.map((f, i) => ({ formula: f, count: c[i] })), label: "Before" }] },
        needsVisual: true,
        hint: `Count the atoms of each element before. Every atom must end up in a product. How many ${ask} can those atoms make?`,
        explain: `Before: ${Object.entries(sideAtoms(r, c)).map(([s, x]) => `${x} ${s}`).join(", ")}. Those atoms make ${eqText(r, p, c).split(" → ")[1]}: ${n} ${ask}.`,
      },
      keypad(n),
    );
  },
  () => {
    const [r, p, name, k] = pick([
      [["H₂", "O₂"], ["H₂O"], "water forms", pick([1, 2])],
      [["N₂", "H₂"], ["NH₃"], "ammonia forms", pick([1, 2])],
      [["CH₄", "O₂"], ["CO₂", "H₂O"], "methane burns", pick([1, 2])],
      [["H₂", "Cl₂"], ["HCl"], "hydrogen chloride forms", pick([2, 3])],
    ] as [string[], string[], string, number][]);
    const c = coefsOf(r, p).map((x) => x * k);
    const atoms = sideAtoms(r, c);
    const [s, n] = pick(Object.entries(atoms));
    const side = rand(0, 1);
    return make(
      {
        key: `cons-${name}-${k}-${s}-${side}`,
        prompt: `As ${name}, how many ${elName(s)} atoms are there ${side ? "after" : "before"}?`,
        visual: { kind: "chem-particles", panels: [{ species: r.map((f, i) => ({ formula: f, count: c[i] })), label: "Before" }, { species: p.map((f, i) => ({ formula: f, count: c[r.length + i] })), label: "After" }] },
        needsVisual: true,
        hint: "Count the balls of that colour in the box. Atoms are only rearranged, so before and after match.",
        explain: `${n} ${elName(s)} atoms before and ${n} after. The atoms were rearranged into new molecules, none created or destroyed.`,
      },
      keypad(n),
    );
  },
  bank("rearr", [
    { k: "what", p: "In a chemical reaction, what happens to the atoms?", a: "They're rearranged into new molecules", w: ["Some are destroyed", "New atoms are created", "They turn into different elements"], h: "Count the atoms before and after any reaction.", e: "Reactions break bonds and make new ones. The same atoms are there before and after, just joined differently." },
    { k: "element", p: "Can a chemical reaction turn carbon atoms into gold atoms?", a: "No: the elements stay the same, only their arrangement changes", w: ["Yes, with enough heat", "Yes, with a catalyst", "Only in a closed container"], h: "What decides which element an atom is?", e: "A chemical reaction never changes the protons in a nucleus, so carbon stays carbon." },
  ]),
);

/** MS-PS1-5 — Do it: balance an equation. */
export function balanceEquation(): Question {
  const [r, p, name] = pick(BALANCE_EQS);
  const c = coefsOf(r, p);
  return make(
    {
      key: `be-${name}`,
      prompt: `Balance the equation for ${name}.`,
      hint: "Change only the big numbers in front. Start with an element that appears in just one substance on each side; leave H and O (or a lone element) for last.",
      explain: `${eqText(r, p, c)}. Now every element has the same number of atoms on both sides.`,
    },
    act({ kind: "chem-balance", reactants: r, products: p, max: 6 }, c[0]),
  );
}

/** MS-PS1-5 — Do it: fill in the missing coefficients. */
export function finishBalance(): Question {
  const [r, p, name] = pick(BALANCE_EQS);
  const c = coefsOf(r, p);
  const blanks = new Set(shuffle(c.map((_, i) => i)).slice(0, rand(1, Math.min(2, c.length - 1))));
  const given = c.map((x, i) => (blanks.has(i) ? null : x));
  return make(
    {
      key: `fb-${name}-${[...blanks].sort().join("")}`,
      prompt: `Some coefficients are already set. Finish balancing ${name}.`,
      hint: "Count each element with the numbers you're given, then pick coefficients that make both sides match.",
      explain: `${eqText(r, p, c)}.`,
    },
    act({ kind: "chem-balance", reactants: r, products: p, given, max: 6 }, c[[...blanks][0]]),
  );
}

/** MS-PS1-5 — coefficients versus subscripts. */
export const coefficients = mix(
  () => {
    const [f, name] = pick([["H₂O", "water"], ["CO₂", "carbon dioxide"], ["NH₃", "ammonia"], ["O₂", "oxygen"], ["CH₄", "methane"], ["H₂O₂", "hydrogen peroxide"]] as [string, string][]);
    const k = rand(2, 6);
    const ask = rand(0, 1);
    const [s, n] = pick(atomsOf(f));
    return make(
      {
        key: `cs-${f}-${k}-${ask}-${s}`,
        prompt: ask ? `How many molecules does ${k}${f} stand for?` : `How many ${elName(s)} atoms are in ${k}${f}?`,
        speech: ask ? `How many molecules does ${k} ${f} stand for?` : `How many ${elName(s)} atoms are in ${k} ${f}?`,
        hint: "The coefficient (big number in front) counts molecules. The subscript counts atoms inside one molecule.",
        explain: ask ? `${k}${f} means ${k} molecules of ${name}.` : `${k} molecules × ${n} ${elName(s)} atom${n === 1 ? "" : "s"} each = ${k * n}.`,
      },
      keypad(ask ? k : k * n),
    );
  },
  bank("cs", [
    { k: "peroxide", p: "To balance H₂ + O₂ → H₂O, Sam changes H₂O to H₂O₂. What's wrong?", a: "H₂O₂ is a different substance; change coefficients, not subscripts", w: ["Nothing: it balances now", "He should change O₂ to O", "He should add a third reactant"], h: "Changing a subscript changes what the substance is.", e: "H₂O₂ is hydrogen peroxide, not water. The right answer is 2H₂ + O₂ → 2H₂O." },
    { k: "two", p: "In 2H₂O, what does the 2 in front mean?", a: "Two water molecules", w: ["Two oxygen atoms in each molecule", "Water with 2 hydrogen atoms only", "Twice as heavy hydrogen"], h: "Numbers in front count whole molecules.", e: "2H₂O is two molecules, each with 2 H and 1 O: 4 H and 2 O in all." },
    { k: "sub", p: "In H₂O, what does the small 2 mean?", a: "Each molecule has 2 hydrogen atoms", w: ["There are 2 water molecules", "Water has 2 oxygen atoms", "The water is 2 °C"], h: "A subscript belongs to the symbol just before it.", e: "The subscript 2 tells you each water molecule has two H atoms. O has no subscript, so one O." },
    { k: "why", p: "Why must chemical equations be balanced?", a: "Atoms aren't created or destroyed, so each side has the same atoms", w: ["To make them look neat", "So the products weigh more", "Because reactions make new elements"], h: "Think about conservation.", e: "A balanced equation shows that every atom in the reactants ends up in the products." },
  ]),
);

/** Reactions with masses (g, from rounded atomic masses): [reactants, products, names, masses]. */
const MASS_RXNS: [string, string, number[], string[]][] = [
  ["hydrogen + oxygen → water", "2H₂ + O₂ → 2H₂O", [4, 32, 36], ["hydrogen", "oxygen", "water"]],
  ["carbon + oxygen → carbon dioxide", "C + O₂ → CO₂", [12, 32, 44], ["carbon", "oxygen", "carbon dioxide"]],
  ["magnesium + oxygen → magnesium oxide", "2Mg + O₂ → 2MgO", [48, 32, 80], ["magnesium", "oxygen", "magnesium oxide"]],
  ["iron + sulfur → iron sulfide", "Fe + S → FeS", [56, 32, 88], ["iron", "sulfur", "iron sulfide"]],
  ["sodium + chlorine → salt", "2Na + Cl₂ → 2NaCl", [46, 71, 117], ["sodium", "chlorine", "sodium chloride"]],
  ["copper + oxygen → copper oxide", "2Cu + O₂ → 2CuO", [128, 32, 160], ["copper", "oxygen", "copper oxide"]],
];

/** MS-PS1-5 — total mass before = total mass after. */
export const massConserved = mix(
  () => {
    const [, eq, m, names] = pick(MASS_RXNS);
    const k = pick([0.5, 1, 2, 3]);
    const ms = m.map((x) => clean(x * k));
    const unknown = rand(0, 2);
    const rows = names.map((n, i) => [n, i === unknown ? "?" : ms[i]]);
    return make(
      {
        key: `mass-${eq}-${k}-${unknown}`,
        prompt: unknown === 2 ? `${ms[0]} g of ${names[0]} reacts completely with ${ms[1]} g of ${names[1]}. What mass of ${names[2]} forms?` : `${ms[unknown === 0 ? 1 : 0]} g of ${names[unknown === 0 ? 1 : 0]} reacts completely to make ${ms[2]} g of ${names[2]}. What mass of ${names[unknown]} reacted?`,
        visual: { kind: "table", header: ["Substance", "Mass (g)"], rows },
        unit: "g",
        hint: unknown === 2 ? "Mass of reactants = mass of products. Add the reactants." : "Mass of reactants = mass of products. Subtract the reactant you know from the product.",
        explain: unknown === 2 ? `${ms[0]} + ${ms[1]} = ${ms[2]} g. The same atoms, so the same mass (${eq}).` : `${ms[2]} − ${ms[unknown === 0 ? 1 : 0]} = ${ms[unknown]} g. Mass is conserved.`,
      },
      keypad(ms[unknown]),
    );
  },
  () => {
    const kind = rand(0, 2);
    const a = rand(20, 80);
    const b = rand(100, 300);
    const [prompt, ans, why] = [
      [`${a} g of sugar dissolves completely in ${b} g of water. What is the mass of the sugar water?`, a + b, `${a} + ${b} = ${a + b} g. Dissolving doesn't destroy any particles.`],
      [`An ice cube of ${a} g melts completely in a sealed bag. What is the mass of the water?`, a, `Still ${a} g: the same water molecules, just liquid now.`],
      [`${a} g of baking soda and ${b} g of vinegar react in a sealed bottle. What is the total mass after?`, a + b, `${a} + ${b} = ${a + b} g. The sealed bottle keeps the gas in, so no mass is lost.`],
    ][kind] as [string, number, string];
    return make({ key: `phys-${kind}-${a}-${b}`, prompt, unit: "g", hint: "In a closed system nothing gets in or out, so the total mass stays the same.", explain: why }, keypad(ans));
  },
);

/** MS-PS1-5 — open and closed systems on a balance. */
export const openClosed = mix(
  () => {
    const before = rand(1500, 2200) / 10;
    const closed = rand(0, 1) === 1;
    const lost = rand(8, 40) / 10;
    const after = closed ? before : clean(before - lost);
    const ask = rand(0, 1);
    const panels: Glass[] = [
      { glass: "flask", volume: 100, stopper: closed, balance: before, label: "Before" },
      { glass: "flask", volume: 100, stopper: closed, bubbles: 8, balance: ask && !closed ? after : "?", label: "After" },
    ];
    if (closed || !ask)
      return make(
        {
          key: `ask-${closed}-${before}-${lost}`,
          prompt: closed ? "Baking soda and vinegar react in a stoppered flask. What will the balance read after?" : `The flask is open. After the fizzing stops, the balance reads ${after} g. Why is it lower?`,
          visual: { kind: "chem-beaker", panels: closed ? panels : [panels[0], { ...panels[1], balance: after }], joiner: "→", joinerLabel: "react" },
          needsVisual: closed,
          unit: closed ? "g" : undefined,
          hint: closed ? "With a stopper, the gas can't escape. Nothing gets in or out." : "Where did the bubbles go?",
          explain: closed ? `${before} g: in a closed system the total mass stays the same.` : `Carbon dioxide gas escaped into the air. The mass wasn't destroyed; it left the open system.`,
        },
        closed ? keypad(before) : label("A gas escaped into the air", ["Some atoms were destroyed", "The balance is broken", "The liquid got lighter as it cooled"]),
      );
    return make(
      {
        key: `lost-${before}-${lost}`,
        prompt: "The flask is open, so gas escapes. How many grams of gas left the flask?",
        visual: { kind: "chem-beaker", panels, joiner: "→", joinerLabel: "react" },
        needsVisual: true,
        unit: "g",
        hint: "Subtract the after reading from the before reading.",
        explain: `${before} − ${after} = ${clean(lost)} g of carbon dioxide escaped.`,
      },
      keypad(clean(lost)),
    );
  },
  bank("oc", [
    { k: "def", p: "What is a closed system?", a: "One where no matter can get in or out", w: ["Any container with a lid off", "A system with no energy", "A room with the lights off"], h: "Think of a sealed bottle.", e: "In a closed system no matter enters or leaves, so the total mass stays the same." },
    { k: "steel", p: "Steel wool is burned on a balance and its mass goes UP. Why?", a: "Oxygen atoms from the air joined the iron", w: ["New iron atoms were made", "Heat has mass", "The balance got hot"], h: "Burning combines a substance with oxygen.", e: "Iron + oxygen → iron oxide. The oxygen came from the air, so the solid gains mass." },
    { k: "log", p: "A log burns and leaves a small pile of ash. Was mass destroyed?", a: "No: most atoms left as carbon dioxide and water vapor", w: ["Yes: fire destroys matter", "Yes: the ash is lighter", "No: the ash weighs the same as the log"], h: "Burning is an open system. Where did the smoke go?", e: "Weigh everything (log + oxygen in; ash + gases out) and the mass is the same." },
    { k: "balloon", p: "How could you show mass is conserved when baking soda and vinegar react?", a: "React them in a bottle sealed with a balloon and weigh it before and after", w: ["Weigh only the baking soda", "React them in an open bowl", "Weigh the empty bottle"], h: "Trap the gas.", e: "A sealed system keeps the CO₂ in, so the balance reads the same before and after." },
  ]),
);

/** MS-PS1-5 — Do it: run the reaction until a reactant runs out. */
export function reactMolecules(): Question {
  const [r, p, name] = pick([
    [["H₂", "O₂"], ["H₂O"], "water"],
    [["N₂", "H₂"], ["NH₃"], "ammonia"],
    [["H₂", "Cl₂"], ["HCl"], "hydrogen chloride"],
    [["CH₄", "O₂"], ["CO₂", "H₂O"], "carbon dioxide and water"],
    [["CO", "O₂"], ["CO₂"], "carbon dioxide"],
  ] as [string[], string[], string][]);
  const c = coefsOf(r, p);
  let counts: number[];
  let runs: number;
  let made: number;
  do {
    counts = r.map((_, i) => c[i] * rand(1, 4) + rand(0, c[i]));
    runs = Math.min(...counts.map((n, i) => Math.floor(n / c[i])));
    made = runs * p.reduce((t, _, i) => t + c[r.length + i], 0);
  } while (counts.reduce((a, b) => a + b, 0) > 16 || made > 16 || runs < 1);
  const left = counts.map((n, i) => n - runs * c[i]);
  return make(
    {
      key: `rm-${name}-${counts.join("-")}`,
      prompt: `Tap React! to make ${name} until nothing more can react.`,
      hint: `Each reaction uses ${r.map((f, i) => `${c[i]} ${f}`).join(" and ")}. Keep going until one of them runs out.`,
      explain: `It reacts ${runs} time${runs === 1 ? "" : "s"}. ${left.some((x) => x > 0) ? `Left over: ${r.map((f, i) => (left[i] ? `${left[i]} ${f}` : "")).filter(Boolean).join(", ")}. ` : ""}Count the atoms: the same number before and after.`,
    },
    act({ kind: "chem-mix", mode: "limiting", reactants: r.map((f, i) => ({ formula: f, count: counts[i] })), products: p }, runs),
  );
}

/** MS-PS1-5 — spot the mistake about conservation. */
export const conservationMistakes = bank("cm", [
  { k: "log", p: "Leo: 'A 2 kg log burns to 0.1 kg of ash, so 1.9 kg of matter was destroyed.' What's the mistake?", a: "The rest left as gases (CO₂ and water vapor)", w: ["Nothing: fire destroys mass", "The ash should weigh 2 kg", "Logs have no mass"], h: "Burning happens in an open system.", e: "Count the gases too, and the mass is conserved." },
  { k: "rust", p: "Mia: 'Rusty nails weigh more than new ones, so rusting creates atoms.' What's the mistake?", a: "Oxygen and water from the air joined the iron", w: ["Rust is just paint", "Iron atoms split in two", "Nothing: rusting creates atoms"], h: "Where could the extra mass come from?", e: "Rusting adds oxygen atoms from the air, so the solid gains mass. No atoms are created." },
  { k: "bag", p: "Sam: 'My sealed bag of baking soda and vinegar puffed up, so it must weigh more now.' Is he right?", a: "No: the gas was made from atoms already in the bag; the mass is the same", w: ["Yes: gas adds mass", "Yes: puffing up adds air", "No: it weighs less"], h: "Did anything get into the sealed bag?", e: "The bag's volume grew, but no atoms entered or left, so its mass didn't change." },
  { k: "dissolve", p: "Ava: '10 g of salt in 100 g of water makes 100 g of salt water, because the salt disappears.' What's the mistake?", a: "The salt is still there: the mass is 110 g", w: ["The mass is 90 g", "Salt has no mass in water", "Nothing"], h: "Can you taste the salt?", e: "Dissolved salt is spread out, not gone: 10 + 100 = 110 g." },
  { k: "balanced", p: "Kai writes H₂ + O₂ → H₂O and says it shows conservation. What's wrong?", a: "It has 2 O atoms on the left but only 1 on the right", w: ["Nothing is wrong", "It has too much hydrogen on the right", "Water should be HO"], h: "Count oxygen atoms on each side.", e: "Balanced: 2H₂ + O₂ → 2H₂O, with 4 H and 2 O on each side." },
  { k: "melt", p: "Zoe: 'When ice melts, it loses mass because liquid is lighter.' Is she right?", a: "No: the same molecules, so the same mass", w: ["Yes: liquids are lighter", "Yes: melting destroys molecules", "No: it gains mass"], h: "Does melting add or remove molecules?", e: "Melting changes the state, not the number of molecules: mass stays the same." },
  { k: "candle", p: "Ben weighs a burning candle every 10 minutes and it gets lighter. Which statement is correct?", a: "Wax atoms leave as CO₂ and water vapor, so the candle's mass falls", w: ["Wax is destroyed by the flame", "Light carries the mass away", "The balance is faulty"], h: "Burning candles are open systems.", e: "The wax reacts with oxygen and leaves as gases. If you trapped the gases, the total mass would stay the same." },
  { k: "count", p: "In 2Mg + O₂ → 2MgO, Ana counts 2 Mg on the left and 1 Mg on the right. What did she miss?", a: "The 2 in front of MgO means 2 Mg atoms on the right", w: ["Mg isn't in MgO", "The equation is unbalanced", "O₂ contains Mg"], h: "Coefficients multiply everything in the formula.", e: "2MgO has 2 Mg and 2 O. Both sides have 2 Mg and 2 O." },
  { k: "gas", p: "A flask is weighed, a reaction gives off gas, and the mass drops by 2 g. What should Raj conclude?", a: "About 2 g of gas escaped from the open flask", w: ["2 g of matter was destroyed", "The reaction made new elements", "Gas has no mass"], h: "Gases have mass too.", e: "Gas escaping from an open container carries mass with it." },
  { k: "photo", p: "A seed grows into a big tree. Where does most of the tree's mass come from?", a: "Carbon dioxide from the air and water", w: ["The soil only", "Nothing: plants create mass", "Sunlight"], h: "Photosynthesis: CO₂ + H₂O → sugar + O₂.", e: "Plants build sugar and wood from CO₂ and water. Light provides energy, not atoms." },
  { k: "mix", p: "Noor mixes 50 mL of water and 50 mL of alcohol and gets only 96 mL. Has mass been lost?", a: "No: volume can shrink as particles fit together, but mass is conserved", w: ["Yes: 4 mL of mass vanished", "Yes: alcohol evaporates instantly", "No: the mass doubled"], h: "Mass and volume are different properties.", e: "Small molecules fit into gaps between others, so the volume shrinks. The total mass is unchanged." },
  { k: "fire", p: "Which law explains why we can't make something from nothing in a chemical reaction?", a: "Conservation of mass (atoms aren't created or destroyed)", w: ["The law of gravity", "The law of motion", "The law of averages"], h: "Antoine Lavoisier showed this in the 1700s.", e: "In any reaction, the mass of reactants equals the mass of products." },
]);

/* ===================================================== 6. HOT PACKS & COLD PACKS */

/** Reactions and processes in a beaker: [name, added, releases heat?, typical change °C (min, max)]. */
const THERMO: [string, string, boolean, number, number][] = [
  ["Water", "add calcium chloride", true, 8, 20],
  ["Water", "add ammonium chloride", false, 6, 12],
  ["Vinegar", "add baking soda", false, 3, 6],
  ["Hydrochloric acid", "add magnesium", true, 10, 25],
  ["Water", "add ammonium nitrate", false, 10, 18],
  ["Hydrogen peroxide", "add yeast", true, 6, 15],
  ["Acid", "add a base", true, 5, 10],
  ["Water", "add citric acid and baking soda", false, 5, 10],
  ["Vinegar", "add steel wool", true, 3, 8],
  ["Water", "add sodium hydroxide", true, 10, 20],
];

/** MS-PS1-6 — does it release or absorb thermal energy? Read the thermometers. */
export const releaseAbsorb = mix(
  () => {
    const [what, add, exo, lo, hi] = pick(THERMO);
    const t1 = rand(18, 24);
    const d = rand(lo, hi);
    const t2 = exo ? t1 + d : t1 - d;
    return make(
      {
        key: `ra-${add}-${t1}-${t2}`,
        prompt: "Does this change release or absorb thermal energy?",
        visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 100, label: what, thermometer: t1 }, { glass: "beaker", volume: 110, label: "After", thermometer: t2 }], joiner: "→", joinerLabel: add },
        needsVisual: true,
        hint: "If the mixture gets warmer, energy is coming out into the water. If it gets colder, energy is being taken in.",
        explain: exo ? `It warmed from ${t1} °C to ${t2} °C: it releases thermal energy (exothermic).` : `It cooled from ${t1} °C to ${t2} °C: it absorbs thermal energy (endothermic).`,
      },
      label(exo ? "Releases energy (exothermic)" : "Absorbs energy (endothermic)", [exo ? "Absorbs energy (endothermic)" : "Releases energy (exothermic)", "Neither: no energy changes"]),
    );
  },
  () => {
    const [what, add, exo, lo, hi] = pick(THERMO);
    const t1 = rand(18, 24);
    const d = rand(lo, hi);
    const t2 = exo ? t1 + d : t1 - d;
    return make(
      {
        key: `chg-${add}-${t1}-${t2}`,
        prompt: `What is the temperature change? (Use − for a drop.)`,
        speech: "Read both thermometers. What is the temperature change? Use minus for a drop.",
        visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 100, label: what, thermometer: t1 }, { glass: "beaker", volume: 110, label: "After", thermometer: t2 }], joiner: "→", joinerLabel: add },
        needsVisual: true,
        unit: "°C",
        hint: "Change = final temperature − starting temperature.",
        explain: `${t2} − ${t1} = ${ns(t2 - t1)} °C. ${exo ? "A rise: energy was released." : "A drop: energy was absorbed."}`,
      },
      keypad(t2 - t1),
    );
  },
  bank("ra", [
    { k: "exo", p: "What does 'exothermic' mean?", a: "Releases thermal energy, so the surroundings warm up", w: ["Absorbs thermal energy", "Happens only outdoors", "Doesn't involve energy"], h: "'Exo' means out.", e: "Exothermic reactions give energy out: burning, hand warmers, respiration." },
    { k: "endo", p: "What does 'endothermic' mean?", a: "Absorbs thermal energy, so the surroundings cool down", w: ["Releases thermal energy", "Ends quickly", "Makes light"], h: "'Endo' means in.", e: "Endothermic changes take energy in from their surroundings: cold packs, photosynthesis." },
  ]),
);

/** MS-PS1-6 — simple energy diagrams. */
export const energyDiagrams = mix(
  () => {
    const exo = rand(0, 1) === 1;
    const a = rand(2, 6) * 10;
    const b = exo ? a - rand(1, a / 10 - 1) * 10 : a + rand(1, 4) * 10;
    const peak = Math.max(a, b) + rand(2, 5) * 10;
    return make(
      {
        key: `dir-${a}-${b}-${peak}`,
        prompt: "Does this reaction release or absorb energy?",
        visual: { kind: "chem-energy", mode: "profile", reactants: a, products: b, peak, labels: { reactants: "Reactants", products: "Products", ea: null, dH: null } },
        needsVisual: true,
        hint: "Compare where the reaction starts (reactants) and ends (products). Ending lower means energy was given out.",
        explain: exo ? "The products have less stored energy than the reactants. The difference is released to the surroundings, which warm up." : "The products have more stored energy than the reactants. That energy is taken in from the surroundings, which cool down.",
      },
      label(exo ? "Releases energy" : "Absorbs energy", [exo ? "Absorbs energy" : "Releases energy", "Neither"]),
    );
  },
  () => {
    const exo = rand(0, 1) === 1;
    const a = rand(3, 9) * 10;
    const b = exo ? a - rand(1, a / 10 - 1) * 10 : a + rand(1, 5) * 10;
    const peak = Math.max(a, b) + rand(2, 4) * 10;
    return make(
      {
        key: `amt-${a}-${b}-${peak}`,
        prompt: `How much energy is ${exo ? "released" : "absorbed"}?`,
        visual: { kind: "chem-energy", mode: "profile", reactants: a, products: b, peak, labels: { reactants: a, products: b, ea: null, dH: "?" } },
        needsVisual: true,
        unit: "kJ",
        hint: "Find the difference between the reactants' level and the products' level.",
        explain: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)} kJ ${exo ? "released" : "absorbed"}.`,
      },
      keypad(Math.abs(a - b)),
    );
  },
  bank("ed", [
    { k: "hump", p: "Why does the energy diagram go up in a hump before coming down?", a: "Reactions need a little energy to get started", w: ["The products are always higher", "Energy is destroyed at the top", "The reaction goes backwards"], h: "A match needs a strike to light.", e: "The hump is the energy needed to start breaking bonds (activation energy), even for reactions that release energy overall." },
    { k: "store", p: "In an exothermic reaction, the released energy comes from…", a: "Energy stored in the reactants' bonds", w: ["Nowhere: it is created", "The thermometer", "The container"], h: "Energy can't be created.", e: "The products store less energy than the reactants; the difference is released as heat (and sometimes light)." },
  ]),
);

/** MS-PS1-6 — Do it: sort into releases heat and absorbs heat. */
export function sortThermal(): Question {
  const out = ["🔥 Wood burning", "🧤 A hand warmer heating up", "🏃 Your cells using sugar (respiration)", "🎆 Fireworks", "🧪 Calcium chloride dissolving", "🍲 A self-heating meal heating up", "🔩 Iron rusting"];
  const into = ["🧊 A cold pack getting cold", "🌿 Photosynthesis in a leaf", "🍳 Cooking an egg", "🧁 Baking a cake", "🫧 Baking soda and vinegar (gets colder)", "🧪 Ammonium chloride dissolving", "⚡ Splitting water with electricity"];
  const s = sortFrom(["Releases energy", "Absorbs energy"], [out, into], rand(5, 6));
  return make(
    {
      key: s.key,
      prompt: "Sort: does it release or absorb energy?",
      hint: "If it warms its surroundings, it releases energy (exothermic). If it needs energy put in, or cools things, it absorbs energy (endothermic).",
      explain: `Absorbs energy: ${s.items.filter((i) => i.bin === 1).map((i) => i.label.replace(/^\S+ /, "").toLowerCase()).join("; ")}.`,
    },
    act(s.activity, s.items.filter((i) => i.bin === 0).length),
  );
}

/** Temperature readings over time: a warm-up then a slow fall. */
function packData(peak: number, start: number): number[][] {
  const times = [0, 5, 10, 20, 30, 45, 60];
  const rise = peak - start;
  const shape = [0, 0.7, 1, 0.95, 0.85, 0.6, 0.35];
  return times.map((t, i) => [t, Math.round(start + rise * shape[i])]);
}

/** MS-PS1-6 — how a hand warmer works. */
export const handWarmer = mix(
  () => {
    const start = rand(15, 22);
    const peak = rand(48, 60);
    const data = packData(peak, start);
    const ask = rand(0, 1);
    const above = data.filter(([, T]) => T >= 40).map(([t]) => t);
    return make(
      {
        key: `hw-${start}-${peak}-${ask}`,
        prompt: ask ? "Test data for a hand warmer. What was the highest temperature?" : "Test data for a hand warmer. How many °C did it rise from the start to its highest?",
        visual: { kind: "table", header: ["Time (min)", ...data.map((d) => String(d[0]))], rows: [["Temp (°C)", ...data.map((d) => d[1])]] },
        needsVisual: true,
        unit: "°C",
        hint: ask ? "Find the biggest number in the temperature row." : "Highest temperature − starting temperature (at 0 min).",
        explain: ask ? `It peaked at ${peak} °C after 10 minutes${above.length ? `, and stayed at 40 °C or more until ${above[above.length - 1]} minutes` : ""}.` : `${peak} − ${start} = ${peak - start} °C.`,
      },
      keypad(ask ? peak : peak - start),
    );
  },
  bank("hw", [
    { k: "react", p: "A hand warmer packet holds iron powder, salt, water and charcoal. What reaction makes it warm?", a: "Iron reacting with oxygen from the air (rusting, but fast)", w: ["Salt melting", "Water freezing", "Charcoal burning with a flame"], h: "What makes iron rust?", e: "Iron + oxygen → iron oxide releases energy. The powder's huge surface area makes it fast enough to feel warm." },
    { k: "seal", p: "Why are hand warmers sold in airtight wrappers?", a: "To keep oxygen out until you want it to start", w: ["To keep the heat in for years", "To keep them dry from rain only", "Because the iron is poisonous"], h: "What does the reaction need from the air?", e: "With no oxygen, the iron can't react. Opening the wrapper lets air in and starts the reaction." },
    { k: "powder", p: "Why is the iron in a hand warmer a fine powder, not a solid nail?", a: "A powder has much more surface for oxygen to reach, so it reacts faster", w: ["Powder is heavier", "Nails don't contain iron", "Powder can't rust"], h: "A nail rusts over weeks.", e: "More exposed surface means more atoms can react at once: more heat, sooner." },
    { k: "salt", p: "What does the salt in a hand warmer do?", a: "Speeds up the iron's reaction with oxygen", w: ["Makes it colder", "Is the fuel", "Absorbs all the heat"], h: "Salty sea air makes cars rust faster.", e: "Salt water helps iron rust faster, so the warmer heats up quickly." },
    { k: "click", p: "A reusable hand warmer has a liquid and a metal disc. When you click the disc, it crystallizes and gets warm. Why?", a: "The liquid turning solid releases energy", w: ["Clicking adds electricity", "Freezing absorbs energy", "Air gets in and it burns"], h: "Turning liquid to solid gives energy out.", e: "Sodium acetate crystallizing releases energy. Boiling the pack melts it again, ready to reuse." },
    { k: "one", p: "Why can't you reuse an iron hand warmer?", a: "The iron has turned into iron oxide; the reactants are used up", w: ["The salt evaporated", "It's too hot", "It needs new batteries"], h: "What's left inside after it's cold?", e: "Once the iron has reacted, there's nothing left to release energy." },
  ]),
);

/** MS-PS1-6 — how a cold pack works. */
export const coldPack = mix(
  () => {
    const start = rand(20, 25);
    const low = rand(0, 6);
    const times = [0, 1, 2, 5, 10, 20];
    const shape = [0, 0.75, 1, 0.9, 0.65, 0.3];
    const data = times.map((t, i) => [t, Math.round(start - (start - low) * shape[i])]);
    const ask = rand(0, 1);
    return make(
      {
        key: `cp-${start}-${low}-${ask}`,
        prompt: ask ? "Test data for a cold pack. What was the lowest temperature?" : "Test data for a cold pack. By how many °C did it drop from the start to its lowest?",
        visual: { kind: "table", header: ["Time (min)", ...times.map(String)], rows: [["Temp (°C)", ...data.map((d) => d[1])]] },
        needsVisual: true,
        unit: "°C",
        hint: ask ? "Find the smallest number in the temperature row." : "Starting temperature − lowest temperature.",
        explain: ask ? `It reached ${low} °C after 2 minutes, then slowly warmed back up as heat flowed in from the room.` : `${start} − ${low} = ${start - low} °C.`,
      },
      keypad(ask ? low : start - low),
    );
  },
  bank("cp", [
    { k: "how", p: "An instant cold pack has a bag of water inside a bag of ammonium nitrate. How do you start it?", a: "Squeeze it to break the water bag so the solid dissolves", w: ["Put it in the freezer", "Heat it in a microwave", "Shake it with the bag sealed"], h: "The two parts must mix.", e: "When the water bag bursts, the solid dissolves and absorbs thermal energy." },
    { k: "where", p: "When a cold pack is on your ankle, which way does thermal energy flow?", a: "From your ankle into the pack", w: ["From the pack into your ankle", "Cold flows into your ankle", "No energy flows"], h: "Energy always flows from warmer to colder.", e: "The dissolving absorbs energy, cooling the pack, so heat flows from your warmer ankle into it." },
    { k: "urea", p: "Some cold packs use urea instead of ammonium nitrate. Why might a designer choose urea?", a: "It's safer to handle and ship, even if it doesn't get quite as cold", w: ["It gets hot instead", "It's a metal", "It doesn't dissolve"], h: "Designs balance criteria and constraints.", e: "Ammonium nitrate is a strong oxidizer that needs careful handling. Urea is safer, a trade-off designers weigh." },
    { k: "more", p: "To make a cold pack get colder, what could a designer change?", a: "Use more solid in the same amount of water", w: ["Use a bigger outer bag only", "Add warm water", "Use less solid"], h: "More dissolving absorbs more energy.", e: "More solid dissolving means more energy absorbed, so a bigger temperature drop (up to a limit)." },
    { k: "once", p: "Why do instant cold packs work only once?", a: "The solid has dissolved; the change is used up", w: ["The plastic melts", "The water freezes", "They run out of batteries"], h: "Can you un-mix it easily?", e: "Once dissolved, there's nothing left to absorb energy. You'd have to separate them again." },
    { k: "sport", p: "Why is an instant cold pack useful in a first-aid kit?", a: "It gets cold anywhere without a freezer", w: ["It stays cold for weeks", "It heats up injuries", "It can be eaten"], h: "Think about a soccer field.", e: "The endothermic dissolving makes cold on demand, which is perfect for sports injuries." },
  ]),
);

/** MS-PS1-6 — energy flows between the system and its surroundings. */
export const energyFlow = bank("ef", [
  { k: "exo", p: "In an exothermic reaction, energy flows…", a: "From the reacting chemicals to the surroundings", w: ["From the surroundings into the chemicals", "Nowhere", "Only into the container lid"], h: "The surroundings get warmer.", e: "The chemicals release energy, so the water, container and air around them warm up." },
  { k: "endo", p: "In an endothermic reaction, energy flows…", a: "From the surroundings into the reacting chemicals", w: ["From the chemicals to the surroundings", "Nowhere", "Out as light"], h: "The surroundings get colder.", e: "The chemicals take energy in, so their surroundings cool down." },
  { k: "cons", p: "A hand warmer releases 5,000 J of energy. Where does it go?", a: "Into your hands and the air: energy isn't destroyed", w: ["It disappears after an hour", "It turns into iron", "It stays in the packet forever"], h: "Energy is conserved.", e: "The energy spreads into the surroundings. The total amount of energy stays the same." },
  { k: "melt", p: "Ice melting in your hand makes your hand cold. Which is true?", a: "The melting absorbs thermal energy from your hand", w: ["The ice gives cold to your hand", "Your hand releases cold", "No energy moves"], h: "There's no such thing as 'cold' flowing.", e: "Energy flows from your warm hand into the ice. Losing energy makes your hand feel cold." },
  { k: "photo", p: "Photosynthesis takes in energy from sunlight. Is it exothermic or endothermic?", a: "Endothermic", w: ["Exothermic", "Neither", "Both at once"], h: "Does it take energy in or give it out?", e: "Plants absorb light energy and store it in sugar: an endothermic process." },
  { k: "resp", p: "Your body stays warm partly because of respiration in your cells. Is respiration exothermic or endothermic?", a: "Exothermic", w: ["Endothermic", "Neither", "It cools you down"], h: "It releases energy from food.", e: "Glucose + oxygen → carbon dioxide + water releases energy, some as heat." },
  { k: "insulate", p: "A hand warmer is wrapped in fabric. Why?", a: "To slow the energy flow so it stays warm longer and doesn't burn", w: ["To stop the reaction completely", "To make it colder", "To add oxygen"], h: "Fabric is an insulator.", e: "Slowing the energy transfer spreads the warmth over a longer time at a safe temperature." },
  { k: "bigger", p: "Two identical hand warmers react. One is in 100 mL of water, one in 500 mL. Which water warms more?", a: "The 100 mL: the same energy spreads through less water", w: ["The 500 mL", "Both warm the same", "Neither warms"], h: "The same energy shared among fewer particles.", e: "Equal energy released; a smaller amount of water gets a bigger temperature rise." },
  { k: "double", p: "If you double the amount of reactants in a hand warmer, what happens to the energy released?", a: "About twice as much energy is released", w: ["It stays the same", "It halves", "None is released"], h: "Each bit of iron that reacts gives out the same energy.", e: "Energy released is proportional to the amount that reacts." },
  { k: "fire", p: "Why does a campfire keep burning once it's lit?", a: "The energy released heats more wood enough to react", w: ["Fires don't need energy", "Wood creates oxygen", "It's endothermic"], h: "Think of the activation energy hump.", e: "Each bit that burns releases enough energy to get the next bit over the hump." },
  { k: "self", p: "A self-heating can of soup has a hidden layer of chemicals. When you push a button, water mixes with them. What kind of reaction is needed?", a: "An exothermic one that releases lots of heat", w: ["An endothermic one", "No reaction, just mixing", "One that makes light only"], h: "The soup must get hot.", e: "Designers use reactions like calcium oxide + water, which release a lot of energy." },
  { k: "thermo", p: "How can you tell if a reaction in a beaker is exothermic?", a: "Measure the temperature: it rises by itself", w: ["Look at its colour only", "Weigh it", "Smell it"], h: "What tool measures thermal energy changes?", e: "A thermometer shows the surroundings warming: energy is being released." },
]);

/** Design tables: candidate packs with max temp, minutes warm, cost. */
export const designCriteria = mix(
  () => {
    // Criteria: peak 40–50 °C, warm (≥ 38 °C) at least 20 minutes, cost under $1.
    const names = ["A", "B", "C"];
    const good = { max: rand(41, 49), mins: rand(4, 9) * 5, cost: rand(4, 9) * 10 };
    const fails = shuffle([
      { max: rand(55, 70), mins: rand(4, 9) * 5, cost: rand(4, 9) * 10, why: "is too hot" },
      { max: rand(32, 37), mins: rand(4, 9) * 5, cost: rand(4, 9) * 10, why: "isn't warm enough" },
      { max: rand(41, 49), mins: rand(1, 3) * 5, cost: rand(4, 9) * 10, why: "doesn't stay warm long enough" },
      { max: rand(41, 49), mins: rand(4, 9) * 5, cost: rand(12, 20) * 10, why: "costs too much" },
    ]).slice(0, 2);
    const rows = shuffle([{ ...good, why: "" }, ...fails]);
    const at = rows.findIndex((r) => r.why === "");
    return make(
      {
        key: `dc-${rows.map((r) => `${r.max}.${r.mins}.${r.cost}`).join("-")}`,
        prompt: "Criteria: peak between 40 °C and 50 °C, stays warm at least 20 minutes, costs under $1. Which design meets them all?",
        visual: { kind: "table", header: ["Design", "Peak (°C)", "Warm (min)", "Cost (¢)"], rows: rows.map((r, i) => [names[i], r.max, r.mins, r.cost]) },
        needsVisual: true,
        hint: "Check every design against every criterion. Cross out a design as soon as it fails one.",
        explain: `Design ${names[at]} meets all three. ${rows.map((r, i) => (r.why ? `${names[i]} ${r.why}.` : "")).filter(Boolean).join(" ")}`,
      },
      label(`Design ${names[at]}`, names.filter((_, i) => i !== at).map((n) => `Design ${n}`)),
    );
  },
  bank("dc", [
    { k: "crit", p: "For a hand warmer, which is a CRITERION (a goal the design must meet)?", a: "It must stay above 38 °C for 20 minutes", w: ["It must be made of iron", "It was invented in 1970", "Its packet is blue"], h: "Criteria describe what success looks like.", e: "Criteria are measurable goals, like temperature and time." },
    { k: "cons", p: "For a hand warmer, which is a CONSTRAINT (a limit on the design)?", a: "It must be safe to touch and cost under $1", w: ["It should feel warm", "It releases energy", "It uses a reaction"], h: "Constraints are limits like safety, cost, size and materials.", e: "Constraints limit what you can do: no burns, no toxic chemicals, low cost." },
    { k: "safe", p: "A test hand warmer reaches 70 °C. What should the designer do?", a: "Slow the reaction, e.g. use less iron or less air flow, and test again", w: ["Sell it: hotter is better", "Add more iron", "Stop testing"], h: "Skin can be burned above about 50 °C.", e: "Too hot breaks a safety constraint. Changing amounts and retesting is how designs improve." },
    { k: "cold", p: "A cold pack only drops to 15 °C. The goal is below 5 °C. What's a sensible change?", a: "Use more ammonium nitrate for the same water and retest", w: ["Use warmer water", "Use less solid", "Add salt and iron"], h: "More solid dissolving absorbs more energy.", e: "Changing one thing at a time and testing shows whether the design improves." },
  ]),
);

/** MS-PS1-6 — fair tests: variables to change, measure and keep the same. */
export const fairTests = mix(
  () => {
    const [solid, w] = pick([["calcium chloride", "warms"], ["ammonium chloride", "cools"], ["ammonium nitrate", "cools"], ["iron powder", "warms"]] as [string, string][]);
    const who = pick(NAMES);
    const ask = rand(0, 2);
    const q = [
      ["What is being changed on purpose (the independent variable)?", "The mass of the solid", ["The temperature change", "The amount of water", "The type of cup"], `${who} chooses the masses: that's the variable being changed.`],
      ["What is being measured (the dependent variable)?", "The temperature change", ["The mass of the solid", "The amount of water", "The starting time"], "The temperature change depends on how much solid she uses."],
      ["What must stay the same for a fair test?", "The amount and starting temperature of the water", ["The mass of the solid", "The temperature change", "Nothing"], "Only the mass of the solid should change; everything else stays the same."],
    ][ask] as [string, string, string[], string];
    return make(
      {
        key: `ft-${solid}-${ask}`,
        prompt: `${who} tests how the mass of ${solid} changes how much it ${w} 50 mL of water. ${q[0]}`,
        hint: "Independent: what you change. Dependent: what you measure. Controlled: everything you keep the same.",
        explain: q[3],
      },
      label(q[1], q[2]),
    );
  },
  bank("ft", [
    { k: "why", p: "Why should you change only one variable at a time in a test?", a: "So you know that variable caused any difference", w: ["To finish faster", "Because changing two is against the law", "So the results are bigger"], h: "If two things change, which one made the difference?", e: "Changing one variable and keeping the rest the same is a fair test." },
    { k: "repeat", p: "Why test each amount three times and average?", a: "To make the results more reliable", w: ["To use more chemicals", "Because the first try never counts", "To make the numbers bigger"], h: "Measurements vary a bit each time.", e: "Repeating and averaging reduces the effect of random errors." },
    { k: "odd", p: "Results: 5 g → 6 °C, 10 g → 12 °C, 15 g → 31 °C, 20 g → 24 °C. Which result looks wrong?", a: "15 g → 31 °C", w: ["5 g → 6 °C", "10 g → 12 °C", "20 g → 24 °C"], h: "Look for the pattern: each 5 g adds about 6 °C.", e: "The pattern predicts about 18 °C for 15 g. 31 °C doesn't fit, so repeat that test." },
    { k: "cup", p: "Should the test cup be foam or metal?", a: "Foam, so less heat escapes and the reading is accurate", w: ["Metal, so heat escapes fast", "It doesn't matter at all", "Glass, so it breaks"], h: "Which one insulates?", e: "An insulated foam cup keeps the energy in the water, giving a truer temperature change." },
  ]),
);

/** MS-PS1-6 — Do it: graph the test results. */
export function graphTest(): Question {
  const solid = pick(["calcium chloride", "ammonium chloride", "magnesium powder"]);
  let masses: number[];
  let per: number;
  let top: number;
  do {
    masses = pick([[2, 4, 6, 8], [5, 10, 15, 20], [1, 2, 3, 4, 5], [2, 4, 6, 8, 10]]);
    per = rand(1, 4);
    top = masses[masses.length - 1] * per;
  } while (top > 40 || (top > 20 && masses.some((m) => (m * per) % 2 !== 0)));
  const items = masses.map((m) => ({ label: `${m} g`, value: m * per }));
  const step = top > 20 ? 2 : 1;
  const max = Math.ceil(top / 5) * 5;
  const verb = solid === "ammonium chloride" ? "drop" : "rise";
  return make(
    {
      key: `gt-${solid}-${per}-${masses.join(",")}`,
      prompt: `Graph the temperature ${verb} (°C) for each mass of ${solid}.`,
      hint: "Drag each bar up to its value. Read the scale carefully.",
      explain: `The bars grow steadily: twice the mass gives about twice the temperature ${verb}. ${items.map((it) => `${it.label}: ${it.value} °C`).join(", ")}.`,
    },
    act({ kind: "barGraph", title: `Temperature ${verb} (°C)`, items, max, step }, top),
  );
}

/** MS-PS1-6 — use test data to predict and choose amounts. */
export const useData = mix(
  () => {
    const per = pick([1, 1.5, 2, 3]);
    const m1 = pick([2, 4, 5]);
    const m2 = m1 * pick([2, 3, 4]);
    return make(
      {
        key: `pred-${per}-${m1}-${m2}`,
        prompt: `${m1} g of calcium chloride warms 50 mL of water by ${clean(m1 * per)} °C. Predict the rise for ${m2} g in the same water.`,
        unit: "°C",
        hint: `${m2} g is ${m2 / m1} times as much, so expect about ${m2 / m1} times the temperature rise.`,
        explain: `${m2 / m1} × ${clean(m1 * per)} = ${clean(m2 * per)} °C.`,
      },
      keypad(clean(m2 * per)),
    );
  },
  () => {
    const per = pick([2, 3, 4, 5]);
    const start = rand(15, 22);
    const target = start + per * pick([4, 5, 6, 7]);
    const need = (target - start) / per;
    return make(
      {
        key: `need-${per}-${start}-${target}`,
        prompt: `Each gram of the powder raises the water by ${per} °C. The water starts at ${start} °C. How many grams make it ${target} °C?`,
        unit: "g",
        hint: "Find the rise you need first, then divide by the rise per gram.",
        explain: `Rise needed: ${target} − ${start} = ${target - start} °C. ${target - start} ÷ ${per} = ${need} g.`,
      },
      keypad(need),
    );
  },
  () => {
    const per = pick([2, 3, 4]);
    const xs = [0, 2, 4, 6, 8, 10];
    const pts = xs.slice(1, 5).map((x) => ({ x, y: x * per }));
    const ask = pick([3, 5, 7, 9]);
    return make(
      {
        key: `plot-${per}-${ask}`,
        prompt: `The graph shows temperature rise (°C, up) against grams of powder (across). Predict the rise for ${ask} g.`,
        visual: { kind: "plot", x: [0, 10], y: [0, 10 * per], points: pts, lines: [{ from: [0, 0], to: [10, 10 * per], dashed: true }] },
        needsVisual: true,
        unit: "°C",
        hint: "Follow the dashed line: find the rise for each gram, or read between the points.",
        explain: `Each gram adds ${per} °C, so ${ask} g gives ${ask} × ${per} = ${ask * per} °C.`,
      },
      keypad(ask * per),
    );
  },
);

/** MS-PS1-6 — Do it: put design steps in order. */
export function designSteps(): Question {
  const plans: [string, string[]][] = [
    ["designing a hand warmer", ["Define the problem, criteria and constraints", "Research reactions that release heat", "Build a prototype", "Test it and record the temperature", "Analyze the data", "Improve the design and test again"]],
    ["using an instant cold pack", ["Squeeze to break the inner bag of water", "Shake so the solid mixes with the water", "The solid dissolves and absorbs energy", "The pack feels cold", "Hold it on the injury"]],
    ["testing a cold pack design", ["Measure the water's starting temperature", "Add the solid and start the timer", "Record the temperature every minute", "Find the lowest temperature and how long it stayed cold", "Compare with the criteria"]],
    ["how an iron hand warmer works", ["Open the airtight wrapper", "Oxygen from the air reaches the iron powder", "The iron reacts with oxygen to make iron oxide", "Energy is released and the packet warms", "The iron is used up and the packet cools"]],
  ];
  const [what, steps] = pick(plans);
  const drop = rand(0, steps.length - 1); // 0 keeps every step; otherwise leave one out for variety
  const items = drop === 0 ? steps : steps.filter((_, i) => i !== drop);
  return make(
    {
      key: `ds-${what}-${drop}`,
      prompt: `Put the steps in order: ${what}.`,
      hint: "What has to happen first for the next step to be possible?",
      explain: items.map((s, i) => `${i + 1}. ${s}`).join(" "),
    },
    act({ kind: "order", items, direction: "first to last" }, items.length),
  );
}
