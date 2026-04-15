import { notFound } from "next/navigation";
import { getProfileById } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getUserPoolBets } from "@/db/bets";
import { ProfileDashboard } from "@/components/profile-dashboard";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;

  const profile = await getProfileById(id);
  if (!profile) notFound();

  const [balance, bets] = await Promise.all([
    getUserBalance(profile.id),
    getUserPoolBets(profile.id),
  ]);

  const settledBets = bets.filter((b) => b.payout !== null);
  const totalPnL = settledBets.reduce((s, b) => s + (b.payout! - b.amount), 0);
  const biggestWin = settledBets
    .filter((b) => b.payout! > b.amount)
    .reduce((max, b) => Math.max(max, b.payout! - b.amount), 0);
  const totalBets = bets.length;

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
