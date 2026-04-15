"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { awardBucks } from "@/app/actions/awards";
import { TRANSACTION_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";

type Props = {
  members: Profile[];
};

export function AwardForm({ members }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setSuccess(false);
    setLoading(true);

    const result = await awardBucks(formData);

    setLoading(false);
    submitting.current = false;

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      const form = document.getElementById("award-form") as HTMLFormElement;
      form?.reset();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Award / Deduct Bucks</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="award-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toUserId">Member</Label>
            <Select name="toUserId" required>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="cursor-pointer">
                    {m.display_name}
                    {m.team_number && <span className="text-muted-foreground ml-1">#{m.team_number}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount{" "}
              <span className="text-xs text-muted-foreground">
                (negative to deduct)
              </span>
            </Label>
            <Input
              name="amount"
              type="number"
              required
              placeholder="e.g. 50 or -25"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category" required>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="cursor-pointer">
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              name="reason"
              required
              placeholder="Why are you awarding/deducting?"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-emerald-600">
              Bucks awarded successfully!
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full cursor-pointer">
            {loading ? "Processing..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
