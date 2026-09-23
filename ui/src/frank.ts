import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

export type { CallToolResult, Tool };

// The only way the console reaches Frank. It calls /mcp on the origin that
// served it (ADR-006) and holds no secrets (ADR-003): it can do exactly what
// any MCP client can, and every Frank tool is read-only (ADR-002).
export interface FrankApi {
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
}

let connecting: Promise<Client> | null = null;

function client(): Promise<Client> {
  if (!connecting) {
    const c = new Client({ name: "frank-console", version: "0.1.0" });
    connecting = c
      .connect(new StreamableHTTPClientTransport(new URL("/mcp", window.location.href)))
      .then(() => c)
      .catch((err: unknown) => {
        // Let the next call try again (e.g. Frank was cold-starting).
        connecting = null;
        throw err;
      });
  }
  return connecting;
}

export const frank: FrankApi = {
  async listTools() {
    return (await (await client()).listTools()).tools;
  },
  async callTool(name, args) {
    return (await (await client()).callTool({ name, arguments: args })) as CallToolResult;
  },
};

// A tool's human-readable text: the ADR-002 `summary` when the result has
// one, otherwise the first text block (which is where errors arrive).
export function resultText(result: CallToolResult): string {
  const summary = (result.structuredContent as { summary?: unknown } | undefined)?.summary;
  if (typeof summary === "string") return summary;
  const text = result.content?.find((c) => c.type === "text");
  return text && "text" in text ? text.text : "";
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
