"use client";

import Link from "next/link";

type Topic = {
  key: string;
  name: string;
  count: number;
  volume: number;
  startTime: string | null;
};

type Props = {
  topics: Topic[];
};

function formatStartTime(time: string | null): string {
  if (!time) return "TBD";
  const d = new Date(time);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs < 0) return "Live";
  if (diffMs < 60 * 60 * 1000) {
    const mins = Math.floor(diffMs / 60000);
    return `${mins}m`;
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hrs = Math.floor(diffMs / (60 * 60 * 1000));
    return `${hrs}h`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function HotTopics({ topics }: Props) {
  if (topics.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[#e6edf3]">Starting soon</h3>
        <Link href="/betting" className="text-[11px] text-[#388bfd] hover:text-[#58a6ff] transition-colors">
          Explore all
        </Link>
      </div>
      <div className="space-y-2.5">
        {topics.map((topic) => {
          const timeLabel = formatStartTime(topic.startTime);
          const isLive = timeLabel === "Live";

          return (
            <div
              key={topic.key}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[#1c2128] transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-[13px] text-[#e6edf3] font-medium truncate">
                  {topic.name}
                </p>
                <p className="text-[11px] text-[#484f58]">
                  {topic.count} markets
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-[12px] font-medium tabular-nums ${
                  isLive ? "text-[#22c55e]" : "text-[#7d8590]"
                }`}>
                  {timeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
