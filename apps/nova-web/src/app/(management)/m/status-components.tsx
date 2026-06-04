"use client";
import { Card } from "~/components/ui/card";
import { StatusTimeline } from "~/components/status-timeline";
import { UptimeBadge } from "~/components/ui/uptime-badge";
import { useMonitorState } from "~/provider/monitor-state";

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
	const monitorState = useMonitorState();
	const data = monitorState[monitorId];
	if (!data) return null;

	return (
		<Card className="p-4">
			<div className="flex flex-row justify-between gap-3">
				<div className="flex flex-row items-center gap-2">
					<UptimeBadge percent={data.uptime.total} />
					<p>{data.label}</p>
				</div>
				<StatusTimeline states={data.states} timelineId={monitorId} className="self-end!" />
			</div>
		</Card>
	);
}
