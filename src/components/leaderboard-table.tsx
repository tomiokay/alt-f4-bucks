import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { LeaderboardEntry } from "@/lib/types";

type Props = {
  entries: LeaderboardEntry[];
};

export function LeaderboardTable({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No members on the leaderboard yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Member</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, index) => (
          <TableRow key={entry.user_id}>
            <TableCell className="font-medium">
              {index < 3 ? (
                <Badge
                  variant={index === 0 ? "default" : "secondary"}
                  className="w-8 justify-center"
                >
                  {index + 1}
                </Badge>
              ) : (
                <span className="pl-2 text-muted-foreground">{index + 1}</span>
              )}
            </TableCell>
            <TableCell>
              {entry.display_name}
              {entry.team_number && (
                <span className="text-muted-foreground text-xs ml-1">#{entry.team_number}</span>
              )}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {entry.balance.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
