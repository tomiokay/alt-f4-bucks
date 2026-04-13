"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Trophy, BarChart3, Menu, ChevronDown, Search, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import type { Profile } from "@/lib/types";

type NavProps = {
  profile: Profile | null;
  balance?: number;
};

const CATEGORY_LINKS = [
  { href: "/", label: "Trending" },
  { href: "/betting", label: "Markets" },
  { href: "/popular", label: "Popular" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard", label: "Portfolio" },
  { href: "/manager", label: "Admin", role: ["manager", "admin"] as string[] },
];

export function Nav({ profile, balance = 0 }: NavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleLinks = CATEGORY_LINKS.filter((link) => {
    if ("role" in link && link.role) return profile && link.role.includes(profile.role);
    return true;
  });

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#0d1117] border-b border-[#21262d]">
      {/* Top bar */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 gap-4">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#22c55e] text-white text-xs font-black">
              F4
            </div>
            <span className="text-[15px] font-semibold text-foreground hidden sm:block">
              Alt-F4 Bucks
            </span>
          </Link>

          {/* Search bar */}
          <div className="relative flex-1 max-w-[320px] hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#484f58]" />
            <input
              placeholder="Search markets..."
              className="w-full h-8 rounded-lg bg-[#161b22] border border-[#21262d] pl-9 pr-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              {/* Balance display */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#161b22] border border-[#21262d] px-3 py-1.5">
                <span className="text-[12px] text-[#7d8590]">AF4</span>
                <span className="text-[13px] font-semibold text-[#e6edf3] tabular-nums font-mono">
                  ${balance.toLocaleString()}
                </span>
              </div>

              {/* Deposit button */}
              <Link
                href="/store"
                className="hidden sm:flex h-8 items-center rounded-lg bg-[#22c55e] px-3 text-[12px] font-semibold text-white hover:bg-[#16a34a] transition-colors"
              >
                Store
              </Link>

              {/* Notifications bell */}
              <button className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#161b22] transition-colors">
                <Bell className="h-4 w-4 text-[#7d8590]" />
              </button>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full bg-[#161b22] px-3 py-1.5 hover:bg-[#1c2128] transition-colors">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-[9px] text-white font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] text-[#e6edf3] max-w-[100px] truncate hidden sm:block">
                      {profile.display_name}
                    </span>
                    <ChevronDown className="h-3 w-3 text-[#7d8590]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-[#161b22] border-[#30363d]"
                >
                  <div className="px-3 py-2 flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-xs text-white font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium text-[#e6edf3] block">
                        {profile.display_name}
                      </span>
                      <span className="text-[11px] text-[#7d8590] font-mono tabular-nums">
                        ${balance.toLocaleString()} AF4
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-[#30363d]" />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard"
                      className="cursor-pointer text-[#e6edf3] focus:bg-[#1c2128] focus:text-[#e6edf3]"
                    >
                      <BarChart3 className="mr-2 h-4 w-4 text-[#7d8590]" />
                      Portfolio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/leaderboard"
                      className="cursor-pointer text-[#e6edf3] focus:bg-[#1c2128] focus:text-[#e6edf3]"
                    >
                      <Trophy className="mr-2 h-4 w-4 text-[#7d8590]" />
                      Leaderboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#30363d]" />
                  <DropdownMenuItem asChild>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="flex w-full items-center text-sm text-[#ef4444]"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden md:flex text-[13px] text-[#7d8590] hover:text-[#e6edf3]"
              >
                <Link href="/login">Log In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="hidden md:flex h-8 bg-[#22c55e] hover:bg-[#16a34a] text-white text-[13px] font-semibold rounded-full px-4"
              >
                <Link href="/login">Sign Up</Link>
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden text-[#7d8590]"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-[#0d1117] border-[#21262d]">
              <nav className="mt-8 flex flex-col gap-1">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      pathname === link.href
                        ? "text-[#e6edf3] bg-[#1c2128]"
                        : "text-[#7d8590] hover:text-[#e6edf3]"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {!profile && (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-4 rounded-full bg-[#22c55e] px-3 py-2 text-center text-sm font-semibold text-white"
                  >
                    Sign Up
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Category tabs row */}
      <div className="mx-auto max-w-7xl overflow-x-auto px-4">
        <div className="flex items-center gap-1 pb-2">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1 text-[13px] transition-colors",
                pathname === link.href
                  ? "text-[#e6edf3] font-medium"
                  : "text-[#7d8590] hover:text-[#e6edf3]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
