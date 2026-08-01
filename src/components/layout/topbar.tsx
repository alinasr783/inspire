"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { OnlineAvatars } from "@/components/realtime/online-avatars";
import { ConnectionStatus } from "@/components/realtime/connection-status";
import { useRealtime } from "@/components/providers/realtime-provider";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { navItems } from "@/lib/nav-items";

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
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
      <PageTitle pathname={pathname} />

      <div className="ms-auto flex items-center gap-1">
        <span className="hidden sm:inline-flex">
          <ConnectionStatus state={connectionState} onlineCount={onlineCount} />
        </span>
        <span className="hidden sm:inline-flex">
          <OnlineAvatars
            onlineUsers={onlineUsers}
            currentUserId={currentUser?.id}
          />
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
