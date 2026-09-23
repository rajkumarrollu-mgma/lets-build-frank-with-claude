import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { type AnyFrankTool, ToolError } from "./tools/types.js";

function failure(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export function createMcpServer(version: string, tools: AnyFrankTool[]): McpServer {
  const server = new McpServer({ name: "frank", version });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        // .strict(): unknown fields are rejected, not silently dropped (ADR-002).
        // The SDK validates against this before the handler runs and reports a
        // failure as isError with the validation message.
        inputSchema: z.object(tool.input).strict(),
        outputSchema: tool.output,
        // Every Frank tool is read-only by policy (ADR-002); tell clients so.
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async (args: Record<string, unknown>): Promise<CallToolResult> => {
        try {
          const result = await tool.handler(args);
          return {
            structuredContent: result,
            // For clients that ignore structuredContent.
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          if (err instanceof ToolError) return failure(err.message);
          console.error(`tool ${tool.name} failed`, err);
          return failure(`Frank hit an internal error running ${tool.name}. The details are in his logs.`);
        }
      },
    );
  }

  return server;
}
