import type { Activity, Colour, Visual } from "../game/types";

/** Gallery samples for physics pictures: [name, picture, world colour]. At least one per kind (tests check this). */
export const PHYSICS_VISUALS: [string, Visual, Colour][] = [
  [
    "phys-forces book on table",
    { kind: "phys-forces", object: "📕", surface: "floor", forces: [{ dir: 90, size: 5, label: "N" }, { dir: 270, size: 5, label: "F_g" }] },
    "wave",
  ],
  [
    "phys-forces tug",
    {
      kind: "phys-forces",
      objectLabel: 10,
      surface: "floor",
      forces: [
        { dir: 0, size: 30, label: 30 },
        { dir: 180, size: 18, label: "?" },
        { dir: 90, size: 20, label: "N", colour: "leaf" },
        { dir: 270, size: 20, label: "mg", colour: "wave" },
      ],
      motion: { dir: 0, label: "a" },
    },
    "berry",
  ],
  [
    "phys-forces incline",
    {
      kind: "phys-forces",
      object: "box",
      incline: 30,
      forces: [
        { dir: 120, size: 8.7, label: "N" },
        { dir: 270, size: 10, label: "mg" },
        { dir: 30, size: 4, label: "f" },
      ],
    },
    "tangerine",
  ],
  [
    "phys-forces hanging dot",
    { kind: "phys-forces", object: "dot", forces: [{ dir: 90, size: 3, label: "T" }, { dir: 270, size: 3, label: "?" }, { dir: 0, size: 1.5, label: "F cos θ", dashed: true, colour: "grape" }] },
    "grape",
  ],
  ["phys-forces ceiling", { kind: "phys-forces", object: "🎈", surface: "ceiling", forces: [{ dir: 90, size: 4, label: "T" }, { dir: 270, size: 4, label: "F_g" }] }, "rose"],
  [
    "phys-incline",
    { kind: "phys-incline", angle: 30, angleLabel: "θ", length: 10, height: "?", unit: "m", blockLabel: 2, friction: "μ = 0.2", motion: "down", motionLabel: "a" },
    "tangerine",
  ],
  [
    "phys-incline forces",
    {
      kind: "phys-incline",
      angle: 25,
      forces: [
        { dir: 115, size: 9, label: "N" },
        { dir: 270, size: 10, label: "mg" },
        { dir: 25, size: 4, label: "f" },
      ],
    },
    "cocoa",
  ],
  [
    "phys-motion strobe",
    {
      kind: "phys-motion",
      track: { min: 0, max: 20, step: 1, labelStep: 5, unit: "m" },
      rows: [{ positions: [0, 1, 3, 6, 10, 15], arrows: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5] }],
      times: true,
    },
    "wave",
  ],
  [
    "phys-motion race",
    {
      kind: "phys-motion",
      look: "ghosts",
      track: { min: 0, max: 100, step: 10, labelStep: 20, unit: "m" },
      rows: [
        { emoji: "🐢", name: "A", positions: [0, 10, 20, 30], flip: true },
        { emoji: "🐇", name: "B", positions: [0, 30, 60, 90], flip: true },
      ],
      finish: 90,
      span: { from: 0, to: 30, label: "?" },
    },
    "leaf",
  ],
  [
    "phys-collision stick",
    {
      kind: "phys-collision",
      before: [
        { mass: 2, v: 3, vSize: 3 },
        { mass: 1, v: 0, vSize: 0 },
      ],
      after: [{ mass: 3, v: 2, vSize: 2 }],
    },
    "wave",
  ],
  [
    "phys-collision bounce",
    {
      kind: "phys-collision",
      before: [
        { mass: 1, v: 4, vSize: 4, name: "A" },
        { mass: 1, v: 2, vSize: -2, name: "B" },
      ],
      after: [
        { mass: 1, v: 2, vSize: -2, name: "A" },
        { mass: 1, v: "?", vSize: 4, name: "B" },
      ],
    },
    "grape",
  ],
  [
    "phys-circuit series",
    {
      kind: "phys-circuit",
      top: [{ part: "cell", label: 6, cells: 2 }, { part: "switch", closed: true }],
      bottom: [
        { part: "bulb", name: "A" },
        { part: "resistor", label: 3 },
        { part: "ammeter", label: "?" },
      ],
    },
    "sun",
  ],
  [
    "phys-circuit parallel",
    {
      kind: "phys-circuit",
      top: [{ part: "cell", label: 12 }, { part: "ammeter", label: 6 }],
      branches: [
        [{ part: "resistor", name: "R₁", label: 4, across: "?" }],
        [{ part: "resistor", name: "R₂", label: 4 }],
      ],
    },
    "night",
  ],
  [
    "phys-circuit open",
    {
      kind: "phys-circuit",
      top: [{ part: "cell", label: 3 }, { part: "switch", closed: false, name: "S" }],
      branches: [[{ part: "bulb", name: "A" }], [{ part: "bulb", name: "B" }, { part: "capacitor", label: 10 }], [{ part: "motor" }]],
    },
    "teal",
  ],
  [
    "phys-wave transverse",
    { kind: "phys-wave", length: 8, waves: [{ amplitude: 1, wavelength: 4 }], amplitudeLabel: 1, wavelengthLabel: "?", grid: true, names: true, travel: "v" },
    "wave",
  ],
  [
    "phys-wave compare",
    {
      kind: "phys-wave",
      length: 8,
      waves: [
        { amplitude: 1.5, wavelength: 4, label: "A" },
        { amplitude: 0.75, wavelength: 2, label: "B" },
      ],
      grid: true,
    },
    "grape",
  ],
  ["phys-wave longitudinal", { kind: "phys-wave", form: "longitudinal", length: 8, waves: [{ amplitude: 1, wavelength: 3 }], wavelengthLabel: "λ", names: true }, "teal"],
  ["phys-wave standing", { kind: "phys-wave", form: "standing", length: 6, waves: [{ amplitude: 1, wavelength: 4 }], names: true, wavelengthLabel: "?" }, "berry"],
  ["phys-rays beam glass", { kind: "phys-rays", scene: "beam", block: { type: "transparent", label: "glass" } }, "sun"],
  ["phys-rays beam wax", { kind: "phys-rays", scene: "beam", source: "bulb", block: { type: "translucent", label: "wax paper" } }, "sun"],
  ["phys-rays shadow", { kind: "phys-rays", scene: "beam", block: { type: "opaque", emoji: "🧸", label: "teddy" } }, "night"],
  ["phys-rays mirror", { kind: "phys-rays", scene: "mirror", angle: 40, incident: 40, reflected: "?", ends: true }, "wave"],
  ["phys-rays refraction", { kind: "phys-rays", scene: "refraction", angle: 45, n1: 1, n2: 1.33, top: "air", bottom: "water", incident: 45, refracted: "?", reflected: true }, "teal"],
  ["phys-rays TIR", { kind: "phys-rays", scene: "refraction", angle: 55, n1: 1.5, n2: 1, top: "glass", bottom: "air", incident: 55 }, "teal"],
  ["phys-rays lens real", { kind: "phys-rays", scene: "lens", optic: "converging", focal: 10, object: 25, twoF: true, labels: { object: 25, f: 10, image: "?" } }, "grape"],
  ["phys-rays lens virtual", { kind: "phys-rays", scene: "lens", optic: "converging", focal: 10, object: 6, height: 3 }, "grape"],
  ["phys-rays diverging", { kind: "phys-rays", scene: "lens", optic: "diverging", focal: 10, object: 15 }, "wave"],
  ["phys-rays concave", { kind: "phys-rays", scene: "lens", optic: "concave", focal: 10, object: 30, twoF: true }, "night"],
  ["phys-rays convex", { kind: "phys-rays", scene: "lens", optic: "convex", focal: 10, object: 15 }, "night"],
  ["phys-rays see", { kind: "phys-rays", scene: "see", object: "🍎", label: "light bounces off the apple" }, "sun"],
  ["phys-magnets attract", { kind: "phys-magnets", scene: "bars", magnets: ["NS", "NS"], arrows: true, gap: "?" }, "berry"],
  ["phys-magnets repel", { kind: "phys-magnets", scene: "bars", magnets: ["SN", "NS"], arrows: true }, "berry"],
  ["phys-magnets field", { kind: "phys-magnets", scene: "field", compass: true }, "grape"],
  ["phys-magnets wire", { kind: "phys-magnets", scene: "wire", current: "out", label: "I" }, "wave"],
  ["phys-magnets wire side", { kind: "phys-magnets", scene: "wire", current: "out", view: "side" }, "wave"],
  ["phys-magnets dipole", { kind: "phys-magnets", scene: "charges", charges: [{ sign: "+", x: -2, y: 0 }, { sign: "−", x: 2, y: 0 }], lines: true }, "night"],
  [
    "phys-magnets coulomb",
    {
      kind: "phys-magnets",
      scene: "charges",
      charges: [
        { sign: "+", x: -2, y: 0, label: "q₁" },
        { sign: "+", x: 1.5, y: 0, q: 2, label: "q₂" },
      ],
      forces: true,
      forceLabels: ["F", "?"],
      distance: 3,
    },
    "teal",
  ],
  [
    "phys-energy bars",
    { kind: "phys-energy", names: ["KE", "GPE", "Th"], bars: [{ title: "Top", values: [0, 10, 0] }, { title: "Bottom", values: [8, 0, "?"] }], max: 10, unit: "J" },
    "tangerine",
  ],
  [
    "phys-energy chain",
    {
      kind: "phys-energy",
      chain: [
        { emoji: "🔋", label: "battery" },
        { emoji: "💡", label: "bulb", via: "electric" },
        [
          { emoji: "✨", label: "light" },
          { emoji: "🔥", label: "heat" },
        ],
      ],
    },
    "sun",
  ],
  [
    "phys-energy food chain",
    {
      kind: "phys-energy",
      chain: [
        { emoji: "☀️", label: "sun" },
        { emoji: "🌱", label: "plant", via: "light" },
        { emoji: "🥕", label: "food" },
        { emoji: "🏃", label: "you", via: "chemical" },
      ],
    },
    "leaf",
  ],
  ["phys-oscillator spring", { kind: "phys-oscillator", type: "spring", displacement: 1, amplitudeLabel: "A", massLabel: "m", kLabel: "k", force: "F", velocity: 0 }, "wave"],
  ["phys-oscillator spring moving", { kind: "phys-oscillator", type: "spring", displacement: -0.5, massLabel: 2, velocity: 0.8, force: "?" }, "wave"],
  ["phys-oscillator vertical", { kind: "phys-oscillator", type: "spring", orientation: "vertical", displacement: 0.6, amplitudeLabel: 0.1, kLabel: 200, massLabel: 1, force: "F" }, "leaf"],
  ["phys-oscillator spring animate", { kind: "phys-oscillator", type: "spring", displacement: 0, animate: true }, "teal"],
  ["phys-oscillator pendulum", { kind: "phys-oscillator", type: "pendulum", angle: 25, lengthLabel: 2, massLabel: "m", swing: true }, "grape"],
  ["phys-oscillator pendulum animate", { kind: "phys-oscillator", type: "pendulum", angle: -20, angleLabel: "θ", animate: true }, "rose"],
  [
    "phys-fluid float",
    {
      kind: "phys-fluid",
      scene: "float",
      liquid: "water",
      objects: [
        { submerged: 0.5, label: "wood", emoji: "🪵" },
        { submerged: 0.9, label: "ice", colour: "wave" },
        { submerged: 1, sunk: true, label: "rock", colour: "night", size: 0.8 },
      ],
    },
    "wave",
  ],
  [
    "phys-fluid pressure",
    { kind: "phys-fluid", scene: "pressure", holes: true, points: [{ depth: 0.25, label: "P₁" }, { depth: 0.8, label: "?", depthLabel: 4 }] },
    "teal",
  ],
  ["phys-fluid pipe", { kind: "phys-fluid", scene: "pipe", widths: [2, 1], v: [2, "?"], area: [4, 1] }, "wave"],
  [
    "phys-thermo thermometer",
    { kind: "phys-thermo", scene: "thermometer", min: -10, max: 50, step: 2, labelStep: 10, thermometers: [{ temp: 24, reading: "?", label: "room" }, { temp: 2, label: "ice water" }] },
    "berry",
  ],
  ["phys-thermo flow", { kind: "phys-thermo", scene: "flow", a: { emoji: "☕", temp: 80 }, b: { emoji: "🧊", temp: 0 } }, "tangerine"],
  ["phys-thermo piston", { kind: "phys-thermo", scene: "piston", volume: 0.6, P: 2, V: "?", T: 300, heat: "in", hot: true, weight: "🧱" }, "grape"],
  ["phys-orbit", { kind: "phys-orbit", scene: "orbit", radiusLabel: "r", speedLabel: "v", gravityLabel: "F_g" }, "night"],
  ["phys-orbit ellipse", { kind: "phys-orbit", scene: "orbit", ecc: 0.5, at: 120, satellite: "☄️", planet: "☀️", speedLabel: "v", gravityLabel: "F" }, "night"],
  [
    "phys-orbit pair",
    { kind: "phys-orbit", scene: "pair", masses: [{ label: "m₁", size: 1.4 }, { label: "m₂", size: 0.8 }], distance: "r", forceLabels: ["F", "?"] },
    "grape",
  ],
  ["phys-sound drum", { kind: "phys-sound", scene: "vibrate", source: "drum", rings: 3, loud: true, ear: true, label: "loud" }, "berry"],
  ["phys-sound fork high", { kind: "phys-sound", scene: "vibrate", source: "fork", rings: 4, pitch: "high", label: "high pitch" }, "grape"],
  ["phys-sound string low", { kind: "phys-sound", scene: "vibrate", source: "string", rings: 2, pitch: "low", animate: true }, "teal"],
  ["phys-sound speaker", { kind: "phys-sound", scene: "vibrate", source: "speaker", ear: true }, "night"],
  ["phys-sound bell", { kind: "phys-sound", scene: "vibrate", source: "bell", rings: 2 }, "sun"],
  ["phys-sound signal", { kind: "phys-sound", scene: "signal", sender: "🔦", receiver: "🧒", via: "light", message: "• — •", distance: 20 }, "sun"],
  ["phys-sound radio", { kind: "phys-sound", scene: "signal", sender: "📡", receiver: "📻", via: "radio", distance: "?" , unit: "km"}, "wave"],
];

/** Gallery samples for physics activities: [name, activity, world colour]. At least one per kind (tests check this). */
export const PHYSICS_ACTIVITIES: [string, Activity, Colour][] = [
  ["phys-pushpull reach", { kind: "phys-pushpull", object: "📦", length: 10, start: 2, strengths: [2, 4, 6], target: 6 }, "tangerine"],
  ["phys-pushpull stop", { kind: "phys-pushpull", object: "⚽", length: 12, start: 4, strengths: [1, 3, 5], target: "stop", rolling: 3 }, "leaf"],
  [
    "phys-forceArrows book",
    { kind: "phys-forceArrows", object: "📕", surface: "floor", directions: 8, maxSize: 5, given: [{ dir: 270, size: 3, label: "F_g" }], arrows: [{ label: "N", answer: { dir: 90, size: 3 } }] },
    "wave",
  ],
  [
    "phys-forceArrows net",
    {
      kind: "phys-forceArrows",
      directions: 16,
      maxSize: 4,
      given: [{ dir: 0, size: 3, label: "A" }],
      arrows: [
        { label: "B", answer: { dir: 90, size: 4 } },
        { label: "C", dir: 180, size: 2, answer: { dir: 180, size: 0 } },
      ],
      check: "net",
      net: { x: 3, y: 4 },
    },
    "grape",
  ],
  [
    "phys-buildCircuit parallel",
    {
      kind: "phys-buildCircuit",
      top: [{ part: "cell", label: 3 }, { part: "gap" }],
      branches: [
        [{ part: "bulb", name: "A" }, { part: "gap" }],
        [{ part: "bulb", name: "B" }, { part: "switch", closed: false }],
      ],
      lit: ["B"],
    },
    "sun",
  ],
  ["phys-buildCircuit loop", { kind: "phys-buildCircuit", top: [{ part: "cell", cells: 2 }], bottom: [{ part: "bulb", name: "A" }, { part: "gap" }], lit: ["A"] }, "teal"],
  [
    "phys-launch angle",
    { kind: "phys-launch", g: 9.8, angle: { min: 15, max: 75, step: 5 }, speed: 15, target: 20, tolerance: 1.5, width: 30 },
    "night",
  ],
  [
    "phys-launch cliff",
    { kind: "phys-launch", g: 10, height: 5, angle: 0, speed: { min: 2, max: 12, step: 1 }, target: 8, tolerance: 0.6, width: 15, launcher: "hand" },
    "berry",
  ],
  ["phys-balance", { kind: "phys-balance", slots: 4, fixed: [{ side: "left", at: 3, mass: 2 }], mass: 1, side: "right", unit: "kg" }, "cocoa"],
  ["phys-balance both", { kind: "phys-balance", slots: 5, fixed: [{ side: "left", at: 2, mass: 3, emoji: "🐘" }, { side: "right", at: 1, mass: 2 }], mass: 1 }, "lime"],
  [
    "phys-matchWave",
    { kind: "phys-matchWave", length: 8, target: { amplitude: 2, wavelength: 4 }, amplitude: { min: 0.5, max: 3, step: 0.5 }, wavelength: { min: 1, max: 8, step: 1 } },
    "wave",
  ],
  ["phys-matchWave frequency", { kind: "phys-matchWave", length: 8, target: { amplitude: 1, wavelength: 2 }, frequency: { min: 1, max: 6, step: 1 }, speed: 4 }, "teal"],
  [
    "phys-material",
    {
      kind: "phys-material",
      want: "block",
      materials: [
        { name: "glass", emoji: "🪟", type: "transparent" },
        { name: "wax paper", emoji: "📄", type: "translucent" },
        { name: "wood", emoji: "🪵", type: "opaque" },
        { name: "mirror", emoji: "🪞", type: "mirror" },
      ],
    },
    "sun",
  ],
  ["phys-magnet arrange", { kind: "phys-magnet", mode: "arrange", want: "attract", start: ["NS", "SN"], fixed: "left" }, "berry"],
  [
    "phys-magnet pickup",
    {
      kind: "phys-magnet",
      mode: "pickup",
      items: [
        { name: "paper clip", emoji: "📎", magnetic: true },
        { name: "eraser", emoji: "🧽", magnetic: false },
        { name: "nail", emoji: "🔩", magnetic: true },
        { name: "pencil", emoji: "✏️", magnetic: false },
        { name: "safety pin", emoji: "🧷", magnetic: true },
        { name: "crayon", emoji: "🖍️", magnetic: false },
      ],
    },
    "grape",
  ],
];
