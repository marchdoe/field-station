// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast.js";

function ToastTrigger({ message, type }: { message: string; type?: "success" | "error" }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(message, type)}>
      Show Toast
    </button>
  );
}

function renderWithProvider(message: string, type?: "success" | "error") {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} type={type} />
    </ToastProvider>,
  );
}

describe("ToastProvider", () => {
  it("shows a success toast when triggered", () => {
    renderWithProvider("Saved successfully");
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }));
    expect(screen.getByText("Saved successfully")).toBeDefined();
  });

  it("shows an error toast when type is error", () => {
    renderWithProvider("Something went wrong", "error");
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }));
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("dismisses toast when X button is clicked", () => {
    renderWithProvider("Click to dismiss");
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }));
    expect(screen.getByText("Click to dismiss")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Click to dismiss")).toBeNull();
  });

  it("auto-dismisses toast after 3 seconds", () => {
    vi.useFakeTimers();
    renderWithProvider("Auto dismiss me");
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }));
    expect(screen.getByText("Auto dismiss me")).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(3001);
    });
    expect(screen.queryByText("Auto dismiss me")).toBeNull();
    vi.useRealTimers();
  });

  it("useToast throws when used outside ToastProvider", () => {
    function BadComponent() {
      useToast();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow("useToast must be used within ToastProvider");
  });
});
