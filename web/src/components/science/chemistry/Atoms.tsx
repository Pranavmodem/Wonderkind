/** Atoms (Bohr, simple, Lewis dots), periodic-table tiles and tables. */
import type { CSSProperties } from "react";
import type { Colour, Mark } from "../../../game/types";
import type { ChemistryVisual } from "../../../game/science/chemistryTypes";
import { bohrShells, chargeText, electronConfig, element, ELEMENTS, metalClass, tablePosition, valenceElectrons, type Element, type ElementCategory } from "../../../game/science/elements";
import { num } from "../../visuals/NumberVisuals";
import { askClass, seeded, shownMark } from "./Formula";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;
const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/** Game colour for each element family. */
export const CATEGORY_COLOUR: Record<ElementCategory, Colour> = {
  "alkali-metal": "berry",
  "alkaline-earth": "tangerine",
  "transition-metal": "sun",
  "post-transition-metal": "teal",
  metalloid: "lime",
  nonmetal: "wave",
  halogen: "leaf",
  "noble-gas": "grape",
  lanthanide: "rose",
  actinide: "cocoa",
};

export const CATEGORY_NAME: Record<ElementCategory, string> = {
  "alkali-metal": "Alkali metal",
  "alkaline-earth": "Alkaline earth metal",
  "transition-metal": "Transition metal",
  "post-transition-metal": "Other metal",
  metalloid: "Metalloid",
  nonmetal: "Nonmetal",
  halogen: "Halogen",
  "noble-gas": "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};

const METAL_COLOUR: Record<string, Colour> = { metal: "sun", nonmetal: "wave", metalloid: "lime" };
const BLOCK_COLOUR: Record<string, Colour> = { s: "berry", p: "wave", d: "sun", f: "grape" };

/* ------------------------------------------------------------- isotope text */

/** Isotope/ion notation in HTML: mass number over atomic number, symbol, charge (e.g. ²³₁₁Na⁺). */
export function IsotopeText({ A, Z, symbol, charge = "", className = "" }: { A?: string; Z?: string; symbol: string; charge?: string; className?: string }) {
  return (
    <span className={`chem-iso ${className}`}>
      {(A || Z) && (
        <span className="chem-nuc">
          <span className={A === "?" ? "chem-ask-inline" : ""}>{A ?? ""}</span>
          <span className={Z === "?" ? "chem-ask-inline" : ""}>{Z ?? ""}</span>
        </span>
      )}
      <span className={symbol === "?" ? "chem-ask-inline" : ""}>{symbol}</span>
      {charge && <sup className={charge === "?" ? "chem-ask-inline" : ""}>{charge}</sup>}
    </span>
  );
}

/* ------------------------------------------------------------------ Bohr */

/** Electrons on rings round a nucleus. `ask` draws empty rings with a "?" (electrons hidden). */
export function BohrSvg({
  protons,
  neutrons,
  shells,
  hideP = false,
  hideN = false,
  ask = false,
  valence = false,
  size = 300,
}: {
  protons: number | string;
  neutrons: number | string;
  shells: number[];
  hideP?: boolean;
  hideN?: boolean;
  ask?: boolean;
  valence?: boolean;
  size?: number;
}) {
  const c = size / 2;
  const nucleus = 34;
  const n = Math.max(1, shells.length);
  const gap = Math.min(30, (c - nucleus - 12) / n);
  return (
    <svg className="chem-bohr" viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
      {shells.map((_, k) => (
        <circle key={k} cx={c} cy={c} r={nucleus + gap * (k + 1)} className="chem-shell" />
      ))}
      <circle cx={c} cy={c} r={nucleus} className="chem-nucleus" />
      <text x={c} y={c - 4} className={`chem-nuc-text${hideP ? " ask" : ""}`}>
        {hideP ? "?" : protons} p⁺
      </text>
      <text x={c} y={c + 18} className={`chem-nuc-text n${hideN ? " ask" : ""}`}>
        {hideN ? "?" : neutrons} n
      </text>
      {!ask &&
        shells.map((count, k) => {
          const r = nucleus + gap * (k + 1);
          const outer = k === shells.length - 1;
          const start = -Math.PI / 2;
          return range(count).map((i) => {
            // Up to 8: four spots (top, bottom, right, left), singles first, then pairs, as school diagrams draw them.
            let a: number;
            if (count <= 8) {
              const slot = [0, 2, 1, 3][i % 4];
              const paired = i % 4 < count - 4;
              const spread = 0.17 * (34 / r) * 2.2;
              a = start + (slot * Math.PI) / 2 + (paired ? (i < 4 ? -spread : spread) : 0);
            } else a = start + (i / count) * 2 * Math.PI;
            return <circle key={`${k}-${i}`} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={6.5} className={`chem-electron${valence && outer ? " valence" : ""}`} />;
          });
        })}
      {ask && (
        <text x={c + (nucleus + gap * n) * 0.72} y={c - (nucleus + gap * n) * 0.72 + 8} className="chem-big-ask">
          ?
        </text>
      )}
    </svg>
  );
}

/* ------------------------------------------------------- simple atom */

function SimpleAtom({ protons, neutrons, electrons }: { protons: number; neutrons: number; electrons: number }) {
  const rnd = seeded(protons * 31 + neutrons);
  const total = protons + neutrons;
  // Mix protons and neutrons through the nucleus.
  const kinds = [...Array<"p">(protons).fill("p"), ...Array<"n">(neutrons).fill("n")]
    .map((k) => ({ k, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.k);
  const br = total <= 8 ? 15 : total <= 14 ? 12.5 : 10;
  const cx = 150;
  const cy = 140;
  const balls = kinds.map((k, i) => {
    const rr = br * 1.05 * Math.sqrt(i);
    const a = i * 2.39996;
    return { k, x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
  });
  const orbits = electrons <= 2 ? 1 : 2;
  return (
    <svg className="chem-bohr" viewBox="0 0 300 280" role="img" aria-hidden="true">
      {range(orbits).map((o) => (
        <ellipse key={o} cx={cx} cy={cy} rx={96 + o * 32} ry={56 + o * 22} transform={`rotate(${o ? -28 : 18} ${cx} ${cy})`} className="chem-orbit" />
      ))}
      {balls
        .slice()
        .reverse()
        .map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={br} className={b.k === "p" ? "chem-proton" : "chem-neutron"} />
            {b.k === "p" && (
              <text x={b.x} y={b.y + br * 0.42} className="chem-pm" style={{ fontSize: br * 1.3 }}>
                +
              </text>
            )}
          </g>
        ))}
      {(() => {
        const es = range(electrons).map((i) => {
          const o = electrons <= 2 ? 0 : i < 2 ? 0 : 1;
          const onO = o === 0 ? Math.min(electrons, 2) : electrons - 2;
          const j = o === 0 ? i : i - 2;
          const a = (j / onO) * 2 * Math.PI + (o ? 0.6 : -0.4);
          const rx = 96 + o * 32;
          const ry = 56 + o * 22;
          const rot = ((o ? -28 : 18) * Math.PI) / 180;
          const ex = rx * Math.cos(a);
          const ey = ry * Math.sin(a);
          return { x: cx + ex * Math.cos(rot) - ey * Math.sin(rot), y: cy + ex * Math.sin(rot) + ey * Math.cos(rot) };
        });
        const top = es.reduce((m, e, i) => (e.y < es[m].y ? i : m), 0);
        return es.map((e, i) => (
          <g key={`e${i}`}>
            {i === top && <line x1={e.x} y1={e.y - 10} x2={150} y2={24} className="chem-callout-line" />}
            <circle cx={e.x} cy={e.y} r={10} className="chem-electron" />
            <text x={e.x} y={e.y + 5} className="chem-pm small">
              −
            </text>
          </g>
        ));
      })()}
      <g className="chem-callouts">
        {protons > 0 && (
          <>
            <line x1={balls[kinds.indexOf("p")].x} y1={balls[kinds.indexOf("p")].y} x2={40} y2={250} />
            <text x={14} y={268} className="chem-callout start">
              proton
            </text>
          </>
        )}
        {neutrons > 0 && (
          <>
            <line x1={balls[kinds.indexOf("n")].x} y1={balls[kinds.indexOf("n")].y} x2={250} y2={252} />
            <text x={292} y={268} className="chem-callout end">
              neutron
            </text>
          </>
        )}
        {electrons > 0 && (
          <text x={150} y={18} className="chem-callout">
            electron
          </text>
        )}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------ Lewis dot */

/** An element symbol with valence electron dots (singles first on each side, then pairs), in brackets for ions. */
export function LewisDot({ symbol, dots, charge = "", ask = false }: { symbol: string; dots: number; charge?: string; ask?: boolean }) {
  const cx = 100;
  const cy = 100;
  // Top, right, bottom, left; He's two sit together on top.
  const per = [0, 0, 0, 0];
  if (dots === 2 && symbol === "He") per[0] = 2;
  else for (let i = 0; i < dots; i++) per[i % 4]++;
  const sides = [
    { x: cx, y: cy - 46, dx: 1, dy: 0 },
    { x: cx + 46, y: cy - 2, dx: 0, dy: 1 },
    { x: cx, y: cy + 42, dx: 1, dy: 0 },
    { x: cx - 46, y: cy - 2, dx: 0, dy: 1 },
  ];
  const bracket = !!charge;
  return (
    <svg className="chem-lewis-dot" viewBox={bracket ? "-10 0 240 200" : "0 0 200 200"} role="img" aria-hidden="true">
      <text x={cx} y={cy + 20} className={`chem-lewis-symbol${ask ? " ask" : ""}`}>
        {ask ? "?" : symbol}
      </text>
      {sides.map((s, k) =>
        range(per[k]).map((i) => {
          const off = per[k] === 2 ? (i ? 8 : -8) : 0;
          return <circle key={`${k}-${i}`} cx={s.x + s.dx * off} cy={s.y + s.dy * off} r={6} className="chem-dot" />;
        }),
      )}
      {bracket && (
        <>
          <path d="M28 30 h-12 v140 h12" className="chem-bracket" />
          <path d="M172 30 h12 v140 h-12" className="chem-bracket" />
          <text x={196} y={44} className="chem-lewis-charge">
            {charge}
          </text>
        </>
      )}
    </svg>
  );
}

/* --------------------------------------------------------------- the atom */

export function AtomVisual({ v, solved }: { v: Of<"chem-atom">; solved: boolean }) {
  const e = element(v.protons)!;
  const hide = new Set(solved ? [] : (v.hide ?? []));
  const charge = v.protons - v.electrons;
  const style = v.style ?? "bohr";
  const shells = v.shells ?? bohrShells(v.protons, v.electrons);
  const A = v.protons + v.neutrons;
  const symbolLine =
    (v.showSymbol ?? style === "bohr") ? (
      <div className="chem-atom-caption">
        <IsotopeText
          A={hide.has("mass") ? "?" : String(A)}
          Z={hide.has("protons") ? "?" : String(v.protons)}
          symbol={hide.has("symbol") ? "?" : e.symbol}
          charge={hide.has("charge") ? "?" : chargeText(charge)}
          className="big"
        />
        <span className="chem-atom-name">{hide.has("symbol") ? "" : `${e.name}${charge ? " ion" : ""}`}</span>
      </div>
    ) : null;
  if (style === "lewis") {
    const dots = Math.max(0, Math.min(8, (valenceElectrons(e.z) ?? 0) - charge));
    return <LewisDot symbol={e.symbol} dots={charge > 0 ? 0 : dots} charge={chargeText(charge)} ask={hide.has("symbol")} />;
  }
  if (style === "simple") return <SimpleAtom protons={v.protons} neutrons={v.neutrons} electrons={v.electrons} />;
  return (
    <div className="chem-atom">
      <BohrSvg protons={v.protons} neutrons={v.neutrons} shells={shells} hideP={hide.has("protons")} hideN={hide.has("neutrons")} ask={hide.has("electrons")} valence={v.valence} />
      {symbolLine}
    </div>
  );
}

/* ------------------------------------------------------------ element tile */

export function ElementTile({ v, solved, answer }: { v: Of<"chem-element">; solved: boolean; answer: string }) {
  const e = element(v.element)!;
  const field = (m: Mark | undefined, real: string) => (m === undefined ? real : shownMark(m, solved, real));
  const c = CATEGORY_COLOUR[e.category];
  const mass = e.massIsWhole ? `(${e.mass})` : num(e.mass);
  const rows = v.extra ?? [];
  return (
    <div className="chem-tile-wrap">
      <svg className="chem-tile" viewBox="0 0 200 230" role="img" aria-hidden="true" style={{ "--c": `var(--${c})`, "--c-soft": `var(--${c}-soft)`, "--c-deep": `var(--${c}-deep)` } as CSSProperties}>
        <rect x="6" y="6" width="188" height="218" rx="22" className="chem-tile-bg" />
        <text x="22" y="44" className={`chem-tile-num${askClass(v.number, solved)}`}>
          {field(v.number, String(e.z))}
        </text>
        <text x="100" y="128" className={`chem-tile-sym${askClass(v.symbol, solved)}`}>
          {field(v.symbol, e.symbol)}
        </text>
        <text x="100" y="166" className={`chem-tile-name${askClass(v.name, solved)}`}>
          {field(v.name, e.name)}
        </text>
        <text x="100" y="200" className={`chem-tile-mass${askClass(v.mass, solved)}`}>
          {field(v.mass, mass)}
        </text>
      </svg>
      {(rows.length > 0 || v.config) && (
        <dl className="chem-tile-extra">
          {v.config && (
            <div>
              <dt>Configuration</dt>
              <dd className="config">{electronConfig(e.z, true)}</dd>
            </div>
          )}
          {rows.map((r, i) => (
            <div key={i}>
              <dt>{r.label}</dt>
              <dd className={askClass(r.value, solved)}>{shownMark(r.value, solved, answer)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- table */

export function PeriodicTable({ v, solved, answer }: { v: Of<"chem-table">; solved: boolean; answer: string }) {
  void answer;
  const [p0, p1] = v.periods ?? [1, 7];
  const groups = v.mainOnly ? [1, 2, 13, 14, 15, 16, 17, 18] : (v.groups ?? range(18).map((i) => i + 1));
  const CW = 30;
  const CH = 34;
  const gapAfter = new Set(groups.filter((g, i) => i < groups.length - 1 && groups[i + 1] !== g + 1));
  const colX: Record<number, number> = {};
  let x = 0;
  for (const g of groups) {
    colX[g] = x;
    x += CW + (gapAfter.has(g) ? 8 : 0);
  }
  const trends = v.trends ?? [];
  const across = trends.find((t) => t.dir === "left" || t.dir === "right");
  const down = trends.find((t) => t.dir === "up" || t.dir === "down");
  const left = (down ? 30 : 4) + 18;
  const top = (across ? 34 : 6) + 16;
  const rows = range(p1 - p0 + 1).map((i) => p0 + i);
  const rowY = (period: number) => top + (period - p0) * CH;
  const fRows = v.fBlock && !v.mainOnly && !v.groups && p1 >= 6;
  const tableW = x;
  const tableH = rows.length * CH + (fRows ? 2 * CH + 10 : 0);
  const W = left + tableW + 6;
  const H = top + tableH + 6;
  const ask = new Set(v.ask ?? []);
  const colourOf = (e: Element): Colour | null => {
    for (const h of [...(v.highlight ?? [])].reverse()) {
      const hit = h.cells?.includes(e.symbol) || (h.group !== undefined && e.group === h.group) || (h.period !== undefined && e.period === h.period && e.group !== null) || (h.block !== undefined && e.block === h.block);
      if (hit) return h.colour ?? "sun";
    }
    if (v.colourBy === "category") return CATEGORY_COLOUR[e.category];
    if (v.colourBy === "metal") return METAL_COLOUR[metalClass(e)];
    if (v.colourBy === "block") return BLOCK_COLOUR[e.block];
    return null;
  };
  const cells: { e: Element; x: number; y: number }[] = [];
  for (const e of ELEMENTS) {
    const pos = tablePosition(e);
    if (pos.row <= 7) {
      if (e.period < p0 || e.period > p1 || !groups.includes(pos.col)) continue;
      cells.push({ e, x: left + colX[pos.col], y: rowY(e.period) });
    } else if (fRows) {
      const fx = left + (colX[pos.col] ?? 0);
      cells.push({ e, x: fx, y: top + rows.length * CH + 10 + (pos.row - 8) * CH });
    }
  }
  const show = v.show ?? "symbol";
  // The metal / nonmetal staircase: edges between a metal and a metalloid or nonmetal in groups 13–17.
  const stairs: string[] = [];
  if (v.staircase) {
    for (const c of cells) {
      if (c.e.group === null || c.e.group < 13 || metalClass(c.e) === "metal") continue;
      const leftN = cells.find((o) => o.e.period === c.e.period && o.e.group === c.e.group! - 1);
      if (leftN && metalClass(leftN.e) === "metal") stairs.push(`M${c.x} ${c.y} v${CH}`);
      const below = cells.find((o) => o.e.group === c.e.group && o.e.period === c.e.period + 1);
      if (below && metalClass(below.e) === "metal") stairs.push(`M${c.x} ${c.y + CH} h${CW}`);
    }
  }
  const keyItems: { colour: Colour; label: string }[] = [];
  if (v.key ?? true) {
    for (const h of v.highlight ?? []) if (h.label) keyItems.push({ colour: h.colour ?? "sun", label: h.label });
    if (v.colourBy === "category") {
      const cats = [...new Set(cells.map((c) => c.e.category))];
      for (const k of Object.keys(CATEGORY_COLOUR) as ElementCategory[]) if (cats.includes(k)) keyItems.push({ colour: CATEGORY_COLOUR[k], label: CATEGORY_NAME[k] });
    }
    if (v.colourBy === "metal") (["metal", "metalloid", "nonmetal"] as const).forEach((k) => keyItems.push({ colour: METAL_COLOUR[k], label: k[0].toUpperCase() + k.slice(1) + "s" }));
    if (v.colourBy === "block") (["s", "p", "d", "f"] as const).forEach((k) => cells.some((c) => c.e.block === k) && keyItems.push({ colour: BLOCK_COLOUR[k], label: `${k}-block` }));
  }
  const fullWidth = groups.length > 10;
  return (
    <div className="chem-table-wrap">
      <svg className={`chem-table${fullWidth ? " wide" : ""}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true" style={{ maxWidth: `${Math.round(W * 1.45)}px` }}>
        {groups.map((g) => (
          <text key={`g${g}`} x={left + colX[g] + CW / 2} y={top - 5} className="chem-table-head">
            {g}
          </text>
        ))}
        {rows.map((r) => (
          <text key={`p${r}`} x={left - 5} y={rowY(r) + CH / 2 + 4} className="chem-table-head end">
            {r}
          </text>
        ))}
        {cells.map(({ e, x: cx, y: cy }) => {
          const c = colourOf(e);
          const asked = ask.has(e.symbol);
          const text = show === "blank" ? "" : asked && !solved ? "?" : e.symbol;
          return (
            <g key={e.z} className={`chem-pt-cell${asked ? (solved ? " asked revealed" : " asked") : ""}`} style={c ? ({ "--c": `var(--${c})`, "--c-soft": `var(--${c}-soft)`, "--c-deep": `var(--${c}-deep)` } as CSSProperties) : undefined}>
              <rect x={cx + 1} y={cy + 1} width={CW - 2} height={CH - 2} rx="5" className={c ? "on" : ""} />
              {show === "number" && (
                <text x={cx + CW / 2} y={cy + 11} className="chem-cell-num">
                  {e.z}
                </text>
              )}
              <text x={cx + CW / 2} y={cy + (show === "number" ? 27 : 22)} className={`chem-cell-sym${e.symbol.length > 1 ? " two" : ""}`}>
                {text}
              </text>
            </g>
          );
        })}
        {stairs.length > 0 && <path d={stairs.join(" ")} className="chem-stairs" />}
        {across && (
          <g className="chem-trend">
            <line x1={across.dir === "right" ? left + 4 : left + tableW - 4} x2={across.dir === "right" ? left + tableW - 4 : left + 4} y1={14} y2={14} markerEnd="url(#chem-arrow)" />
            <text x={left + tableW / 2} y={30} className="chem-trend-text">
              {across.label}
            </text>
          </g>
        )}
        {down && (
          <g className="chem-trend">
            <line y1={down.dir === "down" ? top + 4 : top + rows.length * CH - 4} y2={down.dir === "down" ? top + rows.length * CH - 4 : top + 4} x1={12} x2={12} markerEnd="url(#chem-arrow)" />
            <text x={0} y={0} transform={`translate(28 ${top + (rows.length * CH) / 2}) rotate(-90)`} className="chem-trend-text">
              {down.label}
            </text>
          </g>
        )}
        <defs>
          <marker id="chem-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="chem-arrowhead" />
          </marker>
        </defs>
      </svg>
      {keyItems.length > 0 && (
        <div className="chem-key">
          {keyItems.map((k, i) => (
            <span key={i} className="chem-key-item">
              <i className="chem-swatch" style={{ background: `var(--${k.colour}-soft)`, borderColor: `var(--${k.colour})` }} />
              {k.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
