import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const monitorRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({  }))
    .query(async ({ ctx }) => {

      return ctx.db.query.monitors.findMany()

    }),
});
