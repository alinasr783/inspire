import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRecords } from "@/lib/unconfirmed-data-actions";
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

  const records = await getRecords({
    folderId: sp.folder,
    fileId: sp.file,
  });

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <UnconfirmedDataClient initialRecords={records} locale={locale} />
    </Suspense>
  );
}
