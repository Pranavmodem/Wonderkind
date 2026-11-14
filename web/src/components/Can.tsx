import { useEffect, useRef, type CSSProperties } from "react";
import type { Hat } from "../game/types";
import { BUDDY_HUES, buddyName, currentBuddy, parseBuddy } from "../game/buddy";
import "../vendor/buddy.js";

/**
 * What Flare is doing. Each is one of Flare's states or expressions:
 * idle, ask (a new question: head tilt and "?"), think (working it out), listen (leans in while you
 * answer), happy, wink (a little streak), love (a big streak), proud, cheer (lesson finished),
 * surprised (a new best), oops (a miss), dizzy (lots of misses in a row), wave (hello), sleepy.
 * After a while with no taps Flare yawns and dozes off, and wakes up with a squish at the next tap.
 */
export type Mood =
  | "idle"
  | "ask"
  | "think"
  | "listen"
  | "happy"
  | "wink"
  | "love"
  | "proud"
  | "cheer"
  | "surprised"
  | "oops"
  | "dizzy"
  | "wave"
  | "sleepy";

interface Props {
  mood?: Mood;
  /** Kept for older callers (the world colour); Flare uses the kid's own colour. */
  color?: string;
  /** Stars caught so far, shown in a badge. */
  count?: number;
  size?: number;
  /** Changing this replays the mood's movement. */
  bump?: number;
  /** Kept for older callers; Flare doesn't wear hats. */
  hat?: Hat;
  /** Draw this buddy ("look:colour") instead of the kid's pick (the buddy picker). */
  buddy?: string;
  className?: string;
}

export { BUDDY_HUES, BUDDY_LOOKS, setBuddy } from "../game/buddy";

/* One animation loop drives every buddy on screen, and they all look toward the kid's finger. */
const live = new Set<PalInstance>();
let last = 0;
let running = false;
let paused = false;
function frame(now: number) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
  last = now;
  live.forEach((p) => p.tick(dt));
  if (live.size && !paused) requestAnimationFrame(frame);
  else {
    running = false;
    last = 0;
  }
}
function start() {
  if (running || paused) return;
  running = true;
  requestAnimationFrame(frame);
}
// Dev only: hold every Flare still (screenshot tools wait for a quiet page), then let them move again.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { flarePause: (on: boolean) => void }).flarePause = (on) => {
    paused = on;
    if (!on) start();
  };
}
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => live.forEach((p) => p.lookAt(e.clientX, e.clientY)), { passive: true });
}

/** What each mood looks like on Flare: a resting state, then an expression or a move on top. */
function play(p: PalInstance, mood: Mood) {
  const rest = (state: string) => p.setState(state);
  switch (mood) {
    case "idle":
      return rest("idle");
    case "ask":
      return rest("question");
    case "think":
      return rest("thinking");
    case "listen":
      return rest("listening");
    case "sleepy":
      return rest("sleeping");
    case "happy":
      rest("idle");
      return p.emote("happy");
    case "wink":
      rest("idle");
      return p.emote("wink");
    case "love":
      rest("idle");
      return p.emote("love");
    case "proud":
      rest("idle");
      return p.emote("proud");
    case "surprised":
      rest("idle");
      return p.emote("surprised");
    case "cheer":
      rest("idle");
      p.hold("finished", 3500);
      return p.emote("proud");
    case "oops":
      rest("idle");
      return p.hold("error", 1400);
    case "dizzy":
      rest("idle");
      return p.hold("dizzy", 2600);
    case "wave":
      rest("idle");
      p.move("hop");
      return p.emote("happy");
  }
}

/* Dozing: no taps or keys for a while and every calm Flare yawns, then sleeps; any tap wakes them. */
const NAP_AFTER = 45_000;
const moods = new Map<PalInstance, Mood>();
let lastInput = Date.now();
let napping = false;
if (typeof window !== "undefined") {
  const wake = () => {
    lastInput = Date.now();
    if (!napping) return;
    napping = false;
    live.forEach((p) => {
      play(p, moods.get(p) ?? "idle");
      p.emote("boop");
    });
  };
  window.addEventListener("pointerdown", wake, { passive: true });
  window.addEventListener("keydown", wake);
  window.setInterval(() => {
    if (napping || Date.now() - lastInput < NAP_AFTER) return;
    napping = true;
    live.forEach((p) => {
      if (!["idle", "ask", "think", "listen"].includes(moods.get(p) ?? "idle")) return;
      p.emote("yawn");
      window.setTimeout(() => napping && p.setState("sleeping"), 2200);
    });
  }, 5000);
}

/**
 * The buddy: one of the AI-Buddy friends (Flare the flame by default), drawn live by their own renderer
 * (vendor/buddy.js). Moods change its face and how it moves; `count` shows stars caught in a badge.
 */
export function Can({ mood = "idle", count, size = 96, bump = 0, buddy, className = "" }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const pal = useRef<PalInstance | null>(null);
  const who = buddy ? parseBuddy(buddy) : currentBuddy();
  const colour = BUDDY_HUES[who.hue];

  useEffect(() => {
    const p = window.Pal.create(host.current!, { look: who.look, view: [12, 18, 176, 166] });
    pal.current = p;
    live.add(p);
    p.tick(1 / 60);
    start();
    return () => {
      live.delete(p);
      moods.delete(p);
      p.canvas.remove();
      pal.current = null;
    };
    // The look changes in place below; the renderer is made once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Friends take their colour from the ring setting in buddy.js; "" is their own colour.
    pal.current?.setLook(who.look);
    pal.current?.setColors({ ring: colour });
    pal.current?.tick(1 / 60);
  }, [who.look, colour]);

  useEffect(() => {
    if (!pal.current) return;
    moods.set(pal.current, mood);
    play(pal.current, mood);
    pal.current.tick(1 / 60);
  }, [mood, bump]);

  const style = { width: size, height: size * (166 / 176) } as CSSProperties;
  const name = buddyName(who);
  return (
    <span
      ref={host}
      className={`can flare can-${mood} ${className}`}
      style={style}
      role="img"
      aria-label={count === undefined ? `${name}, your buddy` : `${name} has ${count} ${count === 1 ? "star" : "stars"}`}
    >
      {count !== undefined && <span className="can-badge">{count}</span>}
    </span>
  );
}
