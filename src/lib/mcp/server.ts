import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DESC } from "@/lib/mcp/descriptions";
import { registerUnitTools } from "@/lib/mcp/tools/units-tools";
import { registerClientTools } from "@/lib/mcp/tools/clients-tools";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "inspire-crm",
      version: "1.0.0",
    },
    {
      instructions: DESC.serverInstructions,
    }
  );

  registerUnitTools(server);
  registerClientTools(server);

  return server;
}
