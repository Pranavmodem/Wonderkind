/**
 * Molecule geometry and element colours (no React here, so validation can import it).
 * - MOLECULES: preset Lewis drawings by formula (2D, in bond lengths, y down).
 * - vseprMolecule(): a generic AXₙEₘ shape with wedge/dash bonds.
 * - particleShape(): a compact space-filling layout of any formula for particle diagrams.
 * - elementColour(): CPK-like colours (H white, C dark grey, O red, N blue, Cl green, Na purple…).
 */
import { element, parseFormula, sub } from "../../../game/science/elements";

export interface MolAtom {
  el: string;
  x: number;
  y: number;
  /** Lone pairs (Lewis). */
  lone?: number;
  /** Directions (radians, screen: 0 = right, π/2 = down) for lone pairs; worked out automatically when missing. */
  loneDirs?: number[];
  charge?: string;
}

export interface MolBond {
  a: number;
  b: number;
  order?: 1 | 2 | 3;
  wedge?: "toward" | "away";
}

export interface Molecule {
  atoms: MolAtom[];
  bonds: MolBond[];
  /** Shape name around the centre atom (atom 0), e.g. "bent". */
  shape?: string;
  /** Bond angle at the centre, degrees. */
  angle?: number;
  /** Overall ion charge, drawn with brackets. */
  ionCharge?: string;
  /** The AXₙEₘ description, so ball-and-stick pictures can draw it in 3D. */
  ax?: { n: number; m: number };
}

/** Normalise "H2O" / "H₂O" to the subscript form used as preset keys. */
export const normFormula = (f: string) => sub(f.trim());

const deg = (d: number) => (d * Math.PI) / 180;
/** Two outer atoms around a centre at the origin, opening downward, with the given angle. */
const pair = (angle: number) => {
  const h = deg(angle / 2);
  return [
    { x: -Math.sin(h), y: Math.cos(h) },
    { x: Math.sin(h), y: Math.cos(h) },
  ];
};

function star(center: string, outer: string, n: number, lone: number, outerLone: number, startDeg: number): MolAtom[] {
  return [
    { el: center, x: 0, y: 0, lone },
    ...Array.from({ length: n }, (_, i) => {
      const a = deg(startDeg + (360 / n) * i);
      return { el: outer, x: Math.cos(a), y: Math.sin(a), lone: outerLone };
    }),
  ];
}

const spokes = (n: number, order: 1 | 2 | 3 = 1): MolBond[] => Array.from({ length: n }, (_, i) => ({ a: 0, b: i + 1, order }));

const water = (center: string, angle: number, lone = 2): Molecule => {
  const [l, r] = pair(angle);
  return {
    atoms: [
      { el: center, x: 0, y: 0, lone },
      { el: "H", ...l },
      { el: "H", ...r },
    ],
    bonds: spokes(2),
    shape: "bent",
    angle,
    ax: { n: 2, m: lone },
  };
};

/** Lewis drawings of common molecules, keyed by formula with subscripts ("H₂O"). */
export const MOLECULES: Record<string, Molecule> = {
  "H₂": { atoms: [{ el: "H", x: -0.5, y: 0 }, { el: "H", x: 0.5, y: 0 }], bonds: [{ a: 0, b: 1 }], shape: "linear" },
  "O₂": { atoms: [{ el: "O", x: -0.5, y: 0, lone: 2 }, { el: "O", x: 0.5, y: 0, lone: 2 }], bonds: [{ a: 0, b: 1, order: 2 }], shape: "linear" },
  "N₂": { atoms: [{ el: "N", x: -0.5, y: 0, lone: 1 }, { el: "N", x: 0.5, y: 0, lone: 1 }], bonds: [{ a: 0, b: 1, order: 3 }], shape: "linear" },
  "F₂": { atoms: [{ el: "F", x: -0.5, y: 0, lone: 3 }, { el: "F", x: 0.5, y: 0, lone: 3 }], bonds: [{ a: 0, b: 1 }], shape: "linear" },
  "Cl₂": { atoms: [{ el: "Cl", x: -0.5, y: 0, lone: 3 }, { el: "Cl", x: 0.5, y: 0, lone: 3 }], bonds: [{ a: 0, b: 1 }], shape: "linear" },
  HF: { atoms: [{ el: "F", x: 0.5, y: 0, lone: 3 }, { el: "H", x: -0.5, y: 0 }], bonds: [{ a: 0, b: 1 }], shape: "linear" },
  HCl: { atoms: [{ el: "Cl", x: 0.5, y: 0, lone: 3 }, { el: "H", x: -0.5, y: 0 }], bonds: [{ a: 0, b: 1 }], shape: "linear" },
  "H₂O": water("O", 104.5),
  "H₂S": water("S", 92),
  "CO₂": {
    atoms: [
      { el: "C", x: 0, y: 0 },
      { el: "O", x: -1, y: 0, lone: 2 },
      { el: "O", x: 1, y: 0, lone: 2 },
    ],
    bonds: spokes(2, 2),
    shape: "linear",
    angle: 180,
    ax: { n: 2, m: 0 },
  },
  "CH₄": { atoms: star("C", "H", 4, 0, 0, 0), bonds: spokes(4), shape: "tetrahedral", angle: 109.5, ax: { n: 4, m: 0 } },
  "CCl₄": { atoms: star("C", "Cl", 4, 0, 3, 0), bonds: spokes(4), shape: "tetrahedral", angle: 109.5, ax: { n: 4, m: 0 } },
  "NH₃": {
    atoms: [
      { el: "N", x: 0, y: 0, lone: 1, loneDirs: [-Math.PI / 2] },
      { el: "H", x: -1, y: 0 },
      { el: "H", x: 1, y: 0 },
      { el: "H", x: 0, y: 1 },
    ],
    bonds: spokes(3),
    shape: "trigonal pyramidal",
    angle: 107,
    ax: { n: 3, m: 1 },
  },
  "PCl₃": {
    atoms: [
      { el: "P", x: 0, y: 0, lone: 1, loneDirs: [-Math.PI / 2] },
      { el: "Cl", x: -1, y: 0, lone: 3 },
      { el: "Cl", x: 1, y: 0, lone: 3 },
      { el: "Cl", x: 0, y: 1, lone: 3 },
    ],
    bonds: spokes(3),
    shape: "trigonal pyramidal",
    angle: 100,
    ax: { n: 3, m: 1 },
  },
  "H₃O⁺": {
    atoms: [
      { el: "O", x: 0, y: 0, lone: 1, loneDirs: [-Math.PI / 2] },
      { el: "H", x: -1, y: 0 },
      { el: "H", x: 1, y: 0 },
      { el: "H", x: 0, y: 1 },
    ],
    bonds: spokes(3),
    shape: "trigonal pyramidal",
    angle: 107,
    ionCharge: "+",
    ax: { n: 3, m: 1 },
  },
  "NH₄⁺": { atoms: star("N", "H", 4, 0, 0, 0), bonds: spokes(4), shape: "tetrahedral", angle: 109.5, ionCharge: "+", ax: { n: 4, m: 0 } },
  "OH⁻": { atoms: [{ el: "O", x: 0, y: 0, lone: 3 }, { el: "H", x: 1, y: 0 }], bonds: [{ a: 0, b: 1 }], shape: "linear", ionCharge: "−" },
  "C₂H₆": {
    atoms: [
      { el: "C", x: -0.5, y: 0 },
      { el: "C", x: 0.5, y: 0 },
      { el: "H", x: -1.5, y: 0 },
      { el: "H", x: -0.5, y: -1 },
      { el: "H", x: -0.5, y: 1 },
      { el: "H", x: 1.5, y: 0 },
      { el: "H", x: 0.5, y: -1 },
      { el: "H", x: 0.5, y: 1 },
    ],
    bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 0, b: 4 }, { a: 1, b: 5 }, { a: 1, b: 6 }, { a: 1, b: 7 }],
    shape: "tetrahedral",
    angle: 109.5,
  },
  "C₂H₄": {
    atoms: [
      { el: "C", x: -0.5, y: 0 },
      { el: "C", x: 0.5, y: 0 },
      { el: "H", x: -1, y: -0.87 },
      { el: "H", x: -1, y: 0.87 },
      { el: "H", x: 1, y: -0.87 },
      { el: "H", x: 1, y: 0.87 },
    ],
    bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 1, b: 4 }, { a: 1, b: 5 }],
    shape: "trigonal planar",
    angle: 120,
  },
  "C₂H₂": {
    atoms: [
      { el: "C", x: -0.5, y: 0 },
      { el: "C", x: 0.5, y: 0 },
      { el: "H", x: -1.5, y: 0 },
      { el: "H", x: 1.5, y: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 3 }, { a: 0, b: 2 }, { a: 1, b: 3 }],
    shape: "linear",
    angle: 180,
  },
  "CH₃OH": {
    atoms: [
      { el: "C", x: -0.5, y: 0 },
      { el: "O", x: 0.5, y: 0, lone: 2, loneDirs: [-Math.PI / 2 + 0.2, Math.PI / 2 + 0.6] },
      { el: "H", x: -1.5, y: 0 },
      { el: "H", x: -0.5, y: -1 },
      { el: "H", x: -0.5, y: 1 },
      { el: "H", x: 1.3, y: 0.6 },
    ],
    bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 0, b: 4 }, { a: 1, b: 5 }],
    shape: "tetrahedral",
    angle: 109.5,
  },
  HCN: {
    atoms: [
      { el: "C", x: 0, y: 0 },
      { el: "H", x: -1, y: 0 },
      { el: "N", x: 1, y: 0, lone: 1 },
    ],
    bonds: [{ a: 0, b: 1 }, { a: 0, b: 2, order: 3 }],
    shape: "linear",
    angle: 180,
    ax: { n: 2, m: 0 },
  },
  "CH₂O": {
    atoms: [
      { el: "C", x: 0, y: 0 },
      { el: "O", x: 0, y: -1, lone: 2 },
      { el: "H", x: -0.87, y: 0.5 },
      { el: "H", x: 0.87, y: 0.5 },
    ],
    bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2 }, { a: 0, b: 3 }],
    shape: "trigonal planar",
    angle: 120,
    ax: { n: 3, m: 0 },
  },
  "BF₃": { atoms: star("B", "F", 3, 0, 3, -90), bonds: spokes(3), shape: "trigonal planar", angle: 120, ax: { n: 3, m: 0 } },
  "SO₂": (() => {
    const [l, r] = pair(119);
    return {
      atoms: [
        { el: "S", x: 0, y: 0, lone: 1 },
        { el: "O", ...l, lone: 2 },
        { el: "O", ...r, lone: 2 },
      ],
      bonds: spokes(2, 2),
      shape: "bent",
      angle: 119,
      ax: { n: 2, m: 1 },
    };
  })(),
  "O₃": (() => {
    const [l, r] = pair(117);
    return {
      atoms: [
        { el: "O", x: 0, y: 0, lone: 1, charge: "+" },
        { el: "O", ...l, lone: 2 },
        { el: "O", ...r, lone: 3, charge: "−" },
      ],
      bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2 }],
      shape: "bent",
      angle: 117,
      ax: { n: 2, m: 1 },
    };
  })(),
  "PCl₅": { atoms: star("P", "Cl", 5, 0, 3, -90), bonds: spokes(5), shape: "trigonal bipyramidal", angle: 90, ax: { n: 5, m: 0 } },
  "SF₆": { atoms: star("S", "F", 6, 0, 3, -90), bonds: spokes(6), shape: "octahedral", angle: 90, ax: { n: 6, m: 0 } },
};

/* --------------------------------------------------------------- VSEPR */

/** Shape names for AXₙEₘ (n bonded atoms, m lone pairs). */
export const VSEPR_SHAPES: Record<string, { shape: string; angle: number }> = {
  "1,0": { shape: "linear", angle: 180 },
  "1,1": { shape: "linear", angle: 180 },
  "1,2": { shape: "linear", angle: 180 },
  "1,3": { shape: "linear", angle: 180 },
  "2,0": { shape: "linear", angle: 180 },
  "3,0": { shape: "trigonal planar", angle: 120 },
  "2,1": { shape: "bent", angle: 117 },
  "4,0": { shape: "tetrahedral", angle: 109.5 },
  "3,1": { shape: "trigonal pyramidal", angle: 107 },
  "2,2": { shape: "bent", angle: 104.5 },
  "5,0": { shape: "trigonal bipyramidal", angle: 90 },
  "4,1": { shape: "seesaw", angle: 90 },
  "3,2": { shape: "T-shaped", angle: 90 },
  "2,3": { shape: "linear", angle: 180 },
  "6,0": { shape: "octahedral", angle: 90 },
  "5,1": { shape: "square pyramidal", angle: 90 },
  "4,2": { shape: "square planar", angle: 90 },
};

type Dom = { x: number; y: number; d: 0 | 1 | -1 };

/** Hand-placed electron-domain directions (screen x right, y down; d = toward/away), lone pairs taking the first slots. */
function domains(total: number, m: number): Dom[] {
  switch (total) {
    case 1:
      return [{ x: 1, y: 0, d: 0 }];
    case 2:
      return [{ x: -1, y: 0, d: 0 }, { x: 1, y: 0, d: 0 }];
    case 3:
      return [{ x: 0, y: -1, d: 0 }, { x: -0.866, y: 0.5, d: 0 }, { x: 0.866, y: 0.5, d: 0 }];
    case 4:
      if (m === 2)
        return [
          { x: -0.5, y: -0.78, d: 0 },
          { x: 0.5, y: -0.78, d: 0 },
          { x: -0.82, y: 0.57, d: 0 },
          { x: 0.82, y: 0.57, d: 0 },
        ];
      return [
        { x: 0, y: -1, d: 0 },
        { x: 0.62, y: 0.55, d: 1 },
        { x: 0.86, y: 0.12, d: -1 },
        { x: -0.94, y: 0.34, d: 0 },
      ];
    case 5:
      return [
        { x: 0.66, y: 0.42, d: 1 },
        { x: 0.78, y: -0.3, d: -1 },
        { x: -1, y: 0, d: 0 },
        { x: 0, y: -1, d: 0 },
        { x: 0, y: 1, d: 0 },
      ];
    default:
      return [
        { x: 0, y: -1, d: 0 },
        { x: 0, y: 1, d: 0 },
        { x: -1, y: 0, d: 0 },
        { x: 1, y: 0, d: 0 },
        { x: -0.6, y: 0.42, d: 1 },
        { x: 0.6, y: -0.42, d: -1 },
      ];
  }
}

/**
 * A generic AXₙEₘ molecule: `center` with `n` bonded `outer` atoms and `m` lone pairs (n + m = 1–6), placed in a
 * textbook 3D perspective (wedges toward, dashes away). Outer atoms get 3 lone pairs if `outerLone` (halogens).
 */
export function vseprMolecule(center: string, outer: string, n: number, m: number, outerLone = false): Molecule {
  const doms = domains(n + m, m);
  const lone = doms.slice(0, m);
  const bonded = doms.slice(m);
  // A singly bonded outer atom keeps its other valence electrons as lone pairs (3 for a halogen).
  const outerLoneCount = outerLone && outer !== "H" ? Math.max(0, Math.floor(((valenceOf(outer) ?? 7) - 1) / 2)) : 0;
  const info = VSEPR_SHAPES[`${n},${m}`];
  return {
    atoms: [
      { el: center, x: 0, y: 0, lone: m, loneDirs: lone.map((d) => Math.atan2(d.y, d.x)) },
      ...bonded.map((d) => ({ el: outer, x: d.x, y: d.y, lone: outerLoneCount })),
    ],
    bonds: bonded.map((d, i) => ({ a: 0, b: i + 1, order: 1 as const, ...(d.d === 1 ? { wedge: "toward" as const } : d.d === -1 ? { wedge: "away" as const } : {}) })),
    shape: info?.shape,
    angle: info?.angle,
    ax: { n, m },
  };
}

function valenceOf(sym: string): number | null {
  const e = element(sym);
  if (!e || e.group === null) return null;
  if (e.z === 2) return 2;
  if (e.group <= 2) return e.group;
  if (e.group >= 13) return e.group - 10;
  return null;
}

/**
 * Directions (radians) for an atom's lone pairs: the biggest gaps between its bonds. `taken` are the bond
 * directions from the atom.
 */
export function loneDirections(taken: number[], count: number): number[] {
  if (count <= 0) return [];
  // A lone atom: top, bottom, right, left (pairs on opposite sides first).
  if (taken.length === 0) return [-Math.PI / 2, Math.PI / 2, 0, Math.PI].slice(0, count);
  // One bond: at right angles to it, then straight behind it.
  if (taken.length === 1) {
    const b = taken[0];
    const order = count === 1 ? [b + Math.PI] : [b + Math.PI / 2, b - Math.PI / 2, b + Math.PI];
    return order.slice(0, count);
  }
  // Otherwise spread them evenly through the widest gap between bonds.
  const sorted = [...taken].map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
  let best = 0;
  let gap = -1;
  sorted.forEach((a, i) => {
    const next = i === sorted.length - 1 ? sorted[0] + 2 * Math.PI : sorted[i + 1];
    if (next - a > gap) {
      gap = next - a;
      best = a;
    }
  });
  return Array.from({ length: count }, (_, i) => best + (gap * (i + 1)) / (count + 1));
}

/* ------------------------------------------------------- particle shapes */

/** Atom radius in particle pictures (relative to a bond length of 1): hydrogen is small. */
export const atomRadius = (el: string) => (el === "H" ? 0.42 : (element(el)?.period ?? 2) >= 3 ? 0.66 : 0.58);

/**
 * A compact space-filling layout of a formula for particle diagrams: atoms with x/y (bond lengths ≈ 0.9) and
 * radius. Uses the preset shape when there is one; otherwise "one centre + same outer atoms" stars, and a
 * cluster for anything else. Charge is returned for ions.
 */
export function particleShape(formula: string): { atoms: { el: string; x: number; y: number; r: number }[]; charge: number } {
  const key = normFormula(formula);
  const parsed = parseFormula(key);
  const k = 0.82;
  const preset = MOLECULES[key];
  // Presets are drawn with bond length 1; squeeze them so the atoms overlap like a space-filling model.
  const kp = 0.66;
  if (preset && preset.atoms.length <= 8) {
    return {
      atoms: preset.atoms.map((a) => ({ el: a.el, x: a.x * kp, y: a.y * kp, r: atomRadius(a.el) })),
      charge: parsed.charge,
    };
  }
  const list: string[] = [];
  for (const [el, n] of Object.entries(parsed.atoms)) for (let i = 0; i < n; i++) list.push(el);
  if (list.length === 0) return { atoms: [], charge: parsed.charge };
  if (list.length === 1) return { atoms: [{ el: list[0], x: 0, y: 0, r: atomRadius(list[0]) * 1.15 }], charge: parsed.charge };
  if (list.length === 2) {
    const d = (atomRadius(list[0]) + atomRadius(list[1])) * 0.62;
    return { atoms: list.map((el, i) => ({ el, x: (i - 0.5) * d, y: 0, r: atomRadius(el) })), charge: parsed.charge };
  }
  const kinds = Object.entries(parsed.atoms);
  const centre = kinds.find(([, n]) => n === 1);
  if (kinds.length === 2 && centre) {
    const [cEl] = centre;
    const [oEl, n] = kinds.find(([el]) => el !== cEl)!;
    if (n >= 2 && n <= 6) {
      const bentCentre = ["O", "S"].includes(cEl) && n === 2;
      const angles = bentCentre ? [deg(90 + 52), deg(90 - 52)] : Array.from({ length: n }, (_, i) => deg(-90 + (360 / n) * i + (n === 2 ? 90 : n === 4 ? 45 : 0)));
      const d = k * (atomRadius(cEl) + atomRadius(oEl)) / 1.24;
      return {
        atoms: [{ el: cEl, x: 0, y: 0, r: atomRadius(cEl) }, ...angles.map((a) => ({ el: oEl, x: Math.cos(a) * d, y: Math.sin(a) * d, r: atomRadius(oEl) }))],
        charge: parsed.charge,
      };
    }
  }
  // Cluster: a hexagonal spiral, heaviest atoms first in the middle.
  list.sort((a, b) => (element(b)?.z ?? 0) - (element(a)?.z ?? 0));
  const spots = [
    [0, 0],
    [1, 0],
    [0.5, 0.87],
    [-0.5, 0.87],
    [-1, 0],
    [-0.5, -0.87],
    [0.5, -0.87],
    [2, 0],
    [1.5, 0.87],
    [1, 1.73],
    [0, 1.73],
    [-1, 1.73],
    [-1.5, 0.87],
    [-2, 0],
    [-1.5, -0.87],
    [-1, -1.73],
    [0, -1.73],
    [1, -1.73],
    [1.5, -0.87],
  ];
  return { atoms: list.slice(0, spots.length).map((el, i) => ({ el, x: spots[i][0] * k, y: spots[i][1] * k, r: atomRadius(el) })), charge: parsed.charge };
}

/* -------------------------------------------------------------- colours */

const CPK: Record<string, string> = {
  H: "#ffffff",
  He: "#86e1ee",
  Li: "#b583f2",
  Be: "#c2ff00",
  B: "#ffb5a6",
  C: "#3d4350",
  N: "#3a63e8",
  O: "#ec3d3d",
  F: "#8fe36b",
  Ne: "#86e1ee",
  Na: "#9a5cf0",
  Mg: "#4fae3a",
  Al: "#b4bcc8",
  Si: "#d9b98a",
  P: "#ff8a1f",
  S: "#ffd33d",
  Cl: "#36b84a",
  Ar: "#86e1ee",
  K: "#8443d6",
  Ca: "#3f9a3f",
  Ti: "#a8adb6",
  Cr: "#8a99c7",
  Mn: "#9c7ac7",
  Fe: "#e0752f",
  Co: "#f090a0",
  Ni: "#50d050",
  Cu: "#c8783c",
  Zn: "#7d80b0",
  Br: "#a3282a",
  Kr: "#5cb8d1",
  Ag: "#c4c8d0",
  Sn: "#9aa3ae",
  I: "#7a2fb8",
  Xe: "#4a9ec2",
  Pt: "#d0d0e0",
  Au: "#f2c230",
  Hg: "#b8b8d0",
  Pb: "#585e6b",
  U: "#2f8fff",
};

const BY_CATEGORY: Record<string, string> = {
  "alkali-metal": "#9a5cf0",
  "alkaline-earth": "#3f9a3f",
  "transition-metal": "#d99a6c",
  "post-transition-metal": "#9aa3ae",
  metalloid: "#d9b98a",
  nonmetal: "#f28fc0",
  halogen: "#36b84a",
  "noble-gas": "#86e1ee",
  lanthanide: "#6fd3c6",
  actinide: "#6fa8ff",
};

/** Ball colour for an element (CPK-like). Unknown symbols are grey. */
export function elementColour(sym: string): string {
  const e = element(sym);
  return CPK[sym] ?? (e ? BY_CATEGORY[e.category] : "#b0b6c0");
}

/** Dark ink or white text, whichever reads better on the colour. */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#23305a" : "#ffffff";
}

/** Outline for a ball: a darker shade of its colour (white balls get a grey edge). */
export function edgeOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * 0.68);
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}
