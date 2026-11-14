import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages8to11";

it("physics ages 8–11 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every 3-PS2, 4-PS3, 4-PS4, 5-PS2 and 5-PS3 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["3-PS2", "4-PS3", "4-PS4", "5-PS2", "5-PS3"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
