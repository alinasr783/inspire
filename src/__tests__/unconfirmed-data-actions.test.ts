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
    select: (_cols?: string, _opts?: unknown) => q,
    eq: (col: string, val: unknown) => { filters[col] = val; return q; },
    neq: (col: string, val: unknown) => { filters[`neq:${col}`] = val; return q; },
    in: (col: string, vals: unknown[]) => { inFilters[col] = vals; return q; },
    or: (_filter: string) => q,
    order: (col: string, opts: { ascending: boolean }) => { orderBy = { column: col, asc: opts.ascending }; return q; },
    limit: (_n?: number) => q,
    range: (_from: number, _to: number) => q,
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

import {
  confirmUpload,
  deleteRecords,
  getRecords,
  updateRecordField,
  repairUnconfirmedRecordsFromExtraData,
} from "@/lib/unconfirmed-data-actions";
import { hydrateRecordFromExtraData } from "@/lib/excel-parse";

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

  describe("updateRecordField (backup_employee & backup_feedback)", () => {
    beforeEach(() => {
      mockTables.unconfirmed_records = [
        {
          id: "rec-1",
          upload_id: "upload-1",
          owner_name: "أحمد",
          status: "approved",
          assigned_employee: "emp-primary",
          backup_employee: null,
          last_feedback: "",
          backup_feedback: "",
        },
      ];
    });

    test("updates backup_employee manually and clears it to null when empty", async () => {
      await updateRecordField("rec-1", "backup_employee", "emp-backup");
      expect(mockTables.unconfirmed_records[0].backup_employee).toBe("emp-backup");

      await updateRecordField("rec-1", "backup_employee", "");
      expect(mockTables.unconfirmed_records[0].backup_employee).toBeNull();
    });

    test("writing backup_feedback auto-assigns backup_employee to current user without changing assigned_employee", async () => {
      await updateRecordField("rec-1", "backup_feedback", "تم التواصل من الاحتياطي");
      expect(mockTables.unconfirmed_records[0].backup_feedback).toBe("تم التواصل من الاحتياطي");
      expect(mockTables.unconfirmed_records[0].backup_employee).toBe("user-1");
      expect(mockTables.unconfirmed_records[0].assigned_employee).toBe("emp-primary");
    });
  });

  describe("extra_data hydration & automatic DB restoration", () => {
    test("getRecords hydrates empty standard columns from extra_data and persists them back to DB", async () => {
      mockTables.unconfirmed_records = [
        {
          id: "rec-blank-1",
          upload_id: "upload-1",
          file_id: "file-target",
          row_number: 1,
          status: "approved",
          owner_name: "",
          unit_area: "",
          building_number: "",
          unit_number: "",
          owner_phone: "",
          owner_phone_alt: "",
          affiliated_company: "",
          last_feedback: "",
          last_contact_date: "",
          phone_normalized: "",
          phone_alt_normalized: "",
          extra_data: {
            "الأسم": "أحمد سمير",
            "المساحه": "145",
            "العماره": "B12",
            "رقم الوحده": "304",
            "__EMPTY": "1012345678",
            "__EMPTY_1": "01198765432",
            "الشركه": "طلعت مصطفى",
            "عمود مخصص": "قيمة إضافية",
          },
        },
      ];

      const records = await getRecords({ fileId: "file-target" });
      expect(records).toHaveLength(1);
      expect(records[0].owner_name).toBe("أحمد سمير");
      expect(records[0].unit_area).toBe("145");
      expect(records[0].building_number).toBe("B12");
      expect(records[0].unit_number).toBe("304");
      expect(records[0].owner_phone).toBe("1012345678");
      expect(records[0].owner_phone_alt).toBe("01198765432");
      expect(records[0].phone_normalized).toBe("01012345678");
      expect(records[0].phone_alt_normalized).toBe("01198765432");
      expect(records[0].affiliated_company).toBe("طلعت مصطفى");

      // التحقق من كتابة الحقول المستعادة في قاعدة البيانات دون مسح extra_data
      const dbRow = mockTables.unconfirmed_records[0];
      expect(dbRow.owner_name).toBe("أحمد سمير");
      expect(dbRow.unit_area).toBe("145");
      expect(dbRow.building_number).toBe("B12");
      expect(dbRow.unit_number).toBe("304");
      expect(dbRow.owner_phone).toBe("1012345678");
      expect(dbRow.phone_normalized).toBe("01012345678");
      expect((dbRow.extra_data as Record<string, unknown>)["عمود مخصص"]).toBe("قيمة إضافية");

      const { mappedExtraKeys } = hydrateRecordFromExtraData(records[0]);
      expect(mappedExtraKeys.has("الأسم")).toBe(true);
      expect(mappedExtraKeys.has("عمود مخصص")).toBe(false);
    });

    test("repairUnconfirmedRecordsFromExtraData bulk-repairs records in DB", async () => {
      mockTables.unconfirmed_records = [
        {
          id: "rec-r1",
          upload_id: "u1",
          file_id: "file-1",
          row_number: 1,
          status: "approved",
          owner_name: "",
          owner_phone: "",
          unit_area: "",
          building_number: "",
          unit_number: "",
          extra_data: { "اسم المالك": "محمود حسن", "موبايل": "01234567890", "عمارة": "7", "شقة": "12" },
        },
      ];

      const res = await repairUnconfirmedRecordsFromExtraData({ fileId: "file-1" });
      expect(res.repaired).toBe(1);
      expect(mockTables.unconfirmed_records[0].owner_name).toBe("محمود حسن");
      expect(mockTables.unconfirmed_records[0].owner_phone).toBe("01234567890");
      expect(mockTables.unconfirmed_records[0].building_number).toBe("7");
      expect(mockTables.unconfirmed_records[0].unit_number).toBe("12");
    });

    test("correctly restores records with stringified extra_data and misplaced phone/name like file 6f4ff5e6", async () => {
      mockTables.unconfirmed_records = [
        {
          id: "028cd9f4-b0d1-4972-9578-33f023c9bc7b",
          upload_id: "ef167749-af77-4dd8-a762-7666ef0f9e09",
          row_number: 52,
          owner_name: "",
          unit_area: "",
          building_number: "",
          unit_number: "",
          owner_phone: "Hatem Ahmed Osman",
          owner_phone_alt: "59",
          affiliated_company: "",
          last_feedback: "",
          last_contact_date: "",
          extra_data: JSON.stringify({
            "__EMPTY": "Hatem Ahmed Osman",
            "__EMPTY_1": "59",
            "__EMPTY_2": "",
            "__EMPTY_3": "177",
            "__EMPTY_4": "9L",
            "__EMPTY_5": "01000102762",
            "__EMPTY_6": "",
            "__EMPTY_19": "مردش+رساله",
            "__EMPTY_20": "حسن",
            "__EMPTY_21": "بيشطب وهياجر قدامه شهرين",
            "__EMPTY_22": "غير متاحة ",
            "__EMPTY_23": "محمد شحاته",
            "__EMPTY_24": "",
            "__EMPTY_25": "15-6",
          }),
          phone_normalized: "Hatem Ahmed Osman",
          phone_alt_normalized: "59",
          ai_notes: "",
          status: "approved",
          file_id: "6f4ff5e6-1f78-4bb2-b16e-fe7ea40a9cf8",
        },
      ];

      const records = await getRecords({ fileId: "6f4ff5e6-1f78-4bb2-b16e-fe7ea40a9cf8" });
      expect(records).toHaveLength(1);
      const rec = records[0];
      expect(rec.owner_name).toBe("Hatem Ahmed Osman");
      expect(rec.unit_area).toBe("59");
      expect(rec.building_number).toBe("9L");
      expect(rec.unit_number).toBe("177");
      expect(rec.owner_phone).toBe("01000102762");
      expect(rec.owner_phone_alt).toBe("");
      expect(rec.phone_normalized).toBe("01000102762");
      expect(rec.last_feedback).toContain("غير متاحة");
      expect(rec.last_feedback).toContain("بيشطب وهياجر قدامه شهرين");
      expect(rec.last_contact_date).toBe("15-6");
      expect(typeof rec.extra_data).toBe("object");

      // Verify DB row was updated with all corrected fields
      const dbRow = mockTables.unconfirmed_records[0];
      expect(dbRow.owner_name).toBe("Hatem Ahmed Osman");
      expect(dbRow.unit_area).toBe("59");
      expect(dbRow.building_number).toBe("9L");
      expect(dbRow.unit_number).toBe("177");
      expect(dbRow.owner_phone).toBe("01000102762");
      expect(dbRow.phone_normalized).toBe("01000102762");
      expect(typeof dbRow.extra_data).toBe("object");
    });
  });
});
