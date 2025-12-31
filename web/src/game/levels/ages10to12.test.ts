import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages10to12";

it("ages 10–12 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every Grade 5, 6 and 7 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["5", "6", "7"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
