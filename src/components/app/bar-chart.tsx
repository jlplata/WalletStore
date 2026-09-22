"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

// Minimal dependency-free bar chart for the dashboard's daily activity
// view. Single series (magnitude over time) -> one sequential hue (the
// app's own --primary token, not the org's brand color, so contrast stays
// predictable across every tenant's dashboard). Selective labels only
// (first/last day + max value), a real hover tooltip instead of a native
// title, thin rounded-top bars anchored to the baseline.
export function BarChart({
  data,
  labelKey,
  valueKey,
  valueFormatter,
}: {
  data: Record<string, number | string>[];
  labelKey: string;
  valueKey: string;
  valueFormatter?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin datos en este período.</p>;
  }

  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  const format = valueFormatter ?? ((v: number) => String(v));

  return (
    <div>
      <div className="relative flex h-40 items-end gap-1">
        {data.map((d, i) => {
          const value = Number(d[valueKey]);
          const heightPct = Math.max((value / max) * 100, value > 0 ? 3 : 0);
          return (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            >
              {hovered === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow">
                  {formatDate(String(d[labelKey]))}: {format(value)}
                </div>
              )}
              <div
                className={`w-full rounded-t-sm transition-colors ${
                  hovered === i ? "bg-primary" : "bg-primary/70"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(String(data[0][labelKey]))}</span>
        <span>{formatDate(String(data[data.length - 1][labelKey]))}</span>
      </div>
    </div>
  );
}
