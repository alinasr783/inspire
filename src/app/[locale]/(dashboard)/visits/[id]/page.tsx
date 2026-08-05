import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Calendar, MapPin, Building2, Clock, Pencil,
  User, Phone, Wallet, Layers, Paintbrush, FileText,
  Star, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientRow } from "@/lib/client-actions";
import type { UnitRow } from "@/lib/unit-actions";
import type { DealRow } from "@/lib/deal-actions";

const STATUS_MAP: Record<string, { className: string }> = {
  upcoming: { className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  completed: { className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  cancelled: { className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
};

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatPrice(amount: number | null | undefined) {
  if (amount == null) return "—";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

function s(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function n(v: unknown): number {
  const num = Number(v);
  return isNaN(num) ? 0 : num;
}

export default async function VisitDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Visits");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.role === "admin";

  let visitQuery = admin
    .from("visits")
    .select(`
      *,
      client:clients!inner(*),
      unit:units!inner(*),
      creator:profiles!visits_created_by_fkey(id, first_name, second_name),
      assignee:assigned_to(id, first_name, second_name)
    `)
    .eq("id", id);

  if (!isAdmin) {
    visitQuery = visitQuery.eq("created_by", user.id);
  }

  const { data: visit, error } = await visitQuery.single();

  if (error || !visit) notFound();

  const v = visit as Record<string, unknown>;
  const client = v.client as ClientRow | null;
  const unit = v.unit as UnitRow | null;
  const creator = v.creator as { id: string; first_name: string | null; second_name: string | null } | null;
  const assignee = v.assignee as { id: string; first_name: string | null; second_name: string | null } | null;

  const canEdit = isAdmin || s(v.created_by) === user.id;
  const vid = s(v.id);
  const clientId = s(v.client_id);
  const unitId = s(v.unit_id);
  const visitDate = s(v.visit_date);
  const visitNotes = s(v.notes, "");
  const postVisitNotes = s(v.post_visit_notes, "");
  const compoundName = s(v.compound_name);
  const buildingNumber = s(v.building_number);
  const apartmentNumber = s(v.apartment_number);
  const createdAt = s(v.created_at);

  const status = s(v.status, "upcoming");

  const { data: deal } = await admin
    .from("generated_deals")
    .select("*")
    .eq("client_id", clientId)
    .eq("property_id", unitId)
    .maybeSingle();

  const dealData = deal as DealRow | null;

  const tDeals = await getTranslations("Deals");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/visits">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("visitDetails")}</h1>
        {canEdit && (
          <div className="flex gap-1 ms-auto">
            <Link href={`/visits/${vid}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_MAP[status]?.className ?? ""}`}>
        {t(`status_${status}`)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {t("clientInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">الاسم / Name</p>
              <Link href={`/clients/${clientId}`} className="font-semibold hover:underline">
                {client?.customer_name ?? "—"}
              </Link>
            </div>
            {client?.phone && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.phone}</span>
              </div>
            )}
            {client?.phone_alt && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.phone_alt}</span>
              </div>
            )}
            {(client?.budget_from || client?.budget_to) && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {client?.budget_from != null ? formatPrice(client.budget_from) : ""}
                  {client?.budget_from != null && client?.budget_to != null ? " → " : ""}
                  {client?.budget_to != null ? formatPrice(client.budget_to) : ""}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {client?.unit_type && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{client.unit_type}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">نوع الوحدة</p>
                </div>
              )}
              {client?.bedrooms && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{client.bedrooms}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">غرف نوم</p>
                </div>
              )}
              {client?.preferred_area && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{client.preferred_area}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">المنطقة المفضلة</p>
                </div>
              )}
              {client?.payment_method && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{client.payment_method}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">طريقة الدفع</p>
                </div>
              )}
              {client?.source && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{client.source}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">المصدر</p>
                </div>
              )}
              {client?.preferred_developer && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{client.preferred_developer}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">المطور المفضل</p>
                </div>
              )}
            </div>
            {client?.additional_notes && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                <p className="text-sm whitespace-pre-wrap">{client.additional_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {t("propertyInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">الاسم / Name</p>
              <Link href={`/properties/${unitId}`} className="font-semibold hover:underline">
                {unit?.customer_name ?? "—"}
              </Link>
            </div>
            {unit?.phone && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{unit.phone}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {unit?.compound_name && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{unit.compound_name}</span></div>
                  <p className="text-xs text-muted-foreground mt-0.5">الكمبوند</p>
                </div>
              )}
              {unit?.unit_type && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1"><Layers className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{unit.unit_type}</span></div>
                  <p className="text-xs text-muted-foreground mt-0.5">نوع الوحدة</p>
                </div>
              )}
              {unit?.finishing_status && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1"><Paintbrush className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{unit.finishing_status}</span></div>
                  <p className="text-xs text-muted-foreground mt-0.5">التشطيب</p>
                </div>
              )}
              {unit?.rent_sale && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{unit.rent_sale}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">بيع/إيجار</p>
                </div>
              )}
              {unit?.area && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{unit.area} م²</span>
                  <p className="text-xs text-muted-foreground mt-0.5">المساحة</p>
                </div>
              )}
              {unit?.building_number && (
                <div className="rounded-lg border p-3">
                  <span className="text-sm">{unit.building_number}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">رقم العمارة</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {unit?.cash_required != null && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1"><Wallet className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-semibold">{formatPrice(Number(unit.cash_required))}</span></div>
                  <p className="text-xs text-muted-foreground mt-0.5">المطلوب كاش</p>
                </div>
              )}
              {unit?.remaining != null && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1"><Wallet className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-semibold">{formatPrice(Number(unit.remaining))}</span></div>
                  <p className="text-xs text-muted-foreground mt-0.5">المتبقي</p>
                </div>
              )}
            </div>
            {unit?.additional_notes && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                <p className="text-sm whitespace-pre-wrap">{unit.additional_notes}</p>
              </div>
            )}
            {unit?.feedback && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">فيد باك</p>
                <p className="text-sm whitespace-pre-wrap">{unit.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {dealData ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("compatibilityTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("compatibility")}</span>
                <span className={cn("text-2xl font-bold tabular-nums",
                  n(dealData.final_score) >= 70 ? "text-primary" :
                  n(dealData.final_score) >= 40 ? "text-amber-500" : "text-destructive"
                )}>
                  {Math.round(n(dealData.final_score))}%
                </span>
              </div>
              <Link href="/deals">
                <Button variant="outline" size="sm">{t("viewInDeals")}</Button>
              </Link>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  n(dealData.final_score) >= 70 ? "bg-primary" :
                  n(dealData.final_score) >= 40 ? "bg-amber-500" : "bg-destructive"
                )}
                style={{ width: `${Math.min(100, n(dealData.final_score))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <ScoreBadge label={tDeals("budgetMatch")} value={n(dealData.budget_match)} />
              <ScoreBadge label={tDeals("unitTypeMatch")} value={n(dealData.unit_type_match)} />
              <ScoreBadge label={tDeals("bedroomsMatch")} value={n(dealData.bedrooms_match)} />
              <ScoreBadge label={tDeals("freshnessScore")} value={n(dealData.freshness_score)} />
              <ScoreBadge label={tDeals("aiScore")} value={n(dealData.ai_score)} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center max-w-md">{t("noCompatibilityData")}</p>
            <Link href="/deals">
              <Button variant="outline" size="sm">{t("viewInDeals")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("visitDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("compoundName")}</p>
                <p className="font-medium">{compoundName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("buildingNumber")}</p>
                <p className="font-medium">{buildingNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("apartmentNumber")}</p>
                <p className="font-medium">{apartmentNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("visitDate")}</p>
                <p className="font-medium">{formatDate(visitDate, locale)}</p>
              </div>
            </div>
          </div>

          {visitNotes && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("notes")}</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{visitNotes}</p>
            </div>
          )}

          {postVisitNotes && (
            <div className="rounded-lg border p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-primary uppercase">{t("postVisitNotes")}</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{postVisitNotes}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t pt-4">
            <Clock className="h-3 w-3" />
            <span>
              {t("createdBy")}: {creator ? [creator.first_name, creator.second_name].filter(Boolean).join(" ") || "—" : "—"}
            </span>
            {assignee && (
              <>
                <span className="mx-1">|</span>
                <User className="h-3 w-3" />
                <span>
                  {t("assignedTo")}: {[assignee.first_name, assignee.second_name].filter(Boolean).join(" ") || "—"}
                </span>
              </>
            )}
            <span className="ms-auto">{formatDate(createdAt, locale)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums",
        value >= 70 ? "text-primary" : value >= 40 ? "text-amber-500" : "text-destructive"
      )}>
        {Math.round(value)}%
      </p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full",
            value >= 70 ? "bg-primary" : value >= 40 ? "bg-amber-500" : "bg-destructive"
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
