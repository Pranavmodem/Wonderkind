import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages14to17";

it("phys-14-17 levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every phys-14-17 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["HS-PS2-1", "HS-PS2-2", "HS-PS2-3", "HS-PS2-4", "HS-PS2-5", "HS-PS3", "HS-PS4"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
