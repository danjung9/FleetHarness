import type { EvaluationResult } from './solution.js';

/** Average the existing [0,1] binary scores with one final rounding, without threshold tolerances. */
export function meanEvaluationScore(cases: EvaluationResult['cases']): number {
  if (!cases.length) return 0;
  const bytes = new DataView(new ArrayBuffer(8));
  let total = 0n;
  for (const entry of cases) {
    bytes.setFloat64(0, entry.score);
    const bits = bytes.getBigUint64(0), exponent = Number((bits >> 52n) & 0x7ffn);
    const significand = (bits & ((1n << 52n) - 1n)) | (exponent ? 1n << 52n : 0n);
    // Every finite nonnegative double is an integer multiple of 2^-1074.
    total += significand << BigInt(Math.max(0, exponent - 1));
  }
  const count = BigInt(cases.length);
  const shift = Math.max(0, (total / count).toString(2).length - 53);
  const divisor = count << BigInt(shift);
  let rounded = total / divisor;
  const twiceRemainder = 2n * (total % divisor);
  // Round the exact quotient to nearest, ties to even; division has not rounded earlier.
  if (twiceRemainder > divisor || (twiceRemainder === divisor && (rounded & 1n) !== 0n)) rounded++;
  return Number(rounded) * 2 ** (shift - 1074);
}
