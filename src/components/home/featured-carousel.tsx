"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { FeaturedChart } from "./featured-chart";
import { motion, AnimatePresence } from "framer-motion";
import type { EnrichedMatch } from "@/app/page";
import type {
  PoolSummary,
  OddsHistoryPoint,
  PredictionMarket,
  PredictionPoolOption,
} from "@/lib/types";

type Props = {
  featured: EnrichedMatch | null;
  topMarkets?: EnrichedMatch[];
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

// ── Animated Counter ─────────────────────────────────────────
// Counts up from 0 to `value` over `duration` ms on mount.

function AnimatedCounter({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Countdown Timer ──────────────────────────────────────────

function CountdownTimer({
  scheduledTime,
  isComplete,
}: {
  scheduledTime: string | null;
  isComplete: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isComplete) {
    return (
      <span className="text-[11px] font-semibold text-[#7d8590] uppercase tracking-wider">
        Resolved
      </span>
    );
  }

  if (!scheduledTime) {
    return null;
  }

  const scheduled = new Date(scheduledTime).getTime();
  const diff = scheduled - now;

  if (diff <= 0) {
    // Past scheduled time and not complete = LIVE
    return (
      <motion.span
        className="text-[11px] font-bold text-[#22c55e] uppercase tracking-wider"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        LIVE NOW
      </motion.span>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return (
      <span className="text-[11px] font-semibold text-[#f0883e] tabular-nums tracking-wide">
        Starts in {hours}h {minutes}m
      </span>
    );
  }

  return (
    <span className="text-[11px] font-semibold text-[#f0883e] tabular-nums tracking-wide">
      Starts in{" "}
      <motion.span
        key={`${minutes}:${seconds}`}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </motion.span>
    </span>
  );
}

// ── Live Badge ───────────────────────────────────────────────

function LiveBadge({ isLive }: { isLive: boolean }) {
  if (!isLive) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2 py-0.5 border border-[#22c55e]/20">
      <motion.span
        className="h-2 w-2 rounded-full bg-[#22c55e]"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [1, 0.6, 1],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[10px] font-bold text-[#22c55e] uppercase tracking-wider">
        Live
      </span>
    </div>
  );
}

// ── Animated Odds Bar ────────────────────────────────────────

function OddsBar({
  redPct,
  bluePct,
}: {
  redPct: number;
  bluePct: number;
}) {
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-[#21262d] gap-px">
      <motion.div
        className="rounded-l-full bg-gradient-to-r from-[#ef4444] to-[#f87171]"
        initial={{ width: "50%" }}
        animate={{ width: `${redPct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <motion.div
        className="rounded-r-full bg-gradient-to-r from-[#60a5fa] to-[#3b82f6]"
        initial={{ width: "50%" }}
        animate={{ width: `${bluePct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Slide Variants ───────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
};

// ── Main Carousel ────────────────────────────────────────────

export function FeaturedCarousel({
  featured,
  topMarkets = [],
  pools,
  predictions,
  balance,
  oddsHistory = [],
  predictionMarkets,
  predictionPools,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipSide, setSlipSide] = useState<"red" | "blue">("red");
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Build slides: top markets by pool size, then prediction markets
  const slides: Slide[] = [];
  const matchSlides =
    topMarkets.length > 0 ? topMarkets : featured ? [featured] : [];
  for (const m of matchSlides) {
    slides.push({ type: "match", data: m });
  }
  for (const pm of predictionMarkets) {
    if (pm.status !== "open") continue;
    slides.push({ type: "prediction", data: pm });
  }

  const slideCount = slides.length;

  function goTo(index: number, dir: "left" | "right") {
    if (index === current) return;
    setDirection(dir === "left" ? 1 : -1);
    setCurrent(index);
  }

  const next = useCallback(() => {
    if (slideCount > 1) {
      setDirection(1);
      setCurrent((c) => (c + 1) % slideCount);
    }
  }, [slideCount]);

  const prev = useCallback(() => {
    if (slideCount > 1) {
      setDirection(-1);
      setCurrent((c) => (c - 1 + slideCount) % slideCount);
    }
  }, [slideCount]);

  // Auto-advance every 20 seconds, reset on manual interaction
  useEffect(() => {
    if (slideCount <= 1) return;
    timerRef.current = setInterval(next, 20000);
    return () => clearInterval(timerRef.current);
  }, [next, slideCount]);

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 20000);
  }

  if (slides.length === 0) return null;

  const activeSlide = slides[current];

  function openSlip(side: "red" | "blue") {
    setSlipSide(side);
    setSlipOpen(true);
  }

  return (
    <>
      <div className="rounded-xl bg-[#161b22] overflow-hidden relative">
        {/* Subtle animated gradient border */}
        <div className="absolute inset-0 rounded-xl pointer-events-none z-10">
          <div className="absolute inset-0 rounded-xl border border-[#30363d]/60" />
        </div>

        {/* Slide content with AnimatePresence */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
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
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows + dots */}
        {slideCount > 1 && (
          <>
            {/* Arrows */}
            <motion.button
              onClick={() => {
                prev();
                resetTimer();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#0d1117]/80 flex items-center justify-center text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#0d1117] transition-colors z-20 backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </motion.button>
            <motion.button
              onClick={() => {
                next();
                resetTimer();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#0d1117]/80 flex items-center justify-center text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#0d1117] transition-colors z-20 backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </motion.button>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    goTo(i, i > current ? "left" : "right");
                    resetTimer();
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === current
                      ? "w-5 bg-[#e6edf3]"
                      : "w-1.5 bg-[#30363d] hover:bg-[#484f58]"
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

  const scheduledMs = match.scheduled_time
    ? new Date(match.scheduled_time).getTime()
    : null;
  const isLive =
    scheduledMs !== null && Date.now() >= scheduledMs && !match.is_complete;
  const totalTraders = odds.redBettors + odds.blueBettors;

  const formattedTime = match.scheduled_time
    ? new Date(match.scheduled_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;
  const formattedDate = match.scheduled_time
    ? new Date(match.scheduled_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-[#7d8590]">
          <Link
            href={`/events/${match.event_key}`}
            className="rounded bg-[#21262d] px-1.5 py-0.5 font-medium hover:bg-[#30363d] transition-colors"
          >
            {match.event_name}
          </Link>
          <span>·</span>
          <span>{compLabel} {match.match_number}</span>
        </div>
        <Image src="/logo.avif" alt="Alt-F4 Bucks" width={24} height={24} className="rounded-md" />
      </div>

      {/* Split layout: left info + right chart */}
      <div className="flex flex-col md:flex-row">
        {/* Left side: title, teams, bet buttons, activity */}
        <div className="flex-1 min-w-0 px-5 pb-4">
          {/* Title — links to market */}
          <Link href={`/market/${encodeURIComponent(match.match_key)}`}>
            <h2 className="text-[18px] font-semibold text-[#e6edf3] leading-tight mb-1 hover:text-[#58a6ff] transition-colors cursor-pointer">
              {match.red_teams.join(", ")} vs {match.blue_teams.join(", ")}
            </h2>
          </Link>

          {/* Time + status */}
          <div className="flex items-center gap-3 mb-4">
            {formattedTime && (
              <span className="text-[12px] text-[#7d8590]">
                {formattedTime} · {formattedDate}
              </span>
            )}
            <LiveBadge isLive={isLive} />
            <CountdownTimer scheduledTime={match.scheduled_time} isComplete={match.is_complete} />
          </div>

          {/* Bet buttons */}
          <div className="flex gap-2 mb-4">
            <motion.button
              onClick={() => onBet("red")}
              className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold bg-[#ef4444]/15 text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Red {odds.redPct}¢
            </motion.button>
            <motion.button
              onClick={() => onBet("blue")}
              className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold bg-[#3b82f6]/15 text-[#3b82f6] hover:bg-[#3b82f6]/25 transition-colors cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Blue {odds.bluePct}¢
            </motion.button>
          </div>

          {/* Alliance details */}
          <div className="space-y-2 mb-3">
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-[#ef4444]"
                animate={isLive ? { scale: [1, 1.3, 1] } : undefined}
                transition={isLive ? { duration: 2, repeat: Infinity } : undefined}
              />
              <span className="text-[12px] text-[#e6edf3] font-mono">{match.red_teams.join(", ")}</span>
              <span className="text-[14px] font-bold text-[#ef4444] tabular-nums ml-auto">{odds.redPct}%</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-[#3b82f6]"
                animate={isLive ? { scale: [1, 1.3, 1] } : undefined}
                transition={isLive ? { duration: 2, repeat: Infinity, delay: 0.5 } : undefined}
              />
              <span className="text-[12px] text-[#e6edf3] font-mono">{match.blue_teams.join(", ")}</span>
              <span className="text-[14px] font-bold text-[#3b82f6] tabular-nums ml-auto">{odds.bluePct}%</span>
            </motion.div>
          </div>
        </div>

        {/* Right side: chart */}
        <div className="md:w-[55%] shrink-0 px-5 md:pl-0 pb-4">
          <div className="h-[160px]">
            <FeaturedChart redPct={odds.redPct} bluePct={odds.bluePct} history={oddsHistory} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        className="flex items-center gap-4 border-t border-[#21262d] px-5 py-2.5 text-[11px] text-[#484f58]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {odds.totalPool > 0 && (
          <span className="flex items-center gap-1">
            $<AnimatedCounter value={odds.totalPool} /> Vol.
          </span>
        )}
        {totalTraders > 0 && (
          <span className="flex items-center gap-1">
            <AnimatedCounter value={totalTraders} /> betters
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[#7d8590]">
          LIVE
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#22c55e]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </span>
      </motion.div>
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
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#a855f7",
    "#ec4899",
    "#06b6d4",
    "#f97316",
  ];

  const typeLabel = market.type === "event_winner" ? "Playoffs" : "Rankings";
  const typeIcon = market.type === "event_winner" ? "W" : "#1";
  const typeColor =
    market.type === "event_winner"
      ? "from-yellow-500 to-amber-500"
      : "from-blue-500 to-cyan-500";

  // Sort options: ones with bets first (by pool size), then the rest
  const sortedOptions = [...market.options].sort((a, b) => {
    const aPool = pools[a.key]?.pool ?? 0;
    const bPool = pools[b.key]?.pool ?? 0;
    return bPool - aPool;
  });
  const topOptions = sortedOptions.slice(0, 6);

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            className={cn(
              "rounded px-1.5 py-0.5 font-bold text-white text-[10px] bg-gradient-to-r",
              typeColor
            )}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {typeIcon}
          </motion.div>
          <span className="text-[11px] text-[#7d8590]">{typeLabel}</span>
        </div>
        <Image src="/logo.avif" alt="Alt-F4 Bucks" width={24} height={24} className="rounded-md" />
      </div>

      {/* Header */}
      <div className="px-5 pt-1 pb-3">
        <div className="flex items-center gap-2 text-[11px] text-[#7d8590] mb-2">
          <Link
            href={`/events/${market.event_key}`}
            className="hover:text-[#e6edf3] transition-colors"
          >
            {market.event_key}
          </Link>
        </div>
        <Link href={market.match_key ? `/market/${encodeURIComponent(market.match_key)}` : `/events/${market.event_key}`}>
          <h2 className="text-[18px] font-semibold text-[#e6edf3] leading-tight hover:text-[#58a6ff] transition-colors cursor-pointer">
            {market.title}
          </h2>
        </Link>
        {market.description && (
          <p className="text-[12px] text-[#484f58] mt-1">
            {market.description}
          </p>
        )}
      </div>

      {/* Options list with animated bars */}
      <div className="px-5 pb-4 space-y-2.5">
        {topOptions.map((opt, i) => {
          const pct = getOptionPct(opt.key);
          const color = colors[i % colors.length];

          return (
            <motion.div
              key={opt.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[13px] text-[#e6edf3] truncate">
                    {opt.label}
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-12 text-right shrink-0">
                  {pct}%
                </span>
              </div>
              {/* Animated percentage bar */}
              <div className="ml-5 h-1 rounded-full bg-[#21262d] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}
        {market.options.length > 6 && (
          <motion.p
            className="text-[11px] text-[#484f58]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            +{market.options.length - 6} more options
          </motion.p>
        )}
      </div>

      {/* Footer with animated counter */}
      <motion.div
        className="flex items-center gap-4 border-t border-[#21262d] px-5 py-2.5 text-[11px] text-[#484f58]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {totalPool > 0 && (
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <AnimatedCounter value={totalPool} prefix="$" suffix=" Vol." />
          </span>
        )}
        <span>{market.options.length} options</span>
        <Link
          href={`/events/${market.event_key}`}
          className="ml-auto text-[#388bfd] hover:text-[#58a6ff] transition-colors"
        >
          Bet now →
        </Link>
      </motion.div>
    </div>
  );
}
