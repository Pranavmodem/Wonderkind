import type { CSSProperties } from "react";
import type { World } from "../game/types";

/** CSS variables that theme a subtree in a world's colour. */
export function worldStyle(color: World["color"]): CSSProperties {
  return {
    "--w": `var(--${color})`,
    "--w-deep": `var(--${color}-deep)`,
    "--w-soft": `var(--${color}-soft)`,
    "--w-on": `var(--${color}-on)`,
  } as CSSProperties;
}

export function StarIcon({ filled = true, size = 24 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={filled ? "star on" : "star"}>
      <path
        d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRow({ stars, size = 18, label = true }: { stars: number; size?: number; label?: boolean }) {
  return (
    <span className="star-row" role={label ? "img" : undefined} aria-label={label ? `${stars} of 3 stars` : undefined}>
      {[1, 2, 3].map((n) => (
        <StarIcon key={n} filled={n <= stars} size={size} />
      ))}
    </span>
  );
}

export function SoundToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="icon-btn" onClick={onToggle} aria-pressed={on} aria-label={on ? "Turn sound off" : "Turn sound on"}>
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" strokeLinejoin="round" />
        {on ? (
          <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

export function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={label}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function LockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" stroke="currentColor" strokeWidth="2.4" fill="none" />
    </svg>
  );
}

const CONFETTI_COLORS = ["var(--sun)", "var(--leaf)", "var(--berry)", "var(--wave)", "var(--grape)"];

export function Confetti({ pieces = 70 }: { pieces?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${Math.random() * 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              "--delay": `${Math.random() * 0.6}s`,
              "--dur": `${2.2 + Math.random() * 1.6}s`,
              "--drift": `${(Math.random() - 0.5) * 160}px`,
              "--spin": `${(Math.random() - 0.5) * 1080}deg`,
              width: `${7 + Math.random() * 7}px`,
              height: `${10 + Math.random() * 8}px`,
              borderRadius: i % 3 === 0 ? "50%" : "2px",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export const BUDDIES = ["🦊", "🐼", "🐸", "🐯", "🐨", "🐙", "🦄", "🐶", "🐱", "🐵", "🦁", "🐧"];
