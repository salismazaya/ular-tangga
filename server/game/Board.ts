export const BOARD_SIZE = 100;

export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

export interface MoveResolution {
  fromSquare: number;
  steps: number;
  direction: "FORWARD" | "BACKWARD" | "STAY";
  finalSquare: number;
  targetSquare: number;
  isLadder: boolean;
  isSnake: boolean;
  finished: boolean;
}

export function computeNewPosition(
  currentSquare: number,
  steps: number,
  direction: "FORWARD" | "BACKWARD" | "STAY"
): MoveResolution {
  if (direction === "STAY" || steps === 0) {
    return {
      fromSquare: currentSquare,
      steps: 0,
      direction: "STAY",
      finalSquare: currentSquare,
      targetSquare: currentSquare,
      isLadder: false,
      isSnake: false,
      finished: currentSquare === 100,
    };
  }

  let intermediate = currentSquare;
  if (direction === "FORWARD") {
    intermediate += steps;
    if (intermediate > 100) {
      const overshoot = intermediate - 100;
      intermediate = 100 - overshoot;
    }
  } else {
    intermediate -= steps;
    if (intermediate < 1) {
      intermediate = 1;
    }
  }

  let isLadder = false;
  let isSnake = false;
  let target = intermediate;

  if (LADDERS[intermediate]) {
    isLadder = true;
    target = LADDERS[intermediate];
  } else if (SNAKES[intermediate]) {
    isSnake = true;
    target = SNAKES[intermediate];
  }

  return {
    fromSquare: currentSquare,
    steps,
    direction,
    finalSquare: intermediate,
    targetSquare: target,
    isLadder,
    isSnake,
    finished: target === 100,
  };
}

export function getSquareCoordinates(squareNumber: number): { row: number; col: number } {
  const index = Math.max(1, Math.min(100, squareNumber)) - 1;
  const gridRow = Math.floor(index / 10); // 0 to 9 from bottom
  const row = 9 - gridRow; // 0 at top, 9 at bottom

  const colInRow = index % 10;
  // Genap dari bawah (gridRow 0, 2, 4...) -> kiri ke kanan (col 0..9)
  // Ganjil dari bawah (gridRow 1, 3, 5...) -> kanan ke kiri (col 9..0)
  const col = gridRow % 2 === 0 ? colInRow : 9 - colInRow;

  return { row, col };
}
