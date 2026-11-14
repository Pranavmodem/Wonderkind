import type { DrillConfig, FactStat } from "./drills";
import type { Difficulty } from "./questions";
import type { Subject, World } from "./types";

export type Rewards = "full" | "quiet" | "off";

/** What grown-ups control from the grown-ups area. */
export interface Settings {
  difficulty: Difficulty;
  /** full: stars and celebrations; quiet: stars, no fanfare or confetti; off: no stars at all. */
  rewards: Rewards;
  /** Open every level instead of unlocking them in order. */
  openAll: boolean;
  /** World ids hidden from the map. */
  hidden: string[];
  /** Read questions aloud. */
  voice: boolean;
  /** Name of the reading voice a grown-up picked; null uses the most natural one available. */
  voiceName: string | null;
  /** Night (dark), day (light), or follow the device. */
  theme: "auto" | "dark" | "light";
}

export interface Save {
  name: string;
  buddy: string | null;
  age: number | null;
  /** Best stars (1–3) per level id. Present means the level is finished. */
  stars: Record<string, number>;
  sound: boolean;
  lastLevel: string | null;
  settings: Settings;
  /** Question keys seen recently per level, so replays bring new questions. */
  recent: Record<string, string[]>;
  /** Speed drills: how each fact is going, best scores, and the last drill set up. */
  facts: Record<string, FactStat>;
  drillBests: Record<string, number>;
  lastDrill: DrillConfig | null;
  /** The subject shown on the map. */
  subject: Subject;
}

/** Kept from the game's first name (MathCan) so existing progress carries over. */
const KEY = "mathcan.save.v1";

export const DEFAULT_SETTINGS: Settings = { difficulty: "normal", rewards: "full", openAll: false, hidden: [], voice: true, voiceName: null, theme: "auto" };

export const EMPTY_SAVE: Save = {
  name: "",
  buddy: null,
  age: null,
  stars: {},
  sound: true,
  lastLevel: null,
  settings: DEFAULT_SETTINGS,
  recent: {},
  facts: {},
  drillBests: {},
  lastDrill: null,
  subject: "math",
};

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Save>;
      return { ...EMPTY_SAVE, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
    }
  } catch {
    // Private mode or blocked storage: play without saving.
  }
  return EMPTY_SAVE;
}

export function storeSave(save: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Ignore: progress just won't persist.
  }
}

export const LESSON_SIZE: Record<Difficulty, number> = { easier: 6, normal: 8, harder: 10 };

/** Stars come from first-try answers; finishing always earns one. */
export function starsFor(firstTry: number, total: number): 1 | 2 | 3 {
  const ratio = total ? firstTry / total : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

/** Within a world, a level opens once the one before it is finished (unless grown-ups opened them all). */
export function isUnlocked(save: Save, world: World, levelIndex: number): boolean {
  if (save.settings.openAll || levelIndex === 0) return true;
  return Boolean(save.stars[world.levels[levelIndex - 1].id]);
}

/** Stars across the lessons that exist now (older saves may name retired lessons). */
export function totalStars(save: Save, worlds: World[]): number {
  return worlds.reduce((sum, w) => sum + w.levels.reduce((t, l) => t + (save.stars[l.id] ?? 0), 0), 0);
}

export function visibleWorlds(save: Save, worlds: World[]): World[] {
  const shown = worlds.filter((w) => !save.settings.hidden.includes(w.id));
  return shown.length ? shown : worlds;
}

/**
 * The level to suggest next: carry on in the world played last; otherwise the
 * first unfinished level in a world made for the child's age; otherwise the
 * first unfinished level anywhere.
 */
export function suggestedLevel(save: Save, worlds: World[]): string {
  const shown = visibleWorlds(save, worlds);
  const firstOpen = (w: World) => w.levels.find((l) => !save.stars[l.id]);
  const last = shown.find((w) => w.levels.some((l) => l.id === save.lastLevel));
  const lastOpen = last && firstOpen(last);
  if (lastOpen) return lastOpen.id;
  if (save.age !== null) {
    const forAge = shown.filter((w) => save.age! <= w.ages[1]);
    for (const w of forAge) {
      const open = firstOpen(w);
      if (open) return open.id;
    }
  }
  for (const w of shown) {
    const open = firstOpen(w);
    if (open) return open.id;
  }
  return shown[0].levels[0].id;
}

/** Remember the questions a lesson used (newest last, capped). */
export function rememberSeen(save: Save, levelId: string, keys: string[]): Save {
  const kept = [...(save.recent[levelId] ?? []).filter((k) => !keys.includes(k)), ...keys].slice(-60);
  return { ...save, recent: { ...save.recent, [levelId]: kept } };
}
