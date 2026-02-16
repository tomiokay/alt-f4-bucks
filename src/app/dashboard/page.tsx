import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/balance-card";
import { TransactionList } from "@/components/transaction-list";
import { getCurrentProfile } from "@/db/profiles";
import { getUserTransactions, getUserBalance } from "@/db/transactions";
import { History } from "lucide-react";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [balance, transactions] = await Promise.all([
    getUserBalance(profile.id),
    getUserTransactions(profile.id, 20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <BalanceCard balance={balance} displayName={profile.display_name} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold capitalize">
              {profile.role}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Member since{" "}
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2 sm:px-6">
          <TransactionList transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
