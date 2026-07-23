export interface SendResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export async function sendWhatsAppMessage(number: string, message: string): Promise<SendResult> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiUrl || !apiKey) {
    return { success: false, error: "whatsapp-not-configured" };
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}?action=send_number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({ number, message }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "network-error" };
  }

  if (res.status === 429) {
    return { success: false, error: "rate-limited", statusCode: 429 };
  }
  if (res.status === 401) {
    return { success: false, error: "unauthorized", statusCode: 401 };
  }
  if (res.status === 400) {
    return { success: false, error: "bad-request", statusCode: 400 };
  }
  if (res.status === 422) {
    return { success: false, error: "unprocessable", statusCode: 422 };
  }
  if (!res.ok) {
    return { success: false, error: `http-${res.status}`, statusCode: res.status };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { success: false, error: "invalid-json" };
  }

  if (body && typeof body === "object" && "success" in body) {
    const b = body as Record<string, unknown>;
    if (b.success === true) {
      return { success: true, statusCode: 200 };
    }
    return {
      success: false,
      error: b.error ? String(b.error) : b.message ? String(b.message) : "api-rejected",
      statusCode: 200,
    };
  }

  return { success: false, error: "unexpected-response" };
}
