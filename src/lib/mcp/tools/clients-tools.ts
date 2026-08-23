import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DESC } from "@/lib/mcp/descriptions";
import {
  createClientSchema,
  idSchema,
  searchClientsSchema,
  updateClientSchema,
} from "@/lib/mcp/schemas";
import {
  createClient,
  deleteClient,
  getClientById,
  searchClients,
  updateClient,
} from "@/lib/mcp/data/clients";
import { errorResult, successResult } from "@/lib/mcp/utils";

export function registerClientTools(server: McpServer) {
  server.registerTool(
    "search_clients",
    {
      title: "البحث عن عملاء | Search Clients",
      description: DESC.searchClients,
      inputSchema: searchClientsSchema,
    },
    async (args) => {
      try {
        const { rows, total } = await searchClients(args);
        return successResult({
          count: rows.length,
          total,
          offset: args.offset ?? 0,
          limit: args.limit ?? 50,
          clients: rows,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "get_client",
    {
      title: "جلب تفاصيل عميل | Get Client Details",
      description: DESC.getClient,
      inputSchema: idSchema,
    },
    async (args) => {
      try {
        const client = await getClientById(args.id);
        if (!client) return errorResult(`العميل غير موجود | Client not found: ${args.id}`);
        return successResult(client);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "create_client",
    {
      title: "إنشاء عميل | Create Client",
      description: DESC.createClient,
      inputSchema: createClientSchema,
    },
    async (args) => {
      try {
        const client = await createClient(args);
        return successResult(client);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "update_client",
    {
      title: "تعديل عميل | Update Client",
      description: DESC.updateClient,
      inputSchema: updateClientSchema,
    },
    async (args) => {
      try {
        const { id, ...input } = args;
        const client = await updateClient(id, input);
        if (!client) return errorResult(`العميل غير موجود | Client not found: ${id}`);
        return successResult(client);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "delete_client",
    {
      title: "حذف عميل | Delete Client",
      description: DESC.deleteClient,
      inputSchema: idSchema,
    },
    async (args) => {
      try {
        await deleteClient(args.id);
        return successResult({ deleted: true, id: args.id });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
