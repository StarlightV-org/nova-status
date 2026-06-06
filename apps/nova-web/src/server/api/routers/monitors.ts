import type { db as DbClient } from "@novastatus/db";
import { monitors, monitorStatus } from "@novastatus/db/schema";
import { MONITOR_SCHEMA, MONITOR_TYPES_LIST } from "@novastatus/lib/monitorTypes.ts";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function uptimePercent(upCount: number, totalCount: number): number {
	if (totalCount === 0) return 100;
	return Math.round((upCount / totalCount) * 100);
}

async function uptimeForMonitor(database: typeof DbClient, monitorId: string) {
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
		.where(eq(monitorStatus.monitorId, monitorId));

	if (!row) {
		return { total: 100, last1day: 100, last7days: 100 };
	}

	return {
		total: uptimePercent(row.upTotal, row.total),
		last1day: uptimePercent(row.upLast1Day, row.totalLast1Day),
		last7days: uptimePercent(row.upLast7Days, row.totalLast7Days),
	};
}

export const monitorRouter = createTRPCRouter({
	get: publicProcedure
		// .input(z.object({  }))
		.query(async ({ ctx }) => {
			const last1DayTs = new Date(Date.now() - 24 * HOUR_MS).toISOString();
			const last7DaysTs = new Date(Date.now() - 168 * HOUR_MS).toISOString();

			const monitors = await ctx.db.query.monitors.findMany({
				with: {
					status: {
						orderBy: (status, { desc }) => [desc(status.checkedAt)],
					},
				},
			});

			const uptimeRows = await ctx.db
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
				.groupBy(monitorStatus.monitorId);

			const uptimeByMonitorId = new Map(
				uptimeRows.map((row) => [
					row.monitorId,
					{
						total: uptimePercent(row.upTotal, row.total),
						last1day: uptimePercent(row.upLast1Day, row.totalLast1Day),
						last7days: uptimePercent(row.upLast7Days, row.totalLast7Days),
					},
				]),
			);

			return monitors.map((monitor) => ({
				...monitor,
				uptime: uptimeByMonitorId.get(monitor.id) ?? {
					total: 100,
					last1day: 100,
					last7days: 100,
				},
				status: monitor.status.slice(0, 5),
			}));
		}),

	getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
		const historySince = new Date(Date.now() - DAY_MS);

		const monitor = await ctx.db.query.monitors.findFirst({
			where: (row, { eq: equals }) => equals(row.id, input.id),
			with: {
				status: {
					where: (status, { gte }) => gte(status.checkedAt, historySince),
					orderBy: (status, { desc }) => [desc(status.checkedAt)],
					limit: 500,
				},
			},
		});

		if (!monitor) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Monitor not found" });
		}

		const uptime = await uptimeForMonitor(ctx.db, monitor.id);

		return {
			id: monitor.id,
			label: monitor.label,
			type: monitor.type,
			interval: monitor.interval,
			data: monitor.data,
			groupId: monitor.groupId,
			uptime,
			status: monitor.status,
		};
	}),

	create: publicProcedure
		.input(
			z.object({
				label: z.string().min(1),
				type: z.enum(MONITOR_TYPES_LIST),
				interval: z.number().int().min(30).default(60),
				groupId: z.string().nullish(),
				data: z.unknown(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const schema = MONITOR_SCHEMA[input.type];
			const parsed = schema.safeParse(input.data);

			if (!parsed.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid data for ${input.type} monitor: ${parsed.error.message}`,
				});
			}

			const [created] = await ctx.db
				.insert(monitors)
				.values({
					label: input.label,
					type: input.type,
					interval: input.interval,
					groupId: input.groupId ?? null,
					data: parsed.data as Record<string, unknown>,
				})
				.returning();

			return created;
		}),
});
