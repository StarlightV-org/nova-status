import { SocketProvider } from "~/provider/web-socket";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  );
}
