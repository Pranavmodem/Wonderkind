import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages16to18ap1";

it("AP Chemistry units 1–5 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every AP Chemistry unit 1–5 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["CHEM.1", "CHEM.2", "CHEM.3", "CHEM.4", "CHEM.5"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
