import { fastify, startServer } from "~/server";
import { initializeSocket } from "~/socket";

// Initialize Socket.IO (pass fastify instance to avoid circular dependency)
initializeSocket(fastify);

// Start the server
await startServer();
