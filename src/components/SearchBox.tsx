"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Search lives in the URL; this only debounces typing into it. `syncedTo`
 * tracks what the URL last said, so an external change (back button, a filter
 * link) is adopted without clobbering what is being typed right now.
 */
export function SearchBox({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [syncedTo, setSyncedTo] = useState(initial);
  const router = useRouter();
  const params = useSearchParams();

  if (initial !== syncedTo && initial !== value) {
    setSyncedTo(initial);
    setValue(initial);
  }

  useEffect(() => {
    if (value.trim() === syncedTo.trim()) return;

    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("day");

      setSyncedTo(value);
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }, 250);

    return () => clearTimeout(id);
  }, [value, syncedTo, params, router]);

  return (
    <label className="search">
      <span className="eyebrow" aria-hidden="true">
        /
      </span>
      <input
        type="search"
        value={value}
        placeholder="Search titles, orgs, summaries"
        aria-label="Search entries"
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}
