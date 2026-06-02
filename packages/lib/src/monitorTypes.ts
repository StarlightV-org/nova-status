export const MONITOR_TYPES = {
	STANDARD: [
		"HTTP",
		"HTTP+keyword",
		"TCP",
		"PING",
		"DNS",
		"DOCKER",
	],
	DATABASE: ["MYSQL", "POSTGRESQL", "MONGODB", "REDIS"],
} as const;

export type MonitorCategory = keyof typeof MONITOR_TYPES;
export type MonitorType = (typeof MONITOR_TYPES)[MonitorCategory][number];

export const MONITOR_TYPES_LIST = [
	...MONITOR_TYPES.STANDARD,
	...MONITOR_TYPES.DATABASE,
] as const satisfies readonly MonitorType[];

import { z } from "zod";

export const MONITOR_SCHEMA = {
	// Standard monitors
	HTTP: z.object({
		url: z.url(),
		method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).default("GET"),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.string().optional(),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	"HTTP+keyword": z.object({
		url: z.url(),
		method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).default("GET"),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.string().optional(),
		keyword: z.string().min(1),
		matchType: z.enum(["contains", "not_contains", "equals", "regex"]).default("contains"),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	TCP: z.object({
		host: z.string().min(1),
		port: z.number().int().min(1).max(65535),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	PING: z.object({
		host: z.string().min(1),
		count: z.number().int().min(1).max(10).default(4),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	DNS: z.object({
		domain: z.string().min(1),
		recordType: z.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "SRV", "PTR", "CAA"]).default("A"),
		expectedValue: z.string().optional(),
		resolver: z.string().optional(),
	}),

	DOCKER: z.object({
		containerName: z.string().min(1),
		socketPath: z.string().default("/var/run/docker.sock"),
	}),

	// Database monitors
	MYSQL: z.object({
		host: z.string().min(1),
		port: z.number().int().default(3306),
		username: z.string().min(1),
		password: z.string(),
		database: z.string().optional(),
		query: z.string().default("SELECT 1"),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	POSTGRESQL: z.object({
		host: z.string().min(1),
		port: z.number().int().default(5432),
		username: z.string().min(1),
		password: z.string(),
		database: z.string().min(1),
		query: z.string().default("SELECT 1"),
		ssl: z.boolean().default(false),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	MONGODB: z.object({
		connectionString: z.string().min(1),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),

	REDIS: z.object({
		host: z.string().min(1),
		port: z.number().int().default(6379),
		password: z.string().optional(),
		database: z.number().int().min(0).max(15).default(0),
		command: z.string().default("PING"),
		timeout: z.number().min(1000).max(60000).default(30000),
	}),
} as const satisfies Record<MonitorType, z.ZodSchema>;

export type MonitorSchema = typeof MONITOR_SCHEMA;
