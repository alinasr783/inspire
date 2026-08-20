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
  firstName: string;
  userColor: string;
  avatarUrl: string | null;
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

export type StyleChangePayload = {
  userId: string;
  userName: string;
  userColor: string;
  table: string;
  elementType: "table" | "column" | "row" | "cell";
  scope: "table" | "column" | "row" | "cell";
  rowId: string;
  colKey: string;
  prop: string;
  value: string;
  ts: number;
};

const STYLE_CHANNEL = "broadcast:inspire:celledits";

export async function broadcastStyleChange(payload: Omit<StyleChangePayload, "ts">) {
  const supabase = createRealtimeClient();
  const ch = supabase.channel(STYLE_CHANNEL);
  return new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "styleChange", payload: { ...payload, ts: Date.now() } });
        setTimeout(() => { supabase.removeChannel(ch); resolve(); }, 500);
      }
    });
  });
}

export function subscribeStyleChanges(callback: (payload: StyleChangePayload) => void) {
  const supabase = createRealtimeClient();
  const ch = supabase.channel("broadcast:inspire:cellstyles", { config: { broadcast: { self: false } } });
  ch.on("broadcast" as never, { event: "styleChange" }, (msg: { payload: StyleChangePayload }) => {
    callback(msg.payload);
  });
  ch.subscribe();
  return () => { supabase.removeChannel(ch); };
}
