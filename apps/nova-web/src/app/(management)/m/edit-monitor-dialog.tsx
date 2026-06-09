"use client";

import type { MonitorType } from "@novastatus/lib/monitorTypes.ts";

import { useMonitorLayout } from "~/provider/monitor-state";
import { MonitorFormDialog, type MonitorFormMonitor } from "./monitor-form-dialog";

type EditMonitorDialogProps = {
	monitorId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	monitor?: MonitorFormMonitor;
};

export function EditMonitorDialog({ monitorId, open, onOpenChange, monitor: monitorProp }: EditMonitorDialogProps) {
	const { groups, state } = useMonitorLayout();
	const entry = state[monitorId];

	if (!entry && !monitorProp) return null;

	const monitor: MonitorFormMonitor = monitorProp ?? {
		id: monitorId,
		label: entry!.label,
		type: entry!.type as MonitorType,
		interval: entry!.interval,
		groupId: entry!.groupId ?? null,
		data: entry!.data as Record<string, unknown>,
	};

	return (
		<MonitorFormDialog mode="edit" groups={groups} monitor={monitor} open={open} onOpenChange={onOpenChange} />
	);
}
