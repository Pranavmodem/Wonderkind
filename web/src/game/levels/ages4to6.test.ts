import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages4to6";

it("ages 4–6 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every Kindergarten standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["K"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
