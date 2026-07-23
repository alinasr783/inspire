import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignupForm } from "@/components/auth/signup-form";
import { Link } from "@/i18n/navigation";

const knownErrors = [
  "validation",
  "invalid-credentials",
  "email-exists",
  "signup-failed",
];

export default async function SignupPage({
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
        <CardTitle className="text-xl">{t("title.signup")}</CardTitle>
        <CardDescription>{t("subtitle.signup")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            {t("link.login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
