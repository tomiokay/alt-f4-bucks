import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/nav";
import { getCurrentProfile } from "@/db/profiles";
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
  title: "Alt-F4 Bucks | FRC Team 7558",
  description:
    "The reward system for FRC Team 7558. Earn bucks, climb the leaderboard, and spend in the store.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Nav profile={profile} />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
