/**
 * Question generators for AP Physics 1 (ages 16–18): kinematics, dynamics, energy, momentum, rotation,
 * oscillations and fluids. Worlds and levels are assembled in ./ages16to18ap1.ts.
 *
 * g = 9.8 m/s² everywhere. Numbers are chosen so answers come out clean: falls use h = 4.9t², speeds from a
 * drop use h = 0.1k² → v = 1.4k, and so on. When an answer can't be clean the question says how to round
 * or offers choices.
 */
import { bag, labelChoices, pick, rand, shuffle } from "../../questions";
import { balanceSolution, launchDistance } from "../../science/physicsValidate";
import type { ForceArrow } from "../../science/physicsTypes";
import type { Activity, Colour, Question, Visual } from "../../types";

/* =================================================================== helpers */

type Gen = () => Question;
type Ans = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra" | "activity">;
type Pt = [number, number];

const NONE: Visual = { kind: "none" };
export const G = 9.8;

/** Remove floating-point noise. */
export const clean = (x: number) => Math.round(x * 1e6) / 1e6;
/** Round to d decimal places. */
export const rd = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** A number as text: real minus sign, commas from 10,000. */
export function s(x: number): string {
  const c = clean(x);
  const a = Math.abs(c);
  const str = a >= 10000 && Number.isInteger(a) ? a.toLocaleString("en-US") : String(a);
  return c < 0 ? `−${str}` : str;
}

/** Hand out generators in a shuffled bag so a lesson mixes its question types. */
export function mix(...gens: Gen[]): Gen {
  const next = bag(gens);
  return () => next()();
}

const SAY: [RegExp, string][] = [
  [/kg·m²\/s/g, "kilogram meters squared per second"],
  [/kg·m²/g, "kilogram meters squared"],
  [/kg·m\/s/g, "kilogram meters per second"],
  [/N·m·s/g, "newton meter seconds"],
  [/N·s/g, "newton seconds"],
  [/N·m/g, "newton meters"],
  [/N\/cm/g, "newtons per centimeter"],
  [/N\/m/g, "newtons per meter"],
  [/rad\/s²/g, "radians per second squared"],
  [/rad\/s/g, "radians per second"],
  [/(\d) ?rad\b/g, "$1 radians"],
  [/kg\/m³/g, "kilograms per cubic meter"],
  [/g\/cm³/g, "grams per cubic centimeter"],
  [/m³\/s/g, "cubic meters per second"],
  [/cm³\/s/g, "cubic centimeters per second"],
  [/(\d) ?cm²/g, "$1 square centimeters"],
  [/(\d) ?m²/g, "$1 square meters"],
  [/(\d) ?cm³/g, "$1 cubic centimeters"],
  [/(\d) ?m³/g, "$1 cubic meters"],
  [/s²\/kg/g, "seconds squared per kilogram"],
  [/(\d) ?s²/g, "$1 seconds squared"],
  [/(\d) ?cm\b/g, "$1 centimeters"],
  [/(\d) ?km\b/g, "$1 kilometers"],
  [/(\d) ?m\b(?!\/)/g, "$1 meters"],
  [/(\d) ?s\b/g, "$1 seconds"],
  [/(\d) ?rev\b/g, "$1 revolutions"],
  [/(\d) ?atm\b/g, "$1 atmospheres"],
  [/\bx–t\b/g, "position-time"],
  [/\bv–t\b/g, "velocity-time"],
  [/\ba–t\b/g, "acceleration-time"],
  [/\bF–t\b/g, "force-time"],
  [/\bF–x\b/g, "force-position"],
  [/\bω–t\b/g, "omega-time"],
  [/\bτ–t\b/g, "torque-time"],
  [/μₖ/g, "mu k"],
  [/μₛ/g, "mu s"],
  [/μ/g, "mu"],
  [/τ/g, "tau"],
  [/ω/g, "omega"],
  [/α/g, "alpha"],
  [/ρ/g, "rho"],
  [/Σ/g, "the sum of "],
  [/½/g, "one half "],
  [/_/g, " "],
  [/·/g, " "],
];

/** On-screen physics text → words for the speech helper (which already reads m/s, N, J, Δ, °…). */
export function talk(text: string): string {
  return SAY.reduce((t, [re, w]) => t.replace(re, w), text);
}

interface Base {
  key: string;
  prompt: string;
  speech?: string;
  visual?: Visual;
  needsVisual?: boolean;
  unit?: string;
  hint: string;
  explain: string;
}

/** Tidy generated text: real minus signs, "1 unit", "an 8 kg", no brackets round a plain positive number. */
export function polish(text: string): string {
  return text
    .replace(/(^|[\s(=])-(\d)/g, "$1−$2")
    .replace(/\b1 units\b/g, "1 unit")
    .replace(/\b([Aa]) (?=(8\d*|11|18)(?![\d.]))/g, "$1n ")
    .replace(/([−+] )\((\d[\d.,]*)\)/g, "$1$2");
}

/** Assemble a question; speech defaults to the prompt read aloud. */
function q(b: Base, ans: Ans): Question {
  return {
    key: b.key,
    prompt: polish(b.prompt),
    speech: polish(b.speech ?? talk(b.prompt)),
    visual: b.visual ?? NONE,
    ...(b.needsVisual ? { needsVisual: true } : {}),
    ...(b.unit ? { unit: b.unit } : {}),
    hint: polish(b.hint),
    explain: polish(b.explain),
    ...ans,
  };
}

/** Number choices: the answer, likely mistakes, then neighbours `step` apart. */
function numChoices(answer: number, wrong: number[], step: number, min: number): number[] {
  const out: number[] = [answer];
  const add = (raw: number) => {
    const v = clean(raw);
    const tidy = Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6;
    if (out.length < 4 && tidy && Number.isFinite(v) && v >= min && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  };
  shuffle(wrong).forEach(add);
  for (let k = 1; out.length < 4 && k < 80; k++) shuffle([answer + k * step, answer - k * step]).forEach(add);
  return shuffle(out);
}

/** Pick a number from four. */
const ch = (a: number, wrong: number[], step = 1, min = -Infinity): Ans => {
  const v = clean(a);
  return { answer: v, input: "choices", choices: numChoices(v, wrong, step, min) };
};

/** Type the answer; a negative decimal (which the keypad can't type) becomes choices. */
const kp = (a: number, wrong: number[] = []): Ans => {
  const v = clean(a);
  if (v < 0 && !Number.isInteger(v)) return ch(v, wrong.length ? wrong : [-v, v / 2, v * 2], 0.5);
  if (v < 0) return { answer: v, input: "keypad", keypadExtra: "−" };
  if (!Number.isInteger(v)) return { answer: v, input: "keypad", keypadExtra: "." };
  return { answer: v, input: "keypad" };
};

/** A signed answer: whole numbers get a keypad with "−" (so the sign isn't given away). */
const sk = (a: number, wrong: number[] = []): Ans => {
  const v = clean(a);
  return Number.isInteger(v) ? { answer: v, input: "keypad", keypadExtra: "−" } : kp(v, wrong);
};

/** Text choices; the wrong ones are shuffled and the first three used. */
const lab = (correct: string, wrong: string[]): Ans => {
  const { choices, labels, answer } = labelChoices(correct, shuffle(wrong));
  return { answer, input: "choices", choices, labels };
};

/** Text choices keeping the wrong ones in priority order (the first three are used). */
const labFirst = (correct: string, wrong: string[]): Ans => {
  const { choices, labels, answer } = labelChoices(correct, wrong);
  return { answer, input: "choices", choices, labels };
};

const act = (activity: Activity, answer: number): Ans => ({ input: "activity", activity, answer: clean(answer) });

/** All orderings of a list. */
function perms<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/**
 * A ranking task: "B > A = C" from greatest to least (ties written with =, names in a tie sorted).
 * Wrong answers keep the same tie pattern so the pattern doesn't give the answer away.
 */
export function ranking(items: { name: string; value: number }[]): Ans {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const sizes: number[] = [];
  sorted.forEach((it, i) => {
    if (i > 0 && Math.abs(it.value - sorted[i - 1].value) < 1e-9) sizes[sizes.length - 1]++;
    else sizes.push(1);
  });
  const format = (names: string[]) => {
    const groups: string[] = [];
    let at = 0;
    for (const n of sizes) {
      groups.push(names.slice(at, at + n).sort().join(" = "));
      at += n;
    }
    return groups.join(" > ");
  };
  const correct = format(sorted.map((it) => it.name));
  const names = items.map((it) => it.name);
  const reverse = format([...sorted].reverse().map((it) => it.name));
  const allEqual = [...names].sort().join(" = ");
  const others = shuffle(perms(names).map(format)).filter((f) => f !== correct && f !== reverse);
  const strict = shuffle(perms(names).map((p) => p.join(" > ")));
  const wrong = [...new Set([reverse, ...(sizes.length > 1 ? [allEqual] : []), ...others, ...strict])].filter((f) => f !== correct);
  return labFirst(correct, wrong);
}

/** Straight segments joining the points. */
const polyline = (pts: Pt[], colour: Colour = "wave") => pts.slice(1).map((p, i) => ({ from: pts[i], to: p, colour }));

/** Linear interpolation through points with increasing x. */
export function interp(pts: Pt[]) {
  return (x: number) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      if (x <= x1 + 1e-9) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
  };
}

/** Area under a polyline from a to b: signed (displacement) or absolute (distance). Exact for straight pieces. */
export function areaUnder(pts: Pt[], a: number, b: number, absolute = false): number {
  const f = interp(pts);
  const xs = new Set<number>([a, b]);
  pts.forEach(([x]) => x > a && x < b && xs.add(x));
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (y0 * y1 < 0) {
      const z = x0 + (-y0 * (x1 - x0)) / (y1 - y0);
      if (z > a && z < b) xs.add(z);
    }
  }
  const sorted = [...xs].sort((u, v) => u - v);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const piece = ((f(sorted[i - 1]) + f(sorted[i])) / 2) * (sorted[i] - sorted[i - 1]);
    total += absolute ? Math.abs(piece) : piece;
  }
  return clean(total);
}

/** Axis titles from "v (m/s) vs t (s)": the y-axis first, then the x-axis. */
function axes(caption: string): { xLabel: string; yLabel: string } {
  const [yLabel, xLabel] = caption.split(" vs ");
  return { xLabel, yLabel };
}

/** A graph from straight segments, with axis titles from a caption like "v (m/s) vs t (s)". */
function graph(
  x: [number, number],
  y: [number, number],
  pts: Pt[],
  caption: string,
  more: { shade?: { from: number; to: number }; dots?: { x: number; y: number; label?: string }[]; extra?: Pt[][]; colour?: Colour } = {},
): Visual {
  const f = interp(pts);
  return {
    kind: "plot",
    x,
    y,
    ...axes(caption),
    lines: [...polyline(pts, more.colour ?? "wave"), ...(more.extra ?? []).flatMap((e) => polyline(e, "berry"))],
    ...(more.dots ? { points: more.dots } : {}),
    ...(more.shade ? { shade: { fn: f, from: more.shade.from, to: more.shade.to } } : {}),
  };
}

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
/** "A", "B", "C"… */
const LETTERS = ["A", "B", "C", "D", "E", "F"];

/* ======================================================= 1. Kinematics */

/** PHYS.1.1 — scalars and vectors: distance vs displacement, speed vs velocity, signs. */
export const vectors1D: Gen = mix(
  () => {
    let x0 = 0;
    let x1 = 0;
    let x2 = 0;
    do {
      x0 = rand(-8, 8);
      x1 = rand(-9, 9);
      x2 = rand(-9, 9);
    } while (Math.abs(x1 - x0) < 3 || Math.abs(x2 - x1) < 3 || x2 === x0 || Math.sign(x1 - x0) === Math.sign(x2 - x1));
    const askDist = Math.random() < 0.5;
    const disp = x2 - x0;
    const dist = Math.abs(x1 - x0) + Math.abs(x2 - x1);
    return q(
      {
        key: `v1d-track-${x0}-${x1}-${x2}-${askDist ? "d" : "x"}`,
        prompt: `A runner goes from dot 0 to dot 1, then turns back to dot 2. What is her ${askDist ? "total distance travelled" : "displacement (+ is to the right)"}?`,
        visual: { kind: "phys-motion", track: { min: -10, max: 10, step: 1, labelStep: 5, unit: "m" }, rows: [{ positions: [x0, x1, x2] }], times: true },
        needsVisual: true,
        unit: "m",
        hint: askDist ? "Distance adds up every metre run, whichever way she goes." : "Displacement only cares about the start and the finish: x_final − x_initial.",
        explain: askDist
          ? `${Math.abs(x1 - x0)} m out plus ${Math.abs(x2 - x1)} m back = ${dist} m. Distance is a scalar, so it is never negative.`
          : `Δx = ${s(x2)} − (${s(x0)}) = ${s(disp)} m. The turn-around doesn't matter; only where she starts and ends.`,
      },
      askDist ? kp(dist) : sk(disp),
    );
  },
  () => {
    const vectors = ["velocity", "displacement", "acceleration", "force", "momentum", "impulse"];
    const scalars = ["speed", "distance", "time", "mass", "kinetic energy", "work", "power"];
    const wantVector = Math.random() < 0.5;
    const right = pick(wantVector ? vectors : scalars);
    const wrongs = shuffle(wantVector ? scalars : vectors).slice(0, 3);
    return q(
      {
        key: `v1d-kind-${wantVector ? "v" : "s"}-${right}-${wrongs.join("")}`,
        prompt: `Which one of these is a ${wantVector ? "vector" : "scalar"}?`,
        hint: "A vector has a direction (it can be negative in 1D). A scalar is just a size.",
        explain: `${cap(right)} is a ${wantVector ? "vector: it has a direction as well as a size" : "scalar: it has a size but no direction"}. ${wantVector ? `${cap(wrongs[0])} is a scalar.` : `${cap(wrongs[0])} is a vector.`}`,
      },
      lab(right, wrongs),
    );
  },
  () => {
    const T = pick([10, 20, 25, 40, 50]);
    const d1 = rand(4, 12) * 10;
    const d2 = rand(1, d1 / 10 - 1) * 10;
    const t1 = rand(2, T - 2);
    const askSpeed = Math.random() < 0.5;
    const speed = (d1 + d2) / T;
    const vel = (d1 - d2) / T;
    return q(
      {
        key: `v1d-avg-${d1}-${d2}-${T}-${t1}-${askSpeed}`,
        prompt: `A cyclist rides ${d1} m east in ${t1} s, then ${d2} m west in ${T - t1} s. What is her average ${askSpeed ? "speed" : "velocity (east is +)"}?`,
        unit: "m/s",
        hint: askSpeed ? "Average speed = total distance ÷ total time." : "Average velocity = displacement ÷ total time. West counts as negative.",
        explain: askSpeed
          ? `Distance = ${d1} + ${d2} = ${d1 + d2} m in ${T} s, so ${s(d1 + d2)} ÷ ${T} = ${s(speed)} m/s.`
          : `Displacement = ${d1} − ${d2} = ${d1 - d2} m in ${T} s, so ${d1 - d2} ÷ ${T} = ${s(vel)} m/s east. It's smaller than the average speed because she turned back.`,
      },
      kp(askSpeed ? speed : vel),
    );
  },
  () => {
    const [pos, neg] = pick([
      ["east", "west"],
      ["right", "left"],
      ["north", "south"],
      ["up", "down"],
    ]);
    const movingPos = Math.random() < 0.5;
    const speeding = Math.random() < 0.5;
    const vSign = movingPos ? "+" : "−";
    const aSign = speeding ? vSign : movingPos ? "−" : "+";
    const correct = `v ${vSign}, a ${aSign}`;
    return q(
      {
        key: `v1d-signs-${pos}-${movingPos}-${speeding}`,
        prompt: `${cap(pos)} is positive. A car moves ${movingPos ? pos : neg} and is ${speeding ? "speeding up" : "slowing down"}. What are the signs of its velocity and acceleration?`,
        hint: "Velocity points the way it moves. Acceleration points the same way when speeding up, the opposite way when slowing down.",
        explain: `Moving ${movingPos ? pos : neg} makes v ${vSign}. ${speeding ? "Speeding up means a points the same way as v" : "Slowing down means a points opposite to v"}, so a is ${aSign}.`,
      },
      lab(correct, ["v +, a +", "v +, a −", "v −, a +", "v −, a −"]),
    );
  },
);

/** PHYS.1.2 — average velocity and acceleration; motion diagrams. */
export const velocityAcceleration: Gen = mix(
  () => {
    const dt = pick([2, 4, 5]);
    let v1 = 0;
    let v2 = 0;
    do {
      v1 = rand(-12, 12);
      v2 = rand(-12, 12);
    } while (Math.abs(v2 - v1) < 3);
    const a = (v2 - v1) / dt;
    return q(
      {
        key: `va-acc-${v1}-${v2}-${dt}`,
        prompt: `A cart's velocity changes from ${s(v1)} m/s to ${s(v2)} m/s in ${dt} s. What is its average acceleration?`,
        unit: "m/s²",
        hint: "a = Δv ÷ Δt = (v_final − v_initial) ÷ Δt. Keep the signs.",
        explain: `a = (${s(v2)} − (${s(v1)})) ÷ ${dt} = ${s(v2 - v1)} ÷ ${dt} = ${s(a)} m/s².`,
      },
      sk(a, [-a, (v2 + v1) / dt, (Math.abs(v2) - Math.abs(v1)) / dt]),
    );
  },
  () => {
    const type = pick(["up", "down", "const"] as const);
    const right = Math.random() < 0.5;
    const base = pick([1, 2]);
    const gaps = type === "up" ? [base, base + 1, base + 2, base + 3] : type === "down" ? [base + 3, base + 2, base + 1, base] : [3, 3, 3, 3];
    const p0 = rand(0, 2);
    const pos: number[] = [p0];
    gaps.forEach((g) => pos.push(pos[pos.length - 1] + g));
    const positions = right ? pos : pos.map((p) => 20 - p);
    const askA = Math.random() < 0.5;
    const dir = right ? "right" : "left";
    const other = right ? "left" : "right";
    const motion = type === "const" ? "constant velocity" : type === "up" ? "speeding up" : "slowing down";
    const aDir = type === "const" ? "zero" : type === "up" ? `to the ${dir}` : `to the ${other}`;
    return q(
      {
        key: `va-strobe-${type}-${right}-${base}-${p0}-${askA}`,
        prompt: askA ? "The dots show a puck every 0.5 s. Which way does its acceleration point?" : "The dots show a puck every 0.5 s. Which describes its motion?",
        visual: { kind: "phys-motion", track: { min: 0, max: 20, step: 1, labelStep: 5, unit: "m" }, rows: [{ positions }], times: true },
        needsVisual: true,
        hint: "Follow the dots in time order. Bigger gaps mean faster. Acceleration points the way the velocity is changing.",
        explain: `It moves ${dir} and the gaps ${type === "const" ? "stay the same" : type === "up" ? "grow" : "shrink"}, so it is ${motion}. ${type === "const" ? "No change in velocity means a = 0." : `Its acceleration points ${aDir}.`}`,
      },
      askA
        ? lab(aDir, ["to the right", "to the left", "zero"])
        : lab(`${motion}, moving ${dir}`, [
            `speeding up, moving ${other}`,
            `slowing down, moving ${dir}`,
            `slowing down, moving ${other}`,
            `speeding up, moving ${dir}`,
            `constant velocity, moving ${dir}`,
            `constant velocity, moving ${other}`,
          ]),
    );
  },
  () => {
    const t = pick([2, 4, 5, 10]);
    let x1 = 0;
    let x2 = 0;
    do {
      x1 = rand(-20, 30);
      x2 = rand(-20, 30);
    } while (Math.abs(x2 - x1) < 4);
    const v = (x2 - x1) / t;
    return q(
      {
        key: `va-vavg-${x1}-${x2}-${t}`,
        prompt: `A drone moves from x = ${s(x1)} m to x = ${s(x2)} m in ${t} s. What is its average velocity?`,
        unit: "m/s",
        hint: "v_avg = Δx ÷ Δt = (x_final − x_initial) ÷ Δt.",
        explain: `v_avg = (${s(x2)} − (${s(x1)})) ÷ ${t} = ${s(x2 - x1)} ÷ ${t} = ${s(v)} m/s.`,
      },
      sk(v, [-v, (x2 + x1) / t, Math.abs(x2) / t]),
    );
  },
  () => {
    const items = [
      {
        p: "A ball is thrown straight up. At the very top, which is true?",
        a: "v = 0 and a = 9.8 m/s² down",
        w: ["v = 0 and a = 0", "v = 9.8 m/s up and a = 0", "v = 0 and a = 9.8 m/s² up"],
        e: "At the top the ball stops for an instant, but gravity still pulls: a = 9.8 m/s² down the whole flight.",
      },
      {
        p: "Can an object have a negative acceleration and be speeding up?",
        a: "Yes, if it is moving in the negative direction",
        w: ["No, negative acceleration always means slowing down", "Only if its velocity is zero", "No, acceleration and speed can't both change"],
        e: "Speeding up means a points the same way as v. If v is negative, a negative a speeds it up.",
      },
      {
        p: "A car goes around a curve at a steady 20 m/s. Is it accelerating?",
        a: "Yes, its velocity's direction is changing",
        w: ["No, its speed is constant", "No, acceleration needs a speed change", "Only if it brakes"],
        e: "Velocity is a vector. Changing direction changes velocity, so the car accelerates (toward the centre).",
      },
      {
        p: "Object A goes from 0 to 10 m/s in 2 s. B goes from 20 to 30 m/s in 5 s. Which has the greater acceleration?",
        a: "A",
        w: ["B", "They are equal", "Can't tell without masses"],
        e: "A: 10 ÷ 2 = 5 m/s². B: 10 ÷ 5 = 2 m/s². Acceleration is how fast velocity changes, not how fast you go.",
      },
      {
        p: "An object's velocity is zero at one instant. What must be true of its acceleration then?",
        a: "Nothing: it can be anything",
        w: ["It must be zero", "It must be negative", "It must be at a maximum"],
        e: "v = 0 says nothing about how v is changing. A ball at the top of its throw has v = 0 and a = 9.8 m/s².",
      },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `va-concept-${i}`, prompt: it.p, hint: "Acceleration is the rate of change of velocity, a vector.", explain: it.e }, lab(it.a, it.w));
  },
);

/** Piecewise-linear x–t data with whole-number slopes. Returns points and the segments' slopes. */
function xtData() {
  for (;;) {
    const durs = [rand(2, 4), rand(2, 4), rand(2, 4)];
    const slopes = shuffle([pick([1, 2, 3]), pick([-1, -2, -3]), pick([0, 0, 1, -1, 2])]);
    const x0 = rand(0, 6);
    const pts: Pt[] = [[0, x0]];
    durs.forEach((d, i) => {
      const [t, x] = pts[pts.length - 1];
      pts.push([t + d, x + slopes[i] * d]);
    });
    if (pts.every(([, x]) => x >= 0 && x <= 16) && new Set(slopes.map(Math.abs)).size === 3) return { pts, slopes, durs };
  }
}

/** PHYS.1.3 — reading position–time graphs: slope is velocity. */
export const xtGraphs: Gen = mix(
  () => {
    const { pts, slopes } = xtData();
    const k = rand(0, 2);
    const [t0] = pts[k];
    const [t1] = pts[k + 1];
    return q(
      {
        key: `xt-slope-${pts.flat().join("_")}-${k}`,
        prompt: `This is an x–t graph. What is the velocity from t = ${t0} s to t = ${t1} s?`,
        visual: graph([0, 12], [0, 20], pts, "x (m) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "m/s",
        hint: "Velocity is the slope of an x–t graph: rise (Δx) over run (Δt). Downhill is negative.",
        explain: `From (${t0}, ${pts[k][1]}) to (${t1}, ${pts[k + 1][1]}): Δx = ${s(pts[k + 1][1] - pts[k][1])} m in ${t1 - t0} s, so v = ${s(slopes[k])} m/s.`,
      },
      sk(slopes[k]),
    );
  },
  () => {
    const { pts, slopes } = xtData();
    const fastest = slopes.map(Math.abs).indexOf(Math.max(...slopes.map(Math.abs)));
    const span = (i: number) => `${pts[i][0]} s to ${pts[i + 1][0]} s`;
    return q(
      {
        key: `xt-fastest-${pts.flat().join("_")}`,
        prompt: "During which time interval is the object moving fastest?",
        visual: graph([0, 12], [0, 20], pts, "x (m) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        hint: "Speed is the steepness of the x–t graph, uphill or downhill.",
        explain: `The steepest piece is ${span(fastest)}: |v| = ${Math.abs(slopes[fastest])} m/s. A downhill line is fast too; it just means moving the negative way.`,
      },
      lab(span(fastest), [0, 1, 2].filter((i) => i !== fastest).map(span)),
    );
  },
  () => {
    const { pts } = xtData();
    const T = pts[3][0];
    const v = (pts[3][1] - pts[0][1]) / T;
    return q(
      {
        key: `xt-avg-${pts.flat().join("_")}`,
        prompt: `What is the average velocity for the whole trip, from t = 0 to t = ${T} s? Round to 2 decimal places if needed.`,
        visual: graph([0, 12], [0, 20], pts, "x (m) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "m/s",
        hint: "Average velocity = (final position − first position) ÷ total time. The middle doesn't matter.",
        explain: `x goes from ${pts[0][1]} m to ${pts[3][1]} m in ${T} s: v_avg = ${s(pts[3][1] - pts[0][1])} ÷ ${T} = ${s(rd(v, 2))} m/s.`,
      },
      sk(rd(v, 2), [rd(-v, 2), rd(v + 0.5, 2), rd(v - 0.5, 2)]),
    );
  },
  () => {
    const c = pick([0.5, 1]);
    const t0 = pick([1, 2, 3]);
    const up = Math.random() < 0.5;
    // Up: x = ct² (speeding up). Down: x = 16c − c(4 − t)², slowing to a stop at t = 4.
    const f = (t: number) => (up ? c * t * t : 16 * c - c * (4 - t) * (4 - t));
    const slope = up ? 2 * c * t0 : 2 * c * (4 - t0);
    const y0 = f(t0);
    const tan: Pt[] = [
      [t0 - 1.5, y0 - 1.5 * slope],
      [t0 + 1.5, y0 + 1.5 * slope],
    ];
    const askV = Math.random() < 0.6;
    return q(
      {
        key: `xt-curve-${c}-${t0}-${up}-${askV}`,
        prompt: askV
          ? `The dashed line is tangent to the x–t curve at t = ${t0} s. What is the instantaneous velocity at t = ${t0} s?`
          : "This x–t curve bends. Is the object speeding up or slowing down?",
        visual: {
          kind: "plot", ...axes("x (m) vs t (s)"),
          x: [0, 5],
          y: [0, 20],
          curves: [{ fn: (t) => (t >= 0 && t <= 4.5 ? f(t) : NaN), colour: "wave" }],
          ...(askV ? { lines: [{ from: tan[0], to: tan[1], colour: "berry" as Colour, dashed: true }] } : {}),
          points: askV ? [{ x: t0, y: y0 }] : [],
        },
        needsVisual: true,
        ...(askV ? { unit: "m/s" } : {}),
        hint: askV ? "The slope of the tangent line is the velocity at that instant: pick two points on it." : "Slope is velocity. Is the curve getting steeper or flatter as time goes on?",
        explain: askV
          ? `The tangent rises ${s(3 * slope)} m over 3 s, so v = ${s(slope)} m/s at t = ${t0} s.`
          : up
            ? "The curve gets steeper (it bends upward), so the velocity grows: speeding up."
            : "The curve flattens out (it bends downward), so the velocity shrinks: slowing down.",
      },
      askV ? kp(slope) : lab(up ? "Speeding up" : "Slowing down", [up ? "Slowing down" : "Speeding up", "Constant velocity", "At rest"]),
    );
  },
);

/** Piecewise-linear v–t data with whole-number accelerations; may cross zero. */
function vtData(allowNegative: boolean) {
  for (;;) {
    const durs = [rand(2, 4), rand(2, 4), rand(2, 4)];
    const v0 = rand(0, 4);
    const pts: Pt[] = [[0, v0]];
    for (const d of durs) {
      const [t, v] = pts[pts.length - 1];
      pts.push([t + d, v + rand(-3, 3) * d]);
    }
    const vs = pts.map(([, v]) => v);
    const okRange = vs.every((v) => v <= 12 && v >= (allowNegative ? -8 : 0));
    const slopes = [1, 2, 3].map((i) => (pts[i][1] - pts[i - 1][1]) / (pts[i][0] - pts[i - 1][0]));
    const crosses = vs.some((v) => v < 0);
    // Zero crossings on half-seconds keep every area to two decimals.
    const halfCross = [1, 2, 3].every((i) => {
      const [t0, a] = pts[i - 1];
      const [t1, b] = pts[i];
      return a * b >= 0 || Number.isInteger(2 * (t0 + (a * (t1 - t0)) / (a - b)));
    });
    if (okRange && halfCross && new Set(slopes).size === 3 && (!allowNegative || crosses)) return { pts, slopes };
  }
}

/** PHYS.1.3 — velocity–time graphs: slope is acceleration, area is displacement. */
export const vtGraphs: Gen = mix(
  () => {
    const { pts, slopes } = vtData(false);
    const k = rand(0, 2);
    return q(
      {
        key: `vt-acc-${pts.flat().join("_")}-${k}`,
        prompt: `On this v–t graph, what is the acceleration from t = ${pts[k][0]} s to t = ${pts[k + 1][0]} s?`,
        visual: graph([0, 12], [0, 14], pts, "v (m/s) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "m/s²",
        hint: "Acceleration is the slope of a v–t graph: Δv ÷ Δt.",
        explain: `v goes from ${pts[k][1]} to ${pts[k + 1][1]} m/s in ${pts[k + 1][0] - pts[k][0]} s: a = ${s(slopes[k])} m/s².`,
      },
      sk(slopes[k]),
    );
  },
  () => {
    const { pts } = vtData(false);
    const a = pts[rand(0, 1)][0];
    const b = pts[3][0];
    const d = areaUnder(pts, a, b);
    return q(
      {
        key: `vt-area-${pts.flat().join("_")}-${a}`,
        prompt: `How far does the object travel from t = ${a} s to t = ${b} s? (The shaded area.)`,
        visual: graph([0, 12], [0, 14], pts, "v (m/s) vs t (s)", { shade: { from: a, to: b }, dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "m",
        hint: "Displacement is the area under a v–t graph. Split it into rectangles and triangles (or trapezoids).",
        explain: `Adding the trapezoids under the line from ${a} s to ${b} s gives ${s(d)} m.`,
      },
      kp(d),
    );
  },
  () => {
    const { pts } = vtData(true);
    const T = pts[3][0];
    const disp = areaUnder(pts, 0, T);
    const dist = areaUnder(pts, 0, T, true);
    const askDist = Math.random() < 0.5;
    return q(
      {
        key: `vt-neg-${pts.flat().join("_")}-${askDist}`,
        prompt: `Find the object's ${askDist ? "total distance travelled" : "displacement"} from t = 0 to t = ${T} s.`,
        visual: graph([0, 12], [-8, 12], pts, "v (m/s) vs t (s)", { shade: { from: 0, to: T }, dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "m",
        hint: askDist
          ? "Area below the axis is motion the negative way. For distance, count every area as positive."
          : "Area above the axis counts +, area below counts −. Add them.",
        explain: askDist
          ? `Adding the sizes of all the areas (above and below the axis) gives ${s(dist)} m. The displacement would be ${s(disp)} m.`
          : `Area above minus area below = ${s(disp)} m. (The distance, counting all areas as positive, is ${s(dist)} m.)`,
      },
      askDist ? kp(dist) : sk(disp, [dist, -disp, rd(disp + 2, 1)]),
    );
  },
  () => {
    let pts: Pt[] = [];
    let t: number | undefined;
    do {
      pts = vtData(true).pts;
      t = undefined;
      for (let i = 1; i < pts.length && t === undefined; i++) {
        const [t0, v0] = pts[i - 1];
        const [t1, v1] = pts[i];
        if (v0 * v1 < 0) t = clean(t0 + (v0 * (t1 - t0)) / (v0 - v1));
        else if (v1 === 0 && v0 !== 0 && i < pts.length - 1 && pts[i + 1][1] * v0 < 0) t = t1;
      }
    } while (t === undefined);
    return q(
      {
        key: `vt-turn-${pts.flat().join("_")}`,
        prompt: "At what time does the object first turn around (reverse direction)?",
        visual: graph([0, 12], [-8, 12], pts, "v (m/s) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "s",
        hint: "Direction is the sign of v. It turns around where the graph crosses the t-axis, not where the graph peaks.",
        explain: `The line crosses v = 0 at t = ${s(t)} s, so the velocity changes sign there.`,
      },
      kp(t),
    );
  },
);

/** PHYS.1.3 — acceleration–time graphs and matching graphs. */
export const atGraphs: Gen = mix(
  () => {
    const durs = [rand(2, 4), rand(2, 4)];
    const as = [pick([1, 2, 3]), pick([-1, -2, 0])];
    const v0 = rand(0, 5);
    const T = durs[0] + durs[1];
    const dv = as[0] * durs[0] + as[1] * durs[1];
    const lines = [
      { from: [0, as[0]] as Pt, to: [durs[0], as[0]] as Pt, colour: "grape" as Colour },
      { from: [durs[0], as[1]] as Pt, to: [T, as[1]] as Pt, colour: "grape" as Colour },
    ];
    const step = (t: number) => (t <= durs[0] ? as[0] : as[1]);
    return q(
      {
        key: `at-dv-${durs.join("")}-${as.join("_")}-${v0}`,
        prompt: `This a–t graph is for a cart moving at ${v0} m/s at t = 0. What is its velocity at t = ${T} s?`,
        visual: { kind: "plot", x: [0, 10], y: [-4, 4], ...axes("a (m/s²) vs t (s)"), lines, shade: { fn: step, from: 0, to: T } },
        needsVisual: true,
        unit: "m/s",
        hint: "The area under an a–t graph is the change in velocity. Add it to the starting velocity.",
        explain: `Δv = ${as[0]}×${durs[0]} + (${s(as[1])})×${durs[1]} = ${s(dv)} m/s, so v = ${v0} + (${s(dv)}) = ${s(v0 + dv)} m/s.`,
      },
      sk(v0 + dv),
    );
  },
  () => {
    const shapes = [
      { x: "a straight line sloping up", v: "a horizontal line above the t-axis", a: "zero" },
      { x: "a straight line sloping down", v: "a horizontal line below the t-axis", a: "zero" },
      { x: "a horizontal line", v: "a horizontal line on the t-axis (v = 0)", a: "zero" },
      { x: "a curve bending upward from the origin", v: "a straight line rising from the origin", a: "positive" },
      { x: "a rising curve that levels off", v: "a straight line falling to the t-axis", a: "negative" },
    ];
    const fns: ((t: number) => number)[] = [(t) => 2 + 1.5 * t, (t) => 14 - 1.5 * t, () => 8, (t) => 0.8 * t * t, (t) => 16 - 0.64 * (5 - t) * (5 - t)];
    const i = rand(0, shapes.length - 1);
    const askA = Math.random() < 0.35;
    const vLabels = [...new Set(shapes.map((sh) => sh.v))];
    return q(
      {
        key: `at-match-${i}-${askA}`,
        prompt: askA ? "Here is an object's x–t graph. What is the sign of its acceleration?" : "Here is an object's x–t graph. Which v–t graph matches it?",
        speech: askA ? "Here is an object's position-time graph. What is the sign of its acceleration?" : "Here is an object's position-time graph. Which velocity-time graph matches it?",
        visual: { kind: "plot", ...axes("x vs t"), x: [0, 6], y: [0, 20], curves: [{ fn: (t) => (t >= 0 && t <= 5 ? fns[i](t) : NaN), colour: "wave" }] },
        needsVisual: true,
        hint: askA ? "Bending upward (getting steeper) means v is increasing; bending downward means v is decreasing." : "Read the slope of the x–t graph at each moment: that's the height of the v–t graph.",
        explain: askA
          ? `The x–t graph is ${shapes[i].x}, so the acceleration is ${shapes[i].a}.`
          : `The x–t graph is ${shapes[i].x}. Its slope gives ${shapes[i].v} on the v–t graph.`,
      },
      askA ? lab(shapes[i].a, ["positive", "negative", "zero"]) : lab(shapes[i].v, vLabels.filter((l) => l !== shapes[i].v)),
    );
  },
  () => {
    const a = pick([-3, -2, 2, 3, 1.5, -1.5, 0.5]);
    const v0 = rand(-4, 6);
    const T = 4;
    const v1 = v0 + a * T;
    const correct = `a horizontal line at a = ${s(a)} m/s²`;
    return q(
      {
        key: `at-fromvt-${a}-${v0}`,
        prompt: `A v–t graph is a straight line from ${s(v0)} m/s at t = 0 to ${s(v1)} m/s at t = ${T} s. What does the a–t graph look like?`,
        visual: graph([0, 6], [-18, 18], [[0, v0], [T, v1]], "v (m/s) vs t (s)"),
        needsVisual: true,
        hint: "A straight v–t line has one constant slope, and the slope is the acceleration.",
        explain: `Slope = (${s(v1)} − (${s(v0)})) ÷ ${T} = ${s(a)} m/s², the same at every instant, so the a–t graph is flat at ${s(a)} m/s².`,
      },
      lab(correct, [
        `a horizontal line at a = ${s(-a)} m/s²`,
        `a horizontal line at a = ${s(v1)} m/s²`,
        `a line sloping from ${s(v0)} to ${s(v1)}`,
        "a horizontal line at a = 0",
      ]),
    );
  },
);

/** PHYS.1.2, PHYS.1.3 — the kinematic equations in multi-step problems. */
export const kinematicEquations: Gen = mix(
  () => {
    const [v0, a] = pick([
      [20, 5],
      [20, 4],
      [30, 5],
      [30, 6],
      [24, 6],
      [25, 5],
      [16, 4],
      [18, 3],
      [28, 7],
    ]);
    const askT = Math.random() < 0.4;
    const d = (v0 * v0) / (2 * a);
    return q(
      {
        key: `ke-brake-${v0}-${a}-${askT}`,
        prompt: `A car moving at ${v0} m/s brakes with a steady deceleration of ${a} m/s². ${askT ? "How long does it take to stop?" : "How far does it travel while stopping?"}`,
        unit: askT ? "s" : "m",
        hint: askT ? "v = v₀ + at with v = 0 and a negative." : "v² = v₀² + 2aΔx with v = 0 (no time needed).",
        explain: askT ? `0 = ${v0} − ${a}t, so t = ${v0} ÷ ${a} = ${s(v0 / a)} s.` : `0 = ${v0}² − 2(${a})Δx, so Δx = ${v0 * v0} ÷ ${2 * a} = ${s(d)} m.`,
      },
      kp(askT ? v0 / a : d),
    );
  },
  () => {
    const [v0, v, d] = pick([
      [2, 8, 10],
      [0, 12, 24],
      [4, 10, 7],
      [6, 14, 32],
      [3, 9, 24],
      [0, 20, 40],
      [5, 15, 50],
      [10, 20, 30],
      [0, 9, 27],
    ]);
    const a = (v * v - v0 * v0) / (2 * d);
    return q(
      {
        key: `ke-findA-${v0}-${v}-${d}`,
        prompt: `A runner speeds up steadily from ${v0} m/s to ${v} m/s over ${d} m. What is her acceleration?`,
        unit: "m/s²",
        hint: "No time is given, so use v² = v₀² + 2aΔx and solve for a.",
        explain: `a = (v² − v₀²) ÷ 2Δx = (${v * v} − ${v0 * v0}) ÷ ${2 * d} = ${s(a)} m/s².`,
      },
      kp(a),
    );
  },
  () => {
    const a = pick([2, 3, 4]);
    const t1 = pick([2, 3, 4, 5]);
    const t2 = pick([3, 5, 10]);
    const vMax = a * t1;
    const d = 0.5 * a * t1 * t1 + vMax * t2;
    return q(
      {
        key: `ke-2stage-${a}-${t1}-${t2}`,
        prompt: `A cart starts from rest, accelerates at ${a} m/s² for ${t1} s, then coasts at constant velocity for ${t2} s. How far does it go in all?`,
        unit: "m",
        hint: "Two stages: ½at² for the speed-up, then (top speed) × time for the cruise.",
        explain: `Stage 1: ½(${a})(${t1})² = ${s(0.5 * a * t1 * t1)} m, reaching ${vMax} m/s. Stage 2: ${vMax} × ${t2} = ${vMax * t2} m. Total ${s(d)} m.`,
      },
      kp(d),
    );
  },
  () => {
    const [v, a] = pick([
      [10, 2],
      [12, 3],
      [15, 5],
      [8, 2],
      [20, 4],
      [9, 3],
    ]);
    const askD = Math.random() < 0.5;
    const t = (2 * v) / a;
    return q(
      {
        key: `ke-catch-${v}-${a}-${askD}`,
        prompt: `A truck passes a parked car at a steady ${v} m/s. At that moment the car starts from rest with a = ${a} m/s². ${askD ? "How far do they go before the car catches up?" : "When does the car catch up?"}`,
        unit: askD ? "m" : "s",
        hint: "Write x for each: truck x = vt, car x = ½at². Set them equal and solve for t (t ≠ 0).",
        explain: `${v}t = ½(${a})t² gives t = 2(${v}) ÷ ${a} = ${s(t)} s. ${askD ? `Then x = ${v} × ${s(t)} = ${s(v * t)} m.` : ""}`,
      },
      kp(askD ? v * t : t),
    );
  },
  () => {
    const change = pick([
      { c: "the starting speed is doubled", f: "4 times as far", e: "Δx = v₀² ÷ 2a, so doubling v₀ makes Δx four times as big." },
      { c: "the braking deceleration is doubled", f: "half as far", e: "Δx = v₀² ÷ 2a, so doubling a halves Δx." },
      { c: "the starting speed is tripled", f: "9 times as far", e: "Δx = v₀² ÷ 2a, so tripling v₀ makes Δx nine times as big." },
      { c: "the car's mass is doubled (same deceleration)", f: "the same distance", e: "With the same v₀ and a, Δx = v₀² ÷ 2a doesn't depend on mass." },
      { c: "the starting speed is halved", f: "a quarter as far", e: "Δx = v₀² ÷ 2a, so halving v₀ makes Δx a quarter as big." },
    ]);
    return q(
      {
        key: `ke-change-${change.c}`,
        prompt: `A car brakes to a stop with constant deceleration. How does the stopping distance change if ${change.c}?`,
        hint: "Use v² = v₀² + 2aΔx with v = 0: Δx = v₀² ÷ 2a.",
        explain: change.e,
      },
      lab(change.f, ["twice as far", "4 times as far", "half as far", "the same distance", "9 times as far", "a quarter as far"].filter((x) => x !== change.f)),
    );
  },
);

/** PHYS.1.2, PHYS.1.3 — free fall with g = 9.8 m/s². */
export const freeFall: Gen = mix(
  () => {
    const t = pick([1, 2, 3, 4, 5]);
    const askV = Math.random() < 0.5;
    return q(
      {
        key: `ff-drop-${t}-${askV}`,
        prompt: `A stone is dropped from rest off a cliff. ${askV ? `How fast is it falling after ${t} s?` : `How far has it fallen after ${t} s?`} (Ignore air.)`,
        unit: askV ? "m/s" : "m",
        hint: askV ? "v = gt, with g = 9.8 m/s²." : "Δy = ½gt², with g = 9.8 m/s².",
        explain: askV ? `v = 9.8 × ${t} = ${s(9.8 * t)} m/s.` : `Δy = ½(9.8)(${t})² = 4.9 × ${t * t} = ${s(4.9 * t * t)} m.`,
      },
      kp(askV ? 9.8 * t : 4.9 * t * t),
    );
  },
  () => {
    const k = pick([1, 2, 3, 4]);
    const v0 = 9.8 * k;
    const ask = pick(["top", "height", "total"] as const);
    const ans = ask === "top" ? k : ask === "height" ? 4.9 * k * k : 2 * k;
    return q(
      {
        key: `ff-up-${k}-${ask}`,
        prompt: `A ball is thrown straight up at ${s(v0)} m/s. ${ask === "top" ? "How long until it reaches the top?" : ask === "height" ? "How high does it rise?" : "How long until it lands back in the thrower's hand?"}`,
        unit: ask === "height" ? "m" : "s",
        hint: ask === "height" ? "At the top v = 0: use v² = v₀² − 2gΔy." : "At the top v = 0: 0 = v₀ − gt. The way down takes as long as the way up.",
        explain:
          ask === "top"
            ? `t = v₀ ÷ g = ${s(v0)} ÷ 9.8 = ${k} s.`
            : ask === "height"
              ? `Δy = v₀² ÷ 2g = ${s(v0 * v0)} ÷ 19.6 = ${s(4.9 * k * k)} m.`
              : `Up takes ${s(v0)} ÷ 9.8 = ${k} s and down takes the same, so ${2 * k} s.`,
      },
      kp(ans),
    );
  },
  () => {
    const k = pick([5, 10, 15, 20]);
    const v0 = 1.4 * k;
    const h = 0.1 * k * k;
    return q(
      {
        key: `ff-height-${k}`,
        prompt: `A rocket's engine cuts out when it is moving straight up at ${s(v0)} m/s. How much higher does it coast?`,
        unit: "m",
        hint: "Coasting up, it slows at 9.8 m/s² until v = 0. Use v² = v₀² − 2gΔy.",
        explain: `Δy = v₀² ÷ 2g = ${s(v0 * v0)} ÷ 19.6 = ${s(h)} m.`,
      },
      kp(h),
    );
  },
  () => {
    const items = [
      {
        p: "Ball A is thrown up at 10 m/s and ball B is thrown down at 10 m/s from the same balcony. Which hits the ground faster?",
        a: "They hit at the same speed",
        w: ["A", "B", "It depends on their masses"],
        e: "A comes back down past the balcony at 10 m/s downward, then it falls exactly like B. Same speed at the ground (A just takes longer).",
      },
      {
        p: "Which v–t graph shows a ball thrown up and caught at the same height (up is +)?",
        a: "A straight line sloping down, crossing v = 0 halfway",
        w: ["A V shape touching v = 0 at the top", "A horizontal line", "A straight line sloping up"],
        e: "a = −9.8 m/s² all the way, so v falls steadily from +v₀ through 0 (the top) to −v₀.",
      },
      {
        p: "A hammer and a feather are dropped together on the Moon (no air). What happens?",
        a: "They land together",
        w: ["The hammer lands first", "The feather lands first", "The feather floats"],
        e: "Without air resistance every object falls with the same acceleration, whatever its mass.",
      },
      {
        p: "A dropped ball falls for 2 s. How far does it fall in the 2nd second compared with the 1st?",
        a: "3 times as far",
        w: ["the same distance", "twice as far", "4 times as far"],
        e: "After 1 s: 4.9 m. After 2 s: 19.6 m. So 14.7 m in the 2nd second, 3 × 4.9 m.",
      },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `ff-concept-${i}`, prompt: it.p, hint: "In free fall, a = 9.8 m/s² downward the whole time, going up or down.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.1.3 — linearizing motion data (Do it: plot points, draw lines). */
export const linearizeMotion: Gen = mix(
  () => {
    const v = pick([0.5, 1, 2]);
    const x0 = v === 2 ? rand(0, 2) : rand(0, 4);
    const ts = v === 2 ? [1, 2, 3] : v === 1 ? [2, 4, 6] : [2, 4, 8];
    const pts = ts.map((t, i) => ({ x: t, y: x0 + v * t, label: LETTERS[i] }));
    return q(
      {
        key: `lin-plot-${v}-${x0}`,
        prompt: `A cart's position was measured. Plot the data (t across, x up), then notice the slope.`,
        speech: "A cart's position was measured. Plot the data with time across and position up.",
        visual: { kind: "table", header: ["Point", "t (s)", "x (m)"], rows: pts.map((p) => [p.label, p.x, p.y]) },
        hint: "Each row is a point: t across, x up.",
        explain: `The points line up: a straight x–t line means constant velocity. Slope = ${s(v)} m/s, and the line crosses x = ${x0} m at t = 0.`,
      },
      act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, v),
    );
  },
  () => {
    const [m, b] = pick([
      [1, 2],
      [2, 1],
      [0.5, 3],
      [1, 0],
      [2, 0],
      [0.5, 1],
      [-1, 9],
      [-2, 10],
      [3, 1],
      [-0.5, 8],
    ] as Pt[]);
    return q(
      {
        key: `lin-draw-${m}-${b}`,
        prompt: `A toy car starts at x = ${b} m with a constant velocity of ${s(m)} m/s. Draw its x–t line (t across, x up).`,
        hint: `Start at (0, ${b}). Each second, x changes by ${s(m)} m.`,
        explain: `x = ${b} + (${s(m)})t: the line starts at ${b} on the x-axis and has slope ${s(m)}.`,
      },
      act({ kind: "drawLine", m, b, size: 10, quadrants: 1 }, m),
    );
  },
  () => {
    const k = pick([0.5, 1, 1.5, 2]);
    const t2 = k === 2 ? [1, 2, 4] : k === 1.5 ? [2, 4, 6] : [2, 4, 8];
    const pts = t2.map((x, i) => ({ x, y: k * x, label: LETTERS[i] }));
    const a = 2 * k;
    const doIt = Math.random() < 0.5;
    if (doIt)
      return q(
        {
          key: `lin-t2plot-${k}`,
          prompt: "A cart rolls from rest down a ramp. Plot d against t² (t² across, d up). Is it a straight line?",
          speech: "A cart rolls from rest down a ramp. Plot distance against time squared, with t squared across and d up.",
          visual: { kind: "table", header: ["Point", "t² (s²)", "d (m)"], rows: pts.map((p) => [p.label, p.x, p.y]) },
          hint: "Use the t² column for across, not t.",
          explain: `d = ½at², so d vs t² is a straight line with slope ½a = ${s(k)} m/s². That makes a = ${s(a)} m/s².`,
        },
        act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, k),
      );
    return q(
      {
        key: `lin-t2slope-${k}`,
        prompt: "A cart starts from rest. Its d vs t² graph is a straight line. What is the cart's acceleration?",
        speech: "A cart starts from rest. Its graph of distance against time squared is a straight line. What is its acceleration?",
        visual: { kind: "plot", x: [0, 10], y: [0, 10], ...axes("d (m) vs t² (s²)"), lines: [{ from: [0, 0], to: [10 / Math.max(1, k), 10 / Math.max(1, k) * k], colour: "wave" }], points: pts.map((p) => ({ x: p.x, y: p.y })) },
        needsVisual: true,
        unit: "m/s²",
        hint: "d = ½at², so the slope of d vs t² is ½a. Find the slope, then double it.",
        explain: `Slope = ${s(pts[1].y)} ÷ ${s(pts[1].x)} = ${s(k)} m/s² = ½a, so a = ${s(a)} m/s².`,
      },
      kp(a, [k, a * 2, k / 2]),
    );
  },
  () => {
    const pairs = [
      { c: "d vs t²", w: ["d vs t", "d vs √t", "v vs t²"], s: "starting from rest with constant acceleration (d = ½at²)" },
      { c: "v² vs d", w: ["v vs d", "v vs d²", "d vs v"], s: "speeding up from rest with constant acceleration (v² = 2ad)" },
      { c: "x vs t", w: ["x vs t²", "x² vs t", "v vs x"], s: "moving at constant velocity (x = x₀ + vt)" },
      { c: "d vs t²", w: ["d vs t", "t vs d", "d² vs t"], s: "dropped from rest (d = ½gt²)" },
    ];
    const i = rand(0, pairs.length - 1);
    const p = pairs[i];
    return q(
      {
        key: `lin-which-${i}`,
        prompt: `An object is ${p.s}. Which graph of the data would be a straight line through the origin?`,
        hint: "Match the equation to y = (constant) × x. Whatever multiplies the constant goes across.",
        explain: `With the equation in the form y = kx, plotting ${p.c} gives a straight line through the origin.`,
      },
      lab(p.c, p.w),
    );
  },
);

/** PHYS.1.4 — reference frames and relative motion. */
export const relativeMotion: Gen = mix(
  () => {
    const walk = pick([1, 1.5, 2]);
    const belt = pick([1, 1.5, 2, 2.5, 3]);
    const same = Math.random() < 0.5;
    const v = same ? walk + belt : walk - belt;
    return q(
      {
        key: `rel-walk-${walk}-${belt}-${same}`,
        prompt: `A moving walkway goes forward at ${belt} m/s. A man walks ${same ? "forward" : "backward"} on it at ${walk} m/s relative to the walkway. What is his velocity relative to the ground (forward is +)?`,
        unit: "m/s",
        hint: "v(man, ground) = v(man, walkway) + v(walkway, ground). Backward is negative.",
        explain: `v = ${same ? walk : `−${walk}`} + ${belt} = ${s(v)} m/s.`,
      },
      sk(v, [walk + belt, belt - walk, -(walk + belt)]),
    );
  },
  () => {
    const [v1, v2, d] = pick([
      [20, 30, 1000],
      [15, 25, 800],
      [10, 15, 500],
      [25, 35, 1200],
      [12, 18, 600],
    ]);
    const askT = Math.random() < 0.5;
    const t = d / (v1 + v2);
    return q(
      {
        key: `rel-trains-${v1}-${v2}-${d}-${askT}`,
        prompt: askT
          ? `Two trains ${d} m apart head toward each other at ${v1} m/s and ${v2} m/s. How long until they meet?`
          : `Two trains head toward each other at ${v1} m/s and ${v2} m/s. How fast does each driver see the other train approaching?`,
        unit: askT ? "s" : "m/s",
        hint: "In one train's frame, the other comes at the sum of their speeds.",
        explain: askT ? `Closing speed = ${v1} + ${v2} = ${v1 + v2} m/s, so t = ${d} ÷ ${v1 + v2} = ${s(t)} s.` : `Relative speed = ${v1} + ${v2} = ${v1 + v2} m/s.`,
      },
      kp(askT ? t : v1 + v2),
    );
  },
  () => {
    const [b, c, r] = pick([
      [4, 3, 5],
      [8, 6, 10],
      [3, 4, 5],
      [12, 5, 13],
      [6, 8, 10],
    ]);
    const w = b * pick([10, 20, 30]);
    const ask = pick(["speed", "time", "drift"] as const);
    const t = w / b;
    const ans = ask === "speed" ? r : ask === "time" ? t : c * t;
    return q(
      {
        key: `rel-river-${b}-${c}-${w}-${ask}`,
        prompt: `A boat heads straight across a ${w} m wide river at ${b} m/s (relative to the water). The current flows at ${c} m/s. ${ask === "speed" ? "What is the boat's speed relative to the shore?" : ask === "time" ? "How long does it take to cross?" : "How far downstream does it land?"}`,
        visual: {
          kind: "phys-forces",
          object: "⛵",
          unit: "m/s",
          forces: [
            { dir: 90, size: b, label: b, colour: "wave" },
            { dir: 0, size: c, label: c, colour: "teal" },
          ],
        },
        unit: ask === "speed" ? "m/s" : ask === "time" ? "s" : "m",
        hint: ask === "speed" ? "The two velocities are at right angles: add them like vectors (Pythagoras)." : "Across and downstream are independent. Only the across speed gets you across.",
        explain:
          ask === "speed"
            ? `√(${b}² + ${c}²) = √${b * b + c * c} = ${r} m/s.`
            : ask === "time"
              ? `t = ${w} ÷ ${b} = ${s(t)} s. The current doesn't change the crossing time.`
              : `It takes ${w} ÷ ${b} = ${s(t)} s, drifting ${c} × ${s(t)} = ${s(c * t)} m downstream.`,
      },
      kp(ans),
    );
  },
  () => {
    const items = [
      {
        p: "A passenger on a smooth train moving at constant velocity drops a ball. What path does a person standing beside the track see?",
        a: "A parabola, curving forward",
        w: ["Straight down", "A curve falling behind the drop point", "A straight slanted line"],
        e: "The ball keeps the train's forward velocity, so from the ground it moves forward while falling: a parabola.",
      },
      {
        p: "A passenger on a smooth train moving at constant velocity drops a ball. What path does the passenger see?",
        a: "Straight down",
        w: ["A parabola curving forward", "A curve falling backward", "It drifts to the side"],
        e: "In the train's frame the ball starts at rest and only gravity acts, so it falls straight down.",
      },
      {
        p: "Car A drives east at 25 m/s; car B drives east at 15 m/s. What is A's velocity relative to B?",
        a: "10 m/s east",
        w: ["40 m/s east", "10 m/s west", "25 m/s east"],
        e: "v(A rel B) = v(A) − v(B) = 25 − 15 = 10 m/s east. B's driver sees A pulling ahead slowly.",
      },
      {
        p: "Rain falls straight down. You run forward through it. Which way does the rain seem to come from?",
        a: "Slanting toward you from the front",
        w: ["Straight down", "From behind you", "Sideways"],
        e: "v(rain rel you) = v(rain) − v(you): straight down plus a backward part, so it seems to come from in front.",
      },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `rel-concept-${i}`, prompt: it.p, hint: "Velocity depends on the frame: v(A rel C) = v(A rel B) + v(B rel C).", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.1.5 — horizontal launches. */
export const horizontalLaunch: Gen = mix(
  () => {
    const [t, h] = pick([
      [1, 4.9],
      [2, 19.6],
      [3, 44.1],
      [0.5, 1.225],
      [4, 78.4],
    ] as Pt[]);
    const vx = pick([2, 3, 4, 5, 6, 8, 10, 12, 15]);
    const ask = pick(["time", "range", "vy"] as const);
    const ans = ask === "time" ? t : ask === "range" ? vx * t : 9.8 * t;
    return q(
      {
        key: `hl-${h}-${vx}-${ask}`,
        prompt: `A ball rolls off a ${s(h)} m high ledge at ${vx} m/s (horizontally). ${ask === "time" ? "How long is it in the air?" : ask === "range" ? "How far from the base of the ledge does it land?" : "What is its vertical speed just before it lands?"}`,
        unit: ask === "time" ? "s" : ask === "range" ? "m" : "m/s",
        hint: ask === "vy" ? "Vertically it's just a drop from rest: v_y = gt." : "Vertical first: h = ½gt² gives the time. Horizontal speed stays constant.",
        explain:
          ask === "time"
            ? `${s(h)} = 4.9t², so t² = ${s(h / 4.9)} and t = ${s(t)} s. The ${vx} m/s doesn't change the fall time.`
            : ask === "range"
              ? `Fall time: ${s(h)} = 4.9t² → t = ${s(t)} s. Range = ${vx} × ${s(t)} = ${s(vx * t)} m.`
              : `Fall time is ${s(t)} s (from ${s(h)} = 4.9t²), so v_y = 9.8 × ${s(t)} = ${s(9.8 * t)} m/s. The horizontal speed doesn't affect it.`,
      },
      kp(ans),
    );
  },
  () => {
    const items = [
      {
        p: "One ball is dropped and another is fired horizontally from the same height at the same instant. Which lands first?",
        a: "They land at the same time",
        w: ["The dropped ball", "The fired ball", "It depends on the firing speed"],
        e: "Both start with zero vertical velocity and fall with the same g. Horizontal motion doesn't affect the fall.",
      },
      {
        p: "A ball rolls off a table. If it rolled off twice as fast, how would its time in the air change?",
        a: "No change",
        w: ["Twice as long", "Half as long", "4 times as long"],
        e: "Time in the air depends only on the height (h = ½gt²). The landing distance doubles, not the time.",
      },
      {
        p: "A ball rolls off a table. Which change would make it land farther away?",
        a: "A taller table",
        w: ["A heavier ball", "A lighter ball", "None: range is fixed"],
        e: "A taller table means more time in the air, so it travels farther horizontally. Mass doesn't matter.",
      },
      {
        p: "A package is dropped from a plane flying level at constant speed (no air resistance). Where is the package when it hits the ground?",
        a: "Directly below the plane",
        w: ["Behind the plane", "Ahead of the plane", "Below the drop point"],
        e: "The package keeps the plane's horizontal velocity, so it stays right under the plane all the way down.",
      },
      {
        p: "For a ball launched horizontally, what happens to its horizontal velocity while it falls (no air)?",
        a: "It stays constant",
        w: ["It increases", "It decreases", "It becomes zero at the ground"],
        e: "No horizontal force acts, so v_x never changes. Only v_y grows.",
      },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `hl-concept-${i}`, prompt: it.p, hint: "Treat horizontal and vertical motion separately; only gravity acts, and it acts down.", explain: it.e }, lab(it.a, it.w));
  },
  () => {
    const t = pick([1, 2, 3]);
    const vx = pick([3, 4, 5, 6, 8]);
    const R = vx * t;
    const h = 4.9 * t * t;
    return q(
      {
        key: `hl-findv-${t}-${vx}`,
        prompt: `A marble leaves a ${s(h)} m high table horizontally and lands ${s(R)} m from its base. How fast was it moving when it left the table?`,
        unit: "m/s",
        hint: "Find the fall time from the height, then v_x = range ÷ time.",
        explain: `${s(h)} = 4.9t² gives t = ${t} s, so v_x = ${s(R)} ÷ ${t} = ${vx} m/s.`,
      },
      kp(vx),
    );
  },
);

/** PHYS.1.5 — launches at an angle; ranking trajectories. */
export const angledLaunch: Gen = mix(
  () => {
    const k = pick([1, 2, 3]);
    const vy = 9.8 * k;
    const vx = pick([5, 8, 10, 12, 15, 20]);
    const ask = pick(["time", "range", "height"] as const);
    const ans = ask === "time" ? 2 * k : ask === "range" ? vx * 2 * k : 4.9 * k * k;
    return q(
      {
        key: `al-comp-${k}-${vx}-${ask}`,
        prompt: `A ball is kicked from level ground with v_x = ${vx} m/s and v_y = ${s(vy)} m/s. ${ask === "time" ? "How long is it in the air?" : ask === "range" ? "How far away does it land?" : "What is its maximum height?"}`,
        unit: ask === "time" ? "s" : "m",
        hint: ask === "height" ? "At the top v_y = 0: h = v_y² ÷ 2g." : "Time up = v_y ÷ g; the flight is twice that. Range = v_x × flight time.",
        explain:
          ask === "time"
            ? `Up: ${s(vy)} ÷ 9.8 = ${k} s. Down takes the same, so ${2 * k} s.`
            : ask === "range"
              ? `Flight time = 2 × ${s(vy)} ÷ 9.8 = ${2 * k} s. Range = ${vx} × ${2 * k} = ${vx * 2 * k} m.`
              : `h = ${s(vy)}² ÷ 19.6 = ${s(4.9 * k * k)} m.`,
      },
      kp(ans),
    );
  },
  () => {
    // Three trajectories: equal heights or equal ranges; rank time, vx or vy.
    const sameHeight = Math.random() < 0.5;
    const H = sameHeight ? pick([6, 8]) : 0;
    const shapes = LETTERS.slice(0, 3).map((name, i) => {
      const h = sameHeight ? H : [3, 5, 8][i];
      const r = sameHeight ? [6, 10, 14][i] : 12;
      return { name, h, r };
    });
    const order = shuffle([0, 1, 2]);
    const named = order.map((j, i) => ({ ...shapes[j], name: LETTERS[i] }));
    const ask = pick(["time", "vx", "vy"] as const);
    const value = (sh: { h: number; r: number }) => {
      const t = 2 * Math.sqrt((2 * sh.h) / 9.8);
      return ask === "time" ? t : ask === "vy" ? Math.sqrt(2 * 9.8 * sh.h) : sh.r / t;
    };
    const curves = named.map((sh, i) => ({
      fn: (x: number) => (x >= 0 && x <= sh.r ? (4 * sh.h * x * (sh.r - x)) / (sh.r * sh.r) : NaN),
      colour: (["wave", "berry", "leaf"] as Colour[])[i],
      label: sh.name,
    }));
    const what = ask === "time" ? "time in the air" : ask === "vx" ? "horizontal launch speed" : "vertical launch speed";
    return q(
      {
        key: `al-rank-${sameHeight}-${order.join("")}-${ask}-${H}`,
        prompt: `Three balls follow paths A, B and C (no air). Rank their ${what}, greatest first.`,
        visual: { kind: "plot", x: [0, 15], y: [0, 10], xLabel: "distance (m)", yLabel: "height (m)", curves },
        needsVisual: true,
        hint: "Time in the air and v_y depend only on the peak height. Then v_x = range ÷ time.",
        explain: sameHeight
          ? `Same peak height means the same v_y and the same flight time. ${ask === "vx" ? "So the one that goes farthest has the biggest v_x." : "They tie."}`
          : `Same range but different heights: the higher path has more v_y and more time, so ${ask === "vx" ? "it must have less v_x to land in the same place" : "it ranks higher"}.`,
      },
      ranking(named.map((sh) => ({ name: sh.name, value: clean(value(sh)) }))),
    );
  },
  () => {
    const a = pick([15, 20, 25, 30, 35, 40]);
    const items = [
      { p: `A ball launched at ${a}° lands 30 m away. At what other launch angle (same speed, level ground) would it land in the same place?`, ans: 90 - a, u: "°", e: `Complementary angles (adding to 90°) give the same range: ${90 - a}°.`, h: "Range ∝ sin 2θ, and sin 2θ = sin(180° − 2θ)." },
      { p: "On level ground with no air, which launch angle gives the greatest range?", ans: 45, u: "°", e: "Range ∝ sin 2θ, which is largest when 2θ = 90°, so θ = 45°.", h: "Range = v² sin 2θ ÷ g." },
    ];
    const i = Math.random() < 0.75 ? 0 : 1;
    const it = items[i];
    return q({ key: `al-angle-${i}-${a}`, prompt: it.p, unit: it.u, hint: it.h, explain: it.e }, kp(it.ans));
  },
  () => {
    const items = [
      { p: "At the top of its path, a ball launched at 40° has…", a: "only horizontal velocity, and a = g downward", w: ["zero velocity and zero acceleration", "zero velocity and a = g downward", "only horizontal velocity, and zero acceleration"], e: "v_y = 0 at the top but v_x is unchanged, and gravity still accelerates it at 9.8 m/s² down." },
      { p: "A projectile is in flight (no air). Which quantity stays constant?", a: "Horizontal velocity", w: ["Vertical velocity", "Speed", "Height"], e: "Gravity is vertical, so it only changes v_y. v_x stays the same." },
      { p: "Two balls are launched with the same speed, one at 30° and one at 60°. Which is in the air longer?", a: "The 60° ball", w: ["The 30° ball", "Same time", "Can't tell"], e: "The 60° ball has a bigger v_y = v sin θ, so it goes higher and stays up longer (though both land at the same spot)." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `al-concept-${i}`, prompt: it.p, hint: "Split the velocity into v_x (constant) and v_y (changes by 9.8 m/s each second).", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.1.5 — Do it: launch to hit a target. */
export const launchTarget: Gen = mix(
  () => {
    const angle = pick([30, 35, 40, 45, 50, 55, 60]);
    const speed = rand(10, 18);
    const d = launchDistance(speed, angle, G);
    const target = Math.round(d * 2) / 2;
    return q(
      {
        key: `lt-speed-${angle}-${speed}`,
        prompt: `The cannon is set to ${angle}°. Choose the launch speed that lands the ball on the target ${s(target)} m away.`,
        speech: `The cannon is set to ${angle} degrees. Choose the launch speed that lands the ball on the target ${s(target)} meters away.`,
        hint: `Range on level ground = v² sin(2θ) ÷ g. Solve for v: v = √(R·g ÷ sin ${2 * angle}°).`,
        explain: `v = √(${s(target)} × 9.8 ÷ sin ${2 * angle}°) ≈ ${speed} m/s.`,
      },
      act({ kind: "phys-launch", g: G, angle, speed: { min: 8, max: 20, step: 1 }, target, tolerance: 0.6, width: Math.ceil(Math.max(target * 1.25, 20)) }, speed),
    );
  },
  () => {
    const speed = pick([12, 14, 15, 16]);
    const angle = pick([20, 25, 30, 35, 55, 60, 65, 70]);
    const d = launchDistance(speed, angle, G);
    const target = Math.round(d * 2) / 2;
    return q(
      {
        key: `lt-angle-${angle}-${speed}`,
        prompt: `The ball leaves at ${speed} m/s. Set the angle to land on the target ${s(target)} m away. (Two angles work!)`,
        speech: `The ball leaves at ${speed} meters per second. Set the angle to land on the target ${s(target)} meters away. Two angles work.`,
        hint: `sin(2θ) = R·g ÷ v² = ${s(target)} × 9.8 ÷ ${speed * speed}. Find 2θ, then halve it.`,
        explain: `sin 2θ ≈ ${s(rd((target * 9.8) / (speed * speed), 2))}, so θ ≈ ${Math.min(angle, 90 - angle)}° or its complement ${Math.max(angle, 90 - angle)}°.`,
      },
      act({ kind: "phys-launch", g: G, angle: { min: 15, max: 75, step: 5 }, speed, target, tolerance: 0.6, width: Math.ceil(Math.max(target * 1.3, 20)) }, angle),
    );
  },
  () => {
    const [t, h] = pick([
      [1, 4.9],
      [2, 19.6],
      [0.5, 1.225],
    ] as Pt[]);
    const v = t === 0.5 ? rand(4, 10) : t === 1 ? rand(3, 9) : rand(2, 6);
    const target = v * t;
    return q(
      {
        key: `lt-ledge-${h}-${v}`,
        prompt: `Throw the ball horizontally from a ${s(h)} m ledge so it lands ${s(target)} m away. Pick the speed.`,
        speech: `Throw the ball horizontally from a ${s(h)} meter ledge so it lands ${s(target)} meters away. Pick the speed.`,
        hint: "Fall time from h = 4.9t², then v = distance ÷ time.",
        explain: `t = ${s(t)} s, so v = ${s(target)} ÷ ${s(t)} = ${v} m/s.`,
      },
      act({ kind: "phys-launch", g: G, height: h, angle: 0, speed: { min: 1, max: 12, step: 1 }, target, tolerance: Math.min(0.4, t * 0.4), width: Math.max(12, Math.ceil(target * 1.4)), launcher: "hand" }, v),
    );
  },
);

/* ============================================ 2. Force and translational dynamics */

/** Pick values until `ok`; for clean numbers. */
function until<T>(make: () => T, ok: (v: T) => boolean): T {
  for (let i = 0; i < 500; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  throw new Error("until: no clean values found");
}
const isStep = (x: number, step: number) => Math.abs(x / step - Math.round(x / step)) < 1e-9;

/** PHYS.2.1 — systems and center of mass. */
export const centerOfMass: Gen = mix(
  () => {
    const [m1, m2, x1, x2] = until(
      () => [rand(1, 5), rand(1, 5), rand(0, 4), rand(5, 10)],
      ([a, b, x, y]) => isStep((a * x + b * y) / (a + b), 0.5) && a !== b,
    );
    const xc = (m1 * x1 + m2 * x2) / (m1 + m2);
    return q(
      {
        key: `cm-two-${m1}-${m2}-${x1}-${x2}`,
        prompt: `A ${m1} kg ball sits at x = ${x1} m and a ${m2} kg ball at x = ${x2} m on a light rod. Where is their center of mass?`,
        visual: {
          kind: "phys-motion",
          track: { min: 0, max: 10, step: 1, labelStep: 2, unit: "m" },
          rows: [
            { positions: [x1], name: `${m1} kg`, colour: "wave" },
            { positions: [x2], name: `${m2} kg`, colour: "berry" },
          ],
        },
        unit: "m",
        hint: "x_cm = (m₁x₁ + m₂x₂) ÷ (m₁ + m₂). It sits closer to the heavier mass.",
        explain: `x_cm = (${m1}×${x1} + ${m2}×${x2}) ÷ ${m1 + m2} = ${m1 * x1 + m2 * x2} ÷ ${m1 + m2} = ${s(xc)} m.`,
      },
      kp(xc),
    );
  },
  () => {
    const [ms, xs] = until(
      () => [[rand(1, 4), rand(1, 4), rand(1, 4)], shuffle([0, 2, 4, 6, 8, 10]).slice(0, 3).sort((a, b) => a - b)],
      ([m, x]) => isStep((m[0] * x[0] + m[1] * x[1] + m[2] * x[2]) / (m[0] + m[1] + m[2]), 0.5),
    );
    const M = ms[0] + ms[1] + ms[2];
    const sum = ms[0] * xs[0] + ms[1] * xs[1] + ms[2] * xs[2];
    return q(
      {
        key: `cm-three-${ms.join("")}-${xs.join("")}`,
        prompt: `Three carts sit on a track: ${ms.map((m, i) => `${m} kg at ${xs[i]} m`).join(", ")}. Where is the system's center of mass?`,
        visual: {
          kind: "phys-motion",
          track: { min: 0, max: 10, step: 1, labelStep: 2, unit: "m" },
          rows: ms.map((m, i) => ({ positions: [xs[i]], name: `${m} kg`, colour: (["wave", "berry", "leaf"] as Colour[])[i] })),
        },
        unit: "m",
        hint: "x_cm = Σmx ÷ Σm: multiply each mass by its position, add, divide by the total mass.",
        explain: `Σmx = ${ms.map((m, i) => `${m}×${xs[i]}`).join(" + ")} = ${sum}; Σm = ${M}; x_cm = ${s(sum / M)} m.`,
      },
      kp(sum / M),
    );
  },
  () => {
    const [m1, m2, x1, xc] = until(
      () => [rand(1, 6), rand(1, 4), rand(0, 3), rand(3, 6)],
      ([a, b, x, c]) => {
        const x2 = (c * (a + b) - a * x) / b;
        return Number.isInteger(x2) && x2 > c && x2 <= 10;
      },
    );
    const x2 = (xc * (m1 + m2) - m1 * x1) / m2;
    return q(
      {
        key: `cm-place-${m1}-${m2}-${x1}-${xc}`,
        prompt: `A ${m1} kg block is at x = ${x1} m. Where must a ${m2} kg block go so the center of mass of the pair is at x = ${xc} m?`,
        unit: "m",
        hint: "Set (m₁x₁ + m₂x₂) ÷ (m₁ + m₂) equal to the target and solve for x₂.",
        explain: `${xc} × ${m1 + m2} = ${m1}×${x1} + ${m2}x₂ → ${xc * (m1 + m2)} − ${m1 * x1} = ${m2}x₂ → x₂ = ${x2} m.`,
      },
      kp(x2),
    );
  },
  () => {
    const items = [
      { p: "Two skaters at rest push off each other. What happens to the center of mass of the two-skater system?", a: "It stays at rest", w: ["It moves toward the heavier skater", "It moves toward the lighter skater", "It speeds up, then stops"], e: "The pushes are internal forces. With no net external force, the system's center of mass keeps its velocity (zero)." },
      { p: "A firework shell explodes at the top of its path. What path does the center of mass of all the pieces follow (no air)?", a: "The same parabola the shell was on", w: ["It stops and falls straight down", "It moves straight up", "It splits into several paths"], e: "The explosion is internal. Gravity is the only external force, so the center of mass continues on the original parabola." },
      { p: "A person walks from the back to the front of a canoe floating at rest (no water drag). What does the canoe do?", a: "Moves backward", w: ["Stays still", "Moves forward", "Moves forward, then back"], e: "No external horizontal force, so the center of mass of person + canoe can't move. The person goes forward, so the canoe goes back." },
      { p: "When can you treat a system (like a car full of people) as a single object?", a: "When its internal structure doesn't matter to the question", w: ["Only when it is at rest", "Only when it has one part", "Never, if it has internal forces"], e: "A system can be modelled as one object at its center of mass when the parts move together or the internal details don't affect what you're finding." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `cm-concept-${i}`, prompt: it.p, hint: "Internal forces cancel in pairs (Newton's third law), so only external forces move the center of mass.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.2.2 — forces and free-body diagrams. */
export const freeBodyDiagrams: Gen = mix(
  () => {
    const items = [
      { p: "a ball flying through the air after it's thrown (no air resistance)", n: 1, e: "Only gravity. Nothing is pushing it forward once it leaves the hand." },
      { p: "a book resting on a table", n: 2, e: "Gravity down and the normal force up." },
      { p: "a box pushed across a rough floor", n: 4, e: "Gravity, normal force, the push and kinetic friction." },
      { p: "a lamp hanging from one cord", n: 2, e: "Gravity down and tension up." },
      { p: "a skydiver falling at terminal velocity", n: 2, e: "Gravity down and air resistance up (equal in size)." },
      { p: "a sled pulled at an angle on frictionless ice", n: 3, e: "Gravity, the normal force and the rope's tension." },
      { p: "a hockey puck sliding on frictionless ice", n: 2, e: "Gravity and the normal force. No force is needed to keep it sliding." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q(
      {
        key: `fbd-count-${i}`,
        prompt: `How many forces act on ${it.p}?`,
        hint: "A force needs something touching the object (push, pull, friction, normal, tension) or gravity from Earth. 'Motion' isn't a force.",
        explain: `${it.n}. ${it.e}`,
      },
      ch(it.n, [it.n + 1, it.n - 1, it.n + 2], 1, 1),
    );
  },
  () => {
    const w = rand(3, 5);
    const sc = pick([
      {
        id: "static",
        p: "You push the box right, but it doesn't move. Which force is missing from the diagram?",
        f: [
          { dir: 90, size: w, label: "N" },
          { dir: 270, size: w, label: "F_g" },
          { dir: 0, size: 2, label: "F_push" },
        ] as ForceArrow[],
        a: "static friction to the left",
        surface: "floor" as const,
        e: "The box stays put, so something balances the push: static friction, pointing left.",
      },
      {
        id: "slide",
        p: "The box slides right and slows down on a rough floor (no push). Which force is missing?",
        f: [
          { dir: 90, size: w, label: "N" },
          { dir: 270, size: w, label: "F_g" },
        ] as ForceArrow[],
        a: "kinetic friction to the left",
        surface: "floor" as const,
        e: "It slows down, so a net force points left: kinetic friction, opposite the sliding. There's no forward force.",
      },
      {
        id: "hang",
        p: "A lamp hangs at rest from a cord. Which force is missing?",
        f: [{ dir: 270, size: w, label: "F_g" }] as ForceArrow[],
        a: "tension up",
        surface: "ceiling" as const,
        e: "At rest means balanced: the cord's tension pulls up as hard as gravity pulls down.",
      },
      {
        id: "sky",
        p: "A skydiver falls at a constant speed. Which force is missing?",
        f: [{ dir: 270, size: w, label: "F_g" }] as ForceArrow[],
        a: "air resistance up",
        surface: "none" as const,
        e: "Constant velocity means zero net force, so air resistance up balances gravity.",
      },
    ]);
    return q(
      {
        key: `fbd-missing-${sc.id}-${w}`,
        prompt: sc.p,
        visual: { kind: "phys-forces", object: sc.id === "sky" ? "🪂" : sc.id === "hang" ? "💡" : "box", surface: sc.surface, forces: sc.f },
        needsVisual: true,
        hint: "Is the object balanced (at rest or constant velocity) or accelerating? Find what's needed to make the net force right.",
        explain: sc.e,
      },
      lab(sc.a, ["static friction to the left", "kinetic friction to the left", "tension up", "air resistance up", "a forward force of motion", "normal force down"].filter((x) => x !== sc.a)),
    );
  },
  () => {
    const m = pick([2, 4, 5, 10]);
    const F = pick([4, 6, 8, 10, 12, 20]);
    const up = Math.random() < 0.5;
    const N = 9.8 * m + (up ? -F / 2 : F / 2);
    return q(
      {
        key: `fbd-angle-${m}-${F}-${up}`,
        prompt: `A ${m} kg box rests on a floor. You ${up ? "pull up" : "push down"} on it at 30° ${up ? "above" : "below"} the horizontal with ${F} N, but it doesn't move. What is the normal force? (sin 30° = 0.5)`,
        visual: {
          kind: "phys-forces",
          objectLabel: m,
          surface: "floor",
          forces: [
            { dir: up ? 30 : 330, size: F, label: F },
            { dir: 90, size: N, label: "N" },
            { dir: 270, size: 9.8 * m, label: "mg" },
          ],
        },
        unit: "N",
        hint: `Balance the vertical forces. The ${up ? "upward" : "downward"} part of your force is F sin 30°.`,
        explain: `N ${up ? "+" : "="} ${up ? `${F / 2} = ${s(9.8 * m)}` : `${s(9.8 * m)} + ${F / 2}`}, so N = ${s(N)} N. ${up ? "Pulling up partly lifts the box, so the floor pushes less." : "Pushing down presses it into the floor, so the floor pushes more."}`,
      },
      kp(N, [9.8 * m, 9.8 * m + (up ? F / 2 : -F / 2), 9.8 * m - F]),
    );
  },
  () => {
    const a = rand(10, 40);
    let b = rand(5, 40);
    while (b === a) b = rand(5, 40);
    const w = rand(20, 50);
    return q(
      {
        key: `fbd-net-${a}-${b}-${w}`,
        prompt: "Use the free-body diagram. What is the net force on the crate (right is +)?",
        visual: {
          kind: "phys-forces",
          surface: "floor",
          forces: [
            { dir: 0, size: a, label: a },
            { dir: 180, size: b, label: b },
            { dir: 90, size: w, label: w },
            { dir: 270, size: w, label: w },
          ],
        },
        needsVisual: true,
        unit: "N",
        hint: "Up and down cancel. Add the horizontal forces with signs.",
        explain: `Vertical: ${w} − ${w} = 0. Horizontal: ${a} − ${b} = ${s(a - b)} N.`,
      },
      sk(a - b),
    );
  },
);

/** PHYS.2.2, PHYS.2.4 — Do it: draw the missing forces. */
export const drawForces: Gen = mix(
  () => {
    const k = rand(2, 5);
    return q(
      {
        key: `df-book-${k}`,
        prompt: `A book rests on a table. Gravity (F_g) is drawn, ${k} units long. Draw the normal force N.`,
        speech: `A book rests on a table. Gravity is drawn, ${k} units long. Draw the normal force.`,
        hint: "At rest means the net force is zero. Which way does the table push, and how hard?",
        explain: `N points up and is ${k} units long, balancing gravity.`,
      },
      act({ kind: "phys-forceArrows", object: "📕", surface: "floor", directions: 4, maxSize: 6, given: [{ dir: 270, size: k, label: "F_g" }], arrows: [{ label: "N", answer: { dir: 90, size: k } }], check: "exact" }, k),
    );
  },
  () => {
    const w = rand(2, 4);
    const p = rand(2, 5);
    return q(
      {
        key: `df-const-${w}-${p}`,
        prompt: "A crate is pushed right across a rough floor at constant velocity. Draw the friction force f.",
        hint: "Constant velocity → Newton's first law → net force zero.",
        explain: `Friction points left and is ${p} units long, exactly cancelling the ${p}-unit push.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          surface: "floor",
          directions: 4,
          maxSize: 6,
          given: [
            { dir: 270, size: w, label: "F_g" },
            { dir: 90, size: w, label: "N" },
            { dir: 0, size: p, label: "push" },
          ],
          arrows: [{ label: "f", answer: { dir: 180, size: p } }],
          check: "net",
        },
        p,
      ),
    );
  },
  () => {
    const k = rand(2, 5);
    return q(
      {
        key: `df-hang-${k}`,
        prompt: `A bird feeder hangs at rest from a rope. Its weight is ${k} units. Draw the rope's tension T.`,
        speech: `A bird feeder hangs at rest from a rope. Its weight is ${k} units. Draw the rope's tension.`,
        hint: "At rest: balanced forces.",
        explain: `T points up, ${k} units long.`,
      },
      act({ kind: "phys-forceArrows", object: "🪺", surface: "ceiling", directions: 4, maxSize: 6, given: [{ dir: 270, size: k, label: "F_g" }], arrows: [{ label: "T", answer: { dir: 90, size: k } }], check: "exact" }, k),
    );
  },
  () => {
    const p = rand(4, 6);
    const n = rand(1, p - 1);
    const w = rand(2, 4);
    return q(
      {
        key: `df-acc-${p}-${n}-${w}`,
        prompt: `A crate is pushed right and speeds up. The net force on it is ${n} units to the right. Draw the friction force f.`,
        hint: "Push + friction (+ the balanced vertical forces) must add up to the net force.",
        explain: `${p} right + f = ${n} right, so f = ${p - n} units to the left.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          surface: "floor",
          directions: 4,
          maxSize: 6,
          given: [
            { dir: 270, size: w, label: "F_g" },
            { dir: 90, size: w, label: "N" },
            { dir: 0, size: p, label: "push" },
          ],
          arrows: [{ label: "f", answer: { dir: 180, size: p - n } }],
          check: "net",
          net: { x: n, y: 0 },
        },
        p - n,
      ),
    );
  },
  () => {
    const w = rand(2, 5);
    const up = Math.random() < 0.5;
    const T = up ? w + 1 : w - 1;
    const how = up ? pick(["moving up and speeding up", "moving down and slowing down"]) : pick(["moving up and slowing down", "moving down and speeding up"]);
    return q(
      {
        key: `df-elev-${w}-${how}`,
        prompt: `An elevator (weight ${w} units) is ${how}. Its acceleration is 1 unit ${up ? "up" : "down"}. Draw the cable tension T so the net force is 1 unit ${up ? "up" : "down"}.`,
        hint: "Net force points the same way as the acceleration, not the velocity.",
        explain: `T − ${w} = ${up ? "+1" : "−1"}, so T = ${T} units up. ${up ? "T is more than the weight." : "T is less than the weight."}`,
      },
      act({ kind: "phys-forceArrows", object: "🛗", surface: "ceiling", directions: 4, maxSize: 6, given: [{ dir: 270, size: w, label: "F_g" }], arrows: [{ label: "T", answer: { dir: 90, size: T } }], check: "net", net: { x: 0, y: up ? 1 : -1 } }, T),
    );
  },
);

/** PHYS.2.4 — Newton's first law: zero net force means constant velocity. */
export const firstLaw: Gen = mix(
  () => {
    const m = pick([500, 600, 800, 1000, 1200]);
    const dir = pick(["up", "down"]);
    return q(
      {
        key: `n1-elev-${m}-${dir}`,
        prompt: `A ${m} kg elevator moves ${dir} at a constant 3 m/s. What is the tension in its cable?`,
        unit: "N",
        hint: "Constant velocity means a = 0, so the forces balance. Direction of motion doesn't matter.",
        explain: `T = mg = ${m} × 9.8 = ${s(9.8 * m)} N, whether it's going up or down.`,
      },
      kp(9.8 * m, [9.8 * m + 3 * m, 9.8 * m - 3 * m, m]),
    );
  },
  () => {
    const m = pick([10, 20, 25, 40, 50]);
    const F = pick([49, 98, 147, 196]);
    const mu = F / (9.8 * m);
    const askMu = Math.random() < 0.5 && isStep(mu, 0.01);
    return q(
      {
        key: `n1-push-${m}-${F}-${askMu}`,
        prompt: `You push a ${m} kg crate across the floor at a steady speed with a ${F} N horizontal force. ${askMu ? "What is the coefficient of kinetic friction?" : "How big is the friction force on it?"}`,
        ...(askMu ? {} : { unit: "N" }),
        hint: "Steady speed → zero net force → friction equals your push." + (askMu ? " Then μₖ = f ÷ N and N = mg." : ""),
        explain: askMu ? `f = ${F} N and N = ${m} × 9.8 = ${s(9.8 * m)} N, so μₖ = ${F} ÷ ${s(9.8 * m)} = ${s(mu)}.` : `Friction balances the push: ${F} N backward.`,
      },
      askMu ? kp(mu) : kp(F, [F + 10, 9.8 * m, F / 2]),
    );
  },
  () => {
    const m = pick([60, 70, 75, 80, 90]);
    return q(
      {
        key: `n1-sky-${m}`,
        prompt: `A ${m} kg skydiver (with gear) falls at a constant terminal velocity. How big is the air resistance on her?`,
        unit: "N",
        hint: "Terminal velocity is constant velocity: the forces balance.",
        explain: `Air resistance = mg = ${m} × 9.8 = ${s(9.8 * m)} N, up.`,
      },
      kp(9.8 * m, [m, 9.8 * m * 2, 0]),
    );
  },
  () => {
    const items = [
      { p: "A hockey puck slides across frictionless ice at a constant velocity. What is the net force on it?", a: "Zero", w: ["A forward force equal to its speed", "A small forward force", "Its weight"], e: "Constant velocity means a = 0, so F_net = 0. Nothing is needed to keep it moving." },
      { p: "A bus brakes suddenly and the passengers lurch forward. Why?", a: "Their bodies keep moving forward (inertia) while the bus slows", w: ["A forward force pushes them", "The brakes push them forward", "Gravity pulls them forward"], e: "No forward force acts. The bus decelerates and the passengers tend to keep their velocity (Newton's first law)." },
      { p: "A space probe far from any star turns off its engines while moving at 15 km/s. What happens?", a: "It keeps moving at 15 km/s in a straight line", w: ["It slows down and stops", "It speeds up", "It starts to curve"], e: "With zero net force, velocity stays constant: same speed, same direction." },
      { p: "An object has zero net force on it. Which must be true?", a: "Its velocity is constant (it may be at rest)", w: ["It is at rest", "It is slowing down", "No forces act on it"], e: "Zero net force means zero acceleration. That allows rest or steady motion, and there may be several balanced forces." },
      { p: "Which is an inertial reference frame (where Newton's first law holds)?", a: "A train moving at constant velocity", w: ["A car going around a curve", "A braking bus", "An accelerating elevator"], e: "Any frame moving at constant velocity is inertial. Accelerating frames aren't, which is why things seem to lurch in them." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `n1-concept-${i}`, prompt: it.p, hint: "Newton's first law: velocity changes only if there is a net force.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.2.3 — Newton's third law: force pairs. */
export const thirdLaw: Gen = mix(
  () => {
    const mc = pick([800, 1000, 1200, 1500]);
    const mt = mc * pick([2, 3, 4, 5]);
    const F = pick([12000, 15000, 20000, 24000, 30000]);
    const ask = pick(["force", "acar", "atruck"] as const);
    const ans = ask === "force" ? F : ask === "acar" ? F / mc : F / mt;
    return q(
      {
        key: `n3-crash-${mc}-${mt}-${F}-${ask}`,
        prompt: `A ${s(mt)} kg truck and a ${s(mc)} kg car collide. The truck pushes on the car with an average force of ${s(F)} N. ${ask === "force" ? "How big is the force of the car on the truck?" : ask === "acar" ? "What is the size of the car's acceleration? Round to 2 decimal places if needed." : "What is the size of the truck's acceleration? Round to 2 decimal places if needed."}`,
        unit: ask === "force" ? "N" : "m/s²",
        hint: "The two forces are a third-law pair: equal size, opposite direction. Then a = F ÷ m for each.",
        explain:
          ask === "force"
            ? `Exactly ${s(F)} N. Third-law forces are always equal, whatever the masses.`
            : `Both feel ${s(F)} N. a = ${s(F)} ÷ ${s(ask === "acar" ? mc : mt)} = ${s(rd(ans, 2))} m/s². ${ask === "acar" ? "The lighter car gets the bigger acceleration." : "The heavy truck barely changes speed."}`,
      },
      ask === "force" ? ch(F, [F * (mt / mc), 2 * F, F / 2], 1000, 0) : kp(rd(ans, 2)),
    );
  },
  () => {
    const items = [
      { a: "Earth pulls the apple down.", r: "The apple pulls Earth up.", w: ["The tree branch pushes the apple up.", "The ground pushes the apple up.", "Air pushes the apple up."] },
      { a: "Your foot pushes backward on the ground.", r: "The ground pushes your foot forward.", w: ["Friction pushes you backward.", "Gravity pulls your foot down.", "Your other foot pushes forward."] },
      { a: "A rocket pushes exhaust gas downward.", r: "The gas pushes the rocket upward.", w: ["Gravity pulls the rocket down.", "The air pushes the rocket up.", "The launch pad pushes the rocket up."] },
      { a: "A book pushes down on a table.", r: "The table pushes up on the book.", w: ["Earth pulls the book down.", "The floor pushes up on the table.", "The book pulls Earth up."] },
      { a: "A swimmer pushes water backward.", r: "The water pushes the swimmer forward.", w: ["The water drags the swimmer backward.", "Gravity pulls the swimmer down.", "The swimmer's arms pull the body forward."] },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q(
      {
        key: `n3-pair-${i}`,
        prompt: `"${it.a}" What is its Newton's-third-law partner force?`,
        hint: "Swap the two objects: 'A pushes B' pairs with 'B pushes A', the same kind of force.",
        explain: `${it.r} Same type of force, same size, opposite direction, acting on the other object.`,
      },
      lab(it.r, it.w),
    );
  },
  () => {
    const m1 = pick([40, 50, 60]);
    const m2 = pick([70, 75, 80, 100]);
    const F = pick([120, 150, 200, 240, 300]);
    const which = Math.random() < 0.5;
    const a = F / (which ? m1 : m2);
    return q(
      {
        key: `n3-skate-${m1}-${m2}-${F}-${which}`,
        prompt: `Two skaters (${m1} kg and ${m2} kg) push off each other with a ${F} N force. What is the acceleration of the ${which ? m1 : m2} kg skater? Round to 2 decimal places if needed.`,
        unit: "m/s²",
        hint: "Each skater feels the same size force (third law). a = F ÷ m.",
        explain: `a = ${F} ÷ ${which ? m1 : m2} = ${s(rd(a, 2))} m/s².`,
      },
      kp(rd(a, 2)),
    );
  },
  () => {
    const items = [
      { p: "A book rests on a table. Why aren't its weight and the normal force a third-law pair?", a: "They act on the same object", w: ["They aren't equal in size", "They point the same way", "One of them isn't a real force"], e: "Third-law pairs act on two different objects. Weight and normal force both act on the book (they balance by the first law)." },
      { p: "A horse pulls a cart. If the cart pulls back on the horse equally hard, how can they speed up?", a: "The ground pushes the horse forward harder than the cart pulls back", w: ["The horse's pull is a little bigger than the cart's", "The forces cancel, so they can't", "The cart's pull is delayed"], e: "Pair forces act on different objects. The horse speeds up because of the forces on the horse: the ground's push forward beats the cart's pull back." },
      { p: "A mosquito hits a moving windshield. Compare the force on the mosquito with the force on the windshield.", a: "They are equal", w: ["The force on the mosquito is bigger", "The force on the windshield is bigger", "There's no force on the windshield"], e: "Equal and opposite. The mosquito's acceleration is enormous because its mass is tiny." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `n3-concept-${i}`, prompt: it.p, hint: "A third-law pair: same type of force, equal size, opposite direction, on two different objects.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.2.5 — Newton's second law: F_net = ma. */
export const secondLaw: Gen = mix(
  () => {
    const [m, F1, F2] = until(
      () => [pick([2, 4, 5, 8, 10]), rand(10, 60), rand(4, 40)],
      ([mm, a, b]) => a > b && isStep((a - b) / mm, 0.5),
    );
    const a = (F1 - F2) / m;
    return q(
      {
        key: `n2-fbd-${m}-${F1}-${F2}`,
        prompt: `Two horizontal forces act on a ${m} kg crate on frictionless ice. What is its acceleration?`,
        visual: {
          kind: "phys-forces",
          objectLabel: m,
          surface: "floor",
          forces: [
            { dir: 0, size: F1, label: F1 },
            { dir: 180, size: F2, label: F2 },
            { dir: 90, size: 9.8 * m, label: "N", colour: "leaf" },
            { dir: 270, size: 9.8 * m, label: "mg", colour: "wave" },
          ],
          motion: { dir: 0, label: "a" },
        },
        needsVisual: true,
        unit: "m/s²",
        hint: "Find the net force first (vertical forces cancel), then a = F_net ÷ m.",
        explain: `F_net = ${F1} − ${F2} = ${F1 - F2} N, so a = ${F1 - F2} ÷ ${m} = ${s(a)} m/s².`,
      },
      kp(a, [(F1 + F2) / m, F1 / m, a * 2]),
    );
  },
  () => {
    const m = pick([5, 10, 20, 25]);
    const a = pick([1, 1.5, 2, 3, 4]);
    const f = pick([10, 15, 20, 30, 40]);
    return q(
      {
        key: `n2-findF-${m}-${a}-${f}`,
        prompt: `A ${m} kg sled must accelerate at ${a} m/s². Friction on it is ${f} N. How hard must you pull (horizontally)?`,
        unit: "N",
        hint: "F_net = ma, and F_net = F_pull − f. Solve for F_pull.",
        explain: `F_net = ${m} × ${a} = ${s(m * a)} N. F_pull = ${s(m * a)} + ${f} = ${s(m * a + f)} N.`,
      },
      kp(m * a + f, [m * a, m * a - f, f]),
    );
  },
  () => {
    const m = pick([2, 5, 10]);
    const a = pick([-3, -2, -1, 1, 2, 3, 0.5, -0.5]);
    const T = m * (9.8 + a);
    return q(
      {
        key: `n2-lift-${m}-${a}`,
        prompt: `A rope lifts a ${m} kg bucket with a tension of ${s(T)} N. What is the bucket's acceleration (up is +)?`,
        unit: "m/s²",
        hint: "F_net = T − mg (up is +). Then a = F_net ÷ m.",
        explain: `mg = ${s(9.8 * m)} N. F_net = ${s(T)} − ${s(9.8 * m)} = ${s(m * a)} N, so a = ${s(m * a)} ÷ ${m} = ${s(a)} m/s².`,
      },
      sk(a, [-a, T / m, a + 1]),
    );
  },
  () => {
    const m = pick([0.5, 2, 4, 5]);
    const F = pick([2, 4, 6, 10]);
    const t = pick([2, 3, 4, 5]);
    const v = (F * t) / m;
    return q(
      {
        key: `n2-speed-${m}-${F}-${t}`,
        prompt: `A ${s(m)} kg cart starts at rest. A net force of ${F} N acts on it for ${t} s. How fast is it moving then?`,
        unit: "m/s",
        hint: "a = F ÷ m, then v = at.",
        explain: `a = ${F} ÷ ${s(m)} = ${s(F / m)} m/s², so v = ${s(F / m)} × ${t} = ${s(v)} m/s.`,
      },
      kp(v),
    );
  },
  () => {
    const items = [
      { c: "the net force doubles and the mass stays the same", a: "it doubles" },
      { c: "the mass doubles and the net force stays the same", a: "it halves" },
      { c: "both the net force and the mass double", a: "it stays the same" },
      { c: "the net force triples and the mass halves", a: "it becomes 6 times as big" },
      { c: "the net force halves and the mass doubles", a: "it becomes a quarter" },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q(
      {
        key: `n2-change-${i}`,
        prompt: `What happens to an object's acceleration if ${it.c}?`,
        hint: "a = F_net ÷ m: proportional to force, inversely proportional to mass.",
        explain: `a = F_net ÷ m, so ${it.a}.`,
      },
      lab(it.a, ["it doubles", "it halves", "it stays the same", "it becomes 6 times as big", "it becomes a quarter", "it becomes 4 times as big"].filter((x) => x !== it.a)),
    );
  },
);

/** PHYS.2.5, PHYS.2.1 — connected objects: contact forces, tension, Atwood machines. */
export const connectedObjects: Gen = mix(
  () => {
    const [m1, m2, F] = until(
      () => [rand(1, 6), rand(1, 6), pick([12, 18, 20, 24, 30, 36])],
      ([a, b, f]) => isStep(f / (a + b), 0.5),
    );
    const a = F / (m1 + m2);
    const askC = Math.random() < 0.5;
    return q(
      {
        key: `con-push-${m1}-${m2}-${F}-${askC}`,
        prompt: `On a frictionless floor, you push block A (${m1} kg) with ${F} N, and A pushes block B (${m2} kg) in front of it. ${askC ? "How hard does A push on B?" : "What is their acceleration?"}`,
        unit: askC ? "N" : "m/s²",
        hint: askC ? "First find a for the A+B system. B alone is pushed only by A, so F_AB = m_B a." : "Treat A and B as one system: total mass, external force.",
        explain: askC
          ? `a = ${F} ÷ ${m1 + m2} = ${s(a)} m/s². The force on B is m_B a = ${m2} × ${s(a)} = ${s(m2 * a)} N.`
          : `System mass ${m1 + m2} kg, external force ${F} N: a = ${s(a)} m/s².`,
      },
      kp(askC ? m2 * a : a, askC ? [F, m1 * a, F / 2] : [F / m1, F / m2]),
    );
  },
  () => {
    const [m1, m2] = pick([
      [3, 4],
      [2, 5],
      [5, 9],
      [1, 3],
      [2, 3],
      [3, 5],
      [1, 6],
      [6, 8],
    ]);
    const askT = Math.random() < 0.5;
    const a = ((m2 - m1) * 9.8) / (m1 + m2);
    const T = (2 * m1 * m2 * 9.8) / (m1 + m2);
    return q(
      {
        key: `con-atwood-${m1}-${m2}-${askT}`,
        prompt: `An Atwood machine hangs ${m1} kg and ${m2} kg masses over a light, frictionless pulley. ${askT ? "What is the tension in the string?" : "What is the size of their acceleration?"}`,
        unit: askT ? "N" : "m/s²",
        hint: askT ? "Find a first, then use one mass: T − m₁g = m₁a." : "System: the net force is (m₂ − m₁)g, pulling on a total mass m₁ + m₂.",
        explain: askT
          ? `a = (${m2} − ${m1})(9.8) ÷ ${m1 + m2} = ${s(a)} m/s². For the ${m1} kg mass: T = ${m1}(9.8 + ${s(a)}) = ${s(T)} N.`
          : `a = (${m2} − ${m1}) × 9.8 ÷ (${m1} + ${m2}) = ${s((m2 - m1) * 9.8)} ÷ ${m1 + m2} = ${s(a)} m/s².`,
      },
      kp(askT ? T : a, askT ? [m1 * 9.8, m2 * 9.8, (m1 + m2) * 4.9] : [9.8, (m2 - m1) * 9.8, 9.8 / (m1 + m2)]),
    );
  },
  () => {
    const [m1, m2] = pick([
      [3, 4],
      [5, 2],
      [6, 1],
      [2, 5],
      [1, 1],
      [3, 2],
      [4, 1],
    ]);
    const askT = Math.random() < 0.5;
    const a = (m2 * 9.8) / (m1 + m2);
    return q(
      {
        key: `con-table-${m1}-${m2}-${askT}`,
        prompt: `A ${m1} kg block on a frictionless table is tied over a pulley to a hanging ${m2} kg block. ${askT ? "What is the string tension?" : "What is their acceleration?"}`,
        unit: askT ? "N" : "m/s²",
        hint: "System: only the hanging block's weight drives both masses. Then the string is the only horizontal force on the table block.",
        explain: askT
          ? `a = ${m2}(9.8) ÷ ${m1 + m2} = ${s(a)} m/s²; T = m_table × a = ${m1} × ${s(a)} = ${s(m1 * a)} N (less than the hanging weight).`
          : `a = m₂g ÷ (m₁ + m₂) = ${s(m2 * 9.8)} ÷ ${m1 + m2} = ${s(a)} m/s².`,
      },
      kp(askT ? m1 * a : a, askT ? [m2 * 9.8, m2 * a] : [9.8, m2 * 9.8 / m1]),
    );
  },
  () => {
    const items = [
      { p: "Two carts joined by a string are pulled by a force F. If you choose both carts as the system, which force do you leave out of F_net = ma?", a: "The string tension between them", w: ["The pull F", "Friction from the floor", "Gravity"], e: "The string tension is internal to the two-cart system; its pair forces cancel. Only external forces like F count." },
      { p: "In an Atwood machine with unequal masses, how does the string tension compare with the two weights?", a: "Between the two weights", w: ["Equal to the heavier weight", "Equal to the lighter weight", "Equal to the sum of the weights"], e: "The light mass accelerates up (T > m₁g) and the heavy one accelerates down (T < m₂g), so T is in between." },
      { p: "A train engine pulls 3 identical cars. Where is the coupling tension greatest?", a: "Between the engine and the first car", w: ["Between the last two cars", "It is the same everywhere", "Between the 2nd and 3rd cars"], e: "The first coupling must accelerate all 3 cars; the last only pulls 1 car. T = (mass behind) × a." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `con-concept-${i}`, prompt: it.p, hint: "Choose a system. Internal forces cancel; only external forces change the system's motion.", explain: it.e }, lab(it.a, it.w));
  },
);

/** Ratio text like "4F", "F/4", "9F/2". */
function times(sym: string, num: number, den: number) {
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const k = g(num, den);
  const n = num / k;
  const d = den / k;
  const top = n === 1 ? sym : `${n}${sym}`;
  return d === 1 ? top : `${top}/${d}`;
}

/** PHYS.2.6 — gravitational force and weight; apparent weight. */
export const gravitation: Gen = mix(
  () => {
    const a = pick([1, 2, 3]);
    const b = pick([1, 2]);
    const c = pick([1, 2, 3]);
    if (a === 1 && b === 1 && c === 1) return gravitation();
    const num = a * b;
    const den = c * c;
    const correct = times("F", num, den);
    const changes = [a > 1 ? `m₁ is multiplied by ${a}` : "", b > 1 ? `m₂ is doubled` : "", c > 1 ? `the distance is multiplied by ${c}` : ""].filter(Boolean);
    return q(
      {
        key: `grav-ratio-${a}-${b}-${c}`,
        prompt: `Two masses attract with force F. What is the new force if ${changes.join(" and ")}?`,
        visual: { kind: "phys-orbit", scene: "pair", masses: [{ label: "m₁", size: 1.2 }, { label: "m₂", size: 0.8 }], distance: "r", forceLabels: ["F", "F"] },
        hint: "F = Gm₁m₂ ÷ r². Multiply by the mass factors and divide by the distance factor squared.",
        explain: `F × ${a} × ${b} ÷ ${c}² = ${correct}.`,
      },
      lab(correct, [times("F", num, c), times("F", num * c * c, 1), times("F", den, num), times("F", num + 1, den), times("F", num, den * 2)]),
    );
  },
  () => {
    const [mf, rf, gf] = pick([
      [2, 1, 2],
      [1, 2, 0.25],
      [4, 2, 1],
      [8, 2, 2],
      [2, 2, 0.5],
      [1, 0.5, 4],
      [0.5, 1, 0.5],
      [16, 2, 4],
    ]);
    const g = 9.8 * gf;
    return q(
      {
        key: `grav-planet-${mf}-${rf}`,
        prompt: `A planet has ${mf === 1 ? "the same mass as" : `${s(mf)} times the mass of`} Earth and ${rf === 1 ? "the same radius" : `${s(rf)} times its radius`}. What is g at its surface?`,
        unit: "m/s²",
        hint: "g = GM ÷ R². Scale Earth's 9.8 m/s² by (mass factor) ÷ (radius factor)².",
        explain: `g = 9.8 × ${s(mf)} ÷ ${s(rf)}² = ${s(g)} m/s².`,
      },
      kp(g, [9.8 * (mf / rf), 9.8 * mf, 9.8 / gf]),
    );
  },
  () => {
    const m = pick([50, 60, 70, 80]);
    const a = pick([1, 2, 3, 0.5]);
    const sc = pick([
      { d: "moving up and speeding up", s: 1 },
      { d: "moving up and slowing down", s: -1 },
      { d: "moving down and speeding up", s: -1 },
      { d: "moving down and slowing down", s: 1 },
    ]);
    const N = m * (9.8 + sc.s * a);
    return q(
      {
        key: `grav-elev-${m}-${a}-${sc.d}`,
        prompt: `A ${m} kg student stands on a scale in an elevator that is ${sc.d} at ${s(a)} m/s². What does the scale read?`,
        unit: "N",
        hint: "Find the direction of a (not v!). Then N − mg = ma with up as +.",
        explain: `a is ${sc.s > 0 ? "up" : "down"}, so N = m(g ${sc.s > 0 ? "+" : "−"} a) = ${m}(9.8 ${sc.s > 0 ? "+" : "−"} ${s(a)}) = ${s(N)} N. (Her true weight is ${s(9.8 * m)} N.)`,
      },
      kp(N, [9.8 * m, m * (9.8 - sc.s * a), m * a]),
    );
  },
  () => {
    const m = pick([5, 10, 20, 60, 75]);
    const askMass = Math.random() < 0.4;
    return q(
      {
        key: `grav-moon-${m}-${askMass}`,
        prompt: `An astronaut takes a ${m} kg pack to the Moon, where g = 1.6 m/s². ${askMass ? "What is the pack's mass on the Moon?" : "What does the pack weigh on the Moon?"}`,
        unit: askMass ? "kg" : "N",
        hint: "Mass is the amount of matter (the same everywhere). Weight = mg depends on g.",
        explain: askMass ? `Still ${m} kg. Only weight changes.` : `W = ${m} × 1.6 = ${s(1.6 * m)} N (on Earth it's ${s(9.8 * m)} N).`,
      },
      kp(askMass ? m : 1.6 * m, askMass ? [m / 6, 1.6 * m] : [9.8 * m, m]),
    );
  },
);

/** PHYS.2.7 — static and kinetic friction. */
export const friction: Gen = mix(
  () => {
    const m = pick([10, 20, 25, 50]);
    const muS = pick([0.4, 0.5, 0.6]);
    const P = rand(2, Math.floor((muS * 9.8 * m) / 10)) * 10 - 5;
    return q(
      {
        key: `fr-static-${m}-${muS}-${P}`,
        prompt: `A ${m} kg box sits on a floor (μₛ = ${muS}). You push it horizontally with ${P} N and it doesn't move. How big is the friction force?`,
        unit: "N",
        hint: "Static friction only grows as big as it needs to. The box is balanced.",
        explain: `It doesn't move, so friction exactly balances your ${P} N push. (The most static friction could give is μₛmg = ${s(muS * 9.8 * m)} N.)`,
      },
      kp(P, [muS * 9.8 * m, 9.8 * m, 0]),
    );
  },
  () => {
    const m = 10;
    const muS = pick([0.5, 0.6]);
    const muK = pick([0.2, 0.3, 0.4]);
    const F = pick([40, 50, 60, 70, 80, 90]);
    const moves = F > muS * 98;
    const a = (F - muK * 98) / m;
    return q(
      {
        key: `fr-push-${muS}-${muK}-${F}`,
        prompt: `A ${m} kg crate rests on the floor (μₛ = ${muS}, μₖ = ${muK}). You push horizontally with ${F} N. What is its acceleration?`,
        unit: "m/s²",
        hint: "First check: is the push bigger than the maximum static friction μₛmg? If so, it slides and kinetic friction μₖmg acts.",
        explain: moves
          ? `Max static friction = ${muS} × 98 = ${s(muS * 98)} N < ${F} N, so it slides. a = (${F} − ${s(muK * 98)}) ÷ ${m} = ${s(a)} m/s².`
          : `Max static friction = ${s(muS * 98)} N ≥ ${F} N, so it doesn't move: a = 0.`,
      },
      kp(moves ? a : 0, [a, (F - muS * 98) / m, F / m]),
    );
  },
  () => {
    const [v, mu, d] = pick([
      [7, 0.25, 10],
      [7, 0.5, 5],
      [14, 0.5, 20],
      [14, 0.4, 25],
      [14, 0.2, 50],
      [7, 0.1, 25],
      [14, 0.8, 12.5],
    ]);
    const askD = Math.random() < 0.6;
    return q(
      {
        key: `fr-stop-${v}-${mu}-${askD}`,
        prompt: `A hockey puck slides at ${v} m/s on a rough surface with μₖ = ${mu}. ${askD ? "How far does it slide before stopping?" : "What is the size of its deceleration?"}`,
        unit: askD ? "m" : "m/s²",
        hint: "Friction μₖmg is the net force, so a = μₖg (the mass cancels). Then v² = 2aΔx.",
        explain: askD ? `a = ${mu} × 9.8 = ${s(mu * 9.8)} m/s². Δx = v² ÷ 2a = ${v * v} ÷ ${s(2 * mu * 9.8)} = ${s(d)} m.` : `a = μₖg = ${mu} × 9.8 = ${s(mu * 9.8)} m/s², whatever its mass.`,
      },
      kp(askD ? d : mu * 9.8),
    );
  },
  () => {
    const N = pick([20, 40, 50]);
    const fs = pick([0.5, 0.6, 0.8]) * N;
    const fk = pick([0.25, 0.3, 0.4]) * N;
    const ask = pick(["muS", "muK", "max"] as const);
    const ans = ask === "muS" ? fs / N : ask === "muK" ? fk / N : fs;
    return q(
      {
        key: `fr-graph-${N}-${fs}-${fk}-${ask}`,
        prompt: `The graph shows friction on a box (normal force ${N} N) as the horizontal push slowly increases. ${ask === "muS" ? "What is μₛ?" : ask === "muK" ? "What is μₖ?" : "What is the maximum static friction?"}`,
        visual: graph(
          [0, 50],
          [0, 50],
          [
            [0, 0],
            [fs, fs],
            [fs + 0.01, fk],
            [48, fk],
          ],
          "f (N) vs push (N)",
        ),
        needsVisual: true,
        ...(ask === "max" ? { unit: "N" } : {}),
        hint: "Before it slides, friction matches the push (the rising line). The peak is μₛN; after it slips, friction drops to the flat μₖN.",
        explain:
          ask === "max"
            ? `The line peaks at ${s(fs)} N, the largest static friction.`
            : ask === "muS"
              ? `Peak = ${s(fs)} N = μₛ × ${N}, so μₛ = ${s(fs / N)}.`
              : `Once sliding, friction is ${s(fk)} N = μₖ × ${N}, so μₖ = ${s(fk / N)}.`,
      },
      kp(ans),
    );
  },
);

const RAMP = Math.asin(0.6) * (180 / Math.PI);

/** PHYS.2.5, PHYS.2.7 — inclines (the 3-4-5 ramp has sin θ = 0.6, cos θ = 0.8). */
export const inclines: Gen = mix(
  () => {
    const m = pick([1, 2, 5, 10]);
    const ask = pick(["a", "N", "par"] as const);
    const ans = ask === "a" ? 5.88 : ask === "N" ? 7.84 * m : 5.88 * m;
    return q(
      {
        key: `inc-345-${m}-${ask}`,
        prompt: `A ${m} kg block is on a frictionless ramp 5 m long and 3 m high (sin θ = 0.6, cos θ = 0.8). ${ask === "a" ? "What is its acceleration down the ramp?" : ask === "N" ? "What is the normal force on it?" : "What is the component of gravity along the ramp?"}`,
        visual: { kind: "phys-incline", angle: RAMP, angleLabel: "θ", length: 5, height: 3, base: 4, unit: "m", blockLabel: m, friction: "frictionless" },
        unit: ask === "a" ? "m/s²" : "N",
        hint: ask === "N" ? "Perpendicular to the ramp, N balances mg cos θ." : "Along the ramp, gravity's component is mg sin θ.",
        explain:
          ask === "a"
            ? `a = g sin θ = 9.8 × 0.6 = 5.88 m/s² (the mass cancels).`
            : ask === "N"
              ? `N = mg cos θ = ${m} × 9.8 × 0.8 = ${s(7.84 * m)} N.`
              : `mg sin θ = ${m} × 9.8 × 0.6 = ${s(5.88 * m)} N.`,
      },
      kp(ans, [9.8 * m, ask === "a" ? 7.84 : 5.88 * m, ask === "N" ? 5.88 * m : 7.84 * m]),
    );
  },
  () => {
    const mu = pick([0.25, 0.5, 0.75]);
    const a = 9.8 * (0.6 - 0.8 * mu);
    return q(
      {
        key: `inc-fric-${mu}`,
        prompt: `A box slides down a 3-4-5 ramp (sin θ = 0.6, cos θ = 0.8) with μₖ = ${mu}. What is its acceleration?`,
        visual: { kind: "phys-incline", angle: RAMP, angleLabel: "θ", length: 5, height: 3, unit: "m", friction: `μₖ = ${mu}`, motion: "down", motionLabel: "a" },
        unit: "m/s²",
        hint: "Along the slope: mg sin θ down, μₖmg cos θ up. Divide the net by m.",
        explain: `a = g(sin θ − μₖ cos θ) = 9.8(0.6 − ${mu} × 0.8) = ${s(a)} m/s².${a === 0 ? " It slides at constant velocity." : ""}`,
      },
      kp(a, [5.88, 9.8 * (0.6 + 0.8 * mu), 9.8 * (0.6 - mu)]),
    );
  },
  () => {
    const muS = pick([0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
    const slides = 0.75 > muS;
    return q(
      {
        key: `inc-slip-${muS}`,
        prompt: `A block is placed at rest on a 3-4-5 ramp (tan θ = 0.75). The coefficient of static friction is ${muS}. What happens?`,
        visual: { kind: "phys-incline", angle: RAMP, angleLabel: "θ", height: 3, base: 4, unit: "m", friction: `μₛ = ${muS}` },
        hint: "It slips if mg sin θ > μₛ mg cos θ, i.e. if tan θ > μₛ.",
        explain: slides ? `tan θ = 0.75 > ${muS}, so gravity along the slope beats the maximum static friction: it slides.` : `tan θ = 0.75 ≤ ${muS}, so static friction can hold it: it stays put.`,
      },
      lab(slides ? "It slides down" : "It stays at rest", [slides ? "It stays at rest" : "It slides down", "It depends on the block's mass", "It slides up"]),
    );
  },
  () => {
    const m = pick([2, 4, 5, 10]);
    const ask = pick(["a", "par"] as const);
    return q(
      {
        key: `inc-30-${m}-${ask}`,
        prompt: `A ${m} kg cart rolls freely down a frictionless 30° ramp. ${ask === "a" ? "What is its acceleration?" : "What is the size of gravity's component along the ramp?"} (sin 30° = 0.5)`,
        visual: { kind: "phys-incline", angle: 30, blockLabel: m, friction: "frictionless", motion: "down", motionLabel: "a" },
        unit: ask === "a" ? "m/s²" : "N",
        hint: "Along the ramp: mg sin θ.",
        explain: ask === "a" ? "a = g sin 30° = 4.9 m/s²." : `mg sin 30° = ${m} × 9.8 × 0.5 = ${s(4.9 * m)} N.`,
      },
      kp(ask === "a" ? 4.9 : 4.9 * m, [9.8, 9.8 * m, 8.5]),
    );
  },
  () => {
    const items = [
      { p: "A block rests on a ramp. If the ramp is made steeper (block still at rest), what happens to the normal force?", a: "It decreases", w: ["It increases", "It stays the same", "It becomes equal to mg"], e: "N = mg cos θ, and cos θ gets smaller as θ grows." },
      { p: "A block rests on a ramp. If the ramp is made steeper (block still at rest), what happens to the static friction force?", a: "It increases", w: ["It decreases", "It stays the same", "It becomes zero"], e: "Static friction balances mg sin θ, which grows with θ." },
      { p: "Two blocks of different mass slide down the same frictionless ramp. Compare their accelerations.", a: "They are equal", w: ["The heavier one's is bigger", "The lighter one's is bigger", "It depends on their size"], e: "a = g sin θ. The mass cancels." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `inc-concept-${i}`, prompt: it.p, hint: "Split gravity into mg sin θ (along) and mg cos θ (into the ramp).", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.2.8 — springs and Hooke's law, with graphing (Do it). */
export const hookesLaw: Gen = mix(
  () => {
    const k = pick([50, 100, 200, 400, 500]);
    const x = pick([0.02, 0.05, 0.1, 0.15, 0.2, 0.3]);
    const askK = Math.random() < 0.4;
    const F = k * x;
    return q(
      {
        key: `hk-calc-${k}-${x}-${askK}`,
        prompt: askK ? `A force of ${s(F)} N stretches a spring by ${s(x)} m. What is its spring constant?` : `A spring with k = ${k} N/m is stretched ${s(x)} m. How big is its force?`,
        unit: askK ? "N/m" : "N",
        hint: "Hooke's law: F = kx (x in metres).",
        explain: askK ? `k = F ÷ x = ${s(F)} ÷ ${s(x)} = ${k} N/m.` : `F = ${k} × ${s(x)} = ${s(F)} N.`,
      },
      kp(askK ? k : F),
    );
  },
  () => {
    const k = pick([49, 98, 196, 490]);
    const m = pick([0.5, 1, 2]);
    const x = (9.8 * m) / k;
    return q(
      {
        key: `hk-hang-${k}-${m}`,
        prompt: `A ${s(m)} kg mass hangs at rest from a spring with k = ${k} N/m. How far is the spring stretched?`,
        visual: { kind: "phys-oscillator", type: "spring", orientation: "vertical", displacement: 0, massLabel: m, kLabel: k },
        unit: "m",
        hint: "At rest the spring force kx balances the weight mg.",
        explain: `kx = mg → x = ${s(m)} × 9.8 ÷ ${k} = ${s(x)} m.`,
      },
      kp(x),
    );
  },
  () => {
    const kA = pick([1, 2, 3]);
    let kB = pick([0.5, 1, 1.5, 2, 4]);
    while (kB === kA) kB = pick([0.5, 1, 1.5, 2, 4]);
    const askA = Math.random() < 0.5;
    const k = askA ? kA : kB;
    return q(
      {
        key: `hk-graph-${kA}-${kB}-${askA}`,
        prompt: `The graph shows force vs stretch for springs A and B. What is the spring constant of ${askA ? "A" : "B"} in N/m?`,
        visual: {
          kind: "plot",
          x: [0, 10],
          y: [0, 20],
          xLabel: "x (cm)",
          yLabel: "F (N)",
          curves: [
            { fn: (x) => kA * x, colour: "wave", label: "A" },
            { fn: (x) => kB * x, colour: "berry", label: "B" },
          ],
          points: [1, 2, 4, 5, 8, 10].flatMap((x) => [kA * x, kB * x].map((y) => ({ x, y }))).filter((p) => p.y <= 20 && Number.isInteger(p.y) && p.x > 0 && p.y % 2 === 0),
        },
        needsVisual: true,
        unit: "N/m",
        hint: "k is the slope: F ÷ x. Read a clear point, then change cm to m (×100).",
        explain: `The slope of ${askA ? "A" : "B"} is ${s(k)} N per cm = ${s(k * 100)} N/m. The steeper line is the stiffer spring.`,
      },
      kp(k * 100, [k, k * 10, (askA ? kB : kA) * 100]),
    );
  },
  () => {
    const k = pick([1, 2, 0.5]);
    const xs = k === 2 ? [1, 2, 4] : k === 1 ? [2, 5, 8] : [2, 4, 8];
    const pts = xs.map((x, i) => ({ x, y: k * x, label: LETTERS[i] }));
    return q(
      {
        key: `hk-plot-${k}`,
        prompt: "A spring was stretched by hanging weights. Plot F against x (x across, F up).",
        speech: "A spring was stretched by hanging weights. Plot force against stretch, with x across and F up.",
        visual: { kind: "table", header: ["Point", "x (cm)", "F (N)"], rows: pts.map((p) => [p.label, p.x, p.y]) },
        hint: "Each row is one point: stretch across, force up.",
        explain: `They lie on a line through the origin: F = kx with slope ${s(k)} N/cm, so k = ${s(k * 100)} N/m.`,
      },
      act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, k),
    );
  },
  () => {
    const k = pick([1, 2, 3, 0.5]);
    return q(
      {
        key: `hk-draw-${k}`,
        prompt: `Draw the F–x line for a spring with k = ${s(k)} N/cm (x in cm across, F in N up).`,
        hint: `F = kx: it starts at (0, 0) and rises ${s(k)} N for every cm.`,
        explain: `A straight line through the origin with slope ${s(k)}.`,
      },
      act({ kind: "drawLine", m: k, b: 0, size: 10, quadrants: 1 }, k),
    );
  },
  () => {
    const sc = pick([
      { k1: 100, k2: 100, par: true },
      { k1: 100, k2: 100, par: false },
      { k1: 30, k2: 60, par: false },
      { k1: 200, k2: 300, par: true },
      { k1: 40, k2: 60, par: true },
      { k1: 60, k2: 120, par: false },
    ]);
    const k = sc.par ? sc.k1 + sc.k2 : (sc.k1 * sc.k2) / (sc.k1 + sc.k2);
    return q(
      {
        key: `hk-combo-${sc.k1}-${sc.k2}-${sc.par}`,
        prompt: `Springs of ${sc.k1} N/m and ${sc.k2} N/m are joined ${sc.par ? "side by side (in parallel)" : "end to end (in series)"}. What is the effective spring constant?`,
        unit: "N/m",
        hint: sc.par ? "In parallel each spring stretches the same amount and the forces add: k = k₁ + k₂." : "In series each spring feels the same force and the stretches add: 1/k = 1/k₁ + 1/k₂.",
        explain: sc.par ? `k = ${sc.k1} + ${sc.k2} = ${k} N/m (stiffer).` : `1/k = 1/${sc.k1} + 1/${sc.k2}, so k = ${s(k)} N/m (softer than either).`,
      },
      kp(k, [sc.k1 + sc.k2, (sc.k1 * sc.k2) / (sc.k1 + sc.k2), (sc.k1 + sc.k2) / 2]),
    );
  },
);

/** PHYS.2.9 — uniform circular motion. */
export const circularMotion: Gen = mix(
  () => {
    const [v, r] = until(
      () => [pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]), pick([1, 2, 4, 5, 8, 10, 20, 25, 50])],
      ([vv, rr]) => isStep((vv * vv) / rr, 0.1) && (vv * vv) / rr <= 100,
    );
    const m = pick([0.5, 2, 1000, 60]);
    const askF = Math.random() < 0.5;
    const a = (v * v) / r;
    return q(
      {
        key: `circ-calc-${v}-${r}-${m}-${askF}`,
        prompt: `A ${s(m)} kg object moves in a circle of radius ${r} m at a steady ${v} m/s. ${askF ? "What net force does it need?" : "What is its centripetal acceleration?"}`,
        unit: askF ? "N" : "m/s²",
        hint: "a_c = v² ÷ r, toward the centre. F_net = m a_c.",
        explain: askF ? `a_c = ${v * v} ÷ ${r} = ${s(a)} m/s²; F = ${s(m)} × ${s(a)} = ${s(m * a)} N toward the centre.` : `a_c = v² ÷ r = ${v * v} ÷ ${r} = ${s(a)} m/s².`,
      },
      kp(askF ? m * a : a, askF ? [m * v / r, m * a * 2] : [v / r, (2 * v) / r, v * v * r]),
    );
  },
  () => {
    const [v, r, mu] = pick([
      [14, 20, 1.0],
      [7, 10, 0.5],
      [14, 40, 0.5],
      [21, 90, 0.5],
      [7, 25, 0.2],
      [14, 50, 0.4],
      [14, 100, 0.2],
      [21, 50, 0.9],
    ]);
    return q(
      {
        key: `circ-curve-${v}-${r}`,
        prompt: `A car rounds a flat curve of radius ${r} m at ${v} m/s. What is the smallest coefficient of static friction that keeps it from skidding?`,
        hint: "Static friction supplies the centripetal force: μₛmg ≥ mv² ÷ r. The mass cancels.",
        explain: `μₛ = v² ÷ (gr) = ${v * v} ÷ (9.8 × ${r}) = ${s(mu)}.`,
      },
      kp(mu),
    );
  },
  () => {
    const m = pick([50, 60, 70]);
    const [v, r] = pick([
      [10, 5],
      [12, 6],
      [15, 9],
      [10, 4],
      [20, 16],
    ]);
    const top = Math.random() < 0.5;
    const c = (v * v) / r;
    const N = m * (top ? c - 9.8 : c + 9.8);
    return q(
      {
        key: `circ-loop-${m}-${v}-${r}-${top}`,
        prompt: `A ${m} kg rider goes through a vertical loop of radius ${r} m at ${v} m/s. What normal force does the seat exert at the ${top ? "top (rider upside down)" : "bottom"}?`,
        unit: "N",
        hint: top ? "At the top, N and mg both point down toward the centre: N + mg = mv² ÷ r." : "At the bottom, N points up (toward the centre) and mg down: N − mg = mv² ÷ r.",
        explain: `mv²/r = ${m} × ${v * v} ÷ ${r} = ${s(m * c)} N. ${top ? `N = ${s(m * c)} − ${s(9.8 * m)}` : `N = ${s(m * c)} + ${s(9.8 * m)}`} = ${s(N)} N.`,
      },
      kp(N, [m * c, m * (top ? c + 9.8 : c - 9.8), 9.8 * m]),
    );
  },
  () => {
    const items = [
      { p: "What provides the centripetal force on a car turning on a flat road?", a: "Static friction from the road", w: ["The engine", "Kinetic friction", "A centrifugal force"], e: "The tyres don't slide sideways, so static friction pushes the car toward the centre of the turn." },
      { p: "What provides the centripetal force on the Moon orbiting Earth?", a: "Earth's gravity", w: ["The Moon's speed", "Tension", "A centrifugal force"], e: "Gravity pulls the Moon toward Earth, the centre of its (nearly) circular orbit." },
      { p: "A ball on a string is whirled in a horizontal circle. The string breaks. Which way does the ball go?", a: "Along the tangent, in the direction it was moving", w: ["Straight outward from the centre", "Straight toward the centre", "It keeps circling"], e: "With no inward force, the ball keeps its velocity at that instant, which is tangent to the circle." },
      { p: "An object moves in a circle at constant speed. Which way does its acceleration point?", a: "Toward the centre", w: ["Along the velocity", "Away from the centre", "It is zero"], e: "The speed is constant but the direction keeps turning toward the centre, so a points inward." },
      { p: "A car takes a curve at twice the speed. How much centripetal force does it need?", a: "4 times as much", w: ["Twice as much", "The same", "Half as much"], e: "F = mv² ÷ r, so doubling v quadruples F." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q(
      {
        key: `circ-concept-${i}`,
        prompt: it.p,
        visual: i === 1 ? { kind: "phys-orbit", scene: "orbit", planet: "🌍", satellite: "🌕", speedLabel: "v", gravityLabel: "F_g" } : NONE,
        hint: "Centripetal force isn't a new force: it's whichever real force points toward the centre.",
        explain: it.e,
      },
      lab(it.a, it.w),
    );
  },
);

/* ======================================================= 3. Work, energy and power */

/** PHYS.3.1 — translational kinetic energy. */
export const kineticEnergy: Gen = mix(
  () => {
    const m = pick([0.5, 1, 2, 4, 10, 50]);
    const v = pick([2, 3, 4, 5, 6, 8, 10, 12]);
    return q(
      {
        key: `ke-calc-${m}-${v}`,
        prompt: `What is the kinetic energy of a ${s(m)} kg object moving at ${v} m/s?`,
        unit: "J",
        hint: "K = ½mv². Square the speed first.",
        explain: `K = ½ × ${s(m)} × ${v}² = ${s(0.5 * m)} × ${v * v} = ${s(0.5 * m * v * v)} J.`,
      },
      kp(0.5 * m * v * v, [m * v * v, 0.5 * m * v, m * v]),
    );
  },
  () => {
    const m = pick([2, 4, 8]);
    const v = rand(2, 10);
    const K = 0.5 * m * v * v;
    return q(
      {
        key: `ke-findv-${m}-${v}`,
        prompt: `A ${m} kg cart has ${s(K)} J of kinetic energy. How fast is it moving?`,
        unit: "m/s",
        hint: "v = √(2K ÷ m).",
        explain: `v = √(2 × ${s(K)} ÷ ${m}) = √${v * v} = ${v} m/s.`,
      },
      kp(v),
    );
  },
  () => {
    const vf = pick([2, 3, 0.5]);
    const mf = pick([1, 2, 0.5, 4]);
    const f = mf * vf * vf;
    const fText = (x: number) => (x >= 1 ? `${s(x)} times as much` : `${x === 0.25 ? "a quarter" : x === 0.5 ? "half" : x === 0.125 ? "an eighth" : s(x) + " times"} as much`);
    const change = `${vf === 0.5 ? "halves its speed" : `${vf === 2 ? "doubles" : "triples"} its speed`}${mf === 1 ? "" : mf === 0.5 ? " and loses half its mass" : ` and its mass is multiplied by ${mf}`}`;
    return q(
      {
        key: `ke-ratio-${vf}-${mf}`,
        prompt: `An object ${change}. How does its kinetic energy change?`,
        hint: "K = ½mv²: the speed factor gets squared, the mass factor doesn't.",
        explain: `K changes by ${s(mf)} × ${s(vf)}² = ${s(f)}, so it has ${fText(f)}.`,
      },
      lab(fText(f), [fText(mf * vf), fText(mf * vf * vf * 2), fText(f / 2), fText(mf * vf * 2)].filter((x) => x !== fText(f))),
    );
  },
  () => {
    const objs = until(
      () => LETTERS.slice(0, 3).map((name) => ({ name, m: pick([1, 2, 4, 8]), v: pick([1, 2, 3, 4]) })),
      (os) => new Set(os.map((o) => `${o.m}-${o.v}`)).size === 3,
    );
    return q(
      {
        key: `ke-rank-${objs.map((o) => `${o.m}.${o.v}`).join("_")}`,
        prompt: "Rank the carts by kinetic energy, greatest first.",
        visual: { kind: "table", header: ["Cart", "mass (kg)", "speed (m/s)"], rows: objs.map((o) => [o.name, o.m, o.v]) },
        needsVisual: true,
        hint: "Work out ½mv² for each (or just mv², since the ½ is shared).",
        explain: objs.map((o) => `${o.name}: ½(${o.m})(${o.v})² = ${s(0.5 * o.m * o.v * o.v)} J`).join("; ") + ".",
      },
      ranking(objs.map((o) => ({ name: o.name, value: 0.5 * o.m * o.v * o.v }))),
    );
  },
);

/** PHYS.3.2 — work done by a constant force. */
export const workByForce: Gen = mix(
  () => {
    const th = pick([0, 60, 90, 120, 180]);
    const F = pick([10, 20, 30, 40, 50]);
    const d = pick([2, 3, 4, 5, 10]);
    const cos = { 0: 1, 60: 0.5, 90: 0, 120: -0.5, 180: -1 }[th]!;
    const W = F * d * cos;
    return q(
      {
        key: `w-angle-${th}-${F}-${d}`,
        prompt: `A ${F} N force acts on a box at ${th}° to its ${d} m displacement (the box moves right). How much work does the force do?`,
        visual: { kind: "phys-forces", surface: "floor", forces: [{ dir: th, size: F, label: F }], motion: { dir: 0, label: `Δx = ${d} m` } },
        unit: "J",
        hint: "W = Fd cos θ, where θ is the angle between the force and the displacement. Work can be negative.",
        explain: `W = ${F} × ${d} × cos ${th}° = ${F * d} × ${s(cos)} = ${s(W)} J.${th === 90 ? " A force perpendicular to the motion does no work." : ""}`,
      },
      sk(W, [F * d, -W, F * d * 0.5]),
    );
  },
  () => {
    const m = pick([2, 5, 10, 20]);
    const h = pick([1, 2, 3, 5]);
    const up = Math.random() < 0.5;
    const W = (up ? -1 : 1) * 9.8 * m * h;
    return q(
      {
        key: `w-grav-${m}-${h}-${up}`,
        prompt: `A ${m} kg box is ${up ? "lifted" : "lowered"} ${h} m. How much work does gravity do on it?`,
        unit: "J",
        hint: "Gravity (mg, down) does W = −mgΔy: negative when the box goes up, positive when it goes down.",
        explain: `W_g = ${up ? "−" : "+"}mgh = ${up ? "−" : ""}${m} × 9.8 × ${h} = ${s(W)} J.`,
      },
      sk(W, [-W, m * h, -m * h]),
    );
  },
  () => {
    const m = pick([5, 10, 20]);
    const mu = pick([0.2, 0.3, 0.5]);
    const d = pick([2, 4, 5, 10]);
    const W = -mu * 9.8 * m * d;
    return q(
      {
        key: `w-fric-${m}-${mu}-${d}`,
        prompt: `A ${m} kg crate slides ${d} m across a floor with μₖ = ${mu}. How much work does friction do on the crate?`,
        unit: "J",
        hint: "Friction = μₖmg, opposite the motion (θ = 180°), so its work is negative.",
        explain: `f = ${mu} × ${m} × 9.8 = ${s(mu * 9.8 * m)} N. W = −f d = −${s(mu * 9.8 * m)} × ${d} = ${s(W)} J.`,
      },
      kp(W, [-W, W / 2, W * 2]),
    );
  },
  () => {
    const items = [
      { p: "A block slides across a floor. How much work does the normal force do on it?", a: "Zero", w: ["Positive work", "Negative work", "It depends on the friction"], e: "The normal force is perpendicular to the motion (cos 90° = 0), so it does no work." },
      { p: "You carry a bag across a level room at constant speed. How much work does your upward holding force do on the bag?", a: "Zero", w: ["Positive work", "Negative work", "mg times the distance"], e: "Your force is up; the displacement is horizontal. Perpendicular force, zero work." },
      { p: "A ball on a string whirls in a horizontal circle at constant speed. How much work does the tension do in one turn?", a: "Zero", w: ["Positive work", "Negative work", "Equal to its kinetic energy"], e: "Tension points to the centre, always perpendicular to the velocity, so it does no work and the speed doesn't change." },
      { p: "A box slides down a ramp. What sign is the work done on it by kinetic friction?", a: "Negative", w: ["Positive", "Zero", "It depends on the angle"], e: "Friction points opposite the displacement (θ = 180°), so its work is negative: it takes kinetic energy away." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `w-concept-${i}`, prompt: it.p, hint: "W = Fd cos θ. Only the part of the force along the motion does work.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.3.2 — work as the area under a force–position graph. */
export const workGraphs: Gen = mix(
  () => {
    const F = pick([2, 4, 6, 8, 10]);
    const x1 = rand(1, 3);
    const x2 = x1 + rand(1, 3);
    const x3 = x2 + rand(1, 3);
    const pts: Pt[] = [
      [0, 0],
      [x1, F],
      [x2, F],
      [x3, 0],
    ];
    const W = areaUnder(pts, 0, x3);
    return q(
      {
        key: `wg-trap-${F}-${x1}-${x2}-${x3}`,
        prompt: `How much work does this force do as the object moves from x = 0 to x = ${x3} m?`,
        visual: graph([0, 10], [0, 12], pts, "F (N) vs x (m)", { shade: { from: 0, to: x3 }, dots: pts.map(([x, y]) => ({ x, y })) }),
        needsVisual: true,
        unit: "J",
        hint: "Work is the area under the F–x graph. Split it into triangles and a rectangle.",
        explain: `½(${x1})(${F}) + ${x2 - x1}(${F}) + ½(${x3 - x2})(${F}) = ${s(W)} J.`,
      },
      kp(W, [F * x3, W / 2, F * (x2 - x1)]),
    );
  },
  () => {
    const k = pick([100, 200, 400, 500]);
    const x = pick([0.1, 0.2, 0.3]);
    const askFrom = Math.random() < 0.4;
    const x0 = askFrom ? 0.1 : 0;
    const xEnd = askFrom ? x + 0.1 : x;
    const W = 0.5 * k * (xEnd * xEnd - x0 * x0);
    return q(
      {
        key: `wg-spring-${k}-${x}-${askFrom}`,
        prompt: `The graph shows the force needed to stretch a spring (k = ${k} N/m). How much work does it take to stretch it from ${s(x0)} m to ${s(xEnd)} m?`,
        visual: {
          kind: "plot", ...axes("F (N) vs x (m)"),
          x: [0, 0.5],
          y: [0, k * 0.5],
          curves: [{ fn: (xx) => k * xx, colour: "wave" }],
          shade: { fn: (xx) => k * xx, from: x0, to: xEnd },
        },
        needsVisual: true,
        unit: "J",
        hint: "The shaded area is a triangle (or a trapezoid): W = ½kx₂² − ½kx₁².",
        explain: `W = ½(${k})(${s(xEnd)}² − ${s(x0)}²) = ${s(W)} J.`,
      },
      kp(W, [k * xEnd * xEnd, k * (xEnd - x0), 0.5 * k * (xEnd - x0) * (xEnd - x0)]),
    );
  },
  () => {
    const F1 = pick([4, 6, 8]);
    const F2 = -pick([2, 4, 6]);
    const a = rand(2, 4);
    const b = rand(2, 4);
    const pts: Pt[] = [
      [0, F1],
      [a, F1],
      [a + 0.001, F2],
      [a + b, F2],
    ];
    const W = F1 * a + F2 * b;
    return q(
      {
        key: `wg-neg-${F1}-${F2}-${a}-${b}`,
        prompt: `A force pushes a cart forward, then backward. What is the total work done from x = 0 to x = ${a + b} m?`,
        visual: graph([0, 10], [-8, 10], pts, "F (N) vs x (m)", { shade: { from: 0, to: a + b } }),
        needsVisual: true,
        unit: "J",
        hint: "Area above the axis is positive work; area below is negative. Add them.",
        explain: `${F1} × ${a} + (${F2}) × ${b} = ${F1 * a} − ${-F2 * b} = ${s(W)} J.`,
      },
      sk(W, [F1 * a - F2 * b, -W]),
    );
  },
);

/** PHYS.3.1, PHYS.3.2 — the work–energy theorem: W_net = ΔK. */
export const workEnergyTheorem: Gen = mix(
  () => {
    const [v, d] = until(
      () => [rand(2, 8), pick([1, 2, 4, 5, 8])],
      ([vv, dd]) => Number.isInteger((vv * vv) / dd),
    );
    const f = pick([0, 2, 4, 5]);
    const F = (v * v) / d + f;
    return q(
      {
        key: `wet-push-${v}-${d}-${f}`,
        prompt: `A 2 kg block starts at rest. You push it ${d} m with a ${F} N force${f ? ` while ${f} N of friction acts` : " on a frictionless floor"}. How fast is it going then?`,
        unit: "m/s",
        hint: "W_net = (F − f)d = ΔK = ½mv² − 0.",
        explain: `W_net = (${F} − ${f}) × ${d} = ${v * v} J = ½(2)v², so v = √${v * v} = ${v} m/s.`,
      },
      kp(v),
    );
  },
  () => {
    const m = pick([2, 4, 10, 1000]);
    const v = pick([4, 5, 10, 20]);
    const f = pick([10, 20, 40, 50, 8000, 5000].filter((x) => (m === 1000 ? x >= 5000 : x < 100) && isStep((0.5 * m * v * v) / x, 0.01)));
    const d = (0.5 * m * v * v) / f;
    return q(
      {
        key: `wet-stop-${m}-${v}-${f}`,
        prompt: `A ${s(m)} kg object moving at ${v} m/s skids to a stop against a constant ${s(f)} N friction force. How far does it skid?`,
        unit: "m",
        hint: "Friction's (negative) work removes all the kinetic energy: f·d = ½mv².",
        explain: `K = ½(${s(m)})(${v})² = ${s(0.5 * m * v * v)} J. d = K ÷ f = ${s(0.5 * m * v * v)} ÷ ${s(f)} = ${s(d)} m.`,
      },
      kp(d),
    );
  },
  () => {
    const m = pick([2, 4, 6]);
    const v1 = rand(1, 8);
    let v2 = rand(1, 8);
    while (v2 === v1) v2 = rand(1, 8);
    const W = 0.5 * m * (v2 * v2 - v1 * v1);
    return q(
      {
        key: `wet-net-${m}-${v1}-${v2}`,
        prompt: `A ${m} kg cart's speed changes from ${v1} m/s to ${v2} m/s. How much net work was done on it?`,
        unit: "J",
        hint: "W_net = ΔK = ½mv₂² − ½mv₁². Square each speed separately.",
        explain: `½(${m})(${v2 * v2}) − ½(${m})(${v1 * v1}) = ${s(0.5 * m * v2 * v2)} − ${s(0.5 * m * v1 * v1)} = ${s(W)} J.`,
      },
      sk(W, [0.5 * m * (v2 - v1) * (v2 - v1), m * (v2 - v1), -W]),
    );
  },
  () => {
    const items = [
      { p: "A car's speed doubles. With the same braking force, how does its stopping distance change?", a: "4 times as far", w: ["twice as far", "the same", "half as far"], e: "Stopping distance = K ÷ f, and K ∝ v², so doubling v gives 4 times the distance." },
      { p: "The net work done on an object is zero. What must be true?", a: "Its speed is the same at the start and end", w: ["No forces acted on it", "It was at rest", "Its velocity never changed direction"], e: "W_net = ΔK = 0 means the kinetic energy (and so the speed) ends where it started." },
      { p: "Two carts, one twice the mass of the other, are pushed with equal forces over equal distances from rest. Which has more kinetic energy at the end?", a: "They have equal kinetic energy", w: ["The heavier cart", "The lighter cart", "Can't tell"], e: "Equal force over equal distance means equal work, so equal ΔK. (The lighter one is faster.)" },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `wet-concept-${i}`, prompt: it.p, hint: "The work–energy theorem: W_net = ΔK.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.3.3 — gravitational and spring potential energy. */
export const potentialEnergy: Gen = mix(
  () => {
    const m = pick([0.5, 1, 2, 5, 10]);
    const h = pick([1, 2, 3, 5, 10]);
    return q(
      {
        key: `pe-mgh-${m}-${h}`,
        prompt: `How much gravitational potential energy does a ${s(m)} kg object gain when it is raised ${h} m?`,
        unit: "J",
        hint: "ΔU = mgΔh.",
        explain: `ΔU = ${s(m)} × 9.8 × ${h} = ${s(9.8 * m * h)} J.`,
      },
      kp(9.8 * m * h, [m * h, 9.8 * m, 0.5 * m * h]),
    );
  },
  () => {
    const m = pick([1, 2, 5]);
    const table = pick([1, 1.5, 2]);
    const shelf = pick([0.5, 1]);
    const ref = pick(["the floor", "the tabletop", "the shelf"]);
    const hBook = table;
    const refH = ref === "the floor" ? 0 : ref === "the tabletop" ? table : table + shelf;
    const U = 9.8 * m * (hBook - refH);
    return q(
      {
        key: `pe-ref-${m}-${table}-${shelf}-${ref}`,
        prompt: `A ${m} kg book lies on a table ${s(table)} m above the floor. A shelf is ${s(shelf)} m above the tabletop. Taking U = 0 at ${ref}, what is the book's gravitational potential energy?`,
        unit: "J",
        hint: "U = mgh, where h is the height above the reference level you chose. Below it, h is negative.",
        explain: `h = ${s(hBook)} − ${s(refH)} = ${s(hBook - refH)} m, so U = ${m} × 9.8 × (${s(hBook - refH)}) = ${s(U)} J. Only changes in U matter physically.`,
      },
      sk(U, [9.8 * m * table, -U, 9.8 * m * (table + shelf)]),
    );
  },
  () => {
    const k = pick([100, 200, 400, 800]);
    const x = pick([0.05, 0.1, 0.2, 0.3]);
    return q(
      {
        key: `pe-spring-${k}-${x}`,
        prompt: `A spring with k = ${k} N/m is compressed ${s(x)} m. How much elastic potential energy does it store?`,
        unit: "J",
        hint: "U_s = ½kx².",
        explain: `U = ½ × ${k} × ${s(x)}² = ${s(0.5 * k * x * x)} J.`,
      },
      kp(0.5 * k * x * x, [k * x, 0.5 * k * x, k * x * x]),
    );
  },
  () => {
    const k = pick([100, 200]);
    const x = pick([0.1, 0.2, 0.3]);
    const U = 0.5 * k * x * x;
    return q(
      {
        key: `pe-graph-${k}-${x}`,
        prompt: `This is the potential energy curve of a spring. What is U when x = ${s(x)} m?`,
        visual: {
          kind: "plot", ...axes("U (J) vs x (m)"),
          x: [-0.4, 0.4],
          y: [0, 0.5 * k * 0.16 + 2],
          curves: [{ fn: (xx) => 0.5 * k * xx * xx, colour: "grape" }],
          points: [{ x: 0.2, y: 0.5 * k * 0.04, label: `${s(0.5 * k * 0.04)} J` }],
        },
        needsVisual: true,
        unit: "J",
        hint: "U = ½kx², so U grows with x². Use the labelled point to find k, or compare: 1.5× the stretch means 2.25× the energy.",
        explain: `At 0.2 m, U = ${s(0.5 * k * 0.04)} J, so ½k = ${s(0.5 * k)}. At ${s(x)} m, U = ${s(0.5 * k)} × ${s(x * x)} = ${s(U)} J.`,
      },
      kp(U, [0.5 * k * 0.04 * (x / 0.2), U * 2]),
    );
  },
  () => {
    const m = pick([10, 20, 50]);
    const h = pick([2, 3, 4]);
    return q(
      {
        key: `pe-path-${m}-${h}`,
        prompt: `You move a ${m} kg crate up ${h} m: first by a long ramp, then by lifting it straight up. Compare the change in gravitational PE.`,
        hint: "U = mgh depends only on the change in height.",
        explain: `Both give ΔU = ${m} × 9.8 × ${h} = ${s(9.8 * m * h)} J. Gravity is a conservative force: the path doesn't matter.`,
      },
      lab("The same both ways", ["Bigger for the ramp (longer path)", "Bigger for the straight lift", "Zero for the ramp"]),
    );
  },
);

/** PHYS.3.4 — energy bar charts. */
export const energyBarCharts: Gen = mix(
  () => {
    const E = pick([40, 60, 80, 100]);
    const frac = pick([0.25, 0.5, 0.75]);
    const U = E * frac;
    return q(
      {
        key: `eb-drop-${E}-${frac}`,
        prompt: `A ball is dropped (system: ball + Earth, no air). At the top it has ${E} J of GPE. Fill in its KE when it has fallen ${frac === 0.5 ? "halfway" : frac === 0.25 ? "three quarters of the way" : "a quarter of the way"}.`,
        visual: {
          kind: "phys-energy",
          names: ["KE", "GPE", "Thermal"],
          bars: [
            { title: "Top", values: [0, E, 0] },
            { title: "Later", values: ["?", U, 0] },
          ],
          max: 100,
          unit: "J",
        },
        needsVisual: true,
        unit: "J",
        hint: "With no friction or air, the total stays the same. KE = total − GPE.",
        explain: `Total = ${E} J. GPE is now ${s(U)} J, so KE = ${E} − ${s(U)} = ${s(E - U)} J.`,
      },
      kp(E - U),
    );
  },
  () => {
    const K0 = pick([10, 20, 30]);
    const U0 = pick([40, 50, 60]);
    const th = pick([10, 20, 30]);
    return q(
      {
        key: `eb-coaster-${K0}-${U0}-${th}`,
        prompt: "A roller-coaster car rolls from the top to the bottom (system: car, track, Earth). Friction warms the track. Find the KE at the bottom.",
        visual: {
          kind: "phys-energy",
          names: ["KE", "GPE", "Thermal"],
          bars: [
            { title: "Top", values: [K0, U0, 0] },
            { title: "Bottom", values: ["?", 0, th] },
          ],
          max: 100,
          unit: "J",
        },
        needsVisual: true,
        unit: "J",
        hint: "The total energy of the system stays the same; friction moves some into thermal energy.",
        explain: `Total = ${K0} + ${U0} = ${K0 + U0} J. At the bottom: KE = ${K0 + U0} − ${th} = ${K0 + U0 - th} J.`,
      },
      kp(K0 + U0 - th, [K0 + U0, K0 + U0 + th, U0 - th]),
    );
  },
  () => {
    const E = pick([30, 50, 80]);
    const K = pick([0, 10, 20]);
    return q(
      {
        key: `eb-spring-${E}-${K}`,
        prompt: `A spring launches a ball (system: ball, spring, Earth; no friction). At the highest point the ball has ${K ? `${K} J of KE (it's moving sideways)` : "no KE"}. How much GPE does it have there?`,
        visual: {
          kind: "phys-energy",
          names: ["KE", "GPE", "Spring"],
          bars: [
            { title: "Compressed", values: [0, 0, E] },
            { title: "Highest", values: [K, "?", 0] },
          ],
          max: 100,
          unit: "J",
        },
        needsVisual: true,
        unit: "J",
        hint: "All the spring energy is shared between KE and GPE at the top.",
        explain: `${E} J = ${K} J of KE + GPE, so GPE = ${E - K} J.`,
      },
      kp(E - K),
    );
  },
  () => {
    const items = [
      { p: "A ball is thrown straight up. Choosing the ball alone as the system, how does its energy change on the way up?", a: "Gravity does negative work, so its KE decreases", w: ["Its GPE increases", "Its total energy stays the same", "Its KE turns into GPE stored in the ball"], e: "A one-object system can't store potential energy. Earth is outside, so gravity is an external force doing negative work." },
      { p: "A ball is thrown straight up. Choosing ball + Earth as the system (no air), how does its energy change on the way up?", a: "KE turns into GPE; the total stays constant", w: ["Gravity does negative work, so total energy falls", "KE and GPE both increase", "KE turns into thermal energy"], e: "With Earth inside the system, gravity is internal: energy moves from KE to GPE and the total is conserved." },
      { p: "A box slides to a stop on a rough floor (system: box + floor). What happens to the total energy?", a: "It stays the same; KE becomes thermal energy", w: ["It decreases to zero", "It increases", "KE becomes GPE"], e: "Friction is internal to the box + floor system. The KE turns into thermal energy, and the total is conserved." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `eb-concept-${i}`, prompt: it.p, hint: "Decide what's inside the system. Potential energy belongs to a system of interacting objects.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.3.4 — conservation of mechanical energy (h = 0.1k² m gives v = 1.4k m/s). */
export const energyConservation: Gen = mix(
  () => {
    const k = rand(2, 10);
    const h = 0.1 * k * k;
    const askH = Math.random() < 0.4;
    return q(
      {
        key: `ec-slide-${k}-${askH}`,
        prompt: askH ? `A frictionless roller-coaster car reaches the bottom of a hill at ${s(1.4 * k)} m/s, starting from rest. How tall was the hill?` : `A child slides from rest down a frictionless slide ${s(h)} m high. How fast is she going at the bottom?`,
        unit: askH ? "m" : "m/s",
        hint: "mgh = ½mv² (the mass cancels): v = √(2gh), or h = v² ÷ 2g.",
        explain: askH ? `h = v² ÷ 2g = ${s(1.96 * k * k)} ÷ 19.6 = ${s(h)} m.` : `v = √(2 × 9.8 × ${s(h)}) = √${s(1.96 * k * k)} = ${s(1.4 * k)} m/s. The shape of the slide doesn't matter.`,
      },
      kp(askH ? h : 1.4 * k),
    );
  },
  () => {
    const a = rand(1, 5);
    const b = a + rand(1, 5);
    const dh = 0.1 * (b * b - a * a);
    return q(
      {
        key: `ec-drop-${a}-${b}`,
        prompt: `A frictionless cart moving at ${s(1.4 * a)} m/s rolls down a dip ${s(dh)} m deep. How fast is it at the bottom?`,
        unit: "m/s",
        hint: "½mv² = ½mv₀² + mgΔh, so v² = v₀² + 2gΔh. Don't add the speeds!",
        explain: `v² = ${s(1.96 * a * a)} + 19.6 × ${s(dh)} = ${s(1.96 * b * b)}, so v = ${s(1.4 * b)} m/s.`,
      },
      kp(1.4 * b, [1.4 * (b - a), 1.4 * a + Math.sqrt(19.6 * dh)].map((x) => rd(x, 1))),
    );
  },
  () => {
    const [k, m, x] = pick([
      [400, 1, 0.1],
      [900, 1, 0.1],
      [100, 1, 0.2],
      [400, 4, 0.3],
      [200, 2, 0.2],
      [1600, 1, 0.05],
    ]);
    const v = x * Math.sqrt(k / m);
    return q(
      {
        key: `ec-spring-${k}-${m}-${x}`,
        prompt: `A spring (k = ${k} N/m) compressed ${s(x)} m launches a ${m} kg block across a frictionless floor. How fast does the block leave?`,
        unit: "m/s",
        hint: "½kx² = ½mv², so v = x√(k ÷ m).",
        explain: `½(${k})(${s(x)})² = ${s(0.5 * k * x * x)} J = ½(${m})v², so v = ${s(v)} m/s.`,
      },
      kp(v),
    );
  },
  () => {
    const n = pick([1, 2, 5, 10]);
    const m = pick([0.5, 1, 2]);
    const k = 196 * n;
    const h = (0.1 * n) / m;
    return q(
      {
        key: `ec-springup-${n}-${m}`,
        prompt: `A spring (k = ${k} N/m) is compressed 0.1 m and fires a ${s(m)} kg ball straight up. How high above its launch point does the ball rise? (Ignore the spring's length.)`,
        unit: "m",
        hint: "½kx² = mgh at the top (KE = 0 there).",
        explain: `½(${k})(0.1)² = ${s(0.98 * n)} J = ${s(m)} × 9.8 × h, so h = ${s(h)} m.`,
      },
      kp(h),
    );
  },
  () => {
    const k = rand(2, 7);
    const h = 0.1 * k * k;
    return q(
      {
        key: `ec-pend-${k}`,
        prompt: `A pendulum bob is pulled aside so it is ${s(h)} m above its lowest point, then released. How fast is it moving at the bottom?`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 35, angleLabel: null, swing: true },
        unit: "m/s",
        hint: "Tension does no work (it's perpendicular to the motion), so mgh = ½mv².",
        explain: `v = √(2gh) = √(19.6 × ${s(h)}) = ${s(1.4 * k)} m/s.`,
      },
      kp(1.4 * k),
    );
  },
);

/** PHYS.3.4 — energy with friction: mechanical energy → thermal energy. */
export const energyWithFriction: Gen = mix(
  () => {
    const m = pick([2, 5, 10]);
    const h = pick([5, 10, 20]);
    const v = pick([6, 8, 10, 12]);
    const loss = 9.8 * m * h - 0.5 * m * v * v;
    if (loss <= 0) return energyWithFriction();
    return q(
      {
        key: `ef-thermal-${m}-${h}-${v}`,
        prompt: `A ${m} kg sled starts from rest at the top of a ${h} m high hill and reaches the bottom at ${v} m/s. How much energy became thermal energy?`,
        unit: "J",
        hint: "Thermal energy = (GPE at the top) − (KE at the bottom).",
        explain: `mgh = ${s(9.8 * m * h)} J; ½mv² = ${s(0.5 * m * v * v)} J; difference = ${s(loss)} J.`,
      },
      kp(loss),
    );
  },
  () => {
    const m = pick([2, 4, 5]);
    const [h, L] = pick([
      [2, 4],
      [2, 5],
      [2, 10],
      [5, 10],
    ]);
    const v = pick([4, 6]);
    const loss = 9.8 * m * h - 0.5 * m * v * v;
    const f = loss / L;
    return q(
      {
        key: `ef-force-${m}-${h}-${L}-${v}`,
        prompt: `A ${m} kg box slides from rest down a ramp ${L} m long and ${h} m high and reaches ${v} m/s at the bottom. What is the average friction force? Round to 1 decimal place.`,
        visual: { kind: "phys-incline", angle: (Math.asin(h / L) * 180) / Math.PI, angleLabel: null, length: L, height: h, unit: "m", blockLabel: m, friction: "rough", motion: "down" },
        unit: "N",
        hint: "Energy lost = mgh − ½mv². Friction's work over the ramp length equals that loss: f × L.",
        explain: `Lost: ${s(9.8 * m * h)} − ${s(0.5 * m * v * v)} = ${s(loss)} J. f = ${s(loss)} ÷ ${L} = ${s(rd(f, 1))} N.`,
      },
      kp(rd(f, 1)),
    );
  },
  () => {
    const h1 = pick([2, 4, 5, 8]);
    const pct = pick([20, 25, 40, 50, 75]);
    const h2 = h1 * (1 - pct / 100);
    return q(
      {
        key: `ef-bounce-${h1}-${pct}`,
        prompt: `A ball is dropped from ${h1} m and bounces back up to ${s(h2)} m. What percent of its mechanical energy was lost in the bounce?`,
        unit: "%",
        hint: "At both high points KE = 0, so the energy is just mgh. Compare the heights.",
        explain: `The energy is ∝ height: it keeps ${s(h2)} ÷ ${h1} = ${100 - pct}%, so ${pct}% was lost (to sound and heat).`,
      },
      kp(pct, [100 - pct]),
    );
  },
  () => {
    const items = [
      { p: "A block slides down a rough ramp. Which energy of the block + ramp + Earth system increases?", a: "Thermal energy", w: ["Gravitational PE", "Total energy", "Spring energy"], e: "GPE becomes KE and thermal energy. The total stays constant; the thermal part grows." },
      { p: "With friction, a cart released from height h on a track rises on the other side to…", a: "less than h", w: ["exactly h", "more than h", "h, but more slowly"], e: "Some mechanical energy becomes thermal energy, so the cart can't regain all its starting height." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `ef-concept-${i}`, prompt: it.p, hint: "Friction turns mechanical energy into thermal energy inside the system.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.3.3, PHYS.3.4 — choosing systems: external work changes a system's energy. */
export const energySystems: Gen = mix(
  () => {
    const m = pick([2, 5, 10, 20]);
    const h = pick([1, 1.5, 2, 3]);
    return q(
      {
        key: `es-lift-${m}-${h}`,
        prompt: `You lift a ${m} kg box ${s(h)} m at a constant speed. How much work do you do on the box + Earth system?`,
        unit: "J",
        hint: "Constant speed: KE doesn't change. Your work goes into the system's GPE.",
        explain: `W = ΔU = mgh = ${m} × 9.8 × ${s(h)} = ${s(9.8 * m * h)} J.`,
      },
      kp(9.8 * m * h, [m * h, 0, 2 * 9.8 * m * h]),
    );
  },
  () => {
    const W = pick([50, 80, 100, 120]);
    const th = pick([10, 20, 30, 40]);
    return q(
      {
        key: `es-push-${W}-${th}`,
        prompt: `You push a cart across a level floor, doing ${W} J of work. Friction turns ${th} J into thermal energy (system: cart + floor). How much does the cart's KE increase?`,
        unit: "J",
        hint: "Your push is external: W = ΔK + ΔE_thermal.",
        explain: `${W} J in = ΔK + ${th} J, so ΔK = ${W - th} J.`,
      },
      kp(W - th, [W, W + th]),
    );
  },
  () => {
    const items = [
      { p: "For which system is mechanical energy conserved when a ball falls freely?", a: "Ball + Earth", w: ["The ball alone", "Earth alone", "Neither"], e: "With both inside, gravity is internal and GPE is defined for the pair. For the ball alone, gravity is an external force doing work." },
      { p: "A system's total energy changes only when…", a: "work is done on it by an external force (or heat flows in or out)", w: ["an internal force does work", "its objects speed up", "it has friction inside"], e: "Internal forces only move energy between forms. Energy enters or leaves a system through external work (or heat)." },
      { p: "A falling ball is the system (Earth is outside). Which is true?", a: "Gravity does positive work and the ball's KE increases", w: ["The ball's GPE turns into KE", "Total energy is conserved", "No work is done"], e: "Earth is outside, so gravity is external: its positive work increases the ball's KE. A single object has no GPE of its own." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `es-concept-${i}`, prompt: it.p, hint: "Potential energy belongs to a system of interacting objects, not to one object.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.3.5 — power. */
export const power: Gen = mix(
  () => {
    const [m, h, t] = until(
      () => [pick([10, 20, 25, 50, 60, 70]), pick([2, 3, 4, 5, 10]), pick([2, 4, 5, 7, 8, 10])],
      ([mm, hh, tt]) => isStep((9.8 * mm * hh) / tt, 0.1),
    );
    const P = (9.8 * m * h) / t;
    return q(
      {
        key: `pw-lift-${m}-${h}-${t}`,
        prompt: `A motor lifts a ${m} kg load ${h} m at constant speed in ${t} s. What is its power output?`,
        unit: "W",
        hint: "P = W ÷ t, and the work is mgh.",
        explain: `W = ${m} × 9.8 × ${h} = ${s(9.8 * m * h)} J. P = ${s(9.8 * m * h)} ÷ ${t} = ${s(P)} W.`,
      },
      kp(P, [9.8 * m * h, (m * h) / t]),
    );
  },
  () => {
    const F = pick([300, 400, 500, 600, 800]);
    const v = pick([10, 15, 20, 25, 30]);
    return q(
      {
        key: `pw-fv-${F}-${v}`,
        prompt: `A car cruises at a steady ${v} m/s against ${F} N of air resistance and friction. What power must its engine deliver?`,
        unit: "W",
        hint: "At steady speed the drive force equals the resistance. P = Fv.",
        explain: `P = ${F} × ${v} = ${s(F * v)} W (${s((F * v) / 1000)} kW).`,
      },
      kp(F * v, [F / v, (F * v) / 2]),
    );
  },
  () => {
    const P = pick([100, 200, 250, 500, 1000]);
    const W = P * pick([3, 4, 6, 8, 12, 20]);
    return q(
      {
        key: `pw-time-${P}-${W}`,
        prompt: `How long does a ${P} W winch take to do ${s(W)} J of work?`,
        unit: "s",
        hint: "t = W ÷ P.",
        explain: `t = ${s(W)} ÷ ${P} = ${s(W / P)} s.`,
      },
      kp(W / P),
    );
  },
  () => {
    const ppl = until(
      () => LETTERS.slice(0, 3).map((name) => ({ name, m: pick([50, 60, 75]), h: pick([4, 6, 8]), t: pick([4, 5, 6, 8]) })),
      (ps) => new Set(ps.map((p) => `${p.m}-${p.h}-${p.t}`)).size === 3,
    );
    return q(
      {
        key: `pw-rank-${ppl.map((p) => `${p.m}.${p.h}.${p.t}`).join("_")}`,
        prompt: "Three students run up stairs. Rank their power output, greatest first.",
        visual: { kind: "table", header: ["Student", "mass (kg)", "height (m)", "time (s)"], rows: ppl.map((p) => [p.name, p.m, p.h, p.t]) },
        needsVisual: true,
        hint: "P = mgh ÷ t. The 9.8 is shared, so compare m × h ÷ t.",
        explain: ppl.map((p) => `${p.name}: ${p.m}×${p.h}÷${p.t} = ${s(rd((p.m * p.h) / p.t, 1))}`).join("; ") + " (times 9.8 gives watts).",
      },
      ranking(ppl.map((p) => ({ name: p.name, value: clean((p.m * p.h) / p.t) }))),
    );
  },
);

/** PHYS.3.3, PHYS.3.4 — Do it: build energy bar charts and energy graphs. */
export const energyDoIt: Gen = mix(
  () => {
    const W = pick([10, 20]);
    const H = W === 10 ? pick([6, 8, 10]) : pick([3, 4, 5]);
    const h = rand(1, H - 1);
    const E = W * H;
    const U = W * h;
    return q(
      {
        key: `ed-bars-${W}-${H}-${h}`,
        prompt: `A ball weighing ${W} N is dropped from ${H} m (system: ball + Earth, no air; GPE = 0 at the ground). Build the energy bar chart when it is ${h} m above the ground.`,
        speech: `A ball weighing ${W} newtons is dropped from ${H} meters. System: ball and Earth, no air, GPE zero at the ground. Build the energy bar chart when it is ${h} meters above the ground.`,
        hint: `GPE = weight × height. The total, ${W} × ${H} = ${E} J, never changes.`,
        explain: `GPE = ${W} × ${h} = ${U} J. KE = ${E} − ${U} = ${E - U} J. Thermal = 0.`,
      },
      act(
        {
          kind: "barGraph",
          title: `Energy at ${h} m (J)`,
          items: [
            { label: "KE", value: E - U },
            { label: "GPE", value: U },
            { label: "Thermal", value: 0 },
          ],
          max: 100,
          step: 10,
          hideData: true,
        },
        E - U,
      ),
    );
  },
  () => {
    const K0 = pick([0, 10, 20]);
    const U0 = pick([50, 60, 70, 80]);
    const th = pick([10, 20, 30]);
    const U1 = pick([0, 10, 20]);
    const K1 = K0 + U0 - th - U1;
    return q(
      {
        key: `ed-coaster-${K0}-${U0}-${th}-${U1}`,
        prompt: `A cart has ${K0} J of KE and ${U0} J of GPE at point A. By point B, friction has made ${th} J of thermal energy and its GPE is ${U1} J. Build the bar chart for point B.`,
        hint: "Total at A = total at B. Fill in GPE and thermal first, then KE is what's left.",
        explain: `Total = ${K0 + U0} J. At B: GPE ${U1}, thermal ${th}, so KE = ${K0 + U0} − ${U1} − ${th} = ${K1} J.`,
      },
      act(
        {
          kind: "barGraph",
          title: "Energy at B (J)",
          items: [
            { label: "KE", value: K1 },
            { label: "GPE", value: U1 },
            { label: "Thermal", value: th },
          ],
          max: 100,
          step: 10,
          hideData: true,
        },
        K1,
      ),
    );
  },
  () => {
    const w = pick([1, 2]);
    const H = w === 1 ? rand(5, 10) : rand(3, 5);
    const ke = Math.random() < 0.5;
    return q(
      {
        key: `ed-line-${w}-${H}-${ke}`,
        prompt: `A ${w} N ball falls from ${H} m (no air). Draw its ${ke ? "kinetic energy" : "gravitational PE"} (J, up) against height h (m, across).`,
        hint: ke ? `KE = weight × (distance fallen) = ${w}(${H} − h). It is 0 at h = ${H} and ${w * H} J at h = 0.` : `GPE = weight × height = ${w}h.`,
        explain: ke ? `KE = ${w * H} − ${w}h: a line from (0, ${w * H}) down to (${H}, 0).` : `GPE = ${w}h: a line through the origin with slope ${w}.`,
      },
      act({ kind: "drawLine", m: ke ? -w : w, b: ke ? w * H : 0, size: 10, quadrants: 1 }, ke ? -w : w),
    );
  },
);

/* ======================================================= 4. Linear momentum */

/** PHYS.4.1 — momentum p = mv, a vector. */
export const momentumBasics: Gen = mix(
  () => {
    const m = pick([0.5, 2, 3, 5, 1200]);
    const v = pick([2, 4, 6, 8, 10, 15, 20]);
    const left = Math.random() < 0.5;
    const p = m * v * (left ? -1 : 1);
    return q(
      {
        key: `mo-p-${m}-${v}-${left}`,
        prompt: `A ${s(m)} kg object moves ${left ? "left" : "right"} at ${v} m/s. What is its momentum (right is +)?`,
        unit: "kg·m/s",
        hint: "p = mv, and it points the same way as the velocity.",
        explain: `p = ${s(m)} × ${left ? "(−" + v + ")" : v} = ${s(p)} kg·m/s.`,
      },
      sk(p, [-p, 0.5 * m * v * v]),
    );
  },
  () => {
    const m1 = pick([1, 2, 3, 4]);
    const v1 = pick([2, 3, 4, 5, 6]);
    const m2 = pick([1, 2, 3, 5]);
    const v2 = pick([1, 2, 3, 4]);
    const p = m1 * v1 - m2 * v2;
    return q(
      {
        key: `mo-total-${m1}-${v1}-${m2}-${v2}`,
        prompt: "Two carts move toward each other. What is the total momentum of the two-cart system (right is +)?",
        visual: { kind: "phys-collision", before: [{ mass: m1, v: v1, vSize: v1 }, { mass: m2, v: v2, vSize: -v2 }] },
        needsVisual: true,
        unit: "kg·m/s",
        hint: "Add the momenta as vectors: leftward momentum is negative.",
        explain: `${m1} × ${v1} + ${m2} × (−${v2}) = ${m1 * v1} − ${m2 * v2} = ${s(p)} kg·m/s.`,
      },
      sk(p, [m1 * v1 + m2 * v2, -p]),
    );
  },
  () => {
    const objs = until(
      () => LETTERS.slice(0, 3).map((name) => ({ name, m: pick([1, 2, 3, 4, 6]), v: pick([1, 2, 3, 4, 6]) })),
      (os) => new Set(os.map((o) => `${o.m}-${o.v}`)).size === 3,
    );
    const askK = Math.random() < 0.3;
    return q(
      {
        key: `mo-rank-${objs.map((o) => `${o.m}.${o.v}`).join("_")}-${askK}`,
        prompt: `Rank the objects by ${askK ? "kinetic energy" : "size of momentum"}, greatest first.`,
        visual: { kind: "table", header: ["Object", "mass (kg)", "speed (m/s)"], rows: objs.map((o) => [o.name, o.m, o.v]) },
        needsVisual: true,
        hint: askK ? "K = ½mv²: speed counts twice." : "p = mv.",
        explain: objs.map((o) => `${o.name}: ${askK ? `½(${o.m})(${o.v})² = ${s(0.5 * o.m * o.v * o.v)} J` : `${o.m} × ${o.v} = ${o.m * o.v} kg·m/s`}`).join("; ") + ".",
      },
      ranking(objs.map((o) => ({ name: o.name, value: askK ? 0.5 * o.m * o.v * o.v : o.m * o.v }))),
    );
  },
  () => {
    const [m, K, p] = pick([
      [2, 16, 8],
      [2, 25, 10],
      [8, 16, 16],
      [4, 50, 20],
      [0.5, 16, 4],
      [3, 24, 12],
    ]);
    return q(
      {
        key: `mo-fromK-${m}-${K}`,
        prompt: `A ${s(m)} kg ball has ${K} J of kinetic energy. What is the size of its momentum?`,
        unit: "kg·m/s",
        hint: "Find v from K = ½mv², then p = mv. (Or use p = √(2mK).)",
        explain: `v = √(2 × ${K} ÷ ${s(m)}) = ${s(p / m)} m/s, so p = ${s(m)} × ${s(p / m)} = ${p} kg·m/s.`,
      },
      kp(p),
    );
  },
);

/** PHYS.4.2 — impulse J = FΔt = Δp. */
export const impulse: Gen = mix(
  () => {
    const m = pick([0.1, 0.2, 0.5]);
    const vin = pick([4, 5, 6, 8, 10]);
    const bounce = Math.random() < 0.6;
    const vout = bounce ? pick([2, 3, 4, 5]) : 0;
    const dt = pick([0.01, 0.02, 0.05, 0.1]);
    const dp = m * (vin + vout);
    const askF = Math.random() < 0.5;
    return q(
      {
        key: `imp-wall-${m}-${vin}-${vout}-${dt}-${askF}`,
        prompt: `A ${s(m)} kg ball hits a wall at ${vin} m/s and ${bounce ? `bounces straight back at ${vout} m/s` : "stops dead"}. ${askF ? `The contact lasts ${s(dt)} s. What is the average force on the ball?` : "What is the size of the impulse on the ball?"}`,
        unit: askF ? "N" : "N·s",
        hint: "Δp = m(v_final − v_initial). Bouncing back means the final velocity has the opposite sign, so the change is bigger." + (askF ? " Then F = Δp ÷ Δt." : ""),
        explain: `Δp = ${s(m)} × (${bounce ? vout : 0} − (−${vin})) = ${s(dp)} kg·m/s.${askF ? ` F = ${s(dp)} ÷ ${s(dt)} = ${s(dp / dt)} N.` : ""}`,
      },
      kp(askF ? dp / dt : dp, askF ? [(m * Math.abs(vin - vout)) / dt, dp] : [m * Math.abs(vin - vout), m * vin]),
    );
  },
  () => {
    const F = pick([20, 50, 100, 200, 500]);
    const dt = pick([0.02, 0.05, 0.1, 0.2, 0.5]);
    const m = pick([0.5, 1, 2, 5]);
    const askV = Math.random() < 0.5;
    const J = F * dt;
    return q(
      {
        key: `imp-fdt-${F}-${dt}-${m}-${askV}`,
        prompt: `A ${F} N force acts on a ${s(m)} kg puck at rest for ${s(dt)} s. ${askV ? "How fast does the puck move afterward?" : "What impulse does it give the puck?"}`,
        unit: askV ? "m/s" : "N·s",
        hint: "J = FΔt, and J = Δp = mΔv.",
        explain: `J = ${F} × ${s(dt)} = ${s(J)} N·s.${askV ? ` v = J ÷ m = ${s(J)} ÷ ${s(m)} = ${s(J / m)} m/s.` : ""}`,
      },
      kp(askV ? J / m : J),
    );
  },
  () => {
    const items = [
      { p: "Why does an airbag reduce injuries in a crash?", a: "It makes the stopping time longer, so the force is smaller", w: ["It reduces the change in momentum", "It reduces the impulse", "It makes the stop shorter"], e: "Your Δp is the same either way. Spreading it over a longer Δt lowers the average force (F = Δp ÷ Δt)." },
      { p: "A ball hits a wall either sticking or bouncing back. Which gives the larger impulse from the wall?", a: "Bouncing back", w: ["Sticking", "They are equal", "It depends on the wall"], e: "Bouncing reverses the velocity, so Δp is bigger: the wall must stop the ball and then push it back." },
      { p: "To catch a water balloon without breaking it, you should…", a: "move your hands back as you catch it", w: ["hold your hands rigid", "move your hands toward it", "catch it as fast as possible"], e: "Moving your hands back stretches out Δt, so the same Δp needs a smaller force." },
      { p: "A small force acts for a long time; a large force acts for a short time. Can they give the same impulse?", a: "Yes, if F × Δt is the same", w: ["No, the large force always wins", "No, the long time always wins", "Only if the masses are equal"], e: "Impulse is FΔt. 10 N for 2 s and 100 N for 0.2 s both give 20 N·s." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `imp-concept-${i}`, prompt: it.p, hint: "Impulse = FΔt = Δp.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.4.2 — impulse as the area under a force–time graph. */
export const forceTimeGraphs: Gen = mix(
  () => {
    const F = pick([4, 6, 8, 10]);
    const t1 = rand(1, 3);
    const t2 = t1 + rand(0, 3);
    const t3 = t2 + rand(1, 3);
    const pts: Pt[] = [
      [0, 0],
      [t1, F],
      [t2, F],
      [t3, 0],
    ];
    const J = areaUnder(pts, 0, t3);
    const m = pick([1, 2, 4, 5]);
    const v0 = pick([0, 0, 1, 2]);
    const askV = Math.random() < 0.5;
    return q(
      {
        key: `ft-area-${F}-${t1}-${t2}-${t3}-${m}-${v0}-${askV}`,
        prompt: askV
          ? `A fan pushes a ${m} kg cart (moving at ${v0} m/s) with the force shown. What is the cart's speed at t = ${t3} s? (No friction.)`
          : "What impulse does this force deliver?",
        visual: graph([0, 10], [0, 12], pts, "F (N) vs t (s)", { shade: { from: 0, to: t3 }, dots: pts.map(([x, y]) => ({ x, y })), colour: "grape" }),
        needsVisual: true,
        unit: askV ? "m/s" : "N·s",
        hint: "Impulse is the area under the F–t graph." + (askV ? " Then Δv = J ÷ m." : ""),
        explain: `Area = ${s(J)} N·s.${askV ? ` Δv = ${s(J)} ÷ ${m} = ${s(J / m)} m/s, so v = ${v0} + ${s(J / m)} = ${s(v0 + J / m)} m/s.` : ""}`,
      },
      kp(askV ? v0 + J / m : J),
    );
  },
  () => {
    const F1 = pick([4, 6, 8]);
    const F2 = pick([2, 4]);
    const a = rand(2, 4);
    const b = rand(2, 4);
    const pts: Pt[] = [
      [0, F1],
      [a, F1],
      [a + 0.001, -F2],
      [a + b, -F2],
    ];
    const J = F1 * a - F2 * b;
    return q(
      {
        key: `ft-neg-${F1}-${F2}-${a}-${b}`,
        prompt: `A cart is pushed forward, then backward. What is the net impulse from t = 0 to t = ${a + b} s (forward is +)?`,
        visual: graph([0, 10], [-6, 10], pts, "F (N) vs t (s)", { shade: { from: 0, to: a + b }, colour: "grape" }),
        needsVisual: true,
        unit: "N·s",
        hint: "Area above the axis is + impulse, area below is −.",
        explain: `${F1} × ${a} − ${F2} × ${b} = ${s(J)} N·s.`,
      },
      sk(J, [F1 * a + F2 * b, -J]),
    );
  },
  () => {
    const F = pick([400, 600, 800, 1000, 1200]);
    const T = pick([0.02, 0.04, 0.05, 0.1]);
    const J = 0.5 * F * T;
    const askAvg = Math.random() < 0.5;
    return q(
      {
        key: `ft-kick-${F}-${T}-${askAvg}`,
        prompt: askAvg
          ? `A kick's force rises steadily to ${F} N and falls back to 0 over ${s(T)} s (a triangle on the F–t graph). What is the average force?`
          : `A kick's force rises steadily to ${F} N and falls back to 0 over ${s(T)} s (a triangle on the F–t graph). What impulse does it give the ball?`,
        unit: askAvg ? "N" : "N·s",
        hint: askAvg ? "Average force = impulse ÷ time. For a triangle that's half the peak." : "Area of a triangle: ½ × base × height.",
        explain: `J = ½ × ${s(T)} × ${F} = ${s(J)} N·s.${askAvg ? ` F_avg = ${s(J)} ÷ ${s(T)} = ${s(J / T)} N.` : ""}`,
      },
      kp(askAvg ? J / T : J, askAvg ? [F] : [F * T]),
    );
  },
);

/** PHYS.4.1, PHYS.4.2 — Do it: draw the impulse that changes one momentum into another. */
export const impulseArrows: Gen = mix(
  () => {
    const a = rand(2, 5);
    return q(
      {
        key: `ia-stop-${a}`,
        prompt: `A puck's momentum p_i is ${a} units to the right. Draw the impulse J that stops it.`,
        speech: `A puck's momentum is ${a} units to the right. Draw the impulse that stops it.`,
        hint: "p_final = p_i + J. For p_final = 0, J must cancel p_i.",
        explain: `J = 0 − p_i = ${a} units to the left.`,
      },
      act({ kind: "phys-forceArrows", object: "dot", directions: 8, maxSize: 6, given: [{ dir: 0, size: a, label: "p_i", colour: "wave" }], arrows: [{ label: "J", colour: "berry", answer: { dir: 180, size: a } }], check: "net", net: { x: 0, y: 0 } }, a),
    );
  },
  () => {
    const a = rand(1, 4);
    const b = rand(1, 6 - a);
    const vertical = Math.random() < 0.5;
    return q(
      {
        key: `ia-bounce-${a}-${b}-${vertical}`,
        prompt: vertical
          ? `A ball falls onto the floor with momentum ${a} units down and bounces up with ${b} units up. Draw the impulse J from the floor.`
          : `A ball hits a wall with momentum ${a} units right and bounces back with ${b} units left. Draw the impulse J from the wall.`,
        hint: "J = Δp = p_final − p_initial. Reversing direction needs a big impulse: it must cancel p_i and then supply p_final.",
        explain: `J = ${b} − (−${a}) = ${a + b} units ${vertical ? "up" : "left"}.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          object: "dot",
          directions: 8,
          maxSize: 6,
          given: [{ dir: vertical ? 270 : 0, size: a, label: "p_i", colour: "wave" }],
          arrows: [{ label: "J", colour: "berry", answer: { dir: vertical ? 90 : 180, size: a + b } }],
          check: "net",
          net: vertical ? { x: 0, y: b } : { x: -b, y: 0 },
        },
        a + b,
      ),
    );
  },
  () => {
    const a = rand(2, 4);
    const b = rand(1, 4);
    return q(
      {
        key: `ia-turn-${a}-${b}`,
        prompt: `A hockey puck has momentum p_i = ${a} units to the right. A stick hit changes it to ${a} right and ${b} up. Draw the impulse J.`,
        speech: `A hockey puck has momentum ${a} units to the right. A stick hit changes it to ${a} units right and ${b} units up. Draw the impulse.`,
        hint: "Momentum adds like vectors: p_i + J = p_final. Which part changed?",
        explain: `Only the up part changed, from 0 to ${b}, so J = ${b} units straight up.`,
      },
      act({ kind: "phys-forceArrows", object: "dot", directions: 8, maxSize: 6, given: [{ dir: 0, size: a, label: "p_i", colour: "wave" }], arrows: [{ label: "J", colour: "berry", answer: { dir: 90, size: b } }], check: "net", net: { x: a, y: b } }, b),
    );
  },
  () => {
    const a = rand(1, 3);
    const c = rand(a + 1, 6);
    const slow = Math.random() < 0.5;
    const [pi, pf] = slow ? [c, a] : [a, c];
    return q(
      {
        key: `ia-speed-${pi}-${pf}`,
        prompt: `A cart's momentum changes from ${pi} units right to ${pf} units right. Draw the impulse J that did it.`,
        hint: "J = p_final − p_initial.",
        explain: `J = ${pf} − ${pi} = ${s(pf - pi)}: ${Math.abs(pf - pi)} units to the ${pf > pi ? "right" : "left"}.`,
      },
      act({ kind: "phys-forceArrows", object: "dot", directions: 8, maxSize: 6, given: [{ dir: 0, size: pi, label: "p_i", colour: "wave" }], arrows: [{ label: "J", colour: "berry", answer: { dir: pf > pi ? 0 : 180, size: Math.abs(pf - pi) } }], check: "net", net: { x: pf, y: 0 } }, Math.abs(pf - pi)),
    );
  },
);

/** PHYS.4.3 — conservation of momentum: explosions and recoil. */
export const recoil: Gen = mix(
  () => {
    const [m1, m2] = until(
      () => [pick([40, 50, 60, 75]), pick([50, 60, 75, 80, 100])],
      ([a, b]) => a !== b,
    );
    const v1 = pick([1, 1.5, 2, 3]);
    const v2 = (m1 * v1) / m2;
    const r = rd(v2, 2);
    return q(
      {
        key: `rc-skate-${m1}-${m2}-${v1}`,
        prompt: `Two skaters stand at rest and push apart. The ${m1} kg skater moves off at ${s(v1)} m/s. How fast does the ${m2} kg skater move? Round to 2 decimal places if needed.`,
        unit: "m/s",
        hint: "Total momentum starts at 0, so m₁v₁ = m₂v₂ (opposite directions).",
        explain: `${m1} × ${s(v1)} = ${m2} × v₂, so v₂ = ${s(m1 * v1)} ÷ ${m2} = ${s(r)} m/s, the other way.`,
      },
      kp(r),
    );
  },
  () => {
    const [mb, vb, mg] = pick([
      [0.01, 400, 4],
      [0.02, 500, 5],
      [0.01, 600, 3],
      [0.05, 300, 5],
      [0.02, 400, 4],
    ]);
    const v = (mb * vb) / mg;
    return q(
      {
        key: `rc-gun-${mb}-${vb}-${mg}`,
        prompt: `A ${s(mg)} kg rifle fires a ${s(mb)} kg bullet at ${vb} m/s. What is the rifle's recoil speed?`,
        unit: "m/s",
        hint: "Before firing, p = 0. After: m_bullet v_bullet + m_rifle v_rifle = 0.",
        explain: `v = ${s(mb)} × ${vb} ÷ ${mg} = ${s(v)} m/s backward.`,
      },
      kp(v),
    );
  },
  () => {
    const M = pick([2, 3, 4, 6]);
    const m = pick([1, 2]);
    const v1 = pick([2, 3, 4, 6]);
    const v2 = (m * v1) / (M - m);
    if (!isStep(v2, 0.5) || M <= m) return recoil();
    return q(
      {
        key: `rc-split-${M}-${m}-${v1}`,
        prompt: `A ${M} kg cart at rest has a compressed spring inside. It springs apart into two pieces; the ${m} kg piece moves left at ${v1} m/s. What is the velocity of the other piece (right is +)?`,
        unit: "m/s",
        hint: "Total momentum stays 0. The other piece has mass M − m.",
        explain: `0 = ${m}(−${v1}) + ${M - m}v, so v = ${s(v2)} m/s (to the right).`,
      },
      sk(v2, [-v2, (m * v1) / M]),
    );
  },
  () => {
    const items = [
      { p: "A firecracker at rest explodes into pieces. What is the total momentum of the pieces right after?", a: "Zero", w: ["Equal to the explosion's energy", "Positive", "It depends on the number of pieces"], e: "The explosion forces are internal, so the system's momentum stays what it was: zero." },
      { p: "Two carts at rest push apart with a spring. Which is conserved for the two-cart system?", a: "Momentum, but not kinetic energy", w: ["Kinetic energy, but not momentum", "Both", "Neither"], e: "Momentum stays 0. Kinetic energy goes from 0 to positive (it came from the spring)." },
      { p: "An astronaut floating at rest throws a wrench forward. What happens to her?", a: "She moves backward", w: ["She stays still", "She moves forward", "She spins only"], e: "Momentum stays 0: the wrench gets forward momentum, she gets equal backward momentum." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `rc-concept-${i}`, prompt: it.p, hint: "With no external net force, the total momentum of a system can't change.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.4.4 — perfectly inelastic (sticky) collisions. */
export const stickyCollisions: Gen = mix(
  () => {
    const [m1, v1, m2, v2] = until(
      () => [rand(1, 5), rand(1, 6), rand(1, 5), pick([0, 0, -1, -2, -3, 1, 2])],
      ([a, va, b, vb]) => isStep((a * va + b * vb) / (a + b), 0.5) && a * va + b * vb !== 0 && va !== vb,
    );
    const vf = (m1 * v1 + m2 * v2) / (m1 + m2);
    return q(
      {
        key: `sc-v-${m1}-${v1}-${m2}-${v2}`,
        prompt: "The carts collide and stick together. What is their velocity afterward (right is +)?",
        visual: {
          kind: "phys-collision",
          before: [
            { mass: m1, v: v1, vSize: v1 },
            { mass: m2, v: Math.abs(v2), vSize: v2 },
          ],
          after: [{ mass: m1 + m2, v: "?", vSize: Math.sign(vf) * Math.max(1, Math.abs(vf)) }],
        },
        needsVisual: true,
        unit: "m/s",
        hint: "Momentum before = momentum after: m₁v₁ + m₂v₂ = (m₁ + m₂)v.",
        explain: `p = ${m1}(${v1}) + ${m2}(${s(v2)}) = ${m1 * v1 + m2 * v2} kg·m/s. v = ${m1 * v1 + m2 * v2} ÷ ${m1 + m2} = ${s(vf)} m/s.`,
      },
      sk(vf, [(m1 * v1 + m2 * Math.abs(v2)) / (m1 + m2), -vf, (v1 + v2) / 2]),
    );
  },
  () => {
    const [m1, v1, m2] = pick([
      [2, 3, 1],
      [1, 6, 2],
      [3, 4, 1],
      [2, 6, 4],
      [1, 4, 1],
      [4, 5, 1],
    ]);
    const vf = (m1 * v1) / (m1 + m2);
    const K1 = 0.5 * m1 * v1 * v1;
    const K2 = 0.5 * (m1 + m2) * vf * vf;
    return q(
      {
        key: `sc-ke-${m1}-${v1}-${m2}`,
        prompt: `A ${m1} kg cart at ${v1} m/s hits a ${m2} kg cart at rest and they stick. How much kinetic energy is lost?`,
        unit: "J",
        hint: "Find the shared speed with momentum, then compare ½mv² before and after.",
        explain: `v = ${m1 * v1} ÷ ${m1 + m2} = ${s(vf)} m/s. K before = ${s(K1)} J; after = ${s(K2)} J; lost ${s(K1 - K2)} J (to heat, sound and deformation).`,
      },
      kp(K1 - K2, [K2, K1, 0]),
    );
  },
  () => {
    const k = pick([1, 2, 3]);
    const vb = 70 * k;
    const ask = Math.random() < 0.5;
    return q(
      {
        key: `sc-pend-${k}-${ask}`,
        prompt: `A 0.02 kg bullet at ${vb} m/s embeds in a 0.98 kg block hanging on strings. ${ask ? "How fast does the block move just after?" : "How high does the block swing?"}`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 0, angleLabel: null, massLabel: 0.98 },
        unit: ask ? "m/s" : "m",
        hint: "Two steps: momentum is conserved in the (sticky) collision; then mechanical energy is conserved in the swing: v² = 2gh.",
        explain: `v = 0.02 × ${vb} ÷ 1.00 = ${s(1.4 * k)} m/s.${ask ? "" : ` Then h = v² ÷ 2g = ${s(1.96 * k * k)} ÷ 19.6 = ${s(0.1 * k * k)} m.`}`,
      },
      kp(ask ? 1.4 * k : 0.1 * k * k),
    );
  },
);

/** PHYS.4.4 — elastic collisions (momentum and kinetic energy both conserved). */
export const elasticCollisions: Gen = mix(
  () => {
    const [m1, m2, v] = pick([
      [1, 3, 4],
      [3, 1, 4],
      [2, 3, 5],
      [3, 2, 5],
      [1, 4, 5],
      [1, 1, 3],
      [2, 2, 4],
      [1, 2, 6],
    ]);
    const v1 = ((m1 - m2) * v) / (m1 + m2);
    const v2 = (2 * m1 * v) / (m1 + m2);
    const askA = Math.random() < 0.5 && v1 !== 0;
    return q(
      {
        key: `el-at-rest-${m1}-${m2}-${v}-${askA}`,
        prompt: askA
          ? `The collision is elastic and B moves off at ${s(v2)} m/s. What is A's velocity afterward (right is +)?`
          : `The collision is elastic and A ends up moving at ${s(Math.abs(v1))} m/s ${v1 < 0 ? "left" : v1 > 0 ? "right" : "(at rest)"}. How fast does B move?`,
        visual: {
          kind: "phys-collision",
          before: [
            { mass: m1, v, vSize: v, name: "A" },
            { mass: m2, v: 0, vSize: 0, name: "B" },
          ],
          after: [
            { mass: m1, v: askA ? "?" : Math.abs(v1), vSize: v1, name: "A" },
            { mass: m2, v: askA ? v2 : "?", vSize: v2, name: "B" },
          ],
        },
        needsVisual: true,
        unit: "m/s",
        hint: "Use momentum: m_A v_A = m_A v_A′ + m_B v_B′. Keep signs (left is −).",
        explain: `${m1}(${v}) = ${m1}v_A′ + ${m2}v_B′. ${askA ? `${m1 * v} = ${m1}v_A′ + ${s(m2 * v2)}, so v_A′ = ${s(v1)} m/s.` : `${m1 * v} = ${s(m1 * v1)} + ${m2}v_B′, so v_B′ = ${s(v2)} m/s.`} Check: K = ${s(0.5 * m1 * v * v)} J before and after.`,
      },
      askA ? sk(v1, [-v1, v - v2]) : kp(v2),
    );
  },
  () => {
    const cases = [
      { m1: 1, u1: 4, m2: 1, u2: 0, w1: 0, w2: 4 },
      { m1: 2, u1: 3, m2: 1, u2: 0, w1: 1, w2: 4 },
      { m1: 1, u1: 6, m2: 2, u2: 0, w1: 0, w2: 3 },
      { m1: 3, u1: 4, m2: 1, u2: 0, w1: 2.5, w2: 4.5 },
      { m1: 2, u1: 3, m2: 1, u2: 0, w1: 2, w2: 2 },
      { m1: 1, u1: 4, m2: 1, u2: -2, w1: -2, w2: 4 },
      { m1: 4, u1: 3, m2: 2, u2: 0, w1: 1, w2: 4 },
      { m1: 2, u1: 4, m2: 2, u2: 0, w1: 1, w2: 3 },
    ];
    const i = rand(0, cases.length - 1);
    const c = cases[i];
    const K1 = 0.5 * c.m1 * c.u1 * c.u1 + 0.5 * c.m2 * c.u2 * c.u2;
    const K2 = 0.5 * c.m1 * c.w1 * c.w1 + 0.5 * c.m2 * c.w2 * c.w2;
    const stuck = c.w1 === c.w2;
    const kind = Math.abs(K1 - K2) < 1e-9 ? "Elastic" : stuck ? "Perfectly inelastic" : "Inelastic";
    const cart = (m: number, v: number, name: string) => ({ mass: m, v: Math.abs(v), vSize: v, name });
    return q(
      {
        key: `el-classify-${i}`,
        prompt: "Momentum is conserved here. What kind of collision is it?",
        visual: {
          kind: "phys-collision",
          before: [cart(c.m1, c.u1, "A"), cart(c.m2, c.u2, "B")],
          after: stuck ? [{ mass: c.m1 + c.m2, v: c.w1, vSize: c.w1 }] : [cart(c.m1, c.w1, "A"), cart(c.m2, c.w2, "B")],
        },
        needsVisual: true,
        hint: "Compare total kinetic energy before and after. Same → elastic; less → inelastic; stuck together → perfectly inelastic.",
        explain: `K before = ${s(K1)} J, after = ${s(K2)} J. ${kind === "Elastic" ? "No KE lost: elastic." : stuck ? "They move together: perfectly inelastic (the most KE lost)." : "Some KE lost but they separate: inelastic."}`,
      },
      lab(kind, ["Elastic", "Inelastic", "Perfectly inelastic"].filter((k) => k !== kind)),
    );
  },
  () => {
    const v1 = rand(2, 5);
    const v2 = rand(1, 4);
    const askA = Math.random() < 0.5;
    return q(
      {
        key: `el-equal-${v1}-${v2}-${askA}`,
        prompt: `Two identical 1 kg carts collide head-on elastically: A moves right at ${v1} m/s, B moves left at ${v2} m/s. What is ${askA ? "A" : "B"}'s velocity afterward (right is +)?`,
        unit: "m/s",
        hint: "For equal masses in a 1D elastic collision, the carts swap velocities.",
        explain: `They swap: A leaves at ${s(-v2)} m/s, B at ${v1} m/s. Check: p = ${v1 - v2} and K = ${s(0.5 * (v1 * v1 + v2 * v2))} J both before and after.`,
      },
      sk(askA ? -v2 : v1),
    );
  },
);

/** PHYS.4.4 — Do it: sort collisions into elastic, inelastic and perfectly inelastic. */
export const collisionSort: Gen = mix(
  () => {
    const pool = [
      { label: "Two clay balls hit and stick together", bin: 2 },
      { label: "Carts with velcro join and roll off together", bin: 2 },
      { label: "A bullet embeds in a wooden block", bin: 2 },
      { label: "Steel ball bearings bounce; total KE is unchanged", bin: 0 },
      { label: "Gas molecules collide with no KE lost", bin: 0 },
      { label: "Cars crumple, then bounce apart", bin: 1 },
      { label: "A tennis ball hits a racket and bounces, a little KE lost", bin: 1 },
      { label: "1 kg at 4 m/s hits 1 kg at rest → 0 and 4 m/s", bin: 0 },
      { label: "2 kg at 3 m/s hits 1 kg at rest → 1 and 4 m/s", bin: 0 },
      { label: "2 kg at 3 m/s hits 1 kg at rest → both 2 m/s", bin: 2 },
      { label: "1 kg at 6 m/s hits 2 kg at rest → 0 and 3 m/s", bin: 1 },
      { label: "3 kg at 4 m/s hits 1 kg at rest → 2.5 and 4.5 m/s", bin: 1 },
    ];
    const picks = until(
      () => shuffle(pool.map((_, i) => i)).slice(0, 6),
      (ix) => [0, 1, 2].every((b) => ix.some((i) => pool[i].bin === b)),
    );
    return q(
      {
        key: `cs-sort-${[...picks].sort((a, b) => a - b).join("-")}`,
        prompt: "Sort each collision. (Momentum is conserved in all of them.)",
        hint: "Elastic: total KE the same. Inelastic: KE lost, but they separate. Perfectly inelastic: they stick together.",
        explain: "For the numbers, compare ½mv² before and after. Sticking together always loses the most KE.",
      },
      act({ kind: "sort", bins: ["Elastic", "Inelastic", "Perfectly inelastic"], items: picks.map((i) => pool[i]) }, picks.length),
    );
  },
  () => {
    const K1 = pick([20, 40, 60, 80]);
    const frac = pick([1, 0.75, 0.5, 0.25]);
    const stuck = frac < 1 && Math.random() < 0.3;
    const kind = frac === 1 ? "Elastic" : stuck ? "Perfectly inelastic" : "Inelastic";
    return q(
      {
        key: `cs-ke-${K1}-${frac}-${stuck}`,
        prompt: `Before a collision the total KE is ${K1} J; after, it is ${s(K1 * frac)} J and the objects ${stuck ? "move off stuck together" : "move apart"}. What kind of collision is it?`,
        hint: "Is KE conserved? Did they stick?",
        explain: frac === 1 ? "KE is unchanged: elastic." : stuck ? "KE was lost and they stuck together: perfectly inelastic." : `${s(K1 * (1 - frac))} J of KE was lost but they separated: inelastic.`,
      },
      lab(kind, ["Elastic", "Inelastic", "Perfectly inelastic", "Impossible: momentum isn't conserved"].filter((k) => k !== kind)),
    );
  },
);

/** PHYS.4.3 — Do it: momentum bar charts before and after a collision. */
const MOMENTUM_CASES = [
  [2, 3, 1, 1, 4],
  [2, 3, 1, 2, 2],
  [3, 4, 1, 2, 6],
  [1, 6, 2, 0, 3],
  [4, 3, 2, 1, 4],
  [2, 5, 3, 2, 2],
  [1, 8, 1, 2, 6],
  [3, 2, 1, 1, 3],
];
export const momentumBars: Gen = mix(
  () => {
    const i = rand(0, MOMENTUM_CASES.length - 1);
    const [mA, vA, mB, wA, wB] = MOMENTUM_CASES[i];
    return q(
      {
        key: `mb-build-${i}`,
        prompt: `Cart A (${mA} kg, ${vA} m/s) hits cart B (${mB} kg, at rest). Afterward A moves at ${wA} m/s the same way. Build the momentum bar chart.`,
        hint: "p = mv for each bar. The two 'after' bars must add up to the same total as the 'before' bars.",
        explain: `Before: A ${mA * vA}, B 0. After: A ${mA * wA}, so B = ${mA * vA} − ${mA * wA} = ${mB * wB} kg·m/s.`,
      },
      act(
        {
          kind: "barGraph",
          title: "Momentum (kg·m/s)",
          items: [
            { label: "A before", value: mA * vA },
            { label: "B before", value: 0 },
            { label: "A after", value: mA * wA },
            { label: "B after", value: mB * wB },
          ],
          max: 16,
          step: 1,
          hideData: true,
        },
        mB * wB,
      ),
    );
  },
  () => {
    const i = rand(0, MOMENTUM_CASES.length - 1);
    const [mA, vA, mB, wA, wB] = MOMENTUM_CASES[i];
    const askV = Math.random() < 0.5;
    return q(
      {
        key: `mb-read-${i}-${askV}`,
        prompt: askV ? `The bar chart shows the carts' momenta. Cart B has a mass of ${mB} kg. How fast does B move after?` : "The bar chart shows momenta before and after a collision. What is B's momentum after?",
        visual: {
          kind: "bars",
          title: "Momentum (kg·m/s)",
          items: [
            { label: "A before", value: mA * vA },
            { label: "B before", value: 0 },
            { label: "A after", value: mA * wA },
          ],
          max: 16,
          step: 2,
        },
        needsVisual: true,
        unit: askV ? "m/s" : "kg·m/s",
        hint: "The total momentum after equals the total before.",
        explain: `Total = ${mA * vA}. B after = ${mA * vA} − ${mA * wA} = ${mB * wB} kg·m/s${askV ? `, so v = ${mB * wB} ÷ ${mB} = ${wB} m/s` : ""}.`,
      },
      kp(askV ? wB : mB * wB),
    );
  },
);

/** PHYS.4.3, PHYS.2.1 — the center of mass of a system and its velocity. */
export const centerOfMassMotion: Gen = mix(
  () => {
    const [m1, v1, m2, v2] = until(
      () => [rand(1, 5), rand(-4, 6), rand(1, 5), rand(-6, 4)],
      ([a, va, b, vb]) => va !== vb && isStep((a * va + b * vb) / (a + b), 0.5),
    );
    const v = (m1 * v1 + m2 * v2) / (m1 + m2);
    return q(
      {
        key: `cmm-v-${m1}-${v1}-${m2}-${v2}`,
        prompt: `A ${m1} kg cart moves at ${s(v1)} m/s and a ${m2} kg cart at ${s(v2)} m/s (right is +). What is the velocity of their center of mass?`,
        unit: "m/s",
        hint: "v_cm = total momentum ÷ total mass.",
        explain: `v_cm = (${m1}×${s(v1)} + ${m2}×${s(v2)}) ÷ ${m1 + m2} = ${s(m1 * v1 + m2 * v2)} ÷ ${m1 + m2} = ${s(v)} m/s. A collision between them can't change it.`,
      },
      sk(v, [(v1 + v2) / 2, -v]),
    );
  },
  () => {
    const R = pick([40, 60, 80, 100]);
    return q(
      {
        key: `cmm-shell-${R}`,
        prompt: `A shell would land ${R} m away, but at the top of its path it splits into two equal halves. One half drops straight down. Where does the other half land (no air)?`,
        unit: "m",
        hint: "The center of mass still lands at the original spot. The first half lands under the top of the path, halfway.",
        explain: `The first half lands at ${R / 2} m. The center of mass lands at ${R} m, so the other half is as far beyond ${R} m as the first is short: ${s(1.5 * R)} m.`,
      },
      kp(1.5 * R, [R, 2 * R, R / 2]),
    );
  },
  () => {
    const F = pick([10, 20, 50]);
    const t = pick([2, 3, 4, 5]);
    const items = [
      { p: `Two carts collide on a track while a ${F} N external force pushes the pair for ${t} s. By how much does the system's total momentum change?`, ans: F * t, u: "kg·m/s", e: `Δp_system = F_ext Δt = ${F} × ${t} = ${F * t} kg·m/s. Internal collision forces cancel.` },
    ];
    const it = items[0];
    return q({ key: `cmm-ext-${F}-${t}`, prompt: it.p, unit: it.u, hint: "Only external forces change a system's momentum: Δp = F_ext Δt.", explain: it.e }, kp(it.ans));
  },
  () => {
    const items = [
      { p: "Two carts collide on a frictionless track. How does the velocity of their center of mass change?", a: "It doesn't change", w: ["It increases", "It drops to zero", "It reverses"], e: "With no external force, total momentum (= M v_cm) is constant." },
      { p: "When is the momentum of a system conserved?", a: "When the net external force on it is zero", w: ["When the collision is elastic", "When no forces act inside it", "Only when objects stick"], e: "Internal forces come in third-law pairs and cancel. Only a net external force can change total momentum." },
      { p: "A ball falls toward Earth. For the ball + Earth system, is momentum conserved?", a: "Yes: Earth gains equal upward momentum", w: ["No: the ball speeds up", "No: gravity is a force", "Only after it lands"], e: "Gravity is internal to ball + Earth. Earth moves up (very slightly) with momentum equal and opposite to the ball's." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `cmm-concept-${i}`, prompt: it.p, hint: "Pick the system first. External forces change its momentum; internal ones can't.", explain: it.e }, lab(it.a, it.w));
  },
);

/* ======================================================= 5. Torque and rotational dynamics */

/** "4π", "π/2", "3π/2". */
function piText(n: number, d = 1) {
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const k = g(n, d);
  const [a, b] = [n / k, d / k];
  const top = a === 1 ? "π" : `${a}π`;
  return b === 1 ? top : `${top}/${b}`;
}

/** PHYS.5.1 — rotational kinematics. */
export const rotationalKinematics: Gen = mix(
  () => {
    const rev = pick([0.25, 0.5, 1, 2, 3, 5, 10]);
    const n = rev * 4;
    const correct = `${piText(2 * n, 4)} rad`;
    return q(
      {
        key: `rk-rev-${rev}`,
        prompt: `A wheel turns ${s(rev)} revolution${rev === 1 ? "" : "s"}. What angle is that in radians?`,
        hint: "One revolution = 2π rad.",
        explain: `${s(rev)} × 2π = ${correct}.`,
      },
      lab(correct, [`${piText(n, 4)} rad`, `${piText(4 * n, 4)} rad`, `${s(rev * 360)} rad`, `${piText(n + 4, 4)} rad`]),
    );
  },
  () => {
    const w0 = pick([0, 2, 4, 6, 10]);
    const a = pick([1, 2, 3, 4, -2]);
    const t = pick([2, 3, 4, 5]);
    if (w0 + a * t < 0) return rotationalKinematics();
    const askTheta = Math.random() < 0.5;
    const w = w0 + a * t;
    const th = w0 * t + 0.5 * a * t * t;
    return q(
      {
        key: `rk-eq-${w0}-${a}-${t}-${askTheta}`,
        prompt: `A turntable spins at ${w0} rad/s and has a constant angular acceleration of ${s(a)} rad/s². ${askTheta ? `Through what angle does it turn in ${t} s?` : `What is its angular velocity after ${t} s?`}`,
        unit: askTheta ? "rad" : "rad/s",
        hint: askTheta ? "θ = ω₀t + ½αt², just like x = v₀t + ½at²." : "ω = ω₀ + αt, just like v = v₀ + at.",
        explain: askTheta ? `θ = ${w0}(${t}) + ½(${s(a)})(${t})² = ${s(th)} rad.` : `ω = ${w0} + (${s(a)})(${t}) = ${s(w)} rad/s.`,
      },
      kp(askTheta ? th : w),
    );
  },
  () => {
    const [w0, a] = pick([
      [10, 5],
      [12, 4],
      [20, 5],
      [8, 2],
      [6, 3],
      [30, 10],
    ]);
    const askT = Math.random() < 0.4;
    return q(
      {
        key: `rk-stop-${w0}-${a}-${askT}`,
        prompt: `A fan spinning at ${w0} rad/s is switched off and slows steadily at ${a} rad/s². ${askT ? "How long does it take to stop?" : "Through what angle does it turn while stopping?"}`,
        unit: askT ? "s" : "rad",
        hint: askT ? "0 = ω₀ − αt." : "ω² = ω₀² + 2αθ with ω = 0 and α negative.",
        explain: askT ? `t = ${w0} ÷ ${a} = ${s(w0 / a)} s.` : `θ = ω₀² ÷ 2α = ${w0 * w0} ÷ ${2 * a} = ${s((w0 * w0) / (2 * a))} rad.`,
      },
      kp(askT ? w0 / a : (w0 * w0) / (2 * a)),
    );
  },
  () => {
    const ccw = Math.random() < 0.5;
    const speeding = Math.random() < 0.5;
    const wSign = ccw ? "+" : "−";
    const aSign = speeding ? wSign : ccw ? "−" : "+";
    return q(
      {
        key: `rk-sign-${ccw}-${speeding}`,
        prompt: `Counterclockwise is positive. A wheel turning ${ccw ? "counterclockwise" : "clockwise"} is ${speeding ? "speeding up" : "slowing down"}. What are the signs of ω and α?`,
        hint: "Just like v and a: α has the same sign as ω when speeding up, the opposite when slowing down.",
        explain: `ω is ${wSign} (${ccw ? "counterclockwise" : "clockwise"}) and α is ${aSign}.`,
      },
      lab(`ω ${wSign}, α ${aSign}`, ["ω +, α +", "ω +, α −", "ω −, α +", "ω −, α −"]),
    );
  },
);

/** PHYS.5.1 — angular velocity–time graphs. */
export const angularGraphs: Gen = mix(
  () => {
    const { pts, slopes } = vtData(false);
    const k = rand(0, 2);
    return q(
      {
        key: `ag-alpha-${pts.flat().join("_")}-${k}`,
        prompt: `This is an ω–t graph for a spinning wheel. What is its angular acceleration from t = ${pts[k][0]} s to t = ${pts[k + 1][0]} s?`,
        speech: `This is an omega-time graph for a spinning wheel. What is its angular acceleration from ${pts[k][0]} to ${pts[k + 1][0]} seconds?`,
        visual: graph([0, 12], [0, 14], pts, "ω (rad/s) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })), colour: "tangerine" }),
        needsVisual: true,
        unit: "rad/s²",
        hint: "The slope of an ω–t graph is α.",
        explain: `α = Δω ÷ Δt = ${s(pts[k + 1][1] - pts[k][1])} ÷ ${pts[k + 1][0] - pts[k][0]} = ${s(slopes[k])} rad/s².`,
      },
      sk(slopes[k]),
    );
  },
  () => {
    const { pts } = vtData(false);
    const a = pts[rand(0, 1)][0];
    const b = pts[3][0];
    const th = areaUnder(pts, a, b);
    return q(
      {
        key: `ag-theta-${pts.flat().join("_")}-${a}`,
        prompt: `Through what angle does the wheel turn from t = ${a} s to t = ${b} s?`,
        visual: graph([0, 12], [0, 14], pts, "ω (rad/s) vs t (s)", { shade: { from: a, to: b }, dots: pts.map(([x, y]) => ({ x, y })), colour: "tangerine" }),
        needsVisual: true,
        unit: "rad",
        hint: "The area under an ω–t graph is the angular displacement Δθ.",
        explain: `The shaded area is ${s(th)} rad (about ${s(rd(th / (2 * Math.PI), 1))} turns).`,
      },
      kp(th),
    );
  },
  () => {
    const w = pick([1, 2, 3, 4]);
    const th0 = rand(0, 4);
    const pts: Pt[] = [
      [0, th0],
      [4, th0 + 4 * w],
    ];
    return q(
      {
        key: `ag-theta-t-${w}-${th0}`,
        prompt: "This θ–t graph is a straight line. What is the wheel's angular velocity?",
        speech: "This graph of angle against time is a straight line. What is the wheel's angular velocity?",
        visual: graph([0, 6], [0, 20], pts, "θ (rad) vs t (s)", { dots: pts.map(([x, y]) => ({ x, y })), colour: "tangerine" }),
        needsVisual: true,
        unit: "rad/s",
        hint: "The slope of θ–t is ω.",
        explain: `ω = (${th0 + 4 * w} − ${th0}) ÷ 4 = ${w} rad/s, constant (so α = 0).`,
      },
      kp(w),
    );
  },
);

/** PHYS.5.2 — connecting linear and rotational motion. */
export const linearToRotational: Gen = mix(
  () => {
    const r = pick([0.1, 0.2, 0.25, 0.5, 2]);
    const w = pick([2, 4, 5, 10, 20]);
    const ask = pick(["v", "ac"] as const);
    const ans = ask === "v" ? r * w : w * w * r;
    return q(
      {
        key: `lr-${r}-${w}-${ask}`,
        prompt: `A point is ${s(r)} m from the axle of a wheel spinning at a steady ${w} rad/s. What is its ${ask === "v" ? "linear speed" : "centripetal acceleration"}?`,
        unit: ask === "v" ? "m/s" : "m/s²",
        hint: ask === "v" ? "v = rω (ω in rad/s)." : "a_c = v² ÷ r = ω²r.",
        explain: ask === "v" ? `v = ${s(r)} × ${w} = ${s(r * w)} m/s.` : `a_c = ${w}² × ${s(r)} = ${s(w * w * r)} m/s².`,
      },
      kp(ans, [r * w, w * w * r, w / r]),
    );
  },
  () => {
    const r = pick([0.2, 0.25, 0.5]);
    const a = pick([0.5, 1, 1.5, 2]);
    const alpha = a / r;
    return q(
      {
        key: `lr-alpha-${r}-${a}`,
        prompt: `A rope wound on a ${s(r)} m radius drum is pulled so it speeds up at ${s(a)} m/s² (no slipping). What is the drum's angular acceleration?`,
        unit: "rad/s²",
        hint: "a_t = rα, so α = a ÷ r.",
        explain: `α = ${s(a)} ÷ ${s(r)} = ${s(alpha)} rad/s².`,
      },
      kp(alpha, [a * r]),
    );
  },
  () => {
    const pts = until(
      () => LETTERS.slice(0, 3).map((name) => ({ name, r: pick([1, 2, 3, 4]) })),
      (ps) => new Set(ps.map((p) => p.r)).size >= 2,
    );
    const ask = pick(["ω", "v", "a_c"] as const);
    return q(
      {
        key: `lr-rank-${pts.map((p) => p.r).join("")}-${ask}`,
        prompt: `Points A, B and C are painted on a spinning disk at the distances shown (cm from the centre). Rank their ${ask === "ω" ? "angular velocity" : ask === "v" ? "linear speed" : "centripetal acceleration"}, greatest first.`,
        visual: { kind: "table", header: ["Point", "distance (cm)"], rows: pts.map((p) => [p.name, p.r]) },
        needsVisual: true,
        hint: "Every point on a rigid disk has the same ω. Then v = rω and a_c = ω²r grow with r.",
        explain: ask === "ω" ? "All share the same ω: the disk turns as one piece." : `Same ω, so ${ask === "v" ? "v = rω" : "a_c = ω²r"} is biggest farthest out.`,
      },
      ranking(pts.map((p) => ({ name: p.name, value: ask === "ω" ? 1 : p.r }))),
    );
  },
  () => {
    const [r1, r2] = pick([
      [10, 5],
      [6, 3],
      [12, 4],
      [8, 2],
      [5, 10],
      [4, 8],
    ]);
    const w1 = pick([2, 3, 4, 6]);
    const w2 = (w1 * r1) / r2;
    return q(
      {
        key: `lr-belt-${r1}-${r2}-${w1}`,
        prompt: `A belt joins a ${r1} cm pulley to a ${r2} cm pulley without slipping. The ${r1} cm pulley turns at ${w1} rad/s. How fast does the ${r2} cm pulley turn?`,
        unit: "rad/s",
        hint: "The belt moves at one speed, so the rims share v: r₁ω₁ = r₂ω₂.",
        explain: `${r1} × ${w1} = ${r2} × ω₂, so ω₂ = ${s(w2)} rad/s.`,
      },
      kp(w2, [(w1 * r2) / r1, w1]),
    );
  },
);

/** PHYS.5.3 — torque τ = rF sin θ. */
export const torque: Gen = mix(
  () => {
    const th = pick([90, 30, 150, 0]);
    const F = pick([10, 20, 40, 50, 60]);
    const r = pick([0.2, 0.25, 0.5, 0.8, 1, 2]);
    const sin = { 90: 1, 30: 0.5, 150: 0.5, 0: 0 }[th]!;
    const tau = r * F * sin;
    return q(
      {
        key: `tq-calc-${th}-${F}-${r}`,
        prompt: `A ${F} N force is applied ${s(r)} m from a hinge, at ${th}° to the line from the hinge. What is the size of its torque?`,
        unit: "N·m",
        hint: "τ = rF sin θ, where θ is between r and F. Only the perpendicular part of F turns things.",
        explain: `τ = ${s(r)} × ${F} × sin ${th}° = ${s(tau)} N·m.${th === 0 ? " A force along the line through the hinge can't turn it." : ""}`,
      },
      kp(tau, [r * F, r * F * 0.87, F / r]),
    );
  },
  () => {
    const F1 = pick([10, 20, 30]);
    const r1 = pick([1, 2, 3]);
    const F2 = pick([10, 15, 20, 40]);
    const r2 = pick([1, 2, 3]);
    if (F1 * r1 === F2 * r2) return torque();
    const net = F1 * r1 - F2 * r2;
    return q(
      {
        key: `tq-net-${F1}-${r1}-${F2}-${r2}`,
        prompt: `On a bar pivoted at its centre, a ${F1} N force ${r1} m from the pivot turns it counterclockwise and a ${F2} N force ${r2} m away turns it clockwise (both perpendicular). What is the net torque (counterclockwise is +)?`,
        unit: "N·m",
        hint: "Find each torque (rF), give it a sign, and add.",
        explain: `τ_net = ${F1}×${r1} − ${F2}×${r2} = ${F1 * r1} − ${F2 * r2} = ${s(net)} N·m.`,
      },
      sk(net, [-net, F1 * r1 + F2 * r2]),
    );
  },
  () => {
    const items = [
      { p: "Which change would increase the torque you apply to a stuck bolt with a wrench?", a: "Push farther from the bolt, at 90° to the handle", w: ["Push closer to the bolt", "Push along the handle toward the bolt", "Push at 30° to the handle at the same spot"], e: "τ = rF sin θ: bigger r and θ = 90° give the most torque." },
      { p: "Where should you push on a door to open it with the least force?", a: "At the edge farthest from the hinges, perpendicular to the door", w: ["Near the hinges", "In the middle, at an angle", "On the edge, pushing toward the hinges"], e: "Largest lever arm and sin 90° = 1 give the most torque per newton." },
      { p: "A force acts straight toward an axle. What torque does it produce about that axle?", a: "Zero", w: ["Its maximum value", "rF", "It depends on the mass"], e: "The force's line passes through the axle: θ = 0°, so sin θ = 0 and the lever arm is zero." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `tq-concept-${i}`, prompt: it.p, hint: "τ = rF sin θ = (lever arm) × F.", explain: it.e }, lab(it.a, it.w));
  },
  () => {
    const fs = until(
      () => LETTERS.slice(0, 3).map((name) => ({ name, r: pick([1, 2, 3]), F: pick([10, 20, 30]), th: pick([90, 30]) })),
      (xs) => new Set(xs.map((x) => `${x.r}-${x.F}-${x.th}`)).size === 3,
    );
    return q(
      {
        key: `tq-rank-${fs.map((f) => `${f.r}.${f.F}.${f.th}`).join("_")}`,
        prompt: "Rank the torques about the pivot, greatest first.",
        visual: { kind: "table", header: ["Force", "r (m)", "F (N)", "angle"], rows: fs.map((f) => [f.name, f.r, f.F, `${f.th}°`]) },
        needsVisual: true,
        hint: "τ = rF sin θ; sin 90° = 1 and sin 30° = 0.5.",
        explain: fs.map((f) => `${f.name}: ${f.r}×${f.F}×${f.th === 90 ? 1 : 0.5} = ${s(f.r * f.F * (f.th === 90 ? 1 : 0.5))}`).join("; ") + " (N·m).",
      },
      ranking(fs.map((f) => ({ name: f.name, value: f.r * f.F * (f.th === 90 ? 1 : 0.5) }))),
    );
  },
);

/** PHYS.5.4 — rotational inertia. */
export const rotationalInertia: Gen = mix(
  () => {
    const m = pick([1, 2, 3, 0.5]);
    const L = pick([1, 2, 4]);
    const end = Math.random() < 0.5;
    const I = end ? m * L * L : 2 * m * (L / 2) * (L / 2);
    return q(
      {
        key: `ri-points-${m}-${L}-${end}`,
        prompt: `Two ${s(m)} kg balls are fixed to the ends of a light ${L} m rod. What is the rotational inertia about ${end ? "one end (one ball sits on the axis)" : "the centre of the rod"}?`,
        unit: "kg·m²",
        hint: "I = Σmr², with r measured from the axis. A mass on the axis adds nothing.",
        explain: end ? `Only the far ball counts: ${s(m)} × ${L}² = ${s(I)} kg·m².` : `Each ball is ${s(L / 2)} m out: 2 × ${s(m)} × ${s(L / 2)}² = ${s(I)} kg·m².`,
      },
      kp(I, [m * L * L * 2, m * L, 2 * m * L * L]),
    );
  },
  () => {
    const shapes = shuffle([
      { n: "hoop", c: 1 },
      { n: "solid disk", c: 0.5 },
      { n: "solid sphere", c: 0.4 },
      { n: "hollow sphere", c: 2 / 3 },
    ]).slice(0, 3);
    const named = shapes.map((sh, i) => ({ ...sh, name: LETTERS[i] }));
    return q(
      {
        key: `ri-shapes-${shapes.map((sh) => sh.n).join("-")}`,
        prompt: `Each object has the same mass M and radius R, spinning about its centre: ${named.map((sh) => `${sh.name} = ${sh.n}`).join(", ")}. Rank their rotational inertia, greatest first.`,
        hint: "The farther the mass sits from the axis, the bigger I. A hoop has all its mass at R.",
        explain: `I = MR² (hoop), ⅔MR² (hollow sphere), ½MR² (disk), ⅖MR² (solid sphere). ${named.map((sh) => sh.name).join(", ")} have ${named.map((sh) => s(rd(sh.c, 2))).join(", ")} × MR².`,
      },
      ranking(named.map((sh) => ({ name: sh.name, value: sh.c }))),
    );
  },
  () => {
    const sc = pick([
      { p: (M: number, L: number) => `A uniform rod (${M} kg, ${L} m) has I = ML²/12 about its centre. What is I about one end?`, I: (M: number, L: number) => (M * L * L) / 3, h: "Parallel-axis theorem: I = I_cm + Md², with d = L/2." },
      { p: (M: number, L: number) => `A uniform disk (${M} kg, radius ${L} m) has I = ½MR² about its centre. What is I about a point on its rim?`, I: (M: number, L: number) => 1.5 * M * L * L, h: "Parallel-axis theorem: I = I_cm + Md², with d = R." },
    ]);
    const M = pick([3, 6, 12]);
    const L = pick([1, 2]);
    const I = sc.I(M, L);
    return q(
      {
        key: `ri-pa-${sc.h.length}-${M}-${L}`,
        prompt: sc.p(M, L),
        unit: "kg·m²",
        hint: sc.h,
        explain: `I = I_cm + Md² = ${s(I - (sc.h.includes("L/2") ? (M * L * L) / 4 : M * L * L))} + ${s(sc.h.includes("L/2") ? (M * L * L) / 4 : M * L * L)} = ${s(I)} kg·m².`,
      },
      kp(I),
    );
  },
  () => {
    const f = pick([2, 3, 0.5]);
    const what = f === 0.5 ? "half as far from" : `${f} times as far from`;
    const factor = f * f;
    const text = (x: number) => (x === 1 ? "the same" : x < 1 ? (x === 0.25 ? "a quarter as big" : "half as big") : `${s(x)} times as big`);
    return q(
      {
        key: `ri-move-${f}`,
        prompt: `The masses on a spinning rod are moved ${what} the axis. How does the rotational inertia change? (The rod's own mass is tiny.)`,
        hint: "I = Σmr²: the distance is squared.",
        explain: `r × ${s(f)} means I × ${s(f)}² = ${s(factor)}: ${text(factor)}.`,
      },
      lab(text(factor), [text(f), text(factor * f), text(1), text(1 / factor)].filter((x) => x !== text(factor))),
    );
  },
);

/** A seesaw puzzle the kid can solve with the weights given. */
function seesaw(side: "right" | "both") {
  return until(
    () => {
      const slots = pick([4, 5]);
      const nFixed = side === "right" ? rand(1, 2) : 2;
      const fixed = Array.from({ length: nFixed }, (_, i) => ({
        side: side === "right" ? ("left" as const) : i === 0 ? ("left" as const) : ("right" as const),
        at: rand(1, slots),
        mass: pick([1, 2, 3, 4]),
      }));
      const mass = pick([1, 2]);
      return { kind: "phys-balance" as const, slots, fixed, mass, side, unit: "kg" };
    },
    (a) => {
      const L = a.fixed.filter((f) => f.side === "left").reduce((t, f) => t + f.mass * f.at, 0);
      const R = a.fixed.filter((f) => f.side === "right").reduce((t, f) => t + f.mass * f.at, 0);
      const sol = L !== R ? balanceSolution(a) : null;
      return !!sol && Object.keys(sol).length > 0 && (side === "right" ? L > R : true) && new Set(a.fixed.map((f) => `${f.side}${f.at}`)).size === a.fixed.length;
    },
  );
}

/** PHYS.5.5 — Do it: balance the seesaw (rotational equilibrium). */
export const balanceSeesaw: Gen = mix(
  () => {
    const a = seesaw("right");
    const need = a.fixed.reduce((t, f) => t + f.mass * f.at, 0);
    return q(
      {
        key: `bs-right-${a.slots}-${a.mass}-${a.fixed.map((f) => `${f.at}.${f.mass}`).join("_")}`,
        prompt: `Add ${a.mass} kg blocks to the right side until the seesaw balances.`,
        hint: "Balanced means the torques match: Σ(mass × distance) on the left = Σ(mass × distance) on the right.",
        explain: `The left side has ${a.fixed.map((f) => `${f.mass}×${f.at}`).join(" + ")} = ${need} kg·slots of torque. The right side needs the same: for example ${need} = ${a.mass} × (sum of distances of your blocks).`,
      },
      act(a, need),
    );
  },
  () => {
    const a = seesaw("both");
    const L = a.fixed.filter((f) => f.side === "left").reduce((t, f) => t + f.mass * f.at, 0);
    const R = a.fixed.filter((f) => f.side === "right").reduce((t, f) => t + f.mass * f.at, 0);
    return q(
      {
        key: `bs-both-${a.slots}-${a.mass}-${a.fixed.map((f) => `${f.side}${f.at}.${f.mass}`).join("_")}`,
        prompt: `Balance the seesaw by adding ${a.mass} kg blocks wherever you like.`,
        hint: "Find each side's torque (mass × distance). Add blocks to the lighter side to make up the difference.",
        explain: `Left torque ${L}, right torque ${R}. The ${L < R ? "left" : "right"} side needs ${Math.abs(L - R)} more (mass × distance).`,
      },
      act(a, Math.abs(L - R)),
    );
  },
);

/** PHYS.5.5 — rotational equilibrium: Στ = 0 and ΣF = 0. */
export const rotationalEquilibrium: Gen = mix(
  () => {
    const [m1, d1, m2] = until(
      () => [pick([20, 25, 30, 40, 50]), pick([1, 1.5, 2, 2.5]), pick([20, 25, 30, 40, 50, 60])],
      ([a, d, b]) => a !== b && isStep((a * d) / b, 0.1) && (a * d) / b <= 3,
    );
    const d2 = (m1 * d1) / m2;
    return q(
      {
        key: `re-seesaw-${m1}-${d1}-${m2}`,
        prompt: `A ${m1} kg child sits ${s(d1)} m from the pivot of a seesaw. How far from the pivot, on the other side, must a ${m2} kg child sit to balance it?`,
        unit: "m",
        hint: "Στ = 0: m₁gd₁ = m₂gd₂ (g cancels).",
        explain: `${m1} × ${s(d1)} = ${m2} × d₂, so d₂ = ${s(m1 * d1)} ÷ ${m2} = ${s(d2)} m.`,
      },
      kp(d2, [d1, (m2 * d1) / m1]),
    );
  },
  () => {
    const L = pick([4, 5, 6, 8]);
    const Wp = pick([100, 200, 300]);
    const W = pick([400, 500, 600, 800]);
    const x = rand(1, L - 1);
    const FR = (Wp * (L / 2) + W * x) / L;
    const FL = Wp + W - FR;
    const askR = Math.random() < 0.5;
    if (!isStep(FR, 0.5)) return rotationalEquilibrium();
    return q(
      {
        key: `re-plank-${L}-${Wp}-${W}-${x}-${askR}`,
        prompt: `A ${L} m uniform plank weighing ${Wp} N rests on supports at both ends. A ${W} N painter stands ${x} m from the left end. What force does the ${askR ? "right" : "left"} support exert?`,
        unit: "N",
        hint: "Take torques about one support (that removes its force). The plank's weight acts at its centre. Then ΣF = 0 gives the other.",
        explain: `About the left end: F_R × ${L} = ${Wp} × ${s(L / 2)} + ${W} × ${x}, so F_R = ${s(FR)} N. F_L = ${Wp + W} − ${s(FR)} = ${s(FL)} N.`,
      },
      kp(askR ? FR : FL, [askR ? FL : FR, (Wp + W) / 2]),
    );
  },
  () => {
    const m1 = pick([100, 200, 300]);
    const x1 = pick([10, 20, 30]);
    const m2 = pick([100, 150, 200, 300, 600]);
    const x2 = 50 + ((50 - x1) * m1) / m2;
    if (!Number.isInteger(x2) || x2 > 100 || m1 === m2) return rotationalEquilibrium();
    return q(
      {
        key: `re-meter-${m1}-${x1}-${m2}`,
        prompt: `A uniform metre stick balances on a pivot at its 50 cm mark. A ${m1} g mass hangs at the ${x1} cm mark. Where must a ${m2} g mass hang to balance it?`,
        unit: "cm",
        hint: "The stick's own weight acts at the pivot, so it adds no torque. Match m × (distance from 50 cm) on each side.",
        explain: `${m1} × ${50 - x1} = ${m2} × d, so d = ${s(x2 - 50)} cm: the ${s(x2)} cm mark.`,
      },
      kp(x2),
    );
  },
  () => {
    const items = [
      { p: "A rigid object is in static equilibrium. Which must be true?", a: "The net force and the net torque are both zero", w: ["Only the net force is zero", "Only the net torque is zero", "No forces act on it"], e: "Equilibrium needs no linear acceleration (ΣF = 0) and no angular acceleration (Στ = 0)." },
      { p: "When finding unknown forces on a balanced beam, why take torques about the point where an unknown force acts?", a: "That force has zero lever arm there, so it drops out", w: ["Torque is only defined there", "It makes all the torques positive", "Gravity acts there"], e: "Any point works for Στ = 0 in equilibrium; choosing an unknown's point removes it from the equation." },
      { p: "A seesaw is balanced. One child moves twice as far from the pivot. What happens?", a: "Her side goes down", w: ["It stays balanced", "Her side goes up", "Both sides move up"], e: "Her torque doubles, so there is a net torque turning her side down." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `re-concept-${i}`, prompt: it.p, hint: "Static equilibrium: ΣF = 0 and Στ = 0 about any point.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.5.6 — Newton's second law for rotation: α = τ_net ÷ I. */
export const rotationalSecondLaw: Gen = mix(
  () => {
    const I = pick([0.5, 1, 2, 4, 5]);
    const tau = pick([2, 4, 5, 10, 20]);
    const askT = Math.random() < 0.4;
    const t = pick([2, 3, 4]);
    const alpha = tau / I;
    return q(
      {
        key: `r2-calc-${I}-${tau}-${askT}-${t}`,
        prompt: `A net torque of ${tau} N·m acts on a wheel with I = ${s(I)} kg·m², starting from rest. ${askT ? `How fast is it spinning after ${t} s?` : "What is its angular acceleration?"}`,
        unit: askT ? "rad/s" : "rad/s²",
        hint: "α = τ_net ÷ I" + (askT ? ", then ω = αt." : "."),
        explain: `α = ${tau} ÷ ${s(I)} = ${s(alpha)} rad/s².${askT ? ` ω = ${s(alpha)} × ${t} = ${s(alpha * t)} rad/s.` : ""}`,
      },
      kp(askT ? alpha * t : alpha, [tau * I, alpha * 2]),
    );
  },
  () => {
    const [M, R, F] = pick([
      [2, 0.5, 1],
      [4, 0.5, 2],
      [2, 0.25, 1],
      [8, 0.5, 4],
      [10, 0.2, 5],
      [4, 1, 6],
    ]);
    const I = 0.5 * M * R * R;
    const alpha = (F * R) / I;
    return q(
      {
        key: `r2-disk-${M}-${R}-${F}`,
        prompt: `A string wrapped around a ${M} kg solid disk of radius ${s(R)} m (I = ½MR²) is pulled with ${F} N. What is the disk's angular acceleration?`,
        unit: "rad/s²",
        hint: "τ = FR (the string pulls at the rim, tangent to it), I = ½MR², α = τ ÷ I.",
        explain: `τ = ${F} × ${s(R)} = ${s(F * R)} N·m; I = ½(${M})(${s(R)})² = ${s(I)} kg·m²; α = ${s(alpha)} rad/s².`,
      },
      kp(alpha, [F / (M * R), (F * R) / (M * R * R)]),
    );
  },
  () => {
    const [m, M] = pick([
      [1, 2],
      [1, 12],
      [2, 10],
      [3, 8],
      [1, 8],
    ]);
    const a = (9.8 * m) / (m + M / 2);
    return q(
      {
        key: `r2-pulley-${m}-${M}`,
        prompt: `A ${m} kg block hangs from a string wound around a ${M} kg solid-disk pulley (I = ½MR²) that turns without friction. What is the block's acceleration?`,
        unit: "m/s²",
        hint: "Block: mg − T = ma. Pulley: TR = Iα = ½MR²(a/R), so T = ½Ma. Combine.",
        explain: `mg = (m + ½M)a, so a = ${s(9.8 * m)} ÷ ${s(m + M / 2)} = ${s(a)} m/s². The spinning pulley makes it less than g.`,
      },
      kp(a, [9.8, (9.8 * m) / (m + M)]),
    );
  },
  () => {
    const items = [
      { p: "Which change would increase a wheel's angular acceleration (same applied force)?", a: "Apply the force farther from the axle", w: ["Move mass to the rim", "Use a heavier wheel", "Apply the force at the axle"], e: "α = τ ÷ I. A bigger lever arm raises τ; moving mass outward raises I and lowers α." },
      { p: "Two wheels feel the same net torque. Wheel A has twice the rotational inertia of B. Compare their angular accelerations.", a: "A's is half of B's", w: ["A's is twice B's", "They are equal", "A's is 4 times B's"], e: "α = τ ÷ I, so doubling I halves α." },
      { p: "In rotational dynamics, what plays the role that mass plays in F = ma?", a: "Rotational inertia I", w: ["Torque", "Angular velocity", "Radius"], e: "τ = Iα mirrors F = ma: torque ↔ force, rotational inertia ↔ mass, α ↔ a." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `r2-concept-${i}`, prompt: it.p, hint: "τ_net = Iα: the rotational version of F_net = ma.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.5.4, PHYS.5.6 — Do it: find rotational inertia from τ vs α data. */
export const rotationalInertiaData: Gen = mix(
  () => {
    const I = pick([0.5, 1, 2]);
    const as = I === 2 ? [1, 2, 4] : I === 1 ? [2, 5, 8] : [2, 4, 8];
    const pts = as.map((x, i) => ({ x, y: I * x, label: LETTERS[i] }));
    return q(
      {
        key: `rd-plot-${I}`,
        prompt: "Different torques were applied to a wheel and its angular acceleration measured. Plot τ against α (α across, τ up).",
        speech: "Different torques were applied to a wheel and its angular acceleration measured. Plot torque against angular acceleration, with alpha across and torque up.",
        visual: { kind: "table", header: ["Point", "α (rad/s²)", "τ (N·m)"], rows: pts.map((p) => [p.label, p.x, p.y]) },
        hint: "Each row is one point: α across, τ up.",
        explain: `The points lie on a line through the origin. Since τ = Iα, the slope is I = ${s(I)} kg·m².`,
      },
      act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, I),
    );
  },
  () => {
    const I = pick([0.5, 1, 1.5, 2, 3]);
    return q(
      {
        key: `rd-draw-${I}`,
        prompt: `Draw the τ–α line for a wheel with I = ${s(I)} kg·m² (α across, τ up).`,
        speech: `Draw the torque against alpha line for a wheel with rotational inertia ${s(I)} kilogram meters squared.`,
        hint: "τ = Iα: through the origin with slope I.",
        explain: `A straight line from (0, 0) rising ${s(I)} N·m for each rad/s².`,
      },
      act({ kind: "drawLine", m: I, b: 0, size: 10, quadrants: 1 }, I),
    );
  },
  () => {
    const I = pick([0.5, 1, 1.5, 2, 2.5, 3, 4]);
    const x2 = 4;
    return q(
      {
        key: `rd-slope-${I}`,
        prompt: "A student graphs τ (N·m, up) against α (rad/s², across) for a spinning wheel. What is its rotational inertia?",
        speech: "A student graphs torque against angular acceleration for a spinning wheel. What is its rotational inertia?",
        visual: {
          kind: "plot", ...axes("τ (N·m) vs α (rad/s²)"),
          x: [0, 10],
          y: [0, 20],
          curves: [{ fn: (a) => I * a, colour: "tangerine" }],
          points: [2, 4, 6, 8].map((a) => ({ x: a, y: I * a })),
        },
        needsVisual: true,
        unit: "kg·m²",
        hint: "τ = Iα, so I is the slope: Δτ ÷ Δα.",
        explain: `At α = ${x2}, τ = ${s(I * x2)}, so I = ${s(I * x2)} ÷ ${x2} = ${s(I)} kg·m².`,
      },
      kp(I, [1 / I, I * 2]),
    );
  },
);

/** PHYS.5.3–PHYS.5.6 — rotational reasoning: rankings and analogues. */
export const rotationalReasoning: Gen = mix(
  () => {
    const ws = until(
      () => LETTERS.slice(0, 3).map((name) => ({ name, tau: pick([2, 4, 6, 8]), I: pick([1, 2, 4]) })),
      (xs) => new Set(xs.map((x) => `${x.tau}-${x.I}`)).size === 3,
    );
    return q(
      {
        key: `rr-alpha-${ws.map((w) => `${w.tau}.${w.I}`).join("_")}`,
        prompt: "Rank the wheels by angular acceleration, greatest first.",
        visual: { kind: "table", header: ["Wheel", "τ_net (N·m)", "I (kg·m²)"], rows: ws.map((w) => [w.name, w.tau, w.I]) },
        needsVisual: true,
        hint: "α = τ ÷ I for each.",
        explain: ws.map((w) => `${w.name}: ${w.tau} ÷ ${w.I} = ${s(w.tau / w.I)}`).join("; ") + " rad/s².",
      },
      ranking(ws.map((w) => ({ name: w.name, value: w.tau / w.I }))),
    );
  },
  () => {
    const pairs = [
      ["force", "torque"],
      ["mass", "rotational inertia"],
      ["velocity", "angular velocity"],
      ["acceleration", "angular acceleration"],
      ["displacement", "angular displacement"],
      ["momentum", "angular momentum"],
    ];
    const i = rand(0, pairs.length - 1);
    const [lin, rot] = pairs[i];
    return q(
      {
        key: `rr-analog-${i}`,
        prompt: `What is the rotational analogue of ${lin}?`,
        hint: "Match each linear quantity with the rotating version: F ↔ τ, m ↔ I, x ↔ θ, v ↔ ω, a ↔ α, p ↔ L.",
        explain: `${cap(lin)} ↔ ${rot}.`,
      },
      lab(rot, pairs.filter((_, j) => j !== i).map((p) => p[1])),
    );
  },
  () => {
    const items = [
      { p: "A spinning ice skater and a spinning flywheel have the same ω. Which statement must be true?", a: "Points farther from each axis move faster", w: ["They have the same angular momentum", "They have the same rotational inertia", "They have the same kinetic energy"], e: "v = rω, so at the same ω, larger r means larger v. The other quantities depend on I." },
      { p: "Two identical doors: you push one at the edge and one halfway to the hinge, with the same force. Compare their angular accelerations.", a: "The edge push gives twice the α", w: ["They are equal", "The middle push gives twice the α", "The edge push gives 4 times the α"], e: "τ = rF doubles with twice the lever arm, and I is the same, so α doubles." },
      { p: "A solid disk and a hoop (same M and R) get the same torque. Which spins up faster?", a: "The solid disk", w: ["The hoop", "They spin up equally", "Can't tell without the torque's size"], e: "The disk's I = ½MR² is less than the hoop's MR², so α = τ ÷ I is larger." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `rr-concept-${i}`, prompt: it.p, hint: "Use τ = rF sin θ, τ = Iα and v = rω.", explain: it.e }, lab(it.a, it.w));
  },
);

/* ======================================== 6. Energy and momentum of rotating systems */

const ROLLERS = [
  { n: "solid sphere", c: 0.4, f: "2/5", I: "⅖MR²" },
  { n: "solid cylinder", c: 0.5, f: "1/2", I: "½MR²" },
  { n: "hollow sphere", c: 2 / 3, f: "2/3", I: "⅔MR²" },
  { n: "hoop", c: 1, f: "1", I: "MR²" },
];

/** PHYS.6.1 — rotational kinetic energy. */
export const rotationalKE: Gen = mix(
  () => {
    const I = pick([0.5, 1, 2, 4]);
    const w = pick([2, 4, 5, 6, 10]);
    return q(
      {
        key: `rke-calc-${I}-${w}`,
        prompt: `A flywheel with I = ${s(I)} kg·m² spins at ${w} rad/s. What is its rotational kinetic energy?`,
        unit: "J",
        hint: "K_rot = ½Iω².",
        explain: `K = ½ × ${s(I)} × ${w}² = ${s(0.5 * I * w * w)} J.`,
      },
      kp(0.5 * I * w * w, [I * w * w, 0.5 * I * w]),
    );
  },
  () => {
    const I = pick([2, 0.5]);
    const w = rand(2, 9);
    const K = 0.5 * I * w * w;
    return q(
      {
        key: `rke-w-${I}-${w}`,
        prompt: `A wheel with I = ${s(I)} kg·m² stores ${s(K)} J of rotational kinetic energy. How fast is it spinning?`,
        unit: "rad/s",
        hint: "ω = √(2K ÷ I).",
        explain: `ω = √(2 × ${s(K)} ÷ ${s(I)}) = √${w * w} = ${w} rad/s.`,
      },
      kp(w),
    );
  },
  () => {
    const r = pick(ROLLERS);
    const frac = r.c / (1 + r.c);
    const text = (x: number) => (Math.abs(x - 0.5) < 1e-9 ? "1/2" : Math.abs(x - 1 / 3) < 1e-9 ? "1/3" : Math.abs(x - 2 / 7) < 1e-9 ? "2/7" : Math.abs(x - 0.4) < 1e-9 ? "2/5" : "0");
    return q(
      {
        key: `rke-frac-${r.n}`,
        prompt: `A ${r.n} (I = ${r.I}) rolls without slipping. What fraction of its total kinetic energy is rotational?`,
        hint: "With v = Rω, K_rot = ½(cMR²)(v/R)² = c × ½Mv². Then fraction = c ÷ (1 + c).",
        explain: `K_rot ÷ K_total = ${r.f} ÷ (1 + ${r.f}) = ${text(frac)}.`,
      },
      lab(text(frac), ["1/2", "1/3", "2/7", "2/5", "0"].filter((x) => x !== text(frac))),
    );
  },
  () => {
    const f = pick([2, 3, 0.5]);
    const factor = f * f;
    const t = (x: number) => (x < 1 ? (x === 0.25 ? "a quarter as much" : "half as much") : `${s(x)} times as much`);
    return q(
      {
        key: `rke-ratio-${f}`,
        prompt: `A wheel's angular speed ${f === 0.5 ? "halves" : f === 2 ? "doubles" : "triples"}. How does its rotational kinetic energy change?`,
        hint: "K = ½Iω²: ω is squared.",
        explain: `K changes by ${s(f)}² = ${s(factor)}: ${t(factor)}.`,
      },
      lab(t(factor), [t(f), t(factor * f), "the same"].filter((x) => x !== t(factor))),
    );
  },
);

/** PHYS.6.2 — work done by a torque, and rotational power. */
export const torqueWork: Gen = mix(
  () => {
    const tau = pick([2, 5, 10, 20]);
    const th = pick([2, 4, 5, 10, 15]);
    return q(
      {
        key: `tw-w-${tau}-${th}`,
        prompt: `A constant ${tau} N·m torque turns a wheel through ${th} rad. How much work does it do?`,
        unit: "J",
        hint: "W = τΔθ (θ in radians), like W = FΔx.",
        explain: `W = ${tau} × ${th} = ${tau * th} J.`,
      },
      kp(tau * th),
    );
  },
  () => {
    const I = 2;
    const w = rand(2, 8);
    const W = 0.5 * I * w * w;
    const tau = pick([1, 2, 4, 8].filter((t) => Number.isInteger(W / t)));
    return q(
      {
        key: `tw-spin-${w}-${tau}`,
        prompt: `A ${tau} N·m torque spins up a wheel (I = ${I} kg·m²) from rest through ${s(W / tau)} rad. What is its final angular speed?`,
        unit: "rad/s",
        hint: "Work–energy for rotation: τΔθ = ½Iω² − 0.",
        explain: `W = ${tau} × ${s(W / tau)} = ${s(W)} J = ½(${I})ω², so ω = √${w * w} = ${w} rad/s.`,
      },
      kp(w),
    );
  },
  () => {
    const tau = pick([10, 20, 50, 100]);
    const w = pick([10, 20, 30, 50]);
    return q(
      {
        key: `tw-p-${tau}-${w}`,
        prompt: `A motor delivers a steady ${tau} N·m of torque to a shaft turning at ${w} rad/s. What is its power output?`,
        unit: "W",
        hint: "P = τω, like P = Fv.",
        explain: `P = ${tau} × ${w} = ${s(tau * w)} W.`,
      },
      kp(tau * w, [tau / w]),
    );
  },
  () => {
    const tau = pick([5, 10, 20]);
    const n = pick([2, 3, 5]);
    const W = 2 * Math.PI * n * tau;
    const correct = `${s(Math.round(W))} J`;
    return q(
      {
        key: `tw-rev-${tau}-${n}`,
        prompt: `A ${tau} N·m torque turns a crank through ${n} full revolutions. About how much work does it do?`,
        hint: "Change revolutions to radians (× 2π), then W = τθ.",
        explain: `θ = ${n} × 2π = ${2 * n}π rad ≈ ${s(rd(2 * Math.PI * n, 2))} rad. W = ${tau} × ${2 * n}π ≈ ${s(Math.round(W))} J.`,
      },
      lab(correct, [`${tau * n} J`, `${s(Math.round(Math.PI * n * tau))} J`, `${tau * n * 360} J`]),
    );
  },
);

/** PHYS.6.3 — angular momentum and angular impulse. */
export const angularMomentum: Gen = mix(
  () => {
    const I = pick([0.5, 2, 3, 4]);
    const w = pick([2, 5, 6, 10]);
    return q(
      {
        key: `am-iw-${I}-${w}`,
        prompt: `What is the angular momentum of a wheel with I = ${s(I)} kg·m² spinning at ${w} rad/s?`,
        unit: "kg·m²/s",
        hint: "L = Iω, like p = mv.",
        explain: `L = ${s(I)} × ${w} = ${s(I * w)} kg·m²/s.`,
      },
      kp(I * w, [0.5 * I * w * w]),
    );
  },
  () => {
    const m = pick([0.5, 2, 3]);
    const v = pick([2, 4, 5]);
    const r = pick([1, 2, 3, 4]);
    return q(
      {
        key: `am-point-${m}-${v}-${r}`,
        prompt: `A ${s(m)} kg puck slides at ${v} m/s along a straight line that passes ${r} m from a post. What is its angular momentum about the post?`,
        unit: "kg·m²/s",
        hint: "For a point mass, L = mvr⊥, where r⊥ is the closest distance from the point to the line of motion.",
        explain: `L = ${s(m)} × ${v} × ${r} = ${s(m * v * r)} kg·m²/s. Even moving in a straight line, it has angular momentum about the post.`,
      },
      kp(m * v * r),
    );
  },
  () => {
    const I = pick([2, 4, 5, 10]);
    const w = pick([4, 6, 10, 12]);
    const tau = pick([2, 4, 5, 8].filter((t) => isStep((I * w) / t, 0.5)));
    const askT = Math.random() < 0.6;
    return q(
      {
        key: `am-imp-${I}-${w}-${tau}-${askT}`,
        prompt: askT
          ? `Friction exerts a ${tau} N·m torque on a wheel (I = ${I} kg·m²) spinning at ${w} rad/s. How long until it stops?`
          : `A wheel (I = ${I} kg·m²) spinning at ${w} rad/s is stopped. What angular impulse was needed (size)?`,
        unit: askT ? "s" : "N·m·s",
        hint: "Angular impulse = τΔt = ΔL = IΔω.",
        explain: askT ? `ΔL = ${I} × ${w} = ${I * w} kg·m²/s = ${tau}Δt, so Δt = ${s((I * w) / tau)} s.` : `ΔL = Iω = ${I} × ${w} = ${I * w} N·m·s.`,
      },
      kp(askT ? (I * w) / tau : I * w),
    );
  },
);

/** PHYS.6.3 — angular impulse as the area under a torque–time graph. */
export const angularImpulseGraphs: Gen = mix(
  () => {
    const T = pick([2, 4, 6]);
    const t1 = rand(1, 2);
    const t2 = t1 + rand(1, 3);
    const t3 = t2 + rand(1, 2);
    const pts: Pt[] = [
      [0, 0],
      [t1, T],
      [t2, T],
      [t3, 0],
    ];
    const dL = areaUnder(pts, 0, t3);
    const I = pick([1, 2, 4].filter((i) => isStep(dL / i, 0.5)));
    const w0 = pick([0, 2, 3]);
    const askW = Math.random() < 0.5;
    return q(
      {
        key: `aig-${T}-${t1}-${t2}-${t3}-${I}-${w0}-${askW}`,
        prompt: askW
          ? `This τ–t graph shows the torque on a wheel (I = ${I} kg·m²) that starts at ${w0} rad/s. What is its angular speed at t = ${t3} s?`
          : "What angular impulse does this torque deliver?",
        speech: askW
          ? `This torque-time graph shows the torque on a wheel with rotational inertia ${I} kilogram meters squared that starts at ${w0} radians per second. What is its angular speed at ${t3} seconds?`
          : "What angular impulse does this torque deliver?",
        visual: graph([0, 10], [0, 8], pts, "τ (N·m) vs t (s)", { shade: { from: 0, to: t3 }, dots: pts.map(([x, y]) => ({ x, y })), colour: "teal" }),
        needsVisual: true,
        unit: askW ? "rad/s" : "N·m·s",
        hint: "The area under a τ–t graph is the change in angular momentum, ΔL." + (askW ? " Then Δω = ΔL ÷ I." : ""),
        explain: `Area = ${s(dL)} N·m·s.${askW ? ` Δω = ${s(dL)} ÷ ${I} = ${s(dL / I)}, so ω = ${w0} + ${s(dL / I)} = ${s(w0 + dL / I)} rad/s.` : ""}`,
      },
      kp(askW ? w0 + dL / I : dL),
    );
  },
  () => {
    const tau = pick([2, 3, 4]);
    const a = rand(2, 4);
    const b = rand(1, 3);
    const tau2 = pick([1, 2]);
    const pts: Pt[] = [
      [0, tau],
      [a, tau],
      [a + 0.001, -tau2],
      [a + b, -tau2],
    ];
    const dL = tau * a - tau2 * b;
    return q(
      {
        key: `aig-neg-${tau}-${a}-${b}-${tau2}`,
        prompt: `A motor speeds a wheel up, then a brake acts. What is the net change in angular momentum from 0 to ${a + b} s?`,
        visual: graph([0, 8], [-4, 6], pts, "τ (N·m) vs t (s)", { shade: { from: 0, to: a + b }, colour: "teal" }),
        needsVisual: true,
        unit: "kg·m²/s",
        hint: "Area above the axis adds L; area below takes it away.",
        explain: `${tau} × ${a} − ${tau2} × ${b} = ${s(dL)} kg·m²/s.`,
      },
      sk(dL, [tau * a + tau2 * b]),
    );
  },
);

/** PHYS.6.4 — conservation of angular momentum. */
export const angularMomentumConservation: Gen = mix(
  () => {
    const [I1, I2] = pick([
      [4, 2],
      [3, 1],
      [6, 2],
      [5, 2],
      [2, 0.5],
      [4, 1],
    ]);
    const w1 = pick([1, 2, 3, 4]);
    const askK = Math.random() < 0.35;
    const w2 = (I1 * w1) / I2;
    const K1 = 0.5 * I1 * w1 * w1;
    const K2 = 0.5 * I2 * w2 * w2;
    return q(
      {
        key: `amc-skate-${I1}-${I2}-${w1}-${askK}`,
        prompt: `A skater spinning at ${w1} rad/s with I = ${I1} kg·m² pulls in her arms to I = ${s(I2)} kg·m². ${askK ? "What is her new rotational kinetic energy?" : "How fast does she spin now?"}`,
        unit: askK ? "J" : "rad/s",
        hint: "No external torque: I₁ω₁ = I₂ω₂." + (askK ? " Then K = ½Iω²; it is NOT conserved (her arms did work)." : ""),
        explain: `ω₂ = ${I1} × ${w1} ÷ ${s(I2)} = ${s(w2)} rad/s.${askK ? ` K goes from ${s(K1)} J to ½(${s(I2)})(${s(w2)})² = ${s(K2)} J.` : ""}`,
      },
      kp(askK ? K2 : w2, askK ? [K1, K1 * (I2 / I1)] : [(I2 * w1) / I1, w1]),
    );
  },
  () => {
    const [I, m, R, w] = pick([
      [300, 50, 2, 1],
      [200, 50, 2, 2],
      [100, 25, 2, 1.5],
      [150, 50, 1, 2],
      [400, 40, 2.5, 1],
      [240, 40, 2, 2],
    ]);
    const w2 = (I * w) / (I + m * R * R);
    return q(
      {
        key: `amc-mgr-${I}-${m}-${R}-${w}`,
        prompt: `A merry-go-round (I = ${I} kg·m²) spins freely at ${s(w)} rad/s. A ${m} kg child jumps onto its edge, ${s(R)} m from the axle, moving straight toward the centre. What is the new angular speed? Round to 2 decimal places if needed.`,
        unit: "rad/s",
        hint: "The child adds mR² to the rotational inertia. Iω = (I + mR²)ω′.",
        explain: `I′ = ${I} + ${m}(${s(R)})² = ${s(I + m * R * R)} kg·m². ω′ = ${s(I * w)} ÷ ${s(I + m * R * R)} = ${s(rd(w2, 2))} rad/s.`,
      },
      kp(rd(w2, 2)),
    );
  },
  () => {
    const ratio = pick([1, 2, 3]);
    const w = pick([4, 6, 8, 10, 12, 24].filter((x) => x % (1 + ratio) === 0));
    const w2 = w / (1 + ratio);
    return q(
      {
        key: `amc-disk-${w}-${ratio}`,
        prompt: `A disk spinning at ${w} rad/s has a non-spinning disk with ${ratio === 1 ? "the same" : `${ratio} times the`} rotational inertia dropped onto it. They stick and spin together. What is their angular speed?`,
        unit: "rad/s",
        hint: "Angular momentum before (only the first disk spins) = after (both together).",
        explain: `Iω = (I + ${ratio === 1 ? "" : ratio}I)ω′, so ω′ = ${w} ÷ ${1 + ratio} = ${s(w2)} rad/s. Kinetic energy is lost (like a sticky collision).`,
      },
      kp(w2),
    );
  },
  () => {
    const items = [
      { p: "A diver tucks into a ball in mid-air. What happens to her angular speed and angular momentum?", a: "Angular speed increases; angular momentum stays the same", w: ["Both increase", "Angular speed stays the same; angular momentum increases", "Both stay the same"], e: "No external torque about her centre of mass, so L is constant. Tucking cuts I, so ω rises." },
      { p: "A student on a frictionless spinning stool pulls two dumbbells in. Which quantity of the student + dumbbells system is conserved?", a: "Angular momentum only", w: ["Kinetic energy only", "Both angular momentum and kinetic energy", "Neither"], e: "L is conserved (no external torque). K increases because the student does work pulling the weights in." },
      { p: "Why does a planet move faster when it's closer to the Sun?", a: "Angular momentum about the Sun is conserved: smaller r, larger v", w: ["The Sun pushes it forward", "Its energy increases there", "Its mass decreases there"], e: "Gravity points at the Sun, so it exerts no torque about the Sun: mvr⊥ stays constant." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `amc-concept-${i}`, prompt: it.p, hint: "With no net external torque, L = Iω stays constant.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.6.5 — rolling without slipping. */
export const rolling: Gen = mix(
  () => {
    const R = pick([0.2, 0.25, 0.3, 0.5]);
    const w = pick([10, 20, 30, 40]);
    const askW = Math.random() < 0.4;
    return q(
      {
        key: `rl-vrw-${R}-${w}-${askW}`,
        prompt: askW ? `A bike wheel of radius ${s(R)} m rolls without slipping at ${s(R * w)} m/s. What is its angular speed?` : `A wheel of radius ${s(R)} m rolls without slipping at ${w} rad/s. How fast does its centre move?`,
        unit: askW ? "rad/s" : "m/s",
        hint: "Rolling without slipping: v_centre = Rω.",
        explain: askW ? `ω = v ÷ R = ${s(R * w)} ÷ ${s(R)} = ${w} rad/s.` : `v = ${s(R)} × ${w} = ${s(R * w)} m/s.`,
      },
      kp(askW ? w : R * w),
    );
  },
  () => {
    const v = pick([2, 3, 4, 5, 10]);
    const where = pick([
      { p: "the top of the wheel", f: 2 },
      { p: "the point touching the ground", f: 0 },
      { p: "the centre (axle)", f: 1 },
    ]);
    return q(
      {
        key: `rl-points-${v}-${where.f}`,
        prompt: `A wheel rolls without slipping; its centre moves at ${v} m/s. How fast is ${where.p} moving relative to the ground?`,
        unit: "m/s",
        hint: "Each point's velocity = the centre's velocity + its velocity from spinning (Rω = v, along the rim). At the bottom they cancel; at the top they add.",
        explain: where.f === 0 ? "0 m/s: the contact point is momentarily at rest. That's what 'no slipping' means." : where.f === 2 ? `${v} + ${v} = ${2 * v} m/s.` : `${v} m/s, the speed of the whole wheel.`,
      },
      kp(where.f * v, [v, 2 * v, 0]),
    );
  },
  () => {
    const picks = shuffle(ROLLERS).slice(0, 3);
    const named = picks.map((r, i) => ({ ...r, name: LETTERS[i] }));
    return q(
      {
        key: `rl-rank-${picks.map((r) => r.n).join("-")}`,
        prompt: `From rest, ${named.map((r) => `${r.name} (${r.n})`).join(", ")} roll without slipping down the same ramp. Rank their speeds at the bottom, greatest first.`,
        hint: "They all start with the same GPE per kg. The more of their energy goes into spinning (bigger I/MR²), the less is left for moving forward.",
        explain: `v² = 2gh ÷ (1 + c), where I = cMR². Smaller c means faster: ${[...named].sort((a, b) => a.c - b.c).map((r) => `${r.n} (${r.f})`).join(" > ")}.`,
      },
      ranking(named.map((r) => ({ name: r.name, value: 1 / (1 + r.c) }))),
    );
  },
  () => {
    const items = [
      { p: "A ball rolls without slipping down a ramp. How much work does static friction do on it?", a: "Zero", w: ["Positive work", "Negative work, turning KE into heat", "Equal to its rotational KE"], e: "The contact point doesn't slide, so friction acts where there's no displacement and does no work. Mechanical energy is conserved." },
      { p: "Two solid spheres of different mass and radius roll down the same ramp from rest. Which reaches the bottom first?", a: "They tie", w: ["The heavier one", "The bigger one", "The smaller one"], e: "v² = 2gh ÷ (1 + 2/5). Mass and radius cancel: only the shape matters." },
      { p: "What lets a ball roll (rather than slide) down a ramp?", a: "Static friction provides a torque about its centre", w: ["Gravity provides a torque about its centre", "The normal force provides a torque about its centre", "Kinetic friction pushes it forward"], e: "Gravity and the normal force act through the centre (no torque). Friction at the contact point is what makes it spin." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `rl-concept-${i}`, prompt: it.p, hint: "Rolling without slipping: v = Rω and the contact point is momentarily at rest.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.6.5 — energy of rolling objects: mgh = ½Mv²(1 + c). */
export const rollingEnergy: Gen = mix(
  () => {
    const sc = pick([
      { n: "hoop", f: "MR²", h: [1.25, 5, 20], k: 9.8 },
      { n: "solid cylinder", f: "½MR²", h: [0.6, 3.75, 15], k: (4 * 9.8) / 3 },
      { n: "solid sphere", f: "⅖MR²", h: [0.875, 3.5, 14], k: 14 },
      { n: "frictionless sliding block", f: "no rotation", h: [0.625, 2.5, 10], k: 19.6 },
    ]);
    const h = pick(sc.h);
    const v = Math.sqrt(sc.k * h);
    return q(
      {
        key: `re2-v-${sc.n}-${h}`,
        prompt: `A ${sc.n} (${sc.f}) starts from rest and goes down a ramp ${s(h)} m high${sc.n.includes("block") ? "" : ", rolling without slipping"}. How fast is it moving at the bottom?`,
        unit: "m/s",
        hint: sc.n.includes("block") ? "mgh = ½mv²." : "mgh = ½Mv² + ½Iω², with ω = v/R. Write I = cMR²: then gh = ½v²(1 + c).",
        explain: `v² = 2gh ÷ (1 + c) = ${s(rd(sc.k * h, 2))}, so v = ${s(rd(v, 2))} m/s.`,
      },
      kp(rd(v, 2), [rd(Math.sqrt(19.6 * h), 2), rd(v * 1.2, 1)]),
    );
  },
  () => {
    const m = pick([1, 2, 4]);
    const v = pick([2, 3, 4, 5]);
    const r = pick(ROLLERS.slice(0, 2).concat(ROLLERS[3]));
    const K = 0.5 * m * v * v * (1 + r.c);
    return q(
      {
        key: `re2-K-${m}-${v}-${r.n}`,
        prompt: `A ${m} kg ${r.n} (I = ${r.I}) rolls without slipping at ${v} m/s. What is its total kinetic energy?`,
        unit: "J",
        hint: "K = ½Mv² + ½Iω² = ½Mv²(1 + c).",
        explain: `½(${m})(${v})² = ${s(0.5 * m * v * v)} J of translational KE, plus ${r.c === 1 ? "the same again" : `${r.f} of that`} as rotational: ${s(K)} J in total.`,
      },
      kp(K, [0.5 * m * v * v, m * v * v * 2]),
    );
  },
  () => {
    const r = pick(ROLLERS);
    return q(
      {
        key: `re2-why-${r.n}`,
        prompt: `A ${r.n} rolls down a ramp next to an identical-mass block sliding without friction from the same height. Which is faster at the bottom?`,
        hint: "Both turn the same GPE into kinetic energy. Where does the rolling object's energy go?",
        explain: `The block: all its energy is translational. The ${r.n} puts some into spinning, so it moves more slowly.`,
      },
      lab("The sliding block", [`The ${r.n}`, "They tie", "It depends on the radius"]),
    );
  },
);

/** PHYS.6.5 — Do it: order a rolling race. */
export const rollingRace: Gen = mix(
  () => {
    const all = [{ n: "Frictionless sliding block", c: 0 }, ...ROLLERS.map((r) => ({ n: cap(r.n), c: r.c }))];
    const k = rand(3, 5);
    const picks = shuffle(all).slice(0, k).sort((a, b) => a.c - b.c);
    return q(
      {
        key: `rr-order-${picks.map((p) => p.n[0] + p.n.length).join("")}`,
        prompt: "They all start from rest at the top of the same ramp (the round ones roll without slipping). Put them in order of arrival at the bottom.",
        hint: "Smaller I/MR² means less energy tied up in spinning, so a faster trip. A sliding block (no spin) wins.",
        explain: `I/MR²: block 0, solid sphere 0.4, solid cylinder 0.5, hollow sphere 0.67, hoop 1. Arrival order: ${picks.map((p) => p.n.toLowerCase()).join(", ")}.`,
      },
      act({ kind: "order", items: picks.map((p) => p.n), direction: "first to arrive → last" }, k),
    );
  },
  () => {
    const items = [
      { p: "A solid sphere and a hoop race down a ramp. Which change would let the hoop win?", a: "None: the hoop always loses (if both roll without slipping)", w: ["Make the hoop heavier", "Make the hoop smaller", "Make the sphere heavier"], e: "The finish speed depends only on the shape factor c = I/MR², not on mass or size." },
      { p: "A hollow and a solid ball of the same size and mass roll down a ramp. Which wins?", a: "The solid ball", w: ["The hollow ball", "They tie", "Whichever is heavier"], e: "The solid ball's mass is nearer the centre (I = ⅖MR² vs ⅔MR²), so less energy goes into spin." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `rr-concept-${i}`, prompt: it.p, hint: "Compare I/MR².", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.6.6 — motion of orbiting satellites. */
export const satellites: Gen = mix(
  () => {
    const sc = pick([
      { r: "1.6 × 10⁷", v: 5000 },
      { r: "2.5 × 10⁷", v: 4000 },
      { r: "6.4 × 10⁷", v: 2500 },
      { r: "1.0 × 10⁸", v: 2000 },
    ]);
    return q(
      {
        key: `sat-v-${sc.v}`,
        prompt: `A satellite moves in a circular orbit of radius ${sc.r} m around Earth (GM = 4.0 × 10¹⁴ m³/s²). What is its orbital speed?`,
        speech: `A satellite moves in a circular orbit of radius ${sc.r.replace(" × 10⁷", " times 10 to the 7").replace(" × 10⁸", " times 10 to the 8")} meters around Earth. GM is 4 times 10 to the 14. What is its orbital speed?`,
        unit: "m/s",
        hint: "Gravity is the centripetal force: GMm/r² = mv²/r, so v = √(GM/r).",
        explain: `v = √(4.0 × 10¹⁴ ÷ (${sc.r})) = √${s(sc.v * sc.v)} = ${s(sc.v)} m/s.`,
      },
      kp(sc.v, [sc.v * 2, sc.v / 2]),
    );
  },
  () => {
    const f = pick([4, 9, 0.25]);
    const askT = Math.random() < 0.5;
    const vText = f === 4 ? "half as fast" : f === 9 ? "a third as fast" : "twice as fast";
    const tText = f === 4 ? "8 times as long" : f === 9 ? "27 times as long" : "1/8 as long";
    const correct = askT ? tText : vText;
    return q(
      {
        key: `sat-scale-${f}-${askT}`,
        prompt: `A satellite moves to a circular orbit with ${f === 0.25 ? "a quarter of" : `${f} times`} the radius. How does its ${askT ? "orbital period" : "orbital speed"} change?`,
        hint: askT ? "T² ∝ r³ (Kepler's third law), so T ∝ r^(3/2)." : "v = √(GM/r), so v ∝ 1/√r.",
        explain: askT ? `T ∝ r^1.5: ${f}^1.5 → ${tText}.` : `v ∝ 1/√r: √${f} = ${s(Math.sqrt(f))} → ${vText}.`,
      },
      lab(correct, askT ? ["8 times as long", "27 times as long", "1/8 as long", `${f === 0.25 ? "4" : f} times as long`, "the same"].filter((x) => x !== correct) : ["half as fast", "a third as fast", "twice as fast", "the same", "4 times as fast"].filter((x) => x !== correct)),
    );
  },
  () => {
    const [r1, v1, r2] = pick([
      [1, 8, 2],
      [1, 9, 3],
      [2, 6, 3],
      [1, 10, 4],
      [3, 4, 4],
      [2, 9, 6],
    ]);
    const v2 = (r1 * v1) / r2;
    return q(
      {
        key: `sat-ellipse-${r1}-${v1}-${r2}`,
        prompt: `A comet's closest approach to the Sun is ${r1} AU, where it moves at ${v1} km/s. Its farthest point is ${r2} AU. How fast is it there?`,
        speech: `A comet's closest approach to the Sun is ${r1} AU, where it moves at ${v1} kilometers per second. Its farthest point is ${r2} AU. How fast is it there?`,
        visual: { kind: "phys-orbit", scene: "orbit", planet: "☀️", satellite: "☄️", ecc: 0.5, at: 180, speedLabel: "v", gravityLabel: "F" },
        unit: "km/s",
        hint: "Gravity exerts no torque about the Sun, so L = mvr is conserved; at both ends v is perpendicular to r.",
        explain: `${r1} × ${v1} = ${r2} × v, so v = ${s(v2)} km/s.`,
      },
      kp(v2, [(v1 * r2) / r1, v1]),
    );
  },
  () => {
    const items = [
      { p: "For a satellite on an elliptical orbit (system: satellite + Earth), which quantities stay constant?", a: "Total mechanical energy and angular momentum", w: ["Speed and kinetic energy", "Kinetic energy and potential energy", "Speed and distance"], e: "Gravity is internal and points at Earth's centre: no external work, no torque. KE and PE trade off as r changes." },
      { p: "Where on an elliptical orbit is a satellite moving fastest?", a: "At the point closest to the planet", w: ["At the farthest point", "Halfway between", "Its speed is constant"], e: "Closest means the least GPE, so the most KE (and L = mvr is constant, so small r means large v)." },
      { p: "What is the sign of the total mechanical energy of a satellite in a closed (bound) orbit, with U = 0 far away?", a: "Negative", w: ["Positive", "Zero", "It changes sign around the orbit"], e: "U = −GMm/r is negative and outweighs K; a bound orbit has E < 0. With E ≥ 0 it would escape." },
      { p: "Two satellites share the same circular orbit; one has twice the mass. Compare their speeds.", a: "They are equal", w: ["The heavier one is faster", "The lighter one is faster", "The heavier one is twice as fast"], e: "v = √(GM/r) depends on the planet's mass and the radius, not the satellite's mass." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q(
      {
        key: `sat-concept-${i}`,
        prompt: it.p,
        visual: i <= 1 ? { kind: "phys-orbit", scene: "orbit", ecc: 0.5, at: 60, speedLabel: "v", gravityLabel: "F_g" } : NONE,
        hint: "Gravity points to the planet's centre: it does no torque about it, and the satellite + planet system has no external work.",
        explain: it.e,
      },
      lab(it.a, it.w),
    );
  },
);

/** PHYS.6.3, PHYS.6.4, PHYS.6.6 — Do it: sort situations by whether angular momentum is conserved. */
export const angularMomentumSort: Gen = mix(
  () => {
    const pool = [
      { label: "A skater pulls in her arms (skater)", bin: 0 },
      { label: "A planet on an elliptical orbit (about the Sun)", bin: 0 },
      { label: "Clay sticks to a spinning turntable (clay + turntable)", bin: 0 },
      { label: "A diver tucks in mid-air (diver)", bin: 0 },
      { label: "A spinning star shrinks (star)", bin: 0 },
      { label: "A motor spins up a fan (fan)", bin: 1 },
      { label: "Friction at the axle slows a wheel (wheel)", bin: 1 },
      { label: "A child pushes a merry-go-round (merry-go-round)", bin: 1 },
      { label: "A wrench tightens a bolt (bolt)", bin: 1 },
      { label: "A brake stops a spinning bike wheel (wheel)", bin: 1 },
    ];
    const picks = until(
      () => shuffle(pool.map((_, i) => i)).slice(0, 6),
      (ix) => ix.some((i) => pool[i].bin === 0) && ix.some((i) => pool[i].bin === 1),
    );
    return q(
      {
        key: `ams-sort-${[...picks].sort((a, b) => a - b).join("-")}`,
        prompt: "Is the angular momentum of the system in brackets conserved? Sort each situation.",
        hint: "L is conserved when no net external torque acts on the system. Internal forces (arms, collisions inside the system, gravity toward the axis) don't count.",
        explain: "External torques (motors, brakes, friction, pushes from outside) change L. Rearranging mass inside the system or central gravity doesn't.",
      },
      act({ kind: "sort", bins: ["L conserved", "L changes"], items: picks.map((i) => pool[i]) }, picks.length),
    );
  },
  () => {
    const items = [
      { p: "A spinning skater pulls her arms in. Which of her quantities increases?", a: "Rotational kinetic energy", w: ["Angular momentum", "Rotational inertia", "Nothing changes"], e: "L = Iω stays constant; K = L²/2I rises as I falls (her muscles did the work)." },
      { p: "A wheel spins with no torque on it. Its rotational inertia is doubled by sliding weights out. What happens to its angular speed?", a: "It halves", w: ["It doubles", "It stays the same", "It quarters"], e: "Iω is constant, so doubling I halves ω." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `ams-concept-${i}`, prompt: it.p, hint: "No net external torque → L = Iω constant.", explain: it.e }, lab(it.a, it.w));
  },
);

/* ======================================================= 7. Oscillations */

/** PHYS.7.1 — simple harmonic motion: a restoring force proportional to displacement. */
export const shmBasics: Gen = mix(
  () => {
    const d = pick([-1, -0.5, 0, 0.5, 1]);
    const ask = pick(["a", "F"] as const);
    const dir = d > 0 ? "to the left" : d < 0 ? "to the right" : "zero";
    return q(
      {
        key: `shm-dir-${d}-${ask}`,
        prompt: `A mass on a spring slides on a frictionless floor. The dashed line is equilibrium. At the moment shown, which way does its ${ask === "a" ? "acceleration" : "net force"} point?`,
        visual: { kind: "phys-oscillator", type: "spring", displacement: d, amplitudeLabel: "A", massLabel: "m", kLabel: "k" },
        needsVisual: true,
        hint: "The spring always pulls or pushes the mass back toward equilibrium: F = −kx.",
        explain: d === 0 ? "At equilibrium x = 0, so F = −kx = 0 and a = 0 (the speed is greatest here)." : `The mass is ${d > 0 ? "right of" : "left of"} equilibrium, so the restoring force (and a) point ${dir}, back toward x = 0.`,
      },
      lab(dir, ["to the left", "to the right", "zero"]),
    );
  },
  () => {
    const k = pick([50, 100, 200, 400]);
    const x = pick([-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]);
    const m = pick([0.5, 1, 2, 4]);
    const askA = Math.random() < 0.5;
    const F = -k * x;
    return q(
      {
        key: `shm-fx-${k}-${x}-${m}-${askA}`,
        prompt: `A ${s(m)} kg mass on a spring (k = ${k} N/m) is at x = ${s(x)} m. What is its ${askA ? "acceleration" : "restoring force"} (+ is the +x direction)?`,
        unit: askA ? "m/s²" : "N",
        hint: "F = −kx (opposite the displacement)" + (askA ? ", and a = F ÷ m." : "."),
        explain: `F = −${k} × (${s(x)}) = ${s(F)} N.${askA ? ` a = ${s(F)} ÷ ${s(m)} = ${s(F / m)} m/s².` : ""}`,
      },
      sk(askA ? F / m : F, [-(askA ? F / m : F), k * x * m]),
    );
  },
  () => {
    const items = [
      { p: "Where is a mass on a spring moving fastest?", a: "At equilibrium (x = 0)", w: ["At the ends (x = ±A)", "Halfway between equilibrium and the end", "Its speed is constant"], e: "All the energy is kinetic at x = 0; at the ends it momentarily stops." },
      { p: "Where is the size of a spring oscillator's acceleration greatest?", a: "At the ends (x = ±A)", w: ["At equilibrium", "Halfway out", "It's the same everywhere"], e: "a = −(k/m)x, so |a| is biggest where |x| is biggest." },
      { p: "Which force law gives simple harmonic motion?", a: "A restoring force proportional to displacement (F = −kx)", w: ["A constant force", "A force proportional to velocity", "A force proportional to x²"], e: "SHM happens when the net force points back to equilibrium and grows in proportion to the displacement." },
      { p: "At the instant an oscillating mass passes through equilibrium, its acceleration is…", a: "zero", w: ["at its maximum", "equal to g", "in the direction of motion"], e: "x = 0 there, so F = −kx = 0." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `shm-concept-${i}`, prompt: it.p, hint: "SHM: F = −kx. Speed is greatest at x = 0; force and acceleration are greatest at x = ±A.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.7.2 — the period of a mass on a spring: T = 2π√(m/k). */
export const springPeriod: Gen = mix(
  () => {
    const sc = pick([
      { c: "the mass is made 4 times bigger", a: "it doubles" },
      { c: "the mass is made 9 times bigger", a: "it triples" },
      { c: "the spring constant is made 4 times bigger", a: "it halves" },
      { c: "the amplitude is doubled", a: "it stays the same" },
      { c: "the mass is doubled", a: "it is multiplied by √2" },
      { c: "the same spring and mass hang vertically instead", a: "it stays the same" },
    ]);
    return q(
      {
        key: `sp-change-${sc.c}`,
        prompt: `A mass oscillates on a spring. How does the period change if ${sc.c}?`,
        hint: "T = 2π√(m/k). Amplitude and g don't appear.",
        explain: `T ∝ √(m/k), so ${sc.a}.`,
      },
      lab(sc.a, ["it doubles", "it triples", "it halves", "it stays the same", "it is multiplied by √2", "it quadruples"].filter((x) => x !== sc.a)),
    );
  },
  () => {
    const [m, k] = pick([
      [1, 100],
      [0.25, 100],
      [4, 100],
      [1, 400],
      [2, 50],
      [0.5, 50],
      [9, 100],
    ]);
    const T = 2 * Math.PI * Math.sqrt(m / k);
    const t = (x: number) => `${x.toFixed(2)} s`;
    return q(
      {
        key: `sp-calc-${m}-${k}`,
        prompt: `What is the period of a ${s(m)} kg mass on a spring with k = ${k} N/m?`,
        hint: "T = 2π√(m/k).",
        explain: `T = 2π√(${s(m)} ÷ ${k}) = 2π × ${s(Math.sqrt(m / k))} ≈ ${t(T)}.`,
      },
      lab(t(T), [t(Math.sqrt(m / k)), t(2 * Math.PI * Math.sqrt(k / m) > 99 ? T * 2 : 2 * Math.PI * Math.sqrt(k / m)), t(2 * Math.PI * (m / k)), t(T * 2)]),
    );
  },
  () => {
    const m = pick([1, 2, 4]);
    const Tn = pick([1, 2, 5]);
    const k = m * 4 * Tn * Tn;
    return q(
      {
        key: `sp-findk-${m}-${Tn}`,
        prompt: `A ${m} kg mass on a spring has a period of ${Tn === 1 ? "π" : `π/${Tn}`} s (about ${s(rd(Math.PI / Tn, 2))} s). What is the spring constant?`,
        unit: "N/m",
        hint: "Square T = 2π√(m/k): k = 4π²m ÷ T². The π's cancel.",
        explain: `k = 4π² × ${m} ÷ (${Tn === 1 ? "π" : `π/${Tn}`})² = 4 × ${m} × ${Tn * Tn} = ${k} N/m.`,
      },
      kp(k),
    );
  },
);

/** PHYS.7.2 — the period of a simple pendulum: T = 2π√(L/g). */
export const pendulumPeriod: Gen = mix(
  () => {
    const sc = pick([
      { c: "the string is made 4 times longer", a: "it doubles" },
      { c: "the bob's mass is doubled", a: "it stays the same" },
      { c: "it is taken to a planet where g is 4 times smaller", a: "it doubles" },
      { c: "the string is made 9 times longer", a: "it triples" },
      { c: "the starting angle is changed from 5° to 10°", a: "it stays the same" },
      { c: "the string is made a quarter as long", a: "it halves" },
      { c: "it is taken to a planet where g is 9 times bigger", a: "it becomes a third as long" },
      { c: "the bob is swapped for one made of lead, same size", a: "it stays the same" },
      { c: "the string is doubled in length", a: "it is multiplied by √2" },
    ]);
    return q(
      {
        key: `pp-change-${sc.c}`,
        prompt: `How does a simple pendulum's period change if ${sc.c}?`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 20, lengthLabel: "L", massLabel: "m", swing: true },
        hint: "T = 2π√(L/g) for small swings. Mass and (small) amplitude don't appear.",
        explain: `T ∝ √(L/g), so ${sc.a}.`,
      },
      lab(sc.a, ["it doubles", "it triples", "it halves", "it stays the same", "it quadruples", "it becomes a third as long", "it is multiplied by √2"].filter((x) => x !== sc.a)),
    );
  },
  () => {
    const k = pick([0.25, 0.5, 0.75, 1, 1.5]);
    const L = 9.8 * k * k;
    const T = 2 * Math.PI * k;
    const t = (x: number) => `${x.toFixed(2)} s`;
    return q(
      {
        key: `pp-calc-${k}`,
        prompt: `What is the period of a simple pendulum ${s(L)} m long?`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 15, lengthLabel: L, swing: true },
        hint: "T = 2π√(L/g), with g = 9.8 m/s².",
        explain: `L/g = ${s(L)} ÷ 9.8 = ${s(k * k)}, √ = ${s(k)}, so T = 2π × ${s(k)} ≈ ${t(T)}.`,
      },
      lab(t(T), [t(T / 2), t(T * 2), t(2 * Math.PI * k * k), t(k * k)]),
    );
  },
  () => {
    const items = [
      { p: "A pendulum clock that keeps perfect time on Earth is taken to the Moon. What happens?", a: "It runs slow (each swing takes longer)", w: ["It runs fast", "It keeps perfect time", "It stops swinging"], e: "The Moon's g is smaller, so T = 2π√(L/g) is longer." },
      { p: "Which pendulum has the longest period?", a: "The longest string", w: ["The heaviest bob", "The biggest swing (still small)", "The lightest bob"], e: "Only L (and g) set the period of a simple pendulum." },
      { p: "A pendulum is about 1 m long. Roughly what is its period?", a: "About 2 s", w: ["About 0.5 s", "About 1 s", "About 6 s"], e: "T = 2π√(1/9.8) ≈ 2.0 s: the classic 'seconds pendulum' (each one-way swing takes 1 s)." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `pp-concept-${i}`, prompt: it.p, hint: "T = 2π√(L/g).", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.7.2 — frequency, period and angular frequency. */
export const frequencyPeriod: Gen = mix(
  () => {
    const [n, t] = until(
      () => [pick([10, 20, 30, 40, 50]), pick([5, 10, 20, 25])],
      ([nn, tt]) => isStep(tt / nn, 0.001) && isStep(nn / tt, 0.001),
    );
    const askF = Math.random() < 0.5;
    return q(
      {
        key: `fp-count-${n}-${t}-${askF}`,
        prompt: `A spring makes ${n} complete oscillations in ${t} s. What is its ${askF ? "frequency" : "period"}?`,
        unit: askF ? "Hz" : "s",
        hint: askF ? "f = oscillations ÷ time." : "T = time ÷ oscillations.",
        explain: askF ? `f = ${n} ÷ ${t} = ${s(n / t)} Hz.` : `T = ${t} ÷ ${n} = ${s(t / n)} s.`,
      },
      kp(askF ? n / t : t / n, [askF ? t / n : n / t]),
    );
  },
  () => {
    const T = pick([0.1, 0.2, 0.25, 0.5, 2, 4, 5]);
    return q(
      {
        key: `fp-tf-${T}`,
        prompt: `An oscillator has a period of ${s(T)} s. What is its frequency?`,
        unit: "Hz",
        hint: "f = 1 ÷ T.",
        explain: `f = 1 ÷ ${s(T)} = ${s(1 / T)} Hz.`,
      },
      kp(1 / T, [T, 2 / T]),
    );
  },
  () => {
    const f = pick([0.5, 1, 2, 4, 5, 10]);
    const correct = `${piText(2 * f * 2, 2)} rad/s`;
    return q(
      {
        key: `fp-omega-${f}`,
        prompt: `An oscillator vibrates at ${s(f)} Hz. What is its angular frequency ω?`,
        hint: "ω = 2πf.",
        explain: `ω = 2π × ${s(f)} = ${correct}.`,
      },
      lab(correct, [`${piText(f * 2, 2)} rad/s`, `${piText(8 * f, 2)} rad/s`, `${s(2 * f)} rad/s`]),
    );
  },
  () => {
    const T = pick([2, 4]);
    const cycles = pick([2, 3]);
    const A = pick([2, 3]);
    return q(
      {
        key: `fp-graph-${T}-${cycles}-${A}`,
        prompt: "Read the period from this x–t graph of an oscillator. What is its frequency?",
        visual: {
          kind: "plot", ...axes("x (cm) vs t (s)"),
          x: [0, T * cycles],
          y: [-4, 4],
          curves: [{ fn: (t) => A * Math.cos((2 * Math.PI * t) / T), colour: "leaf" }],
          points: Array.from({ length: cycles + 1 }, (_, i) => ({ x: i * T, y: A })),
        },
        needsVisual: true,
        unit: "Hz",
        hint: "One period is the time from one peak to the next. Then f = 1/T.",
        explain: `Peaks are ${T} s apart, so T = ${T} s and f = 1 ÷ ${T} = ${s(1 / T)} Hz.`,
      },
      kp(1 / T, [T, A]),
    );
  },
);

/** PHYS.7.3 — reading SHM graphs. */
export const shmGraphs: Gen = mix(
  () => {
    const A = pick([2, 3, 4]);
    const T = pick([2, 4, 8]);
    const ask = pick(["A", "T"] as const);
    return q(
      {
        key: `sg-read-${A}-${T}-${ask}`,
        prompt: `This is an x–t graph of a mass on a spring. What is its ${ask === "A" ? "amplitude" : "period"}?`,
        visual: {
          kind: "plot", ...axes("x (cm) vs t (s)"),
          x: [0, 2 * T],
          y: [-5, 5],
          curves: [{ fn: (t) => A * Math.sin((2 * Math.PI * t) / T), colour: "leaf" }],
        },
        needsVisual: true,
        unit: ask === "A" ? "cm" : "s",
        hint: ask === "A" ? "Amplitude is the distance from equilibrium (x = 0) to a peak, not peak to trough." : "The period is the time for one complete cycle (e.g. up-crossing to up-crossing).",
        explain: ask === "A" ? `The peaks reach ${A} cm, so A = ${A} cm.` : `It repeats every ${T} s, so T = ${T} s.`,
      },
      kp(ask === "A" ? A : T, ask === "A" ? [2 * A] : [T / 2, 2 * T]),
    );
  },
  () => {
    const T = 4;
    const A = 3;
    const ask = pick(["speed", "apos", "aneg", "rest"] as const);
    const shift = pick([0, 1]);
    // Points at quarter periods; x = A cos(...) or A sin(...).
    const fn = (t: number) => (shift ? A * Math.sin((2 * Math.PI * t) / T) : A * Math.cos((2 * Math.PI * t) / T));
    const order = shuffle([0, 1, 2, 3]);
    const ts = order.map((k) => k + 0.0);
    const pts = ts.map((t, i) => ({ x: t, y: clean(fn(t)), label: LETTERS[i] }));
    const value = (p: { y: number }) => (ask === "speed" ? (Math.abs(p.y) < 1e-6 ? 1 : 0) : ask === "apos" ? -p.y : ask === "aneg" ? p.y : Math.abs(p.y));
    const best = pts.filter((p) => Math.abs(value(p) - Math.max(...pts.map(value))) < 1e-6).map((p) => p.label);
    const correct = best.length === 1 ? best[0] : `${best.sort().join(" and ")}`;
    const wrongs = [...LETTERS.slice(0, 4), "A and C", "B and D", "A and B", "C and D", "A and D", "B and C"].filter((x) => x !== correct);
    const what = ask === "speed" ? "is the mass moving fastest" : ask === "apos" ? "is its acceleration greatest in the + direction" : ask === "aneg" ? "is its acceleration greatest in the − direction" : "is the mass momentarily at rest";
    return q(
      {
        key: `sg-points-${ask}-${shift}-${order.join("")}`,
        prompt: `At which labelled point(s) ${what}?`,
        visual: { kind: "plot", ...axes("x vs t"), x: [0, 4.5], y: [-4, 4], curves: [{ fn, colour: "leaf" }], points: pts },
        needsVisual: true,
        hint: ask === "speed" ? "Speed is the steepness of x–t: steepest where it crosses x = 0." : ask === "rest" ? "v = 0 where the x–t graph is flat: at the peaks and troughs." : "a = −(k/m)x: acceleration is opposite to x, biggest where |x| is biggest.",
        explain:
          ask === "speed"
            ? `Fastest at x = 0: ${correct}.`
            : ask === "rest"
              ? `At rest at the turning points (x = ±A): ${correct}.`
              : `a = −ω²x, so a is most ${ask === "apos" ? "positive at x = −A" : "negative at x = +A"}: ${correct}.`,
      },
      lab(correct, wrongs),
    );
  },
  () => {
    const sc = pick([
      { x: "x = A cos(ωt) (starts at +A)", v: "v starts at 0 and goes negative (a −sine curve)" },
      { x: "x = A sin(ωt) (starts at 0, moving +)", v: "v starts at its maximum and decreases (a cosine curve)" },
    ]);
    return q(
      {
        key: `sg-vt-${sc.x.length}`,
        prompt: `An oscillator's position is ${sc.x}. Which describes its v–t graph?`,
        speech: `An oscillator's position is ${sc.x}. Which describes its velocity-time graph?`,
        hint: "v is the slope of x–t at each instant.",
        explain: `The slope of ${sc.x.split(" (")[0]} gives: ${sc.v}.`,
      },
      lab(sc.v, ["v starts at 0 and goes negative (a −sine curve)", "v starts at its maximum and decreases (a cosine curve)", "v is constant", "v starts at 0 and goes positive (a sine curve)"].filter((x) => x !== sc.v)),
    );
  },
);

/** PHYS.7.3 — SHM equations: x = A cos(ωt), v_max = Aω, a_max = Aω². */
export const shmEquations: Gen = mix(
  () => {
    const A = pick([2, 4, 6, 10]);
    const T = pick([4, 6, 12]);
    const frac = pick([0.25, 0.5, 1, 1 / 6, 1 / 3]);
    const t = T * frac;
    if (!Number.isInteger(t)) return shmEquations();
    const x = clean(A * Math.cos(2 * Math.PI * frac));
    return q(
      {
        key: `se-x-${A}-${T}-${t}`,
        prompt: `x = ${A} cos(2πt/${T}) (x in cm, t in s). What is x at t = ${t} s?`,
        speech: `x equals ${A} times cos of 2 pi t over ${T}. What is x at ${t} seconds?`,
        unit: "cm",
        hint: `t = ${t} s is ${frac === 0.25 ? "a quarter" : frac === 0.5 ? "half" : frac === 1 ? "one whole" : frac < 0.2 ? "a sixth" : "a third"} of a period. Find the angle 2πt/T, then its cosine.`,
        explain: `2πt/T = ${s(360 * frac)}°, cos ${s(360 * frac)}° = ${s(clean(Math.cos(2 * Math.PI * frac)))}, so x = ${s(x)} cm.`,
      },
      sk(x, [A, -A, 0, A / 2].filter((v) => v !== x)),
    );
  },
  () => {
    const [k, m, w] = pick([
      [200, 2, 10],
      [100, 4, 5],
      [400, 1, 20],
      [90, 10, 3],
      [160, 10, 4],
      [50, 2, 5],
    ]);
    const A = pick([0.05, 0.1, 0.2]);
    const askA = Math.random() < 0.5;
    return q(
      {
        key: `se-max-${k}-${m}-${A}-${askA}`,
        prompt: `A ${m} kg mass on a spring (k = ${k} N/m) oscillates with amplitude ${s(A)} m. What is its maximum ${askA ? "acceleration" : "speed"}?`,
        unit: askA ? "m/s²" : "m/s",
        hint: `ω = √(k/m). Then v_max = Aω and a_max = Aω².`,
        explain: `ω = √(${k} ÷ ${m}) = ${w} rad/s. ${askA ? `a_max = ${s(A)} × ${w * w} = ${s(A * w * w)} m/s².` : `v_max = ${s(A)} × ${w} = ${s(A * w)} m/s.`}`,
      },
      kp(askA ? A * w * w : A * w, [askA ? A * w : A * w * w, A * k]),
    );
  },
  () => {
    const A = pick([0.02, 0.05, 0.1, 0.3]);
    const f = pick([0.5, 1, 2, 4, 5]);
    const ask = pick(["A", "f", "T"] as const);
    const ans = ask === "A" ? A : ask === "f" ? f : 1 / f;
    return q(
      {
        key: `se-read-${A}-${f}-${ask}`,
        prompt: `An oscillator follows x = ${s(A)} cos(${s(2 * f)}πt) in metres and seconds. What is its ${ask === "A" ? "amplitude" : ask === "f" ? "frequency" : "period"}?`,
        speech: `An oscillator follows x equals ${s(A)} cos of ${s(2 * f)} pi t. What is its ${ask === "A" ? "amplitude" : ask === "f" ? "frequency" : "period"}?`,
        unit: ask === "A" ? "m" : ask === "f" ? "Hz" : "s",
        hint: "Compare with x = A cos(2πft): the number in front is A, and the bracket is 2πf × t.",
        explain: `A = ${s(A)} m. 2πf = ${s(2 * f)}π, so f = ${s(f)} Hz and T = 1/f = ${s(1 / f)} s.`,
      },
      kp(ans, [2 * f, f / 2, A * 2]),
    );
  },
);

/** PHYS.7.4 — energy of simple harmonic oscillators. */
export const shmEnergy: Gen = mix(
  () => {
    const k = pick([100, 200, 400, 800]);
    const A = pick([0.05, 0.1, 0.2]);
    return q(
      {
        key: `sen-E-${k}-${A}`,
        prompt: `A spring (k = ${k} N/m) oscillates with amplitude ${s(A)} m. What is the total mechanical energy?`,
        unit: "J",
        hint: "At x = A the mass stops, so all the energy is spring energy: E = ½kA².",
        explain: `E = ½ × ${k} × ${s(A)}² = ${s(0.5 * k * A * A)} J.`,
      },
      kp(0.5 * k * A * A, [k * A * A, 0.5 * k * A]),
    );
  },
  () => {
    const k = pick([100, 200, 400]);
    const [A, x] = pick([
      [0.2, 0.1],
      [0.1, 0.05],
      [0.3, 0.1],
      [0.2, 0.15],
      [0.5, 0.3],
    ]);
    const K = 0.5 * k * (A * A - x * x);
    return q(
      {
        key: `sen-K-${k}-${A}-${x}`,
        prompt: `A mass on a spring (k = ${k} N/m) has amplitude ${s(A)} m. What is its kinetic energy when x = ${s(x)} m?`,
        unit: "J",
        hint: "K = E − U = ½kA² − ½kx².",
        explain: `E = ${s(0.5 * k * A * A)} J, U = ${s(0.5 * k * x * x)} J, so K = ${s(K)} J.`,
      },
      kp(K, [0.5 * k * (A - x) * (A - x), 0.5 * k * x * x]),
    );
  },
  () => {
    const E = pick([20, 40, 60, 80]);
    const half = Math.random() < 0.5;
    const U = half ? E / 4 : 0;
    return q(
      {
        key: `sen-bars-${E}-${half}`,
        prompt: `A spring oscillator has ${E} J of energy. Find its kinetic energy when x = ${half ? "A/2" : "0"}.`,
        visual: {
          kind: "phys-energy",
          names: ["K", "U_spring"],
          bars: [
            { title: "x = A", values: [0, E] },
            { title: half ? "x = A/2" : "x = 0", values: ["?", U] },
          ],
          max: 100,
          unit: "J",
        },
        needsVisual: true,
        unit: "J",
        hint: "U = ½kx²: at half the amplitude it is (1/2)² = 1/4 of the total.",
        explain: half ? `U = ¼ × ${E} = ${E / 4} J, so K = ${(3 * E) / 4} J (three quarters of the energy).` : `At equilibrium U = 0, so K = ${E} J, its maximum.`,
      },
      kp(E - U, [E / 2, E / 4]),
    );
  },
  () => {
    const sc = pick([
      { c: "the amplitude is doubled", e: "4 times as much", v: "doubles" },
      { c: "the amplitude is tripled", e: "9 times as much", v: "triples" },
      { c: "the amplitude is halved", e: "a quarter as much", v: "halves" },
    ]);
    const askE = Math.random() < 0.5;
    return q(
      {
        key: `sen-ratio-${sc.c}-${askE}`,
        prompt: `A mass on a spring oscillates. If ${sc.c}, ${askE ? "how does the total energy change?" : "what happens to the maximum speed?"}`,
        hint: askE ? "E = ½kA²." : "½mv_max² = ½kA², so v_max = A√(k/m).",
        explain: askE ? `E ∝ A², so it has ${sc.e}.` : `v_max ∝ A, so it ${sc.v}. (The period doesn't change.)`,
      },
      askE ? lab(sc.e, ["4 times as much", "9 times as much", "a quarter as much", "twice as much", "the same"].filter((x) => x !== sc.e)) : lab(sc.v, ["doubles", "triples", "halves", "stays the same", "quadruples"].filter((x) => x !== sc.v)),
    );
  },
);

/** PHYS.7.4, PHYS.7.1 — vertical springs and pendulum energy. */
export const oscillatorEnergyMore: Gen = mix(
  () => {
    const k = rand(2, 7);
    const h = 0.1 * k * k;
    return q(
      {
        key: `oem-pend-${k}`,
        prompt: `A pendulum bob is released from ${s(h)} m above its lowest point. How fast is it moving at the bottom of its swing?`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 40, angleLabel: null, swing: true },
        unit: "m/s",
        hint: "mgh = ½mv² (the string's tension does no work).",
        explain: `v = √(2 × 9.8 × ${s(h)}) = ${s(1.4 * k)} m/s.`,
      },
      kp(1.4 * k),
    );
  },
  () => {
    const L = pick([1.25, 5]);
    const v = Math.sqrt(9.8 * L);
    return q(
      {
        key: `oem-60-${L}`,
        prompt: `A ${s(L)} m pendulum is pulled out to 60° and released. How fast is the bob at the bottom? (cos 60° = 0.5)`,
        visual: { kind: "phys-oscillator", type: "pendulum", angle: 60, lengthLabel: L, swing: true },
        unit: "m/s",
        hint: "The bob starts h = L(1 − cos θ) above the bottom. Then v = √(2gh).",
        explain: `h = ${s(L)}(1 − 0.5) = ${s(L / 2)} m. v = √(2 × 9.8 × ${s(L / 2)}) = ${s(v)} m/s.`,
      },
      kp(v),
    );
  },
  () => {
    const [m, k] = pick([
      [0.5, 49],
      [1, 98],
      [2, 98],
      [1, 49],
      [0.5, 98],
    ]);
    const x = (9.8 * m) / k;
    return q(
      {
        key: `oem-vert-${m}-${k}`,
        prompt: `A ${s(m)} kg mass hangs from a spring (k = ${k} N/m). How far below the unstretched length is its new equilibrium position, the centre of its oscillation?`,
        visual: { kind: "phys-oscillator", type: "spring", orientation: "vertical", displacement: 0.4, massLabel: m, kLabel: k, animate: false },
        unit: "m",
        hint: "At equilibrium the spring force balances the weight: kx = mg. The mass oscillates around this point with the same T = 2π√(m/k).",
        explain: `x = mg ÷ k = ${s(9.8 * m)} ÷ ${k} = ${s(x)} m.`,
      },
      kp(x),
    );
  },
  () => {
    const items = [
      { p: "A pendulum swings back and forth (system: bob + Earth, no air). Where is its gravitational PE greatest?", a: "At the ends of the swing", w: ["At the bottom", "Halfway down", "It's the same everywhere"], e: "The ends are highest, where it momentarily stops: all the energy is GPE there." },
      { p: "With a little air resistance, what happens to a pendulum's amplitude and period over time?", a: "The amplitude shrinks; the period stays about the same", w: ["Both shrink", "The amplitude stays; the period grows", "Both grow"], e: "Energy is lost so A drops, but T = 2π√(L/g) doesn't depend on amplitude." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `oem-concept-${i}`, prompt: it.p, hint: "Energy moves between kinetic and potential; the total is constant without friction.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.7.1 — Do it: draw the restoring force on an oscillator. */
export const restoringForceDoIt: Gen = mix(
  () => {
    const x = pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    return q(
      {
        key: `rf-horiz-${x}`,
        prompt: `A mass on a spring is ${Math.abs(x)} cm ${x > 0 ? "right" : "left"} of equilibrium. The spring force is 1 unit per cm of displacement. Draw the spring force F.`,
        hint: "F = −kx: it points back toward equilibrium, and its size is k|x|.",
        explain: `${Math.abs(x)} units, pointing ${x > 0 ? "left" : "right"} (toward equilibrium).`,
      },
      act({ kind: "phys-forceArrows", object: "box", surface: "floor", directions: 4, maxSize: 6, arrows: [{ label: "F", answer: { dir: x > 0 ? 180 : 0, size: Math.abs(x) } }], check: "exact" }, Math.abs(x)),
    );
  },
  () => {
    const w = rand(2, 3);
    const where = pick([
      { p: "at the lowest point of its bounce", n: pick([1, 2, 3]) },
      { p: "at its equilibrium position", n: 0 },
      { p: "at the highest point of its bounce (spring still stretched)", n: -1 },
    ]);
    const Fs = w + where.n;
    return q(
      {
        key: `rf-vert-${w}-${where.n}`,
        prompt: `A mass (weight ${w} units) bounces on a vertical spring. It is ${where.p}${where.n ? `, where the net force is ${Math.abs(where.n)} unit${Math.abs(where.n) > 1 ? "s" : ""} ${where.n > 0 ? "up" : "down"}` : ""}. Draw the spring force F_s.`,
        hint: "Net force = spring force + weight. At the bottom the net force points up (toward equilibrium); at the top it points down.",
        explain: `F_s − ${w} = ${s(where.n)}, so F_s = ${Fs} units up.`,
      },
      act({ kind: "phys-forceArrows", object: "box", surface: "ceiling", directions: 4, maxSize: 6, given: [{ dir: 270, size: w, label: "F_g" }], arrows: [{ label: "F_s", answer: { dir: 90, size: Fs } }], check: "net", net: { x: 0, y: where.n } }, Fs),
    );
  },
);

/** PHYS.7.2, PHYS.7.3 — Do it: linearize period data (T² against m or L). */
export const linearizePeriod: Gen = mix(
  () => {
    const [kText, slope, ms] = pick([
      ["4π² ≈ 39.5", 1, [1, 2, 4]],
      ["2π² ≈ 19.7", 2, [1, 2, 4]],
      ["8π² ≈ 79", 0.5, [2, 4, 8]],
    ] as [string, number, number[]][]);
    const pts = ms.map((m, i) => ({ x: m, y: slope * m, label: LETTERS[i] }));
    return q(
      {
        key: `lp-plot-${slope}`,
        prompt: `Masses were hung on a spring (k = ${kText} N/m) and the period timed. Plot T² against m (m across, T² up).`,
        speech: "Masses were hung on a spring and the period timed. Plot T squared against m, with mass across and T squared up.",
        visual: { kind: "table", header: ["Point", "m (kg)", "T² (s²)"], rows: pts.map((p) => [p.label, p.x, p.y]) },
        hint: "Use the T² column (not T) for the height.",
        explain: `T² = (4π²/k)m, a straight line through the origin with slope 4π²/k = ${s(slope)} s²/kg.`,
      },
      act({ kind: "plotPoints", points: pts, size: 10, quadrants: 1 }, slope),
    );
  },
  () => {
    const slope = pick([0.1, 0.2, 0.4, 0.5, 1]);
    const k = (4 * Math.PI * Math.PI) / slope;
    const t = (x: number) => `${s(rd(x, 1))} N/m`;
    return q(
      {
        key: `lp-k-${slope}`,
        prompt: `A graph of T² (s²) against hanging mass m (kg) for a spring is a straight line with slope ${s(slope)} s²/kg. What is k?`,
        speech: `A graph of T squared against hanging mass for a spring is a straight line with slope ${s(slope)}. What is the spring constant?`,
        hint: "T² = (4π²/k)m, so slope = 4π²/k and k = 4π² ÷ slope.",
        explain: `k = 4π² ÷ ${s(slope)} = 39.48 ÷ ${s(slope)} ≈ ${t(k)}.`,
      },
      lab(t(k), [t(slope * 4 * Math.PI * Math.PI), t((2 * Math.PI) / slope), t(1 / slope)]),
    );
  },
  () => {
    const [slope, g] = pick([
      [4.03, 9.8],
      [4.0, 9.9],
      [24.7, 1.6],
      [10.6, 3.7],
    ]);
    return q(
      {
        key: `lp-g-${slope}`,
        prompt: `On a planet, students graph T² (s²) against pendulum length L (m) and get a straight line with slope ${s(slope)} s²/m. What is g there?`,
        speech: `On a planet, students graph T squared against pendulum length and get a straight line with slope ${s(slope)}. What is g there?`,
        hint: "T² = (4π²/g)L, so slope = 4π²/g and g = 4π² ÷ slope.",
        explain: `g = 39.48 ÷ ${s(slope)} ≈ ${s(g)} m/s².`,
      },
      lab(`${s(g)} m/s²`, [`${s(rd(slope / 4, 1))} m/s²`, `${s(rd((2 * Math.PI) / slope, 2))} m/s²`, `${s(rd(slope, 1))} m/s²`, "9.8 m/s²"]),
    );
  },
  () => {
    const sl = pick([1, 2, 0.5]);
    return q(
      {
        key: `lp-draw-${sl}`,
        prompt: `For a spring with 4π²/k = ${s(sl)} s²/kg, draw the line T² = (4π²/k)m (m across, T² up).`,
        speech: `For a spring where 4 pi squared over k is ${s(sl)}, draw the line of T squared against m.`,
        hint: "It goes through the origin with slope 4π²/k.",
        explain: `A line from (0, 0) rising ${s(sl)} s² per kg.`,
      },
      act({ kind: "drawLine", m: sl, b: 0, size: 10, quadrants: 1 }, sl),
    );
  },
);

/* ======================================================= 8. Fluids */

/** PHYS.8.1 — density. */
export const density: Gen = mix(
  () => {
    const [m, V] = until(
      () => [pick([2, 5, 8, 9, 12, 27, 54]), pick([0.001, 0.002, 0.003, 0.004, 0.01, 0.02])],
      ([mm, vv]) => isStep(mm / vv, 50),
    );
    return q(
      {
        key: `den-calc-${m}-${V}`,
        prompt: `A block has a mass of ${m} kg and a volume of ${s(V)} m³. What is its density?`,
        unit: "kg/m³",
        hint: "ρ = m ÷ V.",
        explain: `ρ = ${m} ÷ ${s(V)} = ${s(m / V)} kg/m³.`,
      },
      kp(m / V, [m * V, V / m]),
    );
  },
  () => {
    const g = pick([0.5, 0.8, 0.92, 1, 1.2, 2.7, 7.9, 11.3, 13.6]);
    return q(
      {
        key: `den-conv-${g}`,
        prompt: `A material has a density of ${s(g)} g/cm³. What is that in kg/m³?`,
        unit: "kg/m³",
        hint: "1 g/cm³ = 1000 kg/m³ (water).",
        explain: `${s(g)} × 1000 = ${s(g * 1000)} kg/m³.`,
      },
      kp(g * 1000, [g * 100, g * 10]),
    );
  },
  () => {
    const [name, rho] = pick([
      ["aluminum", 2700],
      ["ice", 920],
      ["oak", 750],
      ["steel", 7900],
      ["concrete", 2400],
    ] as [string, number][]);
    const V = pick([0.001, 0.002, 0.01, 0.05]);
    return q(
      {
        key: `den-mass-${name}-${V}`,
        prompt: `What is the mass of ${s(V)} m³ of ${name} (ρ = ${s(rho)} kg/m³)?`,
        unit: "kg",
        hint: "m = ρV.",
        explain: `m = ${s(rho)} × ${s(V)} = ${s(rho * V)} kg.`,
      },
      kp(rho * V, [rho / V, (rho * V) / 10]),
    );
  },
  () => {
    const objs = shuffle([
      ["cork", 240],
      ["pine", 500],
      ["ice", 920],
      ["rubber", 1100],
      ["aluminum", 2700],
      ["candle wax", 900],
      ["brick", 1900],
    ] as [string, number][]).slice(0, 4);
    const floats = objs.filter(([, r]) => r < 1000);
    if (!floats.length || floats.length === 4) return density();
    const wantSink = Math.random() < 0.5;
    const pool = wantSink ? objs.filter(([, r]) => r > 1000) : floats;
    const [right] = pick(pool);
    return q(
      {
        key: `den-float-${objs.map((o) => o[0]).join("-")}-${right}-${wantSink}`,
        prompt: `Which of these ${wantSink ? "sinks" : "floats"} in water (1000 kg/m³)?`,
        visual: { kind: "table", header: ["Material", "ρ (kg/m³)"], rows: objs.map(([n, r]) => [n, r]) },
        needsVisual: true,
        hint: "A solid object floats if it is less dense than the liquid.",
        explain: `${cap(right)} is ${wantSink ? "denser" : "less dense"} than water (${objs.find((o) => o[0] === right)![1]} kg/m³), so it ${wantSink ? "sinks" : "floats"}.`,
      },
      lab(right, objs.filter((o) => (wantSink ? o[1] < 1000 : o[1] > 1000)).map((o) => o[0])),
    );
  },
);

/** PHYS.8.2 — pressure: P = F/A and P = P₀ + ρgh. */
export const pressure: Gen = mix(
  () => {
    const F = pick([500, 600, 800, 1000, 1200]);
    const A = pick([0.02, 0.04, 0.05, 0.1, 0.2]);
    return q(
      {
        key: `pr-fa-${F}-${A}`,
        prompt: `A ${F} N crate rests on a face of area ${s(A)} m². What pressure does it exert on the floor?`,
        unit: "Pa",
        hint: "P = F ÷ A (1 Pa = 1 N/m²).",
        explain: `P = ${F} ÷ ${s(A)} = ${s(F / A)} Pa.`,
      },
      kp(F / A, [F * A]),
    );
  },
  () => {
    const h = pick([1, 2, 5, 10, 20, 30]);
    const abs = Math.random() < 0.5;
    const P = 9.8 * h + (abs ? 101 : 0);
    return q(
      {
        key: `pr-depth-${h}-${abs}`,
        prompt: `What is the ${abs ? "absolute" : "gauge"} pressure ${h} m below the surface of a lake (ρ = 1000 kg/m³${abs ? ", P_atm = 101 kPa" : ""})? Answer in kPa.`,
        unit: "kPa",
        hint: abs ? "P = P_atm + ρgh. Remember ρgh comes out in Pa: divide by 1000 for kPa." : "Gauge pressure = ρgh (the pressure above atmospheric).",
        explain: `ρgh = 1000 × 9.8 × ${h} = ${s(9800 * h)} Pa = ${s(9.8 * h)} kPa${abs ? `, plus 101 kPa = ${s(P)} kPa` : ""}.`,
      },
      kp(P, [9.8 * h + (abs ? 0 : 101), 98 * h]),
    );
  },
  () => {
    const [liquid, rho] = pick([
      ["oil", 800],
      ["seawater", 1025],
      ["mercury", 13600],
      ["water", 1000],
    ] as [string, number][]);
    const h = pick([0.5, 1, 2, 4]);
    const P = (rho * 9.8 * h) / 1000;
    return q(
      {
        key: `pr-liquid-${liquid}-${h}`,
        prompt: `What is the gauge pressure at the bottom of a tank of ${liquid} (ρ = ${s(rho)} kg/m³) that is ${s(h)} m deep? Answer in kPa, to 2 decimal places if needed.`,
        visual: { kind: "phys-fluid", scene: "pressure", liquid, points: [{ depth: 1, label: "?", depthLabel: h }] },
        unit: "kPa",
        hint: "P_gauge = ρgh, then ÷ 1000 for kPa.",
        explain: `${s(rho)} × 9.8 × ${s(h)} = ${s(rho * 9.8 * h)} Pa = ${s(rd(P, 2))} kPa.`,
      },
      kp(rd(P, 2)),
    );
  },
  () => {
    const h = pick([2, 5, 10]);
    const A = pick([0.1, 0.2, 0.5]);
    const F = 9800 * h * A;
    return q(
      {
        key: `pr-window-${h}-${A}`,
        prompt: `An aquarium window of area ${s(A)} m² is ${h} m below the water surface. What extra force (beyond the air's) does the water push on it with?`,
        unit: "N",
        hint: "F = P_gauge × A, with P_gauge = ρgh.",
        explain: `P = 9800 × ${h} = ${s(9800 * h)} Pa. F = ${s(9800 * h)} × ${s(A)} = ${s(F)} N.`,
      },
      kp(F, [9800 * h, 9.8 * h * A]),
    );
  },
);

/** PHYS.8.2 — pressure depends on depth: rankings and reasoning. */
export const pressureDepth: Gen = mix(
  () => {
    const depths = until(
      () => [0.2, 0.4, 0.5, 0.6, 0.8, 0.9].sort(() => Math.random() - 0.5).slice(0, 3),
      (ds) => new Set(ds).size === 3,
    );
    return q(
      {
        key: `pd-rank-${depths.join("-")}`,
        prompt: "Rank the pressure at points A, B and C in the tank, greatest first.",
        visual: { kind: "phys-fluid", scene: "pressure", liquid: "water", points: depths.map((d, i) => ({ depth: d, label: LETTERS[i] })) },
        needsVisual: true,
        hint: "P = P₀ + ρgh: only the depth below the surface matters.",
        explain: "The deeper the point, the more water above it pushes down, so the deepest point has the greatest pressure.",
      },
      ranking(depths.map((d, i) => ({ name: LETTERS[i], value: d }))),
    );
  },
  () => {
    const depths = shuffle([0.2, 0.35, 0.5, 0.65, 0.8, 0.95]).slice(0, 3);
    const fast = Math.random() < 0.6;
    const target = fast ? Math.max(...depths) : Math.min(...depths);
    const name = LETTERS[depths.indexOf(target)];
    return q(
      {
        key: `pd-holes-${depths.join("-")}-${fast}`,
        prompt: `Water spurts from three holes in a tall tank. Which hole's water leaves ${fast ? "fastest" : "slowest"}?`,
        visual: { kind: "phys-fluid", scene: "pressure", holes: true, liquid: "water", points: depths.map((d, i) => ({ depth: d, label: LETTERS[i] })) },
        needsVisual: true,
        hint: "Greater depth → greater pressure → faster jet (v = √(2gh)).",
        explain: `${name} is ${fast ? "deepest" : "nearest the surface"}, so the pressure pushing water out is ${fast ? "greatest" : "smallest"} there and it leaves ${fast ? "fastest" : "slowest"}.`,
      },
      lab(name, [...LETTERS.slice(0, 3).filter((l) => l !== name), "All the same"]),
    );
  },
  () => {
    const h1 = pick([1, 2, 3]);
    const h2 = h1 + pick([1, 2, 5]);
    const dP = 9.8 * (h2 - h1);
    return q(
      {
        key: `pd-diff-${h1}-${h2}`,
        prompt: `How much greater is the water pressure at ${h2} m deep than at ${h1} m deep? Answer in kPa.`,
        visual: { kind: "phys-fluid", scene: "pressure", liquid: "water", points: [{ depth: 0.3, label: "P₁", depthLabel: h1 }, { depth: 0.85, label: "P₂", depthLabel: h2 }] },
        unit: "kPa",
        hint: "ΔP = ρgΔh. The atmosphere adds the same amount to both.",
        explain: `ΔP = 1000 × 9.8 × ${h2 - h1} = ${s(9800 * (h2 - h1))} Pa = ${s(dP)} kPa.`,
      },
      kp(dP, [9.8 * h2, 9.8 * (h1 + h2)]),
    );
  },
  () => {
    const items = [
      { p: "A tall thin tube and a wide tank are filled with water to the same height. Compare the pressure at their bottoms.", a: "Equal", w: ["Greater in the wide tank", "Greater in the thin tube", "It depends on the total weight of water"], e: "Pressure depends on depth (and ρ, g), not on the container's shape or the amount of liquid." },
      { p: "A diver goes from 5 m to 10 m deep. What happens to the absolute pressure on her?", a: "It increases, but less than doubles", w: ["It doubles", "It halves", "It stays the same"], e: "P = 101 kPa + ρgh: the water part doubles (49 → 98 kPa) but the atmosphere's 101 kPa doesn't, so P goes from 150 to 199 kPa." },
      { p: "Two tanks hold oil and water to the same depth. Where is the bottom pressure greater?", a: "In the water tank", w: ["In the oil tank", "They're equal", "Can't tell"], e: "Water is denser than oil, and P = ρgh." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `pd-concept-${i}`, prompt: it.p, hint: "P = P₀ + ρgh.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.8.3 — buoyancy (Archimedes' principle). */
export const buoyancy: Gen = mix(
  () => {
    const V = pick([0.001, 0.002, 0.005, 0.01, 0.02]);
    const [liquid, rho] = pick([
      ["water", 1000],
      ["oil", 800],
      ["seawater", 1025],
    ] as [string, number][]);
    const F = rho * V * 9.8;
    return q(
      {
        key: `buoy-F-${V}-${liquid}`,
        prompt: `An object of volume ${s(V)} m³ is fully submerged in ${liquid} (ρ = ${s(rho)} kg/m³). What is the buoyant force on it?`,
        unit: "N",
        hint: "F_b = ρ_fluid V_submerged g: the weight of the fluid pushed aside.",
        explain: `F_b = ${s(rho)} × ${s(V)} × 9.8 = ${s(F)} N.`,
      },
      kp(F, [rho * V, F * 2]),
    );
  },
  () => {
    const [m, V] = pick([
      [5, 0.002],
      [10, 0.004],
      [3, 0.001],
      [8, 0.003],
      [27, 0.01],
    ]);
    const W = 9.8 * m;
    const Fb = 9800 * V;
    return q(
      {
        key: `buoy-app-${m}-${V}`,
        prompt: `A ${m} kg rock with a volume of ${s(V)} m³ hangs from a spring scale, fully underwater. What does the scale read?`,
        visual: { kind: "phys-fluid", scene: "float", liquid: "water", objects: [{ submerged: 1, label: "rock", colour: "night", size: 0.8 }] },
        unit: "N",
        hint: "Scale reading = weight − buoyant force (the water holds up part of the rock).",
        explain: `W = ${s(W)} N; F_b = 1000 × ${s(V)} × 9.8 = ${s(Fb)} N; reading = ${s(W - Fb)} N.`,
      },
      kp(W - Fb, [W, Fb, W + Fb]),
    );
  },
  () => {
    const m = pick([200, 500, 800, 1500]);
    const askV = Math.random() < 0.5;
    return q(
      {
        key: `buoy-boat-${m}-${askV}`,
        prompt: `A ${s(m)} kg boat floats in fresh water. ${askV ? "What volume of water does it displace?" : "What is the buoyant force on it?"}`,
        unit: askV ? "m³" : "N",
        hint: "Floating: buoyant force = weight. And F_b = ρ_water V g.",
        explain: askV ? `ρV = m, so V = ${s(m)} ÷ 1000 = ${s(m / 1000)} m³.` : `F_b = mg = ${s(m)} × 9.8 = ${s(9.8 * m)} N.`,
      },
      kp(askV ? m / 1000 : 9.8 * m),
    );
  },
  () => {
    const items = [
      { p: "Equal-volume blocks of aluminum and lead are held fully underwater. Compare the buoyant forces on them.", a: "Equal", w: ["Greater on the lead", "Greater on the aluminum", "Zero on the lead (it sinks)"], e: "F_b = ρ_water V g depends only on the volume of water displaced, not on what the block is made of." },
      { p: "A fully submerged stone is lowered deeper in a lake. What happens to the buoyant force?", a: "It stays the same", w: ["It increases", "It decreases", "It becomes zero"], e: "Pressure grows with depth on both top and bottom; the difference (the buoyant force) stays ρVg." },
      { p: "Where does the buoyant force come from?", a: "The water pushes up on the bottom harder than down on the top", w: ["The object's own density", "Air trapped in the water", "Gravity pulling the water down"], e: "The bottom is deeper, so the pressure there is higher. The net push is upward." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `buoy-concept-${i}`, prompt: it.p, hint: "Archimedes: F_b = weight of displaced fluid = ρ_fluid V_sub g.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.8.3 — floating: fraction submerged = ρ_object ÷ ρ_fluid. */
export const floating: Gen = mix(
  () => {
    const f = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
    return q(
      {
        key: `fl-read-${f}`,
        prompt: "A block floats in water as shown. What is the block's density?",
        visual: { kind: "phys-fluid", scene: "float", liquid: "water", objects: [{ submerged: f, label: `${s(f * 100)}% under` }] },
        needsVisual: true,
        unit: "kg/m³",
        hint: "Floating: weight = buoyant force, so ρ_block V g = ρ_water V_sub g. The submerged fraction = ρ_block ÷ ρ_water.",
        explain: `${s(f * 100)}% under water means ρ = ${s(f)} × 1000 = ${s(f * 1000)} kg/m³.`,
      },
      kp(f * 1000, [(1 - f) * 1000, f * 100]),
    );
  },
  () => {
    const [name, rho] = pick([
      ["ice", 900],
      ["pine", 500],
      ["oak", 750],
      ["cork", 250],
      ["candle wax", 900],
      ["plastic", 600],
    ] as [string, number][]);
    const [liquid, rl] = pick([
      ["water", 1000],
      ["glycerin", 1250],
    ] as [string, number][]);
    const f = rho / rl;
    return q(
      {
        key: `fl-frac-${name}-${liquid}`,
        prompt: `A block of ${name} (ρ = ${rho} kg/m³) floats in ${liquid} (ρ = ${s(rl)} kg/m³). What percent of its volume is under the surface?`,
        unit: "%",
        hint: "Fraction submerged = ρ_object ÷ ρ_liquid.",
        explain: `${rho} ÷ ${s(rl)} = ${s(f)}, so ${s(f * 100)}% is under.`,
      },
      kp(f * 100, [100 - f * 100]),
    );
  },
  () => {
    const rho = pick([400, 500, 600, 800]);
    const V = pick([0.01, 0.02, 0.05]);
    const m = (1000 - rho) * V;
    return q(
      {
        key: `fl-load-${rho}-${V}`,
        prompt: `A ${s(V)} m³ raft of wood (ρ = ${rho} kg/m³) floats in water. What is the largest mass of cargo it can carry before the top goes under?`,
        unit: "kg",
        hint: "Fully submerged, the buoyant force is ρ_water V g. That must hold up the raft plus the cargo.",
        explain: `Max supported mass = 1000 × ${s(V)} = ${s(1000 * V)} kg. The raft is ${s(rho * V)} kg, so the cargo can be ${s(m)} kg.`,
      },
      kp(m, [1000 * V, rho * V]),
    );
  },
  () => {
    const items = [
      { p: "A floating block is moved from fresh water to denser salt water. What happens?", a: "It floats higher; the buoyant force stays the same", w: ["It floats lower; the buoyant force increases", "It floats higher; the buoyant force increases", "Nothing changes"], e: "Floating means F_b = weight (unchanged). Denser water needs less submerged volume to give that force." },
      { p: "Three equal-volume blocks float in water: A is 30% under, B 50%, C 80%. Which is heaviest?", a: "C", w: ["A", "B", "They weigh the same"], e: "Weight = buoyant force ∝ submerged volume. C displaces the most water, so it's heaviest (and densest)." },
      { p: "An object with density 900 kg/m³ is placed in oil (800 kg/m³). What happens?", a: "It sinks", w: ["It floats 90% submerged", "It floats with 80% under", "It floats at the surface"], e: "It's denser than oil, so even fully submerged the buoyant force can't hold it up." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q(
      {
        key: `fl-concept-${i}`,
        prompt: it.p,
        visual:
          i === 1
            ? {
                kind: "phys-fluid",
                scene: "float",
                liquid: "water",
                objects: [
                  { submerged: 0.3, label: "A" },
                  { submerged: 0.5, label: "B", colour: "tangerine" },
                  { submerged: 0.8, label: "C", colour: "berry" },
                ],
              }
            : NONE,
        hint: "A floating object displaces its own weight of liquid.",
        explain: it.e,
      },
      lab(it.a, it.w),
    );
  },
);

/** PHYS.8.3, PHYS.2.2 — Do it: forces on floating and submerged objects. */
export const fluidForcesDoIt: Gen = mix(
  () => {
    const w = rand(2, 5);
    return q(
      {
        key: `ffd-float-${w}`,
        prompt: `A duck decoy floats at rest. Its weight F_g is ${w} units. Draw the buoyant force F_b.`,
        speech: `A duck decoy floats at rest. Its weight is ${w} units. Draw the buoyant force.`,
        hint: "Floating at rest: forces balance.",
        explain: `F_b = ${w} units up, equal to the weight.`,
      },
      act({ kind: "phys-forceArrows", object: "🦆", directions: 4, maxSize: 6, given: [{ dir: 270, size: w, label: "F_g" }], arrows: [{ label: "F_b", answer: { dir: 90, size: w } }], check: "exact" }, w),
    );
  },
  () => {
    const w = rand(1, 3);
    const b = rand(w + 1, 6);
    return q(
      {
        key: `ffd-tied-${w}-${b}`,
        prompt: `A foam ball is tied to the bottom of a pool and held fully under. Its weight is ${w} units; the buoyant force is ${b} units. Draw the string's tension T.`,
        hint: "At rest, so the net force is zero. The buoyant force is bigger than the weight. Which way must the string pull?",
        explain: `T = ${b} − ${w} = ${b - w} units, pulling down.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          object: "⚽",
          directions: 4,
          maxSize: 6,
          given: [
            { dir: 270, size: w, label: "F_g" },
            { dir: 90, size: b, label: "F_b" },
          ],
          arrows: [{ label: "T", answer: { dir: 270, size: b - w } }],
          check: "net",
        },
        b - w,
      ),
    );
  },
  () => {
    const w = rand(3, 6);
    const b = rand(1, w - 1);
    return q(
      {
        key: `ffd-scale-${w}-${b}`,
        prompt: `A metal weight hangs from a spring scale, fully underwater and at rest. Its weight is ${w} units; the buoyant force is ${b}. Draw the scale's pull T.`,
        hint: "T + F_b = F_g.",
        explain: `T = ${w} − ${b} = ${w - b} units up. That's why things feel lighter underwater.`,
      },
      act(
        {
          kind: "phys-forceArrows",
          object: "box",
          surface: "ceiling",
          directions: 4,
          maxSize: 6,
          given: [
            { dir: 270, size: w, label: "F_g" },
            { dir: 90, size: b, label: "F_b" },
          ],
          arrows: [{ label: "T", answer: { dir: 90, size: w - b } }],
          check: "net",
        },
        w - b,
      ),
    );
  },
  () => {
    const w = rand(3, 6);
    const n = rand(1, 2);
    return q(
      {
        key: `ffd-sink-${w}-${n}`,
        prompt: `A stone (weight ${w} units) sinks through water, speeding up. The net force on it is ${n} unit${n > 1 ? "s" : ""} down (ignore drag). Draw the buoyant force F_b.`,
        hint: "F_b + F_g = net force. The stone is denser than water, so F_b is less than its weight.",
        explain: `F_b = ${w} − ${n} = ${w - n} units up.`,
      },
      act({ kind: "phys-forceArrows", object: "🪨", directions: 4, maxSize: 6, given: [{ dir: 270, size: w, label: "F_g" }], arrows: [{ label: "F_b", answer: { dir: 90, size: w - n } }], check: "net", net: { x: 0, y: -n } }, w - n),
    );
  },
);

/** PHYS.8.4 — continuity: A₁v₁ = A₂v₂. */
export const continuity: Gen = mix(
  () => {
    const [A1, A2] = pick([
      [4, 1],
      [6, 2],
      [3, 1],
      [8, 2],
      [5, 2],
      [9, 3],
    ]);
    const v1 = pick([1, 2, 3]);
    const v2 = (A1 * v1) / A2;
    return q(
      {
        key: `cont-v-${A1}-${A2}-${v1}`,
        prompt: `Water flows from the wide part of the pipe (area ${A1} cm²) into the narrow part (${A2} cm²). How fast is it moving in the narrow part?`,
        visual: { kind: "phys-fluid", scene: "pipe", widths: [Math.sqrt(A1), Math.sqrt(A2)], v: [v1, "?"], area: [`${A1} cm²`, `${A2} cm²`] },
        needsVisual: true,
        unit: "m/s",
        hint: "Water can't pile up: the volume per second A·v is the same everywhere. A₁v₁ = A₂v₂.",
        explain: `${A1} × ${v1} = ${A2} × v₂, so v₂ = ${s(v2)} m/s.`,
      },
      kp(v2, [(A2 * v1) / A1, v1]),
    );
  },
  () => {
    const r = pick([2, 3, 0.5]);
    const f = 1 / (r * r);
    const t = (x: number) => (x >= 1 ? `${s(x)} times as fast` : x === 0.25 ? "a quarter as fast" : "a ninth as fast");
    return q(
      {
        key: `cont-diam-${r}`,
        prompt: `A pipe's diameter ${r === 0.5 ? "halves" : r === 2 ? "doubles" : "triples"} along its length. How does the water's speed in the second part compare with the first?`,
        hint: "Area ∝ diameter², and v ∝ 1/A.",
        explain: `A changes by ${s(r)}² = ${s(r * r)}, so v changes by ${r > 1 ? `1/${s(r * r)}` : s(f)}: ${t(f)}.`,
      },
      lab(t(f), [t(1 / r), t(r), t(r * r), "the same speed"].filter((x) => x !== t(f))),
    );
  },
  () => {
    const A = pick([0.01, 0.02, 0.05]);
    const v = pick([2, 3, 4, 5]);
    const V = pick([0.6, 1.2, 3, 6]);
    const Q = A * v;
    const askT = Math.random() < 0.5;
    return q(
      {
        key: `cont-Q-${A}-${v}-${V}-${askT}`,
        prompt: askT
          ? `Water flows at ${v} m/s through a hose of cross-section ${s(A)} m². How long does it take to fill a ${s(V)} m³ tank? Round to 1 decimal place if needed.`
          : `Water flows at ${v} m/s through a pipe of cross-section ${s(A)} m². What is the volume flow rate?`,
        unit: askT ? "s" : "m³/s",
        hint: "Volume flow rate Q = Av." + (askT ? " Time = volume ÷ Q." : ""),
        explain: `Q = ${s(A)} × ${v} = ${s(Q)} m³/s.${askT ? ` t = ${s(V)} ÷ ${s(Q)} = ${s(rd(V / Q, 1))} s.` : ""}`,
      },
      kp(askT ? rd(V / Q, 1) : Q),
    );
  },
);

/** PHYS.8.4 — Bernoulli's equation. */
export const bernoulli: Gen = mix(
  () => {
    const wide = Math.random() < 0.5;
    return q(
      {
        key: `bern-where-${wide}`,
        prompt: `Water flows through this horizontal pipe. Where is the ${wide ? "pressure higher" : "pressure lower"}?`,
        visual: { kind: "phys-fluid", scene: "pipe", widths: [2, 1], pressure: ["P₁", "P₂"] },
        needsVisual: true,
        hint: "Continuity: the narrow part is faster. Bernoulli: where a horizontal flow is faster, the pressure is lower.",
        explain: `The water speeds up in the narrow part, so the pressure there is lower. The ${wide ? "wide" : "narrow"} part has the ${wide ? "higher" : "lower"} pressure.`,
      },
      lab(wide ? "In the wide part (P₁)" : "In the narrow part (P₂)", [wide ? "In the narrow part (P₂)" : "In the wide part (P₁)", "The same everywhere", "Can't tell without the flow speed"]),
    );
  },
  () => {
    const v1 = pick([1, 2, 3]);
    const ratio = pick([2, 3]);
    const v2 = v1 * ratio;
    const P1 = pick([150, 200, 250]);
    const dP = (500 * (v2 * v2 - v1 * v1)) / 1000;
    const askP2 = Math.random() < 0.5;
    return q(
      {
        key: `bern-calc-${v1}-${ratio}-${P1}-${askP2}`,
        prompt: `Water (ρ = 1000 kg/m³) flows at ${v1} m/s in a horizontal pipe where the pressure is ${P1} kPa. The pipe narrows to 1/${ratio} of the area. ${askP2 ? "What is the pressure in the narrow part?" : "By how much does the pressure drop?"} (in kPa)`,
        visual: { kind: "phys-fluid", scene: "pipe", widths: [Math.sqrt(ratio), 1], v: [v1, v2], pressure: [P1, "?"] },
        unit: "kPa",
        hint: "Continuity gives v₂. Then Bernoulli (same height): P₁ + ½ρv₁² = P₂ + ½ρv₂².",
        explain: `v₂ = ${ratio} × ${v1} = ${v2} m/s. ΔP = ½(1000)(${v2 * v2} − ${v1 * v1}) = ${s(dP * 1000)} Pa = ${s(dP)} kPa.${askP2 ? ` P₂ = ${P1} − ${s(dP)} = ${s(P1 - dP)} kPa.` : ""}`,
      },
      kp(askP2 ? P1 - dP : dP, askP2 ? [P1 + dP, P1] : [(500 * (v2 - v1) * (v2 - v1)) / 1000, dP * 2]),
    );
  },
  () => {
    const h = pick([2, 5, 10]);
    const P1 = pick([200, 250, 300]);
    const P2 = P1 - 9.8 * h;
    return q(
      {
        key: `bern-height-${h}-${P1}`,
        prompt: `Water flows at a steady speed through a pipe of constant width that rises ${h} m. The pressure at the bottom is ${P1} kPa. What is it at the top?`,
        unit: "kPa",
        hint: "Same area → same speed, so Bernoulli reduces to P₁ = P₂ + ρgh.",
        explain: `ρgh = 1000 × 9.8 × ${h} = ${s(9.8 * h)} kPa, so P₂ = ${P1} − ${s(9.8 * h)} = ${s(P2)} kPa.`,
      },
      kp(P2, [P1, P1 + 9.8 * h]),
    );
  },
  () => {
    const items = [
      { p: "Why does a shower curtain blow inward when the shower is on?", a: "Moving air and water inside lower the pressure there", w: ["The water pushes the curtain", "Hot air is heavier", "Static electricity"], e: "Faster flow means lower pressure (Bernoulli). The still air outside pushes the curtain in." },
      { p: "Air flows faster over the top of a wing than under it. What does this mean for the wing?", a: "Higher pressure below than above, so there's lift", w: ["Lower pressure below, pushing it down", "Equal pressures, no force", "The air pushes it backward only"], e: "Faster air on top has lower pressure; the pressure difference gives an upward force." },
      { p: "Bernoulli's equation is a statement of which conservation law?", a: "Conservation of energy", w: ["Conservation of momentum", "Conservation of mass", "Conservation of charge"], e: "P + ½ρv² + ρgh is the energy per volume of the fluid. (Continuity, A₁v₁ = A₂v₂, is conservation of mass.)" },
      { p: "During a storm, strong wind blows over a house's flat roof. Why can the roof lift off?", a: "Pressure above the roof drops below the pressure inside", w: ["The wind pushes the roof up from below", "The house gets lighter", "Rain makes the roof heavier"], e: "Fast-moving air above means lower pressure. The higher pressure of the still air inside pushes up." },
    ];
    const i = rand(0, items.length - 1);
    const it = items[i];
    return q({ key: `bern-concept-${i}`, prompt: it.p, hint: "P + ½ρv² + ρgh is constant along a streamline: faster flow → lower pressure.", explain: it.e }, lab(it.a, it.w));
  },
);

/** PHYS.8.4 — Torricelli: water leaving a hole at depth h has v = √(2gh). */
export const torricelli: Gen = mix(
  () => {
    const k = rand(2, 10);
    const h = 0.1 * k * k;
    const askH = Math.random() < 0.4;
    return q(
      {
        key: `tor-v-${k}-${askH}`,
        prompt: askH ? `Water leaves a small hole in a tank at ${s(1.4 * k)} m/s. How far below the water surface is the hole?` : `A small hole is ${s(h)} m below the water surface of a large open tank. How fast does the water come out?`,
        visual: { kind: "phys-fluid", scene: "pressure", holes: true, liquid: "water", points: [{ depth: 0.7, label: askH ? "" : "v = ?", depthLabel: askH ? "?" : h }] },
        unit: askH ? "m" : "m/s",
        hint: "Bernoulli between the surface (at rest, P_atm) and the hole (P_atm): ρgh = ½ρv², so v = √(2gh), like a free fall from height h.",
        explain: askH ? `h = v² ÷ 2g = ${s(1.96 * k * k)} ÷ 19.6 = ${s(h)} m.` : `v = √(2 × 9.8 × ${s(h)}) = ${s(1.4 * k)} m/s.`,
      },
      kp(askH ? h : 1.4 * k),
    );
  },
  () => {
    const f = pick([4, 9, 0.25]);
    const t = (x: number) => (x === 1 ? "the same speed" : x >= 1 ? `${s(x)} times as fast` : x === 0.5 ? "half as fast" : x === 0.25 ? "a quarter as fast" : `${s(x)} times as fast`);
    return q(
      {
        key: `tor-ratio-${f}`,
        prompt: `Hole B is ${f === 0.25 ? "a quarter as deep" : `${f} times as deep`} below the surface as hole A. How does the speed of water from B compare with A?`,
        hint: "v = √(2gh), so v ∝ √h.",
        explain: `√${s(f)} = ${s(Math.sqrt(f))}: ${t(Math.sqrt(f))}.`,
      },
      lab(t(Math.sqrt(f)), [t(f), t(f * f), "the same speed", t(1 / Math.sqrt(f))].filter((x) => x !== t(Math.sqrt(f)))),
    );
  },
  () => {
    const k = pick([2, 3, 5]);
    const h = 0.1 * k * k;
    const A = pick([1, 2, 5]);
    const Q = 1.4 * k * A;
    return q(
      {
        key: `tor-Q-${k}-${A}`,
        prompt: `A hole of area ${A} cm² is ${s(h)} m below the water surface of a big tank. What is the volume flow rate out of it, in cm³/s?`,
        unit: "cm³/s",
        hint: "First v = √(2gh) in m/s; change it to cm/s (× 100). Then Q = Av.",
        explain: `v = ${s(1.4 * k)} m/s = ${s(140 * k)} cm/s, so Q = ${A} × ${s(140 * k)} = ${s(rd(Q * 100, 0))} cm³/s.`,
      },
      kp(rd(Q * 100, 0), [rd(Q, 1), rd(Q * 10, 0)]),
    );
  },
);

/** PHYS.8.1, PHYS.8.3 — Do it: sort objects by where they float. */
export const floatSort: Gen = mix(
  () => {
    const pool = [
      { label: "Cork, 240 kg/m³", bin: 0 },
      { label: "Pine, 500 kg/m³", bin: 0 },
      { label: "Oak, 750 kg/m³", bin: 0 },
      { label: "Styrofoam, 50 kg/m³", bin: 0 },
      { label: "Ice, 920 kg/m³", bin: 1 },
      { label: "Candle wax, 900 kg/m³", bin: 1 },
      { label: "Apple, 850 kg/m³", bin: 1 },
      { label: "Polypropylene, 905 kg/m³", bin: 1 },
      { label: "Rubber, 1100 kg/m³", bin: 2 },
      { label: "Aluminum, 2700 kg/m³", bin: 2 },
      { label: "Bone, 1900 kg/m³", bin: 2 },
      { label: "Glass, 2500 kg/m³", bin: 2 },
    ];
    const picks = until(
      () => shuffle(pool.map((_, i) => i)).slice(0, 6),
      (ix) => [0, 1, 2].every((b) => ix.some((i) => pool[i].bin === b)),
    );
    return q(
      {
        key: `fs-sort-${[...picks].sort((a, b) => a - b).join("-")}`,
        prompt: "Oil has a density of 800 kg/m³ and water 1000 kg/m³. Sort the solids.",
        hint: "A solid floats in a liquid that is denser than it.",
        explain: "Below 800: floats in both. Between 800 and 1000: floats in water but sinks in oil. Above 1000: sinks in both.",
      },
      act({ kind: "sort", bins: ["Floats in oil and water", "Floats in water only", "Sinks in both"], items: picks.map((i) => pool[i]) }, picks.length),
    );
  },
  () => {
    const [a, b] = pick([
      [600, 1200],
      [300, 1000],
      [750, 1250],
      [200, 800],
      [800, 1000],
      [900, 1200],
      [600, 800],
    ]);
    const f = a / b;
    return q(
      {
        key: `fs-frac-${a}-${b}`,
        prompt: `A ${a} kg/m³ block floats in a liquid of density ${b} kg/m³. What fraction of it is submerged?`,
        visual: { kind: "phys-fluid", scene: "float", objects: [{ submerged: f, label: `${a} kg/m³` }], liquid: `${b} kg/m³` },
        hint: "Fraction under = ρ_block ÷ ρ_liquid.",
        explain: `${a} ÷ ${b} = ${s(f)}.`,
      },
      kp(f, [1 - f]),
    );
  },
);
