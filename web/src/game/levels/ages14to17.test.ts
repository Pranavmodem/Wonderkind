import { expect, it } from "vitest";
import { missingStandards, unknownStandards } from "../standards";
import { worldProblems } from "../validate";
import { NOT_COVERED, WORLDS } from "./ages14to17";
it("ages 14–17 levels are valid", () => { expect(worldProblems(WORLDS)).toEqual([]); });
it("teaches every geometry, trig and probability standard", () => {
  expect(missingStandards(WORLDS, NOT_COVERED, ["HSG", "HSF-TF", "HSN-CN", "HSN-VM", "HSS-IC", "HSS-CP", "HSS-MD"])).toEqual([]);
  expect(unknownStandards(WORLDS)).toEqual([]);
});
