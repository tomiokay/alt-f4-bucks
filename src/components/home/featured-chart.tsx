"use client";

type Props = {
  redPct: number;
  bluePct: number;
};

export function FeaturedChart({ redPct, bluePct }: Props) {
  return (
    <div className="h-[120px] flex items-center justify-center gap-8">
      <div className="text-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span className="text-[11px] text-[#7d8590]">Red Alliance</span>
        </div>
        <span className="text-[32px] font-bold text-[#ef4444] tabular-nums">{redPct}%</span>
      </div>
      <div className="text-[20px] text-[#484f58] font-light">vs</div>
      <div className="text-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-3 w-3 rounded-full bg-[#3b82f6]" />
          <span className="text-[11px] text-[#7d8590]">Blue Alliance</span>
        </div>
        <span className="text-[32px] font-bold text-[#3b82f6] tabular-nums">{bluePct}%</span>
      </div>
    </div>
  );
}
