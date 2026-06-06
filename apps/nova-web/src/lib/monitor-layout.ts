import type { MonitorStateEntry } from "@novastatus/lib/monitorTypes.ts";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "~/server/api/root";

export type MonitorState = {
	[key: string]: MonitorStateEntry;
};

export type SidebarMonitor = {
	id: string;
	label: string;
	type: string;
	groupId: string | null;
};

export type SidebarGroup = {
	id: string;
	label: string;
};

type MonitorGetResult = inferRouterOutputs<AppRouter>["monitor"]["get"];

export function buildMonitorLayoutFromGet(monitors: MonitorGetResult): {
	state: MonitorState;
	groups: SidebarGroup[];
	sidebarMonitors: SidebarMonitor[];
} {
	const state = monitors.reduce<MonitorState>((acc, monitor) => {
		acc[monitor.id] = {
			label: monitor.label,
			type: monitor.type,
			data: monitor.data,
			interval: monitor.interval,
			states: monitor.status,
			uptime: monitor.uptime,
			groupId: monitor.groupId,
		} as MonitorStateEntry;
		return acc;
	}, {});

	const groups = monitors
		.filter((monitor) => monitor.type === "GROUP")
		.map((group) => ({ id: group.id, label: group.label }));

	const sidebarMonitors = monitors.map((monitor) => ({
		id: monitor.id,
		label: monitor.label,
		type: monitor.type,
		groupId: monitor.groupId,
	}));

	return { state, groups, sidebarMonitors };
}
