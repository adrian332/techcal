"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type State = "idle" | "working" | "failed";

export function SyncButton() {
  const [state, setState] = useState<State>("idle");
  const router = useRouter();

  async function sync() {
    setState("working");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      setState("idle");
      router.refresh();
    } catch {
      setState("failed");
    }
  }

  return (
    <button className="btn" onClick={sync} disabled={state === "working"} title="Pull the routine's latest data">
      {state === "working" ? "Syncing…" : state === "failed" ? "Sync failed — retry" : "Sync now"}
    </button>
  );
}
