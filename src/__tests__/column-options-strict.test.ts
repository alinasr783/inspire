/// <reference types="vitest/globals" />
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => { throw new Error("NEXT_REDIRECT:" + JSON.stringify(args)); },
}));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("ar") }));

type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};
const mockCurrentUser = { id: "user-1" };

function createMockClient() {
  let currentTable = "";
  const filters: Record<string, unknown> = {};
  let isSingle = false;
  const q: Record<string, (...a: never[]) => unknown> = {};
  q.select = () => q;
  q.eq = (col: string, val: unknown) => { filters[col] = val; return q; };
  q.single = () => { isSingle = true; return q; };
  q.then = (resolve: (v: { data: unknown; error: unknown }) => void) => {
    let rows = [...(mockTables[currentTable] ?? [])];
    for (const [col, val] of Object.entries(filters)) rows = rows.filter((r) => r[col] === val);
    resolve({ data: isSingle ? (rows[0] ?? null) : rows, error: null });
  };
  q.insert = (row: Row) => { (mockTables[currentTable] ??= []).push(row); return Promise.resolve({ data: row, error: null }); };
  q.update = (row: Partial<Row>) => {
    for (const r of (mockTables[currentTable] ?? [])) {
      let match = true;
      for (const [col, val] of Object.entries(filters)) if (r[col] !== val) { match = false; break; }
      if (match) Object.assign(r, row);
    }
    return q;
  };
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: mockCurrentUser }, error: null }) },
    from: (table: string) => {
      currentTable = table;
      Object.keys(filters).forEach((k) => delete filters[k]);
      isSingle = false;
      return q;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => createMockClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createMockClient() }));

import { updateUnitField } from "@/lib/unit-actions";

describe("strict option validation", () => {
  beforeEach(() => {
    Object.keys(mockTables).forEach((k) => delete mockTables[k]);
    mockTables["unit_column_config"] = [
      { key: "color", type: "select", options: ["red", "blue"] },
      { key: "tags", type: "multi_select", options: ["a", "b"] },
      { key: "ok", type: "checkbox", options: [] },
    ];
    mockTables["units"] = [{ id: "u1", custom_fields: {} }];
    mockTables["profiles"] = [{ id: "user-1", role: "admin" }];
  });

  test("rejects select value outside options", async () => {
    await expect(updateUnitField("u1", "color", "green")).rejects.toThrow("invalid-option");
  });

  test("accepts select value inside options", async () => {
    await updateUnitField("u1", "color", "red");
    expect((mockTables["units"][0].custom_fields as Row)["color"]).toBe("red");
  });

  test("rejects multi_select with any outside value", async () => {
    await expect(updateUnitField("u1", "tags", ["a", "zzz"])).rejects.toThrow("invalid-option");
  });

  test("accepts multi_select subset and dedupes", async () => {
    await updateUnitField("u1", "tags", ["a", "b", "a"]);
    expect((mockTables["units"][0].custom_fields as Row)["tags"]).toEqual(["a", "b"]);
  });

  test("checkbox accepts boolean only", async () => {
    await updateUnitField("u1", "ok", true);
    expect((mockTables["units"][0].custom_fields as Row)["ok"]).toBe(true);
    await expect(updateUnitField("u1", "ok", "maybe")).rejects.toThrow("invalid-option");
  });
});
