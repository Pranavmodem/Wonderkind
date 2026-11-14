import { useEffect, useRef, useState } from "react";
import { Can, type Mood } from "../components/Can";
import { withBuddyName } from "../game/buddy";
import { QuestionStage, same, type Status } from "../components/QuestionStage";
import { CloseButton, SoundToggle, worldStyle } from "../components/bits";
import { findLevel } from "../game/curriculum";
import type { Save } from "../game/progress";
import { adapt, answerText, withUnit, type Question } from "../game/questions";
import { say, sfx } from "../game/sound";

interface Props {
  levelId: string;
  save: Save;
  onToggleSound: () => void;
  onExit: () => void;
  onPractice: () => void;
}

/** The parts of a lesson: the big idea, a worked example in three steps, then the kid's turn. */
type Step = "idea" | "problem" | "strategy" | "solve" | "try";

const STEPS: Step[] = ["idea", "problem", "strategy", "solve", "try"];

export function LearnScreen({ levelId, save, onToggleSound, onExit, onPractice }: Props) {
  const { world, level } = findLevel(levelId)!;
  const difficulty = save.settings.difficulty;
  const fresh = () => adapt(level.make(), difficulty === "harder" ? "normal" : difficulty);
  const [step, setStep] = useState<Step>("idea");
  const [example, setExample] = useState<Question>(fresh);
  const [practice, setPractice] = useState<Question>(fresh);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<Status>("asking");
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [entry, setEntry] = useState("");
  const [shake, setShake] = useState(0);
  const [mood, setMood] = useState<Mood>("wave");
  const nextRef = useRef<HTMLButtonElement>(null);

  const idea = level.idea ?? `Let's learn ${level.title.toLowerCase()} together. First, watch how it's done.`;

  const lines: Record<Step, string> = {
    idea,
    problem: `Here's a problem. ${example.prompt}`,
    strategy: `Here's a way to think about it: ${example.hint}`,
    solve: example.input === "activity" ? `${example.explain}` : `${example.explain} The answer is ${withUnit(example)}.`,
    try:
      status === "correct"
        ? `Yes! ${practice.explain}`
        : status === "revealed"
          ? practice.input === "activity"
            ? `Here's how. ${practice.explain}`
            : `The answer is ${answerText(practice)}. ${practice.explain}`
          : tries > 0
            ? practice.hint
            : `Your turn! ${practice.prompt}`,
  };

  useEffect(() => {
    const t = window.setTimeout(() => say(lines[step]), 300);
    return () => window.clearTimeout(t);
    // Speak when the step or the practice result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, status, tries, round]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [step, status]);

  function go(next: Step) {
    sfx.tap();
    setStep(next);
    setMood(next === "solve" ? "proud" : next === "strategy" ? "think" : next === "try" ? "ask" : "idle");
  }

  function anotherExample() {
    setExample(fresh());
    go("problem");
  }

  function newTry() {
    setPractice(fresh());
    setRound((r) => r + 1);
    setStatus("asking");
    setTries(0);
    setWrong([]);
    setEntry("");
    setShake(0);
    setMood("ask");
  }

  function answer(value: number, _from?: Element | null, correct?: boolean) {
    if (status !== "asking") return;
    if (correct ?? same(value, practice.answer)) {
      sfx.correct();
      setStatus("correct");
      setMood("happy");
      setEntry(answerText(practice, value));
      return;
    }
    sfx.oops();
    setWrong((w) => [...w, value]);
    setShake((s) => s + 1);
    if (tries === 0) {
      setTries(1);
      setMood("oops");
      setEntry("");
    } else {
      setStatus("revealed");
      setMood("think");
    }
  }

  const stepIndex = STEPS.indexOf(step);
  const q = step === "try" ? practice : example;

  return (
    <div className="play learn screen-in" style={worldStyle(world.color)}>
      <header className="play-top">
        <CloseButton onClick={onExit} label="Back to the map" />
        <ol className="learn-steps" aria-label="Lesson steps">
          {["Big idea", "Example", "Your turn"].map((label, i) => {
            const at = stepIndex === 0 ? 0 : stepIndex < 4 ? 1 : 2;
            return (
              <li key={label} className={i === at ? "on" : i < at ? "step-done" : ""}>
                {label}
              </li>
            );
          })}
        </ol>
        <SoundToggle on={save.sound} onToggle={onToggleSound} />
      </header>

      <main className="play-main">
        <section className="ask">
          <div className="ask-can">
            <Can mood={mood} color={world.color} size={92} hat={world.hat} />
          </div>
          <div className={`bubble${step === "try" && tries > 0 && status === "asking" ? " bubble-hint" : ""}${step === "idea" ? " bubble-big" : ""}`}>
            <p key={`${step}-${status}-${tries}-${round}`}>{withBuddyName(lines[step])}</p>
            <button type="button" className="speak" onClick={() => say(lines[step], { force: true })} aria-label="Say it again">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
                <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </section>

        {step === "idea" ? (
          <div className="learn-idea">
            <p className="learn-kicker">{world.name}</p>
            <h1>{level.title}</h1>
          </div>
        ) : (
          <QuestionStage
            key={`${step === "try" ? "t" : "e"}-${round}-${q.key}`}
            q={q}
            status={step === "try" ? status : "asking"}
            tries={step === "try" ? tries : 0}
            wrong={step === "try" ? wrong : []}
            entry={step === "try" ? entry : ""}
            onEntry={setEntry}
            shake={step === "try" ? shake : 0}
            showHint={step === "strategy"}
            showWorking={step === "solve"}
            hideAnswers={step !== "try"}
            onAnswer={answer}
          />
        )}
      </main>

      <footer className="learn-bar">
        <div className="learn-bar-inner">
          {step === "idea" && (
            <button ref={nextRef} type="button" className="btn btn-big" onClick={() => go("problem")}>
              Show me an example
            </button>
          )}
          {step === "problem" && (
            <button ref={nextRef} type="button" className="btn btn-big" onClick={() => go("strategy")}>
              How do I solve it?
            </button>
          )}
          {step === "strategy" && (
            <button ref={nextRef} type="button" className="btn btn-big" onClick={() => go("solve")}>
              Show the answer
            </button>
          )}
          {step === "solve" && (
            <>
              <button ref={nextRef} type="button" className="btn btn-big" onClick={() => go("try")}>
                Let me try one
              </button>
              <button type="button" className="btn btn-quiet" onClick={anotherExample}>
                Show another example
              </button>
            </>
          )}
          {step === "try" &&
            (status === "asking" ? (
              <button type="button" className="btn btn-quiet" onClick={() => go("solve")}>
                See the example again
              </button>
            ) : (
              <>
                <button ref={nextRef} type="button" className="btn btn-big" onClick={onPractice}>
                  Start practice
                </button>
                <button type="button" className="btn btn-quiet" onClick={newTry}>
                  Try another one
                </button>
              </>
            ))}
        </div>
      </footer>
    </div>
  );
}
