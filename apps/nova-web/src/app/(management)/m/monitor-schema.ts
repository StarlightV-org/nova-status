import { MONITOR_SCHEMA, type MonitorSchemaMeta, type MonitorType } from "@novastatus/lib/monitorTypes.ts";
import type { z } from "zod";

export type FieldKind = "string" | "text" | "number" | "boolean" | "enum" | "record" | "numberArray";

export type FieldDescriptor = {
	key: string;
	kind: FieldKind;
	required: boolean;
	label: string;
	description?: string;
	options?: string[];
	defaultValue: unknown;
};

type ZodDef = {
	type?: string;
	innerType?: unknown;
	element?: unknown;
	entries?: Record<string, string>;
	options?: unknown[];
	defaultValue?: unknown;
};

function getDef(schema: unknown): ZodDef | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	const internal = (schema as { _zod?: { def?: ZodDef }; def?: ZodDef })._zod?.def;
	return internal ?? (schema as { def?: ZodDef }).def;
}

function unwrapWrappers(schema: unknown): unknown {
	let current = schema;
	let def = getDef(current);
	while (def && (def.type === "optional" || def.type === "default" || def.type === "nullable")) {
		current = def.innerType;
		def = getDef(current);
	}
	return current;
}

function resolveDefault(schema: unknown): unknown {
	let current = schema;
	let def = getDef(current);
	while (def) {
		if (def.type === "default") {
			const value = def.defaultValue;
			return typeof value === "function" ? (value as () => unknown)() : value;
		}
		if (def.type === "optional" || def.type === "nullable") {
			current = def.innerType;
			def = getDef(current);
			continue;
		}
		break;
	}
	return undefined;
}

function resolveKind(schema: unknown, key: string): { kind: FieldKind; options?: string[] } {
	const inner = unwrapWrappers(schema);
	const def = getDef(inner);

	switch (def?.type) {
		case "boolean":
			return { kind: "boolean" };
		case "number":
			return { kind: "number" };
		case "enum": {
			const options = (inner as { options?: string[] }).options ?? Object.values(def.entries ?? {});
			return { kind: "enum", options };
		}
		case "record":
			return { kind: "record" };
		case "array": {
			const elementDef = getDef(def.element ?? (inner as { element?: unknown }).element);
			return { kind: elementDef?.type === "number" ? "numberArray" : "string" };
		}
		case "string":
		default:
			return { kind: key === "body" || key === "connectionString" ? "text" : "string" };
	}
}

function readMeta(schema: unknown): MonitorSchemaMeta {
	const meta = (schema as { meta?: () => MonitorSchemaMeta | undefined }).meta?.();
	return meta ?? {};
}

export function getMonitorFields(type: MonitorType): FieldDescriptor[] {
	const schema = MONITOR_SCHEMA[type] as unknown as z.ZodObject;
	const shape = schema.shape as Record<string, unknown>;

	const fields = Object.entries(shape).map(([key, fieldSchema]) => {
		const meta = readMeta(fieldSchema);
		const { kind, options } = resolveKind(fieldSchema, key);

		return {
			key,
			kind,
			required: meta.required ?? false,
			label: meta.label ?? key,
			description: meta.description,
			options,
			defaultValue: resolveDefault(fieldSchema),
		};
	});

	fields.sort((a, b) => {
		if (a.key === "connectionString") return -1;
		if (b.key === "connectionString") return 1;
		return 0;
	});

	return fields;
}

export const URI_HIDDEN_FIELDS: Partial<Record<MonitorType, string[]>> = {
	MYSQL: ["host", "port", "username", "password", "database"],
	POSTGRESQL: ["host", "port", "username", "password", "database", "ssl"],
	REDIS: ["host", "port", "password", "database"],
};

export function isUsingConnectionUri(values: Record<string, unknown>): boolean {
	const uri = values.connectionString;
	return typeof uri === "string" && uri.trim().length > 0;
}

export type MonitorValidationResult =
	| { success: true; data: Record<string, unknown> }
	| { success: false; errors: Record<string, string | undefined> };

export function validateMonitorData(type: MonitorType, data: Record<string, unknown>): MonitorValidationResult {
	const result = MONITOR_SCHEMA[type].safeParse(data);

	if (result.success) {
		return { success: true, data: result.data as Record<string, unknown> };
	}

	const errors: Record<string, string | undefined> = {};
	for (const issue of result.error.issues) {
		const key = issue.path[0];
		if (typeof key === "string" && !errors[key]) {
			errors[key] = issue.message;
		}
	}

	return { success: false, errors };
}

export function coerceMonitorData(type: MonitorType, values: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const field of getMonitorFields(type)) {
		const raw = values[field.key];

		switch (field.kind) {
			case "number": {
				if (raw === "" || raw === null || raw === undefined) {
					result[field.key] = undefined;
				} else {
					const parsed = typeof raw === "number" ? raw : Number(raw);
					result[field.key] = Number.isNaN(parsed) ? raw : parsed;
				}
				break;
			}
			case "boolean":
				result[field.key] = Boolean(raw);
				break;
			case "numberArray":
				result[field.key] = Array.isArray(raw) ? raw : [];
				break;
			case "record": {
				const record = (raw && typeof raw === "object" ? (raw as Record<string, string>) : {}) ?? {};
				const cleaned = Object.fromEntries(Object.entries(record).filter(([key]) => key.trim().length > 0));
				result[field.key] = Object.keys(cleaned).length > 0 ? cleaned : undefined;
				break;
			}
			default:
				result[field.key] = raw === "" ? undefined : raw;
				break;
		}
	}

	if (isUsingConnectionUri(result)) {
		for (const key of URI_HIDDEN_FIELDS[type] ?? []) {
			delete result[key];
		}
	} else if (result.connectionString === undefined || result.connectionString === "") {
		delete result.connectionString;
	}

	return result;
}

export function getInitialMonitorData(type: MonitorType): Record<string, unknown> {
	const values: Record<string, unknown> = {};
	for (const field of getMonitorFields(type)) {
		switch (field.kind) {
			case "boolean":
				values[field.key] = field.defaultValue ?? false;
				break;
			case "enum":
				values[field.key] = field.defaultValue ?? field.options?.[0] ?? "";
				break;
			case "record":
				values[field.key] = field.defaultValue ?? {};
				break;
			case "numberArray":
				values[field.key] = field.defaultValue ?? [];
				break;
			default:
				values[field.key] = field.defaultValue ?? "";
				break;
		}
	}
	return values;
}
