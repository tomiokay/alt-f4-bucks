import type { MatchOdds, PoolSummary } from "@/lib/types";

/**
 * Virtual liquidity from Statbotics.
 * With 0 real bets → shows pure Statbotics odds.
 * As real bets grow, they dominate (at 200 real bucks, it's ~50/50 blend).
 */
const VIRTUAL_SEED = 100;

export function calculateOdds(
  pool: PoolSummary | null,
  statbotics: { redWinProb: number; blueWinProb: number } | null
): MatchOdds {
  const redPool = pool?.red_pool ?? 0;
  const bluePool = pool?.blue_pool ?? 0;
  const totalPool = redPool + bluePool;

  const statRed = statbotics?.redWinProb ?? 50;
  const statBlue = statbotics?.blueWinProb ?? 50;

  const virtualRed = VIRTUAL_SEED * (statRed / 100);
  const virtualBlue = VIRTUAL_SEED * (statBlue / 100);

  const effectiveRed = virtualRed + redPool;
  const effectiveBlue = virtualBlue + bluePool;
  const effectiveTotal = effectiveRed + effectiveBlue;

  const redPct = Math.round((effectiveRed / effectiveTotal) * 100);
  const bluePct = 100 - redPct;

  return {
    redPct,
    bluePct,
    redPool,
    bluePool,
    totalPool,
    redBettors: pool?.red_bettors ?? 0,
    blueBettors: pool?.blue_bettors ?? 0,
    statboticsRedPct: statbotics?.redWinProb ?? null,
    statboticsBluePct: statbotics?.blueWinProb ?? null,
  };
}

/**
 * Calculate potential payout if user bets `amount` on `side`.
 * Uses only real money for payout math (total in = total out).
 */
export function potentialPayout(
  odds: MatchOdds,
  side: "red" | "blue",
  amount: number
): { payout: number; profit: number; multiplier: number } {
  const newSidePool =
    (side === "red" ? odds.redPool : odds.bluePool) + amount;
  const newTotalPool = odds.totalPool + amount;

  if (newSidePool === 0) {
    return { payout: amount, profit: 0, multiplier: 1 };
  }

  const payout = parseFloat(((amount * newTotalPool) / newSidePool).toFixed(2));
  const profit = parseFloat((payout - amount).toFixed(2));
  const multiplier = parseFloat((payout / amount).toFixed(2));

  return { payout, profit, multiplier };
}
