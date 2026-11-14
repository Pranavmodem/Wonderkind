// Dev-only page (gallery.html) that renders every picture model, for checking styles.
import { createRoot } from "react-dom/client";
import { Can } from "../components/Can";
import { Equation, LabelText } from "../components/Equation";
import { Keypad } from "../components/Keypad";
import { Visual } from "../components/Visual";
import { worldStyle } from "../components/bits";
import type { Colour, Hat, Visual as V } from "../game/types";
import "../styles.css";
import "../visuals.css";
import "../screens.css";
import "../activities.css";
import "../physics.css";
import "../chemistry.css";
import "../theme.css";
import { ActivityStage } from "../components/activities/ActivityStage";
import type { Activity } from "../game/types";
import { CHEMISTRY_ACTIVITIES, CHEMISTRY_VISUALS } from "./chemistrySamples";
import { PHYSICS_ACTIVITIES, PHYSICS_VISUALS } from "./physicsSamples";

const apple = { emoji: "🍎", one: "apple", many: "apples" };
const samples: [string, V, Colour][] = [
  ["rows", { kind: "rows", thing: apple, top: 7, bottom: 4 }, "berry"],
  ["fractions bars", { kind: "fractions", bars: [{ parts: 4, a: 1, label: "1/4" }, { parts: 8, target: 2 }] }, "cocoa"],
  ["fractions pie", { kind: "fractions", bars: [{ parts: 6, a: 2, b: 1, shape: "pie" }, { parts: 3, a: 2, shape: "pie" }] }, "cocoa"],
  ["numberline", { kind: "numberline", min: 40, max: 50, step: 1, labelStep: 5, from: 47, to: 50 }, "rose"],
  ["numberline neg", { kind: "numberline", min: -10, max: 10, step: 1, labelStep: 5, from: -3, to: 4 }, "night"],
  ["places", { kind: "places", digits: "472,915", highlight: 1 }, "rose"],
  ["places decimal", { kind: "places", digits: "3.472", highlight: 3 }, "lime"],
  ["area", { kind: "area", tens: 30, ones: 4, by: 6 }, "teal"],
  ["rect", { kind: "rect", w: 6, h: 4, showW: true, showH: true, grid: true, unit: "cm" }, "tangerine"],
  ["rect missing", { kind: "rect", w: 9, h: 5, showW: true, showH: false, inside: "Area = 45 m²", grid: false, unit: "m" }, "tangerine"],
  ["polygon tri", { kind: "polygon", shape: "triangle", base: 10, height: 6, unit: "cm" }, "grape"],
  ["polygon trap", { kind: "polygon", shape: "trapezoid", base: 12, height: 5, top: 6, unit: "in" }, "grape"],
  ["box", { kind: "box", l: 4, w: 3, h: 2, unit: "cm", cubes: true }, "wave"],
  ["circle", { kind: "circle", r: 5, show: "radius", unit: "cm" }, "leaf"],
  ["angle line", { kind: "angle", mode: "line", angles: [65, 115] }, "tangerine"],
  ["angle tri", { kind: "angle", mode: "triangle", angles: [50, 70, 60] }, "tangerine"],
  ["angle around", { kind: "angle", mode: "around", angles: [90, 120, 150] }, "tangerine"],
  ["protractor", { kind: "protractor", angle: 130, scale: true }, "wave"],
  ["angle plain", { kind: "protractor", angle: 90, scale: false }, "wave"],
  ["lines", { kind: "lines", type: "perpendicular" }, "night"],
  ["shape", { kind: "shape", shape: "hexagon" }, "sun"],
  ["shapes", { kind: "shapes", shapes: ["circle", "triangle", "square", "cube", "cone", "cylinder", "sphere", "pyramid"] }, "sun"],
  ["bond", { kind: "bond", whole: 7, parts: [3, "?"] }, "leaf"],
  ["hundred", { kind: "hundred", highlight: [34], ask: 44 }, "wave"],
  ["hundredgrid", { kind: "hundredgrid", shaded: 35 }, "lime"],
  ["clock", { kind: "clock", h: 3, m: 40 }, "berry"],
  ["coins", { kind: "coins", coins: [25, 10, 10, 5, 1, 1, 100] }, "leaf"],
  ["ruler", { kind: "ruler", length: 7, unit: "cm", emoji: "✏️" }, "sun"],
  ["ruler in", { kind: "ruler", length: 3.5, unit: "in" }, "sun"],
  ["lengths", { kind: "lengths", items: [{ name: "Ribbon", length: 7 }, { name: "Rope", length: 4 }, { name: "Yarn", length: 9 }] }, "grape"],
  ["bars", { kind: "bars", title: "Favorite fruit", items: [{ label: "Apple", value: 6 }, { label: "Pear", value: 3 }, { label: "Plum", value: 8 }, { label: "Kiwi", value: 5 }], max: 10, step: 2 }, "wave"],
  ["pictograph", { kind: "pictograph", title: "Books read", items: [{ label: "Ana", emoji: "📚", count: 4 }, { label: "Ben", emoji: "📚", count: 2.5 }], key: 2 }, "teal"],
  ["dots", { kind: "dots", values: [1, 2, 2, 3, 3, 3, 4, 5, 5], min: 0, max: 6, label: "Pets per family" }, "rose"],
  ["dots frac", { kind: "dots", values: [0.25, 0.5, 0.5, 0.75, 1, 1.25], min: 0, max: 1.5 }, "rose"],
  ["grid", { kind: "grid", size: 6, quadrants: 1, points: [{ x: 2, y: 3, label: "A" }, { x: 5, y: 1, label: "B" }] }, "night"],
  ["grid4", { kind: "grid", size: 5, quadrants: 4, points: [{ x: -3, y: 2, label: "P" }, { x: 4, y: -1, label: "Q" }] }, "night"],
  ["table", { kind: "table", header: ["Cups", "Lemons"], rows: [[1, 3], [2, 6], [4, "?"]] }, "lime"],
  ["tape", { kind: "tape", rows: [{ label: "Boys", parts: 2 }, { label: "Girls", parts: 3 }], partValue: 4 }, "teal"],
  ["pattern", { kind: "pattern", items: ["🔴", "🔵", "🔴", "🔵", "?"] }, "sun"],
  ["marbles", { kind: "marbles", marbles: [{ colour: "wave", count: 3 }, { colour: "berry", count: 5 }, { colour: "sun", count: 2 }] }, "grape"],
  ["blocks 3-digit", { kind: "blocks", numbers: [234] }, "wave"],
  ["sequence", { kind: "sequence", numbers: [20, 25, 30], next: 35 }, "wave"],
  ["scene", { kind: "scene", items: [{ emoji: "🏠", x: 50, y: 55, size: 1.6 }, { emoji: "🐶", x: 56, y: 70, size: 0.9 }, { emoji: "🐦", x: 50, y: 18 }, { emoji: "🌳", x: 22, y: 52, behind: true, size: 1.3 }] }, "leaf"],
  ["pair", { kind: "pair", items: [{ emoji: "🦒", label: "Giraffe", size: 1.5 }, { emoji: "🐶", label: "Dog", size: 0.7 }] }, "sun"],
  ["objects circle", { kind: "objects", thing: apple, count: 9, layout: "circle" }, "berry"],
  ["objects scatter", { kind: "objects", thing: apple, count: 8, layout: "scatter" }, "berry"],
  ["shape turned", { kind: "shape", shape: "triangle", turn: 45, scale: 0.7 }, "grape"],
  ["boxplot", { kind: "boxplot", min: 2, q1: 5, median: 7, q3: 10, max: 14, axis: [0, 16], label: "Minutes to school" }, "teal"],
  ["plot", { kind: "plot", x: [-4, 4], y: [-2, 10], curves: [{ fn: (x) => x * x, label: "y = x²" }], lines: [{ from: [-1, -3], to: [4, 7], dashed: true }], points: [{ x: 1, y: 1, label: "(1, 1)" }] }, "night"],
  ["plot area", { kind: "plot", x: [0, 4], y: [0, 9], curves: [{ fn: (x) => 0.5 * x * x }], shade: { fn: (x) => 0.5 * x * x, from: 0, to: 3, rects: 6 } }, "night"],
  ["plot sine", { kind: "plot", x: [0, 6.3], y: [-2, 2], curves: [{ fn: (x) => Math.sin(x), label: "sin x" }, { fn: (x) => Math.cos(x), label: "cos x", dashed: true }] }, "grape"],
  ["plot limit", { kind: "plot", x: [-1, 5], y: [-1, 6], curves: [{ fn: (x) => (x < 2 ? x + 1 : 5 - x) }], points: [{ x: 2, y: 3, open: true }, { x: 2, y: 5 }] }, "wave"],
  ["unit circle", { kind: "unitcircle", angle: 150, show: ["sin", "cos"] }, "grape"],
  ["right triangle", { kind: "righttri", a: 3, b: 4, c: "?", angle: null, unit: "cm" }, "tangerine"],
  ["right triangle angle", { kind: "righttri", a: "?", b: 10, c: null, angle: 35, unit: "m" }, "tangerine"],
  ["numberline thirds", { kind: "numberline", min: 0, max: 2, step: 1 / 3, labelStep: 1 / 3, from: 4 / 3, to: 4 / 3, fractions: 3, hideFrom: true }, "berry"],
  ["area 2x2", { kind: "area", tens: 40, ones: 6, by: 23, split: [20, 3] }, "teal"],
  ["rects", { kind: "rects", items: [{ w: 6, h: 2, label: "A" }, { w: 4, h: 3, label: "B" }], unit: "m", grid: true }, "lime"],
  ["lshape", { kind: "lshape", w: 7, h: 5, cutW: 3, cutH: 2, unit: "cm", grid: true }, "lime"],
  ["ray", { kind: "lines", type: "ray" }, "grape"],
  ["segment", { kind: "lines", type: "segment" }, "grape"],
  ["jug", { kind: "jug", amount: 3, max: 5, unit: "L" }, "wave"],
  ["scale", { kind: "scale", amount: 750, max: 1000, unit: "g", emoji: "🍉" }, "tangerine"],
  ["angle parts", { kind: "angle", mode: "parts", angles: [35, 50] }, "grape"],
  ["share leftover", { kind: "share", thing: apple, groups: 3, each: 4, left: 2 }, "rose"],
  ["spinner", { kind: "spinner", sections: [{ colour: "berry", label: "A" }, { colour: "wave", label: "B" }, { colour: "sun", label: "C" }, { colour: "leaf", label: "D" }] }, "grape"],
  ["tree", { kind: "tree", stages: [["H", "T"], ["1", "2", "3"]] }, "wave"],
  ["net cube", { kind: "net", solid: "cube" }, "teal"],
  ["net prism", { kind: "net", solid: "prism", l: 4, w: 2, h: 3, unit: "cm" }, "teal"],
  ["net tri", { kind: "net", solid: "triangular-prism", l: 4, w: 2, h: 3 }, "teal"],
  ["net pyramid", { kind: "net", solid: "pyramid", l: 3, h: 2 }, "teal"],
  ["slice", { kind: "slice", solid: "cylinder", cut: "horizontal" }, "berry"],
  ["slice cube diag", { kind: "slice", solid: "cube", cut: "diagonal" }, "berry"],
  ["inequality", { kind: "numberline", min: -2, max: 8, step: 1, labelStep: 1, from: 3, to: 3, ray: { at: 3, dir: "right", open: true } }, "night"],
  ["dots compare", { kind: "dots", values: [1, 2, 2, 3, 4], min: 0, max: 6, label: "Class A", second: { values: [2, 3, 3, 4, 5, 5], label: "Class B" } }, "rose"],
  ["boxplot compare", { kind: "boxplot", min: 2, q1: 4, median: 6, q3: 9, max: 12, axis: [0, 14], label: "Team A", second: { min: 3, q1: 6, median: 8, q3: 10, max: 13, label: "Team B" } }, "teal"],
  ["house + tri prism", { kind: "shapes", shapes: ["house", "triangular-prism"] }, "sun"],
  ["venn", { kind: "venn", labels: ["Soccer", "Chess"], left: 12, both: "?", right: 7, outside: 4 }, "rose"],
  ["triangle", { kind: "triangle", shape: [40, 75, 65], sides: [12, "?", null], angles: [40, 75, null], unit: "cm" }, "grape"],
  ["triangle obtuse", { kind: "triangle", shape: [25, 120, 35], sides: [null, "?", 9], angles: [null, 120, null], unit: "m" }, "tangerine"],
  ["triangle right", { kind: "triangle", shape: [30, 60, 90], sides: [5, "5√3", 10], angles: [30, 60, null] }, "teal"],
  ["circle inscribed", { kind: "circleparts", points: [{ name: "A", at: 200 }, { name: "B", at: 330 }, { name: "C", at: 100 }], segments: [{ from: "C", to: "A" }, { from: "C", to: "B" }, { from: "O", to: "A" }, { from: "O", to: "B" }], angles: [{ at: "C", from: "A", to: "B", label: "?" }, { at: "O", from: "B", to: "A", label: 130 }] }, "wave"],
  ["circle tangent", { kind: "circleparts", points: [{ name: "T", at: 60 }, { name: "P", at: 0, r: 2 }], segments: [{ from: "O", to: "T", label: 5 }, { from: "P", to: "T", label: "?" }, { from: "O", to: "P", label: 13 }], tangents: [{ at: "T" }], unit: "cm" }, "leaf"],
  ["circle secant", { kind: "circleparts", points: [{ name: "P", at: 10, r: 1.9 }, { name: "A", at: 25 }, { name: "B", at: 160 }, { name: "C", at: -20 }, { name: "D", at: 230 }], segments: [{ from: "P", to: "B", extend: true }, { from: "P", to: "D", extend: true }], arcs: [{ from: "C", to: "A", label: 45 }, { from: "B", to: "D", label: 115 }] }, "berry"],
  ["matrix", { kind: "matrix", items: [{ name: "A", rows: [[2, -1], [0, 3]] }, "×", { rows: [[4], [5]] }, "=", { rows: [["?"], [15]] }] }, "night"],
  ["transversal", { kind: "transversal", tilt: 62, labels: ["1", "2", "3", "4", "5", "6", "7", "8"] }, "tangerine"],
  ["transversal values", { kind: "transversal", tilt: 65, labels: [null, 65, null, null, null, "?", null, null] }, "grape"],
  ["cylinder", { kind: "solid", solid: "cylinder", r: 3, h: 8, unit: "cm" }, "wave"],
  ["cone", { kind: "solid", solid: "cone", r: 6, h: "?", slant: 10, unit: "in" }, "sun"],
  ["sphere", { kind: "solid", solid: "sphere", r: "?", unit: "m" }, "leaf"],
  ["hemisphere", { kind: "solid", solid: "hemisphere", r: 12, diameter: true, unit: "ft" }, "teal"],
  ["tree probs", { kind: "tree", stages: [["R", "B"], ["R", "B"]], probs: [["3/5", "2/5"], ["2/4", "2/4", "3/4", "1/4"]] }, "berry"],
  ["plot axis titles", { kind: "plot", x: [0, 10], y: [0, 40], xLabel: "time (s)", yLabel: "position (m)", lines: [{ from: [0, 0], to: [10, 35] }], points: [{ x: 4, y: 14, label: "(4, 14)" }] }, "wave"],
  ["plot between", { kind: "plot", x: [-1, 3], y: [-1, 5], curves: [{ fn: (x) => 2 * x }, { fn: (x) => x * x }], shade: { fn: (x) => 2 * x, fn2: (x) => x * x, from: 0, to: 2 } }, "night"],
  ["plot inequality", { kind: "plot", x: [-5, 5], y: [-5, 5], regions: [{ fn: (x) => 0.5 * x + 1, side: "above", strict: true }, { fn: (x) => -x + 2, side: "below" }] }, "wave"],
];

const activities: [string, Activity, Colour][] = [
  ["fillFrame", { kind: "fillFrame", target: 7, frames: 1 }, "leaf"],
  ["buildBlocks", { kind: "buildBlocks", target: 234, fewest: true }, "wave"],
  ["makeMoney", { kind: "makeMoney", cents: 65, coins: [25, 10, 5, 1], fewest: true }, "leaf"],
  ["setClock", { kind: "setClock", h: 3, m: 45, snap: 5 }, "berry"],
  ["placeOnLine", { kind: "placeOnLine", min: 0, max: 2, step: 0.25, labelStep: 1, target: 0.75, fractions: 4 }, "cocoa"],
  ["makeLength", { kind: "makeLength", length: 3.5, unit: "in", sub: 4 }, "sun"],
  ["plotPoints", { kind: "plotPoints", points: [{ x: 3, y: -2, label: "A" }, { x: -1, y: 4, label: "B" }], size: 5, quadrants: 4 }, "night"],
  ["makeAngle", { kind: "makeAngle", degrees: 120, scale: true }, "grape"],
  ["shade bar", { kind: "shade", parts: 8, target: 3, shape: "bar" }, "cocoa"],
  ["shade pie", { kind: "shade", parts: 6, target: 4, shape: "pie" }, "rose"],
  ["cut", { kind: "cut", shape: "circle", parts: 4 }, "tangerine"],
  ["cut grid", { kind: "cut", shape: "rect", rows: 2, cols: 3 }, "lime"],
  ["barGraph", { kind: "barGraph", title: "Pets", items: [{ label: "Cats", value: 4 }, { label: "Dogs", value: 6 }, { label: "Fish", value: 2 }], max: 8, step: 1 }, "wave"],
  ["dotPlot", { kind: "dotPlot", values: [1, 2, 2, 3, 3, 3, 5], min: 0, max: 6, step: 1, label: "Books read" }, "rose"],
  ["sort", { kind: "sort", bins: ["Even", "Odd"], items: [{ label: "4", bin: 0 }, { label: "7", bin: 1 }, { label: "10", bin: 0 }, { label: "13", bin: 1 }, { label: "8", bin: 0 }] }, "teal"],
  ["order", { kind: "order", items: ["0.05", "0.4", "0.45", "0.5"], direction: "Smallest to largest" }, "lime"],
  ["drawShape rect", { kind: "drawShape", size: 6, sides: 4, rightAngles: 4, area: 12 }, "tangerine"],
  ["drawShape tri", { kind: "drawShape", size: 6, sides: 3, rightAngles: 1 }, "grape"],
  ["drawShape trapezoid", { kind: "drawShape", size: 6, sides: 4, parallelPairs: 1 }, "grape"],
  ["buildArray", { kind: "buildArray", rows: 3, cols: 5 }, "grape"],
  ["drawLine", { kind: "drawLine", m: 0.5, b: 1, size: 5, quadrants: 4 }, "night"],
  ["trace", { kind: "trace", text: "7" }, "sun"],
  ["drawFigure ray", { kind: "drawFigure", figure: "ray", size: 6 }, "grape"],
  ["drawFigure perpendicular", { kind: "drawFigure", figure: "perpendicular", size: 6 }, "grape"],
  ["symmetryLine", { kind: "symmetryLine", points: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 4 }, { x: 3, y: 6 }, { x: 1, y: 4 }], size: 6 }, "teal"],
];

const hats: Hat[] = ["none", "bow", "party", "crown", "hardhat", "chef", "glasses", "gradcap", "cap", "wizard"];

function Gallery() {
  const solved = location.search.includes("solved");
  return (
    <div style={{ padding: 16, display: "grid", gap: 20, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {hats.map((h, i) => (
          <Can key={h} hat={h} mood={i % 2 ? "happy" : "idle"} color={["berry", "leaf", "wave", "grape", "teal"][i % 5]} size={80} count={i} />
        ))}
      </div>
      <div style={worldStyle("cocoa")}>
        <Equation tokens={[{ n: 2, d: 7 }, "+", { n: 3, d: 7 }, "=", { n: "?", d: 7 }]} fill="" state="asking" />
        <Equation tokens={[{ pow: [2, 5] }, "=", "?"]} fill="32" state="correct" />
        <Equation tokens={[{ x: 3 }, "+", 4, "=", 19]} fill="" state="asking" />
        <Equation tokens={["x", "=", "?"]} fill="5" state="asking" />
        <Equation tokens={[25, "%", "of", 80, "=", "?"]} fill="" state="asking" unit="" />
        <Equation tokens={[{ w: 2, n: 1, d: 3 }, "+", { w: 1, n: 1, d: 3 }, "=", "?"]} fill="" state="asking" />
        <Equation tokens={["(", 3, "+", 4, ")", "×", 2, "=", "?"]} fill="" state="wrong" />
        <Equation tokens={[45000, "+", 12500, "=", "?"]} fill="" state="asking" />
        <Equation tokens={["?"]} fill="12" state="asking" unit="cm²" />
        <div className="choices choices-4 choices-text">
          {["3/4", "2 1/3", "acute", "(3, −2)"].map((l, i) => (
            <button key={l} className={`choice tile-${i}`}>
              <LabelText text={l} />
            </button>
          ))}
        </div>
        <Keypad value="3.5" onChange={() => {}} onCheck={() => {}} disabled={false} extra="." />
      </div>
      <h2>Activities</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {[...activities, ...PHYSICS_ACTIVITIES, ...CHEMISTRY_ACTIVITIES].map(([name, act, c]) => (
          <section key={name} id={`act-${name}`} style={worldStyle(c)}>
            <h3 style={{ margin: "0 0 8px" }}>{name}</h3>
            <div className="play" style={{ minHeight: 0, padding: 12 }}>
              <ActivityStage
                activity={act}
                solved={solved}
                locked={false}
                onSubmit={(ok) => {
                  document.getElementById(`act-${name}`)!.dataset.result = ok ? "right" : "wrong";
                  document.getElementById(`act-${name}`)!.querySelector("h3")!.textContent = `${name}: ${ok ? "✅ right" : "❌ not yet"}`;
                }}
              />
            </div>
          </section>
        ))}
      </div>
      <h2>Visuals</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
      {[...samples, ...PHYSICS_VISUALS, ...CHEMISTRY_VISUALS].map(([name, v, c]) => (
        <section key={name} id={name.replace(/\s/g, "-")} style={worldStyle(c)}>
          <h3 style={{ margin: "0 0 8px" }}>{name}</h3>
          <div className="play" style={{ minHeight: 0, padding: 12 }}>
            <Visual v={v} hint={false} reveal={solved} solved={solved} answer="42" />
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}

// ?theme=dark shows every picture in night mode.
document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") ?? "light";

createRoot(document.getElementById("root")!).render(<Gallery />);
