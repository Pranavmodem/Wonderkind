import { useEffect, useRef } from "react";

/** Every activity gets these: show the right result when `solved`, and report whether the kid's work is right. */
export interface ActivityProps<A> {
  a: A;
  /** Show the correct result (after a correct answer, or after the second miss). */
  solved: boolean;
  /** No more changes (the question is over). */
  locked: boolean;
  /** Called whenever the work changes, with whether it's right. */
  onChange: (correct: boolean) => void;
}

export const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/** Report correctness to the stage whenever it changes. */
export function useReport(correct: boolean, onChange: (c: boolean) => void) {
  const last = useRef<boolean | null>(null);
  useEffect(() => {
    if (last.current !== correct) {
      last.current = correct;
      onChange(correct);
    }
  });
}

/** Convert a pointer event to the SVG's own coordinates. */
export function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const m = svg.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
}

/**
 * Pointer dragging on an SVG: calls `onMove` with SVG coordinates on press and while dragging.
 * Works with mouse, pen and touch (the element should have `touch-action: none`).
 */
export function dragHandlers(enabled: boolean, onMove: (p: { x: number; y: number }) => void) {
  if (!enabled) return {};
  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    delete e.currentTarget.dataset.dragging;
  };
  return {
    onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
      e.currentTarget.dataset.dragging = "1";
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture isn't available for every pointer; dragging still works inside the picture.
      }
      onMove(svgPoint(e.currentTarget, e));
    },
    onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
      if (e.currentTarget.dataset.dragging) onMove(svgPoint(e.currentTarget, e));
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

export const snap = (v: number, step: number) => Math.round(v / step) * step;
export const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
