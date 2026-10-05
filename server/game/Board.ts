export const BOARD_SIZE = 100;

export interface BoardConfig {
  ladders: Record<number, number>;
  snakes: Record<number, number>;
}

export const DEFAULT_LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const DEFAULT_SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

export function generateRandomBoard(): BoardConfig {
  const ladders: Record<number, number> = {};
  const snakes: Record<number, number> = {};
  const used = new Set<number>();

  // Kotak 1 (start) dan 100 (finish) selalu steril
  used.add(1);
  used.add(100);

  // Buat 7 tangga acak (bawah ke atas)
  let attempts = 0;
  while (Object.keys(ladders).length < 7 && attempts < 500) {
    attempts++;
    const bottom = Math.floor(Math.random() * 70) + 2; // 2..71
    if (used.has(bottom)) continue;

    const minTop = bottom + 10;
    const maxTop = Math.min(98, bottom + 42);
    if (minTop > maxTop) continue;

    const top = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
    if (used.has(top)) continue;

    used.add(bottom);
    used.add(top);
    ladders[bottom] = top;
  }

  // Buat 7 ular acak (atas ke bawah)
  attempts = 0;
  while (Object.keys(snakes).length < 7 && attempts < 500) {
    attempts++;
    const head = Math.floor(Math.random() * 70) + 28; // 28..97
    if (used.has(head)) continue;

    const maxTail = head - 10;
    const minTail = Math.max(2, head - 42);
    if (minTail > maxTail) continue;

    const tail = Math.floor(Math.random() * (maxTail - minTail + 1)) + minTail;
    if (used.has(tail)) continue;

    used.add(head);
    used.add(tail);
    snakes[head] = tail;
  }

  // Jika gagal mencukupi 7 karena kepadatan, gabung dengan default yang belum terpakai
  if (Object.keys(ladders).length < 5 || Object.keys(snakes).length < 5) {
    return { ladders: { ...DEFAULT_LADDERS }, snakes: { ...DEFAULT_SNAKES } };
  }

  return { ladders, snakes };
}

export interface MoveResolution {
  fromSquare: number;
  steps: number;
  direction: "FORWARD" | "BACKWARD" | "STAY";
  path: number[]; // Block-by-block intermediate squares
  finalSquare: number;
  targetSquare: number;
  isLadder: boolean;
  isSnake: boolean;
  finished: boolean;
}

export function computeNewPosition(
  currentSquare: number,
  steps: number,
  direction: "FORWARD" | "BACKWARD" | "STAY",
  boardConfig: BoardConfig = { ladders: DEFAULT_LADDERS, snakes: DEFAULT_SNAKES }
): MoveResolution {
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

  const path: number[] = [];
  let curr = currentSquare;

  if (direction === "FORWARD") {
    let movingForward = true;
    for (let i = 0; i < steps; i++) {
      if (movingForward) {
        if (curr < 100) {
          curr += 1;
        } else {
          // Mantul mundur jika melewati 100
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

  const ladders = boardConfig?.ladders || DEFAULT_LADDERS;
  const snakes = boardConfig?.snakes || DEFAULT_SNAKES;

  if (ladders[intermediate]) {
    isLadder = true;
    target = ladders[intermediate];
  } else if (snakes[intermediate]) {
    isSnake = true;
    target = snakes[intermediate];
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

export function getSquareCoordinates(squareNumber: number): { row: number; col: number } {
  const index = Math.max(1, Math.min(100, squareNumber)) - 1;
  const gridRow = Math.floor(index / 10);
  const row = 9 - gridRow;
  const colInRow = index % 10;
  const col = gridRow % 2 === 0 ? colInRow : 9 - colInRow;
  return { row, col };
}
