import type { CSSProperties } from "react";
import { answerText, type Question, type Token } from "../game/questions";
import { ActivityStage } from "./activities/ActivityStage";
import { Equation, LabelText, type BlankState } from "./Equation";
import { Keypad, parseEntry } from "./Keypad";
import { Visual } from "./Visual";

export type Status = "asking" | "correct" | "revealed";

export const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

interface Props {
  q: Question;
  status: Status;
  tries: number;
  wrong: number[];
  entry: string;
  onEntry: (v: string) => void;
  /** Bumps to replay the shake on a wrong answer. */
  shake: number;
  /** Harder mode keeps the picture back until a hint is needed. */
  hideVisual?: boolean;
  /** Show the worked answer even though the kid hasn't answered (Learn mode). */
  showWorking?: boolean;
  /** Pulse the picture as a hint even before a wrong try (Learn mode). */
  showHint?: boolean;
  /** Hide the answer buttons and keypad while a worked example is shown. */
  hideAnswers?: boolean;
  /** `correct` is given for activities, which check themselves. */
  onAnswer: (value: number, from: Element | null, correct?: boolean) => void;
}

/** The picture, the equation and the answer buttons or keypad for one question. */
export function QuestionStage({ q, status, tries, wrong, entry, onEntry, shake, hideVisual, showWorking, showHint, hideAnswers, onAnswer }: Props) {
  const done = status !== "asking" || Boolean(showWorking);
  const blankInEquation = q.equation?.some(
    (t) => t === "?" || (typeof t === "object" && "n" in t && [t.n, t.d, t.w].includes("?")),
  );
  const answerLine: Token[] | undefined = q.answerLine ?? (q.input === "keypad" && !blankInEquation ? ["?"] : undefined);
  const blankState: BlankState = status === "asking" && !showWorking ? (wrong.length > 0 && !entry ? "wrong" : "asking") : status === "asking" ? "revealed" : status;
  const maxDigits = Math.max(3, String(Math.abs(q.answer)).replace(/\D/g, "").length + 1);
  const isLabels = Boolean(q.labels);
  const fill = done ? (q.input === "keypad" && status === "correct" ? entry : answerText(q)) : q.input === "keypad" ? entry : "";

  return (
    <div className={`stage${q.input === "compare" || hideAnswers || q.input === "activity" ? "" : " stage-split"}`}>
      <div className="show">
        {hideVisual && !done && tries === 0 ? (
          q.visual.kind !== "none" && <p className="picture-hidden">Picture help appears if you need it.</p>
        ) : (
          <Visual
            v={q.visual}
            hint={(tries > 0 || Boolean(showHint)) && !done}
            reveal={done}
            solved={done}
            answer={answerText(q)}
            wrong={wrong}
            onPick={onAnswer}
          />
        )}

        {q.equation && (
          <div key={shake} className={shake && !done && !answerLine ? "shake" : ""}>
            <Equation
              tokens={q.equation}
              fill={isLabels ? (done ? answerText(q) : "") : fill}
              state={blankState}
              prefix={answerLine ? undefined : q.prefix}
              unit={answerLine ? undefined : q.unit}
            />
          </div>
        )}
        {answerLine && (
          <div key={`a${shake}`} className={shake && !done ? "shake" : ""}>
            <Equation tokens={answerLine} fill={fill} state={blankState} prefix={q.prefix} unit={q.unit} />
          </div>
        )}
      </div>

      {q.input === "activity" && q.activity && (
        <ActivityStage
          activity={q.activity}
          solved={done}
          locked={Boolean(hideAnswers) || done}
          noCheck={hideAnswers}
          onSubmit={(correct, from) => onAnswer(correct ? q.answer : Number.NaN, from, correct)}
        />
      )}

      {q.input === "choices" && !hideAnswers && (
        <div
          className={`choices choices-${q.choices!.length}${isLabels ? " choices-text" : ""}${
            !isLabels && Math.max(...q.choices!.map((c) => answerText(q, c).length)) > 5 ? " choices-long" : ""
          }${isLabels && Math.max(...q.labels!.map((l) => l.length)) > 22 ? " choices-sentences" : ""}`}
        >
          {q.choices!.map((c, i) => {
            const isWrong = wrong.includes(c);
            const isAnswer = done && same(c, q.answer);
            return (
              <button
                type="button"
                key={c}
                className={`choice tile-${i % 4}${isWrong ? " wrong" : ""}${isAnswer ? ` answer-${status === "asking" ? "revealed" : status}` : ""}${isWrong && shake ? " shake" : ""}`}
                style={{ "--n": i } as CSSProperties}
                disabled={isWrong || done}
                onClick={(e) => onAnswer(c, e.currentTarget)}
              >
                {isLabels ? <LabelText text={q.labels![c]} /> : answerText(q, c)}
              </button>
            );
          })}
        </div>
      )}

      {q.input === "keypad" && !hideAnswers && (
        <Keypad
          value={done ? "" : entry}
          onChange={onEntry}
          onCheck={() => onAnswer(parseEntry(entry), document.querySelector(".blank"))}
          disabled={done}
          maxDigits={maxDigits}
          extra={q.keypadExtra}
        />
      )}
    </div>
  );
}
