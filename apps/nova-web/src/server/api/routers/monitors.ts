import { monitors } from "@novastatus/db/schema";
import { MONITOR_SCHEMA, MONITOR_TYPES_LIST } from "@novastatus/lib/monitorTypes.ts";
import { uptimeForMonitor, uptimeForMonitors } from "@novastatus/lib/uptime.ts";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const monitorRouter = createTRPCRouter({
	get: publicProcedure
		// .input(z.object({  }))
		.query(async ({ ctx }) => {
			const monitors = await ctx.db.query.monitors.findMany({
				with: {
					status: {
						orderBy: (status, { desc }) => [desc(status.checkedAt)],
					},
				},
			});

			const uptimeByMonitorId = await uptimeForMonitors(
				ctx.db,
				monitors.map((monitor) => monitor.id),
			);

			return monitors.map((monitor) => ({
				...monitor,
				uptime: uptimeByMonitorId.get(monitor.id) ?? {
					total: 100,
					last1day: 100,
					last7days: 100,
				},
				status: monitor.status.slice(0, 45),
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
			throw new TRPCError({ code: "NOT_FOUND", message: ctx.t("monitor.validation.notFound") });
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
					message: ctx.t("monitor.validation.invalidData", { type: input.type }),
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
