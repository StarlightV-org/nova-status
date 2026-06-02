import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import "@novastatus/print";
import { ENV } from "@novastatus/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@novastatus/db";
import * as schema from "@novastatus/db/schema";
import fastifyExpress from "@fastify/express";
import jwt from "jsonwebtoken";

import * as api from "./api";
import { generateShortId } from "@novastatus/lib";

// Create auth instance for websocket server
export const auth = betterAuth({
	secret: ENV.BETTER_AUTH_SECRET,
	baseURL: ENV.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			...schema,
			users: schema.users,
			accounts: schema.accounts,
			sessions: schema.sessions,
			verifications: schema.verifications,
		},
		usePlural: true,
	}),
	user: {
		additionalFields: {
			admin: {
				type: "boolean",
			},
			banner: {
				type: "string",
			},
			fivemLicense: {
				type: "string",
			},
			discordId: {
				type: "string",
			},
		},
	},
	advanced: {
		database: {
			generateId(options) {
				return generateShortId(options.size);
			},
		},
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for"],
		},
		crossSubDomainCookies: {
			domain: "starlightv.de",
			enabled: ENV.NODE_ENV !== "development",
			additionalCookies: ["webauthn_challenge"],
		},

		cookiePrefix: "control-starlightv",
	},
});

const envToLogger = {
	development: {
		transport: {
			target: "pino-pretty",
			options: {
				translateTime: "HH:MM:ss Z",
				ignore: "pid,hostname",
			},
		},
	},
	production: true,
	preview: false,
};

export const fastify = Fastify({
	logger: envToLogger[ENV.NODE_ENV] ?? true,
	trustProxy: true,
});

await fastify.register(fastifyExpress);
fastify.use((req: FastifyRequest, res: FastifyReply, next: () => void) => {
	const apiKey = req.headers.authorization?.replaceAll("Bearer ", "");

	if (!apiKey) {
		return res.status(401).send({ message: "No API key provided" });
	}

	let decoded: jwt.JwtPayload | null = null;

	jwt.verify(apiKey, ENV.JWT_SECRET, (err, payloadDecoded) => {
		if (err) {
			return res.status(401).send({ message: "Invalid API key" });
		}

		decoded = payloadDecoded as jwt.JwtPayload;
	});

	if (!decoded) {
		return res.status(401).send({ message: "Invalid API key" });
	}

	next();
});

// for (const route of Object.values(api)) {
// 	if (!route.prefix) {
// 		throw new Error("Prefix is required");
// 	}
// 	fastify.register(route, { prefix: route.prefix });
// }

fastify.ready(() => {
	Print(`\nRegistered Routes:\n${fastify.printRoutes()}`);
});

export async function startServer() {
	try {
		await fastify.listen({ port: 3001, host: "0.0.0.0" });
		Print.StartUp("WebSocket server running on port 3001");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}
