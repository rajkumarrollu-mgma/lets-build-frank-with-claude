import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { formatUptime, getStatusTool } from "../src/tools/get-status.js";
import { connect, testConfig } from "./helpers.js";

describe("get_status over MCP", () => {
  let session: Awaited<ReturnType<typeof connect>>;
  beforeAll(async () => {
    session = await connect(createApp(testConfig));
  });
  afterAll(() => session.close());

  it("is listed by discovery with its schemas", async () => {
    const { tools } = await session.client.listTools();
    const tool = tools.find((t) => t.name === "get_status");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.additionalProperties).toBe(false);
    expect(tool!.outputSchema?.properties).toHaveProperty("summary");
    expect(tool!.annotations?.readOnlyHint).toBe(true);
  });

  it("returns a summary plus typed fields", async () => {
    const result = await session.client.callTool({ name: "get_status", arguments: {} });
    expect(result.isError).toBeFalsy();
    const status = result.structuredContent as Record<string, unknown>;
    expect(status.version).toBe("0.0.0-test");
    expect(status.uptimeSeconds).toEqual(expect.any(Number));
    expect(status.greeting).toEqual(expect.any(String));
    expect(status.summary).toContain("v0.0.0-test");
  });

  it("rejects unknown fields instead of ignoring them", async () => {
    const result = await session.client.callTool({ name: "get_status", arguments: { verbose: true } });
    expect(result.isError).toBe(true);
  });
});

describe("get_status handler", () => {
  it("reports the injected version and uptime", async () => {
    const tool = getStatusTool({ version: "1.2.3", uptimeSeconds: () => 3725.9 });
    const status = await tool.handler({});
    expect(status).toMatchObject({ version: "1.2.3", uptimeSeconds: 3725 });
    expect(status.summary).toContain("1h 2m 5s");
  });

  it("formats uptime compactly", () => {
    expect(formatUptime(0)).toBe("0s");
    expect(formatUptime(90061)).toBe("1d 1h 1m 1s");
  });
});
