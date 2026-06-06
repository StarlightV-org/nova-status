"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { useT } from "~/provider/locale-provider";
import { api } from "~/trpc/react";
import type { SidebarGroup } from "./app-sidebar";
import { MonitorForm } from "./monitor-form";
import { coerceMonitorData, getInitialMonitorData, validateMonitorData } from "./monitor-schema";

const NO_GROUP = "__none__";
const CATEGORIES = Object.keys(MONITOR_TYPES) as MonitorCategory[];
const COMMON = CREATE_MONITOR_FIELDS;

export function CreateMonitorDialog({ groups }: { groups: SidebarGroup[] }) {
	const t = useT();
	const router = useRouter();
	const utils = api.useUtils();

	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<1 | 2>(1);

	const [label, setLabel] = useState("");
	const [interval, setInterval] = useState(60);
	const [groupId, setGroupId] = useState<string>(NO_GROUP);
	const [type, setType] = useState<MonitorType>("HTTP");
	const [data, setData] = useState<Record<string, unknown>>(() => getInitialMonitorData("HTTP"));

	const [commonErrors, setCommonErrors] = useState<Record<string, string | undefined>>({});
	const [dataErrors, setDataErrors] = useState<Record<string, string | undefined>>({});
	const [submitError, setSubmitError] = useState<string | undefined>(undefined);

	const createMonitor = api.monitor.create.useMutation({
		onSuccess: async () => {
			await utils.monitor.get.invalidate();
			router.refresh();
			closeAndReset();
		},
		onError: (error) => {
			setSubmitError(error.message);
		},
	});

	function resetState() {
		setStep(1);
		setLabel("");
		setInterval(60);
		setGroupId(NO_GROUP);
		setType("HTTP");
		setData(getInitialMonitorData("HTTP"));
		setCommonErrors({});
		setDataErrors({});
		setSubmitError(undefined);
	}

	function closeAndReset() {
		setOpen(false);
		resetState();
	}

	function handleTypeChange(nextType: MonitorType) {
		setType(nextType);
		setData(getInitialMonitorData(nextType));
		setDataErrors({});
	}

	function handleDataChange(key: string, value: unknown) {
		setData((prev) => ({ ...prev, [key]: value }));
		setDataErrors((prev) => ({ ...prev, [key]: undefined }));
	}

	function validateStepOne() {
		const errors: Record<string, string | undefined> = {};
		if (label.trim().length === 0) errors.label = t("monitor.create.validation.labelRequired");
		if (!Number.isFinite(interval) || interval < 30) errors.interval = t("monitor.create.validation.intervalMin");
		else if (interval % 30 !== 0) errors.interval = t("monitor.create.validation.intervalMultiple");
		setCommonErrors(errors);
		return Object.keys(errors).length === 0;
	}

	function handleNext() {
		if (validateStepOne()) setStep(2);
	}

	function handleSubmit() {
		setSubmitError(undefined);
		const coerced = coerceMonitorData(type, data);
		const result = validateMonitorData(type, coerced, t);

		if (!result.success) {
			setDataErrors(result.errors);
			return;
		}

		createMonitor.mutate({
			label: label.trim(),
			type,
			interval,
			groupId: groupId === NO_GROUP ? null : groupId,
			data: result.data,
		});
	}

	const typeLabel = t(monitorTypeMessageKey(type));

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) resetState();
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus />
					{t("sidebar.newMonitor")}
				</Button>
			</DialogTrigger>

			<DialogContent className="gap-2 p-3 sm:max-w-md">
				<DialogHeader className="gap-0.5">
					<DialogTitle>
						{step === 1 ? t("monitor.create.title") : t("monitor.create.configure", { type: typeLabel })}
					</DialogTitle>
					<DialogDescription>
						{step === 1 ? t("monitor.create.step1Description") : t("monitor.create.step2Description")}
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[60svh] overflow-y-auto overscroll-contain px-2 py-0.5 pr-4 scrollbar-gutter-stable">
					{step === 1 ? (
						<div className="flex flex-col gap-2">
							<Field data-invalid={Boolean(commonErrors.label)}>
								<FieldLabel>
									{t(COMMON.label.labelKey!)}
									{COMMON.label.required && <span className="text-destructive"> *</span>}
								</FieldLabel>
								<Input value={label} onChange={(e) => setLabel(e.target.value)} aria-invalid={Boolean(commonErrors.label)} />
								<FieldError>{commonErrors.label}</FieldError>
							</Field>

							<Field>
								<FieldLabel>{t(COMMON.type.labelKey!)}</FieldLabel>
								<Select value={type} onValueChange={(next) => handleTypeChange(next as MonitorType)}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
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

							<Field>
								<FieldLabel>{t(COMMON.group.labelKey!)}</FieldLabel>
								<Select value={groupId} onValueChange={setGroupId}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={t("monitor.create.groupNone")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_GROUP}>{t("monitor.create.groupNone")}</SelectItem>
										{groups.map((group) => (
											<SelectItem key={group.id} value={group.id}>
												{group.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</div>
					) : (
						<MonitorForm type={type} values={data} errors={dataErrors} onChange={handleDataChange} />
					)}
				</div>

				{submitError && <p className="text-sm text-destructive">{submitError}</p>}

				<DialogFooter className="-mx-3 -mb-3 gap-1.5 p-3">
					{step === 1 ? (
						<Button onClick={handleNext}>{t("common.next")}</Button>
					) : (
						<>
							<Button variant="outline" onClick={() => setStep(1)}>
								{t("common.back")}
							</Button>
							<Button onClick={handleSubmit} disabled={createMonitor.isPending}>
								{createMonitor.isPending ? t("common.creating") : t("common.create")}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
