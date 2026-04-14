"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { placePoolBet } from "@/app/actions/bets";
import { potentialPayout } from "@/lib/odds";
import type { MatchCache, MatchOdds } from "@/lib/types";

type Props = {
  match: MatchCache;
  odds: MatchOdds;
  balance: number;
};

export function TradingPanel({ match, odds, balance }: Props) {
  const [side, setSide] = useState<"red" | "blue">("red");
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);

  const isPast = match.scheduled_time && new Date(match.scheduled_time) < new Date();
  const isBettable = !match.is_complete && !isPast;
  const canAfford = balance >= amount && amount >= 1;
  const result = potentialPayout(odds, side, amount);
  const pct = side === "red" ? odds.redPct : odds.bluePct;

  const presets = [1, 5, 10, 50, 100].filter((p) => p <= balance);

  async function handleSubmit() {
    if (submitting.current || !isBettable) return;
    submitting.current = true;
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("matchKey", match.match_key);
    formData.set("side", side);
    formData.set("amount", String(amount));

    const res = await placePoolBet(formData);
    setLoading(false);
    submitting.current = false;

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] overflow-hidden">
      {/* Buy / Sell tabs */}
      <div className="flex border-b border-[#21262d]">
        <button className="flex-1 py-3 text-[13px] font-medium text-[#e6edf3] border-b-2 border-[#e6edf3]">
          Buy
        </button>
        <button className="flex-1 py-3 text-[13px] font-medium text-[#484f58]" disabled>
          Sell
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Side toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSide("red")}
            className={cn(
              "flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors",
              side === "red"
                ? "bg-[#ef4444] text-white"
                : "bg-[#21262d] text-[#7d8590] hover:text-[#e6edf3]"
            )}
          >
            Red {odds.redPct}¢
          </button>
          <button
            onClick={() => setSide("blue")}
            className={cn(
              "flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors",
              side === "blue"
                ? "bg-[#3b82f6] text-white"
                : "bg-[#21262d] text-[#7d8590] hover:text-[#e6edf3]"
            )}
          >
            Blue {odds.bluePct}¢
          </button>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-[#7d8590]">Amount</span>
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
            <button
              onClick={() => setAmount(balance)}
              className="flex-1 rounded-md py-1.5 text-[11px] font-medium border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5 pt-1 border-t border-[#21262d]">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#7d8590]">Avg price</span>
            <span className="text-[#e6edf3] tabular-nums font-mono">{pct}¢</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#7d8590]">Potential return</span>
            <span className="text-[#22c55e] tabular-nums font-mono font-medium">
              ${result.payout.toLocaleString()} ({result.multiplier}x)
            </span>
          </div>
        </div>

        {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
        {success && <p className="text-[12px] text-[#22c55e]">Trade confirmed!</p>}

        {isBettable ? (
          <button
            onClick={handleSubmit}
            disabled={loading || !canAfford}
            className={cn(
              "w-full rounded-lg py-2.5 text-[14px] font-semibold transition-colors",
              canAfford && !loading
                ? side === "red"
                  ? "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                  : "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
            )}
          >
            {loading ? "Placing..." : `Buy ${side === "red" ? "Red" : "Blue"}`}
          </button>
        ) : (
          <div className="text-center py-2 text-[13px] text-[#484f58]">
            Market resolved
          </div>
        )}
      </div>
    </div>
  );
}
