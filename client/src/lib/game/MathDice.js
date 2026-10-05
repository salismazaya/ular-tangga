export function calculateDice(raw) {
  if (raw === 0) {
    return { steps: 0, direction: "STAY", raw: 0, extraTurn: false };
  }

  const isPositive = raw > 0;
  const absVal = Math.abs(raw);
  const steps = ((absVal - 1) % 6) + 1;
  const direction = isPositive ? "FORWARD" : "BACKWARD";
  const extraTurn = steps === 6;

  return { steps, direction, raw, extraTurn };
}

export function generateChallenge() {
  const screenNumber = Math.floor(Math.random() * 41) - 20; // -20 s/d 20
  const op = Math.random() < 0.5 ? "+" : "-";
  return { screenNumber, op };
}

export function calculateRollWithInput(screenNumber, op, userInput) {
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
    extraTurn: dice.extraTurn,
  };
}
