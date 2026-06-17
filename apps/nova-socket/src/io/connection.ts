import type { Socket } from "socket.io";
import { getSession } from "./session";

export async function handleConnection(socket: Socket) {
	Print("a user connected");

	const session = await getSession(socket);
	socket.data.session = session;

	socket.on("disconnect", () => {
		Print("user disconnected");
	});
}
