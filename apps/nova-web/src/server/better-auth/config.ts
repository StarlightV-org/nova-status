import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { ENV } from "@novastatus/env";
import { db } from "@novastatus/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    // /api/auth/callback/github
    github: {
      clientId: ENV.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: ENV.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      prompt: "consent",
    },
  },
});

export type Session = typeof auth.$Infer.Session;
