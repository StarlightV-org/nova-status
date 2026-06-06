"use client";

import type { MonitorStatusDB } from "@novastatus/db/schema";
import type { MonitorStatusSocketPayload } from "@novastatus/lib/monitorSocket.ts";
import { useEffect, useState } from "react";

import { useSocket } from "~/provider/web-socket";
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
	const socket = useSocket();

	useEffect(() => {
		setData(initialData);
	}, [initialData]);

	useEffect(() => {
		if (!socket) return;

		const subscribe = () => {
			socket.emit("monitor:subscribe", monitorId, (success: boolean) => {
				if (success) {
					Print.Success("monitor:subscribe", monitorId);
				} else {
					Print.Error("monitor:subscribe", monitorId);
				}
			});
		};

		const onConnect = () => {
			Print.Debug("use-monitor-detail", `socket connected, (re)subscribing to monitor:${monitorId}`);
			subscribe();
		};

		const onStatus = (update: MonitorStatusSocketPayload) => {
			if (update.monitorId !== monitorId) return;
			Print.Debug("monitor:status", update);
			setData((prev) => applyStatusUpdate(prev, update));
		};

		socket.on("connect", onConnect);
		socket.on("monitor:status", onStatus);

		if (socket.connected) subscribe();

		return () => {
			socket.off("connect", onConnect);
			socket.off("monitor:status", onStatus);
			socket.emit("monitor:unsubscribe", monitorId, (success: boolean) => {
				if (success) {
					Print.Success("monitor:unsubscribe", monitorId);
				} else {
					Print.Error("monitor:unsubscribe", monitorId);
				}
			});
		};
	}, [socket, monitorId]);

	return data;
}
