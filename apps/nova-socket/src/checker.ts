import { db } from "@novastatus/db";
import { monitorStatus, type MonitorDB } from "@novastatus/db/schema";
import type { MonitorStatusSocketPayload } from "@novastatus/lib/monitorSocket.ts";
import { MONITOR_SCHEMA, type MonitorType } from "@novastatus/lib/monitorTypes.ts";
import { SOCKET_EMIT_OFFSET_MS } from "@novastatus/lib/checkTiming.ts";
import { type MonitorUptime, uptimeForMonitors } from "@novastatus/lib/uptime.ts";
import { getMonitorNamespace } from "~/io/monito-space";
import net from "node:net";
import * as dns from "node:dns/promises";
import { spawn } from "node:child_process";
import type { Resolver } from "node:dns";

const CHECK_TIMEOUT_MS = 10000; // 10 seconds max for each check

// Store pending results to emit at the right time
interface PendingResult {
	monitorId: string;
	status: "up" | "down" | "degraded";
	responseTime: number;
	message?: string;
}

const pendingResults: PendingResult[] = [];
let emitTimer: NodeJS.Timeout | null = null;

export default async function checker() {
	try {
		const now = new Date();
		const nowSeconds = now.getMinutes() * 60 + now.getSeconds();

		// Get all monitors where interval is a multiple of 30 and current time is a multiple of their interval
		const allMonitors = await db.query.monitors.findMany({
			where: (monitor, { not, eq }) => not(eq(monitor.type, "GROUP")),
		});

		const monitorsToExecute = allMonitors.filter((monitor) => {
			// Only support intervals that are multiples of 30
			if (monitor.interval % 30 !== 0) return false;

			// Check if this monitor should run now
			// A monitor with interval X should run when nowSeconds % X === 0
			return nowSeconds % monitor.interval === 0;
		});

		if (monitorsToExecute.length === 0) return;

		Print.Debug(`Executing ${monitorsToExecute.length} monitors`);

		// Schedule emit at :15 or :45
		scheduleEmit();

		// Create promises for all monitors (fresh row loaded per monitor before check)
		const promises = monitorsToExecute.map((monitor) => executeMonitorWithTimeout(monitor.id));

		// Execute all monitors concurrently and wait for all to settle
		const results = await Promise.allSettled(promises);

		// Collect results
		results.forEach((result, index) => {
			const monitorId = monitorsToExecute[index]!.id;
			if (result.status === "fulfilled") {
				if (result.value === null) return;
				pendingResults.push({
					monitorId,
					...result.value,
				});
			} else {
				const label = monitorsToExecute[index]!.label;
				Print.Error(`Monitor ${monitorId} (${label}) failed:`, result.reason);
				pendingResults.push({
					monitorId,
					status: "down",
					responseTime: CHECK_TIMEOUT_MS,
					message: result.reason instanceof Error ? result.reason.message : "Check failed",
				});
			}
		});
	} catch (error) {
		Print.Error("Checker cycle failed:", error);
		throw error;
	}
}

function scheduleEmit() {
	// Clear any existing timer
	if (emitTimer) {
		clearTimeout(emitTimer);
	}

	// Schedule emit at :15 or :45
	emitTimer = setTimeout(() => {
		void emitAllResults();
	}, SOCKET_EMIT_OFFSET_MS);
}

const DEFAULT_UPTIME: MonitorUptime = {
	total: 100,
	last1day: 100,
	last7days: 100,
};

async function emitAllResults() {
	if (pendingResults.length === 0) return;

	try {
		const timestamp = new Date().toISOString();
		const monitorIds = [...new Set(pendingResults.map((result) => result.monitorId))];
		const uptimeByMonitorId = await uptimeForMonitors(db, monitorIds);

		const enrichedResults: MonitorStatusSocketPayload[] = pendingResults.map((result) => ({
			monitorId: result.monitorId,
			status: result.status === "degraded" ? "down" : result.status,
			responseTime: result.responseTime,
			message: result.message,
			timestamp,
			uptime: uptimeByMonitorId.get(result.monitorId) ?? DEFAULT_UPTIME,
		}));

		const monitorNs = getMonitorNamespace();
		if (monitorNs) {
			monitorNs.emit("monitors:all", enrichedResults);
		}

		Print.Debug(`Emitted batch of ${enrichedResults.length} monitor results`);
	} catch (error) {
		Print.Error("Failed to emit monitor results:", error);
	} finally {
		pendingResults.length = 0;
	}
}

async function getMonitorForExecution(monitorId: string): Promise<MonitorDB | null> {
	const monitor = await db.query.monitors.findFirst({
		where: (m, { eq }) => eq(m.id, monitorId),
	});
	if (!monitor || monitor.type === "GROUP") return null;
	return monitor;
}

type MonitorCheckResult = {
	status: "up" | "down" | "degraded";
	responseTime: number;
	message?: string;
};

async function executeMonitorWithTimeout(monitorId: string): Promise<MonitorCheckResult | null> {
	const monitor = await getMonitorForExecution(monitorId);
	if (!monitor) return null;

	let timedOut = false;

	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			timedOut = true;
			reject(new Error("Check timeout - exceeded 10 seconds"));
		}, CHECK_TIMEOUT_MS);

		executeMonitor(monitor)
			.then((result) => {
				if (timedOut) return;
				clearTimeout(timeoutId);
				resolve(result);
			})
			.catch((error) => {
				if (timedOut) return;
				clearTimeout(timeoutId);
				reject(error);
			});
	});
}

async function executeMonitor(
	monitor: MonitorDB,
): Promise<{ status: "up" | "down" | "degraded"; responseTime: number; message?: string }> {
	const type = monitor.type as MonitorType;

	// Validate the monitor data against the Zod schema
	const schema = MONITOR_SCHEMA[type as keyof typeof MONITOR_SCHEMA];
	if (!schema) {
		throw new Error(`Unknown monitor type: ${type}`);
	}

	const parseResult = schema.safeParse(monitor.data);
	if (!parseResult.success) {
		throw new Error(`Invalid monitor data for ${type}: ${parseResult.error.message}`);
	}

	const data = parseResult.data;
	const startTime = Date.now();

	let result: {
		status: "up" | "down";
		responseTime: number;
		message?: string;
	};

	try {
		switch (type) {
			case "HTTP":
				result = await checkHTTP(
					data as {
						url: string;
						method: string;
						headers?: Record<string, string>;
						body?: string;
						timeout: number;
						acceptedStatusCodes?: number[];
					},
				);
				break;
			case "HTTP+keyword":
				result = await checkHTTPKeyword(
					data as {
						url: string;
						method: string;
						headers?: Record<string, string>;
						body?: string;
						keyword: string;
						matchType: string;
						timeout: number;
					},
				);
				break;
			case "TCP":
				result = await checkTCP(data as { host: string; port: number; timeout: number });
				break;
			case "PING":
				result = await checkPing(data as { host: string; count: number; timeout: number });
				break;
			case "DNS":
				result = await checkDNS(data as { domain: string; recordType: string; expectedValue?: string; resolver?: string });
				break;
			case "DOCKER":
				result = await checkDocker(data as { containerName: string; socketPath: string });
				break;
			case "MYSQL":
				result = await checkMySQL(
					data as {
						connectionString?: string;
						host?: string;
						port?: number;
						username?: string;
						password?: string;
						database?: string;
						query: string;
						timeout: number;
					},
				);
				break;
			case "POSTGRESQL":
				result = await checkPostgreSQL(
					data as {
						connectionString?: string;
						host?: string;
						port?: number;
						username?: string;
						password?: string;
						database?: string;
						query: string;
						ssl?: boolean;
						timeout: number;
					},
				);
				break;
			case "MONGODB":
				result = await checkMongoDB(data as { connectionString: string; timeout: number });
				break;
			case "REDIS":
				result = await checkRedis(
					data as {
						connectionString?: string;
						host?: string;
						port?: number;
						password?: string;
						database?: number;
						command: string;
						timeout: number;
					},
				);
				break;
			default:
				throw new Error(`Unimplemented monitor type: ${type}`);
		}
	} catch (error) {
		result = {
			status: "down",
			responseTime: Date.now() - startTime,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}

	// Insert status record into monitorStatus table
	await db.insert(monitorStatus).values({
		monitorId: monitor.id,
		status: result.status,
		responseTime: result.responseTime,
		message: result.message,
		checkedAt: new Date(),
	});

	return result;
}

function isHttpStatusAccepted(status: number, acceptedStatusCodes?: number[]): boolean {
	if (acceptedStatusCodes && acceptedStatusCodes.length > 0) {
		return acceptedStatusCodes.includes(status);
	}
	return status >= 200 && status < 300;
}

// MARK: HTTP Check
async function checkHTTP(data: {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: string;
	timeout: number;
	acceptedStatusCodes?: number[];
}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), Math.min(data.timeout, CHECK_TIMEOUT_MS));
	const startTime = Date.now();

	try {
		const response = await fetch(data.url, {
			method: data.method,
			headers: data.headers,
			body: data.body,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		const responseTime = Date.now() - startTime;
		const accepted = isHttpStatusAccepted(response.status, data.acceptedStatusCodes);

		return {
			status: accepted ? ("up" as const) : ("down" as const),
			responseTime,
			message: accepted ? undefined : `HTTP ${response.status}: ${response.statusText}`,
		};
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

// MARK: HTTP+Keyword Check
async function checkHTTPKeyword(data: {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: string;
	keyword: string;
	matchType: string;
	timeout: number;
}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), Math.min(data.timeout, CHECK_TIMEOUT_MS));
	const startTime = Date.now();

	try {
		const response = await fetch(data.url, {
			method: data.method,
			headers: data.headers,
			body: data.body,
			signal: controller.signal,
		});

		const body = await response.text();
		clearTimeout(timeoutId);

		let keywordMatch = false;
		switch (data.matchType) {
			case "contains":
				keywordMatch = body.includes(data.keyword);
				break;
			case "not_contains":
				keywordMatch = !body.includes(data.keyword);
				break;
			case "equals":
				keywordMatch = body === data.keyword;
				break;
			case "regex":
				keywordMatch = new RegExp(data.keyword).test(body);
				break;
		}

		const responseTime = Date.now() - startTime;
		const status = response.ok && keywordMatch ? "up" : "down";

		return {
			status: status as "up" | "down",
			responseTime,
			message: !response.ok
				? `HTTP ${response.status}`
				: !keywordMatch
					? `Keyword "${data.keyword}" not found`
					: undefined,
		};
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

// MARK: TCP Check
async function checkTCP(data: {
	host: string;
	port: number;
	timeout: number;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();
		const socket = new net.Socket();

		socket.setTimeout(Math.min(data.timeout, CHECK_TIMEOUT_MS));

		socket.on("connect", () => {
			const responseTime = Date.now() - startTime;
			socket.destroy();
			resolve({ status: "up", responseTime });
		});

		socket.on("timeout", () => {
			socket.destroy();
			reject(new Error("TCP connection timeout"));
		});

		socket.on("error", (err) => {
			socket.destroy();
			reject(err);
		});

		socket.connect(data.port, data.host);
	});
}

// MARK: PING Check
async function checkPing(data: {
	host: string;
	count: number;
	timeout: number;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();
		const isWindows = process.platform === "win32";
		const command = isWindows ? "ping" : "ping";
		const args = isWindows
			? ["-n", data.count.toString(), "-w", Math.min(data.timeout, CHECK_TIMEOUT_MS).toString(), data.host]
			: [
					"-c",
					data.count.toString(),
					"-W",
					Math.ceil(Math.min(data.timeout, CHECK_TIMEOUT_MS) / 1000).toString(),
					data.host,
				];

		const ping = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

		let output = "";
		ping.stdout?.on("data", (data: Buffer) => {
			output += data.toString();
		});
		ping.stderr?.on("data", (data: Buffer) => {
			output += data.toString();
		});

		ping.on("close", (code) => {
			const responseTime = Date.now() - startTime;
			if (code === 0) {
				resolve({ status: "up", responseTime });
			} else {
				resolve({ status: "down", responseTime, message: `Ping failed: ${output}` });
			}
		});

		ping.on("error", (err) => {
			reject(err);
		});
	});
}

// MARK: DNS Check
async function checkDNS(data: {
	domain: string;
	recordType: string;
	expectedValue?: string;
	resolver?: string;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	const startTime = Date.now();

	try {
		let resolver: typeof dns | Resolver = dns;
		if (data.resolver) {
			// Import Resolver from dns (not dns/promises) since it has the class
			const { Resolver: DnsResolver } = await import("node:dns");
			const customResolver = new DnsResolver();
			customResolver.setServers([data.resolver]);
			resolver = customResolver;
		}

		const records = await resolver.resolve(data.domain, data.recordType as any);
		const responseTime = Date.now() - startTime;

		// If expected value is provided, check if it matches
		if (data.expectedValue && !records?.includes(data.expectedValue)) {
			return {
				status: "down",
				responseTime,
				message: `Expected ${data.expectedValue}, got ${records?.join(", ")}`,
			};
		}

		return { status: "up", responseTime };
	} catch (error) {
		throw new Error(`DNS lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

// MARK: Docker Check
async function checkDocker(data: {
	containerName: string;
	socketPath: string;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	const startTime = Date.now();

	// Using Docker Engine API via Unix socket
	const http: typeof import("http") = await import("node:http");

	return new Promise((resolve, reject) => {
		const options: import("http").RequestOptions = {
			socketPath: data.socketPath,
			path: `/v1.24/containers/${data.containerName}/json`,
			method: "GET",
			timeout: CHECK_TIMEOUT_MS,
		};

		const req = http.request(options, (res) => {
			let body = "";
			res.on("data", (chunk: string | Buffer) => (body += chunk.toString()));
			res.on("end", () => {
				const responseTime = Date.now() - startTime;
				if (res.statusCode === 200) {
					try {
						const container = JSON.parse(body) as { State?: { Running?: boolean; Status?: string } };
						const isRunning = container.State?.Running === true;
						resolve({
							status: isRunning ? "up" : "down",
							responseTime,
							message: isRunning ? undefined : `Container is ${container.State?.Status ?? "unknown"}`,
						});
					} catch (err) {
						resolve({ status: "down", responseTime, message: "Invalid JSON response" });
					}
				} else {
					resolve({ status: "down", responseTime, message: `HTTP ${res.statusCode ?? "unknown"}` });
				}
			});
		});

		req.on("error", (err) => {
			reject(err);
		});

		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Docker API timeout"));
		});

		req.end();
	});
}

// MARK: MySQL Check
async function checkMySQL(data: {
	connectionString?: string;
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: string;
	query: string;
	timeout: number;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	// Dynamic import mysql2 to avoid bundling issues
	const mysql = await import("mysql2/promise");
	const startTime = Date.now();

	const connection = data.connectionString
		? await mysql.createConnection(data.connectionString)
		: await mysql.createConnection({
				host: data.host,
				port: data.port ?? 3306,
				user: data.username,
				password: data.password,
				database: data.database,
				connectTimeout: Math.min(data.timeout, CHECK_TIMEOUT_MS),
			});

	try {
		await connection.execute(data.query);
		const responseTime = Date.now() - startTime;
		await connection.end();
		return { status: "up", responseTime };
	} catch (error) {
		await connection.end();
		throw error;
	}
}

// MARK: PostgreSQL Check
async function checkPostgreSQL(data: {
	connectionString?: string;
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: string;
	query: string;
	ssl?: boolean;
	timeout: number;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	// Dynamic import pg to avoid bundling issues
	const { Client } = await import("pg");
	const startTime = Date.now();

	const client = data.connectionString
		? new Client({
				connectionString: data.connectionString,
				connectionTimeoutMillis: Math.min(data.timeout, CHECK_TIMEOUT_MS),
			})
		: new Client({
				host: data.host,
				port: data.port ?? 5432,
				user: data.username,
				password: data.password,
				database: data.database,
				ssl: data.ssl ?? false,
				connectionTimeoutMillis: Math.min(data.timeout, CHECK_TIMEOUT_MS),
			});

	try {
		await client.connect();
		await client.query(data.query);
		const responseTime = Date.now() - startTime;
		await client.end();
		return { status: "up", responseTime };
	} catch (error) {
		await client.end();
		throw error;
	}
}

// MARK: MongoDB Check
async function checkMongoDB(data: {
	connectionString: string;
	timeout: number;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	// Dynamic import mongodb to avoid bundling issues
	const { MongoClient } = await import("mongodb");
	const startTime = Date.now();

	const client = new MongoClient(data.connectionString, {
		serverSelectionTimeoutMS: Math.min(data.timeout, CHECK_TIMEOUT_MS),
	});

	try {
		await client.connect();
		await client.db().admin().ping();
		const responseTime = Date.now() - startTime;
		await client.close();
		return { status: "up", responseTime };
	} catch (error) {
		await client.close();
		throw error;
	}
}

// MARK: Redis Check
async function checkRedis(data: {
	connectionString?: string;
	host?: string;
	port?: number;
	password?: string;
	database?: number;
	command: string;
	timeout: number;
}): Promise<{ status: "up" | "down"; responseTime: number; message?: string }> {
	// Dynamic import ioredis to avoid bundling issues
	const { Redis } = await import("ioredis");
	const startTime = Date.now();

	const redis = data.connectionString
		? new Redis(data.connectionString, {
				connectTimeout: Math.min(data.timeout, CHECK_TIMEOUT_MS),
				commandTimeout: Math.min(data.timeout, CHECK_TIMEOUT_MS),
				lazyConnect: true,
			})
		: new Redis({
				host: data.host,
				port: data.port ?? 6379,
				password: data.password,
				db: data.database ?? 0,
				connectTimeout: Math.min(data.timeout, CHECK_TIMEOUT_MS),
				commandTimeout: Math.min(data.timeout, CHECK_TIMEOUT_MS),
				lazyConnect: true,
			});

	try {
		await redis.connect();
		await redis.ping();
		const responseTime = Date.now() - startTime;
		redis.disconnect();
		return { status: "up", responseTime };
	} catch (error) {
		redis.disconnect();
		throw error;
	}
}
