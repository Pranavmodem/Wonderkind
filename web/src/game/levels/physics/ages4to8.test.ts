import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages4to8";

it("physics ages 4–8 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every K-PS2, K-PS3 and 1-PS4 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["K-PS2", "K-PS3", "1-PS4"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
