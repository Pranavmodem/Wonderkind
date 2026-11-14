import { withBuddyName } from "./buddy";
/**
 * Tiny synthesized sound effects and read-aloud, so the game needs no audio files.
 */

let enabled = true;
let voiceOn = true;
let ctx: AudioContext | null = null;
let voice: SpeechSynthesisVoice | null = null;

export function setSoundOn(on: boolean, voice = true) {
  enabled = on;
  voiceOn = voice;
  if (!on || !voice) window.speechSynthesis?.cancel();
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function note(freq: number, at: number, length: number, type: OscillatorType = "triangle", volume = 0.18) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

export const sfx = {
  tap() {
    note(660, 0, 0.08, "sine", 0.12);
  },
  count(n: number) {
    note(440 * Math.pow(2, Math.min(n, 20) / 12), 0, 0.14, "sine", 0.14);
  },
  correct() {
    [523, 659, 784].forEach((f, i) => note(f, i * 0.08, 0.22));
  },
  oops() {
    note(330, 0, 0.18, "sine", 0.14);
    note(262, 0.12, 0.26, "sine", 0.14);
  },
  star() {
    note(1046, 0, 0.12, "sine", 0.1);
    note(1568, 0.06, 0.2, "sine", 0.08);
  },
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => note(f, i * 0.12, 0.3));
    note(784, 0.55, 0.18);
    note(1046, 0.7, 0.5);
  },
};

/* ------------------------------------------------------------------ voice */

// Joke voices that ship with some systems; never pick these.
const NOVELTY =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|deranged|fred|junior|ralph|kathy/i;

/** Higher is more natural-sounding. Neural/online voices beat the old built-in ones by a mile. */
function voiceScore(v: SpeechSynthesisVoice): number {
  if (!v.lang.toLowerCase().startsWith("en") || NOVELTY.test(v.name)) return -1;
  let score = 0;
  if (/natural|neural|premium|enhanced|siri|wavenet|online/i.test(v.name)) score += 60;
  if (/^google/i.test(v.name)) score += 35;
  if (/microsoft/i.test(v.name)) score += 10;
  if (/ava|zoe|samantha|allison|evan|nathan|jenny|aria|ana|emma|libby|sonia|michelle|joanna|serena|karen|moira|tessa|daniel/i.test(v.name)) score += 15;
  if (/en[-_]US/i.test(v.lang)) score += 6;
  else if (/en[-_](GB|AU|IE|NZ|CA)/i.test(v.lang)) score += 4;
  return score;
}

/** English voices on this device, most natural first. */
export function listVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices
    .map((v) => ({ v, s: voiceScore(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

let preferred: string | null = null;

/** Use the voice a grown-up picked (by name), or the best one available when null. */
export function setVoicePreference(name: string | null) {
  preferred = name;
  voice = null;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = listVoices();
  return (preferred && voices.find((v) => v.name === preferred)) || voices[0] || null;
}

const ORDINAL: Record<number, [string, string]> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"],
  9: ["ninth", "ninths"],
  10: ["tenth", "tenths"],
  12: ["twelfth", "twelfths"],
  100: ["hundredth", "hundredths"],
};

const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

/** Turn on-screen math into what a person would say: "3/4" → "3 fourths", "−2" → "negative 2". */
const UNIT_WORDS: Record<string, string> = {
  "m/s²": "meters per second squared",
  "m/s": "meters per second",
  "km/h": "kilometers per hour",
  kg: "kilograms",
  g: "grams",
  N: "newtons",
  J: "joules",
  kJ: "kilojoules",
  W: "watts",
  V: "volts",
  A: "amps",
  Ω: "ohms",
  Hz: "hertz",
  Pa: "pascals",
  kPa: "kilopascals",
  mol: "moles",
  M: "molar",
  L: "liters",
  mL: "milliliters",
  "°C": "degrees Celsius",
  K: "kelvin",
};

export function speakable(text: string): string {
  return (
    text
      // Emoji are pictures, not words.
      .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "")
      // Science: ion charges (Na⁺, SO₄²⁻), subscripts (H₂O), arrows and units after a number.
      .replace(/([⁰¹²³⁴-⁹]*)([⁺⁻])/g, (_, d: string, sign: string) => ` ${[...d].map((c) => ({ ...SUPER, "²": "2", "³": "3" })[c]).join("")} ${sign === "⁺" ? "plus" : "minus"} `)
      .replace(/[₀-₉]+/g, (m) => ` ${[...m].map((c) => c.charCodeAt(0) - 0x2080).join("")} `)
      .replace(/⇌/g, " is in equilibrium with ")
      .replace(/→/g, " makes ")
      .replace(/Δ/g, " change in ")
      .replace(/λ/g, "lambda")
      .replace(/μ/g, "micro")
      .replace(/(\d)\s*(m\/s²|m\/s|km\/h|kg|g|N|J|kJ|W|V|A|Ω|Hz|Pa|kPa|mol|M|L|mL|°C|K)(?![A-Za-z])/g, (_, d: string, u: string) => `${d} ${UNIT_WORDS[u]}`)
      .replace(/(\d+)\s*\/\s*(\d+)/g, (_, a: string, b: string) => {
        const n = Number(a);
        const o = ORDINAL[Number(b)];
        return o ? `${n} ${n === 1 ? o[0] : o[1]}` : `${n} over ${b}`;
      })
      .replace(/′′|″/g, " double prime")
      .replace(/′/g, " prime")
      .replace(/([a-zA-Z])\(([^()]{1,12})\)/g, "$1 of $2")
      .replace(/(^|[(=+×÷,:<>]\s*)−(?=\d|x)/g, "$1negative ")
      .replace(/−/g, " minus ")
      .replace(/×/g, " times ")
      .replace(/÷/g, " divided by ")
      .replace(/([=+×÷−]\s*)\?/g, "$1what")
      .replace(/\+/g, " plus ")
      .replace(/≈/g, " is about ")
      .replace(/≠/g, " is not equal to ")
      .replace(/≤/g, " is at most ")
      .replace(/≥/g, " is at least ")
      .replace(/\s<\s/g, " is less than ")
      .replace(/\s>\s/g, " is greater than ")
      .replace(/=/g, " equals ")
      .replace(/²/g, " squared")
      .replace(/³/g, " cubed")
      .replace(/[⁰¹⁴-⁹]+/g, (m) => ` to the power of ${[...m].map((c) => SUPER[c]).join("")}`)
      .replace(/√/g, "the square root of ")
      .replace(/π/g, "pi")
      .replace(/θ/g, "theta")
      .replace(/∞/g, "infinity")
      .replace(/°/g, " degrees")
      .replace(/%/g, " percent")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Read text aloud. `force` speaks even when sound is off (the kid tapped the speaker). */
export function say(text: string, { force = false } = {}) {
  const synth = window.speechSynthesis;
  if (!synth || (!(enabled && voiceOn) && !force)) return;
  voice ??= pickVoice();
  synth.cancel();
  // Sentence by sentence: natural pauses, and long text doesn't get cut off in Chrome.
  const sentences = speakable(withBuddyName(text)).match(/[^.!?]+[.!?]*/g) ?? [];
  for (const sentence of sentences) {
    const u = new SpeechSynthesisUtterance(sentence.trim());
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 0.96;
    u.pitch = 1.04;
    synth.speak(u);
  }
}

/** iOS only allows sound and speech after a tap, so warm both up on the first one. */
export function unlockOnFirstTap() {
  const unlock = () => {
    audio();
    const synth = window.speechSynthesis;
    if (!synth) return;
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0;
    synth.speak(silent);
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    voice = pickVoice();
  });
}
