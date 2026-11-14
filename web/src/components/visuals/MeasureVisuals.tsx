import { Art } from "../art/Art";
import { num, SERIES } from "./NumberVisuals";

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/* -------------------------------------------------------------------- clock */

export function Clock({ h, m }: { h: number; m: number }) {
  const hourDeg = ((h % 12) + m / 60) * 30;
  const minDeg = m * 6;
  const hand = (deg: number, len: number) => ({
    x: 100 + len * Math.sin((deg * Math.PI) / 180),
    y: 100 - len * Math.cos((deg * Math.PI) / 180),
  });
  const hh = hand(hourDeg, 46);
  const mm = hand(minDeg, 70);
  return (
    <svg className="clock" viewBox="0 0 200 200" role="img" aria-label="A clock">
      <circle cx="100" cy="100" r="92" className="clock-rim" />
      <circle cx="100" cy="100" r="82" className="clock-face" />
      {range(60).map((i) => {
        const big = i % 5 === 0;
        const a = hand(i * 6, 80);
        const b = hand(i * 6, big ? 70 : 75);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={big ? "clock-tick big" : "clock-tick"} />;
      })}
      {range(12).map((i) => {
        const n = i + 1;
        const p = hand(n * 30, 58);
        return (
          <text key={n} x={p.x} y={p.y + 7} className="clock-num">
            {n}
          </text>
        );
      })}
      <line x1="100" y1="100" x2={hh.x} y2={hh.y} className="clock-hour" />
      <line x1="100" y1="100" x2={mm.x} y2={mm.y} className="clock-minute" />
      <circle cx="100" cy="100" r="6" className="clock-pin" />
    </svg>
  );
}

/* -------------------------------------------------------------------- coins */

const COIN: Record<number, { name: string; label: string; cls: string }> = {
  1: { name: "penny", label: "1¢", cls: "coin penny" },
  5: { name: "nickel", label: "5¢", cls: "coin nickel" },
  10: { name: "dime", label: "10¢", cls: "coin dime" },
  25: { name: "quarter", label: "25¢", cls: "coin quarter" },
  100: { name: "one-dollar bill", label: "$1", cls: "bill" },
  500: { name: "five-dollar bill", label: "$5", cls: "bill" },
};

export function Coins({ coins }: { coins: number[] }) {
  const sorted = [...coins].sort((a, b) => b - a);
  return (
    <div className="coins">
      {sorted.map((c, i) => {
        const info = COIN[c] ?? { name: `${c} cents`, label: `${c}¢`, cls: "coin" };
        return (
          <span key={i} className={info.cls} aria-label={info.name} role="img">
            {info.label}
          </span>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------- ruler */

export function Ruler({ length, unit, emoji }: { length: number; unit: "cm" | "in"; emoji?: string }) {
  const units = Math.max(6, Math.ceil(length) + 1);
  const W = 600;
  const pad = 24;
  const u = (W - pad * 2) / units;
  const sub = unit === "in" ? 4 : 2;
  return (
    <svg className="ruler" viewBox={`0 0 ${W} 150`} role="img" aria-label={`A ${unit === "in" ? "inch" : "centimeter"} ruler`}>
      {/* Drawn to exact length so measuring is honest; the emoji only names the object. */}
      {emoji && (
        <text x={pad} y="20" className="ruler-tag">
          {emoji}
        </text>
      )}
      <g className="ruler-thing">
        <rect x={pad} y="30" width={Math.max(0, length * u - 22)} height="28" rx="5" />
        <path d={`M${pad + length * u - 22} 30 L${pad + length * u} 44 L${pad + length * u - 22} 58 Z`} className="ruler-tip" />
        <line x1={pad} x2={pad} y1="58" y2="72" className="ruler-guide" />
        <line x1={pad + length * u} x2={pad + length * u} y1="44" y2="72" className="ruler-guide" />
      </g>
      <rect x={pad - 10} y="72" width={W - pad * 2 + 20} height="66" rx="8" className="ruler-body" />
      {range(units * sub + 1).map((i) => {
        const x = pad + (i / sub) * u;
        const whole = i % sub === 0;
        const half = !whole && (i * 2) % sub === 0;
        return <line key={i} x1={x} x2={x} y1="72" y2={whole ? 100 : half ? 92 : 86} className="ruler-tick" />;
      })}
      {range(units + 1).map((i) => (
        <text key={i} x={pad + i * u} y="124" className="ruler-num">
          {i}
        </text>
      ))}
      <text x={W - pad - 4} y="88" className="ruler-unit">
        {unit}
      </text>
    </svg>
  );
}

export function Lengths({ items, units }: { items: { name: string; length: number }[]; units?: boolean }) {
  const max = Math.max(...items.map((i) => i.length));
  return (
    <div className="lengths">
      {items.map((it, i) => (
        <div className="length-row" key={i}>
          <span className="length-name">{it.name}</span>
          <span className="length-track">
            <span
              className="length-bar"
              style={
                {
                  width: `${(it.length / max) * 100}%`,
                  backgroundColor: `var(--${SERIES[i % SERIES.length]})`,
                  boxShadow: `inset 0 -5px 0 var(--${SERIES[i % SERIES.length]}-deep)`,
                  "--u": `calc(100% / ${it.length})`,
                } as React.CSSProperties
              }
              data-units={units ? "" : undefined}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- graphs */

export function Bars({ title, items, max, step }: { title: string; items: { label: string; value: number }[]; max: number; step: number }) {
  const H = 200;
  const left = 44;
  const W = 360;
  const bw = Math.min(56, (W - left - 10) / items.length - 14);
  const gap = (W - left - items.length * bw) / (items.length + 1);
  const y = (v: number) => 20 + H - (v / max) * H;
  const lines = range(Math.floor(max / step) + 1).map((i) => i * step);
  return (
    <figure className="graph">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 60}`} role="img" aria-label={`Bar graph: ${title}`}>
        {lines.map((v) => (
          <g key={v}>
            <line x1={left} x2={W} y1={y(v)} y2={y(v)} className={v === 0 ? "axis" : "gridline"} />
            <text x={left - 8} y={y(v) + 5} className="grid-num end">
              {num(v)}
            </text>
          </g>
        ))}
        {items.map((it, i) => {
          const x = left + gap + i * (bw + gap);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y(it.value)}
                width={bw}
                height={Math.max(0, y(0) - y(it.value))}
                rx="6"
                style={{ fill: `var(--${SERIES[i % SERIES.length]})`, stroke: `var(--${SERIES[i % SERIES.length]}-deep)` }}
                className="bar"
              />
              <text x={x + bw / 2} y={y(0) + 24} className="bar-label">
                {it.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function Pictograph({
  title,
  items,
  keyValue,
}: {
  title: string;
  items: { label: string; emoji: string; count: number }[];
  keyValue: number;
}) {
  return (
    <figure className="graph pictograph">
      <figcaption>{title}</figcaption>
      <div className="picto-rows">
        {items.map((it, i) => (
          <div className="picto-row" key={i}>
            <span className="picto-label">{it.label}</span>
            <span className="picto-icons">
              {range(Math.floor(it.count)).map((k) => (
                <span key={k}>
                  <Art emoji={it.emoji} />
                </span>
              ))}
              {it.count % 1 !== 0 && (
                <span className="half">
                  <Art emoji={it.emoji} />
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      {keyValue !== 1 && (
        <p className="picto-key">
          Each {items[0]?.emoji} = {keyValue}
        </p>
      )}
    </figure>
  );
}

function fracLabel(v: number): string {
  if (Number.isInteger(v)) return num(v);
  for (const d of [2, 4, 8, 3, 10]) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) {
      const whole = Math.floor(n / d);
      const rest = n - whole * d;
      return whole ? `${whole} ${rest}/${d}` : `${rest}/${d}`;
    }
  }
  return num(v);
}

export function Dots({
  values,
  min,
  max,
  label,
  second,
}: {
  values: number[];
  min: number;
  max: number;
  label?: string;
  second?: { values: number[]; label: string };
}) {
  if (second) {
    return (
      <div className="dots-pair">
        <Dots values={values} min={min} max={max} label={label} />
        <Dots values={second.values} min={min} max={max} label={second.label} />
      </div>
    );
  }
  const fine = values.some((v) => !Number.isInteger(v));
  let step = 1;
  if (fine) {
    for (const d of [2, 4, 8, 3, 10]) {
      if (values.every((v) => Math.abs(Math.round(v * d) - v * d) < 1e-9)) {
        step = 1 / d;
        break;
      }
    }
  }
  const W = 560;
  const pad = 30;
  const n = Math.round((max - min) / step);
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - pad * 2);
  const stacks = new Map<number, number>();
  return (
    <figure className="graph">
      {label && <figcaption>{label}</figcaption>}
      <svg viewBox={`0 0 ${W} 200`} role="img" aria-label="Dot plot">
        <line x1={pad - 10} x2={W - pad + 10} y1="160" y2="160" className="axis" />
        {range(n + 1).map((i) => {
          const v = min + i * step;
          return (
            <g key={i}>
              <line x1={x(v)} x2={x(v)} y1="154" y2="166" className="axis" />
              <text x={x(v)} y="188" className="grid-num">
                {fracLabel(v)}
              </text>
            </g>
          );
        })}
        {values.map((v, i) => {
          const k = Math.round(v * 1000);
          const level = stacks.get(k) ?? 0;
          stacks.set(k, level + 1);
          return <circle key={i} cx={x(v)} cy={142 - level * 17} r="7" className="dot-mark" />;
        })}
      </svg>
    </figure>
  );
}

/* ------------------------------------------------------------ jug, scale */

function niceMarks(max: number) {
  const target = max / 5;
  const pow = 10 ** Math.floor(Math.log10(target));
  const m = target / pow;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export function Jug({ amount, max, unit }: { amount: number; max: number; unit: string }) {
  const top = 40;
  const bottom = 230;
  const level = bottom - (amount / max) * (bottom - top);
  return (
    <svg className="jug" viewBox="0 0 240 260" role="img" aria-label={`A measuring jug with ${num(amount)} ${unit}`}>
      <defs>
        <clipPath id="jug-inside">
          <path d="M50 30 L170 30 L162 236 Q160 244 150 244 L70 244 Q60 244 58 236 Z" />
        </clipPath>
      </defs>
      <path d="M170 60 Q215 70 210 120 Q205 160 166 170" className="jug-handle" />
      <rect x="40" y={level} width="140" height={260 - level} className="jug-water" clipPath="url(#jug-inside)" />
      <path d="M50 30 L170 30 L162 236 Q160 244 150 244 L70 244 Q60 244 58 236 Z" className="jug-glass" />
      {niceMarks(max).map((v) => {
        const y = bottom - (v / max) * (bottom - top);
        return (
          <g key={v}>
            <line x1="60" x2="84" y1={y} y2={y} className="jug-mark" />
            <text x="90" y={y + 5} className="jug-num">
              {num(v)} {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Scale({ amount, max, unit, emoji }: { amount: number; max: number; unit: string; emoji?: string }) {
  const cx = 150;
  const cy = 170;
  const R = 92;
  const angle = Math.PI - (Math.min(amount, max) / max) * Math.PI;
  const tip = { x: cx + (R - 14) * Math.cos(angle), y: cy - (R - 14) * Math.sin(angle) };
  return (
    <svg className="jug" viewBox="0 0 300 250" role="img" aria-label={`A scale showing ${num(amount)} ${unit}`}>
      <rect x="40" y="40" width="220" height="12" rx="6" className="scale-pan" />
      {emoji && (
        <text x="150" y="36" className="scale-emoji">
          {emoji}
        </text>
      )}
      <rect x="52" y="60" width="196" height="170" rx="26" className="scale-body" />
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`} className="scale-dial" />
      {[0, ...niceMarks(max)].map((v) => {
        const a = Math.PI - (v / max) * Math.PI;
        const p1 = { x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) };
        const p2 = { x: cx + (R - 12) * Math.cos(a), y: cy - (R - 12) * Math.sin(a) };
        const t = { x: cx + (R - 28) * Math.cos(a), y: cy - (R - 28) * Math.sin(a) };
        return (
          <g key={v}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="jug-mark" />
            <text x={t.x} y={t.y + 5} className="scale-num">
              {num(v)}
            </text>
          </g>
        );
      })}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} className="scale-needle" />
      <circle cx={cx} cy={cy} r="7" className="clock-pin" />
      <text x={cx} y={cy + 40} className="scale-unit">
        {unit}
      </text>
    </svg>
  );
}
