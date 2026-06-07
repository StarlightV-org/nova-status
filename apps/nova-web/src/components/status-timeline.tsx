"use client";

import type { MonitorStatusDB } from "@novastatus/db/schema";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "~/lib/utils";

type Beat = MonitorStatusDB | null;

const BEAT_W = 6;
const BEAT_H = 24;
const BEAT_GAP = 3;
const BEAT_STEP = BEAT_W + BEAT_GAP;
const HOVER_SCALE = 1.5;
const SLIDE_MS = 250;
const EMPTY = "#52525b80";

const COLORS = {
	up: "#10b981",
	down: "#ef4444",
	pending: "#f97316",
	maintenance: "#3b82f6",
} as const;

function formatTime(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(date);
}

function beatColor(status: MonitorStatusDB["status"]) {
	return COLORS[status];
}

function buildBeats(states: MonitorStatusDB[], max: number, move: boolean): Beat[] {
	const oldestFirst = [...states].reverse();
	let start = oldestFirst.length - max;
	if (move) start -= 1;

	const pad: Beat[] = [];
	if (start < 0) {
		for (let i = start; i < 0; i++) pad.push(null);
		start = 0;
	}

	return pad.concat(oldestFirst.slice(start));
}

function drawBeat(ctx: CanvasRenderingContext2D, x: number, centerY: number, beat: Beat | undefined, hovered: boolean) {
	let w = BEAT_W;
	let h = BEAT_H;
	let ox = x;
	let oy = centerY - h / 2;

	if (hovered && beat) {
		w *= HOVER_SCALE;
		h *= HOVER_SCALE;
		ox = x - (w - BEAT_W) / 2;
		oy = centerY - h / 2;
	}

	ctx.fillStyle = beat ? beatColor(beat.status) : EMPTY;
	ctx.beginPath();
	ctx.roundRect(ox, oy, w, h, w / 2);
	ctx.fill();
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
	const wrapRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const prevLen = useRef(states.length);

	const [fitBeat, setFitBeat] = useState(limit ?? 40);
	const [move, setMove] = useState(false);
	const [hover, setHover] = useState(-1);
	const [tip, setTip] = useState<{ beat: MonitorStatusDB; x: number; y: number } | null>(null);

	const maxBeat = limit != null ? Math.min(limit, fitBeat) : fitBeat;
	const beats = useMemo(() => buildBeats(states, maxBeat, move), [states, maxBeat, move]);
	const sliding = move && beats.length > maxBeat;
	const canvasW = beats.length * BEAT_STEP;
	const canvasH = BEAT_H * HOVER_SCALE;
	const padY = (canvasH - BEAT_H) / 2;

	useLayoutEffect(() => {
		const el = wrapRef.current;
		if (!el) return;

		const update = () => setFitBeat(Math.max(1, Math.floor(el.clientWidth / BEAT_STEP)));
		update();

		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		if (states.length === prevLen.current) return;
		prevLen.current = states.length;
		setMove(true);
		const t = window.setTimeout(() => setMove(false), SLIDE_MS);
		return () => window.clearTimeout(t);
	}, [states.length]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = canvasW * dpr;
		canvas.height = canvasH * dpr;
		canvas.style.width = `${canvasW}px`;
		canvas.style.height = `${canvasH}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, canvasW, canvasH);

		const centerY = canvasH / 2;
		for (let i = 0; i < beats.length; i++) {
			const x = i * BEAT_STEP + BEAT_GAP / 2;
			drawBeat(ctx, x, centerY, beats[i], i === hover);
		}
	}, [beats, canvasW, canvasH, hover]);

	const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		const bar = canvas?.parentElement;
		if (!canvas || !bar) return;

		const barRect = bar.getBoundingClientRect();
		const x = e.clientX - barRect.left;
		const i = Math.floor(x / BEAT_STEP);
		const beat = beats[i];

		if (!beat || i < 0 || i >= beats.length) {
			setHover(-1);
			setTip(null);
			return;
		}

		if (hover !== i) setHover(i);

		const canvasRect = canvas.getBoundingClientRect();
		setTip({
			beat,
			x: canvasRect.left + i * BEAT_STEP + BEAT_STEP / 2,
			y: canvasRect.top + padY,
		});
	};

	return (
		<>
			<div
				ref={wrapRef}
				className={cn("min-w-0 overflow-hidden", className)}
				style={{ minHeight: canvasH + padY * 2, paddingBlock: padY }}
			>
				<div
					className="will-change-transform"
					style={{
						transform: sliding ? `translateX(${-BEAT_STEP}px)` : undefined,
						transition: sliding ? `transform ${SLIDE_MS}ms ease-in-out` : undefined,
					}}
				>
					<canvas
						ref={canvasRef}
						className="block cursor-default"
						style={{ width: canvasW, height: canvasH }}
						role="img"
						aria-label={`Monitor status history, ${Math.min(states.length, maxBeat)} checks`}
						onMouseMove={onMouseMove}
						onMouseLeave={() => {
							setHover(-1);
							setTip(null);
						}}
					/>
				</div>
			</div>

			{tip && (
				<div
					className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground capitalize shadow-md"
					style={{ left: tip.x, top: tip.y - 8 }}
				>
					{tip.beat.status} · {tip.beat.responseTime != null ? `${tip.beat.responseTime}ms` : "—"} ·{" "}
					{formatTime(tip.beat.checkedAt)}
				</div>
			)}
		</>
	);
}
