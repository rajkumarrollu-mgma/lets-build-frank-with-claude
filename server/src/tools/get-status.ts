import { z } from "zod";
import { defineTool } from "./types.js";

export interface StatusContext {
  version: string;
  // Injected so tests can control the clock.
  uptimeSeconds: () => number;
}

const GREETING = "Hello, I'm Frank. I observe; I don't act.";

export function formatUptime(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s % 60}s`].filter(Boolean);
  return parts.join(" ");
}

// Frank's first tool (ADR-002): proves the pipeline, client wiring and UI
// before any Azure integration exists.
export function getStatusTool(ctx: StatusContext) {
  return defineTool({
    name: "get_status",
    description:
      "Returns Frank's version, how long he has been running, and a greeting. " +
      "Use it to check that Frank is reachable; it reports nothing about Azure.",
    input: {},
    output: {
      summary: z.string().describe("One-line, human-readable status."),
      version: z.string().describe("Frank's server version."),
      uptimeSeconds: z.number().int().nonnegative().describe("Seconds since the server process started."),
      greeting: z.string().describe("A short greeting from Frank."),
    },
    handler: async () => {
      const uptimeSeconds = Math.floor(ctx.uptimeSeconds());
      return {
        summary: `Frank v${ctx.version} is up (${formatUptime(uptimeSeconds)}). ${GREETING}`,
        version: ctx.version,
        uptimeSeconds,
        greeting: GREETING,
      };
    },
  });
}
