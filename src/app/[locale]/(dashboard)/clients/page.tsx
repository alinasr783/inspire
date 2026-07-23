import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getColumnConfig } from "@/lib/client-config-actions";
import { getDropdownOptions } from "@/lib/client-dropdown-actions";
import type { ClientRow } from "@/lib/client-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientTable } from "@/components/clients/client-table";
import { ColumnConfigModal } from "@/components/clients/column-config-modal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Clients");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const isAdmin = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()).data?.role === "admin";

  const allColumns = await getColumnConfig();
  const customCols = allColumns.filter((c) => !c.is_builtin && c.enabled);

  const admin = createAdminClient();
  let query = admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("created_by", user.id);
  }

  if (sp.q) {
    const q = sp.q.replace(/\*/g, "\\*");
    query = query.or(
      `customer_name.ilike.*${q}*,` +
      `phone.ilike.*${q}*,` +
      `phone_alt.ilike.*${q}*,` +
      `preferred_area.ilike.*${q}*,` +
      `preferred_developer.ilike.*${q}*,` +
      `source.ilike.*${q}*,` +
      `additional_notes.ilike.*${q}*`
    );
  }

  if (sp.payment_method && sp.payment_method !== "all") {
    query = query.eq("payment_method", sp.payment_method);
  }
  if (sp.unit_type && sp.unit_type !== "all") {
    query = query.eq("unit_type", sp.unit_type);
  }
  if (sp.source && sp.source !== "all") {
    query = query.eq("source", sp.source);
  }
  if (sp.created_by && sp.created_by !== "all" && isAdmin) {
    query = query.eq("created_by", sp.created_by);
  }

  if (sp.budget_from) query = query.gte("budget_from", Number(sp.budget_from));
  if (sp.budget_to) query = query.lte("budget_to", Number(sp.budget_to));

  for (const col of customCols) {
    const val = sp[col.key];
    if (val && val !== "all") {
      query = query.filter(`custom_fields->>${col.key}`, "ilike", `%${val}%`);
    }
  }

  const { data: clients } = await query;
  const clientsData = (clients ?? []) as ClientRow[];

  const budgetValues = clientsData
    .flatMap((c) => [c.budget_from, c.budget_to])
    .filter((v): v is number => v != null);

  const rangeLimits = {
    budget:
      budgetValues.length > 0
        ? { min: Math.min(...budgetValues), max: Math.max(...budgetValues) }
        : null,
  };

  const creatorIds = [...new Set(clientsData.map((c) => c.created_by))];
  const { data: creators } = await admin
    .from("profiles")
    .select("id, first_name, second_name")
    .in("id", creatorIds.length > 0 ? creatorIds : ["none"]);

  const creatorMap = new Map(
    (creators ?? []).map((c: { id: string; first_name: string | null; second_name: string | null }) => [
      c.id,
      [c.first_name, c.second_name].filter(Boolean).join(" "),
    ])
  );

  const assigneeIds = [...new Set(clientsData.map((c) => c.assigned_employee).filter(Boolean))] as string[];
  const { data: assignees } = assigneeIds.length > 0
    ? await admin
        .from("profiles")
        .select("id, first_name, second_name")
        .in("id", assigneeIds)
    : { data: [] };
  const employeeMap = new Map(
    (assignees ?? []).map((a: { id: string; first_name: string | null; second_name: string | null }) => [
      a.id,
      [a.first_name, a.second_name].filter(Boolean).join(" "),
    ])
  );

  let employees: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data: allProfiles } = await admin
      .from("profiles")
      .select("id, first_name, second_name")
      .eq("approval_status", "approved");
    employees = (allProfiles ?? []).map((p: { id: string; first_name: string | null; second_name: string | null }) => ({
      id: p.id,
      name: [p.first_name, p.second_name].filter(Boolean).join(" "),
    }));
  }

  const [sourceOpts, unitTypeOpts, paymentOpts] = await Promise.all([
    getDropdownOptions("source"),
    getDropdownOptions("unit_type"),
    getDropdownOptions("payment_method"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{tNav("clients")}</h1>
        <div className="flex items-center gap-2">
          <ColumnConfigModal />
          <Link href="/clients/new">
            <Button>
              <Plus className="h-4 w-4" />
              {t("createClient")}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("allClients")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientFilters
            customColumns={customCols}
            rangeLimits={rangeLimits}
            isAdmin={isAdmin}
            employees={employees}
            dynamicOptions={{
              source: sourceOpts,
              unit_type: unitTypeOpts,
              payment_method: paymentOpts,
              preferred_area: [],
              preferred_developer: [],
              bedrooms: [],
            }}
          />

          <ClientTable
            columns={allColumns}
            clients={clientsData}
            locale={locale}
            creatorMap={creatorMap}
            employeeMap={employeeMap}
          />
        </CardContent>
      </Card>
    </div>
  );
}
