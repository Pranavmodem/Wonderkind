import type { Token } from "../game/types";
import { num } from "./visuals/NumberVisuals";

export type BlankState = "asking" | "correct" | "revealed" | "wrong";

/** Numbers of 10,000 and up get thousands separators so big numbers are readable. */
export function bigNum(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) >= 10000) {
    const s = Math.abs(n).toLocaleString("en-US");
    return n < 0 ? `−${s}` : s;
  }
  return num(n);
}

const SYM = new Set(["+", "−", "×", "÷", "=", "<", ">", ":", "≤", "≥"]);

function Blank({ fill, state, small }: { fill: string; state: BlankState; small?: boolean }) {
  return (
    <span className={`blank blank-${state}${small ? " blank-small" : ""}`} aria-label={fill ? `your answer, ${fill}` : "blank"}>
      {fill || "?"}
    </span>
  );
}

interface Props {
  tokens: Token[];
  fill: string;
  state: BlankState;
  prefix?: string;
  unit?: string;
}

export function Equation({ tokens, fill, state, prefix, unit }: Props) {
  const part = (p: number | "?", small = true) => (p === "?" ? <Blank fill={fill} state={state} small={small} /> : bigNum(p));
  return (
    <div className="equation" aria-live="polite">
      {tokens.map((t, i) => {
        if (t === "?") {
          return (
            <span key={i} className="blank-wrap">
              {prefix && <span className="unit">{prefix}</span>}
              <Blank fill={fill} state={state} />
              {unit && <span className="unit">{unit}</span>}
            </span>
          );
        }
        if (typeof t === "number") {
          return (
            <span key={i} className="num">
              {bigNum(t)}
            </span>
          );
        }
        if (typeof t === "string") {
          if (SYM.has(t)) {
            return (
              <span key={i} className="sym">
                {t}
              </span>
            );
          }
          if (t === "(" || t === ")") {
            return (
              <span key={i} className="paren">
                {t}
              </span>
            );
          }
          if (t === "%") {
            return (
              <span key={i} className="sym pct">
                %
              </span>
            );
          }
          if (t === "x") {
            return (
              <i key={i} className="var">
                x
              </i>
            );
          }
          if (t === "of") {
            return (
              <span key={i} className="word">
                of
              </span>
            );
          }
          return (
            <span key={i} className="num">
              {t}
            </span>
          );
        }
        if ("pow" in t) {
          return (
            <span key={i} className="num">
              {bigNum(t.pow[0])}
              <sup>{t.pow[1]}</sup>
            </span>
          );
        }
        if ("x" in t) {
          return (
            <span key={i} className="num">
              {t.x === 1 ? "" : t.x === -1 ? "−" : bigNum(t.x)}
              <i className="var">x</i>
            </span>
          );
        }
        return (
          <span key={i} className="frac">
            {t.w !== undefined && <span className="frac-w">{part(t.w, false)}</span>}
            <span className="frac-stack">
              <span className="frac-n">{part(t.n)}</span>
              <span className="frac-d">{part(t.d)}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** A label like "3/4" or "2 1/3" shown as a stacked fraction; anything else as text. */
export function LabelText({ text }: { text: string }) {
  const m = /^(−?\d+ )?(−?\d+)\/(\d+)$/.exec(text.trim());
  if (!m) return <>{text}</>;
  return (
    <span className="frac">
      {m[1] && <span className="frac-w">{m[1].trim()}</span>}
      <span className="frac-stack">
        <span className="frac-n">{m[2]}</span>
        <span className="frac-d">{m[3]}</span>
      </span>
    </span>
  );
}
