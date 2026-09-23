import type { Config } from "../config.js";
import { getStatusTool } from "./get-status.js";
import type { AnyFrankTool } from "./types.js";

// Every tool Frank exposes. Add new tools here; mcp.ts registers them and
// test/conventions.test.ts checks each one against ADR-002.
export function buildTools(config: Config): AnyFrankTool[] {
  return [getStatusTool({ version: config.version, uptimeSeconds: () => process.uptime() })];
}
