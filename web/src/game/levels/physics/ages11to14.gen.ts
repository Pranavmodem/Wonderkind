/**
 * Question generators for middle school physics (ages 11–14, Grades 6–8): NGSS MS-PS2 (forces and
 * fields), MS-PS3 (energy) and MS-PS4 (waves and signals). Worlds and levels are assembled in
 * ./ages11to14.ts.
 *
 * Numbers are chosen so answers come out exact (whole numbers or one decimal place). Gravity is
 * 9.8 N/kg (9.8 m/s²) unless a question says otherwise.
 */
import { labelChoices, pick, rand, shuffle } from "../../questions";
import { balanceSolution, launchDistance } from "../../science/physicsValidate";
import type { ForceArrow, PhysicsActivity } from "../../science/physicsTypes";
import type { Activity, Question, Visual } from "../../types";

/* =================================================================== helpers */

const NONE: Visual = { kind: "none" };

/** Remove floating-point noise. */
const clean = (x: number) => Math.round(x * 1e6) / 1e6;

/** A number as text. */
const ds = (x: number) => String(clean(x));

type Ans = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra" | "activity">;

/** Type the answer (decimals get a "." key). */
function kp(x: number): Ans {
  const a = clean(x);
  return Number.isInteger(a) ? { answer: a, input: "keypad" } : { answer: a, input: "keypad", keypadExtra: "." };
}

/** Number choices: the answer, likely mistakes, then neighbours `step` apart (never below `min`). */
function nums(x: number, wrong: number[], step = 1, min = 0): Ans {
  const a = clean(x);
  const out: number[] = [a];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < 4 && Number.isFinite(v) && v >= min && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < 4 && k < 60; k++) shuffle([a + k * step, a - k * step]).forEach(add);
  return { answer: a, input: "choices", choices: shuffle(out) };
}

/** Text choices: the right label and up to n − 1 wrong ones (shuffled, so different ones show each time). */
function opts(correct: string, wrong: string[], n = 4): Ans {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong), n);
  return { answer, input: "choices", choices, labels };
}

/** A hands-on activity. */
const act = (activity: Activity, answer: number): Ans => ({ input: "activity", activity, answer: clean(answer) });

const pickN = <T>(xs: readonly T[], n: number): T[] => shuffle(xs).slice(0, n);

/** One idea question from a pool: a prompt, the right answer, wrong answers, a hint and an explanation. */
interface Concept {
  q: string;
  a: string;
  w: string[];
  hint: string;
  explain: string;
  say?: string;
}

function concept(prefix: string, pool: Concept[], i: number, visual: Visual = NONE, extraKey = ""): Question {
  const c = pool[i];
  return {
    key: `${prefix}-${i}${extraKey}`,
    prompt: c.q,
    speech: c.say ?? c.q,
    visual,
    ...opts(c.a, c.w),
    hint: c.hint,
    explain: c.explain,
  };
}

/** Sort items into bins from per-bin pools, `per[b]` items from bin b. */
function sortItems(pools: string[][], per: number[]) {
  const chosen = pools.map((pool, b) => pickN(pool.map((label, i) => ({ label, i })), per[b]).map((x) => ({ ...x, bin: b })));
  const items = shuffle(chosen.flat()).map(({ label, bin }) => ({ label, bin }));
  const key = chosen.map((c) => c.map((x) => x.i).sort((a, b) => a - b).join(".")).join("|");
  return { items, key };
}

/* ======================================================= World 1: forces and motion */

const PUSHABLE = [
  { emoji: "📦", name: "crate" },
  { emoji: "🛒", name: "cart" },
  { emoji: "🛷", name: "sled" },
  { emoji: "🪑", name: "chair" },
  { emoji: "🧳", name: "suitcase" },
];

const STANDING: ForceArrow[] = [
  { dir: 90, size: 15, label: "N", colour: "leaf" },
  { dir: 270, size: 15, label: "F_g", colour: "wave" },
];

/** MS-PS2-2 — net force from a force diagram. */
export function netForce(): Question {
  const o = pick(PUSHABLE);
  const kind = rand(0, 2);
  if (kind === 0) {
    const a = rand(2, 12) * 5;
    let b = rand(1, 12) * 5;
    while (b === a) b = rand(1, 12) * 5;
    const net = Math.abs(a - b);
    const dir = a > b ? "right" : "left";
    return {
      key: `nf0-${o.name}-${a}-${b}`,
      prompt: `Two pushes act on the ${o.name}. What is the size of the net force?`,
      speech: `One push is ${a} newtons to the right. The other is ${b} newtons to the left. What is the size of the net force?`,
      visual: { kind: "phys-forces", object: o.emoji, surface: "floor", forces: [{ dir: 0, size: a, label: a }, { dir: 180, size: b, label: b }, ...STANDING] },
      needsVisual: true,
      ...kp(net),
      unit: "N",
      hint: "Forces in opposite directions work against each other: subtract the smaller from the bigger.",
      explain: `${Math.max(a, b)} − ${Math.min(a, b)} = ${net} N, pointing ${dir}. Up and down are balanced (N = F_g).`,
    };
  }
  if (kind === 1) {
    const a1 = rand(1, 6) * 5;
    const a2 = rand(1, 6) * 5;
    let b = rand(1, 12) * 5;
    while (b === a1 + a2) b = rand(1, 12) * 5;
    const net = a1 + a2 - b;
    const dir = net > 0 ? "right" : "left";
    return {
      key: `nf1-${o.name}-${a1}-${a2}-${b}`,
      prompt: `Three forces act on the ${o.name}. What is the size of the net force?`,
      speech: `Two pushes to the right, ${a1} newtons and ${a2} newtons. One push to the left, ${b} newtons. What is the size of the net force?`,
      visual: { kind: "phys-forces", object: o.emoji, surface: "floor", forces: [{ dir: 0, size: a1 + a2, label: `${a1} N + ${a2} N` }, { dir: 180, size: b, label: b }, ...STANDING] },
      needsVisual: true,
      ...kp(Math.abs(net)),
      unit: "N",
      hint: "Add the forces that point the same way first. Then subtract the force pointing the other way.",
      explain: `Right: ${a1} + ${a2} = ${a1 + a2} N. Left: ${b} N. Net = ${Math.abs(net)} N to the ${dir}.`,
    };
  }
  const a = rand(2, 12) * 5;
  const same = rand(0, 2) === 0;
  let b = same ? a : rand(1, 12) * 5;
  while (!same && b === a) b = rand(1, 12) * 5;
  const correct = a === b ? "No net force: they're balanced" : a > b ? "Right" : "Left";
  return {
    key: `nf2-${o.name}-${a}-${b}`,
    prompt: `Which way does the net force on the ${o.name} point?`,
    speech: `${a} newtons push right and ${b} newtons push left. Which way does the net force point?`,
    visual: { kind: "phys-forces", object: o.emoji, surface: "floor", forces: [{ dir: 0, size: a, label: a }, { dir: 180, size: b, label: b }, ...STANDING] },
    needsVisual: true,
    ...opts(correct, ["Right", "Left", "No net force: they're balanced", "Up"]),
    hint: "Compare the left and right arrows. The bigger one wins; equal ones cancel.",
    explain: a === b ? `${a} N right and ${b} N left cancel, so the net force is 0.` : `The ${Math.max(a, b)} N force beats the ${Math.min(a, b)} N force, so the net force points ${a > b ? "right" : "left"}.`,
  };
}

/** MS-PS2-2 — balanced or unbalanced: what happens to the motion. */
export function balancedOrNot(): Question {
  const o = pick(PUSHABLE);
  const moving = rand(0, 1) === 1;
  const kind = rand(0, 2);
  const a = rand(3, 10) * 5;
  const b = kind === 0 ? a : kind === 1 ? a - rand(1, 2) * 5 : a + rand(1, 3) * 5;
  const outcomes = ["It stays still", "It starts moving right", "It starts moving left", "It keeps the same speed", "It speeds up", "It slows down"];
  const correct = kind === 0 ? (moving ? outcomes[3] : outcomes[0]) : kind === 1 ? (moving ? outcomes[4] : outcomes[1]) : moving ? outcomes[5] : outcomes[2];
  const state = moving ? "is sliding to the right" : "is at rest";
  return {
    key: `bal-${o.name}-${moving ? 1 : 0}-${a}-${b}`,
    prompt: `The ${o.name} ${state}. What happens next?`,
    speech: `The ${o.name} ${state}. ${a} newtons push right and ${b} newtons push left. What happens next?`,
    visual: {
      kind: "phys-forces",
      object: o.emoji,
      surface: "floor",
      forces: [{ dir: 0, size: a, label: a }, { dir: 180, size: b, label: b }],
      ...(moving ? { motion: { dir: 0, label: "v" } } : {}),
    },
    needsVisual: true,
    ...opts(correct, outcomes),
    hint: "First find the net force. Zero net force means no change in motion; otherwise the motion changes in the direction of the net force.",
    explain:
      kind === 0
        ? `The forces are balanced (net force 0), so the motion doesn't change: ${moving ? "it keeps sliding at the same speed" : "it stays still"}.`
        : `The net force is ${Math.abs(a - b)} N to the ${a > b ? "right" : "left"}, so ${moving ? (a > b ? "it speeds up (the push is with the motion)" : "it slows down (the push is against the motion)") : `it starts moving ${a > b ? "right" : "left"}`}.`,
  };
}

/** MS-PS2-2 — draw the arrows that balance the forces. */
export function balanceForcesAct(): Question {
  const o = pick(PUSHABLE);
  const g = rand(2, 5);
  const side = pick([0, 180]);
  const back = (side + 180) % 360;
  const word = side === 0 ? "right" : "left";
  if (rand(0, 1) === 0) {
    const p = rand(1, 5);
    return {
      key: `baf0-${o.name}-${p}-${g}-${side}`,
      prompt: `A ${p} N push moves the ${o.name} ${word} at a steady speed. Drag the friction and N arrows so all the forces balance.`,
      speech: `A ${p} newton push moves the ${o.name} to the ${word} at a steady speed. Drag the friction arrow and the floor's push so all the forces balance.`,
      visual: NONE,
      ...act(
        {
          kind: "phys-forceArrows",
          object: o.emoji,
          surface: "floor",
          directions: 8,
          maxSize: 6,
          given: [{ dir: side, size: p, label: "push" }, { dir: 270, size: g, label: "F_g", colour: "wave" }],
          arrows: [{ label: "friction", answer: { dir: back, size: p } }, { label: "N", colour: "leaf", answer: { dir: 90, size: g } }],
        },
        p,
      ),
      hint: "Steady speed means zero net force. Each arrow needs a partner of the same length pointing the opposite way.",
      explain: `Friction is ${p} N to the ${side === 0 ? "left" : "right"} and the floor pushes up with ${g} N, so every force is cancelled.`,
    };
  }
  const p1 = rand(1, 3);
  const p2 = rand(1, 6 - p1);
  return {
    key: `baf1-${o.name}-${p1}-${p2}-${g}-${side}`,
    prompt: `Two kids push the ${o.name} ${word} with ${p1} N and ${p2} N, but it doesn't move. Drag the friction arrow to show why.`,
    speech: `Two kids push the ${o.name} to the ${word} with ${p1} and ${p2} newtons, but it doesn't move. Drag the friction arrow to show why.`,
    visual: NONE,
    ...act(
      {
        kind: "phys-forceArrows",
        object: o.emoji,
        surface: "floor",
        directions: 8,
        maxSize: 6,
        given: [
          { dir: side, size: p1, label: "A" },
          { dir: side, size: p2, label: "B" },
          { dir: 90, size: g, label: "N", colour: "leaf" },
          { dir: 270, size: g, label: "F_g", colour: "wave" },
        ],
        arrows: [{ label: "friction", answer: { dir: back, size: p1 + p2 } }],
      },
      p1 + p2,
    ),
    hint: "It isn't moving, so the net force is zero. Add the two pushes, then point friction the other way.",
    explain: `The pushes add to ${p1} + ${p2} = ${p1 + p2} N, so friction must be ${p1 + p2} N to the ${side === 0 ? "left" : "right"}.`,
  };
}

/** MS-PS2-2 — add a force to make a given net force. */
export function makeNetForceAct(): Question {
  const o = pick(PUSHABLE);
  let gx = 0;
  let wx = 0;
  do {
    gx = rand(1, 5) * pick([1, -1]);
    wx = rand(1, 4) * pick([1, -1]);
  } while (Math.abs(wx - gx) < 1 || Math.abs(wx - gx) > 6);
  const k = wx - gx;
  const dw = (x: number) => (x > 0 ? "right" : "left");
  return {
    key: `mnf-${o.name}-${gx}-${wx}`,
    prompt: `One push is ${Math.abs(gx)} N to the ${dw(gx)}. Add force F so the net force is ${Math.abs(wx)} N to the ${dw(wx)}.`,
    speech: `One push is ${Math.abs(gx)} newtons to the ${dw(gx)}. Add force F so the net force is ${Math.abs(wx)} newtons to the ${dw(wx)}.`,
    visual: NONE,
    ...act(
      {
        kind: "phys-forceArrows",
        object: o.emoji,
        surface: "floor",
        directions: 8,
        maxSize: 6,
        given: [
          { dir: gx > 0 ? 0 : 180, size: Math.abs(gx), label: "push" },
          { dir: 90, size: 3, label: "N", colour: "leaf" },
          { dir: 270, size: 3, label: "F_g", colour: "wave" },
        ],
        arrows: [{ label: "F", answer: { dir: k > 0 ? 0 : 180, size: Math.abs(k) } }],
        net: { x: wx, y: 0 },
      },
      Math.abs(k),
    ),
    hint: "Call right + and left −. Net = push + F, so F = net − push.",
    explain: `F = (${wx > 0 ? "" : "−"}${Math.abs(wx)}) − (${gx > 0 ? "" : "−"}${Math.abs(gx)}) = ${k > 0 ? "" : "−"}${Math.abs(k)}, so F is ${Math.abs(k)} N to the ${dw(k)}.`,
  };
}

/** MS-PS2-2 — read a position–time graph. */
export function readXT(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const x0 = pick([0, 5, 10]);
    let v = rand(1, 5);
    while (x0 + 8 * v > 40) v = rand(1, 5);
    const T = 8;
    return {
      key: `xt0-${x0}-${v}`,
      prompt: "A cart's position (m) against time (s). How fast is it moving?",
      speech: `The graph shows a cart's position in meters against time in seconds. It starts at ${x0} meters. How fast is it moving?`,
      visual: { kind: "plot", x: [0, 8], y: [0, 40], lines: [{ from: [0, x0], to: [T, x0 + v * T], colour: "berry" }], points: [{ x: 0, y: x0 }, { x: T, y: x0 + v * T }] },
      needsVisual: true,
      ...kp(v),
      unit: "m/s",
      hint: "Speed is the slope: change in position ÷ change in time. Read where it is at 0 s and at 8 s.",
      explain: `It goes from ${x0} m to ${x0 + v * T} m in ${T} s: ${v * T} ÷ ${T} = ${v} m/s.`,
    };
  }
  if (kind === 1) {
    for (;;) {
      const t1 = rand(2, 3);
      const t2 = t1 + rand(2, 3);
      const stop = rand(0, 2);
      const back = rand(0, 3) === 0;
      const speeds = shuffle([1, 2, 3, 4, 5]).slice(0, 2);
      const slopes = [0, 0, 0];
      let s = 0;
      for (let i = 0; i < 3; i++) if (i !== stop) slopes[i] = speeds[s++];
      if (back) {
        const mover = stop === 2 ? 1 : 2;
        slopes[mover] = -slopes[mover];
      }
      const ts = [0, t1, t2, 8];
      const xs = [rand(0, 2) * 5];
      for (let i = 0; i < 3; i++) xs.push(xs[i] + slopes[i] * (ts[i + 1] - ts[i]));
      if (xs.some((x) => x < 0 || x > 40)) continue;
      const names = ["A", "B", "C"];
      const ask = back ? 2 : rand(0, 1);
      const fastest = slopes.map(Math.abs).indexOf(Math.max(...slopes.map(Math.abs)));
      const answerIdx = ask === 0 ? stop : ask === 1 ? fastest : slopes.findIndex((m) => m < 0);
      const question = ["During which part is it stopped?", "During which part is it fastest?", "During which part is it coming back toward the start?"][ask];
      return {
        key: `xt1-${t1}-${t2}-${slopes.join(".")}-${xs[0]}-${ask}`,
        prompt: `Position (m) against time (s) for a skater. ${question}`,
        speech: `The graph shows a skater's position against time, in three parts, A, B and C. ${question}`,
        visual: {
          kind: "plot",
          x: [0, 8],
          y: [0, 40],
          lines: [0, 1, 2].map((i) => ({ from: [ts[i], xs[i]] as [number, number], to: [ts[i + 1], xs[i + 1]] as [number, number], colour: "berry" as const })),
          points: [0, 1, 2].map((i) => ({ x: (ts[i] + ts[i + 1]) / 2, y: (xs[i] + xs[i + 1]) / 2, label: names[i] })),
        },
        needsVisual: true,
        ...opts(`Part ${names[answerIdx]}`, names.map((n) => `Part ${n}`), 3),
        hint: ask === 0 ? "A flat line means the position isn't changing." : ask === 1 ? "The steepest part shows the biggest change in position each second." : "A line sloping down means the position is getting smaller.",
        explain:
          ask === 0
            ? `Part ${names[stop]} is flat: the position stays at ${xs[stop]} m, so the skater is stopped.`
            : ask === 1
              ? `Part ${names[fastest]} is steepest: ${Math.abs(slopes[fastest])} m every second.`
              : `Part ${names[answerIdx]} slopes down, so the position gets smaller: the skater heads back.`,
      };
    }
  }
  const vA = rand(1, 5);
  let vB = rand(1, 5);
  while (vB === vA) vB = rand(1, 5);
  const t = rand(2, 8);
  const howFar = rand(0, 1) === 0;
  const plot: Visual = {
    kind: "plot",
    x: [0, 8],
    y: [0, 40],
    curves: [
      { fn: (x) => vA * x, label: "A", colour: "berry" },
      { fn: (x) => vB * x, label: "B", colour: "wave" },
    ],
  };
  if (howFar)
    return {
      key: `xt2f-${vA}-${vB}-${t}`,
      prompt: `Position (m) against time (s) for runners A and B. How far apart are they at ${t} s?`,
      speech: `The graph shows the positions of runners A and B against time. They start together. How far apart are they after ${t} seconds?`,
      visual: plot,
      needsVisual: true,
      ...kp(Math.abs(vA - vB) * t),
      unit: "m",
      hint: `Read each runner's position at ${t} s, then subtract.`,
      explain: `A is at ${vA * t} m and B is at ${vB * t} m: ${Math.abs(vA - vB) * t} m apart.`,
    };
  return {
    key: `xt2-${vA}-${vB}`,
    prompt: "Position (m) against time (s) for runners A and B. Who is faster?",
    speech: "The graph shows the positions of runners A and B against time. Who is faster?",
    visual: plot,
    needsVisual: true,
    ...opts(vA > vB ? "Runner A" : "Runner B", ["Runner A", "Runner B", "Same speed"], 3),
    hint: "The steeper line covers more meters each second.",
    explain: `A runs ${vA} m/s and B runs ${vB} m/s, so ${vA > vB ? "A" : "B"} is faster: ${vA > vB ? "A" : "B"}'s line is steeper.`,
  };
}

/** MS-PS2-2 — plot a position–time graph for steady motion. */
export function plotMotionAct(): Question {
  let v = 0;
  let x0 = 0;
  do {
    v = rand(1, 3);
    x0 = rand(0, 3);
  } while (x0 + 3 * v > 10);
  const ts = pickN([0, 1, 2, 3], 3).sort((a, b) => a - b);
  const points = ts.map((t, i) => ({ x: t, y: x0 + v * t, label: "ABC"[i] }));
  return {
    key: `pm-${v}-${x0}-${ts.join("")}`,
    prompt: `A toy car starts at ${x0} m and moves ${v} m every second. Plot its position at ${ts.join(" s, ")} s. (x = time in s, y = position in m)`,
    speech: `A toy car starts at ${x0} meters and moves ${v} meters every second. Plot its position at ${ts.join(", ")} seconds. Time goes across, position goes up.`,
    visual: NONE,
    ...act({ kind: "plotPoints", points, size: 10, quadrants: 1 }, v),
    hint: `Position = start + speed × time = ${x0} + ${v} × t.`,
    explain: `${points.map((p) => `t = ${p.x}: ${x0} + ${v} × ${p.x} = ${p.y} m`).join("; ")}. The points make a straight line: steady speed.`,
  };
}

const MOVERS = [
  { emoji: "🛒", name: "cart" },
  { emoji: "🛹", name: "skateboard" },
  { emoji: "🛷", name: "sled" },
  { emoji: "📦", name: "crate" },
];

/** MS-PS2-2 — F = m × a. */
export function fEqualsMa(): Question {
  const o = pick(MOVERS);
  const kind = rand(0, 2);
  const m = pick([2, 4, 5, 10, 20, 25, 50]);
  const a = rand(1, 6);
  const F = m * a;
  const vis = (mass: string | number, force: string | number, acc: string): Visual => ({
    kind: "phys-forces",
    object: o.emoji,
    objectLabel: mass,
    surface: "floor",
    forces: [{ dir: 0, size: 10, label: force }],
    motion: { dir: 0, label: acc },
  });
  if (kind === 0)
    return {
      key: `fma0-${o.name}-${m}-${a}`,
      prompt: `A net force of ${F} N pushes a ${m} kg ${o.name}. What is its acceleration?`,
      speech: `A net force of ${F} newtons pushes a ${m} kilogram ${o.name}. What is its acceleration?`,
      visual: vis(m, F, "a = ?"),
      ...kp(a),
      unit: "m/s²",
      hint: "a = F ÷ m",
      explain: `a = ${F} ÷ ${m} = ${a} m/s². Each second it gets ${a} m/s faster.`,
    };
  if (kind === 1)
    return {
      key: `fma1-${o.name}-${m}-${a}`,
      prompt: `A ${m} kg ${o.name} speeds up at ${a} m/s². What net force acts on it?`,
      speech: `A ${m} kilogram ${o.name} speeds up at ${a} meters per second squared. What net force acts on it?`,
      visual: vis(m, "?", `a = ${a} m/s²`),
      ...kp(F),
      unit: "N",
      hint: "F = m × a",
      explain: `F = ${m} × ${a} = ${F} N.`,
    };
  return {
    key: `fma2-${o.name}-${m}-${a}`,
    prompt: `A net force of ${F} N gives the ${o.name} an acceleration of ${a} m/s². What is its mass?`,
    speech: `A net force of ${F} newtons gives the ${o.name} an acceleration of ${a} meters per second squared. What is its mass?`,
    visual: vis("?", F, `a = ${a} m/s²`),
    ...kp(m),
    unit: "kg",
    hint: "m = F ÷ a",
    explain: `m = ${F} ÷ ${a} = ${m} kg.`,
  };
}

/** MS-PS2-2 — how acceleration changes with mass and force. */
export function massAndAcceleration(): Question {
  const kind = rand(0, 3);
  const k = rand(2, 4);
  if (kind === 0) {
    const a = k * rand(1, 4);
    return {
      key: `ma0-${k}-${a}`,
      prompt: `A push gives an empty cart an acceleration of ${a} m/s². Loading it makes its mass ${k} times bigger. Same push: new acceleration?`,
      speech: `A push gives an empty cart an acceleration of ${a} meters per second squared. Loading it makes its mass ${k} times bigger. With the same push, what is the new acceleration?`,
      visual: NONE,
      ...kp(a / k),
      unit: "m/s²",
      hint: "Same force, more mass: the acceleration gets smaller by the same factor.",
      explain: `a = F ÷ m. With ${k} times the mass, a is ${k} times smaller: ${a} ÷ ${k} = ${a / k} m/s².`,
    };
  }
  if (kind === 1) {
    const a = rand(1, 5);
    return {
      key: `ma1-${k}-${a}`,
      prompt: `A rocket sled speeds up at ${a} m/s². Its engine force becomes ${k} times bigger (same mass). New acceleration?`,
      speech: `A rocket sled speeds up at ${a} meters per second squared. Its engine force becomes ${k} times bigger, with the same mass. What is the new acceleration?`,
      visual: NONE,
      ...kp(a * k),
      unit: "m/s²",
      hint: "Same mass, more force: the acceleration grows by the same factor.",
      explain: `a = F ÷ m. ${k} times the force gives ${k} times the acceleration: ${a} × ${k} = ${a * k} m/s².`,
    };
  }
  if (kind === 2) {
    const mA = rand(2, 10) * 100;
    let mB = rand(2, 10) * 100;
    while (mB === mA) mB = rand(2, 10) * 100;
    const F = rand(2, 6) * 1000;
    return {
      key: `ma2-${mA}-${mB}-${F}`,
      prompt: `Two go-karts get the same ${F} N engine force. Which speeds up faster?`,
      speech: `Two go-karts get the same ${F} newton engine force. Kart A has a mass of ${mA} kilograms and kart B ${mB} kilograms. Which speeds up faster?`,
      visual: { kind: "table", header: ["Kart", "Mass (kg)", "Force (N)"], rows: [["A", mA, F], ["B", mB, F]] },
      needsVisual: true,
      ...opts(mA < mB ? "Kart A" : "Kart B", ["Kart A", "Kart B", "Both the same"], 3),
      hint: "With the same force, the smaller mass gets the bigger acceleration.",
      explain: `a = F ÷ m: A gets ${clean(F / mA)} m/s², B gets ${clean(F / mB)} m/s². The lighter kart (${mA < mB ? "A" : "B"}) speeds up faster.`,
    };
  }
  return {
    key: `ma3-${k}`,
    prompt: `A truck has ${k} times the mass of a car. To give it the same acceleration, the truck's net force must be…`,
    speech: `A truck has ${k} times the mass of a car. To give it the same acceleration, how big must the truck's net force be?`,
    visual: NONE,
    ...opts(`${k} times as big`, [`${k * k} times as big`, "The same", `${k} times smaller`, "Half as big"]),
    hint: "F = m × a. Keep a the same and multiply m.",
    explain: `F = m × a: ${k} times the mass needs ${k} times the force for the same acceleration.`,
  };
}

const FRICTION: Concept[] = [
  {
    q: "A hockey puck slides much farther on ice than on carpet. Why?",
    a: "Ice gives much less friction",
    w: ["Ice pulls the puck forward", "The puck is lighter on ice", "Carpet has more gravity"],
    hint: "What force slows a sliding object down?",
    explain: "Friction acts against the motion. Ice is smooth, so friction is small and the puck slows down very slowly.",
  },
  {
    q: "A skydiver falls at a steady top speed. How do air resistance and weight compare?",
    a: "They are equal",
    w: ["Air resistance is bigger", "Weight is bigger", "There is no air resistance"],
    hint: "Steady speed means no change in motion.",
    explain: "At a steady speed the net force is zero, so air resistance (up) equals weight (down).",
  },
  {
    q: "Why do racing cyclists crouch low?",
    a: "To cut air resistance",
    w: ["To add more gravity", "To make more friction with the road", "To make the bike lighter"],
    hint: "Air pushes against anything moving through it.",
    explain: "A smaller front area means less air resistance, so less force works against their motion.",
  },
  {
    q: "A box slides across the floor and stops. What stopped it?",
    a: "Friction from the floor",
    w: ["It ran out of force", "Gravity pulled it backward", "Nothing; things just stop"],
    hint: "Something must push against the motion to slow it down.",
    explain: "Moving things don't need a force to keep going. Friction pushed against the motion until the box stopped.",
  },
  {
    q: "In deep space, far from everything, you push a ball. What does it do?",
    a: "Keeps moving at the same speed",
    w: ["Slows down and stops", "Speeds up forever", "Comes back to you"],
    hint: "Is there any force acting on it after the push?",
    explain: "With no friction or air, the net force is zero, so its motion doesn't change (Newton's first law).",
  },
  {
    q: "A parachute opens. What happens?",
    a: "Air resistance gets bigger, so she slows down",
    w: ["Gravity switches off", "Her weight gets bigger", "Air resistance disappears"],
    hint: "A parachute is big and wide.",
    explain: "The wide parachute pushes a lot of air, so air resistance becomes bigger than her weight and the net force slows her.",
  },
  {
    q: "Why do bike brakes make the wheel slow down?",
    a: "The pads rub the wheel, making friction",
    w: ["They make the bike heavier", "They push the road backward", "They switch off gravity"],
    hint: "Brake pads squeeze against the wheel.",
    explain: "Rubbing makes friction against the turning wheel, an unbalanced force that slows it.",
  },
  {
    q: "Why do running shoes have bumpy soles?",
    a: "More grip (friction) so you don't slip",
    w: ["Less friction so you go faster", "To make you lighter", "To push the ground away"],
    hint: "What stops your feet slipping backward?",
    explain: "Bumps and rubber grip the ground. Friction from the ground is what pushes you forward.",
  },
];

/** MS-PS2-2 — friction and air resistance. */
export function frictionForces(): Question {
  if (rand(0, 1) === 0) {
    const o = pick(PUSHABLE);
    const right = rand(0, 1) === 1;
    const v = rand(1, 6);
    return {
      key: `fr-${o.name}-${right ? 1 : 0}-${v}`,
      prompt: `The ${o.name} slides ${right ? "right" : "left"} across the floor. Which way does friction push on it?`,
      speech: `The ${o.name} slides to the ${right ? "right" : "left"} across the floor at ${v} meters per second. Which way does friction push on it?`,
      visual: { kind: "phys-forces", object: o.emoji, surface: "floor", forces: STANDING, motion: { dir: right ? 0 : 180, label: `v = ${v} m/s` } },
      ...opts(right ? "Left" : "Right", ["Left", "Right", "Up", "Down"]),
      hint: "Friction always acts against the sliding motion.",
      explain: `It slides ${right ? "right" : "left"}, so friction pushes ${right ? "left" : "right"} and slows it down.`,
    };
  }
  return concept("frc", FRICTION, rand(0, FRICTION.length - 1));
}

const FORCE_TRUE = [
  "Balanced forces can act on a moving object",
  "An unbalanced force changes speed or direction",
  "The same force speeds up a light object more",
  "Friction acts against the motion",
  "Steady speed in a straight line: net force is 0",
  "Doubling the net force doubles the acceleration",
];
const FORCE_FALSE = [
  "A moving object needs a force to keep moving",
  "An object at rest has no forces on it",
  "The same force speeds up a heavy object more",
  "Balanced forces make an object slow down",
  "Doubling the mass doubles the acceleration",
];
const FORCE_WHY = [
  "With no friction, a moving object keeps going by itself.",
  "Gravity and the floor still act on it; they just balance.",
  "a = F ÷ m, so more mass means less acceleration.",
  "Balanced forces cause no change in motion at all.",
  "a = F ÷ m: doubling the mass halves the acceleration.",
];

/** MS-PS2-2 — spot the wrong idea about forces. */
export function forceMistakes(): Question {
  const wrong = rand(0, FORCE_FALSE.length - 1);
  const trues = pickN(FORCE_TRUE.map((_, i) => i), 3);
  return {
    key: `fm-${wrong}-${[...trues].sort().join("")}`,
    prompt: "Flare wrote four facts about forces. Which one is WRONG?",
    speech: "Flare wrote four facts about forces. Which one is wrong?",
    visual: NONE,
    ...opts(FORCE_FALSE[wrong], trues.map((i) => FORCE_TRUE[i])),
    hint: "Think of a hockey puck on ice, and of F = m × a.",
    explain: `"${FORCE_FALSE[wrong]}" is wrong. ${FORCE_WHY[wrong]}`,
  };
}

/** MS-PS2-2 — balance a seesaw (balanced turning forces mean no change in motion). */
export function seesawAct(): Question {
  for (;;) {
    const slots = rand(4, 5);
    const fixed: Extract<PhysicsActivity, { kind: "phys-balance" }>["fixed"] = [{ side: "left", at: rand(1, slots), mass: rand(2, 6) }];
    if (rand(0, 1) === 0) fixed.push({ side: "left", at: rand(1, slots), mass: rand(1, 3) });
    if (fixed.length === 2 && fixed[0].at === fixed[1].at) continue;
    const mass = pick([1, 2]);
    const a: Extract<PhysicsActivity, { kind: "phys-balance" }> = { kind: "phys-balance", slots, fixed, mass, side: "right", unit: "kg" };
    if (!balanceSolution(a)) continue;
    const turn = fixed.reduce((s, f) => s + f.mass * f.at, 0);
    if (turn % mass !== 0) continue;
    return {
      key: `ss-${slots}-${fixed.map((f) => `${f.at}x${f.mass}`).join(".")}-${mass}`,
      prompt: `Add ${mass} kg blocks to the right side until the seesaw balances.`,
      speech: `Add ${mass} kilogram blocks to the right side until the seesaw balances.`,
      visual: NONE,
      ...act(a, turn),
      hint: "Each side's turning effect is mass × distance from the middle. Make the right side match the left.",
      explain: `Left side: ${fixed.map((f) => `${f.mass} × ${f.at}`).join(" + ")} = ${turn}. The right side needs mass × distance adding to ${turn} too; then the turning forces balance and it doesn't tip.`,
    };
  }
}

/* ===================================================== World 2: push back (Newton's 3rd law) */

const PAIRS: { act: string; react: string; wrong: string[] }[] = [
  { act: "Your foot kicks a ball forward", react: "The ball pushes your foot backward", wrong: ["The ground pushes your foot up", "Gravity pulls the ball down", "Your foot pushes the ball backward"] },
  { act: "A swimmer's hands push water backward", react: "The water pushes the swimmer forward", wrong: ["Gravity pulls the swimmer down", "The water pushes the hands backward", "The swimmer pushes the pool wall"] },
  { act: "A rocket pushes hot gas down", react: "The gas pushes the rocket up", wrong: ["Gravity pulls the rocket down", "The air pushes the gas sideways", "The gas pushes the ground down"] },
  { act: "Earth's gravity pulls you down", react: "You pull Earth up", wrong: ["The floor pushes you up", "You push the floor down", "Air pushes you up"] },
  { act: "A hammer hits a nail downward", react: "The nail pushes the hammer up", wrong: ["The wood pushes the nail up", "Gravity pulls the hammer down", "The hammer pushes the wood"] },
  { act: "A book pushes down on a table", react: "The table pushes up on the book", wrong: ["Gravity pulls the book down", "The floor pushes up on the table", "The book pulls Earth up"] },
  { act: "Your hand pushes on a wall", react: "The wall pushes back on your hand", wrong: ["Your feet push the floor", "Gravity pulls the wall down", "The wall pushes the floor"] },
  { act: "A car's tires push the road backward", react: "The road pushes the tires forward", wrong: ["The engine pushes the car", "Air pushes the car backward", "The tires push the road forward"] },
  { act: "A bat hits a baseball", react: "The ball pushes back on the bat", wrong: ["Gravity pulls the ball down", "Your hands push the bat", "Air pushes the ball back"] },
  { act: "A bird's wings push air down", react: "The air pushes the wings up", wrong: ["Gravity pulls the bird down", "The wings push the air up", "The bird pushes the ground"] },
  { act: "A magnet pulls a paper clip", react: "The paper clip pulls the magnet", wrong: ["Gravity pulls the clip down", "The table pushes the magnet up", "The magnet pushes the clip away"] },
  { act: "A skater pushes off a wall", react: "The wall pushes the skater away", wrong: ["The ice pushes the skater up", "The skater pushes the ice", "Gravity pulls the skater down"] },
];

/** MS-PS2-1 — name the reaction force. */
export function actionReaction(): Question {
  const i = rand(0, PAIRS.length - 1);
  const p = PAIRS[i];
  return {
    key: `ar-${i}`,
    prompt: `${p.act}. What is the reaction force?`,
    speech: `${p.act}. What is the reaction force?`,
    visual: NONE,
    ...opts(p.react, p.wrong),
    hint: "Swap the two objects: if A pushes B, then B pushes A, the same size and the opposite way.",
    explain: `${p.react}. The two forces act on different objects, are the same size, and point opposite ways.`,
  };
}

/** MS-PS2-1 — forces in a collision are equal and opposite. */
export function equalForces(): Question {
  const kind = rand(0, 2);
  const mA = rand(2, 10);
  let mB = rand(1, 10);
  while (mB === mA) mB = rand(1, 10);
  const v = rand(1, 6);
  const vis: Visual = { kind: "phys-collision", before: [{ mass: mA, v, vSize: v, name: "A" }, { mass: mB, v: 0, vSize: 0, name: "B" }] };
  if (kind === 0)
    return {
      key: `ef0-${mA}-${mB}-${v}`,
      prompt: "Cart A crashes into cart B. During the crash, which force is bigger?",
      speech: `Cart A, ${mA} kilograms, crashes into cart B, ${mB} kilograms. During the crash, which force is bigger?`,
      visual: vis,
      ...opts("Both forces are the same size", ["A pushes on B harder", "B pushes on A harder", "Only A pushes"]),
      hint: "Newton's third law: forces come in equal and opposite pairs.",
      explain: "A pushes B exactly as hard as B pushes A, whatever their masses or speeds. The forces point opposite ways.",
    };
  if (kind === 1) {
    const F = rand(2, 30) * 10;
    return {
      key: `ef1-${mA}-${mB}-${v}-${F}`,
      prompt: `During the crash, cart A pushes on cart B with ${F} N. How hard does B push on A?`,
      speech: `During the crash, cart A pushes on cart B with ${F} newtons. How hard does B push on A?`,
      visual: vis,
      ...kp(F),
      unit: "N",
      hint: "Third law: the same size, opposite direction.",
      explain: `B pushes back on A with ${F} N, to the left.`,
    };
  }
  return {
    key: `ef2-${mA}-${mB}-${v}`,
    prompt: "Both carts feel the same size force in the crash. Whose speed changes more?",
    speech: `Cart A is ${mA} kilograms and cart B is ${mB} kilograms. Both feel the same size force in the crash. Whose speed changes more?`,
    visual: vis,
    ...opts(mA < mB ? `Cart A (${mA} kg)` : `Cart B (${mB} kg)`, [`Cart A (${mA} kg)`, `Cart B (${mB} kg)`, "They change the same"], 3),
    hint: "Same force: a = F ÷ m. Which mass is smaller?",
    explain: `Same force, so the lighter cart (${Math.min(mA, mB)} kg) gets the bigger acceleration and its speed changes more.`,
  };
}

/** MS-PS2-1, MS-PS2-2 — accelerations in a collision from F = ma. */
export function collisionAccel(): Question {
  const pairs: [number, number][] = [[1, 2], [1, 3], [2, 3], [2, 4], [2, 5], [3, 4], [3, 6], [4, 5], [1, 4], [2, 6], [4, 6]];
  const [mA, mB] = shuffle(pick(pairs));
  const lcmAB = mA * mB / gcd(mA, mB);
  const F = lcmAB * rand(1, 4);
  const askA = rand(0, 1) === 0;
  if (rand(0, 2) === 0) {
    return {
      key: `ca-r-${mA}-${mB}-${F}`,
      prompt: `Cart A (${mA} kg) and cart B (${mB} kg) collide. How many times bigger is the lighter cart's acceleration?`,
      speech: `Cart A, ${mA} kilograms, and cart B, ${mB} kilograms, collide. How many times bigger is the lighter cart's acceleration?`,
      visual: { kind: "phys-collision", before: [{ mass: mA, v: 2, vSize: 2, name: "A" }, { mass: mB, v: 1, vSize: -1, name: "B" }] },
      ...nums(Math.max(mA, mB) / Math.min(mA, mB), [1, Math.max(mA, mB), Math.min(mA, mB)], 0.5),
      hint: "Both feel the same force. a = F ÷ m, so compare the masses.",
      explain: `Same force on both: the accelerations are in the ratio ${Math.max(mA, mB)} : ${Math.min(mA, mB)}, so the lighter cart's is ${ds(Math.max(mA, mB) / Math.min(mA, mB))} times bigger.`,
    };
  }
  const m = askA ? mA : mB;
  return {
    key: `ca-${mA}-${mB}-${F}-${askA ? "A" : "B"}`,
    prompt: `In a crash each cart feels a ${F} N force. A is ${mA} kg, B is ${mB} kg. What is cart ${askA ? "A" : "B"}'s acceleration?`,
    speech: `In a crash, each cart feels a ${F} newton force. Cart A is ${mA} kilograms and cart B is ${mB} kilograms. What is cart ${askA ? "A" : "B"}'s acceleration?`,
    visual: { kind: "phys-collision", before: [{ mass: mA, v: 3, vSize: 3, name: "A" }, { mass: mB, v: 0, vSize: 0, name: "B" }] },
    ...kp(F / m),
    unit: "m/s²",
    hint: "The force on each cart is the same. Use a = F ÷ m with that cart's mass.",
    explain: `a = ${F} ÷ ${m} = ${ds(F / m)} m/s². The other cart gets ${ds(F / (askA ? mB : mA))} m/s²: same force, different masses.`,
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const REACTIONS = [
  { obj: "🧍", text: (s: number) => `The kid pushes a wall to the right with ${s} N. Draw the wall's push on the kid.`, dir: 180, label: "wall" },
  { obj: "🚀", text: (s: number) => `The rocket pushes gas down with ${s} N (one step = 1 N). Draw the gas's push on the rocket.`, dir: 90, label: "gas" },
  { obj: "🏀", text: (s: number) => `The bouncing ball pushes down on the floor with ${s} N. Draw the floor's push on the ball.`, dir: 90, label: "floor" },
  { obj: "🧲", text: (s: number) => `The magnet pulls a nail to its left with ${s} N. Draw the nail's pull on the magnet.`, dir: 0, label: "nail" },
  { obj: "🎈", text: (s: number) => `The balloon squirts air out to the left with ${s} N. Draw the air's push on the balloon.`, dir: 0, label: "air" },
  { obj: "🚣", text: (s: number) => `The oars push water to the left with ${s} N. Draw the water's push on the boat.`, dir: 0, label: "water" },
  { obj: "🏃", text: (s: number) => `The runner's foot pushes the ground down and to the right with ${s} N. Draw the ground's push on the runner.`, dir: 135, label: "ground" },
  { obj: "📕", text: (s: number) => `The book pushes down on the table with ${s} N. Draw the table's push on the book.`, dir: 90, label: "table" },
  { obj: "🔨", text: (s: number) => `The hammer hits a nail downward with ${s} N. Draw the nail's push on the hammer.`, dir: 90, label: "nail" },
];

/** MS-PS2-1 — draw the reaction force. */
export function reactionArrowAct(): Question {
  const i = rand(0, REACTIONS.length - 1);
  const r = REACTIONS[i];
  const s = rand(1, 6);
  const words: Record<number, string> = { 0: "right", 90: "up", 180: "left", 135: "up and to the left" };
  return {
    key: `ra-${i}-${s}`,
    prompt: r.text(s),
    speech: r.text(s).replace(/(\d+) N/g, "$1 newtons").replace("(one step = 1 N)", ""),
    visual: NONE,
    ...act(
      {
        kind: "phys-forceArrows",
        object: r.obj,
        directions: 8,
        maxSize: 6,
        arrows: [{ label: r.label, answer: { dir: r.dir, size: s } }],
        check: "exact",
      },
      s,
    ),
    hint: "The reaction is the same size as the action and points the opposite way, on the other object.",
    explain: `The ${r.label} pushes back with ${s} N, ${words[r.dir]}: equal size, opposite direction.`,
  };
}

const THIRD_PAIRS = [
  "Foot on ball; ball on foot",
  "Earth pulls Moon; Moon pulls Earth",
  "Rocket on gas; gas on rocket",
  "Hand on wall; wall on hand",
  "Book on table; table on book",
  "Magnet on clip; clip on magnet",
];
const ONE_OBJECT = [
  "Gravity on a book; table on the book",
  "Two teams pull a rope equally hard",
  "Engine push and drag on a car at steady speed",
  "Gravity on a lamp; the cord holding it up",
  "Weight and air resistance on a falling skydiver",
  "Weight of a boat; water holding it up",
];

/** MS-PS2-1 — sort force pairs: third-law pairs (two objects) or balanced forces (one object). */
export function sortPairsAct(): Question {
  const n0 = rand(3, 4);
  const { items, key } = sortItems([THIRD_PAIRS, ONE_OBJECT], [n0, 7 - n0]);
  return {
    key: `sp-${key}`,
    prompt: "Sort the force pairs: a third-law pair, or two forces on ONE object?",
    speech: "Sort the pairs of forces. Is each one an action–reaction pair on two objects, or two forces on one object?",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Action–reaction (2 objects)", "Both on 1 object"], items }, n0),
    hint: "Ask: what does each force act ON? A third-law pair always acts on two different objects.",
    explain: "Action–reaction forces act on different objects (A on B, B on A). Balanced forces both act on the same object.",
  };
}

const EVERYDAY_THIRD: Concept[] = [
  {
    q: "How can a rocket speed up in space, with nothing to push on?",
    a: "It pushes gas out the back; the gas pushes it forward",
    w: ["Space pulls it along", "It pushes on the stars", "It can't; it just drifts"],
    hint: "What does the rocket push on?",
    explain: "The rocket pushes gas backward, so the gas pushes the rocket forward. No air or ground is needed.",
  },
  {
    q: "When you walk, what pushes you forward?",
    a: "The ground, pushing back on your foot",
    w: ["Your legs push you", "Air behind you", "Gravity"],
    hint: "Your foot pushes the ground backward. What is the reaction?",
    explain: "Your foot pushes the ground backward; the ground pushes your foot forward. That reaction moves you.",
  },
  {
    q: "You jump from a small boat to the dock. What does the boat do?",
    a: "It moves away from the dock",
    w: ["It stays still", "It follows you to the dock", "It sinks a little and stops"],
    hint: "You push the boat one way to jump the other way.",
    explain: "You push the boat backward, the boat pushes you forward. The boat moves the opposite way to you.",
  },
  {
    q: "Why does a cannon roll backward when it fires?",
    a: "The ball pushes back on the cannon",
    w: ["The explosion pulls the ground", "The air pushes it", "Gravity pulls it back"],
    hint: "The cannon pushes the ball forward…",
    explain: "The cannon pushes the ball forward and the ball pushes the cannon backward with the same size force (recoil).",
  },
  {
    q: "A squid squirts water backward. What happens?",
    a: "The water pushes the squid forward",
    w: ["The squid sinks", "The water pulls the squid back", "Nothing happens"],
    hint: "Action: squid pushes water back. Reaction?",
    explain: "The squid pushes water backward and the water pushes the squid forward: jet propulsion.",
  },
  {
    q: "How does a helicopter's rotor hold it up?",
    a: "It pushes air down; the air pushes it up",
    w: ["It pulls on the clouds", "It cancels gravity", "It spins so fast it gets lighter"],
    hint: "The blades push air one way…",
    explain: "The blades push air downward, and the air pushes the blades upward, lifting the helicopter.",
  },
];

/** MS-PS2-1 — the third law in everyday motion and recoil. */
export function everydayThird(): Question {
  if (rand(0, 1) === 0) return concept("et", EVERYDAY_THIRD, rand(0, EVERYDAY_THIRD.length - 1));
  const mA = rand(6, 16) * 5;
  let mB = rand(6, 16) * 5;
  if (rand(0, 5) === 0) mB = mA;
  const correct = mA === mB ? "Same speed" : mA < mB ? `Skater A (${mA} kg)` : `Skater B (${mB} kg)`;
  return {
    key: `et-s-${mA}-${mB}`,
    prompt: "Two skaters stand still, then push off each other. Who moves away faster?",
    speech: `Skater A, ${mA} kilograms, and skater B, ${mB} kilograms, stand still on ice, then push off each other. Who moves away faster?`,
    visual: { kind: "phys-collision", before: [{ mass: mA, v: 0, vSize: 0, name: "A", colour: "grape" }, { mass: mB, v: 0, vSize: 0, name: "B", colour: "teal" }] },
    ...opts(correct, [`Skater A (${mA} kg)`, `Skater B (${mB} kg)`, "Same speed"], 3),
    hint: "They push each other with the same size force. Who has less mass?",
    explain: mA === mB ? "Same force and same mass, so they move apart at the same speed." : `Each gets the same push, so the lighter skater (${Math.min(mA, mB)} kg) speeds up more and moves away faster.`,
  };
}

/** MS-PS2-1 — what happens in a collision (equal carts). */
export function collisionResult(): Question {
  const m = rand(1, 5);
  const v = rand(1, 4) * 2;
  const kind = rand(0, 2);
  if (kind === 0)
    return {
      key: `cr0-${m}-${v}`,
      prompt: "Two identical carts. A hits B, A stops dead and B rolls on. How fast does B go?",
      speech: `Two identical ${m} kilogram carts. Cart A moves at ${v} meters per second and hits cart B, which is at rest. A stops dead and B rolls on. How fast does B go?`,
      visual: {
        kind: "phys-collision",
        before: [{ mass: m, v, vSize: v, name: "A" }, { mass: m, v: 0, vSize: 0, name: "B" }],
        after: [{ mass: m, v: 0, vSize: 0, name: "A" }, { mass: m, v: "?", vSize: v, name: "B" }],
      },
      needsVisual: true,
      ...kp(v),
      unit: "m/s",
      hint: "A pushes B forward exactly as hard as B pushes A back. Their masses are equal.",
      explain: `The push that stopped A (from ${v} m/s to 0) is the same size as the push on B. B has the same mass, so it speeds up from 0 to ${v} m/s, like a Newton's cradle.`,
    };
  if (kind === 1)
    return {
      key: `cr1-${m}-${v}`,
      prompt: "Two identical carts stick together after the crash. How fast do they move?",
      speech: `Two identical ${m} kilogram carts. Cart A moves at ${v} meters per second, hits cart B at rest, and they stick together. How fast do they move?`,
      visual: {
        kind: "phys-collision",
        before: [{ mass: m, v, vSize: v, name: "A" }, { mass: m, v: 0, vSize: 0, name: "B" }],
        after: [{ mass: 2 * m, v: "?", vSize: v / 2 }],
      },
      needsVisual: true,
      ...kp(v / 2),
      unit: "m/s",
      hint: "A slows down exactly as much as B speeds up, because the forces are equal and the masses are equal.",
      explain: `A loses speed and B gains the same amount until they match: halfway, ${v / 2} m/s.`,
    };
  return {
    key: `cr2-${m}-${v}`,
    prompt: "Cart A hits cart B and they stick together. Compared with A's speed before, the pair moves…",
    speech: `Cart A moves at ${v} meters per second, hits a cart at rest and they stick together. Compared with A's speed before, how does the pair move?`,
    visual: { kind: "phys-collision", before: [{ mass: m, v, vSize: v, name: "A" }, { mass: m, v: 0, vSize: 0, name: "B" }] },
    ...opts("Slower", ["Slower", "Faster", "At the same speed", "Backward"], 4),
    hint: "B pushes back on A during the crash.",
    explain: "B's push slows A down while A's push speeds B up, so the joined carts move slower than A did.",
  };
}

const PADS = ["Bare box", "Bubble wrap", "Foam", "Sponge", "Straws", "Balloon"];

/** MS-PS2-1 — design to protect in a collision. */
export function crashDesign(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const names = pickN(PADS, 3);
    const forces = pickN([20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80], 3);
    const best = forces.indexOf(Math.min(...forces));
    return {
      key: `cd0-${names.join(".")}-${forces.join(".")}`,
      prompt: "An egg is dropped in each package. A sensor reads the biggest force on the egg. Which design protects it best?",
      speech: `An egg is dropped in each package. ${names.map((n, i) => `${n}: ${forces[i]} newtons`).join(". ")}. Which design protects it best?`,
      visual: { kind: "table", header: ["Design", "Biggest force (N)"], rows: names.map((n, i) => [n, forces[i]]) },
      needsVisual: true,
      ...opts(names[best], names, 3),
      hint: "The best design keeps the force on the egg smallest.",
      explain: `${names[best]} gave the smallest force (${forces[best]} N). Soft materials make the stop take longer, so the force is smaller.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Why do airbags and crumple zones protect people in a crash?",
      a: "They make the stop take longer, so the force is smaller",
      w: ["They make the car heavier", "They cancel the third-law force", "They stop gravity in the crash"],
      hint: "Think about stopping in a long, soft way or a short, hard way.",
      explain: "Stopping over a longer time needs a smaller force, so people are hurt less.",
    },
    {
      q: "A car hits a wall. The car pushes the wall with a huge force. The wall pushes the car with…",
      a: "The same size force",
      w: ["A smaller force", "No force", "A bigger force"],
      hint: "Newton's third law works in every collision.",
      explain: "Equal and opposite: the wall pushes the car just as hard as the car pushes the wall.",
    },
    {
      q: "Why does a bike helmet have a foam layer?",
      a: "Foam squashes, so the head stops more gently",
      w: ["Foam is heavy", "Foam bounces the head harder", "Foam makes friction with the road"],
      hint: "What does the foam do when the helmet hits something?",
      explain: "The foam crushes, making the head take longer to stop, so the force on it is smaller.",
    },
    {
      q: "Why do gymnasts land on thick mats?",
      a: "The mat makes the landing take longer, so the force is smaller",
      w: ["The mat makes them lighter", "The mat pushes them up harder", "The mat removes gravity"],
      hint: "Hard floor: short stop. Soft mat: …?",
      explain: "Sinking into the mat stretches the stop over more time, so a smaller force stops them.",
    },
    {
      q: "Catching a hard ball, why do you pull your hands back?",
      a: "It stops the ball over a longer time, with less force",
      w: ["It makes the ball lighter", "It cancels the ball's push", "It makes the ball go faster"],
      hint: "Compare stopping the ball suddenly with stopping it gradually.",
      explain: "Moving your hands back makes the stop last longer, so the ball pushes on your hands with less force.",
    },
  ];
  const i = rand(0, pool.length - 1);
  return concept("cd1", pool, i);
}

/** MS-PS2-1 — read a force–time graph of a collision. */
export function collisionGraph(): Question {
  const P = pick([10, 20, 30, 40]);
  const T = pick([4, 6, 8]);
  const t0 = rand(0, 10 - T);
  const f = (t: number) => (t >= t0 && t <= t0 + T ? P * Math.sin((Math.PI * (t - t0)) / T) : 0);
  const kind = rand(0, 2);
  const vis: Visual = {
    kind: "plot",
    x: [0, 10],
    y: [-40, 40],
    curves: [
      { fn: f, label: "on A", colour: "wave" },
      { fn: (t) => -f(t), label: "on B", colour: "berry" },
    ],
  };
  const base = "Force (N) on each cart against time (ms) during a crash.";
  if (kind === 0)
    return {
      key: `cg0-${P}-${T}-${t0}`,
      prompt: `${base} What is the biggest force on cart B (its size)?`,
      speech: "The graph shows the force on each cart against time during a crash. What is the size of the biggest force on cart B?",
      visual: vis,
      needsVisual: true,
      ...kp(P),
      unit: "N",
      hint: "Read the lowest point of B's curve; its size ignores the minus sign.",
      explain: `B's curve reaches −${P} N: a ${P} N push to the left, the same size as the ${P} N push on A.`,
    };
  if (kind === 1)
    return {
      key: `cg1-${P}-${T}-${t0}`,
      prompt: `${base} At what time (ms) are the forces biggest?`,
      speech: "The graph shows the force on each cart against time during a crash. At what time, in milliseconds, are the forces biggest?",
      visual: vis,
      needsVisual: true,
      ...kp(t0 + T / 2),
      unit: "ms",
      hint: "Find the peak of either curve and read the time below it.",
      explain: `Both curves peak at ${t0 + T / 2} ms, at the same moment, because the two forces are a pair.`,
    };
  return {
    key: `cg2-${P}-${T}-${t0}`,
    prompt: `${base} What does the graph show?`,
    speech: "The graph shows the force on each cart against time during a crash. What does it show?",
    visual: vis,
    needsVisual: true,
    ...opts("Equal sizes, opposite directions, at the same time", ["A is pushed harder than B", "B is pushed first, then A", "The forces add up to make A speed up"]),
    hint: "Compare the two curves: their heights and their timing.",
    explain: `The curves are mirror images: ${P} N on A and ${P} N the other way on B, at every instant. That's Newton's third law.`,
  };
}

const THIRD_TRUE = [
  "Forces always come in pairs",
  "A pair's forces act on different objects",
  "In a crash, both objects feel the same force",
  "In a crash, the lighter object's speed changes more",
  "A rocket is pushed by the gas it pushes out",
];
const THIRD_FALSE = [
  "In a crash, the heavier object pushes harder",
  "Action and reaction cancel, so nothing can move",
  "The reaction comes a moment after the action",
  "A faster object pushes harder than it gets pushed",
  "Only moving objects push back",
];
const THIRD_WHY = [
  "Both push on each other with the same size force.",
  "They act on different objects, so they can't cancel each other.",
  "The two forces happen at exactly the same time.",
  "Speed doesn't matter: the two forces are always equal.",
  "A wall or a table pushes back too, without moving.",
];

/** MS-PS2-1 — spot the wrong idea about the third law. */
export function thirdLawMistakes(): Question {
  const wrong = rand(0, THIRD_FALSE.length - 1);
  const trues = pickN(THIRD_TRUE.map((_, i) => i), 3);
  return {
    key: `tm-${wrong}-${[...trues].sort().join("")}`,
    prompt: "Which statement about Newton's third law is WRONG?",
    speech: "Which statement about Newton's third law is wrong?",
    visual: NONE,
    ...opts(THIRD_FALSE[wrong], trues.map((i) => THIRD_TRUE[i])),
    hint: "Third-law forces are equal, opposite, at the same time, and on two different objects.",
    explain: `"${THIRD_FALSE[wrong]}" is wrong. ${THIRD_WHY[wrong]}`,
  };
}

/* ========================================================= World 3: forces at a distance */

/** MS-PS2-3, MS-PS2-5 — magnet poles. */
export function magnetPoles(): Question {
  const l = pick(["NS", "SN"] as const);
  const r = pick(["NS", "SN"] as const);
  const attract = l[1] !== r[0];
  const kind = rand(0, 3);
  const facing = `${l[1]} and ${r[0]}`;
  const vis = (arrows: boolean): Visual => ({ kind: "phys-magnets", scene: "bars", magnets: [l, r], arrows });
  if (kind === 0)
    return {
      key: `mp0-${l}${r}`,
      prompt: "Will these magnets attract or repel?",
      speech: `The facing poles are ${facing === "N and N" ? "north and north" : facing === "S and S" ? "south and south" : "north and south"}. Will these magnets attract or repel?`,
      visual: vis(false),
      needsVisual: true,
      ...opts(attract ? "Attract" : "Repel", ["Attract", "Repel", "Neither"], 3),
      hint: "Look at the two poles facing each other. Opposites attract; like poles repel.",
      explain: `The facing poles are ${facing}: ${attract ? "opposite poles attract" : "like poles repel"}.`,
    };
  if (kind === 1)
    return {
      key: `mp1-${l}${r}`,
      prompt: "Flare turns the right magnet around. What happens now?",
      speech: "Flare turns the right magnet around. What happens now?",
      visual: vis(true),
      needsVisual: true,
      ...opts(attract ? "They repel" : "They attract", ["They attract", "They repel", "Nothing: there's no force"], 3),
      hint: "Turning it around swaps which pole faces the other magnet.",
      explain: `Now ${l[1]} faces ${r[1]}: ${attract ? "like poles, so they repel" : "opposite poles, so they attract"}.`,
    };
  if (kind === 2)
    return {
      key: `mp2-${l}${r}`,
      prompt: "Which poles are facing each other?",
      speech: "Which poles are facing each other?",
      visual: vis(true),
      needsVisual: true,
      ...opts(facing === "S and N" ? "N and S" : facing, ["N and S", "N and N", "S and S"], 3),
      hint: "Read the letters on the two ends closest together.",
      explain: `The left magnet's ${l[1]} faces the right magnet's ${r[0]}, so they ${attract ? "attract" : "repel"}.`,
    };
  return {
    key: `mp3-${l}${r}`,
    prompt: `These magnets ${attract ? "attract" : "repel"}. What happens to the force as the gap gets bigger?`,
    speech: `These magnets ${attract ? "attract" : "repel"}. What happens to the force as the gap between them gets bigger?`,
    visual: { kind: "phys-magnets", scene: "bars", magnets: [l, r], arrows: true, gap: "gap" },
    ...opts("It gets weaker", ["It gets weaker", "It gets stronger", "It stays the same", "It flips direction"]),
    hint: "Try it with fridge magnets: when do you feel the pull most?",
    explain: "Magnetic forces get weaker with distance. Closer magnets push or pull harder.",
  };
}

const FIELD: Concept[] = [
  {
    q: "Where is this magnet's field strongest?",
    a: "Near the poles",
    w: ["In the middle of its side", "Far from the magnet", "The same everywhere"],
    hint: "Where are the field lines crowded together?",
    explain: "Field lines bunch up at the poles. Crowded lines mean a strong field.",
  },
  {
    q: "Which way do magnetic field lines point?",
    a: "Out of N and into S",
    w: ["Out of S and into N", "Straight up", "Around in circles inside the magnet only"],
    hint: "A compass's north end points along the field.",
    explain: "Field lines leave the north pole and loop around into the south pole.",
  },
  {
    q: "What do the little compasses show?",
    a: "The field's direction at each spot",
    w: ["Which way is north on Earth", "How heavy the magnet is", "Where the magnet's charge is"],
    hint: "Each needle turns to line up with something.",
    explain: "A compass needle lines up with the magnetic field, so the needles trace the field lines.",
  },
  {
    q: "What does a magnetic field let a magnet do?",
    a: "Push or pull without touching",
    w: ["Make electricity from nothing", "Pull on plastic and wood", "Change its own mass"],
    hint: "Does a magnet need to touch a paper clip to move it?",
    explain: "The field fills the space around the magnet, so it exerts forces at a distance.",
  },
  {
    q: "Why does a compass point north on Earth?",
    a: "Earth has a magnetic field like a giant magnet",
    w: ["The North Pole is very cold", "Gravity pulls the needle", "The Sun pulls the needle"],
    hint: "A compass needle lines up with any magnetic field.",
    explain: "Earth's core makes a magnetic field. The compass needle lines up with it.",
  },
  {
    q: "What happens to the field as you move away from the magnet?",
    a: "It gets weaker",
    w: ["It gets stronger", "It stays the same", "It turns into an electric field"],
    hint: "Look at the spacing of the lines far away.",
    explain: "Far from the magnet the field lines spread out, so the field is weaker.",
  },
  {
    q: "Iron filings sprinkled around a magnet will…",
    a: "Line up along the field lines",
    w: ["Spread out evenly", "Float in the air", "All jump to the middle of the magnet"],
    hint: "Each filing acts like a tiny compass.",
    explain: "Each filing becomes a tiny magnet and lines up with the field, showing its pattern.",
  },
  {
    q: "Where are the field lines closest together?",
    a: "At the poles",
    w: ["Halfway between the poles", "Far away", "They're evenly spaced"],
    hint: "Look at the ends of the magnet.",
    explain: "The lines crowd together at the poles, where the field is strongest.",
  },
];

/** MS-PS2-5 — magnetic fields. */
export function fieldLines(): Question {
  const i = rand(0, FIELD.length - 1);
  const m = pick(["NS", "SN"] as const);
  const compass = rand(0, 1) === 1;
  return concept("fl", FIELD, i, { kind: "phys-magnets", scene: "field", magnet: m, compass }, `-${m}-${compass ? 1 : 0}`);
}

const STRONGER = ["Wrap more coils of wire", "Use more cells (more current)", "Put an iron nail inside the coil"];
const NOT_STRONGER = ["Use a plastic straw as the core", "Use fewer coils", "Turn the battery around", "Use a longer wooden core", "Paint the wire red"];

/** MS-PS2-3 — what makes an electromagnet stronger. */
export function electromagnetStrength(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const s = rand(0, 2);
    const w = pickN(NOT_STRONGER.map((_, i) => i), 3);
    return {
      key: `es0-${s}-${[...w].sort().join("")}`,
      prompt: "Which change makes an electromagnet STRONGER?",
      speech: "Which change makes an electromagnet stronger?",
      visual: NONE,
      ...opts(STRONGER[s], w.map((i) => NOT_STRONGER[i])),
      hint: "Three things help: more current, more coils, and an iron core.",
      explain: `${STRONGER[s]}. More current, more turns of wire and an iron core all make the magnetic field stronger.`,
    };
  }
  if (kind === 1) {
    const c = rand(1, 5);
    const byCells = rand(0, 1) === 0;
    const xs = byCells ? [1, 2, 3] : [10, 20, 30];
    const ask = byCells ? 4 : 40;
    return {
      key: `es1-${c}-${byCells ? "c" : "t"}`,
      prompt: `Flare tests an electromagnet. How many clips would ${byCells ? "4 cells" : "40 coils"} pick up?`,
      speech: `Flare tests an electromagnet. ${xs.map((x, i) => `${x} ${byCells ? "cells" : "coils"}: ${c * (i + 1)} clips`).join(". ")}. How many clips would ${ask} ${byCells ? "cells" : "coils"} pick up?`,
      visual: { kind: "table", header: [byCells ? "Cells" : "Coils", "Clips picked up"], rows: [...xs.map((x, i) => [x, c * (i + 1)]), [ask, "?"]] },
      needsVisual: true,
      ...kp(4 * c),
      unit: "clips",
      hint: "Look for the pattern: how many more clips for each step?",
      explain: `Each step adds ${c} clips, so ${ask} ${byCells ? "cells" : "coils"} pick up ${4 * c}. More ${byCells ? "current" : "coils"}, stronger magnet.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Flare turns the battery around in an electromagnet. What changes?",
      a: "The N and S poles swap ends",
      w: ["It gets twice as strong", "It stops working", "It becomes a permanent magnet"],
      hint: "The current now flows the other way around the coil.",
      explain: "Reversing the current reverses the field, so the poles swap. The strength stays about the same.",
    },
    {
      q: "Flare opens the switch on an electromagnet. What happens?",
      a: "It stops being a magnet",
      w: ["It gets stronger", "Its poles swap", "It stays just as strong"],
      hint: "An electromagnet needs a current.",
      explain: "No current, no magnetic field: the clips drop off. That's why cranes use electromagnets to drop scrap.",
    },
    {
      q: "To test if more coils make a stronger electromagnet fairly, Flare should…",
      a: "Change only the coils; keep cells and core the same",
      w: ["Change the coils and the cells together", "Use a different nail each time", "Test it only once"],
      hint: "A fair test changes one thing at a time.",
      explain: "Only the number of coils changes, so any change in clips picked up must come from the coils.",
    },
    {
      q: "Why is the core of an electromagnet made of iron?",
      a: "Iron becomes magnetized and makes the field stronger",
      w: ["Iron is cheap", "Iron makes the current smaller", "Iron stops the wire getting hot"],
      hint: "Iron is a magnetic material.",
      explain: "The coil magnetizes the iron, which adds its own field, so the electromagnet is much stronger.",
    },
  ];
  return concept("es2", pool, rand(0, pool.length - 1));
}

/** MS-PS2-3 — build a circuit to switch an electromagnet on. */
export function electromagnetCircuitAct(): Question {
  const cells = rand(1, 3);
  if (rand(0, 1) === 0) {
    const topGap = rand(0, 1) === 0;
    const useSwitch = rand(0, 1) === 0;
    const pos = rand(0, 2);
    const bottom: Extract<Activity, { kind: "phys-buildCircuit" }>["top"] = [{ part: "resistor", name: "coil" }, { part: "bulb", name: "A" }];
    bottom.splice(pos, 0, useSwitch ? { part: "switch", closed: false } : { part: "gap" });
    const top: Extract<Activity, { kind: "phys-buildCircuit" }>["top"] = topGap ? [{ part: "cell", cells }, { part: "gap" }] : [{ part: "cell", cells }];
    return {
      key: `ec0-${cells}-${topGap ? 1 : 0}-${useSwitch ? 1 : 0}-${pos}`,
      prompt: "Switch the electromagnet on: complete the circuit so current flows through the coil. Lamp A lights when it works.",
      speech: "Switch the electromagnet on. Complete the circuit so current flows through the coil. Lamp A lights up when it works.",
      visual: NONE,
      ...act({ kind: "phys-buildCircuit", top, bottom, lit: ["A"] }, cells),
      hint: "Current needs a complete loop with no gaps. Fill every gap and close every switch.",
      explain: "With the loop complete, current flows through the coil, which makes a magnetic field: the electromagnet is on.",
    };
  }
  const gapInCoil = rand(0, 1) === 0;
  const bClosed = rand(0, 1) === 0;
  const coilRow: Extract<Activity, { kind: "phys-buildCircuit" }>["top"] = [{ part: "resistor", name: "coil" }, { part: "bulb", name: "A" }];
  coilRow.splice(rand(0, 2), 0, gapInCoil ? { part: "gap" } : { part: "switch", closed: false });
  const other: Extract<Activity, { kind: "phys-buildCircuit" }>["top"] = [{ part: "bulb", name: "B" }, { part: "switch", closed: bClosed }];
  const coilFirst = rand(0, 1) === 0;
  const branches = coilFirst ? [coilRow, other] : [other, coilRow];
  return {
    key: `ec1-${cells}-${coilRow.map((p) => p.part[0]).join("")}-${bClosed ? 1 : 0}-${coilFirst ? 1 : 0}`,
    prompt: "Turn on the electromagnet (the coil branch with lamp A) but keep lamp B off.",
    speech: "Turn on the electromagnet, in the branch with the coil and lamp A, but keep lamp B off.",
    visual: NONE,
    ...act({ kind: "phys-buildCircuit", top: [{ part: "cell", cells }], branches, lit: ["A"] }, cells),
    hint: "Each branch is its own path. Complete the coil's branch and break lamp B's branch.",
    explain: "Current flows through the closed coil branch, so the electromagnet works; B's branch is open, so B stays dark.",
  };
}

/** MS-PS2-3 — plot electromagnet data. */
export function plotElectromagnetAct(): Question {
  const k = rand(1, 3);
  const byCells = rand(0, 1) === 0;
  const maxX = Math.min(5, Math.floor(10 / k));
  const xs = pickN(Array.from({ length: maxX }, (_, i) => i + 1), 3).sort((a, b) => a - b);
  const points = xs.map((x, i) => ({ x, y: k * x, label: "ABC"[i] }));
  const what = byCells ? "Cells" : "Coils (×10)";
  return {
    key: `pe-${k}-${byCells ? "c" : "t"}-${xs.join("")}`,
    prompt: `Plot Flare's electromagnet data: x = ${byCells ? "number of cells" : "coils (in tens)"}, y = paper clips picked up.`,
    speech: `Plot Flare's electromagnet data. Across: ${byCells ? "number of cells" : "number of coils, in tens"}. Up: paper clips picked up.`,
    visual: { kind: "table", header: [what, "Clips"], rows: points.map((p) => [p.x, p.y]) },
    needsVisual: true,
    ...act({ kind: "plotPoints", points, size: 10, quadrants: 1 }, k),
    hint: "Find the x value along the bottom, then go up to the y value.",
    explain: `The points line up in a straight line: every extra ${byCells ? "cell" : "10 coils"} picks up ${k} more clip${k > 1 ? "s" : ""}. ${byCells ? "More current" : "More coils"} make a stronger electromagnet.`,
  };
}

/** MS-PS2-3, MS-PS2-5 — static charges. */
export function staticCharges(): Question {
  const a = pick(["+", "−"] as const);
  const b = pick(["+", "−"] as const);
  const attract = a !== b;
  const kind = rand(0, 2);
  if (kind === 0)
    return {
      key: `sc0-${a}${b}`,
      prompt: "Will these two charges attract or repel?",
      speech: `One charge is ${a === "+" ? "positive" : "negative"} and the other is ${b === "+" ? "positive" : "negative"}. Will they attract or repel?`,
      visual: { kind: "phys-magnets", scene: "charges", charges: [{ sign: a, x: -2, y: 0 }, { sign: b, x: 2, y: 0 }] },
      needsVisual: true,
      ...opts(attract ? "Attract" : "Repel", ["Attract", "Repel", "No force"], 3),
      hint: "Like charges repel; opposite charges attract.",
      explain: `${a} and ${b} are ${attract ? "opposite, so they attract" : "alike, so they repel"}.`,
    };
  if (kind === 1) {
    const big = rand(2, 3);
    return {
      key: `sc1-${a}${b}-${big}`,
      prompt: `The left charge is made ${big} times bigger. What happens to the force between them?`,
      speech: `The left charge is made ${big} times bigger. What happens to the force between them?`,
      visual: { kind: "phys-magnets", scene: "charges", charges: [{ sign: a, x: -2, y: 0, q: big }, { sign: b, x: 2, y: 0 }], forces: true },
      ...opts("It gets stronger", ["It gets stronger", "It gets weaker", "It stays the same", "It changes direction"]),
      hint: "More charge means a bigger electric force.",
      explain: `More charge makes a stronger electric force (here ${big} times stronger). They still ${attract ? "attract" : "repel"}.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "You rub a balloon on your hair. Electrons move onto the balloon. What happens when you hold it near your hair?",
      a: "Hair and balloon attract",
      w: ["They repel", "Nothing happens", "The balloon floats away"],
      hint: "The balloon is now − and your hair is +.",
      explain: "The balloon gained electrons (−) and your hair lost them (+). Opposite charges attract.",
    },
    {
      q: "Two balloons are both rubbed on hair. What happens when they hang side by side?",
      a: "They push apart",
      w: ["They pull together", "They stick to each other", "Nothing happens"],
      hint: "Both balloons have the same kind of charge.",
      explain: "Both picked up extra electrons (−). Like charges repel, so they push apart.",
    },
    {
      q: "Why do you sometimes get a shock from a door handle after walking on carpet?",
      a: "Charge built up on you jumps to the metal",
      w: ["The handle is plugged in", "The carpet is magnetic", "Gravity pulls the charge down"],
      hint: "Rubbing shoes on carpet moves electrons.",
      explain: "Walking on carpet builds up static charge on you. It jumps to the metal handle as a tiny spark.",
    },
    {
      q: "When things get charged by rubbing, what moves?",
      a: "Electrons",
      w: ["Protons", "Whole atoms", "Magnetic poles"],
      hint: "The tiny negative particles move easily.",
      explain: "Rubbing moves electrons from one object to the other. The one that gains them becomes negative.",
    },
  ];
  return concept("sc2", pool, rand(0, pool.length - 1), { kind: "phys-magnets", scene: "charges", charges: [{ sign: a, x: -2, y: 0 }, { sign: b, x: 2, y: 0 }], lines: true }, `-${a}${b}`);
}

/** MS-PS2-3 — what changes the size of electric and magnetic forces. */
export function forceFactors(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const elec = rand(0, 1) === 0;
    const start = rand(6, 10) * 2;
    const fs = [start, Math.round(start / 2.5), Math.round(start / 6)];
    const ds0 = [1, 2, 3].map((d) => d * rand(1, 2));
    const dsx = [ds0[0], ds0[0] * 2, ds0[0] * 3];
    return {
      key: `ff0-${elec ? "e" : "m"}-${start}-${dsx[0]}`,
      prompt: `Flare measured the ${elec ? "electric force between two charged balloons" : "pull of a magnet on a steel ball"}. What does the data show?`,
      speech: `Flare measured the ${elec ? "electric force between two charged balloons" : "pull of a magnet on a steel ball"} at different distances. What does the data show?`,
      visual: { kind: "table", header: ["Distance (cm)", "Force (mN)"], rows: dsx.map((d, i) => [d, fs[i]]) },
      needsVisual: true,
      ...opts("Farther apart, weaker force", ["Farther apart, stronger force", "Distance doesn't matter", "The force grows and then shrinks"]),
      hint: "As the distance gets bigger, does the force go up or down?",
      explain: `The force drops from ${fs[0]} to ${fs[2]} mN as the distance grows from ${dsx[0]} to ${dsx[2]} cm: ${elec ? "electric" : "magnetic"} forces get weaker with distance.`,
    };
  }
  if (kind === 1) {
    const qs = shuffle([1, 2, 3]);
    const dists = shuffle([2, 4, 6]);
    const strength = qs.map((q, i) => q / (dists[i] * dists[i]));
    const best = strength.indexOf(Math.max(...strength));
    const names = ["A", "B", "C"];
    return {
      key: `ff1-${qs.join("")}-${dists.join("")}`,
      prompt: "Three pairs of charged balls. Which pair has the strongest electric force?",
      speech: `Three pairs of charged balls. ${names.map((n, i) => `Pair ${n}: charge ${qs[i]}, ${dists[i]} centimeters apart`).join(". ")}. Which pair has the strongest force?`,
      visual: { kind: "table", header: ["Pair", "Charge on each", "Distance (cm)"], rows: names.map((n, i) => [n, `${qs[i]} units`, dists[i]]) },
      needsVisual: true,
      ...opts(`Pair ${names[best]}`, names.map((n) => `Pair ${n}`), 3),
      hint: "More charge makes a bigger force; more distance makes a smaller force. Distance matters a lot.",
      explain: `Pair ${names[best]} has ${qs[best] === 3 ? "the most charge" : "big enough charge"} ${dists[best] === 2 ? "and is closest" : `at ${dists[best]} cm`}, giving the strongest force. Bigger charges and smaller distances make stronger electric forces.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Which change makes the electric force between two charged balloons BIGGER?",
      a: "Move them closer together",
      w: ["Move them farther apart", "Paint them a new colour", "Let the charge leak away"],
      hint: "Distance and amount of charge both matter.",
      explain: "Closer charges push or pull harder. Adding more charge also helps.",
    },
    {
      q: "Which makes a magnet's pull on a paper clip weaker?",
      a: "Moving the clip farther away",
      w: ["Moving the clip closer", "Using a stronger magnet", "Using two magnets"],
      hint: "How does distance change magnetic forces?",
      explain: "Magnetic forces get weaker with distance.",
    },
    {
      q: "What decides the strength of an electromagnet's force?",
      a: "The current and the number of coils",
      w: ["The colour of the wire", "The length of the battery", "The weight of the table"],
      hint: "Think about the electromagnet tests.",
      explain: "More current and more coils make a stronger magnetic field and bigger forces.",
    },
  ];
  return concept("ff2", pool, rand(0, pool.length - 1), {
    kind: "phys-magnets",
    scene: "charges",
    charges: [{ sign: "+", x: -2, y: 0 }, { sign: "−", x: 2, y: 0 }],
    forces: true,
    distance: "d",
    unit: "cm",
  });
}

/** MS-PS2-4 — gravity depends on the masses. */
export function gravityMass(): Question {
  const pool: Concept[] = [
    {
      q: "Earth pulls you down. How hard do you pull on Earth?",
      a: "Just as hard",
      w: ["Not at all", "Much less", "Much more"],
      hint: "Gravity forces come in third-law pairs too.",
      explain: "You pull Earth with the same size force. Earth's huge mass means its motion barely changes.",
    },
    {
      q: "Why don't you feel pulled toward your desk?",
      a: "Its mass is small, so its gravity is very weak",
      w: ["Desks have no gravity", "Gravity only works on planets", "The floor blocks it"],
      hint: "Gravity depends on the masses.",
      explain: "Everything with mass attracts, but small masses make tiny forces that are far too weak to notice.",
    },
    {
      q: "What happens to the gravity pull between two objects when one mass doubles?",
      a: "It doubles",
      w: ["It halves", "It stays the same", "It becomes 4 times smaller"],
      hint: "More mass, more gravity.",
      explain: "Gravity is proportional to each mass, so doubling one mass doubles the force.",
    },
    {
      q: "Gravity between two objects gets weaker when they…",
      a: "Move farther apart",
      w: ["Move closer together", "Get more mass", "Touch"],
      hint: "Gravity depends on mass and distance.",
      explain: "Gravity gets weaker with distance.",
    },
    {
      q: "Why is your weight smaller on the Moon?",
      a: "The Moon has much less mass than Earth",
      w: ["There's no air on the Moon", "The Moon is colder", "Your mass gets smaller"],
      hint: "What does the strength of gravity depend on?",
      explain: "The Moon has less mass, so it pulls on you with less force. Your mass doesn't change.",
    },
    {
      q: "Which pulls harder on a spacecraft at the same distance: Earth or the Moon?",
      a: "Earth",
      w: ["The Moon", "Both the same", "Neither"],
      hint: "Which has more mass?",
      explain: "Earth has about 80 times the Moon's mass, so at the same distance it pulls much harder.",
    },
  ];
  const i = rand(0, pool.length - 1);
  const s1 = pick([0.8, 1, 1.4, 1.8]);
  const s2 = pick([0.6, 0.8, 1]);
  return concept(
    "gm",
    pool,
    i,
    { kind: "phys-orbit", scene: "pair", masses: [{ size: s1, label: "m₁" }, { size: s2, label: "m₂" }], distance: "r", forceLabels: ["F", "F"] },
    `-${s1}-${s2}`,
  );
}

const PLANETS = [
  { name: "Earth", g: 9.8 },
  { name: "the Moon", g: 1.6 },
  { name: "Mars", g: 3.7 },
  { name: "Jupiter", g: 24.8 },
];

/** MS-PS2-4 — weight = mass × gravity strength. */
export function weightOnPlanets(): Question {
  const p = pick(PLANETS);
  const m = pick([10, 20, 25, 30, 40, 50, 60]);
  const kind = rand(0, 2);
  if (kind === 0)
    return {
      key: `wp0-${p.name}-${m}`,
      prompt: `Gravity on ${p.name} is ${p.g} N per kg. What does a ${m} kg rover weigh there?`,
      speech: `Gravity on ${p.name} is ${p.g} newtons per kilogram. What does a ${m} kilogram rover weigh there?`,
      visual: { kind: "phys-forces", object: "box", objectLabel: m, surface: "floor", forces: [{ dir: 270, size: 4, label: "W = ?" }] },
      ...kp(m * p.g),
      unit: "N",
      hint: "Weight = mass × gravity strength.",
      explain: `W = ${m} × ${p.g} = ${ds(m * p.g)} N.`,
    };
  if (kind === 1) {
    const q = PLANETS.filter((x) => x.name !== "Earth" && x.name !== p.name)[0] ?? PLANETS[1];
    return {
      key: `wp1-${p.name}-${q.name}-${m}`,
      prompt: `An astronaut's mass is ${m + 20} kg on Earth. What is her mass on ${q.name}?`,
      speech: `An astronaut's mass is ${m + 20} kilograms on Earth. What is her mass on ${q.name}?`,
      visual: NONE,
      ...kp(m + 20),
      unit: "kg",
      hint: "Mass is the amount of stuff. Does it change when you travel?",
      explain: `Mass stays ${m + 20} kg everywhere. Only weight (the pull of gravity) changes: on ${q.name} it's ${m + 20} × ${q.g} = ${ds((m + 20) * q.g)} N.`,
    };
  }
  return {
    key: `wp2-${m}`,
    prompt: `A dog weighs ${ds(m * 9.8)} N on Earth (9.8 N per kg). What is its mass?`,
    speech: `A dog weighs ${ds(m * 9.8)} newtons on Earth, where gravity is 9.8 newtons per kilogram. What is its mass?`,
    visual: NONE,
    ...kp(m),
    unit: "kg",
    hint: "Mass = weight ÷ gravity strength.",
    explain: `m = ${ds(m * 9.8)} ÷ 9.8 = ${m} kg.`,
  };
}

/** MS-PS2-4 — launch a ball on Earth or on the Moon. */
export function moonLaunchAct(): Question {
  const moon = rand(0, 1) === 0;
  const g = moon ? 1.6 : 9.8;
  const s = moon ? rand(3, 8) : rand(6, 14);
  const target = Math.round(launchDistance(s, 45, g));
  const range = moon ? { min: 1, max: 8, step: 1 } : { min: 4, max: 16, step: 1 };
  const width = moon ? 45 : 30;
  const earthD = launchDistance(s, 45, 9.8);
  return {
    key: `ml-${moon ? "m" : "e"}-${s}`,
    prompt: `On ${moon ? "the Moon" : "Earth"}, gravity is ${g} N per kg. Set the launch speed (at 45°) to land on the target ${target} m away.`,
    speech: `On ${moon ? "the Moon" : "Earth"}, gravity is ${g} newtons per kilogram. Set the launch speed, at 45 degrees, to land on the target ${target} meters away.`,
    visual: NONE,
    ...act({ kind: "phys-launch", g, angle: 45, speed: range, target, tolerance: 0.6, width, launcher: "hand" }, s),
    hint: "Try a speed, watch where it lands, then adjust: faster goes farther.",
    explain: moon
      ? `${s} m/s lands about ${target} m away. The Moon's weak gravity (less mass) lets the same throw go about 6 times farther than on Earth, where it would land only ${ds(Math.round(earthD * 10) / 10)} m away.`
      : `${s} m/s lands about ${target} m away. Gravity pulls the ball down the whole time, curving its path.`,
  };
}

const CONTACT = ["Friction on a sled", "Kicking a ball", "Air resistance on a parachute", "A rope pulling a wagon", "A table holding up a cup", "Water holding up a boat"];
const AT_DISTANCE = ["A magnet pulling a nail", "Earth pulling an apple down", "A charged balloon lifting hair", "The Sun pulling on Earth", "An electromagnet lifting scrap", "A charged comb picking up paper"];

/** MS-PS2-5 — sort contact forces and forces at a distance. */
export function sortForcesAct(): Question {
  const n0 = rand(3, 4);
  const { items, key } = sortItems([CONTACT, AT_DISTANCE], [n0, 7 - n0]);
  return {
    key: `sf-${key}`,
    prompt: "Sort the forces: contact force, or force at a distance (through a field)?",
    speech: "Sort the forces. Is each one a contact force, or a force that acts at a distance through a field?",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Contact force", "At a distance (field)"], items }, n0),
    hint: "Do the objects have to touch? Magnetic, electric and gravity forces work through fields.",
    explain: "Gravity, magnetic and electric forces act through fields, without touching. Pushes, friction, drag and support forces need contact.",
  };
}

/* ================================================================ World 4: energy */

/** MS-PS3-1 — kinetic energy grows with mass and (even more) with speed. */
export function keFactors(): Question {
  const kind = rand(0, 2);
  const k = rand(2, 3);
  if (kind === 0) {
    const what = pick(["mass", "speed", "both"] as const);
    const factor = what === "mass" ? k : what === "speed" ? k * k : k * k * k;
    const words = (n: number) => `${n} times as much`;
    const desc = what === "both" ? `${k} times the mass AND ${k} times the speed` : `${k} times the ${what} (everything else the same)`;
    return {
      key: `kf0-${what}-${k}`,
      prompt: `Object B has ${desc} of object A. How much kinetic energy does B have?`,
      speech: `Object B has ${desc} of object A. How much kinetic energy does B have?`,
      visual: NONE,
      ...opts(words(factor), [words(k), words(k * k), words(2 * k), words(k * k * k), "The same"].filter((x) => x !== words(factor))),
      hint: "KE = ½ m v². Mass counts once; speed counts twice (it's squared).",
      explain:
        what === "mass"
          ? `KE is proportional to mass: ${k} times the mass gives ${k} times the KE.`
          : what === "speed"
            ? `KE is proportional to speed squared: ${k}² = ${k * k} times the KE.`
            : `Mass gives × ${k} and speed gives × ${k * k}: ${k} × ${k * k} = ${factor} times the KE.`,
    };
  }
  if (kind === 1) {
    const E = rand(1, 9) * 10;
    const speed = rand(0, 1) === 0;
    return {
      key: `kf1-${speed ? "v" : "m"}-${k}-${E}`,
      prompt: `A bike has ${E} J of kinetic energy. Its ${speed ? "speed" : "mass (with a passenger)"} becomes ${k} times bigger. New KE?`,
      speech: `A bike has ${E} joules of kinetic energy. Its ${speed ? "speed" : "mass, with a passenger,"} becomes ${k} times bigger. What is its new kinetic energy?`,
      visual: NONE,
      ...kp(E * (speed ? k * k : k)),
      unit: "J",
      hint: speed ? "Speed is squared in KE = ½ m v²." : "KE is proportional to mass.",
      explain: speed ? `${k} times the speed gives ${k}² = ${k * k} times the KE: ${E} × ${k * k} = ${E * k * k} J.` : `${k} times the mass gives ${k} times the KE: ${E} × ${k} = ${E * k} J.`,
    };
  }
  const m = rand(1, 5) * 2;
  const v = rand(1, 4);
  const doubleMass = { m: 2 * m, v };
  const doubleSpeed = { m, v: 2 * v };
  const aFirst = rand(0, 1) === 0;
  const [A, B] = aFirst ? [doubleMass, doubleSpeed] : [doubleSpeed, doubleMass];
  const ke = (o: { m: number; v: number }) => (o.m * o.v * o.v) / 2;
  return {
    key: `kf2-${m}-${v}-${aFirst ? 1 : 0}`,
    prompt: "Which cart has more kinetic energy?",
    speech: `Cart A: ${A.m} kilograms at ${A.v} meters per second. Cart B: ${B.m} kilograms at ${B.v} meters per second. Which has more kinetic energy?`,
    visual: { kind: "table", header: ["Cart", "Mass (kg)", "Speed (m/s)"], rows: [["A", A.m, A.v], ["B", B.m, B.v]] },
    needsVisual: true,
    ...opts(ke(A) > ke(B) ? "Cart A" : "Cart B", ["Cart A", "Cart B", "They're equal"], 3),
    hint: "Work out ½ m v² for each. Doubling speed beats doubling mass.",
    explain: `A: ½ × ${A.m} × ${A.v}² = ${ke(A)} J. B: ½ × ${B.m} × ${B.v}² = ${ke(B)} J. The faster cart wins because speed is squared.`,
  };
}

const KE_OBJECTS = [
  { name: "cart", ms: [2, 4, 6, 8, 10], vs: [1, 2, 3, 4, 5] },
  { name: "bowling ball", ms: [4, 6, 8], vs: [2, 3, 4, 5, 6] },
  { name: "skateboarder", ms: [40, 50, 60], vs: [1, 2, 3, 4, 5, 6] },
  { name: "cyclist and bike", ms: [80, 90, 100], vs: [2, 4, 5, 6, 8] },
  { name: "car", ms: [1000, 1200, 1500], vs: [5, 10, 15, 20] },
];

/** MS-PS3-1 — calculate kinetic energy. */
export function keCalc(): Question {
  const o = pick(KE_OBJECTS);
  const m = pick(o.ms);
  const v = pick(o.vs);
  const KE = (m * v * v) / 2;
  const kind = rand(0, 2);
  if (kind === 0)
    return {
      key: `kc0-${o.name}-${m}-${v}`,
      prompt: `A ${m} kg ${o.name} moves at ${v} m/s. What is its kinetic energy?`,
      speech: `A ${m} kilogram ${o.name} moves at ${v} meters per second. What is its kinetic energy?`,
      visual: NONE,
      ...kp(KE),
      unit: "J",
      hint: "KE = ½ × m × v². Square the speed first.",
      explain: `KE = ½ × ${m} × ${v}² = ½ × ${m} × ${v * v} = ${KE} J.`,
    };
  if (kind === 1)
    return {
      key: `kc1-${o.name}-${m}-${v}`,
      prompt: `A ${o.name} moving at ${v} m/s has ${KE} J of kinetic energy. What is its mass?`,
      speech: `A ${o.name} moving at ${v} meters per second has ${KE} joules of kinetic energy. What is its mass?`,
      visual: NONE,
      ...kp(m),
      unit: "kg",
      hint: "m = 2 × KE ÷ v².",
      explain: `m = 2 × ${KE} ÷ ${v * v} = ${m} kg.`,
    };
  return {
    key: `kc2-${o.name}-${m}-${v}`,
    prompt: `A ${m} kg ${o.name} has ${KE} J of kinetic energy. How fast is it going?`,
    speech: `A ${m} kilogram ${o.name} has ${KE} joules of kinetic energy. How fast is it going?`,
    visual: NONE,
    ...kp(v),
    unit: "m/s",
    hint: "v² = 2 × KE ÷ m. Then take the square root.",
    explain: `v² = 2 × ${KE} ÷ ${m} = ${v * v}, so v = ${v} m/s.`,
  };
}

/** MS-PS3-1 — the kinetic energy–speed graph. */
export function keGraph(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const pairs: [number, number][] = [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 4], [2, 6], [3, 6]];
    const [a, b] = pick(pairs);
    return {
      key: `kg0-${a}-${b}`,
      prompt: `KE (J) against speed (m/s) for a 2 kg ball. At ${a} m/s its KE is ${a * a} J. What is its KE at ${b} m/s?`,
      speech: `The graph shows kinetic energy against speed for a 2 kilogram ball. At ${a} meters per second its kinetic energy is ${a * a} joules. What is it at ${b} meters per second?`,
      visual: { kind: "plot", x: [0, 6], y: [0, 40], curves: [{ fn: (x) => x * x, colour: "tangerine" }], points: [{ x: a, y: a * a, label: `${a * a} J` }, { x: b, y: b * b, label: "?" }] },
      ...kp(b * b),
      unit: "J",
      hint: `The speed is ${b / a} times bigger. KE grows with speed squared.`,
      explain: `${b / a} times the speed gives ${(b / a) ** 2} times the KE: ${a * a} × ${(b / a) ** 2} = ${b * b} J. (Check: ½ × 2 × ${b}² = ${b * b} J.)`,
    };
  }
  if (kind === 1) {
    const m = pick([2, 4]);
    return {
      key: `kg1-${m}`,
      prompt: `KE (J) against speed (m/s) for a ${m} kg cart. Why does the graph curve upward?`,
      speech: `The graph shows kinetic energy against speed for a ${m} kilogram cart. Why does the graph curve upward?`,
      visual: { kind: "plot", x: [0, 4], y: [0, 40], curves: [{ fn: (x) => (m * x * x) / 2, colour: "tangerine" }] },
      ...opts("KE depends on speed squared", ["The cart gets heavier", "KE goes up by the same amount each step", "Friction adds energy"]),
      hint: "Look at KE = ½ m v².",
      explain: "KE = ½ m v². Because speed is squared, each extra m/s adds more KE than the last, so the line bends upward.",
    };
  }
  const m = pick([1, 2]);
  const v = rand(1, 4);
  return {
    key: `kg2-${m}-${v}`,
    prompt: `KE against speed for a ${m} kg and a ${2 * m} kg cart. At ${v} m/s, how does the ${2 * m} kg cart's KE compare?`,
    speech: `The graph shows kinetic energy against speed for a ${m} kilogram and a ${2 * m} kilogram cart. At ${v} meters per second, how does the heavier cart's kinetic energy compare?`,
    visual: {
      kind: "plot",
      x: [0, 4],
      y: [0, 40],
      curves: [
        { fn: (x) => (m * x * x) / 2, colour: "tangerine", label: `${m} kg` },
        { fn: (x) => m * x * x, colour: "grape", label: `${2 * m} kg` },
      ],
      points: [{ x: v, y: (m * v * v) / 2 }, { x: v, y: m * v * v }],
    },
    ...opts("Twice as much", ["Twice as much", "Four times as much", "The same", "Half as much"]),
    hint: "Same speed, double the mass.",
    explain: `At ${v} m/s: ${ds((m * v * v) / 2)} J and ${m * v * v} J. Double the mass gives double the KE.`,
  };
}

/** MS-PS3-1 — plot kinetic energy data. */
export function plotKEAct(): Question {
  if (rand(0, 2) > 0) {
    const ms = pickN([1, 2, 3, 4, 5], 3).sort((a, b) => a - b);
    const points = ms.map((m, i) => ({ x: m, y: 2 * m, label: "ABC"[i] }));
    return {
      key: `pk-m-${ms.join("")}`,
      prompt: `Carts roll at 2 m/s. Plot their KE: x = mass (kg) for ${ms.join(", ")} kg, y = KE (J).`,
      speech: `Carts all roll at 2 meters per second. Plot their kinetic energy for masses of ${ms.join(", ")} kilograms. Mass goes across, kinetic energy goes up.`,
      visual: NONE,
      ...act({ kind: "plotPoints", points, size: 10, quadrants: 1 }, 2),
      hint: "KE = ½ × m × 2² = 2 × m.",
      explain: `KE = ½ × m × 4 = 2m: ${points.map((p) => `${p.x} kg → ${p.y} J`).join(", ")}. A straight line: KE is proportional to mass.`,
    };
  }
  const vs = pickN([0, 1, 2, 3], 3).sort((a, b) => a - b);
  const points = vs.map((v, i) => ({ x: v, y: v * v, label: "ABC"[i] }));
  return {
    key: `pk-v-${vs.join("")}`,
    prompt: `A 2 kg ball. Plot its KE: x = speed (m/s) for ${vs.join(", ")} m/s, y = KE (J).`,
    speech: `A 2 kilogram ball. Plot its kinetic energy at speeds of ${vs.join(", ")} meters per second. Speed goes across, kinetic energy goes up.`,
    visual: NONE,
    ...act({ kind: "plotPoints", points, size: 10, quadrants: 1 }, 2),
    hint: "KE = ½ × 2 × v² = v².",
    explain: `KE = v²: ${points.map((p) => `${p.x} m/s → ${p.y} J`).join(", ")}. The points curve upward because speed is squared.`,
  };
}

/** MS-PS3-2 — gravitational potential energy. */
export function gpe(): Question {
  const kind = rand(0, 2);
  const h = rand(1, 10);
  if (kind === 0) {
    const W = pick([5, 10, 20, 30, 40, 50]);
    const thing = pick(["box", "backpack", "bucket of sand", "bag of books"]);
    return {
      key: `gp0-${thing}-${W}-${h}`,
      prompt: `You lift a ${W} N ${thing} up ${h} m. How much gravitational potential energy does it gain?`,
      speech: `You lift a ${W} newton ${thing} up ${h} meters. How much gravitational potential energy does it gain?`,
      visual: NONE,
      ...kp(W * h),
      unit: "J",
      hint: "GPE gained = weight × height.",
      explain: `${W} N × ${h} m = ${W * h} J. Lifting against gravity stores energy in the object–Earth system.`,
    };
  }
  if (kind === 1) {
    const m = rand(1, 5);
    return {
      key: `gp1-${m}-${h}`,
      prompt: `A ${m} kg rock sits on a ledge ${h} m up. What is its GPE? (g = 9.8 N/kg)`,
      speech: `A ${m} kilogram rock sits on a ledge ${h} meters up. What is its gravitational potential energy? Use g equals 9.8 newtons per kilogram.`,
      visual: NONE,
      ...kp(m * 9.8 * h),
      unit: "J",
      hint: "GPE = m × g × h.",
      explain: `GPE = ${m} × 9.8 × ${h} = ${ds(m * 9.8 * h)} J.`,
    };
  }
  const W = pick([10, 20, 25, 50]);
  return {
    key: `gp2-${W}-${h}`,
    prompt: `A ${W} N flowerpot has ${W * h} J of GPE. How high is it?`,
    speech: `A ${W} newton flowerpot has ${W * h} joules of gravitational potential energy. How high is it?`,
    visual: NONE,
    ...kp(h),
    unit: "m",
    hint: "Height = GPE ÷ weight.",
    explain: `h = ${W * h} ÷ ${W} = ${h} m.`,
  };
}

/** MS-PS3-2 — potential energy changes when things that interact at a distance move. */
export function peAtDistance(): Question {
  const scene = rand(0, 4);
  const into = rand(0, 1) === 0;
  const up = "It increases";
  const down = "It decreases";
  const all = [up, down, "It stays the same"];
  if (scene === 0) {
    return {
      key: `pd0-${into ? 1 : 0}`,
      prompt: into ? "These magnets attract. You pull them farther apart. What happens to the stored energy?" : "These magnets attract. You let go and they snap together. What happens to the stored energy?",
      speech: into ? "These magnets attract. You pull them farther apart. What happens to the stored potential energy?" : "These magnets attract. You let go and they snap together. What happens to the stored potential energy?",
      visual: { kind: "phys-magnets", scene: "bars", magnets: ["NS", "NS"], arrows: true, gap: "gap" },
      ...opts(into ? up : down, all, 3),
      hint: "Pulling against an attraction stores energy, like lifting against gravity.",
      explain: into ? "You do work against the magnetic pull, so the potential energy goes up." : "The stored energy turns into kinetic energy (and a snap of sound) as they move together, so it goes down.",
    };
  }
  if (scene === 1) {
    return {
      key: `pd1-${into ? 1 : 0}`,
      prompt: into ? "These magnets repel. You push them closer together. What happens to the stored energy?" : "These magnets repel. You let go and they fly apart. What happens to the stored energy?",
      speech: into ? "These magnets repel. You push them closer together. What happens to the stored potential energy?" : "These magnets repel. You let go and they fly apart. What happens to the stored potential energy?",
      visual: { kind: "phys-magnets", scene: "bars", magnets: ["NS", "SN"], arrows: true, gap: "gap" },
      ...opts(into ? up : down, all, 3),
      hint: "Pushing against a repulsion stores energy, like squashing a spring.",
      explain: into ? "You push against the repulsion, so energy is stored: potential energy goes up." : "They speed apart: stored energy becomes kinetic energy, so the potential energy goes down.",
    };
  }
  if (scene === 2) {
    const same = rand(0, 1) === 0;
    const action = same ? "push the two + charges closer" : "pull the + and − charges apart";
    return {
      key: `pd2-${same ? 1 : 0}-${into ? 1 : 0}`,
      prompt: into ? `You ${action}. What happens to the stored electric energy?` : `You let go of the charges. They ${same ? "fly apart" : "rush together"}. What happens to the stored energy?`,
      speech: into ? `You ${action}. What happens to the stored electric potential energy?` : `You let go of the charges and they ${same ? "fly apart" : "rush together"}. What happens to the stored potential energy?`,
      visual: { kind: "phys-magnets", scene: "charges", charges: [{ sign: "+", x: -2, y: 0 }, { sign: same ? "+" : "−", x: 2, y: 0 }], forces: true },
      ...opts(into ? up : down, all, 3),
      hint: "Moving charges against their push or pull stores energy; letting them go releases it.",
      explain: into ? "You work against the electric force, so the electric potential energy goes up." : "The charges speed up: stored energy becomes kinetic energy, so the potential energy goes down.",
    };
  }
  if (scene === 3) {
    const d = pick([0.5, 0.8, 1]);
    return {
      key: `pd3-${d}-${into ? 1 : 0}`,
      prompt: into ? "You stretch this spring even farther. What happens to its stored elastic energy?" : "You let the stretched spring go. As it springs back, what happens to its stored energy?",
      speech: into ? "You stretch this spring even farther. What happens to its stored elastic energy?" : "You let the stretched spring go. As it springs back, what happens to its stored energy?",
      visual: { kind: "phys-oscillator", type: "spring", displacement: d, force: "F" },
      ...opts(into ? up : down, all, 3),
      hint: "A more stretched spring pulls back harder and can do more work.",
      explain: into ? "More stretch stores more elastic potential energy." : "As it springs back, the stored energy becomes kinetic energy of the mass.",
    };
  }
  const h = rand(2, 9);
  return {
    key: `pd4-${h}-${into ? 1 : 0}`,
    prompt: into ? `You carry a ball from the floor to a shelf ${h} m up. What happens to the ball–Earth system's GPE?` : `A ball falls from a shelf ${h} m up. What happens to its GPE as it falls?`,
    speech: into ? `You carry a ball up to a shelf ${h} meters high. What happens to the gravitational potential energy?` : `A ball falls from a shelf ${h} meters high. What happens to its gravitational potential energy as it falls?`,
    visual: { kind: "phys-orbit", scene: "pair", masses: [{ emoji: "🌍", size: 2 }, { emoji: "⚽", size: 0.6 }], distance: into ? "farther" : "closer" },
    ...opts(into ? up : down, all, 3),
    hint: "Moving apart against gravity's pull stores energy.",
    explain: into ? "Lifting pulls the ball and Earth farther apart against gravity, so GPE goes up." : "Gravity pulls them closer; GPE turns into kinetic energy, so GPE goes down.",
  };
}

/** MS-PS3-2, MS-PS3-5 — energy bar charts. */
export function energyBars(): Question {
  const kind = rand(0, 3);
  const E = rand(2, 10) * 10;
  const story = pick(["roller coaster", "skateboarder on a ramp", "swinging pendulum"]);
  const names = ["KE", "GPE", "Thermal"];
  if (kind === 0)
    return {
      key: `eb0-${story}-${E}`,
      prompt: `A ${story} starts at the top, not moving. No friction. How much KE at the bottom?`,
      speech: `A ${story} starts at the top, not moving. There's no friction. At the top it has ${E} joules of gravitational potential energy. How much kinetic energy at the bottom?`,
      visual: { kind: "phys-energy", names, bars: [{ title: "Top", values: [0, E, 0] }, { title: "Bottom", values: ["?", 0, 0] }], max: E, unit: "J" },
      needsVisual: true,
      ...kp(E),
      unit: "J",
      hint: "Energy isn't used up. The total stays the same.",
      explain: `All ${E} J of GPE turns into KE: ${E} J at the bottom.`,
    };
  if (kind === 1) {
    const g = rand(1, E / 10 - 1) * 10;
    return {
      key: `eb1-${story}-${E}-${g}`,
      prompt: `A ${story}, no friction. Partway down, how much KE does it have?`,
      speech: `A ${story} with no friction. At the top it has ${E} joules of potential energy and no kinetic energy. Partway down, it has ${g} joules of potential energy. How much kinetic energy?`,
      visual: { kind: "phys-energy", names, bars: [{ title: "Top", values: [0, E, 0] }, { title: "Partway", values: ["?", g, 0] }], max: E, unit: "J" },
      needsVisual: true,
      ...kp(E - g),
      unit: "J",
      hint: "KE + GPE must add up to the same total as at the top.",
      explain: `Total = ${E} J. KE = ${E} − ${g} = ${E - g} J.`,
    };
  }
  if (kind === 2) {
    const t = rand(1, E / 10 - 1) * 5;
    return {
      key: `eb2-${story}-${E}-${t}`,
      prompt: `A ${story} with friction. At the bottom, some energy has become thermal energy. How much KE is left?`,
      speech: `A ${story} with friction. It starts with ${E} joules of potential energy. At the bottom, ${t} joules have become thermal energy. How much kinetic energy is left?`,
      visual: { kind: "phys-energy", names, bars: [{ title: "Top", values: [0, E, 0] }, { title: "Bottom", values: ["?", 0, t] }], max: E, unit: "J" },
      needsVisual: true,
      ...kp(E - t),
      unit: "J",
      hint: "The total is still the same; some of it is now thermal energy.",
      explain: `${E} J total − ${t} J thermal = ${E - t} J of KE. Friction transferred ${t} J to heat.`,
    };
  }
  return {
    key: `eb3-${E}`,
    prompt: "A ball is thrown straight up. Ignoring air, how much GPE does it have at the very top?",
    speech: `A ball is thrown straight up with ${E} joules of kinetic energy. Ignoring air resistance, how much potential energy does it have at the very top?`,
    visual: { kind: "phys-energy", names: ["KE", "GPE"], bars: [{ title: "Leaving hand", values: [E, 0] }, { title: "Top", values: [0, "?"] }], max: E, unit: "J" },
    needsVisual: true,
    ...kp(E),
    unit: "J",
    hint: "At the top it stops for a moment: KE is 0. Where did the energy go?",
    explain: `All ${E} J of KE has become GPE at the top.`,
  };
}

const KINETIC = ["A rolling bowling ball", "Wind blowing", "A flowing river", "A spinning top", "A falling raindrop", "A running dog"];
const POTENTIAL = ["A stretched rubber band", "A book on a high shelf", "A squashed spring", "Water behind a dam", "A drawn bow", "Two magnets held apart"];

/** MS-PS3-1, MS-PS3-2 — sort kinetic and potential energy. */
export function sortEnergyAct(): Question {
  const n0 = rand(3, 4);
  const { items, key } = sortItems([KINETIC, POTENTIAL], [n0, 7 - n0]);
  return {
    key: `se-${key}`,
    prompt: "Sort: is the main energy kinetic (motion) or potential (stored)?",
    speech: "Sort each one. Is its main energy kinetic, the energy of motion, or potential, stored energy?",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Kinetic (motion)", "Potential (stored)"], items }, n0),
    hint: "Is it moving now? Or is energy stored by its position or shape, ready to be released?",
    explain: "Moving things have kinetic energy. Things that are lifted, stretched, squashed, or held apart from what attracts them store potential energy.",
  };
}

const DEVICES = [
  { emoji: "💡", name: "lamp", useful: "Light", wasted: "Heat (thermal)", chainOut: [{ emoji: "✨", label: "light" }, { emoji: "🔥", label: "heat" }] },
  { emoji: "🔊", name: "speaker", useful: "Sound", wasted: "Heat (thermal)", chainOut: [{ emoji: "🎵", label: "sound" }, { emoji: "🔥", label: "heat" }] },
  { emoji: "🌀", name: "fan", useful: "Motion (kinetic)", wasted: "Heat (thermal)", chainOut: [{ emoji: "💨", label: "motion" }, { emoji: "🔥", label: "heat" }, { emoji: "🎵", label: "sound" }] },
  { emoji: "🫖", name: "electric kettle", useful: "Heat (thermal)", wasted: "Sound", chainOut: [{ emoji: "♨️", label: "heat" }, { emoji: "🎵", label: "sound" }] },
];

/** MS-PS3-5 — energy transfer chains. */
export function energyTransfer(): Question {
  const kind = rand(0, 2);
  const d = pick(DEVICES);
  const chain: Visual = { kind: "phys-energy", chain: [{ emoji: "🔌", label: "outlet" }, { emoji: d.emoji, label: d.name, via: "electric" }, d.chainOut] };
  if (kind === 0)
    return {
      key: `et0-${d.name}`,
      prompt: `Which output of the ${d.name} is the USEFUL one?`,
      speech: `Which energy output of the ${d.name} is the useful one?`,
      visual: chain,
      ...opts(d.useful, ["Light", "Sound", "Motion (kinetic)", "Heat (thermal)"]),
      hint: "What do we buy this device for?",
      explain: `We want the ${d.name} for ${d.useful.toLowerCase()}. The rest (like ${d.wasted.toLowerCase()}) spreads out into the room.`,
    };
  if (kind === 1) {
    const IN = rand(2, 10) * 10;
    const use = rand(1, IN / 10 - 1) * 5;
    return {
      key: `et1-${d.name}-${IN}-${use}`,
      prompt: `Each second the ${d.name} takes in ${IN} J of electric energy and gives out ${use} J of ${d.useful.toLowerCase()}. How many J go to other forms?`,
      speech: `Each second the ${d.name} takes in ${IN} joules of electric energy and gives out ${use} joules of ${d.useful.toLowerCase()}. How many joules go to other forms?`,
      visual: chain,
      ...kp(IN - use),
      unit: "J",
      hint: "Energy in = total energy out. Nothing is destroyed.",
      explain: `${IN} − ${use} = ${IN - use} J, mostly as heat.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "After the lamp runs for an hour, has the energy been used up?",
      a: "No, it was transferred to light and heat",
      w: ["Yes, it's gone", "Yes, it turned into nothing", "It went back into the outlet"],
      hint: "Energy can change form or move, but…",
      explain: "Energy is conserved. It ends up as light and heat that spread into the room.",
    },
    {
      q: "Why do devices always waste some energy?",
      a: "Some always becomes heat that spreads out",
      w: ["Energy gets destroyed", "Electricity is too slow", "The wires store it forever"],
      hint: "Feel a phone charger or a laptop after a while.",
      explain: "Friction and electrical resistance turn some energy into heat, which spreads out and is hard to use again.",
    },
    {
      q: "Where did the energy in food first come from?",
      a: "Light from the Sun",
      w: ["The soil", "Water", "The fridge"],
      hint: "Plants make food in sunlight.",
      explain: "Plants use sunlight to make food (stored chemical energy). Animals eat plants or other animals.",
    },
  ];
  return concept("et2", pool, rand(0, pool.length - 1), chain, `-${d.name}`);
}

/** MS-PS3-5 — when kinetic energy changes, energy is transferred. */
export function keChange(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const m = pick([2, 4, 6, 10]);
    const v1 = rand(3, 8);
    const v2 = rand(0, v1 - 1);
    const k1 = (m * v1 * v1) / 2;
    const k2 = (m * v2 * v2) / 2;
    const thing = pick(["cart", "bike", "sled"]);
    return {
      key: `kh0-${thing}-${m}-${v1}-${v2}`,
      prompt: `A ${m} kg ${thing} slows from ${v1} m/s to ${v2} m/s. How much energy was transferred out of it?`,
      speech: `A ${m} kilogram ${thing} slows from ${v1} meters per second to ${v2} meters per second. How much energy was transferred out of it?`,
      visual: { kind: "phys-energy", names: ["KE"], bars: [{ title: "Before", values: [k1] }, { title: "After", values: [k2] }], max: k1, unit: "J" },
      ...kp(k1 - k2),
      unit: "J",
      hint: "Find the KE before and after with ½ m v², then subtract.",
      explain: `Before: ½ × ${m} × ${v1}² = ${k1} J. After: ½ × ${m} × ${v2}² = ${k2} J. Transferred: ${k1 - k2} J (to heat and sound, through friction).`,
    };
  }
  if (kind === 1) {
    const a = rand(4, 10) * 10;
    const b = rand(1, a / 10 - 2) * 10;
    const loss = rand(1, 2) * 5;
    return {
      key: `kh1-${a}-${b}-${loss}`,
      prompt: `Ball A (${a} J of KE) hits ball B at rest. Afterward A has ${b} J and ${loss} J became sound and heat. How much KE does B get?`,
      speech: `Ball A, with ${a} joules of kinetic energy, hits ball B, which is at rest. Afterward A has ${b} joules, and ${loss} joules became sound and heat. How much kinetic energy does B get?`,
      visual: { kind: "phys-energy", names: ["A", "B", "Sound+heat"], bars: [{ title: "Before", values: [a, 0, 0] }, { title: "After", values: [b, "?", loss] }], max: a, unit: "J" },
      needsVisual: true,
      ...kp(a - b - loss),
      unit: "J",
      hint: "Energy A loses = energy B gains + sound and heat.",
      explain: `A lost ${a} − ${b} = ${a - b} J. ${loss} J became sound and heat, so B got ${a - b - loss} J.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "A bike brakes to a stop. Where does its kinetic energy go?",
      a: "Heat in the brakes and tires (and some sound)",
      w: ["It's destroyed", "It's stored in the brakes as KE", "It goes into the rider's legs"],
      hint: "Touch the brakes after a hard stop.",
      explain: "Friction in the brakes transfers the KE into thermal energy (and a little sound).",
    },
    {
      q: "A ball speeds up as it falls. Where does the extra KE come from?",
      a: "Gravitational potential energy",
      w: ["The air", "Nowhere; it's made from nothing", "The ball's temperature"],
      hint: "It's getting closer to the ground.",
      explain: "As the ball falls, GPE of the ball–Earth system becomes KE.",
    },
    {
      q: "A pitcher throws a ball. Where did the ball's KE come from?",
      a: "Work done by the pitcher's arm",
      w: ["The ball's mass", "Air pushing it", "Gravity"],
      hint: "A force pushed the ball over a distance.",
      explain: "The arm pushed the ball forward over a distance: energy transferred from the pitcher's muscles into the ball.",
    },
    {
      q: "A moving cart hits a still cart. The first slows down and the second speeds up. What happened?",
      a: "Energy transferred from one cart to the other",
      w: ["Energy was created", "Both carts lost energy to the air only", "The second cart made its own energy"],
      hint: "When KE changes, energy goes somewhere.",
      explain: "The first cart's lost KE was transferred to the second cart (with a little to sound and heat).",
    },
  ];
  return concept("kh2", pool, rand(0, pool.length - 1));
}

/* ======================================================= World 5: heat and temperature */

const PARTICLES: Concept[] = [
  {
    q: "The gas is heated. What do its particles do?",
    a: "Move faster",
    w: ["Move slower", "Get bigger", "Stop moving"],
    hint: "Temperature is about particle motion.",
    explain: "Heating gives the particles more kinetic energy, so they move faster and the temperature rises.",
  },
  {
    q: "What does temperature measure?",
    a: "The average motion energy of the particles",
    w: ["The total amount of heat", "How big the particles are", "How heavy the object is"],
    hint: "Think about the particles inside.",
    explain: "Temperature measures the average kinetic energy of the particles.",
  },
  {
    q: "Why does a thermometer's liquid rise when it warms up?",
    a: "Its particles move faster and spread out",
    w: ["The particles get bigger", "Heat is a liquid that fills it", "Cold pushes the liquid down"],
    hint: "Faster particles push each other farther apart.",
    explain: "Warmer particles move faster and take up more room, so the liquid expands up the tube.",
  },
  {
    q: "In a solid, the particles…",
    a: "Vibrate in place",
    w: ["Don't move at all", "Fly around freely", "Slide past each other"],
    hint: "Solids keep their shape.",
    explain: "Particles in a solid are held in place but still vibrate. Hotter means faster vibrations.",
  },
  {
    q: "The gas is cooled. What happens to the piston?",
    a: "It moves down: the gas takes less space",
    w: ["It moves up", "It stays still", "It melts"],
    hint: "Slower particles hit the piston less hard.",
    explain: "Cooling slows the particles; they push less on the piston, so the gas shrinks.",
  },
];

/** MS-PS3-4 — particle motion and temperature. */
export function particleMotion(): Question {
  if (rand(0, 1) === 0) {
    const temps = pickN([5, 15, 25, 40, 60, 80, 95], 3);
    const hot = Math.max(...temps);
    return {
      key: `pmo-${[...temps].sort((a, b) => a - b).join(".")}`,
      prompt: "Three cups of the same water. In which are the water particles moving fastest?",
      speech: `Three cups of water at ${temps.join(", ")} degrees Celsius. In which cup are the particles moving fastest?`,
      visual: { kind: "phys-thermo", scene: "thermometer", min: 0, max: 100, step: 5, labelStep: 20, thermometers: temps.map((t) => ({ temp: t, label: `${t} °C` })) },
      ...opts(`The ${hot} °C cup`, temps.map((t) => `The ${t} °C cup`), 3),
      hint: "Higher temperature means faster particles.",
      explain: `The ${hot} °C water is hottest, so its particles have the most kinetic energy on average.`,
    };
  }
  const i = rand(0, PARTICLES.length - 1);
  const heat = i === 4 ? "out" : "in";
  const vol = pick([0.5, 0.6, 0.7, 0.8]);
  return concept("pmo", PARTICLES, i, { kind: "phys-thermo", scene: "piston", volume: vol, heat, hot: heat === "in" }, `-${vol}`);
}

/** MS-PS3-4 — read thermometers and temperature change. */
export function readThermometers(): Question {
  const t1 = rand(-4, 20) * 2;
  let t2 = rand(-4, 24) * 2;
  while (t2 === t1) t2 = rand(-4, 24) * 2;
  const kind = rand(0, 1);
  if (kind === 0) {
    return {
      key: `rt0-${t1}-${t2}`,
      prompt: "What temperature does the left thermometer show?",
      speech: "What temperature does the left thermometer show? Each small mark is 2 degrees.",
      visual: { kind: "phys-thermo", scene: "thermometer", min: -10, max: 50, step: 2, labelStep: 10, thermometers: [{ temp: t1, reading: "?", label: "A" }, { temp: t2, label: "B" }] },
      needsVisual: true,
      ...(t1 < 0 ? { answer: t1, input: "keypad" as const, keypadExtra: "−" as const } : kp(t1)),
      unit: "°C",
      hint: "Each small mark is 2 °C. Count from the nearest number.",
      explain: `The liquid stops at ${t1 < 0 ? "−" : ""}${Math.abs(t1)} °C.`,
    };
  }
  const warm = t2 > t1;
  return {
    key: `rt1-${t1}-${t2}`,
    prompt: `A drink went from the Start reading to the Later reading. By how many degrees did it ${warm ? "warm up" : "cool down"}?`,
    speech: `A drink went from ${t1} degrees to ${t2} degrees Celsius. By how many degrees did it ${warm ? "warm up" : "cool down"}?`,
    visual: { kind: "phys-thermo", scene: "thermometer", min: -10, max: 50, step: 2, labelStep: 10, thermometers: [{ temp: t1, label: "Start" }, { temp: t2, label: "Later" }] },
    needsVisual: true,
    ...kp(Math.abs(t2 - t1)),
    unit: "°C",
    hint: "Read both thermometers, then find the difference. Careful below 0!",
    explain: `From ${t1} °C to ${t2} °C is a change of ${Math.abs(t2 - t1)} °C.`,
  };
}

const PAIRS_HOT = [
  { a: "☕", an: "cocoa", b: "🧊", bn: "ice cube" },
  { a: "🍳", an: "pan", b: "🥚", bn: "egg" },
  { a: "🫖", an: "teapot", b: "🥛", bn: "milk" },
  { a: "🖐️", an: "hand", b: "🧊", bn: "ice cube" },
  { a: "🍲", an: "soup", b: "🥄", bn: "spoon" },
];

/** MS-PS3-4 — heat flows from hot to cold until temperatures match. */
export function heatFlow(): Question {
  const p = pick(PAIRS_HOT);
  const kind = rand(0, 2);
  if (kind === 0) {
    const ta = rand(5, 9) * 10;
    const tb = rand(0, 3) * 5;
    return {
      key: `hf0-${p.an}-${ta}-${tb}`,
      prompt: `The ${p.an} and the ${p.bn} touch for a long time. What will their final temperature be?`,
      speech: `The ${p.an} at ${ta} degrees and the ${p.bn} at ${tb} degrees touch for a long time. What will their final temperature be?`,
      visual: { kind: "phys-thermo", scene: "flow", a: { emoji: p.a, temp: ta }, b: { emoji: p.b, temp: tb } },
      ...opts(`The same, between ${tb} °C and ${ta} °C`, [`Both reach ${ta} °C`, `Both reach ${tb} °C`, `Hotter than ${ta} °C`, "They never change"]),
      hint: "Heat keeps flowing from hot to cold until…",
      explain: `Heat flows from the ${ta} °C ${p.an} to the ${p.bn} until they're the same temperature, somewhere between ${tb} °C and ${ta} °C.`,
    };
  }
  if (kind === 1) {
    const hot = rand(6, 9) * 10;
    const cold = rand(1, 4) * 10;
    return {
      key: `hf1-${hot}-${cold}`,
      prompt: `Equal amounts of water at ${hot} °C and ${cold} °C are mixed. What is the final temperature (no heat lost)?`,
      speech: `Equal amounts of water at ${hot} degrees and ${cold} degrees Celsius are mixed. With no heat lost, what is the final temperature?`,
      visual: { kind: "phys-thermo", scene: "flow", a: { emoji: "🫗", temp: hot }, b: { emoji: "🥛", temp: cold } },
      ...kp((hot + cold) / 2),
      unit: "°C",
      hint: "The hot water loses as much energy as the cold water gains. Same amount, same material…",
      explain: `Equal masses of water meet halfway: (${hot} + ${cold}) ÷ 2 = ${(hot + cold) / 2} °C.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "You hold an ice cube. Why does your hand feel cold?",
      a: "Heat flows from your hand into the ice",
      w: ["Cold flows from the ice into your hand", "The ice makes cold particles", "Your hand pushes the cold away"],
      hint: "Energy moves one way only: from hot to cold.",
      explain: "There is no 'cold' that flows. Heat leaves your warm hand and goes into the ice, so your hand cools.",
    },
    {
      q: "When does heat stop flowing between two touching objects?",
      a: "When they reach the same temperature",
      w: ["When the cold one is empty", "Never", "When the hot one reaches 0 °C"],
      hint: "Heat flows because of a temperature difference.",
      explain: "Once the temperatures are equal there's no difference to drive heat, so the flow stops (thermal equilibrium).",
    },
    {
      q: "A hot spoon goes into cold water. What happens to the water's particles?",
      a: "They speed up as they gain energy",
      w: ["They slow down", "They stay the same", "They turn into spoon particles"],
      hint: "Heat moves from the spoon into the water.",
      explain: "Fast spoon particles bump water particles, transferring energy: the water warms and the spoon cools.",
    },
  ];
  const ta = rand(6, 9) * 10;
  const tb = rand(0, 2) * 5;
  return concept("hf2", pool, rand(0, pool.length - 1), { kind: "phys-thermo", scene: "flow", a: { emoji: p.a, temp: ta }, b: { emoji: p.b, temp: tb } }, `-${p.an}-${ta}-${tb}`);
}

const TRANSFER: [string, number][] = [
  ["A metal spoon gets hot in soup", 0],
  ["A pan handle heats up on the stove", 0],
  ["Bare feet feel cold on a tile floor", 0],
  ["An iron smooths and warms a shirt", 0],
  ["Your hand melts an ice cube", 0],
  ["Warm air rises from a heater; cool air sinks", 1],
  ["Water circles in a pot as it boils", 1],
  ["A hot air balloon rises", 1],
  ["A sea breeze blows at the beach", 1],
  ["A radiator warms a whole room", 1],
  ["Feeling the Sun's warmth on your face", 2],
  ["Warming your hands near a campfire", 2],
  ["Food kept warm under a heat lamp", 2],
  ["A dark car heats up in sunlight", 2],
  ["Sunlight reaching Earth through space", 2],
];
const TRANSFER_NAMES = ["Conduction", "Convection", "Radiation"];
const TRANSFER_WHY = [
  "Heat passes through touching materials, particle to particle.",
  "A warm fluid (liquid or gas) moves and carries heat with it.",
  "Heat travels as infrared waves; it needs no material and can cross empty space.",
];

/** MS-PS3-3 — conduction, convection and radiation. */
export function heatTransferTypes(): Question {
  const i = rand(0, TRANSFER.length - 1);
  const [text, t] = TRANSFER[i];
  return {
    key: `htt-${i}`,
    prompt: `${text}. How is heat mainly moving?`,
    speech: `${text}. How is heat mainly moving?`,
    visual: NONE,
    ...opts(TRANSFER_NAMES[t], TRANSFER_NAMES, 3),
    hint: "Touching: conduction. A moving liquid or gas: convection. Waves through space or air: radiation.",
    explain: `${TRANSFER_NAMES[t]}. ${TRANSFER_WHY[t]}`,
  };
}

/** MS-PS3-3 — sort heat transfer examples. */
export function sortTransferAct(): Question {
  const pools = [0, 1, 2].map((b) => TRANSFER.filter(([, t]) => t === b).map(([s]) => s));
  const per = shuffle([2, 2, 3]);
  const { items, key } = sortItems(pools, per);
  return {
    key: `stt-${key}`,
    prompt: "Sort each example: conduction, convection or radiation?",
    speech: "Sort each example. Is heat moving by conduction, convection or radiation?",
    visual: NONE,
    ...act({ kind: "sort", bins: TRANSFER_NAMES, items }, per[0]),
    hint: "Touching: conduction. A moving liquid or gas: convection. Waves from a hot source: radiation.",
    explain: "Conduction passes heat through touching materials, convection moves it with a flowing fluid, and radiation carries it as waves.",
  };
}

const CONDUCTORS = ["Metal spoon", "Copper pan", "Aluminum foil", "Iron nail", "Steel pot", "Silver ring"];
const INSULATORS = ["Wool sock", "Foam cup", "Wooden spoon", "Plastic handle", "Cork mat", "Feathers", "Trapped air"];

/** MS-PS3-3 — sort conductors and insulators. */
export function sortInsulatorsAct(): Question {
  const n0 = rand(3, 4);
  const { items, key } = sortItems([CONDUCTORS, INSULATORS], [n0, 7 - n0]);
  return {
    key: `si-${key}`,
    prompt: "Sort the materials: does heat move through it fast (conductor) or slowly (insulator)?",
    speech: "Sort the materials. Does heat move through it fast, a conductor, or slowly, an insulator?",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Conductor (fast)", "Insulator (slow)"], items }, n0),
    hint: "Metals are good conductors. Materials that trap air are good insulators.",
    explain: "Metals pass heat quickly. Wool, foam, wood, plastic, cork and feathers slow heat down, mostly because they trap air.",
  };
}

const CUPS = [
  { name: "Metal can", base: 40 },
  { name: "Paper cup", base: 46 },
  { name: "Glass jar", base: 50 },
  { name: "Foam cup", base: 58 },
  { name: "Foam cup + lid", base: 64 },
  { name: "Vacuum flask", base: 72 },
];

/** MS-PS3-3 — design a container to keep things hot or cold. */
export function designContainer(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const chosen = pickN(CUPS.map((_, i) => i), 3).sort((a, b) => a - b);
    const jit = chosen.map(() => rand(0, 3));
    const hot = rand(0, 1) === 0;
    const rows = chosen.map((c, i) => {
      const keep = CUPS[c].base + jit[i];
      return { name: CUPS[c].name, value: hot ? keep : 80 - keep + 4 - 2 * jit[i] };
    });
    const values = rows.map((r) => r.value);
    const best = hot ? values.indexOf(Math.max(...values)) : values.indexOf(Math.min(...values));
    return {
      key: `dc0-${hot ? "h" : "c"}-${chosen.join("")}-${jit.join("")}`,
      prompt: hot
        ? "Cocoa starts at 80 °C in each container. Temperatures after 30 minutes are shown. Which design keeps it hot best?"
        : "Ice water starts at 0 °C in each container. Temperatures after 3 hours are shown. Which design keeps it cold best?",
      speech: hot
        ? `Cocoa starts at 80 degrees in each container. After 30 minutes: ${rows.map((r) => `${r.name}, ${r.value} degrees`).join("; ")}. Which design keeps it hot best?`
        : `Ice water starts at 0 degrees in each container. After 3 hours: ${rows.map((r) => `${r.name}, ${r.value} degrees`).join("; ")}. Which design keeps it cold best?`,
      visual: { kind: "table", header: ["Design", hot ? "After 30 min (°C)" : "After 3 h (°C)"], rows: rows.map((r) => [r.name, r.value]) },
      needsVisual: true,
      ...opts(rows[best].name, rows.map((r) => r.name), 3),
      hint: hot ? "The best design loses the least heat: its temperature stays highest." : "The best design lets in the least heat: its temperature rises least.",
      explain: `${rows[best].name}: ${hot ? `still ${rows[best].value} °C, the hottest` : `only ${rows[best].value} °C, the coldest`}. It slows heat transfer the most.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Why does a lid help keep cocoa hot?",
      a: "It stops warm air and steam carrying heat away",
      w: ["It adds heat", "It makes the cup heavier", "It reflects cold back"],
      hint: "Rising warm air and steam carry energy.",
      explain: "A lid blocks convection and evaporation from the surface, so less heat escapes.",
    },
    {
      q: "A vacuum flask has a vacuum between two walls. Why does that keep drinks hot?",
      a: "No particles, so no conduction or convection across the gap",
      w: ["Vacuums are very hot", "The vacuum sucks heat back in", "It makes the drink heavier"],
      hint: "Conduction and convection both need particles.",
      explain: "With almost no particles in the gap, heat can't conduct or convect across it. Shiny walls also cut radiation.",
    },
    {
      q: "Why are flask walls often shiny?",
      a: "Shiny surfaces reflect radiated heat back",
      w: ["Shiny metal conducts heat in", "It looks nicer, that's all", "Shiny things are colder"],
      hint: "Think of a mirror and infrared waves.",
      explain: "Shiny surfaces reflect infrared radiation, so heat stays in (or stays out).",
    },
    {
      q: "Why does a puffy jacket keep you warm?",
      a: "It traps air, a poor conductor, so heat leaves slowly",
      w: ["It makes heat", "It stops cold from getting in", "It's heavy"],
      hint: "What's between the feathers or fibres?",
      explain: "Trapped air conducts heat poorly and can't flow (no convection), so your body heat escapes slowly.",
    },
    {
      q: "To compare cups fairly, Flare should keep the SAME…",
      a: "Starting temperature and amount of drink",
      w: ["Cup material", "Lid on some cups only", "Time for just one cup"],
      hint: "Only the thing you're testing should change.",
      explain: "Change only the cup design; keep the amount, the starting temperature and the time the same.",
    },
  ];
  return concept("dc1", pool, rand(0, pool.length - 1));
}

/** MS-PS3-3 — cooling curves for different cups. */
export function coolingCurves(): Question {
  const ks = [0.06, 0.03, 0.012];
  const order = shuffle([0, 1, 2]);
  const names = ["A", "B", "C"];
  const curve = (k: number) => (t: number) => 20 + 60 * Math.exp(-k * t);
  const kind = rand(0, 2);
  const vis: Visual = {
    kind: "plot",
    x: [0, 60],
    y: [0, 100],
    curves: order.map((o, i) => ({ fn: curve(ks[o]), label: names[i], colour: (["berry", "wave", "leaf"] as const)[i] })),
  };
  const fastest = order.indexOf(0);
  const slowest = order.indexOf(2);
  const base = "Temperature (°C) of hot water in cups A, B and C over 60 minutes.";
  if (kind === 0)
    return {
      key: `cc0-${order.join("")}`,
      prompt: `${base} Which cup is the best insulator?`,
      speech: "The graph shows the temperature of hot water in cups A, B and C over 60 minutes. Which cup is the best insulator?",
      visual: vis,
      needsVisual: true,
      ...opts(`Cup ${names[slowest]}`, names.map((n) => `Cup ${n}`), 3),
      hint: "The best insulator lets heat out most slowly: its curve drops least.",
      explain: `Cup ${names[slowest]} cools slowest, so it is the best insulator.`,
    };
  if (kind === 1)
    return {
      key: `cc1-${order.join("")}`,
      prompt: `${base} Which cup lost heat fastest?`,
      speech: "The graph shows the temperature of hot water in cups A, B and C over 60 minutes. Which cup lost heat fastest?",
      visual: vis,
      needsVisual: true,
      ...opts(`Cup ${names[fastest]}`, names.map((n) => `Cup ${n}`), 3),
      hint: "Look for the curve that drops most steeply.",
      explain: `Cup ${names[fastest]}'s temperature drops fastest, so heat escapes it fastest.`,
    };
  return {
    key: `cc2-${order.join("")}`,
    prompt: `${base} If we waited many hours, what temperature would every cup reach?`,
    speech: "The graph shows hot water cooling in three cups in a room. If we waited many hours, what temperature would every cup reach?",
    visual: vis,
    needsVisual: true,
    ...nums(20, [0, 50, 80, 10], 10),
    unit: "°C",
    hint: "The curves level off toward the room's temperature.",
    explain: "Heat flows out until the water matches the room, about 20 °C. Better insulation only slows this down.",
  };
}

const SPECIFIC = [
  { name: "Water", c: 4.2 },
  { name: "Cooking oil", c: 2.0 },
  { name: "Aluminum", c: 0.9 },
  { name: "Iron", c: 0.45 },
  { name: "Sand", c: 0.8 },
  { name: "Copper", c: 0.39 },
];

/** MS-PS3-4 — specific heat, qualitatively. */
export function specificHeatIdea(): Question {
  const kind = rand(0, 2);
  if (kind < 2) {
    const mats = pickN(SPECIFIC.map((_, i) => i), 3);
    const cs = mats.map((i) => SPECIFIC[i].c);
    const mostWarm = kind === 0;
    const pickIdx = mostWarm ? cs.indexOf(Math.min(...cs)) : cs.indexOf(Math.max(...cs));
    return {
      key: `sh${kind}-${[...mats].sort().join("")}`,
      prompt: mostWarm ? "100 g of each gets the same energy. Which warms up the MOST?" : "Which needs the MOST energy to warm 1 g by 1 °C?",
      speech: mostWarm
        ? `100 grams of each material gets the same energy. ${mats.map((i) => `${SPECIFIC[i].name}: ${SPECIFIC[i].c}`).join(", ")} joules per gram per degree. Which warms up the most?`
        : `Specific heats: ${mats.map((i) => `${SPECIFIC[i].name}: ${SPECIFIC[i].c}`).join(", ")} joules per gram per degree. Which needs the most energy to warm one gram by one degree?`,
      visual: { kind: "table", header: ["Material", "Specific heat (J/g·°C)"], rows: mats.map((i) => [SPECIFIC[i].name, SPECIFIC[i].c]) },
      needsVisual: true,
      ...opts(SPECIFIC[mats[pickIdx]].name, mats.map((i) => SPECIFIC[i].name), 3),
      hint: mostWarm ? "A low specific heat means a small amount of energy makes a big temperature change." : "Specific heat is the energy needed to warm 1 g by 1 °C.",
      explain: mostWarm
        ? `${SPECIFIC[mats[pickIdx]].name} has the lowest specific heat (${SPECIFIC[mats[pickIdx]].c}), so the same energy raises its temperature the most.`
        : `${SPECIFIC[mats[pickIdx]].name} has the highest specific heat (${SPECIFIC[mats[pickIdx]].c} J per gram per °C).`,
    };
  }
  const pool: Concept[] = [
    {
      q: "On a sunny afternoon the sand is hot but the sea is cool. Why?",
      a: "Water has a higher specific heat, so it warms slowly",
      w: ["The sea gets less sunlight", "Sand makes its own heat", "Water reflects all sunlight"],
      hint: "Both get the same sunshine.",
      explain: "Water needs about 5 times more energy per gram than sand to warm by 1 °C, so it heats up much more slowly.",
    },
    {
      q: "A metal pan and the same mass of water get the same heat. Which gets hotter?",
      a: "The metal pan",
      w: ["The water", "Both the same", "Neither warms up"],
      hint: "Metals have a low specific heat.",
      explain: "Metal has a much lower specific heat than water, so the same energy raises its temperature more.",
    },
    {
      q: "Why is water good in a hot water bottle?",
      a: "It stores lots of energy for its temperature (high specific heat)",
      w: ["It is a good conductor", "It's light", "It gets hotter than metal"],
      hint: "It should hold a lot of energy and give it out slowly.",
      explain: "Water's high specific heat means each gram holds lots of energy, which it releases as it cools.",
    },
  ];
  return concept("sh2", pool, rand(0, pool.length - 1));
}

const HEAT_MATS = [
  { name: "water", c: 4.2, ms: [10, 20, 50, 100, 200, 250, 500] },
  { name: "aluminum", c: 0.9, ms: [10, 20, 50, 100, 200] },
  { name: "iron", c: 0.45, ms: [20, 100, 200] },
  { name: "copper", c: 0.39, ms: [100, 200] },
];

/** MS-PS3-4 — energy = mass × specific heat × temperature change. */
export function heatCalc(): Question {
  const mat = pick(HEAT_MATS);
  const m = pick(mat.ms);
  const dT = rand(2, 20);
  const Q = clean(m * mat.c * dT);
  const kind = rand(0, 1);
  if (kind === 0)
    return {
      key: `hc0-${mat.name}-${m}-${dT}`,
      prompt: `How much energy warms ${m} g of ${mat.name} by ${dT} °C? (specific heat ${mat.c} J/g·°C)`,
      speech: `How much energy warms ${m} grams of ${mat.name} by ${dT} degrees? Its specific heat is ${mat.c} joules per gram per degree.`,
      visual: NONE,
      ...kp(Q),
      unit: "J",
      hint: "Energy = mass × specific heat × temperature change.",
      explain: `${m} × ${mat.c} × ${dT} = ${Q} J.`,
    };
  return {
    key: `hc1-${mat.name}-${m}-${dT}`,
    prompt: `${Q} J warms ${m} g of ${mat.name} (specific heat ${mat.c} J/g·°C). By how many degrees?`,
    speech: `${Q} joules warms ${m} grams of ${mat.name}. Its specific heat is ${mat.c} joules per gram per degree. By how many degrees does it warm?`,
    visual: NONE,
    ...kp(dT),
    unit: "°C",
    hint: "Temperature change = energy ÷ (mass × specific heat).",
    explain: `${m} × ${mat.c} = ${clean(m * mat.c)} J per °C. ${Q} ÷ ${clean(m * mat.c)} = ${dT} °C.`,
  };
}

/** MS-PS3-4 — mass and energy change the temperature rise. */
export function massTempChange(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const base = pick([4, 6, 8, 12, 24]);
    const k = pick([2, 3, 4].filter((x) => base % x === 0));
    return {
      key: `mt0-${base}-${k}`,
      prompt: `The same heater runs for 5 minutes. How much does ${100 * k} g of water warm up?`,
      speech: `The same heater runs for 5 minutes. 100 grams of water warms by ${base} degrees. How much does ${100 * k} grams of water warm up?`,
      visual: { kind: "table", header: ["Water (g)", "Temperature rise (°C)"], rows: [[100, base], [100 * k, "?"]] },
      needsVisual: true,
      ...kp(base / k),
      unit: "°C",
      hint: "Same energy shared by more water: each gram gets less.",
      explain: `${k} times the mass, same energy: the rise is ${k} times smaller. ${base} ÷ ${k} = ${base / k} °C.`,
    };
  }
  if (kind === 1) {
    const r = rand(2, 6);
    const k = rand(2, 4);
    return {
      key: `mt1-${r}-${k}`,
      prompt: `A heater warms a pot of water by ${r} °C in 2 minutes. How much in ${2 * k} minutes (same pot)?`,
      speech: `A heater warms a pot of water by ${r} degrees in 2 minutes. How much does it warm in ${2 * k} minutes?`,
      visual: NONE,
      ...kp(r * k),
      unit: "°C",
      hint: "A steady heater gives the same energy every minute.",
      explain: `${k} times the time gives ${k} times the energy, so ${k} times the rise: ${r} × ${k} = ${r * k} °C.`,
    };
  }
  const big = rand(2, 5);
  return {
    key: `mt2-${big}`,
    prompt: `A small pot (1 L) and a big pot (${big} L) of water sit on the same burner for 5 minutes. Which warms more?`,
    speech: `A small pot with 1 liter and a big pot with ${big} liters of water sit on the same burner for 5 minutes. Which warms more?`,
    visual: { kind: "pair", items: [{ emoji: "🥣", label: "1 L", size: 0.6 }, { emoji: "🍲", label: `${big} L`, size: 1 }] },
    ...opts("The small pot", ["The small pot", "The big pot", "Both the same"], 3),
    hint: "Same energy in, different amounts of water.",
    explain: `The same energy spreads through ${big} times as much water in the big pot, so the small pot's temperature rises about ${big} times more.`,
  };
}

/** MS-PS3-4 — plot heating data. */
export function plotHeatingAct(): Question {
  let r = 0;
  let T0 = 0;
  do {
    r = rand(1, 3);
    T0 = rand(0, 4);
  } while (T0 + 3 * r > 10);
  const ts = pickN([0, 1, 2, 3], 3).sort((a, b) => a - b);
  const points = ts.map((t, i) => ({ x: t, y: T0 + r * t, label: "ABC"[i] }));
  return {
    key: `ph-${r}-${T0}-${ts.join("")}`,
    prompt: `Icy water starts at ${T0} °C and a heater warms it ${r} °C every minute. Plot it at ${ts.join(", ")} min (x = time, y = °C).`,
    speech: `Icy water starts at ${T0} degrees and a heater warms it ${r} degrees every minute. Plot its temperature at ${ts.join(", ")} minutes. Time goes across, temperature goes up.`,
    visual: NONE,
    ...act({ kind: "plotPoints", points, size: 10, quadrants: 1 }, r),
    hint: `Temperature = ${T0} + ${r} × minutes.`,
    explain: `${points.map((p) => `${p.x} min → ${p.y} °C`).join(", ")}. A steady heater gives a straight line.`,
  };
}

/* ================================================================ World 6: waves */

/** MS-PS4-1 — read amplitude and wavelength. */
export function waveParts(): Question {
  const A = pick([1, 1.5, 2, 2.5, 3]);
  const lam = pick([2, 3, 4, 5, 6, 8]);
  const n = lam <= 4 ? rand(2, 3) : 2;
  const L = lam * n;
  const kind = rand(0, 2);
  const base = { kind: "phys-wave" as const, length: L, waves: [{ amplitude: A, wavelength: lam }], grid: true, names: true };
  if (kind === 0)
    return {
      key: `wp0-${A}-${lam}-${n}`,
      prompt: "Each grid square is 1 m. What is the amplitude of this wave?",
      speech: "Each grid square is 1 meter. What is the amplitude of this wave?",
      visual: { ...base, amplitudeLabel: "?" },
      needsVisual: true,
      ...kp(A),
      unit: "m",
      hint: "Amplitude is the height from the middle line to a crest (not crest to trough).",
      explain: `From the middle line up to a crest is ${A} m.`,
    };
  if (kind === 1)
    return {
      key: `wp1-${A}-${lam}-${n}`,
      prompt: "Each grid square is 1 m. What is the wavelength?",
      speech: "Each grid square is 1 meter. What is the wavelength of this wave?",
      visual: { ...base, wavelengthLabel: "?" },
      needsVisual: true,
      ...kp(lam),
      unit: "m",
      hint: "Wavelength is the distance from one crest to the next crest.",
      explain: `Crest to crest is ${lam} m.`,
    };
  return {
    key: `wp2-${A}-${lam}-${n}`,
    prompt: `The grid is ${L} m long. How many complete waves fit on it?`,
    speech: `The grid is ${L} meters long. How many complete waves fit on it?`,
    visual: base,
    needsVisual: true,
    ...kp(n),
    unit: "waves",
    hint: "Count crests, or divide the length by the wavelength.",
    explain: `Each wave is ${lam} m long: ${L} ÷ ${lam} = ${n} waves.`,
  };
}

/** MS-PS4-1 — amplitude carries energy; wavelength and frequency. */
export function amplitudeEnergy(): Question {
  const byAmp = rand(0, 1) === 0;
  const big = rand(0, 1) === 0 ? "A" : "B";
  const kind = rand(0, 1);
  if (byAmp) {
    const a1 = pick([1.5, 2, 2.5]);
    const a2 = pick([0.5, 0.75, 1]);
    const lam = pick([2, 3, 4]);
    const waves = big === "A" ? [{ amplitude: a1, wavelength: lam, label: "A" }, { amplitude: a2, wavelength: lam, label: "B" }] : [{ amplitude: a2, wavelength: lam, label: "A" }, { amplitude: a1, wavelength: lam, label: "B" }];
    const q = kind === 0 ? "Which wave carries more energy?" : "These are sound waves. Which one is louder?";
    return {
      key: `ae-a-${big}-${a1}-${a2}-${lam}-${kind}`,
      prompt: q,
      speech: q,
      visual: { kind: "phys-wave", length: 8, waves, grid: true },
      needsVisual: true,
      ...opts(`Wave ${big}`, ["Wave A", "Wave B", "They're the same"], 3),
      hint: "Look at how tall the waves are: the amplitude.",
      explain: `Wave ${big} has the bigger amplitude, so it carries more energy${kind === 1 ? " and sounds louder" : ""}.`,
    };
  }
  const l1 = pick([4, 6, 8]);
  const l2 = pick([1, 2]);
  const A = pick([1, 1.5]);
  const waves = big === "A" ? [{ amplitude: A, wavelength: l2, label: "A" }, { amplitude: A, wavelength: l1, label: "B" }] : [{ amplitude: A, wavelength: l1, label: "A" }, { amplitude: A, wavelength: l2, label: "B" }];
  const q = kind === 0 ? "Both waves travel at the same speed. Which has the higher frequency?" : "These are sound waves. Which has the higher pitch?";
  return {
    key: `ae-l-${big}-${l1}-${l2}-${A}-${kind}`,
    prompt: q,
    speech: q,
    visual: { kind: "phys-wave", length: 8, waves, grid: true },
    needsVisual: true,
    ...opts(`Wave ${big}`, ["Wave A", "Wave B", "They're the same"], 3),
    hint: "Shorter waves at the same speed pass by more often each second.",
    explain: `Wave ${big} has the shorter wavelength (${l2} m), so more waves pass each second: a higher frequency${kind === 1 ? " and a higher pitch" : ""}.`,
  };
}

/** MS-PS4-1 — match a wave's amplitude and wavelength. */
export function matchWaveAct(): Question {
  const A = pick([0.5, 1, 1.5, 2, 2.5, 3]);
  const lam = rand(2, 8);
  return {
    key: `mw-${A}-${lam}`,
    prompt: `Use the sliders to make a wave with amplitude ${A} m and wavelength ${lam} m.`,
    speech: `Use the sliders to make a wave with an amplitude of ${A} meters and a wavelength of ${lam} meters.`,
    visual: NONE,
    ...act(
      { kind: "phys-matchWave", length: 8, target: { amplitude: A, wavelength: lam }, amplitude: { min: 0.5, max: 3, step: 0.5 }, wavelength: { min: 1, max: 8, step: 1 } },
      lam,
    ),
    hint: "Amplitude: middle line to crest. Wavelength: crest to crest.",
    explain: `Amplitude ${A} m makes it ${A} squares tall above the middle; wavelength ${lam} m puts crests ${lam} squares apart.`,
  };
}

/** MS-PS4-1 — wave speed = frequency × wavelength. */
export function waveSpeed(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const f = rand(1, 10);
    const lam = rand(1, 10);
    const what = pick(["rope", "water", "slinky"]);
    return {
      key: `ws0-${what}-${f}-${lam}`,
      prompt: `A ${what} wave has frequency ${f} Hz and wavelength ${lam} m. How fast does it travel?`,
      speech: `A ${what} wave has a frequency of ${f} hertz and a wavelength of ${lam} meters. How fast does it travel?`,
      visual: { kind: "phys-wave", length: 12, waves: [{ amplitude: 1, wavelength: Math.min(lam, 8) }], travel: "v" },
      ...kp(f * lam),
      unit: "m/s",
      hint: "Speed = frequency × wavelength.",
      explain: `v = ${f} × ${lam} = ${f * lam} m/s: ${f} waves each second, each ${lam} m long.`,
    };
  }
  if (kind === 1) {
    const f = pick([34, 68, 85, 170, 340, 680]);
    return {
      key: `ws1-${f}`,
      prompt: `Sound travels at 340 m/s in air. What is the wavelength of a ${f} Hz note?`,
      speech: `Sound travels at 340 meters per second in air. What is the wavelength of a ${f} hertz note?`,
      visual: NONE,
      ...kp(340 / f),
      unit: "m",
      hint: "Wavelength = speed ÷ frequency.",
      explain: `λ = 340 ÷ ${f} = ${ds(340 / f)} m.`,
    };
  }
  const lam = rand(1, 6);
  const f = rand(1, 8);
  return {
    key: `ws2-${lam}-${f}`,
    prompt: `Ocean waves ${lam} m apart travel at ${lam * f} m/s. How many reach the beach each second (frequency)?`,
    speech: `Ocean waves ${lam} meters apart travel at ${lam * f} meters per second. How many reach the beach each second?`,
    visual: NONE,
    ...kp(f),
    unit: "Hz",
    hint: "Frequency = speed ÷ wavelength.",
    explain: `f = ${lam * f} ÷ ${lam} = ${f} Hz.`,
  };
}

/** MS-PS4-1 — set the frequency to make a wavelength. */
export function matchFrequencyAct(): Question {
  for (;;) {
    const v = pick([4, 6, 8, 12]);
    const f = pick([1, 2, 3, 4, 6, 8, 12].filter((x) => v % x === 0));
    const lam = v / f;
    if (lam < 1 || lam > 12) continue;
    const A = pick([1, 1.5, 2]);
    return {
      key: `mf-${v}-${f}-${A}`,
      prompt: `Waves on this rope travel at ${v} m/s. Set the frequency to make waves ${lam} m long.`,
      speech: `Waves on this rope travel at ${v} meters per second. Set the frequency to make waves ${lam} meters long.`,
      visual: NONE,
      ...act({ kind: "phys-matchWave", length: 12, target: { amplitude: A, wavelength: lam }, frequency: { min: 1, max: 12, step: 1 }, speed: v }, f),
      hint: "Frequency = speed ÷ wavelength. Higher frequency makes shorter waves.",
      explain: `f = ${v} ÷ ${lam} = ${f} Hz.`,
    };
  }
}

const SOURCES = ["drum", "string", "fork", "speaker", "bell"] as const;
const SOURCE_NAME: Record<(typeof SOURCES)[number], string> = { drum: "drum", string: "guitar string", fork: "tuning fork", speaker: "speaker", bell: "bell" };

/** MS-PS4-1, MS-PS4-2 — sound: loudness, pitch and what it travels through. */
export function soundWaves(): Question {
  const s = pick(SOURCES);
  const kind = rand(0, 2);
  if (kind === 0) {
    const pitch = pick(["high", "low"] as const);
    return {
      key: `sw0-${s}-${pitch}`,
      prompt: `The ${SOURCE_NAME[s]}'s sound waves are ${pitch === "high" ? "close together" : "far apart"}. What pitch do you hear?`,
      speech: `The ${SOURCE_NAME[s]}'s sound waves are ${pitch === "high" ? "close together" : "far apart"}. What pitch do you hear?`,
      visual: { kind: "phys-sound", scene: "vibrate", source: s, pitch, rings: pitch === "high" ? 4 : 2, ear: true },
      ...opts(pitch === "high" ? "A high pitch" : "A low pitch", ["A high pitch", "A low pitch", "No sound"], 3),
      hint: "Close-together waves mean a short wavelength and a high frequency.",
      explain: `${pitch === "high" ? "Short wavelength, high frequency: a high" : "Long wavelength, low frequency: a low"} pitch.`,
    };
  }
  if (kind === 1) {
    const loud = rand(0, 1) === 0;
    return {
      key: `sw1-${s}-${loud ? 1 : 0}`,
      prompt: `Flare makes the ${SOURCE_NAME[s]} ${loud ? "vibrate harder" : "vibrate more gently"}. What changes?`,
      speech: `Flare makes the ${SOURCE_NAME[s]} ${loud ? "vibrate harder" : "vibrate more gently"}. What changes?`,
      visual: { kind: "phys-sound", scene: "vibrate", source: s, rings: loud ? 4 : 2, loud, ear: true },
      ...opts(loud ? "Bigger amplitude: louder" : "Smaller amplitude: quieter", ["Bigger amplitude: louder", "Smaller amplitude: quieter", "Higher pitch only", "The sound gets faster"]),
      hint: "How hard something vibrates sets the amplitude.",
      explain: `${loud ? "Harder vibrations give a bigger amplitude, carrying more energy: louder" : "Gentler vibrations give a smaller amplitude, carrying less energy: quieter"}. The pitch stays the same.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Why can't astronauts on a spacewalk hear each other without radios?",
      a: "There's no air to carry the vibrations",
      w: ["Space is too cold", "Helmets block light", "Sound is too slow in space"],
      hint: "Sound is a vibration passed from particle to particle.",
      explain: "Sound needs a medium (solid, liquid or gas). Space is nearly empty, so sound can't travel; radio waves can.",
    },
    {
      q: "Sound travels fastest through…",
      a: "Steel",
      w: ["Air", "Water", "Empty space"],
      hint: "Particles packed closely pass vibrations on quickly.",
      explain: "Sound is about 340 m/s in air, 1,500 m/s in water and about 5,000 m/s in steel. It can't cross empty space.",
    },
    {
      q: "Why does putting your ear on a table make a tap sound louder?",
      a: "Wood transmits sound better than air",
      w: ["Wood makes extra sound", "Your ear works better lying down", "Air blocks all sound"],
      hint: "Which carries vibrations better: a solid or a gas?",
      explain: "Solids transmit sound well, so more of the vibration's energy reaches your ear.",
    },
    {
      q: "Soft foam on a studio wall…",
      a: "Absorbs sound, so there are fewer echoes",
      w: ["Reflects sound like a mirror", "Makes sound louder", "Changes the pitch"],
      hint: "Hard walls bounce sound back; soft ones don't.",
      explain: "Soft, holey materials absorb the sound's energy instead of reflecting it, cutting echoes.",
    },
  ];
  return concept("sw2", pool, rand(0, pool.length - 1), { kind: "phys-sound", scene: "vibrate", source: s, ear: true }, `-${s}`);
}

/** MS-PS4-2 — the law of reflection. */
export function reflectAngle(): Question {
  const a = rand(2, 16) * 5;
  const kind = rand(0, 2);
  if (kind === 0)
    return {
      key: `ra0-${a}`,
      prompt: "A light ray hits the mirror. What is the angle of reflection?",
      speech: `A light ray hits the mirror at ${a} degrees from the normal. What is the angle of reflection?`,
      visual: { kind: "phys-rays", scene: "mirror", angle: a, incident: a, reflected: "?", ends: true },
      needsVisual: true,
      ...kp(a),
      unit: "°",
      hint: "Angle in = angle out, both measured from the dashed normal.",
      explain: `The angle of reflection equals the angle of incidence: ${a}°.`,
    };
  if (kind === 1)
    return {
      key: `ra1-${a}`,
      prompt: `A ray hits the mirror at ${90 - a}° to the mirror's SURFACE. What is the angle of reflection (from the normal)?`,
      speech: `A ray hits the mirror at ${90 - a} degrees to the mirror's surface. What is the angle of reflection, measured from the normal?`,
      visual: { kind: "phys-rays", scene: "mirror", angle: a, reflected: "?" },
      ...kp(a),
      unit: "°",
      hint: "The normal is at 90° to the surface. Angle from the normal = 90° − angle to the surface.",
      explain: `90 − ${90 - a} = ${a}° from the normal, and reflection keeps the same angle: ${a}°.`,
    };
  return {
    key: `ra2-${a}`,
    prompt: "What is the whole angle between the incoming ray and the reflected ray?",
    speech: `The ray hits at ${a} degrees from the normal. What is the whole angle between the incoming ray and the reflected ray?`,
    visual: { kind: "phys-rays", scene: "mirror", angle: a, incident: a, reflected: a },
    needsVisual: true,
    ...kp(2 * a),
    unit: "°",
    hint: "The two rays sit on either side of the normal, each at the same angle.",
    explain: `${a}° + ${a}° = ${2 * a}°.`,
  };
}

const LIGHT_MATS = [
  { name: "clear glass", type: "transparent" as const },
  { name: "plastic wrap", type: "transparent" as const },
  { name: "wax paper", type: "translucent" as const },
  { name: "frosted glass", type: "translucent" as const },
  { name: "tissue paper", type: "translucent" as const },
  { name: "wood", type: "opaque" as const },
  { name: "black cloth", type: "opaque" as const },
  { name: "cardboard", type: "opaque" as const },
  { name: "mirror", type: "mirror" as const },
  { name: "shiny foil", type: "mirror" as const },
];
const LIGHT_RESULT = {
  transparent: "Most light passes through (transmitted)",
  translucent: "Some passes through, scattered",
  opaque: "It's absorbed or reflected; none gets through",
  mirror: "Most bounces straight back (reflected)",
};

/** MS-PS4-2 — light is transmitted, absorbed or reflected. */
export function transmitAbsorb(): Question {
  if (rand(0, 3) > 0) {
    const i = rand(0, LIGHT_MATS.length - 1);
    const m = LIGHT_MATS[i];
    const source = pick(["a torch", "the Sun", "a lamp"]);
    return {
      key: `ta-${i}-${source}`,
      prompt: `Light from ${source} shines on ${m.name}. What happens to most of the light?`,
      speech: `Light from ${source} shines on ${m.name}. What happens to most of the light?`,
      visual: NONE,
      ...opts(LIGHT_RESULT[m.type], Object.values(LIGHT_RESULT)),
      hint: "Can you see clearly through it, see blurry light, see nothing, or see yourself?",
      explain: `${m.name[0].toUpperCase()}${m.name.slice(1)} is ${m.type === "mirror" ? "a reflector" : m.type}: ${LIGHT_RESULT[m.type].toLowerCase()}.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Why does a black T-shirt get hotter in the sun than a white one?",
      a: "It absorbs more light, turning it into heat",
      w: ["It reflects more light", "Black is a heavier colour", "It lets light through"],
      hint: "Where does the light's energy go?",
      explain: "Black absorbs most light; that energy becomes thermal energy. White reflects most of it.",
    },
    {
      q: "Why do we see a red apple as red?",
      a: "It reflects red light and absorbs the other colours",
      w: ["It makes red light", "It absorbs red light", "It lets red light through"],
      hint: "Which colour reaches your eye from the apple?",
      explain: "White light hits the apple; it absorbs most colours and reflects red into your eyes.",
    },
    {
      q: "Why can you see through a window but not a wall?",
      a: "Glass transmits light; the wall absorbs and reflects it",
      w: ["Glass makes light", "The wall is too thick to have light", "Light is too slow for walls"],
      hint: "What does each material do to light?",
      explain: "Transparent glass transmits light. The opaque wall stops it by absorbing and reflecting.",
    },
  ];
  return concept("tab", pool, rand(0, pool.length - 1), { kind: "phys-rays", scene: "see", object: "🍎", label: "light bounces off the apple" });
}

const TRANSMITS = ["Window glass", "Clear water", "Plastic wrap", "Clear plastic bottle"];
const REFLECTS = ["Mirror", "Aluminum foil", "Polished spoon", "White paper"];
const ABSORBS = ["Black cardboard", "Black T-shirt", "Dark asphalt", "Charcoal"];

/** MS-PS4-2 — sort materials by what they mostly do to light. */
export function sortLightAct(): Question {
  const per = shuffle([2, 2, 3]);
  const { items, key } = sortItems([TRANSMITS, REFLECTS, ABSORBS], per);
  return {
    key: `sl-${key}`,
    prompt: "Sort the materials: what do they mostly do to light?",
    speech: "Sort the materials. Does each one mostly transmit light, reflect it, or absorb it?",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Transmits", "Reflects", "Absorbs"], items }, per[0]),
    hint: "See-through: transmits. Shiny or white: reflects. Dark and dull: absorbs.",
    explain: "Clear materials transmit light. Shiny and white surfaces reflect it. Dark, dull surfaces absorb it (and warm up).",
  };
}

/** MS-PS4-2 — light and sound in different materials. */
export function lightSoundMedia(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const intoWater = rand(0, 1) === 0;
    const glass = rand(0, 1) === 0;
    const n = glass ? 1.5 : 1.33;
    const name = glass ? "glass" : "water";
    const a = intoWater ? rand(4, 12) * 5 : rand(2, 8) * 5;
    return {
      key: `lsm0-${intoWater ? 1 : 0}-${name}-${a}`,
      prompt: intoWater ? `Light slows down when it enters ${name}. Which way does it bend?` : `Light speeds up as it leaves ${name} into air. Which way does it bend?`,
      speech: intoWater ? `Light slows down when it goes from air into ${name}. Which way does it bend?` : `Light speeds up as it leaves ${name} into air. Which way does it bend?`,
      visual: intoWater
        ? { kind: "phys-rays", scene: "refraction", angle: a, n1: 1, n2: n, top: "air", bottom: name, incident: a }
        : { kind: "phys-rays", scene: "refraction", angle: a, n1: n, n2: 1, top: name, bottom: "air", incident: a },
      ...opts(intoWater ? "Toward the normal" : "Away from the normal", ["Toward the normal", "Away from the normal", "It doesn't bend"], 3),
      hint: "Slowing down bends light toward the normal; speeding up bends it away.",
      explain: `Light ${intoWater ? `slows in ${name}, so it bends toward` : "speeds up in air, so it bends away from"} the normal. This bending is refraction.`,
    };
  }
  if (kind === 1) {
    const t = rand(1, 6);
    const echo = rand(0, 1) === 0;
    return {
      key: `lsm1-${t}-${echo ? 1 : 0}`,
      prompt: echo ? `A ship's sonar ping takes ${t} s to come back from the sea floor. Sound in water: 1,500 m/s. How deep is it?` : `A whale's call travels through water (1,500 m/s) for ${t} s. How far does it go?`,
      speech: echo ? `A ship's sonar ping takes ${t} seconds to come back from the sea floor. Sound travels 1500 meters per second in water. How deep is the sea?` : `A whale's call travels through water at 1500 meters per second for ${t} seconds. How far does it go?`,
      visual: NONE,
      ...kp(echo ? 750 * t : 1500 * t),
      unit: "m",
      hint: echo ? "Distance = speed × time, but the ping goes down AND back up." : "Distance = speed × time.",
      explain: echo ? `1,500 × ${t} = ${1500 * t} m there and back, so the depth is ${750 * t} m.` : `1,500 × ${t} = ${1500 * t} m.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Light from the Sun reaches us, but sound from the Sun doesn't. Why?",
      a: "Light can cross empty space; sound needs a medium",
      w: ["The Sun is silent", "Sound is blocked by clouds", "Light is louder"],
      hint: "What is between the Sun and Earth?",
      explain: "Space is almost empty. Light waves don't need particles; sound waves do.",
    },
    {
      q: "In which material does light travel fastest?",
      a: "Empty space (vacuum)",
      w: ["Glass", "Water", "Diamond"],
      hint: "Materials slow light down.",
      explain: "Light is fastest in a vacuum (300,000 km/s). It slows in air a tiny bit, more in water and glass.",
    },
    {
      q: "You see lightning before you hear thunder. Why?",
      a: "Light travels much faster than sound",
      w: ["Thunder happens later", "Your ears are slower than your eyes", "Sound goes around the clouds"],
      hint: "Both start at the same time.",
      explain: "Light arrives almost instantly; sound travels about 340 m every second, so it arrives later.",
    },
  ];
  return concept("lsm2", pool, rand(0, pool.length - 1));
}

/** The digital signal for `bits` as plot lines (0 → low, 1 → high). */
function digitalLines(bits: number[]) {
  const lines: { from: [number, number]; to: [number, number]; colour: "wave" }[] = [];
  bits.forEach((b, i) => {
    lines.push({ from: [i, b], to: [i + 1, b], colour: "wave" });
    if (i > 0 && bits[i - 1] !== b) lines.push({ from: [i, bits[i - 1]], to: [i, b], colour: "wave" });
  });
  return lines;
}

/** MS-PS4-3 — analog and digital signals. */
export function analogDigital(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const digital = rand(0, 1) === 0;
    const bits = Array.from({ length: 8 }, () => rand(0, 1));
    const f = pick([0.5, 0.75, 1, 1.25]);
    const A = pick([0.6, 0.8]);
    const vis: Visual = digital
      ? { kind: "plot", x: [0, 8], y: [-0.5, 1.5], lines: digitalLines(bits) }
      : { kind: "plot", x: [0, 8], y: [-0.5, 1.5], curves: [{ fn: (x) => 0.5 + A * 0.6 * Math.sin(f * x) + 0.15 * Math.sin(3 * f * x), colour: "wave" }] };
    return {
      key: `ad0-${digital ? `d${bits.join("")}` : `a${f}-${A}`}`,
      prompt: "Is this signal analog or digital?",
      speech: "Look at the signal. Is it analog or digital?",
      visual: vis,
      needsVisual: true,
      ...opts(digital ? "Digital" : "Analog", ["Analog", "Digital"], 2),
      hint: "Digital signals jump between just two levels (0 and 1). Analog signals change smoothly through every value.",
      explain: digital ? "It only has two levels, high (1) and low (0): digital." : "It changes smoothly and can take any value: analog.",
    };
  }
  if (kind === 1) {
    const bits = Array.from({ length: 6 }, () => rand(0, 1));
    return {
      key: `ad1-${bits.join("")}`,
      prompt: "Noise has been added to this digital signal. Can the message still be read?",
      speech: "Noise has been added to this digital signal. Can the message still be read?",
      visual: { kind: "plot", x: [0, 6], y: [-0.5, 1.5], curves: [{ fn: (x) => bits[Math.min(5, Math.floor(x))] + 0.12 * Math.sin(9 * x) + 0.06 * Math.sin(23 * x), colour: "wave" }] },
      needsVisual: true,
      ...opts("Yes: each part is clearly high or low", ["No: the noise ruins it", "Only if it's turned into analog", "Yes, but only the first bit"]),
      hint: "The receiver only needs to decide: is it nearer 1 or nearer 0?",
      explain: `Even with wobbles, each part is clearly high or low, so the code ${bits.join("")} can be read perfectly. That's why digital signals are reliable.`,
    };
  }
  const pool: Concept[] = [
    {
      q: "Why are digital signals more reliable than analog ones?",
      a: "Only 0s and 1s, so small noise can be ignored",
      w: ["They travel faster than light", "They never need power", "They use bigger waves"],
      hint: "What does the receiver have to tell apart?",
      explain: "A receiver only has to decide 0 or 1, so small noise doesn't change the message. Analog noise gets copied in.",
    },
    {
      q: "An analog signal picks up noise. What happens when it's copied many times?",
      a: "The noise builds up and can't be removed",
      w: ["The noise disappears", "It becomes digital", "It gets clearer each time"],
      hint: "With analog, every small change is part of the signal.",
      explain: "Analog can't tell noise from signal, so each copy adds more noise. Digital copies can be perfect.",
    },
    {
      q: "A flashlight sends a message in short and long flashes (• — •). What kind of signal is it?",
      a: "Digital: on or off pulses",
      w: ["Analog: smoothly changing brightness", "Neither: it's only light", "Sound"],
      hint: "How many different states does the light have?",
      explain: "The light is only ever on or off, two states, so the message is digital, like Morse code.",
    },
    {
      q: "Why can digital music be stored and sent without losing quality?",
      a: "It's saved as numbers that can be copied exactly",
      w: ["It's louder", "It's made of bigger waves", "It doesn't use electricity"],
      hint: "What is a digital file really made of?",
      explain: "Digital data is a list of numbers (bits). Numbers can be copied and checked exactly.",
    },
  ];
  return concept("ad2", pool, rand(0, pool.length - 1), { kind: "phys-sound", scene: "signal", sender: "🔦", receiver: "🧒", via: "light", message: "• — •" });
}

/** MS-PS4-3 — read bits from a digital signal; how much bits can encode. */
export function readBits(): Question {
  const kind = rand(0, 2);
  if (kind === 2) {
    const n = rand(1, 8);
    return {
      key: `rb2-${n}`,
      prompt: `Each bit is 0 or 1. How many different codes can ${n} bit${n > 1 ? "s" : ""} make?`,
      speech: `Each bit is 0 or 1. How many different codes can ${n} bit${n > 1 ? "s" : ""} make?`,
      visual: NONE,
      ...kp(2 ** n),
      unit: "codes",
      hint: "Each extra bit doubles the number of codes: 1 bit → 2, 2 bits → 4…",
      explain: `2 × 2 × … (${n} times) = 2^${n} = ${2 ** n} codes.`,
    };
  }
  let bits: number[];
  do bits = Array.from({ length: 8 }, () => rand(0, 1));
  while (new Set(bits).size < 2);
  const vis: Visual = { kind: "plot", x: [0, 8], y: [-0.5, 1.5], lines: digitalLines(bits) };
  if (kind === 1)
    return {
      key: `rb1-${bits.join("")}`,
      prompt: "High = 1 and low = 0. How many 1s are in this digital signal?",
      speech: "In this digital signal, high means 1 and low means 0. How many ones are there?",
      visual: vis,
      needsVisual: true,
      ...kp(bits.filter((b) => b === 1).length),
      hint: "Each 1-wide step along the time axis is one bit. Count the high ones.",
      explain: `The code is ${bits.join("")}: ${bits.filter((b) => b === 1).length} ones.`,
    };
  const code = bits.join("");
  const flip = (i: number) => bits.map((b, j) => (j === i ? 1 - b : b)).join("");
  const wrong = [flip(rand(0, 7)), flip(rand(0, 7)), [...bits].reverse().join(""), bits.map((b) => 1 - b).join("")];
  return {
    key: `rb0-${code}`,
    prompt: "High = 1 and low = 0. Which code does this signal carry?",
    speech: "In this digital signal, high means 1 and low means 0. Which code does it carry?",
    visual: vis,
    needsVisual: true,
    ...opts(code, wrong),
    hint: "Read one bit for each step of 1 along the time axis, left to right.",
    explain: `Reading left to right: ${code}.`,
  };
}
