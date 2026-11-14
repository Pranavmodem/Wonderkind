import { useEffect } from "react";
import { sfx } from "../game/sound";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onCheck: () => void;
  disabled: boolean;
  maxDigits?: number;
  /** A decimal point or minus key for questions that need one. */
  extra?: "." | "−";
}

type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "back" | "check" | "." | "−";

/** A typed answer is ready to check: digits, optionally signed, optionally with decimals. */
export const isComplete = (v: string) => /^−?\d+(\.\d+)?$/.test(v);

export const parseEntry = (v: string) => Number(v.replace("−", "-"));

export function Keypad({ value, onChange, onCheck, disabled, maxDigits = 3, extra }: Props) {
  const keys: Key[] = extra
    ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", extra, "0", "back", "check"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "check"];
  const ready = isComplete(value);

  function press(key: Key) {
    if (disabled) return;
    if (key === "check") {
      if (ready) onCheck();
      return;
    }
    sfx.tap();
    if (key === "back") return onChange(value.slice(0, -1));
    if (key === "−") return onChange(value.startsWith("−") ? value.slice(1) : `−${value}`);
    if (key === ".") {
      if (value.includes(".")) return;
      return onChange(value.replace(/^(−?)$/, "$10") + ".");
    }
    if (value.replace(/\D/g, "").length >= maxDigits) return;
    onChange(value === "0" ? key : value === "−0" ? `−${key}` : value + key);
  }

  // Let a physical keyboard type answers too.
  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key as Key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter") press("check");
      else if (e.key === "." && extra === ".") press(".");
      else if (e.key === "-" && extra === "−") press("−");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={`keypad${extra ? " keypad-extra" : ""}`}>
      {keys.map((key) => (
        <button
          type="button"
          key={key}
          className={`key key-${key === "." ? "dot" : key === "−" ? "minus" : key}`}
          disabled={disabled || (key === "check" && !ready)}
          onClick={() => press(key)}
          aria-label={key === "back" ? "Delete" : key === "check" ? "Check my answer" : key === "−" ? "Minus sign" : key === "." ? "Decimal point" : key}
        >
          {key === "back" ? (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5h10a2 2 0 012 2v10a2 2 0 01-2 2H9l-6-7z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M12 9.5l5 5M17 9.5l-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : key === "check" ? (
            <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}
