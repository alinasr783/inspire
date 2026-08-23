import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DESC } from "@/lib/mcp/descriptions";
import {
  createUnitSchema,
  idSchema,
  searchUnitsSchema,
  updateUnitSchema,
} from "@/lib/mcp/schemas";
import {
  createUnit,
  deleteUnit,
  getUnitById,
  searchUnits,
  updateUnit,
} from "@/lib/mcp/data/units";
import { errorResult, successResult } from "@/lib/mcp/utils";

export function registerUnitTools(server: McpServer) {
  server.registerTool(
    "search_units",
    {
      title: "البحث عن عقارات | Search Units",
      description: DESC.searchUnits,
      inputSchema: searchUnitsSchema,
    },
    async (args) => {
      try {
        const { rows, total } = await searchUnits(args);
        return successResult({
          count: rows.length,
          total,
          offset: args.offset ?? 0,
          limit: args.limit ?? 50,
          units: rows,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "get_unit",
    {
      title: "جلب تفاصيل عقار | Get Unit Details",
      description: DESC.getUnit,
      inputSchema: idSchema,
    },
    async (args) => {
      try {
        const unit = await getUnitById(args.id);
        if (!unit) return errorResult(`العقار غير موجود | Unit not found: ${args.id}`);
        return successResult(unit);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "create_unit",
    {
      title: "إنشاء عقار | Create Unit",
      description: DESC.createUnit,
      inputSchema: createUnitSchema,
    },
    async (args) => {
      try {
        const unit = await createUnit(args);
        return successResult(unit);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "update_unit",
    {
      title: "تعديل عقار | Update Unit",
      description: DESC.updateUnit,
      inputSchema: updateUnitSchema,
    },
    async (args) => {
      try {
        const { id, ...input } = args;
        const unit = await updateUnit(id, input);
        if (!unit) return errorResult(`العقار غير موجود | Unit not found: ${id}`);
        return successResult(unit);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "delete_unit",
    {
      title: "حذف عقار | Delete Unit",
      description: DESC.deleteUnit,
      inputSchema: idSchema,
    },
    async (args) => {
      try {
        await deleteUnit(args.id);
        return successResult({ deleted: true, id: args.id });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
