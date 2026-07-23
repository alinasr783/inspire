/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("ar"),
}));

type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};
let mockCurrentUser: { id: string; email: string } | null = null;

const mockAuth = {
  getUser: () => Promise.resolve({ data: { user: mockCurrentUser ?? null }, error: null }),
};

function createMockClient() {
  let currentTable = "";
  const filters: Record<string, unknown> = {};
  let isSingle = false;
  let orderBy: { column: string; asc: boolean } | null = null;

  const inFilters: Record<string, unknown[]> = {};
  let pendingDelete = false;

  const q = {
    select: (_cols?: string) => q,
    eq: (col: string, val: unknown) => { filters[col] = val; return q; },
    in: (col: string, vals: unknown[]) => { inFilters[col] = vals; return q; },
    or: (_filter: string) => q,
    order: (col: string, opts: { ascending: boolean }) => { orderBy = { column: col, asc: opts.ascending }; return q; },
    single: () => { isSingle = true; return q; },
    then: (resolve: (val: { data: unknown; error: unknown }) => void) => {
      let rows = [...(mockTables[currentTable] ?? [])];
      for (const [col, val] of Object.entries(filters)) rows = rows.filter((r) => r[col] === val);
      for (const [col, vals] of Object.entries(inFilters)) rows = rows.filter((r) => vals.includes(r[col]));
      if (pendingDelete) {
        const ids = new Set(rows.map((r) => r.id));
        mockTables[currentTable] = (mockTables[currentTable] ?? []).filter((r) => !ids.has(r.id));
        pendingDelete = false;
        resolve({ data: null, error: null });
        return;
      }
      if (orderBy) rows.sort((a, b) => (orderBy!.asc ? 1 : -1) * ((a[orderBy!.column] as number) - (b[orderBy!.column] as number)));
      resolve({ data: isSingle ? (rows[0] ?? null) : rows, error: null });
    },
    insert: (row: Row | Row[]) => {
      const list = Array.isArray(row) ? row : [row];
      for (const r of list) {
        (mockTables[currentTable] ??= []).push(r);
      }
      return { ...q, select: (_cols?: string) => q };
    },
    update: (row: Partial<Row>) => {
      for (const r of (mockTables[currentTable] ?? [])) {
        let match = true;
        for (const [col, val] of Object.entries(filters)) if (r[col] !== val) { match = false; break; }
        for (const [col, vals] of Object.entries(inFilters)) if (!vals.includes(r[col])) { match = false; break; }
        if (match) Object.assign(r, row);
      }
      return q;
    },
    delete: () => {
      pendingDelete = true;
      return q;
    },
  };

  return {
    auth: mockAuth,
    from: (table: string) => {
      currentTable = table;
      Object.keys(filters).forEach((k) => delete filters[k]);
      Object.keys(inFilters).forEach((k) => delete inFilters[k]);
      isSingle = false;
      orderBy = null;
      pendingDelete = false;
      return { ...q, select: (_cols?: string) => q };
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => createMockClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createMockClient() }));

import { confirmUpload, deleteRecords, getRecords } from "@/lib/unconfirmed-data-actions";

describe("unconfirmed-data-actions", () => {
  beforeEach(() => {
    Object.keys(mockTables).forEach((k) => delete mockTables[k]);
    mockCurrentUser = { id: "user-1", email: "test@test.com" };
  });

  describe("confirmUpload", () => {
    test("creates upload and records then redirects", async () => {
      const data = {
        fileName: "test.xlsx",
        headers: ["owner_name", "owner_phone"],
        rows: [
          {
            mapped: { owner_name: "أحمد", owner_phone: "01149030170", unit_area: "", building_number: "", unit_number: "", owner_phone_alt: "", affiliated_company: "", last_feedback: "", last_contact_date: "" },
            extra_data: {},
            phone_normalized: "01149030170",
            phone_alt_normalized: "",
            ai_notes: "",
          },
        ],
      };

      await expect(confirmUpload(data)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockTables.unconfirmed_uploads).toHaveLength(1);
      expect(mockTables.unconfirmed_uploads[0].original_filename).toBe("test.xlsx");
      expect(mockTables.unconfirmed_uploads[0].status).toBe("confirmed");

      expect(mockTables.unconfirmed_records).toHaveLength(1);
      expect(mockTables.unconfirmed_records[0].owner_name).toBe("أحمد");
      expect(mockTables.unconfirmed_records[0].status).toBe("approved");
    });

    test("throws when no rows provided", async () => {
      await expect(confirmUpload({ fileName: "test.xlsx", headers: [], rows: [] })).rejects.toThrow("no-rows-to-confirm");
    });

    test("throws when user is not authenticated", async () => {
      mockCurrentUser = null;
      await expect(confirmUpload({ fileName: "x.xlsx", headers: [], rows: [{ mapped: { owner_name: "x" } as any, extra_data: {}, phone_normalized: "", phone_alt_normalized: "", ai_notes: "" }] })).rejects.toThrow("unauthorized");
    });
  });

  describe("deleteRecords", () => {
    test("deletes records by ids", async () => {
      mockTables.unconfirmed_records = [
        { id: "rec-1", upload_id: "u1", status: "approved" },
        { id: "rec-2", upload_id: "u1", status: "approved" },
        { id: "rec-3", upload_id: "u2", status: "approved" },
      ];

      await deleteRecords(["rec-1", "rec-2"]);
      expect(mockTables.unconfirmed_records).toHaveLength(1);
      expect(mockTables.unconfirmed_records[0].id).toBe("rec-3");
    });

    test("throws when no ids provided", async () => {
      await expect(deleteRecords([])).rejects.toThrow("no-ids-provided");
    });
  });

  describe("getRecords", () => {
    beforeEach(() => {
      mockTables.unconfirmed_records = [
        { id: "rec-1", upload_id: "upload-1", owner_name: "أحمد", status: "approved", owner_phone: "" },
        { id: "rec-2", upload_id: "upload-1", owner_name: "محمد", status: "approved", owner_phone: "" },
        { id: "rec-3", upload_id: "upload-2", owner_name: "علي", status: "approved", owner_phone: "" },
      ];
    });

    test("returns all records by default", async () => {
      const records = await getRecords();
      expect(records).toHaveLength(3);
    });

    test("filters by uploadId", async () => {
      const records = await getRecords({ uploadId: "upload-2" });
      expect(records).toHaveLength(1);
      expect(records[0].owner_name).toBe("علي");
    });

    test("returns empty for non-matching status", async () => {
      const records = await getRecords({ status: "rejected" });
      expect(records).toHaveLength(0);
    });
  });
});
