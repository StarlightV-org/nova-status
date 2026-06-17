"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Manager, type Socket } from "socket.io-client";
import { toast } from "sonner";

const SocketManagerContext = createContext<Manager | null>(null);
const MonitorSocketContext = createContext<Socket | null>(null);

export function useSocketManager() {
	return useContext(SocketManagerContext);
}

export function useMonitorSocket() {
	return useContext(MonitorSocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
	const [manager, setManager] = useState<Manager | null>(null);
	const [monitorSocket, setMonitorSocket] = useState<Socket | null>(null);
	const wasConnected = useRef(false);

	useEffect(() => {
		const managerInstance = new Manager({
			path: "/socket.io",
			addTrailingSlash: false,
			autoConnect: false,
			reconnection: true,
			reconnectionAttempts: Infinity,
			reconnectionDelay: 1000,
			withCredentials: true,
		});

		const monitor = managerInstance.socket("/monitor");

		setManager(managerInstance);
		setMonitorSocket(monitor);

		const onConnect = () => {
			wasConnected.current = true;
			Print.StartUp("Connected to monitor socket");
			if (wasConnected.current) {
				toast.success("Connected to socket", {
					id: "web-socket",
					duration: 5000,
					position: "top-center",
				});
			}
		};

		const onDisconnect = (reason: string) => {
			Print.Error("web-socket", `disconnected: ${reason}`);
			toast.error(`Disconnected: ${reason}`, {
				id: "web-socket",
				duration: Number.POSITIVE_INFINITY,
				position: "top-center",
			});
		};

		const onConnectError = (error: Error) => {
			Print.Error("web-socket", `connect_error: ${error.message}`);
			toast.error(`Disconnected: ${error.message}`, {
				id: "web-socket",
				duration: Number.POSITIVE_INFINITY,
				position: "top-center",
			});
		};

		monitor.onAny((event, ...args) => {
			Print.Info(event, ...args);
		});

		monitor.on("connect", onConnect);
		monitor.on("disconnect", onDisconnect);
		monitor.on("connect_error", onConnectError);

		monitor.connect();

		return () => {
			monitor.off("connect", onConnect);
			monitor.off("disconnect", onDisconnect);
			monitor.off("connect_error", onConnectError);
			monitor.offAny();
			monitor.disconnect();
			managerInstance.removeAllListeners();
		};
	}, []);

	return (
		<SocketManagerContext.Provider value={manager}>
			<MonitorSocketContext.Provider value={monitorSocket}>{children}</MonitorSocketContext.Provider>
		</SocketManagerContext.Provider>
	);
}
