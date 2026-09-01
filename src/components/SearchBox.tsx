"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { withParam, type SearchParams } from "@/lib/filters";

/**
 * Search lives in the URL; this only debounces typing into it. `syncedTo`
 * tracks what the URL last said, so an external change (back button, a filter
 * link) is adopted without clobbering what is being typed right now.
 *
 * The current params come in as a prop rather than from `useSearchParams` so
 * this can be prerendered — see the Suspense boundary in app/page.tsx.
 */
export function SearchBox({ initial, params }: { initial: string; params: SearchParams }) {
  const [value, setValue] = useState(initial);
  const [syncedTo, setSyncedTo] = useState(initial);
  const router = useRouter();

  if (initial !== syncedTo && initial !== value) {
    setSyncedTo(initial);
    setValue(initial);
  }

  useEffect(() => {
    if (value.trim() === syncedTo.trim()) return;

    const id = setTimeout(() => {
      setSyncedTo(value);
      // Narrowing the search closes the day panel — it may no longer match.
      const href = withParam({ ...params, day: undefined }, "q", value.trim() || null);
      router.replace(href, { scroll: false });
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
