import { Fragment, type ReactNode } from "react";
import type { ChemistryVisual } from "../../game/science/chemistryTypes";
import { element } from "../../game/science/elements";
import { AtomVisual, ElementTile, PeriodicTable } from "./chemistry/Atoms";
import { CellView } from "./chemistry/Cell";
import { NucleusView, ReactionView } from "./chemistry/Equations";
import { askClass, shownMark } from "./chemistry/Formula";
import { EnergyProfile, HeatingCurve, PhScale, SpectrumView, TitrationCurve } from "./chemistry/Graphs";
import { BeakerVisual, Burette } from "./chemistry/Lab";
import { MaterialsView } from "./chemistry/Materials";
import { MoleculeView } from "./chemistry/MoleculeView";
import { distinctSpecies, panelSeed, ParticleBox, ParticleKey, particleDiameter, unitFor } from "./chemistry/Particles";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

function ParticlesVisual({ v, solved, answer }: { v: Of<"chem-particles">; solved: boolean; answer: string }) {
  const most = Math.max(...v.panels.map((p) => p.species.reduce((t, s) => t + s.count, 0)));
  const d = particleDiameter(most);
  const kinds = distinctSpecies(v.panels);
  const showKey = v.key ?? kinds.length > 1;
  const unit = unitFor(kinds, d / 2 - 1);
  const joiner = v.joiner === undefined ? "→" : v.joiner;
  return (
    <div className="chem-particles">
      <div className={`chem-panels n${v.panels.length}`}>
        {v.panels.map((p, i) => (
          <Fragment key={i}>
            {i > 0 && joiner && (
              <span className="chem-joiner">
                {v.joinerLabel && <small>{v.joinerLabel}</small>}
                {joiner}
              </span>
            )}
            <figure className="chem-panel">
              <ParticleBox
                panel={{ ...p, species: p.species.map((s) => (s.formula || s.colour || s.name === undefined ? s : { ...s, colour: kinds.find((k) => !k.formula && k.name === s.name)?.colour })) }}
                diameter={d}
                seed={panelSeed(p)}
                unit={unit}
              />
              {p.label !== undefined && p.label !== null && <figcaption className={askClass(p.label, solved)}>{shownMark(p.label, solved, answer)}</figcaption>}
            </figure>
          </Fragment>
        ))}
      </div>
      {showKey && <ParticleKey species={kinds} />}
    </div>
  );
}

/** Words for the screen reader. */
function describe(v: ChemistryVisual): string {
  switch (v.kind) {
    case "chem-particles":
      return `Particle picture: ${v.panels.map((p) => `${p.arrangement ?? "gas"} with ${p.species.map((s) => `${s.count} ${s.name ?? s.formula ?? "particles"}`).join(" and ")}`).join(", then ")}`;
    case "chem-atom": {
      const e = element(v.protons);
      return `Atom of ${e?.name ?? "an element"}`;
    }
    case "chem-element":
      return `Periodic table tile for ${element(v.element)?.name ?? v.element}`;
    case "chem-table":
      return "Periodic table";
    case "chem-molecule":
      return `Molecule ${v.molecule ?? ""}`.trim();
    case "chem-reaction":
      return `Equation: ${[v.reactants, v.products].map((side) => side.map((t) => `${typeof t.coef === "number" && t.coef !== 1 ? t.coef : t.coef === "?" ? "?" : ""}${t.formula ?? t.text ?? ""}`).join(" + ")).join(` ${v.arrow ?? "→"} `)}`;
    case "chem-beaker":
      return `Lab glassware: ${v.panels.map((g) => g.glass).join(", ")}`;
    case "chem-energy":
      return v.mode === "profile" ? "Reaction energy diagram" : v.cooling ? "Cooling curve" : "Heating curve";
    case "chem-ph":
      return "pH scale from 0 to 14";
    case "chem-spectrum":
      return v.mode === "mass" ? "Mass spectrum" : v.mode === "pes" ? "Photoelectron spectrum" : `${v.mode === "emission" ? "Emission" : "Absorption"} spectrum`;
    case "chem-nucleus":
      return `Nuclear change${v.change ? `: ${v.change}` : ""}`;
    case "chem-titration":
      return v.mode === "curve" ? "Titration curve" : "Burette over a flask";
    case "chem-cell":
      return `${v.type === "galvanic" ? "Galvanic" : "Electrolytic"} cell with ${v.left.metal} and ${v.right.metal}`;
    case "chem-materials":
      return v.mode === "objects" ? "Objects and their materials" : v.mode === "pieces" ? "Blocks built into new things" : "Heating and cooling changes";
  }
}

/**
 * Draws a "chem-" picture: returns its aria label and content. `solved` is true once the question is over
 * (show any hidden "?" as `answer`, the answer text).
 */
export function chemistryVisual(v: ChemistryVisual, solved: boolean, answer: string): { label: string; body: ReactNode } {
  const p = { solved, answer };
  let body: ReactNode = null;
  switch (v.kind) {
    case "chem-particles":
      body = <ParticlesVisual v={v} {...p} />;
      break;
    case "chem-atom":
      body = <AtomVisual v={v} solved={solved} />;
      break;
    case "chem-element":
      body = <ElementTile v={v} {...p} />;
      break;
    case "chem-table":
      body = <PeriodicTable v={v} {...p} />;
      break;
    case "chem-molecule":
      body = <MoleculeView v={v} {...p} />;
      break;
    case "chem-reaction":
      body = <ReactionView v={v} {...p} />;
      break;
    case "chem-beaker":
      body = <BeakerVisual v={v} {...p} />;
      break;
    case "chem-energy":
      body = v.mode === "profile" ? <EnergyProfile v={v} {...p} /> : <HeatingCurve v={v} {...p} />;
      break;
    case "chem-ph":
      body = <PhScale v={v} {...p} />;
      break;
    case "chem-spectrum":
      body = <SpectrumView v={v} {...p} />;
      break;
    case "chem-nucleus":
      body = <NucleusView v={v} solved={solved} />;
      break;
    case "chem-titration":
      body = v.mode === "curve" ? <TitrationCurve v={v} {...p} /> : <Burette v={v} {...p} />;
      break;
    case "chem-cell":
      body = <CellView v={v} {...p} />;
      break;
    case "chem-materials":
      body = <MaterialsView v={v} {...p} />;
      break;
  }
  return { label: describe(v), body: <div className={`chem ${v.kind}`}>{body}</div> };
}
