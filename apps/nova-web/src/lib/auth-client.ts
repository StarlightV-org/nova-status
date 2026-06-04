"use client";
import { createAuthClient } from "better-auth/react";

import { passkeyClient } from "@better-auth/passkey/client";

import { oneTimeTokenClient } from "better-auth/client/plugins";
import { ENV } from "@novastatus/env";

/**
 * Use current origin in browser so auth (incl. passkey reauth popup) always targets
 * the correct domain. Env var can default to localhost when not set at prod build time.
 */
function getAuthBaseUrl(): string {
	if (typeof window !== "undefined") return window.location.origin;
	return ENV.NEXT_PUBLIC_BETTER_AUTH_URL;
}

export const authClient = createAuthClient({
	baseURL: getAuthBaseUrl(),
	plugins: [passkeyClient(), oneTimeTokenClient()],
});

export const { signIn, signOut } = authClient;
