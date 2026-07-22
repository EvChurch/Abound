import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  headers: vi.fn(),
  listMcpAccessTokens: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => mocks.accessState),
}));

vi.mock("@/lib/mcp/access-tokens", () => ({
  listMcpAccessTokens: mocks.listMcpAccessTokens,
}));

vi.mock("@/app/tools/mcp/actions", () => ({
  createMcpTokenAction: vi.fn(),
  revokeMcpTokenAction: vi.fn(),
}));

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: ({
    toolsActiveItem,
  }: {
    toolsActiveItem?: "mcp" | "pledge-recommendations";
  }) => <nav aria-label="Primary">Top nav {toolsActiveItem}</nav>,
}));

import McpSetupPage from "@/app/tools/mcp/page";

describe("McpSetupPage", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
    vi.stubEnv("APP_BASE_URL", "https://abound.example.test");
    vi.stubEnv("MCP_PUBLIC_BASE_URL", "https://abound.example.test");
    vi.stubEnv("MCP_RESOURCE", "https://abound.example.test/mcp");
    mocks.headers.mockResolvedValue(
      new Headers({
        host: "abound.example.test",
        "x-forwarded-proto": "https",
      }),
    );
    mocks.accessState = { status: "anonymous" };
    mocks.listMcpAccessTokens.mockResolvedValue([]);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to login", async () => {
    await expect(McpSetupPage()).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("renders MCP setup details for active staff", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|staff",
        email: "staff@example.com",
        id: "user_1",
        name: "Staff",
        rockPersonId: null,
      },
    };

    const { container } = render(await McpSetupPage());

    expect(
      screen.getByRole("heading", { name: "Connect Abound to Your AI App" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Top nav mcp")).toBeInTheDocument();
    expect(screen.getByText("Create a personal MCP token")).toBeInTheDocument();
    expect(screen.getByLabelText("Token name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create token/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No active personal MCP tokens."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ask a question")).toBeInTheDocument();
    expect(
      screen.getByText(
        "What saved people and household segments are available in Abound?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Find households with recent giving changes and show the strongest examples.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Which households appear to have stopped giving recently?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Which people look newly engaged based on recent giving?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Before I ask about donors, is Abound's giving data up to date?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Summarize the giving context for a donor I name next."),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Codex command");
    expect(container).not.toHaveTextContent("Paste the Abound address.");
    expect(container).not.toHaveTextContent("https://abound.example.test/mcp");
    expect(container).not.toHaveTextContent("sign in");
    expect(container).not.toHaveTextContent(
      "Auth0 dynamic client registration",
    );
    expect(container).not.toHaveTextContent("codex mcp list");
    expect(container).not.toHaveTextContent("claude mcp list");
    expect(screen.queryByText("Advanced Setup")).not.toBeInTheDocument();
    expect(screen.queryByText("What Your AI Can Read")).not.toBeInTheDocument();
    expect(
      screen.queryByText("See payment methods, tokens, or provider secrets."),
    ).not.toBeInTheDocument();
  });

  it("copies a prompt when the prompt is clicked", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|staff",
        email: "staff@example.com",
        id: "user_1",
        name: "Staff",
        rockPersonId: null,
      },
    };

    render(await McpSetupPage());

    const prompt = "Which households appear to have stopped giving recently?";
    fireEvent.click(screen.getByRole("button", { name: new RegExp(prompt) }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(prompt);
  });
});
