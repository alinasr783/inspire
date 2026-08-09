import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractsClient } from "@/components/contracts/contracts-client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FileStack, FileText, Plus } from "lucide-react";

export default async function ContractsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contracts");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  const isAdmin = currentProfile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/contracts/instances">
            <Button variant="outline" size="sm" className="gap-2">
              <FileStack className="h-4 w-4" />
              <span className="hidden sm:inline">{t("savedContracts")}</span>
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/contracts/templates/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("createContract")}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <ContractsClient isAdmin={isAdmin} />
    </div>
  );
}
