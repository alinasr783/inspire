/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mock modules ──────────────────────────────────────────
const mockRedirect = vi.fn();
const mockGetLocale = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    // Simulate Next's redirect behaviour: throw a redirect error
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
}));

// ── Mock Supabase internals ──────────────────────────────
// We'll expose a mutable mock table so tests can seed data
type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};

const mockChainable = {
  data: null as unknown,
  error: null as unknown,
  thenResolve: function () {
    return Promise.resolve({ data: this.data, error: this.error });
  },
};

// Build a mock supabase client that returns the chainable
function createMockClient() {
  // The return from .from() builds a fluent query
  let currentTable = "";
  const filters: Record<string, unknown> = {};
  let selectedColumns = "*";
  let isSingle = false;
  let orderBy: { column: string; asc: boolean } | null = null;

  const queryMethods = {
    select: (cols = "*") => {
      selectedColumns = cols;
      return queryMethods;
    },
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return queryMethods;
    },
    or: (_filter: string) => queryMethods,
    order: (col: string, opts: { ascending: boolean }) => {
      orderBy = { column: col, asc: opts.ascending };
      return queryMethods;
    },
    single: () => {
      isSingle = true;
      return queryMethods;
    },
    then: (resolve: (val: { data: unknown; error: unknown }) => void) => {
      let rows = mockTables[currentTable] ?? [];
      for (const [col, val] of Object.entries(filters)) {
        rows = rows.filter((r) => r[col] === val);
      }
      if (orderBy) {
        rows = [...rows].sort((a, b) => {
          const va = a[orderBy!.column] as number;
          const vb = b[orderBy!.column] as number;
          return orderBy!.asc ? va - vb : vb - va;
        });
      }
      if (isSingle) {
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
      for (const [col, val] of Object.entries(filters)) {
        mockTables[currentTable] = (mockTables[currentTable] ?? []).filter((r) => r[col] !== val);
      }
      return queryMethods;
    },
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
    filters;
    selectedColumns = "*";
    isSingle = false;
    orderBy = null;
    return {
      ...queryMethods,
      select: (cols?: string) => {
        selectedColumns = cols ?? "*";
        return queryMethods;
      },
    };
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

// ── Import the module under test ───────────────────────
import { createProperty, updateProperty, deleteProperty } from "@/lib/property-actions";

// ── Helpers ──────────────────────────────────────────────
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    fd.append(k, v);
  }
  return fd;
}

// ── Tests ────────────────────────────────────────────────
describe("property-actions", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockGetLocale.mockResolvedValue("ar");
    // Clear mock tables and set default user
    Object.keys(mockTables).forEach((k) => delete mockTables[k]);
    mockCurrentUser = { id: "550e8400-e29b-41d4-a716-446655440001", email: "staff@inspire.test" };
  });

  describe("createProperty", () => {
    test("creates a property and redirects to the list", async () => {
      const fd = makeFormData({
        title: "فيلا فاخرة",
        type: "villa",
        status: "available",
        price: "1500000",
        area_sqm: "350",
        bedrooms: "5",
        bathrooms: "4",
        location: "الشيخ زايد",
      });

      await expect(createProperty(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties");
      expect(mockTables.properties).toHaveLength(1);
      expect(mockTables.properties[0].title).toBe("فيلا فاخرة");
      expect(mockTables.properties[0].created_by).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    test("redirects to login when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const fd = makeFormData({ title: "Test", type: "apartment", status: "available" });
      await expect(createProperty(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/login");
    });
  });

  describe("updateProperty", () => {
    test("updates a property when user is the owner", async () => {
      mockTables.properties = [
        {
          id: "prop-1",
          title: "شقة قديمة",
          type: "apartment",
          status: "available",
          created_by: "550e8400-e29b-41d4-a716-446655440001",
        },
      ];

      const fd = makeFormData({
        title: "شقة محدثة",
        type: "apartment",
        status: "available",
      });

      await expect(updateProperty("prop-1", fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties/prop-1");
      expect(mockTables.properties[0].title).toBe("شقة محدثة");
    });

    test("redirects with unauthorized when user is not the owner", async () => {
      mockTables.properties = [
        {
          id: "prop-2",
          title: "فيلا",
          created_by: "550e8400-e29b-41d4-a716-446655440002",
        },
      ];
      mockCurrentUser = { id: "550e8400-e29b-41d4-a716-446655440003", email: "other@test.test" };

      const fd = makeFormData({ title: "حاول تعديل", type: "villa", status: "available" });
      await expect(updateProperty("prop-2", fd)).rejects.toThrow("NEXT_REDIRECT");
    });
  });

  describe("deleteProperty", () => {
    test("deletes property when user is the owner", async () => {
      mockTables.properties = [
        {
          id: "prop-3",
          title: "أرض",
          type: "land",
          status: "available",
          created_by: "550e8400-e29b-41d4-a716-446655440001",
        },
      ];

      await expect(deleteProperty("prop-3")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties");
      expect(mockTables.properties).toHaveLength(0);
    });

    test("redirects with unauthorized when user is not owner or admin", async () => {
      mockTables.properties = [
        {
          id: "prop-4",
          title: "مكتب",
          created_by: "550e8400-e29b-41d4-a716-446655440002",
        },
      ];
      mockCurrentUser = { id: "550e8400-e29b-41d4-a716-446655440003", email: "other@test.test" };

      await expect(deleteProperty("prop-4")).rejects.toThrow("NEXT_REDIRECT");
      // Should redirect to properties with error
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties?error=unauthorized");
    });

    test("redirects with not-found when property does not exist", async () => {
      mockTables.properties = []; // clear all
      mockCurrentUser = { id: "550e8400-e29b-41d4-a716-446655440001", email: "staff@test.test" };

      await expect(deleteProperty("prop-nonexistent")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/properties?error=not-found");
    });
  });
});
