import { setRequestLocale } from "next-intl/server";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <UsersTable />;
}
