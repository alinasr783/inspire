import { setRequestLocale } from "next-intl/server";
import { ContractInstancesTable } from "@/components/contracts/contract-instances-table";

export default async function InstancesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ContractInstancesTable />;
}
