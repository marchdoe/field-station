// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectCard } from "@/components/ProjectCard.js";
import type { ProjectFile } from "@/lib/api.js";

const { mockRemoveProject } = vi.hoisted(() => ({
  mockRemoveProject: vi.fn(),
}));

vi.mock("@/lib/api.js", () => ({
  removeProject: mockRemoveProject,
}));

function makeProject(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return { name: "myapp", path: "/Users/foo/myapp", ...overrides };
}

function renderCard(project: ProjectFile) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ProjectCard", () => {
  it("renders project name and path", () => {
    renderCard(makeProject());
    expect(screen.getByText("myapp")).toBeDefined();
    expect(screen.getByText("/Users/foo/myapp")).toBeDefined();
  });

  it("has a remove button (always in DOM for accessibility, hidden via CSS)", () => {
    renderCard(makeProject({ name: "myapp" }));
    expect(screen.getByRole("button", { name: /remove myapp/i })).toBeDefined();
  });

  it("opens confirmation modal on remove button click", async () => {
    renderCard(makeProject({ name: "myapp" }));
    fireEvent.click(screen.getByRole("button", { name: /remove myapp/i }));
    await waitFor(() => {
      expect(screen.getByText(/remove project\?/i)).toBeDefined();
    });
  });

  it("calls removeProject with encoded path on confirm", async () => {
    mockRemoveProject.mockResolvedValue(undefined);
    renderCard(makeProject({ name: "myapp", path: "/Users/foo/myapp" }));

    fireEvent.click(screen.getByRole("button", { name: /remove myapp/i }));
    await waitFor(() => screen.getByRole("button", { name: /^remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => expect(mockRemoveProject).toHaveBeenCalledWith("-Users-foo-myapp"));
  });

  it("closes modal on cancel without calling removeProject", async () => {
    renderCard(makeProject());
    fireEvent.click(screen.getByRole("button", { name: /remove myapp/i }));
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/remove project\?/i)).toBeNull();
    });
    expect(mockRemoveProject).not.toHaveBeenCalled();
  });
});
