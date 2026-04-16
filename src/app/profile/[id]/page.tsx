import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, getProfileById } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getUserPoolBets } from "@/db/bets";
import { getUserPredictionBets } from "@/db/predictions";
import { ProfileDashboard } from "@/components/profile-dashboard";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;

  const currentUser = await getCurrentProfile();
  if (!currentUser) redirect("/login");

  const profile = await getProfileById(id);
  if (!profile) notFound();

  const [balance, bets, predBets] = await Promise.all([
    getUserBalance(profile.id),
    getUserPoolBets(profile.id),
    getUserPredictionBets(profile.id),
  ]);

  // P&L = current balance - starting balance (consistent with leaderboard)
  const totalPnL = balance - 10000;
  const settledBets = bets.filter((b) => b.payout !== null);
  const biggestWin = settledBets
    .filter((b) => b.payout! > b.amount)
    .reduce((max, b) => Math.max(max, b.payout! - b.amount), 0);
  const totalBets = bets.length + predBets.length;

  return (
    <ProfileDashboard
      profile={profile}
      balance={balance}
      bets={bets}
      predictionBets={predBets}
      totalPnL={totalPnL}
      biggestWin={biggestWin}
      totalBets={totalBets}
    />
  );
}
