/**
 * Question generators for Grades 1–2 (ages 6–8).
 *
 * Facts use ten-frames and number bonds, place value uses base-ten blocks and
 * digit cards, and measurement and data use clocks, coins, rulers and graphs.
 */
import { bag, labelChoices, makeChoices, nextThing, pick, rand, sayEquation, shuffle, word } from "../questions";
import type { Activity, CellKind, FracBar, Question, ShapeName, Thing, Token, Visual } from "../types";

/* =================================================================== helpers */

const frame = (...runs: [CellKind, number][]): CellKind[] =>
  runs.flatMap(([kind, n]) => Array<CellKind>(Math.max(0, n)).fill(kind));

/** The equation as text with the blank filled in. */
const filled = (eq: Token[], ans: number | string) => eq.map((t) => (t === "?" ? ans : t)).join(" ");

/** Text choices in a fixed order (true/false, signs, odd/even, a.m./p.m.). */
const fixed = (labels: string[], correct: string) => ({
  choices: labels.map((_, i) => i),
  labels,
  answer: labels.indexOf(correct),
});

const NAMES = ["Mia", "Leo", "Ava", "Sam", "Zoe", "Max", "Ivy", "Ben", "Kai", "Lily", "Nia", "Omar", "Rosa", "Theo"];
const nextName = bag(NAMES);
/** k different names. */
const names = (k: number) => {
  const out: string[] = [];
  while (out.length < k) {
    const n = nextName();
    if (!out.includes(n)) out.push(n);
  }
  return out;
};

const tensOf = (n: number) => Math.floor(n / 10);
const onesOf = (n: number) => n % 10;
const up10 = (n: number) => Math.ceil(n / 10) * 10;
const down10 = (n: number) => Math.floor(n / 10) * 10;
const mm = (m: number) => String(m).padStart(2, "0");
const clockText = (h: number, m: number) => `${h}:${mm(m)}`;
const hourAdd = (h: number, d: number) => ((((h - 1 + d) % 12) + 12) % 12) + 1;
const plusList = (nums: number[]): Token[] => nums.flatMap((n, i): Token[] => (i ? ["+", n] : [n]));
const ones = (n: number) => (n === 1 ? "one" : "ones");
const tensW = (n: number) => (n === 1 ? "ten" : "tens");
const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

const SMALL = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS_WORD = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 0–1000 in words, e.g. 406 → "four hundred six". */
export function numberWords(n: number): string {
  if (n < 20) return SMALL[n];
  if (n < 100) return TENS_WORD[tensOf(n)] + (onesOf(n) ? `-${SMALL[onesOf(n)]}` : "");
  if (n === 1000) return "one thousand";
  const rest = n % 100;
  return `${SMALL[Math.floor(n / 100)]} hundred${rest ? ` ${numberWords(rest)}` : ""}`;
}

/** Evaluate a side made only of numbers, + and −. */
function evalSide(side: Token[]): number {
  let v = side[0] as number;
  for (let i = 1; i < side.length; i += 2) v = side[i] === "+" ? v + (side[i + 1] as number) : v - (side[i + 1] as number);
  return v;
}

/* ====================================================== World: facts to 20 */

/** 1.OA.C.5 — count on to add, count back to subtract, on a number line. */
export function countOnBack(): Question {
  const r = Math.random();
  const back = r < 0.35;
  const flip = !back && r > 0.75;
  const by = rand(1, 3);
  const start = back ? rand(by + 3, 20) : rand(4, 20 - by);
  const end = back ? start - by : start + by;
  const eq: Token[] = flip ? [by, "+", start, "=", "?"] : [start, back ? "−" : "+", by, "=", "?"];
  const steps = Array.from({ length: by }, (_, i) => (back ? start - i - 1 : start + i + 1));
  const prompt = back
    ? pick([`Start at ${start}. Count back ${by}.`, `${start} − ${by}. Count back!`])
    : flip
      ? `${by} + ${start}. Start at the bigger number!`
      : pick([`Start at ${start}. Count on ${by}.`, `${start} + ${by}. Count on!`]);
  const speech = back
    ? `${start} minus ${by}. Start at ${start} and count back ${by}.`
    : flip
      ? `${by} plus ${start}. Start at ${start}, the bigger number, and count on ${by}.`
      : `${start} plus ${by}. Start at ${start} and count on ${by}.`;
  return {
    key: `on-${back ? "b" : flip ? "f" : "o"}-${start}-${by}`,
    prompt,
    speech,
    equation: eq,
    visual: { kind: "numberline", min: 0, max: 20, step: 1, labelStep: 5, from: start, to: end },
    answer: end,
    input: "choices",
    choices: makeChoices(end, { n: 4, min: 0, max: 20, likely: [back ? end + 1 : end - 1, back ? start + by : start - by, start] }),
    hint: back
      ? `Say ${start}. Then count back ${by}, one number for each step.`
      : `Say ${start} in your head. Then count ${by} more on your fingers.`,
    explain: `${start}… ${steps.join(", ")}. So ${filled(eq, end)}.`,
  };
}

/** 1.OA.C.6, 1.OA.B.3 — make a ten to add (8 + 5 = 10 + 3). */
export function makeTenAdd(): Question {
  const a = rand(6, 9);
  const b = rand(11 - a, 9);
  const sum = a + b;
  const fill = 10 - a;
  const rest = b - fill;
  if (Math.random() < 0.4) {
    const eq: Token[] = [a, "+", b, "=", 10, "+", "?"];
    return {
      key: `mk10-s-${a}-${b}`,
      prompt: `${a} + ${b} is the same as 10 + ?`,
      speech: `${a} plus ${b} is the same as 10 plus what?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", a], ["b", fill], ["target", rest]) },
      answer: rest,
      input: "choices",
      choices: makeChoices(rest, { n: 4, min: 0, max: 10, likely: [b, fill, rest + 1] }),
      hint: `Move ${fill} from the ${b} to fill the ten. How much of the ${b} is left?`,
      explain: `${b} is ${fill} and ${rest}. ${a} + ${fill} = 10, so ${a} + ${b} = 10 + ${rest} = ${sum}.`,
    };
  }
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `mk10-${a}-${b}`,
    prompt: pick([`${a} + ${b}. Make a ten first!`, "Fill the ten, then add the rest!"]),
    speech: `${a} plus ${b}. Make a ten first!`,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", a], ["b", b]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 10, max: 20, likely: [sum - 1, sum + 1, 10 + b] }),
    hint: `${a} needs ${fill} more to make 10. Take ${fill} from the ${b}.`,
    explain: `${a} + ${fill} = 10. Then 10 + ${rest} = ${sum}.`,
  };
}

/** 1.OA.C.6 — subtract within 20 by going down to 10; fluent within 10. */
export function subtractTo20(): Question {
  const form = pick([0, 0, 1, 2]);
  if (form === 2) {
    const total = rand(5, 10);
    const gone = rand(1, total - 1);
    const left = total - gone;
    const eq: Token[] = [total, "−", gone, "=", "?"];
    return {
      key: `sub10-${total}-${gone}`,
      prompt: pick(["Take away! How many are left?", `What is ${total} − ${gone}?`]),
      speech: `${sayEquation(eq)}?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", left], ["gone", gone]) },
      answer: left,
      input: "choices",
      choices: makeChoices(left, { n: 4, min: 0, max: 10, likely: [left + 1, left - 1, gone] }),
      hint: `Think: ${gone} + what makes ${total}?`,
      explain: `${filled(eq, left)}, because ${gone} + ${left} = ${total}.`,
    };
  }
  const total = rand(11, 18);
  const extra = total - 10;
  const gone = rand(extra + 1, 9);
  const left = total - gone;
  const more = gone - extra;
  if (form === 0) {
    const eq: Token[] = [total, "−", gone, "=", "?"];
    return {
      key: `sub20-${total}-${gone}`,
      prompt: pick([`${total} − ${gone}. Get to 10 first!`, "Take away. How many are left?"]),
      speech: `${sayEquation(eq)}? Take away to get to 10 first.`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", left], ["gone", gone]) },
      answer: left,
      input: "choices",
      choices: makeChoices(left, { n: 4, min: 0, max: 20, likely: [left + 1, left - 1, gone, 10] }),
      hint: `Take away ${extra} to get to 10. Then take away ${more} more.`,
      explain: `${total} − ${extra} = 10, and 10 − ${more} = ${left}.`,
    };
  }
  const eq: Token[] = [total, "−", gone, "=", 10, "−", "?"];
  return {
    key: `sub20s-${total}-${gone}`,
    prompt: `${total} − ${gone} is the same as 10 − ?`,
    speech: `${total} minus ${gone} is the same as 10 minus what?`,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", left], ["target", more], ["gone", extra]) },
    answer: more,
    input: "choices",
    choices: makeChoices(more, { n: 4, min: 0, max: 10, likely: [gone, extra, more + 1] }),
    hint: `Taking away ${extra} gets you to 10. How many of the ${gone} are still to take?`,
    explain: `${gone} is ${extra} and ${more}. ${total} − ${extra} = 10, so it's 10 − ${more} = ${left}.`,
  };
}

/** 1.OA.B.4 — subtraction as a missing addend: 13 − 8 → 8 + ? = 13. */
export function thinkAddition(): Question {
  const part = rand(2, 9);
  const other = rand(2, 9);
  const total = part + other;
  const eq: Token[] = [total, "−", part, "=", "?"];
  return {
    key: `think-${total}-${part}`,
    prompt: pick([`Think: ${part} + ? = ${total}`, `${part} + what makes ${total}?`]),
    speech: `${total} minus ${part}. Think addition: ${part} plus what makes ${total}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", part], ["target", other]) },
    answer: other,
    input: "choices",
    choices: makeChoices(other, { n: 4, min: 0, max: 20, likely: [total, other + 1, other - 1, part] }),
    hint: `Start at ${part} and count up to ${total}. How many did you count?`,
    explain: `${part} + ${other} = ${total}, so ${total} − ${part} = ${other}.`,
  };
}

/** 1.OA.B.3, 1.OA.B.4 — turnaround facts and related subtraction. */
export function factFamily(): Question {
  const a = rand(2, 9);
  let b = rand(2, 9);
  while (b === a) b = rand(2, 9);
  const c = a + b;
  const form = rand(0, 2);
  if (form === 0) {
    const eq: Token[] = [b, "+", a, "=", "?"];
    return {
      key: `fam-t-${a}-${b}`,
      prompt: `${a} + ${b} = ${c}. So ${b} + ${a} = ?`,
      speech: `${a} plus ${b} is ${c}. So what is ${b} plus ${a}?`,
      equation: eq,
      visual: { kind: "bond", whole: "?", parts: [b, a] },
      answer: c,
      input: "choices",
      choices: makeChoices(c, { n: 4, min: 0, max: 20, likely: [c + 1, c - 1, Math.abs(a - b)] }),
      hint: "Switch the order of the numbers. Does the total change?",
      explain: `Same parts, same total: ${b} + ${a} = ${c}.`,
    };
  }
  const take = form === 1 ? b : a;
  const left = c - take;
  const eq: Token[] = [c, "−", take, "=", "?"];
  return {
    key: `fam-s-${a}-${b}-${form}`,
    prompt: `${a} + ${b} = ${c}. So ${c} − ${take} = ?`,
    speech: `${a} plus ${b} is ${c}. So what is ${c} minus ${take}?`,
    equation: eq,
    visual: { kind: "bond", whole: c, parts: form === 1 ? ["?", b] : [a, "?"] },
    answer: left,
    input: "choices",
    choices: makeChoices(left, { n: 4, min: 0, max: 20, likely: [take, c, left + 1, left - 1] }),
    hint: `${c} is the whole. Take away the part ${take}. Which part is left?`,
    explain: `${a} and ${b} make ${c}, so ${c} − ${take} = ${left}.`,
  };
}

/** 1.OA.B.3, 1.OA.A.2 — add three numbers; group a pair that makes 10. */
export function addThreeNumbers(): Question {
  const form = rand(0, 2);
  const p = rand(1, 9);
  const q = 10 - p;
  if (form === 2) {
    const x = rand(1, 9);
    const eq: Token[] = [p, "+", x, "+", q, "=", 10, "+", "?"];
    return {
      key: `a3-g-${p}-${x}`,
      prompt: `${p} + ${x} + ${q} = 10 + ?`,
      speech: `${p} plus ${x} plus ${q} is the same as 10 plus what?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", p], ["b", q], ["target", x]) },
      answer: x,
      input: "choices",
      choices: makeChoices(x, { n: 4, min: 0, max: 20, likely: [p, q, x + 1, 10 + x] }),
      hint: "Which two numbers make 10? Add those first.",
      explain: `${p} + ${q} = 10. So ${p} + ${x} + ${q} = 10 + ${x} = ${10 + x}.`,
    };
  }
  const nums = form === 0 ? shuffle([p, q, rand(1, 9)]) : [rand(1, 7), rand(1, 7), rand(1, 6)];
  const [a, b, c] = nums;
  const sum = a + b + c;
  const eq: Token[] = [a, "+", b, "+", c, "=", "?"];
  const pairs: [number, number, number][] = [[a, b, c], [a, c, b], [b, c, a]];
  const ten = pairs.find(([x, y]) => x + y === 10);
  return {
    key: `a3-${a}-${b}-${c}`,
    prompt: pick(["Add all three!", "Three numbers! What's the total?", `${a} + ${b} + ${c} = ?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", a], ["b", b], ["a", c]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 3, max: 20, likely: [a + b, b + c, sum + 1, sum - 1] }),
    hint: "Look for two numbers that make 10, or a double. Add those first.",
    explain: ten
      ? `${ten[0]} + ${ten[1]} = 10, and 10 + ${ten[2]} = ${sum}.`
      : `${a} + ${b} = ${a + b}, and ${a + b} + ${c} = ${sum}.`,
  };
}

/* ================================================== World: stories & equal sign */

/** 1.OA.D.7 — is the equation true or false? */
export function trueOrFalse(): Question {
  const a = rand(2, 9);
  const b = rand(1, 9);
  const s = a + b;
  const yes = Math.random() < 0.5;
  const off = pick([1, -1]);
  const t = rand(0, 6);
  let left: Token[];
  let right: Token[];
  switch (t) {
    case 0:
      left = [a, "+", b];
      right = [yes ? s : s + off];
      break;
    case 1:
      left = [yes ? s : s + off];
      right = [a, "+", b];
      break;
    case 2:
      left = [a, "+", b];
      right = yes ? [b, "+", a] : [b, "+", a + 1];
      break;
    case 3:
      left = [a];
      right = [yes ? a : a + off];
      break;
    case 4:
      left = [s, "−", b];
      right = [yes ? a : a + off];
      break;
    case 5: {
      const d = rand(1, Math.min(9, s - 1));
      left = [a, "+", b];
      right = yes ? [s - d, "+", d] : [s, "+", d];
      break;
    }
    default:
      left = [a];
      right = yes ? [s, "−", b] : [s, "−", b + 1];
  }
  const L = evalSide(left);
  const R = evalSide(right);
  const truth = L === R;
  const eq: Token[] = [...left, "=", ...right];
  return {
    key: `tf-${eq.join(" ")}`,
    prompt: pick(["True or false?", "Is this true?", "Is it true or false?"]),
    speech: `${sayEquation(eq)}. True or false?`,
    equation: eq,
    visual: { kind: "none" },
    ...fixed(["True", "False"], truth ? "True" : "False"),
    input: "choices",
    hint: "The = sign means both sides are worth the same. Work out each side.",
    explain: truth
      ? `Both sides make ${L}. It's true!`
      : `One side makes ${L}, the other makes ${R}. Not the same, so it's false.`,
  };
}

/** 1.OA.D.8 — find the unknown in any position: 8 + ? = 11, 5 = ? − 3. */
export function missingAnywhere(): Question {
  const a = rand(1, 10);
  const b = rand(1, 10);
  const c = a + b;
  const forms: [Token[], "a" | "b" | "c"][] = [
    [[a, "+", "?", "=", c], "b"],
    [["?", "+", b, "=", c], "a"],
    [[a, "+", b, "=", "?"], "c"],
    [[c, "−", a, "=", "?"], "b"],
    [[c, "−", "?", "=", b], "a"],
    [["?", "−", a, "=", b], "c"],
    [[c, "=", a, "+", "?"], "b"],
    [[b, "=", "?", "−", a], "c"],
    [["?", "=", c, "−", a], "b"],
  ];
  const i = rand(0, forms.length - 1);
  const [eq, role] = forms[i];
  const ans = role === "a" ? a : role === "b" ? b : c;
  const whole: number | "?" = role === "c" ? "?" : c;
  const parts: [number | "?", number | "?"] = [role === "a" ? "?" : a, role === "b" ? "?" : b];
  const known = role === "a" ? b : a;
  return {
    key: `unk-${i}-${a}-${b}`,
    prompt: pick(["What number is missing?", "Find the missing number!", "What goes in the box?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "bond", whole, parts },
    answer: ans,
    input: "choices",
    choices: makeChoices(ans, { n: 4, min: 0, max: 30, likely: role === "c" ? [ans + 1, ans - 1, Math.abs(a - b)] : [c + known, ans + 1, ans - 1, known] }),
    hint: role === "c" ? `${a} and ${b} are the parts. Put them together.` : `The whole is ${c}. One part is ${known}. What is the other part?`,
    explain: `${filled(eq, ans)}`,
  };
}

/** 1.OA.A.1 — add to, take from, put together, take apart. */
export function storyAddTake(): Question {
  const thing = nextThing();
  const name = nextName();
  const form = rand(0, 3);
  if (form === 0 || form === 2) {
    const a = rand(2, 10);
    const b = rand(2, Math.min(9, 20 - a));
    const other = nextName();
    const eq: Token[] = [a, "+", b, "=", "?"];
    const prompt =
      form === 0
        ? `${name} has ${a} ${thing.emoji}. ${name} gets ${b} more. How many now?`
        : `${name} has ${a} ${thing.emoji}. ${other} has ${b}. How many in all?`;
    const speech =
      form === 0
        ? `${name} has ${a} ${word(a, thing)}. ${name} gets ${b} more. How many ${thing.many} now?`
        : `${name} has ${a} ${word(a, thing)}. ${other} has ${b}. How many ${thing.many} do they have in all?`;
    return {
      key: `st-${form}-${a}-${b}-${thing.one}`,
      prompt,
      speech,
      equation: eq,
      visual: { kind: "add", thing, a, b },
      answer: a + b,
      input: "choices",
      choices: makeChoices(a + b, { n: 4, min: 0, max: 20, likely: [a + b - 1, a + b + 1, Math.abs(a - b)] }),
      hint: form === 0 ? "Getting more means adding. Start at the bigger number and count on." : "In all means put them together. Add!",
      explain: `${a} + ${b} = ${a + b}.`,
    };
  }
  if (form === 1) {
    const total = rand(6, 18);
    const gone = rand(2, total - 2);
    const left = total - gone;
    const eq: Token[] = [total, "−", gone, "=", "?"];
    return {
      key: `st-1-${total}-${gone}-${thing.one}`,
      prompt: `${total} ${thing.emoji}. ${name} gives away ${gone}. How many left?`,
      speech: `${name} has ${total} ${thing.many}. ${name} gives ${gone} away. How many are left?`,
      equation: eq,
      visual: { kind: "takeaway", thing, total, gone },
      answer: left,
      input: "choices",
      choices: makeChoices(left, { n: 4, min: 0, max: 20, likely: [left + 1, left - 1, total + gone, gone] }),
      hint: `Giving away means taking away. Think: ${gone} + what = ${total}?`,
      explain: `${total} − ${gone} = ${left}.`,
    };
  }
  const total = rand(8, 18);
  const part = rand(2, Math.min(10, total - 2));
  const other = total - part;
  const eq: Token[] = [part, "+", "?", "=", total];
  return {
    key: `st-3-${total}-${part}-${thing.one}`,
    prompt: `${total} ${thing.emoji}. ${part} are big. How many are small?`,
    speech: `There are ${total} ${thing.many}. ${part} are big and the rest are small. How many are small?`,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", part], ["target", other]) },
    answer: other,
    input: "choices",
    choices: makeChoices(other, { n: 4, min: 0, max: 20, likely: [total, part, other + 1, other - 1] }),
    hint: `Big ones and small ones make ${total}. ${part} + what = ${total}?`,
    explain: `${part} + ${other} = ${total}, so ${other} are small.`,
  };
}

/** 1.OA.A.1 — change unknown and start unknown stories. */
export function storyMissing(): Question {
  const thing = nextThing();
  const form = rand(0, 3);
  if (form === 0) {
    const a = rand(2, 10);
    const c = rand(a + 2, Math.min(20, a + 9));
    const b = c - a;
    const eq: Token[] = [a, "+", "?", "=", c];
    return {
      key: `sm-0-${a}-${c}`,
      prompt: `${a} ${thing.emoji}, then some more. Now ${c}. How many came?`,
      speech: `There were ${a} ${thing.many}. Some more came. Now there are ${c}. How many more came?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", a], ["target", b]) },
      answer: b,
      input: "choices",
      choices: makeChoices(b, { n: 4, min: 0, max: 30, likely: [a + c, b + 1, b - 1, c] }),
      hint: `Start at ${a}. Count up to ${c}.`,
      explain: `${a} + ${b} = ${c}, so ${b} more came.`,
    };
  }
  if (form === 1) {
    const total = rand(6, 18);
    const left = rand(1, total - 2);
    const gone = total - left;
    const eq: Token[] = [total, "−", "?", "=", left];
    return {
      key: `sm-1-${total}-${left}`,
      prompt: `${total} ${thing.emoji}. Some go away. ${left} left. How many went?`,
      speech: `There were ${total} ${thing.many}. Some went away. Now there are ${left}. How many went away?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", left], ["target", gone]) },
      answer: gone,
      input: "choices",
      choices: makeChoices(gone, { n: 4, min: 0, max: 30, likely: [total + left, left, gone + 1, gone - 1] }),
      hint: `Count up from ${left} to ${total}.`,
      explain: `${total} − ${gone} = ${left}, so ${gone} went away.`,
    };
  }
  if (form === 2) {
    const b = rand(2, 9);
    const c = rand(b + 2, Math.min(20, b + 10));
    const start = c - b;
    const eq: Token[] = ["?", "+", b, "=", c];
    return {
      key: `sm-2-${b}-${c}`,
      prompt: `Some ${thing.emoji}, then ${b} more. Now ${c}. How many at first?`,
      speech: `There were some ${thing.many}. ${b} more came. Now there are ${c}. How many were there at first?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["target", start], ["b", b]) },
      answer: start,
      input: "choices",
      choices: makeChoices(start, { n: 4, min: 0, max: 30, likely: [b + c, start + 1, start - 1, b] }),
      hint: `${b} came, so take them back away: ${c} − ${b}.`,
      explain: `${start} + ${b} = ${c}, so there were ${start} at first.`,
    };
  }
  const gone = rand(2, 9);
  const left = rand(1, 10);
  const total = gone + left;
  const eq: Token[] = ["?", "−", gone, "=", left];
  return {
    key: `sm-3-${gone}-${left}`,
    prompt: `Some ${thing.emoji}. ${gone} go away. ${left} left. How many at first?`,
    speech: `There were some ${thing.many}. ${gone} went away. Now there are ${left}. How many were there at first?`,
    equation: eq,
    visual: { kind: "bond", whole: "?", parts: [left, gone] },
    answer: total,
    input: "choices",
    choices: makeChoices(total, { n: 4, min: 0, max: 20, likely: [Math.abs(left - gone), total + 1, total - 1] }),
    hint: "Put back the ones that went away. Add them to the ones that are left.",
    explain: `${left} + ${gone} = ${total}, so there were ${total} at first.`,
  };
}

/** 1.OA.A.1 — compare stories: how many more, fewer, bigger or smaller unknown. */
export function storyCompare(): Question {
  const thing = nextThing();
  const A = nextName();
  const B = nextName();
  const form = rand(0, 3);
  if (form <= 1) {
    const big = rand(4, 15);
    const small = rand(1, big - 1);
    const diff = big - small;
    const eq: Token[] = [big, "−", small, "=", "?"];
    const prompt =
      form === 0
        ? `${A} has ${big} ${thing.emoji}. ${B} has ${small}. How many more for ${A}?`
        : `${A} has ${big} ${thing.emoji}. ${B} has ${small}. How many fewer for ${B}?`;
    const speech =
      form === 0
        ? `${A} has ${big} ${word(big, thing)}. ${B} has ${small}. How many more does ${A} have than ${B}?`
        : `${A} has ${big} ${word(big, thing)}. ${B} has ${small}. How many fewer does ${B} have than ${A}?`;
    return {
      key: `cmp-${form}-${big}-${small}`,
      prompt,
      speech,
      equation: eq,
      visual: { kind: "rows", thing, top: big, bottom: small },
      needsVisual: false,
      answer: diff,
      input: "choices",
      choices: makeChoices(diff, { n: 4, min: 0, max: 30, likely: [big + small, big, small, diff + 1] }),
      hint: "Line them up and match them. Count the extras.",
      explain: `${big} − ${small} = ${diff}. ${A} has ${diff} more than ${B}.`,
    };
  }
  if (form === 2) {
    const small = rand(2, 10);
    const diff = rand(1, Math.min(9, 20 - small));
    const big = small + diff;
    const eq: Token[] = [small, "+", diff, "=", "?"];
    return {
      key: `cmp-2-${small}-${diff}`,
      prompt: `${B} has ${small} ${thing.emoji}. ${A} has ${diff} more. How many for ${A}?`,
      speech: `${B} has ${small} ${word(small, thing)}. ${A} has ${diff} more than ${B}. How many does ${A} have?`,
      equation: eq,
      visual: { kind: "add", thing, a: small, b: diff },
      answer: big,
      input: "choices",
      choices: makeChoices(big, { n: 4, min: 0, max: 20, likely: [small - diff >= 0 ? small - diff : big + 1, big - 1, big + 1] }),
      hint: `${A} has the same as ${B}, and ${diff} more. Add!`,
      explain: `${small} + ${diff} = ${big}.`,
    };
  }
  const big = rand(5, 18);
  const diff = rand(1, Math.min(9, big - 1));
  const small = big - diff;
  const eq: Token[] = [big, "−", diff, "=", "?"];
  return {
    key: `cmp-3-${big}-${diff}`,
    prompt: `${A} has ${big} ${thing.emoji}. ${B} has ${diff} fewer. How many for ${B}?`,
    speech: `${A} has ${big} ${word(big, thing)}. ${B} has ${diff} fewer than ${A}. How many does ${B} have?`,
    equation: eq,
    visual: { kind: "takeaway", thing, total: big, gone: diff },
    answer: small,
    input: "choices",
    choices: makeChoices(small, { n: 4, min: 0, max: 30, likely: [big + diff, small + 1, small - 1] }),
    hint: `Fewer means take away. ${big} take away ${diff}.`,
    explain: `${big} − ${diff} = ${small}.`,
  };
}

/** 1.OA.A.2 — stories that add three numbers. */
export function storyThree(): Question {
  const thing = nextThing();
  const pair = Math.random() < 0.5;
  let a: number, b: number, c: number;
  if (pair) {
    const p = rand(1, 9);
    [a, b, c] = shuffle([p, 10 - p, rand(1, 9)]);
  } else {
    do {
      a = rand(1, 8);
      b = rand(1, 8);
      c = rand(1, 8);
    } while (a + b + c > 20);
  }
  const sum = a + b + c;
  const eq: Token[] = [a, "+", b, "+", c, "=", "?"];
  const days = Math.random() < 0.4;
  const [n1, n2, n3] = names(3);
  const prompt = days
    ? `${a} ${thing.emoji} Mon, ${b} Tue, ${c} Wed. How many in all?`
    : `${n1} has ${a}, ${n2} has ${b}, ${n3} has ${c} ${thing.emoji}. In all?`;
  const speech = days
    ? `We saw ${a} ${word(a, thing)} on Monday, ${b} on Tuesday and ${c} on Wednesday. How many in all?`
    : `${n1} has ${a} ${word(a, thing)}, ${n2} has ${b}, and ${n3} has ${c}. How many ${thing.many} in all?`;
  const tenPair = [[a, b, c], [a, c, b], [b, c, a]].find(([x, y]) => x + y === 10);
  return {
    key: `s3-${days ? "d" : "n"}-${a}-${b}-${c}`,
    prompt,
    speech,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", a], ["b", b], ["a", c]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 3, max: 20, likely: [a + b, b + c, sum + 1, sum - 1] }),
    hint: tenPair ? "Look for two numbers that make 10!" : "Add two numbers first. Then add the third.",
    explain: tenPair ? `${tenPair[0]} + ${tenPair[1]} = 10, and 10 + ${tenPair[2]} = ${sum}.` : `${a} + ${b} = ${a + b}, and ${a + b} + ${c} = ${sum}.`,
  };
}

/* ======================================================= World: tens & ones */

/** 1.NBT.A.1 — count to 120 from any number; read a numeral from blocks. */
export function countTo120(): Question {
  const r = Math.random();
  if (r < 0.2) {
    const n = rand(21, 120);
    return {
      key: `c120-blk-${n}`,
      prompt: pick(["What number do the blocks show?", "How many? Count tens, then ones."]),
      speech: "What number do the blocks show? Count the tens, then the ones.",
      visual: { kind: "blocks", numbers: [n] },
      needsVisual: true,
      answer: n,
      input: "keypad",
      hint: "Count the long sticks by tens: 10, 20, 30… Then count on the cubes.",
      explain: `${tensOf(n)} ${tensW(tensOf(n))} and ${onesOf(n)} ${ones(onesOf(n))} make ${n}.`,
    };
  }
  const back = r > 0.78;
  if (back) {
    const s = rand(13, 120);
    const seq = [s, s - 1, s - 2];
    const next = s - 3;
    return {
      key: `c120-b-${s}`,
      prompt: pick(["Count back! What comes next?", "Going down! What's next?"]),
      speech: `${seq.join(", ")}. Counting back, what comes next?`,
      visual: { kind: "sequence", numbers: seq, next },
      needsVisual: true,
      answer: next,
      input: "choices",
      choices: makeChoices(next, { n: 4, min: 0, max: 120, likely: [next + 2, next - 1, next - 10, next + 10] }),
      hint: "Each number is one less than the one before.",
      explain: `One less than ${s - 2} is ${next}.`,
    };
  }
  const special = pick([19, 29, 39, 49, 59, 69, 79, 89, 99, 100, 109, 110, 119]);
  const s = Math.min(117, Math.max(1, Math.random() < 0.55 ? special - rand(1, 3) : rand(1, 117)));
  const seq = [s, s + 1, s + 2];
  const next = s + 3;
  const writing = next > 100 && next < 110 ? 1000 + (next - 100) : next - 10;
  return {
    key: `c120-n-${s}`,
    prompt: pick(["What number comes next?", "Keep counting! What's next?"]),
    speech: `${seq.join(", ")}. What number comes next?`,
    visual: { kind: "sequence", numbers: seq, next },
    needsVisual: true,
    answer: next,
    input: "choices",
    choices: makeChoices(next, { n: 4, min: 1, max: 1200, likely: [next + 1, next - 1, next + 10, writing] }),
    hint: onesOf(s + 2) === 9 ? "After 9 ones comes a new ten!" : "Say the numbers out loud. What do you say next?",
    explain: `${s + 2}, then ${next}!`,
  };
}

/** 1.NBT.B.2a, 1.NBT.B.2b — a ten is ten ones; teen numbers are a ten and some ones. */
export function teenNumbers(): Question {
  const form = rand(0, 3);
  const n = rand(1, 9);
  const v = 10 + n;
  if (form === 0) {
    return {
      key: `teen-b-${n}`,
      prompt: `1 ten and ${n} ${ones(n)}. What number?`,
      speech: `1 ten and ${n} ${ones(n)}. What number is that?`,
      visual: { kind: "blocks", numbers: [v] },
      answer: v,
      input: "choices",
      choices: makeChoices(v, { n: 4, min: 1, max: 20, likely: [n + 1, v + 1, v - 1] }),
      hint: "The stick is a ten. Count on the cubes: 11, 12, 13…",
      explain: `10 and ${n} more make ${v}.`,
    };
  }
  if (form === 1) {
    const eq: Token[] = [v, "=", 10, "+", "?"];
    return {
      key: `teen-split-${n}`,
      prompt: `${v} is 1 ten and how many ones?`,
      speech: `${v} is 1 ten and how many ones?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", 10], ["target", n]) },
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 4, min: 0, max: 20, likely: [v, 1, n + 1, 10] }),
      hint: "A full ten-frame is 10. How many dots come after it?",
      explain: `${v} = 10 + ${n}. That's 1 ten and ${n} ${ones(n)}.`,
    };
  }
  if (form === 2) {
    const eq: Token[] = [10, "+", n, "=", "?"];
    return {
      key: `teen-add-${n}`,
      prompt: pick([`10 + ${n} = ?`, `A ten and ${n} more is…`]),
      speech: `10 plus ${n}. A ten and ${n} more is what number?`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", 10], ["b", n]) },
      answer: v,
      input: "choices",
      choices: makeChoices(v, { n: 4, min: 1, max: 20, likely: [v + 1, v - 1, n + 1] }),
      hint: `Teen numbers start with a 1 for the ten. Then write the ${n}.`,
      explain: `10 + ${n} = ${v}. It's a ten and ${n} ${ones(n)}.`,
    };
  }
  if (Math.random() < 0.5) {
    return {
      key: "teen-bundle-ones",
      prompt: "How many ones make 1 ten?",
      speech: "How many ones make 1 ten?",
      visual: { kind: "tenframe", cells: frame(["a", 10]) },
      answer: 10,
      input: "choices",
      choices: makeChoices(10, { n: 3, min: 1, max: 20, likely: [1, 9, 11] }),
      hint: "Count the dots in a full ten-frame.",
      explain: "10 ones make 1 ten.",
    };
  }
  return {
    key: "teen-bundle-ten",
    prompt: "10 ones make how many tens?",
    speech: "If you bundle 10 ones together, how many tens do you have?",
    visual: { kind: "none" },
    answer: 1,
    input: "choices",
    choices: makeChoices(1, { n: 3, min: 0, max: 20, likely: [10, 0, 2] }),
    hint: "A ten is a bundle of 10 ones.",
    explain: "10 ones make 1 ten.",
  };
}

/** 1.NBT.B.2a, 1.NBT.B.2c — tens and ones in two-digit numbers; decade numbers. */
export function tensOnesValue(): Question {
  const form = rand(0, 3);
  const t = rand(1, 9);
  if (form === 0) {
    const o = rand(0, 9);
    const n = t * 10 + o;
    return {
      key: `to-blk-${n}`,
      prompt: pick(["What number do the blocks make?", "Tens and ones! What number?"]),
      speech: `${t} ${tensW(t)} and ${o} ${ones(o)}. What number is that?`,
      visual: { kind: "blocks", numbers: [n] },
      needsVisual: true,
      answer: n,
      input: "keypad",
      hint: "Each long stick is 10. Count by tens, then count on the little cubes.",
      explain: `${t} ${tensW(t)} and ${o} ${ones(o)} make ${n}.`,
    };
  }
  if (form === 1) {
    const v = t * 10;
    return {
      key: `to-dec-${t}`,
      prompt: `${t} ${tensW(t)} and 0 ones. What number?`,
      speech: `${t} ${tensW(t)} and 0 ones. What number is that?`,
      visual: { kind: "blocks", numbers: [v] },
      answer: v,
      input: "keypad",
      hint: "Count the sticks by tens: 10, 20, 30…",
      explain: `${t} ${tensW(t)} make ${v}.`,
    };
  }
  if (form === 2) {
    const v = t * 10;
    return {
      key: `to-howmany-${t}`,
      prompt: `${v} is how many tens?`,
      speech: `${v} is how many tens?`,
      visual: { kind: "places", digits: String(v), highlight: 0 },
      answer: t,
      input: "choices",
      choices: makeChoices(t, { n: 4, min: 0, max: 10, likely: [t + 1, t - 1, 0] }),
      hint: "Count by tens until you reach the number. How many tens did you count?",
      explain: `${v} is ${t} ${tensW(t)} and 0 ones.`,
    };
  }
  const o = rand(0, 9);
  const n = t * 10 + o;
  const askTens = Math.random() < 0.5;
  return {
    key: `to-split-${askTens ? "t" : "o"}-${n}`,
    prompt: askTens ? `${n} is ? tens and ${o} ${ones(o)}.` : `${n} is ${t} ${tensW(t)} and ? ones.`,
    speech: askTens ? `${n} is how many tens and ${o} ${ones(o)}?` : `${n} is ${t} ${tensW(t)} and how many ones?`,
    visual: { kind: "places", digits: String(n), highlight: askTens ? 0 : 1 },
    answer: askTens ? t : o,
    input: "choices",
    choices: askTens
      ? makeChoices(t, { n: 4, min: 0, max: 99, likely: [o, n, t + 1] })
      : makeChoices(o, { n: 4, min: 0, max: 99, likely: [t, n, o + 1] }),
    hint: "In a two-digit number, the first digit is the tens. The second digit is the ones.",
    explain: `${n} is ${t} ${tensW(t)} and ${o} ${ones(o)}.`,
  };
}

const SIGN_WORD: Record<string, string> = { "<": "less than", ">": "greater than", "=": "equal to" };

/** 1.NBT.B.3 — compare two-digit numbers with <, > and =. */
export function compareTwoDigit(): Question {
  const kind = rand(0, 3);
  let a = rand(10, 99);
  let b = rand(10, 99);
  if (kind === 1) b = tensOf(a) * 10 + rand(0, 9);
  if (kind === 2) {
    const x = rand(1, 9);
    const y = rand(1, 9);
    a = x * 10 + y;
    b = y * 10 + x;
  }
  if (Math.random() < 0.1) b = a;
  const sign = a < b ? "<" : a > b ? ">" : "=";
  return {
    key: `cmp2-${a}-${b}`,
    prompt: pick(["Which sign goes in the box?", "Pick <, > or =."]),
    speech: `Is ${a} greater than, less than, or equal to ${b}?`,
    equation: [a, "?", b],
    visual: { kind: "blocks", numbers: [a, b], joiner: "vs" },
    ...fixed(["<", "=", ">"], sign),
    input: "choices",
    hint: "Compare the tens first. Same tens? Compare the ones. The open side faces the bigger number.",
    explain: `${a} ${sign} ${b}. ${a} is ${SIGN_WORD[sign]} ${b}.`,
  };
}

/** 1.NBT.C.5 — 10 more and 10 less on a hundred chart. */
export function tenMoreLess(): Question {
  const more = Math.random() < 0.5;
  const n = more ? rand(11, 90) : rand(11, 99);
  const ans = more ? n + 10 : n - 10;
  const eq: Token[] = [n, more ? "+" : "−", 10, "=", "?"];
  return {
    key: `tml-${more ? "m" : "l"}-${n}`,
    prompt: `What is 10 ${more ? "more" : "less"} than ${n}?`,
    speech: `What is 10 ${more ? "more" : "less"} than ${n}?`,
    equation: eq,
    visual: { kind: "hundred", highlight: [n], ask: ans },
    answer: ans,
    input: "choices",
    choices: makeChoices(ans, { n: 4, min: 1, max: 100, likely: [more ? n + 1 : n - 1, more ? n - 10 : n + 10, ans + 1, ans - 1] }),
    hint: more
      ? "On the hundred chart, 10 more is one row down. Only the tens digit goes up."
      : "On the hundred chart, 10 less is one row up. Only the tens digit goes down.",
    explain: `${filled(eq, ans)}. The ones digit stays ${onesOf(n)}.`,
  };
}

/** 1.NBT.C.4 — add a one-digit number or a multiple of ten to a two-digit number. */
export function addTwoDigitOne(): Question {
  const tensForm = Math.random() < 0.35;
  let a: number;
  let b: number;
  if (tensForm) {
    a = rand(11, 79);
    b = 10 * rand(1, Math.floor((99 - a) / 10));
  } else {
    a = rand(11, 89);
    const regroup = Math.random() < 0.6 && onesOf(a) >= 1;
    b = regroup ? rand(Math.max(2, 10 - onesOf(a)), 9) : rand(2, 9);
    if (a + b > 99) a -= 10;
  }
  const sum = a + b;
  const eq: Token[] = [a, "+", b, "=", "?"];
  const makesTen = !tensForm && onesOf(a) + b >= 10;
  return {
    key: `a2d-${a}-${b}`,
    prompt: pick(["What's the total?", "Add them up!", `${a} + ${b} = ?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: [a, b] },
    answer: sum,
    input: "keypad",
    hint: tensForm
      ? `Add the tens: ${tensOf(a)} ${tensW(tensOf(a))} and ${b / 10} more. The ones stay the same.`
      : makesTen
        ? `Add the ones: ${onesOf(a)} + ${b}. Ten ones make a new ten!`
        : `Add the ones: ${onesOf(a)} + ${b}. The tens stay the same.`,
    explain: tensForm
      ? `${tensOf(a)} ${tensW(tensOf(a))} + ${b / 10} ${tensW(b / 10)} = ${tensOf(sum)} tens. ${a} + ${b} = ${sum}.`
      : `${onesOf(a)} + ${b} = ${onesOf(a) + b}${makesTen ? ", a new ten" : ""}. ${a} + ${b} = ${sum}.`,
  };
}

/** 1.NBT.C.6 — subtract multiples of 10. */
export function subtractTens(): Question {
  const a = rand(2, 9) * 10;
  const b = rand(1, a / 10 - 1) * 10;
  const d = a - b;
  const eq: Token[] = [a, "−", b, "=", "?"];
  return {
    key: `subt-${a}-${b}`,
    prompt: pick(["Take away the tens!", `${a} − ${b} = ?`, "Tens minus tens?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: [a], goneTens: b / 10 },
    answer: d,
    input: "keypad",
    hint: `Think in tens: ${a / 10} tens take away ${b / 10} ${tensW(b / 10)}.`,
    explain: `${a / 10} tens − ${b / 10} ${tensW(b / 10)} = ${d / 10} ${tensW(d / 10)}. ${a} − ${b} = ${d}.`,
  };
}

/* ============================================ World: time, length & shapes */

interface LongThing {
  e: string;
  n: string;
}

const LONG_THINGS: LongThing[] = [
  { e: "✏️", n: "pencil" },
  { e: "🖍️", n: "crayon" },
  { e: "🥄", n: "spoon" },
  { e: "🪥", n: "toothbrush" },
  { e: "🔑", n: "key" },
  { e: "🐍", n: "snake" },
  { e: "🎀", n: "ribbon" },
  { e: "🥖", n: "bread" },
  { e: "🪱", n: "worm" },
  { e: "🧣", n: "scarf" },
  { e: "🥕", n: "carrot" },
  { e: "🍌", n: "banana" },
  { e: "🐛", n: "caterpillar" },
  { e: "🦎", n: "lizard" },
];
const thingName = (t: LongThing) => `${t.e} ${t.n}`;
/** Things kids can each own one of, for "whose is longest?" questions. */
const SAME_KIND: LongThing[] = [
  { e: "🎀", n: "ribbon" },
  { e: "🐍", n: "snake" },
  { e: "✏️", n: "pencil" },
  { e: "🧣", n: "scarf" },
  { e: "🪱", n: "worm" },
  { e: "🖍️", n: "crayon" },
  { e: "🚂", n: "toy train" },
];
const UNIT_THINGS: Thing[] = [
  { emoji: "📎", one: "paper clip", many: "paper clips" },
  { emoji: "🧱", one: "block", many: "blocks" },
  { emoji: "🖍️", one: "crayon", many: "crayons" },
  { emoji: "🧩", one: "puzzle piece", many: "puzzle pieces" },
];

/** 1.MD.A.1 — order three objects by length; compare two through a third. */
export function orderLengths(): Question {
  const kind = pick(SAME_KIND);
  const kids = names(3);
  const own = (who: string) => `${who}'s ${kind.e}`;
  if (Math.random() < 0.35) {
    // Indirect comparison: A vs B and B vs C are shown; the question is A vs C.
    const [A, B, C] = kids;
    const c = rand(2, 6);
    const b = rand(c + 1, 9);
    const a = rand(b + 1, 12);
    const up = Math.random() < 0.5;
    const len: Record<string, number> = up ? { [A]: c, [B]: b, [C]: a } : { [A]: a, [B]: b, [C]: c };
    const rel = (x: string, y: string) => (len[x] > len[y] ? "longer" : "shorter");
    const q = pick(["longer", "shorter"]);
    const ans = (len[A] > len[C]) === (q === "longer") ? A : C;
    return {
      key: `ord-i-${kind.n}-${kids.join("-")}-${a}-${b}-${c}-${up}-${q}`,
      prompt: `Whose ${kind.e} is ${q}: ${A}'s or ${C}'s?`,
      speech: `${A}'s ${kind.n} is ${rel(A, B)} than ${B}'s. ${B}'s is ${rel(B, C)} than ${C}'s. Whose is ${q}, ${A}'s or ${C}'s?`,
      visual: {
        kind: "lengths",
        items: [
          { name: own(A), length: len[A] },
          { name: own(B), length: len[B] },
          { name: own(B), length: len[B] },
          { name: own(C), length: len[C] },
        ],
      },
      needsVisual: true,
      ...fixed([A, C], ans),
      input: "choices",
      hint: `Use ${B}'s ${kind.n} to help. Is ${A}'s longer or shorter than it? And ${C}'s?`,
      explain: `${A}'s is ${rel(A, B)} than ${B}'s, and ${B}'s is ${rel(B, C)} than ${C}'s. So ${ans}'s is ${q}.`,
    };
  }
  const lens = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 3);
  const q = pick(["longest", "shortest", "middle"]);
  const order = kids.map((who, i) => ({ who, len: lens[i] })).sort((x, y) => y.len - x.len);
  const target = q === "longest" ? order[0] : q === "shortest" ? order[2] : order[1];
  const prompt = q === "middle" ? `Order the ${kind.e} by length. Whose is in the middle?` : `Whose ${kind.e} is the ${q}?`;
  return {
    key: `ord-${q}-${kind.n}-${kids.map((who, i) => `${who}${lens[i]}`).join("-")}`,
    prompt,
    speech:
      q === "middle"
        ? `Put the ${kind.n}s in order from longest to shortest. Whose is in the middle?`
        : `Whose ${kind.n} is the ${q}?`,
    visual: { kind: "lengths", items: kids.map((who, i) => ({ name: own(who), length: lens[i] })) },
    needsVisual: true,
    ...fixed(kids, target.who),
    input: "choices",
    hint: "They all start at the same line. Look at where each one ends.",
    explain: `From longest to shortest: ${order.map((o) => `${o.who}'s`).join(", ")}.`,
  };
}

/** 1.MD.A.2 — length as a number of same-size units laid end to end. */
export function measureUnits(): Question {
  const [A, B] = shuffle(LONG_THINGS).slice(0, 2);
  const r = Math.random();
  if (r < 0.3) {
    const unit = pick(UNIT_THINGS.filter((u) => u.emoji !== A.e));
    const n = rand(2, 10);
    return {
      key: `unit-line-${unit.one}-${A.n}-${n}`,
      prompt: `The ${A.e} is as long as these. How many ${unit.emoji}?`,
      speech: `The ${A.n} is as long as this line of ${unit.many}, end to end with no gaps. How many ${unit.many} long is it?`,
      visual: { kind: "objects", thing: unit, count: n, layout: "line" },
      needsVisual: true,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 4, min: 1, max: 15, likely: [n - 1, n + 1] }),
      hint: `Count each ${unit.one} once, from one end to the other.`,
      explain: `${n} ${unit.many} fit end to end, so the ${A.n} is ${n} ${unit.many} long.`,
    };
  }
  if (r < 0.65) {
    const n = rand(2, 12);
    return {
      key: `unit-${A.n}-${n}`,
      prompt: `How many boxes long is the ${A.e}?`,
      speech: `Each box is the same size. How many boxes long is the ${A.n}?`,
      visual: { kind: "tape", rows: [{ label: A.e, parts: n }] },
      needsVisual: true,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 4, min: 1, max: 15, likely: [n - 1, n + 1] }),
      hint: "Count the boxes from one end to the other. Touch each one once.",
      explain: `The ${A.n} is ${n} boxes long.`,
    };
  }
  const p = rand(2, 10);
  let q = rand(2, 10);
  while (q === p) q = rand(2, 10);
  const longer = p > q ? A : B;
  const shorter = p > q ? B : A;
  const visual: Visual = { kind: "lengths", items: [{ name: thingName(A), length: p }, { name: thingName(B), length: q }], units: true };
  if (Math.random() < 0.5) {
    const diff = Math.abs(p - q);
    return {
      key: `unit-diff-${A.n}-${B.n}-${p}-${q}`,
      prompt: `How many units longer is the ${longer.e}?`,
      speech: `Each mark on the bars is one unit. How many units longer is the ${longer.n} than the ${shorter.n}?`,
      visual,
      needsVisual: true,
      answer: diff,
      input: "choices",
      choices: makeChoices(diff, { n: 4, min: 0, max: 20, likely: [p + q, Math.max(p, q), diff + 1] }),
      hint: "Count the units on each bar. How many more on the longer one?",
      explain: `${Math.max(p, q)} − ${Math.min(p, q)} = ${diff}. The ${longer.n} is ${diff} units longer.`,
    };
  }
  const ask = Math.random() < 0.5 ? A : B;
  const len = ask === A ? p : q;
  return {
    key: `unit-read-${A.n}-${B.n}-${p}-${q}-${ask.n}`,
    prompt: `How many units long is the ${ask.e}?`,
    speech: `Each mark on the bars is one unit. How many units long is the ${ask.n}?`,
    visual,
    needsVisual: true,
    answer: len,
    input: "choices",
    choices: makeChoices(len, { n: 4, min: 1, max: 15, likely: [len - 1, len + 1, ask === A ? q : p] }),
    hint: `Find the ${ask.n}'s bar. Count its units from one end to the other.`,
    explain: `The ${ask.n} is ${len} units long.`,
  };
}

/** 1.MD.B.3 — time to the hour and half hour. */
export function clockHourHalf(): Question {
  const h = rand(1, 12);
  const half = Math.random() < 0.5;
  const m = half ? 30 : 0;
  const t = clockText(h, m);
  const words = half ? `half past ${h}` : `${h} o'clock`;
  const form = rand(0, 2);
  if (form === 0) {
    const wrongs = half
      ? [clockText(hourAdd(h, 1), 30), clockText(h, 0), clockText(hourAdd(h, -1), 30)]
      : [clockText(h, 30), clockText(hourAdd(h, 1), 0), clockText(hourAdd(h, -1), 0)];
    return {
      key: `clk-r-${h}-${m}`,
      prompt: pick(["What time is it?", "What time does the clock show?"]),
      speech: "What time does the clock show?",
      visual: { kind: "clock", h, m },
      needsVisual: true,
      ...labelChoices(t, wrongs),
      input: "choices",
      hint: half
        ? "The long hand points to 6: that's half past. The short hand has just passed the hour."
        : "The long hand points to 12: that's o'clock. The short hand shows the hour.",
      explain: `It's ${t}, ${words}.`,
    };
  }
  if (form === 1) {
    const wrongs = half
      ? [clockText(h, 0), clockText(hourAdd(h, 1), 30), clockText(hourAdd(h, -1), 30)]
      : [clockText(h, 30), clockText(hourAdd(h, 1), 0), clockText(hourAdd(h, -1), 0)];
    return {
      key: `clk-w-${h}-${m}`,
      prompt: `Which time is ${words}?`,
      speech: `Which time is ${words}?`,
      visual: { kind: "none" },
      ...labelChoices(t, wrongs),
      input: "choices",
      hint: half ? "Half past means 30 minutes after the hour." : "O'clock means 0 minutes after the hour: :00.",
      explain: `${words} is ${t}.`,
    };
  }
  const wrongs = half
    ? [`half past ${hourAdd(h, -1)}`, `${h} o'clock`, `half past ${hourAdd(h, 1)}`]
    : [`half past ${h}`, `${hourAdd(h, 1)} o'clock`, `${hourAdd(h, -1)} o'clock`];
  return {
    key: `clk-n-${h}-${m}`,
    prompt: "What do we call this time?",
    speech: "What do we call the time on this clock?",
    visual: { kind: "clock", h, m },
    needsVisual: true,
    ...labelChoices(words, wrongs),
    input: "choices",
    hint: "Long hand on 12 is o'clock. Long hand on 6 is half past.",
    explain: `The clock shows ${t}: ${words}.`,
  };
}

interface GraphTheme {
  title: string;
  items: [string, string, string][];
}

const GRAPH_THEMES: GraphTheme[] = [
  { title: "Favorite fruit", items: [["Apple", "🍎", "apples"], ["Banana", "🍌", "bananas"], ["Grapes", "🍇", "grapes"], ["Pear", "🍐", "pears"]] },
  { title: "Our pets", items: [["Dog", "🐶", "dogs"], ["Cat", "🐱", "cats"], ["Fish", "🐟", "fish"], ["Bird", "🐦", "birds"]] },
  { title: "Weather this month", items: [["Sunny", "☀️", "sunny days"], ["Rainy", "🌧️", "rainy days"], ["Cloudy", "☁️", "cloudy days"], ["Snowy", "❄️", "snowy days"]] },
  { title: "Bugs we saw", items: [["Ladybug", "🐞", "ladybugs"], ["Bee", "🐝", "bees"], ["Butterfly", "🦋", "butterflies"], ["Ant", "🐜", "ants"]] },
  { title: "Favorite toy", items: [["Ball", "⚽", "balls"], ["Teddy", "🧸", "teddies"], ["Car", "🚗", "cars"], ["Kite", "🪁", "kites"]] },
  { title: "Snack votes", items: [["Cookie", "🍪", "cookies"], ["Carrot", "🥕", "carrots"], ["Cheese", "🧀", "cheese votes"], ["Popcorn", "🍿", "popcorn votes"]] },
];

/** Read a picture graph or bar graph with 3 or 4 categories (1.MD.C.4, 2.MD.D.10). */
function graphQuestion(nCats: 3 | 4, kind: "pictograph" | "bars"): Question {
  const theme = pick(GRAPH_THEMES);
  const cats = shuffle(theme.items).slice(0, nCats);
  const counts = shuffle(Array.from({ length: nCats === 3 ? 8 : 10 }, (_, i) => i + 1)).slice(0, nCats);
  const data = cats.map(([label, emoji, say], i) => ({ label, emoji, say, count: counts[i] }));
  const visual: Visual =
    kind === "pictograph"
      ? { kind: "pictograph", title: theme.title, items: data.map((d) => ({ label: d.label, emoji: d.emoji, count: d.count })), key: 1 }
      : { kind: "bars", title: theme.title, items: data.map((d) => ({ label: `${d.emoji} ${d.label}`, value: d.count })), max: 10, step: 1 };
  const [x, y] = shuffle(data);
  const big = x.count > y.count ? x : y;
  const small = big === x ? y : x;
  const total = data.reduce((s, d) => s + d.count, 0);
  const qk = rand(0, nCats === 4 ? 6 : 5);
  const base = {
    key: `gr-${kind}-${theme.title}-${data.map((d) => d.label + d.count).join(".")}-${qk}-${x.label}-${y.label}`,
    visual,
    needsVisual: true,
    input: "choices" as const,
  };
  const num = (ans: number, likely: number[]) => ({ answer: ans, choices: makeChoices(ans, { n: 4, min: 0, max: 50, likely }) });
  const look = kind === "bars" ? "Read the number at the end of each bar." : "Count the pictures in each row.";
  switch (qk) {
    case 0:
      return {
        ...base,
        prompt: `How many ${x.emoji} ${x.say}?`,
        speech: `Look at the graph. How many ${x.say}?`,
        ...num(x.count, [x.count + 1, x.count - 1, y.count]),
        hint: `Find the ${x.emoji} row. ${look}`,
        explain: `There are ${x.count} ${x.say}.`,
      };
    case 1:
      return {
        ...base,
        prompt: "How many in all?",
        speech: "How many are there in all? Add up every group.",
        ...num(total, [total + 1, total - 1, nCats, Math.max(...counts)]),
        hint: "Find how many in each group. Then add them all.",
        explain: `${data.map((d) => d.count).join(" + ")} = ${total}.`,
      };
    case 2:
      return {
        ...base,
        prompt: `How many more ${big.emoji} than ${small.emoji}?`,
        speech: `How many more ${big.say} than ${small.say}?`,
        ...num(big.count - small.count, [big.count + small.count, big.count, big.count - small.count + 1]),
        hint: `Find both numbers. Then subtract: ${big.say} minus ${small.say}.`,
        explain: `${big.count} − ${small.count} = ${big.count - small.count}.`,
      };
    case 3:
      return {
        ...base,
        prompt: `How many fewer ${small.emoji} than ${big.emoji}?`,
        speech: `How many fewer ${small.say} than ${big.say}?`,
        ...num(big.count - small.count, [big.count + small.count, small.count, big.count - small.count - 1]),
        hint: "Find both numbers. How far apart are they?",
        explain: `${big.count} − ${small.count} = ${big.count - small.count}.`,
      };
    case 4:
      return {
        ...base,
        prompt: `How many ${x.emoji} and ${y.emoji} together?`,
        speech: `How many ${x.say} and ${y.say} together?`,
        ...num(x.count + y.count, [x.count + y.count + 1, Math.abs(x.count - y.count), x.count + y.count - 1]),
        hint: "Find both numbers. Then add them.",
        explain: `${x.count} + ${y.count} = ${x.count + y.count}.`,
      };
    case 5: {
      const most = Math.random() < 0.5;
      const sorted = [...data].sort((p, q) => q.count - p.count);
      const ans = most ? sorted[0] : sorted[sorted.length - 1];
      return {
        ...base,
        prompt: `Which has the ${most ? "most" : "fewest"}?`,
        speech: `Which group has the ${most ? "most" : "fewest"}?`,
        ...fixed(data.map((d) => `${d.emoji} ${d.label}`), `${ans.emoji} ${ans.label}`),
        hint: kind === "bars" ? `Look for the ${most ? "longest" : "shortest"} bar.` : `Look for the ${most ? "longest" : "shortest"} row.`,
        explain: `${ans.label} has ${ans.count}, the ${most ? "most" : "fewest"}.`,
      };
    }
    default: {
      const k = rand(2, 6);
      return {
        ...base,
        prompt: `${k} more pick ${x.emoji}. How many ${x.emoji} now?`,
        speech: `If ${k} more join the ${x.label} group, how many ${x.say} will there be?`,
        ...num(x.count + k, [x.count, k, x.count + k + 1]),
        hint: `Read how many ${x.say} there are now. Then add ${k}.`,
        explain: `${x.count} + ${k} = ${x.count + k}.`,
      };
    }
  }
}

/** 1.MD.C.4 — read a picture graph with three groups. */
export const pictureGraphThree = () => graphQuestion(3, "pictograph");

const FLAT: { s: ShapeName; sides: number; rule?: string }[] = [
  { s: "triangle", sides: 3, rule: "3 straight sides" },
  { s: "square", sides: 4, rule: "4 equal sides, square corners" },
  { s: "rectangle", sides: 4, rule: "4 sides, 4 square corners" },
  { s: "hexagon", sides: 6, rule: "6 straight sides" },
  { s: "pentagon", sides: 5, rule: "5 straight sides" },
  { s: "circle", sides: 0, rule: "A round edge, no corners" },
  { s: "trapezoid", sides: 4 },
  { s: "rhombus", sides: 4 },
];
const NOT_RULES = ["It is red", "It is big", "It is small", "It points up", "It is blue", "It is turned"];

/** 1.G.A.1 — defining attributes (sides, corners) vs. colour, size, turn. */
export function shapeAttributes(): Question {
  const form = rand(0, 5);
  const turn = pick([0, 0, 30, 45, 90, 180]);
  const scale = pick([0.6, 0.8, 1, 1.2]);
  const withSides = FLAT.filter((f) => f.sides > 0);
  if (form <= 1) {
    const f = pick(withSides);
    const what = form === 0 ? "sides" : "corners";
    return {
      key: `attr-${what}-${f.s}`,
      prompt: `How many ${what} does this shape have?`,
      speech: `How many ${what} does this ${f.s} have?`,
      visual: { kind: "shape", shape: f.s },
      needsVisual: true,
      answer: f.sides,
      input: "choices",
      choices: makeChoices(f.sides, { n: 4, min: 0, max: 8, likely: [f.sides + 1, f.sides - 1] }),
      hint: form === 0 ? "Trace each straight side with your finger and count." : "Count each pointy corner where two sides meet.",
      explain: `A ${f.s} has ${f.sides} ${what}.`,
    };
  }
  if (form === 2) {
    const f = pick(FLAT);
    const skip: string[] = f.s === "square" ? ["rectangle", "rhombus"] : [];
    const wrongs = shuffle(FLAT.map((g) => g.s).filter((s) => s !== f.s && !skip.includes(s)));
    return {
      key: `attr-name-${f.s}-${turn}-${scale}`,
      prompt: "What shape is this?",
      speech: "What is the name of this shape?",
      visual: { kind: "shape", shape: f.s, turn, scale },
      needsVisual: true,
      ...labelChoices(f.s, wrongs),
      input: "choices",
      hint: "Count the sides and corners. That tells you the shape.",
      explain: f.sides ? `It has ${f.sides} sides, so it's a ${f.s}.` : "It's round with no corners, so it's a circle.",
    };
  }
  if (form === 3) {
    const f = pick(FLAT.filter((g) => g.rule));
    const wrongs = shuffle(NOT_RULES).slice(0, 3);
    return {
      key: `attr-rule-${f.s}-${wrongs.join(",")}`,
      prompt: `What makes this a ${f.s}?`,
      speech: `What makes this shape a ${f.s}?`,
      visual: { kind: "shape", shape: f.s, turn, scale },
      ...labelChoices(f.rule!, wrongs),
      input: "choices",
      hint: "Colour, size and which way it turns don't change the shape. Sides and corners do!",
      explain: `A ${f.s} has ${f.rule!.toLowerCase()}, whatever its colour, size or turn.`,
    };
  }
  if (form === 5) {
    const ask = pick(FLAT.filter((g) => g.rule));
    const same = Math.random() < 0.6;
    const confusable: Partial<Record<ShapeName, ShapeName[]>> = {
      triangle: ["trapezoid", "pentagon"],
      square: ["rhombus", "trapezoid"],
      rectangle: ["trapezoid", "rhombus"],
      hexagon: ["pentagon"],
      pentagon: ["hexagon"],
      circle: ["hexagon"],
    };
    const shown = same ? ask.s : pick(confusable[ask.s]!);
    const shownSides = FLAT.find((g) => g.s === shown)!.sides;
    return {
      key: `attr-is-${ask.s}-${shown}-${turn}-${scale}`,
      prompt: `Is this a ${ask.s}?`,
      speech: `Look closely. Is this shape a ${ask.s}?`,
      visual: { kind: "shape", shape: shown, turn, scale },
      needsVisual: true,
      ...fixed(["Yes", "No"], same ? "Yes" : "No"),
      input: "choices",
      hint: `A ${ask.s} has ${ask.rule!.toLowerCase()}. Size and turn don't matter.`,
      explain: same
        ? `Yes! It's turned or resized, but it still has ${ask.rule!.toLowerCase()}.`
        : `No. A ${ask.s} has ${ask.rule!.toLowerCase()}. This shape has ${shownSides} sides: it's a ${shown}.`,
    };
  }
  const kinds: ShapeName[] = ["triangle", "square", "circle", "rectangle", "hexagon"];
  const target = pick(kinds);
  let row: ShapeName[];
  do {
    row = Array.from({ length: rand(5, 8) }, () => pick(kinds));
  } while (!row.includes(target));
  const count = row.filter((s) => s === target).length;
  return {
    key: `attr-count-${target}-${row.join(",")}`,
    prompt: `How many ${target}s?`,
    speech: `How many ${target}s can you find? Big or small, any way they turn.`,
    visual: { kind: "shapes", shapes: row },
    needsVisual: true,
    answer: count,
    input: "choices",
    choices: makeChoices(count, { n: 4, min: 0, max: 8, likely: [count + 1, count - 1] }),
    hint: `Touch each ${target} as you count. Check the sides and corners!`,
    explain: `There ${count === 1 ? "is" : "are"} ${count} ${count === 1 ? target : `${target}s`}.`,
  };
}

const COMPOSE: { parts: ShapeName[]; partName: string; whole: string; wrong: string[] }[] = [
  { parts: ["triangle", "triangle", "triangle", "triangle", "triangle", "triangle"], partName: "6 triangles", whole: "hexagon", wrong: ["circle", "square", "rectangle"] },
  { parts: ["trapezoid", "trapezoid"], partName: "2 trapezoids", whole: "hexagon", wrong: ["circle", "triangle", "square"] },
  { parts: ["triangle", "triangle", "triangle"], partName: "3 triangles", whole: "trapezoid", wrong: ["circle", "square", "pentagon"] },
  { parts: ["triangle", "triangle"], partName: "2 triangles", whole: "rhombus", wrong: ["circle", "pentagon", "hexagon"] },
  { parts: ["square", "square"], partName: "2 squares", whole: "rectangle", wrong: ["circle", "triangle", "hexagon"] },
  { parts: ["cube", "cube"], partName: "2 cubes", whole: "rectangular prism", wrong: ["sphere", "cone", "cylinder"] },
  { parts: ["cylinder", "cylinder"], partName: "2 cylinders, stacked,", whole: "cylinder", wrong: ["sphere", "cone", "cube"] },
  { parts: ["semicircle", "semicircle"], partName: "2 half circles", whole: "circle", wrong: ["square", "triangle", "hexagon"] },
];

/** 1.G.A.2 — put shapes together to make new shapes. */
export function composeShapes(): Question {
  if (Math.random() < 0.6) {
    const c = pick(COMPOSE);
    const visual: Visual = { kind: "shapes", shapes: c.parts };
    return {
      key: `comp-${c.partName}-${c.whole}`,
      prompt: `${c.partName} make a…`,
      speech: `Put ${c.partName.replace(",", "")} together. What shape can they make?`,
      visual,
      needsVisual: true,
      ...labelChoices(c.whole, c.wrong),
      input: "choices",
      hint: "Picture sliding the pieces together with no gaps. Count the outside sides.",
      explain: `${c.partName.replace(",", "")} can make a ${c.whole}.`,
    };
  }
  const w = rand(2, 5);
  const h = rand(1, 2);
  return {
    key: `comp-grid-${w}-${h}`,
    prompt: "How many squares make this rectangle?",
    speech: "This rectangle is made of small squares. How many squares?",
    visual: { kind: "rect", w, h, showW: false, showH: false, grid: true, unit: "" },
    needsVisual: true,
    answer: w * h,
    input: "choices",
    choices: makeChoices(w * h, { n: 4, min: 1, max: 12, likely: [w + h, w * h + 1, w * h - 1] }),
    hint: "Touch each small square as you count.",
    explain: `${w * h} squares make the rectangle.`,
  };
}

const SHARE_NAME: Record<number, [string, string]> = { 2: ["a half", "halves"], 3: ["a third", "thirds"], 4: ["a fourth", "fourths"] };

/** 1.G.A.3, 2.G.A.3 — are these equal shares? A mix of equal and lopsided cuts. */
function equalOrNot(parts: number, shape: "bar" | "pie", tag: string): Question {
  const unequal = Math.random() < 0.5;
  const named = Math.random() < 0.5;
  const many = SHARE_NAME[parts][1];
  return {
    key: `${tag}-eq-${shape}-${parts}-${unequal}-${named}`,
    prompt: named ? `Is it cut into ${many}?` : "Are these equal shares?",
    speech: named ? `Is this ${shape === "pie" ? "circle" : "rectangle"} cut into ${many}?` : `This ${shape === "pie" ? "circle" : "rectangle"} is cut into ${parts} parts. Are they equal shares?`,
    visual: { kind: "fractions", bars: [{ parts, shape, unequal }] },
    needsVisual: true,
    ...fixed(["Yes", "No"], unequal ? "No" : "Yes"),
    input: "choices",
    hint: `${cap(many)} must all be the same size. Do the parts match?`,
    explain: unequal
      ? `No. ${parts === 2 ? "One part is bigger than the other" : "Some parts are bigger than others"}, so they aren't ${many}.`
      : `Yes! ${parts === 2 ? "Both parts are" : `All ${parts} parts are`} the same size, so they are ${many}.`,
  };
}

/** 1.G.A.3 — halves and fourths of circles and rectangles. */
export function halvesFourths(): Question {
  const form = rand(0, 6);
  const shape = pick(["bar", "pie"] as const);
  const thing = shape === "pie" ? "pizza" : "cake";
  const parts = pick([2, 4]);
  if (form === 6) return equalOrNot(parts, shape, "hf");
  if (form === 0) {
    const whole = Math.random() < 0.25;
    const label = whole ? "the whole" : SHARE_NAME[parts][0];
    return {
      key: `hf-name-${shape}-${parts}-${whole}`,
      prompt: "What do we call the coloured part?",
      speech: `The ${thing} is cut into ${parts} equal parts. What do we call the coloured part?`,
      visual: { kind: "fractions", bars: [{ parts, a: whole ? parts : 1, shape }] },
      needsVisual: true,
      ...fixed(["a half", "a fourth", "the whole"], label),
      input: "choices",
      hint: "Count the equal parts. 2 parts are halves. 4 parts are fourths.",
      explain: whole ? "Every part is coloured, so it's the whole." : `${parts} equal parts, so one part is ${label}.`,
    };
  }
  if (form === 1) {
    return {
      key: `hf-count-${shape}-${parts}`,
      prompt: "How many equal parts?",
      speech: `How many equal parts is the ${thing} cut into?`,
      visual: { kind: "fractions", bars: [{ parts, shape }] },
      needsVisual: true,
      answer: parts,
      input: "choices",
      choices: [1, 2, 3, 4],
      hint: "Touch each part as you count.",
      explain: `There are ${parts} equal parts: ${SHARE_NAME[parts][1]}.`,
    };
  }
  if (form === 2) {
    return {
      key: `hf-whole-${shape}-${parts}`,
      prompt: `How many ${SHARE_NAME[parts][1]} make the whole?`,
      speech: `How many ${SHARE_NAME[parts][1]} make one whole ${thing}?`,
      visual: { kind: "fractions", bars: [{ parts, a: parts, shape }] },
      answer: parts,
      input: "choices",
      choices: [1, 2, 3, 4],
      hint: `Count the ${SHARE_NAME[parts][1]} in the whole.`,
      explain: `${parts} ${SHARE_NAME[parts][1]} make one whole.`,
    };
  }
  if (form === 3) {
    const bigger = Math.random() < 0.5;
    return {
      key: `hf-size-${shape}-${bigger}`,
      prompt: `Which piece is ${bigger ? "bigger" : "smaller"}?`,
      speech: `Two ${thing}s, the same size. Which piece is ${bigger ? "bigger" : "smaller"}, a half or a fourth?`,
      visual: {
        kind: "fractions",
        bars: [
          { parts: 2, a: 1, shape, label: "half" },
          { parts: 4, a: 1, shape, label: "fourth" },
        ],
      },
      needsVisual: true,
      ...fixed(["a half", "a fourth"], bigger ? "a half" : "a fourth"),
      input: "choices",
      hint: "Cutting into more parts makes each part smaller.",
      explain: "A half is bigger than a fourth. More parts means smaller parts.",
    };
  }
  if (form === 4) {
    return {
      key: `hf-quarter-${shape}`,
      prompt: "Another name for a fourth is…",
      speech: "A fourth has another name. What is it?",
      visual: { kind: "fractions", bars: [{ parts: 4, a: 1, shape }] },
      ...fixed(["a quarter", "a half", "a whole"], "a quarter"),
      input: "choices",
      hint: "Think of money: 4 of these coins make a dollar.",
      explain: "A fourth is also called a quarter.",
    };
  }
  const a = rand(1, 3);
  return {
    key: `hf-shaded-${shape}-${a}`,
    prompt: "How many fourths are coloured?",
    speech: `The ${thing} is cut into fourths. How many fourths are coloured?`,
    visual: { kind: "fractions", bars: [{ parts: 4, a, shape }] },
    needsVisual: true,
    answer: a,
    input: "choices",
    choices: [1, 2, 3, 4],
    hint: "Count only the coloured parts.",
    explain: `${a} of the 4 fourths ${a === 1 ? "is" : "are"} coloured.`,
  };
}

/* ======================================================== World: to 1,000 */

/** 2.NBT.A.1a, 2.NBT.A.1b — hundreds as bundles of tens; read hundreds, tens, ones. */
export function hundredsBlocks(): Question {
  const form = rand(0, 4);
  if (form <= 1) {
    const n = rand(100, 999);
    return {
      key: `hb-${n}`,
      prompt: "What number do the blocks show?",
      speech: "What number do the blocks show? Flats are hundreds, sticks are tens, cubes are ones.",
      visual: { kind: "blocks", numbers: [n] },
      needsVisual: true,
      answer: n,
      input: "keypad",
      hint: "Count the flats by 100s, then the sticks by 10s, then the cubes by 1s.",
      explain: `${Math.floor(n / 100)} hundreds, ${tensOf(n % 100)} ${tensW(tensOf(n % 100))} and ${onesOf(n)} ${ones(onesOf(n))} make ${n}.`,
    };
  }
  const k = rand(1, 9);
  if (form === 2) {
    return {
      key: `hb-k-${k}`,
      prompt: `${k} hundreds is what number?`,
      speech: `${k} hundreds, 0 tens and 0 ones. What number is that?`,
      visual: { kind: "blocks", numbers: [k * 100] },
      answer: k * 100,
      input: "keypad",
      hint: "Count by hundreds: 100, 200, 300…",
      explain: `${k} hundreds is ${k * 100}.`,
    };
  }
  if (form === 3) {
    return {
      key: `hb-howmany-${k}`,
      prompt: `${k * 100} is how many hundreds?`,
      speech: `${k * 100} is how many hundreds?`,
      visual: { kind: "places", digits: String(k * 100), highlight: 0 },
      answer: k,
      input: "choices",
      choices: makeChoices(k, { n: 4, min: 0, max: 10, likely: [k + 1, k - 1, 0] }),
      hint: "The hundreds digit tells how many hundreds.",
      explain: `${k * 100} is ${k} hundreds, 0 tens and 0 ones.`,
    };
  }
  if (Math.random() < 0.5) {
    return {
      key: "hb-tens-in-100",
      prompt: "How many tens make 100?",
      speech: "How many tens make 100?",
      visual: { kind: "none" },
      answer: 10,
      input: "choices",
      choices: makeChoices(10, { n: 4, min: 1, max: 100, likely: [1, 100, 9] }),
      hint: "Count by tens until you reach 100: 10, 20, 30…",
      explain: "10 tens make 100. That's one hundred!",
    };
  }
  return {
    key: `hb-tens-make-${k}`,
    prompt: `${k * 10} tens make what number?`,
    speech: `${k * 10} tens. What number is that?`,
    visual: { kind: "blocks", numbers: [k * 100] },
    answer: k * 100,
    input: "keypad",
    hint: "Every 10 tens make 1 hundred.",
    explain: `${k * 10} tens = ${k} hundreds = ${k * 100}.`,
  };
}

const PLACE = ["hundreds", "tens", "ones"];

/** 2.NBT.A.3 — the value of each digit in a three-digit number. */
export function placeValue3(): Question {
  let digits: number[];
  do {
    digits = [rand(1, 9), rand(0, 9), rand(0, 9)];
  } while (new Set(digits).size < 3);
  const n = digits[0] * 100 + digits[1] * 10 + digits[2];
  const form = rand(0, 2);
  if (form === 0) {
    let p = rand(0, 2);
    if (digits[p] === 0) p = 0;
    const d = digits[p];
    const value = d * 10 ** (2 - p);
    return {
      key: `pv-val-${n}-${p}`,
      prompt: `What is the ${d} worth in ${n}?`,
      speech: `In ${n}, what is the ${d} worth?`,
      visual: { kind: "places", digits: String(n), highlight: p },
      answer: value,
      input: "choices",
      choices: makeChoices(value, { n: 4, min: 0, max: 900, likely: [d, d * 10, d * 100].filter((v) => v !== value) }),
      hint: `The ${d} is in the ${PLACE[p]} place.`,
      explain: `The ${d} is in the ${PLACE[p]} place, so it's worth ${value}.`,
    };
  }
  if (form === 1) {
    const p = rand(0, 2);
    return {
      key: `pv-digit-${n}-${p}`,
      prompt: `Which digit is in the ${PLACE[p]} place of ${n}?`,
      speech: `Which digit is in the ${PLACE[p]} place of ${n}?`,
      visual: { kind: "none" },
      answer: digits[p],
      input: "choices",
      choices: shuffle([...digits, ...[rand(0, 9)].filter((x) => !digits.includes(x))]),
      hint: "From the left: hundreds, then tens, then ones.",
      explain: `${n} has ${digits[0]} hundreds, ${digits[1]} ${tensW(digits[1])} and ${digits[2]} ${ones(digits[2])}.`,
    };
  }
  return {
    key: `pv-build-${n}`,
    prompt: `${digits[0]} hundreds, ${digits[1]} ${tensW(digits[1])}, ${digits[2]} ${ones(digits[2])} = ?`,
    speech: `${digits[0]} hundreds, ${digits[1]} ${tensW(digits[1])} and ${digits[2]} ${ones(digits[2])}. What number is that?`,
    visual: { kind: "blocks", numbers: [n] },
    answer: n,
    input: "keypad",
    hint: "Write the hundreds digit, then the tens digit, then the ones digit.",
    explain: `${digits[0] * 100} + ${digits[1] * 10} + ${digits[2]} = ${n}.`,
  };
}

/** 2.NBT.A.3 — expanded form and number names to 1,000. */
export function expandedForm(): Question {
  const H = rand(1, 9);
  const zero = Math.random() < 0.25;
  const T = zero && Math.random() < 0.5 ? 0 : rand(1, 9);
  const O = zero && T !== 0 ? 0 : rand(0, 9);
  const n = H * 100 + T * 10 + O;
  const form = rand(0, 3);
  const parts = [H * 100, T * 10, O].filter((x) => x > 0);
  if (form === 0) {
    const eq: Token[] = [...plusList(parts), "=", "?"];
    return {
      key: `ex-join-${n}`,
      prompt: pick(["Write the number!", `${parts.join(" + ")} = ?`]),
      speech: `${sayEquation(eq)}?`,
      equation: eq,
      visual: { kind: "none" },
      answer: n,
      input: "keypad",
      hint: T === 0 ? "No tens? Put a 0 in the tens place." : O === 0 ? "No ones? Put a 0 in the ones place." : "Hundreds digit, tens digit, ones digit.",
      explain: `${parts.join(" + ")} = ${n}.`,
    };
  }
  if (form === 1 && T > 0) {
    const askHundreds = Math.random() < 0.4;
    const eq: Token[] = askHundreds ? [n, "=", "?", "+", T * 10, ...(O ? ["+", O] : [])] : [n, "=", H * 100, "+", "?", ...(O ? ["+", O] : [])];
    const ans = askHundreds ? H * 100 : T * 10;
    const digit = askHundreds ? H : T;
    return {
      key: `ex-miss-${n}-${askHundreds}`,
      prompt: "What number is missing?",
      speech: `${sayEquation(eq)}?`,
      equation: eq,
      visual: { kind: "places", digits: String(n), highlight: askHundreds ? 0 : 1 },
      answer: ans,
      input: "choices",
      choices: makeChoices(ans, { n: 4, min: 0, max: 900, likely: [digit, digit * 10, digit * 100].filter((v) => v !== ans) }),
      hint: `What is the ${digit} worth in ${n}?`,
      explain: `${n} = ${parts.join(" + ")}.`,
    };
  }
  if (form === 2) {
    return {
      key: `ex-words-${n}`,
      prompt: `Type the number: ${numberWords(n)}`,
      speech: `Type the number ${numberWords(n)}.`,
      visual: { kind: "none" },
      answer: n,
      input: "keypad",
      hint: T === 0 ? "No tens are said, so put a 0 in the tens place." : "Hundreds first, then tens, then ones.",
      explain: `${numberWords(n)} is ${n}.`,
    };
  }
  const swap = H * 100 + O * 10 + T;
  const wrongs = [swap, T > 0 ? T * 100 + H * 10 + O : n + 100, n + 10 <= 999 ? n + 10 : n - 10, H * 10 + O]
    .filter((x) => x !== n && x > 0 && x < 1000)
    .map(numberWords);
  return {
    key: `ex-name-${n}`,
    prompt: `How do you say ${n}?`,
    speech: "How do you say this number?",
    visual: { kind: "places", digits: String(n), highlight: 0 },
    ...labelChoices(numberWords(n), wrongs),
    input: "choices",
    hint: "Say the hundreds, then the tens and ones.",
    explain: `${n} is ${numberWords(n)}.`,
  };
}

/** 2.NBT.A.2 — count within 1,000; skip count by 5s, 10s and 100s. */
export function skipCount1000(): Question {
  const kind = pick(["5", "10", "10any", "100", "1"]);
  let step: number;
  let start: number;
  let back = false;
  if (kind === "5") {
    step = 5;
    start = 5 * rand(0, 197);
  } else if (kind === "10") {
    step = 10;
    back = Math.random() < 0.25;
    start = back ? 10 * rand(4, 100) : 10 * rand(0, 97);
  } else if (kind === "10any") {
    step = 10;
    start = rand(101, 960);
    if (start % 10 === 0) start += 3;
  } else if (kind === "100") {
    step = 100;
    back = Math.random() < 0.25;
    start = back ? rand(4, 9) * 100 + pick([0, rand(1, 99)]) : rand(1, 6) * 100 + pick([0, rand(1, 99)]);
  } else {
    step = 1;
    start = rand(1, 10) * 100 - rand(2, 4);
  }
  const d = back ? -step : step;
  const seq = [start, start + d, start + 2 * d];
  const next = start + 3 * d;
  const likely = step === 100 ? [next + 10, next - 10 * Math.sign(d) + 100 * 0, seq[2] + 10] : step === 1 ? [next + 1, next - 10, next + 100] : [next + 1, next - 1, seq[2] + 2 * d];
  return {
    key: `sk-${kind}-${back ? "b" : "f"}-${start}`,
    prompt: step === 1 ? "What number comes next?" : `Count ${back ? "back " : ""}by ${step}s! What's next?`,
    speech: `${step === 1 ? "Count on" : `Count ${back ? "back " : ""}by ${step}s`}. ${seq.join(", ")}. What comes next?`,
    visual: { kind: "sequence", numbers: seq, next },
    needsVisual: true,
    answer: next,
    input: "choices",
    choices: makeChoices(next, { n: 4, min: 0, max: 1000, likely }),
    hint: step === 1 ? "After 9 ones comes a new ten. After 9 tens comes a new hundred!" : `${back ? "Take away" : "Add"} ${step} each time.`,
    explain: `${seq[2]} ${back ? "−" : "+"} ${step} = ${next}.`,
  };
}

/** 2.NBT.A.4 — compare three-digit numbers. */
export function compareThreeDigit(): Question {
  const kind = rand(0, 4);
  const h = rand(1, 9);
  const t = rand(0, 9);
  const o = rand(0, 9);
  let a = h * 100 + t * 10 + o;
  let b: number;
  if (kind === 0) b = rand(100, 999);
  else if (kind === 1) b = h * 100 + rand(0, 99);
  else if (kind === 2) b = h * 100 + t * 10 + rand(0, 9);
  else if (kind === 3) b = h * 100 + o * 10 + t;
  else {
    const hh = rand(2, 9) * 100;
    a = hh - rand(1, 5);
    b = hh + rand(0, 5);
  }
  if (Math.random() < 0.1) b = a;
  if (Math.random() < 0.5) [a, b] = [b, a];
  const sign = a < b ? "<" : a > b ? ">" : "=";
  return {
    key: `cmp3-${a}-${b}`,
    prompt: pick(["Which sign goes in the box?", "Pick <, > or =."]),
    speech: `Is ${a} greater than, less than, or equal to ${b}?`,
    equation: [a, "?", b],
    visual: { kind: "blocks", numbers: [a, b], joiner: "vs" },
    ...fixed(["<", "=", ">"], sign),
    input: "choices",
    hint: "Compare the hundreds first. Same? Compare the tens. Still the same? Compare the ones.",
    explain: `${a} ${sign} ${b}. ${a} is ${SIGN_WORD[sign]} ${b}.`,
  };
}

/** 2.NBT.B.8 — add or subtract 10 or 100 in your head. */
export function tenHundredMore(): Question {
  const by = pick([10, 100]);
  const plus = Math.random() < 0.5;
  let n = rand(100, 900);
  if (by === 10 && Math.random() < 0.25) n = plus ? rand(1, 8) * 100 + 90 + rand(0, 9) : rand(2, 9) * 100 + rand(0, 9);
  const ans = plus ? n + by : n - by;
  const place = by === 10 ? "tens" : "hundreds";
  const tricky = Math.floor(ans / (by * 10)) !== Math.floor(n / (by * 10));
  const eq: Token[] = [n, plus ? "+" : "−", by, "=", "?"];
  return {
    key: `thm-${plus ? "p" : "m"}-${by}-${n}`,
    prompt: pick([`What is ${by} ${plus ? "more" : "less"} than ${n}?`, `${n} ${plus ? "+" : "−"} ${by} = ?`]),
    speech: `What is ${by} ${plus ? "more" : "less"} than ${n}?`,
    equation: eq,
    visual: { kind: "places", digits: String(n), highlight: by === 10 ? 1 : 0 },
    answer: ans,
    input: "keypad",
    hint: tricky
      ? `The ${place} digit ${plus ? "goes past 9" : "goes below 0"}, so the next place changes too!`
      : `Only the ${place} digit changes. It goes ${plus ? "up" : "down"} by 1.`,
    explain: `${filled(eq, ans)}.`,
  };
}

/** 2.OA.C.3 — odd or even; even numbers as a sum of two equal addends. */
export function oddEven(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const thing = nextThing();
    const n = rand(2, 20);
    const even = n % 2 === 0;
    return {
      key: `oe-pic-${n}`,
      prompt: pick(["Pair them up. Odd or even?", `Odd or even number of ${thing.many}?`]),
      speech: `Pair up the ${thing.many}. Is there an odd or even number?`,
      visual: { kind: "rows", thing, top: Math.ceil(n / 2), bottom: Math.floor(n / 2) },
      needsVisual: true,
      ...fixed(["even", "odd"], even ? "even" : "odd"),
      input: "choices",
      hint: "Match each one with a partner. If one is left over, it's odd.",
      explain: even ? `${n} makes ${n / 2} pairs with none left over. ${n} is even.` : `${n} makes ${(n - 1) / 2} pairs and 1 left over. ${n} is odd.`,
    };
  }
  if (form === 1) {
    const n = rand(2, 99);
    const even = n % 2 === 0;
    return {
      key: `oe-num-${n}`,
      prompt: `Is ${n} odd or even?`,
      speech: `Is ${n} an odd or an even number?`,
      visual: { kind: "none" },
      ...fixed(["even", "odd"], even ? "even" : "odd"),
      input: "choices",
      hint: "Look at the ones digit. 0, 2, 4, 6 and 8 are even.",
      explain: `${n} ends in ${onesOf(n)}, so it's ${even ? "even" : "odd"}.`,
    };
  }
  const thing = nextThing();
  const k = rand(2, 10);
  const n = 2 * k;
  const eq: Token[] = [n, "=", "?", "+", "?"];
  return {
    key: `oe-dbl-${k}`,
    prompt: `${n} is even. Split it into two equal parts.`,
    speech: `${n} is even, so it splits into two equal parts. What number plus the same number makes ${n}?`,
    equation: eq,
    visual: { kind: "groups", thing, groups: 2, each: k, highlight: 1 },
    answer: k,
    input: "choices",
    choices: makeChoices(k, { n: 4, min: 1, max: 20, likely: [n, k + 1, k - 1] }),
    hint: "Share them out one at a time onto two plates.",
    explain: `${k} + ${k} = ${n}.`,
  };
}

/* ================================================= World: add & subtract to 1,000 */

/** 2.OA.B.2 — sums and differences within 20 from memory. */
export function factFluency(): Question {
  const plus = Math.random() < 0.55;
  const a = rand(2, 9);
  const b = rand(2, 9);
  const c = a + b;
  const eq: Token[] = plus ? [a, "+", b, "=", "?"] : [c, "−", a, "=", "?"];
  const ans = plus ? c : b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const hint = !plus
    ? `Think addition: ${a} + ? = ${c}.`
    : a === b
      ? `It's a double: ${a} + ${a}.`
      : big - small === 1
        ? `Near double! Double ${small}, then add 1.`
        : c > 10
          ? `Make 10: ${big} + ${10 - big} = 10. Then add ${small - (10 - big)} more.`
          : `Start at ${big} and count on ${small}.`;
  return {
    key: `fl-${plus ? "p" : "m"}-${a}-${b}`,
    prompt: pick(["Quick! What's the answer?", "Fast fact!", "Do it in your head!"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "none" },
    answer: ans,
    input: "choices",
    choices: makeChoices(ans, { n: 4, min: 0, max: 20, likely: [ans + 1, ans - 1, plus ? ans - 10 : c, ans + 2] }),
    hint,
    explain: filled(eq, ans),
  };
}

/** 2.NBT.B.5 — add two-digit numbers, with and without regrouping. */
export function addTwoDigit(): Question {
  const regroup = Math.random() < 0.7;
  let a: number;
  let b: number;
  do {
    a = rand(11, 79);
    b = rand(11, 89);
  } while (a + b > 100 || regroup !== onesOf(a) + onesOf(b) >= 10);
  const sum = a + b;
  const ts = (tensOf(a) + tensOf(b)) * 10;
  const os = onesOf(a) + onesOf(b);
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `add2-${a}-${b}`,
    prompt: pick(["What's the total?", "Add them up!", `${a} + ${b} = ?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: [a, b] },
    answer: sum,
    input: "keypad",
    hint: `Add the tens: ${tensOf(a) * 10} + ${tensOf(b) * 10}. Add the ones: ${onesOf(a)} + ${onesOf(b)}.${os >= 10 ? " 10 ones make a new ten!" : ""}`,
    explain: `${ts} + ${os} = ${sum}.`,
  };
}

/** 2.NBT.B.5 — subtract two-digit numbers, hopping back on a number line. */
export function subtractTwoDigit(): Question {
  const regroup = Math.random() < 0.7;
  let a = rand(31, 99);
  if (regroup && onesOf(a) === 9) a -= 1;
  const bTens = rand(1, Math.min(3, tensOf(a) - 1));
  const bOnes = regroup ? rand(onesOf(a) + 1, 9) : rand(0, onesOf(a));
  const b = bTens * 10 + bOnes;
  const d = a - b;
  const eq: Token[] = [a, "−", b, "=", "?"];
  const afterTens = a - bTens * 10;
  return {
    key: `sub2-${a}-${b}`,
    prompt: pick(["What's left?", "Take it away!", `${a} − ${b} = ?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "numberline", min: down10(d), max: up10(a), step: 1, labelStep: 10, from: a, to: d },
    answer: d,
    input: "keypad",
    hint: `Jump back the tens first: ${a} − ${bTens * 10} = ${afterTens}. Then take away ${bOnes}.`,
    explain: `${a} − ${bTens * 10} = ${afterTens}, and ${afterTens} − ${bOnes} = ${d}.`,
  };
}

/** 2.MD.B.6 — sums and differences as jumps on a number line. */
export function numberLineJumps(): Question {
  const form = rand(0, 2);
  let from: number;
  let to: number;
  let eq: Token[];
  let prompt: string;
  let hint: string;
  if (form === 0) {
    const plus = Math.random() < 0.5;
    const j = rand(1, 3) * 10;
    from = plus ? rand(5, 100 - j) : rand(j, 95);
    to = plus ? from + j : from - j;
    eq = [from, plus ? "+" : "−", j, "=", "?"];
    prompt = `Start at ${from}. Jump ${plus ? "forward" : "back"} ${j}. Where?`;
    hint = `Jump ${plus ? "forward" : "back"} by tens, ${j / 10} time${j > 10 ? "s" : ""}. The ones digit stays the same.`;
  } else if (form === 1) {
    const plus = Math.random() < 0.5;
    const j = rand(3, 9);
    if (plus) {
      from = rand(1, 8) * 10 + rand(Math.max(1, 11 - j), 9);
      to = from + j;
    } else {
      from = rand(2, 9) * 10 + rand(0, j - 1);
      to = from - j;
    }
    eq = [from, plus ? "+" : "−", j, "=", "?"];
    const stop = plus ? up10(from) : down10(from);
    prompt = `Start at ${from}. Jump ${plus ? "forward" : "back"} ${j}. Where?`;
    hint = `Jump to ${stop} first. That's ${Math.abs(stop - from)}. Then jump the rest.`;
  } else {
    from = rand(10, 60);
    const t = rand(1, 3) * 10;
    const o = rand(1, 9);
    to = from + t + o;
    eq = [from, "+", t, "+", o, "=", "?"];
    prompt = `Start at ${from}. Jump ${t}, then ${o}. Where?`;
    hint = `Jump ${t} first: that lands on ${from + t}. Then jump ${o} more.`;
  }
  let min = down10(Math.min(from, to));
  let max = up10(Math.max(from, to));
  if (max === min) max += 10;
  if (max > 100) {
    max = 100;
    min = Math.min(min, 90);
  }
  return {
    key: `nl-${form}-${eq.join("")}`,
    prompt,
    speech: `${prompt.replace("Where?", "Where do you land?")}`,
    equation: eq,
    visual: { kind: "numberline", min, max, step: 1, labelStep: 10, from, to },
    answer: to,
    input: "choices",
    choices: makeChoices(to, { n: 4, min: 0, max: 100, likely: [to + 10, to - 10, to + 1, to - 1] }),
    hint,
    explain: `${filled(eq, to)}. You land on ${to}.`,
  };
}

/** 2.NBT.B.6 — add up to four two-digit numbers. */
export function addUpToFour(): Question {
  const k = pick([3, 3, 4]);
  const nums = Array.from({ length: k }, () => rand(11, k === 3 ? 49 : 35));
  const sum = nums.reduce((s, n) => s + n, 0);
  const ts = nums.reduce((s, n) => s + tensOf(n) * 10, 0);
  const os = nums.reduce((s, n) => s + onesOf(n), 0);
  const eq: Token[] = [...plusList(nums), "=", "?"];
  return {
    key: `a4-${nums.join("-")}`,
    prompt: pick([`Add all ${k}!`, "What's the total?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: nums },
    answer: sum,
    input: "keypad",
    hint: "Add all the tens. Then add all the ones. Look for ones that make 10!",
    explain: `Tens: ${ts}. Ones: ${os}. ${ts} + ${os} = ${sum}.`,
  };
}

/** 2.NBT.B.7 — add and subtract within 1,000. */
export function addSubThreeDigit(): Question {
  const h = (n: number) => Math.floor(n / 100);
  const t = (n: number) => tensOf(n % 100);
  const o = onesOf;
  if (Math.random() < 0.5) {
    const a = rand(101, 799);
    const b = rand(101, 999 - a);
    const sum = a + b;
    const eq: Token[] = [a, "+", b, "=", "?"];
    return {
      key: `a3d-${a}-${b}`,
      prompt: pick(["What's the total?", `${a} + ${b} = ?`]),
      speech: `${sayEquation(eq)}?`,
      equation: eq,
      visual: { kind: "blocks", numbers: [a, b] },
      answer: sum,
      input: "keypad",
      hint: "Add hundreds, then tens, then ones. 10 ones make a ten; 10 tens make a hundred.",
      explain: `${(h(a) + h(b)) * 100} + ${(t(a) + t(b)) * 10} + ${o(a) + o(b)} = ${sum}.`,
    };
  }
  const zeros = Math.random() < 0.25;
  const a = zeros ? rand(3, 9) * 100 : rand(250, 999);
  const b = rand(101, a - 50);
  const d = a - b;
  const eq: Token[] = [a, "−", b, "=", "?"];
  return {
    key: `s3d-${a}-${b}`,
    prompt: pick(["What's left?", `${a} − ${b} = ?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "none" },
    answer: d,
    input: "keypad",
    hint: zeros
      ? `${a} has no tens or ones. Break a hundred into 10 tens, then a ten into 10 ones.`
      : "Take away hundreds, then tens, then ones. Not enough ones? Break a ten.",
    explain: `${a} − ${b} = ${d}. Check: ${d} + ${b} = ${a}.`,
  };
}

/** 2.NBT.B.9, 2.NBT.B.5 — why strategies work: compensation, place value, checking. */
export function whyItWorks(): Question {
  const form = rand(0, 5);
  if (form === 0) {
    const a = rand(1, 7) * 10 + pick([8, 9]);
    const d = 10 - onesOf(a);
    const r = a + d;
    const b = rand(12, Math.min(89, 99 - a));
    const eq: Token[] = [a, "+", b, "=", r, "+", "?"];
    return {
      key: `why-comp-${a}-${b}`,
      prompt: `${a} + ${b} is the same as ${r} + ?`,
      speech: `${a} plus ${b} is the same as ${r} plus what?`,
      equation: eq,
      visual: { kind: "none" },
      answer: b - d,
      input: "choices",
      choices: makeChoices(b - d, { n: 4, min: 0, max: 100, likely: [b, b + d, b - d + 1] }),
      hint: `Move ${d} from the ${b} over to the ${a} to make ${r}.`,
      explain: `${a} + ${b} = ${r} + ${b - d} = ${a + b}. Moving ${d} across doesn't change the total.`,
    };
  }
  if (form === 1) {
    const r = rand(2, 6) * 10;
    const d = pick([1, 2]);
    const b = r - d;
    const a = rand(r + 5, 99);
    const eq: Token[] = [a, "−", b, "=", a, "−", r, "+", "?"];
    return {
      key: `why-back-${a}-${b}`,
      prompt: `${a} − ${b} = ${a} − ${r} + ?`,
      speech: `${a} minus ${b} is the same as ${a} minus ${r}, plus what?`,
      equation: eq,
      visual: { kind: "none" },
      answer: d,
      input: "choices",
      choices: makeChoices(d, { n: 4, min: 0, max: 10, likely: [d + 1, 10, 0] }),
      hint: `Taking away ${r} takes away too much. How much too much?`,
      explain: `${r} is ${d} more than ${b}, so add ${d} back: ${a} − ${r} + ${d} = ${a - b}.`,
    };
  }
  let a: number;
  let b: number;
  do {
    a = rand(11, 79);
    b = rand(11, 89);
  } while (a + b > 99 || onesOf(a) === 0 || onesOf(b) === 0);
  const A = tensOf(a) * 10;
  const B = tensOf(b) * 10;
  const x = onesOf(a);
  const y = onesOf(b);
  if (form === 2) {
    const eq: Token[] = [a, "+", b, "=", A + B, "+", "?"];
    return {
      key: `why-split-${a}-${b}`,
      prompt: `${a} + ${b} = ${A + B} + ?`,
      speech: `${a} plus ${b} is the same as ${A + B} plus what?`,
      equation: eq,
      visual: { kind: "none" },
      answer: x + y,
      input: "choices",
      choices: makeChoices(x + y, { n: 4, min: 0, max: 30, likely: [x + y + 10, x + y - 1, x] }),
      hint: "Add the tens together. Then add the ones together.",
      explain: `${A} + ${B} = ${A + B}, and ${x} + ${y} = ${x + y}. So ${a} + ${b} = ${A + B} + ${x + y} = ${a + b}.`,
    };
  }
  if (form === 3) {
    const big = a + b;
    const eq: Token[] = [a, "+", b, "=", "?"];
    return {
      key: `why-check-${a}-${b}`,
      prompt: `${big} − ${b} = ${a}. Check: ${a} + ${b} = ?`,
      speech: `${big} minus ${b} is ${a}. Check it by adding: ${a} plus ${b} is what?`,
      equation: eq,
      visual: { kind: "none" },
      answer: big,
      input: "keypad",
      hint: "Adding back what you took away should get you to the start.",
      explain: `${a} + ${b} = ${big}, so ${big} − ${b} = ${a} is right!`,
    };
  }
  if (form === 4) {
    const low = rand(2, 8) * 10 + rand(5, 9);
    const high = up10(low) + rand(1, 8);
    const gap = up10(low) - low;
    const eq: Token[] = [low, "+", "?", "=", high];
    return {
      key: `why-up-${high}-${low}`,
      prompt: `${high} − ${low}? Count up from ${low}!`,
      speech: `${high} minus ${low}. Count up from ${low} to ${high}. How far is it?`,
      equation: eq,
      visual: { kind: "none" },
      answer: high - low,
      input: "choices",
      choices: makeChoices(high - low, { n: 4, min: 0, max: 30, likely: [high - low + 10, high - low - 1, high - low + 1] }),
      hint: `From ${low} to ${up10(low)} is ${gap}. Then from ${up10(low)} to ${high}.`,
      explain: `${gap} + ${high - up10(low)} = ${high - low}. So ${high} − ${low} = ${high - low}.`,
    };
  }
  const correct = `${A} + ${B} + ${x} + ${y}`;
  return {
    key: `why-match-${a}-${b}`,
    prompt: `Which is the same as ${a} + ${b}?`,
    speech: `Which way of adding is the same as ${a} plus ${b}?`,
    visual: { kind: "none" },
    ...labelChoices(correct, [`${A / 10} + ${B / 10} + ${x} + ${y}`, `${A} + ${B} + ${x}`, `${a} + ${B} + ${x} + ${y}`]),
    input: "choices",
    hint: "Break both numbers into tens and ones. Keep every part, and count each part once!",
    explain: `${a} = ${A} + ${x} and ${b} = ${B} + ${y}. So ${a} + ${b} = ${correct}.`,
  };
}

/** 2.OA.A.1 — one- and two-step word problems within 100. */
export function twoStepStories(): Question {
  const form = rand(0, 7);
  const A = nextName();
  const B = nextName();
  let story: string;
  let ans: number;
  let hint: string;
  let explain: string;
  let nums: number[];
  switch (form) {
    case 0: {
      const a = rand(12, 40);
      const b = rand(10, 25);
      const c = rand(5, 20);
      nums = [a, b, c];
      ans = a + b + c;
      story = `${A} had ${a} stickers, got ${b}, then ${c} more. How many now?`;
      hint = "Two steps: add the first two numbers, then add the third.";
      explain = `${a} + ${b} = ${a + b}, then ${a + b} + ${c} = ${ans}.`;
      break;
    }
    case 1: {
      const a = rand(20, 50);
      const b = rand(5, 25);
      const c = rand(5, Math.min(30, a + b - 5));
      nums = [a, b, c];
      ans = a + b - c;
      story = `A bus has ${a} people. ${b} get on, then ${c} get off. How many now?`;
      hint = "Getting on adds. Getting off takes away. Do one step at a time.";
      explain = `${a} + ${b} = ${a + b}, then ${a + b} − ${c} = ${ans}.`;
      break;
    }
    case 2: {
      const a = rand(40, 90);
      const b = rand(10, 25);
      const c = rand(5, Math.min(20, a - b - 5));
      nums = [a, b, c];
      ans = a - b - c;
      story = `There are ${a} cookies. Kids eat ${b}, then ${c} more. How many are left?`;
      hint = "Take away the first group. Then take away the second group.";
      explain = `${a} − ${b} = ${a - b}, then ${a - b} − ${c} = ${ans}.`;
      break;
    }
    case 3: {
      const a = rand(10, 40);
      const b = rand(5, 20);
      nums = [a, b];
      ans = a + a + b;
      story = `${A} read ${a} pages. ${B} read ${b} more than ${A}. How many pages in all?`;
      hint = `First find how many ${B} read. Then add both.`;
      explain = `${B} read ${a} + ${b} = ${a + b}. Together: ${a} + ${a + b} = ${ans}.`;
      break;
    }
    case 4: {
      const a = rand(15, 60);
      const c = rand(a + 5, Math.min(99, a + 40));
      nums = [a, c];
      ans = c - a;
      story = `${A} had ${a} cards. Now ${A} has ${c}. How many did ${A} get?`;
      hint = `${a} + ? = ${c}. Count up from ${a}.`;
      explain = `${a} + ${ans} = ${c}, so ${A} got ${ans} cards.`;
      break;
    }
    case 5: {
      const b = rand(10, 40);
      const c = rand(10, 50);
      nums = [b, c];
      ans = b + c;
      story = `Some birds sat in a tree. ${b} flew away and ${c} stayed. How many at first?`;
      hint = "Put the birds that flew away back with the ones that are left.";
      explain = `${c} + ${b} = ${ans} birds at first.`;
      break;
    }
    case 6: {
      const a = rand(20, 60);
      const b = rand(a + 5, Math.min(99, a + 40));
      nums = [a, b];
      ans = b - a;
      story = `${A} has ${a} marbles. ${B} has ${b}. How many more does ${B} have?`;
      hint = `How far is it from ${a} up to ${b}?`;
      explain = `${b} − ${a} = ${ans}.`;
      break;
    }
    default: {
      const a = rand(30, 70);
      const b = rand(5, 20);
      const c = rand(10, 30);
      nums = [a, b, c];
      ans = a - b + c;
      story = `A class has ${a} crayons. ${b} break. They buy ${c} more. How many now?`;
      hint = "First take away the broken ones. Then add the new ones.";
      explain = `${a} − ${b} = ${a - b}, then ${a - b} + ${c} = ${ans}.`;
    }
  }
  return {
    key: `ws-${form}-${nums.join("-")}`,
    prompt: story,
    speech: story,
    visual: { kind: "none" },
    answer: ans,
    input: "keypad",
    hint,
    explain,
  };
}

/* ===================================================== World: money & time */

const COIN_NAME: Record<number, string> = { 1: "penny", 5: "nickel", 10: "dime", 25: "quarter", 100: "dollar bill", 500: "five-dollar bill" };
const coinSet = (counts: [number, number][]) => counts.flatMap(([v, k]) => Array<number>(k).fill(v));
const runningCount = (coins: number[]) => {
  let s = 0;
  return coins.map((c) => (s += c)).join(", ");
};

/** 2.MD.C.8 — count pennies, nickels and dimes. */
export function coinsSmall(): Question {
  if (Math.random() < 0.15) {
    const v = pick([1, 5, 10]);
    return {
      key: `coin1-${v}`,
      prompt: "How many cents is this coin worth?",
      speech: "How many cents is this coin worth?",
      visual: { kind: "coins", coins: [v] },
      needsVisual: true,
      answer: v,
      input: "choices",
      choices: [1, 5, 10, 25],
      unit: "¢",
      hint: "A penny is copper. A nickel is big and silver. A dime is small and silver.",
      explain: `It's a ${COIN_NAME[v]}. A ${COIN_NAME[v]} is worth ${v}¢.`,
    };
  }
  let d: number, n: number, p: number;
  do {
    d = rand(0, 4);
    n = rand(0, 3);
    p = rand(0, 4);
  } while ([d, n, p].filter((x) => x > 0).length < 2);
  const sorted = coinSet([[10, d], [5, n], [1, p]]);
  const mixed = Math.random() < 0.25;
  const coins = mixed ? shuffle(sorted) : sorted;
  const total = 10 * d + 5 * n + p;
  return {
    key: `coins-${d}-${n}-${p}-${mixed ? coins.join("") : "s"}`,
    prompt: pick(["How much money?", "How many cents in all?", "Count the coins!"]),
    speech: "How many cents are there in all?",
    visual: { kind: "coins", coins },
    needsVisual: true,
    answer: total,
    input: "keypad",
    unit: "¢",
    hint: "Start with the dimes: count by 10s. Then nickels by 5s. Then pennies by 1s.",
    explain: `${runningCount(sorted)}. That's ${total}¢.`,
  };
}

/** 2.MD.C.8 — count coins including quarters. */
export function coinsAll(): Question {
  if (Math.random() < 0.1) {
    return {
      key: "coin1-25",
      prompt: "How many cents is this coin worth?",
      speech: "How many cents is a quarter worth?",
      visual: { kind: "coins", coins: [25] },
      needsVisual: true,
      answer: 25,
      input: "choices",
      choices: [1, 5, 10, 25],
      unit: "¢",
      hint: "This is a quarter. 4 of them make a dollar.",
      explain: "A quarter is worth 25¢.",
    };
  }
  let q: number, d: number, n: number, p: number;
  do {
    q = rand(1, 3);
    d = rand(0, 3);
    n = rand(0, 2);
    p = rand(0, 4);
  } while (25 * q + 10 * d + 5 * n + p > 99 || d + n + p === 0);
  const coins = coinSet([[25, q], [10, d], [5, n], [1, p]]);
  const total = 25 * q + 10 * d + 5 * n + p;
  return {
    key: `coinsq-${q}-${d}-${n}-${p}`,
    prompt: pick(["How much money?", "How many cents in all?", "Count the coins!"]),
    speech: "How many cents are there in all?",
    visual: { kind: "coins", coins },
    needsVisual: true,
    answer: total,
    input: "keypad",
    unit: "¢",
    hint: "Quarters first: 25, 50, 75. Then dimes by 10s, nickels by 5s, pennies by 1s.",
    explain: `${runningCount(coins)}. That's ${total}¢.`,
  };
}

/** 2.MD.C.8 — dollar bills, making a dollar, coin facts. */
export function dollarsBills(): Question {
  const form = rand(0, 3);
  if (form <= 1) {
    let f: number, o: number;
    do {
      f = rand(0, 2);
      o = rand(0, 5);
    } while (f + o < 2);
    const coins = coinSet([[500, f], [100, o]]);
    const total = 5 * f + o;
    return {
      key: `bills-${f}-${o}`,
      prompt: "How many dollars?",
      speech: "How many dollars are there in all?",
      visual: { kind: "coins", coins },
      needsVisual: true,
      answer: total,
      input: "keypad",
      prefix: "$",
      hint: "Count the $5 bills by 5s. Then count on the $1 bills.",
      explain: `${coins.map((c) => c / 100).reduce<number[]>((acc, c) => [...acc, (acc[acc.length - 1] ?? 0) + c], []).join(", ")}. That's $${total}.`,
    };
  }
  if (form === 2) {
    let q: number, d: number, n: number;
    do {
      q = rand(0, 3);
      d = rand(0, 4);
      n = rand(0, 2);
    } while (25 * q + 10 * d + 5 * n < 30 || 25 * q + 10 * d + 5 * n > 95);
    const coins = coinSet([[25, q], [10, d], [5, n]]);
    const x = 25 * q + 10 * d + 5 * n;
    return {
      key: `make1-${q}-${d}-${n}`,
      prompt: "How much more to make $1?",
      speech: "A dollar is 100 cents. How many more cents do you need to make a dollar?",
      visual: { kind: "coins", coins },
      needsVisual: true,
      answer: 100 - x,
      input: "keypad",
      unit: "¢",
      hint: "$1 is 100¢. Count the coins, then count up to 100.",
      explain: `The coins make ${x}¢. ${x} + ${100 - x} = 100.`,
    };
  }
  const facts: { coins: number[]; prompt: string; ans: number; explain: string }[] = [
    { coins: [25, 25, 25, 25], prompt: "4 quarters make how many cents?", ans: 100, explain: "25, 50, 75, 100. 4 quarters make 100¢, one dollar." },
    { coins: Array<number>(10).fill(10), prompt: "10 dimes make how many cents?", ans: 100, explain: "Count by 10s to 100. 10 dimes make 100¢, one dollar." },
    { coins: [25, 25], prompt: "2 quarters make how many cents?", ans: 50, explain: "25 + 25 = 50¢." },
    { coins: [100], prompt: "A dollar is how many cents?", ans: 100, explain: "1 dollar is 100¢." },
    { coins: Array<number>(10).fill(5), prompt: "10 nickels make how many cents?", ans: 50, explain: "Count by 5s: 10 nickels make 50¢." },
  ];
  const f = pick(facts);
  return {
    key: `mfact-${f.prompt}`,
    prompt: f.prompt,
    speech: f.prompt,
    visual: { kind: "coins", coins: f.coins },
    answer: f.ans,
    input: "keypad",
    unit: "¢",
    hint: "Skip count by the value of each coin.",
    explain: f.explain,
  };
}

/** 2.MD.C.8 — money word problems with $ and ¢. */
export function moneyStories(): Question {
  const form = rand(0, 7);
  let story: string;
  let ans: number;
  let money: { unit?: string; prefix?: string } = { unit: "¢" };
  let hint: string;
  let explain: string;
  let nums: number[];
  switch (form) {
    case 0: {
      const d = rand(1, 6);
      const p = rand(1, 9);
      nums = [d, p];
      ans = 10 * d + p;
      story = `You have ${d} dime${d > 1 ? "s" : ""} and ${p} penn${p > 1 ? "ies" : "y"}. How many cents?`;
      hint = "Count the dimes by 10s, then count on the pennies.";
      explain = `${d * 10}¢ + ${p}¢ = ${ans}¢.`;
      break;
    }
    case 1: {
      const q = rand(1, 3);
      const n = rand(1, 4);
      nums = [q, n];
      ans = 25 * q + 5 * n;
      story = `You have ${q} quarter${q > 1 ? "s" : ""} and ${n} nickel${n > 1 ? "s" : ""}. How many cents?`;
      hint = "Count the quarters by 25s, then count on by 5s.";
      explain = `${25 * q}¢ + ${5 * n}¢ = ${ans}¢.`;
      break;
    }
    case 2: {
      const k = rand(1, 3);
      const cost = rand(5, 25 * k - 1);
      nums = [k, cost];
      ans = 25 * k - cost;
      story = `A toy costs ${cost}¢. You pay with ${k} quarter${k > 1 ? "s" : ""}. How much change?`;
      hint = `${k} quarter${k > 1 ? "s" : ""} is ${25 * k}¢. Count up from ${cost}¢.`;
      explain = `${25 * k}¢ − ${cost}¢ = ${ans}¢.`;
      break;
    }
    case 3: {
      const a = rand(5, 20);
      const b = rand(1, a - 1);
      nums = [a, b];
      ans = a - b;
      money = { prefix: "$" };
      story = `You have $${a}. You spend $${b}. How many dollars are left?`;
      hint = "Spending takes money away. Subtract.";
      explain = `$${a} − $${b} = $${ans}.`;
      break;
    }
    case 4: {
      const x = rand(10, 60);
      const y = rand(10, 99 - x);
      nums = [x, y];
      ans = x + y;
      story = `Gum is ${x}¢. A sticker is ${y}¢. How much for both?`;
      hint = "Both means add the two prices.";
      explain = `${x}¢ + ${y}¢ = ${ans}¢.`;
      break;
    }
    case 5: {
      const x = rand(30, 99);
      const y = rand(10, x - 5);
      nums = [x, y];
      ans = x - y;
      story = `You have ${x}¢. A pencil costs ${y}¢. How much is left?`;
      hint = "Buying takes money away. Subtract the price.";
      explain = `${x}¢ − ${y}¢ = ${ans}¢.`;
      break;
    }
    case 6: {
      const f = rand(1, 3);
      const o = rand(1, 6);
      nums = [f, o];
      ans = 5 * f + o;
      money = { prefix: "$" };
      story = `You have ${f} $5 bill${f > 1 ? "s" : ""} and ${o} $1 bill${o > 1 ? "s" : ""}. How many dollars?`;
      hint = "Count the $5 bills by 5s, then count on the $1 bills.";
      explain = `$${5 * f} + $${o} = $${ans}.`;
      break;
    }
    default: {
      const x = 5 * rand(4, 19);
      nums = [x];
      ans = 100 - x;
      story = `You have ${x}¢. How much more do you need to make $1?`;
      hint = `$1 is 100¢. Count up from ${x} to 100.`;
      explain = `${x}¢ + ${ans}¢ = 100¢ = $1.`;
    }
  }
  return {
    key: `ms-${form}-${nums.join("-")}`,
    prompt: story,
    speech: story.replace(/(\d+)¢/g, "$1 cents"),
    visual: { kind: "none" },
    answer: ans,
    input: "keypad",
    ...money,
    hint,
    explain,
  };
}

/** 2.MD.C.7 — tell time to the nearest five minutes. */
export function timeFiveMinutes(): Question {
  const h = rand(1, 12);
  const m = 5 * rand(1, 11);
  const t = clockText(h, m);
  if (Math.random() < 0.35) {
    return {
      key: `t5-min-${h}-${m}`,
      prompt: `How many minutes past ${h}?`,
      speech: `The short hand is past ${h}. How many minutes past ${h} is it?`,
      visual: { kind: "clock", h, m },
      needsVisual: true,
      answer: m,
      input: "choices",
      choices: makeChoices(m, { n: 4, min: 0, max: 60, likely: [m / 5, m + 5, m - 5] }),
      hint: "Count by 5s for each number the long hand passes: 5, 10, 15…",
      explain: `The long hand points to ${m / 5}. ${m / 5} fives is ${m} minutes.`,
    };
  }
  const wrongs = [
    `${h}:${mm(m / 5)}`,
    clockText(m >= 30 ? hourAdd(h, 1) : hourAdd(h, -1), m),
    clockText(h, m === 55 ? 50 : m + 5),
    `${m / 5}:${mm((h * 5) % 60)}`,
  ];
  return {
    key: `t5-read-${h}-${m}`,
    prompt: pick(["What time is it?", "What time does the clock show?"]),
    speech: "What time does the clock show?",
    visual: { kind: "clock", h, m },
    needsVisual: true,
    ...labelChoices(t, wrongs),
    input: "choices",
    hint: "The short hand shows the hour it has passed. Count the long hand by 5s.",
    explain: `The short hand is past ${h}. The long hand is on ${m / 5}: ${m} minutes. It's ${t}.`,
  };
}

const DAY: { e: string; what: string; h: number; m: number; am: boolean }[] = [
  { e: "⏰", what: "Wake up", h: 6, m: 45, am: true },
  { e: "🥣", what: "Eat breakfast", h: 7, m: 30, am: true },
  { e: "🪥", what: "Brush teeth before school", h: 7, m: 15, am: true },
  { e: "🏫", what: "School starts", h: 8, m: 15, am: true },
  { e: "🌅", what: "The sun comes up", h: 6, m: 0, am: true },
  { e: "📚", what: "Morning reading", h: 9, m: 30, am: true },
  { e: "🏊", what: "Saturday swim lesson", h: 10, m: 0, am: true },
  { e: "🐕", what: "Walk the dog before school", h: 7, m: 0, am: true },
  { e: "🍎", what: "Morning snack", h: 10, m: 15, am: true },
  { e: "🎒", what: "School ends", h: 3, m: 0, am: false },
  { e: "⚽", what: "Soccer practice", h: 4, m: 30, am: false },
  { e: "🍝", what: "Eat dinner", h: 6, m: 0, am: false },
  { e: "🛁", what: "Take a bath", h: 7, m: 15, am: false },
  { e: "🛏️", what: "Go to bed", h: 8, m: 0, am: false },
  { e: "🌇", what: "The sun goes down", h: 7, m: 30, am: false },
  { e: "✏️", what: "Homework after school", h: 4, m: 0, am: false },
  { e: "📖", what: "Bedtime story", h: 8, m: 30, am: false },
  { e: "🌙", what: "Look at the moon", h: 9, m: 0, am: false },
  { e: "🍪", what: "After-school snack", h: 3, m: 30, am: false },
];

/** 2.MD.C.7 — a.m. or p.m.? */
export function amOrPm(): Question {
  if (Math.random() < 0.1) {
    const afterNoon = Math.random() < 0.5;
    return {
      key: `ampm-def-${afterNoon}`,
      prompt: afterNoon ? "Times from noon to midnight are…" : "Times from midnight to noon are…",
      speech: afterNoon ? "Times from noon to midnight are a.m. or p.m.?" : "Times from midnight to noon are a.m. or p.m.?",
      visual: { kind: "none" },
      ...fixed(["a.m.", "p.m."], afterNoon ? "p.m." : "a.m."),
      input: "choices",
      hint: "a.m. is the morning half of the day. p.m. is afternoon and night.",
      explain: afterNoon ? "Noon to midnight is p.m." : "Midnight to noon is a.m.",
    };
  }
  const d = pick(DAY);
  const t = clockText(d.h, d.m);
  return {
    key: `ampm-${d.what}`,
    prompt: `${d.e} ${d.what} at ${t}. a.m. or p.m.?`,
    speech: `${d.what} at ${t}. Is that a.m. or p.m.?`,
    visual: { kind: "clock", h: d.h, m: d.m },
    ...fixed(["a.m.", "p.m."], d.am ? "a.m." : "p.m."),
    input: "choices",
    hint: "a.m. is from midnight to noon: morning. p.m. is from noon to midnight: afternoon and night.",
    explain: `${t} in the ${d.am ? "morning" : d.h >= 6 ? "evening" : "afternoon"} is ${d.am ? "a.m." : "p.m."}`,
  };
}

/* ================================================= World: measure & graph */

const UNIT_WORD: Record<"cm" | "in", string> = { cm: "centimeters", in: "inches" };

/** Small things with realistic lengths in inches and centimeters. */
const RULER_THINGS: { e: string; n: string; in: [number, number]; cm: [number, number] }[] = [
  { e: "🖍️", n: "crayon", in: [3, 4], cm: [7, 10] },
  { e: "✏️", n: "pencil", in: [4, 7], cm: [10, 15] },
  { e: "🔑", n: "key", in: [2, 3], cm: [4, 7] },
  { e: "🥄", n: "spoon", in: [5, 7], cm: [12, 15] },
  { e: "🍌", n: "banana", in: [6, 9], cm: [14, 15] },
  { e: "🥕", n: "carrot", in: [5, 8], cm: [11, 15] },
  { e: "🪥", n: "toothbrush", in: [6, 7], cm: [13, 15] },
  { e: "📎", n: "paper clip", in: [1, 2], cm: [2, 5] },
  { e: "🐛", n: "caterpillar", in: [1, 3], cm: [2, 6] },
  { e: "🧦", n: "sock", in: [6, 10], cm: [12, 15] },
  { e: "🍃", n: "leaf", in: [2, 5], cm: [4, 12] },
  { e: "🦎", n: "lizard", in: [3, 8], cm: [6, 15] },
];

const TOOLS: { job: string; tool: string; wrong: string[] }[] = [
  { job: "how long a crayon is", tool: "ruler", wrong: ["scale", "clock", "measuring cup"] },
  { job: "how long a book is", tool: "ruler", wrong: ["scale", "thermometer", "clock"] },
  { job: "around a pumpkin", tool: "measuring tape", wrong: ["ruler", "scale", "clock"] },
  { job: "around your wrist", tool: "measuring tape", wrong: ["ruler", "yardstick", "scale"] },
  { job: "how tall a door is", tool: "meter stick", wrong: ["scale", "clock", "thermometer"] },
  { job: "how long a hallway is", tool: "measuring tape", wrong: ["scale", "clock", "measuring cup"] },
  { job: "how long a rug is", tool: "yardstick", wrong: ["thermometer", "clock", "scale"] },
  { job: "how long a spoon is", tool: "ruler", wrong: ["scale", "measuring cup", "thermometer"] },
];

/** 2.MD.A.1 — read a ruler in inches or centimeters; pick the right tool. */
export function readRuler(): Question {
  if (Math.random() < 0.25) {
    const t = pick(TOOLS);
    return {
      key: `tool-${t.job}`,
      prompt: `Best tool to measure ${t.job}?`,
      speech: `What is the best tool to measure ${t.job}?`,
      visual: { kind: "none" },
      ...labelChoices(t.tool, t.wrong),
      input: "choices",
      hint: "Pick a tool that measures length. Will it need to bend? Is the thing short or long?",
      explain: t.job.startsWith("around") ? "A measuring tape bends, so it can go around things." : `A ${t.tool} measures length, and it's a good size for this.`,
    };
  }
  const thing = pick(RULER_THINGS);
  const unit = pick(["cm", "in"] as const);
  const [lo, hi] = thing[unit];
  const n = rand(lo, hi);
  return {
    key: `rul-${unit}-${n}-${thing.n}`,
    prompt: `How long is the ${thing.e}?`,
    speech: `How many ${UNIT_WORD[unit]} long is the ${thing.n}?`,
    visual: { kind: "ruler", length: n, unit, emoji: thing.e },
    needsVisual: true,
    answer: n,
    input: "choices",
    unit,
    choices: makeChoices(n, { n: 4, min: 1, max: 20, likely: [n + 1, n - 1] }),
    hint: "It starts at 0. Read the number where it ends.",
    explain: `The ${thing.n} ends at ${n}, so it's ${n} ${n === 1 ? (unit === "in" ? "inch" : "centimeter") : UNIT_WORD[unit]} long.`,
  };
}

const ESTIMATES: { e: string; what: string; verb: string; n: number; unit: string; wrong: string[] }[] = [
  { e: "✏️", what: "a new pencil", verb: "long", n: 7, unit: "inches", wrong: ["feet", "meters"] },
  { e: "🚪", what: "a door", verb: "tall", n: 2, unit: "meters", wrong: ["centimeters", "inches"] },
  { e: "🚗", what: "a car", verb: "long", n: 4, unit: "meters", wrong: ["centimeters", "inches"] },
  { e: "📎", what: "a paper clip", verb: "long", n: 3, unit: "centimeters", wrong: ["meters", "feet"] },
  { e: "🧒", what: "a second grader", verb: "tall", n: 4, unit: "feet", wrong: ["inches", "meters"] },
  { e: "📕", what: "a book", verb: "long", n: 10, unit: "inches", wrong: ["feet", "meters"] },
  { e: "🛏️", what: "a bed", verb: "long", n: 6, unit: "feet", wrong: ["inches", "centimeters"] },
  { e: "🚌", what: "a school bus", verb: "long", n: 12, unit: "meters", wrong: ["centimeters", "inches"] },
  { e: "🧽", what: "an eraser", verb: "long", n: 5, unit: "centimeters", wrong: ["meters", "feet"] },
  { e: "👟", what: "a shoe", verb: "long", n: 8, unit: "inches", wrong: ["feet", "meters"] },
  { e: "🍌", what: "a banana", verb: "long", n: 20, unit: "centimeters", wrong: ["meters", "feet"] },
  { e: "🦒", what: "a giraffe", verb: "tall", n: 5, unit: "meters", wrong: ["centimeters", "inches"] },
  { e: "🥄", what: "a spoon", verb: "long", n: 15, unit: "centimeters", wrong: ["meters", "feet"] },
];
const PAIR_UNIT: Record<string, string> = { inches: "feet", feet: "inches", centimeters: "meters", meters: "centimeters" };
const RELATE = [
  { big: "feet", small: "inches" },
  { big: "meters", small: "centimeters" },
  { big: "crayons", small: "paper clips" },
  { big: "pencils", small: "cubes" },
];
const OBJECTS = ["rug", "table", "rope", "desk", "hallway", "ribbon"];

/** 2.MD.A.2, 2.MD.A.3 — estimate lengths; bigger units give smaller numbers. */
export function estimateUnits(forms: number[] = [0, 1, 2]): Question {
  const form = pick(forms);
  if (form === 0) {
    const x = pick(ESTIMATES);
    return {
      key: `est-${x.what}`,
      prompt: `About how ${x.verb} is ${x.what} ${x.e}?`,
      speech: `About how ${x.verb} is ${x.what}?`,
      visual: { kind: "none" },
      ...labelChoices(`${x.n} ${x.unit}`, x.wrong.map((u) => `${x.n} ${u}`)),
      input: "choices",
      hint: "An inch is about a bottle cap. A foot is a ruler. A centimeter is a fingertip. A meter is a big step.",
      explain: `${x.what[0].toUpperCase()}${x.what.slice(1)} is about ${x.n} ${x.unit} ${x.verb}.`,
    };
  }
  if (form === 1) {
    const x = pick(ESTIMATES);
    const other = PAIR_UNIT[x.unit];
    const small = x.unit === "inches" || x.unit === "centimeters";
    return {
      key: `unitpick-${x.what}`,
      prompt: `Best unit to measure ${x.what} ${x.e}?`,
      speech: `What is the best unit to measure ${x.what}?`,
      visual: { kind: "none" },
      ...fixed(small ? [x.unit, other] : [other, x.unit], x.unit),
      input: "choices",
      hint: "Small things: use small units. Big things: use big units.",
      explain: `${x.what[0].toUpperCase()}${x.what.slice(1)} is about ${x.n} ${x.unit} ${x.verb}, so ${x.unit} work well.`,
    };
  }
  const r = pick(RELATE);
  const obj = pick(OBJECTS);
  const toSmall = Math.random() < 0.5;
  const n = toSmall
    ? rand(2, 9)
    : r.small === "inches"
      ? 12 * rand(2, 6)
      : r.small === "centimeters"
        ? 100 * rand(2, 5)
        : rand(10, 30);
  const [from, to] = toSmall ? [r.big, r.small] : [r.small, r.big];
  return {
    key: `relate-${r.big}-${obj}-${toSmall}-${n}`,
    prompt: `A ${obj} is ${n} ${from} long. In ${to}, the number is…`,
    speech: `A ${obj} is ${n} ${from} long. If you measure it in ${to}, will the number be bigger or smaller?`,
    visual: { kind: "none" },
    ...fixed(["bigger", "smaller"], toSmall ? "bigger" : "smaller"),
    input: "choices",
    hint: `Which is longer, one of the ${r.big} or one of the ${r.small}? Longer units fit fewer times.`,
    explain: toSmall
      ? `${cap(r.small)} are shorter than ${r.big}, so more of them fit. The number is bigger.`
      : `${cap(r.big)} are longer than ${r.small}, so fewer of them fit. The number is smaller.`,
  };
}

/** Small things two kids could each have, measured in whole units on a picture. */
const SHORT_KINDS: { e: string; n: string; u: "cm" | "in"; lo: number; hi: number }[] = [
  { e: "🪱", n: "worm", u: "cm", lo: 3, hi: 14 },
  { e: "✏️", n: "pencil", u: "in", lo: 3, hi: 8 },
  { e: "🖍️", n: "crayon", u: "cm", lo: 4, hi: 10 },
  { e: "🐛", n: "caterpillar", u: "cm", lo: 2, hi: 9 },
  { e: "🥕", n: "carrot", u: "in", lo: 3, hi: 9 },
  { e: "🍃", n: "leaf", u: "cm", lo: 3, hi: 12 },
];

/** Things two kids could each have, with realistic lengths. */
const LONG_KINDS: { e: string; n: string; u: "cm" | "in"; lo: number; hi: number }[] = [
  { e: "🐍", n: "toy snake", u: "cm", lo: 20, hi: 90 },
  { e: "🎀", n: "ribbon", u: "cm", lo: 15, hi: 95 },
  { e: "🧣", n: "scarf", u: "in", lo: 30, hi: 70 },
  { e: "🪱", n: "worm", u: "cm", lo: 5, hi: 25 },
  { e: "🚂", n: "toy train", u: "in", lo: 12, hi: 60 },
  { e: "🌻", n: "sunflower", u: "in", lo: 20, hi: 90 },
];

/** 2.MD.A.4, 2.MD.B.5 — how much longer; length word problems. */
export function howMuchLonger(): Question {
  const name = nextName();
  const r = Math.random();
  if (r < 0.35) {
    const k = pick(SHORT_KINDS);
    let B = nextName();
    if (B === name) B = nextName();
    const b = rand(k.lo, k.hi - 2);
    const a = rand(b + 1, k.hi);
    const items = shuffle([
      { name: `${name}'s ${k.e}`, length: a },
      { name: `${B}'s ${k.e}`, length: b },
    ]);
    return {
      key: `hmlp-${k.n}-${a}-${b}`,
      prompt: `Each mark is 1 ${k.u}. How much longer is ${name}'s?`,
      speech: `Each mark on the bars is 1 ${k.u === "in" ? "inch" : "centimeter"}. How much longer is ${name}'s ${k.n} than ${B}'s?`,
      visual: { kind: "lengths", items, units: true },
      needsVisual: true,
      answer: a - b,
      input: "choices",
      unit: k.u,
      choices: makeChoices(a - b, { n: 4, min: 0, max: 15, likely: [a, b, a - b + 1] }),
      hint: "Measure both: count the marks on each bar. Then find the difference.",
      explain: `${name}'s is ${a} ${k.u} and ${B}'s is ${b} ${k.u}. ${a} − ${b} = ${a - b}.`,
    };
  }
  if (r < 0.65) {
    const k = pick(LONG_KINDS);
    const A = name;
    let B = nextName();
    if (B === A) B = nextName();
    const b = rand(k.lo, k.hi - 3);
    const a = rand(b + 2, k.hi);
    const items = shuffle([
      { name: `${A}'s ${k.e}`, length: a },
      { name: `${B}'s ${k.e}`, length: b },
    ]);
    return {
      key: `hml-${k.n}-${a}-${b}`,
      prompt: `${A}'s ${k.e} is ${a} ${k.u}. ${B}'s is ${b} ${k.u}. How much longer?`,
      speech: `${A}'s ${k.n} is ${a} ${UNIT_WORD[k.u]} long. ${B}'s ${k.n} is ${b} ${UNIT_WORD[k.u]}. How much longer is ${A}'s?`,
      equation: [a, "−", b, "=", "?"],
      visual: { kind: "lengths", items },
      answer: a - b,
      input: "keypad",
      unit: k.u,
      hint: "Subtract the shorter length from the longer one, or count up from the shorter.",
      explain: `${a} − ${b} = ${a - b}. ${A}'s ${k.n} is ${a - b} ${k.u} longer.`,
    };
  }
  const form = rand(0, 4);
  let story: string;
  let ans: number;
  let unit: string;
  let explain: string;
  let nums: number[];
  switch (form) {
    case 0: {
      const a = rand(30, 90);
      const b = rand(10, a - 10);
      nums = [a, b];
      ans = a - b;
      unit = "cm";
      story = `A ribbon is ${a} cm long. ${name} cuts off ${b} cm. How long is it now?`;
      explain = `${a} − ${b} = ${ans} cm.`;
      break;
    }
    case 1: {
      const a = rand(20, 45);
      const b = rand(20, 45);
      nums = [a, b];
      ans = a + b;
      unit = "in";
      story = `${name} jumps ${a} inches, then ${b} inches. How far in all?`;
      explain = `${a} + ${b} = ${ans} inches.`;
      break;
    }
    case 2: {
      const g = rand(5, 25);
      const t = rand(g + 10, 90);
      nums = [g, t];
      ans = t - g;
      unit = "cm";
      story = `A plant grew ${g} cm. Now it is ${t} cm tall. How tall was it before?`;
      explain = `${t} − ${g} = ${ans} cm. Check: ${ans} + ${g} = ${t}.`;
      break;
    }
    case 3: {
      const a = rand(15, 50);
      const b = rand(15, 49);
      nums = [a, b];
      ans = a + b;
      unit = "ft";
      story = `Two ropes are ${a} feet and ${b} feet long. Tied end to end, how long?`;
      explain = `${a} + ${b} = ${ans} feet.`;
      break;
    }
    default: {
      const a = rand(20, 60);
      const b = rand(5, 12);
      nums = [a, b];
      ans = a - b;
      unit = "in";
      story = `A snake is ${a} inches. A lizard is ${b} inches. How much shorter is the lizard?`;
      explain = `${a} − ${b} = ${ans} inches.`;
    }
  }
  return {
    key: `lw-${form}-${nums.join("-")}`,
    prompt: story,
    speech: story.replace(/ cm/g, " centimeters"),
    visual: { kind: "none" },
    answer: ans,
    input: "keypad",
    unit,
    hint: "Will the length get longer (add) or shorter (subtract)? Or are you comparing two lengths?",
    explain,
  };
}

/** 2.MD.D.10 — picture graphs and bar graphs with four groups. */
export const graphsFour = () => graphQuestion(4, pick(["bars", "pictograph"] as const));

const PLOTS = [
  { label: "Pencil lengths (inches)", min: 3, max: 8, what: "pencils", u: "in" },
  { label: "Leaf lengths (cm)", min: 4, max: 10, what: "leaves", u: "cm" },
  { label: "Shoe lengths (inches)", min: 5, max: 9, what: "shoes", u: "in" },
  { label: "Worm lengths (cm)", min: 2, max: 8, what: "worms", u: "cm" },
];

/** 2.MD.D.9 — read a line plot of measurements. */
export function linePlot(): Question {
  const p = pick(PLOTS);
  const k = rand(8, 14);
  let values: number[];
  let mode: number;
  let freq: Map<number, number>;
  for (;;) {
    values = Array.from({ length: k }, () => rand(p.min, p.max)).sort((x, y) => x - y);
    freq = new Map<number, number>();
    values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
    const top = Math.max(...freq.values());
    const modes = [...freq.entries()].filter(([, c]) => c === top).map(([v]) => v);
    if (modes.length === 1) {
      mode = modes[0];
      break;
    }
  }
  const count = (v: number) => freq.get(v) ?? 0;
  const qk = rand(0, 4);
  const v = rand(p.min, p.max - 1);
  const base = {
    key: `lp-${p.what}-${values.join(".")}-${qk}-${v}`,
    visual: { kind: "dots", values, min: p.min, max: p.max, label: p.label } as Visual,
    needsVisual: true,
    input: "choices" as const,
  };
  switch (qk) {
    case 0:
      return {
        ...base,
        prompt: `How many ${p.what} are ${v} ${p.u} long?`,
        speech: `Look at the line plot. How many ${p.what} are ${v} long?`,
        answer: count(v),
        choices: makeChoices(count(v), { n: 4, min: 0, max: 14, likely: [count(v) + 1, count(v + 1), v] }),
        hint: `Find ${v} on the line. Count the dots above it.`,
        explain: `There ${count(v) === 1 ? "is" : "are"} ${count(v)} dot${count(v) === 1 ? "" : "s"} above ${v}.`,
      };
    case 1:
      return {
        ...base,
        prompt: `How many ${p.what} were measured?`,
        speech: `How many ${p.what} were measured in all?`,
        answer: k,
        choices: makeChoices(k, { n: 4, min: 1, max: 20, likely: [k + 1, k - 1, p.max - p.min + 1] }),
        hint: "Each dot is one thing that was measured. Count all the dots.",
        explain: `There are ${k} dots, so ${k} ${p.what} were measured.`,
      };
    case 2:
      return {
        ...base,
        prompt: "Which length is most common?",
        speech: "Which length has the most dots?",
        answer: mode,
        unit: p.u,
        choices: makeChoices(mode, { n: 4, min: p.min, max: p.max, likely: [mode + 1, mode - 1] }),
        hint: "Find the tallest stack of dots.",
        explain: `${mode} has the most dots: ${count(mode)}.`,
      };
    case 3: {
      const longer = values.filter((x) => x > v).length;
      return {
        ...base,
        prompt: `How many are longer than ${v} ${p.u}?`,
        speech: `How many ${p.what} are longer than ${v}?`,
        answer: longer,
        choices: makeChoices(longer, { n: 4, min: 0, max: 14, likely: [longer + count(v), longer - 1, longer + 1] }),
        hint: `Count the dots to the right of ${v}. Don't count ${v} itself!`,
        explain: `${longer} dot${longer === 1 ? " is" : "s are"} to the right of ${v}.`,
      };
    }
    default: {
      const lo = values[0];
      const hi = values[values.length - 1];
      return {
        ...base,
        prompt: "How much longer is the longest than the shortest?",
        speech: `How much longer is the longest of the ${p.what} than the shortest?`,
        answer: hi - lo,
        unit: p.u,
        choices: makeChoices(hi - lo, { n: 4, min: 0, max: 15, likely: [hi, hi - lo + 1, hi - lo - 1] }),
        hint: "Find the dot farthest right and the dot farthest left. Subtract.",
        explain: `Longest ${hi}, shortest ${lo}. ${hi} − ${lo} = ${hi - lo}.`,
      };
    }
  }
}

/* ================================================= World: arrays & equal parts */

/** 2.OA.C.4 — total of an array up to 5 by 5. */
export function arrayTotal(): Question {
  const rows = rand(2, 5);
  const cols = rand(2, 5);
  const total = rows * cols;
  return {
    key: `arr-${rows}-${cols}`,
    prompt: pick(["How many dots in all?", `${rows} rows of ${cols}. How many?`]),
    speech: `${rows} rows with ${cols} dots in each row. How many dots in all?`,
    visual: { kind: "array", rows, cols },
    needsVisual: true,
    answer: total,
    input: "choices",
    choices: makeChoices(total, { n: 4, min: 1, max: 30, likely: [rows + cols, total + cols, total - cols, total + 1] }),
    hint: `Count the dots in one row. Then skip count by ${cols}s, one row at a time.`,
    explain: `${Array<number>(rows).fill(cols).join(" + ")} = ${total}.`,
  };
}

/** 2.OA.C.4 — an array as a sum of equal addends. */
export function equalRows(): Question {
  const rows = rand(2, 5);
  const cols = rand(2, 5);
  if (Math.random() < 0.5) {
    const eq: Token[] = [...plusList(Array<number>(rows).fill(cols)), "=", "?"];
    return {
      key: `eqr-${rows}-${cols}`,
      prompt: pick(["Add the equal rows!", `${Array<number>(rows).fill(cols).join(" + ")} = ?`]),
      speech: `${sayEquation(eq)}?`,
      equation: eq,
      visual: { kind: "array", rows, cols },
      answer: rows * cols,
      input: "choices",
      choices: makeChoices(rows * cols, { n: 4, min: 1, max: 30, likely: [rows + cols, rows * cols + cols, rows * cols - cols] }),
      hint: `Skip count by ${cols}s: ${cols}, ${cols * 2}…`,
      explain: `${rows} rows of ${cols}: ${filled(eq, rows * cols)}.`,
    };
  }
  const row = (n: number, times: number) => Array<number>(times).fill(n).join(" + ");
  const correct = row(cols, rows);
  const wrongs = [`${rows} + ${cols}`, row(cols + 1, rows), row(cols, rows + 1)];
  return {
    key: `eqr-match-${rows}-${cols}`,
    prompt: "Which addition matches the dots?",
    speech: "Which addition sentence matches the rows of dots?",
    visual: { kind: "array", rows, cols },
    needsVisual: true,
    ...labelChoices(correct, wrongs),
    input: "choices",
    hint: "Count the dots in one row. Write that number once for every row.",
    explain: `${rows} rows of ${cols} is ${correct} = ${rows * cols}.`,
  };
}

/** 2.G.A.2 — a rectangle split into rows and columns of squares. */
export function rowsAndColumns(): Question {
  const w = rand(2, 6);
  const h = rand(2, 5);
  const form = rand(0, 2);
  const visual: Visual = { kind: "rect", w, h, showW: false, showH: false, grid: true, unit: "" };
  if (form === 0) {
    return {
      key: `rc-total-${w}-${h}`,
      prompt: "How many squares cover the rectangle?",
      speech: "The rectangle is split into same-size squares. How many squares?",
      visual,
      needsVisual: true,
      answer: w * h,
      input: "choices",
      choices: makeChoices(w * h, { n: 4, min: 1, max: 30, likely: [w + h, w * h + w, w * h - 1] }),
      hint: "Count the squares in one row. Then add one row at a time.",
      explain: `${h} rows of ${w}: ${Array<number>(h).fill(w).join(" + ")} = ${w * h}.`,
    };
  }
  const rowsQ = form === 1;
  const ans = rowsQ ? h : w;
  return {
    key: `rc-${rowsQ ? "rows" : "cols"}-${w}-${h}`,
    prompt: `How many ${rowsQ ? "rows" : "columns"}?`,
    speech: `How many ${rowsQ ? "rows" : "columns"} of squares does the rectangle have?`,
    visual,
    needsVisual: true,
    answer: ans,
    input: "choices",
    choices: makeChoices(ans, { n: 4, min: 1, max: 10, likely: [rowsQ ? w : h, ans + 1, w * h] }),
    hint: rowsQ ? "Rows go across, side to side." : "Columns go up and down.",
    explain: `There are ${h} rows and ${w} columns.`,
  };
}

const POLYGONS: { s: ShapeName; n: number; kind: string }[] = [
  { s: "triangle", n: 3, kind: "triangle" },
  { s: "square", n: 4, kind: "quadrilateral" },
  { s: "rectangle", n: 4, kind: "quadrilateral" },
  { s: "rhombus", n: 4, kind: "quadrilateral" },
  { s: "trapezoid", n: 4, kind: "quadrilateral" },
  { s: "parallelogram", n: 4, kind: "quadrilateral" },
  { s: "pentagon", n: 5, kind: "pentagon" },
  { s: "hexagon", n: 6, kind: "hexagon" },
  { s: "octagon", n: 8, kind: "octagon" },
];
const KINDS = ["triangle", "quadrilateral", "pentagon", "hexagon", "octagon"];

/** 2.G.A.1 — shapes by their angles, sides and faces. */
export function shapeAngles(): Question {
  const form = rand(0, 5);
  if (form <= 1) {
    const p = pick(POLYGONS);
    const what = form === 0 ? "angles" : "sides";
    return {
      key: `ang-${what}-${p.s}`,
      prompt: `How many ${what} does this shape have?`,
      speech: `How many ${what} does this shape have?`,
      visual: { kind: "shape", shape: p.s },
      needsVisual: true,
      answer: p.n,
      input: "choices",
      choices: makeChoices(p.n, { n: 4, min: 3, max: 10, likely: [p.n + 1, p.n - 1] }),
      hint: what === "angles" ? "An angle is a corner where two sides meet. Count them all." : "Trace each straight side with your finger.",
      explain: `It has ${p.n} ${what}.`,
    };
  }
  if (form === 2) {
    const p = pick(POLYGONS);
    return {
      key: `ang-name-${p.s}`,
      prompt: "What kind of shape is this?",
      speech: "What kind of shape is this? Count its sides.",
      visual: { kind: "shape", shape: p.s },
      needsVisual: true,
      ...labelChoices(p.kind, shuffle(KINDS.filter((k) => k !== p.kind))),
      input: "choices",
      hint: "3 sides: triangle. 4: quadrilateral. 5: pentagon. 6: hexagon. 8: octagon.",
      explain: `It has ${p.n} sides, so it's ${an(p.kind)}.`,
    };
  }
  if (form === 3) {
    const p = pick(POLYGONS.filter((x) => x.kind !== "quadrilateral" || x.s === "square"));
    return {
      key: `ang-riddle-${p.kind}`,
      prompt: `I have ${p.n} sides and ${p.n} angles. What am I?`,
      speech: `I have ${p.n} sides and ${p.n} angles. What shape am I?`,
      visual: { kind: "none" },
      ...labelChoices(p.kind, shuffle(KINDS.filter((k) => k !== p.kind))),
      input: "choices",
      hint: "Quad means 4. Penta means 5. Hexa means 6. Octa means 8.",
      explain: `${cap(an(p.kind))} has ${p.n} sides and ${p.n} angles.`,
    };
  }
  if (form === 4) {
    const facts: { key: string; prompt: string; shape: ShapeName | null; ans?: number; label?: [string, string[]]; explain: string }[] = [
      { key: "cube-faces", prompt: "How many faces does a cube have?", shape: "cube", ans: 6, explain: "A cube has 6 square faces." },
      { key: "cube-corners", prompt: "How many corners does a cube have?", shape: "cube", ans: 8, explain: "A cube has 8 corners: 4 on top and 4 on the bottom." },
      { key: "box-faces", prompt: "How many faces does this box have?", shape: "prism", ans: 6, explain: "A box has 6 faces: top, bottom, front, back and 2 sides." },
      { key: "six-squares", prompt: "Which shape has 6 square faces?", shape: null, label: ["cube", ["sphere", "cone", "cylinder"]], explain: "A cube has 6 square faces." },
      { key: "no-flat", prompt: "Which shape has no flat faces?", shape: null, label: ["sphere", ["cube", "cone", "cylinder"]], explain: "A sphere is round all over, like a ball." },
    ];
    const f = pick(facts);
    const visual: Visual = f.shape ? { kind: "shape", shape: f.shape } : { kind: "none" };
    const answerPart = f.label
      ? labelChoices(f.label[0], f.label[1])
      : { answer: f.ans!, choices: makeChoices(f.ans!, { n: 4, min: 2, max: 12, likely: [f.ans! - 2, f.ans! + 2, 4] }) };
    return {
      key: `ang-3d-${f.key}`,
      prompt: f.prompt,
      speech: f.prompt,
      visual,
      ...answerPart,
      input: "choices",
      hint: "A face is a flat side of a solid shape. Turn it in your mind and count.",
      explain: f.explain,
    };
  }
  const pool: ShapeName[] = ["triangle", "square", "rectangle", "pentagon", "hexagon", "trapezoid", "rhombus", "circle"];
  let row: ShapeName[];
  do {
    row = Array.from({ length: rand(5, 8) }, () => pick(pool));
  } while (!row.some((s) => POLYGONS.find((p) => p.s === s)?.kind === "quadrilateral"));
  const count = row.filter((s) => POLYGONS.find((p) => p.s === s)?.kind === "quadrilateral").length;
  return {
    key: `ang-quad-${row.join(",")}`,
    prompt: "How many quadrilaterals?",
    speech: "A quadrilateral has 4 sides. How many quadrilaterals can you find?",
    visual: { kind: "shapes", shapes: row },
    needsVisual: true,
    answer: count,
    input: "choices",
    choices: makeChoices(count, { n: 4, min: 0, max: 8, likely: [count + 1, count - 1] }),
    hint: "Count the sides of each shape. 4 sides means quadrilateral.",
    explain: `${count} of the shapes have 4 sides.`,
  };
}

/** 2.G.A.3 — halves, thirds and fourths; equal shares can look different. */
export function equalShares(): Question {
  const form = rand(0, 5);
  const shape = pick(["bar", "pie"] as const);
  const thing = shape === "pie" ? "pizza" : "cake";
  const parts = pick([2, 3, 4]);
  const [one, many] = SHARE_NAME[parts];
  if (form === 5) return equalOrNot(parts, shape, "es");
  if (form === 0) {
    return {
      key: `es-name-${shape}-${parts}`,
      prompt: "What do we call the coloured part?",
      speech: `The ${thing} is cut into ${parts} equal parts. What do we call one part?`,
      visual: { kind: "fractions", bars: [{ parts, a: 1, shape }] },
      needsVisual: true,
      ...fixed(["a half", "a third", "a fourth"], one),
      input: "choices",
      hint: "Count the equal parts. 2 parts: halves. 3 parts: thirds. 4 parts: fourths.",
      explain: `${parts} equal parts, so one part is ${one}.`,
    };
  }
  if (form === 1) {
    return {
      key: `es-whole-${shape}-${parts}`,
      prompt: `How many ${many} make a whole?`,
      speech: `How many ${many} make one whole ${thing}?`,
      visual: { kind: "fractions", bars: [{ parts, a: parts, shape }] },
      answer: parts,
      input: "choices",
      choices: [2, 3, 4, 5],
      hint: `Count the ${many}.`,
      explain: `${parts} ${many} make one whole.`,
    };
  }
  if (form === 2) {
    return {
      key: `es-share-${shape}-${parts}`,
      prompt: `${parts} friends share a ${thing} fairly. Each gets…`,
      speech: `${parts} friends share a ${thing} fairly. How much does each friend get?`,
      visual: { kind: "fractions", bars: [{ parts, a: 1, shape }] },
      ...fixed(["a half", "a third", "a fourth"], one),
      input: "choices",
      hint: "How many equal parts do you need, one for each friend?",
      explain: `${parts} equal parts, so each friend gets ${one}.`,
    };
  }
  if (form === 3) {
    const [p, q] = shuffle([2, 3, 4]).slice(0, 2);
    const bigger = Math.random() < 0.5;
    const ans = bigger === p < q ? p : q;
    const bars: FracBar[] = [
      { parts: p, a: 1, shape, label: SHARE_NAME[p][0] },
      { parts: q, a: 1, shape, label: SHARE_NAME[q][0] },
    ];
    return {
      key: `es-size-${shape}-${p}-${q}-${bigger}`,
      prompt: `Which share is ${bigger ? "bigger" : "smaller"}?`,
      speech: `Two ${thing}s, the same size. Which share is ${bigger ? "bigger" : "smaller"}: ${SHARE_NAME[p][0]} or ${SHARE_NAME[q][0]}?`,
      visual: { kind: "fractions", bars },
      needsVisual: true,
      ...fixed([SHARE_NAME[p][0], SHARE_NAME[q][0]], SHARE_NAME[ans][0]),
      input: "choices",
      hint: "More equal parts means each part is smaller.",
      explain: `${cap(SHARE_NAME[Math.min(p, q)][0])} is bigger than ${SHARE_NAME[Math.max(p, q)][0]}. More parts means smaller parts.`,
    };
  }
  const cuts = [
    ["2 triangles", "2 rectangles", "halves"],
    ["4 small squares", "4 strips", "fourths"],
    ["3 tall strips", "3 wide strips", "thirds"],
  ];
  const [x, y, name] = pick(cuts);
  return {
    key: `es-same-${name}`,
    prompt: `Two same squares: ${x} or ${y}. Same size ${name}?`,
    speech: `Two squares the same size. One is cut into ${x}, the other into ${y}. Are the ${name} the same size?`,
    visual: { kind: "none" },
    ...fixed(["Yes", "No"], "Yes"),
    input: "choices",
    hint: "Equal shares of the same whole are the same size, even if they look different.",
    explain: `Both squares are cut into ${name}, so each share is the same size, just a different shape.`,
  };
}

/* =========================================================================
 * Expansion: more lessons per world, and hands-on "Do it" activities.
 * ========================================================================= */

/** Spread into a question to make it a hands-on activity. */
const act = (activity: Activity, answer: number) => ({ input: "activity" as const, activity, answer });
const NONE: Visual = { kind: "none" };

const COIN_ONE: Record<number, string> = { 1: "penny", 5: "nickel", 10: "dime", 25: "quarter", 100: "$1 bill", 500: "$5 bill" };
const COIN_MANY: Record<number, string> = { 1: "pennies", 5: "nickels", 10: "dimes", 25: "quarters", 100: "$1 bills", 500: "$5 bills" };

/** The fewest coins (greedy works for US coins): [value, count] pairs. */
function fewestSet(cents: number, coins: number[]): [number, number][] {
  const out: [number, number][] = [];
  let r = cents;
  for (const v of [...coins].sort((x, y) => y - x)) {
    const k = Math.floor(r / v);
    if (k) out.push([v, k]);
    r -= k * v;
  }
  return out;
}
const sayCoins = (set: [number, number][]) => set.map(([v, k]) => `${k} ${k === 1 ? COIN_ONE[v] : COIN_MANY[v]}`).join(", ");

/* ----------------------------------------------------- World: facts to 20 */

/** 1.OA.C.6 — show facts on ten-frames (Do it). */
export function showOnFrames(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const a = rand(6, 9);
    const b = rand(11 - a, 9);
    const fill = 10 - a;
    return {
      key: `sof-add-${a}-${b}`,
      prompt: `Show ${a} + ${b}. Fill a ten first!`,
      speech: `Show ${a} plus ${b} on the ten-frames. Fill up the first ten-frame first.`,
      visual: NONE,
      ...act({ kind: "fillFrame", target: a + b, frames: 2 }, a + b),
      hint: `Put in ${a} dots, then ${fill} more to fill the ten. The rest go in the next frame.`,
      explain: `${a} + ${fill} fills the ten, and ${b - fill} more makes ${a + b}.`,
    };
  }
  if (form === 1) {
    const t = rand(11, 20);
    return {
      key: `sof-teen-${t}`,
      prompt: `Show ${t} on the ten-frames.`,
      speech: `Fill in dots to show ${t}.`,
      visual: NONE,
      ...act({ kind: "fillFrame", target: t, frames: 2 }, t),
      hint: "Fill one whole ten-frame. Then add the extra ones.",
      explain: `${t} is a full ten and ${t - 10} more.`,
    };
  }
  const total = rand(11, 18);
  const gone = rand(total - 9, 9);
  const left = total - gone;
  const extra = total - 10;
  return {
    key: `sof-sub-${total}-${gone}`,
    prompt: `Show what's left: ${total} − ${gone}.`,
    speech: `${total} take away ${gone}. Fill in dots to show how many are left.`,
    visual: NONE,
    ...act({ kind: "fillFrame", target: left, frames: 2 }, left),
    hint: `Take away ${extra} to get to 10, then take away ${gone - extra} more. Or think: ${gone} + ? = ${total}.`,
    explain: `${total} − ${gone} = ${left}.`,
  };
}

/** 1.OA.C.6 — add or take away 9 (and 8) by using 10. */
export function addNine(): Question {
  const form = rand(0, 3);
  const n = rand(2, 9);
  if (form === 3) {
    const t = rand(11, 18);
    const eq: Token[] = [t, "−", 9, "=", "?"];
    return {
      key: `a9-sub-${t}`,
      prompt: pick([`${t} − 9 = ?`, `Take 9 from ${t}. Use 10!`]),
      speech: `${t} minus 9. Take away 10, then add 1 back.`,
      equation: eq,
      visual: { kind: "tenframe", cells: frame(["a", t - 9], ["gone", 9]) },
      answer: t - 9,
      input: "choices",
      choices: makeChoices(t - 9, { n: 4, min: 0, max: 20, likely: [t - 10, t - 8, t - 9 + 10] }),
      hint: `Take away 10: ${t} − 10 = ${t - 10}. You took 1 too many, so add 1 back.`,
      explain: `${t} − 10 = ${t - 10}, and ${t - 10} + 1 = ${t - 9}.`,
    };
  }
  const k = form === 2 ? 8 : 9;
  const off = 10 - k;
  const sum = k + n;
  const flip = Math.random() < 0.4;
  const eq: Token[] = flip ? [n, "+", k, "=", "?"] : [k, "+", n, "=", "?"];
  return {
    key: `a9-${form}-${n}-${flip}`,
    prompt: form === 1 ? `10 + ${n} = ${10 + n}. So ${k} + ${n} = ?` : `${eq.join(" ")} Add 10, take ${off} away.`,
    speech: `${sayEquation(eq)}? ${k} is ${off} less than 10.`,
    equation: eq,
    visual: { kind: "tenframe", cells: frame(["a", k], ["b", n]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 0, max: 20, likely: [n + 10, sum - 1, sum + 1] }),
    hint: `Add 10 instead: ${n} + 10 = ${n + 10}. Then take ${off} away.`,
    explain: `${n} + 10 = ${n + 10}, and ${n + 10} − ${off} = ${sum}.`,
  };
}

function randomFact(): { a: number; op: string; b: number; text: string; wrong: string } {
  if (Math.random() < 0.55) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return { a, op: "+", b, text: `${a} + ${b} = ${a + b}`, wrong: `${a} + ${b} = ${a + b + pick([1, -1])}` };
  }
  const c = rand(6, 18);
  const b = rand(2, Math.min(9, c - 1));
  const d = c - b;
  return { a: c, op: "−", b, text: `${c} − ${b} = ${d}`, wrong: `${c} − ${b} = ${d === 0 ? 1 : d + pick([1, -1])}` };
}

/** 1.OA.C.6, 1.OA.D.7 — spot the wrong fact. */
export function spotFactMistake(): Question {
  let facts: ReturnType<typeof randomFact>[];
  let bad: number;
  let labels: string[];
  do {
    facts = [randomFact(), randomFact(), randomFact()];
    bad = rand(0, 2);
    labels = facts.map((f, i) => (i === bad ? f.wrong : f.text));
  } while (new Set(facts.map((f) => `${f.a}${f.op}${f.b}`)).size < 3 || new Set(labels).size < 3);
  return {
    key: `spot-${labels.join("|")}`,
    prompt: "One fact is wrong. Which one?",
    speech: "Two of these facts are right and one is wrong. Which one is wrong?",
    visual: NONE,
    ...fixed(labels, labels[bad]),
    input: "choices",
    hint: "Check each fact. Use doubles, make a ten, or think addition.",
    explain: `${labels[bad]} is wrong. It should be ${facts[bad].text}.`,
  };
}

/* --------------------------------------------- World: stories & equal sign */

/** 1.OA.D.8, 1.OA.D.7 — make both sides balance: 6 + 3 = 4 + ?. */
export function balanceSides(): Question {
  // Up to 16 so a third, different addend always exists (17 and 18 only split as 8 + 9 or 9 + 9).
  const s = rand(6, 16);
  const a = rand(Math.max(1, s - 9), Math.min(9, s - 1));
  const b = s - a;
  let c = rand(Math.max(1, s - 9), Math.min(9, s - 1));
  while (c === a || c === b) c = rand(Math.max(1, s - 9), Math.min(9, s - 1));
  const d = s - c;
  const form = rand(0, 2);
  const eq: Token[] = form === 0 ? [a, "+", b, "=", c, "+", "?"] : form === 1 ? [c, "+", "?", "=", a, "+", b] : ["?", "+", d, "=", a, "+", b];
  const ans = form === 2 ? c : d;
  const known = form === 2 ? d : c;
  return {
    key: `bal-${form}-${a}-${b}-${c}`,
    prompt: pick(["Make both sides equal!", "What makes it balance?"]),
    speech: `${sayEquation(eq)}? Both sides must be worth the same.`,
    equation: eq,
    visual: NONE,
    answer: ans,
    input: "choices",
    choices: makeChoices(ans, { n: 4, min: 0, max: 30, likely: [s, ans + 1, ans - 1, s + known] }),
    hint: `Work out the full side first: ${a} + ${b} = ${s}. What goes with ${known} to make ${s}?`,
    explain: `${a} + ${b} = ${s}, and ${known} + ${ans} = ${s}. Both sides are ${s}.`,
  };
}

/** 1.OA.A.1 — pick the number sentence that matches a story. */
export function whichEquation(): Question {
  const thing = nextThing();
  const [A, B] = names(2);
  const form = rand(0, 3);
  let story: string;
  let speech: string;
  let correct: string;
  let wrongs: string[];
  let hint: string;
  let key: string;
  if (form === 0) {
    const a = rand(2, 9);
    let b = rand(2, 9);
    while (b === a) b = rand(2, 9);
    story = `${A} has ${a} ${thing.emoji}, then gets ${b} more.`;
    speech = `${A} has ${a} ${word(a, thing)}, then gets ${b} more. How many now? Which number sentence matches?`;
    correct = `${a} + ${b} = ?`;
    wrongs = [`${Math.max(a, b)} − ${Math.min(a, b)} = ?`, `${a} + ? = ${b}`, `${a} − ? = ${b}`];
    hint = "Getting more means the group grows. Which sentence puts them together?";
    key = `we-0-${a}-${b}`;
  } else if (form === 1) {
    const total = rand(8, 18);
    const gone = rand(2, total - 2);
    story = `${total} ${thing.emoji}. ${gone} go away. How many left?`;
    speech = `There are ${total} ${thing.many}. ${gone} go away. How many are left? Which number sentence matches?`;
    correct = `${total} − ${gone} = ?`;
    wrongs = [`${total} + ${gone} = ?`, `? − ${gone} = ${total}`, `${gone} − ? = ${total}`];
    hint = "Going away means the group gets smaller. Start with the whole group.";
    key = `we-1-${total}-${gone}`;
  } else if (form === 2) {
    const a = rand(2, 10);
    const c = rand(a + 2, Math.min(20, a + 9));
    story = `${A} has ${a} ${thing.emoji}, gets some, now has ${c}.`;
    speech = `${A} has ${a} ${word(a, thing)} and gets some more. Now ${A} has ${c}. Which number sentence matches?`;
    correct = `${a} + ? = ${c}`;
    wrongs = [`${a} + ${c} = ?`, `? − ${a} = ${c}`, `${a} − ? = ${c}`];
    hint = `We start with ${a} and end with ${c}. The box is the part that was added.`;
    key = `we-2-${a}-${c}`;
  } else {
    const big = rand(5, 18);
    const small = rand(2, big - 2);
    story = `${A} has ${big} ${thing.emoji}. ${B} has ${small}. How many more for ${A}?`;
    speech = `${A} has ${big} ${word(big, thing)}. ${B} has ${small}. How many more does ${A} have? Which number sentence matches?`;
    correct = `${big} − ${small} = ?`;
    wrongs = [`${big} + ${small} = ?`, `? − ${small} = ${big}`, `${small} − ? = ${big}`];
    hint = "To compare, find the difference between the two numbers.";
    key = `we-3-${big}-${small}`;
  }
  return {
    key,
    prompt: `${story} Which matches?`,
    speech,
    visual: NONE,
    ...labelChoices(correct, wrongs),
    input: "choices",
    hint,
    explain: `${correct} matches the story.`,
  };
}

const ADD_WORDS = ["3 more come", "Friends join in", "You get 2 more", "Put them together", "4 birds land", "Mom gives you 5", "How many in all?", "Some more hop on"];
const TAKE_WORDS = ["2 fly away", "You eat 3", "4 balloons pop", "Give 2 away", "How many are left?", "Some roll away", "3 go home", "Take 5 out"];

/** 1.OA.A.1 — sort story clues into add or take away (Do it). */
export function sortAddTake(): Question {
  const nAdd = rand(2, 4);
  const nTake = rand(2, 4);
  const adds = shuffle(ADD_WORDS).slice(0, nAdd);
  const takes = shuffle(TAKE_WORDS).slice(0, nTake);
  const items = shuffle([...adds.map((label) => ({ label, bin: 0 })), ...takes.map((label) => ({ label, bin: 1 }))]);
  return {
    key: `sat-${[...adds].sort().join(",")}|${[...takes].sort().join(",")}`,
    prompt: "Add or take away? Sort the story clues.",
    speech: "Does each story clue mean add or take away? Sort them.",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Add +", "Take away −"], items }, nAdd),
    hint: "Does the group get bigger or smaller? Bigger means add. Smaller means take away.",
    explain: `Add: ${adds.join("; ")}. Take away: ${takes.join("; ")}.`,
  };
}

/* ------------------------------------------------------- World: tens & ones */

/** 1.NBT.B.2a–c, 1.NBT.C.5 — build two-digit numbers with tens and ones (Do it). */
export function buildTwoDigit(): Question {
  const form = rand(0, 3);
  let n: number;
  let prompt: string;
  let key: string;
  let hint = "Use a ten stick for every 10. Then add ones cubes.";
  if (form === 0) {
    n = rand(11, 99);
    prompt = `Build ${n} with tens and ones.`;
    key = `bb2-${n}`;
  } else if (form === 1) {
    const t = rand(1, 9);
    const o = rand(0, 9);
    n = t * 10 + o;
    prompt = `Build ${t} ${tensW(t)} and ${o} ${ones(o)}.`;
    key = `bb2-to-${n}`;
  } else if (form === 2) {
    n = rand(11, 19);
    prompt = `Build ${n}: a ten and some ones.`;
    key = `bb2-teen-${n}`;
    hint = "A teen number is 1 ten stick and some ones cubes.";
  } else {
    const base = rand(11, 89);
    n = base + 10;
    prompt = `Build 10 more than ${base}.`;
    key = `bb2-more-${base}`;
    hint = `Build ${base}, then add one more ten stick.`;
  }
  return {
    key,
    prompt,
    speech: prompt,
    visual: NONE,
    ...act({ kind: "buildBlocks", target: n, fewest: true }, n),
    hint,
    explain: `${n} is ${tensOf(n)} ${tensW(tensOf(n))} and ${onesOf(n)} ${ones(onesOf(n))}.`,
  };
}

/** Put 4 numbers in order (Do it). Two of them share their first digit. */
function orderNumbers(digits: 2 | 3): Question {
  const lo = digits === 2 ? 10 : 100;
  const hi = digits === 2 ? 99 : 999;
  let nums: number[];
  do {
    const a = rand(lo, hi);
    const b = digits === 2 ? tensOf(a) * 10 + rand(0, 9) : Math.floor(a / 100) * 100 + rand(0, 99);
    nums = [...new Set([a, b, rand(lo, hi), rand(lo, hi)])];
  } while (nums.length < 4);
  const up = Math.random() < 0.5;
  const sorted = [...nums].sort((x, y) => (up ? x - y : y - x));
  const direction = up ? "least to greatest" : "greatest to least";
  return {
    key: `ord${digits}-${sorted.join("-")}`,
    prompt: `Tap the numbers from ${direction}.`,
    speech: `Tap the numbers in order, from ${direction}.`,
    visual: NONE,
    ...act({ kind: "order", items: sorted.map(String), direction }, sorted[0]),
    hint: digits === 2 ? "Compare the tens first. Same tens? Compare the ones." : "Compare the hundreds, then the tens, then the ones.",
    explain: sorted.join(up ? " < " : " > "),
  };
}

/** 1.NBT.B.3 — order two-digit numbers. */
export const orderTwoDigit = () => orderNumbers(2);

/** 1.NBT.A.1 — read and write numbers to 120. */
export function readWrite120(): Question {
  const form = rand(0, 2);
  if (form === 0) {
    const n = Math.random() < 0.5 ? rand(100, 120) : rand(21, 99);
    return {
      key: `rw-w-${n}`,
      prompt: `Type the number: ${numberWords(n)}`,
      speech: `Type the number ${numberWords(n)}.`,
      visual: NONE,
      answer: n,
      input: "keypad",
      hint: n >= 100 && n < 110 ? "One hundred is 100. No tens? Put a 0 in the tens place." : n >= 100 ? "Start with 1 for one hundred, then the tens and ones." : "Write the tens digit, then the ones digit.",
      explain: `${numberWords(n)} is ${n}.`,
    };
  }
  if (form === 1) {
    const n = rand(12, 119);
    return {
      key: `rw-b-${n}`,
      prompt: `What number is between ${n - 1} and ${n + 1}?`,
      speech: `What number comes between ${n - 1} and ${n + 1}?`,
      visual: NONE,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 4, min: 1, max: 1200, likely: [n + 2, n - 2, n + 10, n > 100 && n < 110 ? 1000 + n - 100 : n - 10] }),
      hint: `Count: ${n - 1}, then…`,
      explain: `${n - 1}, ${n}, ${n + 1}.`,
    };
  }
  const n = rand(101, 120);
  const r = n - 100;
  const wrongs = [r < 10 ? 100 + r * 10 : 100 + (r % 10), r < 10 ? r + 10 : r, n + 10 <= 120 ? n + 10 : n - 10]
    .filter((x) => x !== n)
    .map(numberWords);
  return {
    key: `rw-name-${n}`,
    prompt: `How do you say ${n}?`,
    speech: "How do you say this number?",
    visual: { kind: "places", digits: String(n), highlight: 0 },
    ...labelChoices(numberWords(n), wrongs),
    input: "choices",
    hint: "Say one hundred first. Then say the rest of the number.",
    explain: `${n} is ${numberWords(n)}.`,
  };
}

/* ------------------------------------------- World: time, length & shapes */

/** 1.MD.B.3 — set a clock to the hour or half hour (Do it). */
export function setClockHalf(): Question {
  const h = rand(1, 12);
  const half = Math.random() < 0.5;
  const m = half ? 30 : 0;
  const words = half ? `half past ${h}` : `${h} o'clock`;
  const useWords = Math.random() < 0.5;
  return {
    key: `scl-${h}-${m}-${useWords}`,
    prompt: `Show ${useWords ? words : clockText(h, m)} on the clock.`,
    speech: `Set the clock to ${words}.`,
    visual: NONE,
    ...act({ kind: "setClock", h, m, snap: 30 }, m),
    hint: half ? `Long hand on the 6. The short hand goes halfway between ${h} and ${hourAdd(h, 1)}.` : `Long hand on the 12. Short hand on the ${h}.`,
    explain: half
      ? `At ${clockText(h, m)} the long hand points to 6 and the short hand is halfway between ${h} and ${hourAdd(h, 1)}.`
      : `At ${clockText(h, m)} the long hand points to 12 and the short hand points to ${h}.`,
  };
}

/** 1.MD.A.1 — tap things in order of length (Do it). */
export function orderByLength(): Question {
  const kind = pick(SAME_KIND);
  const k = pick([3, 4]);
  const kids = names(k);
  const lens = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, k);
  const up = Math.random() < 0.5;
  const direction = up ? "shortest to longest" : "longest to shortest";
  const sorted = kids.map((who, i) => ({ who, len: lens[i] })).sort((x, y) => (up ? x.len - y.len : y.len - x.len));
  return {
    key: `obl-${kind.n}-${kids.map((w, i) => w + lens[i]).join("-")}-${up}`,
    prompt: `Tap the ${kind.e} from ${direction}.`,
    speech: `Tap the ${kind.n}s in order, from ${direction}.`,
    visual: { kind: "lengths", items: kids.map((who, i) => ({ name: `${who}'s ${kind.e}`, length: lens[i] })) },
    needsVisual: true,
    ...act({ kind: "order", items: sorted.map((x) => `${x.who}'s ${kind.e}`), direction }, sorted[0].len),
    hint: "They all start at the same line. Look at where each one ends.",
    explain: `From ${direction}: ${sorted.map((x) => `${x.who}'s`).join(", ")}.`,
  };
}

const SORT_GROUPS = [
  { bin: "🍎 Fruit", items: ["🍎", "🍌", "🍇", "🍐", "🍊", "🍓", "🍉"] },
  { bin: "🐶 Animals", items: ["🐶", "🐱", "🐟", "🐦", "🐢", "🐰", "🐸"] },
  { bin: "🚗 Things that go", items: ["🚗", "🚌", "🚲", "✈️", "🚂", "🚀", "⛵"] },
  { bin: "⚽ Toys", items: ["⚽", "🧸", "🪁", "🎈", "🪀", "🧩", "🎲"] },
];

/** 1.MD.C.4 — sort things into groups, or make a bar graph of a picture graph (Do it). */
export function sortAndGraph(): Question {
  if (Math.random() < 0.5) {
    const groups = shuffle(SORT_GROUPS).slice(0, pick([2, 3]));
    const per = groups.map(() => rand(2, groups.length === 2 ? 4 : 3));
    const chosen = groups.map((g, i) => shuffle(g.items).slice(0, per[i]));
    const items = shuffle(chosen.flatMap((list, bin) => list.map((label) => ({ label, bin }))));
    return {
      key: `sg-sort-${chosen.map((l) => [...l].sort().join("")).join("|")}`,
      prompt: "Sort the pictures into groups.",
      speech: "Put each picture in the group where it belongs.",
      visual: NONE,
      ...act({ kind: "sort", bins: groups.map((g) => g.bin), items }, per[0]),
      hint: "Look at each picture. Which group is it like?",
      explain: groups.map((g, i) => `${g.bin}: ${per[i]}`).join(". ") + ".",
    };
  }
  const theme = pick(GRAPH_THEMES);
  const cats = shuffle(theme.items).slice(0, 3);
  const counts = cats.map(() => rand(1, 8));
  return {
    key: `sg-graph-${theme.title}-${cats.map((c, i) => c[0] + counts[i]).join(".")}`,
    prompt: "Make a bar graph of the picture graph.",
    speech: "Count each row of the picture graph. Then drag each bar to match.",
    visual: { kind: "pictograph", title: theme.title, items: cats.map((c, i) => ({ label: c[0], emoji: c[1], count: counts[i] })), key: 1 },
    needsVisual: true,
    ...act(
      { kind: "barGraph", title: theme.title, items: cats.map((c, i) => ({ label: `${c[1]} ${c[0]}`, value: counts[i] })), max: 10, step: 1, hideData: true },
      counts.reduce((x, y) => x + y, 0),
    ),
    hint: "Count the pictures in a row. Drag that bar up to the same number.",
    explain: cats.map((c, i) => `${c[0]}: ${counts[i]}`).join(", ") + ".",
  };
}

type DrawSpec = { name: string; sides: number; rightAngles?: number; equalSides?: boolean; hint: string };

const DRAW_G1: DrawSpec[] = [
  { name: "triangle", sides: 3, hint: "A triangle has 3 straight sides and 3 corners." },
  { name: "square", sides: 4, rightAngles: 4, equalSides: true, hint: "A square has 4 equal sides and 4 square corners." },
  { name: "rectangle", sides: 4, rightAngles: 4, hint: "A rectangle has 4 sides and 4 square corners." },
  { name: "shape with 4 sides", sides: 4, hint: "Tap 4 corners, then tap the first one again to close it." },
  { name: "pentagon", sides: 5, hint: "A pentagon has 5 straight sides." },
  { name: "hexagon", sides: 6, hint: "A hexagon has 6 straight sides." },
  { name: "triangle with a square corner", sides: 3, rightAngles: 1, hint: "Make one corner like the corner of a page: one side across, one side straight up." },
];

const DRAW_G2: DrawSpec[] = [
  { name: "triangle", sides: 3, hint: "A triangle has 3 sides and 3 angles." },
  { name: "quadrilateral", sides: 4, hint: "A quadrilateral has 4 sides and 4 angles." },
  { name: "pentagon", sides: 5, hint: "A pentagon has 5 sides and 5 angles." },
  { name: "hexagon", sides: 6, hint: "A hexagon has 6 sides and 6 angles." },
  { name: "shape with 5 angles", sides: 5, hint: "5 angles means 5 corners, and 5 sides too." },
  { name: "shape with 6 angles", sides: 6, hint: "6 angles means 6 corners, and 6 sides too." },
  { name: "quadrilateral with 4 right angles", sides: 4, rightAngles: 4, hint: "A right angle is a square corner. Make all 4 corners square." },
  { name: "quadrilateral with 4 equal sides", sides: 4, equalSides: true, hint: "Every side must be the same length. A square works!" },
  { name: "octagon", sides: 8, hint: "An octagon has 8 sides, like a stop sign." },
];

function drawShapeQ(list: DrawSpec[], tag: string): Question {
  const d = pick(list);
  const size = pick([6, 8]);
  return {
    key: `${tag}-${d.name}-${size}`,
    prompt: `Draw ${an(d.name)}.`,
    speech: `Tap the dots to draw ${an(d.name)}. Tap the first corner again to close it.`,
    visual: NONE,
    ...act({ kind: "drawShape", size, sides: d.sides, rightAngles: d.rightAngles, equalSides: d.equalSides }, d.sides),
    hint: d.hint,
    explain: `${d.name.startsWith("shape with") ? `Any closed shape with ${d.sides} straight sides works` : `${cap(an(d.name))} has ${d.sides} sides`}${d.rightAngles ? ` and ${d.rightAngles === 1 ? "a square corner" : `${d.rightAngles} square corners`}` : ""}${d.equalSides ? ", all the same length" : ""}.`,
  };
}

/** 1.G.A.1 — draw shapes from their defining attributes (Do it). */
export const drawShapeG1 = () => drawShapeQ(DRAW_G1, "dr1");

/** Cut into equal shares, or shade some shares (Do it). */
function cutOrShade(partsList: number[], tag: string): Question {
  const parts = pick(partsList);
  const round = Math.random() < 0.5;
  const thing = round ? "pizza" : "cake";
  const [one, many] = SHARE_NAME[parts];
  if (Math.random() < 0.5) {
    const named = Math.random() < 0.5;
    return {
      key: `${tag}-cut-${round}-${parts}-${named}`,
      prompt: named ? `Cut the ${thing} into ${many}.` : `Cut the ${thing} into ${parts} equal shares.`,
      speech: named ? `Cut the ${thing} into ${many}.` : `Cut the ${thing} into ${parts} equal shares.`,
      visual: NONE,
      ...act({ kind: "cut", shape: round ? "circle" : "rect", parts }, parts),
      hint: `${cap(many)} means ${parts} equal parts. Every part must be the same size.`,
      explain: `${parts} equal parts are ${many}. The whole ${thing} is ${parts} ${many}.`,
    };
  }
  const target = rand(1, parts);
  const prompt =
    target === parts ? `Shade the whole ${thing}: ${parts} ${many}.` : target === 1 ? `Shade ${one} of the ${thing}.` : `Shade ${target} ${many} of the ${thing}.`;
  return {
    key: `${tag}-shade-${round}-${parts}-${target}`,
    prompt,
    speech: prompt,
    visual: NONE,
    ...act({ kind: "shade", parts, target, shape: round ? "pie" : "bar" }, target),
    hint: `Each part is ${one}. Tap ${target === 1 ? "1 part" : `${target} parts`}.`,
    explain: target === parts ? `${parts} ${many} make the whole.` : `${target} of the ${parts} equal parts ${target === 1 ? "is" : "are"} shaded.`,
  };
}

/** 1.G.A.3 — cut into halves and fourths; shade shares (Do it). */
export const cutSharesG1 = () => cutOrShade([2, 4], "cs1");

/* ----------------------------------------------------- World: to 1,000 */

/** 2.NBT.A.1a–b, 2.NBT.A.3, 2.NBT.B.8 — build three-digit numbers (Do it). */
export function buildThreeDigit(): Question {
  const form = rand(0, 4);
  let n: number;
  let prompt: string;
  let key: string;
  if (form === 0) {
    n = rand(100, 999);
    prompt = `Build ${n} with blocks.`;
    key = `bb3-${n}`;
  } else if (form === 1) {
    n = rand(100, 999);
    prompt = `Build ${numberWords(n)}.`;
    key = `bb3-w-${n}`;
  } else if (form === 2) {
    const H = rand(1, 9);
    const T = rand(0, 9);
    const O = rand(0, 9);
    n = H * 100 + T * 10 + O;
    prompt = `Build ${H} hundreds, ${T} ${tensW(T)}, ${O} ${ones(O)}.`;
    key = `bb3-p-${n}`;
  } else if (form === 3) {
    const by = pick([10, 100]);
    const base = rand(100, by === 100 ? 899 : 989);
    n = base + by;
    prompt = `Build ${by} more than ${base}.`;
    key = `bb3-m-${by}-${base}`;
  } else {
    const k = rand(1, 9);
    n = k * 100;
    prompt = `Build ${k * 10} tens. Trade for hundreds!`;
    key = `bb3-t-${k}`;
  }
  const H = Math.floor(n / 100);
  const T = tensOf(n % 100);
  const O = onesOf(n);
  return {
    key,
    prompt,
    speech: prompt,
    visual: NONE,
    ...act({ kind: "buildBlocks", target: n, fewest: true }, n),
    hint: "Flats are hundreds, sticks are tens, cubes are ones. 10 of one kind? Trade them for 1 of the next!",
    explain: `${n} is ${H} ${H === 1 ? "hundred" : "hundreds"}, ${T} ${tensW(T)} and ${O} ${ones(O)}.`,
  };
}

/** 2.NBT.A.4 — order three-digit numbers (Do it). */
export const orderThreeDigit = () => orderNumbers(3);

/** 2.OA.C.3 — sort numbers and doubles into odd and even (Do it). */
export function oddEvenSort(): Question {
  let items: { label: string; bin: number }[];
  do {
    const k = rand(5, 8);
    const nums = shuffle(Array.from({ length: 40 }, (_, i) => i + 1)).slice(0, k);
    items = nums.map((n) => ({ label: String(n), bin: n % 2 === 0 ? 0 : 1 }));
    if (Math.random() < 0.5) {
      const d = rand(2, 9);
      const near = Math.random() < 0.5;
      items.push(near ? { label: `${d} + ${d + 1}`, bin: 1 } : { label: `${d} + ${d}`, bin: 0 });
    }
  } while (!items.some((i) => i.bin === 0) || !items.some((i) => i.bin === 1));
  return {
    key: `oes-${items.map((i) => i.label).join(",")}`,
    prompt: "Sort into even and odd.",
    speech: "Is each number even or odd? Sort them.",
    visual: NONE,
    ...act({ kind: "sort", bins: ["Even", "Odd"], items }, items.filter((i) => i.bin === 0).length),
    hint: "Even numbers end in 0, 2, 4, 6 or 8. A double like 6 + 6 is always even.",
    explain: `Even: ${items.filter((i) => i.bin === 0).map((i) => i.label).join(", ")}. Odd: ${items.filter((i) => i.bin === 1).map((i) => i.label).join(", ")}.`,
  };
}

/* ------------------------------------------- World: add & subtract to 1,000 */

/** 2.MD.B.6 — numbers, sums and differences on a 0–100 number line (Do it). */
export function sumsOnLine(): Question {
  const form = rand(0, 2);
  let target: number;
  let prompt: string;
  let hint: string;
  let explain: string;
  if (form === 0) {
    target = rand(5, 95);
    prompt = `Put ${target} on the number line.`;
    hint = `Find ${down10(target)}, then count on ${onesOf(target)} more.`;
    explain = `${target} is ${onesOf(target)} past ${down10(target)}.`;
  } else if (form === 1) {
    const a = rand(10, 70);
    const b = rand(5, 99 - a);
    target = a + b;
    prompt = `Show ${a} + ${b} on the number line.`;
    hint = tensOf(b) ? `Start at ${a}. Jump ${tensOf(b) * 10}, then ${onesOf(b)}.` : `Start at ${a} and jump ${b}.`;
    explain = `${a} + ${b} = ${target}.`;
  } else {
    const a = rand(30, 99);
    const b = rand(5, a - 5);
    target = a - b;
    prompt = `Show ${a} − ${b} on the number line.`;
    hint = tensOf(b) ? `Start at ${a}. Jump back ${tensOf(b) * 10}, then ${onesOf(b)}.` : `Start at ${a} and jump back ${b}.`;
    explain = `${a} − ${b} = ${target}.`;
  }
  return {
    key: `sol-${form}-${prompt}`,
    prompt,
    speech: prompt.replace("−", "minus").replace("+", "plus"),
    visual: NONE,
    ...act({ kind: "placeOnLine", min: 0, max: 100, step: 1, labelStep: 10, target }, target),
    hint,
    explain,
  };
}

/** 2.NBT.B.5, 2.NBT.B.7 — is the answer reasonable? Estimate, then check. */
export function isReasonable(): Question {
  const three = Math.random() < 0.35;
  const plus = Math.random() < 0.6;
  let a: number;
  let b: number;
  if (three) {
    a = plus ? rand(120, 700) : rand(300, 999);
    b = plus ? rand(110, 999 - a) : rand(101, a - 100);
  } else {
    a = plus ? rand(15, 79) : rand(30, 99);
    b = plus ? rand(12, 99 - a) : rand(11, a - 8);
  }
  const right = plus ? a + b : a - b;
  const scale = three ? 100 : 10;
  const digitsOf = (n: number) => [Math.floor(n / 100), tensOf(n % 100), onesOf(n)];
  const mistakes: number[] = [right + scale, right - scale];
  if (plus) {
    const [, ta, oa] = digitsOf(a);
    const [, tb, ob] = digitsOf(b);
    if (oa + ob >= 10) mistakes.push(right - 10);
    if (ta + tb >= 10 && three) mistakes.push(right - 100);
  } else {
    const [ha, ta, oa] = digitsOf(a);
    const [hb, tb, ob] = digitsOf(b);
    if (ob > oa) mistakes.push((ha - hb) * 100 + Math.abs(ta - tb) * 10 + (ob - oa));
  }
  const ok = Math.random() < 0.5;
  const options = mistakes.filter((m) => m !== right && m >= 0);
  const claimed = ok ? right : pick(options);
  const name = nextName();
  const op = plus ? "+" : "−";
  const ra = Math.round(a / scale) * scale;
  const rb = Math.round(b / scale) * scale;
  const est = plus ? ra + rb : ra - rb;
  return {
    key: `rsn-${a}-${op}-${b}-${claimed}`,
    prompt: `${name} says ${a} ${op} ${b} = ${claimed}. Is that right?`,
    speech: `${name} says ${a} ${plus ? "plus" : "minus"} ${b} is ${claimed}. Is that right?`,
    visual: NONE,
    ...fixed(["Yes", "No"], ok ? "Yes" : "No"),
    input: "choices",
    hint: `Estimate first: ${a} is close to ${ra}, and ${b} is close to ${rb}. ${ra} ${op} ${rb} = ${est}. Then check exactly.`,
    explain: ok ? `Yes! ${a} ${op} ${b} = ${right}, close to the estimate of ${est}.` : `No. ${a} ${op} ${b} = ${right}, not ${claimed}.`,
  };
}

/** 2.NBT.B.9 — find the wrong step in a worked answer. */
export function spotStepMistake(): Question {
  const plus = Math.random() < 0.6;
  let a: number;
  let b: number;
  do {
    a = rand(21, 89);
    b = rand(11, 79);
  } while (onesOf(a) === 0 || onesOf(b) === 0 || (plus ? a + b > 99 : b >= a - 5));
  const A = tensOf(a) * 10;
  const B = tensOf(b) * 10;
  const x = onesOf(a);
  const y = onesOf(b);
  const steps = plus ? 3 : 2;
  const bad = rand(0, steps);
  const off = pick([10, -10, 1, -1]);
  let rows: (number | string)[][];
  let fix: string;
  if (plus) {
    const v1 = A + B + (bad === 0 ? (off === 1 || off === -1 ? off * 10 : off) : 0);
    const v2 = x + y + (bad === 1 ? (off === 10 || off === -10 ? off / 10 : off) : 0);
    const v3 = v1 + v2 + (bad === 2 ? off : 0);
    rows = [
      [1, `${A} + ${B} = ${v1}`],
      [2, `${x} + ${y} = ${v2}`],
      [3, `${v1} + ${v2} = ${v3}`],
    ];
    fix = bad === 0 ? `${A} + ${B} = ${A + B}` : bad === 1 ? `${x} + ${y} = ${x + y}` : `${v1} + ${v2} = ${v1 + v2}`;
  } else {
    const o1 = a - B - 10 > y ? (off === 1 || off === -1 ? off * 10 : off) : 10;
    const v1 = a - B + (bad === 0 ? o1 : 0);
    const o2 = v1 - y + off >= 0 ? off : Math.abs(off);
    const v2 = v1 - y + (bad === 1 ? o2 : 0);
    rows = [
      [1, `${a} − ${B} = ${v1}`],
      [2, `${v1} − ${y} = ${v2}`],
    ];
    fix = bad === 0 ? `${a} − ${B} = ${a - B}` : `${v1} − ${y} = ${v1 - y}`;
  }
  const labels = [...Array.from({ length: steps }, (_, i) => `Step ${i + 1}`), "No mistake"];
  const correct = bad === steps ? "No mistake" : `Step ${bad + 1}`;
  return {
    key: `ssm-${plus ? "p" : "m"}-${a}-${b}-${bad}-${off}`,
    prompt: `${a} ${plus ? "+" : "−"} ${b}: which step is wrong?`,
    speech: `Here is how someone worked out ${a} ${plus ? "plus" : "minus"} ${b}. Which step has a mistake?`,
    visual: { kind: "table", header: ["Step", "Work"], rows },
    needsVisual: true,
    ...fixed(labels, correct),
    input: "choices",
    hint: "Check each step on its own. Is the math in that line right?",
    explain: bad === steps ? `Every step is right: ${a} ${plus ? "+" : "−"} ${b} = ${plus ? a + b : a - b}.` : `Step ${bad + 1} should be ${fix}.`,
  };
}

/* ----------------------------------------------------- World: money & time */

/** 2.MD.C.8 — make an amount with coins or bills (Do it). */
export function makeMoneyAct(): Question {
  const form = rand(0, 4);
  if (form <= 2) {
    const c = rand(6, 99);
    const fewest = form === 2;
    const coins = [25, 10, 5, 1];
    return {
      key: `mm-${c}-${fewest}`,
      prompt: fewest ? `Make ${c}¢ with the fewest coins.` : `Make ${c}¢.`,
      speech: fewest ? `Make ${c} cents using as few coins as you can.` : `Tap coins to make ${c} cents.`,
      visual: NONE,
      ...act({ kind: "makeMoney", cents: c, coins, fewest }, c),
      hint: fewest ? "Use the biggest coins you can first: quarters, then dimes, nickels, pennies." : "Start with big coins, then add small ones until you reach the amount.",
      explain: `${fewest ? "Fewest" : "One way"}: ${sayCoins(fewestSet(c, coins))} make ${c}¢.`,
    };
  }
  if (form === 3) {
    const d = rand(2, 15);
    const fewest = Math.random() < 0.5;
    return {
      key: `mm-bills-${d}-${fewest}`,
      prompt: `Make $${d}${fewest ? " with the fewest bills" : ""}.`,
      speech: `Tap bills to make ${d} dollars${fewest ? ", using as few bills as you can" : ""}.`,
      visual: NONE,
      ...act({ kind: "makeMoney", cents: d * 100, coins: [500, 100], fewest }, d * 100),
      hint: "Count $5 bills by 5s, then add $1 bills.",
      explain: `${sayCoins(fewestSet(d * 100, [500, 100]))} make $${d}.`,
    };
  }
  const coin = pick([25, 10, 5]);
  return {
    key: `mm-dollar-${coin}`,
    prompt: `Make $1 using only ${COIN_MANY[coin]}.`,
    speech: `A dollar is 100 cents. Make one dollar using only ${COIN_MANY[coin]}.`,
    visual: NONE,
    ...act({ kind: "makeMoney", cents: 100, coins: [coin] }, 100),
    hint: `Count by ${coin}s until you reach 100.`,
    explain: `${100 / coin} ${COIN_MANY[coin]} make 100¢, one dollar.`,
  };
}

/** 2.MD.C.8 — the fewest coins; how many of one coin make an amount. */
export function fewestCoins(): Question {
  if (Math.random() < 0.7) {
    const c = rand(6, 99);
    const set = fewestSet(c, [25, 10, 5, 1]);
    const n = set.reduce((s, [, k]) => s + k, 0);
    return {
      key: `fc-${c}`,
      prompt: `Fewest coins to make ${c}¢?`,
      speech: `What is the fewest number of coins that make ${c} cents?`,
      visual: NONE,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 4, min: 1, max: 15, likely: [n + 1, n + 2, n - 1] }),
      hint: "Use as many quarters as you can, then dimes, then nickels, then pennies.",
      explain: `${sayCoins(set)}: that's ${n} coin${n === 1 ? "" : "s"}.`,
    };
  }
  const coin = pick([5, 10, 25]);
  const k = coin === 25 ? rand(2, 4) : rand(2, 9);
  return {
    key: `fc-many-${coin}-${k}`,
    prompt: `How many ${COIN_MANY[coin]} make ${coin * k}¢?`,
    speech: `How many ${COIN_MANY[coin]} make ${coin * k} cents?`,
    visual: NONE,
    answer: k,
    input: "choices",
    choices: makeChoices(k, { n: 4, min: 1, max: 20, likely: [k + 1, k - 1, coin * k / 10] }),
    hint: `Count by ${coin}s until you reach ${coin * k}.`,
    explain: `${Array.from({ length: k }, (_, i) => coin * (i + 1)).join(", ")}. That's ${k} ${COIN_MANY[coin]}.`,
  };
}

/** 2.MD.C.7 — set a clock to five minutes (Do it). */
export function setClockFive(): Question {
  const h = rand(1, 12);
  const m = 5 * rand(0, 11);
  const words = Math.random() < 0.35 && m > 0;
  const where = m === 0 ? 12 : m / 5;
  return {
    key: `sc5-${h}-${m}-${words}`,
    prompt: words ? `Show ${m} minutes past ${h} on the clock.` : `Show ${clockText(h, m)} on the clock.`,
    speech: `Set the clock to ${m === 0 ? `${h} o'clock` : `${m} minutes past ${h}`}.`,
    visual: NONE,
    ...act({ kind: "setClock", h, m, snap: 5 }, m),
    hint: `Count by 5s to ${m}: the long hand goes on the ${where}. The short hand goes just past the ${h}.`,
    explain: `At ${clockText(h, m)} the long hand points to ${where} and the short hand is ${m === 0 ? "on" : m < 30 ? "just past" : "past"} the ${h}.`,
  };
}

/** 2.MD.C.7 — sort daily activities into a.m. and p.m. (Do it). */
export function daySort(): Question {
  let picked: typeof DAY;
  do {
    picked = shuffle(DAY).slice(0, rand(4, 6));
  } while (!picked.some((d) => d.am) || !picked.some((d) => !d.am));
  const items = picked.map((d) => ({ label: `${d.e} ${d.what}, ${clockText(d.h, d.m)}`, bin: d.am ? 0 : 1 }));
  return {
    key: `ds-${picked.map((d) => d.what).sort().join(",")}`,
    prompt: "Sort the times: a.m. or p.m.?",
    speech: "Is each one in the a.m. or the p.m.? Sort them.",
    visual: NONE,
    ...act({ kind: "sort", bins: ["a.m.", "p.m."], items }, picked.filter((d) => d.am).length),
    hint: "a.m. is midnight to noon: the morning. p.m. is noon to midnight: afternoon and night.",
    explain: `a.m.: ${picked.filter((d) => d.am).map((d) => d.what).join(", ")}. p.m.: ${picked.filter((d) => !d.am).map((d) => d.what).join(", ")}.`,
  };
}

/* --------------------------------------------------- World: measure & graph */

/** 2.MD.A.1, 2.MD.B.5 — make a bar a given length on a ruler (Do it). */
export function makeLengthAct(): Question {
  const form = rand(0, 2);
  const unit = pick(["cm", "in"] as const);
  let n: number;
  let prompt: string;
  let key: string;
  if (form === 0) {
    n = unit === "in" ? rand(1, 12) : rand(2, 15);
    prompt = `Make a bar ${n} ${unit} long.`;
    key = `ml-${unit}-${n}`;
  } else if (form === 1) {
    const thing = pick(RULER_THINGS);
    const [lo, hi] = thing[unit];
    n = rand(lo, hi);
    prompt = `A ${thing.n} is ${n} ${unit}. Make a bar that long.`;
    key = `ml-t-${thing.n}-${unit}-${n}`;
  } else {
    const grow = Math.random() < 0.5;
    const a = grow ? rand(2, 9) : rand(6, 15);
    const b = grow ? rand(1, 15 - a) : rand(1, a - 2);
    n = grow ? a + b : a - b;
    prompt = grow ? `A worm is ${a} ${unit}. It grows ${b} ${unit}. Show it now.` : `A ribbon is ${a} ${unit}. Cut off ${b} ${unit}. Show what's left.`;
    key = `ml-w-${grow}-${unit}-${a}-${b}`;
  }
  return {
    key,
    prompt,
    speech: prompt.replace(/ cm/g, " centimeters").replace(/ in\b/g, " inches"),
    visual: NONE,
    ...act({ kind: "makeLength", length: n, unit, sub: 1 }, n),
    hint: form === 2 ? "Work out the new length first. Then drag the bar's end to that number." : "Start at 0. Drag the end of the bar to the number on the ruler.",
    explain: `The bar goes from 0 to ${n}: ${n} ${n === 1 ? (unit === "in" ? "inch" : "centimeter") : UNIT_WORD[unit]}.`,
  };
}

/** 2.MD.A.3 — estimate lengths and pick the best unit. */
export const estimateLengths = () => estimateUnits([0, 1]);

/** 2.MD.A.2 — bigger units give smaller numbers. */
export const unitSize = () => estimateUnits([2]);

/** 2.MD.D.10 — make a bar graph from a table (Do it). */
export function makeBarGraph(): Question {
  const theme = pick(GRAPH_THEMES);
  const cats = shuffle(theme.items).slice(0, 4);
  const counts = cats.map(() => rand(1, 10));
  return {
    key: `mbg-${theme.title}-${cats.map((c, i) => c[0] + counts[i]).join(".")}`,
    prompt: "Make a bar graph from the table.",
    speech: `Here is a table: ${theme.title}. Drag each bar to show the number in the table.`,
    visual: { kind: "table", header: [theme.title, "How many"], rows: cats.map((c, i) => [`${c[1]} ${c[0]}`, counts[i]]) },
    needsVisual: true,
    ...act(
      { kind: "barGraph", title: theme.title, items: cats.map((c, i) => ({ label: `${c[1]} ${c[0]}`, value: counts[i] })), max: 10, step: 1, hideData: true },
      counts.reduce((x, y) => x + y, 0),
    ),
    hint: "Read a number in the table. Drag that bar up until it lines up with the same number.",
    explain: cats.map((c, i) => `${c[0]}: ${counts[i]}`).join(", ") + ".",
  };
}

/** 2.MD.D.9 — make a line plot from measurements (Do it). */
export function makeLinePlot(): Question {
  const p = pick(PLOTS);
  const k = rand(5, 10);
  const values = Array.from({ length: k }, () => rand(p.min, p.max));
  const sorted = [...values].sort((x, y) => x - y);
  const tally = new Map<number, number>();
  sorted.forEach((v) => tally.set(v, (tally.get(v) ?? 0) + 1));
  return {
    key: `mlp-${p.what}-${values.join(".")}`,
    prompt: `Make a line plot of the ${p.what}.`,
    speech: `The table shows how long some ${p.what} are. Tap above the number line to make a line plot.`,
    visual: { kind: "table", header: [cap(p.what.replace(/s$/, "").replace(/ve$/, "f")), `Length (${p.u})`], rows: values.map((v, i) => [String.fromCharCode(65 + i), v]) },
    needsVisual: true,
    ...act({ kind: "dotPlot", values: sorted, min: p.min, max: p.max, step: 1, label: p.label }, k),
    hint: "For each length in the table, put one dot above that number.",
    explain: [...tally.entries()].map(([v, c]) => `${c} dot${c === 1 ? "" : "s"} at ${v}`).join(", ") + ".",
  };
}

/** 2.MD.B.6, 2.MD.B.5 — length stories on a 0–100 number line (Do it). */
export function lengthOnLine(): Question {
  const form = rand(0, 3);
  const name = nextName();
  let target: number;
  let prompt: string;
  let hint: string;
  if (form === 0) {
    const a = rand(30, 95);
    const b = rand(5, a - 10);
    target = a - b;
    prompt = `A ribbon is ${a} cm. ${name} cuts off ${b} cm. Show what's left.`;
    hint = `Start at ${a} and jump back ${b}.`;
  } else if (form === 1) {
    const a = rand(10, 70);
    const b = rand(5, 95 - a);
    target = a + b;
    prompt = `A plant is ${a} cm tall. It grows ${b} cm. Show its height.`;
    hint = `Start at ${a} and jump forward ${b}.`;
  } else if (form === 2) {
    const a = rand(10, 60);
    const b = rand(10, 95 - a);
    target = a + b;
    prompt = `Sticks of ${a} cm and ${b} cm, end to end. Show the total.`;
    hint = `Start at ${a} and jump forward ${b}.`;
  } else {
    target = rand(5, 95);
    prompt = `Show a length of ${target} cm, starting from 0.`;
    hint = `From 0, count by tens to ${down10(target)}, then ${onesOf(target)} more.`;
  }
  return {
    key: `lol-${form}-${prompt.replace(name, "")}`,
    prompt,
    speech: prompt.replace(/ cm/g, " centimeters"),
    visual: NONE,
    ...act({ kind: "placeOnLine", min: 0, max: 100, step: 1, labelStep: 10, target }, target),
    hint,
    explain: `The length is ${target} cm.`,
  };
}

/* ---------------------------------------------- World: arrays & equal parts */

/** 2.OA.C.4 — build an array (Do it). */
export function buildArrayAct(): Question {
  const rows = rand(2, 5);
  const cols = rand(2, 5);
  const sum = Array<number>(rows).fill(cols).join(" + ");
  const fromSum = Math.random() < 0.5;
  return {
    key: `ba-${rows}-${cols}-${fromSum}`,
    prompt: fromSum ? `Build an array for ${sum}.` : `Build ${rows} rows of ${cols}.`,
    speech: fromSum ? `Build an array that shows ${sum}.` : `Build an array with ${rows} rows and ${cols} in each row.`,
    visual: NONE,
    ...act({ kind: "buildArray", rows, cols }, rows * cols),
    hint: fromSum ? `Each ${cols} is one row. Count how many ${cols}s there are.` : "Rows go across. Put the same number in every row.",
    explain: `${rows} rows of ${cols}: ${sum} = ${rows * cols}.`,
  };
}

/** 2.G.A.2 — cut a rectangle into rows and columns of squares (Do it). */
export function cutGrid(): Question {
  const rows = rand(1, 4);
  const cols = rand(2, 5);
  const total = rows * cols;
  const byTotal = Math.random() < 0.4 && rows > 1;
  return {
    key: `cg-${rows}-${cols}-${byTotal}`,
    prompt: byTotal ? `Cut it into ${total} same-size squares in ${rows} rows.` : `Cut it into ${rows} ${rows === 1 ? "row" : "rows"} and ${cols} columns.`,
    speech: byTotal
      ? `Cut the rectangle into ${total} same-size squares, in ${rows} rows.`
      : `Cut the rectangle into ${rows} ${rows === 1 ? "row" : "rows"} and ${cols} columns of same-size squares.`,
    visual: NONE,
    ...act({ kind: "cut", shape: "rect", rows, cols }, total),
    hint: byTotal ? `${total} squares in ${rows} equal rows: how many go in each row?` : "Rows go across. Columns go up and down.",
    explain: `${rows} ${rows === 1 ? "row" : "rows"} of ${cols} squares make ${total} squares.`,
  };
}

/** 2.G.A.1 — draw shapes with a given number of sides or angles (Do it). */
export const drawShapeG2 = () => drawShapeQ(DRAW_G2, "dr2");

/** 2.G.A.3 — cut into halves, thirds and fourths; shade shares (Do it). */
export const cutSharesG2 = () => cutOrShade([2, 3, 4], "cs2");

/** 1.NBT.A.1 — write numerals to 120 by tracing them (Do it). */
export function traceNumbers(): Question {
  const r = Math.random();
  const n = r < 0.3 ? rand(100, 120) : r < 0.5 ? rand(11, 19) : rand(20, 99);
  const fromWords = Math.random() < 0.5;
  return {
    key: `tr-${n}-${fromWords}`,
    prompt: fromWords ? `Write ${numberWords(n)}.` : `Trace the number ${n}.`,
    speech: fromWords ? `Write the number ${numberWords(n)}. Trace each digit with your finger.` : `Trace the number ${n} with your finger.`,
    visual: NONE,
    ...act({ kind: "trace", text: String(n) }, n),
    hint: n >= 100 ? "Write 1 for one hundred, then the tens digit, then the ones digit." : n < 20 ? "Teen numbers start with a 1 for the ten." : "Write the tens digit first, then the ones digit.",
    explain: `${numberWords(n)} is written ${n}.`,
  };
}
