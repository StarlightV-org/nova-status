import type { db as DbClient } from "@novastatus/db";
import { monitorStatus } from "@novastatus/db/schema";
import { eq, inArray, lt, sql, and } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MonitorUptime = {
	total: number;
	last1day: number;
	last7days: number;
};

const DEFAULT_UPTIME: MonitorUptime = {
	total: 100,
	last1day: 100,
	last7days: 100,
};

export function uptimePercent(upCount: number, totalCount: number): number {
	if (totalCount === 0) return 100;
	return Math.round((upCount / totalCount) * 100);
}

function rowToUptime(row: {
	upTotal: number;
	total: number;
	upLast1Day: number;
	totalLast1Day: number;
	upLast7Days: number;
	totalLast7Days: number;
}): MonitorUptime {
	return {
		total: uptimePercent(row.upTotal, row.total),
		last1day: uptimePercent(row.upLast1Day, row.totalLast1Day),
		last7days: uptimePercent(row.upLast7Days, row.totalLast7Days),
	};
}

export async function uptimeForMonitor(
	database: typeof DbClient,
	monitorId: string,
	excludeCheckedAfter?: Date,
): Promise<MonitorUptime> {
	const last1DayTs = new Date(Date.now() - DAY_MS).toISOString();
	const last7DaysTs = new Date(Date.now() - 7 * DAY_MS).toISOString();

	const [row] = await database
		.select({
			total: sql<number>`cast(count(*) as int)`,
			upTotal: sql<number>`cast(count(*) filter (where ${monitorStatus.status} = 'up') as int)`,
			totalLast1Day: sql<number>`cast(count(*) filter (where ${monitorStatus.checkedAt} >= ${last1DayTs}) as int)`,
			upLast1Day: sql<number>`cast(count(*) filter (where ${monitorStatus.status} = 'up' and ${monitorStatus.checkedAt} >= ${last1DayTs}) as int)`,
			totalLast7Days: sql<number>`cast(count(*) filter (where ${monitorStatus.checkedAt} >= ${last7DaysTs}) as int)`,
			upLast7Days: sql<number>`cast(count(*) filter (where ${monitorStatus.status} = 'up' and ${monitorStatus.checkedAt} >= ${last7DaysTs}) as int)`,
		})
		.from(monitorStatus)
		.where(
			and(
				eq(monitorStatus.monitorId, monitorId),
				excludeCheckedAfter ? lt(monitorStatus.checkedAt, excludeCheckedAfter) : undefined,
			),
		);

	if (!row) return DEFAULT_UPTIME;
	return rowToUptime(row);
}

export async function uptimeForMonitors(
	database: typeof DbClient,
	monitorIds: string[],
	excludeCheckedAfter?: Date,
): Promise<Map<string, MonitorUptime>> {
	if (monitorIds.length === 0) return new Map();

	const last1DayTs = new Date(Date.now() - DAY_MS).toISOString();
	const last7DaysTs = new Date(Date.now() - 7 * DAY_MS).toISOString();

	const rows = await database
		.select({
			monitorId: monitorStatus.monitorId,
			total: sql<number>`cast(count(*) as int)`,
			upTotal: sql<number>`cast(count(*) filter (where ${monitorStatus.status} = 'up') as int)`,
			totalLast1Day: sql<number>`cast(count(*) filter (where ${monitorStatus.checkedAt} >= ${last1DayTs}) as int)`,
			upLast1Day: sql<number>`cast(count(*) filter (where ${monitorStatus.status} = 'up' and ${monitorStatus.checkedAt} >= ${last1DayTs}) as int)`,
			totalLast7Days: sql<number>`cast(count(*) filter (where ${monitorStatus.checkedAt} >= ${last7DaysTs}) as int)`,
			upLast7Days: sql<number>`cast(count(*) filter (where ${monitorStatus.status} = 'up' and ${monitorStatus.checkedAt} >= ${last7DaysTs}) as int)`,
		})
		.from(monitorStatus)
		.where(
			and(
				inArray(monitorStatus.monitorId, monitorIds),
				excludeCheckedAfter ? lt(monitorStatus.checkedAt, excludeCheckedAfter) : undefined,
			),
		)
		.groupBy(monitorStatus.monitorId);

	return new Map(
		rows.map((row) => [
			row.monitorId,
			rowToUptime(row),
		]),
	);
}
