"use client";

import type { MonitorStatusDB } from "@novastatus/db/schema";
import type { MonitorStatusSocketPayload } from "@novastatus/lib/monitorSocket.ts";
import { useEffect, useState } from "react";

import { useMonitorSocket } from "~/provider/web-socket";
import type { RouterOutputs } from "~/trpc/react";

type MonitorDetailData = RouterOutputs["monitor"]["getById"];

function applyStatusUpdate(data: MonitorDetailData, update: MonitorStatusSocketPayload): MonitorDetailData {
	const statusEntry: MonitorStatusDB = {
		id: `live-${update.monitorId}-${update.timestamp}`,
		monitorId: update.monitorId,
		status: update.status,
		responseTime: update.responseTime,
		message: update.message ?? null,
		checkedAt: new Date(update.timestamp),
	};

	return {
		...data,
		uptime: update.uptime,
		status: [statusEntry, ...data.status],
	};
}

export function useMonitorDetail(monitorId: string, initialData: MonitorDetailData) {
	const [data, setData] = useState(initialData);
	const socket = useMonitorSocket();

	useEffect(() => {
		setData(initialData);
	}, [initialData]);

	useEffect(() => {
		if (!socket) return;

		const onMonitorsAll = (updates: MonitorStatusSocketPayload[]) => {
			const update = updates.find((entry) => entry.monitorId === monitorId);
			if (!update) return;

			Print.Debug("monitors:all", update);
			setData((prev) => applyStatusUpdate(prev, update));
		};

		socket.on("monitors:all", onMonitorsAll);

		return () => {
			socket.off("monitors:all", onMonitorsAll);
		};
	}, [socket, monitorId]);

	return data;
}
