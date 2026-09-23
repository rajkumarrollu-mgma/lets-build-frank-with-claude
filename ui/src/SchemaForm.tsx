import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useState } from "react";
import { type Field, type FormValues, type JsonSchema, fieldsOf, initialValues, toArguments } from "./schema";

interface Props {
  schema: JsonSchema;
  submitting: boolean;
  onSubmit: (args: Record<string, unknown>) => void;
}

// Parent should key this component by tool name so values reset per tool.
export function SchemaForm({ schema, submitting, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>(() => initialValues(schema));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fields = fieldsOf(schema);
  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));

  const submit = () => {
    const result = toArguments(schema, values);
    if (result.ok) {
      setErrors({});
      onSubmit(result.args);
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Form
        actions={
          <Button variant="primary" loading={submitting} formAction="submit">
            Call tool
          </Button>
        }
      >
        <SpaceBetween size="m">
          {fields.length === 0 && <span>This tool takes no input.</span>}
          {fields.map((field) => (
            <FormField
              key={field.name}
              label={field.name}
              description={field.description}
              info={field.required ? undefined : <i>optional</i>}
              errorText={errors[field.name]}
            >
              <FieldInput field={field} value={values[field.name]} onChange={(v) => set(field.name, v)} />
            </FormField>
          ))}
        </SpaceBetween>
      </Form>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  switch (field.kind) {
    case "boolean":
      return (
        <Checkbox checked={value === true} onChange={({ detail }) => onChange(detail.checked)}>
          {field.name}
        </Checkbox>
      );
    case "enum": {
      const options = (field.options ?? []).map((o) => ({ label: o, value: o }));
      return (
        <Select
          selectedOption={options.find((o) => o.value === value) ?? null}
          options={field.required ? options : [{ label: "(none)", value: "" }, ...options]}
          onChange={({ detail }) => onChange(detail.selectedOption.value ?? "")}
          ariaLabel={field.name}
        />
      );
    }
    case "json":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={({ detail }) => onChange(detail.value)}
          placeholder="JSON"
          ariaLabel={field.name}
        />
      );
    default:
      return (
        <Input
          value={String(value ?? "")}
          type={field.kind === "string" ? "text" : "number"}
          inputMode={field.kind === "string" ? undefined : "decimal"}
          onChange={({ detail }) => onChange(detail.value)}
          ariaLabel={field.name}
        />
      );
  }
}
