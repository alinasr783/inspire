"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { useCellPresence } from "@/components/providers/cell-presence-provider";
import { useRealtime } from "@/components/providers/realtime-provider";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ProfileChange = {
  id: string;
  approval_status: string;
};

function SidebarContent({
  role,
  initialPending,
}: {
  role?: string;
  initialPending: number;
}) {
  const t = useTranslations("Nav");
  const tApp = useTranslations("App");
  const tAdmin = useTranslations("Admin");
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(initialPending);
  const prevCountRef = useRef(initialPending);
  const { onlineUsers } = useRealtime();
  const { pagePresences } = useCellPresence();

  const pageUsers = useMemo(() => {
    const map = new Map<string, { userId: string; color: string; initials: string; firstName: string; secondName: string }[]>();
    for (const [, pp] of pagePresences) {
      const route = pp.page.replace(/^\/(ar|en)/, "") || "/";
      if (!map.has(route)) map.set(route, []);
      const arr = map.get(route)!;
      if (!arr.some((u) => u.userId === pp.userId)) {
        const online = onlineUsers.find((o) => o.userId === pp.userId);
        arr.push({
          userId: pp.userId,
          color: pp.userColor,
          initials: online?.initials ?? pp.userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
          firstName: online?.firstName ?? "",
          secondName: online?.secondName ?? "",
        });
      }
    }
    return map;
  }, [pagePresences, onlineUsers]);

  useEffect(() => {
    if (role !== "admin") return;

    const supabase = createRealtimeClient();

    const channel = supabase.channel("realtime:profiles:pending");

    channel.on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "profiles" },
      (payload: RealtimePostgresChangesPayload<ProfileChange>) => {
        const eventType = payload.eventType;
        const newStatus = (payload.new as ProfileChange | undefined)
          ?.approval_status;
        const oldStatus = (payload.old as Partial<ProfileChange> | undefined)
          ?.approval_status;

        setPendingCount((prev) => {
          let next = prev;

          if (eventType === "INSERT" && newStatus === "pending") {
            next = prev + 1;
          } else if (eventType === "UPDATE") {
            if (oldStatus === "pending" && newStatus !== "pending") {
              next = Math.max(0, prev - 1);
            } else if (oldStatus !== "pending" && newStatus === "pending") {
              next = prev + 1;
            }
          } else if (eventType === "DELETE" && oldStatus === "pending") {
            next = Math.max(0, prev - 1);
          }

          if (next > prev && prev > 0) {
            toast(tAdmin("newPendingToast", { count: next }), {
              action: {
                label: tAdmin("viewUsers"),
                onClick: () => (window.location.href = "/ar/admin/users"),
              },
              duration: 6000,
            });
          }

          prevCountRef.current = next;
          return next;
        });
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, tAdmin]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6 text-lg font-bold">
        {tApp("name")}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const users = pageUsers.get(item.href) ?? [];
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t(item.key)}</span>
              {users.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {users.slice(0, 3).map((u) => (
                    <span
                      key={u.userId}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white ring-1 ring-background"
                      style={{ backgroundColor: u.color }}
                      title={`${u.firstName} ${u.secondName}`.trim() || u.userId}
                    >
                      {u.initials}
                    </span>
                  ))}
                  {users.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{users.length - 3}</span>
                  )}
                </div>
              )}
            </Link>
          );
        })}

        {role === "admin" && (
          <Link
            key="users"
            href="/admin/users"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin/users")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="relative">
              <UsersRound className="h-4 w-4 shrink-0" />
              {pendingCount > 0 && (
                <span className="absolute -end-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <span>{t("users")}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

function SidebarBadge({
  role,
  initialPending,
}: {
  role?: string;
  initialPending: number;
}) {
  const t = useTranslations("App");
  const locale = useLocale();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
          />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent
        side={locale === "ar" ? "right" : "left"}
        className="w-64 p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("name")}</SheetTitle>
        </SheetHeader>
        <SidebarContent role={role} initialPending={initialPending} />
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({
  role,
  initialPending,
}: {
  role?: string;
  initialPending?: number;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-e bg-card md:block">
      <SidebarContent role={role} initialPending={initialPending ?? 0} />
    </aside>
  );
}

export function MobileSidebar({
  role,
  initialPending,
}: {
  role?: string;
  initialPending?: number;
}) {
  return <SidebarBadge role={role} initialPending={initialPending ?? 0} />;
}
