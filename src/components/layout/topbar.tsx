"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { OnlineAvatars } from "@/components/realtime/online-avatars";
import { useRealtime } from "@/components/providers/realtime-provider";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { navItems } from "@/lib/nav-items";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

function PageTitle({ pathname }: { pathname: string }) {
  const t = useTranslations("Nav");
  const allItems = [
    ...navItems,
    { key: "users", href: "/admin/users" },
  ];
  const match = allItems.find(
    (item) =>
      (item.href === "/" && pathname === "/") ||
      (item.href !== "/" && pathname.startsWith(item.href))
  );

  if (!match) return <span className="text-sm font-semibold">Inspire</span>;
  return (
    <span className="text-sm font-semibold truncate">
      {t(match.key)}
    </span>
  );
}

export function Topbar() {
  const { onlineUsers, onlineCount, connectionState, currentUser } = useRealtime();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1.5 border-b border-border bg-background/95 px-2 sm:px-4">
      <PageTitle pathname={pathname} />

      <div className="ms-auto flex items-center gap-0.5 sm:gap-1">

        {/* Connection dot */}
        {connectionState === "connected" && (
          <span className="flex h-2.5 w-2.5 shrink-0 items-center justify-center" title={`${onlineCount} online`}>
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
        {connectionState === "connecting" && (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-yellow-500" />
        )}
        {connectionState === "disconnected" && (
          <WifiOff className="h-3 w-3 shrink-0 text-destructive" />
        )}

        {/* Online avatars - compact */}
        <span className="hidden sm:inline-flex">
          <OnlineAvatars onlineUsers={onlineUsers} currentUserId={currentUser?.id} />
        </span>

        {/* Online count on mobile */}
        <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
          {onlineCount > 0 ? onlineCount : ""}
        </span>

        <LocaleSwitcher />
        <ThemeToggle />
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-[10px]">
            {currentUser?.initials ?? "IN"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
