// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsViewer } from "./SettingsViewer.js";

const baseProps = {
  settings: { apiKey: "sk-redacted", model: "claude-opus-4-5", maxTokens: 4096 },
  source: "global" as const,
  editable: true,
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onMove: vi.fn(),
  onAdd: vi.fn(),
};

describe("SettingsViewer", () => {
  it("renders top-level setting keys", () => {
    render(<SettingsViewer {...baseProps} />);
    expect(screen.getByText(/apiKey/)).toBeDefined();
    expect(screen.getByText(/\bmodel\b/)).toBeDefined();
    expect(screen.getByText(/maxTokens/)).toBeDefined();
  });

  it("renders string values", () => {
    render(<SettingsViewer {...baseProps} settings={{ greeting: "hello" }} />);
    expect(screen.getByText("hello")).toBeDefined();
  });

  it("renders numeric values", () => {
    render(<SettingsViewer {...baseProps} settings={{ count: 42 }} />);
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders boolean true value", () => {
    render(<SettingsViewer {...baseProps} settings={{ enabled: true }} />);
    expect(screen.getByText("true")).toBeDefined();
  });

  it("renders boolean false value", () => {
    render(<SettingsViewer {...baseProps} settings={{ enabled: false }} />);
    expect(screen.getByText("false")).toBeDefined();
  });

  it("renders without crashing for empty settings", () => {
    render(<SettingsViewer {...baseProps} settings={{}} />);
    expect(screen.queryByText(/apiKey/)).toBeNull();
  });
});
