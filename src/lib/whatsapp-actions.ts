"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp-send";

function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11 && (digits.startsWith("0") || digits.startsWith("1"))) {
    if (digits.startsWith("0")) return "2" + digits;
    return "20" + digits;
  }
  if (digits.length >= 11 && digits.startsWith("2")) return digits;
  return phone;
}

export interface Campaign {
  id: string;
  created_by: string;
  status: "active" | "paused" | "completed" | "stopped";
  total_count: number;
  delay_ms: number;
  delay_max_ms: number;
  message_template: string;
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecord {
  id: string;
  campaign_id: string;
  record_id: string;
  owner_name: string;
  owner_phone: string;
  owner_phone_alt: string;
  phone_normalized: string;
  state: "" | "send" | "failed";
  error_message: string;
  sent_at: string | null;
}

export async function createCampaign(data: {
  count: number;
  delayMinMs: number;
  delayMaxMs: number;
  message: string;
  folderId?: string;
  fileId?: string;
}) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  let query = admin
    .from("unconfirmed_records")
    .select("*")
    .eq("status", "approved")
    .eq("whatsapp_state", "");

  if (data.fileId) {
    query = query.eq("file_id", data.fileId);
  }
  if (data.folderId) {
    const { data: files } = await admin
      .from("unconfirmed_files")
      .select("id")
      .eq("folder_id", data.folderId);
    const fileIds = (files ?? []).map((f) => f.id);
    if (fileIds.length === 0) throw new Error("no-records-available");
    query = query.in("file_id", fileIds);
  }

  const { data: records, error: fetchError } = await query
    .order("row_number", { ascending: true })
    .limit(data.count);

  if (fetchError || !records || records.length === 0) {
    throw new Error("no-records-available");
  }

  const { data: campaign, error: campError } = await admin
    .from("whatsapp_campaigns")
    .insert({
      created_by: user.id,
      status: "active",
      total_count: records.length,
      delay_ms: data.delayMinMs,
      delay_max_ms: data.delayMaxMs,
      message_template: data.message,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
    })
    .select()
    .single();

  if (campError || !campaign) throw new Error(campError?.message || "campaign-create-failed");

  const { error: recError } = await admin.from("whatsapp_campaign_records").insert(
    records.map((r) => ({
      campaign_id: campaign.id,
      record_id: r.id,
      owner_name: r.owner_name,
      unit_area: r.unit_area,
      building_number: r.building_number,
      unit_number: r.unit_number,
      owner_phone: r.owner_phone,
      owner_phone_alt: r.owner_phone_alt,
      affiliated_company: r.affiliated_company,
      last_feedback: r.last_feedback,
      last_contact_date: r.last_contact_date,
      extra_data: r.extra_data,
      phone_normalized: r.phone_normalized,
      phone_alt_normalized: r.phone_alt_normalized,
      state: "",
      error_message: "",
    }))
  );

  if (recError) {
    await admin.from("whatsapp_campaigns").delete().eq("id", campaign.id);
    throw new Error("campaign-records-create-failed");
  }

  redirect(`/${locale}/unconfirmed-data/campaign/${campaign.id}`);
}

export async function processCampaignRecord(campaignId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("campaign-not-found");
  if (campaign.created_by !== user.id) throw new Error("unauthorized");
  if (campaign.status !== "active") return { done: true, campaign };

  const { data: nextRecord } = await admin
    .from("whatsapp_campaign_records")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("state", "")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!nextRecord) {
    await admin.from("whatsapp_campaigns").update({ status: "completed" }).eq("id", campaignId);
    return { done: true, campaign: { ...campaign, status: "completed" } };
  }

  const rawNumber = nextRecord.phone_normalized || nextRecord.owner_phone;
  const number = rawNumber ? toInternationalPhone(rawNumber) : "";
  const result = number ? await sendWhatsAppMessage(number, campaign.message_template) : { success: false, error: "no-number" };

  const newState = result.success ? "send" : "failed";

  await admin.from("whatsapp_campaign_records").update({
    state: newState,
    error_message: result.success ? "" : result.error || "unknown",
    sent_at: new Date().toISOString(),
  }).eq("id", nextRecord.id);

  if (nextRecord.record_id) {
    const updates: Record<string, unknown> = { whatsapp_state: newState };
    if (result.success) updates.last_contact_date = new Date().toISOString().split("T")[0];
    await admin.from("unconfirmed_records").update(updates).eq("id", nextRecord.record_id);
  }

  const processed = campaign.processed_count + 1;
  const successCount = campaign.success_count + (result.success ? 1 : 0);
  const failedCount = campaign.failed_count + (result.success ? 0 : 1);

  const isDone = processed >= campaign.total_count;

  await admin.from("whatsapp_campaigns").update({
    processed_count: processed,
    success_count: successCount,
    failed_count: failedCount,
    status: isDone ? "completed" : "active",
  }).eq("id", campaignId);

  return {
    done: isDone,
    record: { ...nextRecord, state: newState },
    campaign: {
      ...campaign,
      processed_count: processed,
      success_count: successCount,
      failed_count: failedCount,
      status: isDone ? "completed" : "active",
    },
  };
}

export async function getCampaign(campaignId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("campaign-not-found");
  if (campaign.created_by !== user.id) throw new Error("unauthorized");

  const { data: records } = await admin
    .from("whatsapp_campaign_records")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  return { campaign, records: records ?? [] };
}

export async function pauseCampaign(campaignId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("created_by, status")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("campaign-not-found");
  if (campaign.created_by !== user.id) throw new Error("unauthorized");
  if (campaign.status !== "active") throw new Error("campaign-not-active");

  await admin.from("whatsapp_campaigns").update({ status: "paused" }).eq("id", campaignId);
}

export async function resumeCampaign(campaignId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("created_by, status")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("campaign-not-found");
  if (campaign.created_by !== user.id) throw new Error("unauthorized");
  if (campaign.status !== "paused") throw new Error("campaign-not-paused");

  await admin.from("whatsapp_campaigns").update({ status: "active" }).eq("id", campaignId);
}

export async function stopCampaign(campaignId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("created_by")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("campaign-not-found");
  if (campaign.created_by !== user.id) throw new Error("unauthorized");

  await admin
    .from("whatsapp_campaigns")
    .update({ status: "stopped" })
    .eq("id", campaignId);
}

export async function updateCampaign(campaignId: string, data: {
  delayMinMs?: number;
  delayMaxMs?: number;
  message?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("created_by, status")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("campaign-not-found");
  if (campaign.created_by !== user.id) throw new Error("unauthorized");
  if (campaign.status !== "paused") throw new Error("campaign-not-paused");

  const updates: Record<string, unknown> = {};
  if (data.delayMinMs !== undefined) updates.delay_ms = data.delayMinMs;
  if (data.delayMaxMs !== undefined) updates.delay_max_ms = data.delayMaxMs;
  if (data.message !== undefined) updates.message_template = data.message;

  await admin.from("whatsapp_campaigns").update(updates).eq("id", campaignId);
}
