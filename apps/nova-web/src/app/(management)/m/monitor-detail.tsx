"use client";

import type { MonitorStatusDB } from "@novastatus/db/schema";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { StatusTimeline } from "~/components/status-timeline";
import { Card, CardContent } from "~/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "~/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { formatUptimePercent } from "~/components/ui/uptime-badge";
import { cn } from "~/lib/utils";
import { useMonitorState } from "~/provider/monitor-state";
import { api, type RouterOutputs } from "~/trpc/react";

type MonitorDetailData = RouterOutputs["monitor"]["getById"];

const STATUS_LABEL: Record<MonitorStatusDB["status"], string> = {
	up: "Online",
	down: "Offline",
	pending: "Pending",
	maintenance: "Maintenance",
};

const STATUS_BADGE: Record<MonitorStatusDB["status"], string> = {
	up: "bg-emerald-500/10 text-emerald-700/90 dark:bg-emerald-500/12 dark:text-emerald-400/85",
	down: "bg-red-500/10 text-red-700/90 dark:bg-red-500/12 dark:text-red-400/85",
	pending: "bg-orange-500/10 text-orange-700/90 dark:bg-orange-500/12 dark:text-orange-400/85",
	maintenance: "bg-blue-500/10 text-blue-700/90 dark:bg-blue-500/12 dark:text-blue-400/85",
};

const CHART_RANGES = {
	"1h": 60 * 60 * 1000,
	"6h": 6 * 60 * 60 * 1000,
	"24h": 24 * 60 * 60 * 1000,
} as const;

type ChartRange = keyof typeof CHART_RANGES;

const chartConfig = {
	responseTime: {
		label: "Avg ping",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

function mergeStatusHistory(history: MonitorStatusDB[], live: MonitorStatusDB[]): MonitorStatusDB[] {
	const seen = new Set<string>();
	const merged: MonitorStatusDB[] = [];

	for (const entry of [...live, ...history]) {
		if (seen.has(entry.id)) continue;
		seen.add(entry.id);
		merged.push(entry);
	}

	return merged.sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
}

function formatCheckInterval(seconds: number) {
	if (seconds < 60) return `Checked every ${seconds} seconds`;
	const minutes = seconds / 60;
	if (Number.isInteger(minutes)) {
		return `Checked every ${seconds} seconds (${minutes} minute${minutes === 1 ? "" : "s"})`;
	}
	return `Checked every ${seconds} seconds`;
}

function formatChartTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

function avgResponseTime(states: MonitorStatusDB[], sinceMs: number) {
	const since = Date.now() - sinceMs;
	const samples = states.filter(
		(state) => new Date(state.checkedAt).getTime() >= since && state.responseTime != null,
	);
	if (samples.length === 0) return null;
	const total = samples.reduce((sum, state) => sum + state.responseTime!, 0);
	return total / samples.length;
}

function formatMs(value: number | null | undefined) {
	if (value == null) return "—";
	if (value < 1) return `${value.toFixed(2)}ms`;
	if (value < 100) return `${value.toFixed(1)}ms`;
	return `${Math.round(value)}ms`;
}

function MetricStat({
	label,
	detail,
	value,
	className,
}: {
	label: string;
	detail?: string;
	value: string;
	className?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
			<span className="text-xs text-muted-foreground">
				{label}
				{detail ? ` (${detail})` : ""}
			</span>
			<span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
		</div>
	);
}

export function MonitorDetail({
	monitorId,
	initialData,
}: {
	monitorId: string;
	initialData: MonitorDetailData;
}) {
	const liveEntry = useMonitorState()[monitorId];
	const { data } = api.monitor.getById.useQuery({ id: monitorId }, { initialData });

	const [chartRange, setChartRange] = useState<ChartRange>("6h");

	const monitor = data ?? initialData;
	const states = useMemo(
		() => mergeStatusHistory(monitor.status, liveEntry?.states ?? []),
		[monitor.status, liveEntry?.states],
	);

	const current = states[0];
	const status = current?.status ?? "pending";
	const uptime = liveEntry?.uptime ?? monitor.uptime;
	const interval = liveEntry?.interval ?? monitor.interval;

	const avg24h = useMemo(() => avgResponseTime(states, CHART_RANGES["24h"]), [states]);

	const chartData = useMemo(() => {
		const since = Date.now() - CHART_RANGES[chartRange];
		return [...states]
			.filter((state) => new Date(state.checkedAt).getTime() >= since && state.responseTime != null)
			.reverse()
			.map((state) => ({
				time: new Date(state.checkedAt).toISOString(),
				responseTime: state.responseTime!,
			}));
	}, [states, chartRange]);

	const yMax = useMemo(() => {
		const peak = chartData.reduce((max, point) => Math.max(max, point.responseTime), 0);
		if (peak <= 200) return 200;
		return Math.ceil(peak / 200) * 200;
	}, [chartData]);

	return (
		<div className="flex flex-col gap-6 p-4">
			<div>
				<h1 className="mb-4 text-lg font-semibold">{monitor.label}</h1>

				<Card className="py-4">
					<CardContent className="flex flex-col gap-3">
						<div className="flex items-start gap-4">
							<div className="min-w-0 flex-1">
								<div className="mb-1 flex justify-between text-xs text-muted-foreground">
									<span>1h</span>
									<span>now</span>
								</div>
								<StatusTimeline states={states} className="w-full" />
								<p className="mt-2 text-xs text-muted-foreground">{formatCheckInterval(interval)}</p>
							</div>
							<span
								className={cn(
									"shrink-0 rounded-full px-5 py-2 text-sm font-semibold",
									STATUS_BADGE[status],
								)}
							>
								{STATUS_LABEL[status]}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
				<MetricStat label="Response" detail="current" value={formatMs(current?.responseTime)} />
				<MetricStat label="Avg response" detail="24h" value={formatMs(avg24h)} />
				<MetricStat label="Uptime" detail="24h" value={formatUptimePercent(uptime.last1day)} />
				<MetricStat label="Uptime" detail="7d" value={formatUptimePercent(uptime.last7days)} />
				<MetricStat label="Uptime" detail="all time" value={formatUptimePercent(uptime.total)} />
				<MetricStat label="Check interval" value={`${interval}s`} />
			</div>

			<Card className="py-4">
				<CardContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2 text-sm">
							<span
								className="size-2.5 shrink-0 rounded-sm"
								style={{ backgroundColor: "var(--color-responseTime)" }}
							/>
							<span className="text-muted-foreground">{chartConfig.responseTime.label}</span>
						</div>
						<Select value={chartRange} onValueChange={(value) => setChartRange(value as ChartRange)}>
							<SelectTrigger size="sm" className="min-w-24">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="end">
								<SelectItem value="1h">Last hour</SelectItem>
								<SelectItem value="6h">Last 6 hours</SelectItem>
								<SelectItem value="24h">Last 24 hours</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
						<AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id={`fillResponseTime-${monitorId}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="var(--color-responseTime)" stopOpacity={0.35} />
									<stop offset="100%" stopColor="var(--color-responseTime)" stopOpacity={0.02} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="time"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
								tickFormatter={formatChartTime}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								width={48}
								domain={[0, yMax]}
								tickFormatter={(value) => `${value}`}
								label={{
									value: "Response (ms)",
									angle: -90,
									position: "insideLeft",
									offset: 4,
									className: "fill-muted-foreground text-xs",
								}}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(value) =>
											new Intl.DateTimeFormat(undefined, {
												month: "short",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
											}).format(new Date(String(value)))
										}
										formatter={(value) => [`${value}ms`, chartConfig.responseTime.label]}
									/>
								}
							/>
							<Area
								type="monotone"
								dataKey="responseTime"
								stroke="var(--color-responseTime)"
								fill={`url(#fillResponseTime-${monitorId})`}
								strokeWidth={2}
								isAnimationActive={false}
							/>
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
