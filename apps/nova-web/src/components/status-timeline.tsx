"use client";



import type { MonitorStatusDB } from "@novastatus/db/schema";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { useId, useMemo } from "react";



import {

  Tooltip,

  TooltipContent,

  TooltipProvider,

  TooltipTrigger,

} from "~/components/ui/tooltip";

import { cn } from "~/lib/utils";



type TimelineSlot =

  | { kind: "empty"; key: string }

  | {

    kind: "status";

    key: string;

    status: MonitorStatusDB["status"];

    checkedAt: Date;

    responseTime: number | null;

  };



function buildTimelineSlots(

  states: MonitorStatusDB[],

  limit: number,

  timelineId: string,

): TimelineSlot[] {

  const recent = states.slice(0, limit);

  const chronological = [...recent].reverse();

  const emptyCount = limit - chronological.length;



  const emptySlots: TimelineSlot[] = Array.from({ length: emptyCount }, (_, i) => ({

    kind: "empty",

    key: `${timelineId}-ph-${i}`,

  }));



  const statusSlots: TimelineSlot[] = chronological.map((entry) => ({

    kind: "status",

    key: entry.id,

    status: entry.status,

    checkedAt: entry.checkedAt,

    responseTime: entry.responseTime,

  }));



  return [...emptySlots, ...statusSlots];

}



const statusPillClasses: Record<MonitorStatusDB["status"], string> = {
  up: "bg-emerald-500",
  down: "bg-red-500",
  degraded: "bg-amber-500",
  pending: "bg-orange-500",
  maintenance: "bg-blue-500",
};



function formatCheckedAt(date: Date): string {

  return new Intl.DateTimeFormat(undefined, {

    month: "short",

    day: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    second: "2-digit",

  }).format(date);

}



const pillTransition = {

  layout: { type: "spring" as const, stiffness: 500, damping: 35 },

  opacity: { duration: 0.2 },

  scaleY: { type: "spring" as const, stiffness: 500, damping: 30 },

  x: { type: "spring" as const, stiffness: 500, damping: 30 },

};



function StatusPill({

  slot,

  timelineId,

}: {

  slot: TimelineSlot;

  timelineId: string;

}) {

  const isEmpty = slot.kind === "empty";

  const layoutId = isEmpty ? undefined : `${timelineId}-${slot.key}`;



  const pill = (

    <motion.div

      layout

      layoutId={layoutId}

      initial={{ opacity: 0, scaleY: 0.4, x: 6 }}

      animate={{ opacity: 1, scaleY: 1, x: 0 }}

      exit={{ opacity: 0, scaleY: 0.4, x: -6 }}

      transition={pillTransition}

      className={cn(

        "h-6 w-1.5 shrink-0 rounded-full",

        isEmpty ? "bg-zinc-600/50" : statusPillClasses[slot.status],

      )}

      aria-hidden={isEmpty}

    />

  );



  const wrapperClass = "inline-flex shrink-0";



  if (isEmpty) {

    return <div className={wrapperClass}>{pill}</div>;

  }



  const responseLabel =

    slot.responseTime != null ? `${slot.responseTime}ms` : "—";



  return (

    <Tooltip>

      <TooltipTrigger asChild>

        <button

          type="button"

          className={cn(

            wrapperClass,

            "cursor-default rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",

          )}

        >

          {pill}

        </button>

      </TooltipTrigger>

      <TooltipContent side="top" className="capitalize">

        {slot.status} · {responseLabel} · {formatCheckedAt(slot.checkedAt)}

      </TooltipContent>

    </Tooltip>

  );

}



export function StatusTimeline({

  states,

  limit = 30,

  timelineId: timelineIdProp,

  className,

}: {

  states: MonitorStatusDB[];

  limit?: number;

  timelineId?: string;

  className?: string;

}) {

  const autoId = useId();

  const timelineId = timelineIdProp ?? autoId;



  const slots = useMemo(

    () => buildTimelineSlots(states, limit, timelineId),

    [states, limit, timelineId],

  );

  const filledCount = Math.min(states.length, limit);



  return (

    <TooltipProvider delayDuration={200}>

      <div

        className={cn("flex items-center gap-0.75", className)}

        role="img"

        aria-label={`Monitor status history, ${filledCount} of ${limit} checks`}

      >

        <LayoutGroup id={timelineId}>

          <AnimatePresence mode="popLayout" initial={false}>

            {slots.map((slot) => (

              <StatusPill

                key={slot.key}

                slot={slot}

                timelineId={timelineId}

              />

            ))}

          </AnimatePresence>

        </LayoutGroup>

      </div>

    </TooltipProvider>

  );

}
