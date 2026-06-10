"use client";

import type { MonitorStatusDB } from "@novastatus/db/schema";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

const BEAT_W = 6;
const BEAT_H = 24;
const BEAT_GAP = 3;
const BEAT_STEP = BEAT_W + BEAT_GAP;
const HOVER_SCALE = 1.5;
const SLIDE_MS = 250;
const TRACK_H = BEAT_H * HOVER_SCALE;
const PAD_Y = (TRACK_H - BEAT_H) / 2;
const DEFAULT_MAX = 150;

const STATUS_COLOR: Record<MonitorStatusDB["status"], string> = {
	up: "bg-emerald-500",
	down: "bg-red-500",
	pending: "bg-orange-500",
	maintenance: "bg-blue-500",
};

function formatTime(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(date);
}

export function StatusTimeline({
	states,
	limit,
	className,
}: {
	states: MonitorStatusDB[];
	limit?: number;
	className?: string;
}) {
	const prevLen = useRef(states.length);
	const [enter, setEnter] = useState(false);
	const [tip, setTip] = useState<{ beat: MonitorStatusDB; x: number; y: number } | null>(null);

	// states are newest-first; flex-row-reverse keeps the newest beat pinned to the
	// right while older beats overflow (and clip) on the left, so the strip fills
	// whatever width is available without measuring it on the client.
	const beats = states.slice(0, limit ?? DEFAULT_MAX);

	useEffect(() => {
		if (states.length === prevLen.current) return;
		prevLen.current = states.length;
		setEnter(true);
		let raf2 = 0;
		const raf1 = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => setEnter(false));
		});
		return () => {
			cancelAnimationFrame(raf1);
			cancelAnimationFrame(raf2);
		};
	}, [states.length]);

	const showTip = (event: React.MouseEvent<HTMLSpanElement>, beat: MonitorStatusDB) => {
		const rect = event.currentTarget.getBoundingClientRect();
		setTip({ beat, x: rect.left + rect.width / 2, y: rect.top });
	};

	return (
		<>
			<div
				className={cn("min-w-0 overflow-hidden", className)}
				style={{ paddingBlock: PAD_Y }}
				role="img"
				aria-label={`Monitor status history, ${beats.length} checks`}
			>
				<div
					className="flex flex-row-reverse items-center justify-start will-change-transform"
					style={{
						height: TRACK_H,
						gap: BEAT_GAP,
						transform: enter ? `translateX(${BEAT_STEP}px)` : undefined,
						transition: enter ? "none" : `transform ${SLIDE_MS}ms ease-in-out`,
					}}
				>
					{beats.map((beat) => (
						// biome-ignore lint/a11y/noStaticElementInteractions: ok here
						<span
							key={beat.id}
							className={cn(
								"block shrink-0 cursor-default rounded-full transition-transform duration-100 hover:scale-150",
								STATUS_COLOR[beat.status],
							)}
							style={{ width: BEAT_W, height: BEAT_H }}
							onMouseEnter={(event) => showTip(event, beat)}
							onMouseMove={(event) => showTip(event, beat)}
							onMouseLeave={() => setTip(null)}
						/>
					))}
				</div>
			</div>

			{tip && (
				<div
					className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground capitalize shadow-md"
					style={{ left: tip.x, top: tip.y - 8 }}
				>
					{tip.beat.status} · {tip.beat.responseTime != null ? `${tip.beat.responseTime}ms` : "—"} ·{" "}
					{formatTime(new Date(tip.beat.checkedAt))}
				</div>
			)}
		</>
	);
}
