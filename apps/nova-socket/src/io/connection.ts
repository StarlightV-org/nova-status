import type { Socket } from "socket.io";
import { auth } from "~/server";
import { getSession } from "./session";

export async function handleConnection(socket: Socket) {
	Print("a user connected");

	const session = await getSession(socket);

	// if (!session) {
	// 	Print.Error("No session found");
	// 	socket.data.session = null as any;
	// 	socket.disconnect(true);
	// 	return;
	// }


	socket.data.session = session;



	socket.on("disconnect", () => {
		Print("user disconnected");
	});
}
