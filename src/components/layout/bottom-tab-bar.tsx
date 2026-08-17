"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Building2,
  UsersRound,
  ListChecks,
  Ellipsis,
  FileSpreadsheet,
  Handshake,
  BarChart3,
  MonitorSmartphone,
  UserCircle,
  CalendarCheck,
  Banknote,
  FileText,
  X,
  UserCheck,
  CalendarDays,
  Briefcase,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const TABS = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "properties", href: "/properties", icon: Building2 },
  { key: "clients", href: "/clients", icon: UsersRound },
  { key: "tasks", href: "/tasks", icon: ListChecks },
  { key: "more", href: "#more", icon: Ellipsis },
] as const;

const MORE_ITEMS = [
  { key: "unconfirmedData", href: "/unconfirmed-data", icon: FileSpreadsheet },
  { key: "companyClients", href: "/company-clients", icon: Briefcase },
  { key: "attendance", href: "/attendance", icon: UserCheck },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "visits", href: "/visits", icon: CalendarCheck },
  { key: "deals", href: "/deals", icon: Handshake },
  { key: "contracts", href: "/contracts", icon: FileText },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "devices", href: "/devices", icon: MonitorSmartphone },
  { key: "profile", href: "/profile", icon: UserCircle },
] as const;

export function BottomTabBar({ role }: { role?: string }) {
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const queryClient = useQueryClient();

  const handlePrefetch = useCallback(
    (key: string) => {
      const prefetcher = prefetchMap[key];
      if (prefetcher) prefetcher(queryClient);
    },
    [queryClient]
  );

  const handleMoreClick = useCallback(
    (e: React.MouseEvent) => {
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
      if (href === "#more") {
        e.preventDefault();
        setMoreOpen((p) => !p);
      }
    },
    []
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background/95 backdrop-blur-lg md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : tab.href !== "#more" && pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              prefetch={tab.href !== "#more" ? true : undefined}
              onMouseEnter={() => tab.href !== "#more" && handlePrefetch(tab.key)}
              onClick={tab.href === "#more" ? handleMoreClick : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active && "fill-current"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium leading-none">
                {t(tab.key)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* More Sheet */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom rounded-t-2xl border-t border-border bg-card p-4 md:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{tCommon("more")}</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={() => handlePrefetch(item.key)}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {t(item.key)}
                  </Link>
                );
              })}
              {role === "admin" && (
                <Link
                  href="/finances"
                  prefetch={true}
                  onMouseEnter={() => handlePrefetch("finances")}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-colors",
                    pathname.startsWith("/finances")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Banknote className="h-5 w-5" />
                  {t("finances")}
                </Link>
              )}
              {role === "admin" && (
                <Link
                  href="/ad-campaigns"
                  prefetch={true}
                  onMouseEnter={() => handlePrefetch("adCampaigns")}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-colors",
                    pathname.startsWith("/ad-campaigns")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Megaphone className="h-5 w-5" />
                  {t("adCampaigns")}
                </Link>
              )}
              {role === "admin" && (
                <Link
                  href="/admin/users"
                  prefetch={true}
                  onMouseEnter={() => handlePrefetch("users")}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-colors",
                    pathname.startsWith("/admin/users")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <UsersRound className="h-5 w-5" />
                  {t("users")}
                </Link>
              )}
              {role === "admin" && (
                <Link
                  href="/admin/team"
                  prefetch={true}
                  onMouseEnter={() => handlePrefetch("team")}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-colors",
                    pathname.startsWith("/admin/team")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <UsersRound className="h-5 w-5" />
                  {t("team")}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
