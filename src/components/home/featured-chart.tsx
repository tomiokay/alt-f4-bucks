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

type Props = {
  redPct: number;
  bluePct: number;
};

// Generate smooth probability data trending toward current odds
function generateTrend(redPct: number, bluePct: number) {
  const points = 24;
  const data = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    let red = 50 + (redPct - 50) * progress + (Math.random() - 0.5) * 8;
    red = Math.max(10, Math.min(90, red));

    data.push({
      time: `${i}h`,
      red: Math.round(red),
      blue: Math.round(100 - red),
    });
  }

  data[data.length - 1].red = redPct;
  data[data.length - 1].blue = bluePct;
  return data;
}

export function FeaturedChart({ redPct, bluePct }: Props) {
  const data = useMemo(() => generateTrend(redPct, bluePct), [redPct, bluePct]);

  return (
    <div>
      {/* Current odds display */}
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

      {/* Area chart */}
      <div className="h-[120px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
            <XAxis hide />
            <YAxis hide domain={[0, 100]} />
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
            <Area type="monotone" dataKey="red" stroke="#ef4444" strokeWidth={2} fill="url(#redGrad)" />
            <Area type="monotone" dataKey="blue" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
