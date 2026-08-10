import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Attendance");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.role === "admin";

  const today = new Date().toISOString().split("T")[0];

  let query = admin
    .from("attendance_records")
    .select(`
      *,
      employee:profiles!attendance_records_employee_id_fkey(id, first_name, second_name, phone, position, avatar_url)
    `)
    .eq("check_in_date", today)
    .order("check_in_time", { ascending: false });

  if (!isAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data: records } = await query;

  const attendanceRecords: AttendanceWithEmployee[] = (records ?? []) as unknown as AttendanceWithEmployee[];

  let alreadyCheckedIn = false;
  if (!isAdmin) {
    alreadyCheckedIn = attendanceRecords.length > 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
      </div>

      <AttendanceClient
        locale={locale}
        isAdmin={isAdmin}
        userId={user.id}
        initialRecords={attendanceRecords}
        initialDate={today}
        initialCheckedIn={alreadyCheckedIn}
      />
    </div>
  );
}
