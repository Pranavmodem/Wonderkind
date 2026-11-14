import { describe, expect, it } from "vitest";
import { PHYSICS_ACTIVITIES, PHYSICS_VISUALS } from "../../../dev/physicsSamples";
import type { PhysicsActivity, PhysicsVisual } from "../../../game/science/physicsTypes";
import {
  balanceSolution,
  circuitFlow,
  circuitSolution,
  launchDistance,
  lensImage,
  litNames,
  physicsActivityProblems,
  physicsVisualProblems,
  snell,
} from "../../../game/science/physicsValidate";

const VISUAL_KINDS = [
  "phys-forces",
  "phys-incline",
  "phys-motion",
  "phys-collision",
  "phys-circuit",
  "phys-wave",
  "phys-rays",
  "phys-magnets",
  "phys-energy",
  "phys-oscillator",
  "phys-fluid",
  "phys-thermo",
  "phys-orbit",
  "phys-sound",
];
const ACTIVITY_KINDS = ["phys-pushpull", "phys-forceArrows", "phys-buildCircuit", "phys-launch", "phys-balance", "phys-matchWave", "phys-material", "phys-magnet"];

describe("physics samples", () => {
  it("has a gallery sample for every kind", () => {
    const vk = new Set(PHYSICS_VISUALS.map(([, v]) => v.kind));
    const ak = new Set(PHYSICS_ACTIVITIES.map(([, a]) => a.kind));
    for (const k of VISUAL_KINDS) expect(vk.has(k as PhysicsVisual["kind"]), k).toBe(true);
    for (const k of ACTIVITY_KINDS) expect(ak.has(k as PhysicsActivity["kind"]), k).toBe(true);
  });

  it.each(PHYSICS_VISUALS.map(([n, v]) => [n, v] as const))("picture %s is valid", (_, v) => {
    expect(physicsVisualProblems(v as PhysicsVisual)).toEqual([]);
  });

  it.each(PHYSICS_ACTIVITIES.map(([n, a]) => [n, a] as const))("activity %s is valid", (_, a) => {
    expect(physicsActivityProblems(a as PhysicsActivity)).toEqual([]);
  });
});

describe("physics helpers", () => {
  it("projectile range on level ground is v² sin 2θ / g", () => {
    expect(launchDistance(10, 45, 10)).toBeCloseTo(10, 6);
    expect(launchDistance(20, 30, 9.8)).toBeCloseTo((400 * Math.sin(Math.PI / 3)) / 9.8, 6);
  });

  it("projectile from a height lands farther", () => {
    expect(launchDistance(10, 0, 10, 5)).toBeCloseTo(10, 6);
  });

  it("thin lens and mirror equation", () => {
    expect(lensImage("converging", 10, 20).di).toBeCloseTo(20);
    expect(lensImage("converging", 10, 5).di).toBeCloseTo(-10);
    expect(lensImage("diverging", 10, 10).di).toBeCloseTo(-5);
    expect(lensImage("concave", 10, 30).m).toBeCloseTo(-0.5);
  });

  it("Snell's law and total internal reflection", () => {
    expect(snell(30, 1, 1.5)).toBeCloseTo((Math.asin(Math.sin(Math.PI / 6) / 1.5) * 180) / Math.PI);
    expect(snell(60, 1.5, 1)).toBeNull();
  });

  it("lights bulbs only in complete, unshorted loops", () => {
    const c = {
      top: [{ part: "cell" as const }, { part: "switch" as const, closed: true }],
      branches: [[{ part: "bulb" as const, name: "A" }], [{ part: "bulb" as const, name: "B" }, { part: "gap" as const }]],
    };
    expect(litNames(c, {})).toEqual(["A"]);
    expect(litNames(c, { "r1:1": true })).toEqual(["A", "B"]);
    expect(litNames(c, { "t:1": false, "r1:1": true })).toEqual([]);
    const shorted = { ...c, branches: [...c.branches, [{ part: "wire" as const }]] };
    expect(litNames(shorted, {})).toEqual([]);
    expect(circuitFlow(shorted, {}).short).toBe(true);
    expect(circuitSolution(c, ["B"])).toBeNull();
    expect(circuitSolution(c, ["A", "B"])).toEqual({ "t:1": true, "r1:1": true });
  });

  it("balances a seesaw with the fewest weights", () => {
    const sol = balanceSolution({ kind: "phys-balance", slots: 4, fixed: [{ side: "left", at: 3, mass: 2 }], mass: 1, side: "right" });
    expect(sol).toEqual({ "right:2": 1, "right:4": 1 });
  });
});
