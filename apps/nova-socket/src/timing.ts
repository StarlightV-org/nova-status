const INTERVAL_MS = 30000; // 30 seconds

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

export function startChecker(checkerFn: () => Promise<void>) {
	if (timer) {
		Print.Warning("Checker already running");
		return;
	}

	const now = new Date();
	const seconds = now.getSeconds();
	const milliseconds = now.getMilliseconds();

	let targetSeconds: number;
	let targetMinutes = 0;

	if (seconds < 30) {
		targetSeconds = 30 - seconds;
	} else {
		targetSeconds = 60 - seconds;
		targetMinutes = 1;
	}

	const delayMs = targetSeconds * 1000 - milliseconds;

	Print.Info(`Starting checker. First run in ${delayMs}ms (at :${seconds < 30 ? "30" : "00"})`);

	// Schedule first run at the nearest 30s mark
	timer = setTimeout(() => {
		isRunning = true;
		checkerFn();

		// Then schedule regular 30s intervals
		timer = setInterval(() => {
			if (!isRunning) return;
			checkerFn();
		}, INTERVAL_MS);
	}, delayMs);
}

export function stopChecker() {
	isRunning = false;
	if (timer) {
		clearTimeout(timer);
		clearInterval(timer);
		timer = null;
	}
}

export function isCheckerRunning() {
	return isRunning;
}
