/**
 * Question generators for ages 14–17: high-school geometry, trigonometry and
 * the unit circle, complex numbers, vectors and matrices, probability and
 * statistics. Worlds and levels are assembled in ./ages14to17.ts.
 *
 * Decimal answers are rounded with Math.round(x · 10) / 10 (or 100) so the
 * number on screen is always the exact rounded value.
 */
import { fmt, labelChoices, pick, rand, shuffle } from "../questions";
import type { Colour, Mark, Question, ShapeName, Visual } from "../types";

/* =================================================================== helpers */

type Answer = Pick<Question, "answer" | "input" | "choices" | "labels" | "keypadExtra">;

const NONE: Visual = { kind: "none" };

/** Remove floating-point noise. */
const clean = (x: number) => Math.round(x * 1e6) / 1e6;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
/** A number as text, with a real minus sign. */
const ds = (x: number) => fmt(clean(x));
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const RAD = Math.PI / 180;
const sinD = (d: number) => Math.sin(d * RAD);
const cosD = (d: number) => Math.cos(d * RAD);
const tanD = (d: number) => Math.tan(d * RAD);
const toDeg = (r: number) => r / RAD;

/** A random whole number in [min, max] that isn't 0. */
function nz(min: number, max: number): number {
  let v = 0;
  while (v === 0) v = rand(min, max);
  return v;
}

/** " + 3" or " − 3", for writing expressions. */
const plus = (v: number) => (v < 0 ? ` − ${ds(-v)}` : ` + ${ds(v)}`);

/** Pick a question kind: one of `only` when given, else 0..n−1. */
const kindOf = (n: number, only?: number[]) => (only && only.length ? pick(only) : rand(0, n - 1));

/** Capitalise the first letter. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a" or "an". */
const art = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");

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

const yesNo = (yes: boolean) => label(yes ? "Yes" : "No", [yes ? "No" : "Yes"]);

/** A fraction in simplest form: "3/5", "−1/2", "4". */
function frac(n: number, d: number): string {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  const s = a < 0 ? "−" : "";
  return b === 1 ? `${s}${Math.abs(a)}` : `${s}${Math.abs(a)}/${b}`;
}

/** n/d · π as text: "π/3", "2π/3", "π", "0", "−π/4". */
function piStr(n: number, d: number): string {
  if (n === 0) return "0";
  const g = gcd(Math.abs(n), d);
  const a = n / g;
  const b = d / g;
  const s = a < 0 ? "−" : "";
  const top = Math.abs(a) === 1 ? "π" : `${Math.abs(a)}π`;
  return b === 1 ? `${s}${top}` : `${s}${top}/${b}`;
}

/** Degrees as a multiple of π. */
const radStr = (deg: number) => piStr(deg, 180);

/** Turn on-screen math text into words Can can say out loud. */
function say(s: string): string {
  return s
    .replace(/sin⁻¹/g, "inverse sine of ")
    .replace(/cos⁻¹/g, "inverse cosine of ")
    .replace(/tan⁻¹/g, "inverse tangent of ")
    .replace(/\b(sin|cos|tan)\(/g, (_, f) => `${{ sin: "sine", cos: "cosine", tan: "tangent" }[f as "sin"]} of (`)
    .replace(/\bsin\b/g, "sine")
    .replace(/\bcos\b/g, "cosine")
    .replace(/\btan\b/g, "tangent")
    .replace(/⟨([^⟩]*)⟩/g, "vector $1")
    .replace(/‖([^‖]+)‖/g, "the length of $1")
    .replace(/\|([^|]+)\|/g, "the absolute value of $1")
    .replace(/(\d*)π\/(\d+)/g, (_, n, d) => `${n ? `${n} ` : ""}pi over ${d}`)
    .replace(/√(\d+)/g, "root $1")
    .replace(/(\d+)\/(\d+)/g, "$1 over $2")
    .replace(/\//g, " over ")
    .replace(/²/g, " squared")
    .replace(/³/g, " cubed")
    .replace(/[⁰¹⁴⁵⁶⁷⁸⁹]+/g, (m) => ` to the power ${[...m].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("")}`)
    .replace(/θ/g, "theta")
    .replace(/°/g, " degrees")
    .replace(/±/g, " plus or minus ")
    .replace(/ − /g, " minus ")
    .replace(/ \+ /g, " plus ")
    .replace(/ of\(/g, " of (")
    .replace(/−/g, "negative ")
    .replace(/[×·]/g, " times ")
    .replace(/≈/g, " is about ")
    .replace(/ = \?/g, " equals what")
    .replace(/=/g, " equals ")
    .replace(/∠/g, "angle ")
    .replace(/△/g, "triangle ")
    .replace(/≅/g, " is congruent to ")
    .replace(/∼/g, " is similar to ")
    .replace(/∥/g, " is parallel to ")
    .replace(/⊥/g, " is perpendicular to ")
    .replace(/′/g, " prime")
    .replace(/π/g, " pi ")
    .replace(/%/g, " percent")
    .replace(/\s+/g, " ")
    .replace(/ ([,.?!])/g, "$1")
    .trim();
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Superscript digits: 5 → "⁵". */
const sup = (e: number) => [...String(e)].map((c) => SUP[+c]).join("");

/** Ordered pair as text: (3, −2). */
const pt = (x: number, y: number) => `(${ds(x)}, ${ds(y)})`;
/** Ordered pair, out loud. */
const sayPt = (x: number, y: number) => `${say(ds(x))} comma ${say(ds(y))}`;

/** Coordinate grid with labelled points. */
const grid = (points: { x: number; y: number; label: string }[], size = 10): Visual => ({ kind: "grid", size, quadrants: 4, points });

/** Pythagorean triples (legs a, b and hypotenuse c). */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [12, 16, 20],
  [20, 21, 29],
  [9, 40, 41],
  [15, 20, 25],
  [10, 24, 26],
  [12, 35, 37],
];

/** A triple with its legs in either order. */
function triple(maxC = 41): [number, number, number] {
  const [a, b, c] = pick(TRIPLES.filter((t) => t[2] <= maxC));
  return rand(0, 1) ? [a, b, c] : [b, a, c];
}

type Tri3 = [Mark, Mark, Mark];

/** A triangle's angles in degrees from its sides (A opposite a, and so on). */
function sssAngles(a: number, b: number, c: number): [number, number, number] {
  const A = toDeg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
  const B = toDeg(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
  return [A, B, 180 - A - B];
}

/** The angles of the triangle with sides a and b around angle C. */
function sasAngles(a: number, b: number, C: number): [number, number, number] {
  const [A, B] = sssAngles(a, b, Math.sqrt(a * a + b * b - 2 * a * b * cosD(C)));
  return [A, B, C];
}

/** A triangle drawn to its true shape, with optional side and angle labels. */
function triPic(shape: [number, number, number], sides?: Tri3, angles?: Tri3, extra: { names?: [string, string, string]; unit?: string } = {}): Visual {
  return { kind: "triangle", shape, ...(sides ? { sides } : {}), ...(angles ? { angles } : {}), ...extra };
}

/**
 * A central angle of `deg` degrees at O, from A to B, with the radius OA labelled. When the angle is over 180°
 * it can't be marked at O, so the arc carries the angle and `arc` is dropped.
 */
function sectorPic(deg: number, radius: Mark, angle: Mark, arc: Mark, unit?: string): Visual {
  const a0 = 90 - deg / 2;
  const big = deg > 180;
  return {
    kind: "circleparts",
    points: [
      { name: "A", at: a0 },
      { name: "B", at: a0 + deg },
    ],
    segments: [{ from: "O", to: "A", label: radius }, { from: "O", to: "B" }],
    angles: big ? [] : [{ at: "O", from: "A", to: "B", label: angle }],
    arcs: [{ from: "A", to: "B", label: big ? (typeof angle === "number" ? angle : arc) : arc }],
    ...(unit ? { unit } : {}),
  };
}

/* ========================================== A. Geometry basics & transformations */

type LinesType = "parallel" | "perpendicular" | "intersecting" | "point" | "line" | "ray" | "segment";
const DEFS: { term: string; def: string; near: string; pic?: LinesType }[] = [
  { term: "circle", def: "All points in a plane at one distance from a center", near: "radius" },
  { term: "parallel lines", def: "Lines in one plane that never meet", near: "perpendicular lines", pic: "parallel" },
  { term: "perpendicular lines", def: "Lines that meet at a right angle", near: "parallel lines", pic: "perpendicular" },
  { term: "line segment", def: "Part of a line between two endpoints", near: "ray", pic: "segment" },
  { term: "ray", def: "Part of a line with one endpoint, going on forever one way", near: "line segment", pic: "ray" },
  { term: "angle", def: "Two rays that share an endpoint", near: "ray" },
  { term: "midpoint", def: "The point that splits a segment into two equal parts", near: "perpendicular bisector" },
  { term: "perpendicular bisector", def: "A line through a segment's midpoint at a right angle to it", near: "angle bisector" },
  { term: "angle bisector", def: "A ray that splits an angle into two equal angles", near: "perpendicular bisector" },
  { term: "chord", def: "A segment joining two points on a circle", near: "radius" },
  { term: "arc", def: "A connected piece of a circle between two of its points", near: "chord" },
  { term: "radius", def: "A segment from a circle's center to a point on it", near: "chord" },
];

const DEF_TRUE_FALSE: [string, boolean][] = [
  ["A ray has exactly one endpoint.", true],
  ["A line segment goes on forever in both directions.", false],
  ["Perpendicular lines meet at a 90° angle.", true],
  ["Two parallel lines can cross once.", false],
  ["Every point on a circle is the same distance from its center.", true],
  ["A chord always passes through the center.", false],
  ["A midpoint is equally far from both endpoints.", true],
  ["An angle bisector makes two angles of different sizes.", false],
  ["Point, line and plane are left undefined in geometry.", true],
  ["A radius is twice as long as a diameter.", false],
];

/** HSG-CO.A.1 — precise definitions of angle, circle, perpendicular and parallel lines, segment. */
export function geoDefinitions(): Question {
  const kind = rand(0, 4);
  if (kind === 4) {
    const figs = [
      ["segment", "a line segment", "two endpoints"],
      ["ray", "a ray", "one endpoint, going on forever one way"],
      ["line", "a line", "no endpoints, going on forever both ways"],
      ["parallel", "two parallel lines", "the same slope, so they never meet"],
      ["perpendicular", "two perpendicular lines", "a right angle where they meet"],
    ] as const;
    const i = rand(0, figs.length - 1);
    const size = rand(6, 8);
    const [figure, name, fact] = figs[i];
    return {
      key: `def-draw-${figure}-${size}`,
      prompt: `Draw ${name}.`,
      speech: `Tap grid points to draw ${name}.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawFigure", figure, size },
      answer: i,
      hint: `Think about the definition: ${fact}.`,
      explain: `${cap(name)} has ${fact}.`,
    };
  }
  if (kind <= 1) {
    const i = rand(0, DEFS.length - 1);
    const d = DEFS[i];
    const others = shuffle(DEFS.filter((o) => o.term !== d.term && o.term !== d.near));
    if (kind === 0) {
      return {
        key: `def-term-${i}`,
        prompt: `${d.def}. What is it called?`,
        speech: `${d.def}. What is it called?`,
        visual: NONE,
        ...label(d.term, [d.near, others[0].term, others[1].term]),
        hint: "Picture it. Does it have endpoints? Does it curve? Where does it meet other lines?",
        explain: `That's ${art(d.term)} ${d.term}: ${d.def.charAt(0).toLowerCase()}${d.def.slice(1)}.`,
      };
    }
    const nearDef = DEFS.find((o) => o.term === d.near)!.def;
    return {
      key: `def-def-${i}`,
      prompt: `Which is the definition of ${art(d.term)} ${d.term}?`,
      speech: `Which is the precise definition of ${art(d.term)} ${d.term}?`,
      visual: d.pic ? { kind: "lines", type: d.pic } : d.term === "circle" ? { kind: "shape", shape: "circle" } : NONE,
      ...label(d.def, [nearDef, others[0].def, others[1].def]),
      hint: "A good definition fits every example of the term and nothing else.",
      explain: `${art(d.term) === "an" ? "An" : "A"} ${d.term}: ${d.def.charAt(0).toLowerCase()}${d.def.slice(1)}.`,
    };
  }
  if (kind === 2) {
    const i = rand(0, DEF_TRUE_FALSE.length - 1);
    const [text, yes] = DEF_TRUE_FALSE[i];
    return {
      key: `def-tf-${i}`,
      prompt: `True or false? ${text}`,
      speech: `True or false? ${say(text)}`,
      visual: NONE,
      ...label(yes ? "True" : "False", [yes ? "False" : "True"]),
      hint: "Think of the exact definition, then test the statement against it.",
      explain: `${yes ? "True" : "False"}. ${text.replace(/\.$/, "")} ${yes ? "fits" : "doesn't fit"} the definition.`,
    };
  }
  const ans = pick(["point", "line", "plane"]);
  return {
    key: `def-undef-${ans}`,
    prompt: "Which is an undefined term in geometry?",
    speech: "Geometry starts with a few terms it never defines. Which one is undefined?",
    visual: NONE,
    ...label(ans, ["line segment", "ray", "angle", "circle", "midpoint"]),
    hint: "Everything else is built from the undefined terms: point, line, plane.",
    explain: `Point, line and plane are undefined. Segments, rays, angles and circles are all defined using them.`,
  };
}

type Map2 = { name: string; f: (x: number, y: number) => [number, number] };
const REFLECTIONS: Map2[] = [
  { name: "reflect over the x-axis", f: (x, y) => [x, -y] },
  { name: "reflect over the y-axis", f: (x, y) => [-x, y] },
  { name: "reflect over y = x", f: (x, y) => [y, x] },
  { name: "reflect over y = −x", f: (x, y) => [-y, -x] },
];
const ROTATIONS: Map2[] = [
  { name: "rotate 90° counterclockwise", f: (x, y) => [-y, x] },
  { name: "rotate 180°", f: (x, y) => [-x, -y] },
  { name: "rotate 90° clockwise", f: (x, y) => [y, -x] },
];

/** A point off the axes and off the lines y = ±x. */
function offPoint(max = 5): [number, number] {
  for (;;) {
    const x = nz(-max, max);
    const y = nz(-max, max);
    if (Math.abs(x) !== Math.abs(y)) return [x, y];
  }
}

/** HSG-CO.A.2, A.4, A.5 — transformations as functions on points; translate, reflect, rotate, compose. */
export function geoTransformations(): Question {
  const kind = rand(0, 5);
  const [x, y] = offPoint();
  if (kind === 0) {
    const a = nz(-4, 4);
    const b = nz(-4, 4);
    const rule = `(x, y) → (x${plus(a)}, y${plus(b)})`;
    return {
      key: `tr-move-${x}-${y}-${a}-${b}`,
      prompt: `Translate A${pt(x, y)} by ${rule}. Where is A′?`,
      speech: `Translate point A at ${sayPt(x, y)} with the rule x ${say(plus(a))}, y ${say(plus(b))}. Where does A land?`,
      visual: grid([{ x, y, label: "A" }]),
      ...label(pt(x + a, y + b), [pt(x - a, y - b), pt(x + b, y + a), pt(x + a, y - b), pt(x - a, y + b)]),
      hint: "A translation is a function: add the same amounts to every x and every y.",
      explain: `x: ${ds(x)}${plus(a)} = ${ds(x + a)}, y: ${ds(y)}${plus(b)} = ${ds(y + b)}. A′ is ${pt(x + a, y + b)}.`,
    };
  }
  if (kind === 1 || kind === 2) {
    const list = kind === 1 ? REFLECTIONS : ROTATIONS;
    const i = rand(0, list.length - 1);
    const m = list[i];
    const [u, v] = m.f(x, y);
    const wrong = [...REFLECTIONS, ...ROTATIONS].filter((o) => o !== m).map((o) => pt(...o.f(x, y)));
    return {
      key: `tr-${kind}-${i}-${x}-${y}`,
      prompt: `${m.name.charAt(0).toUpperCase()}${m.name.slice(1)}${kind === 2 ? " about the origin" : ""}: A${pt(x, y)} → ?`,
      speech: `${cap(say(m.name))}${kind === 2 ? " about the origin" : ""}. Where does A at ${sayPt(x, y)} go?`,
      visual: grid([{ x, y, label: "A" }]),
      ...label(pt(u, v), wrong),
      hint:
        kind === 1
          ? "Over the x-axis flip y's sign; over the y-axis flip x's sign; over y = x swap them."
          : "90° counterclockwise: (x, y) → (−y, x). 180°: flip both signs.",
      explain: `${m.name.charAt(0).toUpperCase()}${m.name.slice(1)} sends ${pt(x, y)} to ${pt(u, v)}.`,
    };
  }
  if (kind === 3) {
    const all = [...REFLECTIONS, ...ROTATIONS];
    const i = rand(0, all.length - 1);
    const m = all[i];
    const [u, v] = m.f(x, y);
    return {
      key: `tr-which-${i}-${x}-${y}`,
      prompt: `A${pt(x, y)} maps to A′${pt(u, v)}. Which transformation?`,
      speech: `A at ${sayPt(x, y)} maps to A prime at ${sayPt(u, v)}. Which transformation did that? Rotations are about the origin.`,
      visual: grid([
        { x, y, label: "A" },
        { x: u, y: v, label: "A′" },
      ]),
      needsVisual: false,
      ...label(m.name, all.filter((o) => o !== m).map((o) => o.name)),
      hint: "Did the coordinates swap? Did a sign flip? Test each rule on A.",
      explain: `${m.name.charAt(0).toUpperCase()}${m.name.slice(1)}: ${pt(x, y)} → ${pt(u, v)}.`,
    };
  }
  if (kind === 4) {
    const a = nz(-5, 5);
    const b = nz(-5, 5);
    const k = rand(2, 4);
    const rigid = [`(x, y) → (x${plus(a)}, y${plus(b)})`, "(x, y) → (−x, y)", "(x, y) → (y, −x)", "(x, y) → (−y, −x)", "(x, y) → (x, −y)"];
    const stretch = [`(x, y) → (${k}x, y)`, `(x, y) → (x, ${k}y)`, `(x, y) → (${k}x, ${k}y)`, "(x, y) → (x + y, y)"];
    const askRigid = rand(0, 1) === 1;
    const correct = pick(askRigid ? rigid : stretch);
    return {
      key: `tr-rigid-${askRigid}-${correct}`,
      prompt: askRigid ? "Which rule is a rigid motion?" : "Which rule is NOT a rigid motion?",
      speech: askRigid
        ? "A rigid motion keeps every length and angle the same. Which rule is a rigid motion?"
        : "A rigid motion keeps every length and angle the same. Which rule is not a rigid motion?",
      visual: NONE,
      ...label(correct, askRigid ? stretch : rigid),
      hint: "Try two points 1 apart. Does the rule keep them 1 apart? Multiplying a coordinate stretches.",
      explain: askRigid
        ? `${correct} only slides, flips or turns, so lengths and angles stay the same.`
        : `${correct} stretches the plane, so lengths change. It isn't rigid.`,
    };
  }
  const yAxis = rand(0, 1) === 1;
  const a = nz(-4, 4);
  const b = nz(-4, 4);
  const R = yAxis ? REFLECTIONS[1] : REFLECTIONS[0];
  const Other = yAxis ? REFLECTIONS[0] : REFLECTIONS[1];
  const T = (p: number, q: number): [number, number] => [p + a, q + b];
  const right = T(...R.f(x, y));
  return {
    key: `tr-combo-${yAxis}-${x}-${y}-${a}-${b}`,
    prompt: `${R.name.charAt(0).toUpperCase()}${R.name.slice(1)}, THEN move by (${ds(a)}, ${ds(b)}). A${pt(x, y)} → ?`,
    speech: `First ${say(R.name)}. Then translate ${say(ds(a))} across and ${say(ds(b))} up. Where does A at ${sayPt(x, y)} end up?`,
    visual: grid([{ x, y, label: "A" }]),
    ...label(pt(...right), [pt(...R.f(...T(x, y))), pt(...T(x, y)), pt(...R.f(x, y)), pt(...T(...Other.f(x, y)))]),
    hint: "Do the steps in order. Reflect A first, then translate the result.",
    explain: `Reflect: ${pt(x, y)} → ${pt(...R.f(x, y))}. Then translate: → ${pt(...right)}.`,
  };
}

const SYM: { name: string; shape: ShapeName; lines: number; turn: number }[] = [
  { name: "equilateral triangle", shape: "triangle", lines: 3, turn: 120 },
  { name: "square", shape: "square", lines: 4, turn: 90 },
  { name: "regular pentagon", shape: "pentagon", lines: 5, turn: 72 },
  { name: "regular hexagon", shape: "hexagon", lines: 6, turn: 60 },
  { name: "regular octagon", shape: "octagon", lines: 8, turn: 45 },
  { name: "rectangle", shape: "rectangle", lines: 2, turn: 180 },
  { name: "rhombus", shape: "rhombus", lines: 2, turn: 180 },
  { name: "parallelogram", shape: "parallelogram", lines: 0, turn: 180 },
  { name: "isosceles trapezoid", shape: "trapezoid", lines: 1, turn: 360 },
];

/** HSG-CO.A.3 — rotations and reflections that carry a polygon onto itself. */
export function geoSymmetry(): Question {
  const kind = rand(0, 5);
  if (kind === 5) {
    const t = rand(0, 3);
    const w = rand(1, 3);
    const h = rand(2, 6);
    const shapes: [string, { x: number; y: number }[]][] = [
      ["isosceles triangle", [{ x: 1, y: 1 }, { x: 1 + 2 * w, y: 1 }, { x: 1 + w, y: 1 + h }]],
      ["kite", [{ x: 1 + w, y: 1 }, { x: 1 + 2 * w, y: 3 }, { x: 1 + w, y: 3 + Math.min(h, 5) }, { x: 1, y: 3 }]],
      ["isosceles trapezoid", [{ x: 1, y: 1 }, { x: 3 + 2 * Math.min(w, 2), y: 1 }, { x: 2 + 2 * Math.min(w, 2), y: 1 + Math.min(h, 4) }, { x: 2, y: 1 + Math.min(h, 4) }]],
      ["arrow", [{ x: 1, y: 1 }, { x: 1 + w, y: 1 + h }, { x: 1 + 2 * w, y: 1 }, { x: 1 + w, y: 2 }]],
    ];
    const [name, points] = shapes[t];
    return {
      key: `sym-fold-${t}-${w}-${h}`,
      prompt: `Draw a line of symmetry on this ${name}.`,
      speech: `Tap two points to draw a line that folds this ${name} onto itself.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "symmetryLine", points, size: 8 },
      answer: t,
      hint: "A line of symmetry passes through the middle so each corner lands on a matching corner.",
      explain: `The fold line runs through the ${name}'s middle; a reflection over it maps the shape onto itself.`,
    };
  }
  if (kind === 4) {
    const t = rand(0, 2);
    if (t === 0) {
      const area = pick([4, 9, 16, 2, 5, 8, 10]);
      return {
        key: `sym-draw-sq-${area}`,
        prompt: `Draw a square with an area of ${area} squares. Then count its lines of symmetry.`,
        speech: `Draw a square with an area of ${area} grid squares. Tap its corners. A square has the most symmetry of any quadrilateral.`,
        visual: NONE,
        input: "activity",
        activity: { kind: "drawShape", size: 8, sides: 4, rightAngles: 4, equalSides: true, area },
        answer: area,
        hint: Number.isInteger(Math.sqrt(area)) ? `Each side is √${area} = ${Math.sqrt(area)} units.` : "The square has to be tilted: try sides that go across and up, like 1 across and 2 up.",
        explain: `A square with area ${area} has 4 lines of symmetry (2 diagonals, 2 midlines) and 90° turn symmetry.`,
      };
    }
    if (t === 1) {
      const area = pick([6, 12, 14, 15, 21]);
      return {
        key: `sym-draw-rect-${area}`,
        prompt: `Draw a rectangle with an area of ${area} squares. How many lines of symmetry does it have?`,
        speech: `Draw a rectangle with an area of ${area} grid squares by tapping its corners. Think about how many lines of symmetry it has.`,
        visual: NONE,
        input: "activity",
        activity: { kind: "drawShape", size: 8, sides: 4, rightAngles: 4, area },
        answer: area,
        hint: `Find two whole numbers that multiply to ${area}.`,
        explain: `A rectangle that isn't a square has 2 lines of symmetry (the midlines) and 180° turn symmetry — not the diagonals.`,
      };
    }
    const area = pick([4, 6, 8, 12]);
    return {
      key: `sym-draw-rhombus-${area}`,
      prompt: `Draw a rhombus with no right angles and an area of ${area}. Where are its lines of symmetry?`,
      speech: `Draw a rhombus, four equal sides and no right angles, with an area of ${area} squares. Where are its lines of symmetry?`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawShape", size: 8, sides: 4, equalSides: true, rightAngles: 0, area },
      answer: area,
      hint: "A rhombus's area is half the product of its diagonals. Draw two different-length diagonals that cross at their middles.",
      explain: "A rhombus has 2 lines of symmetry — its diagonals — and 180° turn symmetry.",
    };
  }
  const i = rand(0, SYM.length - 1);
  const s = SYM[i];
  const visual: Visual = { kind: "shape", shape: s.shape };
  if (kind === 0) {
    return {
      key: `sym-lines-${i}`,
      prompt: `How many lines of symmetry does ${art(s.name)} ${s.name} have?`,
      speech: `How many reflection lines carry ${art(s.name)} ${s.name} onto itself?`,
      visual,
      ...choose(s.lines, [s.lines * 2, s.lines + 1, s.lines - 1, 4, 2], 1, 0),
      hint: "Picture folding the shape so the halves match exactly. Count every fold that works.",
      explain:
        s.lines === 0
          ? `None. Folding ${art(s.name)} ${s.name} never makes the halves match (but it does have 180° turn symmetry).`
          : `${art(s.name) === "an" ? "An" : "A"} ${s.name} has ${s.lines} line${s.lines === 1 ? "" : "s"} of symmetry.`,
    };
  }
  if (kind === 1) {
    return {
      key: `sym-turn-${i}`,
      prompt: `Smallest rotation (more than 0°) that maps ${art(s.name)} ${s.name} onto itself?`,
      speech: `What is the smallest rotation, more than 0 degrees, that carries ${art(s.name)} ${s.name} onto itself?`,
      visual,
      unit: "°",
      ...choose(s.turn, [s.turn / 2, s.turn * 2, 360, 180, 90].filter((v) => v <= 360), 15, 15),
      hint: "Turn it about its center. When does it first look exactly the same?",
      explain:
        s.turn === 360
          ? `Only a full 360° turn works for ${art(s.name)} ${s.name}.`
          : `${s.turn}° maps ${art(s.name)} ${s.name} onto itself${s.lines >= 3 ? ` (360° ÷ ${s.lines})` : ""}.`,
    };
  }
  if (kind === 2) {
    const angle = pick([45, 60, 72, 90, 120, 180]);
    const yes = s.turn !== 360 && angle % s.turn === 0;
    return {
      key: `sym-yn-${i}-${angle}`,
      prompt: `Does a ${angle}° rotation map ${art(s.name)} ${s.name} onto itself?`,
      speech: `Does rotating ${art(s.name)} ${s.name} ${angle} degrees about its center map it onto itself?`,
      visual,
      ...yesNo(yes),
      hint: "Find the smallest turn that works. Any whole-number multiple of it works too.",
      explain: yes
        ? `Yes. ${angle}° is a multiple of ${s.turn}°, the smallest turn that works.`
        : `No. The smallest turn that works is ${s.turn}°, and ${angle}° isn't a multiple of it.`,
    };
  }
  const n = pick([9, 10, 12, 15, 18, 20, 24, 36]);
  const askTurn = rand(0, 1) === 1;
  return {
    key: `sym-ngon-${n}-${askTurn}`,
    prompt: askTurn ? `Smallest rotation that maps a regular ${n}-gon onto itself?` : `How many lines of symmetry does a regular ${n}-gon have?`,
    speech: askTurn
      ? `What is the smallest rotation that maps a regular ${n} sided polygon onto itself?`
      : `How many lines of symmetry does a regular ${n} sided polygon have?`,
    visual: NONE,
    unit: askTurn ? "°" : undefined,
    ...(askTurn ? choose(360 / n, [n, 180 / n, 360 / (n - 1)], 5, 1) : choose(n, [n / 2, n * 2, n - 1], 1, 1)),
    hint: askTurn ? "A full turn is 360°. Share it equally among the vertices." : "A regular polygon has one line through each vertex or side pair — one per side.",
    explain: askTurn ? `360° ÷ ${n} = ${360 / n}°.` : `A regular ${n}-gon has ${n} lines of symmetry.`,
  };
}

const SECOND_TRI = ["DEF", "PQR", "XYZ", "JKL"];

/** HSG-CO.B.6, B.7 — rigid motions and congruence; matching sides and angles. */
export function geoCongruence(): Question {
  const kind = rand(0, 4);
  const names = pick(SECOND_TRI);
  const order = shuffle([0, 1, 2]);
  const T = order.map((i) => names[i]);
  const V = ["A", "B", "C"];
  const tri2 = T.join("");
  if (kind === 0) {
    const [i, j, k] = pick([
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
    ]);
    const side = rand(0, 1) === 1;
    if (side) {
      return {
        key: `cong-side-${tri2}-${i}`,
        prompt: `△ABC ≅ △${tri2}. Which side matches ${V[i]}${V[j]}?`,
        speech: `Triangle A B C is congruent to triangle ${tri2.split("").join(" ")}. Which side matches side ${V[i]} ${V[j]}?`,
        visual: NONE,
        ...label(`${T[i]}${T[j]}`, [`${T[j]}${T[k]}`, `${T[k]}${T[i]}`]),
        hint: "The order of the letters is the matching: 1st with 1st, 2nd with 2nd, 3rd with 3rd.",
        explain: `${V[i]} ↔ ${T[i]} and ${V[j]} ↔ ${T[j]}, so ${V[i]}${V[j]} matches ${T[i]}${T[j]}.`,
      };
    }
    return {
      key: `cong-angle-${tri2}-${i}`,
      prompt: `△ABC ≅ △${tri2}. Which angle matches ∠${V[i]}?`,
      speech: `Triangle A B C is congruent to triangle ${tri2.split("").join(" ")}. Which angle matches angle ${V[i]}?`,
      visual: NONE,
      ...label(`∠${T[i]}`, [`∠${T[j]}`, `∠${T[k]}`]),
      hint: "Line up the letters in order: the first letters match, and so on.",
      explain: `${V[i]} is letter ${i + 1} in ABC, and letter ${i + 1} in ${tri2} is ${T[i]}. So ∠${V[i]} ≅ ∠${T[i]}.`,
    };
  }
  if (kind === 1) {
    let lens: number[];
    do lens = shuffle([rand(4, 7), rand(8, 11), rand(12, 15)]);
    while (2 * Math.max(...lens) >= lens[0] + lens[1] + lens[2] - 1);
    const pairs: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 0],
    ];
    const p = rand(0, 2);
    const [i, j] = pairs[p];
    return {
      key: `cong-len-${tri2}-${lens.join("-")}-${p}`,
      prompt: `△ABC ≅ △${tri2}. How long is ${T[i]}${T[j]}?`,
      speech: `Triangle A B C is congruent to triangle ${tri2.split("").join(" ")}. A B is ${lens[0]}, B C is ${lens[1]}, and C A is ${lens[2]} centimeters. How long is side ${T[i]} ${T[j]}?`,
      visual: triPic(sssAngles(lens[1], lens[2], lens[0]), [lens[1], lens[2], lens[0]], undefined, { unit: "cm" }),
      needsVisual: true,
      unit: "cm",
      ...choose(lens[p], lens, 1, 1),
      hint: `Which side of ABC matches ${T[i]}${T[j]}? Match letters by position.`,
      explain: `${T[i]}${T[j]} matches ${V[i]}${V[j]}, which is ${lens[p]} cm. Congruent triangles have equal matching sides.`,
    };
  }
  if (kind === 2) {
    const a = rand(35, 80);
    const b = rand(35, 140 - a);
    const angles = [a, b, 180 - a - b];
    const ask = rand(0, 2);
    return {
      key: `cong-ang-${tri2}-${a}-${b}-${ask}`,
      prompt: `△ABC ≅ △${tri2}. Find ∠${T[ask]}.`,
      speech: `Triangle A B C is congruent to triangle ${tri2.split("").join(" ")}. Angle A is ${a} degrees and angle B is ${b} degrees. Find angle ${T[ask]}.`,
      visual: triPic([a, b, 180 - a - b], undefined, [a, b, null]),
      needsVisual: true,
      unit: "°",
      ...keypad(angles[ask]),
      hint: `∠${T[ask]} matches ∠${V[ask]}. If you need ∠C, the angles of a triangle add to 180°.`,
      explain: `∠${T[ask]} matches ∠${V[ask]}${ask === 2 ? ` = 180° − ${a}° − ${b}°` : ""} = ${angles[ask]}°.`,
    };
  }
  const MOTIONS: [string, boolean][] = [
    ["reflected, then translated", true],
    ["rotated 90° about a point", true],
    ["dilated by a scale factor of 2", false],
    ["translated 5 units left", true],
    ["stretched to twice its width", false],
    ["reflected over two different lines", true],
    ["shrunk by a scale factor of 1/2", false],
    ["rotated 180°, then reflected", true],
    ["stretched vertically by a factor of 3", false],
  ];
  const i = rand(0, MOTIONS.length - 1);
  const [m, yes] = MOTIONS[i];
  return {
    key: `cong-motion-${i}`,
    prompt: `△ABC is ${m}. Is the image congruent to △ABC?`,
    speech: `Triangle A B C is ${say(m)}. Is the image congruent to the original?`,
    visual: NONE,
    ...yesNo(yes),
    hint: "Congruent means some sequence of rigid motions (slides, flips, turns) maps one onto the other.",
    explain: yes
      ? "Yes. Every step is a rigid motion, so all lengths and angles are kept."
      : "No. That changes lengths, so the image isn't congruent (a dilation gives a similar figure).",
  };
}

const TICKS = ["|", "||", "|||"];

/** △ABC with the known sides (vertex pairs) tick-marked and the known angles marked with arcs. */
function markedTri(sides: [number, number][], angles: number[]): Visual {
  const s: Tri3 = [null, null, null];
  sides.forEach(([i, j], k) => (s[3 - i - j] = TICKS[k]));
  const a: Tri3 = [null, null, null];
  angles.forEach((i) => (a[i] = ""));
  return triPic([50, 75, 55], s, a);
}

/** HSG-CO.B.8, HSG-SRT.B.5 — ASA, SAS and SSS (and why SSA and AAA fail); use congruence to find unknowns. */
export function geoCriteria(): Question {
  const kind = rand(0, 3);
  const V = ["A", "B", "C"];
  const W = ["D", "E", "F"];
  const r = rand(0, 2);
  const at = (k: number) => (r + k) % 3;
  const side = (i: number, j: number) => `${V[i]}${V[j]} = ${W[i]}${W[j]}`;
  const ang = (i: number) => `∠${V[i]} = ∠${W[i]}`;
  if (kind <= 1) {
    const cases: { name: string; facts: string[]; pic: Visual }[] = [
      { name: "SSS", facts: [side(at(0), at(1)), side(at(1), at(2)), side(at(2), at(0))], pic: markedTri([[at(0), at(1)], [at(1), at(2)], [at(2), at(0)]], []) },
      { name: "SAS", facts: [side(at(0), at(1)), ang(at(1)), side(at(1), at(2))], pic: markedTri([[at(0), at(1)], [at(1), at(2)]], [at(1)]) },
      { name: "ASA", facts: [ang(at(0)), side(at(0), at(1)), ang(at(1))], pic: markedTri([[at(0), at(1)]], [at(0), at(1)]) },
      { name: "AAS", facts: [ang(at(0)), ang(at(1)), side(at(1), at(2))], pic: markedTri([[at(1), at(2)]], [at(0), at(1)]) },
      { name: "SSA", facts: [side(at(0), at(1)), side(at(1), at(2)), ang(at(2))], pic: markedTri([[at(0), at(1)], [at(1), at(2)]], [at(2)]) },
      { name: "AAA", facts: [ang(0), ang(1), ang(2)], pic: markedTri([], [0, 1, 2]) },
    ];
    const c = rand(0, cases.length - 1);
    const { name, facts, pic } = cases[c];
    const correct = name === "SSA" || name === "AAA" ? "Not enough" : name;
    const near: Record<string, string[]> = {
      SSS: ["SAS", "Not enough", "ASA"],
      SAS: ["Not enough", "SSS", "ASA"],
      ASA: ["AAS", "SAS", "Not enough"],
      AAS: ["ASA", "Not enough", "SAS"],
      "Not enough": name === "SSA" ? ["SAS", "SSS", "AAS"] : ["ASA", "AAS", "SSS"],
    };
    return {
      key: `crit-${c}-${r}`,
      prompt: `${facts.join(", ")}. Which proves △ABC ≅ △DEF?`,
      speech: `We know ${facts.map(say).join(", and ")}. Which shortcut proves triangle A B C is congruent to triangle D E F?`,
      visual: pic,
      ...label(correct, near[correct], true),
      hint: "Is each angle between the two sides (or the side between the two angles)? SSA and AAA don't prove congruence.",
      explain:
        correct === "Not enough"
          ? name === "SSA"
            ? "Not enough: the angle isn't between the two sides (SSA), so two different triangles can fit."
            : "Not enough: equal angles (AAA) only prove the triangles are similar — one could be bigger."
          : `${name}: ${name === "SAS" ? "the angle is between the two sides" : name === "ASA" ? "the side is between the two angles" : name === "AAS" ? "two angles and a side that isn't between them" : "all three pairs of sides match"}.`,
    };
  }
  if (kind === 2) {
    const sas = rand(0, 1) === 1;
    if (sas) {
      return {
        key: `crit-extra-sas-${r}`,
        prompt: `${side(at(0), at(1))} and ${side(at(1), at(2))}. Which angle gives SAS?`,
        speech: `We know ${say(side(at(0), at(1)))} and ${say(side(at(1), at(2)))}. Which angle fact proves the triangles congruent by S A S?`,
        visual: markedTri([[at(0), at(1)], [at(1), at(2)]], []),
        ...label(ang(at(1)), [ang(at(0)), ang(at(2))]),
        hint: "SAS needs the included angle: the one where the two known sides meet.",
        explain: `Sides ${V[at(0)]}${V[at(1)]} and ${V[at(1)]}${V[at(2)]} meet at ${V[at(1)]}, so we need ${ang(at(1))}.`,
      };
    }
    return {
      key: `crit-extra-asa-${r}`,
      prompt: `${ang(at(0))} and ${ang(at(1))}. Which side gives ASA?`,
      speech: `We know ${say(ang(at(0)))} and ${say(ang(at(1)))}. Which side fact proves the triangles congruent by A S A?`,
      visual: markedTri([], [at(0), at(1)]),
      ...label(side(at(0), at(1)), [side(at(1), at(2)), side(at(2), at(0))]),
      hint: "ASA needs the included side: the one that joins the two known angles.",
      explain: `The side joining ${V[at(0)]} and ${V[at(1)]} is ${V[at(0)]}${V[at(1)]}, so we need ${side(at(0), at(1))}.`,
    };
  }
  const x = rand(2, 12);
  const a = rand(2, 6);
  const b = rand(1, 15);
  const isAngle = rand(0, 1) === 1;
  const total = a * x + b;
  return {
    key: `crit-alg-${isAngle}-${x}-${a}-${b}`,
    prompt: isAngle
      ? `△ABC ≅ △DEF. ∠A = (${a}x + ${b})° and ∠D = ${total}°. Find x.`
      : `△ABC ≅ △DEF. AB = ${a}x + ${b} and DE = ${total}. Find x.`,
    speech: isAngle
      ? `Triangle A B C is congruent to triangle D E F. Angle A is ${a} x plus ${b} degrees and angle D is ${total} degrees. Find x.`
      : `Triangle A B C is congruent to triangle D E F. A B is ${a} x plus ${b}, and D E is ${total}. Find x.`,
    equation: [{ x: a }, "+", b, "=", total],
    answerLine: ["x", "=", "?"],
    visual: NONE,
    ...keypad(x),
    hint: `Matching parts of congruent triangles are equal, so ${a}x + ${b} = ${total}.`,
    explain: `${a}x + ${b} = ${total}, so ${a}x = ${total - b} and x = ${x}.`,
  };
}

const ANGLE_REASONS: { step: string; reason: string }[] = [
  { step: "∠1 and ∠3 are opposite where two lines cross, so ∠1 = ∠3.", reason: "Vertical angles are congruent" },
  { step: "∠1 and ∠2 form a straight line, so ∠1 + ∠2 = 180°.", reason: "Linear pairs are supplementary" },
  { step: "Parallel lines: ∠3, ∠5 are inside, on opposite sides. ∠3 = ∠5.", reason: "Alternate interior angles are congruent" },
  { step: "Parallel lines: ∠2 and ∠6 sit in matching spots, so ∠2 = ∠6.", reason: "Corresponding angles are congruent" },
  { step: "Parallel lines: ∠4, ∠5 are inside, same side. ∠4 + ∠5 = 180°.", reason: "Same-side interior angles are supplementary" },
  { step: "P is on the perpendicular bisector of AB, so PA = PB.", reason: "Perpendicular bisector theorem" },
  { step: "∠1 = ∠2 and ∠2 = ∠3, so ∠1 = ∠3.", reason: "Transitive property" },
  { step: "∠1 + ∠2 = 180° and ∠3 + ∠2 = 180°, so ∠1 = ∠3.", reason: "Supplements of the same angle are congruent" },
];

/** HSG-CO.C.9 — theorems about lines and angles: vertical angles, transversals, perpendicular bisectors. */
export function geoAngleProofs(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    let a = rand(25, 155);
    if (a === 90) a = 91;
    const vertical = rand(0, 1) === 1;
    return {
      key: `ap-cross-${a}-${vertical}`,
      prompt: vertical ? `Two lines cross. One angle is ${a}°. Find the angle opposite it.` : `Two lines cross. One angle is ${a}°. Find the angle next to it.`,
      speech: vertical
        ? `Two lines cross. One angle is ${a} degrees. What is the vertical angle, opposite it?`
        : `Two lines cross. One angle is ${a} degrees. What is the angle next to it, on the same straight line?`,
      visual: vertical ? { kind: "lines", type: "intersecting" } : { kind: "angle", mode: "line", angles: [a] },
      unit: "°",
      ...keypad(vertical ? a : 180 - a),
      hint: vertical ? "Vertical angles are congruent." : "Angles on a straight line add to 180°.",
      explain: vertical ? `Vertical angles are congruent: ${a}°.` : `They form a linear pair: 180° − ${a}° = ${180 - a}°.`,
    };
  }
  if (kind === 1) {
    let a = rand(30, 150);
    if (a === 90) a = 89;
    const rels = ["corresponding", "alternate interior", "alternate exterior", "same-side interior"];
    const ri = rand(0, 3);
    const ans = ri === 3 ? 180 - a : a;
    return {
      key: `ap-par-${a}-${ri}`,
      prompt: `Parallel lines, one transversal. An angle is ${a}°. Its ${rels[ri]} partner?`,
      speech: `Two parallel lines are cut by a transversal. One angle is ${a} degrees. What is its ${rels[ri]} angle?`,
      visual: { kind: "lines", type: "parallel" },
      unit: "°",
      ...choose(ans, [180 - ans, 90 - (ans % 90), ans + 10], 5, 1),
      hint: "Corresponding and alternate angles are equal. Same-side interior angles add to 180°.",
      explain: ri === 3 ? `Same-side interior angles are supplementary: 180° − ${a}° = ${ans}°.` : `${rels[ri].charAt(0).toUpperCase()}${rels[ri].slice(1)} angles are congruent: ${ans}°.`,
    };
  }
  if (kind === 2) {
    const i = rand(0, ANGLE_REASONS.length - 1);
    const { step, reason } = ANGLE_REASONS[i];
    return {
      key: `ap-why-${i}`,
      prompt: `${step} Which reason?`,
      speech: `In a proof: ${say(step)} Which reason justifies this step?`,
      visual: NONE,
      ...label(
        reason,
        ANGLE_REASONS.filter((o) => o.reason !== reason).map((o) => o.reason),
      ),
      hint: "Look at where the angles sit: opposite, on a line, inside or outside the parallels?",
      explain: `${reason}.`,
    };
  }
  const x = rand(8, 30);
  const vertical = rand(0, 1) === 1;
  if (vertical) {
    const a = rand(2, 4);
    const b = a + rand(1, 3);
    const c = rand(5, Math.min(40, (b - a) * x - 1));
    const d = (b - a) * x - c;
    return {
      key: `ap-alg-v-${x}-${a}-${b}-${c}`,
      prompt: `Vertical angles: (${a}x + ${c})° and (${b}x − ${d})°. Find x.`,
      speech: `Two vertical angles measure ${a} x plus ${c} degrees and ${b} x minus ${d} degrees. Find x.`,
      equation: [{ x: a }, "+", c, "=", { x: b }, "−", d],
      answerLine: ["x", "=", "?"],
      visual: { kind: "lines", type: "intersecting" },
      ...keypad(x),
      hint: "Vertical angles are equal. Set the expressions equal and solve.",
      explain: `${a}x + ${c} = ${b}x − ${d}, so ${c + d} = ${b - a}x and x = ${x}.`,
    };
  }
  const a = rand(2, 4);
  const b = rand(1, 3);
  const c = rand(5, 25);
  const d = 180 - (a + b) * x - c;
  if (d <= 0 || a * x + c >= 170) return geoAngleProofs();
  return {
    key: `ap-alg-s-${x}-${a}-${b}-${c}`,
    prompt: `Same-side interior angles: (${a}x + ${c})° and (${b}x + ${d})°. Find x.`,
    speech: `Parallel lines are cut by a transversal. Same-side interior angles measure ${a} x plus ${c} and ${b} x plus ${d} degrees. Find x.`,
    equation: [{ x: a }, "+", c, "+", { x: b }, "+", d, "=", 180],
    answerLine: ["x", "=", "?"],
    visual: { kind: "lines", type: "parallel" },
    ...keypad(x),
    hint: "Same-side interior angles are supplementary: they add to 180°.",
    explain: `${a + b}x + ${c + d} = 180, so ${a + b}x = ${180 - c - d} and x = ${x}.`,
  };
}

const TRIANGLE_FACTS: { fact: string; theorem: string }[] = [
  { fact: "In △ABC, AB = AC, so ∠B = ∠C.", theorem: "Base angles theorem" },
  { fact: "D is on ray BC past C, so ∠ACD = ∠A + ∠B.", theorem: "Exterior angle theorem" },
  { fact: "M, N are midpoints of AB, AC, so MN ∥ BC and MN = ½BC.", theorem: "Midsegment theorem" },
  { fact: "In △ABC, ∠A + ∠B + ∠C = 180°.", theorem: "Triangle sum theorem" },
  { fact: "The three medians of △ABC meet at one point.", theorem: "Medians meet at the centroid" },
];

/** HSG-CO.C.10 — theorems about triangles: angle sum, base angles, midsegment, medians. */
export function geoTriangleProofs(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const A = rand(30, 90);
    const B = rand(25, 160 - A);
    const C = 180 - A - B;
    return {
      key: `tp-sum-${A}-${B}`,
      prompt: "Find the missing angle of the triangle.",
      speech: `A triangle has angles of ${A} and ${B} degrees. Find the third angle.`,
      equation: [A, "+", B, "+", "?", "=", 180],
      visual: triPic([A, B, C], undefined, [A, B, "?"]),
      unit: "°",
      ...keypad(C),
      hint: "The angles of any triangle add to 180°.",
      explain: `180° − ${A}° − ${B}° = ${C}°.`,
    };
  }
  if (kind === 1) {
    const a = rand(25, 80);
    const b = rand(25, 85);
    return {
      key: `tp-ext-${a}-${b}`,
      prompt: `Remote interior angles are ${a}° and ${b}°. Find the exterior angle.`,
      speech: `A triangle's two remote interior angles are ${a} and ${b} degrees. What is the exterior angle at the third vertex?`,
      equation: [a, "+", b, "=", "?"],
      visual: NONE,
      unit: "°",
      ...keypad(a + b),
      hint: "An exterior angle equals the sum of the two interior angles that aren't next to it.",
      explain: `${a}° + ${b}° = ${a + b}°.`,
    };
  }
  if (kind === 2) {
    const baseGiven = rand(0, 1) === 1;
    if (baseGiven) {
      const b = rand(25, 80);
      return {
        key: `tp-iso-b-${b}`,
        prompt: "AB = AC. Find the vertex angle A.",
        speech: `An isosceles triangle has two base angles of ${b} degrees each. What is the vertex angle?`,
        visual: triPic([180 - 2 * b, b, b], [null, "|", "|"], ["?", b, b]),
        needsVisual: true,
        unit: "°",
        ...keypad(180 - 2 * b),
        hint: "Both base angles are equal. Take both away from 180°.",
        explain: `180° − 2 × ${b}° = ${180 - 2 * b}°.`,
      };
    }
    const v = rand(10, 70) * 2;
    return {
      key: `tp-iso-v-${v}`,
      prompt: "AB = AC. Find base angle B.",
      speech: `An isosceles triangle has a vertex angle of ${v} degrees. How big is each base angle?`,
      visual: triPic([v, (180 - v) / 2, (180 - v) / 2], [null, "|", "|"], [v, "?", null]),
      needsVisual: true,
      unit: "°",
      ...keypad((180 - v) / 2),
      hint: "The two base angles are equal and share what's left of 180°.",
      explain: `(180° − ${v}°) ÷ 2 = ${(180 - v) / 2}°.`,
    };
  }
  if (kind === 3) {
    const x = rand(3, 15);
    const q = rand(3, 5);
    const p = rand(1, 9);
    const r = (q - 2) * x - 2 * p;
    if (r <= 0) {
      const s = rand(4, 30) * 2;
      const findBase = rand(0, 1) === 1;
      return {
        key: `tp-mid-${s}-${findBase}`,
        prompt: findBase ? `A midsegment of a triangle is ${s / 2} cm. How long is the side it's parallel to?` : `A triangle side is ${s} cm. How long is the midsegment parallel to it?`,
        speech: findBase
          ? `A midsegment joins the midpoints of two sides of a triangle. It is ${s / 2} centimeters. How long is the third side?`
          : `The third side of a triangle is ${s} centimeters. How long is the midsegment parallel to it?`,
        visual: NONE,
        unit: "cm",
        ...keypad(findBase ? s : s / 2),
        hint: "The midsegment is parallel to the third side and half as long.",
        explain: findBase ? `The side is twice the midsegment: 2 × ${s / 2} = ${s} cm.` : `Half of ${s} is ${s / 2} cm.`,
      };
    }
    return {
      key: `tp-mid-alg-${x}-${q}-${p}`,
      prompt: `Midsegment MN = x + ${p}, parallel side BC = ${q}x − ${r}. Find x.`,
      speech: `The midsegment M N is x plus ${p}. The side B C parallel to it is ${q} x minus ${r}. Find x.`,
      equation: [2, "×", "(", "x", "+", p, ")", "=", { x: q }, "−", r],
      answerLine: ["x", "=", "?"],
      visual: NONE,
      ...keypad(x),
      hint: "BC is twice the midsegment, so 2(x + p) = BC.",
      explain: `2(x + ${p}) = ${q}x − ${r} → 2x + ${2 * p} = ${q}x − ${r} → ${2 * p + r} = ${q - 2}x → x = ${x}.`,
    };
  }
  if (kind === 4) {
    const k = rand(2, 12);
    const toVertex = rand(0, 1) === 1;
    return {
      key: `tp-centroid-${k}-${toVertex}`,
      prompt: `Median AM is ${3 * k} cm. G is the centroid. How long is ${toVertex ? "AG" : "GM"}?`,
      speech: `The median from A to M is ${3 * k} centimeters, and G is the centroid. How long is ${toVertex ? "A G" : "G M"}?`,
      visual: NONE,
      unit: "cm",
      ...choose(toVertex ? 2 * k : k, [toVertex ? k : 2 * k, (3 * k) / 2, 3 * k], 1, 1),
      hint: "The centroid sits two thirds of the way from each vertex along the median.",
      explain: `AG = ⅔ × ${3 * k} = ${2 * k} cm and GM = ⅓ × ${3 * k} = ${k} cm.`,
    };
  }
  const i = rand(0, TRIANGLE_FACTS.length - 1);
  const { fact, theorem } = TRIANGLE_FACTS[i];
  return {
    key: `tp-why-${i}`,
    prompt: `${fact} Which theorem?`,
    speech: `${say(fact)} Which theorem says so?`,
    visual: NONE,
    ...label(
      theorem,
      TRIANGLE_FACTS.filter((o) => o.theorem !== theorem).map((o) => o.theorem),
    ),
    hint: "Is the fact about angles, about midpoints, or about equal sides?",
    explain: `${theorem}.`,
  };
}

const PARA_PROOFS_YES = [
  "Both pairs of opposite sides are congruent",
  "The diagonals bisect each other",
  "One pair of sides is both parallel and congruent",
  "Both pairs of opposite angles are congruent",
];
const PARA_PROOFS_NO = [
  "One pair of opposite sides is parallel",
  "The diagonals are congruent",
  "Two adjacent sides are congruent",
  "The diagonals are perpendicular",
  "One pair of opposite angles is congruent",
];
const PARA_REASONS: { step: string; reason: string }[] = [
  { step: "ABCD is a parallelogram, so ∠A + ∠B = 180°.", reason: "Same-side interior angles are supplementary" },
  { step: "Diagonal AC splits ABCD, and △ABC ≅ △CDA.", reason: "ASA, using alternate interior angles" },
  { step: "△ABC ≅ △CDA, so AB = CD.", reason: "Corresponding parts of congruent triangles" },
  { step: "ABCD is a rectangle, so AC = BD.", reason: "A rectangle's diagonals are congruent" },
  { step: "AE = EC and BE = ED, where diagonals meet at E.", reason: "A parallelogram's diagonals bisect each other" },
];

/** HSG-CO.C.11 — theorems about parallelograms. */
export function geoParallelograms(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    let a = rand(40, 140);
    if (a === 90) a = 95;
    const opp = rand(0, 1) === 1;
    return {
      key: `para-ang-${a}-${opp}`,
      prompt: `In parallelogram ABCD, ∠A = ${a}°. Find ∠${opp ? "C" : "B"}.`,
      speech: `In parallelogram A B C D, angle A is ${a} degrees. Find angle ${opp ? "C" : "B"}.`,
      visual: { kind: "shape", shape: "parallelogram" },
      unit: "°",
      ...choose(opp ? a : 180 - a, [opp ? 180 - a : a, 360 - a, 90], 5, 1),
      hint: "Opposite angles are equal; angles next to each other add to 180°.",
      explain: opp ? `∠C is opposite ∠A, so ∠C = ${a}°.` : `∠B is next to ∠A, so ∠B = 180° − ${a}° = ${180 - a}°.`,
    };
  }
  if (kind === 1 || kind === 2) {
    const x = rand(2, 12);
    const a = rand(2, 4);
    const c = a + rand(1, 3);
    const b = rand(1, 12);
    const d = (c - a) * x - b;
    if (d <= 0) return geoParallelograms();
    const diag = kind === 2;
    const [s1, s2] = diag ? ["AE", "EC"] : ["AB", "CD"];
    return {
      key: `para-alg-${kind}-${x}-${a}-${b}-${c}`,
      prompt: diag
        ? `Diagonals of ▱ABCD meet at E. AE = ${a}x + ${b}, EC = ${c}x − ${d}. x?`
        : `In ▱ABCD, AB = ${a}x + ${b} and CD = ${c}x − ${d}. Find x.`,
      speech: diag
        ? `The diagonals of parallelogram A B C D meet at E. A E is ${a} x plus ${b} and E C is ${c} x minus ${d}. Find x.`
        : `In parallelogram A B C D, A B is ${a} x plus ${b} and C D is ${c} x minus ${d}. Find x.`,
      equation: [{ x: a }, "+", b, "=", { x: c }, "−", d],
      answerLine: ["x", "=", "?"],
      visual: { kind: "shape", shape: "parallelogram" },
      ...keypad(x),
      hint: diag ? "The diagonals of a parallelogram bisect each other, so AE = EC." : "Opposite sides of a parallelogram are congruent.",
      explain: `${s1} = ${s2}: ${a}x + ${b} = ${c}x − ${d}, so ${b + d} = ${c - a}x and x = ${x}.`,
    };
  }
  if (kind === 3) {
    const d = rand(5, 30) * 2;
    const whole = rand(0, 1) === 1;
    return {
      key: `para-rect-${d}-${whole}`,
      prompt: whole ? `Rectangle ABCD: AC = ${d} cm. How long is BD?` : `Rectangle ABCD: AC = ${d} cm. Diagonals meet at E. BE?`,
      speech: whole
        ? `In rectangle A B C D, diagonal A C is ${d} centimeters. How long is diagonal B D?`
        : `In rectangle A B C D, diagonal A C is ${d} centimeters. The diagonals meet at E. How long is B E?`,
      visual: { kind: "shape", shape: "rectangle" },
      unit: "cm",
      ...choose(whole ? d : d / 2, [whole ? d / 2 : d, 2 * d, d / 4], 1, 1),
      hint: "A rectangle's diagonals are congruent, and they bisect each other.",
      explain: whole ? `The diagonals are congruent: BD = ${d} cm.` : `BD = ${d} cm and E is its midpoint, so BE = ${d / 2} cm.`,
    };
  }
  if (kind === 4) {
    const i = rand(0, PARA_PROOFS_YES.length - 1);
    return {
      key: `para-proof-${i}`,
      prompt: "Which fact proves ABCD is a parallelogram?",
      speech: "Which one fact is enough to prove quadrilateral A B C D is a parallelogram?",
      visual: NONE,
      ...label(PARA_PROOFS_YES[i], PARA_PROOFS_NO),
      hint: "Try to draw a shape that fits the fact but isn't a parallelogram — a trapezoid or a kite.",
      explain: `${PARA_PROOFS_YES[i]} — that forces both pairs of opposite sides to be parallel.`,
    };
  }
  const i = rand(0, PARA_REASONS.length - 1);
  const { step, reason } = PARA_REASONS[i];
  return {
    key: `para-why-${i}`,
    prompt: `${step} Which reason?`,
    speech: `In a proof: ${say(step)} Which reason justifies this step?`,
    visual: NONE,
    ...label(
      reason,
      PARA_REASONS.filter((o) => o.reason !== reason).map((o) => o.reason),
    ),
    hint: "Opposite sides of a parallelogram are parallel, so transversal angle facts apply.",
    explain: `${reason}.`,
  };
}

const CONSTRUCTIONS: { q: string; a: string; wrong: string[] }[] = [
  { q: "To copy segment AB, set your compass to…", a: "the length AB", wrong: ["any width", "half of AB", "the width of the page"] },
  {
    q: "To bisect segment AB, draw arcs from A and B with…",
    a: "the same radius, more than half of AB",
    wrong: ["any two different radii", "a radius less than half of AB", "a radius of exactly AB ÷ 4"],
  },
  { q: "To bisect an angle, first draw an arc centered at…", a: "the vertex", wrong: ["a point outside the angle", "the middle of one ray", "any point"] },
  {
    q: "To draw a parallel to line ℓ through P, you copy…",
    a: "an angle made by a transversal through P",
    wrong: ["the length of ℓ", "a right angle at any point", "a circle centered at P"],
  },
  {
    q: "To drop a perpendicular from P to line ℓ, center an arc at P that…",
    a: "crosses ℓ twice",
    wrong: ["just touches ℓ once", "misses ℓ", "passes through P"],
  },
  {
    q: "Two arcs from A and B cross at two points. The line through them is…",
    a: "the perpendicular bisector of AB",
    wrong: ["parallel to AB", "the angle bisector", "a tangent to the circle"],
  },
  {
    q: "To inscribe a regular hexagon, step around the circle with the compass set to…",
    a: "the radius",
    wrong: ["the diameter", "half the radius", "any width"],
  },
  {
    q: "To inscribe an equilateral triangle, join…",
    a: "every other point of an inscribed hexagon",
    wrong: ["every point of the hexagon", "the center to two points", "three random points"],
  },
  {
    q: "To inscribe a square in a circle, draw…",
    a: "two perpendicular diameters",
    wrong: ["two parallel chords", "one diameter and a radius", "a tangent line"],
  },
];

/** HSG-CO.D.12, D.13 — formal constructions; equilateral triangle, square and hexagon inscribed in a circle. */
export function geoConstructions(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, CONSTRUCTIONS.length - 1);
    const c = CONSTRUCTIONS[i];
    return {
      key: `con-step-${i}`,
      prompt: c.q,
      speech: c.q.replace(/…$/, " what?").replace(/ℓ/g, "L"),
      visual: NONE,
      ...label(c.a, c.wrong),
      hint: "Constructions use only a compass (to copy equal distances) and a straightedge (to draw lines).",
      explain: `${c.q.replace(/…$/, "")} ${c.a}.`,
    };
  }
  if (kind === 1) {
    const n = pick([3, 4, 5, 6, 8, 9, 10, 12]);
    return {
      key: `con-central-${n}`,
      prompt: `A regular ${n}-gon is inscribed in a circle. Each central angle is…`,
      speech: `A regular polygon with ${n} sides is inscribed in a circle. Lines from the center to each vertex make equal central angles. How big is each one?`,
      visual: n <= 8 && [3, 4, 5, 6, 8].includes(n) ? { kind: "shape", shape: (["", "", "", "triangle", "square", "pentagon", "hexagon", "", "octagon"] as ShapeName[])[n] } : NONE,
      unit: "°",
      ...choose(360 / n, [180 / n, (180 * (n - 2)) / n, 360 / (n + 1)], 5, 1),
      hint: "The vertices split the full 360° around the center into equal parts.",
      explain: `360° ÷ ${n} = ${clean(360 / n)}°.`,
    };
  }
  const r = rand(2, 15);
  const hex = rand(0, 1) === 1;
  return {
    key: `con-len-${r}-${hex}`,
    prompt: hex ? `A regular hexagon is inscribed in a circle of radius ${r} cm. Side length?` : `A square is inscribed in a circle of radius ${r} cm. Its diagonal?`,
    speech: hex
      ? `A regular hexagon is inscribed in a circle with radius ${r} centimeters. How long is each side?`
      : `A square is inscribed in a circle with radius ${r} centimeters. How long is the square's diagonal?`,
    visual: { kind: "circle", r, show: "radius", unit: "cm" },
    unit: "cm",
    ...choose(hex ? r : 2 * r, [hex ? 2 * r : r, r / 2, r + 2].filter((v) => Number.isInteger(v)), 1, 1),
    hint: hex ? "The hexagon is six equilateral triangles meeting at the center." : "The square's diagonal passes through the center of the circle.",
    explain: hex ? `Each of the 6 triangles is equilateral, so a side equals the radius: ${r} cm.` : `The diagonal is a diameter: 2 × ${r} = ${2 * r} cm.`,
  };
}

/* ============================================ B. Similarity & right triangles */

/** "y = 2x + 3", "y = −x − 4", "y = 3x", "y = 5". */
function lineEq(m: number, b: number): string {
  const mx = m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${ds(m)}x`;
  if (!mx) return `y = ${ds(b)}`;
  return `y = ${mx}${b === 0 ? "" : plus(b)}`;
}

/** HSG-SRT.A.1a, A.1b — dilations: lines through the center stay put, others move parallel; lengths scale by k. */
export function geoDilations(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const k = pick([2, 3, 0.5]);
    const lim = k === 3 ? 3 : 4;
    let x = nz(-lim, lim);
    let y = nz(-lim, lim);
    if (k === 0.5) {
      x *= 2;
      y *= 2;
    }
    return {
      key: `dil-pt-${k}-${x}-${y}`,
      prompt: `Dilate A${pt(x, y)} by ${ds(k)} about the origin. Where is A′?`,
      speech: `Dilate point A at ${sayPt(x, y)} by a scale factor of ${say(ds(k))}, centered at the origin. Where is A prime?`,
      visual: grid([{ x, y, label: "A" }]),
      ...label(pt(k * x, k * y), [pt(x + k, y + k), pt(k * x, y), pt(x / k, y / k), pt(-k * x, -k * y)]),
      hint: "Centered at the origin, a dilation multiplies both coordinates by the scale factor.",
      explain: `(${ds(k)} × ${ds(x)}, ${ds(k)} × ${ds(y)}) = ${pt(k * x, k * y)}.`,
    };
  }
  if (kind === 1 || kind === 2) {
    const L = rand(2, 12);
    const k = pick([2, 3, 4, 0.5, 1.5, 2.5]);
    const image = clean(L * k);
    if (kind === 1) {
      return {
        key: `dil-len-${L}-${k}`,
        prompt: `AB = ${L} cm. Dilate by a scale factor of ${ds(k)}. How long is A′B′?`,
        speech: `Segment A B is ${L} centimeters. After a dilation with scale factor ${say(ds(k))}, how long is A prime B prime?`,
        visual: NONE,
        unit: "cm",
        ...keypad(image),
        hint: "A dilation multiplies every length by the scale factor.",
        explain: `${L} × ${ds(k)} = ${ds(image)} cm.`,
      };
    }
    return {
      key: `dil-k-${L}-${k}`,
      prompt: `AB = ${L} cm and its image A′B′ = ${ds(image)} cm. Scale factor?`,
      speech: `Segment A B is ${L} centimeters. Its image after a dilation is ${say(ds(image))} centimeters. What is the scale factor?`,
      visual: NONE,
      ...keypad(k),
      hint: "Scale factor = image length ÷ original length.",
      explain: `${ds(image)} ÷ ${L} = ${ds(k)}.${k < 1 ? " Less than 1 means it shrank." : ""}`,
    };
  }
  if (kind === 3) {
    const through = rand(0, 1) === 1;
    const k = pick([2, 3, 4, 0.5]);
    return {
      key: `dil-line-${through}-${k}`,
      prompt: `Dilate by ${ds(k)} from center O. A line ${through ? "through" : "not through"} O becomes…`,
      speech: `A dilation with center O and scale factor ${say(ds(k))}. What happens to a line that ${through ? "passes through" : "doesn't pass through"} O?`,
      visual: NONE,
      ...(through
        ? label("The same line", ["A parallel line", "A perpendicular line", "A line through the origin at twice the slope"])
        : label("A parallel line", ["The same line", "A perpendicular line", "A line through O"])),
      hint: "Each point slides along its ray from O. Where do points already on a line through O go?",
      explain: through
        ? "Every point slides along its ray from O — which is the line itself — so the line maps to itself."
        : "Points move away from (or toward) O by the same factor, so the line moves to a parallel line.",
    };
  }
  if (kind === 4) {
    const cx = nz(-3, 3);
    const cy = nz(-3, 3);
    const dx = nz(-3, 3);
    const dy = nz(-3, 3);
    const px = cx + dx;
    const py = cy + dy;
    return {
      key: `dil-center-${cx}-${cy}-${dx}-${dy}`,
      prompt: `Dilate P${pt(px, py)} by 2 with center C${pt(cx, cy)}. Where is P′?`,
      speech: `Dilate point P at ${sayPt(px, py)} by a scale factor of 2, centered at C, ${sayPt(cx, cy)}. Where is P prime?`,
      visual: grid([
        { x: cx, y: cy, label: "C" },
        { x: px, y: py, label: "P" },
      ]),
      ...label(pt(cx + 2 * dx, cy + 2 * dy), [pt(2 * px, 2 * py), pt(cx - 2 * dx, cy - 2 * dy), pt(px + 2, py + 2), pt(2 * cx + dx, 2 * cy + dy)]),
      hint: "Find the move from C to P. Double that move, starting from C.",
      explain: `C to P is (${ds(dx)}, ${ds(dy)}). Double it: (${ds(2 * dx)}, ${ds(2 * dy)}). From C: ${pt(cx + 2 * dx, cy + 2 * dy)}.`,
    };
  }
  const m = nz(-3, 3);
  const b = nz(-4, 4);
  const k = pick([2, 3]);
  return {
    key: `dil-eq-${m}-${b}-${k}`,
    prompt: `Dilate the line ${lineEq(m, b)} by ${k} about the origin. New line?`,
    speech: `Dilate the line ${say(lineEq(m, b))} by a scale factor of ${k}, centered at the origin. What is the new line?`,
    visual: { kind: "plot", x: [-8, 8], y: [-12, 12], curves: [{ fn: (x) => m * x + b }] },
    ...label(lineEq(m, k * b), [lineEq(k * m, b), lineEq(k * m, k * b), lineEq(m, b + k), lineEq(-m, k * b)]),
    hint: "The image is parallel (same slope). Where does the y-intercept (0, b) go?",
    explain: `Same slope ${ds(m)}. The intercept (0, ${ds(b)}) moves to (0, ${ds(k * b)}). So ${lineEq(m, k * b)}.`,
  };
}

/** HSG-SRT.A.2, A.3 — similarity by transformations; AA similarity. */
export function geoSimilarity(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const a = rand(30, 80);
    const b = rand(30, 140 - a);
    const c = 180 - a - b;
    const similar = rand(0, 1) === 1;
    let shown: [number, number];
    if (similar) shown = shuffle([a, b, c]).slice(0, 2) as [number, number];
    else {
      let d = nz(-10, 10);
      while (b + d === c || b + d === a || a + b + d >= 175 || Math.abs(d) < 3) d = nz(-10, 10);
      shown = shuffle([a, b + d]) as [number, number];
    }
    return {
      key: `sim-aa-${a}-${b}-${shown.join("-")}`,
      prompt: `△ABC has angles ${a}° and ${b}°. Is △DEF similar to it?`,
      speech: `Triangle A B C has angles of ${a} and ${b} degrees. Triangle D E F has angles of ${shown[0]} and ${shown[1]} degrees. Are they similar?`,
      visual: triPic([shown[0], shown[1], 180 - shown[0] - shown[1]], undefined, [shown[0], shown[1], null], { names: ["D", "E", "F"] }),
      needsVisual: true,
      ...yesNo(similar),
      hint: "Find each triangle's third angle. If two pairs of angles match, AA says they're similar.",
      explain: similar
        ? `△ABC's angles are ${a}°, ${b}°, ${c}°. △DEF's match two of them, so by AA they're similar.`
        : `△ABC's angles are ${a}°, ${b}°, ${c}°. △DEF's third angle is ${180 - shown[0] - shown[1]}°, so they don't all match.`,
    };
  }
  if (kind === 1) {
    const k = pick([2, 3, 1.5]);
    const base = [rand(2, 6), rand(4, 9), rand(6, 12)].map((v) => (k === 1.5 ? v * 2 : v));
    const similar = rand(0, 1) === 1;
    const big = base.map((v) => clean(v * k));
    if (!similar) big[2] += 1;
    return {
      key: `sim-sides-${base.join("-")}-${k}-${similar}`,
      prompt: "Are these two triangles similar?",
      speech: `Triangle A B C has sides ${base.join(", ")}. Triangle D E F has sides ${big.map(ds).join(", ")}. Are they similar?`,
      visual: { kind: "table", header: ["", "Side 1", "Side 2", "Side 3"], rows: [["△ABC", ...base], ["△DEF", ...big]] },
      needsVisual: true,
      ...yesNo(similar),
      hint: "Divide each side of △DEF by the matching side of △ABC. Are all three ratios the same?",
      explain: similar
        ? `Every ratio is ${ds(k)}, so a dilation by ${ds(k)} (and rigid motions) maps one onto the other.`
        : `The ratios are ${ds(k)}, ${ds(k)} and ${ds(big[2] / base[2])} — not all equal, so not similar.`,
    };
  }
  if (kind === 2) {
    const a = rand(30, 80);
    const e = rand(30, 140 - a);
    return {
      key: `sim-ang-${a}-${e}`,
      prompt: `△ABC ∼ △DEF and ∠A = ${a}°. Find ∠F.`,
      speech: `Triangle A B C is similar to triangle D E F. Angle A is ${a} degrees and angle E is ${e} degrees. Find angle F.`,
      visual: triPic([a, e, 180 - a - e], undefined, [null, e, "?"], { names: ["D", "E", "F"] }),
      needsVisual: true,
      unit: "°",
      ...keypad(180 - a - e),
      hint: "Similar triangles have equal matching angles: ∠D = ∠A. Then use the 180° sum.",
      explain: `∠D = ∠A = ${a}°, so ∠F = 180° − ${a}° − ${e}° = ${180 - a - e}°.`,
    };
  }
  if (kind === 3) {
    const k = pick(["2", "3", "4", "1/2", "1/3", "3/2"]);
    const angles = rand(0, 1) === 1;
    const kSq = { "2": "4", "3": "9", "4": "16", "1/2": "1/4", "1/3": "1/9", "3/2": "9/4" }[k]!;
    return {
      key: `sim-keep-${k}-${angles}`,
      prompt: `A shape is dilated by ${k}. What happens to its ${angles ? "angles" : "side lengths"}?`,
      speech: `A shape is dilated by a scale factor of ${say(k)}. What happens to its ${angles ? "angles" : "side lengths"}?`,
      visual: NONE,
      ...(angles
        ? label("They stay the same", [`Multiplied by ${k}`, `Multiplied by ${kSq}`, "They all become 90°"])
        : label(`Multiplied by ${k}`, ["They stay the same", `Multiplied by ${kSq}`, `${k} is added to each`])),
      hint: "A dilation changes size, not shape.",
      explain: angles ? "Angles are kept — that's why the image has the same shape." : `Every length is multiplied by ${k} (areas by ${kSq}).`,
    };
  }
  const yes = ["∠A = ∠D and ∠B = ∠E", "AB/DE = BC/EF = CA/FD", "AB/DE = AC/DF and ∠A = ∠D"];
  const no = ["∠A = ∠D only", "AB = DE", "AB/DE = BC/EF and ∠A = ∠D", "AB + BC = DE + EF"];
  const i = rand(0, yes.length - 1);
  return {
    key: `sim-which-${i}`,
    prompt: "Which fact proves △ABC ∼ △DEF?",
    speech: "Which one fact is enough to prove triangle A B C is similar to triangle D E F?",
    visual: NONE,
    ...label(yes[i], no),
    hint: "Similarity tests: AA, all three side ratios equal (SSS), or two ratios with the angle between them (SAS).",
    explain: `${yes[i]} — ${i === 0 ? "AA similarity" : i === 1 ? "SSS similarity" : "SAS similarity: ∠A is between AB and AC"}.`,
  };
}

/** HSG-SRT.B.5, HSG-MG.A.1 — use similarity to find lengths: shadows, scale models, side splitters. */
export function geoSimilarSides(only?: number[]): Question {
  const kind = kindOf(5, only);
  if (kind === 0) {
    const k = pick([2, 3, 1.5, 2.5, 0.5]);
    const f = k === 2 || k === 3 ? 1 : 2;
    const a = rand(2, 9) * f;
    const b = rand(2, 9) * f;
    const [D, F] = sasAngles(k * b, k * a, rand(40, 110));
    return {
      key: `ss-table-${k}-${a}-${b}`,
      prompt: `△ABC ∼ △DEF, with AB = ${a} and BC = ${b}. Find EF.`,
      speech: `Triangle A B C is similar to triangle D E F. A B is ${a} and D E is ${ds(k * a)}. B C is ${b}. How long is E F?`,
      visual: triPic([D, 180 - D - F, F], ["?", null, clean(k * a)], undefined, { names: ["D", "E", "F"] }),
      needsVisual: true,
      ...keypad(k * b),
      hint: "Find the scale factor from the first row, then use it on BC.",
      explain: `Scale factor ${ds(k * a)} ÷ ${a} = ${ds(k)}. EF = ${b} × ${ds(k)} = ${ds(k * b)}.`,
    };
  }
  if (kind === 1) {
    const h = pick([5, 6]);
    const s = pick([2, 3, 4]);
    const m = rand(2, 12);
    return {
      key: `ss-shadow-${h}-${s}-${m}`,
      prompt: `A ${h} ft person casts a ${s} ft shadow. A tree's shadow is ${s * m} ft. Tree height?`,
      speech: `A ${h} foot person casts a ${s} foot shadow. At the same moment a tree casts a ${s * m} foot shadow. How tall is the tree?`,
      visual: { kind: "table", header: ["", "Height (ft)", "Shadow (ft)"], rows: [["Person", h, s], ["Tree", "?", s * m]] },
      unit: "ft",
      ...keypad(h * m),
      hint: "The sun's rays hit both at the same angle, so the triangles are similar. Compare shadows.",
      explain: `The tree's shadow is ${m} times as long, so the tree is ${m} × ${h} = ${h * m} ft.`,
    };
  }
  if (kind === 2) {
    const a = rand(2, 6);
    const b = rand(2, 9);
    const t = rand(1, 3);
    return {
      key: `ss-split-${a}-${b}-${t}`,
      prompt: `In △ABC, DE ∥ BC. AD = ${a}, DB = ${b}, AE = ${a * t}. Find EC.`,
      speech: `In triangle A B C, D E is parallel to B C. A D is ${a}, D B is ${b}, and A E is ${a * t}. Find E C.`,
      visual: NONE,
      ...choose(b * t, [a * t, b + t, (a * t * a) / b].filter((v) => Number.isInteger(v)), 1, 1),
      hint: "A line parallel to one side splits the other two sides in the same ratio: AD/DB = AE/EC.",
      explain: `${a}/${b} = ${a * t}/EC, so EC = ${b} × ${t} = ${b * t}.`,
    };
  }
  if (kind === 3) {
    const k = rand(2, 4);
    const area = rand(0, 1) === 1;
    const v = rand(3, 12);
    return {
      key: `ss-scale-${k}-${area}-${v}`,
      prompt: area
        ? `Similar triangles, scale factor ${k}. Small area ${v} cm². Big area?`
        : `Similar triangles, scale factor ${k}. Small perimeter ${v} cm. Big perimeter?`,
      speech: area
        ? `Two triangles are similar with scale factor ${k}. The small one has area ${v} square centimeters. What is the area of the big one?`
        : `Two triangles are similar with scale factor ${k}. The small one has perimeter ${v} centimeters. What is the perimeter of the big one?`,
      visual: NONE,
      unit: area ? "cm²" : "cm",
      ...choose(area ? k * k * v : k * v, area ? [k * v, 2 * k * v, k * k * k * v] : [k * k * v, v + k, 2 * v], 1, 1),
      hint: area ? "Area grows in two directions at once: multiply by the scale factor squared." : "Perimeter is a length, so it scales by the scale factor.",
      explain: area ? `${v} × ${k}² = ${v} × ${k * k} = ${k * k * v} cm².` : `${v} × ${k} = ${k * v} cm.`,
    };
  }
  const n = pick([20, 25, 50, 100]);
  const step = { 20: 5, 25: 4, 50: 2, 100: 1 }[n]!;
  const L = step * rand(Math.ceil(4 / step), Math.floor(40 / step));
  return {
    key: `ss-model-${n}-${L}`,
    prompt: `A 1 : ${n} scale model of a building is ${L} cm tall. Real height in meters?`,
    speech: `A scale model of a building uses a scale of 1 to ${n}. The model is ${L} centimeters tall. How tall is the real building, in meters?`,
    visual: NONE,
    unit: "m",
    ...keypad((L * n) / 100),
    hint: `Every real length is ${n} times the model length. Then 100 cm = 1 m.`,
    explain: `${L} × ${n} = ${L * n} cm = ${ds((L * n) / 100)} m.`,
  };
}

const SIM_PROOF: { step: string; reason: string }[] = [
  { step: "∠A is in both △ADE and △ABC, so ∠A = ∠A.", reason: "Reflexive property" },
  { step: "DE ∥ BC, so ∠ADE = ∠ABC.", reason: "Corresponding angles are congruent" },
  { step: "∠A = ∠A and ∠ADE = ∠ABC, so △ADE ∼ △ABC.", reason: "AA similarity" },
  { step: "△ADE ∼ △ABC, so AD/AB = AE/AC.", reason: "Similar triangles have proportional sides" },
  { step: "AC/AB = AD/AC, so AC² = AB · AD.", reason: "Cross-multiplying a proportion" },
  { step: "AC² + BC² = AB · AD + AB · DB = AB(AD + DB) = AB².", reason: "Segment addition: AD + DB = AB" },
];

/** Pairs (p, q) whose product (or p(p + q)) is a perfect square. */
function squarePairs(f: (p: number, q: number) => number, maxRoot: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let p = 1; p <= 20; p++)
    for (let q = 1; q <= 32; q++) {
      const v = f(p, q);
      const r = Math.round(Math.sqrt(v));
      if (p !== q && r * r === v && r <= maxRoot) out.push([p, q, r]);
    }
  return out;
}
const MEAN_PAIRS = squarePairs((p, q) => p * q, 24);
const LEG_PAIRS = squarePairs((p, q) => p * (p + q), 30);

/** HSG-SRT.B.4 — prove theorems about triangles with similarity: side splitter, Pythagoras by similarity. */
export function geoSimilarityProofs(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const i = rand(0, SIM_PROOF.length - 1);
    const { step, reason } = SIM_PROOF[i];
    return {
      key: `sp-why-${i}`,
      prompt: `${step} Which reason?`,
      speech: `In a proof: ${say(step)} Which reason justifies this step?`,
      visual: NONE,
      ...label(
        reason,
        SIM_PROOF.filter((o) => o.reason !== reason).map((o) => o.reason),
      ),
      hint: "Is the step about matching angles, about similar triangles, or about algebra with lengths?",
      explain: `${reason}.`,
    };
  }
  if (kind === 1) {
    const [p, q, h] = pick(MEAN_PAIRS);
    return {
      key: `sp-mean-${p}-${q}`,
      prompt: `The altitude to the hypotenuse splits it into ${p} and ${q}. How long is the altitude?`,
      speech: `In a right triangle, the altitude to the hypotenuse splits the hypotenuse into pieces of ${p} and ${q}. How long is the altitude?`,
      visual: NONE,
      ...choose(h, [(p + q) / 2, p * q, q - p].filter((v) => Number.isInteger(v) && v > 0), 1, 1),
      hint: "The altitude makes two similar triangles, so p/h = h/q. That means h² = p × q.",
      explain: `h² = ${p} × ${q} = ${p * q}, so h = ${h}.`,
    };
  }
  if (kind === 2) {
    const [p, q, a] = pick(LEG_PAIRS);
    return {
      key: `sp-leg-${p}-${q}`,
      prompt: `Altitude CD splits hypotenuse AB into AD = ${p}, DB = ${q}. Find AC.`,
      speech: `In right triangle A B C, the altitude from C splits the hypotenuse into A D equals ${p} and D B equals ${q}. Find leg A C.`,
      visual: NONE,
      ...choose(a, [Math.round(Math.sqrt(p * q)), p + q, Math.round(Math.sqrt(q * (p + q)))], 1, 1),
      hint: "△ACD ∼ △ABC, so AD/AC = AC/AB. That gives AC² = AD × AB.",
      explain: `AB = ${p + q}. AC² = ${p} × ${p + q} = ${p * (p + q)}, so AC = ${a}.`,
    };
  }
  const ad = rand(2, 6);
  const d = rand(2, 8);
  const u = rand(1, 3);
  return {
    key: `sp-split-${ad}-${d}-${u}`,
    prompt: `DE ∥ BC with D on AB. AD = ${ad}, AB = ${ad + d}, DE = ${ad * u}. Find BC.`,
    speech: `D E is parallel to B C, with D on A B and E on A C. A D is ${ad}, A B is ${ad + d}, and D E is ${ad * u}. Find B C.`,
    visual: NONE,
    ...choose((ad + d) * u, [d * u, ad * u + d, ad + d], 1, 1),
    hint: "△ADE ∼ △ABC by AA, so AD/AB = DE/BC.",
    explain: `${ad}/${ad + d} = ${ad * u}/BC. The scale factor is ${ad + d}/${ad}, so BC = ${ad * u} × ${ad + d}/${ad} = ${(ad + d) * u}.`,
  };
}

/** HSG-SRT.B.4, C.8 — the Pythagorean theorem and its converse; special right triangles. */
export function geoPythagorean(only?: number[]): Question {
  const kind = kindOf(6, only);
  if (kind <= 1) {
    const [a, b, c] = triple();
    const hyp = kind === 0;
    return {
      key: `py-${hyp ? "hyp" : "leg"}-${a}-${b}`,
      prompt: hyp ? "Find the hypotenuse." : "Find the missing leg.",
      speech: hyp ? `The legs are ${a} and ${b}. How long is the hypotenuse?` : `One leg is ${b} and the hypotenuse is ${c}. How long is the other leg?`,
      equation: hyp ? [{ pow: [a, 2] }, "+", { pow: [b, 2] }, "=", "c²"] : [{ pow: [b, 2] }, "+", "a²", "=", { pow: [c, 2] }],
      visual: { kind: "righttri", a: hyp ? a : "?", b, c: hyp ? "?" : c },
      ...keypad(hyp ? c : a),
      hint: hyp ? "a² + b² = c². Add the squares of the legs, then take the square root." : "Subtract: a² = c² − b². Then take the square root.",
      explain: hyp ? `${a * a} + ${b * b} = ${c * c}, and √${c * c} = ${c}.` : `${c * c} − ${b * b} = ${a * a}, and √${a * a} = ${a}.`,
    };
  }
  if (kind === 2) {
    let a = rand(2, 12);
    let b = rand(2, 12);
    while (Number.isInteger(Math.hypot(a, b))) {
      a = rand(2, 12);
      b = rand(2, 12);
    }
    const c = r1(Math.hypot(a, b));
    return {
      key: `py-dec-${a}-${b}`,
      prompt: "Find the hypotenuse to the nearest tenth.",
      speech: `The legs are ${a} and ${b}. Find the hypotenuse, to the nearest tenth.`,
      visual: { kind: "righttri", a, b, c: "?" },
      ...keypad(c),
      hint: "a² + b² = c². Then take the square root and round.",
      explain: `${a * a} + ${b * b} = ${a * a + b * b}, and √${a * a + b * b} ≈ ${ds(c)}.`,
    };
  }
  if (kind === 3) {
    const n = rand(2, 12);
    const t = rand(0, 2);
    if (t === 0) {
      return {
        key: `py-45-${n}`,
        prompt: `A 45°-45°-90° triangle has legs of ${n}. Hypotenuse?`,
        speech: `A 45 45 90 triangle has legs of ${n}. How long is the hypotenuse?`,
        visual: { kind: "righttri", a: n, b: n, c: "?", angle: 45 },
        ...label(`${n}√2`, [`${2 * n}`, `${n}√3`, `${2 * n}√2`, `${n * n}`]),
        hint: "Use a² + b² = c² with both legs equal: c² = 2n².",
        explain: `c² = ${n}² + ${n}² = 2 × ${n * n}, so c = ${n}√2.`,
      };
    }
    const long = t === 1;
    return {
      key: `py-30-${n}-${long}`,
      prompt: `A 30°-60°-90° triangle's short leg is ${n}. ${long ? "Long leg" : "Hypotenuse"}?`,
      speech: `A 30 60 90 triangle has a short leg of ${n}. How long is the ${long ? "longer leg" : "hypotenuse"}?`,
      visual: { kind: "righttri", a: n, b: long ? "?" : null, c: long ? null : "?", angle: 30 },
      ...(long ? label(`${n}√3`, [`${n}√2`, `${2 * n}`, `${2 * n}√3`]) : label(`${2 * n}`, [`${n}√3`, `${n}√2`, `${3 * n}`])),
      hint: "A 30-60-90 triangle is half of an equilateral triangle: the hypotenuse is twice the short leg.",
      explain: long ? `Hypotenuse = ${2 * n}. Long leg² = ${4 * n * n} − ${n * n} = ${3 * n * n}, so it's ${n}√3.` : `Half an equilateral triangle: the hypotenuse is 2 × ${n} = ${2 * n}.`,
    };
  }
  if (kind === 4) {
    const [a, b, c] = triple(29);
    return {
      key: `py-ladder-${a}-${b}`,
      prompt: `A ${c} ft ladder's foot is ${b} ft from a wall. How high does it reach?`,
      speech: `A ${c} foot ladder leans on a wall. Its foot is ${b} feet from the wall. How high up the wall does it reach?`,
      visual: { kind: "righttri", a: "?", b, c, unit: "ft" },
      unit: "ft",
      ...keypad(a),
      hint: "The ladder is the hypotenuse. Height² = ladder² − distance².",
      explain: `${c * c} − ${b * b} = ${a * a}, so the height is ${a} ft.`,
    };
  }
  const [a, b, c0] = triple(29);
  const shift = pick([-1, 0, 1]);
  const c = c0 + shift;
  const kindName = shift === 0 ? "right" : shift < 0 ? "acute" : "obtuse";
  return {
    key: `py-conv-${a}-${b}-${c}`,
    prompt: `A triangle has sides ${a}, ${b} and ${c}. What kind is it?`,
    speech: `A triangle has sides ${a}, ${b} and ${c}. Is it right, acute or obtuse?`,
    visual: NONE,
    ...label(kindName, ["right", "acute", "obtuse"]),
    hint: "Compare a² + b² with c² (c is the longest side). Equal: right. c² smaller: acute. c² bigger: obtuse.",
    explain: `${a}² + ${b}² = ${a * a + b * b} and ${c}² = ${c * c}. ${shift === 0 ? "Equal, so it's right." : shift < 0 ? "c² is smaller, so it's acute." : "c² is bigger, so it's obtuse."}`,
  };
}

/* ================================================ C. Right-triangle trigonometry */

const TRIG_NAME = { sin: "sine", cos: "cosine", tan: "tangent" } as const;

/** HSG-SRT.C.6 — sine, cosine and tangent as side ratios that come from similar right triangles. */
export function trigRatios(): Question {
  const kind = rand(0, 4);
  const [o, a, h] = triple();
  const visual: Visual = { kind: "righttri", a: o, b: a, c: h, angle: "?" };
  if (kind <= 2) {
    const fn = (["sin", "cos", "tan"] as const)[kind];
    const right = { sin: frac(o, h), cos: frac(a, h), tan: frac(o, a) }[fn];
    const wrong = [frac(o, h), frac(a, h), frac(o, a), frac(a, o), frac(h, o), frac(h, a)];
    return {
      key: `tr-${fn}-${o}-${a}`,
      prompt: `Find ${fn} θ.`,
      speech: `Find the ${TRIG_NAME[fn]} of theta, as a fraction.`,
      visual,
      needsVisual: true,
      ...label(right, wrong),
      hint: "From θ: opposite is across from it, adjacent is beside it, hypotenuse is the longest side. SOH-CAH-TOA.",
      explain: `${fn} θ = ${fn === "sin" ? `opposite/hypotenuse = ${o}/${h}` : fn === "cos" ? `adjacent/hypotenuse = ${a}/${h}` : `opposite/adjacent = ${o}/${a}`} = ${right}.`,
    };
  }
  if (kind === 3) {
    const base = pick(TRIPLES.slice(0, 6).filter((t) => gcd(t[0], t[1]) === 1));
    const [so, sa, sh] = rand(0, 1) ? base : [base[1], base[0], base[2]];
    const m = rand(2, 5);
    return {
      key: `tr-sim-${so}-${sa}-${m}`,
      prompt: `Small triangle: opposite ${so}, hypotenuse ${sh}. Same θ, hypotenuse ${sh * m}. Opposite?`,
      speech: `A small right triangle has opposite side ${so} and hypotenuse ${sh}. A bigger one has the same angle theta and hypotenuse ${sh * m}. How long is its opposite side?`,
      visual: { kind: "righttri", a: "?", b: null, c: sh * m, angle: "?" },
      ...choose(so * m, [sa * m, so + sh * m - sh, so * m + 1], 1, 1),
      hint: "Same angle means similar triangles, so sin θ = opposite/hypotenuse is the same ratio in both.",
      explain: `sin θ = ${so}/${sh} in both. Opposite = ${so}/${sh} × ${sh * m} = ${so * m}.`,
    };
  }
  const fn = pick(["sin", "cos", "tan"] as const);
  const value = { sin: `${o}/${h}`, cos: `${a}/${h}`, tan: `${o}/${a}` }[fn];
  return {
    key: `tr-name-${fn}-${o}-${a}`,
    prompt: `In this triangle, which ratio equals ${value}?`,
    speech: `In this triangle, which trig ratio of theta equals ${say(value)}?`,
    visual,
    needsVisual: true,
    ...label(`${fn} θ`, ["sin θ", "cos θ", "tan θ"]),
    hint: "Which sides are in the fraction? Name them from θ's point of view.",
    explain: `${value} is ${fn === "sin" ? "opposite/hypotenuse" : fn === "cos" ? "adjacent/hypotenuse" : "opposite/adjacent"}, so it's ${fn} θ.`,
  };
}

const DECIMAL_SINES = [0.6, 0.8, 0.28, 0.96, 0.5, 0.25, 0.7, 0.35, 0.9, 0.15, 0.42, 0.64];

/** HSG-SRT.C.7 — sine and cosine of complementary angles. */
export function trigComplementary(): Question {
  const kind = rand(0, 4);
  if (kind <= 1) {
    const a = rand(5, 85);
    const [f, g] = kind === 0 ? ["sin", "cos"] : ["cos", "sin"];
    return {
      key: `comp-${kind}-${a}`,
      prompt: `${f} ${a}° = ${g} ?°`,
      speech: `${TRIG_NAME[f as "sin"]} of ${a} degrees equals the ${TRIG_NAME[g as "sin"]} of what angle?`,
      visual: { kind: "righttri", a: null, b: null, c: null, angle: a },
      unit: "°",
      ...choose(90 - a, [a, 180 - a, 90 + a].filter((v) => v !== 90 - a), 5, 1),
      hint: "In a right triangle, the side opposite one acute angle is adjacent to the other.",
      explain: `The acute angles add to 90°, so ${f} ${a}° = ${g} ${90 - a}°.`,
    };
  }
  if (kind === 2) {
    const [o, a, h] = triple();
    const askCos = rand(0, 1) === 1;
    return {
      key: `comp-tri-${o}-${a}-${askCos}`,
      prompt: askCos ? `Right △ABC, ∠C = 90°. sin A = ${frac(o, h)}. Find cos B.` : `Right △ABC, ∠C = 90°. cos A = ${frac(a, h)}. Find sin B.`,
      speech: askCos
        ? `In right triangle A B C, angle C is 90 degrees, and sine of A is ${say(frac(o, h))}. What is cosine of B?`
        : `In right triangle A B C, angle C is 90 degrees, and cosine of A is ${say(frac(a, h))}. What is sine of B?`,
      visual: NONE,
      ...label(askCos ? frac(o, h) : frac(a, h), askCos ? [frac(a, h), frac(o, a), frac(h, o)] : [frac(o, h), frac(a, o), frac(h, a)]),
      hint: "A and B are complementary. The side opposite A is adjacent to B.",
      explain: askCos ? `The side opposite A is adjacent to B, so cos B = sin A = ${frac(o, h)}.` : `The side adjacent to A is opposite B, so sin B = cos A = ${frac(a, h)}.`,
    };
  }
  if (kind === 3) {
    const a = rand(1, 3);
    const c = rand(1, 3);
    const x = rand(5, Math.floor(80 / (a + c)));
    const b = 90 - (a + c) * x;
    const t = (k: number) => (k === 1 ? "x" : `${k}x`);
    return {
      key: `comp-eq-${a}-${c}-${x}`,
      prompt: `sin(${t(a)} + ${b})° = cos(${t(c)})°, both acute. Find x.`,
      speech: `The sine of ${t(a)} plus ${b} degrees equals the cosine of ${t(c)} degrees, and both angles are acute. Find x.`,
      visual: NONE,
      ...keypad(x),
      hint: "If sin P = cos Q for acute angles, then P + Q = 90°.",
      explain: `(${t(a)} + ${b}) + ${t(c)} = 90, so ${a + c}x = ${90 - b} and x = ${x}.`,
    };
  }
  const v = pick(DECIMAL_SINES);
  const sinFirst = rand(0, 1) === 1;
  return {
    key: `comp-dec-${v}-${sinFirst}`,
    prompt: sinFirst ? `sin θ = ${v}. What is cos(90° − θ)?` : `cos θ = ${v}. What is sin(90° − θ)?`,
    speech: sinFirst ? `Sine of theta is ${v}. What is the cosine of 90 degrees minus theta?` : `Cosine of theta is ${v}. What is the sine of 90 degrees minus theta?`,
    visual: NONE,
    ...choose(v, [r2(1 - v), r2(Math.sqrt(1 - v * v)), r2(v / 2), r2(-v)], 0.1),
    hint: "θ and 90° − θ are complementary angles.",
    explain: `${sinFirst ? "cos(90° − θ) = sin θ" : "sin(90° − θ) = cos θ"} = ${v}.`,
  };
}

/** HSG-SRT.C.8 — solve right triangles: find sides with trig ratios. */
export function trigSolveSides(): Question {
  const t = rand(20, 70);
  const L = rand(5, 30);
  const c = rand(0, 5);
  const cases = [
    { give: "c", find: "a", value: L * sinD(t), how: `sin ${t}° = a/${L}, so a = ${L} × sin ${t}°` },
    { give: "c", find: "b", value: L * cosD(t), how: `cos ${t}° = b/${L}, so b = ${L} × cos ${t}°` },
    { give: "b", find: "a", value: L * tanD(t), how: `tan ${t}° = a/${L}, so a = ${L} × tan ${t}°` },
    { give: "a", find: "c", value: L / sinD(t), how: `sin ${t}° = ${L}/c, so c = ${L} ÷ sin ${t}°` },
    { give: "b", find: "c", value: L / cosD(t), how: `cos ${t}° = ${L}/c, so c = ${L} ÷ cos ${t}°` },
    { give: "a", find: "b", value: L / tanD(t), how: `tan ${t}° = ${L}/b, so b = ${L} ÷ tan ${t}°` },
  ];
  const k = cases[c];
  const ans = r1(k.value);
  const side = (s: string) => (s === k.give ? L : s === k.find ? "?" : null);
  const names: Record<string, string> = { a: "opposite side", b: "adjacent side", c: "hypotenuse" };
  return {
    key: `ss-${c}-${t}-${L}`,
    prompt: `Find the ${names[k.find]} to the nearest tenth.`,
    speech: `The angle is ${t} degrees and the ${names[k.give]} is ${L}. Find the ${names[k.find]}, to the nearest tenth.`,
    visual: { kind: "righttri", a: side("a"), b: side("b"), c: side("c"), angle: t },
    needsVisual: true,
    ...keypad(ans),
    hint: "Name the side you know and the side you want, from θ's view. Choose SOH, CAH or TOA to link them.",
    explain: `${k.how} ≈ ${ds(ans)}.`,
  };
}

/** HSG-SRT.C.8 — solve right triangles: find angles with inverse trig. */
export function trigFindAngles(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const pair = rand(0, 2);
    let o = rand(3, 20);
    let a = rand(3, 20);
    let h = rand(o + 2, o + 20);
    if (pair === 2) {
      a = rand(3, 20);
      h = rand(a + 2, a + 20);
    }
    const theta = pair === 0 ? toDeg(Math.atan(o / a)) : pair === 1 ? toDeg(Math.asin(o / h)) : toDeg(Math.acos(a / h));
    const other = kind === 1;
    const ans = Math.round(other ? 90 - theta : theta);
    const vis: Visual =
      pair === 0 ? { kind: "righttri", a: o, b: a, c: null, angle: "?" } : pair === 1 ? { kind: "righttri", a: o, b: null, c: h, angle: "?" } : { kind: "righttri", a: null, b: a, c: h, angle: "?" };
    const fn = ["tan", "sin", "cos"][pair];
    const ratio = pair === 0 ? `${o}/${a}` : pair === 1 ? `${o}/${h}` : `${a}/${h}`;
    return {
      key: `fa-${pair}-${pair === 0 ? `${o}-${a}` : pair === 1 ? `${o}-${h}` : `${a}-${h}`}-${other}`,
      prompt: other ? "Find the OTHER acute angle, to the nearest degree." : "Find θ to the nearest degree.",
      speech: other ? "Find the other acute angle, not theta, to the nearest degree." : "Find angle theta, to the nearest degree.",
      visual: vis,
      needsVisual: true,
      unit: "°",
      ...keypad(ans),
      hint: other ? "Find θ with an inverse trig function, then use θ + other = 90°." : "Pick the ratio that uses the two sides you know, then use its inverse: sin⁻¹, cos⁻¹ or tan⁻¹.",
      explain: `θ = ${fn}⁻¹(${ratio}) ≈ ${r1(theta)}°${other ? `, so the other angle ≈ 90° − ${r1(theta)}° ≈ ${ans}°` : ` ≈ ${ans}°`}.`,
    };
  }
  const [o, a, h] = triple();
  const which = rand(0, 2);
  const correct = [`tan⁻¹(${o}/${a})`, `sin⁻¹(${o}/${h})`, `cos⁻¹(${a}/${h})`][which];
  const shown: Visual =
    which === 0 ? { kind: "righttri", a: o, b: a, c: null, angle: "?" } : which === 1 ? { kind: "righttri", a: o, b: null, c: h, angle: "?" } : { kind: "righttri", a: null, b: a, c: h, angle: "?" };
  const wrong =
    which === 0
      ? [`tan⁻¹(${a}/${o})`, `sin⁻¹(${o}/${a})`, `cos⁻¹(${o}/${a})`]
      : which === 1
        ? [`cos⁻¹(${o}/${h})`, `sin⁻¹(${h}/${o})`, `tan⁻¹(${o}/${h})`]
        : [`sin⁻¹(${a}/${h})`, `cos⁻¹(${h}/${a})`, `tan⁻¹(${a}/${h})`];
  return {
    key: `fa-which-${which}-${o}-${a}`,
    prompt: "Which expression gives θ?",
    speech: "Which expression gives the angle theta?",
    visual: shown,
    needsVisual: true,
    ...label(correct, wrong),
    hint: "Which two sides are labelled? Opposite and adjacent: tan. Opposite and hypotenuse: sin. Adjacent and hypotenuse: cos.",
    explain: `The labelled sides are ${which === 0 ? "opposite and adjacent" : which === 1 ? "opposite and hypotenuse" : "adjacent and hypotenuse"}, so θ = ${correct}.`,
  };
}

/** HSG-SRT.C.8, HSG-MG.A.1 — angles of elevation and depression in real situations. */
export function trigElevation(): Question {
  const kind = rand(0, 5);
  const t = rand(15, 70);
  if (kind === 0) {
    const d = rand(10, 60);
    const h = r1(d * tanD(t));
    return {
      key: `el-tree-${t}-${d}`,
      prompt: `${d} m from a tree, the angle of elevation to its top is ${t}°. Height?`,
      speech: `You stand ${d} meters from a tree. The angle of elevation to the top is ${t} degrees. How tall is the tree, to the nearest tenth of a meter? Ignore your own height.`,
      visual: { kind: "righttri", a: "?", b: d, c: null, angle: t, unit: "m" },
      unit: "m",
      ...keypad(h),
      hint: "You know the side next to the angle and want the side across from it. That's tangent.",
      explain: `tan ${t}° = h/${d}, so h = ${d} × tan ${t}° ≈ ${ds(h)} m.`,
    };
  }
  if (kind === 1) {
    const L = rand(20, 100);
    const h = r1(L * sinD(t));
    return {
      key: `el-kite-${t}-${L}`,
      prompt: `A kite string is ${L} m long at ${t}° to the ground. Kite height?`,
      speech: `A kite's string is ${L} meters long and makes a ${t} degree angle with the ground. How high is the kite, to the nearest tenth? Ignore the holder's height.`,
      visual: { kind: "righttri", a: "?", b: null, c: L, angle: t, unit: "m" },
      unit: "m",
      ...keypad(h),
      hint: "The string is the hypotenuse; the height is opposite the angle. That's sine.",
      explain: `sin ${t}° = h/${L}, so h = ${L} × sin ${t}° ≈ ${ds(h)} m.`,
    };
  }
  if (kind === 2) {
    const H = rand(20, 80);
    const d = r1(H / tanD(t));
    return {
      key: `el-light-${t}-${H}`,
      prompt: `From a ${H} m lighthouse, the angle of depression to a boat is ${t}°. Distance?`,
      speech: `From the top of a ${H} meter lighthouse, the angle of depression to a boat is ${t} degrees. How far is the boat from the base, to the nearest tenth?`,
      visual: { kind: "righttri", a: H, b: "?", c: null, angle: t, unit: "m" },
      unit: "m",
      ...keypad(d),
      hint: "The angle of depression equals the angle of elevation from the boat (alternate interior angles).",
      explain: `tan ${t}° = ${H}/d, so d = ${H} ÷ tan ${t}° ≈ ${ds(d)} m.`,
    };
  }
  if (kind === 3) {
    const t2 = rand(4, 12);
    const rise = rand(1, 4);
    const len = r1(rise / sinD(t2));
    return {
      key: `el-ramp-${t2}-${rise}`,
      prompt: `A ramp rises ${rise} m at ${t2}° to the ground. How long is the ramp?`,
      speech: `A ramp rises ${rise} meters and makes a ${t2} degree angle with the ground. How long is the ramp, to the nearest tenth of a meter?`,
      visual: { kind: "righttri", a: rise, b: null, c: "?", angle: t2, unit: "m" },
      unit: "m",
      ...keypad(len),
      hint: "The rise is opposite the angle; the ramp is the hypotenuse. sin = opposite/hypotenuse.",
      explain: `sin ${t2}° = ${rise}/L, so L = ${rise} ÷ sin ${t2}° ≈ ${ds(len)} m.`,
    };
  }
  if (kind === 4) {
    const L = rand(10, 30);
    const H = rand(Math.ceil(L / 2), L - 1);
    const ang = Math.round(toDeg(Math.asin(H / L)));
    return {
      key: `el-ladder-${L}-${H}`,
      prompt: `A ${L} ft ladder reaches ${H} ft up a wall. Angle with the ground?`,
      speech: `A ${L} foot ladder reaches ${H} feet up a wall. What angle does it make with the ground, to the nearest degree?`,
      visual: { kind: "righttri", a: H, b: null, c: L, angle: "?", unit: "ft" },
      unit: "°",
      ...keypad(ang),
      hint: "You know opposite and hypotenuse, so use sin⁻¹.",
      explain: `θ = sin⁻¹(${H}/${L}) ≈ ${ang}°.`,
    };
  }
  const t3 = rand(5, 25);
  const d = rand(2, 15);
  const alt = r1(d * sinD(t3));
  return {
    key: `el-plane-${t3}-${d}`,
    prompt: `A plane climbs at ${t3}° for ${d} km of flight. How high does it rise?`,
    speech: `A plane takes off and climbs at a steady ${t3} degree angle. After flying ${d} kilometers, how high is it, to the nearest tenth of a kilometer?`,
    visual: { kind: "righttri", a: "?", b: null, c: d, angle: t3, unit: "km" },
    unit: "km",
    ...keypad(alt),
    hint: "The flight path is the hypotenuse; the height is opposite the climb angle.",
    explain: `h = ${d} × sin ${t3}° ≈ ${ds(alt)} km.`,
  };
}

/** HSG-SRT.D.9 — area of a triangle = ½ab·sin C. */
export function trigArea(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const C = pick([30, 150, 90]);
    const a = rand(2, 10) * 2;
    const b = rand(2, 10) * 2;
    const area = C === 90 ? (a * b) / 2 : (a * b) / 4;
    return {
      key: `ar-exact-${C}-${a}-${b}`,
      prompt: "Find the area of the triangle.",
      speech: `Two sides of a triangle are ${a} and ${b} centimeters, with a ${C} degree angle between them. What is the area?`,
      visual: triPic(sasAngles(a, b, C), [a, b, null], [null, null, C], { unit: "cm" }),
      needsVisual: true,
      unit: "cm²",
      ...choose(area, [a * b, (a * b) / 2, area * 2].filter((v) => v !== area), 2, 1),
      hint: `Area = ½ab·sin C. sin ${C}° = ${C === 90 ? "1" : "½"}.`,
      explain: `½ × ${a} × ${b} × sin ${C}° = ½ × ${a * b} × ${C === 90 ? "1" : "½"} = ${area} cm².`,
    };
  }
  if (kind === 1) {
    const a = rand(4, 20);
    const b = rand(4, 20);
    const C = rand(20, 160);
    const area = r1(0.5 * a * b * sinD(C));
    return {
      key: `ar-dec-${a}-${b}-${C}`,
      prompt: "Area of the triangle, to the nearest tenth?",
      speech: `In a triangle, sides a and b are ${a} and ${b}, and the angle C between them is ${C} degrees. Find the area, to the nearest tenth.`,
      visual: triPic(sasAngles(a, b, C), [a, b, null], [null, null, C]),
      needsVisual: true,
      ...keypad(area),
      hint: "Area = ½ · a · b · sin C, with C the angle between sides a and b.",
      explain: `½ × ${a} × ${b} × sin ${C}° ≈ ${ds(area)}.`,
    };
  }
  if (kind === 2) {
    const a = rand(3, 15);
    const b = rand(3, 15);
    const C = rand(20, 160);
    return {
      key: `ar-form-${a}-${b}-${C}`,
      prompt: "Which expression gives the area?",
      speech: `A triangle has sides ${a} and ${b} with a ${C} degree angle between them. Which expression gives its area?`,
      visual: triPic(sasAngles(a, b, C), [a, b, null], [null, null, C]),
      needsVisual: true,
      ...label(`½ · ${a} · ${b} · sin ${C}°`, [`½ · ${a} · ${b} · cos ${C}°`, `${a} · ${b} · sin ${C}°`, `½ · ${a} · ${b}`]),
      hint: "Drop a height from the end of one side: h = (that side) · sin C. Then area = ½ · base · h.",
      explain: `Height = ${a} · sin ${C}°, so area = ½ · ${b} · ${a} · sin ${C}°.`,
    };
  }
  if (kind === 3) {
    const a = rand(2, 10) * 2;
    const b = rand(2, 10) * 2;
    const area = (a * b) / 4;
    return {
      key: `ar-back-${a}-${b}`,
      prompt: `The area is ${area} cm². Find side b.`,
      speech: `A triangle has area ${area} square centimeters. Side a is ${a} centimeters and the angle C between sides a and b is 30 degrees. Find side b.`,
      visual: triPic(sasAngles(a, b, 30), [a, "?", null], [null, null, 30], { unit: "cm" }),
      needsVisual: true,
      unit: "cm",
      ...choose(b, [b / 2, b * 2, (2 * area) / a].filter((v) => Number.isInteger(v) && v !== b), 1, 1),
      hint: "Area = ½ · a · b · sin 30° = ¼ · a · b. Solve for b.",
      explain: `${area} = ¼ × ${a} × b, so b = 4 × ${area} ÷ ${a} = ${b} cm.`,
    };
  }
  const a = rand(4, 20);
  const C = pick([30, 90, rand(35, 80)]);
  const h = C === 30 ? a / 2 : C === 90 ? a : r1(a * sinD(C));
  return {
    key: `ar-height-${a}-${C}`,
    prompt: `Side a = ${a} meets base b at C = ${C}°. Height to b${C % 30 ? ", nearest tenth" : ""}?`,
    speech: `Side a is ${a} long and meets the base b at an angle C of ${C} degrees. How high is the triangle above base b${C % 30 ? ", to the nearest tenth" : ""}?`,
    visual: { kind: "righttri", a: "?", b: null, c: a, angle: C === 90 ? null : C },
    ...keypad(h),
    hint: "The height and side a make a right triangle with angle C. Height = a · sin C.",
    explain: `h = ${a} × sin ${C}° = ${ds(h)}. That's why area = ½ · b · a · sin C.`,
  };
}

/** HSG-SRT.D.10, D.11 — the law of sines, and using it to solve triangles. */
export function trigLawSines(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const A = rand(30, 80);
    const B = rand(30, 150 - A);
    const a = rand(5, 25);
    const b = r1((a * sinD(B)) / sinD(A));
    return {
      key: `ls-aas-${A}-${B}-${a}`,
      prompt: "Find side b to the nearest tenth.",
      speech: `In triangle A B C, angle A is ${A} degrees, angle B is ${B} degrees, and side a is ${a}. Find side b, to the nearest tenth.`,
      visual: triPic([A, B, 180 - A - B], [a, "?", null], [A, B, null]),
      needsVisual: true,
      ...keypad(b),
      hint: "Law of sines: a/sin A = b/sin B. Each side over the sine of its opposite angle.",
      explain: `b = ${a} × sin ${B}° ÷ sin ${A}° ≈ ${ds(b)}.`,
    };
  }
  if (kind === 1) {
    const A = rand(30, 80);
    const B = rand(30, 150 - A);
    const C = 180 - A - B;
    const c = rand(5, 25);
    const a = r1((c * sinD(A)) / sinD(C));
    return {
      key: `ls-asa-${A}-${B}-${c}`,
      prompt: "Find side a to the nearest tenth.",
      speech: `In triangle A B C, angle A is ${A} degrees, angle B is ${B} degrees, and side c is ${c}. Find side a, to the nearest tenth.`,
      visual: triPic([A, B, C], ["?", null, c], [A, B, null]),
      needsVisual: true,
      ...keypad(a),
      hint: "First find ∠C with the 180° sum. Then a/sin A = c/sin C.",
      explain: `∠C = 180° − ${A}° − ${B}° = ${C}°. a = ${c} × sin ${A}° ÷ sin ${C}° ≈ ${ds(a)}.`,
    };
  }
  if (kind === 2) {
    const A = rand(30, 80);
    const a = rand(10, 25);
    const b = rand(4, a - 2);
    const Bx = toDeg(Math.asin((b * sinD(A)) / a));
    const B = Math.round(Bx);
    return {
      key: `ls-ang-${A}-${a}-${b}`,
      prompt: "Find ∠B to the nearest degree.",
      speech: `In triangle A B C, angle A is ${A} degrees, side a is ${a}, and side b is ${b}. Find angle B, to the nearest degree.`,
      visual: triPic([A, Bx, 180 - A - Bx], [a, b, null], [A, "?", null]),
      needsVisual: true,
      unit: "°",
      ...keypad(B),
      hint: "sin B / b = sin A / a. Solve for sin B, then use sin⁻¹. (b < a, so B is acute.)",
      explain: `sin B = ${b} × sin ${A}° ÷ ${a} ≈ ${r2(Math.sin(B * RAD))}, so B ≈ ${B}°.`,
    };
  }
  if (kind === 3) {
    const cases: [string, string][] = [
      ["two angles and any side", "Law of sines"],
      ["two sides and the angle between them", "Law of cosines"],
      ["all three sides", "Law of cosines"],
      ["two sides and an angle that isn't between them", "Law of sines"],
    ];
    const i = rand(0, 3);
    const n = rand(1, 9);
    return {
      key: `ls-which-${i}-${n}`,
      prompt: `Triangle ${n}: you know ${cases[i][0]}. Which law do you start with?`,
      speech: `In a triangle with no right angle, you know ${cases[i][0]}. Which law do you start with?`,
      visual: NONE,
      ...label(cases[i][1], ["Law of sines", "Law of cosines", "Pythagorean theorem"]),
      hint: "The law of sines needs a full pair: a side AND its opposite angle.",
      explain:
        cases[i][1] === "Law of sines"
          ? `With ${cases[i][0]}, you have a side and its opposite angle, so the law of sines works.`
          : `With ${cases[i][0]}, there's no side-angle pair yet, so start with the law of cosines.`,
    };
  }
  const d = rand(5, 20);
  const al = rand(40, 75);
  const be = rand(40, 75);
  const dist = r1((d * sinD(be)) / sinD(180 - al - be));
  return {
    key: `ls-fire-${d}-${al}-${be}`,
    prompt: "Towers A and B spot fire F. How far is A from F, to the nearest tenth?",
    speech: `Two ranger towers A and B are ${d} kilometers apart. The angle between the line to tower B and the line to a fire is ${al} degrees at A and ${be} degrees at B. How far is the fire from tower A, to the nearest tenth?`,
    visual: triPic([al, be, 180 - al - be], [null, "?", d], [al, be, null], { names: ["A", "B", "F"], unit: "km" }),
    needsVisual: true,
    unit: "km",
    ...keypad(dist),
    hint: "The fire's angle is 180° minus the other two. The side from A to the fire is opposite B's angle.",
    explain: `Fire angle = ${180 - al - be}°. distance = ${d} × sin ${be}° ÷ sin ${180 - al - be}° ≈ ${ds(dist)} km.`,
  };
}

const COS60: [number, number, number][] = [
  [3, 8, 7],
  [5, 8, 7],
  [8, 15, 13],
  [5, 21, 19],
  [7, 15, 13],
  [16, 21, 19],
];
const COS120: [number, number, number][] = [
  [3, 5, 7],
  [7, 8, 13],
  [5, 16, 19],
  [6, 10, 14],
  [9, 15, 21],
];

/** HSG-SRT.D.10, D.11 — the law of cosines, and using it to solve triangles. */
export function trigLawCosines(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const sixty = rand(0, 1) === 1;
    const [a, b, c] = pick(sixty ? COS60 : COS120);
    const C = sixty ? 60 : 120;
    return {
      key: `lc-exact-${a}-${b}-${C}`,
      prompt: "Find side c.",
      speech: `In triangle A B C, a is ${a}, b is ${b}, and the angle C between them is ${C} degrees. Find c.`,
      visual: triPic(sasAngles(a, b, C), [a, b, "?"], [null, null, C]),
      needsVisual: true,
      ...keypad(c),
      hint: `c² = a² + b² − 2ab·cos C, and cos ${C}° = ${sixty ? "½" : "−½"}.`,
      explain: `c² = ${a * a} + ${b * b} ${sixty ? "−" : "+"} ${a * b} = ${c * c}, so c = ${c}.`,
    };
  }
  if (kind === 1) {
    const a = rand(4, 20);
    const b = rand(4, 20);
    const C = rand(25, 150);
    const c = r1(Math.sqrt(a * a + b * b - 2 * a * b * cosD(C)));
    return {
      key: `lc-dec-${a}-${b}-${C}`,
      prompt: "Find side c to the nearest tenth.",
      speech: `In triangle A B C, a is ${a}, b is ${b}, and angle C is ${C} degrees. Find c, to the nearest tenth.`,
      visual: triPic(sasAngles(a, b, C), [a, b, "?"], [null, null, C]),
      needsVisual: true,
      ...keypad(c),
      hint: "Two sides and the angle between them: c² = a² + b² − 2ab·cos C.",
      explain: `c² = ${a * a} + ${b * b} − 2·${a}·${b}·cos ${C}° ≈ ${r1(c * c)}, so c ≈ ${ds(c)}.`,
    };
  }
  if (kind === 2) {
    let a = 0;
    let b = 0;
    let c = 0;
    do {
      a = rand(4, 15);
      b = rand(4, 15);
      c = rand(Math.max(a, b) + 1, a + b - 1);
    } while (c * c === a * a + b * b);
    const C = Math.round(toDeg(Math.acos((a * a + b * b - c * c) / (2 * a * b))));
    return {
      key: `lc-sss-${a}-${b}-${c}`,
      prompt: "Find the largest angle, to the nearest degree.",
      speech: `A triangle has sides ${a}, ${b} and ${c}. Find its largest angle, to the nearest degree.`,
      visual: triPic(sssAngles(a, b, c), [a, b, c], [null, null, "?"]),
      needsVisual: true,
      unit: "°",
      ...keypad(C),
      hint: "The largest angle is opposite the longest side. cos C = (a² + b² − c²) ÷ 2ab.",
      explain: `cos C = (${a * a} + ${b * b} − ${c * c}) ÷ ${2 * a * b} ≈ ${r2((a * a + b * b - c * c) / (2 * a * b))}, so C ≈ ${C}°.`,
    };
  }
  if (kind === 3) {
    const s1 = rand(8, 25);
    const s2 = rand(8, 25);
    const ang = rand(30, 140);
    const d = r1(Math.sqrt(s1 * s1 + s2 * s2 - 2 * s1 * s2 * cosD(ang)));
    return {
      key: `lc-ships-${s1}-${s2}-${ang}`,
      prompt: "Two ships sail from port P. How far apart are they, to the nearest tenth?",
      speech: `Two ships leave the same port. One sails ${s1} kilometers and the other ${s2} kilometers, on paths ${ang} degrees apart. How far apart are they, to the nearest tenth?`,
      visual: triPic([ang, ...sasAngles(s2, s1, ang).slice(0, 2)] as [number, number, number], ["?", s2, s1], [ang, null, null], { names: ["P", "A", "B"], unit: "km" }),
      needsVisual: true,
      unit: "km",
      ...keypad(d),
      hint: "The two paths are sides with the angle between them. Use the law of cosines.",
      explain: `d² = ${s1}² + ${s2}² − 2·${s1}·${s2}·cos ${ang}°, so d ≈ ${ds(d)} km.`,
    };
  }
  const obtuse = rand(0, 2);
  const C = [90, rand(100, 150), rand(30, 80)][obtuse];
  return {
    key: `lc-idea-${obtuse}-${C}`,
    prompt: `In c² = a² + b² − 2ab·cos C, if C = ${C}°, then c² is…`,
    speech: `In the law of cosines, c squared equals a squared plus b squared minus 2 a b cosine C. If C is ${C} degrees, how does c squared compare with a squared plus b squared?`,
    visual: triPic([(180 - C) / 2, (180 - C) / 2, C], ["a", "b", "c"], [null, null, C]),
    ...label(["equal to a² + b²", "greater than a² + b²", "less than a² + b²"][obtuse], ["equal to a² + b²", "greater than a² + b²", "less than a² + b²"]),
    hint: "What's the sign of cos C? Positive for acute angles, 0 at 90°, negative for obtuse.",
    explain:
      obtuse === 0
        ? "cos 90° = 0, so c² = a² + b² — the Pythagorean theorem is a special case."
        : obtuse === 1
          ? `cos ${C}° is negative, so subtracting 2ab·cos C adds: c² > a² + b².`
          : `cos ${C}° is positive, so c² < a² + b².`,
  };
}

/* ================================================================ D. Circles */

/** HSG-C.A.1 — all circles are similar. */
export function geoCirclesSimilar(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const k = pick([2, 3, 4, 1.5, 2.5]);
    const r = rand(1, 6) * (Number.isInteger(k) ? 1 : 2);
    const R = clean(r * k);
    return {
      key: `cs-k-${r}-${k}`,
      prompt: `A dilation maps a circle of radius ${r} onto one of radius ${ds(R)}. Scale factor?`,
      speech: `After moving its center, a dilation maps a circle of radius ${r} onto a circle of radius ${say(ds(R))}. What is the scale factor?`,
      visual: NONE,
      ...keypad(k),
      hint: "Scale factor = new radius ÷ old radius.",
      explain: `${ds(R)} ÷ ${r} = ${ds(k)}.`,
    };
  }
  if (kind === 1) {
    const k = rand(2, 5);
    const r = rand(1, 5);
    const area = rand(0, 1) === 1;
    return {
      key: `cs-ratio-${k}-${r}-${area}`,
      prompt: `Radii ${r} and ${k * r}. The big circle's ${area ? "area" : "circumference"} is how many times the small one's?`,
      speech: `Two circles have radii ${r} and ${k * r}. The big circle's ${area ? "area" : "circumference"} is how many times the small circle's?`,
      visual: NONE,
      ...choose(area ? k * k : k, area ? [k, 2 * k] : [k * k, 2 * k], 1, 1),
      hint: area ? "Area = πr². Squaring the radius squares the scale factor." : "Circumference = 2πr, a length, so it scales like the radius.",
      explain: area ? `Scale factor ${k}, so area grows by ${k}² = ${k * k}.` : `Scale factor ${k}, so the circumference is ${k} times as long.`,
    };
  }
  if (kind === 2) {
    const r = rand(2, 9);
    let R = rand(2, 12);
    while (R === r) R = rand(2, 12);
    return {
      key: `cs-map-${r}-${R}`,
      prompt: `How do you map a circle of radius ${r} onto one of radius ${R}?`,
      speech: `How can you map a circle of radius ${r} onto a circle of radius ${R} with transformations?`,
      visual: NONE,
      ...label(`Translate center to center, then dilate by ${frac(R, r)}`, [
        `Translate center to center, then dilate by ${frac(r, R)}`,
        `Translate center to center, then dilate by ${R - r}`,
        "You can't — circles of different sizes aren't similar",
      ]),
      hint: "A translation lines up the centers. A dilation fixes the size: new radius ÷ old radius.",
      explain: `Translate so the centers match, then dilate by ${R}/${r}. Since this always works, all circles are similar.`,
    };
  }
  const r = rand(2, 5);
  const k = rand(2, 4);
  const L = rand(2, 9);
  return {
    key: `cs-arc-${r}-${k}-${L}`,
    prompt: `Same central angle: arc ${L} cm on a circle of radius ${r}. Arc on radius ${k * r}?`,
    speech: `The same central angle cuts an arc of ${L} centimeters on a circle of radius ${r}. How long is its arc on a circle of radius ${k * r}?`,
    visual: NONE,
    unit: "cm",
    ...choose(k * L, [L + k * r - r, k * k * L, L], 1, 1),
    hint: "The circles are similar, so arc lengths scale by the same factor as the radii.",
    explain: `The radius is ${k} times as big, so the arc is ${k} × ${L} = ${k * L} cm.`,
  };
}

const seg = (from: string, to: string, label?: Mark) => ({ from, to, ...(label !== undefined ? { label } : {}) });
const CIRCLE_REASONS: { step: string; reason: string; pic: Visual }[] = [
  {
    step: "AB is a diameter and C is on the circle, so ∠ACB = 90°.",
    reason: "An angle inscribed in a semicircle is right",
    pic: { kind: "circleparts", points: [{ name: "A", at: 180 }, { name: "B", at: 0 }, { name: "C", at: 120 }], center: true, segments: [seg("A", "B"), seg("A", "C"), seg("B", "C")] },
  },
  {
    step: "∠ACB and ∠ADB both intercept arc AB, so ∠ACB = ∠ADB.",
    reason: "Inscribed angles on the same arc are equal",
    pic: {
      kind: "circleparts",
      points: [{ name: "A", at: 210 }, { name: "B", at: 330 }, { name: "C", at: 60 }, { name: "D", at: 125 }],
      segments: [seg("C", "A"), seg("C", "B"), seg("D", "A"), seg("D", "B")],
      angles: [{ at: "C", from: "A", to: "B", label: null }, { at: "D", from: "A", to: "B", label: null }],
    },
  },
  {
    step: "∠AOB is central and ∠ACB is inscribed on arc AB: ∠AOB = 2∠ACB.",
    reason: "A central angle is twice an inscribed angle",
    pic: {
      kind: "circleparts",
      points: [{ name: "A", at: 215 }, { name: "B", at: 325 }, { name: "C", at: 90 }],
      segments: [seg("O", "A"), seg("O", "B"), seg("C", "A"), seg("C", "B")],
      angles: [{ at: "O", from: "A", to: "B", label: null }, { at: "C", from: "A", to: "B", label: null }],
    },
  },
  {
    step: "OA = OB, so △AOB is isosceles.",
    reason: "All radii of a circle are equal",
    pic: { kind: "circleparts", points: [{ name: "A", at: 20 }, { name: "B", at: 140 }], segments: [seg("O", "A"), seg("O", "B"), seg("A", "B")] },
  },
  {
    step: "Line ℓ touches the circle only at T, so OT ⊥ ℓ.",
    reason: "A tangent is perpendicular to the radius",
    pic: { kind: "circleparts", points: [{ name: "T", at: 60 }], segments: [seg("O", "T")], tangents: [{ at: "T", label: "ℓ" }] },
  },
];

/** Points A and B with an arc of `arc`° from A to B (counterclockwise), and C (and D) on the rest of the circle. */
function inscribedPts(arc: number, others = ["C"]): { name: string; at: number }[] {
  const a0 = 270 - arc / 2;
  const rest = 360 - arc;
  return [
    { name: "A", at: a0 },
    { name: "B", at: a0 + arc },
    ...others.map((name, i) => ({ name, at: a0 + arc + (rest * (i + 1)) / (others.length + 1) })),
  ];
}

/** HSG-C.A.2 — central, inscribed and circumscribed angles; inscribed angles on a diameter are right. */
export function geoCircleAngles(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const arc = rand(20, 150) * 2;
    return {
      key: `ca-ins-${arc}`,
      prompt: "How big is inscribed angle ACB?",
      speech: `An inscribed angle intercepts an arc of ${arc} degrees. What is the measure of the inscribed angle?`,
      visual: {
        kind: "circleparts",
        points: inscribedPts(arc),
        segments: [seg("C", "A"), seg("C", "B")],
        angles: [{ at: "C", from: "A", to: "B", label: "?" }],
        arcs: [{ from: "A", to: "B", label: arc }],
      },
      needsVisual: true,
      unit: "°",
      ...choose(arc / 2, [arc, 2 * arc, 180 - arc / 2].filter((v) => v > 0 && v < 360), 5, 1),
      hint: "An inscribed angle is half its intercepted arc.",
      explain: `½ × ${arc}° = ${arc / 2}°.`,
    };
  }
  if (kind === 1) {
    const ins = rand(15, 85);
    return {
      key: `ca-cen-${ins}`,
      prompt: "Find central angle AOB.",
      speech: `Inscribed angle A C B is ${ins} degrees. Find the central angle A O B on the same arc.`,
      visual: {
        kind: "circleparts",
        points: inscribedPts(2 * ins),
        segments: [seg("C", "A"), seg("C", "B"), seg("O", "A"), seg("O", "B")],
        angles: [
          { at: "C", from: "A", to: "B", label: ins },
          { at: "O", from: "A", to: "B", label: "?" },
        ],
      },
      needsVisual: true,
      unit: "°",
      ...choose(2 * ins, [ins, ins / 2, 180 - ins].filter((v) => Number.isInteger(v)), 5, 1),
      hint: "The central angle equals its arc; the inscribed angle is half of that arc.",
      explain: `Arc AB = 2 × ${ins}° = ${2 * ins}°, and the central angle equals the arc: ${2 * ins}°.`,
    };
  }
  if (kind === 2) {
    const a = rand(20, 70);
    return {
      key: `ca-semi-${a}`,
      prompt: "AB is a diameter. Find ∠CBA.",
      speech: `A B is a diameter and C is on the circle. Angle C A B is ${a} degrees. Find angle C B A.`,
      visual: {
        kind: "circleparts",
        points: [{ name: "A", at: 180 }, { name: "B", at: 0 }, { name: "C", at: 2 * a }],
        center: true,
        segments: [seg("A", "B"), seg("A", "C"), seg("B", "C")],
        angles: [
          { at: "A", from: "C", to: "B", label: a },
          { at: "B", from: "C", to: "A", label: "?" },
        ],
      },
      needsVisual: true,
      unit: "°",
      ...keypad(90 - a),
      hint: "∠ACB is inscribed in a semicircle. What does that make it?",
      explain: `∠ACB = 90° (inscribed in a semicircle), so ∠CBA = 180° − 90° − ${a}° = ${90 - a}°.`,
    };
  }
  if (kind === 3) {
    const y = rand(15, 80);
    return {
      key: `ca-same-${y}`,
      prompt: "How big is ∠ACB?",
      speech: `Points C and D are on the circle, on the same side of chord A B. Angle A D B is ${y} degrees. What is angle A C B?`,
      visual: {
        kind: "circleparts",
        points: inscribedPts(2 * y, ["C", "D"]),
        segments: [seg("C", "A"), seg("C", "B"), seg("D", "A"), seg("D", "B")],
        angles: [
          { at: "D", from: "A", to: "B", label: y },
          { at: "C", from: "A", to: "B", label: "?" },
        ],
      },
      needsVisual: true,
      unit: "°",
      ...choose(y, [2 * y, 180 - y, 90 - y].filter((v) => v > 0), 5, 1),
      hint: "Both angles intercept the same arc AB.",
      explain: `Both are half of arc AB, so ∠ACB = ∠ADB = ${y}°.`,
    };
  }
  const i = rand(0, CIRCLE_REASONS.length - 1);
  const { step, reason } = CIRCLE_REASONS[i];
  return {
    key: `ca-why-${i}`,
    prompt: `${step} Which reason?`,
    speech: `In a proof: ${say(step).replace(/ℓ/g, "L")} Which reason justifies this step?`,
    visual: CIRCLE_REASONS[i].pic,
    ...label(
      reason,
      CIRCLE_REASONS.filter((o) => o.reason !== reason).map((o) => o.reason),
    ),
    hint: "Is the angle at the center, on the circle, or where a line touches the circle?",
    explain: `${reason}.`,
  };
}

const CHORD_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [6, 8, 10],
  [8, 15, 17],
  [7, 24, 25],
  [9, 12, 15],
];

/** HSG-C.A.2, A.4 — tangents (perpendicular to the radius, equal from one point), chords; construct a tangent. */
export function geoTangentsChords(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    let [r, t, d] = triple(29);
    while (d / r > 3) [r, t, d] = triple(29);
    const findT = rand(0, 1) === 1;
    const tAt = rand(60, 120);
    return {
      key: `tc-len-${r}-${t}-${findT}`,
      prompt: findT ? "PT is tangent at T. How long is PT?" : "PT is tangent at T. How far is P from the center O?",
      speech: findT
        ? `A circle has radius ${r}. Point P is ${d} from the center O. P T is tangent to the circle at T. How long is P T?`
        : `A circle has radius ${r}. A tangent from point P touches the circle at T, and P T is ${t}. How far is P from the center?`,
      visual: {
        kind: "circleparts",
        points: [{ name: "T", at: tAt }, { name: "P", at: tAt - toDeg(Math.acos(r / d)), r: d / r }],
        segments: [seg("O", "T", r), seg("T", "P", findT ? "?" : t), seg("O", "P", findT ? d : "?")],
        angles: [{ at: "T", from: "O", to: "P", label: null }],
      },
      needsVisual: true,
      ...keypad(findT ? t : d),
      hint: "The radius OT is perpendicular to the tangent, so △OTP has a right angle at T.",
      explain: findT ? `${d}² − ${r}² = ${t * t}, so PT = ${t}.` : `${r}² + ${t}² = ${d * d}, so OP = ${d}.`,
    };
  }
  if (kind === 1) {
    const x = rand(2, 9);
    const a = rand(2, 5);
    const b = rand(1, 12);
    return {
      key: `tc-equal-${x}-${a}-${b}`,
      prompt: "PA and PB are tangent to the circle. Find x.",
      speech: `From point P, two tangents touch a circle at A and B. P A is ${a} x plus ${b}, and P B is ${a * x + b}. Find x.`,
      equation: [{ x: a }, "+", b, "=", a * x + b],
      answerLine: ["x", "=", "?"],
      visual: {
        kind: "circleparts",
        points: [{ name: "P", at: 0, r: 2 }, { name: "A", at: 60 }, { name: "B", at: 300 }],
        segments: [seg("P", "A", `${a}x + ${b}`), seg("P", "B", a * x + b)],
      },
      needsVisual: true,
      ...keypad(x),
      hint: "Two tangents from the same outside point are the same length.",
      explain: `PA = PB: ${a}x + ${b} = ${a * x + b}, so x = ${x}.`,
    };
  }
  if (kind === 2) {
    const c = rand(40, 130);
    return {
      key: `tc-angle-${c}`,
      prompt: "PA and PB are tangents. Find ∠APB.",
      speech: `Two tangents from point P touch a circle with center O at A and B. Angle A O B is ${c} degrees. Find angle A P B.`,
      visual: {
        kind: "circleparts",
        points: [{ name: "A", at: c / 2 }, { name: "B", at: -c / 2 }, { name: "P", at: 0, r: 1 / cosD(c / 2) }],
        segments: [seg("O", "A"), seg("O", "B"), seg("P", "A"), seg("P", "B")],
        angles: [
          { at: "O", from: "A", to: "B", label: c },
          { at: "P", from: "A", to: "B", label: "?" },
          { at: "A", from: "O", to: "P", label: null },
          { at: "B", from: "O", to: "P", label: null },
        ],
      },
      needsVisual: true,
      unit: "°",
      ...choose(180 - c, [c, c / 2, 360 - c].filter((v) => Number.isInteger(v) && v < 360), 5, 1),
      hint: "Quadrilateral OAPB has right angles at A and B. Its angles add to 360°.",
      explain: `360° − 90° − 90° − ${c}° = ${180 - c}°.`,
    };
  }
  if (kind === 3) {
    const [d, half, r] = pick(CHORD_TRIPLES);
    const phi = toDeg(Math.acos(d / r));
    return {
      key: `tc-chord-${d}-${r}`,
      prompt: "How long is chord AB?",
      speech: `A circle has radius ${r}. A chord is ${d} units from the center. How long is the chord?`,
      visual: {
        kind: "circleparts",
        // The foot of the perpendicular is left unnamed so its label can't sit on top of the chord's "?".
        points: [{ name: "A", at: 270 - phi }, { name: "B", at: 270 + phi }, { name: "", at: 270, r: d / r }],
        segments: [seg("A", "B", "?"), seg("O", "", d), seg("O", "B", r)],
        angles: [{ at: "", from: "O", to: "B", label: null }],
      },
      needsVisual: true,
      ...choose(2 * half, [half, r * 2, 2 * half + 2], 1, 1),
      hint: "The perpendicular from the center bisects the chord. Find half the chord with the Pythagorean theorem.",
      explain: `Half the chord: √(${r}² − ${d}²) = ${half}. The whole chord is ${2 * half}.`,
    };
  }
  const steps: { q: string; a: string; wrong: string[]; pic?: Visual }[] = [
    {
      q: "Tangent from P: draw the circle on diameter OP; it meets circle O at T. Why is PT tangent?",
      a: "∠OTP is inscribed in a semicircle, so it's 90°",
      wrong: ["OT = TP", "T is the midpoint of OP", "PT is a radius"],
      pic: { kind: "circleparts", points: [{ name: "T", at: 60 }, { name: "P", at: 0, r: 2 }], segments: [seg("O", "P"), seg("O", "T"), seg("P", "T")] },
    },
    {
      q: "To draw the tangent at T on a circle, draw the line through T that is…",
      a: "perpendicular to radius OT",
      wrong: ["parallel to radius OT", "through the center", "at 45° to OT"],
      pic: { kind: "circleparts", points: [{ name: "T", at: 60 }], segments: [seg("O", "T")] },
    },
    {
      q: "From an outside point, how many tangents can you draw to a circle?",
      a: "2",
      wrong: ["1", "0", "Infinitely many"],
    },
  ];
  const i = rand(0, steps.length - 1);
  return {
    key: `tc-con-${i}`,
    prompt: steps[i].q,
    speech: steps[i].q.replace(/…$/, " what?"),
    visual: steps[i].pic ?? NONE,
    ...label(steps[i].a, steps[i].wrong),
    hint: "Tangent lines meet the radius at a right angle.",
    explain: `${steps[i].a}.`,
  };
}

/**
 * Quadrilateral ABCD inscribed in a circle (counterclockwise), whose angle at vertex `v` (0 = A, 1 = B) is `deg`.
 * That angle takes in the two arcs that don't touch it, so those add to 2·deg. Labels the angles at v and v + 2.
 */
function cyclicQuad(v: number, deg: number, here: Mark, opposite: Mark): Visual {
  const room = Math.min(deg, 180 - deg) / 90;
  const d = Math.round(rand(-15, 15) * room);
  const e = Math.round(rand(-15, 15) * room);
  const arcs = [0, 0, 0, 0];
  arcs[(v + 1) % 4] = deg + d;
  arcs[(v + 2) % 4] = deg - d;
  arcs[(v + 3) % 4] = 180 - deg + e;
  arcs[v] = 180 - deg - e;
  const names = ["A", "B", "C", "D"];
  let at = 110;
  const points = names.map((name, k) => {
    const p = { name, at };
    at += arcs[k];
    return p;
  });
  const corner = (k: number, label: Mark) => ({ at: names[k], from: names[(k + 3) % 4], to: names[(k + 1) % 4], label });
  return {
    kind: "circleparts",
    points,
    segments: names.map((n, k) => seg(n, names[(k + 1) % 4])),
    angles: [corner(v, here), corner((v + 2) % 4, opposite)],
  };
}

/** HSG-C.A.3 — inscribed and circumscribed circles of a triangle; inscribed quadrilaterals. */
export function geoInscribedShapes(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const a = rand(50, 130);
    const opp = pick([
      ["A", "C"],
      ["B", "D"],
    ]);
    return {
      key: `is-quad-${a}-${opp[0]}`,
      prompt: `ABCD is inscribed in a circle. Find ∠${opp[1]}.`,
      speech: `Quadrilateral A B C D is inscribed in a circle. Angle ${opp[0]} is ${a} degrees. Find angle ${opp[1]}.`,
      visual: cyclicQuad(opp[0] === "A" ? 0 : 1, a, a, "?"),
      needsVisual: true,
      unit: "°",
      ...choose(180 - a, [a, 360 - a, 90].filter((v) => v !== 180 - a), 5, 1),
      hint: "Opposite angles of a quadrilateral inscribed in a circle are supplementary.",
      explain: `∠${opp[0]} and ∠${opp[1]} are opposite, so ∠${opp[1]} = 180° − ${a}° = ${180 - a}°.`,
    };
  }
  if (kind === 1) {
    const x = rand(10, 30);
    const a = rand(1, 3);
    const c = rand(1, 3);
    const b = rand(5, 30);
    const d = 180 - (a + c) * x - b;
    if (d <= 0) return geoInscribedShapes();
    const t = (k: number) => (k === 1 ? "x" : `${k}x`);
    return {
      key: `is-alg-${x}-${a}-${b}-${c}`,
      prompt: "ABCD is inscribed in a circle. Find x.",
      speech: `Quadrilateral A B C D is inscribed in a circle. Angle A is ${t(a)} plus ${b} degrees, and angle C is ${t(c)} plus ${d} degrees. Find x.`,
      equation: [{ x: a }, "+", b, "+", { x: c }, "+", d, "=", 180],
      answerLine: ["x", "=", "?"],
      visual: cyclicQuad(0, a * x + b, `(${t(a)} + ${b})°`, `(${t(c)} + ${d})°`),
      needsVisual: true,
      ...keypad(x),
      hint: "∠A and ∠C are opposite, so they add to 180°.",
      explain: `${a + c}x + ${b + d} = 180, so x = ${x}.`,
    };
  }
  if (kind === 2) {
    const items: { q: string; a: string }[] = [
      { q: "The circumscribed circle's center is where the triangle's ___ meet.", a: "perpendicular bisectors" },
      { q: "The inscribed circle's center is where the triangle's ___ meet.", a: "angle bisectors" },
      { q: "The circumcenter is the same distance from all three ___.", a: "vertices" },
      { q: "The incenter is the same distance from all three ___.", a: "sides" },
    ];
    const i = rand(0, items.length - 1);
    return {
      key: `is-center-${i}`,
      prompt: items[i].q,
      speech: items[i].q.replace("___", "blank") + " Fill in the blank.",
      visual: NONE,
      ...label(items[i].a, i < 2 ? ["perpendicular bisectors", "angle bisectors", "medians", "altitudes"] : ["vertices", "sides", "midpoints", "angles"]),
      hint: "Perpendicular bisectors are equally far from endpoints; angle bisectors are equally far from the sides.",
      explain: `${items[i].q.replace("___", items[i].a)}`,
    };
  }
  if (kind === 3) {
    const [a, b, c] = triple();
    return {
      key: `is-circum-${a}-${b}`,
      prompt: "Right triangle ABC sits in its circumscribed circle. Find the radius OC.",
      speech: `A right triangle has legs ${a} and ${b}, and hypotenuse ${c}. What is the radius of the circle through all three vertices?`,
      visual: {
        kind: "circleparts",
        points: [{ name: "A", at: 180 }, { name: "B", at: 0 }, { name: "C", at: 2 * toDeg(Math.atan(a / b)) }],
        segments: [seg("A", "B"), seg("B", "C", a), seg("A", "C", b), seg("O", "C", "?")],
        angles: [{ at: "C", from: "A", to: "B", label: null }],
      },
      needsVisual: true,
      ...keypad(c / 2),
      hint: "The right angle is inscribed in a semicircle, so the hypotenuse is a diameter.",
      explain: `The hypotenuse ${c} is a diameter, so the radius is ${ds(c / 2)}.`,
    };
  }
  if (kind === 4) {
    const [a, b, c] = triple();
    return {
      key: `is-in-${a}-${b}`,
      prompt: `Right triangle ${a}-${b}-${c}. Inscribed circle radius r = (a + b − c) ÷ 2?`,
      speech: `A right triangle has legs ${a} and ${b} and hypotenuse ${c}. The inscribed circle's radius is a plus b minus c, over 2. What is it?`,
      visual: { kind: "righttri", a, b, c },
      ...keypad((a + b - c) / 2),
      hint: "Tangent segments from each corner are equal. Add the legs and take away the hypotenuse, then halve.",
      explain: `(${a} + ${b} − ${c}) ÷ 2 = ${(a + b - c) / 2}.`,
    };
  }
  const r = rand(2, 12);
  const toBig = rand(0, 1) === 1;
  return {
    key: `is-equi-${r}-${toBig}`,
    prompt: toBig ? "Equilateral △ABC. OM is the inscribed radius. Find the circumscribed radius OA." : "Equilateral △ABC. OA is the circumscribed radius. Find the inscribed radius OM.",
    speech: toBig
      ? `In an equilateral triangle, the inscribed circle has radius ${r}. What is the radius of the circumscribed circle?`
      : `In an equilateral triangle, the circumscribed circle has radius ${2 * r}. What is the radius of the inscribed circle?`,
    visual: {
      kind: "circleparts",
      points: [{ name: "A", at: 90 }, { name: "B", at: 210 }, { name: "C", at: 330 }, { name: "M", at: 270, r: 0.5 }],
      segments: [seg("A", "B"), seg("B", "C"), seg("C", "A"), seg("O", "A", toBig ? "?" : 2 * r), seg("O", "M", toBig ? r : "?")],
      angles: [{ at: "M", from: "O", to: "C", label: null }],
    },
    needsVisual: true,
    ...choose(toBig ? 2 * r : r, [toBig ? 3 * r : 4 * r, toBig ? r : 2 * r / 3, r + 2].filter((v) => Number.isInteger(v)), 1, 1),
    hint: "In an equilateral triangle, both centers are the centroid, which is ⅔ of the way down each median.",
    explain: toBig ? `The circumradius is twice the inradius: 2 × ${r} = ${2 * r}.` : `The inradius is half the circumradius: ${r}.`,
  };
}

const ARC_ANGLES = [30, 45, 60, 90, 120, 135, 150, 180, 210, 240, 270, 300];

/** HSG-C.B.5 — arc length is proportional to the radius; radian measure as the constant of proportionality. */
export function geoArcLength(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const t = pick(ARC_ANGLES);
    const unitR = 180 / gcd(t, 180);
    const r = unitR * rand(1, Math.max(1, Math.floor(12 / unitR)));
    const coef = (t * r) / 180;
    return {
      key: `al-pi-${t}-${r}`,
      prompt: "How long is arc AB, in terms of π?",
      speech: `A central angle of ${t} degrees in a circle of radius ${r} centimeters. How long is its arc, in terms of pi?`,
      visual: sectorPic(t, r, t, "?", "cm"),
      needsVisual: true,
      unit: "π cm",
      ...keypad(coef),
      hint: `The arc is ${t}/360 of the circumference 2πr.`,
      explain: `${t}/360 × 2π × ${r} = ${coef}π cm.`,
    };
  }
  if (kind === 1) {
    const r = rand(2, 12);
    const th = pick([0.5, 1, 1.5, 2, 2.5, 3]);
    const findS = rand(0, 1) === 1;
    const s = clean(r * th);
    return {
      key: `al-rad-${r}-${th}-${findS}`,
      prompt: findS ? "How long is arc AB?" : "What is the central angle, in radians?",
      speech: findS
        ? `A circle has radius ${r} centimeters. A central angle of ${say(ds(th))} radians cuts an arc. How long is it?`
        : `A circle has radius ${r} centimeters. An arc is ${say(ds(s))} centimeters long. What is the central angle in radians?`,
      visual: findS ? sectorPic(toDeg(th), r, `${ds(th)} rad`, "?", "cm") : sectorPic(toDeg(th), r, "?", `${ds(s)} cm`, "cm"),
      needsVisual: true,
      unit: findS ? "cm" : "radians",
      ...keypad(findS ? s : th),
      hint: "In radians, arc length = radius × angle: s = rθ.",
      explain: findS ? `s = ${r} × ${ds(th)} = ${ds(s)} cm.` : `θ = s ÷ r = ${ds(s)} ÷ ${r} = ${ds(th)} radians.`,
    };
  }
  if (kind === 2) {
    const L = rand(2, 9);
    const k = rand(2, 5);
    return {
      key: `al-prop-${L}-${k}`,
      prompt: `An arc is ${L} cm. Same central angle, radius ${k} times as big. New arc?`,
      speech: `An arc is ${L} centimeters long. Keep the central angle the same but make the radius ${k} times as big. How long is the new arc?`,
      visual: NONE,
      unit: "cm",
      ...choose(k * L, [L, k * k * L, L + k], 1, 1),
      hint: "For a fixed angle, the arc is the same fraction of a bigger circumference. Arc length ∝ radius.",
      explain: `The arc grows in proportion to the radius: ${k} × ${L} = ${k * L} cm. That constant ratio (arc ÷ radius) is the radian measure.`,
    };
  }
  if (kind === 3) {
    const t = rand(20, 340);
    const r = rand(2, 20);
    const s = r1((t / 360) * 2 * Math.PI * r);
    return {
      key: `al-dec-${t}-${r}`,
      prompt: "How long is arc AB, to the nearest tenth?",
      speech: `How long is the arc cut by a ${t} degree central angle in a circle of radius ${r} meters, to the nearest tenth?`,
      visual: sectorPic(t, r, t, "?", "m"),
      needsVisual: true,
      unit: "m",
      ...keypad(s),
      hint: "Arc = (angle ÷ 360) × 2πr.",
      explain: `${t}/360 × 2π × ${r} ≈ ${ds(s)} m.`,
    };
  }
  const r = rand(2, 9);
  const m = rand(1, 4);
  return {
    key: `al-def-${r}-${m}`,
    prompt: "What is the central angle AOB?",
    speech: `A circle has radius ${r} centimeters. An arc is ${m * r} centimeters long. What is the central angle?`,
    visual: sectorPic(toDeg(m), r, "?", `${m * r} cm`, "cm"),
    needsVisual: true,
    ...label(`${m} radian${m === 1 ? "" : "s"}`, [`${m * r} radians`, `${m}°`, `${m}π radians`, `${m * r}°`]),
    hint: "One radian is the angle whose arc is exactly one radius long.",
    explain: `The arc is ${m} radius${m === 1 ? "" : "es"} long, so the angle is ${m} radian${m === 1 ? "" : "s"}.`,
  };
}

/** HSG-C.B.5 — area of a sector. */
export function geoSectorArea(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    let t = 0;
    let r = 0;
    do {
      t = pick(ARC_ANGLES);
      r = rand(2, 12);
    } while ((t * r * r) % 360 !== 0);
    const coef = (t * r * r) / 360;
    return {
      key: `sa-pi-${t}-${r}`,
      prompt: "Area of sector AOB, in terms of π?",
      speech: `A sector has a central angle of ${t} degrees and radius ${r} centimeters. What is its area, in terms of pi?`,
      visual: sectorPic(t, r, t, null, "cm"),
      needsVisual: true,
      unit: "π cm²",
      ...keypad(coef),
      hint: `The sector is ${t}/360 of the whole circle's area πr².`,
      explain: `${t}/360 × π × ${r}² = ${coef}π cm².`,
    };
  }
  if (kind === 1) {
    const r = rand(2, 10);
    const th = pick([1, 2, 3, 0.5, 1.5]);
    const area = clean((r * r * th) / 2);
    return {
      key: `sa-rad-${r}-${th}`,
      prompt: "Area of sector AOB?",
      speech: `A sector has radius ${r} meters and a central angle of ${say(ds(th))} radians. What is its area?`,
      visual: sectorPic(toDeg(th), r, `${ds(th)} rad`, null, "m"),
      needsVisual: true,
      unit: "m²",
      ...keypad(area),
      hint: "In radians the sector is θ/(2π) of the circle, so area = ½r²θ.",
      explain: `½ × ${r}² × ${ds(th)} = ${ds(area)} m².`,
    };
  }
  if (kind === 2) {
    let t = 0;
    let r = 0;
    do {
      t = pick(ARC_ANGLES);
      r = rand(2, 12);
    } while ((t * r * r) % 360 !== 0);
    const coef = (t * r * r) / 360;
    return {
      key: `sa-back-${t}-${r}`,
      prompt: `A sector of a circle with radius ${r} has area ${coef}π. Central angle?`,
      speech: `A sector of a circle with radius ${r} has area ${coef} pi. What is its central angle, in degrees?`,
      visual: NONE,
      unit: "°",
      ...keypad(t),
      hint: `Compare with the whole circle: ${r * r}π. What fraction of 360° is that?`,
      explain: `${coef}π ÷ ${r * r}π = ${frac(coef, r * r)}, and ${frac(coef, r * r)} of 360° is ${t}°.`,
    };
  }
  if (kind === 3) {
    let r = 0;
    let n = 0;
    do {
      r = pick([6, 8, 10, 12, 9]);
      n = pick([4, 6, 8, 12, 3, 9]);
    } while ((r * r) % n !== 0);
    return {
      key: `sa-pizza-${r}-${n}`,
      prompt: `A pizza of radius ${r} in is cut into ${n} equal slices. Area of one slice?`,
      speech: `A round pizza with radius ${r} inches is cut into ${n} equal slices. What is the area of one slice, in terms of pi?`,
      visual: { kind: "circle", r, show: "radius", unit: "in" },
      unit: "π in²",
      ...keypad((r * r) / n),
      hint: "Find the whole pizza's area πr², then share it equally.",
      explain: `π × ${r}² = ${r * r}π, and ${r * r}π ÷ ${n} = ${(r * r) / n}π in².`,
    };
  }
  const t = rand(20, 340);
  const r = rand(2, 15);
  const area = r1((t / 360) * Math.PI * r * r);
  return {
    key: `sa-dec-${t}-${r}`,
    prompt: "Area of sector AOB, to the nearest tenth?",
    speech: `Find the area of a sector with a ${t} degree angle and radius ${r} centimeters, to the nearest tenth.`,
    visual: sectorPic(t, r, t, null, "cm"),
    needsVisual: true,
    unit: "cm²",
    ...keypad(area),
    hint: "Area = (angle ÷ 360) × πr².",
    explain: `${t}/360 × π × ${r}² ≈ ${ds(area)} cm².`,
  };
}

/** "(x − 3)²", "(y + 2)²", "x²". */
const sqTerm = (v: string, c: number) => (c === 0 ? `${v}²` : `(${v}${plus(-c)})²`);
const circleEq = (h: number, k: number, rr: number) => `${sqTerm("x", h)} + ${sqTerm("y", k)} = ${rr}`;
const circleCurves = (h: number, k: number, r: number) => [
  { fn: (x: number) => k + Math.sqrt(r * r - (x - h) * (x - h)) },
  { fn: (x: number) => k - Math.sqrt(r * r - (x - h) * (x - h)) },
];

/** HSG-GPE.A.1 — equation of a circle from center and radius; complete the square. */
export function geoCircleEquation(): Question {
  const kind = rand(0, 4);
  const h = rand(-5, 5);
  const k = rand(-5, 5);
  const r = rand(1, 6);
  if (kind === 0) {
    return {
      key: `ce-write-${h}-${k}-${r}`,
      prompt: `Center ${pt(h, k)}, radius ${r}. Which is the equation?`,
      speech: `A circle has center ${sayPt(h, k)} and radius ${r}. Which is its equation?`,
      visual: { kind: "plot", x: [-12, 12], y: [-12, 12], curves: circleCurves(h, k, r), points: [{ x: h, y: k, label: "C" }] },
      ...label(circleEq(h, k, r * r), [circleEq(-h, -k, r * r), circleEq(h, k, r), circleEq(-h, -k, r), circleEq(k, h, r * r), circleEq(h, k, 2 * r), circleEq(h + 1, k - 1, r * r)]),
      hint: "Every point (x, y) is r from the center: (x − h)² + (y − k)² = r².",
      explain: `(x − h)² + (y − k)² = r² with h = ${h}, k = ${k}, r² = ${r * r}: ${circleEq(h, k, r * r)}.`,
    };
  }
  if (kind === 1) {
    if (h === 0 && k === 0) return geoCircleEquation();
    return {
      key: `ce-center-${h}-${k}-${r}`,
      prompt: `${circleEq(h, k, r * r)}. Where is the center?`,
      speech: `The circle ${say(circleEq(h, k, r * r))}. Where is its center?`,
      visual: NONE,
      ...label(pt(h, k), [pt(-h, -k), pt(h, -k), pt(-h, k), pt(k, h)]),
      hint: "(x − h)² means h; (x + 3)² is (x − (−3))², so h = −3.",
      explain: `The center is ${pt(h, k)}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `ce-radius-${h}-${k}-${r}`,
      prompt: `${circleEq(h, k, r * r)}. What is the radius?`,
      speech: `The circle ${say(circleEq(h, k, r * r))}. What is its radius?`,
      visual: NONE,
      ...choose(r, [r * r, 2 * r, r + 1].filter((v) => v !== r), 1, 1),
      hint: "The number on the right is r², not r.",
      explain: `r² = ${r * r}, so r = ${r}.`,
    };
  }
  if (kind === 3) {
    const D = -2 * h;
    const E = -2 * k;
    const F = h * h + k * k - r * r;
    const term = (c: number, v: string) => (c === 0 ? "" : `${c < 0 ? " − " : " + "}${Math.abs(c)}${v}`);
    const eq = `x² + y²${term(D, "x")}${term(E, "y")}${F === 0 ? "" : F < 0 ? ` − ${-F}` : ` + ${F}`} = 0`;
    const askR = rand(0, 1) === 1 || (h === 0 && k === 0);
    return {
      key: `ce-square-${h}-${k}-${r}-${askR}`,
      prompt: `${eq}. ${askR ? "Radius?" : "Center?"}`,
      speech: `Complete the square: ${say(eq)}. What is the circle's ${askR ? "radius" : "center"}?`,
      visual: NONE,
      ...(askR ? choose(r, [r * r, Math.abs(F), r + 1].filter((v) => v > 0 && v !== r), 1, 1) : label(pt(h, k), [pt(-h, -k), pt(D, E), pt(h, -k)])),
      hint: "Group x's and y's. Add (half the x-coefficient)² and (half the y-coefficient)² to both sides.",
      explain: `${circleEq(h, k, r * r)}: center ${pt(h, k)}, radius ${r}.`,
    };
  }
  const [a, b, c] = pick(CHORD_TRIPLES.filter((t) => t[2] <= 13));
  const on = rand(0, 1) === 1;
  const sx = pick([1, -1]);
  const sy = pick([1, -1]);
  const px = h + sx * a;
  const py = k + sy * b + (on ? 0 : 1);
  return {
    key: `ce-on-${h}-${k}-${a}-${sx}-${sy}-${on}`,
    prompt: `Is ${pt(px, py)} on the circle ${circleEq(h, k, c * c)}?`,
    speech: `Is the point ${sayPt(px, py)} on the circle ${say(circleEq(h, k, c * c))}?`,
    visual: NONE,
    ...yesNo(on),
    hint: "Plug in the point. Does the left side equal r²? That's the distance formula in disguise.",
    explain: `(${ds(px)} − ${ds(h)})² + (${ds(py)} − ${ds(k)})² = ${(px - h) ** 2 + (py - k) ** 2}${on ? " = " : " ≠ "}${c * c}. ${on ? "Yes, it's on the circle." : "No."}`,
  };
}

/* ================================================= hands-on: draw the images */

/** Three non-collinear grid points with coordinates in [−m, m]. */
function triPoints(m: number): [number, number][] {
  for (;;) {
    const p: [number, number][] = [
      [rand(-m, m), rand(-m, m)],
      [rand(-m, m), rand(-m, m)],
      [rand(-m, m), rand(-m, m)],
    ];
    const [[ax, ay], [bx, by], [cx, cy]] = p;
    const area2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area2 !== 0) return p;
  }
}

const PRIMES = ["A′", "B′", "C′"];
const triText = (p: [number, number][]) => p.map(([x, y], i) => `${"ABC"[i]}${pt(x, y)}`).join(", ");

/** HSG-CO.A.2, A.4, A.5 — draw the image of a triangle under a translation, reflection, rotation or sequence. */
export function geoDrawImages(): Question {
  const kind = rand(0, 3);
  const P = triPoints(kind === 0 || kind === 3 ? 3 : 5);
  const orig = grid(P.map(([x, y], i) => ({ x, y, label: "ABC"[i] })), 8);
  let f: (x: number, y: number) => [number, number];
  let what: string;
  let key: string;
  let how: string;
  if (kind === 0) {
    const a = nz(-4, 4);
    const b = nz(-4, 4);
    f = (x, y) => [x + a, y + b];
    what = `Translate by (x, y) → (x${plus(a)}, y${plus(b)})`;
    key = `${a}.${b}`;
    how = `Add ${ds(a)} to every x and ${ds(b)} to every y.`;
  } else if (kind === 1) {
    const i = rand(0, 3);
    f = REFLECTIONS[i].f;
    what = cap(REFLECTIONS[i].name);
    key = `r${i}`;
    how = ["Keep x, flip the sign of y.", "Flip the sign of x, keep y.", "Swap x and y.", "Swap x and y, then flip both signs."][i];
  } else if (kind === 2) {
    const i = rand(0, 2);
    f = ROTATIONS[i].f;
    what = `${cap(ROTATIONS[i].name)} about the origin`;
    key = `t${i}`;
    how = ["(x, y) → (−y, x).", "(x, y) → (−x, −y).", "(x, y) → (y, −x)."][i];
  } else {
    const i = rand(0, 1);
    const a = nz(-4, 4);
    const b = nz(-4, 4);
    f = (x, y) => {
      const [u, v] = REFLECTIONS[i].f(x, y);
      return [u + a, v + b];
    };
    what = `${cap(REFLECTIONS[i].name)}, then shift (${ds(a)}, ${ds(b)})`;
    key = `c${i}.${a}.${b}`;
    how = `Reflect each vertex first, then add ${ds(a)} to x and ${ds(b)} to y.`;
  }
  const img = P.map(([x, y]) => f(x, y));
  return {
    key: `img-${kind}-${key}-${P.flat().join(".")}`,
    prompt: `${what}. Plot A′, B′ and C′.`,
    speech: `Triangle A B C is on the grid: ${P.map(([x, y], i) => `${"ABC"[i]} at ${sayPt(x, y)}`).join(", ")}. ${say(what)}. Plot A prime, B prime and C prime.`,
    visual: orig,
    input: "activity",
    activity: { kind: "plotPoints", points: img.map(([x, y], i) => ({ x, y, label: PRIMES[i] })), size: 8, quadrants: 4 },
    answer: img[0][0],
    hint: `Move one vertex at a time. ${how}`,
    explain: `${triText(P)} → ${img.map(([x, y], i) => `${PRIMES[i]}${pt(x, y)}`).join(", ")}. Lengths and angles are unchanged.`,
  };
}

/** HSG-SRT.A.1b, A.2 — draw a dilation on the grid. */
export function geoDilateGrid(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const k = pick([2, 0.5, 3]);
    const m = k === 2 ? 4 : k === 3 ? 2 : 4;
    let P = triPoints(m);
    if (k === 0.5) P = P.map(([x, y]) => [2 * x, 2 * y]);
    const img = P.map(([x, y]) => [k * x, k * y]);
    return {
      key: `dg-o-${k}-${P.flat().join(".")}`,
      prompt: `Dilate △ABC by ${ds(k)} with center (0, 0). Plot A′, B′, C′.`,
      speech: `Dilate triangle A B C by a scale factor of ${say(ds(k))}, centered at the origin. Plot A prime, B prime and C prime.`,
      visual: grid(P.map(([x, y], i) => ({ x, y, label: "ABC"[i] })), 8),
      input: "activity",
      activity: { kind: "plotPoints", points: img.map(([x, y], i) => ({ x, y, label: PRIMES[i] })), size: 8, quadrants: 4 },
      answer: img[0][0],
      hint: `Multiply every coordinate by ${ds(k)}.`,
      explain: `${img.map(([x, y], i) => `${PRIMES[i]}${pt(x, y)}`).join(", ")}. Every side is ${ds(k)} times as long, and the angles match: the triangles are similar.`,
    };
  }
  const cx = rand(-2, 2);
  const cy = rand(-2, 2);
  const k = kind === 1 ? 2 : 3;
  const lim = k === 2 ? 3 : 2;
  const pts: [number, number][] = [];
  while (pts.length < 2) {
    const d: [number, number] = [rand(-lim, lim), rand(-lim, lim)];
    if ((d[0] || d[1]) && !pts.some((q) => q[0] === d[0] && q[1] === d[1]) && Math.abs(cx + k * d[0]) <= 8 && Math.abs(cy + k * d[1]) <= 8) pts.push(d);
  }
  const P = pts.map(([dx, dy]) => [cx + dx, cy + dy]);
  const img = pts.map(([dx, dy]) => [cx + k * dx, cy + k * dy]);
  return {
    key: `dg-c-${k}-${cx}.${cy}-${pts.flat().join(".")}`,
    prompt: `Dilate segment AB by ${k} with center C${pt(cx, cy)}. Plot A′ and B′.`,
    speech: `Dilate segment A B by a scale factor of ${k}, centered at C, ${sayPt(cx, cy)}. Plot A prime and B prime.`,
    visual: grid(
      [
        { x: cx, y: cy, label: "C" },
        { x: P[0][0], y: P[0][1], label: "A" },
        { x: P[1][0], y: P[1][1], label: "B" },
      ],
      8,
    ),
    input: "activity",
    activity: { kind: "plotPoints", points: img.map(([x, y], i) => ({ x, y, label: PRIMES[i] })), size: 8, quadrants: 4 },
    answer: img[0][0],
    hint: `Count how far each point is from C across and up. Go ${k} times as far from C.`,
    explain: `A′${pt(img[0][0], img[0][1])} and B′${pt(img[1][0], img[1][1])}. A′B′ is ${k} times AB and parallel to it.`,
  };
}

/** HSG-SRT.C.6, C.8 — spot the mistake in trig work; is the answer reasonable? */
export function trigMistakes(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [o, a, h] = triple();
    const m = rand(0, 3);
    const claims = [`sin θ = ${a}/${h}`, `sin θ = ${h}/${o}`, `sin θ = ${o}/${a}`, `sin θ = ${o}/${h}`];
    const fixes = ["Used the adjacent side, not the opposite", "Flipped the fraction upside down", "That's tan θ, not sin θ", "Nothing — it's correct"];
    return {
      key: `tm-claim-${m}-${o}-${a}`,
      prompt: `Sam wrote ${claims[m]} for this triangle. What's wrong?`,
      speech: `Sam wrote ${say(claims[m])} for this triangle. What did Sam do wrong, if anything?`,
      visual: { kind: "righttri", a: o, b: a, c: h, angle: "?" },
      needsVisual: true,
      ...label(fixes[m], fixes.filter((_, i) => i !== m)),
      hint: "Sine is opposite over hypotenuse, from θ's point of view.",
      explain: `sin θ = opposite/hypotenuse = ${o}/${h}. ${m === 3 ? "Sam is right." : `Sam's ${claims[m]}: ${fixes[m].toLowerCase()}.`}`,
    };
  }
  if (kind === 1) {
    const d = pick([10, 20, 25, 30, 40, 50, 60, 70, 80, 35, 45, 55]);
    const fn = pick(["sin", "cos"] as const);
    const wrongVal = r2(fn === "sin" ? Math.sin(d) : Math.cos(d));
    const rightVal = r2(fn === "sin" ? sinD(d) : cosD(d));
    return {
      key: `tm-mode-${fn}-${d}`,
      prompt: `A calculator says ${fn} ${d} ≈ ${ds(wrongVal)}, but ${fn} ${d}° ≈ ${ds(rightVal)}. Why?`,
      speech: `A calculator says ${TRIG_NAME[fn]} of ${d} is about ${say(ds(wrongVal))}, but ${TRIG_NAME[fn]} of ${d} degrees is about ${say(ds(rightVal))}. What went wrong?`,
      visual: NONE,
      ...label("It's in radian mode", ["It pressed the wrong function", "The angle is too big", "Trig values change every day"]),
      hint: `${d} radians is a huge angle — many full turns. Which unit was the calculator using?`,
      explain: `The calculator read ${d} as ${d} radians. Switch it to degree mode.`,
    };
  }
  if (kind === 2) {
    const t = rand(0, 3);
    const h = rand(8, 20);
    const leg = t === 0 ? h + rand(1, 5) : rand(3, h - 2);
    const ratio = r2(rand(101, 140) / 100);
    const ang = rand(25, 65);
    const items = [
      { claim: `Hypotenuse ${h}, and a leg came out as ${leg}.`, ok: false, why: "a leg can't be longer than the hypotenuse" },
      { claim: `Hypotenuse ${h}, and a leg came out as ${leg}.`, ok: true, why: "a leg must be shorter than the hypotenuse, and it is" },
      { claim: `sin θ came out as ${ds(ratio)}.`, ok: false, why: "sine of an acute angle is between 0 and 1" },
      { claim: `One acute angle is ${ang}°, so the other is ${90 - ang}°.`, ok: true, why: "the acute angles of a right triangle add to 90°" },
    ];
    const it = items[t];
    return {
      key: `tm-ok-${t}-${h}-${leg}-${ratio}-${ang}`,
      prompt: `Right triangle: ${it.claim} Reasonable?`,
      speech: `In a right triangle, a student says: ${say(it.claim)} Is that reasonable?`,
      visual: NONE,
      ...yesNo(it.ok),
      hint: "Check the size: the hypotenuse is the longest side, and sin and cos of acute angles are between 0 and 1.",
      explain: `${it.ok ? "Yes" : "No"}: ${it.why}.`,
    };
  }
  const t = rand(25, 65);
  const L = rand(4, 20);
  const bad = rand(1, 3);
  const steps =
    bad === 1
      ? [`cos ${t}° = ${L}/c`, `c = ${L} ÷ cos ${t}°`, `c ≈ ${ds(r1(L / cosD(t)))}`]
      : bad === 2
        ? [`sin ${t}° = ${L}/c`, `c = ${L} × sin ${t}°`, `c ≈ ${ds(r1(L * sinD(t)))}`]
        : [`sin ${t}° = ${L}/c`, `c = ${L} ÷ sin ${t}°`, `c ≈ ${ds(r1(L * sinD(t)))}`];
  const which = bad === 1 ? "Step 1" : bad === 2 ? "Step 2" : "Step 3";
  return {
    key: `tm-step-${t}-${L}-${bad}`,
    prompt: `Opposite side ${L}, θ = ${t}°, find the hypotenuse c. Which step is wrong?`,
    speech: `The side opposite a ${t} degree angle is ${L}. A student finds the hypotenuse c. Which step is wrong?`,
    visual: { kind: "table", header: ["Step", "Work"], rows: steps.map((s, i) => [`Step ${i + 1}`, s]) },
    needsVisual: true,
    ...label(which, ["Step 1", "Step 2", "Step 3"]),
    hint: "Check each step: right ratio? Right algebra? Right calculator value?",
    explain:
      bad === 1
        ? `Step 1: the side is opposite θ, so it's sin ${t}° = ${L}/c, not cos.`
        : bad === 2
          ? `Step 2: from sin ${t}° = ${L}/c, c = ${L} ÷ sin ${t}°, not times.`
          : `Step 3: ${L} ÷ sin ${t}° ≈ ${ds(r1(L / sinD(t)))}, not ${steps[2].slice(4)}.`,
  };
}

const AB = (a: number, b: number) => [
  { name: "A", at: a },
  { name: "B", at: b },
];
const CIRCLE_PARTS: { def: string; term: string; pic: Visual }[] = [
  { def: "A line that touches a circle at exactly one point", term: "tangent", pic: { kind: "circleparts", points: [{ name: "T", at: 60 }], tangents: [{ at: "T" }] } },
  { def: "A line that crosses a circle at two points", term: "secant", pic: { kind: "circleparts", points: AB(200, 340), segments: [{ from: "A", to: "B", extend: true }] } },
  { def: "A chord that passes through the center", term: "diameter", pic: { kind: "circleparts", points: AB(30, 210), center: true, segments: [{ from: "A", to: "B" }] } },
  { def: "An arc smaller than a semicircle", term: "minor arc", pic: { kind: "circleparts", points: AB(40, 130), arcs: [{ from: "A", to: "B", label: null }] } },
  { def: "An arc bigger than a semicircle", term: "major arc", pic: { kind: "circleparts", points: AB(40, 130), arcs: [{ from: "B", to: "A", label: null }] } },
  {
    def: "An angle with its vertex at the center",
    term: "central angle",
    pic: { kind: "circleparts", points: AB(20, 130), segments: [{ from: "O", to: "A" }, { from: "O", to: "B" }], angles: [{ at: "O", from: "A", to: "B", label: null }] },
  },
  {
    def: "An angle with its vertex on the circle, sides along chords",
    term: "inscribed angle",
    pic: {
      kind: "circleparts",
      points: [...AB(200, 340), { name: "C", at: 100 }],
      segments: [{ from: "C", to: "A" }, { from: "C", to: "B" }],
      angles: [{ at: "C", from: "A", to: "B", label: null }],
    },
  },
  { def: "A segment with both endpoints on the circle", term: "chord", pic: { kind: "circleparts", points: AB(160, 50), segments: [{ from: "A", to: "B" }] } },
];

/** HSG-C.A.2, HSG-CO.A.1 — parts of a circle; arcs and central angles. */
export function geoCircleParts(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const i = rand(0, CIRCLE_PARTS.length - 1);
    const p = CIRCLE_PARTS[i];
    return {
      key: `cp-name-${i}`,
      prompt: `${p.def}. What is it called?`,
      speech: `${p.def}. What is it called?`,
      visual: p.pic,
      ...label(p.term, CIRCLE_PARTS.filter((o) => o.term !== p.term).map((o) => o.term)),
      hint: "Where is the vertex or endpoint: at the center, on the circle, or outside?",
      explain: `That's ${art(p.term)} ${p.term}.`,
    };
  }
  if (kind === 1) {
    const minor = rand(20, 170);
    const a0 = rand(0, 11) * 30;
    return {
      key: `cp-major-${minor}`,
      prompt: "How big is major arc AB?",
      speech: `Minor arc A B measures ${minor} degrees. What is the measure of the major arc A B?`,
      visual: {
        kind: "circleparts",
        points: AB(a0, a0 + minor),
        center: true,
        arcs: [
          { from: "A", to: "B", label: minor },
          { from: "B", to: "A", label: "?" },
        ],
      },
      needsVisual: true,
      unit: "°",
      ...choose(360 - minor, [180 - minor, minor, 2 * minor], 5, 1),
      hint: "The two arcs make the whole circle: 360°.",
      explain: `360° − ${minor}° = ${360 - minor}°.`,
    };
  }
  if (kind === 2) {
    const x = rand(20, 150);
    const y = rand(20, 340 - x - 20);
    return {
      key: `cp-add-${x}-${y}`,
      prompt: "Arcs AB and BC sit side by side. How big is arc ABC?",
      speech: `Arc A B is ${x} degrees and arc B C is ${y} degrees, next to each other. What is arc A B C?`,
      visual: {
        kind: "circleparts",
        points: [...AB(200 - x, 200), { name: "C", at: 200 + y }],
        center: true,
        segments: [{ from: "O", to: "A" }, { from: "O", to: "B" }, { from: "O", to: "C" }],
        arcs: [
          { from: "A", to: "B", label: x },
          { from: "B", to: "C", label: y },
        ],
      },
      needsVisual: true,
      unit: "°",
      ...keypad(x + y),
      hint: "Adjacent arcs add, just like adjacent angles. The central angles add too.",
      explain: `${x}° + ${y}° = ${x + y}°.`,
    };
  }
  const n = pick([2, 3, 4, 6, 8, 9, 12, 18, 24, 36]);
  return {
    key: `cp-make-${n}`,
    prompt: `Make the central angle whose arc is 1/${n} of the circle.`,
    speech: `Drag the ray to make a central angle that cuts off one ${n === 2 ? "half" : `${n}th`} of the circle.`,
    visual: NONE,
    input: "activity",
    activity: { kind: "makeAngle", degrees: 360 / n, scale: true },
    answer: 360 / n,
    hint: "A full circle is 360°. Share it into equal parts.",
    explain: `360° ÷ ${n} = ${360 / n}°. A central angle equals its arc.`,
  };
}

/** HSG-GPE.A.1 — read a circle's equation and plot its center and a point on it. */
export function geoCircleGraph(): Question {
  const h = rand(-4, 4);
  const k = rand(-4, 4);
  const r = rand(1, 4);
  const dir = rand(0, 3);
  const names = ["top", "bottom", "rightmost", "leftmost"];
  const [px, py] = [
    [h, k + r],
    [h, k - r],
    [h + r, k],
    [h - r, k],
  ][dir];
  const expanded = rand(0, 2) === 0 && (h !== 0 || k !== 0);
  let eq = circleEq(h, k, r * r);
  if (expanded) {
    const D = -2 * h;
    const E = -2 * k;
    const F = h * h + k * k - r * r;
    const term = (c: number, v: string) => (c === 0 ? "" : `${c < 0 ? " − " : " + "}${Math.abs(c)}${v}`);
    eq = `x² + y²${term(D, "x")}${term(E, "y")}${F === 0 ? "" : F < 0 ? ` − ${-F}` : ` + ${F}`} = 0`;
  }
  return {
    key: `cg-${h}-${k}-${r}-${dir}-${expanded}`,
    prompt: `${eq}: plot the center C and the ${names[dir]} point P.`,
    speech: `For the circle ${say(eq)}, plot the center C, then the ${names[dir]} point of the circle, P.`,
    visual: NONE,
    input: "activity",
    activity: {
      kind: "plotPoints",
      points: [
        { x: h, y: k, label: "C" },
        { x: px, y: py, label: "P" },
      ],
      size: 8,
      quadrants: 4,
    },
    answer: r,
    hint: expanded ? "Complete the square for x and for y to get (x − h)² + (y − k)² = r²." : "(x − h)² + (y − k)² = r²: the center is (h, k). Then go r units from it.",
    explain: `${circleEq(h, k, r * r)}: center ${pt(h, k)}, radius ${r}, so the ${names[dir]} point is ${pt(px, py)}.`,
  };
}

/* ===================================== E. Coordinate geometry & conic sections */

type Slope = [number, number];
const SLOPES: Slope[] = [
  [1, 1], [-1, 1], [2, 1], [-2, 1], [3, 1], [-3, 1], [1, 2], [-1, 2],
  [2, 3], [-2, 3], [3, 2], [-3, 2], [1, 3], [-1, 3], [3, 4], [-4, 3],
];
/** The perpendicular slope −q/p, with a positive denominator. */
const perpSlope = ([p, q]: Slope): Slope => (p < 0 ? [q, -p] : [-q, p]);
/** "y = (2/3)x + 1", "y = −3x − 2". */
function slopeLine([p, q]: Slope, b: number): string {
  if (q === 1) return lineEq(p, b);
  return `y = ${p < 0 ? "−" : ""}(${Math.abs(p)}/${q})x${b === 0 ? "" : plus(b)}`;
}

/** HSG-GPE.B.5 — slopes of parallel and perpendicular lines; equations of lines through a point. */
export function geoSlopes(): Question {
  const kind = rand(0, 4);
  const m = pick(SLOPES);
  const [p, q] = m;
  const b = rand(-6, 6);
  if (kind <= 1) {
    const par = kind === 0;
    const right = par ? frac(p, q) : frac(-q, p);
    return {
      key: `sl-${par ? "par" : "perp"}-${p}-${q}-${b}`,
      prompt: `Slope of a line ${par ? "parallel" : "perpendicular"} to ${slopeLine(m, b)}?`,
      speech: `What is the slope of a line ${par ? "parallel" : "perpendicular"} to ${say(slopeLine(m, b))}?`,
      visual: NONE,
      ...label(right, [frac(p, q), frac(-q, p), frac(q, p), frac(-p, q), "0"]),
      hint: par ? "Parallel lines never meet, so they rise at the same rate." : "Perpendicular slopes are negative reciprocals: flip the fraction and change the sign.",
      explain: par ? `Parallel lines have equal slopes: ${right}.` : `Flip ${frac(p, q)} and change the sign: ${right}. (${frac(p, q)} × ${right} = −1.)`,
    };
  }
  if (kind === 2) {
    const mi = pick([1, -1, 2, -2, 3, -3]);
    const par = rand(0, 1) === 1;
    const t = nz(-2, 2);
    const x0 = mi * t;
    const y0 = nz(-5, 5);
    const right = par ? lineEq(mi, y0 - mi * x0) : slopeLine(perpSlope([mi, 1]), y0 + t);
    const wrongs = par
      ? [lineEq(mi, y0 + mi * x0), slopeLine(perpSlope([mi, 1]), y0 + t), lineEq(-mi, y0 + mi * x0), lineEq(mi, y0)]
      : [lineEq(mi, y0 - mi * x0), slopeLine(perpSlope([mi, 1]), y0 - t), slopeLine(mi > 0 ? [1, mi] : [-1, -mi], y0 + t), slopeLine(perpSlope([mi, 1]), y0)];
    return {
      key: `sl-eq-${par}-${mi}-${x0}-${y0}`,
      prompt: `Line through ${pt(x0, y0)}, ${par ? "parallel" : "perpendicular"} to y = ${mi === 1 ? "" : mi === -1 ? "−" : mi}x${plus(b)}?`,
      speech: `Which line passes through ${sayPt(x0, y0)} and is ${par ? "parallel" : "perpendicular"} to ${say(lineEq(mi, b))}?`,
      visual: NONE,
      ...label(right, wrongs),
      hint: `Find the new slope first. Then put ${pt(x0, y0)} into y = mx + b to find b.`,
      explain: `Slope ${par ? ds(mi) : frac(-1, mi)}. ${ds(y0)} = ${par ? ds(mi) : frac(-1, mi)} × ${ds(x0)} + b gives b = ${ds(par ? y0 - mi * x0 : y0 + t)}. So ${right}.`,
    };
  }
  if (kind === 3) {
    const rel = rand(0, 2);
    const m2: Slope = rel === 0 ? m : rel === 1 ? perpSlope(m) : (pick([[q, p < 0 ? -p : p], [-p, q], [p + q, q]]) as Slope);
    const g = gcd(m2[0], m2[1]) || 1;
    const [p2, q2s] = [m2[0] / g, m2[1] / g];
    const [pp, qq] = q2s < 0 ? [-p2, -q2s] : [p2, q2s];
    if (rel === 2 && (pp * q === p * qq || pp * p === -qq * q)) return geoSlopes();
    let c = nz(-9, 9);
    if (rel === 0 && c === -qq * b) c += 1;
    const std = `${pp === 1 ? "" : pp === -1 ? "−" : ds(pp)}x − ${qq === 1 ? "" : qq}y = ${ds(c)}`;
    const name = ["Parallel", "Perpendicular", "Neither"][rel];
    return {
      key: `sl-cls-${p}-${q}-${b}-${pp}-${qq}-${c}`,
      prompt: `${slopeLine(m, b)} and ${std}: parallel, perpendicular or neither?`,
      speech: `Are the lines ${say(slopeLine(m, b))} and ${say(std)} parallel, perpendicular, or neither?`,
      visual: NONE,
      ...label(name, ["Parallel", "Perpendicular", "Neither"]),
      hint: "Solve the second equation for y to read its slope. Then compare the two slopes.",
      explain: `Slopes ${frac(p, q)} and ${frac(pp, qq)}: ${rel === 0 ? "equal, so parallel" : rel === 1 ? "product −1, so perpendicular" : "not equal and product isn't −1, so neither"}.`,
    };
  }
  let ax = 0;
  let ay = 0;
  let bx = 0;
  let by = 0;
  do {
    ax = rand(-6, 6);
    ay = rand(-6, 6);
    bx = rand(-6, 6);
    by = rand(-6, 6);
  } while (ax === bx || ay === by);
  const dy = by - ay;
  const dx = bx - ax;
  return {
    key: `sl-pts-${ax}-${ay}-${bx}-${by}`,
    prompt: `A${pt(ax, ay)}, B${pt(bx, by)}. Slope of a line perpendicular to AB?`,
    speech: `Point A is at ${sayPt(ax, ay)} and B is at ${sayPt(bx, by)}. What is the slope of a line perpendicular to A B?`,
    visual: grid([
      { x: ax, y: ay, label: "A" },
      { x: bx, y: by, label: "B" },
    ]),
    ...label(frac(-dx, dy), [frac(dy, dx), frac(dx, dy), frac(-dy, dx), "0"]),
    hint: "Slope of AB = rise ÷ run. Then take the negative reciprocal.",
    explain: `Slope of AB = ${ds(dy)}/${ds(dx)} = ${frac(dy, dx)}. Perpendicular slope: ${frac(-dx, dy)}.`,
  };
}

/** Lattice points of y = (p/q)x + b on a grid from −size to size. */
function latticeCount([p, q]: Slope, b: number, size: number): number {
  let n = 0;
  for (let x = -size; x <= size; x++) {
    const y = (p * x) / q + b;
    if (Math.abs(y - Math.round(y)) < 1e-9 && Math.abs(y) <= size) n++;
  }
  return n;
}

/** HSG-GPE.B.5 — draw lines parallel or perpendicular to a given line through a given point. */
export function geoDrawLines(): Question {
  for (;;) {
    const m = pick(SLOPES);
    const par = rand(0, 1) === 1;
    const nm = par ? m : perpSlope(m);
    const c = rand(-5, 5);
    const viaIntercept = rand(0, 1) === 1;
    const x0 = viaIntercept ? 0 : nm[1] * nz(-2, 2);
    const y0 = rand(-4, 4);
    const b = y0 - (nm[0] * x0) / nm[1];
    if (!Number.isInteger(b) || Math.abs(b) > 6 || Math.abs(x0) > 6 || latticeCount(nm, b, 6) < 2) continue;
    if (par && b === c) continue;
    return {
      key: `dl-${m.join(".")}-${par}-${c}-${x0}-${y0}`,
      prompt: `Draw the line through ${pt(x0, y0)} ${par ? "parallel" : "perpendicular"} to ${slopeLine(m, c)}.`,
      speech: `Tap two points to draw the line through ${sayPt(x0, y0)} that is ${par ? "parallel" : "perpendicular"} to ${say(slopeLine(m, c))}.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawLine", m: nm[0] / nm[1], b, size: 6, quadrants: 4 },
      answer: b,
      hint: `${par ? "Use the same slope" : "Use the negative reciprocal slope"}: ${frac(nm[0], nm[1])}. From ${pt(x0, y0)}, go ${Math.abs(nm[0])} ${nm[0] < 0 ? "down" : "up"} and ${nm[1]} right.`,
      explain: `Slope ${frac(nm[0], nm[1])} through ${pt(x0, y0)}: ${slopeLine(nm, b)}.`,
    };
  }
}

const ROOT_POINTS: { x: string; y: string; xs: number; ys: number; r: number }[] = [
  { x: "1", y: "√3", xs: 1, ys: 3, r: 2 },
  { x: "√2", y: "√2", xs: 2, ys: 2, r: 2 },
  { x: "√5", y: "2", xs: 5, ys: 4, r: 3 },
  { x: "2", y: "√3", xs: 4, ys: 3, r: 2 },
  { x: "1", y: "√2", xs: 1, ys: 2, r: 2 },
  { x: "√7", y: "3", xs: 7, ys: 9, r: 4 },
  { x: "2", y: "2√3", xs: 4, ys: 12, r: 4 },
  { x: "3", y: "√6", xs: 9, ys: 6, r: 4 },
  { x: "√3", y: "√6", xs: 3, ys: 6, r: 3 },
  { x: "2", y: "√5", xs: 4, ys: 5, r: 3 },
];

/** HSG-GPE.B.4 — use coordinates to prove simple geometric facts. */
export function geoCoordProofs(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    for (;;) {
      const bx = rand(-3, 3);
      const by = rand(-3, 3);
      const p = nz(-3, 3);
      const q = nz(-3, 3);
      const right = rand(0, 1) === 1;
      const [vx, vy] = right ? [-q, p] : [-q + pick([1, -1]), p];
      const A: [number, number] = [bx + p, by + q];
      const C: [number, number] = [bx + vx, by + vy];
      if (!right && (vx === 0 || p * vx + q * vy === 0)) continue;
      if ([...A, ...C].some((v) => Math.abs(v) > 9)) continue;
      return {
        key: `cp-right-${bx}-${by}-${p}-${q}-${vx}-${vy}`,
        prompt: `A${pt(...A)}, B${pt(bx, by)}, C${pt(...C)}. Is ∠B a right angle?`,
        speech: `A is at ${sayPt(...A)}, B at ${sayPt(bx, by)}, and C at ${sayPt(...C)}. Is angle B a right angle?`,
        visual: grid([
          { x: A[0], y: A[1], label: "A" },
          { x: bx, y: by, label: "B" },
          { x: C[0], y: C[1], label: "C" },
        ]),
        ...yesNo(right),
        hint: "Find the slopes of BA and BC. Perpendicular slopes multiply to −1.",
        explain: `Slope BA = ${frac(q, p)}, slope BC = ${vx === 0 ? "undefined" : frac(vy, vx)}. ${right ? "Their product is −1, so ∠B = 90°." : "Their product isn't −1, so ∠B isn't a right angle."}`,
      };
    }
  }
  if (kind === 1) {
    const [A, B, C] = triPoints(4);
    const D: [number, number] = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
    return {
      key: `cp-fourth-${[A, B, C].flat().join(".")}`,
      prompt: `A${pt(...A)}, B${pt(...B)}, C${pt(...C)}. Where is D so ABCD is a parallelogram?`,
      speech: `A is at ${sayPt(...A)}, B at ${sayPt(...B)}, C at ${sayPt(...C)}. Where must D be so that A B C D is a parallelogram?`,
      visual: grid([
        { x: A[0], y: A[1], label: "A" },
        { x: B[0], y: B[1], label: "B" },
        { x: C[0], y: C[1], label: "C" },
      ]),
      ...label(pt(...D), [pt(B[0] + C[0] - A[0], B[1] + C[1] - A[1]), pt(A[0] + B[0] - C[0], A[1] + B[1] - C[1]), pt(C[0] - B[0], C[1] - B[1])]),
      hint: "In ABCD, side AD must match side BC: the same move across and up.",
      explain: `B → C is (${ds(C[0] - B[0])}, ${ds(C[1] - B[1])}). Do the same from A: D = ${pt(...D)}. The diagonals then share a midpoint.`,
    };
  }
  if (kind === 2) {
    const [a, b, c] = triple(17);
    const ax = rand(-4, 4);
    const ay = rand(-4, 4);
    const sx = pick([1, -1]);
    const sy = pick([1, -1]);
    const B: [number, number] = [ax + sx * a, ay + sy * b];
    return {
      key: `cp-dist-${ax}-${ay}-${a}-${b}-${sx}-${sy}`,
      prompt: `How long is AB, from A${pt(ax, ay)} to B${pt(...B)}?`,
      speech: `How far is it from A at ${sayPt(ax, ay)} to B at ${sayPt(...B)}?`,
      visual: NONE,
      ...keypad(c),
      hint: "Distance = √((x₂ − x₁)² + (y₂ − y₁)²) — the Pythagorean theorem on the grid.",
      explain: `√(${a}² + ${b}²) = √${c * c} = ${c}.`,
    };
  }
  if (kind === 3) {
    const ax = rand(-8, 8);
    const ay = rand(-8, 8);
    const bx = ax + 2 * nz(-4, 4);
    const by = ay + 2 * nz(-4, 4);
    if (Math.abs(bx) > 9 || Math.abs(by) > 9) return geoCoordProofs();
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    return {
      key: `cp-mid-${ax}-${ay}-${bx}-${by}`,
      prompt: `Midpoint of A${pt(ax, ay)} and B${pt(bx, by)}?`,
      speech: `What is the midpoint of A at ${sayPt(ax, ay)} and B at ${sayPt(bx, by)}?`,
      visual: NONE,
      ...label(pt(mx, my), [pt((bx - ax) / 2, (by - ay) / 2), pt(ax + bx, ay + by), pt(my, mx)]),
      hint: "Average the x's, and average the y's.",
      explain: `((${ds(ax)} + ${ds(bx)}) ÷ 2, (${ds(ay)} + ${ds(by)}) ÷ 2) = ${pt(mx, my)}.`,
    };
  }
  const i = rand(0, ROOT_POINTS.length - 1);
  const P = ROOT_POINTS[i];
  const on = P.xs + P.ys === P.r * P.r;
  return {
    key: `cp-root-${i}`,
    prompt: `Is (${P.x}, ${P.y}) on the circle centered at (0, 0) with radius ${P.r}?`,
    speech: `Is the point ${say(P.x)} comma ${say(P.y)} on the circle centered at the origin with radius ${P.r}?`,
    visual: NONE,
    ...yesNo(on),
    hint: "A point is on the circle when x² + y² = r².",
    explain: `(${P.x})² + (${P.y})² = ${P.xs} + ${P.ys} = ${P.xs + P.ys}${on ? " = " : " ≠ "}${P.r * P.r}. ${on ? "Yes." : "No."}`,
  };
}

/** HSG-GPE.B.4, B.6 — plot points to complete shapes and split segments. */
export function geoPlotProofs(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    let [A, B, C] = triPoints(4);
    let D: [number, number] = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
    while (Math.abs(D[0]) > 8 || Math.abs(D[1]) > 8) {
      [A, B, C] = triPoints(4);
      D = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
    }
    return {
      key: `pp-par-${[A, B, C].flat().join(".")}`,
      prompt: "Plot D so that ABCD is a parallelogram.",
      speech: `A is at ${sayPt(...A)}, B at ${sayPt(...B)}, and C at ${sayPt(...C)}. Plot D so that A B C D is a parallelogram.`,
      visual: grid(
        [A, B, C].map(([x, y], i) => ({ x, y, label: "ABC"[i] })),
        8,
      ),
      input: "activity",
      activity: { kind: "plotPoints", points: [{ x: D[0], y: D[1], label: "D" }], size: 8, quadrants: 4 },
      answer: D[0],
      hint: "Opposite sides match: the move from B to C is the same as the move from A to D.",
      explain: `D = A + (C − B) = ${pt(...D)}.`,
    };
  }
  if (kind === 1) {
    const ax = rand(-6, 6);
    const ay = rand(-6, 6);
    const bx = ax + 2 * nz(-3, 3);
    const by = ay + 2 * nz(-3, 3);
    if (Math.abs(bx) > 8 || Math.abs(by) > 8) return geoPlotProofs();
    return {
      key: `pp-mid-${ax}-${ay}-${bx}-${by}`,
      prompt: `Plot the midpoint M of A${pt(ax, ay)} and B${pt(bx, by)}.`,
      speech: `Plot the midpoint M of A at ${sayPt(ax, ay)} and B at ${sayPt(bx, by)}.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "plotPoints", points: [{ x: (ax + bx) / 2, y: (ay + by) / 2, label: "M" }], size: 8, quadrants: 4 },
      answer: (ax + bx) / 2,
      hint: "Average the x's and average the y's — or go halfway across and halfway up.",
      explain: `M = ${pt((ax + bx) / 2, (ay + by) / 2)}.`,
    };
  }
  if (kind === 2) {
    const [m, n] = pick([
      [1, 2],
      [2, 1],
      [1, 3],
      [3, 1],
      [1, 1],
      [2, 3],
    ]);
    const dx = nz(-2, 2);
    const dy = nz(-2, 2);
    const ax = rand(-6, 6);
    const ay = rand(-6, 6);
    const bx = ax + (m + n) * dx;
    const by = ay + (m + n) * dy;
    if (Math.abs(bx) > 8 || Math.abs(by) > 8) return geoPlotProofs();
    return {
      key: `pp-part-${m}-${n}-${ax}-${ay}-${dx}-${dy}`,
      prompt: `Plot P on AB with AP : PB = ${m} : ${n}. A${pt(ax, ay)}, B${pt(bx, by)}.`,
      speech: `A is at ${sayPt(ax, ay)} and B is at ${sayPt(bx, by)}. Plot the point P on segment A B so that A P to P B is ${m} to ${n}.`,
      visual: grid(
        [
          { x: ax, y: ay, label: "A" },
          { x: bx, y: by, label: "B" },
        ],
        8,
      ),
      input: "activity",
      activity: { kind: "plotPoints", points: [{ x: ax + m * dx, y: ay + m * dy, label: "P" }], size: 8, quadrants: 4 },
      answer: ax + m * dx,
      hint: `Split AB into ${m + n} equal steps. P is ${m} step${m === 1 ? "" : "s"} from A.`,
      explain: `Each step is (${ds(dx)}, ${ds(dy)}). ${m} step${m === 1 ? "" : "s"} from A: P = ${pt(ax + m * dx, ay + m * dy)}.`,
    };
  }
  for (;;) {
    const ax = rand(-4, 4);
    const ay = rand(-4, 4);
    const p = nz(-3, 3);
    const q = rand(-3, 3);
    const B: [number, number] = [ax + p, ay + q];
    const C: [number, number] = [B[0] - q, B[1] + p];
    const D: [number, number] = [ax - q, ay + p];
    if ([...B, ...C, ...D].some((v) => Math.abs(v) > 8)) continue;
    return {
      key: `pp-sq-${ax}-${ay}-${p}-${q}`,
      prompt: "Plot C and D to finish square ABCD, going counterclockwise.",
      speech: `A is at ${sayPt(ax, ay)} and B is at ${sayPt(...B)}. Plot C and D so that A B C D is a square, going counterclockwise.`,
      visual: grid(
        [
          { x: ax, y: ay, label: "A" },
          { x: B[0], y: B[1], label: "B" },
        ],
        8,
      ),
      input: "activity",
      activity: {
        kind: "plotPoints",
        points: [
          { x: C[0], y: C[1], label: "C" },
          { x: D[0], y: D[1], label: "D" },
        ],
        size: 8,
        quadrants: 4,
      },
      answer: C[0],
      hint: `A → B is (${ds(p)}, ${ds(q)}). Turn that move 90° counterclockwise: (${ds(-q)}, ${ds(p)}).`,
      explain: `B → C = (${ds(-q)}, ${ds(p)}), so C = ${pt(...C)} and D = ${pt(...D)}. All sides are equal and the slopes are perpendicular.`,
    };
  }
}

/** HSG-GPE.B.6 — the point that partitions a segment in a given ratio. */
export function geoPartition(): Question {
  const kind = rand(0, 2);
  const [m, n] = pick([
    [1, 2],
    [2, 1],
    [1, 3],
    [3, 1],
    [2, 3],
    [3, 2],
    [1, 4],
    [3, 4],
  ]);
  if (kind === 1) {
    const d = pick([1, 2, 3, -1, -2, -3]);
    const a = rand(-10, 4);
    const b = a + (m + n) * d;
    const P = a + m * d;
    return {
      key: `pa-line-${m}-${n}-${a}-${d}`,
      prompt: `On a number line, A = ${ds(a)} and B = ${ds(b)}. P splits AB so AP : PB = ${m} : ${n}. P?`,
      speech: `On a number line, A is at ${say(ds(a))} and B is at ${say(ds(b))}. Point P is on segment A B with A P to P B equal to ${m} to ${n}. Where is P?`,
      visual: { kind: "numberline", min: Math.min(a, b) - 1, max: Math.max(a, b) + 1, step: 1, labelStep: Math.max(a, b) - Math.min(a, b) > 15 ? 5 : 2, from: a, to: P },
      ...signed(P),
      hint: `P is ${m}/${m + n} of the way from A to B.`,
      explain: `AB = ${ds(b - a)}. ${m}/${m + n} of that is ${ds(m * d)}. P = ${ds(a)}${plus(m * d)} = ${ds(P)}.`,
    };
  }
  const dx = nz(-2, 2);
  const dy = nz(-2, 2);
  const ax = rand(-5, 5);
  const ay = rand(-5, 5);
  const B: [number, number] = [ax + (m + n) * dx, ay + (m + n) * dy];
  if (Math.abs(B[0]) > 10 || Math.abs(B[1]) > 10) return geoPartition();
  const P = pt(ax + m * dx, ay + m * dy);
  const asFraction = kind === 2;
  return {
    key: `pa-2d-${asFraction}-${m}-${n}-${ax}-${ay}-${dx}-${dy}`,
    prompt: asFraction
      ? `P is ${m}/${m + n} of the way from A${pt(ax, ay)} to B${pt(...B)}. Where is P?`
      : `A${pt(ax, ay)}, B${pt(...B)}. P is on AB with AP : PB = ${m} : ${n}. P?`,
    speech: asFraction
      ? `Point P is ${say(`${m}/${m + n}`)} of the way from A at ${sayPt(ax, ay)} to B at ${sayPt(...B)}. Where is P?`
      : `A is at ${sayPt(ax, ay)} and B is at ${sayPt(...B)}. P is on segment A B with A P to P B equal to ${m} to ${n}. Where is P?`,
    visual: grid([
      { x: ax, y: ay, label: "A" },
      { x: B[0], y: B[1], label: "B" },
    ]),
    ...label(P, [pt(ax + n * dx, ay + n * dy), pt(B[0] - m * dx, B[1] - m * dy), pt((ax + B[0]) / 2, (ay + B[1]) / 2), pt(ax + m * dx, ay + n * dy)].filter((s) => !s.includes("."))),
    hint: `Split the run and the rise into ${m + n} equal parts. Take ${m} of them from A.`,
    explain: `Run ${ds(B[0] - ax)}, rise ${ds(B[1] - ay)}. ${m}/${m + n} of each: (${ds(m * dx)}, ${ds(m * dy)}). P = ${P}.`,
  };
}

/** HSG-GPE.B.7 — perimeters and areas of polygons from coordinates. */
export function geoCoordArea(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [a, b, c] = pick([
      [3, 4, 5],
      [4, 3, 5],
      [6, 8, 10],
      [8, 6, 10],
    ]);
    const sx = pick([1, -1]);
    const sy = pick([1, -1]);
    const x0 = sx > 0 ? rand(-9, 9 - a) : rand(-9 + a, 9);
    const y0 = sy > 0 ? rand(-9, 9 - b) : rand(-9 + b, 9);
    const area = rand(0, 1) === 1;
    const P = [
      { x: x0, y: y0, label: "A" },
      { x: x0 + sx * a, y: y0, label: "B" },
      { x: x0, y: y0 + sy * b, label: "C" },
    ];
    return {
      key: `ca-tri-${a}-${b}-${x0}-${y0}-${sx}-${sy}-${area}`,
      prompt: `△ABC: A${pt(x0, y0)}, B${pt(x0 + sx * a, y0)}, C${pt(x0, y0 + sy * b)}. ${area ? "Area" : "Perimeter"}?`,
      speech: `Triangle A B C has vertices ${sayPt(x0, y0)}, ${sayPt(x0 + sx * a, y0)} and ${sayPt(x0, y0 + sy * b)}. What is its ${area ? "area" : "perimeter"}?`,
      visual: grid(P),
      ...keypad(area ? (a * b) / 2 : a + b + c),
      hint: area ? "Two sides lie along grid lines: they're the base and height." : "Count the two straight sides. Use the distance formula for the slanted one.",
      explain: area ? `½ × ${a} × ${b} = ${(a * b) / 2}.` : `${a} + ${b} + √(${a}² + ${b}²) = ${a} + ${b} + ${c} = ${a + b + c}.`,
    };
  }
  if (kind === 1) {
    const y0 = rand(-6, 2);
    const x1 = rand(-8, 0);
    const base = rand(3, 9);
    const x2 = x1 + base;
    const hgt = rand(2, 7);
    const x3 = rand(-8, 8);
    const y3 = y0 + hgt;
    return {
      key: `ca-base-${x1}-${x2}-${y0}-${x3}-${y3}`,
      prompt: `Area of △ with vertices ${pt(x1, y0)}, ${pt(x2, y0)}, ${pt(x3, y3)}?`,
      speech: `What is the area of the triangle with vertices ${sayPt(x1, y0)}, ${sayPt(x2, y0)} and ${sayPt(x3, y3)}?`,
      visual: grid([
        { x: x1, y: y0, label: "A" },
        { x: x2, y: y0, label: "B" },
        { x: x3, y: y3, label: "C" },
      ]),
      ...keypad((base * hgt) / 2),
      hint: "AB is horizontal: use it as the base. The height is how far C is above that line.",
      explain: `Base ${base}, height ${hgt}: ½ × ${base} × ${hgt} = ${ds((base * hgt) / 2)}.`,
    };
  }
  if (kind === 2) {
    const p = rand(1, 3);
    const q = rand(1, 3);
    const x0 = rand(-4, 4 - p);
    const y0 = rand(-6, 6 - p - q);
    const V = [
      [x0, y0],
      [x0 + p, y0 + q],
      [x0 + p - q, y0 + q + p],
      [x0 - q, y0 + p],
    ];
    const area = rand(0, 1) === 1;
    const side2 = p * p + q * q;
    const side = Math.sqrt(side2);
    const per = r1(4 * side);
    return {
      key: `ca-tilt-${p}-${q}-${x0}-${y0}-${area}`,
      prompt: `ABCD is a tilted square. Find its ${area ? "area" : "perimeter (nearest tenth)"}.`,
      speech: `A B C D is a square with vertices ${V.map(([x, y]) => sayPt(x, y)).join(", ")}. What is its ${area ? "area" : "perimeter"}?`,
      visual: grid(V.map(([x, y], i) => ({ x, y, label: "ABCD"[i] }))),
      needsVisual: true,
      ...keypad(area ? side2 : per),
      hint: `Each side goes ${p} across and ${q} up (or turned). Side² = ${p}² + ${q}².`,
      explain: area ? `Side² = ${p * p} + ${q * q} = ${side2}, so the area is ${side2}.` : `Side = √${side2} ≈ ${r2(side)}, perimeter = 4 × √${side2} ≈ ${ds(per)}.`,
    };
  }
  const [A, B, C] = triPoints(5);
  const d = (P: number[], Q: number[]) => Math.hypot(P[0] - Q[0], P[1] - Q[1]);
  const per = r1(d(A, B) + d(B, C) + d(C, A));
  return {
    key: `ca-per-${[A, B, C].flat().join(".")}`,
    prompt: "Perimeter of △ABC, to the nearest tenth?",
    speech: `Triangle A B C has vertices ${sayPt(...A)}, ${sayPt(...B)} and ${sayPt(...C)}. Find its perimeter to the nearest tenth.`,
    visual: grid([A, B, C].map(([x, y], i) => ({ x, y, label: "ABC"[i] }))),
    needsVisual: true,
    ...keypad(per),
    hint: "Find each side with the distance formula, add them, then round.",
    explain: `AB ≈ ${r2(d(A, B))}, BC ≈ ${r2(d(B, C))}, CA ≈ ${r2(d(C, A))}. Total ≈ ${ds(per)}.`,
  };
}

/** HSG-GPE.B.7 — draw polygons on a grid with a given area or perimeter. */
export function geoDrawPolygons(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [w, h] = pick([
      [3, 4],
      [2, 5],
      [2, 6],
      [3, 5],
      [4, 5],
      [2, 7],
      [3, 6],
      [1, 6],
    ]);
    return {
      key: `dp-rect-${w}-${h}`,
      prompt: `Draw a rectangle with area ${w * h} and perimeter ${2 * (w + h)}.`,
      speech: `Tap corners to draw a rectangle with an area of ${w * h} square units and a perimeter of ${2 * (w + h)} units.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawShape", size: 8, sides: 4, rightAngles: 4, area: w * h, perimeter: 2 * (w + h) },
      answer: w * h,
      hint: `Length + width = ${w + h} (half the perimeter), and length × width = ${w * h}.`,
      explain: `A ${w} by ${h} rectangle: area ${w * h}, perimeter ${2 * (w + h)}.`,
    };
  }
  if (kind === 1) {
    const area = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
    const legs = [1, 2, 3, 4, 5, 6, 7, 8].map((l) => [l, (2 * area) / l]).find(([l, m]) => Number.isInteger(m) && m <= 8 && l <= m)!;
    return {
      key: `dp-rt-${area}`,
      prompt: `Draw a right triangle with an area of ${area} square units.`,
      speech: `Tap corners to draw a right triangle with an area of ${area} square units.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawShape", size: 8, sides: 3, rightAngles: 1, area },
      answer: area,
      hint: `Area = ½ × leg × leg. Find two legs that multiply to ${2 * area}.`,
      explain: `For example, legs of ${legs[0]} and ${legs[1]} along the grid lines give ½ × ${legs[0]} × ${legs[1]} = ${area}.`,
    };
  }
  if (kind === 2) {
    const area = pick([4, 6, 8, 9, 10, 12, 15]);
    return {
      key: `dp-para-${area}`,
      prompt: `Draw a parallelogram with no right angles and an area of ${area}.`,
      speech: `Tap corners to draw a slanted parallelogram, with no right angles, and an area of ${area} square units.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawShape", size: 8, sides: 4, parallelPairs: 2, rightAngles: 0, area },
      answer: area,
      hint: "Area = base × height. Slide the top side sideways — the area stays the same.",
      explain: `Any base and height that multiply to ${area} work, with the top side shifted so the corners aren't square.`,
    };
  }
  if (kind === 3) {
    const area = pick([5, 6, 7, 8, 9, 10, 12, 14]);
    return {
      key: `dp-trap-${area}`,
      prompt: `Draw a trapezoid (exactly 1 pair of parallel sides) with area ${area}.`,
      speech: `Tap corners to draw a trapezoid, with exactly one pair of parallel sides, and an area of ${area} square units.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "drawShape", size: 8, sides: 4, parallelPairs: 1, area },
      answer: area,
      hint: "Area = ½ × (top + bottom) × height. Try a height of 2: then top + bottom = area.",
      explain: `With height 2, bases adding to ${area} give ½ × ${area} × 2 = ${area}.`,
    };
  }
  const area = pick([2, 5, 8, 10, 13, 17, 18, 20]);
  return {
    key: `dp-tilt-${area}`,
    prompt: `Draw a square with an area of ${area}. (Hint: tilt it!)`,
    speech: `Tap corners to draw a square with an area of ${area} square units. It has to be tilted.`,
    visual: NONE,
    input: "activity",
    activity: { kind: "drawShape", size: 8, sides: 4, rightAngles: 4, equalSides: true, area },
    answer: area,
    hint: `Each side goes p across and q up with p² + q² = ${area}.`,
    explain: `${area} = ${[1, 2, 3, 4].flatMap((p) => [1, 2, 3, 4].map((q) => [p, q])).find(([p, q]) => p * p + q * q === area)!.map((v) => `${v}²`).join(" + ")}, so each side goes that far across and up.`,
  };
}

/** "y = x²/8", "y = −x²/4", "y = x²". */
function parabola(p4: number): string {
  if (Math.abs(p4) === 1) return `y = ${p4 < 0 ? "−" : ""}x²`;
  return `y = ${p4 < 0 ? "−" : ""}x²/${Math.abs(p4)}`;
}

/** HSG-GPE.A.2 — the equation of a parabola from its focus and directrix. */
export function geoParabola(): Question {
  const kind = rand(0, 4);
  const p = nz(-4, 4);
  const plotFor = (h: number, k: number, pp: number, extra: { x: number; y: number; label: string }[] = []): Visual => ({
    kind: "plot",
    x: [-10, 10],
    y: [-10, 10],
    curves: [{ fn: (x: number) => k + ((x - h) * (x - h)) / (4 * pp) }],
    lines: [{ from: [-10, k - pp], to: [10, k - pp], dashed: true }],
    points: [{ x: h, y: k + pp, label: "F" }, ...extra],
  });
  if (kind === 0) {
    return {
      key: `pb-eq-${p}`,
      prompt: `Focus (0, ${ds(p)}), directrix y = ${ds(-p)}. Which is the parabola?`,
      speech: `A parabola has focus at 0 comma ${say(ds(p))} and directrix y equals ${say(ds(-p))}. What is its equation?`,
      visual: plotFor(0, 0, p),
      ...label(parabola(4 * p), [parabola(2 * p), parabola(p * 8), parabola(-4 * p), `y = ${Math.abs(4 * p)}x²`]),
      hint: "Set distance to the focus equal to distance to the directrix: x² + (y − p)² = (y + p)². Simplify.",
      explain: `x² + (y − p)² = (y + p)² simplifies to x² = 4py. With p = ${ds(p)}: ${parabola(4 * p)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `pb-focus-${p}`,
      prompt: `${parabola(4 * p)}. The focus is (0, ?).`,
      speech: `The parabola ${say(parabola(4 * p))} has its focus at 0 comma what?`,
      visual: NONE,
      ...signed(p),
      hint: "Match it to x² = 4py, or y = x²/(4p). What is 4p?",
      explain: `4p = ${4 * p}, so p = ${ds(p)} and the focus is (0, ${ds(p)}).`,
    };
  }
  if (kind === 2) {
    const h = rand(-5, 5);
    const k = rand(-4, 4);
    const pp = nz(-3, 3);
    return {
      key: `pb-vertex-${h}-${k}-${pp}`,
      prompt: `Focus ${pt(h, k + pp)}, directrix y = ${ds(k - pp)}. Where is the vertex?`,
      speech: `A parabola has focus ${sayPt(h, k + pp)} and directrix y equals ${say(ds(k - pp))}. Where is its vertex?`,
      visual: plotFor(h, k, pp),
      ...label(pt(h, k), [pt(h, k + pp), pt(h, k - pp), pt(k, h), pt(h, -k)]),
      hint: "The vertex is on the parabola, so it's halfway between the focus and the directrix.",
      explain: `Halfway between y = ${ds(k + pp)} and y = ${ds(k - pp)} is y = ${ds(k)}, right under the focus: ${pt(h, k)}.`,
    };
  }
  if (kind === 3) {
    const pp = rand(1, 3);
    const t = nz(-2, 2);
    const x = 2 * pp * t;
    const y = pp * t * t;
    return {
      key: `pb-dist-${pp}-${t}`,
      prompt: `P${pt(x, y)} is on ${parabola(4 * pp)}, focus F(0, ${pp}). How far is P from F?`,
      speech: `Point P at ${sayPt(x, y)} is on the parabola ${say(parabola(4 * pp))}, whose focus is at 0 comma ${pp}. How far is P from the focus?`,
      visual: plotFor(0, 0, pp, [{ x, y, label: "P" }]),
      ...keypad(y + pp),
      hint: `Every point on a parabola is as far from the focus as from the directrix, y = ${-pp}.`,
      explain: `P is ${y} − (−${pp}) = ${y + pp} above the directrix, so PF = ${y + pp}.`,
    };
  }
  const h = nz(-4, 4);
  const k = rand(-4, 4);
  const pp = nz(-3, 3);
  const eq = (H: number, K: number, P4: number) => `${sqTerm("x", H)} = ${ds(P4)}${K === 0 ? "y" : `(y${plus(-K)})`}`;
  return {
    key: `pb-shift-${h}-${k}-${pp}`,
    prompt: `Focus ${pt(h, k + pp)}, directrix y = ${ds(k - pp)}. Equation?`,
    speech: `A parabola has focus ${sayPt(h, k + pp)} and directrix y equals ${say(ds(k - pp))}. Which is its equation?`,
    visual: plotFor(h, k, pp),
    ...label(eq(h, k, 4 * pp), [eq(-h, k, 4 * pp), eq(h, k, 2 * pp), eq(h, -k, 4 * pp), eq(h, k, -4 * pp)]),
    hint: "Find the vertex (h, k) halfway between focus and directrix, and p = distance from vertex to focus. Then (x − h)² = 4p(y − k).",
    explain: `Vertex ${pt(h, k)}, p = ${ds(pp)}: ${eq(h, k, 4 * pp)}.`,
  };
}

const ELLIPSES: [number, number, number][] = [
  [5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5], [17, 15, 8], [17, 8, 15],
];
const HYPERBOLAS: [number, number, number][] = [
  [3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17],
];

/** HSG-GPE.A.3 — ellipses and hyperbolas from foci: sums and differences of distances. */
export function geoEllipseHyperbola(): Question {
  const kind = rand(0, 4);
  const ell = rand(0, 1) === 1;
  const [a, b, c] = pick(ell ? ELLIPSES : HYPERBOLAS);
  const eqn = (A: number, B: number, e = ell) => `x²/${A * A} ${e ? "+" : "−"} y²/${B * B} = 1`;
  const vis = (showFoci: boolean): Visual => {
    const L = ell ? a + 2 : c + 3;
    return {
      kind: "plot",
      x: [-L, L],
      y: ell ? [-b - 2, b + 2] : [-L, L],
      curves: ell
        ? [{ fn: (x: number) => b * Math.sqrt(1 - (x * x) / (a * a)) }, { fn: (x: number) => -b * Math.sqrt(1 - (x * x) / (a * a)) }]
        : [{ fn: (x: number) => b * Math.sqrt((x * x) / (a * a) - 1) }, { fn: (x: number) => -b * Math.sqrt((x * x) / (a * a) - 1) }],
      points: showFoci
        ? [
            { x: -c, y: 0, label: "F₁" },
            { x: c, y: 0, label: "F₂" },
          ]
        : [],
    };
  };
  const shape = ell ? "ellipse" : "hyperbola";
  if (kind === 0) {
    return {
      key: `eh-foci-${ell}-${a}-${b}`,
      prompt: `${eqn(a, b)}. The foci are at (±?, 0).`,
      speech: `The ${shape} ${say(eqn(a, b))} has foci at plus or minus what, comma 0?`,
      visual: vis(false),
      ...choose(c, [ell ? Math.round(Math.sqrt(a * a + b * b)) : Math.round(Math.sqrt(Math.abs(a * a - b * b))), a, b, a + b].filter((v) => v !== c), 1, 1),
      hint: ell ? "For an ellipse, c² = a² − b² (a is the bigger one)." : "For a hyperbola, c² = a² + b².",
      explain: ell ? `c² = ${a * a} − ${b * b} = ${c * c}, so c = ${c}.` : `c² = ${a * a} + ${b * b} = ${c * c}, so c = ${c}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `eh-sum-${ell}-${a}-${b}`,
      prompt: ell ? `${eqn(a, b)}. For any point on it, PF₁ + PF₂ = ?` : `${eqn(a, b)}. For any point on it, |PF₁ − PF₂| = ?`,
      speech: ell
        ? `For any point P on the ellipse ${say(eqn(a, b))}, what is the sum of its distances to the two foci?`
        : `For any point P on the hyperbola ${say(eqn(a, b))}, what is the difference of its distances to the two foci?`,
      visual: vis(true),
      ...choose(2 * a, [a, 2 * c, 2 * b], 1, 1),
      hint: "Test a vertex, (a, 0). How far is it from each focus (±c, 0)?",
      explain: ell ? `At the vertex (${a}, 0): (${a} + ${c}) + (${a} − ${c}) = ${2 * a} = 2a.` : `At the vertex (${a}, 0): (${c} + ${a}) − (${c} − ${a}) = ${2 * a} = 2a.`,
    };
  }
  if (kind === 2) {
    const t = rand(0, 4);
    const r = rand(2, 9);
    const forms = [eqn(a, b, true), eqn(a, b, false), `y²/${b * b} − x²/${a * a} = 1`, `x² + y² = ${r * r}`, rand(0, 1) ? `y = x²/${4 * r}` : `x = y²/${4 * r}`];
    const names = ["ellipse", "hyperbola", "hyperbola", "circle", "parabola"];
    return {
      key: `eh-name-${t}-${a}-${b}-${r}`,
      prompt: `What shape is ${forms[t]}?`,
      speech: `What kind of curve is ${say(forms[t])}?`,
      visual: NONE,
      ...label(names[t], ["ellipse", "hyperbola", "circle", "parabola"]),
      hint: "Plus between the squares: ellipse (or circle if they match). Minus: hyperbola. Only one squared variable: parabola.",
      explain: `${forms[t]} is ${art(names[t])} ${names[t]}.`,
    };
  }
  return {
    key: `eh-build-${ell}-${a}-${b}`,
    prompt: ell ? `Foci (±${c}, 0), PF₁ + PF₂ = ${2 * a}. Which ellipse?` : `Foci (±${c}, 0), |PF₁ − PF₂| = ${2 * a}. Which hyperbola?`,
    speech: ell
      ? `An ellipse has foci at plus or minus ${c} comma 0, and every point's distances to the foci add to ${2 * a}. Which is its equation?`
      : `A hyperbola has foci at plus or minus ${c} comma 0, and every point's distances to the foci differ by ${2 * a}. Which is its equation?`,
    visual: vis(true),
    ...label(eqn(a, b), [eqn(a, c), eqn(2 * a, b), eqn(a, b, !ell), eqn(b, a)]),
    hint: ell ? "2a is the sum, so find a. Then b² = a² − c²." : "2a is the difference, so find a. Then b² = c² − a².",
    explain: ell ? `a = ${a}, b² = ${a * a} − ${c * c} = ${b * b}: ${eqn(a, b)}.` : `a = ${a}, b² = ${c * c} − ${a * a} = ${b * b}: ${eqn(a, b)}.`,
  };
}

/* ======================================================= F. Solids & modeling */

/** HSG-GMD.A.1 — informal arguments for circumference, circle area, cylinder, pyramid and cone volume. */
export function geoVolumeWhy(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const cone = rand(0, 1) === 1;
    const V = 3 * rand(4, 40);
    const back = rand(0, 1) === 1;
    const [small, big] = cone ? ["cone", "cylinder"] : ["pyramid", "prism"];
    return {
      key: `vw-third-${cone}-${V}-${back}`,
      prompt: back
        ? `A ${small} holds ${V / 3} cm³. A ${big} with the same base and height holds?`
        : `A ${big} holds ${V} cm³. A ${small} with the same base and height holds?`,
      speech: back
        ? `A ${small} holds ${V / 3} cubic centimeters. How much does a ${big} with the same base and the same height hold?`
        : `A ${big} holds ${V} cubic centimeters. How much does a ${small} with the same base and the same height hold?`,
      visual: { kind: "shape", shape: cone ? "cone" : "pyramid" },
      unit: "cm³",
      ...choose(back ? V : V / 3, back ? [V / 3 * 2, V / 3 + 3, V / 3 * 4] : [V / 2, V * 3, (2 * V) / 3], 1, 1),
      hint: `It takes 3 full ${small}s of water to fill the ${big}.`,
      explain: back ? `The ${big} holds 3 times as much: 3 × ${V / 3} = ${V} cm³.` : `A ${small} is ⅓ of the ${big}: ${V} ÷ 3 = ${V / 3} cm³.`,
    };
  }
  if (kind === 1) {
    const r = rand(2, 12);
    const askArea = rand(0, 1) === 1;
    return {
      key: `vw-slices-${r}-${askArea}`,
      prompt: askArea
        ? `Cut a circle (r = ${r}) into thin slices and line them up. Area of the near-rectangle?`
        : `Cut a circle (r = ${r}) into thin slices and line them up. How wide is the near-rectangle?`,
      speech: askArea
        ? `Cut a circle of radius ${r} into many thin slices and line them up, point up, point down. It makes a near-rectangle ${r} tall. What is its area, in terms of pi?`
        : `Cut a circle of radius ${r} into many thin slices and line them up, point up, point down. It makes a near-rectangle ${r} tall. How wide is it, in terms of pi?`,
      visual: { kind: "circle", r, show: "radius", unit: "" },
      unit: "π",
      ...choose(askArea ? r * r : r, askArea ? [2 * r * r, 2 * r, r] : [2 * r, r * r, r / 2].filter((v) => Number.isInteger(v)), 1, 1),
      hint: "Half the slices' curved edges are on top, half on the bottom. The circumference is 2πr.",
      explain: askArea ? `Width πr = ${r}π, height r = ${r}: area = ${r}π × ${r} = ${r * r}π. That's why A = πr².` : `The top is half the circumference: ½ × 2π × ${r} = ${r}π.`,
    };
  }
  if (kind === 2) {
    const B = rand(2, 16);
    const h = rand(2, 12);
    return {
      key: `vw-stack-${B}-${h}`,
      prompt: `A cylinder is a stack of discs. Base area ${B}π cm², height ${h} cm. Volume?`,
      speech: `Think of a cylinder as a stack of thin discs. The base has area ${B} pi square centimeters and the height is ${h} centimeters. What is the volume?`,
      visual: { kind: "shape", shape: "cylinder" },
      unit: "π cm³",
      ...choose(B * h, [B + h, B * h * 2, (B * h) / 3].filter((v) => Number.isInteger(v)), 1, 1),
      hint: "Each layer 1 cm thick holds the base area. How many layers?",
      explain: `${B}π per layer × ${h} layers = ${B * h}π cm³. V = (base area) × height.`,
    };
  }
  if (kind === 3) {
    const e = pick([3, 6, 9, 12]);
    return {
      key: `vw-cube-${e}`,
      prompt: `A cube with ${e} cm edges splits into 3 identical pyramids. Each pyramid's volume?`,
      speech: `A cube with ${e} centimeter edges can be cut into 3 identical pyramids that all share one corner. What is the volume of each pyramid?`,
      visual: { kind: "shape", shape: "cube" },
      unit: "cm³",
      ...choose((e ** 3) / 3, [e ** 3, (e ** 3) / 2, e * e], 1, 1),
      hint: "Find the cube's volume, then share it 3 ways.",
      explain: `${e}³ = ${e ** 3}, and ${e ** 3} ÷ 3 = ${(e ** 3) / 3} cm³. That's ⅓ × base × height.`,
    };
  }
  if (kind === 4) {
    const per = rand(0, 1) === 1;
    const n = pick([6, 12, 24, 48, 96]);
    return {
      key: `vw-limit-${per}-${n}`,
      prompt: `A regular polygon inside a circle goes from ${n} to ${n * 2} sides. Its ${per ? "perimeter" : "area"} gets closer to…`,
      speech: `A regular polygon is inscribed in a circle. It goes from ${n} sides to ${n * 2} sides. What does its ${per ? "perimeter" : "area"} get closer to?`,
      visual: NONE,
      ...label(per ? "the circumference, 2πr" : "the circle's area, πr²", per ? ["the diameter, 2r", "the area, πr²", "zero"] : ["the circumference, 2πr", "the square r²", "zero"]),
      hint: "With more and more sides, the polygon hugs the circle.",
      explain: per ? "Its perimeter approaches the circumference 2πr." : "Its area approaches πr² — that's one way to see the circle area formula.",
    };
  }
  const d = rand(2, 20);
  return {
    key: `vw-pi-${d}`,
    prompt: `Every circle's circumference ÷ diameter is the same. A circle has d = ${d}. Its circumference?`,
    speech: `For every circle, circumference divided by diameter is the same number, pi, because all circles are similar. A circle has diameter ${d}. What is its circumference?`,
    visual: { kind: "circle", r: d / 2, show: "diameter", unit: "" },
    ...label(`${d}π`, [`${2 * d}π`, `${d * d}π`, `${d}/π`, `${d / 2}π`]),
    hint: "C ÷ d = π, so C = πd.",
    explain: `C = π × ${d} = ${d}π.`,
  };
}

/** HSG-GMD.A.3 — volume of cylinders, pyramids, cones and spheres. */
export function geoVolume(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const r = rand(1, 8);
    const h = rand(1, 12);
    return {
      key: `vol-cyl-${r}-${h}`,
      prompt: "Volume of the cylinder, in terms of π?",
      speech: `A cylinder has radius ${r} centimeters and height ${h} centimeters. What is its volume, in terms of pi?`,
      visual: { kind: "solid", solid: "cylinder", r, h, unit: "cm" },
      needsVisual: true,
      unit: "π cm³",
      ...choose(r * r * h, [2 * r * h, r * h, (r * r * h) / 3].filter((v) => Number.isInteger(v)), 1, 1),
      hint: "V = πr²h.",
      explain: `π × ${r}² × ${h} = ${r * r * h}π cm³.`,
    };
  }
  if (kind === 1) {
    let r = 0;
    let h = 0;
    do {
      r = rand(1, 9);
      h = rand(2, 12);
    } while ((r * r * h) % 3 !== 0);
    return {
      key: `vol-cone-${r}-${h}`,
      prompt: "Volume of the cone, in terms of π?",
      speech: `A cone has radius ${r} centimeters and height ${h} centimeters. What is its volume, in terms of pi?`,
      visual: { kind: "solid", solid: "cone", r, h, unit: "cm" },
      needsVisual: true,
      unit: "π cm³",
      ...choose((r * r * h) / 3, [r * r * h, (r * h) / 3, 3 * r * r * h].filter((v) => Number.isInteger(v)), 1, 1),
      hint: "V = ⅓πr²h — a third of the cylinder.",
      explain: `⅓ × π × ${r}² × ${h} = ${(r * r * h) / 3}π cm³.`,
    };
  }
  if (kind === 2) {
    const hemi = rand(0, 1) === 1;
    const r = pick(hemi ? [3, 6, 9] : [3, 6, 9, 12]);
    const v = hemi ? (2 * r ** 3) / 3 : (4 * r ** 3) / 3;
    return {
      key: `vol-sph-${hemi}-${r}`,
      prompt: `Volume of the ${hemi ? "hemisphere" : "sphere"}, in terms of π?`,
      speech: `A ${hemi ? "hemisphere, half a sphere," : "sphere"} has radius ${r} centimeters. What is its volume, in terms of pi?`,
      visual: { kind: "solid", solid: hemi ? "hemisphere" : "sphere", r, unit: "cm" },
      needsVisual: true,
      unit: "π cm³",
      ...choose(v, [hemi ? (4 * r ** 3) / 3 : (2 * r ** 3) / 3, 4 * r * r, r ** 3], 1, 1),
      hint: hemi ? "A sphere is (4/3)πr³. Take half." : "V = (4/3)πr³.",
      explain: hemi ? `½ × (4/3) × ${r}³ π = ${v}π cm³.` : `(4/3) × ${r}³ π = (4/3) × ${r ** 3}π = ${v}π cm³.`,
    };
  }
  if (kind === 3) {
    let s = 0;
    let h = 0;
    do {
      s = rand(2, 12);
      h = rand(2, 15);
    } while ((s * s * h) % 3 !== 0);
    return {
      key: `vol-pyr-${s}-${h}`,
      prompt: `Square pyramid: base ${s} cm by ${s} cm, height ${h} cm. Volume?`,
      speech: `A pyramid has a square base ${s} centimeters on each side and a height of ${h} centimeters. What is its volume?`,
      visual: { kind: "shape", shape: "pyramid" },
      unit: "cm³",
      ...choose((s * s * h) / 3, [s * s * h, (s * s * h) / 2, (s * h) / 3].filter((v) => Number.isInteger(v)), 1, 1),
      hint: "V = ⅓ × base area × height.",
      explain: `⅓ × ${s * s} × ${h} = ${(s * s * h) / 3} cm³.`,
    };
  }
  if (kind === 4) {
    const r = rand(1, 10);
    const h = rand(2, 20);
    const cone = rand(0, 1) === 1;
    const v = Math.round((cone ? 1 / 3 : 1) * Math.PI * r * r * h);
    return {
      key: `vol-round-${cone}-${r}-${h}`,
      prompt: `Volume of the ${cone ? "cone" : "cylinder"}, to the nearest cm³?`,
      speech: `A ${cone ? "cone" : "cylinder"} has radius ${r} centimeters and height ${h} centimeters. What is its volume, to the nearest cubic centimeter?`,
      visual: { kind: "solid", solid: cone ? "cone" : "cylinder", r, h, unit: "cm" },
      needsVisual: true,
      unit: "cm³",
      ...keypad(v),
      hint: cone ? "V = ⅓πr²h. Use the π key, then round at the end." : "V = πr²h. Use the π key, then round at the end.",
      explain: `${cone ? "⅓ × " : ""}π × ${r}² × ${h} ≈ ${v} cm³.`,
    };
  }
  const r = rand(1, 6);
  const h = rand(2, 12);
  return {
    key: `vol-back-${r}-${h}`,
    prompt: `The cylinder holds ${r * r * h}π cm³. How tall is it?`,
    speech: `A cylinder has volume ${r * r * h} pi cubic centimeters and radius ${r} centimeters. How tall is it?`,
    visual: { kind: "solid", solid: "cylinder", r, h: "?", unit: "cm" },
    needsVisual: true,
    unit: "cm",
    ...choose(h, [r * h, (r * r * h) / r, h * 2].filter((v) => v !== h && Number.isInteger(v)), 1, 1),
    hint: "V = πr²h, so h = V ÷ (πr²).",
    explain: `${r * r * h}π ÷ (π × ${r}²) = ${r * r * h} ÷ ${r * r} = ${h} cm.`,
  };
}

/** HSG-GMD.A.3, HSG-MG.A.1 — volumes of composite solids. */
export function geoCompositeVolume(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    let r = 0;
    let h1 = 0;
    let h2 = 0;
    do {
      r = rand(1, 6);
      h1 = rand(3, 12);
      h2 = rand(2, 9);
    } while ((r * r * h2) % 3 !== 0);
    const v = r * r * h1 + (r * r * h2) / 3;
    return {
      key: `cv-rocket-${r}-${h1}-${h2}`,
      prompt: `A rocket: cylinder (r ${r}, h ${h1}) with a cone (h ${h2}) on top. Volume?`,
      speech: `A toy rocket is a cylinder with radius ${r} and height ${h1}, with a cone of the same radius and height ${h2} on top. What is its volume, in terms of pi?`,
      visual: { kind: "shape", shape: "cylinder" },
      unit: "π",
      ...choose(v, [r * r * (h1 + h2), r * r * h1 + r * r * h2 * 3, (r * r * (h1 + h2)) / 3].filter((x) => Number.isInteger(x)), 1, 1),
      hint: "Add the cylinder (πr²h) and the cone (⅓πr²h).",
      explain: `Cylinder ${r * r * h1}π + cone ${(r * r * h2) / 3}π = ${v}π.`,
    };
  }
  if (kind === 1) {
    const r = pick([3, 6]);
    const h = rand(4, 15);
    const v = r * r * h + (2 * r ** 3) / 3;
    return {
      key: `cv-silo-${r}-${h}`,
      prompt: `A silo: cylinder (r ${r} m, h ${h} m) topped by a hemisphere. Volume?`,
      speech: `A grain silo is a cylinder with radius ${r} meters and height ${h} meters, with a hemisphere on top. What is its volume, in terms of pi?`,
      visual: { kind: "shape", shape: "cylinder" },
      unit: "π m³",
      ...choose(v, [r * r * h + (4 * r ** 3) / 3, r * r * h, r * r * h + r ** 3], 1, 1),
      hint: "Cylinder πr²h plus half a sphere, ½ × (4/3)πr³.",
      explain: `${r * r * h}π + ${(2 * r ** 3) / 3}π = ${v}π m³.`,
    };
  }
  if (kind === 2) {
    const R = rand(3, 8);
    const r = rand(1, R - 1);
    const h = rand(2, 12);
    return {
      key: `cv-pipe-${R}-${r}-${h}`,
      prompt: `A pipe: outer radius ${R} cm, inner radius ${r} cm, length ${h} cm. Volume of material?`,
      speech: `A pipe has outer radius ${R} centimeters, inner radius ${r} centimeters, and length ${h} centimeters. What volume of material is it made of, in terms of pi?`,
      visual: { kind: "shape", shape: "cylinder" },
      unit: "π cm³",
      ...choose((R * R - r * r) * h, [(R - r) ** 2 * h, R * R * h, (R - r) * h].filter((x) => x > 0), 1, 1),
      hint: "Outer cylinder minus the hole: π(R² − r²)h.",
      explain: `π(${R * R} − ${r * r}) × ${h} = ${(R * R - r * r) * h}π cm³.`,
    };
  }
  if (kind === 3) {
    const s = rand(4, 12);
    const r = rand(1, Math.floor((s - 1) / 2));
    const v = Math.round(s ** 3 - Math.PI * r * r * s);
    return {
      key: `cv-hole-${s}-${r}`,
      prompt: `A ${s} cm cube has a hole (r ${r} cm) drilled straight through. Volume left?`,
      speech: `A wooden cube with ${s} centimeter edges has a round hole of radius ${r} centimeters drilled straight through it. What volume of wood is left, to the nearest cubic centimeter?`,
      visual: { kind: "shape", shape: "cube" },
      unit: "cm³",
      ...keypad(v),
      hint: "Cube volume minus a cylinder whose height is the cube's edge.",
      explain: `${s}³ − π × ${r}² × ${s} ≈ ${s ** 3} − ${r1(Math.PI * r * r * s)} ≈ ${v} cm³.`,
    };
  }
  const r = pick([3, 6]);
  const h = rand(4, 12);
  const v = (r * r * h) / 3 + (2 * r ** 3) / 3;
  return {
    key: `cv-ice-${r}-${h}`,
    prompt: `Ice cream: a cone (r ${r} cm, h ${h} cm) filled, with a hemisphere on top. Volume?`,
    speech: `An ice cream cone has radius ${r} centimeters and height ${h} centimeters. It's filled, with a hemisphere of ice cream on top. What is the total volume, in terms of pi?`,
    visual: { kind: "shape", shape: "cone" },
    unit: "π cm³",
    ...choose(v, [r * r * h + (2 * r ** 3) / 3, (r * r * h) / 3 + (4 * r ** 3) / 3, (r * r * h) / 3], 1, 1),
    hint: "Cone ⅓πr²h plus hemisphere ⅔πr³.",
    explain: `${(r * r * h) / 3}π + ${(2 * r ** 3) / 3}π = ${v}π cm³.`,
  };
}

/** HSG-GMD.A.2 — Cavalieri's principle and the volume of a sphere. */
export function geoCavalieri(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const n = rand(10, 40);
    const v = rand(2, 6);
    return {
      key: `cav-coins-${n}-${v}`,
      prompt: `${n} coins (${v} cm³ each) stacked straight vs. slanted. Slanted volume?`,
      speech: `${n} identical coins, each ${v} cubic centimeters, are stacked straight. The same coins are then pushed into a slanted stack. What is the slanted stack's volume?`,
      visual: NONE,
      unit: "cm³",
      ...choose(n * v, [n * v + n, n * v - v, n * v * 2], 1, 1),
      hint: "Same height and the same cross-section at every level means the same volume (Cavalieri).",
      explain: `Still ${n} × ${v} = ${n * v} cm³. Every slice matches, so the volumes match.`,
    };
  }
  if (kind === 1) {
    const r = rand(1, 7);
    const h = rand(2, 12);
    return {
      key: `cav-oblique-${r}-${h}`,
      prompt: `An oblique (leaning) cylinder: radius ${r}, height ${h}. Volume in terms of π?`,
      speech: `An oblique cylinder leans to one side. Its radius is ${r} and its straight-up height is ${h}. What is its volume, in terms of pi?`,
      visual: NONE,
      unit: "π",
      ...choose(r * r * h, [r * r * h + r, 2 * r * h, (r * r * h) / 2].filter((x) => Number.isInteger(x)), 1, 1),
      hint: "Every horizontal slice is still a circle of radius r. Cavalieri says the volume equals a straight cylinder's.",
      explain: `π × ${r}² × ${h} = ${r * r * h}π — the same as an upright cylinder.`,
    };
  }
  if (kind === 2) {
    const r = pick([3, 6, 9]);
    const whole = rand(0, 1) === 1;
    const cyl = r ** 3;
    const cone = cyl / 3;
    return {
      key: `cav-sphere-${r}-${whole}`,
      prompt: `Cylinder ${cyl}π, cone ${cone}π (both radius ${r}, height ${r}). ${whole ? "Sphere" : "Hemisphere"} volume?`,
      speech: `A cylinder and a cone both have radius ${r} and height ${r}. The cylinder holds ${cyl} pi and the cone ${cone} pi. A hemisphere matches the cylinder minus the cone. What is the volume of the ${whole ? "whole sphere" : "hemisphere"}?`,
      visual: { kind: "solid", solid: whole ? "sphere" : "hemisphere", r },
      unit: "π",
      ...choose(whole ? 2 * (cyl - cone) : cyl - cone, whole ? [cyl - cone, cyl + cone, 2 * cyl] : [cyl + cone, cone, 2 * (cyl - cone)], 1, 1),
      hint: "At every height, the hemisphere's slice has the same area as the cylinder's slice minus the cone's.",
      explain: `Hemisphere = ${cyl}π − ${cone}π = ${cyl - cone}π${whole ? `, so the sphere is ${2 * (cyl - cone)}π = (4/3)π × ${r}³` : ""}.`,
    };
  }
  const [y, s, R] = pick(CHORD_TRIPLES);
  return {
    key: `cav-slice-${y}-${R}`,
    prompt: `Hemisphere r = ${R}. Slice it ${y} up from the base. Slice area (in terms of π)?`,
    speech: `A hemisphere has radius ${R}. Slice it parallel to the base, ${y} units up. What is the area of the slice, in terms of pi?`,
    visual: { kind: "slice", solid: "sphere", cut: "horizontal" },
    unit: "π",
    ...choose(s * s, [R * R, y * y, (R - y) ** 2], 1, 1),
    hint: "The slice's radius s satisfies s² + y² = R². Its area is πs² = π(R² − y²).",
    explain: `s² = ${R * R} − ${y * y} = ${s * s}, so the area is ${s * s}π — the same as cylinder slice ${R * R}π minus cone slice ${y * y}π.`,
  };
}

const SLICES: { solid: "cube" | "prism" | "cylinder" | "cone" | "pyramid" | "sphere"; cut: "horizontal" | "vertical" | "diagonal"; name: string; how: string; shape: string }[] = [
  { solid: "cube", cut: "horizontal", name: "cube", how: "parallel to its base", shape: "square" },
  { solid: "cube", cut: "vertical", name: "cube", how: "parallel to a side face", shape: "square" },
  { solid: "prism", cut: "horizontal", name: "box (rectangular prism)", how: "parallel to its base", shape: "rectangle" },
  { solid: "prism", cut: "vertical", name: "box (rectangular prism)", how: "straight down, parallel to a side", shape: "rectangle" },
  { solid: "cylinder", cut: "horizontal", name: "cylinder", how: "parallel to its base", shape: "circle" },
  { solid: "cylinder", cut: "vertical", name: "cylinder", how: "straight down through its axis", shape: "rectangle" },
  { solid: "cylinder", cut: "diagonal", name: "cylinder", how: "at a slant, not touching the bases", shape: "ellipse" },
  { solid: "cone", cut: "horizontal", name: "cone", how: "parallel to its base", shape: "circle" },
  { solid: "cone", cut: "vertical", name: "cone", how: "straight down through its tip", shape: "triangle" },
  { solid: "cone", cut: "diagonal", name: "cone", how: "at a slant, not touching the base", shape: "ellipse" },
  { solid: "pyramid", cut: "horizontal", name: "square pyramid", how: "parallel to its base", shape: "square" },
  { solid: "pyramid", cut: "vertical", name: "square pyramid", how: "straight down through its tip", shape: "triangle" },
  { solid: "sphere", cut: "horizontal", name: "sphere", how: "by any flat plane", shape: "circle" },
];

/** HSG-GMD.B.4 — cross-sections of three-dimensional objects. */
export function geoCrossSections(): Question {
  const kind = rand(0, 2);
  if (kind <= 1) {
    const i = rand(0, SLICES.length - 1);
    const s = SLICES[i];
    return {
      key: `xs-${i}`,
      prompt: `Slice a ${s.name} ${s.how}. What shape is the cross-section?`,
      speech: `Slice a ${s.name} ${s.how}. What shape is the cross-section?`,
      visual: { kind: "slice", solid: s.solid, cut: s.cut },
      ...label(s.shape, ["circle", "square", "rectangle", "triangle", "ellipse"]),
      hint: "Picture the cut face. What outline does the plane trace on the solid's surface?",
      explain: `A ${s.name} sliced ${s.how} shows ${art(s.shape)} ${s.shape}.`,
    };
  }
  const [d, s, R] = pick(CHORD_TRIPLES);
  return {
    key: `xs-sphere-${d}-${R}`,
    prompt: `A sphere of radius ${R} is sliced ${d} from its center. Area of the slice?`,
    speech: `A sphere of radius ${R} is sliced by a plane ${d} units from its center. What is the area of the circular cross-section, in terms of pi?`,
    visual: { kind: "slice", solid: "sphere", cut: "horizontal" },
    unit: "π",
    ...choose(s * s, [R * R, R * R - d, (R - d) ** 2], 1, 1),
    hint: "The center, the slice's center and a point on the slice's edge make a right triangle.",
    explain: `Slice radius² = ${R * R} − ${d * d} = ${s * s}, so the area is ${s * s}π.`,
  };
}

const SPINS: { flat: string; axis: string; solid: string }[] = [
  { flat: "a rectangle", axis: "one of its sides", solid: "cylinder" },
  { flat: "a right triangle", axis: "one of its legs", solid: "cone" },
  { flat: "a semicircle", axis: "its diameter", solid: "sphere" },
  { flat: "a circle", axis: "a line outside it", solid: "torus (doughnut)" },
  { flat: "a rectangle", axis: "a line parallel to a side, outside it", solid: "tube (cylinder with a hole)" },
  { flat: "a right triangle", axis: "its hypotenuse", solid: "two cones base to base" },
];

/** HSG-GMD.B.4 — solids made by rotating two-dimensional shapes. */
export function geoRevolution(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, SPINS.length - 1);
    const s = SPINS[i];
    return {
      key: `rev-name-${i}`,
      prompt: `Spin ${s.flat} around ${s.axis}. What solid does it sweep out?`,
      speech: `Spin ${s.flat} all the way around ${s.axis}. What solid does it sweep out?`,
      visual: NONE,
      ...label(s.solid, SPINS.map((o) => o.solid)),
      hint: "Each point traces a circle around the axis. Picture the outline.",
      explain: `${cap(s.flat)} spun around ${s.axis} makes ${art(s.solid)} ${s.solid}.`,
    };
  }
  if (kind === 1) {
    const w = rand(1, 6);
    const h = rand(2, 10);
    return {
      key: `rev-rect-${w}-${h}`,
      prompt: `Spin a ${w} by ${h} rectangle around its ${h}-unit side. Volume (in terms of π)?`,
      speech: `A rectangle ${w} wide and ${h} tall spins around its ${h} unit side. What is the volume of the solid, in terms of pi?`,
      visual: { kind: "rect", w, h, showW: true, showH: true, grid: false, unit: "" },
      unit: "π",
      ...choose(w * w * h, [h * h * w, w * h, 2 * w * h], 1, 1),
      hint: "It makes a cylinder. The side it spins around is the height; the other side is the radius.",
      explain: `Cylinder with r = ${w}, h = ${h}: π × ${w}² × ${h} = ${w * w * h}π.`,
    };
  }
  let r = 0;
  let h = 0;
  do {
    r = rand(1, 6);
    h = rand(2, 12);
  } while ((r * r * h) % 3 !== 0);
  return {
    key: `rev-tri-${r}-${h}`,
    prompt: `Spin a right triangle (legs ${h} and ${r}) around the ${h} leg. Volume (in terms of π)?`,
    speech: `A right triangle with legs ${h} and ${r} spins around its leg of length ${h}. What is the volume of the solid, in terms of pi?`,
    visual: { kind: "righttri", a: h, b: r, c: null },
    unit: "π",
    ...choose((r * r * h) / 3, [r * r * h, (h * h * r) / 3, (r * h) / 3].filter((x) => Number.isInteger(x) && x !== (r * r * h) / 3), 1, 1),
    hint: "It makes a cone: the axis leg is the height, the other leg is the radius.",
    explain: `Cone with r = ${r}, h = ${h}: ⅓π × ${r}² × ${h} = ${(r * r * h) / 3}π.`,
  };
}

const MATERIALS: { name: string; d: number }[] = [
  { name: "pine wood", d: 0.5 },
  { name: "ice", d: 0.9 },
  { name: "plastic", d: 1.2 },
  { name: "aluminum", d: 2.7 },
  { name: "iron", d: 7.9 },
  { name: "copper", d: 8.9 },
  { name: "lead", d: 11.3 },
  { name: "concrete", d: 2.4 },
];

/** HSG-MG.A.2 — density based on area and volume. */
export function geoDensity(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    const area = rand(5, 40);
    const d = rand(5, 90) * 10;
    return {
      key: `den-pop-${area}-${d}`,
      prompt: `A town of ${(area * d).toLocaleString("en-US")} people covers ${area} km². People per km²?`,
      speech: `A town has ${area * d} people living on ${area} square kilometers. What is its population density, in people per square kilometer?`,
      visual: NONE,
      unit: "per km²",
      ...keypad(d),
      hint: "Density = how many ÷ area.",
      explain: `${area * d} ÷ ${area} = ${d} people per km².`,
    };
  }
  if (kind === 1) {
    const m = pick(MATERIALS);
    const [l, w, h] = [rand(2, 10), rand(2, 10), rand(1, 5)];
    const mass = r1(l * w * h * m.d);
    return {
      key: `den-mass-${m.name}-${l}-${w}-${h}`,
      prompt: `A ${l}×${w}×${h} cm block of ${m.name} (${m.d} g/cm³). Mass?`,
      speech: `A block of ${m.name} measures ${l} by ${w} by ${h} centimeters. ${cap(m.name)} has a density of ${m.d} grams per cubic centimeter. What is the block's mass in grams?`,
      visual: { kind: "box", l, w, h, unit: "cm" },
      unit: "g",
      ...keypad(mass),
      hint: "Mass = density × volume.",
      explain: `Volume ${l * w * h} cm³ × ${m.d} g/cm³ = ${ds(mass)} g.`,
    };
  }
  if (kind === 2) {
    const m = pick(MATERIALS);
    const V = rand(2, 30) * 10;
    const mass = r1(V * m.d);
    return {
      key: `den-find-${m.name}-${V}`,
      prompt: `A ${V} cm³ object has a mass of ${ds(mass)} g. Density?`,
      speech: `An object has a volume of ${V} cubic centimeters and a mass of ${say(ds(mass))} grams. What is its density, in grams per cubic centimeter?`,
      visual: NONE,
      unit: "g/cm³",
      ...keypad(m.d),
      hint: "Density = mass ÷ volume.",
      explain: `${ds(mass)} ÷ ${V} = ${m.d} g/cm³ — that matches ${m.name}.`,
    };
  }
  if (kind === 3) {
    const a1 = rand(3, 20);
    const a2 = rand(3, 20);
    const d1 = rand(10, 90) * 10;
    let d2 = rand(10, 90) * 10;
    if (d2 === d1) d2 += 10;
    return {
      key: `den-cmp-${a1}-${a2}-${d1}-${d2}`,
      prompt: `Town A: ${a1 * d1} people, ${a1} km². Town B: ${a2 * d2} people, ${a2} km². More crowded?`,
      speech: `Town A has ${a1 * d1} people on ${a1} square kilometers. Town B has ${a2 * d2} people on ${a2} square kilometers. Which town is more densely populated?`,
      visual: { kind: "table", header: ["Town", "People", "Area (km²)"], rows: [["A", a1 * d1, a1], ["B", a2 * d2, a2]] },
      ...label(d1 > d2 ? "Town A" : "Town B", ["Town A", "Town B"]),
      hint: "Compare people per km², not total people.",
      explain: `A: ${d1} per km². B: ${d2} per km². Town ${d1 > d2 ? "A" : "B"} is more crowded.`,
    };
  }
  if (kind === 5) {
    const m = pick(MATERIALS.filter((x) => x.d >= 2));
    const ball = rand(0, 1) === 1;
    const r = rand(1, 5);
    const h = ball ? 0 : rand(2, 12);
    const V = ball ? (4 / 3) * Math.PI * r ** 3 : Math.PI * r * r * h;
    const mass = Math.round(V * m.d);
    return {
      key: `den-round-${m.name}-${ball}-${r}-${h}`,
      prompt: `A ${ball ? "ball" : "rod"} of ${m.name} (${m.d} g/cm³). Mass, to the nearest gram?`,
      speech: `A ${ball ? "ball" : "cylinder-shaped rod"} of ${m.name} has radius ${r} centimeters${ball ? "" : ` and length ${h} centimeters`}. ${cap(m.name)} has a density of ${m.d} grams per cubic centimeter. What is its mass, to the nearest gram?`,
      visual: { kind: "solid", solid: ball ? "sphere" : "cylinder", r, ...(ball ? {} : { h }), unit: "cm" },
      needsVisual: true,
      unit: "g",
      ...keypad(mass),
      hint: `Find the volume first (${ball ? "(4/3)πr³" : "πr²h"}), then multiply by the density.`,
      explain: `Volume ≈ ${ds(r1(V))} cm³, and ${ds(r1(V))} × ${m.d} ≈ ${mass} g.`,
    };
  }
  const [l, w, h] = [rand(8, 16), rand(8, 14), pick([8, 9, 10])];
  const rate = pick([4, 5, 6]);
  return {
    key: `den-btu-${l}-${w}-${h}-${rate}`,
    prompt: `A room is ${l}×${w}×${h} ft. Heating needs ${rate} BTU per ft³. Total BTU?`,
    speech: `A room is ${l} by ${w} by ${h} feet. Heating it takes ${rate} B T Us per cubic foot. How many B T Us in all?`,
    visual: { kind: "box", l, w, h, unit: "ft" },
    unit: "BTU",
    ...keypad(l * w * h * rate),
    hint: "Find the volume first, then multiply by the rate per cubic foot.",
    explain: `${l * w * h} ft³ × ${rate} = ${l * w * h * rate} BTU.`,
  };
}

const BOX_PAIRS: [number[], number[]][] = [
  [[2, 2, 8], [2, 4, 4]],
  [[1, 4, 9], [2, 3, 6]],
  [[2, 3, 8], [3, 4, 4]],
  [[1, 8, 8], [4, 4, 4]],
  [[2, 6, 6], [3, 3, 8]],
  [[1, 6, 6], [2, 3, 6]],
  [[2, 2, 9], [3, 3, 4]],
  [[1, 5, 10], [2, 5, 5]],
];
const surf = ([a, b, c]: number[]) => 2 * (a * b + b * c + a * c);

/** HSG-MG.A.3 — design problems: maximize area or volume, minimize material, count supplies. */
export function geoDesign(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const s = rand(5, 30);
    return {
      key: `des-fence-${s}`,
      prompt: `You have ${4 * s} m of fence for a rectangular pen. Largest possible area?`,
      speech: `You have ${4 * s} meters of fence to make a rectangular pen. What is the largest area you can enclose?`,
      visual: NONE,
      unit: "m²",
      ...choose(s * s, [(s - 1) * (s + 1), 4 * s * s, s * s * 2], 1, 1),
      hint: "Try a few rectangles with that perimeter. Which shape gives the most area?",
      explain: `A square, ${s} m on each side: ${s * s} m². (${s - 1} × ${s + 1} = ${(s - 1) * (s + 1)} is smaller.)`,
    };
  }
  if (kind === 1) {
    const W = rand(10, 20);
    const L = rand(W, 30);
    const x = rand(1, Math.floor(W / 2) - 2);
    const V = x * (W - 2 * x) * (L - 2 * x);
    return {
      key: `des-box-${W}-${L}-${x}`,
      prompt: `Cut ${x} cm squares from the corners of a ${W}×${L} cm sheet and fold. Volume?`,
      speech: `Cut a ${x} centimeter square from each corner of a ${W} by ${L} centimeter sheet, then fold up the sides to make an open box. What is its volume?`,
      visual: { kind: "box", l: L - 2 * x, w: W - 2 * x, h: x, unit: "cm" },
      unit: "cm³",
      ...keypad(V),
      hint: "Each side loses two corner squares. The height is the cut size.",
      explain: `(${W} − ${2 * x}) × (${L} − ${2 * x}) × ${x} = ${W - 2 * x} × ${L - 2 * x} × ${x} = ${V} cm³.`,
    };
  }
  if (kind === 2) {
    const W = rand(4, 15);
    const H = rand(2, 4);
    const C = pick([5, 8, 10, 12]);
    const cans = Math.ceil((W * H * 2) / C);
    return {
      key: `des-paint-${W}-${H}-${C}`,
      prompt: `Paint 2 coats on a ${W} m × ${H} m wall. A can covers ${C} m². Cans needed?`,
      speech: `You need two coats of paint on a wall ${W} meters wide and ${H} meters tall. One can covers ${C} square meters. How many cans must you buy?`,
      visual: { kind: "rect", w: W, h: H, showW: true, showH: true, grid: false, unit: "m" },
      unit: "cans",
      ...keypad(cans),
      hint: "Find the total area to cover (2 coats!), divide by the coverage, and round UP.",
      explain: `${W * H} m² × 2 = ${W * H * 2} m². ${W * H * 2} ÷ ${C} ≈ ${r1((W * H * 2) / C)}, so buy ${cans} cans.`,
    };
  }
  const [A, B] = shuffle(pick(BOX_PAIRS));
  const sa = surf(A);
  const sb = surf(B);
  return {
    key: `des-cmp-${A.join("")}-${B.join("")}`,
    prompt: `Both boxes hold ${A[0] * A[1] * A[2]} cm³. Which needs less cardboard?`,
    speech: `Box A is ${A.join(" by ")} centimeters. Box B is ${B.join(" by ")} centimeters. Both hold ${A[0] * A[1] * A[2]} cubic centimeters. Which needs less cardboard?`,
    visual: { kind: "table", header: ["Box", "Length", "Width", "Height"], rows: [["A", ...A], ["B", ...B]] },
    ...label(sa < sb ? "Box A" : "Box B", ["Box A", "Box B"]),
    hint: "Compare surface areas: 2(lw + wh + lh). Boxes closer to a cube use less material.",
    explain: `A: ${sa} cm². B: ${sb} cm². Box ${sa < sb ? "A" : "B"} uses less.`,
  };
}

const MODELS: [string, string][] = [
  ["a soup can", "cylinder"],
  ["a basketball", "sphere"],
  ["an ice-cream cone", "cone"],
  ["a tree trunk", "cylinder"],
  ["a cereal box", "rectangular prism"],
  ["a tent with a square floor and one peak", "pyramid"],
  ["planet Earth", "sphere"],
  ["a traffic cone", "cone"],
  ["a brick", "rectangular prism"],
  ["a human arm", "cylinder"],
  ["an orange", "sphere"],
  ["a pencil's sharpened tip", "cone"],
];

/** HSG-MG.A.1 — model real objects with geometric shapes and estimate with them. */
export function geoModelShapes(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, MODELS.length - 1);
    const [thing, shape] = MODELS[i];
    return {
      key: `mod-${i}`,
      prompt: `Which shape best models ${thing}?`,
      speech: `To estimate its volume, which shape best models ${thing}?`,
      visual: NONE,
      ...label(shape, ["cylinder", "sphere", "cone", "rectangular prism", "pyramid"]),
      hint: "Look at its cross-sections and outline. Is it round all over, round with flat ends, pointed, or boxy?",
      explain: `${cap(thing)} is close to ${art(shape)} ${shape}.`,
    };
  }
  if (kind === 1) {
    const d = pick([4, 6, 8, 10]) / 10;
    const h = rand(5, 20);
    const v = r1(Math.PI * (d / 2) ** 2 * h);
    return {
      key: `mod-trunk-${d}-${h}`,
      prompt: `Model a tree trunk as a cylinder: diameter ${d} m, height ${h} m. Volume?`,
      speech: `Model a tree trunk as a cylinder ${d} meters across and ${h} meters tall. About how many cubic meters of wood is that, to the nearest tenth?`,
      visual: { kind: "shape", shape: "cylinder" },
      unit: "m³",
      ...keypad(v),
      hint: "Radius is half the diameter. V = πr²h.",
      explain: `r = ${d / 2} m. π × ${d / 2}² × ${h} ≈ ${ds(v)} m³.`,
    };
  }
  const r = rand(10, 15);
  const v = Math.round((4 / 3) * Math.PI * r ** 3);
  return {
    key: `mod-ball-${r}`,
    prompt: `Model a ball as a sphere with radius ${r} cm. Volume, to the nearest cm³?`,
    speech: `Model a ball as a sphere with radius ${r} centimeters. About how much air does it hold, to the nearest cubic centimeter?`,
    visual: { kind: "shape", shape: "sphere" },
    unit: "cm³",
    ...keypad(v),
    hint: "V = (4/3)πr³. Check: is your answer a bit more than 4 × r³?",
    explain: `(4/3)π × ${r}³ ≈ ${v} cm³.`,
  };
}

/* =============================================== G. Unit circle & trig functions */

const MAG: Record<number, { sin: string; cos: string; tan: string }> = {
  0: { sin: "0", cos: "1", tan: "0" },
  30: { sin: "1/2", cos: "√3/2", tan: "√3/3" },
  45: { sin: "√2/2", cos: "√2/2", tan: "1" },
  60: { sin: "√3/2", cos: "1/2", tan: "√3" },
  90: { sin: "1", cos: "0", tan: "undefined" },
};
const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Reference angle (0–90) of any angle. */
function refAngle(d: number): number {
  const a = norm360(d);
  return a <= 90 ? a : a <= 180 ? 180 - a : a <= 270 ? a - 180 : 360 - a;
}
type Fn = "sin" | "cos" | "tan";
/** Exact value of sin, cos or tan at a multiple of 30° or 45°. */
function exact(fn: Fn, d: number): string {
  const m = MAG[refAngle(d)][fn];
  if (m === "0" || m === "undefined") return m;
  const v = fn === "sin" ? sinD(d) : fn === "cos" ? cosD(d) : tanD(d);
  return v < 0 ? `−${m}` : m;
}
const MAGS = ["0", "1/2", "√2/2", "√3/2", "1", "−1/2", "−√2/2", "−√3/2", "−1"];
const TANS = ["0", "√3/3", "1", "√3", "−√3/3", "−1", "−√3", "undefined"];
const QUAD = (d: number) => {
  const a = norm360(d);
  return a < 90 ? "I" : a < 180 ? "II" : a < 270 ? "III" : "IV";
};

/** HSF-TF.A.1 — radian measure as arc length on the unit circle. */
export function trigRadians(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const d = pick([...SPECIAL.slice(1), 360, 20, 36, 72, 18]);
    return {
      key: `rad-to-${d}`,
      prompt: `Convert ${d}° to radians.`,
      speech: `Convert ${d} degrees to radians.`,
      visual: d <= 360 ? { kind: "unitcircle", angle: d } : NONE,
      ...label(radStr(d), [piStr(180, d), radStr(d + 180), piStr(d, 360), radStr(Math.abs(180 - d) || 90)]),
      hint: "180° = π radians. Multiply degrees by π/180.",
      explain: `${d} × π/180 = ${radStr(d)}.`,
    };
  }
  if (kind === 1) {
    const d = pick([...SPECIAL.slice(1), 360, 20, 36, 72, 18, 540, 450]);
    return {
      key: `rad-from-${d}`,
      prompt: `Convert ${radStr(d)} radians to degrees.`,
      speech: `Convert ${say(radStr(d))} radians to degrees.`,
      visual: NONE,
      unit: "°",
      ...keypad(d),
      hint: "π radians = 180°. Replace π with 180°.",
      explain: `${radStr(d)} × 180°/π = ${d}°.`,
    };
  }
  if (kind === 2) {
    const t = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]);
    return {
      key: `rad-dec-${t}`,
      prompt: `About how many degrees is ${ds(t)} radian${t === 1 ? "" : "s"}? (nearest degree)`,
      speech: `About how many degrees is ${say(ds(t))} radians, to the nearest degree?`,
      visual: NONE,
      unit: "°",
      ...keypad(Math.round((t * 180) / Math.PI)),
      hint: "1 radian = 180°/π ≈ 57.3°.",
      explain: `${ds(t)} × 180/π ≈ ${Math.round((t * 180) / Math.PI)}°.`,
    };
  }
  const d = pick(SPECIAL.slice(1).concat([360]));
  return {
    key: `rad-arc-${d}`,
    prompt: `On the unit circle, how long is the arc for a ${d}° angle?`,
    speech: `On the unit circle, radius 1, how long is the arc cut off by a ${d} degree central angle?`,
    visual: d < 360 ? { kind: "unitcircle", angle: d } : NONE,
    ...label(radStr(d), [`${d}`, radStr(2 * d), piStr(d, 360), radStr(180 - d === 0 ? 90 : Math.abs(180 - d))]),
    hint: "On a circle of radius 1, arc length equals the angle in radians.",
    explain: `The full circle is 2π long. ${d}/360 of 2π is ${radStr(d)} — the angle's radian measure.`,
  };
}

/** HSF-TF.A.1, A.2 — make angles given in radians or by their trig values. */
export function trigMakeAngles(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const d = pick([15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 20, 40, 80, 100, 140, 160]);
    return {
      key: `ma-rad-${d}`,
      prompt: `Make an angle of ${radStr(d)} radians.`,
      speech: `Drag the ray to make an angle of ${say(radStr(d))} radians.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "makeAngle", degrees: d, scale: true },
      answer: d,
      hint: "π radians is a straight angle (180°). What fraction of that is it?",
      explain: `${radStr(d)} = ${d}°.`,
    };
  }
  if (kind === 1) {
    const vals: [string, number][] = [
      ["1/2", 60],
      ["−1/2", 120],
      ["√2/2", 45],
      ["−√2/2", 135],
      ["√3/2", 30],
      ["−√3/2", 150],
      ["0", 90],
      ["−1", 180],
    ];
    const [v, d] = pick(vals);
    return {
      key: `ma-cos-${d}`,
      prompt: `Make the angle θ between 0° and 180° with cos θ = ${v}.`,
      speech: `Drag the ray to make the angle theta, between 0 and 180 degrees, whose cosine is ${say(v)}.`,
      visual: { kind: "unitcircle", angle: 0 },
      input: "activity",
      activity: { kind: "makeAngle", degrees: d, scale: true },
      answer: d,
      hint: "cos θ is the x-coordinate on the unit circle. Negative means the ray leans left.",
      explain: `cos ${d}° = ${v}.`,
    };
  }
  const ref = pick([10, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80]);
  const q = rand(2, 4);
  const d = q === 2 ? 180 - ref : q === 3 ? 180 + ref : 360 - ref;
  return {
    key: `ma-ref-${d}`,
    prompt: `Make the reference angle for ${d}°.`,
    speech: `Drag the ray to make the reference angle for ${d} degrees: the acute angle its ray makes with the x-axis.`,
    visual: { kind: "unitcircle", angle: d },
    input: "activity",
    activity: { kind: "makeAngle", degrees: ref, scale: true },
    answer: ref,
    hint: "How far is the ray from the nearest part of the x-axis (180° or 360°)?",
    explain: `${d}° is ${ref}° from the x-axis, so the reference angle is ${ref}°.`,
  };
}

/** HSF-TF.A.2 — the unit circle extends sine and cosine to all angles. */
export function trigUnitCircle(): Question {
  const kind = rand(0, 5);
  if (kind === 0) {
    let d = rand(5, 355);
    while (d % 90 === 0) d = rand(5, 355);
    const fn = pick(["sin", "cos", "tan"] as Fn[]);
    const v = fn === "sin" ? sinD(d) : fn === "cos" ? cosD(d) : tanD(d);
    return {
      key: `uc-sign-${fn}-${d}`,
      prompt: `Is ${fn} ${d}° positive or negative?`,
      speech: `Is the ${TRIG_NAME[fn]} of ${d} degrees positive or negative?`,
      visual: { kind: "unitcircle", angle: d, show: ["sin", "cos"] },
      ...label(v > 0 ? "positive" : "negative", ["positive", "negative"]),
      hint: "cos θ is the point's x, sin θ is its y, and tan θ = y ÷ x.",
      explain: `${d}° is in quadrant ${QUAD(d)}: x is ${cosD(d) > 0 ? "positive" : "negative"}, y is ${sinD(d) > 0 ? "positive" : "negative"}. So ${fn} ${d}° is ${v > 0 ? "positive" : "negative"}.`,
    };
  }
  if (kind === 1) {
    const d = pick([0, 90, 180, 270, 360, -90, 450, -180, 540, 630]);
    const P = pt(Math.round(cosD(d)), Math.round(sinD(d)));
    const useRad = rand(0, 1) === 1;
    const name = useRad ? `${radStr(d)} radians` : `${d}°`;
    return {
      key: `uc-axis-${d}-${useRad}`,
      prompt: `Which point on the unit circle is at ${name}?`,
      speech: `Which point on the unit circle is at an angle of ${say(name)}?`,
      visual: NONE,
      ...label(P, ["(1, 0)", "(0, 1)", "(−1, 0)", "(0, −1)"]),
      hint: "Start at (1, 0). Counterclockwise is positive; each 90° (π/2) is a quarter turn.",
      explain: `${name} lands at ${P}, so cos = ${ds(Math.round(cosD(d)))} and sin = ${ds(Math.round(sinD(d)))}.`,
    };
  }
  if (kind === 2) {
    let d = rand(91, 359);
    while (d % 90 === 0) d = rand(91, 359);
    return {
      key: `uc-ref-${d}`,
      prompt: `What is the reference angle for ${d}°?`,
      speech: `What is the reference angle for ${d} degrees?`,
      visual: { kind: "unitcircle", angle: d },
      unit: "°",
      ...choose(refAngle(d), [d - 90, 360 - d, 180 - d, d - 180].filter((v) => v > 0 && v !== refAngle(d)), 5, 1),
      hint: "The reference angle is the acute angle between the ray and the x-axis.",
      explain: `${d}° is ${refAngle(d)}° from the x-axis.`,
    };
  }
  if (kind === 3) {
    const base = rand(1, 359);
    const turns = pick([1, 2, -1, -2]);
    const d = base + 360 * turns;
    return {
      key: `uc-cot-${d}`,
      prompt: `Which angle from 0° to 360° is coterminal with ${d}°?`,
      speech: `Which angle between 0 and 360 degrees ends in the same place as ${say(ds(d))} degrees?`,
      visual: NONE,
      unit: "°",
      ...keypad(base),
      hint: "Add or subtract 360° (full turns) until you land between 0° and 360°.",
      explain: `${ds(d)}° ${turns > 0 ? "−" : "+"} ${Math.abs(turns) * 360}° = ${base}°.`,
    };
  }
  if (kind === 4) {
    let d = rand(5, 355);
    while (d % 90 === 0) d = rand(5, 355);
    const useRad = d % 15 === 0 && rand(0, 1) === 1;
    const name = useRad ? `${radStr(d)} radians` : `${d}°`;
    return {
      key: `uc-quad-${d}-${useRad}`,
      prompt: `Which quadrant does an angle of ${name} end in?`,
      speech: `Which quadrant does an angle of ${say(name)} end in?`,
      visual: NONE,
      ...label(`Quadrant ${QUAD(d)}`, ["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"]),
      hint: "Quadrant I is 0° to 90° (0 to π/2), then go counterclockwise.",
      explain: `${name} is between ${Math.floor(d / 90) * 90}° and ${Math.floor(d / 90) * 90 + 90}°: quadrant ${QUAD(d)}.`,
    };
  }
  const [c0, s0] = pick([
    [0.6, 0.8],
    [0.8, 0.6],
    [0.28, 0.96],
    [0.96, 0.28],
  ]);
  const sx = pick([1, -1]);
  const sy = pick([1, -1]);
  const askSin = rand(0, 1) === 1;
  const ans = askSin ? sy * s0 : sx * c0;
  return {
    key: `uc-pt-${c0}-${sx}-${sy}-${askSin}`,
    prompt: `The ray for θ meets the unit circle at ${pt(sx * c0, sy * s0)}. ${askSin ? "sin" : "cos"} θ = ?`,
    speech: `The ray for angle theta meets the unit circle at ${sayPt(sx * c0, sy * s0)}. What is the ${askSin ? "sine" : "cosine"} of theta?`,
    visual: NONE,
    ...choose(ans, [-ans, askSin ? sx * c0 : sy * s0, askSin ? -sx * c0 : -sy * s0], 0.1),
    hint: "The point at angle θ on the unit circle is (cos θ, sin θ).",
    explain: `(cos θ, sin θ) = ${pt(sx * c0, sy * s0)}, so ${askSin ? "sin" : "cos"} θ = ${ds(ans)}.`,
  };
}

/** HSF-TF.A.3 — exact values at π/6, π/4, π/3 and their reflections around the circle. */
export function trigSpecialAngles(): Question {
  const kind = rand(0, 2);
  const d = pick(SPECIAL.filter((x) => (kind === 2 ? x > 0 && x < 90 : true)));
  const fn = pick(["sin", "cos", "tan"] as Fn[]);
  const right = exact(fn, d);
  const useRad = kind === 1;
  const name = useRad ? radStr(d) : `${d}°`;
  if (kind === 2) {
    const f2 = pick(["sin", "cos", "tan"] as Fn[]);
    const r = exact(f2, d);
    const tri: Visual =
      d === 45 ? { kind: "righttri", a: 1, b: 1, c: null, angle: 45 } : d === 30 ? { kind: "righttri", a: 1, b: null, c: 2, angle: 30 } : { kind: "righttri", a: null, b: 1, c: 2, angle: 60 };
    return {
      key: `sp-tri-${f2}-${d}`,
      prompt: `Use the special right triangle. ${f2} ${d}° = ?`,
      speech: `Use the special right triangle to find the exact value of ${TRIG_NAME[f2]} of ${d} degrees.`,
      visual: tri,
      ...label(r, f2 === "tan" ? TANS.filter((t) => !t.startsWith("−")) : MAGS.filter((t) => !t.startsWith("−"))),
      hint: d === 45 ? "A 45-45-90 triangle with legs 1 has hypotenuse √2." : "A 30-60-90 triangle with hypotenuse 2 has legs 1 (opposite 30°) and √3.",
      explain: `${f2} ${d}° = ${r}${r.includes("√") && f2 !== "tan" && d === 45 ? " (1/√2, rationalized)" : ""}.`,
    };
  }
  return {
    key: `sp-${fn}-${d}-${useRad}`,
    prompt: `Exact value: ${fn}(${name})?`,
    speech: `What is the exact value of ${TRIG_NAME[fn]} of ${say(name)}${useRad ? " radians" : ""}?`,
    visual: { kind: "unitcircle", angle: d, show: fn === "sin" ? ["sin"] : fn === "cos" ? ["cos"] : ["sin", "cos"] },
    ...label(right, fn === "tan" ? TANS : MAGS),
    hint: `Find the reference angle (${refAngle(d)}°), use its value, then pick the sign from the quadrant.`,
    explain: `Reference angle ${refAngle(d)}°: ${fn} = ${MAG[refAngle(d)][fn]} in size${right.startsWith("−") ? ", negative in this quadrant" : ""}. So ${fn}(${name}) = ${right}.`,
  };
}

const SYM_IDS: [string, string][] = [
  ["sin(−θ)", "−sin θ"],
  ["cos(−θ)", "cos θ"],
  ["tan(−θ)", "−tan θ"],
  ["sin(θ + 2π)", "sin θ"],
  ["cos(π − θ)", "−cos θ"],
  ["sin(π − θ)", "sin θ"],
  ["sin(π + θ)", "−sin θ"],
  ["cos(π + θ)", "−cos θ"],
  ["tan(θ + π)", "tan θ"],
  ["cos(2π − θ)", "cos θ"],
];

/** HSF-TF.A.4 — symmetry (odd and even) and periodicity of the trig functions. */
export function trigSymmetry(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const i = rand(0, SYM_IDS.length - 1);
    const [lhs, rhs] = SYM_IDS[i];
    return {
      key: `sym-id-${i}`,
      prompt: `${lhs} = ?`,
      speech: `${say(lhs)} equals what?`,
      visual: NONE,
      ...label(rhs, [rhs.startsWith("−") ? rhs.slice(1) : `−${rhs}`, ...shuffle(["sin θ", "−sin θ", "cos θ", "−cos θ", "tan θ", "−tan θ"])], true),
      hint: "Picture θ and the new angle on the unit circle. Did the point reflect across an axis, or go all the way around?",
      explain: `${lhs} = ${rhs}.`,
    };
  }
  if (kind === 1) {
    const v = pick(DECIMAL_SINES);
    const which = rand(0, 3);
    const items: [string, string, number][] = [
      [`sin θ = ${v}`, "sin(−θ)", -v],
      [`cos θ = ${v}`, "cos(−θ)", v],
      [`cos θ = ${v}`, "cos(π − θ)", -v],
      [`sin θ = ${v}`, "sin(π − θ)", v],
    ];
    const [given, ask, ans] = items[which];
    return {
      key: `sym-num-${v}-${which}`,
      prompt: `${given}. What is ${ask}?`,
      speech: `${say(given.replace(/^(sin|cos)/, (f) => TRIG_NAME[f as Fn] + " of"))}. What is ${say(ask.replace(/^(sin|cos)/, (f) => TRIG_NAME[f as Fn] + " of"))}?`,
      visual: NONE,
      ...choose(ans, [-ans, r2(1 - v), r2(Math.sqrt(1 - v * v))], 0.1),
      hint: "Sine is odd: sin(−θ) = −sin θ. Cosine is even: cos(−θ) = cos θ. Reflecting across the y-axis flips cos only.",
      explain: `${ask} = ${ds(ans)}.`,
    };
  }
  if (kind === 2) {
    const base = rand(1, 359);
    const k = pick([1, 2]);
    const fn = pick(["sin", "cos"] as Fn[]);
    return {
      key: `sym-per-${fn}-${base}-${k}`,
      prompt: `${fn} ${base + 360 * k}° = ${fn} ?°  (0° to 360°)`,
      speech: `${cap(TRIG_NAME[fn])} of ${base + 360 * k} degrees equals ${TRIG_NAME[fn]} of what angle between 0 and 360?`,
      visual: { kind: "unitcircle", angle: base },
      unit: "°",
      ...keypad(base),
      hint: `${fn} repeats every 360° (2π). Take away full turns.`,
      explain: `${base + 360 * k}° − ${360 * k}° = ${base}°, the same point on the circle.`,
    };
  }
  const a = rand(91, 179);
  const fn = rand(0, 1) === 1 ? "sin" : "cos";
  return {
    key: `sym-sup-${fn}-${a}`,
    prompt: fn === "sin" ? `sin ${a}° = sin ?° (acute angle)` : `cos ${a}° = −cos ?° (acute angle)`,
    speech: fn === "sin" ? `The sine of ${a} degrees equals the sine of which acute angle?` : `The cosine of ${a} degrees equals negative the cosine of which acute angle?`,
    visual: { kind: "unitcircle", angle: a, show: [fn as "sin" | "cos"] },
    unit: "°",
    ...choose(180 - a, [a - 90, 90 - (a - 90) === 180 - a ? a - 80 : 90 - (a - 90), 360 - a].filter((v) => v > 0 && v !== 180 - a), 5, 1),
    hint: "Reflect the point across the y-axis: θ ↔ 180° − θ. The y stays, the x flips sign.",
    explain: fn === "sin" ? `sin(180° − θ) = sin θ: 180° − ${a}° = ${180 - a}°.` : `cos(180° − θ) = −cos θ: 180° − ${a}° = ${180 - a}°.`,
  };
}

/** "y = 3 sin(2x) + 1" with x in degrees. */
function trigFn(fn: "sin" | "cos", A: number, B: number, D: number): string {
  const a = A === 1 ? "" : A === -1 ? "−" : ds(A);
  const inner = B === 1 ? "x" : `${B}x`;
  return `y = ${a}${a && a !== "−" ? " " : ""}${fn}(${inner})${D === 0 ? "" : plus(D)}`;
}

/** HSF-TF.B.5 — model periodic things with trig functions: amplitude, period (frequency), midline. */
export function trigGraphs(): Question {
  const kind = rand(0, 4);
  const fn = pick(["sin", "cos"] as const);
  const A = nz(-5, 5);
  const B = pick([1, 2, 3, 4, 6]);
  const D = rand(-3, 3);
  const eq = trigFn(fn, A, B, D);
  const ask = rand(0, 2);
  const what = ["amplitude", "period (in degrees)", "midline"][ask];
  const graph: Visual = {
    kind: "plot",
    x: [0, 360],
    y: [D - Math.abs(A) - 1, D + Math.abs(A) + 1],
    curves: [{ fn: (x: number) => A * (fn === "sin" ? sinD(B * x) : cosD(B * x)) + D }],
  };
  const answerFor = (): Answer =>
    ask === 0
      ? choose(Math.abs(A), [2 * Math.abs(A), Math.abs(A) + Math.abs(D) || 7, B].filter((v) => v !== Math.abs(A)), 1, 1)
      : ask === 1
        ? choose(360 / B, [180 / B, 360 * B, B].filter((v) => v !== 360 / B), 30, 1)
        : label(`y = ${ds(D)}`, [`y = ${ds(-D)}`, `y = ${ds(D + Math.abs(A))}`, `y = ${ds(A)}`, `y = ${ds(D - Math.abs(A))}`]);
  if (kind <= 1) {
    const fromGraph = kind === 1;
    return {
      key: `tg-${fromGraph ? "graph" : "eq"}-${fn}-${A}-${B}-${D}-${ask}`,
      prompt: fromGraph ? `Read the graph. What is the ${what}?` : `${eq}, x in degrees. What is the ${what}?`,
      speech: fromGraph ? `This graph shows a sine-type wave for x from 0 to 360 degrees. What is its ${what}?` : `For ${say(eq)}, with x in degrees, what is the ${what}?`,
      visual: fromGraph ? graph : NONE,
      needsVisual: fromGraph,
      unit: ask === 1 ? "°" : undefined,
      ...answerFor(),
      hint: ask === 0 ? "Amplitude = half the distance from max to min (|A|)." : ask === 1 ? "Period = 360° ÷ B: the length of one full wave." : "The midline is halfway between the max and min: y = D.",
      explain: `${fromGraph ? `This is ${eq}. ` : ""}Amplitude ${Math.abs(A)}, period 360° ÷ ${B} = ${360 / B}°, midline y = ${ds(D)}.`,
    };
  }
  if (kind === 2) {
    const ferris = rand(0, 1) === 1;
    if (ferris) {
      const diam = rand(2, 8) * 10;
      const hub = diam / 2 + rand(1, 5);
      const T = rand(2, 12);
      const q = rand(0, 2);
      const vals = [diam / 2, hub, T];
      return {
        key: `tg-wheel-${diam}-${hub}-${T}-${q}`,
        prompt: `A Ferris wheel: ${diam} m across, hub ${hub} m up, one turn every ${T} min. ${["Amplitude", "Midline height", "Period (min)"][q]}?`,
        speech: `A Ferris wheel is ${diam} meters across, its hub is ${hub} meters above the ground, and it turns once every ${T} minutes. Model a rider's height with a sine function. What is the ${["amplitude", "midline height", "period in minutes"][q]}?`,
        visual: NONE,
        unit: q === 2 ? "min" : "m",
        ...choose(vals[q], [diam, hub - diam / 2, 2 * T, T / 2].filter((v) => v > 0 && Number.isInteger(v) && v !== vals[q]), 1, 1),
        hint: "Amplitude = radius. Midline = hub height. Period = time for one full turn.",
        explain: `Amplitude ${diam / 2} m, midline ${hub} m, period ${T} min.`,
      };
    }
    const low = rand(0, 4);
    const high = low + 2 * rand(1, 5);
    const q = rand(0, 1);
    return {
      key: `tg-tide-${low}-${high}-${q}`,
      prompt: `Tide: high ${high} m, low ${low} m. ${q === 0 ? "Amplitude" : "Midline"} of the model?`,
      speech: `The tide in a harbor rises to ${high} meters at high tide and falls to ${low} meters at low tide. In a trig model, what is the ${q === 0 ? "amplitude" : "midline"}?`,
      visual: NONE,
      unit: "m",
      ...choose(q === 0 ? (high - low) / 2 : (high + low) / 2, [high - low, (high + low) / 2, (high - low) / 2, high].filter((v) => v !== (q === 0 ? (high - low) / 2 : (high + low) / 2)), 1, 0),
      hint: "Amplitude = (max − min) ÷ 2. Midline = (max + min) ÷ 2.",
      explain: q === 0 ? `(${high} − ${low}) ÷ 2 = ${(high - low) / 2} m.` : `(${high} + ${low}) ÷ 2 = ${(high + low) / 2} m.`,
    };
  }
  if (kind === 3) {
    const mx = rand(0, 1) === 1;
    return {
      key: `tg-max-${fn}-${A}-${B}-${D}-${mx}`,
      prompt: `${eq}. What is its ${mx ? "maximum" : "minimum"} value?`,
      speech: `What is the ${mx ? "maximum" : "minimum"} value of ${say(eq)}?`,
      visual: NONE,
      ...signed(mx ? D + Math.abs(A) : D - Math.abs(A)),
      hint: `${fn} swings between −1 and 1. Stretch by the amplitude, then shift by the midline.`,
      explain: `${mx ? "Max" : "Min"} = midline ${mx ? "+" : "−"} amplitude = ${ds(D)} ${mx ? "+" : "−"} ${Math.abs(A)} = ${ds(mx ? D + Math.abs(A) : D - Math.abs(A))}.`,
    };
  }
  const [per, f] = pick([
    [0.5, 2],
    [0.25, 4],
    [0.2, 5],
    [2, 0.5],
    [4, 0.25],
    [0.1, 10],
    [5, 0.2],
  ]);
  const back = rand(0, 1) === 1;
  return {
    key: `tg-freq-${per}-${back}`,
    prompt: back ? `A wave has frequency ${f} cycles per second. Period?` : `A spring bobs once every ${per} s. Frequency (cycles per second)?`,
    speech: back ? `A wave has a frequency of ${f} cycles per second. What is its period in seconds?` : `A spring bobs up and down once every ${per} seconds. What is its frequency, in cycles per second?`,
    visual: NONE,
    unit: back ? "s" : "per s",
    ...keypad(back ? per : f),
    hint: "Frequency and period are reciprocals: f = 1 ÷ period.",
    explain: back ? `Period = 1 ÷ ${f} = ${per} s.` : `Frequency = 1 ÷ ${per} = ${f} cycles per second.`,
  };
}

const INVERSES: [string, number][] = [
  ["sin⁻¹(1/2)", 30], ["sin⁻¹(−1/2)", -30], ["sin⁻¹(√2/2)", 45], ["sin⁻¹(−√3/2)", -60], ["sin⁻¹(1)", 90],
  ["sin⁻¹(−1)", -90], ["cos⁻¹(1/2)", 60], ["cos⁻¹(−1/2)", 120], ["cos⁻¹(0)", 90], ["cos⁻¹(−1)", 180],
  ["cos⁻¹(−√2/2)", 135], ["cos⁻¹(√3/2)", 30], ["cos⁻¹(−√3/2)", 150], ["tan⁻¹(1)", 45], ["tan⁻¹(−1)", -45],
  ["tan⁻¹(√3)", 60], ["tan⁻¹(−√3/3)", -30], ["tan⁻¹(0)", 0],
];

/** HSF-TF.B.6 — restricting domains to build inverse trig functions. */
export function trigInverse(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const [expr, v] = pick(INVERSES);
    return {
      key: `inv-${expr}`,
      prompt: `${expr} = ? (in degrees)`,
      speech: `What is ${say(expr)}, in degrees?`,
      visual: NONE,
      unit: "°",
      ...signed(v),
      hint: "sin⁻¹ and tan⁻¹ give angles from −90° to 90°; cos⁻¹ gives 0° to 180°.",
      explain: `${expr} = ${ds(v)}°, the one angle in the allowed range with that value.`,
    };
  }
  if (kind === 1) {
    const i = rand(0, 2);
    const names = ["sin⁻¹", "cos⁻¹", "tan⁻¹"];
    const ranges = ["−90° to 90°", "0° to 180°", "between −90° and 90° (not equal)"];
    return {
      key: `inv-range-${i}`,
      prompt: `${names[i]} always gives an angle in which range?`,
      speech: `The inverse ${["sine", "cosine", "tangent"][i]} function always gives an angle in which range?`,
      visual: NONE,
      ...label(ranges[i], ["−90° to 90°", "0° to 180°", "between −90° and 90° (not equal)", "0° to 360°"]),
      hint: "Pick the stretch where the function hits every value exactly once, near 0°.",
      explain: `${names[i]} uses ${ranges[i]}: there the original function is one-to-one.`,
    };
  }
  if (kind === 2) {
    const sin = rand(0, 1) === 1;
    const d = sin ? rand(91, 179) : rand(181, 359);
    const ans = sin ? 180 - d : 360 - d;
    return {
      key: `inv-trick-${sin}-${d}`,
      prompt: sin ? `sin⁻¹(sin ${d}°) = ?` : `cos⁻¹(cos ${d}°) = ?`,
      speech: sin ? `What is inverse sine of sine of ${d} degrees?` : `What is inverse cosine of cosine of ${d} degrees?`,
      visual: { kind: "unitcircle", angle: d, show: [sin ? "sin" : "cos"] },
      unit: "°",
      ...signed(ans),
      hint: sin ? `${d}° isn't in sin⁻¹'s range (−90° to 90°). Which angle in that range has the same sine?` : `${d}° isn't in cos⁻¹'s range (0° to 180°). Which angle in that range has the same cosine?`,
      explain: sin ? `sin ${d}° = sin ${ans}°, and ${ans}° is in range. So it's ${ans}°, not ${d}°.` : `cos ${d}° = cos ${ans}°, and ${ans}° is in range. So it's ${ans}°.`,
    };
  }
  if (kind === 3) {
    const fn = pick(["sine", "cosine", "tangent"]);
    const n = rand(1, 4);
    return {
      key: `inv-why-${fn}-${n}`,
      prompt: `Why must we restrict ${fn}'s domain to define its inverse?`,
      speech: `Why do we have to restrict the domain of ${fn} before we can define its inverse?`,
      visual: { kind: "plot", x: [-360, 360], y: [-2, 2], curves: [{ fn: (x: number) => (fn === "sine" ? sinD(x) : fn === "cosine" ? cosD(x) : tanD(x)) }] },
      ...label("It repeats, so each output comes from many angles", [
        "Its graph has no outputs below 0",
        "Calculators can't handle big angles",
        "It isn't defined for negative angles",
      ]),
      hint: "Draw a horizontal line across the graph. How many times does it hit?",
      explain: "A horizontal line hits the graph over and over. Keeping one stretch where each output appears once makes an inverse possible.",
    };
  }
  const v = rand(1, 9) / 10;
  const fn = rand(0, 1) === 1 ? "sin" : "cos";
  const ans = r1(toDeg(fn === "sin" ? Math.asin(v) : Math.acos(v)));
  return {
    key: `inv-calc-${fn}-${v}`,
    prompt: `${fn}⁻¹(${v}) ≈ ?° (nearest tenth)`,
    speech: `Use a calculator in degree mode. What is inverse ${fn === "sin" ? "sine" : "cosine"} of ${v}, to the nearest tenth of a degree?`,
    visual: NONE,
    unit: "°",
    ...keypad(ans),
    hint: `Use the ${fn}⁻¹ key in degree mode. The answer is between ${fn === "sin" ? "0° and 90°" : "0° and 90°"} here.`,
    explain: `${fn}⁻¹(${v}) ≈ ${ds(ans)}°.`,
  };
}

const TRIG_SOLS: { fn: "sin" | "cos"; v: string; sols: [number, number] }[] = [
  { fn: "sin", v: "1/2", sols: [30, 150] },
  { fn: "sin", v: "√2/2", sols: [45, 135] },
  { fn: "sin", v: "√3/2", sols: [60, 120] },
  { fn: "sin", v: "−1/2", sols: [210, 330] },
  { fn: "sin", v: "−√2/2", sols: [225, 315] },
  { fn: "sin", v: "−√3/2", sols: [240, 300] },
  { fn: "cos", v: "1/2", sols: [60, 300] },
  { fn: "cos", v: "√2/2", sols: [45, 315] },
  { fn: "cos", v: "√3/2", sols: [30, 330] },
  { fn: "cos", v: "−1/2", sols: [120, 240] },
  { fn: "cos", v: "−√2/2", sols: [135, 225] },
  { fn: "cos", v: "−√3/2", sols: [150, 210] },
];

/** HSF-TF.B.7 — solve trig equations and interpret the solutions. */
export function trigEquations(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const s = pick(TRIG_SOLS.filter((t) => kind === 0 || t.v === "1/2" || t.v === "−1/2"));
    const big = rand(0, 1) === 1;
    let eq = `${s.fn} x = ${s.v}`;
    if (kind === 1) {
      const a = pick([2, 4, 6]);
      const b = nz(-5, 5);
      const c = (a * (s.v === "1/2" ? 1 : -1)) / 2 + b;
      eq = `${a} ${s.fn} x${plus(b)} = ${ds(c)}`;
    }
    return {
      key: `te-${kind}-${eq}-${big}`,
      prompt: `Solve ${eq} for 0° ≤ x < 360°. The ${big ? "larger" : "smaller"} solution?`,
      speech: `Solve ${say(eq.replace(s.fn, TRIG_NAME[s.fn]))} for x from 0 up to 360 degrees. What is the ${big ? "larger" : "smaller"} solution?`,
      visual: { kind: "unitcircle", angle: s.sols[0] },
      unit: "°",
      ...choose(s.sols[big ? 1 : 0], [s.sols[big ? 0 : 1], 180 - s.sols[0] === s.sols[1] ? 180 + s.sols[0] : 180 - s.sols[0], 360 - s.sols[1]].filter((v) => v >= 0 && v < 360 && v !== s.sols[big ? 1 : 0]), 15, 0),
      hint: kind === 1 ? `First get ${s.fn} x alone. Then find the reference angle and the two quadrants with the right sign.` : "Find the reference angle, then the two quadrants where the sign matches.",
      explain: `${kind === 1 ? `${s.fn} x = ${s.v}. ` : ""}Solutions: ${s.sols[0]}° and ${s.sols[1]}°.`,
    };
  }
  if (kind === 2) {
    const A = rand(2, 10) * 2;
    const D = A + rand(2, 10);
    const top = rand(0, 1) === 1;
    const B = pick(top ? [10, 15, 30, 45, 90] : [10, 15, 30]);
    const t = top ? 90 / B : 30 / B;
    return {
      key: `te-model-${A}-${D}-${B}-${top}`,
      prompt: `h(t) = ${A} sin(${B}t)° + ${D}. First t > 0 with h = ${top ? D + A : D + A / 2}?`,
      speech: `A rider's height is h of t equals ${A} sine of ${B} t degrees, plus ${D}, with t in seconds. When does the height first reach ${top ? D + A : D + A / 2}?`,
      visual: { kind: "plot", x: [0, Math.max(4 * t, 360 / B)], y: [0, D + A + 2], curves: [{ fn: (x: number) => A * sinD(B * x) + D }], lines: [{ from: [0, top ? D + A : D + A / 2], to: [Math.max(4 * t, 360 / B), top ? D + A : D + A / 2], dashed: true }] },
      unit: "s",
      ...keypad(t),
      hint: `Subtract ${D} and divide by ${A}: sin(${B}t°) = ${top ? "1" : "1/2"}. The smallest angle with that sine is ${top ? 90 : 30}°.`,
      explain: `${B}t = ${top ? 90 : 30}, so t = ${ds(t)} s.`,
    };
  }
  const v = rand(1, 9) / 10;
  const big = rand(0, 1) === 1;
  const x1 = r1(toDeg(Math.asin(v)));
  const ans = big ? r1(180 - x1) : x1;
  return {
    key: `te-calc-${v}-${big}`,
    prompt: `sin x = ${v} for 0° ≤ x ≤ 180°. The ${big ? "obtuse" : "acute"} solution (nearest tenth)?`,
    speech: `Solve sine of x equals ${v} for x from 0 to 180 degrees. What is the ${big ? "obtuse" : "acute"} solution, to the nearest tenth?`,
    visual: { kind: "plot", x: [0, 180], y: [0, 1.2], curves: [{ fn: (x: number) => sinD(x) }], lines: [{ from: [0, v], to: [180, v], dashed: true }] },
    unit: "°",
    ...keypad(ans),
    hint: big ? "sin⁻¹ gives the acute one. The other is 180° minus it (same height on the unit circle)." : "Use sin⁻¹ in degree mode.",
    explain: `sin⁻¹(${v}) ≈ ${ds(x1)}°${big ? `, and 180° − ${ds(x1)}° ≈ ${ds(ans)}°` : ""}.`,
  };
}

/** HSF-TF.C.8 — sin²θ + cos²θ = 1, and using it with the quadrant to find values. */
export function trigPythagoreanIdentity(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const [o, a, h] = triple(29);
    const q = rand(1, 4);
    const sS = q <= 2 ? 1 : -1;
    const cS = q === 1 || q === 4 ? 1 : -1;
    const givenSin = rand(0, 1) === 1;
    const askTan = kind === 1;
    const qName = ["I", "II", "III", "IV"][q - 1];
    const given = givenSin ? `sin θ = ${frac(sS * o, h)}` : `cos θ = ${frac(cS * a, h)}`;
    const ans = askTan ? frac(sS * cS * o, a) : givenSin ? frac(cS * a, h) : frac(sS * o, h);
    const wrong = askTan
      ? [frac(-sS * cS * o, a), frac(sS * cS * a, o), frac(sS * o, h)]
      : givenSin
        ? [frac(-cS * a, h), frac(cS * h, a), frac(cS * (h - o), h)]
        : [frac(-sS * o, h), frac(sS * h, o), frac(sS * (h - a), h)];
    return {
      key: `pid-${kind}-${o}-${a}-${q}-${givenSin}`,
      prompt: `${given}, θ in quadrant ${qName}. Find ${askTan ? "tan θ" : givenSin ? "cos θ" : "sin θ"}.`,
      speech: `${say(given.replace(/^(sin|cos)/, (f) => TRIG_NAME[f as Fn] + " of"))}, and theta is in quadrant ${q}. Find ${askTan ? "the tangent" : givenSin ? "the cosine" : "the sine"} of theta.`,
      visual: NONE,
      ...label(ans, wrong),
      hint: "sin²θ + cos²θ = 1 gives the size. The quadrant gives the sign.",
      explain: `${givenSin ? `cos²θ = 1 − ${o * o}/${h * h} = ${a * a}/${h * h}, cos θ = ${frac(cS * a, h)}` : `sin²θ = 1 − ${a * a}/${h * h} = ${o * o}/${h * h}, sin θ = ${frac(sS * o, h)}`} (quadrant ${qName}).${askTan ? ` tan θ = sin θ ÷ cos θ = ${ans}.` : ""}`,
    };
  }
  if (kind === 2) {
    const d = rand(1, 359);
    const fn = rand(0, 1) === 1;
    return {
      key: `pid-one-${d}-${fn}`,
      prompt: fn ? `sin² ${d}° + cos² ${d}° = ?` : `1 − sin² ${d}° equals…`,
      speech: fn ? `What is sine squared of ${d} degrees plus cosine squared of ${d} degrees?` : `One minus sine squared of ${d} degrees equals what?`,
      visual: { kind: "unitcircle", angle: d, show: ["sin", "cos"] },
      ...(fn ? choose(1, [0, 2, -1]) : label(`cos² ${d}°`, [`sin² ${d}°`, `cos ${d}°`, "0"])),
      hint: "The point (cos θ, sin θ) is on the unit circle x² + y² = 1.",
      explain: fn ? "Always 1, whatever the angle." : `sin²θ + cos²θ = 1, so 1 − sin²θ = cos²θ: cos² ${d}°.`,
    };
  }
  const [c0, s0] = pick([
    [0.6, 0.8],
    [0.8, 0.6],
    [0.28, 0.96],
    [0.96, 0.28],
  ]);
  const q = rand(1, 4);
  const sS = q <= 2 ? 1 : -1;
  const cS = q === 1 || q === 4 ? 1 : -1;
  const givenSin = rand(0, 1) === 1;
  const ans = givenSin ? cS * c0 : sS * s0;
  return {
    key: `pid-dec-${c0}-${q}-${givenSin}`,
    prompt: `${givenSin ? `sin θ = ${ds(sS * s0)}` : `cos θ = ${ds(cS * c0)}`}, quadrant ${["I", "II", "III", "IV"][q - 1]}. ${givenSin ? "cos θ" : "sin θ"}?`,
    speech: `${givenSin ? `Sine of theta is ${say(ds(sS * s0))}` : `Cosine of theta is ${say(ds(cS * c0))}`}, and theta is in quadrant ${q}. What is the ${givenSin ? "cosine" : "sine"} of theta?`,
    visual: NONE,
    ...choose(ans, [-ans, givenSin ? sS * s0 : cS * c0, r2(1 - (givenSin ? s0 : c0))], 0.1),
    hint: `Square the given value, take it from 1, then square-root. Choose the sign for quadrant ${["I", "II", "III", "IV"][q - 1]}.`,
    explain: `1 − ${ds(givenSin ? s0 : c0)}² = ${r2(1 - (givenSin ? s0 : c0) ** 2)}, √ = ${givenSin ? c0 : s0}, with sign: ${ds(ans)}.`,
  };
}

const SUMDIFF: { e: string; v: string }[] = [
  { e: "sin 75°", v: "(√6 + √2)/4" },
  { e: "cos 75°", v: "(√6 − √2)/4" },
  { e: "sin 15°", v: "(√6 − √2)/4" },
  { e: "cos 15°", v: "(√6 + √2)/4" },
  { e: "sin 105°", v: "(√6 + √2)/4" },
  { e: "cos 105°", v: "(√2 − √6)/4" },
  { e: "tan 75°", v: "2 + √3" },
  { e: "tan 15°", v: "2 − √3" },
  { e: "cos 165°", v: "−(√6 + √2)/4" },
];
const FORMULAS: [string, string, string[]][] = [
  ["sin(A + B)", "sin A cos B + cos A sin B", ["sin A sin B + cos A cos B", "sin A cos B − cos A sin B", "sin A + sin B"]],
  ["sin(A − B)", "sin A cos B − cos A sin B", ["sin A cos B + cos A sin B", "cos A cos B − sin A sin B", "sin A − sin B"]],
  ["cos(A + B)", "cos A cos B − sin A sin B", ["cos A cos B + sin A sin B", "sin A cos B + cos A sin B", "cos A + cos B"]],
  ["cos(A − B)", "cos A cos B + sin A sin B", ["cos A cos B − sin A sin B", "sin A cos B − cos A sin B", "cos A − cos B"]],
  ["tan(A + B)", "(tan A + tan B)/(1 − tan A tan B)", ["(tan A + tan B)/(1 + tan A tan B)", "tan A + tan B", "(tan A − tan B)/(1 + tan A tan B)"]],
];

/** HSF-TF.C.9 — addition and subtraction formulas for sine, cosine and tangent. */
export function trigSumDifference(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const i = rand(0, SUMDIFF.length - 1);
    const { e, v } = SUMDIFF[i];
    return {
      key: `sd-exact-${i}`,
      prompt: `Exact value of ${e}?`,
      speech: `Use a sum or difference formula. What is the exact value of ${say(e.replace(/^(sin|cos|tan)/, (f) => TRIG_NAME[f as Fn] + " of"))}?`,
      visual: NONE,
      ...label(v, SUMDIFF.map((o) => o.v).concat(["(√6 + √2)/2", "√3/4"])),
      hint: "Write the angle as a sum or difference of 30°, 45°, 60° (like 75° = 45° + 30°), then use the formula.",
      explain: `${e} = ${v}.`,
    };
  }
  if (kind === 1) {
    const i = rand(0, FORMULAS.length - 1);
    const [l, r, w] = FORMULAS[i];
    return {
      key: `sd-form-${i}`,
      prompt: `${l} = ?`,
      speech: `Which formula equals ${say(l.replace(/^(sin|cos|tan)/, (f) => TRIG_NAME[f as Fn] + " of"))}?`,
      visual: NONE,
      ...label(r, w),
      hint: "Sine mixes: sin cos and cos sin, same sign as the angle. Cosine pairs like with like and flips the sign.",
      explain: `${l} = ${r}.`,
    };
  }
  if (kind === 2) {
    const prim: [number, number, number][] = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
    ];
    const [P, Q] = shuffle(prim).slice(0, 2);
    const [oA, aA, hA] = rand(0, 1) ? P : [P[1], P[0], P[2]];
    const [oB, aB, hB] = rand(0, 1) ? Q : [Q[1], Q[0], Q[2]];
    const which = rand(0, 3);
    const H = hA * hB;
    const nums = [oA * aB + aA * oB, oA * aB - aA * oB, aA * aB - oA * oB, aA * aB + oA * oB];
    const names = ["sin(A + B)", "sin(A − B)", "cos(A + B)", "cos(A − B)"];
    const ans = frac(nums[which], H);
    return {
      key: `sd-num-${oA}-${aA}-${oB}-${aB}-${which}`,
      prompt: `A, B acute. sin A = ${oA}/${hA}, cos A = ${aA}/${hA}, sin B = ${oB}/${hB}, cos B = ${aB}/${hB}. ${names[which]}?`,
      speech: `A and B are acute angles. Sine A is ${oA} over ${hA}, cosine A is ${aA} over ${hA}, sine B is ${oB} over ${hB}, and cosine B is ${aB} over ${hB}. Find ${say(names[which].replace(/^(sin|cos)/, (f) => TRIG_NAME[f as Fn] + " of"))}.`,
      visual: NONE,
      ...label(ans, nums.filter((_, j) => j !== which).map((n) => frac(n, H)).concat([frac(oA + oB, hA + hB)])),
      hint: `Use the ${names[which].slice(0, 3)} formula with the four values.`,
      explain: `${names[which]} = ${which <= 1 ? `${oA}·${aB} ${which === 0 ? "+" : "−"} ${aA}·${oB}` : `${aA}·${aB} ${which === 2 ? "−" : "+"} ${oA}·${oB}`} over ${H} = ${ans}.`,
    };
  }
  const a = rand(4, 16) * 5;
  const b = rand(1, a / 5 - 1) * 5;
  const t = rand(0, 3);
  const exprs = [
    [`sin ${a}° cos ${b}° + cos ${a}° sin ${b}°`, "sin", a + b],
    [`sin ${a}° cos ${b}° − cos ${a}° sin ${b}°`, "sin", a - b],
    [`cos ${a}° cos ${b}° − sin ${a}° sin ${b}°`, "cos", a + b],
    [`cos ${a}° cos ${b}° + sin ${a}° sin ${b}°`, "cos", a - b],
  ] as const;
  const [e, f, ans] = exprs[t];
  return {
    key: `sd-pat-${a}-${b}-${t}`,
    prompt: `${e} = ${f} ?°`,
    speech: `${say(e)} equals the ${f === "sin" ? "sine" : "cosine"} of what angle?`,
    visual: NONE,
    unit: "°",
    ...choose(ans, [t % 2 === 0 ? a - b : a + b, a, b].filter((v) => v !== ans), 5, 0),
    hint: "Match the pattern to a sum or difference formula. Watch the sign!",
    explain: `That's the ${f}(${t % 2 === 0 ? "A + B" : "A − B"}) pattern: ${f} ${ans}°.`,
  };
}

/* ============================================================ H. Complex numbers */

/** a + bi as text: "3 + 2i", "−i", "4", "2 − i". */
function cx(a: number, b: number): string {
  const bi = Math.abs(b) === 1 ? "i" : `${ds(Math.abs(b))}i`;
  if (b === 0) return ds(a);
  if (a === 0) return b < 0 ? `−${bi}` : bi;
  return `${ds(a)} ${b < 0 ? "−" : "+"} ${bi}`;
}
const sayCx = (a: number, b: number) => say(cx(a, b)).replace(/(\d)i\b/g, "$1 i");
const cxWrongs = (a: number, b: number) => [cx(b, a), cx(-a, b), cx(a, -b), cx(-a, -b)];

/** HSN-CN.A.1 — i² = −1; complex numbers a + bi. */
export function alg2Imaginary(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const n = rand(2, 40);
    const vals = ["1", "i", "−1", "−i"];
    return {
      key: `im-pow-${n}`,
      prompt: `Simplify i^${n}.`,
      speech: `Simplify i to the power ${n}.`,
      visual: NONE,
      ...label(vals[n % 4], vals),
      hint: "Powers of i cycle every 4: i, −1, −i, 1. Divide the exponent by 4 and use the remainder.",
      explain: `${n} ÷ 4 leaves ${n % 4}, so i^${n} = i^${n % 4} = ${vals[n % 4]}.`,
    };
  }
  if (kind === 1) {
    const k = rand(2, 12);
    const sq = rand(0, 2) === 0 ? pick([2, 3, 5]) : 1;
    const inside = k * k * sq;
    const right = sq === 1 ? `${k}i` : `${k}i√${sq}`;
    return {
      key: `im-root-${k}-${sq}`,
      prompt: `Simplify √−${inside}.`,
      speech: `Simplify the square root of negative ${inside}.`,
      visual: NONE,
      ...label(right, [sq === 1 ? `−${k}` : `−${k}√${sq}`, sq === 1 ? `${k}` : `${k}√${sq}`, `${inside}i`, sq === 1 ? `${k * k}i` : `${k * sq}i`]),
      hint: "√−n = i√n. Then simplify the square root.",
      explain: `√−${inside} = i√${inside} = ${right}.`,
    };
  }
  if (kind === 2) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return {
      key: `im-prod-${a}-${b}`,
      prompt: `Simplify √−${a * a} · √−${b * b}.`,
      speech: `Multiply the square root of negative ${a * a} by the square root of negative ${b * b}.`,
      visual: NONE,
      ...signed(-a * b),
      hint: "Rewrite each with i first: √−n = i√n. Then i · i = i².",
      explain: `${a}i · ${b}i = ${a * b}i² = −${a * b}. (Not √${a * a * b * b} = ${a * b}!)`,
    };
  }
  const a = nz(-9, 9);
  const b = nz(-9, 9);
  const re = rand(0, 1) === 1;
  return {
    key: `im-part-${a}-${b}-${re}`,
    prompt: `What is the ${re ? "real" : "imaginary"} part of ${cx(a, b)}?`,
    speech: `What is the ${re ? "real" : "imaginary"} part of ${sayCx(a, b)}?`,
    visual: NONE,
    ...signed(re ? a : b),
    hint: "In a + bi, a is the real part and b (without the i) is the imaginary part.",
    explain: `${cx(a, b)}: real part ${ds(a)}, imaginary part ${ds(b)}.`,
  };
}

/** HSN-CN.A.2 — add, subtract and multiply complex numbers. */
export function alg2ComplexArith(): Question {
  const kind = rand(0, 3);
  const [a, b, c, d] = [nz(-6, 6), nz(-6, 6), nz(-6, 6), nz(-6, 6)];
  if (kind === 0) {
    return {
      key: `ca-add-${a}-${b}-${c}-${d}`,
      prompt: `(${cx(a, b)}) + (${cx(c, d)}) = ?`,
      speech: `Add ${sayCx(a, b)} and ${sayCx(c, d)}.`,
      visual: NONE,
      ...label(cx(a + c, b + d), [cx(a + d, b + c), cx(a + c, b - d), cx(a - c, b + d), `${ds(a + b + c + d)}i`]),
      hint: "Add real parts together and imaginary parts together.",
      explain: `(${ds(a)} + ${ds(c)}) + (${ds(b)} + ${ds(d)})i = ${cx(a + c, b + d)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `ca-sub-${a}-${b}-${c}-${d}`,
      prompt: `(${cx(a, b)}) − (${cx(c, d)}) = ?`,
      speech: `Subtract ${sayCx(c, d)} from ${sayCx(a, b)}.`,
      visual: NONE,
      ...label(cx(a - c, b - d), [cx(a - c, b + d), cx(a + c, b - d), cx(c - a, d - b), cx(a + c, b + d)]),
      hint: "Subtract every part: the minus sign hits both the real and the imaginary part.",
      explain: `(${ds(a)} − ${ds(c)}) + (${ds(b)} − ${ds(d)})i = ${cx(a - c, b - d)}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `ca-mul-${a}-${b}-${c}-${d}`,
      prompt: `(${cx(a, b)})(${cx(c, d)}) = ?`,
      speech: `Multiply ${sayCx(a, b)} by ${sayCx(c, d)}.`,
      visual: NONE,
      ...label(cx(a * c - b * d, a * d + b * c), [cx(a * c + b * d, a * d + b * c), cx(a * c, b * d), cx(a * c - b * d, a * d - b * c), cx(a * c - b * d, 0)]),
      hint: "FOIL, then replace i² with −1.",
      explain: `${ds(a * c)} + ${ds(a * d)}i + ${ds(b * c)}i + ${ds(b * d)}i² = ${ds(a * c)} ${b * d >= 0 ? "−" : "+"} ${Math.abs(b * d)} + ${ds(a * d + b * c)}i = ${cx(a * c - b * d, a * d + b * c)}.`,
    };
  }
  const sqr = rand(0, 1) === 1;
  if (sqr) {
    return {
      key: `ca-sq-${a}-${b}`,
      prompt: `(${cx(a, b)})² = ?`,
      speech: `Square ${sayCx(a, b)}.`,
      visual: NONE,
      ...label(cx(a * a - b * b, 2 * a * b), [cx(a * a + b * b, 2 * a * b), cx(a * a - b * b, 0), cx(a * a, b * b), cx(a * a - b * b, a * b)]),
      hint: "(a + bi)² = a² + 2abi + b²i², and i² = −1.",
      explain: `${a * a} + ${ds(2 * a * b)}i − ${b * b} = ${cx(a * a - b * b, 2 * a * b)}.`,
    };
  }
  const k = nz(-5, 5);
  return {
    key: `ca-ki-${k}-${a}-${b}`,
    prompt: `${cx(0, k)}(${cx(a, b)}) = ?`,
    speech: `Multiply ${sayCx(0, k)} by ${sayCx(a, b)}.`,
    visual: NONE,
    ...label(cx(-k * b, k * a), [cx(k * b, k * a), cx(k * a, k * b), cx(k * a, -k * b), cx(-k * b, -k * a)]),
    hint: "Distribute, and remember i · i = −1.",
    explain: `${cx(0, k * a)} + ${ds(k * b)}i² = ${cx(-k * b, k * a)}.`,
  };
}

const CX_TF: [string, boolean, string][] = [
  ["i³ = −i", true, "i³ = i² · i = −i."],
  ["i⁴ = −1", false, "i⁴ = (i²)² = 1."],
  ["(1 + i)² = 2i", true, "1 + 2i + i² = 2i."],
  ["|3 + 4i| = 7", false, "|3 + 4i| = √(9 + 16) = 5."],
  ["(2 + i) − (3 − i) = −1", false, "It's −1 + 2i: the i parts don't cancel."],
  ["√−9 = 3i", true, "√−9 = i√9 = 3i."],
  ["i · i = 1", false, "i · i = i² = −1."],
  ["(3 + 2i)(3 − 2i) = 13", true, "9 − 4i² = 9 + 4 = 13."],
  ["(1 − i)² = −2i", true, "1 − 2i + i² = −2i."],
  ["i¹⁰ = 1", false, "10 leaves remainder 2 when divided by 4, so i¹⁰ = i² = −1."],
  ["The conjugate of 4 − 5i is −4 + 5i", false, "Only the imaginary sign flips: 4 + 5i."],
];

/** HSN-CN.A.1, A.2 — spot the mistake in complex-number work. */
export function alg2ComplexMistakes(): Question {
  const kind = rand(0, 1);
  if (kind === 0) {
    const i = rand(0, CX_TF.length - 1);
    const [claim, ok, why] = CX_TF[i];
    return {
      key: `cm-tf-${i}`,
      prompt: `True or false? ${claim}`,
      speech: `True or false? ${say(claim)}`,
      visual: NONE,
      ...label(ok ? "True" : "False", [ok ? "False" : "True"]),
      hint: "Work it out yourself, remembering i² = −1.",
      explain: `${ok ? "True" : "False"}. ${why}`,
    };
  }
  const t = rand(0, 2);
  const [a, b, c, d] = [rand(1, 5), rand(1, 5), rand(1, 5), rand(1, 5)];
  if (t === 0) {
    const steps = [`= ${a * c} + ${a * d}i + ${b * c}i + ${b * d}i²`, `= ${a * c} + ${a * d + b * c}i + ${b * d}`, `= ${cx(a * c + b * d, a * d + b * c)}`];
    return {
      key: `cm-step-mul-${a}-${b}-${c}-${d}`,
      prompt: `Find (${cx(a, b)})(${cx(c, d)}). Which step is wrong?`,
      speech: `A student multiplied ${sayCx(a, b)} by ${sayCx(c, d)}. Which step is wrong?`,
      visual: { kind: "table", header: ["Step", "Work"], rows: steps.map((s, k) => [`Step ${k + 1}`, s]) },
      needsVisual: true,
      ...label("Step 2", ["Step 1", "Step 2", "Step 3"]),
      hint: "Check what happened to i².",
      explain: `Step 2: ${b * d}i² = −${b * d}, not +${b * d}. The answer is ${cx(a * c - b * d, a * d + b * c)}.`,
    };
  }
  if (t === 1) {
    const steps = [`= ${a} + ${b}i − ${c} − ${d}i`, `= ${cx(a - c, b - d)}`];
    const wrongStep = [`= ${a} + ${b}i − ${c} + ${d}i`, `= ${cx(a - c, b + d)}`];
    const bad = rand(0, 1) === 1;
    const shown = bad ? steps : wrongStep;
    return {
      key: `cm-step-sub-${a}-${b}-${c}-${d}-${bad}`,
      prompt: `(${cx(a, b)}) − (${cx(c, d)}): which step is wrong?`,
      speech: `A student subtracted ${sayCx(c, d)} from ${sayCx(a, b)}. Which step is wrong, if any?`,
      visual: { kind: "table", header: ["Step", "Work"], rows: shown.map((s, k) => [`Step ${k + 1}`, s]) },
      needsVisual: true,
      ...label(bad ? "No mistake" : "Step 1", ["Step 1", "Step 2", "No mistake"]),
      hint: "The minus sign must reach both parts of the second number.",
      explain: bad ? `No mistake: ${cx(a - c, b - d)}.` : `Step 1: −(${cx(c, d)}) = −${c} − ${d}i. The answer is ${cx(a - c, b - d)}.`,
    };
  }
  const p = rand(2, 7);
  const q = rand(2, 7);
  const steps = [`√−${p * p} · √−${q * q} = √${p * p * q * q}`, `= ${p * q}`];
  return {
    key: `cm-step-root-${p}-${q}`,
    prompt: `√−${p * p} · √−${q * q}: which step is wrong?`,
    speech: `A student multiplied the square roots of negative ${p * p} and negative ${q * q}. Which step is wrong?`,
    visual: { kind: "table", header: ["Step", "Work"], rows: steps.map((s, k) => [`Step ${k + 1}`, s]) },
    needsVisual: true,
    ...label("Step 1", ["Step 1", "Step 2", "No mistake"]),
    hint: "√a · √b = √(ab) only works when a and b aren't negative. Write with i first.",
    explain: `Step 1: ${p}i · ${q}i = ${p * q}i² = −${p * q}.`,
  };
}

/** HSN-CN.A.3 — conjugates, modulus and dividing complex numbers. */
export function alg2Conjugates(): Question {
  const kind = rand(0, 3);
  const a = nz(-8, 8);
  const b = nz(-8, 8);
  if (kind === 0) {
    return {
      key: `cj-conj-${a}-${b}`,
      prompt: `What is the conjugate of ${cx(a, b)}?`,
      speech: `What is the complex conjugate of ${sayCx(a, b)}?`,
      visual: NONE,
      ...label(cx(a, -b), [cx(-a, b), cx(-a, -b), cx(b, a)]),
      hint: "Keep the real part; flip the sign of the imaginary part.",
      explain: `The conjugate of ${cx(a, b)} is ${cx(a, -b)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `cj-prod-${a}-${b}`,
      prompt: `(${cx(a, b)})(${cx(a, -b)}) = ?`,
      speech: `Multiply ${sayCx(a, b)} by its conjugate, ${sayCx(a, -b)}.`,
      visual: NONE,
      ...choose(a * a + b * b, [a * a - b * b, (a + b) ** 2, a * a + b * b + 2 * a * b].filter((v) => v !== a * a + b * b), 1),
      hint: "(a + bi)(a − bi) = a² − b²i² = a² + b². A real number!",
      explain: `${a * a} + ${b * b} = ${a * a + b * b}.`,
    };
  }
  if (kind === 2) {
    const [p, q, r] = triple(26);
    const sp = pick([1, -1]);
    const sq = pick([1, -1]);
    return {
      key: `cj-mod-${p}-${q}-${sp}-${sq}`,
      prompt: `What is |${cx(sp * p, sq * q)}|?`,
      speech: `What is the modulus, or absolute value, of ${sayCx(sp * p, sq * q)}?`,
      visual: NONE,
      ...choose(r, [p + q, Math.abs(sp * p + sq * q) || r + 1, r * r], 1, 1),
      hint: "|a + bi| = √(a² + b²): its distance from 0 on the complex plane.",
      explain: `√(${p * p} + ${q * q}) = √${r * r} = ${r}.`,
    };
  }
  const [x, y] = [nz(-4, 4), nz(-4, 4)];
  const [c, d] = [nz(-3, 3), nz(-3, 3)];
  const num: [number, number] = [x * c - y * d, x * d + y * c];
  return {
    key: `cj-div-${x}-${y}-${c}-${d}`,
    prompt: `(${cx(...num)}) ÷ (${cx(c, d)}) = ?`,
    speech: `Divide ${sayCx(...num)} by ${sayCx(c, d)}.`,
    visual: NONE,
    ...label(cx(x, y), [cx(x, -y), cx(-x, y), cx(y, x), cx(num[0] / c === Math.round(num[0] / c) ? num[0] / c : x + 1, num[1] / d === Math.round(num[1] / d) ? num[1] / d : y + 1)]),
    hint: `Multiply top and bottom by the conjugate, ${cx(c, -d)}. The bottom becomes ${c * c + d * d}.`,
    explain: `(${cx(...num)})(${cx(c, -d)}) = ${cx(x * (c * c + d * d), y * (c * c + d * d))}, and ÷ ${c * c + d * d} gives ${cx(x, y)}.`,
  };
}

/** HSN-CN.B.4 — rectangular and polar form on the complex plane. */
export function alg2ComplexPlane(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [a, b] = offPoint(6);
    return {
      key: `cpl-read-${a}-${b}`,
      prompt: "Which complex number is at point Z? (x: real, y: imaginary)",
      speech: "On the complex plane, the horizontal axis is real and the vertical axis is imaginary. Which complex number is at point Z?",
      visual: grid([{ x: a, y: b, label: "Z" }]),
      needsVisual: true,
      ...label(cx(a, b), cxWrongs(a, b)),
      hint: "Go across for the real part, then up or down for the imaginary part.",
      explain: `Z is ${ds(a)} across and ${ds(b)} up: ${cx(a, b)}.`,
    };
  }
  if (kind === 1) {
    const r = rand(1, 6) * 2;
    const t = pick([0, 90, 180, 270, 30, 60, 120, 150, 210, 300]);
    const h = r / 2;
    // [coefficient, has √3] for the real and imaginary parts
    const parts = (deg: number): [[number, boolean], [number, boolean]] => {
      const sc = Math.sign(Math.round(cosD(deg) * 1e9));
      const ss = Math.sign(Math.round(sinD(deg) * 1e9));
      if (deg % 90 === 0) return [[sc * r, false], [ss * r, false]];
      return refAngle(deg) === 30 ? [[sc * h, true], [ss * h, false]] : [[sc * h, false], [ss * h, true]];
    };
    const text = ([re, im]: [[number, boolean], [number, boolean]]) => {
      const reS = re[0] === 0 ? "" : `${ds(re[0])}${re[1] ? "√3" : ""}`;
      const mag = Math.abs(im[0]);
      const imS = im[0] === 0 ? "" : `${mag === 1 && !im[1] ? "" : mag}${im[1] ? "√3" : ""}i`;
      if (!reS && !imS) return "0";
      if (!imS) return reS;
      if (!reS) return `${im[0] < 0 ? "−" : ""}${imS}`;
      return `${reS} ${im[0] < 0 ? "−" : "+"} ${imS}`;
    };
    const [re, im] = parts(t);
    const right = text([re, im]);
    return {
      key: `cpl-polar-${r}-${t}`,
      prompt: `Write ${r}(cos ${t}° + i sin ${t}°) as a + bi.`,
      speech: `Write ${r} times, cosine ${t} degrees plus i sine ${t} degrees, in the form a plus b i.`,
      visual: { kind: "unitcircle", angle: t },
      ...label(right, [
        text([[im[0], im[1]], [re[0], re[1]]]),
        text([[-re[0], re[1]], [im[0], im[1]]]),
        text([[re[0], re[1]], [-im[0], im[1]]]),
        `${r} + ${r}i`,
      ]),
      hint: "a = r cos θ and b = r sin θ.",
      explain: `a = ${r} cos ${t}°, b = ${r} sin ${t}°: ${right}.`,
    };
  }
  if (kind === 2) {
    const k = rand(1, 7);
    const dir = rand(0, 5);
    const pts: [number, number, number][] = [
      [k, k, 45],
      [-k, k, 135],
      [-k, -k, 225],
      [k, -k, 315],
      [0, k, 90],
      [-k, 0, 180],
    ];
    const [a, b, ang] = pts[dir];
    return {
      key: `cpl-arg-${k}-${dir}`,
      prompt: `What angle (argument, 0°–360°) does ${cx(a, b)} make with the positive real axis?`,
      speech: `On the complex plane, what angle does ${sayCx(a, b)} make with the positive real axis, between 0 and 360 degrees?`,
      visual: grid([{ x: a, y: b, label: "Z" }]),
      unit: "°",
      ...choose(ang, [ang + 90, ang - 90, 360 - ang, 45].filter((v) => v >= 0 && v < 360 && v !== ang), 45, 0),
      hint: "Plot it. Which quadrant? Equal real and imaginary sizes make a 45° reference angle.",
      explain: `${cx(a, b)} points at ${ang}°.`,
    };
  }
  const r = rand(2, 9);
  return {
    key: `cpl-circle-${r}`,
    prompt: `Where are all complex numbers z with |z| = ${r}?`,
    speech: `On the complex plane, where are all the complex numbers whose modulus is ${r}?`,
    visual: NONE,
    ...label(`A circle of radius ${r} around 0`, [`The line x = ${r}`, `The point ${r} + ${r}i`, `A square with side ${r}`]),
    hint: "|z| is the distance from 0.",
    explain: `Every point ${r} units from 0: a circle of radius ${r}.`,
  };
}

/** HSN-CN.B.4, B.5 — plot complex numbers and the results of operations. */
export function alg2PlotComplex(): Question {
  const kind = rand(0, 4);
  const [a, b] = offPoint(5);
  if (kind === 0) {
    return {
      key: `pc-plot-${a}-${b}`,
      prompt: `Plot z = ${cx(a, b)} on the complex plane.`,
      speech: `Plot z equals ${sayCx(a, b)}. The real part goes across, the imaginary part up.`,
      visual: NONE,
      input: "activity",
      activity: { kind: "plotPoints", points: [{ x: a, y: b, label: "z" }], size: 8, quadrants: 4 },
      answer: a,
      hint: "Real part across, imaginary part up or down.",
      explain: `${cx(a, b)} is the point ${pt(a, b)}.`,
    };
  }
  const ops: { name: string; say: string; img: [number, number]; why: string }[] = [
    { name: "its conjugate z̄", say: "its conjugate", img: [a, -b], why: "The conjugate reflects z across the real axis." },
    { name: "iz", say: "i times z", img: [-b, a], why: "Multiplying by i turns z 90° counterclockwise." },
    { name: "−z", say: "negative z", img: [-a, -b], why: "−z is z turned 180° about 0." },
  ];
  if (kind <= 3 && kind >= 1) {
    const o = ops[kind - 1];
    return {
      key: `pc-op-${kind}-${a}-${b}`,
      prompt: `z = ${cx(a, b)}. Plot z and ${o.name}.`,
      speech: `z is ${sayCx(a, b)}. Plot z, then plot ${o.say}.`,
      visual: NONE,
      input: "activity",
      activity: {
        kind: "plotPoints",
        points: [
          { x: a, y: b, label: "z" },
          { x: o.img[0], y: o.img[1], label: kind === 1 ? "z̄" : kind === 2 ? "iz" : "−z" },
        ],
        size: 8,
        quadrants: 4,
      },
      answer: o.img[0],
      hint: kind === 2 ? "i(a + bi) = −b + ai." : kind === 1 ? "Flip the sign of the imaginary part." : "Flip both signs.",
      explain: `${o.why} ${pt(a, b)} → ${pt(...o.img)}.`,
    };
  }
  const [c, d] = offPoint(3);
  const [p, q] = [rand(-3, 3), rand(-3, 3)];
  if ((p === 0 && q === 0) || (p === c && q === d)) return alg2PlotComplex();
  return {
    key: `pc-sum-${c}-${d}-${p}-${q}`,
    prompt: `Plot z₁ = ${cx(c, d)}, z₂ = ${cx(p, q)}, and their sum S.`,
    speech: `Plot z 1 equals ${sayCx(c, d)}, z 2 equals ${sayCx(p, q)}, and their sum S.`,
    visual: NONE,
    input: "activity",
    activity: {
      kind: "plotPoints",
      points: [
        { x: c, y: d, label: "z₁" },
        { x: p, y: q, label: "z₂" },
        { x: c + p, y: d + q, label: "S" },
      ],
      size: 8,
      quadrants: 4,
    },
    answer: c + p,
    hint: "Adding complex numbers adds them like vectors: real parts together, imaginary parts together.",
    explain: `S = ${cx(c + p, d + q)}: the fourth corner of the parallelogram made by 0, z₁ and z₂.`,
  };
}

/** HSN-CN.B.5, B.6 — complex arithmetic as geometry; distance and midpoint. */
export function alg2ComplexGeometry(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [r1v, a1] = [rand(1, 4), pick([30, 45, 60, 90, 120])];
    const [r2v, a2] = [rand(1, 4), pick([30, 45, 60, 90, 120])];
    const askMod = rand(0, 1) === 1;
    return {
      key: `cg-mult-${r1v}-${a1}-${r2v}-${a2}-${askMod}`,
      prompt: `|z₁| = ${r1v}, angle ${a1}°; |z₂| = ${r2v}, angle ${a2}°. z₁z₂'s ${askMod ? "modulus" : "angle"}?`,
      speech: `z 1 has modulus ${r1v} and angle ${a1} degrees. z 2 has modulus ${r2v} and angle ${a2} degrees. What is the ${askMod ? "modulus" : "angle"} of their product?`,
      visual: NONE,
      unit: askMod ? undefined : "°",
      ...choose(askMod ? r1v * r2v : a1 + a2, askMod ? [r1v + r2v, r1v * r2v + 1, Math.abs(r1v - r2v) || 7] : [a1 * a2 > 360 ? a1 + a2 + 30 : a1 * a2, Math.abs(a1 - a2) || 15, a1 + a2 + 90], askMod ? 1 : 15, 0),
      hint: "When you multiply complex numbers, the moduli multiply and the angles add.",
      explain: askMod ? `${r1v} × ${r2v} = ${r1v * r2v}.` : `${a1}° + ${a2}° = ${a1 + a2}°.`,
    };
  }
  if (kind === 1) {
    const [p, q, r] = triple(17);
    const [x1, y1] = [rand(-5, 5), rand(-5, 5)];
    const [x2, y2] = [x1 + pick([1, -1]) * p, y1 + pick([1, -1]) * q];
    return {
      key: `cg-dist-${x1}-${y1}-${x2}-${y2}`,
      prompt: `Distance between ${cx(x1, y1)} and ${cx(x2, y2)} on the complex plane?`,
      speech: `How far apart are ${sayCx(x1, y1)} and ${sayCx(x2, y2)} on the complex plane?`,
      visual: NONE,
      ...choose(r, [p + q, r * r, Math.abs(x2 - x1 + y2 - y1) || r + 2], 1, 1),
      hint: "Distance = |z₁ − z₂|, the modulus of the difference.",
      explain: `z₁ − z₂ = ${cx(x1 - x2, y1 - y2)}, and its modulus is √(${p * p} + ${q * q}) = ${r}.`,
    };
  }
  if (kind === 2) {
    const [x1, y1] = [rand(-8, 8), rand(-8, 8)];
    const [x2, y2] = [x1 + 2 * nz(-4, 4), y1 + 2 * nz(-4, 4)];
    return {
      key: `cg-mid-${x1}-${y1}-${x2}-${y2}`,
      prompt: `Midpoint of ${cx(x1, y1)} and ${cx(x2, y2)}?`,
      speech: `What complex number is the midpoint of ${sayCx(x1, y1)} and ${sayCx(x2, y2)}?`,
      visual: NONE,
      ...label(cx((x1 + x2) / 2, (y1 + y2) / 2), [cx(x1 + x2, y1 + y2), cx((x2 - x1) / 2, (y2 - y1) / 2), cx((y1 + y2) / 2, (x1 + x2) / 2)]),
      hint: "Average them: (z₁ + z₂) ÷ 2.",
      explain: `(${cx(x1 + x2, y1 + y2)}) ÷ 2 = ${cx((x1 + x2) / 2, (y1 + y2) / 2)}.`,
    };
  }
  const items: [string, string, string[]][] = [
    ["Multiplying by i", "rotates 90° counterclockwise", ["reflects across the real axis", "doubles the distance from 0", "rotates 180°"]],
    ["Taking the conjugate", "reflects across the real axis", ["rotates 90° counterclockwise", "reflects across the imaginary axis", "rotates 180°"]],
    ["Multiplying by −1", "rotates 180° about 0", ["reflects across the real axis", "rotates 90° counterclockwise", "doesn't move it"]],
    ["Multiplying by 2", "doubles the distance from 0, same direction", ["rotates 90° counterclockwise", "moves it 2 units right", "reflects across the real axis"]],
    ["Adding 3", "slides it 3 units right", ["slides it 3 units up", "triples the distance from 0", "rotates it 3°"]],
    ["Adding 2i", "slides it 2 units up", ["slides it 2 units right", "rotates it 90°", "doubles the distance from 0"]],
  ];
  const i = rand(0, items.length - 1);
  const [act, res, wr] = items[i];
  return {
    key: `cg-move-${i}`,
    prompt: `On the complex plane, what does ${act.toLowerCase()} do to a point?`,
    speech: `On the complex plane, what does ${act.toLowerCase()} do to a point?`,
    visual: NONE,
    ...label(res, wr),
    hint: "Try it on z = 1 or z = 1 + i and plot before and after.",
    explain: `${act} ${res}.`,
  };
}

/** HSN-CN.C.7 — quadratic equations with complex solutions. */
export function alg2ComplexRoots(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const b = rand(-8, 8);
    const c = rand(-10, 20);
    const D = b * b - 4 * c;
    const name = D > 0 ? "two real solutions" : D === 0 ? "one real (double) solution" : "two complex (non-real) solutions";
    const eq = `x²${b === 0 ? "" : b === 1 ? " + x" : b === -1 ? " − x" : ` ${b < 0 ? "−" : "+"} ${Math.abs(b)}x`}${c === 0 ? "" : plus(c)} = 0`;
    return {
      key: `cr-disc-${b}-${c}`,
      prompt: `How many and what kind of solutions does ${eq} have?`,
      speech: `How many solutions, and what kind, does ${say(eq)} have?`,
      visual: NONE,
      ...label(name, ["two real solutions", "one real (double) solution", "two complex (non-real) solutions"]),
      hint: "Find the discriminant b² − 4ac. Negative means complex solutions.",
      explain: `b² − 4ac = ${b * b} − ${4 * c} = ${D}: ${name}.`,
    };
  }
  if (kind === 1) {
    const k = rand(1, 10);
    return {
      key: `cr-pure-${k}`,
      prompt: `Solve x² + ${k * k} = 0.`,
      speech: `Solve x squared plus ${k * k} equals 0.`,
      visual: NONE,
      ...label(`x = ±${k === 1 ? "" : k}i`, [`x = ±${k}`, `x = ${k === 1 ? "" : k}i only`, `x = ±${k * k}i`, "No solutions"]),
      hint: `x² = −${k * k}. Take the square root of both sides, using i.`,
      explain: `x² = −${k * k}, so x = ±√−${k * k} = ±${k === 1 ? "" : k}i.`,
    };
  }
  if (kind === 2) {
    const p = nz(-5, 5);
    const q = rand(1, 6);
    const B = -2 * p;
    const C = p * p + q * q;
    const eq = `x² ${B < 0 ? "−" : "+"} ${Math.abs(B)}x + ${C} = 0`;
    const qi = q === 1 ? "i" : `${q}i`;
    return {
      key: `cr-full-${p}-${q}`,
      prompt: `Solve ${eq}.`,
      speech: `Solve ${say(eq)}.`,
      visual: { kind: "plot", x: [p - 5, p + 5], y: [-2, q * q + 12], curves: [{ fn: (x: number) => x * x + B * x + C }] },
      ...label(`x = ${ds(p)} ± ${qi}`, [`x = ${ds(-p)} ± ${qi}`, `x = ${ds(p)} ± ${q}`, `x = ${ds(p)} ± ${q * q === 1 ? "" : q * q}i`, `x = ${ds(q)} ± ${Math.abs(p) === 1 ? "" : Math.abs(p)}i`]),
      hint: "Quadratic formula. The parabola never touches the x-axis, so expect √(negative).",
      explain: `x = (${ds(-B)} ± √(${B * B} − ${4 * C})) ÷ 2 = (${ds(-B)} ± √${B * B - 4 * C}) ÷ 2 = ${ds(p)} ± ${qi}.`,
    };
  }
  const p = nz(-5, 5);
  const q = rand(1, 6);
  const B = -2 * p;
  const C = p * p + q * q;
  return {
    key: `cr-dval-${p}-${q}`,
    prompt: `Discriminant of x² ${B < 0 ? "−" : "+"} ${Math.abs(B)}x + ${C} = 0?`,
    speech: `What is the discriminant, b squared minus 4 a c, of ${say(`x² ${B < 0 ? "−" : "+"} ${Math.abs(B)}x + ${C} = 0`)}?`,
    visual: NONE,
    ...signed(B * B - 4 * C),
    hint: "b² − 4ac, with a = 1.",
    explain: `${B * B} − 4 × ${C} = ${B * B - 4 * C}. Negative, so the solutions are complex.`,
  };
}

/** HSN-CN.C.8, C.9 — polynomial identities with complex numbers; the fundamental theorem of algebra. */
export function alg2FundamentalTheorem(): Question {
  const kind = rand(0, 4);
  if (kind === 0) {
    const k = rand(1, 9);
    const ki = k === 1 ? "i" : `${k}i`;
    return {
      key: `ft-factor-${k}`,
      prompt: `Factor x² + ${k * k} over the complex numbers.`,
      speech: `Factor x squared plus ${k * k}, using complex numbers.`,
      visual: NONE,
      ...label(`(x + ${ki})(x − ${ki})`, [`(x + ${k})(x − ${k})`, `(x + ${ki})²`, `(x + ${k})²`, `(x − ${ki})²`]),
      hint: `x² + ${k * k} = x² − (${ki})², a difference of squares.`,
      explain: `(${ki})² = −${k * k}, so x² + ${k * k} = x² − (${ki})² = (x + ${ki})(x − ${ki}).`,
    };
  }
  if (kind === 1) {
    const n = rand(2, 9);
    const terms = [`x${sup(n)}`, n > 3 ? `${rand(2, 7)}x${sup(n - 2)}` : `${rand(2, 7)}x`, `${rand(1, 9)}`];
    const poly = `${terms[0]} − ${terms[1]} + ${terms[2]}`;
    return {
      key: `ft-count-${n}-${poly}`,
      prompt: `How many complex roots does ${poly} have, counting repeats?`,
      speech: `How many complex roots does the polynomial ${say(poly)} have, counting repeated roots?`,
      visual: NONE,
      ...choose(n, [n - 1, n + 1, 2], 1, 1),
      hint: "The fundamental theorem of algebra: a degree-n polynomial has exactly n complex roots, counting multiplicity.",
      explain: `Degree ${n}, so ${n} roots.`,
    };
  }
  if (kind === 2) {
    const a = nz(-6, 6);
    const b = nz(-6, 6);
    return {
      key: `ft-pair-${a}-${b}`,
      prompt: `A polynomial with real coefficients has root ${cx(a, b)}. Another root must be…`,
      speech: `A polynomial with real coefficients has ${sayCx(a, b)} as a root. Which other number must be a root?`,
      visual: NONE,
      ...label(cx(a, -b), [cx(-a, b), cx(-a, -b), cx(b, a)]),
      hint: "Non-real roots of real polynomials come in conjugate pairs.",
      explain: `The conjugate, ${cx(a, -b)}, is also a root.`,
    };
  }
  if (kind === 3) {
    const n = rand(3, 8);
    const real = rand(1, n);
    if ((n - real) % 2 !== 0) return alg2FundamentalTheorem();
    return {
      key: `ft-nonreal-${n}-${real}`,
      prompt: `A degree-${n} real polynomial has ${real} real root${real === 1 ? "" : "s"} (counting repeats). Non-real roots?`,
      speech: `A degree ${n} polynomial with real coefficients has ${real} real root${real === 1 ? "" : "s"}, counting repeats. How many non-real roots does it have?`,
      visual: NONE,
      ...choose(n - real, [n, real, n - real + 1], 1, 0),
      hint: "Total roots = degree.",
      explain: `${n} − ${real} = ${n - real} non-real roots (in ${(n - real) / 2} conjugate pair${(n - real) / 2 === 1 ? "" : "s"}).`,
    };
  }
  const a = nz(-5, 5);
  const b = rand(1, 5);
  const poly = (A: number, B: number) => `x² ${A < 0 ? "+" : "−"} ${Math.abs(2 * A)}x + ${A * A + B * B}`;
  return {
    key: `ft-build-${a}-${b}`,
    prompt: `Which polynomial has roots ${cx(a, b)} and ${cx(a, -b)}?`,
    speech: `Which polynomial has roots ${sayCx(a, b)} and ${sayCx(a, -b)}?`,
    visual: NONE,
    ...label(poly(a, b), [poly(-a, b), `x² ${a < 0 ? "+" : "−"} ${Math.abs(2 * a)}x + ${a * a - b * b}`, `x² ${a < 0 ? "+" : "−"} ${Math.abs(a)}x + ${a * a + b * b}`]),
    hint: "Multiply (x − r₁)(x − r₂): the sum of the roots and their product.",
    explain: `Sum ${ds(2 * a)}, product ${a * a} + ${b * b} = ${a * a + b * b}: ${poly(a, b)}.`,
  };
}

/* ===================================================== I. Vectors & matrices */

const vec = (a: number, b: number) => `⟨${ds(a)}, ${ds(b)}⟩`;
const sayVec = (a: number, b: number) => `vector ${say(ds(a))}, ${say(ds(b))}`;

/** HSN-VM.A.1, A.2 — vectors have magnitude and direction; components from endpoints. */
export function alg2Vectors(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [x1, y1] = [rand(-6, 6), rand(-6, 6)];
    let [x2, y2] = [rand(-6, 6), rand(-6, 6)];
    if (x1 === x2) x2 = x1 + 1;
    if (y1 === y2) y2 = y1 - 2;
    return {
      key: `vc-comp-${x1}-${y1}-${x2}-${y2}`,
      prompt: `Vector from P${pt(x1, y1)} to Q${pt(x2, y2)} in components?`,
      speech: `A vector starts at P, ${sayPt(x1, y1)}, and ends at Q, ${sayPt(x2, y2)}. What are its components?`,
      visual: grid([
        { x: x1, y: y1, label: "P" },
        { x: x2, y: y2, label: "Q" },
      ]),
      ...label(vec(x2 - x1, y2 - y1), [vec(x1 - x2, y1 - y2), vec(x2 + x1, y2 + y1), vec(y2 - y1, x2 - x1), vec(x2, y2)]),
      hint: "Components = terminal point − initial point (end minus start).",
      explain: `⟨${ds(x2)} − ${ds(x1)}, ${ds(y2)} − ${ds(y1)}⟩ = ${vec(x2 - x1, y2 - y1)}.`,
    };
  }
  if (kind === 1) {
    const [a, b, c] = triple(26);
    const [sa, sb] = [pick([1, -1]), pick([1, -1])];
    return {
      key: `vc-mag-${a}-${b}-${sa}-${sb}`,
      prompt: `What is ‖v‖ for v = ${vec(sa * a, sb * b)}?`,
      speech: `What is the magnitude, the length, of ${sayVec(sa * a, sb * b)}?`,
      visual: NONE,
      ...choose(c, [a + b, c * c, Math.abs(sa * a + sb * b) || c + 3], 1, 1),
      hint: "‖⟨a, b⟩‖ = √(a² + b²).",
      explain: `√(${a * a} + ${b * b}) = √${c * c} = ${c}.`,
    };
  }
  if (kind === 2) {
    const k = rand(1, 8);
    const dir = rand(0, 7);
    const comps: [number, number, number][] = [
      [k, 0, 0], [k, k, 45], [0, k, 90], [-k, k, 135], [-k, 0, 180], [-k, -k, 225], [0, -k, 270], [k, -k, 315],
    ];
    const [a, b, ang] = comps[dir];
    return {
      key: `vc-dir-${k}-${dir}`,
      prompt: `Direction angle (0°–360°) of ${vec(a, b)}?`,
      speech: `What is the direction angle of ${sayVec(a, b)}, measured counterclockwise from the positive x-axis?`,
      visual: grid([{ x: a, y: b, label: "v" }]),
      unit: "°",
      ...choose(ang, [ang + 90, ang + 180, 360 - ang].map((v) => v % 360).filter((v) => v !== ang), 45, 0),
      hint: "Sketch it from the origin. Which way does it point?",
      explain: `${vec(a, b)} points at ${ang}°.`,
    };
  }
  const [px, py] = [rand(-5, 5), rand(-5, 5)];
  const [a, b] = [nz(-4, 4), nz(-4, 4)];
  return {
    key: `vc-end-${px}-${py}-${a}-${b}`,
    prompt: `v = ${vec(a, b)} starts at P${pt(px, py)}. Where does it end?`,
    speech: `${cap(sayVec(a, b))} starts at P, ${sayPt(px, py)}. Where is its tip?`,
    visual: grid([{ x: px, y: py, label: "P" }]),
    ...label(pt(px + a, py + b), [pt(px - a, py - b), pt(a, b), pt(px + b, py + a)]),
    hint: "Add the components to the starting point.",
    explain: `${pt(px, py)} + ${vec(a, b)} = ${pt(px + a, py + b)}.`,
  };
}

/** HSN-VM.A.1, B.4a, B.5a — draw vectors, sums and scalar multiples on the grid. */
export function alg2DrawVectors(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const [px, py] = [rand(-4, 4), rand(-4, 4)];
    const [a, b] = [nz(-4, 4), nz(-4, 4)];
    return {
      key: `dv-tip-${px}-${py}-${a}-${b}`,
      prompt: `Draw v = ${vec(a, b)} starting at P${pt(px, py)}: plot P and its tip T.`,
      speech: `Draw ${sayVec(a, b)} starting at P, ${sayPt(px, py)}. Plot P and the tip T.`,
      visual: NONE,
      input: "activity",
      activity: {
        kind: "plotPoints",
        points: [
          { x: px, y: py, label: "P" },
          { x: px + a, y: py + b, label: "T" },
        ],
        size: 8,
        quadrants: 4,
      },
      answer: px + a,
      hint: `From P, go ${ds(a)} across and ${ds(b)} up.`,
      explain: `T = ${pt(px + a, py + b)}.`,
    };
  }
  if (kind === 1) {
    const [a, b] = [nz(-4, 4), nz(-4, 4)];
    const [c, d] = [nz(-4, 4), nz(-4, 4)];
    if (a + c === 0 && b + d === 0) return alg2DrawVectors();
    return {
      key: `dv-sum-${a}-${b}-${c}-${d}`,
      prompt: `Tip-to-tail from the origin: plot the tip U of u = ${vec(a, b)}, then the tip S of u + v, v = ${vec(c, d)}.`,
      speech: `Start at the origin. Plot U, the tip of ${sayVec(a, b)}. Then add ${sayVec(c, d)} from there, and plot S, the tip of the sum.`,
      visual: NONE,
      input: "activity",
      activity: {
        kind: "plotPoints",
        points: [
          { x: a, y: b, label: "U" },
          { x: a + c, y: b + d, label: "S" },
        ],
        size: 8,
        quadrants: 4,
      },
      answer: a + c,
      hint: "Put v's tail on u's tip. The sum goes from the start of u to the tip of v.",
      explain: `U = ${pt(a, b)}, S = ${pt(a + c, b + d)}: u + v = ${vec(a + c, b + d)}.`,
    };
  }
  const [a, b] = [nz(-3, 3), nz(-3, 3)];
  const k = pick([2, -2, -1, 2]);
  return {
    key: `dv-scale-${a}-${b}-${k}`,
    prompt: `v = ${vec(a, b)}. From the origin, plot the tips of v (V) and ${k === -1 ? "−v" : `${k}v`} (W).`,
    speech: `${cap(sayVec(a, b))}. Starting at the origin, plot the tip of v, called V, and the tip of ${k === -1 ? "negative v" : `${k} v`}, called W.`,
    visual: NONE,
    input: "activity",
    activity: {
      kind: "plotPoints",
      points: [
        { x: a, y: b, label: "V" },
        { x: k * a, y: k * b, label: "W" },
      ],
      size: 8,
      quadrants: 4,
    },
    answer: k * a,
    hint: k < 0 ? "A negative scalar flips the direction." : "Multiply both components by the scalar.",
    explain: `${k === -1 ? "−v" : `${k}v`} = ${vec(k * a, k * b)}: ${Math.abs(k)} times as long, ${k < 0 ? "opposite" : "same"} direction.`,
  };
}

/** HSN-VM.B.4a, B.4b, B.4c — add and subtract vectors; magnitude and direction of a sum. */
export function alg2VectorAdd(): Question {
  const kind = rand(0, 3);
  const [a, b, c, d] = [nz(-6, 6), nz(-6, 6), nz(-6, 6), nz(-6, 6)];
  if (kind === 0) {
    return {
      key: `va-add-${a}-${b}-${c}-${d}`,
      prompt: `${vec(a, b)} + ${vec(c, d)} = ?`,
      speech: `Add ${sayVec(a, b)} and ${sayVec(c, d)}.`,
      visual: NONE,
      ...label(vec(a + c, b + d), [vec(a + d, b + c), vec(a - c, b - d), vec(a * c, b * d), vec(a + b, c + d)]),
      hint: "Add matching components.",
      explain: `⟨${ds(a)} + ${ds(c)}, ${ds(b)} + ${ds(d)}⟩ = ${vec(a + c, b + d)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `va-sub-${a}-${b}-${c}-${d}`,
      prompt: `v = ${vec(a, b)}, w = ${vec(c, d)}. v − w = ?`,
      speech: `${cap(sayVec(a, b))} is v, and ${sayVec(c, d)} is w. What is v minus w?`,
      visual: NONE,
      ...label(vec(a - c, b - d), [vec(c - a, d - b), vec(a + c, b + d), vec(a - c, b + d), vec(-a - c, -b - d)]),
      hint: "v − w = v + (−w): flip w, then add.",
      explain: `⟨${ds(a)} − ${ds(c)}, ${ds(b)} − ${ds(d)}⟩ = ${vec(a - c, b - d)}.`,
    };
  }
  if (kind === 2) {
    const [p, q, r] = triple(26);
    const [u1, u2] = [rand(-5, 5), rand(-5, 5)];
    const [v1, v2] = [p - u1, q - u2];
    return {
      key: `va-mag-${u1}-${u2}-${p}-${q}`,
      prompt: `u = ${vec(u1, u2)}, v = ${vec(v1, v2)}. ‖u + v‖ = ?`,
      speech: `u is ${sayVec(u1, u2)} and v is ${sayVec(v1, v2)}. What is the magnitude of u plus v?`,
      visual: NONE,
      ...choose(r, [p + q, Math.round(Math.hypot(u1, u2) + Math.hypot(v1, v2)), r + 1].filter((x) => x !== r), 1, 1),
      hint: "Add first, then find the length. ‖u + v‖ usually isn't ‖u‖ + ‖v‖.",
      explain: `u + v = ${vec(p, q)}, length √(${p * p} + ${q * q}) = ${r}.`,
    };
  }
  const items: [string, string, string[]][] = [
    ["To add u + v graphically, put v's tail on u's tip. The sum goes from…", "u's tail to v's tip", ["v's tip to u's tail", "u's tip to v's tail", "the origin to u's tip"]],
    ["For v = " + vec(a, b) + ", the additive inverse −v is…", vec(-a, -b), [vec(a, -b), vec(-a, b), vec(b, a)]],
    ["v + (−v) equals…", "the zero vector ⟨0, 0⟩", ["2v", "v", "−2v"]],
    ["The parallelogram rule: u + v is the diagonal of the parallelogram with sides…", "u and v from the same start", ["u and −v", "u + v and u − v", "the x- and y-axes"]],
  ];
  const i = rand(0, items.length - 1);
  const [q, r, w] = items[i];
  return {
    key: `va-idea-${i}-${i === 1 ? `${a}.${b}` : ""}`,
    prompt: q,
    speech: say(q.replace(/…$/, " what?")),
    visual: NONE,
    ...label(r, w),
    hint: "Think of vectors as moves. Adding means doing one move, then the other.",
    explain: `${q.replace(/…$/, "")} ${r}.`,
  };
}

/** HSN-VM.B.5a, B.5b — multiply a vector by a scalar; magnitude and direction of cv. */
export function alg2VectorScale(): Question {
  const kind = rand(0, 3);
  const [a, b] = [nz(-6, 6), nz(-6, 6)];
  const c = nz(-4, 4);
  if (kind === 0) {
    return {
      key: `vs-mul-${a}-${b}-${c}`,
      prompt: `${c}${vec(a, b)} = ?`,
      speech: `Multiply ${sayVec(a, b)} by ${say(ds(c))}.`,
      visual: NONE,
      ...label(vec(c * a, c * b), [vec(c * a, b), vec(a + c, b + c), vec(-c * a, -c * b), vec(c * a, -c * b)]),
      hint: "Multiply each component by the scalar.",
      explain: `⟨${ds(c)} × ${ds(a)}, ${ds(c)} × ${ds(b)}⟩ = ${vec(c * a, c * b)}.`,
    };
  }
  if (kind === 1) {
    const [p, q, r] = triple(26);
    return {
      key: `vs-mag-${p}-${q}-${c}`,
      prompt: `‖v‖ = ${r}. What is ‖${c}v‖?`,
      speech: `A vector v has magnitude ${r}. What is the magnitude of ${say(ds(c))} v?`,
      visual: NONE,
      ...choose(Math.abs(c) * r, [c * r, r + Math.abs(c), r * c * c].filter((v) => v !== Math.abs(c) * r), 1),
      hint: "‖cv‖ = |c| · ‖v‖. Length can't be negative.",
      explain: `|${ds(c)}| × ${r} = ${Math.abs(c) * r}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `vs-dir-${c}-${a}-${b}`,
      prompt: `How does ${c}${vec(a, b)} point compared with ${vec(a, b)}?`,
      speech: `Compared with ${sayVec(a, b)}, which way does ${say(ds(c))} times it point?`,
      visual: NONE,
      ...label(c > 0 ? "Same direction" : "Opposite direction", ["Same direction", "Opposite direction", "At a right angle"]),
      hint: "A positive scalar keeps the direction; a negative one reverses it.",
      explain: `${c > 0 ? "Positive" : "Negative"} scalar: ${c > 0 ? "same" : "opposite"} direction, ${Math.abs(c)} times as long.`,
    };
  }
  const [d, e] = [nz(-4, 4), nz(-4, 4)];
  const [m, n] = [rand(2, 3), nz(-3, 3)];
  return {
    key: `vs-combo-${a}-${b}-${d}-${e}-${m}-${n}`,
    prompt: `u = ${vec(a, b)}, v = ${vec(d, e)}. ${m}u ${n < 0 ? "−" : "+"} ${Math.abs(n) === 1 ? "" : Math.abs(n)}v = ?`,
    speech: `u is ${sayVec(a, b)} and v is ${sayVec(d, e)}. Find ${m} u ${n < 0 ? "minus" : "plus"} ${Math.abs(n)} v.`,
    visual: NONE,
    ...label(vec(m * a + n * d, m * b + n * e), [vec(m * a - n * d, m * b - n * e), vec(m * a + n * e, m * b + n * d), vec(a + n * d, b + n * e)]),
    hint: "Scale each vector first, then add components.",
    explain: `${vec(m * a, m * b)} + ${vec(n * d, n * e)} = ${vec(m * a + n * d, m * b + n * e)}.`,
  };
}

/** HSN-VM.A.3 — vector problems with velocity and force. */
export function alg2VectorStories(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [w, p, r] = pick(TRIPLES);
    const k = pick([10, 20, 5]);
    return {
      key: `vst-plane-${w}-${p}-${k}`,
      prompt: `A plane flies east at ${p * k} km/h; wind blows north at ${w * k} km/h. Ground speed?`,
      speech: `A plane heads east at ${p * k} kilometers per hour while the wind blows north at ${w * k} kilometers per hour. What is its speed over the ground?`,
      visual: { kind: "righttri", a: w * k, b: p * k, c: "?", unit: "" },
      unit: "km/h",
      ...choose(r * k, [(p + w) * k, (p - w) * k, r * k + 10].filter((v) => v > 0), 10, 1),
      hint: "The velocities are perpendicular vectors. Add them, then find the length.",
      explain: `√(${p * k}² + ${w * k}²) = ${r * k} km/h.`,
    };
  }
  if (kind === 1) {
    const [f1, f2, r] = pick(TRIPLES);
    return {
      key: `vst-force-${f1}-${f2}`,
      prompt: `Two people pull a crate: ${f1 * 10} N east and ${f2 * 10} N north. Net force?`,
      speech: `Two people pull a crate, one with ${f1 * 10} newtons east and one with ${f2 * 10} newtons north. How strong is the total force?`,
      visual: NONE,
      unit: "N",
      ...choose(r * 10, [(f1 + f2) * 10, Math.abs(f1 - f2) * 10 || 5, r * 10 + 10], 10, 1),
      hint: "Add the force vectors ⟨east, north⟩, then take the magnitude.",
      explain: `⟨${f1 * 10}, ${f2 * 10}⟩ has length ${r * 10} N.`,
    };
  }
  if (kind === 2) {
    const b = rand(3, 9);
    const c = rand(1, 5);
    return {
      key: `vst-boat-${b}-${c}`,
      prompt: `A boat aims straight across (north) at ${b} m/s; the river flows east at ${c} m/s. Actual velocity?`,
      speech: `A boat points straight across a river, north, at ${b} meters per second. The current flows east at ${c} meters per second. What is the boat's actual velocity vector, east and north?`,
      visual: NONE,
      ...label(vec(c, b), [vec(b, c), vec(c, -b), vec(b + c, 0), vec(-c, b)]),
      hint: "Add the boat's vector ⟨0, " + b + "⟩ and the current's ⟨" + c + ", 0⟩.",
      explain: `⟨0, ${b}⟩ + ⟨${c}, 0⟩ = ${vec(c, b)}.`,
    };
  }
  const e1 = rand(20, 80);
  const e2 = rand(10, e1 - 5);
  return {
    key: `vst-tug-${e1}-${e2}`,
    prompt: `Tug of war: ${e1} N east, ${e2} N west. Net force (east positive)?`,
    speech: `In a tug of war, one team pulls ${e1} newtons east and the other ${e2} newtons west. What is the net force, counting east as positive?`,
    visual: NONE,
    unit: "N",
    ...signed(e1 - e2),
    hint: "Opposite directions: one vector is negative.",
    explain: `${e1} + (−${e2}) = ${e1 - e2} N east.`,
  };
}

type M2 = [[number, number], [number, number]];
const randM = (lo = -5, hi = 5): M2 => [
  [rand(lo, hi), rand(lo, hi)],
  [rand(lo, hi), rand(lo, hi)],
];
const mText = (M: M2) => `[${M[0].map(ds).join(" ")}; ${M[1].map(ds).join(" ")}]`;
const twoMats = (A: M2, B: M2): Visual => ({ kind: "matrix", items: [{ name: "A", rows: A }, { name: "B", rows: B }] });
/** One named matrix. */
const oneMat = (name: string, rows: (number | string)[][]): Visual => ({ kind: "matrix", items: [{ name, rows }] });
/** A 2 × 2 result with "?" in entry e (0–3, reading order) and the rest blank. */
const askEntry = (e: number) => [0, 1].map((r) => [0, 1].map((c) => (r * 2 + c === e ? "?" : "")));
const mul = (A: M2, B: M2): M2 => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
];
const ROWCOL = ["row 1, column 1", "row 1, column 2", "row 2, column 1", "row 2, column 2"];

/** HSN-VM.C.6, C.7 — matrices to represent data; multiply a matrix by a scalar. */
export function alg2MatrixData(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const days = ["Mon", "Tue"];
    const items = ["Tacos", "Salads", "Wraps"];
    const M = [items.map(() => rand(5, 60)), items.map(() => rand(5, 60))];
    const [r, c] = [rand(0, 1), rand(0, 2)];
    return {
      key: `md-read-${M.flat().join(".")}-${r}-${c}`,
      prompt: `Lunch sales: rows ${days.join(", ")}; columns ${items.join(", ").toLowerCase()}. What is a${r + 1}${c + 1}?`,
      speech: `The matrix shows lunch sales, rows for days, columns for items. What is the entry in row ${r + 1}, column ${c + 1}?`,
      visual: oneMat("A", M),
      needsVisual: true,
      ...choose(M[r][c], [M[1 - r][c], M[r][(c + 1) % 3], M[c < 2 ? c : 0][r]].filter((v) => v !== M[r][c]), 1, 0),
      hint: "a_rc means row r, column c: go down first, then across.",
      explain: `Row ${r + 1} (${days[r]}), column ${c + 1} (${items[c]}): ${M[r][c]}.`,
    };
  }
  if (kind === 1) {
    const [m, n] = [rand(1, 4), rand(1, 4)];
    return {
      key: `md-dim-${m}-${n}`,
      prompt: "What are the dimensions of this matrix?",
      speech: `A matrix has ${m} rows and ${n} columns. How do you write its dimensions?`,
      visual: { kind: "matrix", items: [{ rows: Array.from({ length: m }, () => Array.from({ length: n }, () => rand(0, 9))) }] },
      needsVisual: true,
      ...label(`${m} × ${n}`, [`${n} × ${m}`, `${m * n} × 1`, `${m + n}`]),
      hint: "Rows first, then columns.",
      explain: `${m} rows by ${n} columns: ${m} × ${n}.`,
    };
  }
  if (kind === 2) {
    const A = randM(-6, 6);
    const k = nz(-4, 4);
    const e = rand(0, 3);
    const v = A[Math.floor(e / 2)][e % 2];
    return {
      key: `md-scal-${A.flat().join(".")}-${k}-${e}`,
      prompt: `Find the ${ROWCOL[e]} entry of ${k}A.`,
      speech: `Multiply matrix A by ${say(ds(k))}. What is the entry in ${ROWCOL[e]}?`,
      visual: oneMat("A", A),
      needsVisual: true,
      ...signed(k * v),
      hint: "A scalar multiplies every entry.",
      explain: `${ds(k)} × ${ds(v)} = ${ds(k * v)}.`,
    };
  }
  const cities = ["A", "B", "C", "D"];
  const M = cities.map((_, i) => cities.map((_, j) => (i === j ? 0 : rand(0, 1))));
  const r = rand(0, 3);
  const flights = M[r].reduce((s, v) => s + v, 0);
  return {
    key: `md-net-${M.flat().join("")}-${r}`,
    prompt: `Rows and columns are cities A–D; 1 = a direct flight from the row city to the column city. Flights out of ${cities[r]}?`,
    speech: `In this matrix, a 1 means there's a direct flight from the row's city to the column's city. How many direct flights leave city ${cities[r]}?`,
    visual: oneMat("F", M),
    needsVisual: true,
    ...choose(flights, [M.reduce((s, row) => s + row[r], 0), 3 - flights, 4].filter((v) => v !== flights), 1, 0),
    hint: `Add up row ${cities[r]}.`,
    explain: `Row ${cities[r]} has ${flights} one${flights === 1 ? "" : "s"}: ${flights} flights.`,
  };
}

/** HSN-VM.C.8, C.9 — add, subtract and multiply matrices; multiplication isn't commutative. */
export function alg2MatrixMultiply(): Question {
  const kind = rand(0, 3);
  const A = randM();
  const B = randM();
  const e = rand(0, 3);
  const [r, c] = [Math.floor(e / 2), e % 2];
  if (kind === 0) {
    const add = rand(0, 1) === 1;
    const v = add ? A[r][c] + B[r][c] : A[r][c] - B[r][c];
    return {
      key: `mm-as-${A.flat().join(".")}-${B.flat().join(".")}-${e}-${add}`,
      prompt: `Find the missing entry of A ${add ? "+" : "−"} B.`,
      speech: `What is the entry in ${ROWCOL[e]} of A ${add ? "plus" : "minus"} B?`,
      visual: { kind: "matrix", items: [{ rows: A }, add ? "+" : "−", { rows: B }, "=", { rows: askEntry(e) }] },
      needsVisual: true,
      ...signed(v),
      hint: "Add or subtract the entries in the same position.",
      explain: `${ds(A[r][c])} ${add ? "+" : "−"} ${ds(B[r][c])} = ${ds(v)}.`,
    };
  }
  if (kind === 1) {
    const P = mul(A, B);
    return {
      key: `mm-mul-${A.flat().join(".")}-${B.flat().join(".")}-${e}`,
      prompt: "Find the missing entry of AB.",
      speech: `Multiply matrices A times B. What is the entry in ${ROWCOL[e]}?`,
      visual: { kind: "matrix", items: [{ rows: A }, "×", { rows: B }, "=", { rows: askEntry(e) }] },
      needsVisual: true,
      ...signed(P[r][c]),
      hint: `Row ${r + 1} of A times column ${c + 1} of B: multiply pairs and add.`,
      explain: `${ds(A[r][0])}·${ds(B[0][c])} + ${ds(A[r][1])}·${ds(B[1][c])} = ${ds(P[r][c])}.`,
    };
  }
  if (kind === 2) {
    const dims: [number, number, number, number][] = [
      [2, 3, 3, 4], [3, 2, 2, 2], [2, 2, 2, 1], [1, 3, 3, 1], [3, 1, 1, 3], [2, 3, 2, 3], [4, 2, 3, 2], [2, 4, 4, 3],
    ];
    const [m, n, p, q] = pick(dims);
    const ok = n === p;
    return {
      key: `mm-dim-${m}${n}${p}${q}`,
      prompt: `A is ${m} × ${n}, B is ${p} × ${q}. What size is AB?`,
      speech: `Matrix A is ${m} by ${n} and B is ${p} by ${q}. What size is the product A B?`,
      visual: NONE,
      ...label(ok ? `${m} × ${q}` : "Not defined", [`${m} × ${q}`, `${n} × ${p}`, `${q} × ${m}`, "Not defined"]),
      hint: "AB exists only when A's columns = B's rows. The result has A's rows and B's columns.",
      explain: ok ? `Inner sizes match (${n}), so AB is ${m} × ${q}.` : `A has ${n} columns but B has ${p} rows, so AB isn't defined.`,
    };
  }
  let P = mul(A, B);
  let Q = mul(B, A);
  if (P[0][0] === Q[0][0]) {
    A[0][1] += 1;
    P = mul(A, B);
    Q = mul(B, A);
  }
  return {
    key: `mm-comm-${A.flat().join(".")}-${B.flat().join(".")}`,
    prompt: `The top-left entry of AB is ${ds(P[0][0])}. Find the top-left entry of BA.`,
    speech: `For these matrices, the top-left entry of A B is ${say(ds(P[0][0]))}. What is the top-left entry of B A?`,
    visual: twoMats(A, B),
    needsVisual: true,
    ...signed(Q[0][0]),
    hint: "For BA, use row 1 of B and column 1 of A.",
    explain: `BA top-left = ${ds(B[0][0])}·${ds(A[0][0])} + ${ds(B[0][1])}·${ds(A[1][0])} = ${ds(Q[0][0])}${Q[0][0] !== P[0][0] ? `, not ${ds(P[0][0])}: AB ≠ BA` : ""}.`,
  };
}

/** HSN-VM.C.10 — zero and identity matrices; determinants and inverses. */
export function alg2MatrixInverse(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const A = randM(-7, 7);
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    return {
      key: `mi-det-${A.flat().join(".")}`,
      prompt: "Find det A.",
      speech: "Find the determinant of matrix A: a d minus b c.",
      visual: oneMat("A", A),
      needsVisual: true,
      ...signed(det),
      hint: "For [a b; c d], det = ad − bc.",
      explain: `${ds(A[0][0])}·${ds(A[1][1])} − ${ds(A[0][1])}·${ds(A[1][0])} = ${ds(det)}.`,
    };
  }
  if (kind === 1) {
    const sing = rand(0, 1) === 1;
    let A: M2;
    if (sing) {
      const [p, q] = [nz(-4, 4), nz(-4, 4)];
      const k = nz(-3, 3);
      A = [
        [p, q],
        [k * p, k * q],
      ];
    } else {
      do A = randM(-6, 6);
      while (A[0][0] * A[1][1] - A[0][1] * A[1][0] === 0);
    }
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    return {
      key: `mi-inv-${A.flat().join(".")}`,
      prompt: "Does matrix A have an inverse?",
      speech: "Does matrix A have an inverse?",
      visual: oneMat("A", A),
      needsVisual: true,
      ...yesNo(det !== 0),
      hint: "A 2 × 2 matrix has an inverse exactly when its determinant isn't 0.",
      explain: `det A = ${ds(det)}${det === 0 ? ", so there's no inverse." : ", not 0, so A⁻¹ exists."}`,
    };
  }
  if (kind === 2) {
    let A: M2;
    let det = 0;
    do {
      A = randM(-4, 4);
      det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    } while (Math.abs(det) !== 1);
    const inv: M2 = [
      [A[1][1] / det, -A[0][1] / det],
      [-A[1][0] / det, A[0][0] / det],
    ];
    const e = rand(0, 3);
    const v = clean(inv[Math.floor(e / 2)][e % 2]);
    return {
      key: `mi-entry-${A.flat().join(".")}-${e}`,
      prompt: `det A = ${ds(det)}. Find the missing entry of A⁻¹.`,
      speech: `Matrix A has determinant ${say(ds(det))}. What is the entry in ${ROWCOL[e]} of A inverse?`,
      visual: { kind: "matrix", items: [{ name: "A", rows: A }, { name: "A⁻¹", rows: askEntry(e) }] },
      needsVisual: true,
      ...signed(v),
      hint: "A⁻¹ = (1/det)·[d −b; −c a]: swap a and d, negate b and c, divide by det.",
      explain: `A⁻¹ = ${mText(inv)}, so the entry is ${ds(v)}.`,
    };
  }
  const items: [string, string, string[]][] = [
    ["A · I = ?", "A", ["I", "0 (zero matrix)", "A²"]],
    ["A + O (the zero matrix) = ?", "A", ["O", "I", "2A"]],
    ["A − A = ?", "O (the zero matrix)", ["I", "A", "1"]],
    ["A · A⁻¹ = ?", "I (the identity)", ["O (the zero matrix)", "A", "1/A"]],
    ["The 2 × 2 identity matrix is…", "[1 0; 0 1]", ["[1 1; 1 1]", "[0 1; 1 0]", "[0 0; 0 0]"]],
    ["det I = ?", "1", ["0", "2", "−1"]],
    ["For the zero matrix O, does O⁻¹ exist?", "No", ["Yes", "Only for 2 × 2", "It's O"]],
  ];
  const i = rand(0, items.length - 1);
  const [q, r, w] = items[i];
  return {
    key: `mi-id-${i}`,
    prompt: q,
    speech: say(q.replace(/…$/, " what?").replace(/⁻¹/g, " inverse")),
    visual: NONE,
    ...label(r, w),
    hint: "I acts like 1 and O acts like 0 in matrix arithmetic.",
    explain: `${q.replace(/ = \?$|…$/, "")}: ${r}.`,
  };
}

const TRANSFORMS: [M2, string][] = [
  [[[0, -1], [1, 0]], "rotate 90° counterclockwise"],
  [[[-1, 0], [0, -1]], "rotate 180°"],
  [[[0, 1], [-1, 0]], "rotate 90° clockwise"],
  [[[1, 0], [0, -1]], "reflect over the x-axis"],
  [[[-1, 0], [0, 1]], "reflect over the y-axis"],
  [[[0, 1], [1, 0]], "reflect over y = x"],
  [[[2, 0], [0, 2]], "dilate by 2"],
  [[[3, 0], [0, 1]], "stretch horizontally by 3"],
];

/** HSN-VM.C.11, C.12 — matrix times vector; 2 × 2 matrices as transformations; |det| as area scale. */
export function alg2MatrixTransform(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const A = randM(-4, 4);
    const [x, y] = [nz(-4, 4), nz(-4, 4)];
    const out = [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y];
    return {
      key: `mt-mv-${A.flat().join(".")}-${x}-${y}`,
      prompt: "Find the product.",
      speech: `Multiply matrix A by the column vector ${say(ds(x))}, ${say(ds(y))}.`,
      visual: { kind: "matrix", items: [{ rows: A }, "×", { rows: [[x], [y]] }, "=", { rows: [["?"], ["?"]] }] },
      needsVisual: true,
      ...label(vec(out[0], out[1]), [vec(A[0][0] * x + A[1][0] * y, A[0][1] * x + A[1][1] * y), vec(A[0][0] * x, A[1][1] * y), vec(out[1], out[0]), vec(-out[0], out[1] + 1), vec(out[0] + 2, -out[1])]),
      hint: "Each row of A dotted with the vector gives one component.",
      explain: `Row 1: ${ds(A[0][0])}·${ds(x)} + ${ds(A[0][1])}·${ds(y)} = ${ds(out[0])}. Row 2: ${ds(A[1][0])}·${ds(x)} + ${ds(A[1][1])}·${ds(y)} = ${ds(out[1])}.`,
    };
  }
  if (kind === 1) {
    const i = rand(0, TRANSFORMS.length - 1);
    const [M, name] = TRANSFORMS[i];
    return {
      key: `mt-name-${i}`,
      prompt: "What does this matrix do to the plane?",
      speech: "What transformation of the plane does this matrix make? Try it on the points 1 comma 0 and 0 comma 1.",
      visual: oneMat("M", M),
      needsVisual: true,
      ...label(name, TRANSFORMS.map((t) => t[1])),
      hint: "The columns show where (1, 0) and (0, 1) go.",
      explain: `(1, 0) → ${pt(M[0][0], M[1][0])} and (0, 1) → ${pt(M[0][1], M[1][1])}: ${name}.`,
    };
  }
  if (kind === 2) {
    const A = randM(-4, 4);
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (det === 0) return alg2MatrixTransform();
    const area = rand(1, 6);
    return {
      key: `mt-area-${A.flat().join(".")}-${area}`,
      prompt: `A shape of area ${area} is transformed by A. Area of the image?`,
      speech: `A shape with area ${area} is transformed by matrix A. What is the area of the image?`,
      visual: oneMat("A", A),
      needsVisual: true,
      ...choose(Math.abs(det) * area, [det * area, Math.abs(det), area * (Math.abs(A[0][0]) + Math.abs(A[1][1]))].filter((v) => v !== Math.abs(det) * area), 1),
      hint: "Areas scale by |det A|.",
      explain: `|det A| = |${ds(det)}| = ${Math.abs(det)}, so the area is ${area} × ${Math.abs(det)} = ${Math.abs(det) * area}.`,
    };
  }
  const i = rand(0, 5);
  const [M, name] = TRANSFORMS[i];
  const [x, y] = offPoint(5);
  return {
    key: `mt-img-${i}-${x}-${y}`,
    prompt: `${cap(name)} with this matrix. Image of ${pt(x, y)}?`,
    speech: `This matrix will ${name}. Where does the point ${sayPt(x, y)} go?`,
    visual: oneMat("M", M),
    ...label(pt(M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y), [pt(M[0][0] * x + M[1][0] * y, M[0][1] * x + M[1][1] * y), pt(-x, -y), pt(y, x), pt(x, -y)]),
    hint: "Multiply the matrix by the column vector (x, y).",
    explain: `M${vec(x, y)} = ${vec(M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y)}.`,
  };
}

/* ================================================================ J. Probability */

/** Hundredths as a decimal: 35 → 0.35. */
const h100 = (n: number) => clean(n / 100);

const EVENTS: { name: string; test: (n: number) => boolean }[] = [
  { name: "even", test: (n) => n % 2 === 0 },
  { name: "odd", test: (n) => n % 2 === 1 },
  { name: "prime", test: (n) => [2, 3, 5, 7, 11].includes(n) },
  { name: "greater than 4", test: (n) => n > 4 },
  { name: "less than 4", test: (n) => n < 4 },
  { name: "a multiple of 3", test: (n) => n % 3 === 0 },
];
/** Two different events, as indexes into EVENTS, that aren't complements. */
function twoEvents(): [number, number] {
  for (;;) {
    const i = rand(0, EVENTS.length - 1);
    const j = rand(0, EVENTS.length - 1);
    if (i !== j && !(i <= 1 && j <= 1)) return [i, j];
  }
}

/** HSS-CP.A.1 — events as subsets: unions, intersections and complements. */
export function probSets(): Question {
  const kind = rand(0, 3);
  if (kind <= 1) {
    const [L, B, R, O] = [rand(2, 20), rand(1, 12), rand(2, 20), rand(0, 15)];
    const N = L + B + R + O;
    const labelsList: [string, string][] = [
      ["Soccer", "Band"],
      ["Cats", "Dogs"],
      ["Math club", "Art club"],
      ["Bus", "Bike"],
    ];
    const lab = pick(labelsList);
    const asks = [
      { q: `n(${lab[0]} ∪ ${lab[1]})`, s: `in ${lab[0]} or ${lab[1]} or both`, v: L + B + R },
      { q: `n(${lab[0]} ∩ ${lab[1]})`, s: `in both ${lab[0]} and ${lab[1]}`, v: B },
      { q: `n(${lab[0]}′)`, s: `not in ${lab[0]}`, v: R + O },
      { q: `n(${lab[0]} only)`, s: `in ${lab[0]} but not ${lab[1]}`, v: L },
    ];
    const a = pick(asks);
    if (kind === 0) {
      return {
        key: `set-n-${L}-${B}-${R}-${O}-${a.q}`,
        prompt: `${N} students. How many are ${a.s}?`,
        speech: `The Venn diagram shows ${N} students. How many are ${a.s}?`,
        visual: { kind: "venn", labels: lab, left: L, both: B, right: R, outside: O },
        needsVisual: true,
        ...choose(a.v, [L + R, L + B, N - B, B + R, O].filter((v) => v !== a.v), 1, 0),
        hint: "∪ (or) means in either circle. ∩ (and) means the overlap. ′ (not) means outside that circle.",
        explain: `${a.q} = ${a.v}.`,
      };
    }
    return {
      key: `set-p-${L}-${B}-${R}-${O}-${a.q}`,
      prompt: `Pick one of the ${N} at random. P(${a.q.slice(2, -1)})?`,
      speech: `Pick one of the ${N} students at random. What is the probability they are ${a.s}?`,
      visual: { kind: "venn", labels: lab, left: L, both: B, right: R, outside: O },
      needsVisual: true,
      ...label(frac(a.v, N), [frac(N - a.v, N), frac(L + B, N), frac(B, N), frac(L + R, N), frac(a.v, N - O)]),
      hint: "Count the outcomes in the event, then divide by everyone.",
      explain: `${a.v} out of ${N}: ${frac(a.v, N)}.`,
    };
  }
  if (kind === 2) {
    const [i, j] = twoEvents();
    const top = rand(0, 1) === 1 ? 10 : 8;
    const S = Array.from({ length: top }, (_, k) => k + 1);
    const A = S.filter(EVENTS[i].test);
    const B = S.filter(EVENTS[j].test);
    const op = rand(0, 2);
    const res = op === 0 ? S.filter((n) => A.includes(n) && B.includes(n)) : op === 1 ? S.filter((n) => A.includes(n) || B.includes(n)) : S.filter((n) => !A.includes(n));
    const setStr = (xs: number[]) => (xs.length ? `{${xs.join(", ")}}` : "{ } (empty)");
    const sym = ["A ∩ B", "A ∪ B", "A′"][op];
    const wrong = [
      S.filter((n) => A.includes(n) && B.includes(n)),
      S.filter((n) => A.includes(n) || B.includes(n)),
      S.filter((n) => !A.includes(n)),
      S.filter((n) => A.includes(n) && !B.includes(n)),
      S.filter((n) => !B.includes(n)),
    ].map(setStr);
    return {
      key: `set-list-${i}-${j}-${top}-${op}`,
      prompt: `Spin 1–${top}. A = ${EVENTS[i].name}, B = ${EVENTS[j].name}. List ${sym}.`,
      speech: `A spinner shows 1 to ${top}. Event A is ${EVENTS[i].name}; event B is ${EVENTS[j].name}. Which set is ${["A and B", "A or B", "not A"][op]}?`,
      visual: NONE,
      ...label(setStr(res), wrong),
      hint: "List A and B first. ∩ keeps numbers in both; ∪ keeps numbers in either; A′ keeps everything not in A.",
      explain: `A = ${setStr(A)}, B = ${setStr(B)}, so ${sym} = ${setStr(res)}.`,
    };
  }
  const pa = rand(2, 8) * 10;
  return {
    key: `set-comp-${pa}`,
    prompt: `P(A) = ${h100(pa)}. What is P(A′)?`,
    speech: `The probability of A is ${h100(pa)}. What is the probability of not A?`,
    visual: NONE,
    ...keypad(h100(100 - pa)),
    hint: "A and A′ together cover everything: P(A) + P(A′) = 1.",
    explain: `1 − ${h100(pa)} = ${h100(100 - pa)}.`,
  };
}

const PAIRS_INDEP: [string, boolean][] = [
  ["Flip a coin, then roll a die", true],
  ["Draw 2 cards without putting the first back", false],
  ["Draw a card, put it back, draw again", true],
  ["It's raining; you carry an umbrella", false],
  ["Two friends in different cities flip coins", true],
  ["Pick 2 people for a team from the same class", false],
  ["Roll a red die and a blue die", true],
  ["Studying more; scoring higher on the test", false],
  ["Spin a spinner twice", true],
  ["Eat 2 cookies from a jar, one after the other", false],
];

/** HSS-CP.A.1, A.2, A.5 — sort outcomes into events, and events into independent or dependent. */
export function probSortOutcomes(): Question {
  const kind = rand(0, 2);
  if (kind <= 1) {
    const [i, j] = twoEvents();
    const top = 8;
    const S = Array.from({ length: top }, (_, k) => k + 1);
    const inA = (n: number) => EVENTS[i].test(n);
    const inB = (n: number) => EVENTS[j].test(n);
    if (kind === 0) {
      const bins = ["A only", "B only", "A and B", "Neither"];
      const items = S.map((n) => ({ label: String(n), bin: inA(n) && inB(n) ? 2 : inA(n) ? 0 : inB(n) ? 1 : 3 }));
      return {
        key: `so-venn-${i}-${j}`,
        prompt: `Roll an 8-sided die. A = ${EVENTS[i].name}, B = ${EVENTS[j].name}. Sort each outcome.`,
        speech: `Roll an 8 sided die. Event A is ${EVENTS[i].name}, event B is ${EVENTS[j].name}. Sort each outcome into A only, B only, both, or neither.`,
        visual: NONE,
        input: "activity",
        activity: { kind: "sort", bins, items },
        answer: items.filter((it) => it.bin === 2).length,
        hint: "Test each number twice: is it in A? Is it in B?",
        explain: `A and B: ${S.filter((n) => inA(n) && inB(n)).join(", ") || "none"}. Neither: ${S.filter((n) => !inA(n) && !inB(n)).join(", ") || "none"}.`,
      };
    }
    const items = S.map((n) => ({ label: String(n), bin: inA(n) || inB(n) ? 0 : 1 }));
    return {
      key: `so-union-${i}-${j}`,
      prompt: `Die 1–8. A = ${EVENTS[i].name}, B = ${EVENTS[j].name}. Sort: in A ∪ B or not?`,
      speech: `Roll an 8 sided die. Event A is ${EVENTS[i].name} and event B is ${EVENTS[j].name}. Sort each outcome: is it in A or B, or not?`,
      visual: NONE,
      input: "activity",
      activity: { kind: "sort", bins: ["In A ∪ B", "Not in A ∪ B"], items },
      answer: items.filter((it) => it.bin === 0).length,
      hint: "A ∪ B means in A, in B, or in both.",
      explain: `A ∪ B = {${S.filter((n) => inA(n) || inB(n)).join(", ")}}.`,
    };
  }
  const picks = shuffle(PAIRS_INDEP.map((_, k) => k)).slice(0, 5).sort((a, b) => a - b);
  return {
    key: `so-indep-${picks.join(".")}`,
    prompt: "Sort each pair of events: independent or dependent?",
    speech: "Sort each pair of events. Does the first one change the chances of the second? Independent or dependent?",
    visual: NONE,
    input: "activity",
    activity: { kind: "sort", bins: ["Independent", "Dependent"], items: picks.map((k) => ({ label: PAIRS_INDEP[k][0], bin: PAIRS_INDEP[k][1] ? 0 : 1 })) },
    answer: picks.length,
    hint: "Independent: knowing the first result doesn't change the chances of the second.",
    explain: "Without replacement, or when one thing influences the other, events are dependent.",
  };
}

/** HSS-CP.A.2 — independent events: P(A and B) = P(A)·P(B). */
export function probIndependent(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const sides = pick([4, 6, 8, 10, 12]);
    const t = rand(1, sides - 1);
    const coinH = rand(0, 1) === 1;
    return {
      key: `ind-coin-${sides}-${t}-${coinH}`,
      prompt: `Flip a coin and roll a ${sides}-sided die. P(${coinH ? "heads" : "tails"} and a number ≤ ${t})?`,
      speech: `Flip a coin and roll a ${sides} sided die. What is the probability of ${coinH ? "heads" : "tails"} and a number ${t} or less?`,
      visual: { kind: "tree", stages: [["H", "T"], Array.from({ length: Math.min(sides, 6) }, (_, i) => String(i + 1)).concat(sides > 6 ? ["…"] : [])] },
      ...label(frac(t, 2 * sides), [frac(t + 1, 2 * sides), frac(t, sides), frac(1, 2 * sides), frac(t + sides, 2 * sides)]),
      hint: "The coin doesn't affect the die. Multiply the two probabilities.",
      explain: `½ × ${frac(t, sides)} = ${frac(t, 2 * sides)}.`,
    };
  }
  if (kind === 1) {
    const pa = rand(2, 8);
    const pb = rand(2, 8);
    const indep = rand(0, 1) === 1;
    const pab = indep ? pa * pb : pa * pb + pick([-4, -3, 3, 4, 5]);
    return {
      key: `ind-test-${pa}-${pb}-${pab}`,
      prompt: `P(A) = ${pa / 10}, P(B) = ${pb / 10}, P(A and B) = ${h100(pab)}. Independent?`,
      speech: `P of A is ${pa / 10}, P of B is ${pb / 10}, and P of A and B is ${h100(pab)}. Are A and B independent?`,
      visual: NONE,
      ...yesNo(indep),
      hint: "Independent exactly when P(A and B) = P(A) × P(B).",
      explain: `${pa / 10} × ${pb / 10} = ${h100(pa * pb)}${indep ? ", which matches: independent." : `, not ${h100(pab)}: dependent.`}`,
    };
  }
  if (kind === 2) {
    const p = rand(5, 9);
    const n = rand(2, 3);
    const ans = clean((p / 10) ** n);
    return {
      key: `ind-rep-${p}-${n}`,
      prompt: `A player makes ${p * 10}% of free throws. P(makes ${n} in a row)?`,
      speech: `A basketball player makes ${p * 10} percent of free throws, independently. What is the probability she makes ${n} in a row?`,
      visual: NONE,
      ...keypad(ans),
      hint: `Multiply ${p / 10} by itself ${n} times.`,
      explain: `${p / 10}${n === 2 ? "²" : "³"} = ${ds(ans)}.`,
    };
  }
  const pa = rand(2, 8);
  const pb = rand(1, 9);
  return {
    key: `ind-back-${pa}-${pb}`,
    prompt: `A, B independent. P(A) = ${pa / 10}, P(A and B) = ${h100(pa * pb)}. P(B)?`,
    speech: `A and B are independent. P of A is ${pa / 10} and P of A and B is ${h100(pa * pb)}. What is P of B?`,
    visual: NONE,
    ...keypad(pb / 10),
    hint: "P(A and B) = P(A) × P(B). Divide.",
    explain: `${h100(pa * pb)} ÷ ${pa / 10} = ${pb / 10}.`,
  };
}

/** A two-way table of counts, optionally independent. */
function twoWay(indep: boolean) {
  const r1t = rand(3, 8) * 10;
  const r2t = rand(3, 8) * 10;
  const p = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  const a = Math.round(r1t * p);
  const c = indep ? Math.round(r2t * p) : Math.round(r2t * p) + pick([-6, -4, 4, 6]);
  return { a, b: r1t - a, c, d: r2t - c };
}
const TW_CTX: { rows: [string, string]; cols: [string, string] }[] = [
  { rows: ["9th grade", "10th grade"], cols: ["Plays sport", "No sport"] },
  { rows: ["Phone", "No phone"], cols: ["Sleeps 8 h", "Sleeps less"] },
  { rows: ["Morning", "Evening"], cols: ["Late bus", "On time"] },
  { rows: ["Drug", "Placebo"], cols: ["Improved", "Not improved"] },
];

/** HSS-CP.A.4 — two-way tables: conditional probability and checking independence. */
export function probTwoWay(): Question {
  const kind = rand(0, 3);
  const ctx = pick(TW_CTX);
  const ci = TW_CTX.indexOf(ctx);
  const indep = rand(0, 1) === 1;
  const { a, b, c, d } = twoWay(kind === 3 ? indep : rand(0, 1) === 1);
  const N = a + b + c + d;
  const table: Visual = {
    kind: "table",
    header: ["", ctx.cols[0], ctx.cols[1], "Total"],
    rows: [
      [ctx.rows[0], a, b, a + b],
      [ctx.rows[1], c, d, c + d],
      ["Total", a + c, b + d, N],
    ],
  };
  const tkey = `${ci}-${a}-${b}-${c}-${d}`;
  if (kind === 0) {
    return {
      key: `tw-rowcond-${tkey}`,
      prompt: `P(${ctx.cols[0]} | ${ctx.rows[0]})?`,
      speech: `Use the table. Given ${ctx.rows[0]}, what is the probability of ${ctx.cols[0]}?`,
      visual: table,
      needsVisual: true,
      ...label(frac(a, a + b), [frac(a, a + c), frac(a, N), frac(b, a + b), frac(a + b, N)]),
      hint: `"Given ${ctx.rows[0]}" means only look at that row.`,
      explain: `${a} of the ${a + b} in ${ctx.rows[0]}: ${frac(a, a + b)}.`,
    };
  }
  if (kind === 1) {
    return {
      key: `tw-colcond-${tkey}`,
      prompt: `P(${ctx.rows[1]} | ${ctx.cols[0]})?`,
      speech: `Use the table. Given ${ctx.cols[0]}, what is the probability of ${ctx.rows[1]}?`,
      visual: table,
      needsVisual: true,
      ...label(frac(c, a + c), [frac(c, c + d), frac(c, N), frac(a, a + c), frac(a + c, N)]),
      hint: `"Given ${ctx.cols[0]}" means only look at that column.`,
      explain: `${c} of the ${a + c} in ${ctx.cols[0]}: ${frac(c, a + c)}.`,
    };
  }
  if (kind === 2) {
    return {
      key: `tw-and-${tkey}`,
      prompt: `Pick one at random. P(${ctx.rows[1]} and ${ctx.cols[1]})?`,
      speech: `Pick one person at random from the table. What is the probability of ${ctx.rows[1]} and ${ctx.cols[1]}?`,
      visual: table,
      needsVisual: true,
      ...label(frac(d, N), [frac(d, c + d), frac(d, b + d), frac(c + d, N), frac(b, N)]),
      hint: "And = one cell. Divide by the grand total.",
      explain: `${d} of ${N}: ${frac(d, N)}.`,
    };
  }
  const p1 = a / (a + b);
  const p0 = (a + c) / N;
  const yes = Math.abs(p1 - p0) < 1e-9;
  return {
    key: `tw-indep-${tkey}`,
    prompt: `Is ${ctx.cols[0]} independent of ${ctx.rows[0]}?`,
    speech: `Use the table. Is ${ctx.cols[0]} independent of being in ${ctx.rows[0]}? Compare the conditional probability with the overall probability.`,
    visual: table,
    needsVisual: true,
    ...yesNo(yes),
    hint: `Compare P(${ctx.cols[0]} | ${ctx.rows[0]}) with P(${ctx.cols[0]}).`,
    explain: `P(${ctx.cols[0]} | ${ctx.rows[0]}) = ${r2(p1)}, P(${ctx.cols[0]}) = ${r2(p0)}. ${yes ? "Equal, so independent." : "Different, so not independent."}`,
  };
}

/** All 36 rolls of two dice. */
const DICE = Array.from({ length: 36 }, (_, k) => [Math.floor(k / 6) + 1, (k % 6) + 1]);
const DICE_EV: { name: string; t: (a: number, b: number) => boolean }[] = [
  { name: "the sum is 8", t: (a, b) => a + b === 8 },
  { name: "doubles", t: (a, b) => a === b },
  { name: "the first die is 3", t: (a) => a === 3 },
  { name: "the sum is at least 9", t: (a, b) => a + b >= 9 },
  { name: "at least one 6", t: (a, b) => a === 6 || b === 6 },
  { name: "the sum is even", t: (a, b) => (a + b) % 2 === 0 },
  { name: "the first die is less than the second", t: (a, b) => a < b },
];

/** Tree: B or not B first, then A or not A; `bProbs` label the first stage and `aProbs` the four second-stage branches. */
const condTree = (bProbs: string[], aProbs: string[]): Visual => ({
  kind: "tree",
  stages: [
    ["B", "not B"],
    ["A", "not A"],
  ],
  probs: [bProbs, aProbs],
});

/** HSS-CP.A.3, B.6 — conditional probability P(A | B) = P(A and B) / P(B). */
export function probConditional(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const pb = pick([20, 25, 40, 50, 60, 80]);
    const k = pick([20, 25, 40, 50, 60, 75]);
    const pab = (pb * k) / 100;
    if (!Number.isInteger(pab)) return probConditional();
    return {
      key: `cond-form-${pb}-${k}`,
      prompt: `P(A and B) = ${h100(pab)}. Find P(A | B), the "?" branch.`,
      speech: `The probability of A and B is ${h100(pab)}, and the probability of B is ${h100(pb)}. What is the probability of A given B?`,
      visual: condTree([ds(h100(pb)), ds(h100(100 - pb))], ["?", "", "", ""]),
      needsVisual: true,
      ...keypad(k / 100),
      hint: "P(A | B) = P(A and B) ÷ P(B).",
      explain: `${h100(pab)} ÷ ${h100(pb)} = ${k / 100}.`,
    };
  }
  if (kind === 1) {
    let i = 0;
    let j = 0;
    let nb = 0;
    let nab = 0;
    do {
      i = rand(0, DICE_EV.length - 1);
      j = rand(0, DICE_EV.length - 1);
      nb = DICE.filter(([a, b]) => DICE_EV[j].t(a, b)).length;
      nab = DICE.filter(([a, b]) => DICE_EV[i].t(a, b) && DICE_EV[j].t(a, b)).length;
    } while (i === j || nab === 0);
    return {
      key: `cond-dice-${i}-${j}`,
      prompt: `Roll two dice. P(${DICE_EV[i].name} | ${DICE_EV[j].name})?`,
      speech: `Roll two dice. Given that ${DICE_EV[j].name}, what is the probability that ${DICE_EV[i].name}?`,
      visual: NONE,
      ...label(frac(nab, nb), [frac(nab, 36), frac(nb, 36), frac(DICE.filter(([a, b]) => DICE_EV[i].t(a, b)).length, 36), frac(nab + 1, nb)]),
      hint: `List only the rolls where ${DICE_EV[j].name}. What fraction of those also have ${DICE_EV[i].name}?`,
      explain: `${nb} rolls have ${DICE_EV[j].name}; ${nab} of them also have ${DICE_EV[i].name}: ${frac(nab, nb)}.`,
    };
  }
  if (kind === 2) {
    const cards: [string, string, number, number][] = [
      ["a king", "a face card", 4, 12],
      ["a heart", "a red card", 13, 26],
      ["an ace", "a spade", 1, 13],
      ["a face card", "a heart", 3, 13],
      ["a red card", "a king", 2, 4],
      ["a 7", "a club", 1, 13],
      ["a queen", "a face card", 4, 12],
      ["a diamond", "a red card", 13, 26],
      ["a black card", "an ace", 2, 4],
      ["a spade", "a black card", 13, 26],
    ];
    const i = rand(0, cards.length - 1);
    const [A, B, nab, nb] = cards[i];
    return {
      key: `cond-card-${i}`,
      prompt: `Draw one card. P(${A} | ${B})?`,
      speech: `Draw one card from a standard 52 card deck. Given that it's ${B}, what is the probability it's ${A}?`,
      visual: NONE,
      ...label(frac(nab, nb), [frac(nab, 52), frac(nb, 52), frac(nb - nab, nb), frac(1, 52)]),
      hint: `Shrink the sample space to just ${B}s.`,
      explain: `${nab} of the ${nb} cards that are ${B} are ${A}: ${frac(nab, nb)}.`,
    };
  }
  const pb = rand(2, 8);
  const pab = rand(1, 9);
  return {
    key: `cond-mult-${pb}-${pab}`,
    prompt: "Use the tree. What is P(A and B)?",
    speech: `The probability of B is ${pb / 10}, and the probability of A given B is ${pab / 10}. What is the probability of A and B?`,
    visual: condTree([ds(pb / 10), ds((10 - pb) / 10)], [ds(pab / 10), ds((10 - pab) / 10), "", ""]),
    needsVisual: true,
    ...keypad(h100(pb * pab)),
    hint: "P(A and B) = P(B) × P(A | B).",
    explain: `${pb / 10} × ${pab / 10} = ${h100(pb * pab)}.`,
  };
}

const EVERYDAY: { q: string; a: string; w: string[] }[] = [
  { q: "\"70% of students who study pass.\" Which is that?", a: "P(pass | study) = 0.7", w: ["P(study | pass) = 0.7", "P(pass and study) = 0.7", "P(pass) = 0.7"] },
  { q: "\"30% of band members are in choir.\" Which is that?", a: "P(choir | band) = 0.3", w: ["P(band | choir) = 0.3", "P(band and choir) = 0.3", "P(choir) = 0.3"] },
  { q: "\"Most people with lung cancer smoked.\" Which is that about?", a: "P(smoked | lung cancer)", w: ["P(lung cancer | smoked)", "P(smoked and lung cancer)", "P(lung cancer)"] },
  { q: "Is P(rain | clouds) the same as P(clouds | rain)?", a: "No — it usually rains when it's cloudy, but clouds often come without rain", w: ["Yes — they're always equal", "Yes, if it's summer", "No — P(rain | clouds) is always bigger"] },
  { q: "P(late | rain) = P(late). What does that mean?", a: "Rain doesn't change the chance of being late", w: ["Rain always makes you late", "You're never late", "Rain and lateness can't both happen"] },
  { q: "\"Knowing a card is red raises the chance it's a heart.\" So red and heart are…", a: "dependent", w: ["independent", "mutually exclusive", "complements"] },
  { q: "Male and female are equally likely among left-handers as overall. So gender and handedness are…", a: "independent", w: ["dependent", "mutually exclusive", "complements"] },
  { q: "A test is positive for 95% of sick people. That's…", a: "P(positive | sick) = 0.95", w: ["P(sick | positive) = 0.95", "P(sick) = 0.95", "P(positive and sick) = 0.95"] },
];

/** HSS-CP.A.5 — conditional probability and independence in everyday language. */
export function probEveryday(): Question {
  const i = rand(0, EVERYDAY.length - 1);
  const e = EVERYDAY[i];
  const flavor = rand(0, 1);
  return {
    key: `ev-${i}-${flavor}`,
    prompt: e.q,
    speech: say(e.q.replace(/"/g, "").replace(/\|/g, " given ").replace(/…$/, " what?")),
    visual: NONE,
    ...label(e.a, e.w),
    hint: flavor ? "\"Of the X, …\" or \"when X, …\" means given X: X goes after the bar." : "P(A | B) asks: among the B's, how many are A? Swapping A and B changes the question.",
    explain: `${e.a}.`,
  };
}

/** HSS-CP.B.7 — the addition rule P(A or B) = P(A) + P(B) − P(A and B). */
export function probAdditionRule(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const pa = rand(2, 7) * 10;
    const pb = rand(2, 7) * 10;
    const pab = rand(1, Math.min(pa, pb) / 10 - 1) * 10;
    return {
      key: `add-num-${pa}-${pb}-${pab}`,
      prompt: `P(A) = ${h100(pa)}, P(B) = ${h100(pb)}, P(A and B) = ${h100(pab)}. P(A or B)?`,
      speech: `P of A is ${h100(pa)}, P of B is ${h100(pb)}, and P of A and B is ${h100(pab)}. What is P of A or B?`,
      visual: { kind: "venn", labels: ["A", "B"], left: h100(pa - pab), both: h100(pab), right: h100(pb - pab) },
      ...keypad(h100(pa + pb - pab)),
      hint: "Add, then take away the overlap — it was counted twice.",
      explain: `${h100(pa)} + ${h100(pb)} − ${h100(pab)} = ${h100(pa + pb - pab)}.`,
    };
  }
  if (kind === 1) {
    const cards: [string, string, number, number, number][] = [
      ["a king", "a heart", 4, 13, 1],
      ["a face card", "a red card", 12, 26, 6],
      ["an ace", "a black card", 4, 26, 2],
      ["a spade", "a 10", 13, 4, 1],
      ["a diamond", "a face card", 13, 12, 3],
      ["a club", "a heart", 13, 13, 0],
      ["a queen", "a king", 4, 4, 0],
    ];
    const i = rand(0, cards.length - 1);
    const [A, B, na, nb, nab] = cards[i];
    return {
      key: `add-card-${i}`,
      prompt: `Draw a card. P(${A} or ${B})?`,
      speech: `Draw one card from a standard deck. What is the probability it's ${A} or ${B}?`,
      visual: NONE,
      ...label(frac(na + nb - nab, 52), [frac(na + nb, 52), frac(na * nb, 52 * 52), frac(nab, 52), frac(na + nb + nab, 52)]),
      hint: "Count each group, then subtract the cards in both.",
      explain: `${na} + ${nb} − ${nab} = ${na + nb - nab} cards: ${frac(na + nb - nab, 52)}.`,
    };
  }
  if (kind === 2) {
    const pa = rand(2, 7) * 10;
    const pb = rand(1, 9 - pa / 10) * 10;
    return {
      key: `add-excl-${pa}-${pb}`,
      prompt: `A and B can't both happen. P(A) = ${h100(pa)}, P(B) = ${h100(pb)}. P(A or B)?`,
      speech: `A and B are mutually exclusive: they can't both happen. P of A is ${h100(pa)} and P of B is ${h100(pb)}. What is P of A or B?`,
      visual: NONE,
      ...keypad(h100(pa + pb)),
      hint: "Mutually exclusive means P(A and B) = 0.",
      explain: `${h100(pa)} + ${h100(pb)} − 0 = ${h100(pa + pb)}.`,
    };
  }
  const pa = rand(3, 7) * 10;
  const pb = rand(2, 6) * 10;
  const pab = rand(1, Math.min(pa, pb) / 10 - 1) * 10;
  return {
    key: `add-back-${pa}-${pb}-${pab}`,
    prompt: `P(A) = ${h100(pa)}, P(B) = ${h100(pb)}, P(A or B) = ${h100(pa + pb - pab)}. P(A and B)?`,
    speech: `P of A is ${h100(pa)}, P of B is ${h100(pb)}, and P of A or B is ${h100(pa + pb - pab)}. What is P of A and B?`,
    visual: NONE,
    ...keypad(h100(pab)),
    hint: "Rearrange the addition rule: P(A and B) = P(A) + P(B) − P(A or B).",
    explain: `${h100(pa)} + ${h100(pb)} − ${h100(pa + pb - pab)} = ${h100(pab)}.`,
  };
}

const MARBLE_COLOURS: Colour[] = ["berry", "wave", "leaf", "sun", "grape"];

/** HSS-CP.B.8 — the multiplication rule P(A and B) = P(A)·P(B | A), with and without replacement. */
export function probMultiplicationRule(): Question {
  const kind = rand(0, 2);
  if (kind <= 1) {
    const [c1, c2] = shuffle(MARBLE_COLOURS).slice(0, 2);
    const r = rand(2, 6);
    const b = rand(2, 6);
    const n = r + b;
    const replace = kind === 1;
    const num = replace ? r * r : r * (r - 1);
    const den = replace ? n * n : n * (n - 1);
    const [L1, L2] = [COLOUR_NAME[c1], COLOUR_NAME[c2]].map((s) => s.charAt(0).toUpperCase());
    return {
      key: `mult-bag-${r}-${b}-${replace}-${c1}`,
      prompt: `Draw 2 marbles ${replace ? "WITH" : "WITHOUT"} replacement. P(both ${COLOUR_NAME[c1]})?`,
      speech: `A bag has ${r} ${COLOUR_NAME[c1]} and ${b} ${COLOUR_NAME[c2]} marbles. Draw two, ${replace ? "putting the first back" : "without putting the first back"}. What is the probability both are ${COLOUR_NAME[c1]}?`,
      visual: replace
        ? {
            kind: "marbles",
            marbles: [
              { colour: c1, count: r },
              { colour: c2, count: b },
            ],
          }
        : {
            kind: "tree",
            stages: [
              [L1, L2],
              [L1, L2],
            ],
            probs: [
              [`${r}/${n}`, `${b}/${n}`],
              [`${r - 1}/${n - 1}`, `${b}/${n - 1}`, `${r}/${n - 1}`, `${b - 1}/${n - 1}`],
            ],
          },
      ...label(frac(num, den), [frac(replace ? r * (r - 1) : r * r, replace ? n * (n - 1) : n * n), frac(r, n), frac(2 * r, n), frac(r - 1, n - 1)]),
      hint: replace ? "Putting it back resets the bag: multiply the same chance twice." : "After the first draw there's one fewer of that colour AND one fewer marble.",
      explain: replace ? `${r}/${n} × ${r}/${n} = ${frac(num, den)}.` : `${r}/${n} × ${r - 1}/${n - 1} = ${frac(num, den)}.`,
    };
  }
  const pa = rand(2, 8);
  const pba = rand(2, 8);
  const pbn = rand(1, 7);
  const total = pa * pba + (10 - pa) * pbn;
  const askTotal = rand(0, 1) === 1;
  const t = (k: number) => ds(k / 10);
  return {
    key: `mult-tree-${pa}-${pba}-${pbn}-${askTotal}`,
    prompt: askTotal ? "Use the tree. What is the total P(B)?" : "Use the tree. What is P(A and B)?",
    speech: askTotal
      ? `The probability of A is ${pa / 10}. The probability of B given A is ${pba / 10}, and of B given not A is ${pbn / 10}. What is the total probability of B?`
      : `The probability of A is ${pa / 10}, and the probability of B given A is ${pba / 10}. What is the probability of A and B?`,
    visual: {
      kind: "tree",
      stages: [
        ["A", "not A"],
        ["B", "not B"],
      ],
      probs: [
        [t(pa), t(10 - pa)],
        askTotal ? [t(pba), t(10 - pba), t(pbn), t(10 - pbn)] : [t(pba), t(10 - pba), "", ""],
      ],
    },
    needsVisual: true,
    ...keypad(askTotal ? h100(total) : h100(pa * pba)),
    hint: askTotal ? "Follow both branches that end in B. Multiply along each branch, then add." : "Multiply along the branch: P(A) × P(B | A).",
    explain: askTotal
      ? `${pa / 10} × ${pba / 10} + ${(10 - pa) / 10} × ${pbn / 10} = ${h100(pa * pba)} + ${h100((10 - pa) * pbn)} = ${h100(total)}.`
      : `${pa / 10} × ${pba / 10} = ${h100(pa * pba)}.`,
  };
}

const COLOUR_NAME: Record<Colour, string> = {
  sun: "yellow", leaf: "green", berry: "red", wave: "blue", grape: "purple", teal: "teal",
  cocoa: "brown", rose: "pink", lime: "lime", night: "navy", tangerine: "orange",
};

const STAGES: { name: string; outs: string[] }[] = [
  { name: "flip a coin", outs: ["H", "T"] },
  { name: "roll a die", outs: ["1", "2", "3", "4", "5", "6"] },
  { name: "spin a 3-colour spinner", outs: ["R", "G", "B"] },
  { name: "pick a day: Sat or Sun", outs: ["Sat", "Sun"] },
  { name: "choose a 4-flavor scoop", outs: ["V", "C", "S", "M"] },
];

/** HSS-CP.A.2, B.8 — tree diagrams for compound events. */
export function probTreeDiagrams(): Question {
  const kind = rand(0, 2);
  let i = 0;
  let j = 0;
  do {
    i = rand(0, STAGES.length - 1);
    j = rand(0, STAGES.length - 1);
  } while (i === j);
  const A = STAGES[i];
  const B = STAGES[j];
  const tree: Visual = { kind: "tree", stages: [A.outs, B.outs] };
  /** The same tree with each branch's chance (equally likely outcomes, so the same under every parent). */
  const treeP: Visual = { kind: "tree", stages: [A.outs, B.outs], probs: [A.outs.map(() => `1/${A.outs.length}`), B.outs.map(() => `1/${B.outs.length}`)] };
  if (kind === 0) {
    return {
      key: `tree-count-${i}-${j}`,
      prompt: `You ${A.name}, then ${B.name}. How many outcomes?`,
      speech: `You ${A.name}, then ${B.name}. How many different outcomes are there?`,
      visual: tree,
      ...choose(A.outs.length * B.outs.length, [A.outs.length + B.outs.length, A.outs.length * B.outs.length + 1, 2 * B.outs.length], 1, 1),
      hint: "Each first-stage branch splits into every second-stage outcome. Multiply.",
      explain: `${A.outs.length} × ${B.outs.length} = ${A.outs.length * B.outs.length} outcomes.`,
    };
  }
  if (kind === 1) {
    const x = pick(A.outs);
    const y = pick(B.outs);
    const n = A.outs.length * B.outs.length;
    return {
      key: `tree-one-${i}-${j}-${x}-${y}`,
      prompt: `You ${A.name}, then ${B.name}. P(${x} then ${y})?`,
      speech: `You ${A.name}, then ${B.name}. All outcomes are equally likely. What is the probability of ${x}, then ${y}?`,
      visual: treeP,
      ...label(frac(1, n), [frac(2, n), frac(1, A.outs.length + B.outs.length), frac(1, A.outs.length), frac(1, B.outs.length)]),
      hint: "Exactly one path through the tree. Multiply the branch chances.",
      explain: `${frac(1, A.outs.length)} × ${frac(1, B.outs.length)} = ${frac(1, n)}.`,
    };
  }
  const x = pick(A.outs);
  const k = rand(2, B.outs.length);
  const ys = B.outs.slice(0, k);
  const n = A.outs.length * B.outs.length;
  return {
    key: `tree-some-${i}-${j}-${x}-${k}`,
    prompt: `${cap(A.name)}, then ${B.name}. P(${x}, then one of ${ys.join("/")})?`,
    speech: `You ${A.name}, then ${B.name}. What is the probability of getting ${x}, then any of ${ys.join(", ")}?`,
    visual: treeP,
    ...label(frac(k, n), [frac(1, n), frac(k, B.outs.length), frac(k + 1, n), frac(1, A.outs.length)]),
    hint: "Count the paths that start with " + x + " and end in one of those. Divide by all paths.",
    explain: `${k} of ${n} paths: ${frac(k, n)} (= ${frac(1, A.outs.length)} × ${frac(k, B.outs.length)}).`,
  };
}

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const nPr = (n: number, r: number) => fact(n) / fact(n - r);
const nCr = (n: number, r: number) => nPr(n, r) / fact(r);
const ORDER_SCENES: [string, boolean][] = [
  ["Choose a president, VP and treasurer from a club", true],
  ["Pick 3 toppings for a pizza", false],
  ["Set a 4-digit lock code with no repeats", true],
  ["Choose 5 cards for a poker hand", false],
  ["Award gold, silver and bronze", true],
  ["Pick a 4-person committee", false],
  ["Line up 6 people for a photo", true],
  ["Choose 2 books to take on a trip", false],
];

/** HSS-CP.B.9 — permutations and combinations to count outcomes and find probabilities. */
export function probCounting(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const n = rand(4, 10);
    const r = rand(2, Math.min(4, n - 1));
    return {
      key: `cnt-perm-${n}-${r}`,
      prompt: `${n} runners. How many ways can 1st, 2nd${r > 2 ? ", 3rd" : ""}${r > 3 ? ", 4th" : ""} places go?`,
      speech: `${n} runners race. How many ways can the top ${r} places be awarded, in order?`,
      visual: NONE,
      ...keypad(nPr(n, r)),
      hint: `Order matters: ${n} choices for 1st, then ${n - 1} for 2nd, and so on. That's ${n}P${r}.`,
      explain: `${Array.from({ length: r }, (_, k) => n - k).join(" × ")} = ${nPr(n, r)}.`,
    };
  }
  if (kind === 1) {
    const n = rand(5, 12);
    const r = rand(2, Math.min(5, n - 2));
    return {
      key: `cnt-comb-${n}-${r}`,
      prompt: `How many ways to choose ${r} people from ${n} for a team?`,
      speech: `How many different ${r} person teams can you choose from ${n} people? Order doesn't matter.`,
      visual: NONE,
      ...keypad(nCr(n, r)),
      hint: `Order doesn't matter: ${n}C${r} = ${n}P${r} ÷ ${r}!.`,
      explain: `${nPr(n, r)} ÷ ${fact(r)} = ${nCr(n, r)}.`,
    };
  }
  if (kind === 2) {
    const i = rand(0, ORDER_SCENES.length - 1);
    const [s, ord] = ORDER_SCENES[i];
    return {
      key: `cnt-which-${i}`,
      prompt: `${s}. Permutation or combination?`,
      speech: `${s}. Is that a permutation or a combination?`,
      visual: NONE,
      ...label(ord ? "Permutation (order matters)" : "Combination (order doesn't matter)", ["Permutation (order matters)", "Combination (order doesn't matter)"]),
      hint: "Would swapping two chosen items make a different outcome?",
      explain: ord ? "Swapping changes the result, so order matters: permutation." : "Swapping gives the same group, so it's a combination.",
    };
  }
  const g = rand(3, 7);
  const b = rand(3, 7);
  const k = rand(2, 3);
  if (g < k) return probCounting();
  return {
    key: `cnt-prob-${g}-${b}-${k}`,
    prompt: `${g} girls, ${b} boys. Choose ${k} at random. P(all girls)?`,
    speech: `A group has ${g} girls and ${b} boys. ${k} are chosen at random. What is the probability all ${k} are girls?`,
    visual: NONE,
    ...label(frac(nCr(g, k), nCr(g + b, k)), [frac(g, g + b), frac(nCr(g, k), nPr(g + b, k)), frac(k, g + b), frac(nCr(b, k), nCr(g + b, k))]),
    hint: `Favourable groups: ${g}C${k}. All groups: ${g + b}C${k}.`,
    explain: `${nCr(g, k)} ÷ ${nCr(g + b, k)} = ${frac(nCr(g, k), nCr(g + b, k))}.`,
  };
}

/* ================================================= K. Statistics & decisions */

const POLLS: { pop: string; n: number; N: number; what: string }[] = [
  { pop: "students at a school", n: 50, N: 800, what: "want a later start time" },
  { pop: "voters in a town", n: 200, N: 12000, what: "support a new park" },
  { pop: "trees in a forest", n: 40, N: 2400, what: "show signs of disease" },
  { pop: "phones from a factory batch", n: 100, N: 5000, what: "have a defect" },
  { pop: "fans at a stadium", n: 80, N: 40000, what: "bought a hot dog" },
];
const SAMPLE_METHODS: { m: string; random: boolean }[] = [
  { m: "Number everyone and draw numbers at random", random: true },
  { m: "Ask your friends", random: false },
  { m: "Ask the first 30 people who walk in", random: false },
  { m: "Post an online poll anyone can answer", random: false },
  { m: "Pick every 10th name from a shuffled full list", random: true },
  { m: "Ask people leaving the gym about exercise", random: false },
];

/** HSS-IC.A.1, A.2 — inference from random samples; is a model consistent with simulated data? */
export function probSampling(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const p = pick(POLLS);
    const pi = POLLS.indexOf(p);
    const k = rand(1, p.n - 1);
    if (((k * p.N) % p.n) !== 0) return probSampling();
    return {
      key: `samp-est-${pi}-${k}`,
      prompt: `In a random sample of ${p.n} ${p.pop}, ${k} ${p.what}. Estimate for all ${p.N.toLocaleString("en-US")}?`,
      speech: `In a random sample of ${p.n} ${p.pop}, ${k} ${p.what}. Estimate how many of all ${p.N} do.`,
      visual: NONE,
      ...keypad((k * p.N) / p.n),
      hint: "Use the sample's fraction for the whole population.",
      explain: `${k}/${p.n} of ${p.N} = ${(k * p.N) / p.n}.`,
    };
  }
  if (kind === 1) {
    const p = pick(POLLS);
    const pi = POLLS.indexOf(p);
    const askPop = rand(0, 1) === 1;
    return {
      key: `samp-def-${pi}-${askPop}`,
      prompt: `${p.n} of the ${p.N.toLocaleString("en-US")} ${p.pop} are checked. What is the ${askPop ? "population" : "sample"}?`,
      speech: `To learn about ${p.pop}, ${p.n} of the ${p.N} are checked. What is the ${askPop ? "population" : "sample"}?`,
      visual: NONE,
      ...label(askPop ? `All ${p.N.toLocaleString("en-US")} ${p.pop}` : `The ${p.n} ${p.pop} checked`, [
        askPop ? `The ${p.n} ${p.pop} checked` : `All ${p.N.toLocaleString("en-US")} ${p.pop}`,
        `The ${p.what.replace(/^(want|support|show|have|bought)/, "ones that $1")}`,
        "The researchers",
      ]),
      hint: "The population is everyone you want to know about; the sample is the part you actually measure.",
      explain: `Population: all ${p.N} ${p.pop}. Sample: the ${p.n} checked.`,
    };
  }
  if (kind === 2) {
    const i = rand(0, SAMPLE_METHODS.length - 1);
    const pool = SAMPLE_METHODS.filter((m) => m.random !== SAMPLE_METHODS[i].random).map((m) => m.m);
    const wantRandom = SAMPLE_METHODS[i].random;
    return {
      key: `samp-rand-${i}`,
      prompt: wantRandom ? "Which method gives a random sample?" : "Which method is most likely to be biased?",
      speech: wantRandom ? "Which method gives a random sample of the population?" : "Which sampling method is most likely to be biased?",
      visual: NONE,
      ...label(SAMPLE_METHODS[i].m, pool),
      hint: "In a random sample, every member of the population has the same chance of being picked.",
      explain: wantRandom ? `${SAMPLE_METHODS[i].m}: everyone has an equal chance.` : `${SAMPLE_METHODS[i].m}: some groups are much more likely to be picked.`,
    };
  }
  const obs = rand(7, 10);
  const counts: Record<number, number> = { 7: 172, 8: 55, 9: 11, 10: 1 };
  const k = counts[obs];
  const pct = clean(k / 10);
  const unusual = pct < 5;
  return {
    key: `samp-sim-${obs}`,
    prompt: `A coin gives ${obs} heads in 10 flips. In 1,000 simulated fair runs, ${k} had ${obs}+ heads. Fair?`,
    speech: `A coin landed heads ${obs} times in 10 flips. A computer simulated 1000 runs of 10 fair flips, and ${k} runs had ${obs} or more heads. Is that consistent with a fair coin?`,
    visual: NONE,
    ...label(unusual ? `Doubt it — only ${pct}% of fair runs do that` : `Plausible — ${pct}% of fair runs do that`, [
      unusual ? `Plausible — ${pct}% of fair runs do that` : `Doubt it — only ${pct}% of fair runs do that`,
      "The coin must be fair: coins are always 50-50",
      "Can't tell anything from a simulation",
    ]),
    hint: "If the fair-coin model rarely (under about 5%) gives a result this extreme, question the model.",
    explain: `${k}/1000 = ${pct}%. ${unusual ? "That's rare, so the fair-coin model looks doubtful." : "That happens often enough, so it's consistent with a fair coin."}`,
  };
}

const STUDIES: { s: string; t: number }[] = [
  { s: "Ask 500 random adults how many hours they sleep", t: 0 },
  { s: "Randomly give half the plants fertilizer and compare growth", t: 1 },
  { s: "Record which students eat breakfast and compare their grades", t: 2 },
  { s: "Email a questionnaire about favorite apps to 300 students", t: 0 },
  { s: "Randomly assign volunteers a new drug or a placebo", t: 1 },
  { s: "Compare heart health of people who already jog and who don't", t: 2 },
  { s: "Phone 1,000 voters to ask about a new law", t: 0 },
  { s: "Randomly split classes to use flashcards or not, then test them", t: 1 },
  { s: "Track traffic accidents in towns with and without speed cameras", t: 2 },
  { s: "Poll shoppers about store opening hours", t: 0 },
  { s: "Randomly assign mice to two diets and weigh them later", t: 1 },
  { s: "Look at records of people who chose to vape and their lung health", t: 2 },
];
const STUDY_NAMES = ["Survey", "Experiment", "Observational study"];
const REPORTS: { r: string; a: string; w: string[] }[] = [
  { r: "Ice cream sales and drownings rise together, so ice cream causes drowning.", a: "A third factor (hot weather) could drive both", w: ["The sample was too big", "Correlation always proves cause", "Nothing is wrong"] },
  { r: "An online poll on a sports site: 90% say sports matter most. So 90% of people agree.", a: "Volunteers on a sports site aren't representative", w: ["90% is too high to be real", "Online polls are always accurate", "The question was too short"] },
  { r: "'Don't you agree the unfair tax should end?' 80% said yes.", a: "The question is worded to push an answer", w: ["80% is a majority, so it's settled", "Taxes can't be surveyed", "The sample was random, so it's fine"] },
  { r: "3 of my 4 friends liked the movie, so 75% of the country will.", a: "The sample is tiny and not random", w: ["75% is a fair estimate", "Movies can't be surveyed", "The math is wrong"] },
  { r: "People who own pianos earn more, so buying a piano raises your income.", a: "It's observational: wealth could explain both", w: ["Pianos are expensive", "The study was an experiment", "Nothing is wrong"] },
];

/** HSS-IC.B.3, B.6 — surveys, experiments and observational studies; evaluating reports based on data. */
export function probStudies(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, STUDIES.length - 1);
    return {
      key: `st-type-${i}`,
      prompt: `${STUDIES[i].s}. What kind of study is it?`,
      speech: `${STUDIES[i].s}. Is that a survey, an experiment, or an observational study?`,
      visual: NONE,
      ...label(STUDY_NAMES[STUDIES[i].t], STUDY_NAMES),
      hint: "Experiment: researchers assign treatments. Observational: they just watch existing groups. Survey: they ask questions.",
      explain: `${STUDY_NAMES[STUDIES[i].t]}${STUDIES[i].t === 1 ? ": treatments are assigned at random." : STUDIES[i].t === 2 ? ": the groups chose themselves; nothing is assigned." : ": people are asked questions."}`,
    };
  }
  if (kind === 1) {
    const i = rand(0, REPORTS.length - 1);
    return {
      key: `st-report-${i}`,
      prompt: `"${REPORTS[i].r}" What's the main problem?`,
      speech: `A report says: ${REPORTS[i].r.replace(/'/g, "")} What's the main problem with that claim?`,
      visual: NONE,
      ...label(REPORTS[i].a, REPORTS[i].w),
      hint: "Ask: how was the data collected, who was in it, and does it show cause or just a link?",
      explain: `${REPORTS[i].a}.`,
    };
  }
  const items: [string, string, string[]][] = [
    ["Why randomly assign subjects to treatments?", "So the groups are alike except for the treatment", ["So the study is quicker", "So the results come out positive", "So no one gets a placebo"]],
    ["Can an observational study prove cause and effect?", "No — it can only show an association", ["Yes, if it's big enough", "Yes, always", "Only if it's online"]],
    ["What does a control group do in an experiment?", "Gives a baseline to compare the treatment with", ["Gets the strongest treatment", "Chooses the treatment", "Makes the sample bigger"]],
    ["When is a survey the right tool?", "To learn what people think or do", ["To prove a drug works", "To test cause and effect", "To measure plant growth under fertilizer"]],
  ];
  const i = rand(0, items.length - 1);
  return {
    key: `st-idea-${i}`,
    prompt: items[i][0],
    speech: items[i][0],
    visual: NONE,
    ...label(items[i][1], items[i][2]),
    hint: "Only random assignment lets you say the treatment caused the difference.",
    explain: `${items[i][1]}.`,
  };
}

/** HSS-IC.B.3 — sort studies into surveys, experiments and observational studies. */
export function probSortStudies(): Question {
  const per = [0, 1, 2].map((t) => shuffle(STUDIES.map((_, k) => k).filter((k) => STUDIES[k].t === t)).slice(0, 2));
  const picks = per.flat().sort((a, b) => a - b);
  return {
    key: `sst-${picks.join(".")}`,
    prompt: "Sort each study: survey, experiment or observational study?",
    speech: "Sort each study into survey, experiment, or observational study.",
    visual: NONE,
    input: "activity",
    activity: { kind: "sort", bins: STUDY_NAMES, items: picks.map((k) => ({ label: STUDIES[k].s, bin: STUDIES[k].t })) },
    answer: picks.length,
    hint: "Who decides the groups? Researchers assigning at random → experiment. People's own choices → observational. Just asking → survey.",
    explain: "Experiments assign treatments; observational studies watch existing groups; surveys ask questions.",
  };
}

const MOE: [number, number][] = [
  [100, 10], [400, 5], [625, 4], [2500, 2], [10000, 1], [1600, 2.5], [256, 6.25], [44, 15], [1111, 3],
];

/** HSS-IC.B.4 — estimate a population proportion with a margin of error. */
export function probMarginError(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const [n, m] = pick(MOE.slice(0, 7));
    return {
      key: `moe-n-${n}`,
      prompt: `A random poll of ${n.toLocaleString("en-US")} people. Margin of error ≈ 1/√n, in %?`,
      speech: `A random poll asks ${n} people. A quick rule says the margin of error is about 1 over the square root of n. What is that, as a percent?`,
      visual: NONE,
      unit: "%",
      ...keypad(m),
      hint: `√${n} = ${Math.sqrt(n)}. Then 1 ÷ ${Math.sqrt(n)}, as a percent.`,
      explain: `1/√${n} = 1/${Math.sqrt(n)} = ${m}%.`,
    };
  }
  if (kind === 1) {
    const p = rand(35, 65);
    const m = pick([2, 3, 4, 5]);
    const low = rand(0, 1) === 1;
    return {
      key: `moe-int-${p}-${m}-${low}`,
      prompt: `A poll: ${p}% ± ${m}%. ${low ? "Lowest" : "Highest"} plausible value for the true percent?`,
      speech: `A poll finds ${p} percent, with a margin of error of ${m} percent. What is the ${low ? "lowest" : "highest"} plausible value for the true percent?`,
      visual: { kind: "numberline", min: p - 10, max: p + 10, step: 1, labelStep: 5, from: p, to: low ? p - m : p + m },
      unit: "%",
      ...keypad(low ? p - m : p + m),
      hint: "The interval is estimate − margin to estimate + margin.",
      explain: `${p}% ${low ? "−" : "+"} ${m}% = ${low ? p - m : p + m}%. The interval is ${p - m}% to ${p + m}%.`,
    };
  }
  if (kind === 2) {
    const p = rand(44, 56);
    const m = pick([2, 3, 4, 5]);
    const yes = p + m > 50 && p - m < 50;
    return {
      key: `moe-win-${p}-${m}`,
      prompt: `Candidate A polls at ${p}% ± ${m}%. Could the true support be 50%?`,
      speech: `Candidate A polls at ${p} percent, plus or minus ${m} percent. Is 50 percent a plausible true level of support?`,
      visual: { kind: "numberline", min: 40, max: 60, step: 1, labelStep: 5, from: p - m, to: p + m },
      ...label(yes ? "Yes — 50% is inside the interval" : "No — 50% is outside the interval", ["Yes — 50% is inside the interval", "No — 50% is outside the interval"]),
      hint: `Build the interval: ${p - m}% to ${p + m}%. Is 50% in it?`,
      explain: `${p - m}% to ${p + m}% ${yes ? "contains" : "doesn't contain"} 50%.`,
    };
  }
  const picks = shuffle(MOE.slice(0, 7)).slice(0, 4).sort((a, b) => a[0] - b[0]);
  return {
    key: `moe-order-${picks.map((p) => p[0]).join(".")}`,
    prompt: "Order these random polls from LARGEST to smallest margin of error.",
    speech: "Tap these random polls in order, from the largest margin of error to the smallest.",
    visual: NONE,
    input: "activity",
    activity: { kind: "order", items: picks.map((p) => `n = ${p[0].toLocaleString("en-US")}`), direction: "largest margin of error first" },
    answer: picks.length,
    hint: "Bigger samples give smaller margins of error (about 1/√n).",
    explain: picks.map(([n, m]) => `n = ${n}: ±${m}%`).join(", ") + ".",
  };
}

/** HSS-IC.B.5 — compare two treatments in a randomized experiment with a simulation. */
export function probExperiments(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const t = rand(60, 95);
    const c = rand(50, t - 1);
    const dec = rand(0, 1) === 1;
    const [tv, cv] = dec ? [t / 10, c / 10] : [t, c];
    return {
      key: `exp-diff-${t}-${c}-${dec}`,
      prompt: `Treatment group mean ${ds(tv)}, control mean ${ds(cv)}. Difference (treatment − control)?`,
      speech: `In an experiment, the treatment group's mean score was ${say(ds(tv))} and the control group's was ${say(ds(cv))}. What is the difference, treatment minus control?`,
      visual: { kind: "bars", title: "Mean score", items: [{ label: "Treatment", value: tv }, { label: "Control", value: cv }], max: dec ? 10 : 100, step: dec ? 1 : 10 },
      ...keypad(clean(tv - cv)),
      hint: "Subtract the control mean from the treatment mean.",
      explain: `${ds(tv)} − ${ds(cv)} = ${ds(tv - cv)}.`,
    };
  }
  if (kind === 1) {
    const k = pick([3, 8, 12, 21, 40, 75, 140, 260, 330]);
    const sig = k < 50;
    return {
      key: `exp-sim-${k}`,
      prompt: `Re-randomizing the results 1,000 times gave a difference this big ${k} times. Significant?`,
      speech: `To test the result, the data were shuffled into random groups 1000 times. A difference as big as the real one happened ${k} times. Is the real difference significant?`,
      visual: NONE,
      ...label(sig ? "Yes — chance alone rarely does that" : "No — chance alone often does that", [
        "Yes — chance alone rarely does that",
        "No — chance alone often does that",
        "Yes — any difference is significant",
      ]),
      hint: "If random shuffling makes a gap that big less than about 5% of the time (50 of 1,000), the treatment likely mattered.",
      explain: `${k}/1000 = ${clean(k / 10)}%. ${sig ? "Under 5%: significant." : "Over 5%: could easily be chance."}`,
    };
  }
  const k = rand(1, 400);
  return {
    key: `exp-pct-${k}`,
    prompt: `${k} of 1,000 random shuffles beat the real difference. What percent is that?`,
    speech: `In a simulation, ${k} of 1000 random shuffles gave a difference at least as large as the real one. What percent is that?`,
    visual: NONE,
    unit: "%",
    ...keypad(clean(k / 10)),
    hint: "Divide by 1,000, then multiply by 100 — or just divide by 10.",
    explain: `${k} ÷ 1000 = ${clean(k / 1000)} = ${clean(k / 10)}%.`,
  };
}

/** A random probability distribution over 0..3 in tenths. */
function distTenths(): number[] {
  for (;;) {
    const p = [rand(1, 4), rand(1, 4), rand(1, 4)];
    const last = 10 - p[0] - p[1] - p[2];
    if (last >= 1) return [...p, last];
  }
}

/** HSS-MD.A.1, A.3, A.4 — random variables, theoretical and empirical probability distributions. */
export function probDistributions(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const p = distTenths();
    const miss = rand(0, 3);
    return {
      key: `dist-miss-${p.join("")}-${miss}`,
      prompt: "Find the missing probability.",
      speech: "This table gives the probability distribution of X. What is the missing probability?",
      visual: { kind: "table", header: ["x", "0", "1", "2", "3"], rows: [["P(X = x)", ...p.map((v, i) => (i === miss ? "?" : v / 10))]] },
      needsVisual: true,
      ...keypad(p[miss] / 10),
      hint: "All the probabilities in a distribution add to 1.",
      explain: `1 − (${p.filter((_, i) => i !== miss).map((v) => v / 10).join(" + ")}) = ${p[miss] / 10}.`,
    };
  }
  if (kind === 1) {
    const p = distTenths();
    const k = rand(1, 3);
    const ans = p.slice(k).reduce((s, v) => s + v, 0) / 10;
    return {
      key: `dist-atleast-${p.join("")}-${k}`,
      prompt: `P(X ≥ ${k})?`,
      speech: `Using the table, what is the probability that X is at least ${k}?`,
      visual: { kind: "table", header: ["x", "0", "1", "2", "3"], rows: [["P(X = x)", ...p.map((v) => v / 10)]] },
      needsVisual: true,
      ...keypad(ans),
      hint: `Add the probabilities for x = ${k} and up.`,
      explain: `${p.slice(k).map((v) => v / 10).join(" + ")} = ${ans}.`,
    };
  }
  if (kind === 2) {
    const dice = rand(0, 1) === 1;
    if (dice) {
      const s = rand(2, 12);
      const n = DICE.filter(([a, b]) => a + b === s).length;
      return {
        key: `dist-dice-${s}`,
        prompt: `X = the sum of two dice. P(X = ${s})?`,
        speech: `Roll two fair dice; X is the sum. What is the probability that X equals ${s}?`,
        visual: NONE,
        ...label(frac(n, 36), [frac(n + 1, 36), frac(1, 11), frac(1, 6), frac(n, 12)]),
        hint: "There are 36 equally likely rolls. Count the ones that add to " + s + ".",
        explain: `${n} of 36 rolls: ${frac(n, 36)}.`,
      };
    }
    const k = rand(0, 3);
    const n = nCr(3, k);
    return {
      key: `dist-coins-${k}`,
      prompt: `X = number of heads in 3 fair flips. P(X = ${k})?`,
      speech: `Flip a fair coin 3 times. X is the number of heads. What is the probability that X equals ${k}?`,
      visual: { kind: "tree", stages: [["H", "T"], ["H", "T"], ["H", "T"]] },
      ...label(frac(n, 8), [frac(1, 4), frac(k + 1, 8), frac(1, 8), frac(3, 4)]),
      hint: "List all 8 outcomes (HHH, HHT, …). How many have exactly that many heads?",
      explain: `${n} of 8 outcomes: ${frac(n, 8)}.`,
    };
  }
  const f = [rand(2, 8), rand(5, 15), rand(5, 20), rand(2, 10)];
  const N = f.reduce((s, v) => s + v, 0);
  const x = rand(0, 3);
  if (((f[x] * 100) % N) !== 0) return probDistributions();
  return {
    key: `dist-emp-${f.join("-")}-${x}`,
    prompt: `${N} households surveyed. Empirical P(X = ${x} cars)?`,
    speech: `${N} households were asked how many cars they own. Based on this data, what is the probability a household has ${x} cars?`,
    visual: { kind: "table", header: ["Cars", "0", "1", "2", "3"], rows: [["Households", ...f]] },
    needsVisual: true,
    ...keypad(clean(f[x] / N)),
    hint: "Empirical probability = how often it happened ÷ total.",
    explain: `${f[x]} ÷ ${N} = ${clean(f[x] / N)}.`,
  };
}

/** HSS-MD.A.2, A.3 — expected value of a random variable. */
export function probExpectedValue(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const p = distTenths();
    const ev = clean(p.reduce((s, v, i) => s + i * v, 0) / 10);
    return {
      key: `evx-table-${p.join("")}`,
      prompt: "Find the expected value E(X).",
      speech: "Using this probability distribution, find the expected value of X.",
      visual: { kind: "table", header: ["x", "0", "1", "2", "3"], rows: [["P(X = x)", ...p.map((v) => v / 10)]] },
      needsVisual: true,
      ...keypad(ev),
      hint: "Multiply each value by its probability, then add.",
      explain: `${p.map((v, i) => `${i}(${v / 10})`).join(" + ")} = ${ds(ev)}.`,
    };
  }
  if (kind === 1) {
    const n = pick([10, 20, 30, 40, 50]);
    const c = pick([2, 4, 5]);
    return {
      key: `evx-guess-${n}-${c}`,
      prompt: `Guess on ${n} questions, each with ${c} choices. Expected number right?`,
      speech: `You guess at random on ${n} multiple choice questions, each with ${c} choices. How many do you expect to get right?`,
      visual: NONE,
      ...keypad(n / c),
      hint: "Expected count = number of trials × chance of success each time.",
      explain: `${n} × ${frac(1, c)} = ${n / c}.`,
    };
  }
  if (kind === 2) {
    const vals = shuffle([1, 2, 3, 5, 10, 0, 4, 6]).slice(0, 4);
    const ev = clean(vals.reduce((s, v) => s + v, 0) / 4);
    return {
      key: `evx-spin-${vals.join(".")}`,
      prompt: `A spinner has 4 equal sections: ${vals.join(", ")} points. Expected points per spin?`,
      speech: `A spinner has 4 equal sections worth ${vals.join(", ")} points. What is the expected number of points per spin?`,
      visual: { kind: "spinner", sections: vals.map((v, i) => ({ colour: MARBLE_COLOURS[i], label: String(v) })) },
      ...keypad(ev),
      hint: "Equally likely outcomes: the expected value is the average.",
      explain: `(${vals.join(" + ")}) ÷ 4 = ${ds(ev)}.`,
    };
  }
  const ev = pick([1.5, 2.4, 0.8, 3.2]);
  const thing = pick(["goals per game", "texts per hour", "customers per minute"]);
  return {
    key: `evx-mean-${ev}-${thing}`,
    prompt: `E(X) = ${ev} ${thing}. What does that mean?`,
    speech: `The expected value is ${ev} ${thing}. What does that mean?`,
    visual: NONE,
    ...label("Over many trials, the average is about " + ev, [`Exactly ${ev} every time`, `${ev} is the most common value`, `It never goes above ${ev}`]),
    hint: "Expected value is a long-run average, not a guarantee.",
    explain: `Over many ${thing.split(" per ")[1]}s, the average settles near ${ev}${Number.isInteger(ev) ? "" : " — even though one outcome can't be a fraction"}.`,
  };
}

/** HSS-MD.B.5a, B.5b — expected payoffs and comparing strategies by expected value. */
export function probGames(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const N = pick([100, 200, 500, 1000]);
    const prize = N * pick([0.2, 0.5, 0.25, 0.4]);
    const cost = pick([1, 2]);
    const ev = clean(prize / N - cost);
    return {
      key: `game-raffle-${N}-${prize}-${cost}`,
      prompt: `A $${cost} raffle ticket: 1 of ${N} wins $${prize}. Expected net gain?`,
      speech: `A raffle ticket costs ${cost} dollars. ${N} tickets are sold and one wins ${prize} dollars. What is the expected net gain per ticket, in dollars?`,
      visual: NONE,
      prefix: "$",
      ...choose(ev, [clean(prize / N), clean(-cost), clean(cost - prize / N)], 0.25),
      hint: "Expected winnings = prize × chance. Then subtract the cost.",
      explain: `${prize} × 1/${N} = $${ds(prize / N)}, minus $${cost} = $${ds(ev)}. On average you lose.`,
    };
  }
  if (kind === 1) {
    const sides = pick([4, 6, 8]);
    const win = rand(2, 12);
    const fair = sides - 1;
    const askFair = rand(0, 1) === 1;
    const ev = clean((win - (sides - 1)) / sides);
    return {
      key: `game-die-${sides}-${win}-${askFair}`,
      prompt: askFair ? `Roll a ${sides}-sided die: win $X on a ${sides}, pay $1 otherwise. X for a fair game?` : `Roll a ${sides}-sided die: win $${win} on a ${sides}, pay $1 otherwise. Expected value?`,
      speech: askFair
        ? `Roll a ${sides} sided die. If you roll a ${sides}, you win X dollars; otherwise you pay 1 dollar. What X makes the game fair?`
        : `Roll a ${sides} sided die. If you roll a ${sides}, you win ${win} dollars; otherwise you pay 1 dollar. What is your expected value per game, in dollars?`,
      visual: NONE,
      prefix: "$",
      ...(askFair ? keypad(fair) : choose(ev, [clean(win / sides), clean(-ev), clean((win - 1) / sides)], 0.25)),
      hint: "EV = (win amount) × P(win) − (loss) × P(lose). Fair means EV = 0.",
      explain: askFair ? `X × 1/${sides} − 1 × ${sides - 1}/${sides} = 0 gives X = ${fair}.` : `${win}/${sides} − ${sides - 1}/${sides} = ${ds(ev)}.`,
    };
  }
  if (kind === 2) {
    const pA = rand(3, 7);
    const vA = rand(6, 12);
    const pB = rand(pA + 1, 9);
    const vB = rand(3, vA - 1);
    const eA = clean((pA * vA) / 10);
    const eB = clean((pB * vB) / 10);
    if (eA === eB) return probGames();
    return {
      key: `game-strat-${pA}-${vA}-${pB}-${vB}`,
      prompt: `Shot A: ${pA * 10}% for ${vA} pts. Shot B: ${pB * 10}% for ${vB} pts. Better on average?`,
      speech: `Shot A goes in ${pA * 10} percent of the time and is worth ${vA} points. Shot B goes in ${pB * 10} percent of the time and is worth ${vB} points. Which has the higher expected value?`,
      visual: NONE,
      ...label(eA > eB ? "Shot A" : "Shot B", ["Shot A", "Shot B"]),
      hint: "Expected points = chance × points. Compare.",
      explain: `A: ${pA / 10} × ${vA} = ${eA}. B: ${pB / 10} × ${vB} = ${eB}. Shot ${eA > eB ? "A" : "B"} is better on average.`,
    };
  }
  const fee = pick([30, 40, 50, 60]);
  const repair = pick([150, 200, 250, 300]);
  const p = pick([10, 15, 20, 25, 30]);
  const exp = (repair * p) / 100;
  if (exp === fee) return probGames();
  return {
    key: `game-warr-${fee}-${repair}-${p}`,
    prompt: `Warranty: $${fee}. Repair costs $${repair} with a ${p}% chance. Cheaper on average?`,
    speech: `A warranty costs ${fee} dollars. Without it, there's a ${p} percent chance you'll need a ${repair} dollar repair. Which is cheaper on average?`,
    visual: NONE,
    ...label(exp < fee ? "Skip the warranty" : "Buy the warranty", ["Skip the warranty", "Buy the warranty"]),
    hint: "Expected repair cost = repair × chance. Compare with the warranty price.",
    explain: `Expected repair cost: ${repair} × ${p / 100} = $${exp}. ${exp < fee ? "Less than the warranty, so skipping is cheaper on average." : "More than the warranty, so buying is cheaper on average."}`,
  };
}

const FAIR: { m: string; fair: boolean }[] = [
  { m: "Draw names from a hat", fair: true },
  { m: "Pick whoever raises a hand first", fair: false },
  { m: "Roll a die: 1–3 for Ana, 4–6 for Ben", fair: true },
  { m: "Roll a die: 1–2 Ana, 3–4 Ben, 5–6 Cy", fair: true },
  { m: "Spin a 4-part spinner: 1 Ana, 2 Ben, 3–4 Cy", fair: false },
  { m: "Flip a coin twice: HH Ana, TT Ben, mixed Cy", fair: false },
  { m: "Use a random number generator, 1 to 3", fair: true },
  { m: "Let the oldest decide", fair: false },
];

/** HSS-MD.B.6, B.7 — make fair decisions and analyze decisions with probability. */
export function probDecisions(): Question {
  const kind = rand(0, 2);
  if (kind === 0) {
    const i = rand(0, FAIR.length - 1);
    return {
      key: `dec-fair-${i}`,
      prompt: `To choose who goes first: "${FAIR[i].m}." Is that fair?`,
      speech: `To choose who goes first: ${FAIR[i].m}. Is that a fair method?`,
      visual: NONE,
      ...yesNo(FAIR[i].fair),
      hint: "Fair means every person has the same chance.",
      explain: FAIR[i].fair ? "Yes: every person has an equal chance." : "No: the chances aren't equal.",
    };
  }
  if (kind === 1) {
    const prev = pick([1, 2, 5, 10]);
    const sens = pick([90, 95, 99]);
    const fp = pick([5, 10]);
    const sick = prev * 10;
    const tp = (sick * sens) / 100;
    const fpos = ((1000 - sick) * fp) / 100;
    const pct = Math.round((tp / (tp + fpos)) * 100);
    return {
      key: `dec-test-${prev}-${sens}-${fp}`,
      prompt: `${prev}% have a disease. The test catches ${sens}% of them, but ${fp}% of healthy people test positive. P(sick | positive)?`,
      speech: `${prev} percent of people have a disease. A test is positive for ${sens} percent of sick people, but also for ${fp} percent of healthy people. If you test positive, what is the chance you're sick, to the nearest percent? Picture 1000 people.`,
      visual: {
        kind: "table",
        header: ["Out of 1,000", "Test +", "Test −"],
        rows: [
          ["Sick", clean(tp), clean(sick - tp)],
          ["Healthy", clean(fpos), clean(1000 - sick - fpos)],
        ],
      },
      unit: "%",
      ...keypad(pct),
      hint: "Only look at the Test + column. What fraction of it is sick?",
      explain: `${clean(tp)} sick positives ÷ ${clean(tp + fpos)} positives ≈ ${pct}%. Most positives can be false when the disease is rare.`,
    };
  }
  const p2 = pick([40, 45, 50, 55]);
  const p1 = pick([90, 94, 96, 98]);
  const ev2 = (2 * p2) / 100;
  const ev1 = p1 / 100;
  return {
    key: `dec-2pt-${p2}-${p1}`,
    prompt: `After a touchdown: 1-pt kick works ${p1}%, 2-pt try works ${p2}%. Better on average?`,
    speech: `After a touchdown, a 1 point kick succeeds ${p1} percent of the time, and a 2 point try succeeds ${p2} percent of the time. Which gives more expected points?`,
    visual: NONE,
    ...label(ev2 > ev1 ? "Go for 2" : ev2 < ev1 ? "Kick for 1" : "They're equal", ["Go for 2", "Kick for 1", "They're equal"]),
    hint: "Expected points = points × chance.",
    explain: `Kick: 1 × ${ev1} = ${ev1}. Two-point: 2 × ${p2 / 100} = ${ev2}. ${ev2 > ev1 ? "Go for 2." : ev2 < ev1 ? "Kick." : "Same."}`,
  };
}
