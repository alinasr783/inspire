import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const sp = await searchParams;
  const linkError =
    sp.error === "invalid-link"
      ? "loginLinkInvalid"
      : sp.error === "expired-link"
        ? "loginLinkExpired"
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title.login")}</CardTitle>
        <CardDescription>{t("subtitle.login")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkError && (
          <Alert variant="destructive">
            <AlertDescription>{t(`errors.${linkError}`)}</AlertDescription>
          </Alert>
        )}
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
