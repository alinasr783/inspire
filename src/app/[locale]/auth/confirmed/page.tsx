import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, MailCheck } from "lucide-react";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Auth");
  const sent = sp.sent === "1";

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        {sent ? (
          <MailCheck className="h-12 w-12 text-primary" />
        ) : (
          <CheckCircle2 className="h-12 w-12 text-primary" />
        )}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {sent ? t("checkEmail") : t("confirmedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sent ? t("sentSubtitle") : t("confirmedSubtitle")}
          </p>
        </div>
        <Button render={<Link href="/auth/login" />}>{t("goToLogin")}</Button>
      </CardContent>
    </Card>
  );
}
