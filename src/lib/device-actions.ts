"use server";

import { headers } from "next/headers";
import QRCode from "qrcode";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export type DeviceRow = {
  id: string;
  fingerprint: string;
  label: string | null;
  user_agent: string | null;
  last_seen_at: string;
  created_at: string;
};

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── Register / refresh the current device ──
export async function registerDevice(input: {
  fingerprint: string;
  label: string;
  userAgent?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const { error } = await supabase.from("user_devices").upsert(
    {
      user_id: user.id,
      fingerprint: input.fingerprint,
      label: input.label,
      user_agent: input.userAgent ? input.userAgent.slice(0, 500) : null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,fingerprint" }
  );

  if (error) return { success: false, error: "register-failed" };

  return { success: true };
}

// ── Generate a QR code with a custom device login token ──
export async function createDeviceQr(
  locale: string
): Promise<ActionResult & { qrDataUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { success: false, error: "unauthorized" };

  const token = generateToken();

  const admin = createAdminClient();
  const { error: insertError } = await admin
    .from("device_login_tokens")
    .insert({
      user_id: user.id,
      token,
    });

  if (insertError) return { success: false, error: "token-create-failed" };

  const loginUrl = `${await getOrigin()}/${locale}/auth/device?token=${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(loginUrl, {
    width: 260,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return { success: true, qrDataUrl };
}

// ── Validate a device login token and authenticate the device ──
export async function validateDeviceToken(
  rawToken: string
): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  if (!rawToken) return { success: false, error: "invalid-token" };

  const admin = createAdminClient();

  const { data, error: fetchError } = await admin
    .from("device_login_tokens")
    .select("id, user_id, used, expires_at")
    .eq("token", rawToken)
    .single();

  if (fetchError || !data) return { success: false, error: "invalid-token" };

  if (data.used) return { success: false, error: "already-used" };

  if (new Date(data.expires_at) < new Date()) {
    return { success: false, error: "expired" };
  }

  const { error: markError } = await admin
    .from("device_login_tokens")
    .update({ used: true })
    .eq("id", data.id);

  if (markError) return { success: false, error: "mark-failed" };

  return { success: true, userId: data.user_id };
}

// ── Remove a device from the list (does not force-sign-out the session) ──
export async function removeDevice(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: "remove-failed" };

  return { success: true };
}
