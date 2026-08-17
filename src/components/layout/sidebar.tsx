"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { UsersRound, Banknote, Pencil, Plus, Trash2, FileText, Megaphone } from "lucide-react";
import { useRealtime } from "@/components/providers/realtime-provider";
import { usePendingCount } from "@/components/providers/pending-count-provider";
import { prefetchUnits } from "@/hooks/queries/use-units-query";
import { prefetchClients } from "@/hooks/queries/use-clients-query";
import { prefetchCompanyClients } from "@/hooks/queries/use-company-clients-query";
import { prefetchDeals } from "@/hooks/queries/use-deals-query";
import { prefetchTasks } from "@/hooks/queries/use-tasks-query";
import { prefetchDevices } from "@/hooks/queries/use-devices-query";
import { prefetchEmployees } from "@/hooks/queries/use-employees-query";
import { prefetchFinances } from "@/hooks/queries/use-finances-query";
import { prefetchContracts } from "@/hooks/queries/use-contracts-query";
import { prefetchTeamMembers } from "@/hooks/queries/use-team-query";
import { prefetchAdCampaigns } from "@/hooks/queries/use-ad-campaigns-query";

const prefetchMap: Record<string, (qc: ReturnType<typeof useQueryClient>) => void> = {
  properties: prefetchUnits,
  clients: prefetchClients,
  companyClients: prefetchCompanyClients,
  deals: prefetchDeals,
  tasks: prefetchTasks,
  devices: prefetchDevices,
  users: prefetchEmployees,
  finances: (qc) => prefetchFinances(qc),
  contracts: (qc) => prefetchContracts(qc),
  team: (qc) => prefetchTeamMembers(qc),
  adCampaigns: (qc) => prefetchAdCampaigns(qc),
};

function SidebarContent({ role, logoUrl }: { role?: string; logoUrl: string | null }) {
  const t = useTranslations("Nav");
  const tApp = useTranslations("App");
  const pathname = usePathname();
  const pendingCount = usePendingCount();
  const { onlineUsers, cellEditEvents } = useRealtime();
  const queryClient = useQueryClient();

  const handlePrefetch = useCallback(
    (key: string) => {
      const prefetcher = prefetchMap[key];
      if (prefetcher) prefetcher(queryClient);
    },
    [queryClient]
  );

  const pageUsers = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        color: string;
        initials: string;
        firstName: string;
        secondName: string;
        avatarUrl: string | null;
      }[]
    >();
    for (const u of onlineUsers) {
      const route = (u.page ?? "").replace(/^\/(ar|en)/, "") || "/";
      if (!map.has(route)) map.set(route, []);
      map.get(route)!.push({
        userId: u.userId,
        color: u.color,
        initials: u.initials,
        firstName: u.firstName,
        secondName: u.secondName,
        avatarUrl: u.avatarUrl,
      });
    }
    return map;
  }, [onlineUsers]);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-14 items-center gap-2.5 px-5">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-[10px] font-bold text-primary-foreground">IN</span>
          </div>
        )}
        <span className="text-sm font-semibold tracking-tight">
          {tApp("name")}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-1">
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
              prefetch={true}
              onMouseEnter={() => handlePrefetch(item.key)}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active && "text-primary"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="flex-1 truncate">{t(item.key)}</span>
              {users.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {users.slice(0, 2).map((u) => (
                    <span
                      key={u.userId}
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[7px] font-bold text-white ring-1 ring-background overflow-hidden"
                      title={`${u.firstName} ${u.secondName}`.trim() || u.userId}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.initials} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: u.color }}>
                          {u.initials}
                        </span>
                      )}
                    </span>
                  ))}
                  {users.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{users.length - 2}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}

        {role === "admin" && (
          <>
            <Link
              href="/finances"
              prefetch={true}
              onMouseEnter={() => handlePrefetch("finances")}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                pathname.startsWith("/finances")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Banknote
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  pathname.startsWith("/finances") && "text-primary"
                )}
                strokeWidth={2}
              />
              <span>{t("finances")}</span>
            </Link>
            <Link
              href="/ad-campaigns"
              prefetch={true}
              onMouseEnter={() => handlePrefetch("adCampaigns")}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                pathname.startsWith("/ad-campaigns")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Megaphone
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  pathname.startsWith("/ad-campaigns") && "text-primary"
                )}
                strokeWidth={2}
              />
              <span>{t("adCampaigns")}</span>
            </Link>
            <Link
              href="/admin/users"
              prefetch={true}
              onMouseEnter={() => handlePrefetch("users")}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                pathname.startsWith("/admin/users")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="relative">
                <UsersRound
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    pathname.startsWith("/admin/users") && "text-primary"
                  )}
                  strokeWidth={2}
                />
                {pendingCount > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </div>
              <span>{t("users")}</span>
            </Link>
            <Link
              href="/admin/team"
              prefetch={true}
              onMouseEnter={() => handlePrefetch("team")}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                pathname.startsWith("/admin/team")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <UsersRound
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  pathname.startsWith("/admin/team") && "text-primary"
                )}
                strokeWidth={2}
              />
              <span>{t("team")}</span>
            </Link>
          </>
        )}
      </nav>

      {cellEditEvents.length > 0 && (
        <div className="border-t border-sidebar-border px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live Activity
          </p>
          <div className="max-h-[140px] space-y-1 overflow-y-auto">
            {cellEditEvents
              .slice(-5)
              .reverse()
              .map((e) => (
                <div
                  key={`${e.userId}-${e.ts}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] animate-in fade-in"
                >
                  <span
                    className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-white"
                    style={{ backgroundColor: e.userColor }}
                  >
                    {e.initials}
                  </span>
                  <span className="flex-1 truncate leading-tight">
                    <span className="font-medium">{e.userName}</span>{" "}
                    <span className="text-muted-foreground">
                      {e.action === "insert"
                        ? "added"
                        : e.action === "delete"
                          ? "deleted"
                          : "edited"}
                    </span>
                  </span>
                  {e.action === "insert" ? (
                    <Plus className="h-3 w-3 shrink-0 text-primary" />
                  ) : e.action === "delete" ? (
                    <Trash2 className="h-3 w-3 shrink-0 text-destructive" />
                  ) : (
                    <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[10px] leading-none text-muted-foreground">
          &copy; {new Date().getFullYear()} Inspire
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ role, logoUrl }: { role?: string; logoUrl?: string | null }) {
  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-[232px] border-e border-sidebar-border bg-sidebar md:flex">
      <SidebarContent role={role} logoUrl={logoUrl ?? null} />
    </aside>
  );
}
