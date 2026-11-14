/**
 * Periodic-table data and small chemistry helpers that lessons, pictures and validation share.
 *
 * Lesson writers:
 * - `element("Na")` or `element(11)` → an {@link Element} (undefined if unknown). `ELEMENTS` lists all 118 in order.
 * - `parseFormula("Ca(OH)₂")` → atom counts and charge; `molarMass("H₂O")` → 18.015 (g/mol).
 * - `electronConfig(26)` → "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶"; `electronConfig(26, true)` → "[Ar] 4s² 3d⁶".
 * - `bohrShells(11)` → [2, 8, 1]; `bohrShells(17, 18)` for the Cl⁻ ion → [2, 8, 8].
 * - `valenceElectrons("O")` → 6 (main-group elements only).
 * - `sub("H2O")` → "H₂O" and `sup("2+")` → "²⁺", to write formulas in prompts.
 *
 * Formulas are written with Unicode subscripts and superscripts (H₂O, SO₄²⁻, Na⁺), the way the speech helper
 * reads them. Plain digits after a symbol are also accepted as subscripts ("H2O"), but charges must be
 * superscripts (⁺ ⁻ ² ³ …). Electrons are "e⁻". A nuclide may lead with its mass number (superscript) and
 * atomic number (subscript): "²³⁸₉₂U", "⁴₂He", "⁰₋₁e", "¹₀n".
 */

/** Kid-friendly family names; `metalClass` groups them into metals, nonmetals and metalloids. */
export type ElementCategory =
  | "alkali-metal"
  | "alkaline-earth"
  | "transition-metal"
  | "post-transition-metal"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble-gas"
  | "lanthanide"
  | "actinide";

export interface Element {
  /** Atomic number (protons), 1–118. */
  z: number;
  /** Symbol, e.g. "Na". */
  symbol: string;
  /** English name, e.g. "Sodium". */
  name: string;
  /**
   * Standard (average) atomic mass in g/mol, as printed on school periodic tables (IUPAC abridged values,
   * e.g. 1.008, 12.011, 35.45). For elements with no stable isotopes it is the mass number of the longest-lived
   * isotope (e.g. 98 for Tc) and `massIsWhole` is true; such tables print it in brackets.
   */
  mass: number;
  massIsWhole?: boolean;
  /** Group 1–18, or null for the lanthanides and actinides (other than La and Ac, placed in group 3). */
  group: number | null;
  /** Period (row) 1–7. */
  period: number;
  /** s, p, d or f. Helium counts as s-block. */
  block: "s" | "p" | "d" | "f";
  category: ElementCategory;
  /** Pauling electronegativity, or null when there's no accepted value (noble gases He, Ne, Ar; most heavy elements). */
  en: number | null;
  /** Common ion charges, most common first (e.g. Fe → [3, 2], O → [−2]); empty when the element rarely forms simple ions. */
  ions: number[];
  /** State at room temperature (25 °C). */
  state: "solid" | "liquid" | "gas";
}

// z|symbol|name|mass|group|category|en|ions|state ; group "f" for lanthanides/actinides; mass ending in "!" is a mass number.
const RAW = `1|H|Hydrogen|1.008|1|nonmetal|2.20|1,-1|g
2|He|Helium|4.0026|18|noble-gas||-|g
3|Li|Lithium|6.94|1|alkali-metal|0.98|1|s
4|Be|Beryllium|9.0122|2|alkaline-earth|1.57|2|s
5|B|Boron|10.81|13|metalloid|2.04|-|s
6|C|Carbon|12.011|14|nonmetal|2.55|-|s
7|N|Nitrogen|14.007|15|nonmetal|3.04|-3|g
8|O|Oxygen|15.999|16|nonmetal|3.44|-2|g
9|F|Fluorine|18.998|17|halogen|3.98|-1|g
10|Ne|Neon|20.180|18|noble-gas||-|g
11|Na|Sodium|22.990|1|alkali-metal|0.93|1|s
12|Mg|Magnesium|24.305|2|alkaline-earth|1.31|2|s
13|Al|Aluminum|26.982|13|post-transition-metal|1.61|3|s
14|Si|Silicon|28.085|14|metalloid|1.90|-|s
15|P|Phosphorus|30.974|15|nonmetal|2.19|-3|s
16|S|Sulfur|32.06|16|nonmetal|2.58|-2|s
17|Cl|Chlorine|35.45|17|halogen|3.16|-1|g
18|Ar|Argon|39.95|18|noble-gas||-|g
19|K|Potassium|39.098|1|alkali-metal|0.82|1|s
20|Ca|Calcium|40.078|2|alkaline-earth|1.00|2|s
21|Sc|Scandium|44.956|3|transition-metal|1.36|3|s
22|Ti|Titanium|47.867|4|transition-metal|1.54|4,3|s
23|V|Vanadium|50.942|5|transition-metal|1.63|3,5|s
24|Cr|Chromium|51.996|6|transition-metal|1.66|3,2|s
25|Mn|Manganese|54.938|7|transition-metal|1.55|2,4|s
26|Fe|Iron|55.845|8|transition-metal|1.83|3,2|s
27|Co|Cobalt|58.933|9|transition-metal|1.88|2,3|s
28|Ni|Nickel|58.693|10|transition-metal|1.91|2|s
29|Cu|Copper|63.546|11|transition-metal|1.90|2,1|s
30|Zn|Zinc|65.38|12|transition-metal|1.65|2|s
31|Ga|Gallium|69.723|13|post-transition-metal|1.81|3|s
32|Ge|Germanium|72.630|14|metalloid|2.01|-|s
33|As|Arsenic|74.922|15|metalloid|2.18|-3|s
34|Se|Selenium|78.971|16|nonmetal|2.55|-2|s
35|Br|Bromine|79.904|17|halogen|2.96|-1|l
36|Kr|Krypton|83.798|18|noble-gas|3.00|-|g
37|Rb|Rubidium|85.468|1|alkali-metal|0.82|1|s
38|Sr|Strontium|87.62|2|alkaline-earth|0.95|2|s
39|Y|Yttrium|88.906|3|transition-metal|1.22|3|s
40|Zr|Zirconium|91.224|4|transition-metal|1.33|4|s
41|Nb|Niobium|92.906|5|transition-metal|1.6|5|s
42|Mo|Molybdenum|95.95|6|transition-metal|2.16|6|s
43|Tc|Technetium|98!|7|transition-metal|1.9|7|s
44|Ru|Ruthenium|101.07|8|transition-metal|2.2|3|s
45|Rh|Rhodium|102.91|9|transition-metal|2.28|3|s
46|Pd|Palladium|106.42|10|transition-metal|2.20|2|s
47|Ag|Silver|107.87|11|transition-metal|1.93|1|s
48|Cd|Cadmium|112.41|12|transition-metal|1.69|2|s
49|In|Indium|114.82|13|post-transition-metal|1.78|3|s
50|Sn|Tin|118.71|14|post-transition-metal|1.96|2,4|s
51|Sb|Antimony|121.76|15|metalloid|2.05|3|s
52|Te|Tellurium|127.60|16|metalloid|2.1|-2|s
53|I|Iodine|126.90|17|halogen|2.66|-1|s
54|Xe|Xenon|131.29|18|noble-gas|2.6|-|g
55|Cs|Cesium|132.91|1|alkali-metal|0.79|1|s
56|Ba|Barium|137.33|2|alkaline-earth|0.89|2|s
57|La|Lanthanum|138.91|3|lanthanide|1.10|3|s
58|Ce|Cerium|140.12|f|lanthanide|1.12|3,4|s
59|Pr|Praseodymium|140.91|f|lanthanide|1.13|3|s
60|Nd|Neodymium|144.24|f|lanthanide|1.14|3|s
61|Pm|Promethium|145!|f|lanthanide||3|s
62|Sm|Samarium|150.36|f|lanthanide|1.17|3|s
63|Eu|Europium|151.96|f|lanthanide||3,2|s
64|Gd|Gadolinium|157.25|f|lanthanide|1.20|3|s
65|Tb|Terbium|158.93|f|lanthanide||3|s
66|Dy|Dysprosium|162.50|f|lanthanide|1.22|3|s
67|Ho|Holmium|164.93|f|lanthanide|1.23|3|s
68|Er|Erbium|167.26|f|lanthanide|1.24|3|s
69|Tm|Thulium|168.93|f|lanthanide|1.25|3|s
70|Yb|Ytterbium|173.05|f|lanthanide||3|s
71|Lu|Lutetium|174.97|f|lanthanide|1.27|3|s
72|Hf|Hafnium|178.49|4|transition-metal|1.3|4|s
73|Ta|Tantalum|180.95|5|transition-metal|1.5|5|s
74|W|Tungsten|183.84|6|transition-metal|2.36|6|s
75|Re|Rhenium|186.21|7|transition-metal|1.9|7|s
76|Os|Osmium|190.23|8|transition-metal|2.2|4|s
77|Ir|Iridium|192.22|9|transition-metal|2.20|4|s
78|Pt|Platinum|195.08|10|transition-metal|2.28|2,4|s
79|Au|Gold|196.97|11|transition-metal|2.54|3,1|s
80|Hg|Mercury|200.59|12|transition-metal|2.00|2,1|l
81|Tl|Thallium|204.38|13|post-transition-metal|1.62|1|s
82|Pb|Lead|207.2|14|post-transition-metal|2.33|2,4|s
83|Bi|Bismuth|208.98|15|post-transition-metal|2.02|3|s
84|Po|Polonium|209!|16|post-transition-metal|2.0|-|s
85|At|Astatine|210!|17|halogen|2.2|-1|s
86|Rn|Radon|222!|18|noble-gas||-|g
87|Fr|Francium|223!|1|alkali-metal|0.7|1|s
88|Ra|Radium|226!|2|alkaline-earth|0.9|2|s
89|Ac|Actinium|227!|3|actinide|1.1|3|s
90|Th|Thorium|232.04|f|actinide|1.3|4|s
91|Pa|Protactinium|231.04|f|actinide|1.5|5|s
92|U|Uranium|238.03|f|actinide|1.38|6,4|s
93|Np|Neptunium|237!|f|actinide|1.36|5|s
94|Pu|Plutonium|244!|f|actinide|1.28|4|s
95|Am|Americium|243!|f|actinide|1.3|3|s
96|Cm|Curium|247!|f|actinide|1.3|3|s
97|Bk|Berkelium|247!|f|actinide|1.3|3|s
98|Cf|Californium|251!|f|actinide|1.3|3|s
99|Es|Einsteinium|252!|f|actinide|1.3|3|s
100|Fm|Fermium|257!|f|actinide|1.3|3|s
101|Md|Mendelevium|258!|f|actinide|1.3|3|s
102|No|Nobelium|259!|f|actinide|1.3|2|s
103|Lr|Lawrencium|266!|f|actinide||3|s
104|Rf|Rutherfordium|267!|4|transition-metal||-|s
105|Db|Dubnium|268!|5|transition-metal||-|s
106|Sg|Seaborgium|269!|6|transition-metal||-|s
107|Bh|Bohrium|270!|7|transition-metal||-|s
108|Hs|Hassium|269!|8|transition-metal||-|s
109|Mt|Meitnerium|278!|9|transition-metal||-|s
110|Ds|Darmstadtium|281!|10|transition-metal||-|s
111|Rg|Roentgenium|282!|11|transition-metal||-|s
112|Cn|Copernicium|285!|12|transition-metal||-|s
113|Nh|Nihonium|286!|13|post-transition-metal||-|s
114|Fl|Flerovium|289!|14|post-transition-metal||-|s
115|Mc|Moscovium|290!|15|post-transition-metal||-|s
116|Lv|Livermorium|293!|16|post-transition-metal||-|s
117|Ts|Tennessine|294!|17|halogen||-|s
118|Og|Oganesson|294!|18|noble-gas||-|s`;

const periodOf = (z: number) => (z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : z <= 36 ? 4 : z <= 54 ? 5 : z <= 86 ? 6 : 7);

/** All 118 elements, index 0 = hydrogen (so `ELEMENTS[z - 1]`). */
export const ELEMENTS: readonly Element[] = RAW.split("\n").map((line) => {
  const [z, symbol, name, mass, group, category, en, ions, state] = line.split("|");
  const Z = Number(z);
  const g = group === "f" ? null : Number(group);
  const f = g === null;
  const block: Element["block"] = f ? "f" : Z === 2 ? "s" : g! <= 2 ? "s" : g! >= 13 ? "p" : "d";
  return {
    z: Z,
    symbol,
    name,
    mass: Number(mass.replace("!", "")),
    ...(mass.endsWith("!") ? { massIsWhole: true } : {}),
    group: g,
    period: periodOf(Z),
    block,
    category: category as ElementCategory,
    en: en ? Number(en) : null,
    ions: ions === "-" ? [] : ions.split(",").map(Number),
    state: state === "g" ? "gas" : state === "l" ? "liquid" : "solid",
  };
});

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

/** Look an element up by symbol ("Na", case-sensitive) or atomic number (11). */
export function element(key: string | number): Element | undefined {
  return typeof key === "number" ? ELEMENTS[key - 1] : BY_SYMBOL.get(key);
}

/** Metal, nonmetal or metalloid (noble gases and halogens are nonmetals). */
export function metalClass(e: Element): "metal" | "nonmetal" | "metalloid" {
  if (e.category === "metalloid") return "metalloid";
  if (e.category === "nonmetal" || e.category === "halogen" || e.category === "noble-gas") return "nonmetal";
  return "metal";
}

/** Valence electrons for main-group elements (H 1, He 2, O 6, Cl 7, Ne 8); null for d- and f-block elements. */
export function valenceElectrons(key: string | number): number | null {
  const e = element(key);
  if (!e || e.group === null) return null;
  if (e.z === 2) return 2;
  if (e.group <= 2) return e.group;
  if (e.group >= 13) return e.group - 10;
  return null;
}

/**
 * Where the element sits in a drawn table: column 1–18 and row 1–7. La and Ac stay in group 3; Ce–Lu fill
 * columns 4–17 of row 8 and Th–Lr columns 4–17 of row 9 (the two f-block rows under the table).
 */
export function tablePosition(e: Element): { col: number; row: number } {
  if (e.group !== null) return { col: e.group, row: e.period };
  if (e.z >= 58 && e.z <= 71) return { col: e.z - 54, row: 8 };
  return { col: e.z - 86, row: 9 };
}

/* -------------------------------------------------------------- electrons */

const ORBITALS = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p", "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"];
const CAP: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };

/** Ground states that break the simple filling order (moves an s or f electron into d). */
const EXCEPTIONS: Record<number, Record<string, number>> = {
  24: { "4s": 1, "3d": 5 },
  29: { "4s": 1, "3d": 10 },
  41: { "5s": 1, "4d": 4 },
  42: { "5s": 1, "4d": 5 },
  44: { "5s": 1, "4d": 7 },
  45: { "5s": 1, "4d": 8 },
  46: { "5s": 0, "4d": 10 },
  47: { "5s": 1, "4d": 10 },
  57: { "4f": 0, "5d": 1 },
  58: { "4f": 1, "5d": 1 },
  64: { "4f": 7, "5d": 1 },
  78: { "6s": 1, "5d": 9 },
  79: { "6s": 1, "5d": 10 },
  89: { "5f": 0, "6d": 1 },
  90: { "5f": 0, "6d": 2 },
  91: { "5f": 2, "6d": 1 },
  92: { "5f": 3, "6d": 1 },
  93: { "5f": 4, "6d": 1 },
  96: { "5f": 7, "6d": 1 },
};

/** Orbital occupancy of a neutral atom in filling order, e.g. 8 → [["1s",2],["2s",2],["2p",4]]. */
function occupancy(z: number): [string, number][] {
  const occ: Record<string, number> = {};
  let left = z;
  for (const o of ORBITALS) {
    if (left <= 0) break;
    const n = Math.min(left, CAP[o[1]]);
    occ[o] = n;
    left -= n;
  }
  Object.assign(occ, EXCEPTIONS[z] ?? {});
  return ORBITALS.filter((o) => occ[o]).map((o) => [o, occ[o]]);
}

/**
 * Orbital occupancy for `electrons` electrons around nucleus `z` (an ion when they differ). Cations lose electrons
 * from the highest shell first (so Fe²⁺ is [Ar] 3d⁶); anions gain them in filling order.
 */
function ionOccupancy(z: number, electrons: number): [string, number][] {
  // Neutral atoms and anions: fill in the usual order.
  if (electrons >= z) return occupancy(electrons);
  const occ = occupancy(z).map(([o, n]) => [o, n] as [string, number]);
  let remove = z - electrons;
  const lOrder = "fdps";
  while (remove > 0) {
    // Highest n, then highest l, loses first.
    let best = -1;
    occ.forEach(([o, n], i) => {
      if (n === 0) return;
      if (best < 0) best = i;
      const [bo] = occ[best];
      const sh = Number(o[0]) - Number(bo[0]);
      if (sh > 0 || (sh === 0 && lOrder.indexOf(o[1]) < lOrder.indexOf(bo[1]))) best = i;
    });
    if (best < 0) break;
    occ[best][1]--;
    remove--;
  }
  return occ.filter(([, n]) => n > 0);
}

const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUBS = "₀₁₂₃₄₅₆₇₈₉";

/** "H2O" → "H₂O": every ASCII digit becomes a subscript (use for formula text in prompts). */
export function sub(text: string): string {
  return text.replace(/\d/g, (d) => SUBS[Number(d)]);
}

/** "2+" → "²⁺", "-" → "⁻": digits and signs become superscripts (charges, mass numbers). */
export function sup(text: string): string {
  return text.replace(/\d/g, (d) => SUPS[Number(d)]).replace(/\+/g, "⁺").replace(/[-−]/g, "⁻");
}

/** A charge as a superscript: 2 → "²⁺", −1 → "⁻", 0 → "". */
export function chargeText(charge: number): string {
  if (!charge) return "";
  return `${Math.abs(charge) === 1 ? "" : sup(String(Math.abs(charge)))}${charge > 0 ? "⁺" : "⁻"}`;
}

const NOBLE = [2, 10, 18, 36, 54, 86];

/**
 * Electron configuration as text: "1s² 2s² 2p⁴". With `short`, uses the noble-gas core: "[He] 2s² 2p⁴".
 * Pass `electrons` for ions (Na⁺: electronConfig(11, false, 10)). Includes the common exceptions (Cr, Cu, Mo, Ag, Au…).
 */
export function electronConfig(z: number, short = false, electrons = z): string {
  let occ = ionOccupancy(z, electrons);
  let core = "";
  if (short) {
    const gas = [...NOBLE].reverse().find((g) => g < electrons && g <= z);
    if (gas) {
      const coreOcc = occupancy(gas);
      const coreSet = new Map(coreOcc);
      const isCore = occ.every(([o, n]) => !coreSet.has(o) || n >= coreSet.get(o)!) && coreOcc.every(([o]) => occ.some(([p]) => p === o));
      if (isCore) {
        core = `[${element(gas)!.symbol}]`;
        occ = occ.map(([o, n]) => [o, n - (coreSet.get(o) ?? 0)] as [string, number]).filter(([, n]) => n > 0);
      }
    }
  }
  const body = occ.map(([o, n]) => `${o}${sup(String(n))}`).join(" ");
  return [core, body].filter(Boolean).join(" ");
}

/**
 * Electrons in each shell for a Bohr model, innermost first. Up to 20 electrons (and Z ≤ 20) it uses the school
 * 2, 8, 8, 2 rule (K → [2, 8, 8, 1]); beyond that it counts the real shells from the configuration
 * (Fe → [2, 8, 14, 2]). Pass `electrons` for ions: bohrShells(17, 18) → [2, 8, 8].
 */
export function bohrShells(z: number, electrons = z): number[] {
  if (electrons <= 0) return [];
  if (z <= 20 && electrons <= 20) {
    const caps = [2, 8, 8, 2];
    const out: number[] = [];
    let left = electrons;
    for (const c of caps) {
      if (left <= 0) break;
      out.push(Math.min(c, left));
      left -= c;
    }
    return out;
  }
  const shells: number[] = [];
  for (const [o, n] of ionOccupancy(z, electrons)) {
    const k = Number(o[0]) - 1;
    while (shells.length <= k) shells.push(0);
    shells[k] += n;
  }
  return shells.filter((n, i) => n > 0 || i < shells.length - 1);
}

/* --------------------------------------------------------------- formulas */

const SUB_DIGIT = (c: string) => SUBS.indexOf(c);
const SUP_DIGIT = (c: string) => SUPS.indexOf(c);

/** What a formula string contains. */
export interface ParsedFormula {
  /** Atoms of each element, e.g. Ca(OH)₂ → { Ca: 1, O: 2, H: 2 }. Electrons and other particles have none. */
  atoms: Record<string, number>;
  /** Net charge (SO₄²⁻ → −2, e⁻ → −1). */
  charge: number;
  /** Mass number and atomic number when written as a nuclide ("²³⁵₉₂U", "¹₀n", "⁰₋₁e"). */
  nuclide?: { A: number; Z: number };
  /** True for an electron "e⁻" (or a beta particle written "⁰₋₁e" / "β⁻"). */
  electron?: boolean;
  /** Unknown symbols found (validation reports these). */
  unknown: string[];
}

/** Particles that may stand alone in nuclear equations, with mass number and charge (atomic number). */
export const NUCLEAR_PARTICLES: Record<string, { A: number; Z: number; name: string }> = {
  n: { A: 1, Z: 0, name: "neutron" },
  p: { A: 1, Z: 1, name: "proton" },
  e: { A: 0, Z: -1, name: "electron (beta particle)" },
  "β": { A: 0, Z: -1, name: "beta particle" },
  "β⁻": { A: 0, Z: -1, name: "beta particle" },
  "β⁺": { A: 0, Z: 1, name: "positron" },
  "e⁺": { A: 0, Z: 1, name: "positron" },
  "α": { A: 4, Z: 2, name: "alpha particle" },
  "γ": { A: 0, Z: 0, name: "gamma ray" },
};

/**
 * Read a formula like "H₂O", "Ca(OH)₂", "CuSO₄·5H₂O", "SO₄²⁻", "Fe³⁺", "e⁻" or a nuclide "²³⁸₉₂U".
 * ASCII digits after a symbol count as subscripts. Unknown element symbols are listed in `unknown`.
 */
export function parseFormula(text: string): ParsedFormula {
  const out: ParsedFormula = { atoms: {}, charge: 0, unknown: [] };
  let s = text.trim();
  // Nuclide prefix: superscript mass number then subscript atomic number (may be ₋₁).
  const pre = /^([⁰¹²³⁴⁵⁶⁷⁸⁹]+)(₋?)([₀₁₂₃₄₅₆₇₈₉]+)/.exec(s);
  if (pre) {
    const A = Number([...pre[1]].map(SUP_DIGIT).join(""));
    const Z = (pre[2] ? -1 : 1) * Number([...pre[3]].map(SUB_DIGIT).join(""));
    out.nuclide = { A, Z };
    s = s.slice(pre[0].length);
    if (NUCLEAR_PARTICLES[s] || s === "e" || s === "e⁺" || s === "e⁻") {
      if (s.startsWith("e") || s.startsWith("β")) out.electron = Z < 0;
      out.charge = 0;
      return out;
    }
    const el = element(s);
    if (!el) out.unknown.push(s);
    else {
      out.atoms[s] = 1;
      if (el.z !== Z) out.unknown.push(`${s} must have atomic number ${el.z}, not ${Z}`);
    }
    return out;
  }
  if (s === "e⁻" || s === "e" || s === "β⁻" || s === "β") {
    out.electron = true;
    out.charge = -1;
    return out;
  }
  if (NUCLEAR_PARTICLES[s]) {
    const p = NUCLEAR_PARTICLES[s];
    out.nuclide = { A: p.A, Z: p.Z };
    return out;
  }
  // A state symbol written on the end, e.g. "NaCl(aq)", is ignored.
  s = s.replace(/\((s|l|g|aq)\)$/, "");
  // Charge: trailing superscript digits and a sign.
  const ch = /([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])$/.exec(s);
  if (ch) {
    const mag = ch[1] ? Number([...ch[1]].map(SUP_DIGIT).join("")) : 1;
    out.charge = ch[2] === "⁺" ? mag : -mag;
    s = s.slice(0, ch.index);
  }
  for (const part of s.split(/[·•.]/)) {
    const m = /^(\d+)(.*)$/.exec(part);
    const mult = m ? Number(m[1]) : 1;
    const body = m ? m[2] : part;
    const counts = parseGroup(body, out.unknown);
    for (const [k, v] of Object.entries(counts)) out.atoms[k] = (out.atoms[k] ?? 0) + v * mult;
  }
  return out;
}

function readCount(s: string, i: number): [number, number] {
  let digits = "";
  while (i < s.length) {
    const c = s[i];
    if (/\d/.test(c)) digits += c;
    else if (SUB_DIGIT(c) >= 0) digits += String(SUB_DIGIT(c));
    else break;
    i++;
  }
  return [digits ? Number(digits) : 1, i];
}

function parseGroup(s: string, unknown: string[]): Record<string, number> {
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "(" || c === "[") {
      stack.push({});
      i++;
    } else if (c === ")" || c === "]") {
      const top = stack.pop() ?? {};
      const [n, j] = readCount(s, i + 1);
      i = j;
      const into = stack[stack.length - 1] ?? (stack[0] = {});
      for (const [k, v] of Object.entries(top)) into[k] = (into[k] ?? 0) + v * n;
    } else if (/[A-Z]/.test(c)) {
      let sym = c;
      i++;
      if (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
      const [n, j] = readCount(s, i);
      i = j;
      if (!element(sym)) unknown.push(sym);
      const top = stack[stack.length - 1];
      top[sym] = (top[sym] ?? 0) + n;
    } else if (c === " ") {
      i++;
    } else {
      unknown.push(c);
      i++;
    }
  }
  while (stack.length > 1) {
    const top = stack.pop()!;
    for (const [k, v] of Object.entries(top)) stack[0][k] = (stack[0][k] ?? 0) + v;
  }
  return stack[0];
}

/** Molar mass in g/mol, rounded to 3 decimals: molarMass("H₂O") → 18.015, molarMass("NaCl") → 58.44. */
export function molarMass(formula: string): number {
  const { atoms } = parseFormula(formula);
  const m = Object.entries(atoms).reduce((t, [k, n]) => t + (element(k)?.mass ?? NaN) * n, 0);
  return Math.round(m * 1000) / 1000;
}

/**
 * Standard reduction potentials E° (volts, 25 °C) for common half-reactions, keyed by the metal (or "H₂", "Cl₂",
 * "F₂", "Br₂", "I₂", "O₂"). The galvanic cell voltage is E°(cathode) − E°(anode); the anode is the lower one.
 */
export const REDUCTION_POTENTIALS: Record<string, { half: string; volts: number }> = {
  Li: { half: "Li⁺ + e⁻ → Li", volts: -3.04 },
  K: { half: "K⁺ + e⁻ → K", volts: -2.93 },
  Ca: { half: "Ca²⁺ + 2e⁻ → Ca", volts: -2.87 },
  Na: { half: "Na⁺ + e⁻ → Na", volts: -2.71 },
  Mg: { half: "Mg²⁺ + 2e⁻ → Mg", volts: -2.37 },
  Al: { half: "Al³⁺ + 3e⁻ → Al", volts: -1.66 },
  Zn: { half: "Zn²⁺ + 2e⁻ → Zn", volts: -0.76 },
  Cr: { half: "Cr³⁺ + 3e⁻ → Cr", volts: -0.74 },
  Fe: { half: "Fe²⁺ + 2e⁻ → Fe", volts: -0.44 },
  Cd: { half: "Cd²⁺ + 2e⁻ → Cd", volts: -0.4 },
  Co: { half: "Co²⁺ + 2e⁻ → Co", volts: -0.28 },
  Ni: { half: "Ni²⁺ + 2e⁻ → Ni", volts: -0.25 },
  Sn: { half: "Sn²⁺ + 2e⁻ → Sn", volts: -0.14 },
  Pb: { half: "Pb²⁺ + 2e⁻ → Pb", volts: -0.13 },
  "H₂": { half: "2H⁺ + 2e⁻ → H₂", volts: 0 },
  Cu: { half: "Cu²⁺ + 2e⁻ → Cu", volts: 0.34 },
  "I₂": { half: "I₂ + 2e⁻ → 2I⁻", volts: 0.54 },
  Ag: { half: "Ag⁺ + e⁻ → Ag", volts: 0.8 },
  "Br₂": { half: "Br₂ + 2e⁻ → 2Br⁻", volts: 1.07 },
  Pt: { half: "Pt²⁺ + 2e⁻ → Pt", volts: 1.18 },
  "O₂": { half: "O₂ + 4H⁺ + 4e⁻ → 2H₂O", volts: 1.23 },
  "Cl₂": { half: "Cl₂ + 2e⁻ → 2Cl⁻", volts: 1.36 },
  Au: { half: "Au³⁺ + 3e⁻ → Au", volts: 1.5 },
  "F₂": { half: "F₂ + 2e⁻ → 2F⁻", volts: 2.87 },
};
