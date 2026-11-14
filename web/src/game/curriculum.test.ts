import { describe, expect, it } from "vitest";
import { ALL_LEVELS, COMPLETE, NOT_COVERED, WORLDS, nextLevel } from "./curriculum";
import { EMPTY_SAVE, isUnlocked, rememberSeen, starsFor, suggestedLevel, type Save } from "./progress";
import { adapt, buildLesson, makeChoices } from "./questions";
import { missingStandards, SUBJECT_PREFIXES, unknownStandards } from "./standards";
import { worldProblems } from "./validate";

describe("curriculum", () => {
  it("every level makes valid questions", () => {
    expect(worldProblems(WORLDS, 150)).toEqual([]);
  });

  it("has every age band installed", () => {
    expect(COMPLETE).toBe(true);
  });

  it("teaches every math, physics and chemistry standard, or says why not", () => {
    expect(missingStandards(WORLDS, NOT_COVERED, SUBJECT_PREFIXES.math)).toEqual([]);
    expect(missingStandards(WORLDS, NOT_COVERED, SUBJECT_PREFIXES.physics)).toEqual([]);
    expect(missingStandards(WORLDS, NOT_COVERED, SUBJECT_PREFIXES.chemistry)).toEqual([]);
    expect(unknownStandards(WORLDS)).toEqual([]);
  });

  it("has unique level ids", () => {
    const ids = ALL_LEVELS.map((e) => e.level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never puts two worlds of the same colour next to each other", () => {
    WORLDS.slice(1).forEach((w, i) => expect(w.color).not.toBe(WORLDS[i].color));
  });

  it("keeps working at every difficulty", () => {
    for (const { level } of ALL_LEVELS) {
      for (const difficulty of ["easier", "normal", "harder"] as const) {
        for (const q of buildLesson(level.make, 6).map((x) => adapt(x, difficulty))) {
          if (q.input === "choices") expect(q.choices).toContain(q.answer);
          if (difficulty === "easier" && q.input === "choices") expect(q.choices!.length).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

describe("makeChoices", () => {
  it("keeps choices in range and includes the answer", () => {
    for (let i = 0; i < 200; i++) {
      const choices = makeChoices(1, { n: 4, min: 1, max: 10, likely: [0, 2, 11] });
      expect(choices).toContain(1);
      expect(choices).toHaveLength(4);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(1));
    }
  });
});

describe("progress", () => {
  it("awards stars for first-try answers", () => {
    expect(starsFor(8, 8)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(7, 8)).toBe(2);
    expect(starsFor(5, 8)).toBe(2);
    expect(starsFor(4, 8)).toBe(1);
  });

  it("opens the first level of every world, then in order unless grown-ups open all", () => {
    const w = WORLDS[0];
    expect(isUnlocked(EMPTY_SAVE, w, 0)).toBe(true);
    expect(isUnlocked(EMPTY_SAVE, w, 1)).toBe(false);
    expect(isUnlocked({ ...EMPTY_SAVE, stars: { [w.levels[0].id]: 1 } }, w, 1)).toBe(true);
    expect(isUnlocked({ ...EMPTY_SAVE, settings: { ...EMPTY_SAVE.settings, openAll: true } }, w, 3)).toBe(true);
  });

  it("suggests a level for the child's age, then carries on in the world played last", () => {
    expect(suggestedLevel(EMPTY_SAVE, WORLDS)).toBe(WORLDS[0].levels[0].id);
    const tenYearOld: Save = { ...EMPTY_SAVE, age: 10 };
    const pick = WORLDS.find((w) => w.levels.some((l) => l.id === suggestedLevel(tenYearOld, WORLDS)))!;
    expect(pick.ages[1]).toBeGreaterThanOrEqual(10);
    const mid = WORLDS[3];
    const played: Save = { ...EMPTY_SAVE, stars: { [mid.levels[0].id]: 2 }, lastLevel: mid.levels[0].id };
    expect(suggestedLevel(played, WORLDS)).toBe(mid.levels[1].id);
  });

  it("moves to the next world after a world's last level", () => {
    const first = WORLDS[0];
    expect(nextLevel(first.levels[first.levels.length - 1].id)?.level.id).toBe(WORLDS[1].levels[0].id);
    const lastWorld = WORLDS[WORLDS.length - 1];
    expect(nextLevel(lastWorld.levels[lastWorld.levels.length - 1].id)).toBeUndefined();
  });

  it("remembers recent questions without growing forever", () => {
    let save = EMPTY_SAVE;
    for (let i = 0; i < 20; i++) save = rememberSeen(save, "x", [`a${i}`, `b${i}`, `c${i}`, `d${i}`]);
    expect(save.recent.x.length).toBe(60);
    expect(save.recent.x.at(-1)).toBe("d19");
  });
});
