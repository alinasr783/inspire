import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { MonthlyTrendChart, type MonthlyPoint } from "@/components/dashboard/dashboard-charts";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Handshake,
  ListChecks,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  Banknote,
  Target,
  CalendarDays,
  ChevronRight,
  Home,
  Trophy,
  Info,
} from "lucide-react";

// ── helpers ──

const DAY_MS = 86400000;
const STALE_DAYS = 7;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / DAY_MS);
}

function formatNumber(v: number | null | undefined) {
  if (v == null) return "0";
  return v.toLocaleString();
}

function aggregateMonthly(
  rows: { created_at: string }[],
  since: Date,
  locale: string
): MonthlyPoint[] {
  const arMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  const enMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const months =
    locale === "ar" ? arMonths : enMonths;
  const buckets = new Map<string, { month: string; properties: number; clients: number; deals: number }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(since.getFullYear(), since.getMonth() + (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: months[d.getMonth()],
      properties: 0,
      clients: 0,
      deals: 0,
    });
  }

  for (const row of rows) {
    const d = new Date(row.created_at);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.properties++;
  }

  return Array.from(buckets.values());
}

function mergeMonthly(
  base: MonthlyPoint[],
  rows: { created_at: string }[],
  field: "clients" | "deals"
): MonthlyPoint[] {
  for (const row of rows) {
    const d = new Date(row.created_at);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = base.find(
      (b) => {
        const idx = base.indexOf(b);
        const baseDate = new Date();
        baseDate.setMonth(baseDate.getMonth() - (5 - idx));
        return key === `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}`;
      }
    );
    if (bucket) bucket[field]++;
  }
  return base;
}

// ── inline stat card ──

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span style={color ? { color } : undefined}>
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
      <div className={cn("mt-2 text-2xl font-bold tracking-tight", valueClass)}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── proportional bar ──

function ProportionBar({
  segments,
}: {
  segments: { label: string; count: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((seg) =>
        seg.count > 0 ? (
          <div
            key={seg.label}
            className="h-full transition-all"
            style={{
              width: `${(seg.count / total) * 100}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${seg.count}`}
          />
        ) : null
      )}
    </div>
  );
}

// ── page ──

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await admin
        .from("profiles")
        .select("first_name, second_name, role")
        .eq("id", user.id)
        .single()
    : { data: null };

  const userName = profile
    ? [profile.first_name, profile.second_name].filter(Boolean).join(" ")
    : user?.email ?? "";

  // ── fetch all data ──
  const [
    { data: allUnits },
    { data: allClients },
    { data: allDeals },
    { data: allTasks },
    { data: cheapRentUnits },
    { data: cheapSaleUnits },
    { data: saleUnitsWithArea },
  ] = await Promise.all([
    admin
      .from("units")
      .select(
        "created_at, rent_sale, unit_type, last_contact_date, cash_required, remaining"
      ),
    admin
      .from("clients")
      .select("created_at, last_contact_date"),
    admin
      .from("generated_deals")
      .select("created_at, recommendation_status, final_score"),
    admin.from("tasks").select("created_at, status, progress, due_date"),
    admin
      .from("units")
      .select(
        "id, customer_name, cash_required, remaining, area, compound_name, building_number"
      )
      .ilike("rent_sale", "%يجار%")
      .not("cash_required", "is", null)
      .order("cash_required", { ascending: true })
      .limit(3),
    admin
      .from("units")
      .select(
        "id, customer_name, cash_required, remaining, area, compound_name, building_number"
      )
      .ilike("rent_sale", "%بيع%")
      .not("cash_required", "is", null)
      .order("cash_required", { ascending: true })
      .limit(3),
    admin
      .from("units")
      .select("id, customer_name, cash_required, remaining, area, compound_name, building_number, unit_type")
      .ilike("rent_sale", "%بيع%")
      .not("cash_required", "is", null)
      .not("area", "is", null)
      .order("cash_required", { ascending: true }),
  ]);

  const units = (allUnits ?? []) as Record<string, unknown>[];
  const clients = (allClients ?? []) as Record<string, unknown>[];
  const deals = (allDeals ?? []) as Record<string, unknown>[];
  const tasks = (allTasks ?? []) as Record<string, unknown>[];
  const cheapRent = (cheapRentUnits ?? []) as {
    id: string;
    customer_name: string;
    cash_required: number;
    remaining: number | null;
    area: string | null;
    compound_name: string | null;
    building_number: string | null;
  }[];
  const cheapSale = (cheapSaleUnits ?? []) as {
    id: string;
    customer_name: string;
    cash_required: number;
    remaining: number | null;
    area: string | null;
    compound_name: string | null;
    building_number: string | null;
  }[];

  // ── distinguished sale: score = normArea × (1-normCash) × (1-normRemaining) × 100 ──
  const rawSaleWithArea = (saleUnitsWithArea ?? []) as {
    id: string;
    customer_name: string;
    cash_required: number | null;
    remaining: number | null;
    area: string | null;
    compound_name: string | null;
    building_number: string | null;
    unit_type: string | null;
  }[];

  const salePool = rawSaleWithArea
    .map((u) => {
      const areaNum = parseFloat(u.area ?? "");
      const cash = u.cash_required;
      if (!areaNum || areaNum <= 0 || !cash || cash <= 0) return null;
      const remaining = u.remaining ?? 0;
      return { ...u, cash_required: cash, remaining, areaNumeric: areaNum };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  const areas = salePool.map((u) => u.areaNumeric);
  const cashes = salePool.map((u) => u.cash_required);
  const remainings = salePool.map((u) => u.remaining);
  const minA = Math.min(...areas);
  const maxA = Math.max(...areas);
  const minC = Math.min(...cashes);
  const maxC = Math.max(...cashes);
  const minR = Math.min(...remainings);
  const maxR = Math.max(...remainings);
  const rangeA = maxA - minA || 1;
  const rangeC = maxC - minC || 1;
  const rangeR = maxR - minR || 1;

  const distinguished = salePool
    .map((u) => {
      const normArea = (u.areaNumeric - minA) / rangeA;
      const normCash = (u.cash_required - minC) / rangeC;
      const normRemaining = (u.remaining - minR) / rangeR;
      const score = Math.round(normArea * (1 - normCash) * (1 - normRemaining) * 100);
      return { ...u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // ── counts ──
  const propsCount = units.length;
  const clientsCount = clients.length;
  const dealsCount = deals.length;

  // ── financials ──
  let totalCash = 0;
  let totalRemaining = 0;
  for (const u of units) {
    const c = u.cash_required as number | null;
    const r = u.remaining as number | null;
    if (c != null) totalCash += Number(c);
    if (r != null) totalRemaining += Number(r);
  }

  // ── rent / sale split ──
  let rentCount = 0;
  let saleCount = 0;
  for (const u of units) {
    const rs = (u.rent_sale as string | null) ?? "";
    if (rs.includes("يجار") || rs.toLowerCase().includes("rent")) rentCount++;
    else if (rs.includes("بيع") || rs.toLowerCase().includes("sale")) saleCount++;
  }

  // ── deal pipeline ──
  let pendingDeals = 0;
  let approvedDeals = 0;
  let rejectedDeals = 0;
  for (const d of deals) {
    const s = d.recommendation_status as string;
    if (s === "pending") pendingDeals++;
    else if (s === "approved") approvedDeals++;
    else if (s === "rejected") rejectedDeals++;
  }

  // ── task status ──
  let activeTasks = 0;
  let overdueTasks = 0;
  let completedTasks = 0;
  for (const t of tasks) {
    const s = t.status as string;
    if (s === "active") activeTasks++;
    else if (s === "overdue") overdueTasks++;
    else if (s === "completed") completedTasks++;
  }

  // ── contact health ──
  let staleProps = 0;
  let contactedProps = 0;
  let neverContactedProps = 0;
  for (const u of units) {
    const lcd = u.last_contact_date as string | null;
    const ds = daysSince(lcd);
    if (ds == null) neverContactedProps++;
    else if (ds > STALE_DAYS) staleProps++;
    else contactedProps++;
  }

  // ── charts data ──
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  let monthlyData = aggregateMonthly(
    units as { created_at: string }[],
    sixMonthsAgo,
    locale
  );
  monthlyData = mergeMonthly(
    monthlyData,
    clients as { created_at: string }[],
    "clients"
  );
  monthlyData = mergeMonthly(
    monthlyData,
    deals as { created_at: string }[],
    "deals"
  );

  // ── today ──
  const today = new Date().toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  // ── render ──
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-0 bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm sm:size-14 sm:text-lg">
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || <Building2 className="size-5 sm:size-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
                  {t("welcomeBack", { name: userName })}
                </h1>
                {profile?.role === "admin" && (
                  <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Admin
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                <CalendarDays className="me-1 inline size-3 sm:size-3.5" />
                {today}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Link href="/properties/new" className="sm:w-auto">
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <Plus className="size-3.5" />
                {t("addProperty")}
              </Button>
            </Link>
            <Link href="/clients/new" className="sm:w-auto">
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <Plus className="size-3.5" />
                {t("addClient")}
              </Button>
            </Link>
            <Link href="/deals" className="sm:w-auto">
              <Button size="sm" className="w-full gap-1.5">
                <Target className="size-3.5" />
                {t("generateDeals")}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={Building2}
          label={t("totalProperties")}
          value={formatNumber(propsCount)}
          sub={t("propertiesSub", { rent: rentCount, sale: saleCount })}
          color="#06c167"
        />
        <StatCard
          icon={Users}
          label={t("totalClients")}
          value={formatNumber(clientsCount)}
          sub={t("clientsSub", { count: clientsCount })}
          color="#276ef1"
        />
        <StatCard
          icon={Handshake}
          label={t("totalDeals")}
          value={formatNumber(dealsCount)}
          sub={t("dealsSub", { approved: approvedDeals })}
          color="#8b5cf6"
        />
        <StatCard
          icon={ListChecks}
          label={t("activeTasks")}
          value={formatNumber(activeTasks)}
          sub={
            overdueTasks > 0
              ? t("tasksSub", { overdue: overdueTasks })
              : t("tasksSubOk")
          }
          color="#f59e0b"
          valueClass={overdueTasks > 0 ? "text-amber-600" : undefined}
        />
      </div>

      {/* Status Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Deal Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-purple-600" />
              {t("dealPipeline")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("pipelinePending")}</span>
              <span className="font-semibold">{pendingDeals}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("pipelineApproved")}</span>
              <span className="font-semibold text-emerald-600">{approvedDeals}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("pipelineRejected")}</span>
              <span className="font-semibold text-muted-foreground">{rejectedDeals}</span>
            </div>
            <ProportionBar
              segments={[
                { label: t("pipelineApproved"), count: approvedDeals, color: "#10b981" },
                { label: t("pipelinePending"), count: pendingDeals, color: "#f59e0b" },
                { label: t("pipelineRejected"), count: rejectedDeals, color: "#6b7280" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Task Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-amber-600" />
              {t("taskOverview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("tasksActive")}</span>
              <span className="font-semibold">{activeTasks}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("tasksOverdue")}</span>
              <span className={cn("font-semibold", overdueTasks > 0 && "text-red-600")}>
                {overdueTasks}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("tasksCompleted")}</span>
              <span className="font-semibold text-emerald-600">{completedTasks}</span>
            </div>
            <ProportionBar
              segments={[
                { label: t("tasksCompleted"), count: completedTasks, color: "#10b981" },
                { label: t("tasksActive"), count: activeTasks, color: "#f59e0b" },
                { label: t("tasksOverdue"), count: overdueTasks, color: "#ef4444" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Contact Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-emerald-600" />
              {t("contactHealth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("healthContacted")}</span>
              <span className="font-semibold text-emerald-600">{contactedProps}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("healthStale")}</span>
              <span className={cn("font-semibold", staleProps > 0 && "text-red-600")}>
                {staleProps}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("healthNever")}</span>
              <span className="font-semibold text-muted-foreground">
                {neverContactedProps}
              </span>
            </div>
            <ProportionBar
              segments={[
                {
                  label: t("healthContacted"),
                  count: contactedProps,
                  color: "#10b981",
                },
                {
                  label: t("healthStale"),
                  count: staleProps,
                  color: "#ef4444",
                },
                {
                  label: t("healthNever"),
                  count: neverContactedProps,
                  color: "#9ca3af",
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={Banknote}
          label={t("totalCashRequired")}
          value={formatNumber(totalCash)}
          color="#06c167"
        />
        <StatCard
          icon={TrendingUp}
          label={t("totalRemaining")}
          value={formatNumber(totalRemaining)}
          color="#276ef1"
        />
      </div>

      {/* Cheap Units */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cheapest Rent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="size-4 text-blue-600" />
              {t("cheapestRent")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cheapRent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("noUnitsFound")}
              </p>
            ) : (
              <ul className="divide-y">
                {cheapRent.map((unit) => (
                  <li key={unit.id}>
                    <Link
                      href={`/properties/${unit.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/30 -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {unit.customer_name || "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[unit.compound_name, unit.area, unit.building_number]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          {unit.cash_required.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t("price")}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Cheapest Sale */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="size-4 text-purple-600" />
              {t("cheapestSale")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cheapSale.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("noUnitsFound")}
              </p>
            ) : (
              <ul className="divide-y">
                {cheapSale.map((unit) => (
                  <li key={unit.id}>
                    <Link
                      href={`/properties/${unit.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/30 -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {unit.customer_name || "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[unit.compound_name, unit.area, unit.building_number]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          {unit.cash_required.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t("price")}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distinguished Sale Units */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-amber-500" />
            {t("mostDistinguishedSale")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex cursor-help text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="size-3.5" />
                    </button>
                  }
                />
                <TooltipContent
                  side="top"
                  align="center"
                  className="max-w-[280px] whitespace-pre-line p-3 text-[12px] leading-relaxed"
                >
                  {t("distinctionExplain")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distinguished.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noUnitsFound")}
            </p>
          ) : (
            <div className="space-y-3">
              {distinguished.map((unit, i) => (
                <Link
                  key={unit.id}
                  href={`/properties/${unit.id}`}
                  className="flex items-center gap-4 rounded-xl border p-3 transition-colors hover:bg-muted/30 sm:p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {unit.customer_name || "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[unit.compound_name, unit.area, unit.building_number]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end sm:flex">
                    <p className="text-sm font-semibold">
                      {unit.cash_required.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {t("price")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("areaSqm", { area: unit.areaNumeric })}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-center gap-1 md:flex">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {t("distinctionScore")}
                    </span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${unit.score}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-amber-600">
                      {unit.score}%
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <MonthlyTrendChart data={monthlyData} />

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/properties"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto justify-between gap-2 py-4 font-normal"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#06c167]/15">
              <Building2 className="size-4 text-[#06c167]" />
            </div>
            <div className="text-start">
              <p className="text-sm font-semibold">{t("totalProperties")}</p>
              <p className="text-xs text-muted-foreground">{t("viewAll")}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          href="/clients"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto justify-between gap-2 py-4 font-normal"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#276ef1]/15">
              <Users className="size-4 text-[#276ef1]" />
            </div>
            <div className="text-start">
              <p className="text-sm font-semibold">{t("totalClients")}</p>
              <p className="text-xs text-muted-foreground">{t("viewAll")}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          href="/deals"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto justify-between gap-2 py-4 font-normal"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#8b5cf6]/15">
              <Handshake className="size-4 text-[#8b5cf6]" />
            </div>
            <div className="text-start">
              <p className="text-sm font-semibold">{t("totalDeals")}</p>
              <p className="text-xs text-muted-foreground">{t("viewAll")}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          href="/tasks"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto justify-between gap-2 py-4 font-normal"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#f59e0b]/15">
              <ListChecks className="size-4 text-[#f59e0b]" />
            </div>
            <div className="text-start">
              <p className="text-sm font-semibold">{t("activeTasks")}</p>
              <p className="text-xs text-muted-foreground">{t("viewAll")}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
