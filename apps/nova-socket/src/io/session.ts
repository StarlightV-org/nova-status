import type { DefaultEventsMap, Socket } from "socket.io";
import { auth } from "~/server";

export async function getSession(
	socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
) {
	const headers = socket.request.headers;

	const session = await auth.api.getSession({
		headers: new Headers({
			cookie: headers.cookie ?? "none",
		}),
	});

	return session;
}
