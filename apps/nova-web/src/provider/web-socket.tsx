"use client";
import { ENV } from "@novastatus/env";
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
		Print.Debug("🚀 ~ SocketProvider ~ ENV.NEXT_PUBLIC_SOCKET_URL:", ENV.NEXT_PUBLIC_BETTER_AUTH_URL);
		const socketInstance = io("http://localhost:3001", {
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
