import type { MonitorStatusDB } from "@novastatus/db/schema";
import type { MessageKey } from "./i18n/translate.ts";

export const MONITOR_TYPES = {
	MISC: ["GROUP"],
	STANDARD: ["HTTP", "HTTP+keyword", "TCP", "PING", "DNS", "DOCKER"],
	DATABASE: ["MYSQL", "POSTGRESQL", "MONGODB", "REDIS"],
} as const;

export type MonitorCategory = keyof typeof MONITOR_TYPES;
export type MonitorType = (typeof MONITOR_TYPES)[MonitorCategory][number];

export const MONITOR_TYPES_LIST = [
	...MONITOR_TYPES.MISC,
	...MONITOR_TYPES.STANDARD,
	...MONITOR_TYPES.DATABASE,
] as const satisfies readonly MonitorType[];

import { z } from "zod";

export type MonitorSchemaMeta = Partial<{
	labelKey: MessageKey;
	descriptionKey: MessageKey;
	required: boolean;
}>;

export function monitorMeta(data: MonitorSchemaMeta): MonitorSchemaMeta {
	return data;
}

export const CREATE_MONITOR_FIELDS = {
	label: monitorMeta({ labelKey: "monitor.create.label", required: true }),
	type: monitorMeta({ labelKey: "monitor.create.type" }),
	interval: monitorMeta({
		labelKey: "monitor.create.interval",
		descriptionKey: "monitor.create.intervalDescription",
	}),
	group: monitorMeta({ labelKey: "monitor.create.group" }),
} as const;

const MONITOR_TYPE_MESSAGE_KEYS: Record<MonitorType, MessageKey> = {
	GROUP: "monitor.types.GROUP",
	HTTP: "monitor.types.HTTP",
	"HTTP+keyword": "monitor.types.HTTP_PLUS_KEYWORD",
	TCP: "monitor.types.TCP",
	PING: "monitor.types.PING",
	DNS: "monitor.types.DNS",
	DOCKER: "monitor.types.DOCKER",
	MYSQL: "monitor.types.MYSQL",
	POSTGRESQL: "monitor.types.POSTGRESQL",
	MONGODB: "monitor.types.MONGODB",
	REDIS: "monitor.types.REDIS",
};

export function monitorTypeMessageKey(type: MonitorType): MessageKey {
	return MONITOR_TYPE_MESSAGE_KEYS[type];
}

export function monitorCategoryMessageKey(category: MonitorCategory): MessageKey {
	return `monitor.categories.${category}` as MessageKey;
}

function hasConnectionUri(data: { connectionString?: string }): boolean {
	return typeof data.connectionString === "string" && data.connectionString.trim().length > 0;
}

function requireWithoutUri(
	data: Record<string, unknown>,
	ctx: z.RefinementCtx,
	fields: Array<{ key: string; messageKey: MessageKey }>,
) {
	for (const { key, messageKey } of fields) {
		const value = data[key];
		if (value === undefined || value === null || value === "") {
			ctx.addIssue({ code: "custom", path: [key], message: messageKey });
		}
	}
}

export const MONITOR_SCHEMA = {
	GROUP: z.object({
		parrentId: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.group.parrentId.label",
					descriptionKey: "monitor.fields.group.parrentId.description",
					required: true,
				}),
			),
	}),
	HTTP: z.object({
		url: z
			.url()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.http.url.label",
					descriptionKey: "monitor.fields.http.url.description",
					required: true,
				}),
			),
		method: z
			.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
			.default("GET")
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.http.method.label",
					descriptionKey: "monitor.fields.http.method.description",
					required: false,
				}),
			),
		acceptedStatusCodes: z
			.array(z.number())
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.http.acceptedStatusCodes.label",
					descriptionKey: "monitor.fields.http.acceptedStatusCodes.description",
					required: false,
				}),
			),
		headers: z
			.record(z.string(), z.string())
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.http.headers.label",
					descriptionKey: "monitor.fields.http.headers.description",
					required: false,
				}),
			),
		body: z
			.string()
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.http.body.label",
					descriptionKey: "monitor.fields.http.body.description",
					required: false,
				}),
			),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.http.timeout.label",
					descriptionKey: "monitor.fields.http.timeout.description",
					required: false,
				}),
			),
	}),

	"HTTP+keyword": z.object({
		url: z
			.url()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.url.label",
					descriptionKey: "monitor.fields.httpKeyword.url.description",
					required: true,
				}),
			),
		method: z
			.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
			.default("GET")
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.method.label",
					descriptionKey: "monitor.fields.httpKeyword.method.description",
					required: false,
				}),
			),
		headers: z
			.record(z.string(), z.string())
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.headers.label",
					descriptionKey: "monitor.fields.httpKeyword.headers.description",
					required: false,
				}),
			),
		body: z
			.string()
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.body.label",
					descriptionKey: "monitor.fields.httpKeyword.body.description",
					required: false,
				}),
			),
		keyword: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.keyword.label",
					descriptionKey: "monitor.fields.httpKeyword.keyword.description",
					required: true,
				}),
			),
		matchType: z
			.enum(["contains", "not_contains", "equals", "regex"])
			.default("contains")
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.matchType.label",
					descriptionKey: "monitor.fields.httpKeyword.matchType.description",
					required: false,
				}),
			),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.httpKeyword.timeout.label",
					descriptionKey: "monitor.fields.httpKeyword.timeout.description",
					required: false,
				}),
			),
	}),

	TCP: z.object({
		host: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.tcp.host.label",
					descriptionKey: "monitor.fields.tcp.host.description",
					required: true,
				}),
			),
		port: z
			.number()
			.int()
			.min(1)
			.max(65535)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.tcp.port.label",
					descriptionKey: "monitor.fields.tcp.port.description",
					required: true,
				}),
			),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.tcp.timeout.label",
					descriptionKey: "monitor.fields.tcp.timeout.description",
					required: false,
				}),
			),
	}),

	PING: z.object({
		host: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.ping.host.label",
					descriptionKey: "monitor.fields.ping.host.description",
					required: true,
				}),
			),
		count: z
			.number()
			.int()
			.min(1)
			.max(10)
			.default(4)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.ping.count.label",
					descriptionKey: "monitor.fields.ping.count.description",
					required: false,
				}),
			),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.ping.timeout.label",
					descriptionKey: "monitor.fields.ping.timeout.description",
					required: false,
				}),
			),
	}),

	DNS: z.object({
		domain: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.dns.domain.label",
					descriptionKey: "monitor.fields.dns.domain.description",
					required: true,
				}),
			),
		recordType: z
			.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "SRV", "PTR", "CAA"])
			.default("A")
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.dns.recordType.label",
					descriptionKey: "monitor.fields.dns.recordType.description",
					required: false,
				}),
			),
		expectedValue: z
			.string()
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.dns.expectedValue.label",
					descriptionKey: "monitor.fields.dns.expectedValue.description",
					required: false,
				}),
			),
		resolver: z
			.string()
			.optional()
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.dns.resolver.label",
					descriptionKey: "monitor.fields.dns.resolver.description",
					required: false,
				}),
			),
	}),

	DOCKER: z.object({
		containerName: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.docker.containerName.label",
					descriptionKey: "monitor.fields.docker.containerName.description",
					required: true,
				}),
			),
		socketPath: z
			.string()
			.default("/var/run/docker.sock")
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.docker.socketPath.label",
					descriptionKey: "monitor.fields.docker.socketPath.description",
					required: false,
				}),
			),
	}),

	MYSQL: z
		.object({
			connectionString: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.connectionString.label",
						descriptionKey: "monitor.fields.mysql.connectionString.description",
						required: false,
					}),
				),
			host: z
				.string()
				.min(1)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.host.label",
						descriptionKey: "monitor.fields.mysql.host.description",
						required: false,
					}),
				),
			port: z
				.number()
				.int()
				.default(3306)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.port.label",
						descriptionKey: "monitor.fields.mysql.port.description",
						required: false,
					}),
				),
			username: z
				.string()
				.min(1)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.username.label",
						descriptionKey: "monitor.fields.mysql.username.description",
						required: false,
					}),
				),
			password: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.password.label",
						descriptionKey: "monitor.fields.mysql.password.description",
						required: false,
					}),
				),
			database: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.database.label",
						descriptionKey: "monitor.fields.mysql.database.description",
						required: false,
					}),
				),
			query: z
				.string()
				.default("SELECT 1")
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.query.label",
						descriptionKey: "monitor.fields.mysql.query.description",
						required: false,
					}),
				),
			timeout: z
				.number()
				.min(1_000)
				.max(10_000)
				.default(5_000)
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.mysql.timeout.label",
						descriptionKey: "monitor.fields.mysql.timeout.description",
						required: false,
					}),
				),
		})
		.superRefine((data, ctx) => {
			if (hasConnectionUri(data)) return;
			requireWithoutUri(data, ctx, [
				{ key: "host", messageKey: "monitor.validation.hostRequired" },
				{ key: "username", messageKey: "monitor.validation.usernameRequired" },
			]);
		}),

	POSTGRESQL: z
		.object({
			connectionString: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.connectionString.label",
						descriptionKey: "monitor.fields.postgresql.connectionString.description",
						required: false,
					}),
				),
			host: z
				.string()
				.min(1)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.host.label",
						descriptionKey: "monitor.fields.postgresql.host.description",
						required: false,
					}),
				),
			port: z
				.number()
				.int()
				.default(5432)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.port.label",
						descriptionKey: "monitor.fields.postgresql.port.description",
						required: false,
					}),
				),
			username: z
				.string()
				.min(1)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.username.label",
						descriptionKey: "monitor.fields.postgresql.username.description",
						required: false,
					}),
				),
			password: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.password.label",
						descriptionKey: "monitor.fields.postgresql.password.description",
						required: false,
					}),
				),
			database: z
				.string()
				.min(1)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.database.label",
						descriptionKey: "monitor.fields.postgresql.database.description",
						required: false,
					}),
				),
			query: z
				.string()
				.default("SELECT 1")
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.query.label",
						descriptionKey: "monitor.fields.postgresql.query.description",
						required: false,
					}),
				),
			ssl: z
				.boolean()
				.default(false)
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.ssl.label",
						descriptionKey: "monitor.fields.postgresql.ssl.description",
						required: false,
					}),
				),
			timeout: z
				.number()
				.min(1_000)
				.max(10_000)
				.default(5_000)
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.postgresql.timeout.label",
						descriptionKey: "monitor.fields.postgresql.timeout.description",
						required: false,
					}),
				),
		})
		.superRefine((data, ctx) => {
			if (hasConnectionUri(data)) return;
			requireWithoutUri(data, ctx, [
				{ key: "host", messageKey: "monitor.validation.hostRequired" },
				{ key: "username", messageKey: "monitor.validation.usernameRequired" },
				{ key: "password", messageKey: "monitor.validation.passwordRequired" },
				{ key: "database", messageKey: "monitor.validation.databaseRequired" },
			]);
		}),

	MONGODB: z.object({
		connectionString: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.mongodb.connectionString.label",
					descriptionKey: "monitor.fields.mongodb.connectionString.description",
					required: true,
				}),
			),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(
				monitorMeta({
					labelKey: "monitor.fields.mongodb.timeout.label",
					descriptionKey: "monitor.fields.mongodb.timeout.description",
					required: false,
				}),
			),
	}),

	REDIS: z
		.object({
			connectionString: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.connectionString.label",
						descriptionKey: "monitor.fields.redis.connectionString.description",
						required: false,
					}),
				),
			host: z
				.string()
				.min(1)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.host.label",
						descriptionKey: "monitor.fields.redis.host.description",
						required: false,
					}),
				),
			port: z
				.number()
				.int()
				.default(6379)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.port.label",
						descriptionKey: "monitor.fields.redis.port.description",
						required: false,
					}),
				),
			password: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.password.label",
						descriptionKey: "monitor.fields.redis.password.description",
						required: false,
					}),
				),
			database: z
				.number()
				.int()
				.min(0)
				.max(15)
				.default(0)
				.optional()
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.database.label",
						descriptionKey: "monitor.fields.redis.database.description",
						required: false,
					}),
				),
			command: z
				.string()
				.default("PING")
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.command.label",
						descriptionKey: "monitor.fields.redis.command.description",
						required: false,
					}),
				),
			timeout: z
				.number()
				.min(1_000)
				.max(10_000)
				.default(5_000)
				.meta(
					monitorMeta({
						labelKey: "monitor.fields.redis.timeout.label",
						descriptionKey: "monitor.fields.redis.timeout.description",
						required: false,
					}),
				),
		})
		.superRefine((data, ctx) => {
			if (hasConnectionUri(data)) return;
			requireWithoutUri(data, ctx, [{ key: "host", messageKey: "monitor.validation.hostRequired" }]);
		}),
} as const satisfies Record<MonitorType, z.ZodSchema>;

export type MonitorSchema = typeof MONITOR_SCHEMA;

type InferSchemaOutput<T extends z.ZodSchema> = z.infer<T>;

export type MonitorDataMap = {
	[K in MonitorType]: K extends keyof typeof MONITOR_SCHEMA ? InferSchemaOutput<(typeof MONITOR_SCHEMA)[K]> : never;
};

type MonitorEntryBase = {
	label: string;
	interval: number;
	states: Array<MonitorStatusDB>;
	groupId: string | null;
	uptime: {
		total: number;
		last1day: number;
		last7days: number;
	};
};

export type MonitorEntry<TType extends MonitorType = MonitorType> = MonitorEntryBase & {
	type: TType;
	data: MonitorDataMap[TType];
};

export type MonitorStateEntry = {
	[K in MonitorType]: MonitorEntry<K>;
}[MonitorType];
