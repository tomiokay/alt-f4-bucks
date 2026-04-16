"use client";

import { useState, useTransition } from "react";
import { setBanStatus, adminRenameUser } from "@/app/actions/settings";
import { resetUser } from "@/app/actions/dev";
import { cn } from "@/lib/utils";
import { Pencil, X, Check, RotateCcw } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, m.display_name]))
  );

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

  function startRename(member: Profile) {
    setEditingId(member.id);
    setEditName(names[member.id] || member.display_name);
  }

  function cancelRename() {
    setEditingId(null);
    setEditName("");
  }

  function submitRename(memberId: string) {
    setPendingId(memberId);
    startTransition(async () => {
      const result = await adminRenameUser(memberId, editName);
      setPendingId(null);
      if (result.error) {
        setErrors((e) => ({ ...e, [memberId]: result.error! }));
      } else {
        setNames((n) => ({ ...n, [memberId]: editName.trim() }));
        setErrors((e) => { const n = { ...e }; delete n[memberId]; return n; });
      }
      setEditingId(null);
      setEditName("");
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
                  {editingId === member.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(member.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        autoFocus
                        className="h-6 w-[140px] rounded bg-[#0d1117] border border-[#388bfd] px-2 text-[12px] text-[#e6edf3] focus:outline-none"
                      />
                      <button onClick={() => submitRename(member.id)} className="text-[#22c55e] hover:text-[#16a34a]">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={cancelRename} className="text-[#7d8590] hover:text-[#e6edf3]">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[13px] font-medium truncate",
                        isBanned ? "text-[#7d8590] line-through" : "text-[#e6edf3]"
                      )}
                    >
                      {names[member.id] || member.display_name}
                    </span>
                    {!isSelf && (
                      <button onClick={() => startRename(member)} className="text-[#484f58] hover:text-[#7d8590]">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
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
                  )}
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

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                    onClick={() => {
                      if (!confirm(`Reset ${names[member.id] || member.display_name}'s account? This deletes all their bets and resets to $10,000.`)) return;
                      startTransition(async () => {
                        await resetUser(member.id);
                      });
                    }}
                    disabled={isLoading}
                    className="h-7 px-2 rounded-md text-[11px] font-semibold bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 border border-[#f59e0b]/30 transition-colors disabled:opacity-40"
                    title="Reset account"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
              <button
                onClick={() => toggleBan(member)}
                disabled={isLoading || isSelf}
                className={cn(
                  "h-7 px-3 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  isBanned
                    ? "bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 border border-[#22c55e]/30"
                    : "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/30"
                )}
              >
                {isLoading ? "..." : isBanned ? "Unban" : "Ban"}
              </button>
              </div>
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
