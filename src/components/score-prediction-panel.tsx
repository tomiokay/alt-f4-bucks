"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { placeScorePrediction } from "@/app/actions/predictions";
import type { PredictionMarket, PredictionPoolOption } from "@/lib/types";

type Props = {
  market: PredictionMarket;
  pools: Record<string, PredictionPoolOption>;
  balance: number;
};

export function ScorePredictionPanel({ market, pools, balance }: Props) {
  const [score, setScore] = useState(market.line ? String(Math.round(market.line)) : "");
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalPool = Object.values(pools).reduce((sum, p) => sum + p.pool, 0);
  const totalBettors = Object.values(pools).reduce((sum, p) => sum + p.bettors, 0);

  const isResolved = market.status === "resolved";
  const isClosed = market.status !== "open";
  const canAfford = balance >= amount && amount >= 1;

  function handleSubmit() {
    if (!score || parseInt(score) < 0) return;
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    fd.set("marketId", market.id);
    fd.set("predictedScore", score);
    fd.set("amount", String(amount));

    startTransition(async () => {
      const result = await placeScorePrediction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  const presets = [1, 5, 10, 50, 100].filter((p) => p <= balance);

  return (
    <div className="rounded-xl bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#21262d] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-[9px] font-bold text-white">
            S
          </div>
          <span className="text-[13px] font-medium text-[#e6edf3]">Predict the Score</span>
        </div>
        {isResolved && market.actual_value !== null && (
          <span className="text-[12px] text-[#22c55e] font-semibold">
            Actual: {market.actual_value}
          </span>
        )}
        {!isClosed && totalPool > 0 && (
          <span className="text-[11px] text-[#484f58]">${totalPool} pool</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isClosed ? (
          <div className="text-center py-3">
            <p className="text-[13px] text-[#484f58]">
              {isResolved
                ? `Final score: ${market.actual_value}`
                : "Market closed"}
            </p>
          </div>
        ) : (
          <>
            {/* Score input */}
            <div>
              <label className="text-[12px] text-[#7d8590] mb-1.5 block">
                Your predicted total score
              </label>
              <input
                type="number"
                min={0}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={market.line ? `Statbotics: ~${Math.round(market.line)}` : "e.g. 150"}
                className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 text-[18px] text-[#e6edf3] font-mono font-bold text-center focus:border-[#388bfd] focus:outline-none tabular-nums"
              />
              {market.line && (
                <p className="text-[10px] text-[#484f58] mt-1 text-center">
                  Statbotics predicts ~{Math.round(market.line)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-[#7d8590]">Wager</span>
                <span className="text-[11px] text-[#484f58]">
                  Balance: ${balance.toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#7d8590]">$</span>
                <input
                  type="number"
                  min={1}
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] pl-7 pr-3 text-[14px] text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors border",
                      amount === p
                        ? "border-[#30363d] bg-[#21262d] text-[#e6edf3]"
                        : "border-[#21262d] text-[#7d8590] hover:text-[#e6edf3]"
                    )}
                  >
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="text-[11px] text-[#484f58] space-y-1 pt-1 border-t border-[#21262d]">
              <p>Closer your prediction is to the actual score, the bigger your payout.</p>
              {totalBettors > 0 && (
                <p>{totalBettors} prediction{totalBettors !== 1 ? "s" : ""} placed</p>
              )}
            </div>

            {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
            {success && <p className="text-[12px] text-[#22c55e]">Prediction placed!</p>}

            <button
              onClick={handleSubmit}
              disabled={isPending || !canAfford || !score || parseInt(score) < 0}
              className={cn(
                "w-full rounded-lg py-2.5 text-[14px] font-semibold transition-colors",
                canAfford && score && !isPending
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600"
                  : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
              )}
            >
              {isPending ? "Placing..." : `Predict ${score || "..."} points`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
