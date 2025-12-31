import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages8to10";

it("ages 8–10 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every Grade 3 and 4 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["3", "4"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
