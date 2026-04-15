"use client";

import { useState, useTransition } from "react";
import { setBanStatus } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type Props = {
  members: Profile[];
  currentUserId: string;
};

export function UserManagement({ members, currentUserId }: Props) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.id, m.banned]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = members.filter(
    (m) =>
      m.display_name.toLowerCase().includes(query.toLowerCase()) ||
      (m.team_number && m.team_number.includes(query))
  );

  function toggleBan(member: Profile) {
    const newBanned = !statuses[member.id];
    setPendingId(member.id);
    startTransition(async () => {
      const result = await setBanStatus(member.id, newBanned);
      setPendingId(null);
      if (result.error) {
        setErrors((e) => ({ ...e, [member.id]: result.error! }));
      } else {
        setStatuses((s) => ({ ...s, [member.id]: newBanned }));
        setErrors((e) => { const n = { ...e }; delete n[member.id]; return n; });
      }
    });
  }

  const bannedCount = Object.values(statuses).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#e6edf3]">
            User Management
          </h2>
          <p className="text-[12px] text-[#484f58] mt-0.5">
            {members.length} users · {bannedCount} banned
          </p>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or team number..."
        className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
      />

      <div className="space-y-1.5">
        {filtered.map((member) => {
          const isBanned = statuses[member.id];
          const isLoading = pendingId === member.id && isPending;
          const isSelf = member.id === currentUserId;

          return (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 border",
                isBanned
                  ? "bg-[#ef4444]/5 border-[#ef4444]/20"
                  : "bg-[#161b22] border-[#21262d]"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                    isBanned
                      ? "bg-[#ef4444]/20 text-[#ef4444]"
                      : member.role === "admin"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : member.role === "manager"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-[#21262d] text-[#7d8590]"
                  )}
                >
                  {member.display_name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[13px] font-medium truncate",
                        isBanned ? "text-[#7d8590] line-through" : "text-[#e6edf3]"
                      )}
                    >
                      {member.display_name}
                    </span>
                    {member.role !== "member" && (
                      <span className="text-[10px] text-[#484f58] shrink-0">
                        {member.role}
                      </span>
                    )}
                    {isBanned && (
                      <span className="text-[10px] text-[#ef4444] font-medium shrink-0">
                        BANNED
                      </span>
                    )}
                  </div>
                  {member.team_number && (
                    <span className="text-[11px] text-[#484f58]">
                      Team {member.team_number}
                    </span>
                  )}
                  {errors[member.id] && (
                    <p className="text-[11px] text-[#ef4444]">{errors[member.id]}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => toggleBan(member)}
                disabled={isLoading || isSelf}
                className={cn(
                  "shrink-0 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  isBanned
                    ? "bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 border border-[#22c55e]/30"
                    : "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/30"
                )}
              >
                {isLoading ? "..." : isBanned ? "Unban" : "Ban"}
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-[13px] text-[#484f58] py-6">
            No users found
          </p>
        )}
      </div>
    </div>
  );
}
