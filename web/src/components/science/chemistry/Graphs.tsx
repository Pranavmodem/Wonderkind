/** Chemistry graphs: energy profiles, heating curves, the pH scale, spectra and titration curves. */
import type { ReactNode } from "react";
import type { ChemistryVisual } from "../../../game/science/chemistryTypes";
import type { Mark } from "../../../game/types";
import { num } from "../../visuals/NumberVisuals";
import { askClass, FormulaSvg, shownMark } from "./Formula";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

const W = 340;
const L = 46;
const R = 330;
const T = 18;
const B = 198;

function Arrowheads() {
  return (
    <defs>
      <marker id="chem-g-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" className="chem-arrowhead" />
      </marker>
    </defs>
  );
}

function Axes({ x, y, h = 240 }: { x: string; y: string; h?: number }) {
  return (
    <g>
      <line x1={L} y1={B} x2={R} y2={B} className="chem-axis" markerEnd="url(#chem-g-arrow)" />
      <line x1={L} y1={B} x2={L} y2={T - 4} className="chem-axis" markerEnd="url(#chem-g-arrow)" />
      <text x={(L + R) / 2} y={h - 6} className="chem-axis-title">
        {x}
      </text>
      <text x={0} y={0} transform={`translate(16 ${(T + B) / 2}) rotate(-90)`} className="chem-axis-title">
        {y}
      </text>
    </g>
  );
}

/** A Mark (or formula) written at a point; formulas get subscripts. */
function Label({ m, x, y, solved, answer, unit = "", anchor = "middle", cls = "chem-g-label" }: { m: Mark | undefined; x: number; y: number; solved: boolean; answer: string; unit?: string; anchor?: "start" | "middle" | "end"; cls?: string }) {
  if (m === null || m === undefined) return null;
  const text = shownMark(m, solved, answer, unit);
  if (m === "?") return <text x={x} y={y} style={{ textAnchor: anchor }} className={`${cls}${askClass(m, solved)}`}>{text}</text>;
  return <FormulaSvg f={text} x={x} y={y} size={15} anchor={anchor} className={cls} />;
}

/* ----------------------------------------------------------- energy profile */

export function EnergyProfile({ v, solved, answer }: { v: Of<"chem-energy"> & { mode: "profile" }; solved: boolean; answer: string }) {
  const peaks = v.peaks ?? [v.peak ?? Math.max(v.reactants, v.products) + 10];
  const valleys = v.valleys ?? [];
  const levels = [v.reactants, v.products, ...peaks, ...valleys, ...(v.catalyst !== undefined ? [v.catalyst] : [])];
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const pad = (hi - lo) * 0.18 || 10;
  const yOf = (e: number) => B - 26 - ((e - lo) / (hi - lo + pad)) * (B - T - 40);
  const x0 = L + 10;
  const x1 = L + 58;
  const x3 = R - 8;
  const x2 = R - 64;
  // Key points: reactants, then peak/valley alternating, then products.
  const pts: { x: number; y: number }[] = [{ x: x1, y: yOf(v.reactants) }];
  const n = peaks.length;
  const span = x2 - x1;
  peaks.forEach((pk, i) => {
    pts.push({ x: x1 + (span * (2 * i + 1)) / (2 * n), y: yOf(pk) });
    if (i < valleys.length) pts.push({ x: x1 + (span * (2 * i + 2)) / (2 * n), y: yOf(valleys[i]) });
  });
  pts.push({ x: x2, y: yOf(v.products) });
  const curve = (points: { x: number; y: number }[]) => {
    let d = `M${x0} ${points[0].y} L${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const k = (b.x - a.x) * 0.45;
      d += ` C${a.x + k} ${a.y} ${b.x - k} ${b.y} ${b.x} ${b.y}`;
    }
    return `${d} L${x3} ${points[points.length - 1].y}`;
  };
  const labels = v.labels ?? {};
  const peakPt = pts.reduce((m, p) => (p.y < m.y ? p : m), pts[0]);
  const showEa = v.showEa ?? true;
  const showDH = v.showDH ?? true;
  const yR = yOf(v.reactants);
  const yP = yOf(v.products);
  const eaX = peakPt.x - 26;
  const dhX = x2 + 30;
  const catPts = v.catalyst !== undefined ? [pts[0], { x: (x1 + x2) / 2, y: yOf(v.catalyst) }, pts[pts.length - 1]] : null;
  return (
    <svg className="chem-graph" viewBox={`0 0 ${W} 244`} role="img" aria-hidden="true">
      <Arrowheads />
      <Axes x={v.xLabel ?? "Reaction progress"} y={v.yLabel ?? "Energy"} />
      {catPts && <path d={curve(catPts)} className="chem-curve dashed" />}
      <path d={curve(pts)} className="chem-curve" />
      <Label m={labels.reactants} x={(x0 + x1) / 2 + 6} y={yR - 9} solved={solved} answer={answer} />
      <Label m={labels.products} x={(x2 + x3) / 2 - 4} y={yP - 9} solved={solved} answer={answer} />
      {showEa && (
        <g>
          <line x1={x1 - 6} y1={yR} x2={eaX + 8} y2={yR} className="chem-guide" />
          <line x1={eaX} y1={yR} x2={eaX} y2={peakPt.y + 3} className="chem-g-arrow" markerEnd="url(#chem-g-arrow)" />
          <Label m={labels.ea === undefined ? "Ea" : labels.ea} x={eaX - 6} y={(yR + peakPt.y) / 2 + 5} anchor="end" solved={solved} answer={answer} unit=" kJ" cls="chem-g-label strong" />
        </g>
      )}
      {showDH && Math.abs(yR - yP) > 6 && (
        <g>
          <line x1={x1} y1={yR} x2={dhX + 6} y2={yR} className="chem-guide" />
          <line x1={dhX} y1={yR} x2={dhX} y2={yP + (yP > yR ? -3 : 3)} className="chem-g-arrow dh" markerEnd="url(#chem-g-arrow)" />
          <Label m={labels.dH === undefined ? "ΔH" : labels.dH} x={dhX + 6} y={(yR + yP) / 2 + 5} anchor="start" solved={solved} answer={answer} unit=" kJ" cls="chem-g-label strong" />
        </g>
      )}
      {catPts && labels.catalyst !== null && (
        <g>
          <line x1={R - 112} x2={R - 90} y1={T + 4} y2={T + 4} className="chem-curve dashed" />
          <Label m={labels.catalyst ?? "with catalyst"} x={R - 86} y={T + 9} anchor="start" solved={solved} answer={answer} cls="chem-g-label soft" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ heating curve */

export function HeatingCurve({ v, solved, answer }: { v: Of<"chem-energy"> & { mode: "heating" }; solved: boolean; answer: string }) {
  const widths = v.widths ?? [2, 3, 2, 4, 2];
  const total = widths.reduce((a, b) => a + b, 0);
  const tMin = Math.min(v.start, v.end);
  const tMax = Math.max(v.start, v.end);
  const yOf = (t: number) => B - 12 - ((t - tMin) / (tMax - tMin)) * (B - T - 28);
  const temps = v.cooling ? [v.start, v.boil, v.boil, v.melt, v.melt, v.end] : [v.start, v.melt, v.melt, v.boil, v.boil, v.end];
  const xs = [L + 6];
  widths.forEach((w) => xs.push(xs[xs.length - 1] + ((R - 16 - L) * w) / total));
  const pts = temps.map((t, i) => ({ x: xs[i], y: yOf(t) }));
  const names = v.cooling ? ["gas", "condensing", "liquid", "freezing", "solid"] : ["solid", "melting", "liquid", "boiling", "gas"];
  const labels = v.labels ?? (names as [Mark, Mark, Mark, Mark, Mark]);
  const showTemps = v.temps ?? true;
  return (
    <svg className="chem-graph" viewBox={`0 0 ${W} 244`} role="img" aria-hidden="true">
      <Arrowheads />
      <Axes x={v.cooling ? "Time (heat removed)" : "Time (heat added)"} y="Temperature (°C)" />
      {v.title && (
        <text x={(L + R) / 2} y={14} className="chem-g-title">
          {v.title}
        </text>
      )}
      {[v.melt, v.boil].map((t, i) => (
        <g key={i}>
          <line x1={L} x2={R - 10} y1={yOf(t)} y2={yOf(t)} className="chem-guide" />
          {showTemps && (
            <text x={L - 5} y={yOf(t) + 5} className={`chem-tick-text end${showTemps === "?" && !solved ? " ask" : ""}`}>
              {showTemps === "?" && !solved ? "?" : num(t)}
            </text>
          )}
        </g>
      ))}
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} className="chem-curve" />
      {labels.map((m, i) => {
        if (m === null) return null;
        const a = pts[i];
        const b = pts[i + 1];
        const flat = Math.abs(a.y - b.y) < 1;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <text key={i} x={flat ? mx : mx + (v.cooling ? -10 : 10)} y={flat ? my - 9 : my + 14} style={{ textAnchor: flat ? "middle" : v.cooling ? "end" : "start" }} className={`chem-g-label${flat ? " strong" : ""}${askClass(m, solved)}`}>
            {shownMark(m, solved, answer)}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------------- pH scale */

/** Universal indicator colours for pH 0–14. */
export const PH_COLOURS = ["#e2262b", "#ec4a25", "#f37a21", "#f8a21c", "#fbc916", "#efe31f", "#bcd531", "#6fbd45", "#38a85a", "#16a08b", "#1d8dc4", "#3d64ae", "#584b9c", "#6a3d92", "#4c2b79"];

export function PhScale({ v, solved, answer }: { v: Of<"chem-ph">; solved: boolean; answer: string }) {
  const x0 = 12;
  const cw = 21.1;
  const sy = 112;
  const xOf = (ph: number) => x0 + cw * (ph + 0.5);
  const markers = [...(v.markers ?? [])].sort((a, b) => a.pH - b.pH);
  const regions = v.regions ?? true;
  return (
    <svg className="chem-graph" viewBox={`0 0 ${W} ${regions ? 196 : 160}`} role="img" aria-hidden="true">
      {PH_COLOURS.map((c, i) => (
        <rect key={i} x={x0 + i * cw} y={sy} width={cw + 0.5} height={34} style={{ fill: c }} className={i === 0 ? "chem-ph-cell first" : "chem-ph-cell"} />
      ))}
      <rect x={x0} y={sy} width={cw * 15} height={34} rx={8} className="chem-ph-frame" />
      {(v.numbers ?? true) &&
        PH_COLOURS.map((_, i) => (
          <text key={i} x={xOf(i)} y={sy + 23} className={`chem-ph-num${i >= 5 && i <= 8 ? " dark" : ""}`}>
            {i}
          </text>
        ))}
      {markers.map((m, i) => {
        const row = i % 2;
        const ly = row ? 30 : 66;
        const x = Math.min(R - 20, Math.max(30, xOf(m.pH)));
        const text = shownMark(m.label, solved, answer);
        return (
          <g key={i}>
            <line x1={xOf(m.pH)} y1={sy - 2} x2={x} y2={ly + 8} className="chem-ph-pointer" />
            <path d={`M${xOf(m.pH) - 6} ${sy - 10} L${xOf(m.pH) + 6} ${sy - 10} L${xOf(m.pH)} ${sy - 1} Z`} className="chem-ph-tip" />
            {m.emoji && (
              <text x={x} y={ly - 10} className="chem-ph-emoji">
                {m.emoji}
              </text>
            )}
            <text x={x} y={ly + 4} className={`chem-ph-label${askClass(m.label, solved)}`}>
              {text}
            </text>
          </g>
        );
      })}
      {regions && (
        <g className="chem-ph-regions">
          <path d={`M${x0 + 2} ${sy + 44} v6 h${cw * 7 - 6} v-6`} />
          <path d={`M${x0 + cw * 8 + 4} ${sy + 44} v6 h${cw * 7 - 6} v-6`} />
          <text x={x0 + cw * 3.5} y={sy + 70} className="chem-ph-region acid">
            Acid
          </text>
          <text x={xOf(7)} y={sy + 70} className="chem-ph-region neutral">
            Neutral
          </text>
          <text x={x0 + cw * 11.5} y={sy + 70} className="chem-ph-region base">
            Base
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------------------------------------------------------------- spectra */

/** Approximate colour of light of a wavelength (380–750 nm). */
export function wavelengthColour(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, g, b] = [-(nm - 440) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, -(nm - 510) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, -(nm - 645) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (750 - nm)) / 50 : 1;
  const c = (x: number) => Math.round(255 * Math.max(0, Math.min(1, x * f)) ** 0.8);
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

export function SpectrumView({ v, solved, answer }: { v: Of<"chem-spectrum">; solved: boolean; answer: string }) {
  let body: ReactNode;
  if (v.mode === "mass") {
    const mzs = v.peaks.map((p) => p.mz);
    const [a, b] = v.range ?? [Math.floor(Math.min(...mzs)) - 2, Math.ceil(Math.max(...mzs)) + 2];
    const xOf = (m: number) => L + 10 + ((m - a) / (b - a)) * (R - L - 20);
    const top = Math.max(...v.peaks.map((p) => p.percent));
    const yMax = top > 60 ? 100 : niceTop(top);
    const yOf = (p: number) => B - (p / yMax) * (B - T - 26);
    const step = b - a > 16 ? Math.ceil((b - a) / 10) : 1;
    body = (
      <>
        <Axes x="Mass / charge (m/z)" y="Abundance (%)" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L - 4} x2={L} y1={yOf(yMax * f)} y2={yOf(yMax * f)} className="chem-axis" />
            <text x={L - 6} y={yOf(yMax * f) + 4} className="chem-tick-text end">
              {num(yMax * f)}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step).map((m) => (
          <text key={m} x={xOf(m)} y={B + 15} className="chem-tick-text">
            {m}
          </text>
        ))}
        {v.peaks.map((p, i) => (
          <g key={i}>
            <rect x={xOf(p.mz) - 5} y={yOf(p.percent)} width={10} height={B - yOf(p.percent)} rx={3} className="chem-bar" />
            <text x={xOf(p.mz)} y={yOf(p.percent) - 7} className={`chem-g-label strong${askClass(p.label, solved)}`}>
              {p.label === undefined ? `${num(p.percent)}%` : shownMark(p.label, solved, answer)}
            </text>
          </g>
        ))}
      </>
    );
  } else if (v.mode === "pes") {
    const logs = v.peaks.map((p) => Math.log10(p.energy));
    const hi = Math.max(...logs) + 0.25;
    const lo = Math.min(...logs) - 0.25;
    // Binding energy decreases to the right.
    const xOf = (e: number) => L + 14 + ((hi - Math.log10(e)) / (hi - lo)) * (R - L - 28);
    const maxE = Math.max(...v.peaks.map((p) => p.electrons));
    const yScale = (B - T - 40) / Math.max(6, maxE);
    const path = (() => {
      let d = `M${L} ${B}`;
      for (let x = L; x <= R - 4; x += 2) {
        let y = 0;
        for (const p of v.peaks) {
          const dx = (x - xOf(p.energy)) / 5.5;
          y += p.electrons * yScale * Math.exp(-dx * dx);
        }
        d += ` L${x} ${B - y}`;
      }
      return d;
    })();
    body = (
      <>
        <Axes x="Binding energy (MJ/mol)  ← higher" y="Relative number of electrons" />
        <path d={path} className="chem-curve fill" />
        {(() => {
          // Stagger energy numbers that would bump into each other.
          let lastX = -99;
          let row = 0;
          return [...v.peaks]
            .sort((a, b) => xOf(a.energy) - xOf(b.energy))
            .map((p, i) => {
              const x = xOf(p.energy);
              row = x - lastX < 34 ? 1 - row : 0;
              lastX = x;
              return (
                <g key={i}>
                  <text x={x} y={B - p.electrons * yScale - 8} className={`chem-g-label strong${askClass(p.label, solved)}`}>
                    {p.label === undefined ? "" : shownMark(p.label, solved, answer)}
                  </text>
                  <text x={x} y={B + 15 + row * 12} className="chem-tick-text">
                    {num(p.energy)}
                  </text>
                </g>
              );
            });
        })()}
      </>
    );
  } else {
    const xOf = (nm: number) => L - 30 + ((nm - 380) / 370) * (R - L + 24);
    const emission = v.mode === "emission";
    const gradient = Array.from({ length: 38 }, (_, i) => 380 + i * 10);
    body = (
      <>
        <defs>
          <linearGradient id="chem-rainbow" x1="0" x2="1" y1="0" y2="0">
            {gradient.map((nm, i) => (
              <stop key={nm} offset={i / (gradient.length - 1)} stopColor={wavelengthColour(nm)} />
            ))}
          </linearGradient>
        </defs>
        <rect x={xOf(380)} y={60} width={xOf(750) - xOf(380)} height={80} rx={8} style={{ fill: emission ? "#111522" : "url(#chem-rainbow)" }} />
        {v.lines.map((l, i) => (
          <g key={i}>
            <rect x={xOf(l.nm) - 2} y={60} width={4} height={80} style={{ fill: emission ? wavelengthColour(l.nm) : "#111522" }} className={emission ? "chem-line-glow" : ""} />
            <text x={xOf(l.nm)} y={50 - (i % 2) * 15} className={`chem-g-label strong${askClass(l.label, solved)}`}>
              {l.label === undefined ? num(l.nm) : shownMark(l.label, solved, answer)}
            </text>
          </g>
        ))}
        {[400, 500, 600, 700].map((nm) => (
          <g key={nm}>
            <line x1={xOf(nm)} x2={xOf(nm)} y1={142} y2={150} className="chem-axis" />
            <text x={xOf(nm)} y={166} className="chem-tick-text">
              {nm}
            </text>
          </g>
        ))}
        <text x={(L + R) / 2} y={192} className="chem-axis-title">
          Wavelength (nm)
        </text>
      </>
    );
  }
  return (
    <svg className="chem-graph" viewBox={`0 0 ${W} 244`} role="img" aria-hidden="true">
      <Arrowheads />
      {v.title && (
        <text x={(L + R) / 2} y={14} className="chem-g-title">
          {v.title}
        </text>
      )}
      {body}
    </svg>
  );
}

const niceTop = (x: number) => [10, 20, 25, 40, 50, 60, 80, 100].find((n) => n >= x) ?? 100;

/* ------------------------------------------------------------- titration */

const KW = 1e-14;

/** pH after adding `added` mL of titrant, from charge balance (solved by bisection). */
export function titrationPH(v: { analyte: "acid" | "base"; pK?: number; conc: number; volume: number; titrantConc: number }, added: number): number {
  const vt = v.volume + added;
  const analyte = (v.conc * v.volume) / vt;
  const titrant = (v.titrantConc * added) / vt;
  const K = v.pK === undefined ? 1e8 : 10 ** -v.pK;
  const f = (h: number) => {
    if (v.analyte === "acid") return h + titrant - (analyte * K) / (K + h) - KW / h;
    const ka = KW / K;
    return h + (analyte * h) / (h + ka) - KW / h - titrant;
  };
  let lo = -15;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(10 ** mid) > 0) hi = mid;
    else lo = mid;
  }
  return -(lo + hi) / 2;
}

export function TitrationCurve({ v, solved, answer }: { v: Of<"chem-titration"> & { mode: "curve" }; solved: boolean; answer: string }) {
  const veq = (v.conc * v.volume) / v.titrantConc;
  const vmax = v.maxVolume ?? niceTopVolume(veq * 2);
  const xOf = (ml: number) => L + (ml / vmax) * (R - L - 8);
  const yOf = (ph: number) => B - (ph / 14) * (B - T - 4);
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const ml = (vmax * i) / 160;
    pts.push(`${xOf(ml)},${yOf(titrationPH(v, ml))}`);
  }
  const weak = v.pK !== undefined;
  const eqPH = titrationPH(v, veq);
  const halfPH = titrationPH(v, veq / 2);
  const showEq = v.equivalence ?? true;
  const showHalf = v.halfEquivalence ?? weak;
  const showBuffer = v.buffer ?? weak;
  const eqLabel = typeof showEq === "boolean" ? "Equivalence point" : shownMark(showEq, solved, answer);
  const halfLabel = typeof showHalf === "boolean" ? (v.analyte === "acid" ? "pH = pKa" : "pOH = pKb") : shownMark(showHalf, solved, answer);
  const ticks = niceStepVol(vmax);
  return (
    <svg className="chem-graph" viewBox={`0 0 ${W} 244`} role="img" aria-hidden="true">
      <Arrowheads />
      <Axes x={`Volume of ${v.analyte === "acid" ? "base" : "acid"} added (mL)`} y="pH" />
      {v.indicator && (
        <g>
          <rect x={L + 1} y={yOf(v.indicator.to)} width={R - L - 8} height={yOf(v.indicator.from) - yOf(v.indicator.to)} style={{ fill: `var(--${v.indicator.colour})` }} className="chem-band" />
          {v.indicator.label && (
            <text x={R - 10} y={yOf(v.indicator.to) - 4} className="chem-g-label soft end" style={{ textAnchor: "end" }}>
              {v.indicator.label}
            </text>
          )}
        </g>
      )}
      {showBuffer && (
        <g>
          <rect x={xOf(veq * 0.1)} y={T} width={xOf(veq * 0.9) - xOf(veq * 0.1)} height={B - T} className="chem-buffer" />
          <text x={(xOf(veq * 0.1) + xOf(veq * 0.9)) / 2} y={T + 14} className="chem-g-label soft">
            Buffer region
          </text>
        </g>
      )}
      {[0, 2, 4, 6, 8, 10, 12, 14].map((ph) => (
        <text key={ph} x={L - 6} y={yOf(ph) + 4} className="chem-tick-text end">
          {ph}
        </text>
      ))}
      {Array.from({ length: Math.floor(vmax / ticks) + 1 }, (_, i) => i * ticks).map((ml) => (
        <text key={ml} x={xOf(ml)} y={B + 15} className="chem-tick-text">
          {num(ml)}
        </text>
      ))}
      <polyline points={pts.join(" ")} className="chem-curve" />
      {showEq !== false && (
        <g>
          <line x1={xOf(veq)} x2={xOf(veq)} y1={B} y2={yOf(eqPH)} className="chem-guide" />
          <circle cx={xOf(veq)} cy={yOf(eqPH)} r={6} className="chem-point" />
          <text x={xOf(veq) + 10} y={yOf(eqPH) + 5} style={{ textAnchor: "start" }} className={`chem-g-label strong${askClass(typeof showEq === "boolean" ? undefined : showEq, solved)}`}>
            {eqLabel}
          </text>
        </g>
      )}
      {showHalf !== false && (
        <g>
          <line x1={L} x2={xOf(veq / 2)} y1={yOf(halfPH)} y2={yOf(halfPH)} className="chem-guide" />
          <line x1={xOf(veq / 2)} x2={xOf(veq / 2)} y1={B} y2={yOf(halfPH)} className="chem-guide" />
          <circle cx={xOf(veq / 2)} cy={yOf(halfPH)} r={5} className="chem-point soft" />
          <text x={xOf(veq / 2) + 2} y={yOf(halfPH) + (v.analyte === "acid" ? 20 : -10)} style={{ textAnchor: "start" }} className={`chem-g-label${askClass(typeof showHalf === "boolean" ? undefined : showHalf, solved)}`}>
            {halfLabel}
          </text>
        </g>
      )}
    </svg>
  );
}

const niceTopVolume = (x: number) => {
  const s = x <= 20 ? 5 : x <= 60 ? 10 : 20;
  return Math.ceil(x / s) * s;
};
const niceStepVol = (vmax: number) => (vmax <= 20 ? 5 : vmax <= 60 ? 10 : 20);
