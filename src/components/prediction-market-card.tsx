"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { placePredictionBet } from "@/app/actions/predictions";
import { isConfirmEnabled } from "@/lib/use-confirm-bets";
import type { PredictionMarket, PredictionPoolOption } from "@/lib/types";

type Props = {
  market: PredictionMarket;
  pools: Record<string, PredictionPoolOption>;
  balance: number;
};

export function PredictionMarketCard({ market, pools, balance }: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalPool = Object.values(pools).reduce((sum, p) => sum + p.pool, 0);

  function getOptionPct(key: string) {
    const pool = pools[key]?.pool ?? 0;
    if (totalPool === 0) return Math.round(100 / market.options.length);
    return Math.round((pool / totalPool) * 100);
  }

  function getPotentialPayout(optionKey: string, betAmount: number) {
    const optionPool = (pools[optionKey]?.pool ?? 0) + betAmount;
    const newTotal = totalPool + betAmount;
    if (optionPool === 0) return betAmount;
    return Math.floor((betAmount * newTotal) / optionPool);
  }

  function handleSubmit() {
    if (!selectedOption || !amount) return;
    if (!confirm && isConfirmEnabled()) {
      setConfirm(true);
      return;
    }
    setError(null);
    setSuccess(false);
    setConfirm(false);

    const fd = new FormData();
    fd.set("marketId", market.id);
    fd.set("option", selectedOption);
    fd.set("amount", amount);

    startTransition(async () => {
      const result = await placePredictionBet(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setAmount("");
        setSelectedOption(null);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  const isResolved = market.status === "resolved";
  const isClosed = market.status !== "open";

  // Pick icon/color by market type
  const typeConfig = {
    score_over_under: { icon: "O/U", color: "from-orange-500 to-yellow-500" },
    score_prediction: { icon: "S", color: "from-orange-500 to-yellow-500" },
    event_winner: { icon: "W", color: "from-yellow-500 to-amber-500" },
    ranking_top1: { icon: "#1", color: "from-blue-500 to-cyan-500" },
    ranking_top8: { icon: "T8", color: "from-green-500 to-emerald-500" },
    ranking_position: { icon: `#${market.line ? Math.round(market.line) : "?"}`, color: "from-purple-500 to-pink-500" },
    custom: { icon: "C", color: "from-indigo-500 to-violet-500" },
  }[market.type] ?? { icon: "?", color: "from-gray-500 to-gray-600" };

  return (
    <div className="rounded-xl bg-[#161b22] border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className={cn(
              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0",
              typeConfig.color
            )}
          >
            {typeConfig.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-medium text-[#e6edf3] leading-snug truncate">
              {market.title}
            </h3>
            {market.description && (
              <p className="text-[11px] text-[#484f58] truncate">{market.description}</p>
            )}
          </div>
        </div>

        {/* Info note for event winner */}
        {market.type === "event_winner" && !isResolved && !isClosed && (
          <p className="text-[10px] text-[#f59e0b] mb-2">
            Resolves when playoffs are complete
          </p>
        )}

        {/* Status badges */}
        <div className="flex items-center gap-2 text-[10px]">
          {isResolved ? (
            <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#7d8590] font-medium">
              RESOLVED
            </span>
          ) : isClosed ? (
            <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#484f58] font-medium">
              CLOSED
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-medium">
              OPEN
            </span>
          )}
          {totalPool > 0 && (
            <span className="text-[#484f58]">${totalPool.toLocaleString()} pool</span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-3 space-y-1.5">
        {market.options.map((opt) => {
          const pct = getOptionPct(opt.key);
          const poolInfo = pools[opt.key];
          const isWinner = isResolved && market.correct_option === opt.key;
          const isLoser = isResolved && market.correct_option !== opt.key;
          const isSelected = selectedOption === opt.key;

          return (
            <button
              key={opt.key}
              onClick={() => !isClosed && setSelectedOption(isSelected ? null : opt.key)}
              disabled={isClosed}
              className={cn(
                "w-full relative rounded-lg p-2.5 text-left transition-all overflow-hidden",
                isClosed
                  ? isWinner
                    ? "bg-[#22c55e]/10 border border-[#22c55e]/30"
                    : isLoser
                    ? "bg-[#161b22] border border-[#21262d] opacity-50"
                    : "bg-[#161b22] border border-[#21262d]"
                  : isSelected
                  ? "bg-[#388bfd]/10 border border-[#388bfd]/50 ring-1 ring-[#388bfd]/30"
                  : "bg-[#0d1117] border border-[#21262d] hover:border-[#30363d]"
              )}
            >
              {/* Progress bar background */}
              <div
                className={cn(
                  "absolute inset-0 opacity-10 transition-all",
                  isWinner ? "bg-[#22c55e]" : isSelected ? "bg-[#388bfd]" : "bg-[#e6edf3]"
                )}
                style={{ width: `${pct}%` }}
              />

              <div className="relative flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[13px] font-medium truncate",
                    isWinner ? "text-[#22c55e]" : "text-[#e6edf3]"
                  )}
                >
                  {opt.label}
                  {isWinner && " ✓"}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {poolInfo && poolInfo.bettors > 0 && (
                    <span className="text-[10px] text-[#484f58]">
                      {poolInfo.bettors} bet{poolInfo.bettors !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[13px] font-bold tabular-nums",
                      isWinner ? "text-[#22c55e]" : "text-[#e6edf3]"
                    )}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bet input (only when option selected and market open) */}
      {selectedOption && !isClosed && (
        <div className="px-4 pb-4 border-t border-[#21262d] pt-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#484f58]">
                $
              </span>
              <input
                type="number"
                min="1"
                max={balance}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setConfirm(false); }}
                placeholder="Amount"
                className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] pl-7 pr-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none tabular-nums font-mono"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isPending || !amount || parseInt(amount) < 1}
              className="h-9 px-4 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors"
            >
              {isPending ? "..." : confirm ? "Confirm" : "Bet"}
            </button>
          </div>

          {/* Potential payout */}
          {amount && parseInt(amount) > 0 && (
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-[#484f58]">Potential payout</span>
              <span className="text-[#22c55e] font-mono font-semibold tabular-nums">
                ${getPotentialPayout(selectedOption, parseInt(amount)).toLocaleString()}
              </span>
            </div>
          )}

          {error && <p className="mt-2 text-[11px] text-[#ef4444]">{error}</p>}
          {success && <p className="mt-2 text-[11px] text-[#22c55e]">Bet placed!</p>}
        </div>
      )}
    </div>
  );
}
