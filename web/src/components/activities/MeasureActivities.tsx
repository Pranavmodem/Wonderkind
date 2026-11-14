import { useState } from "react";
import { sfx } from "../../game/sound";
import type { Activity } from "../../game/types";
import { num, SERIES } from "../visuals/NumberVisuals";
import { dragHandlers, near, range, snap, useReport, type ActivityProps } from "./shared";

type Of<K extends Activity["kind"]> = Extract<Activity, { kind: K }>;

/* ---------------------------------------------------------------- setClock */

export function SetClock({ a, solved, locked, onChange }: ActivityProps<Of<"setClock">>) {
  const [h, setH] = useState(12);
  const [m, setM] = useState(0);
  const H = solved ? a.h : h;
  const M = solved ? a.m : m;
  useReport(h === a.h && m === a.m, onChange);
  const hand = (deg: number, len: number) => ({
    x: 100 + len * Math.sin((deg * Math.PI) / 180),
    y: 100 - len * Math.cos((deg * Math.PI) / 180),
  });
  const hh = hand(((H % 12) + M / 60) * 30, 46);
  const mm = hand(M * 6, 72);
  const move = (p: { x: number; y: number }) => {
    const deg = (Math.atan2(p.x - 100, -(p.y - 100)) * 180) / Math.PI;
    const next = (((snap((deg + 360) % 360, a.snap * 6) / 6) % 60) + 60) % 60;
    if (next !== m) sfx.tap();
    setM(next);
  };
  return (
    <div className="act-clock">
      <svg
        className="clock act-svg"
        viewBox="0 0 200 200"
        {...dragHandlers(!locked, move)}
        role="slider"
        aria-label="Drag the long hand"
        aria-valuenow={M}
      >
        <circle cx="100" cy="100" r="92" className="clock-rim" />
        <circle cx="100" cy="100" r="82" className="clock-face" />
        {range(60).map((i) => {
          const big = i % 5 === 0;
          const p1 = hand(i * 6, 80);
          const p2 = hand(i * 6, big ? 70 : 75);
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={big ? "clock-tick big" : "clock-tick"} />;
        })}
        {range(12).map((i) => {
          const p = hand((i + 1) * 30, 58);
          return (
            <text key={i} x={p.x} y={p.y + 7} className="clock-num">
              {i + 1}
            </text>
          );
        })}
        <line x1="100" y1="100" x2={hh.x} y2={hh.y} className="clock-hour" />
        <line x1="100" y1="100" x2={mm.x} y2={mm.y} className="clock-minute" />
        <circle cx={mm.x} cy={mm.y} r="9" className="act-handle" />
        <circle cx="100" cy="100" r="6" className="clock-pin" />
      </svg>
      <div className="act-steppers">
        <div className="act-stepper">
          <span className="act-stepper-label">hour</span>
          <button
            type="button"
            className="act-step"
            disabled={locked}
            onClick={() => (sfx.tap(), setH((x) => (x === 1 ? 12 : x - 1)))}
            aria-label="Hour back"
          >
            −
          </button>
          <span className="act-stepper-value">{H}</span>
          <button
            type="button"
            className="act-step"
            disabled={locked}
            onClick={() => (sfx.tap(), setH((x) => (x === 12 ? 1 : x + 1)))}
            aria-label="Hour forward"
          >
            +
          </button>
        </div>
      </div>
      <p className="act-tip-text">Drag the long hand for the minutes. Use + and − for the hour.</p>
    </div>
  );
}

/* -------------------------------------------------------------- makeLength */

export function MakeLength({ a, solved, locked, onChange }: ActivityProps<Of<"makeLength">>) {
  const [len, setLen] = useState(0);
  const units = Math.max(6, Math.ceil(a.length) + 2);
  const W = 600;
  const pad = 24;
  const u = (W - pad * 2) / units;
  const L = solved ? a.length : len;
  useReport(near(len, a.length), onChange);
  const move = (p: { x: number }) => {
    const next = Math.min(units, Math.max(0, snap((p.x - pad) / u, 1 / a.sub)));
    if (next !== len) sfx.tap();
    setLen(next);
  };
  return (
    <svg
      className="ruler act-svg"
      viewBox={`0 0 ${W} 160`}
      {...dragHandlers(!locked, move)}
      role="slider"
      aria-label="Drag to make the bar longer"
      aria-valuenow={L}
    >
      <rect x="0" y="0" width={W} height="160" fill="transparent" />
      <g className="ruler-thing">
        <rect x={pad} y="30" width={Math.max(4, L * u)} height="28" rx="5" />
      </g>
      <circle cx={pad + L * u} cy="44" r="14" className="act-handle" />
      <rect x={pad - 10} y="72" width={W - pad * 2 + 20} height="66" rx="8" className="ruler-body" />
      {range(units * a.sub + 1).map((i) => {
        const x = pad + (i / a.sub) * u;
        const whole = i % a.sub === 0;
        return <line key={i} x1={x} x2={x} y1="72" y2={whole ? 100 : (i * 2) % a.sub === 0 ? 92 : 86} className="ruler-tick" />;
      })}
      {range(units + 1).map((i) => (
        <text key={i} x={pad + i * u} y="124" className="ruler-num">
          {i}
        </text>
      ))}
      <text x={W - pad - 4} y="88" className="ruler-unit">
        {a.unit}
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------- makeAngle */

export function MakeAngle({ a, solved, locked, onChange }: ActivityProps<Of<"makeAngle">>) {
  const [deg, setDeg] = useState(30);
  const D = solved ? a.degrees : deg;
  useReport(deg === a.degrees, onChange);
  const cx = 200;
  const cy = 200;
  const R = 170;
  const p = (d: number, r: number) => ({ x: cx + r * Math.cos((d * Math.PI) / 180), y: cy - r * Math.sin((d * Math.PI) / 180) });
  const end = p(D, R - 10);
  const move = (pt: { x: number; y: number }) => {
    const ang = (Math.atan2(-(pt.y - cy), pt.x - cx) * 180) / Math.PI;
    const next = Math.min(180, Math.max(5, snap(ang < -90 ? 180 : ang < 0 ? 5 : ang, 5)));
    if (next !== deg) sfx.tap();
    setDeg(next);
  };
  return (
    <svg
      className="rect-svg act-svg"
      viewBox="0 0 400 230"
      {...dragHandlers(!locked, move)}
      role="slider"
      aria-label="Drag the ray to make the angle"
      aria-valuenow={D}
    >
      <rect x="0" y="0" width="400" height="230" fill="transparent" />
      {a.scale && (
        <g className="protractor">
          <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} className="protractor-body" />
          {range(37).map((i) => {
            const d = i * 5;
            const long = d % 10 === 0;
            const o = p(d, R);
            const n = p(d, R - (long ? 16 : 9));
            return <line key={d} x1={o.x} y1={o.y} x2={n.x} y2={n.y} className="protractor-tick" />;
          })}
          {range(19).map((i) => {
            const t = p(i * 10, R - 30);
            return (
              <text key={i} x={t.x} y={t.y + 5} className="protractor-num">
                {i * 10}
              </text>
            );
          })}
        </g>
      )}
      <line x1={cx} y1={cy} x2={cx + R - 10} y2={cy} className="ray ray-strong" />
      <line x1={cx} y1={cy} x2={end.x} y2={end.y} className="ray ray-strong ray-b" />
      <circle cx={end.x} cy={end.y} r="12" className="act-handle" />
      <circle cx={cx} cy={cy} r="6" className="center-dot" />
      {solved && (
        <text x={p(D / 2, 60).x} y={p(D / 2, 60).y} className="angle-label small">
          {D}°
        </text>
      )}
    </svg>
  );
}

/* ---------------------------------------------------------------- barGraph */

export function BarGraph({ a, solved, locked, onChange }: ActivityProps<Of<"barGraph">>) {
  const [vals, setVals] = useState<number[]>(() => a.items.map(() => 0));
  const shown = solved ? a.items.map((it) => it.value) : vals;
  useReport(
    vals.every((v, i) => near(v, a.items[i].value)),
    onChange,
  );
  const H = 220;
  const left = 44;
  const W = 380;
  const bw = Math.min(56, (W - left - 10) / a.items.length - 14);
  const gap = (W - left - a.items.length * bw) / (a.items.length + 1);
  const y = (v: number) => 20 + H - (v / a.max) * H;
  const [active, setActive] = useState<number | null>(null);
  const move = (p: { x: number; y: number }) => {
    const i = active ?? Math.floor((p.x - left - gap / 2) / (bw + gap));
    if (i < 0 || i >= a.items.length) return;
    if (active === null) setActive(i);
    const v = Math.min(a.max, Math.max(0, snap(((20 + H - p.y) / H) * a.max, a.step)));
    if (v !== vals[i]) sfx.tap();
    setVals(vals.map((x, k) => (k === i ? v : x)));
  };
  return (
    <div className="act-graph">
      <figure className="graph">
        <figcaption>{a.title}</figcaption>
        <svg
          viewBox={`0 0 ${W} ${H + 60}`}
          {...dragHandlers(!locked, move)}
          onPointerUp={(e) => {
            delete e.currentTarget.dataset.dragging;
            setActive(null);
          }}
          className="act-svg"
          role="group"
          aria-label="Drag each bar up or down"
        >
          <rect x="0" y="0" width={W} height={H + 60} fill="transparent" />
          {range(Math.floor(a.max / a.step) + 1).map((i) => {
            const v = i * a.step;
            return (
              <g key={v}>
                <line x1={left} x2={W} y1={y(v)} y2={y(v)} className={v === 0 ? "axis" : "gridline"} />
                <text x={left - 8} y={y(v) + 5} className="grid-num end">
                  {num(v)}
                </text>
              </g>
            );
          })}
          {a.items.map((it, i) => {
            const x = left + gap + i * (bw + gap);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y(shown[i])}
                  width={bw}
                  height={Math.max(0, y(0) - y(shown[i]))}
                  rx="6"
                  className="bar"
                  style={{ fill: `var(--${SERIES[i % SERIES.length]})`, stroke: `var(--${SERIES[i % SERIES.length]}-deep)` }}
                />
                <rect x={x} y={y(shown[i]) - 6} width={bw} height="12" rx="6" className="act-bar-grip" />
                <text x={x + bw / 2} y={y(0) + 24} className="bar-label">
                  {it.label}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>
      {!a.hideData && (
        <table className="vtable act-data">
          <thead>
            <tr>
              <th colSpan={2}>Data</th>
            </tr>
          </thead>
          <tbody>
            {a.items.map((it) => (
              <tr key={it.label}>
                <td>{it.label}</td>
                <td>{num(it.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- dotPlot */

export function DotPlot({ a, solved, locked, onChange }: ActivityProps<Of<"dotPlot">>) {
  const cols = range(Math.round((a.max - a.min) / a.step) + 1).map((i) => a.min + i * a.step);
  const target = cols.map((c) => a.values.filter((v) => near(v, c)).length);
  const [counts, setCounts] = useState<number[]>(() => cols.map(() => 0));
  const shown = solved ? target : counts;
  useReport(
    counts.every((n, i) => n === target[i]),
    onChange,
  );
  const W = 560;
  const pad = 30;
  const x = (i: number) => pad + (i / Math.max(1, cols.length - 1)) * (W - pad * 2);
  const label = (v: number) => {
    if (Number.isInteger(v)) return num(v);
    for (const d of [2, 4, 8, 3]) {
      const n = Math.round(v * d);
      if (near(n / d, v)) {
        const w = Math.floor(n / d);
        return w ? `${w} ${n - w * d}/${d}` : `${n}/${d}`;
      }
    }
    return num(v);
  };
  const tallest = Math.max(4, ...target, ...counts);
  const step = Math.min(17, 150 / tallest);
  const tap = (i: number, remove: boolean) => {
    if (locked) return;
    sfx.tap();
    setCounts((prev) => prev.map((n, k) => (k === i ? Math.max(0, n + (remove ? -1 : 1)) : n)));
  };
  return (
    <div className="act-dots">
      <p className="act-data-line">
        <strong>Data:</strong> {a.values.map(label).join(", ")}
      </p>
      <figure className="graph">
        {a.label && <figcaption>{a.label}</figcaption>}
        <svg viewBox={`0 0 ${W} 220`} role="group" aria-label="Tap above a number to add a dot">
          {cols.map((_, i) => (
            <rect
              key={`hit${i}`}
              x={x(i) - 18}
              y="0"
              width="36"
              height="170"
              fill="transparent"
              className="act-col"
              onClick={() => tap(i, false)}
            />
          ))}
          <line x1={pad - 10} x2={W - pad + 10} y1="180" y2="180" className="axis" />
          {cols.map((c, i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1="174" y2="186" className="axis" />
              <text x={x(i)} y="208" className="grid-num">
                {label(c)}
              </text>
              {range(shown[i]).map((k) => (
                <circle
                  key={k}
                  cx={x(i)}
                  cy={164 - k * step}
                  r="7"
                  className="dot-mark"
                  onClick={(e) => {
                    e.stopPropagation();
                    tap(i, true);
                  }}
                />
              ))}
            </g>
          ))}
        </svg>
      </figure>
      <p className="act-tip-text">Tap above a number to add a dot. Tap a dot to take it away.</p>
    </div>
  );
}
