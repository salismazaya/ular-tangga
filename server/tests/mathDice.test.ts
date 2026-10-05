import { describe, expect, it } from "bun:test";
import {
  calculateDice,
  generateChallenge,
  calculateRollWithInput,
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

  it("generates challenge within -20 to 20 bounds", () => {
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
