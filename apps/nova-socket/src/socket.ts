import { Server } from "socket.io";
import type { FastifyInstance } from "fastify";
import { ENV } from "@novastatus/env";
import { registerIoHandlers } from "~/io";

// Define allowed origins based on environment
const devOrigins =
	ENV.NODE_ENV === "development"
		? ["http://localhost:3000", "https://localhost:3000"]
		: [];

const allowedOrigins = [ENV.BETTER_AUTH_URL, ...devOrigins].filter(
	(origin) => origin !== null,
);

export let io: Server;

export function initializeSocket(fastify: FastifyInstance) {
	io = new Server(fastify.server, {
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

	registerIoHandlers(io);

	return io;
}
