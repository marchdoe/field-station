// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult } from "@/types/config.js";
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
const { mockNavigate, mockSearchAll } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSearchAll: vi.fn(),
}));

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

// Mock searchAll server function
vi.mock("@/server/functions/search.js", () => ({
  searchAll: mockSearchAll,
}));

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    type: "agent",
    title: "Test Agent",
    description: "A test agent",
    href: "/global/agents/test",
    matchText: "test agent",
    icon: "Bot",
    scope: "global",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchAll.mockResolvedValue([]);
});

describe("CommandPalette", () => {
  it("does not show content when closed", () => {
    render(<CommandPalette open={false} onClose={vi.fn()} />);
    const dialog = document.querySelector("dialog");
    expect(dialog?.hasAttribute("open")).toBe(false);
  });

  it("calls searchAll on open", async () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => expect(mockSearchAll).toHaveBeenCalledTimes(1));
  });

  it("shows loading state initially", () => {
    mockSearchAll.mockReturnValue(new Promise(() => {}));
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders results after loading", async () => {
    mockSearchAll.mockResolvedValue([makeResult({ title: "My Agent" })]);
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("My Agent")).toBeDefined());
  });

  it("filters results by search query", async () => {
    mockSearchAll.mockResolvedValue([
      makeResult({ title: "Alpha Agent", matchText: "alpha agent" }),
      makeResult({
        title: "Beta Agent",
        matchText: "beta agent",
        href: "/global/agents/beta",
      }),
    ]);
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("Alpha Agent"));

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "alpha" } });
    expect(screen.getByText("Alpha Agent")).toBeDefined();
    expect(screen.queryByText("Beta Agent")).toBeNull();
  });

  it("shows no results message for unmatched query", async () => {
    mockSearchAll.mockResolvedValue([
      makeResult({ title: "Alpha Agent", matchText: "alpha agent" }),
    ]);
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("Alpha Agent"));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzznomatch" } });
    expect(screen.getByText("No results found")).toBeDefined();
  });
});
