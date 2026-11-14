import { useEffect, useRef, useState } from "react";
import { Can, type Mood } from "../components/Can";
import { Keypad, parseEntry } from "../components/Keypad";
import { Confetti, CloseButton, SoundToggle, worldStyle } from "../components/bits";
import { drillId, factsFor, mastery, pickFact, record, timesKey, type DrillConfig, type DrillOp, type Fact, type FactStat } from "../game/drills";
import type { Save } from "../game/progress";
import { say, sfx } from "../game/sound";

interface Props {
  save: Save;
  onChange: (update: (s: Save) => Save) => void;
  onToggleSound: () => void;
  onExit: () => void;
}

type Colour = "grape" | "teal" | "leaf" | "berry" | "sun" | "wave" | "rose" | "tangerine" | "night" | "lime";

/** Every kind of round; table-based ones pick times tables, the rest pick one setting. */
const OPS: { op: DrillOp; label: string; colour: Colour; options?: { value: number; label: string }[] }[] = [
  { op: "×", label: "Times", colour: "grape" },
  { op: "÷", label: "Divide", colour: "teal" },
  {
    op: "+",
    label: "Add",
    colour: "leaf",
    options: [
      { value: 10, label: "Within 10" },
      { value: 20, label: "Within 20" },
      { value: 100, label: "Within 100" },
    ],
  },
  {
    op: "−",
    label: "Take away",
    colour: "berry",
    options: [
      { value: 10, label: "Within 10" },
      { value: 20, label: "Within 20" },
      { value: 100, label: "Within 100" },
    ],
  },
  {
    op: "10",
    label: "Make 10",
    colour: "sun",
    options: [
      { value: 10, label: "Make 10" },
      { value: 100, label: "Make 100" },
    ],
  },
  {
    op: "2×",
    label: "Doubles",
    colour: "tangerine",
    options: [
      { value: 20, label: "Up to 20" },
      { value: 100, label: "Up to 100" },
    ],
  },
  {
    op: "x²",
    label: "Squares",
    colour: "wave",
    options: [
      { value: 12, label: "Up to 12²" },
      { value: 20, label: "Up to 20²" },
    ],
  },
  {
    op: "√",
    label: "Roots",
    colour: "rose",
    options: [
      { value: 144, label: "Up to √144" },
      { value: 400, label: "Up to √400" },
    ],
  },
  {
    op: "±",
    label: "Negatives",
    colour: "night",
    options: [
      { value: 10, label: "−10 to 10" },
      { value: 20, label: "−20 to 20" },
    ],
  },
  {
    op: "%",
    label: "Percents",
    colour: "lime",
    options: [
      { value: 1, label: "10% and 50%" },
      { value: 2, label: "20%, 25%, 75%" },
    ],
  },
];

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TIMES = [30, 60, 120];

const DEFAULT: DrillConfig = { op: "×", set: [2, 5, 10], seconds: 60 };

type Phase = "setup" | "ready" | "go" | "done";

function MasteryGrid({ facts }: { facts: Record<string, FactStat> }) {
  const n = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="mastery">
      <div className="mastery-grid" role="table" aria-label="Times table mastery">
        <span className="mg-corner" aria-hidden="true">
          ×
        </span>
        {n.map((c) => (
          <span key={`h${c}`} className="mg-head">
            {c}
          </span>
        ))}
        {n.map((r) => (
          <div key={r} className="mg-row" role="row">
            <span className="mg-head">{r}</span>
            {n.map((c) => {
              const m = mastery(facts[timesKey(r, c)]);
              return <span key={c} className={`mg-cell mg-${m}`} title={`${r} × ${c} = ${r * c}`} />;
            })}
          </div>
        ))}
      </div>
      <p className="mastery-key">
        <span className="mg-cell mg-fast" /> Fast <span className="mg-cell mg-good" /> Getting there <span className="mg-cell mg-learning" /> Needs practice{" "}
        <span className="mg-cell mg-new" /> Not tried
      </p>
    </div>
  );
}

export function DrillScreen({ save, onChange, onToggleSound, onExit }: Props) {
  const [config, setConfig] = useState<DrillConfig>(save.lastDrill ?? DEFAULT);
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(3);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [fact, setFact] = useState<Fact | null>(null);
  const [entry, setEntry] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missed, setMissed] = useState<Fact[]>([]);
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);
  const [left, setLeft] = useState(config.seconds);
  const [mood, setMood] = useState<Mood>("idle");
  const [prevBest, setPrevBest] = useState(0);
  const askedAt = useRef(0);
  const misses = useRef(0);
  const recent = useRef<string[]>([]);
  const statsRef = useRef(save.facts);
  const rewards = save.settings.rewards;
  const colour = OPS.find((o) => o.op === config.op)!.colour;

  // Countdown, then the clock.
  useEffect(() => {
    if (phase === "ready") {
      if (count === 0) {
        setPhase("go");
        return;
      }
      sfx.tap();
      const t = window.setTimeout(() => setCount((c) => c - 1), 700);
      return () => window.clearTimeout(t);
    }
    if (phase === "go") {
      if (left <= 0) {
        finish();
        return;
      }
      const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count, left]);

  useEffect(() => {
    if (phase === "go" && !fact) ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function start() {
    const list = factsFor(config);
    statsRef.current = save.facts;
    recent.current = [];
    setFacts(list);
    setFact(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMissed([]);
    setLeft(config.seconds);
    setCount(3);
    setPrevBest(save.drillBests[drillId(config)] ?? 0);
    onChange((s) => ({ ...s, lastDrill: config }));
    setPhase("ready");
  }

  function ask(list = facts) {
    const next = pickFact(list.length ? list : factsFor(config), statsRef.current, recent.current);
    recent.current = [...recent.current.slice(-3), next.key];
    setFact(next);
    setEntry("");
    askedAt.current = performance.now();
  }

  function check(value: number) {
    if (!fact || flash) return;
    const ms = performance.now() - askedAt.current;
    const right = value === fact.answer;
    statsRef.current = { ...statsRef.current, [fact.key]: record(statsRef.current[fact.key], right, ms) };
    if (right) {
      sfx.correct();
      setScore((s) => s + 1);
      setStreak((s) => {
        const n = s + 1;
        setBestStreak((b) => Math.max(b, n));
        return n;
      });
      misses.current = 0;
      setMood((streak + 1) % 10 === 0 ? "love" : (streak + 1) % 5 === 0 ? "wink" : "happy");
      setFlash("right");
      window.setTimeout(() => {
        setFlash(null);
        ask();
      }, 220);
    } else {
      sfx.oops();
      setStreak(0);
      misses.current += 1;
      setMood(misses.current >= 3 ? "dizzy" : "oops");
      setMissed((m) => (m.some((f) => f.key === fact.key) ? m : [...m, fact]));
      setFlash("wrong");
      setEntry(String(fact.answer));
      window.setTimeout(() => {
        setFlash(null);
        ask();
      }, 1100);
    }
  }

  function type(v: string) {
    setEntry(v);
    // Check as soon as enough characters are typed, so fast kids stay fast.
    const needed = String(fact?.answer ?? "").replace("-", "−").length;
    if (fact && v.length >= needed && /\d$/.test(v)) check(parseEntry(v));
  }

  function finish() {
    setPhase("done");
    const id = drillId(config);
    onChange((s) => ({
      ...s,
      facts: statsRef.current,
      drillBests: { ...s.drillBests, [id]: Math.max(s.drillBests[id] ?? 0, score) },
    }));
    if (rewards === "full" && score > prevBest && prevBest > 0) sfx.fanfare();
    say(`Time! You got ${score} right.`);
  }

  /* ------------------------------------------------------------ render */

  if (phase === "setup") {
    const isTables = config.op === "×" || config.op === "÷";
    const best = save.drillBests[drillId(config)];
    return (
      <div className="drill screen-in" style={worldStyle(colour)}>
        <header className="play-top">
          <CloseButton onClick={onExit} label="Back to the map" />
          <h1 className="drill-title">Speed round</h1>
          <SoundToggle on={save.sound} onToggle={onToggleSound} />
        </header>
        <main className="drill-setup">
          <section>
            <h2>What to practice</h2>
            <div className="drill-ops">
              {OPS.map((o) => (
                <button
                  type="button"
                  key={o.op}
                  className={`drill-op${config.op === o.op ? " on" : ""}`}
                  style={worldStyle(o.colour)}
                  onClick={() => setConfig({ ...config, op: o.op, set: o.options ? [o.options[0].value] : [2, 5, 10] })}
                >
                  <span>{o.op}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>{isTables ? "Which tables?" : "Which ones?"}</h2>
            <div className="age-chips">
              {isTables
                ? TABLES.map((t) => {
                    const on = config.set.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        className={`chip${on ? " chip-on" : ""}`}
                        aria-pressed={on}
                        onClick={() => {
                          const set = on ? config.set.filter((x) => x !== t) : [...config.set, t].sort((a, b) => a - b);
                          if (set.length) setConfig({ ...config, set });
                        }}
                      >
                        {t}
                      </button>
                    );
                  })
                : (OPS.find((o) => o.op === config.op)?.options ?? []).map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      className={`chip${config.set[0] === t.value ? " chip-on" : ""}`}
                      onClick={() => setConfig({ ...config, set: [t.value] })}
                    >
                      {t.label}
                    </button>
                  ))}
            </div>
          </section>

          <section>
            <h2>How long?</h2>
            <div className="age-chips">
              {TIMES.map((t) => (
                <button type="button" key={t} className={`chip${config.seconds === t ? " chip-on" : ""}`} onClick={() => setConfig({ ...config, seconds: t })}>
                  {t < 60 ? `${t} seconds` : `${t / 60} minute${t > 60 ? "s" : ""}`}
                </button>
              ))}
            </div>
          </section>

          <button type="button" className="btn btn-big" onClick={start}>
            Go!
          </button>
          {best !== undefined && rewards !== "off" && <p className="drill-best">Your best for this round: {best}</p>}

          {isTables && (
            <section>
              <h2>Times tables so far</h2>
              <MasteryGrid facts={save.facts} />
            </section>
          )}
        </main>
      </div>
    );
  }

  if (phase === "done") {
    const newBest = score > prevBest && prevBest > 0;
    return (
      <main className="done-screen drill-done screen-in" style={worldStyle(colour)}>
        {rewards === "full" && newBest && <Confetti />}
        <div className="done-hero">
          {rewards !== "off" && <span className="burst" aria-hidden="true" />}
          <Can mood={newBest ? "surprised" : "cheer"} color={colour} size={130} hat="cap" />
        </div>
        <h1 className="done-title">Time!</h1>
        <p className="drill-score">
          <strong>{score}</strong> right
        </p>
        <p className="done-stat">Longest streak: {bestStreak} in a row</p>
        {rewards !== "off" && newBest && <p className="done-best">New best! Last best was {prevBest}.</p>}
        {missed.length > 0 && (
          <div className="drill-missed">
            <p>Practice these:</p>
            <div className="age-chips">
              {missed.slice(0, 8).map((f) => (
                <span key={f.key} className="chip">
                  {f.text} = {f.answer}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="done-actions">
          <button type="button" className="btn btn-big" onClick={start}>
            Go again
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setPhase("setup")}>
            Change the round
          </button>
          <button type="button" className="btn btn-quiet" onClick={onExit}>
            Back to map
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="drill play screen-in" style={worldStyle(colour)}>
      <header className="play-top">
        <CloseButton onClick={() => setPhase("setup")} label="Stop this round" />
        <div className="progress drill-clock" role="timer" aria-label={`${left} seconds left`}>
          <span style={{ width: `${(left / config.seconds) * 100}%` }} />
        </div>
        <span className="drill-left">{phase === "go" ? left : config.seconds}s</span>
      </header>
      <main className="play-main drill-main">
        <div className="drill-status">
          <Can mood={mood} color={colour} size={70} hat="cap" />
          <span className="drill-points">
            {score} <small>right</small>
          </span>
          {streak >= 3 && <span className="drill-streak">🔥 {streak} in a row</span>}
        </div>
        {phase === "ready" ? (
          <div className="drill-count" aria-live="assertive">
            {count || "Go!"}
          </div>
        ) : (
          fact && (
            <>
              <div className={`drill-fact${flash ? ` flash-${flash}` : ""}`} aria-live="polite">
                {(fact.text.includes("?") ? fact.text : `${fact.text} = ?`).split("?").map((part, i, all) => (
                  <span key={i} className="drill-part">
                    {part && <span>{part.trim()}</span>}
                    {i < all.length - 1 && (
                      <span className={`blank blank-${flash === "wrong" ? "revealed" : flash === "right" ? "correct" : "asking"}`}>{entry || "?"}</span>
                    )}
                  </span>
                ))}
              </div>
              <Keypad
                value={flash ? "" : entry}
                onChange={type}
                onCheck={() => check(parseEntry(entry))}
                disabled={Boolean(flash)}
                maxDigits={3}
                extra={config.op === "±" ? "−" : undefined}
              />
            </>
          )
        )}
      </main>
    </div>
  );
}
