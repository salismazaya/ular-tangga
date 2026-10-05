export interface DiceResult {
  steps: number;
  direction: "FORWARD" | "BACKWARD" | "STAY";
  raw: number;
}

export interface Challenge {
  screenNumber: number;
  op: "+" | "-";
}

export interface NumberRange {
  min: number;
  max: number;
}

export const DEFAULT_NUMBER_RANGE: NumberRange = { min: -20, max: 20 };

// Batas aman supaya host tidak bisa menyetel rentang ekstrem yang membuat soal mustahil
const RANGE_LIMIT = 999;

export function sanitizeNumberRange(input: any): NumberRange {
  const raw = input && typeof input === "object" ? input : {};
  let min = Number.isFinite(Number(raw.min)) ? Math.trunc(Number(raw.min)) : DEFAULT_NUMBER_RANGE.min;
  let max = Number.isFinite(Number(raw.max)) ? Math.trunc(Number(raw.max)) : DEFAULT_NUMBER_RANGE.max;

  min = Math.min(RANGE_LIMIT, Math.max(-RANGE_LIMIT, min));
  max = Math.min(RANGE_LIMIT, Math.max(-RANGE_LIMIT, max));

  if (min > max) {
    [min, max] = [max, min];
  }

  return { min, max };
}

export interface RollResult extends DiceResult {
  screenNumber: number;
  op: "+" | "-";
  userInput: number;
  auto?: boolean;
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

export function generateChallenge(range: NumberRange = DEFAULT_NUMBER_RANGE): Challenge {
  const { min, max } = sanitizeNumberRange(range);
  const screenNumber = min + Math.floor(Math.random() * (max - min + 1));
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

// Batas angka yang masih dianggap lemparan sungguhan; di luar itu lemparan dihitung otomatis (angka 0)
export const INPUT_LIMIT = 9999;

export function resolveRoll(
  screenNumber: number,
  op: "+" | "-",
  rawInput: any
): { roll: RollResult; auto: boolean } {
  // null / undefined / string kosong = pemain tidak sempat menjawab
  const answered = rawInput !== null && rawInput !== undefined && rawInput !== "";
  const num = Number(rawInput);
  const valid = answered && Number.isFinite(num) && Number.isInteger(num) && Math.abs(num) <= INPUT_LIMIT;

  return {
    roll: calculateRollWithInput(screenNumber, op, valid ? num : 0),
    auto: !valid,
  };
}
