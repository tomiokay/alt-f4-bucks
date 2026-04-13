"use client";

import { useState } from "react";
import { syncEventMatches } from "@/app/actions/bets";

export function EventSync() {
  const [eventKey, setEventKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    if (!eventKey.trim()) return;
    setLoading(true);
    setMessage(null);

    const result = await syncEventMatches(eventKey.trim());
    setLoading(false);

    if (result.error) {
      setMessage(`Error: ${result.error}`);
    } else {
      setMessage(`Synced ${result.count} matches`);
      setEventKey("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-[280px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#484f58]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          placeholder="Sync event (e.g. 2026cancmp)"
          value={eventKey}
          onChange={(e) => setEventKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSync()}
          className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] pl-9 pr-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none transition-colors"
        />
      </div>
      <button
        onClick={handleSync}
        disabled={loading || !eventKey.trim()}
        className="h-9 rounded-lg bg-[#21262d] px-4 text-[12px] font-medium text-[#e6edf3] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Syncing..." : "Sync"}
      </button>
      {message && (
        <span className="text-[11px] text-[#7d8590]">{message}</span>
      )}
    </div>
  );
}
