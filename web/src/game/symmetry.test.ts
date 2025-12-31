import { expect, it } from "vitest";
import { symmetryLines } from "./validate";

it("finds every line of symmetry", () => {
  expect(symmetryLines([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }])).toHaveLength(4);
  expect(symmetryLines([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 2 }])).toHaveLength(2);
  expect(symmetryLines([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 5, y: 0 }])).toHaveLength(1);
  expect(symmetryLines([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 1, y: 2 }])).toHaveLength(0);
  expect(symmetryLines([{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 4 }, { x: 3, y: 6 }, { x: 1, y: 4 }])).toHaveLength(1);
});
