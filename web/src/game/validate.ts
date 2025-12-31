import { chemistryActivityProblems, chemistryVisualProblems } from "./science/chemistryValidate";
import type { ChemistryActivity, ChemistryVisual } from "./science/chemistryTypes";
import { physicsActivityProblems, physicsVisualProblems } from "./science/physicsValidate";
import type { PhysicsActivity, PhysicsVisual } from "./science/physicsTypes";
/**
 * Checks that generated questions are correct and playable. Used by the tests;
 * every level in every world must pass.
 */
import { buildLesson } from "./questions";
import type { Activity, Question, Token, Visual, World } from "./types";

const OPS: Record<string, string> = { "+": "+", "−": "-", "×": "*", "÷": "/", "(": "(", ")": ")", of: "*", ":": "/" };

function term(t: Token, x: number): string | null {
  if (typeof t === "number") return `(${t})`;
  if (typeof t === "string") {
    if (t === "?" || t === "x") return `(${x})`;
    if (t === "%") return "/100";
    return OPS[t] ?? null;
  }
  if ("pow" in t) return `(${t.pow[0]}**${t.pow[1]})`;
  if ("x" in t) return `(${t.x}*${x})`;
  const v = (p: number | "?") => (p === "?" ? x : p);
  return `(${t.w !== undefined ? `${v(t.w)}+` : ""}${v(t.n)}/${v(t.d)})`;
}

function evaluate(tokens: Token[], x: number): number | null {
  const parts = tokens.map((t) => term(t, x));
  if (parts.some((p) => p === null)) return null;
  try {
    return Function(`"use strict"; return (${parts.join(" ")});`)() as number;
  } catch {
    return null;
  }
}

/** Does the equation hold when the answer goes in the blank (or in for x)? null = can't tell. */
export function equationHolds(q: Question): boolean | null {
  const eq = q.equation;
  if (!eq || q.labels) return null;
  if (eq.some((t) => t === "<" || t === ">")) return null;
  const eqAt = eq.indexOf("=");
  if (eqAt < 0 || eq.lastIndexOf("=") !== eqAt) return null;
  const hasBlank = eq.some((t) => t === "?" || (typeof t === "object" && ("x" in t || ("n" in t && [t.n, t.d, t.w].includes("?")))));
  const hasX = eq.some((t) => t === "x" || (typeof t === "object" && "x" in t));
  if (!hasBlank && !hasX) return null;
  const left = evaluate(eq.slice(0, eqAt), q.answer);
  const right = evaluate(eq.slice(eqAt + 1), q.answer);
  if (left === null || right === null || !Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(right));
}

/** For counting models, the amount the picture shows. undefined = this picture doesn't encode the answer. */
export function visualAmount(q: Question): number | undefined {
  const v: Visual = q.visual;
  switch (v.kind) {
    case "objects":
      return v.count;
    case "add":
      return v.a + v.b;
    case "takeaway":
      return v.total - v.gone;
    case "rows":
      return v.top - v.bottom;
    case "compare":
      return Math.max(v.left, v.right);
    case "groups":
      return (v.highlight ?? v.groups) * v.each;
    case "share":
      return v.each;
    case "array":
      return q.equation?.includes("÷") ? undefined : v.rows * v.cols;
    case "tenframe": {
      const count = (k: string) => v.cells.filter((c) => c === k).length;
      if (count("target")) return count("target");
      if (count("gone")) return count("a");
      return count("a") + count("b");
    }
    case "blocks":
      return v.joiner === "vs" ? undefined : v.numbers.reduce((s, n) => s + n, 0) - (v.goneTens ?? 0) * 10;
    case "sequence":
      return v.next;
    case "fractions": {
      const first = v.bars[0];
      const last = v.bars[v.bars.length - 1];
      if (first?.b !== undefined) return (first.a ?? 0) + first.b;
      if (last?.target !== undefined) return last.target;
      return undefined;
    }
    case "numberline":
      return v.to;
    case "area":
      return (v.tens + v.ones) * v.by;
    case "hundred":
      return v.ask;
    default:
      return undefined;
  }
}

const onStep = (v: number, start: number, step: number) => Math.abs((v - start) / step - Math.round((v - start) / step)) < 1e-6;

/** Can `cents` be made from these coin values? */
function reachable(cents: number, coins: number[]): boolean {
  const ok = Array<boolean>(cents + 1).fill(false);
  ok[0] = true;
  for (let c = 1; c <= cents; c++) ok[c] = coins.some((coin) => coin <= c && ok[c - coin]);
  return ok[cents];
}

/** Lines of symmetry of a polygon: each through the centre of its corners, with direction (dx, dy). */
export function symmetryLines(points: { x: number; y: number }[]) {
  const n = points.length;
  const cx = points.reduce((t, p) => t + p.x, 0) / n;
  const cy = points.reduce((t, p) => t + p.y, 0) / n;
  const key = (p: { x: number; y: number }) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
  const corners = new Set(points.map(key));
  // Any symmetry axis passes through the centre and either a corner, an edge midpoint, or is perpendicular to an edge.
  const candidates: [number, number][] = [];
  points.forEach((p, i) => {
    candidates.push([p.x - cx, p.y - cy]);
    points.slice(i + 1).forEach((q) => {
      candidates.push([(p.x + q.x) / 2 - cx, (p.y + q.y) / 2 - cy]);
      candidates.push([-(q.y - p.y), q.x - p.x]);
    });
  });
  const out: { dx: number; dy: number; cx: number; cy: number }[] = [];
  const seen = new Set<number>();
  for (const [vx0, vy0] of candidates) {
    const len = Math.hypot(vx0, vy0);
    if (len < 1e-9) continue;
    const ux = vx0 / len;
    const uy = vy0 / len;
    const angle = Math.round(((Math.atan2(uy, ux) + Math.PI) % Math.PI) * 1e4);
    if (seen.has(angle)) continue;
    seen.add(angle);
    const ok = points.every((p) => {
      const vx = p.x - cx;
      const vy = p.y - cy;
      const d = vx * ux + vy * uy;
      return corners.has(key({ x: cx + 2 * d * ux - vx, y: cy + 2 * d * uy - vy }));
    });
    if (ok) out.push({ dx: ux, dy: uy, cx, cy });
  }
  return out;
}

/** Problems with one hands-on activity. */
export function activityProblems(a: Activity): string[] {
  if (a.kind.startsWith("phys-")) return physicsActivityProblems(a as PhysicsActivity);
  if (a.kind.startsWith("chem-")) return chemistryActivityProblems(a as ChemistryActivity);
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(`${a.kind}: ${msg}`);
  };
  const int = Number.isInteger;
  switch (a.kind) {
    case "fillFrame":
      need(int(a.target) && a.target >= 0 && a.target <= a.frames * 10, "target must fit in the frames");
      break;
    case "buildBlocks":
      need(int(a.target) && a.target > 0 && a.target <= 999, "target must be 1–999");
      break;
    case "makeMoney":
      need(int(a.cents) && a.cents > 0 && a.cents <= 2000, "cents must be 1–2000");
      need(a.coins.length && a.coins.every((c) => [1, 5, 10, 25, 100, 500].includes(c)), "coins must be 1, 5, 10, 25, 100 or 500");
      need(reachable(a.cents, a.coins), "the amount can't be made from these coins");
      break;
    case "setClock":
      need(int(a.h) && a.h >= 1 && a.h <= 12 && int(a.m) && a.m >= 0 && a.m < 60, "time must be 1:00–12:59");
      need(a.m % a.snap === 0, "minutes must land on the snap");
      break;
    case "placeOnLine":
      need(a.min < a.max && a.target >= a.min - 1e-9 && a.target <= a.max + 1e-9, "target must be on the line");
      need(onStep(a.target, a.min, a.step), "target must land on a step");
      need(onStep(a.labelStep, 0, a.step), "labelStep must be a multiple of step");
      need((a.max - a.min) / a.step <= 100, "too many steps");
      break;
    case "makeLength":
      need(a.length > 0 && a.length <= 15 && int(a.length * a.sub), "length must be on the ruler's marks (≤ 15)");
      break;
    case "plotPoints": {
      const lo = a.quadrants === 4 ? -a.size : 0;
      need(a.points.length >= 1 && a.points.length <= 4, "1–4 points");
      need(a.points.every((pt) => int(pt.x) && int(pt.y) && pt.x >= lo && pt.x <= a.size && pt.y >= lo && pt.y <= a.size), "points must be grid points on the grid");
      need(new Set(a.points.map((pt) => `${pt.x},${pt.y}`)).size === a.points.length, "points must differ");
      break;
    }
    case "makeAngle":
      need(a.degrees >= 5 && a.degrees <= 180 && a.degrees % 5 === 0, "degrees must be 5–180 in steps of 5");
      break;
    case "shade":
      need(int(a.parts) && a.parts >= 1 && a.parts <= 12 && int(a.target) && a.target >= 0 && a.target <= a.parts, "target must be 0–parts, parts 1–12");
      break;
    case "cut":
      need(
        (a.parts !== undefined && int(a.parts) && a.parts >= 2 && a.parts <= 12) ||
          (a.rows !== undefined && a.cols !== undefined && a.rows >= 1 && a.rows <= 6 && a.cols >= 1 && a.cols <= 6),
        "needs parts 2–12, or rows and cols 1–6",
      );
      break;
    case "barGraph":
      need(a.items.length >= 2 && a.items.length <= 6, "2–6 bars");
      need(a.items.every((it) => it.value >= 0 && it.value <= a.max && onStep(it.value, 0, a.step)), "values must be steps between 0 and max");
      need(a.max / a.step <= 20, "too many steps");
      break;
    case "dotPlot":
      need(a.values.length >= 3 && a.values.length <= 20, "3–20 values");
      need(a.values.every((v) => v >= a.min && v <= a.max && onStep(v, a.min, a.step)), "values must be on the plot's steps");
      need((a.max - a.min) / a.step <= 12, "too many columns");
      break;
    case "sort":
      need(a.bins.length >= 2 && a.bins.length <= 4, "2–4 bins");
      need(a.items.length >= 3 && a.items.length <= 10, "3–10 items");
      need(a.items.every((it) => int(it.bin) && it.bin >= 0 && it.bin < a.bins.length), "every item needs a valid bin");
      break;
    case "order":
      need(a.items.length >= 3 && a.items.length <= 6 && new Set(a.items).size === a.items.length, "3–6 different items");
      break;
    case "drawShape":
      need(a.sides >= 3 && a.sides <= 8, "3–8 sides");
      need(a.size >= 4 && a.size <= 10, "grid size 4–10");
      need(a.area === undefined || (a.area > 0 && a.area <= a.size * a.size), "area must fit on the grid");
      need(a.perimeter === undefined || (a.perimeter > 0 && a.perimeter <= a.size * 4), "perimeter must fit on the grid");
      break;
    case "buildArray":
      need(int(a.rows) && int(a.cols) && a.rows >= 1 && a.rows <= 10 && a.cols >= 1 && a.cols <= 10, "rows and cols 1–10");
      break;
    case "trace":
      need(/^\d{1,3}$/.test(a.text), "text must be 1–3 digits");
      break;
    case "drawFigure":
      need(a.size >= 4 && a.size <= 10, "grid size 4–10");
      break;
    case "symmetryLine": {
      need(a.points.length >= 3 && a.points.every((pt) => pt.x >= 0 && pt.y >= 0 && pt.x <= a.size && pt.y <= a.size), "3+ corners on the grid");
      need(symmetryLines(a.points).length > 0, "the shape has no line of symmetry");
      break;
    }
    case "drawLine": {
      const lo = a.quadrants === 4 ? -a.size : 0;
      let lattice = 0;
      for (let x = lo; x <= a.size; x++) {
        const y = a.m * x + a.b;
        if (Math.abs(y - Math.round(y)) < 1e-9 && y >= lo && y <= a.size) lattice++;
      }
      need(lattice >= 2, "the line must pass through at least 2 grid points");
      break;
    }
  }
  return p;
}

/** Problems with one question; empty means it's fine. */
export function questionProblems(q: Question): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(msg);
  };
  need(q.key, "missing key");
  need(q.prompt && q.speech && q.hint && q.explain, "missing prompt, speech, hint or explain");
  need(Number.isFinite(q.answer), "answer is not a number");

  if (q.input === "choices") {
    const c = q.choices ?? [];
    need(c.length >= 2 && c.length <= 6, `needs 2–6 choices, has ${c.length}`);
    need(new Set(c).size === c.length, "duplicate choices");
    need(c.includes(q.answer), "answer missing from choices");
    if (q.labels) {
      need(q.labels.length === c.length, "labels and choices differ in length");
      need(new Set(q.labels).size === q.labels.length, "duplicate labels");
      need(
        c.every((id) => Number.isInteger(id) && id >= 0 && id < q.labels!.length),
        "with labels, choices must be label indexes",
      );
    }
  }
  if (q.input === "keypad") {
    need(!q.labels, "keypad questions can't use labels");
    need(q.answer >= 0 || q.keypadExtra === "−", "negative answer needs keypadExtra '−'");
    need(Number.isInteger(q.answer) || q.keypadExtra === ".", "decimal answer needs keypadExtra '.'");
    need(String(Math.abs(q.answer)).replace(".", "").length <= 7, "answer too long to type");
  }
  if (q.input === "compare") need(q.visual.kind === "compare", "compare input needs a compare visual");
  if (q.input === "activity") {
    need(q.activity, "activity input needs an activity");
    if (q.activity) p.push(...activityProblems(q.activity));
  }
  if (q.needsVisual) need(q.visual.kind !== "none", "needsVisual set but there is no visual");
  if (q.visual.kind.startsWith("phys-")) p.push(...physicsVisualProblems(q.visual as PhysicsVisual));
  if (q.visual.kind.startsWith("chem-")) p.push(...chemistryVisualProblems(q.visual as ChemistryVisual));

  const holds = equationHolds(q);
  need(holds !== false, `equation doesn't hold for answer ${q.answer}`);

  if (!q.labels && q.input !== "activity") {
    const shown = visualAmount(q);
    need(shown === undefined || Math.abs(shown - q.answer) < 1e-9, `picture shows ${shown}, answer is ${q.answer}`);
  }
  return p;
}

const STANDARD =
  /^((K|[1-8])\.[A-Z]{1,3}(\.[A-Z])?\.\d+(\.?[a-e])?|HS[NAFGS]-[A-Z]{1,3}\.[A-D]\.\d+[a-e]?|CALC\.\d+\.\d+|(K|[1-5]|MS|HS)-PS[1-4]-\d+|PHYS\.\d+\.\d+|CHEM\.\d+\.\d+)$/;
const COLOURS = ["sun", "leaf", "berry", "wave", "grape", "teal", "cocoa", "rose", "lime", "night", "tangerine"];
const HATS = ["none", "bow", "party", "crown", "hardhat", "chef", "glasses", "gradcap", "cap", "wizard"];

/** Problems across worlds: shape of the world data and every level's questions. */
export function worldProblems(worlds: World[], samples = 300): string[] {
  const p: string[] = [];
  const ids = new Set<string>();
  for (const w of worlds) {
    const at = `world ${w.id}`;
    if (!w.name) p.push(`${at}: missing name`);
    if (!(w.ages[0] >= 3 && w.ages[0] <= w.ages[1] && w.ages[1] <= 18)) p.push(`${at}: bad ages`);
    if (!COLOURS.includes(w.color)) p.push(`${at}: unknown colour ${w.color}`);
    if (!HATS.includes(w.hat)) p.push(`${at}: unknown hat ${w.hat}`);
    if (!w.symbol || w.symbol.length > 4) p.push(`${at}: symbol must be 1–4 characters`);
    if (w.scenery.length < 3) p.push(`${at}: needs at least 3 scenery emoji`);
    if (w.levels.length < 9) p.push(`${at}: needs at least 9 lessons (has ${w.levels.length})`);
    for (const level of w.levels) {
      const lat = `${at} / ${level.id}`;
      if (ids.has(level.id)) p.push(`${lat}: duplicate level id`);
      ids.add(level.id);
      if (!level.standards.length) p.push(`${lat}: no standards`);
      level.standards.filter((s) => !STANDARD.test(s)).forEach((s) => p.push(`${lat}: odd standard code ${s}`));

      const keys = new Set<string>();
      for (let i = 0; i < samples; i++) {
        let q: Question;
        try {
          q = level.make();
        } catch (e) {
          p.push(`${lat}: generator threw ${(e as Error).message}`);
          break;
        }
        keys.add(q.key);
        const issues = questionProblems(q);
        if (issues.length) {
          p.push(`${lat}: ${q.key}: ${issues.join("; ")}`);
          break;
        }
      }
      if (keys.size < 12) p.push(`${lat}: only ${keys.size} different questions (need 12+ so lessons don't repeat)`);
      const lesson = buildLesson(level.make, 10);
      if (lesson.length < 10) p.push(`${lat}: could only build ${lesson.length} of 10 questions`);
    }
  }
  return p;
}
