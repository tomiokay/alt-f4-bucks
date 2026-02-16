import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";

type Props = {
  balance: number;
  displayName: string;
};

export function BalanceCard({ balance, displayName }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Your Balance
        </CardTitle>
        <Coins className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums">
          {balance.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Alt-F4 Bucks &middot; {displayName}
        </p>
      </CardContent>
    </Card>
  );
}
