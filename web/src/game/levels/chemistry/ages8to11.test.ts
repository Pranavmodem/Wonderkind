import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages8to11";

it("chemistry ages 8–11 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every 5-PS1 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["5-PS1"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
