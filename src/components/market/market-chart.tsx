"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { OddsHistoryPoint } from "@/lib/types";

type Props = {
  redPct: number;
  bluePct: number;
  history: OddsHistoryPoint[];
};

type TimeRange = "1H" | "6H" | "1D" | "1W" | "All";

function filterByRange(data: ChartPoint[], range: TimeRange): ChartPoint[] {
  if (range === "All") return data;
  const now = Date.now();
  const ms: Record<TimeRange, number> = {
    "1H": 60 * 60 * 1000,
    "6H": 6 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "All": Infinity,
  };
  const cutoff = now - ms[range];
  return data.filter((d) => d.timestamp >= cutoff);
}

type ChartPoint = {
  time: string;
  timestamp: number;
  red: number;
  blue: number;
  pool: number;
};

export function MarketChart({ redPct, bluePct, history }: Props) {
  const [range, setRange] = useState<TimeRange>("All");

  const data = useMemo(() => {
    if (history.length === 0) return [];

    const points: ChartPoint[] = history.map((h) => {
      const d = new Date(h.created_at);
      return {
        time: d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        timestamp: d.getTime(),
        red: h.red_pct,
        blue: h.blue_pct,
        pool: h.total_pool,
      };
    });

    // Add current state as last point
    points.push({
      time: "Now",
      timestamp: Date.now(),
      red: redPct,
      blue: bluePct,
      pool: points[points.length - 1]?.pool ?? 0,
    });

    return points;
  }, [history, redPct, bluePct]);

  const ranges: TimeRange[] = ["1H", "6H", "1D", "1W", "All"];
  const filtered = filterByRange(data, range);

  // No data state
  if (history.length === 0) {
    return (
      <div className="rounded-xl bg-[#161b22] p-4">
        <div className="flex items-center gap-1 mb-4">
          {ranges.map((r) => (
            <button
              key={r}
              className="px-3 py-1 rounded-md text-[12px] font-medium text-[#484f58]"
              disabled
            >
              {r}
            </button>
          ))}
        </div>
        <div className="h-[220px] flex flex-col items-center justify-center">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
              <span className="text-[20px] font-bold text-[#e6edf3] tabular-nums">{redPct}%</span>
            </div>
            <span className="text-[#484f58]">vs</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[20px] font-bold text-[#e6edf3] tabular-nums">{bluePct}%</span>
            </div>
          </div>
          <p className="text-[12px] text-[#484f58]">Chart will appear after the first trade</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      {/* Time range selector */}
      <div className="flex items-center gap-1 mb-4">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
              range === r
                ? "bg-[#21262d] text-[#e6edf3]"
                : "text-[#484f58] hover:text-[#7d8590]"
            }`}
          >
            {r}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            <span className="text-[#e6edf3] font-semibold tabular-nums">{redPct}%</span>
            <span className="text-[#484f58]">Red</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
            <span className="text-[#e6edf3] font-semibold tabular-nums">{bluePct}%</span>
            <span className="text-[#484f58]">Blue</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px]">
        {filtered.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-[#484f58]">
            Not enough data for this timeframe
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#484f58" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#484f58" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={35}
              />
              <ReferenceLine y={50} stroke="#21262d" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1c2128",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#7d8590" }}
                formatter={(value, name) => [
                  `${value}%`,
                  name === "red" ? "Red Alliance" : "Blue Alliance",
                ]}
              />
              <Line
                type="monotone"
                dataKey="red"
                stroke="#ef4444"
                strokeWidth={2}
                dot={filtered.length < 20}
                activeDot={{ r: 4, fill: "#ef4444" }}
              />
              <Line
                type="monotone"
                dataKey="blue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={filtered.length < 20}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
