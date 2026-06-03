"use client";
import { useMonitorState } from "~/provider/monitor-state";

export function StatusComponent() {
  const monitorState = useMonitorState()

  return (
    <div>
      <div className="whitespace-break-spaces">

      {JSON.stringify(monitorState, null, 2)}
      </div>
      {Object.values(monitorState).map((entry) => (
        <div key={entry.label}>
          <h2>{entry.label}</h2>
          <p>{entry.states?.[0]?.status}</p>
        </div>
      ))}
    </div>
  );
}
