import type { ReactNode } from "react";
import type { PhysicsVisual } from "../../game/science/physicsTypes";
import { Circuit } from "./physics/Circuit";
import { Energy, Magnets, Thermo } from "./physics/FieldVisuals";
import { Collision, Fluid, Forces, Incline, Motion, Orbit, Oscillator } from "./physics/MechanicsVisuals";
import { Rays, Sound, Wave } from "./physics/WaveVisuals";

/**
 * Draws a "phys-" picture: returns its aria label and content. `solved` is true once the question is over
 * (show any hidden "?" as `answer`, the answer text). See game/science/physicsTypes.ts for every kind's fields.
 */
export function physicsVisual(v: PhysicsVisual, solved: boolean, answer: string): { label: string; body: ReactNode } {
  const ctx = { solved, answer };
  switch (v.kind) {
    case "phys-forces":
      return { label: "Force diagram", body: <Forces v={v} ctx={ctx} /> };
    case "phys-incline":
      return { label: "Block on a ramp", body: <Incline v={v} ctx={ctx} /> };
    case "phys-motion":
      return { label: "Motion diagram", body: <Motion v={v} ctx={ctx} /> };
    case "phys-collision":
      return { label: "Collision", body: <Collision v={v} ctx={ctx} /> };
    case "phys-circuit":
      return { label: "Circuit", body: <Circuit c={v} ctx={ctx} /> };
    case "phys-wave":
      return { label: "Wave", body: <Wave v={v} ctx={ctx} /> };
    case "phys-rays":
      return { label: "Light rays", body: <Rays v={v} ctx={ctx} /> };
    case "phys-magnets":
      return { label: v.scene === "charges" ? "Electric charges" : "Magnets", body: <Magnets v={v} ctx={ctx} /> };
    case "phys-energy":
      return { label: "Energy", body: <Energy v={v} ctx={ctx} /> };
    case "phys-oscillator":
      return { label: v.type === "spring" ? "Mass on a spring" : "Pendulum", body: <Oscillator v={v} ctx={ctx} /> };
    case "phys-fluid":
      return { label: "Fluid", body: <Fluid v={v} ctx={ctx} /> };
    case "phys-thermo":
      return { label: "Heat and temperature", body: <Thermo v={v} ctx={ctx} /> };
    case "phys-orbit":
      return { label: v.scene === "orbit" ? "Orbit" : "Gravity between two masses", body: <Orbit v={v} ctx={ctx} /> };
    case "phys-sound":
      return { label: "Sound", body: <Sound v={v} ctx={ctx} /> };
  }
}
