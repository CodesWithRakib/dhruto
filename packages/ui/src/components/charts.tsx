"use client";

import * as React from "react";
import { cn } from "../lib/utils.js";

export interface TrendDatum {
  label: string;
  value: number;
}

interface ChartShellProps {
  title?: string;
  empty: boolean;
  emptyMessage?: string;
  className?: string;
  children: React.ReactNode;
}

function ChartShell({ title, empty, emptyMessage, className, children }: ChartShellProps) {
  return (
    <div className={cn("w-full", className)}>
      {title ? <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p> : null}
      {empty ? (
        <p role="status" className="py-8 text-center text-xs text-muted-foreground">
          {emptyMessage ?? "No data for selected period"}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export interface TrendLineChartProps {
  data: TrendDatum[];
  title?: string;
  className?: string;
  emptyMessage?: string;
  formatValue?: (v: number) => string;
}

/**
 * Accessible SVG trend line (single series). Colors from theme tokens only.
 */
export function TrendLineChart({
  data,
  title,
  className,
  emptyMessage,
  formatValue,
}: TrendLineChartProps) {
  const id = React.useId();
  if (data.length === 0) {
    return (
      <ChartShell title={title} empty emptyMessage={emptyMessage} className={className}>
        <span />
      </ChartShell>
    );
  }
  const W = 560;
  const H = 180;
  const PAD = 28;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - (d.value / max) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1]?.x.toFixed(1)},${(H - PAD).toFixed(1)} L${points[0]?.x.toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const fmt = formatValue ?? ((v: number) => String(Math.round(v)));

  return (
    <ChartShell title={title} empty={false} className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title ?? "Trend chart"}
        className="h-44 w-full"
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD - f * (H - PAD * 2)}
            y2={H - PAD - f * (H - PAD * 2)}
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${id}-fill)`} />
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {points.map((p, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
              <title>{`${p.label}: ${fmt(p.value)}`}</title>
            </g>
          ) : null,
        )}
      </svg>
      <div
        className="mt-1 flex justify-between text-[10px] text-muted-foreground"
        aria-hidden="true"
      >
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </ChartShell>
  );
}

export interface BarDatum {
  label: string;
  value: number;
}

export interface GroupedBarChartProps {
  data: BarDatum[];
  title?: string;
  className?: string;
  emptyMessage?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
}

/** Accessible SVG bar chart. Single semantic tone per chart. */
export function GroupedBarChart({
  data,
  title,
  className,
  emptyMessage,
  tone = "primary",
}: GroupedBarChartProps) {
  if (data.length === 0) {
    return (
      <ChartShell title={title} empty emptyMessage={emptyMessage} className={className}>
        <span />
      </ChartShell>
    );
  }
  const tones: Record<string, string> = {
    primary: "hsl(var(--primary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    danger: "hsl(var(--danger))",
    info: "hsl(var(--info))",
  };
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ChartShell title={title} empty={false} className={className}>
      <ul className="space-y-2" role="list" aria-label={title ?? "Bar chart"}>
        {data.slice(0, 12).map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate text-muted-foreground" title={d.label}>
              {d.label}
            </span>
            <span
              className="h-4 flex-1 overflow-hidden rounded bg-muted"
              role="img"
              aria-label={`${d.label}: ${d.value}`}
            >
              <span
                className="block h-full rounded"
                style={{
                  width: `${Math.max(2, (d.value / max) * 100)}%`,
                  backgroundColor: tones[tone],
                }}
              />
            </span>
            <span className="w-14 shrink-0 text-right font-mono text-foreground">
              {d.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </ChartShell>
  );
}
