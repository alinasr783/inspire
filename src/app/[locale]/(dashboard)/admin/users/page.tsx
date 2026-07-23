import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveUser, rejectUser } from "@/lib/auth-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") {
    redirect(`/${locale}`);
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("profiles")
    .select("id, email, first_name, second_name, phone, approval_status, created_at")
    .order("approval_status", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t("name")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("email")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("phone")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("status")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {[u.first_name, u.second_name].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-3 py-2" dir="ltr">
                        {u.email}
                      </td>
                      <td className="px-3 py-2" dir="ltr">
                        {u.phone || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            statusStyles[u.approval_status] ?? statusStyles.pending
                          )}
                        >
                          {t(`status_${u.approval_status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <form action={approveUser.bind(null, u.id)}>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={u.approval_status === "approved"}
                            >
                              {t("approve")}
                            </Button>
                          </form>
                          <form action={rejectUser.bind(null, u.id)}>
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                              disabled={u.approval_status === "rejected"}
                            >
                              {t("reject")}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
