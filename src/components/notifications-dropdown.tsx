"use client";

import { useState } from "react";
import { Bell, Trophy, MessageSquare, Gift, AlertTriangle, Check } from "lucide-react";
import { markAllRead } from "@/app/actions/notifications";
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
};

const COLORS: Record<string, string> = {
  bet_won: "text-[#22c55e]",
  bet_lost: "text-[#ef4444]",
  bet_refund: "text-[#f59e0b]",
  comment_reply: "text-[#3b82f6]",
  welcome: "text-[#22c55e]",
};

type GroupedNotification = {
  matchKey: string;
  type: string;
  count: number;
  totalAmount: number;
  message: string;
  read: boolean;
  created_at: string;
};

function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();

  for (const n of notifications) {
    const matchKey = (n.meta as Record<string, string>)?.match_key ?? "";
    const groupKey = `${matchKey}:${n.type}`;

    // Parse amount from message like "your $100 bet"
    const amountMatch = n.message.match(/\$(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.count++;
      existing.totalAmount += amount;
      if (!n.read) existing.read = false;
      if (n.created_at > existing.created_at) existing.created_at = n.created_at;
    } else {
      groups.set(groupKey, {
        matchKey,
        type: n.type,
        count: 1,
        totalAmount: amount,
        message: n.message,
        read: n.read,
        created_at: n.created_at,
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function NotificationsDropdown({ notifications, unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const grouped = groupNotifications(notifications);

  async function handleMarkAll() {
    await markAllRead();
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
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
          <div className="absolute right-0 top-10 z-50 w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl overflow-hidden">
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

                  // Build grouped message
                  let message = g.message;
                  if (g.count > 1) {
                    if (g.type === "bet_won") {
                      message = `You won ${g.count} bets totaling $${g.totalAmount} on ${g.matchKey}!`;
                    } else if (g.type === "bet_lost") {
                      message = `You lost ${g.count} bets totaling $${g.totalAmount} on ${g.matchKey}.`;
                    } else if (g.type === "bet_refund") {
                      message = `${g.count} bets totaling $${g.totalAmount} were refunded on ${g.matchKey}.`;
                    }
                  }

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
