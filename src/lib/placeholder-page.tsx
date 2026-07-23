import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";

export function makePlaceholderPage(navKey: string) {
  return async function PlaceholderPage({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const tNav = await getTranslations("Nav");
    const tPlaceholder = await getTranslations("Placeholder");

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{tNav(navKey)}</h1>
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            {tPlaceholder("text")}
          </CardContent>
        </Card>
      </div>
    );
  };
}
