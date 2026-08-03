import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getColumnConfig } from "@/lib/client-config-actions";
import type { ClientRow } from "@/lib/client-actions";
import { CopyButton } from "@/components/clients/copy-button";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { WhatsAppIcon, TelegramIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarClock,
  Clock3,
  FileText,
  Layers,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  UserCheck,
  Wallet,
} from "lucide-react";

const STALE_DAYS = 7;
const WARN_DAYS = 4;

type ContactStatus = "healthy" | "warning" | "stale" | "neutral";

const STATUS_META: Record<
  ContactStatus,
  { badge: string; dot: string; key: string }
> = {
  healthy: {
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    dot: "bg-emerald-500",
    key: "healthy",
  },
  warning: {
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    dot: "bg-amber-500",
    key: "needsAttention",
  },
  stale: {
    badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    dot: "bg-red-500",
    key: "stale",
  },
  neutral: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    key: "notContacted",
  },
};

function formatNumber(val: number | null | undefined) {
  if (val == null) return "";
  return Number(val).toLocaleString();
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function timeAgo(iso: string | null, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
  });
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.round(months / 12), "year");
}

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold tracking-tight ${valueClass ?? ""}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function InfoRow({
  label,
  children,
  ltr,
}: {
  label: string;
  children: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className="truncate text-sm font-medium"
        dir={ltr ? "ltr" : undefined}
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </span>
    </div>
  );
}

function PersonRow({
  name,
  initials,
  role,
  icon,
}: {
  name: string;
  initials: string;
  role: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {initials || <User className="size-4" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {icon}
          {role}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium" dir="ltr">
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Clients");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: client, error } = await admin
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) {
    notFound();
  }

  const clientData = client as ClientRow;

  const { data: creator } = await admin
    .from("profiles")
    .select("first_name, second_name")
    .eq("id", clientData.created_by)
    .single();

  let assigneeName = "—";
  if (clientData.assigned_employee) {
    try {
      const { data: emp, error } = await admin
        .from("profiles")
        .select("first_name, second_name")
        .eq("id", clientData.assigned_employee)
        .single();
      if (emp && !error) {
        const name = [emp.first_name, emp.second_name].filter(Boolean).join(" ");
        assigneeName = name || "—";
      }
    } catch {
      assigneeName = "—";
    }
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canEdit = clientData.created_by === user.id || profile?.role === "admin";

  const { count: dealsCount } = await admin
    .from("generated_deals")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id);

  const customColumns = await getColumnConfig();
  const enabledCustom = customColumns.filter((c) => c.enabled);

  const creatorName = creator
    ? [creator.first_name, creator.second_name].filter(Boolean).join(" ")
    : "—";

  const initials = initialsOf(clientData.customer_name);

  const phoneDigits = (clientData.phone ?? "").replace(/\D/g, "");
  const phoneAltDigits = (clientData.phone_alt ?? "").replace(/\D/g, "");

  const lastContact = clientData.last_contact_date
    ? new Date(clientData.last_contact_date)
    : null;
  const contactValid = !!lastContact && !isNaN(lastContact.getTime());
  const daysSinceVal = contactValid
    ? daysSince(clientData.last_contact_date)
    : null;

  const status: ContactStatus =
    daysSinceVal === null
      ? "neutral"
      : daysSinceVal > STALE_DAYS
        ? "stale"
        : daysSinceVal >= WARN_DAYS
          ? "warning"
          : "healthy";
  const statusMeta = STATUS_META[status];

  const rating = clientData.seriousness_rating;
  const srColor =
    rating <= 3
      ? "text-red-600"
      : rating <= 5
        ? "text-orange-600"
        : rating <= 7
          ? "text-amber-600"
          : "text-emerald-600";
  const filledStars = Math.min(10, Math.max(0, Math.round(rating)));
  const stars = "★".repeat(filledStars) + "☆".repeat(10 - filledStars);

  let budgetDisplay: string | null = null;
  if (clientData.budget_from != null && clientData.budget_to != null) {
    budgetDisplay = `${formatNumber(clientData.budget_from)} – ${formatNumber(clientData.budget_to)}`;
  } else if (clientData.budget_from != null) {
    budgetDisplay = `${formatNumber(clientData.budget_from)}+`;
  } else if (clientData.budget_to != null) {
    budgetDisplay = `≤ ${formatNumber(clientData.budget_to)}`;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tNav("clients")}
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="font-medium text-foreground">
          {clientData.customer_name}
        </span>
      </nav>

      <Card className="border-0 bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
              {initials || <User className="size-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {clientData.customer_name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.badge}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${statusMeta.dot}`}
                  />
                  {t(statusMeta.key as never)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {clientData.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" />
                    <a
                      href={`tel:${phoneDigits}`}
                      dir="ltr"
                      className="font-medium text-foreground hover:underline"
                    >
                      {clientData.phone}
                    </a>
                    <CopyButton value={clientData.phone} />
                  </span>
                )}
                {clientData.phone_alt && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" />
                    <a
                      href={`tel:${phoneAltDigits}`}
                      dir="ltr"
                      className="font-medium text-foreground hover:underline"
                    >
                      {clientData.phone_alt}
                    </a>
                    <CopyButton value={clientData.phone_alt} />
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="size-3.5" />
                  {t("assignedEmployee")}:{" "}
                  <span className="font-medium text-foreground">
                    {assigneeName}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3.5" />
                  {t("memberSince")}: {formatDate(clientData.created_at, locale)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 lg:items-end">
            {phoneDigits && (
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <a
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-center gap-1.5")}
                >
                  <WhatsAppIcon className="size-3.5 text-[#25D366]" />
                  {t("whatsapp")}
                </a>
                <a
                  href={`https://t.me/+${phoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-center gap-1.5")}
                >
                  <TelegramIcon className="size-3.5 text-[#229ED9]" />
                  {t("telegram")}
                </a>
                <a
                  href={`tel:${phoneDigits}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-center gap-1.5")}
                >
                  <Phone className="size-3.5" />
                  {t("call")}
                </a>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              <Link href={`/clients/${clientData.id}/deals`}>
                <Button size="sm" className="w-full justify-center gap-1.5 font-semibold">
                  <Sparkles className="size-4" />
                  {t("generateDeals")}
                </Button>
              </Link>
              {canEdit && (
                <>
                  <Link href={`/clients/${clientData.id}/edit`}>
                    <Button variant="outline" size="sm" className="w-full justify-center gap-1.5">
                      <Pencil className="size-4" />
                      {t("editClient")}
                    </Button>
                  </Link>
                  <DeleteClientButton clientId={clientData.id} />
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Star className="size-3.5" />}
          label={t("seriousnessRating")}
          value={
            <span className={srColor}>
              {rating}
              <span className="text-base font-medium text-muted-foreground">
                /10
              </span>
            </span>
          }
          sub={
            <span className="inline-flex items-center text-amber-500">
              <span className="text-[11px] leading-none">{stars}</span>
            </span>
          }
        />
        <StatCard
          icon={<Wallet className="size-3.5" />}
          label={t("budget")}
          value={
            budgetDisplay ? (
              <span className="text-xl" dir="ltr">
                {budgetDisplay}
              </span>
            ) : (
              "—"
            )
          }
          sub={
            clientData.payment_method ? (
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                {clientData.payment_method}
              </span>
            ) : undefined
          }
        />
        <StatCard
          icon={<CalendarClock className="size-3.5" />}
          label={t("lastContactDate")}
          value={
            <span className="inline-flex items-center gap-2 text-xl">
              <span className={`size-2 rounded-full ${statusMeta.dot}`} />
              {contactValid ? timeAgo(clientData.last_contact_date, locale) : "—"}
            </span>
          }
          sub={
            contactValid
              ? formatDate(clientData.last_contact_date!, locale)
              : undefined
          }
          valueClass="text-xl"
        />
        <StatCard
          icon={<Sparkles className="size-3.5" />}
          label={t("deals")}
          value={dealsCount ?? 0}
          sub={
            <Link
              href={`/clients/${clientData.id}/deals`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Sparkles className="size-3" />
              {t("generateDeals")}
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="size-4 text-muted-foreground" />
                {t("contactInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <InfoRow label={t("customerName")}>
                  {clientData.customer_name}
                </InfoRow>
                <InfoRow label={t("phone")} ltr>
                  {clientData.phone || "—"}
                </InfoRow>
                {clientData.phone_alt && (
                  <InfoRow label={t("phoneAlt")} ltr>
                    {clientData.phone_alt}
                  </InfoRow>
                )}
                <InfoRow label={t("budget")} ltr>
                  {budgetDisplay ?? "—"}
                </InfoRow>
                <InfoRow label={t("paymentMethod")}>
                  {clientData.payment_method ?? "—"}
                </InfoRow>
                {clientData.source && (
                  <InfoRow label={t("source")}>
                    {clientData.source}
                  </InfoRow>
                )}
                {contactValid && (
                  <InfoRow label={t("lastContactDate")} ltr>
                    {formatDate(clientData.last_contact_date!, locale)}
                  </InfoRow>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-muted-foreground" />
                {t("preferences")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <InfoRow label={t("preferredArea")}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    {clientData.preferred_area ?? "—"}
                  </span>
                </InfoRow>
                <InfoRow label={t("unitType")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    {clientData.unit_type ?? "—"}
                  </span>
                </InfoRow>
                <InfoRow label={t("bedrooms")}>
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="size-3.5 text-muted-foreground" />
                    {clientData.bedrooms ?? "—"}
                  </span>
                </InfoRow>
                <InfoRow label={t("preferredDeveloper")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    {clientData.preferred_developer ?? "—"}
                  </span>
                </InfoRow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                {t("additionalNotes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {clientData.additional_notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {clientData.additional_notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {enabledCustom.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="size-4 text-muted-foreground" />
                  {t("customFields")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {enabledCustom.map((col) => {
                    const val = (clientData.custom_fields as Record<string, unknown>)?.[col.key];
                    return (
                      <InfoRow
                        key={col.key}
                        label={locale === "ar" ? col.label_ar : col.label_en}
                      >
                        {val != null ? String(val) : "—"}
                      </InfoRow>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="size-4 text-muted-foreground" />
                {t("assignment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <PersonRow
                name={assigneeName}
                initials={initialsOf(assigneeName)}
                role={t("assignedEmployee")}
                icon={<UserCheck className="size-3" />}
              />
              <PersonRow
                name={creatorName}
                initials={initialsOf(creatorName)}
                role={t("createdBy")}
                icon={<ShieldCheck className="size-3" />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="size-4 text-muted-foreground" />
                {t("activity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <ActivityItem
                icon={<CalendarClock className="size-4" />}
                label={t("createdAt")}
                value={timeAgo(clientData.created_at, locale)}
                hint={formatDate(clientData.created_at, locale)}
              />
              <ActivityItem
                icon={<Clock3 className="size-4" />}
                label={t("updatedAt")}
                value={timeAgo(clientData.updated_at, locale)}
                hint={formatDate(clientData.updated_at, locale)}
              />
              <ActivityItem
                icon={<MessageCircle className="size-4" />}
                label={t("lastContactDate")}
                value={
                  contactValid
                    ? timeAgo(clientData.last_contact_date, locale)
                    : "—"
                }
                hint={
                  contactValid
                    ? formatDate(clientData.last_contact_date!, locale)
                    : t("notContacted")
                }
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      {phoneDigits && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center gap-2 px-3 py-2">
            <a
              href={`tel:${phoneDigits}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Phone className="size-4" />
              {t("call")}
            </a>
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white"
            >
              <WhatsAppIcon className="size-4" />
              WhatsApp
            </a>
            {canEdit && (
              <>
                <Link href={`/clients/${clientData.id}/edit`} className="flex items-center justify-center rounded-xl border border-border px-3 py-2.5">
                  <Pencil className="size-4" />
                </Link>
                <span><DeleteClientButton clientId={clientData.id} /></span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
