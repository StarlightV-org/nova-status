/** Checks run every 30s, aligned to :00 and :30. */
export const CHECK_INTERVAL_SEC = 30;

/** Socket emits this many seconds after a check cycle starts (:15 and :45). */
export const SOCKET_EMIT_OFFSET_SEC = 15;

export const SOCKET_EMIT_OFFSET_MS = SOCKET_EMIT_OFFSET_SEC * 1000;

/**
 * When a check finishes it is written to the DB immediately, but the socket
 * broadcast is delayed until :15 / :45. During that window, tRPC should only
 * return data that has already been emitted so clients do not show a result
 * twice (once from tRPC, again from the socket).
 */
export function getPendingSocketEmitCutoff(now: Date = new Date()): Date | null {
	const seconds = now.getSeconds();

	if (seconds < SOCKET_EMIT_OFFSET_SEC) {
		const cutoff = new Date(now);
		cutoff.setSeconds(0, 0);
		return cutoff;
	}

	if (seconds >= CHECK_INTERVAL_SEC && seconds < CHECK_INTERVAL_SEC + SOCKET_EMIT_OFFSET_SEC) {
		const cutoff = new Date(now);
		cutoff.setSeconds(CHECK_INTERVAL_SEC, 0);
		return cutoff;
	}

	return null;
}
