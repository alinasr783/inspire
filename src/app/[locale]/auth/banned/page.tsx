import { getLocale } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCurrentUserBan } from "@/lib/ban-actions";
import { BanScreen } from "@/components/auth/ban-screen";

export default async function BannedPage() {
  const locale = await getLocale();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const banInfo = await checkCurrentUserBan();
  if (!banInfo.is_banned) redirect(`/${locale}`);

  return <BanScreen banInfo={banInfo.ban!} />;
}
