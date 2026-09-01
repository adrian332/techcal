"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CalendarBoard, type CalendarProps } from "./CalendarBoard";
import type { SearchParams } from "@/lib/filters";

/**
 * The board wired to the live query string. Reading the URL forces this subtree
 * to render in the browser, which is why it sits behind a Suspense boundary
 * whose fallback is the same board with no params — the default view is real
 * prerendered HTML, and this takes over from it on hydration.
 */
export function CalendarView(props: Omit<CalendarProps, "params">) {
  const searchParams = useSearchParams();

  // Mirror the shape Next hands a server component: one value stays a string,
  // a repeated key becomes an array. The filter helpers already expect that.
  const params: SearchParams = useMemo(() => {
    const out: SearchParams = {};
    for (const key of new Set(searchParams.keys())) {
      const all = searchParams.getAll(key);
      out[key] = all.length === 1 ? all[0] : all;
    }
    return out;
  }, [searchParams]);

  return <CalendarBoard {...props} params={params} />;
}
