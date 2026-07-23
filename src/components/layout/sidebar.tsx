"use client";

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

function SidebarContent({ role }: { role?: string }) {
  const t = useTranslations("Nav");
  const tApp = useTranslations("App");
  const pathname = usePathname();

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
            <UsersRound className="h-4 w-4 shrink-0" />
            <span>{t("users")}</span>
          </Link>
        )}
      </nav>
    </div>
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
  const locale = useLocale();
  const t = useTranslations("App");

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
