import { type DefaultEventsMap, Server, type Socket } from "socket.io";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import "@novastatus/print";
import { ENV } from "@novastatus/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@novastatus/db";
import * as schema from "@novastatus/db/schema";
import fastifyExpress from "@fastify/express";
import jwt from "jsonwebtoken";
import z from "zod";

import * as api from "./api";
import { generateShortId } from "@novastatus/lib";

// Create auth instance for websocket server
const auth = betterAuth({
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

for (const route of Object.values(api)) {
	if (!route.prefix) {
		throw new Error("Prefix is required");
	}
	fastify.register(route, { prefix: route.prefix });
}

fastify.ready(() => {
	Print(`\nRegistered Routes:\n${fastify.printRoutes()}`);
});

// Define allowed origins based on environment
const devOrigins =
	ENV.NODE_ENV === "development"
		? ["http://localhost:3000", "https://localhost:3000"]
		: [];

const allowedOrigins = [ENV.BETTER_AUTH_URL, ...devOrigins].filter(
	(origin) => origin !== null,
);





export const io = new Server<
	any,
	any,
	any,
	{
		session: Exclude<typeof auth.$Infer.Session, null | undefined>;
	}
>(fastify.server, {
	cors: {
		origin: (origin, callback) => {
			// Allow requests with no origin (like mobile apps or curl requests)
			if (!origin) return callback(null, true);

			// Check if origin is in the static allowed origins list
			if (allowedOrigins.includes(origin)) {
				return callback(null, true);
			}



			// Origin not allowed
			return callback(new Error("Not allowed by CORS"), false);
		},
		methods: ["GET", "POST"],
		credentials: true,
	},
});

io.on("connection", async (socket) => {
	Print("a user connected");

	const session = await getSession(socket);

	if (!session) {
		Print.Error("No session found");
		socket.data.session = null as any;
		socket.disconnect(true);
		return;
	}

	await socket.join(session.user.id);
	socket.data.session = session;

	if (session.user.admin) {
		socket.join("admin");
	} else {
		// Send the user id and image to the admin socket room
		socket.to("admin").emit("user-connected", {
			userId: session.user.id,
			name: session.user.name,
		});
	}

	socket.on("disconnect", () => {
		Print("user disconnected");
	});
});
// Listen for 'join-room' event
io.of("/").adapter.on("join-room", async (room, _id) => {
	const isRoom = z
		.string()
		.regex(/[A-Za-z]{8}[0-9]{8}/)
		.safeParse(room).success;
	if (!isRoom) return;

	const clientsInRoom = io.of("/").adapter.rooms.get(room);
	const numClients = clientsInRoom ? clientsInRoom.size : 0;
	Print.Debug(`Client joined room ${room}. Total clients in room: ${numClients}`);


});

// Listen for 'leave-room' event
io.of("/").adapter.on("leave-room", async (room, id) => {
	const isRoom = z
		.string()
		.regex(/[A-Za-z]{8}[0-9]{8}/)
		.safeParse(room).success;
	if (!isRoom) return;

	const clientsInRoom = io.of("/").adapter.rooms.get(room);
	const numClients = clientsInRoom ? clientsInRoom.size : 0;
	Print.Debug(`Client left room ${room}. Total clients in room: ${numClients}`);


});
const start = async () => {
	try {
		await fastify.listen({ port: 3001, host: "0.0.0.0" });
		Print.StartUp("WebSocket server running on port 3001");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

await start();

export async function getSession(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) {
	const headers = socket.request.headers;

	const session = await auth.api.getSession({
		headers: new Headers({
			cookie: headers.cookie ?? "none",
		}),
	});
	// Print("Session:", session);

	return session;
}
