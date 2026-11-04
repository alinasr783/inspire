/// <reference types="vitest/globals" />
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => { throw new Error("NEXT_REDIRECT:" + JSON.stringify(args)); },
}));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("ar") }));

type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};
let currentUserId = "user-primary";

function createMockClient() {
  let currentTable = "";
  const filters: Record<string, unknown> = {};
  let isSingle = false;
  const q: Record<string, (...a: never[]) => unknown> = {};
  q.select = () => q;
  q.eq = (col: string, val: unknown) => { filters[col] = val; return q; };
  q.single = () => { isSingle = true; return q; };
  q.insert = (row: Row) => { (mockTables[currentTable] ??= []).push(row); return Promise.resolve({ data: row, error: null }); };
  q.update = (row: Partial<Row>) => {
    for (const r of (mockTables[currentTable] ?? [])) {
      let match = true;
      for (const [col, val] of Object.entries(filters)) if (r[col] !== val) { match = false; break; }
      if (match) Object.assign(r, row);
    }
    return q;
  };
  let isDelete = false;
  q.delete = () => {
    isDelete = true;
    return q;
  };
  q.then = (resolve: (v: { data: unknown; error: unknown }) => void) => {
    if (isDelete) {
      mockTables[currentTable] = (mockTables[currentTable] ?? []).filter((r) => {
        for (const [col, val] of Object.entries(filters)) {
          if (r[col] === val) return false;
        }
        return true;
      });
      resolve({ data: null, error: null });
      return;
    }
    let rows = [...(mockTables[currentTable] ?? [])];
    for (const [col, val] of Object.entries(filters)) rows = rows.filter((r) => r[col] === val);
    resolve({ data: isSingle ? (rows[0] ?? null) : rows, error: null });
  };
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: currentUserId } }, error: null }) },
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

import { updateUnitField, deleteUnit } from "@/lib/unit-actions";

describe("Backup Employee Permission Rules", () => {
  beforeEach(() => {
    Object.keys(mockTables).forEach((k) => delete mockTables[k]);
    mockTables["unit_column_config"] = [
      { key: "assigned_employee", type: "text", options: [] },
      { key: "backup_employee", type: "text", options: [] },
    ];
    mockTables["units"] = [
      {
        id: "unit-1",
        customer_name: "Original Name",
        created_by: "user-creator",
        assigned_employee: "user-primary",
        backup_employee: "user-backup",
        feedback: "initial feedback",
        custom_fields: {},
      },
    ];
    mockTables["profiles"] = [
      { id: "user-creator", role: "employee" },
      { id: "user-primary", role: "employee" },
      { id: "user-backup", role: "employee" },
      { id: "user-other", role: "employee" },
      { id: "user-admin", role: "admin" },
    ];
  });

  test("Primary assigned employee can assign or change backup_employee", async () => {
    currentUserId = "user-primary";
    await updateUnitField("unit-1", "backup_employee", "user-backup-2");
    expect(mockTables["units"][0].backup_employee).toBe("user-backup-2");
  });

  test("Backup employee can update standard fields like feedback and customer_name", async () => {
    currentUserId = "user-backup";
    await updateUnitField("unit-1", "feedback", "Updated by backup");
    expect(mockTables["units"][0].feedback).toBe("Updated by backup");

    await updateUnitField("unit-1", "customer_name", "New Name");
    expect(mockTables["units"][0].customer_name).toBe("New Name");
  });

  test("Backup employee CAN update the backup_employee field", async () => {
    currentUserId = "user-backup";
    await updateUnitField("unit-1", "backup_employee", "user-backup-transferred");
    expect(mockTables["units"][0].backup_employee).toBe("user-backup-transferred");
  });

  test("Backup employee CANNOT change assigned_employee (throws backup-cannot-change-primary)", async () => {
    currentUserId = "user-backup";
    await expect(updateUnitField("unit-1", "assigned_employee", "user-other")).rejects.toThrow("backup-cannot-change-primary");
    // Verify it remained unchanged
    expect(mockTables["units"][0].assigned_employee).toBe("user-primary");
  });

  test("Backup employee CANNOT delete the unit (throws unauthorized)", async () => {
    currentUserId = "user-backup";
    await expect(deleteUnit("unit-1")).rejects.toThrow("unauthorized");
    expect(mockTables["units"]).toHaveLength(1);
  });

  test("Primary assigned employee CAN delete the unit", async () => {
    currentUserId = "user-primary";
    await deleteUnit("unit-1");
    expect(mockTables["units"]).toHaveLength(0);
  });

  test("Unrelated employee has no permissions to edit or delete", async () => {
    currentUserId = "user-other";
    await expect(updateUnitField("unit-1", "feedback", "Hacked")).rejects.toThrow("unauthorized");
    await expect(deleteUnit("unit-1")).rejects.toThrow("unauthorized");
    expect(mockTables["units"][0].feedback).toBe("initial feedback");
  });

  test("Admin can change both assigned_employee and backup_employee", async () => {
    currentUserId = "user-admin";
    await updateUnitField("unit-1", "assigned_employee", "user-new-primary");
    await updateUnitField("unit-1", "backup_employee", "user-new-backup");
    expect(mockTables["units"][0].assigned_employee).toBe("user-new-primary");
    expect(mockTables["units"][0].backup_employee).toBe("user-new-backup");
  });
});
