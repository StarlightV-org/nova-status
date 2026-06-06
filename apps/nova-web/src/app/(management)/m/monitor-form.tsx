"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { MonitorType } from "@novastatus/lib/monitorTypes.ts";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, FieldSeparator } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
	getMonitorFields,
	isUsingConnectionUri,
	URI_HIDDEN_FIELDS,
	type FieldDescriptor,
} from "./monitor-schema";

type MonitorFormProps = {
	type: MonitorType;
	values: Record<string, unknown>;
	errors: Record<string, string | undefined>;
	onChange: (key: string, value: unknown) => void;
};

function RecordField({
	value,
	onChange,
}: {
	value: Record<string, string>;
	onChange: (next: Record<string, string>) => void;
}) {
	const entries = Object.entries(value ?? {});

	const update = (index: number, key: string, val: string) => {
		const next = entries.map((entry) => [...entry] as [string, string]);
		next[index] = [key, val];
		onChange(Object.fromEntries(next));
	};

	const remove = (index: number) => {
		onChange(Object.fromEntries(entries.filter((_, i) => i !== index)));
	};

	const add = () => {
		onChange({ ...(value ?? {}), "": "" });
	};

	return (
		<div className="flex flex-col gap-1.5">
			{entries.map(([key, val], index) => (
				<div key={index} className="flex flex-row items-center gap-1.5">
					<Input placeholder="Key" value={key} onChange={(e) => update(index, e.target.value, val)} />
					<Input placeholder="Value" value={val} onChange={(e) => update(index, key, e.target.value)} />
					<Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
						<X />
					</Button>
				</div>
			))}
			<Button type="button" variant="outline" size="sm" className="w-fit" onClick={add}>
				<Plus />
				Add row
			</Button>
		</div>
	);
}

function NumberArrayField({ value, onChange }: { value: number[]; onChange: (next: number[]) => void }) {
	const [text, setText] = useState(() => (value ?? []).join(", "));

	const handleChange = (raw: string) => {
		setText(raw);
		const parsed = raw
			.split(",")
			.map((part) => part.trim())
			.filter((part) => part.length > 0)
			.map((part) => Number(part))
			.filter((num) => !Number.isNaN(num));
		onChange(parsed);
	};

	return <Input placeholder="200, 201, 204" value={text} onChange={(e) => handleChange(e.target.value)} />;
}

function MonitorField({
	field,
	value,
	error,
	onChange,
}: {
	field: FieldDescriptor;
	value: unknown;
	error: string | undefined;
	onChange: (value: unknown) => void;
}) {
	const invalid = Boolean(error);

	if (field.kind === "boolean") {
		return (
			<Field orientation="horizontal" data-invalid={invalid}>
				<Checkbox
					checked={Boolean(value)}
					onCheckedChange={(checked) => onChange(checked === true)}
					aria-invalid={invalid}
				/>
				<div className="flex flex-col gap-0.5">
					<FieldLabel>{field.label}</FieldLabel>
					{field.description && <FieldDescription>{field.description}</FieldDescription>}
					<FieldError>{error}</FieldError>
				</div>
			</Field>
		);
	}

	return (
		<Field data-invalid={invalid}>
			<FieldLabel>
				{field.label}
				{field.required && <span className="text-destructive"> *</span>}
			</FieldLabel>

			{field.kind === "enum" && (
				<Select value={String(value ?? "")} onValueChange={(next) => onChange(next)}>
					<SelectTrigger className="w-full" aria-invalid={invalid}>
						<SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
					</SelectTrigger>
					<SelectContent>
						{field.options?.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{field.kind === "record" && (
				<RecordField value={(value as Record<string, string>) ?? {}} onChange={(next) => onChange(next)} />
			)}

			{field.kind === "numberArray" && (
				<NumberArrayField value={(value as number[]) ?? []} onChange={(next) => onChange(next)} />
			)}

			{field.kind === "text" && (
				<Textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} />
			)}

			{field.kind === "number" && (
				<Input
					type="number"
					value={value === undefined || value === null ? "" : String(value)}
					onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
					aria-invalid={invalid}
				/>
			)}

			{field.kind === "string" && (
				<Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} />
			)}

			{field.description && <FieldDescription>{field.description}</FieldDescription>}
			<FieldError>{error}</FieldError>
		</Field>
	);
}

export function MonitorForm({ type, values, errors, onChange }: MonitorFormProps) {
	const fields = getMonitorFields(type);
	const uriAlternativeFields = URI_HIDDEN_FIELDS[type] ?? [];
	const usingUri = isUsingConnectionUri(values);
	const hiddenFields = new Set(usingUri ? uriAlternativeFields : []);
	const hasUriAlternative = uriAlternativeFields.length > 0;
	let showedUriSeparator = false;

	return (
		<div className="flex flex-col gap-2">
			{fields.map((field) => {
				if (hiddenFields.has(field.key)) return null;

				const showSeparator =
					hasUriAlternative && !usingUri && !showedUriSeparator && uriAlternativeFields.includes(field.key);

				if (showSeparator) showedUriSeparator = true;

				return (
					<div key={field.key} className="flex flex-col gap-2">
						{showSeparator && <FieldSeparator>Or configure individually</FieldSeparator>}
						<MonitorField
							field={field}
							value={values[field.key]}
							error={errors[field.key]}
							onChange={(value) => onChange(field.key, value)}
						/>
					</div>
				);
			})}
		</div>
	);
}
