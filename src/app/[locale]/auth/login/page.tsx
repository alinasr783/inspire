import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";

const knownErrors = [
  "validation",
  "invalid-credentials",
  "email-exists",
  "signup-failed",
];

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Auth");

  const errorMsg =
    sp.error && knownErrors.includes(sp.error)
      ? t(`errors.${sp.error}`)
      : sp.error
        ? t("errors.default")
        : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title.login")}</CardTitle>
        <CardDescription>{t("subtitle.login")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        <LoginForm />
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
