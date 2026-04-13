import { getLeaderboard } from "@/db/leaderboard";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard(50);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-[#e6edf3]">Leaderboard</h1>
        <p className="text-[12px] text-[#7d8590] mt-0.5">Top traders by portfolio value</p>
      </div>

      <div className="rounded-xl bg-[#161b22] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_120px_100px] gap-2 px-5 py-3 text-[11px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
          <span>#</span>
          <span>Trader</span>
          <span className="text-right">Portfolio</span>
          <span className="text-right">Rank</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[14px] text-[#7d8590]">
            No traders yet
          </div>
        ) : (
          leaderboard.map((entry, i) => {
            const initials = entry.display_name
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={entry.user_id}
                className="grid grid-cols-[40px_1fr_120px_100px] gap-2 items-center px-5 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
              >
                <span className="text-[14px] text-[#7d8590] tabular-nums">
                  {i + 1}
                </span>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {initials}
                  </div>
                  <span className="text-[14px] text-[#e6edf3] truncate">
                    {entry.display_name}
                  </span>
                </div>

                <span className="text-right text-[14px] text-[#e6edf3] tabular-nums font-mono">
                  ${entry.balance.toLocaleString()}
                </span>

                <div className="flex justify-end">
                  {i === 0 && (
                    <span className="rounded-md bg-[#fbbf24]/10 px-2 py-0.5 text-[11px] font-medium text-[#fbbf24]">
                      1st
                    </span>
                  )}
                  {i === 1 && (
                    <span className="rounded-md bg-[#94a3b8]/10 px-2 py-0.5 text-[11px] font-medium text-[#94a3b8]">
                      2nd
                    </span>
                  )}
                  {i === 2 && (
                    <span className="rounded-md bg-[#d97706]/10 px-2 py-0.5 text-[11px] font-medium text-[#d97706]">
                      3rd
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
