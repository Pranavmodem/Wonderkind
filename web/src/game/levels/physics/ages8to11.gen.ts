/**
 * Question generators for physics, ages 8–11 (Grades 3–5): balanced and unbalanced forces, patterns in
 * motion, magnets and static electricity, speed and energy, collisions, energy transfer and circuits,
 * waves, light and codes, gravity, and the Sun's energy in our food. Worlds are assembled in ./ages8to11.ts.
 *
 * Simple cause and effect, measuring and small whole numbers. Forces are in newtons (N).
 */
import { bag, makeChoices, pick, rand, shuffle } from "../../questions";
import type { Activity, Question, Visual } from "../../types";
import type { CircuitPart, ForceArrow } from "../../science/physicsTypes";

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

/** Text choices in a fixed order. */
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

const keypad = (answer: number, unit?: string): Ans => ({ answer, input: "keypad", ...(unit ? { unit } : {}) });

const numbers = (answer: number, likely: number[], min: number, max: number, unit?: string): Ans => ({
  answer,
  input: "choices",
  choices: makeChoices(answer, { n: 4, min, max, likely }),
  ...(unit ? { unit } : {}),
});

const act = (activity: Activity, answer = 1): Ans => ({ answer, input: "activity", activity });

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

function sortItems(lists: string[][], per: number[]): { label: string; bin: number }[] {
  return shuffle(lists.flatMap((list, bin) => shuffle(list).slice(0, per[bin]).map((label) => ({ label, bin }))));
}

const itemsKey = (items: { label: string }[]) => items.map((i) => i.label).sort().join("|");

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "⚽ kicked ball" → "kicked ball". */
const words = (item: string) => item.slice(item.indexOf(" ") + 1);

const scene = (...items: [string, number, number, number?][]): Visual => ({
  kind: "scene",
  items: items.map(([emoji, x, y, size]) => (size ? { emoji, x, y, size } : { emoji, x, y })),
});

const NAMES = ["Mia", "Ben", "Ava", "Leo", "Zoe", "Sam", "Kai", "Ana"];

/** Two different names. */
function twoNames(): [string, string] {
  const [a, b] = shuffle(NAMES);
  return [a, b];
}

/* ============================================= World 1: forces and motion patterns */

const PUSHED: [string, string][] = [
  ["📦", "box"],
  ["🛒", "cart"],
  ["🪨", "rock"],
  ["🛷", "sled"],
  ["🪑", "chair"],
];
const BALANCED = "Balanced";
const UNBALANCED = "Unbalanced";

/** 3-PS2-1 — are the forces balanced? */
export function balancedOrNot(): Question {
  const form = rand(0, 2);
  if (form === 2) {
    // Up and down: a lamp on a cord, a book on a table, or a hand lifting a bag.
    const ctx = pick([
      { e: "💡", name: "lamp", surface: "ceiling" as const, up: "cord" },
      { e: "📕", name: "book", surface: "floor" as const, up: "table" },
      { e: "🎒", name: "bag", surface: "none" as const, up: "hand" },
    ]);
    const w = rand(2, 9);
    const up = ctx.up === "hand" && Math.random() < 0.6 ? w + rand(1, 4) : w;
    const bal = up === w;
    return make(
      {
        key: `bal-v-${ctx.name}-${up}-${w}`,
        prompt: `Forces on the ${ctx.name}: balanced or unbalanced?`,
        visual: {
          kind: "phys-forces",
          object: ctx.e,
          surface: ctx.surface,
          forces: [
            { dir: 90, size: up, label: `${ctx.up} ${up} N` },
            { dir: 270, size: w, label: `gravity ${w} N` },
          ],
        },
        needsVisual: true,
        hint: "Compare the up force with the down force. Equal and opposite means balanced.",
        explain: bal ? `${up} N up and ${w} N down are equal and opposite: balanced. The ${ctx.name} stays put.` : `${up} N up is more than ${w} N down: unbalanced, so the ${ctx.name} starts to move up.`,
      },
      fixed([BALANCED, UNBALANCED], bal ? BALANCED : UNBALANCED),
    );
  }
  const [e, name] = pick(PUSHED);
  const a = rand(2, 9);
  const b = Math.random() < 0.45 ? a : pick([1, 2, 3].map((d) => a + d * pick([1, -1])).filter((x) => x >= 1 && x <= 10));
  const bal = a === b;
  if (form === 1) {
    // Two pushes on one side, one on the other.
    const a1 = rand(1, a - 1 || 1);
    const split = a1 < a;
    const leftLabel = split ? `${a1} N + ${a - a1} N` : `${a} N`;
    return make(
      {
        key: `bal-two-${name}-${a1}-${a}-${b}`,
        prompt: `Two kids push from the left, one from the right. Balanced?`,
        speech: `${split ? `Two kids push the ${name} to the right with ${a1} newtons and ${a - a1} newtons` : `A kid pushes the ${name} right with ${a} newtons`}. Another pushes left with ${b} newtons. Are the forces balanced?`,
        visual: {
          kind: "phys-forces",
          object: e,
          surface: "floor",
          forces: [
            { dir: 0, size: a, label: leftLabel },
            { dir: 180, size: b, label: `${b} N` },
          ],
        },
        needsVisual: true,
        hint: "Add the pushes that go the same way. Then compare the two sides.",
        explain: bal ? `${leftLabel} = ${a} N right and ${b} N left: equal, so balanced.` : `${a} N right and ${b} N left are not equal, so the forces are unbalanced.`,
      },
      fixed([BALANCED, UNBALANCED], bal ? BALANCED : UNBALANCED),
    );
  }
  return make(
    {
      key: `bal-h-${name}-${a}-${b}`,
      prompt: `Forces on the ${name}: balanced or unbalanced?`,
      visual: {
        kind: "phys-forces",
        object: e,
        surface: "floor",
        forces: [
          { dir: 0, size: a, label: a },
          { dir: 180, size: b, label: b },
        ],
      },
      needsVisual: true,
      hint: "Balanced forces are the same size and point opposite ways.",
      explain: bal ? `${a} N right and ${b} N left are equal: balanced.` : `${a} N right and ${b} N left are different: unbalanced.`,
    },
    fixed([BALANCED, UNBALANCED], bal ? BALANCED : UNBALANCED),
  );
}

const LEFT = "⬅️ Left";
const RIGHT = "➡️ Right";
const UP = "⬆️ Up";
const DOWN = "⬇️ Down";
const STILL = "It stays still";

/** 3-PS2-1 — unbalanced forces start motion toward the bigger force. */
export function whichWayMoves(): Question {
  const vertical = Math.random() < 0.3;
  const a = rand(2, 9);
  const b = Math.random() < 0.25 ? a : pick([1, 2, 3, 4].map((d) => a + d * pick([1, -1])).filter((x) => x >= 1 && x <= 10));
  const [n1, n2] = twoNames();
  if (vertical) {
    // a = the lift, b = gravity.
    const right = a === b ? STILL : a > b ? UP : DOWN;
    return make(
      {
        key: `wwm-v-${a}-${b}`,
        prompt: `${n1} pulls a bucket up on a rope. Which way does it move?`,
        speech: `${n1} pulls up on a bucket with ${a} newtons. Gravity pulls it down with ${b} newtons. It starts at rest. Which way does it move?`,
        visual: {
          kind: "phys-forces",
          object: "🪣",
          forces: [
            { dir: 90, size: a, label: `rope ${a} N` },
            { dir: 270, size: b, label: `gravity ${b} N` },
          ],
        },
        needsVisual: true,
        hint: "Which arrow is bigger? Unbalanced forces move it toward the bigger one.",
        explain: a === b ? `${a} N up and ${b} N down balance, so the bucket stays still.` : `The ${a > b ? "up" : "down"} force is bigger by ${Math.abs(a - b)} N, so the bucket moves ${a > b ? "up" : "down"}.`,
      },
      fixed([UP, DOWN, STILL], right),
    );
  }
  const right = a === b ? STILL : a > b ? RIGHT : LEFT;
  return make(
    {
      key: `wwm-h-${a}-${b}`,
      prompt: `Tug of war! ${n1} pulls right, ${n2} pulls left. Which way does the rope go?`,
      speech: `${n1} pulls right with ${a} newtons. ${n2} pulls left with ${b} newtons. Which way does the rope move?`,
      visual: {
        kind: "phys-forces",
        object: "🪢",
        forces: [
          { dir: 0, size: a, label: `${n1} ${a} N` },
          { dir: 180, size: b, label: `${n2} ${b} N` },
        ],
      },
      needsVisual: true,
      hint: "If the pulls are equal, nothing moves. If not, it moves toward the stronger pull.",
      explain: a === b ? `Both pull with ${a} N. The forces balance, so the rope stays still.` : `${a > b ? n1 : n2} pulls harder (${Math.max(a, b)} N vs ${Math.min(a, b)} N), so the rope moves ${a > b ? "right" : "left"}.`,
    },
    fixed([LEFT, RIGHT, STILL], right),
  );
}

/** 3-PS2-1 — add forces the same way, subtract opposite ones; find a missing force. */
export function netForce(): Question {
  const form = rand(0, 2);
  const [e, name] = pick(PUSHED);
  if (form === 0) {
    const a = rand(3, 12);
    let b = rand(1, 11);
    while (b === a) b = rand(1, 11);
    const n = Math.abs(a - b);
    return make(
      {
        key: `net-opp-${a}-${b}-${name}`,
        prompt: `What is the net force on the ${name}?`,
        speech: `${a} newtons push right and ${b} newtons push left. What is the net force, the total push?`,
        visual: {
          kind: "phys-forces",
          object: e,
          surface: "floor",
          forces: [
            { dir: 0, size: a, label: a },
            { dir: 180, size: b, label: b },
          ],
        },
        needsVisual: true,
        hint: "Opposite forces cancel. Take the smaller from the bigger.",
        explain: `${Math.max(a, b)} − ${Math.min(a, b)} = ${n} N, toward the ${a > b ? "right" : "left"}.`,
      },
      keypad(n, "N"),
    );
  }
  if (form === 1) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    const [n1, n2] = twoNames();
    return make(
      {
        key: `net-same-${a}-${b}`,
        prompt: `${n1} pushes the ${name} with ${a} N. ${n2} helps, pushing the same way with ${b} N. Net force?`,
        visual: scene(["🧒", 18, 60, 1.3], ["🧒", 34, 60, 1.3], [e, 62, 62, 1.4], ["➡️", 86, 62]),
        hint: "Forces that point the same way add up.",
        explain: `Same direction, so add: ${a} + ${b} = ${a + b} N.`,
      },
      keypad(a + b, "N"),
    );
  }
  const a = rand(3, 10);
  const [n1, n2] = twoNames();
  return make(
    {
      key: `net-miss-${a}-${name}`,
      prompt: `The ${name} doesn't move. ${n1} pushes right with ${a} N. How hard does ${n2} push left?`,
      visual: {
        kind: "phys-forces",
        object: e,
        surface: "floor",
        forces: [
          { dir: 0, size: a, label: a },
          { dir: 180, size: a, label: "?" },
        ],
      },
      hint: "If it doesn't move, the forces are balanced: equal and opposite.",
      explain: `The forces are balanced, so ${n2} pushes with the same ${a} N the other way.`,
    },
    keypad(a, "N"),
  );
}

/** 3-PS2-1 — Do it: draw the force that balances the others. */
export function balanceArrows(): Question {
  const ctx = rand(0, 3);
  if (ctx <= 1) {
    const s = rand(1, 6);
    const surface = ctx === 0 ? ("floor" as const) : ("ceiling" as const);
    const what = ctx === 0 ? { e: pick(["📕", "📦", "🪴"]), up: "table push" } : { e: pick(["💡", "🪴", "🎁"]), up: "string pull" };
    return make(
      {
        key: `ba-v-${ctx}-${what.e}-${s}`,
        prompt: `Do it: gravity pulls down ${s} N. Draw the ${what.up} that holds it still.`,
        speech: `Gravity pulls down with ${s} newtons, and it stays still. Drag to draw the ${what.up} that balances gravity.`,
        hint: "Balanced forces are equal and opposite. Same size, other way.",
        explain: `The ${what.up} is ${s} N up: it balances ${s} N of gravity, so the net force is zero.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          object: what.e,
          surface,
          directions: 4,
          maxSize: 6,
          given: [{ dir: 270, size: s, label: `gravity ${s} N` }],
          arrows: [{ label: what.up, answer: { dir: 90, size: s } }],
        },
        s,
      ),
    );
  }
  const [e, name] = pick(PUSHED);
  if (ctx === 2) {
    const s = rand(1, 6);
    const d = pick([0, 180]);
    return make(
      {
        key: `ba-h1-${name}-${s}-${d}`,
        prompt: `Do it: ${s} N pushes the ${name} ${d === 0 ? "right" : "left"}. Draw a push that keeps it still.`,
        hint: "Make an arrow the same size, pointing the other way.",
        explain: `A ${s} N push to the ${d === 0 ? "left" : "right"} balances it. Net force: zero.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          object: e,
          surface: "floor",
          directions: 4,
          maxSize: 6,
          given: [{ dir: d, size: s, label: `${s} N` }],
          arrows: [{ label: "your push", answer: { dir: (d + 180) % 360, size: s } }],
        },
        s,
      ),
    );
  }
  let p = rand(2, 6);
  let q = rand(1, 5);
  while (q >= p) [p, q] = [rand(2, 6), rand(1, 5)];
  const d = pick([0, 180]);
  return make(
    {
      key: `ba-h2-${name}-${p}-${q}-${d}`,
      prompt: `Do it: add one push so the forces on the ${name} balance.`,
      speech: `${p} newtons push one way and ${q} newtons push the other way. Add one push so the forces balance.`,
      hint: `The ${p} N side is ahead by ${p - q} N. Help the weaker side by that much.`,
      explain: `${p} − ${q} = ${p - q}, so add ${p - q} N to the ${d === 0 ? "left" : "right"}. Then both sides are ${p} N.`,
    },
    act(
      {
        kind: "phys-forceArrows",
        object: e,
        surface: "floor",
        directions: 4,
        maxSize: 6,
        given: [
          { dir: d, size: p, label: `${p} N` },
          { dir: (d + 180) % 360, size: q, label: `${q} N` },
        ],
        arrows: [{ label: "your push", answer: { dir: (d + 180) % 360, size: p - q } }],
      },
      p - q,
    ),
  );
}

/** 3-PS2-1 — Do it: draw a push that gives a set net force (unbalanced on purpose). */
export function makeNet(): Question {
  const f = rand(1, 4);
  const n = rand(1, 6 - f);
  const right = Math.random() < 0.5;
  const [e, name] = pick(PUSHED);
  const fdir = right ? 180 : 0;
  const pdir = right ? 0 : 180;
  return make(
    {
      key: `mn-${name}-${f}-${n}-${right ? "R" : "L"}`,
      prompt: `Do it: friction pulls back ${f} N. Push so the net force is ${n} N ${right ? "right" : "left"}.`,
      speech: `Friction pulls the ${name} back with ${f} newtons. Draw your push so the net force is ${n} newtons to the ${right ? "right" : "left"}, and the ${name} speeds up.`,
      hint: `Your push must beat friction by ${n} N: ${f} + ${n}.`,
      explain: `Push ${f + n} N ${right ? "right" : "left"}. ${f + n} − ${f} = ${n} N net, so the ${name} speeds up.`,
    },
    act(
      {
        kind: "phys-forceArrows",
        object: e,
        surface: "floor",
        directions: 4,
        maxSize: 6,
        given: [{ dir: fdir, size: f, label: `friction ${f} N` }],
        arrows: [{ label: "your push", answer: { dir: pdir, size: f + n } }],
        net: { x: right ? n : -n, y: 0 },
      },
      f + n,
    ),
  );
}

const STAY = ["📕 book resting on a desk", "🪢 tug of war, nobody moving", "💡 lamp hanging still", "🚤 boat floating still", "🚗 car cruising at a steady speed", "🧗 climber hanging still on a rope"];
const CHANGE = ["⚽ ball kicked from rest", "🚲 bike braking to a stop", "🚀 rocket speeding up", "🍎 apple starting to fall", "🏒 puck hit sideways", "🛷 sled starting down a hill"];

/** 3-PS2-1 — Do it: sort balanced and unbalanced situations. */
export function sortBalanced(): Question {
  const items = sortItems([STAY, CHANGE], [rand(2, 4), rand(2, 4)]);
  return make(
    {
      key: `sbal-${itemsKey(items)}`,
      prompt: "Do it: balanced or unbalanced forces?",
      speech: "Sort each one. Balanced forces: the motion stays the same. Unbalanced forces: the motion changes.",
      hint: "Does it start, stop, speed up, slow down or turn? Then the forces are unbalanced.",
      explain: "Balanced forces keep motion the same (still stays still, steady stays steady). Unbalanced forces change motion.",
    },
    act({ kind: "sort", bins: ["⚖️ Balanced", "💨 Unbalanced"], items }, items.length),
  );
}

const SPEEDS_UP = "Speeds up";
const SLOWS = "Slows down";
const TURNS = "Turns";
const SAME = "Keeps the same motion";

/** 3-PS2-1 — what unbalanced (and balanced) forces do to something already moving. */
export function forceChangesMotion(): Question {
  const [e, name] = pick([["🛷", "sled"], ["🛒", "cart"], ["🛹", "skateboard"], ["🚲", "bike"]] as [string, string][]);
  const m = pick([0, 180]);
  const kind = pick(["up", "slow", "same", "turn"] as const);
  const f = rand(2, 6);
  let push = f;
  if (kind === "up") push = f + rand(1, 4);
  if (kind === "slow") push = rand(0, f - 1);
  const forces: ForceArrow[] =
    kind === "turn"
      ? [{ dir: pick([90, 270]), size: f, label: `${f} N` }]
      : [
          ...(push ? [{ dir: m, size: push, label: `push ${push} N` }] : []),
          { dir: (m + 180) % 360, size: f, label: `friction ${f} N` },
        ];
  const right = kind === "up" ? SPEEDS_UP : kind === "slow" ? SLOWS : kind === "same" ? SAME : TURNS;
  return make(
    {
      key: `fcm-${name}-${kind}-${m}-${push}-${f}-${forces[0].dir}`,
      prompt: `The ${name} is moving. What happens next?`,
      speech: `The ${name} is already moving. Look at the forces on it. What happens next?`,
      visual: { kind: "phys-forces", object: e, forces, motion: { dir: m, label: "moving" }, ...(kind === "turn" ? {} : { surface: "floor" as const }) },
      needsVisual: true,
      hint: "Compare the forces along the motion. More forward: faster. More backward: slower. Equal: no change. Sideways: it turns.",
      explain:
        kind === "up"
          ? `The push (${push} N) beats friction (${f} N), so the ${name} speeds up.`
          : kind === "slow"
            ? `Friction (${f} N) is bigger than the push (${push} N), so the ${name} slows down.`
            : kind === "same"
              ? `Push and friction are both ${f} N: balanced. The ${name} keeps moving at the same speed.`
              : `A sideways force changes the direction: the ${name} turns.`,
    },
    fixed([SPEEDS_UP, SLOWS, TURNS, SAME], right),
  );
}

const SWING_CASES: Case[] = [
  { k: "short", prompt: "Flare makes the pendulum string shorter. Each swing takes…", right: "Less time", options: ["Less time", "More time", "The same time"], visual: { kind: "phys-oscillator", type: "pendulum", angle: 25, angleLabel: null, swing: true, animate: true }, hint: "Think of a short swing and a long swing at the playground.", explain: "A shorter pendulum swings back and forth faster: each swing takes less time." },
  { k: "long", prompt: "Flare makes the pendulum string longer. Each swing takes…", right: "More time", options: ["Less time", "More time", "The same time"], visual: { kind: "phys-oscillator", type: "pendulum", angle: 25, angleLabel: null, swing: true, animate: true }, hint: "Long swings are slow and lazy.", explain: "A longer pendulum swings more slowly: each swing takes more time." },
  { k: "seesaw", prompt: "One end of a seesaw goes down. The other end…", right: "Goes up", options: ["Goes up", "Goes down", "Stays still"], visual: scene(["🧒", 20, 70, 1.3], ["⚖️", 50, 70, 1.4], ["👧", 80, 45, 1.3]), hint: "The board turns around the middle.", explain: "A seesaw turns about the middle, so when one end goes down, the other goes up." },
  { k: "seesaw-next", prompt: "Mia's end of the seesaw goes: down, up, down, up… What comes next?", right: "Down", options: ["Up", "Down"], hint: "Look for the repeating pattern.", explain: "The pattern repeats down, up, down, up, so next is down." },
  { k: "bowl", prompt: "A marble rolls back and forth in a bowl. It's at the left side. Next it rolls to…", right: "The right side", options: ["The left side", "The right side", "Out of the bowl"], hint: "It swings from side to side.", explain: "It rolls down through the bottom and up the other side: next it's on the right." },
  { k: "stops", prompt: "A swing is pushed once and left alone. What happens over time?", right: "The swings get smaller", options: ["The swings get smaller", "The swings get bigger", "It swings forever the same"], hint: "Air and the chains rub a little each swing.", explain: "Air and friction take a little energy each time, so the swings get smaller until it stops." },
];

/** 3-PS2-2 — back-and-forth patterns: pendulums, swings and seesaws. */
export function backAndForth(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const T = pick([1, 2, 3, 4]);
    const n = rand(2, 10);
    return make(
      {
        key: `bf-count-${T}-${n}`,
        prompt: `One full swing (over and back) takes ${T} s. How many full swings in ${T * n} s?`,
        speech: `One full swing, over and back, takes ${T} ${T === 1 ? "second" : "seconds"}. How many full swings happen in ${T * n} seconds?`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 30, angleLabel: null, swing: true, animate: true },
        hint: `Count by ${T}s until you reach ${T * n}.`,
        explain: `${T * n} ÷ ${T} = ${n} full swings. The pattern repeats every ${T} s.`,
      },
      keypad(n),
    );
  }
  if (form === 1) {
    const startLeft = Math.random() < 0.5;
    const t = rand(5, 12);
    const side = (k: number) => ((k % 2 === 0) === startLeft ? "left" : "right");
    return make(
      {
        key: `bf-table-${startLeft ? "L" : "R"}-${t}`,
        prompt: `The pendulum reaches a side every second. Which side at ${t} s?`,
        visual: { kind: "table", header: ["Time (s)", "0", "1", "2", "3", "4"], rows: [["Side", side(0), side(1), side(2), side(3), side(4)]] },
        needsVisual: true,
        hint: "Look at the pattern. Even seconds are on one side, odd seconds on the other.",
        explain: `${t} is ${t % 2 === 0 ? "even" : "odd"}, like ${t % 2 === 0 ? 0 : 1} s, so it's on the ${side(t)}.`,
      },
      fixed(["Left", "Right"], cap(side(t))),
    );
  }
  return ask("bf", pick(SWING_CASES));
}

/** 3-PS2-2 — use a motion pattern to predict where it will be next. */
export function motionPattern(): Question {
  const kind = pick(["steady", "steady", "slow", "fast"] as const);
  let pos: number[];
  if (kind === "steady") {
    const k = rand(2, 5);
    pos = [0, k, 2 * k, 3 * k];
  } else if (kind === "slow") {
    const g = rand(4, 6);
    pos = [0, g, 2 * g - 1, 3 * g - 3];
  } else {
    const a = rand(1, 2);
    pos = [0, a, 3 * a, 6 * a];
  }
  const gaps = pos.slice(1).map((p, i) => p - pos[i]);
  const nextGap = kind === "steady" ? gaps[0] : kind === "slow" ? gaps[2] - 1 : gaps[2] + gaps[0];
  const next = pos[3] + nextGap;
  const e = pick(["⚽", "🚗", "🐢", "🛹"]);
  const table = Math.random() < 0.35;
  const say = kind === "steady" ? "the same amount each second" : kind === "slow" ? "1 less each second" : "a bit more each second";
  return make(
    {
      key: `mp-${kind}-${pos.join("-")}-${e}-${table ? "t" : "p"}`,
      prompt: table ? "Where will it be at 4 s?" : `The ${e} is shown every second. Where will it be next?`,
      speech: table ? "The table shows where the toy is each second. Where will it be at 4 seconds?" : "The dots show where it is each second. Where will it be one second later?",
      visual: table
        ? { kind: "table", header: ["Time (s)", "0", "1", "2", "3", "4"], rows: [["Place (m)", ...pos.map(String), "?"]] }
        : { kind: "phys-motion", track: { min: 0, max: next > 20 ? 30 : 20, step: 1, labelStep: 5, unit: "m" }, rows: [{ emoji: e, flip: e === "🚗", positions: pos }], look: "ghosts", times: true },
      needsVisual: true,
      hint: `Find the gaps: ${gaps.join(", ")}. What will the next gap be?`,
      explain: `The gaps go ${gaps.join(", ")}: it moves ${say}. Next gap ${nextGap}, so ${pos[3]} + ${nextGap} = ${next} m.`,
    },
    numbers(next, [pos[3] + gaps[2], pos[3] + gaps[0], next + 1, next - 1, pos[3]], 0, 40, "m"),
  );
}

/** 3-PS2-1, 3-PS2-2 — Do it: balance the seesaw. */
export function balanceSeesaw(): Question {
  const kidMass = pick([1, 2]);
  const e = pick(["🐘", "🐻", "🧒", "📦"]);
  const at = rand(1, 4);
  const mass = kidMass * rand(1, 3);
  return make(
    {
      key: `bs-${e}-${at}-${mass}-${kidMass}`,
      prompt: `Do it: balance the seesaw! Add ${kidMass} kg blocks on the right.`,
      speech: `A ${mass} kilogram load sits on the left, ${at} ${at === 1 ? "space" : "spaces"} from the middle. Add blocks on the right to balance it.`,
      hint: "Same weight, same distance balances. A block farther out counts for more.",
      explain: `The left side has ${mass} kg × ${at} = ${mass * at}. Make the right side match: e.g. ${mass / kidMass} ${mass / kidMass === 1 ? "block" : "blocks"} at ${at} spaces.`,
    },
    act({ kind: "phys-balance", slots: 4, fixed: [{ side: "left", at, mass, emoji: e }], mass: kidMass, side: "right", unit: "kg" }, mass * at),
  );
}

/* ======================================================= World 2: magnets and static */

const ATTRACT = "Attract (pull together)";
const REPEL = "Repel (push apart)";
type Mag = "NS" | "SN";

/** 3-PS2-3 — like poles repel, unlike poles attract. */
export function attractRepel(): Question {
  const form = rand(0, 2);
  if (form === 2) {
    const [p, q] = [pick(["N", "S"]), pick(["N", "S"])];
    return make(
      {
        key: `ar-text-${p}${q}`,
        prompt: `An ${p} end comes near an ${q} end. What happens?`,
        hint: "Same ends push away. Different ends pull together.",
        explain: p === q ? `${p} and ${q} are the same, so they repel.` : `${p} and ${q} are different, so they attract.`,
      },
      fixed([ATTRACT, REPEL], p === q ? REPEL : ATTRACT),
    );
  }
  const mags: [Mag, Mag] = [pick(["NS", "SN"] as Mag[]), pick(["NS", "SN"] as Mag[])];
  const flip = form === 1;
  const after: [Mag, Mag] = flip ? [mags[0], mags[1] === "NS" ? "SN" : "NS"] : mags;
  const facing = [after[0][1], after[1][0]];
  const attract = facing[0] !== facing[1];
  return make(
    {
      key: `ar-pic-${mags.join("")}-${flip ? "flip" : "as"}`,
      prompt: flip ? "Flare flips the right magnet around. Now what happens?" : "Will these magnets attract or repel?",
      visual: { kind: "phys-magnets", scene: "bars", magnets: mags },
      needsVisual: true,
      hint: flip ? "Flipping swaps which end faces the other magnet." : "Look at the two ends that face each other.",
      explain: `${flip ? "After the flip, " : ""}the facing ends are ${facing[0]} and ${facing[1]}: ${attract ? "different, so they attract" : "the same, so they repel"}.`,
    },
    fixed([ATTRACT, REPEL], attract ? ATTRACT : REPEL),
  );
}

const ARRANGE_CTX = {
  attract: ["join the toy train cars", "snap the latch shut", "stick the two magnets together"],
  repel: ["make the top magnet float", "make the bumper cars bounce apart", "keep the toy train hovering"],
};

/** 3-PS2-3, 3-PS2-4 — Do it: flip a magnet to make them attract or repel. */
export function arrangeMagnets(): Question {
  const want = pick(["attract", "repel"] as const);
  const ctx = pick(ARRANGE_CTX[want]);
  let start: [Mag, Mag];
  do start = [pick(["NS", "SN"] as Mag[]), pick(["NS", "SN"] as Mag[])];
  while ((start[0][1] !== start[1][0]) === (want === "attract"));
  const fixedLeft = Math.random() < 0.5;
  return make(
    {
      key: `am-${want}-${ctx}-${start.join("")}-${fixedLeft ? "f" : "x"}`,
      prompt: `Do it: ${ctx}! Flip a magnet so they ${want}.`,
      speech: `${cap(ctx)}! Tap a magnet to flip it, so the magnets ${want}.`,
      hint: want === "attract" ? "Different ends (N and S) must face each other." : "The same ends (N and N, or S and S) must face each other.",
      explain: want === "attract" ? "With N facing S, the magnets pull together." : "With like poles facing, the magnets push apart.",
    },
    act({ kind: "phys-magnet", mode: "arrange", want, start, ...(fixedLeft ? { fixed: "left" as const } : {}) }),
  );
}

const MAGNETIC = ["📎 steel paper clip", "🔩 steel bolt", "🧷 steel safety pin", "🥫 steel food can", "⚙️ iron gear", "🪝 iron hook"];
const NOT_MAGNETIC = ["🥤 aluminum can", "🪙 copper penny", "✏️ wooden pencil", "🧽 sponge", "🥛 glass cup", "💍 gold ring", "📄 paper", "🥄 plastic spoon"];

/** 3-PS2-3 — magnets pull on iron and steel, not on every metal. */
export function magneticOrNot(): Question {
  const form = rand(0, 2);
  if (form === 2)
    return ask(
      "mon",
      pick([
        { k: "which-metals", prompt: "A magnet pulls on things made of…", right: "Iron or steel", wrong: ["Any metal at all", "Plastic", "Wood"], hint: "Try a magnet on a copper penny and a steel paper clip.", explain: "Magnets pull on iron and steel (and a few other metals), but not on aluminum, copper or gold." },
        { k: "foil", prompt: "Will a magnet pick up aluminum foil?", right: "No", options: ["Yes", "No"], hint: "Not every metal is magnetic.", explain: "No. Aluminum is a metal, but magnets don't pull on it." },
        { k: "penny", prompt: "Will a magnet pick up a copper penny?", right: "No", options: ["Yes", "No"], hint: "Copper isn't iron or steel.", explain: "No. Copper is a metal that magnets don't attract." },
        { k: "fridge", prompt: "Why does a magnet stick to a fridge door?", right: "The door is made of steel", wrong: ["The door is sticky", "The door is cold", "The door is painted"], hint: "What is under the paint?", explain: "Fridge doors are steel, and magnets pull on steel." },
      ]),
    );
  const wantYes = form === 0;
  const right = pick(wantYes ? MAGNETIC : NOT_MAGNETIC);
  const wrong = shuffle(wantYes ? NOT_MAGNETIC : MAGNETIC).slice(0, 2);
  return make(
    {
      key: `mon-${wantYes ? "yes" : "no"}-${right}-${[...wrong].sort().join("|")}`,
      prompt: wantYes ? "Which one will a magnet pick up?" : "Which one will a magnet NOT pick up?",
      visual: scene(["🧲", 50, 50, 2]),
      hint: "Magnets pull on iron and steel. Not on aluminum, copper, gold, wood, glass or plastic.",
      explain: wantYes ? `The ${words(right)} has iron or steel in it, so the magnet pulls it.` : `The ${words(right)} has no iron or steel, so the magnet can't pick it up.`,
    },
    choose(right, wrong, 3),
  );
}

/** 3-PS2-3 — Do it: tap everything a magnet will pick up. */
export function pickupMagnet(): Question {
  const yes = shuffle(MAGNETIC).slice(0, rand(2, 3));
  const no = shuffle(NOT_MAGNETIC).slice(0, rand(3, 4));
  const items = shuffle([...yes.map((t) => ({ t, m: true })), ...no.map((t) => ({ t, m: false }))]).map(({ t, m }) => ({ name: words(t), emoji: t.slice(0, t.indexOf(" ")), magnetic: m }));
  return make(
    {
      key: `pum-${items.map((i) => i.name).sort().join("|")}`,
      prompt: "Do it: tap everything the magnet will pick up.",
      hint: "Look for iron and steel. Aluminum, copper and gold don't count!",
      explain: `The magnet picks up: ${yes.map(words).join(", ")}.`,
    },
    act({ kind: "phys-magnet", mode: "pickup", items }, yes.length),
  );
}

const DIST_CASES: Case[] = [
  { k: "touch", prompt: "Does a magnet have to touch a paper clip to pull it?", right: "No, it pulls from a distance", wrong: ["Yes, it must touch", "Only if it's wet"], visual: scene(["🧲", 30, 55, 1.6], ["📎", 70, 55, 1.2]), hint: "Watch a clip jump to a magnet.", explain: "Magnets pull without touching. The pull works across a gap." },
  { k: "paper", prompt: "Will a magnet pull a clip through a sheet of paper?", right: "Yes", options: ["Yes", "No"], hint: "Magnetic pull passes through many things.", explain: "Yes. The magnetic force passes through paper, cardboard, water and glass." },
  { k: "closer", prompt: "Which clip feels the strongest pull: 1 cm, 4 cm or 8 cm away?", right: "1 cm away", wrong: ["4 cm away", "8 cm away"], hint: "The pull gets weaker with distance.", explain: "The closer the clip, the stronger the magnet's pull." },
  { k: "water", prompt: "A paper clip is in a jar of water. Can a magnet outside the glass move it?", right: "Yes", options: ["Yes", "No"], hint: "Magnetic force passes through glass and water.", explain: "Yes. The magnet's pull goes right through the glass and water." },
];

/** 3-PS2-3 — magnetic pull gets weaker with distance (read a test). */
export function magnetDistance(): Question {
  const form = rand(0, 3);
  if (form === 3) return ask("md", pick(DIST_CASES));
  const c4 = rand(0, 2);
  const c3 = c4 + rand(1, 2);
  const c2 = c3 + rand(1, 3);
  const c1 = c2 + rand(2, 4);
  const clips = [c1, c2, c3, c4];
  const visual: Visual = { kind: "table", header: ["Distance", "1 cm", "2 cm", "3 cm", "4 cm"], rows: [["Clips picked up", ...clips]] };
  if (form === 0) {
    const i = rand(0, 2);
    const j = rand(i + 1, 3);
    return make(
      {
        key: `md-diff-${clips.join("-")}-${i}-${j}`,
        prompt: `How many more clips at ${i + 1} cm than at ${j + 1} cm?`,
        visual,
        needsVisual: true,
        hint: "Find both numbers in the table and subtract.",
        explain: `${clips[i]} − ${clips[j]} = ${clips[i] - clips[j]}. Closer magnets pull harder, so they lift more clips.`,
      },
      keypad(clips[i] - clips[j]),
    );
  }
  if (form === 1)
    return make(
      {
        key: `md-pred-${clips.join("-")}`,
        prompt: "Predict: at 5 cm, the magnet will pick up…",
        visual,
        needsVisual: true,
        hint: "Look at the pattern as the distance grows.",
        explain: "The farther away, the fewer clips. At 5 cm it will pick up as many as at 4 cm or fewer.",
      },
      choose(`${c4 === 0 ? "No clips" : `${c4} or fewer clips`}`, [`More than ${c1} clips`, `About ${c2} clips`, `Exactly ${c1} clips`], 3),
    );
  return make(
    {
      key: `md-rule-${clips.join("-")}`,
      prompt: "What does the test show?",
      visual,
      needsVisual: true,
      hint: "As the distance goes up, what happens to the clips?",
      explain: `From ${c1} clips at 1 cm down to ${c4} at 4 cm: the magnet's pull gets weaker farther away.`,
    },
    choose("The pull is weaker farther away", ["The pull is stronger farther away", "Distance doesn't matter", "The magnet got tired"], 3),
  );
}

const TOGETHER = "Pull together";
const APART = "Push apart";

/** 3-PS2-3 — like charges repel, unlike charges attract. */
export function staticCharges(): Question {
  if (Math.random() < 0.3)
    return ask(
      "sc",
      pick([
        { k: "hair", prompt: "A balloon is rubbed on hair. The balloon gets − charge, the hair + charge. They…", right: TOGETHER, options: [TOGETHER, APART], visual: scene(["🎈", 35, 50, 1.8], ["💇", 70, 55, 1.6]), hint: "Opposite charges attract.", explain: "− and + are opposite charges, so the balloon and hair pull together." },
        { k: "two-balloons", prompt: "Two balloons are both rubbed on wool. Both get − charge. Hung side by side, they…", right: APART, options: [TOGETHER, APART], visual: scene(["🎈", 38, 45, 1.6], ["🎈", 62, 45, 1.6]), hint: "Same charges repel.", explain: "Both are −, the same charge, so they push apart." },
        { k: "hairs", prompt: "After a wool hat comes off, each hair has + charge. The hairs…", right: APART, options: [TOGETHER, APART], visual: scene(["💇", 50, 55, 2]), hint: "Same charges repel.", explain: "Each hair has the same charge, so they push each other apart and stand up." },
      ]),
    );
  const s1 = pick(["+", "−"] as const);
  const s2 = pick(["+", "−"] as const);
  const x = pick([1.5, 2, 3]);
  const q = rand(1, 2);
  const same = s1 === s2;
  return make(
    {
      key: `sc-${s1}${s2}-${x}-${q}`,
      prompt: "Do these charges pull together or push apart?",
      speech: `One charge is ${s1 === "+" ? "positive" : "negative"} and the other is ${s2 === "+" ? "positive" : "negative"}. Do they pull together or push apart?`,
      visual: {
        kind: "phys-magnets",
        scene: "charges",
        charges: [
          { sign: s1, x: -x, y: 0, q },
          { sign: s2, x, y: 0, q },
        ],
      },
      needsVisual: true,
      hint: "Like magnets: same pushes apart, different pulls together.",
      explain: same ? `Both are ${s1}: same charges push apart.` : "One + and one −: opposite charges pull together.",
    },
    fixed([TOGETHER, APART], same ? APART : TOGETHER),
  );
}

const STATIC_CASES: Case[] = [
  { k: "paper-bits", prompt: "A rubbed balloon picks up tiny paper bits. Why?", right: "Static charge pulls them", wrong: ["The balloon is sticky", "The paper is magnetic", "Wind blows them up"], visual: scene(["🎈", 50, 35, 1.8], ["📄", 40, 80, 0.8], ["📄", 60, 82, 0.8]), hint: "Rubbing gives the balloon an electric charge.", explain: "Rubbing charges the balloon, and the charge pulls the paper bits up, without touching." },
  { k: "doorknob", prompt: "Shuffle on a carpet, touch a doorknob: zap! What was it?", right: "Static electricity", wrong: ["Magnetism", "Gravity", "Heat from the carpet"], hint: "Rubbing builds up charge.", explain: "Shuffling builds up static charge on you, and it jumps to the metal knob as a tiny spark." },
  { k: "socks", prompt: "Socks from the dryer cling together. Why?", right: "They have opposite static charges", wrong: ["They are wet", "They are magnetic", "They are hot"], hint: "Tumbling rubs the clothes together.", explain: "Rubbing in the dryer gives clothes static charges, and opposite charges cling." },
  { k: "touch", prompt: "Must a charged balloon touch your hair to lift it?", right: "No", options: ["Yes", "No"], hint: "Try holding it just above your hair.", explain: "No. Electric forces, like magnetic forces, act across a gap." },
  { k: "wall", prompt: "A rubbed balloon sticks to the wall. What holds it?", right: "An electric (static) force", wrong: ["Glue", "Gravity", "A magnet"], visual: scene(["🧱", 75, 50, 2.4], ["🎈", 55, 45, 1.6]), hint: "The balloon was rubbed first.", explain: "The rubbed balloon is charged. Its electric pull holds it to the wall." },
  { k: "water", prompt: "A charged comb is held near a thin stream of water. The water…", right: "Bends toward the comb", wrong: ["Freezes", "Stops flowing", "Bends away and splashes"], visual: scene(["💧", 55, 50, 1.6], ["🪮", 30, 50, 1.4]), hint: "Charged things pull on things nearby.", explain: "The comb's charge pulls on the water, so the stream bends toward it." },
  { k: "lightning", prompt: "Lightning is a giant spark of…", right: "Static electricity", wrong: ["Magnetism", "Sunlight", "Sound"], visual: scene(["⛈️", 50, 40, 2]), hint: "Charges build up in storm clouds.", explain: "Charges build up in clouds, then jump as a huge spark: lightning." },
  { k: "dust", prompt: "A TV screen pulls in dust. Which force does it?", right: "Static electric force", wrong: ["Gravity", "Wind", "Magnetic force"], hint: "Screens can build up charge.", explain: "The screen gets a static charge that pulls dust toward it." },
  { k: "stronger", prompt: "A charged balloon is moved closer to paper bits. The pull gets…", right: "Stronger", options: ["Stronger", "Weaker", "No different"], hint: "Same as magnets!", explain: "Electric pulls, like magnetic ones, get stronger when things are closer." },
  { k: "rub-more", prompt: "Flare rubs the balloon more. What happens?", right: "It picks up more paper", wrong: ["It picks up less paper", "It pops", "Nothing changes"], hint: "More rubbing builds more charge.", explain: "More rubbing builds more charge, and more charge pulls harder." },
  { k: "slide", prompt: "Why does your hair stand up after a plastic slide?", right: "Your hair got static charge", wrong: ["The slide is magnetic", "The wind blew it", "Gravity flipped"], visual: scene(["🛝", 50, 60, 2]), hint: "Sliding rubs you against the plastic.", explain: "Sliding rubs charge onto you. Each hair gets the same charge, so they push apart." },
  { k: "plastic-wrap", prompt: "Plastic wrap clings to your hands as you pull it off. Why?", right: "Static charge from pulling it", wrong: ["It's covered in glue", "Your hands are magnets"], hint: "Peeling it off rubs it.", explain: "Pulling the wrap off the roll charges it, and the charge makes it cling." },
];

/** 3-PS2-3 — static electricity in real life. */
export const staticLife = bank("sl", STATIC_CASES);

const MAG_FORCE = ["🧲 fridge magnet holds a note", "🧭 compass needle points north", "📎 clips cling to a magnet", "🚆 maglev train floats", "🔩 magnet lifts a bolt"];
const STATIC_FORCE = ["🎈 rubbed balloon sticks to a wall", "💇 hair stands up after a hat", "⚡ zap from a doorknob", "🧦 socks cling after the dryer", "📄 comb lifts paper bits"];
const TOUCH_FORCE = ["⚽ kicking a ball", "🛒 pushing a cart", "🪢 pulling a rope", "🚪 opening a door", "✋ squeezing clay"];

/** 3-PS2-3 — Do it: sort magnetic, static electric and contact forces. */
export function sortForces(): Question {
  const items = sortItems([MAG_FORCE, STATIC_FORCE, TOUCH_FORCE], [2, 2, 2]);
  return make(
    {
      key: `sf-${itemsKey(items)}`,
      prompt: "Do it: sort the forces.",
      speech: "Sort each force. Is it magnetic, static electricity, or a touching push or pull?",
      hint: "Magnets and static charges both work without touching. Kicks and pushes need contact.",
      explain: "Magnetic and electric forces act at a distance. Pushes like kicking need contact.",
    },
    act({ kind: "sort", bins: ["🧲 Magnetic", "⚡ Static", "✋ Touching"], items }, items.length),
  );
}

const PROBLEM_WRONG = ["Use glue", "Use a sponge", "Use tape", "Use a balloon", "Use a fan"];
const PROBLEM_CASES: Case[] = [
  { k: "pins", prompt: "Steel pins spilled in the carpet. How can Flare get them all?", right: "Sweep a magnet over it", wrong: PROBLEM_WRONG, visual: scene(["🧷", 35, 70], ["🧷", 55, 75], ["🧷", 70, 68], ["🧲", 50, 30, 1.6]), hint: "What pulls on steel?", explain: "A magnet pulls the steel pins out of the carpet." },
  { k: "cabinet", prompt: "A cabinet door keeps swinging open. What design keeps it shut?", right: "A magnet latch on the door and frame", wrong: PROBLEM_WRONG, hint: "It should hold, but still open with a pull.", explain: "A magnetic latch pulls the door shut, but a good tug opens it." },
  { k: "cans", prompt: "A recycling center must sort steel cans from aluminum cans. How?", right: "Use a big magnet", wrong: PROBLEM_WRONG, visual: scene(["🥫", 30, 65, 1.4], ["🥤", 65, 65, 1.4]), hint: "Only one kind of can is magnetic.", explain: "A magnet lifts the steel cans and leaves the aluminum ones behind." },
  { k: "north", prompt: "Flare is lost on a hike. What helps find north?", right: "A compass", wrong: ["A flashlight", "A rubber band"], visual: scene(["🧭", 50, 50, 2]), hint: "Its needle is a tiny magnet.", explain: "A compass needle is a magnet that lines up with Earth's magnetism and points north." },
  { k: "tank", prompt: "How can Flare move a clip in a fish tank without getting wet?", right: "Slide a magnet outside the glass", wrong: PROBLEM_WRONG, visual: scene(["🐠", 40, 50, 1.4], ["📎", 60, 75], ["🧲", 85, 75, 1.4]), hint: "Magnetic force passes through glass and water.", explain: "The magnet's pull goes through the glass, so the clip follows it." },
  { k: "train", prompt: "How can a toy train float above its track?", right: "Magnets that repel", wrong: ["Magnets that attract", "Glue", "Wheels"], visual: scene(["🚆", 50, 50, 1.8]), hint: "It needs a push upward, without touching.", explain: "Like poles facing each other push apart, holding the train up." },
  { k: "pencil-box", prompt: "Which keeps a pencil box lid closed but easy to open?", right: "A magnetic clasp", wrong: ["Super glue", "Wet tape"], hint: "Strong enough to hold, easy to undo.", explain: "A magnetic clasp holds the lid shut but lets go with a gentle pull." },
  { k: "fridge-art", prompt: "How can Flare hang art on the fridge without holes?", right: "Use fridge magnets", wrong: ["Use nails", "Use a balloon"], hint: "The fridge door is steel.", explain: "Fridge magnets stick to the steel door and hold the paper." },
  { k: "fishing", prompt: "Design a fishing game where kids hook paper fish. What goes on the fish?", right: "A steel paper clip", wrong: ["A rubber band", "A cotton ball"], visual: scene(["🐟", 40, 70, 1.4], ["🎣", 70, 35, 1.6]), hint: "The rod has a magnet on its line.", explain: "The magnet on the line pulls the steel clip, so the fish gets hooked." },
  { k: "test-strength", prompt: "How can Flare test which magnet is strongest?", right: "Count the clips each one lifts", wrong: ["Weigh the magnets", "Look at their colour"], hint: "A stronger magnet pulls more.", explain: "The magnet that lifts the most paper clips is the strongest." },
  { k: "screw", prompt: "A tiny steel screw keeps falling off the screwdriver. Fix?", right: "Use a magnetic screwdriver tip", wrong: ["Hold it with tape", "Use a plastic screwdriver"], hint: "The screw is steel.", explain: "A magnetic tip pulls the steel screw and holds it in place." },
  { k: "door-stop", prompt: "Which keeps a door held open against the wall?", right: "A magnet on the door and the wall", wrong: ["A balloon", "A sponge"], hint: "It should hold, then let go with a pull.", explain: "A magnet catch holds the door against the wall until you pull it free." },
];

/** 3-PS2-4 — solve problems with magnets. */
export const magnetProblems = bank("mpr", PROBLEM_CASES);

const RECYCLE_YES = [
  { name: "steel soup can", emoji: "🥫" },
  { name: "steel jar lid", emoji: "⭕" },
  { name: "iron nail", emoji: "📌" },
  { name: "steel bottle cap", emoji: "🔘" },
];
const RECYCLE_NO = [
  { name: "aluminum soda can", emoji: "🥤" },
  { name: "glass jar", emoji: "🫙" },
  { name: "plastic bottle", emoji: "🧴" },
  { name: "newspaper", emoji: "📰" },
  { name: "cardboard box", emoji: "📦" },
];

/** 3-PS2-4 — Do it: design a magnet sorter for the recycling. */
export function recycleSorter(): Question {
  const yes = shuffle(RECYCLE_YES).slice(0, rand(2, 3));
  const no = shuffle(RECYCLE_NO).slice(0, rand(2, 4));
  const items = shuffle([...yes.map((i) => ({ ...i, magnetic: true })), ...no.map((i) => ({ ...i, magnetic: false }))]);
  return make(
    {
      key: `rs-${items.map((i) => i.name).sort().join("|")}`,
      prompt: "Do it: the magnet sorter. Tap what the magnet pulls out.",
      speech: "A recycling center uses a big magnet to sort the trash. Tap every item the magnet will pull out.",
      hint: "Only iron and steel are pulled. Aluminum isn't!",
      explain: `The magnet pulls out the ${yes.map((i) => i.name).join(", ")}. Everything else stays behind.`,
    },
    act({ kind: "phys-magnet", mode: "pickup", items }, yes.length),
  );
}

/* ============================================================ World 3: speed and energy */

const RACERS: [string, string, boolean][] = [
  ["🐢", "turtle", true],
  ["🐇", "rabbit", true],
  ["🚲", "bike", true],
  ["🐕", "dog", true],
  ["🚗", "car", true],
  ["🐌", "snail", true],
];

/** 4-PS3-1 — who is faster? Same time: farther is faster; same distance: less time is faster. */
export function whoIsFaster(): Question {
  if (Math.random() < 0.3) {
    const [n1, n2] = twoNames();
    const d = pick([50, 60, 100]);
    const t1 = rand(8, 20);
    let t2 = rand(8, 20);
    while (t2 === t1) t2 = rand(8, 20);
    return make(
      {
        key: `wif-time-${d}-${t1}-${t2}`,
        prompt: `${n1} runs ${d} m in ${t1} s. ${n2} runs ${d} m in ${t2} s. Who is faster?`,
        hint: "Same distance: the one who takes less time is faster.",
        explain: `${t1 < t2 ? n1 : n2} took less time (${Math.min(t1, t2)} s) for the same ${d} m, so ${t1 < t2 ? n1 : n2} is faster.`,
      },
      fixed([n1, n2], t1 < t2 ? n1 : n2),
    );
  }
  const [a, b] = shuffle(RACERS).slice(0, 2);
  const sa = rand(2, 8);
  let sb = rand(2, 8);
  while (sb === sa) sb = rand(2, 8);
  const askFast = Math.random() < 0.6;
  const right = (askFast ? sa > sb : sa < sb) ? a[1] : b[1];
  return make(
    {
      key: `wif-race-${a[1]}-${b[1]}-${sa}-${sb}-${askFast ? "f" : "s"}`,
      prompt: `Each picture is 1 second apart. Who is ${askFast ? "faster" : "slower"}?`,
      visual: {
        kind: "phys-motion",
        look: "ghosts",
        track: { min: 0, max: 30, step: 1, labelStep: 5, unit: "m" },
        rows: [
          { name: cap(a[1]), emoji: a[0], flip: a[2], positions: [0, sa, 2 * sa, 3 * sa] },
          { name: cap(b[1]), emoji: b[0], flip: b[2], positions: [0, sb, 2 * sb, 3 * sb] },
        ],
      },
      needsVisual: true,
      hint: "In the same time, the faster one goes farther. Compare the gaps.",
      explain: `The ${sa > sb ? a[1] : b[1]} goes ${Math.max(sa, sb)} m each second; the ${sa > sb ? b[1] : a[1]} goes ${Math.min(sa, sb)} m. So the ${right} is ${askFast ? "faster" : "slower"}.`,
    },
    fixed([cap(a[1]), cap(b[1])], cap(right)),
  );
}

/** 4-PS3-1 — speed = distance each second. */
export function speedCalc(): Question {
  const v = rand(2, 10);
  const t = rand(2, 6);
  const d = v * t;
  const form = rand(0, 2);
  const e = pick(["🚲", "🛹", "🐕", "🏃"]);
  const max = Math.ceil(d / 10) * 10;
  const visual: Visual = {
    kind: "phys-motion",
    look: "ghosts",
    track: { min: 0, max, step: max <= 40 ? 1 : 2, labelStep: 10, unit: "m" },
    rows: [{ emoji: e, flip: e === "🚲", positions: [0, d] }],
    span: { from: 0, to: d, label: form === 1 ? "?" : d },
  };
  if (form === 0)
    return make(
      {
        key: `spd-v-${v}-${t}-${e}`,
        prompt: `It goes ${d} m in ${t} s. How many meters each second?`,
        visual,
        hint: `Share ${d} meters equally over ${t} seconds: divide.`,
        explain: `${d} ÷ ${t} = ${v}. Its speed is ${v} m/s.`,
      },
      keypad(v, "m/s"),
    );
  if (form === 1)
    return make(
      {
        key: `spd-d-${v}-${t}-${e}`,
        prompt: `It moves ${v} m every second for ${t} s. How far does it go?`,
        visual,
        hint: `Add ${v} m for each of the ${t} seconds.`,
        explain: `${v} × ${t} = ${d} m.`,
      },
      keypad(d, "m"),
    );
  return make(
    {
      key: `spd-t-${v}-${t}-${e}`,
      prompt: `It moves ${v} m each second. How long to go ${d} m?`,
      visual,
      hint: `How many ${v}s make ${d}?`,
      explain: `${d} ÷ ${v} = ${t} s.`,
    },
    keypad(t, "s"),
  );
}

const MORE_ENERGY_CASES: Case[] = [
  { k: "bowling", prompt: "The same bowling ball, rolled slow or fast. Which knocks down more pins?", right: "Rolled fast", options: ["Rolled slow", "Rolled fast"], visual: scene(["🎳", 50, 50, 2]), hint: "Faster things carry more energy.", explain: "The faster ball has more energy of motion, so it knocks the pins harder." },
  { k: "glove", prompt: "A softball thrown hard or gently. Which stings the glove more?", right: "Thrown hard", options: ["Thrown gently", "Thrown hard"], visual: scene(["🥎", 35, 50, 1.4], ["🧤", 70, 50, 1.6]), hint: "More speed, more energy.", explain: "The hard throw is faster, so it carries more energy into the glove." },
  { k: "bike", prompt: "Which has more energy: a bike at 5 m/s or the same bike at 2 m/s?", right: "At 5 m/s", options: ["At 5 m/s", "At 2 m/s"], visual: scene(["🚲", 50, 55, 2]), hint: "Same bike, so compare speeds.", explain: "The same bike going faster has more energy of motion." },
  { k: "hammer", prompt: "Why does a fast hammer swing push a nail in deeper?", right: "A faster hammer has more energy", wrong: ["A faster hammer is heavier", "The nail gets softer"], visual: scene(["🔨", 40, 45, 1.6], ["📌", 65, 70, 1.2]), hint: "Speed and energy go together.", explain: "A faster hammer has more energy of motion to push the nail in." },
  { k: "slow-down", prompt: "A runner slows down. What happens to her energy of motion?", right: "It gets smaller", options: ["It gets bigger", "It gets smaller", "It stays the same"], hint: "Less speed, less energy.", explain: "Slower motion means less energy of motion." },
  { k: "still", prompt: "How much energy of motion does a parked car have?", right: "None", options: ["None", "A lot", "A little"], visual: scene(["🚗", 50, 60, 2]), hint: "Is it moving?", explain: "A parked car isn't moving, so it has no energy of motion." },
];

/** 4-PS3-1 — faster objects have more energy. */
export function fasterMoreEnergy(): Question {
  if (Math.random() < 0.45) return ask("fme", pick(MORE_ENERGY_CASES));
  const a = rand(1, 6);
  let b = rand(1, 6);
  while (b === a) b = rand(1, 6);
  const e = pick(["⚽", "🥌", "🎳"]);
  const askMore = Math.random() < 0.6;
  const right = (askMore ? a > b : a < b) ? "A" : "B";
  return make(
    {
      key: `fme-pic-${e}-${a}-${b}-${askMore ? "m" : "l"}`,
      prompt: `Two identical balls, shown every second. Which has ${askMore ? "more" : "less"} energy?`,
      visual: {
        kind: "phys-motion",
        track: { min: 0, max: 20, step: 1, labelStep: 5, unit: "m" },
        rows: [
          { name: "A", emoji: e, positions: [0, a, 2 * a, 3 * a], arrows: [a, a, a, a] },
          { name: "B", emoji: e, positions: [0, b, 2 * b, 3 * b], arrows: [b, b, b, b] },
        ],
      },
      needsVisual: true,
      hint: "Which one moves farther each second? The faster ball has more energy.",
      explain: `${a > b ? "A" : "B"} moves ${Math.max(a, b)} m each second, faster than ${a > b ? "B" : "A"}, so it has more energy of motion.`,
    },
    fixed(["A", "B"], right),
  );
}

/** 4-PS3-1 — read an energy bar chart: the tallest bar is the fastest of identical carts. */
export function energyBars(): Question {
  const vals = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3);
  const names = ["P", "Q", "R"];
  const form = pick(["fast", "slow", "grow"] as const);
  const visual: Visual = { kind: "phys-energy", names, bars: [{ title: "Energy of motion", values: vals }], max: 10, unit: "J" };
  if (form === "grow") {
    const who = pick(names);
    return make(
      {
        key: `eb-grow-${vals.join("-")}-${who}`,
        prompt: `Cart ${who} slows down. What happens to its bar?`,
        visual,
        hint: "Less speed means less energy of motion.",
        explain: `Slower means less energy of motion, so cart ${who}'s bar gets shorter.`,
      },
      fixed(["It gets taller", "It gets shorter", "It stays the same"], "It gets shorter"),
    );
  }
  const idx = vals.indexOf(form === "fast" ? Math.max(...vals) : Math.min(...vals));
  return make(
    {
      key: `eb-${form}-${vals.join("-")}`,
      prompt: `The carts are the same. Which is moving ${form === "fast" ? "fastest" : "slowest"}?`,
      visual,
      needsVisual: true,
      hint: "Same carts: more energy of motion means faster.",
      explain: `Cart ${names[idx]} has the ${form === "fast" ? "most" : "least"} energy (${vals[idx]} J), so it is the ${form === "fast" ? "fastest" : "slowest"}.`,
    },
    fixed(names, names[idx]),
  );
}

/** 4-PS3-1 — drop tests: higher drop, faster ball, more energy, deeper dent. */
export function dropTest(): Question {
  const dents = [rand(1, 2)];
  for (let i = 1; i < 4; i++) dents.push(dents[i - 1] + rand(1, 3));
  const hs = [20, 40, 60, 80];
  const visual: Visual = { kind: "table", header: ["Drop height", ...hs.map((h) => `${h} cm`)], rows: [["Dent in clay (mm)", ...dents]] };
  const form = rand(0, 3);
  if (form === 0) {
    const i = rand(0, 2);
    const j = rand(i + 1, 3);
    return make(
      {
        key: `dt-diff-${dents.join("-")}-${i}-${j}`,
        prompt: `How much deeper is the ${hs[j]} cm dent than the ${hs[i]} cm dent?`,
        visual,
        needsVisual: true,
        hint: "Find both dents in the table and subtract.",
        explain: `${dents[j]} − ${dents[i]} = ${dents[j] - dents[i]} mm deeper. A higher drop gives a faster ball with more energy.`,
      },
      keypad(dents[j] - dents[i], "mm"),
    );
  }
  if (form === 1)
    return make(
      {
        key: `dt-pred-${dents.join("-")}`,
        prompt: "Predict: dropped from 100 cm, the dent will be…",
        visual,
        needsVisual: true,
        hint: "Follow the pattern: higher drops made deeper dents.",
        explain: `Higher drops make deeper dents, so 100 cm should dent deeper than ${dents[3]} mm.`,
      },
      choose(`Deeper than ${dents[3]} mm`, [`Less than ${dents[0]} mm`, "No dent at all", `Exactly ${dents[1]} mm`], 3),
    );
  if (form === 2)
    return make(
      {
        key: `dt-fast-${dents.join("-")}`,
        prompt: "Which drop made the ball hit the clay fastest?",
        visual,
        needsVisual: true,
        hint: "The faster the ball, the more energy, the deeper the dent.",
        explain: `The 80 cm drop: it made the deepest dent (${dents[3]} mm), so the ball had the most energy and speed.`,
      },
      fixed(hs.map((h) => `${h} cm`), "80 cm"),
    );
  return make(
    {
      key: `dt-why-${dents.join("-")}`,
      prompt: "Why are the dents deeper for higher drops?",
      visual,
      needsVisual: true,
      hint: "A ball falling farther speeds up more.",
      explain: "From higher up, the ball is moving faster when it lands, so it has more energy to push the clay.",
    },
    choose("The ball lands faster, with more energy", ["The ball gets heavier", "The clay gets softer higher up", "Higher balls are bigger"], 3),
  );
}

/** 4-PS3-1 — Do it: graph a speed and energy test. */
export function graphDrop(): Question {
  const test = pick(["dent", "cup"] as const);
  const vals = [rand(1, 2)];
  for (let i = 1; i < 4; i++) vals.push(Math.min(10, vals[i - 1] + rand(1, 3)));
  const items = (test === "dent" ? ["20 cm", "40 cm", "60 cm", "80 cm"] : ["1 book", "2 books", "3 books", "4 books"]).map((label, i) => ({ label, value: vals[i] }));
  const title = test === "dent" ? "Dent depth (mm) by drop height" : "How far the cup slid (cm) by ramp height";
  return make(
    {
      key: `gd-${test}-${vals.join("-")}`,
      prompt: `Do it: graph the ${test === "dent" ? "drop test" : "ramp test"}.`,
      speech:
        test === "dent"
          ? "Flare dropped a ball from 4 heights onto clay and measured the dents. Drag each bar to make the graph."
          : "Flare rolled a ball down a ramp, raised by 1 to 4 books, into a paper cup. Drag each bar to show how far the cup slid.",
      hint: "Read each number, then drag that bar up to it.",
      explain: test === "dent" ? "Higher drops, faster ball, more energy: deeper dents." : "A higher ramp makes the ball faster, so it has more energy to push the cup farther.",
    },
    act({ kind: "barGraph", title, items, max: 10, step: 1 }, vals[3]),
  );
}

/** 4-PS3-3 — collisions move energy from one object to another. */
export function collisions(): Question {
  const s = pick([2, 4, 6]);
  const form = rand(0, 3);
  if (form === 0)
    return make(
      {
        key: `col-energy-${s}`,
        prompt: "Cart A hits cart B and stops. Where did A's energy go?",
        visual: {
          kind: "phys-collision",
          before: [
            { mass: 1, v: s, vSize: s, name: "A" },
            { mass: 1, v: 0, vSize: 0, name: "B" },
          ],
          after: [
            { mass: 1, v: 0, vSize: 0, name: "A" },
            { mass: 1, v: s, vSize: s, name: "B" },
          ],
        },
        needsVisual: true,
        hint: "Before: A moves. After: B moves.",
        explain: "A's energy of motion moved into cart B, so B rolls away and A stops.",
      },
      choose("Into cart B", ["It vanished", "Back into the battery", "Into the air only"], 3),
    );
  if (form === 1)
    return make(
      {
        key: `col-predict-${s}`,
        prompt: "Cart A rolls into cart B, which is still. What will B do?",
        visual: {
          kind: "phys-collision",
          before: [
            { mass: 1, v: s, vSize: s, name: "A" },
            { mass: 1, v: 0, vSize: 0, name: "B" },
          ],
        },
        hint: "A pushes on B when they hit.",
        explain: "When A hits B, energy moves into B and B starts to move.",
      },
      choose("Start moving", ["Stay still", "Roll toward A", "Get heavier"], 3),
    );
  if (form === 2)
    return make(
      {
        key: `col-slowA-${s}`,
        prompt: "When cart A hits cart B, what happens to cart A?",
        visual: {
          kind: "phys-collision",
          before: [
            { mass: 1, v: s, vSize: s, name: "A" },
            { mass: 1, v: 0, vSize: 0, name: "B" },
          ],
        },
        hint: "A gives some of its energy to B.",
        explain: "A gives energy to B, so A slows down.",
      },
      fixed(["It speeds up", "It slows down", "Nothing changes"], "It slows down"),
    );
  return make(
    {
      key: `col-stick-${s}`,
      prompt: "The carts stick together. Compared with A before, they move…",
      visual: {
        kind: "phys-collision",
        before: [
          { mass: 1, v: s, vSize: s },
          { mass: 1, v: 0, vSize: 0 },
        ],
        after: [{ mass: 2, v: s / 2, vSize: s / 2 }],
      },
      needsVisual: true,
      hint: "Read the speeds before and after.",
      explain: `Before: ${s} m/s. After: ${s / 2} m/s. They move slower: A's energy is now shared with B (and some became sound and heat).`,
    },
    fixed(["Faster", "Slower", "At the same speed"], "Slower"),
  );
}

const C_SOUND = "Sound";
const C_HEAT = "Heat";
const C_MOTION = "Motion of the other thing";
const C_SHAPE = "Bending or denting";
const CRASH_OPTIONS = [C_SOUND, C_HEAT, C_MOTION, C_SHAPE];
const CRASH_CASES: Case[] = [
  { k: "bang", prompt: "Two bumper cars bump. You hear a BANG. Some energy became…", right: C_SOUND, options: CRASH_OPTIONS, visual: scene(["🚙", 30, 60, 1.4], ["💥", 50, 55], ["🚗", 70, 60, 1.4]), hint: "What do your ears tell you?", explain: "The bang is sound: some of the energy of motion became sound energy." },
  { k: "nail", prompt: "A hammer hits a nail again and again. The nail gets warm. Energy became…", right: C_HEAT, options: CRASH_OPTIONS, visual: scene(["🔨", 40, 40, 1.6], ["📌", 60, 70]), hint: "What does 'warm' tell you?", explain: "Each hit turns some energy of motion into heat, so the nail warms up." },
  { k: "pins", prompt: "A bowling ball hits the pins. Most of its energy goes into…", right: C_MOTION, options: CRASH_OPTIONS, visual: scene(["🎳", 50, 55, 2]), hint: "What do the pins do?", explain: "The pins go flying: the ball's energy moved into the pins' motion (and some sound)." },
  { k: "car-dent", prompt: "A slow car bumps a pole and gets a dent. Some energy went into…", right: C_SHAPE, options: CRASH_OPTIONS, hint: "Look at the car afterward.", explain: "Some energy changed the car's shape, making the dent." },
  { k: "clay", prompt: "A clay ball hits a wall and squashes flat. Energy went into…", right: C_SHAPE, options: CRASH_OPTIONS, hint: "What happened to the clay?", explain: "The energy of motion squashed the clay into a new shape." },
  { k: "marbles", prompt: "A marble hits a still marble. The still one rolls away. Energy went into…", right: C_MOTION, options: CRASH_OPTIONS, hint: "Which marble moves afterward?", explain: "The first marble's energy moved into the second marble's motion." },
  { k: "clap", prompt: "You clap your hands hard. They sting and you hear a clap. Energy became…", right: C_SOUND, options: CRASH_OPTIONS, hint: "Clap! What do you hear?", explain: "Some energy of your moving hands became sound (and a little heat)." },
  { k: "brakes", prompt: "Bike brakes squeeze the wheel and it slows. The brake pads get warm. Energy became…", right: C_HEAT, options: CRASH_OPTIONS, hint: "Touch the brake pads (carefully!).", explain: "Rubbing turns energy of motion into heat, so the pads warm up." },
  { k: "pool", prompt: "A pool ball hits another ball. The first stops. Energy went into…", right: C_MOTION, options: CRASH_OPTIONS, hint: "Which ball is moving now?", explain: "The first ball's energy moved into the second ball, which rolls away." },
  { k: "drum", prompt: "A drumstick hits a drum. The stick stops. Much of its energy became…", right: C_SOUND, options: CRASH_OPTIONS, hint: "What do you hear?", explain: "The stick's energy makes the drum vibrate, which makes sound." },
  { k: "can", prompt: "A soccer ball hits an empty can and crumples it. Energy went into…", right: C_SHAPE, options: CRASH_OPTIONS, hint: "Look at the can.", explain: "The ball's energy bent the can into a new shape." },
  { k: "rub", prompt: "You rub your hands together fast. They feel warm. Energy became…", right: C_HEAT, options: CRASH_OPTIONS, hint: "How do your hands feel?", explain: "Rubbing turns the energy of motion into heat." },
];

/** 4-PS3-3 — in a collision, energy goes into motion, sound, heat and changing shape. */
export const collisionEnergy = bank("ce", CRASH_CASES);

/** 4-PS3-1 — Do it: order identical balls from least to most energy. */
export function orderEnergy(): Question {
  const ss = shuffle([1, 2, 3, 4, 5, 6]).slice(0, 3);
  const names = ["A", "B", "C"];
  const e = pick(["⚽", "🎳", "🥌"]);
  const order = names.map((n, i) => ({ n, s: ss[i] })).sort((x, y) => x.s - y.s);
  return make(
    {
      key: `oe-${e}-${ss.join("-")}`,
      prompt: "Do it: order the balls from least to most energy.",
      speech: "Three identical balls are shown every second. Tap them in order from least energy of motion to most.",
      visual: {
        kind: "phys-motion",
        track: { min: 0, max: 20, step: 1, labelStep: 5, unit: "m" },
        rows: names.map((n, i) => ({ name: n, emoji: e, positions: [0, ss[i], 2 * ss[i], 3 * ss[i]] })),
        times: true,
      },
      needsVisual: true,
      hint: "Same balls: the faster one (bigger gaps) has more energy.",
      explain: `${order.map((o) => `${o.n} (${o.s} m/s)`).join(", ")}: faster means more energy of motion.`,
    },
    act({ kind: "order", items: order.map((o) => o.n), direction: "Least energy → most energy" }, ss.length),
  );
}

/** 4-PS3-1 — Do it: throw fast enough (enough energy) to reach the target. */
export function launchTarget(): Question {
  const g = 9.8;
  const angle = pick([30, 40, 45, 50, 60]);
  const s = rand(7, 13);
  const d = (s * s * Math.sin((2 * angle * Math.PI) / 180)) / g; // range from the ground
  const target = Math.round(d * 2) / 2;
  return make(
    {
      key: `lt-${angle}-${s}`,
      prompt: `Do it: throw at ${angle}°. Pick the speed that lands on the 🎯.`,
      speech: `The throw goes up at ${angle} degrees. Slide the speed, then throw. Faster throws have more energy and go farther. Hit the target!`,
      hint: "Too short? Throw faster. Too far? Throw slower.",
      explain: `About ${s} m/s lands at ${target} m. A faster throw has more energy and flies farther.`,
    },
    act({ kind: "phys-launch", g, angle, speed: { min: 4, max: 14, step: 1 }, target, tolerance: 0.5, width: 22, launcher: "hand" }, s),
  );
}

/* ================================================== World 4: energy transfer and circuits */

const E_LIGHT = "Light";
const E_HEAT = "Heat";
const E_SOUND = "Sound";
const E_ELEC = "Electric current";
const E_OPTIONS = [E_LIGHT, E_HEAT, E_SOUND, E_ELEC];
const FORM_CASES: Case[] = [
  { k: "sun-face", prompt: "Sunshine travels to Earth and lights up your face. Energy moves as…", right: E_LIGHT, options: E_OPTIONS, visual: scene(["☀️", 20, 25, 1.6], ["🙂", 75, 65, 1.6]), hint: "The Sun is far away. What crosses space to reach you?", explain: "Energy travels from the Sun as light." },
  { k: "cocoa", prompt: "A mug of cocoa warms your cold hands. Energy moves as…", right: E_HEAT, options: E_OPTIONS, visual: scene(["☕", 45, 55, 1.6], ["🤲", 65, 65, 1.4]), hint: "It moves from the hot thing to the cooler thing.", explain: "Heat flows from the hot mug into your cooler hands." },
  { k: "drum-window", prompt: "A loud drum makes the window rattle. Energy moves as…", right: E_SOUND, options: E_OPTIONS, visual: scene(["🥁", 30, 60, 1.6], ["🪟", 75, 50, 1.6]), hint: "What travels from the drum through the air?", explain: "Sound carries energy from the drum, shaking the window." },
  { k: "toy-car", prompt: "Wires carry energy from a battery to a toy car's motor. Energy moves as…", right: E_ELEC, options: E_OPTIONS, visual: scene(["🔋", 30, 60, 1.4], ["🚗", 70, 60, 1.4]), hint: "What flows through wires?", explain: "Energy flows through the wires as electric current." },
  { k: "lamp", prompt: "A lamp lights up the room. Energy moves to the walls as…", right: E_LIGHT, options: E_OPTIONS, visual: scene(["💡", 50, 40, 1.8]), hint: "How do the walls look brighter?", explain: "The lamp sends energy out as light." },
  { k: "stove", prompt: "A stove burner warms a pot of soup. Energy moves as…", right: E_HEAT, options: E_OPTIONS, visual: scene(["🍲", 50, 50, 1.8], ["🔥", 50, 75, 1.2]), hint: "Hot burner, cooler pot.", explain: "Heat flows from the hot burner into the pot." },
  { k: "thunder", prompt: "Thunder shakes the house. Energy moves as…", right: E_SOUND, options: E_OPTIONS, visual: scene(["⛈️", 35, 30, 1.6], ["🏠", 70, 65, 1.6]), hint: "What do you hear?", explain: "Thunder is sound, and sound carries energy that can shake things." },
  { k: "tv-cord", prompt: "A cord carries energy from the wall to the TV. Energy moves as…", right: E_ELEC, options: E_OPTIONS, visual: scene(["🔌", 30, 60, 1.4], ["📺", 70, 55, 1.6]), hint: "What flows in a cord?", explain: "Energy reaches the TV as electric current through the cord." },
  { k: "campfire", prompt: "You sit by a campfire and your face gets warm. Energy reaches you as…", right: E_HEAT, options: E_OPTIONS, visual: scene(["🔥", 40, 60, 1.6], ["🙂", 75, 55, 1.4]), hint: "How does your face feel?", explain: "The fire sends energy to you as heat (and light)." },
  { k: "solar-calc", prompt: "A solar calculator works in a sunny room. Energy reaches it as…", right: E_LIGHT, options: E_OPTIONS, visual: scene(["🧮", 50, 60, 1.6], ["☀️", 20, 25]), hint: "It stops working in the dark.", explain: "Light carries energy to the calculator's solar cell." },
  { k: "speaker-cup", prompt: "A loud speaker makes rice bounce on a drum. Energy moves as…", right: E_SOUND, options: E_OPTIONS, visual: scene(["🔊", 30, 55, 1.6], ["🥁", 72, 65, 1.4]), hint: "What comes out of a speaker?", explain: "Sound carries energy from the speaker to the drum." },
  { k: "power-lines", prompt: "Power lines carry energy from a power plant to your town. Energy moves as…", right: E_ELEC, options: E_OPTIONS, visual: scene(["🏭", 25, 60, 1.6], ["🏘️", 75, 65, 1.6]), hint: "What flows in wires?", explain: "Power lines carry energy as electric current." },
];

/** 4-PS3-2 — energy moves from place to place by light, heat, sound and electric current. */
export const energyForms = bank("ef", FORM_CASES);

const BY_LIGHT = ["☀️ sunshine on a solar panel", "💡 lamp lighting a room", "🔦 flashlight on a wall", "📱 phone screen glowing"];
const BY_HEAT = ["☕ hot cocoa warming hands", "🔥 campfire warming you", "🍳 stove heating a pan", "🛁 warm bath warming you"];
const BY_SOUND = ["🥁 drum shaking a window", "📢 speaker making rice jump", "⛈️ thunder rattling dishes", "🔔 bell ringing far away"];
const BY_ELEC = ["🔌 cord powering a TV", "🔋 battery running a toy", "🏭 power lines to a town", "🔦 wires inside a flashlight"];

/** 4-PS3-2 — Do it: sort how the energy is moving. */
export function sortEnergy(): Question {
  const items = sortItems([BY_LIGHT, BY_HEAT, BY_SOUND, BY_ELEC], [rand(1, 2), rand(1, 2), rand(1, 2), rand(1, 2)]);
  return make(
    {
      key: `se-${itemsKey(items)}`,
      prompt: "Do it: how is the energy moving?",
      speech: "Sort each one. Is energy moving as light, heat, sound, or electric current?",
      hint: "Seen? Light. Felt warm? Heat. Heard? Sound. Through wires? Electric current.",
      explain: "Energy can move from place to place as light, heat, sound and electric current.",
    },
    act({ kind: "sort", bins: ["Light", "Heat", "Sound", "Electric"], items }, items.length),
  );
}

const HEAT_PAIRS: { a: [string, string, number]; b: [string, string, number] }[] = [
  { a: ["☕", "cocoa", 70], b: ["✋", "hand", 35] },
  { a: ["🧊", "ice", 0], b: ["🥤", "juice", 20] },
  { a: ["🍲", "soup", 80], b: ["🥄", "spoon", 20] },
  { a: ["🛁", "bath", 40], b: ["🦆", "toy duck", 20] },
  { a: ["🍪", "cookie", 60], b: ["🍽️", "plate", 20] },
  { a: ["❄️", "snowball", -5], b: ["🧤", "glove", 30] },
  { a: ["🍦", "ice cream", -5], b: ["🥣", "bowl", 20] },
  { a: ["📕", "book", 20], b: ["🪑", "desk", 20] },
];

/** 4-PS3-2 — heat moves from the warmer thing to the cooler thing. */
export function heatFlow(): Question {
  const p = pick(HEAT_PAIRS);
  const [x, y] = Math.random() < 0.5 ? [p.a, p.b] : [p.b, p.a];
  const form = pick(["way", "warms", "cools"] as const);
  const visual: Visual = {
    kind: "phys-thermo",
    scene: "thermometer",
    min: -10,
    max: 90,
    step: 5,
    labelStep: 20,
    thermometers: [
      { temp: x[2], label: x[1] },
      { temp: y[2], label: y[1] },
    ],
  };
  const same = x[2] === y[2];
  const hot = x[2] > y[2] ? x : y;
  const cold = hot === x ? y : x;
  if (form === "way" || same) {
    const options = [`From ${x[1]} to ${y[1]}`, `From ${y[1]} to ${x[1]}`, "No heat flows"];
    return make(
      {
        key: `hf-way-${x[1]}-${y[1]}`,
        prompt: `The ${x[1]} and the ${y[1]} touch. Which way does heat flow?`,
        visual,
        needsVisual: true,
        hint: "Heat always moves from warmer to cooler. Same temperature: no heat flows.",
        explain: same ? `Both are ${x[2]} °C, so no heat flows between them.` : `The ${hot[1]} (${hot[2]} °C) is warmer than the ${cold[1]} (${cold[2]} °C), so heat flows from the ${hot[1]} to the ${cold[1]}.`,
      },
      fixed(options, same ? options[2] : `From ${hot[1]} to ${cold[1]}`),
    );
  }
  return make(
    {
      key: `hf-${form}-${x[1]}-${y[1]}`,
      prompt: `The ${x[1]} and the ${y[1]} touch. Which one ${form === "warms" ? "warms up" : "cools down"}?`,
      visual,
      needsVisual: true,
      hint: "Heat leaves the warmer one and goes into the cooler one.",
      explain: `Heat flows from the ${hot[1]} into the ${cold[1]}: the ${cold[1]} warms up and the ${hot[1]} cools down.`,
    },
    fixed([cap(x[1]), cap(y[1])], cap(form === "warms" ? cold[1] : hot[1])),
  );
}

const cell = (cells = 1): CircuitPart => ({ part: "cell", cells, label: 1.5 * cells });

/** 4-PS3-2 — a bulb lights only in a complete loop. */
export function willItLight(): Question {
  const kind = pick(["works", "open", "gap", "opens"] as const);
  const n = rand(1, 2);
  const two = Math.random() < 0.4;
  const bulbs: CircuitPart[] = two ? [{ part: "bulb", name: "A" }, { part: "bulb", name: "B" }] : [{ part: "bulb", name: "A" }];
  const breaker: CircuitPart = kind === "gap" ? { part: "gap" } : { part: "switch", closed: kind !== "open" };
  const bottom = Math.random() < 0.5 ? [...bulbs, breaker] : [breaker, ...bulbs];
  const visual: Visual = { kind: "phys-circuit", top: [cell(n)], bottom };
  const them = two ? "the bulbs" : "the bulb";
  const FIX = ["Close the switch", "Join the gap with a wire", "Add another bulb", "Take out the battery", "Nothing: it already works"];
  if (kind === "works")
    return make(
      {
        key: `wil-works-${n}-${two}-${bottom.map((p) => p.part).join("")}`,
        prompt: `Why ${two ? "do the bulbs" : "does the bulb"} light up?`,
        visual,
        needsVisual: true,
        hint: "Follow the wire from the battery all the way around.",
        explain: "The loop is complete: current flows from the battery, through the bulbs and back. That carries energy to the bulbs.",
      },
      choose("The loop is complete", ["The switch is open", "There is a gap", "The wires are hot"], 3),
    );
  if (kind === "opens")
    return make(
      {
        key: `wil-opens-${n}-${two}-${bottom.map((p) => p.part).join("")}`,
        prompt: `Flare opens the switch. What happens to ${them}?`,
        visual,
        hint: "An open switch makes a break in the loop.",
        explain: `Opening the switch breaks the loop, so current stops and ${them} go${two ? "" : "es"} out.`,
      },
      fixed(["Goes out", "Gets brighter", "Stays the same"], "Goes out"),
    );
  return make(
    {
      key: `wil-${kind}-${n}-${two}-${bottom.map((p) => p.part).join("")}`,
      prompt: `${cap(them)} ${two ? "are" : "is"} dark. How can Flare light ${two ? "them" : "it"}?`,
      visual,
      needsVisual: true,
      hint: "Look for a break in the loop.",
      explain: kind === "open" ? "The switch is open, which breaks the loop. Close it and current flows." : "There's a gap in the wire. Join it, and the loop is complete.",
    },
    choose(kind === "open" ? FIX[0] : FIX[1], FIX.filter((f) => f !== FIX[kind === "open" ? 0 : 1]), 3),
  );
}

/** 4-PS3-2 — Do it: complete the circuit so every bulb lights. */
export function completeCircuit(): Question {
  const two = Math.random() < 0.5;
  const parts: CircuitPart[] = [{ part: "bulb", name: "A" }, ...(two ? [{ part: "bulb", name: "B" } as CircuitPart] : []), { part: "gap" }];
  if (Math.random() < 0.5) parts.push({ part: "switch", closed: false });
  else if (parts.length < 4) parts.push({ part: "gap" });
  const bottom = shuffle(parts);
  const topGap = Math.random() < 0.4;
  const top: CircuitPart[] = topGap ? [cell(rand(1, 2)), { part: "gap" }] : [cell(rand(1, 2))];
  const lit = two ? ["A", "B"] : ["A"];
  return make(
    {
      key: `cc-${top.map((p) => p.part).join("")}-${bottom.map((p) => p.part + ("name" in p ? p.name : "")).join("")}-${(top[0] as { cells?: number }).cells}`,
      prompt: `Do it: tap the gaps and switches to light ${two ? "both bulbs" : "the bulb"}.`,
      speech: `Tap each gap to fill it with wire, and tap a switch to close it. Make a complete loop so ${two ? "both bulbs light" : "the bulb lights"}.`,
      hint: "Current needs a complete loop with no breaks: fill every gap and close every switch.",
      explain: "With no breaks, the loop is complete. Current carries energy from the battery to the bulbs.",
    },
    act({ kind: "phys-buildCircuit", top, bottom, lit }, lit.length),
  );
}

/** 4-PS3-2 — Do it: in a parallel circuit, light only the bulbs asked for. */
export function lightOne(): Question {
  const nb = Math.random() < 0.5 ? 2 : 3;
  const names = ["A", "B", "C"].slice(0, nb);
  const branches: CircuitPart[][] = names.map((name) => shuffle([{ part: "bulb", name } as CircuitPart, Math.random() < 0.6 ? ({ part: "switch", closed: false } as CircuitPart) : ({ part: "gap" } as CircuitPart)]));
  const top: CircuitPart[] = Math.random() < 0.5 ? [cell(2), { part: "switch", closed: false }] : [cell(2)];
  const lit = shuffle(names).slice(0, nb === 3 && Math.random() < 0.4 ? 2 : 1).sort();
  return make(
    {
      key: `lo-${top.length}-${branches.map((b) => b.map((p) => p.part[0]).join("")).join("|")}-${lit.join("")}`,
      prompt: `Do it: light only bulb${lit.length > 1 ? "s" : ""} ${lit.join(" and ")}.`,
      speech: `Tap gaps and switches so that only bulb${lit.length > 1 ? "s" : ""} ${lit.join(" and ")} light${lit.length > 1 ? "" : "s"}. The other${nb - lit.length > 1 ? "s" : ""} must stay dark.`,
      hint: "Each bulb has its own path. Close only the paths you want, plus the main wire by the battery.",
      explain: `Close the path through ${lit.join(" and ")} (and any switch by the battery). The other path${nb - lit.length > 1 ? "s stay" : " stays"} broken, so ${nb - lit.length > 1 ? "those bulbs stay" : "that bulb stays"} dark.`,
    },
    act({ kind: "phys-buildCircuit", top, branches, lit }, lit.length),
  );
}

const CONDUCT = ["steel paper clip", "aluminum foil", "copper coin", "iron nail", "metal key", "steel spoon"];
const INSULATE = ["rubber band", "plastic straw", "wooden stick", "paper strip", "glass rod", "cotton string", "eraser"];

/** 4-PS3-2 — metals let current through; plastic, wood and rubber don't. */
export function conductors(): Question {
  const gapCircuit: Visual = { kind: "phys-circuit", top: [cell(2)], bottom: [{ part: "bulb", name: "A" }, { part: "gap", name: "?" }] };
  const form = rand(0, 2);
  if (form === 0) {
    const right = pick(CONDUCT);
    const wrong = shuffle(INSULATE).slice(0, 2);
    return make(
      {
        key: `con-pick-${right}-${[...wrong].sort().join("|")}`,
        prompt: "Which one, put across the gap, lights the bulb?",
        visual: gapCircuit,
        hint: "Electric current flows through metals.",
        explain: `The ${right} is metal, so current flows through it and the loop is complete.`,
      },
      choose(cap(right), wrong.map(cap), 3),
    );
  }
  if (form === 1) {
    const yes = Math.random() < 0.5;
    const thing = pick(yes ? CONDUCT : INSULATE);
    return make(
      {
        key: `con-yn-${thing}`,
        prompt: `Will a ${thing} across the gap light the bulb?`,
        visual: gapCircuit,
        hint: "Is it made of metal?",
        explain: yes ? `Yes. A ${thing} is metal, which lets current through.` : `No. A ${thing} doesn't let current through, so the loop stays broken.`,
      },
      fixed(["Yes", "No"], yes ? "Yes" : "No"),
    );
  }
  return ask(
    "con",
    pick([
      { k: "coat", prompt: "Why do wires have a plastic coat?", right: "Plastic stops current getting out", wrong: ["Plastic makes the current faster", "To make wires heavier", "Plastic makes light"], hint: "Is plastic a good path for current?", explain: "Plastic doesn't let current through, so it keeps the current inside the wire and keeps us safe." },
      { k: "inside", prompt: "What is inside the plastic coat of a wire?", right: "Metal, like copper", wrong: ["Water", "Wood", "Air"], hint: "Current flows well through it.", explain: "Wires have metal (usually copper) inside, because current flows through metal." },
      { k: "switch", prompt: "A switch turns a lamp off by…", right: "Making a gap in the loop", wrong: ["Using up the battery", "Cooling the bulb"], hint: "What stops current flowing?", explain: "Opening the switch makes a gap, so the loop is broken and current stops." },
    ]),
  );
}

type Form = "light" | "heat" | "sound" | "motion" | "electric" | "stored";
const DEVICES: { name: string; emoji: string; from: Form; to: Form; fromEmoji: string; toEmoji: string }[] = [
  { name: "lamp", emoji: "💡", from: "electric", to: "light", fromEmoji: "🔌", toEmoji: "✨" },
  { name: "fan", emoji: "🌀", from: "electric", to: "motion", fromEmoji: "🔌", toEmoji: "💨" },
  { name: "speaker", emoji: "🔊", from: "electric", to: "sound", fromEmoji: "🔌", toEmoji: "🎵" },
  { name: "toaster", emoji: "🍞", from: "electric", to: "heat", fromEmoji: "🔌", toEmoji: "🔥" },
  { name: "solar panel", emoji: "🔲", from: "light", to: "electric", fromEmoji: "☀️", toEmoji: "⚡" },
  { name: "wind turbine", emoji: "🌬️", from: "motion", to: "electric", fromEmoji: "💨", toEmoji: "⚡" },
  { name: "battery", emoji: "🔋", from: "stored", to: "electric", fromEmoji: "🧪", toEmoji: "⚡" },
  { name: "drum", emoji: "🥁", from: "motion", to: "sound", fromEmoji: "✋", toEmoji: "🎵" },
  { name: "electric car motor", emoji: "🚗", from: "electric", to: "motion", fromEmoji: "🔋", toEmoji: "💨" },
  { name: "heater", emoji: "♨️", from: "electric", to: "heat", fromEmoji: "🔌", toEmoji: "🔥" },
];
const FORM_WORD: Record<Form, string> = { light: "light", heat: "heat", sound: "sound", motion: "motion", electric: "electric energy", stored: "stored (chemical) energy" };

/** 4-PS3-4 — devices change energy from one form to another. */
export function energyConverters(): Question {
  const d = pick(DEVICES);
  if (Math.random() < 0.6) {
    const others = (["light", "heat", "sound", "motion", "electric"] as Form[]).filter((f) => f !== d.to && f !== d.from);
    return make(
      {
        key: `ec-out-${d.name}`,
        prompt: `A ${d.name} changes ${FORM_WORD[d.from]} mostly into…`,
        visual: {
          kind: "phys-energy",
          chain: [
            { emoji: d.fromEmoji, label: FORM_WORD[d.from].split(" ")[0] },
            { emoji: d.emoji, label: d.name },
            { emoji: "❓", label: "?" },
          ],
        },
        hint: `What does a ${d.name} give you?`,
        explain: `A ${d.name} turns ${FORM_WORD[d.from]} into ${FORM_WORD[d.to]}${d.to === "light" ? " (and a little heat)" : d.to === "motion" ? " (and a little sound and heat)" : ""}.`,
      },
      choose(cap(FORM_WORD[d.to]), others.map((f) => cap(FORM_WORD[f])), 3),
    );
  }
  const wrong = shuffle(DEVICES.filter((x) => !(x.from === d.from && x.to === d.to))).slice(0, 2);
  return make(
    {
      key: `ec-which-${d.name}-${wrong.map((w) => w.name).sort().join("|")}`,
      prompt: `Which device changes ${FORM_WORD[d.from]} into ${FORM_WORD[d.to]}?`,
      hint: "Think about what goes in and what comes out.",
      explain: `A ${d.name} changes ${FORM_WORD[d.from]} into ${FORM_WORD[d.to]}.`,
    },
    choose(`${d.emoji} ${cap(d.name)}`, wrong.map((w) => `${w.emoji} ${cap(w.name)}`), 3),
  );
}

const OUT_LIGHT = ["💡 lamp", "🔦 flashlight", "🚦 traffic light", "🏮 night light"];
const OUT_MOTION = ["🌀 fan", "🚗 electric car", "🧃 blender", "🧸 wind-up toy"];
const OUT_SOUND = ["🔊 speaker", "🔔 doorbell", "📻 radio", "🎧 headphones"];
const OUT_HEAT = ["🍞 toaster", "♨️ heater", "🍳 electric stove", "👕 iron"];

/** 4-PS3-4 — Do it: sort devices by the energy they mainly give out. */
export function sortDevices(): Question {
  const items = sortItems([OUT_LIGHT, OUT_MOTION, OUT_SOUND, OUT_HEAT], [rand(1, 2), rand(1, 2), rand(1, 2), rand(1, 2)]);
  return make(
    {
      key: `sd-${itemsKey(items)}`,
      prompt: "Do it: what does each device mostly give out?",
      speech: "Sort each device. Does it mostly give out light, motion, sound, or heat?",
      hint: "What is the device for? A toaster is for heating; a fan is for moving air.",
      explain: "Devices change energy: lamps make light, fans and motors make motion, speakers make sound, toasters and heaters make heat.",
    },
    act({ kind: "sort", bins: ["Light", "Motion", "Sound", "Heat"], items }, items.length),
  );
}

const CHAINS: { k: string; steps: string[]; what: string }[] = [
  { k: "solar", steps: ["☀️ sunlight", "🔲 solar panel", "🔋 battery", "💡 lamp at night"], what: "a solar garden light" },
  { k: "wind", steps: ["💨 wind", "🌬️ turbine spins", "⚡ electric current", "🏠 house lights"], what: "a wind turbine" },
  { k: "crank", steps: ["✋ you turn a crank", "⚙️ generator spins", "⚡ electric current", "🔦 light"], what: "a hand-crank flashlight" },
  { k: "dam", steps: ["💧 falling water", "⚙️ turbine spins", "⚡ electric current", "📺 TV"], what: "a water dam" },
];
const DESIGN_CASES: Case[] = [
  { k: "wind", prompt: "Flare wants to turn wind into electricity. Which device?", right: "A wind turbine", wrong: ["A toaster", "A speaker", "A lamp"], hint: "It needs blades that the wind can spin.", explain: "Wind spins a turbine's blades, which turn a generator to make electric current." },
  { k: "no-battery", prompt: "Make light with no batteries or plugs. Best design?", right: "A hand-crank flashlight", wrong: ["A plain flashlight", "A desk lamp"], hint: "Your arm can supply the energy.", explain: "Turning a crank spins a little generator, making current that lights the bulb." },
  { k: "fountain", prompt: "Run a garden fountain pump with sunlight. Which part?", right: "A solar panel", wrong: ["A heater", "A drum", "A magnet"], hint: "Which device takes in light?", explain: "A solar panel changes light into electric energy to run the pump." },
  { k: "alarm", prompt: "Design a door alarm. Which part turns electricity into sound?", right: "A buzzer", wrong: ["A bulb", "A fan", "A heater"], hint: "You need to hear it.", explain: "A buzzer changes electric energy into sound." },
  { k: "warm-hands", prompt: "Design mittens that warm your hands with a battery. Which part?", right: "A heating wire", wrong: ["A speaker", "A fan", "A light bulb"], hint: "It must make heat.", explain: "A heating wire changes electric energy into heat." },
  { k: "toy-car", prompt: "A toy car should move using a battery. Which part makes the motion?", right: "A motor", wrong: ["A bulb", "A buzzer", "A switch"], hint: "Which part spins?", explain: "A motor changes electric energy into motion that turns the wheels." },
  { k: "best-switch", prompt: "Flare's night light should turn off by day. What changes when it's sunny?", right: "A light sensor opens the circuit", wrong: ["The bulb melts", "The battery fills up"], hint: "It needs to sense light and break the loop.", explain: "A light sensor acts like a switch: in daylight it breaks the loop, so the light goes off." },
  { k: "lose-energy", prompt: "A bulb gets hot when it's on. Is all the energy turned into light?", right: "No, some becomes heat", options: ["Yes, all of it", "No, some becomes heat"], hint: "Touch a lamp that's been on a while (carefully).", explain: "Devices never turn all the energy into what we want. Some always becomes heat." },
  { k: "lunchbox", prompt: "Design a lunchbox that keeps food warm. What should it stop?", right: "Heat escaping", wrong: ["Light getting in", "Sound getting out"], hint: "Warm food cools as heat leaves.", explain: "Thick walls that slow heat escaping keep the food warm longer." },
  { k: "doorbell", prompt: "Pressing a doorbell closes a circuit. What's the energy chain?", right: "Electric → sound", wrong: ["Sound → electric", "Light → heat"], hint: "What goes in, what comes out?", explain: "The button completes the circuit, and the bell changes electric energy into sound." },
];

/** 4-PS3-4 — design a device that changes energy; put an energy chain in order. */
export function designDevice(): Question {
  if (Math.random() < 0.35) {
    const c = pick(CHAINS);
    return make(
      {
        key: `dd-chain-${c.k}`,
        prompt: `Do it: put the energy steps for ${c.what} in order.`,
        speech: `How does energy flow in ${c.what}? Tap the steps from first to last.`,
        hint: "Where does the energy start? Where does it end up doing a job?",
        explain: `${c.steps.map(words).join(" → ")}.`,
      },
      act({ kind: "order", items: c.steps, direction: "First → last" }, c.steps.length),
    );
  }
  return ask("dd", pick(DESIGN_CASES));
}

/* ====================================================== World 5: waves, light and codes */

const CREST = "Crest";
const TROUGH = "Trough";
const AMP = "Amplitude";
const WAVELEN = "Wavelength";
const PARTS = [CREST, TROUGH, AMP, WAVELEN];

/** 4-PS4-1 — the parts of a wave. */
export function waveParts(): Question {
  const A = pick([1, 1.5, 2]);
  const L = pick([2, 4]);
  const form = rand(0, 5);
  const base = { kind: "phys-wave" as const, length: 8, waves: [{ amplitude: A, wavelength: L }], grid: false };
  const text: [string, string, string][] = [
    ["What is the top of a wave called?", CREST, "The highest point of a wave is its crest."],
    ["What is the bottom of a wave called?", TROUGH, "The lowest point of a wave is its trough."],
    ["The height from the middle line up to a crest is the…", AMP, "Amplitude: how far the wave rises from the middle line."],
    ["The distance from one crest to the next crest is the…", WAVELEN, "Wavelength: the length of one whole wave, crest to crest."],
  ];
  if (form <= 3) {
    const [prompt, right, explain] = text[form];
    return make(
      { key: `wp-t${form}-${A}-${L}`, prompt, visual: base, hint: "Crest and trough are points; amplitude is a height; wavelength is a length.", explain },
      fixed(PARTS, right),
    );
  }
  const amp = form === 4;
  return make(
    {
      key: `wp-mark-${amp ? "a" : "l"}-${A}-${L}`,
      prompt: "What does the marked ? show?",
      visual: { ...base, ...(amp ? { amplitudeLabel: "?" } : { wavelengthLabel: "?" }) },
      needsVisual: true,
      hint: "Is the marker a height (from the middle) or a length (along the wave)?",
      explain: amp ? "It runs from the middle line up to a crest: that's the amplitude." : "It runs from one crest to the next: that's the wavelength.",
    },
    fixed(PARTS, amp ? AMP : WAVELEN),
  );
}

/** 4-PS4-1 — read the amplitude from a grid. */
export function readAmplitude(): Question {
  const A = rand(1, 4);
  const L = pick([4, 6, 8]);
  const len = pick([8, 12]);
  const full = Math.random() < 0.35;
  return make(
    {
      key: `ra-${A}-${L}-${len}-${full ? "f" : "a"}`,
      prompt: full ? "How tall is the wave from trough to crest?" : "What is the amplitude of this wave?",
      speech: full ? "Each square is 1 centimeter. How tall is the wave, from the bottom of a trough to the top of a crest?" : "Each square is 1 centimeter. What is the amplitude: the height from the middle line to a crest?",
      visual: { kind: "phys-wave", length: len, waves: [{ amplitude: A, wavelength: L }], grid: true, unit: "cm", ...(full ? {} : { amplitudeLabel: "?" }) },
      needsVisual: true,
      hint: full ? "Count squares from the lowest point to the highest point." : "Count squares from the middle line up to the top of a crest.",
      explain: full ? `The amplitude is ${A} cm up and ${A} cm down, so trough to crest is ${2 * A} cm.` : `From the middle line to the crest is ${A} squares: amplitude ${A} cm.`,
    },
    keypad(full ? 2 * A : A, "cm"),
  );
}

/** 4-PS4-1 — read the wavelength from a grid. */
export function readWavelength(): Question {
  const count = Math.random() < 0.3;
  if (count) {
    const L = pick([2, 3, 4, 6]);
    const len = L * rand(2, Math.floor(12 / L));
    return make(
      {
        key: `rw-count-${L}-${len}`,
        prompt: "How many whole waves fit on this grid?",
        visual: { kind: "phys-wave", length: len, waves: [{ amplitude: 1, wavelength: L }], grid: true },
        needsVisual: true,
        hint: "Count the crests, or divide the length by one wavelength.",
        explain: `Each wave is ${L} squares long, and ${len} ÷ ${L} = ${len / L} waves.`,
      },
      keypad(len / L),
    );
  }
  const L = rand(2, 8);
  const len = [8, 10, 12, 16].find((x) => x >= 1.25 * L)!;
  return make(
    {
      key: `rw-${L}-${len}`,
      prompt: "What is the wavelength?",
      speech: "Each square is 1 meter. What is the wavelength, from one crest to the next?",
      visual: { kind: "phys-wave", length: len, waves: [{ amplitude: 1, wavelength: L }], grid: true, wavelengthLabel: "?", unit: "m" },
      needsVisual: true,
      hint: "Count the squares from one crest to the next crest.",
      explain: `From crest to crest is ${L} squares: the wavelength is ${L} m.`,
    },
    keypad(L, "m"),
  );
}

/** 4-PS4-1 — compare two waves: amplitude, wavelength, energy. */
export function compareWaves(): Question {
  const form = pick(["amp", "len", "energy"] as const);
  let a1 = pick([0.5, 1, 1.5, 2]);
  let a2 = pick([0.5, 1, 1.5, 2]);
  let l1 = pick([2, 4]);
  let l2 = pick([2, 4]);
  if (form !== "len") while (a2 === a1) a2 = pick([0.5, 1, 1.5, 2]);
  if (form === "len") while (l2 === l1) l2 = pick([2, 4, 8]);
  if (form === "energy") l2 = l1;
  if (form === "len") a2 = a1;
  const ask2 = Math.random() < 0.7;
  const biggerA = a1 > a2 ? "A" : "B";
  const longer = l1 > l2 ? "A" : "B";
  const other = (x: string) => (x === "A" ? "B" : "A");
  const right = form === "len" ? (ask2 ? longer : other(longer)) : ask2 ? biggerA : other(biggerA);
  const prompt =
    form === "amp"
      ? `Which wave has the ${ask2 ? "bigger" : "smaller"} amplitude?`
      : form === "len"
        ? `Which wave has the ${ask2 ? "longer" : "shorter"} wavelength?`
        : `Which water wave carries ${ask2 ? "more" : "less"} energy?`;
  return make(
    {
      key: `cw-${form}-${a1}-${a2}-${l1}-${l2}-${ask2}`,
      prompt,
      visual: {
        kind: "phys-wave",
        length: 8,
        grid: true,
        waves: [
          { amplitude: a1, wavelength: l1, label: "A" },
          { amplitude: a2, wavelength: l2, label: "B" },
        ],
      },
      needsVisual: true,
      hint: form === "len" ? "Compare the distance from crest to crest." : "Compare how high the crests rise above the middle line.",
      explain:
        form === "len"
          ? `Wave ${longer} has crests ${Math.max(l1, l2)} squares apart; the other, ${Math.min(l1, l2)}.`
          : form === "amp"
            ? `Wave ${biggerA} rises ${Math.max(a1, a2)} squares; the other only ${Math.min(a1, a2)}.`
            : `Wave ${biggerA} has the bigger amplitude, and taller waves carry more energy.`,
    },
    fixed(["A", "B"], right),
  );
}

/** 4-PS4-1 — Do it: match the wave's amplitude and wavelength. */
export function matchWave(): Question {
  const A = pick([0.5, 1, 1.5, 2, 2.5, 3]);
  const L = rand(2, 8);
  return make(
    {
      key: `mw-${A}-${L}`,
      prompt: `Do it: match the faint wave. Amplitude ${A} m, wavelength ${L} m.`,
      speech: `Slide to match the faint wave: amplitude ${A} meters, wavelength ${L} meters.`,
      hint: "Amplitude makes it taller or flatter. Wavelength stretches or squeezes it.",
      explain: `Amplitude ${A} m (middle to crest) and wavelength ${L} m (crest to crest).`,
    },
    act({ kind: "phys-matchWave", length: 8, target: { amplitude: A, wavelength: L }, amplitude: { min: 0.5, max: 3, step: 0.5 }, wavelength: { min: 1, max: 8, step: 1 } }, L),
  );
}

const WAVE_MOVE_CASES: Case[] = [
  { k: "duck", prompt: "A wave passes a floating rubber duck. What does the duck do?", right: "Bobs up and down", wrong: ["Rides all the way to shore", "Sinks", "Stays perfectly still"], visual: { kind: "phys-wave", length: 8, waves: [{ amplitude: 1, wavelength: 4 }], travel: "wave" }, hint: "Watch a leaf on a pond when ripples pass.", explain: "Waves carry energy, not the water. The duck mostly bobs up and down in place." },
  { k: "castle", prompt: "Which waves knock down a sandcastle faster?", right: "Taller waves", options: ["Taller waves", "Smaller waves"], hint: "Taller means bigger amplitude.", explain: "Waves with a bigger amplitude carry more energy, so they knock things down faster." },
  { k: "carry", prompt: "Ocean waves carry ___ from place to place.", right: "Energy", wrong: ["All the water", "Sand only", "Fish"], hint: "The water mostly goes up and down.", explain: "A wave carries energy across the water, while the water itself mostly moves up and down." },
  { k: "rope", prompt: "A ribbon is tied on a rope. Flare shakes one end. The ribbon…", right: "Moves up and down", wrong: ["Slides along the rope", "Falls off"], visual: { kind: "phys-wave", length: 8, waves: [{ amplitude: 1, wavelength: 4 }], travel: "wave" }, hint: "The wave moves along, but each bit of rope moves up and down.", explain: "Each bit of rope just moves up and down as the wave passes, so the ribbon does too." },
  { k: "boat", prompt: "Big waves make a moored boat…", right: "Rock up and down a lot", wrong: ["Stay still", "Sink right away"], visual: scene(["⛵", 50, 50, 2], ["🌊", 50, 80, 2]), hint: "Bigger waves, more energy.", explain: "Big waves carry lots of energy, which rocks the boat up and down." },
  { k: "shake-harder", prompt: "Flare shakes the rope harder (higher). The wave's amplitude…", right: "Gets bigger", options: ["Gets bigger", "Gets smaller", "Stays the same"], hint: "Bigger shakes, taller waves.", explain: "Shaking higher makes taller waves: a bigger amplitude, with more energy." },
  { k: "shake-faster", prompt: "Flare shakes the rope faster. The waves get…", right: "Closer together", options: ["Closer together", "Farther apart"], hint: "More waves are squeezed into the same space.", explain: "Faster shaking makes more waves in the same space, so the wavelength gets shorter." },
  { k: "quake", prompt: "An earthquake sends waves through the ground. What can they do?", right: "Shake and move buildings", wrong: ["Nothing at all", "Make it rain"], visual: scene(["🏠", 50, 50, 2]), hint: "Waves carry energy.", explain: "Earthquake waves carry lots of energy that can shake and move things." },
  { k: "pebble", prompt: "A pebble drops in a pond. A leaf nearby…", right: "Bobs as ripples pass", wrong: ["Rushes away from the pebble", "Sinks"], visual: scene(["🍃", 70, 55, 1.2], ["💧", 35, 55, 1.4]), hint: "Ripples are waves.", explain: "The ripples carry energy outward; the leaf bobs as they pass under it." },
  { k: "surfer", prompt: "Why do surfers want tall waves?", right: "They carry more energy", wrong: ["They are slower", "They are warmer"], visual: scene(["🏄", 50, 50, 2]), hint: "Taller waves, bigger amplitude.", explain: "Taller waves have a bigger amplitude and more energy to push the surfer." },
  { k: "speaker-paper", prompt: "Sound waves from a loud speaker hit a paper strip. The paper…", right: "Wiggles", wrong: ["Catches fire", "Goes through the speaker"], hint: "Sound waves carry energy too.", explain: "Sound waves carry energy that makes the paper vibrate." },
  { k: "wave-pool", prompt: "A wave pool machine pushes water harder. The waves get…", right: "Taller", options: ["Taller", "Flatter"], hint: "More push, more energy.", explain: "A harder push gives the waves more energy and a bigger amplitude." },
];

/** 4-PS4-1 — waves carry energy and can make objects move. */
export const wavesMoveThings = bank("wmt", WAVE_MOVE_CASES);

const SEE_OBJECTS: [string, string][] = [
  ["🍎", "apple"],
  ["📕", "book"],
  ["🌳", "tree"],
  ["🐈", "cat"],
  ["🧸", "teddy"],
  ["⚽", "ball"],
];

/** 4-PS4-2 — we see an object when light from a source reflects off it into our eyes. */
export function seeingPath(): Question {
  if (Math.random() < 0.6) {
    const [e, name] = pick(SEE_OBJECTS);
    const src = pick([
      ["☀️", "Sun"],
      ["💡", "lamp"],
    ]);
    const right = `${src[0]} → ${e} → 👁️`;
    return make(
      {
        key: `sp-path-${name}-${src[1]}`,
        prompt: `Which path lets you see the ${name}?`,
        speech: `Which path does the light take so that you see the ${name}?`,
        visual: { kind: "phys-rays", scene: "see", source: src[0], object: e },
        hint: "Light starts at the light source, bounces off the object, then enters your eye.",
        explain: `Light goes from the ${src[1]} to the ${name}, reflects off it, and travels into your eye.`,
      },
      choose(right, [`👁️ → ${e} → ${src[0]}`, `${e} → ${src[0]} → 👁️`, `👁️ → ${e}`], 3),
    );
  }
  return ask(
    "sp",
    pick([
      { k: "moon", prompt: "You see the Moon at night because…", right: "Sunlight reflects off it into your eyes", wrong: ["It makes its own light", "Your eyes shine on it"], visual: scene(["☀️", 15, 30, 1.4], ["🌕", 55, 30, 1.4], ["👁️", 85, 75, 1.4]), hint: "Does the Moon make light?", explain: "The Moon makes no light. Sunlight reflects off it and into our eyes." },
      { k: "dark", prompt: "Why can't you see a book in a pitch-dark room?", right: "No light reflects off it to your eyes", wrong: ["Books are invisible at night", "Your eyes turn off"], hint: "What must enter your eyes?", explain: "Seeing needs light to reflect off the book into your eyes. With no light, nothing reflects." },
      { k: "eyes-light", prompt: "Do your eyes send out light to see things?", right: "No, light comes into your eyes", options: ["Yes, eyes send light out", "No, light comes into your eyes"], hint: "Can you see in a dark room?", explain: "Eyes only take light in. If eyes made light, we could see in the dark!" },
      { k: "mirror-see", prompt: "You see yourself in a mirror. The light path is…", right: "You → mirror → your eyes", wrong: ["Eyes → mirror → you", "Mirror → you only"], hint: "Light reflects off you first.", explain: "Light reflects off you, hits the mirror, and the mirror reflects it into your eyes." },
    ]),
  );
}

/** 4-PS4-2 — light reflects off a mirror at the same angle it came in. */
export function mirrorAngle(): Question {
  const angle = 5 * rand(2, 14);
  const findIn = Math.random() < 0.35;
  return make(
    {
      key: `ma-${angle}-${findIn ? "in" : "out"}`,
      prompt: findIn ? `The light bounces off at ${angle}°. What angle did it come in at?` : `Light hits the mirror at ${angle}°. At what angle does it bounce off?`,
      speech: findIn
        ? `The reflected light leaves the mirror at ${angle} degrees from the dashed line. What angle did the light come in at?`
        : `Light hits the mirror at ${angle} degrees from the dashed line. At what angle does it reflect?`,
      visual: { kind: "phys-rays", scene: "mirror", angle, incident: findIn ? "?" : angle, reflected: findIn ? angle : "?", ends: true },
      hint: "Light bounces off a mirror at the same angle it comes in.",
      explain: `In at ${angle}°, out at ${angle}°: the angles are always equal.`,
    },
    keypad(angle, "°"),
  );
}

const GLOWS = ["☀️ the Sun", "💡 a lit bulb", "🔥 a campfire", "📺 a TV screen", "⭐ a star", "🕯️ a candle flame", "✨ a firefly"];
const REFLECTS = ["🌕 the Moon", "📕 a book", "🌳 a tree", "🍎 an apple", "🪞 a mirror", "🧒 your friend", "🚲 a bike"];

/** 4-PS4-2 — Do it: things that give off light vs. things we see by reflected light. */
export function sortSeeing(): Question {
  const items = sortItems([GLOWS, REFLECTS], [rand(2, 4), rand(2, 4)]);
  return make(
    {
      key: `ssee-${itemsKey(items)}`,
      prompt: "Do it: makes its own light, or reflects light?",
      speech: "Sort each one. Does it give off its own light, or do we see it because light reflects off it?",
      hint: "Would you see it in a totally dark room?",
      explain: "Light sources glow by themselves. Everything else, even the Moon, is seen by light reflected into our eyes.",
    },
    act({ kind: "sort", bins: ["✨ Gives off light", "👁️ Reflects light"], items }, items.length),
  );
}

const CODES = ["•", "—", "••", "•—", "—•", "——", "•••", "—••"];
const sayCode = (c: string) => [...c].map((ch) => (ch === "•" ? "dot" : "dash")).join(" ");

/** 4-PS4-3 — patterns (codes) carry information. */
export function codes(): Question {
  const form = rand(0, 2);
  if (form === 2)
    return ask(
      "cd",
      pick([
        { k: "pixels", prompt: "A picture is sent as a grid of 1s and 0s: 1 = dark, 0 = light. This is a…", right: "Code", wrong: ["Wave", "Magnet"], visual: { kind: "table", header: ["", "", ""], rows: [[1, 0, 1], [0, 1, 0], [1, 0, 1]] }, hint: "A pattern that stands for something.", explain: "It's a code: the pattern of 1s and 0s stands for dark and light squares." },
        { k: "pixel-count", prompt: "1 = dark square, 0 = light. How many dark squares in this picture?", right: "5", wrong: ["4", "6", "9"], visual: { kind: "table", header: ["", "", ""], rows: [[1, 0, 1], [0, 1, 0], [1, 0, 1]] }, needsVisual: true, hint: "Count the 1s.", explain: "There are five 1s, so five dark squares: an X shape." },
        { k: "why", prompt: "Why do both sender and receiver need the same code key?", right: "So the pattern means the same thing to both", wrong: ["So the signal is louder", "So it goes faster"], hint: "What if they used different keys?", explain: "A code only works if both sides agree what each pattern means." },
        { k: "phone", prompt: "Your voice is sent by phone as a code of…", right: "Electric or radio signals", wrong: ["Paper notes", "Smoke puffs"], hint: "Phones turn sound into a pattern of signals.", explain: "A phone turns your voice into a pattern of electric and radio signals, then back into sound." },
      ]),
    );
  const letters = shuffle(["A", "E", "H", "I", "M", "N", "O", "S", "T", "R"]).slice(0, 4);
  const cs = shuffle(CODES).slice(0, 4);
  const i = rand(0, 3);
  const visual: Visual = { kind: "table", header: ["Code", "Letter"], rows: letters.map((l, k) => [cs[k], l]) };
  if (form === 0)
    return make(
      {
        key: `cd-dec-${letters.join("")}-${cs.join("")}-${i}`,
        prompt: `Flare flashes ${cs[i]}. Which letter is it?`,
        speech: `Flare flashes ${sayCode(cs[i])}. Use the key. Which letter is it?`,
        visual,
        needsVisual: true,
        hint: "Find the matching pattern of dots (short) and dashes (long).",
        explain: `${cs[i]} stands for ${letters[i]}.`,
      },
      fixed(letters, letters[i]),
    );
  return make(
    {
      key: `cd-enc-${letters.join("")}-${cs.join("")}-${i}`,
      prompt: `How does Flare flash the letter ${letters[i]}?`,
      visual,
      needsVisual: true,
      hint: "Find the letter in the key, then read its code.",
      explain: `${letters[i]} is sent as ${cs[i]}.`,
    },
    fixed(cs, cs[i]),
  );
}

const WORDS = ["CAT", "DOG", "SUN", "HAT", "MAP", "FOX", "BUG", "PIG", "OWL", "BEAR", "FISH", "STAR", "LAMP", "WIND"];

/** 4-PS4-3 — Do it: decode a flashed message, letter by letter. */
export function decodeOrder(): Question {
  const word = pick(WORDS);
  const letters = [...word];
  const decoys = shuffle("ABCDEFGHIJKLMNOPRSTUVWY".split("").filter((l) => !letters.includes(l))).slice(0, 6 - letters.length);
  const key = shuffle([...letters, ...decoys]);
  const cs = shuffle(CODES).slice(0, key.length);
  const codeOf = (l: string) => cs[key.indexOf(l)];
  const message = letters.map(codeOf).join("  /  ");
  return make(
    {
      key: `do-${word}-${key.join("")}-${cs.join("")}`,
      prompt: `Do it: Flare flashed ${message}. Tap the letters in order.`,
      speech: `Flare flashed a word: ${letters.map((l) => sayCode(codeOf(l))).join(", then ")}. Use the key to decode it. Tap the letters in order.`,
      visual: { kind: "table", header: ["Code", "Letter"], rows: key.map((l, k) => [cs[k], l]) },
      needsVisual: true,
      hint: "Decode one pattern at a time, from the left.",
      explain: `${letters.map((l) => `${codeOf(l)} = ${l}`).join(", ")}. The word is ${word}.`,
    },
    act({ kind: "order", items: letters, direction: "First letter → last letter" }, letters.length),
  );
}

/* ================================================ World 6: gravity and energy from the Sun */

const GRAV_OBJ: [string, string][] = [
  ["🍎", "apple"],
  ["⚽", "ball"],
  ["🪨", "rock"],
  ["🏀", "basketball"],
  ["🪶", "feather"],
];
const G_DOWN = "⬇️ Down";

/** 5-PS2-1 — gravity pulls things down, whichever way they are moving. */
export function gravityDirection(): Question {
  const [e, name] = pick(GRAV_OBJ);
  const form = pick(["fall", "up", "side", "rest", "what", "up-why"] as const);
  if (form === "what")
    return make(
      {
        key: `gd-what-${name}`,
        prompt: `What pulls the ${name} down to the ground?`,
        visual: { kind: "phys-forces", object: e, forces: [], motion: { dir: 270, label: "falling" } },
        hint: "It's the pull of the whole Earth.",
        explain: `Gravity: Earth pulls the ${name} down toward its center.`,
      },
      choose("Gravity", ["Magnetism", "The wind", "Static electricity"], 3),
    );
  if (form === "up-why")
    return make(
      {
        key: `gd-upwhy-${name}`,
        prompt: `A ${name} is thrown straight up. Why does it slow down and come back?`,
        visual: { kind: "phys-forces", object: e, forces: [{ dir: 270, size: 3, label: "gravity" }], motion: { dir: 90, label: "moving up" } },
        hint: "Which way does the gravity arrow point?",
        explain: "Gravity keeps pulling down the whole time. It slows the ball on the way up and pulls it back down.",
      },
      choose("Gravity keeps pulling it down", ["It runs out of air", "The sky pushes it", "Gravity stops at the top"], 3),
    );
  const motion = { fall: { dir: 270, label: "falling" }, up: { dir: 90, label: "moving up" }, side: { dir: 0, label: "rolling" }, rest: undefined }[form];
  const say = { fall: "is falling", up: "was thrown up and is rising", side: "rolls off a table", rest: "sits on a table" }[form];
  return make(
    {
      key: `gd-dir-${form}-${name}`,
      prompt: `The ${name} ${say}. Which way does gravity pull it?`,
      visual: { kind: "phys-forces", object: e, forces: [], ...(motion ? { motion } : { surface: "floor" as const }) },
      hint: "Gravity pulls the same way no matter how the thing is moving.",
      explain: `Down, toward Earth's center, ${form === "up" ? "even while it's going up" : form === "rest" ? "even when it's resting (the table pushes back up)" : "always"}.`,
    },
    fixed([G_DOWN, "⬆️ Up", "➡️ Sideways"], G_DOWN),
  );
}

const CENTER = "Toward Earth's center";

/** 5-PS2-1 — "down" means toward the center of the Earth, everywhere on Earth. */
export function aroundEarth(): Question {
  const at = pick([0, 45, 90, 135, 180, 225, 270, 315]);
  if (Math.random() < 0.65) {
    const e = pick(["⚽", "🍎", "🪨"]);
    return make(
      {
        key: `ae-pic-${at}-${e}`,
        prompt: "Earth's gravity pulls on this ball. Which way?",
        visual: { kind: "phys-orbit", scene: "orbit", satellite: e, at, gravityLabel: "gravity" },
        hint: "Follow the arrow. Where does it point, wherever the ball is?",
        explain: "Gravity always pulls toward the center of the Earth, wherever you are.",
      },
      choose(CENTER, ["Toward the North Pole", "Away from Earth", "Toward the Sun"], 3),
    );
  }
  return ask(
    "ae",
    pick([
      { k: "australia", prompt: "A kid in Australia drops a ball. It falls…", right: "Down to the ground, toward Earth's center", wrong: ["Up into the sky", "Sideways"], visual: scene(["🌏", 50, 50, 2.4]), hint: "Down means toward the middle of the Earth.", explain: "Everywhere on Earth, down means toward Earth's center, so the ball falls to the ground." },
      { k: "fall-off", prompt: "Why don't people on the bottom of the globe fall off?", right: "Gravity pulls them toward Earth's center", wrong: ["They hold on tight", "They wear heavy boots"], visual: scene(["🌍", 50, 50, 2.4]), hint: "Which way is 'down' for them?", explain: "Gravity pulls everyone toward Earth's center, so 'down' is always toward the ground under your feet." },
      { k: "rain", prompt: "Rain falls on both sides of the Earth. It falls…", right: CENTER, wrong: ["Toward the North Pole", "Away from Earth"], visual: scene(["🌧️", 50, 30, 2]), hint: "Gravity pulls toward the middle.", explain: "On every side of Earth, rain falls toward Earth's center." },
      { k: "space", prompt: "An astronaut drops a wrench near the space station. Earth's gravity pulls it…", right: CENTER, wrong: ["Nowhere: there's no gravity in space", "Toward the Moon"], visual: scene(["🧑‍🚀", 50, 40, 2], ["🌍", 50, 85, 1.4]), hint: "Gravity reaches far into space.", explain: "Earth's gravity still pulls up there, toward Earth's center. That pull keeps the station in orbit." },
    ]),
  );
}

const FALL_CASES: Case[] = [
  { k: "two-balls", prompt: "A heavy ball and a light ball, same size, dropped together. Which lands first?", right: "They land at about the same time", wrong: ["The heavy one, far sooner", "The light one"], visual: scene(["⚫", 40, 30, 1.4], ["⚪", 60, 30, 1.4]), hint: "Galileo tested this! Air barely slows small, round balls.", explain: "Gravity speeds up all falling things the same way, so they land together (air hardly matters here)." },
  { k: "feather", prompt: "On Earth, a feather falls slower than a rock. Why?", right: "Air pushes up on the feather", wrong: ["Gravity doesn't pull feathers", "Feathers are magnetic"], visual: scene(["🪶", 40, 35, 1.4], ["🪨", 60, 35, 1.4]), hint: "What does a parachute do?", explain: "Air pushes back on the wide, light feather much more than on the rock." },
  { k: "moon", prompt: "On the Moon (no air), a hammer and a feather are dropped. They…", right: "Land at the same time", wrong: ["Hammer lands first", "Feather floats away"], visual: scene(["🌕", 50, 75, 2], ["🔨", 40, 30], ["🪶", 60, 30]), hint: "No air to slow the feather.", explain: "With no air, gravity speeds them up the same, so they land together. Astronauts really tried it!" },
  { k: "paper", prompt: "A flat sheet and a crumpled ball of the same paper are dropped. Which lands first?", right: "The crumpled ball", wrong: ["The flat sheet", "They tie exactly"], hint: "Which one does air push on more?", explain: "The flat sheet catches more air, so it falls slower. Gravity pulls both down." },
  { k: "parachute", prompt: "A parachute opens. Why does the skydiver slow down?", right: "The air pushes up on the parachute", wrong: ["Gravity turns off", "The parachute is magnetic"], visual: scene(["🪂", 50, 40, 2]), hint: "A big parachute catches lots of air.", explain: "The air pushes up hard on the wide parachute, against gravity, slowing the fall." },
  { k: "faster", prompt: "A dropped ball falls for 2 seconds. Is it faster at the end or the start?", right: "At the end", options: ["At the start", "At the end", "The same"], hint: "Gravity keeps pulling the whole way down.", explain: "Gravity keeps pulling, so a falling ball speeds up as it falls." },
  { k: "same-pull", prompt: "Does gravity pull on a ball resting on the floor?", right: "Yes, the floor pushes back up", options: ["Yes, the floor pushes back up", "No, gravity stops"], hint: "Is the ball still heavy?", explain: "Gravity always pulls. The floor pushes up just as hard, so the forces balance." },
  { k: "roll-off", prompt: "A ball rolls off a table. Its path…", right: "Curves down to the floor", wrong: ["Goes straight on forever", "Goes straight up"], hint: "Gravity starts pulling it down right away.", explain: "It keeps going forward, but gravity pulls it down, so it curves to the floor." },
  { k: "ramp-up", prompt: "Why do you slow down biking up a hill?", right: "Gravity pulls you back down the hill", wrong: ["The hill is magnetic", "The air gets thicker"], visual: scene(["🚲", 40, 60, 1.6], ["⛰️", 70, 55, 2]), hint: "Which way does gravity pull you?", explain: "Gravity pulls you down, so going uphill you're working against it and slow down." },
  { k: "water", prompt: "Why does a river flow downhill?", right: "Gravity pulls the water down", wrong: ["Fish push it", "The wind blows it"], visual: scene(["🏞️", 50, 50, 2.4]), hint: "Water always runs from high to low.", explain: "Gravity pulls the water down, so it flows from high ground to low ground." },
  { k: "jump", prompt: "Why do you come back down after you jump?", right: "Gravity pulls you down", wrong: ["Your legs get tired", "The air pushes you down"], visual: scene(["🤸", 50, 40, 2]), hint: "What pulls everything toward Earth?", explain: "Gravity pulls you back toward Earth's center, so you land." },
  { k: "spill", prompt: "Juice spills off the table. Which way does it go?", right: "Down to the floor", wrong: ["Up to the ceiling", "It floats in the air"], hint: "Gravity!", explain: "Gravity pulls the juice down toward Earth's center: onto the floor." },
];

/** 5-PS2-1 — falling: gravity and air. */
export const fallTogether = bank("ft", FALL_CASES);

const HOLD = [
  { e: "📕", what: "book on a table", up: "table push", surface: "floor" as const },
  { e: "💡", what: "lamp on a cord", up: "cord pull", surface: "ceiling" as const },
  { e: "🪂", what: "skydiver falling at a steady speed", up: "air push", surface: "none" as const },
  { e: "🚤", what: "boat floating still", up: "water push", surface: "none" as const },
];

/** 5-PS2-1 — Do it: draw gravity so the forces balance. */
export function drawGravity(): Question {
  const h = pick(HOLD);
  const s = rand(1, 6);
  return make(
    {
      key: `dg-${h.what}-${s}`,
      prompt: `Do it: the forces on the ${h.what} balance. Draw gravity.`,
      speech: `The ${h.what}: its forces are balanced. The ${h.up} is ${s} newtons up. Draw the gravity arrow.`,
      hint: "Gravity pulls toward Earth: down. Balanced means the same size as the up force.",
      explain: `Gravity pulls down ${s} N, matching the ${s} N ${h.up}. Balanced forces: no change in motion.`,
    },
    act(
      {
        kind: "phys-forceArrows",
        object: h.e,
        surface: h.surface,
        directions: 4,
        maxSize: 6,
        given: [{ dir: 90, size: s, label: `${h.up} ${s} N` }],
        arrows: [{ label: "gravity", answer: { dir: 270, size: s } }],
      },
      s,
    ),
  );
}

const WEIGHT_CASES: Case[] = [
  { k: "rocks", prompt: "A 2 kg rock and a 5 kg rock. Which does gravity pull harder?", right: "The 5 kg rock", options: ["The 2 kg rock", "The 5 kg rock", "Both the same"], visual: { kind: "pair", items: [{ emoji: "🪨", label: "2 kg", size: 0.8 }, { emoji: "🪨", label: "5 kg", size: 1.3 }] }, hint: "More mass, more pull.", explain: "Gravity pulls harder on things with more mass. That pull is their weight." },
  { k: "weight", prompt: "Your weight is…", right: "How hard gravity pulls on you", wrong: ["How tall you are", "How fast you run"], hint: "A scale measures it.", explain: "Weight is the force of gravity pulling you down." },
  { k: "moon-weight", prompt: "On the Moon, gravity pulls about 6 times weaker. You would weigh…", right: "Less", options: ["More", "Less", "The same"], visual: scene(["🌕", 50, 55, 2.2]), hint: "Weaker pull, less weight.", explain: "The Moon's gravity is weaker, so you'd weigh less (your mass stays the same)." },
  { k: "scale", prompt: "A bathroom scale shows how hard…", right: "Gravity pulls you down", wrong: ["You push sideways", "The wind blows"], visual: scene(["⚖️", 50, 55, 2]), hint: "You press down on it.", explain: "Gravity pulls you down onto the scale, and the scale measures that push." },
  { k: "empty-full", prompt: "An empty backpack and a full one: which does gravity pull harder?", right: "The full one", options: ["The empty one", "The full one"], visual: scene(["🎒", 50, 55, 2]), hint: "Which has more mass?", explain: "The full backpack has more mass, so gravity pulls it harder: it's heavier." },
  { k: "everywhere", prompt: "Does gravity pull on a balloon floating up?", right: "Yes, but air pushes it up harder", options: ["Yes, but air pushes it up harder", "No, balloons have no gravity"], visual: scene(["🎈", 50, 40, 2]), hint: "Everything with mass is pulled by gravity.", explain: "Gravity pulls on the balloon too, but the air pushes up on it even more, so it rises." },
  { k: "sun", prompt: "What keeps Earth going around the Sun?", right: "The Sun's gravity", wrong: ["Wind in space", "Magnets", "Nothing"], visual: scene(["☀️", 35, 50, 2], ["🌍", 78, 50, 1.2]), hint: "Big things pull with gravity too.", explain: "The Sun's gravity pulls on Earth and keeps it in orbit." },
  { k: "moon-orbit", prompt: "What keeps the Moon going around Earth?", right: "Earth's gravity", wrong: ["The Sun's light", "Wind in space"], visual: scene(["🌍", 40, 50, 2], ["🌙", 80, 40, 1.2]), hint: "Earth pulls on the Moon.", explain: "Earth's gravity pulls on the Moon, keeping it in its orbit." },
  { k: "spring-scale", prompt: "A fruit hangs on a spring scale. The spring stretches because…", right: "Gravity pulls the fruit down", wrong: ["The fruit is magnetic", "The spring is pushing up on its own"], visual: scene(["🍌", 50, 60, 1.6]), hint: "What pulls the fruit?", explain: "Gravity pulls the fruit down, which stretches the spring. More stretch means more weight." },
  { k: "heavier-falls", prompt: "Jupiter's gravity is stronger than Earth's. A ball there would fall…", right: "Faster", options: ["Faster", "Slower", "Not at all"], hint: "Stronger pull, faster fall.", explain: "Stronger gravity pulls harder, so things fall faster on Jupiter." },
  { k: "astronaut-float", prompt: "Astronauts look weightless in the space station. Is Earth's gravity still pulling them?", right: "Yes, they are falling around Earth", options: ["Yes, they are falling around Earth", "No, there's no gravity there"], hint: "Gravity reaches far into space.", explain: "Gravity still pulls them. They and the station are all falling around Earth together, so they float." },
  { k: "kg-n", prompt: "Gravity pulls a 1 kg bag on Earth with about 10 N. A 3 kg bag?", right: "About 30 N", wrong: ["About 3 N", "About 10 N", "About 13 N"], hint: "Three times the mass, three times the pull.", explain: "3 times the mass, 3 times the pull: about 30 N (more exactly, 3 × 9.8 = 29.4 N)." },
];

/** 5-PS2-1 — weight is gravity's pull. */
export const weightGravity = bank("wg", WEIGHT_CASES);

const GRAVITY_AT_WORK = ["🍎 apple falls from a tree", "💧 rain falls", "🛝 sliding down a slide", "🏞️ river flows downhill", "🏀 ball comes back down", "🍂 leaves drift down"];
const OTHER_FORCE = ["🧲 magnet holds a note", "🎈 rubbed balloon sticks to a wall", "⚽ kick starts a ball rolling", "🪁 wind lifts a kite", "🧷 magnet lifts a pin", "🚪 you push a door open"];

/** 5-PS2-1 — Do it: sort gravity at work from other forces. */
export function sortGravity(): Question {
  const items = sortItems([GRAVITY_AT_WORK, OTHER_FORCE], [rand(2, 4), rand(2, 4)]);
  return make(
    {
      key: `sg-${itemsKey(items)}`,
      prompt: "Do it: gravity at work, or another force?",
      speech: "Sort each one. Is gravity making it happen, or another force?",
      hint: "Gravity pulls things down toward Earth. Is something being pulled down?",
      explain: "Falling, sliding down and flowing downhill are gravity. Magnets, static, wind and pushes are other forces.",
    },
    act({ kind: "sort", bins: ["🌍 Gravity", "🧲 Other force"], items }, items.length),
  );
}

const PLANT_CASES: Case[] = [
  { k: "energy", prompt: "Where does a plant get the energy to make its food?", right: "Sunlight", wrong: ["The soil", "The water", "The air at night"], visual: { kind: "phys-energy", chain: [{ emoji: "☀️", label: "sun" }, { emoji: "🌱", label: "plant", via: "light" }] }, hint: "Plants grow toward the window.", explain: "Plants capture the energy in sunlight and use it to make food (sugar)." },
  { k: "closet", prompt: "A plant is kept in a dark closet for weeks. What happens?", right: "It weakens: no light to make food", wrong: ["It grows faster", "Nothing changes"], visual: scene(["🌱", 50, 60, 1.6], ["🚪", 80, 50, 1.6]), hint: "What does a plant need light for?", explain: "With no sunlight, the plant can't make food, so it gets weak and pale." },
  { k: "stores", prompt: "A plant stores energy from sunlight in…", right: "Its leaves, fruit, seeds and roots", wrong: ["Its shadow", "The flower pot"], visual: scene(["🍎", 30, 55, 1.4], ["🥕", 50, 60, 1.4], ["🌽", 70, 55, 1.4]), hint: "What parts of plants do we eat?", explain: "Plants store the energy as food in their leaves, fruits, seeds and roots: the parts we eat." },
  { k: "leaves", prompt: "Which plant part mostly catches sunlight?", right: "Leaves", wrong: ["Roots", "Bark"], visual: scene(["🍃", 50, 50, 2]), hint: "Big, flat and facing the light.", explain: "Leaves are wide and flat to catch sunlight for making food." },
  { k: "turn", prompt: "A windowsill plant bends toward the window. Why?", right: "To get more sunlight", wrong: ["To look outside", "Because of the wind"], visual: scene(["🪴", 40, 65, 1.6], ["🪟", 80, 45, 1.8]), hint: "What does the plant need from the window?", explain: "Plants grow toward light to catch more of the Sun's energy." },
  { k: "grass", prompt: "Grass grows all summer. Where did the energy come from?", right: "The Sun", wrong: ["The lawnmower", "The Moon"], visual: scene(["☀️", 20, 25, 1.4], ["🌾", 60, 70, 1.8]), hint: "Plants run on sunlight.", explain: "Grass captures sunlight and turns its energy into food for growing." },
  { k: "first", prompt: "In a food chain, which comes first?", right: "The Sun", wrong: ["The plant", "The animal"], hint: "Where does the energy start?", explain: "Every food chain starts with the Sun: its energy is captured by plants." },
  { k: "animals", prompt: "Animals can't make food from sunlight. How do they get energy?", right: "By eating plants or other animals", wrong: ["By sunbathing", "By drinking water"], hint: "What do cows and lions eat?", explain: "Animals get energy by eating plants, or by eating animals that ate plants." },
  { k: "cloudy", prompt: "A whole month of thick clouds. The crops will…", right: "Grow less", options: ["Grow more", "Grow less", "Not change"], visual: scene(["☁️", 50, 30, 2], ["🌽", 50, 70, 1.6]), hint: "Less sunlight, less food made.", explain: "Less sunlight means less energy for making food, so crops grow less." },
  { k: "wood", prompt: "A campfire burns wood. The energy in the wood first came from…", right: "The Sun", wrong: ["The match", "The ground"], visual: scene(["🔥", 50, 60, 2]), hint: "Wood came from a tree.", explain: "The tree stored the Sun's energy in its wood. Burning releases it as heat and light." },
  { k: "sugar", prompt: "Plants use sunlight to make…", right: "Sugar (food)", wrong: ["Soil", "Rocks", "Water"], hint: "Fruit tastes sweet!", explain: "Plants use the energy of sunlight to make sugar from water and air." },
  { k: "algae", prompt: "Tiny algae in the ocean feed fish. Algae get energy from…", right: "Sunlight", wrong: ["Salt", "Sand"], visual: scene(["🌊", 50, 60, 2], ["🐟", 70, 50, 1.2]), hint: "Algae are like tiny plants.", explain: "Algae capture sunlight like plants do, starting ocean food chains." },
];

/** 5-PS3-1 — plants capture the Sun's energy and store it as food. */
export const sunToPlants = bank("stp", PLANT_CASES);

const FOOD_CHAINS: { k: string; steps: [string, string][] }[] = [
  { k: "bread", steps: [["☀️", "Sun"], ["🌾", "wheat"], ["🍞", "bread"], ["🧒", "you"]] },
  { k: "milk", steps: [["☀️", "Sun"], ["🌱", "grass"], ["🐄", "cow"], ["🥛", "milk"]] },
  { k: "egg", steps: [["☀️", "Sun"], ["🌽", "corn"], ["🐔", "hen"], ["🥚", "egg"]] },
  { k: "apple", steps: [["☀️", "Sun"], ["🌳", "apple tree"], ["🍎", "apple"], ["🧒", "you"]] },
  { k: "fox", steps: [["☀️", "Sun"], ["🌿", "clover"], ["🐇", "rabbit"], ["🦊", "fox"]] },
  { k: "bear", steps: [["☀️", "Sun"], ["🦠", "algae"], ["🐟", "fish"], ["🐻", "bear"]] },
  { k: "honey", steps: [["☀️", "Sun"], ["🌸", "flower"], ["🐝", "bee"], ["🍯", "honey"]] },
  { k: "cheese", steps: [["☀️", "Sun"], ["🌱", "grass"], ["🐐", "goat"], ["🧀", "cheese"]] },
  { k: "bird", steps: [["☀️", "Sun"], ["🍃", "leaves"], ["🐛", "caterpillar"], ["🐦", "bird"]] },
  { k: "lion", steps: [["☀️", "Sun"], ["🌾", "tall grass"], ["🦓", "zebra"], ["🦁", "lion"]] },
  { k: "squirrel", steps: [["☀️", "Sun"], ["🌳", "oak tree"], ["🌰", "acorn"], ["🐿️", "squirrel"]] },
  { k: "strawberry", steps: [["☀️", "Sun"], ["🌿", "strawberry plant"], ["🍓", "strawberry"], ["🧒", "you"]] },
  { k: "shark", steps: [["☀️", "Sun"], ["🌊", "seaweed"], ["🐢", "sea turtle"], ["🦈", "shark"]] },
];

/** 5-PS3-1 — follow energy along a food chain. */
export function foodChains(): Question {
  const c = pick(FOOD_CHAINS);
  const gap = rand(0, 2);
  const [e, name] = c.steps[gap];
  const others = [...new Set(FOOD_CHAINS.flatMap((f) => f.steps.map((s) => s[1])))].filter((n) => !c.steps.some((s) => s[1] === n));
  const wrong = gap === 0 ? ["Moon", "rain", "soil"] : shuffle(others).slice(0, 3);
  return make(
    {
      key: `fc-${c.k}-${gap}`,
      prompt: "What's missing from this energy chain?",
      visual: {
        kind: "phys-energy",
        chain: c.steps.map(([em, label], i) => (i === gap ? { emoji: "❓", label: "?" } : { emoji: em, label, ...(i === 1 ? { via: "light" } : i > 1 ? { via: "food" } : {}) })),
      },
      needsVisual: true,
      hint: gap === 0 ? "Where does the energy in every food chain start?" : "What does the next thing eat or come from?",
      explain: `${c.steps.map((s) => s[1]).join(" → ")}. The missing step is the ${name} ${e}.`,
    },
    choose(name, wrong, 3),
  );
}

/** 5-PS3-1 — Do it: put a food chain in the order the energy moves. */
export function orderChain(): Question {
  const c = pick(FOOD_CHAINS);
  const steps = c.steps.map(([e, n]) => `${e} ${n}`);
  return make(
    {
      key: `oc-${c.k}`,
      prompt: "Do it: put the energy chain in order.",
      speech: "Tap the steps in the order the energy moves, from where it starts to where it ends.",
      hint: "Every chain starts with the Sun. Then the plant that catches the light.",
      explain: `${c.steps.map((s) => s[1]).join(" → ")}: the energy came from the Sun.`,
    },
    act({ kind: "order", items: steps, direction: "Where energy starts → where it ends" }, steps.length),
  );
}

const FOODS: { food: string; e: string; ate: string; plant: string }[] = [
  { food: "hamburger", e: "🍔", ate: "cow", plant: "grass" },
  { food: "glass of milk", e: "🥛", ate: "cow", plant: "grass" },
  { food: "egg", e: "🥚", ate: "hen", plant: "grain" },
  { food: "cheese", e: "🧀", ate: "goat or cow", plant: "grass" },
  { food: "chicken wing", e: "🍗", ate: "chicken", plant: "corn" },
  { food: "fish stick", e: "🐟", ate: "fish", plant: "tiny algae" },
  { food: "honey", e: "🍯", ate: "bee", plant: "flower nectar" },
  { food: "bacon", e: "🥓", ate: "pig", plant: "corn and grain" },
  { food: "apple", e: "🍎", ate: "", plant: "apple tree" },
  { food: "bread", e: "🍞", ate: "", plant: "wheat" },
  { food: "popcorn", e: "🍿", ate: "", plant: "corn" },
  { food: "carrot", e: "🥕", ate: "", plant: "carrot plant" },
];

/** 5-PS3-1 — the energy in any food was once energy from the Sun. */
export function foodEnergyFrom(): Question {
  const f = pick(FOODS);
  if (f.ate && Math.random() < 0.5)
    return make(
      {
        key: `fe-ate-${f.food}`,
        prompt: `Trace your ${f.food} back. What did the ${f.ate} eat for energy?`,
        visual: scene([f.e, 50, 55, 2]),
        hint: "Animals get their energy from what they eat. Follow it back to a plant.",
        explain: `The ${f.ate} ate ${f.plant}, and the ${f.plant} got its energy from sunlight.`,
      },
      choose(cap(f.plant), ["Rocks", "Moonlight", "Plastic"].concat(FOODS.filter((x) => x.plant !== f.plant).map((x) => cap(x.plant))).slice(0, 5), 3),
    );
  return make(
    {
      key: `fe-sun-${f.food}`,
      prompt: `The energy in your ${f.food} first came from…`,
      visual: scene([f.e, 50, 55, 2]),
      hint: "Follow it back: what did it come from? Keep going until you reach a plant, then ask where the plant got energy.",
      explain: f.ate ? `${cap(f.food)} ← ${f.ate} ← ${f.plant} ← the Sun. The plant caught the Sun's energy first.` : `${cap(f.food)} ← ${f.plant} ← the Sun. The plant stored the Sun's energy.`,
    },
    choose("The Sun", ["The oven", "The fridge", "The Moon", "The water"], 3),
  );
}

const USE_CASES: Case[] = [
  { k: "bear", prompt: "A bear eats lots in fall. It uses that stored energy in winter to…", right: "Stay warm and alive", wrong: ["Glow in the dark", "Make sunlight"], visual: scene(["🐻", 50, 55, 2]), hint: "Bears sleep through cold winters.", explain: "The bear's stored food energy keeps its body warm and alive all winter." },
  { k: "hungry", prompt: "Why are you hungry after running?", right: "You used food energy to move", wrong: ["Running makes food disappear", "Your shoes are hungry"], visual: scene(["🏃", 50, 55, 2]), hint: "Moving takes energy.", explain: "Your muscles used energy from food to move you, so your body wants more." },
  { k: "cheetah", prompt: "A cheetah sprints. Where did that energy come from at first?", right: "The Sun", wrong: ["The ground", "The wind"], visual: scene(["🐆", 50, 55, 2]), hint: "Cheetah ← gazelle ← grass ← ?", explain: "Cheetah ate a gazelle, the gazelle ate grass, and the grass got energy from sunlight." },
  { k: "grow", prompt: "Kids grow taller over the years. What do bodies use to grow?", right: "Energy and materials from food", wrong: ["Sunlight on the skin only", "Sleep only"], hint: "What do you eat every day?", explain: "Your body uses food for energy and building materials to grow." },
  { k: "warm", prompt: "Birds and mammals stay warm on cold days by using…", right: "Energy from food", wrong: ["Energy from snow", "Moonlight"], visual: scene(["🐦", 40, 50, 1.4], ["❄️", 70, 40, 1.4]), hint: "Their bodies make heat.", explain: "They use energy from food to keep their bodies warm." },
  { k: "heal", prompt: "A scraped knee heals. What energy does the body use to repair it?", right: "Energy from food", wrong: ["Energy from a bandage", "Energy from the Moon"], hint: "Repair is work for your body.", explain: "Your body uses energy from food to build new skin and repair itself." },
  { k: "list", prompt: "Which is NOT a way animals use food energy?", right: "Making their own sunlight", wrong: ["Moving", "Growing", "Keeping warm", "Repairing their bodies"], hint: "Animals use food energy to move, grow, stay warm and heal.", explain: "Animals use food energy to move, grow, repair and keep warm. Nobody makes sunlight!" },
  { k: "label", prompt: "Food labels list Calories. Calories measure…", right: "How much energy the food has", wrong: ["How heavy the food is", "How cold the food is"], visual: scene(["🥫", 50, 55, 2]), hint: "Energy you can use to run and play.", explain: "Calories measure the energy stored in food." },
  { k: "plant-eaters", prompt: "A cow eats grass all day. Why so much?", right: "Grass has little energy, and the cow needs lots", wrong: ["Grass makes cows taller only", "Cows are bored"], visual: scene(["🐄", 50, 55, 2]), hint: "A big body uses lots of energy.", explain: "A big cow needs lots of energy, and grass doesn't have much, so it eats a lot." },
  { k: "sleep", prompt: "Even asleep, your body uses food energy to…", right: "Breathe, keep warm and pump blood", wrong: ["Nothing: sleeping uses no energy", "Make light"], hint: "Is your heart still beating?", explain: "Your body always uses energy: breathing, heartbeat and keeping warm never stop." },
  { k: "plant-grow", prompt: "A plant uses some of its own stored food energy to…", right: "Grow new leaves and roots", wrong: ["Walk to the sun", "Make sound"], visual: scene(["🌱", 50, 60, 2]), hint: "Plants use food too!", explain: "Plants use the sugar they make for energy to grow new leaves, stems and roots." },
  { k: "dinner", prompt: "Pasta for dinner gives you energy to play tomorrow. That energy started as…", right: "Sunlight caught by wheat", wrong: ["Heat from the stove", "Water in the pot"], visual: scene(["🍝", 50, 55, 2]), hint: "Pasta is made from wheat.", explain: "Wheat captured sunlight and stored it. The stove only cooks it." },
];

/** 5-PS3-1 — animals use food energy to move, grow, repair and keep warm. */
export const usingFoodEnergy = bank("ufe", USE_CASES);
