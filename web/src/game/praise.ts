import type { Subject } from "./types";

/** Cheers that fit any lesson. Keep subject names out of these. */
const SHARED = ["You got it!", "Yes! That's right.", "Super!", "Brilliant!", "Nailed it!", "Wow, nice work!", "Spot on!", "That's it!", "Awesome!"];

/** What the buddy says after a right answer on the first try, by subject. */
export const PRAISE: Record<Subject, readonly string[]> = {
  math: [...SHARED, "Math star!"],
  physics: [...SHARED, "Physics star!"],
  chemistry: [...SHARED, "Chemistry star!"],
};
