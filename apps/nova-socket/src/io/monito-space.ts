import type { Namespace } from "socket.io";
import { io } from "~/socket";
import { getSession } from "./session";

let monitorNamespace: Namespace | null = null;

export function getMonitorNamespace() {
	return monitorNamespace;
}

function monitorSpace() {
	Print.StartUp("Loading monitor space...");
	const nameSpace = io.of("/monitor");

	nameSpace.use(async (socket, next) => {
		const auth = await getSession(socket);

		if (!auth?.user.id || !auth.session.id) {
			return next(new Error("UNAUTHORIZED"));
		}

		socket.data.auth = auth;

		next();
	});

	nameSpace.on("connection", (socket) => {
		const userId = socket.data.auth.user.id;

		Print.Debug(`User ${userId} connected to /monitor`);

		socket.on("disconnect", () => {
			Print.Debug(`User ${userId} disconnected from /monitor`);
		});
	});

	monitorNamespace = nameSpace;

	Print.StartUp("Monitor space loaded.");

	return nameSpace;
}

export default monitorSpace;
