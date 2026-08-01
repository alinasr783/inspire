import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { DeviceRow } from "@/lib/device-actions";
import { DevicesClient } from "@/components/devices/devices-client";

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data } = await supabase
    .from("user_devices")
    .select("id, fingerprint, label, user_agent, last_seen_at, created_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  const devices = (data ?? []) as DeviceRow[];

  return (
    <div className="space-y-6">
      <DevicesClient initialDevices={devices} locale={locale} />
    </div>
  );
}
