import { tryCatch } from "@novastatus/lib";
import type { MonitorStateEntry } from "@novastatus/lib/monitorTypes.js";

import { MonitorStateProvider, type MonitorState } from "~/provider/monitor-state";
import { SocketProvider } from "~/provider/web-socket";
import { api } from "~/trpc/server";
import { MonitorCard } from "./status-components";

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
	const monitors = await tryCatch(api.monitor.get());
	Print.Debug(monitors.error);

	const monitorState: MonitorState = (monitors.data ?? []).reduce<MonitorState>((acc, monitor) => {
		acc[monitor.id] = {
			label: monitor.label,
			type: monitor.type,
			data: monitor.data,
			interval: monitor.interval,
			states: monitor.status,
			uptime: monitor.uptime,
			groupId: monitor.groupId,
		} as MonitorStateEntry;
		return acc;
	}, {});

	// all monitors with type GROUP
	const monitorGroups = monitors.data?.filter((monitor) => monitor.type === "GROUP");
	const allMonitorsWithGroupId = monitors.data?.filter(
		(monitor) => monitor.groupId !== null || monitor.groupId !== undefined,
	);
	const noneGroupMonitors = allMonitorsWithGroupId?.filter(
		(monitor) => (monitor.groupId === null || monitor.groupId === undefined) && monitor.type !== "GROUP",
	);

	return (
		<SocketProvider>
			<MonitorStateProvider initialState={monitorState}>
				<div className="grid grid-cols-10 gap-4">
					<div className="col-span-3 max-h-svh overflow-auto bg-accent">
						{monitorGroups?.map((group) => (
							<div key={group.id}>
								<h2>{group.label}</h2>
								{allMonitorsWithGroupId
									?.filter((monitor) => monitor.groupId === group.id)
									?.map((monitor) => (
										<div key={monitor.id}>
											<MonitorCard monitorId={monitor.id} />
										</div>
									))}
							</div>
						))}

						{(noneGroupMonitors?.length ?? 0) > 0 && (
							<div key={"none"}>
								<h2>None</h2>
								{noneGroupMonitors?.map((monitor) => (
									<div key={monitor.id}>
										<MonitorCard monitorId={monitor.id} />
									</div>
								))}
							</div>
						)}
					</div>
					<div className="col-span-7 max-h-svh overflow-auto">{children}</div>
				</div>
			</MonitorStateProvider>
		</SocketProvider>
	);
}
