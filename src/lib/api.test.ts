// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("removeProject", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends DELETE to /api/projects/{projectId}", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const { removeProject } = await import("./api.js");

    await removeProject("-Users-foo-myapp");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/projects/-Users-foo-myapp",
      { method: "DELETE" },
    );
  });

  it("throws when the server returns an error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "project not found" }),
    });
    const { removeProject } = await import("./api.js");

    await expect(removeProject("-nonexistent")).rejects.toThrow("project not found");
  });
});
