/**
 * The kid's buddy: one of the AI-Buddy friends (every look but the metal ball), in its own colour or
 * one the kid picks. Saved as "look:colour", e.g. "pip:own" or "flare:blue".
 */

export const BUDDY_LOOKS = [
  { id: "flare", name: "Flare", about: "a little flame" },
  { id: "pip", name: "Pip", about: "a puppy" },
  { id: "sprout", name: "Sprout", about: "a sprout" },
  { id: "kuro", name: "Kuro", about: "a black cat" },
  { id: "shroom", name: "Shroom", about: "a mushroom" },
  { id: "puff", name: "Puff", about: "a penguin" },
  { id: "bun", name: "Bun", about: "a bunny" },
  { id: "bloom", name: "Bloom", about: "a flower" },
  { id: "zee", name: "Zee", about: "an alien in a flying saucer" },
] as const;

export type BuddyLook = (typeof BUDDY_LOOKS)[number]["id"];

/** Colours to pick from; "own" keeps the buddy's own colour. */
export const BUDDY_HUES = {
  own: "",
  blue: "#3B9EFF",
  teal: "#22C3B0",
  green: "#2FCB72",
  purple: "#9B6BF2",
  pink: "#FF6FAE",
} as const;

export type BuddyHue = keyof typeof BUDDY_HUES;

export interface Buddy {
  look: BuddyLook;
  hue: BuddyHue;
}

const isLook = (s: string): s is BuddyLook => BUDDY_LOOKS.some((l) => l.id === s);
const isHue = (s: string): s is BuddyHue => s in BUDDY_HUES;

/** Reads a saved buddy; older saves (an emoji, or "flame-blue") become Flare. */
export function parseBuddy(saved: string | null | undefined): Buddy {
  const [look = "", hue = ""] = (saved ?? "").split(":");
  if (isLook(look)) return { look, hue: isHue(hue) ? hue : "own" };
  if (saved?.startsWith("flame-")) {
    const h = saved.slice(6);
    return { look: "flare", hue: isHue(h) ? h : "own" };
  }
  return { look: "flare", hue: "own" };
}

export const buddyKey = (b: Buddy) => `${b.look}:${b.hue}`;

let current: Buddy = { look: "flare", hue: "own" };

export const currentBuddy = () => current;

/** Called when the save changes, so every buddy on screen and every mention of it follows the kid's pick. */
export function setBuddy(saved: string | null | undefined) {
  current = parseBuddy(saved);
}

export const buddyName = (b: Buddy = current) => BUDDY_LOOKS.find((l) => l.id === b.look)!.name;

/** Lessons talk about Flare; this puts the kid's own buddy's name in instead. */
export const withBuddyName = (text: string) => (current.look === "flare" ? text : text.replace(/\bFlare\b/g, buddyName()));
