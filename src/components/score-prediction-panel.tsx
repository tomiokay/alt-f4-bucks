"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { placeScorePrediction } from "@/app/actions/predictions";
import { isConfirmEnabled } from "@/lib/use-confirm-bets";
import type { PredictionMarket, PredictionPoolOption } from "@/lib/types";

type Props = {
  market: PredictionMarket;
  pools: Record<string, PredictionPoolOption>;
  balance: number;
  redTeams?: string[];
  blueTeams?: string[];
  scheduledTime?: string | null;
};

export function ScorePredictionPanel({ market, pools, balance, redTeams, blueTeams, scheduledTime }: Props) {
  const [redScore, setRedScore] = useState("");
  const [blueScore, setBlueScore] = useState("");
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalPool = Object.values(pools).reduce((sum, p) => sum + p.pool, 0);
  const totalBettors = Object.values(pools).reduce((sum, p) => sum + p.bettors, 0);

  const isResolved = market.status === "resolved";
  const cutoffTime = scheduledTime ? new Date(new Date(scheduledTime).getTime() - 5 * 60 * 1000) : null;
  const isPastCutoff = cutoffTime && cutoffTime < new Date();
  const isClosed = market.status !== "open" || isPastCutoff;
  const canAfford = balance >= amount && amount >= 1;
  const hasScores = redScore !== "" && blueScore !== "" && parseInt(redScore) >= 0 && parseInt(blueScore) >= 0;

  function handleSubmit() {
    if (!hasScores) return;
    if (!confirm && isConfirmEnabled()) { setConfirm(true); return; }
    setError(null);
    setSuccess(false);
    setConfirm(false);

    const fd = new FormData();
    fd.set("marketId", market.id);
    fd.set("predictedRed", redScore);
    fd.set("predictedBlue", blueScore);
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
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-[8px] font-bold text-white">
            RP
          </div>
          <span className="text-[13px] font-medium text-[#e6edf3]">Predict the RP</span>
        </div>
        {!isClosed && totalPool > 0 && (
          <span className="text-[11px] text-[#484f58]">${totalPool} pool</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isClosed ? (
          <div className="text-center py-3">
            <p className="text-[13px] text-[#484f58]">
              {isResolved ? "Market resolved" : "Market closed"}
            </p>
          </div>
        ) : (
          <>
            {/* Red + Blue score inputs side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-[12px] text-[#7d8590] mb-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                  Red RP
                </label>
                <input
                  type="number"
                  min={0}
                  value={redScore}
                  onChange={(e) => setRedScore(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 text-[20px] text-[#ef4444] font-mono font-bold text-center focus:border-[#ef4444] focus:outline-none tabular-nums"
                />
                {redTeams && (
                  <p className="text-[9px] text-[#484f58] mt-1 text-center truncate">
                    {redTeams.join(" · ")}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[12px] text-[#7d8590] mb-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                  Blue RP
                </label>
                <input
                  type="number"
                  min={0}
                  value={blueScore}
                  onChange={(e) => setBlueScore(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 text-[20px] text-[#3b82f6] font-mono font-bold text-center focus:border-[#3b82f6] focus:outline-none tabular-nums"
                />
                {blueTeams && (
                  <p className="text-[9px] text-[#484f58] mt-1 text-center truncate">
                    {blueTeams.join(" · ")}
                  </p>
                )}
              </div>
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
              <p>Closer your prediction to the real score, the bigger your payout.</p>
              {totalBettors > 0 && (
                <p>{totalBettors} prediction{totalBettors !== 1 ? "s" : ""} placed</p>
              )}
            </div>

            {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
            {success && <p className="text-[12px] text-[#22c55e]">Prediction placed!</p>}
            {confirm && (
              <div className="rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-3 py-2">
                <p className="text-[12px] text-[#f59e0b] font-medium">
                  Predict {redScore}-{blueScore} for ${amount}? Click again to confirm.
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending || !canAfford || !hasScores}
              className={cn(
                "w-full rounded-lg py-2.5 text-[14px] font-semibold transition-colors",
                canAfford && hasScores && !isPending
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600"
                  : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
              )}
            >
              {isPending
                ? "Placing..."
                : confirm
                ? "Confirm Prediction"
                : hasScores
                ? `Predict ${redScore} - ${blueScore}`
                : "Enter both scores"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
