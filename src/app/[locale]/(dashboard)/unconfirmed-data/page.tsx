import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecords, getUnconfirmedRecordsCount } from "@/lib/unconfirmed-data-actions";
import { UNCONFIRMED_PAGE_SIZE } from "@/lib/unconfirmed-constants";
import { UnconfirmedDataClient } from "@/components/unconfirmed-data/unconfirmed-data-client";

export default async function UnconfirmedDataPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();

  const filters = {
    folderId: sp.folder || undefined,
    fileId: sp.file || undefined,
    q: sp.q || undefined,
  };

  // أول دفعة + العدد الإجمالي حتى تعرض الواجهة "عرض X من Y" بشكل صحيح
  const [records, totalCount] = await Promise.all([
    getRecords({ ...filters, limit: UNCONFIRMED_PAGE_SIZE, offset: 0 }),
    getUnconfirmedRecordsCount(filters),
  ]);

  const { data: employees } = await admin
    .from("profiles")
    .select("id, first_name, second_name")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  const employeeList = (employees ?? []).map((e) => ({
    id: e.id,
    name: [e.first_name, e.second_name].filter(Boolean).join(" ") || e.id,
  }));

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <UnconfirmedDataClient
        initialRecords={records}
        initialTotalCount={totalCount}
        pageSize={UNCONFIRMED_PAGE_SIZE}
        locale={locale}
        userId={user.id}
        employees={employeeList}
      />
    </Suspense>
  );
}
