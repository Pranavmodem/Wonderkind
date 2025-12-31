/**
 * Question generators for the Kindergarten band (ages 4–6, plus pre-K basics):
 * subitizing, counting, comparing, patterns and sorting, measuring words,
 * shapes and positions, adding and taking away within 10, number bonds and
 * teen numbers.
 */
import { labelChoices, makeChoices, nextThing, pick, rand, sayEquation, shuffle, word } from "../questions";
import type { Activity, CellKind, Question, ShapeName, Thing, Token } from "../types";

/* ----------------------------------------------------------------- helpers */

const cells = (...runs: [CellKind, number][]): CellKind[] => runs.flatMap(([k, n]) => Array<CellKind>(n).fill(k));

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** "a cat", "an ant". */
const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const plural = (shape: string) => `${shape}s`;

const isAre = (n: number) => (n === 1 ? "is" : "are");

const fingers = (n: number) => `${n} ${n === 1 ? "finger" : "fingers"}`;

const YES_NO = ["yes", "no"];

/* ---------------------------------------------------------- counting to 10 */

/** Subitizing: see 1–5 at a glance, on a ten-frame or as pictures. */
export function quickLook(): Question {
  const n = rand(1, 5);
  const thing = nextThing();
  const layout = pick(["scatter", "rows", "line", "circle"] as const);
  const prompt = pick([`Quick look! How many ${thing.many}?`, `Peek! How many ${thing.many}?`, "Look fast! How many?"]);
  return {
    key: `peek-${n}-${layout}-${thing.one}`,
    prompt,
    speech: `Take a quick look before they hide! How many ${thing.many} did you see?`,
    visual: { kind: "objects", thing, count: n, layout, flash: true },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: 3, min: 1, max: 6, likely: [n - 1, n + 1] }),
    hint: "Look for small groups you know, then put them together.",
    explain: n === 1 ? "Just 1!" : `That's ${n}. You can see it fast!`,
  };
}

const ARRAYS: [number, number][] = [
  [2, 2],
  [2, 3],
  [2, 4],
  [3, 3],
  [2, 5],
  [3, 4],
  [3, 5],
  [4, 4],
  [4, 5],
];

/** Count pictures in rows (and sometimes dot arrays) from min to max. */
export function countThings(min: number, max: number): Question {
  const arrays = ARRAYS.filter(([r, c]) => r * c >= min && r * c <= max);
  if (arrays.length && Math.random() < 0.25) {
    const [rows, cols] = pick(arrays);
    const n = rows * cols;
    return {
      key: `count-arr-${rows}x${cols}`,
      prompt: pick(["How many dots?", "Count the dots!", "How many dots in all?"]),
      speech: "How many dots are there? Count each row.",
      visual: { kind: "array", rows, cols },
      needsVisual: true,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 4, min: 1, max: 20, likely: [n - 1, n + 1, n - cols] }),
      hint: "Count one row at a time. Don't skip any!",
      explain: `There are ${n} dots.`,
    };
  }
  const thing = nextThing();
  const n = rand(min, max);
  // K.CC.B.5: up to 20 things in a line, rows or a circle; up to 10 scattered.
  const layout = pick(n <= 10 ? (["rows", "line", "circle", "scatter"] as const) : (["rows", "rows", "line", "circle"] as const));
  const prompt =
    layout === "circle"
      ? pick([`Count the ${thing.many} in the circle!`, `How many ${thing.many} in the ring?`])
      : pick([`How many ${thing.many}?`, `Count the ${thing.many}!`, `How many ${thing.many} do you see?`]);
  return {
    key: `count-${n}-${layout}-${thing.one}`,
    prompt,
    speech: prompt,
    visual: { kind: "objects", thing, count: n, layout },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: max <= 5 ? 3 : 4, min: 1, max: 20, likely: [n - 1, n + 1] }),
    hint:
      layout === "circle"
        ? "Remember where you started, so you know when to stop."
        : layout === "scatter"
          ? "Touch each one as you count, so you don't count one twice."
          : n > 10 && layout === "rows"
            ? "Count the full rows of 5 first: 5, 10… then count on."
            : n > 5
              ? "Touch each one and say one number for each."
              : "Touch each one as you count it.",
    explain: `There ${isAre(n)} ${n} ${word(n, thing)}.`,
  };
}

/** The last number said tells how many — in any counting order. */
export function lastNumber(): Question {
  const n = rand(2, 10);
  const thing = nextThing();
  const fromEnd = Math.random() < 0.4;
  const list = range(1, n).join(", ");
  return {
    key: `last-${fromEnd ? "end" : "said"}-${n}-${thing.one}`,
    prompt: fromEnd ? "Count from the other end. How many?" : `Flare counted …${n - 1}, ${n}! How many?`,
    speech: fromEnd
      ? `Count the ${thing.many} again, starting from the other end. How many are there?`
      : `Listen! ${list}. So how many ${thing.many} are there?`,
    visual: { kind: "objects", thing, count: n },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: 3, min: 1, max: 11, likely: [n + 1, n - 1] }),
    hint: fromEnd ? "Counting in a different order gives the same number." : "The last number you say tells how many.",
    explain: fromEnd
      ? `Still ${n}! The order you count in doesn't change how many.`
      : `The last number was ${n}, so there ${isAre(n)} ${n} ${word(n, thing)}.`,
  };
}

/** One more: each next number is one bigger. */
export function oneMore(): Question {
  const n = rand(1, 9);
  const thing = nextThing();
  const frame = Math.random() < 0.35;
  return {
    key: `onemore-${frame ? "frame" : thing.one}-${n}`,
    prompt: frame
      ? pick(["1 more dot! How many now?", `${n} and 1 more makes…?`])
      : pick([`1 more ${thing.one} comes! How many now?`, `${n} and 1 more is…?`, `What is 1 more than ${n}?`]),
    speech: frame
      ? `There ${isAre(n)} ${n} ${n === 1 ? "dot" : "dots"}. Add 1 more. How many now?`
      : `There ${isAre(n)} ${n} ${word(n, thing)}. 1 more comes along. How many now?`,
    visual: frame ? { kind: "tenframe", cells: cells(["a", n], ["b", 1]) } : { kind: "add", thing, a: n, b: 1 },
    answer: n + 1,
    input: "choices",
    choices: makeChoices(n + 1, { n: 3, min: 1, max: 10, likely: [n, n + 2] }),
    hint: `Start at ${n}. Say the next number.`,
    explain: `${n} and 1 more is ${n + 1}. Each next number is 1 more!`,
  };
}

/** Zero means none: all gone, some gone, or counting back to 0. */
export function zero(): Question {
  const thing = nextThing();
  const roll = Math.random();
  if (roll < 0.45) {
    const n = rand(1, 5);
    return {
      key: `zero-all-${n}-${thing.one}`,
      prompt: pick(["They all went away! How many left?", `All the ${thing.many} left. How many now?`]),
      speech: `${n} ${word(n, thing)}. All ${n} go away. How many are left?`,
      visual: { kind: "takeaway", thing, total: n, gone: n },
      needsVisual: true,
      answer: 0,
      input: "choices",
      choices: makeChoices(0, { n: 3, min: 0, max: 6, likely: [n, 1] }),
      hint: "Count only the ones that are still there.",
      explain: "None are left. We write that as 0!",
    };
  }
  if (roll < 0.75) {
    const total = rand(2, 5);
    const gone = rand(1, total - 1);
    const left = total - gone;
    return {
      key: `zero-some-${total}-${gone}-${thing.one}`,
      prompt: pick(["How many are left?", `How many ${thing.many} stay?`]),
      speech: `${total} ${word(total, thing)}. ${gone} ${gone === 1 ? "goes" : "go"} away. How many are left?`,
      visual: { kind: "takeaway", thing, total, gone },
      needsVisual: true,
      answer: left,
      input: "choices",
      choices: makeChoices(left, { n: 3, min: 0, max: 6, likely: [0, total, left + 1] }),
      hint: "Count only the ones that are still there.",
      explain: `${left} ${left === 1 ? "is" : "are"} left.`,
    };
  }
  const start = rand(3, 5);
  const seq = [start, start - 1, start - 2];
  const next = start - 3;
  return {
    key: `zero-back-${start}`,
    prompt: pick(["Count back! What comes next?", "Blast off! What's next?"]),
    speech: `${seq.join(", ")}. Counting back, what comes next?`,
    visual: { kind: "sequence", numbers: seq, next },
    needsVisual: true,
    answer: next,
    input: "choices",
    choices: makeChoices(next, { n: 3, min: 0, max: 6, likely: [next + 1, 0] }),
    hint: `Each number is 1 less. What is 1 less than ${start - 2}?`,
    explain: next === 0 ? "After 1 comes 0 — nothing left!" : `1 less than ${start - 2} is ${next}.`,
  };
}

/* ----------------------------------------------------------------- patterns */

interface Pic {
  e: string;
  n: string;
}

const PATTERN_SETS: Pic[][] = [
  [
    { e: "🔴", n: "red" },
    { e: "🔵", n: "blue" },
    { e: "🟡", n: "yellow" },
    { e: "🟢", n: "green" },
    { e: "🟣", n: "purple" },
  ],
  [
    { e: "🟥", n: "red" },
    { e: "🟦", n: "blue" },
    { e: "🟨", n: "yellow" },
    { e: "🟩", n: "green" },
    { e: "🟧", n: "orange" },
  ],
  [
    { e: "🐶", n: "dog" },
    { e: "🐱", n: "cat" },
    { e: "🐰", n: "bunny" },
    { e: "🐸", n: "frog" },
    { e: "🐷", n: "pig" },
  ],
  [
    { e: "🍎", n: "apple" },
    { e: "🍌", n: "banana" },
    { e: "🍇", n: "grapes" },
    { e: "🍓", n: "strawberry" },
    { e: "🍊", n: "orange" },
  ],
  [
    { e: "⭐", n: "star" },
    { e: "🌙", n: "moon" },
    { e: "☀️", n: "sun" },
    { e: "☁️", n: "cloud" },
    { e: "⚡", n: "lightning" },
  ],
  [
    { e: "🔺", n: "triangle" },
    { e: "🔷", n: "diamond" },
    { e: "⭐", n: "star" },
    { e: "🟩", n: "square" },
    { e: "🟡", n: "circle" },
  ],
  [
    { e: "🚗", n: "car" },
    { e: "🚌", n: "bus" },
    { e: "🚲", n: "bike" },
    { e: "🚂", n: "train" },
    { e: "✈️", n: "plane" },
  ],
];

export type PatternKind = "AB" | "AAB" | "ABB" | "ABC" | "AABB";

/** What comes next in a repeating pattern? */
export function pattern(kinds: PatternKind[]): Question {
  const kind = pick(kinds);
  const set = pick(PATTERN_SETS);
  const [a, b, c, d] = shuffle(set);
  const unit = { AB: [a, b], AAB: [a, a, b], ABB: [a, b, b], ABC: [a, b, c], AABB: [a, a, b, b] }[kind];
  // Show at least two full repeats before the "?".
  const shown = rand(unit.length * 2, unit.length * 2 + unit.length - 1);
  const items = range(0, shown).map((i) => unit[i % unit.length]);
  const next = items[items.length - 1];
  const others = [...new Set(unit)].filter((p) => p !== next);
  const outsider = kind === "ABC" ? d : c;
  const { choices, labels, answer } = labelChoices(
    next.e,
    [...others, outsider].map((p) => p.e),
    kind === "ABC" ? 4 : 3,
  );
  const unitText = unit.map((p) => p.e).join("");
  return {
    key: `pat-${kind}-${unitText}-${shown}`,
    prompt: pick(["What comes next?", "Finish the pattern!", "Which one is next?"]),
    speech: `${items
      .slice(0, -1)
      .map((p) => p.n)
      .join(", ")}… what comes next?`,
    visual: { kind: "pattern", items: items.map((p) => p.e) },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Say it out loud. Find the part that repeats.",
    explain: `${unitText} repeats again and again, so next is ${next.e} ${next.n}.`,
  };
}

/* ------------------------------------------------------------------ sorting */

const GROUPS: { name: string; items: string[] }[] = [
  { name: "fruits", items: ["🍎", "🍌", "🍇", "🍓", "🍐", "🍊"] },
  { name: "animals", items: ["🐶", "🐱", "🐰", "🐮", "🐷", "🐸"] },
  { name: "things that go", items: ["🚗", "🚌", "🚲", "🚂", "✈️", "🚀"] },
  { name: "clothes", items: ["👕", "👖", "🧦", "🧢", "👗", "🧤"] },
  { name: "sweets", items: ["🍪", "🧁", "🍩", "🍭", "🍰", "🍬"] },
  { name: "flowers", items: ["🌻", "🌷", "🌹", "🌼", "🌸", "🌺"] },
  { name: "balls", items: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐"] },
];

/** Groups that could be mistaken for each other aren't mixed. */
const CLASH = new Set(["fruits|sweets", "sweets|fruits"]);

const K_FLAT: ShapeName[] = ["circle", "triangle", "square", "rectangle", "hexagon"];
const K_SOLID: ShapeName[] = ["cube", "sphere", "cone", "cylinder"];

/** Which one doesn't belong? (pictures, or a row of shapes). */
export function oddOneOut(): Question {
  if (Math.random() < 0.3) {
    const [main, odd] = shuffle(K_FLAT.filter((s) => s !== "rectangle"));
    const at = rand(0, 3);
    const shapes = range(0, 3).map((i) => (i === at ? odd : main));
    const { choices, labels, answer } = labelChoices(odd, [main], 2);
    return {
      key: `oddshape-${shapes.join(",")}`,
      prompt: pick(["Which shape doesn't belong?", "Which shape is different?"]),
      speech: "Three shapes go together. Which shape doesn't belong?",
      visual: { kind: "shapes", shapes },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Look at the sides and corners. Which three match?",
      explain: `Three are ${plural(main)}. The ${odd} doesn't belong!`,
    };
  }
  const [group, other] = (() => {
    for (;;) {
      const [g, o] = shuffle(GROUPS);
      if (!CLASH.has(`${g.name}|${o.name}`)) return [g, o];
    }
  })();
  const three = shuffle(group.items).slice(0, 3);
  const odd = pick(other.items);
  const { choices, labels, answer } = labelChoices(odd, three, 4);
  return {
    key: `odd-${[...three].sort().join("")}-${odd}`,
    prompt: pick(["Which one doesn't belong?", "Find the odd one out!", "Which one is different?"]),
    speech: "Three of these go together. Which one doesn't belong?",
    visual: { kind: "none" },
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Find three that go together. What kind of things are they?",
    explain: `${three.join(" ")} are all ${group.name}. ${odd} is not!`,
  };
}

/** Sort a row of shapes and count one kind. */
export function sortShapes(): Question {
  const pool: ShapeName[] = ["circle", "triangle", "hexagon", pick<ShapeName>(["square", "rectangle"])];
  const kinds = shuffle(pool).slice(0, rand(2, 3));
  let shapes: ShapeName[] = [];
  do {
    const len = rand(5, 8);
    shapes = range(1, len).map(() => pick(kinds));
  } while (!kinds.every((k) => shapes.includes(k)));
  const target = pick(kinds);
  const n = shapes.filter((s) => s === target).length;
  return {
    key: `sort-${shapes.join(",")}-${target}`,
    prompt: pick([`How many ${plural(target)}?`, `Count the ${plural(target)}!`, `Find the ${plural(target)}. How many?`]),
    speech: `Sort the shapes. How many ${plural(target)} are there?`,
    visual: { kind: "shapes", shapes },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: 3, min: 1, max: 8, likely: [n + 1, n - 1, shapes.length] }),
    hint: `Look at each shape. Count only the ${plural(target)}.`,
    explain: `There ${isAre(n)} ${n} ${n === 1 ? target : plural(target)}.`,
  };
}

const SORT_SETS: { title: string; items: { label: string; emoji: string }[] }[] = [
  {
    title: "Pets",
    items: [
      { label: "dogs", emoji: "🐶" },
      { label: "cats", emoji: "🐱" },
      { label: "bunnies", emoji: "🐰" },
      { label: "fish", emoji: "🐟" },
    ],
  },
  {
    title: "Fruit",
    items: [
      { label: "apples", emoji: "🍎" },
      { label: "bananas", emoji: "🍌" },
      { label: "pears", emoji: "🍐" },
      { label: "lemons", emoji: "🍋" },
    ],
  },
  {
    title: "Toys",
    items: [
      { label: "balls", emoji: "⚽" },
      { label: "bears", emoji: "🧸" },
      { label: "cars", emoji: "🚗" },
      { label: "kites", emoji: "🪁" },
    ],
  },
  {
    title: "Bugs",
    items: [
      { label: "ladybugs", emoji: "🐞" },
      { label: "bees", emoji: "🐝" },
      { label: "butterflies", emoji: "🦋" },
      { label: "ants", emoji: "🐜" },
    ],
  },
  {
    title: "Snacks",
    items: [
      { label: "cookies", emoji: "🍪" },
      { label: "cupcakes", emoji: "🧁" },
      { label: "donuts", emoji: "🍩" },
      { label: "pretzels", emoji: "🥨" },
    ],
  },
];

/** Sorted groups in a picture graph: which has the most / fewest, how many in one. */
export function sortedGroups(): Question {
  const set = pick(SORT_SETS);
  const cats = shuffle(set.items).slice(0, 3);
  const counts = shuffle(range(1, 8)).slice(0, 3);
  const items = cats.map((c, i) => ({ ...c, count: counts[i] }));
  const visual = { kind: "pictograph" as const, title: set.title, items, key: 1 };
  const form = pick(["most", "fewest", "count"] as const);
  const key = `groups-${form}-${items.map((i) => `${i.emoji}${i.count}`).join("")}`;
  if (form === "count") {
    const it = pick(items);
    return {
      key: `${key}-${it.emoji}`,
      prompt: pick([`How many ${it.label}?`, `Count the ${it.label}!`]),
      speech: `How many ${it.label} are there?`,
      visual,
      needsVisual: true,
      answer: it.count,
      input: "choices",
      choices: makeChoices(it.count, {
        n: 3,
        min: 1,
        max: 10,
        likely: [...items.filter((o) => o !== it).map((o) => o.count), it.count + 1],
      }),
      hint: `Find the row of ${it.label}. Touch each one as you count.`,
      explain: `There ${isAre(it.count)} ${it.count} ${it.label}.`,
    };
  }
  const sorted = [...items].sort((x, y) => x.count - y.count);
  const best = form === "most" ? sorted[2] : sorted[0];
  const name = (i: (typeof items)[number]) => `${i.emoji} ${i.label}`;
  const { choices, labels, answer } = labelChoices(
    name(best),
    items.filter((i) => i !== best).map(name),
    3,
  );
  return {
    key,
    prompt:
      form === "most"
        ? pick(["Which group has the most?", "Which has the most?"])
        : pick(["Which group has the fewest?", "Which has the fewest?"]),
    speech: `Count each row. Which group has the ${form}?`,
    visual,
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Count each row. Then compare the numbers.",
    explain: `${sorted.map((i) => `${i.emoji} ${i.count}`).join(", ")}. ${cap(best.label)} have the ${form}!`,
  };
}

/* --------------------------------------------------------------- comparing */

function twoThings(): [Thing, Thing] {
  const a = nextThing();
  let b = nextThing();
  while (b.one === a.one) b = nextThing();
  return [a, b];
}

/** Which group has fewer? Two rows in a picture graph, lined up to match. */
export function whichHasFewer(): Question {
  const [A, B] = twoThings();
  const a = rand(1, 10);
  let b = rand(1, 10);
  while (b === a) b = rand(1, 10);
  const [small, big, ns, nb] = a < b ? [A, B, a, b] : [B, A, b, a];
  const name = (t: Thing) => `${t.emoji} ${t.many}`;
  const { choices, labels, answer } = labelChoices(name(small), [name(big)], 2);
  return {
    key: `fewer-${a}-${b}-${A.one}-${B.one}`,
    prompt: pick(["Which has fewer?", "Which group has fewer?", `Fewer ${A.many} or ${B.many}?`]),
    speech: `Are there fewer ${A.many} or fewer ${B.many}?`,
    visual: {
      kind: "pictograph",
      title: "Count and compare",
      items: [
        { label: A.many, emoji: A.emoji, count: a },
        { label: B.many, emoji: B.emoji, count: b },
      ],
      key: 1,
    },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Match them up one by one. The row that runs out first has fewer.",
    explain: `${ns} ${word(ns, small)} and ${nb} ${word(nb, big)}. ${ns} is fewer than ${nb}.`,
  };
}

/** More, fewer, or the same? */
export function moreFewerSame(): Question {
  const [A, B] = twoThings();
  const same = Math.random() < 0.33;
  const a = rand(1, 9);
  let b = same ? a : rand(1, 10);
  while (!same && b === a) b = rand(1, 10);
  const labels = [`more ${A.emoji}`, "the same", `fewer ${A.emoji}`];
  const answer = a > b ? 0 : a === b ? 1 : 2;
  return {
    key: `mfs-${a}-${b}-${A.one}-${B.one}`,
    prompt: pick([`More ${A.many}, fewer, or the same?`, `${A.emoji}: more, fewer, or same as ${B.emoji}?`]),
    speech: `Look at the ${A.many} and the ${B.many}. Are there more ${A.many}, fewer ${A.many}, or the same number?`,
    visual: {
      kind: "pictograph",
      title: "Count and compare",
      items: [
        { label: A.many, emoji: A.emoji, count: a },
        { label: B.many, emoji: B.emoji, count: b },
      ],
      key: 1,
    },
    needsVisual: true,
    answer,
    input: "choices",
    choices: [0, 1, 2],
    labels,
    hint: "Match each one on top with one below. Are any left over?",
    explain:
      a === b
        ? `${a} and ${b}: the same number!`
        : `${a} ${word(a, A)} and ${b} ${word(b, B)}. ${a} is ${a > b ? "more" : "fewer"} than ${b}.`,
  };
}

/** Compare written numbers 1–10. */
export function compareNumbers(): Question {
  const three = Math.random() < 0.25;
  const nums = shuffle(range(1, 10)).slice(0, three ? 3 : 2);
  const bigger = Math.random() < 0.6;
  const best = bigger ? Math.max(...nums) : Math.min(...nums);
  const [x, y] = nums;
  const sorted = [...nums].sort((p, q) => p - q);
  const prompt = three
    ? bigger
      ? "Which number is the biggest?"
      : "Which number is the smallest?"
    : bigger
      ? pick([`Which is more, ${x} or ${y}?`, "Which number is bigger?", "Tap the bigger number."])
      : pick([`Which is less, ${x} or ${y}?`, "Which number is smaller?", "Tap the smaller number."]);
  return {
    key: `cmpnum-${bigger ? "big" : "small"}-${sorted.join("-")}`,
    prompt,
    speech: three
      ? `${prompt} ${nums.join(", ")}.`
      : `Which is ${bigger ? "more" : "less"}: ${x} or ${y}?`,
    visual: { kind: "none" },
    answer: best,
    input: "choices",
    choices: nums,
    hint: bigger
      ? "Count up from 1. The number you say later is bigger."
      : "Count up from 1. The number you say first is smaller.",
    explain: three
      ? `${best} is the ${bigger ? "biggest" : "smallest"}: ${sorted.join(", ")}.`
      : bigger
        ? `${best} is more than ${sorted[0]}.`
        : `${best} is less than ${sorted[1]}.`,
  };
}

/* --------------------------------------------------------------- measuring */

const COLOURS = ["red", "blue", "green", "yellow", "purple", "orange"];
const LONG_THINGS = ["ribbon", "snake", "train", "pencil", "worm", "scarf", "rope"];

/** Longer or shorter? Bars that start at the same line. */
export function longerShorter(): Question {
  const thing = pick(LONG_THINGS);
  const count = Math.random() < 0.3 ? 3 : 2;
  const colours = shuffle(COLOURS).slice(0, count);
  const lengths: number[] = [];
  for (const n of shuffle(range(2, 10))) {
    if (lengths.length < count && lengths.every((m) => Math.abs(m - n) >= 2)) lengths.push(n);
  }
  const items = colours.map((c, i) => ({ name: `${c} ${thing}`, length: lengths[i] }));
  const long = Math.random() < 0.5;
  const sorted = [...items].sort((p, q) => p.length - q.length);
  const best = long ? sorted[sorted.length - 1] : sorted[0];
  const { choices, labels, answer } = labelChoices(
    best.name,
    items.filter((i) => i !== best).map((i) => i.name),
    count,
  );
  const wordFor = count === 3 ? (long ? "the longest" : "the shortest") : long ? "longer" : "shorter";
  return {
    key: `len-${long ? "long" : "short"}-${items.map((i) => `${i.name}${i.length}`).join("-")}`,
    prompt: `Which ${thing} is ${wordFor}?`,
    speech: `Which ${thing} is ${wordFor}? Look at where they end.`,
    visual: { kind: "lengths", items },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "They all start at the same line. Look at where each one ends.",
    explain:
      count === 3
        ? `The ${best.name} is ${wordFor}.`
        : `The ${best.name} is ${wordFor} than the ${items.find((i) => i !== best)!.name}.`,
  };
}

interface Scale {
  more: string;
  less: string;
  /** Words for ordering, smallest end first: e.g. "shortest" … "tallest". */
  ends: [string, string];
  hint: string;
  gap: number;
  items: [string, string][];
}

const SCALES: Scale[] = [
  {
    more: "is taller",
    less: "is shorter",
    ends: ["shortest", "tallest"],
    hint: "Picture them standing side by side.",
    gap: 2,
    items: [
      ["🐜", "ant"],
      ["🐭", "mouse"],
      ["🐱", "cat"],
      ["🐕", "dog"],
      ["🐴", "horse"],
      ["🦒", "giraffe"],
    ],
  },
  {
    more: "is taller",
    less: "is shorter",
    ends: ["shortest", "tallest"],
    hint: "Picture them standing side by side.",
    gap: 2,
    items: [
      ["🌱", "sprout"],
      ["🌷", "tulip"],
      ["🌻", "sunflower"],
      ["🌳", "tree"],
      ["🏢", "skyscraper"],
    ],
  },
  {
    more: "is heavier",
    less: "is lighter",
    ends: ["lightest", "heaviest"],
    hint: "Imagine holding one in each hand.",
    gap: 2,
    items: [
      ["🐭", "mouse"],
      ["🐱", "cat"],
      ["🐕", "dog"],
      ["🐴", "horse"],
      ["🐘", "elephant"],
    ],
  },
  {
    more: "is heavier",
    less: "is lighter",
    ends: ["lightest", "heaviest"],
    hint: "Imagine holding one in each hand.",
    gap: 2,
    items: [
      ["🪶", "feather"],
      ["🍓", "strawberry"],
      ["🍉", "watermelon"],
      ["🚗", "car"],
      ["🚚", "truck"],
    ],
  },
  {
    more: "holds more",
    less: "holds less",
    ends: ["smallest", "biggest"],
    hint: "Imagine filling each one with water.",
    gap: 1,
    items: [
      ["🥄", "spoon"],
      ["☕", "cup"],
      ["🪣", "bucket"],
      ["🛁", "bathtub"],
    ],
  },
];

/** Taller, heavier, holds more: compare two everyday things. */
export function compareSizes(): Question {
  const s = rand(0, SCALES.length - 1);
  const scale = SCALES[s];
  let i = 0;
  let j = 0;
  while (j - i < scale.gap) {
    i = rand(0, scale.items.length - 1);
    j = rand(0, scale.items.length - 1);
  }
  const more = Math.random() < 0.5;
  const big = scale.items[j];
  const small = scale.items[i];
  const [right, wrong] = more ? [big, small] : [small, big];
  const name = ([e, n]: [string, string]) => `${e} ${n}`;
  const { choices, labels, answer } = labelChoices(name(right), [name(wrong)], 2);
  const phrase = more ? scale.more : scale.less;
  const order = shuffle([i, j]);
  const [first, second] = order.map((k) => scale.items[k]);
  // Drawn at sizes that follow the scale's order, smallest to biggest.
  const size = (k: number) => Math.round((0.6 + (0.9 * k) / (scale.items.length - 1)) * 100) / 100;
  return {
    key: `size-${s}-${i}-${j}-${more ? "more" : "less"}`,
    prompt: `Which one ${phrase}?`,
    speech: `Which one ${phrase}: the ${first[1]} or the ${second[1]}?`,
    visual: { kind: "pair", items: order.map((k) => ({ emoji: scale.items[k][0], label: scale.items[k][1], size: size(k) })) },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: scale.hint,
    explain: `${cap(an(right[1]))} ${phrase} than ${an(wrong[1])}.`,
  };
}

const MEASURE_PHRASE: Record<string, string> = {
  long: "how long it is",
  tall: "how tall it is",
  heavy: "how heavy it is",
  holds: "how much it holds",
};

const MEASURE_THEY: Record<string, string> = {
  long: "how long they are",
  tall: "how tall they are",
  heavy: "how heavy they are",
  holds: "how much they hold",
};

const MEASURABLE: { e: string; n: string; many: string; attrs: (keyof typeof MEASURE_PHRASE)[] }[] = [
  { e: "✏️", n: "pencil", many: "pencils", attrs: ["long"] },
  { e: "🐍", n: "snake", many: "snakes", attrs: ["long", "heavy"] },
  { e: "🚂", n: "train", many: "trains", attrs: ["long"] },
  { e: "🌳", n: "tree", many: "trees", attrs: ["tall"] },
  { e: "🦒", n: "giraffe", many: "giraffes", attrs: ["tall", "heavy"] },
  { e: "🌻", n: "sunflower", many: "sunflowers", attrs: ["tall"] },
  { e: "🍉", n: "watermelon", many: "watermelons", attrs: ["heavy"] },
  { e: "🎒", n: "backpack", many: "backpacks", attrs: ["heavy", "holds"] },
  { e: "🪣", n: "bucket", many: "buckets", attrs: ["holds", "heavy"] },
  { e: "🥛", n: "glass", many: "glasses", attrs: ["holds", "tall"] },
  { e: "📦", n: "box", many: "boxes", attrs: ["holds", "heavy"] },
  { e: "🪨", n: "rock", many: "rocks", attrs: ["heavy"] },
];

const NOT_MEASURABLE = ["what color it is", "what it is called", "if it is pretty"];
const NOT_MEASURABLE_THEY = ["their color", "their name", "if they are pretty"];

const ATTRIBUTE_WORDS: { pair: string; right: string; wrong: string[] }[] = [
  { pair: "Long or short", right: "length", wrong: ["weight", "color"] },
  { pair: "Heavy or light", right: "weight", wrong: ["length", "color"] },
  { pair: "Tall or short", right: "height", wrong: ["weight", "color"] },
  { pair: "Full or empty", right: "how much it holds", wrong: ["how long it is", "what color it is"] },
];

/** What can we measure about a thing? Measurable vs not measurable. */
export function measureWords(): Question {
  const roll = Math.random();
  if (roll < 0.2) {
    const w = pick(ATTRIBUTE_WORDS);
    const { choices, labels, answer } = labelChoices(w.right, w.wrong, 3);
    return {
      key: `attr-${w.right}`,
      prompt: `${w.pair} tells us about its…`,
      speech: `${w.pair}. What does that tell us about a thing?`,
      visual: { kind: "none" },
      answer,
      input: "choices",
      choices,
      labels,
      hint: `When would you say "${w.pair.toLowerCase()}"? What are you checking?`,
      explain: `${w.pair} tells us its ${w.right}.`,
    };
  }
  const obj = pick(MEASURABLE);
  if (roll < 0.55) {
    // Two of the same thing at different sizes: what is different is something we can measure.
    const attr = obj.attrs[0];
    const sizes = shuffle([0.7, 1.4]);
    const { choices, labels, answer } = labelChoices(MEASURE_THEY[attr], shuffle(NOT_MEASURABLE_THEY).slice(0, 2), 3);
    return {
      key: `measurediff-${obj.n}-${sizes.join("-")}`,
      prompt: `How are these ${obj.many} different?`,
      speech: `Look at the two ${obj.many}. How are they different?`,
      visual: { kind: "pair", items: sizes.map((size) => ({ emoji: obj.e, label: obj.n, size })) },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "They are the same kind of thing. What could you check with a ruler, a scale, or by filling them?",
      explain: `They are different in ${MEASURE_THEY[attr]}. That's something we can measure!`,
    };
  }
  const attr = pick(obj.attrs);
  const { choices, labels, answer } = labelChoices(MEASURE_PHRASE[attr], shuffle(NOT_MEASURABLE).slice(0, 2), 3);
  return {
    key: `measure-${obj.n}-${attr}`,
    prompt: `What can we measure about a ${obj.e} ${obj.n}?`,
    speech: `What could we measure about ${an(obj.n)}?`,
    visual: { kind: "pair", items: [{ emoji: obj.e, label: obj.n, size: 1.2 }] },
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Could you check it with a ruler, a scale, or by filling it up?",
    explain: `We can measure ${MEASURE_PHRASE[attr]}. Colors and names can't be measured.`,
  };
}

/* ------------------------------------------------------------------- shapes */

const SHAPE_HINT: Partial<Record<ShapeName, string>> = {
  circle: "Is it round? Does it have any corners?",
  triangle: "Count its sides.",
  square: "Count its sides. Are they all the same length?",
  rectangle: "Count its sides. Are two long and two short?",
  hexagon: "Count its sides.",
  cube: "Look at its faces. What shape is each one?",
  sphere: "Is it round all over, like a ball?",
  cone: "Does it have a point on top and a circle at the bottom?",
  cylinder: "Does it look like a can, with a circle at each end?",
};

const SHAPE_FACT: Partial<Record<ShapeName, string>> = {
  circle: "It is round with no corners.",
  triangle: "It has 3 sides and 3 corners.",
  square: "It has 4 sides, all the same length.",
  rectangle: "It has 4 sides: 2 long and 2 short.",
  hexagon: "It has 6 sides.",
  cube: "Every face is a square, like a dice.",
  sphere: "It is round all over, like a ball.",
  cone: "It has a circle at the bottom and a point on top.",
  cylinder: "It has a circle at each end, like a can.",
};

const SHAPE_TURNS = [0, 0, 30, 45, 90, 135, 180, 210, 270, 315];
const SHAPE_SIZES = [0.5, 0.7, 0.85, 1, 1.2];

/** A random turn and size, so kids name shapes whatever their orientation or size. */
function shapeLook(shape: ShapeName) {
  const turn = shape === "circle" || shape === "sphere" ? 0 : pick(SHAPE_TURNS);
  const scale = pick(SHAPE_SIZES);
  return { turn, scale, tag: `${turn}-${scale}`, changed: turn !== 0 || scale !== 1 };
}

/** Name a flat or solid shape, or say whether it is a given shape — turned and resized. */
export function nameShape(pool: ShapeName[]): Question {
  const shape = pick(pool);
  const look = shapeLook(shape);
  const hint = SHAPE_HINT[shape] ?? "Count its sides and corners.";
  const fact = `${SHAPE_FACT[shape] ?? ""}${look.changed ? " Turned or not, big or small, it's the same shape." : ""}`;
  const visual = { kind: "shape" as const, shape, turn: look.turn, scale: look.scale };
  if (Math.random() < 0.4) {
    const asked = Math.random() < 0.5 ? shape : pick(pool.filter((s) => s !== shape));
    const yes = asked === shape;
    return {
      key: `isit-${shape}-${asked}-${look.tag}`,
      prompt: `Is this ${an(asked)}?`,
      speech: `Look at this shape. Is it ${an(asked)}?`,
      visual,
      needsVisual: true,
      answer: yes ? 0 : 1,
      input: "choices",
      choices: [0, 1],
      labels: YES_NO,
      hint,
      explain: yes ? `Yes! This is ${an(shape)}. ${fact}` : `No, this is ${an(shape)}. ${fact}`,
    };
  }
  const wrongs = shuffle(pool.filter((s) => s !== shape)).slice(0, 2);
  const { choices, labels, answer } = labelChoices(shape, wrongs, 3);
  const prompts = ["What shape is this?", "Name this shape!", "What is this shape called?"];
  if (look.turn !== 0) prompts.push("It's turned! What shape is it?");
  if (look.scale <= 0.7) prompts.push("A little shape! What is it?");
  if (look.scale >= 1.2) prompts.push("A big shape! What is it?");
  return {
    key: `shape-${shape}-${look.tag}`,
    prompt: pick(prompts),
    speech: "What shape is this?",
    visual,
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint,
    explain: `This is ${an(shape)}. ${fact}`,
  };
}

const ALL_FLAT: ShapeName[] = [
  "circle",
  "triangle",
  "square",
  "rectangle",
  "hexagon",
  "pentagon",
  "octagon",
  "rhombus",
  "trapezoid",
  "parallelogram",
];
const ALL_SOLID: ShapeName[] = ["cube", "sphere", "cone", "cylinder", "pyramid", "prism"];
const FLAT_SOLID_PAIRS: [ShapeName, ShapeName][] = [
  ["circle", "sphere"],
  ["square", "cube"],
  ["triangle", "cone"],
  ["triangle", "pyramid"],
  ["circle", "cylinder"],
  ["rectangle", "prism"],
  ["hexagon", "cube"],
];

/** Flat (2D) or solid (3D)? */
export function flatOrSolid(): Question {
  if (Math.random() < 0.35) {
    const [flat, solid] = pick(FLAT_SOLID_PAIRS);
    const askSolid = Math.random() < 0.5;
    const [right, wrong] = askSolid ? [solid, flat] : [flat, solid];
    const { choices, labels, answer } = labelChoices(right, [wrong], 2);
    return {
      key: `fspair-${flat}-${solid}-${askSolid ? "solid" : "flat"}`,
      prompt: askSolid ? "Which one is solid?" : "Which one is flat?",
      speech: askSolid ? "Which shape is solid, so you could pick it up?" : "Which shape is flat, like a drawing on paper?",
      visual: { kind: "shapes", shapes: shuffle([flat, solid]) },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Flat shapes lie on paper. Solid shapes you can hold, like a ball or a box.",
      explain: `The ${solid} is solid. The ${flat} is flat.`,
    };
  }
  const shape = pick([...ALL_FLAT, ...ALL_SOLID]);
  const flat = ALL_FLAT.includes(shape);
  return {
    key: `fs-${shape}`,
    prompt: pick(["Flat or solid?", "Is this shape flat or solid?"]),
    speech: "Is this shape flat, or is it solid?",
    visual: { kind: "shape", shape },
    needsVisual: true,
    answer: flat ? 0 : 1,
    input: "choices",
    choices: [0, 1],
    labels: ["flat", "solid"],
    hint: "Flat shapes lie on paper. Solid shapes you can hold, like a ball or a box.",
    explain: flat ? `${cap(an(shape))} is flat. It lies flat on paper.` : `${cap(an(shape))} is solid. You could pick it up.`,
  };
}

const REAL_SHAPES: [string, string, ShapeName][] = [
  ["🍕", "pizza slice", "triangle"],
  ["⛺", "tent", "triangle"],
  ["🥪", "sandwich", "triangle"],
  ["🚪", "door", "rectangle"],
  ["📱", "phone", "rectangle"],
  ["🍫", "chocolate bar", "rectangle"],
  ["🕐", "clock", "circle"],
  ["🍪", "cookie", "circle"],
  ["🍩", "donut", "circle"],
  ["🪟", "window", "square"],
  ["🧇", "waffle", "square"],
  ["🎲", "dice", "cube"],
  ["🧊", "ice cube", "cube"],
  ["🎁", "gift box", "cube"],
  ["⚽", "soccer ball", "sphere"],
  ["🌐", "globe", "sphere"],
  ["🏀", "basketball", "sphere"],
  ["🥫", "can", "cylinder"],
  ["🥁", "drum", "cylinder"],
  ["🕯️", "candle", "cylinder"],
  ["🍦", "ice cream cone", "cone"],
];

/** Shapes in the world: what shape is a pizza slice? */
export function shapesAround(): Question {
  const [emoji, name, shape] = pick(REAL_SHAPES);
  const family = K_FLAT.includes(shape) ? K_FLAT : K_SOLID;
  const sibling: Partial<Record<ShapeName, ShapeName>> = { square: "rectangle", rectangle: "square" };
  const wrongs = shuffle(family.filter((s) => s !== shape && s !== sibling[shape])).slice(0, 2);
  const { choices, labels, answer } = labelChoices(shape, wrongs, 3);
  const article = an(name).split(" ")[0];
  return {
    key: `real-${name}`,
    prompt: pick([`${cap(article)} ${emoji} ${name} looks like a…`, `What shape is ${article} ${emoji} ${name}?`]),
    speech: `What shape is ${an(name)}?`,
    visual: { kind: "none" },
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Trace it in the air with your finger. Is it round? Pointy? Does it have corners?",
    explain: `${cap(an(name))} looks like ${an(shape)}.`,
  };
}

const LANDMARKS: { e: string; n: string }[] = [
  { e: "📦", n: "box" },
  { e: "🌳", n: "tree" },
  { e: "🏠", n: "house" },
  { e: "🪑", n: "chair" },
  { e: "🚌", n: "bus" },
  { e: "⛺", n: "tent" },
];

type Position = "above" | "below" | "next to" | "in front of" | "behind";

/** Things in a row: what is between two of them? */
function betweenQuestion(): Question {
  const things: Thing[] = [];
  while (things.length < 4) {
    const t = nextThing();
    if (!things.some((o) => o.one === t.one)) things.push(t);
  }
  const y = rand(40, 60);
  const xs = [14, 38, 62, 86];
  const second = Math.random() < 0.5;
  const [left, middle, right] = second ? [things[1], things[2], things[3]] : [things[0], things[1], things[2]];
  const wrongs = shuffle(things.filter((t) => t !== middle)).slice(0, 2).map((t) => t.emoji);
  const { choices, labels, answer } = labelChoices(middle.emoji, wrongs, 3);
  return {
    key: `between-${things.map((t) => t.one).join(",")}-${second ? 2 : 1}`,
    prompt: `What is between the ${left.emoji} and the ${right.emoji}?`,
    speech: `What is between the ${left.one} and the ${right.one}?`,
    visual: { kind: "scene", items: things.map((t, i) => ({ emoji: t.emoji, x: xs[i], y })) },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Find both things. Look at what is in the middle.",
    explain: `The ${middle.one} is between the ${left.one} and the ${right.one}.`,
  };
}

/** Position words in a little scene: above, below, next to, in front of, behind, between. */
export function whereIsIt(): Question {
  if (Math.random() < 0.2) return betweenQuestion();
  const A = nextThing();
  const L = pick(LANDMARKS);
  const rel = pick<Position>(["above", "below", "next to", "in front of", "behind"]);
  const lx = rand(38, 62);
  const ly = rand(40, 60);
  let ax = lx;
  let ay = ly;
  switch (rel) {
    case "above":
      ay = ly - rand(28, 34);
      break;
    case "below":
      ay = ly + rand(28, 34);
      break;
    case "next to":
      ax = lx + pick([-1, 1]) * rand(25, 30);
      break;
    case "in front of":
      ax = lx + rand(-8, 8);
      ay = ly + 10;
      break;
    case "behind":
      ax = lx + rand(-8, 8);
      ay = ly - 8;
      break;
  }
  const depth = rel === "in front of" || rel === "behind" || (rel === "next to" && Math.random() < 0.5);
  const words: Position[] = depth ? ["in front of", "behind", "next to"] : ["above", "below", "next to"];
  const labels = words.map((w) => `${w} the ${L.e}`);
  const landmark = { emoji: L.e, x: lx, y: ly, size: 1.5, ...(rel === "in front of" ? { behind: true } : {}) };
  const thing = { emoji: A.emoji, x: ax, y: ay, size: 0.9, ...(rel === "behind" ? { behind: true } : {}) };
  return {
    key: `pos-${rel}-${A.one}-${L.n}-${ax},${ay}-${lx},${ly}`,
    prompt: `Where is the ${A.emoji}?`,
    speech: `Where is the ${A.one}? Is it ${words.slice(0, 2).join(", ")}, or ${words[2]} the ${L.n}?`,
    visual: { kind: "scene", items: rel === "behind" ? [thing, landmark] : [landmark, thing] },
    needsVisual: true,
    answer: words.indexOf(rel),
    input: "choices",
    choices: [0, 1, 2],
    labels,
    hint: depth
      ? "Is one of them partly hidden? The hidden one is behind."
      : "Is it higher up, lower down, or right beside it?",
    explain: `The ${A.one} is ${rel} the ${L.n}.`,
  };
}

const SIDES: [ShapeName, number][] = [
  ["triangle", 3],
  ["square", 4],
  ["rectangle", 4],
  ["pentagon", 5],
  ["hexagon", 6],
];
const ROLLS: ShapeName[] = ["sphere", "cylinder", "cone"];
const NO_ROLL: ShapeName[] = ["cube", "pyramid", "prism"];

/** Sides and corners; which has more corners; which can roll; equal sides. */
export function sidesAndCorners(): Question {
  const roll = Math.random();
  if (roll < 0.5) {
    const corners = Math.random() < 0.5;
    const circle = Math.random() < 0.1;
    const [shape, n] = circle ? (["circle", 0] as [ShapeName, number]) : pick(SIDES);
    const part = corners || circle ? "corners" : "sides";
    const look = shapeLook(shape);
    return {
      key: `${part}-${shape}-${look.tag}`,
      prompt: `How many ${part} does it have?`,
      speech: `How many ${part} does ${an(shape)} have?`,
      visual: { kind: "shape", shape, turn: look.turn, scale: look.scale },
      needsVisual: true,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 3, min: 0, max: 8, likely: [n + 1, n - 1] }),
      hint: part === "corners" ? "Touch each pointy corner as you count." : "Touch each straight side as you count. Go all the way around.",
      explain: n === 0 ? `A circle has no ${part} at all: 0!` : `${cap(an(shape))} has ${n} ${part}.`,
    };
  }
  if (roll < 0.75) {
    const [[a, na], [b, nb]] = (() => {
      for (;;) {
        const [p, q] = shuffle(SIDES);
        if (p[1] !== q[1]) return [p, q];
      }
    })();
    const more = na > nb ? a : b;
    const { choices, labels, answer } = labelChoices(more, [na > nb ? b : a], 2);
    return {
      key: `morecorners-${[a, b].sort().join("-")}`,
      prompt: "Which shape has more corners?",
      speech: `Which has more corners: the ${a} or the ${b}?`,
      visual: { kind: "shapes", shapes: [a, b] },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Count the corners on each shape.",
      explain: `The ${a} has ${na} corners. The ${b} has ${nb}.`,
    };
  }
  if (roll < 0.92) {
    const r = pick(ROLLS);
    const s = pick(NO_ROLL);
    const { choices, labels, answer } = labelChoices(r, [s], 2);
    return {
      key: `roll-${r}-${s}`,
      prompt: "Which one can roll?",
      speech: `Which one can roll: the ${r} or the ${s}?`,
      visual: { kind: "shapes", shapes: shuffle([r, s]) },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Curved parts roll. Flat faces and corners stop it rolling.",
      explain: `The ${r} has a curved side, so it can roll. The ${s} has only flat faces.`,
    };
  }
  const shapes = shuffle<ShapeName>(["square", "rectangle"]);
  const { choices, labels, answer } = labelChoices("square", ["rectangle"], 2);
  return {
    key: `equal-${shapes.join("-")}`,
    prompt: "Which has 4 sides all the same length?",
    speech: "Which shape has 4 sides that are all the same length?",
    visual: { kind: "shapes", shapes },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Look at the sides. Are they all the same length?",
    explain: "A square has 4 sides that are all the same length.",
  };
}

interface Combo {
  parts: ShapeName[];
  text: string;
  make: string;
  /** For shape results: the shape to draw when asking the reverse question. */
  shape?: ShapeName;
}

const SHAPE_COMBOS: Combo[] = [
  { parts: ["square", "square"], text: "2 squares", make: "rectangle", shape: "rectangle" },
  { parts: ["triangle", "triangle", "triangle", "triangle", "triangle", "triangle"], text: "6 triangles", make: "hexagon", shape: "hexagon" },
  { parts: ["trapezoid", "trapezoid"], text: "2 trapezoids", make: "hexagon", shape: "hexagon" },
  { parts: ["square", "square", "square", "square"], text: "4 squares", make: "big square", shape: "square" },
];

const PICTURE_COMBOS: Combo[] = [
  { parts: ["triangle", "square"], text: "a triangle and a square", make: "🏠 house", shape: "house" },
  { parts: ["circle", "circle", "circle"], text: "3 circles", make: "⛄ snowman" },
  { parts: ["rectangle", "circle", "circle"], text: "a rectangle and 2 circles", make: "🚗 car" },
  { parts: ["circle", "triangle"], text: "a circle and a triangle", make: "🍦 ice cream" },
];

/** Put shapes together: what do these pieces make, and which pieces make this? */
export function putTogether(): Question {
  const picture = Math.random() < 0.5;
  const reverse = Math.random() < 0.45;
  const pool = picture ? PICTURE_COMBOS : SHAPE_COMBOS;
  const combo = pick(pool);
  if (reverse) {
    // Wrong options always use circles (which can't make a straight-sided shape),
    // or for pictures, the pieces of a different picture.
    const wrongs = picture
      ? shuffle(PICTURE_COMBOS.filter((c) => c !== combo && c.text !== combo.text)).slice(0, 2).map((c) => c.text)
      : shuffle(["2 circles", "3 circles", "a circle and a square", "a circle and a triangle"]).slice(0, 2);
    const { choices, labels, answer } = labelChoices(combo.text, wrongs, 3);
    const target = picture ? `a ${combo.make}` : `${an(combo.make)}`;
    return {
      key: `compose-rev-${combo.make}-${combo.text}`,
      prompt: `Which pieces make ${target}?`,
      speech: `Which pieces could you put together to make ${picture ? `a ${combo.make.split(" ").slice(1).join(" ")}` : an(combo.make)}?`,
      visual: combo.shape ? { kind: "shape", shape: combo.shape } : { kind: "none" },
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Picture the outline. Which pieces could fit together that way?",
      explain: `${cap(combo.text)} can make ${target}.`,
    };
  }
  const wrongs = picture
    ? shuffle(PICTURE_COMBOS.filter((c) => c.make !== combo.make)).slice(0, 2).map((c) => c.make)
    : shuffle(["circle", "triangle", "square"].filter((s) => s !== combo.make && !combo.make.endsWith(s) && !combo.parts.includes(s as ShapeName))).slice(0, 2);
  const { choices, labels, answer } = labelChoices(combo.make, wrongs, 3);
  return {
    key: `compose-${combo.make}-${combo.text}`,
    prompt: picture ? "Put these together. What can you make?" : "Put these together. What shape can you make?",
    speech: `Slide these shapes together so the sides touch. What can you make?`,
    visual: { kind: "shapes", shapes: combo.parts },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Imagine sliding the pieces together so the sides touch.",
    explain: `${cap(combo.text)} can make ${picture ? `a ${combo.make}` : an(combo.make)}.`,
  };
}

/* --------------------------------------------------------------- counting on */

/** What comes next, within 10. */
export function nextTo10(): Question {
  const len = rand(2, 3);
  const start = rand(0, 10 - len);
  const seq = range(start, start + len - 1);
  const next = start + len;
  return {
    key: `next-${len}-${start}`,
    prompt: pick(["What comes next?", "Keep counting! What's next?", "What number comes next?"]),
    speech: `${seq.join(", ")}… what comes next?`,
    visual: { kind: "sequence", numbers: seq, next },
    needsVisual: true,
    answer: next,
    input: "choices",
    choices: makeChoices(next, { n: 3, min: 0, max: 11, likely: [next + 1, next - 1] }),
    hint: "Say the numbers out loud. What do you say next?",
    explain: `After ${next - 1} comes ${next}. It's 1 more!`,
  };
}

/** Just before, just after, and in between, on a 0–10 number line. */
export function beforeAfter(): Question {
  const form = pick(["after", "before", "between"] as const);
  const n = form === "after" ? rand(0, 9) : form === "before" ? rand(1, 10) : rand(1, 9);
  const target = form === "after" ? n + 1 : form === "before" ? n - 1 : n;
  const from = form === "between" ? n - 1 : n;
  const prompt =
    form === "after"
      ? pick([`What comes after ${n}?`, `What number is just after ${n}?`])
      : form === "before"
        ? pick([`What comes just before ${n}?`, `What number is right before ${n}?`])
        : `What number is between ${n - 1} and ${n + 1}?`;
  return {
    key: `ba-${form}-${n}`,
    prompt,
    speech: prompt,
    visual: { kind: "numberline", min: 0, max: 10, step: 1, labelStep: 1, from, to: target },
    answer: target,
    input: "choices",
    choices: makeChoices(target, {
      n: 3,
      min: 0,
      max: 10,
      likely: form === "after" ? [n - 1, n + 2] : form === "before" ? [n + 1, n - 2] : [n + 2, n - 2],
    }),
    hint:
      form === "after"
        ? `Count up from ${n}. What do you say next?`
        : form === "before"
          ? `Count up to ${n}. What did you say just before it?`
          : `Count from ${n - 1}. What do you say before ${n + 1}?`,
    explain:
      form === "after"
        ? `${n}, ${n + 1}! ${n + 1} comes right after ${n}.`
        : form === "before"
          ? `${n - 1}, ${n}! ${n - 1} comes just before ${n}.`
          : `${n - 1}, ${n}, ${n + 1}. ${n} is in the middle.`,
  };
}

/** Count on from any number up to 20. */
export function countOn20(): Question {
  const len = rand(3, 4);
  const start = rand(5, 20 - len);
  const seq = range(start, start + len - 1);
  const next = start + len;
  return {
    key: `on-${len}-${start}`,
    prompt: pick([`Start at ${start}. What comes next?`, "Keep counting! What's next?", `Count on from ${start}. What's next?`]),
    speech: `Start at ${start} and keep counting. ${seq.join(", ")}… what comes next?`,
    visual: { kind: "sequence", numbers: seq, next },
    needsVisual: true,
    answer: next,
    input: "choices",
    choices: makeChoices(next, { n: 4, min: 1, max: 21, likely: [next + 1, next - 1, next + 10] }),
    hint: `No need to start at 1! Start at ${start} and keep going.`,
    explain: `${seq.join(", ")}, ${next}!`,
  };
}

/** Write the number: count, then type the numeral (0–20). */
export function writeNumber(): Question {
  const thing = nextThing();
  if (Math.random() < 0.12) {
    const n = rand(1, 5);
    return {
      key: `write-zero-${n}-${thing.one}`,
      prompt: "All gone! Type how many are left.",
      speech: `${n} ${word(n, thing)}, and all of them go away. Type how many are left.`,
      visual: { kind: "takeaway", thing, total: n, gone: n },
      needsVisual: true,
      answer: 0,
      input: "keypad",
      hint: "Count only the ones still there. None? There's a number for that!",
      explain: "None are left. We write it like this: 0.",
    };
  }
  const n = rand(1, 20);
  const frame = Math.random() < 0.3;
  return {
    key: `write-${frame ? "frame" : thing.one}-${n}`,
    prompt: frame
      ? pick(["How many dots? Type the number.", "Count the dots. Write the number!"])
      : pick([`How many ${thing.many}? Type it!`, "Count them. Write the number!", "Type how many you see."]),
    speech: `Count the ${frame ? "dots" : thing.many}. Then type the number.`,
    visual: frame ? { kind: "tenframe", cells: cells(["a", n]) } : { kind: "objects", thing, count: n },
    needsVisual: true,
    answer: n,
    input: "keypad",
    hint: n > 10 ? "Count to 10 first, then count on. Teen numbers start with a 1." : "Touch each one as you count. Then find that number.",
    explain: `There ${isAre(n)} ${n}. We write it like this: ${n}.`,
  };
}

/** Count by tens to 100: sequences and ten-sticks. */
export function countByTens(): Question {
  if (Math.random() < 0.4) {
    const k = rand(1, 9);
    const n = k * 10;
    return {
      key: `tens-blocks-${k}`,
      prompt: pick(["Count the sticks by tens!", "Each stick is 10. How many?"]),
      speech: "Each stick is 10. Count them by tens. How many in all?",
      visual: { kind: "blocks", numbers: [n] },
      needsVisual: true,
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 3, min: 1, max: 100, likely: [k, n + 10, n - 10] }),
      hint: "Each stick is 10. Touch each one and count by tens.",
      explain: `${range(1, k)
        .map((i) => i * 10)
        .join(", ")}. That's ${n}!`,
    };
  }
  const len = rand(2, 3);
  const start = rand(0, 10 - len) * 10;
  const seq = range(0, len - 1).map((i) => start + i * 10);
  const next = start + len * 10;
  return {
    key: `tens-seq-${len}-${start}`,
    prompt: pick(["Count by tens! What's next?", "Jump by tens! What comes next?"]),
    speech: `Count by tens. ${seq.join(", ")}… what comes next?`,
    visual: { kind: "sequence", numbers: seq, next },
    needsVisual: true,
    answer: next,
    input: "choices",
    choices: makeChoices(next, { n: 3, min: 1, max: 100, likely: [next + 1, next - 1, next + 10] }),
    hint: "Each jump is 10 more. Say the tens out loud.",
    explain: `${seq[seq.length - 1]}, then ${next}. Counting by tens!`,
  };
}

/** Count by ones to 100 — on the hundred chart, crossing into new tens. */
export function countTo100(): Question {
  const decade = Math.random() < 0.4;
  const n = decade ? rand(2, 10) * 10 : rand(13, 100);
  const seq = [n - 3, n - 2, n - 1];
  const chart = Math.random() < 0.6;
  const newTen = n % 10 === 0;
  return {
    key: `ones-${chart ? "chart" : "seq"}-${n}`,
    prompt: chart
      ? pick(["What number goes in the ? box?", "Count on the chart! What's next?"])
      : pick(["What number comes next?", "Keep counting! What's next?"]),
    speech: `${seq.join(", ")}… what comes next?`,
    visual: chart ? { kind: "hundred", highlight: seq, ask: n } : { kind: "sequence", numbers: seq, next: n },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: 3, min: 1, max: 100, likely: newTen ? [n - 10, n + 10] : [n + 1, n + 10] }),
    hint: newTen ? `After ${n - 1} we start a new ten.` : "Say the numbers out loud. What do you say next?",
    explain: newTen ? `After ${n - 1} comes ${n}. A new ten!` : `After ${n - 1} comes ${n}.`,
  };
}

/* ---------------------------------------------------- adding & taking away */

const NAMES = ["Mia", "Leo", "Ava", "Sam", "Zoe", "Max", "Ivy", "Ben", "Nia", "Raj"];

/** Story problems within 10 with a picture: get more, join, go away, give away. */
export function storyProblem(): Question {
  const thing = nextThing();
  const name = pick(NAMES);
  const kind = pick(["get", "join", "leave", "give"] as const);
  if (kind === "get" || kind === "join") {
    const a = rand(1, 8);
    const b = rand(1, 10 - a);
    const sum = a + b;
    return {
      key: `story-${kind}-${a}-${b}-${thing.one}`,
      prompt:
        kind === "get"
          ? `${name} has ${a} ${thing.emoji}. ${name} gets ${b} more. How many now?`
          : `${a} ${thing.emoji} here. ${b} more come. How many in all?`,
      speech:
        kind === "get"
          ? `${name} has ${a} ${word(a, thing)}. Then ${name} gets ${b} more. How many ${thing.many} does ${name} have now?`
          : `There ${isAre(a)} ${a} ${word(a, thing)}. ${b} more ${b === 1 ? "comes" : "come"} along. How many ${thing.many} are there in all?`,
      visual: { kind: "add", thing, a, b },
      answer: sum,
      input: "choices",
      choices: makeChoices(sum, { n: 3, min: 0, max: 10, likely: [sum - 1, sum + 1, Math.abs(a - b)] }),
      hint: "Act it out! Is the group getting bigger or smaller?",
      explain: `${a} and ${b} more make ${sum}. ${a} + ${b} = ${sum}.`,
    };
  }
  const total = rand(2, 10);
  const gone = rand(1, total - 1);
  const left = total - gone;
  return {
    key: `story-${kind}-${total}-${gone}-${thing.one}`,
    prompt:
      kind === "leave"
        ? `${total} ${thing.emoji}. ${gone} go away. How many are left?`
        : `${name} has ${total} ${thing.emoji} and gives away ${gone}. How many left?`,
    speech:
      kind === "leave"
        ? `There are ${total} ${word(total, thing)}. ${gone} ${gone === 1 ? "goes" : "go"} away. How many are left?`
        : `${name} has ${total} ${word(total, thing)}. ${name} gives ${gone} away. How many does ${name} have left?`,
    visual: { kind: "takeaway", thing, total, gone },
    answer: left,
    input: "choices",
    choices: makeChoices(left, { n: 3, min: 0, max: 10, likely: [total + gone, left + 1, gone] }),
    hint: "Act it out! Is the group getting bigger or smaller?",
    explain: `${total} take away ${gone} leaves ${left}. ${total} − ${gone} = ${left}.`,
  };
}

/** Which number sentence matches the picture? */
export function matchSentence(): Question {
  const thing = nextThing();
  if (Math.random() < 0.5) {
    const a = rand(1, 5);
    const b = rand(1, 5);
    const right = `${a} + ${b}`;
    const swapped = a >= b ? `${a} − ${b}` : `${b} − ${a}`;
    const off = Math.random() < 0.5 ? `${a} + ${b + 1}` : `${a + 1} + ${b}`;
    const { choices, labels, answer } = labelChoices(right, [swapped, off], 3);
    return {
      key: `match-add-${a}-${b}-${thing.one}`,
      prompt: pick(["Which matches the picture?", "Which number sentence fits?"]),
      speech: "Look at the picture. Which number sentence matches it?",
      visual: { kind: "add", thing, a, b },
      needsVisual: true,
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Are they being put together (+) or taken away (−)? Then count each part.",
      explain: `${a} ${word(a, thing)} and ${b} more: ${a} + ${b} = ${a + b}.`,
    };
  }
  const total = rand(2, 9);
  const gone = rand(1, total - 1);
  const right = `${total} − ${gone}`;
  const swapped = `${total} + ${gone}`;
  const off = total - gone !== gone ? `${total} − ${total - gone}` : `${total + 1} − ${gone}`;
  const { choices, labels, answer } = labelChoices(right, [swapped, off], 3);
  return {
    key: `match-sub-${total}-${gone}-${thing.one}`,
    prompt: pick(["Which matches the picture?", "Which number sentence fits?"]),
    speech: "Look at the picture. Which number sentence matches it?",
    visual: { kind: "takeaway", thing, total, gone },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Are they being put together (+) or taken away (−)? Then count each part.",
    explain: `${total} ${word(total, thing)}, and ${gone} ${gone === 1 ? "goes" : "go"} away: ${total} − ${gone} = ${total - gone}.`,
  };
}

/* ------------------------------------------------------------- number bonds */

/** Part-part-whole: find the missing part (or the whole) for wholes in range. */
export function bond(minWhole: number, maxWhole: number): Question {
  const whole = rand(minWhole, maxWhole);
  const a = rand(1, whole - 1);
  const b = whole - a;
  const form = pick(["right", "left", "right", "left", "whole"] as const);
  if (form === "whole") {
    const eq: Token[] = ["?", "=", a, "+", b];
    return {
      key: `bond-whole-${a}-${b}`,
      prompt: pick(["What's the whole?", `${a} and ${b} make…?`]),
      speech: `${a} and ${b}. What do they make together?`,
      equation: eq,
      visual: { kind: "bond", whole: "?", parts: [a, b] },
      answer: whole,
      input: "choices",
      choices: makeChoices(whole, { n: 3, min: 1, max: 10, likely: [whole + 1, whole - 1, Math.abs(a - b)] }),
      hint: `Start at ${a}. Count on ${b} more.`,
      explain: `${a} and ${b} make ${whole}. ${whole} = ${a} + ${b}.`,
    };
  }
  const known = form === "right" ? a : b;
  const missing = form === "right" ? b : a;
  const eq: Token[] = form === "right" ? [whole, "=", a, "+", "?"] : [whole, "=", "?", "+", b];
  return {
    key: `bond-${form}-${whole}-${a}`,
    prompt: pick(["What's the missing part?", `${whole} is ${known} and what?`, "Find the missing part!"]),
    speech: `${whole} is made of ${known} and what?`,
    equation: eq,
    visual: { kind: "bond", whole, parts: form === "right" ? [a, "?"] : ["?", b] },
    answer: missing,
    input: "choices",
    choices: makeChoices(missing, { n: 3, min: 0, max: 10, likely: [whole, missing + 1, missing - 1] }),
    hint: `Start at ${known}. Count up to ${whole}. How many did you count?`,
    explain: `${a} and ${b} make ${whole}. ${whole} = ${a} + ${b}.`,
  };
}

/** Which pair makes this number? (ways to break a number into two parts) */
export function waysToMake(): Question {
  const n = rand(3, 10);
  const a = rand(1, n - 1);
  const b = n - a;
  const candidates = shuffle<[number, number]>([
    [a, b + 1],
    [a, b - 1],
    [a + 1, b + 1],
    [a - 1, b],
    [a + 1, b],
  ]).filter(([x, y]) => x >= 0 && y >= 0 && x + y !== n);
  const wrongs = candidates.map(([x, y]) => `${x} + ${y}`);
  const { choices, labels, answer } = labelChoices(`${a} + ${b}`, wrongs, 3);
  return {
    key: `ways-${n}-${a}`,
    prompt: pick([`Which one makes ${n}?`, `Find a way to make ${n}!`, `Which two parts make ${n}?`]),
    speech: `Which pair of numbers makes ${n}?`,
    visual: { kind: "bond", whole: n, parts: ["?", "?"] },
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Check each pair: start at the first number and count on.",
    explain: `${a} and ${b} make ${n}. ${n} = ${a} + ${b}.`,
  };
}

/** Fast facts: add and subtract within 5. */
export function fastFive(): Question {
  const plus = Math.random() < 0.55;
  let a: number;
  let b: number;
  if (plus) {
    do {
      a = rand(0, 5);
      b = rand(0, 5 - a);
    } while (a + b === 0);
  } else {
    a = rand(1, 5);
    b = rand(0, a);
  }
  const op = plus ? "+" : "−";
  const ans = plus ? a + b : a - b;
  const eq: Token[] = [a, op, b, "=", "?"];
  return {
    key: `fast-${plus ? "add" : "sub"}-${a}-${b}`,
    prompt: pick(["Quick! What's the answer?", "Fast fact! Solve it.", `What is ${a} ${op} ${b}?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "none" },
    answer: ans,
    input: "choices",
    choices: makeChoices(ans, { n: 3, min: 0, max: 10, likely: [ans + 1, ans - 1, plus ? Math.abs(a - b) : a + b] }),
    hint:
      b === 0
        ? `${plus ? "Adding" : "Taking away"} 0 doesn't change anything!`
        : a === 0
          ? "Starting with 0 is the same as starting with nothing."
          : plus
            ? `Hold up ${fingers(a)}, then ${b} more.`
            : `Hold up ${fingers(a)}. Fold down ${b}.`,
    explain: `${a} ${op} ${b} = ${ans}`,
  };
}

/** Partners of 10: number bond and "which pair makes 10?". */
export function tenPartners(): Question {
  const a = rand(1, 9);
  const b = 10 - a;
  if (Math.random() < 0.5) {
    const eq: Token[] = [10, "=", a, "+", "?"];
    return {
      key: `tenbond-${a}`,
      prompt: pick([`${a} and what make 10?`, "What goes with it to make 10?"]),
      speech: `${a} and what make 10?`,
      equation: eq,
      visual: { kind: "bond", whole: 10, parts: [a, "?"] },
      answer: b,
      input: "choices",
      choices: makeChoices(b, { n: 3, min: 0, max: 10, likely: [b + 1, b - 1, a] }),
      hint: `Hold up ${fingers(a)}. How many fingers are still down?`,
      explain: `${a} and ${b} make 10. 10 = ${a} + ${b}.`,
    };
  }
  const { choices, labels, answer } = labelChoices(`${a} + ${b}`, [`${a} + ${b - 1}`, `${a} + ${b + 1}`], 3);
  return {
    key: `tenpair-${a}`,
    prompt: pick(["Which pair makes 10?", "Find a way to make 10!"]),
    speech: "Which pair of numbers makes 10?",
    visual: { kind: "bond", whole: 10, parts: ["?", "?"] },
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Start at the first number and count on. Do you land on 10?",
    explain: `${a} and ${b} make 10.`,
  };
}

/* ------------------------------------------------------------- teen numbers */

/** Two ten-frames: a full ten and some more. */
export function teenFrames(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  if (Math.random() < 0.55) {
    return {
      key: `tf-total-${n}`,
      prompt: pick(["How many dots?", "10 and some more. How many?", "A full ten and more! How many?"]),
      speech: `One full ten-frame and ${n} more. How many dots in all?`,
      visual: { kind: "tenframe", cells: cells(["a", 10], ["b", n]) },
      needsVisual: true,
      answer: t,
      input: "choices",
      choices: makeChoices(t, { n: 4, min: 1, max: 20, likely: [n, t + 1, t - 1] }),
      hint: "The full frame is 10. Count on from 10.",
      explain: `10 and ${n} more make ${t}.`,
    };
  }
  return {
    key: `tf-more-${n}`,
    prompt: pick([`That's ${t}. How many more than 10?`, `${t} is 10 and how many more?`]),
    speech: `This is ${t}. The first frame has 10. How many more are in the other frame?`,
    visual: { kind: "tenframe", cells: cells(["a", 10], ["target", n]) },
    needsVisual: true,
    answer: n,
    input: "choices",
    choices: makeChoices(n, { n: 4, min: 0, max: 20, likely: [t, n + 1, n - 1] }),
    hint: "The full frame is 10. Count the dots in the other frame.",
    explain: `${t} is 10 and ${n} more.`,
  };
}

/** Base-ten blocks: one ten stick and some ones. */
export function teenBlocks(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  const sum = Math.random() < 0.45;
  const eq: Token[] = [10, "+", n, "=", "?"];
  return {
    key: `tb-${sum ? "sum" : "read"}-${n}`,
    prompt: sum
      ? pick(["Ten and some ones! How many?", "Add the ten and the ones!"])
      : pick(["What number do the blocks show?", "1 ten and some ones. What number?"]),
    speech: sum ? `${sayEquation(eq)}?` : `One ten stick and ${n} ${n === 1 ? "one" : "ones"}. What number is that?`,
    equation: sum ? eq : undefined,
    visual: { kind: "blocks", numbers: sum ? [10, n] : [t] },
    needsVisual: !sum,
    answer: t,
    input: "choices",
    choices: makeChoices(t, { n: 4, min: 1, max: 20, likely: [n, n + 1, t + 1, t - 1] }),
    hint: "The long stick is 10. Start at 10 and count on the little cubes.",
    explain: sum ? `10 + ${n} = ${t}` : `1 ten and ${n} ${n === 1 ? "one" : "ones"} make ${t}.`,
  };
}

/** Teen number bonds: 16 = 10 + ?, ? = 10 + 6. */
export function teenBond(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  if (Math.random() < 0.55) {
    const eq: Token[] = [t, "=", 10, "+", "?"];
    return {
      key: `tbond-part-${n}`,
      prompt: pick([`${t} is 10 and what?`, "What's the missing part?"]),
      speech: `${t} is 10 and what?`,
      equation: eq,
      visual: { kind: "bond", whole: t, parts: [10, "?"] },
      answer: n,
      input: "choices",
      choices: makeChoices(n, { n: 3, min: 0, max: 20, likely: [t, n + 1, n - 1] }),
      hint: `Count up from 10 to ${t}. How many did you count?`,
      explain: `${t} = 10 + ${n}`,
    };
  }
  const eq: Token[] = ["?", "=", 10, "+", n];
  return {
    key: `tbond-whole-${n}`,
    prompt: pick([`10 and ${n} make…?`, "What's the whole?"]),
    speech: `10 and ${n}. What number do they make?`,
    equation: eq,
    visual: { kind: "bond", whole: "?", parts: [10, n] },
    answer: t,
    input: "choices",
    choices: makeChoices(t, { n: 3, min: 1, max: 20, likely: [n, t + 1, t - 1] }),
    hint: `Start at 10. Count on ${n} more.`,
    explain: `${t} = 10 + ${n}`,
  };
}

/** Match a teen number to "10 + ones" and back. */
export function teenMatch(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  if (Math.random() < 0.5) {
    const { choices, labels, answer } = labelChoices(`10 + ${n}`, [`1 + ${n}`, `10 + ${n === 9 ? 8 : n + 1}`], 3);
    return {
      key: `tm-split-${n}`,
      prompt: pick([`Which one makes ${t}?`, `Which is the same as ${t}?`]),
      speech: `Which one is the same as ${t}?`,
      visual: { kind: "none" },
      answer,
      input: "choices",
      choices,
      labels,
      hint: "Teen numbers are 10 and some more. Look at the ones.",
      explain: `${t} is 10 and ${n} more: 10 + ${n}.`,
    };
  }
  const eq: Token[] = [10, "+", n, "=", "?"];
  return {
    key: `tm-join-${n}`,
    prompt: pick([`What is 10 + ${n}?`, `10 and ${n} more is…?`]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "none" },
    answer: t,
    input: "choices",
    choices: makeChoices(t, { n: 3, min: 1, max: 20, likely: [n, n + 1, t + 1] }),
    hint: "Start at 10 and count on.",
    explain: `10 + ${n} = ${t}`,
  };
}

/* ============================================================ more lessons */
/*  Hands-on "Do it" activities, error-spotting, reverse questions, strategies. */

const boxWord = (n: number) => (n === 1 ? "box" : "boxes");

/* ----------------------------------------------------------------- counting */

/** Do it: count out a number on a ten-frame (from a numeral, or as many as a picture). */
export function showOnFrame(): Question {
  const n = rand(1, 10);
  if (Math.random() < 0.5) {
    const thing = nextThing();
    const layout = pick(["scatter", "line", "circle"] as const);
    return {
      key: `frame-pic-${n}-${layout}-${thing.one}`,
      prompt: `Count the ${thing.many}, then fill that many.`,
      speech: `Count the ${thing.many}. Then tap the ten-frame to show the same number.`,
      visual: { kind: "objects", thing, count: n, layout },
      needsVisual: true,
      answer: n,
      input: "activity",
      activity: { kind: "fillFrame", target: n, frames: 1 },
      hint: "Count the pictures first. Then fill one box for each one.",
      explain: `There ${isAre(n)} ${n} ${word(n, thing)}, so fill ${n} ${boxWord(n)}.`,
    };
  }
  return {
    key: `frame-num-${n}`,
    prompt: `Show ${n} on the ten-frame.`,
    speech: `Tap the boxes to show ${n}.`,
    visual: { kind: "none" },
    answer: n,
    input: "activity",
    activity: { kind: "fillFrame", target: n, frames: 1 },
    hint: "Count out loud as you tap. Stop when you say the number.",
    explain: n > 5 ? `Fill the top row of 5, then ${n - 5} more. That's ${n}.` : `Fill ${n} ${boxWord(n)} in the top row.`,
  };
}

/** Error-spotting: did they count right? */
export function countCheck(): Question {
  const n = rand(2, 10);
  const thing = nextThing();
  const right = Math.random() < 0.45;
  const said = right ? n : n + pick([-1, 1]);
  const name = pick(NAMES);
  const layout = pick(["rows", "line", "scatter", "circle"] as const);
  return {
    key: `check-${n}-${said}-${layout}-${thing.one}`,
    prompt: `${name} counted ${said} ${word(said, thing)}. Is that right?`,
    speech: `${name} counted the ${thing.many} and got ${said}. Is ${name} right?`,
    visual: { kind: "objects", thing, count: n, layout },
    needsVisual: true,
    answer: right ? 0 : 1,
    input: "choices",
    choices: [0, 1],
    labels: YES_NO,
    hint: "Count them yourself. Touch each one just once.",
    explain: right
      ? `Yes! There ${isAre(n)} ${n} ${word(n, thing)}.`
      : `No. There ${isAre(n)} ${n}, not ${said}. ${said > n ? "One was counted twice." : "One was skipped."}`,
  };
}

/** Do it: tap numbers in counting order, starting anywhere up to `max`. */
export function countInOrder(max: number): Question {
  const len = rand(3, 5);
  const start = rand(1, max - len + 1);
  const items = range(start, start + len - 1).map(String);
  return {
    key: `order-${start}-${len}`,
    prompt: pick(["Tap the numbers in counting order.", `Start at ${start}. Tap them in order.`]),
    speech: "Tap the numbers in counting order, from the first to the last.",
    visual: { kind: "none" },
    answer: len,
    input: "activity",
    activity: { kind: "order", items, direction: "counting order" },
    hint: "Find the smallest number first. Then say the next number and find it.",
    explain: `${items.join(", ")}. Each number is 1 more.`,
  };
}

/* ----------------------------------------------------------------- patterns */

/** Which part repeats? Find the core of a pattern. */
export function patternCore(): Question {
  const kind = pick(["AB", "AAB", "ABB", "ABC"] as const);
  const set = pick(PATTERN_SETS);
  const [a, b, c] = shuffle(set);
  const unit = { AB: [a, b], AAB: [a, a, b], ABB: [a, b, b], ABC: [a, b, c] }[kind];
  const row = [...unit, ...unit, ...unit].slice(0, Math.min(8, unit.length * 3));
  const core = unit.map((p) => p.e).join("");
  const rowText = row.map((p) => p.e);
  const wrongs = [
    rowText.slice(0, unit.length - 1).join(""),
    rowText.slice(0, unit.length + 1).join(""),
    unit.length === 2 ? `${a.e}${a.e}` : `${unit[0].e}${unit[1].e}${unit[1].e}${unit[2].e}`,
  ].filter((w) => w !== core && w.length > 0);
  const { choices, labels, answer } = labelChoices(core, wrongs, 3);
  const step = 84 / (row.length - 1);
  return {
    key: `core-${kind}-${core}`,
    prompt: pick(["Which part repeats?", "Find the part that repeats!"]),
    speech: `${row.map((p) => p.n).join(", ")}. Which part repeats again and again?`,
    visual: { kind: "scene", items: row.map((p, i) => ({ emoji: p.e, x: Math.round(8 + i * step), y: 50, size: 0.8 })) },
    needsVisual: true,
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Say the pattern out loud. Listen for where it starts again.",
    explain: `${core} repeats: ${core} ${core}…`,
  };
}

/** Do it: sort pictures into groups by kind. */
export function sortByKind(): Question {
  const binsCount = Math.random() < 0.35 ? 3 : 2;
  let groups: typeof GROUPS = [];
  do {
    groups = shuffle(GROUPS).slice(0, binsCount);
  } while (groups.some((g) => groups.some((o) => CLASH.has(`${g.name}|${o.name}`))));
  const perBin = binsCount === 3 ? 2 : rand(2, 3);
  const items = shuffle(
    groups.flatMap((g, bin) => shuffle(g.items).slice(0, perBin).map((label) => ({ label, bin }))),
  );
  return {
    key: `sortkind-${items.map((i) => i.label).join("")}`,
    prompt: binsCount === 2 ? `Sort them: ${groups[0].name} or ${groups[1].name}?` : "Sort each one into its group.",
    speech: `Put each picture in the right group: ${groups.map((g) => g.name).join(", or ")}.`,
    visual: { kind: "none" },
    answer: items.length,
    input: "activity",
    activity: { kind: "sort", bins: groups.map((g) => g.name), items },
    hint: "Tap a picture, then tap its group. Ask: what kind of thing is it?",
    explain: groups
      .map((g, bin) => `${items.filter((i) => i.bin === bin).map((i) => i.label).join(" ")} are ${g.name}.`)
      .join(" "),
  };
}

const COLOUR_GROUPS: { name: string; items: string[] }[] = [
  { name: "red", items: ["🍎", "🍓", "🚒", "❤️", "🌹", "🍒"] },
  { name: "yellow", items: ["🍌", "🌻", "🐤", "⭐", "🧀", "🍋"] },
  { name: "green", items: ["🐸", "🥦", "🍀", "🥒", "🌲", "🍏"] },
  { name: "blue", items: ["💙", "🐳", "💧", "🫐", "🔵", "🧊"] },
];

const FOODS = new Set(["🍎", "🍓", "🍒", "🍌", "🧀", "🍋", "🥦", "🥒", "🍏", "🫐"]);

/** Do it: sort pictures by colour. */
export function sortByColour(): Question {
  const binsCount = Math.random() < 0.35 ? 3 : 2;
  const groups = shuffle(COLOUR_GROUPS).slice(0, binsCount);
  const perBin = binsCount === 3 ? 2 : rand(2, 3);
  const items = shuffle(
    groups.flatMap((g, bin) => shuffle(g.items).slice(0, perBin).map((label) => ({ label, bin }))),
  );
  return {
    key: `sortcolour-${items.map((i) => i.label).join("")}`,
    prompt: groups.length === 2 ? `Sort by color: ${groups[0].name} or ${groups[1].name}.` : "Sort them by color.",
    speech: `Sort the pictures by color: ${groups.map((g) => g.name).join(", or ")}.`,
    visual: { kind: "none" },
    answer: items.length,
    input: "activity",
    activity: { kind: "sort", bins: groups.map((g) => g.name), items },
    hint: "Look only at the color. Tap a picture, then tap its color.",
    explain: groups.map((g, bin) => `${items.filter((i) => i.bin === bin).map((i) => i.label).join(" ")} are ${g.name}.`).join(" "),
  };
}

/** Reverse sorting: here are two groups — how were they sorted? */
export function sortRule(): Question {
  const byColour = Math.random() < 0.5;
  let left: string[];
  let right: string[];
  let rule: string;
  if (byColour) {
    // Each colour group mixes different kinds of things.
    const [g1, g2] = shuffle(COLOUR_GROUPS);
    const mixed = (g: { items: string[] }) =>
      shuffle([pick(g.items.filter((e) => FOODS.has(e))), ...shuffle(g.items.filter((e) => !FOODS.has(e))).slice(0, 2)]);
    left = mixed(g1);
    right = mixed(g2);
    rule = `by color: ${g1.name} and ${g2.name}`;
  } else {
    // Kind groups chosen so each group has mixed colours.
    let pair: typeof GROUPS;
    do {
      pair = shuffle(GROUPS.filter((g) => g.name !== "flowers")).slice(0, 2);
    } while (CLASH.has(`${pair[0].name}|${pair[1].name}`));
    left = shuffle(pair[0].items).slice(0, 3);
    right = shuffle(pair[1].items).slice(0, 3);
    rule = `by kind: ${pair[0].name} and ${pair[1].name}`;
  }
  const labels = ["by color", "by kind", "by size"];
  return {
    key: `rule-${left.join("")}-${right.join("")}`,
    prompt: `${left.join("")} | ${right.join("")}  How were they sorted?`,
    speech: "Look at the two groups. How were they sorted: by color, by kind, or by size?",
    visual: { kind: "none" },
    answer: byColour ? 0 : 1,
    input: "choices",
    choices: [0, 1, 2],
    labels,
    hint: "What is the same about everything in one group?",
    explain: `They were sorted ${rule}.`,
  };
}

/* ------------------------------------------------------------ more or less */

/** Estimate at a glance: more or fewer than 10? */
export function moreThanTen(): Question {
  const n = pick([...range(3, 7), ...range(13, 18)]);
  const thing = nextThing();
  const more = n > 10;
  return {
    key: `est10-${n}-${thing.one}`,
    prompt: "Quick look! More or fewer than 10?",
    speech: `Take a quick look at the ${thing.many}. Are there more than 10, or fewer than 10?`,
    visual: { kind: "objects", thing, count: n, layout: "scatter", flash: true },
    needsVisual: true,
    answer: more ? 1 : 0,
    input: "choices",
    choices: [0, 1],
    labels: ["fewer than 10", "more than 10"],
    hint: "10 is all the fingers on two hands. Did it look like more than that?",
    explain: `There were ${n}. That's ${more ? "more" : "fewer"} than 10.`,
  };
}

/** Error-spotting: is it true that a is more/less than b? */
export function compareCheck(): Question {
  const a = rand(1, 10);
  let b = rand(1, 10);
  while (b === a) b = rand(1, 10);
  const claim = pick(["more", "less"] as const);
  const truth = claim === "more" ? a > b : a < b;
  const name = pick(NAMES);
  return {
    key: `cmpcheck-${a}-${b}-${claim}`,
    prompt: `${name} says ${a} is ${claim} than ${b}. Right?`,
    speech: `${name} says ${a} is ${claim} than ${b}. Is ${name} right?`,
    visual: { kind: "none" },
    answer: truth ? 0 : 1,
    input: "choices",
    choices: [0, 1],
    labels: YES_NO,
    hint: "Count up from 1. The number you say later is more.",
    explain: truth ? `Yes! ${a} is ${claim} than ${b}.` : `No. ${a} is ${claim === "more" ? "less" : "more"} than ${b}.`,
  };
}

/** Do it: put numbers 1–10 in order. */
export function orderNumbers(): Question {
  const len = rand(3, 4);
  const nums = shuffle(range(1, 10)).slice(0, len).sort((x, y) => x - y);
  const up = Math.random() < 0.65;
  const items = (up ? nums : [...nums].reverse()).map(String);
  return {
    key: `ordernum-${up ? "up" : "down"}-${nums.join("-")}`,
    prompt: up ? "Tap them from smallest to biggest." : "Tap them from biggest to smallest.",
    speech: up ? "Tap the numbers from the smallest to the biggest." : "Tap the numbers from the biggest to the smallest.",
    visual: { kind: "none" },
    answer: len,
    input: "activity",
    activity: { kind: "order", items, direction: up ? "smallest to biggest" : "biggest to smallest" },
    hint: up ? "Which number do you say first when you count? Start with that one." : "Which number do you say last when you count? Start with that one.",
    explain: `${items.join(", ")}.`,
  };
}

/** Do it: put three things in order of height, weight or how much they hold. */
export function orderSizes(): Question {
  const s = rand(0, SCALES.length - 1);
  const scale = SCALES[s];
  let idx: number[] = [];
  do {
    idx = shuffle(range(0, scale.items.length - 1)).slice(0, 3).sort((x, y) => x - y);
  } while (idx[1] - idx[0] < scale.gap || idx[2] - idx[1] < scale.gap);
  const up = Math.random() < 0.6;
  const ordered = (up ? idx : [...idx].reverse()).map((k) => `${scale.items[k][0]} ${scale.items[k][1]}`);
  const [from, to] = up ? scale.ends : [scale.ends[1], scale.ends[0]];
  return {
    key: `ordersize-${s}-${idx.join("-")}-${up ? "up" : "down"}`,
    prompt: `Tap them from ${from} to ${to}.`,
    speech: `Put them in order, from ${from} to ${to}.`,
    visual: { kind: "none" },
    answer: 3,
    input: "activity",
    activity: { kind: "order", items: ordered, direction: `${from} to ${to}` },
    hint: `Find the ${from} one first. Then compare the other two.`,
    explain: `${ordered.join(", then ")}.`,
  };
}

/* ------------------------------------------------------------------- shapes */

const FLAT_ITEMS = ["🔺 triangle", "🟦 square", "🟡 circle", "🔷 diamond", "⭐ star", "🟥 square"];
const SOLID_ITEMS = ["⚽ ball", "🎲 dice", "🥫 can", "🍦 cone", "🧊 ice cube", "🎁 box", "🌐 globe"];

/** Do it: sort flat shapes and solid things. */
export function sortFlatSolid(): Question {
  const nf = rand(2, 4);
  const ns = rand(2, 4);
  const items = shuffle([
    ...shuffle(FLAT_ITEMS).slice(0, nf).map((label) => ({ label, bin: 0 })),
    ...shuffle(SOLID_ITEMS).slice(0, ns).map((label) => ({ label, bin: 1 })),
  ]);
  return {
    key: `sortfs-${items.map((i) => i.label).join(",")}`,
    prompt: "Sort them: flat or solid?",
    speech: "Sort each one. Is it a flat shape, or a solid you could hold?",
    visual: { kind: "none" },
    answer: items.length,
    input: "activity",
    activity: { kind: "sort", bins: ["flat", "solid"], items },
    hint: "Could you pick it up and hold it? Then it's solid. Flat shapes lie on paper.",
    explain: `Flat: ${items.filter((i) => i.bin === 0).map((i) => i.label).join(", ")}. Solid: ${items.filter((i) => i.bin === 1).map((i) => i.label).join(", ")}.`,
  };
}

const SIDE_BINS: { bin: string; items: string[] }[] = [
  { bin: "3 sides", items: ["small triangle", "big triangle", "tall triangle", "upside-down triangle"] },
  { bin: "4 sides", items: ["square", "long rectangle", "tall rectangle", "tilted square"] },
  { bin: "6 sides", items: ["hexagon", "big hexagon", "small hexagon"] },
  { bin: "round", items: ["circle", "big circle", "small circle"] },
];

/** Do it: sort shapes by how many sides they have (size and turn don't matter). */
export function sortBySides(): Question {
  const bins = shuffle(SIDE_BINS).slice(0, 3);
  const items = shuffle(
    bins.flatMap((b, bin) => shuffle(b.items).slice(0, rand(1, 2)).map((label) => ({ label, bin }))),
  );
  return {
    key: `sortsides-${items.map((i) => i.label).join(",")}`,
    prompt: "Sort the shapes by their sides.",
    speech: `Sort each shape: ${bins.map((b) => b.bin).join(", or ")}.`,
    visual: { kind: "none" },
    answer: items.length,
    input: "activity",
    activity: { kind: "sort", bins: bins.map((b) => b.bin), items },
    hint: "Big or small, turned or not, a shape keeps the same number of sides.",
    explain: bins.map((b, bin) => `${cap(b.bin)}: ${items.filter((i) => i.bin === bin).map((i) => i.label).join(", ")}.`).join(" "),
  };
}

const RIDDLES: [string, ShapeName][] = [
  ["I have 3 sides and 3 corners.", "triangle"],
  ["I have 4 sides, all the same.", "square"],
  ["I have 4 sides: 2 long, 2 short.", "rectangle"],
  ["I'm round, with no corners.", "circle"],
  ["I have 6 sides and 6 corners.", "hexagon"],
  ["I'm flat and round, like a cookie.", "circle"],
  ["I'm flat, with 3 pointy corners.", "triangle"],
  ["I'm solid and round, like a ball.", "sphere"],
  ["I'm solid. My faces are squares.", "cube"],
  ["I'm solid, with a point on top.", "cone"],
  ["I'm solid. I have a circle at each end.", "cylinder"],
  ["I can roll, and I have one point.", "cone"],
  ["I can't roll. I look like a dice.", "cube"],
  ["I roll every way, with no flat parts.", "sphere"],
];

/** Shape riddles: given the clues, name the shape. */
export function shapeRiddle(): Question {
  const i = rand(0, RIDDLES.length - 1);
  const [clue, shape] = RIDDLES[i];
  const family = K_FLAT.includes(shape) ? K_FLAT : K_SOLID;
  const sibling: Partial<Record<ShapeName, ShapeName>> = { square: "rectangle", rectangle: "square" };
  const wrongs = shuffle(family.filter((s) => s !== shape && s !== sibling[shape])).slice(0, 2);
  const { choices, labels, answer } = labelChoices(shape, wrongs, 3);
  return {
    key: `riddle-${i}`,
    prompt: `${clue} What am I?`,
    speech: `Here's a riddle. ${clue} What shape am I?`,
    visual: { kind: "none" },
    answer,
    input: "choices",
    choices,
    labels,
    hint: "Check each clue. Which shape fits all of them?",
    explain: `${cap(an(shape))}! ${SHAPE_FACT[shape] ?? ""}`,
  };
}

type DrawSpec = { id: string; name: string; prompt: string; tip: string; shape: Omit<Extract<Activity, { kind: "drawShape" }>, "kind" | "size"> };

const DRAWINGS: DrawSpec[] = [
  { id: "triangle", name: "triangle", prompt: "Draw a triangle.", tip: "A triangle has 3 corners.", shape: { sides: 3 } },
  { id: "pointy-triangle", name: "triangle", prompt: "Draw a triangle with no square corners.", tip: "Make every corner pointy or wide, not like a page corner.", shape: { sides: 3, rightAngles: 0 } },
  { id: "right-triangle", name: "triangle", prompt: "Draw a triangle with a square corner.", tip: "Make one corner like the corner of a page.", shape: { sides: 3, rightAngles: 1 } },
  { id: "square", name: "square", prompt: "Draw a square.", tip: "4 sides all the same, and 4 square corners.", shape: { sides: 4, rightAngles: 4, equalSides: true } },
  { id: "square-1", name: "square", prompt: "Draw a tiny square: sides 1 jump long.", tip: "A jump goes from one dot to the next.", shape: { sides: 4, rightAngles: 4, equalSides: true, area: 1 } },
  { id: "square-2", name: "square", prompt: "Draw a square with sides 2 jumps long.", tip: "A jump goes from one dot to the next.", shape: { sides: 4, rightAngles: 4, equalSides: true, area: 4 } },
  { id: "square-3", name: "square", prompt: "Draw a big square: sides 3 jumps long.", tip: "A jump goes from one dot to the next.", shape: { sides: 4, rightAngles: 4, equalSides: true, area: 9 } },
  { id: "rectangle", name: "rectangle", prompt: "Draw a rectangle.", tip: "4 sides and 4 square corners.", shape: { sides: 4, rightAngles: 4 } },
  { id: "rect-4x1", name: "rectangle", prompt: "Draw a rectangle 4 jumps long, 1 jump tall.", tip: "Go 4 dots across and 1 dot down.", shape: { sides: 4, rightAngles: 4, area: 4, perimeter: 10 } },
  { id: "rect-3x2", name: "rectangle", prompt: "Draw a rectangle 3 jumps long, 2 jumps tall.", tip: "Go 3 dots across and 2 dots down.", shape: { sides: 4, rightAngles: 4, area: 6, perimeter: 10 } },
  { id: "four", name: "shape with 4 sides", prompt: "Draw any shape with 4 sides.", tip: "Tap 4 corners.", shape: { sides: 4 } },
  { id: "five", name: "shape with 5 sides", prompt: "Draw a shape with 5 sides.", tip: "Tap 5 corners.", shape: { sides: 5 } },
  { id: "hexagon", name: "hexagon", prompt: "Draw a hexagon: 6 sides.", tip: "Tap 6 corners.", shape: { sides: 6 } },
];

/** Do it: draw shapes on a dot grid (K.G.B.5). */
export function drawShapes(): Question {
  const d = pick(DRAWINGS);
  return {
    key: `draw-${d.id}`,
    prompt: d.prompt,
    speech: `${d.prompt} Tap the dots for the corners, then tap the first dot again to close it.`,
    visual: { kind: "none" },
    answer: d.shape.sides,
    input: "activity",
    activity: { kind: "drawShape", size: 6, ...d.shape },
    hint: `${d.tip} Tap the first dot again to close your shape.`,
    explain: d.name.startsWith("shape")
      ? `Any closed shape with ${d.shape.sides} straight sides works. It has ${d.shape.sides} corners too.`
      : `${cap(an(d.name))} has ${d.shape.sides} sides${d.shape.rightAngles === 4 ? " and 4 square corners" : ""}.`,
  };
}

/* --------------------------------------------------------------- counting on */

/** Do it: put the marker on a number on a 0–10 or 0–20 line. */
export function findOnLine(): Question {
  const long = Math.random() < 0.5;
  const max = long ? 20 : 10;
  const target = rand(1, max - 1);
  const labelStep = long ? 10 : 5;
  return {
    key: `line-${max}-${target}`,
    prompt: `Put the marker on ${target}.`,
    speech: `Drag the marker to ${target} on the number line.`,
    visual: { kind: "none" },
    answer: target,
    input: "activity",
    activity: { kind: "placeOnLine", min: 0, max, step: 1, labelStep, target },
    hint: "Start at the closest number you can see. Count the little marks from there.",
    explain:
      target % labelStep === 0
        ? `${target} is right on a label.`
        : `${target} is ${target % labelStep} ${target % labelStep === 1 ? "step" : "steps"} after ${target - (target % labelStep)}.`,
  };
}

/** Which number is missing in the counting? (ones to 20, ones to 100, and tens) */
export function missingInCount(): Question {
  const form = pick(["teens", "hundred", "tens"] as const);
  const step = form === "tens" ? 10 : 1;
  const start =
    form === "teens" ? rand(1, 17) : form === "tens" ? rand(1, 7) * 10 : rand(2, 9) * 10 - rand(1, 3);
  const nums = range(0, 3).map((i) => start + i * step);
  const hide = rand(1, 2);
  const missing = nums[hide];
  const shown = nums.map((v, i) => (i === hide ? "?" : String(v))).join(", ");
  return {
    key: `missing-${form}-${start}-${hide}`,
    prompt: `${shown}. What's missing?`,
    speech: `${nums.map((v, i) => (i === hide ? "what" : String(v))).join(", ")}. Which number is missing?`,
    visual: { kind: "none" },
    answer: missing,
    input: "choices",
    choices: makeChoices(missing, { n: 3, min: 0, max: 100, likely: step === 10 ? [missing + 1, missing + 10] : [missing + 1, missing + 10] }),
    hint: step === 10 ? "These count by tens. Say the tens out loud." : "Count from the first number. Say each one out loud.",
    explain: `${nums.join(", ")}.`,
  };
}

/** Do it: tap numbers to 100 in counting order (across a new ten, or by tens). */
export function orderTo100(): Question {
  const tens = Math.random() < 0.3;
  const len = 4;
  const start = tens ? rand(1, 7) * 10 : rand(2, 10) * 10 - rand(1, 3);
  const items = range(0, len - 1).map((i) => String(start + i * (tens ? 10 : 1)));
  return {
    key: `order100-${tens ? "tens" : "ones"}-${start}`,
    prompt: tens ? "Tap them in order, counting by tens." : "Tap the numbers in counting order.",
    speech: tens ? "Count by tens. Tap the numbers in order." : "Tap the numbers in counting order.",
    visual: { kind: "none" },
    answer: len,
    input: "activity",
    activity: { kind: "order", items, direction: "counting order" },
    hint: tens ? "Each one is 10 more than the one before." : "After a 9 in the ones place, a new ten starts.",
    explain: `${items.join(", ")}.`,
  };
}

/* ---------------------------------------------------- adding & taking away */

/** Strategy: + 0, + 1, − 0, − 1. */
export function plusZeroOne(): Question {
  const form = pick(["+1", "+0", "−1", "−0"] as const);
  const n = rand(1, 9);
  const plus = form[0] === "+";
  const k = form[1] === "1" ? 1 : 0;
  const result = plus ? n + k : n - k;
  const op = plus ? "+" : "−";
  const eq: Token[] = [n, op, k, "=", "?"];
  const visual =
    form === "+1"
      ? { kind: "tenframe" as const, cells: cells(["a", n], ["b", 1]) }
      : form === "−1"
        ? { kind: "tenframe" as const, cells: cells(["a", n - 1], ["gone", 1]) }
        : { kind: "tenframe" as const, cells: cells(["a", n]) };
  return {
    key: `zeroone-${form}-${n}`,
    prompt: `What is ${n} ${op} ${k}?`,
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual,
    answer: result,
    input: "choices",
    choices: makeChoices(result, { n: 3, min: 0, max: 10, likely: [result + 1, result - 1, n] }),
    hint:
      k === 0
        ? `${plus ? "Adding" : "Taking away"} 0 changes nothing!`
        : plus
          ? "Plus 1 is just the next number."
          : "Minus 1 is the number just before.",
    explain: `${n} ${op} ${k} = ${result}`,
  };
}

/** Do it: show a sum or a take-away on the ten-frame. */
export function showSumOnFrame(): Question {
  if (Math.random() < 0.55) {
    const a = rand(1, 8);
    const b = rand(1, 10 - a);
    const eq: Token[] = [a, "+", b, "=", "?"];
    return {
      key: `framesum-add-${a}-${b}`,
      prompt: `Show ${a} + ${b} on the ten-frame.`,
      speech: `Show ${a} plus ${b} on the ten-frame.`,
      equation: eq,
      visual: { kind: "none" },
      answer: a + b,
      input: "activity",
      activity: { kind: "fillFrame", target: a + b, frames: 1 },
      hint: `Fill ${a} ${boxWord(a)}. Then fill ${b} more.`,
      explain: `${a} and ${b} more fill ${a + b} boxes. ${a} + ${b} = ${a + b}.`,
    };
  }
  const total = rand(3, 10);
  const gone = rand(1, total - 1);
  const eq: Token[] = [total, "−", gone, "=", "?"];
  return {
    key: `framesum-sub-${total}-${gone}`,
    prompt: `Show ${total} − ${gone} on the ten-frame.`,
    speech: `Show ${total} take away ${gone} on the ten-frame.`,
    equation: eq,
    visual: { kind: "none" },
    answer: total - gone,
    input: "activity",
    activity: { kind: "fillFrame", target: total - gone, frames: 1 },
    hint: `Fill ${total} ${boxWord(total)}. Then tap ${gone} to take ${gone === 1 ? "it" : "them"} away.`,
    explain: `${total} take away ${gone} leaves ${total - gone} boxes filled. ${total} − ${gone} = ${total - gone}.`,
  };
}

/** Error-spotting: does the answer make sense? */
export function makesSense(): Question {
  const thing = nextThing();
  const name = pick(NAMES);
  const add = Math.random() < 0.5;
  const a = add ? rand(1, 7) : rand(3, 10);
  const b = add ? rand(1, Math.min(5, 10 - a)) : rand(1, a - 1);
  const real = add ? a + b : a - b;
  const kind = pick(["right", "right", "off", "flip"] as const);
  const flip = add ? Math.abs(a - b) : a + b;
  const said = kind === "right" ? real : kind === "flip" && flip !== real ? flip : real + pick([-1, 1]);
  const right = said === real;
  return {
    key: `sense-${add ? "add" : "sub"}-${a}-${b}-${said}-${thing.one}`,
    prompt: add
      ? `${a} ${thing.emoji} and ${b} more. ${name} says ${said}. Right?`
      : `${a} ${thing.emoji}, ${b} go away. ${name} says ${said}. Right?`,
    speech: add
      ? `There are ${a} ${word(a, thing)}, and ${b} more come. ${name} says there are ${said} now. Is that right?`
      : `There are ${a} ${word(a, thing)}, and ${b} go away. ${name} says there are ${said} left. Is that right?`,
    visual: add ? { kind: "add", thing, a, b } : { kind: "takeaway", thing, total: a, gone: b },
    answer: right ? 0 : 1,
    input: "choices",
    choices: [0, 1],
    labels: YES_NO,
    hint: add
      ? "More came, so there should be more than before. Count them all."
      : "Some went away, so there should be fewer than before. Count what's left.",
    explain: right
      ? `Yes! ${a} ${add ? "+" : "−"} ${b} = ${real}.`
      : `No. ${a} ${add ? "+" : "−"} ${b} = ${real}, not ${said}.${(add && said < a) || (!add && said > a) ? ` The group got ${add ? "bigger" : "smaller"}!` : ""}`,
  };
}

/** Reverse: which story matches the number sentence? */
export function storyForSentence(): Question {
  const thing = nextThing();
  const add = Math.random() < 0.5;
  const a = add ? rand(1, 6) : rand(3, 9);
  const b = add ? rand(1, 4) : rand(1, a - 1);
  const join = (x: number, y: number) => `${x} ${thing.emoji}, then ${y} more ${y === 1 ? "comes" : "come"}`;
  const leave = (x: number, y: number) => `${x} ${thing.emoji}, then ${y} ${y === 1 ? "goes" : "go"} away`;
  const right = add ? join(a, b) : leave(a, b);
  const wrongs = add ? [leave(a, b), join(a + 1, b)] : [join(a, b), leave(a, b + 1 < a ? b + 1 : b - 1)];
  const { choices, labels, answer } = labelChoices(right, wrongs, 3);
  const op = add ? "+" : "−";
  return {
    key: `storyfor-${add ? "add" : "sub"}-${a}-${b}-${thing.one}`,
    prompt: `Which story is ${a} ${op} ${b}?`,
    speech: `Which story goes with ${a} ${add ? "plus" : "minus"} ${b}?`,
    visual: { kind: "none" },
    answer,
    input: "choices",
    choices,
    labels,
    hint: `${add ? "Plus means more come." : "Minus means some go away."} Then check the numbers.`,
    explain: `${a} ${op} ${b}: start with ${a}, then ${b} ${add ? (b === 1 ? "more comes" : "more come") : b === 1 ? "goes away" : "go away"}.`,
  };
}

const ADD_BITS: { e: string; one: string; many: string }[] = [
  { e: "🐸", one: "more hops in", many: "more hop in" },
  { e: "🐦", one: "more flies in", many: "more fly in" },
  { e: "🐟", one: "more swims over", many: "more swim over" },
  { e: "🐤", one: "more joins", many: "more join" },
  { e: "🌼", one: "more grows", many: "more grow" },
  { e: "🧁", one: "more is baked", many: "more are baked" },
];
const TAKE_BITS: { e: string; one: string; many: string }[] = [
  { e: "🎈", one: "pops", many: "pop" },
  { e: "🍪", one: "gets eaten", many: "get eaten" },
  { e: "🦋", one: "flies off", many: "fly off" },
  { e: "🐢", one: "walks away", many: "walk away" },
  { e: "⚽", one: "rolls away", many: "roll away" },
  { e: "🐝", one: "buzzes off", many: "buzz off" },
];

/** Do it: sort little stories into "add" and "take away". */
export function sortPlusMinus(): Question {
  const story = (b: { e: string; one: string; many: string }, bin: number) => {
    const n = rand(1, 4);
    return { label: `${b.e} ${n} ${n === 1 ? b.one : b.many}`, bin };
  };
  const adds = shuffle(ADD_BITS).slice(0, rand(2, 3)).map((b) => story(b, 0));
  const subs = shuffle(TAKE_BITS).slice(0, rand(2, 3)).map((b) => story(b, 1));
  const items = shuffle([...adds, ...subs]);
  return {
    key: `sortpm-${items.map((i) => i.label).join(",")}`,
    prompt: "Sort the stories: add or take away?",
    speech: "Sort each little story. Do we add, or take away?",
    visual: { kind: "none" },
    answer: items.length,
    input: "activity",
    activity: { kind: "sort", bins: ["add (+)", "take away (−)"], items },
    hint: "If more come, we add. If some go, we take away.",
    explain: `Add: ${adds.map((i) => i.label).join(", ")}. Take away: ${subs.map((i) => i.label).join(", ")}.`,
  };
}

/* ------------------------------------------------------------- number bonds */

/** Hiding game: some are showing, some are hiding. */
export function hidingGame(): Question {
  const total = rand(3, 10);
  const shown = rand(1, total - 1);
  const hidden = total - shown;
  const eq: Token[] = [total, "=", shown, "+", "?"];
  return {
    key: `hide-${total}-${shown}`,
    prompt: `${total} in all. ${shown} are showing. How many hide?`,
    speech: `There are ${total} in all. ${shown} are showing. How many are hiding?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", shown], ["target", hidden]) },
    answer: hidden,
    input: "choices",
    choices: makeChoices(hidden, { n: 3, min: 0, max: 10, likely: [hidden + 1, hidden - 1, total] }),
    hint: `Start at ${shown}. Count up to ${total}.`,
    explain: `${shown} and ${hidden} make ${total}. ${total} = ${shown} + ${hidden}.`,
  };
}

/** Fluency within 5: missing numbers. */
export function fastFiveMissing(): Question {
  const form = pick(["a+?", "?+b", "a−?"] as const);
  const total = rand(1, 5);
  const part = rand(0, total);
  const other = total - part;
  const eq: Token[] = form === "a+?" ? [part, "+", "?", "=", total] : form === "?+b" ? ["?", "+", part, "=", total] : [total, "−", "?", "=", part];
  return {
    key: `fastmiss-${form}-${total}-${part}`,
    prompt: pick(["Quick! What's missing?", "Find the missing number!"]),
    speech: `${sayEquation(eq)}?`,
    equation: eq,
    visual: { kind: "none" },
    answer: other,
    input: "choices",
    choices: makeChoices(other, { n: 3, min: 0, max: 5, likely: [other + 1, other - 1, total] }),
    hint: form === "a−?" ? `Hold up ${fingers(total)}. How many do you fold down to leave ${part}?` : `Hold up ${fingers(part)}. How many more make ${total}?`,
    explain: `${part} and ${other} make ${total}.`,
  };
}

/** Do it: sort pairs into "makes n" and "doesn't". */
export function sortMakes(): Question {
  const n = rand(4, 8);
  const goodA = shuffle(range(0, n)).slice(0, rand(2, 3));
  const good = goodA.map((a) => `${a} + ${n - a}`);
  const bad: string[] = [];
  const badCount = rand(2, 3);
  while (bad.length < badCount) {
    const a = rand(0, n);
    const b = n - a + pick([-1, 1]);
    const label = `${a} + ${b}`;
    if (b >= 0 && !bad.includes(label)) bad.push(label);
  }
  const items = shuffle([...good.map((label) => ({ label, bin: 0 })), ...bad.map((label) => ({ label, bin: 1 }))]);
  return {
    key: `sortmakes-${n}-${items.map((i) => i.label).join(",")}`,
    prompt: `Sort them: makes ${n}, or not?`,
    speech: `Sort each pair. Does it make ${n}, or not?`,
    visual: { kind: "none" },
    answer: items.length,
    input: "activity",
    activity: { kind: "sort", bins: [`makes ${n}`, `not ${n}`], items },
    hint: "Start at the first number and count on the second. Do you land on the number?",
    explain: `${good.join(", ")} all make ${n}.`,
  };
}

/** Error-spotting: is this number bond right? */
export function bondCheck(): Question {
  const whole = rand(3, 10);
  const a = rand(1, whole - 1);
  const right = Math.random() < 0.5;
  const b = right ? whole - a : whole - a + pick([-1, 1]);
  const ok = a + b === whole;
  return {
    key: `bondcheck-${whole}-${a}-${b}`,
    prompt: `Flare says ${whole} is ${a} and ${b}. Right?`,
    speech: `Flare says ${whole} is made of ${a} and ${b}. Is that right?`,
    visual: { kind: "bond", whole, parts: [a, b] },
    answer: ok ? 0 : 1,
    input: "choices",
    choices: [0, 1],
    labels: YES_NO,
    hint: `Start at ${a} and count on ${b}. Do you land on ${whole}?`,
    explain: ok ? `Yes! ${a} and ${b} make ${whole}.` : `No. ${a} and ${b} make ${a + b}. ${whole} is ${a} and ${whole - a}.`,
  };
}

/* ------------------------------------------------------------- teen numbers */

/** Do it: show a teen number on two ten-frames. */
export function fillTeenFrames(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  const split = Math.random() < 0.4;
  return {
    key: `teenfill-${split ? "split" : "num"}-${n}`,
    prompt: split ? `Show 10 and ${n} more.` : `Show ${t} on the ten-frames.`,
    speech: split ? `Fill the ten-frames to show 10 and ${n} more.` : `Fill the ten-frames to show ${t}.`,
    visual: { kind: "none" },
    answer: t,
    input: "activity",
    activity: { kind: "fillFrame", target: t, frames: 2 },
    hint: "Fill a whole frame first. That's 10. Then count on.",
    explain: `${t} is a full frame of 10 and ${n} more.`,
  };
}

/** Do it: build a teen number with a ten stick and ones. */
export function buildTeen(): Question {
  const t = rand(10, 20);
  const fewest = Math.random() < 0.6;
  return {
    key: `buildteen-${t}-${fewest ? "fewest" : "any"}`,
    prompt: fewest ? `Build ${t}. Use ten sticks where you can.` : `Build ${t} with blocks.`,
    speech: fewest ? `Build ${t}. Use a ten stick for each ten, then ones.` : `Build ${t} with the blocks.`,
    visual: { kind: "none" },
    answer: t,
    input: "activity",
    activity: { kind: "buildBlocks", target: t, fewest },
    hint: "A ten stick is 10 ones stuck together. Start with a ten, then add ones.",
    explain: t === 20 ? "20 is 2 tens." : t === 10 ? "10 is 1 ten and 0 ones." : `${t} is 1 ten and ${t - 10} ${t - 10 === 1 ? "one" : "ones"}.`,
  };
}

/** Do it: find a teen number on a number line. */
export function teenLine(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  const fromTen = Math.random() < 0.5;
  return {
    key: `teenline-${fromTen ? 10 : 0}-${n}`,
    prompt: `Put the marker on ${t}.`,
    speech: `Drag the marker to ${t}.`,
    visual: { kind: "none" },
    answer: t,
    input: "activity",
    activity: { kind: "placeOnLine", min: fromTen ? 10 : 0, max: 20, step: 1, labelStep: 5, target: t },
    hint: "Find 10. Then count on by ones.",
    explain: `${t} is ${n} ${n === 1 ? "step" : "steps"} past 10.`,
  };
}

/** Error-spotting: the "13 is 1 and 3" mix-up. */
export function teenCheck(): Question {
  const n = rand(1, 9);
  const t = 10 + n;
  const claim = pick(["right", "one", "off"] as const);
  const said = claim === "right" ? `10 and ${n}` : claim === "one" ? `1 and ${n}` : `10 and ${n === 9 ? 8 : n + 1}`;
  return {
    key: `teencheck-${n}-${claim}`,
    prompt: `Flare says ${t} is ${said}. Right?`,
    speech: `Flare says ${t} is ${said}. Is that right?`,
    visual: { kind: "none" },
    answer: claim === "right" ? 0 : 1,
    input: "choices",
    choices: [0, 1],
    labels: YES_NO,
    hint: "The 1 in a teen number means one ten. How many ones are there?",
    explain: claim === "right" ? `Yes! ${t} is 10 and ${n}.` : `No. ${t} is 10 and ${n}. The 1 stands for one ten.`,
  };
}

const TEN_PACKS: { e: string; short: string; whole: string; more: (n: number) => string }[] = [
  { e: "🥚", short: "10 in a box", whole: "A box holds 10 eggs.", more: (n) => `${n} more ${n === 1 ? "egg is" : "eggs are"} on the table.` },
  { e: "🖍️", short: "10 in a pack", whole: "A pack has 10 crayons.", more: (n) => `You have ${n} more.` },
  { e: "🧁", short: "10 on a tray", whole: "A tray holds 10 cupcakes.", more: (n) => `${n} more ${n === 1 ? "is" : "are"} on a plate.` },
  { e: "🖐️", short: "10 fingers", whole: "You have 10 fingers.", more: (n) => `A friend holds up ${n} more.` },
];

/** Real-life teen stories: a full ten and some more. */
export function teenStory(): Question {
  const i = rand(0, TEN_PACKS.length - 1);
  const pack = TEN_PACKS[i];
  const n = rand(1, 9);
  const t = 10 + n;
  const eq: Token[] = [10, "+", n, "=", "?"];
  return {
    key: `teenstory-${i}-${n}`,
    prompt: `${pack.e} ${pack.short}, and ${n} more. How many?`,
    speech: `${pack.whole} ${pack.more(n)} How many in all?`,
    equation: eq,
    visual: { kind: "tenframe", cells: cells(["a", 10], ["b", n]) },
    answer: t,
    input: "choices",
    choices: makeChoices(t, { n: 3, min: 1, max: 20, likely: [n, t + 1, t - 1] }),
    hint: "Start at 10 for the full set. Count on the extra ones.",
    explain: `10 and ${n} more make ${t}.`,
  };
}

/** Do it: trace a number 0–20 (writing numerals, K.CC.A.3). */
export function traceNumber(): Question {
  const n = rand(0, 20);
  const counted = n > 0 && Math.random() < 0.4;
  const thing = nextThing();
  const tip =
    n > 10 && n < 20
      ? "Teen numbers start with a 1 for one ten. Trace the 1, then the ones."
      : "Start at the top and trace slowly, without lifting your finger.";
  if (counted) {
    return {
      key: `trace-count-${n}-${thing.one}`,
      prompt: `Count the ${thing.many}. Trace the number.`,
      speech: `Count the ${thing.many}. Then trace the number that tells how many.`,
      visual: { kind: "objects", thing, count: n },
      needsVisual: true,
      answer: n,
      input: "activity",
      activity: { kind: "trace", text: String(n) },
      hint: tip,
      explain: `There ${isAre(n)} ${n} ${word(n, thing)}. We write it ${n}.`,
    };
  }
  return {
    key: `trace-${n}`,
    prompt: `Trace the number ${n}.`,
    speech: `Trace the number ${n} with your finger.`,
    visual: { kind: "none" },
    answer: n,
    input: "activity",
    activity: { kind: "trace", text: String(n) },
    hint: tip,
    explain: n === 0 ? "0 is a round loop. It means none." : `That's how we write ${n}.`,
  };
}
