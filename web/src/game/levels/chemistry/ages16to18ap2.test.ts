import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages16to18ap2";

it("AP Chemistry units 6–9 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every AP Chemistry unit 6–9 topic", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["CHEM.6", "CHEM.7", "CHEM.8", "CHEM.9"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
