/**
 * Question generators for the Grades 3–4 worlds (ages 8–10).
 *
 * Each generator mixes a few "forms" of the same idea so a lesson doesn't
 * feel repetitive. Keys hold every number that changes the math (not the
 * cosmetic emoji or names), so a lesson never asks the same sum twice.
 */
import { labelChoices, makeChoices, nextThing, pick, rand, shuffle, word } from "../questions";
import type { Activity, FracBar, Question, ShapeName, Token, Visual } from "../types";
import { symmetryLines } from "../validate";

/* ================================================================== helpers */

type Core = Pick<Question, "key" | "prompt" | "hint" | "explain"> &
  Partial<Pick<Question, "speech" | "equation" | "visual" | "needsVisual" | "unit" | "prefix" | "keypadExtra">>;

const NONE: Visual = { kind: "none" };

function core(c: Core) {
  return { ...c, speech: c.speech ?? c.prompt, visual: c.visual ?? NONE };
}

/** Number answer with 4 choices: the answer, likely mistakes, then neighbours. */
function numQ(c: Core, answer: number, likely: number[], min = 0, max = Math.max(20, answer * 2 + 10)): Question {
  return { ...core(c), answer, input: "choices", choices: makeChoices(answer, { n: 4, min, max, likely }) };
}

/** Number answer from a hand-made list of wrong options (e.g. "which is a factor?"). */
function listQ(c: Core, answer: number, others: number[]): Question {
  const wrong = [...new Set(others)].filter((o) => o !== answer).slice(0, 3);
  return { ...core(c), answer, input: "choices", choices: shuffle([answer, ...wrong]) };
}

/** Typed answer. */
function typeQ(c: Core, answer: number): Question {
  return { ...core(c), answer, input: "keypad" };
}

/** Text choices, shuffled. */
function textQ(c: Core, correct: string, wrong: string[], n = 4): Question {
  const { choices, labels, answer } = labelChoices(correct, wrong, n);
  return { ...core(c), answer, input: "choices", choices, labels };
}

/** A hands-on "Do it" task; `answer` is the activity's key number. */
function doQ(c: Core, activity: Activity, answer: number): Question {
  return { ...core(c), answer, input: "activity", activity };
}

/** Text choices in a fixed order (signs, yes/no, angle names). */
function fixedQ(c: Core, labels: string[], correct: string): Question {
  return { ...core(c), answer: labels.indexOf(correct), input: "choices", choices: labels.map((_, i) => i), labels };
}

const comma = (n: number) => n.toLocaleString("en-US");
const pad2 = (n: number) => String(n).padStart(2, "0");
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
const an = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);

const NAMES = ["Sam", "Ana", "Leo", "Mia", "Kai", "Zoe", "Max", "Ivy", "Ben", "Ava", "Noah", "Lily", "Omar", "Rosa"];
const twoNames = () => shuffle(NAMES).slice(0, 2) as [string, string];

const SIGNS = ["<", "=", ">"];
const signOf = (a: number, b: number) => (a < b ? "<" : a > b ? ">" : "=");
const SIGN_WORD: Record<string, string> = { "<": "is less than", "=": "is equal to", ">": "is greater than" };

/* ---------------------------------------------------------- fraction words */

const DEN: Record<number, [string, string]> = {
  1: ["whole", "wholes"],
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  8: ["eighth", "eighths"],
  10: ["tenth", "tenths"],
  7: ["seventh", "sevenths"],
  9: ["ninth", "ninths"],
  12: ["twelfth", "twelfths"],
  16: ["sixteenth", "sixteenths"],
  100: ["hundredth", "hundredths"],
};
const denWord = (d: number, many: boolean) => (DEN[d] ?? [`${d}th`, `${d}ths`])[many ? 1 : 0];
const sayFrac = (n: number, d: number) => `${n} ${denWord(d, n !== 1)}`;
const sayMixed = (w: number, n: number, d: number) => (n === 0 ? `${w}` : w === 0 ? sayFrac(n, d) : `${w} and ${sayFrac(n, d)}`);
const fracText = (n: number, d: number) => `${n}/${d}`;
const mixedText = (w: number, n: number, d: number) => (n === 0 ? `${w}` : w === 0 ? `${n}/${d}` : `${w} ${n}/${d}`);
const fromImproper = (num: number, d: number) => mixedText(Math.floor(num / d), num % d, d);
const sayImproper = (num: number, d: number) => sayMixed(Math.floor(num / d), num % d, d);

/** Bars filling `n` parts of size 1/d (more than one bar past a whole). */
function fillBars(n: number, d: number, maxBars = 3): FracBar[] | null {
  const bars: FracBar[] = [];
  for (let left = n; left > 0; left -= d) bars.push({ parts: d, a: Math.min(d, left) });
  if (!bars.length) bars.push({ parts: d });
  return bars.length <= maxBars ? bars : null;
}
const barsOrNone = (bars: FracBar[] | null): Visual => (bars ? { kind: "fractions", bars } : NONE);

/** A fraction in lowest terms with a denominator from the list. */
function lowestFrac(dens: number[]): [number, number] {
  const d = pick(dens);
  let n: number;
  do n = rand(1, d - 1);
  while (gcd(n, d) !== 1);
  return [n, d];
}

/* ------------------------------------------------------------ number words */

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
}

export function numberWords(n: number): string {
  if (n === 0) return "zero";
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  return [th ? `${under1000(th)} thousand` : "", rest ? under1000(rest) : ""].filter(Boolean).join(", ");
}

const PLACE = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"];
const PLACE_ONE: Record<number, string> = { 10: "ten", 100: "hundred", 1000: "thousand", 10000: "ten thousand", 100000: "hundred thousand" };

/* =================================================== W1 Times tables (G3) */

export function timesMeaning(): Question {
  const thing = nextThing();
  const groups = rand(2, 6);
  const each = rand(2, 6);
  const total = groups * each;
  const form = rand(0, 3);
  if (form === 0)
    return numQ(
      {
        key: `tm-total-${groups}-${each}`,
        prompt: pick([`${groups} groups of ${each}. How many in all?`, `How many ${thing.many} in all?`]),
        speech: `There are ${groups} plates with ${each} ${word(each, thing)} on each. How many ${thing.many} in all?`,
        equation: [groups, "×", each, "=", "?"],
        visual: { kind: "groups", thing, groups, each },
        hint: `Skip count by ${each}s, one plate at a time.`,
        explain: `${groups} groups of ${each} is ${groups} × ${each} = ${total}.`,
      },
      total,
      [groups + each, total + each, total - each],
      2,
      50,
    );
  if (form === 1)
    return textQ(
      {
        key: `tm-fact-${groups}-${each}`,
        prompt: "Which times fact matches the plates?",
        speech: "Look at the plates. Which times fact matches them?",
        visual: { kind: "groups", thing, groups, each },
        needsVisual: true,
        hint: "Count the plates first. Then count how many are on one plate.",
        explain: `${groups} plates with ${each} on each is ${groups} × ${each}.`,
      },
      `${groups} × ${each}`,
      shuffle([`${groups} + ${each}`, `${groups + 1} × ${each}`, `${groups} × ${each + 1}`, `${groups - 1} × ${each}`]),
    );
  if (form === 2)
    return textQ(
      {
        key: `tm-means-${groups}-${each}`,
        prompt: `What does ${groups} × ${each} mean?`,
        speech: `What does ${groups} times ${each} mean?`,
        equation: [groups, "×", each],
        hint: "The first number tells how many groups. The second tells how many in each group.",
        explain: `${groups} × ${each} means ${groups} groups of ${each}. That's ${total} in all.`,
      },
      `${groups} groups of ${each}`,
      shuffle([`${groups} plus ${each}`, `${groups} groups of ${each + 1}`, `${groups + 1} groups of ${each}`]),
    );
  return numQ(
    {
      key: `tm-array-${groups}-${each}`,
      prompt: pick([`${groups} rows of ${each}. How many dots?`, "How many dots in the array?"]),
      speech: `${groups} rows with ${each} dots in each row. How many dots?`,
      equation: [groups, "×", each, "=", "?"],
      visual: { kind: "array", rows: groups, cols: each },
      hint: `Count by ${each}s, one row at a time.`,
      explain: `${groups} rows of ${each} is ${groups} × ${each} = ${total}.`,
    },
    total,
    [groups + each, total + each, total - each],
    2,
    50,
  );
}

export function timesZeroOne(): Question {
  const form = rand(0, 5);
  const n = rand(2, form < 4 ? 30 : 12);
  const thing = nextThing();
  let eq: Token[];
  let answer: number;
  let visual: Visual = NONE;
  let hint: string;
  let explain: string;
  switch (form) {
    case 0:
      eq = [n, "×", 0, "=", "?"];
      answer = 0;
      if (n <= 8) visual = { kind: "groups", thing, groups: n, each: 0 };
      hint = `Think: ${n} plates with nothing on them.`;
      explain = `${n} groups of zero is zero. Anything times 0 is 0.`;
      break;
    case 1:
      eq = [0, "×", n, "=", "?"];
      answer = 0;
      hint = `Zero groups of ${n}. Is there anything at all?`;
      explain = `Zero groups of ${n} is nothing. 0 times anything is 0.`;
      break;
    case 2:
      eq = [n, "×", 1, "=", "?"];
      answer = n;
      if (n <= 10) visual = { kind: "groups", thing, groups: n, each: 1 };
      hint = "Each group has just 1 in it. Count the groups.";
      explain = `${n} groups of 1 is ${n}. Times 1 keeps a number the same.`;
      break;
    case 3:
      eq = [1, "×", n, "=", "?"];
      answer = n;
      if (n <= 20) visual = { kind: "groups", thing, groups: 1, each: n };
      hint = `One group of ${n}.`;
      explain = `1 group of ${n} is just ${n}.`;
      break;
    case 4:
      eq = [n, "×", "?", "=", n];
      answer = 1;
      hint = `What can you multiply by and get the same number back?`;
      explain = `${n} × 1 = ${n}. Times 1 keeps a number the same.`;
      break;
    default:
      eq = [n, "×", "?", "=", 0];
      answer = 0;
      hint = "Which number turns any product into zero?";
      explain = `${n} × 0 = 0. Anything times 0 is 0.`;
  }
  return numQ(
    {
      key: `z1-${form}-${n}`,
      prompt: form >= 4 ? "What's the missing number?" : pick(["Use the 0 and 1 rules!", "Multiply!", "What's the product?"]),
      speech: form >= 4 ? `${n} times what equals ${form === 4 ? n : 0}?` : `${eq[0]} times ${eq[2]}?`,
      equation: eq,
      visual,
      hint,
      explain,
    },
    answer,
    [0, 1, n, n + 1],
    0,
    40,
  );
}

export function timesProperties(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const a = rand(2, 10);
    let b = rand(2, 10);
    while (b === a) b = rand(2, 10);
    return numQ(
      {
        key: `cp-turn-${a}-${b}`,
        prompt: pick(["Turn it around! What's missing?", "Swap the order. What's missing?"]),
        speech: `${a} times ${b} equals ${b} times what?`,
        equation: [a, "×", b, "=", b, "×", "?"],
        visual: { kind: "rect", w: b, h: a, showW: true, showH: true, grid: true, unit: "" },
        hint: "Turn the rectangle on its side. Does the number of squares change?",
        explain: `${a} × ${b} = ${b} × ${a}. Both are ${a * b}.`,
      },
      a,
      [b, a * b, a + 1, a - 1],
      0,
      100,
    );
  }
  if (form === 1) {
    const a = rand(3, 9);
    let b = rand(3, 9);
    while (b === a) b = rand(3, 9);
    const p = a * b;
    return numQ(
      {
        key: `cp-known-${a}-${b}`,
        prompt: `${a} × ${b} = ${p}. So what is ${b} × ${a}?`,
        speech: `${a} times ${b} is ${p}. So what is ${b} times ${a}?`,
        equation: [b, "×", a, "=", "?"],
        hint: "Swapping the numbers you multiply doesn't change the answer.",
        explain: `${b} × ${a} = ${a} × ${b} = ${p}.`,
      },
      p,
      [p + a, p - b, a + b],
      0,
      100,
    );
  }
  if (form === 2) {
    const x = rand(3, 9);
    const order = shuffle([2, 5, x]);
    return numQ(
      {
        key: `cp-ten-${order.join("-")}`,
        prompt: pick(["Find a smart order to multiply!", "Multiply all three!"]),
        speech: `${order[0]} times ${order[1]} times ${order[2]}. Can you find a smart order?`,
        equation: [order[0], "×", order[1], "×", order[2], "=", "?"],
        hint: "Multiply the 2 and the 5 first. That makes 10!",
        explain: `2 × 5 = 10, and 10 × ${x} = ${10 * x}.`,
      },
      10 * x,
      [2 + 5 + x, 10 * x + 10, 10 * x - 10, 7 * x],
      0,
      120,
    );
  }
  const a = rand(2, 5);
  const b = rand(2, 5);
  const c = rand(2, 5);
  return numQ(
    {
      key: `cp-group-${a}-${b}-${c}`,
      prompt: "Regroup! What number is missing?",
      speech: `${a} times ${b}, then times ${c}, equals ${a} times ${b} times what?`,
      equation: ["(", a, "×", b, ")", "×", c, "=", a, "×", "(", b, "×", "?", ")"],
      hint: "You can group the numbers you multiply any way you like. The numbers stay the same.",
      explain: `(${a} × ${b}) × ${c} = ${a} × (${b} × ${c}). Both are ${a * b * c}.`,
    },
    c,
    [a, b, a * b, c + 1],
    0,
    30,
  );
}

export function timesBreakApart(): Question {
  const form = rand(0, 2);
  if (form < 2) {
    const a = rand(3, 9);
    const b = rand(6, 9);
    const rest = b - 5;
    if (form === 0)
      return numQ(
        {
          key: `ba-split-${a}-${b}`,
          prompt: "Break it apart! What's missing?",
          speech: `${a} times ${b} equals ${a} times 5, plus ${a} times what?`,
          equation: [a, "×", b, "=", a, "×", 5, "+", a, "×", "?"],
          hint: `Split ${b} into 5 and another number.`,
          explain: `${b} = 5 + ${rest}, so ${a} × ${b} = ${a} × 5 + ${a} × ${rest} = ${5 * a} + ${a * rest} = ${a * b}.`,
        },
        rest,
        [b, 5, rest + 1, rest - 1],
        0,
        10,
      );
    return numQ(
      {
        key: `ba-part-${a}-${b}`,
        prompt: "Use a fact you know! What's missing?",
        speech: `${a} times ${b} equals ${5 * a} plus what?`,
        equation: [a, "×", b, "=", 5 * a, "+", "?"],
        hint: `${5 * a} is ${a} × 5. How many more groups of ${a} do you need?`,
        explain: `${a} × ${b} = ${a} × 5 + ${a} × ${rest} = ${5 * a} + ${a * rest}.`,
      },
      a * rest,
      [a, a * rest + a, a * rest - a, rest],
      0,
      60,
    );
  }
  const k = rand(1, 9);
  const n = 10 + k;
  const m = rand(2, Math.floor(100 / n));
  return typeQ(
    {
      key: `ba-area-${n}-${m}`,
      prompt: pick(["Split it into tens and ones!", "Break it apart to multiply."]),
      speech: `${n} times ${m}. Split ${n} into 10 and ${k}.`,
      equation: [n, "×", m, "=", "?"],
      visual: { kind: "area", tens: 10, ones: k, by: m },
      hint: `Split ${n} into 10 and ${k}. Find 10 × ${m} and ${k} × ${m}.`,
      explain: `10 × ${m} = ${10 * m} and ${k} × ${m} = ${k * m}. ${10 * m} + ${k * m} = ${n * m}.`,
    },
    n * m,
  );
}

/* =========================================================== W2 Divide (G3) */

export function divShareGroup(): Question {
  const thing = nextThing();
  const groups = rand(2, 6);
  const each = rand(2, 6);
  const total = groups * each;
  if (Math.random() < 0.5)
    return numQ(
      {
        key: `sg-share-${groups}-${each}`,
        prompt: pick([`Share ${total} ${thing.many} on ${groups} plates. How many each?`, `${total} ${thing.many}, ${groups} friends. How many each?`]),
        speech: `Share ${total} ${thing.many} fairly onto ${groups} plates. How many go on each plate?`,
        equation: [total, "÷", groups, "=", "?"],
        visual: { kind: "share", thing, groups, each },
        hint: "Deal them out one at a time, like cards, until none are left.",
        explain: `${total} shared into ${groups} equal groups is ${each} in each. ${total} ÷ ${groups} = ${each}.`,
      },
      each,
      [groups, each + 1, each - 1],
      1,
      20,
    );
  return numQ(
    {
      key: `sg-group-${groups}-${each}`,
      prompt: pick([`Put ${total} ${thing.many} in rows of ${each}. How many rows?`, `${total} chairs, ${each} in each row. How many rows?`]),
      speech: `${total} in all, with ${each} in each row. How many rows can you make?`,
      equation: [total, "÷", each, "=", "?"],
      visual: { kind: "array", rows: groups, cols: each },
      hint: `Make rows of ${each} until you run out. Count the rows.`,
      explain: `${total} in rows of ${each} makes ${groups} rows. ${total} ÷ ${each} = ${groups}.`,
    },
    groups,
    [each, groups + 1, groups - 1],
    1,
    20,
  );
}

export function divFacts(): Question {
  const d = rand(2, 10);
  const q = rand(1, 10);
  const total = d * q;
  if (Math.random() < 0.6)
    return numQ(
      {
        key: `df-div-${d}-${q}`,
        prompt: pick(["Divide!", "What's the answer?", `${total} divided by ${d}?`]),
        speech: `${total} divided by ${d}?`,
        equation: [total, "÷", d, "=", "?"],
        visual: { kind: "array", rows: d, cols: q },
        hint: `Think of a times fact: ${d} × what = ${total}?`,
        explain: `${d} × ${q} = ${total}, so ${total} ÷ ${d} = ${q}.`,
      },
      q,
      [q + 1, q - 1, d],
      0,
      12,
    );
  return numQ(
    {
      key: `df-factor-${d}-${q}`,
      prompt: pick(["Find the missing factor.", "Division as a times fact!"]),
      speech: `${d} times what equals ${total}? That's the same as ${total} divided by ${d}.`,
      equation: [d, "×", "?", "=", total],
      hint: `Count by ${d}s until you reach ${total}. How many jumps?`,
      explain: `${d} × ${q} = ${total}. So ${total} ÷ ${d} = ${q} too.`,
    },
    q,
    [q + 1, q - 1, d],
    0,
    12,
  );
}

export function divMissing(): Question {
  const a = rand(2, 10);
  const b = rand(2, 10);
  const p = a * b;
  const form = rand(0, 4);
  const forms: { eq: Token[]; answer: number; hint: string }[] = [
    { eq: [a, "×", "?", "=", p], answer: b, hint: `What times ${a} makes ${p}?` },
    { eq: ["?", "×", b, "=", p], answer: a, hint: `Count by ${b}s to ${p}. How many jumps?` },
    { eq: [p, "÷", "?", "=", b], answer: a, hint: `Turn it around: ${b} × what = ${p}?` },
    { eq: ["?", "÷", a, "=", b], answer: p, hint: `What number splits into ${a} groups of ${b}?` },
    { eq: [p, "÷", a, "=", "?"], answer: b, hint: `Think: ${a} × what = ${p}?` },
  ];
  const f = forms[form];
  return numQ(
    {
      key: `dm-${form}-${a}-${b}`,
      prompt: pick(["What's the missing number?", "Find the unknown number.", "Fill in the blank!"]),
      speech: `What number goes in the blank? ${f.eq.map((t) => (t === "?" ? "blank" : t === "×" ? "times" : t === "÷" ? "divided by" : t === "=" ? "equals" : t)).join(" ")}.`,
      equation: f.eq,
      hint: f.hint,
      explain: `${a} × ${b} = ${p} and ${p} ÷ ${a} = ${b}. The missing number is ${f.answer}.`,
    },
    f.answer,
    form === 3 ? [p + a, p - b, a + b] : [f.answer + 1, f.answer - 1, form === 1 || form === 2 ? b : a],
    0,
    form === 3 ? 110 : 12,
  );
}

export function timesStories(): Question {
  const thing = nextThing();
  const a = rand(2, 9);
  const b = rand(2, 9);
  const p = a * b;
  const form = rand(0, 4);
  if (form === 0)
    return numQ(
      {
        key: `ts-groups-${a}-${b}`,
        prompt: `${a} bags with ${b} ${thing.many} in each. How many in all?`,
        equation: [a, "×", b, "=", "?"],
        visual: { kind: "groups", thing, groups: a, each: b },
        hint: `That's ${a} equal groups. Skip count by ${b}s.`,
        explain: `${a} groups of ${b} is ${a} × ${b} = ${p} ${thing.many}.`,
      },
      p,
      [a + b, p + b, p - a],
      0,
      100,
    );
  if (form === 1) {
    const [place, item] = pick([
      ["a hall", "chairs"],
      ["a garden", "plants"],
      ["a classroom", "desks"],
      ["a parking lot", "cars"],
    ]);
    return numQ(
      {
        key: `ts-array-${a}-${b}`,
        prompt: `${cap(place)} has ${a} rows of ${b} ${item}. How many ${item}?`,
        equation: [a, "×", b, "=", "?"],
        visual: { kind: "array", rows: a, cols: b },
        hint: `Rows of the same size: multiply rows × how many in a row.`,
        explain: `${a} rows of ${b} is ${a} × ${b} = ${p} ${item}.`,
      },
      p,
      [a + b, p + b, p - a],
      0,
      100,
    );
  }
  if (form === 2)
    return numQ(
      {
        key: `ts-share-${a}-${b}`,
        prompt: `${p} ${thing.many} shared by ${a} kids. How many each?`,
        speech: `${p} ${thing.many} are shared fairly by ${a} kids. How many does each kid get?`,
        equation: [p, "÷", a, "=", "?"],
        visual: p <= 40 ? { kind: "share", thing, groups: a, each: b } : NONE,
        hint: `Think: ${a} × what = ${p}?`,
        explain: `${p} ÷ ${a} = ${b}, because ${a} × ${b} = ${p}.`,
      },
      b,
      [a, b + 1, b - 1],
      0,
      15,
    );
  if (form === 3)
    return numQ(
      {
        key: `ts-measure-${a}-${b}`,
        prompt: `A ${p} cm ribbon is cut into ${b} cm pieces. How many pieces?`,
        equation: [p, "÷", b, "=", "?"],
        hint: `How many ${b}s fit into ${p}? Count by ${b}s.`,
        explain: `${p} ÷ ${b} = ${a}, because ${a} × ${b} = ${p}. So ${a} pieces.`,
      },
      a,
      [b, a + 1, a - 1],
      0,
      15,
    );
  return numQ(
    {
      key: `ts-unknown-${a}-${b}`,
      prompt: `${a} boxes hold ${p} crayons, the same in each. How many per box?`,
      speech: `${a} boxes hold ${p} crayons in all. Each box has the same number. How many crayons are in each box?`,
      equation: [a, "×", "?", "=", p],
      visual: p <= 40 ? { kind: "share", thing: { emoji: "🖍️", one: "crayon", many: "crayons" }, groups: a, each: b } : NONE,
      hint: `${a} times what makes ${p}?`,
      explain: `${a} × ${b} = ${p}, so each box holds ${b} crayons.`,
    },
    b,
    [a, b + 1, b - 1],
    0,
    15,
  );
}

export function fastFacts(): Question {
  const a = rand(2, 10);
  const b = rand(2, 10);
  if (Math.random() < 0.5)
    return typeQ(
      {
        key: `ff-x-${a}-${b}`,
        prompt: pick(["Quick! Multiply.", "What's the product?", "Times fact!"]),
        speech: `${a} times ${b}?`,
        equation: [a, "×", b, "=", "?"],
        hint: `Use a fact you know. ${a} × ${b} is ${a} × ${b - 1} plus one more ${a}.`,
        explain: `${a} × ${b} = ${a * b}`,
      },
      a * b,
    );
  return typeQ(
    {
      key: `ff-d-${a}-${b}`,
      prompt: pick(["Quick! Divide.", "What's the answer?", "Division fact!"]),
      speech: `${a * b} divided by ${a}?`,
      equation: [a * b, "÷", a, "=", "?"],
      hint: `Think of the times fact: ${a} × what = ${a * b}?`,
      explain: `${a} × ${b} = ${a * b}, so ${a * b} ÷ ${a} = ${b}.`,
    },
    b,
  );
}

export function twoStep(): Question {
  const thing = nextThing();
  const form = rand(0, 4);
  if (form === 0) {
    const g = rand(2, 9);
    const e = rand(2, 9);
    const k = rand(1, Math.min(20, g * e - 1));
    const ans = g * e - k;
    return typeQ(
      {
        key: `2s-left-${g}-${e}-${k}`,
        prompt: `${g} packs of ${e} ${thing.many}. You give away ${k}. How many left?`,
        speech: `You have ${g} packs with ${e} ${thing.many} in each. You give away ${k}. How many are left?`,
        equation: ["(", g, "×", e, ")", "−", k, "=", "?"],
        hint: `First find how many you had: ${g} × ${e}. Then take away ${k}.`,
        explain: `${g} × ${e} = ${g * e}. ${g * e} − ${k} = ${ans}.`,
      },
      ans,
    );
  }
  if (form === 1) {
    const g = rand(2, 6);
    const q = rand(2, 9);
    const total = g * q;
    const a = rand(1, total - 1);
    const b = total - a;
    return typeQ(
      {
        key: `2s-share-${a}-${b}-${g}`,
        prompt: `${a} red, ${b} blue ${thing.many}. ${g} kids share. Each gets?`,
        speech: `There are ${a} red ${thing.many} and ${b} blue ${thing.many}. ${g} kids share them all fairly. How many does each kid get?`,
        equation: ["(", a, "+", b, ")", "÷", g, "=", "?"],
        hint: `First add to find how many in all. Then share by ${g}.`,
        explain: `${a} + ${b} = ${total}. ${total} ÷ ${g} = ${q}.`,
      },
      q,
    );
  }
  if (form === 2) {
    const n = rand(2, 6);
    const p = rand(2, 9);
    const c = rand(1, 9);
    return typeQ(
      {
        key: `2s-shop-${n}-${p}-${c}`,
        prompt: `Buy ${n} books at $${p} each and a $${c} pen. Total?`,
        speech: `You buy ${n} books that cost ${p} dollars each, and a pen for ${c} dollars. How much do you spend?`,
        equation: [n, "×", p, "+", c, "=", "?"],
        prefix: "$",
        hint: `First find the cost of the books: ${n} × ${p}. Then add the pen.`,
        explain: `${n} × $${p} = $${n * p}. $${n * p} + $${c} = $${n * p + c}.`,
      },
      n * p + c,
    );
  }
  if (form === 3) {
    const s = rand(2, 6);
    const teams = rand(3, 9);
    const t = s * teams;
    const k = rand(1, teams - 1);
    return typeQ(
      {
        key: `2s-teams-${s}-${teams}-${k}`,
        prompt: `${t} kids make teams of ${s}. ${k} teams go home. Teams left?`,
        speech: `${t} kids split into teams of ${s}. Then ${k} teams go home. How many teams are left?`,
        equation: [t, "÷", s, "−", k, "=", "?"],
        hint: `First find how many teams: ${t} ÷ ${s}. Then take away ${k}.`,
        explain: `${t} ÷ ${s} = ${teams} teams. ${teams} − ${k} = ${teams - k}.`,
      },
      teams - k,
    );
  }
  const m = pick([20, 30, 40, 50]);
  const n = rand(2, 5);
  const p = rand(2, Math.min(9, Math.floor((m - 1) / n)));
  return typeQ(
    {
      key: `2s-change-${m}-${n}-${p}`,
      prompt: `You have $${m}. You buy ${n} toys at $${p} each. Money left?`,
      speech: `You have ${m} dollars. You buy ${n} toys that cost ${p} dollars each. How much money is left?`,
      equation: [m, "−", n, "×", p, "=", "?"],
      prefix: "$",
      hint: `First find what the toys cost: ${n} × ${p}. Then subtract from ${m}.`,
      explain: `${n} × $${p} = $${n * p}. $${m} − $${n * p} = $${m - n * p}.`,
    },
    m - n * p,
  );
}

export function divPatterns(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    const p = a * b;
    const even = p % 2 === 0;
    return fixedQ(
      {
        key: `pat-eo-${a}-${b}`,
        prompt: `Is ${a} × ${b} even or odd?`,
        speech: `Is ${a} times ${b} even or odd? Try to tell without multiplying!`,
        hint: "Is either number even? Then the groups pair up evenly.",
        explain: even
          ? `${a % 2 === 0 ? a : b} is even, so ${a} × ${b} = ${p} is even.`
          : `Odd × odd is always odd: ${a} × ${b} = ${p}.`,
      },
      ["Even", "Odd"],
      even ? "Even" : "Odd",
    );
  }
  if (form === 1) {
    const step = rand(3, 9);
    const s = step * rand(1, 5);
    const nums = [s, s + step, s + 2 * step];
    const next = s + 3 * step;
    return numQ(
      {
        key: `pat-seq-${step}-${s}`,
        prompt: pick(["What comes next in the pattern?", "Find the pattern! What's next?"]),
        speech: `${nums.join(", ")}. What comes next?`,
        visual: { kind: "sequence", numbers: nums, next },
        needsVisual: true,
        hint: "How much does it grow each time?",
        explain: `It goes up by ${step} each time: ${s + 2 * step} + ${step} = ${next}. These are the ${step}s!`,
      },
      next,
      [next + 1, next - 1, next + step],
      0,
      100,
    );
  }
  if (form === 2) {
    const c = rand(3, 9);
    const miss = rand(2, 5);
    const row: (number | string)[] = ["Cards", ...[1, 2, 3, 4, 5].map((i) => (i === miss ? "?" : i * c))];
    return numQ(
      {
        key: `pat-table-${c}-${miss}`,
        prompt: "What number is missing from the table?",
        speech: `Each pack has ${c} cards. What number is missing from the table?`,
        visual: { kind: "table", header: ["Packs", "1", "2", "3", "4", "5"], rows: [row] },
        needsVisual: true,
        hint: `Each pack adds ${c} more cards.`,
        explain: `${miss} packs × ${c} cards = ${miss * c}.`,
      },
      miss * c,
      [miss * c + c, miss * c - c, miss * c + 1],
      0,
      60,
    );
  }
  const t = pick([2, 5, 10]);
  const m = t * rand(3, t === 10 ? 15 : 19);
  const wrong = shuffle([m + 1, m - 1, m + 3, m - 3, m + 2, m + 7].filter((x) => x % t !== 0 && x > 0));
  return listQ(
    {
      key: `pat-mult-${t}-${m}`,
      prompt: `Count by ${t}s from 0. Which number will you say?`,
      hint:
        t === 2
          ? "Counting by 2s from 0, every number is even."
          : t === 5
            ? "Counting by 5s, every number ends in 0 or 5."
            : "Counting by 10s, every number ends in 0.",
      explain: `${m} = ${t} × ${m / t}, so you say it when you count by ${t}s.`,
    },
    m,
    wrong,
  );
}

/* ========================================================= W3 Hundreds (G3) */

export function roundTo(place: 10 | 100): Question {
  let n: number;
  do n = place === 10 ? rand(21, 999) : rand(101, 989);
  while (n % place === 0);
  const lower = Math.floor(n / place) * place;
  const upper = lower + place;
  const answer = n - lower >= place / 2 ? upper : lower;
  const other = answer === lower ? upper : lower;
  const name = place === 10 ? "ten" : "hundred";
  return numQ(
    {
      key: `rt${place}-${n}`,
      prompt: pick([`Round ${n} to the nearest ${name}.`, `${n} is closest to which ${name}?`]),
      speech: `Round ${n} to the nearest ${name}.`,
      visual: { kind: "numberline", min: lower, max: upper, step: place / 10, labelStep: place / 2, from: n, to: answer },
      hint: `Is ${n} closer to ${lower} or ${upper}? Look at the ${place === 10 ? "ones" : "tens"} digit.`,
      explain:
        n - lower === place / 2
          ? `${n} is exactly halfway, so it rounds up to ${upper}.`
          : `${n} is closer to ${answer} than to ${other}.`,
    },
    answer,
    [other, answer + place, answer - place, Math.round(n / (place === 10 ? 100 : 10)) * (place === 10 ? 100 : 10)],
    0,
    1100,
  );
}

export function add1000(): Question {
  const a = rand(100, 799);
  const b = rand(20, 999 - a);
  const sum = a + b;
  const thing = pick(["books", "stickers", "people", "shells", "seeds"]);
  const [ah, at, ao] = [Math.floor(a / 100), Math.floor(a / 10) % 10, a % 10];
  const [bh, bt, bo] = [Math.floor(b / 100), Math.floor(b / 10) % 10, b % 10];
  return typeQ(
    {
      key: `a1k-${a}-${b}`,
      prompt: pick(["Add! What's the sum?", "Find the total.", `There are ${a} ${thing}. ${b} more come. How many now?`]),
      speech: `${a} plus ${b}?`,
      equation: [a, "+", b, "=", "?"],
      visual: { kind: "blocks", numbers: [a, b] },
      hint: ao + bo >= 10 ? "Add the ones first. 10 ones make a new ten!" : "Add the hundreds, then the tens, then the ones.",
      explain: `${(ah + bh) * 100} + ${(at + bt) * 10} + ${ao + bo} = ${sum}`,
    },
    sum,
  );
}

export function sub1000(): Question {
  const a = rand(200, 999);
  const b = rand(30, a - 10);
  const diff = a - b;
  return typeQ(
    {
      key: `s1k-${a}-${b}`,
      prompt: pick(["Subtract! What's left?", "Find the difference.", `A shop had ${a} apples. It sold ${b}. How many left?`]),
      speech: `${a} minus ${b}?`,
      equation: [a, "−", b, "=", "?"],
      hint:
        a % 10 < b % 10
          ? "Not enough ones? Trade 1 ten for 10 ones first."
          : `Or count up from ${b} to ${a}: jump to the next hundred, then on.`,
      explain: `${a} − ${b} = ${diff}. Check: ${diff} + ${b} = ${a}.`,
    },
    diff,
  );
}

export function estimate(): Question {
  const r100 = (x: number) => Math.round(x / 100) * 100;
  const form = rand(0, 2);
  if (form === 0) {
    const a = rand(150, 849);
    const b = rand(150, 849);
    const est = r100(a) + r100(b);
    return numQ(
      {
        key: `est-add-${a}-${b}`,
        prompt: `About how much is ${a} + ${b}?`,
        speech: `About how much is ${a} plus ${b}? Round to the nearest hundred first.`,
        hint: "Round each number to the nearest hundred. Then add.",
        explain: `${a} is about ${r100(a)} and ${b} is about ${r100(b)}. ${r100(a)} + ${r100(b)} = ${est}.`,
      },
      est,
      [est - 100, est + 100, est + 200],
      0,
      2000,
    );
  }
  if (form === 1) {
    let a: number;
    let b: number;
    do {
      a = rand(450, 949);
      b = rand(120, a - 120);
    } while (r100(a) - r100(b) < 100);
    const est = r100(a) - r100(b);
    return numQ(
      {
        key: `est-sub-${a}-${b}`,
        prompt: `About how much is ${a} − ${b}?`,
        speech: `About how much is ${a} minus ${b}? Round to the nearest hundred first.`,
        hint: "Round each number to the nearest hundred. Then subtract.",
        explain: `${a} is about ${r100(a)} and ${b} is about ${r100(b)}. ${r100(a)} − ${r100(b)} = ${est}.`,
      },
      est,
      [est - 100, est + 100, est + 200],
      0,
      2000,
    );
  }
  const a = rand(150, 649);
  const b = rand(150, 349);
  const exact = a + b;
  const off = pick([0, 0, 100, -100, 200, -200]);
  const claimed = exact + off;
  const est = r100(a) + r100(b);
  const name = pick(NAMES);
  return fixedQ(
    {
      key: `est-check-${a}-${b}-${off}`,
      prompt: `${name} says ${a} + ${b} = ${claimed}. Does that make sense?`,
      speech: `${name} says ${a} plus ${b} is ${claimed}. Does that make sense?`,
      hint: "Round both numbers to the nearest hundred and add. Is the answer close?",
      explain: `${r100(a)} + ${r100(b)} = ${est}, so the sum should be near ${est}. The real sum is ${exact}.`,
    },
    ["Yes, it's close", "No, it's way off"],
    off === 0 ? "Yes, it's close" : "No, it's way off",
  );
}

export function timesTens(): Question {
  const a = rand(2, 9);
  const t = rand(1, 9);
  const m = t * 10;
  const p = a * m;
  const form = rand(0, 3);
  const eq: Token[] = [
    [a, "×", m, "=", "?"],
    [m, "×", a, "=", "?"],
    ["?", "×", m, "=", p],
    [a, "×", "?", "=", p],
  ][form] as Token[];
  const answer = form < 2 ? p : form === 2 ? a : m;
  const visual: Visual = form < 2 && p <= 300 ? { kind: "blocks", numbers: Array<number>(a).fill(m) } : NONE;
  const q: Core = {
    key: `x10-${form}-${a}-${t}`,
    prompt: form < 2 ? pick(["Multiply by tens!", "What's the product?"]) : "What's the missing number?",
    speech: form < 2 ? `${eq[0]} times ${eq[2]}?` : `What number goes in the blank?`,
    equation: eq,
    visual,
    hint: form < 2 ? `Think ${a} × ${t} = ${a * t}. Then make it tens!` : `${comma(p)} is ${a * t} tens. Which basic fact makes ${a * t}?`,
    explain: `${a} × ${t} tens = ${a * t} tens = ${p}. So ${a} × ${m} = ${p}.`,
  };
  return form < 2 ? typeQ(q, answer) : numQ(q, answer, form === 2 ? [a + 1, a - 1, t] : [m + 10, m - 10, t], 0, 100);
}

/* ======================================================== W4 Fractions (G3) */

const G3_DENS = [2, 3, 4, 6, 8];

export function unitFraction(): Question {
  const d = pick(G3_DENS);
  const shape: "bar" | "pie" = pick(["bar", "pie"]);
  const form = rand(0, 2);
  const visual: Visual = { kind: "fractions", bars: [{ parts: d, a: 1, shape }] };
  if (form === 0)
    return textQ(
      {
        key: `uf-name-${d}-${shape}`,
        prompt: pick(["Each part is what fraction of the whole?", "What fraction is coloured?"]),
        speech: `The whole is cut into ${d} equal parts. One part is coloured. What fraction is that?`,
        visual,
        needsVisual: true,
        hint: "Count all the equal parts. That number goes on the bottom.",
        explain: `There are ${d} equal parts, so one part is 1/${d}, ${sayFrac(1, d)}.`,
      },
      fracText(1, d),
      shuffle(G3_DENS.filter((x) => x !== d).map((x) => fracText(1, x)).concat(d > 2 ? [fracText(d - 1, d)] : [])),
    );
  if (form === 1)
    return numQ(
      {
        key: `uf-parts-${d}-${shape}`,
        prompt: `One part is 1/${d}. How many equal parts in the whole?`,
        speech: `One part is ${sayFrac(1, d)}. How many equal parts make the whole?`,
        visual,
        needsVisual: true,
        hint: "Count every part, coloured or not.",
        explain: `${sayFrac(d, d)} make a whole, so there are ${d} parts.`,
      },
      d,
      [d + 1, d - 1, 1],
      1,
      12,
    );
  return numQ(
    {
      key: `uf-whole-${d}-${shape}`,
      prompt: `How many 1/${d} parts make 1 whole?`,
      speech: `How many ${denWord(d, true)} make one whole?`,
      equation: ["?", "×", { n: 1, d }, "=", 1],
      visual,
      hint: "Picture filling the whole with parts this size. How many fit?",
      explain: `${d} parts of 1/${d} fill the whole: ${d}/${d} = 1.`,
    },
    d,
    [d + 1, d - 1, 1, d * 2],
    1,
    16,
  );
}

export function nameFraction(): Question {
  const d = pick(G3_DENS);
  const n = rand(1, d - 1);
  const shape: "bar" | "pie" = pick(["bar", "pie"]);
  const visual: Visual = { kind: "fractions", bars: [{ parts: d, a: n, shape }] };
  const form = rand(0, 2);
  if (form === 0)
    return textQ(
      {
        key: `nf-name-${n}-${d}-${shape}`,
        prompt: pick(["What fraction is coloured?", "Name the coloured part."]),
        speech: "What fraction of the shape is coloured?",
        visual,
        needsVisual: true,
        hint: "Bottom number: all the equal parts. Top number: the coloured parts.",
        explain: `${n} of ${d} equal parts are coloured: ${n}/${d}.`,
      },
      fracText(n, d),
      shuffle([fracText(d, n), fracText(d - n, d), fracText(n, d + 1), fracText(n, d - n)]),
    );
  if (form === 1)
    return numQ(
      {
        key: `nf-count-${n}-${d}-${shape}`,
        prompt: `How many ${denWord(d, true)} are coloured?`,
        equation: [{ n: "?", d }],
        visual,
        needsVisual: true,
        hint: `Each part is 1/${d}. Count the coloured parts.`,
        explain: `${sayFrac(n, d)} are coloured: ${n}/${d}.`,
      },
      n,
      [d - n, d, n + 1],
      0,
      d,
    );
  return numQ(
    {
      key: `nf-units-${n}-${d}-${shape}`,
      prompt: `${n}/${d} is how many parts of size 1/${d}?`,
      speech: `${sayFrac(n, d)} is how many parts of size ${sayFrac(1, d)}?`,
      equation: ["?", "×", { n: 1, d }, "=", { n, d }],
      visual,
      hint: `The top number counts the 1/${d} parts.`,
      explain: `${n}/${d} is ${n} parts, each 1/${d}.`,
    },
    n,
    [d, d - n, n + 1],
    0,
    d + 1,
  );
}

/** Fraction number lines label in fractions (thirds and sixths too). */
export function fractionLine(): Question {
  const d = pick(G3_DENS);
  const max = d === 2 || (d <= 4 && Math.random() < 0.4) ? 2 : 1;
  const form = rand(0, 2);
  let n = form === 0 ? 1 : rand(2, d * max - 1);
  if (n % d === 0) n += 1;
  const line = (from: number, to: number, hideFrom?: boolean): Visual => ({
    kind: "numberline",
    min: 0,
    max,
    step: 1 / d,
    labelStep: 1,
    from,
    to,
    fractions: d,
    ...(hideFrom ? { hideFrom } : {}),
  });
  const wrong = shuffle([fracText(n, d + 1), fracText(n + 1, d), fracText(Math.max(1, n - 1), d), fracText(d, n), fracText(n, d * 2)]);
  const same = n > d ? ` That's the same as ${mixedText(Math.floor(n / d), n % d, d)}.` : "";
  if (form === 2)
    return textQ(
      {
        key: `fl-dot-${n}-${d}-${max}`,
        prompt: pick(["What fraction is at the dot?", "Name the fraction at the dot."]),
        speech: "What fraction is at the dot on the number line?",
        visual: line(n / d, n / d, true),
        needsVisual: true,
        hint: "Count the equal spaces from 0 to 1: that's the bottom number. Then count the spaces from 0 to the dot.",
        explain: `Each space is 1/${d}. The dot is ${n} spaces from 0, so it's at ${n}/${d}.${same}`,
      },
      fracText(n, d),
      wrong,
    );
  const unit = form === 0;
  return textQ(
    {
      key: `fl-jump-${n}-${d}-${max}`,
      prompt: unit ? "0 to 1 is cut into equal parts. Where does one jump land?" : `Make ${n} jumps of 1/${d} from 0. Where do you land?`,
      speech: unit
        ? `The space from 0 to 1 is cut into ${d} equal parts. One jump of one part lands where?`
        : `Start at 0. Make ${n} jumps of ${sayFrac(1, d)}. Where do you land?`,
      visual: line(0, n / d),
      needsVisual: unit,
      hint: unit ? "Count the equal spaces between 0 and 1. That's the bottom number." : `Each jump is 1/${d}. Count the jumps: that's the top number.`,
      explain: unit ? `0 to 1 has ${d} equal spaces, so one jump lands on 1/${d}.` : `${n} jumps of 1/${d} is ${n}/${d}.${same}`,
    },
    fracText(n, d),
    wrong,
  );
}

const EQ_PAIRS: [number, number][] = [
  [2, 4],
  [2, 6],
  [2, 8],
  [3, 6],
  [4, 8],
];

export function equivFractions3(): Question {
  const [d1, d2] = pick(EQ_PAIRS);
  const k = d2 / d1;
  const n1 = rand(1, d1 - 1);
  const n2 = n1 * k;
  const form = rand(0, 3);
  if (form === 0)
    return numQ(
      {
        key: `eq3-up-${n1}-${d1}-${d2}`,
        prompt: pick(["Find the equal fraction!", "Fill in the missing top number."]),
        speech: `${sayFrac(n1, d1)} is the same as how many ${denWord(d2, true)}?`,
        equation: [{ n: n1, d: d1 }, "=", { n: "?", d: d2 }],
        visual: { kind: "fractions", bars: [{ parts: d1, a: n1, label: fracText(n1, d1) }, { parts: d2, target: n2 }] },
        hint: `Each 1/${d1} is the same size as ${k} pieces of 1/${d2}.`,
        explain: `${n1}/${d1} covers the same amount as ${n2}/${d2}.`,
      },
      n2,
      [n1, n2 + 1, n2 - 1, d2 - n2],
      0,
      d2,
    );
  if (form === 1)
    return numQ(
      {
        key: `eq3-down-${n1}-${d1}-${d2}`,
        prompt: pick(["Find the equal fraction!", "Fill in the missing top number."]),
        speech: `${sayFrac(n2, d2)} is the same as how many ${denWord(d1, true)}?`,
        equation: [{ n: n2, d: d2 }, "=", { n: "?", d: d1 }],
        visual: { kind: "fractions", bars: [{ parts: d2, a: n2, label: fracText(n2, d2) }, { parts: d1, target: n1 }] },
        hint: `${k} pieces of 1/${d2} make one 1/${d1}.`,
        explain: `${n2}/${d2} covers the same amount as ${n1}/${d1}.`,
      },
      n1,
      [n2, n1 + 1, n1 - 1],
      0,
      d1 + 2,
    );
  if (form === 2)
    return textQ(
      {
        key: `eq3-pick-${n1}-${d1}-${d2}`,
        prompt: `Which fraction is equal to ${n1}/${d1}?`,
        speech: `Which fraction is the same amount as ${sayFrac(n1, d1)}?`,
        visual: { kind: "fractions", bars: [{ parts: d1, a: n1, label: fracText(n1, d1) }] },
        hint: `Cut each part into ${k} smaller parts. How many coloured parts now?`,
        explain: `${n1}/${d1} = ${n2}/${d2}. Same amount, smaller pieces.`,
      },
      fracText(n2, d2),
      shuffle([fracText(n1 + d2 - d1, d2), fracText(n1, d2), fracText(n2 + 1, d2), fracText(n2 - 1, d2)].filter((f) => f !== `0/${d2}`)),
    );
  return textQ(
    {
      key: `eq3-line-${n1}-${d1}-${d2}`,
      prompt: `Jump to ${n1}/${d1}. Which fraction names the same point?`,
      speech: `Land on ${sayFrac(n1, d1)} on the number line. The line is cut into ${denWord(d2, true)}. Which fraction names the same point?`,
      visual: { kind: "numberline", min: 0, max: 1, step: 1 / d2, labelStep: 1, from: 0, to: n1 / d1, fractions: d2 },
      hint: `Count the ${denWord(d2, true)} from 0 to that point.`,
      explain: `${n1}/${d1} and ${n2}/${d2} are the same point, so they are equal.`,
    },
    fracText(n2, d2),
    shuffle([fracText(n1, d2), fracText(n2 + 1, d2), fracText(n2 - 1, d2), fracText(n1 + 1, d2)].filter((f) => f !== `0/${d2}`)),
  );
}

export function wholeFractions(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const w = rand(1, 9);
    return numQ(
      {
        key: `wf-over1-${w}`,
        prompt: `${w} wholes = ?/1. What's the top number?`,
        speech: `${w} is how many wholes? Write it as a fraction over 1.`,
        equation: [w, "=", { n: "?", d: 1 }],
        visual: barsOrNone(w <= 4 ? Array.from({ length: w }, () => ({ parts: 1, a: 1 })) : null),
        hint: "Over 1 means each whole is one part. Count the wholes.",
        explain: `${w} = ${w}/1, because ${w} wholes is ${w} parts that are each a whole.`,
      },
      w,
      [1, w + 1, w - 1],
      0,
      12,
    );
  }
  if (form === 1) {
    const d = pick(G3_DENS);
    return numQ(
      {
        key: `wf-one-${d}`,
        prompt: `${d}/${d} is how many wholes?`,
        speech: `${sayFrac(d, d)} is how many wholes?`,
        equation: [{ n: d, d }, "=", "?"],
        visual: { kind: "fractions", bars: [{ parts: d, a: d }] },
        hint: "Are all the parts coloured?",
        explain: `All ${d} parts make the whole thing: ${d}/${d} = 1.`,
      },
      1,
      [d, 0, 2],
      0,
      10,
    );
  }
  const d = pick([2, 3, 4, 6]);
  const w = rand(2, 3);
  if (form === 2)
    return numQ(
      {
        key: `wf-tow-${w}-${d}`,
        prompt: `${w * d}/${d} is how many wholes?`,
        speech: `${sayFrac(w * d, d)} is how many wholes?`,
        equation: [{ n: w * d, d }, "=", "?"],
        visual: barsOrNone(fillBars(w * d, d)),
        hint: `Every ${d} ${denWord(d, true)} make one whole.`,
        explain: `${w * d} ÷ ${d} = ${w}, so ${w * d}/${d} = ${w} wholes.`,
      },
      w,
      [w * d, d, w + 1],
      0,
      20,
    );
  return numQ(
    {
      key: `wf-from-${w}-${d}`,
      prompt: `${w} wholes is how many ${denWord(d, true)}?`,
      equation: [w, "=", { n: "?", d }],
      visual: barsOrNone(fillBars(w * d, d)),
      hint: `Each whole is ${d} ${denWord(d, true)}.`,
      explain: `${w} × ${d} = ${w * d}, so ${w} = ${w * d}/${d}.`,
    },
    w * d,
    [w + d, w, d, w * d + 1],
    0,
    30,
  );
}

export function compareFractions3(): Question {
  let n1: number;
  let d1: number;
  let n2: number;
  let d2: number;
  const sameBottom = Math.random() < 0.5;
  if (sameBottom) {
    d1 = d2 = pick(G3_DENS);
    n1 = rand(1, d1);
    do n2 = rand(1, d1);
    while (n2 === n1);
  } else {
    [d1, d2] = shuffle(G3_DENS).slice(0, 2);
    n1 = n2 = rand(1, Math.min(d1, d2, 3));
  }
  const sign = signOf(n1 * d2, n2 * d1);
  return fixedQ(
    {
      key: `cf3-${n1}-${d1}-${n2}-${d2}`,
      prompt: pick(["Which sign goes in the box?", "Compare the fractions."]),
      speech: `Compare ${sayFrac(n1, d1)} and ${sayFrac(n2, d2)}. Less than, equal to, or greater than?`,
      equation: [{ n: n1, d: d1 }, "?", { n: n2, d: d2 }],
      visual: {
        kind: "fractions",
        bars: [
          { parts: d1, a: n1, label: fracText(n1, d1) },
          { parts: d2, a: n2, label: fracText(n2, d2) },
        ],
      },
      hint: sameBottom
        ? "Same bottom number means same-size pieces. Who has more pieces?"
        : "Same top number means the same count of pieces. Which pieces are bigger? Fewer parts make bigger pieces.",
      explain: sameBottom
        ? `${sayFrac(n1, d1)} ${SIGN_WORD[sign]} ${sayFrac(n2, d2)}, so ${n1}/${d1} ${sign} ${n2}/${d2}.`
        : `${denWord(Math.min(d1, d2), true)} are bigger than ${denWord(Math.max(d1, d2), true)}, so ${n1}/${d1} ${sign} ${n2}/${d2}.`,
    },
    SIGNS,
    sign,
  );
}

/* ================================================== W5 Time & measure (G3) */

const clockText = (h: number, m: number) => `${h}:${pad2(m)}`;
/** Minutes after 12:00 → "h:mm" on a 12-hour clock. */
function toClock(total: number) {
  const mins = ((total % 720) + 720) % 720;
  return clockText(Math.floor(mins / 60) || 12, mins % 60);
}
const clockAt = (total: number): Visual => {
  const mins = ((total % 720) + 720) % 720;
  return { kind: "clock", h: Math.floor(mins / 60) || 12, m: mins % 60 };
};

export function readClock(): Question {
  const h = rand(1, 12);
  const m = rand(0, 59);
  const total = (h % 12) * 60 + m;
  const correct = clockText(h, m);
  const where = m === 0 ? `pointing at ${h}` : m >= 30 ? `between ${h} and ${(h % 12) + 1}` : `just past ${h}`;
  return textQ(
    {
      key: `clk-${h}-${m}`,
      prompt: pick(["What time is it?", "What time does the clock show?", "Read the clock!"]),
      speech: "What time does the clock show?",
      visual: { kind: "clock", h, m },
      needsVisual: true,
      hint: "The short hand gives the hour. Count the long hand by 5s, then by 1s.",
      explain: `The short hand is ${where}, so the hour is ${h}. The long hand shows ${m} minutes. It's ${correct}.`,
    },
    correct,
    shuffle([toClock(total + (m >= 30 ? 60 : -60)), toClock(total + 5), toClock(total - 5), clockText(Math.floor(m / 5) || 12, (h * 5) % 60)]),
  );
}

const ACTIVITIES = ["Soccer practice", "The movie", "Recess", "Piano class", "The bus ride", "Art club", "Swim class", "The parade"];

export function elapsedTime(): Question {
  const act = pick(ACTIVITIES);
  const h = rand(1, 11);
  const m1 = rand(0, 55);
  const d = rand(6, 55);
  const start = h * 60 + m1;
  const end = start + d;
  const crosses = m1 + d >= 60;
  const form = rand(0, 2);
  const steps = crosses
    ? `${60 - m1} minutes gets to ${toClock(start + 60 - m1)}, then ${d - (60 - m1)} more`
    : `${m1 + d} − ${m1} = ${d}`;
  if (form === 0)
    return numQ(
      {
        key: `el-len-${h}-${m1}-${d}`,
        prompt: `${act} goes from ${clockText(h, m1)} to ${toClock(end)}. How long?`,
        speech: `${act} starts at ${clockText(h, m1)} and ends at ${toClock(end)}. How many minutes is that?`,
        visual: { kind: "clock", h, m: m1 },
        unit: "min",
        hint: "Count on from the start time. Jump to the next hour first if you need to.",
        explain: crosses ? `${steps}: ${60 - m1} + ${d - (60 - m1)} = ${d} minutes.` : `${steps} minutes.`,
      },
      d,
      [d + 10, d - 10, d + 5, d - 5, crosses ? (end % 60) - m1 + 100 : d + 1],
      1,
      120,
    );
  if (form === 1)
    return textQ(
      {
        key: `el-end-${h}-${m1}-${d}`,
        prompt: `${act} starts at ${clockText(h, m1)} and lasts ${d} min. End time?`,
        speech: `${act} starts at ${clockText(h, m1)} and lasts ${d} minutes. When does it end?`,
        visual: { kind: "clock", h, m: m1 },
        hint: "Add the minutes. If you pass 60, move on to the next hour.",
        explain: crosses
          ? `${60 - m1} minutes gets to ${toClock(start + 60 - m1)}. ${d - (60 - m1)} more makes ${toClock(end)}.`
          : `${m1} + ${d} = ${m1 + d}, so it ends at ${toClock(end)}.`,
      },
      toClock(end),
      shuffle([toClock(end + 10), toClock(end - 10), toClock(end + (crosses ? -60 : 5)), toClock(end + 60)]),
    );
  return textQ(
    {
      key: `el-start-${h}-${m1}-${d}`,
      prompt: `${act} ended at ${toClock(end)}. It took ${d} min. Start time?`,
      speech: `${act} ended at ${toClock(end)}. It lasted ${d} minutes. When did it start?`,
      visual: clockAt(end),
      hint: "Count back the minutes from the end time.",
      explain: `Count back ${d} minutes from ${toClock(end)} to get ${clockText(h, m1)}.`,
    },
    clockText(h, m1),
    shuffle([toClock(start + 10), toClock(start - 10), toClock(end + d), toClock(start + (crosses ? 60 : -5))]),
  );
}

const MASS_UNIT: [string, "grams" | "kilograms"][] = [
  ["a paper clip", "grams"],
  ["a pencil", "grams"],
  ["a grape", "grams"],
  ["a crayon", "grams"],
  ["a coin", "grams"],
  ["a feather", "grams"],
  ["a strawberry", "grams"],
  ["an eraser", "grams"],
  ["a leaf", "grams"],
  ["a dog", "kilograms"],
  ["a bike", "kilograms"],
  ["a watermelon", "kilograms"],
  ["a big bag of rice", "kilograms"],
  ["a grown-up", "kilograms"],
  ["a school desk", "kilograms"],
  ["a sack of potatoes", "kilograms"],
];
const MASS_GUESS: [string, string, string, string][] = [
  ["a paper clip", "1 g", "1 kg", "100 kg"],
  ["a bag of sugar", "1 kg", "1 g", "100 kg"],
  ["a grown-up", "70 kg", "70 g", "7 kg"],
  ["a bike", "12 kg", "12 g", "120 kg"],
  ["a strawberry", "15 g", "15 kg", "150 kg"],
  ["a puppy", "5 kg", "5 g", "500 kg"],
  ["an apple", "150 g", "150 kg", "15 kg"],
  ["a pencil", "5 g", "5 kg", "50 kg"],
];

const SCALES: { unit: "g" | "kg"; max: number; step: number; emojis: string[] }[] = [
  { unit: "kg", max: 10, step: 1, emojis: ["🍉", "🎃", "🥔", "🐶"] },
  { unit: "kg", max: 50, step: 5, emojis: ["🐕", "🧳", "🛍️"] },
  { unit: "g", max: 500, step: 50, emojis: ["🍎", "🧀", "🍌", "🍪"] },
  { unit: "g", max: 1000, step: 100, emojis: ["🍞", "🥕", "📚"] },
];

function readScale(): Question {
  const si = rand(0, SCALES.length - 1);
  const { unit, max, step, emojis } = SCALES[si];
  const amount = step * rand(1, max / step - 1);
  return numQ(
    {
      key: `mass-scale-${si}-${amount}`,
      prompt: pick(["How heavy is it? Read the scale.", "What does the scale show?"]),
      speech: `Read the scale. How many ${unit === "g" ? "grams" : "kilograms"} is it?`,
      visual: { kind: "scale", amount, max, unit, emoji: pick(emojis) },
      needsVisual: true,
      unit,
      hint: "Find the numbers on each side of the needle. Halfway between two numbers is the number in the middle.",
      explain: `The needle points to ${amount} ${unit}.`,
    },
    amount,
    [amount + step, amount - step, amount + 2 * step, amount * 2],
    0,
    max * 2,
  );
}

function readJug(): Question {
  const max = pick([5, 10]);
  const a = rand(1, max - 1);
  if (Math.random() < 0.5)
    return numQ(
      {
        key: `liq-jug-${max}-${a}`,
        prompt: pick(["How much water is in the jug?", "Read the jug. How many liters?"]),
        visual: { kind: "jug", amount: a, max, unit: "L" },
        needsVisual: true,
        unit: "L",
        hint: "Look at the top of the water and read the mark beside it. Halfway between two marks is the number in the middle.",
        explain: `The water comes up to ${a} L.`,
      },
      a,
      [a + 1, a - 1, max - a, a + 2],
      0,
      max,
    );
  const b = rand(1, 6);
  return typeQ(
    {
      key: `liq-jugadd-${max}-${a}-${b}`,
      prompt: `Read the jug. You pour in ${b} L more. How much now?`,
      speech: `Read how much water is in the jug. Then you pour in ${b} more liters. How many liters are in it now?`,
      visual: { kind: "jug", amount: a, max, unit: "L" },
      needsVisual: true,
      unit: "L",
      hint: "First read how much is in the jug. Then add what you pour in.",
      explain: `The jug has ${a} L. ${a} L + ${b} L = ${a + b} L.`,
    },
    a + b,
  );
}

export function massProblems(): Question {
  if (Math.random() < 0.3) return readScale();
  const form = rand(0, 5);
  if (form === 0) {
    const i = rand(0, MASS_UNIT.length - 1);
    const [item, unit] = MASS_UNIT[i];
    return fixedQ(
      {
        key: `mass-unit-${i}`,
        prompt: `Weigh ${item}: grams or kilograms?`,
        speech: `Would you measure ${item} in grams or kilograms?`,
        hint: "A gram is about as heavy as a raisin. A kilogram is about as heavy as a big dictionary.",
        explain: `${cap(item)} is ${unit === "grams" ? "light" : "heavy"}, so use ${unit}.`,
      },
      ["grams", "kilograms"],
      unit,
    );
  }
  if (form === 1) {
    const i = rand(0, MASS_GUESS.length - 1);
    const [item, right, w1, w2] = MASS_GUESS[i];
    return textQ(
      {
        key: `mass-guess-${i}`,
        prompt: `About how heavy is ${item}?`,
        hint: "1 g is about a raisin. 1 kg is about a big dictionary.",
        explain: `${cap(item)} is about ${right}.`,
      },
      right,
      [w1, w2],
    );
  }
  const a = rand(2, 40);
  const b = rand(2, 40);
  if (form === 2)
    return typeQ(
      {
        key: `mass-add-${a}-${b}`,
        prompt: `A melon is ${a} kg. A pumpkin is ${b} kg. Together?`,
        speech: `A melon weighs ${a} kilograms. A pumpkin weighs ${b} kilograms. How heavy are they together?`,
        equation: [a, "+", b, "=", "?"],
        unit: "kg",
        hint: "Together means add.",
        explain: `${a} kg + ${b} kg = ${a + b} kg.`,
      },
      a + b,
    );
  if (form === 3) {
    const limit = pick([50, 60, 75, 80, 100]);
    const has = rand(10, limit - 5);
    return typeQ(
      {
        key: `mass-room-${limit}-${has}`,
        prompt: `A cart holds ${limit} kg. It has ${has} kg on it. How much more fits?`,
        speech: `A cart can hold ${limit} kilograms. It already has ${has} kilograms. How many more kilograms fit?`,
        equation: [has, "+", "?", "=", limit],
        unit: "kg",
        hint: `Count up from ${has} to ${limit}.`,
        explain: `${limit} − ${has} = ${limit - has} kg more.`,
      },
      limit - has,
    );
  }
  const n = rand(2, 9);
  const w = rand(2, 10);
  if (form === 4)
    return typeQ(
      {
        key: `mass-times-${n}-${w}`,
        prompt: `${n} bags of flour weigh ${w} kg each. Total weight?`,
        speech: `${n} bags of flour weigh ${w} kilograms each. How many kilograms in all?`,
        equation: [n, "×", w, "=", "?"],
        unit: "kg",
        hint: `${n} equal groups of ${w}.`,
        explain: `${n} × ${w} kg = ${n * w} kg.`,
      },
      n * w,
    );
  return typeQ(
    {
      key: `mass-share-${n}-${w}`,
      prompt: `${n * w} g of seeds go into ${n} cups equally. Grams per cup?`,
      speech: `${n * w} grams of seeds are shared equally into ${n} cups. How many grams in each cup?`,
      equation: [n * w, "÷", n, "=", "?"],
      unit: "g",
      hint: `Think: ${n} × what = ${n * w}?`,
      explain: `${n * w} ÷ ${n} = ${w} g in each cup.`,
    },
    w,
  );
}

const LIQUID_GUESS: [string, string, string, string][] = [
  ["a big water bottle", "1 L", "10 L", "100 L"],
  ["a bucket", "10 L", "1 L", "100 L"],
  ["a bathtub", "150 L", "15 L", "1 L"],
  ["a soup pot", "5 L", "50 L", "500 L"],
  ["a fish tank", "40 L", "4 L", "400 L"],
  ["a kiddie pool", "300 L", "3 L", "30 L"],
  ["a watering can", "5 L", "50 L", "500 L"],
  ["a milk jug", "4 L", "40 L", "400 L"],
  ["a kitchen sink", "20 L", "2 L", "200 L"],
];

export function liquidVolume(): Question {
  if (Math.random() < 0.3) return readJug();
  const form = rand(0, 4);
  if (form === 0) {
    const i = rand(0, LIQUID_GUESS.length - 1);
    const [item, right, w1, w2] = LIQUID_GUESS[i];
    return textQ(
      {
        key: `liq-guess-${i}`,
        prompt: `About how much water does ${item} hold?`,
        hint: "A liter is about 4 glasses of water. Picture how many glasses would fill it.",
        explain: `${cap(item)} holds about ${right}.`,
      },
      right,
      [w1, w2],
    );
  }
  const a = rand(12, 60);
  const b = rand(5, 35);
  if (form === 1)
    return typeQ(
      {
        key: `liq-add-${a}-${b}`,
        prompt: `A tank has ${a} L. You pour in ${b} L more. How much now?`,
        speech: `A tank has ${a} liters of water. You pour in ${b} more liters. How many liters now?`,
        equation: [a, "+", b, "=", "?"],
        unit: "L",
        hint: "Pouring in more means add.",
        explain: `${a} L + ${b} L = ${a + b} L.`,
      },
      a + b,
    );
  if (form === 2) {
    const big = a + b;
    return typeQ(
      {
        key: `liq-sub-${big}-${b}`,
        prompt: `A pool has ${big} L. ${b} L leaks out. How much is left?`,
        speech: `A pool has ${big} liters. ${b} liters leak out. How many liters are left?`,
        equation: [big, "−", b, "=", "?"],
        unit: "L",
        hint: "Leaking out means take away.",
        explain: `${big} L − ${b} L = ${a} L.`,
      },
      a,
    );
  }
  const n = rand(2, 9);
  const v = rand(2, 10);
  if (form === 3)
    return typeQ(
      {
        key: `liq-times-${n}-${v}`,
        prompt: `${n} jugs hold ${v} L each. How many liters in all?`,
        speech: `${n} jugs each hold ${v} liters. How many liters in all?`,
        equation: [n, "×", v, "=", "?"],
        unit: "L",
        hint: `${n} equal groups of ${v}.`,
        explain: `${n} × ${v} L = ${n * v} L.`,
      },
      n * v,
    );
  return typeQ(
    {
      key: `liq-share-${n}-${v}`,
      prompt: `${n * v} L of water fills ${n} buckets equally. How much in each?`,
      speech: `${n * v} liters of water is poured equally into ${n} buckets. How many liters in each bucket?`,
      equation: [n * v, "÷", n, "=", "?"],
      unit: "L",
      hint: `Think: ${n} × what = ${n * v}?`,
      explain: `${n * v} ÷ ${n} = ${v} L in each bucket.`,
    },
    v,
  );
}

const GRAPH_SETS: { title: string; items: [string, string][] }[] = [
  { title: "Fruit we ate", items: [["apples", "🍎"], ["bananas", "🍌"], ["grapes", "🍇"], ["pears", "🍐"]] },
  { title: "Pets in our class", items: [["dogs", "🐶"], ["cats", "🐱"], ["fish", "🐟"], ["birds", "🐦"]] },
  { title: "Balls in the gym", items: [["soccer balls", "⚽"], ["basketballs", "🏀"], ["tennis balls", "🎾"], ["footballs", "🏈"]] },
  { title: "Things on our street", items: [["cars", "🚗"], ["buses", "🚌"], ["bikes", "🚲"], ["trucks", "🚚"]] },
];

/** Picture graph: `count` is the number of pictures, each worth `key`. */
export function pictureGraph(): Question {
  const si = rand(0, GRAPH_SETS.length - 1);
  const set = GRAPH_SETS[si];
  const key = pick([2, 5, 10]);
  const icons = set.items.map(() => rand(1, 6) + (key !== 5 && Math.random() < 0.25 ? 0.5 : 0));
  const values = icons.map((c) => c * key);
  const [i, j] = shuffle([0, 1, 2, 3]);
  const form = rand(0, 2);
  const [li, lj] = [set.items[i][0], set.items[j][0]];
  const visual: Visual = { kind: "pictograph", title: set.title, items: set.items.map(([label, emoji], k) => ({ label: cap(label), emoji, count: icons[k] })), key };
  const base = { visual, needsVisual: true, hint: `Each picture means ${key}${key !== 5 ? `, and half a picture means ${key / 2}` : ""}. Count by ${key}s.` };
  const keyPart = `pg-${form}-${si}-${key}-${icons.join(".")}-${i}-${j}`;
  if (form === 0)
    return numQ(
      { ...base, key: keyPart, prompt: `How many ${li} are there?`, explain: `${icons[i]} picture${icons[i] === 1 ? "" : "s"} × ${key} = ${values[i]} ${li}.` },
      values[i],
      [Math.ceil(icons[i]), values[i] + key, values[i] - key],
      0,
      80,
    );
  if (values[i] === values[j]) {
    return numQ(
      { ...base, key: keyPart, prompt: `How many ${li} and ${lj} in all?`, explain: `${values[i]} + ${values[j]} = ${values[i] + values[j]}.` },
      values[i] + values[j],
      [Math.ceil(icons[i] + icons[j]), values[i], values[i] + values[j] + key],
      0,
      150,
    );
  }
  const [big, small] = values[i] > values[j] ? [i, j] : [j, i];
  if (form === 1)
    return numQ(
      {
        ...base,
        key: keyPart,
        prompt: `How many more ${set.items[big][0]} than ${set.items[small][0]}?`,
        explain: `${values[big]} − ${values[small]} = ${values[big] - values[small]}.`,
      },
      values[big] - values[small],
      [icons[big] - icons[small], values[big], values[big] - values[small] + key],
      0,
      80,
    );
  return numQ(
    { ...base, key: keyPart, prompt: `How many ${li} and ${lj} in all?`, explain: `${values[i]} + ${values[j]} = ${values[i] + values[j]}.` },
    values[i] + values[j],
    [Math.ceil(icons[i] + icons[j]), values[i] + values[j] + key, values[i] + values[j] - key],
    0,
    150,
  );
}

const BAR_SETS: { title: string; ask: string; items: string[] }[] = [
  { title: "Favorite color", ask: "picked", items: ["Red", "Blue", "Green", "Yellow"] },
  { title: "Favorite season", ask: "picked", items: ["Spring", "Summer", "Fall", "Winter"] },
  { title: "Favorite snack", ask: "picked", items: ["Popcorn", "Fruit", "Yogurt", "Pretzels"] },
  { title: "Favorite game", ask: "picked", items: ["Tag", "Chess", "Soccer", "Hopscotch"] },
];

export function barGraph(): Question {
  const si = rand(0, BAR_SETS.length - 1);
  const set = BAR_SETS[si];
  const step = pick([2, 5, 10]);
  const values = set.items.map(() => step * rand(1, 9));
  const [i, j] = shuffle([0, 1, 2, 3]);
  const form = rand(0, 2);
  const visual: Visual = { kind: "bars", title: set.title, items: set.items.map((label, k) => ({ label, value: values[k] })), max: step * 10, step };
  const base = { visual, needsVisual: true, hint: `The lines go up by ${step}s. Read across from the top of the bar.` };
  const keyPart = `bg-${form}-${si}-${step}-${values.join(".")}-${i}-${j}`;
  if (form === 0 || values[i] === values[j])
    return numQ(
      { ...base, key: keyPart, prompt: `How many kids picked ${set.items[i]}?`, explain: `The ${set.items[i]} bar reaches ${values[i]}.` },
      values[i],
      [values[i] / step, values[i] + step, values[i] - step],
      0,
      100,
    );
  const [big, small] = values[i] > values[j] ? [i, j] : [j, i];
  if (form === 1)
    return numQ(
      {
        ...base,
        key: keyPart,
        prompt: `How many more picked ${set.items[big]} than ${set.items[small]}?`,
        explain: `${values[big]} − ${values[small]} = ${values[big] - values[small]}.`,
      },
      values[big] - values[small],
      [(values[big] - values[small]) / step, values[big], values[big] - values[small] + step],
      0,
      100,
    );
  return numQ(
    {
      ...base,
      key: keyPart,
      prompt: `How many picked ${set.items[i]} or ${set.items[j]}?`,
      explain: `${values[i]} + ${values[j]} = ${values[i] + values[j]}.`,
    },
    values[i] + values[j],
    [(values[i] + values[j]) / step, values[i] + values[j] + step, values[i] + values[j] - step],
    0,
    200,
  );
}

const quarterText = (q4: number) => {
  const w = Math.floor(q4 / 4);
  const r = q4 % 4;
  const frac = r === 0 ? "" : r === 2 ? "1/2" : `${r}/4`;
  return w === 0 ? frac || "0" : frac ? `${w} ${frac}` : `${w}`;
};
const sayQuarters = (q4: number) => {
  const w = Math.floor(q4 / 4);
  const r = q4 % 4;
  const f = r === 0 ? "" : r === 2 ? "a half" : r === 1 ? "1 fourth" : "3 fourths";
  return w === 0 ? f : r === 0 ? `${w}` : `${w} and ${f}`;
};

export function measureInches(): Question {
  const w = rand(1, 6);
  const r = rand(0, 3);
  const q4 = w * 4 + r;
  const emoji = pick(["✏️", "🖍️", "🔑", "🐛", "🥕", "🖊️"]);
  return textQ(
    {
      key: `in-${q4}`,
      prompt: pick(["How long is it, in inches?", "Measure it! How many inches?"]),
      speech: "How long is it? Measure to the nearest quarter inch.",
      visual: { kind: "ruler", length: q4 / 4, unit: "in", emoji },
      needsVisual: true,
      hint: "Find the last whole inch. Each inch is cut into 4 quarters. Count the small marks past it.",
      explain: `It ends ${r === 0 ? `right at ${w}` : `${sayQuarters(r)} inch past ${w}`}, so it's ${sayQuarters(q4)} inches.`,
    },
    quarterText(q4),
    shuffle([quarterText(q4 + 1), quarterText(q4 - 1), quarterText(q4 + 4), quarterText(q4 - 4), quarterText(q4 + 2)].filter((t) => t !== "0")),
  );
}

export function linePlot3(): Question {
  const w = rand(1, 3);
  const spots = shuffle([0, 1, 2, 3, 4]).slice(0, 4).sort((a, b) => a - b);
  const counts = spots.map(() => rand(1, 4));
  const values = spots.flatMap((s, k) => Array<number>(counts[k]).fill(w + s / 4));
  const [i, j] = shuffle([0, 1, 2, 3]);
  const form = rand(0, 2);
  const visual: Visual = { kind: "dots", values, min: w, max: w + 1, label: "Pencil lengths (inches)" };
  const say = (k: number) => quarterText(w * 4 + spots[k]);
  const keyPart = `lp3-${form}-${w}-${spots.join(".")}-${counts.join(".")}-${i}-${j}`;
  const base = { visual, needsVisual: true, hint: "Each dot is one pencil. Find the length on the line and count the dots above it." };
  if (form === 0)
    return numQ(
      { ...base, key: keyPart, prompt: `How many pencils are ${say(i)} inches long?`, speech: `How many pencils are ${sayQuarters(w * 4 + spots[i])} inches long?`, explain: `There are ${counts[i]} dots above ${say(i)}.` },
      counts[i],
      [counts[i] + 1, counts[i] - 1, counts[j]],
      0,
      10,
    );
  if (form === 1 && counts[i] !== counts[j]) {
    const [big, small] = counts[i] > counts[j] ? [i, j] : [j, i];
    return numQ(
      {
        ...base,
        key: keyPart,
        prompt: `How many more are ${say(big)} in than ${say(small)} in?`,
        speech: `How many more pencils are ${sayQuarters(w * 4 + spots[big])} inches long than ${sayQuarters(w * 4 + spots[small])} inches?`,
        explain: `${counts[big]} − ${counts[small]} = ${counts[big] - counts[small]}.`,
      },
      counts[big] - counts[small],
      [counts[big], counts[small], counts[big] + counts[small]],
      0,
      10,
    );
  }
  const total = values.length;
  return numQ(
    { ...base, key: `lp3-all-${w}-${spots.join(".")}-${counts.join(".")}`, prompt: "How many pencils were measured?", explain: `Count every dot: ${counts.join(" + ")} = ${total}.` },
    total,
    [total + 1, total - 1, spots.length],
    0,
    20,
  );
}

/* ==================================================== W6 Area & shapes (G3) */

const AREA_UNITS: [string, string, string][] = [
  ["cm", "cm²", "centimeter"],
  ["m", "m²", "meter"],
  ["in", "sq in", "inch"],
  ["ft", "sq ft", "foot"],
];

export function areaCount(): Question {
  const [u, sq, sayU] = pick(AREA_UNITS);
  if (Math.random() < 0.15) {
    return numQ(
      {
        key: `ac-unit-${u}`,
        prompt: `A square has 1 ${u} sides. What's its area?`,
        speech: `A square has sides 1 ${sayU} long. What is its area?`,
        visual: { kind: "rect", w: 1, h: 1, showW: true, showH: true, grid: true, unit: u },
        unit: sq,
        hint: "A square with sides of 1 is one unit square.",
        explain: `It's exactly 1 unit square: 1 ${sq}.`,
      },
      1,
      [2, 4, 0],
      0,
      6,
    );
  }
  const w = rand(2, 8);
  const h = rand(2, 6);
  return numQ(
    {
      key: `ac-${w}-${h}-${u}`,
      prompt: pick(["How many unit squares cover it?", `Each square is 1 ${sq}. What's the area?`, "What is the area?"]),
      speech: `Each little square is 1 square ${sayU}. What is the area?`,
      visual: { kind: "rect", w, h, showW: true, showH: true, grid: true, unit: u },
      needsVisual: true,
      unit: sq,
      hint: "Count the squares in one row. Then count by that number for each row.",
      explain: `${h} rows of ${w} squares is ${w * h} squares, so the area is ${w * h} ${sq}.`,
    },
    w * h,
    [2 * (w + h), w + h, w * h + w, w * h - h],
    1,
    60,
  );
}

export function areaMultiply(): Question {
  const [u, sq] = pick(AREA_UNITS);
  const w = rand(3, 10);
  const h = rand(2, 9);
  const form = rand(0, 2);
  const thing = pick(["rug", "garden", "poster", "table top", "patio"]);
  return typeQ(
    {
      key: `am-${form}-${w}-${h}-${u}`,
      prompt:
        form === 0
          ? pick(["What's the area?", "Multiply the sides! Area?"])
          : form === 1
            ? `A ${thing} is ${w} ${u} long and ${h} ${u} wide. Area?`
            : "Count or multiply! What's the area?",
      speech: form === 1 ? `A ${thing} is ${w} ${u} long and ${h} ${u} wide. What is its area?` : `The rectangle is ${w} by ${h}. What is its area?`,
      equation: form === 2 ? undefined : [w, "×", h, "=", "?"],
      visual: { kind: "rect", w, h, showW: true, showH: true, grid: form === 2, unit: u },
      unit: sq,
      hint: `Area = length × width. That's ${h} rows of ${w} squares.`,
      explain: `${w} × ${h} = ${w * h}, so the area is ${w * h} ${sq}.`,
    },
    w * h,
  );
}

export function areaSplit(): Question {
  const T = pick([10, 10, 20]);
  const k = rand(1, 9);
  const side = T + k;
  const w = rand(2, T === 20 ? 6 : 9);
  const form = rand(0, 2);
  if (form < 2)
    return typeQ(
      {
        key: `as-${form}-${w}-${T}-${k}`,
        prompt: form === 0 ? "Add the two parts. What's the total area?" : `Split it up! Area of ${w} by ${side}?`,
        speech: `The rectangle is ${w} by ${side}. Split ${side} into ${T} and ${k}. What's the total area?`,
        equation: form === 0 ? [w, "×", T, "+", w, "×", k, "=", "?"] : [w, "×", side, "=", "?"],
        visual: { kind: "area", tens: T, ones: k, by: w },
        unit: "sq units",
        hint: `Find ${T} × ${w} and ${k} × ${w}, then add them.`,
        explain: `${T} × ${w} = ${T * w} and ${k} × ${w} = ${k * w}. ${T * w} + ${k * w} = ${side * w}.`,
      },
      side * w,
    );
  return numQ(
    {
      key: `as-2-${w}-${T}-${k}`,
      prompt: "Break apart the long side. What's missing?",
      speech: `${w} times ${side} equals ${w} times ${T}, plus ${w} times what?`,
      equation: [w, "×", side, "=", w, "×", T, "+", w, "×", "?"],
      visual: { kind: "rect", w: side, h: w, showW: true, showH: true, grid: false, unit: "", inside: `${T} + ?` },
      hint: `${side} is ${T} and how many more?`,
      explain: `${side} = ${T} + ${k}, so ${w} × ${side} = ${w} × ${T} + ${w} × ${k}.`,
    },
    k,
    [side, T, k + 1, k - 1],
    0,
    30,
  );
}

export function areaLShape(): Question {
  const [u, sq, unitWord] = pick(AREA_UNITS);
  const w = rand(4, 9);
  const h = rand(3, 7);
  const cutW = rand(1, w - 2);
  const cutH = rand(1, h - 1);
  const area = w * h - cutW * cutH;
  const [lw, rw, rh] = [w - cutW, cutW, h - cutH];
  const form = rand(0, 3);
  const visual = (grid: boolean, hideSides?: boolean): Visual => ({ kind: "lshape", w, h, cutW, cutH, unit: u, grid, ...(hideSides ? { hideSides } : {}) });
  const key = `al-${form}-${w}-${h}-${cutW}-${cutH}`;
  const splitWay = `${lw} × ${h} = ${lw * h} and ${rw} × ${rh} = ${rw * rh}. ${lw * h} + ${rw * rh} = ${area}.`;
  const cutWay = `${w} × ${h} = ${w * h}. The missing corner is ${cutW} × ${cutH} = ${cutW * cutH}. ${w * h} − ${cutW * cutH} = ${area}.`;
  if (form === 0)
    return numQ(
      {
        key,
        prompt: pick(["Count the unit squares. What's the area?", "How many squares cover this shape?"]),
        speech: `Each little square is 1 square ${unitWord}. What is the area of the L shape?`,
        visual: visual(true, true),
        needsVisual: true,
        unit: sq,
        hint: "Split the L into two rectangles. Count the squares in each, then add.",
        explain: `${splitWay} The area is ${area} ${sq}.`,
      },
      area,
      [w * h, area + 1, area - 1, area + cutW],
      1,
      80,
    );
  if (form === 1)
    return typeQ(
      {
        key,
        prompt: "Split the L into two rectangles. What's the area?",
        speech: "Split the L shape into two rectangles. Add their areas. What's the total area?",
        equation: [lw, "×", h, "+", rw, "×", rh, "=", "?"],
        visual: visual(false),
        unit: sq,
        hint: "Draw a line down from the inside corner. Find each rectangle's area, then add.",
        explain: splitWay,
      },
      area,
    );
  if (form === 2)
    return typeQ(
      {
        key,
        prompt: "Find the big rectangle, then take away the corner.",
        speech: "Imagine the whole rectangle, then take away the missing corner. What's the area of the L shape?",
        equation: [w, "×", h, "−", cutW, "×", cutH, "=", "?"],
        visual: visual(false),
        unit: sq,
        hint: "The whole rectangle is the bottom side times the left side. The missing corner is a small rectangle.",
        explain: cutWay,
      },
      area,
    );
  return typeQ(
    {
      key,
      prompt: pick(["What is the area of this shape?", "Find the area of the L-shape."]),
      speech: "What is the area of this L shape?",
      visual: visual(false),
      needsVisual: true,
      unit: sq,
      hint: "Split it into two rectangles and add, or take the missing corner away from a big rectangle.",
      explain: `${splitWay} Or: ${cutWay}`,
    },
    area,
  );
}

const REGULAR: [ShapeName, number][] = [
  ["square", 4],
  ["pentagon", 5],
  ["hexagon", 6],
  ["octagon", 8],
];

export function perimeter(): Question {
  const form = rand(0, 3);
  const u = pick(["cm", "m", "in", "ft"]);
  if (form === 0) {
    const w = rand(2, 12);
    const h = rand(2, 10);
    return numQ(
      {
        key: `per-rect-${w}-${h}-${u}`,
        prompt: pick(["What's the perimeter?", "How far is it all the way around?"]),
        speech: `The rectangle is ${w} ${u} by ${h} ${u}. What's the distance all the way around?`,
        visual: { kind: "rect", w, h, showW: true, showH: true, grid: false, unit: u },
        unit: u,
        hint: "Perimeter is the distance around. Add all 4 sides — opposite sides are equal.",
        explain: `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} ${u}.`,
      },
      2 * (w + h),
      [w * h, w + h, 2 * w + h],
      0,
      150,
    );
  }
  if (form === 1) {
    const [shape, n] = pick(REGULAR);
    const s = rand(2, 9);
    return numQ(
      {
        key: `per-reg-${shape}-${s}-${u}`,
        prompt: `Each side of this ${shape} is ${s} ${u}. Perimeter?`,
        speech: `Every side of this ${shape} is ${s} ${u} long. What is the perimeter?`,
        visual: { kind: "shape", shape },
        unit: u,
        hint: `How many sides does ${an(shape)} have? Add ${s} that many times.`,
        explain: `${cap(an(shape))} has ${n} sides. ${n} × ${s} = ${n * s} ${u}.`,
      },
      n * s,
      [s + n, n * s + s, n * s - s],
      0,
      100,
    );
  }
  if (form === 2) {
    const sides = Array.from({ length: rand(3, 4) }, () => rand(2, 15));
    const total = sides.reduce((t, x) => t + x, 0);
    return typeQ(
      {
        key: `per-list-${sides.join("-")}-${u}`,
        prompt: `A shape has sides ${sides.join(", ")} ${u}. Perimeter?`,
        speech: `A shape has sides of ${sides.join(", ")} ${u}. What is its perimeter?`,
        unit: u,
        hint: "Add up every side.",
        explain: `${sides.join(" + ")} = ${total} ${u}.`,
      },
      total,
    );
  }
  const L = rand(4, 15);
  const W = rand(2, L - 1);
  const P = 2 * (L + W);
  return numQ(
    {
      key: `per-miss-${L}-${W}-${u}`,
      prompt: `Perimeter ${P} ${u}. Length ${L} ${u}. How wide is it?`,
      speech: `A rectangle has a perimeter of ${P} ${u}. It is ${L} ${u} long. How wide is it?`,
      visual: { kind: "rect", w: L, h: W, showW: true, showH: false, grid: false, unit: u },
      unit: u,
      hint: `Two lengths are ${L} + ${L}. What's left of ${P} is two widths.`,
      explain: `${P} − ${L} − ${L} = ${2 * W}, and ${2 * W} ÷ 2 = ${W} ${u}.`,
    },
    W,
    [P - L, P - 2 * L, W + 1, W - 1],
    1,
    60,
  );
}

const AREA_OR_PERIM: [string, "Area" | "Perimeter"][] = [
  ["a fence around a yard", "Perimeter"],
  ["carpet to cover a floor", "Area"],
  ["a frame around a picture", "Perimeter"],
  ["paint to cover a wall", "Area"],
  ["tiles for a kitchen floor", "Area"],
  ["grass seed for a lawn", "Area"],
  ["a border around a bulletin board", "Perimeter"],
  ["lights along the edge of a window", "Perimeter"],
  ["paper to cover a table", "Area"],
  ["ribbon around the edge of a card", "Perimeter"],
  ["a rug for a bedroom", "Area"],
  ["a path all around a pool", "Perimeter"],
];

export function areaVsPerimeter(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const N = pick([12, 16, 18, 20, 24, 30, 36]);
    const pairs: [number, number][] = [];
    for (let a = 1; a * a <= N; a++) if (N % a === 0) pairs.push([a, N / a]);
    const [p1, p2] = shuffle(pairs).slice(0, 2);
    const per = (p: [number, number]) => 2 * (p[0] + p[1]);
    const winner = per(p1) > per(p2) ? p1 : p2;
    const label = (p: [number, number]) => `${p[0]} × ${p[1]}`;
    return fixedQ(
      {
        key: `ap-same-area-${N}-${label(p1)}-${label(p2)}`,
        visual: {
          kind: "rects",
          items: [p1, p2].map((p) => ({ w: p[1], h: p[0], label: label(p) })),
          unit: "cm",
          grid: Math.max(p1[1], p2[1]) <= 12,
        },
        prompt: `Both have area ${N}. Which has the bigger perimeter?`,
        speech: `A ${p1[0]} by ${p1[1]} rectangle and a ${p2[0]} by ${p2[1]} rectangle both have area ${N}. Which has the bigger perimeter?`,
        hint: "Add all four sides of each rectangle and compare.",
        explain: `${label(p1)} has perimeter ${per(p1)}. ${label(p2)} has perimeter ${per(p2)}. Long thin rectangles have bigger perimeters.`,
      },
      [label(p1), label(p2), "They're the same"],
      label(winner),
    );
  }
  if (form === 1) {
    const half = pick([6, 8, 10, 12]);
    const pairs: [number, number][] = [];
    for (let a = 1; a <= half / 2; a++) pairs.push([a, half - a]);
    const [p1, p2] = shuffle(pairs).slice(0, 2);
    const area = (p: [number, number]) => p[0] * p[1];
    const winner = area(p1) > area(p2) ? p1 : p2;
    const label = (p: [number, number]) => `${p[0]} × ${p[1]}`;
    return fixedQ(
      {
        key: `ap-same-per-${half}-${label(p1)}-${label(p2)}`,
        visual: {
          kind: "rects",
          items: [p1, p2].map((p) => ({ w: p[1], h: p[0], label: label(p) })),
          unit: "cm",
          grid: Math.max(p1[1], p2[1]) <= 12,
        },
        prompt: `Both have perimeter ${2 * half}. Which has more area?`,
        speech: `A ${p1[0]} by ${p1[1]} rectangle and a ${p2[0]} by ${p2[1]} rectangle both have perimeter ${2 * half}. Which has more area?`,
        hint: "Multiply the sides of each rectangle and compare.",
        explain: `${label(p1)} has area ${area(p1)}. ${label(p2)} has area ${area(p2)}. The closer to a square, the more area.`,
      },
      [label(p1), label(p2), "They're the same"],
      label(winner),
    );
  }
  if (form === 2) {
    const i = rand(0, AREA_OR_PERIM.length - 1);
    const [job, kind] = AREA_OR_PERIM[i];
    return fixedQ(
      {
        key: `ap-which-${i}`,
        prompt: `Buying ${job}: area or perimeter?`,
        speech: `You need ${job}. Do you need the area or the perimeter?`,
        hint: "Covering the inside is area. Going around the edge is perimeter.",
        explain: kind === "Area" ? `It covers the whole inside, so it's area.` : `It goes around the edge, so it's perimeter.`,
      },
      ["Area", "Perimeter"],
      kind,
    );
  }
  const a = rand(2, 9);
  const b = rand(2, 9);
  return numQ(
    {
      key: `ap-a2p-${a}-${b}`,
      prompt: `Area ${a * b} sq cm. One side is ${a} cm. Perimeter?`,
      speech: `A rectangle has an area of ${a * b} square centimeters. One side is ${a} centimeters. What is its perimeter?`,
      visual: { kind: "rect", w: b, h: a, showW: false, showH: true, grid: false, unit: "cm", inside: `Area = ${a * b}` },
      unit: "cm",
      hint: `First find the other side: ${a} × what = ${a * b}? Then go all the way around.`,
      explain: `The other side is ${b} cm. ${a} + ${b} + ${a} + ${b} = ${2 * (a + b)} cm.`,
    },
    2 * (a + b),
    [a * b, a + b, 2 * a + b],
    0,
    100,
  );
}

const QUAD_NAMES: Record<string, string[]> = {
  square: ["square", "rectangle", "rhombus", "parallelogram", "quadrilateral"],
  rectangle: ["rectangle", "parallelogram", "quadrilateral"],
  rhombus: ["rhombus", "parallelogram", "quadrilateral"],
  parallelogram: ["parallelogram", "quadrilateral"],
  trapezoid: ["trapezoid", "quadrilateral"],
};
const QUAD_WHY: Record<string, string> = {
  square: "All 4 sides are equal and all 4 corners are square.",
  rectangle: "It has 4 square corners, but the sides aren't all equal.",
  rhombus: "All 4 sides are equal, but the corners aren't square.",
  parallelogram: "Opposite sides are parallel, but the corners aren't square.",
  trapezoid: "Only one pair of sides is parallel.",
};
const QUAD_FACTS: [string, "Yes" | "No"][] = [
  ["Is every square a rectangle?", "Yes"],
  ["Is every square a rhombus?", "Yes"],
  ["Is every rectangle a square?", "No"],
  ["Is every rhombus a square?", "No"],
  ["Is a rhombus a quadrilateral?", "Yes"],
  ["Is a triangle a quadrilateral?", "No"],
  ["Does every rectangle have 4 right angles?", "Yes"],
  ["Does every rhombus have 4 equal sides?", "Yes"],
  ["Is a pentagon a quadrilateral?", "No"],
  ["Is every parallelogram a rectangle?", "No"],
  ["Is a square a parallelogram?", "Yes"],
  ["Does every quadrilateral have 4 sides?", "Yes"],
  ["Can a quadrilateral have 5 corners?", "No"],
];

export function quadrilaterals(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const s = pick(Object.keys(QUAD_NAMES)) as ShapeName;
    const wrong = ["square", "rectangle", "rhombus", "parallelogram", "trapezoid", "triangle", "pentagon"].filter((n) => !QUAD_NAMES[s].includes(n));
    return textQ(
      {
        key: `qd-name-${s}`,
        prompt: "What is the best name for this shape?",
        visual: { kind: "shape", shape: s },
        needsVisual: true,
        hint: "Check the sides: are they equal? Check the corners: are they square?",
        explain: `${QUAD_WHY[s]} It's ${an(s)}.`,
      },
      s,
      shuffle(wrong),
    );
  }
  if (form === 1) {
    const i = rand(0, QUAD_FACTS.length - 1);
    const [q, a] = QUAD_FACTS[i];
    return fixedQ(
      {
        key: `qd-fact-${i}`,
        prompt: q,
        hint: "A quadrilateral is any shape with 4 straight sides. Squares, rectangles and rhombuses are special ones.",
        explain: a === "Yes" ? "Yes! That's always true." : "No. That isn't always true.",
      },
      ["Yes", "No"],
      a,
    );
  }
  const odd = pick<ShapeName>(["triangle", "pentagon", "hexagon", "circle", "octagon"]);
  const quads = shuffle<ShapeName>(["square", "rectangle", "rhombus", "parallelogram", "trapezoid"]).slice(0, 3);
  const all = shuffle([odd, ...quads]);
  return textQ(
    {
      key: `qd-odd-${all.join("-")}`,
      prompt: "Which shape is NOT a quadrilateral?",
      speech: "Which shape is not a quadrilateral?",
      visual: { kind: "shapes", shapes: all },
      needsVisual: true,
      hint: "A quadrilateral has exactly 4 straight sides. Count the sides of each.",
      explain: odd === "circle" ? "A circle has no straight sides, so it isn't a quadrilateral." : `${cap(an(odd))} doesn't have 4 sides, so it isn't a quadrilateral.`,
    },
    odd,
    quads,
  );
}

/* ===================================================== W7 Big numbers (G4) */

/** A random number with the chosen digit appearing only once. */
function uniqueDigitNumber(min: number, max: number) {
  for (;;) {
    const n = rand(min, max);
    const s = String(n);
    const pos = rand(0, s.length - 1);
    const d = s[pos];
    if (d !== "0" && s.split(d).length === 2) return { n, s, pos, digit: Number(d), p: s.length - 1 - pos };
  }
}

export function placeValue4(): Question {
  const { n, s, pos, digit, p } = uniqueDigitNumber(10000, 999999);
  const value = digit * 10 ** p;
  const visual: Visual = { kind: "places", digits: s, highlight: pos };
  if (Math.random() < 0.5)
    return typeQ(
      {
        key: `pv-val-${n}-${pos}`,
        prompt: `What is the ${digit} worth in ${comma(n)}?`,
        visual,
        hint: "Find the place name under the digit. The digit is worth that many of that place.",
        explain: `The ${digit} is in the ${PLACE[p]} place, so it's worth ${comma(value)}.`,
      },
      value,
    );
  const near = PLACE.slice(0, 6)
    .map((name, i) => ({ name, gap: Math.abs(i - p) + Math.random() / 2 }))
    .filter((x) => x.name !== PLACE[p])
    .sort((a, b) => a.gap - b.gap)
    .map((x) => x.name);
  return textQ(
    {
      key: `pv-place-${n}-${pos}`,
      prompt: `In ${comma(n)}, which place is the ${digit} in?`,
      visual,
      hint: "Start at the right: ones, tens, hundreds, then thousands, ten thousands, hundred thousands.",
      explain: `Counting from the right, the ${digit} is in the ${PLACE[p]} place.`,
    },
    PLACE[p],
    near,
  );
}

export function tenTimes(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const d = rand(1, 9);
    const p = rand(1, 4);
    const hi = d * 10 ** p;
    const lo = d * 10 ** (p - 1);
    return numQ(
      {
        key: `tt-ratio-${d}-${p}`,
        prompt: `${comma(hi)} is how many times ${comma(lo)}?`,
        speech: `${comma(hi)} is how many times as much as ${comma(lo)}?`,
        equation: [hi, "=", "?", "×", lo],
        visual: { kind: "places", digits: String(hi + lo), highlight: 0 },
        hint: "Look at the cards: the same digit moved one place to the left. What does each move to the left do?",
        explain: `The ${d} moved one place left, so ${comma(hi)} = 10 × ${comma(lo)}.`,
      },
      10,
      [100, 1, 20, 9],
      0,
      100,
    );
  }
  if (form === 1) {
    const m = rand(2, 99) * pick([1, 1, 10]);
    return typeQ(
      {
        key: `tt-times-${m}`,
        prompt: pick(["Ten times as much! What is it?", "Multiply by 10."]),
        speech: `What is 10 times ${m}?`,
        equation: [10, "×", m, "=", "?"],
        hint: "Times 10 shifts every digit one place to the left. A 0 fills the ones.",
        explain: `Each digit moves up a place: 10 × ${m} = ${comma(10 * m)}.`,
      },
      10 * m,
    );
  }
  if (form === 2) {
    const m = rand(2, 99) * pick([1, 1, 10]);
    return typeQ(
      {
        key: `tt-div-${m}`,
        prompt: pick(["Divide by 10.", "One tenth as much! What is it?"]),
        speech: `What is ${10 * m} divided by 10?`,
        equation: [10 * m, "÷", 10, "=", "?"],
        hint: "Divide by 10 shifts every digit one place to the right.",
        explain: `Each digit moves down a place: ${comma(10 * m)} ÷ 10 = ${comma(m)}.`,
      },
      m,
    );
  }
  const unit = pick([10, 100, 1000]);
  const N = rand(2, 9) * unit * pick([10, 100]);
  const ans = N / unit;
  return numQ(
    {
      key: `tt-howmany-${unit}-${N}`,
      prompt: `How many ${PLACE[Math.log10(unit)]} are in ${comma(N)}?`,
      hint: `Each ${PLACE_ONE[unit]} is ${comma(unit)}. How many ${comma(unit)}s fit in ${comma(N)}?`,
      explain: `${comma(N)} ÷ ${comma(unit)} = ${comma(ans)}, so there are ${comma(ans)} ${PLACE[Math.log10(unit)]}.`,
    },
    ans,
    [ans / 10, ans * 10, N / 10 ** (String(N).length - 1)].filter((x) => x !== ans),
    1,
    1000000,
  );
}

export function expandedForm(): Question {
  let n: number;
  let parts: number[];
  do {
    n = rand(1000, 999999);
    const s = String(n);
    parts = [...s].map((c, i) => Number(c) * 10 ** (s.length - 1 - i)).filter((v) => v > 0);
  } while (parts.length < 3);
  const form = rand(0, 2);
  if (form === 0) {
    const eq: Token[] = parts.flatMap((v, i) => (i ? ["+", v] : [v]));
    return typeQ(
      {
        key: `ex-std-${n}`,
        prompt: pick(["Put it together! What number is this?", "Write the number."]),
        speech: `${parts.map(comma).join(" plus ")}. What number is that?`,
        equation: [...eq, "=", "?"],
        hint: "Each part fills one place. Any place that's missing gets a 0.",
        explain: `${parts.map(comma).join(" + ")} = ${comma(n)}.`,
      },
      n,
    );
  }
  if (form === 1) {
    const idx = rand(0, parts.length - 1);
    const eq: Token[] = parts.flatMap((v, i) => [...(i ? ["+"] : []), i === idx ? "?" : v]);
    return typeQ(
      {
        key: `ex-miss-${n}-${idx}`,
        prompt: "Which part is missing?",
        speech: `What part is missing to make ${comma(n)}?`,
        equation: [...eq, "=", n],
        visual: { kind: "places", digits: String(n), highlight: String(n).length - String(parts[idx]).length },
        hint: "Which place in the number isn't shown yet? What is that digit worth?",
        explain: `${comma(n)} = ${parts.map(comma).join(" + ")}. The missing part is ${comma(parts[idx])}.`,
      },
      parts[idx],
    );
  }
  const small = n % 100000;
  const m = small >= 1000 ? small : n;
  const s = String(m);
  const swaps: number[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] !== s[i + 1]) swaps.push(Number(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2)));
  }
  const noZero = s.includes("0") ? Number(s.replace("0", "")) : Number(s.slice(0, 2) + "0" + s.slice(2));
  return textQ(
    {
      key: `ex-words-${m}`,
      prompt: `Which number is ${numberWords(m)}?`,
      hint: "Write the thousands part first, then a comma, then the hundreds, tens and ones.",
      explain: `${cap(numberWords(m))} is ${comma(m)}.`,
    },
    comma(m),
    shuffle([...shuffle(swaps).slice(0, 2), noZero, m * 10].filter((x) => x !== m && x > 0).map(comma)),
  );
}

export function compareBig(): Question {
  const a = rand(1000, 999999);
  const sa = String(a);
  let b: number;
  const kind = rand(0, 9);
  if (kind === 0) b = a;
  else if (kind <= 2) b = rand(1000, 999999);
  else {
    let s: string;
    do {
      const i = rand(1, sa.length - 1);
      s = sa.slice(0, i) + String(rand(0, 9)) + sa.slice(i + 1);
    } while (s === sa);
    b = Number(s);
  }
  const sign = signOf(a, b);
  let why = `${comma(a)} and ${comma(b)} are the same number.`;
  if (a !== b) {
    const [x, y] = [String(a), String(b)];
    if (x.length !== y.length) why = `${comma(Math.max(a, b))} has more digits, so it's bigger.`;
    else {
      const i = [...x].findIndex((c, k) => c !== y[k]);
      why = `They match until the ${PLACE[x.length - 1 - i]} place: ${x[i]} ${signOf(Number(x[i]), Number(y[i]))} ${y[i]}.`;
    }
  }
  return fixedQ(
    {
      key: `cb-${a}-${b}`,
      prompt: pick(["Which sign goes in the box?", "Compare the numbers."]),
      speech: `Compare ${comma(a)} and ${comma(b)}. Less than, equal to, or greater than?`,
      equation: [a, "?", b],
      hint: "Line up the places. Compare digits from the left until two are different.",
      explain: `${why} So ${comma(a)} ${sign} ${comma(b)}.`,
    },
    SIGNS,
    sign,
  );
}

export function roundAny(): Question {
  const place = pick([10, 100, 1000, 10000, 100000]);
  let n: number;
  do n = rand(Math.max(1000, place), 999999);
  while (n % place === 0);
  const lower = Math.floor(n / place) * place;
  const upper = lower + place;
  const answer = n - lower >= place / 2 ? upper : lower;
  const other = answer === lower ? upper : lower;
  const r = (p: number) => Math.round(n / p) * p;
  const name = PLACE_ONE[place];
  return numQ(
    {
      key: `ra-${n}-${place}`,
      prompt: `Round ${comma(n)} to the nearest ${name}.`,
      visual: { kind: "numberline", min: lower, max: upper, step: place / 10, labelStep: place / 2, from: n, to: answer },
      hint: `Look at the digit just right of the ${PLACE[Math.log10(place)]} place. 5 or more rounds up.`,
      explain:
        n - lower === place / 2
          ? `${comma(n)} is exactly halfway, so it rounds up to ${comma(upper)}.`
          : `${comma(n)} is between ${comma(lower)} and ${comma(upper)}. It's closer to ${comma(answer)}.`,
    },
    answer,
    [other, answer + place, answer - place, r(place * 10), r(place / 10)],
    0,
    1000000,
  );
}

export function addBig(): Question {
  const digitsA = rand(4, 6);
  const a = rand(10 ** (digitsA - 1), Math.min(980000, 10 ** digitsA - 1));
  const b = rand(1000, Math.min(999999 - a, 10 ** rand(4, 6) - 1));
  const sum = a + b;
  const story = rand(0, 2);
  return typeQ(
    {
      key: `ab-${a}-${b}`,
      prompt:
        story === 0
          ? `${comma(a)} fans came Saturday, ${comma(b)} Sunday. Total?`
          : pick(["Add the big numbers!", "What's the sum?"]),
      speech: story === 0 ? `A stadium had ${comma(a)} fans on Saturday and ${comma(b)} on Sunday. How many fans in all?` : `${comma(a)} plus ${comma(b)}?`,
      equation: [a, "+", b, "=", "?"],
      hint: "Line up the places. Add the ones first and carry when a place makes 10 or more.",
      explain: `${comma(a)} + ${comma(b)} = ${comma(sum)}.`,
    },
    sum,
  );
}

export function subBig(): Question {
  const digitsA = rand(4, 6);
  let a = rand(10 ** (digitsA - 1) + 1000, 10 ** digitsA - 1);
  if (Math.random() < 0.3) a = Math.floor(a / 10 ** (digitsA - 2)) * 10 ** (digitsA - 2) + rand(0, 9) * (Math.random() < 0.5 ? 1 : 0);
  const b = rand(100, a - 100);
  return typeQ(
    {
      key: `sb-${a}-${b}`,
      prompt: pick(["Subtract! What's the difference?", "Find the difference.", `A farm had ${comma(a)} seeds. It planted ${comma(b)}. Left?`]),
      speech: `${comma(a)} minus ${comma(b)}?`,
      equation: [a, "−", b, "=", "?"],
      hint: "Line up the places and start with the ones. If a top digit is too small, trade 1 from the next place.",
      explain: `${comma(a)} − ${comma(b)} = ${comma(a - b)}. Check: ${comma(a - b)} + ${comma(b)} = ${comma(a)}.`,
    },
    a - b,
  );
}

/* ==================================================== W8 Multiply big (G4) */

const STUFF = ["shells", "stickers", "marbles", "cards", "stamps", "beads"];

export function timesAsMany(): Question {
  const [A, B] = twoNames();
  const stuff = pick(STUFF);
  const small = rand(2, 12);
  const times = rand(2, 9);
  const big = small * times;
  const form = rand(0, 2);
  if (form === 0)
    return numQ(
      {
        key: `tam-read-${small}-${times}`,
        prompt: `${big} = ${times} × ${small}. ${big} is how many times as many as ${small}?`,
        speech: `${big} equals ${times} times ${small}. So ${big} is how many times as many as ${small}?`,
        equation: [big, "=", "?", "×", small],
        visual: { kind: "tape", rows: [{ label: String(small), parts: 1 }, { label: String(big), parts: times }], partValue: small },
        hint: `How many groups of ${small} make ${big}?`,
        explain: `${big} is ${times} groups of ${small}, so it's ${times} times as many.`,
      },
      times,
      [small, times + 1, times - 1, big - small],
      1,
      20,
    );
  if (form === 1)
    return numQ(
      {
        key: `tam-big-${small}-${times}`,
        prompt: `${A} has ${small} ${stuff}. ${B} has ${times} times as many. How many?`,
        speech: `${A} has ${small} ${stuff}. ${B} has ${times} times as many. How many ${stuff} does ${B} have?`,
        equation: [times, "×", small, "=", "?"],
        visual: { kind: "tape", rows: [{ label: A, parts: 1 }, { label: B, parts: times }], partValue: small },
        hint: `${B}'s bar is ${times} of ${A}'s bars put together.`,
        explain: `${times} × ${small} = ${big}. ${B} has ${big} ${stuff}.`,
      },
      big,
      [small + times, big + small, big - small],
      0,
      120,
    );
  return textQ(
    {
      key: `tam-say-${small}-${times}`,
      prompt: `Which sentence matches ${times} × ${small} = ${big}?`,
      speech: `Which sentence matches ${times} times ${small} equals ${big}?`,
      equation: [times, "×", small, "=", big],
      hint: "A times sentence says one amount is so many times another.",
      explain: `${big} is ${times} times as many as ${small}.`,
    },
    `${big} is ${times} times as many as ${small}`,
    shuffle([`${big} is ${times} more than ${small}`, `${small} is ${times} times as many as ${big}`, `${big} is ${small} more than ${times}`]),
  );
}

export function compareStories(): Question {
  const [A, B] = twoNames();
  const stuff = pick(STUFF);
  const small = rand(2, 12);
  const times = rand(2, 9);
  const big = small * times;
  const form = rand(0, 3);
  if (form === 0)
    return typeQ(
      {
        key: `cs-big-${small}-${times}`,
        prompt: `A pen costs $${small}. A book costs ${times} times as much. Book cost?`,
        speech: `A pen costs ${small} dollars. A book costs ${times} times as much. How much is the book?`,
        equation: [times, "×", small, "=", "?"],
        prefix: "$",
        visual: { kind: "tape", rows: [{ label: "Pen", parts: 1 }, { label: "Book", parts: times }], partValue: small },
        hint: `"Times as much" means multiply.`,
        explain: `${times} × $${small} = $${big}.`,
      },
      big,
    );
  if (form === 1)
    return numQ(
      {
        key: `cs-small-${small}-${times}`,
        prompt: `${B} has ${big} ${stuff}, ${times} times as many as ${A}. ${A} has?`,
        speech: `${B} has ${big} ${stuff}. That's ${times} times as many as ${A}. How many does ${A} have?`,
        equation: [times, "×", "?", "=", big],
        visual: { kind: "tape", rows: [{ label: A, parts: 1 }, { label: B, parts: times }], partValue: "?" },
        hint: `${B}'s bar is ${times} equal parts. Each part is ${A}'s amount.`,
        explain: `${big} ÷ ${times} = ${small}. ${A} has ${small} ${stuff}.`,
      },
      small,
      [big - times, big * times, small + 1, small - 1],
      1,
      120,
    );
  if (form === 2)
    return numQ(
      {
        key: `cs-times-${small}-${times}`,
        prompt: `${B} read ${big} pages. ${A} read ${small}. How many times as many?`,
        speech: `${B} read ${big} pages. ${A} read ${small} pages. ${B} read how many times as many pages as ${A}?`,
        equation: [small, "×", "?", "=", big],
        hint: `How many ${small}s make ${big}?`,
        explain: `${big} ÷ ${small} = ${times}, so ${B} read ${times} times as many.`,
      },
      times,
      [big - small, times + 1, times - 1],
      1,
      120,
    );
  const more = Math.random() < 0.5;
  return numQ(
    {
      key: `cs-${more ? "more" : "mult"}-${small}-${times}`,
      prompt: more
        ? `${A} has ${small} ${stuff}. ${B} has ${times} more. How many for ${B}?`
        : `${A} has ${small} ${stuff}. ${B} has ${times} times as many. ${B} has?`,
      speech: more
        ? `${A} has ${small} ${stuff}. ${B} has ${times} more than ${A}. How many does ${B} have?`
        : `${A} has ${small} ${stuff}. ${B} has ${times} times as many as ${A}. How many does ${B} have?`,
      hint: more ? `"More than" means add.` : `"Times as many" means multiply.`,
      explain: more ? `${small} + ${times} = ${small + times}.` : `${times} × ${small} = ${big}.`,
    },
    more ? small + times : big,
    [more ? big : small + times, (more ? small + times : big) + 1, (more ? small + times : big) - 1],
    0,
    120,
  );
}

export function timesTensHundreds(): Question {
  const a = rand(2, 9);
  const b = rand(2, 9);
  const form = rand(0, 2);
  const [x, y] = form === 0 ? [a, b * 100] : form === 1 ? [a * 10, b * 10] : [a, b * 1000];
  const zeros = (String(x).match(/0/g)?.length ?? 0) + (String(y).match(/0/g)?.length ?? 0);
  return typeQ(
    {
      key: `tth-${form}-${a}-${b}`,
      prompt: pick(["Multiply with zeros!", "Use a basic fact. What's the product?"]),
      speech: `${comma(x)} times ${comma(y)}?`,
      equation: [x, "×", y, "=", "?"],
      hint: `Do ${a} × ${b} first. Then think about the tens or hundreds.`,
      explain: `${a} × ${b} = ${a * b}, and there ${zeros === 1 ? "is" : "are"} ${zeros} more zero${zeros === 1 ? "" : "s"} from the factors: ${comma(x * y)}.`,
    },
    x * y,
  );
}

export function multAreaModel(): Question {
  const t = rand(1, 9);
  const o = rand(1, 9);
  const by = rand(2, 9);
  const n = 10 * t + o;
  return typeQ(
    {
      key: `mam-${n}-${by}`,
      prompt: pick(["Use the area model to multiply.", "Split it up and multiply!"]),
      speech: `${n} times ${by}. Split ${n} into ${10 * t} and ${o}.`,
      equation: [n, "×", by, "=", "?"],
      visual: { kind: "area", tens: 10 * t, ones: o, by },
      hint: `Find ${10 * t} × ${by} and ${o} × ${by}, then add the two parts.`,
      explain: `${10 * t} × ${by} = ${10 * t * by} and ${o} × ${by} = ${o * by}. ${10 * t * by} + ${o * by} = ${n * by}.`,
    },
    n * by,
  );
}

export function mult4x1(): Question {
  const n = rand(0, 1) ? rand(101, 999) : rand(1001, 9999);
  const by = rand(2, 9);
  const s = String(n);
  const parts = [...s].map((c, i) => Number(c) * 10 ** (s.length - 1 - i)).filter((v) => v > 0);
  return typeQ(
    {
      key: `m41-${n}-${by}`,
      prompt: pick(["Multiply!", "Break apart the big number and multiply.", `${by} boxes of ${n} pins. How many pins?`]),
      speech: `${comma(n)} times ${by}?`,
      equation: [n, "×", by, "=", "?"],
      hint: `Split ${comma(n)} by place: ${parts.map(comma).join(" + ")}. Multiply each part by ${by}.`,
      explain: `${parts.map((p) => `${comma(p)} × ${by} = ${comma(p * by)}`).join(", ")}. Add: ${comma(n * by)}.`,
    },
    n * by,
  );
}

export function mult2x2(): Question {
  const a = rand(11, 99);
  const b = rand(11, 99);
  const T = Math.floor(a / 10) * 10;
  const o = a % 10;
  const bt = Math.floor(b / 10) * 10;
  const bo = b % 10;
  const four = [
    [T, bt],
    [T, bo],
    [o, bt],
    [o, bo],
  ].filter(([x, y]) => x > 0 && y > 0);
  return typeQ(
    {
      key: `m22-${a}-${b}`,
      prompt: pick(["Multiply two 2-digit numbers.", "Use the area model!"]),
      speech: `${a} times ${b}?`,
      equation: [a, "×", b, "=", "?"],
      visual: bo ? { kind: "area", tens: T, ones: o, by: b, split: [bt, bo] } : { kind: "area", tens: T, ones: o, by: b },
      hint: "Split both numbers into tens and ones. Multiply each part by each part, then add all the boxes.",
      explain: `${four.map(([x, y]) => `${x} × ${y} = ${comma(x * y)}`).join(", ")}. Add them: ${comma(a * b)}.`,
    },
    a * b,
  );
}

export function multiStep4(): Question {
  const form = rand(0, 4);
  if (form === 0) {
    const b = rand(3, 9);
    const p = rand(24, 150);
    const g = rand(Math.floor((b * p) / 4), b * p - 10);
    return typeQ(
      {
        key: `ms-left-${b}-${p}-${g}`,
        prompt: `${b} boxes of ${p} pencils. ${comma(g)} are given out. Left?`,
        speech: `A school buys ${b} boxes of ${p} pencils. It gives out ${g} pencils. How many are left?`,
        equation: ["(", b, "×", p, ")", "−", g, "=", "?"],
        hint: "First find how many pencils in all. Then take away the ones given out.",
        explain: `${b} × ${p} = ${comma(b * p)}. ${comma(b * p)} − ${g} = ${comma(b * p - g)}.`,
      },
      b * p - g,
    );
  }
  if (form === 1) {
    const a = rand(2, 6);
    const A = rand(10, 25);
    const k = rand(2, 8);
    const K = rand(5, 15);
    return typeQ(
      {
        key: `ms-tickets-${a}-${A}-${k}-${K}`,
        prompt: `Adult tickets are $${A}, kid tickets $${K}. ${a} adults, ${k} kids?`,
        speech: `Adult tickets cost ${A} dollars and kid tickets cost ${K} dollars. How much for ${a} adults and ${k} kids?`,
        equation: [a, "×", A, "+", k, "×", K, "=", "?"],
        prefix: "$",
        hint: "Find the cost for the adults and for the kids. Then add.",
        explain: `${a} × $${A} = $${a * A}. ${k} × $${K} = $${k * K}. $${a * A} + $${k * K} = $${a * A + k * K}.`,
      },
      a * A + k * K,
    );
  }
  if (form === 2) {
    const n = rand(3, 8);
    const s = rand(30, 55);
    const r = rand((n - 1) * s + 1, n * s - 1);
    return typeQ(
      {
        key: `ms-bus-${n}-${s}-${r}`,
        prompt: `${n} buses hold ${s} kids each. ${r} kids ride. Empty seats?`,
        speech: `${n} buses each hold ${s} kids. ${r} kids are riding. How many seats are empty?`,
        equation: [n, "×", s, "−", r, "=", "?"],
        hint: "First find how many seats in all. Then take away the kids.",
        explain: `${n} × ${s} = ${n * s} seats. ${n * s} − ${r} = ${n * s - r} empty seats.`,
      },
      n * s - r,
    );
  }
  if (form === 3) {
    const r1 = rand(3, 9);
    const p1 = rand(12, 40);
    const r2 = rand(2, 6);
    const p2 = rand(12, 40);
    return typeQ(
      {
        key: `ms-farm-${r1}-${p1}-${r2}-${p2}`,
        prompt: `A farm has ${r1} rows of ${p1} plants and ${r2} rows of ${p2}. Total?`,
        speech: `A farm has ${r1} rows of ${p1} corn plants and ${r2} rows of ${p2} bean plants. How many plants in all?`,
        equation: [r1, "×", p1, "+", r2, "×", p2, "=", "?"],
        hint: "Multiply for each kind of plant, then add.",
        explain: `${r1} × ${p1} = ${r1 * p1}. ${r2} × ${p2} = ${r2 * p2}. ${r1 * p1} + ${r2 * p2} = ${r1 * p1 + r2 * p2}.`,
      },
      r1 * p1 + r2 * p2,
    );
  }
  const c = rand(5, 30);
  const k = rand(1, c - 1);
  return typeQ(
    {
      key: `ms-eggs-${c}-${k}`,
      prompt: `${12 * c} eggs go in cartons of 12. ${k} cartons are sold. Left?`,
      speech: `${12 * c} eggs are packed into cartons of 12. Then ${k} cartons are sold. How many cartons are left?`,
      equation: [12 * c, "÷", 12, "−", k, "=", "?"],
      hint: "First find how many cartons. Then take away the ones sold.",
      explain: `${12 * c} ÷ 12 = ${c} cartons. ${c} − ${k} = ${c - k}.`,
    },
    c - k,
  );
}

/* ================================================ W9 Divide & factors (G4) */

export function divTensHundreds(): Question {
  const d = rand(2, 9);
  const b = rand(1, 9);
  const k = rand(1, 3);
  const q = b * 10 ** k;
  const total = q * d;
  if (total > 9999) return divTensHundreds();
  return typeQ(
    {
      key: `dth-${d}-${b}-${k}`,
      prompt: pick(["Divide with a basic fact!", "Use a fact you know to divide."]),
      speech: `${comma(total)} divided by ${d}?`,
      equation: [total, "÷", d, "=", "?"],
      hint: `Think ${b * d} ÷ ${d} = ${b}. How many ${PLACE[k]} is ${comma(total)}?`,
      explain: `${comma(total)} is ${b * d} ${PLACE[k]}. ${b * d} ${PLACE[k]} ÷ ${d} = ${b} ${b === 1 ? PLACE[k].slice(0, -1) : PLACE[k]} = ${comma(q)}.`,
    },
    q,
  );
}

export function div1digit(): Question {
  const d = rand(2, 9);
  const q = rand(12, Math.floor(9999 / d));
  const n = q * d;
  return typeQ(
    {
      key: `d1-${n}-${d}`,
      prompt: pick(["Divide!", "Share it out. What's the quotient?", `${comma(n)} beads into ${d} equal bags. Each?`]),
      speech: `${comma(n)} divided by ${d}?`,
      equation: [n, "÷", d, "=", "?"],
      hint: `Share the biggest place first, then the next. Check with ${d} × your answer.`,
      explain: `${d} × ${comma(q)} = ${comma(n)}, so ${comma(n)} ÷ ${d} = ${comma(q)}.`,
    },
    q,
  );
}

export function divRemainder(): Question {
  const d = rand(2, 9);
  const q = rand(2, Math.random() < 0.5 ? 9 : 99);
  const r = rand(1, d - 1);
  const n = q * d + r;
  if (Math.random() < 0.5) {
    const thing = nextThing();
    const small = n <= 50;
    return textQ(
      {
        key: `dr-full-${n}-${d}`,
        prompt: small ? `Share ${n} ${thing.many} on ${d} plates. Each gets? Left over?` : pick(["Divide. Is there a remainder?", "Find the quotient and remainder."]),
        speech: small
          ? `Share ${n} ${thing.many} fairly onto ${d} plates. How many on each plate, and how many are left over?`
          : `${n} divided by ${d}. What's the answer and the remainder?`,
        equation: [n, "÷", d, "=", "?"],
        visual: small ? { kind: "share", thing, groups: d, each: q, left: r } : NONE,
        hint: `Find the biggest times-${d} fact that fits in ${n}. What's left over must be less than ${d}.`,
        explain: `${d} × ${q} = ${q * d}, and ${n} − ${q * d} = ${r}. So ${n} ÷ ${d} = ${q} R ${r}: ${q} each, ${r} left over.`,
      },
      `${q} R ${r}`,
      shuffle([`${q + 1} R ${r}`, `${q - 1} R ${r + d}`, `${q} R ${r === d - 1 ? r - 1 : r + 1}`, `${q}`].filter((t) => !t.includes(" R 0"))),
    );
  }
  return numQ(
    {
      key: `dr-rem-${n}-${d}`,
      prompt: "What is the remainder?",
      speech: `${n} divided by ${d} is ${q}, remainder what?`,
      equation: [n, "÷", d, "=", q, "R", "?"],
      hint: `${d} × ${q} = ${d * q}. How much more is ${n}?`,
      explain: `${n} − ${d * q} = ${r}. The remainder is ${r}.`,
    },
    r,
    [r + 1, r - 1, d - r, d],
    0,
    9,
  );
}

export function interpretRemainder(): Question {
  const d = rand(3, 9);
  const q = rand(3, 12);
  const r = rand(1, d - 1);
  const n = q * d + r;
  const form = rand(0, 6);
  const div = `${n} ÷ ${d} = ${q} R ${r}.`;
  const forms: { prompt: string; answer: number; why: string }[] = [
    { prompt: `${n} kids go on a trip. A van holds ${d}. How many vans?`, answer: q + 1, why: `The ${r} extra kids need a van too, so ${q + 1} vans.` },
    { prompt: `${n} cookies. ${d} fit in a box. How many full boxes?`, answer: q, why: `The ${r} left over can't fill a box, so ${q} full boxes.` },
    { prompt: `${n} stickers shared equally by ${d} kids. How many left over?`, answer: r, why: `${r} stickers are left over.` },
    { prompt: `${n} books. A shelf holds ${d}. Shelves needed for all?`, answer: q + 1, why: `The last ${r} books need one more shelf: ${q + 1}.` },
    { prompt: `You have $${n}. Toys cost $${d} each. How many can you buy?`, answer: q, why: `You can't buy part of a toy, so ${q} toys.` },
    { prompt: `${n} eggs go in cartons of ${d}. How many eggs are left over?`, answer: r, why: `${r} eggs don't fill a carton.` },
    { prompt: `${n} cards shared equally by ${d} kids. How many each?`, answer: q, why: `Each kid gets ${q}. The ${r} left over can't be shared fairly.` },
  ];
  const f = forms[form];
  return numQ(
    {
      key: `ir-${form}-${n}-${d}`,
      prompt: f.prompt,
      visual: form === 6 && n <= 50 ? { kind: "share", thing: { emoji: "🃏", one: "card", many: "cards" }, groups: d, each: q, left: r } : NONE,
      hint: "Divide first. Then ask: what does the remainder mean here?",
      explain: `${div} ${f.why}`,
    },
    f.answer,
    [q, q + 1, r, q - 1],
    0,
    q + 6,
  );
}

const FACTOR_NUMS = [12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 64, 70, 72, 80, 84, 90, 96, 100];
const factorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f === 0);

export function factorPairs(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const a = rand(2, 9);
    const b = rand(2, 12);
    return numQ(
      {
        key: `fp-miss-${a}-${b}`,
        prompt: `${a} and what make a factor pair of ${a * b}?`,
        speech: `${a} times what equals ${a * b}?`,
        equation: [a, "×", "?", "=", a * b],
        hint: `Count by ${a}s to ${a * b}. How many jumps?`,
        explain: `${a} × ${b} = ${a * b}, so ${a} and ${b} are a factor pair of ${a * b}.`,
      },
      b,
      [b + 1, b - 1, a, a * b - a],
      1,
      100,
    );
  }
  if (form === 1) {
    const N = pick(FACTOR_NUMS);
    const fs = factorsOf(N).filter((f) => f > 1 && f <= 12 && f < N);
    const f = pick(fs);
    const non = shuffle(Array.from({ length: 14 }, (_, i) => i + 2).filter((x) => N % x !== 0));
    return listQ(
      {
        key: `fp-which-${N}-${f}`,
        prompt: `Which number is a factor of ${N}?`,
        hint: `A factor divides ${N} with nothing left over. Try each one.`,
        explain: `${N} ÷ ${f} = ${N / f}, so ${f} is a factor. The others leave a remainder.`,
      },
      f,
      non,
    );
  }
  if (form === 2) {
    const N = pick([6, 8, 10, 12, 14, 15, 16, 18, 20, 21, 24, 28, 30, 36]);
    const fs = factorsOf(N);
    const pairs = fs.filter((f) => f * f <= N).map((f) => `${f} × ${N / f}`);
    return numQ(
      {
        key: `fp-count-${N}`,
        prompt: `How many factors does ${N} have?`,
        hint: `List factor pairs: 1 × ${N}, 2 × ?, 3 × ?… Stop when the pairs meet.`,
        explain: `Factor pairs: ${pairs.join(", ")}. That's ${fs.length} factors: ${fs.join(", ")}.`,
      },
      fs.length,
      [fs.length - 1, fs.length + 1, fs.length - 2, pairs.length],
      1,
      12,
    );
  }
  const N = pick(FACTOR_NUMS);
  const a = rand(2, 12);
  const yes = N % a === 0;
  return fixedQ(
    {
      key: `fp-is-${N}-${a}`,
      prompt: `Is ${a} a factor of ${N}?`,
      hint: `Does ${N} split into groups of ${a} with none left over?`,
      explain: yes ? `Yes: ${a} × ${N / a} = ${N}.` : `No: ${N} ÷ ${a} leaves a remainder of ${N % a}.`,
    },
    ["Yes", "No"],
    yes ? "Yes" : "No",
  );
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

export function multiples(): Question {
  const k = rand(3, 9);
  const form = rand(0, 3);
  if (form === 0) {
    const m = k * rand(3, 12);
    const wrong = shuffle([m + 1, m - 1, m + 2, m - 2, m + k - 1, m + k + 1].filter((x) => x % k !== 0 && x > 0));
    return listQ(
      {
        key: `mu-which-${k}-${m}`,
        prompt: `Which number is a multiple of ${k}?`,
        hint: `Multiples of ${k} are what you say counting by ${k}s. Try dividing by ${k}.`,
        explain: `${m} = ${k} × ${m / k}, so it's a multiple of ${k}.`,
      },
      m,
      wrong,
    );
  }
  if (form === 1) {
    const N = k * rand(3, 12) + (Math.random() < 0.5 ? 0 : rand(1, k - 1));
    const yes = N % k === 0;
    return fixedQ(
      {
        key: `mu-is-${k}-${N}`,
        prompt: `Is ${N} a multiple of ${k}?`,
        hint: `Do you say ${N} when you count by ${k}s?`,
        explain: yes ? `Yes: ${k} × ${N / k} = ${N}.` : `No: ${N} ÷ ${k} leaves a remainder of ${N % k}.`,
      },
      ["Yes", "No"],
      yes ? "Yes" : "No",
    );
  }
  if (form === 2) {
    const s = k * rand(1, 8);
    const nums = [s, s + k, s + 2 * k];
    return numQ(
      {
        key: `mu-seq-${k}-${s}`,
        prompt: `Count by ${k}s. What's the next multiple?`,
        speech: `Counting by ${k}s: ${nums.join(", ")}. What comes next?`,
        visual: { kind: "sequence", numbers: nums, next: s + 3 * k },
        needsVisual: true,
        hint: `Add ${k} to the last number.`,
        explain: `${s + 2 * k} + ${k} = ${s + 3 * k}.`,
      },
      s + 3 * k,
      [s + 3 * k + 1, s + 3 * k - 1, s + 4 * k],
      0,
      120,
    );
  }
  const n = rand(3, 12);
  return numQ(
    {
      key: `mu-nth-${k}-${n}`,
      prompt: `What is the ${ORDINAL[n]} multiple of ${k}?`,
      hint: `The multiples of ${k} are ${k}, ${2 * k}, … Count by ${k}s, ${n} times.`,
      explain: `${k} × ${n} = ${k * n}.`,
    },
    k * n,
    [k * (n - 1), k * (n + 1), k + n],
    0,
    150,
  );
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const SNEAKY = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95];

export function primeComposite(): Question {
  if (Math.random() < 0.65) {
    let N: number;
    if (Math.random() < 0.5) N = pick(PRIMES);
    else do N = rand(4, 100);
    while (PRIMES.includes(N));
    const prime = PRIMES.includes(N);
    const f = factorsOf(N).find((x) => x > 1 && x < N) ?? N;
    return fixedQ(
      {
        key: `pc-is-${N}`,
        prompt: `Is ${N} prime or composite?`,
        hint: `Can you make ${N} as a times fact other than 1 × ${N}? Try 2, 3, 5 and 7.`,
        explain: prime ? `${N} has only two factors, 1 and ${N}. It's prime.` : `${N} = ${f} × ${N / f}, so it has more than two factors. It's composite.`,
      },
      ["Prime", "Composite"],
      prime ? "Prime" : "Composite",
    );
  }
  const p = pick(PRIMES.filter((x) => x > 10));
  const others = shuffle(SNEAKY).slice(0, 3);
  return listQ(
    {
      key: `pc-which-${p}-${[...others].sort((a, b) => a - b).join("-")}`,
      prompt: "Which number is prime?",
      hint: "Try dividing each one by 3, 5 and 7. A prime has no factors but 1 and itself.",
      explain: `${p} only has the factors 1 and ${p}. ${others.map((o) => `${o} = ${factorsOf(o)[1]} × ${o / factorsOf(o)[1]}`).join(", ")}.`,
    },
    p,
    others,
  );
}

export function numberRules(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const k = rand(2, 12);
    const s = rand(1, 20);
    const nums = [s, s + k, s + 2 * k];
    return numQ(
      {
        key: `nr-add-${k}-${s}`,
        prompt: `Rule: add ${k}. What comes next?`,
        speech: `The rule is add ${k}. ${nums.join(", ")}. What comes next?`,
        visual: { kind: "sequence", numbers: nums, next: s + 3 * k },
        hint: `Use the rule on the last number.`,
        explain: `${s + 2 * k} + ${k} = ${s + 3 * k}.`,
      },
      s + 3 * k,
      [s + 3 * k + 1, s + 3 * k - 1, s + 4 * k],
      0,
      100,
    );
  }
  if (form === 1) {
    const m = rand(2, 3);
    const s = rand(1, m === 2 ? 6 : 4);
    const nums = [s, s * m, s * m * m];
    return numQ(
      {
        key: `nr-mult-${m}-${s}`,
        prompt: `Rule: multiply by ${m}. What comes next?`,
        speech: `The rule is multiply by ${m}. ${nums.join(", ")}. What comes next?`,
        visual: { kind: "sequence", numbers: nums, next: s * m ** 3 },
        hint: "Use the rule on the last number.",
        explain: `${s * m * m} × ${m} = ${s * m ** 3}.`,
      },
      s * m ** 3,
      [s * m * m + m, s * m ** 3 + s, s * m ** 3 - m],
      0,
      200,
    );
  }
  if (form === 2) {
    const s = rand(1, 20);
    const k = rand(1, 9);
    const nums = [s, s + k, s + 2 * k, s + 3 * k];
    const answer = k % 2 === 1 ? "They take turns" : s % 2 === 1 ? "Always odd" : "Always even";
    return fixedQ(
      {
        key: `nr-eo-${s}-${k}`,
        prompt: `Start at ${s}, add ${k}. Are the numbers odd or even?`,
        speech: `Start at ${s} and keep adding ${k}: ${nums.join(", ")}, and so on. Are the numbers odd or even?`,
        hint: `Adding an even number keeps odd or even the same. Adding an odd number flips it.`,
        explain: `${nums.join(", ")}… ${k % 2 ? `Adding ${k}, an odd number, flips odd and even each time.` : `Adding ${k}, an even number, never changes odd or even.`}`,
      },
      ["Always odd", "Always even", "They take turns"],
      answer,
    );
  }
  const mult = Math.random() < 0.5;
  const k = rand(2, 9);
  const f = (x: number) => (mult ? x * k : x + k);
  const ins = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3);
  return numQ(
    {
      key: `nr-table-${mult ? "x" : "p"}-${k}-${ins.join(".")}`,
      prompt: "Find the rule. What number is missing?",
      visual: { kind: "table", header: ["In", "Out"], rows: [[ins[0], f(ins[0])], [ins[1], f(ins[1])], [ins[2], "?"]] },
      needsVisual: true,
      hint: "What happens to each In number to make its Out number? Is it adding or multiplying?",
      explain: `The rule is ${mult ? `multiply by ${k}` : `add ${k}`}: ${ins[2]} ${mult ? "×" : "+"} ${k} = ${f(ins[2])}.`,
    },
    f(ins[2]),
    [mult ? ins[2] + k : ins[2] * k, f(ins[2]) + 1, f(ins[2]) - 1],
    0,
    110,
  );
}

/* =================================================== W10 Fraction power (G4) */

const G4_DENS = [2, 3, 4, 5, 6, 8, 10, 12];
const notEqual = (n: number, d: number) => (t: string) => {
  const m = /^(\d+)\/(\d+)$/.exec(t);
  return !m || Number(m[1]) * d !== n * Number(m[2]);
};

export function equivFractions4(): Question {
  const [n, d] = lowestFrac([2, 3, 4, 5, 6]);
  const k = rand(2, Math.max(2, Math.floor(12 / d)));
  const form = rand(0, 3);
  if (form === 0)
    return numQ(
      {
        key: `ef4-up-${n}-${d}-${k}`,
        prompt: pick(["Find the equal fraction.", "Fill in the top number."]),
        speech: `${sayFrac(n, d)} equals how many ${denWord(d * k, true)}?`,
        equation: [{ n, d }, "=", { n: "?", d: d * k }],
        visual: { kind: "fractions", bars: [{ parts: d, a: n, label: fracText(n, d) }, { parts: d * k, target: n * k }] },
        hint: `The bottom was multiplied by ${k}. Do the same to the top.`,
        explain: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}, so ${n}/${d} = ${n * k}/${d * k}.`,
      },
      n * k,
      [n + k, n * k + 1, n * k - 1, n],
      0,
      d * k + 2,
    );
  if (form === 1)
    return numQ(
      {
        key: `ef4-down-${n}-${d}-${k}`,
        prompt: "Simplify! What's the bottom number?",
        speech: `${sayFrac(n * k, d * k)} equals ${n} over what?`,
        equation: [{ n: n * k, d: d * k }, "=", { n, d: "?" }],
        visual: { kind: "fractions", bars: [{ parts: d * k, a: n * k }, { parts: d, a: n }] },
        hint: `The top was divided by ${k}. Do the same to the bottom.`,
        explain: `${n * k} ÷ ${k} = ${n} and ${d * k} ÷ ${k} = ${d}, so ${n * k}/${d * k} = ${n}/${d}.`,
      },
      d,
      [d * k - k, d + 1, d - 1, d * k],
      1,
      30,
    );
  if (form === 2) {
    const [n2, d2] = lowestFrac([2, 4, 5, 10]);
    const k2 = 100 / d2;
    return numQ(
      {
        key: `ef4-100-${n2}-${d2}`,
        prompt: `How many hundredths equal ${n2}/${d2}?`,
        speech: `${sayFrac(n2, d2)} equals how many hundredths?`,
        equation: [{ n: n2, d: d2 }, "=", { n: "?", d: 100 }],
        visual: { kind: "hundredgrid", shaded: n2 * k2 },
        hint: `What times ${d2} makes 100? Multiply the top by that number too.`,
        explain: `${n2} × ${k2} = ${n2 * k2}, so ${n2}/${d2} = ${n2 * k2}/100.`,
      },
      n2 * k2,
      [n2 * 10, n2 + k2, n2 * k2 + 10, n2 * k2 - 5],
      0,
      100,
    );
  }
  return textQ(
    {
      key: `ef4-pick-${n}-${d}-${k}`,
      prompt: `Which fraction is equal to ${n}/${d}?`,
      speech: `Which fraction is the same amount as ${sayFrac(n, d)}?`,
      visual: { kind: "fractions", bars: [{ parts: d, a: n, label: fracText(n, d) }] },
      hint: "Multiply the top and the bottom by the same number.",
      explain: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}, so ${n}/${d} = ${n * k}/${d * k}.`,
    },
    fracText(n * k, d * k),
    shuffle([fracText(n + k, d + k), fracText(n * k, d + k), fracText(n, d * k), fracText(n * k + 1, d * k)].filter(notEqual(n, d))),
  );
}

export function benchmarkHalf(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const d = pick([3, 4, 5, 6, 8, 10, 12]);
    const n = rand(1, d - 1);
    const where = 2 * n < d ? "Less than 1/2" : 2 * n > d ? "More than 1/2" : "Equal to 1/2";
    return fixedQ(
      {
        key: `bh-half-${n}-${d}`,
        prompt: `Is ${n}/${d} more or less than 1/2?`,
        speech: `Is ${sayFrac(n, d)} more than, less than, or equal to one half?`,
        visual: { kind: "fractions", bars: [{ parts: d, a: n, label: fracText(n, d) }, { parts: 2, a: 1, label: "1/2" }] },
        hint: `Half of ${d} is ${d / 2}. Is the top number more or less than that?`,
        explain: `Half of ${d} ${denWord(d, true)} is ${d / 2}. ${n} is ${2 * n < d ? "less" : 2 * n > d ? "more" : "exactly that"}, so ${n}/${d} is ${where.toLowerCase()}.`,
      },
      ["Less than 1/2", "Equal to 1/2", "More than 1/2"],
      where,
    );
  }
  if (form === 1) {
    let a: [number, number];
    let b: [number, number];
    do {
      a = [rand(1, 11), pick(G4_DENS)];
      b = [rand(1, 11), pick(G4_DENS)];
    } while (a[0] >= a[1] || b[0] >= b[1] || 2 * a[0] === a[1] || 2 * b[0] === b[1] || 2 * a[0] < a[1] === 2 * b[0] < b[1]);
    const sign = signOf(a[0] * b[1], b[0] * a[1]);
    return fixedQ(
      {
        key: `bh-cmp-${a.join("-")}-${b.join("-")}`,
        prompt: "Compare using 1/2. Which sign fits?",
        speech: `Compare ${sayFrac(a[0], a[1])} and ${sayFrac(b[0], b[1])}. Think about one half.`,
        equation: [{ n: a[0], d: a[1] }, "?", { n: b[0], d: b[1] }],
        visual: { kind: "fractions", bars: [{ parts: a[1], a: a[0], label: fracText(a[0], a[1]) }, { parts: b[1], a: b[0], label: fracText(b[0], b[1]) }] },
        hint: "Is each fraction more or less than 1/2? One is on each side!",
        explain: `${fracText(...(2 * a[0] < a[1] ? a : b))} is less than 1/2 and ${fracText(...(2 * a[0] < a[1] ? b : a))} is more, so ${a[0]}/${a[1]} ${sign} ${b[0]}/${b[1]}.`,
      },
      SIGNS,
      sign,
    );
  }
  const d = pick([3, 4, 5, 6, 8]);
  const n = rand(1, 2 * d - 1);
  const where = n < d ? "Less than 1" : n > d ? "More than 1" : "Equal to 1";
  return fixedQ(
    {
      key: `bh-one-${n}-${d}`,
      prompt: `Is ${n}/${d} more or less than 1 whole?`,
      speech: `Is ${sayFrac(n, d)} more than, less than, or equal to one whole?`,
      visual: barsOrNone(fillBars(n, d)),
      hint: `${d}/${d} is 1 whole. Compare the top number to ${d}.`,
      explain: `1 whole is ${d}/${d}. ${n}/${d} is ${where.toLowerCase()}.`,
    },
    ["Less than 1", "Equal to 1", "More than 1"],
    where,
  );
}

export function compareFractions4(): Question {
  let n1: number;
  let d1: number;
  let n2: number;
  let d2: number;
  if (Math.random() < 0.2) {
    const [n, d] = lowestFrac([2, 3, 4, 5, 6]);
    const [k1, k2] = shuffle(Array.from({ length: Math.floor(12 / d) }, (_, i) => i + 1)).slice(0, 2);
    [n1, d1, n2, d2] = [n * k1, d * k1, n * k2, d * k2];
  } else {
    do {
      [d1, d2] = shuffle(G4_DENS).slice(0, 2);
      n1 = rand(1, d1 - 1);
      n2 = rand(1, d2 - 1);
    } while (n1 * d2 === n2 * d1);
  }
  const L = lcm(d1, d2);
  const sign = signOf(n1 * d2, n2 * d1);
  return fixedQ(
    {
      key: `cf4-${n1}-${d1}-${n2}-${d2}`,
      prompt: pick(["Which sign goes in the box?", "Compare the fractions."]),
      speech: `Compare ${sayFrac(n1, d1)} and ${sayFrac(n2, d2)}.`,
      equation: [{ n: n1, d: d1 }, "?", { n: n2, d: d2 }],
      visual: { kind: "fractions", bars: [{ parts: d1, a: n1, label: fracText(n1, d1) }, { parts: d2, a: n2, label: fracText(n2, d2) }] },
      hint: "Make the bottom numbers the same, or compare each one to 1/2.",
      explain: `${n1}/${d1} = ${(n1 * L) / d1}/${L} and ${n2}/${d2} = ${(n2 * L) / d2}/${L}. So ${n1}/${d1} ${sign} ${n2}/${d2}.`,
    },
    SIGNS,
    sign,
  );
}

export function addSubFractions(): Question {
  const d = pick([3, 4, 5, 6, 8, 10, 12]);
  if (Math.random() < 0.5) {
    const n1 = rand(1, d - 1);
    const n2 = rand(1, d - n1);
    return numQ(
      {
        key: `asf-add-${n1}-${n2}-${d}`,
        prompt: pick(["Add the fractions.", "Join the parts! How many?"]),
        speech: `${sayFrac(n1, d)} plus ${sayFrac(n2, d)} equals how many ${denWord(d, true)}?`,
        equation: [{ n: n1, d }, "+", { n: n2, d }, "=", { n: "?", d }],
        visual: { kind: "fractions", bars: [{ parts: d, a: n1, b: n2 }] },
        hint: `The pieces are all ${denWord(d, true)}. Count how many pieces in all. The bottom stays ${d}.`,
        explain: `${sayFrac(n1, d)} + ${sayFrac(n2, d)} = ${sayFrac(n1 + n2, d)}: ${n1 + n2}/${d}.`,
      },
      n1 + n2,
      [n1 + n2 + 1, n1 + n2 - 1, n1 * n2, d],
      0,
      d + 2,
    );
  }
  const n1 = rand(2, d);
  const n2 = rand(1, n1 - 1);
  return numQ(
    {
      key: `asf-sub-${n1}-${n2}-${d}`,
      prompt: pick(["Subtract the fractions.", "Take away the parts!"]),
      speech: `${sayFrac(n1, d)} minus ${sayFrac(n2, d)} equals how many ${denWord(d, true)}?`,
      equation: [{ n: n1, d }, "−", { n: n2, d }, "=", { n: "?", d }],
      visual: { kind: "fractions", bars: [{ parts: d, a: n1 }] },
      hint: `Same size pieces. Take ${n2} away from ${n1}. The bottom stays ${d}.`,
      explain: `${sayFrac(n1, d)} − ${sayFrac(n2, d)} = ${sayFrac(n1 - n2, d)}: ${n1 - n2}/${d}.`,
    },
    n1 - n2,
    [n1 - n2 + 1, n1 - n2 - 1, n1 + n2],
    0,
    d + 2,
  );
}

export function decomposeFractions(): Question {
  const d = pick([3, 4, 5, 6, 8, 10]);
  const form = rand(0, 2);
  if (form === 0) {
    const n = rand(2, d);
    const a = rand(1, n - 1);
    return numQ(
      {
        key: `dc-two-${n}-${a}-${d}`,
        prompt: "Break the fraction into two parts. What's missing?",
        speech: `${sayFrac(n, d)} equals ${sayFrac(a, d)} plus how many ${denWord(d, true)}?`,
        equation: [{ n, d }, "=", { n: a, d }, "+", { n: "?", d }],
        visual: { kind: "fractions", bars: [{ parts: d, a, target: n - a }] },
        hint: `How many more ${denWord(d, true)} do you need to get from ${a} to ${n}?`,
        explain: `${a}/${d} + ${n - a}/${d} = ${n}/${d}.`,
      },
      n - a,
      [n, a, n - a + 1],
      0,
      d,
    );
  }
  if (form === 1) {
    const n = rand(3, d);
    return numQ(
      {
        key: `dc-units-${n}-${d}`,
        prompt: "Split into unit fractions. What's missing?",
        speech: `${sayFrac(n, d)} equals 1 ${denWord(d, false)} plus 1 ${denWord(d, false)} plus how many ${denWord(d, true)}?`,
        equation: [{ n, d }, "=", { n: 1, d }, "+", { n: 1, d }, "+", { n: "?", d }],
        visual: { kind: "fractions", bars: [{ parts: d, a: 2, target: n - 2 }] },
        hint: `Two ${denWord(d, true)} are done. How many more to make ${n}?`,
        explain: `1/${d} + 1/${d} + ${n - 2}/${d} = ${n}/${d}.`,
      },
      n - 2,
      [n, n - 1, 2],
      0,
      d,
    );
  }
  const w = rand(1, 2);
  const n = rand(1, d - 1);
  const eq: Token[] = w === 1 ? [{ w, n, d }, "=", 1, "+", { n: "?", d }] : [{ w, n, d }, "=", 1, "+", 1, "+", { n: "?", d }];
  return numQ(
    {
      key: `dc-mixed-${w}-${n}-${d}`,
      prompt: "Break the mixed number apart. What's missing?",
      speech: `${sayMixed(w, n, d)} equals ${w === 1 ? "1" : "1 plus 1"} plus how many ${denWord(d, true)}?`,
      equation: eq,
      visual: { kind: "fractions", bars: [...Array.from({ length: w }, () => ({ parts: d, a: d })), { parts: d, target: n }] },
      hint: "A mixed number is wholes plus a fraction. The wholes are already there.",
      explain: `${mixedText(w, n, d)} = ${w === 1 ? "1" : "1 + 1"} + ${n}/${d}.`,
    },
    n,
    [d, w * d + n, n + 1],
    0,
    3 * d,
  );
}

export function mixedNumbers(): Question {
  const d = pick([2, 3, 4, 5, 6, 8]);
  const w = rand(1, 4);
  const n = rand(1, d - 1);
  const imp = w * d + n;
  const form = rand(0, 2);
  const wholes = Array.from({ length: w }, () => ({ parts: d, a: d }));
  if (form === 0)
    return numQ(
      {
        key: `mn-num-${w}-${n}-${d}`,
        prompt: `Write ${imp}/${d} as a mixed number. What's the top?`,
        speech: `${sayFrac(imp, d)} equals ${w} and how many ${denWord(d, true)}?`,
        equation: [{ n: imp, d }, "=", { w, n: "?", d }],
        visual: w <= 3 ? { kind: "fractions", bars: [...wholes, { parts: d, target: n }] } : NONE,
        hint: `Each whole is ${d}/${d}. Take out ${w} wholes. What's left?`,
        explain: `${w} wholes use ${w * d} ${denWord(d, true)}. ${imp} − ${w * d} = ${n}, so ${imp}/${d} = ${mixedText(w, n, d)}.`,
      },
      n,
      [imp - d, n + 1, w, d - n],
      0,
      imp,
    );
  if (form === 1)
    return numQ(
      {
        key: `mn-whole-${w}-${n}-${d}`,
        prompt: `How many wholes are in ${imp}/${d}?`,
        speech: `${sayFrac(imp, d)} equals how many wholes and ${sayFrac(n, d)}?`,
        equation: [{ n: imp, d }, "=", { w: "?", n, d }],
        visual: w <= 3 ? { kind: "fractions", bars: [...wholes, { parts: d, a: n }] } : NONE,
        hint: `How many groups of ${d} fit in ${imp}?`,
        explain: `${imp} ÷ ${d} = ${w} R ${n}, so ${imp}/${d} = ${mixedText(w, n, d)}.`,
      },
      w,
      [w + 1, w - 1, n, imp - d],
      0,
      20,
    );
  return numQ(
    {
      key: `mn-imp-${w}-${n}-${d}`,
      prompt: `Write ${mixedText(w, n, d)} as a fraction. What's the top?`,
      speech: `${sayMixed(w, n, d)} equals how many ${denWord(d, true)}?`,
      equation: [{ w, n, d }, "=", { n: "?", d }],
      visual: barsOrNone(fillBars(imp, d, 4)),
      hint: `Each whole is ${d} ${denWord(d, true)}. Find ${w} × ${d}, then add ${n}.`,
      explain: `${w} × ${d} = ${w * d}, plus ${n} makes ${imp}. So ${mixedText(w, n, d)} = ${imp}/${d}.`,
    },
    imp,
    [w + n, w * n + d, imp + 1, imp - 1],
    0,
    60,
  );
}

export function addMixed(): Question {
  const d = pick([2, 3, 4, 5, 6, 8]);
  const add = Math.random() < 0.6;
  let a: number;
  let b: number;
  do {
    a = rand(1, 5) * d + rand(0, d - 1);
    b = rand(1, 4) * d + rand(0, d - 1);
  } while (a % d === 0 && b % d === 0);
  if (!add && a <= b) [a, b] = [b + d, a];
  const res = add ? a + b : a - b;
  const [aw, an, bw, bn] = [Math.floor(a / d), a % d, Math.floor(b / d), b % d];
  const regroup = add ? an + bn >= d : an < bn;
  const op = add ? "+" : "−";
  return textQ(
    {
      key: `amx-${add ? "a" : "s"}-${a}-${b}-${d}`,
      prompt: add ? "Add the mixed numbers." : "Subtract the mixed numbers.",
      speech: `${sayImproper(a, d)} ${add ? "plus" : "minus"} ${sayImproper(b, d)}?`,
      equation: [an ? { w: aw, n: an, d } : aw, op, bn ? { w: bw, n: bn, d } : bw, "=", "?"],
      hint: regroup
        ? add
          ? `Add wholes and ${denWord(d, true)} separately. ${d} ${denWord(d, true)} make 1 more whole!`
          : `Not enough ${denWord(d, true)}? Trade 1 whole for ${d}/${d}.`
        : `Work with the wholes, then the ${denWord(d, true)}.`,
      explain: `${fromImproper(a, d)} ${op} ${fromImproper(b, d)} = ${a}/${d} ${op} ${b}/${d} = ${res}/${d} = ${fromImproper(res, d)}.`,
    },
    fromImproper(res, d),
    shuffle([fromImproper(res + 1, d), fromImproper(res - 1, d), fromImproper(res + d, d), fromImproper(Math.max(1, res - d), d), ...(add && an + bn > 0 ? [`${aw + bw} ${an + bn}/${d + d}`] : [])]),
  );
}

export function fractionStories(): Question {
  const d = pick([3, 4, 5, 6, 8, 10, 12]);
  const [A, B] = twoNames();
  const form = rand(0, 3);
  if (form === 0) {
    const n1 = rand(1, d - 1);
    const n2 = rand(1, d - n1);
    return numQ(
      {
        key: `fs-pizza-${n1}-${n2}-${d}`,
        prompt: `${A} ate ${n1}/${d} of a pizza. ${B} ate ${n2}/${d}. How much in all?`,
        speech: `${A} ate ${sayFrac(n1, d)} of a pizza. ${B} ate ${sayFrac(n2, d)}. How much of the pizza did they eat?`,
        equation: [{ n: n1, d }, "+", { n: n2, d }, "=", { n: "?", d }],
        visual: { kind: "fractions", bars: [{ parts: d, a: n1, b: n2, shape: "pie" }] },
        hint: "In all means add. Same size slices, so add the tops.",
        explain: `${n1}/${d} + ${n2}/${d} = ${n1 + n2}/${d} of the pizza.`,
      },
      n1 + n2,
      [n1 + n2 + 1, n1 + n2 - 1, d - n1 - n2],
      0,
      d,
    );
  }
  if (form === 1) {
    const n1 = rand(2, d);
    const n2 = rand(1, n1 - 1);
    return numQ(
      {
        key: `fs-ribbon-${n1}-${n2}-${d}`,
        prompt: `A ribbon is ${n1}/${d} m. You cut off ${n2}/${d} m. How much is left?`,
        speech: `A ribbon is ${sayFrac(n1, d)} of a meter long. You cut off ${sayFrac(n2, d)} of a meter. How much is left?`,
        equation: [{ n: n1, d }, "−", { n: n2, d }, "=", { n: "?", d }],
        visual: { kind: "fractions", bars: [{ parts: d, a: n1 }] },
        hint: "Cutting off means take away. Subtract the tops.",
        explain: `${n1}/${d} − ${n2}/${d} = ${n1 - n2}/${d} m.`,
      },
      n1 - n2,
      [n1 - n2 + 1, n1 + n2, n1 - n2 - 1],
      0,
      d + 2,
    );
  }
  if (form === 2) {
    const n = rand(1, d - 1);
    return numQ(
      {
        key: `fs-jug-${n}-${d}`,
        prompt: `A jug has 1 L of juice. You drink ${n}/${d} L. How much is left?`,
        speech: `A jug holds 1 liter of juice. You drink ${sayFrac(n, d)} of a liter. How much is left?`,
        equation: [1, "−", { n, d }, "=", { n: "?", d }],
        visual: { kind: "fractions", bars: [{ parts: d, a: n, target: d - n }] },
        hint: `1 whole is ${d}/${d}. Take ${n} ${denWord(d, true)} away.`,
        explain: `1 = ${d}/${d}. ${d}/${d} − ${n}/${d} = ${d - n}/${d} L.`,
      },
      d - n,
      [n, d - n + 1, d - n - 1],
      0,
      d,
    );
  }
  const dd = pick([2, 3, 4, 5, 6, 8]);
  const a = rand(1, 3) * dd + rand(1, dd - 1);
  const b = rand(1, 3) * dd + rand(1, dd - 1);
  return textQ(
    {
      key: `fs-walk-${a}-${b}-${dd}`,
      prompt: `${A} walked ${fromImproper(a, dd)} mi, then ${fromImproper(b, dd)} mi. How far?`,
      speech: `${A} walked ${sayImproper(a, dd)} miles, then ${sayImproper(b, dd)} miles. How far did ${A} walk in all?`,
      hint: `Add the wholes, then the ${denWord(dd, true)}. Extra ${denWord(dd, true)} can make another whole.`,
      explain: `${fromImproper(a, dd)} + ${fromImproper(b, dd)} = ${fromImproper(a + b, dd)} miles.`,
    },
    fromImproper(a + b, dd),
    shuffle([fromImproper(a + b + 1, dd), fromImproper(a + b - 1, dd), fromImproper(a + b + dd, dd), fromImproper(a + b - dd, dd)]),
  );
}

/* =============================================== W11 Fractions & decimals (G4) */

export function fracAsUnits(): Question {
  const d = pick(G4_DENS);
  const n = rand(2, Math.min(12, 3 * d));
  const form = rand(0, 1);
  return numQ(
    {
      key: `fu-${form}-${n}-${d}`,
      prompt: form === 0 ? `${n}/${d} is how many groups of 1/${d}?` : `${n} groups of 1/${d}. How many ${denWord(d, true)}?`,
      speech: form === 0 ? `${sayFrac(n, d)} equals what times one ${denWord(d, false)}?` : `${n} times one ${denWord(d, false)} equals how many ${denWord(d, true)}?`,
      equation: form === 0 ? [{ n, d }, "=", "?", "×", { n: 1, d }] : [n, "×", { n: 1, d }, "=", { n: "?", d }],
      visual: barsOrNone(fillBars(n, d)),
      hint: `${n}/${d} means ${n} pieces, each 1/${d}.`,
      explain: `${n}/${d} = ${n} × 1/${d}.`,
    },
    n,
    [d, n + 1, n - 1, n * d],
    0,
    40,
  );
}

export function wholeTimesFrac(): Question {
  const d = pick(G4_DENS);
  const n = rand(1, d - 1);
  const m = rand(2, 6);
  const form = rand(0, 2);
  const res = m * n;
  if (form === 2)
    return textQ(
      {
        key: `wtf-mixed-${m}-${n}-${d}`,
        prompt: `What is ${m} × ${n}/${d}?`,
        speech: `What is ${m} times ${sayFrac(n, d)}?`,
        equation: [m, "×", { n, d }, "=", "?"],
        visual: barsOrNone(fillBars(res, d)),
        hint: "Multiply the whole number by the top. The bottom stays the same.",
        explain: `${m} × ${n}/${d} = ${res}/${d}${res >= d ? ` = ${fromImproper(res, d)}` : ""}.`,
      },
      fromImproper(res, d),
      shuffle([fracText(res, d * m), fracText(n, d * m), fromImproper(res + 1, d), fromImproper(res + n, d), fracText(m + n, d)].filter(notEqual(res, d))),
    );
  return numQ(
    {
      key: `wtf-${form}-${m}-${n}-${d}`,
      prompt: form === 0 ? `${m} × ${n}/${d} = how many ${denWord(d, true)}?` : "Write it with unit fractions. What's missing?",
      speech: form === 0 ? `${m} times ${sayFrac(n, d)} equals how many ${denWord(d, true)}?` : `${m} times ${sayFrac(n, d)} equals what times one ${denWord(d, false)}?`,
      equation: form === 0 ? [m, "×", { n, d }, "=", { n: "?", d }] : [m, "×", { n, d }, "=", "?", "×", { n: 1, d }],
      visual: barsOrNone(fillBars(res, d)),
      hint: `${m} groups of ${n} ${denWord(d, true)}. Multiply ${m} × ${n}.`,
      explain: `${m} × ${n} = ${res}, so ${m} × ${n}/${d} = ${res}/${d}.`,
    },
    res,
    [m + n, res + 1, res - 1, res * d],
    0,
    80,
  );
}

export function fracTimesStories(): Question {
  const d = pick([2, 3, 4, 5, 6, 8, 10]);
  const n = rand(1, d - 1);
  const m = rand(2, 8);
  const res = m * n;
  const form = rand(0, 2);
  if (form === 0)
    return numQ(
      {
        key: `fts-milk-${m}-${n}-${d}`,
        prompt: `${m} kids each drink ${n}/${d} L of milk. How much in all?`,
        speech: `${m} kids each drink ${sayFrac(n, d)} of a liter of milk. How many ${denWord(d, true)} of a liter in all?`,
        equation: [m, "×", { n, d }, "=", { n: "?", d }],
        visual: barsOrNone(fillBars(res, d)),
        hint: `${m} groups of ${n}/${d}. Multiply the top by ${m}.`,
        explain: `${m} × ${n}/${d} = ${res}/${d} L${res >= d ? `, which is ${fromImproper(res, d)} L` : ""}.`,
      },
      res,
      [m + n, res + 1, res - 1, n],
      0,
      80,
    );
  if (form === 1 && res % d !== 0 && res > d) {
    const lo = Math.floor(res / d);
    return textQ(
      {
        key: `fts-between-${m}-${n}-${d}`,
        prompt: `${m} people each eat ${n}/${d} lb of beef. Between which wholes?`,
        speech: `${m} people each eat ${sayFrac(n, d)} of a pound of beef. The total is between which two whole numbers of pounds?`,
        hint: `Find ${m} × ${n}/${d} first. How many wholes fit in it?`,
        explain: `${m} × ${n}/${d} = ${res}/${d} = ${fromImproper(res, d)} lb. That's between ${lo} and ${lo + 1}.`,
      },
      `${lo} and ${lo + 1}`,
      shuffle([`${lo + 1} and ${lo + 2}`, `${lo + 2} and ${lo + 3}`, ...(lo >= 1 ? [`${lo - 1} and ${lo}`] : [])]),
    );
  }
  return textQ(
    {
      key: `fts-recipe-${m}-${n}-${d}`,
      prompt: `A recipe uses ${n}/${d} cup of sugar. Make it ${m} times. Cups?`,
      speech: `A recipe uses ${sayFrac(n, d)} of a cup of sugar. You make it ${m} times. How many cups of sugar?`,
      equation: [m, "×", { n, d }, "=", "?"],
      hint: "Multiply the top by the number of batches. The bottom stays the same.",
      explain: `${m} × ${n}/${d} = ${res}/${d}${res >= d ? ` = ${fromImproper(res, d)}` : ""} cups.`,
    },
    fromImproper(res, d),
    shuffle([fracText(res, d * m), fromImproper(res + 1, d), fromImproper(res + n, d), fracText(m + n, d)].filter(notEqual(res, d))),
  );
}

export function tenthsHundredths(): Question {
  const t = rand(1, 9);
  const h = rand(1, 9);
  const form = rand(0, 2);
  if (form === 0)
    return numQ(
      {
        key: `th-up-${t}`,
        prompt: `${t}/10 is how many hundredths?`,
        speech: `${sayFrac(t, 10)} equals how many hundredths?`,
        equation: [{ n: t, d: 10 }, "=", { n: "?", d: 100 }],
        visual: { kind: "hundredgrid", shaded: 10 * t },
        hint: "Each tenth is a column of 10 little squares.",
        explain: `${t} tenths is ${t} columns of 10: ${10 * t}/100.`,
      },
      10 * t,
      [t, t + 10, 10 * t + 1, 10 * t - 10],
      0,
      100,
    );
  if (form === 1)
    return numQ(
      {
        key: `th-add-${t}-${h}`,
        prompt: "Add tenths and hundredths.",
        speech: `${sayFrac(t, 10)} plus ${sayFrac(h, 100)} equals how many hundredths?`,
        equation: [{ n: t, d: 10 }, "+", { n: h, d: 100 }, "=", { n: "?", d: 100 }],
        visual: { kind: "hundredgrid", shaded: 10 * t + h },
        hint: "Change the tenths into hundredths first. Then add.",
        explain: `${t}/10 = ${10 * t}/100. ${10 * t}/100 + ${h}/100 = ${10 * t + h}/100.`,
      },
      10 * t + h,
      [t + h, 10 * h + t, 10 * t + h + 10],
      0,
      100,
    );
  return numQ(
    {
      key: `th-down-${t}`,
      prompt: `${10 * t}/100 is how many tenths?`,
      speech: `${sayFrac(10 * t, 100)} equals how many tenths?`,
      equation: [{ n: 10 * t, d: 100 }, "=", { n: "?", d: 10 }],
      visual: { kind: "hundredgrid", shaded: 10 * t },
      hint: "10 hundredths make 1 tenth. Count the full columns.",
      explain: `${10 * t} hundredths is ${t} groups of 10, so ${10 * t}/100 = ${t}/10.`,
    },
    t,
    [10 * t, t + 1, t - 1],
    0,
    100,
  );
}

export function fracToDecimal(): Question {
  const form = rand(0, 4);
  if (form === 0) {
    const h = rand(1, 99);
    return typeQ(
      {
        key: `fd-h-${h}`,
        prompt: `Write ${h}/100 as a decimal.`,
        speech: `Write ${sayFrac(h, 100)} as a decimal.`,
        equation: [{ n: h, d: 100 }, "=", "?"],
        visual: { kind: "hundredgrid", shaded: h },
        keypadExtra: ".",
        hint: "Hundredths use two places after the decimal point.",
        explain: `${h}/100 = ${(h / 100).toFixed(2)}.`,
      },
      h / 100,
    );
  }
  if (form === 1) {
    const t = rand(1, 9);
    const w = rand(0, 3);
    return typeQ(
      {
        key: `fd-t-${w}-${t}`,
        prompt: w ? `Write ${w} ${t}/10 as a decimal.` : `Write ${t}/10 as a decimal.`,
        speech: `Write ${sayMixed(w, t, 10)} as a decimal.`,
        equation: [w ? { w, n: t, d: 10 } : { n: t, d: 10 }, "=", "?"],
        visual: w ? NONE : { kind: "hundredgrid", shaded: 10 * t },
        keypadExtra: ".",
        hint: "Tenths go in the first place after the decimal point.",
        explain: `${mixedText(w, t, 10)} = ${w}.${t}.`,
      },
      (10 * w + t) / 10,
    );
  }
  if (form === 2) {
    const h = rand(1, 99);
    return numQ(
      {
        key: `fd-back-${h}`,
        prompt: `${(h / 100).toFixed(2)} is how many hundredths?`,
        equation: [h / 100, "=", { n: "?", d: 100 }],
        visual: { kind: "hundredgrid", shaded: h },
        hint: "Read the digits after the point as hundredths.",
        explain: `${(h / 100).toFixed(2)} = ${h}/100.`,
      },
      h,
      [h + 10, h * 10, h + 1, h - 1],
      1,
      100,
    );
  }
  const t = rand(1, 9);
  let h = rand(1, 9);
  while (h === t) h = rand(1, 9);
  const which = form === 3 ? "tenths" : "hundredths";
  const digit = which === "tenths" ? t : h;
  return textQ(
    {
      key: `fd-place-${t}-${h}-${which}`,
      prompt: `What does the ${digit} in 0.${t}${h} mean?`,
      visual: { kind: "places", digits: `0.${t}${h}`, highlight: which === "tenths" ? 2 : 3 },
      hint: "The first place after the point is tenths. The next is hundredths.",
      explain: `The ${digit} is in the ${which} place, so it means ${digit} ${which}.`,
    },
    `${digit} ${which}`,
    shuffle([`${digit} ${which === "tenths" ? "hundredths" : "tenths"}`, `${digit} ones`, `${digit} tens`]),
  );
}

export function decimalLine(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const w = rand(0, 2);
    const t = rand(1, 9);
    const x = (10 * w + t) / 10;
    return typeQ(
      {
        key: `dl-dot-t-${w}-${t}`,
        prompt: pick(["What decimal is at the dot?", "Name the decimal at the dot."]),
        visual: { kind: "numberline", min: w, max: w + 1, step: 0.1, labelStep: 1, from: x, to: x, hideFrom: true },
        needsVisual: true,
        keypadExtra: ".",
        hint: `Each small step is one tenth, 0.1. Count the steps from ${w}.`,
        explain: `The dot is ${t} tenth${t === 1 ? "" : "s"} past ${w}, so it's at ${x}.`,
      },
      x,
    );
  }
  if (kind === 1) {
    const base = rand(1, 8);
    const h = rand(1, 9);
    const x = (10 * base + h) / 100;
    return typeQ(
      {
        key: `dl-dot-h-${base}-${h}`,
        prompt: pick(["What decimal is at the dot?", "Name the decimal at the dot."]),
        visual: { kind: "numberline", min: base / 10, max: (base + 1) / 10, step: 0.01, labelStep: 0.1, from: x, to: x, hideFrom: true },
        needsVisual: true,
        keypadExtra: ".",
        hint: `Each small step here is one hundredth, 0.01. Count the steps from ${(base / 10).toFixed(1)}.`,
        explain: `The dot is ${h} hundredth${h === 1 ? "" : "s"} past ${(base / 10).toFixed(1)}, so it's at ${x.toFixed(2)}.`,
      },
      x,
    );
  }
  if (kind === 2) {
    const w = rand(0, 2);
    const t1 = rand(0, 6);
    const t2 = rand(1, 9 - t1);
    const from = (10 * w + t1) / 10;
    const to = (10 * w + t1 + t2) / 10;
    return typeQ(
      {
        key: `dl-t-${w}-${t1}-${t2}`,
        prompt: `Start at ${from}. Jump ${t2} tenth${t2 === 1 ? "" : "s"}. Where do you land?`,
        visual: { kind: "numberline", min: w, max: w + 1, step: 0.1, labelStep: 0.5, from, to },
        keypadExtra: ".",
        hint: "Each small step on the line is one tenth, 0.1. Count the steps.",
        explain: `${from} + ${(t2 / 10).toFixed(1)} = ${to}.`,
      },
      to,
    );
  }
  const base = rand(1, 8);
  const h1 = rand(0, 5);
  const h2 = rand(1, 9 - h1);
  const from = (10 * base + h1) / 100;
  const to = (10 * base + h1 + h2) / 100;
  return typeQ(
    {
      key: `dl-h-${base}-${h1}-${h2}`,
      prompt: `Start at ${from.toFixed(2)}. Jump ${h2} hundredth${h2 === 1 ? "" : "s"}. Land where?`,
      visual: { kind: "numberline", min: base / 10, max: (base + 1) / 10, step: 0.01, labelStep: 0.05, from, to },
      keypadExtra: ".",
      hint: "Each small step here is one hundredth, 0.01. Count the steps.",
      explain: `${from.toFixed(2)} + ${(h2 / 100).toFixed(2)} = ${to.toFixed(2)}.`,
    },
    to,
  );
}

export function compareDecimals(): Question {
  const kind = rand(0, 4);
  let a: number;
  let b: number;
  let as: string;
  let bs: string;
  if (kind === 0) {
    const t = rand(1, 9);
    let h = rand(1, 99);
    while (h === t * 10) h = rand(1, 99);
    [a, b] = [t / 10, h / 100];
    [as, bs] = [a.toFixed(1), b.toFixed(2)];
  } else if (kind === 1) {
    const x = rand(10, 98);
    let y = Number(String(x).split("").reverse().join(""));
    if (y === x || y < 10) y = x + rand(1, 9) * (x > 50 ? -1 : 1);
    [a, b] = [x / 100, y / 100];
    [as, bs] = [a.toFixed(2), b.toFixed(2)];
  } else if (kind === 2) {
    const t = rand(1, 9);
    [a, b] = [t / 10, t / 10];
    [as, bs] = Math.random() < 0.5 ? [a.toFixed(1), b.toFixed(2)] : [a.toFixed(2), b.toFixed(1)];
  } else {
    const w = rand(1, 9);
    const t = rand(1, 9);
    const h = rand(1, 99);
    [a, b] = [w + t / 10, w + h / 100];
    if (Math.round(a * 100) === Math.round(b * 100)) b = w + (h + 1) / 100;
    [as, bs] = [a.toFixed(1), b.toFixed(2)];
  }
  if (Math.random() < 0.5) [a, b, as, bs] = [b, a, bs, as];
  const sign = signOf(Math.round(a * 100), Math.round(b * 100));
  return fixedQ(
    {
      key: `cd-${as}-${bs}`,
      prompt: pick(["Which sign goes in the box?", "Compare the decimals."]),
      speech: `Compare ${as} and ${bs}. Less than, equal to, or greater than?`,
      equation: [as, "?", bs],
      hint: "Line up the decimal points. Compare the ones, then tenths, then hundredths. 0.5 is the same as 0.50.",
      explain: `${as} is ${Math.round(a * 100)} hundredths${a >= 1 ? " in all" : ""} and ${bs} is ${Math.round(b * 100)}. So ${as} ${sign} ${bs}.`,
    },
    SIGNS,
    sign,
  );
}

/* ================================================= W12 Measure & convert (G4) */

const CONV_LEN: [string, string, number][] = [
  ["km", "m", 1000],
  ["m", "cm", 100],
  ["ft", "in", 12],
  ["yd", "ft", 3],
];
const CONV_MASS: [string, string, number][] = [
  ["kg", "g", 1000],
  ["lb", "oz", 16],
  ["L", "mL", 1000],
];
const CONV_TIME: [string, string, number][] = [
  ["hr", "min", 60],
  ["min", "sec", 60],
];
const UNIT_WORD: Record<string, string> = {
  km: "kilometers", m: "meters", cm: "centimeters", ft: "feet", in: "inches", yd: "yards",
  kg: "kilograms", g: "grams", lb: "pounds", oz: "ounces", L: "liters", mL: "milliliters",
  hr: "hours", min: "minutes", sec: "seconds",
};

function convert(table: [string, string, number][], tag: string): Question {
  const ti = rand(0, table.length - 1);
  const [big, small, f] = table[ti];
  const form = rand(0, 3);
  const a = rand(2, 9);
  if (form === 0)
    return typeQ(
      {
        key: `cv-${tag}-${ti}-a-${a}`,
        prompt: `${a} ${big} = how many ${small}?`,
        speech: `${a} ${UNIT_WORD[big]} is how many ${UNIT_WORD[small]}?`,
        unit: small,
        hint: `1 ${big} = ${comma(f)} ${small}. So ${a} ${big} is ${a} groups of ${comma(f)}.`,
        explain: `${a} × ${comma(f)} = ${comma(a * f)}, so ${a} ${big} = ${comma(a * f)} ${small}.`,
      },
      a * f,
    );
  if (form === 1) {
    const b = rand(1, f - 1);
    return typeQ(
      {
        key: `cv-${tag}-${ti}-m-${a}-${b}`,
        prompt: `${a} ${big} ${b} ${small} = how many ${small}?`,
        speech: `${a} ${UNIT_WORD[big]} and ${b} ${UNIT_WORD[small]} is how many ${UNIT_WORD[small]}?`,
        unit: small,
        hint: `Change the ${UNIT_WORD[big]} to ${UNIT_WORD[small]} first, then add ${b}.`,
        explain: `${a} × ${comma(f)} = ${comma(a * f)}, and ${comma(a * f)} + ${b} = ${comma(a * f + b)} ${small}.`,
      },
      a * f + b,
    );
  }
  if (form === 2) {
    const rows: (number | string)[][] = [1, 2, 3].map((i) => [i, i * f]);
    rows.push([a + 2, "?"]);
    return numQ(
      {
        key: `cv-${tag}-${ti}-t-${a}`,
        prompt: "Fill in the table. What's missing?",
        speech: `The table changes ${UNIT_WORD[big]} to ${UNIT_WORD[small]}. What number is missing?`,
        visual: { kind: "table", header: [big, small], rows },
        needsVisual: true,
        hint: `Each ${big} is ${f} ${small}. Multiply by ${f}.`,
        explain: `${a + 2} × ${f} = ${(a + 2) * f}.`,
      },
      (a + 2) * f,
      [(a + 3) * f, (a + 1) * f, a + 2 + f],
      0,
      20000,
    );
  }
  const off = pick([-1, 1]) * rand(1, Math.max(1, Math.floor(f / 4)));
  const other = a * f + off;
  const bigWins = off < 0;
  return fixedQ(
    {
      key: `cv-${tag}-${ti}-c-${a}-${off}`,
      prompt: `Which is more: ${a} ${big} or ${comma(other)} ${small}?`,
      speech: `Which is more: ${a} ${UNIT_WORD[big]}, or ${other} ${UNIT_WORD[small]}?`,
      hint: `Change ${a} ${big} into ${small} first: ${a} × ${f}.`,
      explain: `${a} ${big} = ${comma(a * f)} ${small}, which is ${bigWins ? "more than" : "less than"} ${comma(other)} ${small}.`,
    },
    [`${a} ${big}`, `${comma(other)} ${small}`],
    bigWins ? `${a} ${big}` : `${comma(other)} ${small}`,
  );
}

export const convertLength = () => convert(CONV_LEN, "len");
export const convertMass = () => convert(CONV_MASS, "mass");
export const convertTime = () => convert(CONV_TIME, "time");

export function measureStories(): Question {
  const form = rand(0, 4);
  if (form === 0) {
    const km = rand(1, 5);
    const m = rand(1, 9) * 100 + pick([0, 50]);
    return typeQ(
      {
        key: `mst-run-${km}-${m}`,
        prompt: `${pick(NAMES)} ran ${km} km, then ${m} m more. How many meters?`,
        unit: "m",
        hint: "Change the kilometers to meters first. 1 km = 1,000 m.",
        explain: `${km} km = ${comma(km * 1000)} m. ${comma(km * 1000)} + ${m} = ${comma(km * 1000 + m)} m.`,
      },
      km * 1000 + m,
    );
  }
  if (form === 1) {
    const L = rand(1, 3);
    const c = rand(2, 5);
    const ml = pick([100, 150, 200, 250]);
    if (c * ml >= L * 1000) return measureStories();
    return typeQ(
      {
        key: `mst-jug-${L}-${c}-${ml}`,
        prompt: `A jug holds ${L} L. You pour ${c} cups of ${ml} mL. mL left?`,
        speech: `A jug holds ${L} liters of water. You pour out ${c} cups of ${ml} milliliters each. How many milliliters are left?`,
        equation: [L * 1000, "−", c, "×", ml, "=", "?"],
        unit: "mL",
        hint: "1 L = 1,000 mL. Find how much you poured out, then subtract.",
        explain: `${L} L = ${comma(L * 1000)} mL. ${c} × ${ml} = ${c * ml}. ${comma(L * 1000)} − ${c * ml} = ${comma(L * 1000 - c * ml)} mL.`,
      },
      L * 1000 - c * ml,
    );
  }
  if (form === 2) {
    const kg = rand(2, 5);
    const g = rand(1, 9) * 50;
    return typeQ(
      {
        key: `mst-flour-${kg}-${g}`,
        prompt: `A bag has ${kg} kg of flour. You use ${g} g. How many grams left?`,
        unit: "g",
        hint: "1 kg = 1,000 g. Change kilograms to grams, then subtract.",
        explain: `${kg} kg = ${comma(kg * 1000)} g. ${comma(kg * 1000)} − ${g} = ${comma(kg * 1000 - g)} g.`,
      },
      kg * 1000 - g,
    );
  }
  if (form === 3) {
    const m1 = rand(20, 59);
    const m2 = rand(20, 59);
    return typeQ(
      {
        key: `mst-movies-${m1}-${m2}`,
        prompt: `Two movies: 1 hr ${m1} min and 1 hr ${m2} min. Total minutes?`,
        speech: `One movie is 1 hour ${m1} minutes. Another is 1 hour ${m2} minutes. How many minutes in all?`,
        unit: "min",
        hint: "1 hour = 60 minutes. Change each movie to minutes, then add.",
        explain: `${60 + m1} + ${60 + m2} = ${120 + m1 + m2} minutes.`,
      },
      120 + m1 + m2,
    );
  }
  const pay = pick([5, 10, 20]);
  const cost = rand(pay * 30, pay * 100 - 5);
  const change = pay * 100 - cost;
  return typeQ(
    {
      key: `mst-change-${pay}-${cost}`,
      prompt: `A toy costs $${(cost / 100).toFixed(2)}. You pay $${pay}. Change?`,
      speech: `A toy costs ${(cost / 100).toFixed(2)} dollars. You pay with ${pay} dollars. How much change do you get?`,
      equation: [pay, "−", cost / 100, "=", "?"],
      prefix: "$",
      keypadExtra: ".",
      hint: "Count up from the cost to the next dollar, then to the money you paid.",
      explain: `$${pay}.00 − $${(cost / 100).toFixed(2)} = $${(change / 100).toFixed(2)}.`,
    },
    change / 100,
  );
}

export function moneyCount(): Question {
  const coins = [
    ...Array<number>(rand(0, 3)).fill(100),
    ...Array<number>(rand(0, 3)).fill(25),
    ...Array<number>(rand(0, 4)).fill(10),
    ...Array<number>(rand(0, 2)).fill(5),
    ...Array<number>(rand(0, 4)).fill(1),
  ];
  if (coins.length < 3) coins.push(25, 10, 1);
  const cents = coins.reduce((t, c) => t + c, 0);
  const sorted = [...coins].sort((a, b) => b - a);
  return typeQ(
    {
      key: `money-${sorted.join(".")}`,
      prompt: pick(["How much money is this?", "Count the money!"]),
      visual: { kind: "coins", coins },
      needsVisual: true,
      prefix: "$",
      keypadExtra: ".",
      hint: "Start with the biggest: dollars, then quarters (25¢), dimes (10¢), nickels (5¢), pennies (1¢).",
      explain: `${sorted.map((c) => (c >= 100 ? "$1" : `${c}¢`)).join(" + ")} = $${(cents / 100).toFixed(2)}.`,
    },
    cents / 100,
  );
}

export function areaPerimeterFormulas(): Question {
  const form = rand(0, 3);
  const u = pick(["m", "ft", "cm", "yd"]);
  const L = rand(6, 20);
  const W = rand(3, 15);
  if (form === 0)
    return typeQ(
      {
        key: `apf-area-${L}-${W}-${u}`,
        prompt: pick(["Area = length × width. What's the area?", `A room is ${L} ${u} by ${W} ${u}. Area?`]),
        speech: `A rectangle is ${L} ${u} long and ${W} ${u} wide. What is its area?`,
        equation: [L, "×", W, "=", "?"],
        visual: { kind: "rect", w: L, h: W, showW: true, showH: true, grid: false, unit: u },
        unit: `sq ${u}`,
        hint: "Area = length × width.",
        explain: `${L} × ${W} = ${L * W} square ${u}.`,
      },
      L * W,
    );
  if (form === 1)
    return typeQ(
      {
        key: `apf-per-${L}-${W}-${u}`,
        prompt: pick([`A garden is ${L} ${u} by ${W} ${u}. Fence around it?`, "What's the perimeter?"]),
        speech: `A garden is ${L} ${u} long and ${W} ${u} wide. How much fence goes all the way around?`,
        equation: [2, "×", "(", L, "+", W, ")", "=", "?"],
        visual: { kind: "rect", w: L, h: W, showW: true, showH: true, grid: false, unit: u },
        unit: u,
        hint: "Perimeter = length + width + length + width.",
        explain: `2 × (${L} + ${W}) = 2 × ${L + W} = ${2 * (L + W)} ${u}.`,
      },
      2 * (L + W),
    );
  if (form === 2)
    return typeQ(
      {
        key: `apf-side-a-${L}-${W}-${u}`,
        prompt: `Area is ${L * W} sq ${u}. Length is ${L} ${u}. Width?`,
        speech: `A rectangle has an area of ${L * W} square ${u}. It is ${L} ${u} long. How wide is it?`,
        equation: [L, "×", "?", "=", L * W],
        visual: { kind: "rect", w: L, h: W, showW: true, showH: false, grid: false, unit: u, inside: `Area = ${L * W}` },
        unit: u,
        hint: `Length × width = area. ${L} × what = ${L * W}?`,
        explain: `${L * W} ÷ ${L} = ${W} ${u}.`,
      },
      W,
    );
  return typeQ(
    {
      key: `apf-side-p-${L}-${W}-${u}`,
      prompt: `Perimeter is ${2 * (L + W)} ${u}. Length is ${L} ${u}. Width?`,
      speech: `A rectangle has a perimeter of ${2 * (L + W)} ${u}. It is ${L} ${u} long. How wide is it?`,
      equation: [2, "×", "(", L, "+", "?", ")", "=", 2 * (L + W)],
      visual: { kind: "rect", w: L, h: W, showW: true, showH: false, grid: false, unit: u },
      unit: u,
      hint: "Half the perimeter is one length plus one width.",
      explain: `${2 * (L + W)} ÷ 2 = ${L + W}. ${L + W} − ${L} = ${W} ${u}.`,
    },
    W,
  );
}

/** n eighths in simplest form, as the dot-plot axis labels show it (4/8 → "1/2", 10/8 → "1 1/4"). */
function simpleEighths(n: number): string {
  const w = Math.floor(n / 8);
  const r = n % 8;
  const g = gcd(r, 8) || 8;
  return mixedText(w, r / g, 8 / g);
}

export function linePlotFractions(): Question {
  const spots = shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4).sort((a, b) => a - b);
  const counts = spots.map(() => rand(1, 4));
  const values = spots.flatMap((s, k) => Array<number>(counts[k]).fill(s / 8));
  const visual: Visual = { kind: "dots", values, min: 0, max: 1, label: "Bug lengths (inches)" };
  const e8 = simpleEighths;
  const keyPart = `${spots.join(".")}-${counts.join(".")}`;
  const form = rand(0, 2);
  const i = rand(0, 3);
  if (form === 0)
    return numQ(
      {
        key: `lpf-count-${keyPart}-${i}`,
        prompt: `How many bugs are ${e8(spots[i])} inch long?`,
        speech: `How many bugs are ${sayFrac(spots[i], 8)} of an inch long?`,
        visual,
        needsVisual: true,
        hint: "Each dot is one bug. Find the length on the line and count the dots above it.",
        explain: `There are ${counts[i]} dots above ${e8(spots[i])}.`,
      },
      counts[i],
      [counts[i] + 1, counts[i] - 1, counts[(i + 1) % 4]],
      0,
      10,
    );
  const lo = spots[0];
  const hi = spots[3];
  if (form === 1)
    return textQ(
      {
        key: `lpf-diff-${keyPart}`,
        prompt: "Longest bug minus shortest bug? (inches)",
        speech: "How much longer is the longest bug than the shortest bug?",
        visual,
        needsVisual: true,
        hint: "Find the dots farthest right and farthest left. Subtract the eighths.",
        explain: `${hi}/8 − ${lo}/8 = ${hi - lo}/8 = ${e8(hi - lo)} inch.`,
      },
      e8(hi - lo),
      shuffle([e8(hi - lo + 1), e8(hi - lo - 1), e8(hi + lo), e8(hi - lo + 2)]),
    );
  const total = spots[i] * counts[i];
  return textQ(
    {
      key: `lpf-total-${keyPart}-${i}`,
      prompt: `Lay all the ${e8(spots[i])} inch bugs end to end. How long?`,
      speech: `Put all the bugs that are ${sayFrac(spots[i], 8)} of an inch long end to end. How long is the line?`,
      visual,
      needsVisual: true,
      hint: `Count those bugs, then multiply by ${spots[i]}/8.`,
      explain: `${counts[i]} × ${spots[i]}/8 = ${total}/8 = ${e8(total)} inch.`,
    },
    e8(total),
    shuffle([e8(total + spots[i]), e8(Math.max(1, total - spots[i])), e8(total + 1), e8(Math.max(1, total - 1)), e8(total + 2), e8(total * 2 + 1)]),
  );
}

/* ====================================================== W13 Angles & lines (G4) */

const GEO_WORDS: [string, string, string[], string][] = [
  ["Which goes on forever in both directions?", "a line", ["a ray", "a line segment", "a point"], "A line has no endpoints. It goes on forever both ways."],
  ["Which has two endpoints?", "a line segment", ["a line", "a ray", "a point"], "A line segment stops at both ends, so it has two endpoints."],
  ["Which has one endpoint and goes on forever one way?", "a ray", ["a line", "a line segment", "an angle"], "A ray starts at one endpoint and goes on forever in one direction."],
  ["Two rays that share an endpoint make…", "an angle", ["a line", "a point", "a line segment"], "Two rays from the same endpoint make an angle."],
  ["An exact spot with no size is a…", "point", ["line", "ray", "angle"], "A point marks an exact spot. It has no length at all."],
  ["A flashlight beam is like a…", "ray", ["line segment", "point", "angle"], "The beam starts at the flashlight and keeps going one way, like a ray."],
  ["The edge of a ruler, end to end, is like a…", "line segment", ["ray", "line", "point"], "The edge stops at both ends, like a line segment."],
  ["How many endpoints does a ray have?", "1", ["0", "2", "3"], "A ray has 1 endpoint where it starts."],
  ["How many endpoints does a line segment have?", "2", ["0", "1", "3"], "A line segment has 2 endpoints, one at each end."],
  ["How many endpoints does a line have?", "0", ["1", "2", "3"], "A line never stops, so it has 0 endpoints."],
  ["The tip of a sharp pencil is like a…", "point", ["ray", "line", "angle"], "The tip marks one tiny spot, like a point."],
  ["The corner of a square makes what kind of angle?", "a right angle", ["an acute angle", "an obtuse angle", "a straight angle"], "A square has square corners, and a square corner is a right angle."],
];

export function geoWords(): Question {
  if (Math.random() < 0.4) {
    const type = pick(["point", "line", "ray", "segment"] as const);
    const name = type === "segment" ? "line segment" : type;
    const why: Record<typeof type, string> = {
      point: "It's a single dot marking one exact spot: a point.",
      line: "Arrows on both ends mean it goes on forever both ways: a line.",
      ray: "It starts at a dot and has an arrow on one end: a ray.",
      segment: "Dots on both ends mean it stops at both ends: a line segment.",
    };
    return fixedQ(
      {
        key: `gw-pic-${type}`,
        prompt: pick(["What is this called?", "Which word names this picture?"]),
        visual: { kind: "lines", type },
        needsVisual: true,
        hint: "Look at the ends. An arrow means it keeps going. A dot at the end means it stops there.",
        explain: why[type],
      },
      ["point", "line", "ray", "line segment"],
      name,
    );
  }
  const i = rand(0, GEO_WORDS.length - 1);
  const [q, right, wrong, why] = GEO_WORDS[i];
  const angle = right.includes("angle");
  return textQ(
    {
      key: `gw-${i}`,
      prompt: q,
      visual: right === "an angle" ? { kind: "protractor", angle: 60, scale: false } : NONE,
      hint: angle
        ? "Angles are named by size: smaller than a square corner, a square corner, or bigger."
        : "Think about the ends. Does it stop at both ends, at one end, or go on forever? Is it just a spot?",
      explain: why,
    },
    right,
    wrong,
  );
}

const angleKind = (a: number) => (a < 90 ? "acute" : a === 90 ? "right" : a < 180 ? "obtuse" : "straight");

export function angleTypes(): Question {
  const kind = pick(["acute", "right", "obtuse", "straight", "acute", "obtuse"]);
  const a = kind === "acute" ? rand(2, 15) * 5 : kind === "obtuse" ? rand(21, 34) * 5 : kind === "right" ? 90 : 180;
  const shown = Math.random() < 0.7;
  return fixedQ(
    {
      key: `at-${shown ? "pic" : "num"}-${a}`,
      prompt: shown ? "What kind of angle is this?" : `An angle of ${a}° is…`,
      speech: shown ? "What kind of angle is this?" : `What kind of angle measures ${a} degrees?`,
      visual: shown ? { kind: "protractor", angle: a, scale: false } : NONE,
      needsVisual: shown,
      hint: "Compare it with a square corner (90°). Is it smaller, the same, or bigger? Is it flat?",
      explain:
        a < 90 ? `${a}° is less than 90°, so it's acute.` : a === 90 ? "It's a square corner: 90°, a right angle." : a < 180 ? `${a}° is more than 90° but less than 180°, so it's obtuse.` : "180° makes a straight line: a straight angle.",
    },
    ["acute", "right", "obtuse", "straight"],
    angleKind(a),
  );
}

export function angleTurns(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const turns: [string, number][] = [["quarter", 90], ["half", 180], ["three-quarter", 270], ["full", 360]];
    const [name, deg] = pick(turns);
    return numQ(
      {
        key: `atu-turn-${name}`,
        prompt: `A ${name} turn is how many degrees?`,
        visual: deg <= 180 ? { kind: "protractor", angle: deg, scale: false } : NONE,
        unit: "°",
        hint:
          name === "quarter"
            ? "A full turn is 360°. A quarter turn is one of 4 equal parts of it."
            : name === "full"
              ? "A full turn is 4 quarter turns, and each quarter turn is a square corner of 90°."
              : name === "half"
                ? "A half turn makes a straight line. It's 2 quarter turns of 90° each."
                : "Three quarter turns: each quarter turn is a square corner of 90°.",
        explain: `A ${name} turn is ${deg === 360 ? "all" : name} of 360°, which is ${deg}°.`,
      },
      deg,
      [90, 180, 270, 360, 45].filter((x) => x !== deg),
      0,
      400,
    );
  }
  if (form === 1) {
    const n = pick([2, 3, 4, 5, 6, 8, 9, 10, 12, 36]);
    return numQ(
      {
        key: `atu-part-${n}`,
        prompt: `An angle turns 1/${n} of a circle. How many degrees?`,
        speech: `An angle turns through one ${n === 2 ? "half" : n === 3 ? "third" : `${n}th`} of a full circle. How many degrees is it?`,
        unit: "°",
        hint: `A full circle is 360°. Share 360 into ${n} equal parts.`,
        explain: `360 ÷ ${n} = ${360 / n}°.`,
      },
      360 / n,
      [180 / n, 360 / n + 10, 360 / n - 10, n],
      1,
      400,
    );
  }
  if (form === 2) {
    const a = pick([10, 15, 20, 30, 36, 40, 45, 60, 90, 120]);
    const full = Math.random() < 0.6;
    const total = full ? 360 : 180;
    if (!full && 180 % a !== 0) return angleTurns();
    return numQ(
      {
        key: `atu-fit-${a}-${total}`,
        prompt: `How many ${a}° angles make a ${full ? "full turn" : "straight angle"}?`,
        hint: `A ${full ? "full turn" : "straight angle"} is ${total}°. How many ${a}s fit in ${total}?`,
        explain: `${total} ÷ ${a} = ${total / a}.`,
      },
      total / a,
      [total / a + 1, total / a - 1, full ? 180 / a : 360 / a].filter(Number.isInteger),
      1,
      40,
    );
  }
  const k = rand(2, 6);
  return numQ(
    {
      key: `atu-clock-${k}`,
      prompt: `The minute hand turns from 12 to ${k}. How many degrees?`,
      speech: `The minute hand turns from the 12 to the ${k}. How many degrees does it turn?`,
      visual: { kind: "clock", h: 12, m: 5 * k },
      unit: "°",
      hint: "A full turn is 360° and the clock has 12 numbers. Each number is 360 ÷ 12 = 30°.",
      explain: `${k} × 30° = ${30 * k}°.`,
    },
    30 * k,
    [5 * k, 30 * k + 30, 30 * k - 30, 15 * k],
    1,
    360,
  );
}

export function readProtractor(): Question {
  const a = rand(2, 34) * 5;
  return numQ(
    {
      key: `pr-${a}`,
      prompt: pick(["How big is the angle?", "Read the protractor. How many degrees?"]),
      speech: "Read the protractor. How many degrees is the angle?",
      visual: { kind: "protractor", angle: a, scale: true },
      needsVisual: true,
      unit: "°",
      hint: "Start at 0 where the flat ray lies. Follow the numbers to the other ray.",
      explain: `The ray points to ${a}°. ${a < 90 ? "It's smaller than a square corner, so a small number makes sense." : a > 90 ? "It's wider than a square corner, so a number over 90 makes sense." : "It's a right angle."}`,
    },
    a,
    [180 - a, a + 10, a - 10, a + 5],
    0,
    180,
  );
}

export function addAngles(): Question {
  const form = rand(0, 3);
  if (form === 0) {
    const a = rand(2, 17) * 5;
    const b = rand(2, Math.min(17, 36 - a / 5)) * 5;
    return typeQ(
      {
        key: `aa-two-${a}-${b}`,
        prompt: `An angle is split into ${a}° and ${b}°. How big is it?`,
        speech: `An angle is split into two parts: ${a} degrees and ${b} degrees. How big is the whole angle?`,
        equation: [a, "+", b, "=", "?"],
        visual: { kind: "protractor", angle: a + b, scale: false },
        unit: "°",
        hint: "The parts add up to the whole angle.",
        explain: `${a}° + ${b}° = ${a + b}°.`,
      },
      a + b,
    );
  }
  if (form === 1) {
    const a = rand(10, 60);
    const b = rand(10, 60);
    const c = rand(10, 50);
    return typeQ(
      {
        key: `aa-three-${a}-${b}-${c}`,
        prompt: `Angles of ${a}°, ${b}° and ${c}° sit side by side. Total?`,
        speech: `Three angles, ${a}, ${b} and ${c} degrees, sit side by side with no gaps. How big is the angle they make?`,
        equation: [a, "+", b, "+", c, "=", "?"],
        unit: "°",
        hint: "Angles that touch without overlapping add up.",
        explain: `${a}° + ${b}° + ${c}° = ${a + b + c}°.`,
      },
      a + b + c,
    );
  }
  if (form === 2) {
    const a = rand(10, 80);
    return numQ(
      {
        key: `aa-right-${a}`,
        prompt: `A right angle is split in two. One part is ${a}°. The other?`,
        speech: `A right angle is split into two parts. One part is ${a} degrees. How big is the other part?`,
        equation: [a, "+", "?", "=", 90],
        visual: { kind: "angle", mode: "parts", angles: [a, 90 - a] },
        unit: "°",
        hint: "A right angle is 90°. What adds to the part to make 90?",
        explain: `90° − ${a}° = ${90 - a}°.`,
      },
      90 - a,
      [180 - a, 90 - a + 10, 90 - a - 10, a],
      0,
      180,
    );
  }
  const T = rand(20, 34) * 5;
  const a = rand(4, T / 5 - 4) * 5;
  return numQ(
    {
      key: `aa-part-${T}-${a}`,
      prompt: `A ${T}° angle is split in two. One part is ${a}°. The other?`,
      speech: `An angle of ${T} degrees is split into two parts. One part is ${a} degrees. How big is the other part?`,
      equation: [a, "+", "?", "=", T],
      visual: { kind: "angle", mode: "parts", angles: [a, T - a] },
      unit: "°",
      hint: `The two parts add up to ${T}°. Subtract the part you know.`,
      explain: `${T}° − ${a}° = ${T - a}°.`,
    },
    T - a,
    [T + a, T - a + 10, T - a - 10, 180 - a],
    0,
    360,
  );
}

export function missingAngle(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const a = rand(20, 160);
    return numQ(
      {
        key: `ma-line-${a}`,
        prompt: "The angles make a straight line. Find the missing angle.",
        speech: `Two angles make a straight line. One is ${a} degrees. What is the other?`,
        equation: [a, "+", "?", "=", 180],
        visual: { kind: "angle", mode: "line", angles: [a] },
        unit: "°",
        hint: "A straight line is 180°.",
        explain: `180° − ${a}° = ${180 - a}°.`,
      },
      180 - a,
      [360 - a, 90 - a > 0 ? 90 - a : 180 - a + 10, 180 - a - 10, a],
      0,
      360,
    );
  }
  if (form === 1) {
    const a = rand(20, 80);
    const b = rand(20, 160 - a - 10);
    return numQ(
      {
        key: `ma-line3-${a}-${b}`,
        prompt: "Three angles make a straight line. Find the missing one.",
        speech: `Three angles make a straight line. Two are ${a} and ${b} degrees. What is the third?`,
        equation: [a, "+", b, "+", "?", "=", 180],
        visual: { kind: "angle", mode: "line", angles: [a, b] },
        unit: "°",
        hint: "All the angles on a straight line add to 180°.",
        explain: `${a}° + ${b}° = ${a + b}°. 180° − ${a + b}° = ${180 - a - b}°.`,
      },
      180 - a - b,
      [360 - a - b, a + b, 180 - a - b + 10, 180 - a - b - 10],
      0,
      360,
    );
  }
  const a = rand(40, 150);
  const b = rand(40, 300 - a - 20);
  return numQ(
    {
      key: `ma-around-${a}-${b}`,
      prompt: "The angles go all the way around. Find the missing one.",
      speech: `Three angles go all the way around a point. Two are ${a} and ${b} degrees. What is the third?`,
      equation: [a, "+", b, "+", "?", "=", 360],
      visual: { kind: "angle", mode: "around", angles: [a, b] },
      unit: "°",
      hint: "All the way around a point is a full turn: 360°.",
      explain: `${a}° + ${b}° = ${a + b}°. 360° − ${a + b}° = ${360 - a - b}°.`,
    },
    360 - a - b,
    [180 - a - b > 0 ? 180 - a - b : a + b, a + b, 360 - a - b + 10, 360 - a - b - 10],
    0,
    360,
  );
}

const LINE_THINGS: [string, "parallel" | "perpendicular" | "intersecting"][] = [
  ["Railroad tracks", "parallel"],
  ["Lines on notebook paper", "parallel"],
  ["The two lines in a + sign", "perpendicular"],
  ["Two edges at the corner of a page", "perpendicular"],
  ["The two lines in the letter X", "intersecting"],
  ["The two long sides of a door", "parallel"],
  ["The two lines in the letter T", "perpendicular"],
  ["Stripes on a flag", "parallel"],
  ["Open scissor blades", "intersecting"],
  ["The two lines in the letter L", "perpendicular"],
  ["The two tall sides of the letter H", "parallel"],
  ["A flagpole and flat ground", "perpendicular"],
];

export function parallelPerp(): Question {
  const labels = ["parallel", "perpendicular", "intersecting"];
  if (Math.random() < 0.35) {
    const type = pick(["parallel", "perpendicular", "intersecting"] as const);
    return fixedQ(
      {
        key: `pp-pic-${type}`,
        prompt: "Which word fits these lines best?",
        visual: { kind: "lines", type },
        needsVisual: true,
        hint: "Parallel lines never meet. Perpendicular lines cross at a square corner. Other crossing lines just intersect.",
        explain:
          type === "parallel" ? "They stay the same distance apart and never meet: parallel." : type === "perpendicular" ? "They cross at a right angle: perpendicular." : "They cross, but not at a square corner: intersecting.",
      },
      labels,
      type,
    );
  }
  const i = rand(0, LINE_THINGS.length - 1);
  const [thing, type] = LINE_THINGS[i];
  return fixedQ(
    {
      key: `pp-real-${i}`,
      prompt: `${thing}: what kind of lines?`,
      speech: `${thing}. Are they parallel, perpendicular, or just intersecting?`,
      hint: "Do they ever meet? If they cross, is it a square corner?",
      explain: type === "parallel" ? "They never meet: parallel." : type === "perpendicular" ? "They meet at a square corner: perpendicular." : "They cross, but not at a square corner: intersecting.",
    },
    labels,
    type,
  );
}

const PARALLEL_PAIRS: [ShapeName, number][] = [
  ["square", 2],
  ["rectangle", 2],
  ["rhombus", 2],
  ["parallelogram", 2],
  ["trapezoid", 1],
  ["triangle", 0],
  ["pentagon", 0],
  ["hexagon", 3],
  ["octagon", 4],
];
const RIGHT_ANGLES: [ShapeName, number][] = [
  ["square", 4],
  ["rectangle", 4],
  ["rhombus", 0],
  ["parallelogram", 0],
  ["trapezoid", 0],
  ["hexagon", 0],
  ["pentagon", 0],
];

export function classifyShapes(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const kind = pick(["right", "acute", "obtuse"]);
    let A: number;
    let B: number;
    if (kind === "right") {
      A = 90;
      B = rand(2, 16) * 5;
    } else if (kind === "obtuse") {
      A = rand(19, 30) * 5;
      B = rand(2, Math.floor((180 - A) / 5) - 2) * 5;
    } else {
      do {
        A = rand(10, 17) * 5;
        B = rand(10, 17) * 5;
      } while (180 - A - B >= 90 || 180 - A - B <= 0);
    }
    const angles = shuffle([A, B, 180 - A - B]);
    return fixedQ(
      {
        key: `cs-tri-${[...angles].sort((x, y) => x - y).join("-")}`,
        prompt: `A triangle has angles ${angles.join("°, ")}°. What kind?`,
        speech: `A triangle has angles of ${angles.join(", ")} degrees. What kind of triangle is it?`,
        hint: "Look for the biggest angle. Is it 90°, more than 90°, or less?",
        explain:
          kind === "right" ? "It has a 90° angle, so it's a right triangle." : kind === "obtuse" ? `It has an angle over 90°, so it's an obtuse triangle.` : "All three angles are less than 90°, so it's an acute triangle.",
      },
      ["right triangle", "acute triangle", "obtuse triangle"],
      `${kind} triangle`,
    );
  }
  if (form === 1) {
    const [shape, pairs] = pick(PARALLEL_PAIRS);
    return numQ(
      {
        key: `cs-par-${shape}`,
        prompt: "How many pairs of parallel sides?",
        speech: `How many pairs of parallel sides does this ${shape} have?`,
        visual: { kind: "shape", shape },
        needsVisual: true,
        hint: "Parallel sides point the same way and never meet. Check each pair of opposite sides.",
        explain: `${cap(an(shape))} has ${pairs} pair${pairs === 1 ? "" : "s"} of parallel sides.`,
      },
      pairs,
      [0, 1, 2, 3, 4].filter((x) => x !== pairs),
      0,
      4,
    );
  }
  const [shape, rights] = pick(RIGHT_ANGLES);
  return numQ(
    {
      key: `cs-right-${shape}`,
      prompt: "How many right angles does this shape have?",
      speech: `How many right angles, or square corners, does this ${shape} have?`,
      visual: { kind: "shape", shape },
      needsVisual: true,
      hint: "A right angle is a square corner. Check each corner.",
      explain: rights ? `All 4 corners of ${an(shape)} are square: ${rights} right angles.` : `None of the corners of this ${shape} are square corners.`,
    },
    rights,
    [0, 1, 2, 4].filter((x) => x !== rights),
    0,
    4,
  );
}

const SYM_SHAPES: [ShapeName, number][] = [
  ["square", 4],
  ["rectangle", 2],
  ["rhombus", 2],
  ["parallelogram", 0],
  ["trapezoid", 1],
  ["pentagon", 5],
  ["hexagon", 6],
  ["octagon", 8],
];
const SYM_LETTERS: [string, number][] = [
  ["A", 1], ["B", 1], ["C", 1], ["D", 1], ["E", 1], ["F", 0], ["G", 0], ["H", 2], ["I", 2], ["J", 0], ["L", 0],
  ["M", 1], ["N", 0], ["P", 0], ["R", 0], ["S", 0], ["T", 1], ["U", 1], ["V", 1], ["W", 1], ["X", 2], ["Y", 1], ["Z", 0],
];

export function symmetry(): Question {
  if (Math.random() < 0.5) {
    const [shape, lines] = pick(SYM_SHAPES);
    return numQ(
      {
        key: `sym-shape-${shape}`,
        prompt: "How many lines of symmetry does this shape have?",
        visual: { kind: "shape", shape },
        needsVisual: true,
        hint: "A line of symmetry folds the shape into two halves that match exactly. Try every way to fold it.",
        explain: lines ? `${cap(an(shape))} can be folded to match in ${lines} way${lines === 1 ? "" : "s"}.` : `${cap(an(shape))} can't be folded so the halves match: 0 lines.`,
      },
      lines,
      [lines + 1, lines - 1, lines * 2, 0, 1],
      0,
      10,
    );
  }
  const [letter, lines] = pick(SYM_LETTERS);
  return numQ(
    {
      key: `sym-letter-${letter}`,
      prompt: `How many lines of symmetry does the letter ${letter} have?`,
      hint: "Picture folding the letter up-and-down or side-to-side. Do the halves match?",
      explain: lines === 0 ? `No fold makes the two halves of ${letter} match: 0 lines.` : lines === 1 ? `${letter} has 1 line of symmetry.` : `${letter} folds to match both up-and-down and side-to-side: 2 lines.`,
    },
    lines,
    [0, 1, 2, 4].filter((x) => x !== lines),
    0,
    4,
  );
}

/* ======================================================================
 * Expansion: hands-on "Do it" activities and extra strategy lessons.
 * ==================================================================== */

/* ------------------------------------------------------------ W1 Times */

export function buildArrayAct(): Question {
  const rows = rand(2, 8);
  const cols = rand(2, 8);
  const thing = pick(["chairs", "stamps", "tiles", "cupcakes", "plants"]);
  return doQ(
    {
      key: `bar-${rows}-${cols}`,
      prompt: pick([`Build ${rows} rows of ${cols}.`, `Make an array for ${rows} × ${cols}.`, `Set out ${rows} rows of ${cols} ${thing}.`]),
      speech: `Build an array with ${rows} rows and ${cols} in each row.`,
      hint: "Rows go across. Set the number of rows first, then how many go in each row.",
      explain: `${rows} rows of ${cols} make ${rows} × ${cols} = ${rows * cols}.`,
    },
    { kind: "buildArray", rows, cols },
    rows * cols,
  );
}

export function spotTimesMistake(): Question {
  const a = rand(3, 9);
  const b = rand(3, 9);
  const bad = a * b + pick([-a, a, -b, b, 1, -1, 10, -10].filter((x) => a * b + x > 0));
  const truths = new Set<string>();
  while (truths.size < 3) {
    const x = rand(2, 9);
    const y = rand(2, 9);
    if (!(x === a && y === b)) truths.add(`${x} × ${y} = ${x * y}`);
  }
  return textQ(
    {
      key: `stm-${a}-${b}-${bad}`,
      prompt: pick(["One fact is wrong. Which one?", "Spot the mistake! Which fact is wrong?"]),
      hint: "Check each fact with one you're sure of, like a ×5 or ×10 fact, then adjust.",
      explain: `${a} × ${b} is really ${a * b}, not ${bad}. The other facts are right.`,
    },
    `${a} × ${b} = ${bad}`,
    [...truths],
  );
}

/* ----------------------------------------------------------- W2 Divide */

export function divArrayAct(): Question {
  const rows = rand(2, 6);
  const cols = rand(2, 9);
  const total = rows * cols;
  return doQ(
    {
      key: `dar-${rows}-${cols}`,
      prompt: `Put ${total} dots in ${rows} equal rows.`,
      speech: `Build an array with ${total} dots in ${rows} equal rows. How many go in each row?`,
      equation: [total, "÷", rows, "=", "?"],
      hint: `Set ${rows} rows. Then make the rows longer until there are ${total} dots in all.`,
      explain: `${rows} rows of ${cols} make ${total}, so ${total} ÷ ${rows} = ${cols}.`,
    },
    { kind: "buildArray", rows, cols },
    cols,
  );
}

const PRODUCTS = [12, 16, 18, 20, 24, 30, 36, 40, 42, 48];
function factsFor(P: number, k: number): string[] {
  const all: string[] = [];
  for (let a = 2; a <= 10; a++) if (P % a === 0 && P / a >= 2 && P / a <= 10) all.push(`${a} × ${P / a}`);
  return shuffle(all).slice(0, k);
}

export function sortFacts(): Question {
  const prods = shuffle(PRODUCTS).slice(0, 3).sort((x, y) => x - y);
  const items = prods.flatMap((P, bin) => factsFor(P, 2).map((label) => ({ label, bin })));
  return doQ(
    {
      key: `sfa-${prods.join("-")}`,
      prompt: "Sort each times fact by its answer.",
      speech: "Work out each times fact, then put it in the bin with its answer.",
      hint: "Work out each fact. Turn-around facts like 3 × 4 and 4 × 3 go in the same bin.",
      explain: prods.map((P, bin) => `${P}: ${items.filter((it) => it.bin === bin).map((it) => it.label).join(", ")}`).join(". ") + ".",
    },
    { kind: "sort", bins: prods.map(String), items: shuffle(items) },
    items.length,
  );
}

export function storyEquation(): Question {
  const a = rand(2, 9);
  const b = rand(2, 9);
  const p = a * b;
  const k = rand(1, 9);
  const form = rand(0, 4);
  const thing = pick(["apples", "cards", "stickers", "shells", "marbles"]);
  const forms: { prompt: string; right: string; wrong: string[]; why: string }[] = [
    {
      prompt: `${a} bags with ${b} ${thing} in each. How many ${thing}?`,
      right: `${a} × ${b} = n`,
      wrong: [`${a} + ${b} = n`, `${b} − ${a} = n`, `${a} ÷ ${b} = n`],
      why: `Equal groups put together: ${a} × ${b} = n, so n = ${p}.`,
    },
    {
      prompt: `${p} ${thing} shared by ${a} kids. How many each?`,
      right: `${p} ÷ ${a} = n`,
      wrong: [`${p} × ${a} = n`, `${p} − ${a} = n`, `${p} + ${a} = n`],
      why: `Sharing into equal groups is dividing: ${p} ÷ ${a} = n, so n = ${b}.`,
    },
    {
      prompt: `${p} ${thing}, ${b} in each box. How many boxes?`,
      right: `${p} ÷ ${b} = n`,
      wrong: [`${p} × ${b} = n`, `${p} − ${b} = n`, `${b} ÷ ${p} = n`],
      why: `Making groups of ${b} is dividing: ${p} ÷ ${b} = n, so n = ${a}.`,
    },
    {
      prompt: `${a} packs of ${b} ${thing}, then ${k} more. How many?`,
      right: `${a} × ${b} + ${k} = n`,
      wrong: [`${a} + ${b} + ${k} = n`, `${a} × ${b} − ${k} = n`, `${a} × ${k} + ${b} = n`],
      why: `First the packs, ${a} × ${b}, then add ${k}: n = ${p + k}.`,
    },
    {
      prompt: `${a} equal rows hold ${p} ${thing}. How many in a row?`,
      right: `${a} × n = ${p}`,
      wrong: [`n = ${a} × ${p}`, `${a} + n = ${p}`, `n − ${a} = ${p}`],
      why: `${a} rows of n make ${p}: ${a} × n = ${p}, so n = ${b}.`,
    },
  ];
  const f = forms[form];
  return textQ(
    {
      key: `seq-${form}-${a}-${b}-${form === 3 ? k : 0}`,
      prompt: f.prompt,
      speech: `${f.prompt} Which equation matches? The letter n stands for the number we don't know.`,
      hint: "Equal groups joined: multiply. Shared or grouped: divide. The letter n is the unknown.",
      explain: f.why,
    },
    f.right,
    f.wrong,
  );
}

/* --------------------------------------------------------- W3 Hundreds */

export function placeHundreds(): Question {
  if (Math.random() < 0.5) {
    let n: number;
    do n = rand(101, 989);
    while (n % 10 === 0);
    const lo = Math.floor(n / 10) * 10;
    const r = n - lo >= 5 ? lo + 10 : lo;
    return doQ(
      {
        key: `ph-10-${n}`,
        prompt: `Put ${n} on the number line.`,
        speech: `Drag the marker to ${n}. Then think: which ten is it closest to?`,
        hint: `Count on from ${lo}: each mark is 1.`,
        explain: `${n} is ${n - lo} past ${lo}, so it's closest to ${r}. ${n} rounds to ${r}.`,
      },
      { kind: "placeOnLine", min: lo, max: lo + 10, step: 1, labelStep: 5, target: n },
      n,
    );
  }
  const lo = rand(1, 8) * 100;
  const n = lo + rand(1, 19) * 5;
  const r = n - lo >= 50 ? lo + 100 : lo;
  return doQ(
    {
      key: `ph-100-${n}`,
      prompt: `Put ${n} on the number line.`,
      speech: `Drag the marker to ${n}. Then think: which hundred is it closest to?`,
      hint: `Each small mark is 5. The middle of the line is ${lo + 50}.`,
      explain: `${n} is ${n - lo} past ${lo}${n - lo >= 50 ? ", at or past halfway" : ", before halfway"}, so it rounds to ${r}.`,
    },
    { kind: "placeOnLine", min: lo, max: lo + 100, step: 5, labelStep: 50, target: n },
    n,
  );
}

export function buildSumBlocks(): Question {
  const add = Math.random() < 0.6;
  let a: number;
  let b: number;
  let t: number;
  do {
    a = rand(120, 780);
    b = add ? rand(15, 999 - a) : rand(15, a - 10);
    t = add ? a + b : a - b;
  } while (add ? (a % 10) + (b % 10) < 10 && (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) < 10 : a % 10 >= b % 10);
  return doQ(
    {
      key: `bsb-${add ? "a" : "s"}-${a}-${b}`,
      prompt: `Show ${a} ${add ? "+" : "−"} ${b} with the fewest blocks.`,
      speech: `Work out ${a} ${add ? "plus" : "minus"} ${b}, then build the answer with the fewest blocks.`,
      equation: [a, add ? "+" : "−", b, "=", "?"],
      hint: add ? "Add each place. If you get 10 or more of one block, trade them for 1 of the next block." : "Not enough ones? Trade 1 ten for 10 ones, then take away.",
      explain: `${a} ${add ? "+" : "−"} ${b} = ${t}: ${plural(Math.floor(t / 100), "hundred")}, ${plural(Math.floor(t / 10) % 10, "ten")} and ${plural(t % 10, "one")}.`,
    },
    { kind: "buildBlocks", target: t, fewest: true },
    t,
  );
}

export function mentalMath3(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const r = rand(1, 3);
    const a = rand(1, 6) * 100 - r;
    const b = rand(120, 899 - a);
    return numQ(
      {
        key: `mm3-make-${a}-${b}`,
        prompt: "Make a hundred first! What's missing?",
        speech: `${a} plus ${b}. Move ${r} over to make ${a + r}. ${a + r} plus what?`,
        equation: [a, "+", b, "=", a + r, "+", "?"],
        hint: `${a} needs ${r} more to make ${a + r}. Take that ${r} from ${b}.`,
        explain: `${a} + ${b} = ${a + r} + ${b - r} = ${a + b}.`,
      },
      b - r,
      [b + r, b, b - r - 1, b - r + 1],
      0,
      1000,
    );
  }
  if (form === 1) {
    const r = rand(1, 3);
    const b = rand(1, 6) * 100 - r;
    const a = rand(b + 20, 999);
    return typeQ(
      {
        key: `mm3-sub-${a}-${b}`,
        prompt: "Use a nearby hundred to subtract.",
        speech: `${a} minus ${b}. Hint: ${b} is ${r} less than ${b + r}.`,
        equation: [a, "−", b, "=", "?"],
        hint: `Take away ${b + r} instead, then add ${r} back.`,
        explain: `${a} − ${b + r} = ${a - b - r}, then add back ${r}: ${a - b}.`,
      },
      a - b,
    );
  }
  const a = rand(110, 680);
  const step = pick([100, 200, 300, 10, 20, 50]);
  const add = Math.random() < 0.6 || a < step + 10;
  return typeQ(
    {
      key: `mm3-jump-${a}-${step}-${add ? "a" : "s"}`,
      prompt: pick(["Do it in your head!", "Mental math: what's the answer?"]),
      speech: `${a} ${add ? "plus" : "minus"} ${step}?`,
      equation: [a, add ? "+" : "−", step, "=", "?"],
      hint: step >= 100 ? "Only the hundreds digit changes (unless you cross 1,000)." : "Count by tens. Watch for the tens crossing into the next hundred.",
      explain: `${a} ${add ? "+" : "−"} ${step} = ${add ? a + step : a - step}.`,
    },
    add ? a + step : a - step,
  );
}

/** Adds without carrying, or subtracts smaller-from-larger in every place: the classic slips. */
function slipAdd(a: number, b: number) {
  const s = String(Math.max(a, b)).length;
  let out = "";
  for (let i = 0; i < s; i++) out = String((Math.floor(a / 10 ** i) % 10 + Math.floor(b / 10 ** i) % 10) % 10) + out;
  return Number(out);
}
function slipSub(a: number, b: number) {
  const s = String(a).length;
  let out = "";
  for (let i = 0; i < s; i++) out = String(Math.abs((Math.floor(a / 10 ** i) % 10) - (Math.floor(b / 10 ** i) % 10))) + out;
  return Number(out);
}

function fixSlip(minA: number, maxA: number, tag: string): Question {
  const name = pick(NAMES);
  for (;;) {
    const add = Math.random() < 0.5;
    const a = rand(minA, maxA);
    const lo = Math.floor(minA / (add ? 2 : 3));
    const hi = add ? Math.min(maxA, 10 ** String(maxA).length - 1 - a) : a - 1;
    if (hi < lo) continue;
    const b = rand(lo, hi);
    const right = add ? a + b : a - b;
    const wrong = add ? slipAdd(a, b) : slipSub(a, b);
    if (wrong === right || right <= 0) continue;
    return typeQ(
      {
        key: `fix${tag}-${add ? "a" : "s"}-${a}-${b}`,
        prompt: `${name} says ${comma(a)} ${add ? "+" : "−"} ${comma(b)} = ${comma(wrong)}. What's right?`,
        speech: `${name} says ${comma(a)} ${add ? "plus" : "minus"} ${comma(b)} is ${comma(wrong)}. That's not right. What is the real answer?`,
        equation: [a, add ? "+" : "−", b, "=", "?"],
        hint: add ? "Estimate first. Then add again, carrying when a place makes 10 or more." : "Estimate first. When a top digit is smaller, regroup — don't flip the digits.",
        explain: add
          ? `${name} forgot to carry. ${comma(a)} + ${comma(b)} = ${comma(right)}.`
          : `${name} took the smaller digit from the bigger one in each place instead of regrouping. ${comma(a)} − ${comma(b)} = ${comma(right)}.`,
      },
      right,
    );
  }
}
export const fixAddSub3 = () => fixSlip(120, 899, "3");

/* -------------------------------------------------------- W4 Fractions */

export function shadeFraction(): Question {
  const d = pick(G3_DENS);
  const n = rand(1, d - 1);
  const shape: "bar" | "pie" = pick(["bar", "pie"]);
  const k = Math.random() < 0.3 && d * 2 <= 12 ? 2 : 1;
  return doQ(
    {
      key: `shf-${n}-${d}-${k}-${shape}`,
      prompt: k === 1 ? `Shade ${n}/${d} of the ${shape === "bar" ? "bar" : "circle"}.` : `This ${shape === "bar" ? "bar" : "circle"} has ${d * k} parts. Shade ${n}/${d} of it.`,
      speech: `Shade ${sayFrac(n, d)} of the ${shape === "bar" ? "bar" : "circle"}.`,
      hint: k === 1 ? `The whole has ${d} equal parts. Shade ${n} of them.` : `Each 1/${d} is ${k} of these small parts.`,
      explain: k === 1 ? `${n}/${d} means ${n} of ${d} equal parts.` : `${n}/${d} = ${n * k}/${d * k}, so shade ${n * k} small parts.`,
    },
    { kind: "shade", parts: d * k, target: n * k, shape },
    n * k,
  );
}

export function cutShape(): Question {
  if (Math.random() < 0.6) {
    const shape: "rect" | "circle" = pick(["rect", "circle"]);
    const d = pick(shape === "rect" ? [2, 3, 4, 5, 6, 8, 10, 12] : [2, 3, 4, 6, 8]);
    const ask = Math.random() < 0.5;
    return doQ(
      {
        key: `cut-${shape}-${d}-${ask ? 1 : 0}`,
        prompt: ask ? `Cut the ${shape === "rect" ? "rectangle" : "circle"} so each part is 1/${d}.` : `Cut the ${shape === "rect" ? "rectangle" : "circle"} into ${d} equal parts.`,
        speech: ask ? `Cut the shape so that each part is ${sayFrac(1, d)} of the whole.` : `Cut the shape into ${d} equal parts.`,
        hint: "Equal parts are all the same size. The bottom number of a unit fraction tells how many parts.",
        explain: `${d} equal parts: each one is 1/${d} of the whole.`,
      },
      { kind: "cut", shape, parts: d },
      d,
    );
  }
  const rows = rand(1, 4);
  const cols = rand(2, 4);
  return doQ(
    {
      key: `cut-grid-${rows}-${cols}`,
      prompt: `Cut the rectangle into ${rows} row${rows === 1 ? "" : "s"} of ${cols} equal parts.`,
      speech: `Cut the rectangle into ${rows} rows and ${cols} columns. What fraction is each part?`,
      hint: "Set the rows, then the columns. Count all the parts you made.",
      explain: `${rows} × ${cols} = ${rows * cols} equal parts, so each part is 1/${rows * cols} of the rectangle.`,
    },
    { kind: "cut", shape: "rect", rows, cols },
    rows * cols,
  );
}

export function placeFraction(): Question {
  const d = pick(G3_DENS);
  const max = d <= 4 && Math.random() < 0.4 ? 2 : 1;
  const n = Math.random() < 0.25 ? 1 : rand(1, d * max - 1);
  return doQ(
    {
      key: `pf-${n}-${d}-${max}`,
      prompt: `Put ${n}/${d} on the number line.`,
      speech: `Drag the marker to ${sayFrac(n, d)}.`,
      hint: `Each whole is cut into ${d} equal jumps. Count ${n} jump${n === 1 ? "" : "s"} from 0.`,
      explain: `${n}/${d} is ${n} jump${n === 1 ? "" : "s"} of 1/${d} from 0.${n > d ? ` That's past 1, at ${mixedText(Math.floor(n / d), n % d, d)}.` : ""}`,
    },
    { kind: "placeOnLine", min: 0, max, step: 1 / d, labelStep: 1, target: n / d, fractions: d },
    n / d,
  );
}

export function fractionStories3(): Question {
  const [A, B] = twoNames();
  const d = pick(G3_DENS);
  const form = rand(0, 2);
  if (form < 2) {
    const n = rand(1, d - 1);
    const thing = pick([["pizza", "slices"], ["cake", "pieces"], ["chocolate bar", "squares"], ["pie", "slices"]]);
    const left = form === 1;
    return textQ(
      {
        key: `fs3-${form}-${n}-${d}`,
        prompt: `A ${thing[0]} has ${d} equal ${thing[1]}. ${A} eats ${n}. What fraction is ${left ? "left" : "eaten"}?`,
        visual: { kind: "fractions", bars: [{ parts: d, a: n, shape: thing[0] === "chocolate bar" ? "bar" : "pie" }] },
        hint: `The whole is ${d} ${thing[1]}, so the bottom number is ${d}. Count the ${left ? "ones left" : "ones eaten"}.`,
        explain: left ? `${d} − ${n} = ${d - n} ${thing[1]} are left: ${d - n}/${d}.` : `${A} ate ${n} of ${d} ${thing[1]}: ${n}/${d}.`,
      },
      fracText(left ? d - n : n, d),
      shuffle([fracText(left ? n : d - n, d), fracText(d, left ? d - n : n), fracText(left ? d - n : n, d + 1)]),
    );
  }
  const same = Math.random() < 0.5;
  let n1: number;
  let n2: number;
  let d1: number;
  let d2: number;
  if (same) {
    d1 = d2 = d;
    n1 = rand(1, d - 1);
    do n2 = rand(1, d - 1);
    while (n2 === n1 && d > 2);
    if (n1 === n2) [n1, n2, d1, d2] = [1, 1, 2, 4];
  } else {
    [d1, d2] = shuffle(G3_DENS).slice(0, 2);
    n1 = n2 = 1;
  }
  const first = n1 * d2 > n2 * d1;
  return fixedQ(
    {
      key: `fs3-race-${n1}-${d1}-${n2}-${d2}`,
      prompt: `${A} ran ${n1}/${d1} mile. ${B} ran ${n2}/${d2} mile. Who ran farther?`,
      speech: `${A} ran ${sayFrac(n1, d1)} of a mile. ${B} ran ${sayFrac(n2, d2)} of a mile. Who ran farther?`,
      visual: { kind: "fractions", bars: [{ parts: d1, a: n1, label: A }, { parts: d2, a: n2, label: B }] },
      hint: d1 === d2 ? "Same size parts: more parts is farther." : "Same number of parts: fewer, bigger parts is farther.",
      explain: `${fracText(n1, d1)} ${first ? ">" : "<"} ${fracText(n2, d2)}, so ${first ? A : B} ran farther.`,
    },
    [A, B],
    first ? A : B,
  );
}

/* --------------------------------------------------- W5 Time & measure */

export function setClockAct(): Question {
  const h = rand(1, 12);
  const m = rand(0, 59);
  if (Math.random() < 0.6)
    return doQ(
      {
        key: `sc-${h}-${m}`,
        prompt: `Show ${clockText(h, m)} on the clock.`,
        speech: `Set the clock to ${clockText(h, m)}.`,
        hint: "Tap the hour first. Then drag the long hand: count by 5s at the numbers, then 1s.",
        explain: `The long hand points to ${m} minutes${m % 5 ? ` (${Math.floor(m / 5) * 5} and ${m % 5} more)` : ""}, and the short hand is ${m >= 30 ? `almost at ${(h % 12) + 1}` : `just past ${h}`}.`,
      },
      { kind: "setClock", h, m, snap: 1 },
      m,
    );
  const d = rand(6, 50);
  const start = (h % 12) * 60 + m;
  const end = start + d;
  const mins = ((end % 720) + 720) % 720;
  const eh = Math.floor(mins / 60) || 12;
  const em = mins % 60;
  return doQ(
    {
      key: `sc-later-${h}-${m}-${d}`,
      prompt: `It's ${clockText(h, m)}. Show the time ${d} minutes later.`,
      speech: `It is ${clockText(h, m)} now. Show what time it will be ${d} minutes later.`,
      hint: "Count on from now. If you pass the 12, move to the next hour.",
      explain: `${clockText(h, m)} + ${d} minutes = ${clockText(eh, em)}.`,
    },
    { kind: "setClock", h: eh, m: em, snap: 1 },
    em,
  );
}

export function barGraphAct(): Question {
  const si = rand(0, BAR_SETS.length - 1);
  const set = BAR_SETS[si];
  const step = pick([2, 5, 10]);
  const n = rand(3, 4);
  const labels = set.items.slice(0, n);
  const values = labels.map(() => step * rand(1, 9));
  return doQ(
    {
      key: `bga-${si}-${step}-${values.join(".")}`,
      prompt: `Make a bar graph of the votes. The lines go up by ${step}s.`,
      speech: `Use the table to make a bar graph. Each line on the graph is worth ${step}.`,
      visual: { kind: "table", header: labels, rows: [values] },
      hint: `Drag each bar up, counting by ${step}s, until it matches the table.`,
      explain: labels.map((l, i) => `${l}: ${values[i]}`).join(", ") + ".",
    },
    { kind: "barGraph", title: set.title, items: labels.map((label, i) => ({ label, value: values[i] })), max: step * 10, step, hideData: true },
    values[0],
  );
}

export function makeLengthAct(): Question {
  const w = rand(1, 7);
  const r = rand(0, 3);
  const q4 = w * 4 + r;
  return doQ(
    {
      key: `mla-${q4}`,
      prompt: `Make a bar ${quarterText(q4)} inch${q4 === 4 ? "" : "es"} long.`,
      speech: `Drag the end of the bar to make it ${sayQuarters(q4)} inches long.`,
      hint: "Find the whole inch first. Each inch has 4 quarter marks.",
      explain: `${quarterText(q4)} inch${q4 === 4 ? "" : "es"} is ${w} whole inch${w === 1 ? "" : "es"}${r ? ` and ${r === 2 ? "a half" : `${r} quarter${r === 1 ? "" : "s"}`} more` : ""}.`,
    },
    { kind: "makeLength", length: q4 / 4, unit: "in", sub: 4 },
    q4 / 4,
  );
}

export function dotPlotAct3(): Question {
  const w = rand(1, 3);
  const spots = shuffle([0, 1, 2, 3, 4]).slice(0, rand(3, 4)).sort((x, y) => x - y);
  const counts = spots.map(() => rand(1, 4));
  const values = spots.flatMap((s, k) => Array<number>(counts[k]).fill(w + s / 4));
  return doQ(
    {
      key: `dpa3-${w}-${spots.join(".")}-${counts.join(".")}`,
      prompt: "Make a line plot of the pencil lengths.",
      speech: "Use the table to make a line plot. Put one dot for each pencil.",
      visual: { kind: "table", header: ["Length (in)", "Pencils"], rows: spots.map((s, k) => [quarterText(w * 4 + s), counts[k]]) },
      hint: "For each length, put one dot above it for every pencil.",
      explain: `${spots.map((s, k) => `${counts[k]} dot${counts[k] === 1 ? "" : "s"} at ${quarterText(w * 4 + s)}`).join(", ")}: ${values.length} dots in all.`,
    },
    { kind: "dotPlot", values, min: w, max: w + 1, step: 0.25, label: "Pencil lengths (inches)" },
    values.length,
  );
}

/* ---------------------------------------------------- W6 Area & shapes */

export function drawAreaRect(): Question {
  const w = rand(2, 7);
  const h = rand(2, 7);
  const square = w === h;
  return doQ(
    {
      key: `dar3-${Math.min(w, h)}x${Math.max(w, h)}`,
      prompt: square && Math.random() < 0.5 ? `Draw a square with an area of ${w * h} squares.` : `Draw a rectangle with an area of ${w * h} squares.`,
      speech: `Tap corners on the dot grid to draw a rectangle that covers ${w * h} unit squares.`,
      hint: `Think of a times fact that makes ${w * h}. The two numbers can be the sides.`,
      explain: `For example, ${w} × ${h} = ${w * h}, so a ${w} by ${h} rectangle works.`,
    },
    { kind: "drawShape", size: 8, sides: 4, rightAngles: 4, area: w * h },
    w * h,
  );
}

export function drawPerimRect(): Question {
  const w = rand(1, 6);
  const h = rand(1, 6);
  const P = 2 * (w + h);
  const both = Math.random() < 0.4;
  return doQ(
    {
      key: `dpr-${both ? `${Math.min(w, h)}x${Math.max(w, h)}` : P}`,
      prompt: both ? `Draw a rectangle with perimeter ${P} and area ${w * h}.` : `Draw a rectangle with a perimeter of ${P} units.`,
      speech: both ? `Draw a rectangle that is ${P} units all the way around and covers ${w * h} squares.` : `Draw a rectangle that is ${P} units all the way around.`,
      hint: `Half the perimeter, ${P / 2}, is one long side plus one short side.`,
      explain: both ? `A ${w} by ${h} rectangle: ${w} + ${h} + ${w} + ${h} = ${P}, and ${w} × ${h} = ${w * h}.` : `For example ${w} by ${h}: ${w} + ${h} + ${w} + ${h} = ${P}.`,
    },
    { kind: "drawShape", size: 8, sides: 4, rightAngles: 4, perimeter: P, ...(both ? { area: w * h } : {}) },
    P,
  );
}

const QUAD_TASKS: { prompt: string; spec: { rightAngles?: number; equalSides?: boolean; parallelPairs?: number }; why: string }[] = [
  { prompt: "Draw a square.", spec: { rightAngles: 4, equalSides: true }, why: "A square has 4 equal sides and 4 right angles." },
  { prompt: "Draw a rectangle.", spec: { rightAngles: 4 }, why: "A rectangle has 4 right angles." },
  { prompt: "Draw a rhombus: 4 equal sides.", spec: { equalSides: true }, why: "A rhombus has 4 equal sides. A square is a rhombus too!" },
  { prompt: "Draw a parallelogram.", spec: { parallelPairs: 2 }, why: "A parallelogram has 2 pairs of parallel sides." },
  { prompt: "Draw a quadrilateral with exactly 1 pair of parallel sides.", spec: { parallelPairs: 1 }, why: "That shape is a trapezoid: just one pair of sides is parallel." },
  { prompt: "Draw a quadrilateral with no parallel sides.", spec: { parallelPairs: 0 }, why: "Some quadrilaterals aren't squares, rectangles or rhombuses at all." },
  { prompt: "Draw a quadrilateral with no right angles.", spec: { rightAngles: 0 }, why: "Lots of quadrilaterals have no square corners." },
];

export function drawQuad(): Question {
  const i = rand(0, QUAD_TASKS.length - 1);
  const t = QUAD_TASKS[i];
  const size = pick([6, 7, 8]);
  return doQ(
    {
      key: `dq-${i}-${size}`,
      prompt: t.prompt,
      speech: `${t.prompt} Tap the corners on the dot grid, then tap the first corner again to close it.`,
      hint: "A quadrilateral has 4 straight sides. Parallel sides point the same way; right angles are square corners.",
      explain: t.why,
    },
    { kind: "drawShape", size, sides: 4, ...t.spec },
    4,
  );
}

/* ------------------------------------------------------ W7 Big numbers */

export function orderBig(): Question {
  const digits = rand(4, 6);
  const base = rand(10 ** (digits - 1), 10 ** digits - 1);
  const nums = new Set<number>([base]);
  while (nums.size < rand(4, 5)) {
    const s = String(base).split("");
    const i = rand(1, s.length - 1);
    const j = rand(1, s.length - 1);
    s[i] = String(rand(0, 9));
    if (Math.random() < 0.5) [s[i], s[j]] = [s[j], s[i]];
    nums.add(Number(s.join("")));
  }
  const up = Math.random() < 0.6;
  const sorted = [...nums].sort((x, y) => (up ? x - y : y - x));
  return doQ(
    {
      key: `ob-${up ? "u" : "d"}-${[...sorted].sort((x, y) => x - y).join("-")}`,
      prompt: `Put the numbers in order, ${up ? "smallest to largest" : "largest to smallest"}.`,
      hint: "Line up the places. Compare digits from the left; the first different digit decides.",
      explain: sorted.map(comma).join(up ? " < " : " > ") + ".",
    },
    { kind: "order", items: sorted.map(comma), direction: up ? "smallest to largest" : "largest to smallest" },
    sorted[0],
  );
}

export function estimateBig(): Question {
  const r1000 = (x: number) => Math.round(x / 1000) * 1000;
  const form = rand(0, 2);
  const a = rand(1500, 8499);
  const b = rand(1500, 8499);
  if (form === 0) {
    const est = r1000(a) + r1000(b);
    return numQ(
      {
        key: `eb-add-${a}-${b}`,
        prompt: `About how much is ${comma(a)} + ${comma(b)}?`,
        speech: `About how much is ${comma(a)} plus ${comma(b)}? Round to the nearest thousand first.`,
        hint: "Round each number to the nearest thousand, then add.",
        explain: `${comma(a)} ≈ ${comma(r1000(a))} and ${comma(b)} ≈ ${comma(r1000(b))}. ${comma(r1000(a))} + ${comma(r1000(b))} = ${comma(est)}.`,
      },
      est,
      [est - 1000, est + 1000, est + 2000],
      0,
      30000,
    );
  }
  if (form === 1) {
    let [x, y] = a >= b ? [a, b] : [b, a];
    if (r1000(x) - r1000(y) < 1000) x += 2000;
    const est = r1000(x) - r1000(y);
    return numQ(
      {
        key: `eb-sub-${x}-${y}`,
        prompt: `About how much is ${comma(x)} − ${comma(y)}?`,
        speech: `About how much is ${comma(x)} minus ${comma(y)}? Round to the nearest thousand first.`,
        hint: "Round each number to the nearest thousand, then subtract.",
        explain: `${comma(x)} ≈ ${comma(r1000(x))} and ${comma(y)} ≈ ${comma(r1000(y))}. ${comma(r1000(x))} − ${comma(r1000(y))} = ${comma(est)}.`,
      },
      est,
      [est + 1000, est + 2000, est - 1000],
      0,
      30000,
    );
  }
  const exact = a + b;
  const off = pick([0, 0, 1000, -1000, 2000]);
  const name = pick(NAMES);
  return fixedQ(
    {
      key: `eb-check-${a}-${b}-${off}`,
      prompt: `${name} says ${comma(a)} + ${comma(b)} = ${comma(exact + off)}. Reasonable?`,
      speech: `${name} says ${comma(a)} plus ${comma(b)} is ${comma(exact + off)}. Does that make sense?`,
      hint: "Round both numbers to the nearest thousand and add. Is the answer close to that?",
      explain: `${comma(r1000(a))} + ${comma(r1000(b))} = ${comma(r1000(a) + r1000(b))}. The real sum is ${comma(exact)}.`,
    },
    ["Yes, it's close", "No, it's way off"],
    off === 0 ? "Yes, it's close" : "No, it's way off",
  );
}

export const fixBig = () => fixSlip(10000, 99999, "4");

/* ----------------------------------------------------- W8 Multiply big */

export function estimateProducts(): Question {
  const r10 = (x: number) => Math.round(x / 10) * 10;
  const r100 = (x: number) => Math.round(x / 100) * 100;
  if (Math.random() < 0.5) {
    const a = rand(12, 98);
    const b = rand(12, 98);
    const est = r10(a) * r10(b);
    return numQ(
      {
        key: `ep-22-${a}-${b}`,
        prompt: `About how much is ${a} × ${b}?`,
        speech: `About how much is ${a} times ${b}? Round each to the nearest ten first.`,
        hint: "Round each number to the nearest ten. Then multiply the tens.",
        explain: `${a} ≈ ${r10(a)} and ${b} ≈ ${r10(b)}. ${r10(a)} × ${r10(b)} = ${comma(est)}.`,
      },
      est,
      [est * 10, est / 10, r10(a) * r10(b) + r10(a) * 10, r10(a) + r10(b)].filter(Number.isInteger),
      0,
      100000,
    );
  }
  const a = rand(120, 949);
  const b = rand(3, 9);
  const est = r100(a) * b;
  return numQ(
    {
      key: `ep-31-${a}-${b}`,
      prompt: `About how much is ${a} × ${b}?`,
      speech: `About how much is ${a} times ${b}? Round to the nearest hundred first.`,
      hint: "Round the big number to the nearest hundred. Then multiply.",
      explain: `${a} ≈ ${r100(a)}. ${r100(a)} × ${b} = ${comma(est)}.`,
    },
    est,
    [est + 100 * b, Math.max(100, est - 100 * b), est * 10],
    0,
    100000,
  );
}

export function fixProduct(): Question {
  const name = pick(NAMES);
  for (;;) {
    if (Math.random() < 0.5) {
      const a = rand(12, 99);
      const b = rand(3, 9);
      const ones = (a % 10) * b;
      const wrong = Number(`${Math.floor(a / 10) * b}${ones % 10}`);
      if (ones < 10 || wrong === a * b) continue;
      return typeQ(
        {
          key: `fp-carry-${a}-${b}`,
          prompt: `${name} says ${a} × ${b} = ${wrong}. What's right?`,
          speech: `${name} says ${a} times ${b} is ${wrong}. What is the real answer?`,
          equation: [a, "×", b, "=", "?"],
          hint: `${a % 10} × ${b} = ${ones}. Where do the ${Math.floor(ones / 10)} tens go?`,
          explain: `${name} forgot to carry the ${Math.floor(ones / 10)} tens. ${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}, plus ${ones} is ${a * b}.`,
        },
        a * b,
      );
    }
    const a = rand(12, 99);
    const b = rand(12, 99);
    if (b % 10 === 0) continue;
    const wrong = a * (b % 10) + a * Math.floor(b / 10);
    return typeQ(
      {
        key: `fp-tens-${a}-${b}`,
        prompt: `${name} says ${a} × ${b} = ${comma(wrong)}. What's right?`,
        speech: `${name} says ${a} times ${b} is ${wrong}. What is the real answer?`,
        equation: [a, "×", b, "=", "?"],
        hint: `The ${Math.floor(b / 10)} in ${b} means ${Math.floor(b / 10) * 10}. Did ${name} multiply by tens?`,
        explain: `${name} used ${a} × ${Math.floor(b / 10)} instead of ${a} × ${Math.floor(b / 10) * 10}. ${a} × ${b % 10} = ${a * (b % 10)} and ${a} × ${Math.floor(b / 10) * 10} = ${comma(a * Math.floor(b / 10) * 10)}, so ${comma(a * b)}.`,
      },
      a * b,
    );
  }
}

export function doubleHalve(): Question {
  const a = pick([5, 15, 25, 35, 45, 50, 125]);
  const b = 2 * rand(2, a >= 50 ? 8 : 12);
  if (Math.random() < 0.5)
    return numQ(
      {
        key: `dh-step-${a}-${b}`,
        prompt: "Double one, halve the other. What's missing?",
        speech: `${a} times ${b} equals ${2 * a} times what?`,
        equation: [a, "×", b, "=", 2 * a, "×", "?"],
        hint: `${2 * a} is double ${a}. So the other number gets cut in half.`,
        explain: `${a} × ${b} = ${2 * a} × ${b / 2} = ${comma(a * b)}.`,
      },
      b / 2,
      [b, b * 2, b / 2 + 1, b / 2 - 1],
      0,
      60,
    );
  return typeQ(
    {
      key: `dh-solve-${a}-${b}`,
      prompt: "Double and halve to multiply in your head.",
      speech: `${a} times ${b}. Try doubling ${a} and halving ${b}.`,
      equation: [a, "×", b, "=", "?"],
      hint: `Double ${a} to make ${2 * a}. Halve ${b} to make ${b / 2}. Which is easier to multiply?`,
      explain: `${a} × ${b} = ${2 * a} × ${b / 2} = ${comma(a * b)}.`,
    },
    a * b,
  );
}

/* ------------------------------------------------- W9 Divide & factors */

export function factorArray(): Question {
  const N = pick(FACTOR_NUMS.filter((n) => n <= 60));
  const fs = factorsOf(N).filter((f) => f >= 2 && f <= 10 && N / f <= 10);
  const R = pick(fs.length ? fs : [2]);
  return doQ(
    {
      key: `fa-${N}-${R}`,
      prompt: `Build an array of ${N} dots with ${R} rows.`,
      speech: `Build an array that has ${N} dots in ${R} equal rows. The rows and columns make a factor pair.`,
      equation: [R, "×", "?", "=", N],
      hint: `${R} × what = ${N}? That's how many go in each row.`,
      explain: `${R} rows of ${N / R} make ${N}, so ${R} and ${N / R} are a factor pair of ${N}.`,
    },
    { kind: "buildArray", rows: R, cols: N / R },
    N / R,
  );
}

export function sortPrime(): Question {
  const primes = shuffle(PRIMES.filter((p) => p <= 60)).slice(0, rand(2, 4));
  const comps = shuffle(Array.from({ length: 59 }, (_, i) => i + 2).filter((n) => !PRIMES.includes(n))).slice(0, 6 - primes.length);
  const items = shuffle([...primes.map((n) => ({ label: String(n), bin: 0 })), ...comps.map((n) => ({ label: String(n), bin: 1 }))]);
  return doQ(
    {
      key: `spr-${[...primes, ...comps].sort((x, y) => x - y).join("-")}`,
      prompt: "Sort the numbers: prime or composite?",
      hint: "Try to make each number as a times fact other than 1 × itself. If you can, it's composite.",
      explain: `Prime: ${[...primes].sort((x, y) => x - y).join(", ")}. Composite: ${comps
        .sort((x, y) => x - y)
        .map((n) => {
          const f = factorsOf(n)[1];
          return `${n} = ${f} × ${n / f}`;
        })
        .join(", ")}.`,
    },
    { kind: "sort", bins: ["Prime", "Composite"], items },
    primes.length,
  );
}

export function checkDivision(): Question {
  const d = rand(2, 9);
  const q = rand(12, 250);
  const r = Math.random() < 0.4 ? rand(1, d - 1) : 0;
  const n = q * d + r;
  const off = pick([0, 0, 1, -1, 10, -10]);
  const claimed = q + off;
  const name = pick(NAMES);
  const said = `${claimed}${r ? ` R ${r}` : ""}`;
  return fixedQ(
    {
      key: `cd-${n}-${d}-${off}`,
      prompt: `${name} says ${comma(n)} ÷ ${d} = ${said}. Check by multiplying. Right?`,
      speech: `${name} says ${comma(n)} divided by ${d} is ${said}. Check by multiplying. Is it right?`,
      hint: `Multiply ${claimed} × ${d}${r ? ` and add ${r}` : ""}. Do you get ${comma(n)}?`,
      explain: `${claimed} × ${d}${r ? ` + ${r}` : ""} = ${comma(claimed * d + r)}. ${off === 0 ? "That matches, so it's right." : `That's not ${comma(n)}. The right answer is ${q}${r ? ` R ${r}` : ""}.`}`,
    },
    ["Yes, it's right", "No, it's wrong"],
    off === 0 ? "Yes, it's right" : "No, it's wrong",
  );
}

/* --------------------------------------------------- W10 Fraction power */

export function shadeEquivalent(): Question {
  const [n, d] = lowestFrac([2, 3, 4, 6]);
  const k = rand(2, Math.floor(12 / d));
  return doQ(
    {
      key: `seq4-${n}-${d}-${k}`,
      prompt: `This bar has ${d * k} parts. Shade ${n}/${d} of it.`,
      speech: `The bar is cut into ${d * k} equal parts. Shade ${sayFrac(n, d)} of it.`,
      hint: `Each 1/${d} is ${k} of the small parts. Shade ${plural(n, "group")} of ${k}.`,
      explain: `${n}/${d} = ${n * k}/${d * k}, so shade ${n * k} parts.`,
    },
    { kind: "shade", parts: d * k, target: n * k, shape: pick(["bar", "pie"]) },
    n * k,
  );
}

export function orderFractions(): Question {
  const pool: [number, number][] = [];
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) for (let n = 1; n < d; n++) if (gcd(n, d) === 1) pool.push([n, d]);
  let pickd: [number, number][];
  do pickd = shuffle(pool).slice(0, rand(3, 4));
  while (new Set(pickd.map(([n, d]) => n / d)).size !== pickd.length || Math.min(...pickd.flatMap((a, i) => pickd.slice(i + 1).map((b) => Math.abs(a[0] / a[1] - b[0] / b[1])))) < 0.05);
  const up = Math.random() < 0.6;
  const sorted = [...pickd].sort((a, b) => (up ? a[0] * b[1] - b[0] * a[1] : b[0] * a[1] - a[0] * b[1]));
  return doQ(
    {
      key: `of-${up ? "u" : "d"}-${[...pickd].sort((a, b) => a[0] * b[1] - b[0] * a[1]).map((f) => f.join("/")).join("-")}`,
      prompt: `Put the fractions in order, ${up ? "smallest to largest" : "largest to smallest"}.`,
      hint: "Compare each to 1/2 first. Then use common bottom numbers for close ones.",
      explain: sorted.map(([n, d]) => fracText(n, d)).join(up ? " < " : " > ") + ".",
    },
    { kind: "order", items: sorted.map(([n, d]) => fracText(n, d)), direction: up ? "smallest to largest" : "largest to smallest" },
    sorted.length,
  );
}

export function placeMixed(): Question {
  const d = pick([2, 3, 4, 5, 6, 8]);
  const w = rand(0, 2);
  const n = rand(1, d - 1);
  const imp = w * d + n;
  const asImp = w > 0 && Math.random() < 0.4;
  const label = asImp ? fracText(imp, d) : mixedText(w, n, d);
  return doQ(
    {
      key: `pm-${w}-${n}-${d}-${asImp ? 1 : 0}`,
      prompt: `Put ${label} on the number line.`,
      speech: `Drag the marker to ${asImp ? sayFrac(imp, d) : sayMixed(w, n, d)}.`,
      hint: asImp ? `Every ${d}/${d} is one whole. How many wholes are in ${imp}/${d}?` : `Go to ${w}, then count ${n} more jumps of 1/${d}.`,
      explain: `${fracText(imp, d)} = ${mixedText(w, n, d)}: ${w} whole${w === 1 ? "" : "s"} and ${n}/${d} more.`,
    },
    { kind: "placeOnLine", min: 0, max: 3, step: 1 / d, labelStep: 1, target: imp / d, fractions: d },
    imp / d,
  );
}

/* ---------------------------------------------- W11 Fractions & decimals */

export function placeDecimal(): Question {
  if (Math.random() < 0.6) {
    const w = rand(0, 3);
    const t = rand(1, 9);
    const x = (10 * w + t) / 10;
    return doQ(
      {
        key: `pd-t-${w}-${t}`,
        prompt: `Put ${x} on the number line.`,
        hint: `Each small step is 0.1. Count ${t} steps from ${w}.`,
        explain: `${x} is ${w} and ${t} tenth${t === 1 ? "" : "s"}.`,
      },
      { kind: "placeOnLine", min: w, max: w + 1, step: 0.1, labelStep: 0.5, target: x },
      x,
    );
  }
  const base = rand(1, 8);
  const h = rand(1, 9);
  const x = (10 * base + h) / 100;
  return doQ(
    {
      key: `pd-h-${base}-${h}`,
      prompt: `Put ${x.toFixed(2)} on the number line.`,
      hint: `Each small step is 0.01. Count ${h} steps from ${(base / 10).toFixed(1)}.`,
      explain: `${x.toFixed(2)} is ${10 * base + h} hundredths: ${h} past ${(base / 10).toFixed(1)}.`,
    },
    { kind: "placeOnLine", min: base / 10, max: (base + 1) / 10, step: 0.01, labelStep: 0.05, target: x },
    x,
  );
}

export function shadeTenths(): Question {
  const t = rand(1, 9);
  const form = rand(0, 2);
  const shape: "bar" | "pie" = pick(["bar", "pie"]);
  const ask = form === 0 ? `Shade 0.${t} of the ${shape === "bar" ? "bar" : "circle"}.` : form === 1 ? `Shade ${t}/10 of the ${shape === "bar" ? "bar" : "circle"}.` : `Shade ${10 * t}/100 of it. (Each part is a tenth.)`;
  return doQ(
    {
      key: `st-${form}-${t}-${shape}`,
      prompt: ask,
      hint: form === 2 ? "10 hundredths make 1 tenth. How many tenths is that?" : "Each part is one tenth, 0.1.",
      explain: form === 2 ? `${10 * t}/100 = ${t}/10 = 0.${t}: shade ${t} parts.` : `0.${t} = ${t}/10: shade ${t} of the 10 parts.`,
    },
    { kind: "shade", parts: 10, target: t, shape },
    t,
  );
}

export function orderDecimals(): Question {
  const vals = new Set<number>();
  const n = rand(3, 5);
  const w = rand(0, 2);
  while (vals.size < n) vals.add(w * 100 + (Math.random() < 0.4 ? rand(1, 9) * 10 : rand(1, 99)));
  const up = Math.random() < 0.6;
  const sorted = [...vals].sort((x, y) => (up ? x - y : y - x));
  const show = (h: number) => (h % 10 === 0 && Math.random() < 0.7 ? (h / 100).toFixed(1) : (h / 100).toFixed(2));
  const items = sorted.map(show);
  return doQ(
    {
      key: `od-${up ? "u" : "d"}-${[...vals].sort((x, y) => x - y).join("-")}`,
      prompt: `Put the decimals in order, ${up ? "smallest to largest" : "largest to smallest"}.`,
      hint: "Line up the decimal points. Compare tenths first, then hundredths. 0.5 is the same as 0.50.",
      explain: items.join(up ? " < " : " > ") + ".",
    },
    { kind: "order", items, direction: up ? "smallest to largest" : "largest to smallest" },
    items.length,
  );
}

/* ------------------------------------------------- W12 Measure & convert */

export function makeMoneyAct(): Question {
  const all = [1, 5, 10, 25, 100, 500];
  if (Math.random() < 0.6) {
    const cents = rand(3, 99) * 5 + pick([0, 0, rand(1, 4)]);
    const fewest = Math.random() < 0.5;
    return doQ(
      {
        key: `mma-${cents}-${fewest ? 1 : 0}`,
        prompt: `Make $${(cents / 100).toFixed(2)}${fewest ? " with the fewest coins and bills" : ""}.`,
        speech: `Make ${(cents / 100).toFixed(2)} dollars${fewest ? ", using the fewest coins and bills you can" : ""}.`,
        hint: fewest ? "Start with the biggest bill or coin that fits, then the next biggest." : "Dollars first, then quarters, dimes, nickels and pennies.",
        explain: `$${(cents / 100).toFixed(2)} is ${cents} cents. For example: ${fewestCoins(cents).map((c) => (c >= 100 ? `$${c / 100}` : `${c}¢`)).join(" + ")}.`,
      },
      { kind: "makeMoney", cents, coins: all, fewest },
      cents,
    );
  }
  const pay = pick([100, 200, 500, 1000]);
  const cost = rand(Math.floor(pay * 0.2), pay - 5);
  const change = pay - cost;
  return doQ(
    {
      key: `mma-change-${pay}-${cost}`,
      prompt: `A snack costs $${(cost / 100).toFixed(2)}. You pay $${pay / 100}. Show the change.`,
      speech: `A snack costs ${(cost / 100).toFixed(2)} dollars. You pay ${pay / 100} dollars. Make the change with coins and bills.`,
      hint: "Count up from the cost: to the next 5¢ or 10¢, then to the next dollar, then to what you paid.",
      explain: `$${(pay / 100).toFixed(2)} − $${(cost / 100).toFixed(2)} = $${(change / 100).toFixed(2)}.`,
    },
    { kind: "makeMoney", cents: change, coins: all },
    change,
  );
}

function fewestCoins(cents: number): number[] {
  const out: number[] = [];
  for (const c of [500, 100, 25, 10, 5, 1]) while (cents >= c) {
    out.push(c);
    cents -= c;
  }
  return out;
}

export function drawAreaPerim4(): Question {
  const w = rand(2, 9);
  const h = rand(1, Math.min(9, 10 - 1));
  const A = w * h;
  const P = 2 * (w + h);
  const form = rand(0, 2);
  const spec = form === 0 ? { area: A, perimeter: P } : form === 1 ? { area: A } : { perimeter: P };
  return doQ(
    {
      key: `dap4-${form}-${form === 1 ? A : form === 2 ? P : `${Math.min(w, h)}x${Math.max(w, h)}`}`,
      prompt:
        form === 0 ? `Draw a rectangle: area ${A}, perimeter ${P}.` : form === 1 ? `Draw a rectangle with an area of ${A}.` : `Draw a rectangle with a perimeter of ${P}.`,
      speech:
        form === 0
          ? `Draw a rectangle with an area of ${A} square units and a perimeter of ${P} units.`
          : form === 1
            ? `Draw a rectangle that covers ${A} square units.`
            : `Draw a rectangle that is ${P} units all the way around.`,
      hint: form === 2 ? `Length + width must make ${P / 2}.` : `Find two numbers that multiply to ${A}${form === 0 ? ` and add to ${P / 2}` : ""}.`,
      explain: `${/^(8|11|18)/.test(String(w)) ? "An" : "A"} ${w} by ${h} rectangle: area ${w} × ${h} = ${A}, perimeter 2 × (${w} + ${h}) = ${P}.`,
    },
    { kind: "drawShape", size: 10, sides: 4, rightAngles: 4, ...spec },
    form === 2 ? P : A,
  );
}

export function dotPlotEighths(): Question {
  const spots = shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, rand(3, 4)).sort((x, y) => x - y);
  const counts = spots.map(() => rand(1, 4));
  const values = spots.flatMap((s, k) => Array<number>(counts[k]).fill(s / 8));
  return doQ(
    {
      key: `dp8-${spots.join(".")}-${counts.join(".")}`,
      prompt: "Make a line plot of the bug lengths.",
      speech: "Use the table to make a line plot. Put one dot for each bug.",
      visual: { kind: "table", header: ["Length (in)", "Bugs"], rows: spots.map((s, k) => [simpleEighths(s), counts[k]]) },
      hint: "Find each length on the line (in eighths). Put one dot above it for each bug.",
      explain: `${spots.map((s, k) => `${counts[k]} at ${simpleEighths(s)}`).join(", ")}: ${values.length} dots in all.`,
    },
    { kind: "dotPlot", values, min: 0, max: 1, step: 1 / 8, label: "Bug lengths (inches)" },
    values.length,
  );
}

/* ---------------------------------------------------- W13 Angles & lines */

export function makeAngleAct(): Question {
  const special = Math.random() < 0.2;
  const deg = special ? pick([90, 180]) : rand(2, 35) * 5;
  return doQ(
    {
      key: `mag-${deg}-${special ? 0 : 1}`,
      prompt: special ? (deg === 90 ? "Make a right angle." : "Make a straight angle.") : `Make a ${deg}° angle.`,
      speech: special ? `Drag the ray to make a ${deg === 90 ? "right" : "straight"} angle.` : `Drag the ray to make an angle of ${deg} degrees. Use the protractor.`,
      hint: special ? (deg === 90 ? "A right angle is a square corner." : "A straight angle makes a flat line.") : "Start at 0 on the flat ray. Count up the protractor to the number you need.",
      explain: special ? `A ${deg === 90 ? "right angle is 90°" : "straight angle is 180°"}.` : `${deg}° is ${deg < 90 ? "acute — less than a right angle" : deg > 90 ? "obtuse — more than a right angle" : "a right angle"}.`,
    },
    { kind: "makeAngle", degrees: deg, scale: !special },
    deg,
  );
}

export function sortAngles(): Question {
  const acute = shuffle(Array.from({ length: 16 }, (_, i) => 5 * (i + 2))).slice(0, rand(1, 3));
  const obtuse = shuffle(Array.from({ length: 16 }, (_, i) => 95 + 5 * i)).slice(0, rand(1, 3));
  const right = Math.random() < 0.6 || acute.length + obtuse.length < 3 ? [90] : [];
  const all = [...acute.map((a) => ({ label: `${a}°`, bin: 0 })), ...right.map(() => ({ label: "90°", bin: 1 })), ...obtuse.map((a) => ({ label: `${a}°`, bin: 2 }))];
  return doQ(
    {
      key: `sa-${[...acute, ...right, ...obtuse].sort((x, y) => x - y).join("-")}`,
      prompt: "Sort the angles: acute, right or obtuse?",
      hint: "Compare each with 90°, a square corner. Less is acute; more is obtuse.",
      explain: `Acute: ${[...acute].sort((x, y) => x - y).map((a) => `${a}°`).join(", ")}. ${right.length ? "Right: 90°. " : ""}Obtuse: ${[...obtuse].sort((x, y) => x - y).map((a) => `${a}°`).join(", ")}.`,
    },
    { kind: "sort", bins: ["acute", "right", "obtuse"], items: shuffle(all) },
    acute.length,
  );
}

const PROPERTY_TASKS: { prompt: string; sides: number; spec: { rightAngles?: number; parallelPairs?: number; equalSides?: boolean }; why: string }[] = [
  { prompt: "Draw a right triangle.", sides: 3, spec: { rightAngles: 1 }, why: "A right triangle has one square corner." },
  { prompt: "Draw a triangle with no right angle.", sides: 3, spec: { rightAngles: 0 }, why: "Acute and obtuse triangles have no right angle." },
  { prompt: "Draw a quadrilateral with exactly 2 right angles.", sides: 4, spec: { rightAngles: 2 }, why: "A shape with two square corners next to each other and a slanted side works." },
  { prompt: "Draw a shape with 2 pairs of parallel sides.", sides: 4, spec: { parallelPairs: 2 }, why: "Parallelograms, rectangles, rhombuses and squares all have 2 pairs of parallel sides." },
  { prompt: "Draw a 4-sided shape with 1 pair of parallel sides and 2 right angles.", sides: 4, spec: { parallelPairs: 1, rightAngles: 2 }, why: "That's a right trapezoid." },
  { prompt: "Draw a quadrilateral with no parallel sides.", sides: 4, spec: { parallelPairs: 0 }, why: "If no sides point the same way, there are no parallel sides." },
  { prompt: "Draw a shape with 4 right angles.", sides: 4, spec: { rightAngles: 4 }, why: "Rectangles and squares have 4 right angles, so their sides are perpendicular." },
  { prompt: "Draw a pentagon with 2 right angles.", sides: 5, spec: { rightAngles: 2 }, why: "A house shape works: two square corners at the bottom." },
];

export function drawByProperties(): Question {
  const i = rand(0, PROPERTY_TASKS.length - 1);
  const t = PROPERTY_TASKS[i];
  const size = pick([6, 8]);
  return doQ(
    {
      key: `dbp-${i}-${size}`,
      prompt: t.prompt,
      speech: `${t.prompt} Tap the corners on the dot grid, then tap the first corner again.`,
      hint: "Grid lines that go straight across and straight up meet at right angles. Sides that slant the same way are parallel.",
      explain: t.why,
    },
    { kind: "drawShape", size, sides: t.sides, ...t.spec },
    t.sides,
  );
}

/* ------------------------------------------- W13 drawing figures & symmetry */

const FIGURES: { figure: "segment" | "ray" | "line" | "parallel" | "perpendicular"; prompt: string; hint: string; why: string; ends: number }[] = [
  { figure: "segment", prompt: "Draw a line segment.", hint: "A line segment stops at both ends. Give both ends a stop, not an arrow.", why: "A line segment has 2 endpoints: it stops at both ends.", ends: 2 },
  { figure: "ray", prompt: "Draw a ray.", hint: "A ray starts at one point and keeps going one way: one stop and one arrow.", why: "A ray has 1 endpoint and goes on forever in one direction.", ends: 1 },
  { figure: "line", prompt: "Draw a line.", hint: "A line never stops, so both ends get arrows.", why: "A line goes on forever both ways, so it has 0 endpoints.", ends: 0 },
  { figure: "parallel", prompt: "Draw two parallel lines.", hint: "Parallel lines point the same way and never meet. Copy the slant of the first line.", why: "Parallel lines stay the same distance apart and never cross.", ends: 0 },
  { figure: "perpendicular", prompt: "Draw two perpendicular lines.", hint: "Perpendicular lines cross at a square corner, like the lines in a + sign.", why: "Perpendicular lines meet at a right angle, 90°.", ends: 0 },
];

export function drawFigureAct(): Question {
  const i = rand(0, FIGURES.length - 1);
  const f = FIGURES[i];
  const size = rand(6, 10);
  return doQ(
    {
      key: `dfig-${f.figure}-${size}`,
      prompt: f.prompt,
      speech: `${f.prompt} Tap two points, then choose a stop or an arrow for each end.`,
      hint: f.hint,
      explain: f.why,
    },
    { kind: "drawFigure", figure: f.figure, size },
    f.ends,
  );
}

type Pt = { x: number; y: number };

/** Shapes that have at least one line of symmetry, placed somewhere on an 8 × 8 grid. */
function symmetricShape(): { name: string; pts: Pt[]; example: string } {
  const S = 8;
  for (;;) {
    const kind = rand(0, 6);
    let pts: Pt[] = [];
    let name = "";
    let example = "";
    if (kind === 0) {
      const w = rand(2, 6);
      let h = rand(2, 6);
      if (h === w) h = w === 6 ? 5 : w + 1;
      const [x, y] = [rand(0, S - w), rand(0, S - h)];
      pts = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
      name = "rectangle";
      example = "straight down the middle, or straight across the middle";
    } else if (kind === 1) {
      const s = rand(2, 6);
      const [x, y] = [rand(0, S - s), rand(0, S - s)];
      pts = [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
      name = "square";
      example = "down the middle, across the middle, or corner to corner";
    } else if (kind === 2) {
      const a = rand(1, 3);
      const h = rand(2, 6);
      const [x, y] = [rand(0, S - 2 * a), rand(0, S - h)];
      pts = [{ x, y: y + h }, { x: x + 2 * a, y: y + h }, { x: x + a, y }];
      name = "triangle";
      example = "from the top corner straight down to the middle of the bottom";
    } else if (kind === 3) {
      const a = rand(1, 3);
      const b = rand(1, 3);
      const c = rand(b + 1, 7);
      if (c === 2 * b) continue;
      const [x, y] = [rand(a, S - a), rand(0, S - c)];
      pts = [{ x, y }, { x: x + a, y: y + b }, { x, y: y + c }, { x: x - a, y: y + b }];
      name = "kite";
      example = "from the top corner to the bottom corner";
    } else if (kind === 4) {
      const k = rand(1, 2);
      const B = rand(2 * k + 1, 8);
      const h = rand(2, 5);
      const [x, y] = [rand(0, S - B), rand(0, S - h)];
      pts = [{ x, y: y + h }, { x: x + B, y: y + h }, { x: x + B - k, y }, { x: x + k, y }];
      name = "trapezoid";
      example = "straight down the middle, from the middle of the top to the middle of the bottom";
    } else if (kind === 5) {
      const a = rand(1, 3);
      let b = rand(1, 3);
      if (b === a) b = a === 3 ? 2 : a + 1;
      const [x, y] = [rand(a, S - a), rand(0, S - 2 * b)];
      pts = [{ x, y }, { x: x + a, y: y + b }, { x, y: y + 2 * b }, { x: x - a, y: y + b }];
      name = "rhombus";
      example = "from top corner to bottom corner, or from side corner to side corner";
    } else {
      const w = 2 * rand(1, 3);
      const h = rand(1, 4);
      const r = rand(1, 3);
      if (h + r > S) continue;
      const [x, y] = [rand(0, S - w), rand(0, S - h - r)];
      pts = [{ x, y: y + r + h }, { x: x + w, y: y + r + h }, { x: x + w, y: y + r }, { x: x + w / 2, y }, { x, y: y + r }];
      name = "house shape";
      example = "from the roof's peak straight down to the middle of the floor";
    }
    if (pts.every((p) => p.x >= 0 && p.y >= 0 && p.x <= S && p.y <= S) && symmetryLines(pts).length) return { name, pts, example };
  }
}

export function symmetryAct(): Question {
  const { name, pts, example } = symmetricShape();
  const lines = symmetryLines(pts).length;
  return doQ(
    {
      key: `syl-${pts.map((p) => `${p.x}.${p.y}`).join("-")}`,
      prompt: `Draw a line of symmetry on the ${name}.`,
      speech: `Draw a line of symmetry on the ${name}. Tap two points on the fold line.`,
      hint: "Imagine folding the shape so both halves match exactly. Try straight down the middle, straight across, or corner to corner.",
      explain: `This ${name} has ${lines} line${lines === 1 ? "" : "s"} of symmetry. One goes ${example}.`,
    },
    { kind: "symmetryLine", points: pts, size: 8 },
    lines,
  );
}
