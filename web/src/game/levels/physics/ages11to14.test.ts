import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages11to14";

it("physics ages 11–14 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every middle school physics standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["MS-PS2", "MS-PS3", "MS-PS4"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
