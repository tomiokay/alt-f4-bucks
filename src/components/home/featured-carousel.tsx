"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BetSlip } from "@/components/bet-slip";
import { PredictionMarketCard } from "@/components/prediction-market-card";
import { calculateOdds } from "@/lib/odds";
import { FeaturedChart } from "./featured-chart";
import type { EnrichedMatch } from "@/app/page";
import type {
  PoolSummary,
  OddsHistoryPoint,
  PredictionMarket,
  PredictionPoolOption,
} from "@/lib/types";

type Props = {
  featured: EnrichedMatch | null;
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  balance: number;
  oddsHistory?: OddsHistoryPoint[];
  predictionMarkets: PredictionMarket[];
  predictionPools: Record<string, Record<string, PredictionPoolOption>>;
};

type Slide =
  | { type: "match"; data: EnrichedMatch }
  | { type: "prediction"; data: PredictionMarket };

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

export function FeaturedCarousel({
  featured,
  pools,
  predictions,
  balance,
  oddsHistory = [],
  predictionMarkets,
  predictionPools,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipSide, setSlipSide] = useState<"red" | "blue">("red");

  // Build slides: featured match first, then prediction markets
  const slides: Slide[] = [];
  if (featured) {
    slides.push({ type: "match", data: featured });
  }
  for (const pm of predictionMarkets) {
    slides.push({ type: "prediction", data: pm });
  }

  const slideCount = slides.length;

  const next = useCallback(() => {
    if (slideCount > 1) setCurrent((c) => (c + 1) % slideCount);
  }, [slideCount]);

  const prev = useCallback(() => {
    if (slideCount > 1) setCurrent((c) => (c - 1 + slideCount) % slideCount);
  }, [slideCount]);

  // Auto-advance every 8 seconds
  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, slideCount]);

  if (slides.length === 0) return null;

  const activeSlide = slides[current];

  function openSlip(side: "red" | "blue") {
    setSlipSide(side);
    setSlipOpen(true);
  }

  return (
    <>
      <div className="rounded-xl bg-[#161b22] overflow-hidden relative">
        {/* Slide content */}
        {activeSlide.type === "match" ? (
          <MatchSlide
            enriched={activeSlide.data}
            pools={pools}
            predictions={predictions}
            oddsHistory={oddsHistory}
            onBet={openSlip}
          />
        ) : (
          <PredictionSlide
            market={activeSlide.data}
            pools={predictionPools[activeSlide.data.id] ?? {}}
            balance={balance}
          />
        )}

        {/* Navigation arrows + dots */}
        {slideCount > 1 && (
          <>
            {/* Arrows */}
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#0d1117]/80 flex items-center justify-center text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#0d1117] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#0d1117]/80 flex items-center justify-center text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#0d1117] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === current ? "w-4 bg-[#e6edf3]" : "w-1.5 bg-[#30363d] hover:bg-[#484f58]"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bet slip for match slides */}
      {activeSlide.type === "match" && (
        <BetSlip
          match={activeSlide.data.match}
          side={slipSide}
          odds={calculateOdds(
            pools[activeSlide.data.match.match_key] ?? null,
            predictions[activeSlide.data.match.match_key] ?? null
          )}
          balance={balance}
          open={slipOpen}
          onOpenChange={setSlipOpen}
        />
      )}
    </>
  );
}

// ── Match Slide ────────────────────────────────────────────

function MatchSlide({
  enriched,
  pools,
  predictions,
  oddsHistory,
  onBet,
}: {
  enriched: EnrichedMatch;
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  oddsHistory: OddsHistoryPoint[];
  onBet: (side: "red" | "blue") => void;
}) {
  const { match, odds } = enriched;
  const compLabel = COMP_LABELS[match.comp_level] ?? match.comp_level;

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 text-[11px] text-[#7d8590] mb-2">
          <Link
            href={`/events/${match.event_key}`}
            className="rounded bg-[#21262d] px-1.5 py-0.5 font-medium hover:bg-[#30363d] transition-colors"
          >
            {match.event_name}
          </Link>
          <span>·</span>
          <span>{compLabel} {match.match_number}</span>
        </div>
        <h2 className="text-[18px] font-semibold text-[#e6edf3] leading-tight">
          Who wins {compLabel} {match.match_number}?
        </h2>
      </div>

      {/* Chart */}
      <div className="px-5 pb-2">
        <FeaturedChart redPct={odds.redPct} bluePct={odds.bluePct} history={oddsHistory} />
      </div>

      {/* Alliance rows */}
      <div className="px-5 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-[14px] text-[#e6edf3] font-mono">
              {match.red_teams.join(" · ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-12 text-right">
              {odds.redPct}%
            </span>
            <button
              onClick={() => onBet("red")}
              className="rounded-md bg-[#ef4444]/15 px-3 py-1.5 text-[12px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors tabular-nums"
            >
              Bet {odds.redPct}¢
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-[14px] text-[#e6edf3] font-mono">
              {match.blue_teams.join(" · ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-12 text-right">
              {odds.bluePct}%
            </span>
            <button
              onClick={() => onBet("blue")}
              className="rounded-md bg-[#3b82f6]/15 px-3 py-1.5 text-[12px] font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/25 transition-colors tabular-nums"
            >
              Bet {odds.bluePct}¢
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 border-t border-[#21262d] px-5 py-2.5 text-[11px] text-[#484f58]">
        {odds.totalPool > 0 && <span>${odds.totalPool.toLocaleString()} Vol.</span>}
        {(odds.redBettors + odds.blueBettors) > 0 && (
          <span>{odds.redBettors + odds.blueBettors} traders</span>
        )}
      </div>
    </div>
  );
}

// ── Prediction Market Slide ────────────────────────────────

function PredictionSlide({
  market,
  pools,
  balance,
}: {
  market: PredictionMarket;
  pools: Record<string, PredictionPoolOption>;
  balance: number;
}) {
  const totalPool = Object.values(pools).reduce((sum, p) => sum + p.pool, 0);

  function getOptionPct(key: string) {
    const pool = pools[key]?.pool ?? 0;
    if (totalPool === 0) return Math.round(100 / market.options.length);
    return Math.round((pool / totalPool) * 100);
  }

  // Color palette for options
  const colors = [
    "#ef4444", "#3b82f6", "#22c55e", "#f59e0b",
    "#a855f7", "#ec4899", "#06b6d4", "#f97316",
  ];

  const typeLabel = market.type === "event_winner" ? "Playoffs" : "Rankings";
  const typeIcon = market.type === "event_winner" ? "W" : "#1";
  const typeColor = market.type === "event_winner" ? "from-yellow-500 to-amber-500" : "from-blue-500 to-cyan-500";

  // Show top options (max 6), rest collapsed
  const topOptions = market.options.slice(0, 6);

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 text-[11px] text-[#7d8590] mb-2">
          <div className={cn("rounded px-1.5 py-0.5 font-bold text-white text-[10px] bg-gradient-to-r", typeColor)}>
            {typeIcon}
          </div>
          <span>{typeLabel}</span>
          <span>·</span>
          <Link
            href={`/events/${market.event_key}`}
            className="hover:text-[#e6edf3] transition-colors"
          >
            {market.event_key}
          </Link>
        </div>
        <h2 className="text-[18px] font-semibold text-[#e6edf3] leading-tight">
          {market.title}
        </h2>
        {market.description && (
          <p className="text-[12px] text-[#484f58] mt-1">{market.description}</p>
        )}
      </div>

      {/* Options list — Polymarket style */}
      <div className="px-5 pb-4 space-y-2">
        {topOptions.map((opt, i) => {
          const pct = getOptionPct(opt.key);
          const color = colors[i % colors.length];
          const poolInfo = pools[opt.key];

          return (
            <div key={opt.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[13px] text-[#e6edf3] truncate">
                  {opt.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-12 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
        {market.options.length > 6 && (
          <p className="text-[11px] text-[#484f58]">
            +{market.options.length - 6} more options
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 border-t border-[#21262d] px-5 py-2.5 text-[11px] text-[#484f58]">
        {totalPool > 0 && <span>${totalPool.toLocaleString()} Vol.</span>}
        <span>{market.options.length} options</span>
        <Link
          href={`/events/${market.event_key}`}
          className="ml-auto text-[#388bfd] hover:text-[#58a6ff] transition-colors"
        >
          Bet now →
        </Link>
      </div>
    </div>
  );
}
