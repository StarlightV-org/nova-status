const INTERVAL_MS = 30000; // 30 seconds
const CHECKER_CYCLE_TIMEOUT_MS = 120000; // 2 minutes max per checker cycle

let initialTimeout: NodeJS.Timeout | null = null;
let intervalTimer: NodeJS.Timeout | null = null;
let isRunning = false;
let checkerInFlight = false;

async function runChecker(checkerFn: () => Promise<void>) {
	if (checkerInFlight) {
		Print.Warning("Checker still running from previous tick, skipping");
		return;
	}

	checkerInFlight = true;

	let cycleTimeout: NodeJS.Timeout | undefined;

	try {
		await Promise.race([
			checkerFn(),
			new Promise<never>((_, reject) => {
				cycleTimeout = setTimeout(() => {
					reject(new Error(`Checker cycle timed out after ${CHECKER_CYCLE_TIMEOUT_MS / 1000}s`));
				}, CHECKER_CYCLE_TIMEOUT_MS);
			}),
		]);
	} catch (error) {
		Print.Error("Checker failed:", error);
	} finally {
		if (cycleTimeout) clearTimeout(cycleTimeout);
		checkerInFlight = false;
	}
}

export function startChecker(checkerFn: () => Promise<void>) {
	if (initialTimeout || intervalTimer) {
		Print.Warning("Checker already running");
		return;
	}

	const now = new Date();
	const seconds = now.getSeconds();
	const milliseconds = now.getMilliseconds();

	let targetSeconds: number;

	if (seconds < 30) {
		targetSeconds = 30 - seconds;
	} else {
		targetSeconds = 60 - seconds;
	}

	const delayMs = targetSeconds * 1000 - milliseconds;

	Print.Info(`Starting checker. First run in ${delayMs}ms (at :${seconds < 30 ? "30" : "00"})`);

	const tick = () => {
		void runChecker(checkerFn);
	};

	// Schedule first run at the nearest 30s mark
	initialTimeout = setTimeout(() => {
		initialTimeout = null;
		isRunning = true;
		tick();

		intervalTimer = setInterval(() => {
			if (!isRunning) return;
			tick();
		}, INTERVAL_MS);
	}, delayMs);
}

export function stopChecker() {
	isRunning = false;
	checkerInFlight = false;

	if (initialTimeout) {
		clearTimeout(initialTimeout);
		initialTimeout = null;
	}

	if (intervalTimer) {
		clearInterval(intervalTimer);
		intervalTimer = null;
	}
}

export function isCheckerRunning() {
	return isRunning;
}
