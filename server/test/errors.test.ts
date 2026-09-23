import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { createMcpServer } from "../src/mcp.js";
import { defineTool, ToolError } from "../src/tools/types.js";
import { connect, testConfig } from "./helpers.js";
import request from "supertest";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

// A throwaway app hosting deliberately failing tools, to prove ADR-002's
// error rule: isError plus a plain-language message, never a stack trace.
function failingApp() {
  const tools = [
    defineTool({
      name: "get_expected_failure",
      description: "Fails the way a tool should when the caller asked for something impossible.",
      input: {},
      output: { summary: z.string() },
      handler: async () => {
        throw new ToolError("That resource group does not exist.");
      },
    }),
    defineTool({
      name: "get_unexpected_failure",
      description: "Fails the way a bug would.",
      input: {},
      output: { summary: z.string() },
      handler: async () => {
        throw new Error("secret internal detail at /app/dist/x.js:1:1");
      },
    }),
  ];
  const app = express();
  app.post("/mcp", express.json(), async (req, res) => {
    const server = createMcpServer("0.0.0-test", tools);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  return app;
}

describe("tool errors", () => {
  let session: Awaited<ReturnType<typeof connect>>;
  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    session = await connect(failingApp());
  });
  afterAll(() => session.close());

  it("passes a ToolError's plain message through", async () => {
    const result = await session.client.callTool({ name: "get_expected_failure", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "That resource group does not exist." }]);
  });

  it("hides the details of an unexpected error", async () => {
    const result = await session.client.callTool({ name: "get_unexpected_failure", arguments: {} });
    expect(result.isError).toBe(true);
    const text = JSON.stringify(result.content);
    expect(text).toContain("internal error");
    expect(text).not.toContain("secret internal detail");
    expect(text).not.toContain(".js:");
  });
});

describe("/mcp HTTP methods", () => {
  it("rejects GET with 405 because Frank is stateless", async () => {
    const res = await request(createApp(testConfig)).get("/mcp");
    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe("POST");
  });
});
