"use client";

import { useSyncExternalStore } from "react";
import { localDayISO } from "./calendar";

/**
 * Today in the reader's timezone. The page is prerendered, so the build's date
 * is only the server snapshot — the browser's answer replaces it on hydration,
 * and again when a page left open overnight crosses midnight.
 */
function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

export function useToday(buildToday: string): string {
  return useSyncExternalStore(subscribe, localDayISO, () => buildToday);
}
