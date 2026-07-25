"use client";

import { useTranslations } from "next-intl";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

type ConnectionState = "connected" | "connecting" | "disconnected";

export function ConnectionStatus({
  state,
  onlineCount,
}: {
  state: ConnectionState;
  onlineCount: number;
}) {
  const t = useTranslations("Common");

  if (state === "disconnected") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  if (state === "connecting") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <Wifi className="h-3 w-3" />
      <span>{onlineCount} online</span>
    </div>
  );
}
