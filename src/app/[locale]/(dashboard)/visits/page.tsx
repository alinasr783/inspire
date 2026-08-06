import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VisitsClient } from "@/components/visits/visits-client";
import type { VisitTableRow } from "@/components/visits/visit-table";

export default async function VisitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  let query = admin
    .from("visits")
    .select(`
      *,
      client:clients!inner(id, customer_name, phone),
      unit:units!inner(id, customer_name, phone),
      creator:profiles!visits_created_by_fkey(id, first_name, second_name),
      assignee:assigned_to(id, first_name, second_name)
    `);

  if (!isAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data: visits } = await query.order("visit_date", { ascending: false });

  const visitsTable: VisitTableRow[] = (visits ?? []).map((v: Record<string, unknown>) => {
    const client = v.client as Record<string, unknown> | null;
    const unit = v.unit as Record<string, unknown> | null;
    const creator = v.creator as Record<string, unknown> | null;
    const assignee = v.assignee as Record<string, unknown> | null;
    return {
      id: String(v.id ?? ""),
      client_id: String(v.client_id ?? ""),
      unit_id: String(v.unit_id ?? ""),
      client_name: String(client?.customer_name ?? "—"),
      client_phone: String(client?.phone ?? ""),
      unit_name: String(unit?.customer_name ?? "—"),
      unit_phone: String(unit?.phone ?? ""),
      compound_name: String(v.compound_name ?? ""),
      building_number: String(v.building_number ?? ""),
      apartment_number: String(v.apartment_number ?? ""),
      visit_date: String(v.visit_date ?? ""),
      status: (v.status ?? "upcoming") as VisitTableRow["status"],
      notes: String(v.notes ?? ""),
      post_visit_notes: String(v.post_visit_notes ?? ""),
      created_by: String(v.created_by ?? ""),
      assigned_to: v.assigned_to ? String(v.assigned_to) : null,
      creator_name: creator ? [creator.first_name, creator.second_name].filter(Boolean).join(" ") || "—" : "—",
      assignee_name: assignee ? [assignee.first_name, assignee.second_name].filter(Boolean).join(" ") || "—" : "",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
        <Link href="/visits/new" className="shrink-0">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("addVisit")}</span>
            <span className="sm:hidden">{t("addVisitShort")}</span>
          </Button>
        </Link>
      </div>

      <VisitsClient
        initialVisits={visitsTable}
        locale={locale}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </div>
  );
}
