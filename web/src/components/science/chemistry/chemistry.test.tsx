import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { CHEMISTRY_ACTIVITIES, CHEMISTRY_VISUALS } from "../../../dev/chemistrySamples";
import { activityProblems } from "../../../game/validate";
import type { ChemistryActivity, ChemistryVisual } from "../../../game/science/chemistryTypes";
import { balance, chemistryActivityProblems, chemistryVisualProblems } from "../../../game/science/chemistryValidate";
import { bohrShells, electronConfig, ELEMENTS, element, molarMass, parseFormula } from "../../../game/science/elements";
import { ActivityStage } from "../../activities/ActivityStage";
import { Visual } from "../../Visual";
import { MOLECULES } from "./molecules";

describe("elements", () => {
  it("has all 118 in order with sane data", () => {
    expect(ELEMENTS).toHaveLength(118);
    ELEMENTS.forEach((e, i) => expect(e.z).toBe(i + 1));
    expect(element("Na")?.mass).toBe(22.99);
    expect(element(17)?.symbol).toBe("Cl");
    expect(element("Fe")?.ions).toEqual([3, 2]);
  });

  it("reads formulas", () => {
    expect(parseFormula("Ca(OH)₂").atoms).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormula("SO₄²⁻").charge).toBe(-2);
    expect(parseFormula("CuSO₄·5H₂O").atoms).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(parseFormula("NaCl(aq)").atoms).toEqual({ Na: 1, Cl: 1 });
    expect(parseFormula("²³⁸₉₂U").nuclide).toEqual({ A: 238, Z: 92 });
    expect(parseFormula("Xy").unknown).toEqual(["Xy"]);
    expect(molarMass("H₂O")).toBe(18.015);
  });

  it("knows electron arrangements", () => {
    expect(electronConfig(26, true)).toBe("[Ar] 4s² 3d⁶");
    expect(electronConfig(29, true)).toBe("[Ar] 4s¹ 3d¹⁰");
    expect(electronConfig(26, true, 24)).toBe("[Ar] 3d⁶");
    expect(bohrShells(19)).toEqual([2, 8, 8, 1]);
    expect(bohrShells(17, 18)).toEqual([2, 8, 8]);
    expect(bohrShells(26)).toEqual([2, 8, 14, 2]);
  });
});

describe("balancing", () => {
  it("finds the smallest whole numbers", () => {
    expect(balance(["H₂", "O₂"], ["H₂O"]).coefficients).toEqual([2, 1, 2]);
    expect(balance(["C₃H₈", "O₂"], ["CO₂", "H₂O"]).coefficients).toEqual([1, 5, 3, 4]);
    expect(balance(["KMnO₄", "HCl"], ["KCl", "MnCl₂", "H₂O", "Cl₂"]).coefficients).toEqual([2, 16, 2, 2, 8, 5]);
    expect(balance(["Cu²⁺", "e⁻"], ["Cu"]).coefficients).toEqual([1, 2, 1]);
    expect(balance(["²³⁸₉₂U"], ["²³⁴₉₀Th", "⁴₂He"]).coefficients).toEqual([1, 1, 1]);
  });

  it("refuses impossible or ambiguous equations", () => {
    expect(balance(["NaCl"], ["KBr"]).coefficients).toBeNull();
    expect(balance(["H₂", "O₂"], ["H₂O", "H₂O₂"]).coefficients).toBeNull();
  });

  it("catches bad pictures and activities", () => {
    expect(chemistryVisualProblems({ kind: "chem-reaction", reactants: [{ formula: "H₂" }, { formula: "O₂" }], products: [{ formula: "H₂O" }] })).not.toEqual([]);
    expect(chemistryVisualProblems({ kind: "chem-reaction", reactants: [{ coef: "?", formula: "H₂" }, { formula: "O₂" }], products: [{ coef: 2, formula: "H₂O" }] })).toEqual([]);
    expect(chemistryVisualProblems({ kind: "chem-atom", protons: 11, neutrons: 12, electrons: 11, shells: [2, 8, 2] })).not.toEqual([]);
    expect(chemistryVisualProblems({ kind: "chem-element", element: "Qq" })).not.toEqual([]);
    expect(chemistryVisualProblems({ kind: "chem-nucleus", before: [{ element: "U", A: 238 }], after: [{ element: "Th", A: 230 }, { particle: "alpha" }] })).not.toEqual([]);
    expect(chemistryActivityProblems({ kind: "chem-balance", reactants: ["H₂", "O₂"], products: ["H₂O"], given: [2, null, 3] })).not.toEqual([]);
    expect(chemistryActivityProblems({ kind: "chem-buildAtom", target: { element: "Zz" } })).not.toEqual([]);
    expect(chemistryActivityProblems({ kind: "chem-buildMolecule", center: "C", tray: ["H"], target: "CH₃" })).not.toEqual([]);
    expect(chemistryActivityProblems({ kind: "chem-states", substance: "water", melt: 0, boil: 100, target: "gas", max: 90 })).not.toEqual([]);
  });

  it("has a valid picture for every molecule preset", () => {
    for (const key of Object.keys(MOLECULES)) expect(chemistryVisualProblems({ kind: "chem-molecule", molecule: key })).toEqual([]);
  });
});

describe("gallery samples", () => {
  it("are all valid", () => {
    for (const [name, v] of CHEMISTRY_VISUALS) expect([name, chemistryVisualProblems(v as ChemistryVisual)]).toEqual([name, []]);
    for (const [name, a] of CHEMISTRY_ACTIVITIES) {
      const p = a.kind.startsWith("chem-") ? chemistryActivityProblems(a as ChemistryActivity) : activityProblems(a);
      expect([name, p]).toEqual([name, []]);
    }
  });

  it("render, asking and solved", () => {
    for (const [, v] of CHEMISTRY_VISUALS)
      for (const solved of [false, true]) expect(renderToString(<Visual v={v} hint={false} reveal={solved} solved={solved} answer="42" />).length).toBeGreaterThan(50);
    for (const [, a] of CHEMISTRY_ACTIVITIES)
      for (const solved of [false, true]) expect(renderToString(<ActivityStage activity={a} solved={solved} locked={false} onSubmit={() => {}} />).length).toBeGreaterThan(50);
  });
});
