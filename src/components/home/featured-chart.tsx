"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { OddsHistoryPoint } from "@/lib/types";

type Props = {
  redPct: number;
  bluePct: number;
  history?: OddsHistoryPoint[];
};

export function FeaturedChart({ redPct, bluePct, history = [] }: Props) {
  const data = useMemo(() => {
    if (history.length > 0) {
      const points = history.map((h) => ({
        time: new Date(h.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        red: h.red_pct,
        blue: h.blue_pct,
      }));
      // Add current as last point
      points.push({ time: "Now", red: redPct, blue: bluePct });
      return points;
    }
    return [
      { time: "Start", red: 50, blue: 50 },
      { time: "Now", red: redPct, blue: bluePct },
    ];
  }, [history, redPct, bluePct]);

  const hasHistory = history.length > 0;

  return (
    <div>
      <div className="flex items-center justify-center gap-8 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span className="text-[11px] text-[#7d8590]">Red</span>
          <span className="text-[20px] font-bold text-[#ef4444] tabular-nums">{redPct}%</span>
        </div>
        <span className="text-[14px] text-[#484f58]">vs</span>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#3b82f6]" />
          <span className="text-[11px] text-[#7d8590]">Blue</span>
          <span className="text-[20px] font-bold text-[#3b82f6] tabular-nums">{bluePct}%</span>
        </div>
      </div>

      <div className="h-[120px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="featRedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="featBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
            <XAxis hide />
            <YAxis hide domain={[0, 100]} />
            {hasHistory && (
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1c2128",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(value, name) => [
                  `${value}%`,
                  name === "red" ? "Red" : "Blue",
                ]}
              />
            )}
            <Area type="monotone" dataKey="red" stroke="#ef4444" strokeWidth={2} fill="url(#featRedGrad)" />
            <Area type="monotone" dataKey="blue" stroke="#3b82f6" strokeWidth={2} fill="url(#featBlueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!hasHistory && (
        <p className="text-[10px] text-[#484f58] text-center mt-1">Chart updates after the first trade</p>
      )}
    </div>
  );
}
