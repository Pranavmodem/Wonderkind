import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages14to17";

it("chem-14-17 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every chem-14-17 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["HS-PS1", "HS-PS2-6"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
