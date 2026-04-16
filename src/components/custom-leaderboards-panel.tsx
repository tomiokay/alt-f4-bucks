"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, Users, Trash2, UserPlus, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import {
  createCustomLeaderboard,
  inviteToLeaderboard,
  leaveLeaderboard,
  deleteLeaderboard,
} from "@/app/actions/custom-leaderboards";
import type { CustomLeaderboard, LeaderboardEntry, Profile } from "@/lib/types";

type BoardWithCount = CustomLeaderboard & { member_count: number };

type Props = {
  boards: BoardWithCount[];
  allProfiles: Profile[];
  userId: string;
  globalEntries: LeaderboardEntry[];
};

export function CustomLeaderboardsPanel({ boards, allProfiles, userId, globalEntries }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteBoard, setInviteBoard] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newName.trim());
      const res = await createCustomLeaderboard(fd);
      if (res.error) setError(res.error);
      else {
        setNewName("");
        setShowCreate(false);
        router.refresh();
      }
    });
  }

  function handleInvite(leaderboardId: string, targetUserId: string) {
    setInviteMsg(null);
    startTransition(async () => {
      const res = await inviteToLeaderboard(leaderboardId, targetUserId);
      if (res.error) setInviteMsg(res.error);
      else {
        setInviteMsg("Invite sent!");
        setInviteQuery("");
      }
    });
  }

  function handleLeave(leaderboardId: string) {
    startTransition(async () => {
      await leaveLeaderboard(leaderboardId);
      router.refresh();
    });
  }

  function handleDelete(leaderboardId: string) {
    if (!confirm("Delete this leaderboard? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteLeaderboard(leaderboardId);
      router.refresh();
    });
  }

  const inviteResults = inviteQuery.length >= 2
    ? allProfiles.filter(
        (p) =>
          p.id !== userId &&
          (p.display_name.toLowerCase().includes(inviteQuery.toLowerCase()) ||
            (p.team_number && p.team_number.includes(inviteQuery)))
      ).slice(0, 5)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[#e6edf3]">My Leaderboards</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-[#21262d] px-3 py-1.5 text-[12px] text-[#e6edf3] hover:bg-[#30363d] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-4 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Leaderboard name (e.g. Team 7558)"
            autoFocus
            className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
          />
          {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
              className="rounded-lg bg-[#22c55e] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              {isPending ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(""); setError(null); }}
              className="rounded-lg bg-[#21262d] px-4 py-1.5 text-[12px] text-[#7d8590] hover:bg-[#30363d] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {boards.length === 0 && !showCreate ? (
        <div className="rounded-xl bg-[#161b22] border border-[#21262d] px-4 py-8 text-center">
          <Users className="h-8 w-8 text-[#484f58] mx-auto mb-2" />
          <p className="text-[13px] text-[#484f58]">No custom leaderboards yet</p>
          <p className="text-[11px] text-[#484f58] mt-1">Create one and invite your team</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => {
            const isExpanded = expandedId === board.id;
            const isCreator = board.created_by === userId;
            const isInviting = inviteBoard === board.id;

            // Filter global entries to just members of this board
            // (We don't have member list client-side, so show what we can)
            const boardEntries = globalEntries;

            return (
              <div
                key={board.id}
                className="rounded-xl bg-[#161b22] border border-[#21262d] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : board.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1c2128] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[11px] font-bold">
                      {board.name[0]?.toUpperCase()}
                    </div>
                    <div className="text-left">
                      <span className="text-[13px] font-medium text-[#e6edf3] block">
                        {board.name}
                      </span>
                      <span className="text-[11px] text-[#484f58]">
                        {board.member_count} member{board.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[#484f58]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#484f58]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[#21262d] px-4 py-3 space-y-3">
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setInviteBoard(isInviting ? null : board.id); setInviteQuery(""); setInviteMsg(null); }}
                        className="flex items-center gap-1.5 rounded-md bg-[#21262d] px-3 py-1.5 text-[11px] text-[#e6edf3] hover:bg-[#30363d] transition-colors"
                      >
                        <UserPlus className="h-3 w-3" />
                        Invite
                      </button>
                      {isCreator ? (
                        <button
                          onClick={() => handleDelete(board.id)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-md bg-[#ef4444]/10 px-3 py-1.5 text-[11px] text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLeave(board.id)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-md bg-[#21262d] px-3 py-1.5 text-[11px] text-[#7d8590] hover:bg-[#30363d] transition-colors"
                        >
                          <LogOut className="h-3 w-3" />
                          Leave
                        </button>
                      )}
                    </div>

                    {/* Invite UI */}
                    {isInviting && (
                      <div className="space-y-2">
                        <input
                          value={inviteQuery}
                          onChange={(e) => { setInviteQuery(e.target.value); setInviteMsg(null); }}
                          placeholder="Search by name or team number..."
                          autoFocus
                          className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
                        />
                        {inviteMsg && (
                          <p className={cn("text-[11px]", inviteMsg.startsWith("Invite") ? "text-[#22c55e]" : "text-[#ef4444]")}>
                            {inviteMsg}
                          </p>
                        )}
                        {inviteResults.length > 0 && (
                          <div className="space-y-1">
                            {inviteResults.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => handleInvite(board.id, p.id)}
                                disabled={isPending}
                                className="w-full flex items-center justify-between rounded-md bg-[#0d1117] px-3 py-2 hover:bg-[#1c2128] transition-colors"
                              >
                                <span className="text-[12px] text-[#e6edf3]">
                                  {p.display_name}
                                  {p.team_number && (
                                    <span className="text-[#484f58] ml-1">#{p.team_number}</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-[#388bfd]">Invite</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mini leaderboard preview */}
                    <p className="text-[11px] text-[#484f58]">
                      View the full board on the leaderboard page after members join.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
