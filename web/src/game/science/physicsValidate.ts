/**
 * Checks for physics pictures and activities, plus the small pieces of physics they share with the drawing
 * code (circuits, projectiles, lenses, Snell's law, levers). The level tests call physicsActivityProblems and
 * physicsVisualProblems on every generated question: an empty list means the data is fine.
 */
import type { CircuitLayout, CircuitPart, ForceArrow, PhysicsActivity, PhysicsVisual, StepRange } from "./physicsTypes";
import type { Mark } from "../types";

/* ================================================================ shared physics */

const EPS = 1e-6;
const rad = (d: number) => (d * Math.PI) / 180;

/** The values a StepRange can take, min to max. */
export function rangeValues(r: StepRange): number[] {
  const out: number[] = [];
  if (!(r.step > 0) || !(r.max >= r.min)) return out;
  const n = Math.round((r.max - r.min) / r.step);
  for (let i = 0; i <= n && i <= 1000; i++) out.push(Number((r.min + i * r.step).toFixed(9)));
  return out;
}

/** Is `v` one of the range's values? */
export function onGrid(r: StepRange, v: number): boolean {
  return rangeValues(r).some((x) => Math.abs(x - v) < EPS);
}

/** Where a slider starts: `start` if given, else the first value that isn't `avoid`. */
export function rangeStart(r: StepRange, avoid?: number): number {
  const vals = rangeValues(r);
  if (r.start !== undefined) return r.start;
  return vals.find((v) => avoid === undefined || Math.abs(v - avoid) > EPS) ?? vals[0] ?? r.min;
}

/** x and y parts of an arrow with direction `dir` (degrees) and length `size`. */
export function vec(dir: number, size: number) {
  const x = size * Math.cos(rad(dir));
  const y = size * Math.sin(rad(dir));
  return { x: Math.abs(x) < 1e-9 ? 0 : x, y: Math.abs(y) < 1e-9 ? 0 : y };
}

/** Sum of arrows. */
export function netForce(arrows: { dir: number; size: number }[]) {
  return arrows.reduce((s, a) => {
    const v = vec(a.dir, a.size);
    return { x: s.x + v.x, y: s.y + v.y };
  }, { x: 0, y: 0 });
}

/** Horizontal distance a projectile travels before hitting the ground. */
export function launchDistance(speed: number, angleDeg: number, g: number, height = 0): number {
  const vx = speed * Math.cos(rad(angleDeg));
  const vy = speed * Math.sin(rad(angleDeg));
  const t = (vy + Math.sqrt(vy * vy + 2 * g * height)) / g;
  return vx * t;
}

/** Thin lens / mirror equation: image distance (negative = virtual) and magnification. f > 0 converging/concave. */
export function lensImage(optic: "converging" | "diverging" | "concave" | "convex", focal: number, object: number) {
  const f = optic === "converging" || optic === "concave" ? focal : -focal;
  const di = 1 / (1 / f - 1 / object);
  return { f, di, m: -di / object };
}

/** Snell's law: refracted angle in degrees, or null when the ray is totally internally reflected. */
export function snell(angle: number, n1: number, n2: number): number | null {
  const s = (n1 / n2) * Math.sin(rad(angle));
  if (s > 1) return null;
  return (Math.asin(s) * 180) / Math.PI;
}

/* ---------------------------------------------------------------- circuits */

/** The rows of a circuit with the key prefix used for their parts: "t" top, "b" bottom, "r0", "r1"… branches. */
export function circuitRows(c: CircuitLayout): { key: string; parts: CircuitPart[] }[] {
  const rows = [{ key: "t", parts: c.top }];
  if (c.branches?.length) c.branches.forEach((parts, k) => rows.push({ key: `r${k}`, parts }));
  else rows.push({ key: "b", parts: c.bottom ?? [] });
  return rows;
}

/** Tap state for gaps (true = filled with wire) and switches (true = closed), by part key "t:2", "r1:0"… */
export type CircuitState = Record<string, boolean>;

const isLoad = (p: CircuitPart) => p.part === "resistor" || p.part === "bulb" || p.part === "motor";

/** Does this part let current through, given the tap state? */
export function conducts(p: CircuitPart, key: string, state: CircuitState = {}): boolean {
  switch (p.part) {
    case "gap":
      return state[key] ?? false;
    case "switch":
      return state[key] ?? p.closed;
    case "voltmeter":
    case "capacitor":
      return false;
    default:
      return true;
  }
}

/**
 * Which parts carry current. Returns the keys of the lit bulbs (and running motors), the rows with current,
 * and whether there's a short circuit (a loop with no bulb, resistor or motor in it). Cells must sit in the
 * top or bottom wire.
 */
export function circuitFlow(c: CircuitLayout, state: CircuitState = {}) {
  const rows = circuitRows(c);
  const ok = (r: { key: string; parts: CircuitPart[] }) => r.parts.every((p, i) => conducts(p, `${r.key}:${i}`, state));
  const lit = new Set<string>();
  const live = new Set<string>();
  const markLoads = (r: { key: string; parts: CircuitPart[] }) =>
    r.parts.forEach((p, i) => {
      if (p.part === "bulb" || p.part === "motor") lit.add(`${r.key}:${i}`);
    });
  let short = false;
  if (!c.branches?.length) {
    const hasCell = rows.some((r) => r.parts.some((p) => p.part === "cell"));
    const flowing = hasCell && rows.every(ok);
    if (flowing) {
      if (rows.some((r) => r.parts.some(isLoad))) {
        rows.forEach((r) => (live.add(r.key), markLoads(r)));
      } else short = true;
    }
    return { lit, live, short };
  }
  const top = rows[0];
  const branches = rows.slice(1);
  const topOk = top.parts.some((p) => p.part === "cell") && ok(top);
  const closed = branches.filter(ok);
  if (!topOk || !closed.length) return { lit, live, short };
  const shorts = closed.filter((r) => !r.parts.some(isLoad));
  const topLoad = top.parts.some(isLoad);
  if (shorts.length && !topLoad) return { lit, live, short: true };
  live.add(top.key);
  markLoads(top);
  for (const r of shorts.length ? shorts : closed) {
    live.add(r.key);
    markLoads(r);
  }
  return { lit, live, short: shorts.length > 0 };
}

/** Every bulb in a circuit with its key and name. */
export function circuitBulbs(c: CircuitLayout) {
  return circuitRows(c).flatMap((r) =>
    r.parts.flatMap((p, i) => (p.part === "bulb" ? [{ key: `${r.key}:${i}`, name: p.name ?? "" }] : [])),
  );
}

/** The tappable parts (gaps and switches) of a circuit, by key. */
export function circuitToggles(c: CircuitLayout) {
  return circuitRows(c).flatMap((r) => r.parts.flatMap((p, i) => (p.part === "gap" || p.part === "switch" ? [`${r.key}:${i}`] : [])));
}

/** The names of the lit bulbs for a tap state. */
export function litNames(c: CircuitLayout, state: CircuitState): string[] {
  const { lit } = circuitFlow(c, state);
  return circuitBulbs(c)
    .filter((b) => lit.has(b.key))
    .map((b) => b.name)
    .sort();
}

/** A tap state that lights exactly `want` (fewest changes from the start), or null if there is none. */
export function circuitSolution(c: CircuitLayout, want: string[]): CircuitState | null {
  const keys = circuitToggles(c);
  if (keys.length > 12) return null;
  const target = [...want].sort().join("|");
  const start = (k: string) => {
    const [row, i] = k.split(":");
    const p = circuitRows(c).find((r) => r.key === row)!.parts[Number(i)];
    return p.part === "switch" ? p.closed : false;
  };
  let best: CircuitState | null = null;
  let bestCost = Infinity;
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const state: CircuitState = {};
    let cost = 0;
    keys.forEach((k, j) => {
      state[k] = Boolean(mask & (1 << j));
      if (state[k] !== start(k)) cost++;
    });
    if (cost < bestCost && litNames(c, state).join("|") === target) {
      best = state;
      bestCost = cost;
    }
  }
  return best;
}

/** Ohm's-law readings for a circuit whose values are all numbers: current through each row, and V across parts. */
function circuitNumbers(c: CircuitLayout): { rowI: Record<string, number>; ok: boolean } {
  const rows = circuitRows(c);
  const { live, short } = circuitFlow(c);
  const fail = { rowI: {}, ok: false };
  if (short || !live.size) return fail;
  const val = (p: CircuitPart, unit: string) => {
    if (!("label" in p) || typeof p.label !== "number") return null;
    if ("unit" in p && p.unit && p.unit !== unit) return null;
    return p.label;
  };
  let V = 0;
  const R: Record<string, number> = {};
  for (const r of rows) {
    R[r.key] = 0;
    for (const p of r.parts) {
      if (p.part === "cell") {
        const v = val(p, "V");
        if (v === null) return fail;
        V += v;
      } else if (isLoad(p)) {
        const ohms = val(p, "Ω");
        if (ohms === null) return fail;
        R[r.key] += ohms;
      }
    }
  }
  const rowI: Record<string, number> = {};
  if (!c.branches?.length) {
    const total = R.t + R.b;
    if (!(total > 0)) return fail;
    rowI.t = rowI.b = V / total;
    return { rowI, ok: true };
  }
  const liveBranches = rows.slice(1).filter((r) => live.has(r.key));
  if (liveBranches.some((r) => !(R[r.key] > 0))) return fail;
  const Rp = 1 / liveBranches.reduce((s, r) => s + 1 / R[r.key], 0);
  const I = V / (R.t + Rp);
  rowI.t = I;
  for (const r of rows.slice(1)) rowI[r.key] = live.has(r.key) ? (I * Rp) / R[r.key] : 0;
  return { rowI, ok: true };
}

/* ---------------------------------------------------------------- levers */

/** Torque (Σ mass × distance) on each side of a seesaw. */
export function torques(items: { side: "left" | "right"; at: number; mass: number }[]) {
  let left = 0;
  let right = 0;
  for (const it of items) {
    if (it.side === "left") left += it.mass * it.at;
    else right += it.mass * it.at;
  }
  return { left, right };
}

/**
 * Fewest kid weights that balance a seesaw: counts per slot ("left:2" → 1), or null if it can't balance.
 * Only the lighter side gets weights (adding to the heavier side never helps).
 */
export function balanceSolution(a: Extract<PhysicsActivity, { kind: "phys-balance" }>): Record<string, number> | null {
  const { left, right } = torques(a.fixed);
  const need = Math.abs(left - right);
  if (need < EPS) return {};
  const side: "left" | "right" = left < right ? "left" : "right";
  const allowed = a.side ?? "both";
  if (allowed !== "both" && allowed !== side) return null;
  const per = a.perSlot ?? 4;
  // Unbounded-knapsack style search over slot counts, fewest weights first.
  let best: number[] | null = null;
  const counts = Array(a.slots).fill(0);
  const go = (slot: number, remaining: number, used: number) => {
    if (best && used >= best.reduce((s, x) => s + x, 0)) return;
    if (Math.abs(remaining) < EPS) {
      best = [...counts];
      return;
    }
    if (slot > a.slots || remaining < 0) return;
    for (let n = Math.min(per, Math.floor(remaining / (a.mass * slot) + EPS)); n >= 0; n--) {
      counts[slot - 1] = n;
      go(slot + 1, remaining - n * a.mass * slot, used + n);
    }
    counts[slot - 1] = 0;
  };
  go(1, need, 0);
  if (!best) return null;
  const out: Record<string, number> = {};
  (best as number[]).forEach((n, i) => {
    if (n) out[`${side}:${i + 1}`] = n;
  });
  return out;
}

/* ================================================================ checks */

const isNum = (m: Mark | undefined): m is number => typeof m === "number";
const close = (a: number, b: number, rel = 0.02) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));
const fin = (...xs: (number | undefined)[]) => xs.every((x) => x === undefined || Number.isFinite(x));

function forceProblems(fs: ForceArrow[], need: (ok: unknown, msg: string) => void) {
  fs.forEach((f, i) => {
    need(fin(f.dir, f.size), `force ${i + 1} has a non-number direction or size`);
    need(f.size >= 0, `force ${i + 1} has a negative size (flip its direction instead)`);
  });
}

/** Problems with a physics picture (e.g. labels that don't match); empty means it's fine. */
export function physicsVisualProblems(v: PhysicsVisual): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(`${v.kind}: ${msg}`);
  };
  switch (v.kind) {
    case "phys-forces":
      forceProblems(v.forces, need);
      if (v.incline !== undefined) {
        need(v.incline >= 5 && v.incline <= 60, "incline must be 5–60°");
        need(!isNum(v.inclineLabel) || close(v.inclineLabel, v.incline, 0.001), "inclineLabel doesn't match incline");
        need(v.surface === undefined || v.surface === "none", "use either incline or surface, not both");
      }
      if (v.motion) need(fin(v.motion.dir), "motion direction must be a number");
      break;
    case "phys-incline": {
      need(v.angle >= 5 && v.angle <= 60, "angle must be 5–60°");
      need(!isNum(v.angleLabel) || close(v.angleLabel, v.angle, 0.001), "angleLabel doesn't match angle");
      const s = Math.sin(rad(v.angle));
      const c = Math.cos(rad(v.angle));
      if (isNum(v.length) && isNum(v.height)) need(close(v.height, v.length * s), "height ≠ length × sin(angle)");
      if (isNum(v.length) && isNum(v.base)) need(close(v.base, v.length * c), "base ≠ length × cos(angle)");
      if (isNum(v.height) && isNum(v.base)) need(close(v.height, v.base * Math.tan(rad(v.angle))), "height ≠ base × tan(angle)");
      if (v.forces) forceProblems(v.forces, need);
      break;
    }
    case "phys-motion": {
      const t = v.track;
      need(t.max > t.min && t.step > 0, "track needs min < max and step > 0");
      need((t.max - t.min) / t.step <= 40, "too many ticks on the track (max 40)");
      need(v.rows.length >= 1 && v.rows.length <= 3, "use 1–3 rows");
      v.rows.forEach((r, i) => {
        need(r.positions.length >= 1 && r.positions.length <= 12, `row ${i + 1} needs 1–12 positions`);
        need(r.positions.every((x) => x >= t.min - EPS && x <= t.max + EPS), `row ${i + 1} has a position off the track`);
        need(!r.arrows || r.arrows.length === r.positions.length, `row ${i + 1} needs one arrow per position`);
      });
      if (v.finish !== undefined) need(v.finish >= t.min && v.finish <= t.max, "finish is off the track");
      if (v.span) need(v.span.from >= t.min && v.span.to <= t.max && v.span.from < v.span.to, "span must run left to right on the track");
      break;
    }
    case "phys-collision": {
      const carts = [...v.before, ...(v.after ?? [])];
      carts.forEach((c, i) => {
        need(!isNum(c.mass) || c.mass > 0, `cart ${i + 1} needs a positive mass`);
        need(!isNum(c.v) || c.v >= 0, `cart ${i + 1}: give the speed (≥ 0) in v and the direction with vSize`);
        if (isNum(c.v)) need((c.v === 0) === (c.vSize === 0), `cart ${i + 1}: v and vSize disagree about being at rest`);
      });
      const all = carts.every((c) => isNum(c.mass) && isNum(c.v));
      if (v.after && all) {
        const mom = (cs: typeof carts) => cs.reduce((s, c) => s + (c.mass as number) * (c.v as number) * Math.sign(c.vSize), 0);
        need(close(mom(v.before), mom(v.after), 0.01), "momentum before ≠ momentum after");
        if (v.after.length === 1) need(close((v.after[0].mass as number), (v.before[0].mass as number) + (v.before[1].mass as number), 0.001), "stuck-together mass ≠ sum of masses");
      }
      break;
    }
    case "phys-circuit":
      p.push(...circuitProblems(v, "phys-circuit"));
      break;
    case "phys-wave": {
      need(v.length > 0 && v.length <= 24, "length must be 1–24 units");
      need(v.waves.length >= 1 && v.waves.length <= 2, "use 1 or 2 waves");
      v.waves.forEach((w, i) => need(w.amplitude > 0 && w.wavelength > 0, `wave ${i + 1} needs amplitude > 0 and wavelength > 0`));
      const w0 = v.waves[0];
      if (w0 && v.wavelengthLabel !== undefined && v.wavelengthLabel !== null && v.form !== "standing")
        need((v.form === "longitudinal" ? 1.5 : 1.25) * w0.wavelength <= v.length + EPS, "the wavelength marker needs 1.25 wavelengths of room (1.5 for longitudinal)");
      if (w0 && v.wavelengthLabel !== undefined && v.wavelengthLabel !== null && v.form === "standing") need(w0.wavelength <= v.length + EPS, "the wavelength marker needs a whole wavelength of room");
      if (v.form === "standing")
        v.waves.forEach((w, i) => {
          const halves = v.length / (w.wavelength / 2);
          need(Math.abs(halves - Math.round(halves)) < 1e-6, `wave ${i + 1}: length must be a whole number of half wavelengths`);
        });
      break;
    }
    case "phys-rays":
      switch (v.scene) {
        case "mirror":
          need(v.angle >= 0 && v.angle <= 80, "angle must be 0–80°");
          need(!isNum(v.incident) || close(v.incident, v.angle, 0.001), "incident label doesn't match angle");
          need(!isNum(v.reflected) || close(v.reflected, v.angle, 0.001), "reflected angle must equal the incident angle");
          break;
        case "refraction": {
          need(v.n1 >= 1 && v.n2 >= 1, "refractive indices are at least 1");
          need(v.angle >= 0 && v.angle <= 85, "angle must be 0–85°");
          need(!isNum(v.incident) || close(v.incident, v.angle, 0.001), "incident label doesn't match angle");
          const r = snell(v.angle, v.n1, v.n2);
          if (r === null) need(v.refracted === undefined || v.refracted === null, "past the critical angle there's no refracted ray to label");
          else need(!isNum(v.refracted) || Math.abs(v.refracted - r) <= 1, `refracted label should be about ${r.toFixed(1)}°`);
          break;
        }
        case "lens": {
          need(v.focal > 0 && v.object > 0, "focal and object distances must be positive");
          need(Math.abs(v.object - v.focal) > 0.05 * v.focal, "the object can't sit at the focal point (no image)");
          const { di, m } = lensImage(v.optic, v.focal, v.object);
          need(Math.abs(di) <= 6 * Math.max(v.focal, v.object), "the image is too far away to draw; move the object");
          need(Math.abs(m) <= 5, "the image is too tall to draw (magnification over 5)");
          const L = v.labels ?? {};
          need(!isNum(L.f) || close(L.f, v.focal), "labels.f doesn't match focal");
          need(!isNum(L.object) || close(L.object, v.object), "labels.object doesn't match object");
          need(!isNum(L.image) || close(Math.abs(L.image), Math.abs(di)), `labels.image should be ${Math.abs(di).toFixed(2)}`);
          break;
        }
        default:
          break;
      }
      break;
    case "phys-magnets":
      if (v.scene === "bars") need(v.magnets.length >= 1 && v.magnets.length <= 2, "use 1 or 2 magnets");
      if (v.scene === "charges") {
        need(v.charges.length >= 1 && v.charges.length <= 4, "use 1–4 charges");
        v.charges.forEach((c, i) => {
          need(Math.abs(c.x) <= 4 && Math.abs(c.y) <= 4, `charge ${i + 1} is off the grid (−4…4)`);
          need(c.q === undefined || (c.q >= 1 && c.q <= 3), `charge ${i + 1}: q must be 1–3`);
        });
        for (let i = 0; i < v.charges.length; i++)
          for (let j = i + 1; j < v.charges.length; j++)
            need(Math.hypot(v.charges[i].x - v.charges[j].x, v.charges[i].y - v.charges[j].y) >= 1, "charges must be at least 1 apart");
        need(!v.forceLabels || v.forceLabels.length === v.charges.length, "one force label per charge");
        need(v.distance === undefined || v.charges.length >= 2, "distance needs two charges");
      }
      break;
    case "phys-energy": {
      need(v.bars || v.chain, "give bars, a chain, or both");
      if (v.bars) {
        const names = v.names ?? [];
        const max = v.max ?? 0;
        need(names.length >= 1 && names.length <= 5, "bars need 1–5 names");
        need(max > 0, "bars need max > 0");
        need(v.bars.length >= 1 && v.bars.length <= 3, "use 1–3 bar charts");
        v.bars.forEach((b) => {
          need(b.values.length === names.length, `"${b.title}" needs one value per name`);
          need(b.values.every((x) => x === "?" || (x >= 0 && x <= max)), `"${b.title}" has a value outside 0–max`);
        });
      }
      if (v.chain) {
        need(v.chain.length >= 2 && v.chain.length <= 5, "a chain needs 2–5 steps");
        need(v.chain.slice(0, -1).every((s) => !Array.isArray(s)), "only the last step may branch");
        const last = v.chain[v.chain.length - 1];
        if (Array.isArray(last)) need(last.length >= 1 && last.length <= 3, "the last step can branch into 1–3 outputs");
      }
      break;
    }
    case "phys-oscillator":
      if (v.type === "spring") need(v.displacement >= -1 && v.displacement <= 1, "displacement must be −1…1");
      else {
        need(v.angle >= -60 && v.angle <= 60, "angle must be −60…60°");
        need(!isNum(v.angleLabel) || close(v.angleLabel, Math.abs(v.angle), 0.001), "angleLabel doesn't match angle");
      }
      break;
    case "phys-fluid":
      if (v.scene === "float") {
        need(v.objects.length >= 1 && v.objects.length <= 3, "use 1–3 objects");
        v.objects.forEach((o, i) => {
          need(o.submerged >= 0 && o.submerged <= 1, `object ${i + 1}: submerged must be 0–1`);
          need(!o.sunk || o.submerged === 1, `object ${i + 1}: a sunk object is fully submerged`);
          need(o.size === undefined || (o.size >= 0.6 && o.size <= 1.4), `object ${i + 1}: size must be 0.6–1.4`);
        });
      } else if (v.scene === "pressure") {
        need(v.points.length >= 1 && v.points.length <= 4, "use 1–4 points");
        need(v.points.every((d) => d.depth > 0 && d.depth <= 1), "depths must be 0–1");
      } else {
        need(v.widths[0] > 0 && v.widths[1] > 0, "pipe widths must be positive");
        const [a1, a2] = v.area ?? [null, null];
        const [v1, v2] = v.v ?? [null, null];
        if (isNum(a1) && isNum(a2) && isNum(v1) && isNum(v2)) need(close(a1 * v1, a2 * v2), "A₁v₁ ≠ A₂v₂ (continuity)");
        if (isNum(v1) && isNum(v2)) need((v1 < v2) === (v.widths[0] > v.widths[1]) || v1 === v2, "the narrow part must be the faster one");
      }
      break;
    case "phys-thermo":
      if (v.scene === "thermometer") {
        need(v.max > v.min && v.step > 0, "need min < max and step > 0");
        need((v.max - v.min) / v.step <= 60, "too many ticks (max 60)");
        need(v.thermometers.length >= 1 && v.thermometers.length <= 3, "use 1–3 thermometers");
        v.thermometers.forEach((t, i) => {
          need(t.temp >= v.min && t.temp <= v.max, `thermometer ${i + 1} reads off the scale`);
          need(!isNum(t.reading) || close(t.reading, t.temp, 0.001), `thermometer ${i + 1}: reading doesn't match temp`);
        });
      } else if (v.scene === "flow") {
        need(!isNum(v.a.label) || v.a.label === v.a.temp, "a.label doesn't match a.temp");
        need(!isNum(v.b.label) || v.b.label === v.b.temp, "b.label doesn't match b.temp");
      } else {
        need(v.volume >= 0.2 && v.volume <= 1, "volume must be 0.2–1");
        need(v.particles === undefined || (v.particles >= 1 && v.particles <= 40), "particles must be 1–40");
      }
      break;
    case "phys-orbit":
      if (v.scene === "orbit") need(v.ecc === undefined || (v.ecc >= 0 && v.ecc <= 0.6), "ecc must be 0–0.6");
      else need(v.masses.every((m) => m.size === undefined || (m.size >= 0.5 && m.size <= 2)), "sizes must be 0.5–2");
      break;
    case "phys-sound":
      if (v.scene === "vibrate") need(v.rings === undefined || (v.rings >= 1 && v.rings <= 4), "rings must be 1–4");
      break;
  }
  return p;
}

/** Layout checks shared by the circuit picture and the build-a-circuit activity. */
function circuitProblems(c: CircuitLayout, kind: string): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(`${kind}: ${msg}`);
  };
  need(c.top.length <= 5 && (c.bottom ?? []).length <= 5, "keep rows to 5 parts or fewer");
  if (c.branches?.length) {
    need(c.branches.length >= 2 && c.branches.length <= 4, "use 2–4 branches");
    need(c.branches.every((b) => b.length <= 4), "keep branches to 4 parts or fewer");
    need(c.branches.every((b) => !b.some((x) => x.part === "cell")), "cells go in top, not in a branch");
    need(!c.bottom?.length, "bottom is ignored when there are branches; put those parts in the last branch");
  }
  const cells = circuitRows(c).flatMap((r) => r.parts.filter((x) => x.part === "cell"));
  need(cells.length >= 1, "a circuit needs a cell");
  cells.forEach((x) => need(x.part !== "cell" || x.cells === undefined || (x.cells >= 1 && x.cells <= 3), "cells must be 1–3"));
  const names = circuitBulbs(c).map((b) => b.name).filter(Boolean);
  need(new Set(names).size === names.length, "bulb names must be different");
  // Readings that are numbers must agree with Ohm's law when every value is known.
  const { rowI, ok } = circuitNumbers(c);
  if (ok) {
    for (const r of circuitRows(c)) {
      r.parts.forEach((x, i) => {
        const I = rowI[r.key] ?? 0;
        if (x.part === "ammeter" && isNum(x.label) && (!x.unit || x.unit === "A"))
          need(close(x.label, I), `ammeter at ${r.key}:${i} should read ${+I.toFixed(3)} A`);
        if ("across" in x && isNum(x.across) && isLoad(x) && "label" in x && isNum(x.label))
          need(close(x.across, I * x.label), `voltmeter across ${r.key}:${i} should read ${+(I * x.label).toFixed(3)} V`);
      });
    }
  }
  return p;
}

/** Problems with a physics activity (e.g. a target that can't be reached); empty means it's fine. */
export function physicsActivityProblems(a: PhysicsActivity): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => {
    if (!ok) p.push(`${a.kind}: ${msg}`);
  };
  switch (a.kind) {
    case "phys-pushpull": {
      need(a.length > 0 && a.length <= 20, "length must be 1–20");
      need(a.start >= 0 && a.start <= a.length, "start is off the track");
      need(a.strengths.length >= 1 && a.strengths.length <= 4 && a.strengths.every((s) => s > 0), "give 1–4 positive strengths");
      need(new Set(a.strengths).size === a.strengths.length, "strengths must be different");
      need(!a.strengthNames || a.strengthNames.length === a.strengths.length, "one name per strength");
      need(a.strengthNames || a.strengths.length <= 3, "give strengthNames when there are more than 3 strengths");
      if (a.target === "stop") {
        const r = a.rolling ?? 0;
        need(r !== 0, "a 'stop' goal needs the object rolling (rolling ≠ 0)");
        need(a.strengths.some((s) => Math.abs(s - Math.abs(r)) < EPS), "no strength exactly cancels the rolling");
        need(a.start + r >= 0 && a.start + r <= a.length, "the rolling object would leave the track");
      } else {
        const t = a.target;
        need(t >= 0 && t <= a.length && Math.abs(t - a.start) > EPS, "target must be on the track and not at the start");
        need(a.strengths.some((s) => Math.abs(a.start + s - t) < EPS || Math.abs(a.start - s - t) < EPS), "no push reaches the target exactly");
        need(!a.rolling, "rolling is only for the 'stop' goal");
      }
      break;
    }
    case "phys-forceArrows": {
      const step = 360 / a.directions;
      const onDir = (d: number) => Math.abs(((d % step) + step) % step) < EPS || Math.abs((((d % step) + step) % step) - step) < EPS;
      need([4, 8, 16].includes(a.directions), "directions must be 4, 8 or 16");
      need(Number.isInteger(a.maxSize) && a.maxSize >= 1 && a.maxSize <= 6, "maxSize must be 1–6");
      need(a.arrows.length >= 1 && a.arrows.length <= 3, "give the kid 1–3 arrows");
      a.arrows.forEach((ar, i) => {
        need(onDir(ar.answer.dir) && Number.isInteger(ar.answer.size) && ar.answer.size >= 0 && ar.answer.size <= a.maxSize, `arrow ${i + 1}: answer isn't on the snapping grid`);
        need(ar.dir === undefined || onDir(ar.dir), `arrow ${i + 1}: start dir isn't one of the directions`);
        need(ar.size === undefined || (Number.isInteger(ar.size) && ar.size >= 0 && ar.size <= a.maxSize), `arrow ${i + 1}: start size out of range`);
      });
      (a.given ?? []).forEach((g, i) => need(g.size > 0 && g.size <= a.maxSize, `given arrow ${i + 1}: size must be 1–maxSize`));
      const correct = (kid: { dir: number; size: number }[]) => {
        if (a.check === "exact")
          return kid.every((k, i) => {
            const ans = a.arrows[i].answer;
            if (ans.size === 0) return k.size === 0;
            return k.size === ans.size && Math.abs((((k.dir - ans.dir) % 360) + 360) % 360) < EPS;
          });
        const n = netForce([...(a.given ?? []), ...kid]);
        const want = a.net ?? { x: 0, y: 0 };
        return Math.abs(n.x - want.x) < 1e-6 && Math.abs(n.y - want.y) < 1e-6;
      };
      need(correct(a.arrows.map((x) => x.answer)), "the answer arrows don't meet the goal");
      need(!correct(a.arrows.map((x) => ({ dir: x.dir ?? 0, size: x.size ?? 0 }))), "it's already right at the start");
      break;
    }
    case "phys-buildCircuit": {
      p.push(...circuitProblems(a, a.kind));
      const bulbs = circuitBulbs(a);
      need(bulbs.length >= 1 && bulbs.every((b) => b.name), "every bulb needs a name");
      need(a.lit.every((n) => bulbs.some((b) => b.name === n)), "lit names a bulb that isn't there");
      need(circuitToggles(a).length >= 1 && circuitToggles(a).length <= 12, "give 1–12 gaps or switches to tap");
      need(circuitSolution(a, a.lit), "no way to light exactly those bulbs");
      need(litNames(a, {}).join("|") !== [...a.lit].sort().join("|"), "it's already right at the start");
      break;
    }
    case "phys-launch": {
      need(a.g > 0 && (a.height ?? 0) >= 0, "need g > 0 and height ≥ 0");
      need(a.width > 0 && a.target > 0 && a.target <= a.width, "target must be on the ground (0–width)");
      need(a.tolerance > 0 && a.tolerance < a.width / 4, "tolerance must be positive and small");
      const angles = typeof a.angle === "number" ? [a.angle] : rangeValues(a.angle);
      const speeds = typeof a.speed === "number" ? [a.speed] : rangeValues(a.speed);
      need(typeof a.angle !== "number" || typeof a.speed !== "number", "give a slider for angle, speed or both");
      need(angles.length && angles.every((x) => x >= 0 && x <= 85), "angles must be 0–85°");
      need(speeds.length && speeds.every((x) => x > 0), "speeds must be positive");
      if (typeof a.angle !== "number" && a.angle.start !== undefined) need(onGrid(a.angle, a.angle.start), "angle start isn't on the slider");
      if (typeof a.speed !== "number" && a.speed.start !== undefined) need(onGrid(a.speed, a.speed.start), "speed start isn't on the slider");
      const hits = angles.flatMap((ang) => speeds.map((s) => launchDistance(s, ang, a.g, a.height ?? 0))).filter((d) => Math.abs(d - a.target) <= a.tolerance);
      need(hits.length > 0, "no slider setting lands on the target");
      break;
    }
    case "phys-balance": {
      need(Number.isInteger(a.slots) && a.slots >= 1 && a.slots <= 6, "slots must be 1–6");
      need(a.mass > 0, "mass must be positive");
      need(a.fixed.every((f) => Number.isInteger(f.at) && f.at >= 1 && f.at <= a.slots && f.mass > 0), "fixed weights need a slot 1–slots and a positive mass");
      const { left, right } = torques(a.fixed);
      need(Math.abs(left - right) > EPS, "it's already balanced at the start");
      need(balanceSolution(a), "no way to balance it with the weights allowed");
      break;
    }
    case "phys-matchWave": {
      need(a.amplitude || a.wavelength || a.frequency, "give at least one slider");
      need(!(a.wavelength && a.frequency), "use a wavelength slider or a frequency slider, not both");
      need(!a.frequency || (a.speed ?? 0) > 0, "a frequency slider needs speed");
      need(a.target.amplitude > 0 && a.target.wavelength > 0, "target amplitude and wavelength must be positive");
      if (a.amplitude) need(onGrid(a.amplitude, a.target.amplitude), "target amplitude isn't on the slider steps");
      if (a.wavelength) need(onGrid(a.wavelength, a.target.wavelength), "target wavelength isn't on the slider steps");
      if (a.frequency && a.speed) need(onGrid(a.frequency, a.speed / a.target.wavelength), "target frequency (speed ÷ wavelength) isn't on the slider steps");
      need(a.length > 0 && a.length <= 24, "length must be 1–24");
      const maxA = Math.max(a.target.amplitude, a.amplitude?.max ?? 0);
      need(maxA <= a.length / 2, "amplitude is too big for the grid");
      if (a.frequency && a.speed) need(rangeValues(a.frequency).every((f) => f > 0), "frequencies must be positive");
      break;
    }
    case "phys-material": {
      const effect = { transparent: "pass", translucent: "dim", opaque: "block", mirror: "reflect" } as const;
      need(a.materials.length >= 2 && a.materials.length <= 6, "give 2–6 materials");
      need(new Set(a.materials.map((m) => m.name)).size === a.materials.length, "material names must be different");
      need(a.materials.some((m) => effect[m.type] === a.want), `no material will ${a.want} the light`);
      need(a.materials.some((m) => effect[m.type] !== a.want), "every material works; add one that doesn't");
      break;
    }
    case "phys-magnet":
      if (a.mode === "arrange") {
        const [l, r] = a.start ?? ["NS", "NS"];
        const attract = l[1] !== r[0];
        need((a.want === "attract") !== attract, "it's already right at the start");
      } else {
        need(a.items.length >= 2 && a.items.length <= 8, "give 2–8 items");
        need(a.items.some((i) => i.magnetic) && a.items.some((i) => !i.magnetic), "include magnetic and non-magnetic items");
      }
      break;
  }
  return p;
}
