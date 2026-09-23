import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildTools } from "../src/tools/index.js";
import { testConfig } from "./helpers.js";

// ADR-002 as executable policy. Every registered tool is checked; a tool that
// breaks a rule fails the build, and so never deploys (the Dockerfile runs
// these tests). Adding a verb here means writing an ADR first.
const ALLOWED_VERBS = ["get", "list", "search", "summarize"] as const;
const NAME = new RegExp(`^(${ALLOWED_VERBS.join("|")})_[a-z]+(_[a-z]+)*$`);

describe.each(buildTools(testConfig).map((t) => [t.name, t] as const))("tool %s", (_name, tool) => {
  it("is named verb_noun with an allowed verb", () => {
    expect(tool.name).toMatch(NAME);
  });

  it("has a one- or two-sentence description", () => {
    const sentences = tool.description.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
    expect(sentences.length).toBeGreaterThanOrEqual(1);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it("describes every input parameter", () => {
    for (const [field, schema] of Object.entries(tool.input)) {
      expect((schema as z.ZodType).description, `input "${field}" has no .describe()`).toBeTruthy();
    }
  });

  it("returns a top-level summary string", () => {
    expect(tool.output.summary).toBeInstanceOf(z.ZodString);
  });
});
