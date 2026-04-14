"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL = 120_000; // 2 minutes

export function AutoSync() {
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function sync() {
      try {
        const res = await fetch("/api/sync");
        const data = await res.json();
        // Only refresh if something actually changed
        if (mounted.current && (data.synced > 0 || data.resolved > 0)) {
          router.refresh();
        }
      } catch {
        // Silent fail
      }
    }

    // Don't sync on mount — let the page render fast first
    const id = setInterval(sync, SYNC_INTERVAL);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [router]);

  return null;
}
