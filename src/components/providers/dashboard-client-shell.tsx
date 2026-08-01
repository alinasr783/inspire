"use client";

import { RealtimeProvider, useRealtime } from "@/components/providers/realtime-provider";
import { CursorsOverlay } from "@/components/realtime/cursors-overlay";
import { DeviceTracker } from "@/components/devices/device-tracker";
import { PendingCountProvider } from "@/components/providers/pending-count-provider";

type ConnectionState = "connected" | "connecting" | "disconnected";

export { type ConnectionState };

function RealtimeShell({ children }: { children: React.ReactNode }) {
  const { cursors } = useRealtime();

  return (
    <>
      <CursorsOverlay cursors={cursors} />
      {children}
    </>
  );
}

export function DashboardClientShell({
  children,
  user,
  initialPending = 0,
}: {
  children: React.ReactNode;
  user: {
    id: string;
    firstName?: string;
    secondName?: string;
    email?: string;
    role?: string;
  } | null;
  initialPending?: number;
}) {
  if (!user) return <>{children}</>;

  return (
    <RealtimeProvider user={user}>
      <PendingCountProvider role={user.role} initialPending={initialPending}>
        <RealtimeShell>{children}</RealtimeShell>
        <DeviceTracker />
      </PendingCountProvider>
    </RealtimeProvider>
  );
}
