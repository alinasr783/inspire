"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

const signUpSchema = z
  .object({
    first_name: z.string().trim().min(1),
    second_name: z.string().trim().min(1),
    phone: z.string().trim().min(8),
    email: z.string().trim().email(),
    password: z.string().min(6),
    confirm: z.string().min(6),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "passwords-do-not-match",
  });

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function signUp(formData: FormData) {
  const locale = await getLocale();
  const parsed = signUpSchema.safeParse({
    first_name: formData.get("first_name"),
    second_name: formData.get("second_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    redirect(`/${locale}/auth/signup?error=validation`);
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
      emailRedirectTo: `${await getOrigin()}/${locale}/auth/confirmed`,
    },
  });

  if (error) {
    const code =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered")
        ? "email-exists"
        : "signup-failed";
    redirect(`/${locale}/auth/signup?error=${code}`);
  }

  redirect(`/${locale}/auth/confirmed?sent=1`);
}

export async function signIn(formData: FormData) {
  const locale = await getLocale();
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/${locale}/auth/login?error=invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(`/${locale}/auth/login?error=invalid-credentials`);
  }

  redirect(`/${locale}`);
}

export async function setApproval(id: string, status: "approved" | "rejected") {
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") {
    redirect(`/${locale}`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ approval_status: status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/admin/users?error=1`);
  }

  redirect(`/${locale}/admin/users`);
}

export async function approveUser(id: string) {
  await setApproval(id, "approved");
}

export async function rejectUser(id: string) {
  await setApproval(id, "rejected");
}
