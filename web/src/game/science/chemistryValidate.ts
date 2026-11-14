import type { ChemistryActivity, ChemistryVisual, Nuclide, ReactionTerm } from "./chemistryTypes";
import { bohrShells, element, parseFormula, REDUCTION_POTENTIALS, valenceElectrons } from "./elements";
import { MOLECULES, normFormula, VSEPR_SHAPES } from "../../components/science/chemistry/molecules";

/* ================================================================== balancing */

type Frac = [number, number];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const fr = (n: number, d = 1): Frac => {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const sub = (a: Frac, b: Frac) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a: Frac, b: Frac) => fr(a[0] * b[0], a[1] * b[1]);
const div = (a: Frac, b: Frac) => fr(a[0] * b[1], a[1] * b[0]);

/** Null space of an integer matrix (rows × cols), as rational vectors. */
function nullSpace(rows: number[][], cols: number): Frac[][] {
  const m: Frac[][] = rows.map((r) => r.map((v) => fr(v)));
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && row[c][0] !== 0);
    if (p < 0) continue;
    [m[r], m[p]] = [m[p], m[r]];
    const pv = m[r][c];
    m[r] = m[r].map((v) => div(v, pv));
    for (let i = 0; i < m.length; i++) {
      if (i === r || m[i][c][0] === 0) continue;
      const f = m[i][c];
      m[i] = m[i].map((v, j) => sub(v, mul(f, m[r][j])));
    }
    pivots.push(c);
    r++;
  }
  const free = Array.from({ length: cols }, (_, i) => i).filter((c) => !pivots.includes(c));
  return free.map((fc) => {
    const v: Frac[] = Array.from({ length: cols }, () => fr(0));
    v[fc] = fr(1);
    pivots.forEach((pc, i) => (v[pc] = fr(-m[i][fc][0], m[i][fc][1])));
    return v;
  });
}

/** What balancing an equation found. */
export interface BalanceResult {
  /** Smallest whole-number coefficients (reactants then products), or null when there's no single answer. */
  coefficients: number[] | null;
  /** Why not, when coefficients is null. */
  reason?: string;
}

/**
 * Balance an equation from its formulas (reactants then products): atoms of each element and total charge (or,
 * for nuclear equations written with nuclides, mass number and atomic number). Returns the smallest whole-number
 * coefficients, e.g. balance(["H₂", "O₂"], ["H₂O"]) → [2, 1, 2]. Null when it can't be balanced, or can be balanced
 * in more than one independent way.
 */
export function balance(reactants: string[], products: string[]): BalanceResult {
  const all = [...reactants, ...products];
  const parsed = all.map((f) => parseFormula(f));
  const bad = parsed.flatMap((p) => p.unknown);
  if (bad.length) return { coefficients: null, reason: `unknown ${bad.join(", ")}` };
  const nuclear = parsed.some((p) => p.nuclide);
  const sign = (i: number) => (i < reactants.length ? 1 : -1);
  const rows: number[][] = [];
  if (nuclear) {
    rows.push(parsed.map((p, i) => sign(i) * (p.nuclide?.A ?? NaN)));
    rows.push(parsed.map((p, i) => sign(i) * (p.nuclide?.Z ?? NaN)));
    if (rows.flat().some(Number.isNaN)) return { coefficients: null, reason: "write every term of a nuclear equation as a nuclide (e.g. ⁴₂He)" };
  } else {
    const els = [...new Set(parsed.flatMap((p) => Object.keys(p.atoms)))];
    for (const el of els) rows.push(parsed.map((p, i) => sign(i) * (p.atoms[el] ?? 0)));
    if (parsed.some((p) => p.charge !== 0)) rows.push(parsed.map((p, i) => sign(i) * p.charge));
  }
  const ns = nullSpace(rows, all.length);
  if (ns.length === 0) return { coefficients: null, reason: "it can't be balanced" };
  if (ns.length > 1) return { coefficients: null, reason: "it balances in more than one way" };
  let v = ns[0];
  if (v.every((x) => x[0] <= 0)) v = v.map((x) => fr(-x[0], x[1]));
  if (!v.every((x) => x[0] > 0)) return { coefficients: null, reason: "it can't be balanced with every substance taking part" };
  const lcm = v.reduce((l, x) => (l * x[1]) / gcd(l, x[1]), 1);
  const ints = v.map((x) => (x[0] * lcm) / x[1]);
  const g = ints.reduce((a, b) => gcd(a, b));
  return { coefficients: ints.map((x) => x / g) };
}

/** Atom counts on one side of an equation, given coefficients: { H: 4, O: 2 }. */
export function sideAtoms(formulas: string[], coefs: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  formulas.forEach((f, i) => {
    for (const [el, n] of Object.entries(parseFormula(f).atoms)) out[el] = (out[el] ?? 0) + n * (coefs[i] ?? 0);
  });
  return out;
}

/** Mass and atomic numbers of a nuclide picture entry. */
export function nuclideNumbers(n: Nuclide): { A: number; Z: number; symbol: string; count: number } {
  if ("particle" in n) {
    const p = {
      alpha: { A: 4, Z: 2, symbol: "He" },
      beta: { A: 0, Z: -1, symbol: "e" },
      positron: { A: 0, Z: 1, symbol: "e" },
      gamma: { A: 0, Z: 0, symbol: "γ" },
      neutron: { A: 1, Z: 0, symbol: "n" },
      proton: { A: 1, Z: 1, symbol: "p" },
    }[n.particle];
    return { ...p, count: n.count ?? 1 };
  }
  return { A: n.A, Z: element(n.element)?.z ?? NaN, symbol: n.element, count: 1 };
}

/* ================================================================== helpers */

const isMarkOk = (m: unknown) => m === undefined || m === null || typeof m === "number" || typeof m === "string";
const int = Number.isInteger;

function formulaProblems(f: string, where: string): string[] {
  if (f === "?") return [];
  const p = parseFormula(f);
  return p.unknown.length ? [`${where}: "${f}" has unknown ${p.unknown.join(", ")}`] : [];
}

function reactionProblems(v: { reactants: ReactionTerm[]; products: ReactionTerm[]; unbalanced?: boolean; words?: boolean }): string[] {
  const p: string[] = [];
  const all = [...v.reactants, ...v.products];
  if (!v.reactants.length || !v.products.length) p.push("chem-reaction: needs reactants and products");
  if (all.length > 7) p.push("chem-reaction: at most 7 terms fit on a phone");
  for (const t of all) {
    if ((t.formula === undefined) === (t.text === undefined)) p.push("chem-reaction: each term needs a formula or text (not both)");
    if (t.formula) p.push(...formulaProblems(t.formula, "chem-reaction"));
    if (typeof t.coef === "number" && (!int(t.coef) || t.coef < 1)) p.push("chem-reaction: coefficients must be whole numbers ≥ 1");
  }
  if (v.words || v.unbalanced || p.length) return p;
  const chem = all.every((t) => t.formula && t.formula !== "?");
  if (!chem) return p;
  const r = balance(
    v.reactants.map((t) => t.formula!),
    v.products.map((t) => t.formula!),
  );
  if (!r.coefficients) {
    p.push(`chem-reaction: ${r.reason} (set unbalanced: true for a skeleton)`);
    return p;
  }
  const given = all.map((t) => (t.coef === undefined ? 1 : t.coef));
  const known = given.map((c, i) => (typeof c === "number" ? [c, r.coefficients![i]] : null)).filter(Boolean) as [number, number][];
  if (known.length) {
    const k = known[0][0] / known[0][1];
    if (!known.every(([c, s]) => Math.abs(c - k * s) < 1e-9)) p.push(`chem-reaction: coefficients don't balance (smallest: ${r.coefficients.join(", ")})`);
    else if (!r.coefficients.every((s) => Math.abs(k * s - Math.round(k * s)) < 1e-9))
      p.push(`chem-reaction: the "?" coefficients would not be whole numbers (smallest: ${r.coefficients.join(", ")})`);
  }
  return p;
}

const BLOCKS = new Set(["tower", "house", "car", "boat", "bridge", "wall", "robot", "train", "pile"]);
const MATERIALS = new Set(["wood", "metal", "plastic", "glass", "rubber", "cloth", "paper", "ice", "stone", "clay", "water", "?"]);

/* ================================================================== visuals */

/** Problems with a chemistry picture (unknown elements, unbalanced equations, counts that don't match); empty means it's fine. */
export function chemistryVisualProblems(v: ChemistryVisual): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(`${v.kind}: ${msg}`);
  };
  switch (v.kind) {
    case "chem-particles": {
      need(v.panels.length >= 1 && v.panels.length <= 3, "1–3 panels");
      v.panels.forEach((panel, i) => {
        const total = panel.species.reduce((t, s) => t + s.count, 0);
        need(panel.species.length >= 1 && panel.species.length <= 4, `panel ${i + 1}: 1–4 kinds of particle`);
        need(panel.species.every((s) => int(s.count) && s.count >= 0), `panel ${i + 1}: counts must be whole numbers`);
        need(total <= 40, `panel ${i + 1}: at most 40 particles (has ${total})`);
        need(panel.motion === undefined || [0, 1, 2, 3].includes(panel.motion), `panel ${i + 1}: motion is 0–3`);
        need(isMarkOk(panel.label), `panel ${i + 1}: bad label`);
        for (const s of panel.species) if (s.formula) p.push(...formulaProblems(s.formula, v.kind));
        const big = panel.species.some((s) => s.formula && Object.values(parseFormula(s.formula).atoms).reduce((a, b) => a + b, 0) > 6);
        need(!big || total <= 16, `panel ${i + 1}: big molecules — keep to 16 particles`);
      });
      break;
    }
    case "chem-atom": {
      const e = element(v.protons);
      need(int(v.protons) && e, "protons must be 1–118");
      need(int(v.neutrons) && v.neutrons >= 0 && int(v.electrons) && v.electrons >= 0, "neutrons and electrons must be whole numbers ≥ 0");
      need(Math.abs(v.protons - v.electrons) <= 4, "an ion's charge is at most ±4");
      need(v.protons === 1 || v.neutrons >= v.protons - 2, "too few neutrons for a real nucleus");
      need(v.neutrons <= v.protons * 1.6 + 2, "too many neutrons for a real nucleus");
      const style = v.style ?? "bohr";
      if (style === "bohr") need(v.electrons <= 36, "Bohr pictures go up to 36 electrons");
      if (style === "simple") need(v.protons + v.neutrons <= 24 && v.electrons <= 12, "simple atoms: up to 24 nucleus particles and 12 electrons");
      if (style === "lewis") need(e && valenceElectrons(e.z) !== null, "Lewis dots need a main-group element");
      if (v.shells) {
        need(v.shells.reduce((a, b) => a + b, 0) === v.electrons, `shells hold ${v.shells.reduce((a, b) => a + b, 0)} electrons but electrons is ${v.electrons}`);
        need(v.shells.every((n, i) => int(n) && n >= 0 && n <= 2 * (i + 1) ** 2), "a shell holds at most 2n² electrons");
      } else if (e && style === "bohr") {
        need(bohrShells(e.z, v.electrons).length <= 5, "too many shells to draw");
      }
      break;
    }
    case "chem-element":
      need(element(v.element), `unknown element "${v.element}"`);
      need([v.number, v.symbol, v.name, v.mass].every(isMarkOk), "bad field");
      need((v.extra ?? []).length <= 4, "at most 4 extra lines");
      break;
    case "chem-table": {
      const [a, b] = v.periods ?? [1, 7];
      need(int(a) && int(b) && a >= 1 && b <= 7 && a <= b, "periods must be [first, last] within 1–7");
      const groups = v.mainOnly ? [1, 2, 13, 14, 15, 16, 17, 18] : (v.groups ?? []);
      need(groups.every((g, i) => int(g) && g >= 1 && g <= 18 && (i === 0 || g > groups[i - 1])), "groups must be 1–18 in ascending order");
      need(!v.fBlock || (!v.mainOnly && !v.groups && b >= 6), "fBlock needs the full table down to period 6 or 7");
      const syms = [...(v.ask ?? []), ...(v.highlight ?? []).flatMap((h) => h.cells ?? [])];
      for (const s of syms) {
        const e = element(s);
        need(e, `unknown element "${s}"`);
        if (e) {
          const shown = e.group === null ? v.fBlock : e.period >= a && e.period <= b && (groups.length === 0 || groups.includes(e.group));
          need(shown, `${s} is not in the part of the table shown`);
        }
      }
      for (const h of v.highlight ?? []) {
        need(h.group === undefined || (int(h.group) && h.group >= 1 && h.group <= 18), "highlight group 1–18");
        need(h.period === undefined || (int(h.period) && h.period >= 1 && h.period <= 7), "highlight period 1–7");
      }
      const trends = v.trends ?? [];
      need(trends.filter((t) => t.dir === "left" || t.dir === "right").length <= 1 && trends.filter((t) => t.dir === "up" || t.dir === "down").length <= 1, "at most one across and one down trend arrow");
      break;
    }
    case "chem-molecule": {
      const given = [v.molecule !== undefined, v.vsepr !== undefined, v.atoms !== undefined].filter(Boolean).length;
      need(given === 1, "give exactly one of molecule, vsepr, or atoms + bonds");
      if (v.molecule !== undefined) need(MOLECULES[normFormula(v.molecule)], `no preset for "${v.molecule}" (known: ${Object.keys(MOLECULES).join(", ")})`);
      if (v.vsepr) {
        const { center, outer, bonds, lone } = v.vsepr;
        need(element(center) && element(outer), "unknown element");
        need(int(bonds) && int(lone) && bonds >= 1 && lone >= 0 && VSEPR_SHAPES[`${bonds},${lone}`], "bonds + lone must be 2–6 electron domains with at least 1 bond");
      }
      if (v.atoms) {
        need(v.atoms.length >= 1 && v.atoms.length <= 12, "1–12 atoms");
        need(v.atoms.every((a) => element(a.el)), "unknown element");
        need((v.bonds ?? []).every((b) => int(b.a) && int(b.b) && b.a !== b.b && b.a >= 0 && b.b >= 0 && b.a < v.atoms!.length && b.b < v.atoms!.length), "bonds must join two different atoms by index");
        need((v.bonds ?? []).every((b) => b.order === undefined || [1, 2, 3].includes(b.order)), "bond order 1–3");
        v.atoms.forEach((a, i) => {
          if (a.el !== "H") return;
          const n = (v.bonds ?? []).filter((b) => b.a === i || b.b === i).reduce((t, b) => t + (b.order ?? 1), 0);
          need(n <= 1 && !a.lone, "hydrogen makes one single bond and has no lone pairs");
        });
      }
      break;
    }
    case "chem-reaction":
      p.push(...reactionProblems(v));
      break;
    case "chem-beaker":
      need(v.panels.length >= 1 && v.panels.length <= 3, "1–3 pieces of glassware");
      v.panels.forEach((g, i) => {
        const max = g.max ?? 0;
        need(g.volume >= 0 && (!g.max || g.volume <= max), `glass ${i + 1}: volume must be 0–max`);
        need(g.max === undefined || g.max > 0, `glass ${i + 1}: max must be positive`);
        need(g.thermometer === undefined || g.thermometer === "?" || (g.thermometer >= -30 && g.thermometer <= 120), `glass ${i + 1}: thermometer reads −30 to 120 °C`);
        need(g.bubbles === undefined || typeof g.bubbles === "boolean" || (int(g.bubbles) && g.bubbles >= 0 && g.bubbles <= 20), `glass ${i + 1}: 0–20 bubbles`);
      });
      break;
    case "chem-energy":
      if (v.mode === "profile") {
        const hi = Math.max(v.reactants, v.products);
        const peaks = v.peaks ?? (v.peak !== undefined ? [v.peak] : []);
        need(peaks.length >= 1 && peaks.length <= 3, "give peak, or 1–3 peaks");
        need(peaks.length > 0 && (v.peaks ? true : v.peak! > hi), "the peak must be above both reactants and products");
        need(!v.peaks || (v.valleys ?? []).length === v.peaks.length - 1, "valleys: one fewer than peaks");
        if (v.peaks && v.valleys) {
          const path = [v.reactants, ...v.peaks.flatMap((pk, i) => (i < v.valleys!.length ? [pk, v.valleys![i]] : [pk])), v.products];
          need(path.every((y, i) => i === 0 || (i % 2 === 1 ? y > path[i - 1] : y < path[i - 1])), "each peak must be above the levels on both sides");
        }
        need(v.catalyst === undefined || (v.catalyst > hi && v.catalyst < Math.max(...peaks)), "the catalyst peak must be between the higher end and the peak");
      } else {
        need(v.melt < v.boil, "melt must be below boil");
        need(v.cooling ? v.start > v.boil && v.end < v.melt : v.start < v.melt && v.end > v.boil, v.cooling ? "cooling: start above boil, end below melt" : "heating: start below melt, end above boil");
        need(!v.widths || v.widths.every((w) => w > 0), "widths must be positive");
      }
      break;
    case "chem-ph":
      need((v.markers ?? []).length <= 6, "at most 6 markers");
      need((v.markers ?? []).every((m) => m.pH >= 0 && m.pH <= 14), "pH must be 0–14");
      break;
    case "chem-spectrum":
      if (v.mode === "mass") {
        need(v.peaks.length >= 1 && v.peaks.length <= 8, "1–8 peaks");
        need(v.peaks.every((k) => k.mz > 0 && k.percent > 0 && k.percent <= 100), "m/z > 0 and percent 0–100");
        need(v.peaks.reduce((t, k) => t + k.percent, 0) <= 100.5 || Math.max(...v.peaks.map((k) => k.percent)) === 100, "percents add to at most 100 (or use relative heights with the biggest at 100)");
        if (v.range) need(v.peaks.every((k) => k.mz >= v.range![0] && k.mz <= v.range![1]), "peaks must be inside the range");
      } else if (v.mode === "pes") {
        need(v.peaks.length >= 1 && v.peaks.length <= 8, "1–8 peaks");
        need(v.peaks.every((k) => k.energy > 0 && int(k.electrons) && k.electrons >= 1 && k.electrons <= 14), "energies > 0 and 1–14 electrons per peak");
      } else {
        need(v.lines.length >= 1 && v.lines.length <= 12, "1–12 lines");
        need(v.lines.every((l) => l.nm >= 380 && l.nm <= 750), "lines must be 380–750 nm (visible)");
      }
      break;
    case "chem-nucleus": {
      const sides = [v.before, v.after].map((side) => side.map(nuclideNumbers));
      need(v.before.length >= 1 && v.after.length >= 1 && v.before.length + v.after.length <= 6, "1–6 terms in all");
      for (const n of [...v.before, ...v.after]) if ("element" in n) need(element(n.element), `unknown element "${n.element}"`);
      // Only nuclei need A ≥ Z; particles such as a positron (A 0, Z +1) or beta (A 0, Z −1) are exempt.
      const nuclei = sides.flat().filter((_, i) => "element" in [...v.before, ...v.after][i]);
      for (const n of nuclei) need(n.Z < 1 || n.A >= n.Z, `${n.symbol}: mass number must be at least the atomic number`);
      const sum = (s: typeof sides[0], k: "A" | "Z") => s.reduce((t, n) => t + n[k] * n.count, 0);
      need(sum(sides[0], "A") === sum(sides[1], "A"), `mass numbers don't balance (${sum(sides[0], "A")} → ${sum(sides[1], "A")})`);
      need(sum(sides[0], "Z") === sum(sides[1], "Z"), `atomic numbers don't balance (${sum(sides[0], "Z")} → ${sum(sides[1], "Z")})`);
      break;
    }
    case "chem-titration":
      if (v.mode === "curve") {
        need(v.conc > 0 && v.volume > 0 && v.titrantConc > 0, "concentrations and volume must be positive");
        need(v.pK === undefined || (v.pK > 1 && v.pK < 13), "pK must be 1–13");
        need(v.maxVolume === undefined || v.maxVolume > (v.conc * v.volume) / v.titrantConc, "maxVolume must pass the equivalence point");
      } else {
        need(v.reading >= 0 && v.reading <= 50, "burette reading 0–50 mL");
      }
      break;
    case "chem-cell": {
      for (const side of [v.left, v.right]) {
        need(element(side.metal), `unknown electrode "${side.metal}"`);
        p.push(...formulaProblems(side.solution, v.kind));
      }
      const l = REDUCTION_POTENTIALS[v.left.metal];
      const r = REDUCTION_POTENTIALS[v.right.metal];
      if (v.type === "galvanic" && l && r) {
        need(l.volts !== r.volts, "the two metals must differ");
        const lowSide = l.volts < r.volts ? "left" : "right";
        need(!v.anode || v.anode === lowSide, `in a galvanic cell the anode is the metal with the lower E° (${lowSide})`);
        if (typeof v.voltage === "number") {
          const e = Math.abs(l.volts - r.volts);
          need(Math.abs(v.voltage - e) < 0.06, `standard cell voltage is ${e.toFixed(2)} V`);
        }
      }
      break;
    }
    case "chem-materials":
      if (v.mode === "objects") {
        need(v.items.length >= 1 && v.items.length <= 6, "1–6 objects");
        need(v.items.every((it) => !it.material || MATERIALS.has(it.material)), "unknown material");
        need(v.items.every((it) => (it.properties ?? []).length <= 4), "at most 4 properties per object");
      } else if (v.mode === "pieces") {
        need(BLOCKS.has(v.from) && (v.to === "?" || BLOCKS.has(v.to)), "unknown block design");
        need(!v.labels || v.labels.length === (v.steps ?? 3), "one label per step");
      } else {
        need(v.steps.length >= 2 && v.steps.length <= 4, "2–4 steps");
        need(v.arrows.length === v.steps.length - 1, "one arrow label between each pair of steps");
      }
      break;
  }
  return p;
}

/* ================================================================ activities */

/** Every way the kid could finish a buildMolecule: is this target buildable around `center`? */
export function moleculeBuildable(center: string, outer: string[]): boolean {
  const vc = valenceElectrons(center);
  if (vc === null || center === "H" || outer.length < 1 || outer.length > 4) return false;
  let total = 0;
  for (const el of outer) {
    const v = valenceElectrons(el);
    if (v === null) return false;
    const order = el === "H" ? 1 : 8 - v;
    if (order < 1 || order > 3) return false;
    total += order;
  }
  return total === (8 - vc) && 8 - vc >= 1;
}

/** Problems with a chemistry activity (e.g. an equation that can't be balanced); empty means it's fine. */
export function chemistryActivityProblems(a: ChemistryActivity): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(`${a.kind}: ${msg}`);
  };
  switch (a.kind) {
    case "chem-balance": {
      const all = [...a.reactants, ...a.products];
      need(a.reactants.length >= 1 && a.products.length >= 1 && all.length <= 6, "1+ reactants, 1+ products, at most 6 in all");
      all.forEach((f) => p.push(...formulaProblems(f, a.kind)));
      if (p.length) break;
      const r = balance(a.reactants, a.products);
      need(r.coefficients, `the equation can't be balanced: ${r.reason}`);
      if (!r.coefficients) break;
      const max = a.max ?? 10;
      need(max >= 2 && max <= 20, "max must be 2–20");
      need(a.states === undefined || a.states.length === all.length, "one state per formula");
      if (a.given) {
        need(a.given.length === all.length, "one given entry per formula");
        need(a.given.some((g) => g === null), "leave at least one coefficient (null) for the kid");
        const known = a.given.map((g, i) => (g === null ? null : g / r.coefficients![i])).filter((k) => k !== null) as number[];
        const k = known.length ? known[0] : 1;
        need(known.every((x) => Math.abs(x - k) < 1e-9) && int(k) && k >= 1, `given coefficients must fit the balanced equation (${r.coefficients.join(", ")})`);
        need(r.coefficients.every((c) => c * k <= max), `a coefficient is bigger than max ${max}`);
      } else {
        need(r.coefficients.every((c) => c <= max), `the balanced coefficients (${r.coefficients.join(", ")}) go past max ${max}`);
        need(r.coefficients.some((c) => c > 1), "it's already balanced with all 1s");
      }
      break;
    }
    case "chem-buildAtom": {
      const e = element(a.target.element);
      need(e, `unknown element "${a.target.element}"`);
      if (!e) break;
      need(e.z <= 36, "targets up to krypton (Z ≤ 36); keep to Z ≤ 20 for a readable picture");
      const charge = a.target.charge ?? 0;
      need(int(charge) && Math.abs(charge) <= 3 && e.z - charge >= 0, "charge must be −3 to +3");
      if (a.target.A !== undefined) {
        const n = a.target.A - e.z;
        need(int(a.target.A) && n >= 0 && (e.z === 1 || n >= e.z - 2) && n <= e.z * 1.6 + 2, `mass number ${a.target.A} isn't a sensible isotope of ${e.name}`);
        need(n <= 46, "too many neutrons to build");
      }
      if (a.start) need([a.start.protons, a.start.neutrons, a.start.electrons].every((x) => int(x) && x >= 0 && x <= 50), "start counts 0–50");
      break;
    }
    case "chem-states": {
      const step = a.step ?? 5;
      const min = a.min ?? a.melt - 40;
      const max = a.max ?? a.boil + 40;
      need(a.melt < a.boil, "melt must be below boil");
      need(step > 0 && min < max && (max - min) / step <= 200, "slider needs min < max and at most 200 steps");
      const on = (t: number) => Math.abs((t - min) / step - Math.round((t - min) / step)) < 1e-9;
      need(on(a.melt) && on(a.boil), "melt and boil must land on the slider's steps");
      const start = a.start ?? min;
      need(start >= min && start <= max && on(start), "start must be a step on the slider");
      const stateAt = (t: number) => (t < a.melt ? "solid" : t < a.boil ? "liquid" : "gas");
      if (typeof a.target === "string") {
        const reach = a.target === "solid" ? min < a.melt : a.target === "gas" ? max >= a.boil : a.melt >= min && a.melt <= max;
        need(reach, `the slider can't reach ${a.target}`);
        need(stateAt(start) !== a.target, "it already starts in the target state");
      } else {
        const t = a.target.find === "melt" ? a.melt : a.boil;
        need(t > min && t <= max, "the point to find must be inside the slider");
      }
      if (a.formula) p.push(...formulaProblems(a.formula, a.kind));
      break;
    }
    case "chem-mix": {
      if (a.mode === "mixture") {
        const max = a.max ?? 12;
        need(a.species.length >= 2 && a.species.length <= 3, "2–3 kinds");
        need(max >= 2 && max <= 20, "max must be 2–20");
        a.species.forEach((s) => s.formula && p.push(...formulaProblems(s.formula, a.kind)));
        const { counts, ratio } = a.target;
        need((counts === undefined) !== (ratio === undefined), "give target counts or ratio (one)");
        if (counts) need(counts.length === a.species.length && counts.every((c) => int(c) && c >= 0 && c <= max), "one count per kind, 0–max");
        if (ratio) need(ratio.length === a.species.length && ratio.every((c) => int(c) && c >= 1) && Math.max(...ratio) <= max, "one whole-number ratio part per kind that fits under max");
      } else {
        need(a.reactants.length >= 1 && a.reactants.length <= 3 && a.products.length >= 1 && a.products.length <= 3, "1–3 reactants and products");
        [...a.reactants.map((r) => r.formula), ...a.products].forEach((f) => p.push(...formulaProblems(f, a.kind)));
        if (p.length) break;
        const r = balance(
          a.reactants.map((x) => x.formula),
          a.products,
        );
        need(r.coefficients, `the reaction can't be balanced: ${r.reason}`);
        if (!r.coefficients) break;
        const runs = Math.min(...a.reactants.map((x, i) => Math.floor(x.count / r.coefficients![i])));
        need(runs >= 1, "not enough molecules to react even once");
        need(a.reactants.every((x) => int(x.count) && x.count >= 0), "counts must be whole numbers");
        const most = a.reactants.reduce((t, x) => t + x.count, 0);
        const made = runs * a.products.reduce((t, _, i) => t + r.coefficients![a.reactants.length + i], 0);
        need(most <= 24 && made <= 24, "keep to 24 molecules so they fit");
      }
      break;
    }
    case "chem-buildMolecule": {
      need(element(a.center) && valenceElectrons(a.center) !== null && a.center !== "H", "the centre must be a main-group element other than H");
      need(a.tray.length >= 1 && a.tray.length <= 4 && a.tray.every((el) => element(el) && valenceElectrons(el) !== null), "1–4 main-group elements in the tray");
      if (a.target) {
        const t = parseFormula(a.target);
        need(!t.unknown.length && t.charge === 0, "target must be a neutral formula of known elements");
        const atoms = { ...t.atoms };
        if ((atoms[a.center] ?? 0) < 1) {
          need(false, "the target must contain the centre atom");
          break;
        }
        atoms[a.center]--;
        const outer = Object.entries(atoms).flatMap(([el, n]) => Array<string>(n).fill(el));
        need(outer.every((el) => a.tray.includes(el)), "every outer atom must be in the tray");
        need(moleculeBuildable(a.center, outer), `${a.target} can't be built with full shells around ${a.center}`);
      } else {
        need(a.tray.some((el) => [1, 2, 3, 4].some((n) => moleculeBuildable(a.center, Array(n).fill(el)))), "no molecule can be built from this tray");
      }
      break;
    }
    case "chem-measure":
      if (a.mode === "fill") {
        need(a.max > 0 && a.step > 0 && a.max / a.step <= 50, "at most 50 marks (max / step) so they can be read");
        need(a.target > 0 && a.target <= a.max && int(Math.round(a.target / a.step * 1e6) / 1e6), "target must be a step between 0 and max");
      } else {
        const w = a.weights ?? [100, 50, 20, 10, 5, 2, 1];
        need(int(a.mass) && a.mass >= 1 && a.mass <= 1000, "mass must be 1–1000 g");
        need(w.length >= 1 && w.length <= 7 && w.every((x) => int(x) && x > 0), "1–7 whole-gram weights");
        // Fewest weights that make each mass; the pan holds 12.
        const best = Array<number>(a.mass + 1).fill(Infinity);
        best[0] = 0;
        for (let m = 1; m <= a.mass; m++) for (const x of w) if (x <= m) best[m] = Math.min(best[m], best[m - x] + 1);
        need(best[a.mass] <= 12, "the mass can't be made from these weights with 12 or fewer on the pan");
      }
      break;
  }
  return p;
}
