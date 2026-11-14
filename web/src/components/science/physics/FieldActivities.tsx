/* Hands-on physics: building circuits, matching waves, light and materials, magnets. */
import { useState, type CSSProperties } from "react";
import { sfx } from "../../../game/sound";
import type { PhysicsActivity } from "../../../game/science/physicsTypes";
import { circuitFlow, circuitRows, circuitSolution, litNames, rangeStart, type CircuitState } from "../../../game/science/physicsValidate";
import { useReport, type ActivityProps } from "../../activities/shared";
import { CircuitDiagram } from "./Circuit";
import { BarMagnet } from "./FieldVisuals";
import { Emoji, range } from "./common";
import { Chip, Slider } from "./MotionActivities";

type Of<K extends PhysicsActivity["kind"]> = Extract<PhysicsActivity, { kind: K }>;
const EPS = 1e-6;
const ctx0 = { solved: false, answer: "" };

/* ----------------------------------------------------------- buildCircuit */

function startState(a: Of<"phys-buildCircuit">): CircuitState {
  const s: CircuitState = {};
  for (const r of circuitRows(a))
    r.parts.forEach((p, i) => {
      if (p.part === "switch") s[`${r.key}:${i}`] = p.closed;
      if (p.part === "gap") s[`${r.key}:${i}`] = false;
    });
  return s;
}

export function BuildCircuit({ a, solved, locked, onChange }: ActivityProps<Of<"phys-buildCircuit">>) {
  const [state, setState] = useState<CircuitState>(() => startState(a));
  const want = [...a.lit].sort().join("|");
  useReport(litNames(a, state).join("|") === want, onChange);
  const shown = solved ? (circuitSolution(a, a.lit) ?? state) : state;
  const lit = litNames(a, shown).filter(Boolean);
  const short = circuitFlow(a, shown).short;
  return (
    <div className="ph-act">
      <CircuitDiagram
        c={a}
        ctx={ctx0}
        state={shown}
        ignoreForced
        label="Circuit to build"
        onTap={
          locked
            ? undefined
            : (key) => {
                sfx.tap();
                setState((prev) => ({ ...prev, [key]: !prev[key] }));
              }
        }
      />
      <p className={`ph-status${short ? " warn" : ""}`} aria-live="polite">
        {short ? "Short circuit! The current skips the bulbs." : lit.length ? `Lit: ${lit.join(", ")}` : "No bulbs are lit."}
      </p>
      <p className="act-tip-text">Tap a gap to fill it with wire. Tap a switch to open or close it.</p>
    </div>
  );
}

/* ------------------------------------------------------------- matchWave */

export function MatchWave({ a, solved, locked, onChange }: ActivityProps<Of<"phys-matchWave">>) {
  const v = a.speed ?? 1;
  const targetF = v / a.target.wavelength;
  const [amp, setAmp] = useState(() => (a.amplitude ? rangeStart(a.amplitude, a.target.amplitude) : a.target.amplitude));
  const [lam, setLam] = useState(() => (a.wavelength ? rangeStart(a.wavelength, a.target.wavelength) : a.target.wavelength));
  const [freq, setFreq] = useState(() => (a.frequency ? rangeStart(a.frequency, targetF) : targetF));
  const A = solved ? a.target.amplitude : amp;
  const L = solved ? a.target.wavelength : a.frequency ? v / freq : lam;
  const F = solved ? targetF : freq;
  const right = Math.abs(amp - a.target.amplitude) < EPS && (a.frequency ? Math.abs(freq - targetF) < EPS : Math.abs(lam - a.target.wavelength) < EPS);
  useReport(right, onChange);
  const W = 360;
  const x0 = 26;
  const u = W / a.length;
  const maxA = Math.max(a.target.amplitude, a.amplitude?.max ?? a.target.amplitude);
  const rows = Math.ceil(maxA - 1e-9);
  const uy = Math.min(u, 80 / maxA);
  const mid = 16 + rows * uy;
  const path = (amplitude: number, wl: number) =>
    range(241)
      .map((i) => {
        const x = (a.length * i) / 240;
        return `${i ? "L" : "M"}${(x0 + x * u).toFixed(1)} ${(mid - amplitude * uy * Math.sin((2 * Math.PI * x) / wl)).toFixed(1)}`;
      })
      .join(" ");
  const unit = a.unit ?? "m";
  return (
    <div className="ph-act">
      <svg className="ph-svg" viewBox={`0 0 400 ${mid + rows * uy + 22}`} style={{ width: "min(100%, 430px)" }} role="img" aria-label="Your wave and the target wave">
        <rect x={x0} y={mid - rows * uy} width={W} height={2 * rows * uy} className="ph-wave-bg" />
        {range(Math.floor(a.length) + 1).map((i) => (
          <line key={`x${i}`} x1={x0 + i * u} y1={mid - rows * uy} x2={x0 + i * u} y2={mid + rows * uy} className="ph-grid" />
        ))}
        {range(2 * rows + 1).map((j) => (
          <line key={`y${j}`} x1={x0} y1={mid - rows * uy + j * uy} x2={x0 + W} y2={mid - rows * uy + j * uy} className="ph-grid" />
        ))}
        <line x1={x0} y1={mid} x2={x0 + W} y2={mid} className="ph-eq" />
        <path d={path(a.target.amplitude, a.target.wavelength)} className="ph-wave-target" />
        <path d={path(A, L)} className={`ph-wave mine${solved ? " match" : ""}`} />
        <text x={x0 + W} y={mid + rows * uy + 18} className="ph-tiny" textAnchor="end">
          1 square = 1 {unit}
        </text>
      </svg>
      <div className="ph-sliders">
        {a.amplitude && <Slider label="Amplitude" unit={` ${unit}`} r={a.amplitude} value={A} disabled={locked} onChange={setAmp} />}
        {a.wavelength && <Slider label="Wavelength" unit={` ${unit}`} r={a.wavelength} value={L} disabled={locked} onChange={setLam} />}
        {a.frequency && <Slider label="Frequency" unit=" Hz" r={a.frequency} value={F} disabled={locked} onChange={setFreq} />}
      </div>
      <p className="act-tip-text">Make your wave (solid) match the dashed one.</p>
    </div>
  );
}

/* -------------------------------------------------------------- material */

const EFFECT = { transparent: "pass", translucent: "dim", opaque: "block", mirror: "reflect" } as const;
const SAYS = {
  pass: "The light goes right through.",
  dim: "Only some light gets through.",
  block: "The light is blocked. A shadow!",
  reflect: "The light bounces back!",
} as const;

export function Material({ a, solved, locked, onChange }: ActivityProps<Of<"phys-material">>) {
  const [pick, setPick] = useState<number | null>(null);
  useReport(pick !== null && EFFECT[a.materials[pick].type] === a.want, onChange);
  const P = solved ? a.materials.findIndex((m) => EFFECT[m.type] === a.want) : pick;
  const m = P !== null && P >= 0 ? a.materials[P] : null;
  const effect = m ? EFFECT[m.type] : "pass";
  const sx = 330;
  return (
    <div className="ph-act">
      <svg className="ph-svg" viewBox="0 0 410 200" style={{ width: "min(100%, 430px)" }} role="img" aria-label={m ? `${m.name} in the light: ${SAYS[effect]}` : "Torch shining at a screen"}>
        <polygon points={`66,84 ${m ? 190 : sx},${m ? 64 : 44} ${m ? 190 : sx},${m ? 136 : 156} 66,116`} className="ph-beam" />
        {m && (effect === "pass" || effect === "dim") && <polygon points={`230,62 ${sx},44 ${sx},156 230,138`} className={`ph-beam${effect === "dim" ? " dim" : ""}`} />}
        {m && effect === "reflect" && <polygon points="190,64 190,136 70,30 100,6" className="ph-beam" />}
        <g transform="translate(60 100)" className="ph-torch">
          <rect x={-46} y={-11} width={36} height={22} rx="5" className="ph-torch-body" />
          <polygon points="-12,-12 6,-19 6,19 -12,12" className="ph-torch-head" />
        </g>
        {m ? (
          <g className={`ph-slab ${m.type}`}>
            <rect x={190} y={46} width={40} height={108} rx="6" />
            {m.emoji && <Emoji x={210} y={100} e={m.emoji} size={30} />}
          </g>
        ) : (
          <rect x={190} y={46} width={40} height={108} rx="6" className="ph-slot-empty" />
        )}
        <rect x={sx} y={26} width={58} height={150} rx="8" className="ph-screen" />
        <ellipse cx={sx + 29} cy={101} rx={22} ry={52} className={`ph-spot${effect === "dim" ? " dim" : effect === "block" ? " shadow" : effect === "reflect" ? " off" : ""}`} />
        <text x={210} y={186} className="ph-note" textAnchor="middle">
          {m ? m.name : "put something here"}
        </text>
      </svg>
      <p className="ph-status" aria-live="polite">
        {m ? SAYS[effect] : "Tap a material to hold it in the light."}
      </p>
      <div className="ph-controls">
        {a.materials.map((mat, i) => (
          <Chip
            key={mat.name}
            on={P === i}
            disabled={locked}
            onClick={() => {
              sfx.tap();
              setPick((p) => (p === i ? null : i));
            }}
          >
            {mat.emoji && <span aria-hidden="true">{mat.emoji}</span>}
            {mat.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- magnet */

export function MagnetActivity({ a, solved, locked, onChange }: ActivityProps<Of<"phys-magnet">>) {
  if (a.mode === "arrange") return <ArrangeMagnets a={a} solved={solved} locked={locked} onChange={onChange} />;
  return <Pickup a={a} solved={solved} locked={locked} onChange={onChange} />;
}

const flip = (p: "NS" | "SN"): "NS" | "SN" => (p === "NS" ? "SN" : "NS");

function ArrangeMagnets({ a, solved, locked, onChange }: ActivityProps<Extract<Of<"phys-magnet">, { mode: "arrange" }>>) {
  const [m, setM] = useState<["NS" | "SN", "NS" | "SN"]>(() => a.start ?? ["NS", "NS"]);
  const attracts = (x: ["NS" | "SN", "NS" | "SN"]) => x[0][1] !== x[1][0];
  useReport(attracts(m) === (a.want === "attract"), onChange);
  let shown = m;
  if (solved && attracts(m) !== (a.want === "attract")) shown = [m[0], flip(m[1])];
  const att = attracts(shown);
  const gap = solved ? (att ? 0 : 70) : 30;
  const tap = (i: 0 | 1) => {
    if (locked || (i === 0 && a.fixed === "left")) return;
    sfx.tap();
    setM((prev) => (i === 0 ? [flip(prev[0]), prev[1]] : [prev[0], flip(prev[1])]));
  };
  const xs = [200 - 65 - gap / 2, 200 + 65 + gap / 2];
  return (
    <div className="ph-act">
      <svg className="ph-svg" viewBox="0 0 400 150" style={{ width: "min(100%, 430px)" }} role="img" aria-label={`Magnets ${shown.join(" and ")}`}>
        {([0, 1] as const).map((i) => {
          const fixed = i === 0 && a.fixed === "left";
          return (
            <g
              key={i}
              className={`ph-slide${fixed || locked ? "" : " ph-tap-magnet"}`}
              style={{ transform: `translateX(${xs[i] - (i ? 265 : 135)}px)` }}
              role={fixed || locked ? undefined : "button"}
              tabIndex={fixed || locked ? undefined : 0}
              aria-label={fixed ? "Left magnet (stays put)" : `Flip the ${i ? "right" : "left"} magnet`}
              onClick={() => tap(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), tap(i))}
            >
              <rect x={(i ? 265 : 135) - 75} y={46} width={150} height={60} rx="14" className="ph-magnet-hit" />
              <BarMagnet x={i ? 265 : 135} y={76} poles={shown[i]} />
              {fixed && <Emoji x={135} y={128} e="📌" size={18} />}
            </g>
          );
        })}
        {solved && (
          <text x={200} y={28} className="ph-label ph-sm" textAnchor="middle">
            {att ? "They attract!" : "They repel!"}
          </text>
        )}
      </svg>
      <p className="act-tip-text">Tap a magnet to turn it around.</p>
    </div>
  );
}

function Pickup({ a, solved, locked, onChange }: ActivityProps<Extract<Of<"phys-magnet">, { mode: "pickup" }>>) {
  const [sel, setSel] = useState<boolean[]>(() => a.items.map(() => false));
  useReport(sel.every((s, i) => s === a.items[i].magnetic), onChange);
  const shown = solved ? a.items.map((it) => it.magnetic) : sel;
  return (
    <div className="ph-act">
      <div className="ph-magnet-top" aria-hidden="true">
        <span className="ph-big-emoji">🧲</span>
        {solved && (
          <span className="ph-stuck">
            {a.items.filter((it) => it.magnetic).map((it) => (
              <span key={it.name}>{it.emoji}</span>
            ))}
          </span>
        )}
      </div>
      <div className="ph-pick-grid" style={{ "--n": Math.min(4, a.items.length) } as CSSProperties}>
        {a.items.map((it, i) => (
          <button
            key={it.name}
            type="button"
            className={`ph-pick${shown[i] ? " on" : ""}`}
            aria-pressed={shown[i]}
            disabled={locked}
            onClick={() => {
              sfx.tap();
              setSel((prev) => prev.map((s, j) => (j === i ? !s : s)));
            }}
          >
            <span className="ph-pick-emoji" aria-hidden="true">
              {it.emoji}
            </span>
            <span>{it.name}</span>
          </button>
        ))}
      </div>
      <p className="act-tip-text">Tap everything the magnet will pick up.</p>
    </div>
  );
}
