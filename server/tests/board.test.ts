import { describe, expect, it } from "bun:test";
import {
  SNAKES,
  LADDERS,
  computeNewPosition,
  getSquareCoordinates,
} from "../game/Board";

describe("Board Rules", () => {
  it("advances normally when no snake or ladder", () => {
    const res = computeNewPosition(1, 3, "FORWARD");
    expect(res.finalSquare).toBe(4);
    expect(res.isLadder).toBe(true); // 4 is ladder to 14
    expect(res.targetSquare).toBe(14);
  });

  it("handles backward movement correctly", () => {
    const res = computeNewPosition(10, 4, "BACKWARD");
    expect(res.finalSquare).toBe(6);
    expect(res.targetSquare).toBe(6);
    expect(res.isSnake).toBe(false);

    const clamped = computeNewPosition(3, 5, "BACKWARD");
    expect(clamped.targetSquare).toBe(1);
  });

  it("triggers snake when landing on snake head", () => {
    const res = computeNewPosition(14, 3, "FORWARD");
    expect(res.finalSquare).toBe(17);
    expect(res.isSnake).toBe(true);
    expect(res.targetSquare).toBe(7);
  });

  it("bounces back when overshooting 100", () => {
    const res = computeNewPosition(97, 5, "FORWARD");
    expect(res.finalSquare).toBe(98);
    expect(res.targetSquare).toBe(98);

    const finish = computeNewPosition(98, 2, "FORWARD");
    expect(finish.targetSquare).toBe(100);
    expect(finish.finished).toBe(true);
  });

  it("generates 10x10 zigzag coordinates", () => {
    const sq1 = getSquareCoordinates(1);
    expect(sq1).toEqual({ row: 9, col: 0 });

    const sq10 = getSquareCoordinates(10);
    expect(sq10).toEqual({ row: 9, col: 9 });

    const sq11 = getSquareCoordinates(11);
    expect(sq11).toEqual({ row: 8, col: 9 });

    const sq100 = getSquareCoordinates(100);
    expect(sq100).toEqual({ row: 0, col: 0 });
  });
});
