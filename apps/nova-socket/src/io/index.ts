import type { Server } from "socket.io";
import { handleConnection } from "./connection";
import { registerAdapterHandlers } from "./adapter";
import monitorSpace from "./monito-space";

export function registerIoHandlers(io: Server) {
	io.on("connection", handleConnection);
	registerAdapterHandlers(io);
	monitorSpace();
}
