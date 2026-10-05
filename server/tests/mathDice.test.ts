import { describe, expect, it } from "bun:test";
import {
  calculateDice,
  generateChallenge,
  calculateRollWithInput,
  sanitizeNumberRange,
  resolveRoll,
  DEFAULT_NUMBER_RANGE,
} from "../game/MathDice";

describe("MathDice Engine", () => {
  it("handles raw === 0 (STAY)", () => {
    const res = calculateDice(0);
    expect(res).toEqual({ steps: 0, direction: "STAY", raw: 0 });
  });

  it("calculates positive values (FORWARD)", () => {
    expect(calculateDice(1)).toEqual({ steps: 1, direction: "FORWARD", raw: 1 });
    expect(calculateDice(5)).toEqual({ steps: 5, direction: "FORWARD", raw: 5 });
    expect(calculateDice(6)).toEqual({ steps: 6, direction: "FORWARD", raw: 6 });
    expect(calculateDice(7)).toEqual({ steps: 1, direction: "FORWARD", raw: 7 });
    expect(calculateDice(12)).toEqual({ steps: 6, direction: "FORWARD", raw: 12 });
  });

  it("calculates negative values (BACKWARD)", () => {
    expect(calculateDice(-1)).toEqual({ steps: 1, direction: "BACKWARD", raw: -1 });
    expect(calculateDice(-5)).toEqual({ steps: 5, direction: "BACKWARD", raw: -5 });
    expect(calculateDice(-6)).toEqual({ steps: 6, direction: "BACKWARD", raw: -6 });
    expect(calculateDice(-7)).toEqual({ steps: 1, direction: "BACKWARD", raw: -7 });
  });

  it("generates challenge within -20 to 20 bounds by default", () => {
    for (let i = 0; i < 50; i++) {
      const challenge = generateChallenge();
      expect(challenge.screenNumber).toBeGreaterThanOrEqual(-20);
      expect(challenge.screenNumber).toBeLessThanOrEqual(20);
      expect(["+", "-"]).toContain(challenge.op);
    }
  });

  it("correctly evaluates user input with challenge", () => {
    const roll1 = calculateRollWithInput(5, "+", -2);
    expect(roll1.raw).toBe(3);
    expect(roll1.steps).toBe(3);
    expect(roll1.direction).toBe("FORWARD");

    const roll2 = calculateRollWithInput(2, "-", 8);
    expect(roll2.raw).toBe(-6);
    expect(roll2.steps).toBe(6);
    expect(roll2.direction).toBe("BACKWARD");
  });
});

describe("Number Range", () => {
  it("falls back to the default range for junk input", () => {
    expect(sanitizeNumberRange(null)).toEqual(DEFAULT_NUMBER_RANGE);
    expect(sanitizeNumberRange({ min: "abc", max: undefined })).toEqual(DEFAULT_NUMBER_RANGE);
  });

  it("swaps values when min is above max", () => {
    expect(sanitizeNumberRange({ min: 30, max: 5 })).toEqual({ min: 5, max: 30 });
  });

  it("truncates decimals and clamps to the hard limit", () => {
    expect(sanitizeNumberRange({ min: -2.9, max: 4.4 })).toEqual({ min: -2, max: 4 });
    expect(sanitizeNumberRange({ min: -5000, max: 5000 })).toEqual({ min: -999, max: 999 });
  });

  it("keeps generated screen numbers inside the requested range", () => {
    const range = { min: 7, max: 9 };
    for (let i = 0; i < 60; i++) {
      const challenge = generateChallenge(range);
      expect(challenge.screenNumber).toBeGreaterThanOrEqual(7);
      expect(challenge.screenNumber).toBeLessThanOrEqual(9);
    }
  });

  it("reaches both ends of a single-value range", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateChallenge({ min: 3, max: 3 }).screenNumber).toBe(3);
    }
  });
});

describe("Auto roll resolution", () => {
  it("flags a null input as auto and rolls with 0", () => {
    const { roll, auto } = resolveRoll(10, "+", null);
    expect(auto).toBe(true);
    expect(roll.userInput).toBe(0);
    expect(roll.raw).toBe(10);
  });

  it("flags out-of-limit and non-integer input as auto", () => {
    expect(resolveRoll(4, "+", 99999).auto).toBe(true);
    expect(resolveRoll(4, "+", 2.5).auto).toBe(true);
    expect(resolveRoll(4, "+", "x").auto).toBe(true);
  });

  it("keeps a valid input as a real roll", () => {
    const { roll, auto } = resolveRoll(10, "+", -7);
    expect(auto).toBe(false);
    expect(roll.userInput).toBe(-7);
    expect(roll.raw).toBe(3);
  });
});
