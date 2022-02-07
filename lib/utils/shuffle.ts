/**
 * In-line shuffle the specified array.
 *
 * @param values The list of values to shuffle.
 *
 * @returns The input values after shuffling.
 *
 * @category Function Utility
 * @interal
 */
export function shuffle<T>(values: unknown[]): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values as T[];
}
