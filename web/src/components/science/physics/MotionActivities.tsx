/* Hands-on physics: push and pull, force arrows, launching a projectile, balancing a seesaw. */
import { useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { sfx } from "../../../game/sound";
import type { PhysicsActivity } from "../../../game/science/physicsTypes";
import { balanceSolution, launchDistance, netForce, rangeStart, rangeValues, torques } from "../../../game/science/physicsValidate";
import { num } from "../../visuals/NumberVisuals";
import { svgPoint, useReport, type ActivityProps } from "../../activities/shared";
import { ARROW_COLOURS, Arrow, Emoji, Ground, Label, boxEdge, clamp, col, rad, range, tipPlacement } from "./common";

type Of<K extends PhysicsActivity["kind"]> = Extract<PhysicsActivity, { kind: K }>;
const EPS = 1e-6;
const ctx0 = { solved: false, answer: "" };

/** A toggle chip button. */
export function Chip({ on, onClick, disabled, children, style, label }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; style?: CSSProperties; label?: string }) {
  return (
    <button type="button" className={`ph-chip${on ? " on" : ""}`} aria-pressed={on} aria-label={label} disabled={disabled} onClick={onClick} style={style}>
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- pushpull */

export function PushPull({ a, solved, locked, onChange }: ActivityProps<Of<"phys-pushpull">>) {
  const [dir, setDir] = useState<-1 | 1 | null>(null);
  const [k, setK] = useState<number | null>(null);
  const [went, setWent] = useState(false);
  const stop = a.target === "stop";
  const rolling = stop ? (a.rolling ?? 0) : 0;
  const reaches = (d: -1 | 1, i: number) =>
    stop ? d === -Math.sign(rolling) && Math.abs(a.strengths[i] - Math.abs(rolling)) < EPS : Math.abs(a.start + d * a.strengths[i] - (a.target as number)) < EPS;
  useReport(dir !== null && k !== null && reaches(dir, k), onChange);
  let D = dir;
  let K = k;
  if (solved) {
    outer: for (const d of [1, -1] as const)
      for (let i = 0; i < a.strengths.length; i++)
        if (reaches(d, i)) {
          D = d;
          K = i;
          break outer;
        }
  }
  const moved = solved || went;
  const end = D !== null && K !== null && moved ? clamp(a.start + rolling + D * a.strengths[K], 0, a.length) : a.start;
  const W = 340;
  const x0 = 30;
  const X = (p: number) => x0 + (p / a.length) * W;
  const names = a.strengthNames ?? ["small", "medium", "big", "huge"].slice(0, a.strengths.length);
  const verb = a.verb ?? "push";
  const pick = (f: () => void) => {
    if (locked) return;
    sfx.tap();
    f();
    setWent(false);
  };
  const y = 92;
  const maxS = Math.max(...a.strengths);
  const forceLen = D !== null && K !== null ? 24 + (a.strengths[K] / maxS) * 56 : 0;
  // A push acts from behind the object; a pull from in front, so the arrow sits on the side it moves toward.
  const arrowFrom = verb === "pull" ? X(a.start) + (D ?? 1) * 26 : X(a.start) - (D ?? 1) * (26 + forceLen);
  const stopped = stop && moved && D !== null && K !== null && Math.abs(end - a.start) < EPS;
  return (
    <div className="ph-act">
      <svg className="ph-svg act-svg" viewBox="0 0 400 150" style={{ width: "min(100%, 430px)" }} role="img" aria-label={`Object on a track at ${num(end)}`}>
        <line x1={x0 - 10} y1={y + 26} x2={x0 + W + 10} y2={y + 26} className="ph-track" />
        {range(a.length + 1).map((i) => (
          <g key={i}>
            <line x1={X(i)} y1={y + 30} x2={X(i)} y2={y + 38} className="ph-axis" />
            {(a.length <= 10 || i % 2 === 0) && (
              <text x={X(i)} y={y + 56} className="ph-tiny" textAnchor="middle">
                {i}
              </text>
            )}
          </g>
        ))}
        {!stop && (
          <g>
            <line x1={X(a.target as number)} y1={22} x2={X(a.target as number)} y2={y + 26} className="ph-finish" />
            <Emoji x={X(a.target as number)} y={18} e="⭐" size={24} />
          </g>
        )}
        {stop && !moved && <Arrow x1={X(a.start) + Math.sign(rolling) * 4} y1={34} x2={X(a.start) + Math.sign(rolling) * 54} y2={34} colour="night" width={4} head={12} />}
        {stop && !moved && (
          <text x={X(a.start) + Math.sign(rolling) * 64} y={40} className="ph-tiny strong" textAnchor={rolling > 0 ? "start" : "end"}>
            rolling
          </text>
        )}
        <g className="ph-slide" style={{ transform: `translateX(${X(end) - X(a.start)}px)` }}>
          <Emoji x={X(a.start)} y={y + 4} e={a.object ?? "📦"} size={46} />
        </g>
        {D !== null && K !== null && !moved && <Arrow x1={arrowFrom} y1={y} x2={arrowFrom + D * forceLen} y2={y} colour="berry" width={6} head={16} />}
        {stopped && (
          <text x={X(a.start)} y={36} className="ph-label ph-sm" textAnchor="middle">
            Stopped!
          </text>
        )}
      </svg>
      <div className="ph-controls">
        <Chip on={D === -1} disabled={locked} onClick={() => pick(() => setDir(-1))} label={`${verb} left`}>
          ◀ {verb}
        </Chip>
        <Chip on={D === 1} disabled={locked} onClick={() => pick(() => setDir(1))} label={`${verb} right`}>
          {verb} ▶
        </Chip>
      </div>
      <div className="ph-controls">
        {a.strengths.map((s, i) => (
          <Chip key={i} on={K === i} disabled={locked} onClick={() => pick(() => setK(i))} label={`${names[i]} ${verb}`}>
            <span className="ph-strength" style={{ "--s": s / maxS } as CSSProperties} aria-hidden="true" />
            {names[i]}
          </Chip>
        ))}
      </div>
      <button
        type="button"
        className="btn ph-go"
        disabled={locked || dir === null || k === null}
        onClick={() => {
          sfx.tap();
          setWent((w) => !w);
        }}
      >
        {went ? "Reset" : "Go!"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ forceArrows */

type Vec = { dir: number; size: number };

export function ForceArrows({ a, solved, locked, onChange }: ActivityProps<Of<"phys-forceArrows">>) {
  const [arrows, setArrows] = useState<Vec[]>(() => a.arrows.map((ar) => ({ dir: ar.dir ?? 90, size: ar.size ?? 0 })));
  const [sel, setSel] = useState(0);
  const selRef = useRef(0);
  const shown = solved ? a.arrows.map((ar) => ar.answer) : arrows;
  const correct = (kid: Vec[]) => {
    if (a.check === "exact")
      return kid.every((k, i) => {
        const ans = a.arrows[i].answer;
        if (ans.size === 0) return k.size === 0;
        return k.size === ans.size && Math.abs((((k.dir - ans.dir) % 360) + 360) % 360) < EPS;
      });
    const n = netForce([...(a.given ?? []), ...kid]);
    const want = a.net ?? { x: 0, y: 0 };
    return Math.abs(n.x - want.x) < 1e-6 && Math.abs(n.y - want.y) < 1e-6;
  };
  useReport(correct(arrows), onChange);
  const cx = 200;
  const cy = 190;
  const object = a.object ?? "box";
  const half = object === "box" ? 34 : 29;
  const step = Math.min(30, 110 / a.maxSize);
  const dStep = 360 / a.directions;
  const geo = (v: Vec) => {
    const ux = Math.cos(rad(v.dir));
    const uy = -Math.sin(rad(v.dir));
    const s = boxEdge(v.dir, half, half) + 3;
    return { ux, uy, s, x1: cx + ux * s, y1: cy + uy * s, x2: cx + ux * (s + v.size * step), y2: cy + uy * (s + v.size * step) };
  };
  const colourOf = (i: number) => a.arrows[i].colour ?? ARROW_COLOURS[((a.given?.length ?? 0) + i) % ARROW_COLOURS.length];
  const fromPoint = (p: { x: number; y: number }): Vec => {
    const dx = p.x - cx;
    const dy = cy - p.y;
    const ang = (((Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) / dStep) * dStep) % 360) + 360) % 360;
    const edge = boxEdge(ang, half, half) + 3;
    const size = clamp(Math.round((Math.hypot(dx, dy) - edge) / step), 0, a.maxSize);
    return { dir: ang, size };
  };
  const move = (p: { x: number; y: number }) => {
    const v = fromPoint(p);
    setArrows((prev) => {
      const i = selRef.current;
      const cur = prev[i];
      if (cur.dir === v.dir && cur.size === v.size) return prev;
      sfx.tap();
      return prev.map((x, j) => (j === i ? (v.size === 0 ? { ...x, size: 0 } : v) : x));
    });
  };
  const choose = (i: number) => {
    selRef.current = i;
    setSel(i);
  };
  const handlers = locked
    ? {}
    : {
        onPointerDown(e: RPointerEvent<SVGSVGElement>) {
          e.currentTarget.dataset.dragging = "1";
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Dragging still works inside the picture without capture.
          }
          const p = svgPoint(e.currentTarget, e);
          // Grab whichever arrow tip is nearest the finger, if one is close.
          let best = -1;
          let bestD = 34;
          arrows.forEach((v, i) => {
            if (v.size === 0) return;
            const g = geo(v);
            const d = Math.hypot(p.x - g.x2, p.y - g.y2);
            if (d < bestD) {
              best = i;
              bestD = d;
            }
          });
          if (best >= 0) choose(best);
          move(p);
        },
        onPointerMove(e: RPointerEvent<SVGSVGElement>) {
          if (e.currentTarget.dataset.dragging) move(svgPoint(e.currentTarget, e));
        },
        onPointerUp(e: RPointerEvent<SVGSVGElement>) {
          delete e.currentTarget.dataset.dragging;
        },
        onPointerCancel(e: RPointerEvent<SVGSVGElement>) {
          delete e.currentTarget.dataset.dragging;
        },
      };
  const ring = range(a.directions).map((i) => {
    const ang = i * dStep;
    const e = boxEdge(ang, half, half) + 3;
    const r = e + a.maxSize * step;
    return <circle key={i} cx={cx + Math.cos(rad(ang)) * r} cy={cy - Math.sin(rad(ang)) * r} r="3" className="ph-snap-dot" />;
  });
  const drawArrow = (v: Vec, colour: (typeof ARROW_COLOURS)[number], label: string, key: string, handle: boolean) => {
    if (v.size === 0) return null;
    const g = geo(v);
    const { anchor, dy } = tipPlacement(g.ux, g.uy);
    return (
      <g key={key}>
        <Arrow x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} colour={colour} />
        <Label x={g.x2 + g.ux * 12} y={g.y2 + g.uy * 12 + dy} m={label} ctx={ctx0} anchor={anchor} size="sm" colour={colour} />
        {handle && <circle cx={g.x2} cy={g.y2} r="11" className="act-handle ph-tip-handle" />}
      </g>
    );
  };
  return (
    <div className="ph-act">
      <svg
        className="ph-svg act-svg"
        viewBox="0 0 400 380"
        style={{ width: "min(100%, 400px)" }}
        {...handlers}
        role="application"
        aria-label={`Drag to draw the ${a.arrows[sel].label} arrow`}
      >
        <rect x="0" y="0" width="400" height="380" fill="transparent" />
        {ring}
        {a.surface === "floor" && <Ground x1={70} x2={330} y={cy + half} />}
        {a.surface === "ceiling" && (
          <g>
            <Ground x1={110} x2={290} y={14} flip />
            <line x1={cx} y1={14} x2={cx} y2={cy - half} className="ph-string" />
          </g>
        )}
        {object === "box" ? (
          <rect x={cx - half} y={cy - half} width={half * 2} height={half * 2} rx="8" className="ph-box" />
        ) : (
          <Emoji x={cx} y={cy} e={object} size={58} />
        )}
        {(a.given ?? []).map((g, i) => drawArrow(g, g.colour ?? ARROW_COLOURS[i % ARROW_COLOURS.length], g.label, `g${i}`, false))}
        {shown.map((v, i) => drawArrow(v, colourOf(i), a.arrows[i].label, `k${i}`, !solved && !locked && i === sel))}
      </svg>
      {a.arrows.length > 1 && (
        <div className="ph-controls">
          {a.arrows.map((ar, i) => (
            <Chip key={i} on={i === sel} disabled={locked} onClick={() => (sfx.tap(), choose(i))} style={{ "--c": col(colourOf(i)) } as CSSProperties}>
              <span className="ph-swatch" aria-hidden="true" />
              {ar.label}
            </Chip>
          ))}
        </div>
      )}
      <p className="act-tip-text">
        Drag out from the {object === "box" ? "box" : "object"} to draw <b>{a.arrows[sel].label}</b>. Drag back to it to take the arrow away.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- launch */

export function Launch({ a, solved, locked, onChange }: ActivityProps<Of<"phys-launch">>) {
  const h = a.height ?? 0;
  const fixedA = typeof a.angle === "number" ? a.angle : null;
  const fixedS = typeof a.speed === "number" ? a.speed : null;
  const hits = (ang: number, sp: number) => Math.abs(launchDistance(sp, ang, a.g, h) - a.target) <= a.tolerance;
  const [ang, setAng] = useState(() => (fixedA ?? rangeStart(a.angle as Exclude<typeof a.angle, number>)));
  const [sp, setSp] = useState(() => (fixedS ?? rangeStart(a.speed as Exclude<typeof a.speed, number>)));
  const [shot, setShot] = useState<{ ang: number; sp: number } | null>(null);
  useReport(hits(ang, sp), onChange);
  const angles = fixedA !== null ? [fixedA] : rangeValues(a.angle as Exclude<typeof a.angle, number>);
  const speeds = fixedS !== null ? [fixedS] : rangeValues(a.speed as Exclude<typeof a.speed, number>);
  let best = { ang, sp };
  if (solved) {
    let bd = Infinity;
    for (const x of angles)
      for (const s of speeds) {
        const d = Math.abs(launchDistance(s, x, a.g, h) - a.target);
        if (d < bd) {
          bd = d;
          best = { ang: x, sp: s };
        }
      }
  }
  const A = solved ? best.ang : ang;
  const S = solved ? best.sp : sp;
  const path = solved ? best : shot ?? (locked ? { ang, sp } : null);
  // One scale for x and y so the path's shape is true.
  const apex = Math.max(...angles.flatMap((x) => speeds.map((s) => h + (s * Math.sin(rad(x))) ** 2 / (2 * a.g))));
  const k = Math.min(330 / a.width, 170 / Math.max(apex, 1e-6));
  const x0 = 46;
  const ground = 236;
  const X = (m: number) => x0 + m * k;
  const Y = (m: number) => ground - m * k;
  const traj = (p: { ang: number; sp: number }) => {
    const vx = p.sp * Math.cos(rad(p.ang));
    const vy = p.sp * Math.sin(rad(p.ang));
    const T = (vy + Math.sqrt(vy * vy + 2 * a.g * h)) / a.g;
    const pts = range(61).map((i) => {
      const t = (T * i) / 60;
      return `${i ? "L" : "M"}${X(vx * t).toFixed(1)} ${Y(h + vy * t - (a.g * t * t) / 2).toFixed(1)}`;
    });
    return { d: pts.join(" "), land: vx * T };
  };
  const shotPath = path ? traj(path) : null;
  const top = Math.max(0, Math.min(ground - apex * k - 40, ground - 130));
  const tick = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((t) => a.width / t <= 6) ?? 1000;
  const ok = shotPath && Math.abs(shotPath.land - a.target) <= a.tolerance;
  const launcher = a.launcher ?? "cannon";
  return (
    <div className="ph-act">
      <svg className="ph-svg" viewBox={`0 ${top} 400 ${290 - top}`} style={{ width: "min(100%, 430px)" }} role="img" aria-label="Launcher and target">
        {h > 0 && <rect x={x0 - 40} y={Y(h)} width={40} height={ground - Y(h)} rx="4" className="ph-cliff" />}
        <line x1={x0 - 40} y1={ground} x2={X(a.width) + 4} y2={ground} className="ph-track" />
        <rect x={X(a.target - a.tolerance)} y={ground - 7} width={Math.max(4, 2 * a.tolerance * k)} height="7" className="ph-zone" />
        <Emoji x={X(a.target)} y={ground - 20} e="🎯" size={30} />
        {range(Math.floor(a.width / tick) + 1).map((i) => (
          <g key={i}>
            <line x1={X(i * tick)} y1={ground + 4} x2={X(i * tick)} y2={ground + 12} className="ph-axis" />
            <text x={X(i * tick)} y={ground + 32} className="ph-tiny" textAnchor="middle">
              {i * tick}
              {i === Math.floor(a.width / tick) ? " m" : ""}
            </text>
          </g>
        ))}
        {shotPath && <path d={shotPath.d} className={`ph-traj${ok ? " hit" : ""}`} />}
        {shotPath && <circle cx={X(shotPath.land)} cy={ground - 7} r="7" className="ph-ball-land" />}
        <g transform={`translate(${x0} ${Y(h)})`}>
          {launcher === "cannon" && (
            <g>
              <g transform={`rotate(${-A})`}>
                <rect x={-6} y={-10} width={44} height={20} rx="7" className="ph-barrel" />
              </g>
              <circle cx={0} cy={2} r="12" className="ph-wheel-big" />
            </g>
          )}
          {launcher === "ramp" && (
            <g>
              <polygon points={`${-44 * Math.cos(rad(A))},${44 * Math.sin(rad(A))} 0,0 0,${44 * Math.sin(rad(A))}`} className="ph-ramp" />
              <line x1={0} y1={0} x2={30 * Math.cos(rad(A))} y2={-30 * Math.sin(rad(A))} className="ph-aim" />
              <circle cx={0} cy={-6} r="7" className="ph-ball-land" />
            </g>
          )}
          {launcher === "hand" && (
            <g>
              <Emoji x={-14} y={-18} e="🧒" size={34} />
              <line x1={0} y1={0} x2={34 * Math.cos(rad(A))} y2={-34 * Math.sin(rad(A))} className="ph-aim" />
              <circle cx={0} cy={0} r="7" className="ph-ball-land" />
            </g>
          )}
        </g>
        {shotPath && (
          <text x={X(shotPath.land)} y={ground - 40} className="ph-tiny strong" textAnchor={X(shotPath.land) > 330 ? "end" : "middle"}>
            {num(Math.round(shotPath.land * 10) / 10)} m
          </text>
        )}
      </svg>
      <div className="ph-sliders">
        {fixedA === null ? (
          <Slider label="Angle" unit="°" r={a.angle as Exclude<typeof a.angle, number>} value={A} disabled={locked} onChange={(v) => (setAng(v), setShot(null))} />
        ) : (
          <p className="ph-fixed">Angle: {fixedA}°</p>
        )}
        {fixedS === null ? (
          <Slider label="Speed" unit=" m/s" r={a.speed as Exclude<typeof a.speed, number>} value={S} disabled={locked} onChange={(v) => (setSp(v), setShot(null))} />
        ) : (
          <p className="ph-fixed">Speed: {fixedS} m/s</p>
        )}
      </div>
      <button
        type="button"
        className="btn ph-go"
        disabled={locked}
        onClick={() => {
          sfx.tap();
          setShot({ ang, sp });
        }}
      >
        Launch 🚀
      </button>
    </div>
  );
}

/** A labelled slider that snaps to a StepRange. */
export function Slider({ label, unit, r, value, disabled, onChange }: { label: string; unit: string; r: { min: number; max: number; step: number }; value: number; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <label className="ph-slider">
      <span className="ph-slider-name">{label}</span>
      <input
        type="range"
        min={r.min}
        max={r.max}
        step={r.step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = Number((Math.round((Number(e.target.value) - r.min) / r.step) * r.step + r.min).toFixed(9));
          if (v !== value) sfx.tap();
          onChange(v);
        }}
      />
      <span className="ph-slider-value">
        {num(value)}
        {unit}
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- balance */

export function Balance({ a, solved, locked, onChange }: ActivityProps<Of<"phys-balance">>) {
  const [kid, setKid] = useState<Record<string, number>>({});
  const per = a.perSlot ?? 4;
  const allowed = a.side ?? "both";
  const shown = solved ? (balanceSolution(a) ?? {}) : kid;
  const items = (counts: Record<string, number>) => [
    ...a.fixed,
    ...Object.entries(counts).flatMap(([key, n]) => {
      const [side, at] = key.split(":");
      return range(n).map(() => ({ side: side as "left" | "right", at: Number(at), mass: a.mass }));
    }),
  ];
  const tq = (counts: Record<string, number>) => torques(items(counts));
  const now = tq(kid);
  const placed = Object.values(kid).some((n) => n > 0);
  useReport(placed && Math.abs(now.left - now.right) < EPS, onChange);
  const t = tq(shown);
  const maxT = Math.max(1, ...[t.left, t.right]);
  const tilt = clamp(((t.right - t.left) / maxT) * 14, -14, 14);
  const cx = 200;
  const py = 196;
  const u = 160 / a.slots;
  const X = (side: "left" | "right", at: number) => cx + (side === "left" ? -1 : 1) * at * u;
  const add = (side: "left" | "right", at: number) => {
    if (locked || (allowed !== "both" && allowed !== side)) return;
    setKid((prev) => {
      const key = `${side}:${at}`;
      if ((prev[key] ?? 0) >= per) return prev;
      sfx.tap();
      return { ...prev, [key]: (prev[key] ?? 0) + 1 };
    });
  };
  const remove = (side: "left" | "right", at: number) => {
    if (locked) return;
    setKid((prev) => {
      const key = `${side}:${at}`;
      if (!prev[key]) return prev;
      sfx.tap();
      return { ...prev, [key]: prev[key] - 1 };
    });
  };
  const stack = (side: "left" | "right", at: number) => {
    const fixed = a.fixed.filter((f) => f.side === side && f.at === at);
    const mine = shown[`${side}:${at}`] ?? 0;
    const x = X(side, at);
    const out = [];
    let y = py - 4;
    for (const f of fixed) {
      out.push(
        <g key={`f${y}`}>
          {f.emoji ? <Emoji x={x} y={y - 16} e={f.emoji} size={30} /> : <rect x={x - 15} y={y - 24} width="30" height="24" rx="5" className="ph-weight fixed" />}
          {!f.emoji && (
            <text x={x} y={y - 7} className="ph-weight-text" textAnchor="middle">
              {num(f.mass)}
            </text>
          )}
        </g>,
      );
      y -= f.emoji ? 30 : 26;
    }
    for (let i = 0; i < mine; i++) {
      const yy = y;
      out.push(
        <g
          key={`k${i}`}
          className="ph-weight-tap"
          role="button"
          aria-label={`Take a weight off ${side} ${at}`}
          onClick={(e) => {
            e.stopPropagation();
            remove(side, at);
          }}
        >
          {a.emoji ? <Emoji x={x} y={yy - 15} e={a.emoji} size={28} /> : <rect x={x - 15} y={yy - 24} width="30" height="24" rx="5" className="ph-weight" />}
          {!a.emoji && (
            <text x={x} y={yy - 7} className="ph-weight-text kid" textAnchor="middle">
              {num(a.mass)}
            </text>
          )}
        </g>,
      );
      y -= a.emoji ? 28 : 26;
    }
    return out;
  };
  const sides = (["left", "right"] as const).filter((s) => allowed === "both" || allowed === s);
  const tallest = Math.max(per, ...(["left", "right"] as const).flatMap((s) => range(a.slots).map((i) => a.fixed.filter((f) => f.side === s && f.at === i + 1).length + per)));
  const top = clamp(py - tallest * 27 - 40, 0, 120);
  return (
    <div className="ph-act">
      <svg className="ph-svg" viewBox={`0 ${top} 400 ${250 - top}`} style={{ width: "min(100%, 430px)" }} role="img" aria-label="Seesaw">
        <polygon points={`${cx},${py + 4} ${cx - 26},${py + 46} ${cx + 26},${py + 46}`} className="ph-fulcrum" />
        <line x1={cx - 70} y1={py + 46} x2={cx + 70} y2={py + 46} className="ph-ground-line" />
        <g className="ph-beam-g" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${cx}px ${py}px` }}>
          <rect x={cx - a.slots * u - 22} y={py - 4} width={2 * (a.slots * u + 22)} height="12" rx="6" className="ph-lever" />
          {(["left", "right"] as const).flatMap((side) =>
            range(a.slots).map((i) => {
              const at = i + 1;
              const x = X(side, at);
              const can = !locked && sides.includes(side);
              return (
                <g key={`${side}${at}`}>
                  {can && (
                    <g className="ph-slot-tap" role="button" tabIndex={0} aria-label={`Add a weight ${side} ${at}`} onClick={() => add(side, at)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), add(side, at))}>
                      <rect x={x - u / 2 + 2} y={py - 150} width={u - 4} height={150} rx="10" className="ph-slot-zone" />
                    </g>
                  )}
                  <circle cx={x} cy={py + 2} r="3.5" className="ph-slot-dot" />
                  <text x={x} y={py + 28} className="ph-tiny strong" textAnchor="middle">
                    {at}
                  </text>
                  {stack(side, at)}
                </g>
              );
            }),
          )}
        </g>
      </svg>
      <div className="ph-controls">
        <button type="button" className="btn btn-quiet ph-clear" disabled={locked || !placed} onClick={() => (sfx.tap(), setKid({}))}>
          Clear
        </button>
      </div>
      <p className="act-tip-text">Tap above a number to add a weight of {num(a.mass)}{a.unit ? ` ${a.unit}` : ""}. Tap a weight to take it off.</p>
    </div>
  );
}
