export interface DiceResult {
  steps: number;
  direction: "FORWARD" | "BACKWARD" | "STAY";
  raw: number;
}

export interface Challenge {
  screenNumber: number;
  op: "+" | "-";
}

export interface RollResult extends DiceResult {
  screenNumber: number;
  op: "+" | "-";
  userInput: number;
}

export function calculateDice(raw: number): DiceResult {
  if (raw === 0) {
    return { steps: 0, direction: "STAY", raw: 0 };
  }

  const isPositive = raw > 0;
  const absVal = Math.abs(raw);
  const steps = ((absVal - 1) % 6) + 1;
  const direction: "FORWARD" | "BACKWARD" = isPositive ? "FORWARD" : "BACKWARD";

  return { steps, direction, raw };
}

export function generateChallenge(): Challenge {
  const screenNumber = Math.floor(Math.random() * 41) - 20; // -20 s/d 20
  const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
  return { screenNumber, op };
}

export function calculateRollWithInput(
  screenNumber: number,
  op: "+" | "-",
  userInput: number
): RollResult {
  const safeInput = Number.isInteger(Number(userInput)) ? Number(userInput) : 0;
  const raw = op === "+" ? screenNumber + safeInput : screenNumber - safeInput;
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
