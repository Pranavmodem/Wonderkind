/** Chemical equations (HTML) and nuclear changes. */
import { Fragment } from "react";
import type { ChemistryVisual, Nuclide, ReactionTerm } from "../../../game/science/chemistryTypes";
import { balance } from "../../../game/science/chemistryValidate";
import { element } from "../../../game/science/elements";
import { num } from "../../visuals/NumberVisuals";
import { IsotopeText } from "./Atoms";
import { FormulaHtml, seeded, shownMark } from "./Formula";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

/** The coefficients a solved equation should show for its "?" blanks (null when they can't be worked out). */
function solvedCoefs(v: Of<"chem-reaction">): (number | null)[] {
  const all = [...v.reactants, ...v.products];
  if (v.words || !all.every((t) => t.formula && t.formula !== "?")) return all.map(() => null);
  const r = balance(
    v.reactants.map((t) => t.formula!),
    v.products.map((t) => t.formula!),
  ).coefficients;
  if (!r) return all.map(() => null);
  const known = all.findIndex((t) => typeof t.coef === "number" || t.coef === undefined);
  const k = known >= 0 ? (typeof all[known].coef === "number" ? (all[known].coef as number) : 1) / r[known] : 1;
  return r.map((c) => Math.round(c * k));
}

function Term({ t, solvedCoef, solved, answer, words }: { t: ReactionTerm; solvedCoef: number | null; solved: boolean; answer: string; words?: boolean }) {
  let coef = null;
  if (!words) {
    if (t.coef === "?") coef = solved ? <span className="chem-coef revealed">{solvedCoef ?? answer}</span> : <span className="chem-ask-box">?</span>;
    else if (t.coef === null) coef = <span className="chem-blank-box" />;
    else if (typeof t.coef === "number" && t.coef !== 1) coef = <span className="chem-coef">{t.coef}</span>;
  }
  return (
    <span className="chem-term">
      {coef}
      {t.text !== undefined ? <span className="chem-word">{t.text}</span> : t.formula === "?" && solved ? <span className="chem-ask-inline">{answer}</span> : <FormulaHtml f={t.formula ?? ""} />}
      {t.state && <span className="chem-state">({t.state})</span>}
    </span>
  );
}

/** A chemical equation, wrapping onto two lines on narrow screens (the arrow stays with the products). */
export function ReactionView({ v, solved, answer }: { v: Of<"chem-reaction">; solved: boolean; answer: string }) {
  const coefs = solvedCoefs(v);
  const side = (terms: ReactionTerm[], offset: number) =>
    terms.map((t, i) => (
      <Fragment key={i}>
        {i > 0 && <span className="chem-plus">+</span>}
        <Term t={t} solvedCoef={coefs[offset + i]} solved={solved} answer={answer} words={v.words} />
      </Fragment>
    ));
  const dH = v.dH === undefined || v.dH === null ? "" : typeof v.dH === "number" ? `${num(v.dH)} kJ/mol` : shownMark(v.dH, solved, answer);
  return (
    <div className="chem-eq-wrap">
      <div className="chem-eq">
        <span className="chem-side">{side(v.reactants, 0)}</span>
        <span className="chem-side">
          <span className="chem-arrow">
            {v.above && <small>{v.above}</small>}
            <span className="chem-arrow-glyph">{v.arrow ?? "→"}</span>
            {v.below && <small>{v.below}</small>}
          </span>
          {side(v.products, v.reactants.length)}
        </span>
      </div>
      {dH && (
        <div className={`chem-dh${v.dH === "?" && !solved ? " ask" : ""}`}>
          ΔH = <b>{dH}</b>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- nuclear */

const PARTICLE_TEXT: Record<string, { A: string; Z: string; s: string; name: string }> = {
  alpha: { A: "4", Z: "2", s: "He", name: "alpha" },
  beta: { A: "0", Z: "−1", s: "e", name: "beta" },
  positron: { A: "0", Z: "+1", s: "e", name: "positron" },
  gamma: { A: "0", Z: "0", s: "γ", name: "gamma" },
  neutron: { A: "1", Z: "0", s: "n", name: "neutron" },
  proton: { A: "1", Z: "1", s: "p", name: "proton" },
};

/** A little nucleus: red protons and grey neutrons packed in a ball, or a big blob with counts for heavy ones. */
function NucleusPic({ n }: { n: Nuclide }) {
  if ("particle" in n) {
    const k = n.particle;
    return (
      <svg viewBox="-30 -30 60 60" className="chem-nuc-pic small" aria-hidden="true">
        {k === "alpha" && (
          <>
            <circle cx={-6} cy={-6} r={9} className="chem-proton" />
            <circle cx={7} cy={-5} r={9} className="chem-neutron" />
            <circle cx={-5} cy={7} r={9} className="chem-neutron" />
            <circle cx={7} cy={7} r={9} className="chem-proton" />
          </>
        )}
        {(k === "beta" || k === "positron") && (
          <>
            <circle r={9} className="chem-electron" />
            <text y={4.5} className="chem-pm small">
              {k === "beta" ? "−" : "+"}
            </text>
          </>
        )}
        {k === "neutron" && <circle r={11} className="chem-neutron" />}
        {k === "proton" && <circle r={11} className="chem-proton" />}
        {k === "gamma" && <path d="M-26 0 q4 -12 8 0 t8 0 t8 0 t8 0 t8 0 t8 0" className="chem-gamma" />}
      </svg>
    );
  }
  const Z = element(n.element)?.z ?? 1;
  const N = n.A - Z;
  if (n.A > 24) {
    return (
      <svg viewBox="-40 -40 80 80" className="chem-nuc-pic" aria-hidden="true">
        <circle r={36} className="chem-nuc-blob" />
        <text y={-3} className="chem-nuc-blob-text">
          {Z} p⁺
        </text>
        <text y={17} className="chem-nuc-blob-text">
          {N} n
        </text>
      </svg>
    );
  }
  const rnd = seeded(n.A * 7 + Z);
  const kinds = [...Array<number>(Z).fill(1), ...Array<number>(N).fill(0)].map((k) => ({ k, r: rnd() })).sort((a, b) => a.r - b.r);
  const br = Math.min(13, 26 / Math.sqrt(Math.max(1, n.A)));
  return (
    <svg viewBox="-40 -40 80 80" className="chem-nuc-pic" aria-hidden="true">
      {kinds
        .map((o, i) => ({ ...o, x: br * 1.05 * Math.sqrt(i) * Math.cos(i * 2.4), y: br * 1.05 * Math.sqrt(i) * Math.sin(i * 2.4) }))
        .reverse()
        .map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={br} className={b.k ? "chem-proton" : "chem-neutron"} />
        ))}
    </svg>
  );
}

function NuclideTerm({ n, solved, balls }: { n: Nuclide; solved: boolean; balls: boolean }) {
  const ask = solved ? undefined : n.ask;
  let A: string;
  let Z: string;
  let s: string;
  let count = 1;
  let name: string;
  if ("particle" in n) {
    const t = PARTICLE_TEXT[n.particle];
    ({ A, Z, s, name } = t);
    count = n.count ?? 1;
  } else {
    const e = element(n.element);
    A = String(n.A);
    Z = String(e?.z ?? "?");
    s = n.element;
    name = `${e?.name ?? n.element}-${n.A}`;
  }
  return (
    <span className="chem-nuc-term">
      {balls && <NucleusPic n={n} />}
      <span className="chem-nuc-line">
        {count > 1 && <span className="chem-coef">{count}</span>}
        <IsotopeText A={ask === "A" ? "?" : A} Z={ask === "Z" ? "?" : Z} symbol={ask === "symbol" ? "?" : s} className="big" />
      </span>
      {balls && <span className="chem-nuc-name">{ask === "symbol" ? "?" : name}</span>}
    </span>
  );
}

export function NucleusView({ v, solved }: { v: Of<"chem-nucleus">; solved: boolean }) {
  const balls = v.balls ?? true;
  const side = (list: Nuclide[]) =>
    list.map((n, i) => (
      <Fragment key={i}>
        {i > 0 && <span className="chem-plus">+</span>}
        <NuclideTerm n={n} solved={solved} balls={balls} />
      </Fragment>
    ));
  return (
    <div className="chem-eq chem-nuclear">
      <span className="chem-side">{side(v.before)}</span>
      <span className="chem-side">
        <span className="chem-arrow">
          {v.change && <small>{v.change}</small>}
          <span className="chem-arrow-glyph">→</span>
        </span>
        {side(v.after)}
      </span>
    </div>
  );
}
