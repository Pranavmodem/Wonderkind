/**
 * Question generators for chemistry, ages 5–8 (Kindergarten to Grade 2, NGSS 2-PS1): what things are made of
 * and how materials look and feel, picking the best material for a job, building new things from the same small
 * pieces, and heating and cooling changes that can or can't be undone. Worlds are assembled in ./ages5to8.ts.
 *
 * Young kids: big pictures, few words, lots of sorting. Speech never reads emoji (see `plain`).
 */
import { labelChoices, makeChoices, pick, rand, shuffle } from "../../questions";
import type { BlockDesign, Material } from "../../science/chemistryTypes";
import type { Activity, Question, Visual } from "../../types";

/* =================================================================== helpers */

const NONE: Visual = { kind: "none" };

/** Text for speech: emoji removed, spaces tidied. */
export const plain = (s: string) =>
  s
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/\s+([?.!,:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a log", "an egg". */
export const an = (noun: string) => (/^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`);

export type Ans = Pick<Question, "answer" | "input" | "choices" | "labels" | "activity">;

/** Text choices (shuffled), the correct one plus up to n − 1 wrong ones. */
export function choose(correct: string, wrong: string[], n = 3): Ans {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong), n);
  return { answer, input: "choices", choices, labels };
}

/** A hands-on activity; `answer` is its key number (e.g. how many things to sort). */
export const doIt = (activity: Activity, answer: number): Ans => ({ answer, input: "activity", activity });

export interface Spec {
  key: string;
  prompt: string;
  /** Defaults to the prompt without emoji. */
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  hint: string;
  explain: string;
}

export function ask(s: Spec, a: Ans): Question {
  const q: Question = { key: s.key, prompt: s.prompt, speech: s.speech ?? plain(s.prompt), visual: s.visual ?? NONE, hint: s.hint, explain: s.explain, ...a };
  if (s.needsVisual) q.needsVisual = true;
  return q;
}

/** A sorting activity. */
export function sortQ(s: Spec, bins: string[], items: { label: string; bin: number }[]): Question {
  return ask(s, doIt({ kind: "sort", bins, items }, items.length));
}

/** "a, b and c". */
export const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Take n random items. */
export const some = <T,>(xs: readonly T[], n: number) => shuffle(xs).slice(0, n);

/** Explain a sort: "Hard: 🪨 rock, 🧱 brick. Soft: 🧸 teddy bear." */
const sortExplain = (bins: string[], items: { label: string; bin: number }[]) =>
  bins.map((b, i) => `${b}: ${items.filter((it) => it.bin === i).map((it) => it.label).join(", ")}.`).join(" ");

/* ===================================================== world 1: materials */

interface Thing {
  e: string;
  name: string;
  mat?: Material;
  /** Other materials it could sensibly be made of (never offered as wrong answers). */
  also?: Material[];
  note?: string;
}

const T = (e: string, name: string, mat?: Material, also?: Material[], note?: string): Thing => ({ e, name, mat, also, note });

const MADE: Thing[] = [
  T("🥄", "spoon", "metal", ["plastic", "wood"]),
  T("🔑", "key", "metal"),
  T("📎", "paper clip", "metal", ["plastic"]),
  T("🔔", "bell", "metal"),
  T("🔩", "bolt", "metal"),
  T("🪵", "log", "wood"),
  T("✏️", "pencil", "wood", ["plastic"]),
  T("🪑", "chair", "wood", ["plastic", "metal"]),
  T("🪣", "bucket", "plastic", ["metal", "wood"]),
  T("🧴", "bottle", "plastic", ["glass"]),
  T("🪟", "window", "glass", ["plastic"]),
  T("🫙", "jar", "glass", ["plastic"]),
  T("🔍", "magnifying glass", "glass", ["plastic"]),
  T("🎈", "balloon", "rubber", ["plastic"]),
  T("🩴", "flip-flop", "rubber", ["plastic"]),
  T("🛞", "tire", "rubber"),
  T("🧦", "sock", "cloth"),
  T("🧣", "scarf", "cloth"),
  T("👕", "T-shirt", "cloth"),
  T("📄", "sheet of paper", "paper"),
  T("📚", "book", "paper"),
  T("📦", "cardboard box", "paper", [], "Cardboard is thick paper."),
  T("🪨", "rock", "stone"),
  T("🧱", "brick", "clay", ["stone"], "Bricks are clay baked hard in a hot oven."),
  T("🏺", "pot", "clay", ["stone"]),
  T("🧊", "ice cube", "ice", ["glass", "water"], "Ice is frozen water."),
];

const MATS: Material[] = ["wood", "metal", "plastic", "glass", "rubber", "cloth", "paper", "stone", "clay"];

const MAT_HINT = "Look closely. Is it shiny? Soft? Can you see through it? Is it stretchy?";

/** What is it made of? */
export function madeOf(): Question {
  if (Math.random() < 0.55) {
    const t = pick(MADE);
    const wrong = MATS.filter((m) => m !== t.mat && !(t.also ?? []).includes(m));
    return ask(
      {
        key: `madeof-${t.name}`,
        prompt: `What is the ${t.name} made of?`,
        visual: { kind: "chem-materials", mode: "objects", items: [{ emoji: t.e, label: cap(t.name), material: "?" }] },
        needsVisual: true,
        hint: MAT_HINT,
        explain: `The ${t.name} is made of ${t.mat}.${t.note ? ` ${t.note}` : ""}`,
      },
      choose(t.mat!, wrong),
    );
  }
  const t = pick(MADE.filter((x) => x.mat !== "ice"));
  const m = t.mat!;
  const others = some(
    MADE.filter((x) => x.mat !== m && !(x.also ?? []).includes(m) && x.mat !== "ice"),
    2,
  );
  const items = shuffle([t, ...others]);
  return ask(
    {
      key: `whichmade-${m}-${items.map((x) => x.name).join("-")}`,
      prompt: `Which one is made of ${m}?`,
      visual: { kind: "chem-materials", mode: "objects", items: items.map((x) => ({ emoji: x.e, label: cap(x.name) })) },
      needsVisual: true,
      hint: `Think about what ${m} is like. Which thing is like that?`,
      explain: `The ${t.name} is made of ${m}. ${cap(list(others.map((o) => `the ${o.name} is ${o.mat}`)))}.`,
    },
    choose(cap(t.name), others.map((o) => cap(o.name))),
  );
}

const HARD: Thing[] = [T("🪨", "rock", "stone"), T("🧱", "brick", "clay"), T("🥄", "metal spoon", "metal"), T("🪵", "log", "wood"), T("🫙", "glass jar", "glass"), T("🔑", "key", "metal"), T("🔨", "hammer")];
const SOFT: Thing[] = [T("🧸", "teddy bear", "cloth"), T("🧦", "sock", "cloth"), T("🧣", "scarf", "cloth"), T("🪶", "feather"), T("🧽", "sponge"), T("🧶", "ball of yarn", "cloth"), T("🍞", "slice of bread"), T("🧤", "glove", "cloth")];
const BENDY: Thing[] = [T("📄", "sheet of paper", "paper"), T("🧦", "sock", "cloth"), T("🪢", "rope"), T("🩴", "flip-flop", "rubber"), T("🧣", "scarf", "cloth"), T("🎗️", "ribbon", "cloth"), T("🎈", "balloon", "rubber"), T("🧶", "yarn", "cloth")];
const STIFF: Thing[] = [T("🪨", "rock", "stone"), T("🧱", "brick", "clay"), T("🫙", "glass jar", "glass"), T("🔨", "hammer"), T("🪵", "log", "wood"), T("🔑", "key", "metal")];

/** One card with a property badge to find. */
const card = (t: Thing): Visual => ({ kind: "chem-materials", mode: "objects", items: [{ emoji: t.e, label: cap(t.name), material: t.mat, properties: ["?"] }] });
const cards = (ts: Thing[]): Visual => ({ kind: "chem-materials", mode: "objects", items: ts.map((t) => ({ emoji: t.e, label: cap(t.name) })) });

/** Pick 1 thing from `yes` and 2 from `no`, as a "which one…?" question. */
function whichOne(id: string, prompt: string, yes: Thing[], no: Thing[], hint: string, why: (t: Thing) => string): Question {
  const t = pick(yes);
  const others = some(
    no.filter((o) => o.name !== t.name),
    2,
  );
  const items = shuffle([t, ...others]);
  return ask(
    { key: `${id}-${items.map((x) => x.name).join("-")}`, prompt, visual: cards(items), needsVisual: true, hint, explain: why(t) },
    choose(cap(t.name), others.map((o) => cap(o.name))),
  );
}

/** Hard or soft? Bendy or stiff? */
export function howItFeels(): Question {
  const r = rand(0, 4);
  if (r === 0 || r === 1) {
    const hard = r === 0;
    const t = pick(hard ? HARD : SOFT);
    return ask(
      {
        key: `feel-hs-${t.name}`,
        prompt: `Is the ${t.name} hard or soft?`,
        visual: card(t),
        needsVisual: true,
        hint: "Imagine pressing it with your finger. Does it squish?",
        explain: hard ? `The ${t.name} is hard. Your finger can't squish it.` : `The ${t.name} is soft. It squishes when you press it.`,
      },
      choose(hard ? "hard" : "soft", [hard ? "soft" : "hard"], 2),
    );
  }
  if (r === 2) {
    const bendy = Math.random() < 0.5;
    const t = pick(bendy ? BENDY : STIFF);
    return ask(
      {
        key: `feel-bs-${t.name}`,
        prompt: `Is the ${t.name} bendy or stiff?`,
        visual: card(t),
        needsVisual: true,
        hint: "Imagine trying to bend it. Does it fold, or stay straight?",
        explain: bendy ? `The ${t.name} is bendy. You can fold or twist it.` : `The ${t.name} is stiff. It won't bend.`,
      },
      choose(bendy ? "bendy" : "stiff", [bendy ? "stiff" : "bendy"], 2),
    );
  }
  if (r === 3)
    return whichOne("feel-soft", "Which one is soft?", SOFT, HARD, "Which one would squish if you squeezed it?", (t) => `The ${t.name} is soft. The others are hard.`);
  return whichOne("feel-bendy", "Which one is bendy?", BENDY, STIFF, "Which one could you fold or twist?", (t) => `The ${t.name} is bendy. The others stay stiff.`);
}

const lab = (t: Thing) => `${t.e} ${t.name}`;

/** Do it: sort hard and soft (or bendy and stiff). */
export function sortFeel(): Question {
  const hs = Math.random() < 0.6;
  const [a, b] = hs ? [HARD, SOFT] : [BENDY, STIFF];
  const bins = hs ? ["Hard", "Soft"] : ["Bendy", "Stiff"];
  const n = rand(2, 3);
  const first = some(a, n);
  const second = some(
    b.filter((x) => !first.some((f) => f.name === x.name)),
    5 - n + rand(0, 1),
  );
  const items = shuffle([...first.map((t) => ({ label: lab(t), bin: 0 })), ...second.map((t) => ({ label: lab(t), bin: 1 }))]);
  return sortQ(
    {
      key: `sortfeel-${items.map((i) => i.label).join("")}`,
      prompt: hs ? "Sort them: hard or soft?" : "Sort them: bendy or stiff?",
      hint: hs ? "Think: would it squish if you squeezed it? Then it's soft." : "Think: could you fold it? Then it's bendy.",
      explain: sortExplain(bins, items),
    },
    bins,
    items,
  );
}

const CLEAR: Thing[] = [T("🪟", "window", "glass"), T("🫙", "glass jar", "glass"), T("🔍", "magnifying glass", "glass"), T("👓", "glasses"), T("💧", "water drop", "water"), T("🫧", "bubble")];
const OPAQUE: Thing[] = [T("🧱", "brick", "clay"), T("🪵", "log", "wood"), T("📚", "book", "paper"), T("🧸", "teddy bear", "cloth"), T("🪨", "rock", "stone"), T("🥄", "metal spoon", "metal"), T("🧦", "sock", "cloth"), T("📦", "cardboard box", "paper")];

/** Can you see through it? */
export function seeThrough(): Question {
  const r = rand(0, 2);
  if (r < 2) {
    const yes = r === 0;
    const t = pick(yes ? CLEAR : OPAQUE);
    return ask(
      {
        key: `see-${t.name}`,
        prompt: `Can you see through the ${t.name}?`,
        visual: card(t),
        needsVisual: true,
        hint: "Imagine holding it up to your eyes. Can you see things behind it?",
        explain: yes ? `Yes! The ${t.name} is see-through. Light passes through it.` : `No. The ${t.name} is not see-through. It blocks the light.`,
      },
      choose(yes ? "see-through" : "not see-through", [yes ? "not see-through" : "see-through"], 2),
    );
  }
  return whichOne("see-which", "Which one can you see through?", CLEAR, OPAQUE, "Which one lets light pass through?", (t) => `You can see through the ${t.name}. The others block the light.`);
}

const DRY: Thing[] = [T("☂️", "umbrella"), T("🎈", "balloon", "rubber"), T("🩴", "flip-flop", "rubber"), T("🫙", "glass jar", "glass"), T("🪣", "plastic bucket", "plastic"), T("👢", "rain boot", "rubber"), T("🧴", "plastic bottle", "plastic")];
const SOAK: Thing[] = [T("🧽", "sponge"), T("🧻", "paper towel", "paper"), T("🧦", "sock", "cloth"), T("📄", "sheet of paper", "paper"), T("🧸", "teddy bear", "cloth"), T("🧣", "scarf", "cloth"), T("🍞", "slice of bread"), T("👕", "T-shirt", "cloth")];

/** Waterproof or soaks up water? */
export function waterproof(): Question {
  const r = rand(0, 2);
  if (r < 2) {
    const yes = r === 0;
    const t = pick(yes ? DRY : SOAK);
    return ask(
      {
        key: `wet-${t.name}`,
        prompt: `Flare spills water on the ${t.name}. What happens?`,
        visual: card(t),
        needsVisual: true,
        hint: "Does water run off it, or sink in and make it soggy?",
        explain: yes ? `The water runs off. The ${t.name} is waterproof.` : `The ${t.name} soaks up the water and gets wet.`,
      },
      choose(yes ? "Water runs off" : "It soaks up water", [yes ? "It soaks up water" : "Water runs off"], 2),
    );
  }
  return whichOne("wet-which", "Which one keeps water out?", DRY, SOAK, "Which one would water run off?", (t) => `The ${t.name} is waterproof. The others soak up water.`);
}

/** Do it: sort waterproof things from things that soak up water. */
export function sortWet(): Question {
  const n = rand(2, 3);
  const items = shuffle([...some(DRY, n).map((t) => ({ label: lab(t), bin: 0 })), ...some(SOAK, 6 - n).map((t) => ({ label: lab(t), bin: 1 }))]);
  const bins = ["Water runs off ☂️", "Soaks it up 🧽"];
  return sortQ(
    {
      key: `sortwet-${items.map((i) => i.label).join("")}`,
      prompt: "Sort them: waterproof, or soaks up water?",
      hint: "Imagine the rain falling on it. Would it get soggy?",
      explain: sortExplain(["Waterproof", "Soaks up water"], items),
    },
    bins,
    items,
  );
}

const FLOAT: Thing[] = [T("🪵", "log", "wood"), T("🦆", "rubber duck", "plastic"), T("🍎", "apple"), T("🧊", "ice cube", "ice"), T("🪶", "feather"), T("✏️", "pencil", "wood"), T("🍃", "leaf"), T("🥥", "coconut"), T("🏀", "ball", "rubber")];
const SINK: Thing[] = [T("🪨", "rock", "stone"), T("🔑", "key", "metal"), T("🪙", "coin", "metal"), T("🥄", "metal spoon", "metal"), T("🧱", "brick", "clay"), T("🔩", "bolt", "metal"), T("💍", "ring", "metal"), T("⚓", "anchor", "metal")];

/** Float or sink? */
export function floatSink(): Question {
  const r = rand(0, 3);
  if (r < 2) {
    const floats = r === 0;
    const t = pick(floats ? FLOAT : SINK);
    return ask(
      {
        key: `float-${t.name}`,
        prompt: `Will the ${t.name} float or sink?`,
        visual: card(t),
        needsVisual: true,
        hint: "Is it light for its size, like wood? Or heavy for its size, like a rock?",
        explain: floats ? `The ${t.name} floats on top of the water.` : `The ${t.name} sinks to the bottom.`,
      },
      choose(floats ? "floats" : "sinks", [floats ? "sinks" : "floats"], 2),
    );
  }
  if (r === 2) return whichOne("float-sinkwhich", "Which one will sink?", SINK, FLOAT, "Which one is heavy for its size?", (t) => `The ${t.name} sinks. The others float.`);
  return whichOne("float-floatwhich", "Which one will float?", FLOAT, SINK, "Which one is light for its size?", (t) => `The ${t.name} floats. The others sink.`);
}

/** Do it: sort floaters and sinkers. */
export function sortFloat(): Question {
  const n = rand(2, 4);
  const items = shuffle([...some(FLOAT, n).map((t) => ({ label: lab(t), bin: 0 })), ...some(SINK, 6 - n).map((t) => ({ label: lab(t), bin: 1 }))]);
  const bins = ["Floats", "Sinks"];
  return sortQ(
    { key: `sortfloat-${items.map((i) => i.label).join("")}`, prompt: "Sort them: float or sink?", hint: "Things made of wood often float. Rocks and metal things sink.", explain: sortExplain(bins, items) },
    bins,
    items,
  );
}

const STICKS: Thing[] = [T("📎", "paper clip", "metal"), T("🔩", "steel bolt", "metal"), T("🧷", "safety pin", "metal"), T("🪛", "screwdriver", "metal"), T("🥫", "steel can", "metal")];
const NOSTICK: Thing[] = [
  T("🪵", "log", "wood"),
  T("🧸", "teddy bear", "cloth"),
  T("📄", "sheet of paper", "paper"),
  T("🎈", "balloon", "rubber"),
  T("🫙", "glass jar", "glass"),
  T("💍", "gold ring", "metal", [], "Gold is a metal, but magnets don't pull on gold."),
  T("🪙", "gold coin", "metal", [], "Gold is a metal, but magnets don't pull on gold."),
  T("✏️", "pencil", "wood"),
  T("🧊", "ice cube", "ice"),
  T("🧱", "brick", "clay"),
];

/** Will a magnet pick it up? */
export function magnets(): Question {
  const r = rand(0, 2);
  if (r < 2) {
    const yes = r === 0;
    const t = pick(yes ? STICKS : NOSTICK);
    return ask(
      {
        key: `mag-${t.name}`,
        prompt: `Will a magnet 🧲 pick up the ${t.name}?`,
        visual: card(t),
        needsVisual: true,
        hint: "Magnets pull on iron and steel. Is it made of iron or steel?",
        explain: yes ? `Yes! The ${t.name} is made of steel, and magnets pull on steel.` : `No. ${t.note ?? `Magnets don't pull on ${t.mat ?? "it"}.`}`,
      },
      choose(yes ? "Yes, it sticks" : "No, it doesn't", [yes ? "No, it doesn't" : "Yes, it sticks"], 2),
    );
  }
  return whichOne("mag-which", "Which one will stick to a magnet 🧲?", STICKS, NOSTICK, "Magnets pull on things made of iron or steel.", (t) => `The ${t.name} is made of steel, so it sticks. The others don't.`);
}

/** Do it: sort things by what they're made of. */
export function sortMaterials(): Question {
  const three = Math.random() < 0.5;
  const pool = MADE.filter((t) => t.mat !== "ice");
  let mats: Material[];
  do mats = some(["wood", "metal", "plastic", "glass", "cloth", "paper", "rubber"] as Material[], three ? 3 : 2);
  while (mats.some((m) => pool.filter((t) => t.mat === m).length < 3));
  const per = three ? 2 : 3;
  const items = shuffle(
    mats.flatMap((m, bin) =>
      some(
        pool.filter((t) => t.mat === m && !(t.also ?? []).some((x) => mats.includes(x))),
        per,
      ).map((t) => ({ label: lab(t), bin })),
    ),
  );
  const bins = mats.map(cap);
  return sortQ(
    { key: `sortmat-${items.map((i) => i.label).join("")}`, prompt: "Sort them by what they're made of.", hint: MAT_HINT, explain: sortExplain(bins, items) },
    bins,
    items,
  );
}

const WEIGH: { e: string; name: string; lo: number; hi: number }[] = [
  { e: "✏️", name: "pencil", lo: 5, hi: 8 },
  { e: "🖍️", name: "crayon", lo: 4, hi: 6 },
  { e: "🍓", name: "strawberry", lo: 10, hi: 15 },
  { e: "🥚", name: "egg", lo: 50, hi: 60 },
  { e: "🔑", name: "key", lo: 6, hi: 10 },
  { e: "🍪", name: "cookie", lo: 12, hi: 16 },
  { e: "🥄", name: "spoon", lo: 20, hi: 35 },
  { e: "🎾", name: "tennis ball", lo: 56, hi: 59 },
  { e: "🪙", name: "coin", lo: 5, hi: 8 },
  { e: "🥝", name: "kiwi", lo: 70, hi: 80 },
];
const WEIGHTS = [50, 20, 10, 5, 1];

/** The weights that make a mass, biggest first: 56 → [50, 5, 1]. */
export function weightsFor(mass: number, weights = WEIGHTS): number[] {
  const out: number[] = [];
  let left = mass;
  for (const w of [...weights].sort((a, b) => b - a))
    while (left >= w) {
      out.push(w);
      left -= w;
    }
  return out;
}

/** Do it: weigh a thing on a pan balance. */
export function weighIt(): Question {
  const t = pick(WEIGH);
  const g = rand(t.lo, t.hi);
  const ws = weightsFor(g);
  return ask(
    {
      key: `weigh-${t.name}-${g}`,
      prompt: `Weigh the ${t.name}! Add weights until the pans are level.`,
      hint: "If the weights' side is up, add more. If it goes down, take one off. Try big weights first.",
      explain: `${ws.join(" + ")} = ${g}. The ${t.name} weighs ${g} grams.`,
    },
    doIt({ kind: "chem-measure", mode: "balance", mass: g, emoji: t.e, weights: WEIGHTS }, g),
  );
}

/* ================================================ world 2: building with materials */

type Fact = "soggy" | "melts" | "sinks" | "tooHard" | "dark" | "breaks" | "leaks" | "floppy" | "noBounce";

/** What goes wrong, and which materials it's true of (so it's never offered as a wrong answer for them). */
const FACTS: Record<Fact, { text: string; mats: string[] }> = {
  soggy: { text: "It gets soggy and falls apart.", mats: ["paper", "bread", "tissue", "cardboard", "cotton", "wool"] },
  melts: { text: "It melts.", mats: ["ice", "chocolate", "butter"] },
  sinks: { text: "It sinks.", mats: ["rock", "brick", "metal", "stone", "glass", "clay", "chocolate", "paper", "bread", "cotton", "wool", "tissue"] },
  tooHard: { text: "It is too hard to sleep on.", mats: ["rock", "wood", "metal", "brick", "glass", "stone", "clay", "ice", "chocolate"] },
  dark: { text: "You can't see through it.", mats: ["wood", "brick", "metal", "rock", "stone", "paper", "cotton", "wool", "clay", "chocolate", "bread", "cardboard"] },
  breaks: { text: "It cracks and breaks.", mats: ["glass", "clay", "ice", "brick", "rock", "stone", "wood", "chocolate"] },
  leaks: { text: "Water gets through it.", mats: ["cotton", "paper", "tissue", "wool", "bread"] },
  floppy: { text: "It bends and can't hold things up.", mats: ["paper", "cotton", "tissue", "wool"] },
  noBounce: { text: "It doesn't bounce.", mats: ["rock", "paper", "clay", "bread", "stone", "metal", "wood", "glass", "cotton", "wool", "tissue", "ice", "chocolate", "brick"] },
};

const MAT_EMOJI: Record<string, string> = {
  wood: "🪵", metal: "🔩", plastic: "🧴", glass: "🫙", rubber: "🎈", cloth: "👕", paper: "📄", stone: "🪨", rock: "🪨", clay: "🏺",
  ice: "🧊", chocolate: "🍫", bread: "🍞", brick: "🧱", feathers: "🪶", wool: "🧶", cotton: "👕", butter: "🧈", jelly: "🍮",
  tissue: "🧻", cardboard: "📦", "clear plastic": "🧴",
};

interface Job {
  e: string;
  thing: string;
  good: Material;
  why: string;
  notWhy: string[];
  bad: { mat: string; fact: Fact }[];
  goodList: string[];
  badList: string[];
}

const JOBS: Job[] = [
  {
    e: "☂️", thing: "umbrella", good: "plastic", why: "It keeps the rain out.", notWhy: ["It soaks up water.", "It is fluffy and soft.", "It sinks."],
    bad: [{ mat: "paper", fact: "soggy" }, { mat: "bread", fact: "soggy" }, { mat: "cotton", fact: "leaks" }],
    goodList: ["plastic", "rubber"], badList: ["paper", "bread", "tissue", "wool"],
  },
  {
    e: "🪟", thing: "window", good: "glass", why: "You can see through it.", notWhy: ["It is soft.", "It is bendy.", "It soaks up water."],
    bad: [{ mat: "wood", fact: "dark" }, { mat: "brick", fact: "dark" }, { mat: "metal", fact: "dark" }],
    goodList: ["glass", "clear plastic"], badList: ["wood", "brick", "metal", "cardboard"],
  },
  {
    e: "🌉", thing: "bridge", good: "stone", why: "It is strong and hard.", notWhy: ["It is soft.", "You can see through it.", "It is stretchy."],
    bad: [{ mat: "paper", fact: "floppy" }, { mat: "ice", fact: "melts" }, { mat: "chocolate", fact: "melts" }],
    goodList: ["stone", "metal", "wood"], badList: ["paper", "ice", "chocolate", "jelly"],
  },
  {
    e: "🥣", thing: "soup spoon", good: "metal", why: "It is hard and doesn't melt in hot soup.", notWhy: ["It is soft and squishy.", "It soaks up water.", "It is stretchy."],
    bad: [{ mat: "chocolate", fact: "melts" }, { mat: "ice", fact: "melts" }, { mat: "paper", fact: "soggy" }],
    goodList: ["metal", "wood", "plastic"], badList: ["chocolate", "ice", "paper", "butter"],
  },
  {
    e: "⛵", thing: "boat", good: "wood", why: "It floats on water.", notWhy: ["It sinks.", "It soaks up water.", "You can see through it."],
    bad: [{ mat: "rock", fact: "sinks" }, { mat: "brick", fact: "sinks" }, { mat: "paper", fact: "soggy" }],
    goodList: ["wood", "plastic", "rubber"], badList: ["rock", "brick", "paper", "bread"],
  },
  {
    e: "🛏️", thing: "pillow", good: "cloth", why: "It is soft.", notWhy: ["It is hard.", "You can see through it.", "It is shiny."],
    bad: [{ mat: "rock", fact: "tooHard" }, { mat: "wood", fact: "tooHard" }, { mat: "metal", fact: "tooHard" }],
    goodList: ["feathers", "wool", "cotton"], badList: ["rock", "metal", "wood", "glass"],
  },
  {
    e: "🏀", thing: "bouncy ball", good: "rubber", why: "It is stretchy and bouncy.", notWhy: ["You can see through it.", "It melts.", "It soaks up water."],
    bad: [{ mat: "glass", fact: "breaks" }, { mat: "rock", fact: "noBounce" }, { mat: "paper", fact: "noBounce" }],
    goodList: ["rubber"], badList: ["glass", "rock", "paper", "clay"],
  },
  {
    e: "☕", thing: "mug for hot cocoa", good: "clay", why: "It holds hot drinks and doesn't melt.", notWhy: ["It soaks up water.", "It is soft and squishy.", "It is bendy."],
    bad: [{ mat: "ice", fact: "melts" }, { mat: "chocolate", fact: "melts" }, { mat: "cotton", fact: "leaks" }],
    goodList: ["clay", "metal", "glass"], badList: ["ice", "chocolate", "cotton", "bread"],
  },
  {
    e: "🛞", thing: "tire", good: "rubber", why: "It is bendy and grips the road.", notWhy: ["You can see through it.", "It melts in the sun.", "It soaks up water."],
    bad: [{ mat: "glass", fact: "breaks" }, { mat: "ice", fact: "melts" }, { mat: "paper", fact: "soggy" }],
    goodList: ["rubber"], badList: ["glass", "ice", "paper"],
  },
  {
    e: "🐠", thing: "fish tank", good: "glass", why: "You can see the fish, and it holds water.", notWhy: ["It is soft.", "It soaks up water.", "It floats away."],
    bad: [{ mat: "wood", fact: "dark" }, { mat: "paper", fact: "soggy" }, { mat: "cotton", fact: "leaks" }],
    goodList: ["glass", "clear plastic"], badList: ["wood", "paper", "cotton", "metal"],
  },
];

/** "It melts." about chocolate → "Chocolate melts." */
const factAbout = (f: Fact, mat: string) => FACTS[f].text.replace(/^It /, `${cap(mat)} `).replace(/ it\.$/, ` ${mat}.`);

const jobCard = (j: Job, material: Material | "?" = "?"): Visual => ({ kind: "chem-materials", mode: "objects", items: [{ emoji: j.e, label: cap(j.thing), material }] });

/** Which material is best for the job? */
export function bestMaterial(): Question {
  const j = pick(JOBS);
  const bads = some(j.bad, 2);
  return ask(
    {
      key: `best-${j.thing}-${bads.map((b) => b.mat).join("-")}`,
      prompt: `Which is best for ${an(j.thing)}?`,
      visual: jobCard(j),
      needsVisual: true,
      hint: `What does ${an(j.thing)} need to do? Which material can do that?`,
      explain: `${cap(j.good)}. ${j.why} ${bads.map((b) => factAbout(b.fact, b.mat)).join(" ")}`,
    },
    choose(j.good, bads.map((b) => b.mat)),
  );
}

/** Why is it made of that material? */
export function whyMaterial(): Question {
  const j = pick(JOBS);
  const wrong = some(j.notWhy, 2);
  return ask(
    {
      key: `why-${j.thing}-${wrong.join("|")}`,
      prompt: `Why is ${an(j.thing)} made of ${j.good}?`,
      visual: jobCard(j, j.good),
      hint: `Think about the job. What must ${an(j.thing)} be like?`,
      explain: `${j.why} That is just what ${an(j.thing)} needs.`,
    },
    choose(j.why, wrong),
  );
}

/** A silly build: what goes wrong? */
export function sillyBuild(): Question {
  const j = pick(JOBS);
  const b = pick(j.bad);
  const wrong = (Object.keys(FACTS) as Fact[]).filter((f) => f !== b.fact && !FACTS[f].mats.includes(b.mat)).map((f) => FACTS[f].text);
  const right = FACTS[b.fact].text;
  return ask(
    {
      key: `silly-${j.thing}-${b.mat}`,
      prompt: `Silly Flare made ${an(j.thing)} out of ${b.mat}! What goes wrong?`,
      visual: { kind: "chem-materials", mode: "objects", items: [{ emoji: j.e, label: cap(j.thing) }, { emoji: MAT_EMOJI[b.mat] ?? "❓", label: cap(b.mat) }] },
      hint: `What is ${b.mat} like? What does ${an(j.thing)} need to do?`,
      explain: `${right} ${cap(j.good)} is a better choice. ${j.why}`,
    },
    choose(right, some(wrong, 2)),
  );
}

/** Do it: sort materials into good and not good for a job. */
export function sortForJob(): Question {
  const j = pick(JOBS);
  const good = some(j.goodList, Math.min(3, j.goodList.length));
  const bad = some(j.badList, Math.max(3, 6 - good.length - 1));
  const tag = (m: string) => `${MAT_EMOJI[m] ?? ""} ${m}`.trim();
  const bins = [`Good for ${an(j.thing)}`, "Not good"];
  const items = shuffle([...good.map((m) => ({ label: tag(m), bin: 0 })), ...bad.map((m) => ({ label: tag(m), bin: 1 }))]);
  return sortQ(
    {
      key: `sortjob-${j.thing}-${items.map((i) => i.label).join("")}`,
      prompt: `${j.e} Which would make a good ${j.thing}?`,
      speech: `Sort them. Which materials would make a good ${j.thing}?`,
      hint: `What must ${an(j.thing)} do? ${j.why} Which materials can do that?`,
      explain: sortExplain(bins, items),
    },
    bins,
    items,
  );
}

interface Test {
  title: string;
  job: string;
  best: "min" | "max";
  /** Material and value range (even numbers keep the bars on gridlines). */
  items: [string, number, number][];
  why: string;
}

const TESTS: Test[] = [
  { title: "Water drops that soaked through", job: "a raincoat", best: "min", items: [["plastic", 0, 0], ["cotton", 6, 10], ["wool", 4, 8], ["paper", 10, 12]], why: "Fewest drops soaked through, so it keeps you dry." },
  { title: "Toy cars each bridge held", job: "a bridge", best: "max", items: [["paper", 0, 2], ["cardboard", 2, 4], ["wood", 6, 8], ["metal", 10, 12]], why: "It held the most cars, so it is the strongest." },
  { title: "How high each ball bounced", job: "a bouncy ball", best: "max", items: [["rubber", 10, 12], ["wood", 2, 4], ["clay", 0, 0], ["cloth", 0, 2]], why: "It bounced the highest." },
  { title: "Spoons of water each cloth soaked up", job: "a towel", best: "max", items: [["cotton", 10, 12], ["wool", 6, 8], ["paper", 2, 4], ["plastic", 0, 0]], why: "It soaked up the most water, so it dries you best." },
];

const even = (lo: number, hi: number) => 2 * rand(Math.ceil(lo / 2), Math.floor(hi / 2));

/** Read a test's bar graph to pick the best material. */
export function testMaterials(): Question {
  const t = pick(TESTS);
  const items = shuffle(t.items.map(([label, lo, hi]) => ({ label, value: even(lo, hi) })));
  const visual: Visual = { kind: "bars", title: t.title, items, max: 12, step: 2 };
  const vals = items.map((i) => i.value);
  const target = t.best === "max" ? Math.max(...vals) : Math.min(...vals);
  const best = items.find((i) => i.value === target)!;
  const key = `${t.job}-${items.map((i) => `${i.label}${i.value}`).join("")}`;
  if (Math.random() < 0.6)
    return ask(
      {
        key: `test-best-${key}`,
        prompt: `Flare tested materials. Which is best for ${t.job}?`,
        visual,
        needsVisual: true,
        hint: t.best === "max" ? "Find the tallest bar." : "Find the shortest bar.",
        explain: `${cap(best.label)}. ${t.why}`,
      },
      choose(best.label, items.filter((i) => i !== best).map((i) => i.label), 4),
    );
  const [a, b] = shuffle(items.filter((i) => i.value > 0)).slice(0, 2).sort((x, y) => y.value - x.value);
  if (!b || a.value === b.value) return testMaterials();
  const diff = a.value - b.value;
  return ask(
    {
      key: `test-diff-${key}-${a.label}-${b.label}`,
      prompt: `How many more for ${a.label} than for ${b.label}?`,
      speech: `${t.title}. How many more for ${a.label} than for ${b.label}?`,
      visual,
      needsVisual: true,
      hint: `Read the top of each bar. Then count up from ${b.value} to ${a.value}.`,
      explain: `${cap(a.label)} has ${a.value} and ${b.label} has ${b.value}. ${a.value} − ${b.value} = ${diff}.`,
    },
    { answer: diff, input: "choices", choices: makeChoices(diff, { n: 3, min: 1, max: 12, likely: [diff + 2, diff - 2, a.value] }) },
  );
}

const DESIGNS: Exclude<BlockDesign, "pile">[] = ["tower", "house", "car", "boat", "bridge", "wall", "robot", "train"];

/** Same 8 blocks, a new thing. */
export function samePieces(): Question {
  const [from, to] = some(DESIGNS, 2);
  const r = rand(0, 3);
  const others = () => some(DESIGNS.filter((d) => d !== from && d !== to), 2).map(cap);
  if (r === 0)
    return ask(
      {
        key: `pieces-count-${from}-${to}`,
        prompt: `Flare built a ${from} from 8 blocks. Then Flare took it apart and built a ${to}. How many blocks are in the ${to}?`,
        visual: { kind: "chem-materials", mode: "pieces", from, to, labels: [cap(from), "Pieces", cap(to)] },
        hint: "Did Flare add or lose any blocks? Count the blocks in each picture.",
        explain: `8 blocks. Flare used the very same 8 blocks, just put together in a new way.`,
      },
      { answer: 8, input: "choices", choices: shuffle([6, 8, 10]) },
    );
  if (r === 1)
    return ask(
      {
        key: `pieces-to-${from}-${to}`,
        prompt: `Flare took the ${from} apart. What did Flare build with the pieces?`,
        visual: { kind: "chem-materials", mode: "pieces", from, to, labels: [cap(from), "Pieces", "?"] },
        needsVisual: true,
        hint: "Look at the last picture. What does its shape look like?",
        explain: `A ${to}! The same blocks that made the ${from} now make a ${to}.`,
      },
      choose(cap(to), others()),
    );
  if (r === 2)
    return ask(
      {
        key: `pieces-from-${from}-${to}`,
        prompt: `Flare built this ${to} from old pieces. What were the pieces before?`,
        visual: { kind: "chem-materials", mode: "pieces", from, to, labels: ["?", "Pieces", cap(to)] },
        needsVisual: true,
        hint: "Look at the first picture. What shape do the blocks make?",
        explain: `A ${from}. Flare took the ${from} apart and used its blocks to build the ${to}.`,
      },
      choose(cap(from), others()),
    );
  return ask(
    {
      key: `pieces-new-${from}-${to}`,
      prompt: `To build the ${to}, did Flare need new blocks?`,
      visual: { kind: "chem-materials", mode: "pieces", from, to, steps: 2, labels: [cap(from), cap(to)] },
      hint: "Count the blocks in both pictures. Are the colours the same?",
      explain: `No. The ${to} uses the same 8 blocks as the ${from}. Small pieces can be built into something new.`,
    },
    choose("No, the same blocks", ["Yes, more blocks", "Yes, new blocks"]),
  );
}

/** Do it: put building steps in order. */
export function orderBuild(): Question {
  const [from, to] = some(DESIGNS, 2);
  const items = ["Get 8 blocks", `Build a ${from}`, `Take the ${from} apart`, `Build a ${to}`];
  return ask(
    {
      key: `orderbuild-${from}-${to}`,
      prompt: `Put Flare's steps in order: first a ${from}, then a ${to}.`,
      visual: { kind: "chem-materials", mode: "pieces", from, to, labels: [cap(from), "Pieces", cap(to)] },
      hint: "You need blocks before you can build. You must take the first thing apart before you build the next.",
      explain: `${items.join(", then ")}.`,
    },
    doIt({ kind: "order", items, direction: "first to last" }, items.length),
  );
}

const PIECES: { e: string; whole: string; piece: string; next?: string }[] = [
  { e: "🧱", whole: "brick wall", piece: "bricks", next: "a doghouse" },
  { e: "📿", whole: "bead necklace", piece: "beads", next: "a bracelet" },
  { e: "🧩", whole: "jigsaw puzzle", piece: "puzzle pieces" },
  { e: "🏰", whole: "sandcastle", piece: "grains of sand", next: "a sand turtle" },
  { e: "🛤️", whole: "toy train track", piece: "track pieces", next: "a round track" },
  { e: "🛖", whole: "log hut", piece: "logs", next: "a raft" },
  { e: "🤖", whole: "toy robot", piece: "toy bricks", next: "a race car" },
  { e: "🪺", whole: "bird's nest", piece: "twigs" },
  { e: "🧺", whole: "basket", piece: "strips of straw" },
];
const NOT_FROM_PIECES = ["a glass of milk", "a rainbow", "a puddle", "a cookie", "a sunbeam"];

/** Real things made of small pieces. */
export function smallPieces(): Question {
  const withNext = PIECES.filter((p) => p.next);
  if (Math.random() < 0.5) {
    const p = pick(PIECES);
    return ask(
      {
        key: `small-made-${p.whole}`,
        prompt: `${p.e} What small pieces make a ${p.whole}?`,
        hint: "Imagine taking it apart. What would you have in your hands?",
        explain: `A ${p.whole} is made of ${p.piece}.`,
      },
      choose(p.piece, PIECES.filter((o) => o.piece !== p.piece).map((o) => o.piece)),
    );
  }
  const p = pick(withNext);
  const wrong = some(NOT_FROM_PIECES, 2);
  return ask(
    {
      key: `small-next-${p.whole}-${wrong.join("|")}`,
      prompt: `${p.e} Flare takes apart a ${p.whole}. What could Flare build with the ${p.piece}?`,
      hint: `Which one could be made by putting ${p.piece} together?`,
      explain: `${cap(p.next!)}! The same ${p.piece} can be built into something new.`,
    },
    choose(p.next!, wrong),
  );
}

const REBUILD = ["🧱 toy brick house", "📿 bead necklace", "🧩 jigsaw puzzle", "🛤️ toy train track", "🏰 sandcastle", "🤖 brick robot"];
const NO_REBUILD = ["🍪 baked cookie", "🍳 cooked egg", "🎂 birthday cake", "🎈 popped balloon", "🍞 slice of toast", "🧃 glass of juice"];

/** Which can be taken apart and built into something new? */
export function canRebuild(): Question {
  if (Math.random() < 0.5) {
    const yes = pick(REBUILD);
    const no = some(NO_REBUILD, 2);
    return ask(
      {
        key: `rebuild-yes-${yes}-${no.join("|")}`,
        prompt: "Which one can you take apart and build into something new?",
        hint: "Look for the one made of small pieces that snap or stack together.",
        explain: `The ${yes.slice(yes.indexOf(" ") + 1)} is made of small pieces. You can take them apart and build again.`,
      },
      choose(yes, no),
    );
  }
  const no = pick(NO_REBUILD);
  const yes = some(REBUILD, 2);
  return ask(
    {
      key: `rebuild-no-${no}-${yes.join("|")}`,
      prompt: "Which one can't be taken apart and built again?",
      hint: "Two are made of small pieces you can snap or stack. Which one isn't?",
      explain: `The ${no.slice(no.indexOf(" ") + 1)} isn't made of pieces you can put back together.`,
    },
    choose(no, yes),
  );
}

/* ====================================================== world 3: hot and cold */

interface Change {
  a: [string, string];
  b: [string, string];
  arrow: string;
  heat: boolean;
  back: boolean;
  name: string;
  backWhy: string;
}

const C = (a: [string, string], b: [string, string], arrow: string, heat: boolean, back: boolean, name: string, backWhy: string): Change => ({ a, b, arrow, heat, back, name, backWhy });

const MELTS: Change[] = [
  C(["🧊", "Ice"], ["💧", "Water"], "warm", true, true, "Ice melts", "Put the water in the freezer and it turns back into ice."),
  C(["🍫", "Chocolate"], ["🫗", "Runny chocolate"], "warm", true, true, "Chocolate melts", "Cool it and it turns hard again."),
  C(["🧈", "Butter"], ["🫗", "Runny butter"], "warm", true, true, "Butter melts", "Put it in the fridge and it turns hard again."),
  C(["🖍️", "Crayon"], ["🫗", "Runny wax"], "heat", true, true, "A crayon melts", "Cool the wax and it turns hard again."),
  C(["⛄", "Snowman"], ["💧", "Water"], "warm", true, true, "A snowman melts", "Freeze the water and it turns back into ice."),
  C(["🕯️", "Candle wax"], ["🫗", "Runny wax"], "heat", true, true, "Candle wax melts", "Cool the wax and it turns hard again."),
];
const FREEZES: Change[] = [
  C(["💧", "Water"], ["🧊", "Ice"], "cool", false, true, "Water freezes", "Warm the ice and it melts back into water."),
  C(["🧃", "Juice"], ["🧊", "Frozen juice"], "cool", false, true, "Juice freezes", "Warm it and it melts back into juice."),
  C(["🫗", "Runny chocolate"], ["🍫", "Hard chocolate"], "cool", false, true, "Melted chocolate hardens", "Warm it and it melts again."),
  C(["🫗", "Runny wax"], ["🕯️", "Hard wax"], "cool", false, true, "Melted wax hardens", "Warm it and it melts again."),
  C(["🫗", "Melted butter"], ["🧈", "Hard butter"], "cool", false, true, "Melted butter hardens", "Warm it and it melts again."),
];
const COOKS: Change[] = [
  C(["🥚", "Raw egg"], ["🍳", "Cooked egg"], "cook", true, false, "An egg cooks", "You can't turn a cooked egg back into a raw egg."),
  C(["🌽", "Corn kernels"], ["🍿", "Popcorn"], "heat", true, false, "Corn pops", "You can't turn popcorn back into corn kernels."),
  C(["🥣", "Cake batter"], ["🎂", "Cake"], "bake", true, false, "A cake bakes", "You can't turn a cake back into batter."),
  C(["🥣", "Pancake batter"], ["🥞", "Pancake"], "cook", true, false, "A pancake cooks", "You can't turn a pancake back into batter."),
  C(["🥣", "Cookie dough"], ["🍪", "Cookie"], "bake", true, false, "Cookies bake", "You can't turn a cookie back into dough."),
  C(["📄", "Paper"], ["🔥", "Ash and smoke"], "burn", true, false, "Paper burns", "You can't turn ash and smoke back into paper."),
  C(["🪵", "Wood"], ["🔥", "Ash and smoke"], "burn", true, false, "Wood burns", "You can't turn ash and smoke back into wood."),
];
const ALL_CHANGES = [...MELTS, ...FREEZES, ...COOKS];

const changePic = (c: Change, ask: "b" | "arrow" | "back" | null): Visual => ({
  kind: "chem-materials",
  mode: "change",
  steps: [
    { emoji: c.a[0], label: c.a[1] },
    { emoji: c.b[0], label: ask === "b" ? "?" : c.b[1] },
  ],
  arrows: [ask === "arrow" ? "?" : c.arrow],
  ...(ask === "back" ? { reversible: "?" as const } : {}),
});

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Warm it up: melting. */
export function warmUp(): Question {
  const r = rand(0, 2);
  const c = pick(MELTS);
  if (r === 0)
    return ask(
      {
        key: `warm-what-${c.name}`,
        prompt: `What happens to the ${lower(c.a[1])} when it gets warm?`,
        visual: changePic(c, "b"),
        needsVisual: true,
        hint: "Think of an ice cube in your warm hand.",
        explain: `It melts! ${c.a[1]} turns into ${lower(c.b[1])}.`,
      },
      choose("It melts", ["It freezes", "It stays the same"]),
    );
  if (r === 1)
    return ask(
      {
        key: `warm-into-${c.name}`,
        prompt: `The ${lower(c.a[1])} gets warm. What does it turn into?`,
        visual: changePic(c, "b"),
        needsVisual: true,
        hint: "Warming makes hard things like ice and chocolate go soft and runny.",
        explain: `${c.b[1]}. Warming makes the ${lower(c.a[1])} melt.`,
      },
      choose(c.b[1], ["Ice", "Smoke", "Hard chocolate", "Sand"].filter((x) => x !== c.b[1])),
    );
  const melters = ["🧊 ice cube", "🍫 chocolate", "🧈 butter", "⛄ snowman", "🍦 ice cream"];
  const not = ["🪨 rock", "🥄 metal spoon", "🧸 teddy bear", "🪵 log", "🧱 brick", "📚 book"];
  const yes = pick(melters);
  const no = some(not, 2);
  return ask(
    {
      key: `warm-sun-${yes}-${no.join("|")}`,
      prompt: "☀️ Which one will melt in the hot sun?",
      hint: "Which one turns runny when it gets warm?",
      explain: `The ${yes.slice(yes.indexOf(" ") + 1)} melts in the sun. The others stay the same.`,
    },
    choose(yes, no),
  );
}

/** Cool it down: freezing and hardening. */
export function coolDown(): Question {
  const r = rand(0, 2);
  const c = pick(FREEZES);
  if (r === 0)
    return ask(
      {
        key: `cool-what-${c.name}`,
        prompt: `What happens to the ${lower(c.a[1])} when it gets very cold?`,
        visual: changePic(c, "b"),
        needsVisual: true,
        hint: "Think of water in the freezer.",
        explain: `It turns hard! ${c.a[1]} becomes ${lower(c.b[1])}.`,
      },
      choose("It turns hard", ["It melts", "It burns"]),
    );
  if (r === 1)
    return ask(
      {
        key: `cool-into-${c.name}`,
        prompt: `The ${lower(c.a[1])} cools down. What does it turn into?`,
        visual: changePic(c, "b"),
        needsVisual: true,
        hint: "Cooling makes runny things turn hard.",
        explain: `${c.b[1]}. Cooling makes it turn hard.`,
      },
      choose(c.b[1], ["Steam", "Smoke", "Runny butter", "Popcorn"].filter((x) => x !== c.b[1])),
    );
  return ask(
    {
      key: `cool-where-${c.name}`,
      prompt: `Where should Flare put the ${lower(c.a[1])} to make it turn hard?`,
      visual: changePic(c, null),
      hint: "It needs to get cold.",
      explain: `In the freezer. The cold turns the ${lower(c.a[1])} hard.`,
    },
    choose("In the freezer", ["In the hot sun", "In the oven"]),
  );
}

/** What made the change: heating or cooling? */
export function heatOrCool(): Question {
  const c = pick(ALL_CHANGES);
  return ask(
    {
      key: `hc-${c.name}`,
      prompt: `${c.name}. What makes this happen?`,
      visual: changePic(c, "arrow"),
      needsVisual: true,
      hint: "Melting, cooking, baking and burning need heat. Freezing and hardening need cold.",
      explain: c.heat ? `Heating. ${c.name} when it gets hot.` : `Cooling. ${c.name} when it gets cold.`,
    },
    choose(c.heat ? "Heating 🔥" : "Cooling ❄️", [c.heat ? "Cooling ❄️" : "Heating 🔥"], 2),
  );
}

const CAN = "It can change back";
const CANT = "It can't change back";

/** Can this change be undone? */
export function changeBack(): Question {
  const c = pick(ALL_CHANGES);
  return ask(
    {
      key: `back-${c.name}`,
      prompt: `${c.name}. Can it change back?`,
      visual: changePic(c, "back"),
      needsVisual: true,
      hint: "Melting and freezing can be undone. Cooking, baking and burning make something new that can't go back.",
      explain: `${c.back ? "Yes." : "No."} ${c.backWhy}`,
    },
    choose(c.back ? CAN : CANT, [c.back ? CANT : CAN], 2),
  );
}

const tagChange = (c: Change) => `${c.a[0]} ${c.name}`;

/** Do it: sort changes that can and can't be undone. */
export function sortChanges(): Question {
  const n = rand(2, 3);
  const backs = [...MELTS, ...FREEZES];
  const items = shuffle([...some(backs, n).map((c) => ({ label: tagChange(c), bin: 0 })), ...some(COOKS, 6 - n).map((c) => ({ label: tagChange(c), bin: 1 }))]);
  const bins = ["Can change back", "Can't change back"];
  return sortQ(
    {
      key: `sortback-${items.map((i) => i.label).join("")}`,
      prompt: "Sort the changes: can they change back?",
      hint: "Melted things can freeze again. Cooked and burnt things can't go back.",
      explain: sortExplain(bins, items),
    },
    bins,
    items,
  );
}

/** Odd one out: which can (or can't) change back? */
export function oddChange(): Question {
  const backs = [...MELTS, ...FREEZES];
  if (Math.random() < 0.5) {
    const odd = pick(COOKS);
    const rest = some(backs, 2);
    return ask(
      {
        key: `odd-cant-${odd.name}-${rest.map((c) => c.name).join("|")}`,
        prompt: "Which change can't be undone?",
        hint: "Which one makes something new, like cooking or burning?",
        explain: `${odd.name}. ${odd.backWhy} The others can change back.`,
      },
      choose(tagChange(odd), rest.map(tagChange)),
    );
  }
  const odd = pick(backs);
  const rest = some(COOKS, 2);
  return ask(
    {
      key: `odd-can-${odd.name}-${rest.map((c) => c.name).join("|")}`,
      prompt: "Which change can be undone?",
      hint: "Look for melting or freezing.",
      explain: `${odd.name}. ${odd.backWhy} The others can't go back.`,
    },
    choose(tagChange(odd), rest.map(tagChange)),
  );
}

/** Do it: slide the temperature to freeze, melt or boil water. */
export function waterSlider(): Question {
  const target = pick(["solid", "liquid", "gas"] as const);
  const starts = Array.from({ length: 29 }, (_, i) => -20 + i * 5).filter((t) => (t < 0 ? "solid" : t < 100 ? "liquid" : "gas") !== target);
  const start = pick(starts);
  const goal = { solid: "freeze the water into ice", liquid: "melt the ice into water", gas: "boil the water into steam" }[target];
  const cold = start < 0;
  return ask(
    {
      key: `slide-${target}-${start}`,
      prompt: `Slide the temperature to ${target === "liquid" && !cold ? "make it runny water" : goal}.`,
      hint: target === "solid" ? "Make it colder. Slide to the left." : target === "gas" ? "Make it much hotter. Slide to the right." : cold ? "Warm it up a little." : "Cool it down a little.",
      explain:
        target === "solid"
          ? "Below 0 °C, water freezes into ice. The tiny bits stop and pack in rows."
          : target === "gas"
            ? "At 100 °C, water boils into steam. The tiny bits fly far apart."
            : "Between 0 °C and 100 °C, water is a runny liquid.",
    },
    doIt({ kind: "chem-states", substance: "water", formula: "H₂O", melt: 0, boil: 100, target, min: -20, max: 120, step: 5, start }, target === "solid" ? 0 : target === "gas" ? 100 : 50),
  );
}

const STATE_WORD = { solid: "Ice", liquid: "Water", gas: "Steam" } as const;

/** Ice and water up close: tiny bits. */
export function upClose(): Question {
  const n = rand(9, 16);
  const r = rand(0, 2);
  if (r === 0) {
    const iceFirst = Math.random() < 0.5;
    const askIce = Math.random() < 0.5;
    const panel = (s: "solid" | "liquid", label: string) => ({ species: [{ count: n, colour: "wave" as const, name: "water bit" }], arrangement: s, motion: (s === "solid" ? 1 : 2) as 1 | 2, label });
    const panels = iceFirst ? [panel("solid", "A"), panel("liquid", "B")] : [panel("liquid", "A"), panel("solid", "B")];
    const iceBox = iceFirst ? "Box A" : "Box B";
    const waterBox = iceFirst ? "Box B" : "Box A";
    return ask(
      {
        key: `close-pair-${n}-${iceFirst}-${askIce}`,
        prompt: `These are tiny bits of water, up close. Which box is ${askIce ? "ice" : "runny water"}?`,
        visual: { kind: "chem-particles", panels, joiner: "vs" },
        needsVisual: true,
        hint: "In ice the bits are packed in tidy rows. In runny water they slide around.",
        explain: `${askIce ? iceBox : waterBox}. ${askIce ? "Ice has its bits packed in tidy rows." : "In runny water, the bits are jumbled and slide past each other."}`,
      },
      choose(askIce ? iceBox : waterBox, [askIce ? waterBox : iceBox], 2),
    );
  }
  const state = pick(["solid", "liquid", "gas"] as const);
  if (r === 1)
    return ask(
      {
        key: `close-name-${state}-${n}`,
        prompt: "These are tiny bits of water, up close. Is it ice, water or steam?",
        visual: { kind: "chem-particles", panels: [{ species: [{ count: n, colour: "wave", name: "water bit" }], arrangement: state, motion: state === "solid" ? 1 : state === "liquid" ? 2 : 3, label: "?" }] },
        needsVisual: true,
        hint: "Rows means ice. Jumbled and close means water. Far apart means steam.",
        explain: `${STATE_WORD[state]}. ${state === "solid" ? "The bits sit in tidy rows." : state === "liquid" ? "The bits are close but jumbled." : "The bits are far apart and zoom around."}`,
      },
      choose(STATE_WORD[state], Object.values(STATE_WORD).filter((w) => w !== STATE_WORD[state])),
    );
  const desc = { solid: "packed in tidy rows", liquid: "close together, sliding around", gas: "far apart, zooming around" } as const;
  return ask(
    {
      key: `close-desc-${state}-${n}`,
      prompt: `In ${STATE_WORD[state].toLowerCase()}, the tiny bits are…`,
      visual: { kind: "chem-particles", panels: [{ species: [{ count: n, colour: "wave", name: "water bit" }], arrangement: state, motion: state === "solid" ? 1 : state === "liquid" ? 2 : 3, label: STATE_WORD[state] }] },
      needsVisual: true,
      hint: "Look at the picture. Are the bits in rows, jumbled, or far apart?",
      explain: `${cap(desc[state])}.`,
    },
    choose(desc[state], Object.values(desc).filter((d) => d !== desc[state])),
  );
}

/** Warm and cold cups with thermometers. */
export function warmestCup(): Question {
  const temps = some(
    Array.from({ length: 16 }, (_, i) => 5 + i * 5),
    3,
  );
  const names = ["A", "B", "C"];
  const visual: Visual = { kind: "chem-beaker", panels: temps.map((t, i) => ({ glass: "beaker" as const, volume: 150, max: 250, scale: false, thermometer: t, label: names[i] })), joiner: null };
  const hi = names[temps.indexOf(Math.max(...temps))];
  const lo = names[temps.indexOf(Math.min(...temps))];
  const r = rand(0, 2);
  const others = (x: string) => names.filter((n) => n !== x).map((n) => `Cup ${n}`);
  if (r === 0)
    return ask(
      {
        key: `cups-melt-${temps.join("-")}`,
        prompt: "Ice melts fastest in the warmest water. Which cup?",
        visual,
        needsVisual: true,
        hint: "Find the thermometer with the biggest number.",
        explain: `Cup ${hi} is warmest at ${Math.max(...temps)} °C, so the ice melts fastest there.`,
      },
      choose(`Cup ${hi}`, others(hi)),
    );
  if (r === 1)
    return ask(
      {
        key: `cups-cold-${temps.join("-")}`,
        prompt: "Which cup of water is the coldest?",
        visual,
        needsVisual: true,
        hint: "Find the thermometer with the smallest number.",
        explain: `Cup ${lo} is coldest at ${Math.min(...temps)} °C.`,
      },
      choose(`Cup ${lo}`, others(lo)),
    );
  const top = Math.max(...temps);
  const bottom = Math.min(...temps);
  const d = top - bottom;
  return ask(
    {
      key: `cups-diff-${temps.join("-")}`,
      prompt: `How many degrees warmer is cup ${hi} than cup ${lo}?`,
      visual,
      needsVisual: true,
      hint: `Count up by 5s from ${bottom} to ${top}.`,
      explain: `${top} − ${bottom} = ${d}. Cup ${hi} is ${d} degrees warmer.`,
    },
    { answer: d, input: "choices", choices: makeChoices(d, { n: 3, min: 5, max: 80, likely: [d + 5, d - 5, d + 10] }) },
  );
}

const PREDICT: { s: string; yes: string; no: string[]; back: boolean; why: string }[] = [
  { s: "Flare leaves a chocolate bar 🍫 in the hot sun.", yes: "It melts.", no: ["It freezes.", "It turns into a cookie."], back: true, why: "Heat melts chocolate. In the fridge it turns hard again." },
  { s: "Flare puts juice 🧃 in the freezer.", yes: "It freezes hard.", no: ["It boils.", "It turns into popcorn."], back: true, why: "Cold freezes the juice. Warm it and it melts again." },
  { s: "A grown-up cooks a raw egg 🥚 in a hot pan.", yes: "It turns firm and white.", no: ["It melts into water.", "It freezes."], back: false, why: "Heat cooks the egg. It can't turn back into a raw egg." },
  { s: "A snowman ⛄ stands in the warm sun.", yes: "It melts into water.", no: ["It gets bigger.", "It turns into ice cream."], back: true, why: "Warmth melts snow. Water can freeze again." },
  { s: "A grown-up heats corn kernels 🌽 in a hot pot.", yes: "They pop into popcorn.", no: ["They melt.", "They freeze."], back: false, why: "Heat pops the corn. Popcorn can't turn back into kernels." },
  { s: "A puddle 💧 sits out on a freezing night.", yes: "It turns to ice.", no: ["It boils.", "It burns."], back: true, why: "Cold freezes water. In the sun it melts again." },
  { s: "A grown-up bakes cookie dough 🥣 in the oven.", yes: "It turns into cookies.", no: ["It freezes.", "It melts into water."], back: false, why: "Baking makes something new. Cookies can't go back to dough." },
  { s: "Flare puts melted chocolate 🫗 in the fridge.", yes: "It gets hard again.", no: ["It burns.", "It turns into milk."], back: true, why: "Cold makes the chocolate hard. Warm it and it melts again." },
  { s: "Flare holds an ice cube 🧊 in a warm hand.", yes: "It melts.", no: ["It gets colder and bigger.", "It turns to steam right away."], back: true, why: "Your hand warms the ice and it melts. Freeze it and it's ice again." },
  { s: "A grown-up burns paper 📄 in a fireplace.", yes: "It turns to ash and smoke.", no: ["It melts.", "It freezes."], back: false, why: "Burning makes ash and smoke. They can't turn back into paper." },
  { s: "A candle 🕯️ burns for a while.", yes: "Wax near the flame melts.", no: ["The wax freezes.", "The candle grows."], back: true, why: "The flame heats the wax and it melts. When it cools it turns hard again." },
  { s: "Flare puts butter 🧈 in a warm pan.", yes: "It melts.", no: ["It freezes.", "It turns into bread."], back: true, why: "Heat melts butter. In the fridge it turns hard again." },
];

/** Predict what heating or cooling will do. */
export function predictChange(): Question {
  const i = rand(0, PREDICT.length - 1);
  const p = PREDICT[i];
  if (Math.random() < 0.6)
    return ask(
      {
        key: `predict-${i}`,
        prompt: `${p.s} What happens?`,
        hint: "Is it getting hotter or colder? Heat melts and cooks. Cold freezes.",
        explain: `${p.yes} ${p.why}`,
      },
      choose(p.yes, p.no),
    );
  return ask(
    {
      key: `predict-back-${i}`,
      prompt: `${p.s} ${p.yes} Can it change back?`,
      hint: "Melting and freezing can be undone. Cooking, baking and burning can't.",
      explain: `${p.back ? "Yes." : "No."} ${p.why}`,
    },
    choose(p.back ? CAN : CANT, [p.back ? CANT : CAN], 2),
  );
}
