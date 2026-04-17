import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/nav";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getUserNotifications, getUnreadCount } from "@/db/notifications";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alt-F4 Bucks",
  description: "FRC Team 7558 prediction market.",
};

async function NavWithData({ profile }: { profile: import("@/lib/types").Profile | null }) {
  const [balance, notifications, unreadCount] = await Promise.all([
    profile ? getUserBalance(profile.id) : Promise.resolve(0),
    profile ? getUserNotifications(profile.id, 15) : Promise.resolve([]),
    profile ? getUnreadCount(profile.id) : Promise.resolve(0),
  ]);

  return (
    <Nav
      profile={profile}
      balance={balance}
      notifications={notifications}
      unreadCount={unreadCount}
    />
  );
}

async function ensureWelcomeBonusIfNeeded(userId: string) {
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const service = await createServiceClient();
    const { data: existing } = await service
      .from("transactions")
      .select("id")
      .eq("to_user_id", userId)
      .eq("category", "bonus")
      .limit(1);

    if (existing && existing.length > 0) return;

    await service.from("transactions").insert({
      type: "award",
      amount: 10000,
      to_user_id: userId,
      reason: "Welcome bonus — 10,000 AF4 to get started",
      category: "bonus",
    });

    await service.from("notifications").insert({
      user_id: userId,
      type: "welcome",
      message: "Welcome to Alt-F4 Bucks! You've been given $10,000 AF4 to start trading.",
      meta: {},
    });
  } catch {
    // Non-critical
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  // Ensure welcome bonus for verified users who logged in via email link
  if (profile) {
    await ensureWelcomeBonusIfNeeded(profile.id);
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Suspense fallback={<Nav profile={profile} />}>
          <NavWithData profile={profile} />
        </Suspense>
        <main className="mx-auto max-w-7xl px-4 py-6">
          {profile?.banned ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e6edf3]">Account Suspended</h1>
                <p className="text-[14px] text-[#7d8590] mt-2 max-w-sm">
                  Your account has been suspended. Contact a team manager if you think this is a mistake.
                </p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#21262d] text-[#e6edf3] text-[13px] hover:bg-[#30363d] transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            children
          )}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
