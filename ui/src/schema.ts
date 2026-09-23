// Turns a tool's JSON input schema (from MCP discovery) into form fields and
// back, so a new tool appears in the console with no UI work (ADR-003).

export interface JsonSchema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  additionalProperties?: boolean | JsonSchema;
}

export type FieldKind = "string" | "number" | "integer" | "boolean" | "enum" | "json";

export interface Field {
  name: string;
  kind: FieldKind;
  required: boolean;
  description?: string;
  options?: string[];
}

// Strings for text inputs, booleans for checkboxes.
export type FormValues = Record<string, string | boolean>;

function primaryType(schema: JsonSchema): string | undefined {
  return Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
}

export function fieldKind(schema: JsonSchema): FieldKind {
  if (schema.enum?.every((v) => typeof v === "string")) return "enum";
  switch (primaryType(schema)) {
    case "string":
    case "number":
    case "integer":
    case "boolean":
      return primaryType(schema) as FieldKind;
    default:
      // Objects, arrays and anything unusual: edit as JSON.
      return "json";
  }
}

export function fieldsOf(schema: JsonSchema): Field[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, prop]) => ({
    name,
    kind: fieldKind(prop),
    required: required.has(name),
    description: prop.description,
    options: fieldKind(prop) === "enum" ? (prop.enum as string[]) : undefined,
  }));
}

export function initialValues(schema: JsonSchema): FormValues {
  const values: FormValues = {};
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const kind = fieldKind(prop);
    if (kind === "boolean") values[name] = prop.default === true;
    else if (prop.default === undefined) values[name] = "";
    else values[name] = kind === "json" ? JSON.stringify(prop.default) : String(prop.default);
  }
  return values;
}

export type ArgumentsResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

// Form values -> tool arguments. Empty optional fields are left out rather
// than sent as "", because Frank rejects what the schema doesn't allow.
export function toArguments(schema: JsonSchema, values: FormValues): ArgumentsResult {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of fieldsOf(schema)) {
    const raw = values[field.name];
    if (field.kind === "boolean") {
      args[field.name] = raw === true;
      continue;
    }
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text === "") {
      if (field.required) errors[field.name] = "Required.";
      continue;
    }
    switch (field.kind) {
      case "number":
      case "integer": {
        const n = Number(text);
        if (!Number.isFinite(n)) errors[field.name] = "Enter a number.";
        else if (field.kind === "integer" && !Number.isInteger(n)) errors[field.name] = "Enter a whole number.";
        else args[field.name] = n;
        break;
      }
      case "json":
        try {
          args[field.name] = JSON.parse(text);
        } catch {
          errors[field.name] = "Enter valid JSON.";
        }
        break;
      default:
        args[field.name] = text;
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, args };
}
