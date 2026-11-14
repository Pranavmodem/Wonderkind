import { describe, expect, it } from "vitest";
import { speakable } from "./sound";

describe("speakable", () => {
  it("reads math the way people say it", () => {
    expect(speakable("3/4 + 1/4 = ?")).toBe("3 fourths plus 1 fourth equals what");
    expect(speakable("−3 + 7")).toBe("negative 3 plus 7");
    expect(speakable("5 − 3 = 2")).toBe("5 minus 3 equals 2");
    expect(speakable("x = −2")).toBe("x equals negative 2");
    expect(speakable("f′(x) = 6x²")).toBe("f prime of x equals 6x squared");
    expect(speakable("√2 ≈ 1.41")).toBe("the square root of 2 is about 1.41");
    expect(speakable("12 × 4 ÷ 3")).toBe("12 times 4 divided by 3");
    expect(speakable("25% of 80")).toBe("25 percent of 80");
    expect(speakable("a 90° angle")).toBe("a 90 degrees angle");
  });

  it("drops emoji and keeps plain sentences", () => {
    expect(speakable("How many 🍎 apples?")).toBe("How many apples?");
    expect(speakable("Which point is (3, 4)?")).toBe("Which point is (3, 4)?");
  });
});

describe("speakable science", () => {
  it("reads formulas, charges, arrows and units", () => {
    expect(speakable("2H₂ + O₂ → 2H₂O")).toBe("2H 2 plus O 2 makes 2H 2 O");
    expect(speakable("Na⁺ and SO₄²⁻")).toBe("Na plus and SO 4 2 minus");
    expect(speakable("A car goes 12 m/s for 3 s.")).toBe("A car goes 12 meters per second for 3 s.");
    expect(speakable("F = 20 N")).toBe("F equals 20 newtons");
    expect(speakable("It is 25 °C")).toBe("It is 25 degrees Celsius");
  });
});
