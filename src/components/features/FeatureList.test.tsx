// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Feature } from "@/lib/api.js";
import { FeatureList } from "./FeatureList.js";

function makeFeature(overrides: Partial<Feature["definition"]> = {}): Feature {
  return {
    definition: {
      key: "TEST_KEY",
      type: "env",
      name: "Test Feature",
      description: "A test feature",
      category: "experimental",
      valueType: "boolean",
      ...overrides,
    },
    currentValue: null,
    isDocumented: true,
  };
}

const defaultProps = {
  features: [
    makeFeature({ key: "FEAT_A", name: "Alpha", category: "experimental" }),
    makeFeature({ key: "FEAT_B", name: "Beta", category: "model" }),
    makeFeature({ key: "FEAT_C", name: "Gamma", category: "experimental" }),
  ],
  onToggle: vi.fn(),
  onValueChange: vi.fn(),
};

describe("FeatureList", () => {
  it("renders all features by default", () => {
    render(<FeatureList {...defaultProps} />);
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Gamma")).toBeDefined();
  });

  it("filters features by search query", () => {
    render(<FeatureList {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search features...");
    fireEvent.change(input, { target: { value: "Alpha" } });
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.queryByText("Beta")).toBeNull();
    expect(screen.queryByText("Gamma")).toBeNull();
  });

  it("shows empty state when search has no matches", () => {
    render(<FeatureList {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search features...");
    fireEvent.change(input, { target: { value: "zzznomatch" } });
    expect(screen.getByText("No features match your search.")).toBeDefined();
  });

  it("filters features by category", () => {
    render(<FeatureList {...defaultProps} />);
    const modelButton = screen.getByRole("button", { name: "Model" });
    fireEvent.click(modelButton);
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.queryByText("Gamma")).toBeNull();
  });

  it("marks active category button as pressed", () => {
    render(<FeatureList {...defaultProps} />);
    const allButton = screen.getByRole("button", { name: "All" });
    expect(allButton.getAttribute("aria-pressed")).toBe("true");
    const modelButton = screen.getByRole("button", { name: "Model" });
    fireEvent.click(modelButton);
    expect(modelButton.getAttribute("aria-pressed")).toBe("true");
    expect(allButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("resets to all features when All is clicked after filtering", () => {
    render(<FeatureList {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    expect(screen.queryByText("Alpha")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
  });
});
