"use client";

import { useState, useEffect, useRef } from "react";
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
import { getPendingUsersCount } from "@/lib/auth-actions";

function SidebarContent({ role }: { role?: string }) {
  const t = useTranslations("Nav");
  const tApp = useTranslations("App");
  const tAdmin = useTranslations("Admin");
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const prevCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (role !== "admin") return;
      try {
        const count = await getPendingUsersCount();
        if (!mounted) return;
        const prev = prevCountRef.current;

        if (count > 0 && count > prev && prev > 0) {
          toast(
            tAdmin("newPendingToast", { count }),
            {
              action: {
                label: tAdmin("viewUsers"),
                onClick: () => (window.location.href = "/ar/admin/users"),
              },
              duration: 6000,
            }
          );
        }

        prevCountRef.current = count;
        setPendingCount(count);
      } catch {
        // Silently fail
      }
    };

    run();
    const interval = setInterval(run, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
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
              <span>{t(item.key)}</span>
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

function SidebarBadge({ role }: { role?: string }) {
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
        <SidebarContent role={role} />
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ role }: { role?: string }) {
  return (
    <aside className="hidden w-64 shrink-0 border-e bg-card md:block">
      <SidebarContent role={role} />
    </aside>
  );
}

export function MobileSidebar({ role }: { role?: string }) {
  return <SidebarBadge role={role} />;
}
