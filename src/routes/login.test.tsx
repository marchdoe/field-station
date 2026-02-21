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
  it("sends password field (not token) in request body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, redirected: false, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderLogin();
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "my-secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.password).toBe("my-secret");
    expect(body.token).toBeUndefined();

    vi.unstubAllGlobals();
  });
});

describe("LoginPage help toggle", () => {
  it("shows the help toggle button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /how do i get a token/i })).toBeDefined();
  });

  it("hides help content by default", () => {
    renderLogin();
    expect(screen.queryByText(/FIELD_STATION_TOKEN/)).toBeNull();
  });

  it("shows help content when toggle is clicked", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /how do i get a token/i }));
    expect(screen.getByText(/FIELD_STATION_TOKEN/)).toBeDefined();
  });

  it("hides help content when toggle is clicked again", () => {
    renderLogin();
    const toggle = screen.getByRole("button", { name: /how do i get a token/i });
    fireEvent.click(toggle);
    expect(screen.getByText(/FIELD_STATION_TOKEN/)).toBeDefined();
    fireEvent.click(toggle);
    expect(screen.queryByText(/FIELD_STATION_TOKEN/)).toBeNull();
  });
});
