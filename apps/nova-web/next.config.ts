/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from "next";
import "@novastatus/env"
import "@novastatus/print"


const config: NextConfig = {
  reactStrictMode: true,
	reactCompiler: true,
	typescript: {
		ignoreBuildErrors: true,
	},
	experimental: {
		typedEnv: true,
	},
	skipTrailingSlashRedirect: true,
	devIndicators: {
		position: "top-right",
	},
	logging: {
		incomingRequests: {
			ignore: [/\/api\/trpc\//, /\/api\/push\/subscribe/],
		},
		fetches: {
			hmrRefreshes: false,
			fullUrl: true,
		},
	},
	typedRoutes: true,

	transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
	serverExternalPackages: ["discord.js"],
	env: {
		NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
	},
	rewrites: async () => [
		{
			source: "/ws/:path*",
			destination: "http://127.0.0.1:3001/:path*",
		},
		{
			source: "/ws",
			destination: "http://127.0.0.1:3001",
		},
		{
			source: "/socket.io/:path*",
			destination: "http://127.0.0.1:3001/socket.io/:path*",
		},
	],
};

export default config;
