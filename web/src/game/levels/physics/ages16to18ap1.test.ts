import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages16to18ap1";

it("AP Physics 1 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every AP Physics 1 topic", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["PHYS.1", "PHYS.2", "PHYS.3", "PHYS.4", "PHYS.5", "PHYS.6", "PHYS.7", "PHYS.8"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
