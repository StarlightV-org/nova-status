import { monitorStatus } from "@novastatus/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

const HOUR_MS = 60 * 60 * 1000;

function uptimePercent(upCount: number, totalCount: number): number {
  if (totalCount === 0) return 100;
  return Math.round((upCount / totalCount) * 100);
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
});
