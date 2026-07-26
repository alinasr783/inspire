"use client";

import { RealtimeProvider, useRealtime } from "@/components/providers/realtime-provider";
import { CursorsOverlay } from "@/components/realtime/cursors-overlay";

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
}: {
  children: React.ReactNode;
  user: {
    id: string;
    firstName?: string;
    secondName?: string;
    email?: string;
    role?: string;
  } | null;
}) {
  if (!user) return <>{children}</>;

  return (
    <RealtimeProvider user={user}>
      <RealtimeShell>{children}</RealtimeShell>
    </RealtimeProvider>
  );
}
