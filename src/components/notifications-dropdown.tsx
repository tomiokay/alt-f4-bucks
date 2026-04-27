"use client";

import { useState, useTransition } from "react";
import { Bell, Trophy, MessageSquare, Gift, AlertTriangle, Check, Users } from "lucide-react";
import { markAllRead } from "@/app/actions/notifications";
import { joinLeaderboard } from "@/app/actions/custom-leaderboards";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/types";

type Props = {
  notifications: Notification[];
  unreadCount: number;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const ICONS: Record<string, typeof Trophy> = {
  bet_won: Trophy,
  bet_lost: AlertTriangle,
  bet_refund: Gift,
  comment_reply: MessageSquare,
  welcome: Gift,
  leaderboard_invite: Users,
};

const COLORS: Record<string, string> = {
  bet_won: "text-[#22c55e]",
  bet_lost: "text-[#ef4444]",
  bet_refund: "text-[#f59e0b]",
  comment_reply: "text-[#3b82f6]",
  welcome: "text-[#22c55e]",
  leaderboard_invite: "text-[#a855f7]",
};

type GroupedNotification = {
  matchKey: string;
  type: string;
  count: number;
  totalAmount: number;
  message: string;
  read: boolean;
  created_at: string;
  meta?: Record<string, unknown>;
};

function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  // No grouping — show each notification individually
  return notifications.map((n) => ({
    matchKey: (n.meta as Record<string, string>)?.match_key ?? "",
    type: n.type,
    count: 1,
    totalAmount: 0,
    message: n.message,
    read: n.read,
    created_at: n.created_at,
    meta: n.meta,
  }));
}

export function NotificationsDropdown({ notifications, unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [joinedBoards, setJoinedBoards] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const grouped = groupNotifications(notifications);

  async function handleMarkAll() {
    await markAllRead();
    router.refresh();
  }

  function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      // Auto mark as read when opening
      markAllRead().then(() => router.refresh());
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#161b22] transition-colors"
      >
        <Bell className="h-4 w-4 text-[#7d8590]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-[#ef4444] flex items-center justify-center text-[9px] font-bold text-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-2 top-14 z-50 w-[calc(100vw-1rem)] sm:absolute sm:right-0 sm:top-10 sm:w-[360px] max-w-[360px] rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
              <h3 className="text-[14px] font-semibold text-[#e6edf3]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[11px] text-[#388bfd] hover:text-[#58a6ff] transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Bell className="h-8 w-8 text-[#21262d] mb-2" />
                  <p className="text-[13px] text-[#484f58]">No notifications yet</p>
                </div>
              ) : (
                grouped.map((g, i) => {
                  const Icon = ICONS[g.type] ?? Bell;
                  const color = COLORS[g.type] ?? "text-[#7d8590]";

                  const message = g.message;

                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors ${
                        !g.read ? "bg-[#0d1117]" : ""
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#e6edf3] leading-snug">{message}</p>
                        {g.type === "leaderboard_invite" && typeof g.meta?.leaderboard_id === "string" && (
                          <button
                            onClick={() => {
                              const boardId = g.meta!.leaderboard_id as string;
                              startTransition(async () => {
                                const res = await joinLeaderboard(boardId);
                                if (!res.error) {
                                  setJoinedBoards((s) => new Set([...s, boardId]));
                                  router.refresh();
                                }
                              });
                            }}
                            disabled={isPending || joinedBoards.has(g.meta.leaderboard_id as string)}
                            className="mt-1.5 rounded-md bg-[#a855f7]/10 px-3 py-1 text-[11px] font-semibold text-[#a855f7] hover:bg-[#a855f7]/20 disabled:opacity-50 transition-colors"
                          >
                            {joinedBoards.has(g.meta.leaderboard_id as string) ? "Joined!" : "Join Leaderboard"}
                          </button>
                        )}
                        <p className="text-[11px] text-[#484f58] mt-0.5">{timeAgo(g.created_at)}</p>
                      </div>
                      {!g.read && (
                        <span className="h-2 w-2 rounded-full bg-[#388bfd] shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
