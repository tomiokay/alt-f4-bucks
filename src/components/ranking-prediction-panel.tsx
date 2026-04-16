"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { placePredictionBet } from "@/app/actions/predictions";
import type { PredictionMarket, PredictionPoolOption } from "@/lib/types";

type Props = {
  market: PredictionMarket;
  pools: Record<string, PredictionPoolOption>;
  balance: number;
  qualPlayed?: number;
  qualTotal?: number;
};

export function RankingPredictionPanel({ market, pools, balance, qualPlayed = 0, qualTotal = 0 }: Props) {
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rank = market.line ? Math.round(market.line) : "?";
  const totalPool = Object.values(pools).reduce((sum, p) => sum + p.pool, 0);
  const totalBettors = Object.values(pools).reduce((sum, p) => sum + p.bettors, 0);

  const isResolved = market.status === "resolved";
  const isClosed = market.status !== "open";

  // Early-prediction multiplier: 2.0x at 0% done → 1.0x at 90% done → locked at 90%+
  const fraction = qualTotal > 0 ? qualPlayed / qualTotal : 0;
  const isLocked = fraction >= 0.9;
  const multiplier = qualTotal > 0 && !isLocked
    ? Math.max(1.0, parseFloat((2.0 - fraction / 0.9).toFixed(2)))
    : 1.0;
  const pctDone = qualTotal > 0 ? Math.round(fraction * 100) : 0;

  // Sort by pool size descending so the favourites show first
  const sortedOptions = [...market.options].sort((a, b) => {
    const pa = pools[a.key]?.pool ?? 0;
    const pb = pools[b.key]?.pool ?? 0;
    return pb - pa;
  });

  const filtered =
    query.trim().length > 0
      ? sortedOptions.filter(
          (o) =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            o.key.replace("frc", "").includes(query)
        )
      : sortedOptions.slice(0, 8);

  const selectedLabel = market.options.find((o) => o.key === selectedOption)?.label;

  function getOptionPct(key: string) {
    const pool = pools[key]?.pool ?? 0;
    if (totalPool === 0) return null;
    return Math.round((pool / totalPool) * 100);
  }

  function getPotentialPayout(optionKey: string, betAmount: number) {
    const optionPool = (pools[optionKey]?.pool ?? 0) + betAmount;
    const newTotal = totalPool + betAmount;
    if (optionPool === 0) return betAmount;
    return Math.floor((betAmount * newTotal) / optionPool);
  }

  function handleSubmit() {
    if (!selectedOption) return;
    if (!confirm) { setConfirm(true); return; }
    setError(null);
    setSuccess(false);
    setConfirm(false);

    const fd = new FormData();
    fd.set("marketId", market.id);
    fd.set("option", selectedOption);
    fd.set("amount", String(amount));

    startTransition(async () => {
      const result = await placePredictionBet(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  const presets = [10, 50, 100, 500].filter((p) => p <= balance);
  const canAfford = balance >= amount && amount >= 1;

  const winnerLabel = isResolved && market.correct_option
    ? market.options.find((o) => o.key === market.correct_option)?.label ?? market.correct_option
    : null;

  return (
    <div className="rounded-xl bg-[#161b22] border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            #{rank}
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
            <span className="text-[#484f58]">
              ${totalPool.toLocaleString()} pool · {totalBettors}{" "}
              {totalBettors === 1 ? "bet" : "bets"}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {isClosed ? (
          <div className="rounded-lg bg-[#0d1117] border border-[#21262d] p-3 text-center">
            {winnerLabel ? (
              <>
                <p className="text-[11px] text-[#7d8590] mb-1">Finished Rank #{rank}</p>
                <p className="text-[16px] font-bold font-mono text-[#22c55e]">{winnerLabel}</p>
              </>
            ) : (
              <p className="text-[13px] text-[#484f58]">
                {isResolved ? "Market resolved" : "Market closed"}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Search */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by team number..."
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />

            {/* Team list */}
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {filtered.map((opt) => {
                const pct = getOptionPct(opt.key);
                const poolInfo = pools[opt.key];
                const isSelected = selectedOption === opt.key;

                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedOption(isSelected ? null : opt.key)}
                    className={cn(
                      "w-full relative rounded-lg px-3 py-2 text-left transition-all overflow-hidden",
                      isSelected
                        ? "bg-purple-500/10 border border-purple-500/40"
                        : "bg-[#0d1117] border border-[#21262d] hover:border-[#30363d]"
                    )}
                  >
                    {pct !== null && (
                      <div
                        className={cn(
                          "absolute inset-0 opacity-10 transition-all",
                          isSelected ? "bg-purple-400" : "bg-[#e6edf3]"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-[13px] font-mono font-semibold",
                          isSelected ? "text-purple-300" : "text-[#e6edf3]"
                        )}
                      >
                        {opt.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {poolInfo && poolInfo.pool > 0 && (
                          <span className="text-[10px] text-[#484f58]">
                            ${poolInfo.pool.toLocaleString()}
                          </span>
                        )}
                        {pct !== null && (
                          <span
                            className={cn(
                              "text-[12px] font-bold tabular-nums",
                              isSelected ? "text-purple-300" : "text-[#7d8590]"
                            )}
                          >
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <p className="text-center text-[12px] text-[#484f58] py-3">No teams found</p>
              )}

              {query.length === 0 && sortedOptions.length > 8 && (
                <p className="text-center text-[11px] text-[#484f58] pt-1">
                  +{sortedOptions.length - 8} more — search to find your team
                </p>
              )}
            </div>

            {/* Selection summary */}
            {selectedOption && (
              <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-2">
                <span className="text-[11px] text-purple-400 shrink-0">Pick:</span>
                <span className="text-[13px] font-semibold font-mono text-[#e6edf3]">
                  {selectedLabel}
                </span>
                <span className="text-[11px] text-[#484f58] ml-auto">finishes Rank #{rank}</span>
              </div>
            )}

            {/* Wager */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-[#7d8590]">Wager</span>
                <span className="text-[11px] text-[#484f58]">
                  Balance: ${balance.toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#7d8590]">
                  $
                </span>
                <input
                  type="number"
                  min={1}
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#21262d] pl-7 pr-3 text-[14px] text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
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

            {/* Early multiplier banner */}
            {qualTotal > 0 && (
              <div className={cn(
                "rounded-lg px-3 py-2 border text-[11px]",
                isLocked
                  ? "bg-[#ef4444]/5 border-[#ef4444]/20 text-[#ef4444]"
                  : multiplier >= 1.5
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-[#21262d] border-[#30363d] text-[#7d8590]"
              )}>
                {isLocked ? (
                  <span className="font-semibold">Locked — quals are 90%+ complete, no more bets</span>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>Early prediction bonus</span>
                    <span className="font-bold tabular-nums">
                      {multiplier.toFixed(2)}x payout weight
                    </span>
                  </div>
                )}
                {!isLocked && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 rounded-full bg-[#21262d] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-500/50 transition-all"
                        style={{ width: `${pctDone}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#484f58]">{pctDone}% of quals done</span>
                  </div>
                )}
              </div>
            )}

            {/* Payout info */}
            <div className="text-[11px] text-[#484f58] space-y-1 pt-1 border-t border-[#21262d]">
              <p>Correct pick splits the pool weighted by bet × multiplier. Wrong = lose wager.</p>
              {selectedOption && (
                <div className="flex items-center justify-between">
                  <span>If correct, estimated payout</span>
                  <span className="text-[#22c55e] font-mono font-semibold tabular-nums">
                    ${getPotentialPayout(selectedOption, amount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
            {success && <p className="text-[12px] text-[#22c55e]">Prediction placed!</p>}
            {confirm && (
              <div className="rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-3 py-2">
                <p className="text-[12px] text-[#f59e0b] font-medium">
                  Bet ${amount} on this prediction? Click again to confirm.
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending || !selectedOption || !canAfford || isLocked}
              className={cn(
                "w-full rounded-lg py-2.5 text-[14px] font-semibold transition-colors",
                selectedOption && canAfford && !isPending && !isLocked
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                  : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
              )}
            >
              {isPending
                ? "Placing..."
                : confirm
                ? "Confirm Bet"
                : isLocked
                ? "Market locked"
                : selectedOption
                ? `Bet on ${selectedLabel}`
                : "Pick a team"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
