import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages6to8";

it("ages 6–8 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every Grade 1 and 2 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["1", "2"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
