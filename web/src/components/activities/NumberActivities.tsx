import { useMemo, useState, type CSSProperties } from "react";
import { sfx } from "../../game/sound";
import type { Activity } from "../../game/types";
import { asFraction, num } from "../visuals/NumberVisuals";
import { dragHandlers, near, range, snap, useReport, type ActivityProps } from "./shared";

type Of<K extends Activity["kind"]> = Extract<Activity, { kind: K }>;

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  disabled,
}: {
  label: string;
  value: number;
  /** Receives a function of the current value, so quick taps never use a stale number. */
  onChange: (next: (v: number) => number) => void;
  min?: number;
  max?: number;
  disabled: boolean;
}) {
  return (
    <div className="act-stepper">
      <span className="act-stepper-label">{label}</span>
      <button type="button" className="act-step" disabled={disabled || value <= min} onClick={() => (sfx.tap(), onChange((v) => Math.max(min, v - 1)))} aria-label={`Fewer ${label}`}>
        −
      </button>
      <span className="act-stepper-value" aria-live="polite">
        {value}
      </span>
      <button type="button" className="act-step" disabled={disabled || value >= max} onClick={() => (sfx.tap(), onChange((v) => Math.min(max, v + 1)))} aria-label={`More ${label}`}>
        +
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- fillFrame */

export function FillFrame({ a, solved, locked, onChange }: ActivityProps<Of<"fillFrame">>) {
  const [cells, setCells] = useState<boolean[]>(() => Array(a.frames * 10).fill(false));
  const shown = solved ? cells.map((_, i) => i < a.target) : cells;
  useReport(cells.filter(Boolean).length === a.target, onChange);
  return (
    <div className="frames">
      {range(a.frames).map((f) => (
        <div className="frame" key={f}>
          {range(10).map((c) => {
            const i = f * 10 + c;
            return (
              <button
                type="button"
                key={c}
                className="cell act-cell"
                disabled={locked}
                aria-pressed={shown[i]}
                aria-label={`Box ${i + 1}`}
                onClick={() => {
                  sfx.tap();
                  setCells((prev) => prev.map((v, k) => (k === i ? !v : v)));
                }}
              >
                {shown[i] && <span className="dot dot-a" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- buildBlocks */

export function BuildBlocks({ a, solved, locked, onChange }: ActivityProps<Of<"buildBlocks">>) {
  const [n, setN] = useState({ h: 0, t: 0, o: 0 });
  const value = n.h * 100 + n.t * 10 + n.o;
  useReport(value === a.target && (!a.fewest || (n.t < 10 && n.o < 10)), onChange);
  const show = solved ? { h: Math.floor(a.target / 100), t: Math.floor((a.target % 100) / 10), o: a.target % 10 } : n;
  const big = a.target >= 100;
  return (
    <div className="act-blocks">
      <div className="blocks act-blocks-view" aria-hidden="true">
        <div className="block-group">
          {show.h > 0 && (
            <div className="flats">
              {range(show.h).map((i) => (
                <span key={i} className="piece flat">
                  {range(100).map((u) => (
                    <i key={u} />
                  ))}
                </span>
              ))}
            </div>
          )}
          {show.t > 0 && (
            <div className="rods">
              {range(show.t).map((i) => (
                <span key={i} className="piece rod">
                  {range(10).map((u) => (
                    <i key={u} />
                  ))}
                </span>
              ))}
            </div>
          )}
          {show.o > 0 && (
            <div className="cubes">
              {range(show.o).map((i) => (
                <span key={i} className="piece cube">
                  <i />
                </span>
              ))}
            </div>
          )}
          {!show.h && !show.t && !show.o && <span className="act-empty">Add some blocks!</span>}
        </div>
      </div>
      <div className="act-steppers">
        {big && <Stepper label="hundreds" value={show.h} max={9} onChange={(f) => setN((p) => ({ ...p, h: f(p.h) }))} disabled={locked} />}
        <Stepper label="tens" value={show.t} max={a.fewest ? 9 : 19} onChange={(f) => setN((p) => ({ ...p, t: f(p.t) }))} disabled={locked} />
        <Stepper label="ones" value={show.o} max={a.fewest ? 9 : 19} onChange={(f) => setN((p) => ({ ...p, o: f(p.o) }))} disabled={locked} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- makeMoney */

const COIN_NAME: Record<number, string> = { 1: "penny", 5: "nickel", 10: "dime", 25: "quarter", 100: "$1 bill", 500: "$5 bill" };
const COIN_LABEL: Record<number, string> = { 1: "1¢", 5: "5¢", 10: "10¢", 25: "25¢", 100: "$1", 500: "$5" };
const COIN_CLASS: Record<number, string> = { 1: "coin penny", 5: "coin nickel", 10: "coin dime", 25: "coin quarter", 100: "bill", 500: "bill" };

function fewestCoins(cents: number, coins: number[]) {
  const best = Array<number>(cents + 1).fill(Infinity);
  best[0] = 0;
  for (let c = 1; c <= cents; c++) for (const coin of coins) if (coin <= c) best[c] = Math.min(best[c], best[c - coin] + 1);
  const out: number[] = [];
  let left = cents;
  while (left > 0) {
    const coin = [...coins].sort((x, y) => y - x).find((k) => k <= left && best[left - k] === best[left] - 1)!;
    out.push(coin);
    left -= coin;
  }
  return out;
}

const money = (c: number) => (c >= 100 ? `$${(c / 100).toFixed(2)}` : `${c}¢`);

export function MakeMoney({ a, solved, locked, onChange }: ActivityProps<Of<"makeMoney">>) {
  const [tray, setTray] = useState<number[]>([]);
  const best = useMemo(() => fewestCoins(a.cents, a.coins), [a.cents, a.coins]);
  const shown = solved ? best : tray;
  const total = shown.reduce((s, c) => s + c, 0);
  useReport(tray.reduce((s, c) => s + c, 0) === a.cents && (!a.fewest || tray.length === best.length), onChange);
  return (
    <div className="act-money">
      <div className="act-tray" aria-label="Your money">
        {shown.length ? (
          [...shown]
            .sort((x, y) => y - x)
            .map((c, i) => (
              <button
                type="button"
                key={i}
                className={COIN_CLASS[c]}
                disabled={locked}
                aria-label={`Remove a ${COIN_NAME[c]}`}
                onClick={() => {
                  sfx.tap();
                  setTray((prev) => {
                    const k = prev.indexOf(c);
                    return prev.filter((_, j) => j !== k);
                  });
                }}
              >
                {COIN_LABEL[c]}
              </button>
            ))
        ) : (
          <span className="act-empty">Tap coins to add them</span>
        )}
      </div>
      <p className="act-total">Total: {money(total)}</p>
      <div className="act-coin-bank">
        {[...a.coins]
          .sort((x, y) => y - x)
          .map((c) => (
            <button type="button" key={c} className={COIN_CLASS[c]} disabled={locked} onClick={() => (sfx.tap(), setTray((prev) => [...prev, c]))} aria-label={`Add a ${COIN_NAME[c]}`}>
              {COIN_LABEL[c]}
            </button>
          ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- placeOnLine */

export function PlaceOnLine({ a, solved, locked, onChange }: ActivityProps<Of<"placeOnLine">>) {
  const [v, setV] = useState<number | null>(null);
  const W = 640;
  const pad = 36;
  const X = (x: number) => pad + ((x - a.min) / (a.max - a.min)) * (W - 2 * pad);
  const show = (x: number) => (a.fractions ? asFraction(x, a.fractions) : num(x));
  const shown = solved ? a.target : v;
  useReport(v !== null && near(v, a.target), onChange);
  const ticks = range(Math.round((a.max - a.min) / a.step) + 1).map((i) => a.min + i * a.step);
  const isLabel = (x: number) => near((x - a.min) / a.labelStep, Math.round((x - a.min) / a.labelStep));
  const move = (p: { x: number }) => {
    const raw = a.min + ((p.x - pad) / (W - 2 * pad)) * (a.max - a.min);
    const next = Math.min(a.max, Math.max(a.min, a.min + snap(raw - a.min, a.step)));
    if (next !== v) sfx.tap();
    setV(next);
  };
  return (
    <svg className="nl act-svg" viewBox={`0 0 ${W} 150`} {...dragHandlers(!locked, move)} role="slider" aria-label="Drag the marker" aria-valuenow={shown ?? undefined}>
      <rect x="0" y="40" width={W} height="90" fill="transparent" />
      <line x1={pad - 16} x2={W - pad + 16} y1="100" y2="100" className="nl-axis" />
      {ticks.map((x, i) => (
        <g key={i}>
          <line x1={X(x)} x2={X(x)} y1={isLabel(x) ? 88 : 93} y2={isLabel(x) ? 112 : 107} className="nl-tick" />
          {isLabel(x) && (
            <text x={X(x)} y="138" className="nl-label">
              {show(x)}
            </text>
          )}
        </g>
      ))}
      {shown !== null && (
        <g className={solved ? "act-marker solved" : "act-marker"}>
          <path d={`M${X(shown)} 96 l-14 -26 h28 z`} />
          {solved && (
            <text x={X(shown)} y="58" className="nl-label">
              {show(shown)}
            </text>
          )}
        </g>
      )}
      {shown === null && (
        <text x={W / 2} y="40" className="act-tip">
          Tap or drag on the line
        </text>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------- shade */

export function Shade({ a, solved, locked, onChange }: ActivityProps<Of<"shade">>) {
  const [on, setOn] = useState<boolean[]>(() => Array(a.parts).fill(false));
  const shown = solved ? on.map((_, i) => i < a.target) : on;
  useReport(on.filter(Boolean).length === a.target, onChange);
  const toggle = (i: number) => {
    if (locked) return;
    sfx.tap();
    setOn((prev) => prev.map((v, k) => (k === i ? !v : v)));
  };
  if (a.shape === "pie") {
    return (
      <svg viewBox="-1.1 -1.1 2.2 2.2" className="pie act-pie" role="group" aria-label="Tap parts to shade them">
        {range(a.parts).map((i) => {
          const a0 = (i / a.parts) * 2 * Math.PI - Math.PI / 2;
          const a1 = ((i + 1) / a.parts) * 2 * Math.PI - Math.PI / 2;
          const d =
            a.parts === 1
              ? "M-1 0 A1 1 0 1 1 1 0 A1 1 0 1 1 -1 0 Z"
              : `M0 0 L${Math.cos(a0)} ${Math.sin(a0)} A1 1 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${Math.cos(a1)} ${Math.sin(a1)} Z`;
          return <path key={i} d={d} className={`slice ${shown[i] ? "slice-a" : "slice-empty"} act-part`} onClick={() => toggle(i)} role="button" aria-pressed={shown[i]} />;
        })}
      </svg>
    );
  }
  return (
    <div className="fbar act-fbar">
      {range(a.parts).map((i) => (
        <button type="button" key={i} className={`fpart ${shown[i] ? "fpart-a" : ""} act-part`} disabled={locked} aria-pressed={shown[i]} aria-label={`Part ${i + 1}`} onClick={() => toggle(i)} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- cut */

export function Cut({ a, solved, locked, onChange }: ActivityProps<Of<"cut">>) {
  const byGrid = a.rows !== undefined && a.cols !== undefined;
  const [parts, setParts] = useState(1);
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  const p = solved ? (a.parts ?? 1) : parts;
  const r = solved ? (a.rows ?? 1) : rows;
  const c = solved ? (a.cols ?? 1) : cols;
  useReport(byGrid ? rows === a.rows && cols === a.cols : parts === a.parts, onChange);
  return (
    <div className="act-cut">
      <svg viewBox="0 0 240 180" className="act-cut-shape" aria-hidden="true">
        {a.shape === "circle" ? (
          <>
            <circle cx="120" cy="90" r="80" className="rect-body rect-edge-fill" />
            {p > 1 &&
              range(p).map((i) => {
                const ang = (i / p) * 2 * Math.PI - Math.PI / 2;
                return <line key={i} x1="120" y1="90" x2={120 + 80 * Math.cos(ang)} y2={90 + 80 * Math.sin(ang)} className="act-cut-line" />;
              })}
          </>
        ) : (
          <>
            <rect x="20" y="20" width="200" height="140" rx="6" className="rect-body rect-edge-fill" />
            {byGrid
              ? [
                  ...range(c - 1).map((i) => <line key={`c${i}`} x1={20 + ((i + 1) * 200) / c} x2={20 + ((i + 1) * 200) / c} y1="20" y2="160" className="act-cut-line" />),
                  ...range(r - 1).map((i) => <line key={`r${i}`} y1={20 + ((i + 1) * 140) / r} y2={20 + ((i + 1) * 140) / r} x1="20" x2="220" className="act-cut-line" />),
                ]
              : range(p - 1).map((i) => <line key={i} x1={20 + ((i + 1) * 200) / p} x2={20 + ((i + 1) * 200) / p} y1="20" y2="160" className="act-cut-line" />)}
          </>
        )}
      </svg>
      <div className="act-steppers">
        {byGrid ? (
          <>
            <Stepper label="rows" value={r} min={1} max={6} onChange={(f) => setRows(f)} disabled={locked} />
            <Stepper label="columns" value={c} min={1} max={6} onChange={(f) => setCols(f)} disabled={locked} />
          </>
        ) : (
          <Stepper label="equal parts" value={p} min={1} max={12} onChange={(f) => setParts(f)} disabled={locked} />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- buildArray */

export function BuildArray({ a, solved, locked, onChange }: ActivityProps<Of<"buildArray">>) {
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  const r = solved ? a.rows : rows;
  const c = solved ? a.cols : cols;
  useReport((rows === a.rows && cols === a.cols) || (Boolean(a.turnable) && rows === a.cols && cols === a.rows), onChange);
  return (
    <div className="act-array">
      <div className="visual-array act-array-view" aria-hidden="true">
        {range(r).map((i) => (
          <span key={i} className="row">
            {range(c).map((k) => (
              <i key={k} />
            ))}
          </span>
        ))}
      </div>
      <div className="act-steppers">
        <Stepper label="rows" value={r} min={1} max={10} onChange={(f) => setRows(f)} disabled={locked} />
        <Stepper label="in each row" value={c} min={1} max={10} onChange={(f) => setCols(f)} disabled={locked} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- order */

export function Order({ a, solved, locked, onChange }: ActivityProps<Of<"order">>) {
  const shuffled = useMemo(() => {
    const out = [...a.items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.every((x, i) => x === a.items[i])) out.reverse();
    return out;
  }, [a.items]);
  const [picked, setPicked] = useState<string[]>([]);
  const shown = solved ? a.items : picked;
  useReport(picked.length === a.items.length && picked.every((x, i) => x === a.items[i]), onChange);
  return (
    <div className="act-order">
      <p className="act-direction">{a.direction}</p>
      <ol className="act-slots">
        {a.items.map((_, i) => (
          <li key={i}>
            {shown[i] !== undefined ? (
              <button type="button" className="act-chip placed" disabled={locked || solved} onClick={() => (sfx.tap(), setPicked((prev) => prev.filter((_, k) => k !== i)))}>
                <span className="act-slot-n">{i + 1}</span>
                {shown[i]}
              </button>
            ) : (
              <span className="act-chip empty">{i + 1}</span>
            )}
          </li>
        ))}
      </ol>
      <div className="act-pool">
        {shuffled
          .filter((x) => !shown.includes(x))
          .map((x) => (
            <button type="button" key={x} className="act-chip" disabled={locked} onClick={() => (sfx.tap(), setPicked((prev) => (prev.includes(x) ? prev : [...prev, x])))}>
              {x}
            </button>
          ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- sort */

export function Sort({ a, solved, locked, onChange }: ActivityProps<Of<"sort">>) {
  const [place, setPlace] = useState<(number | null)[]>(() => a.items.map(() => null));
  const [held, setHeld] = useState<number | null>(null);
  const shown = solved ? a.items.map((it) => it.bin) : place;
  useReport(place.every((b, i) => b === a.items[i].bin), onChange);
  const drop = (bin: number) => {
    if (held === null || locked) return;
    sfx.tap();
    setPlace(place.map((b, i) => (i === held ? bin : b)));
    setHeld(null);
  };
  const chip = (i: number) => (
    <button
      type="button"
      key={i}
      className={`act-chip${held === i ? " held" : ""}`}
      disabled={locked}
      onClick={() => {
        sfx.tap();
        setHeld(held === i ? null : i);
      }}
    >
      {a.items[i].label}
    </button>
  );
  return (
    <div className="act-sort">
      <div className="act-pool">
        {a.items.map((_, i) => (shown[i] === null ? chip(i) : null))}
        {shown.every((b) => b !== null) && !solved && <span className="act-empty">All sorted! Tap Check.</span>}
      </div>
      <div className="act-bins" style={{ "--bins": a.bins.length } as CSSProperties}>
        {a.bins.map((bin, k) => (
          <div key={k} className={`act-bin${held !== null ? " ready" : ""}`} role="button" tabIndex={0} onClick={() => drop(k)} onKeyDown={(e) => e.key === "Enter" && drop(k)}>
            <span className="act-bin-name">{bin}</span>
            <div className="act-bin-items">{a.items.map((_, i) => (shown[i] === k ? chip(i) : null))}</div>
          </div>
        ))}
      </div>
      {held !== null && <p className="act-tip-text">Now tap the box it goes in.</p>}
    </div>
  );
}

export { fewestCoins };
