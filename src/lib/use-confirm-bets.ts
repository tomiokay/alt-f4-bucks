"use client";

import { useState, useEffect } from "react";

const KEY = "af4-confirm-bets";

export function useConfirmBets(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) setEnabled(stored === "true");
  }, []);

  function setConfirmBets(v: boolean) {
    setEnabled(v);
    localStorage.setItem(KEY, String(v));
  }

  return [enabled, setConfirmBets];
}

/** Check if confirm is enabled (for use outside React) */
export function isConfirmEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(KEY);
  return stored !== "false";
}
