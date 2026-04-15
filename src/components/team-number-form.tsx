"use client";

import { useState, useRef } from "react";
import { adminSetTeamNumber } from "@/app/actions/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types";

type Props = {
  members: Profile[];
};

export function TeamNumberForm({ members }: Props) {
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

    const result = await adminSetTeamNumber(formData);
    setLoading(false);
    submitting.current = false;

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      const form = document.getElementById("team-form") as HTMLFormElement;
      form?.reset();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Set Team Number</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="team-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Member</Label>
            <Select name="userId" required>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="cursor-pointer">
                    {m.display_name}
                    {m.team_number && (
                      <span className="text-muted-foreground ml-1">({m.team_number})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team Number</Label>
            <Input
              name="teamNumber"
              required
              placeholder="e.g. 7558"
              maxLength={10}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">Team number updated!</p>}

          <Button type="submit" disabled={loading} className="w-full cursor-pointer">
            {loading ? "Saving..." : "Set Team Number"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
