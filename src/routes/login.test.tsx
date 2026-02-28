// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login.js";

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage form submission", () => {
  it("sends password field in request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      redirected: false,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLogin();
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "my-secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.password).toBe("my-secret");
    expect(body.token).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it("navigates to / on successful login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      redirected: false,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", { value: { href: "" }, writable: true });
    window.location.href = "";

    renderLogin();
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(window.location.href).toBe("/"));

    vi.unstubAllGlobals();
  });
});
