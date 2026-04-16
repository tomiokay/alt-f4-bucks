"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { placePoolBet } from "@/app/actions/bets";
import { potentialPayout } from "@/lib/odds";
import { isConfirmEnabled } from "@/lib/use-confirm-bets";
import type { MatchCache, MatchOdds } from "@/lib/types";

type Props = {
  match: MatchCache;
  odds: MatchOdds;
  balance: number;
};

export function TradingPanel({ match, odds, balance }: Props) {
  const [side, setSide] = useState<"red" | "blue">("red");
  const [amountStr, setAmountStr] = useState("10");
  const amount = parseInt(amountStr) || 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const submitting = useRef(false);

  const cutoffTime = match.scheduled_time ? new Date(new Date(match.scheduled_time).getTime() - 5 * 60 * 1000) : null;
  const isPast = cutoffTime && cutoffTime < new Date();
  const isBettable = !match.is_complete && !isPast;
  const canAfford = balance >= amount && amount >= 1;
  const result = potentialPayout(odds, side, amount);
  const pct = side === "red" ? odds.redPct : odds.bluePct;

  const presets = [1, 5, 10, 50, 100].filter((p) => p <= balance);

  async function handleSubmit() {
    if (!confirm && isConfirmEnabled()) {
      setConfirm(true);
      return;
    }
    if (submitting.current || !isBettable) return;
    submitting.current = true;
    setError(null);
    setLoading(true);
    setConfirm(false);

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
      {/* Header */}
      <div className="border-b border-[#21262d] px-4 py-3">
        <span className="text-[13px] font-medium text-[#e6edf3]">Place Bet</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Side toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSide("red"); setConfirm(false); }}
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
            onClick={() => { setSide("blue"); setConfirm(false); }}
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
              value={amountStr}
              onChange={(e) => { setAmountStr(e.target.value); setConfirm(false); }}
              className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] pl-7 pr-3 text-[14px] text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 mt-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => { setAmountStr(String(p)); setConfirm(false); }}
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
              onClick={() => { setAmountStr(String(balance)); setConfirm(false); }}
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
        {success && <p className="text-[12px] text-[#22c55e]">Bet placed!</p>}

        {confirm && (
          <div className="rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-3 py-2">
            <p className="text-[12px] text-[#f59e0b] font-medium">
              Bet ${amount} on {side === "red" ? "Red" : "Blue"}? Click again to confirm.
            </p>
          </div>
        )}

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
            {loading ? "Placing..." : confirm ? `Confirm $${amount} on ${side === "red" ? "Red" : "Blue"}` : `Bet ${side === "red" ? "Red" : "Blue"}`}
          </button>
        ) : (
          <div className="text-center py-2 text-[13px] text-[#484f58]">
            {match.is_complete ? "Market resolved" : "Betting closed — waiting for result"}
          </div>
        )}
      </div>
    </div>
  );
}
