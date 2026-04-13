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
} from "recharts";

type Props = {
  redPct: number;
  bluePct: number;
};

// Generate fake historical data points for the chart visualization
// In production this would come from a trade_history table
function generateHistory(redPct: number, bluePct: number) {
  const points = 48; // 48 data points
  const data = [];
  const now = Date.now();
  const interval = (24 * 60 * 60 * 1000) / points; // spread over 24h

  let red = 50;
  let blue = 50;
  const targetRed = redPct;
  const targetBlue = bluePct;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    // Trend toward current value with noise
    red = 50 + (targetRed - 50) * progress + (Math.random() - 0.5) * 12;
    blue = 100 - red;
    red = Math.max(5, Math.min(95, red));
    blue = 100 - red;

    const time = new Date(now - (points - i) * interval);
    data.push({
      time: time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      timestamp: time.getTime(),
      red: Math.round(red),
      blue: Math.round(blue),
    });
  }

  // Last point = exact current values
  data[data.length - 1].red = redPct;
  data[data.length - 1].blue = bluePct;

  return data;
}

type TimeRange = "1H" | "6H" | "1D" | "1W" | "All";

export function FeaturedChart({ redPct, bluePct }: Props) {
  const [range, setRange] = useState<TimeRange>("1D");
  const data = useMemo(() => generateHistory(redPct, bluePct), [redPct, bluePct]);

  const ranges: TimeRange[] = ["1H", "6H", "1D", "1W", "All"];
  const sliceMap: Record<TimeRange, number> = {
    "1H": 2,
    "6H": 12,
    "1D": 48,
    "1W": 48,
    "All": 48,
  };
  const sliced = data.slice(-sliceMap[range]);

  return (
    <div>
      {/* Time range selector */}
      <div className="flex items-center gap-1 mb-3">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              range === r
                ? "bg-[#21262d] text-[#e6edf3]"
                : "text-[#484f58] hover:text-[#7d8590]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[180px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sliced}>
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
              dot={false}
              activeDot={{ r: 3, fill: "#ef4444" }}
            />
            <Line
              type="monotone"
              dataKey="blue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
