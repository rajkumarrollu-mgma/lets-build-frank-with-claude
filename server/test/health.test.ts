import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const config = { port: 3000, version: "0.0.0-test", publicDir: null };

describe("GET /healthz", () => {
  it("returns 200", async () => {
    const res = await request(createApp(config)).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET / without a console", () => {
  it("says the console is not built and points at /mcp", async () => {
    const res = await request(createApp(config)).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("/mcp");
  });
});

describe("loadConfig", () => {
  it("defaults PORT to 3000, matching the Dockerfile and deploy.yml", () => {
    expect(loadConfig({}).port).toBe(3000);
  });

  it("rejects a PORT that is not a port", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });
});
