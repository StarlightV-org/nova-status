"use client";
import Link from "next/link";
import type { MonitorStatusDB } from "@novastatus/db/schema";
import type { MessageKey } from "@novastatus/lib/i18n/index.ts";

import { Card } from "~/components/ui/card";
import { StatusTimeline } from "~/components/status-timeline";
import { UptimeBadge } from "~/components/ui/uptime-badge";
import { cn } from "~/lib/utils";
import { useT } from "~/provider/locale-provider";
import { useMonitorState } from "~/provider/monitor-state";

const STATUS_LABEL_KEYS: Record<MonitorStatusDB["status"], MessageKey> = {
	up: "status.up",
	down: "status.down",
	pending: "status.pending",
	maintenance: "status.maintenance",
};

const STATUS_DOT: Record<MonitorStatusDB["status"], string> = {
	up: "bg-emerald-500",
	down: "bg-red-500",
	pending: "bg-orange-500",
	maintenance: "bg-blue-500",
};

export function StatusComponent() {
	const monitorState = useMonitorState();

	return (
		<div>
			<div className="whitespace-break-spaces">{JSON.stringify(monitorState, null, 2)}</div>
			{Object.values(monitorState).map((entry) => (
				<div key={entry.label}>
					<h2>{entry.label}</h2>
					<p>{entry.states?.[0]?.status}</p>
				</div>
			))}
		</div>
	);
}

export function MonitorCard({ monitorId }: { monitorId: string }) {
	const t = useT();
	const monitorState = useMonitorState();
	const data = monitorState[monitorId];
	if (!data) return null;

	const current = data.states?.[0];
	const status = current?.status ?? "pending";
	const responseTime = current?.responseTime;

	return (
		<Link href={`/m/${monitorId}`} className="block">
			<Card size="sm" className="gap-1 px-2 py-1.5 data-[size=sm]:gap-1 data-[size=sm]:py-1.5 transition-colors hover:bg-muted/50">
				<div className="flex flex-row items-center justify-between gap-1.5">
					<div className="flex min-w-0 flex-row items-center gap-1.5">
						<span
							className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])}
							aria-label={t(STATUS_LABEL_KEYS[status])}
						/>
						<p className="truncate font-medium">{data.label}</p>
					</div>
					<div className="flex shrink-0 flex-row items-center gap-1.5">
						<span className="text-xs text-muted-foreground tabular-nums">
							{responseTime != null ? `${responseTime}ms` : "—"}
						</span>
						<UptimeBadge percent={data.uptime.total} />
					</div>
				</div>
				<StatusTimeline states={data.states} limit={40} className="w-full" />
			</Card>
		</Link>
	);
}
