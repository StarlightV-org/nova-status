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
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
			withCredentials: true,
		});

		setSocket(socketInstance);

		socketInstance.on("connect", () => {
			Print.StartUp("Connected to socket");
		});

		return () => {
			socketInstance.close();
		};
	}, []);

	return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
