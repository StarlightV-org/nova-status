"use client";

import * as React from "react";

import { cn } from "~/lib/utils";

export type UptimeTone = "green" | "yellow" | "orange" | "red";

export function getUptimeTone(percent: number): UptimeTone {
  if (percent >= 100) return "green";
  if (percent >= 70) return "yellow";
  if (percent >= 50) return "orange";
  return "red";
}

const uptimeToneClasses: Record<UptimeTone, string> = {
  green:
    "bg-emerald-500/10 text-emerald-700/90 dark:bg-emerald-500/12 dark:text-emerald-400/85",
  yellow:
    "bg-amber-500/10 text-amber-700/90 dark:bg-amber-500/12 dark:text-amber-400/85",
  orange:
    "bg-orange-500/10 text-orange-700/90 dark:bg-orange-500/12 dark:text-orange-400/85",
  red: "bg-red-500/10 text-red-700/90 dark:bg-red-500/12 dark:text-red-400/85",
};

function formatUptimePercent(percent: number): string {
  if (percent >= 100) return "100%";
  const trimmed = Number(percent.toFixed(3));
  return `${trimmed}%`;
}

function UptimeBadge({
  className,
  percent,
  children,
  ...props
}: React.ComponentProps<"span"> & { percent: number }) {
  const tone = getUptimeTone(percent);

  return (
    <span
      data-slot="uptime-badge"
      data-tone={tone}
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap",
        uptimeToneClasses[tone],
        className,
      )}
      {...props}
    >
      {children ?? formatUptimePercent(percent)}
    </span>
  );
}

export { UptimeBadge, formatUptimePercent, uptimeToneClasses };
