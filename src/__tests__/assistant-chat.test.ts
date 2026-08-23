/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase admin client (same pattern as mcp-data.test.ts) ──
type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};

function createMockClient() {
  let currentTable = "";
  let filters: { col: string; op: "eq" | "ilike" | "gte" | "lte"; val: unknown }[] = [];
  const orFilters: string[] = [];
  let orderBy: { column: string; asc: boolean } | null = null;
  let range_: { from: number; to: number } | null = null;
  let singleMode: "single" | "maybeSingle" | null = null;
  let countMode = false;
  let pendingOp: { type: "insert" | "update" | "delete"; row?: Row; patch?: Row } | null = null;

  function colValue(row: Row, col: string): unknown {
    if (col.includes("->>")) {
      const [base, key] = col.split("->>");
      return ((row[base] ?? {}) as Record<string, unknown>)[key];
    }
    return row[col];
  }
  function cmp(a: unknown, b: unknown): number {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  }
  function evaluate(): Row[] {
    let rows = [...(mockTables[currentTable] ?? [])];
    for (const f of filters) {
      if (f.op === "eq") rows = rows.filter((r) => colValue(r, f.col) === f.val);
      if (f.op === "ilike") {
        const needle = String(f.val).replace(/%/g, "").toLowerCase();
        rows = rows.filter((r) => String(colValue(r, f.col) ?? "").toLowerCase().includes(needle));
      }
      if (f.op === "gte") rows = rows.filter((r) => cmp(colValue(r, f.col), f.val) >= 0);
      if (f.op === "lte") rows = rows.filter((r) => cmp(colValue(r, f.col), f.val) <= 0);
    }
    for (const orF of orFilters) {
      rows = rows.filter((r) =>
        orF.split(",").some((cond) => {
          const [col, op, raw] = cond.split(".");
          if (op === "ilike") {
            const needle = String(raw).replace(/%/g, "").toLowerCase();
            return String(colValue(r, col) ?? "").toLowerCase().includes(needle);
          }
          if (op === "gte") return cmp(colValue(r, col), Number(raw)) >= 0;
          if (op === "lte") return cmp(colValue(r, col), Number(raw)) <= 0;
          return true;
        })
      );
    }
    if (orderBy) {
      rows = [...rows].sort((a, b) => {
        const c = cmp(a[orderBy!.column], b[orderBy!.column]);
        return orderBy!.asc ? c : -c;
      });
    }
    if (range_) rows = rows.slice(range_.from, range_.to + 1);
    return rows;
  }

  const builder = {
    select: (_cols?: string, opts?: { count?: string }) => {
      countMode = !!opts?.count;
      return builder;
    },
    eq: (col: string, val: unknown) => { filters.push({ col, op: "eq", val }); return builder; },
    ilike: (col: string, val: unknown) => { filters.push({ col, op: "ilike", val }); return builder; },
    gte: (col: string, val: unknown) => { filters.push({ col, op: "gte", val }); return builder; },
    lte: (col: string, val: unknown) => { filters.push({ col, op: "lte", val }); return builder; },
    or: (f: string) => { orFilters.push(f); return builder; },
    order: (col: string, opts: { ascending: boolean }) => { orderBy = { column: col, asc: opts.ascending }; return builder; },
    range: (from: number, to: number) => { range_ = { from, to }; return builder; },
    single: () => { singleMode = "single"; return builder; },
    maybeSingle: () => { singleMode = "maybeSingle"; return builder; },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (pendingOp?.type === "insert") { const row = pendingOp.row!; pendingOp = null; resolve({ data: row, error: null }); return; }
      if (pendingOp?.type === "update") {
        const rows = evaluate();
        for (const r of rows) Object.assign(r, pendingOp.patch!);
        pendingOp = null;
        resolve({ data: rows[0] ?? null, error: null });
        return;
      }
      if (pendingOp?.type === "delete") {
        const ids = new Set(evaluate().map((r) => r.id));
        mockTables[currentTable] = (mockTables[currentTable] ?? []).filter((r) => !ids.has(r.id));
        pendingOp = null;
        resolve({ data: null, error: null });
        return;
      }
      const rows = evaluate();
      if (countMode) { countMode = false; resolve({ data: null, count: rows.length, error: null }); return; }
      if (singleMode === "single") resolve(rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } });
      else if (singleMode === "maybeSingle") resolve({ data: rows[0] ?? null, error: null });
      else resolve({ data: rows, error: null });
    },
    insert: (row: Row) => { mockTables[currentTable] = [...(mockTables[currentTable] ?? []), row]; pendingOp = { type: "insert", row }; return builder; },
    update: (patch: Row) => { pendingOp = { type: "update", patch }; return builder; },
    delete: () => { pendingOp = { type: "delete" }; return builder; },
  };
  const from = (table: string) => {
    currentTable = table;
    filters = [];
    orFilters.length = 0;
    orderBy = null;
    range_ = null;
    singleMode = null;
    countMode = false;
    pendingOp = null;
    return builder;
  };
  return { from };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createMockClient(),
}));

// ── Import module under test ──
import { runAssistantChat } from "@/lib/assistant/chat";

const DEFAULT_USER = "66d6da0f-e5d1-4498-86a8-944c3685ab26";
const OLD_ENV = process.env;

const toolCallResponse = {
  choices: [
    {
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "search_units", arguments: '{"query":"الشيخ زايد","limit":5}' },
          },
        ],
      },
    },
  ],
};

const finalResponse = {
  choices: [
    {
      message: {
        role: "assistant",
        content: "وجدت عقارًا واحدًا في الشيخ زايد: شقة سعرها مليون ونصف.",
      },
    },
  ],
};

describe("assistant chat", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.MCP_DEFAULT_USER_ID = DEFAULT_USER;
    process.env.DEEPSEEK_API_KEY = "test-key";
    delete mockTables.units;
    delete mockTables.clients;
  });

  test("executes tool calls and returns final reply with actions", async () => {
    mockTables.units = [
      {
        id: "u1",
        customer_name: "أحمد",
        phone: "0100",
        compound_name: "ميدتاون",
        area: "الشيخ زايد",
        rent_sale: "بيع",
        cash_required: 1500000,
        created_at: "2024-01-01",
      },
    ];

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(toolCallResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(finalResponse), { status: 200 })
      );

    const result = await runAssistantChat("اعرض لي عقارات في الشيخ زايد", []);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].tool).toBe("search_units");
    expect(result.actions[0].ok).toBe(true);
    expect(result.reply).toContain("الشيخ زايد");

    // Verify the tool result was fed back to the model
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(secondCallBody.messages.some((m: { role: string }) => m.role === "tool")).toBe(true);

    fetchMock.mockRestore();
  });

  test("handles failed tool execution gracefully", async () => {
    const failResponse = {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_2",
                type: "function",
                function: { name: "get_unit", arguments: '{"id":"not-a-uuid"}' },
              },
            ],
          },
        },
      ],
    };
    const finalAfterFail = {
      choices: [{ message: { role: "assistant", content: "لم أتمكن من جلب العقار." } }],
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(failResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(finalAfterFail), { status: 200 }));

    const result = await runAssistantChat("جلب عقار", []);
    expect(result.actions[0].tool).toBe("get_unit");
    expect(result.actions[0].ok).toBe(false);
    expect(result.reply).toContain("لم أتمكن");

    fetchMock.mockRestore();
  });
});
