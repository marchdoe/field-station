// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult } from "@/lib/api.js";
import { CommandPalette } from "./CommandPalette.js";

// jsdom doesn't implement showModal/close — polyfill them
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
});

// Use vi.hoisted to create mocks before vi.mock hoisting
const { mockNavigate, mockSearch } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSearch: vi.fn(),
}));

// Mock react-router useNavigate
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock api search function
vi.mock("@/lib/api.js", () => ({
  search: mockSearch,
}));

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    type: "agent",
    name: "Test Agent",
    description: "A test agent",
    filePath: "/home/user/.claude/agents/test.md",
    preview: "test agent preview",
    ...overrides,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockResolvedValue([]);
});

describe("CommandPalette", () => {
  it("does not show content when closed", () => {
    renderWithProviders(<CommandPalette open={false} onClose={vi.fn()} />);
    const dialog = document.querySelector("dialog");
    expect(dialog?.hasAttribute("open")).toBe(false);
  });

  it("calls search on open", async () => {
    renderWithProviders(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => expect(mockSearch).toHaveBeenCalled());
  });

  it("shows loading state initially", () => {
    mockSearch.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders results after loading", async () => {
    mockSearch.mockResolvedValue([makeResult({ name: "My Agent" })]);
    renderWithProviders(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("My Agent")).toBeDefined());
  });

  it("filters results by search query", async () => {
    // First call (empty query) returns Alpha and Beta
    mockSearch.mockResolvedValueOnce([
      makeResult({ name: "Alpha Agent", preview: "alpha agent" }),
      makeResult({
        name: "Beta Agent",
        preview: "beta agent",
        filePath: "/home/user/.claude/agents/beta.md",
      }),
    ]);
    // Second call (query "alpha") returns only Alpha
    mockSearch.mockResolvedValueOnce([makeResult({ name: "Alpha Agent", preview: "alpha agent" })]);

    renderWithProviders(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("Alpha Agent"));

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "alpha" } });

    await waitFor(() => {
      expect(screen.getByText("Alpha Agent")).toBeDefined();
      expect(screen.queryByText("Beta Agent")).toBeNull();
    });
  });

  it("shows no results message for unmatched query", async () => {
    // First call (empty query) returns Alpha
    mockSearch.mockResolvedValueOnce([makeResult({ name: "Alpha Agent", preview: "alpha agent" })]);
    // Second call (unmatched query) returns empty
    mockSearch.mockResolvedValueOnce([]);

    renderWithProviders(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("Alpha Agent"));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzznomatch" } });

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeDefined();
    });
  });
});
