export const DEFAULT_NUMBER_RANGE = { min: -20, max: 20 };

export function sanitizeNumberRange(input) {
  const raw = input && typeof input === 'object' ? input : {};
  let min = Number.isFinite(Number(raw.min)) ? Math.trunc(Number(raw.min)) : DEFAULT_NUMBER_RANGE.min;
  let max = Number.isFinite(Number(raw.max)) ? Math.trunc(Number(raw.max)) : DEFAULT_NUMBER_RANGE.max;

  if (min > max) [min, max] = [max, min];
  return { min, max };
}

export function calculateDice(raw) {
  if (raw === 0) {
    return { steps: 0, direction: 'STAY', raw: 0 };
  }

  const isPositive = raw > 0;
  const absVal = Math.abs(raw);
  const steps = ((absVal - 1) % 6) + 1;
  const direction = isPositive ? 'FORWARD' : 'BACKWARD';

  return { steps, direction, raw };
}

export function calculateRollWithInput(screenNumber, op, userInput) {
  const safeInput = Number.isInteger(Number(userInput)) ? Number(userInput) : 0;
  const raw = op === '+' ? screenNumber + safeInput : screenNumber - safeInput;
  const dice = calculateDice(raw);

  return {
    screenNumber,
    op,
    userInput: safeInput,
    raw,
    steps: dice.steps,
    direction: dice.direction,
  };
}

// Bayangan langkah versi client: dipakai supaya pion bergerak seketika, sebelum server membalas.
// Hasil dari server tetap yang menang dan akan menimpa posisi ini.
export function previewMove(challenge, input, currentSquare, boardConfig) {
  if (!challenge) return null;
  const roll = calculateRollWithInput(challenge.screenNumber, challenge.op, input);
  return { roll, move: computeMove(currentSquare, roll.steps, roll.direction, boardConfig) };
}

function computeMove(currentSquare, steps, direction, boardConfig) {
  if (direction === 'STAY' || steps === 0) {
    return {
      fromSquare: currentSquare,
      steps: 0,
      direction: 'STAY',
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

  if (direction === 'FORWARD') {
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
      if (curr > 1) curr -= 1;
      path.push(curr);
    }
  }

  const intermediate = path[path.length - 1];
  const ladders = boardConfig?.ladders || {};
  const snakes = boardConfig?.snakes || {};

  let isLadder = false;
  let isSnake = false;
  let target = intermediate;

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
