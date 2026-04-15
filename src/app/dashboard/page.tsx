import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getUserPoolBets } from "@/db/bets";
import { getUserPredictionBets } from "@/db/predictions";
import { ProfileDashboard } from "@/components/profile-dashboard";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [balance, bets, predBets] = await Promise.all([
    getUserBalance(profile.id),
    getUserPoolBets(profile.id),
    getUserPredictionBets(profile.id),
  ]);

  const settledBets = bets.filter((b) => b.payout !== null);
  const poolPnL = settledBets.reduce((s, b) => s + (b.payout! - b.amount), 0);
  const settledPredBets = predBets.filter((b) => b.payout !== null);
  const predPnL = settledPredBets.reduce((s, b) => s + (b.payout! - b.amount), 0);
  const totalPnL = poolPnL + predPnL;
  const biggestWin = settledBets
    .filter((b) => b.payout! > b.amount)
    .reduce((max, b) => Math.max(max, b.payout! - b.amount), 0);
  const totalBets = bets.length + predBets.length;

  return (
    <ProfileDashboard
      profile={profile}
      balance={balance}
      bets={bets}
      totalPnL={totalPnL}
      biggestWin={biggestWin}
      totalBets={totalBets}
    />
  );
}
