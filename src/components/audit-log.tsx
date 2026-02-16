"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionList } from "@/components/transaction-list";
import { createClient } from "@/lib/supabase/client";
import type { TransactionWithProfiles, Profile } from "@/lib/types";
import { TRANSACTION_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";

type Props = {
  members: Profile[];
};

export function AuditLog({ members }: Props) {
  const [transactions, setTransactions] = useState<TransactionWithProfiles[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("transactions")
      .select(
        `
        *,
        to_user:profiles!transactions_to_user_id_fkey(display_name),
        by_user:profiles!transactions_by_user_id_fkey(display_name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }
    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }
    if (memberFilter !== "all") {
      query = query.eq("to_user_id", memberFilter);
    }

    const { data } = await query;
    setTransactions((data ?? []) as TransactionWithProfiles[]);
    setLoading(false);
  }, [typeFilter, categoryFilter, memberFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="award">Award</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {TRANSACTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Member</Label>
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading transactions...
        </div>
      ) : (
        <TransactionList transactions={transactions} showUser />
      )}
    </div>
  );
}
