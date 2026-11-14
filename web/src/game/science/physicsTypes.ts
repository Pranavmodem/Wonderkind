/**
 * Physics pictures ("phys-…" visuals) and hands-on activities ("phys-…" activities).
 *
 * Every kind starts with "phys-" so the shared Visual and ActivityStage components hand them to
 * components/science/PhysicsVisuals and PhysicsActivities. Checks live in physicsValidate.ts and run in the
 * level tests, so impossible data (a target that can't be reached, labels that disagree) fails a test.
 *
 * GRAPHS: there is no "phys-graph". Use the shared `plot` visual for position–time, velocity–time,
 * acceleration–time, force–extension, V–I, P–V and similar graphs: `lines` for straight segments, `curves`
 * for functions, `points` for data, and `shade` for the area under a v–t graph (displacement) or a P–V curve (work).
 *
 * CONVENTIONS used by every kind below:
 * - Labels are `Mark`s: a number gets the field's unit (e.g. 12 → "12 N"), a string shows as written
 *   ("F_g", "mg", "12 N"), "?" is drawn highlighted as the unknown (and shows the answer once solved),
 *   and null or a missing field draws nothing.
 * - Directions are degrees counterclockwise from pointing right, like a maths angle:
 *   0 = right, 90 = up, 180 = left, 270 (or −90) = down, 45 = up and to the right.
 * - Colours are the shared `Colour` names (sun, leaf, berry, wave, grape, teal, cocoa, rose, lime, night,
 *   tangerine); arrows use the deep shade so they stay readable.
 * - Sizes called "relative" only matter compared with each other in the same picture: the biggest is drawn
 *   at full length. Use the real magnitudes (12 for 12 N) so arrows compare honestly.
 * - Keep text short: pictures render about 340 px wide on a phone.
 */
import type { Colour, Mark } from "../types";

/* ================================================================ shared pieces */

/** One force (or velocity, or component) arrow on an object. */
export interface ForceArrow {
  /** Direction in degrees: 0 right, 90 up, 180 left, 270 down. */
  dir: number;
  /** Relative length (use the magnitude, e.g. 20 for 20 N). 0 draws no arrow. */
  size: number;
  /** Label at the arrow tip: "F_g", "mg", "N", 12 (→ "12 N" with the picture's unit), "?". */
  label?: Mark;
  /** Arrow colour; by default each arrow gets the next colour from berry, wave, leaf, grape, tangerine, teal. */
  colour?: Colour;
  /** Dashed, for components (F cos θ) or "would be" arrows. */
  dashed?: boolean;
}

/** A range a slider or stepper moves through: min, min + step, …, max. */
export interface StepRange {
  min: number;
  max: number;
  step: number;
  /** Where the control starts (on the grid). Default: the first grid value that isn't already the answer. */
  start?: number;
}

/* ================================================================ circuits */

interface LoadBase {
  /** A short name drawn above the part, e.g. "A", "B", "R₁". The buildCircuit activity's goal uses bulb names. */
  name?: string;
  /** Value drawn below the part: 6 → "6 Ω" (or the part's unit), "?" for the unknown. */
  label?: Mark;
  /** Unit for a numeric label. Defaults: cell V, resistor Ω, bulb Ω, motor Ω, capacitor μF, ammeter A, voltmeter V. */
  unit?: string;
  /** Draw a voltmeter connected across this part with this reading, e.g. "?" or 3 (→ "3 V"). */
  across?: Mark;
}

/**
 * One part of a circuit. Parts are laid out along a wire, left to right.
 * Conductors: wire, ammeter, closed switch, cell, resistor, bulb, motor. Breaks: gap, open switch, voltmeter,
 * capacitor (a charged capacitor passes no steady current).
 */
export type CircuitPart =
  /** Plain wire (use it to space parts out). */
  | { part: "wire" }
  /** A break in the wire. In "phys-buildCircuit" the kid taps it to fill it with wire. */
  | { part: "gap"; name?: string }
  /** A cell, or a battery of `cells` cells (1–3). `label` is its voltage, e.g. 9 → "9 V". The long plate is +. */
  | ({ part: "cell"; cells?: number } & LoadBase)
  | ({ part: "resistor" } & LoadBase)
  /** A bulb. Lit or unlit is worked out from the circuit (complete loop, not shorted) unless `lit` forces it. */
  | ({ part: "bulb"; lit?: boolean } & LoadBase)
  | ({ part: "motor" } & LoadBase)
  | ({ part: "capacitor" } & LoadBase)
  /** A switch. In "phys-buildCircuit" the kid taps it to open or close it (`closed` is where it starts). */
  | { part: "switch"; closed: boolean; name?: string }
  /** An ammeter in series, showing `label` (e.g. 2 → "2 A", "?"). */
  | { part: "ammeter"; label?: Mark; unit?: string; name?: string }
  /** A voltmeter drawn in the wire. To measure across one part, use that part's `across` instead. */
  | { part: "voltmeter"; label?: Mark; unit?: string; name?: string };

/**
 * A circuit as a ladder:
 * - `top`: the top wire, left to right. Put the cell here (cells must be in `top` or `bottom`).
 * - `bottom`: for a single loop (series): the bottom wire, left to right. Ignored when `branches` is set.
 * - `branches`: for parallel: 2–4 rungs drawn below the top wire, each a row of parts between the left and
 *   right sides; the last rung is the bottom wire. Parts in `top` are then in series with the parallel block.
 * Keep each row to 4 parts or fewer so it fits a phone.
 */
export interface CircuitLayout {
  top: CircuitPart[];
  bottom?: CircuitPart[];
  branches?: CircuitPart[][];
}

/* ================================================================ visuals */

export type PhysicsVisual =
  /**
   * Free-body / force diagram: an object with force arrows starting at its edge (or centre, for a dot).
   * - `object`: an emoji, "box" (default, a plain crate) or "dot" (particle model; arrows start at the centre).
   * - `objectLabel`: text in the box, e.g. "5 kg" (a number gets `massUnit`, default "kg").
   * - `surface`: "floor" draws the ground under it, "ceiling" hangs it on a string, "none" (default) floats it.
   * - `incline`: draw it resting on a ramp at this angle (degrees, 5–60) instead; force directions stay absolute,
   *   so for a ramp rising to the right at θ: normal = 90 + θ, gravity = 270, friction up the slope = θ.
   *   `inclineLabel` labels the ramp angle (default: the angle in °; "?" to ask, null to hide).
   * - `motion`: a separate outlined arrow above the picture for velocity or acceleration (label "v", "a", "v = 3 m/s").
   * - `unit`: unit for numeric arrow labels (default "N").
   */
  | {
      kind: "phys-forces";
      forces: ForceArrow[];
      object?: string;
      objectLabel?: Mark;
      massUnit?: string;
      surface?: "floor" | "ceiling" | "none";
      incline?: number;
      inclineLabel?: Mark;
      motion?: { dir: number; label?: Mark };
      unit?: string;
    }
  /**
   * A ramp rising to the right at `angle` degrees (5–60) with a block on it.
   * `angleLabel` (default the angle in °), `length` (along the slope), `height` and `base` label the triangle
   * (numbers get `unit`, default "m"). `blockLabel` writes on the block (number → kg). `friction` is a short
   * note under the ramp ("μ = 0.2", "rough", "frictionless"). `forces` draws arrows on the block (absolute
   * directions, see phys-forces). `motion` draws an arrow along the slope ("up" or "down") with `motionLabel`.
   */
  | {
      kind: "phys-incline";
      angle: number;
      angleLabel?: Mark;
      length?: Mark;
      height?: Mark;
      base?: Mark;
      unit?: string;
      object?: string;
      blockLabel?: Mark;
      friction?: string;
      forces?: ForceArrow[];
      forceUnit?: string;
      motion?: "up" | "down";
      motionLabel?: Mark;
    }
  /**
   * Motion along a straight track, read against a ruler from `track.min` to `track.max` (ticks every
   * `track.step`, numbers every `track.labelStep`, default every step; `unit` written after the last number).
   * Each row is one object (1–3 rows; two rows = a race). `positions` are where the object is at equal time
   * steps (a strobe / motion diagram); `look: "dots"` (default) draws a dot per position, "ghosts" draws the
   * emoji at each position, fading the earlier ones (a car moving along a track). `arrows` (one per position,
   * signed: + right) adds velocity arrows; `flip` mirrors the emoji (most car emoji face left). `times` numbers the dots 0, 1, 2… above them. `finish` draws a
   * finish flag at a position. `span` draws a bracket over part of the track with a distance label.
   */
  | {
      kind: "phys-motion";
      track: { min: number; max: number; step: number; labelStep?: number; unit?: string };
      rows: { positions: number[]; emoji?: string; flip?: boolean; name?: string; colour?: Colour; arrows?: number[] }[];
      look?: "dots" | "ghosts";
      times?: boolean;
      finish?: number;
      span?: { from: number; to: number; label: Mark };
    }
  /**
   * Two carts on a track, before (and optionally after) a collision. Each cart has a `mass` label (number →
   * kg), a velocity label `v` (number → m/s; give the speed, the arrow shows the direction) and `vSize`, the
   * signed relative velocity that sets the arrow (+ right, − left, 0 at rest). `after` is two carts (bounce)
   * or one cart (they stuck together). When every mass and v is a number the check makes sure momentum is
   * conserved, so keep the numbers honest.
   */
  | {
      kind: "phys-collision";
      before: [Cart, Cart];
      after?: [Cart, Cart] | [Cart];
      massUnit?: string;
      vUnit?: string;
    }
  /**
   * A circuit diagram (schematic). See CircuitLayout: `top` (with the cell), then either `bottom` (one loop,
   * series) or `branches` (parallel rungs). Bulbs light up by themselves when current flows through them
   * (a complete loop that isn't shorted out by a branch of plain wire).
   */
  | ({ kind: "phys-circuit" } & CircuitLayout)
  /**
   * Waves on a grid `length` units wide (unit squares are drawn when `grid`).
   * - form "transverse" (default): y = A·sin, crests and troughs. "longitudinal": lines bunched into
   *   compressions one wavelength apart (amplitude sets how bunched). "standing": a standing wave between two
   *   fixed ends (`length` must be a whole number of half wavelengths), drawn as its two extremes, with nodes.
   * - `waves`: one wave, or two drawn one above the other on the same scale to compare (taller, longer);
   *   `label` names each ("A", "B").
   * - `amplitudeLabel`, `wavelengthLabel` mark the first wave (numbers get `unit`, default "m"); the
   *   wavelength marker needs 1.25 wavelengths of room.
   * - `names` labels crest/trough, compression/rarefaction, or N/A (nodes/antinodes).
   * - `travel` draws a "moving this way" arrow with this label (e.g. "v"; a number gets m/s).
   * - The vertical scale shrinks for tall waves so a picture stays under ~200 px high; grid squares are then
   *   rectangles, still one unit each way.
   */
  | {
      kind: "phys-wave";
      form?: "transverse" | "longitudinal" | "standing";
      length: number;
      waves: { amplitude: number; wavelength: number; label?: string; colour?: Colour }[];
      amplitudeLabel?: Mark;
      wavelengthLabel?: Mark;
      unit?: string;
      grid?: boolean;
      names?: boolean;
      travel?: Mark;
    }
  /** Light and optics; pick a `scene`. */
  | ({ kind: "phys-rays" } & RayScene)
  /** Magnets, magnetic fields and electric charges; pick a `scene`. */
  | ({ kind: "phys-magnets" } & MagnetScene)
  /**
   * Energy: bar charts and/or a transfer chain.
   * - `bars`: one chart per moment (e.g. "Top", "Bottom"), each with one value per name in `names`
   *   ("KE", "GPE", "Thermal"); "?" draws a dashed bar to find (filled with the answer once solved, when it's a
   *   number). Values go from 0 to `max`; `unit` (e.g. "J") is written on the scale. Use 1–3 charts of 2–4 bars.
   * - `chain`: an energy transfer chain drawn left to right, e.g. sun → plant → food. A step may be a list
   *   of outputs (battery → bulb → [light, heat]); only the last step may branch. `via` labels the arrow coming
   *   into that step ("electric"). Up to 4 steps fit a phone.
   */
  | {
      kind: "phys-energy";
      names?: string[];
      bars?: { title: string; values: (number | "?")[] }[];
      max?: number;
      unit?: string;
      chain?: (EnergyStep | EnergyStep[])[];
    }
  /** A mass on a spring, or a pendulum; pick a `type`. */
  | ({ kind: "phys-oscillator" } & OscillatorScene)
  /** Floating and sinking, pressure at depth, or flow through a narrowing pipe; pick a `scene`. */
  | ({ kind: "phys-fluid" } & FluidScene)
  /** Thermometers, heat flow between two objects, or a gas in a piston; pick a `scene`. */
  | ({ kind: "phys-thermo" } & ThermoScene)
  /** A satellite orbiting a planet, or two masses pulling on each other; pick a `scene`. */
  | ({ kind: "phys-orbit" } & OrbitScene)
  /** Vibrating things making sound, or sending a signal with light or sound; pick a `scene`. */
  | ({ kind: "phys-sound" } & SoundScene);

/** A cart in "phys-collision". */
export interface Cart {
  /** Mass label: a number gets the mass unit (kg). */
  mass: Mark;
  /** Speed label: a number gets the velocity unit (m/s). Give the speed; the arrow shows the direction. */
  v?: Mark;
  /** Signed relative velocity for the arrow: + right, − left, 0 at rest. */
  vSize: number;
  /** Cart colour (default wave for the first, berry for the second). */
  colour?: Colour;
  /** Short name drawn on the cart instead of the mass, e.g. "A" (the mass then goes under it). */
  name?: string;
}

/** One step in an energy chain. */
export interface EnergyStep {
  emoji: string;
  label: string;
  /** Label on the arrow that comes into this step, e.g. "electric", "chemical". */
  via?: string;
}

/** Scenes for "phys-rays". */
export type RayScene =
  /**
   * A light (torch, sun or bulb) shining through or onto a `block` toward a screen. The block is
   * "transparent" (light passes, bright screen), "translucent" (some passes, dim screen), "opaque" (blocked,
   * a shadow) or "mirror" (light bounces back). Give `emoji` to draw an object (🧸) instead of a slab; it
   * casts a shadow. `label` names the block ("glass", "wax paper"). No block: the light reaches the screen.
   */
  | {
      scene: "beam";
      source?: "torch" | "sun" | "bulb";
      block?: { type: "transparent" | "translucent" | "opaque" | "mirror"; label?: string; emoji?: string };
      screen?: boolean;
    }
  /**
   * A flat mirror with a ray hitting it at `angle` degrees from the normal (0–80) and the reflected ray at the
   * same angle. `incident` and `reflected` label the two angles (numbers get °); `normal` (default true)
   * draws the dashed normal. `ends` draws a torch at the start and an eye at the end.
   */
  | { scene: "mirror"; angle: number; incident?: Mark; reflected?: Mark; normal?: boolean; ends?: boolean }
  /**
   * Refraction at a flat boundary: a ray in the top medium (index `n1`, name `top`, e.g. "air") hits the
   * bottom medium (`n2`, `bottom`, e.g. "water") at `angle` degrees from the normal. The refracted angle is
   * worked out with Snell's law; past the critical angle the ray is totally internally reflected instead.
   * `incident`, `refracted` label the angles; `reflected` also draws the faint partly-reflected ray.
   */
  | {
      scene: "refraction";
      angle: number;
      n1: number;
      n2: number;
      top?: string;
      bottom?: string;
      incident?: Mark;
      refracted?: Mark;
      reflected?: boolean;
    }
  /**
   * A ray diagram for a thin lens or a curved mirror. `optic`: "converging" or "diverging" lens, "concave"
   * or "convex" mirror. `focal` is the focal length (positive, in any unit), `object` the object distance and
   * `height` the object height (default focal/2). The object is a navy arrow; the image is worked out with
   * 1/do + 1/di = 1/f and drawn as a purple arrow (dashed if virtual) with the three principal rays (red: parallel
   * then through F; blue: through the centre; green: through F then parallel; virtual rays are traced back dashed). `showImage: false` hides the image and the rays until
   * solved (for "where is the image?"). `labels` marks f, do and di with dimension lines (numbers get `unit`,
   * default "cm"). `twoF` also marks 2F (C for mirrors). The object must not sit at the focal point.
   */
  | {
      scene: "lens";
      optic: "converging" | "diverging" | "concave" | "convex";
      focal: number;
      object: number;
      height?: number;
      showImage?: boolean;
      rays?: boolean;
      twoF?: boolean;
      labels?: { f?: Mark; object?: Mark; image?: Mark };
      unit?: string;
    }
  /** How we see: light goes from a source (☀️ / 💡) to an object and bounces into an eye. */
  | { scene: "see"; source?: string; object: string; label?: string };

/** Scenes for "phys-magnets". */
export type MagnetScene =
  /**
   * One or two bar magnets in a row. Each is "NS" (N on the left) or "SN". `arrows` shows the forces
   * (attract: toward each other; repel: apart), worked out from the facing poles. `gap` labels the space
   * between them (e.g. "?"; a number gets "cm").
   */
  | { scene: "bars"; magnets: ("NS" | "SN")[]; arrows?: boolean; gap?: Mark }
  /** One bar magnet with its field lines (out of N, into S). `compass` adds little compasses along the field. */
  | { scene: "field"; magnet?: "NS" | "SN"; compass?: boolean }
  /**
   * A current-carrying wire with circular field lines (right-hand rule). `view: "end"` (default) looks
   * along the wire (`current` "out" of the page • or "in" ✕); `view: "side"` shows the wire standing up with
   * the current going "up" ("out") or "down" ("in"). `label` names the current ("I", 2 → "2 A").
   */
  | { scene: "wire"; current: "out" | "in"; view?: "end" | "side"; label?: Mark }
  /**
   * Point charges on a grid: x and y in −4…4 (y up), `q` the size of the charge (1–3, default 1). `lines`
   * traces electric field lines (out of +, into −). `forces` draws the electric force on each charge
   * (Coulomb's law, scaled), labelled by `forceLabels` in the same order (number → N). `distance` labels the
   * distance between the first two charges (number → `unit`, default "m").
   */
  | {
      scene: "charges";
      charges: { sign: "+" | "−"; x: number; y: number; q?: number; label?: string }[];
      lines?: boolean;
      forces?: boolean;
      forceLabels?: Mark[];
      distance?: Mark;
      unit?: string;
    };

/** Scenes for "phys-oscillator". */
export type OscillatorScene =
  /**
   * A mass on a spring, "horizontal" (on a frictionless floor, default) or "vertical" (hanging).
   * `displacement` is where the mass is drawn, from −1 (fully compressed / up) to 1 (fully stretched / down),
   * as a fraction of the amplitude; the dashed line is equilibrium (x = 0). `amplitudeLabel` marks A,
   * `massLabel` writes on the mass (number → kg), `kLabel` names the spring ("k", 200 → "200 N/m").
   * `force` draws the restoring force (toward equilibrium, size ∝ displacement) with this label;
   * `velocity` draws a velocity arrow (signed relative size, + = right/down) labelled `velocityLabel`.
   * `animate` makes it bounce (still if the kid prefers reduced motion).
   */
  | {
      type: "spring";
      orientation?: "horizontal" | "vertical";
      displacement: number;
      amplitudeLabel?: Mark;
      massLabel?: Mark;
      kLabel?: Mark;
      force?: Mark;
      velocity?: number;
      velocityLabel?: Mark;
      unit?: string;
      animate?: boolean;
    }
  /**
   * A pendulum pulled `angle` degrees (−60…60, + to the right) from straight down. `lengthLabel` labels the
   * string (number → m), `angleLabel` the angle (default the angle in °, null to hide), `massLabel` the bob.
   * `swing` shows the other end of the swing as a ghost with the arc; `animate` makes it swing.
   */
  | {
      type: "pendulum";
      angle: number;
      lengthLabel?: Mark;
      angleLabel?: Mark;
      massLabel?: Mark;
      unit?: string;
      swing?: boolean;
      animate?: boolean;
    };

/** Scenes for "phys-fluid". */
export type FluidScene =
  /**
   * Objects in a tank of liquid. `submerged` is the fraction under the surface (0–1). With 1 the object
   * hangs fully under (neutrally buoyant) unless `sunk` puts it on the bottom. `size` is relative (0.6–1.4,
   * default 1). `label` writes on the block ("ice", "ρ = 0.9"); `emoji` draws one on it. Up to 3 objects.
   * `liquid` names the liquid ("water").
   */
  | {
      scene: "float";
      objects: { submerged: number; sunk?: boolean; size?: number; label?: string; emoji?: string; colour?: Colour }[];
      liquid?: string;
    }
  /**
   * A tall tank of liquid with points at depths (`depth` 0–1 of the way down). `label` labels the point
   * ("P₁", "?"; a number gets kPa), `depthLabel` draws the depth from the surface (number → `unit`, default "m"). `holes` makes
   * water spurt from holes at those depths (deeper spurts farther, ∝ √depth).
   */
  | {
      scene: "pressure";
      points: { depth: number; label?: Mark; depthLabel?: Mark }[];
      holes?: boolean;
      liquid?: string;
      unit?: string;
    }
  /**
   * A pipe narrowing from width `widths[0]` (left) to `widths[1]` (right), relative diameters. Flow arrows are
   * drawn ∝ 1/width² (continuity). `v`, `area`, `pressure` label the two sections (numbers get m/s, m², kPa).
   * When both areas and both speeds are numbers the check makes sure A₁v₁ = A₂v₂.
   */
  | {
      scene: "pipe";
      widths: [number, number];
      v?: [Mark, Mark];
      area?: [Mark, Mark];
      pressure?: [Mark, Mark];
    };

/** Scenes for "phys-thermo". */
export type ThermoScene =
  /**
   * 1–3 thermometers on the same scale, from `min` to `max`, ticks every `step`, numbers every `labelStep`
   * (default 5 steps). Each shows `temp`; `reading` writes a label beside the top of the liquid (e.g. "?"),
   * `label` names it underneath ("ice water"). `unit` is "°C" (default), "°F" or "K".
   */
  | {
      scene: "thermometer";
      thermometers: { temp: number; reading?: Mark; label?: string }[];
      min: number;
      max: number;
      step: number;
      labelStep?: number;
      unit?: "°C" | "°F" | "K";
    }
  /**
   * Two objects side by side at temperatures `a.temp` and `b.temp`; a heat arrow (labelled `arrowLabel`,
   * default "heat") runs from the hotter to the colder one, or "same temperature" when equal. `label`
   * overrides the temperature text (e.g. "?"). `touching` (default true) puts them in contact.
   */
  | {
      scene: "flow";
      a: { emoji: string; temp: number; label?: Mark };
      b: { emoji: string; temp: number; label?: Mark };
      arrowLabel?: string;
      touching?: boolean;
      unit?: "°C" | "°F" | "K";
    }
  /**
   * A gas in a cylinder under a piston. `volume` (0.2–1) is how high the piston sits. `P`, `V`, `T` are
   * labels listed beside it (numbers get `units`, default atm, L, K). `heat` puts a flame ("in") or ice
   * ("out") under it; `weight` stands an emoji on the piston. `particles` sets how many gas dots (default 16);
   * `hot` draws them with longer motion streaks.
   */
  | {
      scene: "piston";
      volume: number;
      P?: Mark;
      V?: Mark;
      T?: Mark;
      units?: { P?: string; V?: string; T?: string };
      heat?: "in" | "out";
      weight?: string;
      particles?: number;
      hot?: boolean;
    };

/** Scenes for "phys-orbit". */
export type OrbitScene =
  /**
   * A satellite (emoji, default 🛰️) orbiting a planet (default 🌍) counterclockwise. `at` is its place on the
   * orbit in degrees (default 40). `ecc` (0–0.6) makes the orbit an ellipse with the planet at a focus.
   * `radiusLabel` labels the planet–satellite distance (number → `unit`, default "km"), `speedLabel` the
   * velocity arrow along the orbit (number → m/s; its length follows the real orbital speed, so it's longer near
   * the planet on an ellipse), `gravityLabel` the gravity arrow toward the planet (number → N; length ∝ 1/r²).
   * A label that's missing hides its arrow.
   */
  | {
      scene: "orbit";
      planet?: string;
      satellite?: string;
      at?: number;
      ecc?: number;
      radiusLabel?: Mark;
      speedLabel?: Mark;
      gravityLabel?: Mark;
      unit?: string;
    }
  /**
   * Two masses pulling on each other with equal and opposite gravity arrows. `size` is the relative radius
   * (0.5–2); `label` writes under each ("m₁", 5 → "5 kg"); `emoji` draws it instead of a ball.
   * `distance` labels the centre-to-centre distance (number → `unit`, default "m"); `forceLabels` label the two
   * arrows ("F", "?"; number → N).
   */
  | {
      scene: "pair";
      masses: [OrbitBody, OrbitBody];
      distance?: Mark;
      forceLabels?: [Mark, Mark];
      unit?: string;
    };

export interface OrbitBody {
  size?: number;
  label?: Mark;
  emoji?: string;
  colour?: Colour;
}

/** Scenes for "phys-sound". */
export type SoundScene =
  /**
   * A vibrating `source` sending sound waves to the right: `rings` arcs (1–4, default 3; more = louder),
   * spaced close for `pitch: "high"` and far apart for "low" (default "mid"). `loud` draws them bolder.
   * `ear` adds a listener. `label` captions the source. `animate` ripples the waves outward.
   */
  | {
      scene: "vibrate";
      source: "drum" | "string" | "fork" | "speaker" | "bell";
      rings?: number;
      pitch?: "high" | "mid" | "low";
      loud?: boolean;
      ear?: boolean;
      label?: string;
      animate?: boolean;
    }
  /**
   * Sending a signal across a distance: `sender` and `receiver` emoji, carried by "light" (flashes),
   * "sound" (sound waves) or "radio" (zig-zag waves). `message` is a short pattern shown along the way
   * ("• — •", "3 beeps"); `distance` labels the gap (number → m).
   */
  | {
      scene: "signal";
      sender: string;
      receiver: string;
      via: "light" | "sound" | "radio";
      message?: string;
      distance?: Mark;
      unit?: string;
    };

/* ================================================================ activities */

export type PhysicsActivity =
  /**
   * An object on a track from 0 to `length`, starting at `start`. The kid picks a direction (◀ / ▶) and a
   * strength (one button per entry of `strengths`: how far that push moves it; named by `strengthNames`,
   * default "small", "medium", "big") and taps Go to see where it ends up. `verb` words the buttons
   * ("push", default, or "pull").
   * Goal: `target` a position to reach (start ± one strength must hit it exactly), or "stop": the object is
   * already rolling `rolling` units (signed) and the kid must push the other way with exactly that strength.
   * Checks direction and strength.
   */
  | {
      kind: "phys-pushpull";
      object?: string;
      length: number;
      start: number;
      strengths: number[];
      strengthNames?: string[];
      target: number | "stop";
      rolling?: number;
      verb?: "push" | "pull";
    }
  /**
   * Draw or adjust force arrows on an object: the kid drags each arrow's tip (it snaps to `directions`
   * directions and whole lengths 0…`maxSize`; drag to the middle to remove it). `arrows` are the kid's arrows
   * (1–3), each with a label, a starting `dir`/`size` (default none) and the `answer` that is shown when
   * solved. `given` arrows are fixed (e.g. gravity). `surface` as in phys-forces.
   * `check`: "net" (default) needs the net force of all arrows (given + kid) to equal `net` (in size units,
   * default {x: 0, y: 0} = balanced); "exact" needs every kid arrow to match its answer (size 0 = not there).
   */
  | {
      kind: "phys-forceArrows";
      object?: string;
      surface?: "floor" | "ceiling" | "none";
      directions: 4 | 8 | 16;
      maxSize: number;
      given?: { dir: number; size: number; label: string; colour?: Colour }[];
      arrows: { label: string; dir?: number; size?: number; colour?: Colour; answer: { dir: number; size: number } }[];
      check?: "net" | "exact";
      net?: { x: number; y: number };
    }
  /**
   * Tap the gaps (to fill them with wire) and switches (to open/close them) in a circuit so that exactly the
   * bulbs named in `lit` light up (all other named bulbs stay dark). Every bulb needs a name; e.g.
   * lit: ["B"] for "light only bulb B", or every bulb's name for "make a complete circuit".
   */
  | ({ kind: "phys-buildCircuit"; lit: string[] } & CircuitLayout)
  /**
   * Launch a projectile to land on a target. `angle` and `speed` are each a fixed number or a slider range
   * (degrees above horizontal; m/s). It starts `height` m above the ground (default 0) with gravity `g`
   * (m/s², e.g. 9.8). It lands `target` m away within `tolerance` m to count (the ground is drawn from 0 to
   * `width` m). Tapping Launch draws the path (real kinematics); the path also shows once solved.
   * `launcher`: "cannon" (default), "ramp" (looks best with a `height`) or "hand" (a kid throwing a ball).
   * Tip: speeds and target should give a path at least a few metres high or long; the picture uses one scale
   * for x and y so the shape of the path is true.
   */
  | {
      kind: "phys-launch";
      g: number;
      height?: number;
      angle: number | StepRange;
      speed: number | StepRange;
      target: number;
      tolerance: number;
      width: number;
      launcher?: "cannon" | "ramp" | "hand";
    }
  /**
   * A seesaw with `slots` places on each side, 1…slots units from the pivot. `fixed` weights are already on
   * it; the kid taps a slot (on `side`, default "both") to add a weight of `mass` (tap the stack to take one
   * off), up to `perSlot` per slot (default 4). Balanced when Σ mass × distance is the same on both sides.
   * `emoji` draws the kid's weights (default a block with the mass on it).
   */
  | {
      kind: "phys-balance";
      slots: number;
      fixed: { side: "left" | "right"; at: number; mass: number; emoji?: string }[];
      mass: number;
      side?: "left" | "right" | "both";
      perSlot?: number;
      emoji?: string;
      unit?: string;
    }
  /**
   * Match a target wave (drawn faintly) with sliders. Give `amplitude` and/or `wavelength` ranges, or
   * `frequency` with `speed` (then wavelength = speed / frequency). Quantities without a slider stay at the
   * target value. The target must sit exactly on the slider steps. `length` is the grid width in units;
   * `unit` labels lengths (default "m").
   */
  | {
      kind: "phys-matchWave";
      length: number;
      target: { amplitude: number; wavelength: number };
      amplitude?: StepRange;
      wavelength?: StepRange;
      frequency?: StepRange;
      speed?: number;
      unit?: string;
    }
  /**
   * Shine a torch at a screen and tap a material to put it in the beam: the screen shows whether light
   * passes (transparent), is dimmed (translucent), is blocked (opaque) or bounces back (mirror). The kid
   * must put in a material whose effect is `want` ("pass", "dim", "block" or "reflect"); any material of the
   * right type counts. To sort materials into groups instead, use the shared `sort` activity with bins like
   * ["Lets light through", "Some light", "Blocks light"] and a phys-rays "beam" picture.
   */
  | {
      kind: "phys-material";
      materials: { name: string; emoji?: string; type: "transparent" | "translucent" | "opaque" | "mirror" }[];
      want: "pass" | "dim" | "block" | "reflect";
    }
  /**
   * Magnets. mode "arrange": two bar magnets; the kid taps a magnet to flip it so they `want` "attract" or
   * "repel" (`fixed: "left"` locks the left one; `start` is how they begin, default ["NS", "NS"]).
   * mode "pickup": tap every item a magnet picks up (`items` with `magnetic` true/false); the magnet then
   * pulls them in.
   */
  | {
      kind: "phys-magnet";
      mode: "arrange";
      want: "attract" | "repel";
      start?: ["NS" | "SN", "NS" | "SN"];
      fixed?: "left";
    }
  | {
      kind: "phys-magnet";
      mode: "pickup";
      items: { name: string; emoji: string; magnetic: boolean }[];
    };
