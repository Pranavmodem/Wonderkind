import type { ShapeName } from "../../game/types";
import { num, SERIES } from "./NumberVisuals";

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

function regular(sides: number, r: number, cx = 0, cy = 0, rot = -Math.PI / 2) {
  return range(sides)
    .map((i) => {
      const a = rot + (i / sides) * 2 * Math.PI;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    })
    .join(" ");
}

/* ------------------------------------------------------------- 2D/3D shapes */

/** One shape drawn in a 100×100 box, filled with `colour` (a CSS colour token name). */
export function ShapeSvg({ shape, colour = "w", size }: { shape: ShapeName; colour?: string; size?: number }) {
  const fill = colour === "w" ? "var(--w)" : `var(--${colour})`;
  const deep = colour === "w" ? "var(--w-deep)" : `var(--${colour}-deep)`;
  const common = {
    fill,
    stroke: deep,
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
  };
  const light = "rgb(255 255 255 / 0.35)";
  let body;
  switch (shape) {
    case "circle":
      body = <circle cx="50" cy="50" r="40" {...common} />;
      break;
    case "semicircle":
      body = <path d="M8 68 A42 42 0 0 1 92 68 Z" {...common} />;
      break;
    case "triangle":
      body = <polygon points="50,10 92,86 8,86" {...common} />;
      break;
    case "square":
      body = <rect x="14" y="14" width="72" height="72" rx="3" {...common} />;
      break;
    case "rectangle":
      body = <rect x="6" y="26" width="88" height="48" rx="3" {...common} />;
      break;
    case "pentagon":
      body = <polygon points={regular(5, 42, 50, 54)} {...common} />;
      break;
    case "hexagon":
      body = <polygon points={regular(6, 42, 50, 50, 0)} {...common} />;
      break;
    case "octagon":
      body = <polygon points={regular(8, 42, 50, 50, Math.PI / 8)} {...common} />;
      break;
    case "rhombus":
      body = <polygon points="50,6 86,50 50,94 14,50" {...common} />;
      break;
    case "trapezoid":
      body = <polygon points="30,24 70,24 94,78 6,78" {...common} />;
      break;
    case "parallelogram":
      body = <polygon points="28,24 94,24 72,78 6,78" {...common} />;
      break;
    case "cube":
      body = (
        <g {...common}>
          <polygon points="18,34 62,34 62,82 18,82" />
          <polygon points="18,34 38,18 82,18 62,34" fill={light} />
          <polygon points="62,34 82,18 82,66 62,82" fill="rgb(0 0 0 / 0.12)" />
        </g>
      );
      break;
    case "prism":
      body = (
        <g {...common}>
          <polygon points="8,40 70,40 70,82 8,82" />
          <polygon points="8,40 28,24 90,24 70,40" fill={light} />
          <polygon points="70,40 90,24 90,66 70,82" fill="rgb(0 0 0 / 0.12)" />
        </g>
      );
      break;
    case "sphere":
      body = (
        <g>
          <circle cx="50" cy="50" r="40" {...common} />
          <ellipse cx="50" cy="50" rx="40" ry="12" fill="none" stroke={deep} strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="36" cy="34" r="9" fill={light} />
        </g>
      );
      break;
    case "cone":
      body = (
        <g {...common}>
          <path d="M50 8 L86 80 A36 11 0 0 1 14 80 Z" />
          <ellipse cx="50" cy="80" rx="36" ry="11" fill="rgb(0 0 0 / 0.1)" />
        </g>
      );
      break;
    case "cylinder":
      body = (
        <g {...common}>
          <path d="M16 22 V78 A34 11 0 0 0 84 78 V22" />
          <ellipse cx="50" cy="22" rx="34" ry="11" fill={light} />
        </g>
      );
      break;
    case "triangular-prism":
      body = (
        <g {...common}>
          <polygon points="10,80 70,80 40,30" />
          <polygon points="40,30 70,80 92,62 62,14" fill="rgb(0 0 0 / 0.12)" />
          <polygon points="40,30 62,14" />
        </g>
      );
      break;
    case "house":
      body = <polygon points="16,46 50,12 84,46 84,90 16,90" {...common} />;
      break;
    case "pyramid":
      body = (
        <g {...common}>
          <polygon points="50,8 14,78 62,90" />
          <polygon points="50,8 62,90 90,70" fill="rgb(0 0 0 / 0.12)" />
        </g>
      );
      break;
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shape-svg" role="img" aria-label="A shape">
      {body}
    </svg>
  );
}

export function Shapes({ shapes }: { shapes: ShapeName[] }) {
  return (
    <div className="shape-row">
      {shapes.map((s, i) => (
        <ShapeSvg key={i} shape={s} colour={SERIES[i % SERIES.length]} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- rectangles */

export function Rect({
  w,
  h,
  showW,
  showH,
  inside,
  grid,
  unit,
}: {
  w: number;
  h: number;
  showW: boolean;
  showH: boolean;
  inside?: string;
  grid: boolean;
  unit: string;
}) {
  const max = 300;
  const s = Math.min(max / w, 200 / h, 46);
  const W = w * s;
  const H = h * s;
  const pad = 54;
  const left = 96;
  return (
    <svg className="rect-svg" viewBox={`0 0 ${W + pad + left} ${H + pad * 2}`} role="img" aria-label="Rectangle">
      <g transform={`translate(${left - pad} 0)`}>
        <rect x={pad} y={pad} width={W} height={H} className="rect-body" />
        {grid &&
          range(w - 1).map((i) => (
            <line key={`v${i}`} x1={pad + (i + 1) * s} x2={pad + (i + 1) * s} y1={pad} y2={pad + H} className="rect-grid" />
          ))}
        {grid &&
          range(h - 1).map((i) => (
            <line key={`h${i}`} y1={pad + (i + 1) * s} y2={pad + (i + 1) * s} x1={pad} x2={pad + W} className="rect-grid" />
          ))}
        <rect x={pad} y={pad} width={W} height={H} className="rect-edge" />
        <text x={pad + W / 2} y={pad - 16} className={`side-label${showW ? "" : " ask"}`}>
          {showW ? `${num(w)} ${unit}` : "?"}
        </text>
        <text x={pad - 14} y={pad + H / 2 + 7} className={`side-label end${showH ? "" : " ask"}`}>
          {showH ? `${num(h)} ${unit}` : "?"}
        </text>
        {inside && (
          <text x={pad + W / 2} y={pad + H / 2 + 8} className="rect-inside">
            {inside}
          </text>
        )}
      </g>
    </svg>
  );
}

export function RectsRow({ items, unit, grid }: { items: { w: number; h: number; label: string }[]; unit: string; grid: boolean }) {
  const maxW = Math.max(...items.map((i) => i.w));
  const maxH = Math.max(...items.map((i) => i.h));
  const s = Math.min(150 / maxW, 110 / maxH, 28);
  return (
    <div className="rects-row">
      {items.map((it, k) => (
        <figure key={k} className="rects-item">
          <svg viewBox={`0 0 ${it.w * s + 80} ${it.h * s + 60}`} style={{ width: it.w * s + 80 }} role="img" aria-label={it.label}>
            <rect x="56" y="30" width={it.w * s} height={it.h * s} className="rect-body" />
            {grid &&
              range(it.w - 1).map((i) => <line key={`v${i}`} x1={56 + (i + 1) * s} x2={56 + (i + 1) * s} y1={30} y2={30 + it.h * s} className="rect-grid" />)}
            {grid &&
              range(it.h - 1).map((i) => <line key={`h${i}`} y1={30 + (i + 1) * s} y2={30 + (i + 1) * s} x1={56} x2={56 + it.w * s} className="rect-grid" />)}
            <rect x="56" y="30" width={it.w * s} height={it.h * s} className="rect-edge" />
            <text x={56 + (it.w * s) / 2} y="20" className="side-label small">
              {num(it.w)} {unit}
            </text>
            <text x="48" y={30 + (it.h * s) / 2 + 6} className="side-label small end">
              {num(it.h)} {unit}
            </text>
          </svg>
          <figcaption>{it.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function LShape({ w, h, cutW, cutH, unit, grid, hideSides }: { w: number; h: number; cutW: number; cutH: number; unit: string; grid: boolean; hideSides?: boolean }) {
  const s = Math.min(300 / w, 220 / h, 42);
  const x0 = 70;
  const y0 = 40;
  const P = (x: number, y: number) => `${x0 + x * s},${y0 + y * s}`;
  const pts = [P(0, 0), P(w - cutW, 0), P(w - cutW, cutH), P(w, cutH), P(w, h), P(0, h)].join(" ");
  const id = `lshape-${w}-${h}-${cutW}-${cutH}`;
  const label = (v: number) => (hideSides ? "" : `${num(v)} ${unit}`);
  return (
    <svg className="rect-svg" viewBox={`0 0 ${w * s + 150} ${h * s + 90}`} role="img" aria-label="L-shaped figure">
      <defs>
        <clipPath id={id}>
          <polygon points={pts} />
        </clipPath>
      </defs>
      <polygon points={pts} className="rect-body" />
      {grid && (
        <g clipPath={`url(#${id})`}>
          {range(w - 1).map((i) => (
            <line key={`v${i}`} x1={x0 + (i + 1) * s} x2={x0 + (i + 1) * s} y1={y0} y2={y0 + h * s} className="rect-grid" />
          ))}
          {range(h - 1).map((i) => (
            <line key={`h${i}`} y1={y0 + (i + 1) * s} y2={y0 + (i + 1) * s} x1={x0} x2={x0 + w * s} className="rect-grid" />
          ))}
        </g>
      )}
      <polygon points={pts} className="rect-edge" />
      <text x={x0 + ((w - cutW) * s) / 2} y={y0 - 12} className="side-label small">
        {label(w - cutW)}
      </text>
      <text x={x0 + (w - cutW) * s + 8} y={y0 + (cutH * s) / 2 + 6} className="side-label small start">
        {label(cutH)}
      </text>
      <text x={x0 + (w - cutW / 2) * s} y={y0 + cutH * s - 10} className="side-label small">
        {label(cutW)}
      </text>
      <text x={x0 + w * s + 8} y={y0 + ((cutH + h) / 2) * s + 6} className="side-label small start">
        {label(h - cutH)}
      </text>
      <text x={x0 + (w * s) / 2} y={y0 + h * s + 28} className="side-label small">
        {label(w)}
      </text>
      <text x={x0 - 10} y={y0 + (h * s) / 2 + 6} className="side-label small end">
        {label(h)}
      </text>
    </svg>
  );
}

export function Polygon({
  shape,
  base,
  height,
  top,
  unit,
}: {
  shape: "triangle" | "parallelogram" | "trapezoid";
  base: number;
  height: number;
  top?: number;
  unit: string;
}) {
  const W = 300;
  const s = W / Math.max(base, top ?? 0);
  const H = Math.min(170, Math.max(70, height * s * 0.6));
  const x0 = 40;
  const y0 = 30;
  const B = base * s;
  let points: string;
  let hx: number;
  if (shape === "triangle") {
    hx = x0 + B * 0.62;
    points = `${x0},${y0 + H} ${x0 + B},${y0 + H} ${hx},${y0}`;
  } else if (shape === "parallelogram") {
    const off = 50;
    hx = x0 + off;
    points = `${x0 + off},${y0} ${x0 + B},${y0} ${x0 + B - off},${y0 + H} ${x0},${y0 + H}`;
  } else {
    const T = (top ?? base / 2) * s;
    const left = x0 + (B - T) / 2;
    hx = left;
    points = `${left},${y0} ${left + T},${y0} ${x0 + B},${y0 + H} ${x0},${y0 + H}`;
  }
  return (
    <svg className="rect-svg" viewBox={`0 0 ${W + 90} ${H + 90}`} role="img" aria-label={shape}>
      <polygon points={points} className="rect-body rect-edge-fill" />
      <line x1={hx} x2={hx} y1={y0} y2={y0 + H} className="height-line" />
      <polyline points={`${hx},${y0 + H - 12} ${hx + 12},${y0 + H - 12} ${hx + 12},${y0 + H}`} className="right-mark" />
      <text x={x0 + B / 2} y={y0 + H + 34} className="side-label">
        {num(base)} {unit}
      </text>
      <text x={shape === "triangle" ? hx - 12 : hx + 18} y={y0 + H / 2 + 6} className={`side-label ${shape === "triangle" ? "end" : "start"}`}>
        {num(height)} {unit}
      </text>
      {shape === "trapezoid" && top !== undefined && (
        <text x={x0 + B / 2} y={y0 - 10} className="side-label">
          {num(top)} {unit}
        </text>
      )}
    </svg>
  );
}

export function Box({ l, w, h, unit, cubes }: { l: number; w: number; h: number; unit: string; cubes?: boolean }) {
  const s = Math.min(200 / (l + w * 0.5), 150 / (h + w * 0.5), 40);
  const L = l * s;
  const H = h * s;
  const D = w * s * 0.5;
  const x0 = 86;
  const y0 = 20 + D;
  const front = `${x0},${y0} ${x0 + L},${y0} ${x0 + L},${y0 + H} ${x0},${y0 + H}`;
  const topFace = `${x0},${y0} ${x0 + D},${y0 - D} ${x0 + L + D},${y0 - D} ${x0 + L},${y0}`;
  const side = `${x0 + L},${y0} ${x0 + L + D},${y0 - D} ${x0 + L + D},${y0 + H - D} ${x0 + L},${y0 + H}`;
  const show = cubes && l <= 8 && w <= 8 && h <= 8;
  return (
    <svg className="rect-svg" viewBox={`0 0 ${L + D + 160} ${H + D + 80}`} role="img" aria-label="Box">
      <polygon points={front} className="box-front" />
      <polygon points={topFace} className="box-top" />
      <polygon points={side} className="box-side" />
      {show && (
        <g className="box-grid">
          {range(l - 1).map((i) => (
            <line key={`fl${i}`} x1={x0 + (i + 1) * s} x2={x0 + (i + 1) * s} y1={y0} y2={y0 + H} />
          ))}
          {range(h - 1).map((i) => (
            <line key={`fh${i}`} x1={x0} x2={x0 + L} y1={y0 + (i + 1) * s} y2={y0 + (i + 1) * s} />
          ))}
          {range(l - 1).map((i) => (
            <line key={`tl${i}`} x1={x0 + (i + 1) * s} x2={x0 + (i + 1) * s + D} y1={y0} y2={y0 - D} />
          ))}
          {range(w - 1).map((i) => {
            const f = ((i + 1) / w) * D;
            return <line key={`tw${i}`} x1={x0 + f} x2={x0 + L + f} y1={y0 - f} y2={y0 - f} />;
          })}
          {range(h - 1).map((i) => (
            <line key={`sh${i}`} x1={x0 + L} x2={x0 + L + D} y1={y0 + (i + 1) * s} y2={y0 + (i + 1) * s - D} />
          ))}
          {range(w - 1).map((i) => {
            const f = ((i + 1) / w) * D;
            return <line key={`sw${i}`} x1={x0 + L + f} x2={x0 + L + f} y1={y0 - f} y2={y0 + H - f} />;
          })}
        </g>
      )}
      <text x={x0 + L / 2} y={y0 + H + 30} className="side-label">
        {num(l)} {unit}
      </text>
      <text x={x0 - 12} y={y0 + H / 2 + 6} className="side-label end">
        {num(h)} {unit}
      </text>
      <text x={x0 + L + D / 2 + 14} y={y0 + H - D / 2 + 22} className="side-label start">
        {num(w)} {unit}
      </text>
    </svg>
  );
}

export function CircleFig({ r, show, unit }: { r: number; show: "radius" | "diameter"; unit: string }) {
  return (
    <svg className="rect-svg circle-svg" viewBox="0 0 240 240" role="img" aria-label="Circle">
      <circle cx="120" cy="120" r="96" className="rect-body rect-edge-fill" />
      <circle cx="120" cy="120" r="5" className="center-dot" />
      {show === "radius" ? (
        <line x1="120" y1="120" x2="216" y2="120" className="radius-line" />
      ) : (
        <line x1="24" y1="120" x2="216" y2="120" className="radius-line" />
      )}
      <text x={show === "radius" ? 168 : 120} y="108" className="side-label">
        {show === "radius" ? "r" : "d"} = {num(show === "radius" ? r : r * 2)} {unit}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ angles */

function arcLabel(cx: number, cy: number, r: number, a0: number, a1: number) {
  const mid = ((a0 + a1) / 2) * (Math.PI / 180);
  return { x: cx + r * Math.cos(mid), y: cy - r * Math.sin(mid) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = {
    x: cx + r * Math.cos((a0 * Math.PI) / 180),
    y: cy - r * Math.sin((a0 * Math.PI) / 180),
  };
  const p1 = {
    x: cx + r * Math.cos((a1 * Math.PI) / 180),
    y: cy - r * Math.sin((a1 * Math.PI) / 180),
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${p0.x} ${p0.y} A${r} ${r} 0 ${large} 0 ${p1.x} ${p1.y}`;
}

export function Angles({ mode, angles: given, solved }: { mode: "line" | "triangle" | "around" | "parts"; angles: number[]; solved: boolean }) {
  // The unknown angle may be left out; it's whatever completes 180° or 360°.
  const full = mode === "around" ? 360 : 180;
  const sum = given.reduce((t, a) => t + a, 0);
  const angles = mode !== "parts" && sum < full - 0.01 ? [...given, full - sum] : given;
  const label = (i: number) => (i === angles.length - 1 && !solved ? "?" : `${num(angles[i])}°`);
  if (mode === "triangle") {
    const [A, B] = angles;
    const C = 180 - A - B;
    const rad = (d: number) => (d * Math.PI) / 180;
    const base = 1;
    const sideB = (base * Math.sin(rad(B))) / Math.sin(rad(C));
    const apex = { x: sideB * Math.cos(rad(A)), y: sideB * Math.sin(rad(A)) };
    const xs = [0, base, apex.x];
    const ys = [0, 0, apex.y];
    const minX = Math.min(...xs);
    const spanX = Math.max(...xs) - minX;
    const spanY = Math.max(...ys);
    const k = Math.min(300 / spanX, 190 / spanY);
    const P = (x: number, y: number) => ({
      x: 40 + (x - minX) * k,
      y: 220 - y * k,
    });
    const a = P(0, 0);
    const b = P(base, 0);
    const c = P(apex.x, apex.y);
    const inward = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) => {
      const mx = (q.x + r.x) / 2 - p.x;
      const my = (q.y + r.y) / 2 - p.y;
      const len = Math.hypot(mx, my) || 1;
      return { x: p.x + (mx / len) * 38, y: p.y + (my / len) * 38 + 6 };
    };
    const la = inward(a, b, c);
    const lb = inward(b, a, c);
    const lc = inward(c, a, b);
    return (
      <svg className="rect-svg" viewBox="0 0 380 250" role="img" aria-label="Triangle with angles">
        <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`} className="rect-body rect-edge-fill" />
        <text x={la.x} y={la.y} className="angle-label">
          {label(0)}
        </text>
        <text x={lb.x} y={lb.y} className="angle-label">
          {label(1)}
        </text>
        <text x={lc.x} y={lc.y} className={`angle-label${solved ? "" : " ask"}`}>
          {label(2)}
        </text>
      </svg>
    );
  }
  const cx = 190;
  const flat = mode === "line" || mode === "parts";
  const cy = flat ? 170 : 130;
  const R = 130;
  let start = 0;
  const rays: number[] = [0];
  angles.forEach((a) => {
    start += a;
    rays.push(start);
  });
  let acc = 0;
  return (
    <svg className="rect-svg" viewBox={`0 0 380 ${flat ? 200 : 260}`} role="img" aria-label="Angles">
      {mode === "line" ? <line x1={cx - R - 20} x2={cx + R + 20} y1={cy} y2={cy} className="ray" /> : null}
      {(mode === "parts" ? rays : rays.slice(0, -1)).map((deg, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + R * Math.cos((deg * Math.PI) / 180)}
          y2={cy - R * Math.sin((deg * Math.PI) / 180)}
          className="ray"
        />
      ))}
      {angles.map((a, i) => {
        const a0 = acc;
        acc += a;
        const p = arcLabel(cx, cy, 70, a0, acc);
        const last = i === angles.length - 1;
        return (
          <g key={i}>
            <path d={arcPath(cx, cy, 36 + (i % 2) * 8, a0, acc)} className={`angle-arc arc-${i % 4}`} />
            <text x={p.x} y={p.y + 7} className={`angle-label${last && !solved ? " ask" : ""}`}>
              {label(i)}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="5" className="center-dot" />
    </svg>
  );
}

export function Protractor({ angle, scale }: { angle: number; scale: boolean }) {
  const cx = 200;
  const cy = 200;
  const R = 170;
  const p = (deg: number, r: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy - r * Math.sin((deg * Math.PI) / 180),
  });
  const end = p(angle, R - 8);
  return (
    <svg className="rect-svg" viewBox="0 0 400 230" role="img" aria-label={scale ? "Angle on a protractor" : "An angle"}>
      {scale && (
        <g className="protractor">
          <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} className="protractor-body" />
          {range(181).map((d) => {
            if (d % 5) return null;
            const long = d % 10 === 0;
            const a = p(d, R);
            const b = p(d, R - (long ? 16 : 9));
            return <line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="protractor-tick" />;
          })}
          {range(19).map((i) => {
            const d = i * 10;
            const t = p(d, R - 30);
            return (
              <text key={d} x={t.x} y={t.y + 5} className="protractor-num">
                {d}
              </text>
            );
          })}
        </g>
      )}
      <line x1={cx} y1={cy} x2={cx + R - 8} y2={cy} className="ray ray-strong" />
      <line x1={cx} y1={cy} x2={end.x} y2={end.y} className="ray ray-strong" />
      {angle === 90 ? (
        <polyline points={`${cx + 22},${cy} ${cx + 22},${cy - 22} ${cx},${cy - 22}`} className="right-mark" />
      ) : (
        <path d={arcPath(cx, cy, 42, 0, angle)} className="angle-arc arc-0" />
      )}
      <circle cx={cx} cy={cy} r="6" className="center-dot" />
    </svg>
  );
}

export function Lines({ type }: { type: "parallel" | "perpendicular" | "intersecting" | "point" | "line" | "ray" | "segment" }) {
  return (
    <svg className="rect-svg" viewBox="0 0 300 200" role="img" aria-label={type}>
      <defs>
        <marker id="geo-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="geo-arrowhead" />
        </marker>
      </defs>
      {type === "point" && (
        <>
          <circle cx="150" cy="100" r="9" className="geo-dot" />
          <text x="166" y="92" className="angle-label small">
            A
          </text>
        </>
      )}
      {type === "line" && (
        <>
          <line x1="30" y1="140" x2="270" y2="60" className="ray ray-strong" markerStart="url(#geo-arrow)" markerEnd="url(#geo-arrow)" />
          <circle cx="100" cy="117" r="7" className="geo-dot" />
          <circle cx="200" cy="83" r="7" className="geo-dot" />
        </>
      )}
      {type === "ray" && (
        <>
          <line x1="60" y1="130" x2="270" y2="60" className="ray ray-strong" markerEnd="url(#geo-arrow)" />
          <circle cx="60" cy="130" r="8" className="geo-dot" />
          <circle cx="170" cy="93" r="7" className="geo-dot" />
        </>
      )}
      {type === "segment" && (
        <>
          <line x1="60" y1="130" x2="240" y2="70" className="ray ray-strong" />
          <circle cx="60" cy="130" r="8" className="geo-dot" />
          <circle cx="240" cy="70" r="8" className="geo-dot" />
        </>
      )}
      {type === "parallel" && (
        <>
          <line x1="30" y1="60" x2="270" y2="30" className="ray ray-strong" />
          <line x1="30" y1="170" x2="270" y2="140" className="ray ray-strong ray-b" />
        </>
      )}
      {type === "perpendicular" && (
        <>
          <line x1="40" y1="100" x2="260" y2="100" className="ray ray-strong" />
          <line x1="150" y1="10" x2="150" y2="190" className="ray ray-strong ray-b" />
          <polyline points="150,82 168,82 168,100" className="right-mark" />
        </>
      )}
      {type === "intersecting" && (
        <>
          <line x1="30" y1="160" x2="270" y2="40" className="ray ray-strong" />
          <line x1="40" y1="40" x2="260" y2="170" className="ray ray-strong ray-b" />
        </>
      )}
    </svg>
  );
}

/* --------------------------------------------------------- coordinate grid */

export function Grid({ size, quadrants, points }: { size: number; quadrants: 1 | 4; points: { x: number; y: number; label: string }[] }) {
  const lo = quadrants === 4 ? -size : 0;
  const span = size - lo;
  const W = 320;
  const pad = 30;
  const u = W / span;
  const X = (x: number) => pad + (x - lo) * u;
  const Y = (y: number) => pad + (size - y) * u;
  const every = span > 12 ? 2 : 1;
  return (
    <svg className="grid-svg" viewBox={`0 0 ${W + pad * 2} ${W + pad * 2}`} role="img" aria-label="Coordinate grid">
      <rect x={X(lo)} y={Y(size)} width={span * u} height={span * u} rx="6" className="grid-bg" />
      {range(span + 1).map((i) => {
        const v = lo + i;
        return (
          <g key={i}>
            <line x1={X(v)} x2={X(v)} y1={Y(size)} y2={Y(lo)} className={v === 0 ? "axis" : "gridline"} />
            <line y1={Y(v)} y2={Y(v)} x1={X(lo)} x2={X(size)} className={v === 0 ? "axis" : "gridline"} />
            {v % every === 0 && v !== 0 && (
              <>
                <text x={X(v)} y={Y(Math.max(lo, 0)) + 18} className="grid-num">
                  {num(v)}
                </text>
                <text x={X(Math.max(lo, 0)) - 8} y={Y(v) + 5} className="grid-num end">
                  {num(v)}
                </text>
              </>
            )}
          </g>
        );
      })}
      {quadrants === 1 && (
        <text x={X(0) - 8} y={Y(0) + 18} className="grid-num end">
          0
        </text>
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.x)} cy={Y(p.y)} r="8" className="grid-point" style={{ fill: `var(--${SERIES[(i + 3) % SERIES.length]})` }} />
          <text x={X(p.x) + 11} y={Y(p.y) - 9} className="grid-point-label">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
