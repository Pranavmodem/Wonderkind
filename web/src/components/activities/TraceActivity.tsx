import { useEffect, useRef, useState } from "react";
import { sfx } from "../../game/sound";
import type { Activity } from "../../game/types";
import { useReport, type ActivityProps } from "./shared";

type Trace = Extract<Activity, { kind: "trace" }>;

const W = 360;
const H = 240;
const PEN = 28;

/** Pixels (as a mask) covered by the number, drawn in a bold font. */
function templateMask(text: string, grow = 0) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.strokeStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const size = text.length > 2 ? 150 : 200;
  g.font = `800 ${size}px Grandstander, "Comic Sans MS", sans-serif`;
  g.fillText(text, W / 2, H / 2 + 10);
  if (grow) {
    g.lineWidth = grow;
    g.strokeText(text, W / 2, H / 2 + 10);
  }
  return g.getImageData(0, 0, W, H).data;
}

/** Trace a number: the strokes must cover most of it and stay mostly on it. */
export function TraceNumber({ a, solved, locked, onChange }: ActivityProps<Trace>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(0);
  const [score, setScore] = useState({ cover: 0, onTop: 0 });
  // Lenient on purpose: little fingers wobble. Most of the number covered, mostly on the number.
  useReport(score.cover >= 0.45 && score.onTop >= 0.55, onChange);

  // Measure how much of the number the kid covered, after each stroke.
  function measure() {
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    const ink = g.getImageData(0, 0, W, H).data;
    const shape = templateMask(a.text);
    const near = templateMask(a.text, PEN * 1.6);
    let shapeCount = 0;
    let covered = 0;
    let inkCount = 0;
    let inkNear = 0;
    for (let i = 3; i < ink.length; i += 4 * 3) {
      const isInk = ink[i] > 0;
      if (shape[i] > 0) {
        shapeCount++;
        if (isInk) covered++;
      }
      if (isInk) {
        inkCount++;
        if (near[i] > 0) inkNear++;
      }
    }
    setScore({ cover: shapeCount ? covered / shapeCount : 0, onTop: inkCount ? inkNear / inkCount : 0 });
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function stroke(to: { x: number; y: number }) {
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    g.strokeStyle = "rgba(46, 134, 235, 0.9)";
    g.lineWidth = PEN;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    const from = last.current ?? to;
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.stroke();
    last.current = to;
  }

  function clear() {
    canvas.current?.getContext("2d")?.clearRect(0, 0, W, H);
    setInked(0);
    setScore({ cover: 0, onTop: 0 });
  }

  useEffect(() => {
    if (!solved) return;
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(34, 165, 101, 0.85)";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `800 ${a.text.length > 2 ? 150 : 200}px Grandstander, "Comic Sans MS", sans-serif`;
    g.fillText(a.text, W / 2, H / 2 + 10);
  }, [solved, a.text]);

  return (
    <div className="act-trace">
      <div className="trace-pad">
        <span className="trace-guide" aria-hidden="true" style={{ fontSize: a.text.length > 2 ? "min(150px, 40vw)" : "min(200px, 52vw)" }}>
          {a.text}
        </span>
        <canvas
          ref={canvas}
          width={W}
          height={H}
          className="trace-canvas act-svg"
          data-cover={score.cover.toFixed(2)}
          data-on-top={score.onTop.toFixed(2)}
          aria-label={`Trace the number ${a.text}`}
          onPointerDown={(e) => {
            if (locked) return;
            drawing.current = true;
            last.current = null;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Drawing still works without capture.
            }
            stroke(point(e));
          }}
          onPointerMove={(e) => {
            if (drawing.current && !locked) stroke(point(e));
          }}
          onPointerUp={() => {
            if (!drawing.current) return;
            drawing.current = false;
            sfx.tap();
            setInked((n) => n + 1);
            measure();
          }}
        />
      </div>
      <div className="act-row">
        <button type="button" className="btn btn-small btn-quiet" disabled={locked || !inked} onClick={clear}>
          Start over
        </button>
      </div>
      <p className="act-tip-text">Trace over the number with your finger.</p>
    </div>
  );
}
