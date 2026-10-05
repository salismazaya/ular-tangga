export const BOARD_SIZE = 100;

export const LADDERS = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const SNAKES = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

export function computeNewPosition(currentSquare, steps, direction) {
  if (direction === "STAY" || steps === 0) {
    return {
      fromSquare: currentSquare,
      steps: 0,
      direction: "STAY",
      path: [currentSquare],
      finalSquare: currentSquare,
      targetSquare: currentSquare,
      isLadder: false,
      isSnake: false,
      finished: currentSquare === 100,
    };
  }

  const path = [];
  let curr = currentSquare;

  if (direction === "FORWARD") {
    let movingForward = true;
    for (let i = 0; i < steps; i++) {
      if (movingForward) {
        if (curr < 100) {
          curr += 1;
        } else {
          movingForward = false;
          curr -= 1;
        }
      } else {
        curr -= 1;
      }
      path.push(curr);
    }
  } else {
    for (let i = 0; i < steps; i++) {
      if (curr > 1) {
        curr -= 1;
      }
      path.push(curr);
    }
  }

  const intermediate = path[path.length - 1];
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
    path,
    finalSquare: intermediate,
    targetSquare: target,
    isLadder,
    isSnake,
    finished: target === 100,
  };
}

export function getSquareCoordinates(squareNumber) {
  const index = Math.max(1, Math.min(100, squareNumber)) - 1;
  const gridRow = Math.floor(index / 10);
  const row = 9 - gridRow;
  const colInRow = index % 10;
  const col = gridRow % 2 === 0 ? colInRow : 9 - colInRow;
  return { row, col };
}
