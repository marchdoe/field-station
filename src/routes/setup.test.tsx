// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectFile, ScanProjectResult } from "@/lib/api.js";
import { SetupPage } from "./setup.js";

// Use vi.hoisted so mocks are available before module import
const { mockNavigate, mockGetProjects, mockScanProjects, mockAddProjects } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetProjects: vi.fn(),
  mockScanProjects: vi.fn(),
  mockAddProjects: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/api.js", () => ({
  getProjects: mockGetProjects,
  scanProjects: mockScanProjects,
  addProjects: mockAddProjects,
}));

function makeProject(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return { name: "myapp", path: "/Users/foo/myapp", ...overrides };
}

function makeScanResult(overrides: Partial<ScanProjectResult> = {}): ScanProjectResult {
  return { name: "proj-a", path: "/Users/foo/Projects/proj-a", registered: false, ...overrides };
}

function renderSetup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: localStorage is cleared between tests (jsdom resets per file, not per test)
  localStorage.clear();
});

describe("SetupPage redirect", () => {
  it("redirects to / when projects already exist", async () => {
    mockGetProjects.mockResolvedValue([makeProject()]);
    renderSetup();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });
});

describe("SetupPage folder-pick state", () => {
  it("shows folder input and Scan button when no projects exist", async () => {
    mockGetProjects.mockResolvedValue([]);
    renderSetup();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("~/Projects")).toBeDefined();
      expect(screen.getByRole("button", { name: /scan/i })).toBeDefined();
    });
  });

  it("calls scanProjects with the entered folder on Scan click", async () => {
    mockGetProjects.mockResolvedValue([]);
    mockScanProjects.mockResolvedValue([]);
    renderSetup();

    await waitFor(() => screen.getByRole("button", { name: /scan/i }));
    fireEvent.change(screen.getByPlaceholderText("~/Projects"), {
      target: { value: "/home/user/Projects" },
    });
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => expect(mockScanProjects).toHaveBeenCalledWith("/home/user/Projects"));
  });
});

describe("SetupPage results state", () => {
  it("shows project names as checkboxes after scan resolves", async () => {
    mockGetProjects.mockResolvedValue([]);
    mockScanProjects.mockResolvedValue([
      makeScanResult({ name: "proj-a", path: "/p/proj-a" }),
      makeScanResult({ name: "proj-b", path: "/p/proj-b" }),
    ]);
    renderSetup();

    await waitFor(() => screen.getByRole("button", { name: /scan/i }));
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("proj-a")).toBeDefined();
      expect(screen.getByLabelText("proj-b")).toBeDefined();
    });
  });

  it("pre-checks checkboxes for already-registered projects", async () => {
    mockGetProjects.mockResolvedValue([]);
    mockScanProjects.mockResolvedValue([
      makeScanResult({ name: "registered", path: "/p/registered", registered: true }),
      makeScanResult({ name: "new-proj", path: "/p/new-proj", registered: false }),
    ]);
    renderSetup();

    await waitFor(() => screen.getByRole("button", { name: /scan/i }));
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => screen.getByLabelText("registered"));
    const registeredBox = screen.getByLabelText("registered") as HTMLInputElement;
    const newProjBox = screen.getByLabelText("new-proj") as HTMLInputElement;

    expect(registeredBox.checked).toBe(true);
    expect(newProjBox.checked).toBe(false);
  });

  it("checks all unregistered boxes when Select all unregistered is clicked", async () => {
    mockGetProjects.mockResolvedValue([]);
    mockScanProjects.mockResolvedValue([
      makeScanResult({ name: "registered", path: "/p/registered", registered: true }),
      makeScanResult({ name: "new-a", path: "/p/new-a", registered: false }),
      makeScanResult({ name: "new-b", path: "/p/new-b", registered: false }),
    ]);
    renderSetup();

    await waitFor(() => screen.getByRole("button", { name: /scan/i }));
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => screen.getByRole("button", { name: /select all unregistered/i }));
    fireEvent.click(screen.getByRole("button", { name: /select all unregistered/i }));

    await waitFor(() => {
      const newA = screen.getByLabelText("new-a") as HTMLInputElement;
      const newB = screen.getByLabelText("new-b") as HTMLInputElement;
      expect(newA.checked).toBe(true);
      expect(newB.checked).toBe(true);
    });
  });

  it("POSTs selected paths when Add is clicked", async () => {
    mockGetProjects.mockResolvedValue([]);
    mockScanProjects.mockResolvedValue([
      makeScanResult({ name: "proj-a", path: "/p/proj-a", registered: false }),
      makeScanResult({ name: "proj-b", path: "/p/proj-b", registered: false }),
    ]);
    mockAddProjects.mockResolvedValue([]);
    renderSetup();

    await waitFor(() => screen.getByRole("button", { name: /scan/i }));
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => screen.getByLabelText("proj-a"));
    // Check proj-a checkbox manually (registered=false so unchecked by default)
    fireEvent.click(screen.getByLabelText("proj-a"));

    const addBtn = await waitFor(() => screen.getByRole("button", { name: /add.*selected/i }));
    fireEvent.click(addBtn);

    await waitFor(() =>
      expect(mockAddProjects).toHaveBeenCalledWith(expect.arrayContaining(["/p/proj-a"])),
    );
  });
});

describe("SetupPage error handling", () => {
  it("shows an error alert when scan fails", async () => {
    mockGetProjects.mockResolvedValue([]);
    mockScanProjects.mockRejectedValue(new Error("folder does not exist"));
    renderSetup();

    await waitFor(() => screen.getByRole("button", { name: /scan/i }));
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("folder does not exist");
    });
  });
});
