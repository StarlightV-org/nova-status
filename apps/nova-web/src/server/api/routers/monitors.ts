import { monitors } from "@novastatus/db/schema";
import { MONITOR_SCHEMA, MONITOR_TYPES_LIST } from "@novastatus/lib/monitorTypes.ts";
import { uptimeForMonitor, uptimeForMonitors } from "@novastatus/lib/uptime.ts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const monitorRouter = createTRPCRouter({
	get: protectedProcedure
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

	getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
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

	create: protectedProcedure
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

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				label: z.string().min(1),
				type: z.enum(MONITOR_TYPES_LIST),
				interval: z.number().int().min(30),
				groupId: z.string().nullish(),
				data: z.unknown(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db.query.monitors.findFirst({
				where: (row, { eq: equals }) => equals(row.id, input.id),
			});

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: ctx.t("monitor.validation.notFound") });
			}

			if (existing.type === "GROUP" && input.type !== "GROUP") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: ctx.t("monitor.validation.typeChangeNotAllowed"),
				});
			}

			const schema = MONITOR_SCHEMA[input.type];
			const parsed = schema.safeParse(input.data);

			if (!parsed.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: ctx.t("monitor.validation.invalidData", { type: input.type }),
				});
			}

			const [updated] = await ctx.db
				.update(monitors)
				.set({
					label: input.label,
					type: input.type,
					interval: input.interval,
					groupId: input.groupId ?? null,
					data: parsed.data as Record<string, unknown>,
				})
				.where(eq(monitors.id, input.id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
		const existing = await ctx.db.query.monitors.findFirst({
			where: (row, { eq: equals }) => equals(row.id, input.id),
		});

		if (!existing) {
			throw new TRPCError({ code: "NOT_FOUND", message: ctx.t("monitor.validation.notFound") });
		}

		if (existing.type === "GROUP") {
			const child = await ctx.db.query.monitors.findFirst({
				where: (row, { eq: equals }) => equals(row.groupId, input.id),
			});

			if (child) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: ctx.t("monitor.validation.groupHasMonitors"),
				});
			}
		}

		await ctx.db.delete(monitors).where(eq(monitors.id, input.id));

		return { id: input.id };
	}),
});
