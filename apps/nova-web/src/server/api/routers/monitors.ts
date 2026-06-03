import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const monitorRouter = createTRPCRouter({
  get: publicProcedure
    // .input(z.object({  }))
    .query(async ({ ctx }) => {

      const monitors = await ctx.db.query.monitors.findMany({
        with: {
          status: {
            orderBy: (status, { desc }) => [desc(status.checkedAt)],
            limit: 5,
          }
        },
      })
      Print.Debug(monitors)
      return monitors

    }),
});
