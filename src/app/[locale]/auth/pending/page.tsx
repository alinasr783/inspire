import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Clock } from "lucide-react";

export default async function PendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <Clock className="h-12 w-12 text-primary" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t("pendingTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pendingSubtitle")}</p>
        </div>
        <Button render={<Link href="/auth/login" />}>
          {t("pendingBack")}
        </Button>
      </CardContent>
    </Card>
  );
}
