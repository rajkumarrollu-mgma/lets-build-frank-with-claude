import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Express } from "express";
import type { Config } from "./config.js";
import { createMcpServer } from "./mcp.js";
import { buildTools } from "./tools/index.js";

export function createApp(config: Config): Express {
  const app = express();
  app.disable("x-powered-by");

  // Container health probe (ADR-001, ADR-004). Deliberately checks nothing
  // else, so a slow dependency can never make Frank look dead.
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  const tools = buildTools(config);

  // Streamable HTTP, stateless (ADR-001): a fresh server and transport per
  // request, so concurrent clients never share state and nothing is lost when
  // the app scales to zero (ADR-004).
  app.post("/mcp", express.json({ limit: "1mb" }), async (req, res) => {
    const server = createMcpServer(config.version, tools);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request failed", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // Without sessions there is no stream to open (GET) or session to end (DELETE).
  app.all("/mcp", (_req, res) => {
    res.status(405).set("Allow", "POST").json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Frank is stateless; use POST /mcp." },
      id: null,
    });
  });

  if (config.publicDir) {
    // The console, served by Frank so it can call /mcp relatively (ADR-006).
    app.use(express.static(config.publicDir));
  } else {
    // Frank deploys long before the console exists (ADR-003), so say so
    // rather than returning a bare 404.
    app.get("/", (_req, res) => {
      res
        .type("text/plain")
        .send("Frank is running. The console is not built yet; MCP clients connect to /mcp.\n");
    });
  }

  return app;
}
