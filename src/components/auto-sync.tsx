"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL = 120_000; // 2 minutes

export function AutoSync() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function sync() {
      try {
        await fetch("/api/sync");
        if (active) router.refresh();
      } catch {
        // Silent fail — will retry next interval
      }
    }

    // Initial sync on mount
    sync();

    const id = setInterval(sync, SYNC_INTERVAL);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [router]);

  return null;
}
