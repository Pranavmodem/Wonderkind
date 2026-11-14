import type { ChemistryActivity, ChemistryVisual } from "./science/chemistryTypes";
import type { PhysicsActivity, PhysicsVisual } from "./science/physicsTypes";
/**
 * Shared types for Wonderkind questions, visuals, levels and worlds.
 *
 * Every lesson generator returns a `Question`. The `visual` field picks one
 * of the picture models below; the play screen draws it. Keep visuals honest:
 * where a visual is a counting model (objects, ten-frames, blocks…), it must
 * show exactly the amount the answer describes — the tests check this.
 */

export interface Thing {
  emoji: string;
  one: string;
  many: string;
}

export type CellKind = "a" | "b" | "target" | "gone";

/** One fraction bar or pie: `a` parts coloured, then `b` in a second colour, then `target` dashed parts to find. */
export interface FracBar {
  parts: number;
  a?: number;
  b?: number;
  target?: number;
  shape?: "bar" | "pie";
  /** Optional caption beside the bar, e.g. "1/2". */
  label?: string;
  /** Cut into parts of different sizes, for "are these equal shares?". */
  unequal?: boolean;
}

export type ShapeName =
  | "circle"
  | "semicircle"
  | "triangle"
  | "square"
  | "rectangle"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "rhombus"
  | "trapezoid"
  | "parallelogram"
  | "cube"
  | "sphere"
  | "cone"
  | "cylinder"
  | "pyramid"
  | "prism"
  | "triangular-prism"
  | "house";

/** Colour names usable inside visuals (match the CSS colour tokens). */
export type Colour =
  | "sun"
  | "leaf"
  | "berry"
  | "wave"
  | "grape"
  | "teal"
  | "cocoa"
  | "rose"
  | "lime"
  | "night"
  | "tangerine";

export type Visual =
  /** No picture. */
  | { kind: "none" }
  /**
   * `count` emoji. Counting model: shows the answer amount. `layout`: rows of 5 (default), one line,
   * a circle, or scattered. `flash` hides the picture after 1.5 s for quick-look (subitizing) questions;
   * it comes back as a hint.
   */
  | { kind: "objects"; thing: Thing; count: number; layout?: "rows" | "line" | "circle" | "scatter"; flash?: boolean }
  /** Two groups with a plus sign. Counting model: a + b. */
  | { kind: "add"; thing: Thing; a: number; b: number }
  /** `total` emoji, the last `gone` crossed out. Counting model: total − gone. */
  | { kind: "takeaway"; thing: Thing; total: number; gone: number }
  /** Two tappable sides; the kid taps the side with more (input "compare"). Answer = the bigger count. */
  | { kind: "compare"; thing: Thing; left: number; right: number }
  /** Two rows lined up one-to-one. Counting model: top − bottom (how many more). */
  | { kind: "rows"; thing: Thing; top: number; bottom: number }
  /** Ten-frames (1 or 2). Counts: target cells if any, else "a" if any "gone", else a + b. */
  | { kind: "tenframe"; cells: CellKind[] }
  /** Equal groups on plates. Counts groups × each, or highlight × each when `highlight` is set. */
  | { kind: "groups"; thing: Thing; groups: number; each: number; highlight?: number }
  /** A pile shared onto plates; plates fill when solved. Counts `each`. `left` extra items stay aside as leftovers (remainders). */
  | { kind: "share"; thing: Thing; groups: number; each: number; left?: number }
  /** Dot array. Counts rows × cols (unless the equation divides, then it shows the dividend). */
  | { kind: "array"; rows: number; cols: number }
  /**
   * Base-ten blocks (hundreds flats, tens sticks, ones cubes). Counts the sum minus gone tens.
   * `joiner: "vs"` shows the numbers side by side for comparing instead of adding (then nothing is counted).
   */
  | { kind: "blocks"; numbers: number[]; goneTens?: number; joiner?: "+" | "vs" }
  /** Number cards then a "?" card that shows `next` when solved. `next` must equal the answer. */
  | { kind: "sequence"; numbers: number[]; next: number }
  /** Fraction bars or pies. Counts a + b of the first bar when b is set, or target of the last bar when set. */
  | { kind: "fractions"; bars: FracBar[] }
  /**
   * Number line from min to max, ticks every `step`, labels every `labelStep`.
   * Marks `from`; when solved, marks `to` with a jump arrow. `to` must equal the answer
   * (use a value equal to the answer, e.g. rounding target or sum).
   */
  | {
      kind: "numberline";
      min: number;
      max: number;
      step: number;
      labelStep: number;
      from: number;
      to: number;
      /** Write labels as fractions with this denominator (e.g. 3 → "1/3", "2/3", "1 1/3") instead of decimals. */
      fractions?: number;
      /** Hide the value on the starting dot (for "what number is at the dot?"). */
      hideFrom?: boolean;
      /** An inequality: an open or closed dot at `at` with the line shaded to the left or right. */
      ray?: { at: number; dir: "left" | "right"; open: boolean };
    }
  /** Digit cards with place names (ones, tens, … millions; after a "." tenths, hundredths, thousandths). Highlights one card. */
  | { kind: "places"; digits: string; highlight: number }
  /**
   * Area model for (tens + ones) × by. Counts tens·by + ones·by. With `split` (e.g. [20, 3], summing to `by`)
   * it becomes the full 2 × 2 model with four partial products.
   */
  | { kind: "area"; tens: number; ones: number; by: number; split?: [number, number] }
  /** Rectangle with side labels; `grid` draws unit squares. `inside` is text written inside (e.g. "Area = 24"). */
  | { kind: "rect"; w: number; h: number; showW: boolean; showH: boolean; inside?: string; grid: boolean; unit: string }
  /** Rectangles side by side (same area, different perimeter…), each with a label. */
  | { kind: "rects"; items: { w: number; h: number; label: string }[]; unit: string; grid: boolean }
  /**
   * An L-shape: a w × h rectangle with a cutW × cutH corner cut from the top right. Side lengths are
   * labelled unless `hideSides`; `grid` draws unit squares.
   */
  | { kind: "lshape"; w: number; h: number; cutW: number; cutH: number; unit: string; grid: boolean; hideSides?: boolean }
  /** Triangle, parallelogram or trapezoid with base, height (and top for trapezoid) labelled. */
  | { kind: "polygon"; shape: "triangle" | "parallelogram" | "trapezoid"; base: number; height: number; top?: number; unit: string }
  /** A box (rectangular prism) with edges labelled; `cubes` draws unit cubes. */
  | { kind: "box"; l: number; w: number; h: number; unit: string; cubes?: boolean }
  /** Circle with radius or diameter labelled. */
  | { kind: "circle"; r: number; show: "radius" | "diameter"; unit: string }
  /**
   * Angles: on a straight line (sum 180), in a triangle (180), around a point (360), or `parts`: angles
   * stacked side by side from a flat ray (adding angles). The last angle is the "?" one.
   */
  | { kind: "angle"; mode: "line" | "triangle" | "around" | "parts"; angles: number[] }
  /** One angle drawn from a horizontal ray; with `scale` a protractor is shown to read it. */
  | { kind: "protractor"; angle: number; scale: boolean }
  /** Geometry figures: a point, a line, a ray, a segment, or two lines that are parallel, perpendicular or intersecting. */
  | { kind: "lines"; type: "parallel" | "perpendicular" | "intersecting" | "point" | "line" | "ray" | "segment" }
  /** One 2D or 3D shape drawn large; `turn` rotates it (degrees) and `scale` (0.5–1.2) resizes it. */
  | { kind: "shape"; shape: ShapeName; turn?: number; scale?: number }
  /** A row of shapes (e.g. "how many triangles?"). */
  | { kind: "shapes"; shapes: ShapeName[] }
  /** Part-part-whole number bond; "?" marks the unknown. */
  | { kind: "bond"; whole: number | "?"; parts: [number | "?", number | "?"] }
  /** Hundred chart 1–100 with highlighted cells; `ask` shows "?" until solved (it must equal the answer). */
  | { kind: "hundred"; highlight: number[]; ask: number }
  /** 10×10 grid with `shaded` squares (percent, hundredths). */
  | { kind: "hundredgrid"; shaded: number }
  /** Analog clock. */
  | { kind: "clock"; h: number; m: number }
  /** US coins and bills, in cents: 1, 5, 10, 25, 100 (bill), 500 (bill). */
  | { kind: "coins"; coins: number[] }
  /** A measuring jug filled to `amount` (scale up to `max`). */
  | { kind: "jug"; amount: number; max: number; unit: "L" | "mL" | "cups" }
  /** A kitchen scale showing `amount` on a dial up to `max`, with an optional emoji on the pan. */
  | { kind: "scale"; amount: number; max: number; unit: "g" | "kg" | "lb" | "oz"; emoji?: string }
  /** An object lying on a ruler from 0 to `length`. */
  | { kind: "ruler"; length: number; unit: "cm" | "in"; emoji?: string }
  /** Named horizontal bars to compare lengths; `units` marks each whole unit along the bars. */
  | { kind: "lengths"; items: { name: string; length: number }[]; units?: boolean }
  /** Bar graph with a value axis from 0 to `max`, gridlines every `step`. */
  | { kind: "bars"; title: string; items: { label: string; value: number }[]; max: number; step: number }
  /** Picture graph: each emoji stands for `key` items. */
  | { kind: "pictograph"; title: string; items: { label: string; emoji: string; count: number }[]; key: number }
  /** Dot plot / line plot: one dot per value, axis from min to max; `second` adds another plot on the same axis to compare. */
  | { kind: "dots"; values: number[]; min: number; max: number; label?: string; second?: { values: number[]; label: string } }
  /** Coordinate grid: quadrant 1 (0..size) or all four (−size..size). */
  | { kind: "grid"; size: number; quadrants: 1 | 4; points: { x: number; y: number; label: string }[] }
  /** A simple table, e.g. ratio tables, input/output rules, unit conversions. Use "?" for the blank cell. */
  | { kind: "table"; header: string[]; rows: (number | string)[][] }
  /** Tape diagram: one row per label, each split into equal parts. */
  | { kind: "tape"; rows: { label: string; parts: number }[]; partValue?: number | "?" }
  /** A repeating pattern of emoji; the last item is shown as "?". */
  | { kind: "pattern"; items: string[] }
  /** Marbles in a bag, for probability. */
  | { kind: "marbles"; marbles: { colour: Colour; count: number }[] }
  /**
   * A little scene for position words. x and y are 0–100 (left→right, top→bottom); `size` scales an
   * emoji (default 1); `behind: true` draws it behind the others (smaller and partly covered) for
   * "in front of / behind".
   */
  | { kind: "scene"; items: { emoji: string; x: number; y: number; size?: number; behind?: boolean }[] }
  /** Things side by side at relative sizes, for taller/shorter, heavier/lighter, holds more/less. */
  | { kind: "pair"; items: { emoji: string; label: string; size: number }[] }
  /** Box plot (five-number summary) on an axis from `axis[0]` to `axis[1]`; `second` adds another box to compare. */
  | {
      kind: "boxplot";
      min: number;
      q1: number;
      median: number;
      q3: number;
      max: number;
      axis: [number, number];
      label?: string;
      second?: { min: number; q1: number; median: number; q3: number; max: number; label: string };
    }
  /** A spinner with equal sections. */
  | { kind: "spinner"; sections: { colour: Colour; label?: string }[] }
  /**
   * Tree diagram: the first stage's outcomes, each branching into the next stage's, e.g. [["H", "T"], ["1", "2", "3"]].
   * `probs` labels the branches: per stage, either one label per outcome (the same under every parent, for
   * independent events) or one per branch in drawing order (for dependent events, e.g. without replacement).
   */
  | { kind: "tree"; stages: string[][]; probs?: string[][] }
  /** The net (unfolded faces) of a solid, with edge lengths when given. */
  | { kind: "net"; solid: "cube" | "prism" | "triangular-prism" | "pyramid"; l?: number; w?: number; h?: number; unit?: string }
  /** A solid with a cutting plane, for cross-sections. */
  | { kind: "slice"; solid: "cube" | "prism" | "cylinder" | "cone" | "pyramid" | "sphere"; cut: "horizontal" | "vertical" | "diagonal" }
  /**
   * Graph paper with x and y axes. Draw function curves (`fn`), straight segments (`lines`, e.g. a tangent
   * or a line of best fit), points (scatter plots, plotted pairs), and shaded area under a curve between
   * `from` and `to` (integrals, Riemann sums when `rects` is set); with `fn2` the shading runs between the two
   * curves instead of down to the x-axis. `regions` shades a half-plane above or below a boundary (linear
   * inequalities); a strict inequality (< or >) gets a dashed boundary. Overlapping regions show a system's solutions.
   */
  | {
      kind: "plot";
      x: [number, number];
      y: [number, number];
      curves?: { fn: (x: number) => number; colour?: Colour; label?: string; dashed?: boolean }[];
      lines?: { from: [number, number]; to: [number, number]; colour?: Colour; dashed?: boolean }[];
      points?: { x: number; y: number; label?: string; open?: boolean }[];
      shade?: { fn: (x: number) => number; fn2?: (x: number) => number; from: number; to: number; rects?: number };
      regions?: { fn: (x: number) => number; side: "above" | "below"; strict?: boolean; colour?: Colour }[];
      /** Axis titles, e.g. "time (s)" and "position (m)". */
      xLabel?: string;
      yLabel?: string;
    }
  /** Unit circle with an angle in degrees; `show` draws the cos (x) and sin (y) legs. */
  | { kind: "unitcircle"; angle: number; show?: ("sin" | "cos")[] }
  /**
   * Right triangle: `a` is the vertical leg (opposite θ), `b` the horizontal leg (adjacent), `c` the
   * hypotenuse; θ sits at the bottom-left corner. Use "?" for the unknown and null to leave a side blank.
   */
  | { kind: "righttri"; a: number | "?" | null; b: number | "?" | null; c: number | "?" | null; angle?: number | "?" | null; unit?: string }
  /** Two-circle Venn diagram with counts in each region. */
  | { kind: "venn"; labels: [string, string]; left: number | "?"; both: number | "?"; right: number | "?"; outside?: number | "?" }
  /**
   * Any triangle, drawn to the true `shape` (its three angles in degrees, A then B then C, summing to 180).
   * `sides[i]` labels the side opposite vertex i (a opposite A, as in the law of sines) and `angles[i]` labels
   * the angle at vertex i. Numbers get the unit (sides) or ° (angles); strings show as written ("x", "?", "12√3");
   * null leaves it blank.
   */
  | { kind: "triangle"; shape: [number, number, number]; sides?: [Mark, Mark, Mark]; angles?: [Mark, Mark, Mark]; names?: [string, string, string]; unit?: string }
  /**
   * A circle with named points, for chords, secants, tangents, inscribed and central angles. Each point sits at
   * `at` degrees around the circle (0 = right, counterclockwise); `r` above 1 puts it outside (e.g. 1.8 for the
   * point a tangent or secant comes from). "O" is the centre. `segments` join points (`extend` draws the whole
   * line through them, for secants), `tangents` draw the tangent line at a point, `angles` mark the angle at a
   * vertex between two other points, and `arcs` label the arc running counterclockwise from one point to another.
   */
  | {
      kind: "circleparts";
      points: { name: string; at: number; r?: number }[];
      center?: boolean;
      segments?: { from: string; to: string; label?: Mark; extend?: boolean }[];
      tangents?: { at: string; label?: Mark }[];
      angles?: { at: string; from: string; to: string; label: Mark }[];
      arcs?: { from: string; to: string; label: Mark }[];
      unit?: string;
    }
  /** Matrices in brackets, with operators between them, e.g. [{ name: "A", rows: [[1, 2], [3, 4]] }, "×", { rows: [[5], [6]] }]. "?" entries are highlighted. */
  | { kind: "matrix"; items: ({ name?: string; rows: (number | string)[][] } | string)[] }
  /**
   * Two parallel lines cut by a transversal at `tilt` degrees (between 30 and 150). `labels` names the eight
   * angles in the usual order: 1–4 at the top crossing (top-left, top-right, bottom-left, bottom-right), 5–8 at
   * the bottom crossing in the same places. Numbers get °; strings show as written; null leaves it blank.
   */
  | { kind: "transversal"; tilt: number; labels: [Mark, Mark, Mark, Mark, Mark, Mark, Mark, Mark] }
  /** A cylinder, cone, sphere or hemisphere with its radius (`r`), height (`h`) and cone slant height (`slant`) labelled. */
  | { kind: "solid"; solid: "cylinder" | "cone" | "sphere" | "hemisphere"; r?: Mark; h?: Mark; slant?: Mark; diameter?: boolean; unit?: string }
  /** Science pictures: kinds starting "phys-" are drawn by components/science/PhysicsVisuals, "chem-" by ChemistryVisuals. */
  | PhysicsVisual
  | ChemistryVisual;

/** A label on a diagram: a number (gets its unit), a string shown as written ("?" is highlighted), or null for none. */
export type Mark = number | string | null;

/**
 * Hands-on "Do it" activities: instead of picking an answer, the kid builds, draws, places or sorts
 * something, then taps Check. Use them for concepts that aren't naturally a quiz (drawing shapes,
 * measuring, telling time, making money, plotting, graphing, sorting). After a second miss the activity
 * shows the correct result.
 */
export type Activity =
  /** Tap cells of one or two ten-frames until exactly `target` are filled. */
  | { kind: "fillFrame"; target: number; frames: 1 | 2 }
  /** Tap + / − to build `target` from hundreds flats, tens sticks and ones cubes; `fewest` requires no 10+ of a kind. */
  | { kind: "buildBlocks"; target: number; fewest?: boolean }
  /** Tap coins/bills (cents: 1, 5, 10, 25, 100, 500) to make exactly `cents`; `fewest` requires the fewest pieces. */
  | { kind: "makeMoney"; cents: number; coins: number[]; fewest?: boolean }
  /** Drag the minute hand (snaps to `snap` minutes) and tap the hour buttons to show h:m. */
  | { kind: "setClock"; h: number; m: number; snap: 1 | 5 | 15 | 30 }
  /** Drag a marker along a number line (snaps to `step`) to `target`. Labels every `labelStep`; `fractions: d` writes them as fractions. */
  | { kind: "placeOnLine"; min: number; max: number; step: number; labelStep: number; target: number; fractions?: number }
  /** Drag the end of a bar along a ruler to make it `length` long; snaps to 1/`sub` of a unit. */
  | { kind: "makeLength"; length: number; unit: "cm" | "in"; sub: 1 | 2 | 4 }
  /** Tap grid points to place each labelled point, in order. */
  | { kind: "plotPoints"; points: { x: number; y: number; label: string }[]; size: number; quadrants: 1 | 4 }
  /** Drag a ray to make an angle of `degrees` (snaps to 5°); `scale` shows a protractor to measure with. */
  | { kind: "makeAngle"; degrees: number; scale: boolean }
  /** Tap parts of a bar or pie (cut into `parts`) until exactly `target` parts are shaded. */
  | { kind: "shade"; parts: number; target: number; shape: "bar" | "pie" }
  /** Cut a shape into equal parts: tap + / − for parts (or rows and columns when `rows` and `cols` are given). */
  | { kind: "cut"; shape: "rect" | "circle"; parts?: number; rows?: number; cols?: number }
  /** Drag each bar to its value (snaps to `step`) to make a bar graph of the data. */
  /** `hideData` when the question's own picture or table is the data (otherwise the activity lists it). */
  | { kind: "barGraph"; title: string; items: { label: string; value: number }[]; max: number; step: number; hideData?: boolean }
  /** Tap above the number line to add dots (tap a dot to remove) until the plot shows `values`. */
  | { kind: "dotPlot"; values: number[]; min: number; max: number; step: number; label?: string }
  /** Sort each item into the right bin (tap an item, then a bin). */
  | { kind: "sort"; bins: string[]; items: { label: string; bin: number }[] }
  /** Tap the items in the right order. `items` is listed in the correct order; it's shuffled on screen. */
  | { kind: "order"; items: string[]; direction: string }
  /**
   * Draw a polygon on a dot grid by tapping corners (tap the first corner again to close it). It must have
   * `sides` sides, plus any of: exactly `rightAngles` right angles, all sides equal (`equalSides`), exactly
   * `parallelPairs` pairs of parallel sides, a given `area` or `perimeter` (in grid units).
   */
  | {
      kind: "drawShape";
      size: number;
      sides: number;
      rightAngles?: number;
      equalSides?: boolean;
      parallelPairs?: number;
      area?: number;
      perimeter?: number;
    }
  /** Tap + / − for rows and columns to build an array of `rows` × `cols` (either way round when `turnable`). */
  | { kind: "buildArray"; rows: number; cols: number; turnable?: boolean }
  /** Tap two grid points to draw the line y = mx + b. `m` and `b` may be fractions or negative. */
  | { kind: "drawLine"; m: number; b: number; size: number; quadrants: 1 | 4 }
  /**
   * Draw a figure on a dot grid: tap two points, then set each end to a stop or an arrow. "segment",
   * "ray" and "line" check the ends; "parallel" and "perpendicular" ask for two figures that are.
   */
  | { kind: "drawFigure"; figure: "segment" | "ray" | "line" | "parallel" | "perpendicular"; size: number }
  /**
   * Draw a line of symmetry on a shape: tap two points (half-grid points allowed) that the fold line passes
   * through. `points` are the shape's corners on a grid of `size`; any correct line of symmetry counts.
   */
  | { kind: "symmetryLine"; points: { x: number; y: number }[]; size: number }
  /** Trace a number (1–3 digits) with a finger or mouse; it checks that the strokes cover the number's shape. */
  | { kind: "trace"; text: string }
  /** Science activities: kinds starting "phys-" live in components/science/PhysicsActivities, "chem-" in ChemistryActivities. */
  | PhysicsActivity
  | ChemistryActivity;

/** A fraction, optionally a mixed number (w n/d). "?" marks the blank part. */
export type Frac = { n: number | "?"; d: number | "?"; w?: number | "?" };

/**
 * Equation pieces:
 * - numbers (negative numbers display with a real minus sign)
 * - strings: "+", "−", "×", "÷", "=", "?", "(", ")", "<", ">", "of", "%", ":", or "x"
 * - fractions and mixed numbers ({ n, d, w? }), powers ({ pow: [base, exp] }), x-terms ({ x: coefficient })
 *
 * The tests evaluate equations with exactly one "=" and no "<"/">": "?" (or x when there
 * is an answerLine) is replaced by the answer, "of" means ×, "%" means ÷100, ":" means ÷.
 */
export type Token = number | string | Frac | { pow: [number, number] } | { x: number };

export interface Question {
  /** Unique within a level, used to avoid repeats; include every random number. */
  key: string;
  /** What the can says, on screen. Short, kid-friendly. */
  prompt: string;
  /** What the can says out loud. */
  speech: string;
  equation?: Token[];
  visual: Visual;
  /** The picture is the question (counting, reading a clock…), so it's never hidden on "harder". */
  needsVisual?: boolean;
  /** The answer: a number, or the index into `labels` when labels are used. */
  answer: number;
  input: "choices" | "keypad" | "compare" | "activity";
  /** The hands-on task when `input` is "activity". `answer` should then be the activity's key number (e.g. the target). */
  activity?: Activity;
  /** Numbers to pick from (or label indexes 0..n-1). Must include the answer. */
  choices?: number[];
  /** Text for each choice when answers aren't plain numbers (fractions, signs, names, times). */
  labels?: string[];
  /** A second line holding the blank, e.g. "x = ?" under "3x + 4 = 19". */
  answerLine?: Token[];
  /** Extra keypad key for decimals or negative numbers. */
  keypadExtra?: "." | "−";
  /** Shown before / after the typed answer, e.g. "$" or "cm²". */
  prefix?: string;
  unit?: string;
  /** Shown after the first wrong try. */
  hint: string;
  /** Shown when the answer is revealed or confirmed. */
  explain: string;
}

export type ColourName = Colour;

export type Hat = "none" | "bow" | "party" | "crown" | "hardhat" | "chef" | "glasses" | "gradcap" | "cap" | "wizard";

export interface Level {
  /** Unique across the whole game, kebab-case, e.g. "k-count-5". */
  id: string;
  title: string;
  make: () => Question;
  /** Common Core codes this level teaches, e.g. ["K.CC.B.5"]. */
  standards: string[];
  /**
   * The big idea, taught before practice in Learn mode: 1–3 short sentences in
   * kid language, e.g. "When you add, you put groups together. Count on from
   * the bigger number to go faster."
   */
  idea?: string;
  /** The mixed-review lesson added at the end of every world. */
  challenge?: boolean;
}

export type Subject = "math" | "physics" | "chemistry";

export interface World {
  id: string;
  /** Filled in by the curriculum from the folder the world's band lives in. */
  subject?: Subject;
  name: string;
  /** Youngest and oldest age this world is for. */
  ages: [number, number];
  color: Colour;
  /** 1–3 characters for the world badge, e.g. "123", "+", "½". */
  symbol: string;
  /** 4–6 emoji drawn as scenery along the world's trail on the map. */
  scenery: string[];
  /** What Can wears in this world. */
  hat: Hat;
  levels: Level[];
}
