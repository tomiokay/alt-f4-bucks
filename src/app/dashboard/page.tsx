import { redirect } from "next/navigation";
import { MyBets } from "@/components/my-bets";
import { cn } from "@/lib/utils";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getUserPoolBets } from "@/db/bets";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [balance, bets] = await Promise.all([
    getUserBalance(profile.id),
    getUserPoolBets(profile.id),
  ]);

  // Calculate net P&L across all settled bets (payout - amount for each)
  const settledBets = bets.filter((b) => b.payout !== null);
  const totalPnL = settledBets.reduce((s, b) => s + (b.payout! - b.amount), 0);

  const biggestWin = settledBets
    .filter((b) => b.payout! > b.amount)
    .reduce((max, b) => Math.max(max, b.payout! - b.amount), 0);

  const totalBets = bets.length;
  const initials = profile.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex gap-6 items-start">
        {/* Left: avatar + info */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-[#e6edf3]">
                {profile.display_name}
              </h1>
              <p className="text-[13px] text-[#7d8590]">
                Joined{" "}
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 mt-5">
            <div>
              <div className="text-[20px] font-bold text-[#e6edf3] tabular-nums font-mono">
                ${balance.toLocaleString()}
              </div>
              <div className="text-[12px] text-[#7d8590]">Balance</div>
            </div>
            <div>
              <div className="text-[20px] font-bold text-[#e6edf3] tabular-nums font-mono">
                {biggestWin > 0 ? `$${biggestWin.toLocaleString()}` : "—"}
              </div>
              <div className="text-[12px] text-[#7d8590]">Biggest Win</div>
            </div>
            <div>
              <div className="text-[20px] font-bold text-[#e6edf3] tabular-nums font-mono">
                {totalBets}
              </div>
              <div className="text-[12px] text-[#7d8590]">Predictions</div>
            </div>
          </div>
        </div>

        {/* Right: P&L card */}
        <div className="hidden md:block rounded-xl bg-[#161b22] p-5 min-w-[280px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <span className="text-[12px] text-[#7d8590]">Profit/Loss</span>
          </div>
          <div className={cn(
            "text-[28px] font-bold tabular-nums font-mono",
            totalPnL > 0 ? "text-[#22c55e]" : totalPnL < 0 ? "text-[#ef4444]" : "text-[#e6edf3]"
          )}>
            {totalPnL > 0 ? "+" : ""}${totalPnL.toLocaleString()}
          </div>
          <div className="text-[12px] text-[#7d8590] mt-1">All time</div>
          {/* Placeholder chart area */}
          <div className="mt-4 h-16 rounded-lg bg-[#0d1117] flex items-end px-2 pb-1 gap-[2px]">
            {[35,52,48,60,45,72,55,80,65,58,42,70,75,50,62,38,55,68,74,82,60,45,78,65].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[#22c55e]/30"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Positions & Activity */}
      <MyBets bets={bets} />
    </div>
  );
}
