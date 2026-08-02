import { createClient as createSupabaseClient } from "@/lib/supabase/client";

let _realtimeClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createRealtimeClient() {
  if (!_realtimeClient) {
    _realtimeClient = createSupabaseClient();
  }
  return _realtimeClient;
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
  sx: number;
  sy: number;
  vw: number;
  vh: number;
  page: string;
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
  avatarUrl: string | null;
  page: string;
  onlineAt: string;
};

export type CellEditPayload = {
  userId: string;
  userName: string;
  userColor: string;
  initials: string;
  table: string;
  rowId: string;
  field: string;
  action: "update" | "insert" | "delete";
  ts: number;
};
