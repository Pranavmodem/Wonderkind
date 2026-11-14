import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages12to15";

it("ages 12–15 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every Grade 8 and Algebra 1 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["8", "HSN-RN", "HSN-Q", "HSA", "HSF-IF", "HSF-BF", "HSF-LE", "HSS-ID"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
