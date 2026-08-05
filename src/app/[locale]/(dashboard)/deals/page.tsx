import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DealsPage } from "@/components/deals/deals-page";
import type { DealRow } from "@/lib/deal-actions";

export default async function DealsPageServer({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  let dealsQuery;
  if (isAdmin) {
    dealsQuery = admin
      .from("generated_deals")
      .select(`
        *,
        client:clients!inner(id, customer_name, phone, unit_type, budget_from, budget_to, preferred_area, bedrooms),
        unit:units!inner(id, customer_name, phone, area, building_number, compound_name, finishing_status, rent_sale, unit_type, cash_required, remaining)
      `)
      .order("final_score", { ascending: false });
  } else {
    const { data: userClients } = await admin
      .from("clients")
      .select("id")
      .or(`created_by.eq.${user.id},assigned_employee.eq.${user.id}`);
    const clientIds = (userClients ?? []).map((c) => c.id);
    if (clientIds.length === 0) {
      dealsQuery = Promise.resolve({ data: [] });
    } else {
      dealsQuery = admin
        .from("generated_deals")
        .select(`
          *,
          client:clients!inner(id, customer_name, phone, unit_type, budget_from, budget_to, preferred_area, bedrooms),
          unit:units!inner(id, customer_name, phone, area, building_number, compound_name, finishing_status, rent_sale, unit_type, cash_required, remaining)
        `)
        .in("client_id", clientIds)
        .order("final_score", { ascending: false });
    }
  }

  const clientsQuery = isAdmin
    ? admin.from("clients").select("id, customer_name, phone, unit_type, preferred_area").order("customer_name")
    : admin.from("clients").select("id, customer_name, phone, unit_type, preferred_area").or(`created_by.eq.${user.id},assigned_employee.eq.${user.id}`).order("customer_name");

  const [{ data: generatedDeals }, { data: clientsData }] = await Promise.all([dealsQuery, clientsQuery]);

  const clientOptions = (clientsData ?? []).map((c: { id: string; customer_name: string; phone: string; unit_type: string | null; preferred_area: string | null }) => ({
    id: c.id,
    name: c.customer_name,
    phone: c.phone,
    type: c.unit_type ?? "",
    area: c.preferred_area ?? "",
  }));

  return (
    <DealsPage
      initialDeals={(generatedDeals as unknown as DealRow[]) ?? []}
      userId={user.id}
      clients={clientOptions}
    />
  );
}
