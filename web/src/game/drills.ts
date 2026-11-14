/**
 * Speed drills: quick-fire facts that adapt to what the kid finds hard.
 * Each fact keeps a small record (tries, right, average time) so drills can
 * lean on slow or missed facts and the mastery grid can show progress.
 */
import { rand } from "./questions";

/** + − × ÷, then squares, square roots, doubles & halves, number bonds, positive & negative numbers, percents. */
export type DrillOp = "+" | "−" | "×" | "÷" | "x²" | "√" | "2×" | "10" | "±" | "%";

export interface DrillConfig {
  op: DrillOp;
  /**
   * Times tables for × and ÷ (e.g. [6, 7, 8]). For the others, one setting: the largest total for + and −
   * (10, 20, 100), the largest base for x² (12, 20), the largest square for √ (144, 400), the largest
   * number for 2× (20, 100), the bond total for 10 (10, 100), the range for ± (10, 20), and for % 1 = easy
   * (10% and 50%) or 2 = harder (20%, 25%, 75%).
   */
  set: number[];
  seconds: number;
}

export interface Fact {
  key: string;
  text: string;
  speech: string;
  answer: number;
}

export interface FactStat {
  seen: number;
  right: number;
  /** Average answer time in ms for right answers. */
  ms: number;
}

export type Mastery = "new" | "learning" | "good" | "fast";

/** × facts share a record whichever order they're asked in: 8 × 7 is 7 × 8. */
const timesKey = (a: number, b: number) => `${Math.min(a, b)}×${Math.max(a, b)}`;

export function factsFor({ op, set }: DrillConfig): Fact[] {
  const out: Fact[] = [];
  if (op === "×") {
    for (const t of set) {
      for (let n = 1; n <= 12; n++) {
        const [a, b] = Math.random() < 0.5 ? [t, n] : [n, t];
        out.push({ key: timesKey(a, b), text: `${a} × ${b}`, speech: `${a} times ${b}`, answer: a * b });
      }
    }
  } else if (op === "÷") {
    for (const t of set) {
      for (let n = 1; n <= 12; n++) {
        out.push({ key: `${t * n}÷${t}`, text: `${t * n} ÷ ${t}`, speech: `${t * n} divided by ${t}`, answer: n });
      }
    }
  } else if (op === "x²") {
    for (let n = 1; n <= (set[0] ?? 12); n++) out.push({ key: `${n}²`, text: `${n}²`, speech: `${n} squared`, answer: n * n });
  } else if (op === "√") {
    for (let n = 1; n * n <= (set[0] ?? 144); n++) out.push({ key: `√${n * n}`, text: `√${n * n}`, speech: `the square root of ${n * n}`, answer: n });
  } else if (op === "2×") {
    const max = set[0] ?? 20;
    for (let n = 1; n <= max; n++) out.push({ key: `double ${n}`, text: `double ${n}`, speech: `double ${n}`, answer: n * 2 });
    for (let n = 2; n <= max * 2; n += 2) out.push({ key: `half ${n}`, text: `half of ${n}`, speech: `half of ${n}`, answer: n / 2 });
  } else if (op === "10") {
    const total = set[0] ?? 10;
    for (let a = 0; a <= total; a++) out.push({ key: `${a}+?=${total}`, text: `${a} + ? = ${total}`, speech: `${a} plus what makes ${total}`, answer: total - a });
  } else if (op === "±") {
    const r = set[0] ?? 10;
    for (let i = 0; i < 160; i++) {
      const a = rand(-r, r);
      const b = rand(-r, r);
      const plus = Math.random() < 0.5;
      const show = (n: number) => (n < 0 ? `(−${-n})` : String(n));
      const say = (n: number) => (n < 0 ? `negative ${-n}` : String(n));
      out.push({
        key: `${a}${plus ? "+" : "−"}${b}`,
        text: `${a < 0 ? `−${-a}` : a} ${plus ? "+" : "−"} ${show(b)}`,
        speech: `${say(a)} ${plus ? "plus" : "minus"} ${say(b)}`,
        answer: plus ? a + b : a - b,
      });
    }
  } else if (op === "%") {
    const easy = (set[0] ?? 1) === 1;
    const percents = easy ? [10, 50] : [20, 25, 75];
    for (const p of percents) {
      const unit = p === 25 || p === 75 ? 4 : p === 20 ? 5 : p === 10 ? 10 : 2;
      for (let k = 1; k <= 20; k++) {
        const base = unit * k;
        out.push({ key: `${p}%${base}`, text: `${p}% of ${base}`, speech: `${p} percent of ${base}`, answer: (p * base) / 100 });
      }
    }
  } else {
    const max = set[0] ?? 10;
    if (max <= 20) {
      for (let a = 0; a <= max; a++) {
        for (let b = 0; a + b <= max; b++) {
          if (max === 20 && a + b <= 10) continue;
          out.push(
            op === "+"
              ? { key: `${a}+${b}`, text: `${a} + ${b}`, speech: `${a} plus ${b}`, answer: a + b }
              : { key: `${a + b}−${b}`, text: `${a + b} − ${b}`, speech: `${a + b} minus ${b}`, answer: a },
          );
        }
      }
    } else {
      for (let i = 0; i < 120; i++) {
        const a = rand(11, 89);
        const b = rand(2, Math.min(9, 99 - a));
        out.push(
          op === "+"
            ? { key: `${a}+${b}`, text: `${a} + ${b}`, speech: `${a} plus ${b}`, answer: a + b }
            : { key: `${a + b}−${b}`, text: `${a + b} − ${b}`, speech: `${a + b} minus ${b}`, answer: a },
        );
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((f) => !seen.has(f.key) && seen.add(f.key));
}

export function mastery(stat: FactStat | undefined): Mastery {
  if (!stat || stat.seen === 0) return "new";
  const accuracy = stat.right / stat.seen;
  if (accuracy >= 0.9 && stat.seen >= 2 && stat.ms > 0 && stat.ms < 3000) return "fast";
  if (accuracy >= 0.75) return "good";
  return "learning";
}

/**
 * Pick the next fact: new, missed and slow facts come up more often, and the
 * last few facts don't repeat straight away.
 */
export function pickFact(facts: Fact[], stats: Record<string, FactStat>, recent: string[]): Fact {
  const pool = facts.filter((f) => !recent.includes(f.key));
  const choices = pool.length ? pool : facts;
  const weight = (f: Fact) => {
    const m = mastery(stats[f.key]);
    return m === "new" ? 3 : m === "learning" ? 5 : m === "good" ? 2 : 1;
  };
  const total = choices.reduce((sum, f) => sum + weight(f), 0);
  let r = Math.random() * total;
  for (const f of choices) {
    r -= weight(f);
    if (r <= 0) return f;
  }
  return choices[choices.length - 1];
}

/** Fold one answer into a fact's record. */
export function record(stat: FactStat | undefined, right: boolean, ms: number): FactStat {
  const s = stat ?? { seen: 0, right: 0, ms: 0 };
  const rightCount = s.right + (right ? 1 : 0);
  const avg = right ? (s.ms * s.right + Math.min(ms, 15000)) / rightCount : s.ms;
  return { seen: s.seen + 1, right: rightCount, ms: Math.round(avg) };
}

export const drillId = (c: DrillConfig) => `${c.op}:${c.set.join(",")}:${c.seconds}`;

export { timesKey };
