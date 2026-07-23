import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title.login")}</CardTitle>
        <CardDescription>{t("subtitle.login")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        <Separator />
        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary hover:underline"
          >
            {t("link.signup")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
