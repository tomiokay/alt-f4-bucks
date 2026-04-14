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

function generateHistory(redPct: number, bluePct: number) {
  const points = 48;
  const data = [];
  const now = Date.now();
  const interval = (24 * 60 * 60 * 1000) / points;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    let red = 50 + (redPct - 50) * progress + (Math.random() - 0.5) * 12;
    red = Math.max(5, Math.min(95, red));
    const blue = 100 - Math.round(red);

    const time = new Date(now - (points - i) * interval);
    data.push({
      time: time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      red: Math.round(red),
      blue,
    });
  }

  data[data.length - 1].red = redPct;
  data[data.length - 1].blue = bluePct;
  return data;
}

type TimeRange = "1H" | "6H" | "1D" | "1W" | "All";

export function MarketChart({ redPct, bluePct }: Props) {
  const [range, setRange] = useState<TimeRange>("1D");
  const data = useMemo(() => generateHistory(redPct, bluePct), [redPct, bluePct]);

  const ranges: TimeRange[] = ["1H", "6H", "1D", "1W", "All"];
  const sliceMap: Record<TimeRange, number> = { "1H": 2, "6H": 12, "1D": 48, "1W": 48, "All": 48 };
  const sliced = data.slice(-sliceMap[range]);

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
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
      </div>
      <div className="h-[220px]">
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
            <Line type="monotone" dataKey="red" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="blue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
