import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../../standards";
import { worldProblems } from "../../validate";
import { NOT_COVERED, WORLDS } from "./ages11to14";

it("middle-school chemistry levels are valid", () => {
  expect(worldProblems(WORLDS)).toEqual([]);
});

it("teaches every MS-PS1 standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["MS-PS1"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
