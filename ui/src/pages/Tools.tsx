import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useEffect, useState } from "react";
import { type CallToolResult, type FrankApi, type Tool, errorMessage, resultText } from "../frank";
import { SchemaForm } from "../SchemaForm";
import type { JsonSchema } from "../schema";

// Tool list from MCP discovery; selecting a tool renders a form from its
// input schema and shows the JSON result (ADR-003).
export function Tools({ api }: { api: FrankApi }) {
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tool | null>(null);
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<CallToolResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listTools()
      .then((list) => {
        setTools(list);
        setSelected((s) => s ?? list[0] ?? null);
      })
      .catch((err) => setLoadError(errorMessage(err)));
  }, [api]);

  const select = (tool: Tool | null) => {
    setSelected(tool);
    setResult(null);
    setCallError(null);
  };

  const call = async (args: Record<string, unknown>) => {
    if (!selected) return;
    setCalling(true);
    setResult(null);
    setCallError(null);
    try {
      setResult(await api.callTool(selected.name, args));
    } catch (err) {
      setCallError(errorMessage(err));
    } finally {
      setCalling(false);
    }
  };

  return (
    <ContentLayout header={<Header variant="h1">Tools</Header>}>
      <SpaceBetween size="l">
        {loadError && (
          <Alert type="error" header="Could not list Frank's tools">
            {loadError}
          </Alert>
        )}

        <Table
          header={<Header counter={tools ? `(${tools.length})` : undefined}>Available tools</Header>}
          items={tools ?? []}
          loading={!tools && !loadError}
          loadingText="Discovering tools"
          trackBy="name"
          selectionType="single"
          selectedItems={selected ? [selected] : []}
          onSelectionChange={({ detail }) => select(detail.selectedItems[0] ?? null)}
          onRowClick={({ detail }) => select(detail.item)}
          ariaLabels={{ itemSelectionLabel: (_s, item) => item.name, selectionGroupLabel: "Tools" }}
          columnDefinitions={[
            { id: "name", header: "Name", cell: (t) => <Box variant="code">{t.name}</Box>, width: 240 },
            { id: "description", header: "Description", cell: (t) => t.description ?? "" },
          ]}
          empty={<Box textAlign="center">Frank exposes no tools.</Box>}
        />

        {selected && (
          <Container header={<Header variant="h2" description={selected.description}>{selected.name}</Header>}>
            <SpaceBetween size="l">
              <SchemaForm
                key={selected.name}
                schema={selected.inputSchema as JsonSchema}
                submitting={calling}
                onSubmit={(args) => void call(args)}
              />
              {callError && (
                <Alert type="error" header="The call did not reach Frank">
                  {callError}
                </Alert>
              )}
              {result && <ResultView result={result} />}
            </SpaceBetween>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}

function ResultView({ result }: { result: CallToolResult }) {
  if (result.isError) {
    return (
      <Alert type="error" header="Frank returned an error">
        {resultText(result)}
      </Alert>
    );
  }
  return (
    <SpaceBetween size="s">
      <StatusIndicator type="success">{resultText(result)}</StatusIndicator>
      <Box variant="pre">{JSON.stringify(result.structuredContent ?? result.content, null, 2)}</Box>
    </SpaceBetween>
  );
}
