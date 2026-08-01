"use server";

import { headers } from "next/headers";
import QRCode from "qrcode";

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

// ── Generate a fresh magic-link QR for device login ──
export async function createDeviceQr(
  locale: string
): Promise<ActionResult & { qrDataUrl?: string; url?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: {
      redirectTo: `${await getOrigin()}/${locale}/auth/device/complete`,
    },
  });

  if (error) return { success: false, error: "link-failed" };

  const link = data.properties.action_link;

  const qrDataUrl = await QRCode.toDataURL(link, {
    width: 260,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return { success: true, qrDataUrl, url: link };
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
