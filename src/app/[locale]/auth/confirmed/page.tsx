import { setRequestLocale } from "next-intl/server";
import { ConfirmedContent } from "@/components/auth/confirmed-content";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; email?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  return <ConfirmedContent sent={sp.sent === "1"} email={sp.email ?? ""} />;
}
