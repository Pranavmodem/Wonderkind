import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages16to18ap2";

it("AP Physics 2 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every AP Physics 2 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["PHYS.9", "PHYS.10", "PHYS.11", "PHYS.12", "PHYS.13", "PHYS.14", "PHYS.15"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
