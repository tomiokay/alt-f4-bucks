"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  createCustomMarket,
  resolveCustomMarket,
  voidCustomMarket,
  toggleFeatured,
} from "@/app/actions/custom-markets";
import { Star } from "lucide-react";

type Market = {
  id: string;
  title: string;
  status: string;
  options: { key: string; label: string }[];
  correct_option: string | null;
  is_custom: boolean;
  featured: boolean;
};

type Props = {
  markets: Market[];
};

export function CustomMarketsManager({ markets }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState("");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate() {
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("options", options);

    startTransition(async () => {
      const res = await createCustomMarket(fd);
      if (res.error) setError(res.error);
      else {
        setSuccess("Market created!");
        setTitle("");
        setDescription("");
        setOptions("");
        router.refresh();
      }
    });
  }

  function handleResolve(marketId: string, correctOption: string) {
    startTransition(async () => {
      const res = await resolveCustomMarket(marketId, correctOption);
      if (res.error) setError(res.error);
      else {
        setSuccess(`Resolved! ${res.resolved} bets paid out.`);
        setResolveId(null);
        router.refresh();
      }
    });
  }

  function handleVoid(marketId: string) {
    if (!confirm("Void this market? All bets will be refunded.")) return;
    startTransition(async () => {
      const res = await voidCustomMarket(marketId);
      if (res.error) setError(res.error);
      else {
        setSuccess("Market voided, bets refunded.");
        router.refresh();
      }
    });
  }

  const openMarkets = markets.filter((m) => m.status === "open" || m.status === "closed");

  return (
    <div className="space-y-6">
      {/* Create market */}
      <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Create Custom Market</h3>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[12px] text-[#7d8590]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Who will win the spirit award?"
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] text-[#7d8590]">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra context about the market"
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] text-[#7d8590]">Options (comma-separated)</label>
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="e.g. Team 254, Team 1678, Team 7558"
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />
          </div>

          {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
          {success && <p className="text-[12px] text-[#22c55e]">{success}</p>}

          <button
            onClick={handleCreate}
            disabled={isPending || !title || !options}
            className="rounded-lg bg-[#22c55e] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creating..." : "Create Market"}
          </button>
        </div>
      </div>

      {/* Open markets — resolve or void */}
      {openMarkets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-[#e6edf3]">Open Markets ({openMarkets.length})</h3>

          {openMarkets.map((market) => (
            <div
              key={market.id}
              className="rounded-xl bg-[#161b22] border border-[#21262d] p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[13px] font-medium text-[#e6edf3]">{market.title}</span>
                  {market.is_custom && (
                    <span className="ml-2 text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">Custom</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await toggleFeatured(market.id);
                        router.refresh();
                      });
                    }}
                    disabled={isPending}
                    className="flex items-center gap-1 text-[11px] disabled:opacity-50"
                    title={market.featured ? "Unfeature" : "Feature"}
                  >
                    <Star className={cn("h-3.5 w-3.5", market.featured ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#484f58] hover:text-[#7d8590]")} />
                  </button>
                  <button
                    onClick={() => handleVoid(market.id)}
                    disabled={isPending}
                    className="text-[11px] text-[#ef4444] hover:text-[#dc2626] disabled:opacity-50"
                  >
                    Void
                  </button>
                </div>
              </div>

              {resolveId === market.id ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-[#7d8590]">Select the winning option:</p>
                  <div className="flex flex-wrap gap-2">
                    {market.options.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleResolve(market.id, opt.key)}
                        disabled={isPending}
                        className="rounded-lg bg-[#22c55e]/10 px-3 py-1.5 text-[12px] font-semibold text-[#22c55e] hover:bg-[#22c55e]/20 border border-[#22c55e]/30 transition-colors disabled:opacity-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setResolveId(null)}
                    className="text-[11px] text-[#7d8590] hover:text-[#e6edf3]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {market.options.map((opt) => (
                      <span key={opt.key} className="text-[11px] text-[#484f58] bg-[#21262d] px-2 py-0.5 rounded">
                        {opt.label}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setResolveId(market.id)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg bg-[#388bfd]/10 px-3 py-1.5 text-[11px] font-semibold text-[#388bfd] hover:bg-[#388bfd]/20 border border-[#388bfd]/30 transition-colors disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
