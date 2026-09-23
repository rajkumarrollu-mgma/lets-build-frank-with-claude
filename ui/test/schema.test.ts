import { describe, expect, it } from "vitest";
import { fieldsOf, initialValues, type JsonSchema, toArguments } from "../src/schema";

const schema: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "A name." },
    limit: { type: "integer", default: 10 },
    ratio: { type: "number" },
    verbose: { type: "boolean" },
    sort: { type: "string", enum: ["asc", "desc"] },
    filter: { type: "object" },
  },
  required: ["name"],
  additionalProperties: false,
};

describe("fieldsOf", () => {
  it("maps each JSON schema type to a form field", () => {
    expect(fieldsOf(schema).map((f) => [f.name, f.kind, f.required])).toEqual([
      ["name", "string", true],
      ["limit", "integer", false],
      ["ratio", "number", false],
      ["verbose", "boolean", false],
      ["sort", "enum", false],
      ["filter", "json", false],
    ]);
  });

  it("gives a tool with no input no fields", () => {
    expect(fieldsOf({ type: "object", properties: {} })).toEqual([]);
  });
});

describe("toArguments", () => {
  it("converts values to typed arguments and leaves out empty optional fields", () => {
    const values = { ...initialValues(schema), name: " frank ", ratio: "0.5", filter: '{"a":1}' };
    expect(toArguments(schema, values)).toEqual({
      ok: true,
      args: { name: "frank", limit: 10, ratio: 0.5, verbose: false, filter: { a: 1 } },
    });
  });

  it("reports every invalid field instead of sending a bad call", () => {
    const values = { ...initialValues(schema), name: "", limit: "2.5", filter: "{nope" };
    expect(toArguments(schema, values)).toEqual({
      ok: false,
      errors: { name: "Required.", limit: "Enter a whole number.", filter: "Enter valid JSON." },
    });
  });
});
