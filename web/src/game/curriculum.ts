/**
 * The whole Wonderkind curriculum: math from counting (age 4) to calculus (age 18), then physics and
 * chemistry from Kindergarten to AP. Every world is in teaching order within its subject. Each age band
 * lives in its own file (math in ./levels, science in ./levels/physics and ./levels/chemistry); bands
 * are picked up from there, so the game runs with whichever bands exist.
 */
import type { Colour, Level, Subject, World } from "./types";

type BandModule = { WORLDS: World[]; NOT_COVERED: { code: string; why: string }[] };

const modules = import.meta.glob<BandModule>(["./levels/**/ages*.ts", "!./levels/**/*.gen.ts", "!./levels/**/*.test.ts"], { eager: true });

export const SUBJECTS: { id: Subject; name: string; symbol: string }[] = [
  { id: "math", name: "Math", symbol: "🔢" },
  { id: "physics", name: "Physics", symbol: "🧲" },
  { id: "chemistry", name: "Chemistry", symbol: "🧪" },
];

const BAND_INFO: { subject: Subject; file: string; id: string; label: string; grades: string }[] = [
  { subject: "math", file: "ages4to6", id: "4-6", label: "Ages 4–6", grades: "Pre-K and Kindergarten" },
  { subject: "math", file: "ages6to8", id: "6-8", label: "Ages 6–8", grades: "Grades 1 and 2" },
  { subject: "math", file: "ages8to10", id: "8-10", label: "Ages 8–10", grades: "Grades 3 and 4" },
  { subject: "math", file: "ages10to12", id: "10-12", label: "Ages 10–12", grades: "Grades 5, 6 and 7" },
  { subject: "math", file: "ages12to15", id: "12-15", label: "Ages 12–15", grades: "Grade 8 and Algebra 1" },
  { subject: "math", file: "ages14to17", id: "14-17", label: "Ages 14–17", grades: "Geometry, trigonometry and probability" },
  { subject: "math", file: "ages16to18", id: "16-18", label: "Ages 16–18", grades: "Calculus" },
  { subject: "physics", file: "physics/ages4to8", id: "phys-4-8", label: "Ages 4–8", grades: "Kindergarten to Grade 2" },
  { subject: "physics", file: "physics/ages8to11", id: "phys-8-11", label: "Ages 8–11", grades: "Grades 3 to 5" },
  { subject: "physics", file: "physics/ages11to14", id: "phys-11-14", label: "Ages 11–14", grades: "Middle school" },
  { subject: "physics", file: "physics/ages14to17", id: "phys-14-17", label: "Ages 14–17", grades: "High school physics" },
  { subject: "physics", file: "physics/ages16to18ap1", id: "phys-ap1", label: "AP Physics 1", grades: "Ages 16–18: mechanics, energy, momentum, rotation, fluids" },
  { subject: "physics", file: "physics/ages16to18ap2", id: "phys-ap2", label: "AP Physics 2", grades: "Ages 16–18: heat, electricity, magnetism, optics, modern physics" },
  { subject: "chemistry", file: "chemistry/ages5to8", id: "chem-5-8", label: "Ages 5–8", grades: "Kindergarten to Grade 2" },
  { subject: "chemistry", file: "chemistry/ages8to11", id: "chem-8-11", label: "Ages 8–11", grades: "Grades 3 to 5" },
  { subject: "chemistry", file: "chemistry/ages11to14", id: "chem-11-14", label: "Ages 11–14", grades: "Middle school" },
  { subject: "chemistry", file: "chemistry/ages14to17", id: "chem-14-17", label: "Ages 14–17", grades: "High school chemistry" },
  { subject: "chemistry", file: "chemistry/ages16to18ap1", id: "chem-ap1", label: "AP Chemistry: matter", grades: "Ages 16–18: atoms, bonding, mixtures, reactions, kinetics" },
  { subject: "chemistry", file: "chemistry/ages16to18ap2", id: "chem-ap2", label: "AP Chemistry: energy", grades: "Ages 16–18: thermochemistry, equilibrium, acids and bases, electrochemistry" },
];

const loaded = BAND_INFO.map((b) => ({ ...b, mod: modules[`./levels/${b.file}.ts`] })).filter((b) => b.mod);

export const BANDS = loaded.map(({ subject, id, label, grades, mod }) => ({
  subject,
  id,
  label,
  grades,
  worlds: mod!.WORLDS.map((w) => ({ ...w, subject })),
}));

const PALETTE: Colour[] = ["sun", "leaf", "berry", "wave", "grape", "teal", "tangerine", "rose", "cocoa", "lime", "night"];

/** Neighbouring worlds on the map never share a colour, even across age bands. */
function spreadColours(worlds: World[]): World[] {
  return worlds.map((w, i, all) => {
    const prev = i > 0 ? all[i - 1].color : undefined;
    if (w.color !== prev) return w;
    const next = all[i + 1]?.color;
    const color = PALETTE.find((c) => c !== prev && c !== next) ?? w.color;
    all[i] = { ...w, color };
    return all[i];
  });
}

/** Every world ends with a Challenge: questions mixed from all its lessons, for review. */
function withChallenge(world: World): World {
  if (world.levels.some((l) => l.challenge)) return world;
  const lessons = world.levels;
  const challenge: Level = {
    id: `${world.id}-challenge`,
    title: "Challenge: mix it up",
    make: () => lessons[Math.floor(Math.random() * lessons.length)].make(),
    standards: [...new Set(lessons.flatMap((l) => l.standards))],
    idea: `This lesson mixes everything from ${world.name}. Read each question carefully, then choose the way to solve it that fits best.`,
    challenge: true,
  };
  return { ...world, levels: [...lessons, challenge] };
}

export const WORLDS: World[] = spreadColours(BANDS.flatMap((b) => b.worlds)).map(withChallenge);

export const NOT_COVERED = loaded.flatMap((b) => b.mod!.NOT_COVERED);

/** Every band file is present (the full curriculum is installed). */
export const COMPLETE = loaded.length === BAND_INFO.length;

export const ALL_LEVELS = WORLDS.flatMap((world) => world.levels.map((level, index) => ({ world, level, index })));

export function findLevel(id: string) {
  return ALL_LEVELS.find((entry) => entry.level.id === id);
}

export function bandOf(world: World) {
  return BANDS.find((b) => b.worlds.some((w) => w.id === world.id))!;
}

/** The subject a world belongs to (math when unknown). */
export const subjectOf = (world: World): Subject => world.subject ?? "math";

/** The level after this one: next in the world, then the next world shown on the map. */
export function nextLevel(id: string, shown: World[] = WORLDS) {
  const order = shown.flatMap((world) => world.levels.map((level, index) => ({ world, level, index })));
  const i = order.findIndex((entry) => entry.level.id === id);
  return i >= 0 ? order[i + 1] : undefined;
}
