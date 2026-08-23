import { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID, X-Requested-With",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createTransport() {
  return new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
}

/**
 * بعض عملاء الذكاء الاصطناعي لا يرسلون ترويسة Accept بشكل كامل في طلباتهم
 * (خصوصًا في طلبات GET لتأسيس البث). نضيف القيم الناقصة حتى لا يرفض النقلُ الطلب.
 * Some AI clients send an incomplete Accept header (especially on the GET
 * stream request). Inject the missing values so the transport does not reject.
 */
function withLenientAccept(req: NextRequest): Request {
  const headers = new Headers(req.headers);
  const accept = headers.get("accept") ?? "";

  if (req.method === "POST") {
    if (accept.includes("application/json") && accept.includes("text/event-stream")) {
      return req;
    }
    let next = accept;
    if (!next.includes("application/json")) {
      next = next ? `application/json, ${next}` : "application/json";
    }
    if (!next.includes("text/event-stream")) {
      next = next ? `${next}, text/event-stream` : "text/event-stream";
    }
    headers.set("accept", next);
    return new Request(req.url, {
      method: "POST",
      headers,
      body: req.body,
      duplex: "half",
    } as unknown as RequestInit);
  }

  if (accept.includes("text/event-stream")) {
    return req;
  }
  const next = accept ? `${accept}, text/event-stream` : "text/event-stream";
  headers.set("accept", next);
  return new Request(req.url, { method: req.method, headers });
}

async function handleRequest(req: NextRequest): Promise<Response> {
  const transport = createTransport();
  const server = createMcpServer();
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(withLenientAccept(req)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return withCors(
      Response.json(
        { jsonrpc: "2.0", error: { code: -32603, message }, id: null },
        { status: 500 }
      )
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
