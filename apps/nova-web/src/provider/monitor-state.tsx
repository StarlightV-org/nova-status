"use client";
import type { MonitorStatusDB } from "@novastatus/db/schema";
import type { MonitorStatusSocketPayload } from "@novastatus/lib/monitorSocket.ts";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
	buildMonitorLayoutFromGet,
	type MonitorState,
	type SidebarGroup,
	type SidebarMonitor,
} from "~/lib/monitor-layout";
import type { RouterOutputs } from "~/trpc/react";
import { useSocket } from "./web-socket";

export type { MonitorState, SidebarGroup, SidebarMonitor };
export { buildMonitorLayoutFromGet };

type MonitorGetResult = RouterOutputs["monitor"]["get"];

type MonitorStateContextValue = {
	state: MonitorState;
	groups: SidebarGroup[];
	sidebarMonitors: SidebarMonitor[];
	replaceFromMonitors: (monitors: MonitorGetResult) => void;
};

const MonitorStateContext = createContext<MonitorStateContextValue | null>(null);

export function useMonitorState() {
	const ctx = useContext(MonitorStateContext);
	return ctx?.state ?? {};
}

export function useMonitorLayout() {
	const ctx = useContext(MonitorStateContext);
	if (!ctx) {
		throw new Error("useMonitorLayout must be used within MonitorStateProvider");
	}
	return ctx;
}

function applyMonitorUpdates(prev: MonitorState, updates: MonitorStatusSocketPayload[]): MonitorState {
	let changed = false;
	const next = { ...prev };

	for (const update of updates) {
		const entry = next[update.monitorId];
		if (!entry) continue;

		const statusEntry: MonitorStatusDB = {
			id: `live-${update.monitorId}-${update.timestamp}`,
			monitorId: update.monitorId,
			status: update.status,
			responseTime: update.responseTime,
			message: update.message ?? null,
			checkedAt: new Date(update.timestamp),
		};

		next[update.monitorId] = {
			...entry,
			states: [statusEntry, ...entry.states],
			uptime: update.uptime,
		};
		changed = true;
	}

	return changed ? next : prev;
}

export function MonitorStateProvider({
	children,
	initialState,
	initialGroups,
	initialSidebarMonitors,
}: {
	children: React.ReactNode;
	initialState: MonitorState;
	initialGroups: SidebarGroup[];
	initialSidebarMonitors: SidebarMonitor[];
}) {
	const [state, setState] = useState<MonitorState>(initialState);
	const [groups, setGroups] = useState<SidebarGroup[]>(initialGroups);
	const [sidebarMonitors, setSidebarMonitors] = useState<SidebarMonitor[]>(initialSidebarMonitors);
	const socket = useSocket();

	const replaceFromMonitors = useCallback((monitors: MonitorGetResult) => {
		const layout = buildMonitorLayoutFromGet(monitors);
		setState(layout.state);
		setGroups(layout.groups);
		setSidebarMonitors(layout.sidebarMonitors);
	}, []);

	useEffect(() => {
		if (!socket) return;

		const subscribeAll = () => {
			socket.emit("monitors:subscribe-all", (success: boolean) => {
				if (success) {
					Print.Success("monitors:subscribe-all", "success");
				} else {
					Print.Error("monitors:subscribe-all", "failure");
				}
			});
		};

		const onConnect = () => {
			Print.Debug("monitor-state", "socket connected, (re)subscribing to monitors:all");
			subscribeAll();
		};

		const onDisconnect = (reason: string) => {
			Print.Error("monitor-state", `socket disconnected: ${reason}`);
		};

		const onMonitorsAll = (updates: MonitorStatusSocketPayload[]) => {
			Print.Debug("monitors:all", updates);
			setState((prev) => applyMonitorUpdates(prev, updates));
		};

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("monitors:all", onMonitorsAll);

		if (socket.connected) subscribeAll();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("monitors:all", onMonitorsAll);
			socket.emit("monitors:unsubscribe-all", (success: boolean) => {
				if (success) {
					Print.Success("monitors:unsubscribe-all", "success");
				} else {
					Print.Error("monitors:unsubscribe-all", "failure");
				}
			});
		};
	}, [socket]);

	return (
		<MonitorStateContext.Provider value={{ state, groups, sidebarMonitors, replaceFromMonitors }}>
			{children}
		</MonitorStateContext.Provider>
	);
}
