import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useCallback, useEffect, useState } from "react";
import { type FrankApi, errorMessage, resultText } from "../frank";

interface Status {
  summary: string;
  version: string;
  uptimeSeconds: number;
  greeting: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; status: Status; latencyMs: number }
  | { kind: "error"; message: string };

// Frank's get_status output and connection health (ADR-003).
export function Overview({ api }: { api: FrankApi }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    const started = performance.now();
    try {
      const result = await api.callTool("get_status", {});
      if (result.isError) throw new Error(resultText(result) || "get_status failed.");
      setState({
        kind: "ok",
        status: result.structuredContent as unknown as Status,
        latencyMs: Math.round(performance.now() - started),
      });
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err) });
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ContentLayout header={<Header variant="h1">Overview</Header>}>
      <SpaceBetween size="l">
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button iconName="refresh" loading={state.kind === "loading"} onClick={() => void refresh()}>
                  Refresh
                </Button>
              }
            >
              Connection
            </Header>
          }
        >
          {state.kind === "loading" && <StatusIndicator type="loading">Connecting to Frank…</StatusIndicator>}
          {state.kind === "ok" && (
            <StatusIndicator type="success">Connected — get_status answered in {state.latencyMs} ms</StatusIndicator>
          )}
          {state.kind === "error" && (
            <Alert type="error" header="Frank did not answer">
              {state.message}
            </Alert>
          )}
        </Container>

        {state.kind === "ok" && (
          <Container header={<Header variant="h2" description={state.status.summary}>Status</Header>}>
            <KeyValuePairs
              columns={3}
              items={[
                { label: "Version", value: state.status.version },
                { label: "Uptime", value: `${state.status.uptimeSeconds} s` },
                { label: "Greeting", value: state.status.greeting },
              ]}
            />
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
