"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HouseholdDonorTrend } from "@/lib/giving/metrics";

type HouseholdDonorChartProps = {
  trend: HouseholdDonorTrend;
};

type ChartRow = {
  label: string;
  month: string;
} & Record<string, number | string>;

export function HouseholdDonorChart({ trend }: HouseholdDonorChartProps) {
  const campusSeries = trend.campusSeries;

  if (campusSeries.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-app-border bg-white p-6 text-[13px] font-semibold text-app-muted">
        No household donor campus data is available for the selected window.
      </div>
    );
  }

  const series = campusSeries.map((campus, index) => ({
    color: campusLineColor(index),
    key: `campus_${campus.campusRockId ?? "unassigned"}`,
    name: campus.campusName,
  }));
  const rows = trend.months.map((month, monthIndex) => {
    const row: ChartRow = {
      label: formatAxisMonthLabel(month.month),
      month: month.month,
    };

    campusSeries.forEach((campus, campusIndex) => {
      row[series[campusIndex].key] =
        campus.months[monthIndex]?.householdDonorCount ?? 0;
    });

    return row;
  });

  return (
    <div className="grid gap-4">
      <div
        aria-label="Stacked line chart of household donors by campus for the last 24 months"
        className="h-[380px] overflow-hidden rounded-[8px] border border-app-border bg-white p-4"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart
            data={rows}
            margin={{ bottom: 16, left: 4, right: 8, top: 12 }}
          >
            <CartesianGrid stroke="oklch(0.94 0.005 70)" vertical />
            <XAxis
              axisLine={false}
              dataKey="month"
              interval={0}
              minTickGap={0}
              tick={{ fill: "oklch(0.58 0.008 60)", fontSize: 11 }}
              tickFormatter={formatAxisMonthLabel}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fill: "oklch(0.58 0.008 60)", fontSize: 11 }}
              tickFormatter={formatNumber}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<ChartTooltip />} />
            {series.map((campus) => (
              <Area
                activeDot={false}
                dataKey={campus.key}
                dot={false}
                fill={campus.color}
                fillOpacity={0.16}
                key={campus.key}
                name={campus.name}
                stackId="households"
                stroke={campus.color}
                strokeWidth={3}
                type="monotone"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {campusSeries.map((campus, index) => {
          const latest = campus.months.at(-1)?.householdDonorCount ?? 0;

          return (
            <div
              className="flex min-w-0 items-center justify-between gap-3 rounded-[6px] border border-app-border bg-white px-3 py-2"
              key={campus.campusRockId ?? "unassigned"}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: campusLineColor(index) }}
                />
                <span className="truncate text-[13px] font-semibold text-app-foreground">
                  {campus.campusName}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[11px]">
                <div className="text-right">
                  <p className="text-app-faint">Latest</p>
                  <p className="font-semibold leading-4 tabular-nums text-app-foreground">
                    {formatNumber(latest)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-app-faint">At risk</p>
                  <p className="font-semibold leading-4 tabular-nums text-app-foreground">
                    {formatNumber(campus.atRiskHouseholdDonors)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number | string;
  }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[6px] border border-app-border bg-white px-3 py-2 text-[12px] shadow-[0_8px_24px_oklch(0.25_0.01_60_/_0.12)]">
      <p className="mb-2 font-semibold text-app-foreground">
        {formatMonthLabel(String(label))}
      </p>
      <div className="grid gap-1">
        {payload
          .slice()
          .reverse()
          .map((entry) => (
            <div className="flex items-center gap-2" key={entry.name}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="min-w-[120px] text-app-muted">{entry.name}</span>
              <span className="font-semibold tabular-nums text-app-foreground">
                {formatNumber(Number(entry.value ?? 0))}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatAxisMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));

  if (month === 1) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function campusLineColor(index: number) {
  return [
    "#2563eb",
    "#059669",
    "#d97706",
    "#be123c",
    "#0f766e",
    "#6d28d9",
    "#475569",
    "#c2410c",
  ][index % 8];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
