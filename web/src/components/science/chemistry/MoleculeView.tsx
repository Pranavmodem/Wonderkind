/** Lewis structures, structural formulas and ball-and-stick models. */
import type { ChemistryVisual } from "../../../game/science/chemistryTypes";
import { AtomBall, askClass, shownMark } from "./Formula";
import { loneDirections, MOLECULES, normFormula, vseprMolecule, type Molecule } from "./molecules";

type Of<K extends ChemistryVisual["kind"]> = Extract<ChemistryVisual, { kind: K }>;

/** The molecule a chem-molecule picture describes. */
export function moleculeOf(v: Of<"chem-molecule">): Molecule {
  if (v.molecule) return MOLECULES[normFormula(v.molecule)] ?? { atoms: [], bonds: [] };
  if (v.vsepr) return vseprMolecule(v.vsepr.center, v.vsepr.outer, v.vsepr.bonds, v.vsepr.lone, v.vsepr.outerLone);
  return { atoms: v.atoms ?? [], bonds: v.bonds ?? [], ionCharge: v.ionCharge };
}

const BOND = 66;
const BALL_BOND = 78;

export function MoleculeView({ v, solved, answer }: { v: Of<"chem-molecule">; solved: boolean; answer: string }) {
  const style = v.style ?? "lewis";
  let mol = moleculeOf(v);
  // Ball-and-stick pictures of "centre + identical outer atoms" use the 3D VSEPR layout.
  if (style === "ball" && mol.ax && !v.vsepr) {
    const outerEls = mol.atoms.slice(1).map((a) => a.el);
    if (outerEls.length === mol.ax.n && outerEls.every((e) => e === outerEls[0]) && mol.bonds.every((b) => b.a === 0 && (b.order ?? 1) === 1)) mol = { ...vseprMolecule(mol.atoms[0].el, outerEls[0], mol.ax.n, mol.ax.m), ionCharge: mol.ionCharge };
  }
  const ionCharge = v.ionCharge ?? mol.ionCharge;
  const showLone = v.lonePairs ?? style === "lewis";
  const ball = style === "ball";
  const bl = ball ? BALL_BOND : BOND;
  const pts = mol.atoms.map((a) => ({ ...a, px: a.x * bl, py: a.y * bl }));
  const bondsOf = (i: number) => mol.bonds.filter((b) => b.a === i || b.b === i);
  const lone = pts.map((a, i) => {
    const count = a.lone ?? 0;
    if (!count) return [] as number[];
    if (a.loneDirs && a.loneDirs.length >= count) return a.loneDirs.slice(0, count);
    const taken = bondsOf(i).map((b) => {
      const o = pts[b.a === i ? b.b : b.a];
      return Math.atan2(o.py - a.py, o.px - a.px);
    });
    return loneDirections(taken, count);
  });
  const rOf = (el: string) => (el === "H" ? 17 : 24);
  const pad = ball ? 30 : showLone ? 40 : 28;
  // Lone-pair lobes stick out past the atoms in ball pictures.
  const lobeTips = ball && showLone ? pts.flatMap((a, i) => lone[i].map((ang) => ({ px: a.px + Math.cos(ang) * 46, py: a.py + Math.sin(ang) * 46 }))) : [];
  const xs = [...pts, ...lobeTips].map((p) => p.px);
  const ys = [...pts, ...lobeTips].map((p) => p.py);
  let minX = Math.min(...xs) - pad;
  let maxX = Math.max(...xs) + pad;
  let minY = Math.min(...ys) - pad;
  let maxY = Math.max(...ys) + pad;
  if (ionCharge) {
    minX -= 14;
    maxX += 34;
    minY -= 6;
  }
  const angleMark = v.angle !== undefined && v.angle !== null && pts.length >= 3 ? v.angle : undefined;
  if (angleMark !== undefined) maxY += 4;
  const w = Math.max(160, maxX - minX);
  const h = Math.max(110, maxY - minY);
  const ox = (w - (maxX - minX)) / 2 - minX;
  const oy = (h - (maxY - minY)) / 2 - minY;
  const P = pts.map((p) => ({ ...p, X: p.px + ox, Y: p.py + oy }));
  const trim = ball ? 0 : 17;

  // Draw order for ball pictures: away bonds/atoms first, toward ones last.
  const depth = (i: number) => {
    const b = mol.bonds.find((bb) => (bb.a === 0 && bb.b === i) || (bb.b === 0 && bb.a === i));
    return b?.wedge === "toward" ? 1 : b?.wedge === "away" ? -1 : 0;
  };

  const bondEls = mol.bonds.map((b, k) => {
    const A = P[b.a];
    const B = P[b.b];
    const dx = B.X - A.X;
    const dy = B.Y - A.Y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const x1 = A.X + ux * trim;
    const y1 = A.Y + uy * trim;
    const x2 = B.X - ux * trim;
    const y2 = B.Y - uy * trim;
    if (b.wedge === "toward" && !ball) {
      return <path key={k} d={`M${x1} ${y1} L${x2 + nx * 7} ${y2 + ny * 7} L${x2 - nx * 7} ${y2 - ny * 7} Z`} className="chem-wedge" />;
    }
    if (b.wedge === "away" && !ball) {
      const hashes = Array.from({ length: 7 }, (_, i) => {
        const t = (i + 1) / 8;
        const wdt = 1.5 + 6 * t;
        const cx = x1 + (x2 - x1) * t;
        const cy = y1 + (y2 - y1) * t;
        return <line key={i} x1={cx + nx * wdt} y1={cy + ny * wdt} x2={cx - nx * wdt} y2={cy - ny * wdt} />;
      });
      return (
        <g key={k} className="chem-hash">
          {hashes}
        </g>
      );
    }
    const order = b.order ?? 1;
    const offs = order === 1 ? [0] : order === 2 ? [-1, 1] : [-1.4, 0, 1.4];
    const gap = ball ? 6 : 5;
    return (
      <g key={k} className={ball ? `chem-stick${b.wedge === "away" ? " away" : ""}` : "chem-bond"}>
        {offs.map((o) => (
          <line key={o} x1={x1 + nx * o * gap} y1={y1 + ny * o * gap} x2={x2 + nx * o * gap} y2={y2 + ny * o * gap} />
        ))}
      </g>
    );
  });

  const loneEls = P.flatMap((a, i) =>
    showLone
      ? lone[i].map((ang, j) => {
          if (ball) {
            const d = 32;
            return <ellipse key={`l${i}-${j}`} cx={a.X + Math.cos(ang) * d} cy={a.Y + Math.sin(ang) * d} rx={19} ry={11} transform={`rotate(${(ang * 180) / Math.PI} ${a.X + Math.cos(ang) * d} ${a.Y + Math.sin(ang) * d})`} className="chem-lobe" />;
          }
          const d = 23;
          const cx = a.X + Math.cos(ang) * d;
          const cy = a.Y + Math.sin(ang) * d;
          const px = -Math.sin(ang) * 5.5;
          const py = Math.cos(ang) * 5.5;
          return (
            <g key={`l${i}-${j}`}>
              <circle cx={cx + px} cy={cy + py} r={3.6} className="chem-dot" />
              <circle cx={cx - px} cy={cy - py} r={3.6} className="chem-dot" />
            </g>
          );
        })
      : [],
  );

  const order = P.map((_, i) => i).sort((a, b) => depth(a) - depth(b));
  const atomEls = order.map((i) => {
    const a = P[i];
    if (ball) {
      const s = depth(i) === 1 ? 1.12 : depth(i) === -1 ? 0.86 : 1;
      return <AtomBall key={i} el={a.el} x={a.X} y={a.Y} r={rOf(a.el) * s} />;
    }
    return (
      <g key={i}>
        <text x={a.X} y={a.Y + 10} className="chem-lewis-atom">
          {a.el}
        </text>
        {a.charge && (
          <text x={a.X + 15} y={a.Y - 12} className="chem-formal">
            {a.charge}
          </text>
        )}
      </g>
    );
  });

  // Bond angle arc between the first two bonds at atom 0.
  let angleEl = null;
  if (angleMark !== undefined) {
    const nb = bondsOf(0).slice(0, 2);
    if (nb.length === 2) {
      const c = P[0];
      const ends = nb.map((b) => P[b.a === 0 ? b.b : b.a]);
      let a1 = Math.atan2(ends[0].Y - c.Y, ends[0].X - c.X);
      let a2 = Math.atan2(ends[1].Y - c.Y, ends[1].X - c.X);
      let d = a2 - a1;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      if (d < 0) [a1, a2, d] = [a2, a1, -d];
      const r = 32;
      const mid = a1 + d / 2;
      const big = d > Math.PI - 0.01;
      const text = typeof angleMark === "number" ? `${angleMark}°` : shownMark(angleMark, solved, answer);
      angleEl = (
        <g>
          <path d={`M${c.X + r * Math.cos(a1)} ${c.Y + r * Math.sin(a1)} A${r} ${r} 0 ${big ? 1 : 0} 1 ${c.X + r * Math.cos(a2)} ${c.Y + r * Math.sin(a2)}`} className="chem-angle-arc" />
          <text x={c.X + (r + 22) * Math.cos(big ? Math.PI / 2 : mid)} y={c.Y + (r + 22) * Math.sin(big ? Math.PI / 2 : mid) + 7} className={`chem-angle-text${askClass(angleMark, solved)}`}>
            {text}
          </text>
        </g>
      );
    }
  }

  const shapeText = v.shape === true ? (mol.shape ?? "") : v.shape === false || v.shape === undefined ? "" : shownMark(v.shape, solved, answer);
  const nameText = v.name === undefined ? "" : shownMark(v.name, solved, answer);
  return (
    <div className="chem-molecule">
      <svg className="chem-mol-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-hidden="true" style={{ maxWidth: `${Math.round(w * 1.25)}px` }}>
        {ball && loneEls}
        {bondEls}
        {angleEl}
        {atomEls}
        {!ball && loneEls}
        {ionCharge && (
          <g>
            <path d={`M${minX + ox + 12} ${minY + oy + 6} h-8 v${maxY - minY - 12} h8`} className="chem-bracket thin" />
            <path d={`M${maxX + ox - 30} ${minY + oy + 6} h8 v${maxY - minY - 12} h-8`} className="chem-bracket thin" />
            <text x={maxX + ox - 16} y={minY + oy + 22} className="chem-formal big">
              {ionCharge}
            </text>
          </g>
        )}
      </svg>
      {(shapeText || nameText) && (
        <div className="chem-caption">
          {nameText && <span className={askClass(v.name, solved)}>{nameText}</span>}
          {shapeText && <span className={`chem-shape-name${askClass(v.shape === true ? undefined : (v.shape as never), solved)}`}>{shapeText}</span>}
        </div>
      )}
    </div>
  );
}
