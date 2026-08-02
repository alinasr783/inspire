import { setRequestLocale } from "next-intl/server";
import { fetchReports } from "@/lib/report-actions";
import { ReportsPage } from "@/components/reports/reports-page";

export default async function ReportsPageServer({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const data = await fetchReports(12);

  return <ReportsPage initialData={data} />;
}
