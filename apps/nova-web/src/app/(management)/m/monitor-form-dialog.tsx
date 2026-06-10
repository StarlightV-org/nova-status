"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	CREATE_MONITOR_FIELDS,
	MONITOR_TYPES,
	monitorCategoryMessageKey,
	monitorTypeMessageKey,
	type MonitorCategory,
	type MonitorType,
} from "@novastatus/lib/monitorTypes.ts";

import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { useT } from "~/provider/locale-provider";
import { useMonitorLayout } from "~/provider/monitor-state";
import { api } from "~/trpc/react";
import type { SidebarGroup } from "./app-sidebar";
import { MonitorForm } from "./monitor-form";
import {
	coerceMonitorData,
	getInitialMonitorData,
	hasMonitorTypeConfig,
	monitorDataToFormValues,
	switchMonitorTypeData,
	validateMonitorData,
} from "./monitor-schema";

const NO_GROUP = "__none__";
const NO_TYPE = "__none_type__";
const CATEGORIES = Object.keys(MONITOR_TYPES) as MonitorCategory[];
const COMMON = CREATE_MONITOR_FIELDS;

export type MonitorFormMonitor = {
	id: string;
	label: string;
	type: MonitorType;
	interval: number;
	groupId: string | null;
	data: Record<string, unknown>;
};

type MonitorFormDialogProps = {
	mode: "create" | "edit";
	groups: SidebarGroup[];
	monitor?: MonitorFormMonitor;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children?: React.ReactNode;
};

export function MonitorFormDialog({ mode, groups, monitor, open, onOpenChange, children }: MonitorFormDialogProps) {
	const t = useT();
	const router = useRouter();
	const utils = api.useUtils();
	const { replaceFromMonitors } = useMonitorLayout();

	const [label, setLabel] = useState("");
	const [interval, setInterval] = useState(60);
	const [groupId, setGroupId] = useState<string>(NO_GROUP);
	const [type, setType] = useState<MonitorType | typeof NO_TYPE>(NO_TYPE);
	const [data, setData] = useState<Record<string, unknown>>({});

	const [commonErrors, setCommonErrors] = useState<Record<string, string | undefined>>({});
	const [dataErrors, setDataErrors] = useState<Record<string, string | undefined>>({});
	const [submitError, setSubmitError] = useState<string | undefined>(undefined);

	const isEdit = mode === "edit";
	const selectedType = type !== NO_TYPE ? type : null;
	const typeLocked = isEdit && selectedType === "GROUP";
	const editableGroups = isEdit && monitor ? groups.filter((group) => group.id !== monitor.id) : groups;
	const configActive = selectedType !== null && hasMonitorTypeConfig(selectedType);
	const typeLabel = selectedType ? t(monitorTypeMessageKey(selectedType)) : null;

	function resetCreateState() {
		setLabel("");
		setInterval(60);
		setGroupId(NO_GROUP);
		setType(NO_TYPE);
		setData({});
		setCommonErrors({});
		setDataErrors({});
		setSubmitError(undefined);
	}

	function loadEditState(nextMonitor: MonitorFormMonitor) {
		setLabel(nextMonitor.label);
		setInterval(nextMonitor.interval);
		setGroupId(nextMonitor.groupId ?? NO_GROUP);
		setType(nextMonitor.type);
		setData(monitorDataToFormValues(nextMonitor.type, nextMonitor.data));
		setCommonErrors({});
		setDataErrors({});
		setSubmitError(undefined);
	}

	useEffect(() => {
		if (!open) return;
		if (isEdit && monitor) {
			loadEditState(monitor);
		} else if (!isEdit) {
			resetCreateState();
		}
	}, [open]);

	async function refreshMonitors() {
		const monitors = await utils.monitor.get.fetch();
		replaceFromMonitors(monitors);
		await utils.monitor.get.invalidate();
		router.refresh();
	}

	const createMonitor = api.monitor.create.useMutation({
		onSuccess: async () => {
			await refreshMonitors();
			onOpenChange(false);
		},
		onError: (error) => {
			setSubmitError(error.message);
		},
	});

	const updateMonitor = api.monitor.update.useMutation({
		onSuccess: async () => {
			await refreshMonitors();
			if (monitor) {
				await utils.monitor.getById.invalidate({ id: monitor.id });
			}
			onOpenChange(false);
		},
		onError: (error) => {
			setSubmitError(error.message);
		},
	});

	const isPending = createMonitor.isPending || updateMonitor.isPending;

	function handleOpenChange(next: boolean) {
		onOpenChange(next);
		if (!next && !isEdit) resetCreateState();
	}

	function handleTypeChange(nextType: MonitorType) {
		setData((prev) => switchMonitorTypeData(selectedType, nextType, prev));
		setType(nextType);
		setDataErrors({});
		setCommonErrors((prev) => ({ ...prev, type: undefined }));
	}

	function handleDataChange(key: string, value: unknown) {
		setData((prev) => ({ ...prev, [key]: value }));
		setDataErrors((prev) => ({ ...prev, [key]: undefined }));
	}

	function validateCommon() {
		const errors: Record<string, string | undefined> = {};
		if (label.trim().length === 0) errors.label = t("monitor.create.validation.labelRequired");
		if (!selectedType) errors.type = t("monitor.create.validation.typeRequired");
		if (!Number.isFinite(interval) || interval < 30) errors.interval = t("monitor.create.validation.intervalMin");
		else if (interval % 30 !== 0) errors.interval = t("monitor.create.validation.intervalMultiple");
		setCommonErrors(errors);
		return Object.keys(errors).length === 0;
	}

	function handleSubmit() {
		setSubmitError(undefined);
		if (!validateCommon() || !selectedType) return;

		let parsedData: Record<string, unknown> = {};

		if (hasMonitorTypeConfig(selectedType)) {
			const coerced = coerceMonitorData(selectedType, data);
			const result = validateMonitorData(selectedType, coerced, t);

			if (!result.success) {
				setDataErrors(result.errors);
				return;
			}

			parsedData = result.data;
		}

		const payload = {
			label: label.trim(),
			type: selectedType,
			interval,
			groupId: groupId === NO_GROUP ? null : groupId,
			data: parsedData,
		};

		if (isEdit && monitor) {
			updateMonitor.mutate({ id: monitor.id, ...payload });
		} else {
			createMonitor.mutate(payload);
		}
	}

	const dialogTitle = isEdit ? t("monitor.edit.title") : t("monitor.create.title");
	const dialogDescription = isEdit ? t("monitor.edit.step1Description") : t("monitor.create.step1Description");

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}

			<DialogContent className="gap-3 p-3 sm:max-w-4xl">
				<DialogHeader className="gap-0.5">
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>

				<div className="grid max-h-[60svh] grid-cols-2 gap-4 overflow-hidden">
					<section className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-1 py-0.5 pr-3 scrollbar-gutter-stable">
						<h3 className="text-sm font-medium">{t("monitor.form.basics")}</h3>

						<Field data-invalid={Boolean(commonErrors.label)}>
							<FieldLabel>
								{t(COMMON.label.labelKey!)}
								{COMMON.label.required && <span className="text-destructive"> *</span>}
							</FieldLabel>
							<Input value={label} onChange={(e) => setLabel(e.target.value)} aria-invalid={Boolean(commonErrors.label)} />
							<FieldError>{commonErrors.label}</FieldError>
						</Field>

						<Field data-invalid={Boolean(commonErrors.type)}>
							<FieldLabel>{t(COMMON.type.labelKey!)}</FieldLabel>
							{typeLocked ? (
								<>
									<Input value={typeLabel ?? ""} disabled readOnly />
									<FieldDescription>{t("monitor.edit.typeLocked")}</FieldDescription>
								</>
							) : (
								<Select
									value={selectedType ?? NO_TYPE}
									onValueChange={(next) => {
										if (next !== NO_TYPE) handleTypeChange(next as MonitorType);
									}}
								>
									<SelectTrigger className="w-full" aria-invalid={Boolean(commonErrors.type)}>
										<SelectValue placeholder={t("monitor.create.typePlaceholder")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_TYPE} disabled>
											{t("monitor.create.typePlaceholder")}
										</SelectItem>
										{CATEGORIES.map((category) => (
											<SelectGroup key={category}>
												<SelectLabel>{t(monitorCategoryMessageKey(category))}</SelectLabel>
												{MONITOR_TYPES[category].map((monitorType) => (
													<SelectItem key={monitorType} value={monitorType}>
														{t(monitorTypeMessageKey(monitorType))}
													</SelectItem>
												))}
											</SelectGroup>
										))}
									</SelectContent>
								</Select>
							)}
							<FieldError>{commonErrors.type}</FieldError>
						</Field>

						<Field data-invalid={Boolean(commonErrors.interval)}>
							<FieldLabel>{t(COMMON.interval.labelKey!)}</FieldLabel>
							<Input
								type="number"
								step={30}
								min={30}
								value={Number.isNaN(interval) ? "" : String(interval)}
								onChange={(e) => setInterval(e.target.value === "" ? NaN : Number(e.target.value))}
								aria-invalid={Boolean(commonErrors.interval)}
							/>
							{COMMON.interval.descriptionKey && (
								<FieldDescription>{t(COMMON.interval.descriptionKey)}</FieldDescription>
							)}
							<FieldError>{commonErrors.interval}</FieldError>
						</Field>

						{selectedType !== "GROUP" && (
							<Field>
								<FieldLabel>{t(COMMON.group.labelKey!)}</FieldLabel>
								<Select value={groupId} onValueChange={setGroupId}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={t("monitor.create.groupNone")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_GROUP}>{t("monitor.create.groupNone")}</SelectItem>
										{editableGroups.map((group) => (
											<SelectItem key={group.id} value={group.id}>
												{group.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
					</section>

					<section
						className={cn(
							"flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain border-l border-border px-3 py-0.5 pl-4 scrollbar-gutter-stable transition-opacity",
							!configActive && "pointer-events-none opacity-40",
						)}
					>
						<h3 className="text-sm font-medium">
							{typeLabel ? t("monitor.create.configure", { type: typeLabel }) : t("monitor.form.configuration")}
						</h3>

						{!selectedType ? (
							<p className="text-sm text-muted-foreground">{t("monitor.form.selectTypeHint")}</p>
						) : hasMonitorTypeConfig(selectedType) ? (
							<MonitorForm type={selectedType} values={data} errors={dataErrors} onChange={handleDataChange} />
						) : (
							<p className="text-sm text-muted-foreground">{t("monitor.form.noConfigNeeded")}</p>
						)}
					</section>
				</div>

				{submitError && <p className="text-sm text-destructive">{submitError}</p>}

				<DialogFooter className="-mx-3 -mb-3 gap-1.5 p-3">
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending
							? isEdit
								? t("common.saving")
								: t("common.creating")
							: isEdit
								? t("common.save")
								: t("common.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
