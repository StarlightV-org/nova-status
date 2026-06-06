"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext<ReturnType<typeof io> | null>(null);

export function useSocket() {
	const socket = useContext(SocketContext);

	return socket;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
	const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);

	useEffect(() => {
		const socketInstance = io({
			path: "/socket.io",
			addTrailingSlash: false,
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: Infinity,
			reconnectionDelay: 1000,
			withCredentials: true,
		});

		setSocket(socketInstance);

		const onConnect = () => {
			Print.StartUp("Connected to socket");
		};

		const onDisconnect = (reason: string) => {
			Print.Error("web-socket", `disconnected: ${reason}`);
		};

		const onConnectError = (error: Error) => {
			Print.Error("web-socket", `connect_error: ${error.message}`);
		};

		socketInstance.on("connect", onConnect);
		socketInstance.on("disconnect", onDisconnect);
		socketInstance.on("connect_error", onConnectError);

		return () => {
			socketInstance.off("connect", onConnect);
			socketInstance.off("disconnect", onDisconnect);
			socketInstance.off("connect_error", onConnectError);
			socketInstance.close();
		};
	}, []);

	return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
