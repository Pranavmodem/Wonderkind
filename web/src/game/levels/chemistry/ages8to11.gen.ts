/**
 * Question generators for chemistry, ages 8–11 (Grades 3–5, NGSS 5-PS1): matter is made of particles too small
 * to see, weight is conserved when matter changes, identifying materials by their properties, and mixing that
 * makes new substances versus mixtures that can be separated. Worlds are assembled in ./ages8to11.ts.
 *
 * Masses are realistic: an ice cube is about 20–30 g, 1 mL of water weighs 1 g, a teaspoon of baking soda in
 * vinegar gives off a few grams of carbon dioxide.
 */
import { pick, rand, shuffle } from "../../questions";
import type { ParticlePanel, ReactionTerm } from "../../science/chemistryTypes";
import type { Colour, Question, Visual } from "../../types";
import { ask, cap, choose, doIt, list, some, sortQ, type Ans } from "./ages5to8.gen";

/* =================================================================== helpers */

const sortExplain = (bins: string[], items: { label: string; bin: number }[]) =>
  bins.map((b, i) => `${b}: ${items.filter((it) => it.bin === i).map((it) => it.label).join(", ")}.`).join(" ");

/** Whole-number answer: typed on the keypad. */
const typed = (n: number): Ans => ({ answer: n, input: "keypad" });

/** Number choices near the answer. */
const nums = (n: number, likely: number[], max = 1000, step = 1): Ans => {
  const out = new Set<number>([n]);
  for (const v of shuffle(likely)) if (out.size < 4 && v >= 0 && v <= max && v !== n) out.add(v);
  for (let k = 1; out.size < 4; k++) for (const v of shuffle([n + k * step, n - k * step])) if (out.size < 4 && v >= 0 && v <= max) out.add(v);
  return { answer: n, input: "choices", choices: shuffle([...out]) };
};

const gas = (count: number, colour: Colour, name: string): ParticlePanel["species"][number] => ({ count, colour, name });

/* =================================================== world A: too small to see */

interface Evidence {
  s: string;
  yes: string;
  no: string[];
  visual?: Visual;
}

const EVIDENCE: Evidence[] = [
  {
    s: "Flare stirs sugar into water. The sugar disappears, but the water tastes sweet.",
    yes: "The sugar broke into particles too small to see.",
    no: ["The sugar was destroyed.", "The sugar floated away into the air.", "The water turned into sugar."],
    visual: { kind: "chem-particles", panels: [{ species: [gas(4, "rose", "sugar"), gas(12, "wave", "water")], arrangement: "liquid", container: "beaker", label: "Sugar water" }] },
  },
  {
    s: "Cookies bake in the kitchen. You smell them from your bedroom.",
    yes: "Tiny particles from the cookies travel through the air to your nose.",
    no: ["Smells aren't made of anything.", "The cookies grew bigger.", "The smell is made of light."],
    visual: { kind: "chem-particles", panels: [{ species: [gas(12, "wave", "air"), gas(4, "tangerine", "cookie smell")], label: "Air in the house" }] },
  },
  {
    s: "You blow into a balloon and it gets bigger.",
    yes: "Air is made of particles that take up space.",
    no: ["Air is empty, so nothing went in.", "The rubber grew by itself.", "Your breath is a solid."],
    visual: { kind: "chem-particles", panels: [{ species: [gas(14, "wave", "air")], label: "Air inside the balloon" }] },
  },
  {
    s: "A puddle dries up on a sunny day.",
    yes: "Water particles escaped into the air as a gas.",
    no: ["The water was destroyed.", "It turned into sunlight.", "It shrank into a tiny solid."],
  },
  {
    s: "A drop of food coloring spreads through a glass of water without stirring.",
    yes: "Moving particles of color mix in among the water particles.",
    no: ["The color was destroyed.", "The water is a solid.", "The glass changed color."],
  },
  {
    s: "A flat ball gets firm when you pump air into it.",
    yes: "More air particles push on the inside of the ball.",
    no: ["Air takes up no space.", "The pump made the ball's skin thicker.", "The air turned into rubber."],
  },
  {
    s: "Salt dissolves in a cup of water. You can't see it, but the water tastes salty.",
    yes: "The salt is still there as particles too small to see.",
    no: ["The salt was destroyed.", "The salt turned into water.", "The salt jumped out of the cup."],
  },
  {
    s: "You smell perfume from across the room.",
    yes: "Perfume particles spread out through the air.",
    no: ["Smells travel by magic.", "The perfume bottle got bigger.", "Your nose made the smell."],
  },
  {
    s: "You block the end of a syringe full of air. The plunger only pushes in a little way.",
    yes: "Air particles get squeezed closer, then push back.",
    no: ["Air is nothing, so it should go all the way in.", "The air turned into water.", "The plunger is magnetic."],
  },
];

const NOT_EVIDENCE = ["A rock is hard.", "A ball rolls down a hill.", "The sun is bright at noon.", "A bell rings when you hit it.", "A plant grows toward light."];

/** Evidence that matter is made of particles too small to see. */
export function particleEvidence(): Question {
  if (Math.random() < 0.7) {
    const i = rand(0, EVIDENCE.length - 1);
    const e = EVIDENCE[i];
    return ask(
      {
        key: `evid-${i}`,
        prompt: `${e.s} Why?`,
        visual: e.visual,
        hint: "All matter is made of particles too small to see. Which answer uses that idea?",
        explain: `${e.yes} The matter is still there, even when you can't see it.`,
      },
      choose(e.yes, e.no, 4),
    );
  }
  const yes = pick(EVIDENCE);
  const no = some(NOT_EVIDENCE, 2);
  return ask(
    {
      key: `evid-which-${yes.s.slice(0, 20)}-${no.join("|")}`,
      prompt: "Which one is evidence that matter is made of tiny particles?",
      hint: "Look for something you can't see but can still smell, taste or feel.",
      explain: `${yes.s} ${yes.yes}`,
    },
    choose(yes.s, no),
  );
}

type State = "solid" | "liquid" | "gas";
const STATE_NAME: Record<State, string> = { solid: "Solid", liquid: "Liquid", gas: "Gas" };
const MOTION: Record<State, 1 | 2 | 3> = { solid: 1, liquid: 2, gas: 3 };

const SUBSTANCES: { formula?: string; name: string; colour?: Colour }[] = [
  { formula: "H₂O", name: "water" },
  { name: "wax", colour: "sun" },
  { name: "a mystery substance", colour: "berry" },
  { formula: "CO₂", name: "carbon dioxide" },
];

const STATE_FACTS: { s: State; does: string; shape: string }[] = [
  { s: "solid", does: "vibrate in place, packed in rows", shape: "keeps its own shape" },
  { s: "liquid", does: "stay close but slide past each other", shape: "takes the shape of its container but keeps its amount" },
  { s: "gas", does: "zoom around far apart", shape: "spreads out to fill its whole container" },
];

const SHAPE_SCENES: { s: string; a: string; no: string[] }[] = [
  { s: "Flare pours juice from a tall glass into a wide bowl.", a: "Its shape changes, but not its amount.", no: ["Its amount changes, but not its shape.", "Nothing about it changes.", "It turns into a gas."] },
  { s: "Flare moves a wooden block from a box to a bowl.", a: "It keeps its shape and its amount.", no: ["It takes the shape of the bowl.", "It spreads out to fill the bowl.", "It gets smaller."] },
  { s: "Flare lets a little air out of a balloon into an empty room.", a: "It spreads out to fill the whole room.", no: ["It stays in a balloon-shaped lump.", "It drips to the floor.", "It disappears forever."] },
];

/** Solids, liquids and gases as particle models. */
export function statesModel(): Question {
  const r = rand(0, 3);
  const sub = pick(SUBSTANCES);
  const n = rand(9, 15);
  const sp = (count: number) => [{ count, formula: sub.formula, colour: sub.colour, name: sub.name }];
  if (r === 0) {
    const s = pick(["solid", "liquid", "gas"] as State[]);
    return ask(
      {
        key: `sm-name-${sub.name}-${s}-${n}`,
        prompt: `These are particles of ${sub.name}. What state is it in?`,
        visual: { kind: "chem-particles", panels: [{ species: sp(n), arrangement: s, motion: MOTION[s], label: "?" }] },
        needsVisual: true,
        hint: "Rows mean solid. Close but jumbled means liquid. Far apart means gas.",
        explain: `${STATE_NAME[s]}: the particles ${STATE_FACTS.find((f) => f.s === s)!.does}.`,
      },
      choose(STATE_NAME[s], ["Solid", "Liquid", "Gas"].filter((x) => x !== STATE_NAME[s]), 3),
    );
  }
  if (r === 1) {
    const order = shuffle(["solid", "liquid", "gas"] as State[]);
    const want = pick(order);
    const box = `Box ${"ABC"[order.indexOf(want)]}`;
    return ask(
      {
        key: `sm-pick-${order.join("")}-${want}-${n}-${sub.name}`,
        prompt: `Which box shows ${sub.name} as a ${want}?`,
        visual: { kind: "chem-particles", panels: order.map((s, i) => ({ species: sp(n), arrangement: s, motion: MOTION[s], label: "ABC"[i] })), joiner: null },
        needsVisual: true,
        hint: "Look at how close the particles are and whether they're in rows.",
        explain: `${box}. In a ${want}, particles ${STATE_FACTS.find((f) => f.s === want)!.does}.`,
      },
      choose(box, ["Box A", "Box B", "Box C"].filter((b) => b !== box), 3),
    );
  }
  if (r === 2) {
    const f = pick(STATE_FACTS);
    const useShape = Math.random() < 0.5;
    return ask(
      {
        key: `sm-fact-${f.s}-${useShape}`,
        prompt: useShape ? `Which state of matter ${f.shape}?` : `In which state do particles ${f.does}?`,
        hint: "Picture the particles: rows, jumbled and close, or far apart.",
        explain: `A ${f.s}. Its particles ${f.does}, so it ${f.shape}.`,
      },
      choose(STATE_NAME[f.s], ["Solid", "Liquid", "Gas"].filter((x) => x !== STATE_NAME[f.s]), 3),
    );
  }
  const sc = pick(SHAPE_SCENES);
  return ask(
    { key: `sm-scene-${sc.s.slice(0, 24)}-${n}`, prompt: `${sc.s} What happens?`, hint: "Solids keep their shape. Liquids take the shape of their container. Gases spread out to fill it.", explain: sc.a },
    choose(sc.a, sc.no, 4),
  );
}

const SOLUTES = [
  { name: "sugar", colour: "rose" as Colour, taste: "sweet" },
  { name: "salt", colour: "grape" as Colour, taste: "salty" },
  { name: "drink powder", colour: "tangerine" as Colour, taste: "fruity" },
];

/** Dissolving: the particles are still there. */
export function dissolving(): Question {
  const so = pick(SOLUTES);
  const n = rand(3, 8);
  const w = rand(8, 14);
  const r = rand(0, 2);
  const visual: Visual = {
    kind: "chem-particles",
    panels: [
      { species: [{ count: n, colour: so.colour, name: so.name }], arrangement: "solid", label: `${cap(so.name)}` },
      { species: [{ count: n, colour: so.colour, name: so.name }, { count: w, colour: "wave", name: "water" }], arrangement: "liquid", container: "beaker", label: "After stirring" },
    ],
    joinerLabel: "stir into water",
  };
  if (r === 0)
    return ask(
      {
        key: `dis-count-${so.name}-${n}-${w}`,
        prompt: `Flare stirs ${n} particles of ${so.name} into water. How many ${so.name} particles are in the water now?`,
        visual,
        hint: "Dissolving spreads particles out. Does it destroy any?",
        explain: `${n}. Dissolving doesn't destroy particles; the ${n} ${so.name} particles just spread out between the water particles.`,
      },
      nums(n, [0, n - 1, n + w, w], 30),
    );
  if (r === 1)
    return ask(
      {
        key: `dis-why-${so.name}-${n}-${w}`,
        prompt: `The ${so.name} dissolved. Why can't you see it any more?`,
        visual,
        hint: "Is the water still " + so.taste + "? Then the " + so.name + " is still there.",
        explain: `Its particles spread out between the water particles, and each one is far too small to see. The water still tastes ${so.taste}.`,
      },
      choose("Its particles spread out and are too small to see.", ["It was destroyed.", "It sank and hid under the water.", "It turned into water."], 4),
    );
  return ask(
    {
      key: `dis-mistake-${so.name}-${n}-${w}`,
      prompt: `Max says: "The ${so.name} is gone. I can't see it!" What's wrong with that?`,
      visual,
      hint: "Can something be there even if you can't see it?",
      explain: `The ${so.name} is still there as tiny particles. You can taste it, and if the water evaporates, the ${so.name} is left behind.`,
    },
    choose(`It's still there. The water tastes ${so.taste}.`, ["Nothing. It really is gone.", "It turned into air.", "It melted into a liquid."], 4),
  );
}

/** Do it: model a solution or air with particles. */
export function mixParticles(): Question {
  if (Math.random() < 0.7) {
    const so = pick(SOLUTES);
    const s = rand(2, 6);
    const w = rand(6, 12);
    return ask(
      {
        key: `mixp-${so.name}-${s}-${w}`,
        prompt: `Make a model of ${so.name} water: ${s} ${so.name} particles and ${w} water particles.`,
        hint: "Tap + to add each kind. Watch the counts.",
        explain: `${s} ${so.name} + ${w} water = ${s + w} particles. The ${so.name} particles spread out among the water particles.`,
      },
      doIt({ kind: "chem-mix", mode: "mixture", species: [{ name: so.name, colour: so.colour }, { name: "water", formula: "H₂O" }], target: { counts: [s, w] } }, s + w),
    );
  }
  const k = rand(1, 3);
  return ask(
    {
      key: `mixp-air-${k}`,
      prompt: `Air is about 4 nitrogen particles for every 1 oxygen particle. Make a model of air with ${4 * k} nitrogen.`,
      hint: `4 nitrogen for each oxygen. How many groups of 4 are in ${4 * k}?`,
      explain: `${4 * k} nitrogen and ${k} oxygen. ${4 * k} ÷ 4 = ${k}. Air is a mixture of gases, mostly nitrogen.`,
    },
    doIt({ kind: "chem-mix", mode: "mixture", species: [{ name: "nitrogen", formula: "N₂" }, { name: "oxygen", formula: "O₂" }], target: { counts: [4 * k, k] } }, 5 * k),
  );
}

/** Air is matter: it takes up space and has weight. */
export function airIsMatter(): Question {
  const r = rand(0, 2);
  if (r === 0) {
    const a = rand(4, 9);
    const b = rand(a + 3, 18);
    return ask(
      {
        key: `air-pump-${a}-${b}`,
        prompt: "Flare pumps air into a ball. How many air particles were pumped in?",
        visual: {
          kind: "chem-particles",
          panels: [
            { species: [gas(a, "wave", "air")], label: "Before" },
            { species: [gas(b, "wave", "air")], label: "After" },
          ],
          joinerLabel: "pump",
        },
        needsVisual: true,
        hint: "Count the particles in each box, then subtract.",
        explain: `${b} − ${a} = ${b - a} air particles were pumped in. More particles push harder, so the ball gets firm.`,
      },
      typed(b - a),
    );
  }
  if (r === 1) {
    const before = rand(596, 604);
    const add = rand(3, 5);
    return ask(
      {
        key: `air-weigh-${before}-${add}`,
        prompt: `A flat basketball weighs ${before} g. After pumping it up it weighs ${before + add} g. How many grams of air went in?`,
        visual: { kind: "scale", amount: before + add, max: 1000, unit: "g", emoji: "🏀" },
        hint: "Subtract the flat weight from the pumped-up weight.",
        explain: `${before + add} − ${before} = ${add} g. Air is matter, so it has weight.`,
      },
      typed(add),
    );
  }
  const scenes = [
    { s: "Flare pushes an upside-down 'empty' cup straight down into water. The inside stays dry.", a: "Air trapped in the cup takes up space.", no: ["The cup is waterproof inside.", "Water is afraid of cups.", "The water froze."] },
    { s: "Flare blows up a beach ball. It gets bigger and firmer.", a: "Air particles take up space and push outward.", no: ["The plastic stretched by itself.", "Air has no particles.", "Breath is a liquid."] },
    { s: "A bottle looks empty. Flare says it's full.", a: "It's full of air, which is matter.", no: ["Empty bottles are full of nothing.", "It's full of light.", "It's full of sound."] },
  ];
  const i = rand(0, scenes.length - 1);
  const w = some(scenes[i].no, 2);
  return ask(
    { key: `air-scene-${i}-${w.join("|")}`, prompt: `${scenes[i].s} Why?`, hint: "Air is made of particles too small to see, but it is still matter.", explain: scenes[i].a },
    choose(scenes[i].a, w),
  );
}

/** Smells spread: moving particles, faster when warm. */
export function smellsSpread(): Question {
  const r = rand(0, 2);
  const n = rand(4, 7);
  if (r === 0) {
    const warmFirst = Math.random() < 0.5;
    const room = (warm: boolean, label: string) => ({ species: [gas(10, "wave", "air"), gas(n, "rose", "smell")], motion: (warm ? 3 : 1) as 1 | 3, label });
    const A = warmFirst ? "warm" : "cold";
    const B = warmFirst ? "cold" : "warm";
    return ask(
      {
        key: `smell-room-${warmFirst}-${n}`,
        prompt: `Flare opens perfume in a ${A} room (A) and a ${B} room (B). Where does the smell spread faster?`,
        visual: { kind: "chem-particles", panels: [room(warmFirst, `A: ${A}`), room(!warmFirst, `B: ${B}`)], joiner: "vs" },
        hint: "The motion lines show how fast the particles move. Warmer means faster.",
        explain: `The warm room. Particles move faster when it's warmer, so the smell spreads sooner.`,
      },
      choose(`Room ${warmFirst ? "A" : "B"}, the warm one`, [`Room ${warmFirst ? "B" : "A"}, the cold one`, "Both the same"]),
    );
  }
  if (r === 1) {
    const hotFirst = Math.random() < 0.5;
    const cup = (hot: boolean, label: string) => ({ species: [gas(12, "wave", "water"), gas(n, "berry", "food coloring")], arrangement: "liquid" as const, container: "beaker" as const, motion: (hot ? 3 : 1) as 1 | 3, label });
    return ask(
      {
        key: `smell-color-${hotFirst}-${n}`,
        prompt: "Flare drops food coloring into hot water and cold water. Where does it spread faster?",
        visual: { kind: "chem-particles", panels: [cup(hotFirst, hotFirst ? "Hot" : "Cold"), cup(!hotFirst, hotFirst ? "Cold" : "Hot")], joiner: "vs" },
        hint: "Which water has faster-moving particles?",
        explain: "The hot water. Its particles move faster and bump the color particles around sooner.",
      },
      choose("In hot water", ["In cold water", "Both the same"]),
    );
  }
  const scenes = [
    { s: "Why can you smell a skunk from far away?", a: "Its smell particles move through the air to your nose." },
    { s: "Why does a room smell of popcorn soon after you make it?", a: "Popcorn particles spread out through the moving air." },
    { s: "Why does a smell get weaker as you walk away from it?", a: "The smell particles are more spread out farther away." },
  ];
  const i = rand(0, scenes.length - 1);
  return ask(
    { key: `smell-why-${i}-${n}`, prompt: scenes[i].s, hint: "Smells are made of tiny particles that move.", explain: scenes[i].a },
    choose(scenes[i].a, ["Smells are made of nothing.", "Your nose makes the smell.", "Light carries the smell."], 4),
  );
}

/** Evaporation and condensation. */
export function evaporation(): Question {
  const n = rand(8, 14);
  const r = rand(0, 3);
  const pic: Visual = {
    kind: "chem-particles",
    panels: [
      { species: [{ formula: "H₂O", count: n, name: "water" }], arrangement: "liquid", motion: 2, label: "Puddle" },
      { species: [{ formula: "H₂O", count: n, name: "water" }], arrangement: "gas", motion: 3, label: "Water vapor" },
    ],
    joinerLabel: "sun warms it",
  };
  if (r === 0)
    return ask(
      {
        key: `evap-where-${n}`,
        prompt: "A puddle dries up in the sun. Where did the water go?",
        visual: pic,
        hint: "Count the particles in both boxes. Did any disappear?",
        explain: "Into the air. The water particles spread out as water vapor, a gas too thin to see.",
      },
      choose("Into the air as water vapor", ["It was destroyed", "Into the sun", "It turned into dirt"], 4),
    );
  if (r === 1)
    return ask(
      {
        key: `evap-count-${n}`,
        prompt: "How many water particles are in the water vapor?",
        visual: pic,
        needsVisual: true,
        hint: "Evaporating spreads particles out. Does it make or destroy any?",
        explain: `${n}, the same as in the puddle. The particles just moved apart.`,
      },
      nums(n, [0, n - 2, n + 2, 2 * n], 40),
    );
  if (r === 2)
    return ask(
      {
        key: `evap-faster-${n}`,
        prompt: "Which puddle dries up faster?",
        hint: "Water particles escape faster when they're warmer.",
        explain: "The one in the hot sun. Warmer water particles move faster and escape into the air sooner.",
      },
      choose("The one in the hot sun", ["The one in the cool shade", "Both the same"]),
    );
  return ask(
    {
      key: `evap-cond-${n}`,
      prompt: "Drops of water form on the outside of a glass of ice water. Where did they come from?",
      hint: "Air has water vapor in it. What happens when it touches something cold?",
      explain: "From the air. Water vapor particles touch the cold glass, slow down, and gather into drops (condensation).",
    },
    choose("Water vapor in the air", ["Water leaking through the glass", "The ice melting through", "Nowhere; they were made new"], 4),
  );
}

const SLIDERS = [
  { substance: "water", formula: "H₂O", melt: 0, boil: 100, find: "boil" as const, min: 60, max: 120, step: 5 },
  { substance: "water", formula: "H₂O", melt: 0, boil: 100, find: "melt" as const, min: -30, max: 30, step: 5 },
  { substance: "candle wax", melt: 60, boil: 370, find: "melt" as const, min: 20, max: 100, step: 5 },
  { substance: "ethanol", melt: -114, boil: 78, find: "boil" as const, min: 40, max: 100, step: 2 },
  { substance: "tin", melt: 232, boil: 2602, find: "melt" as const, min: 150, max: 300, step: 2 },
];

/** Do it: find a melting or boiling point by heating slowly. */
export function findPoint(): Question {
  const s = pick(SLIDERS);
  const t = s.find === "melt" ? s.melt : s.boil;
  const start = s.min + s.step * rand(0, (t - s.min) / s.step - 1);
  const word = s.find === "melt" ? "melt" : "boil";
  return ask(
    {
      key: `find-${s.substance}-${word}-${start}`,
      prompt: `Heat the ${s.substance} slowly. Stop at the exact temperature where it starts to ${word}.`,
      hint: `Move one step at a time. Watch the particles and the label: stop when it says ${word === "melt" ? "melting" : "boiling"}.`,
      explain: `${s.substance === "water" ? "Water" : cap(s.substance)} ${word}s at ${t} °C. Each pure substance has its own ${word === "melt" ? "melting" : "boiling"} point, so it helps identify it.`,
    },
    doIt({ kind: "chem-states", substance: s.substance, formula: s.formula, melt: s.melt, boil: s.boil, target: { find: s.find }, min: s.min, max: s.max, step: s.step, start }, t),
  );
}

const MATTER = ["💨 air", "💧 water", "🪨 rock", "♨️ steam", "🎈 helium gas", "🌸 a flower's smell", "🧂 salt", "🌫️ fog"];
const NOT_MATTER = ["💡 light", "🔊 sound", "🌡️ heat", "👤 a shadow", "💭 a thought", "🌈 a rainbow"];

/** Do it: sort matter from things that aren't matter. */
export function sortMatter(): Question {
  const n = rand(3, 4);
  const items = shuffle([...some(MATTER, n).map((label) => ({ label, bin: 0 })), ...some(NOT_MATTER, 6 - n + rand(0, 1)).map((label) => ({ label, bin: 1 }))]);
  const bins = ["Matter", "Not matter"];
  return sortQ(
    {
      key: `sortmatter-${items.map((i) => i.label).join("")}`,
      prompt: "Sort them: matter, or not matter?",
      hint: "Matter is made of particles: it takes up space and has weight, even if you can't see it. Light, sound and heat are energy.",
      explain: sortExplain(bins, items),
    },
    bins,
    items,
  );
}

/* ================================================ world B: weight stays the same */

/** Melting and freezing on a balance. */
export function meltWeight(): Question {
  const cup = 5 * rand(16, 30);
  const m = 5 * rand(6, 30);
  const total = cup + m;
  const melt = Math.random() < 0.6;
  const r = rand(0, 2);
  const ice = { glass: "beaker" as const, volume: 0, max: 250, precipitate: true, label: "Ice" };
  const water = { glass: "beaker" as const, volume: m, max: 250, label: "Water" };
  const visual: Visual = {
    kind: "chem-beaker",
    panels: melt ? [{ ...ice, balance: total }, { ...water, balance: "?" }] : [{ ...water, balance: total }, { ...ice, balance: "?" }],
    joinerLabel: melt ? "melts" : "freezes",
  };
  if (r < 2)
    return ask(
      {
        key: `meltw-${melt}-${cup}-${m}`,
        prompt: melt ? `The cup of ice weighs ${total} g. The ice melts. What does it weigh now?` : `The cup of water weighs ${total} g. Flare freezes it. What does it weigh now?`,
        visual,
        hint: "Did any particles get in or out of the cup?",
        explain: `${total} g. ${melt ? "Melting" : "Freezing"} changes how the particles are arranged, not how many there are, so the weight stays the same.`,
      },
      typed(total),
    );
  return ask(
    {
      key: `meltw-claim-${melt}-${cup}-${m}`,
      prompt: "Ice takes up more space than the water it froze from. So does the ice weigh more?",
      visual,
      hint: "Count particles, not space. Did any get added?",
      explain: "No. It's the same particles, just spread out a little more in rows. The weight stays the same.",
    },
    choose("No, it weighs the same", ["Yes, it weighs more", "No, it weighs less"]),
  );
}

/** Dissolving on a balance. */
export function dissolveWeight(): Question {
  const so = pick(["salt", "sugar"]);
  const w = 10 * rand(15, 30);
  const s = rand(5, 40);
  if (Math.random() < 0.5) {
    const total = w + s;
    return ask(
      {
        key: `dissw-same-${so}-${w}-${s}`,
        prompt: `Before stirring, the ${so} and water weigh ${total} g. After the ${so} dissolves, what do they weigh?`,
        visual: {
          kind: "chem-beaker",
          panels: [
            { glass: "beaker", volume: 200, max: 250, precipitate: true, balance: total, label: "Before stirring" },
            { glass: "beaker", volume: 200, max: 250, balance: "?", label: "After stirring" },
          ],
          joinerLabel: "stir",
        },
        hint: `The ${so} vanished from sight. Did it leave the beaker?`,
        explain: `${total} g. The ${so} particles are still in the water, so nothing was lost.`,
      },
      typed(total),
    );
  }
  return ask(
    {
      key: `dissw-add-${so}-${w}-${s}`,
      prompt: `${w} g of water. Flare stirs in ${s} g of ${so} until it dissolves. What does the ${so} water weigh?`,
      visual: { kind: "chem-beaker", panels: [{ glass: "beaker", volume: 200, max: 250, balance: w, label: "Water" }, { glass: "beaker", volume: 200, max: 250, balance: "?", label: `${cap(so)} water` }], joinerLabel: `+ ${s} g ${so}` },
      hint: "Add the weight of the water and the weight of what you stirred in.",
      explain: `${w} + ${s} = ${w + s} g. Dissolved ${so} still has weight.`,
    },
    typed(w + s),
  );
}

/** Do it: weigh after a melt, freeze or dissolve. */
export function weighAfterChange(): Question {
  const r = rand(0, 2);
  if (r === 0) {
    const m = rand(18, 32);
    return ask(
      {
        key: `wac-melt-${m}`,
        prompt: `An ice cube weighed ${m} g. It melted in a dish. Weigh the water.`,
        hint: "Melting doesn't change the weight. Add weights until the pans are level.",
        explain: `${m} g, the same as the ice cube.`,
      },
      doIt({ kind: "chem-measure", mode: "balance", mass: m, emoji: "💧" }, m),
    );
  }
  if (r === 1) {
    const m = 10 * rand(5, 20);
    return ask(
      {
        key: `wac-freeze-${m}`,
        prompt: `Flare froze ${m} g of juice into an ice pop. Weigh the ice pop.`,
        hint: "Freezing doesn't add or remove anything. Start with the big weights.",
        explain: `${m} g, the same as the juice.`,
      },
      doIt({ kind: "chem-measure", mode: "balance", mass: m, emoji: "🧊" }, m),
    );
  }
  const w = 10 * rand(10, 25);
  const s = rand(3, 25);
  return ask(
    {
      key: `wac-diss-${w}-${s}`,
      prompt: `Flare dissolved ${s} g of sugar in ${w} g of tea. Weigh the sweet tea.`,
      hint: `Add the two weights first: ${w} + ${s}. Then build that with the weights.`,
      explain: `${w} + ${s} = ${w + s} g. The sugar is still there, so its weight is too.`,
    },
    doIt({ kind: "chem-measure", mode: "balance", mass: w + s, emoji: "🍵" }, w + s),
  );
}

const MIXES: { a: string; b: string; ag: [number, number, number]; bg: [number, number, number] }[] = [
  { a: "sand", b: "water", ag: [20, 80, 5], bg: [100, 300, 10] },
  { a: "orange juice", b: "water", ag: [100, 300, 10], bg: [100, 300, 10] },
  { a: "nuts", b: "raisins", ag: [50, 200, 10], bg: [50, 150, 10] },
  { a: "oil", b: "vinegar", ag: [30, 90, 5], bg: [50, 150, 5] },
  { a: "iron filings", b: "sand", ag: [10, 50, 5], bg: [50, 200, 10] },
];

const inRange = ([lo, hi, step]: [number, number, number]) => step * rand(Math.ceil(lo / step), Math.floor(hi / step));

/** Mixing: the total weight is the sum of the parts. */
export function mixWeight(): Question {
  const m = pick(MIXES);
  const a = inRange(m.ag);
  const b = inRange(m.bg);
  if (Math.random() < 0.5)
    return ask(
      {
        key: `mixw-sum-${m.a}-${a}-${b}`,
        prompt: `Flare mixes ${a} g of ${m.a} with ${b} g of ${m.b}. What does the mixture weigh?`,
        hint: "When you mix, nothing is lost. Add the weights.",
        explain: `${a} + ${b} = ${a + b} g.`,
      },
      typed(a + b),
    );
  return ask(
    {
      key: `mixw-part-${m.a}-${a}-${b}`,
      prompt: `A mixture of ${m.a} and ${m.b} weighs ${a + b} g. The ${m.b} weighed ${b} g. How much ${m.a} was there?`,
      hint: "Total = part + part. Take away the part you know.",
      explain: `${a + b} − ${b} = ${a} g of ${m.a}.`,
    },
    typed(a),
  );
}

/** Fizz in an open cup and in a closed bottle. */
export function openClosed(): Question {
  const before = rand(180, 320);
  const lost = rand(1, 4);
  const r = rand(0, 2);
  const flask = (stopper: boolean, balance: number | string, label: string, bubbles: boolean) => ({ glass: "flask" as const, volume: 120, max: 250, colour: "clear" as const, stopper, balance, label, bubbles });
  if (r === 0)
    return ask(
      {
        key: `oc-closed-${before}`,
        prompt: `Baking soda and vinegar fizz inside a sealed bottle. Before: ${before} g. What does it weigh after?`,
        visual: { kind: "chem-beaker", panels: [flask(true, before, "Before", false), flask(true, "?", "After", true)] },
        hint: "The bottle is sealed. Can the gas get out?",
        explain: `${before} g. The gas made in the fizz is trapped inside, so the total weight stays the same.`,
      },
      typed(before),
    );
  const after = before - lost;
  if (r === 1)
    return ask(
      {
        key: `oc-open-${before}-${lost}`,
        prompt: `In an open cup, the fizz weighed ${before} g before and ${after} g after. Why is it lighter?`,
        visual: { kind: "chem-beaker", panels: [flask(false, before, "Before", false), flask(false, after, "After", true)] },
        hint: "Where did the bubbles go?",
        explain: `The fizz made carbon dioxide gas, and ${lost} g of it escaped into the air. The matter wasn't destroyed; it moved out of the cup.`,
      },
      choose("Gas escaped into the air.", ["Some weight was destroyed.", "Bubbles weigh less than nothing.", "The scale is broken."], 4),
    );
  return ask(
    {
      key: `oc-howmuch-${before}-${lost}`,
      prompt: "The open cup got lighter after the fizz. How many grams of gas escaped?",
      visual: { kind: "chem-beaker", panels: [flask(false, before, "Before", false), flask(false, after, "After", true)] },
      needsVisual: true,
      hint: "Subtract the after reading from the before reading.",
      explain: `${before} − ${after} = ${lost} g of carbon dioxide gas escaped into the air.`,
    },
    typed(lost),
  );
}

/** Heating: the weight stays the same unless something escapes. */
export function heatWeight(): Question {
  if (Math.random() < 0.5) {
    const m = rand(250, 450);
    const t1 = 5 * rand(3, 5);
    const t2 = 5 * rand(10, 16);
    return ask(
      {
        key: `hw-sealed-${m}-${t1}-${t2}`,
        prompt: `A sealed jar of water weighs ${m} g at ${t1} °C. Flare warms it to ${t2} °C. What does it weigh now?`,
        visual: { kind: "chem-beaker", panels: [{ glass: "flask", volume: 150, max: 250, stopper: true, thermometer: t1, balance: m, label: "Cool" }, { glass: "flask", volume: 150, max: 250, stopper: true, thermometer: t2, balance: "?", label: "Warm" }] },
        hint: "Warming makes particles move faster. Does it add any particles?",
        explain: `${m} g. The particles move faster, but none were added or lost.`,
      },
      typed(m),
    );
  }
  const before = 50 * rand(16, 24);
  const lost = 10 * rand(5, 20);
  return ask(
    {
      key: `hw-boil-${before}-${lost}`,
      prompt: `A pot of water weighs ${before} g. Flare boils it with no lid for 10 minutes. Now it weighs ${before - lost} g. How many grams of water went into the air as steam?`,
      hint: "Before − after = what escaped.",
      explain: `${before} − ${before - lost} = ${lost} g. The water wasn't destroyed; it became steam and left the open pot.`,
    },
    typed(lost),
  );
}

/** Do it: weigh a mixture. */
export function weighMixture(): Question {
  const m = pick(MIXES);
  const a = Math.min(inRange(m.ag), 200);
  const b = Math.min(inRange(m.bg), 200);
  const emoji = { sand: "🏖️", "orange juice": "🧃", nuts: "🥜", oil: "🫒", "iron filings": "🧲" }[m.a] ?? "🥣";
  return ask(
    {
      key: `wmix-${m.a}-${a}-${b}`,
      prompt: `Flare mixed ${a} g of ${m.a} and ${b} g of ${m.b}. Weigh the mixture.`,
      hint: `First add: ${a} + ${b}. Then put on the biggest weights that fit.`,
      explain: `${a} + ${b} = ${a + b} g. Mixing doesn't change the total weight.`,
    },
    doIt({ kind: "chem-measure", mode: "balance", mass: a + b, emoji }, a + b),
  );
}

const TABLE_TESTS: { name: string; closed: boolean; lose: boolean }[] = [
  { name: "Ice melts in a jar", closed: true, lose: false },
  { name: "Sugar dissolves in water", closed: true, lose: false },
  { name: "Water freezes", closed: true, lose: false },
  { name: "Sand mixes with water", closed: true, lose: false },
  { name: "Fizz in a sealed bottle", closed: true, lose: false },
  { name: "Fizz in an open cup", closed: false, lose: true },
  { name: "Water boils in an open pot", closed: false, lose: true },
];

/** Read a results table: where did the weight change, and which result is a mistake? */
export function weightTable(): Question {
  const lossy = pick(TABLE_TESTS.filter((t) => t.lose));
  const rest = some(
    TABLE_TESTS.filter((t) => !t.lose),
    rand(2, 3),
  );
  const rows = shuffle([lossy, ...rest]).map((t) => {
    const b = rand(120, 480);
    return { t, b, a: t.lose ? b - rand(2, 30) : b };
  });
  if (Math.random() < 0.5)
    return ask(
      {
        key: `wt-lost-${rows.map((r) => `${r.t.name}${r.b}${r.a}`).join("")}`,
        prompt: "In which test did the weight go down?",
        visual: { kind: "table", header: ["Test", "Before (g)", "After (g)"], rows: rows.map((r) => [r.t.name, r.b, r.a]) },
        needsVisual: true,
        hint: "Compare before and after in each row.",
        explain: `${lossy.name}: gas or steam escaped into the air. In every closed test, the weight stayed the same.`,
      },
      choose(lossy.name, rest.map((t) => t.name), 4),
    );
  // A "mistake" row: a closed test whose after reading went up.
  const bad = pick(rows.filter((r) => !r.t.lose));
  bad.a = bad.b + rand(5, 40);
  return ask(
    {
      key: `wt-mistake-${rows.map((r) => `${r.t.name}${r.b}${r.a}`).join("")}`,
      prompt: "One result must be a measuring mistake. Which one?",
      visual: { kind: "table", header: ["Test", "Before (g)", "After (g)"], rows: rows.map((r) => [r.t.name, r.b, r.a]) },
      needsVisual: true,
      hint: "Can matter appear from nowhere? Look for a weight that went up.",
      explain: `${bad.t.name}: the weight can't go up when nothing was added. Weight can go down only if something escapes.`,
    },
    choose(bad.t.name, rows.filter((r) => r !== bad).map((r) => r.t.name), 4),
  );
}

const CLAIMS: { c: string; wrong: string }[] = [
  { c: "Water weighs less than ice because it's runny.", wrong: "Melting doesn't change the weight." },
  { c: "Dissolved salt weighs nothing because you can't see it.", wrong: "The salt particles are still there, so they still have weight." },
  { c: "Air weighs nothing, so a pumped-up ball weighs the same as a flat one.", wrong: "Air is matter, so it has weight." },
  { c: "A sealed bottle of fizz gets lighter as it bubbles.", wrong: "The gas can't escape a sealed bottle, so the weight stays the same." },
  { c: "Hot water weighs more than cold water because it has more energy.", wrong: "Warming doesn't add particles, so the weight stays the same." },
  { c: "Ice weighs more than water because it takes up more space.", wrong: "Same particles, same weight, even in more space." },
];

/** Spot the mistake in a claim. */
export function weightClaims(): Question {
  const i = rand(0, CLAIMS.length - 1);
  const c = CLAIMS[i];
  const others = some(
    CLAIMS.filter((_, j) => j !== i).map((x) => x.wrong),
    2,
  );
  return ask(
    {
      key: `claim-${i}-${others.join("|")}`,
      prompt: `Sam says: "${c.c}" What's wrong?`,
      hint: "Ask: were any particles added or taken away?",
      explain: c.wrong,
    },
    choose(c.wrong, others),
  );
}

/** Particle pictures: same particles, same weight. */
export function particlesConserved(): Question {
  const n = rand(8, 16);
  if (Math.random() < 0.5) {
    const melt = Math.random() < 0.5;
    const a: ParticlePanel = { species: [{ formula: "H₂O", count: n, name: "water" }], arrangement: melt ? "solid" : "liquid", label: melt ? "Ice" : "Water" };
    const b: ParticlePanel = { species: [{ formula: "H₂O", count: n, name: "water" }], arrangement: melt ? "liquid" : "solid", label: melt ? "Water" : "Ice" };
    return ask(
      {
        key: `pc-${melt}-${n}`,
        prompt: `There are ${n} water particles in the ${melt ? "ice" : "water"}. It ${melt ? "melts" : "freezes"}. How does its weight change?`,
        visual: { kind: "chem-particles", panels: [a, b], joinerLabel: melt ? "melt" : "freeze" },
        hint: "Count the particles in each box.",
        explain: `It stays the same. There are ${n} particles before and after; they're just arranged differently.`,
      },
      choose("It stays the same", ["It gets heavier", "It gets lighter"]),
    );
  }
  const s = rand(3, 7);
  const w = rand(8, 14);
  return ask(
    {
      key: `pc-mix-${s}-${w}`,
      prompt: "How many particles are in the beaker after mixing?",
      visual: {
        kind: "chem-particles",
        panels: [
          { species: [{ count: s, colour: "rose", name: "sugar" }], arrangement: "solid", label: "Sugar" },
          { species: [{ count: w, colour: "wave", name: "water" }], arrangement: "liquid", container: "beaker", label: "Water" },
        ],
        joiner: "+",
      },
      needsVisual: true,
      hint: "Mixing keeps every particle. Add the two boxes.",
      explain: `${s} + ${w} = ${s + w}. Every particle is still there, which is why the weight adds up too.`,
    },
    nums(s + w, [s, w, s + w - 1, s + w + 1], 40),
  );
}

/* ================================================== world C: material detectives */

const PROPS: { name: string; test: string }[] = [
  { name: "hardness", test: "Try to scratch it with a steel nail." },
  { name: "reflectivity", test: "Shine a flashlight on it and see if the light bounces back." },
  { name: "electrical conductivity", test: "Put it in a circuit with a battery and a bulb." },
  { name: "magnetism", test: "Hold a magnet near it." },
  { name: "solubility", test: "Stir it into water and see if it dissolves." },
  { name: "heat conductivity", test: "Put one end in hot water and feel the other end." },
  { name: "color", test: "Look at it in daylight." },
];

/** Which property does a test measure? */
export function whichTest(): Question {
  const p = pick(PROPS);
  const wrong = some(
    PROPS.filter((x) => x !== p),
    3,
  );
  if (Math.random() < 0.5)
    return ask(
      {
        key: `test-prop-${p.name}-${wrong.map((w) => w.name).join("|")}`,
        prompt: `Flare's test: "${p.test}" Which property is Flare testing?`,
        hint: "What would the result tell you about the material?",
        explain: `${cap(p.name)}. ${p.test}`,
      },
      choose(p.name, wrong.map((w) => w.name), 4),
    );
  return ask(
    {
      key: `test-how-${p.name}-${wrong.map((w) => w.name).join("|")}`,
      prompt: `How could Flare test a material's ${p.name}?`,
      hint: `What does ${p.name} mean? Which test shows it?`,
      explain: p.test,
    },
    choose(p.test, wrong.map((w) => w.test), 4),
  );
}

interface Obj {
  e: string;
  name: string;
}
const CONDUCT: Obj[] = [
  { e: "🔌", name: "copper wire" },
  { e: "📎", name: "steel paper clip" },
  { e: "🥄", name: "metal spoon" },
  { e: "🔩", name: "iron nail" },
  { e: "✏️", name: "pencil lead (graphite)" },
  { e: "🪙", name: "coin" },
  { e: "🔑", name: "brass key" },
];
const INSULATE: Obj[] = [
  { e: "🥤", name: "plastic straw" },
  { e: "🎈", name: "rubber balloon" },
  { e: "🪵", name: "wooden stick" },
  { e: "🫙", name: "glass jar" },
  { e: "📄", name: "paper strip" },
  { e: "🧶", name: "wool string" },
  { e: "🧽", name: "dry sponge" },
];

const objCard = (o: Obj): Visual => ({ kind: "chem-materials", mode: "objects", items: [{ emoji: o.e, label: cap(o.name) }] });

/** Conductors and insulators. */
export function conductors(): Question {
  if (Math.random() < 0.6) {
    const yes = Math.random() < 0.5;
    const o = pick(yes ? CONDUCT : INSULATE);
    return ask(
      {
        key: `cond-${o.name}`,
        prompt: `Flare puts the ${o.name} in a circuit with a battery and a bulb. Will the bulb light?`,
        visual: objCard(o),
        hint: "Metals (and graphite) let electricity flow. Plastic, rubber, wood, glass and paper don't.",
        explain: yes ? `Yes. The ${o.name} is an electrical conductor.` : `No. The ${o.name} is an insulator: electricity can't flow through it.`,
      },
      choose(yes ? "Yes, it lights" : "No, it stays dark", [yes ? "No, it stays dark" : "Yes, it lights"], 2),
    );
  }
  const o = pick(CONDUCT);
  const no = some(INSULATE, 2);
  return ask(
    {
      key: `cond-which-${o.name}-${no.map((x) => x.name).join("|")}`,
      prompt: "Which one would make a bulb light up in a circuit?",
      hint: "Look for a metal, or graphite.",
      explain: `The ${o.name}. It conducts electricity; the others are insulators.`,
    },
    choose(`${o.e} ${o.name}`, no.map((x) => `${x.e} ${x.name}`)),
  );
}

/** Do it: sort conductors and insulators. */
export function sortConductors(): Question {
  const n = rand(3, 4);
  const items = shuffle([...some(CONDUCT, n).map((o) => ({ label: `${o.e} ${o.name}`, bin: 0 })), ...some(INSULATE, 7 - n).map((o) => ({ label: `${o.e} ${o.name}`, bin: 1 }))]);
  const bins = ["Conductor (bulb lights)", "Insulator (bulb stays dark)"];
  return sortQ(
    { key: `sortcond-${items.map((i) => i.label).join("")}`, prompt: "Sort them: conductor or insulator?", hint: "Is it a metal or graphite? Then electricity can flow through it.", explain: sortExplain(["Conductors", "Insulators"], items) },
    bins,
    items,
  );
}

const MAGNETIC: Obj[] = [
  { e: "🔩", name: "iron nail" },
  { e: "📎", name: "steel paper clip" },
  { e: "🥫", name: "steel food can" },
  { e: "🧷", name: "steel safety pin" },
];
const NONMAG_METAL: Obj[] = [
  { e: "🥤", name: "aluminum soda can" },
  { e: "🔌", name: "copper wire" },
  { e: "💍", name: "gold ring" },
  { e: "🥄", name: "silver spoon" },
  { e: "🔑", name: "brass key" },
];

/** Magnetism: only some metals. */
export function magneticMetals(): Question {
  const r = rand(0, 3);
  if (r === 0) {
    const yes = Math.random() < 0.5;
    const o = pick(yes ? MAGNETIC : NONMAG_METAL);
    return ask(
      {
        key: `magm-${o.name}`,
        prompt: `Is the ${o.name} attracted to a magnet?`,
        visual: objCard(o),
        hint: "Iron and steel (which is mostly iron) are magnetic. Most other metals are not.",
        explain: yes ? `Yes. It contains iron, so a magnet pulls it.` : `No. It's a metal, but not iron or steel, so a magnet doesn't pull it.`,
      },
      choose(yes ? "Yes" : "No", [yes ? "No" : "Yes"], 2),
    );
  }
  if (r === 1) {
    const o = pick(MAGNETIC);
    const no = some(NONMAG_METAL, 2);
    return ask(
      {
        key: `magm-which-${o.name}-${no.map((x) => x.name).join("|")}`,
        prompt: "All three are metal. Which one will a magnet pick up?",
        hint: "Look for iron or steel.",
        explain: `The ${o.name}. Iron and steel are magnetic; aluminum, copper, gold, silver and brass are not.`,
      },
      choose(`${o.e} ${o.name}`, no.map((x) => `${x.e} ${x.name}`)),
    );
  }
  if (r === 2)
    return ask(
      {
        key: `magm-recycle-${rand(0, 2)}`,
        prompt: "A recycling plant runs a big magnet over a pile of cans and bottles. What does the magnet pull out?",
        hint: "Which of these is made of steel?",
        explain: "Steel cans. Aluminum cans and glass bottles aren't magnetic, so they stay behind. That's how the plant separates them.",
      },
      choose("Steel cans", ["Aluminum cans", "Glass bottles", "Plastic bottles"], 4),
    );
  const o = pick(NONMAG_METAL);
  return ask(
    {
      key: `magm-claim-${o.name}`,
      prompt: `Max says: "The ${o.name} is metal, so a magnet will pick it up." Is Max right?`,
      visual: objCard(o),
      hint: "Do all metals stick to magnets?",
      explain: `No. Only some metals, like iron and steel, are magnetic. The ${o.name} isn't.`,
    },
    choose("No, not all metals are magnetic", ["Yes, all metals are magnetic", "Yes, everything is magnetic"]),
  );
}

const DISSOLVES: Obj[] = [
  { e: "🧂", name: "salt" },
  { e: "🍬", name: "sugar" },
  { e: "🧃", name: "drink powder" },
  { e: "☕", name: "instant coffee" },
  { e: "🧁", name: "baking soda" },
];
const NO_DISSOLVE: Obj[] = [
  { e: "🏖️", name: "sand" },
  { e: "🌶️", name: "ground pepper" },
  { e: "🖍️", name: "chalk dust" },
  { e: "🍚", name: "rice" },
  { e: "🫒", name: "cooking oil" },
  { e: "🔮", name: "glass marbles" },
];

/** Solubility: does it dissolve? */
export function solubility(): Question {
  const r = rand(0, 2);
  if (r === 0) {
    const yes = Math.random() < 0.5;
    const o = pick(yes ? DISSOLVES : NO_DISSOLVE);
    return ask(
      {
        key: `sol-${o.name}`,
        prompt: `Flare stirs ${o.name} into warm water. Does it dissolve?`,
        visual: objCard(o),
        hint: "If it dissolves, it seems to disappear and the water looks clear. If not, you can still see it.",
        explain: yes ? `Yes. The ${o.name} breaks into particles too small to see and spreads through the water.` : `No. You can still see the ${o.name}${o.name === "cooking oil" ? " floating on top" : " in the water"}.`,
      },
      choose(yes ? "Yes, it dissolves" : "No, you can still see it", [yes ? "No, you can still see it" : "Yes, it dissolves"], 2),
    );
  }
  if (r === 1) {
    const o = pick(DISSOLVES);
    const no = some(NO_DISSOLVE, 2);
    return ask(
      {
        key: `sol-which-${o.name}-${no.map((x) => x.name).join("|")}`,
        prompt: "Which one dissolves in water?",
        hint: "Which one disappears when you stir it in?",
        explain: `The ${o.name} dissolves. The others don't.`,
      },
      choose(`${o.e} ${o.name}`, no.map((x) => `${x.e} ${x.name}`)),
    );
  }
  const o = pick(DISSOLVES.slice(0, 2));
  return ask(
    {
      key: `sol-prove-${o.name}`,
      prompt: `How could Flare prove the ${o.name} is still in the water after it dissolves?`,
      hint: "How could you get the dissolved stuff back?",
      explain: `Let the water evaporate. The ${o.name} is left behind in the dish.`,
    },
    choose("Let the water evaporate and look for it", ["Stir it harder", "Shine a light on it", "Put it in the freezer for a minute"], 4),
  );
}

/** Do it: sort what dissolves. */
export function sortSolubility(): Question {
  const n = rand(2, 4);
  const items = shuffle([...some(DISSOLVES, n).map((o) => ({ label: `${o.e} ${o.name}`, bin: 0 })), ...some(NO_DISSOLVE, 6 - n).map((o) => ({ label: `${o.e} ${o.name}`, bin: 1 }))]);
  const bins = ["Dissolves", "Doesn't dissolve"];
  return sortQ(
    { key: `sortsol-${items.map((i) => i.label).join("")}`, prompt: "Sort them: dissolves in water, or not?", hint: "Picture stirring each one into water. Does it vanish?", explain: sortExplain(bins, items) },
    bins,
    items,
  );
}

/** Mohs-style hardness, well separated. */
const HARDNESS: { name: string; h: number }[] = [
  { name: "talc", h: 1 },
  { name: "fingernail", h: 2.5 },
  { name: "copper", h: 3 },
  { name: "glass", h: 5.5 },
  { name: "quartz", h: 7 },
  { name: "diamond", h: 10 },
];

/** Scratch facts between neighbours: "glass scratches copper". */
const scratchRows = (xs: { name: string }[]) => shuffle(xs.slice(1).map((x, i) => [`${cap(x.name)} scratches ${xs[i].name}`]));

/** Hardness from scratch tests. */
export function hardness(): Question {
  const three = some(HARDNESS, 3).sort((a, b) => a.h - b.h);
  const rows = scratchRows(three);
  const visual: Visual = { kind: "table", header: ["Scratch test results"], rows };
  const key = three.map((x) => x.name).join("-");
  const r = rand(0, 2);
  if (r < 2) {
    const hard = r === 0;
    const ans = hard ? three[2] : three[0];
    return ask(
      {
        key: `hard-${hard}-${key}-${rows.map((x) => x[0]).join("")}`,
        prompt: `Flare did scratch tests. Which material is the ${hard ? "hardest" : "softest"}?`,
        visual,
        needsVisual: true,
        hint: "A harder material scratches a softer one. Follow the chain.",
        explain: `${cap(ans.name)}. ${cap(three[2].name)} scratches ${three[1].name}, and ${three[1].name} scratches ${three[0].name}.`,
      },
      choose(cap(ans.name), three.filter((x) => x !== ans).map((x) => cap(x.name))),
    );
  }
  return ask(
    {
      key: `hard-can-${key}-${rows.map((x) => x[0]).join("")}`,
      prompt: `Can ${three[0].name} scratch ${three[2].name}?`,
      visual,
      needsVisual: true,
      hint: "Only a harder material can scratch a softer one.",
      explain: `No. ${cap(three[2].name)} is harder than ${three[1].name}, which is harder than ${three[0].name}. A softer material can't scratch a harder one.`,
    },
    choose("No", ["Yes", "Only if you press hard"]),
  );
}

/** Do it: order materials by hardness from scratch tests. */
export function orderHardness(): Question {
  const four = some(HARDNESS, 4).sort((a, b) => a.h - b.h);
  const rows = scratchRows(four);
  return ask(
    {
      key: `ordhard-${four.map((x) => x.name).join("-")}-${rows.map((x) => x[0]).join("")}`,
      prompt: "Use the scratch tests to put the materials in order, softest first.",
      visual: { kind: "table", header: ["Scratch test results"], rows },
      needsVisual: true,
      hint: "Find the one that scratches nothing on the list: it's the softest. Then find what scratches it.",
      explain: `${four.map((x) => cap(x.name)).join(" < ")}. Each one scratches the one before it.`,
    },
    doIt({ kind: "order", items: four.map((x) => cap(x.name)), direction: "softest to hardest" }, 4),
  );
}

/** Real data: colour, magnetic, conducts electricity, dissolves in water. */
const MYSTERY: { name: string; colour: string; mag: boolean; cond: boolean; diss: boolean }[] = [
  { name: "Iron", colour: "gray", mag: true, cond: true, diss: false },
  { name: "Copper", colour: "orange", mag: false, cond: true, diss: false },
  { name: "Aluminum", colour: "silver", mag: false, cond: true, diss: false },
  { name: "Graphite", colour: "black", mag: false, cond: true, diss: false },
  { name: "Salt", colour: "white", mag: false, cond: false, diss: true },
  { name: "Wax", colour: "white", mag: false, cond: false, diss: false },
  { name: "Sand", colour: "tan", mag: false, cond: false, diss: false },
  { name: "Glass", colour: "clear", mag: false, cond: false, diss: false },
];
type Col = "mag" | "cond" | "diss" | "colour";
const yn = (b: boolean) => (b ? "yes" : "no");
const CLUE: Record<Col, (m: (typeof MYSTERY)[number]) => string> = {
  mag: (m) => (m.mag ? "it is magnetic" : "it is not magnetic"),
  cond: (m) => (m.cond ? "it conducts electricity" : "it does not conduct electricity"),
  diss: (m) => (m.diss ? "it dissolves in water" : "it does not dissolve in water"),
  colour: (m) => `it is ${m.colour}`,
};

/** Identify a mystery material from a table of properties. */
export function mysteryMaterial(): Question {
  // One material from each group with the same test results, so the tests can always tell them apart.
  const profile = (m: (typeof MYSTERY)[number]) => `${m.mag}${m.cond}${m.diss}`;
  const groups = [...new Set(MYSTERY.map(profile))].map((pr) => MYSTERY.filter((m) => profile(m) === pr));
  const rows = shuffle(groups.map((g) => pick(g)));
  const target = pick(rows);
  const cols: Col[] = ["mag", "cond", "diss"];
  const same = (subset: Col[]) => rows.filter((r) => subset.every((c) => r[c] === target[c]));
  const subsets: Col[][] = [...cols.map((c) => [c]), [cols[0], cols[1]], [cols[0], cols[2]], [cols[1], cols[2]], cols];
  const clue = shuffle(subsets.filter((s) => s.length <= 2)).find((s) => same(s).length === 1) ?? cols;
  const words = clue.map((c) => CLUE[c](target));
  return ask(
    {
      key: `myst-${rows.map((r) => r.name).join("")}-${target.name}-${clue.join("")}`,
      prompt: `Mystery material: ${list(words)}. Which is it? (🧲 magnetic, 💡 conducts electricity, 💧 dissolves in water)`,
      speech: `Mystery material: ${list(words)}. Which material is it?`,
      visual: { kind: "table", header: ["Material", "🧲", "💡", "💧"], rows: rows.map((m) => [m.name, yn(m.mag), yn(m.cond), yn(m.diss)]) },
      needsVisual: true,
      hint: "Check each clue against the table. Cross out materials that don't match.",
      explain: `${target.name} is the only one where ${list(words)}.`,
    },
    choose(target.name, rows.filter((r) => r !== target).map((r) => r.name), 4),
  );
}

const USES: { s: string; why: string }[] = [
  { s: "Electric wires are made of copper.", why: "Copper conducts electricity well." },
  { s: "Wires are wrapped in plastic.", why: "Plastic is an insulator, so it keeps you from getting a shock." },
  { s: "Cooking pots are made of metal.", why: "Metal conducts heat to the food." },
  { s: "Pot handles are made of wood or plastic.", why: "They don't conduct heat well, so they stay cool to hold." },
  { s: "Safety vests have shiny strips.", why: "Shiny strips reflect light, so drivers can see you." },
  { s: "Some drill tips are coated with diamond.", why: "Diamond is the hardest material, so it can cut through rock." },
  { s: "Recycling plants use magnets to sort cans.", why: "Steel cans are magnetic and aluminum cans are not." },
  { s: "We stir sugar into lemonade, not sand.", why: "Sugar dissolves in water and sand doesn't." },
  { s: "Mirrors have a thin layer of aluminum or silver.", why: "These metals reflect light very well." },
];

/** The right property for the job. */
export function propertyUses(): Question {
  const i = rand(0, USES.length - 1);
  const u = USES[i];
  const wrong = some(
    USES.filter((_, j) => j !== i).map((x) => x.why),
    3,
  );
  return ask(
    { key: `uses-${i}-${wrong.map((w) => USES.findIndex((x) => x.why === w)).join("-")}`, prompt: `${u.s} Why?`, hint: "Which property matters for this job?", explain: u.why },
    choose(u.why, wrong, 4),
  );
}

/** An ice cube melting on plates: which conducts heat best? */
export function iceTest(): Question {
  const data: [string, number, number][] = [
    ["metal", 2, 4],
    ["glass", 6, 8],
    ["plastic", 10, 12],
    ["wood", 14, 18],
  ];
  const even = (lo: number, hi: number) => 2 * rand(lo / 2, hi / 2);
  const items = shuffle(data.map(([label, lo, hi]) => ({ label, value: even(lo, hi) })));
  const visual: Visual = { kind: "bars", title: "Minutes for an ice cube to melt on each plate", items, max: 20, step: 2 };
  const key = items.map((i) => `${i.label}${i.value}`).join("");
  const metal = items.find((i) => i.label === "metal")!;
  const wood = items.find((i) => i.label === "wood")!;
  const r = rand(0, 2);
  if (r === 0)
    return ask(
      {
        key: `ice-best-${key}`,
        prompt: "Which plate conducts heat into the ice best?",
        visual,
        needsVisual: true,
        hint: "Heat from the room flows through the plate into the ice. The best conductor melts it fastest: find the shortest bar.",
        explain: `Metal: the ice melted in just ${metal.value} minutes.`,
      },
      choose("metal", ["glass", "plastic", "wood"], 4),
    );
  if (r === 1)
    return ask(
      {
        key: `ice-handle-${key}`,
        prompt: "Which material would make the best pot handle, staying cool to hold?",
        visual,
        needsVisual: true,
        hint: "A handle should be a poor heat conductor. Which plate melted the ice slowest?",
        explain: `Wood: it took ${wood.value} minutes, so it conducts heat the worst. That keeps a handle cool.`,
      },
      choose("wood", ["metal", "glass", "plastic"], 4),
    );
  const d = wood.value - metal.value;
  return ask(
    {
      key: `ice-diff-${key}`,
      prompt: "How many minutes longer did the ice take on wood than on metal?",
      visual,
      needsVisual: true,
      hint: "Read both bars, then subtract.",
      explain: `${wood.value} − ${metal.value} = ${d} minutes.`,
    },
    typed(d),
  );
}

/* ========================================================== world D: mix it up */

const SITUATIONS: { s: string; e: string; isNew: boolean; why: string }[] = [
  { s: "Baking soda and vinegar fizz", e: "🫧", isNew: true, why: "The bubbles are a new gas, carbon dioxide." },
  { s: "Milk and vinegar make lumpy curds", e: "🥛", isNew: true, why: "The curds are a new solid." },
  { s: "An iron nail rusts in damp air", e: "🔩", isNew: true, why: "Rust is a new, flaky orange substance." },
  { s: "Wood burns to ash", e: "🪵", isNew: true, why: "Ash, smoke and gases are new substances." },
  { s: "Cake batter bakes into cake", e: "🎂", isNew: true, why: "Baking makes new substances; it can't turn back into batter." },
  { s: "Yeast and hydrogen peroxide foam and get warm", e: "🧪", isNew: true, why: "The foam is full of a new gas, oxygen, and it gives off heat." },
  { s: "Purple cabbage juice turns pink with vinegar", e: "🥬", isNew: true, why: "The color change shows a new substance formed." },
  { s: "Sand is stirred into water", e: "🏖️", isNew: false, why: "The sand is still sand; it settles to the bottom." },
  { s: "Salt dissolves in water", e: "🧂", isNew: false, why: "It's still salt and water; evaporate the water and the salt is back." },
  { s: "Nuts and raisins make trail mix", e: "🥜", isNew: false, why: "You can pick the nuts and raisins apart again." },
  { s: "Oil and water are shaken together", e: "🫒", isNew: false, why: "They separate into layers again." },
  { s: "Iron filings are mixed with sand", e: "🧲", isNew: false, why: "A magnet can pull the iron back out." },
  { s: "Sugar is stirred into tea", e: "🍵", isNew: false, why: "It's still sugar and tea; nothing new forms." },
];
const NEW = "A new substance";
const MIX = "Just a mixture";

/** New substance, or just a mixture? */
export function mixtureOrNew(): Question {
  if (Math.random() < 0.4) {
    const findNew = Math.random() < 0.5;
    const odd = pick(SITUATIONS.filter((x) => x.isNew === findNew));
    const rest = some(
      SITUATIONS.filter((x) => x.isNew !== findNew),
      2,
    );
    return ask(
      {
        key: `mon-which-${findNew}-${odd.s}-${rest.map((x) => x.s).join("|")}`,
        prompt: findNew ? "Which one makes a new substance?" : "Which one is just a mixture?",
        hint: "Signs of a new substance: gas bubbles, a new solid, a color change, heat or light.",
        explain: `${odd.s}. ${odd.why}`,
      },
      choose(`${odd.e} ${odd.s}`, rest.map((x) => `${x.e} ${x.s}`)),
    );
  }
  const i = rand(0, SITUATIONS.length - 1);
  const x = SITUATIONS[i];
  return ask(
    {
      key: `mon-${i}`,
      prompt: `${x.e} ${x.s}. New substance, or just a mixture?`,
      hint: "Signs of a new substance: gas bubbles, a new solid, a color change, heat or light. A mixture can be separated again.",
      explain: `${x.isNew ? NEW : MIX}. ${x.why}`,
    },
    choose(x.isNew ? NEW : MIX, [x.isNew ? MIX : NEW], 2),
  );
}

const SIGNS = ["Gas bubbles formed", "A new solid appeared", "The color changed", "It got warmer"] as const;

/** Signs of a new substance in before/after pictures. */
export function signsOfChange(): Question {
  const sign = rand(0, 3);
  const cols: Colour[] = ["wave", "sun", "grape", "leaf", "rose", "teal"];
  const [c1, c2] = some(cols, 2);
  const t = 5 * rand(3, 5);
  const t2 = t + 5 * rand(2, 5);
  const before = { glass: "beaker" as const, volume: 150, max: 250, colour: c1, thermometer: t, label: "Before" };
  const after = {
    ...before,
    label: "After",
    ...(sign === 0 ? { bubbles: true } : sign === 1 ? { precipitate: pick(["sun", "leaf", "cocoa"] as Colour[]) } : sign === 2 ? { colour: c2 } : { thermometer: t2 }),
  };
  return ask(
    {
      key: `signs-${sign}-${c1}-${c2}-${t}-${t2}`,
      prompt: "Flare mixed two liquids. What sign shows a new substance formed?",
      visual: { kind: "chem-beaker", panels: [before, after] },
      needsVisual: true,
      hint: "Compare the two beakers carefully: bubbles, solids, color and the thermometer.",
      explain: `${SIGNS[sign]}. ${["New gas makes bubbles.", "A solid forming in a liquid is a new substance.", "A new color means a new substance.", "Giving off heat is a sign of a reaction."][sign]}`,
    },
    choose(SIGNS[sign], SIGNS.filter((_, i) => i !== sign), 4),
  );
}

/** Do it: sort mixtures and new substances. */
export function sortMixNew(): Question {
  const n = rand(2, 4);
  const items = shuffle([
    ...some(
      SITUATIONS.filter((x) => x.isNew),
      n,
    ).map((x) => ({ label: `${x.e} ${x.s}`, bin: 0 })),
    ...some(
      SITUATIONS.filter((x) => !x.isNew),
      6 - n,
    ).map((x) => ({ label: `${x.e} ${x.s}`, bin: 1 })),
  ]);
  const bins = ["New substance", "Just a mixture"];
  return sortQ(
    { key: `sortmix-${items.map((i) => i.label).join("")}`, prompt: "Sort them: new substance, or just a mixture?", hint: "Look for bubbles, new solids, color changes, heat or burning. Those mean something new.", explain: sortExplain(bins, items) },
    bins,
    items,
  );
}

const METHOD = {
  filter: "Pour it through filter paper",
  evap: "Let the water evaporate",
  magnet: "Use a magnet",
  sieve: "Shake it through a sieve",
  settle: "Let it settle, then pour off the top layer",
  stir: "Stir it faster",
} as const;
type Method = keyof typeof METHOD;

const SEPARATE: { mix: string; e: string; how: Method; wrong: Method[]; why: string }[] = [
  { mix: "sand and water", e: "🏖️", how: "filter", wrong: ["magnet", "stir"], why: "The water goes through the paper, but the sand grains are too big and stay behind." },
  { mix: "salt and water", e: "🧂", how: "evap", wrong: ["filter", "magnet", "sieve", "stir"], why: "The salt is dissolved, so it goes through a filter. When the water evaporates, the salt is left." },
  { mix: "iron filings and sand", e: "🧲", how: "magnet", wrong: ["filter", "evap", "stir"], why: "Iron is magnetic and sand isn't." },
  { mix: "dried beans and rice", e: "🫘", how: "sieve", wrong: ["magnet", "evap", "stir"], why: "The small rice falls through the holes; the big beans stay in the sieve." },
  { mix: "paper clips and rice", e: "📎", how: "magnet", wrong: ["evap", "filter", "stir"], why: "Steel paper clips are magnetic; rice isn't." },
  { mix: "oil and water", e: "🫒", how: "settle", wrong: ["magnet", "sieve", "stir"], why: "Oil floats on water in a separate layer." },
  { mix: "sugar and water", e: "🍬", how: "evap", wrong: ["filter", "magnet", "sieve"], why: "The sugar is dissolved. When the water evaporates, the sugar is left." },
  { mix: "pebbles and sand", e: "🪨", how: "sieve", wrong: ["magnet", "evap", "stir"], why: "Sand falls through the holes; pebbles are too big." },
];

/** How to separate a mixture. */
export function separateMixtures(): Question {
  const i = rand(0, SEPARATE.length - 1);
  const s = SEPARATE[i];
  const wrong = some(s.wrong, 2);
  return ask(
    {
      key: `sep-${i}-${wrong.join("")}`,
      prompt: `${s.e} How can Flare separate ${s.mix}?`,
      hint: "Use a property that's different: size, magnetism, dissolving, or floating.",
      explain: `${METHOD[s.how]}. ${s.why}`,
    },
    choose(METHOD[s.how], wrong.map((w) => METHOD[w])),
  );
}

/** Evaporating salt water. */
export function evaporateSalt(): Question {
  const salt = rand(5, 40);
  const r = rand(0, 3);
  const visual: Visual = {
    kind: "chem-beaker",
    panels: [
      { glass: "beaker", volume: 200, max: 250, label: "Salt water" },
      { glass: "beaker", volume: 0, max: 250, precipitate: true, label: "After a week in the sun" },
    ],
  };
  if (r === 0)
    return ask(
      {
        key: `evs-amount-${salt}`,
        prompt: `Flare dissolves ${salt} g of salt in water, then lets all the water evaporate. How much salt is left?`,
        visual,
        hint: "Only the water leaves. Does the salt go anywhere?",
        explain: `${salt} g. The salt was in the water all along; evaporating takes away only the water.`,
      },
      typed(salt),
    );
  if (r === 1)
    return ask(
      {
        key: `evs-what-${salt}`,
        prompt: "What is the white solid left in the beaker?",
        visual,
        hint: "What was dissolved in the water?",
        explain: "Salt. The water evaporated into the air and left the dissolved salt behind.",
      },
      choose("Salt", ["Ice", "Sand", "Sugar"], 4),
    );
  if (r === 2)
    return ask(
      {
        key: `evs-where-${salt}`,
        prompt: "Where did the water go?",
        visual,
        hint: "Puddles dry up the same way.",
        explain: "Into the air, as water vapor. The water particles are still out there, just spread out as a gas.",
      },
      choose("Into the air as water vapor", ["Into the salt", "It was destroyed", "Through the glass"], 4),
    );
  return ask(
    {
      key: `evs-new-${salt}`,
      prompt: "Did salt water make a new substance?",
      visual,
      hint: "Did you get back what you started with?",
      explain: "No. Salt water is a mixture. Evaporating the water gives back the same salt.",
    },
    choose("No, it's a mixture of salt and water", ["Yes, the salt is new", "Yes, the water is new"]),
  );
}

const RECIPES: { thing: string; a: { name: string; colour?: Colour; formula?: string }; b: { name: string; colour?: Colour; formula?: string }; ratio: [number, number] }[] = [
  { thing: "lemonade", a: { name: "lemon juice", colour: "sun" }, b: { name: "water", formula: "H₂O" }, ratio: [1, 4] },
  { thing: "orange squash", a: { name: "orange syrup", colour: "tangerine" }, b: { name: "water", formula: "H₂O" }, ratio: [1, 3] },
  { thing: "green paint", a: { name: "blue paint", colour: "wave" }, b: { name: "yellow paint", colour: "sun" }, ratio: [1, 2] },
  { thing: "trail mix", a: { name: "nuts", colour: "cocoa" }, b: { name: "raisins", colour: "grape" }, ratio: [3, 2] },
  { thing: "salt water", a: { name: "salt", colour: "grape" }, b: { name: "water", formula: "H₂O" }, ratio: [1, 5] },
];

/** Do it: make a mixture to a recipe. */
export function mixRecipe(): Question {
  const rc = pick(RECIPES);
  const [a, b] = rc.ratio;
  const kmax = Math.floor(12 / Math.max(a, b));
  const k = rand(1, kmax);
  const total = (a + b) * k;
  return ask(
    {
      key: `recipe-${rc.thing}-${k}`,
      prompt: `Make ${total} scoops of ${rc.thing}: ${a} ${rc.a.name} for every ${b} ${rc.b.name}.`,
      hint: `One batch is ${a} + ${b} = ${a + b} scoops. How many batches make ${total}?`,
      explain: `${total} ÷ ${a + b} = ${k} batches: ${a * k} ${rc.a.name} and ${b * k} ${rc.b.name}. It's a mixture, so the parts could be separated again.`,
    },
    doIt({ kind: "chem-mix", mode: "mixture", species: [rc.a, rc.b], target: { counts: [a * k, b * k] } }, total),
  );
}

const PARTICLE_RXNS: { r: [string, string, number, number]; p: [string, string, number]; name: string }[] = [
  { r: ["H₂", "hydrogen", 2, 1], p: ["H₂O", "water", 2], name: "hydrogen and oxygen" },
  { r: ["N₂", "nitrogen", 1, 3], p: ["NH₃", "ammonia", 2], name: "nitrogen and hydrogen" },
  { r: ["H₂", "hydrogen", 1, 1], p: ["HCl", "hydrogen chloride", 2], name: "hydrogen and chlorine" },
];

/** Particle pictures: did a new substance form? */
export function newParticles(): Question {
  const react = Math.random() < 0.6;
  const k = rand(1, 3);
  if (react) {
    const x = pick(PARTICLE_RXNS);
    const second = x.p[0] === "H₂O" ? ["O₂", "oxygen"] : x.p[0] === "NH₃" ? ["H₂", "hydrogen"] : ["Cl₂", "chlorine"];
    const visual: Visual = {
      kind: "chem-particles",
      panels: [
        { species: [{ formula: x.r[0], count: x.r[2] * k, name: x.r[1] }, { formula: second[0], count: x.r[3] * k, name: second[1] }], label: "Before" },
        { species: [{ formula: x.p[0], count: x.p[2] * k, name: x.p[1] }], label: "After" },
      ],
    };
    if (Math.random() < 0.5)
      return ask(
        {
          key: `np-yes-${x.p[0]}-${k}`,
          prompt: `In a lab, ${x.name} react. Did a new substance form?`,
          visual,
          needsVisual: true,
          hint: "Compare the particles in each box. Is there a new kind?",
          explain: `Yes. The atoms rearranged into a new kind of particle: ${x.p[1]}.`,
        },
        choose("Yes, a new kind of particle", ["No, the same particles", "No, the particles were destroyed"]),
      );
    return ask(
      {
        key: `np-count-${x.p[0]}-${k}`,
        prompt: `How many ${x.p[1]} particles formed?`,
        visual,
        needsVisual: true,
        hint: "Count the particles in the After box.",
        explain: `${x.p[2] * k}. The atoms from the Before box joined up in a new way.`,
      },
      nums(x.p[2] * k, [x.r[2] * k + x.r[3] * k, x.r[2] * k, x.p[2] * k + 1], 20),
    );
  }
  const n = 4 * k;
  return ask(
    {
      key: `np-mix-${k}`,
      prompt: "Flare lets nitrogen and oxygen mix. Did a new substance form?",
      visual: {
        kind: "chem-particles",
        panels: [
          { species: [{ formula: "N₂", count: n, name: "nitrogen" }], label: "Nitrogen" },
          { species: [{ formula: "N₂", count: n, name: "nitrogen" }, { formula: "O₂", count: k, name: "oxygen" }], label: "Mixed" },
        ],
        joinerLabel: `add ${k} oxygen`,
      },
      needsVisual: true,
      hint: "Are there any new kinds of particle after mixing?",
      explain: "No. The same nitrogen and oxygen particles are just mixed together. That's what air is.",
    },
    choose("No, it's just a mixture", ["Yes, a new kind of particle", "Yes, the oxygen turned into nitrogen"]),
  );
}

const WORD_RXNS: { reactants: string[]; products: string[]; above?: string; story: string }[] = [
  { reactants: ["baking soda", "vinegar"], products: ["carbon dioxide", "water", "sodium acetate"], story: "Baking soda and vinegar fizz." },
  { reactants: ["iron", "oxygen", "water"], products: ["rust"], story: "A bike left in the rain gets rusty." },
  { reactants: ["wood", "oxygen"], products: ["ash", "carbon dioxide", "water"], above: "fire", story: "Wood burns in a campfire." },
  { reactants: ["candle wax", "oxygen"], products: ["carbon dioxide", "water"], above: "flame", story: "A candle burns." },
  { reactants: ["milk", "vinegar"], products: ["curds", "whey"], story: "Vinegar makes milk lumpy." },
];
const SUBSTANCES_ALL = ["rust", "carbon dioxide", "water", "oxygen", "iron", "salt", "sand", "ash", "curds", "sugar"];

/** Word equations: what reacts, what forms. */
export function wordReactions(): Question {
  const i = rand(0, WORD_RXNS.length - 1);
  const x = WORD_RXNS[i];
  const side = Math.random() < 0.5 ? "products" : "reactants";
  const j = rand(0, x[side].length - 1);
  const missing = x[side][j];
  const term = (t: string, k: number, s: string): ReactionTerm => ({ text: s === side && k === j ? "?" : t });
  const visual: Visual = {
    kind: "chem-reaction",
    words: true,
    reactants: x.reactants.map((t, k) => term(t, k, "reactants")),
    products: x.products.map((t, k) => term(t, k, "products")),
    above: x.above,
  };
  const wrong = SUBSTANCES_ALL.filter((s) => !x.reactants.includes(s) && !x.products.includes(s));
  return ask(
    {
      key: `word-${i}-${side}-${j}`,
      prompt: `${x.story} What is missing from the word equation?`,
      visual,
      needsVisual: true,
      hint: side === "products" ? "What new substance is made?" : "What must be there for this change to happen?",
      explain: `${cap(x.reactants.join(" + "))} → ${x.products.join(" + ")}. ${side === "products" ? `${cap(missing)} is a new substance.` : `${cap(missing)} is needed for the reaction.`}`,
    },
    choose(missing, some(wrong, 3), 4),
  );
}

/** Do it: measure liquid for an experiment. */
export function measureLiquid(): Question {
  const opts = [
    { glass: "cylinder" as const, max: 50, step: 1, lo: 5, hi: 48 },
    { glass: "cylinder" as const, max: 100, step: 2, lo: 10, hi: 96 },
    { glass: "beaker" as const, max: 250, step: 25, lo: 1, hi: 9 },
    { glass: "cylinder" as const, max: 100, step: 5, lo: 2, hi: 19 },
  ];
  const o = pick(opts);
  const target = o.glass === "beaker" || o.step === 5 ? o.step * rand(o.lo, o.hi) : o.step * rand(Math.ceil(o.lo / o.step), Math.floor(o.hi / o.step));
  const what = pick([
    { name: "vinegar", colour: "clear" as const },
    { name: "milk", colour: "sun" as const },
    { name: "cabbage juice", colour: "grape" as const },
    { name: "water", colour: "wave" as const },
  ]);
  return ask(
    {
      key: `meas-${o.glass}-${o.max}-${o.step}-${target}-${what.name}`,
      prompt: `For the mixing test, measure ${target} mL of ${what.name}.`,
      hint: `Each small mark is ${o.step} mL. Read the level at the bottom of the curve.`,
      explain: `Fill to the ${target} mL mark. A fair test uses the same amount every time.`,
    },
    doIt({ kind: "chem-measure", mode: "fill", glass: o.glass, target, max: o.max, step: o.step, colour: what.colour === "clear" ? "clear" : what.colour }, target),
  );
}

const NOTEBOOK: { test: string; saw: string; signs: string[]; isNew: boolean }[] = [
  { test: "Baking soda + vinegar", saw: "fizz, cold", signs: ["gas bubbles", "it got colder"], isNew: true },
  { test: "Milk + vinegar", saw: "lumps", signs: ["a new solid (lumps)"], isNew: true },
  { test: "Cabbage + vinegar", saw: "turns pink", signs: ["a color change"], isNew: true },
  { test: "Yeast + peroxide", saw: "foam, warm", signs: ["gas bubbles", "it got warmer"], isNew: true },
  { test: "Salt + water", saw: "nothing", signs: [], isNew: false },
  { test: "Sand + water", saw: "nothing", signs: [], isNew: false },
  { test: "Sugar + water", saw: "nothing", signs: [], isNew: false },
  { test: "Oil + water", saw: "nothing", signs: [], isNew: false },
];

/** Read a lab notebook: which test made a new substance? */
export function labNotebook(): Question {
  const findNew = Math.random() < 0.6;
  const odd = pick(NOTEBOOK.filter((n) => n.isNew === findNew));
  const rest = some(
    NOTEBOOK.filter((n) => n.isNew !== findNew),
    rand(2, 3),
  );
  const rows = shuffle([odd, ...rest]);
  const signs = odd.signs;
  return ask(
    {
      key: `note-${findNew}-${rows.map((r) => r.test).join("|")}`,
      prompt: findNew ? "Which test made a new substance?" : "Which test made NO new substance?",
      visual: { kind: "table", header: ["Test", "What we saw"], rows: rows.map((r) => [r.test, r.saw]) },
      needsVisual: true,
      hint: "Look along each row for signs: bubbles, a new color, a new solid, or a temperature change.",
      explain: findNew ? `${odd.test}: ${list(signs)}. The others showed no signs, so they're just mixtures.` : `${odd.test}: no signs at all, so it's just a mixture. The others each showed a sign of a new substance.`,
    },
    choose(odd.test, rest.map((r) => r.test), 4),
  );
}
