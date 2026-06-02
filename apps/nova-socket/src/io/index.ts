import type { Server } from "socket.io";
import { handleConnection } from "./connection";
import { registerAdapterHandlers } from "./adapter";

export function registerIoHandlers(io: Server) {
	io.on("connection", handleConnection);
	registerAdapterHandlers(io);
}
