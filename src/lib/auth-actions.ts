"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// ── Shared result types ──
export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export type UserProfile = {
  id: string;
  email: string;
  first_name: string;
  second_name: string;
  phone: string;
  approval_status: string;
  role: string;
  created_at: string;
  updated_at: string;
};

// ── Zod schemas with custom messages ──
const signUpSchema = z
  .object({
    first_name: z.string().trim().min(1, "firstNameRequired"),
    second_name: z.string().trim().min(1, "secondNameRequired"),
    phone: z.string().trim().min(8, "phoneMin"),
    email: z.string().trim().min(1, "emailRequired").email("emailInvalid"),
    password: z.string().min(6, "passwordMin"),
    confirm: z.string().min(1, "confirmRequired"),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "passwordMismatch",
  });

const signInSchema = z.object({
  email: z.string().trim().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

// ── Helpers ──
function formatZodErrors(issues: z.ZodIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "_form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

// ── Sign Up (return-based, checks rejected) ──
export async function signUp(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    first_name: formData.get("first_name"),
    second_name: formData.get("second_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  };

  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "validation",
      fieldErrors: formatZodErrors(parsed.error.issues),
    };
  }

  // Check if email has been permanently rejected
  const admin = createAdminClient();
  const { data: rejectedProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email.toLowerCase())
    .eq("approval_status", "rejected")
    .maybeSingle();

  if (rejectedProfile) {
    return { success: false, error: "email-rejected" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        second_name: parsed.data.second_name,
        phone: parsed.data.phone,
      },
      emailRedirectTo: `${await getOrigin()}/ar/auth/confirmed`,
    },
  });

  if (error) {
    const code =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered")
        ? "email-exists"
        : "signup-failed";
    return { success: false, error: code };
  }

  return { success: true };
}

// ── Sign In (return-based) ──
export async function signIn(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signInSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "validation",
      fieldErrors: formatZodErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: "invalid-credentials" };
  }

  return { success: true };
}

// ── Check current user's approval status (for real-time polling) ──
export async function checkMyStatus(): Promise<{
  authenticated: boolean;
  approval_status?: string;
  role?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authenticated: false };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("approval_status, role")
    .eq("id", user.id)
    .single();

  return {
    authenticated: true,
    approval_status: profile?.approval_status,
    role: profile?.role,
  };
}

// ── Resend confirmation email ──
export async function resendConfirmationEmail(
  email: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${await getOrigin()}/ar/auth/confirmed`,
    },
  });

  if (error) {
    return { success: false, error: "resendFailed" };
  }

  return { success: true };
}

// ── Admin: get users list (return-based, no redirect) ──
export async function getUsers(filters?: {
  status?: string;
  search?: string;
}): Promise<UserProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") return [];

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, first_name, second_name, phone, approval_status, role, created_at, updated_at");

  if (filters?.status && filters.status !== "all") {
    query = query.eq("approval_status", filters.status);
  }

  if (filters?.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `first_name.ilike.${s},second_name.ilike.${s},email.ilike.${s}`
    );
  }

  const { data } = await query
    .order("approval_status", { ascending: true })
    .order("created_at", { ascending: false });

  return (data as UserProfile[]) ?? [];
}

// ── Admin: set approval (return-based, no redirect) ──
export async function setApprovalReturn(
  id: string,
  status: "approved" | "rejected"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ approval_status: status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: "default" };

  revalidatePath("/", "layout");

  return { success: true };
}

// ── Admin: change user role ──
export async function changeUserRole(
  id: string,
  role: "user" | "admin"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: "default" };

  revalidatePath("/", "layout");

  return { success: true };
}

// ── Admin: get pending users count (for badge/toast) ──
export async function getPendingUsersCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") return 0;

  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");

  return count ?? 0;
}

// ── Legacy wrapper for backward compat (tests) ──
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export async function approveUser(id: string) {
  const locale = await getLocale();
  const result = await setApprovalReturn(id, "approved");
  if (!result.success) {
    redirect(`/${locale}/admin/users?error=1`);
  }
  redirect(`/${locale}/admin/users`);
}

export async function rejectUser(id: string) {
  const locale = await getLocale();
  const result = await setApprovalReturn(id, "rejected");
  if (!result.success) {
    redirect(`/${locale}/admin/users?error=1`);
  }
  redirect(`/${locale}/admin/users`);
}

