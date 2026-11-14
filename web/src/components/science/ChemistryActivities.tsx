import { Fragment, useEffect, useState } from "react";
import type { ChemistryActivity } from "../../game/science/chemistryTypes";
import { balance, moleculeBuildable, sideAtoms } from "../../game/science/chemistryValidate";
import { bohrShells, chargeText, element, parseFormula, valenceElectrons } from "../../game/science/elements";
import { sfx } from "../../game/sound";
import { dragHandlers, range, snap, useReport, type ActivityProps } from "../activities/shared";
import { num } from "../visuals/NumberVisuals";
import { BohrSvg, IsotopeText } from "./chemistry/Atoms";
import { AtomBall, FormulaHtml } from "./chemistry/Formula";
import { GlassSvg, glassLevels } from "./chemistry/Lab";
import { ParticleBox, ParticleKey, particleDiameter, unitFor } from "./chemistry/Particles";

type Of<K extends ChemistryActivity["kind"]> = Extract<ChemistryActivity, { kind: K }>;
type Change = (next: (v: number) => number) => void;

/** − value + buttons, like the math activities' steppers. */
function Stepper({ label, value, onChange, min = 0, max = 99, disabled, compact = false }: { label: string; value: number; onChange: Change; min?: number; max?: number; disabled: boolean; compact?: boolean }) {
  return (
    <div className={compact ? "chem-coef-step" : "act-stepper"}>
      {!compact && <span className="act-stepper-label">{label}</span>}
      <button type="button" className="act-step" disabled={disabled || value <= min} onClick={() => (sfx.tap(), onChange((v) => Math.max(min, v - 1)))} aria-label={`Fewer ${label}`}>
        −
      </button>
      <span className={compact ? "chem-coef-val" : "act-stepper-value"} aria-live="polite">
        {value}
      </span>
      <button type="button" className="act-step" disabled={disabled || value >= max} onClick={() => (sfx.tap(), onChange((v) => Math.min(max, v + 1)))} aria-label={`More ${label}`}>
        +
      </button>
    </div>
  );
}

/** Whether the kid prefers less motion (then motion lines show speed instead of jiggling). */
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/* ================================================================ balance */

function Balance({ a, solved, locked, onChange }: ActivityProps<Of<"chem-balance">>) {
  const all = [...a.reactants, ...a.products];
  const max = a.max ?? 10;
  const smallest = balance(a.reactants, a.products).coefficients ?? all.map(() => 1);
  const given = a.given ?? all.map(() => null);
  const knownIdx = given.findIndex((g) => g !== null);
  const k = knownIdx >= 0 ? (given[knownIdx] as number) / smallest[knownIdx] : 1;
  const answer = smallest.map((c) => Math.round(c * k));
  const [coefs, setCoefs] = useState<number[]>(() => given.map((g) => g ?? 1));
  const shown = solved ? answer : coefs;
  useReport(coefs.every((c, i) => c === answer[i]), onChange);
  const left = sideAtoms(a.reactants, shown.slice(0, a.reactants.length));
  const right = sideAtoms(a.products, shown.slice(a.reactants.length));
  const els = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  const charged = all.some((f) => parseFormula(f).charge !== 0 || parseFormula(f).electron);
  const charge = (from: number, to: number) => all.slice(from, to).reduce((t, f, i) => t + (parseFormula(f).charge || (parseFormula(f).electron ? -1 : 0)) * shown[from + i], 0);
  const term = (f: string, i: number) => (
    <span className="chem-bal-term" key={i}>
      {given[i] === null ? (
        <Stepper compact label={`of ${f}`} value={shown[i]} min={1} max={max} disabled={locked} onChange={(fn) => setCoefs((p) => p.map((c, j) => (j === i ? fn(c) : c)))} />
      ) : (
        <span className="chem-coef-val fixed">{given[i]}</span>
      )}
      <span>
        <FormulaHtml f={f} />
        {a.states?.[i] && <span className="chem-state">({a.states[i]})</span>}
      </span>
    </span>
  );
  return (
    <div className="chem-act">
      <div className="chem-bal-eq">
        {a.reactants.map((f, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="chem-plus">+</span>}
            {term(f, i)}
          </Fragment>
        ))}
        <span className="chem-arrow-glyph">→</span>
        {a.products.map((f, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="chem-plus">+</span>}
            {term(f, a.reactants.length + i)}
          </Fragment>
        ))}
      </div>
      {(a.counts ?? true) && (
        <table className="chem-counts" aria-label="Atoms on each side">
          <thead>
            <tr>
              <th>Atom</th>
              <th>Left</th>
              <th>Right</th>
            </tr>
          </thead>
          <tbody>
            {els.map((el) => (
              <tr key={el} className={(left[el] ?? 0) === (right[el] ?? 0) ? "ok" : "off"}>
                <td>{el}</td>
                <td>{left[el] ?? 0}</td>
                <td>{right[el] ?? 0}</td>
              </tr>
            ))}
            {charged && (
              <tr className={charge(0, a.reactants.length) === charge(a.reactants.length, all.length) ? "ok" : "off"}>
                <td>charge</td>
                <td>{num(charge(0, a.reactants.length))}</td>
                <td>{num(charge(a.reactants.length, all.length))}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ============================================================== build atom */

function BuildAtom({ a, solved, locked, onChange }: ActivityProps<Of<"chem-buildAtom">>) {
  const target = element(a.target.element)!;
  const tCharge = a.target.charge ?? 0;
  const goal = { protons: target.z, neutrons: a.target.A !== undefined ? a.target.A - target.z : Math.round(target.mass) - target.z, electrons: target.z - tCharge };
  const [n, setN] = useState(() => a.start ?? { protons: 0, neutrons: 0, electrons: 0 });
  const shown = solved ? goal : n;
  useReport(n.protons === target.z && n.electrons === target.z - tCharge && (a.target.A === undefined || n.protons + n.neutrons === a.target.A), onChange);
  const e = shown.protons > 0 ? element(shown.protons) : undefined;
  const charge = shown.protons - shown.electrons;
  const maxP = Math.min(36, Math.max(target.z + 4, 6));
  const set = (key: "protons" | "neutrons" | "electrons"): Change => (fn) => setN((p) => ({ ...p, [key]: fn(p[key]) }));
  return (
    <div className="chem-act">
      {!a.hideTarget && (
        <div className="chem-target">
          Build{" "}
          <b>
            <IsotopeText A={a.target.A !== undefined ? String(a.target.A) : undefined} symbol={target.symbol} charge={chargeText(tCharge)} />
          </b>{" "}
          ({target.name}
          {a.target.A !== undefined ? `-${a.target.A}` : ""}
          {tCharge ? " ion" : ""})
        </div>
      )}
      <div className="chem-build-atom">
        {shown.protons + shown.neutrons + shown.electrons > 0 ? (
          <BohrSvg protons={shown.protons} neutrons={shown.neutrons} shells={bohrShells(Math.max(1, shown.protons), shown.electrons)} />
        ) : (
          <p className="act-empty">Add some particles!</p>
        )}
      </div>
      <div className="chem-readout" aria-live="polite">
        <span>
          Element: <b>{e ? `${e.name} (${e.symbol})` : "none yet"}</b>
        </span>
        <span>
          Mass number: <b>{shown.protons + shown.neutrons}</b>
        </span>
        <span>
          Charge: <b>{charge === 0 ? "0" : `${Math.abs(charge)}${charge > 0 ? "+" : "−"}`}</b>
        </span>
      </div>
      <div className="act-steppers">
        <Stepper label="protons" value={shown.protons} max={maxP} disabled={locked} onChange={set("protons")} />
        <Stepper label="neutrons" value={shown.neutrons} max={Math.min(46, maxP + 8)} disabled={locked} onChange={set("neutrons")} />
        <Stepper label="electrons" value={shown.electrons} max={Math.min(36, maxP + 3)} disabled={locked} onChange={set("electrons")} />
      </div>
    </div>
  );
}

/* ================================================================== states */

function States({ a, solved, locked, onChange }: ActivityProps<Of<"chem-states">>) {
  const step = a.step ?? 5;
  const min = a.min ?? a.melt - 40;
  const max = a.max ?? a.boil + 40;
  const [t, setT] = useState(a.start ?? min);
  const reduced = useReducedMotion();
  const stateAt = (x: number) => (x < a.melt ? "solid" : x < a.boil ? "liquid" : "gas");
  const goalT =
    typeof a.target === "string"
      ? a.target === "solid"
        ? Math.max(min, snap(a.melt - step * 2 - min, step) + min)
        : a.target === "liquid"
          ? a.melt + step < a.boil
            ? a.melt + step
            : a.melt
          : Math.min(max, a.boil + step * 2)
      : a.target.find === "melt"
        ? a.melt
        : a.boil;
  const T = solved ? goalT : t;
  useReport(typeof a.target === "string" ? stateAt(t) === a.target : t === goalT, onChange);
  const state = stateAt(T);
  const changing = T === a.melt ? "melting" : T === a.boil ? "boiling" : null;
  const frac = (T - min) / (max - min);
  const level = (frac < 0.34 ? 1 : frac < 0.67 ? 2 : 3) as 1 | 2 | 3;
  const count = a.formula ? 12 : 16;
  // Smaller than a full box so the gas has room to spread out.
  const d = particleDiameter(count * 1.8);
  const species = [{ formula: a.formula, colour: a.formula ? undefined : ("wave" as const), count, name: a.substance }];
  return (
    <div className="chem-act">
      <div className="chem-states-view">
        <ParticleBox panel={{ species, arrangement: state, animate: true, motion: reduced ? level : 0 }} diameter={d} seed={7} smooth speed={0.5 + frac * 1.8} unit={unitFor(species, d / 2 - 1)} />
        <svg className="chem-thermo-big" viewBox="0 0 40 200" aria-hidden="true">
          <rect x={14} y={8} width={12} height={160} rx={6} className="chem-thermo-tube" />
          <rect x={17} y={14 + (1 - frac) * 150} width={6} height={160 - (1 - frac) * 150} className="chem-thermo-red" />
          <circle cx={20} cy={176} r={14} className="chem-thermo-bulb" />
        </svg>
      </div>
      <div className="chem-readout" aria-live="polite">
        <span>
          <b>{num(T)} °C</b>
        </span>
        <span className="chem-state-badge">{changing ?? state}</span>
        <span>{a.substance}</span>
      </div>
      <label className="chem-slider-row">
        <span>{num(min)} °C</span>
        <input
          type="range"
          className="chem-slider"
          min={min}
          max={max}
          step={step}
          value={T}
          disabled={locked}
          aria-label="Temperature"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v !== t) sfx.tap();
            setT(v);
          }}
        />
        <span>{num(max)} °C</span>
      </label>
    </div>
  );
}

/* ===================================================================== mix */

function Mixture({ a, solved, locked, onChange }: ActivityProps<Of<"chem-mix"> & { mode: "mixture" }>) {
  const max = a.max ?? 12;
  const [counts, setCounts] = useState<number[]>(() => a.species.map(() => 0));
  const goal = a.target.counts ?? (a.target.ratio as number[]);
  const shown = solved ? goal : counts;
  const right = a.target.counts
    ? counts.every((c, i) => c === a.target.counts![i])
    : counts.every((c) => c > 0) && counts.every((c, i) => c * a.target.ratio![0] === counts[0] * a.target.ratio![i]);
  useReport(right, onChange);
  const species = a.species.map((s, i) => ({ formula: s.formula, colour: s.colour ?? (["grape", "wave", "sun"] as const)[i], name: s.name, count: shown[i] }));
  const total = shown.reduce((x, y) => x + y, 0);
  const d = particleDiameter(Math.max(10, a.species.length * max * 0.6));
  return (
    <div className="chem-act chem-mix-view">
      <ParticleBox panel={{ species, arrangement: "liquid", container: "beaker" }} diameter={d} seed={11} unit={unitFor(species, d / 2 - 1)} />
      <ParticleKey species={species} />
      <div className="chem-readout">
        Total particles: <b>{total}</b>
      </div>
      <div className="act-steppers">
        {a.species.map((s, i) => (
          <Stepper key={i} label={s.name} value={shown[i]} max={max} disabled={locked} onChange={(fn) => setCounts((p) => p.map((c, j) => (j === i ? fn(c) : c)))} />
        ))}
      </div>
    </div>
  );
}

function Limiting({ a, solved, locked, onChange }: ActivityProps<Of<"chem-mix"> & { mode: "limiting" }>) {
  const coefs = balance(
    a.reactants.map((r) => r.formula),
    a.products,
  ).coefficients ?? [...a.reactants, ...a.products].map(() => 1);
  const most = Math.min(...a.reactants.map((r, i) => Math.floor(r.count / coefs[i])));
  const [runs, setRuns] = useState(0);
  const shown = solved ? most : runs;
  useReport(runs === most, onChange);
  const left = a.reactants.map((r, i) => r.count - shown * coefs[i]);
  const made = a.products.map((_, i) => shown * coefs[a.reactants.length + i]);
  const done = shown === most;
  const species = [
    ...a.reactants.map((r, i) => ({ formula: r.formula, count: left[i], ring: done && left[i] > 0 })),
    ...a.products.map((f, i) => ({ formula: f, count: made[i] })),
  ];
  const start = a.reactants.reduce((t, r) => t + r.count, 0);
  const d = particleDiameter(Math.max(start, made.reduce((x, y) => x + y, 0) + left.reduce((x, y) => x + y, 0)));
  return (
    <div className="chem-act chem-mix-view">
      <div className="chem-target">
        {a.reactants.map((r, i) => (
          <Fragment key={i}>
            {i > 0 && " + "}
            {coefs[i] > 1 ? coefs[i] : ""}
            <FormulaHtml f={r.formula} />
          </Fragment>
        ))}{" "}
        →{" "}
        {a.products.map((f, i) => (
          <Fragment key={i}>
            {i > 0 && " + "}
            {coefs[a.reactants.length + i] > 1 ? coefs[a.reactants.length + i] : ""}
            <FormulaHtml f={f} />
          </Fragment>
        ))}
      </div>
      <ParticleBox panel={{ species, arrangement: "gas" }} diameter={d} seed={5 + shown} unit={unitFor(species, d / 2 - 1)} />
      <ParticleKey species={species.map((s) => ({ ...s, ring: false }))} />
      <div className="chem-readout" aria-live="polite">
        {a.reactants.map((r, i) => (
          <span key={i}>
            <FormulaHtml f={r.formula} /> left: <b>{left[i]}</b>
          </span>
        ))}
        {a.products.map((f, i) => (
          <span key={`p${i}`}>
            <FormulaHtml f={f} /> made: <b className="good">{made[i]}</b>
          </span>
        ))}
      </div>
      <div className="act-steppers">
        <button type="button" className="chem-weight-btn remove" disabled={locked || shown === 0} onClick={() => (sfx.tap(), setRuns((r) => Math.max(0, r - 1)))}>
          Undo
        </button>
        <button type="button" className="chem-weight-btn" disabled={locked || shown >= most} onClick={() => (sfx.tap(), setRuns((r) => Math.min(most, r + 1)))}>
          React!
        </button>
      </div>
      {done && !solved && <p className="act-tip-text">Nothing more can react.</p>}
    </div>
  );
}

/* ========================================================== build molecule */

const SPOTS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
];

interface Attached {
  el: string;
  order: 1 | 2 | 3;
}

/** The target's outer atoms with the bond orders that fill every shell. */
function targetBuild(a: Of<"chem-buildMolecule">): Attached[] {
  const order = (el: string) => (el === "H" ? 1 : Math.min(3, Math.max(1, 8 - (valenceElectrons(el) ?? 7)))) as 1 | 2 | 3;
  if (a.target) {
    const atoms = { ...parseFormula(a.target).atoms };
    atoms[a.center] = (atoms[a.center] ?? 1) - 1;
    return Object.entries(atoms).flatMap(([el, n]) => Array.from({ length: n }, () => ({ el, order: order(el) })));
  }
  for (const el of a.tray) for (const n of [1, 2, 3, 4]) if (moleculeBuildable(a.center, Array(n).fill(el))) return Array.from({ length: n }, () => ({ el, order: order(el) }));
  return [];
}

function BuildMolecule({ a, solved, locked, onChange }: ActivityProps<Of<"chem-buildMolecule">>) {
  const [atoms, setAtoms] = useState<Attached[]>([]);
  const shown = solved ? targetBuild(a) : atoms;
  const vc = valenceElectrons(a.center) ?? 4;
  const full = (list: Attached[]) => {
    const bonds = list.reduce((t, x) => t + x.order, 0);
    if (vc + bonds !== 8 || bonds > vc) return false;
    return list.every((x) => (x.el === "H" ? x.order === 1 : (valenceElectrons(x.el) ?? 0) + x.order === 8));
  };
  const matches = (list: Attached[]) => {
    if (!a.target) return true;
    const want = { ...parseFormula(a.target).atoms };
    want[a.center] = (want[a.center] ?? 0) - 1;
    const have: Record<string, number> = {};
    list.forEach((x) => (have[x.el] = (have[x.el] ?? 0) + 1));
    return Object.keys({ ...want, ...have }).every((k) => (want[k] ?? 0) === (have[k] ?? 0));
  };
  useReport(atoms.length > 0 && full(atoms) && matches(atoms), onChange);
  const C = { x: 150, y: 125 };
  const L = 86;
  const centreBonds = shown.reduce((t, x) => t + x.order, 0);
  const atomInfo = (el: string, bonds: number) => {
    const v = valenceElectrons(el) ?? 0;
    const lone = Math.max(0, v - bonds);
    const around = 2 * bonds + lone;
    const ok = el === "H" ? bonds === 1 : around === 8;
    return { lone, around, ok, cap: el === "H" ? 2 : 8 };
  };
  const dotsFor = (x: number, y: number, lone: number, away: number[], r: number) => {
    // Electron dots in the free directions (pairs where possible).
    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((d) => away.every((b) => Math.abs(Math.atan2(Math.sin(d - b), Math.cos(d - b))) > 0.3));
    const out: { x: number; y: number }[] = [];
    // Pairs first, one direction each, then any single electron.
    let left = lone;
    dirs.forEach((d) => {
      const n = left >= 2 ? 2 : left;
      left -= n;
      range(n).forEach((j) => {
        const off = n === 2 ? (j ? 5.5 : -5.5) : 0;
        out.push({ x: x + Math.cos(d) * (r + 9) - Math.sin(d) * off, y: y + Math.sin(d) * (r + 9) + Math.cos(d) * off });
      });
    });
    return out;
  };
  const centre = atomInfo(a.center, centreBonds);
  const rOf = (el: string) => (el === "H" ? 18 : 24);
  return (
    <div className="chem-act">
      {a.target && (
        <div className="chem-target">
          Make <b><FormulaHtml f={a.target} /></b>
        </div>
      )}
      <svg className="chem-bm-svg" viewBox="0 -8 300 270" role="img" aria-label="Molecule builder">
        {shown.map((x, i) => {
          const p = { x: C.x + SPOTS[i].x * L, y: C.y + SPOTS[i].y * L };
          const nx = -SPOTS[i].y;
          const ny = SPOTS[i].x;
          const offs = x.order === 1 ? [0] : x.order === 2 ? [-1, 1] : [-1.5, 0, 1.5];
          return (
            <g key={`b${i}`}>
              {offs.map((o) => (
                <line key={o} x1={C.x + nx * o * 6} y1={C.y + ny * o * 6} x2={p.x + nx * o * 6} y2={p.y + ny * o * 6} className="chem-stick" style={{ stroke: "#9aa3b5", strokeWidth: 6, strokeLinecap: "round" }} />
              ))}
              <line
                x1={C.x + SPOTS[i].x * 30}
                y1={C.y + SPOTS[i].y * 30}
                x2={p.x - SPOTS[i].x * 22}
                y2={p.y - SPOTS[i].y * 22}
                stroke="transparent"
                strokeWidth={34}
                style={{ cursor: locked ? "default" : "pointer" }}
                onClick={() => {
                  if (locked) return;
                  sfx.tap();
                  setAtoms((prev) => prev.map((y, j) => (j === i ? { ...y, order: (y.order === 3 ? 1 : y.order + 1) as 1 | 2 | 3 } : y)));
                }}
                aria-label={`Bond to ${x.el}: tap to change`}
                role="button"
              />
            </g>
          );
        })}
        {/* centre atom */}
        <AtomBall el={a.center} x={C.x} y={C.y} r={rOf(a.center)} />
        <circle cx={C.x} cy={C.y} r={rOf(a.center) + 5} className={`chem-full-ring ${centre.ok ? "ok" : "no"}`} />
        {dotsFor(
          C.x,
          C.y,
          centre.lone,
          shown.map((_, i) => Math.atan2(SPOTS[i].y, SPOTS[i].x)),
          rOf(a.center) + 4,
        ).map((d, j) => (
          <circle key={`cd${j}`} cx={d.x} cy={d.y} r={3.4} className="chem-dot" />
        ))}
        <text x={C.x + rOf(a.center) + 10} y={C.y + rOf(a.center) + 16} className={`chem-bm-count${centre.ok ? " ok" : ""}`}>
          {centre.around}/{centre.cap}
        </text>
        {shown.map((x, i) => {
          const p = { x: C.x + SPOTS[i].x * L, y: C.y + SPOTS[i].y * L };
          const info = atomInfo(x.el, x.order);
          const r = rOf(x.el);
          const back = Math.atan2(-SPOTS[i].y, -SPOTS[i].x);
          return (
            <g
              key={`a${i}`}
              role="button"
              aria-label={`${x.el}: tap to take it off`}
              style={{ cursor: locked ? "default" : "pointer" }}
              onClick={() => {
                if (locked) return;
                sfx.tap();
                setAtoms((prev) => prev.filter((_, j) => j !== i));
              }}
            >
              <AtomBall el={x.el} x={p.x} y={p.y} r={r} />
              <circle cx={p.x} cy={p.y} r={r + 5} className={`chem-full-ring ${info.ok ? "ok" : "no"}`} />
              {dotsFor(p.x, p.y, info.lone, [back], r + 4).map((d, j) => (
                <circle key={j} cx={d.x} cy={d.y} r={3.4} className="chem-dot" />
              ))}
              <text x={p.x + r + 10} y={p.y + r + 16} className={`chem-bm-count${info.ok ? " ok" : ""}`}>
                {info.around}/{info.cap}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chem-tray">
        {a.tray.map((el) => (
          <button
            key={el}
            type="button"
            className="chem-tray-atom"
            disabled={locked || atoms.length >= 4}
            aria-label={`Add ${element(el)?.name ?? el}`}
            onClick={() => {
              sfx.tap();
              setAtoms((prev) => (prev.length >= 4 ? prev : [...prev, { el, order: 1 }]));
            }}
          >
            <svg viewBox="-30 -30 60 60">
              <AtomBall el={el} x={0} y={0} r={26} />
            </svg>
          </button>
        ))}
      </div>
      <p className="act-tip-text">Tap an atom to add it. Tap a bond to make it double or triple. Tap an outside atom to take it off.</p>
    </div>
  );
}

/* ================================================================ measure */

function Fill({ a, solved, locked, onChange }: ActivityProps<Of<"chem-measure"> & { mode: "fill" }>) {
  const [vol, setVol] = useState(0);
  const shown = solved ? a.target : vol;
  useReport(Math.abs(vol - a.target) < 1e-9, onChange);
  const { bottom, full, right } = glassLevels(a.glass);
  const move = (p: { x: number; y: number }) => {
    const raw = ((bottom - p.y) / (bottom - full)) * a.max;
    const next = Math.max(0, Math.min(a.max, Math.round(snap(raw, a.step) * 1e6) / 1e6));
    if (next !== vol) sfx.tap();
    setVol(next);
  };
  const y = bottom - (shown / a.max) * (bottom - full);
  return (
    <div className="chem-act">
      <GlassSvg
        g={{ glass: a.glass, volume: shown, max: a.max, colour: a.colour ?? "clear", scale: true }}
        minor={a.step}
        className="chem-measure-glass act-svg"
        svgProps={{ ...dragHandlers(!locked, move), role: "slider", "aria-label": "Drag the liquid level", "aria-valuenow": shown, "aria-valuemin": 0, "aria-valuemax": a.max }}
      >
        <circle cx={right + 14} cy={y} r={9} className="chem-level-handle" />
      </GlassSvg>
      <p className="act-tip-text">Drag the liquid up or down to fill it.</p>
    </div>
  );
}

function PanBalance({ a, solved, locked, onChange }: ActivityProps<Of<"chem-measure"> & { mode: "balance" }>) {
  const weights = a.weights ?? [100, 50, 20, 10, 5, 2, 1];
  const [on, setOn] = useState<number[]>([]);
  const solvedSet = (() => {
    const out: number[] = [];
    let left = a.mass;
    for (const w of [...weights].sort((x, y) => y - x))
      while (left >= w) {
        out.push(w);
        left -= w;
      }
    return out;
  })();
  const shown = solved ? solvedSet : on;
  const sum = on.reduce((t, w) => t + w, 0);
  const shownSum = shown.reduce((t, w) => t + w, 0);
  useReport(sum === a.mass, onChange);
  const diff = a.mass - shownSum;
  const tilt = Math.max(-12, Math.min(12, (diff / Math.max(a.mass, 1)) * 30));
  const cx = 170;
  const cy = 70;
  const arm = 110;
  const end = (side: -1 | 1) => ({ x: cx + side * arm * Math.cos((tilt * Math.PI) / 180), y: cy - side * arm * Math.sin((tilt * Math.PI) / 180) });
  const lp = end(-1);
  const rp = end(1);
  const pan = (p: { x: number; y: number }) => `M${p.x - 46} ${p.y + 60} Q${p.x} ${p.y + 82} ${p.x + 46} ${p.y + 60} Z`;
  return (
    <div className="chem-act">
      <svg className="chem-pan-balance" viewBox="0 0 340 190" role="img" aria-label="A pan balance">
        <path d="M150 182 L190 182 L176 76 L164 76 Z" className="chem-balance-body" />
        <line x1={lp.x} y1={lp.y} x2={rp.x} y2={rp.y} className="chem-beam" style={{ transition: "none" }} />
        <circle cx={cx} cy={cy} r={6} className="clock-pin" />
        {[lp, rp].map((p, i) => (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={p.x - 40} y2={p.y + 60} className="chem-pan-string" />
            <line x1={p.x} y1={p.y} x2={p.x + 40} y2={p.y + 60} className="chem-pan-string" />
            <path d={pan(p)} className="chem-pan" />
          </g>
        ))}
        <text x={lp.x} y={lp.y + 56} style={{ fontSize: 40, textAnchor: "middle" }}>
          {a.emoji}
        </text>
        {shown.map((w, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = rp.x - 29 + col * 29;
          const yy = rp.y + 44 - row * 20;
          return (
            <g key={i}>
              <rect x={x - 13} y={yy} width={26} height={18} rx={5} className="chem-weight" />
              <text x={x} y={yy + 13.5} className="chem-weight-text">
                {w}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chem-weights">
        {weights.map((w) => (
          <button key={w} type="button" className="chem-weight-btn" disabled={locked || on.length >= 12} onClick={() => (sfx.tap(), setOn((p) => (p.length >= 12 ? p : [...p, w])))}>
            +{w} g
          </button>
        ))}
        <button type="button" className="chem-weight-btn remove" disabled={locked || on.length === 0} onClick={() => (sfx.tap(), setOn((p) => p.slice(0, -1)))}>
          Take one off
        </button>
      </div>
    </div>
  );
}

/** Draws a "chem-" hands-on activity. Reports correctness with useReport, like the math activities. */
export function ChemistryActivityView(props: ActivityProps<ChemistryActivity>) {
  const { a } = props;
  switch (a.kind) {
    case "chem-balance":
      return <Balance {...props} a={a} />;
    case "chem-buildAtom":
      return <BuildAtom {...props} a={a} />;
    case "chem-states":
      return <States {...props} a={a} />;
    case "chem-mix":
      return a.mode === "mixture" ? <Mixture {...props} a={a} /> : <Limiting {...props} a={a} />;
    case "chem-buildMolecule":
      return <BuildMolecule {...props} a={a} />;
    case "chem-measure":
      return a.mode === "fill" ? <Fill {...props} a={a} /> : <PanBalance {...props} a={a} />;
  }
}
