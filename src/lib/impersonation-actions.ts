"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMPERSONATE_COOKIE } from "@/lib/impersonation-constants";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

async function verifyAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return !!me && me.role === "admin";
}

export async function startImpersonation(
  userId: string
): Promise<ActionResult> {
  const cookieStore = await cookies();

  if (cookieStore.get(IMPERSONATE_COOKIE)) {
    return { success: false, error: "already-impersonating" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const isAdmin = await verifyAdmin(user.id);
  if (!isAdmin) return { success: false, error: "unauthorized" };

  if (userId === user.id) return { success: false, error: "cannot-impersonate-self" };

  const admin = createAdminClient();

  const { data: targetProfile, error: profileError } = await admin
    .from("profiles")
    .select("role, approval_status, first_name, second_name, email")
    .eq("id", userId)
    .single();

  if (profileError || !targetProfile) return { success: false, error: "user-not-found" };

  if (targetProfile.role === "admin") return { success: false, error: "cannot-impersonate-admin" };

  if (targetProfile.approval_status !== "approved") {
    return { success: false, error: "cannot-impersonate-unapproved" };
  }

  const { data: targetAuth, error: userError } = await admin.auth.admin.getUserById(userId);

  if (userError || !targetAuth?.user?.email) {
    return { success: false, error: "user-not-found" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.refresh_token) return { success: false, error: "no-session" };

  cookieStore.set(
    IMPERSONATE_COOKIE,
    JSON.stringify({
      adminId: user.id,
      refreshToken: session.refresh_token,
    }),
    { httpOnly: true, sameSite: "lax", maxAge: 8 * 60 * 60 }
  );

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetAuth.user.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    cookieStore.delete(IMPERSONATE_COOKIE);
    return { success: false, error: "link-generation-failed" };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    cookieStore.delete(IMPERSONATE_COOKIE);
    return { success: false, error: "verify-failed" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function stopImpersonation(): Promise<ActionResult> {
  const cookieStore = await cookies();
  const data = cookieStore.get(IMPERSONATE_COOKIE)?.value;

  if (!data) return { success: false, error: "no-impersonation-session" };

  let impersonateData: { adminId: string; refreshToken: string };
  try {
    impersonateData = JSON.parse(data);
  } catch {
    cookieStore.delete(IMPERSONATE_COOKIE);
    return { success: false, error: "invalid-data" };
  }

  cookieStore.delete(IMPERSONATE_COOKIE);

  const supabase = await createClient();

  await supabase.auth.signOut();

  const { error } = await supabase.auth.refreshSession({
    refresh_token: impersonateData.refreshToken,
  });

  if (error) return { success: false, error: "restore-failed" };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getImpersonationState(): Promise<{
  impersonating: boolean;
}> {
  const cookieStore = await cookies();
  const data = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  if (!data) return { impersonating: false };

  try {
    JSON.parse(data);
    return { impersonating: true };
  } catch {
    return { impersonating: false };
  }
}
