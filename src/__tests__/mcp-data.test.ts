/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase admin client ──────────────────────────
type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};

function createMockClient() {
  let currentTable = "";
  let filters: Record<string, { op: "eq" | "ilike" | "gte" | "lte"; val: unknown }> = {};
  const orFilters: string[] = [];
  let orderBy: { column: string; asc: boolean } | null = null;
  let range_: { from: number; to: number } | null = null;
  let singleMode: "single" | "maybeSingle" | null = null;
  let pendingOp: { type: "insert" | "update" | "delete"; row?: Row; patch?: Row } | null = null;

  function evaluate(): Row[] {
    let rows = [...(mockTables[currentTable] ?? [])];
    for (const [col, f] of Object.entries(filters)) {
      if (f.op === "eq") rows = rows.filter((r) => r[col] === f.val);
      if (f.op === "ilike") {
        const needle = String(f.val).replace(/%/g, "").toLowerCase();
        rows = rows.filter((r) => String(r[col] ?? "").toLowerCase().includes(needle));
      }
      if (f.op === "gte") rows = rows.filter((r) => (r[col] as number) >= (f.val as number));
      if (f.op === "lte") rows = rows.filter((r) => (r[col] as number) <= (f.val as number));
    }
    for (const orF of orFilters) {
      rows = rows.filter((r) =>
        orF.split(",").some((cond) => {
          const [col, op, raw] = cond.split(".");
          const val = Number(raw);
          if (op === "gte") return (r[col] as number) >= val;
          if (op === "lte") return (r[col] as number) <= val;
          return true;
        })
      );
    }
    if (orderBy) {
      rows = [...rows].sort((a, b) => {
        const va = a[orderBy!.column] as string | number;
        const vb = b[orderBy!.column] as string | number;
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return orderBy!.asc ? cmp : -cmp;
      });
    }
    if (range_) rows = rows.slice(range_.from, range_.to + 1);
    return rows;
  }

  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters[col] = { op: "eq", val };
      return builder;
    },
    ilike: (col: string, val: unknown) => {
      filters[col] = { op: "ilike", val };
      return builder;
    },
    gte: (col: string, val: unknown) => {
      filters[col] = { op: "gte", val };
      return builder;
    },
    lte: (col: string, val: unknown) => {
      filters[col] = { op: "lte", val };
      return builder;
    },
    or: (f: string) => {
      orFilters.push(f);
      return builder;
    },
    order: (col: string, opts: { ascending: boolean }) => {
      orderBy = { column: col, asc: opts.ascending };
      return builder;
    },
    range: (from: number, to: number) => {
      range_ = { from, to };
      return builder;
    },
    single: () => {
      singleMode = "single";
      return builder;
    },
    maybeSingle: () => {
      singleMode = "maybeSingle";
      return builder;
    },
    then: (resolve: (val: { data: unknown; error: unknown }) => void) => {
      if (pendingOp?.type === "insert") {
        const row = pendingOp.row!;
        pendingOp = null;
        resolve({ data: row, error: null });
        return;
      }
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
      if (singleMode === "single") {
        resolve(rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } });
      } else if (singleMode === "maybeSingle") {
        resolve({ data: rows[0] ?? null, error: null });
      } else {
        resolve({ data: rows, error: null });
      }
    },
    insert: (row: Row) => {
      mockTables[currentTable] = [...(mockTables[currentTable] ?? []), row];
      pendingOp = { type: "insert", row };
      return builder;
    },
    update: (patch: Row) => {
      pendingOp = { type: "update", patch };
      return builder;
    },
    delete: () => {
      pendingOp = { type: "delete" };
      return builder;
    },
  };

  const from = (table: string) => {
    currentTable = table;
    filters = {};
    orFilters.length = 0;
    orderBy = null;
    range_ = null;
    singleMode = null;
    pendingOp = null;
    return builder;
  };

  return { from };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createMockClient(),
}));

// ── Import module under test ────────────────────────────
import {
  searchUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} from "@/lib/mcp/data/units";
import {
  searchClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/mcp/data/clients";

const DEFAULT_USER = "66d6da0f-e5d1-4498-86a8-944c3685ab26";
const OLD_ENV = process.env;

function seedUnits(rows: Row[]) {
  mockTables.units = rows;
}
function seedClients(rows: Row[]) {
  mockTables.clients = rows;
}

describe("mcp data layer — units", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.MCP_DEFAULT_USER_ID = DEFAULT_USER;
    delete mockTables.units;
    delete mockTables.clients;
  });

  describe("searchUnits", () => {
    test("filters by text fields and enums", async () => {
      seedUnits([
        { id: "u1", customer_name: "أحمد محمد", phone: "0101", rent_sale: "بيع", area: "الشيخ زايد", created_at: "2024-01-01" },
        { id: "u2", customer_name: "محمد علي", phone: "0102", rent_sale: "إيجار", area: "مدينتي", created_at: "2024-01-02" },
      ]);
      const rows = await searchUnits({ customer_name: "محمد", rent_sale: "بيع" });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("u1");
    });

    test("applies numeric range filters", async () => {
      seedUnits([
        { id: "u1", customer_name: "أ", cash_required: 100, remaining: 50, created_at: "2024-01-01" },
        { id: "u2", customer_name: "ب", cash_required: 300, remaining: 200, created_at: "2024-01-02" },
        { id: "u3", customer_name: "ج", cash_required: 500, remaining: 400, created_at: "2024-01-03" },
      ]);
      const rows = await searchUnits({ cash_required_min: 200, cash_required_max: 400, remaining_min: 150 });
      expect(rows.map((r) => r.id)).toEqual(["u2"]);
    });

    test("applies pagination and default ordering", async () => {
      seedUnits([
        { id: "u1", customer_name: "أ", created_at: "2024-01-01" },
        { id: "u2", customer_name: "ب", created_at: "2024-01-02" },
        { id: "u3", customer_name: "ج", created_at: "2024-01-03" },
      ]);
      const rows = await searchUnits({ limit: 2, offset: 0 });
      expect(rows.map((r) => r.id)).toEqual(["u3", "u2"]);
    });
  });

  describe("getUnitById", () => {
    test("returns the unit when found", async () => {
      seedUnits([{ id: "u1", customer_name: "أ", created_at: "2024-01-01" }]);
      const unit = await getUnitById("u1");
      expect(unit?.id).toBe("u1");
    });

    test("returns null when not found", async () => {
      seedUnits([]);
      expect(await getUnitById("nope")).toBeNull();
    });
  });

  describe("createUnit", () => {
    test("inserts with the default service account", async () => {
      const created = await createUnit({
        customer_name: "عقار جديد",
        phone: "0100",
        compound_name: "ماونتن فيو",
      });
      expect(created.customer_name).toBe("عقار جديد");
      expect(mockTables.units).toHaveLength(1);
      expect(mockTables.units[0].created_by).toBe(DEFAULT_USER);
    });

    test("throws when the default user env var is missing", async () => {
      delete process.env.MCP_DEFAULT_USER_ID;
      await expect(
        createUnit({ customer_name: "أ", phone: "0100", compound_name: "ب" })
      ).rejects.toThrow("MCP_DEFAULT_USER_ID");
    });
  });

  describe("updateUnit", () => {
    test("updates only provided fields and bumps updated_at", async () => {
      seedUnits([{ id: "u1", customer_name: "قديم", phone: "0100", compound_name: "ب", updated_at: "old" }]);
      const updated = await updateUnit("u1", { customer_name: "جديد" });
      expect(updated?.customer_name).toBe("جديد");
      expect(updated?.phone).toBe("0100");
      expect(updated?.updated_at).not.toBe("old");
    });

    test("returns null when unit does not exist", async () => {
      seedUnits([]);
      expect(await updateUnit("nope", { customer_name: "جديد" })).toBeNull();
    });
  });

  describe("deleteUnit", () => {
    test("removes the matching row", async () => {
      seedUnits([{ id: "u1", customer_name: "أ" }, { id: "u2", customer_name: "ب" }]);
      await deleteUnit("u1");
      expect(mockTables.units.map((r) => r.id)).toEqual(["u2"]);
    });
  });
});

describe("mcp data layer — clients", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.MCP_DEFAULT_USER_ID = DEFAULT_USER;
    delete mockTables.units;
    delete mockTables.clients;
  });

  describe("searchClients", () => {
    test("filters individual clients by default and applies budget range", async () => {
      seedClients([
        { id: "c1", customer_name: "أ", is_company_client: false, budget_from: 100, budget_to: 200, created_at: "2024-01-01" },
        { id: "c2", customer_name: "ب", is_company_client: false, budget_from: 500, budget_to: 800, created_at: "2024-01-02" },
        { id: "c3", customer_name: "شركة", is_company_client: true, budget_from: 300, budget_to: 400, created_at: "2024-01-03" },
      ]);
      const rows = await searchClients({ budget_min: 150, budget_max: 400 });
      expect(rows.map((r) => r.id)).toEqual(["c1"]);
    });

    test("can include company clients via the flag", async () => {
      seedClients([
        { id: "c1", customer_name: "أ", is_company_client: false, budget_from: 100, budget_to: 200, created_at: "2024-01-01" },
        { id: "c3", customer_name: "شركة", is_company_client: true, budget_from: 300, budget_to: 400, created_at: "2024-01-03" },
      ]);
      const rows = await searchClients({ is_company_client: true, budget_min: 150, budget_max: 400 });
      expect(rows.map((r) => r.id)).toEqual(["c3"]);
    });

    test("searches by name", async () => {
      seedClients([
        { id: "c1", customer_name: "أحمد علي", is_company_client: false, created_at: "2024-01-01" },
        { id: "c2", customer_name: "محمد حسن", is_company_client: false, created_at: "2024-01-02" },
      ]);
      const rows = await searchClients({ customer_name: "محمد" });
      expect(rows.map((r) => r.id)).toEqual(["c2"]);
    });
  });

  describe("createClient", () => {
    test("creates an individual client with default rating and service account", async () => {
      const created = await createClient({ customer_name: "عميل جديد", phone: "0111" });
      expect(created.seriousness_rating).toBe(5);
      expect(mockTables.clients[0].is_company_client).toBe(false);
      expect(mockTables.clients[0].created_by).toBe(DEFAULT_USER);
    });
  });

  describe("updateClient", () => {
    test("updates the provided fields only", async () => {
      seedClients([{ id: "c1", customer_name: "قديم", phone: "0111", budget_from: 100, updated_at: "old" }]);
      const updated = await updateClient("c1", { phone_alt: "0222" });
      expect(updated?.phone_alt).toBe("0222");
      expect(updated?.customer_name).toBe("قديم");
      expect(updated?.updated_at).not.toBe("old");
    });
  });

  describe("getClientById & deleteClient", () => {
    test("getClientById returns null when missing", async () => {
      seedClients([]);
      expect(await getClientById("nope")).toBeNull();
    });

    test("deleteClient removes the row", async () => {
      seedClients([{ id: "c1", customer_name: "أ" }, { id: "c2", customer_name: "ب" }]);
      await deleteClient("c1");
      expect(mockTables.clients.map((r) => r.id)).toEqual(["c2"]);
    });
  });
});
