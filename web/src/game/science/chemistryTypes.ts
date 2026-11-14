/**
 * Chemistry pictures (`ChemistryVisual`) and hands-on activities (`ChemistryActivity`). Every kind starts with
 * "chem-" so the shared Visual and ActivityStage components hand them to components/science/ChemistryVisuals and
 * ChemistryActivities. `chemistryVisualProblems` / `chemistryActivityProblems` (chemistryValidate.ts) check the data.
 *
 * Conventions for lesson writers
 * - Formulas are strings with Unicode subscripts and superscripts: "H₂O", "Ca(OH)₂", "SO₄²⁻", "Na⁺", "e⁻",
 *   "CuSO₄·5H₂O". Plain digits after a symbol also work as subscripts ("H2O"); charges must be superscripts.
 *   Nuclides lead with mass number then atomic number: "²³⁸₉₂U", "⁴₂He", "⁰₋₁e", "¹₀n". `sub()` / `sup()` in
 *   elements.ts convert ASCII. Speech reads them correctly ("H 2 O", "Na plus").
 * - Elements are symbols ("Na"); see elements.ts for data (`element("Na")`, `ELEMENTS`).
 * - Labels are `Mark`s: a number, a string shown as written, "?" (highlighted as the thing to find; replaced by
 *   the answer, or the true value when the picture knows it, once the question is solved), or null for none.
 * - Colours are the game's `Colour` names (sun, leaf, berry, wave, grape, teal, cocoa, rose, lime, night, tangerine).
 * - Pictures are drawn to fit a ~340 px phone card; limits below keep them readable.
 * - To classify things (materials, mixtures vs compounds, physical vs chemical change, metals vs nonmetals) use
 *   the general `sort` activity: { kind: "sort", bins: ["Physical change", "Chemical change"], items: [{ label: "🧊 Ice melts", bin: 0 }, …] }.
 *   Use `order` for ranking (e.g. by electronegativity).
 */
import type { Colour, Mark } from "../types";

/* ======================================================================= shared */

/** State symbols written after formulas. */
export type StateSymbol = "s" | "l" | "g" | "aq";

/** How particles sit in a box: packed in rows (solid), close and jumbled (liquid), far apart (gas). */
export type Arrangement = "solid" | "liquid" | "gas";

/**
 * One kind of particle in a {@link ParticlePanel}.
 * - With `formula`, each particle is drawn as its molecule: joined balls in element colours (H white, C dark grey,
 *   O red, N blue, Cl green, Na purple…). Known shapes: diatomics, H₂O (bent), CO₂ (linear), NH₃, CH₄, ions
 *   (Na⁺ drawn with a little "+"), and any "one centre atom + same outer atoms" formula; other formulas are
 *   packed as a small cluster.
 * - Without `formula`, each particle is a plain ball of `colour` (for "particles of sugar" style pictures).
 */
export interface ParticleSpecies {
  /** Formula drawn as a molecule, e.g. "H₂O", "O₂", "Na⁺", "He". Omit for plain coloured balls. */
  formula?: string;
  /** Ball colour for plain particles (default: a series colour by position). Ignored when `formula` is set. */
  colour?: Colour;
  /** How many particles of this kind in the panel (0–40 per panel in total; keep it under ~24 for phones). */
  count: number;
  /** Name in the key, e.g. "water", "sugar". Default: the formula, or "particle". */
  name?: string;
  /** Ring these particles (e.g. the leftover excess reactant). */
  ring?: boolean;
}

/** One box of particles. */
export interface ParticlePanel {
  /** Every kind of particle in the box. */
  species: ParticleSpecies[];
  /**
   * How they're arranged: "solid" packs them in tidy rows at the bottom, "liquid" keeps them touching but jumbled
   * in the lower part, "gas" (default) spreads them through the whole box.
   */
  arrangement?: Arrangement;
  /** Motion lines showing how fast the particles move (temperature): 0 none (default), 1 slow, 2 medium, 3 fast. */
  motion?: 0 | 1 | 2 | 3;
  /** Caption under the box, e.g. "Before", "Solid", or "?" for the thing to name. */
  label?: Mark;
  /** Draw a closed container ("box", default), an open beaker shape ("beaker"), or no outline ("none"). */
  container?: "box" | "beaker" | "none";
  /** Particles jiggle gently (off when the kid prefers reduced motion). Default false. */
  animate?: boolean;
}

/** A term in a chemical equation: an optional coefficient and a formula (or plain words like "heat"). */
export interface ReactionTerm {
  /** Coefficient; 1 or undefined is not written, "?" is a blank to find, null is an empty box (for unbalanced skeletons). */
  coef?: number | "?" | null;
  /** The formula ("H₂O", "Na⁺", "e⁻", "²³⁸₉₂U"), or "?" for a missing formula. Leave out when using `text`. */
  formula?: string;
  /** Words instead of a formula: "heat", "light", "energy", "iron" (word equations). Not checked for balance. */
  text?: string;
  /** State symbol written after the formula: (s), (l), (g), (aq). */
  state?: StateSymbol;
}

/** A nucleus or particle in a nuclear change (chem-nucleus). */
export type Nuclide =
  | {
      /** Element symbol, e.g. "U". */
      element: string;
      /** Mass number (protons + neutrons). */
      A: number;
      /** Which part of the isotope notation is the blank: the mass number, the atomic number, or the symbol. */
      ask?: "A" | "Z" | "symbol";
    }
  | {
      /** A particle: alpha ⁴₂He, beta ⁰₋₁e, positron ⁰₊₁e, gamma ⁰₀γ, neutron ¹₀n, proton ¹₁p. */
      particle: "alpha" | "beta" | "positron" | "gamma" | "neutron" | "proton";
      /** How many of this particle (e.g. 3 neutrons from fission). Default 1. */
      count?: number;
      ask?: "A" | "Z" | "symbol";
    };

/** Glassware for chem-beaker panels and chem-measure. */
export type Glass = "beaker" | "flask" | "cylinder" | "testtube";

/** One piece of glassware (chem-beaker). */
export interface GlassPanel {
  glass: Glass;
  /** Liquid volume in mL (0 = empty). */
  volume: number;
  /** Top of the scale in mL (default: a nice number ≥ volume: 50 for cylinders, 250 for beakers and flasks, 20 for test tubes). */
  max?: number;
  /** Draw volume marks and numbers (default true for cylinder and beaker). */
  scale?: boolean;
  /** Liquid colour, or "clear" (pale blue water). Default "clear". */
  colour?: Colour | "clear";
  /** Gas bubbles rising (a sign of a chemical reaction); a number sets how many (default 8). */
  bubbles?: boolean | number;
  /** Solid settled at the bottom (a precipitate) in this colour; true = white. */
  precipitate?: Colour | boolean;
  /** Coloured gas or smoke above the liquid. */
  gas?: Colour;
  /** A thermometer in the glass showing this temperature (°C); "?" to ask. */
  thermometer?: number | "?";
  /** Stand the glass on a digital balance showing this mass. Numbers get " g"; strings show as written ("?"). */
  balance?: Mark;
  /** A stopper on top (a closed system, for conservation of mass). */
  stopper?: boolean;
  /** Caption under the glass, e.g. "Before" or "Vinegar". */
  label?: Mark;
}

/** Materials kids meet in K–2. */
export type Material = "wood" | "metal" | "plastic" | "glass" | "rubber" | "cloth" | "paper" | "ice" | "stone" | "clay" | "water";

/** Properties of materials (each has an icon). */
export type MaterialProperty =
  | "hard"
  | "soft"
  | "bendy"
  | "stretchy"
  | "see-through"
  | "waterproof"
  | "absorbent"
  | "rough"
  | "smooth"
  | "shiny"
  | "floats"
  | "sinks"
  | "magnetic"
  | "breakable"
  | "strong";

/** Things built from 8 blocks (chem-materials "pieces"); every design uses the same 8 blocks. */
export type BlockDesign = "tower" | "house" | "car" | "boat" | "bridge" | "wall" | "robot" | "train" | "pile";

/* ======================================================================= visuals */

export type ChemistryVisual =
  /**
   * Boxes of particles: states of matter, mixtures (2–3 kinds with a key), molecules, solutions, and before/after
   * panels for reactions (conservation of atoms, limiting reactant, equilibrium). 1–3 panels side by side, with
   * `joiner` drawn between them. A key lists every kind once when there are 2+ kinds (or `key: true`).
   * Example (water freezing): panels: [{ species: [{ formula: "H₂O", count: 9 }], arrangement: "liquid", label: "Liquid" },
   *   { species: [{ formula: "H₂O", count: 9 }], arrangement: "solid", label: "?" }], joiner: "→".
   */
  | {
      kind: "chem-particles";
      panels: ParticlePanel[];
      /** Drawn between panels: "→" (default for 2+ panels), "⇌", "+", or "vs"; null for nothing. */
      joiner?: "→" | "⇌" | "+" | "vs" | null;
      /** Text over the joiner arrow, e.g. "heat" or "cool". */
      joinerLabel?: string;
      /** Show the key (default: when there are 2+ kinds of particle). */
      key?: boolean;
    }
  /**
   * An atom. "bohr" (default): nucleus with p⁺ and n counts, electrons on shells (2, 8, 8, 2…). "simple": for
   * young kids, a nucleus of red protons and grey neutrons with a few electrons zooming round, labelled
   * "proton", "neutron", "electron". "lewis": the element symbol with its valence electrons as dots.
   * The element comes from `protons`; an ion when electrons ≠ protons (its charge is shown).
   */
  | {
      kind: "chem-atom";
      protons: number;
      neutrons: number;
      electrons: number;
      style?: "bohr" | "simple" | "lewis";
      /** Show these as "?" instead of the number: counts in the nucleus, the electrons, the symbol and charge, or the mass number. */
      hide?: ("protons" | "neutrons" | "electrons" | "symbol" | "charge" | "mass")[];
      /** Write the isotope/ion symbol beside the atom, e.g. ²³Na⁺ (default true for bohr). */
      showSymbol?: boolean;
      /** Colour the outer-shell electrons (valence) differently. */
      valence?: boolean;
      /** Electrons per shell, innermost first, to override the 2-8-8 rule (e.g. to show an excited state). */
      shells?: number[];
    }
  /**
   * One periodic-table tile: atomic number, symbol, name and average atomic mass, coloured by family. Every field
   * comes from the elements data unless you give it: a value replaces it, "?" asks for it, null hides it.
   * `extra` adds lines under the tile (e.g. { label: "Protons", value: "?" }).
   */
  | {
      kind: "chem-element";
      /** Which element (its symbol). */
      element: string;
      number?: Mark;
      symbol?: Mark;
      name?: Mark;
      mass?: Mark;
      extra?: { label: string; value: Mark }[];
      /** Show the electron configuration (short form) on the tile. */
      config?: boolean;
    }
  /**
   * A periodic table, whole or part. Pick rows with `periods` (default 1–7) and columns with `groups` (default all
   * 18), or `mainOnly` for just groups 1, 2, 13–18 (best on phones: 8 wide cells). `fBlock` adds the lanthanide and
   * actinide rows (full table only). Cells can be coloured by family (`colourBy`) and highlighted, and trend
   * arrows drawn along the top (left/right) or side (up/down).
   * Phone tip: the full 18-column table makes small cells (symbols only); use `mainOnly` or `periods: [1, 4]` when
   * kids must read numbers.
   */
  | {
      kind: "chem-table";
      /** First and last period shown, e.g. [1, 4]. Default [1, 7]. */
      periods?: [number, number];
      /** Columns to show (any of 1–18, ascending), e.g. [1, 2, 13, 14, 15, 16, 17, 18]. Default all. */
      groups?: number[];
      /** Shorthand for groups 1, 2, 13–18. */
      mainOnly?: boolean;
      /** Add the lanthanide and actinide rows below. */
      fBlock?: boolean;
      /** What each cell shows: "symbol" (default), "number" (atomic number over symbol), or "blank" (empty boxes). */
      show?: "symbol" | "number" | "blank";
      /** Colour cells by family ("category"), by metal / nonmetal / metalloid ("metal"), by block, or plain ("none", default). */
      colourBy?: "category" | "metal" | "block" | "none";
      /** Highlights: cells (symbols), a whole group, period or block, in a colour, with an optional key label. */
      highlight?: { cells?: string[]; group?: number; period?: number; block?: "s" | "p" | "d" | "f"; colour?: Colour; label?: string }[];
      /** Trend arrows, e.g. { dir: "right", label: "Electronegativity increases" }. Up to one horizontal and one vertical. */
      trends?: { dir: "left" | "right" | "up" | "down"; label: string }[];
      /** Symbols whose cells show "?" (the one to identify); highlighted. When solved they show the symbol. Only the symbol is
       * hidden: with show: "number" the atomic number stays visible (use it as the clue, or use show: "symbol"). */
      ask?: string[];
      /** Draw a heavy line between metals and nonmetals (the "staircase"). */
      staircase?: boolean;
      /** Show a key of the colours (default true when colourBy or labelled highlights are used). */
      key?: boolean;
    }
  /**
   * A molecule as a Lewis structure ("lewis": symbols, bond lines, lone-pair dots), a structural formula
   * ("structural": no lone pairs), or a ball-and-stick model ("ball"). Give ONE of:
   * - `molecule`: a known formula: "H₂", "O₂", "N₂", "F₂", "Cl₂", "HF", "HCl", "H₂O", "H₂S", "CO₂", "CH₄", "NH₃",
   *   "C₂H₆", "C₂H₄", "C₂H₂", "CH₃OH", "HCN", "CH₂O", "BF₃", "SO₂", "O₃", "CCl₄", "PCl₃", "SF₆", "PCl₅", "NH₄⁺", "OH⁻",
   *   "H₃O⁺" (see MOLECULES in components/science/chemistry/molecules.ts);
   * - `vsepr`: a generic AXₙEₘ shape (n bonded atoms, m lone pairs on the centre, n + m = 2–6), drawn in 3D
   *   perspective with wedge/dash bonds, e.g. { center: "N", outer: "H", bonds: 3, lone: 1 } (trigonal pyramidal);
   * - `atoms` + `bonds`: your own drawing; x and y are in bond lengths (y down), e.g. water:
   *   atoms [{ el: "O", x: 0, y: 0, lone: 2 }, { el: "H", x: -0.8, y: 0.6 }, { el: "H", x: 0.8, y: 0.6 }],
   *   bonds [{ a: 0, b: 1 }, { a: 0, b: 2 }].
   */
  | {
      kind: "chem-molecule";
      molecule?: string;
      vsepr?: { center: string; outer: string; bonds: number; lone: number; /** Draw the outer atoms' lone pairs too (Lewis). */ outerLone?: boolean };
      atoms?: { el: string; x: number; y: number; /** Lone pairs (Lewis). */ lone?: number; /** Formal charge or partial charge text, e.g. "+", "δ−". */ charge?: string }[];
      bonds?: { a: number; b: number; order?: 1 | 2 | 3; /** Toward the viewer (solid wedge) or away (dashes). */ wedge?: "toward" | "away" }[];
      style?: "lewis" | "structural" | "ball";
      /** Draw lone pairs (default true for lewis, false otherwise; "ball" draws them as lobes on the centre). */
      lonePairs?: boolean;
      /** Caption under the drawing: the shape name (true writes it from the geometry, e.g. "bent"), or any Mark. */
      shape?: boolean | Mark;
      /** Label the bond angle at the centre, e.g. "104.5°" or "?". Numbers get °. */
      angle?: Mark;
      /** Name caption, e.g. "Water". */
      name?: Mark;
      /** Brackets and an overall charge for polyatomic ions (presets "NH₄⁺", "OH⁻", "H₃O⁺" add them). */
      ionCharge?: string;
    }
  /**
   * A chemical equation: coefficients ("?" blanks), formulas with subscripts and charges, state symbols, → or ⇌,
   * text over/under the arrow, and an optional ΔH. Use this instead of the math equation for chemistry.
   * Checks: unless `unbalanced`, numeric coefficients must balance (atoms and charge; nuclear equations balance
   * mass and atomic numbers), and "?" coefficients must have a whole-number solution. When solved, "?" coefficients
   * show their balanced values.
   */
  | {
      kind: "chem-reaction";
      reactants: ReactionTerm[];
      products: ReactionTerm[];
      /** Default "→". */
      arrow?: "→" | "⇌";
      /** Small text above the arrow (catalyst, "heat", "Δ") and below it (e.g. "light"). */
      above?: string;
      below?: string;
      /** Enthalpy change: numbers are written "ΔH = −286 kJ/mol"; strings as written ("?", "negative"). */
      dH?: Mark;
      /** The equation is deliberately not balanced (a skeleton to balance, or "is it balanced?"). */
      unbalanced?: boolean;
      /** Words instead of formulas throughout (word equations): coefficients are hidden and nothing is checked. */
      words?: boolean;
    }
  /**
   * Lab glassware, 1–3 side by side with `joiner` between: beaker, conical flask, graduated cylinder or test
   * tube, each with liquid (colour, volume, scale), bubbles, a precipitate, gas, a thermometer, a stopper, and an
   * optional digital balance underneath. Before/after pairs show "did a reaction happen?" and conservation of mass.
   */
  | { kind: "chem-beaker"; panels: GlassPanel[]; joiner?: "→" | "+" | null; joinerLabel?: string }
  /**
   * A reaction energy diagram (`mode: "profile"`): reactant level, product level and the activation-energy hump,
   * with the Ea and ΔH arrows and an optional lower catalyst path. Energies are on any scale (e.g. kJ); only their
   * differences matter. Multi-step mechanisms: give `peaks` and `valleys` (intermediates) instead of `peak`.
   */
  | {
      kind: "chem-energy";
      mode: "profile";
      reactants: number;
      products: number;
      /** Top of the hump (one-step reaction). Must be above both ends. */
      peak?: number;
      /** For several steps: every hump's height in order, with `valleys` (one fewer) for the intermediates. */
      peaks?: number[];
      valleys?: number[];
      /** Top of the lower, dashed catalysed hump. */
      catalyst?: number;
      /** Labels: what's at each level, and the arrows. Strings as written ("?" highlighted); numbers get " kJ". null hides. */
      labels?: { reactants?: Mark; products?: Mark; ea?: Mark; dH?: Mark; catalyst?: Mark };
      /** Draw the Ea arrow (default true) and the ΔH arrow (default true). */
      showEa?: boolean;
      showDH?: boolean;
      /** Axis titles. Defaults "Energy" and "Reaction progress". */
      yLabel?: string;
      xLabel?: string;
    }
  /**
   * A heating curve (or cooling curve with `cooling`): temperature against time, with flat plateaus at the melting
   * and boiling points. Segments are labelled in order (solid, melting, liquid, boiling, gas for heating).
   */
  | {
      kind: "chem-energy";
      mode: "heating";
      /** Melting/freezing and boiling/condensing points in °C. */
      melt: number;
      boil: number;
      /** Start and end temperatures in °C (start below melt and end above boil for heating; the reverse when cooling). */
      start: number;
      end: number;
      cooling?: boolean;
      /** Labels for the five segments in time order; null hides one, "?" asks. Default: the state names. */
      labels?: [Mark, Mark, Mark, Mark, Mark];
      /** Write the plateau temperatures on the axis (default true); "?" hides them as blanks. */
      temps?: boolean | "?";
      /** Relative widths of the five segments (default [2, 3, 2, 4, 2]: boiling takes longest). */
      widths?: [number, number, number, number, number];
      /** Title, e.g. "Heating water". */
      title?: string;
    }
  /**
   * The pH scale 0–14 as a universal-indicator strip, with acid / neutral / base regions and markers for
   * substances (emoji and name). A marker labelled "?" is the one to find.
   */
  | {
      kind: "chem-ph";
      markers?: { pH: number; label: Mark; emoji?: string }[];
      /** Label the acid / neutral / base regions (default true). */
      regions?: boolean;
      /** Write every number 0–14 (default true). */
      numbers?: boolean;
    }
  /** A mass spectrum: bars at each m/z with relative abundance (%), labelled with the isotope. */
  | {
      kind: "chem-spectrum";
      mode: "mass";
      peaks: { mz: number; percent: number; label?: Mark }[];
      /** m/z range of the axis (default: a little around the peaks). */
      range?: [number, number];
      title?: string;
    }
  /**
   * A photoelectron spectrum (PES): peaks at binding energies (MJ/mol) with heights proportional to the number of
   * electrons. Drawn with binding energy decreasing to the right (the AP convention) on a log-like axis.
   */
  | {
      kind: "chem-spectrum";
      mode: "pes";
      peaks: { energy: number; electrons: number; label?: Mark }[];
      title?: string;
    }
  /** An emission (bright lines on black) or absorption (dark lines on a rainbow) line spectrum, 380–750 nm. */
  | {
      kind: "chem-spectrum";
      mode: "emission" | "absorption";
      lines: { nm: number; label?: Mark }[];
      title?: string;
    }
  /**
   * A nuclear change: the nuclei and particles before and after an arrow, each in isotope notation (mass number
   * over atomic number before the symbol), with little nucleus pictures (red protons, grey neutrons) for light
   * nuclei. Mass numbers and atomic numbers must balance. `change` names it over the arrow ("alpha decay").
   */
  | { kind: "chem-nucleus"; before: Nuclide[]; after: Nuclide[]; change?: string; /** Draw the nucleus pictures (default true). */ balls?: boolean }
  /**
   * A titration curve (pH against volume of titrant added), computed from the chemistry: a strong or weak acid
   * (or base) analyte titrated with a strong base (or acid). Marks the equivalence point, and for weak analytes the
   * buffer region and half-equivalence point (where pH = pKa).
   */
  | {
      kind: "chem-titration";
      mode: "curve";
      /** What's in the flask. */
      analyte: "acid" | "base";
      /** pKa of a weak acid analyte (or pKb of a weak base). Leave out for a strong acid/base. */
      pK?: number;
      /** Analyte concentration (M) and volume (mL). */
      conc: number;
      volume: number;
      /** Titrant concentration (M). */
      titrantConc: number;
      /** Right end of the axis in mL (default 2 × equivalence volume). */
      maxVolume?: number;
      /** Label the equivalence point (default true), half-equivalence point and buffer region (default true for weak). Marks: "?" asks. */
      equivalence?: boolean | Mark;
      halfEquivalence?: boolean | Mark;
      buffer?: boolean;
      /** Indicator colour band across a pH range, e.g. { from: 8.2, to: 10, colour: "rose", label: "phenolphthalein" }. */
      indicator?: { from: number; to: number; colour: Colour; label?: string };
    }
  /**
   * A burette over a conical flask: the burette reading (mL, read at the bottom of the meniscus, 0 at the top) and
   * the flask colour (e.g. pink at the end point with phenolphthalein).
   */
  | {
      kind: "chem-titration";
      mode: "burette";
      /** Reading in mL (0–50). */
      reading: number;
      /** Hide the reading's number on the zoomed scale (to ask for it). */
      ask?: boolean;
      flask?: Colour | "clear";
      label?: Mark;
    }
  /**
   * An electrochemical cell: two electrodes in their solutions, joined by a wire through a voltmeter (galvanic) or
   * a battery (electrolytic), with a salt bridge (galvanic), electron-flow arrows in the wire, and anode / cathode
   * labels ("Anode (−)" / "Cathode (+)" for galvanic, signs swapped for electrolytic) with "oxidation" / "reduction".
   * The anode is where oxidation happens; electrons flow from the anode to the cathode through the wire.
   * Galvanic cells draw two beakers; electrolytic cells draw ONE container holding `left.solution` (both electrodes
   * dip into it; `right.solution` is ignored). For galvanic cells with metals in REDUCTION_POTENTIALS, validation
   * checks the anode side and a numeric voltage against E°cell.
   */
  | {
      kind: "chem-cell";
      type: "galvanic" | "electrolytic";
      /** Left and right electrodes: metal symbol (or "C"/"Pt" inert), solution formula, and an optional label override. */
      left: { metal: string; solution: string; colour?: Colour | "clear"; label?: Mark };
      right: { metal: string; solution: string; colour?: Colour | "clear"; label?: Mark };
      /** Which side is the anode (default: for galvanic, the metal with the lower E°; else "left"). */
      anode?: "left" | "right";
      /** Voltmeter (galvanic) or battery (electrolytic) reading. Numbers get " V". */
      voltage?: Mark;
      /** Draw the electron-flow arrows (default true). */
      electrons?: boolean;
      /** Show the ions moving through the salt bridge (anions to the anode). Default false. */
      bridgeIons?: boolean;
      /** Write each electrode's charge sign (+/−) with the label (default true). */
      signs?: boolean;
    }
  /**
   * Objects and the materials they're made of (ages 5–8): cards with an emoji, a name, a material swatch and
   * property badges (hard, soft, bendy, see-through, waterproof…). Use "?" for the name, material or a property to ask.
   */
  | {
      kind: "chem-materials";
      mode: "objects";
      items: { emoji: string; label?: Mark; material?: Material | "?"; properties?: (MaterialProperty | "?")[] }[];
    }
  /**
   * The same 8 blocks built into one thing, taken apart, and built into something new (2-PS1-3). Shows
   * from → pile of pieces → to (or just from → to with `steps: 2`). Both designs use the same coloured blocks.
   */
  | {
      kind: "chem-materials";
      mode: "pieces";
      from: BlockDesign;
      to: BlockDesign | "?";
      /** 3 (default) shows the pile in the middle; 2 goes straight from one to the other. */
      steps?: 2 | 3;
      /** Captions, e.g. ["House", "Pieces", "Car"]. */
      labels?: Mark[];
    }
  /**
   * Heating and cooling changes (2-PS1-4): a row of things joined by labelled arrows, e.g. 🧊 →(warm) 💧 →(cool) 🧊
   * (reversible), or 🥚 →(cook) 🍳 with a crossed-out way back (not reversible).
   */
  | {
      kind: "chem-materials";
      mode: "change";
      steps: { emoji: string; label?: Mark }[];
      /** Arrow captions between steps, e.g. ["heat", "cool"]; one fewer than steps. */
      arrows: string[];
      /** true: a return arrow says it can change back; false: a crossed-out return arrow; "?" asks. Leave out for neither. */
      reversible?: boolean | "?";
    };

/* ==================================================================== activities */

export type ChemistryActivity =
  /**
   * Balance an equation by tapping + / − on each coefficient (1–`max`). Atom counts for each element show on both
   * sides and turn green when they match. Right = the smallest whole-number coefficients. For a "which coefficient
   * goes here?" version, give `given`: numbers are fixed and shown, null leaves that one for the kid (then the
   * kid's coefficients must complete the balanced equation with the given ones).
   * Checks: the equation can be balanced, in exactly one way (up to a multiple), with coefficients ≤ max.
   */
  | {
      kind: "chem-balance";
      reactants: string[];
      products: string[];
      /** State symbols, in the same order as reactants then products. */
      states?: (StateSymbol | null)[];
      /** Fixed coefficients (reactants then products); null = the kid sets it. */
      given?: (number | null)[];
      /** Largest coefficient on the steppers (default 10). */
      max?: number;
      /** Show the atom-count table (default true). */
      counts?: boolean;
    }
  /**
   * Build an atom by adding and removing protons, neutrons and electrons. Live readout: element name and symbol
   * (from protons), mass number, charge, and a Bohr picture. Right = the target element (protons), its charge
   * (electrons), and its mass number when `A` is given (neutrons; otherwise neutrons aren't checked).
   * Keep targets to Z ≤ 20 so the picture stays readable (up to 36 works).
   */
  | {
      kind: "chem-buildAtom";
      target: { element: string; A?: number; charge?: number };
      /** Don't show the goal (e.g. "Build ¹²C (Carbon-12)") above the builder, when naming it would give the answer away. */
      hideTarget?: boolean;
      /** Starting counts (default all 0). */
      start?: { protons: number; neutrons: number; electrons: number };
    }
  /**
   * A temperature slider changes a substance between solid, liquid and gas (particles rearrange and move faster as
   * it warms; still under reduced motion). Right = reaching the `target` state, or the exact melting / boiling point
   * when target is { find: "melt" | "boil" } (the kid watches for the change). The slider snaps to `step`.
   */
  | {
      kind: "chem-states";
      /** Name shown in the readout, e.g. "water". */
      substance: string;
      /** Formula drawn as particles (default plain balls), e.g. "H₂O". */
      formula?: string;
      melt: number;
      boil: number;
      target: Arrangement | { find: "melt" | "boil" };
      /** Slider range in °C (default melt − 40 to boil + 40) and step (default 5). melt and boil must land on steps. */
      min?: number;
      max?: number;
      step?: number;
      /** Starting temperature (default min). */
      start?: number;
    }
  /**
   * Make a mixture or solution by tapping + / − to add particles of each kind into a beaker (with a key and a
   * running total). Plain kinds default to grape, wave, sun balls; give `formula` to draw molecules instead.
   * Right = exactly `target.counts`, or any amounts in the ratio `target.ratio` (all nonzero), within `max` each.
   * E.g. 3 solute particles per 10: species [{ name: "salt", colour: "berry" }, { name: "water", formula: "H₂O" }],
   * target { counts: [3, 7] }.
   */
  | {
      kind: "chem-mix";
      mode: "mixture";
      species: { name: string; formula?: string; colour?: Colour }[];
      target: { counts?: number[]; ratio?: number[] };
      /** Most of each kind (default 12). */
      max?: number;
    }
  /**
   * Limiting reactant: the beaker starts with reactant molecules; each tap of "React!" runs the balanced reaction
   * once (using up coefficient amounts and making products), "Undo" reverses it. Right = as many reactions as the
   * molecules allow (the limiting reactant runs out; the excess is ringed). The equation must balance.
   */
  | {
      kind: "chem-mix";
      mode: "limiting";
      reactants: { formula: string; count: number }[];
      products: string[];
    }
  /**
   * Build a molecule around a central atom: tap atoms in the tray to bond them on (up to 4), tap a bond to make it
   * single → double → triple, tap an atom to take it off. Lone pairs fill in automatically and each atom shows
   * whether its shell is full (H: 2 electrons, others: 8). Right = every shell full, and the formula is `target`
   * when given. E.g. { center: "C", tray: ["H", "O"], target: "CH₂O" }.
   */
  | {
      kind: "chem-buildMolecule";
      center: string;
      tray: string[];
      target?: string;
    }
  /**
   * Measuring. "fill": drag the liquid level in a cylinder or beaker (snapping to `step` mL) to `target` mL; the
   * number isn't shown, so the kid reads the scale (at most 50 marks: max / step ≤ 50).
   * "balance": add weights to one pan of a pan balance until it levels with the object (right = weights equal `mass` g;
   * the pan holds 12 weights, and their total isn't shown). To READ a balance, use a chem-beaker picture with `balance`.
   */
  | {
      kind: "chem-measure";
      mode: "fill";
      glass: "cylinder" | "beaker";
      target: number;
      /** Top of the scale (mL). */
      max: number;
      /** Snap and smallest mark (mL), e.g. 1, 2, 5, 10. */
      step: number;
      colour?: Colour | "clear";
    }
  | {
      kind: "chem-measure";
      mode: "balance";
      /** The object's mass in grams (whole number). */
      mass: number;
      /** The object on the left pan. */
      emoji: string;
      /** Weights available, in grams (default [100, 50, 20, 10, 5, 2, 1]); the kid can use each as often as needed. */
      weights?: number[];
    };
