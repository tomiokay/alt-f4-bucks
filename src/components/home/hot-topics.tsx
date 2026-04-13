"use client";

type Topic = {
  key: string;
  name: string;
  count: number;
  volume: number;
};

type Props = {
  topics: Topic[];
};

export function HotTopics({ topics }: Props) {
  if (topics.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[#e6edf3]">Hot topics</h3>
        <button className="text-[11px] text-[#388bfd] hover:text-[#58a6ff] transition-colors">
          Explore all
        </button>
      </div>
      <div className="space-y-2.5">
        {topics.map((topic) => (
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
              <span className="text-[12px] text-[#7d8590] tabular-nums font-mono">
                {topic.volume > 0 ? `$${topic.volume.toLocaleString()}` : ""}
              </span>
              <span className="text-[10px] text-[#484f58] block">today</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
