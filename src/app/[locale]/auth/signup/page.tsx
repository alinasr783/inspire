import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignupForm } from "@/components/auth/signup-form";
import { Link } from "@/i18n/navigation";

export default async function SignupPage({
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
        <CardTitle className="text-xl">{t("title.signup")}</CardTitle>
        <CardDescription>{t("subtitle.signup")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <Separator />
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
