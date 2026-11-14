/* Circuit schematics, drawn as a ladder: the top wire (with the cell), then a bottom wire or parallel rungs. */
import type { KeyboardEvent, ReactNode } from "react";
import type { CircuitLayout, CircuitPart } from "../../../game/science/physicsTypes";
import { circuitFlow, circuitRows, conducts, type CircuitState } from "../../../game/science/physicsValidate";
import { Bounds, Label, PhysSvg, range, type Ctx } from "./common";

const SW = 92;
const DEFAULT_UNIT: Record<string, string> = {
  cell: "V",
  resistor: "Ω",
  bulb: "Ω",
  motor: "Ω",
  capacitor: "μF",
  ammeter: "A",
  voltmeter: "V",
};

/** Half the width a part takes up on its wire. */
function halfWidth(p: CircuitPart) {
  switch (p.part) {
    case "wire":
      return 0;
    case "gap":
      return 18;
    case "cell":
      return 9 * ((p.cells ?? 1) - 1) + 4.5;
    case "capacitor":
      return 7;
    case "switch":
      return 22;
    case "resistor":
      return 26;
    default:
      return 18;
  }
}

function PartShape({ p, x, y, lit, closed }: { p: CircuitPart; x: number; y: number; lit: boolean; closed: boolean }) {
  switch (p.part) {
    case "wire":
      return null;
    case "gap":
      return closed ? (
        <line x1={x - 18} y1={y} x2={x + 18} y2={y} className="ph-wire filled" />
      ) : (
        <g>
          <circle cx={x - 18} cy={y} r="4.5" className="ph-terminal" />
          <circle cx={x + 18} cy={y} r="4.5" className="ph-terminal" />
        </g>
      );
    case "cell": {
      const n = p.cells ?? 1;
      const x0 = x - 9 * (n - 1) - 4;
      return (
        <g>
          {range(n).map((i) => (
            <g key={i}>
              <line x1={x0 + i * 18} y1={y - 22} x2={x0 + i * 18} y2={y + 22} className="ph-plate long" />
              <line x1={x0 + i * 18 + 9} y1={y - 11} x2={x0 + i * 18 + 9} y2={y + 11} className="ph-plate short" />
            </g>
          ))}
          {n > 1 && range(n - 1).map((i) => <line key={`w${i}`} x1={x0 + i * 18 + 9} y1={y} x2={x0 + i * 18 + 18} y2={y} className="ph-wire" />)}
          <text x={x0 - 9} y={y - 14} className="ph-tiny" textAnchor="middle">
            +
          </text>
        </g>
      );
    }
    case "resistor": {
      const pts = [`${x - 26},${y}`];
      for (let i = 0; i < 6; i++) pts.push(`${x - 26 + 4.33 + i * 8.67},${y + (i % 2 ? 11 : -11)}`);
      pts.push(`${x + 26},${y}`);
      return <polyline points={pts.join(" ")} className="ph-resistor" />;
    }
    case "bulb":
      return (
        <g className={lit ? "ph-bulb lit" : "ph-bulb"}>
          {lit &&
            range(8).map((i) => {
              const a = (i * Math.PI) / 4 + Math.PI / 8;
              return <line key={i} x1={x + 23 * Math.cos(a)} y1={y + 23 * Math.sin(a)} x2={x + 33 * Math.cos(a)} y2={y + 33 * Math.sin(a)} className="ph-glow-ray" />;
            })}
          <circle cx={x} cy={y} r="18" className="ph-bulb-glass" />
          <path d={`M${x - 12.7} ${y - 12.7}L${x + 12.7} ${y + 12.7}M${x + 12.7} ${y - 12.7}L${x - 12.7} ${y + 12.7}`} className="ph-filament" />
        </g>
      );
    case "motor":
    case "ammeter":
    case "voltmeter":
      return (
        <g className={p.part === "motor" && lit ? "ph-meter spinning" : "ph-meter"}>
          <circle cx={x} cy={y} r="18" className="ph-meter-body" />
          <text x={x} y={y + 7} className="ph-meter-letter" textAnchor="middle">
            {p.part === "motor" ? "M" : p.part === "ammeter" ? "A" : "V"}
          </text>
        </g>
      );
    case "capacitor":
      return (
        <g>
          <line x1={x - 6} y1={y - 18} x2={x - 6} y2={y + 18} className="ph-plate long" />
          <line x1={x + 6} y1={y - 18} x2={x + 6} y2={y + 18} className="ph-plate long" />
        </g>
      );
    case "switch": {
      const a = closed ? 0 : (34 * Math.PI) / 180;
      return (
        <g>
          <line x1={x - 20} y1={y} x2={x - 20 + 40 * Math.cos(a)} y2={y - 40 * Math.sin(a)} className="ph-switch-arm" />
          <circle cx={x - 20} cy={y} r="4.5" className="ph-terminal" />
          <circle cx={x + 20} cy={y} r="4.5" className="ph-terminal" />
        </g>
      );
    }
  }
}

/**
 * Draws a circuit. `state` holds the tap state of gaps and switches; `onTap` makes them tappable (the
 * activity). Bulbs light from the circuit unless a bulb's `lit` forces it (pictures only).
 */
export function CircuitDiagram({
  c,
  ctx,
  state = {},
  onTap,
  ignoreForced = false,
  label = "Circuit diagram",
}: {
  c: CircuitLayout;
  ctx: Ctx;
  state?: CircuitState;
  onTap?: (key: string) => void;
  /** Ignore bulbs' own `lit` (the activity works it out). */
  ignoreForced?: boolean;
  label?: string;
}) {
  const rows = circuitRows(c);
  const flow = circuitFlow(c, state);
  const n = Math.max(3, ...rows.map((r) => r.parts.length));
  const L = 20;
  const W = n * SW;
  const R = L + W;
  const hasAcross = (parts: CircuitPart[]) => parts.some((p) => "across" in p && p.across !== undefined && p.across !== null);
  const T = hasAcross(c.top) ? 104 : 52;
  const ys: number[] = [T];
  let y = T;
  rows.slice(1).forEach((r, k) => {
    y += (k === 0 ? 132 : 112) + (hasAcross(r.parts) ? 56 : 0);
    ys.push(y);
  });
  const B = new Bounds();
  B.add(L - 14, T - 52);
  B.add(R + 14, ys[ys.length - 1] + 54);
  const wires: ReactNode[] = [];
  const parts: ReactNode[] = [];
  rows.forEach((row, r) => {
    const ry = ys[r];
    const count = row.parts.length;
    const xs = row.parts.map((_, i) => L + ((i + 0.5) * W) / Math.max(1, count));
    let from = L;
    row.parts.forEach((p, i) => {
      const hw = halfWidth(p);
      if (hw > 0) {
        wires.push(<line key={`${row.key}w${i}`} x1={from} y1={ry} x2={xs[i] - hw} y2={ry} className="ph-wire" />);
        from = xs[i] + hw;
      }
    });
    wires.push(<line key={`${row.key}wend`} x1={from} y1={ry} x2={R} y2={ry} className="ph-wire" />);
    row.parts.forEach((p, i) => {
      const key = `${row.key}:${i}`;
      const x = xs[i];
      const lit = p.part === "bulb" && !ignoreForced && p.lit !== undefined ? p.lit : flow.lit.has(key);
      const closed = conducts(p, key, state);
      const tappable = Boolean(onTap) && (p.part === "gap" || p.part === "switch");
      const unit = ("unit" in p && p.unit) || DEFAULT_UNIT[p.part];
      const across = "across" in p ? p.across : undefined;
      const name = "name" in p ? p.name : undefined;
      const value = "label" in p ? p.label : undefined;
      const press = () => onTap?.(key);
      const keyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          press();
        }
      };
      parts.push(
        <g key={key}>
          {across !== undefined && across !== null && (
            <g className="ph-across">
              <polyline points={`${x - 34},${ry} ${x - 34},${ry - 56} ${x - 17},${ry - 56}`} className="ph-wire thin" />
              <polyline points={`${x + 34},${ry} ${x + 34},${ry - 56} ${x + 17},${ry - 56}`} className="ph-wire thin" />
              <circle cx={x - 34} cy={ry} r="4" className="ph-junction" />
              <circle cx={x + 34} cy={ry} r="4" className="ph-junction" />
              <circle cx={x} cy={ry - 56} r="16" className="ph-meter-body" />
              <text x={x} y={ry - 50} className="ph-meter-letter" textAnchor="middle">
                V
              </text>
              <Label x={x + 40} y={ry - 50} m={across} unit="V" ctx={ctx} anchor="start" size="sm" />
            </g>
          )}
          {tappable ? (
            <g
              className={`ph-tap${closed ? " on" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${p.part === "gap" ? "Gap" : "Switch"}${name ? ` ${name}` : ""}: ${closed ? "closed" : "open"}`}
              aria-pressed={closed}
              onClick={press}
              onKeyDown={keyDown}
            >
              <rect x={x - 32} y={ry - 32} width="64" height="56" rx="14" className="ph-tap-zone" />
              <PartShape p={p} x={x} y={ry} lit={lit} closed={closed} />
            </g>
          ) : (
            <PartShape p={p} x={x} y={ry} lit={lit} closed={closed} />
          )}
          {name && (
            <text x={across !== undefined && across !== null ? x - 40 : x} y={across !== undefined && across !== null ? ry - 66 : ry - 30} className="ph-part-name" textAnchor={across !== undefined && across !== null ? "end" : "middle"}>
              {name}
            </text>
          )}
          <Label x={x} y={ry + 42} m={value} unit={unit} ctx={ctx} size="sm" />
        </g>,
      );
    });
  });
  const last = ys[ys.length - 1];
  const junctions = rows.length > 2 ? ys.slice(1, -1) : [];
  return (
    <PhysSvg box={B.box(10, 0)} label={label} cls={`ph-circuit${flow.short ? " short" : ""}`}>
      <line x1={L} y1={T} x2={L} y2={last} className="ph-wire" />
      <line x1={R} y1={T} x2={R} y2={last} className="ph-wire" />
      {wires}
      {junctions.map((jy) => (
        <g key={jy}>
          <circle cx={L} cy={jy} r="5" className="ph-junction" />
          <circle cx={R} cy={jy} r="5" className="ph-junction" />
        </g>
      ))}
      {parts}
    </PhysSvg>
  );
}

/** The "phys-circuit" picture. */
export function Circuit({ c, ctx }: { c: CircuitLayout; ctx: Ctx }) {
  return <CircuitDiagram c={c} ctx={ctx} />;
}
