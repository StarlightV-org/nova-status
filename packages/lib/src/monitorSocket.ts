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

export type MonitorBatchPayload = {
	results: MonitorStatusSocketPayload[];
	timestamp: string;
	count: number;
};

export type MonitorServerToClientEvents = {
	"monitors:all": (updates: MonitorStatusSocketPayload[]) => void;
	"monitors:batch": (batch: MonitorBatchPayload) => void;
};

export type MonitorClientToServerEvents = Record<string, never>;
