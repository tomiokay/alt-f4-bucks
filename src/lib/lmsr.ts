/**
 * Logarithmic Market Scoring Rule (LMSR) pricing module.
 * Used by both frontend (preview) and server (execution).
 *
 * All amounts are in AF4 integer units (1 AF4 = 1 unit, no cents).
 */

/** Total cost function C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b)) */
export function cost(qYes: number, qNo: number, b: number): number {
  // Numerically stable: factor out max(qYes, qNo) / b
  const maxQ = Math.max(qYes, qNo);
  const shifted = b * Math.log(
    Math.exp((qYes - maxQ) / b) + Math.exp((qNo - maxQ) / b)
  ) + maxQ;
  return shifted;
}

/** Current price of a YES share (probability). Returns 0-1. */
export function price(qYes: number, qNo: number, b: number): number {
  // p_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
  // Numerically stable via softmax trick
  const diff = qYes - qNo;
  if (diff > 500) return 1;
  if (diff < -500) return 0;
  return 1 / (1 + Math.exp(-diff / b));
}

/** Cost to buy `shares` in a given direction. Always positive. */
export function buyCost(
  qYes: number,
  qNo: number,
  b: number,
  direction: "YES" | "NO",
  shares: number
): number {
  const before = cost(qYes, qNo, b);
  const after =
    direction === "YES"
      ? cost(qYes + shares, qNo, b)
      : cost(qYes, qNo + shares, b);
  return after - before;
}

/** Revenue from selling `shares` in a given direction. Always positive. */
export function sellRevenue(
  qYes: number,
  qNo: number,
  b: number,
  direction: "YES" | "NO",
  shares: number
): number {
  const before = cost(qYes, qNo, b);
  const after =
    direction === "YES"
      ? cost(qYes - shares, qNo, b)
      : cost(qYes, qNo - shares, b);
  return before - after;
}

/** Compute how many shares you get for a given AF4 spend. */
export function sharesForCost(
  qYes: number,
  qNo: number,
  b: number,
  direction: "YES" | "NO",
  maxCost: number
): number {
  // Binary search for shares where buyCost(..., shares) ≈ maxCost
  let lo = 0;
  let hi = maxCost * 10; // upper bound guess
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (buyCost(qYes, qNo, b, direction, mid) < maxCost) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(lo * 100) / 100; // round down to 2 decimals
}

/** Default liquidity parameter for new markets */
export const DEFAULT_B = 100;

/** Format a 0-1 probability as a percentage integer */
export function pctFromProb(prob: number): number {
  return Math.round(prob * 100);
}

/** Format a 0-1 probability as cents (e.g., 0.73 → 73) */
export function centsFromProb(prob: number): number {
  return Math.round(prob * 100);
}
