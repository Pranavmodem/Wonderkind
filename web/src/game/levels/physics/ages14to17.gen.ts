/**
 * Question generators for high-school physics (ages 14–17, NGSS HS-PS2, HS-PS3, HS-PS4):
 * kinematics, Newton's laws, momentum, gravitation and Coulomb's law, electromagnetism,
 * energy, heat and the second law, and waves and light. Worlds are assembled in ./ages14to17.ts.
 *
 * g = 9.8 m/s² throughout (a question says so when it uses 10 for whole-number grids).
 * Decimal answers are rounded with Math.round(x · 10) / 10 (or 100), so the number on screen is the
 * exact rounded value, and the prompt says how to round.
 */
import { fmt, labelChoices, pick, rand, shuffle } from "../../questions";
import type { Activity, Mark, Question, Visual } from "../../types";
import { launchDistance } from "../../science/physicsValidate";
import type { CircuitPart } from "../../science/physicsTypes";

/* =================================================================== helpers */

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra">;

const NONE: Visual = { kind: "none" };
const G = 9.8;
const RAD = Math.PI / 180;
const sinD = (d: number) => Math.sin(d * RAD);
const cosD = (d: number) => Math.cos(d * RAD);

/** Remove floating-point noise. */
const clean = (x: number) => Math.round(x * 1e6) / 1e6;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
/** A number as text, with a real minus sign. */
const ds = (x: number) => fmt(clean(x));

/** Number choices: the answer, the likely mistakes, then neighbours `step` apart. */
function numChoices(answer: number, wrong: number[], step = 1, min = -Infinity): number[] {
  const out: number[] = [answer];
  const add = (raw: number) => {
    const v = clean(raw);
    if (out.length < 4 && Number.isFinite(v) && v >= min && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < 4 && k < 60; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return shuffle(out);
}

/** Pick from number choices. */
function choose(answer: number, wrong: number[], step = 1, min = -Infinity): Answer {
  const a = clean(answer);
  return { answer: a, input: "choices", choices: numChoices(a, wrong, step, min) };
}

/** Type the answer: negatives get "−", decimals get "."; negative decimals become choices. */
function keypad(answer: number, wrong: number[] = []): Answer {
  const a = clean(answer);
  if (a < 0 && !Number.isInteger(a)) return choose(a, wrong.length ? wrong : [-a, a + 1, a - 1], 0.5);
  if (a < 0) return { answer: a, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(a)) return { answer: a, input: "keypad", keypadExtra: "." };
  return { answer: a, input: "keypad" };
}

/** Whole-number answer on a keypad that always has "−", so the sign isn't given away. */
function signed(answer: number): Answer {
  return { answer: clean(answer), input: "keypad", keypadExtra: "−" };
}

/** Text choices. Wrong ones are shuffled (unless keepOrder), then the first 3 are used. */
function label(correct: string, wrong: string[], keepOrder = false): Answer {
  const { choices, labels, answer } = labelChoices(correct, keepOrder ? wrong : shuffle(wrong));
  return { answer, input: "choices", choices, labels };
}

const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (e: number) => (e < 0 ? "⁻" : "") + [...String(Math.abs(e))].map((c) => SUPS[+c]).join("");

/** Scientific notation as text: 2.0 × 10⁻⁷. `digits` significant figures. */
function sci(x: number, digits = 2): string {
  if (x === 0) return "0";
  let e = Math.floor(Math.log10(Math.abs(x)));
  let m = Number((x / 10 ** e).toFixed(digits - 1));
  if (Math.abs(m) >= 10) {
    m /= 10;
    e += 1;
  }
  const ms = m.toFixed(digits - 1);
  return e === 0 ? ms : `${ms} × 10${sup(e)}`;
}

/** On-screen science text → words to say (the app then reads units after numbers, ², −, × and so on). */
function say(s: string): string {
  return s
    .replace(/10([⁻]?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, m: string, d: string) => `10 to the ${m ? "minus " : ""}${[...d].map((c) => SUPS.indexOf(c)).join("")}`)
    .replace(/kg·m\/s/g, "kilogram meters per second")
    .replace(/N·s/g, "newton seconds")
    .replace(/N·m/g, "newton meters")
    .replace(/J\/\(kg·°C\)/g, "joules per kilogram per degree")
    .replace(/kJ\/kg/g, "kilojoules per kilogram")
    .replace(/N\/m/g, "newtons per meter")
    .replace(/m\/s²/g, "meters per second squared")
    .replace(/m\/s/g, "meters per second")
    .replace(/km\/s/g, "kilometers per second")
    .replace(/Mb\/s/g, "megabits per second")
    .replace(/(\d) ?μC/g, "$1 microcoulombs")
    .replace(/(\d) ?nm\b/g, "$1 nanometers")
    .replace(/(\d) ?GHz\b/g, "$1 gigahertz")
    .replace(/(\d) ?MHz\b/g, "$1 megahertz")
    .replace(/(\d) ?kHz\b/g, "$1 kilohertz")
    .replace(/(\d) ?kWh\b/g, "$1 kilowatt hours")
    .replace(/(\d) ?kW\b/g, "$1 kilowatts")
    .replace(/(\d) ?MW\b/g, "$1 megawatts")
    .replace(/(\d) ?kV\b/g, "$1 kilovolts")
    .replace(/(\d) ?MB\b/g, "$1 megabytes")
    .replace(/(\d) ?Mb\b/g, "$1 megabits")
    .replace(/(\d) ?km\b/g, "$1 kilometers")
    .replace(/(\d) ?cm\b/g, "$1 centimeters")
    .replace(/(\d) ?m\b/g, "$1 meters")
    .replace(/(\d) ?s\b/g, "$1 seconds")
    .replace(/(\d) ?T\b/g, "$1 tesla")
    .replace(/(\d) ?C\b/g, "$1 coulombs")
    .replace(/μ([ₛₖ]?) ?=/g, "mu equals")
    .replace(/→/g, " to ")
    .replace(/·/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Spec {
  key: string;
  prefix?: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  unit?: string;
  hint: string;
  explain: string;
  activity?: Activity;
}

/** Build a question; speech defaults to the prompt said out loud. */
function mk(o: Spec & Answer): Question {
  return { ...o, visual: o.visual ?? NONE, speech: o.speech ?? say(o.prompt) };
}

/** A hands-on activity question. */
function act(o: Spec & { activity: Activity; answer: number }): Question {
  return { ...o, visual: o.visual ?? NONE, input: "activity", speech: o.speech ?? say(o.prompt) };
}

/** A concept question: prompt, correct answer, wrong answers, hint, explanation, optional picture. */
interface Card {
  p: string;
  a: string;
  w: string[];
  h: string;
  e: string;
  v?: Visual;
  nv?: boolean;
}

function card(prefix: string, bank: Card[], i = rand(0, bank.length - 1)): Question {
  const c = bank[i];
  return mk({ key: `${prefix}-c${i}`, prompt: c.p, visual: c.v, needsVisual: c.nv, ...label(c.a, c.w), hint: c.h, explain: c.e });
}

/** A data table laid out sideways: first row the header. */
const table = (header: (string | number)[], ...rows: (string | number)[][]): Visual => ({
  kind: "table",
  header: header.map(String),
  rows,
});

/** Pythagorean triples. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [12, 16, 20],
];

/* =================================================================== world 1: motion */

const TRACK = { min: 0, max: 20, step: 1, labelStep: 5, unit: "m" };

const DISPLACEMENT_CARDS: Card[] = [
  {
    p: "Can the size of a displacement ever be bigger than the distance travelled?",
    a: "No: at most they're equal",
    w: ["Yes, on a curved path", "Yes, when you turn back", "Yes, when you go fast"],
    h: "Displacement is the straight line from start to finish. Can any path be shorter than a straight line?",
    e: "The straight line from start to end is the shortest path, so |displacement| ≤ distance. They're equal only for one-way straight-line motion.",
  },
  {
    p: "You jog once around a circular track and stop where you started. Your displacement is…",
    a: "0 m",
    w: ["the track's circumference", "the track's diameter", "the track's radius"],
    h: "Displacement only cares where you end up compared with where you started.",
    e: "You end exactly where you began, so the displacement is 0 m, even though the distance is a full lap.",
  },
  {
    p: "Which of these is a vector (it has a direction)?",
    a: "Displacement",
    w: ["Distance", "Speed", "Time"],
    h: "A vector needs a size and a direction, like '5 m east'.",
    e: "Displacement (and velocity) have a direction. Distance, speed and time are just sizes (scalars).",
  },
  {
    p: "Average velocity is…",
    a: "displacement ÷ time",
    w: ["distance ÷ time", "time ÷ displacement", "speed × time"],
    h: "Velocity is the vector partner of speed.",
    e: "Average velocity = displacement ÷ time. Average speed = distance ÷ time.",
  },
  {
    p: "A car's odometer (the trip counter) measures…",
    a: "distance",
    w: ["displacement", "velocity", "acceleration"],
    h: "Does the counter go down when you drive home again?",
    e: "The odometer keeps adding up the ground covered, whichever way you drive, so it measures distance.",
  },
];

export function displacement(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const s = rand(2, 9);
    const left = rand(0, 3) === 0;
    const p = left ? s - rand(2, s) : s + rand(3, 20 - s);
    let e = left ? p + rand(1, 20 - p) : p - rand(1, p);
    if (e === s) e = left ? Math.min(20, e + 1) : Math.max(0, e - 1);
    if (e === s || e === p) e = left ? p + 1 : p - 1;
    const dist = Math.abs(p - s) + Math.abs(e - p);
    const disp = e - s;
    const emoji = pick(["🐕", "🛹", "🚲", "🏃"]);
    const visual: Visual = { kind: "phys-motion", look: "ghosts", track: TRACK, rows: [{ positions: [s, p, e], emoji }], times: true };
    if (k === 0)
      return mk({
        key: `disp-dist-${s}-${p}-${e}`,
        prompt: `It goes from dot 0 to dot 1, then turns and goes to dot 2. What distance does it cover?`,
        visual,
        needsVisual: true,
        unit: "m",
        ...keypad(dist),
        hint: "Distance adds up every metre travelled, there and back. Find each leg's length and add them.",
        explain: `First leg ${Math.abs(p - s)} m, then ${Math.abs(e - p)} m back: distance = ${dist} m.`,
      });
    return mk({
      key: `disp-disp-${s}-${p}-${e}`,
      prompt: `It goes from dot 0 to dot 1, then turns and goes to dot 2. What is its displacement? (+ is to the right)`,
      visual,
      needsVisual: true,
      unit: "m",
      ...signed(disp),
      hint: "Displacement = final position − starting position. Ignore the turn.",
      explain: `Displacement = ${e} − ${s} = ${ds(disp)} m${disp < 0 ? " (to the left)" : ""}. The distance was ${dist} m.`,
    });
  }
  if (k === 2) {
    const [a, b, c] = pick(TRIPLES);
    const askDisp = rand(0, 1) === 1;
    return mk({
      key: `disp-2d-${a}-${b}-${askDisp}`,
      prompt: `A hiker walks ${a} km north, then ${b} km east. ${askDisp ? "How far is she from her start (displacement)?" : "What distance did she walk?"}`,
      unit: "km",
      ...(askDisp ? choose(c, [a + b, Math.abs(b - a), c + 1], 1, 1) : choose(a + b, [c, Math.abs(b - a)], 1, 1)),
      hint: askDisp ? "The two legs are at right angles: use Pythagoras for the straight line back to the start." : "Distance just adds the legs.",
      explain: askDisp ? `Displacement = √(${a}² + ${b}²) = ${c} km (north-east). The distance walked is ${a + b} km.` : `Distance = ${a} + ${b} = ${a + b} km. The displacement is only √(${a}² + ${b}²) = ${c} km.`,
    });
  }
  if (k === 3) {
    const out = pick([300, 400, 600, 800]);
    const back = pick([100, 200]);
    const t1 = pick([100, 200]);
    const t2 = pick([50, 100]);
    const askVel = rand(0, 1) === 1;
    const total = t1 + t2;
    const speed = r2((out + back) / total);
    const vel = r2((out - back) / total);
    return mk({
      key: `disp-avg-${out}-${back}-${t1}-${t2}-${askVel}`,
      prompt: `You run ${out} m east in ${t1} s, then ${back} m west in ${t2} s. What is your average ${askVel ? "velocity (east +)" : "speed"}? Round to 2 decimal places.`,
      unit: "m/s",
      ...keypad(askVel ? vel : speed),
      hint: askVel ? "Average velocity = displacement ÷ total time. The westward part counts as negative." : "Average speed = total distance ÷ total time.",
      explain: askVel
        ? `Displacement = ${out} − ${back} = ${out - back} m; time = ${total} s; velocity = ${out - back} ÷ ${total} ≈ ${vel} m/s east.`
        : `Distance = ${out} + ${back} = ${out + back} m; time = ${total} s; speed = ${out + back} ÷ ${total} ≈ ${speed} m/s.`,
    });
  }
  return card("disp", DISPLACEMENT_CARDS);
}

const XT_CARDS: Card[] = [
  {
    p: "On a position–time graph, what does the slope tell you?",
    a: "The velocity",
    w: ["The acceleration", "The distance", "The force"],
    h: "Slope = rise ÷ run = change in position ÷ change in time.",
    e: "Slope = Δx ÷ Δt, which is the velocity. Steeper means faster; a negative slope means moving backward.",
  },
  {
    p: "On a position–time graph, a horizontal (flat) line means the object is…",
    a: "standing still",
    w: ["moving at constant speed", "speeding up", "moving backward"],
    h: "If the position isn't changing as time goes on, what is the velocity?",
    e: "Flat line: the position doesn't change, so the velocity is 0. The object is at rest.",
  },
  {
    p: "Two lines cross on a position–time graph. At that time the two objects…",
    a: "are at the same place",
    w: ["have the same speed", "have the same acceleration", "collide and stop"],
    h: "A point on the graph is a (time, position) pair.",
    e: "Where the lines cross, both objects have the same position at the same time: one is passing the other.",
  },
  {
    p: "A position–time graph curves upward, getting steeper and steeper. The object is…",
    a: "speeding up",
    w: ["slowing down", "moving at constant velocity", "at rest"],
    h: "The slope is the velocity. What happens to the slope?",
    e: "A steeper and steeper slope means the velocity keeps growing: the object is speeding up (accelerating).",
  },
];

export function xtGraphs(): Question {
  const k = rand(0, 5);
  if (k <= 1) {
    const T = pick([2, 4]);
    const v = pick([-4, -3, -2, -1, 1, 2, 3, 4].filter((x) => Math.abs(x * T) <= 14));
    const lo = v > 0 ? 0 : -v * T;
    const hi = v > 0 ? 16 - v * T : 16;
    const x0 = 2 * rand(Math.ceil(lo / 2), Math.floor(hi / 2));
    const x1 = x0 + v * T;
    const visual: Visual = { kind: "plot", xLabel: "time (s)", yLabel: "position (m)", x: [0, 8], y: [0, 16], lines: [{ from: [0, x0], to: [T, x1], colour: "wave" }], points: [{ x: 0, y: x0 }, { x: T, y: x1 }] };
    return mk({
      key: `xt-slope-${T}-${v}-${x0}`,
      prompt: "What is the object's velocity?",
      visual,
      needsVisual: true,
      unit: "m/s",
      ...signed(v),
      hint: "Velocity = slope = (change in position) ÷ (change in time). Read the start and end points.",
      explain: `It goes from ${x0} m to ${x1} m in ${T} s: v = (${x1} − ${x0}) ÷ ${T} = ${ds(v)} m/s${v < 0 ? " (moving back toward 0)" : ""}.`,
    });
  }
  if (k === 2) {
    const roles = shuffle([0, 1, 3, -2]).slice(0, 3);
    const names = ["A", "B", "C"];
    let x = 6;
    const lines: { from: [number, number]; to: [number, number]; colour?: "wave" }[] = [];
    const points: { x: number; y: number; label: string }[] = [];
    roles.forEach((v, i) => {
      const nx = x + 2 * v;
      lines.push({ from: [2 * i, x], to: [2 * i + 2, nx], colour: "wave" });
      points.push({ x: 2 * i + 1, y: (x + nx) / 2, label: names[i] });
      x = nx;
    });
    const asks = [
      { q: "standing still", ok: (v: number) => v === 0 },
      { q: "moving fastest", ok: (v: number) => Math.abs(v) === Math.max(...roles.map(Math.abs)) },
      { q: "moving back toward x = 0", ok: (v: number) => v < 0 },
    ].filter((a) => roles.filter(a.ok).length === 1);
    const ask = pick(asks);
    const idx = roles.findIndex(ask.ok);
    return mk({
      key: `xt-parts-${roles.join("_")}-${ask.q.length}`,
      prompt: `This position–time graph has three parts. In which part is the object ${ask.q}?`,
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "position (m)", x: [0, 8], y: [0, 16], lines, points },
      needsVisual: true,
      ...label(names[idx], names.filter((n) => n !== names[idx])),
      hint: "Look at the slope of each part: flat = at rest, steeper = faster, sloping down = moving backward.",
      explain: `Part ${names[idx]} has a velocity of ${ds(roles[idx])} m/s (its slope), so it is ${ask.q}.`,
    });
  }
  if (k === 3) {
    const type = rand(0, 2);
    const c = rand(1, 3);
    const fn = type === 0 ? (t: number) => c + 0.2 * t * t : type === 1 ? (t: number) => c + 3 * t - 0.1875 * t * t : (t: number) => c + 1.5 * t;
    const answers = ["Speeding up", "Slowing down", "Constant velocity"];
    return mk({
      key: `xt-curve-${type}-${c}`,
      prompt: "How is the object's velocity changing?",
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "position (m)", x: [0, 8], y: [0, 16], curves: [{ fn, colour: "berry" }] },
      needsVisual: true,
      ...label(answers[type], [...answers.filter((a) => a !== answers[type]), "At rest"]),
      hint: "The slope of an x–t graph is the velocity. Is the slope growing, shrinking or the same?",
      explain:
        type === 0
          ? "The graph gets steeper, so the velocity grows: speeding up."
          : type === 1
            ? "The graph flattens out, so the velocity shrinks toward 0: slowing down."
            : "A straight line has the same slope everywhere: constant velocity.",
    });
  }
  if (k === 4) {
    const v = pick([-4, -2, 2, 4]);
    const T = 4;
    const x0 = v > 0 ? 2 * rand(0, (16 - v * T) / 2) : 2 * rand((-v * T) / 2, 8);
    const t = rand(1, 3);
    return mk({
      key: `xt-read-${v}-${x0}-${t}`,
      prompt: `Where is the object at t = ${t} s?`,
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "position (m)", x: [0, 8], y: [0, 16], lines: [{ from: [0, x0], to: [T, x0 + v * T], colour: "wave" }] },
      needsVisual: true,
      unit: "m",
      ...keypad(x0 + v * t),
      hint: `Go up from t = ${t} on the time axis to the line, then across to the position axis.`,
      explain: `It starts at ${x0} m with v = ${ds(v)} m/s, so at ${t} s: x = ${x0} + (${ds(v)})(${t}) = ${x0 + v * t} m.`,
    });
  }
  return card("xt", XT_CARDS);
}

export function plotMotion(): Question {
  const type = rand(0, 3);
  let xs: number[];
  let what: string;
  let shape: string;
  if (type === 0) {
    const v = pick([1, 2, 3]);
    const x0 = rand(0, 10 - 3 * v);
    xs = [0, 1, 2, 3].map((t) => x0 + v * t);
    what = `cart rolling at a steady ${v} m/s`;
    shape = `a straight line rising ${v} m every second (slope ${v} m/s)`;
  } else if (type === 1) {
    const v = pick([1, 2, 3]);
    const x0 = rand(3 * v, 10);
    xs = [0, 1, 2, 3].map((t) => x0 - v * t);
    what = "cart rolling back toward the start";
    shape = `a straight line falling ${v} m every second (slope −${v} m/s)`;
  } else if (type === 2) {
    const x0 = rand(0, 1);
    xs = [0, 1, 2, 3].map((t) => x0 + t * t);
    what = "ball rolling down a ramp from rest";
    shape = "a curve getting steeper: the steps grow (1, 3, 5 m), so it's speeding up";
  } else {
    const x0 = rand(9, 10);
    xs = [0, 1, 2, 3].map((t) => x0 - t * t);
    what = "cart that starts at rest and speeds up as it rolls back toward 0";
    shape = "a curve bending down more and more steeply: speeding up while moving backward";
  }
  const points = xs.map((x, t) => ({ x: t, y: x, label: `${t} s` }));
  return act({
    key: `plotmotion-${type}-${xs.join("_")}`,
    prompt: `Plot the ${what}. Across: time (s). Up: position (m).`,
    visual: table(["t (s)", 0, 1, 2, 3], ["x (m)", ...xs]),
    needsVisual: true,
    activity: { kind: "plotPoints", points, size: 10, quadrants: 1 },
    answer: xs[3],
    hint: "Each column of the table is one point: go across to the time, then up to the position.",
    explain: `The points make ${shape}.`,
  });
}

const ACCEL_CARDS: Card[] = [
  {
    p: "A ball is thrown straight up. At the very top its velocity is 0. Its acceleration there is…",
    a: "9.8 m/s² downward",
    w: ["0", "9.8 m/s² upward", "bigger than 9.8 m/s²"],
    h: "Gravity doesn't switch off at the top.",
    e: "Gravity still pulls, so a = 9.8 m/s² down. The velocity is passing through 0 from up to down.",
  },
  {
    p: "A car goes around a curve at a steady 20 m/s. Is it accelerating?",
    a: "Yes: its direction is changing",
    w: ["No: its speed is constant", "Only if it brakes", "Only on a slope"],
    h: "Velocity has a size and a direction.",
    e: "Velocity includes direction. Turning changes the velocity, so the car accelerates (toward the centre of the curve).",
  },
  {
    p: "A cart moving to the right is slowing down. Which way does its acceleration point?",
    a: "To the left",
    w: ["To the right", "Up", "It has no acceleration"],
    h: "To slow down, the change in velocity must point against the motion.",
    e: "Slowing down means the acceleration points opposite the velocity: left.",
  },
  {
    p: "A car moving left (the negative direction) speeds up. Its acceleration is…",
    a: "negative",
    w: ["positive", "zero", "impossible to tell"],
    h: "Speeding up means acceleration points the same way as the velocity.",
    e: "Velocity is negative and growing in size, so the acceleration points left too: it's negative. 'Negative' doesn't always mean slowing down!",
  },
  {
    p: "Acceleration is measured in…",
    a: "m/s²",
    w: ["m/s", "m", "N"],
    h: "It's how many m/s the velocity changes every second.",
    e: "Acceleration = change in velocity (m/s) ÷ time (s), so its unit is m/s per s = m/s².",
  },
];

export function acceleration(): Question {
  const k = rand(0, 5);
  if (k <= 1) {
    const a = pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 1.5, 2.5, -1.5, -2.5]);
    const t = rand(2, 6);
    const u = a > 0 ? rand(0, 10) : rand(Math.ceil(-a * t), 30);
    const v = clean(u + a * t);
    const who = a > 0 ? pick(["A cyclist speeds up", "A train speeds up", "A sprinter speeds up"]) : pick(["A car brakes", "A skateboard slows", "A bus slows"]);
    return mk({
      key: `acc-calc-${a}-${t}-${u}`,
      prompt: `${who} from ${u} m/s to ${ds(v)} m/s in ${t} s. What is its acceleration?`,
      unit: "m/s²",
      ...(Number.isInteger(a) ? signed(a) : choose(a, [-a, (v - u) / (t + 1), a * 2], 0.5)),
      hint: "a = (final velocity − starting velocity) ÷ time. Slowing down gives a negative answer.",
      explain: `a = (${ds(v)} − ${u}) ÷ ${t} = ${ds(a)} m/s²${a < 0 ? " (negative: slowing down)" : ""}.`,
    });
  }
  if (k === 2) {
    const T = 4;
    const a = pick([-3, -2, -1, 1, 2, 3]);
    const u = a > 0 ? 2 * rand(0, 2) : 2 * rand(Math.ceil((-a * T) / 2), 8);
    const v = u + a * T;
    return mk({
      key: `acc-vt-${a}-${u}`,
      prompt: "What is the acceleration?",
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "velocity (m/s)", x: [0, 8], y: [0, 16], lines: [{ from: [0, u], to: [T, v], colour: "berry" }], points: [{ x: 0, y: u }, { x: T, y: v }] },
      needsVisual: true,
      unit: "m/s²",
      ...signed(a),
      hint: "On a velocity–time graph, the slope is the acceleration.",
      explain: `The velocity changes from ${u} to ${v} m/s in ${T} s: a = (${v} − ${u}) ÷ ${T} = ${ds(a)} m/s².`,
    });
  }
  if (k === 3) {
    const u = rand(0, 12);
    const a = rand(1, 4);
    const t = rand(2, 8);
    return mk({
      key: `acc-final-${u}-${a}-${t}`,
      prompt: `A rocket sled moving at ${u} m/s accelerates at ${a} m/s² for ${t} s. How fast is it going then?`,
      unit: "m/s",
      ...keypad(u + a * t),
      hint: "Each second the velocity grows by a. v = u + at.",
      explain: `v = u + at = ${u} + ${a} × ${t} = ${u + a * t} m/s.`,
    });
  }
  if (k === 4) {
    const type = rand(0, 2);
    const s = rand(0, 3);
    const steps = type === 0 ? [1, 2, 3, 4, 5] : type === 1 ? [5, 4, 3, 2, 1] : Array(5).fill(rand(2, 3));
    const pos = [s];
    steps.forEach((d) => pos.push(pos[pos.length - 1] + d));
    const answers = ["Speeding up", "Slowing down", "Constant velocity"];
    return mk({
      key: `acc-strobe-${type}-${s}-${steps[0]}`,
      prompt: "A camera flashes once every second. How is this puck moving?",
      visual: { kind: "phys-motion", track: TRACK, rows: [{ positions: pos }], times: true },
      needsVisual: true,
      ...label(answers[type], [...answers.filter((x) => x !== answers[type]), "At rest"]),
      hint: "Compare the gaps between the dots. Each gap is how far it went in one second.",
      explain:
        type === 0
          ? "The gaps grow (1, 2, 3, 4, 5 m), so each second it goes farther: speeding up."
          : type === 1
            ? "The gaps shrink (5, 4, 3, 2, 1 m): slowing down."
            : `The gaps are all ${steps[0]} m: constant velocity of ${steps[0]} m/s.`,
    });
  }
  return card("acc", ACCEL_CARDS);
}

const VT_CARDS: Card[] = [
  {
    p: "On a velocity–time graph, the area between the line and the time axis is the…",
    a: "displacement",
    w: ["acceleration", "velocity", "force"],
    h: "For constant velocity, the area is a rectangle: velocity × time.",
    e: "Area = velocity × time = displacement. (Area below the axis counts as moving backward.)",
  },
  {
    p: "On a velocity–time graph, the slope is the…",
    a: "acceleration",
    w: ["displacement", "speed", "distance"],
    h: "Rise ÷ run = change in velocity ÷ change in time.",
    e: "Slope = Δv ÷ Δt = acceleration.",
  },
  {
    p: "A velocity–time graph sits below the time axis (negative velocity). The object is…",
    a: "moving backward",
    w: ["at rest", "slowing down for sure", "falling"],
    h: "The sign of the velocity is the direction of motion.",
    e: "Negative velocity means moving in the negative direction. The area there is a negative displacement.",
  },
];

/** A v–t graph from corner points, shaded underneath. */
function vtPlot(pts: [number, number][], ymax = 12): Visual {
  const fn = (t: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [t0, v0] = pts[i];
      const [t1, v1] = pts[i + 1];
      if (t >= t0 - 1e-9 && t <= t1 + 1e-9) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
    return 0;
  };
  return {
    kind: "plot",
    xLabel: "time (s)",
    yLabel: "velocity (m/s)",
    x: [0, 8],
    y: [0, ymax],
    lines: pts.slice(1).map((p, i) => ({ from: pts[i], to: p, colour: "berry" as const })),
    shade: { fn, from: pts[0][0], to: pts[pts.length - 1][0] },
  };
}

export function vtArea(): Question {
  const k = rand(0, 4);
  const base = { prompt: "How far does it travel?", needsVisual: true, unit: "m" };
  if (k === 0) {
    const v = 2 * rand(1, 5);
    const t = rand(2, 8);
    return mk({
      ...base,
      key: `vt-rect-${v}-${t}`,
      visual: vtPlot([[0, v], [t, v]]),
      ...keypad(v * t),
      hint: "The shaded area is a rectangle: height (velocity) × width (time).",
      explain: `Area = ${v} m/s × ${t} s = ${v * t} m.`,
    });
  }
  if (k === 1) {
    const v = 2 * rand(2, 6);
    const t = rand(2, 8);
    return mk({
      ...base,
      key: `vt-tri-${v}-${t}`,
      visual: vtPlot([[0, 0], [t, v]]),
      ...keypad((v * t) / 2),
      hint: "The shaded area is a triangle: ½ × base × height.",
      explain: `Area = ½ × ${t} s × ${v} m/s = ${(v * t) / 2} m.`,
    });
  }
  if (k === 2) {
    const u = 2 * rand(1, 3);
    const v = u + 2 * rand(1, 3);
    const t = rand(2, 8);
    return mk({
      ...base,
      key: `vt-trap-${u}-${v}-${t}`,
      visual: vtPlot([[0, u], [t, v]]),
      ...keypad(((u + v) / 2) * t),
      hint: "Split it into a rectangle and a triangle, or use average velocity × time.",
      explain: `Average velocity = (${u} + ${v}) ÷ 2 = ${(u + v) / 2} m/s, so distance = ${(u + v) / 2} × ${t} = ${((u + v) / 2) * t} m.`,
    });
  }
  if (k === 3) {
    const v = 2 * rand(2, 5);
    const t1 = rand(2, 4);
    const t2 = rand(2, 8 - t1);
    const d = (v * t1) / 2 + v * t2;
    return mk({
      ...base,
      key: `vt-two-${v}-${t1}-${t2}`,
      prompt: "It speeds up, then cruises. How far does it travel in total?",
      visual: vtPlot([[0, 0], [t1, v], [t1 + t2, v]]),
      ...keypad(d),
      hint: "Add the triangle (speeding up) and the rectangle (cruising).",
      explain: `Triangle ½ × ${t1} × ${v} = ${(v * t1) / 2} m, plus rectangle ${v} × ${t2} = ${v * t2} m: ${d} m.`,
    });
  }
  return card("vt", VT_CARDS);
}

export function drawXt(): Question {
  if (rand(0, 2) < 2) {
    const v = pick([1, 2, 3, -1, -2, 0.5]);
    const x0 = v > 0 ? rand(0, v === 0.5 ? 6 : 10 - 2 * v) : rand(-2 * v, 10);
    return act({
      key: `drawxt-${v}-${x0}`,
      prompt: `A cart starts at x = ${x0} m and moves at ${ds(v)} m/s. Draw its position–time line. Across: t (s); up: x (m).`,
      activity: { kind: "drawLine", m: v, b: x0, size: 10, quadrants: 1 },
      answer: x0,
      hint: `Start at (0, ${x0}). Each second the position changes by ${ds(v)} m, so the slope is ${ds(v)}.`,
      explain: `x = ${x0} ${v < 0 ? "−" : "+"} ${Math.abs(v)}t: a straight line through (0, ${x0}) with slope ${ds(v)}.`,
    });
  }
  const a = pick([1, 2, -1, -2, 0.5]);
  const u = a > 0 ? rand(0, a === 0.5 ? 6 : 4) : rand(-4 * a, 10);
  return act({
    key: `drawvt-${a}-${u}`,
    prompt: `A cart starts at ${u} m/s and accelerates at ${ds(a)} m/s². Draw its velocity–time line. Across: t (s); up: v (m/s).`,
    activity: { kind: "drawLine", m: a, b: u, size: 10, quadrants: 1 },
    answer: u,
    hint: `Start at (0, ${u}). The slope of a v–t graph is the acceleration, ${ds(a)}.`,
    explain: `v = u + at = ${u} ${a < 0 ? "−" : "+"} ${Math.abs(a)}t: a straight line through (0, ${u}) with slope ${ds(a)}.`,
  });
}

const WHICH_CARDS: Card[] = [
  {
    p: "A ball is thrown straight up and caught. Its velocity–time graph (up = +) is…",
    a: "a straight line sloping down, crossing zero at the top",
    w: ["a flat line", "an upside-down U", "a V shape touching zero"],
    h: "The acceleration is a constant 9.8 m/s² downward the whole time.",
    e: "Constant downward acceleration gives a straight v–t line with slope −9.8. It crosses v = 0 at the top.",
  },
  {
    p: "For a falling ball (no air), the acceleration–time graph (up = +) is…",
    a: "a flat line at −9.8 m/s²",
    w: ["a line sloping down", "a flat line at 0", "a curve"],
    h: "Is the acceleration changing as it falls?",
    e: "The acceleration is always g = 9.8 m/s² downward, so the a–t graph is flat at −9.8.",
  },
  {
    p: "A flat (horizontal) line on a velocity–time graph, above the axis, means…",
    a: "constant velocity",
    w: ["at rest", "speeding up", "slowing down"],
    h: "The height of a v–t graph is the velocity. Is it changing?",
    e: "The velocity stays the same: constant velocity, zero acceleration.",
  },
];

export function whichGraph(): Question {
  const k = rand(0, 4);
  if (k === 4) return card("which", WHICH_CARDS);
  const names = ["A", "B", "C"];
  const colours = ["wave", "berry", "leaf"] as const;
  if (k <= 1) {
    const c = rand(4, 10);
    const cats = [
      { q: "is standing still", fn: () => c },
      { q: "moves forward at a steady speed", fn: (t: number) => 2 + 1.5 * t },
      { q: "is moving back toward x = 0", fn: (t: number) => 14 - 1.5 * t },
      { q: "is speeding up", fn: (t: number) => 1 + 0.2 * t * t },
      { q: "is slowing down", fn: (t: number) => 1 + 3 * t - 0.1875 * t * t },
    ];
    const ids = shuffle([0, 1, 2, 3, 4]).slice(0, 3);
    const ask = rand(0, 2);
    return mk({
      key: `which-xt-${ids.join("")}-${ask}-${c}`,
      prompt: `Position–time graphs for objects A, B and C. Which one ${cats[ids[ask]].q}?`,
      visual: {
        kind: "plot",
        xLabel: "time (s)",
        yLabel: "position (m)",
        x: [0, 8],
        y: [0, 16],
        curves: ids.map((id, i) => ({ fn: cats[id].fn, colour: colours[i] })),
        points: ids.map((id, i) => ({ x: 2 + 2 * i, y: cats[id].fn(2 + 2 * i), label: names[i] })),
      },
      needsVisual: true,
      ...label(names[ask], names.filter((n) => n !== names[ask])),
      hint: "On an x–t graph the slope is velocity: flat = still, straight = steady, getting steeper = speeding up, flattening = slowing down.",
      explain: `${names[ask]} ${cats[ids[ask]].q}: look at how its slope behaves.`,
    });
  }
  const v = 2 * rand(2, 5);
  const cats = [
    { q: "moves at constant velocity", fn: () => v },
    { q: "is speeding up", fn: (t: number) => 1 + 1.2 * t },
    { q: "is slowing down", fn: (t: number) => 11 - 1.3 * t },
  ];
  const ids = shuffle([0, 1, 2]);
  const ask = rand(0, 2);
  return mk({
    key: `which-vt-${ids.join("")}-${ask}-${v}`,
    prompt: `Velocity–time graphs for objects A, B and C. Which one ${cats[ids[ask]].q}?`,
    visual: {
      kind: "plot",
      xLabel: "time (s)",
      yLabel: "velocity (m/s)",
      x: [0, 8],
      y: [0, 12],
      curves: ids.map((id, i) => ({ fn: cats[id].fn, colour: colours[i] })),
      points: ids.map((id, i) => ({ x: 1.5 + 2.5 * i, y: cats[id].fn(1.5 + 2.5 * i), label: names[i] })),
    },
    needsVisual: true,
    ...label(names[ask], names.filter((n) => n !== names[ask])),
    hint: "This is a velocity graph: its height is the speed. Rising = speeding up, falling = slowing down, flat = steady.",
    explain: `${names[ask]} ${cats[ids[ask]].q}: on a v–t graph, read the height and how it changes.`,
  });
}

export function suvat(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const u = rand(0, 10);
    const a = rand(1, 4);
    const t = rand(2, 6);
    return mk({
      key: `suvat-v-${u}-${a}-${t}`,
      prompt: `u = ${u} m/s, a = ${a} m/s², t = ${t} s. Find the final velocity v.`,
      unit: "m/s",
      ...keypad(u + a * t, [u * a * t, u + a, a * t]),
      hint: "v = u + at.",
      explain: `v = ${u} + ${a} × ${t} = ${u + a * t} m/s.`,
    });
  }
  if (k === 1) {
    const u = rand(0, 8);
    const a = pick([1, 2, 3, 4]);
    const t = rand(2, 6);
    const s = u * t + 0.5 * a * t * t;
    return mk({
      key: `suvat-s-${u}-${a}-${t}`,
      prompt: `A cart starts at ${u} m/s and accelerates at ${a} m/s² for ${t} s. How far does it go?`,
      unit: "m",
      ...keypad(s, [u * t + a * t * t, u * t, 0.5 * a * t * t]),
      hint: "s = ut + ½at². Don't forget the ½ and that t is squared.",
      explain: `s = ${u} × ${t} + ½ × ${a} × ${t}² = ${u * t} + ${0.5 * a * t * t} = ${s} m.`,
    });
  }
  if (k === 2) {
    const a = pick([1, 2, 3, 4, 5, 6, 8]);
    const t = rand(2, 6);
    const s = 0.5 * a * t * t;
    return mk({
      key: `suvat-a-${a}-${t}`,
      prompt: `A drag racer starts from rest and covers ${ds(s)} m in ${t} s with steady acceleration. What is its acceleration?`,
      unit: "m/s²",
      ...keypad(a, [s / t, s / (t * t), 2 * s / t]),
      hint: "From rest, s = ½at², so a = 2s ÷ t².",
      explain: `a = 2 × ${ds(s)} ÷ ${t}² = ${ds(2 * s)} ÷ ${t * t} = ${a} m/s².`,
    });
  }
  if (k === 3) {
    const u = rand(0, 10);
    const v = u + 2 * rand(1, 8);
    const t = rand(2, 9);
    const s = ((u + v) / 2) * t;
    return mk({
      key: `suvat-avg-${u}-${v}-${t}`,
      prompt: `A bike speeds up steadily from ${u} m/s to ${v} m/s in ${t} s. How far does it go?`,
      unit: "m",
      ...keypad(s, [v * t, u * t, (v - u) * t]),
      hint: "With steady acceleration, average velocity = (u + v) ÷ 2. Distance = average velocity × time.",
      explain: `Average = (${u} + ${v}) ÷ 2 = ${(u + v) / 2} m/s; s = ${(u + v) / 2} × ${t} = ${s} m.`,
    });
  }
  const a = pick([-2, -3, -4, -5, 2, 3, 4]);
  const t = rand(2, 6);
  const u = a > 0 ? rand(0, 6) : -a * t + rand(0, 4);
  const v = u + a * t;
  return mk({
    key: `suvat-t-${a}-${t}-${u}`,
    prompt: `A train ${a > 0 ? "speeds up" : "slows"} from ${u} m/s to ${v} m/s with a = ${ds(a)} m/s². How long does it take?`,
    unit: "s",
    ...keypad(t, [t + 1, Math.abs(v / a), Math.abs(u / a)].filter((x) => x !== t)),
    hint: "t = (v − u) ÷ a.",
    explain: `t = (${v} − ${u}) ÷ (${ds(a)}) = ${t} s.`,
  });
}

const BRAKE_CARDS: Card[] = [
  {
    p: "The road is wet, so the tyres grip less. What happens to the braking distance at the same speed?",
    a: "It gets longer",
    w: ["It gets shorter", "It stays the same", "Only the reaction distance changes"],
    h: "Less grip means less friction force, so a smaller deceleration.",
    e: "Less friction → smaller deceleration a → longer braking distance (d = u² ÷ 2a).",
  },
  {
    p: "A tired driver reacts more slowly. Which part of the stopping distance gets longer?",
    a: "The reaction (thinking) distance",
    w: ["The braking distance", "Both equally", "Neither"],
    h: "The car keeps going at full speed until the brakes are pressed.",
    e: "Reaction distance = speed × reaction time. Once the brakes are on, they work just as well.",
  },
  {
    p: "A driver doubles her speed. Her braking distance becomes…",
    a: "4 times as long",
    w: ["2 times as long", "the same", "8 times as long"],
    h: "d = u² ÷ 2a: what happens when u is doubled?",
    e: "Braking distance ∝ u², so 2× the speed gives 2² = 4× the braking distance.",
  },
];

export function braking(): Question {
  const k = rand(0, 5);
  if (k === 0) {
    const u = pick([10, 12, 14, 16, 20, 24, 30]);
    const a = pick([4, 5, 6, 8]);
    const d = r1((u * u) / (2 * a));
    return mk({
      key: `brake-d-${u}-${a}`,
      prompt: `A car at ${u} m/s brakes with a deceleration of ${a} m/s². What is its braking distance? Round to 1 decimal place.`,
      unit: "m",
      ...keypad(d),
      hint: "v² = u² + 2as with v = 0, so d = u² ÷ (2a).",
      explain: `d = ${u}² ÷ (2 × ${a}) = ${u * u} ÷ ${2 * a} = ${d} m.`,
    });
  }
  if (k === 1) {
    const u = pick([10, 15, 20]);
    const d0 = pick([8, 12, 15, 18, 20]);
    const f = pick([2, 3, 0.5]);
    const d1 = d0 * f * f;
    return mk({
      key: `brake-scale-${u}-${d0}-${f}`,
      prompt: `At ${u} m/s a car needs ${d0} m to brake. With the same brakes, how far does it need at ${ds(u * f)} m/s?`,
      unit: "m",
      ...choose(d1, [d0 * f, d0 * f * f * f, d0 + u * f], 1, 0),
      hint: "Braking distance ∝ speed². Find how many times faster, then square it.",
      explain: `The speed is ×${f}, so the distance is ×${f}² = ×${f * f}: ${d0} × ${f * f} = ${d1} m.`,
    });
  }
  if (k === 2) {
    const u = rand(10, 30);
    const tr = pick([0.5, 0.7, 1.0, 1.5]);
    return mk({
      key: `brake-react-${u}-${tr}`,
      prompt: `A driver at ${u} m/s has a reaction time of ${tr.toFixed(1)} s. How far does the car go before the brakes come on?`,
      unit: "m",
      ...keypad(r1(u * tr)),
      hint: "Before braking the car keeps its speed: distance = speed × time.",
      explain: `Reaction distance = ${u} × ${tr.toFixed(1)} = ${r1(u * tr)} m.`,
    });
  }
  if (k === 3) {
    const u = pick([10, 20, 30]);
    const tr = pick([0.5, 1.0]);
    const a = pick([5, 10]);
    const think = u * tr;
    const brake = (u * u) / (2 * a);
    return mk({
      key: `brake-total-${u}-${tr}-${a}`,
      prompt: `At ${u} m/s, with a ${tr.toFixed(1)} s reaction time and brakes giving ${a} m/s², what is the total stopping distance?`,
      unit: "m",
      ...keypad(think + brake, [brake, think, think + brake * 2]),
      hint: "Stopping distance = reaction distance (u × t) + braking distance (u² ÷ 2a).",
      explain: `Reaction: ${u} × ${tr.toFixed(1)} = ${think} m. Braking: ${u}² ÷ ${2 * a} = ${brake} m. Total ${think + brake} m.`,
    });
  }
  if (k === 4) {
    const u = pick([10, 20, 30]);
    const a = pick([4, 5, 8, 10]);
    const d = (u * u) / (2 * a);
    return mk({
      key: `brake-a-${u}-${a}`,
      prompt: `A cyclist stops from ${u} m/s in ${ds(d)} m. What was the deceleration (as a positive number)?`,
      unit: "m/s²",
      ...keypad(a, [u / d, (u * u) / d]),
      hint: "a = u² ÷ (2d).",
      explain: `a = ${u}² ÷ (2 × ${ds(d)}) = ${u * u} ÷ ${ds(2 * d)} = ${a} m/s².`,
    });
  }
  return card("brake", BRAKE_CARDS);
}

const FALL_CARDS: Card[] = [
  {
    p: "With no air, a bowling ball and a tennis ball are dropped together. Which lands first?",
    a: "They land together",
    w: ["The bowling ball", "The tennis ball", "It depends on the height"],
    h: "Every object falls with the same acceleration g when air doesn't matter.",
    e: "Gravity's pull is bigger on more mass, but more mass is harder to speed up: a = F ÷ m = g for both.",
  },
  {
    p: "A skydiver reaches terminal velocity. What is true?",
    a: "Air resistance equals her weight",
    w: ["Air resistance is zero", "Her weight is zero", "She is still speeding up"],
    h: "Terminal velocity means the speed stops changing.",
    e: "Constant velocity means zero net force: drag balances weight, so a = 0.",
  },
  {
    p: "An astronaut drops a hammer and a feather on the Moon. What happens?",
    a: "They hit the ground at the same time",
    w: ["The hammer lands first", "The feather floats away", "Neither falls"],
    h: "The Moon has gravity but no air.",
    e: "With no air resistance, both fall with the Moon's g (1.6 m/s²) and land together, as Apollo 15 showed.",
  },
];

export function freeFall(): Question {
  const k = rand(0, 5);
  if (k === 0) {
    const t = pick([1, 1.5, 2, 2.5, 3, 4, 5]);
    return mk({
      key: `fall-v-${t}`,
      prompt: `A stone is dropped from rest. How fast is it falling after ${ds(t)} s? (g = 9.8 m/s², no air)`,
      unit: "m/s",
      ...keypad(r1(G * t), [r1(4.9 * t * t), r1(G * t * t)]),
      hint: "v = gt: it gains 9.8 m/s every second.",
      explain: `v = 9.8 × ${ds(t)} = ${r1(G * t)} m/s.`,
    });
  }
  if (k === 1) {
    const t = pick([1, 2, 3, 4, 0.5, 1.5]);
    return mk({
      key: `fall-d-${t}`,
      prompt: `How far does a stone fall from rest in ${ds(t)} s? (g = 9.8 m/s², no air) Round to 1 decimal place.`,
      unit: "m",
      ...keypad(r1(4.9 * t * t)),
      hint: "s = ½gt² = 4.9t².",
      explain: `s = ½ × 9.8 × ${ds(t)}² = 4.9 × ${ds(t * t)} = ${r1(4.9 * t * t)} m.`,
    });
  }
  if (k === 2) {
    const h = pick([5, 10, 20, 30, 45, 60, 80]);
    const t = r1(Math.sqrt((2 * h) / G));
    return mk({
      key: `fall-t-${h}`,
      prompt: `A phone falls ${h} m from rest. How long does it take? (g = 9.8 m/s²) Round to 1 decimal place.`,
      unit: "s",
      ...keypad(t),
      hint: "h = ½gt², so t = √(2h ÷ g).",
      explain: `t = √(2 × ${h} ÷ 9.8) = √${r2((2 * h) / G)} ≈ ${t} s.`,
    });
  }
  if (k === 3) {
    const u = pick([5, 7, 10, 12, 14, 15, 20]);
    const top = rand(0, 1) === 1;
    const ans = top ? r1(u / G) : r1((u * u) / (2 * G));
    return mk({
      key: `fall-up-${u}-${top}`,
      prompt: `A ball is thrown straight up at ${u} m/s. ${top ? "How long until it reaches the top?" : "How high does it go?"} (g = 9.8 m/s²) Round to 1 decimal place.`,
      unit: top ? "s" : "m",
      ...keypad(ans),
      hint: top ? "At the top v = 0. It loses 9.8 m/s every second: t = u ÷ g." : "At the top v = 0: 0 = u² − 2gh, so h = u² ÷ 2g.",
      explain: top ? `t = ${u} ÷ 9.8 ≈ ${ans} s.` : `h = ${u}² ÷ (2 × 9.8) = ${u * u} ÷ 19.6 ≈ ${ans} m.`,
    });
  }
  return card("fall", FALL_CARDS);
}

export function launch(): Question {
  const k = rand(0, 2);
  if (k === 0) {
    const s = pick([12, 14, 15, 16, 18]);
    const ang = pick([15, 20, 25, 30, 35, 55, 60, 65, 70, 75]);
    const target = r1(launchDistance(s, ang, G));
    const width = Math.ceil((s * s) / G) + 4;
    return act({
      key: `launch-angle-${s}-${ang}`,
      prompt: `The cannon fires at ${s} m/s. Set the angle so the ball lands on the target ${target} m away. (g = 9.8 m/s²)`,
      activity: { kind: "phys-launch", g: G, angle: { min: 15, max: 75, step: 5 }, speed: s, target, tolerance: 0.6, width },
      answer: ang,
      hint: `Range = v² sin(2θ) ÷ g. The farthest shot is at 45°; ${ang}° and ${90 - ang}° give the same range.`,
      explain: `${ang}° (or ${90 - ang}°): R = ${s}² × sin(${2 * ang}°) ÷ 9.8 ≈ ${target} m.`,
    });
  }
  if (k === 1) {
    const ang = pick([30, 40, 45, 50, 60]);
    const s = rand(8, 18);
    const target = r1(launchDistance(s, ang, G));
    return act({
      key: `launch-speed-${s}-${ang}`,
      prompt: `The cannon is fixed at ${ang}°. Set the speed so the ball lands on the target ${target} m away. (g = 9.8 m/s²)`,
      activity: { kind: "phys-launch", g: G, angle: ang, speed: { min: 4, max: 20, step: 1 }, target, tolerance: 0.6, width: 45 },
      answer: s,
      hint: "Range grows with speed squared: double the speed, four times the range.",
      explain: `${s} m/s: R = ${s}² × sin(${2 * ang}°) ÷ 9.8 ≈ ${target} m.`,
    });
  }
  const h = pick([5, 10, 15, 20]);
  const s = rand(3, 10);
  const t = Math.sqrt((2 * h) / G);
  const target = r1(s * t);
  return act({
    key: `launch-cliff-${h}-${s}`,
    prompt: `Throw the ball straight out sideways from a ${h} m ledge. Set the speed so it lands ${target} m away. (g = 9.8 m/s²)`,
    activity: { kind: "phys-launch", g: G, height: h, angle: 0, speed: { min: 1, max: 12, step: 1 }, target, tolerance: 0.5, width: Math.max(20, Math.ceil(12 * t) + 2), launcher: "hand" },
    answer: s,
    hint: `First find the fall time: t = √(2h ÷ g) ≈ ${r2(t)} s. Then speed = distance ÷ time.`,
    explain: `t = √(2 × ${h} ÷ 9.8) ≈ ${r2(t)} s, so v = ${target} ÷ ${r2(t)} ≈ ${s} m/s.`,
  });
}

const PROJ_CARDS: Card[] = [
  {
    p: "One ball is dropped and another is fired sideways from the same height at the same moment. Which lands first?",
    a: "They land together",
    w: ["The dropped ball", "The fired ball", "It depends on the speed"],
    h: "Horizontal and vertical motion are independent.",
    e: "Both start with zero vertical velocity and fall with g, so they hit the ground at the same time.",
  },
  {
    p: "On level ground with no air, which launch angle gives the longest range?",
    a: "45°",
    w: ["30°", "60°", "90°"],
    h: "R = v² sin(2θ) ÷ g. When is sin(2θ) biggest?",
    e: "sin(2θ) is biggest (1) when 2θ = 90°, so θ = 45°.",
  },
  {
    p: "During a projectile's flight (no air), its horizontal velocity…",
    a: "stays the same",
    w: ["slows down", "speeds up", "is zero at the top"],
    h: "Is there any horizontal force?",
    e: "With no air resistance there's no horizontal force, so the horizontal velocity is constant. Only the vertical velocity changes.",
  },
  {
    p: "At the top of its path, a projectile's speed is…",
    a: "its horizontal speed only",
    w: ["0", "its launch speed", "9.8 m/s"],
    h: "At the top the vertical velocity is momentarily 0.",
    e: "Vertical velocity is 0 at the top, but it's still moving sideways at its horizontal speed.",
  },
];

export function projectiles(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const [h, t] = pick([[4.9, 1], [19.6, 2], [44.1, 3]] as [number, number][]);
    const v = rand(2, 12);
    const askTime = k === 0;
    return mk({
      key: `proj-ledge-${h}-${v}-${askTime}`,
      prompt: `A ball rolls off a ${h} m high table at ${v} m/s. ${askTime ? "How long is it in the air?" : "How far from the table does it land?"} (g = 9.8 m/s²)`,
      unit: askTime ? "s" : "m",
      ...keypad(askTime ? t : v * t),
      hint: askTime ? "The sideways speed doesn't matter for the time: h = ½gt²." : "First find the time from h = ½gt², then distance = speed × time.",
      explain: askTime ? `t = √(2 × ${h} ÷ 9.8) = ${t} s, whatever the sideways speed.` : `t = √(2 × ${h} ÷ 9.8) = ${t} s; distance = ${v} × ${t} = ${v * t} m.`,
    });
  }
  if (k === 2) {
    const [vy, tup] = pick([[9.8, 1], [19.6, 2], [14.7, 1.5], [4.9, 0.5]] as [number, number][]);
    const vx = rand(3, 12);
    const askRange = rand(0, 1) === 1;
    const total = 2 * tup;
    return mk({
      key: `proj-comp-${vy}-${vx}-${askRange}`,
      prompt: `A ball is launched on level ground with ${vx} m/s sideways and ${vy} m/s upward. ${askRange ? "How far away does it land?" : "How long is it in the air?"} (g = 9.8 m/s²)`,
      unit: askRange ? "m" : "s",
      ...keypad(askRange ? clean(vx * total) : total),
      hint: "Time to the top = vertical speed ÷ g. The way down takes as long as the way up.",
      explain: `Up: ${vy} ÷ 9.8 = ${tup} s, so ${total} s in the air.${askRange ? ` Range = ${vx} × ${total} = ${clean(vx * total)} m.` : ""}`,
    });
  }
  if (k === 3) {
    const [a, b, c] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]] as [number, number, number][]);
    const top = rand(0, 1) === 1;
    return mk({
      key: `proj-top-${a}-${b}-${top}`,
      prompt: `A ball is launched with ${a} m/s sideways and ${b} m/s upward. What is its speed ${top ? "at the top of its path" : "just after launch"}?`,
      unit: "m/s",
      ...choose(top ? a : c, [0, a + b, b, c].filter((x) => x !== (top ? a : c)), 1, 0),
      hint: top ? "At the top the vertical part is 0. What's left?" : "The two parts are at right angles: use Pythagoras.",
      explain: top ? `At the top only the sideways ${a} m/s is left.` : `Speed = √(${a}² + ${b}²) = ${c} m/s.`,
    });
  }
  return card("proj", PROJ_CARDS);
}

/* =================================================================== world 2: forces */

/** A box on the floor with weight and normal force drawn, plus horizontal forces. */
function floorForces(horizontal: { dir: number; size: number; label: string | number; colour?: "grape" }[], mass?: number, motion?: string): Visual {
  const w = Math.max(...horizontal.map((h) => h.size), 4) * 0.8;
  return {
    kind: "phys-forces",
    surface: "floor",
    objectLabel: mass,
    forces: [...horizontal, { dir: 90, size: w, label: "N", colour: "leaf" }, { dir: 270, size: w, label: "mg", colour: "night" }],
    motion: motion ? { dir: 0, label: motion } : undefined,
  };
}

const NET_CARDS: Card[] = [
  {
    p: "A hockey puck slides in a straight line at constant velocity on frictionless ice. The net force on it is…",
    a: "0 N",
    w: ["in the direction it moves", "opposite to its motion", "equal to its weight"],
    h: "Newton's first law: what does it take to keep moving at a steady velocity?",
    e: "Constant velocity means zero acceleration, so the net force is 0. No force is needed to keep moving.",
  },
  {
    p: "A car cruises at a steady 25 m/s on a straight, flat road. How does the engine's driving force compare with drag + friction?",
    a: "They are equal",
    w: ["The driving force is bigger", "Drag + friction is bigger", "There is no drag"],
    h: "Steady velocity: is the car accelerating?",
    e: "No acceleration means balanced forces: the driving force exactly equals the resistive forces.",
  },
  {
    p: "The forces on an object are balanced. The object…",
    a: "keeps the same velocity",
    w: ["must be at rest", "slows down", "speeds up"],
    h: "Balanced forces mean a = 0. Does a = 0 mean v = 0?",
    e: "Balanced forces give zero acceleration: it stays at rest or keeps moving at a steady velocity.",
  },
];

export function netForce(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const F1 = 5 * rand(2, 12);
    let F2 = 5 * rand(1, 12);
    if (F2 === F1) F2 += 5;
    return mk({
      key: `net-two-${F1}-${F2}`,
      prompt: "What is the net horizontal force on the box? (right is +)",
      visual: floorForces([{ dir: 0, size: F1, label: F1 }, { dir: 180, size: F2, label: F2 }]),
      needsVisual: true,
      unit: "N",
      ...signed(F1 - F2),
      hint: "Add forces with signs: right +, left −. The up and down forces cancel.",
      explain: `Net = ${F1} − ${F2} = ${ds(F1 - F2)} N (${F1 > F2 ? "to the right" : "to the left"}).`,
    });
  }
  if (k === 1) {
    const a = 2 * rand(2, 10);
    const b = 2 * rand(1, 8);
    const c = 2 * rand(2, 14);
    return mk({
      key: `net-three-${a}-${b}-${c}`,
      prompt: "Three people push a sofa. What is the net horizontal force? (right is +)",
      visual: floorForces([{ dir: 0, size: a, label: a }, { dir: 0, size: b, label: b, colour: "grape" }, { dir: 180, size: c, label: c }]),
      needsVisual: true,
      unit: "N",
      ...signed(a + b - c),
      hint: "Add the two pushes to the right, then subtract the push to the left.",
      explain: `Net = ${a} + ${b} − ${c} = ${ds(a + b - c)} N.`,
    });
  }
  if (k === 2) {
    const [a, b, c] = pick(TRIPLES);
    return mk({
      key: `net-perp-${a}-${b}`,
      prompt: `Two ropes pull a ring: ${a} N east and ${b} N north. How big is the net force?`,
      visual: { kind: "phys-forces", object: "dot", forces: [{ dir: 0, size: a, label: a }, { dir: 90, size: b, label: b }] },
      unit: "N",
      ...choose(c, [a + b, Math.abs(a - b), c + 2], 1, 1),
      hint: "Forces at right angles add like the sides of a right triangle.",
      explain: `Net = √(${a}² + ${b}²) = √${c * c} = ${c} N, pointing north-east.`,
    });
  }
  if (k === 3) {
    const L = 10 * rand(30, 60);
    let R = 10 * rand(30, 60);
    if (R === L) R += 20;
    const net = Math.abs(L - R);
    const dir = R > L ? "right" : "left";
    return mk({
      key: `net-tug-${L}-${R}`,
      prompt: `Tug of war: team A pulls left with ${L} N, team B pulls right with ${R} N. What is the net force on the rope?`,
      ...label(`${net} N ${dir}`, [`${net} N ${dir === "right" ? "left" : "right"}`, `${L + R} N ${dir}`, "0 N"]),
      hint: "Opposite forces subtract. The bigger one wins the direction.",
      explain: `${Math.max(L, R)} − ${Math.min(L, R)} = ${net} N toward team ${R > L ? "B (right)" : "A (left)"}.`,
    });
  }
  return card("net", NET_CARDS);
}

const FMA_CARDS: Card[] = [
  {
    p: "In F = ma, which force is F?",
    a: "The net (total) force",
    w: ["The biggest force", "Only the push", "The weight"],
    h: "Acceleration comes from all the forces together.",
    e: "F is the net force: add up every force (with directions) first.",
  },
  {
    p: "The same push acts on an empty shopping cart and a full one. Which accelerates more?",
    a: "The empty cart",
    w: ["The full cart", "They accelerate equally", "Neither moves"],
    h: "a = F ÷ m. Same F, which m is smaller?",
    e: "a = F ÷ m: less mass, more acceleration.",
  },
  {
    p: "One newton is the force that…",
    a: "gives 1 kg an acceleration of 1 m/s²",
    w: ["lifts 1 kg by 1 m", "moves 1 kg at 1 m/s", "weighs 1 kg on Earth"],
    h: "1 N = 1 kg × 1 m/s².",
    e: "From F = ma: 1 N = 1 kg·m/s², the force that accelerates 1 kg at 1 m/s².",
  },
];

export function fma(): Question {
  const k = rand(0, 5);
  const m = pick([1, 2, 4, 5, 8, 10, 12, 20, 25]);
  const a = pick([0.5, 1, 1.5, 2, 3, 4, 5, 6]);
  const F = clean(m * a);
  if (k === 0)
    return mk({
      key: `fma-a-${m}-${a}`,
      prompt: `A net force of ${ds(F)} N acts on a ${m} kg cart. What is its acceleration?`,
      visual: { kind: "phys-forces", surface: "floor", objectLabel: m, forces: [{ dir: 0, size: F, label: F }], motion: { dir: 0, label: "a = ?" } },
      unit: "m/s²",
      ...keypad(a, [F * m, m / F]),
      hint: "a = F ÷ m.",
      explain: `a = ${ds(F)} ÷ ${m} = ${ds(a)} m/s².`,
    });
  if (k === 1)
    return mk({
      key: `fma-f-${m}-${a}`,
      prompt: `What net force gives a ${m} kg sled an acceleration of ${ds(a)} m/s²?`,
      visual: { kind: "phys-forces", surface: "floor", object: "🛷", objectLabel: m, forces: [{ dir: 0, size: 5, label: "F = ?" }], motion: { dir: 0, label: `a = ${ds(a)} m/s²` } },
      unit: "N",
      ...keypad(F, [m / a, m + a]),
      hint: "F = m × a.",
      explain: `F = ${m} × ${ds(a)} = ${ds(F)} N.`,
    });
  if (k === 2)
    return mk({
      key: `fma-m-${m}-${a}`,
      prompt: `A net force of ${ds(F)} N gives a box an acceleration of ${ds(a)} m/s². What is its mass?`,
      unit: "kg",
      ...keypad(m, [F * a, a / F]),
      hint: "m = F ÷ a.",
      explain: `m = ${ds(F)} ÷ ${ds(a)} = ${m} kg.`,
    });
  if (k === 3) {
    const mm = pick([2, 4, 5, 10]);
    const f = 2 * rand(1, 5);
    const aa = rand(1, 4);
    const P = f + mm * aa;
    return mk({
      key: `fma-fric-${mm}-${f}-${aa}`,
      prompt: `A ${P} N push acts on a ${mm} kg crate against ${f} N of friction. What is its acceleration?`,
      visual: floorForces([{ dir: 0, size: P, label: P }, { dir: 180, size: f, label: f }], mm, "a = ?"),
      unit: "m/s²",
      ...keypad(aa, [P / mm, (P + f) / mm]),
      hint: "First the net force (push − friction), then a = net force ÷ m.",
      explain: `Net = ${P} − ${f} = ${P - f} N; a = ${P - f} ÷ ${mm} = ${aa} m/s².`,
    });
  }
  if (k === 4) {
    const [fF, fM] = pick([[2, 1], [3, 1], [1, 2], [2, 2], [2, 0.5], [3, 3], [1, 0.5], [0.5, 2]] as [number, number][]);
    const a0 = pick([2, 4, 6, 8, 12]);
    const a1 = clean((a0 * fF) / fM);
    const fw = (x: number) => (x === 1 ? "the same" : x === 0.5 ? "halved" : x === 2 ? "doubled" : "tripled");
    return mk({
      key: `fma-scale-${fF}-${fM}-${a0}`,
      prompt: `A cart accelerates at ${a0} m/s². The net force is ${fw(fF)} and the mass is ${fw(fM)}. What is the new acceleration?`,
      unit: "m/s²",
      ...choose(a1, [a0 * fF * fM, a0 / fF / fM, a0].filter((x) => Math.abs(x - a1) > 1e-9), 1, 0),
      hint: "a = F ÷ m: multiply by the force factor, divide by the mass factor.",
      explain: `a = ${a0} × ${fF} ÷ ${fM} = ${ds(a1)} m/s².`,
    });
  }
  return card("fma", FMA_CARDS);
}

export function balanceArrows(): Question {
  const v = rand(0, 4);
  if (v === 0) {
    const w = rand(2, 6);
    const obj = pick(["📕", "🪴", "📦", "🎂"]);
    return act({
      key: `bal-table-${w}-${obj}`,
      prompt: `This rests on a table. Its weight is ${w} N. Draw the normal force so the forces balance (arrow lengths in N).`,
      activity: { kind: "phys-forceArrows", object: obj, surface: "floor", directions: 8, maxSize: 6, given: [{ dir: 270, size: w, label: "F_g" }], arrows: [{ label: "N", answer: { dir: 90, size: w } }] },
      answer: w,
      hint: "At rest means the net force is 0. The table pushes up as hard as gravity pulls down.",
      explain: `The normal force is ${w} N straight up, balancing the ${w} N weight.`,
    });
  }
  if (v === 1) {
    const w = rand(2, 6);
    return act({
      key: `bal-hang-${w}`,
      prompt: `A ${w} N lamp hangs at rest from a cord. Draw the tension force (arrow lengths in N).`,
      activity: { kind: "phys-forceArrows", object: "💡", surface: "ceiling", directions: 8, maxSize: 6, given: [{ dir: 270, size: w, label: "F_g" }], arrows: [{ label: "T", answer: { dir: 90, size: w } }] },
      answer: w,
      hint: "Hanging still: the cord pulls up exactly as hard as gravity pulls down.",
      explain: `T = ${w} N upward, so the net force is 0.`,
    });
  }
  if (v === 2) {
    const a = rand(1, 6);
    let b = rand(1, 6);
    if (a === b) b = a === 6 ? 5 : a + 1;
    const d = a - b;
    return act({
      key: `bal-three-${a}-${b}`,
      prompt: `Two forces act on a crate: ${a} N right and ${b} N left. Add one force so the crate's velocity stays constant.`,
      activity: {
        kind: "phys-forceArrows",
        object: "📦",
        directions: 8,
        maxSize: 6,
        given: [{ dir: 0, size: a, label: `${a} N` }, { dir: 180, size: b, label: `${b} N` }],
        arrows: [{ label: "F", answer: { dir: d > 0 ? 180 : 0, size: Math.abs(d) } }],
      },
      answer: Math.abs(d),
      hint: "Constant velocity means zero net force. Find the leftover force, then add its opposite.",
      explain: `Now the net is ${Math.abs(d)} N ${d > 0 ? "right" : "left"}, so add ${Math.abs(d)} N ${d > 0 ? "left" : "right"}.`,
    });
  }
  if (v === 3) {
    const p = rand(2, 5);
    const w = rand(3, 6);
    return act({
      key: `bal-push-${p}-${w}`,
      prompt: `You push a ${w} N box across a rough floor with ${p} N at a steady speed. Draw the normal force and the friction.`,
      activity: {
        kind: "phys-forceArrows",
        object: "📦",
        surface: "floor",
        directions: 8,
        maxSize: 6,
        given: [{ dir: 0, size: p, label: "push" }, { dir: 270, size: w, label: "F_g" }],
        arrows: [{ label: "N", answer: { dir: 90, size: w } }, { label: "f", answer: { dir: 180, size: p } }],
      },
      answer: p,
      hint: "Steady speed means balanced forces, up–down and left–right.",
      explain: `N = ${w} N up balances the weight; friction = ${p} N left balances the push.`,
    });
  }
  const a = rand(1, 5);
  const b = rand(1, 5);
  return act({
    key: `bal-2d-${a}-${b}`,
    prompt: `A ring is pulled ${a} N right and ${b} N up. Add two forces (along the grid lines) to hold it still.`,
    activity: {
      kind: "phys-forceArrows",
      object: "dot",
      directions: 4,
      maxSize: 6,
      given: [{ dir: 0, size: a, label: `${a} N` }, { dir: 90, size: b, label: `${b} N` }],
      arrows: [{ label: "F₁", answer: { dir: 180, size: a } }, { label: "F₂", answer: { dir: 270, size: b } }],
    },
    answer: a * 10 + b,
    hint: "Balance each direction separately: left must cancel right, down must cancel up.",
    explain: `${a} N left and ${b} N down make the net force 0. (One ${Math.round(Math.hypot(a, b) * 10) / 10} N force pointing down-left would also work.)`,
  });
}

const FBD_FORCES = ["Friction", "Tension", "Normal force", "Air resistance", "Thrust", "Weight", "Buoyancy"];

const FBD_SCENES: { what: string; v: Visual; a: string; why: string }[] = [
  {
    what: "A box slides right across a rough floor, slowing down.",
    v: { kind: "phys-forces", object: "📦", surface: "floor", forces: [{ dir: 90, size: 5, label: "N" }, { dir: 270, size: 5, label: "mg" }, { dir: 180, size: 3, label: "?" }], motion: { dir: 0, label: "v" } },
    a: "Friction",
    why: "Friction acts along the surface, against the sliding.",
  },
  {
    what: "A lamp hangs from a cord.",
    v: { kind: "phys-forces", object: "💡", surface: "ceiling", forces: [{ dir: 90, size: 4, label: "?" }, { dir: 270, size: 4, label: "mg" }] },
    a: "Tension",
    why: "A rope or cord pulls along itself: tension.",
  },
  {
    what: "A book rests on a table.",
    v: { kind: "phys-forces", object: "📕", surface: "floor", forces: [{ dir: 90, size: 4, label: "?" }, { dir: 270, size: 4, label: "mg" }] },
    a: "Normal force",
    why: "A surface pushes back perpendicular to itself: the normal force.",
  },
  {
    what: "A skydiver falls at a steady speed.",
    v: { kind: "phys-forces", object: "🪂", forces: [{ dir: 90, size: 5, label: "?" }, { dir: 270, size: 5, label: "mg" }], motion: { dir: 270, label: "v" } },
    a: "Air resistance",
    why: "Air pushes against the motion through it: air resistance (drag).",
  },
  {
    what: "A rocket lifts off.",
    v: { kind: "phys-forces", object: "🚀", forces: [{ dir: 90, size: 7, label: "?" }, { dir: 270, size: 4, label: "mg" }], motion: { dir: 90, label: "a" } },
    a: "Thrust",
    why: "Hot gas is pushed down out of the engine, and it pushes the rocket up: thrust.",
  },
  {
    what: "A ball flies through the air (ignore air resistance).",
    v: { kind: "phys-forces", object: "⚽", forces: [{ dir: 270, size: 4, label: "?" }], motion: { dir: 30, label: "v" } },
    a: "Weight",
    why: "Once it's thrown, nothing pushes it along. Only gravity (its weight) acts.",
  },
  {
    what: "A boat floats on a lake.",
    v: { kind: "phys-forces", object: "⛵", forces: [{ dir: 90, size: 5, label: "?" }, { dir: 270, size: 5, label: "mg" }] },
    a: "Buoyancy",
    why: "Water pushes up on anything in it: buoyancy (upthrust).",
  },
];

const COUNT_FORCES: { what: string; n: number; list: string }[] = [
  { what: "a book resting on a table", n: 2, list: "weight and the normal force" },
  { what: "a ball in mid-air (ignore air resistance)", n: 1, list: "only its weight" },
  { what: "a box pulled by a rope across a rough floor", n: 4, list: "weight, normal force, tension and friction" },
  { what: "a lamp hanging from a cord", n: 2, list: "weight and tension" },
  { what: "a skydiver at terminal velocity", n: 2, list: "weight and air resistance" },
  { what: "a car speeding up on a flat road (with air)", n: 4, list: "weight, normal force, the road's forward friction and air resistance" },
  { what: "a crate sliding down a rough ramp", n: 3, list: "weight, normal force and friction" },
];

const FBD_CARDS: Card[] = [
  {
    p: "The book's weight is Earth pulling down on the book. Its Newton's third-law partner is…",
    a: "the book pulling up on Earth",
    w: ["the table pushing up on the book", "the book pushing down on the table", "the table's weight"],
    h: "Third-law pairs act on two different objects and are the same type of force.",
    e: "Earth pulls the book down (gravity), so the book pulls Earth up (gravity). The normal force is a different force that just happens to balance it.",
  },
  {
    p: "For a block on a ramp, the normal force points…",
    a: "perpendicular to the ramp's surface",
    w: ["straight up", "straight down", "down the ramp"],
    h: "'Normal' means at right angles to the surface.",
    e: "The ramp can only push straight out of its surface, so the normal force is perpendicular to the ramp, not straight up.",
  },
  {
    p: "A ball is thrown upward and is still rising. Is there an upward force on it (ignore air)?",
    a: "No: only gravity, pulling down",
    w: ["Yes: the force of the throw", "Yes: its momentum", "Yes: a force that fades away"],
    h: "Once it leaves your hand, what's still touching it?",
    e: "The throw only acts while your hand touches it. In flight only gravity acts; the ball rises because it already has upward velocity.",
  },
];

export function fbd(): Question {
  const k = rand(0, 5);
  if (k <= 1) {
    const i = rand(0, FBD_SCENES.length - 1);
    const s = FBD_SCENES[i];
    return mk({
      key: `fbd-name-${i}`,
      prompt: `${s.what} Which force is marked "?"`,
      visual: s.v,
      needsVisual: true,
      ...label(s.a, FBD_FORCES.filter((f) => f !== s.a)),
      hint: "Think about what touches the object (surfaces, ropes, air, water) and what pulls at a distance (gravity).",
      explain: s.why,
    });
  }
  if (k === 2) {
    const i = rand(0, COUNT_FORCES.length - 1);
    const c = COUNT_FORCES[i];
    return mk({
      key: `fbd-count-${i}`,
      prompt: `How many forces act on ${c.what}?`,
      ...choose(c.n, [c.n + 1, c.n - 1, c.n + 2], 1, 1),
      hint: "Gravity always acts. Then count every surface, rope, or fluid touching it.",
      explain: `${c.n}: ${c.list}.`,
    });
  }
  if (k === 3) {
    const r = 2 * rand(1, 6);
    let l = 2 * rand(1, 6);
    const n = rand(4, 8);
    if (rand(0, 3) === 0) l = r;
    const answers = ["Right", "Left", "Up", "Down", "It doesn't accelerate"];
    const correct = r > l ? "Right" : r < l ? "Left" : "It doesn't accelerate";
    return mk({
      key: `fbd-dir-${r}-${l}-${n}`,
      prompt: "Which way does this cart accelerate?",
      visual: { kind: "phys-forces", surface: "floor", objectLabel: 2, forces: [{ dir: 0, size: r, label: r }, { dir: 180, size: l, label: l }, { dir: 90, size: n, label: n }, { dir: 270, size: n, label: n }] },
      needsVisual: true,
      ...label(correct, answers.filter((x) => x !== correct)),
      hint: "Add the forces in each direction. The acceleration points the same way as the net force.",
      explain: r === l ? `Up and down cancel (${n} N each), and so do left and right (${r} N each): no acceleration.` : `Up and down cancel. Net horizontal = ${Math.abs(r - l)} N ${correct.toLowerCase()}, so it accelerates ${correct.toLowerCase()}.`,
    });
  }
  return card("fbd", FBD_CARDS);
}

const WEIGHT_CARDS: Card[] = [
  {
    p: "An astronaut with a mass of 70 kg on Earth travels to the Moon. Her mass there is…",
    a: "70 kg",
    w: ["less than 70 kg", "more than 70 kg", "0 kg"],
    h: "Mass is the amount of matter. Weight is the pull of gravity on it.",
    e: "Mass doesn't depend on where you are. Her weight drops (the Moon's g is 1.6 m/s²) but her mass stays 70 kg.",
  },
  {
    p: "Weight is measured in…",
    a: "newtons (N)",
    w: ["kilograms (kg)", "m/s²", "joules (J)"],
    h: "Weight is a force.",
    e: "Weight is the force of gravity, W = mg, so it's in newtons. Kilograms measure mass.",
  },
  {
    p: "A bathroom scale really measures…",
    a: "how hard you push down on it",
    w: ["your mass directly", "your volume", "the speed of gravity"],
    h: "In a lift that speeds up, the reading changes. What changes?",
    e: "It measures the normal force (your push on it) and divides by 9.8 to show kg. That's why it reads wrong in an accelerating lift.",
  },
];

const PLANETS: [string, number][] = [
  ["the Moon", 1.6],
  ["Mars", 3.7],
  ["Jupiter", 24.8],
  ["Venus", 8.9],
];

export function weight(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const m = pick([2, 5, 8, 12, 15, 20, 45, 50, 60, 75]);
    return mk({
      key: `wt-earth-${m}`,
      prompt: `What is the weight of a ${m} kg object on Earth? (g = 9.8 m/s²)`,
      unit: "N",
      ...keypad(r1(m * G)),
      hint: "W = mg.",
      explain: `W = ${m} × 9.8 = ${r1(m * G)} N.`,
    });
  }
  if (k === 1) {
    const [where, g] = pick(PLANETS);
    const m = pick([10, 20, 50, 60, 70, 80]);
    return mk({
      key: `wt-planet-${where}-${m}`,
      prompt: `On ${where}, g = ${g} m/s². What does a ${m} kg rover weigh there?`,
      unit: "N",
      ...keypad(r1(m * g)),
      hint: "W = mg with that planet's g. The mass doesn't change.",
      explain: `W = ${m} × ${g} = ${r1(m * g)} N (on Earth it would be ${r1(m * G)} N).`,
    });
  }
  if (k === 2) {
    const m = pick([2, 3, 5, 10, 15, 20, 40, 50]);
    const W = r1(m * G);
    return mk({
      key: `wt-mass-${m}`,
      prompt: `A suitcase weighs ${W} N on Earth. What is its mass? (g = 9.8 m/s²)`,
      unit: "kg",
      ...keypad(m, [r1(W * G)]),
      hint: "m = W ÷ g.",
      explain: `m = ${W} ÷ 9.8 = ${m} kg.`,
    });
  }
  if (k === 3) {
    const [where, g] = pick(PLANETS);
    const W = pick([98, 196, 490, 686]);
    const m = W / G;
    return mk({
      key: `wt-move-${where}-${W}`,
      prompt: `A robot weighs ${W} N on Earth. What does it weigh on ${where} (g = ${g} m/s²)? Round to 1 decimal place.`,
      unit: "N",
      ...keypad(r1(m * g)),
      hint: "First find the mass (W ÷ 9.8), then multiply by the new g.",
      explain: `m = ${W} ÷ 9.8 = ${ds(m)} kg; W = ${ds(m)} × ${g} = ${r1(m * g)} N.`,
    });
  }
  return card("wt", WEIGHT_CARDS);
}

const FRICTION_CARDS: Card[] = [
  {
    p: "Is it usually harder to start a heavy box sliding, or to keep it sliding?",
    a: "To start it sliding",
    w: ["To keep it sliding", "They're always the same", "Neither needs a force"],
    h: "Compare static friction with kinetic friction.",
    e: "The maximum static friction (μₛN) is usually bigger than kinetic friction (μₖN), so starting takes more force.",
  },
  {
    p: "A car speeds up from a traffic light. What force pushes the car forward?",
    a: "Friction from the road on the tyres",
    w: ["The engine pushing the car", "Air pushing from behind", "The car's momentum"],
    h: "The tyres push backward on the road. Newton's third law…",
    e: "The tyres push back on the road, and the road pushes forward on the tyres with static friction. On ice, there's no grip and no go.",
  },
  {
    p: "Kinetic friction on a sliding object always acts…",
    a: "opposite to the sliding",
    w: ["in the direction of motion", "straight down", "straight up"],
    h: "Friction resists surfaces slipping past each other.",
    e: "Kinetic friction points along the surface, opposite to the direction of sliding.",
  },
];

export function friction(): Question {
  const k = rand(0, 4);
  const m = pick([2, 5, 10, 20, 25, 40, 50]);
  const mu = pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]);
  const N = r1(m * G);
  const fmax = r1(mu * m * G);
  if (k === 0)
    return mk({
      key: `fric-f-${m}-${mu}`,
      prompt: `A ${m} kg crate slides across a floor with μₖ = ${mu}. What is the friction force? Round to 1 decimal place.`,
      visual: { kind: "phys-forces", object: "📦", surface: "floor", objectLabel: m, forces: [{ dir: 180, size: 3, label: "f = ?" }, { dir: 90, size: 6, label: "N" }, { dir: 270, size: 6, label: "mg" }], motion: { dir: 0, label: "v" } },
      unit: "N",
      ...keypad(fmax),
      hint: "f = μN, and on a level floor N = mg.",
      explain: `N = ${m} × 9.8 = ${N} N; f = ${mu} × ${N} = ${fmax} N.`,
    });
  if (k === 1) {
    const ratio = pick([0.6, 0.8, 1.2, 1.5]);
    const P = Math.round(fmax * ratio);
    const moves = P > fmax;
    return mk({
      key: `fric-move-${m}-${mu}-${ratio}`,
      prompt: `A ${m} kg box rests on a floor with μₛ = ${mu}. You push it sideways with ${P} N. Does it start to slide?`,
      ...label(moves ? "Yes" : "No", [moves ? "No" : "Yes"]),
      hint: "Static friction can grow up to μₛN. Compare your push with that maximum.",
      explain: `Max static friction = ${mu} × ${m} × 9.8 = ${fmax} N. ${moves ? `${P} N is more, so it slides.` : `${P} N is less, so static friction matches it and the box stays put.`}`,
    });
  }
  if (k === 2) {
    const mm = pick([2, 4, 5, 10]);
    const muk = pick([0.1, 0.2, 0.3]);
    const f = mm * muk * G;
    const P = Math.ceil(f) + 2 * rand(2, 8);
    const a = r1((P - f) / mm);
    return mk({
      key: `fric-a-${mm}-${muk}-${P}`,
      prompt: `A ${P} N push moves a ${mm} kg box over a floor with μₖ = ${muk}. What is its acceleration? Round to 1 decimal place.`,
      unit: "m/s²",
      ...keypad(a),
      hint: "Friction = μmg. Net force = push − friction. Then a = net force ÷ m.",
      explain: `f = ${muk} × ${mm} × 9.8 = ${r2(f)} N; net = ${P} − ${r2(f)} = ${r2(P - f)} N; a = ${r2(P - f)} ÷ ${mm} ≈ ${a} m/s².`,
    });
  }
  if (k === 3) {
    const muk = pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
    const mm = pick([5, 10, 20]);
    const P = r1(muk * mm * G);
    return mk({
      key: `fric-mu-${muk}-${mm}`,
      prompt: `It takes ${P} N to drag a ${mm} kg sled at a steady speed. What is the coefficient of kinetic friction μₖ?`,
      ...choose(muk, [r2(P / mm), r2(muk * 2), r2(muk / 2)], 0.05, 0.05),
      hint: "Steady speed: push = friction = μmg. So μ = push ÷ (mg).",
      explain: `μₖ = ${P} ÷ (${mm} × 9.8) = ${P} ÷ ${r1(mm * G)} = ${muk}.`,
    });
  }
  return card("fric", FRICTION_CARDS);
}

export function netArrows(): Question {
  const v = rand(0, 3);
  if (v === 0) {
    const [m, a] = pick([[1, 2], [1, 3], [2, 1], [2, 2], [1, 4], [1, 1], [3, 1]] as [number, number][]);
    const f = rand(1, 6 - m * a);
    return act({
      key: `netarr-push-${m}-${a}-${f}`,
      prompt: `A ${m} kg cart speeds up at ${a} m/s² to the right. Friction is ${f} N. Draw the push F (arrow lengths in N).`,
      activity: {
        kind: "phys-forceArrows",
        object: "🛒",
        surface: "floor",
        directions: 8,
        maxSize: 6,
        given: [{ dir: 180, size: f, label: "f" }],
        arrows: [{ label: "F", answer: { dir: 0, size: m * a + f } }],
        net: { x: m * a, y: 0 },
      },
      answer: m * a + f,
      hint: `The net force must be ma = ${m * a} N to the right, and the push also has to beat the friction.`,
      explain: `F − ${f} = ${m} × ${a}, so F = ${m * a + f} N to the right.`,
    });
  }
  if (v === 1) {
    const [W, net] = pick([[2, 1], [2, 2], [4, 1], [4, 2], [4, -2], [4, -1], [5, 1], [5, -1], [5, -2], [2, -1]] as [number, number][]);
    const a = (10 * net) / W;
    return act({
      key: `netarr-lift-${W}-${net}`,
      prompt: `A ${W} N toy hangs from a string in a lift accelerating ${net > 0 ? "upward" : "downward"} at ${ds(Math.abs(a))} m/s². Draw the tension (use g = 10 m/s², lengths in N).`,
      activity: {
        kind: "phys-forceArrows",
        object: "🧸",
        surface: "ceiling",
        directions: 8,
        maxSize: 6,
        given: [{ dir: 270, size: W, label: "F_g" }],
        arrows: [{ label: "T", answer: { dir: 90, size: W + net } }],
        net: { x: 0, y: net },
      },
      answer: W + net,
      hint: `Mass = ${W} ÷ 10 = ${W / 10} kg. Net force = ma, pointing the way it accelerates. T − W = ma.`,
      explain: `ma = ${W / 10} × ${ds(a)} = ${Math.abs(net)} N ${net > 0 ? "up" : "down"}, so T = ${W} ${net > 0 ? "+" : "−"} ${Math.abs(net)} = ${W + net} N.`,
    });
  }
  if (v === 2) {
    const [m, a] = pick([[1, 2], [1, 3], [2, 1], [2, 2], [1, 4], [3, 1], [1, 5], [2, 3]] as [number, number][]);
    const w = rand(3, 6);
    return act({
      key: `netarr-slow-${m}-${a}-${w}`,
      prompt: `A ${m} kg puck slides right on rough ice and slows at ${a} m/s². Draw the friction force (lengths in N).`,
      activity: {
        kind: "phys-forceArrows",
        object: "🏒",
        surface: "floor",
        directions: 8,
        maxSize: 6,
        given: [{ dir: 90, size: w, label: "N" }, { dir: 270, size: w, label: "F_g" }],
        arrows: [{ label: "f", answer: { dir: 180, size: m * a } }],
        net: { x: -m * a, y: 0 },
      },
      answer: m * a,
      hint: "Slowing down while moving right means the acceleration (and the net force) points left.",
      explain: `Friction is the only sideways force: f = ma = ${m} × ${a} = ${m * a} N to the left.`,
    });
  }
  const a = rand(1, 4);
  const nx = rand(a + 1, 6);
  const ny = rand(1, 5);
  return act({
    key: `netarr-2d-${a}-${nx}-${ny}`,
    prompt: `Force A is ${a} N right. Use arrows B₁ and B₂ to make the net force ${nx} N right and ${ny} N up.`,
    activity: {
      kind: "phys-forceArrows",
      object: "dot",
      directions: 16,
      maxSize: 6,
      given: [{ dir: 0, size: a, label: "A" }],
      arrows: [{ label: "B₁", answer: { dir: 0, size: nx - a } }, { label: "B₂", answer: { dir: 90, size: ny } }],
      net: { x: nx, y: ny },
    },
    answer: nx * 10 + ny,
    speech: `Force A is ${a} newtons to the right. Use the two arrows to make the net force ${nx} newtons right and ${ny} newtons up.`,
    hint: "Handle each direction on its own: what's missing to the right, and what's missing upward?",
    explain: `Right: ${a} + ${nx - a} = ${nx} N. Up: ${ny} N. So add ${nx - a} N right and ${ny} N up.`,
  });
}

const THIRD_CARDS: Card[] = [
  {
    p: "A truck hits a bug. Which feels the bigger force?",
    a: "The forces are equal",
    w: ["The bug", "The truck", "The bug feels a force, the truck doesn't"],
    h: "Newton's third law: forces come in equal and opposite pairs.",
    e: "Equal forces, but the bug's tiny mass gets a huge acceleration (a = F ÷ m) while the truck barely notices.",
  },
  {
    p: "How does a rocket accelerate in empty space, with nothing to push against?",
    a: "It pushes gas out backward; the gas pushes it forward",
    w: ["It pushes against the vacuum", "It can't accelerate in space", "Gravity pulls it forward"],
    h: "The rocket and its exhaust push on each other.",
    e: "The rocket pushes exhaust gas backward, so the gas pushes the rocket forward with an equal force.",
  },
  {
    p: "When you walk forward, what pushes you forward?",
    a: "The ground, pushing on your foot",
    w: ["Your muscles directly", "Your own momentum", "The air behind you"],
    h: "Your foot pushes backward on the ground…",
    e: "Your foot pushes back on the ground; the ground pushes forward on you (friction). You also push Earth backward a tiny bit!",
  },
  {
    p: "Why don't third-law forces cancel out?",
    a: "They act on different objects",
    w: ["They aren't really equal", "One is always bigger", "They act at different times"],
    h: "Which object does each force push on?",
    e: "A pair's two forces act on two different objects, so each object only feels one of them.",
  },
];

export function thirdLaw(): Question {
  const k = rand(0, 3);
  if (k <= 1) {
    const F = 10 * rand(3, 15);
    const m1 = pick([40, 50, 60]);
    const m2 = pick([70, 80, 100]);
    const askLight = rand(0, 1) === 1;
    const a = r2(F / (askLight ? m1 : m2));
    return mk({
      key: `third-skate-${F}-${m1}-${m2}-${askLight}`,
      prompt: `Two skaters push apart. The ${m1} kg skater pushes the ${m2} kg skater with ${F} N. What is the ${askLight ? `${m1} kg` : `${m2} kg`} skater's acceleration? Round to 2 decimal places.`,
      unit: "m/s²",
      ...keypad(a),
      hint: "Third law: each skater feels the same size force. Then a = F ÷ m for that skater.",
      explain: `Each feels ${F} N. a = ${F} ÷ ${askLight ? m1 : m2} ≈ ${a} m/s². The lighter skater accelerates more.`,
    });
  }
  if (k === 2) {
    const F = 5 * rand(2, 40);
    const pair = pick([
      ["A hammer hits a nail with", "the nail push on the hammer"],
      ["Earth pulls a satellite with", "the satellite pull on Earth"],
      ["A bat hits a ball with", "the ball push on the bat"],
      ["A magnet pulls a paper clip with", "the paper clip pull on the magnet"],
    ]);
    return mk({
      key: `third-size-${F}-${pair[0].slice(0, 6)}`,
      prompt: `${pair[0]} a force of ${F} N. How big a force does ${pair[1]}?`,
      unit: "N",
      ...choose(F, [0, F * 2, F / 2], 5, 0),
      hint: "Newton's third law: equal size, opposite direction.",
      explain: `Exactly ${F} N, in the opposite direction.`,
    });
  }
  return card("third", THIRD_CARDS);
}

export function elevator(): Question {
  const k = rand(0, 4);
  const m = pick([50, 55, 60, 65, 70, 75, 80]);
  const a = pick([1, 1.5, 2, 2.5, 3]);
  const vis = (motion?: { dir: number; label: string }): Visual => ({
    kind: "phys-forces",
    object: "🧍",
    surface: "none",
    objectLabel: m,
    forces: [{ dir: 90, size: 5, label: "N = ?" }, { dir: 270, size: 5, label: "mg" }],
    motion,
  });
  if (k === 0)
    return mk({
      key: `lift-up-${m}-${a}`,
      prompt: `A ${m} kg person stands on a scale in a lift accelerating upward at ${ds(a)} m/s². What force does the scale read? (g = 9.8 m/s²)`,
      visual: vis({ dir: 90, label: `a = ${ds(a)} m/s²` }),
      unit: "N",
      ...keypad(r1(m * (G + a))),
      hint: "Net force = ma upward, so N − mg = ma and N = m(g + a).",
      explain: `N = ${m} × (9.8 + ${ds(a)}) = ${r1(m * (G + a))} N: more than her weight of ${r1(m * G)} N.`,
    });
  if (k === 1)
    return mk({
      key: `lift-down-${m}-${a}`,
      prompt: `A ${m} kg person stands on a scale in a lift accelerating downward at ${ds(a)} m/s². What force does the scale read? (g = 9.8 m/s²)`,
      visual: vis({ dir: 270, label: `a = ${ds(a)} m/s²` }),
      unit: "N",
      ...keypad(r1(m * (G - a))),
      hint: "Net force = ma downward, so mg − N = ma and N = m(g − a).",
      explain: `N = ${m} × (9.8 − ${ds(a)}) = ${r1(m * (G - a))} N: she feels lighter.`,
    });
  if (k === 2) {
    const cv = rand(0, 1) === 1;
    return mk({
      key: `lift-const-${m}-${cv}`,
      prompt: cv
        ? `A ${m} kg person rides a lift moving up at a steady 3 m/s. What does the scale read? (g = 9.8 m/s²)`
        : `The lift cable snaps and a ${m} kg person falls freely with the lift. What does the scale read?`,
      visual: vis(cv ? { dir: 90, label: "v = 3 m/s" } : { dir: 270, label: "a = g" }),
      unit: "N",
      ...keypad(cv ? r1(m * G) : 0),
      hint: cv ? "Steady velocity means a = 0. What does that make N?" : "In free fall a = g, so N = m(g − g).",
      explain: cv ? `a = 0, so N = mg = ${r1(m * G)} N, the same as standing still.` : "N = m(g − g) = 0 N: she feels weightless, like astronauts in orbit.",
    });
  }
  if (k === 3) {
    const up = rand(0, 1) === 1;
    const N = r1(m * (G + (up ? a : -a)));
    return mk({
      key: `lift-finda-${m}-${a}-${up}`,
      prompt: `A ${m} kg student's scale reads ${N} N in a lift. What is the size of the lift's acceleration? (g = 9.8 m/s²)`,
      unit: "m/s²",
      ...keypad(a),
      hint: "a = (N − mg) ÷ m. A positive answer means upward, negative downward.",
      explain: `mg = ${r1(m * G)} N. a = (${N} − ${r1(m * G)}) ÷ ${m} = ${ds(up ? a : -a)} m/s², so ${a} m/s² ${up ? "upward" : "downward"}.`,
    });
  }
  const cards: Card[] = [
    {
      p: "You feel heaviest in a lift when it is…",
      a: "speeding up while going up",
      w: ["moving up at a steady speed", "speeding up while going down", "standing still"],
      h: "The scale reads N = m(g + a) with a upward positive.",
      e: "An upward acceleration (speeding up going up, or slowing down going down) makes N bigger than mg.",
    },
    {
      p: "Astronauts on the space station float because…",
      a: "they and the station are falling together",
      w: ["there is no gravity in space", "the station has no air", "the Sun cancels Earth's pull"],
      h: "At 400 km up, g is still about 8.7 m/s².",
      e: "Gravity is still strong there; they're in free fall around Earth along with the station, so nothing pushes on them: N = 0.",
    },
  ];
  return card("lift", cards);
}

export function connected(): Question {
  const k = rand(0, 3);
  const m1 = pick([2, 3, 4, 5, 6]);
  const m2 = pick([1, 2, 3, 4]);
  const a = pick([1, 2, 3]);
  const F = (m1 + m2) * a;
  if (k === 0)
    return mk({
      key: `conn-a-${m1}-${m2}-${a}`,
      prompt: `You push a ${m1} kg box, which pushes a ${m2} kg box in front of it, with ${F} N on a frictionless floor. What is their acceleration?`,
      unit: "m/s²",
      ...keypad(a, [F / m1, F / m2]),
      hint: "Both boxes move together: treat them as one object of total mass m₁ + m₂.",
      explain: `a = ${F} ÷ (${m1} + ${m2}) = ${a} m/s².`,
    });
  if (k === 1)
    return mk({
      key: `conn-contact-${m1}-${m2}-${a}`,
      prompt: `You push a ${m1} kg box, which pushes a ${m2} kg box ahead of it, with ${F} N (no friction). How hard does the first box push the second?`,
      unit: "N",
      ...keypad(m2 * a, [F, m1 * a]),
      hint: "First find a for the pair. The front box only feels the contact force, so it equals (front mass) × a.",
      explain: `a = ${F} ÷ ${m1 + m2} = ${a} m/s²; contact force = ${m2} × ${a} = ${m2 * a} N (less than your ${F} N push).`,
    });
  if (k === 2) {
    const car = pick([1000, 1200, 1500]);
    const trailer = pick([300, 400, 500, 600]);
    const aa = pick([0.5, 1, 1.5, 2]);
    return mk({
      key: `conn-trailer-${car}-${trailer}-${aa}`,
      prompt: `A ${car} kg car tows a ${trailer} kg trailer, speeding up at ${ds(aa)} m/s². Ignoring friction on the trailer, what is the tension in the tow bar?`,
      unit: "N",
      ...keypad(clean(trailer * aa), [(car + trailer) * aa, car * aa]),
      hint: "The tow bar is the only thing pulling the trailer forward: T = trailer mass × a.",
      explain: `T = ${trailer} × ${ds(aa)} = ${clean(trailer * aa)} N. (The car's engine needs ${clean((car + trailer) * aa)} N in total.)`,
    });
  }
  return card("conn", [
    {
      p: "You push two touching boxes along a frictionless floor. The force between the boxes is…",
      a: "smaller than your push",
      w: ["equal to your push", "bigger than your push", "zero"],
      h: "The front box only needs enough force to accelerate its own mass.",
      e: "Your push accelerates both boxes; the contact force only accelerates the front one, so it's smaller.",
    },
    {
      p: "A train engine pulls 3 equal carriages. Which coupling has the biggest tension?",
      a: "The one next to the engine",
      w: ["The one at the back", "They're all equal", "The middle one"],
      h: "Each coupling has to pull everything behind it.",
      e: "The first coupling accelerates all 3 carriages, the last one just 1, so the first has the most tension.",
    },
  ]);
}

const INCLINE_ANGLES = [15, 20, 25, 30, 35, 40, 45];

/** A block on a ramp with weight, normal and (optionally) friction arrows. */
function rampVisual(angle: number, m: number, fric?: string): Visual {
  return {
    kind: "phys-incline",
    angle,
    blockLabel: m,
    friction: fric,
    forces: [
      { dir: 90 + angle, size: 10 * cosD(angle), label: "N" },
      { dir: 270, size: 10, label: "mg" },
      ...(fric && fric !== "frictionless" ? [{ dir: angle, size: 3, label: "f" }] : []),
    ],
  };
}

export function incline(): Question {
  const k = rand(0, 5);
  const th = pick(INCLINE_ANGLES);
  const m = pick([2, 4, 5, 10, 20]);
  if (k === 0)
    return mk({
      key: `ramp-along-${th}-${m}`,
      prompt: `A ${m} kg block sits on a ${th}° ramp. What is the part of its weight pulling it down the slope? Round to 1 decimal place.`,
      visual: rampVisual(th, m),
      unit: "N",
      ...keypad(r1(m * G * sinD(th))),
      hint: "Down the slope: mg sin θ. Into the slope: mg cos θ.",
      explain: `mg sin θ = ${m} × 9.8 × sin ${th}° = ${r1(m * G * sinD(th))} N.`,
    });
  if (k === 1)
    return mk({
      key: `ramp-a-${th}`,
      prompt: `A block slides down a frictionless ${th}° ramp. What is its acceleration? Round to 1 decimal place.`,
      visual: rampVisual(th, m, "frictionless"),
      unit: "m/s²",
      ...keypad(r1(G * sinD(th))),
      hint: "Net force = mg sin θ, so a = g sin θ (the mass cancels).",
      explain: `a = 9.8 × sin ${th}° = ${r1(G * sinD(th))} m/s², whatever the mass.`,
    });
  if (k === 2)
    return mk({
      key: `ramp-n-${th}-${m}`,
      prompt: `What is the normal force on a ${m} kg block resting on a ${th}° ramp? Round to 1 decimal place.`,
      visual: rampVisual(th, m),
      unit: "N",
      ...keypad(r1(m * G * cosD(th))),
      hint: "The ramp pushes back against the part of the weight pressing into it: N = mg cos θ.",
      explain: `N = ${m} × 9.8 × cos ${th}° = ${r1(m * G * cosD(th))} N, less than the weight ${r1(m * G)} N.`,
    });
  if (k === 3) {
    const t2 = pick([30, 35, 40, 45]);
    const mu = pick([0.1, 0.2, 0.3]);
    const a = r1(G * (sinD(t2) - mu * cosD(t2)));
    return mk({
      key: `ramp-fric-${t2}-${mu}`,
      prompt: `A sled slides down a ${t2}° slope with μₖ = ${mu}. What is its acceleration? Round to 1 decimal place.`,
      visual: rampVisual(t2, m, `μₖ = ${mu}`),
      unit: "m/s²",
      ...keypad(a),
      hint: "a = g(sin θ − μ cos θ): the slope pulls with mg sin θ, friction holds back μmg cos θ.",
      explain: `a = 9.8 × (sin ${t2}° − ${mu} × cos ${t2}°) = 9.8 × (${r2(sinD(t2))} − ${r2(mu * cosD(t2))}) ≈ ${a} m/s².`,
    });
  }
  if (k === 4) {
    const t2 = pick([10, 15, 20, 25, 30, 35]);
    const mu = pick([0.2, 0.3, 0.4, 0.5, 0.6]);
    const slides = Math.tan(t2 * RAD) > mu;
    return mk({
      key: `ramp-slide-${t2}-${mu}`,
      prompt: `A box rests on a ${t2}° ramp with μₛ = ${mu}. Will it start sliding by itself?`,
      visual: rampVisual(t2, 5, `μₛ = ${mu}`),
      ...label(slides ? "Yes" : "No", [slides ? "No" : "Yes"]),
      hint: "It slides when mg sin θ beats the most static friction, μₛmg cos θ: that is, when tan θ > μₛ.",
      explain: `tan ${t2}° = ${r2(Math.tan(t2 * RAD))}, ${slides ? "more" : "less"} than μₛ = ${mu}, so it ${slides ? "slides" : "stays put"}.`,
    });
  }
  return card("ramp", [
    {
      p: "You make a ramp steeper. What happens to the normal force on a block resting on it?",
      a: "It gets smaller",
      w: ["It gets bigger", "It stays equal to mg", "It points straight up"],
      h: "N = mg cos θ. What does cos θ do as θ grows?",
      e: "cos θ shrinks as θ grows, so N = mg cos θ gets smaller (and mg sin θ down the slope gets bigger).",
    },
    {
      p: "Two blocks, 1 kg and 10 kg, slide down the same frictionless ramp. Which accelerates more?",
      a: "Neither: same acceleration",
      w: ["The 10 kg block", "The 1 kg block", "It depends on the length"],
      h: "a = g sin θ. Is there an m in it?",
      e: "The bigger force on the heavy block is exactly matched by its bigger mass: a = g sin θ for both.",
    },
  ]);
}

export function faGraph(): Question {
  if (rand(0, 2) === 0) {
    const m = pick([0.5, 1, 1.5, 2, 2.5, 3]);
    const as = [1, 2, 3].filter((x) => x * m <= 10);
    return mk({
      key: `fa-read-${m}`,
      prompt: "A student measures the net force and acceleration of one cart. What is the cart's mass?",
      visual: { kind: "plot", xLabel: "acceleration (m/s²)", yLabel: "force (N)", x: [0, 4], y: [0, 10], points: as.map((x) => ({ x, y: x * m })), lines: [{ from: [0, 0], to: [4, 4 * m], colour: "wave", dashed: true }] },
      needsVisual: true,
      unit: "kg",
      ...choose(m, [1 / m, 2 * m, m + 1].map(r1), 0.5, 0.5),
      hint: "F = ma, so the slope of a force–acceleration line is the mass.",
      explain: `Slope = F ÷ a = ${ds(as[0] * m)} ÷ ${as[0]} = ${ds(m)} kg.`,
    });
  }
  const m = pick([1, 2, 3]);
  const all = [1, 2, 3, 4, 5].filter((a) => a * m <= 10);
  const as = shuffle(all).slice(0, Math.min(4, all.length)).sort((x, y) => x - y);
  return act({
    key: `fa-plot-${m}-${as.join("")}`,
    prompt: `Plot the results for a ${m} kg cart: acceleration (m/s²) across, net force (N) up.`,
    visual: table(["a (m/s²)", ...as], ["F (N)", ...as.map((a) => a * m)]),
    needsVisual: true,
    activity: { kind: "plotPoints", points: as.map((a) => ({ x: a, y: a * m, label: `${a}` })), size: 10, quadrants: 1 },
    answer: m,
    hint: "Each column is one point: (acceleration, force).",
    explain: `The points lie on a straight line through (0, 0) with slope ${m}: the slope of F against a is the mass, ${m} kg.`,
  });
}

/* =================================================================== world 3: momentum */

const P_UNIT = "kg·m/s";

const MOVERS: [string, number, number][] = [
  ["a 1200 kg car at 15 m/s", 1200, 15],
  ["a 7 kg bowling ball at 5 m/s", 7, 5],
  ["a 0.01 kg bullet at 400 m/s", 0.01, 400],
  ["a 60 kg runner at 8 m/s", 60, 8],
  ["an 8000 kg truck at 2 m/s", 8000, 2],
  ["a 0.15 kg baseball at 40 m/s", 0.15, 40],
  ["a 90 kg rugby player at 6 m/s", 90, 6],
  ["a 0.45 kg football at 20 m/s", 0.45, 20],
  ["a 2000 kg rhino at 12 m/s", 2000, 12],
];

export function momentum(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const i = rand(0, MOVERS.length - 1);
    const [what, m, v] = MOVERS[i];
    return mk({
      key: `mom-p-${i}`,
      prompt: `What is the momentum of ${what}?`,
      unit: P_UNIT,
      ...keypad(clean(m * v)),
      hint: "p = mv: mass × velocity.",
      explain: `p = ${m} × ${v} = ${ds(m * v)} kg·m/s.`,
    });
  }
  if (k === 1) {
    const [i, j] = shuffle(MOVERS.map((_, n) => n)).slice(0, 2);
    const [a, ma, va] = MOVERS[i];
    const [b, mb, vb] = MOVERS[j];
    if (Math.abs(ma * va - mb * vb) < 1e-9) return momentum();
    const bigger = ma * va > mb * vb ? a : b;
    const strip = (s: string) => s.replace(/^an? /, "the ");
    return mk({
      key: `mom-cmp-${i}-${j}`,
      prompt: `Which has more momentum: ${a} or ${b}?`,
      ...label(strip(bigger), [strip(bigger === a ? b : a), "They're equal"]),
      hint: "Work out mv for each. A big mass can beat a big speed, and the other way round.",
      explain: `${strip(a)}: ${ds(ma * va)} kg·m/s. ${strip(b)}: ${ds(mb * vb)} kg·m/s.`,
    });
  }
  if (k === 2) {
    const m = pick([0.5, 2, 4, 5, 10, 50, 1000]);
    const v = pick([2, 3, 4, 6, 8, 12, 20, 25]);
    return mk({
      key: `mom-v-${m}-${v}`,
      prompt: `A ${m} kg object has a momentum of ${ds(m * v)} kg·m/s. How fast is it moving?`,
      unit: "m/s",
      ...keypad(v, [m * m * v]),
      hint: "v = p ÷ m.",
      explain: `v = ${ds(m * v)} ÷ ${m} = ${v} m/s.`,
    });
  }
  if (k === 3) {
    const m1 = rand(1, 6);
    const v1 = rand(1, 6);
    const m2 = rand(1, 6);
    const v2 = rand(1, 6);
    const total = m1 * v1 - m2 * v2;
    return mk({
      key: `mom-total-${m1}-${v1}-${m2}-${v2}`,
      prompt: "Two carts roll toward each other. What is their total momentum? (right is +)",
      visual: { kind: "phys-collision", before: [{ mass: m1, v: v1, vSize: v1 }, { mass: m2, v: v2, vSize: -v2 }] },
      needsVisual: true,
      unit: P_UNIT,
      ...signed(total),
      hint: "Momentum is a vector: the cart moving left has negative momentum. Add them with signs.",
      explain: `${m1} × ${v1} + ${m2} × (−${v2}) = ${m1 * v1} − ${m2 * v2} = ${ds(total)} kg·m/s.`,
    });
  }
  return card("mom", [
    {
      p: "A huge truck is parked. Its momentum is…",
      a: "0",
      w: ["huge, because of its mass", "equal to its weight", "impossible to say"],
      h: "p = mv. What is v?",
      e: "v = 0, so p = m × 0 = 0, however heavy it is.",
    },
    {
      p: "Momentum is a vector. That means it has…",
      a: "a size and a direction",
      w: ["only a size", "only a direction", "a size that's always positive"],
      h: "p = mv, and velocity has a direction.",
      e: "p points the same way as the velocity, so two equal objects moving opposite ways have opposite momenta.",
    },
    {
      p: "A cart's speed is doubled. Its momentum becomes…",
      a: "2 times as big",
      w: ["4 times as big", "the same", "half as big"],
      h: "p = mv is proportional to v.",
      e: "p ∝ v, so doubling v doubles p. (Its kinetic energy, ½mv², would be 4 times as big.)",
    },
  ]);
}

/** Two whole-number carts whose sticky collision gives a velocity with at most one decimal place. */
function stickyCarts() {
  for (let t = 0; t < 200; t++) {
    const m1 = rand(1, 6);
    const m2 = rand(1, 6);
    const v1 = rand(2, 8);
    const v2 = pick([0, 0, 1, 2, 3, -1, -2, -3]);
    const p = m1 * v1 + m2 * v2;
    const v = p / (m1 + m2);
    if (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 && v > 0) return { m1, m2, v1, v2, v: clean(v) };
  }
  return { m1: 2, m2: 1, v1: 3, v2: 0, v: 2 };
}

export function sticky(): Question {
  const k = rand(0, 3);
  if (k <= 1) {
    const { m1, m2, v1, v2, v } = stickyCarts();
    return mk({
      key: `stick-v-${m1}-${m2}-${v1}-${v2}`,
      prompt: "The carts collide and stick together. How fast do they move afterward?",
      visual: {
        kind: "phys-collision",
        before: [{ mass: m1, v: v1, vSize: v1 }, { mass: m2, v: Math.abs(v2), vSize: v2 }],
        after: [{ mass: m1 + m2, v: "?", vSize: v }],
      },
      needsVisual: true,
      unit: "m/s",
      ...keypad(v, [r1((v1 + Math.abs(v2)) / 2)]),
      hint: "Total momentum before = total momentum after. Afterward the mass is m₁ + m₂.",
      explain: `Before: ${m1} × ${v1}${v2 ? ` + ${m2} × (${ds(v2)})` : ` + ${m2} × 0`} = ${m1 * v1 + m2 * v2} kg·m/s. After: ${m1 * v1 + m2 * v2} ÷ ${m1 + m2} = ${ds(v)} m/s.`,
    });
  }
  if (k === 2) {
    const m1 = pick([1, 2, 3, 4]);
    const m2 = pick([1, 2, 3, 4, 6]);
    const v = rand(1, 4);
    const v1 = (v * (m1 + m2)) / m1;
    return mk({
      key: `stick-m-${m1}-${m2}-${v}`,
      prompt: `A ${m1} kg cart at ${ds(v1)} m/s hits a cart at rest. They stick and move at ${v} m/s. What is the second cart's mass?`,
      visual: { kind: "phys-collision", before: [{ mass: m1, v: v1, vSize: v1 }, { mass: "?", v: 0, vSize: 0 }], after: [{ mass: "?", v, vSize: v }] },
      unit: "kg",
      ...keypad(m2, [m1 + m2, (m1 * v1) / v]),
      hint: "Momentum before = (m₁ + m₂) × v. Solve for m₂.",
      explain: `${m1} × ${ds(v1)} = ${m1 * v1} = (${m1} + m₂) × ${v}, so m₁ + m₂ = ${m1 + m2} and m₂ = ${m2} kg.`,
    });
  }
  return card("stick", [
    {
      p: "A moving cart hits an identical cart at rest and they stick. Their speed afterward is…",
      a: "half the first cart's speed",
      w: ["the same as the first cart's speed", "double", "zero"],
      h: "The same momentum is now shared by twice the mass.",
      e: "mv = (2m)v', so v' = v ÷ 2.",
    },
    {
      p: "When is the total momentum of two colliding objects conserved?",
      a: "When no outside net force acts on them",
      w: ["Only when they bounce", "Only when they stick", "Only if they have equal masses"],
      h: "The forces between them are a third-law pair.",
      e: "The collision forces are equal and opposite, so they cancel for the system. Only an outside net force (like friction) can change the total.",
    },
  ]);
}

export function bounce(): Question {
  const k = rand(0, 3);
  if (k <= 2) {
    for (let t = 0; t < 200; t++) {
      const m1 = rand(1, 5);
      const m2 = rand(1, 5);
      const v1 = rand(3, 8);
      const v2 = pick([0, -1, -2, -3]);
      const v1a = pick([-3, -2, -1, 1, 2]);
      const p = m1 * v1 + m2 * v2;
      const v2a = (p - m1 * v1a) / m2;
      if (!(v2a > 0) || !Number.isInteger(v2a) || v2a <= v1a) continue;
      const ke0 = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
      const ke1 = 0.5 * m1 * v1a * v1a + 0.5 * m2 * v2a * v2a;
      if (ke1 > ke0 + 1e-9) continue;
      return mk({
        key: `bounce-${m1}-${m2}-${v1}-${v2}-${v1a}`,
        prompt: "Cart A hits cart B and they bounce apart. How fast is B moving afterward?",
        visual: {
          kind: "phys-collision",
          before: [{ mass: m1, name: "A", v: v1, vSize: v1 }, { mass: m2, name: "B", v: Math.abs(v2), vSize: v2 }],
          after: [{ mass: m1, name: "A", v: Math.abs(v1a), vSize: v1a }, { mass: m2, name: "B", v: "?", vSize: v2a }],
        },
        needsVisual: true,
        unit: "m/s",
        ...keypad(v2a),
        hint: "Total momentum before = total momentum after. Moving left counts as negative.",
        explain: `Before: ${m1}(${v1}) + ${m2}(${ds(v2)}) = ${p}. After: ${m1}(${ds(v1a)}) + ${m2}v = ${p}, so v = (${p} − ${ds(m1 * v1a)}) ÷ ${m2} = ${v2a} m/s to the right.`,
      });
    }
  }
  return card("bounce", [
    {
      p: "A moving pool ball hits an identical ball at rest head-on, in a perfectly elastic collision. What happens?",
      a: "The first ball stops; the second moves off at the first's speed",
      w: ["Both move off at half speed", "Both stop", "The first bounces straight back"],
      h: "Both momentum and kinetic energy must be the same before and after.",
      e: "For equal masses in an elastic head-on collision, the velocities swap: the moving ball stops and the other takes its speed.",
    },
    {
      p: "A ball bounces back off a wall. Compared with sticking to the wall, the change in the ball's momentum is…",
      a: "bigger",
      w: ["smaller", "the same", "zero"],
      h: "To bounce, it must first stop, then go back the other way.",
      e: "Bouncing reverses the momentum, so Δp is (nearly) twice as big as just stopping, and the wall must push harder.",
    },
  ]);
}

export function explosions(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    for (let t = 0; t < 100; t++) {
      const m1 = pick([40, 50, 60, 70]);
      const m2 = pick([20, 30, 40, 50, 80, 90]);
      const v2 = pick([1, 1.5, 2, 2.5, 3]);
      const v1 = (m2 * v2) / m1;
      if (Math.abs(v1 * 100 - Math.round(v1 * 100)) > 1e-9 || m1 === m2) continue;
      return mk({
        key: `boom-skate-${m1}-${m2}-${v2}`,
        prompt: `Two skaters stand still, then push apart. Skater B (${m2} kg) moves right at ${ds(v2)} m/s. How fast does skater A (${m1} kg) move?`,
        visual: {
          kind: "phys-collision",
          before: [{ mass: m1, name: "A", v: 0, vSize: 0 }, { mass: m2, name: "B", v: 0, vSize: 0 }],
          after: [{ mass: m1, name: "A", v: "?", vSize: -v1 }, { mass: m2, name: "B", v: v2, vSize: v2 }],
        },
        unit: "m/s",
        ...keypad(clean(v1)),
        hint: "Total momentum starts at 0, so afterward m₁v₁ = m₂v₂, in opposite directions.",
        explain: `${m1} × v = ${m2} × ${ds(v2)} = ${ds(m2 * v2)}, so v = ${ds(v1)} m/s to the left.`,
      });
    }
  }
  if (k === 2) {
    const [what, M, m, v] = pick([
      ["A 500 kg cannon fires a 5 kg ball at", 500, 5, 100],
      ["A 4 kg rifle fires a 0.01 kg bullet at", 4, 0.01, 400],
      ["A 100 kg astronaut throws a 2 kg wrench at", 100, 2, 5],
      ["A 200 kg boat has a 50 kg diver jump off the back at", 200, 50, 4],
      ["A 1500 kg cannon fires a 10 kg shell at", 1500, 10, 300],
    ] as [string, number, number, number][]);
    return mk({
      key: `boom-recoil-${M}-${m}`,
      prompt: `${what} ${v} m/s. How fast does the ${what.split(" ")[3]} recoil?`,
      unit: "m/s",
      ...keypad(clean((m * v) / M), [m * v, M / m]),
      hint: "Everything starts at rest, so the total momentum stays 0: M × V = m × v.",
      explain: `V = (${m} × ${v}) ÷ ${M} = ${ds((m * v) / M)} m/s, backward.`,
    });
  }
  if (k === 3) {
    const m = pick([2, 3, 4, 6]);
    const v = pick([2, 3, 4, 5, 6]);
    return mk({
      key: `boom-total-${m}-${v}`,
      prompt: `A firework at rest bursts into two pieces. One ${m} kg piece flies off with ${m * v} kg·m/s of momentum. What is the momentum of the other piece?`,
      ...label(`${m * v} kg·m/s, the opposite way`, [`${m * v} kg·m/s, the same way`, "0 kg·m/s", `${2 * m * v} kg·m/s, the opposite way`]),
      hint: "Before the burst the total momentum is 0. It must still add up to 0.",
      explain: `The total stays 0, so the other piece has ${m * v} kg·m/s in the opposite direction.`,
    });
  }
  return card("boom", [
    {
      p: "A bomb at rest explodes into pieces. The total momentum of all the pieces just after is…",
      a: "0",
      w: ["huge", "equal to the energy released", "in the direction of the biggest piece"],
      h: "The explosion forces are all internal.",
      e: "Internal forces can't change a system's total momentum. It was 0 before, so the pieces' momenta add to 0.",
    },
    {
      p: "Why does a lighter gun recoil faster than a heavy gun firing the same bullet?",
      a: "Same momentum, less mass, so more speed",
      w: ["The bullet goes slower", "Light guns push harder", "Heavy guns don't recoil"],
      h: "M × V = m × v. The right side is the same for both guns.",
      e: "The recoil momentum equals the bullet's momentum. Smaller M means bigger V.",
    },
  ]);
}

export function pBars(): Question {
  if (rand(0, 2) < 2) {
    for (let t = 0; t < 200; t++) {
      const m1 = rand(1, 4);
      const v1 = rand(2, 6);
      const m2 = rand(1, 4);
      const v2 = pick([0, 0, 1, 2]);
      const pa = m1 * v1;
      const pb = m2 * v2;
      const v = (pa + pb) / (m1 + m2);
      if (pa + pb > 20 || Math.abs(v * 10 - Math.round(v * 10)) > 1e-9) continue;
      return act({
        key: `pbars-stick-${m1}-${v1}-${m2}-${v2}`,
        prompt: "Make a momentum bar chart: each cart's momentum before, and the stuck-together pair's after.",
        visual: {
          kind: "phys-collision",
          before: [{ mass: m1, name: "A", v: v1, vSize: v1 }, { mass: m2, name: "B", v: v2, vSize: v2 }],
          after: [{ mass: m1 + m2, v: clean(v), vSize: v }],
        },
        needsVisual: true,
        activity: { kind: "barGraph", title: "Momentum (kg·m/s)", items: [{ label: "A before", value: pa }, { label: "B before", value: pb }, { label: "A+B after", value: pa + pb }], max: pa + pb <= 10 ? 10 : 20, step: 1, hideData: true },
        answer: pa + pb,
        hint: "p = mv for each cart. The total after must equal the total before.",
        explain: `A: ${m1} × ${v1} = ${pa}. B: ${m2} × ${v2} = ${pb}. After: ${m1 + m2} × ${ds(v)} = ${pa + pb} kg·m/s, the same total.`,
      });
    }
  }
  const m1 = rand(1, 4);
  const m2 = rand(1, 4);
  const p = pick([4, 6, 8, 10, 12].filter((x) => Number.isInteger((x / m1) * 10) && Number.isInteger((x / m2) * 10)));
  return act({
    key: `pbars-burst-${m1}-${m2}-${p}`,
    prompt: "Spring-loaded carts at rest push apart. Make a bar chart of the size of each momentum.",
    visual: {
      kind: "phys-collision",
      before: [{ mass: m1, name: "A", v: 0, vSize: 0 }, { mass: m2, name: "B", v: 0, vSize: 0 }],
      after: [{ mass: m1, name: "A", v: clean(p / m1), vSize: -p / m1 }, { mass: m2, name: "B", v: clean(p / m2), vSize: p / m2 }],
    },
    needsVisual: true,
    activity: { kind: "barGraph", title: "Size of momentum (kg·m/s)", items: [{ label: "Total before", value: 0 }, { label: "A after", value: p }, { label: "B after", value: p }], max: p <= 10 ? 10 : 20, step: 1, hideData: true },
    answer: p,
    hint: "Before, nothing moves. After, find mv for each cart.",
    explain: `Before: 0. A: ${m1} × ${ds(p / m1)} = ${p}. B: ${m2} × ${ds(p / m2)} = ${p}. Equal sizes, opposite directions, so the total is still 0.`,
  });
}

export function impulse(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const F = pick([50, 120, 200, 400, 800, 1500, 2000]);
    const t = pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5]);
    return mk({
      key: `imp-ft-${F}-${t}`,
      prompt: `A bat pushes a ball with an average force of ${F} N for ${t} s. What impulse does it give?`,
      unit: "N·s",
      ...keypad(clean(F * t), [F / t]),
      hint: "Impulse J = F × Δt.",
      explain: `J = ${F} × ${t} = ${ds(F * t)} N·s, which is also the ball's change in momentum.`,
    });
  }
  if (k === 1) {
    const [what, m] = pick([["baseball", 0.15], ["football", 0.4], ["cricket ball", 0.16], ["tennis ball", 0.06]] as [string, number][]);
    const v = pick([10, 20, 25, 30, 40, 50]);
    return mk({
      key: `imp-catch-${what}-${v}`,
      prompt: `You catch a ${m} kg ${what} moving at ${v} m/s. How much impulse does your glove give it?`,
      unit: "N·s",
      ...keypad(clean(m * v), [v / m]),
      hint: "Impulse = change in momentum = m × (change in velocity).",
      explain: `Δp = ${m} × (${v} − 0) = ${ds(m * v)} N·s (opposite to its motion).`,
    });
  }
  if (k === 2) {
    const m = pick([0.4, 0.45, 0.5]);
    const v = pick([20, 24, 25, 30]);
    const t = pick([0.01, 0.02, 0.05, 0.1]);
    return mk({
      key: `imp-kick-${m}-${v}-${t}`,
      prompt: `A ${m} kg ball at rest is kicked to ${v} m/s. Your foot touches it for ${t} s. What is the average force?`,
      unit: "N",
      ...keypad(clean((m * v) / t), [m * v, m * v * t]),
      hint: "F = Δp ÷ Δt.",
      explain: `Δp = ${m} × ${v} = ${ds(m * v)} N·s; F = ${ds(m * v)} ÷ ${t} = ${ds((m * v) / t)} N.`,
    });
  }
  if (k === 3) {
    const m = pick([0.2, 0.5, 1, 2]);
    const u = rand(3, 8);
    const v = rand(1, u);
    return mk({
      key: `imp-wall-${m}-${u}-${v}`,
      prompt: `A ${m} kg ball hits a wall at ${u} m/s and bounces straight back at ${v} m/s. What is the size of its change in momentum?`,
      unit: "N·s",
      ...choose(clean(m * (u + v)), [clean(m * (u - v)), clean(m * u), clean(m * v)], m, 0),
      hint: "Velocity changes from +u to −v. That's a change of u + v, not u − v.",
      explain: `Δp = ${m} × (${v} − (−${u})) = ${m} × ${u + v} = ${ds(m * (u + v))} N·s.`,
    });
  }
  return card("imp", [
    {
      p: "Impulse (N·s) has the same units as…",
      a: "momentum (kg·m/s)",
      w: ["energy (J)", "force (N)", "power (W)"],
      h: "Impulse equals the change in momentum.",
      e: "1 N·s = 1 kg·m/s² × s = 1 kg·m/s, the unit of momentum.",
    },
    {
      p: "Why do golfers 'follow through' when they swing?",
      a: "Longer contact time gives a bigger impulse",
      w: ["It makes the force smaller", "It reduces the ball's mass", "It's only for style"],
      h: "Impulse = F × Δt.",
      e: "Keeping the club on the ball longer increases Δt, so the impulse (and the ball's momentum) is bigger.",
    },
  ]);
}

/** A force–time pulse drawn as straight segments, shaded underneath. */
function ftPlot(pts: [number, number][]): Visual {
  const fn = (t: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [t0, f0] = pts[i];
      const [t1, f1] = pts[i + 1];
      if (t1 > t0 && t >= t0 - 1e-9 && t <= t1 + 1e-9) return f0 + ((f1 - f0) * (t - t0)) / (t1 - t0);
    }
    return 0;
  };
  return {
    kind: "plot",
    xLabel: "time (s)",
    yLabel: "force (N)",
    x: [0, 8],
    y: [0, 12],
    lines: pts.slice(1).map((p, i) => ({ from: pts[i], to: p, colour: "tangerine" as const })),
    shade: { fn, from: pts[0][0], to: pts[pts.length - 1][0] },
  };
}

export function ftGraph(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const F = 2 * rand(2, 6);
    const t0 = rand(0, 2);
    const t1 = t0 + rand(2, 5);
    return mk({
      key: `ft-rect-${F}-${t0}-${t1}`,
      prompt: "A fan pushes a cart with this force. What impulse does the cart get?",
      visual: ftPlot([[t0, 0], [t0, F], [t1, F], [t1, 0]]),
      needsVisual: true,
      unit: "N·s",
      ...keypad(F * (t1 - t0)),
      hint: "Impulse = area under the force–time graph. Here it's a rectangle.",
      explain: `Area = ${F} N × ${t1 - t0} s = ${F * (t1 - t0)} N·s.`,
    });
  }
  if (k === 1) {
    const F = 2 * rand(3, 6);
    const T = 2 * rand(2, 4);
    return mk({
      key: `ft-tri-${F}-${T}`,
      prompt: "This is the force during a collision. What is the impulse?",
      visual: ftPlot([[0, 0], [T / 2, F], [T, 0]]),
      needsVisual: true,
      unit: "N·s",
      ...keypad((F * T) / 2, [F * T]),
      hint: "The area of a triangle is ½ × base × height.",
      explain: `Impulse = ½ × ${T} s × ${F} N = ${(F * T) / 2} N·s.`,
    });
  }
  if (k === 2) {
    const F = 2 * rand(2, 5);
    const T = rand(2, 6);
    const m = pick([1, 2, 4, 5].filter((x) => Number.isInteger(((F * T) / x) * 10)));
    return mk({
      key: `ft-dv-${F}-${T}-${m}`,
      prompt: `This force acts on a ${m} kg cart at rest. How fast is it moving afterward?`,
      visual: ftPlot([[0, F], [T, F]]),
      needsVisual: true,
      unit: "m/s",
      ...keypad(clean((F * T) / m), [F * T, F / m]),
      hint: "Find the impulse (area), then Δv = impulse ÷ mass.",
      explain: `Impulse = ${F} × ${T} = ${F * T} N·s = mΔv, so Δv = ${F * T} ÷ ${m} = ${ds((F * T) / m)} m/s.`,
    });
  }
  return card("ft", [
    {
      p: "Two force–time graphs have the same area. One is tall and narrow, the other low and wide. Which statement is true?",
      a: "Same impulse; the wide one has a smaller peak force",
      w: ["The tall one has more impulse", "The wide one has more impulse", "Same force, different impulse"],
      h: "The area is the impulse. Spreading it over more time…",
      e: "Equal areas mean equal impulse (equal Δp). Spreading it over a longer time lowers the force: that's how padding works.",
    },
    {
      p: "On a force–time graph, the area under the curve is the…",
      a: "impulse (change in momentum)",
      w: ["work done", "acceleration", "power"],
      h: "Area = force × time.",
      e: "Force × time is impulse, which equals the change in momentum.",
    },
  ]);
}

export function safety(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const m = pick([60, 70, 75, 80]);
    const v = pick([10, 15, 20]);
    const [t, what] = k === 0 ? pick([[0.01, "hits the dashboard"], [0.02, "hits a rigid wall"], [0.005, "hits the steering wheel"]] as [number, string][]) : pick([[0.1, "is caught by an airbag"], [0.2, "rides out the crumple zone"], [0.25, "is held by a stretchy seat belt"]] as [number, string][]);
    const F = clean((m * v) / t);
    return mk({
      key: `safe-F-${m}-${v}-${t}`,
      prompt: `In a crash, a ${m} kg passenger moving at ${v} m/s ${what} and stops in ${t} s. What average force acts on them?`,
      unit: "N",
      ...keypad(F),
      hint: "F = Δp ÷ Δt = mv ÷ t.",
      explain: `Δp = ${m} × ${v} = ${m * v} N·s. F = ${m * v} ÷ ${t} = ${F.toLocaleString("en-US")} N.${t < 0.05 ? " That can break bones." : " A longer stop means a much smaller force."}`,
    });
  }
  if (k === 2) {
    const t1 = pick([0.01, 0.02, 0.05]);
    const f = pick([2, 4, 5, 10]);
    const t2 = clean(t1 * f);
    const F1 = pick([20000, 30000, 40000, 60000]);
    return mk({
      key: `safe-ratio-${t1}-${f}-${F1}`,
      prompt: `Without a crumple zone, a car stops in ${t1} s with a force of ${F1.toLocaleString("en-US")} N. A crumple zone stretches the stop to ${t2} s. What is the new force?`,
      unit: "N",
      ...keypad(F1 / f, [F1 * f, F1 / (f * f)]),
      hint: "The change in momentum is the same. F × Δt stays the same, so F ∝ 1 ÷ Δt.",
      explain: `The time is ${f} times longer, so the force is ${f} times smaller: ${F1.toLocaleString("en-US")} ÷ ${f} = ${(F1 / f).toLocaleString("en-US")} N.`,
    });
  }
  if (k === 3) {
    const m = 5;
    const v = pick([4, 5, 6, 8]);
    const [t1, t2] = pick([[0.002, 0.01], [0.004, 0.02], [0.005, 0.025], [0.002, 0.02]] as [number, number][]);
    const askWith = rand(0, 1) === 1;
    return mk({
      key: `safe-helmet-${v}-${t1}-${askWith}`,
      prompt: `A ${m} kg head moving at ${v} m/s hits the ground. It stops in ${t1} s bare, or ${t2} s with a foam helmet. What force acts ${askWith ? "with" : "without"} the helmet?`,
      unit: "N",
      ...keypad(clean((m * v) / (askWith ? t2 : t1))),
      hint: "F = mv ÷ Δt. Use the stopping time for that case.",
      explain: `Δp = ${m} × ${v} = ${m * v} N·s. Bare: ${ds((m * v) / t1)} N. Helmet: ${ds((m * v) / t2)} N, ${Math.round(t2 / t1)} times less.`,
    });
  }
  return card("safe", [
    {
      p: "A crumple zone does NOT change which of these in a crash?",
      a: "The passenger's change in momentum",
      w: ["The time the stop takes", "The force on the passenger", "How much the car deforms"],
      h: "The car still goes from full speed to 0.",
      e: "Δp = mv either way. The crumple zone stretches the time, which lowers the force F = Δp ÷ Δt.",
    },
    {
      p: "Why should you bend your knees when you land a jump?",
      a: "It makes the stop take longer, so the force is smaller",
      w: ["It makes your momentum smaller", "It makes you lighter", "It stops you faster"],
      h: "Your Δp is fixed by your landing speed.",
      e: "Bending your knees lengthens the stopping time. Same Δp over more time means less force on your joints.",
    },
    {
      p: "Why must a bike helmet be replaced after one hard crash?",
      a: "Its foam crushed and can't stretch out a stop again",
      w: ["It gets heavier", "Its momentum is used up", "The shell gets magnetized"],
      h: "How does the foam make the stopping time longer?",
      e: "The foam crushes to slow your head over a longer time. Once crushed, it can't do that again.",
    },
    {
      p: "Airbags protect you mainly by…",
      a: "increasing the time it takes you to stop",
      w: ["reducing your mass", "reducing your change in momentum", "pushing you backward"],
      h: "F = Δp ÷ Δt.",
      e: "The airbag lets you stop over a longer time and spreads the force over a bigger area, so the force is smaller.",
    },
  ]);
}

const SAFETY_ITEMS: [string, number][] = [
  ["crumple zone", 0],
  ["airbag", 0],
  ["helmet foam liner", 0],
  ["bending your knees", 0],
  ["padded gym mat", 0],
  ["sand in a jump pit", 0],
  ["stretchy bungee cord", 0],
  ["giving hands to catch an egg", 0],
  ["water-filled road barrels", 0],
  ["rigid steel bumper", 1],
  ["landing with locked knees", 1],
  ["bare concrete floor", 1],
  ["catching with stiff hands", 1],
  ["solid wooden wall", 1],
];

export function designSort(): Question {
  const yes = shuffle(SAFETY_ITEMS.filter((s) => s[1] === 0)).slice(0, rand(3, 4));
  const no = shuffle(SAFETY_ITEMS.filter((s) => s[1] === 1)).slice(0, rand(2, 3));
  const items = shuffle([...yes, ...no]);
  return act({
    key: `design-${items.map((i) => SAFETY_ITEMS.indexOf(i)).sort((a, b) => a - b).join("_")}`,
    prompt: "Sort each design: does it make the stop take longer (less force) or not?",
    activity: { kind: "sort", bins: ["Longer stop, less force", "Doesn't lower the force"], items: items.map(([label, bin]) => ({ label, bin })) },
    answer: yes.length,
    hint: "The Δp in a stop is fixed. Anything that squashes, stretches or gives makes Δt longer and F smaller.",
    explain: `Longer stop: ${yes.map((y) => y[0]).join(", ")}. Hard and rigid: ${no.map((n) => n[0]).join(", ")}.`,
  });
}

export function elastic(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    for (let t = 0; t < 100; t++) {
      const m1 = rand(1, 4);
      const m2 = rand(1, 4);
      const v1 = rand(2, 6);
      const v = (m1 * v1) / (m1 + m2);
      const ke0 = 0.5 * m1 * v1 * v1;
      const ke1 = 0.5 * (m1 + m2) * v * v;
      const lost = clean(ke0 - ke1);
      if (Math.abs(lost * 10 - Math.round(lost * 10)) > 1e-6 || Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) continue;
      return mk({
        key: `elas-lost-${m1}-${m2}-${v1}`,
        prompt: `A ${m1} kg cart at ${v1} m/s hits a ${m2} kg cart at rest and they stick. How much kinetic energy is lost? Round to 1 decimal place.`,
        visual: { kind: "phys-collision", before: [{ mass: m1, v: v1, vSize: v1 }, { mass: m2, v: 0, vSize: 0 }], after: [{ mass: m1 + m2, v: r2(v), vSize: v }] },
        unit: "J",
        ...keypad(r1(lost)),
        hint: "Find the speed after with momentum. Then KE = ½mv² before and after, and subtract.",
        explain: `v = ${m1 * v1} ÷ ${m1 + m2} = ${r2(v)} m/s. KE before ${ds(ke0)} J, after ${r2(ke1)} J: lost ${r1(lost)} J (to heat, sound and bending).`,
      });
    }
  }
  if (k === 2) {
    const isElastic = rand(0, 1) === 1;
    if (isElastic) {
      const [m1, m2] = pick([[1, 2], [1, 3], [2, 1], [3, 1], [1, 1], [2, 2]] as [number, number][]);
      const v1 = (m1 + m2) * rand(1, 2);
      const a = ((m1 - m2) / (m1 + m2)) * v1;
      const b = ((2 * m1) / (m1 + m2)) * v1;
      return mk({
        key: `elas-type-e-${m1}-${m2}-${v1}`,
        prompt: "Was this collision elastic (kinetic energy kept) or inelastic?",
        visual: {
          kind: "phys-collision",
          before: [{ mass: m1, v: v1, vSize: v1 }, { mass: m2, v: 0, vSize: 0 }],
          after: [{ mass: m1, v: Math.abs(a), vSize: a }, { mass: m2, v: b, vSize: b }],
        },
        needsVisual: true,
        ...label("Elastic", ["Inelastic", "Impossible: momentum isn't conserved"]),
        hint: "Compare total ½mv² before and after.",
        explain: `KE before = ${ds(0.5 * m1 * v1 * v1)} J. After = ${ds(0.5 * m1 * a * a)} + ${ds(0.5 * m2 * b * b)} = ${ds(0.5 * m1 * a * a + 0.5 * m2 * b * b)} J. Same, so it's elastic.`,
      });
    }
    const m = rand(1, 3);
    const v1 = 2 * rand(2, 4);
    const x = rand(1, v1 / 2 - 1 || 1);
    const ke0 = 0.5 * m * v1 * v1;
    const ke1 = 0.5 * m * x * x + 0.5 * m * (v1 - x) * (v1 - x);
    return mk({
      key: `elas-type-i-${m}-${v1}-${x}`,
      prompt: "Was this collision elastic (kinetic energy kept) or inelastic?",
      visual: {
        kind: "phys-collision",
        before: [{ mass: m, v: v1, vSize: v1 }, { mass: m, v: 0, vSize: 0 }],
        after: [{ mass: m, v: x, vSize: x }, { mass: m, v: v1 - x, vSize: v1 - x }],
      },
      needsVisual: true,
      ...label("Inelastic", ["Elastic", "Impossible: momentum isn't conserved"]),
      hint: "Momentum is conserved here. Now compare total ½mv² before and after.",
      explain: `KE before = ${ds(ke0)} J; after = ${ds(ke1)} J. Some was lost (to heat and sound), so it's inelastic.`,
    });
  }
  if (k === 3) {
    const m = rand(1, 5);
    const v = rand(2, 8);
    return mk({
      key: `elas-ke-${m}-${v}`,
      prompt: `What is the kinetic energy of a ${m} kg cart moving at ${v} m/s?`,
      unit: "J",
      ...keypad(0.5 * m * v * v, [m * v, m * v * v]),
      hint: "KE = ½mv². Square the speed first.",
      explain: `KE = ½ × ${m} × ${v}² = ${0.5 * m * v * v} J.`,
    });
  }
  return card("elas", [
    {
      p: "In which collisions is total momentum conserved (no outside forces)?",
      a: "All collisions",
      w: ["Only elastic ones", "Only sticky ones", "Only between equal masses"],
      h: "Momentum and kinetic energy follow different rules.",
      e: "Momentum is conserved in every collision. Kinetic energy is only conserved in elastic ones.",
    },
    {
      p: "Two clay balls collide and stick. Where does the 'lost' kinetic energy go?",
      a: "Heat, sound and squashing the clay",
      w: ["It's destroyed", "Into extra momentum", "Into the Earth's rotation"],
      h: "Energy is never destroyed, only transferred.",
      e: "The kinetic energy becomes thermal energy, sound and the work of deforming the clay.",
    },
  ]);
}

export function pLine(): Question {
  if (rand(0, 3) === 0) {
    const F = pick([1, 2, 3, -1, -2]);
    const p0 = F > 0 ? rand(0, 4) : rand(6, 10);
    return mk({
      key: `pline-read-${F}-${p0}`,
      prompt: "This is a cart's momentum over time. What net force acts on it? (+ is forward)",
      visual: { kind: "plot", xLabel: "time (s)", yLabel: "momentum (kg·m/s)", x: [0, 8], y: [0, 12], lines: [{ from: [0, p0], to: [4, p0 + 4 * F], colour: "tangerine" }], points: [{ x: 0, y: p0 }, { x: 4, y: p0 + 4 * F }] },
      needsVisual: true,
      unit: "N",
      ...signed(F),
      hint: "F = Δp ÷ Δt: the slope of a momentum–time graph is the net force.",
      explain: `Slope = (${p0 + 4 * F} − ${p0}) ÷ 4 = ${ds(F)} N.`,
    });
  }
  const F = pick([1, 2, 3, -1, -2, 0.5]);
  const p0 = F > 0 ? rand(0, F === 0.5 ? 6 : 10 - 2 * F) : rand(-2 * F, 10);
  return act({
    key: `pline-draw-${F}-${p0}`,
    prompt: `A cart has ${p0} kg·m/s of momentum. A steady ${ds(F)} N net force acts on it. Draw its momentum–time line. Across: t (s); up: p (kg·m/s).`,
    activity: { kind: "drawLine", m: F, b: p0, size: 10, quadrants: 1 },
    answer: p0,
    hint: `Start at (0, ${p0}). Every second the force adds an impulse of ${ds(F)} N·s.`,
    explain: `p = ${p0} ${F < 0 ? "−" : "+"} ${Math.abs(F)}t: the slope of p–t is the net force.`,
  });
}

/* =================================================================== world 4: gravity & electric forces */

const BIG_G = 6.67e-11;
const K_E = 9.0e9;

/** Sci-notation label choices: the answer and the usual slips (forgot to square, factor of 10). */
function sciChoices(F: number, r: number, digits = 2): Answer {
  const wrong = [F * r, F * r * r * r, F * 10, F / 10, F * 100].map((x) => sci(x, digits));
  return label(sci(F, digits), wrong);
}

export function gravitation(): Question {
  const k = rand(0, 3);
  if (k <= 1) {
    const m1 = pick([50, 60, 70, 80]);
    const m2 = pick([40, 50, 60, 90, 100]);
    const r = pick([0.5, 1, 2]);
    const F = (BIG_G * m1 * m2) / (r * r);
    return mk({
      key: `grav-people-${m1}-${m2}-${r}`,
      prompt: `How hard do a ${m1} kg and a ${m2} kg person pull on each other by gravity, ${r} m apart? (G = 6.67 × 10⁻¹¹ N·m²/kg²)`,
      speech: `How hard do a ${m1} kilogram and a ${m2} kilogram person pull on each other by gravity, ${r} meters apart? G is 6.67 times 10 to the minus 11.`,
      visual: { kind: "phys-orbit", scene: "pair", masses: [{ emoji: "🧍", label: m1 }, { emoji: "🧍", label: m2 }], distance: r, forceLabels: ["F", "F"] },
      ...sciChoices(F, r),
      hint: "F = G m₁ m₂ ÷ r². Multiply the masses, divide by r squared, then multiply by G.",
      explain: `F = 6.67 × 10⁻¹¹ × ${m1} × ${m2} ÷ ${r}² = ${sci(F)} N: far too small to notice.`,
    });
  }
  if (k === 2) {
    const sets: [string, number, number, number, string][] = [
      ["Earth (6.0 × 10²⁴ kg) and the Moon (7.3 × 10²² kg), 3.8 × 10⁸ m apart", 6.0e24, 7.3e22, 3.8e8, "Earth–Moon"],
      ["the Sun (2.0 × 10³⁰ kg) and Earth (6.0 × 10²⁴ kg), 1.5 × 10¹¹ m apart", 2.0e30, 6.0e24, 1.5e11, "Sun–Earth"],
      ["Earth (6.0 × 10²⁴ kg) and a 1000 kg satellite, 7.0 × 10⁶ m from Earth's centre", 6.0e24, 1000, 7.0e6, "satellite"],
    ];
    const i = rand(0, sets.length - 1);
    const [what, a, b, r] = sets[i];
    const F = (BIG_G * a * b) / (r * r);
    return mk({
      key: `grav-sky-${i}`,
      prompt: `What is the gravitational force between ${what}? (G = 6.67 × 10⁻¹¹ N·m²/kg²)`,
      ...sciChoices(F, r),
      hint: "F = G m₁ m₂ ÷ r². Handle the powers of 10 separately: multiply adds the exponents, divide subtracts.",
      explain: `F = 6.67 × 10⁻¹¹ × ${sci(a)} × ${sci(b)} ÷ (${sci(r)})² ≈ ${sci(F)} N.`,
    });
  }
  return card("grav", [
    {
      p: "Earth pulls on the Moon. Compared with that, the Moon pulls on Earth…",
      a: "exactly as hard",
      w: ["much less hard", "much harder", "not at all"],
      h: "Newton's third law, and F = Gm₁m₂/r² uses both masses the same way.",
      e: "The forces are equal and opposite. The Moon's pull moves Earth less because Earth's mass is so big, but it still raises the tides.",
    },
    {
      p: "Why don't you feel the gravity pulling you toward the person next to you?",
      a: "G is so tiny that the force is far too small",
      w: ["People have no gravity", "Gravity only acts between planets", "Their pull is cancelled by the air"],
      h: "Try F = Gm₁m₂/r² with two 60 kg people 1 m apart.",
      e: "Everything with mass attracts, but G = 6.67 × 10⁻¹¹ makes the pull between people about 10⁻⁷ N, far too small to feel.",
    },
    {
      p: "Can gravity ever push two masses apart?",
      a: "No: gravity only attracts",
      w: ["Yes, when they're far apart", "Yes, when one is very heavy", "Yes, in space"],
      h: "Mass comes in only one kind (no 'negative mass').",
      e: "Gravity is always attractive. Electric forces can attract or repel because charge comes in + and −.",
    },
  ]);
}

export function inverseSquare(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const f = pick([2, 3, 4, 0.5]);
    const F0 = pick([36, 72, 144, 16, 48, 64]);
    const F1 = clean(F0 / (f * f));
    return mk({
      key: `inv-r-${f}-${F0}`,
      prompt: `Two asteroids pull on each other with ${F0} N. Their distance becomes ${f === 0.5 ? "half as big" : `${f} times as big`}. What is the force now?`,
      visual: { kind: "phys-orbit", scene: "pair", masses: [{ label: "m₁", size: 1.2, colour: "cocoa" }, { label: "m₂", size: 0.9, colour: "cocoa" }], distance: f === 0.5 ? "r → r/2" : `r → ${f}r`, forceLabels: [F0, F0] },
      unit: "N",
      ...choose(F1, [F0 / f, F0 * f, F0 * f * f].map(clean).filter((x) => x !== F1), 1, 0),
      hint: "Inverse square: multiply the distance by k and the force is divided by k².",
      explain: `Distance ×${f} means force ÷ ${f}² = ÷${f * f}: ${F0} ÷ ${f * f} = ${ds(F1)} N.`,
    });
  }
  if (k === 1) {
    const [a, b] = pick([[2, 2], [4, 2], [2, 1], [3, 1], [1, 2], [9, 3], [8, 2], [2, 0.5]] as [number, number][]);
    const F0 = pick([20, 40, 60, 80]);
    const F1 = clean((F0 * a) / (b * b));
    const mw = a === 1 ? "stays the same" : `is multiplied by ${a}`;
    return mk({
      key: `inv-both-${a}-${b}-${F0}`,
      prompt: `Two moons attract with ${F0} N. One moon's mass ${mw} and the distance ${b === 1 ? "stays the same" : b === 0.5 ? "is halved" : `is multiplied by ${b}`}. What is the new force?`,
      unit: "N",
      ...choose(F1, [(F0 * a) / b, F0 * a * b * b, F0 / (b * b)].map(clean).filter((x) => x !== F1), 5, 0),
      hint: "F ∝ m₁m₂ ÷ r². Multiply by the mass factor, divide by the distance factor squared.",
      explain: `F = ${F0} × ${a} ÷ ${b}² = ${ds(F1)} N.`,
    });
  }
  if (k === 2) {
    const n = pick([4, 9, 16, 25, 100]);
    const root = Math.sqrt(n);
    return mk({
      key: `inv-find-${n}`,
      prompt: `How far from Earth's centre must a probe go to feel 1/${n} of the gravity it feels at the surface (distance R)?`,
      ...label(`${root}R`, [`${n}R`, `${n / 2}R`, `${root * 2}R`, `${root + 1}R`].filter((x) => x !== `${root}R`)),
      hint: "Gravity ∝ 1 ÷ r². Which distance squared gives " + n + "?",
      explain: `(${root})² = ${n}, so at ${root}R the force is 1/${n} as big.`,
    });
  }
  return card("inv", [
    {
      p: "'Inverse square' means that if you double the distance, the force…",
      a: "becomes ¼ as big",
      w: ["becomes ½ as big", "doubles", "becomes 4 times as big"],
      h: "F ∝ 1 ÷ r². Put in 2r.",
      e: "1 ÷ (2r)² = 1 ÷ 4r², so the force is a quarter as big.",
    },
    {
      p: "Which two forces both follow an inverse-square law?",
      a: "Gravity and the electric force",
      w: ["Friction and gravity", "Tension and the electric force", "Drag and friction"],
      h: "Newton's law of gravitation and Coulomb's law look alike.",
      e: "F = Gm₁m₂/r² and F = kq₁q₂/r²: both drop off with 1/r².",
    },
  ]);
}

const WORLDS_G: [string, number, number, string][] = [
  ["the Moon", 7.35e22, 1.74e6, "7.35 × 10²² kg, radius 1.74 × 10⁶ m"],
  ["Mars", 6.42e23, 3.39e6, "6.42 × 10²³ kg, radius 3.39 × 10⁶ m"],
  ["Earth", 5.97e24, 6.37e6, "5.97 × 10²⁴ kg, radius 6.37 × 10⁶ m"],
  ["Jupiter", 1.9e27, 7.15e7, "1.90 × 10²⁷ kg, radius 7.15 × 10⁷ m"],
  ["Mercury", 3.3e23, 2.44e6, "3.30 × 10²³ kg, radius 2.44 × 10⁶ m"],
];

export function gField(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const n = pick([2, 3, 4, 5, 10]);
    const g = r2(G / (n * n));
    return mk({
      key: `gf-far-${n}`,
      prompt: `At Earth's surface (1 Earth radius from the centre) g = 9.8 m/s². What is g at ${n} Earth radii from the centre? Round to 2 decimal places.`,
      visual: { kind: "phys-orbit", scene: "orbit", radiusLabel: `${n}R`, gravityLabel: "?", ecc: 0 },
      unit: "m/s²",
      ...keypad(g),
      hint: "g ∝ 1 ÷ r². Divide 9.8 by the distance factor squared.",
      explain: `g = 9.8 ÷ ${n}² = 9.8 ÷ ${n * n} ≈ ${g} m/s².`,
    });
  }
  if (k === 1) {
    const [a, b] = pick([[2, 1], [0.5, 1], [4, 2], [8, 2], [1, 2], [2, 2], [1, 0.5], [0.5, 0.5]] as [number, number][]);
    const g = r1((G * a) / (b * b));
    return mk({
      key: `gf-planet-${a}-${b}`,
      prompt: `A planet has ${a === 1 ? "the same mass as" : `${a} times the mass of`} Earth and ${b === 1 ? "the same radius" : `${b} times Earth's radius`}. What is g at its surface? Round to 1 decimal place.`,
      unit: "m/s²",
      ...keypad(g),
      hint: "g = GM ÷ R². Start from 9.8 m/s², multiply by the mass factor and divide by the radius factor squared.",
      explain: `g = 9.8 × ${a} ÷ ${b}² = ${g} m/s².`,
    });
  }
  if (k === 2) {
    const i = rand(0, WORLDS_G.length - 1);
    const [name, M, R, data] = WORLDS_G[i];
    const g = r1((BIG_G * M) / (R * R));
    return mk({
      key: `gf-calc-${i}`,
      prompt: `${name[0].toUpperCase()}${name.slice(1)}: mass ${data}. What is g at its surface? (G = 6.67 × 10⁻¹¹) Round to 1 decimal place.`,
      unit: "m/s²",
      ...keypad(g),
      hint: "g = GM ÷ R². Square the radius first.",
      explain: `g = 6.67 × 10⁻¹¹ × ${sci(M, 3)} ÷ (${sci(R, 3)})² ≈ ${g} m/s².`,
    });
  }
  return card("gf", [
    {
      p: "The space station orbits 400 km up, where g is about 8.7 m/s². Compared with the surface, gravity there is…",
      a: "almost as strong (about 90%)",
      w: ["zero", "about half", "stronger"],
      h: "400 km is small compared with Earth's 6400 km radius.",
      e: "r only grows from 6.4 to 6.8 thousand km, so g drops by only about 10%. Astronauts float because they're falling, not because gravity is gone.",
    },
    {
      p: "g at a planet's surface depends on…",
      a: "the planet's mass and radius",
      w: ["only the planet's mass", "the mass of the falling object", "only the planet's radius"],
      h: "g = GM ÷ R².",
      e: "g = GM/R²: more mass makes g bigger, a bigger radius makes it smaller. The falling object's mass cancels out.",
    },
  ]);
}

export function orbits(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const [f, sq] = pick([[4, 2], [9, 3], [0.25, 0.5], [16, 4]] as [number, number][]);
    const v0 = pick([4, 6, 8, 12]);
    const v1 = clean(v0 / sq);
    return mk({
      key: `orb-v-${f}-${v0}`,
      prompt: `A satellite orbits at ${v0} km/s. Another orbits ${f < 1 ? "at ¼ of that radius" : `at ${f} times that radius`}. How fast is it? (v = √(GM/r))`,
      visual: { kind: "phys-orbit", scene: "orbit", radiusLabel: "r", speedLabel: "v", gravityLabel: "F_g" },
      unit: "km/s",
      ...choose(v1, [v0 / f, v0 * f, v0 * sq].map(clean).filter((x) => x !== v1), 1, 0),
      hint: "v ∝ 1 ÷ √r. Take the square root of the radius factor, then divide.",
      explain: `√${f} = ${sq}, so v = ${v0} ÷ ${sq} = ${ds(v1)} km/s. ${f > 1 ? "Higher orbits are slower." : "Lower orbits are faster."}`,
    });
  }
  if (k === 1) {
    const sets: [string, number][] = [
      ["the space station, 6.77 × 10⁶ m", 6.77e6],
      ["a GPS satellite, 2.66 × 10⁷ m", 2.66e7],
      ["a geostationary satellite, 4.22 × 10⁷ m", 4.22e7],
      ["the Moon, 3.84 × 10⁸ m", 3.84e8],
    ];
    const i = rand(0, sets.length - 1);
    const [what, r] = sets[i];
    const v = r1(Math.sqrt(3.99e14 / r) / 1000);
    return mk({
      key: `orb-calc-${i}`,
      prompt: `How fast does ${what} from Earth's centre, orbit? (GM for Earth = 3.99 × 10¹⁴ m³/s²) Answer in km/s to 1 decimal place.`,
      speech: `How fast does ${what.replace(/(\d\.\d+) × 10([⁰-⁹]+)/, (_, a: string, e: string) => `${a} times 10 to the ${[...e].map((c) => SUPS.indexOf(c)).join("")}`)} from Earth's centre, orbit? GM for Earth is 3.99 times 10 to the 14. Answer in kilometers per second.`,
      unit: "km/s",
      ...keypad(v),
      hint: "Gravity provides the centripetal force: GMm/r² = mv²/r, so v = √(GM ÷ r).",
      explain: `v = √(3.99 × 10¹⁴ ÷ ${sci(r, 3)}) ≈ ${Math.round(Math.sqrt(3.99e14 / r))} m/s ≈ ${v} km/s.`,
    });
  }
  if (k === 2) {
    const where = pick([["closest to", "fastest"], ["farthest from", "slowest"]]);
    const at = where[1] === "fastest" ? 0 : 180;
    return mk({
      key: `orb-ellipse-${at}`,
      prompt: `A comet follows an elliptical orbit around the Sun. Where is it moving ${where[1]}?`,
      visual: { kind: "phys-orbit", scene: "orbit", planet: "☀️", satellite: "☄️", ecc: 0.5, at: 90, speedLabel: "v" },
      ...label(`${where[0][0].toUpperCase()}${where[0].slice(1)} the Sun`, [`${where[1] === "fastest" ? "Farthest from" : "Closest to"} the Sun`, "Same speed everywhere", "Halfway around"]),
      hint: "As it falls inward, gravity speeds it up; climbing back out slows it down.",
      explain: `Energy is conserved: close to the Sun it has less gravitational PE and more KE, so it's ${where[1]} ${where[0]} the Sun.`,
    });
  }
  if (k === 3) {
    const F0 = pick([400, 800, 1200, 2000]);
    const f = pick([2, 3]);
    return mk({
      key: `orb-force-${F0}-${f}`,
      prompt: `Earth pulls a satellite with ${F0} N. It moves to an orbit ${f} times as far from Earth's centre. What is the pull now?`,
      visual: { kind: "phys-orbit", scene: "orbit", radiusLabel: `r → ${f}r`, gravityLabel: F0 },
      unit: "N",
      ...choose(clean(F0 / (f * f)), [F0 / f, F0 * f].map(clean), 50, 0),
      hint: "Inverse square: ×" + f + " distance, ÷" + f * f + " force.",
      explain: `${F0} ÷ ${f}² = ${ds(F0 / (f * f))} N.`,
    });
  }
  return card("orb", [
    {
      p: "A satellite orbits Earth. Why doesn't it fall down?",
      a: "It is falling, but moving sideways so fast it keeps missing",
      w: ["There's no gravity in space", "Its engines hold it up", "The Moon pulls it up"],
      h: "Newton's cannonball: fire it fast enough and the ground curves away beneath it.",
      e: "Gravity pulls it toward Earth all the time; its sideways speed means the ground curves away as fast as it falls.",
    },
    {
      p: "If Earth's gravity suddenly vanished, an orbiting satellite would…",
      a: "fly off in a straight line along its path",
      w: ["fly straight outward", "stop dead", "keep orbiting"],
      h: "Newton's first law, with no force acting.",
      e: "With no force, it keeps its velocity: a straight line tangent to the orbit.",
    },
    {
      p: "Two satellites, 500 kg and 5000 kg, orbit at the same radius. How do their speeds compare?",
      a: "They're the same",
      w: ["The heavier is faster", "The lighter is faster", "The heavier falls down"],
      h: "v = √(GM/r): whose mass is M?",
      e: "M is the planet's mass. The satellite's own mass cancels, just like for falling objects.",
    },
  ]);
}

/** Two point charges on the grid, with signs, sizes and a distance label. */
function twoCharges(s1: "+" | "−", q1: number, s2: "+" | "−", q2: number, distance: Mark, forces = true): Visual {
  return {
    kind: "phys-magnets",
    scene: "charges",
    charges: [
      { sign: s1, x: -2, y: 0, q: Math.min(3, q1), label: `${s1 === "−" ? "−" : "+"}${q1} μC` },
      { sign: s2, x: 2, y: 0, q: Math.min(3, q2), label: `${s2 === "−" ? "−" : "+"}${q2} μC` },
    ],
    forces,
    distance,
  };
}

export function coulomb(): Question {
  const k = rand(0, 4);
  const sgn = () => pick(["+", "−"] as const);
  if (k <= 1) {
    const q1 = rand(1, 3);
    const q2 = rand(1, 3);
    const r = pick([0.05, 0.1, 0.3]);
    const F = r1((K_E * q1 * q2 * 1e-12) / (r * r));
    return mk({
      key: `coul-F-${q1}-${q2}-${r}`,
      prompt: `What is the size of the electric force between these charges, ${r} m apart? (k = 9.0 × 10⁹ N·m²/C²)`,
      speech: `What is the size of the electric force between a ${q1} microcoulomb charge and a ${q2} microcoulomb charge, ${r} meters apart? k is 9 times 10 to the 9.`,
      visual: twoCharges(sgn(), q1, sgn(), q2, r),
      unit: "N",
      ...keypad(F),
      hint: "F = k q₁ q₂ ÷ r². 1 μC = 10⁻⁶ C, so q₁q₂ gives 10⁻¹².",
      explain: `F = 9.0 × 10⁹ × ${q1} × 10⁻⁶ × ${q2} × 10⁻⁶ ÷ ${r}² = ${F} N.`,
    });
  }
  if (k === 2) {
    const q = rand(1, 5);
    const F = r1(0.1 * q * q);
    return mk({
      key: `coul-q-${q}`,
      prompt: `Two equal charges 0.3 m apart repel with ${F} N. How big is each charge, in μC? (k = 9.0 × 10⁹ N·m²/C²)`,
      unit: "μC",
      ...keypad(q),
      hint: "F = kq² ÷ r², so q = √(F r² ÷ k). Then convert C to μC (× 10⁶).",
      explain: `q² = ${F} × 0.09 ÷ (9.0 × 10⁹) = ${sci((F * 0.09) / K_E)} C², so q = ${sci(q * 1e-6, 1)} C = ${q} μC.`,
    });
  }
  if (k === 3) {
    const s1 = sgn();
    const s2 = sgn();
    const att = s1 !== s2;
    return mk({
      key: `coul-dir-${s1}-${s2}-${rand(1, 3)}`,
      prompt: `A ${s1 === "+" ? "positive" : "negative"} charge sits near a ${s2 === "+" ? "positive" : "negative"} charge. Do they attract or repel?`,
      visual: twoCharges(s1, 1, s2, 2, "r", false),
      ...label(att ? "Attract" : "Repel", [att ? "Repel" : "Attract", "Neither: only gravity acts"]),
      hint: "Like charges repel; unlike charges attract.",
      explain: att ? "Opposite signs attract each other." : "Like signs repel each other.",
    });
  }
  return mk({
    key: "coul-hydrogen",
    prompt: "In a hydrogen atom, the electron (−1.6 × 10⁻¹⁹ C) is 5.3 × 10⁻¹¹ m from the proton (+1.6 × 10⁻¹⁹ C). What is the electric force? (k = 9.0 × 10⁹)",
    ...sciChoices((K_E * 1.6e-19 * 1.6e-19) / (5.3e-11 * 5.3e-11), 5.3e-11),
    hint: "F = k q₁ q₂ ÷ r². Square 5.3 × 10⁻¹¹ carefully: 28.1 × 10⁻²².",
    explain: `F = 9.0 × 10⁹ × (1.6 × 10⁻¹⁹)² ÷ (5.3 × 10⁻¹¹)² ≈ ${sci((K_E * 1.6e-19 * 1.6e-19) / (5.3e-11 * 5.3e-11))} N, attractive.`,
  });
}

export function chargeRatios(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const a = pick([1, 2, 3]);
    const b = pick([1, 2, 3]);
    const d = pick([1, 2, 3, 0.5]);
    if (a === 1 && b === 1 && d === 1) return chargeRatios();
    const F0 = pick([4, 8, 12, 36]);
    const F1 = clean((F0 * a * b) / (d * d));
    const parts = [a !== 1 ? `q₁ is multiplied by ${a}` : "", b !== 1 ? `q₂ is multiplied by ${b}` : "", d !== 1 ? (d === 0.5 ? "the distance is halved" : `the distance is multiplied by ${d}`) : ""].filter(Boolean);
    return mk({
      key: `cr-${a}-${b}-${d}-${F0}`,
      prompt: `Two charges push on each other with ${F0} N. Then ${parts.join(" and ")}. What is the new force?`,
      visual: { kind: "phys-magnets", scene: "charges", charges: [{ sign: "+", x: -2, y: 0, label: "q₁" }, { sign: "+", x: 2, y: 0, label: "q₂" }], forces: true, forceLabels: [F0, F0], distance: "r" },
      unit: "N",
      ...choose(F1, [(F0 * a * b) / d, F0 * a * b * d * d, F0 * (a + b) / (d * d)].map(clean).filter((x) => x !== F1), 2, 0),
      hint: "F ∝ q₁q₂ ÷ r². Multiply by each charge factor and divide by the distance factor squared.",
      explain: `F = ${F0} × ${a} × ${b} ÷ ${d}² = ${ds(F1)} N.`,
    });
  }
  if (k === 2) {
    const sL = pick(["+", "−"] as const);
    const sR = pick(["+", "−"] as const);
    const fL = rand(1, 6);
    let fR = rand(1, 6);
    if (fR === fL && sL !== sR) fR = fL === 6 ? 5 : fL + 1;
    // Middle charge is positive. Left: repel pushes right (+), attract pulls left (−). Right: repel pushes left, attract pulls right.
    const fromL = sL === "+" ? fL : -fL;
    const fromR = sR === "+" ? -fR : fR;
    const net = fromL + fromR;
    return mk({
      key: `cr-line-${sL}${sR}-${fL}-${fR}`,
      prompt: `Charge A pushes or pulls the middle charge q with ${fL} N; charge B does with ${fR} N. What is the net force on q? (right is +)`,
      visual: {
        kind: "phys-magnets",
        scene: "charges",
        charges: [
          { sign: sL, x: -3, y: 0, label: "A" },
          { sign: "+", x: 0, y: 0, label: "q" },
          { sign: sR, x: 3, y: 0, label: "B" },
        ],
      },
      needsVisual: true,
      unit: "N",
      ...signed(net),
      hint: "Work out each direction first: like charges push the middle one away, unlike charges pull it closer.",
      explain: `A (${sL}): ${sL === "+" ? "repels, pushing right" : "attracts, pulling left"} ${fL} N. B (${sR}): ${sR === "+" ? "repels, pushing left" : "attracts, pulling right"} ${fR} N. Net = ${ds(fromL)} + ${ds(fromR)} = ${ds(net)} N.`,
    });
  }
  if (k === 3) {
    const q1 = rand(2, 5);
    const F = pick([3, 6, 9, 12]);
    return mk({
      key: `cr-third-${q1}-${F}`,
      prompt: `A +${q1} μC charge pushes a +1 μC charge with ${F} N. How hard does the +1 μC charge push the +${q1} μC charge?`,
      unit: "N",
      ...choose(F, [F * q1, F / q1].map(clean), 1, 0),
      hint: "Coulomb's law uses q₁q₂ for both, and Newton's third law applies.",
      explain: `Exactly ${F} N: the forces are an equal and opposite pair, even though the charges are different.`,
    });
  }
  return card("cr", [
    {
      p: "A rubbed balloon sticks to a neutral wall. Why?",
      a: "It pulls the wall's charges so unlike charges sit closer",
      w: ["The wall is positively charged", "Gravity pulls it sideways", "Air pressure holds it"],
      h: "Inside the wall, charges can shift a little.",
      e: "The balloon's charge attracts unlike charges in the wall slightly closer and pushes like ones away. The closer charges win, because force falls with distance.",
    },
    {
      p: "Two charges are moved 10 times farther apart. The force between them becomes…",
      a: "100 times smaller",
      w: ["10 times smaller", "1000 times smaller", "the same"],
      h: "F ∝ 1 ÷ r².",
      e: "10² = 100, so the force is 1/100 as big.",
    },
  ]);
}

const PAIR_POOL: [string, number][] = [
  ["+ and − charges", 0],
  ["a proton and an electron", 0],
  ["Earth and the Moon", 0],
  ["N pole facing S pole", 0],
  ["you and Earth", 0],
  ["two neutral bowling balls", 0],
  ["+ rod and − bead", 0],
  ["two electrons", 1],
  ["two protons", 1],
  ["+3 μC and +1 μC", 1],
  ["N pole facing N pole", 1],
  ["two − balloons", 1],
  ["S pole facing S pole", 1],
];

export function chargeSort(): Question {
  const att = shuffle(PAIR_POOL.filter((p) => p[1] === 0)).slice(0, rand(3, 4));
  const rep = shuffle(PAIR_POOL.filter((p) => p[1] === 1)).slice(0, rand(3, 4));
  const items = shuffle([...att, ...rep]);
  return act({
    key: `csort-${items.map((i) => PAIR_POOL.indexOf(i)).sort((a, b) => a - b).join("_")}`,
    prompt: "Sort each pair: do they attract or repel?",
    activity: { kind: "sort", bins: ["Attract", "Repel"], items: items.map(([label, bin]) => ({ label, bin })) },
    answer: att.length,
    hint: "Gravity always attracts. Electric charges and magnetic poles: like repel, unlike attract.",
    explain: `Attract: ${att.map((a) => a[0]).join(", ")}. Repel: ${rep.map((r) => r[0]).join(", ")}.`,
  });
}

export function chargeArrows(): Question {
  const v = rand(0, 2);
  if (v === 0) {
    const a = rand(1, 6);
    let b = rand(1, 6);
    if (a === b) b = a === 1 ? 2 : a - 1;
    const d = a - b;
    return act({
      key: `carr-hold-${a}-${b}`,
      prompt: `A charged bead feels ${a} N to the right from one charge and ${b} N to the left from another. Draw the force a thread must give to hold it still.`,
      activity: {
        kind: "phys-forceArrows",
        object: "dot",
        directions: 8,
        maxSize: 6,
        given: [{ dir: 0, size: a, label: "F_A" }, { dir: 180, size: b, label: "F_B" }],
        arrows: [{ label: "T", answer: { dir: d > 0 ? 180 : 0, size: Math.abs(d) } }],
      },
      answer: Math.abs(d),
      hint: "Find the net electric force first; the thread must cancel it.",
      explain: `Electric net = ${Math.abs(d)} N ${d > 0 ? "right" : "left"}, so the thread pulls ${Math.abs(d)} N ${d > 0 ? "left" : "right"}.`,
    });
  }
  if (v === 1) {
    const places = [
      { where: "to the left of", dir: 180 },
      { where: "to the right of", dir: 0 },
      { where: "above", dir: 90 },
      { where: "below", dir: 270 },
    ];
    const p = rand(0, 3);
    const A = pick(["+", "−"]);
    const B = pick(["+", "−"]);
    const n = rand(2, 6);
    const attract = A !== B;
    const towardA = places[p].dir;
    const ans = attract ? towardA : (towardA + 180) % 360;
    return act({
      key: `carr-dir-${p}-${A}${B}-${n}`,
      prompt: `Charge A (${A}) is ${places[p].where} charge B (${B}). The force on B is ${n} N. Draw it on B.`,
      activity: { kind: "phys-forceArrows", object: "dot", directions: 8, maxSize: 6, arrows: [{ label: "F", answer: { dir: ans, size: n } }], check: "exact" },
      answer: n,
      hint: "Like charges repel (B is pushed away from A); unlike charges attract (B is pulled toward A).",
      explain: `${attract ? "Unlike charges attract, so B is pulled toward A" : "Like charges repel, so B is pushed away from A"}: ${n} N ${({ 0: "right", 90: "up", 180: "left", 270: "down" } as Record<number, string>)[ans]}.`,
    });
  }
  const [F0, f, F1] = pick([[1, 0.5, 4], [4, 2, 1]] as [number, number, number][]);
  return act({
    key: `carr-inv-${F0}-${f}`,
    prompt: `Two charges repel. The force on the right one is ${F0} N. Draw the force on it when their distance is ${f === 0.5 ? "halved" : "doubled"}.`,
    activity: { kind: "phys-forceArrows", object: "dot", directions: 8, maxSize: 6, arrows: [{ label: "F", answer: { dir: 0, size: F1 } }], check: "exact" },
    answer: F1,
    hint: "Repelling pushes the right charge to the right. Force ∝ 1 ÷ r².",
    explain: `Distance ×${ds(r2(f))} → force ÷ ${ds(r2(f * f))}: ${F0} N becomes ${F1} N, still pointing right.`,
  });
}

export function gravityVsElectric(): Question {
  const k = rand(0, 4);
  if (k === 3) {
    if (rand(0, 3) === 0) {
      const F = (BIG_G * 9.11e-31 * 1.67e-27) / (5.3e-11 * 5.3e-11);
      return mk({
        key: "gve-hydrogen-g",
        prompt: "In hydrogen, the electron (9.11 × 10⁻³¹ kg) is 5.3 × 10⁻¹¹ m from the proton (1.67 × 10⁻²⁷ kg). What is the gravitational force between them?",
        ...sciChoices(F, 5.3e-11),
        hint: "F = G m₁ m₂ ÷ r² with G = 6.67 × 10⁻¹¹. Multiply the mantissas and add the powers of 10.",
        explain: `F ≈ ${sci(F)} N. The electric force between them is about 8.2 × 10⁻⁸ N, roughly 10³⁹ times bigger.`,
      });
    }
    const m = pick([100, 500, 1000, 2000, 5000, 10000]);
    const q = m * Math.sqrt(BIG_G / K_E);
    return mk({
      key: `gve-q-${m}`,
      prompt: `Two ${m} kg spheres each get the same charge q. What q makes their electric repulsion equal their gravitational pull?`,
      ...label(`${sci(q)} C`, [`${sci(q * 1e3)} C`, `${sci(q / 1e3)} C`, `${sci(q * q)} C`]),
      hint: "Set kq²/r² = Gm²/r². The r² cancels, so q = m√(G ÷ k).",
      explain: `q = ${m} × √(6.67 × 10⁻¹¹ ÷ 9.0 × 10⁹) ≈ ${sci(q)} C, at any distance. A tiny charge cancels all that gravity.`,
    });
  }
  if (k === 0) {
    const pair = pick([["two protons", 1.67e-27, "1.67 × 10⁻²⁷"], ["two electrons", 9.11e-31, "9.11 × 10⁻³¹"]] as [string, number, string][]);
    const ratio = (K_E * 1.6e-19 * 1.6e-19) / (BIG_G * pair[1] * pair[1]);
    return mk({
      key: `gve-ratio-${pair[0]}`,
      prompt: `For ${pair[0]} (charge 1.6 × 10⁻¹⁹ C, mass ${pair[2]} kg each), how many times stronger is the electric force than gravity?`,
      ...label(sci(ratio), [sci(ratio / 1e6), sci(ratio * 1e6), sci(ratio / 1e20)]),
      hint: "Divide kq² by Gm². The distance cancels, because both are inverse square!",
      explain: `F(electric) ÷ F(gravity) = (9.0 × 10⁹ × (1.6 × 10⁻¹⁹)²) ÷ (6.67 × 10⁻¹¹ × (${pair[2]})²) ≈ ${sci(ratio)}, at any distance.`,
    });
  }
  if (k === 1) {
    const f = pick([2, 3, 10]);
    return mk({
      key: `gve-both-${f}`,
      prompt: `Two charged moons attract by gravity AND electrically. If their distance is multiplied by ${f}, what happens to the ratio of the electric force to gravity?`,
      ...label("It stays the same", [`It grows ${f * f} times`, `It shrinks ${f * f} times`, `It grows ${f} times`]),
      hint: "Both forces are inverse-square.",
      explain: `Both forces drop by ${f}² = ${f * f}, so their ratio doesn't change.`,
    });
  }
  return card("gve", [
    {
      p: "The electric force is far stronger than gravity. So why does gravity rule the motion of planets?",
      a: "Big objects are almost exactly neutral, so electric forces cancel",
      w: ["Electric forces don't work in space", "Planets have no charges", "Gravity gets stronger with distance"],
      h: "Charge comes in + and −; mass only comes in one kind.",
      e: "Planets have nearly equal + and − charge, so the electric pulls and pushes cancel. Gravity always adds up, so with huge masses it wins.",
    },
    {
      p: "Which force holds the electrons in an atom?",
      a: "The electric force",
      w: ["Gravity", "Friction", "The magnetic force of Earth"],
      h: "Protons are +, electrons are −.",
      e: "The nucleus's positive charge attracts the negative electrons. Gravity inside an atom is about 10³⁹ times weaker.",
    },
    {
      p: "What is one big difference between gravity and the electric force?",
      a: "Gravity only attracts; electric forces can attract or repel",
      w: ["Only gravity is inverse-square", "Electric forces need contact", "Gravity can repel"],
      h: "Think about the signs of mass and charge.",
      e: "There's no negative mass, so gravity only attracts. Charges can be + or −, so the electric force can do both.",
    },
    {
      p: "A small magnet lifts a paper clip off the floor. What does this show?",
      a: "A small magnet's pull beats the whole Earth's gravity",
      w: ["The clip has no weight", "Gravity switches off near magnets", "The clip is lighter than air"],
      h: "Compare the size of the two objects doing the pulling.",
      e: "The whole Earth pulls the clip down, yet a tiny magnet wins. Electromagnetic forces are vastly stronger than gravity.",
    },
  ]);
}

export function fieldEnergy(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const m = pick([2, 5, 10, 20, 50]);
    const h = pick([2, 3, 5, 10, 20]);
    return mk({
      key: `fe-lift-${m}-${h}`,
      prompt: `You lift a ${m} kg box ${h} m. How much energy is stored in the Earth–box gravitational field? (g = 9.8 m/s²)`,
      unit: "J",
      ...keypad(r1(m * G * h)),
      hint: "The work you do, mgh, is stored as gravitational potential energy of the Earth–box system.",
      explain: `ΔE = mgh = ${m} × 9.8 × ${h} = ${r1(m * G * h)} J. Let go, and the field turns it back into kinetic energy.`,
    });
  }
  if (k === 1) {
    const s1 = pick(["+", "−"] as const);
    const s2 = pick(["+", "−"] as const);
    const closer = rand(0, 1) === 1;
    const like = s1 === s2;
    const up = like === closer;
    return mk({
      key: `fe-charge-${s1}${s2}-${closer}`,
      prompt: `You push these two charges ${closer ? "closer together" : "farther apart"}. What happens to the energy stored in their electric field?`,
      visual: { kind: "phys-magnets", scene: "charges", charges: [{ sign: s1, x: -2, y: 0 }, { sign: s2, x: 2, y: 0 }], lines: true },
      needsVisual: true,
      ...label(up ? "It increases" : "It decreases", [up ? "It decreases" : "It increases", "It stays the same"]),
      hint: "If you have to push against the force, you do work and the field stores it.",
      explain: up
        ? `${like ? "Like charges repel, so pushing them together" : "Unlike charges attract, so pulling them apart"} takes work, which is stored in the field.`
        : `${like ? "Like charges want to fly apart" : "Unlike charges want to come together"}, so this move lets the field release energy.`,
    });
  }
  if (k === 2) {
    const [m, v] = pick([[0.002, 10], [0.002, 20], [0.005, 10], [0.01, 10], [0.002, 30], [0.01, 20]] as [number, number][]);
    const E = clean(0.5 * m * v * v);
    return mk({
      key: `fe-release-${m}-${v}`,
      prompt: `Two like charges store ${ds(E)} J in their field. One is fixed; the other (${m} kg) is released and flies off. What is its top speed?`,
      unit: "m/s",
      ...keypad(v),
      hint: "All the field energy becomes kinetic energy: ½mv² = E, so v = √(2E ÷ m).",
      explain: `v = √(2 × ${ds(E)} ÷ ${m}) = √${2 * E / m} = ${v} m/s.`,
    });
  }
  return card("fe", [
    {
      p: "Two magnets snap together and click. Where did the sound energy come from?",
      a: "Energy stored in their magnetic field",
      w: ["From nowhere", "From the magnets' mass", "From the air around them"],
      h: "Pulling them apart again takes work.",
      e: "Held apart, the magnets store energy in their field. As they snap together it becomes kinetic energy, then sound and heat.",
    },
    {
      p: "Where is the potential energy of a lifted book really stored?",
      a: "In the Earth–book system (the gravitational field)",
      w: ["Inside the book only", "In your arm", "It isn't stored anywhere"],
      h: "Without Earth, lifting wouldn't store anything.",
      e: "Potential energy belongs to the interaction, the field between Earth and the book, not to the book alone.",
    },
    {
      p: "A capacitor in a camera flash charges up, then fires. While charged, its energy is stored in…",
      a: "the electric field between its plates",
      w: ["the moving electrons", "the bulb", "the battery only"],
      h: "Separating + and − charges takes work.",
      e: "The battery separates charges onto the two plates; that energy sits in the electric field between them until the flash releases it.",
    },
  ]);
}

/* =================================================================== world 5: electromagnetism */

export function ohm(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const V = pick([6, 9, 12, 24]);
    const I = pick([0.5, 1, 1.5, 2, 3].filter((i) => Number.isInteger(V / i)));
    const R = V / I;
    const r1v = rand(1, R - 1);
    return mk({
      key: `ohm-series-${V}-${I}-${r1v}`,
      prompt: "What does the ammeter read?",
      visual: { kind: "phys-circuit", top: [{ part: "cell", label: V, cells: 2 }, { part: "ammeter", label: "?" }], bottom: [{ part: "resistor", label: r1v, name: "R₁" }, { part: "resistor", label: R - r1v, name: "R₂" }] },
      needsVisual: true,
      unit: "A",
      ...keypad(I, [V / r1v, V * R]),
      hint: "In series the resistances add. Then I = V ÷ (total R).",
      explain: `R = ${r1v} + ${R - r1v} = ${R} Ω; I = ${V} ÷ ${R} = ${ds(I)} A.`,
    });
  }
  if (k === 1) {
    const I = pick([0.5, 1, 2, 3]);
    const R1 = rand(1, 6);
    const R2 = rand(1, 6);
    const V = I * (R1 + R2);
    if (!Number.isInteger(V)) return ohm();
    return mk({
      key: `ohm-across-${I}-${R1}-${R2}`,
      prompt: "What does the voltmeter across R₁ read?",
      visual: {
        kind: "phys-circuit",
        top: [{ part: "cell", label: V }, { part: "ammeter", label: I }],
        bottom: [{ part: "resistor", name: "R₁", label: R1, across: "?" }, { part: "resistor", name: "R₂", label: R2 }],
      },
      needsVisual: true,
      unit: "V",
      ...keypad(clean(I * R1), [V, clean(I * R2)]),
      hint: "V = IR for that one resistor. The same current flows through every part of a series loop.",
      explain: `V₁ = ${ds(I)} × ${R1} = ${ds(I * R1)} V (and R₂ gets the other ${ds(I * R2)} V).`,
    });
  }
  if (k === 2) {
    const V = pick([6, 12]);
    const [R1, R2] = pick([[2, 3], [3, 6], [2, 6], [4, 12], [6, 6], [3, 3], [2, 4], [4, 6]] as [number, number][]);
    const I = clean(V / R1 + V / R2);
    if (V === 6 && R1 === 4) return ohm();
    return mk({
      key: `ohm-par-${V}-${R1}-${R2}`,
      prompt: "The resistors are in parallel. What does the ammeter read?",
      visual: {
        kind: "phys-circuit",
        top: [{ part: "cell", label: V }, { part: "ammeter", label: "?" }],
        branches: [[{ part: "resistor", name: "R₁", label: R1 }], [{ part: "resistor", name: "R₂", label: R2 }]],
      },
      needsVisual: true,
      unit: "A",
      ...keypad(I, [clean(V / (R1 + R2))]),
      hint: "Each branch gets the full voltage. Find each branch current with I = V ÷ R, then add them.",
      explain: `${V} ÷ ${R1} = ${ds(V / R1)} A, ${V} ÷ ${R2} = ${ds(V / R2)} A; total ${ds(I)} A.`,
    });
  }
  if (k === 3) {
    const V = pick([3, 6, 9, 12, 230]);
    const I = pick([0.5, 2, 4, 10]);
    const t = pick([10, 60, 120, 300]);
    const askE = rand(0, 1) === 1;
    return mk({
      key: `ohm-power-${V}-${I}-${t}-${askE}`,
      prompt: askE ? `A heater runs on ${V} V and draws ${ds(I)} A for ${t} s. How much energy does it transfer?` : `A device runs on ${V} V and draws ${ds(I)} A. What is its power?`,
      unit: askE ? "J" : "W",
      ...keypad(clean(askE ? V * I * t : V * I)),
      hint: askE ? "P = VI, then energy = P × t." : "P = VI.",
      explain: askE ? `P = ${V} × ${ds(I)} = ${ds(V * I)} W; E = ${ds(V * I)} × ${t} = ${ds(V * I * t)} J.` : `P = ${V} × ${ds(I)} = ${ds(V * I)} W.`,
    });
  }
  const I = pick([0.5, 2, 3, 5]);
  const t = pick([10, 20, 60]);
  return mk({
    key: `ohm-charge-${I}-${t}`,
    prompt: `A current of ${ds(I)} A flows for ${t} s. How much charge passes?`,
    unit: "C",
    ...keypad(clean(I * t), [I / t, t / I].map(r2)),
    hint: "Current is charge per second: Q = I × t.",
    explain: `Q = ${ds(I)} × ${t} = ${ds(I * t)} C (1 A = 1 C every second).`,
  });
}

export function buildCircuit(): Question {
  const v = rand(0, 2);
  if (v === 0) {
    const two = rand(0, 1) === 1;
    const bottom: CircuitPart[] = two ? [{ part: "bulb", name: "A" }, { part: "gap" }, { part: "bulb", name: "B" }] : [{ part: "gap" }, { part: "bulb", name: "A" }, { part: "gap" }];
    const top: CircuitPart[] = rand(0, 1) ? [{ part: "cell", label: 6 }, { part: "gap" }] : [{ part: "cell", label: 6 }, { part: "switch", closed: false }];
    return act({
      key: `build-series-${two}-${top[1].part}`,
      prompt: `Complete the circuit so ${two ? "both bulbs light" : "the bulb lights"}. Tap the gaps and switches.`,
      activity: { kind: "phys-buildCircuit", top, bottom, lit: two ? ["A", "B"] : ["A"] },
      answer: two ? 2 : 1,
      hint: "Current needs one unbroken loop from the cell, through every part, and back.",
      explain: "Every gap filled and every switch closed makes a complete series loop, so current flows through each bulb.",
    });
  }
  if (v === 1) {
    const names = ["A", "B", "C"].slice(0, rand(2, 3));
    const want = shuffle(names).slice(0, rand(1, names.length - 1)).sort();
    const branches: CircuitPart[][] = names.map((n) => [{ part: "bulb", name: n }, rand(0, 1) ? { part: "gap" } : { part: "switch", closed: rand(0, 1) === 1 }]);
    const top: CircuitPart[] = [{ part: "cell", label: 9 }, { part: "switch", closed: false }];
    return act({
      key: `build-par-${names.length}-${want.join("")}-${branches.map((b) => (b[1].part === "gap" ? "g" : (b[1] as { closed: boolean }).closed ? "c" : "o")).join("")}`,
      prompt: `Light only bulb${want.length > 1 ? "s" : ""} ${want.join(" and ")}. The other bulb${names.length - want.length > 1 ? "s" : ""} must stay dark.`,
      activity: { kind: "phys-buildCircuit", top, branches, lit: want },
      answer: want.length,
      hint: "In parallel, each branch is its own path. Close the main switch, then complete only the branches you want.",
      explain: `Close the main switch and complete the branch${want.length > 1 ? "es" : ""} with ${want.join(" and ")}; leave the other branch${names.length - want.length > 1 ? "es" : ""} open.`,
    });
  }
  const order = rand(0, 1);
  const branches: CircuitPart[][] = order ? [[{ part: "bulb", name: "A" }, { part: "gap" }], [{ part: "gap" }]] : [[{ part: "gap" }], [{ part: "bulb", name: "A" }, { part: "gap" }]];
  return act({
    key: `build-short-${order}-${rand(0, 1)}`,
    prompt: "Light bulb A, but don't create a short circuit!",
    activity: { kind: "phys-buildCircuit", top: [{ part: "cell", label: 3 }, { part: "gap" }], branches, lit: ["A"] },
    answer: 1,
    hint: "A branch of plain wire has no resistance: almost all the current would rush through it instead of the bulb.",
    explain: "Fill the main gap and the bulb's branch only. Filling the empty branch makes a short circuit: a huge current, a dark bulb, and a hot battery.",
  });
}

export function wireField(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const cur = pick(["out", "in"] as const);
    const ccw = cur === "out";
    return mk({
      key: `wire-circ-${cur}`,
      prompt: `The current flows ${cur === "out" ? "out of the page (•)" : "into the page (✕)"}. Which way do the magnetic field lines circle, seen from here?`,
      visual: { kind: "phys-magnets", scene: "wire", current: cur, label: "I" },
      ...label(ccw ? "Counterclockwise" : "Clockwise", [ccw ? "Clockwise" : "Counterclockwise", "Straight out from the wire", "There is no field"]),
      hint: "Right-hand rule: thumb along the current, fingers curl the way the field goes.",
      explain: `Point your right thumb ${cur === "out" ? "toward you" : "into the page"}: your fingers curl ${ccw ? "counterclockwise" : "clockwise"}.`,
    });
  }
  if (k === 1) {
    const cur = pick(["out", "in"] as const);
    const places = ["right of", "left of", "above", "below"];
    const p = rand(0, 3);
    // Counterclockwise (current out): right → up, above → left, left → down, below → right.
    const ccwDir = ["Up the page", "Down the page", "Left", "Right"][p];
    const opposite: Record<string, string> = { "Up the page": "Down the page", "Down the page": "Up the page", Left: "Right", Right: "Left" };
    const ans = cur === "out" ? ccwDir : opposite[ccwDir];
    return mk({
      key: `wire-compass-${cur}-${p}`,
      prompt: `Current flows ${cur === "out" ? "out of" : "into"} the page. A compass sits just ${places[p]} the wire. Which way does its N end point?`,
      visual: { kind: "phys-magnets", scene: "wire", current: cur, label: "I" },
      ...label(ans, ["Up the page", "Down the page", "Left", "Right", "Toward the wire"].filter((x) => x !== ans)),
      hint: "The compass lines up with the field, which circles the wire. Use the right-hand rule to find the circling direction, then look at that spot.",
      explain: `The field circles ${cur === "out" ? "counterclockwise" : "clockwise"}; at a point ${places[p]} the wire, that is ${ans.toLowerCase()}.`,
    });
  }
  if (k === 2) {
    const I = pick([5, 10, 20, 50]);
    const r = pick([0.01, 0.02, 0.05, 0.1]);
    const B = clean((0.2 * I) / r);
    return mk({
      key: `wire-B-${I}-${r}`,
      prompt: `How strong is the magnetic field ${r} m from a long wire carrying ${I} A? Use B = 2 × 10⁻⁷ × I ÷ r, and answer in microtesla (μT).`,
      speech: `How strong is the magnetic field ${r} meters from a long wire carrying ${I} amps? Use B equals 2 times 10 to the minus 7 times I over r. Answer in microtesla.`,
      unit: "μT",
      ...keypad(B),
      hint: "Work out B in tesla, then multiply by 1,000,000 to get μT.",
      explain: `B = 2 × 10⁻⁷ × ${I} ÷ ${r} = ${sci(B * 1e-6)} T = ${ds(B)} μT. Earth's field is about 50 μT.`,
    });
  }
  return card("wire", [
    {
      p: "In 1820 Ørsted saw a compass needle move near a wire. What made it move?",
      a: "The current in the wire made a magnetic field",
      w: ["The wire was made of iron", "Static electricity on the needle", "Heat from the wire"],
      h: "The needle only moved when the current was switched on.",
      e: "Every electric current makes a magnetic field around it. That was the first link between electricity and magnetism.",
    },
    {
      p: "You reverse the current in a wire. The magnetic field around it…",
      a: "reverses direction",
      w: ["disappears", "doubles", "stays the same"],
      h: "Right-hand rule: flip your thumb.",
      e: "Flip the current and the field circles the other way, so nearby compasses turn around.",
    },
    {
      p: "Moving farther from a current-carrying wire, the magnetic field…",
      a: "gets weaker",
      w: ["gets stronger", "stays the same", "reverses"],
      h: "B = 2 × 10⁻⁷ I ÷ r.",
      e: "B ∝ 1/r for a long straight wire: twice as far, half the field.",
    },
  ]);
}

export function electromagnets(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const B0 = pick([20, 40, 60, 80]);
    const what = pick([["current is doubled", 2], ["current is halved", 0.5], ["distance is doubled", 0.5], ["distance is halved", 2], ["current is tripled", 3]] as [string, number][]);
    return mk({
      key: `em-ratio-${B0}-${what[0].slice(0, 12)}`,
      prompt: `A wire's field at a point is ${B0} μT. The ${what[0]}. What is the field now?`,
      unit: "μT",
      ...choose(clean(B0 * what[1]), [B0 / what[1], B0 * what[1] * what[1], B0].map(clean), 10, 0),
      hint: "For a long wire, B ∝ I ÷ r: more current, stronger field; more distance, weaker field (not inverse square).",
      explain: `B × ${what[1]} = ${ds(B0 * what[1])} μT.`,
    });
  }
  if (k === 1) {
    const per = pick([2, 3, 4]);
    const turns = [10, 20, 30, 40];
    const ask = rand(2, 3);
    return mk({
      key: `em-clips-${per}-${ask}`,
      prompt: `An electromagnet's number of turns is changed, with the same current. How many paper clips should it lift with ${turns[ask]} turns?`,
      visual: table(["Turns", ...turns], ["Clips", ...turns.map((t, i) => (i < ask ? (t / 10) * per : i === ask ? "?" : "—"))]),
      needsVisual: true,
      ...keypad((turns[ask] / 10) * per),
      hint: "Look at the pattern: each extra 10 turns adds the same number of clips.",
      explain: `Every 10 turns lifts ${per} more clips (the field is proportional to the turns), so ${turns[ask]} turns lift ${(turns[ask] / 10) * per}.`,
    });
  }
  if (k === 2) {
    const n = pick([500, 1000, 2000]);
    const I = pick([1, 2, 4, 5]);
    const B = r1(4 * Math.PI * 1e-7 * n * I * 1000);
    return mk({
      key: `em-sol-${n}-${I}`,
      prompt: `A long coil has ${n} turns per metre and carries ${I} A. What is the field inside, in millitesla? (B = μ₀nI, μ₀ = 4π × 10⁻⁷) Round to 1 decimal place.`,
      speech: `A long coil has ${n} turns per meter and carries ${I} amps. What is the field inside, in millitesla? B equals mu nought n I, with mu nought equal to 4 pi times 10 to the minus 7.`,
      unit: "mT",
      ...keypad(B),
      hint: "Multiply μ₀ × n × I to get tesla, then × 1000 for mT.",
      explain: `B = 4π × 10⁻⁷ × ${n} × ${I} ≈ ${sci(B / 1000, 3)} T = ${B} mT.`,
    });
  }
  return card("em", [
    {
      p: "Which change makes an electromagnet WEAKER?",
      a: "Taking out its iron core",
      w: ["Adding more turns of wire", "Increasing the current", "Winding the coil tighter"],
      h: "The iron core concentrates the field.",
      e: "Iron becomes magnetized by the coil and adds its own field. Without it the magnet is far weaker.",
    },
    {
      p: "Why can a scrapyard crane use an electromagnet instead of a permanent magnet?",
      a: "Switching off the current drops the load",
      w: ["Electromagnets are lighter", "Permanent magnets can't lift iron", "It works without electricity"],
      h: "What happens to the field when the current stops?",
      e: "No current, no field: the electromagnet can be switched off to let go.",
    },
    {
      p: "A coil of wire carrying a current (a solenoid) has a field shaped like…",
      a: "a bar magnet's",
      w: ["a horseshoe magnet's", "straight lines out of the wire", "no field outside"],
      h: "Each loop adds its field to the others.",
      e: "The loops add up into a field that runs through the coil and loops around outside, with an N end and an S end, just like a bar magnet.",
    },
  ]);
}

export function motorEffect(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const B = pick([0.1, 0.2, 0.5, 1.5]);
    const I = pick([2, 3, 5, 10]);
    const L = pick([0.1, 0.2, 0.5]);
    return mk({
      key: `motor-F-${B}-${I}-${L}`,
      prompt: `A ${L} m wire carrying ${I} A sits across a ${B} T magnetic field (at right angles). What force acts on it?`,
      unit: "N",
      ...keypad(r2(B * I * L), [r2(B * I), r2(I * L)]),
      hint: "F = BIL when the wire crosses the field at 90°.",
      explain: `F = ${B} × ${I} × ${L} = ${r2(B * I * L)} N.`,
    });
  }
  if (k === 2) {
    const change = pick([
      ["the current is reversed", "It reverses"],
      ["the magnet is flipped round", "It reverses"],
      ["both the current and the magnet are reversed", "It stays the same"],
      ["the current is doubled", "It doubles"],
      ["the wire is turned to lie along the field lines", "It drops to zero"],
    ]);
    return mk({
      key: `motor-change-${change[0].slice(4, 14)}`,
      prompt: `A wire in a magnetic field feels a force. Then ${change[0]}. What happens to the force?`,
      ...label(change[1], ["It reverses", "It stays the same", "It doubles", "It drops to zero"].filter((x) => x !== change[1])),
      hint: "F = BIL sin θ, and its direction comes from both the current and the field.",
      explain: `${change[1]}: ${change[1] === "It reverses" ? "flipping one of current or field flips the force" : change[1] === "It stays the same" ? "flipping both cancels out" : change[1] === "It doubles" ? "F ∝ I" : "a wire parallel to the field feels no force (sin 0° = 0)"}.`,
    });
  }
  if (k === 3) {
    const V = pick([6, 12, 24]);
    const I = pick([0.5, 1, 2]);
    const m = pick([0.5, 1, 2]);
    const h = pick([1, 2]);
    const t = pick([2, 4, 5]);
    const useful = m * G * h;
    const eff = Math.round((useful / (V * I * t)) * 100);
    if (eff >= 100 || eff < 5) return motorEffect();
    return mk({
      key: `motor-eff-${V}-${I}-${m}-${h}-${t}`,
      prompt: `A ${V} V motor draws ${ds(I)} A for ${t} s to lift a ${m} kg load ${h} m. What is its efficiency, to the nearest %?`,
      unit: "%",
      ...keypad(eff),
      hint: "Electrical energy in = VIt. Useful energy out = mgh. Efficiency = out ÷ in × 100.",
      explain: `In: ${V} × ${ds(I)} × ${t} = ${ds(V * I * t)} J. Out: ${m} × 9.8 × ${h} = ${r1(useful)} J. Efficiency ≈ ${eff}%. The rest heats the motor.`,
    });
  }
  return card("motor", [
    {
      p: "What energy change happens in an electric motor?",
      a: "Electrical → kinetic (plus some heat)",
      w: ["Kinetic → electrical", "Chemical → electrical", "Heat → electrical"],
      h: "You plug it in and it spins.",
      e: "A current in a magnetic field feels a force, which spins the coil: electrical energy becomes kinetic energy, with some lost as heat.",
    },
    {
      p: "A loudspeaker makes sound using…",
      a: "the force on a current-carrying coil in a magnetic field",
      w: ["static electricity", "heating the air", "a changing gravitational field"],
      h: "The coil is attached to the paper cone, near a magnet.",
      e: "The changing current pushes the coil back and forth in the magnet's field; the cone moves the air, making sound.",
    },
  ]);
}

const INDUCE_SCENES: Card[] = [
  {
    p: "A magnet is held still inside a coil connected to a meter. What does the meter show?",
    a: "No current",
    w: ["A steady current", "A current that grows", "A current one way, then the other"],
    h: "Induction needs the magnetic field through the coil to be changing.",
    e: "A still magnet gives a steady field: nothing changes, so no current is induced.",
  },
  {
    p: "Pushing a magnet into a coil makes the meter swing right. What happens when you pull it out?",
    a: "The meter swings left",
    w: ["It swings right again", "It reads zero", "It swings right, but more"],
    h: "Pulling out changes the field the opposite way.",
    e: "The field through the coil now decreases instead of increases, so the induced current flows the other way.",
  },
  {
    p: "You push the magnet into the coil faster. The induced current is…",
    a: "bigger",
    w: ["smaller", "the same", "zero"],
    h: "Faraday: the induced voltage depends on how fast the field changes.",
    e: "A faster change in magnetic flux means a bigger induced voltage, so a bigger current.",
  },
  {
    p: "You use a coil with twice as many turns and move the magnet the same way. The induced voltage…",
    a: "doubles",
    w: ["halves", "stays the same", "becomes four times bigger"],
    h: "Each turn adds its own induced voltage.",
    e: "ε = N × ΔΦ/Δt: twice the turns, twice the voltage.",
  },
  {
    p: "It feels harder to push a magnet into a coil when the coil is connected to a bulb. Why?",
    a: "The induced current pushes back; your work lights the bulb",
    w: ["The bulb is heavy", "The coil attracts the magnet", "Friction in the wires"],
    h: "Energy is conserved: where does the bulb's energy come from?",
    e: "The induced current makes a field that opposes the motion (Lenz's law). Your extra work becomes the bulb's electrical energy.",
  },
];

export function induction(): Question {
  const k = rand(0, 3);
  if (k <= 1) return card("ind", INDUCE_SCENES);
  if (k === 2) {
    const N = pick([50, 100, 200, 500]);
    const dPhi = pick([0.01, 0.02, 0.05]);
    const dt = pick([0.1, 0.2, 0.5]);
    return mk({
      key: `ind-faraday-${N}-${dPhi}-${dt}`,
      prompt: `The magnetic flux through a ${N}-turn coil changes by ${dPhi} Wb in ${dt} s. What voltage is induced? (ε = N × ΔΦ ÷ Δt)`,
      speech: `The magnetic flux through a ${N} turn coil changes by ${dPhi} webers in ${dt} seconds. What voltage is induced?`,
      unit: "V",
      ...keypad(clean((N * dPhi) / dt), [clean(N * dPhi), clean(dPhi / dt)]),
      hint: "Divide the change in flux by the time, then multiply by the number of turns.",
      explain: `ε = ${N} × ${dPhi} ÷ ${dt} = ${ds((N * dPhi) / dt)} V.`,
    });
  }
  return card("ind2", [
    {
      p: "How does a wireless phone charger work?",
      a: "A changing field in one coil induces current in the other",
      w: ["It sends electrons through the air", "It uses static electricity", "It heats the battery"],
      h: "Two coils, close together, no wire between them.",
      e: "An alternating current makes a changing magnetic field, which induces a current in the phone's coil.",
    },
    {
      p: "Which of these does NOT rely on electromagnetic induction?",
      a: "A battery-powered torch",
      w: ["A bike dynamo", "A power-station generator", "An induction hob"],
      h: "Induction needs a changing magnetic field.",
      e: "A torch's current comes from a chemical reaction in the battery. The others make or use currents with changing magnetic fields.",
    },
  ]);
}

const INDUCE_POOL: [string, number][] = [
  ["magnet pushed into a coil", 0],
  ["magnet pulled out of a coil", 0],
  ["coil spun near a magnet", 0],
  ["switching ON a nearby coil", 0],
  ["switching OFF a nearby coil", 0],
  ["wire moved across a field", 0],
  ["magnet dropped through a ring", 0],
  ["bike dynamo turning", 0],
  ["magnet resting in a coil", 1],
  ["steady current in a nearby coil", 1],
  ["magnet and coil moving together", 1],
  ["wire slid along the field lines", 1],
  ["magnet lying still by a coil", 1],
];

export function induceSort(): Question {
  const yes = shuffle(INDUCE_POOL.filter((p) => p[1] === 0)).slice(0, rand(3, 4));
  const no = shuffle(INDUCE_POOL.filter((p) => p[1] === 1)).slice(0, rand(2, 3));
  const items = shuffle([...yes, ...no]);
  return act({
    key: `isort-${items.map((i) => INDUCE_POOL.indexOf(i)).sort((a, b) => a - b).join("_")}`,
    prompt: "Sort each situation: is a current induced, or not?",
    activity: { kind: "sort", bins: ["Induces a current", "No current"], items: items.map(([label, bin]) => ({ label, bin })) },
    answer: yes.length,
    hint: "A current is induced only while the magnetic field through the loop is changing (or a wire cuts across field lines).",
    explain: `Changing field: ${yes.map((y) => y[0]).join(", ")}. Nothing changing: ${no.map((n) => n[0]).join(", ")}.`,
  });
}

export function generators(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const rpm = pick([1200, 1800, 3000, 3600, 6000]);
    return mk({
      key: `gen-hz-${rpm}`,
      prompt: `A generator's coil spins ${rpm} times per minute. What is the frequency of the AC it makes?`,
      unit: "Hz",
      ...keypad(rpm / 60, [rpm, rpm / 30]),
      hint: "One full turn makes one full cycle of AC. Hz means cycles per second.",
      explain: `${rpm} ÷ 60 = ${rpm / 60} turns per second, so ${rpm / 60} Hz.`,
    });
  }
  if (k === 1) {
    const inP = pick([200, 400, 500, 800, 1000]);
    const eff = pick([80, 85, 90, 95]);
    const out = (inP * eff) / 100;
    const askEff = rand(0, 1) === 1;
    return mk({
      key: `gen-eff-${inP}-${eff}-${askEff}`,
      prompt: askEff ? `A turbine delivers ${inP} kW of kinetic power to a generator, which puts out ${out} kW of electrical power. What is its efficiency?` : `A generator is ${eff}% efficient. With ${inP} kW of kinetic power going in, how much electrical power comes out?`,
      unit: askEff ? "%" : "kW",
      ...keypad(askEff ? eff : out),
      hint: "Efficiency = useful power out ÷ power in × 100%.",
      explain: askEff ? `${out} ÷ ${inP} × 100 = ${eff}%.` : `${eff}% of ${inP} kW = ${out} kW.`,
    });
  }
  if (k === 2) {
    const chains: [string, Visual, string, string[]][] = [
      [
        "a hydroelectric dam",
        { kind: "phys-energy", chain: [{ emoji: "🏞️", label: "high water" }, { emoji: "🌊", label: "falling water", via: "GPE" }, { emoji: "⚙️", label: "turbine" }, { emoji: "⚡", label: "generator" }] },
        "Gravitational potential → kinetic → electrical",
        ["Chemical → heat → electrical", "Light → electrical", "Electrical → kinetic → potential"],
      ],
      [
        "a gas power station",
        { kind: "phys-energy", chain: [{ emoji: "🔥", label: "burning gas" }, { emoji: "♨️", label: "steam", via: "heat" }, { emoji: "⚙️", label: "turbine" }, { emoji: "⚡", label: "generator" }] },
        "Chemical → thermal → kinetic → electrical",
        ["Nuclear → electrical", "Kinetic → chemical → electrical", "Electrical → thermal → kinetic"],
      ],
      [
        "a wind turbine",
        { kind: "phys-energy", chain: [{ emoji: "🌬️", label: "wind" }, { emoji: "🌀", label: "blades", via: "kinetic" }, { emoji: "⚡", label: "generator" }] },
        "Kinetic → electrical",
        ["Thermal → electrical", "Electrical → kinetic", "Gravitational → electrical"],
      ],
    ];
    const i = rand(0, chains.length - 1);
    const [what, v, a, w] = chains[i];
    return mk({
      key: `gen-chain-${i}`,
      prompt: `Which energy chain describes ${what}?`,
      visual: v,
      ...label(a, w),
      hint: "Start with the energy store at the beginning and follow each step.",
      explain: `${a}. The generator is the step that turns spinning (kinetic) energy into electrical energy by induction.`,
    });
  }
  return card("gen", [
    {
      p: "Which change does NOT increase a generator's output voltage?",
      a: "Using a thicker plastic case",
      w: ["Spinning the coil faster", "Using stronger magnets", "Adding more turns to the coil"],
      h: "ε depends on how fast the flux through the coil changes, and on the number of turns.",
      e: "Faster spinning, stronger magnets and more turns all make the flux change faster or count more times. The case does nothing.",
    },
    {
      p: "Why does a simple generator make alternating current (AC)?",
      a: "The field through the spinning coil keeps reversing",
      w: ["The magnet runs out of energy", "The wires get hot", "The coil only spins half the time"],
      h: "Think of the coil every half turn.",
      e: "Each half turn the flux through the coil changes the other way, so the induced current reverses: AC.",
    },
  ]);
}

export function transformers(): Question {
  const k = rand(0, 4);
  const sets: [number, number, number][] = [
    [230, 1000, 50],
    [230, 2300, 120],
    [120, 600, 30],
    [12, 100, 1000],
    [240, 400, 20],
    [11000, 5000, 115],
    [25000, 10000, 4],
  ];
  if (k <= 1) {
    const [Vp, Np, Ns] = pick(sets);
    const Vs = clean((Vp * Ns) / Np);
    return mk({
      key: `tf-vs-${Vp}-${Np}-${Ns}`,
      prompt: `A transformer has ${Np} turns on the primary coil and ${Ns} on the secondary. ${Vp} V AC goes in. What voltage comes out?`,
      unit: "V",
      ...keypad(Vs, [clean((Vp * Np) / Ns)]),
      hint: "Vs ÷ Vp = Ns ÷ Np: the voltage scales with the turns.",
      explain: `Vs = ${Vp} × ${Ns} ÷ ${Np} = ${ds(Vs)} V (step-${Ns > Np ? "up" : "down"}).`,
    });
  }
  if (k === 2) {
    const [Vp, Vs, Np] = pick([[230, 12, 1150], [230, 6, 2300], [120, 12, 500], [230, 23, 400], [12, 240, 100]] as [number, number, number][]);
    const Ns = (Np * Vs) / Vp;
    return mk({
      key: `tf-ns-${Vp}-${Vs}-${Np}`,
      prompt: `You need ${Vs} V from a ${Vp} V supply. The primary coil has ${Np} turns. How many turns should the secondary have?`,
      ...keypad(Ns, [(Np * Vp) / Vs].map(Math.round)),
      hint: "Ns = Np × Vs ÷ Vp.",
      explain: `Ns = ${Np} × ${Vs} ÷ ${Vp} = ${Ns} turns.`,
    });
  }
  if (k === 3) {
    const Vp = pick([230, 120]);
    const Ip = pick([0.5, 1, 2]);
    const Vs = pick([5, 6, 12, 24]);
    const Is = clean((Vp * Ip) / Vs);
    return mk({
      key: `tf-is-${Vp}-${Ip}-${Vs}`,
      prompt: `An ideal transformer takes ${Vp} V and ${ds(Ip)} A in, and gives ${Vs} V out. What current comes out? Round to 2 decimal places.`,
      unit: "A",
      ...keypad(r2(Is)),
      hint: "Ideal: power in = power out, so VpIp = VsIs.",
      explain: `P = ${Vp} × ${ds(Ip)} = ${ds(Vp * Ip)} W; Is = ${ds(Vp * Ip)} ÷ ${Vs} ≈ ${r2(Is)} A. Stepping voltage down steps current up.`,
    });
  }
  return card("tf", [
    {
      p: "Why doesn't a transformer work with a steady DC supply?",
      a: "A steady current makes a steady field, which induces nothing",
      w: ["DC is too weak", "DC melts the coils", "DC only flows one way round the core"],
      h: "Induction needs a changing magnetic field.",
      e: "The primary's field must keep changing to induce a voltage in the secondary. Steady DC gives a steady field: no output.",
    },
    {
      p: "A transformer has more turns on its secondary than its primary. It is a…",
      a: "step-up transformer (more volts out)",
      w: ["step-down transformer", "generator", "motor"],
      h: "Vs ÷ Vp = Ns ÷ Np.",
      e: "More secondary turns means a higher output voltage: a step-up transformer (with a smaller output current).",
    },
  ]);
}

export function powerLines(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const P = pick([1, 2, 5, 10]);
    const V = pick([10, 20, 50, 100]);
    return mk({
      key: `pl-I-${P}-${V}`,
      prompt: `A power station sends ${P} MW along a line at ${V} kV. What current flows?`,
      unit: "A",
      ...keypad(clean((P * 1e6) / (V * 1e3)), [clean(P / V)]),
      hint: "I = P ÷ V. Convert MW to W and kV to V first.",
      explain: `I = ${P} × 10⁶ ÷ (${V} × 10³) = ${ds((P * 1e6) / (V * 1e3))} A.`,
    });
  }
  if (k === 1) {
    const I = pick([10, 20, 50, 100, 200]);
    const R = pick([2, 5, 10]);
    return mk({
      key: `pl-loss-${I}-${R}`,
      prompt: `A current of ${I} A flows through power lines with ${R} Ω of resistance. How much power is lost as heat?`,
      unit: "W",
      ...keypad(I * I * R, [I * R]),
      hint: "Power lost = I²R.",
      explain: `P = ${I}² × ${R} = ${(I * I * R).toLocaleString("en-US")} W.`,
    });
  }
  if (k === 2) {
    const f = pick([2, 5, 10, 20]);
    return mk({
      key: `pl-step-${f}`,
      prompt: `A transformer raises the line voltage ${f} times, sending the same power. By what factor does the heat lost in the lines drop?`,
      ...choose(f * f, [f, 2 * f, f * f * f], 1, 1),
      hint: "Same power at higher voltage means lower current (I = P ÷ V). And loss = I²R.",
      explain: `Current ÷ ${f}, so loss ÷ ${f}² = ÷${f * f}. That's why the grid uses very high voltages.`,
    });
  }
  if (k === 3) {
    const P = pick([0.5, 1, 1.5, 2, 3]);
    const h = pick([2, 4, 5, 8, 10]);
    const c = pick([0.1, 0.2, 0.25, 0.3]);
    return mk({
      key: `pl-cost-${P}-${h}-${c}`,
      prompt: `A ${ds(P)} kW heater runs for ${h} hours. Electricity costs $${c.toFixed(2)} per kWh. How much does it cost?`,
      prefix: "$",
      ...keypad(r2(P * h * c)),
      hint: "Energy (kWh) = power (kW) × time (h). Then multiply by the price.",
      explain: `${ds(P)} × ${h} = ${ds(P * h)} kWh; ${ds(P * h)} × $${c.toFixed(2)} = $${r2(P * h * c).toFixed(2)}.`,
    });
  }
  return card("pl", [
    {
      p: "Why does the national grid carry electricity at hundreds of thousands of volts?",
      a: "High voltage means low current, so less energy is lost as heat",
      w: ["High voltage travels faster", "Homes need very high voltage", "It makes the wires lighter"],
      h: "Loss in the wires = I²R.",
      e: "For the same power, raising V lowers I, and the I²R heating drops with the square. Transformers step it back down for homes.",
    },
    {
      p: "One kilowatt-hour (kWh) is a unit of…",
      a: "energy",
      w: ["power", "current", "voltage"],
      h: "Power × time.",
      e: "1 kWh = 1000 W for 3600 s = 3.6 million joules: it's energy.",
    },
  ]);
}

/* =================================================================== world 6: energy, work & power */

export function kineticEnergy(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const m = pick([0.5, 2, 4, 10, 50, 60, 1000, 1200]);
    const v = pick([2, 3, 4, 5, 6, 8, 10, 20, 25]);
    return mk({
      key: `ke-calc-${m}-${v}`,
      prompt: `What is the kinetic energy of a ${m} kg object moving at ${v} m/s?`,
      unit: "J",
      ...keypad(clean(0.5 * m * v * v), [m * v * v, 0.5 * m * v, m * v].map(clean)),
      hint: "KE = ½mv². Square the speed before multiplying.",
      explain: `KE = ½ × ${m} × ${v}² = ½ × ${m} × ${v * v} = ${ds(0.5 * m * v * v)} J.`,
    });
  }
  if (k === 1) {
    const m = pick([2, 4, 8, 10, 50]);
    const v = pick([2, 3, 4, 5, 6, 10]);
    const E = 0.5 * m * v * v;
    return mk({
      key: `ke-v-${m}-${v}`,
      prompt: `A ${m} kg ball has ${ds(E)} J of kinetic energy. How fast is it moving?`,
      unit: "m/s",
      ...keypad(v, [r1(E / m), r1((2 * E) / m)].filter((x) => x !== v)),
      hint: "v = √(2KE ÷ m).",
      explain: `v² = 2 × ${ds(E)} ÷ ${m} = ${v * v}, so v = ${v} m/s.`,
    });
  }
  if (k === 2) {
    const [fv, fm] = pick([[2, 1], [3, 1], [1, 2], [2, 2], [0.5, 1], [2, 0.5], [1, 3]] as [number, number][]);
    const E0 = pick([10, 20, 40, 60, 100]);
    const E1 = clean(E0 * fm * fv * fv);
    const say2 = (f: number) => (f === 1 ? "the same" : f === 0.5 ? "halved" : f === 2 ? "doubled" : "tripled");
    return mk({
      key: `ke-scale-${fv}-${fm}-${E0}`,
      prompt: `A cart has ${E0} J of kinetic energy. Its speed is ${say2(fv)} and its mass is ${say2(fm)}. What is its kinetic energy now?`,
      unit: "J",
      ...choose(E1, [E0 * fm * fv, E0 * fv, E0 * fm * fv * fv * fv].map(clean).filter((x) => x !== E1), 5, 0),
      hint: "KE ∝ m × v². The speed factor gets squared; the mass factor doesn't.",
      explain: `KE × ${fm} × ${fv}² = ${E0} × ${clean(fm * fv * fv)} = ${ds(E1)} J.`,
    });
  }
  if (k === 3) {
    const a: [string, number, number] = pick([["a 0.01 kg bullet at 400 m/s", 0.01, 400], ["a 0.15 kg baseball at 40 m/s", 0.15, 40], ["a 1 kg bird at 10 m/s", 1, 10]]);
    const b: [string, number, number] = pick([["a 7 kg bowling ball at 5 m/s", 7, 5], ["a 60 kg jogger at 3 m/s", 60, 3], ["a 2 kg cat at 8 m/s", 2, 8]]);
    const ka = 0.5 * a[1] * a[2] ** 2;
    const kb = 0.5 * b[1] * b[2] ** 2;
    const big = ka > kb ? a[0] : b[0];
    return mk({
      key: `ke-cmp-${a[1]}-${b[1]}`,
      prompt: `Which has more kinetic energy: ${a[0]} or ${b[0]}?`,
      ...label(big.replace(/^an? /, "the "), [(big === a[0] ? b[0] : a[0]).replace(/^an? /, "the "), "They're equal"]),
      hint: "KE = ½mv². Speed counts twice (it's squared), so fast light things can win.",
      explain: `${a[0]}: ${ds(ka)} J. ${b[0]}: ${ds(kb)} J.`,
    });
  }
  return card("ke", [
    {
      p: "A car doubles its speed. Its braking distance goes up 4 times. Why?",
      a: "4× the KE, and the brakes remove it at the same rate",
      w: ["Its mass doubles", "Its momentum is 4 times bigger", "The brakes get weaker"],
      h: "Braking work = force × distance = KE.",
      e: "KE ∝ v², so 2× speed means 4× KE. The braking force removes energy F × d, so d is 4× as long.",
    },
    {
      p: "Can kinetic energy ever be negative?",
      a: "No: ½mv² is never negative",
      w: ["Yes, when moving left", "Yes, when slowing down", "Yes, below the ground"],
      h: "Look at v²: what is (−3)²?",
      e: "Mass is positive and v² is never negative, so KE ≥ 0. Direction doesn't matter for energy.",
    },
  ]);
}

export function gpe(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const m = pick([0.5, 1, 2, 5, 10, 20, 60]);
    const h = pick([1, 2, 3, 5, 10, 15, 50]);
    return mk({
      key: `gpe-calc-${m}-${h}`,
      prompt: `How much gravitational potential energy does a ${m} kg object gain when lifted ${h} m? (g = 9.8 m/s²)`,
      unit: "J",
      ...keypad(r1(m * G * h)),
      hint: "ΔGPE = mgh.",
      explain: `ΔGPE = ${m} × 9.8 × ${h} = ${r1(m * G * h)} J.`,
    });
  }
  if (k === 1) {
    const m = pick([1, 2, 5, 10]);
    const h = pick([2, 3, 4, 5, 10, 20]);
    const E = r1(m * G * h);
    return mk({
      key: `gpe-h-${m}-${h}`,
      prompt: `A ${m} kg box gains ${E} J of gravitational potential energy. How high was it lifted? (g = 9.8 m/s²)`,
      unit: "m",
      ...keypad(h, [r1(E / m)]),
      hint: "h = ΔGPE ÷ (mg).",
      explain: `h = ${E} ÷ (${m} × 9.8) = ${h} m.`,
    });
  }
  if (k === 2) {
    const m = pick([45, 50, 60, 70, 80]);
    const floors = rand(2, 6);
    return mk({
      key: `gpe-stairs-${m}-${floors}`,
      prompt: `A ${m} kg student climbs ${floors} floors, each 3 m high. How much gravitational potential energy does she gain? (g = 9.8 m/s²)`,
      unit: "J",
      ...keypad(r1(m * G * 3 * floors)),
      hint: "Total height first, then mgh.",
      explain: `h = ${floors} × 3 = ${3 * floors} m; ΔGPE = ${m} × 9.8 × ${3 * floors} = ${r1(m * G * 3 * floors)} J.`,
    });
  }
  if (k === 3) {
    const m = pick([10, 20, 50]);
    const h = pick([2, 5, 10]);
    return mk({
      key: `gpe-moon-${m}-${h}`,
      prompt: `On the Moon (g = 1.6 m/s²), an astronaut lifts a ${m} kg rock ${h} m. How much GPE does it gain?`,
      unit: "J",
      ...keypad(r1(m * 1.6 * h), [r1(m * G * h)]),
      hint: "Same formula, mgh, with the Moon's g.",
      explain: `${m} × 1.6 × ${h} = ${r1(m * 1.6 * h)} J, about a sixth of the ${r1(m * G * h)} J it would take on Earth.`,
    });
  }
  return card("gpe", [
    {
      p: "You carry a box up a ramp, or lift it straight up to the same shelf. Which gives the box more GPE?",
      a: "Neither: same height, same GPE",
      w: ["The ramp", "Lifting straight up", "It depends how fast you go"],
      h: "ΔGPE = mgh only uses the change in height.",
      e: "GPE depends only on the height gained, not the path. (The ramp takes less force, but over a longer distance.)",
    },
    {
      p: "A ball sits on a 1 m table. Its GPE is 10 J measured from the floor. Measured from the tabletop, it is…",
      a: "0 J",
      w: ["10 J", "−10 J", "20 J"],
      h: "GPE is measured from a reference level you choose.",
      e: "From the tabletop, h = 0, so GPE = 0. Only changes in GPE have physical meaning.",
    },
  ]);
}

export function elasticPE(): Question {
  const k = rand(0, 4);
  const kk = pick([50, 100, 200, 400, 500]);
  const x = pick([0.02, 0.05, 0.1, 0.2]);
  if (k === 0) {
    const F = clean(kk * x);
    return mk({
      key: `epe-k-${kk}-${x}`,
      prompt: `A ${F} N force stretches a spring by ${x} m. What is its spring constant k?`,
      visual: { kind: "phys-oscillator", type: "spring", displacement: 1, amplitudeLabel: x, kLabel: "k = ?", force: F, unit: "m" },
      unit: "N/m",
      ...keypad(kk, [clean(F * x)]),
      hint: "Hooke's law: F = kx, so k = F ÷ x.",
      explain: `k = ${F} ÷ ${x} = ${kk} N/m.`,
    });
  }
  if (k === 1) {
    const E = clean(0.5 * kk * x * x);
    return mk({
      key: `epe-E-${kk}-${x}`,
      prompt: `A spring with k = ${kk} N/m is stretched ${x} m. How much elastic potential energy does it store?`,
      visual: { kind: "phys-oscillator", type: "spring", displacement: 1, amplitudeLabel: x, kLabel: kk, unit: "m" },
      unit: "J",
      ...keypad(E, [clean(kk * x), clean(kk * x * x)]),
      hint: "Elastic PE = ½kx².",
      explain: `E = ½ × ${kk} × ${x}² = ${ds(E)} J.`,
    });
  }
  if (k === 2) {
    const f = pick([2, 3, 0.5]);
    const E0 = pick([2, 4, 8, 12]);
    return mk({
      key: `epe-scale-${f}-${E0}`,
      prompt: `A stretched spring stores ${E0} J. You stretch it ${f === 0.5 ? "only half as far" : `${f} times as far`}. How much does it store now?`,
      unit: "J",
      ...choose(clean(E0 * f * f), [E0 * f, E0 * f * f * f].map(clean), 1, 0),
      hint: "E ∝ x²: square the stretch factor.",
      explain: `${E0} × ${f}² = ${ds(E0 * f * f)} J.`,
    });
  }
  if (k === 3) {
    const [K, m, root] = pick([[400, 1, 20], [100, 1, 10], [900, 1, 30], [200, 2, 10], [800, 2, 20], [100, 4, 5]] as [number, number, number][]);
    const xx = pick([0.1, 0.2, 0.05]);
    const v = clean(root * xx);
    return mk({
      key: `epe-launch-${K}-${m}-${xx}`,
      prompt: `A toy launcher's spring (k = ${K} N/m) is squashed ${xx} m and fires a ${m} kg puck. How fast does the puck leave (no friction)?`,
      visual: { kind: "phys-oscillator", type: "spring", displacement: -1, amplitudeLabel: xx, kLabel: K, massLabel: m, unit: "m" },
      unit: "m/s",
      ...keypad(v),
      hint: "Elastic PE becomes kinetic energy: ½kx² = ½mv², so v = x√(k ÷ m).",
      explain: `½ × ${K} × ${xx}² = ${ds(0.5 * K * xx * xx)} J = ½ × ${m} × v², so v = ${xx} × √(${K} ÷ ${m}) = ${ds(v)} m/s.`,
    });
  }
  const K = pick([50, 100]);
  const X = pick([0.1, 0.2, 0.3]);
  const askE = rand(0, 1) === 1;
  return mk({
    key: `epe-graph-${K}-${X}-${askE}`,
    prompt: askE ? `A spring's force–stretch graph. How much energy is stored at a stretch of ${X} m?` : "A spring's force–stretch graph. What is the spring constant k?",
    visual: { kind: "plot", xLabel: "stretch (m)", yLabel: "force (N)", x: [0, 0.4], y: [0, 40], lines: [{ from: [0, 0], to: [0.4, 0.4 * K], colour: "leaf" }], points: [{ x: X, y: clean(K * X) }], shade: askE ? { fn: (s) => K * s, from: 0, to: X } : undefined },
    needsVisual: true,
    unit: askE ? "J" : "N/m",
    ...keypad(askE ? clean(0.5 * K * X * X) : K),
    hint: askE ? "The energy stored is the area under the force–stretch line: a triangle." : "k is the slope: force ÷ stretch.",
    explain: askE ? `Area = ½ × ${X} × ${ds(K * X)} = ${ds(0.5 * K * X * X)} J.` : `k = ${ds(K * X)} ÷ ${X} = ${K} N/m.`,
  });
}

export function conservation(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const X = 10 * rand(4, 10);
    const T = k === 0 ? 0 : 10 * rand(1, 3);
    return mk({
      key: `cons-bars-${X}-${T}`,
      prompt: T ? `A sledge slides down a hill. Some energy becomes thermal (friction). How much kinetic energy does it have at the bottom?` : "A ball rolls down a frictionless ramp. How much kinetic energy does it have at the bottom?",
      visual: {
        kind: "phys-energy",
        names: ["KE", "GPE", "Thermal"],
        bars: [{ title: "Top", values: [0, X, 0] }, { title: "Bottom", values: ["?", 0, T] }],
        max: X,
        unit: "J",
      },
      needsVisual: true,
      unit: "J",
      ...keypad(X - T, [X, X + T]),
      hint: "Total energy stays the same. Add up the top, then subtract what's already in the other stores at the bottom.",
      explain: `Total = ${X} J. At the bottom GPE = 0${T ? ` and thermal = ${T} J` : ""}, so KE = ${X}${T ? ` − ${T}` : ""} = ${X - T} J.`,
    });
  }
  if (k === 2) {
    const h = pick([1, 2, 5, 10, 20, 45]);
    const v = r1(Math.sqrt(2 * G * h));
    return mk({
      key: `cons-v-${h}`,
      prompt: `A skateboarder starts from rest and rolls down a frictionless ramp ${h} m high. How fast is she going at the bottom? Round to 1 decimal place.`,
      visual: { kind: "phys-incline", angle: 30, height: h, object: "🛹" },
      unit: "m/s",
      ...keypad(v),
      hint: "mgh = ½mv², so v = √(2gh). The mass cancels.",
      explain: `v = √(2 × 9.8 × ${h}) = √${r1(2 * G * h)} ≈ ${v} m/s.`,
    });
  }
  if (k === 3) {
    const h1 = pick([20, 30, 40, 50]);
    const h2 = pick([5, 10, 15]);
    const v = r1(Math.sqrt(2 * G * (h1 - h2)));
    return mk({
      key: `cons-coaster-${h1}-${h2}`,
      prompt: `A roller coaster starts at rest ${h1} m up. Ignoring friction, how fast is it at a hilltop ${h2} m up? Round to 1 decimal place.`,
      unit: "m/s",
      ...keypad(v),
      hint: "Only the height dropped matters: ½v² = g(h₁ − h₂).",
      explain: `It has dropped ${h1 - h2} m: v = √(2 × 9.8 × ${h1 - h2}) ≈ ${v} m/s.`,
    });
  }
  const v = pick([1, 1.5, 2, 2.5, 3]);
  const h = r2((v * v) / (2 * G));
  return mk({
    key: `cons-pend-${v}`,
    prompt: `A pendulum bob swings through the bottom at ${v} m/s. How high above the bottom does it rise? Round to 2 decimal places.`,
    visual: { kind: "phys-oscillator", type: "pendulum", angle: 30, swing: true, lengthLabel: "L" },
    unit: "m",
    ...keypad(h),
    hint: "At the top of the swing it stops for an instant: ½mv² = mgh, so h = v² ÷ 2g.",
    explain: `h = ${v}² ÷ (2 × 9.8) = ${ds(v * v)} ÷ 19.6 ≈ ${h} m.`,
  });
}

export function energyBars(): Question {
  const v = rand(0, 2);
  const X = 10 * rand(5, 10);
  const names = ["KE", "GPE", "Thermal"];
  let end: number[];
  let start: number[];
  let story: string;
  if (v === 0) {
    start = [0, X, 0];
    const half = rand(0, 1) === 1 && X % 20 === 0;
    const frac = half ? 0.5 : 0;
    end = [X * (1 - frac), X * frac, 0];
    story = half ? "A ball is dropped and falls freely (no air). Show its energy halfway down." : "A ball is dropped and falls freely (no air). Show its energy just before it hits the ground.";
  } else if (v === 1) {
    start = [0, X, 0];
    const T = 10 * rand(1, X / 10 - 1);
    end = [X - T, 0, T];
    story = `A crate slides down a rough ramp from rest. ${T} J becomes thermal energy. Show its energy at the bottom.`;
  } else {
    start = [X, 0, 0];
    const T = 10 * rand(1, 2);
    const g1 = 10 * rand(1, (X - T) / 10 - 1);
    end = [X - T - g1, g1, T];
    story = `A skateboarder rolls up a ramp. Partway up she has ${g1} J of GPE, and friction has made ${T} J of thermal energy. Show her energy there.`;
  }
  return act({
    key: `ebars-${v}-${start.join("_")}-${end.join("_")}`,
    prompt: story,
    visual: { kind: "phys-energy", names, bars: [{ title: "Start", values: start }], max: 100, unit: "J" },
    needsVisual: true,
    activity: { kind: "barGraph", title: "Energy (J)", items: names.map((n, i) => ({ label: n, value: end[i] })), max: 100, step: 10, hideData: true },
    answer: end[0],
    hint: `The total stays ${X} J. Fill in what you're told, and kinetic energy gets whatever is left.`,
    explain: `KE ${end[0]} J + GPE ${end[1]} J + thermal ${end[2]} J = ${X} J, the same total as at the start.`,
  });
}

export function work(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const F = pick([10, 20, 25, 50, 100, 150]);
    const d = pick([2, 3, 4, 5, 10, 20]);
    return mk({
      key: `work-fd-${F}-${d}`,
      prompt: `You push a box with ${F} N along the floor for ${d} m, in the direction it moves. How much work do you do?`,
      visual: { kind: "phys-forces", object: "📦", surface: "floor", forces: [{ dir: 0, size: 5, label: F }], motion: { dir: 0, label: `d = ${d} m` } },
      unit: "J",
      ...keypad(F * d, [F / d, F + d]),
      hint: "Work = force × distance moved in the direction of the force.",
      explain: `W = ${F} × ${d} = ${F * d} J.`,
    });
  }
  if (k === 1) {
    const F = pick([20, 40, 50, 100]);
    const d = pick([2, 5, 10]);
    const th = pick([30, 45, 60, 90]);
    const W = r1(F * d * cosD(th));
    return mk({
      key: `work-angle-${F}-${d}-${th}`,
      prompt: `You pull a sled ${d} m with a ${F} N rope at ${th}° above the ground. How much work does the rope do? Round to 1 decimal place.`,
      visual: { kind: "phys-forces", object: "🛷", surface: "floor", forces: [{ dir: th, size: 5, label: F }], motion: { dir: 0, label: "d" } },
      unit: "J",
      ...keypad(W),
      hint: "Only the part of the force along the motion does work: W = Fd cos θ.",
      explain: `W = ${F} × ${d} × cos ${th}° = ${W} J.${th === 90 ? " A force at 90° to the motion does no work." : ""}`,
    });
  }
  if (k === 2) {
    const m = pick([2, 5, 10, 20]);
    const muk = pick([0.1, 0.2, 0.3]);
    const d = pick([2, 5, 10]);
    const W = r1(muk * m * G * d);
    return mk({
      key: `work-fric-${m}-${muk}-${d}`,
      prompt: `A ${m} kg box slides ${d} m across a floor with μₖ = ${muk}. How much energy does friction turn into heat? Round to 1 decimal place.`,
      unit: "J",
      ...keypad(W),
      hint: "Friction force = μmg. Energy turned into heat = friction × distance.",
      explain: `f = ${muk} × ${m} × 9.8 = ${r2(muk * m * G)} N; ${r2(muk * m * G)} × ${d} = ${W} J (friction does −${W} J of work on the box).`,
    });
  }
  return card("work", [
    {
      p: "You carry a heavy bag across a flat room at a steady speed. How much work does your upward holding force do on the bag?",
      a: "None",
      w: ["Lots: the bag is heavy", "It equals the bag's weight", "It equals your effort"],
      h: "Work needs motion in the direction of the force.",
      e: "Your force is up; the bag moves sideways. Force ⟂ motion means W = Fd cos 90° = 0 (your muscles tire, but that's inside you).",
    },
    {
      p: "Friction on a sliding box does…",
      a: "negative work (it takes energy away)",
      w: ["positive work", "no work", "work only on the floor"],
      h: "Friction points opposite the motion: cos 180° = −1.",
      e: "Friction acts backward, so W = −fd: it removes kinetic energy, turning it into thermal energy.",
    },
    {
      p: "Gravity keeps the Moon in a circular orbit. How much work does gravity do on the Moon?",
      a: "Zero: the force is always at 90° to the motion",
      w: ["Lots, every orbit", "Negative work", "It depends on the Moon's mass"],
      h: "In a circle, the pull to the centre is perpendicular to the velocity.",
      e: "The force is always sideways to the motion, so no work is done and the Moon's speed stays the same.",
    },
  ]);
}

export function workEnergy(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const [F, d, m] = pick([[10, 5, 1], [20, 10, 4], [50, 4, 1], [40, 5, 4], [18, 4, 1], [25, 8, 4], [90, 5, 1]] as [number, number, number][]);
    const v = Math.sqrt((2 * F * d) / m);
    return mk({
      key: `we-v-${F}-${d}-${m}`,
      prompt: `A net force of ${F} N pushes a ${m} kg cart from rest for ${d} m. How fast is it going then?`,
      unit: "m/s",
      ...keypad(clean(v), [clean((F * d) / m)]),
      hint: "Net work = change in kinetic energy: Fd = ½mv².",
      explain: `W = ${F} × ${d} = ${F * d} J = ½ × ${m} × v², so v = √(${2 * F * d} ÷ ${m}) = ${ds(v)} m/s.`,
    });
  }
  if (k === 1) {
    const m = pick([1000, 1200, 1500]);
    const v = pick([10, 20, 30]);
    const F = pick([5000, 6000, 7500, 10000]);
    const d = clean((0.5 * m * v * v) / F);
    return mk({
      key: `we-brake-${m}-${v}-${F}`,
      prompt: `A ${m} kg car at ${v} m/s brakes with a steady ${F.toLocaleString("en-US")} N force. How far does it go before stopping? Round to 1 decimal place.`,
      unit: "m",
      ...keypad(r1(d)),
      hint: "The brakes' work removes all the KE: F × d = ½mv².",
      explain: `KE = ½ × ${m} × ${v}² = ${(0.5 * m * v * v).toLocaleString("en-US")} J; d = ${(0.5 * m * v * v).toLocaleString("en-US")} ÷ ${F.toLocaleString("en-US")} ≈ ${r1(d)} m.`,
    });
  }
  if (k === 2) {
    const m = pick([2, 4, 10]);
    const u = rand(1, 5);
    const v = u + rand(1, 5);
    return mk({
      key: `we-dKE-${m}-${u}-${v}`,
      prompt: `How much net work speeds a ${m} kg cart up from ${u} m/s to ${v} m/s?`,
      unit: "J",
      ...keypad(clean(0.5 * m * (v * v - u * u)), [clean(0.5 * m * (v - u) ** 2)]),
      hint: "W = ΔKE = ½mv² − ½mu². Don't square the difference!",
      explain: `½ × ${m} × (${v}² − ${u}²) = ½ × ${m} × ${v * v - u * u} = ${ds(0.5 * m * (v * v - u * u))} J.`,
    });
  }
  return card("we", [
    {
      p: "The net work done on an object is +50 J. Its kinetic energy…",
      a: "increases by 50 J",
      w: ["decreases by 50 J", "stays the same", "becomes 50 J for sure"],
      h: "Work–energy theorem: net work = ΔKE.",
      e: "Positive net work adds kinetic energy: ΔKE = +50 J (whatever it had before, plus 50).",
    },
    {
      p: "A box slides at constant speed while you push it against friction. The net work on it is…",
      a: "0 J",
      w: ["your push × distance", "friction × distance", "negative"],
      h: "Constant speed: has the KE changed?",
      e: "Your positive work and friction's negative work cancel, so net work = ΔKE = 0.",
    },
  ]);
}

export function power(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const W = pick([600, 1200, 3000, 4500, 9000]);
    const t = pick([2, 3, 5, 10, 15, 30]);
    return mk({
      key: `pow-wt-${W}-${t}`,
      prompt: `A crane does ${W.toLocaleString("en-US")} J of work in ${t} s. What is its power?`,
      unit: "W",
      ...keypad(clean(W / t), [W * t]),
      hint: "Power = work ÷ time.",
      explain: `P = ${W} ÷ ${t} = ${ds(W / t)} W.`,
    });
  }
  if (k === 1) {
    const m = pick([50, 60, 70]);
    const h = pick([3, 6, 9, 12]);
    const t = pick([4, 5, 6, 8, 10]);
    return mk({
      key: `pow-stairs-${m}-${h}-${t}`,
      prompt: `A ${m} kg student runs up ${h} m of stairs in ${t} s. What is her power? (g = 9.8 m/s²) Round to 1 decimal place.`,
      unit: "W",
      ...keypad(r1((m * G * h) / t)),
      hint: "Work = mgh, then P = work ÷ time.",
      explain: `W = ${m} × 9.8 × ${h} = ${r1(m * G * h)} J; P = ${r1(m * G * h)} ÷ ${t} ≈ ${r1((m * G * h) / t)} W.`,
    });
  }
  if (k === 2) {
    const F = pick([400, 500, 600, 800]);
    const v = pick([10, 20, 25, 30]);
    return mk({
      key: `pow-fv-${F}-${v}`,
      prompt: `A car cruises at ${v} m/s against ${F} N of drag and friction. What power must the engine deliver, in kW?`,
      unit: "kW",
      ...keypad(clean((F * v) / 1000), [F * v, clean(F / v)]),
      hint: "P = Fv (work per second = force × distance per second). Then divide by 1000 for kW.",
      explain: `P = ${F} × ${v} = ${F * v} W = ${ds((F * v) / 1000)} kW.`,
    });
  }
  if (k === 3) {
    const P = pick([1000, 1500, 2000, 2500, 3000]);
    const E = P * pick([60, 90, 120, 150, 180]);
    return mk({
      key: `pow-time-${P}-${E}`,
      prompt: `A ${P} W kettle must deliver ${E.toLocaleString("en-US")} J to boil some water. How long does it take?`,
      unit: "s",
      ...keypad(E / P, [P * E]),
      hint: "t = energy ÷ power.",
      explain: `t = ${E} ÷ ${P} = ${E / P} s.`,
    });
  }
  return card("pow", [
    {
      p: "Two cranes lift the same load to the same height. Crane A takes 10 s, crane B takes 20 s. Which statement is true?",
      a: "Same work, but A has twice the power",
      w: ["A does twice the work", "B has more power", "Same power, different work"],
      h: "Work depends on force and distance; power is how fast the work is done.",
      e: "Both do mgh of work. A does it in half the time, so its power (W ÷ t) is twice as big.",
    },
    {
      p: "1 watt equals…",
      a: "1 joule per second",
      w: ["1 newton per metre", "1 joule × second", "1 volt per amp"],
      h: "Power is energy per time.",
      e: "P = E ÷ t, so 1 W = 1 J/s.",
    },
  ]);
}

export function efficiency(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const total = pick([100, 200, 400, 500, 1000, 2000]);
    const eff = pick([10, 20, 25, 30, 40, 75, 80, 90]);
    const useful = (total * eff) / 100;
    return mk({
      key: `eff-pct-${total}-${eff}`,
      prompt: `A machine takes in ${total} J and gives out ${useful} J of useful energy. What is its efficiency?`,
      unit: "%",
      ...keypad(eff, [100 - eff]),
      hint: "Efficiency = useful output ÷ total input × 100%.",
      explain: `${useful} ÷ ${total} × 100 = ${eff}%.`,
    });
  }
  if (k === 1) {
    const total = pick([200, 500, 1000, 1500]);
    const eff = pick([20, 25, 40, 60, 85]);
    const askWaste = rand(0, 1) === 1;
    const useful = (total * eff) / 100;
    return mk({
      key: `eff-out-${total}-${eff}-${askWaste}`,
      prompt: `A motor is ${eff}% efficient and is given ${total} J. How much energy is ${askWaste ? "wasted (mostly as heat)" : "turned into useful kinetic energy"}?`,
      unit: "J",
      ...keypad(askWaste ? total - useful : useful, [askWaste ? useful : total - useful]),
      hint: "Useful = efficiency × input. Wasted = input − useful.",
      explain: `Useful = ${eff}% × ${total} = ${useful} J; wasted = ${total} − ${useful} = ${total - useful} J.`,
    });
  }
  if (k === 2) {
    const [name, emoji, inJ, light] = pick([
      ["old filament bulb", "💡", 100, 5],
      ["LED bulb", "💡", 100, 40],
      ["fluorescent tube", "💡", 100, 20],
      ["halogen lamp", "💡", 200, 20],
    ] as [string, string, number, number][]);
    const heat = inJ - light;
    const askLight = rand(0, 1) === 1;
    return mk({
      key: `eff-chain-${name}-${askLight}`,
      prompt: askLight ? `Every second, this ${name} turns ${inJ} J of electrical energy into ${heat} J of heat and some light. How much light energy?` : `Every second, this ${name} takes ${inJ} J and gives out ${light} J of light. What is its efficiency?`,
      visual: {
        kind: "phys-energy",
        chain: [
          { emoji: "🔌", label: `${inJ} J in` },
          { emoji, label: name, via: "electric" },
          [
            { emoji: "✨", label: askLight ? "light ?" : `light ${light} J` },
            { emoji: "🔥", label: askLight ? `heat ${heat} J` : "heat" },
          ],
        ],
      },
      needsVisual: true,
      unit: askLight ? "J" : "%",
      ...keypad(askLight ? light : (light / inJ) * 100),
      hint: askLight ? "Energy in = energy out. Subtract the heat from the input." : "Efficiency = useful (light) ÷ input × 100%.",
      explain: askLight ? `${inJ} − ${heat} = ${light} J of light (${(light / inJ) * 100}% efficient).` : `${light} ÷ ${inJ} × 100 = ${(light / inJ) * 100}%; the other ${heat} J heats the room.`,
    });
  }
  if (k === 3) {
    const m = pick([10, 20, 50]);
    const h = pick([2, 5, 10]);
    const eff = pick([40, 50, 80]);
    const useful = m * G * h;
    const input = r1(useful / (eff / 100));
    return mk({
      key: `eff-lift-${m}-${h}-${eff}`,
      prompt: `A ${eff}% efficient winch lifts a ${m} kg load ${h} m. How much electrical energy does it use? (g = 9.8 m/s²)`,
      unit: "J",
      ...keypad(input, [r1(useful)]),
      hint: "Useful output = mgh. Input = useful ÷ efficiency.",
      explain: `mgh = ${r1(useful)} J; input = ${r1(useful)} ÷ ${eff / 100} = ${input} J.`,
    });
  }
  return card("eff", [
    {
      p: "Why can no real machine be 100% efficient?",
      a: "Some energy always spreads out as heat (friction, resistance, sound)",
      w: ["Energy gets destroyed", "Machines create energy", "Only cheap machines waste energy"],
      h: "Where does a motor's 'lost' energy go?",
      e: "Energy is conserved, but some always spreads into the surroundings as heat and sound, which we can't easily use again.",
    },
    {
      p: "An LED and a filament bulb give the same light. The LED uses much less electricity because…",
      a: "it wastes far less energy as heat",
      w: ["it makes more light", "it stores energy", "it uses a lower voltage"],
      h: "Feel a filament bulb after it's been on.",
      e: "Most of a filament bulb's energy becomes heat. The LED turns a bigger share into light, so it's more efficient.",
    },
  ]);
}

export function energyModel(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const ke0 = 10 * rand(0, 5);
    const gpe0 = 10 * rand(5, 12);
    const th0 = 0;
    const gpe1 = 10 * rand(0, gpe0 / 10 - 2);
    const th1 = 10 * rand(1, 3);
    const ke1 = ke0 + gpe0 + th0 - gpe1 - th1;
    if (ke1 < 0) return energyModel();
    const ask = rand(0, 2);
    const end: (number | string)[] = [ke1, gpe1, th1];
    const ans = end[ask] as number;
    end[ask] = "?";
    return mk({
      key: `model-table-${ke0}-${gpe0}-${gpe1}-${th1}-${ask}`,
      prompt: `An energy model of a ball rolling down a bumpy hill (a closed system). Fill in the missing value.`,
      visual: table(["Energy store", "Start (J)", "End (J)"], ["Kinetic", ke0, end[0]], ["Gravitational", gpe0, end[1]], ["Thermal", th0, end[2]]),
      needsVisual: true,
      unit: "J",
      ...keypad(ans),
      hint: "In a closed system the total stays the same. Add the start column, then subtract the known end values.",
      explain: `Total = ${ke0} + ${gpe0} + ${th0} = ${ke0 + gpe0} J. Missing = ${ke0 + gpe0} − (sum of the other two end values) = ${ans} J.`,
    });
  }
  if (k === 2) {
    const e0 = 10 * rand(5, 15);
    const W = 10 * rand(2, 8);
    const loss = 10 * rand(1, 3);
    return mk({
      key: `model-open-${e0}-${W}-${loss}`,
      prompt: `A system starts with ${e0} J. A motor does ${W} J of work on it, and ${loss} J of heat escapes to the room. How much energy does the system have now?`,
      unit: "J",
      ...keypad(e0 + W - loss, [e0 + W + loss, e0 - W - loss]),
      hint: "Energy in adds to the system; energy out subtracts. ΔE = work in − heat out.",
      explain: `${e0} + ${W} − ${loss} = ${e0 + W - loss} J.`,
    });
  }
  if (k === 3) {
    const h0 = pick([10, 20, 5]);
    const keep = pick([0.8, 0.5, 0.9, 0.6]);
    const n = rand(2, 3);
    const hs = [h0];
    for (let i = 0; i < n; i++) hs.push(hs[hs.length - 1] * keep);
    const ans = r1(hs[n]);
    return mk({
      key: `model-bounce-${h0}-${keep}-${n}`,
      prompt: `A model says a ball keeps ${keep * 100}% of its energy each bounce. Dropped from ${h0} m, how high does it rise after bounce ${n}? Round to 1 decimal place.`,
      visual: table(["Bounce", ...hs.map((_, i) => i)], ["Height (m)", ...hs.map((h, i) => (i < n ? r2(h) : "?"))]),
      unit: "m",
      ...keypad(ans),
      hint: "GPE ∝ height, so each bounce height is the last one × " + keep + ".",
      explain: `${r2(hs[n - 1])} × ${keep} ≈ ${ans} m. Each step: h → ${keep}h. The rest goes to heat and sound.`,
    });
  }
  return card("model", [
    {
      p: "A student's computer model of a swinging pendulum (no friction) shows the total energy creeping up each swing. What does this mean?",
      a: "The model has a bug: total energy should stay constant",
      w: ["The pendulum is gaining energy from gravity", "That's normal for pendulums", "The air is pushing it"],
      h: "In a closed system with no friction, what happens to the total energy?",
      e: "Energy is conserved, so the total must stay the same. A rising total means the model's maths (often its time step) is wrong.",
    },
    {
      p: "To model a system's energy, which must you track?",
      a: "Every energy store, plus energy flowing in or out",
      w: ["Only kinetic energy", "Only the biggest store", "Only the forces"],
      h: "ΔE of the system = energy in − energy out.",
      e: "Track every store (kinetic, potential, thermal…) and every flow across the boundary; the books must balance.",
    },
  ]);
}

export function energyPlot(): Question {
  const v = rand(0, 2);
  if (v === 2) {
    const H = pick([4, 6, 8]);
    return mk({
      key: `eplot-read-${H}`,
      prompt: `A ball is dropped from ${H} m. The graph shows its GPE and KE as it falls. After falling how far are they equal?`,
      visual: {
        kind: "plot",
        xLabel: "distance fallen (m)",
        yLabel: "energy (J)",
        x: [0, H],
        y: [0, 10],
        curves: [
          { fn: (d) => 10 - (10 * d) / H, colour: "wave", label: "GPE" },
          { fn: (d) => (10 * d) / H, colour: "berry", label: "KE" },
        ],
      },
      needsVisual: true,
      unit: "m",
      ...keypad(H / 2),
      hint: "Find where the two lines cross.",
      explain: `They cross halfway, after falling ${H / 2} m: GPE has dropped by half and all of it has become KE.`,
    });
  }
  const m = pick([0.1, 0.2]);
  const per = m * 10;
  const hs = shuffle([1, 2, 3, 4, 5].filter((h) => h * per <= 10)).slice(0, 4).sort((a, b) => a - b);
  if (v === 0)
    return act({
      key: `eplot-gpe-${m}-${hs.join("")}`,
      prompt: `Plot the GPE of a ${m} kg ball at each height (use g = 10 m/s²). Across: height (m). Up: GPE (J).`,
      activity: { kind: "plotPoints", points: hs.map((h) => ({ x: h, y: h * per, label: `${h} m` })), size: 10, quadrants: 1 },
      answer: per,
      hint: `GPE = mgh = ${m} × 10 × h = ${per}h J.`,
      explain: `The points (${hs.map((h) => `${h}, ${h * per}`).join("; ")}) lie on a straight line: GPE ∝ height, slope mg = ${per} J per metre.`,
    });
  const H = 10 / per;
  const hs2 = hs.filter((h) => h <= H);
  return act({
    key: `eplot-ke-${m}-${hs2.join("")}`,
    prompt: `A ${m} kg ball is dropped from ${H} m (use g = 10 m/s², no air). Plot its KE at each height. Across: height (m). Up: KE (J).`,
    activity: { kind: "plotPoints", points: hs2.map((h) => ({ x: h, y: 10 - h * per, label: `${h} m` })), size: 10, quadrants: 1 },
    answer: per,
    hint: `Total energy = mgH = 10 J. At height h, KE = 10 − ${per}h.`,
    explain: `KE = 10 − ${per}h: the lower the ball, the more KE. Points: ${hs2.map((h) => `(${h}, ${10 - h * per})`).join(", ")}.`,
  });
}

const CONVERTERS: [string, number][] = [
  ["electric fan", 0],
  ["electric car motor", 0],
  ["power drill", 0],
  ["washing machine drum", 0],
  ["wind turbine", 1],
  ["bike dynamo", 1],
  ["hydro dam generator", 1],
  ["shake-to-charge torch", 1],
  ["solar panel", 2],
  ["calculator's solar cell", 2],
  ["solar garden light (by day)", 2],
  ["AA battery", 3],
  ["hydrogen fuel cell", 3],
  ["lemon battery", 3],
];

export function convertSort(): Question {
  const bins = ["Electrical → motion", "Motion → electrical", "Light → electrical", "Chemical → electrical"];
  const use = shuffle([0, 1, 2, 3]).slice(0, rand(3, 4)).sort();
  const items = shuffle(use.flatMap((b) => shuffle(CONVERTERS.filter((c) => c[1] === b)).slice(0, 2)));
  return act({
    key: `conv-${items.map((i) => CONVERTERS.indexOf(i)).sort((a, b) => a - b).join("_")}`,
    prompt: "Sort each device by the energy conversion it is designed for.",
    activity: { kind: "sort", bins: use.map((b) => bins[b]), items: items.map(([label, bin]) => ({ label, bin: use.indexOf(bin) })) },
    answer: items.length,
    hint: "Ask: what goes in (electricity, motion, light, a chemical reaction) and what useful thing comes out?",
    explain: use.map((b) => `${bins[b]}: ${items.filter((i) => i[1] === b).map((i) => i[0]).join(", ")}`).join(". ") + ".",
  });
}

export function converterDesign(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const P = pick([10, 15, 20, 30]);
    const eff = pick([50, 60, 75, 80]);
    const need = pick([2, 3, 5]);
    const mins = clean(((P * eff) / 100 / need) * 1);
    return mk({
      key: `design-crank-${P}-${eff}-${need}`,
      prompt: `A hand-crank radio: you crank with ${P} W, the generator is ${eff}% efficient, and the radio uses ${need} W. How many minutes of radio does 1 minute of cranking give? Round to 1 decimal place.`,
      unit: "min",
      ...keypad(r1(mins)),
      hint: "Useful power stored = input × efficiency. Minutes of play = stored energy ÷ radio power.",
      explain: `${P} W × ${eff / 100} = ${ds((P * eff) / 100)} W stored; ${ds((P * eff) / 100)} ÷ ${need} ≈ ${r1(mins)} minutes per minute of cranking.`,
    });
  }
  if (k === 1) {
    const A = pick([0.5, 1, 2]);
    const I = pick([800, 1000]);
    const eff = pick([15, 20, 25]);
    return mk({
      key: `design-solar-${A}-${I}-${eff}`,
      prompt: `Sunlight delivers ${I} W per m². A ${A} m² solar panel is ${eff}% efficient. What electrical power does it give?`,
      unit: "W",
      ...keypad(clean((A * I * eff) / 100), [A * I]),
      hint: "Light power in = intensity × area. Electrical out = that × efficiency.",
      explain: `${I} × ${A} = ${A * I} W of light; ${eff}% of that is ${ds((A * I * eff) / 100)} W.`,
    });
  }
  if (k === 2) {
    const designs = shuffle([
      { n: "A", eff: rand(40, 60), cost: rand(20, 40) },
      { n: "B", eff: rand(61, 80), cost: rand(41, 80) },
      { n: "C", eff: rand(81, 95), cost: rand(81, 120) },
    ]);
    const crit = rand(0, 1);
    const best = crit === 0 ? designs.reduce((a, b) => (b.eff > a.eff ? b : a)) : designs.reduce((a, b) => (b.cost < a.cost ? b : a));
    return mk({
      key: `design-pick-${designs.map((d) => d.n + d.eff + d.cost).join("")}-${crit}`,
      prompt: crit === 0 ? "Your team must pick the generator design that wastes the least energy. Which one?" : "Your budget is tight; any design over 40% efficient is OK. Which is the best choice?",
      visual: table(["Design", "Efficiency (%)", "Cost ($)"], ...designs.map((d) => [d.n, d.eff, d.cost])),
      needsVisual: true,
      ...label(best.n, designs.map((d) => d.n).filter((n) => n !== best.n)),
      hint: crit === 0 ? "Least waste means the highest efficiency." : "All three meet the efficiency criterion, so compare the costs.",
      explain: crit === 0 ? `${best.n} has the highest efficiency (${best.eff}%).` : `All are over 40%, so the cheapest, ${best.n} ($${best.cost}), meets the criteria best.`,
    });
  }
  return card("design", [
    {
      p: "You're designing a device to turn a stream's flow into electricity. Which part does the key conversion?",
      a: "A turbine spinning a generator",
      w: ["A solar cell", "A battery", "A heating element"],
      h: "Moving water has kinetic energy.",
      e: "The water spins a turbine (kinetic), which turns a generator's coil in a magnetic field to make electricity.",
    },
    {
      p: "A design for a phone charger works but gets very hot. What does that tell you?",
      a: "It's wasting a lot of energy as heat: low efficiency",
      w: ["It's charging extra fast", "It's creating energy", "It's perfectly efficient"],
      h: "Energy in = useful out + wasted.",
      e: "The heat is energy that didn't reach the battery. A better design reduces that waste (lower resistance, better parts).",
    },
    {
      p: "Which is a constraint (a limit), not a goal, for a classroom energy-converter project?",
      a: "It must cost less than $20",
      w: ["It should light an LED", "It should be as efficient as possible", "It should be fun to use"],
      h: "Constraints are limits you must stay within.",
      e: "Cost, size, time and safety limits are constraints. 'Light an LED efficiently' is the goal (criterion) you're trying to meet.",
    },
  ]);
}

/* =================================================================== world 7: heat & the second law */

export function particles(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const c = pick([-40, -10, 0, 20, 25, 37, 100, 127, 227]);
    return mk({
      key: `part-toK-${c}`,
      prompt: `Convert ${ds(c)} °C to kelvin.`,
      unit: "K",
      ...keypad(c + 273, [c - 273]),
      hint: "K = °C + 273. A kelvin is the same size as a degree Celsius.",
      explain: `${ds(c)} + 273 = ${c + 273} K.`,
    });
  }
  if (k === 1) {
    const K = pick([0, 73, 173, 253, 273, 300, 373, 400]);
    return mk({
      key: `part-toC-${K}`,
      prompt: `Convert ${K} K to degrees Celsius.`,
      unit: "°C",
      ...signed(K - 273),
      hint: "°C = K − 273.",
      explain: `${K} − 273 = ${ds(K - 273)} °C.${K === 0 ? " That's absolute zero, the coldest possible temperature." : ""}`,
    });
  }
  if (k === 2) {
    const askTemp = rand(0, 1) === 1;
    const hot = pick([70, 80, 90]);
    return mk({
      key: `part-tub-${askTemp}-${hot}`,
      prompt: `A bathtub of water is at 40 °C; a cup of tea is at ${hot} °C. Which has ${askTemp ? "faster-moving particles on average" : "more thermal energy in total"}?`,
      visual: { kind: "phys-thermo", scene: "thermometer", min: 0, max: 100, step: 5, labelStep: 20, thermometers: [{ temp: 40, label: "bath" }, { temp: hot, label: "tea" }] },
      ...label(askTemp ? "The tea" : "The bathtub", [askTemp ? "The bathtub" : "The tea", "They're equal"]),
      hint: "Temperature measures the average kinetic energy per particle. Thermal energy adds up all the particles' energy.",
      explain: askTemp ? "The tea is hotter, so its particles move faster on average." : "The bath is cooler but has vastly more particles, so its total thermal energy is much bigger.",
    });
  }
  if (k === 3) {
    const heat = rand(0, 1) === 1;
    return mk({
      key: `part-gas-${heat}`,
      prompt: `A gas is sealed in a rigid can and ${heat ? "heated" : "cooled"}. What happens to its particles?`,
      visual: { kind: "phys-thermo", scene: "piston", volume: 0.6, heat: heat ? "in" : "out", hot: heat, T: heat ? "T ↑" : "T ↓" },
      ...label(heat ? "They move faster and hit the walls harder and more often" : "They move slower and hit the walls more gently", [
        heat ? "They move slower and hit the walls more gently" : "They move faster and hit the walls harder and more often",
        "They get bigger",
        "They stop moving",
      ]),
      hint: "Temperature is a measure of the particles' average kinetic energy.",
      explain: heat ? "Heating raises the particles' kinetic energy, so they move faster and the pressure rises." : "Cooling lowers their kinetic energy, so they slow down and the pressure drops.",
    });
  }
  return card("part", [
    {
      p: "What is absolute zero (0 K, −273 °C)?",
      a: "The temperature where particles have the least possible motion",
      w: ["The temperature water freezes", "The coldest place in space", "Where particles move fastest"],
      h: "Temperature measures particle motion.",
      e: "At 0 K the particles have their minimum possible kinetic energy. Nothing can be colder.",
    },
    {
      p: "In particle terms, what does a thermometer's temperature measure?",
      a: "The average kinetic energy of the particles",
      w: ["The total energy of the object", "The number of particles", "The size of the particles"],
      h: "Hotter means faster-jiggling particles.",
      e: "Temperature tracks the average kinetic energy per particle; it doesn't depend on how much stuff there is.",
    },
    {
      p: "A metal spoon gets hot in soup. At the particle level…",
      a: "fast soup particles bump the spoon's atoms, making them vibrate faster",
      w: ["heat particles flow into the spoon", "the spoon's atoms get bigger", "cold flows out of the spoon"],
      h: "Heat isn't a substance; it's energy passed on in collisions.",
      e: "Collisions pass kinetic energy from the faster soup particles to the spoon's atoms, which vibrate more: the spoon warms.",
    },
  ]);
}

const C_TABLE: [string, number][] = [
  ["water", 4200],
  ["aluminium", 900],
  ["sand", 800],
  ["iron", 450],
  ["copper", 390],
];

export function specificHeat(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const m = pick([0.2, 0.5, 1, 1.5, 2]);
    const dT = pick([5, 10, 20, 25, 50, 80]);
    return mk({
      key: `shc-Q-${m}-${dT}`,
      prompt: `How much energy heats ${m} kg of water by ${dT} °C? (c = 4200 J/(kg·°C))`,
      unit: "J",
      ...keypad(clean(m * 4200 * dT), [clean(m * 4200), clean(4200 * dT)]),
      hint: "Q = mcΔT.",
      explain: `Q = ${m} × 4200 × ${dT} = ${(m * 4200 * dT).toLocaleString("en-US")} J.`,
    });
  }
  if (k === 1) {
    const [name, c] = pick(C_TABLE);
    const m = pick([0.5, 1, 2]);
    const dT = pick([5, 10, 20, 40]);
    const Q = clean(m * c * dT);
    return mk({
      key: `shc-dT-${name}-${m}-${dT}`,
      prompt: `${Q.toLocaleString("en-US")} J heats a ${m} kg block of ${name} (c = ${c} J/(kg·°C)). By how much does its temperature rise?`,
      unit: "°C",
      ...keypad(dT),
      hint: "ΔT = Q ÷ (mc).",
      explain: `ΔT = ${Q} ÷ (${m} × ${c}) = ${dT} °C.`,
    });
  }
  if (k === 2) {
    const pickN = shuffle(C_TABLE).slice(0, 3);
    const most = rand(0, 1) === 1;
    const ans = pickN.reduce((a, b) => ((most ? b[1] < a[1] : b[1] > a[1]) ? b : a));
    return mk({
      key: `shc-cmp-${pickN.map((p) => p[0][0]).join("")}-${most}`,
      prompt: `The same energy goes into 1 kg of each material. Which warms up the ${most ? "most" : "least"}?`,
      visual: table(["Material", "c (J/(kg·°C))"], ...pickN.map(([n, c]) => [n, c])),
      needsVisual: true,
      ...label(ans[0], pickN.map((p) => p[0]).filter((n) => n !== ans[0])),
      hint: "ΔT = Q ÷ (mc): a big c means a small temperature change.",
      explain: `${ans[0]} has the ${most ? "lowest" : "highest"} specific heat (${ans[1]}), so its temperature changes ${most ? "most" : "least"}.`,
    });
  }
  if (k === 3) {
    const [name, c] = pick(C_TABLE.slice(1));
    const m = pick([0.5, 1, 2]);
    const dT = pick([10, 20, 50]);
    const Q = clean(m * c * dT);
    return mk({
      key: `shc-c-${name}-${m}-${dT}`,
      prompt: `It takes ${Q.toLocaleString("en-US")} J to warm a ${m} kg block by ${dT} °C. What is its specific heat capacity?`,
      unit: "J/(kg·°C)",
      ...keypad(c),
      hint: "c = Q ÷ (mΔT).",
      explain: `c = ${Q} ÷ (${m} × ${dT}) = ${c} J/(kg·°C), which matches ${name}.`,
    });
  }
  return card("shc", [
    {
      p: "Towns by the sea have milder winters and summers than inland towns. Why?",
      a: "Water's high specific heat makes the sea warm and cool very slowly",
      w: ["Sea air has no heat", "The sea reflects all sunlight", "Salt stops temperature changes"],
      h: "Water needs 4200 J to warm 1 kg by 1 °C, much more than rock or sand.",
      e: "The sea soaks up lots of energy in summer and releases it in winter while barely changing temperature, so nearby air stays milder.",
    },
    {
      p: "Why is water used to cool car engines?",
      a: "It can absorb a lot of energy for a small temperature rise",
      w: ["It conducts electricity", "It boils easily", "It's lighter than oil"],
      h: "High specific heat capacity.",
      e: "With c = 4200 J/(kg·°C), water carries away lots of heat without getting too hot itself.",
    },
  ]);
}

export function thermalEquilibrium(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const m1 = pick([0.1, 0.2, 0.3, 0.5, 1]);
    const m2 = pick([0.1, 0.2, 0.4, 0.5, 1]);
    const T1 = pick([60, 70, 80, 90]);
    const T2 = pick([10, 15, 20, 25]);
    const Tf = r1((m1 * T1 + m2 * T2) / (m1 + m2));
    return mk({
      key: `eq-mix-${m1}-${m2}-${T1}-${T2}`,
      prompt: `${m1} kg of water at ${T1} °C is mixed with ${m2} kg of water at ${T2} °C. What is the final temperature? (No heat lost) Round to 1 decimal place.`,
      visual: { kind: "phys-thermo", scene: "flow", a: { emoji: "♨️", temp: T1 }, b: { emoji: "💧", temp: T2 } },
      unit: "°C",
      ...keypad(Tf),
      hint: "Heat lost by the hot water = heat gained by the cold water. For the same liquid: T = (m₁T₁ + m₂T₂) ÷ (m₁ + m₂).",
      explain: `T = (${m1} × ${T1} + ${m2} × ${T2}) ÷ ${clean(m1 + m2)} ≈ ${Tf} °C. It's closer to the temperature of the bigger mass.`,
    });
  }
  if (k === 2) {
    const [name, c] = pick(C_TABLE.slice(1));
    const mb = pick([0.2, 0.5, 1]);
    const Tb = pick([80, 100, 150]);
    const mw = pick([0.5, 1, 2]);
    const Tw = pick([15, 20]);
    const Tf = r1((mb * c * Tb + mw * 4200 * Tw) / (mb * c + mw * 4200));
    return mk({
      key: `eq-block-${name}-${mb}-${Tb}-${mw}-${Tw}`,
      prompt: `A ${mb} kg ${name} block (c = ${c}) at ${Tb} °C is dropped into ${mw} kg of water (c = 4200) at ${Tw} °C. What is the final temperature? Round to 1 decimal place.`,
      unit: "°C",
      ...keypad(Tf),
      hint: "Heat lost by block = heat gained by water: (mcΔT) of the block = (mcΔT) of the water. Solve for T.",
      explain: `T = (${mb}·${c}·${Tb} + ${mw}·4200·${Tw}) ÷ (${mb}·${c} + ${mw}·4200) ≈ ${Tf} °C. Water's huge c means it barely warms.`,
    });
  }
  if (k === 3) {
    const a = rand(0, 90);
    let b = rand(0, 90);
    if (rand(0, 4) === 0) b = a;
    const ea = pick(["☕", "🥛", "🍲", "🧱"]);
    const eb = pick(["🧊", "🥄", "🍦", "🪨"]);
    const ans = a > b ? "From A to B" : a < b ? "From B to A" : "No net heat flow";
    return mk({
      key: `eq-dir-${a}-${b}`,
      prompt: `Object A is at ${a} °C and object B at ${b} °C, touching. Which way does heat flow?`,
      visual: { kind: "phys-thermo", scene: "flow", a: { emoji: ea, temp: a, label: "?" }, b: { emoji: eb, temp: b, label: "?" }, arrowLabel: "?" },
      ...label(ans, ["From A to B", "From B to A", "No net heat flow", "From the colder to the hotter"].filter((x) => x !== ans)),
      hint: "Heat always flows on its own from hotter to colder, until the temperatures are equal.",
      explain: a === b ? "Same temperature: they're in thermal equilibrium, so there's no net flow." : `Heat flows from the hotter (${Math.max(a, b)} °C) to the colder (${Math.min(a, b)} °C) until they match.`,
    });
  }
  return card("eq", [
    {
      p: "A metal bench and a wooden bench sit outside all night at 5 °C. Why does the metal feel colder?",
      a: "Metal conducts heat away from your hand faster",
      w: ["The metal is at a lower temperature", "Wood makes its own heat", "Metal attracts cold"],
      h: "After a night outside they're in equilibrium with the air.",
      e: "Both are at 5 °C, but metal carries heat away from your skin much faster, so your skin cools quicker.",
    },
    {
      p: "Why must you wait a moment before reading a thermometer in your mouth?",
      a: "It must reach thermal equilibrium with your body",
      w: ["The liquid needs to warm the air", "Thermometers need to charge", "Your mouth must cool down"],
      h: "A thermometer only shows its own temperature.",
      e: "Heat flows into the thermometer until it's at the same temperature as you. Then its reading equals your temperature.",
    },
  ]);
}

const COOLING_SETS = [
  [90, 60, 40, 30],
  [80, 50, 40, 30],
  [100, 70, 50, 40],
  [90, 70, 50, 40],
  [80, 60, 40, 30],
];

export function coolingPlot(): Question {
  const i = rand(0, COOLING_SETS.length - 1);
  const temps = COOLING_SETS[i];
  const step = pick([2, 5, 10]);
  return act({
    key: `cool-${i}-${step}`,
    prompt: `Plot the tea cooling in a 20 °C room. Across: time (1 square = ${step} min). Up: temperature (1 square = 10 °C).`,
    visual: table(["Time (min)", ...temps.map((_, t) => t * step)], ["Temp (°C)", ...temps]),
    needsVisual: true,
    activity: { kind: "plotPoints", points: temps.map((T, t) => ({ x: t, y: T / 10, label: `${t * step} min` })), size: 10, quadrants: 1 },
    answer: temps[3],
    hint: "Each column is a point: across by the time in squares, up by the temperature ÷ 10.",
    explain: "The curve drops fastest at first, when the tea is much hotter than the room, then levels off toward 20 °C, where it reaches thermal equilibrium.",
  });
}

const HEATING_CURVE = (t: number) => (t < 1 ? -20 + 20 * t : t < 3 ? 0 : t < 6 ? ((t - 3) * 100) / 3 : t < 9 ? 100 : 100 + 20 * (t - 9));

export function phase(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const parts = [
      { n: "A", x: 0.5, q: "only ice, warming up" },
      { n: "B", x: 2, q: "melting" },
      { n: "C", x: 4.5, q: "only liquid water, warming up" },
      { n: "D", x: 7.5, q: "boiling" },
    ];
    const i = rand(0, 3);
    return mk({
      key: `phase-curve-${i}`,
      prompt: `Ice is heated steadily. In which part of the heating curve is the water ${parts[i].q}?`,
      visual: { kind: "plot", xLabel: "time (min)", yLabel: "temperature (°C)", x: [0, 10], y: [-20, 120], curves: [{ fn: HEATING_CURVE, colour: "berry" }], points: parts.map((p) => ({ x: p.x, y: HEATING_CURVE(p.x), label: p.n })) },
      needsVisual: true,
      ...label(parts[i].n, parts.filter((_, j) => j !== i).map((p) => p.n)),
      hint: "Sloping parts: the temperature rises. Flat parts: the state is changing (0 °C melting, 100 °C boiling).",
      explain: `Part ${parts[i].n}: ${i % 2 === 1 ? "flat, because the energy goes into separating particles (potential energy), not speeding them up." : "sloping, because the energy speeds the particles up (kinetic energy)."}`,
    });
  }
  if (k === 2) {
    const melt = rand(0, 1) === 1;
    const m = pick([0.1, 0.2, 0.5, 1, 2]);
    const L = melt ? 334 : 2260;
    return mk({
      key: `phase-L-${melt}-${m}`,
      prompt: `How much energy does it take to ${melt ? "melt" : "boil away"} ${m} kg of ${melt ? "ice at 0 °C" : "water at 100 °C"}? (L = ${L} kJ/kg)`,
      unit: "kJ",
      ...keypad(clean(m * L)),
      hint: "Q = mL. The temperature doesn't change during a change of state.",
      explain: `Q = ${m} × ${L} = ${ds(m * L)} kJ.`,
    });
  }
  if (k === 3) {
    const m = pick([0.1, 0.2, 0.5, 1]);
    const T = pick([10, 20, 30, 50]);
    const Q = r1(m * (334 + 4.2 * T));
    return mk({
      key: `phase-total-${m}-${T}`,
      prompt: `How much energy turns ${m} kg of ice at 0 °C into water at ${T} °C? (melting: 334 kJ/kg; water: c = 4.2 kJ/(kg·°C)) Round to 1 decimal place.`,
      unit: "kJ",
      ...keypad(Q),
      hint: "Two steps: melt it (mL), then warm the water (mcΔT). Add them.",
      explain: `Melt: ${m} × 334 = ${ds(m * 334)} kJ. Warm: ${m} × 4.2 × ${T} = ${ds(m * 4.2 * T)} kJ. Total ${Q} kJ.`,
    });
  }
  return card("phase", [
    {
      p: "While ice melts at 0 °C, energy keeps flowing in but the temperature doesn't rise. Where does the energy go?",
      a: "Into potential energy: pulling the particles apart",
      w: ["It's destroyed", "Into making the particles faster", "Out through the ice"],
      h: "Temperature tracks particle kinetic energy. What else can particles have?",
      e: "The energy breaks the bonds holding the solid together, raising the particles' potential energy while their average kinetic energy (temperature) stays the same.",
    },
    {
      p: "Why does a steam burn at 100 °C hurt more than boiling water at 100 °C?",
      a: "Steam releases its large latent heat as it condenses on your skin",
      w: ["Steam is hotter", "Steam moves faster", "Water can't burn"],
      h: "L for boiling is 2260 kJ/kg.",
      e: "Condensing steam gives up 2260 kJ per kg before it even starts cooling, so it delivers far more energy to your skin.",
    },
    {
      p: "Why does sweating cool you down?",
      a: "Evaporating sweat takes energy from your skin",
      w: ["Sweat is colder than you", "Sweat reflects sunlight", "Sweat blocks heat from outside"],
      h: "Turning liquid into gas needs latent heat.",
      e: "The fastest water particles escape as vapour, carrying energy away and leaving your skin cooler.",
    },
  ]);
}

const KEPE_POOL: [string, number][] = [
  ["fast molecules in steam", 0],
  ["a spinning flywheel", 0],
  ["wind", 0],
  ["jiggling atoms in hot metal", 0],
  ["a sound wave in air", 0],
  ["a rolling ball", 0],
  ["a stretched spring", 1],
  ["water behind a dam", 1],
  ["a book on a high shelf", 1],
  ["a charged capacitor", 1],
  ["two magnets held apart", 1],
  ["chemical bonds in food", 1],
  ["ice melting at 0 °C", 1],
];

export function kePeSort(): Question {
  const a = shuffle(KEPE_POOL.filter((p) => p[1] === 0)).slice(0, rand(3, 4));
  const b = shuffle(KEPE_POOL.filter((p) => p[1] === 1)).slice(0, rand(3, 4));
  const items = shuffle([...a, ...b]);
  return act({
    key: `kepe-${items.map((i) => KEPE_POOL.indexOf(i)).sort((x, y) => x - y).join("_")}`,
    prompt: "At the particle level, every energy is motion or position. Sort each one.",
    activity: { kind: "sort", bins: ["Motion (kinetic)", "Position in a field (potential)"], items: items.map(([label, bin]) => ({ label, bin })) },
    answer: a.length,
    hint: "Is something moving (particles or a whole object)? Or is energy stored by where things sit relative to a force: gravity, springs, charges, magnets, bonds?",
    explain: `Kinetic: ${a.map((x) => x[0]).join(", ")}. Potential (fields): ${b.map((x) => x[0]).join(", ")}.`,
  });
}

export function secondLaw(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const Qin = pick([100, 200, 500, 1000, 2000]);
    const eff = pick([20, 25, 30, 40]);
    const W = (Qin * eff) / 100;
    const ask = rand(0, 1);
    return mk({
      key: `sl-engine-${Qin}-${eff}-${ask}`,
      prompt: ask ? `A heat engine takes in ${Qin} J of heat and does ${W} J of work. How much heat must it dump to the cold surroundings?` : `A heat engine takes in ${Qin} J of heat and does ${W} J of work. What is its efficiency?`,
      visual: { kind: "phys-energy", chain: [{ emoji: "🔥", label: `${Qin} J heat` }, { emoji: "⚙️", label: "engine" }, [{ emoji: "🏋️", label: `${W} J work` }, { emoji: "🌬️", label: ask ? "heat out ?" : "heat out" }]] },
      unit: ask ? "J" : "%",
      ...keypad(ask ? Qin - W : eff),
      hint: ask ? "Energy is conserved: heat in = work out + heat out." : "Efficiency = work out ÷ heat in × 100%.",
      explain: ask ? `${Qin} − ${W} = ${Qin - W} J must go to the cold side. The second law says this can never be 0.` : `${W} ÷ ${Qin} × 100 = ${eff}%.`,
    });
  }
  return card("sl", [
    {
      p: "Which of these never happens on its own?",
      a: "Heat flowing from a cold drink into a warm room",
      w: ["Ice melting in a warm drink", "Hot soup cooling down", "A warm room heating a cold drink"],
      h: "The second law of thermodynamics.",
      e: "Heat flows spontaneously only from hotter to colder. Moving it the other way needs work, as in a fridge.",
    },
    {
      p: "A fridge moves heat from its cold inside to the warmer kitchen. How is that allowed?",
      a: "It uses electrical work to pump the heat",
      w: ["It creates cold", "The second law doesn't apply to fridges", "The heat flows by itself"],
      h: "Heat can go 'uphill' only if something pays for it.",
      e: "The compressor does work, and that work pushes heat from cold to hot. The kitchen gets the removed heat plus the work.",
    },
    {
      p: "Why can't a heat engine turn ALL of its heat into work?",
      a: "Some heat must always flow out to a colder place",
      w: ["Engines leak fuel", "Work can't be measured", "It could, with perfect oil"],
      h: "An engine works by letting heat flow from hot to cold.",
      e: "The second law: an engine must dump some heat to a cold reservoir, so its efficiency is always below 100%.",
    },
    {
      p: "A drop of ink spreads through a glass of water and never gathers back into a drop. This shows that…",
      a: "energy and matter tend to spread out (entropy increases)",
      w: ["ink is lighter than water", "the water is moving in a circle", "the ink's energy was destroyed"],
      h: "There are vastly more spread-out arrangements than gathered ones.",
      e: "Systems naturally move toward more spread-out, more probable states: entropy increases. The same rule makes heat spread from hot to cold.",
    },
    {
      p: "Someone claims a machine that runs forever, powering itself with no fuel. What's wrong?",
      a: "Energy losses (heat) are unavoidable, so it must run down",
      w: ["Nothing: it could work", "It would run too fast", "It would get too cold"],
      h: "Friction and resistance always spread some energy out as heat.",
      e: "Every real process loses some energy as spread-out heat, so a machine can't keep itself going without an energy input.",
    },
  ]);
}

export function heatEngines(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const Th = pick([227, 327, 527, 727]);
    const Tc = pick([27, 7]);
    const eff = Math.round((1 - (Tc + 273) / (Th + 273)) * 100);
    return mk({
      key: `he-carnot-${Th}-${Tc}`,
      prompt: `An engine runs between ${Th} °C and ${Tc} °C. What is the most efficient it could ever be, to the nearest %? (max efficiency = 1 − T(cold) ÷ T(hot), in kelvin)`,
      unit: "%",
      ...keypad(eff, [Math.round((1 - Tc / Th) * 100)]),
      hint: "Convert both temperatures to kelvin first (+273).",
      explain: `1 − ${Tc + 273} ÷ ${Th + 273} ≈ ${eff}%. Real engines do worse. A hotter hot side or colder cold side helps.`,
    });
  }
  if (k === 1) {
    const fuel = pick([80, 100, 120, 200]);
    const eff = pick([20, 25, 30, 35]);
    const askHeat = rand(0, 1) === 1;
    return mk({
      key: `he-car-${fuel}-${eff}-${askHeat}`,
      prompt: `A car engine burns fuel at ${fuel} kW and is ${eff}% efficient. How much power ${askHeat ? "leaves as heat" : "drives the car"}?`,
      visual: { kind: "phys-energy", chain: [{ emoji: "⛽", label: "fuel" }, { emoji: "⚙️", label: "engine", via: "chemical" }, [{ emoji: "🚗", label: "motion" }, { emoji: "🔥", label: "heat" }]] },
      unit: "kW",
      ...keypad(clean(askHeat ? (fuel * (100 - eff)) / 100 : (fuel * eff) / 100)),
      hint: "Useful power = efficiency × input. The rest leaves as heat (exhaust, radiator).",
      explain: `Useful: ${eff}% × ${fuel} = ${ds((fuel * eff) / 100)} kW; heat: ${ds((fuel * (100 - eff)) / 100)} kW.`,
    });
  }
  if (k === 2) {
    const Qc = pick([200, 300, 400, 600]);
    const W = pick([50, 100, 150]);
    return mk({
      key: `he-fridge-${Qc}-${W}`,
      prompt: `A fridge removes ${Qc} J of heat from its inside using ${W} J of electrical work. How much heat comes out of the back into the kitchen?`,
      unit: "J",
      ...keypad(Qc + W, [Qc - W, Qc]),
      hint: "Energy conservation: heat out = heat removed + work done.",
      explain: `${Qc} + ${W} = ${Qc + W} J. That's why an open fridge door can't cool a kitchen: it actually warms it.`,
    });
  }
  return card("he", [
    {
      p: "Leaving the fridge door open on a hot day will make the kitchen…",
      a: "slightly warmer",
      w: ["cooler", "the same temperature", "freeze"],
      h: "The heat from the inside goes out the back, plus the motor's work.",
      e: "The fridge just moves heat from the front to the back of the same room, and adds the work it uses, so the room warms.",
    },
    {
      p: "Power stations use cooling towers. What are they for?",
      a: "Dumping the heat the engine must give to a cold place",
      w: ["Making extra electricity", "Storing steam for later", "Cleaning the smoke"],
      h: "Every heat engine needs a cold side.",
      e: "The steam turbine can only work if heat flows to something colder; the cooling towers carry that waste heat away.",
    },
  ]);
}

const CUPS: [string, number][] = [
  ["paper cup", 52],
  ["glass", 48],
  ["foam cup", 66],
  ["steel mug", 44],
  ["double-walled mug", 70],
  ["vacuum flask", 76],
];

export function insulation(): Question {
  const k = rand(0, 3);
  if (k <= 1) {
    const cups = shuffle(CUPS).slice(0, 3);
    const best = cups.reduce((a, b) => (b[1] > a[1] ? b : a));
    const worst = cups.reduce((a, b) => (b[1] < a[1] ? b : a));
    const askBest = k === 0;
    const ans = askBest ? best : worst;
    return mk({
      key: `ins-pick-${cups.map((c) => c[0][0] + c[1]).join("")}-${askBest}`,
      prompt: `80 °C water was poured into each container. After 20 minutes the temperatures were measured. Which is the ${askBest ? "best" : "worst"} insulator?`,
      visual: table(["Container", "After 20 min (°C)"], ...cups.map(([n, t]) => [n, t])),
      needsVisual: true,
      ...label(ans[0], cups.map((c) => c[0]).filter((n) => n !== ans[0])),
      hint: "A good insulator slows heat flow, so the water stays hottest.",
      explain: `The ${ans[0]} ended ${askBest ? "hottest" : "coolest"} (${ans[1]} °C), so it lets heat out ${askBest ? "most slowly" : "fastest"}.`,
    });
  }
  if (k === 2) {
    const [name, T] = pick(CUPS);
    const mins = 20;
    return mk({
      key: `ins-rate-${name}`,
      prompt: `Water in a ${name} cooled from 80 °C to ${T} °C in ${mins} minutes. What was the average cooling rate? Round to 1 decimal place.`,
      unit: "°C/min",
      ...keypad(r1((80 - T) / mins)),
      hint: "Rate = temperature drop ÷ time.",
      explain: `(80 − ${T}) ÷ ${mins} = ${r1((80 - T) / mins)} °C per minute.`,
    });
  }
  return card("ins", [
    {
      p: "A vacuum flask keeps drinks hot. What does the vacuum between its walls stop?",
      a: "Conduction and convection (no particles to carry heat)",
      w: ["Radiation", "All heat loss completely", "The drink from evaporating"],
      h: "Conduction and convection both need particles.",
      e: "With almost no particles in the gap, heat can't be passed on by collisions or carried by moving fluid. Shiny walls reduce radiation too.",
    },
    {
      p: "Why are fluffy materials like wool and foam good insulators?",
      a: "They trap lots of still air, which conducts heat poorly",
      w: ["They are warm by themselves", "They absorb cold", "They reflect all heat"],
      h: "Air is a poor conductor, as long as it can't flow.",
      e: "Trapped pockets of air can't form convection currents, and still air conducts heat very slowly.",
    },
    {
      p: "In a fair test of cup materials, which must be kept the same?",
      a: "The starting temperature and amount of water",
      w: ["The cup material", "The final temperature", "Nothing needs to stay the same"],
      h: "Only the thing you're testing should change.",
      e: "Change only the cup material; keep the water's volume, starting temperature, time and room the same.",
    },
  ]);
}

export function fieldStorage(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const C = pick([100, 200, 500, 1000]);
    const V = pick([10, 20, 50, 100, 200, 300]);
    const E = clean(0.5 * C * 1e-6 * V * V);
    if (E < 0.01 || E > 1000) return fieldStorage();
    return mk({
      key: `fs-cap-${C}-${V}`,
      prompt: `A ${C} μF capacitor (${C} × 10⁻⁶ F) is charged to ${V} V. How much energy is stored in its electric field? (E = ½CV²)`,
      speech: `A ${C} microfarad capacitor is charged to ${V} volts. How much energy is stored in its electric field? E equals one half C V squared.`,
      unit: "J",
      ...keypad(r2(E)),
      hint: "Convert μF to F (× 10⁻⁶), then E = ½CV².",
      explain: `E = ½ × ${C} × 10⁻⁶ × ${V}² = ${r2(E)} J.`,
    });
  }
  if (k === 1) {
    const Q = pick([0.5, 2, 5, 10, 20]);
    const V = pick([1.5, 3, 9, 12]);
    return mk({
      key: `fs-qv-${Q}-${V}`,
      prompt: `A battery pushes ${Q} C of charge through a ${V} V potential difference. How much energy does the electric field give the charge?`,
      unit: "J",
      ...keypad(clean(Q * V), [clean(Q / V)]),
      hint: "Voltage is energy per charge: E = QV.",
      explain: `E = ${Q} × ${V} = ${ds(Q * V)} J (1 V = 1 J per coulomb).`,
    });
  }
  if (k === 2) {
    const start: "NS" | "SN" = pick(["NS", "SN"]);
    const other: "NS" | "SN" = pick(["NS", "SN"]);
    const attract = start[1] !== other[0];
    const together = rand(0, 1) === 1;
    const up = attract !== together;
    return mk({
      key: `fs-mag-${start}-${other}-${together}`,
      prompt: `You ${together ? "push these magnets closer together" : "pull these magnets farther apart"}. What happens to the energy stored in their magnetic field?`,
      visual: { kind: "phys-magnets", scene: "bars", magnets: [start, other], arrows: true },
      needsVisual: true,
      ...label(up ? "It increases" : "It decreases", [up ? "It decreases" : "It increases", "It stays the same"]),
      hint: "Look at the facing poles. Do you have to push against the magnetic force?",
      explain: up ? `They ${attract ? "attract, so pulling them apart" : "repel, so pushing them together"} takes work, which is stored in the field.` : `They ${attract ? "attract" : "repel"}, so this is the way they want to go: the field releases energy.`,
    });
  }
  return card("fs", [
    {
      p: "Sunlight warms your face after travelling through empty space. How does the energy get here?",
      a: "Carried by electric and magnetic fields (an electromagnetic wave)",
      w: ["Carried by hot air", "Carried by particles of heat", "It can't cross empty space"],
      h: "Light is an electromagnetic wave.",
      e: "Light is a travelling pattern of electric and magnetic fields. The fields themselves carry the energy across the vacuum.",
    },
    {
      p: "A transformer passes energy from one coil to another with no wire between them. How?",
      a: "Through the changing magnetic field in the iron core",
      w: ["Electrons jump across", "Through sound vibrations", "Through heat conduction"],
      h: "Changing magnetic fields induce currents.",
      e: "The primary's current builds a changing magnetic field, which stores and passes energy to the secondary coil by induction.",
    },
    {
      p: "Two unlike charges are released and rush together. What happens to the energy in their electric field?",
      a: "It decreases as it becomes kinetic energy",
      w: ["It increases", "It stays the same", "It turns into mass"],
      h: "They're moving the way the force pulls them.",
      e: "The field does work on them, so field energy falls and their kinetic energy rises by the same amount.",
    },
  ]);
}

/* =================================================================== world 8: waves & light */

export function waveParts(): Question {
  const k = rand(0, 4);
  if (k <= 1) {
    const lam = pick([2, 3, 4]);
    const A = pick([0.5, 1, 1.5, 2]);
    const askL = k === 0;
    return mk({
      key: `wp-read-${lam}-${A}-${askL}`,
      prompt: `Each grid square is 1 m. What is the wave's ${askL ? "wavelength" : "amplitude"}?`,
      visual: { kind: "phys-wave", length: 8, waves: [{ amplitude: A, wavelength: lam }], grid: true, names: true, wavelengthLabel: askL ? "?" : undefined, amplitudeLabel: askL ? undefined : "?" },
      needsVisual: true,
      unit: "m",
      ...(askL ? keypad(lam, [lam / 2, lam * 2]) : keypad(A, [2 * A])),
      hint: askL ? "Wavelength: the distance from one crest to the next crest." : "Amplitude: from the middle line up to a crest (not crest to trough).",
      explain: askL ? `Crest to crest is ${lam} m.` : `From the rest line to a crest is ${ds(A)} m; crest to trough would be ${ds(2 * A)} m.`,
    });
  }
  if (k === 2) {
    const T = pick([0.5, 0.25, 0.2, 0.1, 2, 0.02, 0.01]);
    return mk({
      key: `wp-f-${T}`,
      prompt: `A wave's period is ${T} s. What is its frequency?`,
      unit: "Hz",
      ...keypad(clean(1 / T), [T]),
      hint: "f = 1 ÷ T: how many waves pass each second.",
      explain: `f = 1 ÷ ${T} = ${ds(1 / T)} Hz.`,
    });
  }
  if (k === 3) {
    const n = pick([10, 12, 20, 30, 50]);
    const t = pick([2, 4, 5, 10]);
    return mk({
      key: `wp-count-${n}-${t}`,
      prompt: `${n} waves pass a buoy in ${t} s. What is the frequency?`,
      unit: "Hz",
      ...keypad(clean(n / t), [n * t, clean(t / n)]),
      hint: "Frequency = waves per second.",
      explain: `${n} ÷ ${t} = ${ds(n / t)} Hz.`,
    });
  }
  const longi = rand(0, 1) === 1;
  return mk({
    key: `wp-type-${longi}-${rand(0, 2)}`,
    prompt: "What kind of wave is this?",
    visual: longi ? { kind: "phys-wave", form: "longitudinal", length: 10, waves: [{ amplitude: 1, wavelength: 3 }], names: true } : { kind: "phys-wave", length: 10, waves: [{ amplitude: 1, wavelength: 4 }], names: true },
    needsVisual: true,
    ...label(longi ? "Longitudinal, like sound" : "Transverse, like light", [longi ? "Transverse, like light" : "Longitudinal, like sound", "Standing wave", "Not a wave"]),
    hint: "Longitudinal: compressions and rarefactions, vibrating along the direction of travel. Transverse: crests and troughs, vibrating across it.",
    explain: longi ? "Compressions and rarefactions: the particles vibrate along the direction the wave travels (sound, P-waves)." : "Crests and troughs: the vibration is at right angles to the travel (light, waves on a rope, S-waves).",
  });
}

export function waveSpeed(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const f = pick([2, 4, 5, 10, 50, 100]);
    const lam = pick([0.5, 1.5, 2, 3, 4]);
    return mk({
      key: `ws-v-${f}-${lam}`,
      prompt: `A wave has frequency ${f} Hz and wavelength ${lam} m. How fast does it travel?`,
      visual: { kind: "phys-wave", length: 8, waves: [{ amplitude: 1, wavelength: 4 }], travel: "v = ?" },
      unit: "m/s",
      ...keypad(clean(f * lam), [clean(f / lam), clean(lam / f)]),
      hint: "v = fλ.",
      explain: `v = ${f} × ${lam} = ${ds(f * lam)} m/s.`,
    });
  }
  if (k === 1) {
    const f = pick([85, 170, 340, 680, 1700]);
    return mk({
      key: `ws-sound-${f}`,
      prompt: `Sound travels at 340 m/s in air. What is the wavelength of a ${f} Hz note?`,
      unit: "m",
      ...keypad(clean(340 / f), [clean(f / 340)]),
      hint: "λ = v ÷ f.",
      explain: `λ = 340 ÷ ${f} = ${ds(340 / f)} m.`,
    });
  }
  if (k === 2) {
    const f = pick([100, 150, 300, 600, 1000]);
    return mk({
      key: `ws-radio-${f}`,
      prompt: `A radio station broadcasts at ${f} MHz. Radio waves travel at 3.0 × 10⁸ m/s. What is the wavelength?`,
      unit: "m",
      ...keypad(clean(300 / f), [clean(f / 300), clean(3000 / f)]),
      hint: "λ = c ÷ f, with 1 MHz = 10⁶ Hz. So λ = 300 ÷ (f in MHz).",
      explain: `λ = 3.0 × 10⁸ ÷ (${f} × 10⁶) = ${ds(300 / f)} m.`,
    });
  }
  if (k === 3) {
    const v = pick([4, 6, 8, 10, 12]);
    const lam = pick([0.5, 1, 2, 4]);
    return mk({
      key: `ws-f-${v}-${lam}`,
      prompt: `Waves travel along a rope at ${v} m/s with a wavelength of ${lam} m. What is their frequency?`,
      unit: "Hz",
      ...keypad(clean(v / lam), [clean(v * lam)]),
      hint: "f = v ÷ λ.",
      explain: `f = ${v} ÷ ${lam} = ${ds(v / lam)} Hz.`,
    });
  }
  const lam0 = pick([2, 4, 6, 8]);
  const f = pick([2, 3, 0.5]);
  return mk({
    key: `ws-ratio-${lam0}-${f}`,
    prompt: `On the same rope (same wave speed), you shake ${f === 0.5 ? "half as often" : `${f} times as fast`}. The wavelength was ${lam0} m. What is it now?`,
    unit: "m",
    ...choose(clean(lam0 / f), [clean(lam0 * f), lam0], 0.5, 0),
    hint: "The speed is set by the rope. v = fλ stays fixed, so if f goes up, λ goes down.",
    explain: `λ = ${lam0} ÷ ${f} = ${ds(lam0 / f)} m.`,
  });
}

export function matchWave(): Question {
  const v = rand(0, 2);
  if (v === 0) {
    const A = pick([0.5, 1, 1.5, 2, 2.5, 3]);
    const lam = rand(2, 6);
    return act({
      key: `mw-al-${A}-${lam}`,
      prompt: `Make a wave with amplitude ${ds(A)} m and wavelength ${lam} m.`,
      activity: { kind: "phys-matchWave", length: 8, target: { amplitude: A, wavelength: lam }, amplitude: { min: 0.5, max: 3, step: 0.5 }, wavelength: { min: 1, max: 8, step: 1 } },
      answer: lam,
      hint: "Amplitude is the height from the middle to a crest; wavelength is crest to crest.",
      explain: `Amplitude ${ds(A)} m (middle to crest) and wavelength ${lam} m (crest to crest).`,
    });
  }
  if (v === 1) {
    const [speed, lam] = pick([[4, 1], [4, 2], [4, 4], [6, 1], [6, 2], [6, 3], [8, 2], [8, 4], [12, 2], [12, 3], [12, 4], [10, 2]] as [number, number][]);
    const f = speed / lam;
    return act({
      key: `mw-f-${speed}-${lam}`,
      prompt: `The waves travel at ${speed} m/s. Set the frequency to make a wavelength of ${lam} m.`,
      activity: { kind: "phys-matchWave", length: 8, target: { amplitude: 1, wavelength: lam }, frequency: { min: 1, max: 6, step: 1 }, speed },
      answer: f,
      hint: "f = v ÷ λ.",
      explain: `f = ${speed} ÷ ${lam} = ${f} Hz. A higher frequency would squeeze the waves closer together.`,
    });
  }
  const [speed, f] = pick([[4, 1], [4, 2], [6, 2], [6, 3], [8, 2], [8, 4], [12, 3], [12, 4], [10, 5], [6, 1]] as [number, number][]);
  const lam = speed / f;
  return act({
    key: `mw-l-${speed}-${f}`,
    prompt: `A wave on a spring travels at ${speed} m/s with frequency ${f} Hz. Set its wavelength.`,
    activity: { kind: "phys-matchWave", length: 8, target: { amplitude: 1, wavelength: lam }, wavelength: { min: 1, max: 8, step: 1 } },
    answer: lam,
    hint: "λ = v ÷ f.",
    explain: `λ = ${speed} ÷ ${f} = ${lam} m.`,
  });
}

export function media(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const f = pick([250, 500, 750, 1000, 1500]);
    return mk({
      key: `med-water-${f}`,
      prompt: `A ${f} Hz sound goes from air (340 m/s) into water (1500 m/s). What is its wavelength in water?`,
      unit: "m",
      ...keypad(clean(1500 / f), [clean(340 / f)]),
      hint: "The frequency stays the same at the boundary; the speed changes. λ = v ÷ f in the new medium.",
      explain: `In water λ = 1500 ÷ ${f} = ${ds(1500 / f)} m (in air it was ${r2(340 / f)} m).`,
    });
  }
  if (k === 1) {
    const [name, n] = pick([["water", 1.33], ["glass", 1.5], ["diamond", 2.42], ["oil", 1.47]] as [string, number][]);
    return mk({
      key: `med-light-${name}`,
      prompt: `Light travels at 3.00 × 10⁸ m/s in vacuum. How fast does it travel in ${name} (n = ${n})? Answer in units of 10⁸ m/s, to 2 decimal places.`,
      speech: `Light travels at 3 times 10 to the 8 meters per second in vacuum. How fast does it travel in ${name}, with refractive index ${n}? Answer in units of 10 to the 8 meters per second.`,
      unit: "× 10⁸ m/s",
      ...keypad(r2(3 / n)),
      hint: "v = c ÷ n.",
      explain: `v = 3.00 ÷ ${n} ≈ ${r2(3 / n)} × 10⁸ m/s.`,
    });
  }
  if (k === 2) {
    const v1 = pick([4, 6, 8]);
    const v2 = v1 / 2;
    const lam1 = pick([2, 4, 6]);
    return mk({
      key: `med-shallow-${v1}-${lam1}`,
      prompt: `Ocean waves move from deep water (${v1} m/s, wavelength ${lam1} m) into shallow water, where they slow to ${v2} m/s. What is their new wavelength?`,
      unit: "m",
      ...choose(lam1 / 2, [lam1, lam1 * 2], 0.5, 0),
      hint: "The frequency can't change (waves can't pile up or vanish at the boundary). So λ ∝ v.",
      explain: `f = ${v1} ÷ ${lam1} = ${ds(v1 / lam1)} Hz stays the same; λ = ${v2} ÷ ${ds(v1 / lam1)} = ${ds(lam1 / 2)} m.`,
    });
  }
  if (k === 3) {
    const t = pick([0.2, 0.4, 1, 2, 4]);
    return mk({
      key: `med-sonar-${t}`,
      prompt: `A ship's sonar pulse returns ${t} s after it was sent. Sound travels at 1500 m/s in seawater. How deep is the sea floor?`,
      unit: "m",
      ...keypad(clean(750 * t), [clean(1500 * t)]),
      hint: "The pulse goes down AND back up. Depth = speed × time ÷ 2.",
      explain: `Distance travelled = 1500 × ${t} = ${ds(1500 * t)} m; depth = half = ${ds(750 * t)} m.`,
    });
  }
  return card("med", [
    {
      p: "A wave passes from one medium into another. Which property stays the same?",
      a: "Frequency",
      w: ["Speed", "Wavelength", "Direction (always)"],
      h: "The source sets how many waves arrive each second.",
      e: "Every wave that arrives at the boundary goes through, so the number per second (frequency) doesn't change. Speed and wavelength do.",
    },
    {
      p: "Why does a straw look bent in a glass of water?",
      a: "Light changes speed and direction (refracts) as it leaves the water",
      w: ["The water bends the straw", "Light reflects off the glass", "Water magnifies only the bottom half"],
      h: "Light travels slower in water than in air.",
      e: "Light from the underwater part bends at the surface, so your eye traces it back to the wrong place.",
    },
  ]);
}

export function refraction(): Question {
  const k = rand(0, 4);
  const mats: [string, number][] = [["water", 1.33], ["glass", 1.5], ["diamond", 2.42]];
  if (k === 0) {
    const [name, n] = pick(mats);
    const a = pick([20, 30, 40, 45, 50, 60]);
    const r = Math.round((Math.asin(sinD(a) / n) * 180) / Math.PI);
    return mk({
      key: `refr-snell-${name}-${a}`,
      prompt: `Light hits ${name} (n = ${n}) from air at ${a}° to the normal. What is the angle of refraction, to the nearest degree?`,
      visual: { kind: "phys-rays", scene: "refraction", angle: a, n1: 1, n2: n, top: "air", bottom: name, incident: a, refracted: "?" },
      unit: "°",
      ...keypad(r),
      hint: "Snell's law: n₁ sin θ₁ = n₂ sin θ₂, so sin θ₂ = sin θ₁ ÷ n₂.",
      explain: `sin θ₂ = sin ${a}° ÷ ${n} = ${(sinD(a) / n).toFixed(3)}, so θ₂ ≈ ${r}°. It bends toward the normal because light slows down.`,
    });
  }
  if (k === 1) {
    const [name, n] = pick(mats);
    const intoDense = rand(0, 1) === 1;
    const a = intoDense ? pick([30, 40, 50, 60]) : pick([10, 15, 20]);
    return mk({
      key: `refr-bend-${name}-${intoDense}-${a}`,
      prompt: `Light goes from ${intoDense ? `air into ${name}` : `${name} into air`}. Which way does it bend?`,
      visual: { kind: "phys-rays", scene: "refraction", angle: a, n1: intoDense ? 1 : n, n2: intoDense ? n : 1, top: intoDense ? "air" : name, bottom: intoDense ? name : "air", incident: a },
      ...label(intoDense ? "Toward the normal" : "Away from the normal", [intoDense ? "Away from the normal" : "Toward the normal", "It doesn't bend", "It always reflects"]),
      hint: "Slowing down bends light toward the normal; speeding up bends it away.",
      explain: intoDense ? `Light slows in ${name}, so it bends toward the normal.` : "Light speeds up in air, so it bends away from the normal.",
    });
  }
  if (k === 2) {
    const [name, n] = pick(mats);
    const C = Math.round((Math.asin(1 / n) * 180) / Math.PI);
    return mk({
      key: `refr-crit-${name}`,
      prompt: `What is the critical angle for light going from ${name} (n = ${n}) into air, to the nearest degree?`,
      unit: "°",
      ...keypad(C),
      hint: "At the critical angle the refracted ray skims the surface (90°): sin C = 1 ÷ n.",
      explain: `sin C = 1 ÷ ${n} = ${(1 / n).toFixed(3)}, so C ≈ ${C}°. Beyond that, all the light reflects back inside.`,
    });
  }
  if (k === 3) {
    const [name, n] = pick(mats);
    const C = (Math.asin(1 / n) * 180) / Math.PI;
    const a = pick([15, 20, 30, 35, 45, 50, 60, 70].filter((x) => Math.abs(x - C) > 3));
    const tir = a > C;
    return mk({
      key: `refr-tir-${name}-${a}`,
      prompt: `Light inside ${name} (n = ${n}) hits the surface with air at ${a}° to the normal. What happens?`,
      visual: { kind: "phys-rays", scene: "refraction", angle: a, n1: n, n2: 1, top: name, bottom: "air", incident: a },
      needsVisual: false,
      ...label(tir ? "It all reflects back inside (total internal reflection)" : "Most of it escapes, bending away from the normal", [
        tir ? "Most of it escapes, bending away from the normal" : "It all reflects back inside (total internal reflection)",
        "It passes straight through without bending",
      ]),
      hint: "Find the critical angle (sin C = 1 ÷ n) and compare.",
      explain: `The critical angle is about ${Math.round(C)}°. ${a}° is ${tir ? "bigger, so the light is totally internally reflected" : "smaller, so the light can escape"}.`,
    });
  }
  return card("refr", [
    {
      p: "How does an optical fibre carry light around bends?",
      a: "Total internal reflection keeps bouncing the light along the core",
      w: ["The glass absorbs and re-emits it", "Mirrors are placed inside", "Light naturally curves in glass"],
      h: "The light hits the core's wall at a large angle.",
      e: "The light always meets the wall beyond the critical angle, so it reflects completely and zig-zags along, even around bends.",
    },
    {
      p: "Why does a swimming pool look shallower than it really is?",
      a: "Light from the bottom bends away from the normal",
      w: ["Water magnifies depth", "Light reflects off the surface", "The pool floor is tilted"],
      h: "Your brain assumes light travels in straight lines.",
      e: "Light speeds up leaving the water and bends away from the normal, so the bottom appears higher than it is.",
    },
    {
      p: "Diamonds sparkle more than glass because diamond has…",
      a: "a high refractive index, so a small critical angle",
      w: ["a low refractive index", "no refraction at all", "a mirror coating"],
      h: "n = 2.42 for diamond, 1.5 for glass.",
      e: "Diamond's critical angle is only about 24°, so light reflects around inside many times before escaping.",
    },
  ]);
}

export function interference(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const a1 = pick([0.5, 1, 1.5]);
    const a2 = pick([0.5, 1, 1.5, 2]);
    const inPhase = rand(0, 1) === 1;
    const ans = inPhase ? a1 + a2 : Math.abs(a1 - a2);
    return mk({
      key: `int-add-${a1}-${a2}-${inPhase}`,
      prompt: `Two waves with amplitudes ${a1} m and ${a2} m meet ${inPhase ? "in step (crest on crest)" : "out of step (crest on trough)"}. What is the amplitude where they overlap?`,
      visual: inPhase ? { kind: "phys-wave", length: 8, waves: [{ amplitude: a1, wavelength: 4, label: "1" }, { amplitude: a2, wavelength: 4, label: "2" }], grid: true } : undefined,
      unit: "m",
      ...keypad(ans, [inPhase ? Math.abs(a1 - a2) : a1 + a2]),
      hint: "Superposition: displacements add. Crest + crest adds up; crest + trough cancels.",
      explain: inPhase ? `Constructive interference: ${a1} + ${a2} = ${ds(ans)} m.` : `Destructive interference: |${a1} − ${a2}| = ${ds(ans)} m.`,
    });
  }
  if (k === 1) {
    const lam = pick([2, 4, 500, 600]);
    const nm = lam > 10;
    const n = rand(0, 3);
    const half = rand(0, 1) === 1;
    const diff = clean((n + (half ? 0.5 : 0)) * lam);
    const u = nm ? "nm" : "m";
    return mk({
      key: `int-path-${lam}-${n}-${half}`,
      prompt: `Two speakers (or slits) send waves of wavelength ${lam} ${u}. At a point, one path is ${diff} ${u} longer than the other. What do you get there?`,
      ...label(half ? "Destructive: quiet or dark" : "Constructive: loud or bright", [half ? "Constructive: loud or bright" : "Destructive: quiet or dark", "Nothing: waves can't overlap"]),
      hint: "Path difference a whole number of wavelengths → crests line up. A half-wavelength extra → crest meets trough.",
      explain: `${diff} ÷ ${lam} = ${ds(diff / lam)} wavelengths: ${half ? "a half-number, so they cancel" : "a whole number, so they reinforce"}.`,
    });
  }
  if (k === 2) {
    const lam = pick([400, 500, 600, 700]);
    const L = pick([1, 2]);
    const d = pick([0.1, 0.2, 0.5]);
    const y = r1((lam * L) / d / 1000);
    return mk({
      key: `int-slit-${lam}-${L}-${d}`,
      prompt: `Light of wavelength ${lam} nm shines through two slits ${d} mm apart onto a screen ${L} m away. How far apart are the bright fringes, in mm? (spacing = λL ÷ d) Round to 1 decimal place.`,
      unit: "mm",
      ...keypad(y),
      hint: "Convert: λ in m (× 10⁻⁹) and d in m (× 10⁻³). Then multiply the answer by 1000 for mm.",
      explain: `${lam} × 10⁻⁹ × ${L} ÷ (${d} × 10⁻³) = ${sci((lam * 1e-9 * L) / (d * 1e-3))} m ≈ ${y} mm.`,
    });
  }
  return card("int", [
    {
      p: "Young's double-slit experiment shows bright and dark stripes. What does this prove about light?",
      a: "Light behaves as a wave (it interferes)",
      w: ["Light is made of particles only", "Light travels in straight lines only", "Light is a sound wave"],
      h: "Only waves can cancel each other out.",
      e: "Dark stripes mean light plus light can make darkness: destructive interference. That's wave behaviour.",
    },
    {
      p: "How do noise-cancelling headphones work?",
      a: "They play a sound wave that is the exact opposite of the noise",
      w: ["They block all air", "They play louder music", "They absorb sound in foam only"],
      h: "Crest + trough = …",
      e: "A microphone picks up the noise and the speaker plays an inverted copy. Destructive interference cancels much of it.",
    },
    {
      p: "Why do soap bubbles show colours?",
      a: "Light reflecting off the front and back of the film interferes",
      w: ["The soap is dyed", "The bubble emits light", "Air inside is coloured"],
      h: "Two reflections, slightly different path lengths.",
      e: "For each thickness, some colours reinforce and others cancel, so you see swirling colours: thin-film interference.",
    },
  ]);
}

export function photons(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const f = pick([4, 5, 6, 7.5, 10, 30]);
    const E = 6.63e-34 * f * 1e14;
    return mk({
      key: `ph-E-${f}`,
      prompt: `What is the energy of one photon of frequency ${f} × 10¹⁴ Hz? (E = hf, h = 6.63 × 10⁻³⁴ J·s)`,
      ...label(`${sci(E)} J`, [`${sci(E * 1e14)} J`, `${sci(E / 10)} J`, `${sci(E * 10)} J`]),
      hint: "Multiply 6.63 × f, then add the powers of 10: −34 + 14.",
      explain: `E = 6.63 × 10⁻³⁴ × ${f} × 10¹⁴ ≈ ${sci(E)} J.`,
    });
  }
  if (k === 1) {
    const lam = pick([400, 500, 620, 700, 310, 248]);
    const E = r2(1240 / lam);
    return mk({
      key: `ph-ev-${lam}`,
      prompt: `What is the energy of a ${lam} nm photon, in electronvolts? (E = 1240 ÷ λ in nm) Round to 2 decimal places.`,
      unit: "eV",
      ...keypad(E),
      hint: "Shorter wavelength → higher frequency → more energy per photon.",
      explain: `E = 1240 ÷ ${lam} ≈ ${E} eV.`,
    });
  }
  if (k === 2) {
    const [metal, W] = pick([["sodium", 2.3], ["potassium", 2.2], ["zinc", 4.3], ["calcium", 2.9]] as [string, number][]);
    const E = pick([1.8, 2.5, 3.1, 4.0, 5.0, 6.2]);
    const ejects = E > W;
    if (rand(0, 1) === 0 || !ejects)
      return mk({
        key: `ph-pe-yn-${metal}-${E}`,
        prompt: `${metal[0].toUpperCase()}${metal.slice(1)} needs at least ${W} eV to free an electron. Light with ${E} eV photons shines on it. Are electrons ejected?`,
        ...label(ejects ? "Yes" : "No, however bright the light", [ejects ? "No, however bright the light" : "Yes", "Only if the light is very bright"]),
        hint: "One photon gives its energy to one electron. Is one photon enough?",
        explain: ejects ? `${E} eV > ${W} eV, so each photon can free an electron.` : `${E} eV < ${W} eV: no single photon has enough, and brighter light just means more too-weak photons.`,
      });
    return mk({
      key: `ph-pe-ke-${metal}-${E}`,
      prompt: `${metal[0].toUpperCase()}${metal.slice(1)} needs ${W} eV to free an electron. Photons of ${E} eV hit it. What is the most kinetic energy an ejected electron can have?`,
      unit: "eV",
      ...keypad(r1(E - W), [r1(E + W)]),
      hint: "Photon energy = energy to escape + leftover kinetic energy.",
      explain: `Max KE = ${E} − ${W} = ${r1(E - W)} eV.`,
    });
  }
  if (k === 3) {
    const f = pick([2, 3, 0.5]);
    const E0 = pick([2, 3, 4]);
    const byLam = rand(0, 1) === 1;
    const E1 = byLam ? clean(E0 / f) : clean(E0 * f);
    return mk({
      key: `ph-scale-${f}-${E0}-${byLam}`,
      prompt: `A photon has ${E0} eV. Another has ${byLam ? "a wavelength" : "a frequency"} ${f === 0.5 ? "half as big" : `${f} times as big`}. What is its energy?`,
      unit: "eV",
      ...choose(E1, [byLam ? E0 * f : E0 / f, E0].map(clean), 0.5, 0),
      hint: "E = hf = hc ÷ λ. Energy goes up with frequency and down with wavelength.",
      explain: `E ${byLam ? "∝ 1/λ" : "∝ f"}, so ${E0} ${byLam ? "÷" : "×"} ${f} = ${ds(E1)} eV.`,
    });
  }
  return card("ph", [
    {
      p: "Very bright red light frees no electrons from a metal, but dim blue light does. What does this show?",
      a: "Light comes in packets (photons) whose energy depends on frequency",
      w: ["Red light is a wave but blue is not", "Brightness doesn't matter for anything", "The metal prefers blue"],
      h: "A brighter wave should carry more energy… unless energy comes in lumps.",
      e: "Each photon delivers E = hf to one electron. Red photons are each too weak, however many there are; each blue photon has enough.",
    },
    {
      p: "Making light brighter (same colour) means…",
      a: "more photons per second, each with the same energy",
      w: ["each photon has more energy", "the photons travel faster", "the wavelength gets shorter"],
      h: "Colour sets the photon energy.",
      e: "Brightness is the number of photons; the energy per photon is set by the frequency (colour).",
    },
    {
      p: "So is light a wave or a particle?",
      a: "Both: it interferes like a wave and is absorbed in photon-sized lumps",
      w: ["Only a wave", "Only a particle", "Neither: it's a kind of heat"],
      h: "Think of the double-slit experiment and the photoelectric effect.",
      e: "Interference needs a wave model; the photoelectric effect needs a particle (photon) model. Physicists use whichever model fits the situation.",
    },
  ]);
}

const SPECTRUM = ["radio waves", "microwaves", "infrared", "visible light", "ultraviolet", "X-rays", "gamma rays"];

export function spectrumOrder(): Question {
  const n = rand(5, 6);
  const idx = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, n).sort((x, y) => x - y);
  const items = idx.map((i) => SPECTRUM[i]);
  const dirs = [
    ["lowest frequency first", false],
    ["longest wavelength first", false],
    ["highest photon energy first", true],
    ["shortest wavelength first", true],
  ] as [string, boolean][];
  const [direction, rev] = pick(dirs);
  const ordered = rev ? [...items].reverse() : items;
  return act({
    key: `spec-${idx.join("")}-${direction.slice(0, 9)}`,
    prompt: `Put these parts of the electromagnetic spectrum in order: ${direction}.`,
    activity: { kind: "order", items: ordered, direction },
    answer: ordered.length,
    hint: "From low to high frequency: radio, micro, infrared, visible, ultraviolet, X-ray, gamma. Wavelength runs the opposite way.",
    explain: `${ordered.join(" → ")}. Higher frequency means shorter wavelength and more energy per photon.`,
  });
}

export function radiationHealth(): Question {
  const k = rand(0, 3);
  if (k === 0) {
    const f = pick([2, 3, 4, 0.5]);
    const D0 = pick([16, 36, 64, 80]);
    return mk({
      key: `rh-inv-${f}-${D0}`,
      prompt: `A radiographer gets ${D0} units of X-ray exposure per hour standing near a source. Standing ${f === 0.5 ? "half as far away" : `${f} times as far away`}, what would she get?`,
      unit: "units",
      ...choose(clean(D0 / (f * f)), [D0 / f, D0 * f].map(clean), 1, 0),
      hint: "Radiation from a small source spreads out: intensity ∝ 1 ÷ distance².",
      explain: `${D0} ÷ ${f}² = ${ds(D0 / (f * f))} units. Distance is one of the simplest protections.`,
    });
  }
  if (k === 1) {
    const lam = pick([50, 100, 120, 200, 300, 500, 1000]);
    const E = 1240 / lam;
    const ion = E >= 10;
    return mk({
      key: `rh-ion-${lam}`,
      prompt: `Knocking an electron out of an atom in your cells needs about 10 eV. Can one ${lam} nm photon (E = 1240 ÷ λ eV) do it?`,
      ...label(ion ? "Yes: it's ionizing" : "No: it's non-ionizing", [ion ? "No: it's non-ionizing" : "Yes: it's ionizing", "Only if there are lots of them"]),
      hint: "Work out the photon's energy and compare with 10 eV. One photon acts on one electron.",
      explain: `E = 1240 ÷ ${lam} ≈ ${r1(E)} eV, which is ${ion ? "more" : "less"} than 10 eV.`,
    });
  }
  return card("rh", [
    {
      p: "Why can too much UV light cause skin cancer, while visible light doesn't?",
      a: "UV photons have enough energy to damage DNA",
      w: ["UV is hotter than visible light", "UV travels faster", "Visible light is blocked by skin"],
      h: "Compare the energy of each photon.",
      e: "UV has higher frequency, so each photon carries enough energy to break bonds in DNA, which can lead to mutations.",
    },
    {
      p: "Why does an X-ray image show bones as white shapes?",
      a: "Bone absorbs X-rays; soft tissue lets most through",
      w: ["Bones glow under X-rays", "X-rays bounce off skin", "Bones reflect visible light"],
      h: "The film darkens where X-rays reach it.",
      e: "Dense bone absorbs more X-rays, leaving a pale 'shadow' on the detector; soft tissue lets them pass and darken it.",
    },
    {
      p: "How does a microwave oven heat food?",
      a: "Microwaves make water molecules rotate and jostle, warming the food",
      w: ["They make the food radioactive", "They ionize the food's atoms", "They heat the air in the oven"],
      h: "Microwave photons are low-energy and non-ionizing.",
      e: "Water molecules are polar; the changing field twists them back and forth, and that motion spreads as thermal energy.",
    },
    {
      p: "Why do radiographers stand behind a lead screen?",
      a: "Lead absorbs X-rays, cutting their ionizing dose",
      w: ["Lead reflects the X-rays back to the patient", "Lead makes X-rays visible", "Lead slows X-rays down"],
      h: "Repeated small doses add up over a career.",
      e: "Dense lead absorbs X-ray photons, protecting staff who would otherwise be exposed many times a day.",
    },
    {
      p: "Phones and wifi use microwaves/radio waves. Why aren't they thought to cause cancer the way X-rays can?",
      a: "Their photons are far too low in energy to ionize atoms",
      w: ["They're too slow", "They can't pass through skin at all", "They're sound waves"],
      h: "Compare photon energies: radio ≪ visible ≪ UV ≪ X-ray.",
      e: "Radio and microwave photons are millions of times weaker than the ~10 eV needed to ionize, so they can only gently warm tissue.",
    },
  ]);
}

const RAD_POOL: [string, number][] = [
  ["gamma rays", 0],
  ["X-rays", 0],
  ["UV-C from a germ lamp", 0],
  ["radio waves", 1],
  ["microwaves", 1],
  ["visible light", 1],
  ["infrared", 1],
  ["wifi signals", 1],
  ["phone signals", 1],
];

export function radiationSort(): Question {
  const a = shuffle(RAD_POOL.filter((p) => p[1] === 0)).slice(0, rand(2, 3));
  const b = shuffle(RAD_POOL.filter((p) => p[1] === 1)).slice(0, rand(3, 4));
  const items = shuffle([...a, ...b]);
  return act({
    key: `rsort-${items.map((i) => RAD_POOL.indexOf(i)).sort((x, y) => x - y).join("_")}`,
    prompt: "Sort the radiation: can its photons ionize atoms and damage DNA?",
    activity: { kind: "sort", bins: ["Ionizing", "Non-ionizing"], items: items.map(([label, bin]) => ({ label, bin })) },
    answer: a.length,
    hint: "Only the high-frequency end of the spectrum (far UV, X-rays, gamma) has enough energy per photon to ionize.",
    explain: `Ionizing: ${a.map((x) => x[0]).join(", ")}. Non-ionizing: ${b.map((x) => x[0]).join(", ")}.`,
  });
}

export function digital(): Question {
  const k = rand(0, 5);
  if (k === 0) {
    const n = rand(1, 10);
    return mk({
      key: `dig-levels-${n}`,
      prompt: `How many different values can ${n} bit${n > 1 ? "s" : ""} store?`,
      ...keypad(2 ** n, [2 * n, n * n]),
      hint: "Each bit doubles the number of patterns: 2ⁿ.",
      explain: `2^${n} = ${2 ** n} different values.`,
    });
  }
  if (k === 1) {
    const N = pick([3, 5, 10, 16, 26, 50, 100, 256, 1000]);
    const bits = Math.ceil(Math.log2(N));
    return mk({
      key: `dig-bits-${N}`,
      prompt: `What is the fewest bits needed to give ${N} different values a code each?`,
      ...keypad(bits, [bits + 1, bits - 1]),
      hint: "Find the smallest n with 2ⁿ ≥ " + N + ".",
      explain: `2^${bits - 1} = ${2 ** (bits - 1)} is too few; 2^${bits} = ${2 ** bits} is enough. So ${bits} bits.`,
    });
  }
  if (k === 2) {
    const MB = pick([5, 10, 25, 50, 100]);
    const rate = pick([10, 20, 40, 50, 100]);
    return mk({
      key: `dig-time-${MB}-${rate}`,
      prompt: `How long does a ${MB} MB file take to download at ${rate} Mb/s? (1 byte = 8 bits)`,
      unit: "s",
      ...keypad(clean((MB * 8) / rate), [clean(MB / rate)]),
      hint: "Convert megabytes to megabits (× 8), then time = size ÷ rate.",
      explain: `${MB} MB = ${MB * 8} Mb; ${MB * 8} ÷ ${rate} = ${ds((MB * 8) / rate)} s.`,
    });
  }
  if (k === 3) {
    const sps = pick([8000, 10000, 20000]);
    const bits = pick([8, 16]);
    const s = pick([2, 5, 10]);
    return mk({
      key: `dig-audio-${sps}-${bits}-${s}`,
      prompt: `A recorder takes ${sps.toLocaleString("en-US")} samples per second, ${bits} bits each. How many kilobits does ${s} s of sound need? (1 kilobit = 1000 bits)`,
      unit: "kb",
      ...keypad((sps * bits * s) / 1000),
      hint: "bits = samples per second × bits per sample × seconds.",
      explain: `${sps} × ${bits} × ${s} = ${(sps * bits * s).toLocaleString("en-US")} bits = ${(sps * bits * s) / 1000} kb.`,
    });
  }
  if (k === 4) {
    const aDig = rand(0, 1) === 1;
    const smooth = (t: number) => 5 + 3 * Math.sin(t * 1.3);
    const steps = (t: number) => (Math.floor(t) % 3 === 0 || Math.floor(t) % 5 === 1 ? 8 : 2);
    return mk({
      key: `dig-which-${aDig}`,
      prompt: "Which signal is digital?",
      visual: {
        kind: "plot",
        xLabel: "time",
        yLabel: "signal",
        x: [0, 10],
        y: [0, 10],
        curves: [
          { fn: aDig ? steps : smooth, colour: "wave" },
          { fn: aDig ? smooth : steps, colour: "berry" },
        ],
        points: [
          { x: 0.5, y: (aDig ? steps : smooth)(0.5), label: "A" },
          { x: 9.5, y: (aDig ? smooth : steps)(9.5), label: "B" },
        ],
      },
      needsVisual: true,
      ...label(aDig ? "A" : "B", [aDig ? "B" : "A", "Both", "Neither"]),
      hint: "A digital signal has only a few allowed levels (like 0 and 1); an analog one varies smoothly.",
      explain: `${aDig ? "A" : "B"} jumps between two levels, so it's digital (on/off, 1/0). The smooth one is analog.`,
    });
  }
  return card("dig", [
    {
      p: "Why does a digital signal survive noise better than an analog one?",
      a: "The receiver just tells 0 from 1 and rebuilds it",
      w: ["Digital signals travel faster", "Noise can't affect digital signals at all", "Digital signals are louder"],
      h: "Small wobbles don't change whether a level is 'high' or 'low'.",
      e: "As long as noise doesn't flip a bit, the receiver can restore perfect 0s and 1s. Analog noise gets copied and amplified along with the signal.",
    },
    {
      p: "What is a disadvantage of digital recording?",
      a: "Sampling misses what happens between samples",
      w: ["Copies get worse every time", "It can't be stored on computers", "It can't be sent by radio"],
      h: "A digital recording is a list of measurements taken at intervals.",
      e: "Between samples, detail is lost; more samples and more bits per sample reduce this, but make the files bigger.",
    },
    {
      p: "You copy a digital song 100 times, each from the last copy. The 100th copy is…",
      a: "identical to the original",
      w: ["much noisier", "quieter", "shorter"],
      h: "Copying numbers exactly is easy.",
      e: "Digital copies copy the exact bits, so there's no loss, unlike copying an analog tape again and again.",
    },
    {
      p: "Why can digital data be stored so compactly and searched so easily?",
      a: "It's just numbers, which can be compressed, indexed and error-checked",
      w: ["Digital files have no size", "It's stored as sound", "It doesn't need electricity"],
      h: "Computers are built to handle numbers.",
      e: "Data as bits can be compressed, copied, encrypted and checked for errors with simple maths, so huge amounts fit on small chips.",
    },
  ]);
}

export function waveDevices(): Question {
  const k = rand(0, 4);
  if (k === 0) {
    const [what, fGHz] = pick([["2.4 GHz wifi", 2.4], ["5 GHz wifi", 5], ["a 2.45 GHz microwave oven", 2.45], ["1.5 GHz GPS", 1.5], ["0.1 GHz (100 MHz) FM radio", 0.1]] as [string, number][]);
    const cm = r1(30 / fGHz);
    return mk({
      key: `dev-lam-${fGHz}`,
      prompt: `What is the wavelength of ${what}, in cm? (c = 3.0 × 10⁸ m/s) Round to 1 decimal place.`,
      unit: "cm",
      ...keypad(cm),
      hint: "λ = c ÷ f. With f in GHz, λ in cm = 30 ÷ f.",
      explain: `λ = 3.0 × 10⁸ ÷ (${fGHz} × 10⁹) = ${r2(0.3 / fGHz)} m ≈ ${cm} cm.`,
    });
  }
  if (k === 1) {
    const t = pick([65, 130, 260, 390]);
    const cm = r1(0.077 * t);
    return mk({
      key: `dev-us-${t}`,
      prompt: `An ultrasound echo returns ${t} μs after the pulse. Sound travels at 1540 m/s in tissue. How deep is the organ boundary, in cm?`,
      speech: `An ultrasound echo returns ${t} microseconds after the pulse. Sound travels at 1540 meters per second in tissue. How deep is the boundary, in centimeters?`,
      unit: "cm",
      ...keypad(cm, [r1(0.154 * t)]),
      hint: "Depth = speed × time ÷ 2 (there and back). 1 μs = 10⁻⁶ s.",
      explain: `1540 × ${t} × 10⁻⁶ ÷ 2 ≈ ${r2((1540 * t * 1e-6) / 2)} m = ${cm} cm.`,
    });
  }
  if (k === 2) {
    const t = pick([0.067, 0.07, 0.072, 0.075]);
    return mk({
      key: `dev-gps-${t}`,
      prompt: `A GPS signal takes ${t} s to reach your phone from the satellite. How far away is the satellite, in km? (c = 3.0 × 10⁵ km/s)`,
      unit: "km",
      ...keypad(Math.round(3e5 * t)),
      hint: "Distance = speed × time.",
      explain: `3.0 × 10⁵ × ${t} = ${Math.round(3e5 * t).toLocaleString("en-US")} km. GPS times signals from several satellites to find your position.`,
    });
  }
  if (k === 3) {
    const lam = pick([400, 700, 1000, 1500, 2000]);
    const E = 1240 / lam;
    const ok = E > 1.1;
    return mk({
      key: `dev-solar-${lam}`,
      prompt: `A silicon solar cell needs photons of at least 1.1 eV to free an electron. Can ${lam} nm light (E = 1240 ÷ λ eV) power it?`,
      ...label(ok ? "Yes" : "No", [ok ? "No" : "Yes"]),
      hint: "Find the photon energy and compare with 1.1 eV.",
      explain: `E = 1240 ÷ ${lam} ≈ ${r2(E)} eV, ${ok ? "enough" : "not enough"} to free an electron in silicon.`,
    });
  }
  return card("dev", [
    {
      p: "How does a solar cell turn light into electricity?",
      a: "Photons free electrons in a semiconductor, which flow as a current",
      w: ["Sunlight heats water to spin a turbine", "Light pushes a magnet past a coil", "It stores light like a battery"],
      h: "This is the photon (particle) model of light at work.",
      e: "Each photon with enough energy frees an electron; the cell's built-in electric field pushes those electrons around a circuit.",
    },
    {
      p: "An MRI scanner makes images of the inside of the body using…",
      a: "a strong magnetic field and radio waves",
      w: ["X-rays", "ultrasound", "gamma rays from a tracer"],
      h: "MRI = magnetic resonance imaging. It doesn't use ionizing radiation.",
      e: "The magnet lines up hydrogen nuclei; radio pulses tip them, and the radio signals they give back are turned into an image.",
    },
    {
      p: "Fibre-optic cables carry internet data as…",
      a: "pulses of light trapped by total internal reflection",
      w: ["electric current in copper", "radio waves through the air", "sound waves in glass"],
      h: "The light reflects along the glass core.",
      e: "Lasers flash light on and off (1s and 0s) down thin glass fibres; total internal reflection keeps it inside for many kilometres.",
    },
    {
      p: "Wifi, Bluetooth and phone networks all send data using…",
      a: "radio waves / microwaves (electromagnetic waves)",
      w: ["sound waves", "visible light", "electric current through the air"],
      h: "Their frequencies are around 1–5 GHz.",
      e: "They encode bits onto microwave-band radio waves, which travel at the speed of light and pass through walls.",
    },
  ]);
}
