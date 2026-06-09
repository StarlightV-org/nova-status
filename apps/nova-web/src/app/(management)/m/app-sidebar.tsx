"use client";

import { useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useDeleteMonitor } from "~/hooks/use-delete-monitor";
import { cn } from "~/lib/utils";
import { useT } from "~/provider/locale-provider";
import { useMonitorLayout, type SidebarGroup, type SidebarMonitor } from "~/provider/monitor-state";
import { MonitorCard } from "./status-components";
import { CreateMonitorDialog } from "./create-monitor-dialog";
import { EditMonitorDialog } from "./edit-monitor-dialog";

export type { SidebarGroup, SidebarMonitor };

function SidebarGroupSection({
	label,
	monitors,
	groupId,
}: {
	label: string;
	monitors: SidebarMonitor[];
	groupId?: string;
}) {
	const t = useT();
	const { state } = useMonitorLayout();
	const [open, setOpen] = useState(true);
	const [editOpen, setEditOpen] = useState(false);
	const deleteMonitor = useDeleteMonitor();

	const trigger = (
		<CollapsibleTrigger className="group/trigger flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
			<ChevronRight
				className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
			/>
			<span className="flex-1 truncate">{label}</span>
			<Badge variant="secondary">{monitors.length}</Badge>
		</CollapsibleTrigger>
	);

	return (
		<Collapsible open={open} onOpenChange={setOpen} className="border-b border-sidebar-border last:border-b-0">
			{groupId ? (
				<ContextMenu>
					<ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem onSelect={() => setEditOpen(true)}>
							<Pencil />
							{t("sidebar.editMonitor")}
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem
							variant="destructive"
							onSelect={() => {
								const group = state[groupId];
								if (group) void deleteMonitor({ id: groupId, label: group.label });
							}}
						>
							<Trash2 />
							{t("sidebar.deleteMonitor")}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			) : (
				trigger
			)}
			{groupId && <EditMonitorDialog monitorId={groupId} open={editOpen} onOpenChange={setEditOpen} />}
			<CollapsibleContent className="flex flex-col gap-1 px-2 pb-2">
				{monitors.length === 0 ? (
					<p className="px-1 text-xs text-muted-foreground">{t("sidebar.noMonitors")}</p>
				) : (
					monitors.map((monitor) => <MonitorCard key={monitor.id} monitorId={monitor.id} />)
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}

export function AppSidebar() {
	const t = useT();
	const { groups, sidebarMonitors: monitors } = useMonitorLayout();

	const ungrouped = monitors.filter(
		(monitor) => monitor.type !== "GROUP" && (monitor.groupId === null || monitor.groupId === undefined),
	);

	return (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			<div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-3">
				<h2 className="text-sm font-semibold text-sidebar-foreground">{t("sidebar.monitors")}</h2>
				<CreateMonitorDialog groups={groups} />
			</div>

			<div className="min-h-0 flex-1 overflow-auto">
				{groups.map((group) => (
					<SidebarGroupSection
						key={group.id}
						groupId={group.id}
						label={group.label}
						monitors={monitors.filter((monitor) => monitor.groupId === group.id && monitor.type !== "GROUP")}
					/>
				))}

				{ungrouped.length > 0 && <SidebarGroupSection label={t("sidebar.none")} monitors={ungrouped} />}
			</div>
		</div>
	);
}
