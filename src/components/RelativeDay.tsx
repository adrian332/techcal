"use client";

import { relativeDay } from "@/lib/calendar";
import { useToday } from "@/lib/use-today";

/** "in 3 days" measured against the reader's clock, not the build's. */
export function RelativeDay({ date, buildToday }: { date: string; buildToday: string }) {
  return <>{relativeDay(date, useToday(buildToday))}</>;
}
