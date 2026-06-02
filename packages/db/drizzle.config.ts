import { ENV } from "@novastatus/env";
import { type Config } from "drizzle-kit";

export default {
  schema: "./packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: ENV.DATABASE_URL!,
  },
  tablesFilter: ["nova_*"],
} satisfies Config;
