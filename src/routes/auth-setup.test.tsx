// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthSetupPage } from "./auth-setup.js";

function renderSetup() {
  return render(
    <MemoryRouter>
      <AuthSetupPage />
    </MemoryRouter>,
  );
}

describe("AuthSetupPage", () => {
  it("renders a password and confirm-password field", () => {
    renderSetup();
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });

  it("shows validation error when passwords don't match", async () => {
    renderSetup();
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "xyz" } });
    fireEvent.click(screen.getByRole("button", { name: /set password/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });

  it("submits to POST /api/auth/setup with password field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSetup();
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "my-password" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "my-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set password/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/setup");
    expect(JSON.parse(opts.body as string).password).toBe("my-password");

    vi.unstubAllGlobals();
  });
});
