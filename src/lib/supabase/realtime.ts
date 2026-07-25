import { createClient } from "@/lib/supabase/client";

export function createRealtimeClient() {
  return createClient();
}

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export type RealtimePayload<T = Record<string, unknown>> = {
  eventType: RealtimeEvent;
  new: T;
  old: Partial<T>;
  table: string;
  schema: string;
};

export type CursorPayload = {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  ts: number;
};

export type PresenceState = {
  userId: string;
  firstName: string;
  secondName: string;
  email: string;
  role: string;
  color: string;
  initials: string;
  onlineAt: string;
};
