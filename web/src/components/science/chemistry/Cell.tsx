/** Galvanic and electrolytic cells. */
import type { ChemistryVisual } from "../../../game/science/chemistryTypes";
import { REDUCTION_POTENTIALS } from "../../../game/science/elements";
import { askClass, FormulaSvg, liquidFill, shownMark } from "./Formula";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

/** Which side is the anode: given, or for a galvanic cell the metal with the lower reduction potential. */
export function anodeSide(v: Of<"chem-cell">): "left" | "right" {
  if (v.anode) return v.anode;
  const l = REDUCTION_POTENTIALS[v.left.metal];
  const r = REDUCTION_POTENTIALS[v.right.metal];
  if (v.type === "galvanic" && l && r) return l.volts <= r.volts ? "left" : "right";
  return "left";
}

export function CellView({ v, solved, answer }: { v: Of<"chem-cell">; solved: boolean; answer: string }) {
  const galvanic = v.type === "galvanic";
  const anode = anodeSide(v);
  const sides = [
    { s: v.left, x: 85, side: "left" as const },
    { s: v.right, x: 255, side: "right" as const },
  ];
  const signs = v.signs ?? true;
  const sign = (isAnode: boolean) => (galvanic ? (isAnode ? "−" : "+") : isAnode ? "+" : "−");
  const volt = v.voltage === undefined || v.voltage === null ? "" : shownMark(v.voltage, solved, answer, " V");
  const leftToRight = anode === "left";
  const one = !galvanic;
  return (
    <svg className="chem-cell" viewBox="0 0 340 290" role="img" aria-hidden="true">
      <defs>
        <marker id="chem-cell-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="chem-e-head" />
        </marker>
      </defs>
      {/* wire */}
      <path d="M85 92 L85 34 L255 34 L255 92" className="chem-wire" />
      {/* meter or battery */}
      {galvanic ? (
        <g>
          <circle cx={170} cy={34} r={24} className="chem-meter" />
          <text x={170} y={40} className={`chem-meter-text${askClass(v.voltage, solved)}`}>
            {volt || "V"}
          </text>
        </g>
      ) : (
        <g>
          <rect x={150} y={18} width={40} height={32} className="chem-battery-bg" />
          {/* long line = +, on the anode's side */}
          <line x1={leftToRight ? 162 : 178} x2={leftToRight ? 162 : 178} y1={20} y2={48} className="chem-battery-long" />
          <line x1={leftToRight ? 178 : 162} x2={leftToRight ? 178 : 162} y1={27} y2={41} className="chem-battery-short" />
          <text x={leftToRight ? 160 : 180} y={66} className="chem-sign">
            +
          </text>
          <text x={leftToRight ? 180 : 160} y={66} className="chem-sign">
            −
          </text>
          {volt && (
            <text x={170} y={84} className={`chem-meter-text small${askClass(v.voltage, solved)}`}>
              {volt}
            </text>
          )}
        </g>
      )}
      {/* electron arrows */}
      {(v.electrons ?? true) && (
        <g className="chem-e-flow">
          <line x1={leftToRight ? 96 : 140} x2={leftToRight ? 140 : 96} y1={22} y2={22} markerEnd="url(#chem-cell-arrow)" />
          <line x1={leftToRight ? 200 : 244} x2={leftToRight ? 244 : 200} y1={22} y2={22} markerEnd="url(#chem-cell-arrow)" />
          <text x={118} y={14} className="chem-e-text">
            e⁻
          </text>
          <text x={222} y={14} className="chem-e-text">
            e⁻
          </text>
        </g>
      )}
      {/* containers */}
      {one ? (
        <g>
          <path d="M28 118 L32 122 L32 236 Q32 248 44 248 L296 248 Q308 248 308 236 L308 122 L312 118" className="chem-glass-line" />
          <path d="M34 150 L306 150 L306 236 Q306 246 296 246 L44 246 Q34 246 34 236 Z" style={{ fill: liquidFill(v.left.colour) }} className="chem-cell-liquid" />
          <FormulaSvg f={`${v.left.solution}`} x={170} y={232} size={18} className="chem-cell-sol" />
        </g>
      ) : (
        sides.map(({ s, x }) => (
          <g key={x}>
            <path d={`M${x - 64} 118 L${x - 60} 122 L${x - 60} 236 Q${x - 60} 248 ${x - 48} 248 L${x + 48} 248 Q${x + 60} 248 ${x + 60} 236 L${x + 60} 122 L${x + 64} 118`} className="chem-glass-line" />
            <path d={`M${x - 58} 150 L${x + 58} 150 L${x + 58} 236 Q${x + 58} 246 ${x + 48} 246 L${x - 48} 246 Q${x - 58} 246 ${x - 58} 236 Z`} style={{ fill: liquidFill(s.colour) }} className="chem-cell-liquid" />
            <FormulaSvg f={s.solution} x={x} y={234} size={17} className="chem-cell-sol" />
          </g>
        ))
      )}
      {/* salt bridge */}
      {galvanic && (
        <g>
          <path d="M128 200 L128 104 Q128 92 140 92 L200 92 Q212 92 212 104 L212 200" className="chem-bridge" />
          <text x={170} y={110} className="chem-bridge-text">
            salt bridge
          </text>
          {v.bridgeIons && (
            <g className="chem-bridge-ions">
              <line x1={leftToRight ? 186 : 154} x2={leftToRight ? 154 : 186} y1={126} y2={126} markerEnd="url(#chem-cell-arrow)" />
              <text x={170} y={144} className="chem-e-text small">
                anions → anode
              </text>
            </g>
          )}
        </g>
      )}
      {/* electrodes and labels */}
      {sides.map(({ s, x, side }) => {
        const isAnode = side === anode;
        const def = isAnode ? "Anode" : "Cathode";
        const label = s.label === undefined ? `${def}${signs ? ` (${sign(isAnode)})` : ""}` : shownMark(s.label, solved, answer);
        return (
          <g key={side}>
            <rect x={x - 11} y={84} width={22} height={128} rx={4} className={`chem-electrode${s.metal === "C" || s.metal === "Pt" ? " inert" : ""}`} />
            <text x={x} y={104} className="chem-electrode-text">
              {s.metal}
            </text>
            <text x={side === "left" ? 8 : 332} y={278} style={{ textAnchor: side === "left" ? "start" : "end" }} className={`chem-cell-label${askClass(s.label, solved)}`}>
              {label}
            </text>
            {isAnode && (
              <text x={side === "left" ? 8 : 332} y={262} style={{ textAnchor: side === "left" ? "start" : "end" }} className="chem-cell-note">
                oxidation
              </text>
            )}
            {!isAnode && (
              <text x={side === "left" ? 8 : 332} y={262} style={{ textAnchor: side === "left" ? "start" : "end" }} className="chem-cell-note">
                reduction
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
