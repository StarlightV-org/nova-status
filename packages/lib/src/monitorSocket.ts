import type { MonitorStatusDB } from "@novastatus/db/schema";

import type { MonitorUptime } from "./uptime.ts";

export type MonitorStatusSocketPayload = {
	monitorId: string;
	status: MonitorStatusDB["status"];
	responseTime: number;
	message?: string;
	timestamp: string;
	uptime: MonitorUptime;
};
