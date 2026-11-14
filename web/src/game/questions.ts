/**
 * Question generators for the younger Wonderkind worlds, plus the shared types
 * and helpers every generator uses.
 *
 * Each question carries a visual model (pictures, ten-frames, base-ten
 * blocks, equal groups) so kids can see the math before the symbols.
 */

import type { CellKind, Question, Thing, Token, Visual } from "./types";

export type * from "./types";

export const THINGS: Thing[] = [
  { emoji: "🍎", one: "apple", many: "apples" },
  { emoji: "🍓", one: "strawberry", many: "strawberries" },
  { emoji: "🐞", one: "ladybug", many: "ladybugs" },
  { emoji: "🐟", one: "fish", many: "fish" },
  { emoji: "🎈", one: "balloon", many: "balloons" },
  { emoji: "🧁", one: "cupcake", many: "cupcakes" },
  { emoji: "🐤", one: "chick", many: "chicks" },
  { emoji: "⚽", one: "ball", many: "balls" },
  { emoji: "🌼", one: "flower", many: "flowers" },
  { emoji: "🍪", one: "cookie", many: "cookies" },
  { emoji: "🍊", one: "orange", many: "oranges" },
  { emoji: "🦋", one: "butterfly", many: "butterflies" },
  { emoji: "🐢", one: "turtle", many: "turtles" },
  { emoji: "🚗", one: "car", many: "cars" },
  { emoji: "🍩", one: "donut", many: "donuts" },
  { emoji: "🐝", one: "bee", many: "bees" },
  { emoji: "🦆", one: "duck", many: "ducks" },
  { emoji: "🧸", one: "teddy bear", many: "teddy bears" },
];

export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(items: readonly T[]): T {
  return items[rand(0, items.length - 1)];
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Hand out items in a shuffled order without repeats until all are used,
 * and never the same item twice in a row across reshuffles.
 */
export function bag<T>(items: readonly T[]): () => T {
  let queue: T[] = [];
  let last: T | undefined;
  return () => {
    if (!queue.length) {
      queue = shuffle(items);
      if (queue.length > 1 && queue[0] === last) queue.push(queue.shift()!);
    }
    last = queue.shift()!;
    return last;
  };
}

export const nextThing = bag(THINGS);

export const word = (n: number, thing: Thing) => (n === 1 ? thing.one : thing.many);

/** Display a number with a real minus sign. */
export const fmt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

/** Thousands separators from 10,000 up, so big numbers are readable. */
const grouped = (n: number) => (Number.isInteger(n) && Math.abs(n) >= 10000 ? fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : fmt(n));

/** What the answer looks like on screen. */
export const answerText = (q: Question, value = q.answer) => (q.labels ? q.labels[value] : grouped(value));

/** The answer with its prefix and unit: "$4.50", "12 cm²", "90°". */
export function withUnit(q: Question, value = q.answer): string {
  const unit = q.unit ? (/^[°%¢′″]/.test(q.unit) ? q.unit : ` ${q.unit}`) : "";
  return `${q.prefix ?? ""}${answerText(q, value)}${unit}`;
}

/**
 * Build answer choices: the answer, the likely mistakes we pass in, then
 * near neighbours until there are enough. Everything stays within range.
 */
export function makeChoices(
  answer: number,
  { n = 3, min = 0, max = 20, likely = [] as number[] } = {},
): number[] {
  const picked = new Set<number>([answer]);
  const tryAdd = (v: number) => {
    if (picked.size < n && v >= min && v <= max && Number.isInteger(v)) picked.add(v);
  };
  shuffle(likely).forEach(tryAdd);
  for (let step = 1; picked.size < n && step <= max - min + 1; step++) {
    shuffle([answer + step, answer - step]).forEach(tryAdd);
  }
  return shuffle([...picked]);
}

/** Choices that are text (fractions, signs, decimals): returns ids, labels and the answer id. */
export function labelChoices(correct: string, wrong: string[], n = 4) {
  const others = [...new Set(wrong)].filter((w) => w !== correct).slice(0, n - 1);
  const labels = shuffle([correct, ...others]);
  return { choices: labels.map((_, i) => i), labels, answer: labels.indexOf(correct) };
}

const OP_WORD: Record<string, string> = {
  "+": "plus",
  "−": "minus",
  "×": "times",
  "÷": "divided by",
  "=": "equals",
  "?": "what",
};

export function sayEquation(eq: Token[]): string {
  return eq
    .map((t) => (typeof t === "number" ? (t < 0 ? `negative ${-t}` : String(t)) : typeof t === "string" ? (OP_WORD[t] ?? t) : ""))
    .join(" ");
}

function cells(...runs: [CellKind, number][]): CellKind[] {
  return runs.flatMap(([kind, n]) => Array<CellKind>(n).fill(kind));
}

/* ---------------------------------------------------------------- counting */

export function countObjects(min: number, max: number): Question {
  const thing = nextThing();
  const n = rand(min, max);
  const prompt = pick([`How many ${thing.many}?`, `Count the ${thing.many}!`, `How many ${thing.many} can you see?`]);
  return {
    key: `count-${n}-${thing.one}`,
    prompt,
    speech: prompt,
    visual: { kind: "objects", thing, count: n },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: 4, min: 1, max: 20, likely: [n - 1, n + 1, n + 10, n - 10] }),
    hint: n > 10 ? "Count the full rows of 5 first: 5, 10, 15… then count on." : "Touch each one as you count it.",
    explain: `There ${n === 1 ? "is" : "are"} ${n} ${word(n, thing)}.`,
  };
}

export function whatComesNext(): Question {
  const start = rand(1, 16);
  const seq = [start, start + 1, start + 2];
  const answer = start + 3;
  return {
    key: `next-${start}`,
    prompt: pick(["What number comes next?", "What comes after?", "Keep counting! What's next?"]),
    speech: `${seq.join(", ")}. What number comes next?`,
    visual: { kind: "sequence", numbers: seq, next: answer },
    needsVisual: true,
    answer,
    input: "choices",
    choices: makeChoices(answer, { min: 1, max: 20, likely: [start + 2, start + 4] }),
    hint: "Say the numbers out loud. What do you say next?",
    explain: `${start + 2}, then ${answer}!`,
  };
}

export function countBack(): Question {
  const start = rand(6, 20);
  const seq = [start, start - 1, start - 2];
  const answer = start - 3;
  return {
    key: `back-${start}`,
    prompt: pick(["Count back! What comes next?", "Going down! What's next?"]),
    speech: `${seq.join(", ")}. Counting back, what comes next?`,
    visual: { kind: "sequence", numbers: seq, next: answer },
    needsVisual: true,
    answer,
    input: "choices",
    choices: makeChoices(answer, { min: 0, max: 20, likely: [start - 2, start - 4, start + 1] }),
    hint: "Each number is one less than the one before.",
    explain: `One less than ${start - 2} is ${answer}.`,
  };
}

export function whichHasMore(): Question {
  const thing = nextThing();
  const left = rand(1, 9);
  let right = rand(1, 10);
  while (right === left) right = rand(1, 10);
  const more = Math.max(left, right);
  const less = Math.min(left, right);
  return {
    key: `more-${left}-${right}`,
    prompt: pick([`Which side has more ${thing.many}?`, `Tap the side with more ${thing.many}.`]),
    speech: `Which side has more ${thing.many}? Tap it!`,
    visual: { kind: "compare", thing, left, right },
    needsVisual: true,
    answer: more,
    input: "compare",
    hint: "Count each side. Which number is bigger?",
    explain: `${more} is more than ${less}.`,
  };
}

/* ------------------------------------------------------------------ adding */

export function addPictures(maxSum: number): Question {
  const thing = nextThing();
  const a = rand(1, maxSum - 1);
  const b = rand(1, maxSum - a);
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `addpic-${a}-${b}-${thing.one}`,
    prompt: pick(["How many in all?", "Put them together. How many?", `How many ${thing.many} altogether?`]),
    speech: `${a} ${word(a, thing)} and ${b} more. How many in all?`,
    equation: eq,
    visual: { kind: "add", thing, a, b },
    answer: a + b,
    input: "choices",
    choices: makeChoices(a + b, { min: 1, max: 10, likely: [a + b - 1, a + b + 1] }),
    hint: "Count all of them together.",
    explain: `${a} and ${b} make ${a + b}.`,
  };
}

export function addTenFrame(): Question {
  const a = rand(1, 8);
  const b = rand(1, 10 - a);
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `add10-${a}-${b}`,
    prompt: pick(["How many dots in all?", "Add them up!", "What's the total?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", a], ["b", b]) },
    answer: a + b,
    input: "choices",
    choices: makeChoices(a + b, { n: 4, min: 1, max: 10, likely: [a + b - 1, a + b + 1, 10 - a - b] }),
    hint: "Count the dots. Or count the empty boxes and take them from 10.",
    explain: `${a} + ${b} = ${a + b}`,
  };
}

export function doubles(): Question {
  const n = rand(1, 9);
  const near = Math.random() < 0.5;
  const b = near ? n + 1 : n;
  const sum = n + b;
  const eq: Token[] = [n, "+", b, "=", "?"];
  return {
    key: `double-${n}-${b}`,
    prompt: near ? pick(["Near double! What's the total?", `${n} + ${b}?`]) : pick([`What is double ${n}?`, "Double it!"]),
    speech: near ? `${n} plus ${b}. That's double ${n}, plus one more.` : `What is double ${n}? ${n} plus ${n}.`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", n], ["b", b]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 1, max: 20, likely: [sum - 1, sum + 1, n * 2 + 2] }),
    hint: near ? `Double ${n} is ${n * 2}. Then add 1 more.` : `Double means the same number twice: ${n} and ${n} more.`,
    explain: near ? `Double ${n} is ${n * 2}, and one more makes ${sum}.` : `Double ${n} is ${sum}.`,
  };
}

export function makeTen(): Question {
  const a = rand(1, 9);
  const b = 10 - a;
  const form = rand(0, 2);
  const eq: Token[] = form === 0 ? [a, "+", "?", "=", 10] : form === 1 ? ["?", "+", a, "=", 10] : [10, "−", a, "=", "?"];
  return {
    key: `make10-${form}-${a}`,
    prompt: form === 2 ? pick(["10 take away how many?", "What's left of 10?"]) : pick(["How many more make 10?", "Fill the frame! How many more?"]),
    speech: form === 2 ? `10 take away ${a}. What's left?` : `${a} plus what makes 10?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", a], ["target", b]) },
    answer: b,
    input: "choices",
    choices: makeChoices(b, { n: 4, min: 1, max: 10, likely: [b - 1, b + 1, a] }),
    hint: "Count the empty boxes.",
    explain: `${a} and ${b} make 10.`,
  };
}

export function addTo20(): Question {
  const a = rand(4, 10);
  const b = rand(11 - a, Math.min(10, 20 - a));
  const sum = a + b;
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `add20-${a}-${b}`,
    prompt: pick(["How many dots in all?", "Add them up!", "What's the total?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", a], ["b", b]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 2, max: 20, likely: [sum - 1, sum + 1, sum - 10] }),
    hint: "Fill up the first frame to make 10. Then count what's left.",
    explain: `${a} + ${b} = ${sum}. That's 10 and ${sum - 10} more.`,
  };
}

export function addThree(): Question {
  const a = rand(1, 6);
  const b = rand(1, 6);
  const c = rand(1, 6);
  const sum = a + b + c;
  const eq: Token[] = [a, "+", b, "+", c, "=", "?"];
  return {
    key: `add3-${a}-${b}-${c}`,
    prompt: pick(["Add all three!", "Three numbers! What's the total?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", a], ["b", b], ["a", c]) },
    answer: sum,
    input: "choices",
    choices: makeChoices(sum, { n: 4, min: 3, max: 18, likely: [a + b, b + c, sum + 1, sum - 1] }),
    hint: "Add two numbers first, then add the third. Look for a pair that makes 10!",
    explain: `${a} + ${b} = ${a + b}, and ${a + b} + ${c} = ${sum}.`,
  };
}

/* ------------------------------------------------------------- taking away */

export function takeAwayPictures(maxTotal: number): Question {
  const thing = nextThing();
  const total = rand(2, maxTotal);
  const gone = rand(1, total - 1);
  const left = total - gone;
  const eq: Token[] = [total, "−", gone, "=", "?"];
  return {
    key: `takepic-${total}-${gone}-${thing.one}`,
    prompt: pick(["How many are left?", `How many ${thing.many} stay?`, "Some went away! How many now?"]),
    speech: `${total} ${word(total, thing)}. ${gone} ${gone === 1 ? "goes" : "go"} away. How many are left?`,
    equation: eq,
    visual: { kind: "takeaway", thing, total, gone },
    answer: left,
    input: "choices",
    choices: makeChoices(left, { min: 0, max: 10, likely: [total, gone, left + 1] }),
    hint: "Count only the ones that are still there.",
    explain: `${total} take away ${gone} leaves ${left}.`,
  };
}

export function takeAwayFrame(minTotal: number, maxTotal: number): Question {
  const total = rand(minTotal, maxTotal);
  const gone = rand(1, Math.min(10, total - 1));
  const left = total - gone;
  const eq: Token[] = [total, "−", gone, "=", "?"];
  return {
    key: `takeframe-${total}-${gone}`,
    prompt: pick(["How many dots are left?", "Take them away! What's left?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", left], ["gone", gone]) },
    answer: left,
    input: "choices",
    choices: makeChoices(left, { n: 4, min: 0, max: 20, likely: [left + 1, left - 1, total + gone] }),
    hint: "The crossed-out dots are gone. Count the dots that are left.",
    explain: `${total} − ${gone} = ${left}`,
  };
}

export function missingNumber(): Question {
  const total = rand(3, 10);
  const a = rand(1, total - 1);
  const b = total - a;
  const eq: Token[] = [a, "+", "?", "=", total];
  return {
    key: `missing-${a}-${total}`,
    prompt: pick(["What number is missing?", "Find the missing number!"]),
    speech: `${a} plus what equals ${total}?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", a], ["target", b]) },
    answer: b,
    input: "choices",
    choices: makeChoices(b, { n: 4, min: 0, max: 10, likely: [total, b + 1, b - 1] }),
    hint: `Start at ${a}. Count up until you reach ${total}.`,
    explain: `${a} + ${b} = ${total}`,
  };
}

export function howManyMore(): Question {
  const thing = nextThing();
  const bottom = rand(1, 7);
  const top = rand(bottom + 1, 10);
  const diff = top - bottom;
  const eq: Token[] = [top, "−", bottom, "=", "?"];
  return {
    key: `diff-${top}-${bottom}`,
    prompt: pick([`How many more ${thing.many} on top?`, "How many more on the top row?"]),
    speech: `There are ${top} on top and ${bottom} on the bottom. How many more on top?`,
    equation: eq,
    visual: { kind: "rows", thing, top, bottom },
    needsVisual: true,
    answer: diff,
    input: "choices",
    choices: makeChoices(diff, { n: 4, min: 0, max: 10, likely: [top, bottom, diff + 1] }),
    hint: "Match each one on the bottom with one on top. Count the extras.",
    explain: `${top} is ${diff} more than ${bottom}.`,
  };
}

export function plusOrMinus(): Question {
  const plus = Math.random() < 0.5;
  const a = rand(2, 10);
  const b = plus ? rand(1, 10) : rand(1, a - 1);
  const c = plus ? a + b : a - b;
  const sign = plus ? "+" : "−";
  const { choices, labels, answer } = labelChoices(sign, [plus ? "−" : "+"], 2);
  return {
    key: `sign-${a}-${sign}-${b}`,
    prompt: pick(["Plus or minus?", "Which sign fits?"]),
    speech: `${a}, what, ${b}, equals ${c}. Plus or minus?`,
    equation: [a, "?", b, "=", c],
    visual: { kind: "none" },
    answer,
    input: "choices",
    choices,
    labels,
    hint: `Is ${c} bigger or smaller than ${a}? Bigger means plus.`,
    explain: `${a} ${sign} ${b} = ${c}`,
  };
}

/* ------------------------------------------------------------- big numbers */

export function tensAndOnes(): Question {
  const tens = rand(1, 9);
  const ones = rand(0, 9);
  const n = tens * 10 + ones;
  return {
    key: `place-${n}`,
    prompt: pick(["What number do the blocks make?", "Tens and ones! What number?"]),
    speech: `${tens} tens and ${ones} ones. What number is that?`,
    visual: { kind: "blocks", numbers: [n] },
    needsVisual: true,
    answer: n,
    input: "keypad",
    hint: "Each long stick is 10. Count by tens, then count on the little cubes.",
    explain: `${tens} tens and ${ones} ones make ${n}.`,
  };
}

export function skipCount(): Question {
  const step = pick([2, 5, 10]);
  const start = step * rand(1, 6);
  const seq = [start, start + step, start + 2 * step];
  const answer = start + 3 * step;
  return {
    key: `skip-${step}-${start}`,
    prompt: `Count by ${step}s! What comes next?`,
    speech: `Count by ${step}s. ${seq.join(", ")}. What comes next?`,
    visual: { kind: "sequence", numbers: seq, next: answer },
    needsVisual: true,
    answer,
    input: "choices",
    choices: makeChoices(answer, { n: 4, min: 0, max: 100, likely: [answer + 1, answer - 1, answer + step] }),
    hint: `Add ${step} to the last number.`,
    explain: `${start + 2 * step} + ${step} = ${answer}`,
  };
}

export function addTens(): Question {
  const a = rand(1, 8) * 10;
  const b = rand(1, (100 - a) / 10) * 10;
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `addtens-${a}-${b}`,
    prompt: pick(["Add the tens!", "Tens plus tens?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: [a, b] },
    answer: a + b,
    input: "keypad",
    hint: "Count the sticks by tens: 10, 20, 30…",
    explain: `${a / 10} tens and ${b / 10} tens make ${(a + b) / 10} tens. That's ${a + b}.`,
  };
}

export function addTo100(): Question {
  const a = rand(12, 89);
  const b = rand(2, Math.min(9, 99 - a));
  const sum = a + b;
  const eq: Token[] = [a, "+", b, "=", "?"];
  return {
    key: `add100-${a}-${b}`,
    prompt: pick(["What's the total?", "Add them up!"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: [a, b] },
    answer: sum,
    input: "keypad",
    hint: `Add the ones first: ${a % 10} + ${b}. Ten ones make a new stick!`,
    explain: `${a} + ${b} = ${sum}`,
  };
}

export function takeAwayTens(): Question {
  const a = rand(3, 10) * 10;
  const b = rand(1, a / 10 - 1) * 10;
  const eq: Token[] = [a, "−", b, "=", "?"];
  return {
    key: `subtens-${a}-${b}`,
    prompt: pick(["Take away the tens!", "Tens minus tens?"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "blocks", numbers: [a], goneTens: b / 10 },
    answer: a - b,
    input: "keypad",
    hint: "Count the sticks that are left, by tens.",
    explain: `${a / 10} tens take away ${b / 10} tens leaves ${(a - b) / 10} tens. That's ${a - b}.`,
  };
}

export function takeAway100(): Question {
  const a = rand(21, 99);
  const b = rand(2, 9);
  const left = a - b;
  const ones = a % 10;
  const eq: Token[] = [a, "−", b, "=", "?"];
  return {
    key: `sub100-${a}-${b}`,
    prompt: pick(["What's left?", "Take it away!"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "none" },
    answer: left,
    input: "keypad",
    hint:
      ones >= b
        ? `Just the ones: ${ones} − ${b} = ${ones - b}.`
        : `Take away ${ones} to get to ${a - ones}. Then take away ${b - ones} more.`,
    explain: `${a} − ${b} = ${left}`,
  };
}

/* ------------------------------------------------------------ times tables */

export function equalGroups(): Question {
  const thing = nextThing();
  const groups = rand(2, 5);
  const each = rand(2, 5);
  const total = groups * each;
  const eq: Token[] = [groups, "×", each, "=", "?"];
  return {
    key: `groups-${groups}-${each}`,
    prompt: `${groups} groups of ${each}. How many in all?`,
    speech: `${groups} groups of ${each} ${thing.many}. How many ${thing.many} in all?`,
    equation: eq,
    visual: { kind: "groups", thing, groups, each },
    answer: total,
    input: "choices",
    choices: makeChoices(total, { n: 4, min: 2, max: 30, likely: [groups + each, total + each, total - each] }),
    hint: `Count by ${each}s: ${each}, ${each * 2}, ${each * 3}…`,
    explain: `${groups} groups of ${each} is ${total}.`,
  };
}

export function arrays(): Question {
  const rows = rand(2, 6);
  const cols = rand(2, 6);
  const total = rows * cols;
  if (Math.random() < 0.5) {
    const { choices, labels, answer } = labelChoices(`${rows} × ${cols}`, [
      `${rows} + ${cols}`,
      `${rows} × ${cols + 1}`,
      `${rows + 1} × ${cols}`,
      `${rows - 1} × ${cols}`,
    ]);
    return {
      key: `arraymatch-${rows}-${cols}`,
      prompt: "Which times fact matches the dots?",
      speech: "Which times fact matches the dots?",
      visual: { kind: "array", rows, cols },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Count the rows. Then count the dots in one row.",
      explain: `${rows} rows of ${cols} is ${rows} × ${cols}.`,
    };
  }
  const eq: Token[] = [rows, "×", cols, "=", "?"];
  return {
    key: `array-${rows}-${cols}`,
    prompt: pick(["How many dots?", `${rows} rows of ${cols}. How many?`]),
    speech: `${rows} rows of ${cols}. How many dots?`,
    equation: eq,
    visual: { kind: "array", rows, cols },
    answer: total,
    input: "choices",
    choices: makeChoices(total, { n: 4, min: 4, max: 36, likely: [rows + cols, total + cols, total - cols] }),
    hint: `Count by ${cols}s, one row at a time.`,
    explain: `${rows} × ${cols} = ${total}`,
  };
}

export function timesTable(tables: number[]): Question {
  const t = pick(tables);
  const n = rand(1, 10);
  const [a, b] = Math.random() < 0.5 ? [n, t] : [t, n];
  const product = a * b;
  const eq: Token[] = [a, "×", b, "=", "?"];
  const visual: Visual =
    t === 10
      ? { kind: "blocks", numbers: [product] }
      : product <= 100
        ? { kind: "array", rows: n, cols: t }
        : { kind: "none" };
  const nearFive = t > 5 ? `Start with 5 × ${n} = ${5 * n}. Then add ${t - 5} more ${n}s.` : `Skip count by ${t}s, ${n} times.`;
  return {
    key: `times-${a}-${b}`,
    prompt: pick(["Multiply!", "What's the product?", `${a} times ${b}?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual,
    answer: product,
    input: "keypad",
    hint: nearFive,
    explain: `${a} × ${b} = ${product}`,
  };
}

export function shareFairly(): Question {
  const thing = nextThing();
  const groups = rand(2, 4);
  const each = rand(1, 5);
  const total = groups * each;
  const eq: Token[] = [total, "÷", groups, "=", "?"];
  return {
    key: `share-${total}-${groups}`,
    prompt: `Share ${total} ${word(total, thing)} on ${groups} plates. How many on each?`,
    speech: `Share ${total} ${word(total, thing)} fairly on ${groups} plates. How many go on each plate?`,
    equation: eq,
    visual: { kind: "share", thing, groups, each },
    answer: each,
    input: "choices",
    choices: makeChoices(each, { n: 4, min: 1, max: 12, likely: [each + 1, each - 1, groups] }),
    hint: "Give one to each plate, again and again, until none are left.",
    explain: `${total} shared on ${groups} plates is ${each} on each.`,
  };
}

/* ------------------------------------------------------------ lesson build */

/**
 * Make a lesson of unique questions. `avoid` holds keys the kid saw
 * recently, so replaying a level brings new questions; we only fall back to
 * them when a small level (count to 5) runs out. The same answer never comes
 * twice in a row.
 */
export function buildLesson(make: () => Question, count: number, avoid: ReadonlySet<string> = new Set()): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (let tries = 0; out.length < count && tries < count * 80; tries++) {
    const q = make();
    if (seen.has(q.key)) continue;
    if (avoid.has(q.key) && tries < count * 40) continue;
    const prev = out[out.length - 1];
    if (prev && answerText(prev) === answerText(q) && tries < count * 60) continue;
    seen.add(q.key);
    out.push(q);
  }
  return out;
}

export type Difficulty = "easier" | "normal" | "harder";

/**
 * Fit a question to the grown-up's difficulty setting:
 * easier offers 3 choices instead of typing; harder asks kids to type.
 */
export function adapt(q: Question, difficulty: Difficulty): Question {
  const plainNumber = !q.labels && Number.isInteger(q.answer) && q.answer >= 0 && !q.keypadExtra;
  if (difficulty === "easier") {
    if (q.input === "choices" && q.choices && q.choices.length > 3) {
      const others = shuffle(q.choices.filter((c) => c !== q.answer)).slice(0, 2);
      const keep = new Set([q.answer, ...others]);
      const order = q.choices.filter((c) => keep.has(c));
      return { ...q, choices: order };
    }
    if (q.input === "keypad" && plainNumber) {
      const a = q.answer;
      return {
        ...q,
        input: "choices",
        choices: makeChoices(a, { n: 3, min: 0, max: Math.max(20, a * 2 + 20), likely: [a + 1, a - 1, a + 10, a - 10] }),
      };
    }
  }
  if (difficulty === "harder" && q.input === "choices" && plainNumber) {
    return { ...q, input: "keypad", choices: undefined };
  }
  return q;
}

/** How each colour token is named to kids (marbles, spinners). */
export const COLOUR_WORD: Record<import("./types").Colour, string> = {
  sun: "yellow",
  leaf: "green",
  berry: "red",
  wave: "blue",
  grape: "purple",
  teal: "teal",
  cocoa: "brown",
  rose: "pink",
  lime: "lime",
  night: "navy",
  tangerine: "orange",
};
