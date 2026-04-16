"use client";

import { useState, useRef, useEffect } from "react";
import { isConfirmEnabled } from "@/lib/use-confirm-bets";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { placePoolBet } from "@/app/actions/bets";
import { potentialPayout } from "@/lib/odds";
import type { MatchCache, MatchOdds } from "@/lib/types";

type Props = {
  match: MatchCache | null;
  side: "red" | "blue" | null;
  odds: MatchOdds | null;
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBets?: { side: string }[];
};

export function BetSlip({ match, side, odds, balance, open, onOpenChange, existingBets = [] }: Props) {
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy">("buy");
  const submitting = useRef(false);

  // Check if user has bets on the other side
  const otherSide = side === "red" ? "blue" : "red";
  const hasBetOnOtherSide = existingBets.some((b) => b.side === otherSide);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      setConfirming(false);
    }
  }, [open]);

  if (!match || !side || !odds) return null;

  const canAfford = balance >= amount && amount >= 1;
  const result = potentialPayout(odds, side, amount);
  const teams = side === "red" ? match.red_teams : match.blue_teams;
  const pct = side === "red" ? odds.redPct : odds.bluePct;
  const sideLabel = side === "red" ? "Red" : "Blue";

  const presets = [1, 5, 10, 20].filter((p) => p <= balance);

  async function handleSubmit() {
    // Show confirmation first
    if (!confirming && isConfirmEnabled()) {
      setConfirming(true);
      return;
    }

    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("matchKey", match!.match_key);
    formData.set("side", side!);
    formData.set("amount", String(amount));

    const res = await placePoolBet(formData);
    setLoading(false);
    submitting.current = false;

    if (res.error) {
      setError(res.error);
      setConfirming(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setConfirming(false);
        setAmount(10);
      }, 1200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] gap-0 p-0 overflow-hidden bg-[#161b22] border-[#30363d] rounded-xl">
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 px-5">
            <div className="h-10 w-10 rounded-full bg-[#16332a] flex items-center justify-center mb-3">
              <span className="text-[#22c55e] text-lg">&#10003;</span>
            </div>
            <div className="text-[14px] text-[#e6edf3] font-medium">Trade confirmed</div>
            <div className="text-[12px] text-[#7d8590] mt-1">
              ${amount} on {sideLabel} — {teams.join(", ")}
            </div>
          </div>
        ) : confirming ? (
          /* Confirmation screen */
          <div className="p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-[#e6edf3] text-center">Confirm Trade</h3>

            {hasBetOnOtherSide && (
              <div className="rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-3 py-2">
                <p className="text-[12px] text-[#f59e0b] font-medium">
                  You already have bets on {otherSide === "red" ? "Red" : "Blue"}. Betting both sides means guaranteed loss on one. Continue?
                </p>
              </div>
            )}

            <div className="rounded-lg bg-[#0d1117] p-3 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7d8590]">Market</span>
                <span className="text-[#e6edf3]">{match.event_name}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7d8590]">Side</span>
                <span className={side === "red" ? "text-[#ef4444] font-medium" : "text-[#3b82f6] font-medium"}>
                  {sideLabel} — {teams.join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7d8590]">Amount</span>
                <span className="text-[#e6edf3] font-mono tabular-nums">${amount}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7d8590]">Potential return</span>
                <span className="text-[#22c55e] font-mono tabular-nums font-medium">
                  ${result.payout.toLocaleString()} ({result.multiplier}x)
                </span>
              </div>
            </div>

            {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-medium bg-[#21262d] text-[#7d8590] hover:text-[#e6edf3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={cn(
                  "flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-colors",
                  canAfford && !loading
                    ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                    : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
                )}
              >
                {loading ? "Placing..." : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab header */}
            <div className="flex border-b border-[#21262d]">
              <button
                className={cn(
                  "flex-1 py-3 text-[13px] font-medium transition-colors",
                  activeTab === "buy"
                    ? "text-[#e6edf3] border-b-2 border-[#e6edf3]"
                    : "text-[#7d8590]"
                )}
                onClick={() => setActiveTab("buy")}
              >
                Buy
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Outcome selector */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#7d8590]">Outcome</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      side === "red" ? "bg-[#ef4444]" : "bg-[#3b82f6]"
                    )}
                  />
                  <span className="text-[13px] text-[#e6edf3] font-medium">
                    {sideLabel} wins
                  </span>
                  <span className="text-[13px] text-[#22c55e] font-medium ml-1 tabular-nums">
                    {pct}&#162;
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#7d8590]">Amount</span>
                  <span className="text-[11px] text-[#484f58]">
                    Balance: ${balance.toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#7d8590]">
                    $
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={balance}
                    value={amount}
                    onChange={(e) =>
                      setAmount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="pl-7 h-10 bg-[#0d1117] border-[#30363d] text-[14px] text-[#e6edf3] rounded-lg focus:border-[#388bfd]"
                  />
                </div>
                <div className="flex gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(p)}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors border",
                        amount === p
                          ? "border-[#30363d] bg-[#21262d] text-[#e6edf3]"
                          : "border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d]"
                      )}
                    >
                      ${p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(balance)}
                    className="flex-1 rounded-md py-1.5 text-[11px] font-medium border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d] transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#7d8590]">Odds</span>
                  <span className="text-[#e6edf3] tabular-nums font-mono">
                    {pct}%
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#7d8590]">Potential payout</span>
                  <span className="text-[#e6edf3] tabular-nums font-mono">
                    ${result.payout.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#7d8590]">Potential return</span>
                  <span className="text-[#22c55e] tabular-nums font-mono font-medium">
                    ${result.payout.toLocaleString()}{" "}
                    <span className="text-[#484f58]">({result.multiplier}x)</span>
                  </span>
                </div>
              </div>

              {!canAfford && (
                <p className="text-[12px] text-[#ef4444]">Insufficient balance</p>
              )}
              {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}

              {/* Buy button */}
              <button
                onClick={handleSubmit}
                disabled={loading || !canAfford}
                className={cn(
                  "w-full rounded-lg py-2.5 text-[14px] font-semibold transition-colors",
                  canAfford && !loading
                    ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                    : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
                )}
              >
                Buy Yes
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
