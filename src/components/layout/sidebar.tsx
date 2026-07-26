"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { UsersRound, Pencil, Plus, Trash2 } from "lucide-react";
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
  const { cursors, onlineUsers, cellEditEvents } = useRealtime();

  const pageUsers = useMemo(() => {
    const map = new Map<string, { userId: string; color: string; initials: string; firstName: string; secondName: string }[]>();
    for (const u of onlineUsers) {
      const route = (u.page ?? "").replace(/^\/(ar|en)/, "") || "/";
      if (!map.has(route)) map.set(route, []);
      map.get(route)!.push({
        userId: u.userId,
        color: u.color,
        initials: u.initials,
        firstName: u.firstName,
        secondName: u.secondName,
      });
    }
    return map;
  }, [onlineUsers]);

  useEffect(() => {
    if (role !== "admin") return;

    const supabase = createRealtimeClient();
    const channel = supabase.channel("realtime:profiles:pending");

    channel.on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "profiles" },
      (payload: RealtimePostgresChangesPayload<ProfileChange>) => {
        const eventType = payload.eventType;
        const newStatus = (payload.new as ProfileChange | undefined)?.approval_status;
        const oldStatus = (payload.old as Partial<ProfileChange> | undefined)?.approval_status;

        setPendingCount((prev) => {
          let next = prev;
          if (eventType === "INSERT" && newStatus === "pending") next = prev + 1;
          else if (eventType === "UPDATE") {
            if (oldStatus === "pending" && newStatus !== "pending") next = Math.max(0, prev - 1);
            else if (oldStatus !== "pending" && newStatus === "pending") next = prev + 1;
          } else if (eventType === "DELETE" && oldStatus === "pending") next = Math.max(0, prev - 1);

          if (next > prev && prev > 0) {
            toast(tAdmin("newPendingToast", { count: next }), {
              action: { label: tAdmin("viewUsers"), onClick: () => (window.location.href = "/ar/admin/users") },
              duration: 6000,
            });
          }
          prevCountRef.current = next;
          return next;
        });
      }
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [role, tAdmin]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6 text-lg font-bold">{tApp("name")}</div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const users = pageUsers.get(item.href) ?? [];

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
      {cellEditEvents.length > 0 && (
        <div className="border-t px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Live Activity</p>
          <div className="max-h-[180px] space-y-1 overflow-y-auto">
            {cellEditEvents.slice(-8).reverse().map((e) => (
              <div key={`${e.userId}-${e.ts}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] animate-in fade-in slide-in-from-bottom-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: e.userColor }}>{e.initials}</span>
                <span className="flex-1 truncate leading-tight">
                  <span className="font-medium">{e.userName}</span>{" "}
                  <span className="text-muted-foreground">{e.action === "insert" ? "added" : e.action === "delete" ? "deleted" : "edited"}</span>{" "}
                  <span className="text-muted-foreground">{e.table === "units" ? "Units" : e.table === "clients" ? "Clients" : e.table === "unconfirmed_records" ? "Unconfirmed" : e.table}</span>
                </span>
                {e.action === "insert" ? <Plus className="h-3 w-3 shrink-0 text-green-500" /> : e.action === "delete" ? <Trash2 className="h-3 w-3 shrink-0 text-red-500" /> : <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarBadge({ role, initialPending }: { role?: string; initialPending: number }) {
  const t = useTranslations("App");
  const locale = useLocale();

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side={locale === "ar" ? "right" : "left"} className="w-64 p-0">
        <SheetHeader className="sr-only"><SheetTitle>{t("name")}</SheetTitle></SheetHeader>
        <SidebarContent role={role} initialPending={initialPending} />
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ role, initialPending }: { role?: string; initialPending?: number }) {
  return (
    <aside className="hidden w-64 shrink-0 border-e bg-card md:block">
      <SidebarContent role={role} initialPending={initialPending ?? 0} />
    </aside>
  );
}

export function MobileSidebar({ role, initialPending }: { role?: string; initialPending?: number }) {
  return <SidebarBadge role={role} initialPending={initialPending ?? 0} />;
}
