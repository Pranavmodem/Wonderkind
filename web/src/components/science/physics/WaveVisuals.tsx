/* Waves, light and optics, and sound pictures. */
import type { CSSProperties, ReactNode } from "react";
import type { PhysicsVisual } from "../../../game/science/physicsTypes";
import { lensImage, snell } from "../../../game/science/physicsValidate";
import type { Colour } from "../../../game/types";
import { Arrow, Bounds, Dimension, Emoji, Ground, Label, Note, PhysSvg, col, markText, rad, range, type Ctx } from "./common";

type Of<K extends PhysicsVisual["kind"]> = Extract<PhysicsVisual, { kind: K }>;

/* -------------------------------------------------------------------- wave */

/** A sampled curve y = f(x) as an SVG path, in screen coordinates. */
function curve(f: (x: number) => number, x0: number, x1: number, n = 160) {
  return range(n + 1)
    .map((i) => {
      const x = x0 + ((x1 - x0) * i) / n;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${f(x).toFixed(1)}`;
    })
    .join(" ");
}

export function Wave({ v, ctx }: { v: Of<"phys-wave">; ctx: Ctx }) {
  const form = v.form ?? "transverse";
  const unit = v.unit ?? "m";
  const W = 360;
  const x0 = 24;
  const u = W / v.length;
  const maxA = Math.max(...v.waves.map((w) => w.amplitude));
  const uy = form === "longitudinal" ? u : Math.min(u, 74 / maxA);
  const palette: Colour[] = ["wave", "berry"];
  const B = new Bounds();
  B.add(0, 0);
  B.add(x0 + W + 12, 0);
  let y = v.travel !== undefined && v.travel !== null ? 40 : 6;
  const panels: ReactNode[] = [];
  v.waves.forEach((w, k) => {
    const c = w.colour ?? palette[k % 2];
    const A = w.amplitude * uy;
    const lam = w.wavelength * u;
    const first = k === 0;
    const markL = first && v.wavelengthLabel !== undefined && v.wavelengthLabel !== null;
    const markA = first && v.amplitudeLabel !== undefined && v.amplitudeLabel !== null;
    const titleH = w.label ? 26 : 0;
    const out: ReactNode[] = [];
    if (form === "longitudinal") {
      const top = y + titleH + (markL ? 42 : 0) + (v.names ? 22 : 0);
      const mid = top + 40;
      const D = (0.85 * (w.amplitude / maxA) * w.wavelength) / (2 * Math.PI);
      const n = Math.round(v.length * 4);
      out.push(<rect key="bg" x={x0} y={mid - 40} width={W} height={80} rx="10" className="ph-medium" />);
      range(n + 1).forEach((i) => {
        const xe = (i / n) * v.length;
        const xd = xe + D * Math.sin((2 * Math.PI * xe) / w.wavelength);
        if (xd < 0 || xd > v.length) return;
        out.push(<line key={i} x1={x0 + xd * u} y1={mid - 34} x2={x0 + xd * u} y2={mid + 34} className="ph-coil-line" style={{ stroke: col(c) }} />);
      });
      const c1 = x0 + (w.wavelength / 2) * u;
      if (markL)
        out.push(
          <g key="lam">
            <Arrow x1={c1} y1={mid - 54} x2={c1 + lam} y2={mid - 54} colour="night" width={2.5} head={10} double />
            <Label x={c1 + lam / 2} y={mid - 64} m={v.wavelengthLabel} unit={unit} ctx={ctx} size="sm" />
          </g>,
        );
      if (v.names)
        out.push(
          <g key="names">
            <Note x={c1} y={top - (markL ? 48 : 6)}>
              compression
            </Note>
            <Note x={c1 + lam / 2} y={mid + 60}>
              rarefaction
            </Note>
          </g>,
        );
      if (w.label) out.push(<text key="t" x={x0} y={y + 18} className="ph-label ph-sm">{w.label}</text>);
      y = mid + 40 + (v.names ? 30 : 0) + 18;
    } else {
      const top = y + titleH + (markL && form !== "standing" ? 40 : 0) + (v.names && form === "standing" ? 22 : 0) + 8;
      const gridA = Math.ceil(maxA - 1e-9);
      const mid = top + gridA * uy;
      if (v.grid) {
        range(Math.floor(v.length + 1e-9) + 1).forEach((i) =>
          out.push(<line key={`gx${i}`} x1={x0 + i * u} y1={mid - gridA * uy} x2={x0 + i * u} y2={mid + gridA * uy} className="ph-grid" />),
        );
        range(2 * gridA + 1).forEach((j) =>
          out.push(<line key={`gy${j}`} x1={x0} y1={mid - gridA * uy + j * uy} x2={x0 + W} y2={mid - gridA * uy + j * uy} className="ph-grid" />),
        );
      }
      out.push(<line key="axis" x1={x0} y1={mid} x2={x0 + W} y2={mid} className="ph-eq" />);
      if (form === "standing") {
        const f = (x: number) => mid - A * Math.sin((2 * Math.PI * (x - x0)) / lam);
        const g = (x: number) => mid + A * Math.sin((2 * Math.PI * (x - x0)) / lam);
        out.push(<path key="w1" d={curve(f, x0, x0 + W)} className="ph-wave" style={{ stroke: col(c) }} />);
        out.push(<path key="w2" d={curve(g, x0, x0 + W)} className="ph-wave ghost" style={{ stroke: col(c) }} />);
        out.push(<rect key="p1" x={x0 - 9} y={mid - A - 14} width="9" height={2 * A + 28} rx="3" className="ph-post" />);
        out.push(<rect key="p2" x={x0 + W} y={mid - A - 14} width="9" height={2 * A + 28} rx="3" className="ph-post" />);
        const halves = Math.round(v.length / (w.wavelength / 2));
        range(halves + 1).forEach((i) => {
          const x = x0 + (i * lam) / 2;
          out.push(<circle key={`n${i}`} cx={x} cy={mid} r="5.5" className="ph-node" />);
          if (v.names)
            out.push(
              <text key={`nl${i}`} x={x + (i === 0 ? 10 : i === halves ? -10 : 0)} y={mid + 24} className="ph-tiny strong" textAnchor="middle">
                N
              </text>,
            );
          if (v.names && i < halves)
            out.push(
              <text key={`al${i}`} x={x + lam / 4} y={mid - A - 10} className="ph-tiny strong" textAnchor="middle">
                A
              </text>,
            );
        });
        if (markA) {
          const ax = x0 - 26;
          B.text(ax - 8, mid - A / 2 + 7, markText(v.amplitudeLabel, unit, ctx), "end", 18);
          out.push(
            <g key="amp">
              <line x1={x0 + lam / 4} y1={mid - A} x2={ax - 6} y2={mid - A} className="ph-eq faint" />
              <Arrow x1={ax} y1={mid} x2={ax} y2={mid - A} colour="night" width={2.5} head={10} double />
              <Label x={ax - 8} y={mid - A / 2 + 7} m={v.amplitudeLabel} unit={unit} ctx={ctx} anchor="end" size="sm" />
            </g>,
          );
        }
        if (markL)
          out.push(
            <g key="lam">
              <Arrow x1={x0} y1={mid + A + 30} x2={x0 + lam} y2={mid + A + 30} colour="night" width={2.5} head={10} double />
              <Label x={x0 + lam / 2} y={mid + A + 56} m={v.wavelengthLabel} unit={unit} ctx={ctx} size="sm" />
            </g>,
          );
        y = mid + A + (markL ? 70 : 30);
      } else {
        const f = (x: number) => mid - A * Math.sin((2 * Math.PI * (x - x0)) / lam);
        out.push(<path key="w" d={curve(f, x0, x0 + W)} className="ph-wave" style={{ stroke: col(c) }} />);
        const crest = x0 + lam / 4;
        if (markA) {
          const ax = x0 - 14;
          B.text(ax - 8, mid - A / 2 + 7, markText(v.amplitudeLabel, unit, ctx), "end", 18);
          out.push(
            <g key="amp">
              <line x1={crest} y1={mid - A} x2={ax - 6} y2={mid - A} className="ph-eq faint" />
              <line x1={x0} y1={mid} x2={ax - 6} y2={mid} className="ph-eq faint" />
              <Arrow x1={ax} y1={mid} x2={ax} y2={mid - A} colour="night" width={2.5} head={10} double />
              <Label x={ax - 8} y={mid - A / 2 + 7} m={v.amplitudeLabel} unit={unit} ctx={ctx} anchor="end" size="sm" />
            </g>,
          );
        }
        if (markL)
          out.push(
            <g key="lam">
              <line x1={crest} y1={mid - A - 4} x2={crest} y2={mid - A - 26} className="ph-eq faint" />
              <line x1={crest + lam} y1={mid - A - 4} x2={crest + lam} y2={mid - A - 26} className="ph-eq faint" />
              <Arrow x1={crest} y1={mid - A - 18} x2={crest + lam} y2={mid - A - 18} colour="night" width={2.5} head={10} double />
              <Label x={crest + lam / 2} y={mid - A - 26} m={v.wavelengthLabel} unit={unit} ctx={ctx} size="sm" />
            </g>,
          );
        if (v.names) {
          const lastCrest = Math.floor((v.length - w.wavelength / 4) / w.wavelength);
          const cx = crest + lastCrest * lam;
          const tx = x0 + (3 * lam) / 4;
          out.push(
            <g key="names">
              <Note x={cx} y={mid - A - (markL && lastCrest <= 1 ? 48 : 10)}>
                crest
              </Note>
              {tx <= x0 + W && (
                <Note x={tx} y={mid + A + 24}>
                  trough
                </Note>
              )}
            </g>,
          );
        }
        y = mid + Math.max(gridA * uy, A) + (v.names ? 34 : 14);
      }
      if (w.label) out.push(<text key="t" x={x0} y={top - 12 - (markL && form !== "standing" ? 40 : 0)} className="ph-label ph-sm">{w.label}</text>);
    }
    panels.push(<g key={k}>{out}</g>);
    y += 10;
  });
  B.add(0, y);
  return (
    <PhysSvg box={B.box(4, 0)} label={`${form === "standing" ? "Standing" : form === "longitudinal" ? "Longitudinal" : "Transverse"} wave`}>
      {v.travel !== undefined && v.travel !== null && (
        <g>
          <Arrow x1={x0 + W - 74} y1={20} x2={x0 + W} y2={20} colour="night" width={4} head={12} />
          <Label x={x0 + W - 84} y={27} m={v.travel} unit="m/s" ctx={ctx} anchor="end" size="sm" />
        </g>
      )}
      {panels}
    </PhysSvg>
  );
}

/* -------------------------------------------------------------------- rays */

/** A little torch pointing along `deg` (screen degrees, 0 = right, clockwise positive). */
function Torch({ x, y, deg = 0 }: { x: number; y: number; deg?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`} className="ph-torch">
      <rect x={-46} y={-11} width={36} height={22} rx="5" className="ph-torch-body" />
      <polygon points="-12,-12 6,-19 6,19 -12,12" className="ph-torch-head" />
      <rect x={-36} y={-4} width={10} height={8} rx="2" className="ph-torch-button" />
    </g>
  );
}

function RayLine({ x1, y1, x2, y2, colour = "tangerine", dashed, mid = true }: { x1: number; y1: number; x2: number; y2: number; colour?: Colour; dashed?: boolean; mid?: boolean }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className={`ph-ray${dashed ? " dashed" : ""}`} style={{ stroke: col(colour) }} />
      {mid && !dashed && <Arrow x1={x1} y1={y1} x2={(x1 + x2) / 2} y2={(y1 + y2) / 2} colour={colour} width={0.1} head={14} />}
    </g>
  );
}

/** An angle arc at (cx, cy) from screen angle a1 to a2 (degrees, 0 = right, counterclockwise), with a label. */
function Arc({ cx, cy, a1, a2, r, m, ctx, colour }: { cx: number; cy: number; a1: number; a2: number; r: number; m: Parameters<typeof Label>[0]["m"]; ctx: Ctx; colour?: Colour }) {
  if (Math.abs(a2 - a1) < 0.5) return null;
  const p = (a: number, rr: number) => ({ x: cx + rr * Math.cos(rad(a)), y: cy - rr * Math.sin(rad(a)) });
  const s = p(a1, r);
  const e = p(a2, r);
  const mid = p((a1 + a2) / 2, r + 22);
  return (
    <g>
      <path d={`M${s.x} ${s.y} A${r} ${r} 0 0 ${a2 > a1 ? 0 : 1} ${e.x} ${e.y}`} className="ph-angle-arc" style={colour ? { stroke: col(colour) } : undefined} />
      <Label x={mid.x} y={mid.y + 6} m={m} unit="°" ctx={ctx} size="sm" />
    </g>
  );
}

export function Rays({ v, ctx }: { v: Of<"phys-rays">; ctx: Ctx }) {
  switch (v.scene) {
    case "beam": {
      const type = v.block?.type ?? (v.block?.emoji ? "opaque" : undefined);
      const after = type === undefined || type === "transparent" ? "bright" : type === "translucent" ? "dim" : "none";
      const screen = v.screen ?? true;
      const sx = 330;
      return (
        <PhysSvg box={[0, 0, 410, 210]} label="Light shining toward a screen">
          <polygon points={`66,84 ${type ? 190 : sx},${type ? 64 : 44} ${type ? 190 : sx},${type ? 136 : 156} 66,116`} className="ph-beam" />
          {type && after !== "none" && <polygon points={`230,62 ${sx},44 ${sx},156 230,138`} className={`ph-beam${after === "dim" ? " dim" : ""}`} />}
          {type === "mirror" && <polygon points="190,64 190,136 70,30 100,6" className="ph-beam" />}
          {v.source === "sun" ? <Emoji x={36} y={100} e="☀️" size={56} /> : v.source === "bulb" ? <Emoji x={38} y={100} e="💡" size={52} /> : <Torch x={60} y={100} />}
          {v.block &&
            (v.block.emoji ? (
              <Emoji x={210} y={100} e={v.block.emoji} size={64} />
            ) : (
              <g className={`ph-slab ${type}`}>
                <rect x={190} y={46} width={40} height={108} rx="6" />
                {type === "transparent" && <path d="M199 66 L214 56 M199 86 L222 70" className="ph-glare" />}
                {type === "mirror" && <path d="M196 60 L224 60 M196 140 L224 140" className="ph-glare" />}
              </g>
            ))}
          {screen && (
            <g>
              <rect x={sx} y={26} width={58} height={150} rx="8" className="ph-screen" />
              {after === "bright" && <ellipse cx={sx + 29} cy={101} rx={22} ry={52} className="ph-spot" />}
              {after === "dim" && <ellipse cx={sx + 29} cy={101} rx={22} ry={52} className="ph-spot dim" />}
              {after === "none" &&
                (v.block?.emoji && type !== "mirror" ? (
                  <g>
                    <ellipse cx={sx + 29} cy={101} rx={24} ry={56} className="ph-spot" />
                    <Emoji x={sx + 29} y={101} e={v.block.emoji} size={44} cls="ph-shadow-shape" />
                  </g>
                ) : (
                  <ellipse cx={sx + 29} cy={101} rx={22} ry={52} className={type === "mirror" ? "ph-spot off" : "ph-spot shadow"} />
                ))}
            </g>
          )}
          {v.block?.label && (
            <Note x={210} y={182}>
              {v.block.label}
            </Note>
          )}
        </PhysSvg>
      );
    }
    case "mirror": {
      const i = v.angle;
      const H = { x: 200, y: 200 };
      const L = 170;
      const P0 = { x: H.x - L * Math.sin(rad(i)), y: H.y - L * Math.cos(rad(i)) };
      const P1 = { x: H.x + L * Math.sin(rad(i)), y: H.y - L * Math.cos(rad(i)) };
      const torchDeg = (Math.atan2(H.y - P0.y, H.x - P0.x) * 180) / Math.PI;
      return (
        <PhysSvg box={[0, v.ends ? 0 : 20, 400, v.ends ? 236 : 216]} label={`Light reflecting off a mirror at ${i} degrees`}>
          <rect x={50} y={200} width={300} height={8} rx="3" className="ph-mirror" />
          <Ground x1={50} x2={350} y={208} />
          {(v.normal ?? true) && <line x1={200} y1={200} x2={200} y2={36} className="ph-normal" />}
          <RayLine x1={P0.x} y1={P0.y} x2={H.x} y2={H.y} />
          <RayLine x1={H.x} y1={H.y} x2={P1.x} y2={P1.y} />
          <Arc cx={200} cy={200} a1={90} a2={90 + i} r={52} m={v.incident} ctx={ctx} colour="berry" />
          <Arc cx={200} cy={200} a1={90 - i} a2={90} r={64} m={v.reflected} ctx={ctx} colour="leaf" />
          {v.ends && (
            <g>
              <Torch x={P0.x + 22 * Math.cos(rad(torchDeg))} y={P0.y + 22 * Math.sin(rad(torchDeg))} deg={torchDeg} />
              <Emoji x={P1.x + 6} y={P1.y - 6} e="👁️" size={36} />
            </g>
          )}
        </PhysSvg>
      );
    }
    case "refraction": {
      const i = v.angle;
      const r = snell(i, v.n1, v.n2);
      const H = { x: 200, y: 150 };
      const L = 130;
      const P0 = { x: H.x - L * Math.sin(rad(i)), y: H.y - L * Math.cos(rad(i)) };
      const Pr = { x: H.x + L * Math.sin(rad(i)), y: H.y - L * Math.cos(rad(i)) };
      const P2 = r === null ? null : { x: H.x + L * Math.sin(rad(r)), y: H.y + L * Math.cos(rad(r)) };
      const denser = v.n2 > v.n1;
      return (
        <PhysSvg box={[0, 0, 400, 300]} label="Light bending at a boundary">
          <rect x={10} y={150} width={380} height={140} rx="0" className={`ph-medium-2${denser ? "" : " light"}`} />
          <rect x={10} y={10} width={380} height={140} className={`ph-medium-1${denser ? "" : " dense"}`} />
          <line x1={10} y1={150} x2={390} y2={150} className="ph-boundary" />
          <line x1={200} y1={26} x2={200} y2={274} className="ph-normal" />
          {v.top && (
            <Note x={24} y={38} anchor="start">
              {v.top}
            </Note>
          )}
          {v.bottom && (
            <Note x={24} y={278} anchor="start">
              {v.bottom}
            </Note>
          )}
          <RayLine x1={P0.x} y1={P0.y} x2={H.x} y2={H.y} />
          {P2 ? <RayLine x1={H.x} y1={H.y} x2={P2.x} y2={P2.y} /> : null}
          {(r === null || v.reflected) && (
            <g className={r === null ? "" : "ph-faint"}>
              <RayLine x1={H.x} y1={H.y} x2={Pr.x} y2={Pr.y} />
            </g>
          )}
          <Arc cx={200} cy={150} a1={90} a2={90 + i} r={50} m={v.incident} ctx={ctx} colour="berry" />
          {r !== null && <Arc cx={200} cy={150} a1={270} a2={270 + r} r={50} m={v.refracted} ctx={ctx} colour="leaf" />}
        </PhysSvg>
      );
    }
    case "lens":
      return <LensDiagram v={v} ctx={ctx} />;
    case "see":
      return (
        <PhysSvg box={[0, 0, 400, 230]} label="Light bouncing off an object into an eye">
          <Emoji x={60} y={54} e={v.source ?? "☀️"} size={58} />
          <Emoji x={200} y={168} e={v.object} size={64} />
          <Emoji x={350} y={88} e="👁️" size={48} />
          <RayLine x1={88} y1={80} x2={176} y2={142} colour="tangerine" />
          <RayLine x1={226} y1={146} x2={322} y2={100} colour="tangerine" />
          {v.label && (
            <Note x={200} y={222}>
              {v.label}
            </Note>
          )}
        </PhysSvg>
      );
  }
}

function LensDiagram({ v, ctx }: { v: Extract<Of<"phys-rays">, { scene: "lens" }>; ctx: Ctx }) {
  const mirror = v.optic === "concave" || v.optic === "convex";
  const { f, di, m } = lensImage(v.optic, v.focal, v.object);
  const ho = v.height ?? v.focal / 2;
  const hi = m * ho;
  const imgX = mirror ? -di : di;
  const virtual = di < 0;
  const show = (v.showImage ?? true) || ctx.solved;
  const unit = v.unit ?? "cm";
  const fa = Math.abs(f);
  // Where each principal ray meets the optic.
  const hits = [ho, 0, (-ho * f) / (v.object - f)].filter((y, k) => k < 2 || Math.abs(y) <= 2.5 * Math.max(ho, Math.abs(hi)));
  const xsWorld = [-v.object, 0, -fa, fa, show ? imgX : 0];
  if (v.twoF) xsWorld.push(-2 * fa, 2 * fa);
  const minX = Math.min(...xsWorld) - 0.25 * fa;
  const maxX = Math.max(...xsWorld) + (mirror ? 0.3 : 0.45) * fa;
  const sx = 370 / (maxX - minX);
  const ys = [ho, show ? hi : 0, ...hits];
  const H = Math.max(...ys.map(Math.abs)) * 1.15;
  const sy = 92 / Math.max(ho, show ? Math.abs(hi) : 0, H / 1.6);
  const X = (x: number) => 20 + (x - minX) * sx;
  const axisY = 30 + Math.max(...ys, 0) * sy * 1.12 + 10;
  const Y = (y: number) => axisY - y * sy;
  const lensH = Math.max(H, ho * 1.3) * sy;
  const rays: ReactNode[] = [];
  const colours: Colour[] = ["berry", "wave", "leaf"];
  if (v.rays ?? true)
    hits.forEach((yl, k) => {
      const c = colours[k];
      const tip = { x: X(-v.object), y: Y(ho) };
      const hit = { x: X(0), y: Y(yl) };
      rays.push(<RayLine key={`in${k}`} x1={tip.x} y1={tip.y} x2={hit.x} y2={hit.y} colour={c} />);
      if (!show) return;
      const img = { x: X(imgX), y: Y(hi) };
      let dx: number;
      let dy: number;
      if (!virtual) {
        dx = img.x - hit.x;
        dy = img.y - hit.y;
      } else {
        dx = hit.x - img.x;
        dy = hit.y - img.y;
      }
      const edge = mirror ? X(minX) : X(maxX);
      const t = (edge - hit.x) / dx;
      if (!(t > 0) || !Number.isFinite(t)) return;
      rays.push(<line key={`out${k}`} x1={hit.x} y1={hit.y} x2={hit.x + dx * t} y2={hit.y + dy * t} className="ph-ray" style={{ stroke: col(c) }} />);
      if (virtual) rays.push(<line key={`ext${k}`} x1={hit.x} y1={hit.y} x2={img.x} y2={img.y} className="ph-ray dashed" style={{ stroke: col(c) }} />);
    });
  const lx = X(0);
  const optic =
    v.optic === "converging" ? (
      <path d={`M${lx} ${axisY - lensH} Q${lx + 18} ${axisY} ${lx} ${axisY + lensH} Q${lx - 18} ${axisY} ${lx} ${axisY - lensH} Z`} className="ph-lens" />
    ) : v.optic === "diverging" ? (
      <path
        d={`M${lx - 11} ${axisY - lensH} L${lx + 11} ${axisY - lensH} Q${lx + 1} ${axisY} ${lx + 11} ${axisY + lensH} L${lx - 11} ${axisY + lensH} Q${lx - 1} ${axisY} ${lx - 11} ${axisY - lensH} Z`}
        className="ph-lens"
      />
    ) : (
      <g>
        <path d={`M${lx + (v.optic === "concave" ? -12 : 12)} ${axisY - lensH} Q${lx + (v.optic === "concave" ? 12 : -12)} ${axisY} ${lx + (v.optic === "concave" ? -12 : 12)} ${axisY + lensH}`} className="ph-curved-mirror" />
        {range(Math.floor((2 * lensH) / 16)).map((i) => {
          const yy = axisY - lensH + 8 + i * 16;
          const tt = (yy - axisY) / lensH;
          const xx = lx + (v.optic === "concave" ? -12 + 24 * (1 - tt * tt) / 2 + 0 : 12 - 24 * (1 - tt * tt) / 2) + 2;
          return <line key={i} x1={xx + 2} y1={yy} x2={xx + 11} y2={yy - 8} className="ph-hatch" />;
        })}
      </g>
    );
  const focal: ReactNode[] = [];
  const mark = (x: number, name: string) =>
    focal.push(
      <g key={`${name}${x}`}>
        <circle cx={X(x)} cy={axisY} r="5" className="ph-focal" />
        <text x={X(x)} y={axisY + 24} className="ph-tiny strong" textAnchor="middle">
          {name}
        </text>
      </g>,
    );
  if (!mirror) {
    mark(-fa, "F");
    mark(fa, "F");
    if (v.twoF) {
      mark(-2 * fa, "2F");
      mark(2 * fa, "2F");
    }
  } else {
    const side = v.optic === "concave" ? -1 : 1;
    mark(side * fa, "F");
    if (v.twoF) mark(side * 2 * fa, "C");
  }
  const L = v.labels ?? {};
  const dims: ReactNode[] = [];
  let level = Math.max(axisY + 52, axisY + lensH + 26, show ? Y(hi) + 30 : 0);
  const dim = (a: number, b: number, mk: typeof L.f, key: string) => {
    if (mk === undefined || mk === null) return;
    const yy = level;
    level += 40;
    dims.push(
      <g key={key}>
        <Dimension x1={X(Math.min(a, b))} y1={yy} x2={X(Math.max(a, b))} y2={yy} m={mk} unit={unit} ctx={ctx} side={-1} gap={12} />
      </g>,
    );
  };
  dim(-v.object, 0, L.object, "do");
  if (show) dim(imgX, 0, L.image, "di");
  dim(mirror ? (v.optic === "concave" ? -fa : fa) : -fa, 0, L.f, "f");
  const height = Math.max(axisY + lensH + 14, axisY + 30 + Math.max(...[hi, 0].map((y) => (show ? -y * sy : 0))), level - 6);
  return (
    <PhysSvg box={[8, Math.min(16, axisY - lensH - 10), 386, height - Math.min(16, axisY - lensH - 10) + 6]} label={`Ray diagram for a ${v.optic} ${mirror ? "mirror" : "lens"}`}>
      <line x1={X(minX)} y1={axisY} x2={X(maxX)} y2={axisY} className="ph-axis-line" />
      {optic}
      {focal}
      {rays}
      <Arrow x1={X(-v.object)} y1={axisY} x2={X(-v.object)} y2={Y(ho)} colour="night" width={5} />
      {show && Math.abs(hi) > 1e-9 && <Arrow x1={X(imgX)} y1={axisY} x2={X(imgX)} y2={Y(hi)} colour="grape" width={5} dashed={virtual} />}
      {dims}
    </PhysSvg>
  );
}

/* ------------------------------------------------------------------- sound */

function SoundSource({ s, x, y }: { s: Extract<Of<"phys-sound">, { scene: "vibrate" }>["source"]; x: number; y: number }) {
  switch (s) {
    case "drum":
      return (
        <g className="ph-drum">
          <path d={`M${x - 46} ${y - 16} L${x - 46} ${y + 34} A46 14 0 0 0 ${x + 46} ${y + 34} L${x + 46} ${y - 16}`} className="ph-drum-body" />
          <ellipse cx={x} cy={y - 16} rx="46" ry="14" className="ph-drum-top" />
          <path d={`M${x - 30} ${y - 64} L${x - 8} ${y - 22} M${x + 34} ${y - 66} L${x + 10} ${y - 24}`} className="ph-stick" />
          <path d={`M${x - 20} ${y - 38} q6 -6 12 0 q6 6 12 0`} className="ph-buzz" />
        </g>
      );
    case "string":
      return (
        <g>
          <rect x={x - 54} y={y - 46} width="10" height="92" rx="3" className="ph-post" />
          <rect x={x + 44} y={y - 46} width="10" height="92" rx="3" className="ph-post" />
          <path d={`M${x - 44} ${y} Q${x} ${y - 30} ${x + 44} ${y}`} className="ph-string-v" />
          <path d={`M${x - 44} ${y} Q${x} ${y + 30} ${x + 44} ${y}`} className="ph-string-v ghost" />
        </g>
      );
    case "fork":
      return (
        <g>
          <path d={`M${x - 14} ${y - 60} L${x - 14} ${y} Q${x - 14} ${y + 16} ${x} ${y + 16} Q${x + 14} ${y + 16} ${x + 14} ${y} L${x + 14} ${y - 60}`} className="ph-fork" />
          <line x1={x} y1={y + 16} x2={x} y2={y + 60} className="ph-fork" />
          <path d={`M${x - 26} ${y - 50} q-6 10 0 20 M${x + 26} ${y - 50} q6 10 0 20`} className="ph-buzz" />
        </g>
      );
    case "speaker":
      return (
        <g>
          <rect x={x - 40} y={y - 56} width="56" height="112" rx="10" className="ph-speaker" />
          <circle cx={x - 12} cy={y + 14} r="22" className="ph-cone" />
          <circle cx={x - 12} cy={y + 14} r="8" className="ph-cone-in" />
          <circle cx={x - 12} cy={y - 32} r="9" className="ph-cone" />
        </g>
      );
    case "bell":
      return <Emoji x={x} y={y} e="🔔" size={74} />;
  }
}

export function Sound({ v, ctx }: { v: Of<"phys-sound">; ctx: Ctx }) {
  if (v.scene === "vibrate") {
    const n = v.rings ?? 3;
    const gap = v.pitch === "high" ? 22 : v.pitch === "low" ? 52 : 34;
    const cx = 120;
    const cy = 120;
    const arcs = range(n).map((i) => {
      const r = 46 + i * gap;
      const a = (42 * Math.PI) / 180;
      return (
        <path
          key={i}
          d={`M${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`}
          className={`ph-sound-arc${v.loud ? " loud" : ""}`}
          style={{ opacity: 1 - i * 0.18, "--i": i } as CSSProperties}
        />
      );
    });
    return (
      <PhysSvg box={[0, 20, 410, 210]} label={`A ${v.source} making sound`} cls={v.animate ? "ph-anim" : ""}>
        <g className="ph-sound-waves">{arcs}</g>
        <SoundSource s={v.source} x={70} y={cy} />
        {v.ear && <Emoji x={370} y={cy} e="👂" size={52} />}
        {v.label && (
          <Note x={70} y={218}>
            {v.label}
          </Note>
        )}
      </PhysSvg>
    );
  }
  const y = 100;
  let carrier: ReactNode;
  if (v.via === "light")
    carrier = (
      <g>
        <polygon points={`92,${y - 12} 326,${y - 30} 326,${y + 30} 92,${y + 12}`} className="ph-beam" />
        {range(4).map((i) => (
          <circle key={i} cx={130 + i * 50} cy={y} r={i % 2 ? 5 : 9} className="ph-flash" />
        ))}
      </g>
    );
  else if (v.via === "sound")
    carrier = (
      <g>
        {range(5).map((i) => {
          const r = 40 + i * 48;
          const a = (22 * Math.PI) / 180;
          return <path key={i} d={`M${50 + r * Math.cos(a)} ${y - r * Math.sin(a)} A${r} ${r} 0 0 1 ${50 + r * Math.cos(a)} ${y + r * Math.sin(a)}`} className="ph-sound-arc" />;
        })}
      </g>
    );
  else carrier = <path d={`M96 ${y} ${range(14).map((i) => `L${110 + i * 16} ${y + (i % 2 ? 12 : -12)}`).join(" ")} L324 ${y}`} className="ph-radio" />;
  return (
    <PhysSvg box={[0, 20, 410, v.distance !== undefined && v.distance !== null ? 190 : 150]} label={`Sending a signal with ${v.via}`}>
      {carrier}
      <Emoji x={50} y={y} e={v.sender} size={56} />
      <Emoji x={360} y={y} e={v.receiver} size={56} />
      {v.message && (
        <text x={208} y={y - 42} className="ph-label ph-sm halo" textAnchor="middle">
          {v.message}
        </text>
      )}
      <Dimension x1={50} y1={y + 54} x2={360} y2={y + 54} m={v.distance} unit={v.unit ?? "m"} ctx={ctx} side={-1} gap={12} />
    </PhysSvg>
  );
}
