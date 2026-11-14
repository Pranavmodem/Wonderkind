import { useEffect, useRef, useState } from "react";
import { Can, type Mood } from "../components/Can";
import { withBuddyName } from "../game/buddy";
import { QuestionStage, same, type Status } from "../components/QuestionStage";
import { CloseButton, SoundToggle, StarIcon, worldStyle } from "../components/bits";
import { findLevel, subjectOf } from "../game/curriculum";
import { PRAISE } from "../game/praise";
import { LESSON_SIZE, starsFor, type Save } from "../game/progress";
import { adapt, answerText, bag, buildLesson, rand, withUnit, type Question } from "../game/questions";
import { say, sfx } from "../game/sound";

export interface Result {
  levelId: string;
  firstTry: number;
  total: number;
  caught: number;
  stars: 1 | 2 | 3;
}

interface Props {
  levelId: string;
  save: Save;
  onToggleSound: () => void;
  onExit: () => void;
  onFinish: (result: Result) => void;
  /** Called once with the question keys this lesson uses, so replays avoid them. */
  onSeen: (levelId: string, keys: string[]) => void;
}

/** One bag per subject, so a physics or chemistry lesson never hears "Math star!". */
const nextPraise = { math: bag(PRAISE.math), physics: bag(PRAISE.physics), chemistry: bag(PRAISE.chemistry) };
const nextSecondTry = bag(["You figured it out!", "Yes! You kept trying.", "There you go!", "Second time's the charm!"]);

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lesson questions, with a couple of review questions from earlier levels in the same world. */
function makeLesson(levelId: string, save: Save): Question[] {
  const { world, level, index } = findLevel(levelId)!;
  const { difficulty } = save.settings;
  const size = LESSON_SIZE[difficulty];
  const review = index === 0 ? 0 : difficulty === "easier" ? 1 : 2;
  const main = buildLesson(level.make, size - review, new Set(save.recent[levelId] ?? []));
  for (let r = 0; r < review; r++) {
    const earlier = world.levels[rand(0, index - 1)];
    main.splice(rand(2, main.length), 0, earlier.make());
  }
  return main.map((q) => adapt(q, difficulty));
}

export function PlayScreen({ levelId, save, onToggleSound, onExit, onFinish, onSeen }: Props) {
  const { world, level } = findLevel(levelId)!;
  const { settings } = save;
  const rewards = settings.rewards;
  const [questions] = useState(() => makeLesson(levelId, save));
  const [index, setIndex] = useState(0);
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("asking");
  const [entry, setEntry] = useState("");
  const [firstTry, setFirstTry] = useState(0);
  const [right, setRight] = useState(0);
  const [caught, setCaught] = useState(0);
  const [bump, setBump] = useState(0);
  const [shake, setShake] = useState(0);
  const [mood, setMood] = useState<Mood>("ask");
  const [streak, setStreak] = useState(0);
  const [praise, setPraise] = useState("");
  const [leaving, setLeaving] = useState(false);
  const canRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const q = questions[index];
  const done = status !== "asking";
  const last = index === questions.length - 1;

  // Remember this lesson's questions once, so a replay brings new ones.
  const seenOnce = useRef(false);
  useEffect(() => {
    if (seenOnce.current) return;
    seenOnce.current = true;
    onSeen(levelId, questions.map((x) => x.key));
  }, [levelId, questions, onSeen]);

  // Read each new question aloud.
  useEffect(() => {
    const t = window.setTimeout(() => say(q.speech), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (done) nextRef.current?.focus({ preventScroll: true });
  }, [done]);

  /** Fly a star from where the kid answered into the can. */
  function flyStar(from: Element | null) {
    const to = canRef.current;
    const land = () => {
      setCaught((c) => c + 1);
      setBump((b) => b + 1);
      if (rewards === "full") sfx.star();
    };
    if (!from || !to || reducedMotion()) return land();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const star = document.createElement("div");
    star.className = "flying-star";
    star.textContent = "★";
    document.body.appendChild(star);
    const x0 = a.left + a.width / 2 - 20;
    const y0 = a.top + a.height / 2 - 20;
    const x1 = b.left + b.width / 2 - 20;
    const y1 = b.top + b.height * 0.3 - 20;
    star
      .animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(1)` },
          { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 80}px) scale(1.4) rotate(140deg)` },
          { transform: `translate(${x1}px, ${y1}px) scale(0.6) rotate(300deg)` },
        ],
        { duration: 700, easing: "cubic-bezier(.4,0,.3,1)" },
      )
      .finished.then(() => {
        star.remove();
        land();
      });
  }

  function answer(value: number, from: Element | null, correct?: boolean) {
    if (done) return;
    if (correct ?? same(value, q.answer)) {
      const line = tries === 0 ? nextPraise[subjectOf(world)]() : nextSecondTry();
      sfx.correct();
      setStatus("correct");
      const run = tries === 0 ? streak + 1 : 0;
      setStreak(run);
      setMood(run >= 5 && run % 5 === 0 ? "love" : run === 3 ? "wink" : "happy");
      setPraise(line);
      setEntry(answerText(q, value));
      setRight((n) => n + 1);
      if (tries === 0) setFirstTry((n) => n + 1);
      say(`${line} ${q.explain}`);
      if (rewards !== "off") flyStar(from);
      return;
    }
    sfx.oops();
    setWrong((w) => [...w, value]);
    setShake((s) => s + 1);
    setStreak(0);
    if (tries === 0) {
      setTries(1);
      setMood("oops");
      setEntry("");
      say(`Not quite. ${q.hint}`);
    } else {
      setStatus("revealed");
      setMood("think");
      setEntry(answerText(q));
      say(q.input === "activity" ? `Here's how. ${q.explain}` : `The answer is ${answerText(q)}. ${q.explain}`);
    }
  }

  function next() {
    if (last) {
      onFinish({ levelId, firstTry, total: questions.length, caught: right, stars: starsFor(firstTry, questions.length) });
      return;
    }
    setIndex((i) => i + 1);
    setTries(0);
    setWrong([]);
    setShake(0);
    setStatus("asking");
    setEntry("");
    setMood("ask");
  }

  const progress = (index + (done ? 1 : 0)) / questions.length;
  const unitText = withUnit(q);

  return (
    <div className="play screen-in" style={worldStyle(world.color)}>
      <div className="play-deco" aria-hidden="true">
        {world.scenery.slice(0, 4).map((e, i) => (
          <span key={i} className={`deco deco-${i}`}>
            {e}
          </span>
        ))}
      </div>

      <header className="play-top">
        <CloseButton onClick={() => setLeaving(true)} label="Leave this level" />
        <div
          className="progress"
          role="progressbar"
          aria-label={`${level.title}: questions done`}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index + (done ? 1 : 0)}
        >
          <span style={{ width: `${Math.max(progress * 100, 4)}%` }} />
        </div>
        <SoundToggle on={save.sound} onToggle={onToggleSound} />
      </header>

      <main className="play-main">
        <section className="ask">
          <div ref={canRef} className="ask-can">
            <Can mood={mood} color={world.color} count={rewards === "off" ? undefined : caught} size={92} bump={bump} hat={world.hat} />
          </div>
          <div className={`bubble${tries > 0 && !done ? " bubble-hint" : ""}`}>
            <p key={`${index}-${tries}`}>{withBuddyName(tries > 0 && !done ? q.hint : q.prompt)}</p>
            <button
              type="button"
              className="speak"
              onClick={() => say(tries > 0 && !done ? q.hint : q.speech, { force: true })}
              aria-label="Say it again"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
                <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </section>

        <QuestionStage
          key={index}
          q={q}
          status={status}
          tries={tries}
          wrong={wrong}
          entry={entry}
          onEntry={setEntry}
          shake={shake}
          hideVisual={settings.difficulty === "harder" && !q.needsVisual}
          onAnswer={answer}
        />
      </main>

      {done && (
        <div className={`sheet sheet-${status}`} role="status">
          <div className="sheet-inner">
            <div className="sheet-text">
              <p className="sheet-title">
                {status === "correct" ? (
                  <>
                    {rewards !== "off" && <StarIcon size={28} />} {praise}
                  </>
                ) : q.input === "activity" ? (
                  "Good try! Here's how it looks."
                ) : (
                  `Good try! The answer is ${unitText}.`
                )}
              </p>
              <p className="sheet-body">{q.explain}</p>
            </div>
            <button ref={nextRef} type="button" className="btn btn-sheet" onClick={next}>
              {last ? (rewards === "off" ? "Finish" : "See my stars") : "Next"}
            </button>
          </div>
        </div>
      )}

      {leaving && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="modal">
            <Can mood="surprised" color={world.color} size={84} hat={world.hat} />
            <h2 id="leave-title">Leave this level?</h2>
            <p>{rewards === "off" ? "This level won't count as finished." : "Your stars from this level won't be saved."}</p>
            <button type="button" className="btn" autoFocus onClick={() => setLeaving(false)}>
              Keep playing
            </button>
            <button type="button" className="btn btn-quiet" onClick={onExit}>
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
