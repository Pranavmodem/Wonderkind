/**
 * Question generators for physics, ages 4–8 (Kindergarten to Grade 2): pushes and pulls, sunlight and
 * shade, sound and vibration, light and sight, and sending signals. Worlds are assembled in ./ages4to8.ts.
 *
 * These kids are just starting to read, so: a big picture on almost every question, short prompts (the
 * speech says it in full), two or three choices, and plenty of hands-on "Do it" lessons.
 */
import { bag, makeChoices, pick, rand, shuffle } from "../../questions";
import type { Activity, Question, Visual } from "../../types";

/* =================================================================== helpers */

const NONE: Visual = { kind: "none" };

interface Base {
  key: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  hint: string;
  explain: string;
}

type Ans = Pick<Question, "answer" | "input" | "choices" | "labels" | "activity" | "unit">;

function make(b: Base, a: Ans): Question {
  return {
    key: b.key,
    prompt: b.prompt,
    speech: b.speech ?? b.prompt,
    visual: b.visual ?? NONE,
    ...(b.needsVisual ? { needsVisual: true } : {}),
    hint: b.hint,
    explain: b.explain,
    ...a,
  };
}

/** Text choices that always show in the same order (Push / Pull, Yes / No…). */
function fixed(options: string[], right: string): Ans {
  const answer = options.indexOf(right);
  if (answer < 0) throw new Error(`"${right}" is not one of the options`);
  return { answer, input: "choices", choices: options.map((_, i) => i), labels: options };
}

/** Text choices: the right one plus n − 1 of the wrong ones, shuffled. */
function choose(right: string, wrong: string[], n = 3): Ans {
  const others = shuffle([...new Set(wrong)].filter((w) => w !== right)).slice(0, n - 1);
  const labels = shuffle([right, ...others]);
  return { answer: labels.indexOf(right), input: "choices", choices: labels.map((_, i) => i), labels };
}

/** Number choices around the answer. */
const numbers = (answer: number, likely: number[], min: number, max: number, unit?: string): Ans => ({
  answer,
  input: "choices",
  choices: makeChoices(answer, { n: 3, min, max, likely }),
  ...(unit ? { unit } : {}),
});

const act = (activity: Activity, answer = 1): Ans => ({ answer, input: "activity", activity });

/** One ready-made question for a bank: either `options` in a fixed order, or `right` among `wrong`. */
interface Case {
  k: string;
  prompt: string;
  speech?: string;
  right: string;
  wrong?: string[];
  options?: string[];
  n?: number;
  hint: string;
  explain: string;
  visual?: Visual;
  needsVisual?: boolean;
}

function ask(prefix: string, c: Case): Question {
  return make({ ...c, key: `${prefix}-${c.k}` }, c.options ? fixed(c.options, c.right) : choose(c.right, c.wrong ?? [], c.n ?? 3));
}

/** A generator that hands out a bank's cases in shuffled order. */
function bank(prefix: string, cases: Case[]): () => Question {
  const next = bag(cases);
  return () => ask(prefix, next());
}

/** Items for a sort activity: `per[bin]` random picks from each list. */
function sortItems(lists: string[][], per: number[]): { label: string; bin: number }[] {
  return shuffle(lists.flatMap((list, bin) => shuffle(list).slice(0, per[bin]).map((label) => ({ label, bin }))));
}

const itemsKey = (items: { label: string }[]) => items.map((i) => i.label).sort().join("|");

/** "kick a ball" → "Kick a ball". */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "⚽ kick a ball" → ["⚽", "kick a ball"]. */
function split(item: string): [string, string] {
  const at = item.indexOf(" ");
  return [item.slice(0, at), item.slice(at + 1)];
}

const scene = (...items: [string, number, number, number?][]): Visual => ({
  kind: "scene",
  items: items.map(([emoji, x, y, size]) => (size ? { emoji, x, y, size } : { emoji, x, y })),
});

const pair = (a: [string, string], b: [string, string]): Visual => ({
  kind: "pair",
  items: [
    { emoji: a[0], label: a[1], size: 1 },
    { emoji: b[0], label: b[1], size: 1 },
  ],
});

/* ======================================================= World 1: push and pull */

const PUSHES = ["⚽ kick a ball", "🔔 ring a doorbell", "🛒 roll a cart ahead", "🎳 roll a bowling ball", "🏐 hit a beach ball", "🍪 flatten some dough", "🧱 slide a block away", "🪑 tuck in a chair"];
const PULLS = ["🪁 tug a kite string", "🥕 pick a carrot", "🎣 reel in a fish", "🛷 drag a sled", "🪢 play tug of war", "🗄️ open a drawer", "🧦 put on socks", "🌱 yank out a weed"];

const PUSH = "👉 Push";
const PULL = "👈 Pull";

/** K-PS2-1 — is it a push or a pull? */
export function pushOrPull(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const isPush = Math.random() < 0.5;
    const item = pick(isPush ? PUSHES : PULLS);
    const [e, what] = split(item);
    const visual = isPush ? scene(["🧒", 20, 55, 1.4], [e, 52, 60, 1.2], ["➡️", 80, 60]) : scene(["🧒", 20, 55, 1.4], ["⬅️", 45, 60], [e, 72, 60, 1.2]);
    return make(
      {
        key: `pp-one-${item}`,
        prompt: `${cap(what)}. Push or pull?`,
        speech: `${cap(what)}. Is that a push or a pull?`,
        visual,
        hint: "A push moves a thing away from you. A pull brings it closer to you.",
        explain: isPush ? `To ${what}, you move it away from you. That's a push!` : `To ${what}, you tug it toward you. That's a pull!`,
      },
      fixed([PUSH, PULL], isPush ? PUSH : PULL),
    );
  }
  const wantPull = form === 1;
  const right = pick(wantPull ? PULLS : PUSHES);
  const wrong = shuffle(wantPull ? PUSHES : PULLS).slice(0, 2);
  const c = choose(right, wrong, 3);
  return make(
    {
      key: `pp-which-${wantPull ? "pull" : "push"}-${right}-${[...wrong].sort().join("|")}`,
      prompt: `Which one is a ${wantPull ? "pull" : "push"}?`,
      hint: wantPull ? "A pull brings a thing toward you." : "A push moves a thing away from you.",
      explain: `${cap(split(right)[1])} is a ${wantPull ? "pull: it comes toward you" : "push: it goes away from you"}.`,
    },
    c,
  );
}

/** K-PS2-1 — Do it: sort pushes and pulls. */
export function sortPushPull(): Question {
  const per = shuffle([3, rand(2, 3)]);
  const items = sortItems([PUSHES, PULLS], per);
  return make(
    {
      key: `spp-${itemsKey(items)}`,
      prompt: "Do it: sort them. Push or pull?",
      speech: "Sort each one. Is it a push, or a pull?",
      hint: "Does the thing go away from you (push) or come toward you (pull)?",
      explain: `Pushes: ${items.filter((i) => i.bin === 0).map((i) => split(i.label)[1]).join(", ")}. Pulls: ${items.filter((i) => i.bin === 1).map((i) => split(i.label)[1]).join(", ")}.`,
    },
    act({ kind: "sort", bins: [PUSH, PULL], items }, items.length),
  );
}

const MOVERS: [string, string][] = [
  ["📦", "box"],
  ["🪑", "chair"],
  ["🧺", "basket"],
  ["🛷", "sled"],
  ["🗑️", "bin"],
];
const LEFT = "⬅️ Left";
const RIGHT = "➡️ Right";
const UP = "⬆️ Up";

/** K-PS2-1 — a push or pull moves a thing in its direction. */
export function whichWay(): Question {
  const [e, name] = pick(MOVERS);
  const form = rand(0, 2);
  if (form === 0) {
    const dir = pick([0, 180, 180, 0, 90]);
    const verb = dir === 90 ? "lifts" : pick(["pushes", "pulls"]);
    const where = dir === 0 ? RIGHT : dir === 180 ? LEFT : UP;
    return make(
      {
        key: `ww-arrow-${name}-${dir}-${verb}`,
        prompt: `Flare ${verb} the ${name} this way. Where does it go?`,
        visual: { kind: "phys-forces", object: e, surface: "floor", forces: [{ dir, size: 3, label: verb === "lifts" ? "lift" : verb === "pushes" ? "push" : "pull" }] },
        needsVisual: true,
        hint: "Look at the arrow. Things move the way they are pushed or pulled.",
        explain: `The arrow points ${where.split(" ")[1].toLowerCase()}, so the ${name} moves ${where.split(" ")[1].toLowerCase()}.`,
      },
      fixed([LEFT, UP, RIGHT], where),
    );
  }
  if (form === 1) {
    const flareLeft = Math.random() < 0.5;
    const push = Math.random() < 0.5;
    // A push sends it away from Flare; a pull brings it toward Flare.
    const goesRight = flareLeft === push;
    const visual = flareLeft ? scene(["🧒", 25, 55, 1.4], [e, 60, 62, 1.2]) : scene([e, 40, 62, 1.2], ["🧒", 75, 55, 1.4]);
    return make(
      {
        key: `ww-stand-${name}-${flareLeft ? "L" : "R"}-${push ? "push" : "pull"}`,
        prompt: `Flare is on the ${flareLeft ? "left" : "right"}. Flare ${push ? "pushes" : "pulls"} the ${name}. Where does it go?`,
        visual,
        hint: push ? "A push sends it away from Flare." : "A pull brings it toward Flare.",
        explain: `A ${push ? "push sends the " + name + " away from" : "pull brings the " + name + " toward"} Flare, so it goes ${goesRight ? "right" : "left"}.`,
      },
      fixed([LEFT, RIGHT], goesRight ? RIGHT : LEFT),
    );
  }
  const wantRight = Math.random() < 0.5;
  const push = Math.random() < 0.5;
  // To push it right, stand on the left; to pull it right, stand on the right.
  const standLeft = wantRight === push;
  return make(
    {
      key: `ww-where-${name}-${wantRight ? "R" : "L"}-${push ? "push" : "pull"}`,
      prompt: `Flare wants to ${push ? "push" : "pull"} the ${name} to the ${wantRight ? "right" : "left"}. Where should Flare stand?`,
      visual: wantRight ? scene([e, 45, 60, 1.2], ["➡️", 75, 60]) : scene(["⬅️", 25, 60], [e, 55, 60, 1.2]),
      hint: push ? "You push things away from you." : "You pull things toward you.",
      explain: `To ${push ? "push" : "pull"} it ${wantRight ? "right" : "left"}, Flare stands on the ${standLeft ? "left" : "right"} side.`,
    },
    fixed(["On the left side", "On the right side"], standLeft ? "On the left side" : "On the right side"),
  );
}

const STRENGTH_CASES: Case[] = [
  { k: "tap-kick", prompt: "A gentle tap or a big kick. Which sends the ball farther?", right: "A big kick", options: ["A gentle tap", "A big kick"], hint: "A stronger push makes things go faster and farther.", explain: "A big kick is a stronger push, so the ball goes faster and farther." },
  { k: "swing-high", prompt: "Flare wants the swing to go higher. How should Flare push?", right: "Harder", options: ["Harder", "Softer"], hint: "A bigger push gives a bigger move.", explain: "A harder push makes the swing go higher." },
  { k: "car-little", prompt: "Flare wants the toy car to roll just a little way. What push?", right: "A small push", options: ["A small push", "A big push"], hint: "Small push, small move.", explain: "A small push makes it go slowly and only a little way." },
  { k: "full-cart", prompt: "Which is harder to push: an empty cart or a full cart?", right: "The full cart", options: ["The empty cart", "The full cart"], hint: "Heavy things need a bigger push to get moving.", explain: "A full cart is heavier, so it needs a bigger push." },
  { k: "wagon", prompt: "Which needs a bigger pull: a wagon with a teddy, or a wagon with three kids?", right: "Three kids", options: ["A teddy", "Three kids"], hint: "Heavier things need a bigger pull.", explain: "Three kids are much heavier than a teddy, so that wagon needs a bigger pull." },
  { k: "faster", prompt: "A harder push makes the ball go…", right: "Faster", options: ["Faster", "Slower"], hint: "Think of a gentle roll and a hard throw.", explain: "The harder you push, the faster it goes." },
  { k: "door", prompt: "A heavy door won't open. What should Flare do?", right: "Push harder", options: ["Push harder", "Push softer"], hint: "A heavy thing needs a strong push.", explain: "Pushing harder gives a bigger push, enough to move the heavy door." },
];

/** K-PS2-1 — bigger pushes and pulls make bigger changes. */
export function bigSmall(): Question {
  if (Math.random() < 0.4) return ask("bs", pick(STRENGTH_CASES));
  let a = rand(2, 10);
  let b = rand(2, 10);
  while (Math.abs(a - b) < 2) b = rand(2, 10);
  const e = pick(["⚽", "🏀", "🧸", "📦"]);
  const askHard = Math.random() < 0.6;
  const right = (askHard ? a > b : a < b) ? "A" : "B";
  return make(
    {
      key: `bs-race-${e}-${a}-${b}-${askHard ? "hard" : "soft"}`,
      prompt: `Same ${e}, two pushes. Which push was ${askHard ? "harder" : "gentler"}?`,
      speech: `Flare pushed the same thing two times, A and B. Which push was ${askHard ? "harder" : "gentler"}?`,
      visual: {
        kind: "phys-motion",
        look: "ghosts",
        track: { min: 0, max: 10, step: 1 },
        rows: [
          { name: "A", emoji: e, positions: [0, a] },
          { name: "B", emoji: e, positions: [0, b] },
        ],
      },
      needsVisual: true,
      hint: "Which one went farther? A harder push sends it farther.",
      explain: `${a > b ? "A" : "B"} went farther, so it got the harder push. ${a > b ? "B" : "A"} got the gentler push.`,
    },
    fixed(["A", "B"], right),
  );
}

const PUSH_OBJECTS: [string, "push" | "pull"][] = [
  ["📦", "push"],
  ["⚽", "push"],
  ["🧸", "push"],
  ["🛒", "push"],
  ["🛷", "pull"],
  ["🧺", "pull"],
];
const STRENGTH_SETS = [
  [1, 3, 5],
  [2, 4, 6],
  [1, 2, 4],
  [2, 3, 5],
];

/** K-PS2-1, K-PS2-2 — Do it: push to the star. */
export function pushToTarget(): Question {
  const [e, verb] = pick(PUSH_OBJECTS);
  const strengths = pick(STRENGTH_SETS);
  let start = 0;
  let target = 0;
  let k = 0;
  let d = 1;
  do {
    start = rand(0, 10);
    k = rand(0, 2);
    d = pick([1, -1]);
    target = start + d * strengths[k];
  } while (target < 0 || target > 10);
  const name = ["small", "medium", "big"][k];
  return make(
    {
      key: `ptt-${e}-${verb}-${start}-${target}-${strengths.join("")}`,
      prompt: `Do it: ${verb} the ${e} to the ⭐!`,
      speech: `${cap(verb)} it to the star! Pick a way and how hard, then tap Go.`,
      hint: `Which way is the star? Then: is it near or far? Near needs a small ${verb}, far needs a big one.`,
      explain: `The star is ${strengths[k]} ${strengths[k] === 1 ? "step" : "steps"} to the ${d > 0 ? "right" : "left"}: a ${name} ${verb} ${d > 0 ? "right" : "left"} gets it there.`,
    },
    act({ kind: "phys-pushpull", object: e, length: 10, start, strengths, target, verb }, target),
  );
}

/** K-PS2-1 — Do it: stop a rolling ball with a push the other way. */
export function stopIt(): Question {
  const e = pick(["⚽", "🏀", "🛹", "🥌", "🎳"]);
  const strengths = pick([
    [1, 2, 3],
    [2, 4, 6],
  ]);
  const k = rand(0, 2);
  const dir = pick([1, -1]);
  const rolling = dir * strengths[k];
  let start = 0;
  do start = rand(0, 10);
  while (start + rolling < 0 || start + rolling > 10);
  const speed = ["slowly", "at medium speed", "fast"][k];
  const name = ["small", "medium", "big"][k];
  return make(
    {
      key: `stop-${e}-${start}-${rolling}-${strengths.join("")}`,
      prompt: `Do it: the ${e} rolls ${dir > 0 ? "right" : "left"}, ${speed}. Stop it!`,
      speech: `The ball is rolling to the ${dir > 0 ? "right" : "left"}, ${speed}. Push it to stop it!`,
      hint: "Push the other way, just as hard as it's rolling. Too small won't stop it; too big sends it back.",
      explain: `It rolls ${dir > 0 ? "right" : "left"} ${speed}, so a ${name} push to the ${dir > 0 ? "left" : "right"} stops it.`,
    },
    act({ kind: "phys-pushpull", object: e, length: 10, start, strengths, target: "stop", rolling }, strengths[k]),
  );
}

const ROLLERS: [string, string][] = [
  ["⚽", "ball"],
  ["🏀", "basketball"],
  ["🛹", "skateboard"],
  ["🥌", "curling stone"],
];
const FASTER = "Goes faster";
const SLOWER = "Slows down";
const TURNS = "Turns";

/** K-PS2-1 — a push the same way speeds it up, the other way slows it, from the side turns it. */
export function pushChanges(): Question {
  const [e, name] = pick(ROLLERS);
  const how = pick(["same", "against", "side"] as const);
  const m = pick([0, 180]);
  const f = how === "same" ? m : how === "against" ? 180 - m : pick([90, 270]);
  const right = how === "same" ? FASTER : how === "against" ? SLOWER : TURNS;
  const words = how === "same" ? "the same way it's rolling" : how === "against" ? "the other way" : "from the side";
  return make(
    {
      key: `pc-${name}-${how}-${m}-${f}`,
      prompt: `The ${name} rolls. Flare pushes ${words}. What happens?`,
      speech: `The ${name} is rolling. Flare pushes it ${words}. What happens?`,
      visual: { kind: "phys-forces", object: e, forces: [{ dir: f, size: 3, label: "push" }], motion: { dir: m, label: "rolling" } },
      needsVisual: true,
      hint: "Compare the push arrow with the rolling arrow. Same way? Opposite way? Sideways?",
      explain:
        how === "same"
          ? `Pushing the way it's already rolling makes the ${name} go faster.`
          : how === "against"
            ? `Pushing against the way it rolls makes the ${name} slow down (or stop).`
            : `A push from the side makes the ${name} turn and change direction.`,
    },
    fixed([FASTER, SLOWER, TURNS], right),
  );
}

const RAMP_CASES: Case[] = [
  { k: "steeper", prompt: "Flare makes the ramp steeper. The car will roll down…", right: "Faster", options: ["Faster", "Slower"], visual: { kind: "phys-incline", angle: 20, angleLabel: null, object: "🚗" }, hint: "Think of a gentle hill and a steep hill on a bike.", explain: "A steeper ramp makes the car roll down faster." },
  { k: "lower", prompt: "Flare makes the ramp lower. The car will roll down…", right: "Slower", options: ["Faster", "Slower"], visual: { kind: "phys-incline", angle: 35, angleLabel: null, object: "🚗" }, hint: "A low ramp is a gentle hill.", explain: "A lower ramp is less steep, so the car rolls down slower." },
  { k: "floor", prompt: "Which floor lets the toy car roll the farthest?", right: "Smooth wood", wrong: ["Thick carpet", "Bumpy grass"], visual: pair(["🪵", "wood"], ["🌱", "grass"]), hint: "Rough, bumpy floors rub on the wheels and slow them down.", explain: "A smooth wood floor rubs the least, so the car rolls farthest." },
  { k: "slow-marble", prompt: "Flare wants the marble to roll slower. What should Flare do?", right: "Make the ramp lower", wrong: ["Make the ramp steeper", "Make the ramp more slippery"], hint: "A gentle slope gives a slow roll.", explain: "A lower ramp is less steep, so the marble rolls more slowly." },
  { k: "far-car", prompt: "Flare wants the car to go farther. Which ramp is best?", right: "A taller ramp", wrong: ["A shorter ramp", "No ramp"], hint: "Higher ramps give a faster start.", explain: "A taller ramp makes the car go faster, so it rolls farther." },
  { k: "carpet", prompt: "A ball rolls onto carpet and stops fast. Why?", right: "The carpet rubs and slows it", wrong: ["The ball gets tired", "The carpet pulls it back up"], hint: "Rough things rub on whatever slides or rolls over them.", explain: "Carpet is rough. It rubs on the ball and slows it down sooner than a smooth floor." },
  { k: "ice", prompt: "Which lets a puck slide the farthest?", right: "Ice", wrong: ["Sand", "Grass"], visual: pair(["🧊", "ice"], ["🏖️", "sand"]), hint: "The smoother and more slippery, the less it slows down.", explain: "Ice is smooth and slippery, so the puck slides far before it stops." },
];

/** K-PS2-2 — ramps and surfaces change speed; read a test to see which ramp was higher. */
export function ramps(): Question {
  if (Math.random() < 0.5) return ask("ramp", pick(RAMP_CASES));
  let a = rand(3, 10);
  let b = rand(3, 10);
  while (Math.abs(a - b) < 2) b = rand(3, 10);
  const test = pick(["ramp", "floor"] as const);
  const ramp = test === "ramp";
  const farther = a > b ? "A" : "B";
  const right = ramp ? farther : farther === "A" ? "B" : "A";
  return make(
    {
      key: `ramp-test-${test}-${a}-${b}`,
      prompt: ramp ? "Two cars, two ramps. Which car came down the higher ramp?" : "Two cars rolled. One rolled on carpet. Which one?",
      speech: ramp
        ? "Flare tested two ramps, one high and one low. Which car came down the higher ramp?"
        : "Flare rolled two cars the same way. One rolled on smooth wood and one on carpet. Which one rolled on carpet?",
      visual: {
        kind: "phys-motion",
        look: "ghosts",
        track: { min: 0, max: 10, step: 1 },
        rows: [
          { name: "A", emoji: "🚗", flip: true, positions: [0, a] },
          { name: "B", emoji: "🚗", flip: true, positions: [0, b] },
        ],
      },
      needsVisual: true,
      hint: ramp ? "A higher ramp makes a faster car. Which car went farther?" : "Carpet rubs and slows a car. Which car stopped sooner?",
      explain: ramp
        ? `Car ${farther} went farther, so it was going faster: it came down the higher ramp.`
        : `Car ${right} stopped sooner. The carpet rubbed on it and slowed it down.`,
    },
    fixed(["A", "B"], right),
  );
}

/** K-PS2-2 — Do it: order pushes from smallest to biggest by how far the balls went. */
export function orderPushes(): Question {
  const ds = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3);
  const names = ["A", "B", "C"];
  const e = pick(["⚽", "🏀", "🥎"]);
  const order = names.map((n, i) => ({ n, d: ds[i] })).sort((x, y) => x.d - y.d);
  return make(
    {
      key: `op-${e}-${ds.join("-")}`,
      prompt: "Do it: put the pushes in order, smallest push first.",
      speech: "Three balls got three different pushes. Tap them from the smallest push to the biggest push.",
      visual: {
        kind: "phys-motion",
        look: "ghosts",
        track: { min: 0, max: 10, step: 1 },
        rows: names.map((n, i) => ({ name: n, emoji: e, positions: [0, ds[i]] })),
      },
      needsVisual: true,
      hint: "The ball that went the shortest way got the smallest push.",
      explain: `${order.map((o) => o.n).join(", ")}: the farther a ball went, the bigger its push.`,
    },
    act({ kind: "order", items: order.map((o) => o.n), direction: "Smallest push → biggest push" }, ds.length),
  );
}

const HARDER = "Kick harder";
const SOFTER = "Kick softer";
const OTHER = "Kick the other way";

/** K-PS2-2 — test a kick, then change the design: harder, softer, or the other way. */
export function fixTheKick(): Question {
  const right = pick([HARDER, SOFTER, OTHER]);
  const flip = Math.random() < 0.5;
  const s = rand(1, 3);
  const g = right === SOFTER ? rand(s + 3, 8) : rand(s + 4, 10);
  const e = right === HARDER ? rand(s + 1, g - 1) : right === SOFTER ? rand(g + 1, 10) : rand(0, s - 1);
  const x = (u: number) => (flip ? 10 - u : u);
  return make(
    {
      key: `ftk-${s}-${e}-${g}-${flip ? "L" : "R"}`,
      prompt: "Flare kicked the ⚽ at the 🚩. What should Flare try next?",
      speech: "Flare kicked the ball to reach the flag. Look where it stopped. What should Flare try next time?",
      visual: { kind: "phys-motion", look: "ghosts", track: { min: 0, max: 10, step: 1 }, rows: [{ emoji: "⚽", positions: [x(s), x(e)] }], finish: x(g) },
      needsVisual: true,
      hint: "Did the ball stop before the flag, go past it, or go the wrong way?",
      explain:
        right === HARDER
          ? "The ball stopped before the flag. A harder kick sends it farther."
          : right === SOFTER
            ? "The ball rolled past the flag. A softer kick won't send it as far."
            : "The ball went the wrong way! Kick it toward the flag.",
    },
    fixed([HARDER, SOFTER, OTHER], right),
  );
}

/* ========================================================= World 2: sun and shade */

const SUNNY = "☀️ In the sun";
const SHADY = "🌳 In the shade";
const SUN_THINGS: [string, string][] = [
  ["🪨", "rock"],
  ["🛝", "slide"],
  ["🪑", "chair"],
  ["🪣", "bucket of water"],
  ["⚽", "ball"],
  ["🚲", "bike"],
  ["🧸", "teddy"],
];

/** K-PS3-1 — sunlight warms things up. */
export function sunOrShade(): Question {
  const [e, name] = pick(SUN_THINGS);
  if (Math.random() < 0.7) {
    const warmer = Math.random() < 0.6;
    return make(
      {
        key: `sos-${name}-${warmer ? "warm" : "cool"}`,
        prompt: `Which ${name} is ${warmer ? "warmer" : "cooler"}?`,
        speech: `One ${name} is in the sun. One is in the shade of the tree. Which one is ${warmer ? "warmer" : "cooler"}?`,
        visual: scene(["☀️", 12, 12, 1.4], [e, 28, 75], ["🌳", 78, 42, 2.2], [e, 80, 80]),
        hint: "Sunlight warms things. Shade blocks the sunlight.",
        explain: warmer ? `The ${name} in the sun is warmer. Sunlight warms it up.` : `The ${name} in the shade is cooler. The tree blocks the sunlight.`,
      },
      fixed([SUNNY, SHADY], warmer ? SUNNY : SHADY),
    );
  }
  const asks: Case[] = [
    { k: `what-${name}`, prompt: `What warms the ${name} on a sunny day?`, right: "Sunlight", wrong: ["The Moon", "The wind"], visual: scene(["☀️", 20, 20, 1.6], [e, 60, 72, 1.3]), hint: "Look up on a sunny day!", explain: `Light from the Sun shines on the ${name} and warms it.` },
    { k: `morning-${name}`, prompt: `The ${name} sat in the sun all morning. How does it feel?`, right: "Warm", options: ["Warm", "Cold"], visual: scene(["☀️", 20, 20, 1.6], [e, 60, 72, 1.3]), hint: "What does sunshine do to things it shines on?", explain: `Sunlight warmed the ${name} all morning, so it feels warm.` },
  ];
  return ask("sos", pick(asks));
}

/** K-PS3-1 — two thermometers: which one is in the sun? */
export function thermoSunShade(): Question {
  const shade = 2 * rand(7, 12);
  const sun = shade + 2 * rand(3, 7);
  const sunFirst = Math.random() < 0.5;
  const temps = sunFirst ? [sun, shade] : [shade, sun];
  const form = pick(["sun", "shade", "warmer", "cooler"] as const);
  const sunName = sunFirst ? "A" : "B";
  const shadeName = sunFirst ? "B" : "A";
  const right = form === "sun" || form === "warmer" ? sunName : shadeName;
  const prompt =
    form === "sun"
      ? "One is in the sun, one in the shade. Which is in the sun?"
      : form === "shade"
        ? "One is in the sun, one in the shade. Which is in the shade?"
        : `Which thermometer shows it is ${form}?`;
  return make(
    {
      key: `tss-${temps.join("-")}-${form}`,
      prompt,
      speech: `Look at the two thermometers. ${prompt}`,
      visual: { kind: "phys-thermo", scene: "thermometer", min: 0, max: 40, step: 2, labelStep: 10, thermometers: temps.map((temp, i) => ({ temp, label: ["A", "B"][i] })) },
      needsVisual: true,
      hint: "The red goes up higher when it is warmer. Sunlight warms things.",
      explain: `${sunName} is higher, so it's warmer: it's in the sun. ${shadeName} is lower: it's in the shade.`,
    },
    fixed(["A", "B"], right),
  );
}

const SURFACES: { k: string; hot: [string, string]; cool: [string, string]; why: string }[] = [
  { k: "beach", hot: ["🏖️", "sand"], cool: ["🌊", "sea water"], why: "Sand warms up fast in the sun. Water warms up slowly." },
  { k: "shirt", hot: ["🖤", "black shirt"], cool: ["🤍", "white shirt"], why: "Dark colours soak up more sunlight. Light colours bounce more of it away." },
  { k: "path", hot: ["🛣️", "blacktop"], cool: ["🌱", "grass"], why: "Dark blacktop soaks up sunlight and gets very hot. Grass stays cooler." },
  { k: "pool", hot: ["🪨", "stone path"], cool: ["🏊", "pool water"], why: "Stone warms up fast in the sun. The pool water warms up slowly." },
  { k: "car", hot: ["🚗", "shut car"], cool: ["🌳", "seat in shade"], why: "Sunlight shines into the shut car and warms it a lot. Shade blocks the sunlight." },
  { k: "rocks", hot: ["⚫", "dark rock"], cool: ["⚪", "pale rock"], why: "Dark things soak up more sunlight, so they warm up more." },
  { k: "sill", hot: ["🪟", "sunny window sill"], cool: ["🚪", "dark closet"], why: "The window sill gets sunlight. The dark closet gets none." },
];

/** K-PS3-1 — some surfaces warm up more in sunlight than others. */
export function surfaces(): Question {
  const s = pick(SURFACES);
  const hotter = Math.random() < 0.6;
  const items = Math.random() < 0.5 ? [s.hot, s.cool] : [s.cool, s.hot];
  const right = hotter ? s.hot[1] : s.cool[1];
  return make(
    {
      key: `surf-${s.k}-${hotter ? "hot" : "cool"}-${items[0][1]}`,
      prompt: `Same sunny day. Which gets ${hotter ? "hotter" : "less hot"}?`,
      speech: `On a sunny afternoon, which gets ${hotter ? "hotter" : "less hot"}: the ${items[0][1]} or the ${items[1][1]}?`,
      visual: pair(items[0], items[1]),
      hint: "Dark things, sand and stone warm up fast. Water and shady places stay cooler.",
      explain: `The ${s.hot[1]} gets hotter. ${s.why}`,
    },
    fixed(
      items.map((i) => cap(i[1])),
      cap(right),
    ),
  );
}

const SUN_PLACES = ["in the sun", "on a sunny step", "by a sunny window"];
const SHADE_PLACES = ["in the shade", "under a tree", "under an umbrella", "in a dark shed"];

/** K-PS3-1 — Do it: sort things into warm (in sunlight) and cool (in shade). */
export function sortWarmCool(): Question {
  const things = shuffle(SUN_THINGS).slice(0, 6);
  const nSun = rand(2, 4);
  const items = shuffle(
    things.map(([e, name], i) => {
      const sunny = i < nSun;
      return { label: `${e} ${name} ${pick(sunny ? SUN_PLACES : SHADE_PLACES)}`, bin: sunny ? 0 : 1 };
    }),
  );
  return make(
    {
      key: `swc-${itemsKey(items)}`,
      prompt: "Do it: sort them. Warm or cool?",
      speech: "Sort each one. Is it warm, or cool?",
      hint: "Is the sunlight shining on it? Then it's warm.",
      explain: "Things in sunlight get warm. Things in shade stay cool, because the sunlight is blocked.",
    },
    act({ kind: "sort", bins: ["☀️ Warm", "🌳 Cool"], items }, items.length),
  );
}

/** K-PS3-1 — read numbers on sun and shade thermometers. */
export function sunTest(): Question {
  const shade = 2 * rand(6, 12);
  const sun = shade + 2 * rand(2, 6);
  const sunFirst = Math.random() < 0.5;
  const ts = sunFirst
    ? [
        { temp: sun, label: "sun" },
        { temp: shade, label: "shade" },
      ]
    : [
        { temp: shade, label: "shade" },
        { temp: sun, label: "sun" },
      ];
  const form = pick(["sun", "shade", "diff", "diff"] as const);
  const visual: Visual = { kind: "phys-thermo", scene: "thermometer", min: 0, max: 40, step: 2, labelStep: 10, thermometers: ts };
  if (form === "diff") {
    const d = sun - shade;
    return make(
      {
        key: `st-diff-${sun}-${shade}-${sunFirst ? 1 : 0}`,
        prompt: "How many degrees warmer is it in the sun?",
        speech: `The sun thermometer says ${sun} degrees. The shade one says ${shade} degrees. How many degrees warmer is it in the sun?`,
        visual,
        needsVisual: true,
        hint: `Count up from ${shade} to ${sun}. Each small line is 2 degrees.`,
        explain: `${sun} − ${shade} = ${d}. The sun made it ${d} degrees warmer.`,
      },
      numbers(d, [d + 2, d - 2, sun, d + 10], 1, 40, "°C"),
    );
  }
  const t = form === "sun" ? sun : shade;
  return make(
    {
      key: `st-read-${form}-${sun}-${shade}-${sunFirst ? 1 : 0}`,
      prompt: `What does the ${form} thermometer say?`,
      visual,
      needsVisual: true,
      hint: "Find the top of the red. Count by 2s up from the 10 or 20 just below it.",
      explain: `The ${form} thermometer reads ${t} °C.${form === "sun" ? " Sunlight warmed it." : " Shade kept it cooler."}`,
    },
    numbers(t, [t + 2, t - 2, t + 10, t - 10], 0, 40, "°C"),
  );
}

const MATERIALS: { name: string; emoji: string; type: "transparent" | "translucent" | "opaque" | "mirror" }[] = [
  { name: "glass", emoji: "🪟", type: "transparent" },
  { name: "clear plastic", emoji: "🫙", type: "transparent" },
  { name: "clear water", emoji: "💧", type: "transparent" },
  { name: "wax paper", emoji: "📜", type: "translucent" },
  { name: "tissue paper", emoji: "🧻", type: "translucent" },
  { name: "thin sheet", emoji: "🏳️", type: "translucent" },
  { name: "wood", emoji: "🪵", type: "opaque" },
  { name: "cardboard", emoji: "📦", type: "opaque" },
  { name: "brick", emoji: "🧱", type: "opaque" },
  { name: "book", emoji: "📕", type: "opaque" },
  { name: "mirror", emoji: "🪞", type: "mirror" },
];

const LOTS = "Lots of shade";
const LITTLE = "A little shade";
const NO_SHADE = "No shade";
const SHADE_ROOFS: { label: string; emoji?: string; type: "transparent" | "translucent" | "opaque" }[] = [
  { label: "wood board", type: "opaque" },
  { label: "umbrella", emoji: "⛱️", type: "opaque" },
  { label: "cardboard", type: "opaque" },
  { label: "tree", emoji: "🌳", type: "opaque" },
  { label: "thick blanket", type: "opaque" },
  { label: "thin sheet", type: "translucent" },
  { label: "wax paper", type: "translucent" },
  { label: "tissue paper", type: "translucent" },
  { label: "clear glass", type: "transparent" },
  { label: "clear plastic", type: "transparent" },
];

/** K-PS3-2 — which things make shade? */
export function whatMakesShade(): Question {
  const m = pick(SHADE_ROOFS);
  const right = m.type === "opaque" ? LOTS : m.type === "translucent" ? LITTLE : NO_SHADE;
  const roof = Math.random() < 0.5;
  const what = m.type === "opaque" ? "blocks the sunlight" : m.type === "translucent" ? "lets some sunlight through" : "lets the sunlight right through";
  return make(
    {
      key: `wms-${m.label}-${roof ? "roof" : "under"}`,
      prompt: roof ? `A ${m.label} roof over the sandbox. How much shade?` : `The Sun shines on a ${m.label}. How much shade is behind it?`,
      visual: { kind: "phys-rays", scene: "beam", source: "sun", block: { type: m.type, label: m.label, ...(m.emoji ? { emoji: m.emoji } : {}) } },
      needsVisual: true,
      hint: "Shade is where sunlight is blocked. Does light get through?",
      explain: `A ${m.label} ${what}, so it makes ${right.toLowerCase()}.`,
    },
    fixed([LOTS, LITTLE, NO_SHADE], right),
  );
}

/** K-PS3-2 — Do it: pick a material that blocks the light (shade), or one that lets it in (a sunny window). */
export function blockTheSun(): Question {
  const want = pick(["block", "block", "pass", "dim"] as const);
  const type = want === "block" ? "opaque" : want === "pass" ? "transparent" : "translucent";
  const yes = pick(MATERIALS.filter((m) => m.type === type));
  const no = shuffle(MATERIALS.filter((m) => m.type !== type && m.type !== "mirror")).slice(0, rand(2, 3));
  const materials = shuffle([yes, ...no]);
  const prompt =
    want === "block"
      ? "Do it: make shade! Pick a roof that blocks the light."
      : want === "pass"
        ? "Do it: a plant needs sun. Pick a window that lets light in."
        : "Do it: pick a curtain that lets just a little light in.";
  return make(
    {
      key: `bts-${want}-${materials.map((m) => m.name).join("|")}`,
      prompt,
      speech: `${prompt.replace("Do it: ", "")} Tap a material to put it in the light.`,
      hint: want === "block" ? "Shade needs something light can't get through." : want === "pass" ? "Pick something you can see right through." : "Pick something light shines through, but you can't see clearly through.",
      explain:
        want === "block"
          ? `${cap(yes.name)} blocks the light, so it makes shade.`
          : want === "pass"
            ? `${cap(yes.name)} lets the sunlight through to warm the plant.`
            : `${cap(yes.name)} lets only some light through.`,
    },
    act({ kind: "phys-material", materials, want }),
  );
}

const DESIGN_CASES: Case[] = [
  { k: "sandbox-roof", prompt: "Flare wants a cool sandbox. Which roof is best?", right: "A wooden board", wrong: ["Clear plastic", "A net with big holes"], visual: scene(["☀️", 15, 15, 1.4], ["🏖️", 60, 75, 1.6]), hint: "A good shade blocks the sunlight.", explain: "A wooden board blocks the sunlight, so the sand under it stays cool." },
  { k: "dog-where", prompt: "Where should the umbrella go to shade the dog?", right: "Between the sun and the dog", wrong: ["Behind the dog, away from the sun", "Far away from the dog"], visual: scene(["☀️", 15, 15, 1.4], ["🐕", 70, 75, 1.4]), hint: "The umbrella must block the sunlight before it reaches the dog.", explain: "Put it between the sun and the dog so it blocks the sunlight from reaching the dog." },
  { k: "big-small", prompt: "A big umbrella or a tiny one: which shades more kids?", right: "The big one", options: ["The big one", "The tiny one"], visual: { kind: "pair", items: [{ emoji: "⛱️", label: "big", size: 1.3 }, { emoji: "⛱️", label: "tiny", size: 0.6 }] }, hint: "A bigger roof blocks more sunlight.", explain: "The big umbrella blocks more sunlight, so its shade is bigger." },
  { k: "cat-bed", prompt: "Flare builds a shade for the cat's bed. Which wall material?", right: "Cardboard", wrong: ["Clear glass", "Clear plastic"], visual: scene(["☀️", 15, 15, 1.4], ["🐈", 65, 75, 1.4]), hint: "Can light shine through it?", explain: "Cardboard blocks sunlight. Clear glass and plastic let it through, so they make no shade." },
  { k: "picnic", prompt: "It's hot at the picnic. How can Flare make a cool spot?", right: "Sit under a tree", wrong: ["Sit in the open sun", "Wear a black shirt"], visual: scene(["☀️", 15, 15, 1.4], ["🧺", 40, 78], ["🌳", 75, 50, 2]), hint: "Find somewhere the sunlight is blocked.", explain: "A tree's leaves block the sunlight, so it's cooler under the tree." },
  { k: "shade-moves", prompt: "The tree's shade moves during the day. Why?", right: "The Sun moves across the sky", wrong: ["The tree walks", "The wind blows the shade"], visual: scene(["☀️", 15, 15, 1.4], ["🌳", 55, 55, 2]), hint: "Where is the Sun in the morning, and in the evening?", explain: "The Sun's place in the sky changes during the day, so the shade moves too." },
  { k: "bike-seat", prompt: "Flare's bike seat gets too hot. What helps?", right: "Park it in the shade", wrong: ["Park it in the sun", "Paint it black"], visual: scene(["☀️", 15, 15, 1.4], ["🚲", 60, 75, 1.4]), hint: "Keep the sunlight off it.", explain: "In the shade, sunlight can't reach the seat, so it stays cooler." },
  { k: "playground", prompt: "The slide gets too hot. Which design keeps it cool?", right: "A roof over the slide", wrong: ["A shiny metal slide", "A slide in the open"], visual: scene(["☀️", 15, 15, 1.4], ["🛝", 60, 72, 1.6]), hint: "What blocks sunlight from reaching the slide?", explain: "A roof blocks the sunlight from the slide, so it stays cool." },
  { k: "test-fair", prompt: "Flare tests two shades. What must be the same?", right: "Both in the same sunny spot", wrong: ["One in sun, one in shade", "One tested at night"], hint: "A fair test changes only one thing.", explain: "Put both shades in the same sunny spot at the same time, so only the shade is different." },
  { k: "hat", prompt: "Which hat keeps the sun off Flare's face best?", right: "A wide hat", options: ["A wide hat", "A tiny cap"], visual: { kind: "pair", items: [{ emoji: "👒", label: "wide", size: 1.2 }, { emoji: "🧢", label: "tiny", size: 0.7 }] }, hint: "A wider brim blocks more sunlight.", explain: "The wide hat blocks more sunlight, so it makes more shade on Flare's face." },
  { k: "bird-bath", prompt: "The bird bath water gets too warm. What should Flare do?", right: "Move it into the shade", wrong: ["Move it into the sun", "Add more water in the sun"], visual: scene(["☀️", 15, 15, 1.4], ["🐦", 60, 70, 1.2]), hint: "Sunlight warms water.", explain: "In the shade, sunlight can't warm the water, so it stays cooler." },
  { k: "tent", prompt: "Which tent is cooler on a sunny day?", right: "A thick tent", wrong: ["A see-through tent", "A tent with no roof"], visual: scene(["☀️", 15, 15, 1.4], ["⛺", 60, 72, 1.6]), hint: "Which one blocks the most sunlight?", explain: "A thick tent blocks the sunlight, so it's cooler inside." },
];

/** K-PS3-2 — design a shade: what, where and how big. */
export const designShade = bank("ds", DESIGN_CASES);

const ROOFS_SHADE = ["🪵 wood board", "📦 cardboard", "⛱️ beach umbrella", "🧥 thick blanket", "🍃 leafy branches", "🧱 brick wall"];
const ROOFS_SUN = ["🪟 clear glass", "🫙 clear plastic", "🥅 net with big holes", "🫧 bubble wrap"];

/** K-PS3-2 — Do it: sort roofs that make shade and ones that let the sun through. */
export function sortRoofs(): Question {
  const items = sortItems([ROOFS_SHADE, ROOFS_SUN], [rand(2, 4), rand(2, 3)]);
  return make(
    {
      key: `sr-${itemsKey(items)}`,
      prompt: "Do it: sort the roofs. Shade or sunny?",
      speech: "Sort each roof. Does it make shade, or let the sun through?",
      hint: "If light can't get through it, it makes shade.",
      explain: "Thick things that light can't pass through make shade. Clear things and big holes let the sun through.",
    },
    act({ kind: "sort", bins: ["🌳 Makes shade", "☀️ Lets sun in"], items }, items.length),
  );
}

const SHADE_DESIGNS: [string, number][] = [
  ["no roof", 0],
  ["net", 1],
  ["sheet", 2],
  ["wax paper", 2],
  ["wood", 3],
  ["umbrella", 3],
  ["cardboard", 3],
];

/** K-PS3-2 — test shade designs with thermometers. */
export function testShades(): Question {
  const ranks = shuffle([0, 1, 2, 3]).slice(0, 3);
  const picks = ranks.map((r) => pick(SHADE_DESIGNS.filter((d) => d[1] === r)));
  const base = 2 * rand(8, 10);
  const ts = picks.map(([label, r]) => ({ temp: base + (3 - r) * 4, label }));
  const form = pick(["coolest", "hottest", "best"] as const);
  const cool = picks[ranks.indexOf(Math.max(...ranks))][0];
  const hot = picks[ranks.indexOf(Math.min(...ranks))][0];
  const right = form === "hottest" ? hot : cool;
  const prompt =
    form === "coolest" ? "Which roof kept the sand coolest?" : form === "hottest" ? "Which spot got the most sun?" : "Which is the best shade for a sandbox?";
  return make(
    {
      key: `tsh-${picks.map((p) => p[0]).join("|")}-${form}`,
      prompt,
      speech: `Flare put a thermometer under each roof in the sun. ${prompt}`,
      visual: { kind: "phys-thermo", scene: "thermometer", min: 0, max: 40, step: 2, labelStep: 10, thermometers: ts },
      needsVisual: true,
      hint: "The lowest red is the coolest. The highest red got the most sunlight.",
      explain:
        form === "hottest"
          ? `"${hot}" is highest: the most sunlight got through there.`
          : `"${cool}" is lowest: it blocked the most sunlight, so the sand stayed coolest.`,
    },
    fixed(
      picks.map((p) => p[0]),
      right,
    ),
  );
}

/* ================================================================ World 3: sound */

type Source = "drum" | "string" | "fork" | "speaker" | "bell";
const SOURCES: [Source, string][] = [
  ["drum", "drum"],
  ["string", "guitar string"],
  ["fork", "tuning fork"],
  ["speaker", "speaker"],
  ["bell", "bell"],
];
const vib = (source: Source, extra: Partial<{ rings: number; pitch: "high" | "mid" | "low"; loud: boolean; ear: boolean; label: string }> = {}): Visual => ({
  kind: "phys-sound",
  scene: "vibrate",
  source,
  animate: true,
  ...extra,
});

const MAKES_CASES: Case[] = [
  { k: "throat", prompt: "Hum and touch your throat. What do you feel?", right: "A buzz: it's shaking", wrong: ["Nothing at all", "It gets cold"], visual: scene(["🗣️", 50, 55, 2]), hint: "Try it! Hum and feel.", explain: "Your throat vibrates (shakes fast) when you hum. That shaking makes the sound." },
  { k: "band", prompt: "Pluck a stretched rubber band. What does it do?", right: "It wiggles fast and twangs", wrong: ["It stays still and twangs", "It melts"], hint: "Watch it closely after you pluck it.", explain: "The rubber band vibrates back and forth very fast. That makes the twang." },
  { k: "bee", prompt: "A bee's wings beat very fast. What do you hear?", right: "A buzz", wrong: ["Nothing", "A bark"], visual: scene(["🐝", 50, 50, 2]), hint: "Fast-shaking things make sound.", explain: "The wings shake back and forth very fast, and that makes the buzz." },
  { k: "glass", prompt: "Tap a glass with a spoon. What makes the ding?", right: "The glass shakes fast", wrong: ["The spoon gets hot", "The glass glows"], visual: scene(["🥄", 35, 55, 1.4], ["🥛", 62, 58, 1.6]), hint: "Lightly touch the glass after you tap it.", explain: "The glass vibrates after you tap it. The shaking makes the ding." },
];

/** 1-PS4-1 — vibrating things make sound. */
export function whatMakesSound(): Question {
  if (Math.random() < 0.3) return ask("wms", pick(MAKES_CASES));
  const [source, name] = pick(SOURCES);
  if (Math.random() < 0.5)
    return make(
      {
        key: `wms-doing-${source}`,
        prompt: `What is the ${name} doing to make sound?`,
        visual: vib(source),
        hint: "Look at the little lines next to it. Is it still, or moving?",
        explain: `The ${name} is vibrating: shaking back and forth very fast. That makes the sound.`,
      },
      choose("Shaking fast (vibrating)", ["Getting hot", "Standing still", "Glowing"], 3),
    );
  return make(
    {
      key: `wms-stops-${source}`,
      prompt: `The ${name} stops shaking. What happens to the sound?`,
      visual: vib(source),
      hint: "Sound comes from the shaking.",
      explain: `No shaking, no sound! When the ${name} stops vibrating, the sound stops.`,
    },
    fixed(["It stops", "It gets louder", "It stays the same"], "It stops"),
  );
}

const LOUD = "🔊 Loud";
const SOFT = "🔈 Soft";
const LOUD_CASES: Case[] = [
  { k: "drum-harder", prompt: "Flare hits the drum harder. The sound gets…", right: "Louder", options: ["Louder", "Softer"], visual: vib("drum", { rings: 4, loud: true }), hint: "A harder hit makes bigger shakes.", explain: "Hitting harder makes the drum shake more, so the sound is louder." },
  { k: "bell-gentle", prompt: "Flare taps the bell very gently. The sound is…", right: "Soft", options: ["Loud", "Soft"], visual: vib("bell", { rings: 1 }), hint: "A gentle tap makes small shakes.", explain: "A gentle tap makes small vibrations, so the sound is soft." },
  { k: "big-shakes", prompt: "Big shakes make a … sound.", right: "Loud", options: ["Loud", "Soft"], hint: "Think of banging a drum hard.", explain: "Big vibrations make loud sounds." },
  { k: "small-shakes", prompt: "Tiny shakes make a … sound.", right: "Soft", options: ["Loud", "Soft"], hint: "Think of a gentle tap.", explain: "Small vibrations make soft sounds." },
  { k: "pluck", prompt: "Flare plucks the string harder. The sound gets…", right: "Louder", options: ["Louder", "Softer"], visual: vib("string", { rings: 4, loud: true }), hint: "A harder pluck makes a bigger shake.", explain: "The string swings farther when plucked harder, so the sound is louder." },
];

/** 1-PS4-1 — big vibrations are loud, small ones are soft. */
export function loudSoft(): Question {
  if (Math.random() < 0.35) return ask("ls", pick(LOUD_CASES));
  const [source, name] = pick(SOURCES);
  const loud = Math.random() < 0.5;
  return make(
    {
      key: `ls-${source}-${loud ? "loud" : "soft"}`,
      prompt: `Is the ${name} loud or soft?`,
      visual: vib(source, loud ? { rings: 4, loud: true } : { rings: 1 }),
      needsVisual: true,
      hint: "Many big waves mean a loud sound. One small wave means a soft sound.",
      explain: loud ? `The ${name} is shaking a lot, making big waves: a loud sound.` : `The ${name} is shaking only a little: a soft sound.`,
    },
    fixed([LOUD, SOFT], loud ? LOUD : SOFT),
  );
}

const HIGH = "High";
const LOW = "Low";
const PITCH_PAIRS: { k: string; small: [string, string]; big: [string, string]; what: string }[] = [
  { k: "string", small: ["🎻", "short string"], big: ["🎸", "long string"], what: "Short strings shake faster" },
  { k: "bell", small: ["🔔", "small bell"], big: ["🔔", "big bell"], what: "Small bells shake faster" },
  { k: "drum", small: ["🥁", "small drum"], big: ["🥁", "big drum"], what: "Small drums shake faster" },
];

/** 1-PS4-1 — fast vibrations make high sounds, slow ones make low sounds. */
export function highLow(): Question {
  const form = rand(0, 3);
  if (form <= 1) {
    const [source, name] = pick(SOURCES);
    const high = Math.random() < 0.5;
    return make(
      {
        key: `hl-${source}-${high ? "high" : "low"}`,
        prompt: `Is the ${name} making a high sound or a low sound?`,
        visual: vib(source, { rings: 3, pitch: high ? "high" : "low" }),
        needsVisual: true,
        hint: "Waves close together come from fast shaking: a high sound. Far apart: a low sound.",
        explain: high ? "The waves are close together. Fast shaking makes a high sound, like a bird's tweet." : "The waves are far apart. Slow shaking makes a low sound, like a bear's growl.",
      },
      fixed([HIGH, LOW], high ? HIGH : LOW),
    );
  }
  if (form === 2) {
    const p = pick(PITCH_PAIRS);
    const askHigh = Math.random() < 0.5;
    const flip = Math.random() < 0.5;
    const a = flip ? p.big : p.small;
    const b = flip ? p.small : p.big;
    return make(
      {
        key: `hl-pair-${p.k}-${askHigh ? "high" : "low"}-${flip ? 1 : 0}`,
        prompt: `Which one makes the ${askHigh ? "higher" : "lower"} sound?`,
        visual: {
          kind: "pair",
          items: [
            { emoji: a[0], label: a[1], size: a === p.small ? 0.7 : 1.3 },
            { emoji: b[0], label: b[1], size: b === p.small ? 0.7 : 1.3 },
          ],
        },
        hint: "Small, short things shake faster. Fast shaking sounds high.",
        explain: `${p.what}, so the ${p.small[1]} sounds higher and the ${p.big[1]} sounds lower.`,
      },
      fixed([cap(a[1]), cap(b[1])], cap(askHigh ? p.small[1] : p.big[1])),
    );
  }
  const fast = Math.random() < 0.5;
  return make(
    {
      key: `hl-rule-${fast ? "fast" : "slow"}`,
      prompt: `${fast ? "Fast" : "Slow"} shaking makes a … sound.`,
      visual: vib("fork", { rings: 3, pitch: fast ? "high" : "low" }),
      hint: "A mouse squeak shakes fast. An elephant rumble shakes slowly.",
      explain: fast ? "Fast vibrations make high sounds." : "Slow vibrations make low sounds.",
    },
    fixed([HIGH, LOW], fast ? HIGH : LOW),
  );
}

const MOVES_WRONG = ["Nothing happens", "It melts", "It changes colour", "It gets cold"];
const MOVES_CASES: Case[] = [
  { k: "rice", prompt: "Rice sits on a drum. Flare bangs a pot nearby. The rice…", right: "Jumps", wrong: MOVES_WRONG, visual: scene(["🥁", 35, 65, 1.6], ["🍚", 35, 40], ["🍳", 75, 55, 1.4]), hint: "The sound travels through the air to the drum.", explain: "The sound from the pot makes the drum skin vibrate, and the rice bounces." },
  { k: "speaker", prompt: "Touch a speaker playing loud music. What do you feel?", right: "It buzzes and shakes", wrong: MOVES_WRONG, visual: vib("speaker", { rings: 4, loud: true }), hint: "Sound is shaking.", explain: "The speaker vibrates to make the sound, and you can feel the shaking." },
  { k: "truck", prompt: "A big truck rumbles past. What does the window do?", right: "Shakes a little", wrong: MOVES_WRONG, visual: scene(["🚚", 25, 65, 1.6], ["🪟", 75, 50, 1.6]), hint: "Loud sounds can shake things they reach.", explain: "The rumble is a loud sound. It makes the window glass vibrate." },
  { k: "thunder", prompt: "Loud thunder booms. What do the dishes do?", right: "Rattle", wrong: MOVES_WRONG, visual: scene(["⛈️", 30, 30, 1.6], ["🍽️", 70, 70, 1.4]), hint: "Big sounds make things shake.", explain: "The boom of thunder shakes the air, and that makes the dishes rattle." },
  { k: "balloon", prompt: "Hold a balloon while a friend talks close to it. You feel…", right: "The balloon tingle", wrong: MOVES_WRONG, visual: scene(["🎈", 40, 50, 1.8], ["🗣️", 75, 55, 1.4]), hint: "The voice is a sound, and sound shakes things.", explain: "Your friend's voice makes the balloon vibrate, so it tingles in your hands." },
  { k: "fork-water", prompt: "A ringing tuning fork touches water. The water…", right: "Splashes", wrong: MOVES_WRONG, visual: vib("fork", { rings: 3 }), hint: "The fork is shaking fast.", explain: "The vibrating fork shakes the water and makes little splashes." },
  { k: "fork-ball", prompt: "A ringing tuning fork touches a ping-pong ball. The ball…", right: "Bounces away", wrong: MOVES_WRONG, visual: vib("fork", { rings: 3 }), hint: "The fork is shaking fast.", explain: "The vibrating fork knocks the ball again and again, so it bounces away." },
  { k: "candle", prompt: "A loud speaker plays a low note near a candle. The flame…", right: "Flickers", wrong: MOVES_WRONG, visual: scene(["📢", 30, 55, 1.6], ["🕯️", 72, 55, 1.6]), hint: "Sound shakes the air.", explain: "The sound shakes the air, and the moving air makes the flame flicker." },
  { k: "why-rice", prompt: "Why did the rice on the drum jump?", right: "Sound made the drum shake", wrong: ["The rice was hungry", "The wind blew it", "The drum got hot"], visual: scene(["🥁", 40, 65, 1.6], ["🍚", 40, 40]), hint: "What travels from the noise to the drum?", explain: "Sound traveled through the air and made the drum skin vibrate. The shaking drum bounced the rice." },
  { k: "guitars", prompt: "Pluck one guitar's string. The same string on a guitar next to it…", right: "Starts to shake too", wrong: ["Breaks", "Stays still"], visual: scene(["🎸", 30, 55, 1.6], ["🎸", 70, 55, 1.6]), hint: "Sound can make things vibrate.", explain: "Sound from the first string reaches the second one and makes it vibrate too." },
  { k: "chest", prompt: "At a loud drum show, you feel a thump in your chest. Why?", right: "The sound shakes you a little", wrong: ["You are scared", "The drum touched you"], visual: vib("drum", { rings: 4, loud: true }), hint: "Sound is shaking that travels.", explain: "Loud sounds shake the air, and the shaking air shakes your body a little." },
  { k: "cup-water", prompt: "Flare sings a loud low note next to a cup of water. The water…", right: "Ripples", wrong: MOVES_WRONG, visual: scene(["🎤", 30, 55, 1.4], ["🥛", 70, 60, 1.4]), hint: "Sound can make things vibrate.", explain: "The sound shakes the cup and the water, so little ripples appear." },
];

/** 1-PS4-1 — sound can make things vibrate. */
export const soundMoves = bank("sm", MOVES_CASES);

const VIBRATING = ["🥁 drum being hit", "🎸 plucked guitar", "🔔 ringing bell", "🗣️ throat while singing", "🐝 bee's buzzing wings", "📢 speaker playing", "🎻 violin being played", "🎺 trumpet being played"];
const STILL = ["🪨 rock on the ground", "📕 closed book", "🧸 teddy on a shelf", "🥄 spoon in a drawer", "🛏️ bed", "🪑 empty chair"];

/** 1-PS4-1 — Do it: sort things that are vibrating (making sound) from quiet still things. */
export function sortVibrating(): Question {
  const items = sortItems([VIBRATING, STILL], [rand(3, 4), rand(2, 3)]);
  return make(
    {
      key: `sv-${itemsKey(items)}`,
      prompt: "Do it: sort them. Shaking with sound, or still and quiet?",
      speech: "Sort each one. Is it vibrating and making sound, or still and quiet?",
      hint: "Things that make sound are vibrating. Things sitting still are quiet.",
      explain: "Sound comes from vibrating things: drums, strings, bells and your throat. Still things make no sound.",
    },
    act({ kind: "sort", bins: ["🔊 Vibrating", "🤫 Still"], items }, items.length),
  );
}

const HIGH_SOUNDS = ["🐦 bird tweeting", "🐭 mouse squeaking", "🔔 tiny bell", "🎶 whistle", "🐥 chick peeping", "🦗 cricket chirping"];
const LOW_SOUNDS = ["🐘 elephant rumbling", "🥁 big bass drum", "🚢 ship's horn", "🐻 bear growling", "🐸 bullfrog croaking", "🦁 lion's roar"];

/** 1-PS4-1 — Do it: sort high sounds and low sounds. */
export function sortHighLow(): Question {
  const items = sortItems([HIGH_SOUNDS, LOW_SOUNDS], [rand(2, 3), rand(2, 3)]);
  return make(
    {
      key: `shl-${itemsKey(items)}`,
      prompt: "Do it: sort the sounds. High or low?",
      speech: "Sort each sound. Is it high, or low?",
      hint: "Small things often shake fast and sound high. Big things shake slowly and sound low.",
      explain: "Fast vibrations make high sounds (tweets, squeaks). Slow vibrations make low sounds (rumbles, growls).",
    },
    act({ kind: "sort", bins: ["🎵 High", "🎶 Low"], items }, items.length),
  );
}

const STOP_WRONG = ["Shout at it", "Shine a light on it", "Walk away from it", "Blow on it"];
const STOP_CASES: Case[] = [
  { k: "bell", prompt: "How can Flare stop a bell from ringing?", right: "Hold it still", wrong: STOP_WRONG, visual: vib("bell"), hint: "The sound comes from the bell shaking.", explain: "Holding the bell stops it shaking, so the sound stops." },
  { k: "guitar", prompt: "A guitar string keeps humming. How can Flare stop it?", right: "Touch the string", wrong: STOP_WRONG, visual: vib("string"), hint: "Stop the shaking.", explain: "A finger on the string stops it vibrating, so the hum stops." },
  { k: "drum", prompt: "The drum keeps ringing. How can Flare stop it?", right: "Press a hand on the drum", wrong: STOP_WRONG, visual: vib("drum"), hint: "Stop the shaking.", explain: "A hand on the drum skin stops it vibrating, so the sound stops." },
  { k: "fork", prompt: "A tuning fork hums. How can Flare stop it?", right: "Pinch the fork", wrong: STOP_WRONG, visual: vib("fork"), hint: "Stop the shaking.", explain: "Pinching the fork stops it vibrating, so the hum stops." },
  { k: "cymbal", prompt: "A cymbal crashes and keeps ringing. How can Flare stop it?", right: "Grab the cymbal", wrong: STOP_WRONG, hint: "Stop the shaking.", explain: "Grabbing the cymbal stops it vibrating, so the ringing stops." },
  { k: "chimes", prompt: "Wind chimes keep ringing. How can Flare make them quiet?", right: "Hold the chimes still", wrong: STOP_WRONG, hint: "Stop the shaking.", explain: "Held still, the chimes can't vibrate, so they go quiet." },
  { k: "why", prompt: "Why does holding a ringing bell stop the sound?", right: "It stops the shaking", wrong: ["It makes the bell cold", "It hides the bell", "It makes the bell heavy"], visual: vib("bell"), hint: "What makes sound?", explain: "Sound comes from vibrations. Holding the bell stops it vibrating." },
  { k: "towel", prompt: "How can Flare make a drum sound quieter?", right: "Lay a towel on it", wrong: ["Hit it harder", "Use a bigger drum"], visual: vib("drum"), hint: "Something soft on the drum keeps it from shaking much.", explain: "A towel stops the drum skin shaking as much, so the sound is quieter." },
  { k: "phone", prompt: "A buzzing phone rattles on a table. How can Flare quiet it?", right: "Set it on a soft pillow", wrong: ["Set it on a metal tray", "Tap the table"], hint: "Soft things soak up shaking.", explain: "The soft pillow soaks up the phone's shaking, so less sound is made." },
  { k: "louder", prompt: "How can Flare make the bell ring louder?", right: "Hit it harder", wrong: ["Hold it still", "Hit it more gently"], visual: vib("bell", { rings: 4, loud: true }), hint: "Bigger shakes, louder sound.", explain: "A harder hit makes the bell vibrate more, so it rings louder." },
  { k: "triangle", prompt: "A music triangle keeps ringing. How can Flare stop it?", right: "Grab the triangle", wrong: STOP_WRONG, hint: "Stop the shaking.", explain: "Holding the triangle stops it vibrating, so the ringing stops." },
  { k: "piano", prompt: "A piano key's note fades away by itself. Why?", right: "The string slowly stops shaking", wrong: ["The piano gets tired", "The sound falls on the floor"], hint: "Sound lasts as long as the shaking.", explain: "The piano string vibrates less and less, so the sound fades until the shaking stops." },
];

/** 1-PS4-1 — stop the vibration and you stop the sound. */
export const stopTheSound = bank("sts", STOP_CASES);

const SIGNAL_SOUND_CASES: Case[] = [
  { k: "park", prompt: "How can Flare call friends from far across the park?", right: "Blow a whistle", wrong: ["Whisper", "Write a tiny note"], visual: { kind: "phys-sound", scene: "signal", sender: "🧒", receiver: "👫", via: "sound", message: "tweet!" }, hint: "Which one can be heard far away?", explain: "A whistle is loud, so the sound travels far across the park." },
  { k: "fog", prompt: "Thick fog! How can a ship warn other ships?", right: "Blow a loud foghorn", wrong: ["Wave a small flag", "Whisper"], visual: { kind: "phys-sound", scene: "signal", sender: "🚢", receiver: "⛵", via: "sound", message: "HOOONK" }, hint: "In fog you can't see far, but you can hear far.", explain: "Fog hides lights and flags, but a loud foghorn can be heard far away." },
  { k: "fire", prompt: "How does a fire alarm tell everyone to get out?", right: "A loud ringing sound", wrong: ["A quiet hum", "A small sign"], hint: "It must reach people in every room.", explain: "A loud alarm sound reaches every room, even where you can't see the fire." },
  { k: "school", prompt: "How does the school tell everyone recess is over?", right: "A bell rings", wrong: ["A teacher whispers", "A light in one room"], visual: vib("bell", { rings: 3, loud: true }), hint: "Everyone on the playground needs to know.", explain: "A loud bell can be heard all over the school and playground." },
  { k: "lost", prompt: "Flare is lost in the woods. How to call for help?", right: "Blow a whistle", wrong: ["Wave a tiny flag", "Sit very quietly"], visual: scene(["🌲", 20, 50, 1.6], ["🧒", 50, 65, 1.3], ["🌲", 80, 50, 1.6]), hint: "Trees block what you see, but not what you hear.", explain: "Sound goes around trees, so a loud whistle helps people find you." },
  { k: "lifeguard", prompt: "How does a lifeguard call swimmers back in?", right: "Blows a whistle", wrong: ["Whispers", "Writes in the sand"], visual: scene(["🏊", 30, 60, 1.4], ["🌊", 30, 75, 1.4], ["🧑", 78, 55, 1.4]), hint: "Swimmers are far away and splashing.", explain: "A whistle is loud and sharp, so swimmers can hear it far out in the water." },
  { k: "icecream", prompt: "How does the ice cream truck tell kids it's here?", right: "It plays music", wrong: ["It turns off its lights", "It stops quietly"], visual: scene(["🚚", 35, 60, 1.6], ["🎶", 65, 40], ["🍦", 80, 65]), hint: "Kids inside their houses need to know.", explain: "Its music travels down the street and into houses." },
  { k: "doorbell", prompt: "How does a visitor tell you they're at the door?", right: "Ring the doorbell", wrong: ["Stand very still", "Wave at the wall"], visual: vib("bell"), hint: "You may be in another room.", explain: "The doorbell's sound reaches you even in another room." },
  { k: "why-far", prompt: "Why use a loud sound to send a message far?", right: "Loud sounds travel far", wrong: ["Loud sounds are pretty", "Soft sounds travel farther"], hint: "Think of shouting and whispering.", explain: "A loud sound has big vibrations that can still be heard far away." },
  { k: "train", prompt: "How does a train warn cars at a crossing?", right: "It blows its horn", wrong: ["It goes quiet", "It flashes a tiny light inside"], visual: scene(["🚂", 30, 60, 1.6], ["🚗", 75, 75, 1.2]), hint: "Drivers might not see the train yet.", explain: "The horn is very loud, so drivers hear the train coming before they see it." },
  { k: "ambulance", prompt: "How does an ambulance tell cars to move over?", right: "A loud siren", wrong: ["A quiet hum", "A sign on its roof"], visual: scene(["🚑", 30, 60, 1.6], ["🚗", 75, 70, 1.2]), hint: "Drivers may not see it behind them.", explain: "The siren is loud, so drivers hear it coming even before they see it." },
  { k: "rooster", prompt: "How does a rooster tell the farm it's morning?", right: "It crows loudly", wrong: ["It sits quietly", "It flaps one wing"], visual: scene(["🐓", 40, 60, 1.6], ["🌅", 75, 35, 1.4]), hint: "The other animals may be asleep.", explain: "A loud crow carries across the whole farm, a sound signal for morning." },
];

/** 1-PS4-4 — use sound to send a message far away. */
export const soundSignals = bank("ssg", SIGNAL_SOUND_CASES);

const CODE_SOUNDS: { e: string; one: string; many: string }[] = [
  { e: "🔔", one: "ring", many: "rings" },
  { e: "👏", one: "clap", many: "claps" },
  { e: "🥁", one: "drum bang", many: "drum bangs" },
  { e: "📯", one: "horn toot", many: "horn toots" },
];
const MEANINGS = ["come here", "stop", "go", "line up", "lunch time", "wake up", "hide", "help"];

/** 1-PS4-4 — read a sound code. */
export function soundCodes(): Question {
  const s = pick(CODE_SOUNDS);
  const means = shuffle(MEANINGS).slice(0, 3);
  const heard = rand(1, 3);
  return make(
    {
      key: `sc-${s.one}-${means.join("|")}-${heard}`,
      prompt: `Flare hears ${s.e.repeat(heard)}. What does it mean?`,
      speech: `Here is the code. Flare hears ${heard} ${heard === 1 ? s.one : s.many}. What does it mean?`,
      visual: { kind: "table", header: ["Sound", "It means"], rows: means.map((m, i) => [s.e.repeat(i + 1), m]) },
      needsVisual: true,
      hint: `Count the ${s.many}. Then find that row in the code.`,
      explain: `${heard} ${heard === 1 ? s.one : s.many} means "${means[heard - 1]}". A code lets a sound carry a message.`,
    },
    fixed(means, means[heard - 1]),
  );
}

const PHONE_CASES: Case[] = [
  { k: "carries", prompt: "Cup phone: what carries your voice to your friend?", right: "The string shaking", wrong: ["Light in the string", "Water in the cups"], visual: scene(["🥤", 15, 55, 1.4], ["〰️", 50, 50, 2.4], ["🥤", 85, 55, 1.4]), hint: "Sound is shaking that travels.", explain: "Your voice shakes the cup, the cup shakes the string, and the string shakes your friend's cup." },
  { k: "loose", prompt: "The cup phone string is floppy. Can your friend hear well?", right: "No, pull it tight", options: ["Yes, just fine", "No, pull it tight"], hint: "A floppy string can't pass the shaking along.", explain: "A loose string doesn't carry the vibrations well. Pull it tight!" },
  { k: "pinch", prompt: "Someone pinches the cup phone string. What happens?", right: "The sound stops", options: ["The sound gets louder", "The sound stops"], hint: "Pinching stops the string shaking.", explain: "Pinching stops the string vibrating, so the sound can't get through." },
  { k: "table", prompt: "Ear on a table. A friend taps the far end. Do you hear it?", right: "Yes, loud and clear", options: ["Yes, loud and clear", "No, not at all"], visual: scene(["👂", 15, 50, 1.2], ["🟫", 50, 60, 3], ["✊", 85, 50, 1.2]), hint: "Sound can travel through solid things.", explain: "The tapping makes the table vibrate, and the shaking travels through it to your ear." },
  { k: "door", prompt: "Can you hear a friend through a shut door?", right: "Yes, but softer", options: ["Yes, but softer", "No, never"], visual: scene(["🧒", 20, 60, 1.3], ["🚪", 50, 55, 2], ["🗣️", 80, 60, 1.3]), hint: "The voice makes the door shake a little.", explain: "Sound shakes the door, and the door shakes the air on your side, but more softly." },
  { k: "whales", prompt: "Whales hear each other from far away. Sound travels through…", right: "The water", wrong: ["Nothing", "Their tails"], visual: scene(["🐋", 25, 55, 1.6], ["🌊", 55, 75, 1.4], ["🐋", 80, 55, 1.2]), hint: "What's all around the whales?", explain: "Sound can travel through water, so whale songs reach far across the sea." },
  { k: "first", prompt: "Flare talks into a cup phone. What shakes first?", right: "The bottom of the cup", wrong: ["The friend's ear", "The other cup"], hint: "What does your voice hit first?", explain: "Flare's voice shakes the bottom of the cup first, then the string, then the other cup." },
  { k: "air", prompt: "How does a drum's sound get to your ear?", right: "The drum shakes the air", wrong: ["The drum glows", "The drum flies to you"], visual: vib("drum", { ear: true }), hint: "What is between the drum and you?", explain: "The vibrating drum shakes the air, and the shaking air reaches your ear." },
  { k: "eardrum", prompt: "Sound reaches your ear. What shakes inside it?", right: "Your eardrum", wrong: ["Your nose", "Your teeth"], visual: vib("speaker", { ear: true }), hint: "It's named after a drum!", explain: "Sound makes your eardrum vibrate, and that's how you hear." },
  { k: "space", prompt: "Space has no air. Could you hear a bell ring there?", right: "No", options: ["Yes", "No"], visual: scene(["🌌", 50, 45, 2.4], ["🔔", 50, 55, 1.2]), hint: "Sound needs something to shake, like air, water or wood.", explain: "With no air to shake, sound can't travel, so you wouldn't hear the bell." },
  { k: "wall", prompt: "Music plays next door. How does it get through the wall?", right: "It makes the wall shake", wrong: ["It goes around the house", "It turns into light"], hint: "Sound can make things vibrate.", explain: "The music shakes the wall, and the wall shakes the air on your side." },
  { k: "tight-better", prompt: "Which cup phone works best?", right: "A long, tight string", wrong: ["A floppy string", "A string that touches a tree"], hint: "The string must shake freely.", explain: "A tight string that touches nothing carries the vibrations best." },
];

/** 1-PS4-1 — sound travels by making things vibrate: cup phones, tables, water. */
export const cupPhone = bank("cup", PHONE_CASES);

/* =========================================================== World 4: light and sight */

const SEE_THINGS: [string, string][] = [
  ["🧸", "teddy"],
  ["🍎", "apple"],
  ["📕", "book"],
  ["⚽", "ball"],
  ["🐈", "cat toy"],
  ["🧩", "puzzle"],
];

/** 1-PS4-2 — we can only see things when there is light. */
export function needLight(): Question {
  const [e, name] = pick(SEE_THINGS);
  const form = rand(0, 3);
  if (form === 0)
    return make(
      {
        key: `nl-dark-${name}`,
        prompt: `The room is totally dark. Can you see the ${name}?`,
        speech: `The room is totally dark, with no light at all. Can you see the ${name}?`,
        visual: scene(["🌑", 50, 50, 2.4]),
        hint: "To see something, light must bounce off it into your eyes.",
        explain: `No. With no light at all, no light can bounce off the ${name} into your eyes.`,
      },
      fixed(["Yes", "No"], "No"),
    );
  const source = pick(["💡", "🔦", "☀️", "🕯️"]);
  if (form === 1)
    return make(
      {
        key: `nl-lit-${name}-${source}`,
        prompt: `Flare turns on a light. Now can you see the ${name}?`,
        visual: { kind: "phys-rays", scene: "see", source, object: e },
        hint: "Is there light now?",
        explain: `Yes! Light shines on the ${name} and bounces into your eyes.`,
      },
      fixed(["Yes", "No"], "Yes"),
    );
  if (form === 2)
    return make(
      {
        key: `nl-need-${name}-${source}`,
        prompt: `What do you need to see the ${name}?`,
        visual: { kind: "phys-rays", scene: "see", source, object: e },
        hint: "What's missing in a dark room?",
        explain: `Light! We can only see things when light shines on them.`,
      },
      choose("Light", ["Sound", "Wind", "Water"], 3),
    );
  return ask(
    "nl",
    pick([
      { k: "cat-cave", prompt: "A cave with no light at all. Can a cat see there?", right: "No", options: ["Yes", "No"], visual: scene(["🌑", 40, 50, 2.2], ["🐈", 65, 65]), hint: "Cats see well in dim light, but they still need some light.", explain: "No. Cats need some light to see, just like us. In total darkness nobody can see." },
      { k: "eyes-closed", prompt: "Flare shuts both eyes. Why can't Flare see?", right: "No light gets into the eyes", wrong: ["The room went dark", "The eyes fell asleep"], hint: "Seeing means light coming into your eyes.", explain: "Closed eyelids block the light, so no light reaches Flare's eyes." },
      { k: "closet", prompt: "Inside a shut closet, the shoes are hard to see. Why?", right: "There's very little light", wrong: ["The shoes are hiding", "Shoes can't be seen"], hint: "What do eyes need?", explain: "Very little light gets into a shut closet, so little light bounces off the shoes to your eyes." },
      { k: "night-walk", prompt: "On a dark night walk, what helps you see the path?", right: "A flashlight", wrong: ["A whistle", "A blanket"], visual: scene(["🌙", 20, 20], ["🔦", 40, 70, 1.4], ["🌲", 80, 50, 1.6]), hint: "You need light to see.", explain: "A flashlight shines light on the path, and it bounces back to your eyes." },
    ]),
  );
}

const MAKES_LIGHT = ["☀️ the Sun", "💡 a lit lamp", "🔥 a campfire", "🕯️ a burning candle", "🔦 a flashlight that's on", "⭐ a star", "📺 a TV that's on", "✨ a firefly glowing"];
const NO_LIGHT = ["🌕 the Moon", "🪞 a mirror", "🍎 an apple", "📕 a book", "🧸 a teddy", "🚲 a bike reflector", "🪨 a rock"];

/** 1-PS4-2 — Do it: sort things that make their own light from things that are only lit up. */
export function sortLightMakers(): Question {
  const items = sortItems([MAKES_LIGHT, NO_LIGHT], [rand(3, 4), rand(2, 3)]);
  const moon = items.some((i) => i.label.includes("Moon"));
  return make(
    {
      key: `slm-${itemsKey(items)}`,
      prompt: "Do it: sort them. Makes its own light, or not?",
      speech: "Sort each one. Does it make its own light, or do we only see it when light shines on it?",
      hint: "Would you see it in a totally dark room?",
      explain: moon
        ? "Light makers glow by themselves. The Moon makes no light: it shines because sunlight bounces off it."
        : "The Sun, fires, lamps and stars make their own light. Other things are only seen when light bounces off them.",
    },
    act({ kind: "sort", bins: ["💡 Makes light", "👀 Needs light"], items }, items.length),
  );
}

const BOUNCES = "Light bounces off it into Flare's eyes";
/** 1-PS4-2 — we see things when light bounces off them into our eyes. */
export function howWeSee(): Question {
  if (Math.random() < 0.6) {
    const [e, name] = pick(SEE_THINGS);
    const source = pick(["☀️", "💡"]);
    return make(
      {
        key: `hws-${name}-${source}`,
        prompt: `How does Flare see the ${name}?`,
        visual: { kind: "phys-rays", scene: "see", source, object: e, label: "light bounces" },
        needsVisual: true,
        hint: "Follow the light from the lamp or Sun. Where does it go?",
        explain: `Light from the ${source === "☀️" ? "Sun" : "lamp"} hits the ${name} and bounces into Flare's eyes.`,
      },
      choose(BOUNCES, ["Flare's eyes shine light on it", `The ${name} makes its own light`], 3),
    );
  }
  return ask(
    "hws",
    pick([
      { k: "moon", prompt: "The Moon looks bright at night. Why?", right: "Sunlight bounces off it", wrong: ["It's a giant lamp", "It's on fire"], visual: scene(["☀️", 15, 30, 1.4], ["🌕", 55, 30, 1.4], ["🧒", 80, 75, 1.4]), hint: "Does the Moon make its own light?", explain: "The Moon makes no light. Sunlight hits it and bounces to our eyes." },
      { k: "cat-eyes", prompt: "A cat's eyes seem to glow in the car lights. Why?", right: "Light bounces off its eyes", wrong: ["Cats' eyes are lamps", "The cat is very hot"], visual: scene(["🚗", 25, 60, 1.4], ["🐈", 75, 60, 1.4]), hint: "Where does the light come from?", explain: "The car's light shines into the cat's eyes and bounces back. The eyes don't make light." },
      { k: "dim", prompt: "Curtains shut, lamp off. The toys look dim. Why?", right: "Little light bounces off them", wrong: ["The toys got tired", "The toys moved away"], hint: "How much light is in the room?", explain: "With little light in the room, only a little light bounces off the toys to your eyes." },
      { k: "glow", prompt: "Which one can you see in a totally dark room?", right: "A glowing lamp", wrong: ["A red apple", "A white sock"], visual: scene(["🌑", 50, 50, 2.4]), hint: "In the dark, only light makers show up.", explain: "A glowing lamp makes its own light, so you can see it. The others need light to bounce off them." },
    ]),
  );
}

const THROUGH = "It goes through";
const SOME = "Some gets through";
const BLOCKED = "It is blocked";
const BACK = "It bounces back";
const EFFECT = { transparent: THROUGH, translucent: SOME, opaque: BLOCKED, mirror: BACK } as const;
const SCREEN = { transparent: "Bright", translucent: "Dim", opaque: "Dark shadow" } as const;
const BEAM_THINGS: { label: string; emoji: string; type: "transparent" | "translucent" | "opaque" | "mirror" }[] = [
  { label: "glass", emoji: "🪟", type: "transparent" },
  { label: "clear plastic", emoji: "🫙", type: "transparent" },
  { label: "clear water", emoji: "💧", type: "transparent" },
  { label: "wax paper", emoji: "📜", type: "translucent" },
  { label: "tissue paper", emoji: "🧻", type: "translucent" },
  { label: "frosted glass", emoji: "🧊", type: "translucent" },
  { label: "wood", emoji: "🪵", type: "opaque" },
  { label: "cardboard", emoji: "📦", type: "opaque" },
  { label: "teddy", emoji: "🧸", type: "opaque" },
  { label: "book", emoji: "📕", type: "opaque" },
  { label: "mirror", emoji: "🪞", type: "mirror" },
];

/** 1-PS4-3 — light goes through, partly through, is blocked, or bounces back. */
export function throughOrBlocked(): Question {
  const m = pick(BEAM_THINGS);
  const screen = m.type !== "mirror" && Math.random() < 0.4;
  // Only solid toys are drawn as an emoji in the beam; slabs of material are drawn as a labelled slab.
  const solid = m.label === "teddy" || m.label === "book";
  const visual: Visual = { kind: "phys-rays", scene: "beam", source: "torch", block: { type: m.type, label: m.label, ...(solid ? { emoji: m.emoji } : {}) }, screen: true };
  const why =
    m.type === "transparent"
      ? `${cap(m.label)} is see-through, so light goes right through.`
      : m.type === "translucent"
        ? `${cap(m.label)} lets only some light through, so things behind it look blurry.`
        : m.type === "opaque"
          ? `The ${m.label} blocks the light, so a dark shadow forms behind it.`
          : "A mirror is smooth and shiny, so light bounces back off it.";
  if (screen) {
    const right = SCREEN[m.type as keyof typeof SCREEN];
    return make(
      {
        key: `tob-screen-${m.label}`,
        prompt: `A flashlight shines at ${m.label}. How does the wall behind look?`,
        // Predict: the picture shows the set-up only, not the lit wall.
        visual: scene(["🔦", 14, 55, 1.4], [m.emoji, 50, 55, 1.6], ["⬜", 86, 55, 2]),
        hint: "Does light get through to the wall? All of it, some, or none?",
        explain: `${why} The wall looks ${right.toLowerCase()}.`,
      },
      fixed(["Bright", "Dim", "Dark shadow"], right),
    );
  }
  return make(
    {
      key: `tob-light-${m.label}`,
      prompt: `Light shines on ${m.label}. What happens to the light?`,
      visual,
      hint: "Look at the wall on the right. Is it bright, dim or dark? Or does the light come back?",
      explain: why,
    },
    fixed([THROUGH, SOME, BLOCKED, BACK], EFFECT[m.type]),
  );
}

/** 1-PS4-3 — Do it: put in a material that passes, dims, blocks or reflects the light. */
export function materialBeam(): Question {
  const want = pick(["pass", "dim", "block", "reflect"] as const);
  const type = { pass: "transparent", dim: "translucent", block: "opaque", reflect: "mirror" }[want];
  const yes = pick(MATERIALS.filter((m) => m.type === type));
  const no = shuffle(MATERIALS.filter((m) => m.type !== type)).slice(0, rand(2, 3));
  const materials = shuffle([yes, ...no]);
  const goal = { pass: "lets all the light through", dim: "lets just some light through", block: "makes a dark shadow", reflect: "bounces the light back" }[want];
  return make(
    {
      key: `mb-${want}-${materials.map((m) => m.name).join("|")}`,
      prompt: `Do it: find one that ${goal}.`,
      speech: `Tap a material to put it in the light. Find one that ${goal}.`,
      hint: { pass: "Pick something you can see right through.", dim: "Pick something light glows through, but you can't see clearly through.", block: "Pick something light can't get through at all.", reflect: "Pick something smooth and shiny." }[want],
      explain: `${cap(yes.name)} ${goal}.`,
    },
    act({ kind: "phys-material", materials, want }),
  );
}

const SEE_THROUGH = ["🪟 window glass", "🫙 clear jar", "💧 clear water", "👓 glasses lens", "🫧 plastic wrap"];
const SOME_THROUGH = ["📜 wax paper", "🧻 tissue paper", "🏳️ thin white sheet", "🧊 frosted glass", "🎈 thin balloon"];
const NOT_THROUGH = ["🪵 wood", "📦 cardboard", "🧱 brick", "📕 book", "🥫 metal can", "✋ your hand"];

/** 1-PS4-3 — Do it: sort materials by how much light gets through. */
export function sortMaterials(): Question {
  const items = sortItems([SEE_THROUGH, SOME_THROUGH, NOT_THROUGH], [2, 2, 2]);
  return make(
    {
      key: `sm3-${itemsKey(items)}`,
      prompt: "Do it: sort them by how much light gets through.",
      speech: "Sort each one. Does light go through, does some light go through, or is light blocked?",
      hint: "Can you see clearly through it? Only blurry? Not at all?",
      explain: "See-through things let light pass. Things like wax paper let some through. Wood, brick and cardboard block it.",
    },
    act({ kind: "sort", bins: ["Lets light through", "Lets some through", "Blocks light"], items }, items.length),
  );
}

const SHADOW_THINGS: [string, string][] = [
  ["🧸", "teddy"],
  ["🍎", "apple"],
  ["🦒", "toy giraffe"],
  ["🌵", "cactus"],
  ["🏺", "vase"],
  ["🦆", "toy duck"],
];

/** 1-PS4-3 — opaque things block light and make shadows. */
export function shadows(): Question {
  const [e, name] = pick(SHADOW_THINGS);
  const form = rand(0, 3);
  const beam: Visual = { kind: "phys-rays", scene: "beam", source: "torch", block: { type: "opaque", emoji: e, label: name }, screen: true };
  if (form === 0) {
    const opaque = pick(NOT_THROUGH);
    const wrong = [pick(SEE_THROUGH), pick(SOME_THROUGH)];
    return make(
      {
        key: `sh-darkest-${opaque}-${wrong.join("|")}`,
        prompt: "Which one makes the darkest shadow?",
        hint: "A dark shadow needs something that blocks all the light.",
        explain: `${cap(split(opaque)[1])} blocks all the light, so its shadow is darkest.`,
      },
      choose(opaque, wrong, 3),
    );
  }
  if (form === 1)
    return make(
      {
        key: `sh-why-${name}`,
        prompt: `Why is there a shadow behind the ${name}?`,
        visual: beam,
        hint: "Can light go through the toy?",
        explain: `The ${name} blocks the light, so a dark shadow forms where the light can't reach.`,
      },
      choose(`The ${name} blocks the light`, [`The ${name} makes darkness`, "The wall is dirty", "The light is tired"], 3),
    );
  if (form === 2) {
    const torchLeft = Math.random() < 0.5;
    return make(
      {
        key: `sh-side-${name}-${torchLeft ? "L" : "R"}`,
        prompt: `The flashlight is to the ${torchLeft ? "left" : "right"} of the ${name}. Where is the shadow?`,
        visual: torchLeft ? beam : scene([e, 40, 60, 1.6], ["🔦", 80, 60, 1.4]),
        hint: "The shadow is on the far side, away from the light.",
        explain: `The shadow falls on the side away from the light: the ${torchLeft ? "right" : "left"}.`,
      },
      fixed(["On the left", "On the right"], torchLeft ? "On the right" : "On the left"),
    );
  }
  const closer = Math.random() < 0.5;
  return make(
    {
      key: `sh-size-${name}-${closer ? "closer" : "farther"}`,
      prompt: `Flare moves the flashlight ${closer ? "closer to" : "farther from"} the ${name}. The shadow gets…`,
      visual: beam,
      hint: "Try it with your hand and a flashlight!",
      explain: closer ? `Closer to the light, the ${name} blocks more of it, so the shadow gets bigger.` : `Farther from the light, the ${name} blocks less of it, so the shadow gets smaller.`,
    },
    fixed(["Bigger", "Smaller"], closer ? "Bigger" : "Smaller"),
  );
}

const mirror = (angle: number): Visual => ({ kind: "phys-rays", scene: "mirror", angle, ends: true, normal: false });
const MIRROR_CASES: Case[] = [
  { k: "what", prompt: "Light hits a mirror. What does the light do?", right: "Bounces off", wrong: ["Goes through", "Stops dead", "Turns into sound"], visual: mirror(40), hint: "Mirrors are smooth and shiny.", explain: "A mirror bounces (reflects) light off its shiny surface." },
  { k: "corner", prompt: "How can Flare see around a corner?", right: "Use a mirror", wrong: ["Use a book", "Use a sponge"], visual: mirror(45), hint: "You need something that bounces light.", explain: "A mirror at the corner bounces light from around the corner into Flare's eyes." },
  { k: "dark-box", prompt: "Flare wants to bounce sunlight into a dark box. Which one?", right: "A mirror", wrong: ["A wood board", "A towel"], visual: mirror(30), hint: "Which is smooth and shiny?", explain: "A mirror reflects the sunlight into the box." },
  { k: "see-self", prompt: "Why can Flare see itself in a mirror?", right: "Light bounces back to its eyes", wrong: ["The mirror makes its own light", "There's another Flare inside"], hint: "Light bounces off Flare, then off the mirror.", explain: "Light bounces off Flare onto the mirror, and the mirror bounces it back into Flare's eyes." },
  { k: "spoon", prompt: "Which one can you see yourself in?", right: "A shiny spoon", wrong: ["A wooden spoon", "A paper plate"], hint: "Smooth and shiny things reflect light well.", explain: "A shiny spoon is smooth, so it reflects light like a mirror." },
  { k: "periscope", prompt: "A periscope lets you peek over a wall. What's inside?", right: "Two mirrors", wrong: ["Two light bulbs", "Two sponges"], visual: scene(["🧱", 50, 60, 2], ["🧒", 25, 75, 1.2], ["🐕", 80, 75, 1.2]), hint: "It bounces light down to your eye.", explain: "Two mirrors bounce the light over the wall and down into your eye." },
  { k: "car", prompt: "How does a driver see cars behind without turning?", right: "With a mirror", wrong: ["With a flashlight", "By honking"], visual: scene(["🚗", 30, 60, 1.4], ["🚙", 75, 60, 1.4]), hint: "What bounces light from behind to the eyes?", explain: "The car's mirror bounces light from the cars behind into the driver's eyes." },
  { k: "path", prompt: "Light hits a mirror at a slant. How does it bounce off?", right: "At a slant the other way", wrong: ["Straight down", "It doesn't bounce"], visual: mirror(50), hint: "Look at the picture: in at a slant, out at a slant.", explain: "Light bounces off a mirror at the same slant it came in, going the other way." },
  { k: "foil", prompt: "Smooth shiny foil or a crumpled paper bag: which reflects better?", right: "Smooth shiny foil", options: ["Smooth shiny foil", "Crumpled paper bag"], hint: "Mirrors are smooth and shiny.", explain: "Smooth, shiny things reflect light well. Rough, dull things scatter it." },
  { k: "bike", prompt: "A bike reflector shines when car lights hit it. Why?", right: "It bounces the light back", wrong: ["It has a battery", "It's on fire"], visual: scene(["🚲", 30, 60, 1.4], ["🚗", 75, 60, 1.4]), hint: "Does a reflector make its own light?", explain: "A reflector makes no light. It bounces car light back so drivers see the bike." },
  { k: "dentist", prompt: "How does a dentist see the back of your teeth?", right: "With a tiny mirror", wrong: ["With a whistle", "With a sponge"], visual: scene(["🦷", 50, 55, 2]), hint: "What can bounce light around to the back?", explain: "A tiny mirror bounces light from the back of your teeth into the dentist's eyes." },
  { k: "water", prompt: "Flare sees trees upside down in a still pond. Why?", right: "The water reflects light like a mirror", wrong: ["The trees are under the water", "The pond makes light"], visual: scene(["🌲", 50, 30, 1.6], ["🌊", 50, 75, 2]), hint: "Still water is smooth and shiny.", explain: "Smooth, still water reflects light like a mirror, so you see the trees in it." },
];

/** 1-PS4-3 — mirrors bounce light. */
export const mirrors = bank("mir", MIRROR_CASES);

const FLASH_CASES: Case[] = [
  { k: "lighthouse", prompt: "Why does a lighthouse flash at night?", right: "To warn ships about rocks", wrong: ["To wake up fish", "To heat the sea"], visual: { kind: "phys-sound", scene: "signal", sender: "🗼", receiver: "🚢", via: "light", message: "flash!" }, hint: "Ships out at sea can see it from far away.", explain: "Its bright light can be seen far out at sea, telling ships where the rocks are." },
  { k: "traffic", prompt: "A traffic light shows red. What message does it send?", right: "Stop", options: ["Stop", "Go"], visual: scene(["🚦", 50, 50, 2.2]), hint: "Red means…", explain: "Red light means stop. A traffic light sends its message with coloured light." },
  { k: "night-field", prompt: "Best way to send a message across a dark field at night?", right: "Blink a flashlight", wrong: ["Wave a tiny flag", "Whisper"], visual: { kind: "phys-sound", scene: "signal", sender: "🔦", receiver: "🧒", via: "light", message: "• • •" }, hint: "What can you see from far away in the dark?", explain: "A flashlight's light can be seen far away in the dark." },
  { k: "why-night", prompt: "Why do light signals work well at night?", right: "Bright light shows far in the dark", wrong: ["Light is loud", "Light is cold"], hint: "Think of a flashlight on a dark night.", explain: "In the dark, a bright light stands out and can be seen from far away." },
  { k: "bike-light", prompt: "Why does a bike have a light at night?", right: "So others can see it", wrong: ["To warm the rider", "To make it faster"], visual: scene(["🚲", 50, 60, 1.6], ["🌙", 20, 20]), hint: "It sends a message: here I am!", explain: "The light tells cars and people 'I'm here!' so they can see the bike in the dark." },
];

/** 1-PS4-4 — use light to send a message: codes and real signals. */
export function lightSignals(): Question {
  if (Math.random() < 0.4) return ask("lsg", pick(FLASH_CASES));
  const means = shuffle(["come home", "all OK", "help", "wait", "goodnight", "look out"]).slice(0, 3);
  const n = rand(1, 3);
  return make(
    {
      key: `lsg-code-${means.join("|")}-${n}`,
      prompt: `Flare sees ${"✨".repeat(n)} from a window. What does it mean?`,
      speech: `Here is the flashlight code. Flare sees ${n} ${n === 1 ? "flash" : "flashes"}. What does it mean?`,
      visual: { kind: "table", header: ["Flashes", "It means"], rows: means.map((m, i) => ["✨".repeat(i + 1), m]) },
      needsVisual: true,
      hint: "Count the flashes. Then find that row in the code.",
      explain: `${n} ${n === 1 ? "flash" : "flashes"} means "${means[n - 1]}". A flashlight code sends a message with light.`,
    },
    fixed(means, means[n - 1]),
  );
}

const LIGHT_SIGNALS = ["🚦 traffic light", "🗼 lighthouse", "🔦 flashlight blinks", "🚩 waving a flag", "💡 porch light on", "🎆 fireworks show"];
const SOUND_SIGNALS = ["🔔 school bell", "📯 horn toot", "📢 megaphone", "⏰ alarm clock", "👏 clapping a code", "🥁 drum beats", "🎶 whistle blast"];

/** 1-PS4-4 — Do it: sort signals sent with light and with sound. */
export function sortSignals(): Question {
  const items = sortItems([LIGHT_SIGNALS, SOUND_SIGNALS], [rand(2, 3), rand(2, 3)]);
  return make(
    {
      key: `ssig-${itemsKey(items)}`,
      prompt: "Do it: sort the signals. Light or sound?",
      speech: "Sort each signal. Do you see it, or hear it?",
      hint: "Do you see it with your eyes, or hear it with your ears?",
      explain: "Light signals are seen (lights, flags, flashes). Sound signals are heard (bells, horns, whistles).",
    },
    act({ kind: "sort", bins: ["💡 Light", "🔊 Sound"], items }, items.length),
  );
}

const LIGHT_SIG = "💡 A light signal";
const SOUND_SIG = "🔊 A sound signal";
const SIG_OPTIONS = [LIGHT_SIG, SOUND_SIG];
const DESIGN_SIGNAL_CASES: Case[] = [
  { k: "goodnight", prompt: "Say goodnight to a friend across the street, at night, without waking anyone.", right: LIGHT_SIG, options: SIG_OPTIONS, hint: "Which one is quiet but can be seen in the dark?", explain: "Blinking a flashlight is silent and easy to see at night." },
  { k: "corner", prompt: "Call a friend who's around the corner, out of sight.", right: SOUND_SIG, options: SIG_OPTIONS, hint: "Can light go around a corner?", explain: "Sound goes around corners. Light travels in straight lines, so your friend can't see it." },
  { k: "noisy", prompt: "Tell a friend 'over here!' in a very noisy, loud crowd.", right: LIGHT_SIG, options: SIG_OPTIONS, hint: "Would they hear you over the noise?", explain: "In a noisy place sounds get lost, but a bright light or waving flag can be seen." },
  { k: "ships", prompt: "Warn ships about rocks on a clear night.", right: LIGHT_SIG, options: SIG_OPTIONS, hint: "A clear night: what can be seen from far away?", explain: "A lighthouse beam shows up far away on a clear night." },
  { k: "wake", prompt: "Wake a sleeping kid in the morning.", right: SOUND_SIG, options: SIG_OPTIONS, hint: "Their eyes are closed!", explain: "With eyes shut, a light is easy to miss, but an alarm sound gets through." },
  { k: "cars", prompt: "Tell cars when to stop at a busy corner.", right: LIGHT_SIG, options: SIG_OPTIONS, hint: "Drivers look at the road.", explain: "A traffic light's coloured light tells drivers when to stop and go." },
  { k: "forest", prompt: "A hiker is lost in a thick forest.", right: SOUND_SIG, options: SIG_OPTIONS, hint: "Trees block what you can see.", explain: "Trees block light, but a whistle's sound travels around them." },
  { k: "fog", prompt: "A boat in thick fog needs to say 'I'm here!'", right: SOUND_SIG, options: SIG_OPTIONS, hint: "Fog makes it hard to see far.", explain: "Fog hides lights, but a foghorn's sound can still be heard." },
  { k: "library", prompt: "Tell a friend across a quiet library that it's time to go.", right: LIGHT_SIG, options: SIG_OPTIONS, hint: "You must be quiet in a library.", explain: "A wave or a signal you can see keeps the library quiet." },
  { k: "hill", prompt: "Send a message to a friend on a faraway hill at night.", right: LIGHT_SIG, options: SIG_OPTIONS, hint: "Sound fades over a long way. What shows far in the dark?", explain: "A bright flashlight can be seen from a faraway hill at night." },
  { k: "behind-wall", prompt: "Tell a friend behind a tall wall that lunch is ready.", right: SOUND_SIG, options: SIG_OPTIONS, hint: "Can they see through the wall?", explain: "Light can't get through or around the wall, but your voice or a bell can be heard." },
  { k: "dark-room", prompt: "Call a friend playing in the next room.", right: SOUND_SIG, options: SIG_OPTIONS, hint: "They can't see you from there.", explain: "A shout or bell carries into the next room. A light signal can't be seen through the wall." },
];

/** 1-PS4-4 — design a signal: light or sound for the situation? */
export const designSignal = bank("dsg", DESIGN_SIGNAL_CASES);
