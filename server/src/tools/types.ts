import type { z } from "zod";

// Everything a tool module exports (ADR-001: one module per tool). mcp.ts
// turns these into MCP registrations, so ADR-002's rules — strict inputs, a
// summary in every output, plain-language errors — are applied in one place
// instead of being re-implemented by each tool.
export interface FrankTool<I extends z.ZodRawShape, O extends z.ZodRawShape> {
  // verb_noun, verb from the closed set in ADR-002. Enforced by
  // test/conventions.test.ts.
  name: string;
  // One or two sentences for a model deciding whether to call this tool.
  description: string;
  // Every field needs .describe(). Wrapped in z.object(...).strict() at
  // registration, so unknown fields are rejected.
  input: I;
  // Must include `summary: z.string()` alongside the typed detail fields.
  output: O & { summary: z.ZodString };
  handler: (args: z.infer<z.ZodObject<I>>) => Promise<z.infer<z.ZodObject<O>>>;
}

// Throw this from a handler for a failure the caller should hear about in
// plain language ("that resource group does not exist"). Anything else that
// is thrown is logged and reported as a generic internal error, so a stack
// trace or an SDK message never reaches the client.
export class ToolError extends Error {}

// Erases the generics so tools with different shapes can share one array.
export type AnyFrankTool = FrankTool<z.ZodRawShape, z.ZodRawShape>;

export function defineTool<I extends z.ZodRawShape, O extends z.ZodRawShape>(
  tool: FrankTool<I, O>,
): AnyFrankTool {
  return tool as unknown as AnyFrankTool;
}
