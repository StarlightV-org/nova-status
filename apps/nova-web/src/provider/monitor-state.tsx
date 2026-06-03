"use client";
import type { MonitorStatusDB } from "@novastatus/db/schema";
import type { MonitorStateEntry } from "@novastatus/lib/monitorTypes.js";
import { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./web-socket";
import { subSeconds } from "date-fns";

export type MonitorState = {
  [key: string]: MonitorStateEntry
};

type MonitorSocketUpdate = {
  monitorId: string;
  status: MonitorStatusDB["status"];
  responseTime: number;
  message?: string;
};

const MonitorStateContext = createContext<MonitorState>({});

export function useMonitorState() {
  return useContext(MonitorStateContext);
}

function applyMonitorUpdates(
  prev: MonitorState,
  updates: MonitorSocketUpdate[],
): MonitorState {
  let changed = false;
  const next = { ...prev };

  for (const update of updates) {
    const entry = next[update.monitorId];
    if (!entry) continue;

    const statusEntry: MonitorStatusDB = {
      id: `live-${update.monitorId}-${Date.now()}`,
      monitorId: update.monitorId,
      status: update.status,
      responseTime: update.responseTime,
      message: update.message ?? null,
      checkedAt: subSeconds(new Date(), 15),
    };

    next[update.monitorId] = {
      ...entry,
      states: [statusEntry, ...entry.states],
    };
    changed = true;
  }

  return changed ? next : prev;
}

export function MonitorStateProvider({ children, initialState }: { children: React.ReactNode; initialState: MonitorState }) {
  const [state, setState] = useState<MonitorState>(initialState);
  const socket = useSocket();



  useEffect(() => {
    if (!socket) return;

    socket.emit("monitors:subscribe-all", (success: boolean) => {
      if (success) {
        Print.Success("monitors:subscribe-all", "success");
      } else {
        Print.Error("monitors:subscribe-all", "failure");
      }
    });

    const onMonitorsAll = (updates: MonitorSocketUpdate[]) => {
      Print.Debug("monitors:all", updates);
      setState((prev) => applyMonitorUpdates(prev, updates));
    };

    socket.on("monitors:all", onMonitorsAll);

    return () => {
      socket.off("monitors:all", onMonitorsAll);
      socket.emit("monitors:unsubscribe-all", (success: boolean) => {
        if (success) {
          Print.Success("monitors:unsubscribe-all", "success");
        } else {
          Print.Error("monitors:unsubscribe-all", "failure");
        }
      });
    };
  }, [socket]);

  return <MonitorStateContext.Provider value={state}>{children}</MonitorStateContext.Provider>;
}
