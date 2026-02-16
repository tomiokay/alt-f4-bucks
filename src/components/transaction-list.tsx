import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TransactionWithProfiles } from "@/lib/types";

type Props = {
  transactions: TransactionWithProfiles[];
  showUser?: boolean;
};

function typeBadge(type: string) {
  switch (type) {
    case "award":
      return <Badge variant="default">Award</Badge>;
    case "purchase":
      return <Badge variant="secondary">Purchase</Badge>;
    case "adjustment":
      return <Badge variant="outline">Adjustment</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TransactionList({ transactions, showUser }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No transactions yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            {showUser && <TableHead>Member</TableHead>}
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(tx.created_at)}
              </TableCell>
              <TableCell>{typeBadge(tx.type)}</TableCell>
              {showUser && (
                <TableCell className="text-sm">
                  {tx.to_user?.display_name ?? "—"}
                </TableCell>
              )}
              <TableCell className="max-w-[200px] truncate text-sm">
                {tx.reason || "—"}
              </TableCell>
              <TableCell
                className={`text-right font-mono tabular-nums ${
                  tx.amount >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
