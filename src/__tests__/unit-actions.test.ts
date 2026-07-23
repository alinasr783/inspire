/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
const mockGetLocale = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
}));

type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};

function createMockClient() {
  let currentTable = "";
  const filters: Record<string, unknown> = {};
  let isSingle = false;
  let isDeleteOp = false;

  const queryMethods = {
    select: () => queryMethods,
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return queryMethods;
    },
    filter: () => queryMethods,
    or: () => queryMethods,
    order: () => queryMethods,
    single: () => {
      isSingle = true;
      return queryMethods;
    },
    then: (resolve: (val: { data: unknown; error: unknown }) => void) => {
      let rows = mockTables[currentTable] ?? [];
      for (const [col, val] of Object.entries(filters)) {
        if (isDeleteOp) {
          mockTables[currentTable] = rows.filter((r) => r[col] !== val);
        }
        rows = rows.filter((r) => r[col] === val);
      }
      if (isDeleteOp) {
        isDeleteOp = false;
        resolve({ data: null, error: null });
      } else if (isSingle) {
        resolve({ data: rows[0] ?? null, error: null });
      } else {
        resolve({ data: rows, error: null });
      }
    },
    insert: (row: Row) => {
      const table = mockTables[currentTable] ?? [];
      table.push(row);
      mockTables[currentTable] = table;
      return Promise.resolve({ data: row, error: null });
    },
    update: (row: Partial<Row>) => {
      const rows = mockTables[currentTable] ?? [];
      for (const r of rows) {
        let match = true;
        for (const [col, val] of Object.entries(filters)) {
          if (r[col] !== val) { match = false; break; }
        }
        if (match) Object.assign(r, row);
      }
      mockTables[currentTable] = rows;
      return queryMethods;
    },
    delete: () => {
      isDeleteOp = true;
      return queryMethods;
    },
    in: () => queryMethods,
  };

  const auth = {
    getUser: () => {
      return Promise.resolve({
        data: { user: mockCurrentUser ?? null },
        error: null,
      });
    },
  };

  const from = (table: string) => {
    currentTable = table;
    Object.keys(filters).forEach((k) => delete filters[k]);
    isSingle = false;
    isDeleteOp = false;
    return { ...queryMethods, select: () => queryMethods };
  };

  return { auth, from };
}

let mockCurrentUser: { id: string; email: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createMockClient(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createMockClient(),
}));

import { createUnit, updateUnit, deleteUnit } from "@/lib/unit-actions";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    fd.append(k, v);
  }
  return fd;
}

describe("unit-actions", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockGetLocale.mockResolvedValue("ar");
    Object.keys(mockTables).forEach((k) => delete mockTables[k]);
    mockCurrentUser = { id: "550e8400-e29b-41d4-a716-446655440001", email: "staff@inspire.test" };
  });

  describe("createUnit", () => {
    test("creates a unit and redirects to the list", async () => {
      const fd = makeFormData({
        customer_name: "أحمد محمد",
        phone: "01001234567",
        compound_name: "كمبوند النخيل",
        area: "150م",
        building_number: "12",
        finishing_status: "full",
        rent_sale: "sale",
        unit_type: "apartment",
        cash_required: "500000",
        remaining: "200000",
        last_contact_date: "2026-07-15",
        additional_notes: "ملاحظة",
        feedback: "إيجابي",
      });

      await expect(createUnit(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties");
      expect(mockTables.units).toHaveLength(1);
      expect(mockTables.units[0].customer_name).toBe("أحمد محمد");
      expect(mockTables.units[0].phone).toBe("01001234567");
      expect(mockTables.units[0].created_by).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    test("redirects to login when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const fd = makeFormData({
        customer_name: "test",
        phone: "01000000000",
        rent_sale: "sale",
        unit_type: "apartment",
      });
      await expect(createUnit(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/login");
    });

    test("fails when customer_name is missing", async () => {
      const fd = makeFormData({ phone: "01000000000", rent_sale: "sale", unit_type: "apartment" });
      await expect(createUnit(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties/new?error=validation");
    });

    test("fails when phone is missing", async () => {
      const fd = makeFormData({ customer_name: "test", rent_sale: "sale", unit_type: "apartment" });
      await expect(createUnit(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties/new?error=validation");
    });

    test("stores custom_fields JSONB", async () => {
      const fd = makeFormData({
        customer_name: "Mohamed",
        phone: "01000000000",
        compound_name: "test compound",
        rent_sale: "sale",
        unit_type: "apartment",
      });
      fd.append("custom_fields", JSON.stringify({ extra_field: "custom value" }));

      await expect(createUnit(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockTables.units[0].custom_fields).toEqual({ extra_field: "custom value" });
    });
  });

  describe("updateUnit", () => {
    test("updates a unit when user is the owner", async () => {
      mockTables.units = [
        {
          id: "unit-1",
          customer_name: "قديم",
          phone: "01000000000",
          compound_name: "قديم",
          rent_sale: "sale",
          unit_type: "apartment",
          created_by: "550e8400-e29b-41d4-a716-446655440001",
        },
      ];

      const fd = makeFormData({
        customer_name: "محدث",
        phone: "01001111111",
        compound_name: "جديد",
        rent_sale: "rent",
        unit_type: "villa",
      });

      await expect(updateUnit("unit-1", fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties/unit-1");
      expect(mockTables.units[0].customer_name).toBe("محدث");
      expect(mockTables.units[0].phone).toBe("01001111111");
    });

    test("redirects unauthorized when user is not the owner", async () => {
      mockTables.units = [
        {
          id: "unit-2",
          customer_name: "مالك تاني",
          phone: "01000000000",
          rent_sale: "sale",
          unit_type: "apartment",
          created_by: "550e8400-e29b-41d4-a716-446655440002",
        },
      ];
      mockCurrentUser = { id: "other-user-id", email: "other@test.test" };

      const fd = makeFormData({
        customer_name: "محاولة تعديل",
        phone: "01000000000",
        rent_sale: "sale",
        unit_type: "apartment",
      });
      await expect(updateUnit("unit-2", fd)).rejects.toThrow("NEXT_REDIRECT");
    });
  });

  describe("deleteUnit", () => {
    test("deletes unit when user is the owner", async () => {
      mockTables.units = [
        {
          id: "unit-3",
          customer_name: "مراد حذفه",
          phone: "01000000000",
          rent_sale: "sale",
          unit_type: "apartment",
          created_by: "550e8400-e29b-41d4-a716-446655440001",
        },
      ];

      await expect(deleteUnit("unit-3")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties");
      expect(mockTables.units).toHaveLength(0);
    });

    test("redirects unauthorized when user is not owner or admin", async () => {
      mockTables.units = [
        {
          id: "unit-4",
          customer_name: "مش مالك",
          phone: "01000000000",
          rent_sale: "sale",
          unit_type: "apartment",
          created_by: "550e8400-e29b-41d4-a716-446655440002",
        },
      ];
      mockCurrentUser = { id: "other-user", email: "other@test.test" };

      await expect(deleteUnit("unit-4")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties?error=unauthorized");
    });

    test("redirects not-found when unit does not exist", async () => {
      mockTables.units = [];
      await expect(deleteUnit("unit-nonexistent")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties?error=not-found");
    });
  });
});
