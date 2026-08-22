"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEgyptToday } from "@/lib/utils";

export type ActionResult = { success: true; id?: string } | { success: false; error: string };

export type AttendanceRow = {
  id: string;
  employee_id: string;
  check_in_date: string;
  check_in_time: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string;
  check_out_time: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_location_name: string;
  check_in_battery: number | null;
  check_in_device_name: string;
  check_out_battery: number | null;
  check_out_device_name: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AttendanceWithEmployee = AttendanceRow & {
  employee: {
    id: string;
    first_name: string;
    second_name: string;
    phone: string;
    position: string;
    avatar_url: string | null;
  } | null;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

export async function checkIn(data: {
  latitude: number;
  longitude: number;
  location_name?: string;
  notes?: string;
  battery?: number | null;
  device_name?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const today = getEgyptToday();

  const { data: existing } = await admin
    .from("attendance_records")
    .select("id")
    .eq("employee_id", user.id)
    .eq("check_in_date", today)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "already-checked-in" };
  }

  const { data: created, error } = await admin
    .from("attendance_records")
    .insert({
      employee_id: user.id,
      check_in_date: today,
      check_in_time: new Date().toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      location_name: data.location_name ?? "",
      check_in_battery: data.battery ?? null,
      check_in_device_name: data.device_name ?? "",
      notes: data.notes ?? "",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "create-failed" };
  revalidatePath("/", "layout");
  return { success: true, id: created.id };
}

export async function checkOut(data: {
  latitude: number;
  longitude: number;
  location_name?: string;
  notes?: string;
  battery?: number | null;
  device_name?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const { data: record } = await admin
    .from("attendance_records")
    .select("id, check_out_time")
    .eq("employee_id", user.id)
    .is("check_out_time", null)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) {
    return { success: false, error: "no-active-checkin" };
  }

  if (record.check_out_time) {
    return { success: false, error: "already-checked-out" };
  }

  const { error } = await admin
    .from("attendance_records")
    .update({
      check_out_time: new Date().toISOString(),
      check_out_latitude: data.latitude,
      check_out_longitude: data.longitude,
      check_out_location_name: data.location_name ?? "",
      check_out_battery: data.battery ?? null,
      check_out_device_name: data.device_name ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true, id: record.id };
}

export async function adminCheckIn(data: {
  employee_id: string;
  check_in_date: string;
  check_in_time: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  notes?: string;
  battery?: number | null;
  device_name?: string;
}): Promise<ActionResult> {
  const admin = await isAdmin();
  if (!admin) return { success: false, error: "unauthorized" };

  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("attendance_records")
    .select("id")
    .eq("employee_id", data.employee_id)
    .eq("check_in_date", data.check_in_date)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "already-checked-in" };
  }

  const timeStr = data.check_in_date && data.check_in_time
    ? `${data.check_in_date}T${data.check_in_time}:00+02:00`
    : new Date().toISOString();

  const { data: created, error } = await adminClient
    .from("attendance_records")
    .insert({
      employee_id: data.employee_id,
      check_in_date: data.check_in_date,
      check_in_time: timeStr,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      location_name: data.location_name ?? "",
      check_in_battery: data.battery ?? null,
      check_in_device_name: data.device_name ?? "",
      notes: data.notes ?? "",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "create-failed" };
  revalidatePath("/", "layout");
  return { success: true, id: created.id };
}

export async function adminCheckOut(data: {
  employee_id: string;
  check_out_date: string;
  check_out_time: string;
  notes?: string;
}): Promise<ActionResult> {
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) return { success: false, error: "unauthorized" };

  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const adminClient = createAdminClient();

  const { data: record } = await adminClient
    .from("attendance_records")
    .select("id, check_out_time")
    .eq("employee_id", data.employee_id)
    .eq("check_in_date", data.check_out_date)
    .maybeSingle();

  if (!record) {
    return { success: false, error: "no-active-checkin" };
  }

  if (record.check_out_time) {
    return { success: false, error: "already-checked-out" };
  }

  const timeStr = `${data.check_out_date}T${data.check_out_time}:00+02:00`;

  const { error } = await adminClient
    .from("attendance_records")
    .update({
      check_out_time: timeStr,
      check_out_location_name: `registered by ${user.email ?? "admin"}`,
      notes: data.notes ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true, id: record.id };
}

export async function updateAttendance(
  recordId: string,
  data: {
    check_in_date?: string;
    check_in_time?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_name?: string;
    check_out_time?: string | null;
    check_out_latitude?: number | null;
    check_out_longitude?: number | null;
    check_out_location_name?: string;
    notes?: string;
  }
): Promise<ActionResult> {
  const isUserAdmin = await isAdmin();
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const adminClient = createAdminClient();

  if (!isUserAdmin) {
    const { data: record } = await adminClient
      .from("attendance_records")
      .select("employee_id")
      .eq("id", recordId)
      .single();
    if (!record || record.employee_id !== user.id) {
      return { success: false, error: "unauthorized" };
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.check_in_date !== undefined) updateData.check_in_date = data.check_in_date;
  if (data.check_in_time !== undefined) {
    updateData.check_in_time = `${data.check_in_time}:00+02:00`;
  }
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.location_name !== undefined) updateData.location_name = data.location_name;
  if (data.check_out_time !== undefined) updateData.check_out_time = data.check_out_time;
  if (data.check_out_latitude !== undefined) updateData.check_out_latitude = data.check_out_latitude;
  if (data.check_out_longitude !== undefined) updateData.check_out_longitude = data.check_out_longitude;
  if (data.check_out_location_name !== undefined) updateData.check_out_location_name = data.check_out_location_name;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const { error } = await adminClient
    .from("attendance_records")
    .update(updateData)
    .eq("id", recordId);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteAttendance(recordId: string): Promise<ActionResult> {
  const isUserAdmin = await isAdmin();
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const adminClient = createAdminClient();

  if (!isUserAdmin) {
    const { data: record } = await adminClient
      .from("attendance_records")
      .select("employee_id")
      .eq("id", recordId)
      .single();
    if (!record || record.employee_id !== user.id) {
      return { success: false, error: "unauthorized" };
    }
  }

  const { error } = await adminClient
    .from("attendance_records")
    .delete()
    .eq("id", recordId);

  if (error) return { success: false, error: "delete-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getAttendanceByDate(date: string): Promise<AttendanceWithEmployee[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  let query = adminClient
    .from("attendance_records")
    .select(`
      *,
      employee:profiles!attendance_records_employee_id_fkey(id, first_name, second_name, phone, position, avatar_url)
    `)
    .eq("check_in_date", date)
    .order("check_in_time", { ascending: false });

  if (!isUserAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data as unknown as AttendanceWithEmployee[];
}

export async function getAttendanceByMonth(year: number, month: number): Promise<AttendanceWithEmployee[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let query = adminClient
    .from("attendance_records")
    .select(`
      *,
      employee:profiles!attendance_records_employee_id_fkey(id, first_name, second_name, phone, position, avatar_url)
    `)
    .gte("check_in_date", startDate)
    .lte("check_in_date", endDate)
    .order("check_in_date", { ascending: false })
    .order("check_in_time", { ascending: false });

  if (!isUserAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data as unknown as AttendanceWithEmployee[];
}

export type AttendanceStats =
  | {
      totalEmployees: number;
      workingDays: number;
      totalExpected: number;
      totalActual: number;
      attendanceRate: number;
      employeeStats: {
        employeeId: string;
        employeeName: string;
        position: string;
        daysPresent: number;
        workingDays: number;
        attendanceRate: number;
        avgCheckInTime: string;
      }[];
    }
  | {
      daysPresent: number;
      workingDays: number;
      attendanceRate: number;
      avgCheckInTime: string;
    }
  | null;

export async function getAttendanceStats(year: number, month: number): Promise<AttendanceStats> {
  const user = await getCurrentUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  if (isUserAdmin) {
    const { data: records } = await adminClient
      .from("attendance_records")
      .select("employee_id, check_in_date, check_in_time")
      .gte("check_in_date", startDate)
      .lte("check_in_date", endDate)
      .order("check_in_date", { ascending: true });

    const { data: employees } = await adminClient
      .from("profiles")
      .select("id, first_name, second_name, position")
      .eq("approval_status", "approved")
      .order("first_name", { ascending: true });

    const totalEmployees = (employees ?? []).length;
    const workingDays = lastDay;
    const totalExpected = totalEmployees * workingDays;
    const totalActual = (records ?? []).length;

    const employeeStats = (employees ?? []).map((emp) => {
      const empRecords = (records ?? []).filter((r) => r.employee_id === emp.id);
      const daysPresent = new Set(empRecords.map((r) => r.check_in_date)).size;
      const attendanceRate = workingDays > 0 ? Math.round((daysPresent / workingDays) * 100) : 0;

      const times = empRecords
        .map((r) => {
          const t = new Date(r.check_in_time);
          return t.getHours() * 60 + t.getMinutes();
        })
        .filter((m) => m > 0);

      const avgMinutes = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      const avgHour = Math.floor(avgMinutes / 60);
      const avgMin = avgMinutes % 60;

      return {
        employeeId: emp.id,
        employeeName: [emp.first_name, emp.second_name].filter(Boolean).join(" ") || "—",
        position: emp.position ?? "",
        daysPresent,
        workingDays,
        attendanceRate,
        avgCheckInTime: times.length > 0 ? `${String(avgHour).padStart(2, "0")}:${String(avgMin).padStart(2, "0")}` : "—",
      };
    });

    return {
      totalEmployees,
      workingDays,
      totalExpected,
      totalActual,
      attendanceRate: totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0,
      employeeStats,
    };
  } else {
    const { data: records } = await adminClient
      .from("attendance_records")
      .select("check_in_date, check_in_time")
      .eq("employee_id", user.id)
      .gte("check_in_date", startDate)
      .lte("check_in_date", endDate)
      .order("check_in_date", { ascending: true });

    const daysPresent = new Set((records ?? []).map((r) => r.check_in_date)).size;

    const times = (records ?? [])
      .map((r) => {
        const t = new Date(r.check_in_time);
        return t.getHours() * 60 + t.getMinutes();
      })
      .filter((m) => m > 0);

    const avgMinutes = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const avgHour = Math.floor(avgMinutes / 60);
    const avgMin = avgMinutes % 60;

    return {
      daysPresent,
      workingDays: lastDay,
      attendanceRate: lastDay > 0 ? Math.round((daysPresent / lastDay) * 100) : 0,
      avgCheckInTime: times.length > 0 ? `${String(avgHour).padStart(2, "0")}:${String(avgMin).padStart(2, "0")}` : "—",
    };
  }
}

export async function getEmployees() {
  const user = await getCurrentUser();
  if (!user) return [];

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("profiles")
    .select("id, first_name, second_name, position")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  return (data ?? []) as { id: string; first_name: string; second_name: string; position: string }[];
}

export async function checkTodayStatus(): Promise<{ checkedIn: boolean; checkedOut: boolean; recordId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { checkedIn: false, checkedOut: false };

  const adminClient = createAdminClient();
  const today = getEgyptToday();

  const { data } = await adminClient
    .from("attendance_records")
    .select("id, check_out_time")
    .eq("employee_id", user.id)
    .eq("check_in_date", today)
    .maybeSingle();

  return {
    checkedIn: !!data,
    checkedOut: !!data?.check_out_time,
    recordId: data?.id,
  };
}
