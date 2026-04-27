"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

async function claimWorldsBonus() {
  const res = await fetch("/api/claim-worlds-bonus", { method: "POST" });
  return res.json();
}

async function checkClaimed() {
  const res = await fetch("/api/claim-worlds-bonus");
  return res.json();
}

export function WorldsBanner() {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    checkClaimed().then((res) => {
      if (res.claimed) setClaimed(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function handleClaim() {
    startTransition(async () => {
      const res = await claimWorldsBonus();
      if (res.error) {
        setError(res.error);
      } else {
        setClaimed(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-4 rounded-xl bg-gradient-to-r from-[#f59e0b]/10 to-[#ef4444]/10 border border-[#f59e0b]/20 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌎</span>
          <div>
            <h3 className="text-[15px] font-semibold text-[#e6edf3]">FIRST Championship — Coming Soon</h3>
            <p className="text-[12px] text-[#7d8590]">Worlds is almost here. Claim your bonus to bet on the biggest matches of the season.</p>
          </div>
        </div>
        {loading ? null : claimed ? (
          <span className="shrink-0 text-[13px] text-[#22c55e] font-semibold">Claimed!</span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#ef4444] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Claiming..." : "Claim $10K"}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-[#7d8590] mt-1">{error}</p>}
    </div>
  );
}
