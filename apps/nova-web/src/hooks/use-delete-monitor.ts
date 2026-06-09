"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useConfirmModal } from "~/components/ui/confirm-modal";
import { useT } from "~/provider/locale-provider";
import { useMonitorLayout } from "~/provider/monitor-state";
import { api } from "~/trpc/react";

type DeleteMonitorInput = {
	id: string;
	label: string;
};

export function useDeleteMonitor() {
	const t = useT();
	const confirm = useConfirmModal();
	const router = useRouter();
	const utils = api.useUtils();
	const { replaceFromMonitors } = useMonitorLayout();

	const deleteMonitor = api.monitor.delete.useMutation();

	return useCallback(
		async (monitor: DeleteMonitorInput) => {
			const confirmed = await confirm({
				title: t("monitor.delete.title"),
				content: t("monitor.delete.description", { label: monitor.label }),
				requiredValue: monitor.label,
				confirmLabel: t("monitor.delete.confirm"),
				variant: "destructive",
			});

			if (!confirmed) return false;

			try {
				await deleteMonitor.mutateAsync({ id: monitor.id });
			} catch (error) {
				const message = error instanceof Error ? error.message : t("monitor.delete.failed");
				window.alert(message);
				return false;
			}

			const monitors = await utils.monitor.get.fetch();
			replaceFromMonitors(monitors);
			await utils.monitor.get.invalidate();
			router.refresh();

			if (window.location.pathname === `/m/${monitor.id}`) {
				router.push("/m");
			}

			return true;
		},
		[confirm, deleteMonitor, replaceFromMonitors, router, t, utils.monitor.get],
	);
}
