import "@novastatus/print";

import { betterAuth, type SessionType } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";

import { db } from "@novastatus/db"; // your drizzle instance
import { passkey } from "@better-auth/passkey";

import { ENV } from "@novastatus/env";


export const auth = betterAuth({
	baseURL: ENV.BETTER_AUTH_URL,
	secret: ENV.BETTER_AUTH_SECRET,
  trustedOrigins: [ENV.BETTER_AUTH_URL],
	appName: "StarlightV",

	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),



	advanced: {
		// database: {

		// },
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for"],
		},

    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: false,

    },
		cookiePrefix: "nova-status",
	},

	onAPIError: {
		throw: false,
	},



	user: {
		additionalFields: {

			admin: {
				type: "boolean",
				input: false,
				default: false,
			},
			permissions: {
				type: "json",
				items: {
					type: "string",
				},
				input: false,
			},
			accountInactive: {
				type: "boolean",
				default: false,
			},
			accountLocked: {
				type: "boolean",
				default: false,
			},

		},
	},

	socialProviders: {
    // /api/auth/callback/github
    github: {

      clientId: ENV.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: ENV.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      prompt: "consent",

    },
  },
	plugins: [
		// passkey({
		// 	origin: ENV.BETTER_AUTH_URL,
		// 	rpID: ENV.NODE_ENV === "development" ? "localhost" : new URL(ENV.BETTER_AUTH_URL).hostname,
		// 	rpName: "StarlightV",
		// 	authenticatorSelection: {
		// 		userVerification: "required",
		// 	},
		// 	advanced: {
		// 		webAuthnChallengeCookie: "control-starlightv-webauthn_challenge",
		// 	},
		// }),

	],
});



export async function getAuth(): Promise<SessionType> {
	const data = await auth.api.getSession({
		headers: await headers(),
	});

	if (!data) {
		return { session: null, user: null } as unknown as SessionType;
	}

	return {
		...data,
	};
}


declare module "better-auth" {
	type SessionType = typeof auth.$Infer.Session
}
