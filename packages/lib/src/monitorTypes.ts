import type { MonitorStatusDB } from "@novastatus/db/schema";

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
	label: string;
	description: string;
	required: boolean;
}>;

export function monitorMeta(data: MonitorSchemaMeta): MonitorSchemaMeta {
	return data;
}

function hasConnectionUri(data: { connectionString?: string }): boolean {
	return typeof data.connectionString === "string" && data.connectionString.trim().length > 0;
}

function requireWithoutUri(
	data: Record<string, unknown>,
	ctx: z.RefinementCtx,
	fields: Array<{ key: string; message: string }>,
) {
	for (const { key, message } of fields) {
		const value = data[key];
		if (value === undefined || value === null || value === "") {
			ctx.addIssue({ code: "custom", path: [key], message });
		}
	}
}

export const MONITOR_SCHEMA = {
	GROUP: z.object({
		parrentId: z
			.string()
			.min(1)
			.meta(monitorMeta({ label: "Parent ID", description: "The parent group this group belongs to", required: true })),
	}),
	// Standard monitors
	HTTP: z.object({
		url: z.url().meta(monitorMeta({ label: "URL", description: "The URL to monitor", required: true })),

		method: z
			.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
			.default("GET")
			.meta(monitorMeta({ label: "Method", description: "The HTTP method to use", required: false })),
		acceptedStatusCodes: z
			.array(z.number())
			.optional()
			.meta(monitorMeta({ label: "Accepted Status Codes", description: "The status codes to accept", required: false })),
		headers: z
			.record(z.string(), z.string())
			.optional()
			.meta(monitorMeta({ label: "Headers", description: "The HTTP headers to send", required: false })),
		body: z
			.string()
			.optional()
			.meta(monitorMeta({ label: "Body", description: "The HTTP body to send", required: false })),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(monitorMeta({ label: "Timeout", description: "The HTTP timeout to use", required: false })),
	}),

	"HTTP+keyword": z.object({
		url: z.url().meta(monitorMeta({ label: "URL", description: "The URL to monitor", required: true })),
		method: z
			.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
			.default("GET")
			.meta(monitorMeta({ label: "Method", description: "The HTTP method to use", required: false })),
		headers: z
			.record(z.string(), z.string())
			.optional()
			.meta(monitorMeta({ label: "Headers", description: "The HTTP headers to send", required: false })),
		body: z
			.string()
			.optional()
			.meta(monitorMeta({ label: "Body", description: "The HTTP body to send", required: false })),
		keyword: z
			.string()
			.min(1)
			.meta(monitorMeta({ label: "Keyword", description: "The keyword to look for in the response", required: true })),
		matchType: z
			.enum(["contains", "not_contains", "equals", "regex"])
			.default("contains")
			.meta(monitorMeta({ label: "Match Type", description: "How the keyword should be matched", required: false })),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(monitorMeta({ label: "Timeout", description: "The HTTP timeout to use", required: false })),
	}),

	TCP: z.object({
		host: z
			.string()
			.min(1)
			.meta(monitorMeta({ label: "Host", description: "The host to connect to", required: true })),
		port: z
			.number()
			.int()
			.min(1)
			.max(65535)
			.meta(monitorMeta({ label: "Port", description: "The TCP port to connect to", required: true })),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(monitorMeta({ label: "Timeout", description: "The connection timeout to use", required: false })),
	}),

	PING: z.object({
		host: z
			.string()
			.min(1)
			.meta(monitorMeta({ label: "Host", description: "The host to ping", required: true })),
		count: z
			.number()
			.int()
			.min(1)
			.max(10)
			.default(4)
			.meta(monitorMeta({ label: "Count", description: "The number of pings to send", required: false })),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(monitorMeta({ label: "Timeout", description: "The ping timeout to use", required: false })),
	}),

	DNS: z.object({
		domain: z
			.string()
			.min(1)
			.meta(monitorMeta({ label: "Domain", description: "The domain to resolve", required: true })),
		recordType: z
			.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "SRV", "PTR", "CAA"])
			.default("A")
			.meta(monitorMeta({ label: "Record Type", description: "The DNS record type to query", required: false })),
		expectedValue: z
			.string()
			.optional()
			.meta(monitorMeta({ label: "Expected Value", description: "The expected value of the record", required: false })),
		resolver: z
			.string()
			.optional()
			.meta(monitorMeta({ label: "Resolver", description: "A custom DNS resolver to use", required: false })),
	}),

	DOCKER: z.object({
		containerName: z
			.string()
			.min(1)
			.meta(monitorMeta({ label: "Container Name", description: "The name of the container to monitor", required: true })),
		socketPath: z
			.string()
			.default("/var/run/docker.sock")
			.meta(monitorMeta({ label: "Socket Path", description: "The path to the Docker socket", required: false })),
	}),

	// Database monitors
	MYSQL: z
		.object({
			connectionString: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						label: "Connection URI",
						description: "mysql://user:password@host:3306/database",
						required: false,
					}),
				),
			host: z
				.string()
				.min(1)
				.optional()
				.meta(monitorMeta({ label: "Host", description: "The database host", required: false })),
			port: z
				.number()
				.int()
				.default(3306)
				.optional()
				.meta(monitorMeta({ label: "Port", description: "The database port", required: false })),
			username: z
				.string()
				.min(1)
				.optional()
				.meta(monitorMeta({ label: "Username", description: "The database username", required: false })),
			password: z
				.string()
				.optional()
				.meta(monitorMeta({ label: "Password", description: "The database password", required: false })),
			database: z
				.string()
				.optional()
				.meta(monitorMeta({ label: "Database", description: "The database to connect to", required: false })),
			query: z
				.string()
				.default("SELECT 1")
				.meta(monitorMeta({ label: "Query", description: "The health-check query to run", required: false })),
			timeout: z
				.number()
				.min(1_000)
				.max(10_000)
				.default(5_000)
				.meta(monitorMeta({ label: "Timeout", description: "The connection timeout to use", required: false })),
		})
		.superRefine((data, ctx) => {
			if (hasConnectionUri(data)) return;
			requireWithoutUri(data, ctx, [
				{ key: "host", message: "Host is required when no connection URI is provided" },
				{ key: "username", message: "Username is required when no connection URI is provided" },
			]);
		}),

	POSTGRESQL: z
		.object({
			connectionString: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						label: "Connection URI",
						description: "postgresql://user:password@host:5432/database",
						required: false,
					}),
				),
			host: z
				.string()
				.min(1)
				.optional()
				.meta(monitorMeta({ label: "Host", description: "The database host", required: false })),
			port: z
				.number()
				.int()
				.default(5432)
				.optional()
				.meta(monitorMeta({ label: "Port", description: "The database port", required: false })),
			username: z
				.string()
				.min(1)
				.optional()
				.meta(monitorMeta({ label: "Username", description: "The database username", required: false })),
			password: z
				.string()
				.optional()
				.meta(monitorMeta({ label: "Password", description: "The database password", required: false })),
			database: z
				.string()
				.min(1)
				.optional()
				.meta(monitorMeta({ label: "Database", description: "The database to connect to", required: false })),
			query: z
				.string()
				.default("SELECT 1")
				.meta(monitorMeta({ label: "Query", description: "The health-check query to run", required: false })),
			ssl: z
				.boolean()
				.default(false)
				.meta(monitorMeta({ label: "SSL", description: "Whether to use an SSL connection", required: false })),
			timeout: z
				.number()
				.min(1_000)
				.max(10_000)
				.default(5_000)
				.meta(monitorMeta({ label: "Timeout", description: "The connection timeout to use", required: false })),
		})
		.superRefine((data, ctx) => {
			if (hasConnectionUri(data)) return;
			requireWithoutUri(data, ctx, [
				{ key: "host", message: "Host is required when no connection URI is provided" },
				{ key: "username", message: "Username is required when no connection URI is provided" },
				{ key: "password", message: "Password is required when no connection URI is provided" },
				{ key: "database", message: "Database is required when no connection URI is provided" },
			]);
		}),

	MONGODB: z.object({
		connectionString: z
			.string()
			.min(1)
			.meta(
				monitorMeta({
					label: "Connection URI",
					description: "mongodb://user:password@host:27017/database",
					required: true,
				}),
			),
		timeout: z
			.number()
			.min(1_000)
			.max(10_000)
			.default(5_000)
			.meta(monitorMeta({ label: "Timeout", description: "The connection timeout to use", required: false })),
	}),

	REDIS: z
		.object({
			connectionString: z
				.string()
				.optional()
				.meta(
					monitorMeta({
						label: "Connection URI",
						description: "redis://:password@host:6379/0",
						required: false,
					}),
				),
			host: z
				.string()
				.min(1)
				.optional()
				.meta(monitorMeta({ label: "Host", description: "The Redis host", required: false })),
			port: z
				.number()
				.int()
				.default(6379)
				.optional()
				.meta(monitorMeta({ label: "Port", description: "The Redis port", required: false })),
			password: z
				.string()
				.optional()
				.meta(monitorMeta({ label: "Password", description: "The Redis password", required: false })),
			database: z
				.number()
				.int()
				.min(0)
				.max(15)
				.default(0)
				.optional()
				.meta(monitorMeta({ label: "Database", description: "The Redis database index", required: false })),
			command: z
				.string()
				.default("PING")
				.meta(monitorMeta({ label: "Command", description: "The health-check command to run", required: false })),
			timeout: z
				.number()
				.min(1_000)
				.max(10_000)
				.default(5_000)
				.meta(monitorMeta({ label: "Timeout", description: "The connection timeout to use", required: false })),
		})
		.superRefine((data, ctx) => {
			if (hasConnectionUri(data)) return;
			requireWithoutUri(data, ctx, [
				{ key: "host", message: "Host is required when no connection URI is provided" },
			]);
		}),
} as const satisfies Record<MonitorType, z.ZodSchema>;

export type MonitorSchema = typeof MONITOR_SCHEMA;

// Infer output types from zod schemas
type InferSchemaOutput<T extends z.ZodSchema> = z.infer<T>;

// Map each monitor type to its data type
export type MonitorDataMap = {
	[K in MonitorType]: K extends keyof typeof MONITOR_SCHEMA ? InferSchemaOutput<(typeof MONITOR_SCHEMA)[K]> : never;
};

// Discriminated union for monitor entries
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

// Union of all possible monitor entries - discriminated by the "type" field
export type MonitorStateEntry = {
	[K in MonitorType]: MonitorEntry<K>;
}[MonitorType];
