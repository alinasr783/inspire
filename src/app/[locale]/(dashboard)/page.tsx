import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonthlyTrendChart, type MonthlyPoint } from "@/components/dashboard/dashboard-charts";
import { DistinguishedInfo } from "@/components/dashboard/distinguished-info";
import { HeroAvatar } from "@/components/dashboard/hero-avatar";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Handshake,
  ListChecks,
  Plus,
  CheckCircle2,
  ChevronRight,
  Home,
  Trophy,
  CalendarCheck,
} from "lucide-react";

// ── helpers ──

const DAY_MS = 86400000;
const STALE_DAYS = 7;
const STALE_DAYS_OWNERS = 30;

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
  const buckets = new Map<string, { month: string; properties: number; clients: number; visits: number }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(since.getFullYear(), since.getMonth() + (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: months[d.getMonth()],
      properties: 0,
      clients: 0,
      visits: 0,
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
  field: "clients" | "visits"
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

  let profile: {
    first_name: string | null;
    second_name: string | null;
    role: string;
    avatar_url: string | null;
  } | null = null;

  if (user) {
    try {
      const { data } = await admin
        .from("profiles")
        .select("first_name, second_name, role, avatar_url")
        .eq("id", user.id)
        .single();
      profile = data;
    } catch {
      const { data } = await admin
        .from("profiles")
        .select("first_name, second_name, role")
        .eq("id", user.id)
        .single();
      profile = data ? { ...data, avatar_url: null } : null;
    }
  }

  const userName = profile
    ? [profile.first_name, profile.second_name].filter(Boolean).join(" ")
    : user?.email ?? "";

  // ── fetch all data ──
  const [
    { data: allUnits },
    { data: allClients },
    { data: allVisits },
    { data: allTasks },
    { data: cheapRentUnits },
    { data: cheapSaleUnits },
    { data: saleUnitsWithArea },
  ] = await Promise.all([
    admin
      .from("units")
      .select(
        "created_at, rent_sale, unit_type, last_contact_date, cash_required, remaining, created_by, assigned_employee"
      )
      .limit(50000),
    admin
      .from("clients")
      .select("created_at, last_contact_date, created_by, assigned_employee")
      .limit(50000),
    admin
      .from("visits")
      .select("created_at, status")
      .limit(50000),
    admin.from("tasks").select("created_at, status, progress, due_date").limit(50000),
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
      .select("id, customer_name, cash_required, remaining, area, compound_name, building_number, unit_type, finishing_status")
      .ilike("rent_sale", "%بيع%")
      .not("cash_required", "is", null)
      .not("area", "is", null)
      .order("cash_required", { ascending: true }),
  ]);

  const units = (allUnits ?? []) as Record<string, unknown>[];
  const clients = (allClients ?? []) as Record<string, unknown>[];
  const visits = (allVisits ?? []) as Record<string, unknown>[];
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

  // ── distinguished sale: score = valueRatio × finishingWeight × 100 ──
  const compoundPrices: Record<string, number> = {
    "the brooks": 36000,
    "brooks": 36000,
    "stone residence": 34000,
    "stone": 34000,
  };

  const getFinishingWeight = (status: string | null): number => {
    const s = (status ?? "").toLowerCase();
    if (!s) return 0.6;
    if ((s.includes("متشطب") || s.includes("كامل") || s.includes("finished") || s.includes("full")) && !s.includes("نصف") && !s.includes("semi")) return 1.0;
    if (s.includes("نصف") || s.includes("semi") || s.includes("half")) return 0.7;
    if (s.includes("طوب") || s.includes("بدون") || s.includes("shell") || s.includes("unfinished")) return 0.4;
    return 0.6;
  };

  const rawSaleWithArea = (saleUnitsWithArea ?? []) as {
    id: string;
    customer_name: string;
    cash_required: number | null;
    remaining: number | null;
    area: string | null;
    compound_name: string | null;
    building_number: string | null;
    unit_type: string | null;
    finishing_status: string | null;
  }[];

  const salePool = rawSaleWithArea
    .map((u) => {
      const areaNum = parseFloat(u.area ?? "");
      const cash = u.cash_required ?? 0;
      const remaining = u.remaining ?? 0;
      const totalPrice = cash + remaining;
      if (!areaNum || areaNum <= 0 || totalPrice <= 0) return null;
      const compound = (u.compound_name ?? "").trim();
      const compoundKey = compound.toLowerCase();

      let marketPricePerSqm: number | undefined = compoundPrices[compoundKey];
      if (!marketPricePerSqm) {
        const sameCompound = rawSaleWithArea
          .filter((x) => x.id !== u.id && (x.compound_name ?? "").trim().toLowerCase() === compoundKey)
          .map((x) => {
            const a = parseFloat(x.area ?? "");
            const c = (x.cash_required ?? 0) + (x.remaining ?? 0);
            return a && a > 0 && c > 0 ? c / a : null;
          })
          .filter((v): v is number => v !== null);
        marketPricePerSqm = sameCompound.length > 0
          ? sameCompound.reduce((s, v) => s + v, 0) / sameCompound.length
          : undefined;
      }

      const finishingWeight = getFinishingWeight(u.finishing_status);

      return {
        ...u,
        cash_required: cash,
        remaining,
        totalPrice,
        areaNumeric: areaNum,
        marketPricePerSqm,
        finishingWeight,
      };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  const distinguished = salePool
    .map((u) => {
      const actualPricePerSqm = u.totalPrice / u.areaNumeric;
      const market = u.marketPricePerSqm ?? actualPricePerSqm;
      const valueRatio = market / actualPricePerSqm;
      const score = Math.round(valueRatio * u.finishingWeight * 100);
      return { ...u, actualPricePerSqm, valueRatio, score };
    })
    .filter((u) => u.marketPricePerSqm !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // ── scope data for non-admin ──
  const isAdmin = profile?.role === "admin";
  const scopedUnits: Record<string, unknown>[] = isAdmin
    ? units
    : units.filter((u) => u.created_by === user?.id || u.assigned_employee === user?.id);
  const scopedClients: Record<string, unknown>[] = isAdmin
    ? clients
    : clients.filter((c) => c.created_by === user?.id || c.assigned_employee === user?.id);
  const scopedVisits: Record<string, unknown>[] = isAdmin
    ? visits
    : visits.filter((v) => v.created_by === user?.id || v.assigned_to === user?.id);
  const scopedTasks: Record<string, unknown>[] = isAdmin
    ? tasks
    : tasks.filter((t) => t.assigned_to === user?.id || t.created_by === user?.id);

  // ── counts ──
  const propsCount = scopedUnits.length;
  const clientsCount = scopedClients.length;
  const visitsCount = scopedVisits.length;

  // ── user-specific counts ──
  const userClientsCount = scopedClients.length;
  const userUnitsCount = scopedUnits.length;

  // ── financials ──
  let totalCash = 0;
  let totalRemaining = 0;
  for (const u of scopedUnits) {
    const c = u.cash_required as number | null;
    const r = u.remaining as number | null;
    if (c != null) totalCash += Number(c);
    if (r != null) totalRemaining += Number(r);
  }

  // ── rent / sale split ──
  let rentCount = 0;
  let saleCount = 0;
  for (const u of scopedUnits) {
    const rs = (u.rent_sale as string | null) ?? "";
    if (rs.includes("يجار") || rs.toLowerCase().includes("rent")) rentCount++;
    else if (rs.includes("بيع") || rs.toLowerCase().includes("sale")) saleCount++;
  }

  // ── clients contact health (clients data, 7-day threshold) ──
  let clientsStale = 0;
  let clientsContacted = 0;
  let clientsNever = 0;
  for (const c of scopedClients) {
    const lcd = c.last_contact_date as string | null;
    const ds = daysSince(lcd);
    if (ds == null) clientsNever++;
    else if (ds > STALE_DAYS) clientsStale++;
    else clientsContacted++;
  }

  // ── owners contact health (units data, 30-day threshold) ──
  let ownersStale = 0;
  let ownersContacted = 0;
  let ownersNever = 0;
  for (const u of scopedUnits) {
    const lcd = u.last_contact_date as string | null;
    const ds = daysSince(lcd);
    if (ds == null) ownersNever++;
    else if (ds > STALE_DAYS_OWNERS) ownersStale++;
    else ownersContacted++;
  }

  // ── task status ──
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let activeTasks = 0;
  let overdueTasks = 0;
  let completedTasks = 0;
  for (const t of scopedTasks) {
    const s = t.status as string;
    if (s === "done") {
      completedTasks++;
    } else {
      const due = new Date(t.due_date as string);
      due.setHours(0, 0, 0, 0);
      if (due.getTime() < now.getTime()) {
        overdueTasks++;
      } else {
        activeTasks++;
      }
    }
  }

  // ── charts data ──
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  let monthlyData = aggregateMonthly(
    scopedUnits as { created_at: string }[],
    sixMonthsAgo,
    locale
  );
  monthlyData = mergeMonthly(
    monthlyData,
    scopedClients as { created_at: string }[],
    "clients"
  );
  monthlyData = mergeMonthly(
    monthlyData,
    scopedVisits as { created_at: string }[],
    "visits"
  );

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "IN";

  // ── render ──
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-0 bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <HeroAvatar
              avatarUrl={profile?.avatar_url ?? null}
              initials={userInitials}
              className="size-12 shrink-0 rounded-2xl shadow-sm sm:size-14"
            />
            <div className="min-w-0 flex-1">
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
                {t("userClientsCount", { count: userClientsCount })}
                {" · "}
                {t("userPropertiesCount", { count: userUnitsCount })}
              </p>
            </div>
            <LogoutButton />
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
            <Link href="/visits/new" className="sm:w-auto">
              <Button size="sm" className="w-full gap-1.5">
                <Plus className="size-3.5" />
                {t("addVisit")}
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
          icon={CalendarCheck}
          label={t("totalVisits")}
          value={formatNumber(visitsCount)}
          sub={t("visitsSub", { count: visitsCount })}
          color="#f59e0b"
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

        {/* Clients Contact Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-blue-600" />
              {t("clientsContactHealth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("contactsContacted")}</span>
              <span className="font-semibold text-emerald-600">{clientsContacted}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("contactsStale")}</span>
              <span className={cn("font-semibold", clientsStale > 0 && "text-red-600")}>
                {clientsStale}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("contactsNever")}</span>
              <span className="font-semibold text-muted-foreground">
                {clientsNever}
              </span>
            </div>
            <ProportionBar
              segments={[
                { label: t("contactsContacted"), count: clientsContacted, color: "#10b981" },
                { label: t("contactsStale"), count: clientsStale, color: "#ef4444" },
                { label: t("contactsNever"), count: clientsNever, color: "#9ca3af" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Owners Contact Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-emerald-600" />
              {t("ownersContactHealth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("ownersContacted")}</span>
              <span className="font-semibold text-emerald-600">{ownersContacted}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("ownersStale")}</span>
              <span className={cn("font-semibold", ownersStale > 0 && "text-red-600")}>
                {ownersStale}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("ownersNever")}</span>
              <span className="font-semibold text-muted-foreground">
                {ownersNever}
              </span>
            </div>
            <ProportionBar
              segments={[
                { label: t("ownersContacted"), count: ownersContacted, color: "#10b981" },
                { label: t("ownersStale"), count: ownersStale, color: "#ef4444" },
                { label: t("ownersNever"), count: ownersNever, color: "#9ca3af" },
              ]}
            />
          </CardContent>
        </Card>
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
              <ul className="divide-y [&>li:last-child]:pb-3">
                {cheapRent.map((unit) => (
                  <li key={unit.id}>
                    <Link
                      href={`/properties/${unit.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/30"
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
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:scale-x-[-1]" />
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
              <ul className="divide-y [&>li:last-child]:pb-3">
                {cheapSale.map((unit) => (
                  <li key={unit.id}>
                    <Link
                      href={`/properties/${unit.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/30"
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
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:scale-x-[-1]" />
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
            <DistinguishedInfo text={t("distinctionExplain")} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distinguished.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noUnitsFound")}
            </p>
          ) : (
            <div className="space-y-3 pb-3">
              {distinguished.map((unit, i) => (
                <Link
                  key={unit.id}
                  href={`/properties/${unit.id}`}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30 sm:gap-4 sm:p-4"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={{
                      backgroundColor:
                        i === 0 ? "#fef3c7" : i === 1 ? "#f3f4f6" : i === 2 ? "#fef2f2" : "var(--muted)",
                      color:
                        i === 0 ? "#92400e" : i === 1 ? "#374151" : i === 2 ? "#991b1b" : "var(--muted-foreground)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {unit.customer_name || "—"}
                      </p>
                      {unit.finishing_status && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {unit.finishing_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[unit.compound_name, unit.area, unit.building_number]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-600">
                      {Math.round(unit.actualPricePerSqm!).toLocaleString()} / m²
                      {unit.valueRatio! > 1 && (
                        <span className="ml-1 font-semibold">
                          ({Math.round((unit.valueRatio! - 1) * 100)}% أقل من السوق)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-bold">
                      {unit.totalPrice.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("totalPrice")}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-center gap-1 md:flex">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {t("distinctionScore")}
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(unit.score, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-amber-600">
                      {unit.score}%
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:scale-x-[-1]" />
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
          <ChevronRight className="size-4 text-muted-foreground rtl:scale-x-[-1]" />
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
          <ChevronRight className="size-4 text-muted-foreground rtl:scale-x-[-1]" />
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
          <ChevronRight className="size-4 text-muted-foreground rtl:scale-x-[-1]" />
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
          <ChevronRight className="size-4 text-muted-foreground rtl:scale-x-[-1]" />
        </Link>
      </div>
    </div>
  );
}
