"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useT } from "~/provider/locale-provider";
import type { SidebarGroup } from "./app-sidebar";
import { MonitorFormDialog } from "./monitor-form-dialog";

export function CreateMonitorDialog({ groups }: { groups: SidebarGroup[] }) {
	const t = useT();
	const [open, setOpen] = useState(false);

	return (
		<MonitorFormDialog mode="create" groups={groups} open={open} onOpenChange={setOpen}>
			<Button size="sm">
				<Plus />
				{t("sidebar.newMonitor")}
			</Button>
		</MonitorFormDialog>
	);
}
