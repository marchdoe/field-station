// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddProjectPopover } from "@/components/layout/AddProjectPopover.js";
import type { ScanProjectResult } from "@/lib/api.js";

const { mockScanProjects, mockAddProjects } = vi.hoisted(() => ({
  mockScanProjects: vi.fn(),
  mockAddProjects: vi.fn(),
}));

vi.mock("@/lib/api.js", () => ({
  scanProjects: mockScanProjects,
  addProjects: mockAddProjects,
}));

function makeScanResult(overrides: Partial<ScanProjectResult> = {}): ScanProjectResult {
  return { name: "proj-a", path: "/Users/foo/Projects/proj-a", registered: false, ...overrides };
}

function renderPopover() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AddProjectPopover />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("AddProjectPopover", () => {
  it("renders the trigger button", () => {
    renderPopover();
    expect(screen.getByRole("button", { name: /add project/i })).toBeDefined();
  });

  it("scans on open and shows unregistered projects", async () => {
    localStorage.setItem("field-station:projects-folder", "/Users/foo/Projects");
    mockScanProjects.mockResolvedValue([
      makeScanResult({ name: "proj-a", registered: false }),
      makeScanResult({ name: "proj-b", path: "/Users/foo/Projects/proj-b", registered: true }),
    ]);
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /add project/i }));

    await waitFor(() => expect(mockScanProjects).toHaveBeenCalledWith("/Users/foo/Projects"));
    await waitFor(() => {
      expect(screen.getByText("proj-a")).toBeDefined();
      // registered projects should NOT appear
      expect(screen.queryByText("proj-b")).toBeNull();
    });
  });

  it("calls addProjects when a project row is clicked", async () => {
    localStorage.setItem("field-station:projects-folder", "/Users/foo/Projects");
    mockScanProjects.mockResolvedValue([
      makeScanResult({ name: "proj-a", path: "/Users/foo/Projects/proj-a", registered: false }),
    ]);
    mockAddProjects.mockResolvedValue([]);
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /add project/i }));
    await waitFor(() => screen.getByText("proj-a"));
    fireEvent.click(screen.getByText("proj-a"));

    await waitFor(() =>
      expect(mockAddProjects).toHaveBeenCalledWith(["/Users/foo/Projects/proj-a"]),
    );
  });

  it("shows empty state when all projects are registered", async () => {
    localStorage.setItem("field-station:projects-folder", "/Users/foo/Projects");
    mockScanProjects.mockResolvedValue([makeScanResult({ name: "proj-a", registered: true })]);
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /add project/i }));
    await waitFor(() => {
      expect(screen.getByText(/already added/i)).toBeDefined();
    });
  });
});
