import type { Socket } from "socket.io";
import { getSession } from "./session";

const userMonitorRooms = new Map<string, Set<string>>();

export async function handleConnection(socket: Socket) {
	Print("a user connected");

	const session = await getSession(socket);

	// Store session on socket data
	socket.data.session = session;

	// Handle subscription to a specific monitor
	socket.on("monitor:subscribe", async (monitorId: string, callback?: (success: boolean, error?: string) => void) => {
		// Require authentication to subscribe
		if (!socket.data.session) {
			const error = "Authentication required to subscribe to monitors";
			Print.Warning(`Rejected subscription attempt - not authenticated`);
			if (callback) callback(false, error);
			return;
		}

		const roomName = `monitor:${monitorId}`;
		await socket.join(roomName);

		// Track user's subscriptions
		const userId = socket.data.session.user.id;
		if (!userMonitorRooms.has(userId)) {
			userMonitorRooms.set(userId, new Set());
		}
		userMonitorRooms.get(userId)?.add(monitorId);

		Print.Debug(`User ${userId} subscribed to ${roomName}`);
		if (callback) callback(true);
	});

	// Handle subscription to ALL monitors (global dashboard view)
	socket.on("monitors:subscribe-all", async (callback?: (success: boolean, error?: string) => void) => {
		// Require authentication to subscribe
		if (!socket.data.session) {
			const error = "Authentication required";
			Print.Warning(`Rejected subscription attempt - not authenticated`);
			if (callback) callback(false, error);
			return;
		}

		await socket.join("monitors:all");

		const userId = socket.data.session.user.id;
		Print.Debug(`User ${userId} subscribed to all monitors (global room)`);
		if (callback) callback(true);
	});

	// Handle unsubscription from a specific monitor
	socket.on("monitor:unsubscribe", async (monitorId: string, callback?: (success: boolean) => void) => {
		const roomName = `monitor:${monitorId}`;
		await socket.leave(roomName);

		if (socket.data.session) {
			const userId = socket.data.session.user.id;
			userMonitorRooms.get(userId)?.delete(monitorId);
		}

		Print.Debug(`User left ${roomName}`);
		if (callback) callback(true);
	});

	// Handle unsubscription from all monitors
	socket.on("monitors:unsubscribe-all", async (callback?: (success: boolean) => void) => {
		await socket.leave("monitors:all");

		if (socket.data.session) {
			const userId = socket.data.session.user.id;
			Print.Debug(`User ${userId} left global monitors room`);
		}
		if (callback) callback(true);
	});

	// Handle disconnect - clean up tracking
	socket.on("disconnect", () => {
		if (socket.data.session) {
			const userId = socket.data.session.user.id;
			userMonitorRooms.delete(userId);
		}
		Print("user disconnected");
	});
}

// Helper to get user's subscribed monitors (optional, for debugging/admin)
export function getUserSubscriptions(userId: string): string[] {
	return Array.from(userMonitorRooms.get(userId) ?? []);
}
