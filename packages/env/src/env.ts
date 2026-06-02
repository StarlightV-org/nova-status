import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const ENV = createEnv({
  server: {
    DATABASE_URL: z.url(),


  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: "PUBLIC_",

  client: {

  },

  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,

  },


  emptyStringAsUndefined: true,
  shared: {
    NODE_ENV: z.enum(["development", "production"]),
  }
});
