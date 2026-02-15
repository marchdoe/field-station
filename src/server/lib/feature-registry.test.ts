import { describe, expect, it } from "vitest";
import { FEATURE_REGISTRY, getRegistryByKey } from "./feature-registry.js";

describe("FEATURE_REGISTRY", () => {
  it("contains features", () => {
    expect(FEATURE_REGISTRY.length).toBeGreaterThan(20);
  });

  it("every entry has required fields", () => {
    for (const f of FEATURE_REGISTRY) {
      expect(f.key).toBeTruthy();
      expect(f.type).toMatch(/^(env|setting)$/);
      expect(f.name).toBeTruthy();
      expect(f.description).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(f.valueType).toMatch(/^(boolean|string|number)$/);
    }
  });

  it("has no duplicate keys", () => {
    const keys = FEATURE_REGISTRY.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("getRegistryByKey", () => {
  it("returns a map keyed by feature key", () => {
    const map = getRegistryByKey();
    expect(map.get("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS")).toBeDefined();
    expect(map.get("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS")?.name).toBe("Agent Teams");
  });

  it("returns undefined for unknown keys", () => {
    const map = getRegistryByKey();
    expect(map.get("NONEXISTENT_KEY")).toBeUndefined();
  });
});
