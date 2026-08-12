"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type BanRow = {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  ban_type: "temporary" | "permanent";
  banned_until: string | null;
  is_active: boolean;
  created_at: string;
  lifted_at: string | null;
  lifted_by: string | null;
};

export type BanInfo = {
  is_banned: boolean;
  ban: {
    id: string;
    reason: string | null;
    ban_type: "temporary" | "permanent";
    banned_until: string | null;
    banned_at: string;
  } | null;
};

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("unauthorized");
  return { adminId: profile.id, adminUserId: user.id };
}

export async function getActiveBan(userId: string): Promise<BanInfo> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_bans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return { is_banned: false, ban: null };

  const ban = data as BanRow;

  if (ban.ban_type === "temporary" && ban.banned_until) {
    const until = new Date(ban.banned_until);
    if (until.getTime() <= Date.now()) {
      await admin
        .from("user_bans")
        .update({ is_active: false, lifted_at: new Date().toISOString() })
        .eq("id", ban.id);
      return { is_banned: false, ban: null };
    }
  }

  return {
    is_banned: true,
    ban: {
      id: ban.id,
      reason: ban.reason,
      ban_type: ban.ban_type,
      banned_until: ban.banned_until,
      banned_at: ban.created_at,
    },
  };
}

export async function banEmployee(
  employeeId: string,
  banType: "temporary" | "permanent",
  durationDays: number | null,
  reason: string | null
): Promise<ActionResult> {
  const { adminId } = await requireAdmin();
  const admin = createAdminClient();

  const existing = await getActiveBan(employeeId);
  if (existing.is_banned) {
    return { success: false, error: "already_banned" };
  }

  let bannedUntil: string | null = null;
  if (banType === "temporary" && durationDays) {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    bannedUntil = d.toISOString();
  }

  const { error } = await admin.from("user_bans").insert({
    user_id: employeeId,
    banned_by: adminId,
    reason: reason || null,
    ban_type: banType,
    banned_until: bannedUntil,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function unbanEmployee(
  employeeId: string
): Promise<ActionResult> {
  const { adminId } = await requireAdmin();
  const admin = createAdminClient();

  const { data: activeBans } = await admin
    .from("user_bans")
    .select("id")
    .eq("user_id", employeeId)
    .eq("is_active", true);

  if (!activeBans || activeBans.length === 0) {
    return { success: false, error: "not_banned" };
  }

  const updates = activeBans.map((b) =>
    admin
      .from("user_bans")
      .update({
        is_active: false,
        lifted_at: new Date().toISOString(),
        lifted_by: adminId,
      })
      .eq("id", b.id)
  );

  await Promise.all(updates);

  revalidatePath("/");
  return { success: true };
}

export async function checkCurrentUserBan(): Promise<BanInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { is_banned: false, ban: null };

  return getActiveBan(user.id);
}
