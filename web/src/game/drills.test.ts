import { describe, expect, it } from "vitest";
import { factsFor, mastery, pickFact, record, timesKey } from "./drills";

describe("speed drills", () => {
  it("builds every fact in the chosen tables, with correct answers", () => {
    const times = factsFor({ op: "×", set: [7], seconds: 60 });
    expect(times).toHaveLength(12);
    times.forEach((f) => {
      const [a, b] = f.text.split(" × ").map(Number);
      expect(a * b).toBe(f.answer);
    });
    const divide = factsFor({ op: "÷", set: [6], seconds: 60 });
    divide.forEach((f) => {
      const [a, b] = f.text.split(" ÷ ").map(Number);
      expect(a / b).toBe(f.answer);
    });
  });

  it("keeps add and take-away facts in range", () => {
    for (const op of ["+", "−"] as const) {
      for (const max of [10, 20, 100]) {
        for (const f of factsFor({ op, set: [max], seconds: 60 })) {
          const [a, b] = f.text.split(` ${op} `).map(Number);
          expect(op === "+" ? a + b : a - b).toBe(f.answer);
          expect(f.answer).toBeGreaterThanOrEqual(0);
          expect(op === "+" ? f.answer : a).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it("treats 8 × 7 and 7 × 8 as the same fact", () => {
    expect(timesKey(8, 7)).toBe(timesKey(7, 8));
  });

  it("tracks mastery from accuracy and speed", () => {
    expect(mastery(undefined)).toBe("new");
    let s = record(undefined, true, 1500);
    s = record(s, true, 2000);
    expect(mastery(s)).toBe("fast");
    s = record(s, false, 9000);
    s = record(s, false, 9000);
    expect(mastery(s)).toBe("learning");
  });

  it("asks missed facts more often and doesn't repeat the last few", () => {
    const facts = factsFor({ op: "×", set: [3], seconds: 60 });
    const stats = Object.fromEntries(facts.map((f) => [f.key, { seen: 5, right: 5, ms: 1000 }]));
    const hard = facts[4].key;
    stats[hard] = { seen: 5, right: 1, ms: 6000 };
    let hits = 0;
    for (let i = 0; i < 2000; i++) if (pickFact(facts, stats, []).key === hard) hits++;
    expect(hits / 2000).toBeGreaterThan(1.5 / facts.length);
    for (let i = 0; i < 200; i++) expect(pickFact(facts, stats, [hard]).key).not.toBe(hard);
  });
});

describe("more drill kinds", () => {
  it("builds correct facts for squares, roots, doubles, bonds, negatives and percents", () => {
    const check = (op: Parameters<typeof factsFor>[0]["op"], set: number[], verify: (text: string, answer: number) => boolean) => {
      const facts = factsFor({ op, set, seconds: 60 });
      expect(facts.length).toBeGreaterThan(8);
      facts.forEach((f) => expect(verify(f.text, f.answer)).toBe(true));
    };
    check("x²", [20], (t, a) => Number(t.replace("²", "")) ** 2 === a);
    check("√", [400], (t, a) => a * a === Number(t.replace("√", "")));
    check("2×", [100], (t, a) => (t.startsWith("double") ? Number(t.split(" ")[1]) * 2 === a : Number(t.split(" ")[2]) / 2 === a));
    check("10", [100], (t, a) => Number(t.split(" ")[0]) + a === 100);
    check("±", [20], (t, a) => {
      const n = (s: string) => Number(s.replace(/[()]/g, "").replace("−", "-"));
      const [x, op, y] = t.split(" ");
      return (op === "+" ? n(x) + n(y) : n(x) - n(y)) === a;
    });
    check("%", [2], (t, a) => {
      const [p, , base] = t.split(" ");
      return (Number(p.replace("%", "")) * Number(base)) / 100 === a && Number.isInteger(a);
    });
  });
});
