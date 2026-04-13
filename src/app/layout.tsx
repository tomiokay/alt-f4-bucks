import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/nav";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();
  const balance = profile ? await getUserBalance(profile.id) : 0;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Nav profile={profile} balance={balance} />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
