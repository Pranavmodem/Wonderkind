import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages5to8";

it("chemistry ages 5–8 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every 2-PS1 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["2-PS1"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
