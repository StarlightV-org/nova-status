import { tryCatch } from "@novastatus/lib"
import type { MonitorStateEntry } from "@novastatus/lib/monitorTypes.js"
import { AppSidebar } from "~/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { MonitorStateProvider, type MonitorState } from "~/provider/monitor-state"
import { SocketProvider } from "~/provider/web-socket"
import { api } from "~/trpc/server"

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
  const monitors = await tryCatch(api.monitor.get())

  const monitorState: MonitorState = (monitors.data ?? []).reduce<MonitorState>(
    (acc, monitor) => {
      acc[monitor.id] = {
        label: monitor.label,
        type: monitor.type,
        data: monitor.data,
        interval: monitor.interval,
        states: monitor.status,
      } as MonitorStateEntry
      return acc
    },
    {},
  )


  return (
    <SocketProvider>
      <MonitorStateProvider initialState={monitorState}>
        <SidebarProvider
          style={{ "--sidebar-width": "20%" } as React.CSSProperties}
        >
          <AppSidebar collapsible="none" />
          <SidebarInset>
            <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
              <SidebarTrigger className="-ml-1" />
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 overflow-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </MonitorStateProvider>
    </SocketProvider>
  )
}
