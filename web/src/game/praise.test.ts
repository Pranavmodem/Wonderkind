import { describe, expect, it } from "vitest";
import { PRAISE } from "./praise";
import type { Subject } from "./types";

const SUBJECTS = Object.keys(PRAISE) as Subject[];

describe("praise", () => {
  it("never names another subject", () => {
    for (const subject of SUBJECTS) {
      for (const other of SUBJECTS.filter((s) => s !== subject)) {
        const named = PRAISE[subject].filter((line) => line.toLowerCase().includes(other));
        expect(named, `${subject} praise naming ${other}`).toEqual([]);
      }
    }
  });

  it("gives every subject its own star line", () => {
    expect(PRAISE.math).toContain("Math star!");
    expect(PRAISE.physics).toContain("Physics star!");
    expect(PRAISE.chemistry).toContain("Chemistry star!");
  });
});
