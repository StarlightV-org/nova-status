import { fastify, startServer } from "~/server";
import { initializeSocket } from "~/socket";
import { startChecker } from "~/timing";
import checker from "~/checker";

// Initialize Socket.IO (pass fastify instance to avoid circular dependency)
initializeSocket(fastify);

// Start the checker (runs every 30 seconds, aligned to :00 and :30)
startChecker(checker);

// Start the server
await startServer();
