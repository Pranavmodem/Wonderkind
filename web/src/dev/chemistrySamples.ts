import type { Activity, Colour, Visual } from "../game/types";

/** Gallery samples for chemistry pictures: [name, picture, world colour]. */
export const CHEMISTRY_VISUALS: [string, Visual, Colour][] = [
  [
    "chem-particles states",
    {
      kind: "chem-particles",
      panels: [
        { species: [{ formula: "H₂O", count: 12 }], arrangement: "solid", label: "Solid", motion: 1 },
        { species: [{ formula: "H₂O", count: 12 }], arrangement: "liquid", label: "Liquid", motion: 2 },
        { species: [{ formula: "H₂O", count: 12 }], arrangement: "gas", label: "?", motion: 3 },
      ],
      joiner: null,
    },
    "wave",
  ],
  [
    "chem-particles reaction",
    {
      kind: "chem-particles",
      panels: [
        { species: [{ formula: "H₂", count: 4, name: "hydrogen" }, { formula: "O₂", count: 2, name: "oxygen" }], label: "Before" },
        { species: [{ formula: "H₂O", count: 4, name: "water" }], label: "After" },
      ],
    },
    "teal",
  ],
  [
    "chem-particles mixture",
    {
      kind: "chem-particles",
      panels: [{ species: [{ name: "salt", colour: "berry", count: 3 }, { name: "water", colour: "wave", count: 7 }], arrangement: "liquid", container: "beaker", animate: true }],
    },
    "berry",
  ],
  [
    "chem-particles limiting",
    {
      kind: "chem-particles",
      panels: [
        { species: [{ formula: "N₂", count: 2 }, { formula: "H₂", count: 9 }] },
        { species: [{ formula: "NH₃", count: 4 }, { formula: "N₂", count: 0 }, { formula: "H₂", count: 3, ring: true }] },
      ],
    },
    "grape",
  ],
  [
    "chem-particles ions",
    {
      kind: "chem-particles",
      panels: [
        { species: [{ formula: "Na⁺", count: 8 }, { formula: "Cl⁻", count: 8 }], arrangement: "solid", label: "NaCl crystal" },
        { species: [{ formula: "Na⁺", count: 4 }, { formula: "Cl⁻", count: 4 }, { formula: "H₂O", count: 10 }], arrangement: "liquid", label: "Dissolved" },
      ],
      joinerLabel: "add water",
    },
    "leaf",
  ],
  ["chem-atom bohr", { kind: "chem-atom", protons: 11, neutrons: 12, electrons: 11, valence: true }, "grape"],
  ["chem-atom ion ask", { kind: "chem-atom", protons: 17, neutrons: 18, electrons: 18, hide: ["symbol", "charge"] }, "leaf"],
  ["chem-atom simple", { kind: "chem-atom", protons: 3, neutrons: 4, electrons: 3, style: "simple" }, "sun"],
  ["chem-atom lewis", { kind: "chem-atom", protons: 8, neutrons: 8, electrons: 8, style: "lewis" }, "berry"],
  ["chem-atom iron", { kind: "chem-atom", protons: 26, neutrons: 30, electrons: 26 }, "tangerine"],
  ["chem-element", { kind: "chem-element", element: "C" }, "night"],
  ["chem-element ask", { kind: "chem-element", element: "Na", mass: "?", extra: [{ label: "Protons", value: 11 }, { label: "Electrons", value: "?" }], config: true }, "berry"],
  ["chem-table main", { kind: "chem-table", mainOnly: true, periods: [1, 4], show: "number", colourBy: "category", ask: ["Mg"] }, "wave"],
  ["chem-table full", { kind: "chem-table", colourBy: "metal", staircase: true, fBlock: true }, "teal"],
  [
    "chem-table trends",
    {
      kind: "chem-table",
      mainOnly: true,
      highlight: [{ group: 17, colour: "leaf", label: "Halogens" }, { cells: ["Na", "K"], colour: "berry", label: "Alkali metals" }],
      trends: [{ dir: "right", label: "Electronegativity increases" }, { dir: "down", label: "Radius increases" }],
    },
    "grape",
  ],
  ["chem-molecule water", { kind: "chem-molecule", molecule: "H₂O", shape: true, angle: 104.5 }, "wave"],
  ["chem-molecule CO₂", { kind: "chem-molecule", molecule: "CO₂", name: "Carbon dioxide" }, "night"],
  ["chem-molecule ethene", { kind: "chem-molecule", molecule: "C₂H₄", style: "structural" }, "leaf"],
  ["chem-molecule NH₃ ball", { kind: "chem-molecule", molecule: "NH₃", style: "ball", lonePairs: true, shape: true }, "grape"],
  ["chem-molecule vsepr", { kind: "chem-molecule", vsepr: { center: "S", outer: "F", bonds: 4, lone: 1 }, shape: "?" }, "tangerine"],
  ["chem-molecule CH₄ ball", { kind: "chem-molecule", molecule: "CH₄", style: "ball", shape: true, angle: "?" }, "teal"],
  ["chem-molecule NH₄⁺", { kind: "chem-molecule", molecule: "NH₄⁺" }, "rose"],
  [
    "chem-reaction",
    {
      kind: "chem-reaction",
      reactants: [{ coef: "?", formula: "H₂", state: "g" }, { formula: "O₂", state: "g" }],
      products: [{ coef: 2, formula: "H₂O", state: "l" }],
      dH: -572,
    },
    "berry",
  ],
  [
    "chem-reaction ionic",
    { kind: "chem-reaction", reactants: [{ formula: "Ag⁺", state: "aq" }, { formula: "Cl⁻", state: "aq" }], products: [{ formula: "AgCl", state: "s" }] },
    "teal",
  ],
  [
    "chem-reaction equilibrium",
    { kind: "chem-reaction", reactants: [{ formula: "N₂", state: "g" }, { coef: 3, formula: "H₂", state: "g" }], products: [{ coef: 2, formula: "NH₃", state: "g" }], arrow: "⇌", above: "Fe" },
    "grape",
  ],
  [
    "chem-reaction words",
    { kind: "chem-reaction", words: true, reactants: [{ text: "iron" }, { text: "oxygen" }], products: [{ text: "rust" }] },
    "tangerine",
  ],
  [
    "chem-beaker",
    {
      kind: "chem-beaker",
      panels: [
        { glass: "beaker", volume: 150, colour: "wave", label: "Before", thermometer: 22 },
        { glass: "beaker", volume: 150, colour: "leaf", bubbles: true, label: "After", thermometer: 31 },
      ],
    },
    "wave",
  ],
  [
    "chem-beaker mass",
    {
      kind: "chem-beaker",
      panels: [
        { glass: "flask", volume: 120, colour: "clear", stopper: true, balance: 182.4, label: "Before" },
        { glass: "flask", volume: 120, colour: "sun", precipitate: true, stopper: true, balance: "?", label: "After" },
      ],
    },
    "sun",
  ],
  [
    "chem-beaker glass",
    {
      kind: "chem-beaker",
      panels: [
        { glass: "cylinder", volume: 37, max: 50 },
        { glass: "testtube", volume: 12, colour: "berry", gas: "tangerine" },
      ],
      joiner: null,
    },
    "lime",
  ],
  [
    "chem-energy",
    { kind: "chem-energy", mode: "profile", reactants: 60, products: 20, peak: 110, catalyst: 85, labels: { reactants: "2H₂ + O₂", products: "2H₂O" } },
    "tangerine",
  ],
  ["chem-energy endo", { kind: "chem-energy", mode: "profile", reactants: 20, products: 50, peak: 90, labels: { reactants: "Reactants", products: "Products", dH: "?" } }, "rose"],
  ["chem-energy heating", { kind: "chem-energy", mode: "heating", melt: 0, boil: 100, start: -30, end: 130, title: "Heating water" }, "wave"],
  [
    "chem-ph",
    {
      kind: "chem-ph",
      markers: [
        { pH: 2, label: "Lemon", emoji: "🍋" },
        { pH: 7, label: "Water", emoji: "💧" },
        { pH: 8.5, label: "Soap", emoji: "🧼" },
        { pH: 12, label: "?", emoji: "🧴" },
      ],
    },
    "leaf",
  ],
  ["chem-spectrum mass", { kind: "chem-spectrum", mode: "mass", peaks: [{ mz: 35, percent: 75.8, label: "³⁵Cl 75.8%" }, { mz: 37, percent: 24.2 }], title: "Chlorine" }, "night"],
  [
    "chem-spectrum pes",
    {
      kind: "chem-spectrum",
      mode: "pes",
      peaks: [
        { energy: 104, electrons: 2, label: "1s" },
        { energy: 6.84, electrons: 2, label: "2s" },
        { energy: 3.67, electrons: 6, label: "2p" },
        { energy: 0.5, electrons: 1, label: "?" },
      ],
      title: "Sodium",
    },
    "grape",
  ],
  ["chem-spectrum emission", { kind: "chem-spectrum", mode: "emission", lines: [{ nm: 410 }, { nm: 434 }, { nm: 486 }, { nm: 656 }], title: "Hydrogen" }, "night"],
  ["chem-nucleus alpha", { kind: "chem-nucleus", before: [{ element: "U", A: 238 }], after: [{ element: "Th", A: 234, ask: "symbol" }, { particle: "alpha" }], change: "alpha decay" }, "sun"],
  ["chem-nucleus beta", { kind: "chem-nucleus", before: [{ element: "C", A: 14 }], after: [{ element: "N", A: 14 }, { particle: "beta" }], change: "beta decay" }, "leaf"],
  ["chem-nucleus fusion", { kind: "chem-nucleus", before: [{ element: "H", A: 2 }, { element: "H", A: 3 }], after: [{ element: "He", A: 4 }, { particle: "neutron" }], change: "fusion" }, "tangerine"],
  [
    "chem-nucleus fission",
    { kind: "chem-nucleus", before: [{ particle: "neutron" }, { element: "U", A: 235 }], after: [{ element: "Ba", A: 141 }, { element: "Kr", A: 92 }, { particle: "neutron", count: 3 }], balls: false, change: "fission" },
    "berry",
  ],
  [
    "chem-titration weak",
    { kind: "chem-titration", mode: "curve", analyte: "acid", pK: 4.76, conc: 0.1, volume: 25, titrantConc: 0.1, indicator: { from: 8.2, to: 10, colour: "rose", label: "phenolphthalein" } },
    "rose",
  ],
  ["chem-titration strong", { kind: "chem-titration", mode: "curve", analyte: "acid", conc: 0.1, volume: 20, titrantConc: 0.1, equivalence: "?" }, "teal"],
  ["chem-titration burette", { kind: "chem-titration", mode: "burette", reading: 23.4, flask: "rose", ask: true }, "rose"],
  [
    "chem-cell galvanic",
    { kind: "chem-cell", type: "galvanic", left: { metal: "Zn", solution: "Zn²⁺", colour: "clear" }, right: { metal: "Cu", solution: "Cu²⁺", colour: "wave" }, voltage: 1.1, bridgeIons: true },
    "wave",
  ],
  [
    "chem-cell electrolytic",
    { kind: "chem-cell", type: "electrolytic", left: { metal: "C", solution: "CuCl₂(aq)", colour: "teal" }, right: { metal: "C", solution: "CuCl₂(aq)", label: "?" }, voltage: 6 },
    "teal",
  ],
  [
    "chem-materials objects",
    {
      kind: "chem-materials",
      mode: "objects",
      items: [
        { emoji: "🥄", label: "Spoon", material: "metal", properties: ["hard", "shiny"] },
        { emoji: "🧦", label: "Sock", material: "cloth", properties: ["soft", "bendy"] },
        { emoji: "🪟", label: "Window", material: "glass", properties: ["see-through", "?"] },
        { emoji: "🧸", label: "Teddy", material: "?" },
      ],
    },
    "sun",
  ],
  ["chem-materials pieces", { kind: "chem-materials", mode: "pieces", from: "house", to: "car", labels: ["House", "Pieces", "Car"] }, "berry"],
  ["chem-materials change", { kind: "chem-materials", mode: "change", steps: [{ emoji: "🧊", label: "Ice" }, { emoji: "💧", label: "Water" }, { emoji: "🧊", label: "Ice" }], arrows: ["warm", "cool"], reversible: true }, "wave"],
  ["chem-materials egg", { kind: "chem-materials", mode: "change", steps: [{ emoji: "🥚", label: "Raw egg" }, { emoji: "🍳", label: "Cooked egg" }], arrows: ["cook"], reversible: false }, "tangerine"],
];

/** Gallery samples for chemistry activities: [name, activity, world colour]. */
export const CHEMISTRY_ACTIVITIES: [string, Activity, Colour][] = [
  ["chem-balance", { kind: "chem-balance", reactants: ["CH₄", "O₂"], products: ["CO₂", "H₂O"], states: ["g", "g", "g", "l"] }, "berry"],
  ["chem-balance partial", { kind: "chem-balance", reactants: ["Fe", "O₂"], products: ["Fe₂O₃"], given: [4, null, 2] }, "tangerine"],
  ["chem-balance ions", { kind: "chem-balance", reactants: ["Ag⁺", "Cu"], products: ["Ag", "Cu²⁺"] }, "teal"],
  ["chem-buildAtom", { kind: "chem-buildAtom", target: { element: "C", A: 12 } }, "night"],
  ["chem-buildAtom ion", { kind: "chem-buildAtom", target: { element: "Mg", charge: 2 } }, "grape"],
  ["chem-states", { kind: "chem-states", substance: "water", formula: "H₂O", melt: 0, boil: 100, target: "gas", start: -20 }, "wave"],
  ["chem-states find", { kind: "chem-states", substance: "wax", melt: 60, boil: 370, target: { find: "melt" }, min: 0, max: 120, step: 5 }, "sun"],
  ["chem-mix solution", { kind: "chem-mix", mode: "mixture", species: [{ name: "salt", colour: "grape" }, { name: "water", formula: "H₂O" }], target: { counts: [3, 7] } }, "berry"],
  ["chem-mix ratio", { kind: "chem-mix", mode: "mixture", species: [{ name: "red", colour: "berry" }, { name: "blue", colour: "wave" }], target: { ratio: [1, 2] }, max: 9 }, "lime"],
  ["chem-mix limiting", { kind: "chem-mix", mode: "limiting", reactants: [{ formula: "H₂", count: 6 }, { formula: "O₂", count: 2 }], products: ["H₂O"] }, "teal"],
  ["chem-buildMolecule", { kind: "chem-buildMolecule", center: "C", tray: ["H", "O"], target: "CH₂O" }, "leaf"],
  ["chem-buildMolecule free", { kind: "chem-buildMolecule", center: "N", tray: ["H", "Cl"] }, "wave"],
  ["chem-measure fill", { kind: "chem-measure", mode: "fill", glass: "cylinder", target: 35, max: 50, step: 1, colour: "wave" }, "wave"],
  ["chem-measure beaker", { kind: "chem-measure", mode: "fill", glass: "beaker", target: 150, max: 250, step: 25, colour: "leaf" }, "leaf"],
  ["chem-measure balance", { kind: "chem-measure", mode: "balance", mass: 135, emoji: "🍎", weights: [100, 50, 20, 10, 5] }, "tangerine"],
  [
    "sort (chem example)",
    {
      kind: "sort",
      bins: ["Physical change", "Chemical change"],
      items: [
        { label: "🧊 Ice melts", bin: 0 },
        { label: "🍳 Egg cooks", bin: 1 },
        { label: "✂️ Paper is cut", bin: 0 },
        { label: "🔥 Wood burns", bin: 1 },
        { label: "🍂 Iron rusts", bin: 1 },
      ],
    },
    "rose",
  ],
];
