/** K–2 materials pictures: objects and what they're made of, block builds, heating and cooling changes. */
import { Fragment, type CSSProperties } from "react";
import type { BlockDesign, ChemistryVisual, Material, MaterialProperty } from "../../../game/science/chemistryTypes";
import type { Colour } from "../../../game/types";
import { askClass, shownMark } from "./Formula";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

export const MATERIAL_NAME: Record<Material, string> = {
  wood: "wood",
  metal: "metal",
  plastic: "plastic",
  glass: "glass",
  rubber: "rubber",
  cloth: "cloth",
  paper: "paper",
  ice: "ice",
  stone: "stone",
  clay: "clay",
  water: "water",
};

export const PROPERTY_ICON: Record<MaterialProperty, string> = {
  hard: "🪨",
  soft: "🧸",
  bendy: "🌿",
  stretchy: "🪢",
  "see-through": "👓",
  waterproof: "☔",
  absorbent: "🧽",
  rough: "🦔",
  smooth: "🫧",
  shiny: "✨",
  floats: "🛟",
  sinks: "⚓",
  magnetic: "🧲",
  breakable: "💥",
  strong: "💪",
};

function Objects({ v, solved, answer }: { v: Of<"chem-materials"> & { mode: "objects" }; solved: boolean; answer: string }) {
  return (
    <div className={`chem-objects n${v.items.length}`}>
      {v.items.map((it, i) => (
        <div key={i} className="chem-object">
          <span className="chem-object-emoji">{it.emoji}</span>
          {it.label !== undefined && it.label !== null && <span className={`chem-object-name${askClass(it.label, solved)}`}>{shownMark(it.label, solved, answer)}</span>}
          {it.material && (
            <span className={`chem-material${it.material === "?" && !solved ? " ask" : ""}`}>
              <i className={`chem-swatch mat-${it.material === "?" ? "unknown" : it.material}`} />
              {it.material === "?" ? (solved ? answer : "?") : MATERIAL_NAME[it.material]}
            </span>
          )}
          {it.properties && it.properties.length > 0 && (
            <span className="chem-props">
              {it.properties.map((p, k) =>
                p === "?" ? (
                  <span key={k} className={`chem-prop${solved ? " revealed" : " ask"}`}>
                    {solved ? answer : "?"}
                  </span>
                ) : (
                  <span key={k} className="chem-prop">
                    <span aria-hidden="true">{PROPERTY_ICON[p]}</span> {p}
                  </span>
                ),
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

/** 8-block designs, rows from top to bottom ("x" = a block). Every design uses exactly 8 blocks. */
export const BLOCK_DESIGNS: Record<BlockDesign, string[]> = {
  tower: ["xx", "xx", "xx", "xx"],
  wall: ["xxxx", "xxxx"],
  house: ["..x..", ".xxx.", "xx.xx"],
  car: ["..xx", "xxxx", "x..x"],
  boat: ["..x..", "..xx.", "xxxxx"],
  bridge: ["xxxxxx", "x....x"],
  robot: [".x.", "xxx", "x.x", "x.x"],
  train: ["x....", "xxxxx", ".x.x."],
  pile: [".x...", ".xx.x", "xxxx."],
};

const BLOCK_COLOURS: Colour[] = ["berry", "sun", "wave", "leaf", "grape", "tangerine", "teal", "rose"];

/** Blocks of a design, numbered bottom row first so the same colours land low in every build. */
function blocks(d: BlockDesign) {
  const rows = BLOCK_DESIGNS[d];
  const out: { x: number; y: number }[] = [];
  for (let r = rows.length - 1; r >= 0; r--) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === "x") out.push({ x: c, y: r });
  return { cells: out, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

function Build({ design, ask, messy = false }: { design: BlockDesign; ask?: string; messy?: boolean }) {
  const u = 20;
  if (ask !== undefined)
    return (
      <svg viewBox="0 0 130 100" className="chem-build" aria-hidden="true">
        <rect x={20} y={10} width={90} height={80} rx={16} className="chem-ask-rect" />
        <text x={65} y={ask === "?" ? 64 : 58} className={ask === "?" ? "chem-big-ask" : "chem-ask-word"}>
          {ask}
        </text>
      </svg>
    );
  const { cells, w, h } = blocks(design);
  const ox = (130 - w * u) / 2;
  const oy = 96 - h * u;
  return (
    <svg viewBox="0 0 130 100" className="chem-build" aria-hidden="true">
      <line x1={4} x2={126} y1={97} y2={97} className="chem-ground" />
      {cells.map((c, i) => {
        const col = BLOCK_COLOURS[i % BLOCK_COLOURS.length];
        const x = ox + c.x * u;
        const y = oy + c.y * u;
        const rot = messy ? ((i * 37) % 30) - 15 : 0;
        return (
          <g key={i} transform={`rotate(${rot} ${x + u / 2} ${y + u / 2})`} style={{ "--b": `var(--${col})`, "--b-deep": `var(--${col}-deep)` } as CSSProperties}>
            <rect x={x + 1} y={y + 1} width={u - 2} height={u - 2} rx={4} className="chem-block" />
            <rect x={x + 6} y={y - 2} width={u - 12} height={4} rx={1.5} className="chem-stud" />
          </g>
        );
      })}
    </svg>
  );
}

function Pieces({ v, solved, answer }: { v: Of<"chem-materials"> & { mode: "pieces" }; solved: boolean; answer: string }) {
  const steps = v.steps ?? 3;
  const list: { d: BlockDesign; ask?: string; messy?: boolean }[] = [{ d: v.from }];
  if (steps === 3) list.push({ d: "pile", messy: true });
  list.push(v.to === "?" ? { d: "pile", ask: solved ? answer : "?" } : { d: v.to });
  return (
    <div className={`chem-panels n${list.length}`}>
      {list.map((b, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="chem-joiner">→</span>}
          <figure className="chem-panel small">
            <Build design={b.d} ask={b.ask} messy={b.messy} />
            {v.labels?.[i] !== undefined && v.labels[i] !== null && <figcaption className={askClass(v.labels[i], solved)}>{shownMark(v.labels[i], solved, answer)}</figcaption>}
          </figure>
        </Fragment>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ change */

function Change({ v, solved, answer }: { v: Of<"chem-materials"> & { mode: "change" }; solved: boolean; answer: string }) {
  const rev = v.reversible === "?" && solved ? answer : v.reversible;
  return (
    <div className="chem-change">
      <div className="chem-change-row">
        {v.steps.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="chem-change-arrow">
                <small>{v.arrows[i - 1]}</small>→
              </span>
            )}
            <span className="chem-change-step">
              <span className="chem-change-emoji">{s.emoji}</span>
              {s.label !== undefined && s.label !== null && <span className={askClass(s.label, solved)}>{shownMark(s.label, solved, answer)}</span>}
            </span>
          </Fragment>
        ))}
      </div>
      {rev !== undefined && (
        <div className={`chem-back${rev === true ? " yes" : rev === false ? " no" : " ask"}`}>
          <svg viewBox="0 0 200 30" aria-hidden="true">
            <path d="M184 4 Q184 24 160 24 L40 24 Q16 24 16 4" className="chem-back-path" />
            <path d="M10 12 L16 2 L22 12" className="chem-back-path" />
            {rev === false && <path d="M90 10 L110 30 M110 10 L90 30" className="chem-back-cross" transform="translate(0 -6)" />}
          </svg>
          <span>{rev === true ? "It can change back" : rev === false ? "It can't change back" : typeof rev === "string" && rev !== "?" ? rev : "Can it change back?"}</span>
        </div>
      )}
    </div>
  );
}

export function MaterialsView({ v, solved, answer }: { v: Of<"chem-materials">; solved: boolean; answer: string }) {
  if (v.mode === "objects") return <Objects v={v} solved={solved} answer={answer} />;
  if (v.mode === "pieces") return <Pieces v={v} solved={solved} answer={answer} />;
  return <Change v={v} solved={solved} answer={answer} />;
}
