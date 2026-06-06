import { tryCatch } from "@novastatus/lib";
import { buildMonitorLayoutFromGet } from "~/lib/monitor-layout";
import { MonitorStateProvider } from "~/provider/monitor-state";
import { SocketProvider } from "~/provider/web-socket";
import { api } from "~/trpc/server";
import { AppSidebar } from "./app-sidebar";

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
	const monitors = await tryCatch(api.monitor.get());
	Print.Debug(monitors.error);

	const { state: monitorState, groups, sidebarMonitors } = buildMonitorLayoutFromGet(monitors.data ?? []);

	return (
		<SocketProvider>
			<MonitorStateProvider
				initialState={monitorState}
				initialGroups={groups}
				initialSidebarMonitors={sidebarMonitors}
			>
				<div className="grid grid-cols-10 gap-4">
					<div className="col-span-3 max-h-svh min-h-svh overflow-hidden">
						<AppSidebar />
					</div>
					<div className="col-span-7 max-h-svh overflow-auto">{children}</div>
				</div>
			</MonitorStateProvider>
		</SocketProvider>
	);
}
