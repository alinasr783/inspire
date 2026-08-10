import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getColumnConfig } from "@/lib/client-config-actions";
import type { ClientRow } from "@/lib/client-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { ClientsClient } from "@/components/clients/clients-client";
import { ColumnConfigModal } from "@/components/clients/column-config-modal";
import { ShortcutsHelp } from "@/components/units/shortcuts-help";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClientsPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Clients");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: currentProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = currentProfile?.role === "admin";

  const allColumns = await getColumnConfig();
  const customCols = allColumns.filter((c) => !c.is_builtin && c.enabled);

  let query = admin.from("clients").select("*").order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("created_by", user.id);
  const { data: clients } = await query;
  const clientsData = (clients ?? []) as ClientRow[];

  const uniqueVals = async (col: string) => {
    const { data } = await admin.from("clients").select(col).not(col, "is", null).not(col, "eq", "");
    return [...new Set((data ?? []).map((r: any) => r[col]))].sort();
  };
  const uniquePaymentMethods = await uniqueVals("payment_method");
  const uniqueUnitTypes = await uniqueVals("unit_type");
  const uniqueSources = await uniqueVals("source");
  const uniqueAreas = await uniqueVals("preferred_area");
  const uniqueDevelopers = await uniqueVals("preferred_developer");
  const uniqueBedrooms = await uniqueVals("bedrooms");

  const budgetNums = clientsData.flatMap((c) => [c.budget_from, c.budget_to]).filter((v): v is number => v != null && !isNaN(v) && v > 0 && v < 100000);
  const budgetRange = budgetNums.length > 0 ? { min: Math.min(...budgetNums), max: Math.max(...budgetNums) } : null;

  const creatorIds = [...new Set(clientsData.map((c) => c.created_by))];
  const { data: creators } = await admin.from("profiles").select("id, first_name, second_name").in("id", creatorIds.length > 0 ? creatorIds : ["none"]);
  const creatorMap = new Map((creators ?? []).map((c: { id: string; first_name: string | null; second_name: string | null }) => [c.id, [c.first_name, c.second_name].filter(Boolean).join(" ")]));
  const creatorOptions = (creators ?? []).map((c) => ({ id: c.id, name: [c.first_name, c.second_name].filter(Boolean).join(" ") }));

  const assigneeIds = [...new Set(clientsData.map((c) => c.assigned_employee).filter(Boolean))] as string[];
  const { data: assignees } = assigneeIds.length > 0 ? await admin.from("profiles").select("id, first_name, second_name").in("id", assigneeIds) : { data: [] };
  const employeeMap = new Map((assignees ?? []).map((a: { id: string; first_name: string | null; second_name: string | null }) => [a.id, [a.first_name, a.second_name].filter(Boolean).join(" ")]));
  const employeeOptions = (assignees ?? []).map((a) => ({ id: a.id, name: [a.first_name, a.second_name].filter(Boolean).join(" ") }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{tNav("clients")} <ShortcutsHelp locale={locale} /></h1>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {isAdmin && <span className="shrink-0"><ColumnConfigModal /></span>}
          {isAdmin && (<Link href="/clients/group-add" className="shrink-0"><Button variant="outline" size="sm"><Upload className="h-4 w-4" />{t("groupAddUnits")}</Button></Link>)}
          <Link href="/clients/new" className="shrink-0"><Button size="sm"><Plus className="h-4 w-4" />{t("createClient")}</Button></Link>
        </div>
      </div>
      <Card className="flex max-h-[calc(100vh-180px)] flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {t("allClients")}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{clientsData.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
          <ClientsClient
            initialClients={clientsData}
            columns={allColumns}
            customColumns={customCols}
            locale={locale}
            isAdmin={isAdmin}
            userId={user.id}
            creatorMap={creatorMap}
            employeeMap={employeeMap}
            uniquePaymentMethods={uniquePaymentMethods}
            uniqueUnitTypes={uniqueUnitTypes}
            uniqueSources={uniqueSources}
            uniqueAreas={uniqueAreas}
            uniqueDevelopers={uniqueDevelopers}
            uniqueBedrooms={uniqueBedrooms}
            budgetRange={budgetRange}
            creatorOptions={creatorOptions}
            employeeOptions={employeeOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
