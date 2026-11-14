import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages16to18";

it("calculus levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every calculus topic", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["CALC"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
