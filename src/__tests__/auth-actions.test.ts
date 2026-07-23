/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

const mockRedirect = vi.fn();
const mockGetLocale = vi.fn().mockResolvedValue("ar");
const mockHeaders = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
}));

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

let signInWithPasswordResult: { error: unknown } = { error: null };
let signUpResult: { error: unknown } = { error: null };
let getUserResult: { data: { user: unknown }; error: unknown } = {
  data: { user: null },
  error: null,
};
let adminFromResult: { data: unknown; error: unknown } = {
  data: { approval_status: "approved", role: "admin" },
  error: null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: () => Promise.resolve(signInWithPasswordResult),
      signUp: (_: unknown) => Promise.resolve(signUpResult),
      getUser: () => Promise.resolve(getUserResult),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(adminFromResult),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(adminFromResult),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve(adminFromResult),
      }),
    }),
  }),
}));

import { signIn, signUp, approveUser, rejectUser } from "@/lib/auth-actions";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("auth-actions", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockGetLocale.mockResolvedValue("ar");
    mockHeaders.mockResolvedValue(new Map([["host", "localhost:3000"]]));
    signInWithPasswordResult = { error: null };
    signUpResult = { error: null };
    getUserResult = {
      data: {
        user: {
          id: "550e8400-e29b-41d4-a716-446655440001",
          email: "test@test.com",
        },
      },
      error: null,
    };
    adminFromResult = {
      data: { approval_status: "approved", role: "admin" },
      error: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("signIn", () => {
    test("redirects to dashboard on success", async () => {
      const fd = makeFormData({ email: "a@b.com", password: "123456" });
      await expect(signIn(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar");
    });

    test("redirects to login on invalid credentials", async () => {
      signInWithPasswordResult = { error: new Error("Invalid login credentials") };
      const fd = makeFormData({ email: "a@b.com", password: "wrong" });
      await expect(signIn(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/login?error=invalid-credentials");
    });

    test("redirects to login on validation error", async () => {
      const fd = makeFormData({ email: "not-an-email", password: "" });
      await expect(signIn(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/login?error=invalid");
    });
  });

  describe("signUp", () => {
    test("redirects to confirmed on success", async () => {
      const fd = makeFormData({
        first_name: "Ali", second_name: "Nasr", phone: "01158954611",
        email: "a@b.com", password: "123456", confirm: "123456",
      });
      await expect(signUp(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/confirmed?sent=1");
    });

    test("redirects to signup on validation error", async () => {
      const fd = makeFormData({ first_name: "" });
      await expect(signUp(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/signup?error=validation");
    });

    test("redirects to signup on duplicate email", async () => {
      signUpResult = { error: new Error("User already registered") };
      const fd = makeFormData({
        first_name: "Ali", second_name: "Nasr", phone: "01158954611",
        email: "a@b.com", password: "123456", confirm: "123456",
      });
      await expect(signUp(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/signup?error=email-exists");
    });

    test("passwords do not match", async () => {
      const fd = makeFormData({
        first_name: "Ali", second_name: "Nasr", phone: "01158954611",
        email: "a@b.com", password: "123456", confirm: "654321",
      });
      await expect(signUp(fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/signup?error=validation");
    });
  });

  describe("setApproval", () => {
    test("admin approves user", async () => {
      adminFromResult = { data: { role: "admin" }, error: null };
      await expect(approveUser("other-user-id")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/admin/users");
    });

    test("admin rejects user", async () => {
      adminFromResult = { data: { role: "admin" }, error: null };
      await expect(rejectUser("other-user-id")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/admin/users");
    });

    test("redirects to login when not authenticated", async () => {
      getUserResult = { data: { user: null }, error: null };
      await expect(approveUser("other-user-id")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar/auth/login");
    });

    test("redirects to home when not admin", async () => {
      adminFromResult = { data: { role: "user" }, error: null };
      await expect(approveUser("other-user-id")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/ar");
    });
  });
});
