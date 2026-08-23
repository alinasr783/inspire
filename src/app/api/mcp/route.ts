import { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function createTransport() {
  return new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
}

async function handleRequest(req: NextRequest): Promise<Response> {
  const transport = createTransport();
  const server = createMcpServer();
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32603, message }, id: null },
      { status: 500 }
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
