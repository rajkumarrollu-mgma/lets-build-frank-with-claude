import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import type { CallToolResult, FrankApi, Tool } from "../src/frank";

const tools: Tool[] = [
  {
    name: "get_status",
    description: "Returns Frank's version.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_things",
    description: "Searches things.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to find." } },
      required: ["query"],
    },
  },
];

const status: CallToolResult = {
  content: [{ type: "text", text: "{}" }],
  structuredContent: { summary: "Frank v9.9.9 is up.", version: "9.9.9", uptimeSeconds: 42, greeting: "Hi." },
};

function fakeFrank(overrides: Partial<FrankApi> = {}): FrankApi {
  return {
    listTools: vi.fn(async () => tools),
    callTool: vi.fn(async (name: string, args: Record<string, unknown>) =>
      name === "get_status"
        ? status
        : { content: [], structuredContent: { summary: `found ${String(args.query)}`, count: 1 } },
    ),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("Overview", () => {
  it("shows get_status output and a healthy connection", async () => {
    render(<App api={fakeFrank()} />);
    expect(await screen.findByText("9.9.9")).toBeTruthy();
    expect(screen.getByText(/Connected/)).toBeTruthy();
    expect(screen.getByText("Frank v9.9.9 is up.")).toBeTruthy();
  });

  it("says so when Frank cannot be reached", async () => {
    const api = fakeFrank({ callTool: vi.fn(async () => Promise.reject(new Error("Failed to fetch"))) });
    render(<App api={api} />);
    expect(await screen.findByText("Frank did not answer")).toBeTruthy();
    expect(screen.getByText("Failed to fetch")).toBeTruthy();
  });
});

describe("Tools", () => {
  it("renders a form from the selected tool's schema and shows the result", async () => {
    window.location.hash = "#/tools";
    const api = fakeFrank();
    const user = userEvent.setup();
    render(<App api={api} />);

    await user.click(await screen.findByText("search_things"));
    await user.type(await screen.findByLabelText("query"), "widgets");
    await user.click(screen.getByRole("button", { name: "Call tool" }));

    await waitFor(() => expect(api.callTool).toHaveBeenCalledWith("search_things", { query: "widgets" }));
    expect(await screen.findByText("found widgets")).toBeTruthy();
    expect(screen.getByText(/"count": 1/)).toBeTruthy();
  });

  it("does not call Frank when a required field is empty", async () => {
    window.location.hash = "#/tools";
    const api = fakeFrank();
    const user = userEvent.setup();
    render(<App api={api} />);

    await user.click(await screen.findByText("search_things"));
    await user.click(screen.getByRole("button", { name: "Call tool" }));

    expect(await screen.findByText("Required.")).toBeTruthy();
    expect(api.callTool).not.toHaveBeenCalled();
  });

  it("shows a tool's isError result as an error", async () => {
    window.location.hash = "#/tools";
    const api = fakeFrank({
      callTool: vi.fn(async () => ({ isError: true, content: [{ type: "text" as const, text: "No such thing." }] })),
    });
    const user = userEvent.setup();
    render(<App api={api} />);

    await user.click(await screen.findByRole("button", { name: "Call tool" }));
    expect(await screen.findByText("Frank returned an error")).toBeTruthy();
    expect(screen.getByText("No such thing.")).toBeTruthy();
  });
});
