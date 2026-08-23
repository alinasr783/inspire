"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  runAssistantChat,
  type ChatHistoryEntry,
} from "@/lib/assistant/chat";

export type SendAssistantMessageInput = {
  message: string;
  history: ChatHistoryEntry[];
};

export async function sendAssistantMessage(input: SendAssistantMessageInput) {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  return runAssistantChat(input.message, input.history);
}
