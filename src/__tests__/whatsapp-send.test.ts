/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach } from "vitest";

const originalEnv = process.env;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

async function loadSend() {
  return await import("@/lib/whatsapp-send");
}

describe("sendWhatsAppMessage", () => {
  test("returns not-configured when WHATSAPP_API_URL is missing", async () => {
    delete process.env.WHATSAPP_API_URL;
    delete process.env.WHATSAPP_API_KEY;
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("whatsapp-not-configured");
  });

  test("returns success on 200 with success:true", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  test("returns api-rejected on 200 with success:false and no error", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("api-rejected");
  });

  test("returns error message from API body on failure", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "invalid number format" }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("123", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid number format");
  });

  test("handles 429 rate limit", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 429 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("rate-limited");
    expect(result.statusCode).toBe(429);
  });

  test("handles 401 unauthorized", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("unauthorized");
    expect(result.statusCode).toBe(401);
  });

  test("handles 422 unprocessable", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 422 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("unprocessable");
    expect(result.statusCode).toBe(422);
  });

  test("handles 400 bad request", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 400 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("bad-request");
    expect(result.statusCode).toBe(400);
  });

  test("handles network error", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch failed"));
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("fetch failed");
  });

  test("handles invalid JSON response", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid-json");
  });

  test("handles unexpected response shape", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ connected: true }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    const result = await sendWhatsAppMessage("201234567890", "Hello");
    expect(result.success).toBe(false);
    expect(result.error).toBe("unexpected-response");
  });

  test("sends correct phone number format to API", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    await sendWhatsAppMessage("201234567890", "Test message");
    const callArg = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArg.body as string);
    expect(body.number).toBe("201234567890");
    expect(body.message).toBe("Test message");
  });

  test("uses WHATSAPP_API_URL and correct action param", async () => {
    process.env.WHATSAPP_API_URL = "https://wapro.example.com/api/v1/index.php";
    process.env.WHATSAPP_API_KEY = "key123";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    await sendWhatsAppMessage("201234567890", "Msg");
    const callUrl = fetchSpy.mock.calls[0][0] as string;
    expect(callUrl).toContain("action=send_number");
    expect(callUrl).toBe("https://wapro.example.com/api/v1/index.php?action=send_number");
  });

  test("sets X-Api-Key header", async () => {
    process.env.WHATSAPP_API_URL = "https://api.example.com";
    process.env.WHATSAPP_API_KEY = "secret-api-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const { sendWhatsAppMessage } = await loadSend();
    await sendWhatsAppMessage("201234567890", "Msg");
    const callArg = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = callArg.headers as Record<string, string>;
    expect(headers["X-Api-Key"]).toBe("secret-api-key");
  });
});
