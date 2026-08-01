import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Users,
  Handshake,
  ListChecks,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

async function getStats() {
  "use server";
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const results = await Promise.all([
      admin.from("units").select("*", { count: "exact", head: true }),
      admin.from("clients").select("*", { count: "exact", head: true }),
      admin.from("deals").select("*", { count: "exact", head: true }),
      admin.from("tasks").select("*", { count: "exact", head: true }),
    ]);

    return {
      properties: results[0].count ?? 0,
      clients: results[1].count ?? 0,
      deals: results[2].count ?? 0,
      tasks: results[3].count ?? 0,
    };
  } catch {
    return { properties: 0, clients: 0, deals: 0, tasks: 0 };
  }
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const stats = await getStats();

  const cards = [
    {
      key: "properties",
      icon: Building2,
      value: stats.properties,
      color: "#06c167",
      trend: "+12%",
    },
    {
      key: "clients",
      icon: Users,
      value: stats.clients,
      color: "#276ef1",
      trend: "+8%",
    },
    {
      key: "deals",
      icon: Handshake,
      value: stats.deals,
      color: "#8b5cf6",
      trend: "+24%",
    },
    {
      key: "tasks",
      icon: ListChecks,
      value: stats.tasks,
      color: "#f59e0b",
      trend: "Active",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t("welcome")}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className="group relative overflow-hidden transition-all duration-300 hover:ring-1 hover:ring-border"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: card.color }}
              />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${card.color}15`,
                      }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: card.color }}
                      />
                    </div>
                    <div>
                      <p className="text-2xl font-bold tracking-tight">
                        {card.value.toLocaleString(locale)}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {tNav(card.key)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${card.color}12`,
                      color: card.color,
                    }}
                  >
                    {card.trend}
                    {card.trend.includes("+") && (
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{tNav("dashboard")}</p>
            <p className="text-[13px] text-muted-foreground">
              All systems operational
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
