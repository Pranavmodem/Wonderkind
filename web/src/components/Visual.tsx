import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { CellKind, Thing, Visual as VisualModel } from "../game/types";
import { say, sfx } from "../game/sound";
import { BoxPlot, Net, Plot, RightTriangle, Slice, Spinner, Tree, UnitCircle, Venn } from "./visuals/GraphVisuals";
import { CircleParts, Matrices, Solid, Transversal, Triangle } from "./visuals/GeometryVisuals";
import { Art } from "./art/Art";
import { chemistryVisual } from "./science/ChemistryVisuals";
import { physicsVisual } from "./science/PhysicsVisuals";
import type { ChemistryVisual } from "../game/science/chemistryTypes";
import type { PhysicsVisual } from "../game/science/physicsTypes";
import { Bars, Clock, Coins, Dots, Jug, Lengths, Pictograph, Ruler, Scale } from "./visuals/MeasureVisuals";
import {
  AreaModel,
  Bond,
  Fractions,
  HundredChart,
  HundredGrid,
  Marbles,
  NumberLine,
  Pattern,
  Places,
  Table,
  Tape,
} from "./visuals/NumberVisuals";
import { Angles, Box, CircleFig, Grid, Lines, LShape, Polygon, Protractor, Rect, RectsRow, ShapeSvg, Shapes } from "./visuals/ShapeVisuals";

interface Props {
  v: VisualModel;
  /** Pulse the pieces one by one so the kid can count along. */
  hint: boolean;
  /** Number the pieces that make the answer. */
  reveal: boolean;
  /** Show the finished picture (fill the gap, share the plates). */
  solved: boolean;
  /** The answer as it should read in a "?" slot once solved. */
  answer: string;
  /** For "which has more": the kid answers by tapping a side. */
  onPick?: (value: number, from: Element) => void;
  wrong?: number[];
}

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/**
 * Tap-to-count: each tap numbers the piece and says the running total aloud.
 * Rods add 10 and flats 100, so tapping blocks teaches counting on.
 */
function useCounter(reveal: boolean) {
  const [taps, setTaps] = useState<Record<string, number>>({});

  return {
    tap(id: string, step: number) {
      if (reveal || taps[id] !== undefined) return;
      const total = Math.max(0, ...Object.values(taps)) + step;
      setTaps({ ...taps, [id]: total });
      sfx.count(Object.keys(taps).length + 1);
      say(String(total));
    },
    /** The badge to show: the answer count when revealing, else the kid's own count. */
    shown(id: string, revealValue: number | undefined) {
      return reveal ? revealValue : taps[id];
    },
  };
}

type Counter = ReturnType<typeof useCounter>;

function Piece({
  id,
  counter,
  step = 1,
  revealValue,
  order = 0,
  index,
  className = "",
  children,
}: {
  id: string;
  counter: Counter;
  step?: number;
  /** Badge value when the answer is revealed; undefined if this piece isn't counted. */
  revealValue?: number;
  order?: number;
  index: number;
  className?: string;
  children?: ReactNode;
}) {
  const value = counter.shown(id, revealValue);
  return (
    <span className={`piece ${className}`} style={{ "--i": index } as CSSProperties} onClick={() => counter.tap(id, step)}>
      {children}
      {value !== undefined && (
        <span className="badge" style={{ "--order": order } as CSSProperties}>
          {value}
        </span>
      )}
    </span>
  );
}

function Things({
  thing,
  count,
  prefix,
  counter,
  cols = 5,
  start = 0,
  gone = 0,
  countFrom = 0,
  counted = true,
}: {
  thing: Thing;
  count: number;
  prefix: string;
  counter: Counter;
  cols?: number;
  /** Pieces counted before this group, so numbering carries on across groups. */
  start?: number;
  gone?: number;
  /** Only pieces from this index on are part of the answer (the extras in "how many more"). */
  countFrom?: number;
  counted?: boolean;
}) {
  return (
    <div className="things" style={{ "--cols": Math.min(count, cols) } as CSSProperties}>
      {range(count).map((i) => {
        const isGone = i >= count - gone;
        const inAnswer = counted && !isGone && i >= countFrom;
        return (
          <Piece
            key={i}
            id={`${prefix}${i}`}
            counter={counter}
            revealValue={inAnswer ? start + i - countFrom + 1 : undefined}
            order={start + i - countFrom}
            index={start + i}
            className={`thing${isGone ? " gone" : ""}${countFrom && i >= countFrom ? " extra" : ""}`}
          >
            <span className="emoji">
              <Art emoji={thing.emoji} />
            </span>
          </Piece>
        );
      })}
    </div>
  );
}

function Cross() {
  return (
    <svg className="cross" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function TenFrames({ cells, counter, solved }: { cells: CellKind[]; counter: Counter; solved: boolean }) {
  const frames = Math.max(1, Math.ceil(cells.length / 10));
  const kinds = new Set(cells);
  // Number only the cells that make the answer.
  const answerKinds: CellKind[] = kinds.has("target") ? ["target"] : kinds.has("gone") ? ["a"] : ["a", "b"];
  const revealValues: (number | undefined)[] = [];
  let running = 0;
  for (const kind of cells) revealValues.push(answerKinds.includes(kind) ? ++running : undefined);

  return (
    <div className="frames">
      {range(frames).map((f) => (
        <div className="frame" key={f}>
          {range(10).map((c) => {
            const i = f * 10 + c;
            const kind = cells[i];
            return (
              <span className="cell" key={c}>
                {kind && (
                  <Piece
                    id={`c${i}`}
                    counter={counter}
                    revealValue={revealValues[i]}
                    order={(revealValues[i] ?? 1) - 1}
                    index={i}
                    className={`dot dot-${kind}${solved && kind === "target" ? " filled" : ""}`}
                  >
                    {kind === "gone" && <Cross />}
                  </Piece>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Blocks({
  numbers,
  goneTens = 0,
  joiner = "+",
  counter,
}: {
  numbers: number[];
  goneTens?: number;
  joiner?: "+" | "vs";
  counter: Counter;
}) {
  let running = 0;
  let index = 0;
  return (
    <div className="blocks">
      {numbers.map((n, k) => {
        const hundreds = Math.floor(n / 100);
        const tens = Math.floor((n % 100) / 10);
        const ones = n % 10;
        return (
          <div className="block-group" key={k}>
            {k > 0 && <span className={`op${joiner === "vs" ? " op-vs" : ""}`}>{joiner}</span>}
            {hundreds > 0 && (
              <div className="flats">
                {range(hundreds).map((t) => {
                  const order = index++;
                  return (
                    <Piece
                      key={t}
                      id={`h${k}-${t}`}
                      step={100}
                      counter={counter}
                      revealValue={(running += 100)}
                      order={order}
                      index={order}
                      className="flat"
                    >
                      {range(100).map((u) => (
                        <i key={u} />
                      ))}
                    </Piece>
                  );
                })}
              </div>
            )}
            {tens > 0 && (
              <div className="rods">
                {range(tens).map((t) => {
                  const isGone = k === 0 && t >= tens - goneTens;
                  const order = index++;
                  return (
                    <Piece
                      key={t}
                      id={`r${k}-${t}`}
                      step={10}
                      counter={counter}
                      revealValue={isGone ? undefined : (running += 10)}
                      order={order}
                      index={order}
                      className={isGone ? "rod gone" : "rod"}
                    >
                      {range(10).map((u) => (
                        <i key={u} />
                      ))}
                      {isGone && <Cross />}
                    </Piece>
                  );
                })}
              </div>
            )}
            {ones > 0 && (
              <div className="cubes">
                {range(ones).map((u) => {
                  const order = index++;
                  return (
                    <Piece key={u} id={`u${k}-${u}`} counter={counter} revealValue={++running} order={order} index={order} className="cube">
                      <i />
                    </Piece>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A fixed pseudo-random order so scattered pictures don't jump between renders. */
function scatterSpots(count: number) {
  const cols = 5;
  const rows = Math.ceil(count / cols) + 1;
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  cells.sort((a, b) => ((a * 7919 + count * 31) % 101) - ((b * 7919 + count * 31) % 101));
  return cells.slice(0, count).map((c, i) => ({
    x: ((c % cols) + 0.5) * (100 / cols) + (((i * 37) % 9) - 4),
    y: (Math.floor(c / cols) + 0.5) * (100 / rows) + (((i * 53) % 9) - 4),
  }));
}

function ObjectsLayout({
  v,
  counter,
  showAnyway,
}: {
  v: Extract<VisualModel, { kind: "objects" }>;
  counter: Counter;
  showAnyway: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!v.flash) return;
    const t = window.setTimeout(() => setHidden(true), 1500);
    return () => window.clearTimeout(t);
  }, [v.flash]);

  if (hidden && !showAnyway) {
    return (
      <div className="flash-cover">
        <span aria-hidden="true">🙈</span>
        How many did you see?
      </div>
    );
  }
  const layout = v.layout ?? "rows";
  if (layout === "line") {
    return (
      <div className="line-fit">
        <Things thing={v.thing} count={v.count} prefix="o" counter={counter} cols={v.count} />
      </div>
    );
  }
  if (layout === "rows") {
    return <Things thing={v.thing} count={v.count} prefix="o" counter={counter} cols={5} />;
  }
  const spots =
    layout === "circle"
      ? range(v.count).map((i) => {
          const a = (i / v.count) * 2 * Math.PI - Math.PI / 2;
          return { x: 50 + 40 * Math.cos(a), y: 50 + 40 * Math.sin(a) };
        })
      : scatterSpots(v.count);
  return (
    <div className={`spread spread-${layout}`}>
      {spots.map((p, i) => (
        <span key={i} className="spread-spot" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <Piece id={`o${i}`} counter={counter} revealValue={i + 1} order={i} index={i} className="thing">
            <span className="emoji">
              <Art emoji={v.thing.emoji} />
            </span>
          </Piece>
        </span>
      ))}
    </div>
  );
}

export function Visual({ v, hint, reveal, solved, answer, onPick, wrong = [] }: Props) {
  const counter = useCounter(reveal);
  const cls = `visual visual-${v.kind}${hint ? " hinting" : ""}${reveal ? " revealing" : ""}`;
  const plain = (label: string, children: ReactNode) => (
    <div className={cls} role="group" aria-label={label}>
      {children}
    </div>
  );

  if (v.kind.startsWith("phys-") || v.kind.startsWith("chem-")) {
    const drawn = v.kind.startsWith("phys-")
      ? physicsVisual(v as PhysicsVisual, solved, answer)
      : chemistryVisual(v as ChemistryVisual, solved, answer);
    return plain(drawn.label, drawn.body);
  }

  switch (v.kind) {
    case "none":
      return null;

    case "objects":
      return (
        <div className={cls} role="group" aria-label={`Picture of ${v.thing.many} to count`}>
          <ObjectsLayout v={v} counter={counter} showAnyway={hint || reveal} />
        </div>
      );

    case "takeaway":
      return plain(
        `Picture of ${v.thing.many}, some going away`,
        <Things thing={v.thing} count={v.total} prefix="o" counter={counter} gone={v.gone} />,
      );

    case "add":
      return plain(
        `Two groups of ${v.thing.many}`,
        <>
          <div className="group group-a">
            <Things thing={v.thing} count={v.a} prefix="a" counter={counter} cols={3} />
          </div>
          <span className="op">+</span>
          <div className="group group-b">
            <Things thing={v.thing} count={v.b} prefix="b" counter={counter} cols={3} start={v.a} />
          </div>
        </>,
      );

    case "rows":
      return plain(
        `Two rows of ${v.thing.many}`,
        <div className="row-pair" style={{ "--cols": v.top } as CSSProperties}>
          <Things thing={v.thing} count={v.top} prefix="t" counter={counter} cols={v.top} countFrom={v.bottom} />
          <Things thing={v.thing} count={v.bottom} prefix="b" counter={counter} cols={v.top} counted={false} />
        </div>,
      );

    case "compare":
      return (
        <div className={cls}>
          {(["left", "right"] as const).map((side) => {
            const n = v[side];
            const isWrong = wrong.includes(n);
            const isRight = solved && n === Math.max(v.left, v.right);
            return (
              <button
                type="button"
                key={side}
                className={`side${isWrong ? " wrong" : ""}${isRight ? " right" : ""}`}
                disabled={isWrong || solved}
                onClick={(e) => onPick?.(n, e.currentTarget)}
                aria-label={`${side === "left" ? "Left" : "Right"} side`}
              >
                <span className="things" style={{ "--cols": Math.min(n, 5) } as CSSProperties}>
                  {range(n).map((i) => (
                    <span key={i} className="piece thing" style={{ "--i": i } as CSSProperties}>
                      <span className="emoji">
                        <Art emoji={v.thing.emoji} />
                      </span>
                      {reveal && (
                        <span className="badge" style={{ "--order": i } as CSSProperties}>
                          {i + 1}
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      );

    case "tenframe":
      return plain("Ten-frame of dots", <TenFrames cells={v.cells} counter={counter} solved={solved} />);

    case "groups":
      return plain(
        `${v.groups} groups of ${v.thing.many}`,
        range(v.groups).map((g) => {
          const on = v.highlight === undefined || g < v.highlight;
          return (
            <div className={`plate${v.highlight !== undefined && on ? " plate-on" : ""}`} key={g}>
              <Things thing={v.thing} count={v.each} prefix={`g${g}-`} counter={counter} cols={3} start={g * v.each} counted={on} />
            </div>
          );
        }),
      );

    case "share":
      return plain(
        `${v.thing.many} to share on ${v.groups} plates`,
        <>
          {!solved && (
            <div className="pile">
              <Things thing={v.thing} count={v.groups * v.each + (v.left ?? 0)} prefix="p" counter={counter} cols={6} />
            </div>
          )}
          <div className="plates">
            {range(v.groups).map((g) => (
              <div className="plate" key={g}>
                {solved ? (
                  <div className="things" style={{ "--cols": Math.min(v.each, 3) } as CSSProperties}>
                    {range(v.each).map((i) => (
                      <span key={i} className="piece thing arrive" style={{ "--i": g + i * v.groups } as CSSProperties}>
                        <span className="emoji">
                          <Art emoji={v.thing.emoji} />
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="plate-q">?</span>
                )}
              </div>
            ))}
          </div>
          {solved && (v.left ?? 0) > 0 && (
            <div className="leftover">
              <span className="leftover-label">Left over</span>
              <span>
                {range(v.left!).map((i) => (
                  <span key={i} className="emoji arrive" style={{ "--i": i } as CSSProperties}>
                    <Art emoji={v.thing.emoji} />
                  </span>
                ))}
              </span>
            </div>
          )}
        </>,
      );

    case "array":
      return plain(
        `${v.rows} rows of ${v.cols} dots`,
        range(v.rows).map((r) => (
          <Piece key={r} id={`row${r}`} step={v.cols} counter={counter} revealValue={(r + 1) * v.cols} order={r} index={r} className="row">
            {range(v.cols).map((c) => (
              <i key={c} />
            ))}
          </Piece>
        )),
      );

    case "blocks":
      return plain(
        "Base-ten blocks: flats are hundreds, sticks are tens, cubes are ones",
        <Blocks numbers={v.numbers} goneTens={v.goneTens} joiner={v.joiner} counter={counter} />,
      );

    case "sequence":
      return (
        <div className={cls}>
          {v.numbers.map((n, i) => (
            <span className="card" key={i} style={{ "--i": i } as CSSProperties}>
              {n}
            </span>
          ))}
          <span className={`card card-q${solved ? " filled" : ""}`}>{solved ? v.next : "?"}</span>
        </div>
      );

    case "fractions":
      return plain("Fraction picture", <Fractions bars={v.bars} solved={solved} />);
    case "numberline":
      return plain("Number line", <NumberLine {...v} solved={solved} />);
    case "rects":
      return plain("Rectangles", <RectsRow items={v.items} unit={v.unit} grid={v.grid} />);
    case "lshape":
      return plain("L-shaped figure", <LShape {...v} />);
    case "jug":
      return plain("Measuring jug", <Jug amount={v.amount} max={v.max} unit={v.unit} />);
    case "scale":
      return plain("Scale", <Scale amount={v.amount} max={v.max} unit={v.unit} emoji={v.emoji} />);
    case "places":
      return plain("Place value cards", <Places digits={v.digits} highlight={v.highlight} />);
    case "area":
      return plain("Area model", <AreaModel tens={v.tens} ones={v.ones} by={v.by} split={v.split} solved={solved} />);
    case "rect":
      return plain("Rectangle", <Rect {...v} />);
    case "polygon":
      return plain("Shape with base and height", <Polygon {...v} />);
    case "box":
      return plain("Box", <Box {...v} />);
    case "circle":
      return plain("Circle", <CircleFig {...v} />);
    case "angle":
      return plain("Angles", <Angles mode={v.mode} angles={v.angles} solved={solved} />);
    case "protractor":
      return plain("Angle", <Protractor angle={v.angle} scale={v.scale} />);
    case "lines":
      return plain("Two lines", <Lines type={v.type} />);
    case "shape":
      return plain(
        "A shape",
        <span className="shape-turn" style={{ rotate: `${v.turn ?? 0}deg`, scale: v.scale ?? 1 }}>
          <ShapeSvg shape={v.shape} />
        </span>,
      );
    case "shapes":
      return plain("Shapes", <Shapes shapes={v.shapes} />);
    case "bond":
      return plain("Number bond", <Bond whole={v.whole} parts={v.parts} solved={solved} answer={answer} />);
    case "hundred":
      return plain("Hundred chart", <HundredChart highlight={v.highlight} ask={v.ask} solved={solved} />);
    case "hundredgrid":
      return plain("Hundred grid", <HundredGrid shaded={v.shaded} />);
    case "clock":
      return plain("Clock", <Clock h={v.h} m={v.m} />);
    case "coins":
      return plain("Money", <Coins coins={v.coins} />);
    case "ruler":
      return plain("Ruler", <Ruler length={v.length} unit={v.unit} emoji={v.emoji} />);
    case "lengths":
      return plain("Lengths to compare", <Lengths items={v.items} units={v.units} />);
    case "bars":
      return plain("Bar graph", <Bars title={v.title} items={v.items} max={v.max} step={v.step} />);
    case "pictograph":
      return plain("Picture graph", <Pictograph title={v.title} items={v.items} keyValue={v.key} />);
    case "dots":
      return plain("Dot plot", <Dots values={v.values} min={v.min} max={v.max} label={v.label} second={v.second} />);
    case "grid":
      return plain("Coordinate grid", <Grid size={v.size} quadrants={v.quadrants} points={v.points} />);
    case "table":
      return plain("Table", <Table header={v.header} rows={v.rows} solved={solved} answer={answer} />);
    case "tape":
      return plain("Tape diagram", <Tape rows={v.rows} partValue={v.partValue} solved={solved} answer={answer} />);
    case "pattern":
      return plain("Pattern", <Pattern items={v.items} solved={solved} answer={answer} />);
    case "marbles":
      return plain("Bag of marbles", <Marbles marbles={v.marbles} />);
    case "scene":
      return plain(
        "A picture",
        <div className="scene">
          {v.items.map((it, i) => (
            <span
              key={i}
              className={`scene-item${it.behind ? " behind" : ""}`}
              style={{ left: `${it.x}%`, top: `${it.y}%`, fontSize: `calc(${it.size ?? 1} * clamp(2.4rem, 10vw, 3.4rem))` }}
            >
              <Art emoji={it.emoji} />
            </span>
          ))}
        </div>,
      );
    case "boxplot":
      return plain("Box plot", <BoxPlot {...v} />);
    case "spinner":
      return plain("Spinner", <Spinner sections={v.sections} />);
    case "tree":
      return plain("Tree diagram", <Tree stages={v.stages} probs={v.probs} />);
    case "net":
      return plain("Net", <Net solid={v.solid} l={v.l} w={v.w} h={v.h} unit={v.unit} />);
    case "slice":
      return plain("A solid being sliced", <Slice solid={v.solid} cut={v.cut} />);
    case "plot":
      return plain(
        "Graph",
        <Plot x={v.x} y={v.y} curves={v.curves} lines={v.lines} points={v.points} shade={v.shade} regions={v.regions} xLabel={v.xLabel} yLabel={v.yLabel} />,
      );
    case "unitcircle":
      return plain("Unit circle", <UnitCircle angle={v.angle} show={v.show} />);
    case "righttri":
      return plain("Right triangle", <RightTriangle a={v.a} b={v.b} c={v.c} angle={v.angle} unit={v.unit} />);
    case "triangle":
      return plain("Triangle", <Triangle shape={v.shape} sides={v.sides} angles={v.angles} names={v.names} unit={v.unit} />);
    case "circleparts":
      return plain("Circle diagram", <CircleParts {...v} />);
    case "matrix":
      return plain("Matrices", <Matrices items={v.items} />);
    case "transversal":
      return plain("Parallel lines and a transversal", <Transversal tilt={v.tilt} labels={v.labels} />);
    case "solid":
      return plain("A solid", <Solid {...v} />);
    case "venn":
      return plain("Venn diagram", <Venn {...v} solved={solved} answer={answer} />);
    case "pair":
      return plain(
        "Things to compare",
        <div className="pair">
          {v.items.map((it, i) => (
            <figure key={i} className="pair-item">
              <span style={{ fontSize: `calc(${it.size} * clamp(2.6rem, 11vw, 3.6rem))` }}>
                <Art emoji={it.emoji} />
              </span>
              <figcaption>{it.label}</figcaption>
            </figure>
          ))}
        </div>,
      );
  }
}
