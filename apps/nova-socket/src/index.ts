import { fastify, startServer } from "~/server";
import { initializeSocket } from "~/socket";
import { startChecker, stopChecker } from "~/timing";
import checker from "~/checker";

// Initialize Socket.IO (pass fastify instance to avoid circular dependency)
initializeSocket(fastify);

// Start the checker (runs every 30 seconds, aligned to :00 and :30)
startChecker(checker);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		stopChecker();
	});
}

// Start the server
await startServer();
